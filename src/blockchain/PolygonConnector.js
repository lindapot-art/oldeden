/**
 * PolygonConnector — interface to the Polygon PoS network for Old Eden.
 *
 * Responsibilities:
 *   - Connect to Polygon via RPC (ethers.js provider)
 *   - Load and interact with the deployed OldEdenToken (ERC-20) and
 *     CharacterNFT (ERC-721) contracts
 *   - Provide helper methods for common blockchain operations:
 *       mint character NFT, transfer tokens, query balances, etc.
 *
 * This module is intentionally side-effect-free until connect() is called
 * so that it can be safely imported in test environments without network access.
 *
 * Requirements:
 *   npm install ethers
 */

import { ethers } from 'ethers';

// Minimal ABI fragments — only the functions Old Eden needs
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const CHARACTER_NFT_ABI = [
  'function mintCharacter(address to, string genomeHex, uint256 statusScore) returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenGenome(uint256 tokenId) view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'event CharacterMinted(address indexed to, uint256 indexed tokenId, string genomeHex)',
];

export class PolygonConnector {
  constructor() {
    this._provider = null;
    this._signer   = null;
    this._tokenContract    = null;
    this._nftContract      = null;
    this._connected = false;
  }

  // ── Connection ───────────────────────────────────────────────────────────────

  /**
   * Connect to Polygon and bind contract instances.
   *
   * @param {object} config
   * @param {string} config.rpcUrl           Polygon JSON-RPC endpoint
   * @param {string} config.privateKey       Deployer/relayer private key
   * @param {string} config.tokenAddress     Deployed OldEdenToken address
   * @param {string} config.nftAddress       Deployed CharacterNFT address
   */
  async connect({ rpcUrl, privateKey, tokenAddress, nftAddress }) {
    this._provider = new ethers.JsonRpcProvider(rpcUrl);
    this._signer   = new ethers.Wallet(privateKey, this._provider);

    this._tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this._signer);
    this._nftContract   = new ethers.Contract(nftAddress,   CHARACTER_NFT_ABI, this._signer);

    const network = await this._provider.getNetwork();
    this._connected = true;
    console.log(`[PolygonConnector] Connected to network: ${network.name} (chainId ${network.chainId})`);
  }

  /**
   * @returns {boolean}
   */
  get isConnected() {
    return this._connected;
  }

  // ── EDEN Token (ERC-20) ──────────────────────────────────────────────────────

  /**
   * Get the EDEN token balance for a wallet address.
   * @param {string} address
   * @returns {Promise<string>}  Formatted balance in EDEN
   */
  async getTokenBalance(address) {
    this._assertConnected();
    const raw = await this._tokenContract.balanceOf(address);
    return ethers.formatEther(raw);
  }

  /**
   * Transfer EDEN tokens from the signer wallet to a recipient.
   * @param {string} toAddress
   * @param {number|string} amount  Amount in EDEN (human-readable)
   * @returns {Promise<ethers.TransactionReceipt>}
   */
  async transferTokens(toAddress, amount) {
    this._assertConnected();
    const parsed = ethers.parseEther(String(amount));
    const tx = await this._tokenContract.transfer(toAddress, parsed);
    return tx.wait();
  }

  // ── Character NFT (ERC-721) ──────────────────────────────────────────────────

  /**
   * Mint a new Character NFT for a player wallet.
   * Called when a player creates their first character or when a notable NPC
   * genome is recorded on-chain.
   *
   * @param {string} toAddress        Player's Polygon wallet address
   * @param {string} genomeHex        Hex-encoded genome (from GeneticSystem.toHex)
   * @param {number} statusScore      Normalised status score (0–1000 integer)
   * @returns {Promise<{ tokenId: bigint, txHash: string }>}
   */
  async mintCharacterNFT(toAddress, genomeHex, statusScore) {
    this._assertConnected();
    const tx = await this._nftContract.mintCharacter(toAddress, genomeHex, statusScore);
    const receipt = await tx.wait();

    // Parse tokenId from the CharacterMinted event
    const event = receipt.logs
      .map((log) => { try { return this._nftContract.interface.parseLog(log); } catch { return null; } })
      .find((e) => e?.name === 'CharacterMinted');

    const tokenId = event?.args?.tokenId ?? null;
    return { tokenId, txHash: receipt.hash };
  }

  /**
   * Retrieve the genome hex string stored in a Character NFT.
   * @param {number|bigint} tokenId
   * @returns {Promise<string>}
   */
  async getCharacterGenome(tokenId) {
    this._assertConnected();
    return this._nftContract.tokenGenome(tokenId);
  }

  /**
   * Get the total number of minted Character NFTs.
   * @returns {Promise<bigint>}
   */
  async getTotalCharacters() {
    this._assertConnected();
    return this._nftContract.totalSupply();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _assertConnected() {
    if (!this._connected) {
      throw new Error('[PolygonConnector] Not connected — call connect() first.');
    }
  }
}
