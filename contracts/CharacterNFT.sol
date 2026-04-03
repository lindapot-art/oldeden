// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CharacterNFT
 * @notice ERC-721 NFT representing a unique character genome in Old Eden.
 *
 * Each token encodes:
 *   - genomeHex: the 256-byte genetic blueprint as a hex string
 *   - statusScore: integer score (0–1000) representing the character's
 *     accumulated wealth, skills, and reputation at the time of minting
 *   - generation: increments each time a character's genome is derived from
 *     an existing one (child of a child has generation 2, etc.)
 *   - parentTokenId: 0 if genesis character, otherwise the parent's tokenId
 *
 * Minting:
 *   - Only the authorised game server address (minter role) can mint.
 *   - Players receive their NFT when creating a new character or when a
 *     high-value NPC is promoted to a player-owned asset.
 *
 * Rebirth:
 *   - When a player rebirths into an NPC, the NPC's genome can be minted
 *     as a new Character NFT, creating an on-chain record of the lineage.
 *
 * Metadata:
 *   - tokenURI points to IPFS JSON following the OpenSea metadata standard.
 *   - The JSON includes the full genome hex, visual traits, and skill snapshot.
 */
contract CharacterNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    /// @notice Address authorised to mint (game server / relayer)
    address public minter;

    struct CharacterData {
        string  genomeHex;
        uint16  statusScore;    // 0–1000
        uint16  generation;     // 0 = genesis
        uint256 parentTokenId;  // 0 = no parent
        uint256 mintedAt;       // block.timestamp
    }

    mapping(uint256 => CharacterData) private _characterData;

    event CharacterMinted(
        address indexed to,
        uint256 indexed tokenId,
        string  genomeHex,
        uint16  statusScore,
        uint16  generation
    );

    event MinterUpdated(address indexed oldMinter, address indexed newMinter);

    constructor(address initialOwner)
        ERC721("Old Eden Character", "OECHAR")
        Ownable(initialOwner)
    {}

    // ── Access control ────────────────────────────────────────────────────────

    modifier onlyMinter() {
        require(msg.sender == minter, "CharacterNFT: caller is not minter");
        _;
    }

    function setMinter(address _minter) external onlyOwner {
        emit MinterUpdated(minter, _minter);
        minter = _minter;
    }

    // ── Minting ───────────────────────────────────────────────────────────────

    /**
     * @notice Mint a new Character NFT.
     * @param to           Recipient wallet address
     * @param genomeHex    Hex-encoded 256-byte genome string
     * @param statusScore  Character status score (0–1000)
     * @param generation   Generation number (0 for genesis characters)
     * @param parentTokenId  Parent token ID (0 for genesis)
     * @param uri          IPFS metadata URI
     * @return tokenId     The newly minted token ID
     */
    function mintCharacter(
        address to,
        string  calldata genomeHex,
        uint16  statusScore,
        uint16  generation,
        uint256 parentTokenId,
        string  calldata uri
    ) external onlyMinter returns (uint256) {
        require(bytes(genomeHex).length == 512, "CharacterNFT: genome must be 512 hex chars (256 bytes)");
        require(statusScore <= 1000, "CharacterNFT: statusScore exceeds 1000");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        _characterData[tokenId] = CharacterData({
            genomeHex:    genomeHex,
            statusScore:  statusScore,
            generation:   generation,
            parentTokenId: parentTokenId,
            mintedAt:     block.timestamp
        });

        emit CharacterMinted(to, tokenId, genomeHex, statusScore, generation);
        return tokenId;
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /**
     * @notice Get the genome hex string for a token.
     */
    function tokenGenome(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "CharacterNFT: query for nonexistent token");
        return _characterData[tokenId].genomeHex;
    }

    /**
     * @notice Get all character data for a token.
     */
    function getCharacterData(uint256 tokenId) external view returns (CharacterData memory) {
        require(_exists(tokenId), "CharacterNFT: query for nonexistent token");
        return _characterData[tokenId];
    }

    /**
     * @notice Total number of characters ever minted.
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // ── Overrides ─────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
