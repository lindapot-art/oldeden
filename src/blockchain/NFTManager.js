/**
 * NFTManager — high-level interface for Old Eden's NFT asset lifecycle.
 *
 * NFT Asset Types in Old Eden:
 *
 *   1. Character Genome NFT (ERC-721)
 *      - Represents a character's immutable genetic blueprint
 *      - Minted on character creation; carries over through rebirth
 *      - Metadata: genomeHex, statusScore, generation, lineage
 *
 *   2. Spaceship NFT (ERC-721)
 *      - Unique ship with procedurally-generated stats and appearance
 *      - Transferable on the open marketplace
 *
 *   3. Land Parcel NFT (ERC-721)
 *      - Sector/planet surface tile ownership
 *
 *   4. Equipment NFT (ERC-1155)
 *      - Stackable rare equipment items
 *
 * This module wraps PolygonConnector with game-specific business logic:
 * it validates inputs, enriches metadata, and emits in-game events.
 */

export class NFTManager {
  /**
   * @param {import('./PolygonConnector.js').PolygonConnector} connector
   * @param {import('../core/EventEmitter.js').EventEmitter}   events
   */
  constructor(connector, events) {
    this._connector = connector;
    this._events    = events;
  }

  // ── Character NFTs ────────────────────────────────────────────────────────────

  /**
   * Mint a Character Genome NFT for a new player character.
   *
   * @param {object} params
   * @param {string}    params.walletAddress  Player's Polygon wallet
   * @param {Uint8Array} params.genome        Raw genome bytes
   * @param {number}    params.statusScore    0–1000 integer status score
   * @param {string}    [params.playerId]     For event emission
   * @returns {Promise<NFTMintResult>}
   */
  async mintCharacter({ walletAddress, genome, statusScore, playerId }) {
    if (!walletAddress || !genome) {
      throw new Error('[NFTManager] walletAddress and genome are required.');
    }

    // Convert genome to hex via Buffer
    const genomeHex = Buffer.from(genome).toString('hex');
    const scoreInt  = Math.round(Math.max(0, Math.min(1000, statusScore)));

    const result = await this._connector.mintCharacterNFT(walletAddress, genomeHex, scoreInt);

    this._events?.emit('nft:character_minted', {
      playerId,
      walletAddress,
      tokenId: result.tokenId?.toString(),
      txHash: result.txHash,
    });

    return {
      type: 'character',
      tokenId: result.tokenId?.toString(),
      txHash: result.txHash,
      walletAddress,
      genomeHex,
      statusScore: scoreInt,
    };
  }

  /**
   * Fetch the genome of a character NFT from the chain.
   * Used during rebirth to verify NFT-backed character traits.
   *
   * @param {string|number|bigint} tokenId
   * @returns {Promise<Uint8Array>}  Decoded genome bytes
   */
  async fetchCharacterGenome(tokenId) {
    const hex = await this._connector.getCharacterGenome(tokenId);
    return new Uint8Array(Buffer.from(hex, 'hex'));
  }

  // ── Marketplace helpers ───────────────────────────────────────────────────────

  /**
   * Build the metadata JSON for a Character NFT (to be stored on IPFS).
   * Follows the OpenSea metadata standard.
   *
   * @param {object} params
   * @param {string} params.tokenId
   * @param {string} params.genomeHex
   * @param {number} params.statusScore
   * @param {object} params.skills
   * @param {number} params.ageYears
   * @returns {object}  JSON-serialisable metadata
   */
  buildCharacterMetadata({ tokenId, genomeHex, statusScore, skills, ageYears }) {
    const attributes = [
      { trait_type: 'Status Score', value: statusScore },
      { trait_type: 'Age',          value: Math.round(ageYears) },
      ...Object.entries(skills ?? {}).map(([k, v]) => ({
        trait_type: k.charAt(0).toUpperCase() + k.slice(1).toLowerCase(),
        value: v,
        max_value: 100,
      })),
    ];

    return {
      name: `Old Eden Character #${tokenId}`,
      description: 'A unique character genome from the Old Eden universe. This NFT encodes the genetic blueprint that defines appearance, skills, and lifespan.',
      image: `https://assets.oldeden.io/characters/${tokenId}.png`,
      animation_url: `https://assets.oldeden.io/characters/${tokenId}.glb`,
      external_url: `https://oldeden.io/characters/${tokenId}`,
      attributes,
      genome: genomeHex,
    };
  }
}

/**
 * @typedef {object} NFTMintResult
 * @property {string} type
 * @property {string} tokenId
 * @property {string} txHash
 * @property {string} walletAddress
 * @property {string} genomeHex
 * @property {number} statusScore
 */
