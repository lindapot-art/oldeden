const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CharacterNFT", function () {
  let nft;
  let owner, minter, player, other;

  // Valid 512-char hex genome (256 bytes)
  const VALID_GENOME = "aa".repeat(256);
  const VALID_URI = "ipfs://QmTestHash123";

  beforeEach(async function () {
    [owner, minter, player, other] = await ethers.getSigners();
    const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
    nft = await CharacterNFT.deploy(owner.address);
    await nft.waitForDeployment();
    // Authorise minter
    await nft.connect(owner).setMinter(minter.address);
  });

  // ── Deployment ────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set name and symbol", async function () {
      expect(await nft.name()).to.equal("Old Eden Character");
      expect(await nft.symbol()).to.equal("OECHAR");
    });

    it("should set owner correctly", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("should start with zero total supply", async function () {
      expect(await nft.totalSupply()).to.equal(0);
    });

    it("should set default royalty to 250 bps (2.5%)", async function () {
      expect(await nft.DEFAULT_ROYALTY_BPS()).to.equal(250);
    });
  });

  // ── Minter management ────────────────────────────────────────────────────

  describe("Minter management", function () {
    it("should allow owner to set minter", async function () {
      await expect(nft.connect(owner).setMinter(other.address))
        .to.emit(nft, "MinterUpdated")
        .withArgs(minter.address, other.address);
      expect(await nft.minter()).to.equal(other.address);
    });

    it("should reject non-owner setting minter", async function () {
      await expect(
        nft.connect(other).setMinter(other.address)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ── Minting ───────────────────────────────────────────────────────────────

  describe("Minting", function () {
    it("should mint a character NFT with valid genome", async function () {
      const tx = await nft
        .connect(minter)
        .mintCharacter(player.address, VALID_GENOME, 500, 0, 0, VALID_URI);

      await expect(tx)
        .to.emit(nft, "CharacterMinted")
        .withArgs(player.address, 1, VALID_GENOME, 500, 0);

      expect(await nft.ownerOf(1)).to.equal(player.address);
      expect(await nft.tokenURI(1)).to.equal(VALID_URI);
      expect(await nft.totalSupply()).to.equal(1);
    });

    it("should store character data correctly", async function () {
      await nft
        .connect(minter)
        .mintCharacter(player.address, VALID_GENOME, 750, 2, 0, VALID_URI);

      const data = await nft.getCharacterData(1);
      expect(data.genomeHex).to.equal(VALID_GENOME);
      expect(data.statusScore).to.equal(750);
      expect(data.generation).to.equal(2);
      expect(data.parentTokenId).to.equal(0);
      expect(data.isFractured).to.equal(false);
      expect(data.isAscended).to.equal(false);
    });

    it("should return genome via tokenGenome()", async function () {
      await nft
        .connect(minter)
        .mintCharacter(player.address, VALID_GENOME, 100, 0, 0, VALID_URI);

      expect(await nft.tokenGenome(1)).to.equal(VALID_GENOME);
    });

    it("should increment token IDs", async function () {
      await nft
        .connect(minter)
        .mintCharacter(player.address, VALID_GENOME, 100, 0, 0, VALID_URI);
      await nft
        .connect(minter)
        .mintCharacter(other.address, VALID_GENOME, 200, 1, 1, VALID_URI);

      expect(await nft.totalSupply()).to.equal(2);
      expect(await nft.ownerOf(1)).to.equal(player.address);
      expect(await nft.ownerOf(2)).to.equal(other.address);
    });

    it("should reject mint from non-minter", async function () {
      await expect(
        nft.connect(other).mintCharacter(player.address, VALID_GENOME, 100, 0, 0, VALID_URI)
      ).to.be.revertedWith("CharacterNFT: caller is not minter");
    });

    it("should reject invalid genome length (too short)", async function () {
      const shortGenome = "aa".repeat(100);
      await expect(
        nft.connect(minter).mintCharacter(player.address, shortGenome, 100, 0, 0, VALID_URI)
      ).to.be.revertedWith("CharacterNFT: genome must be 512 hex chars (256 bytes)");
    });

    it("should reject statusScore > 1000", async function () {
      await expect(
        nft.connect(minter).mintCharacter(player.address, VALID_GENOME, 1001, 0, 0, VALID_URI)
      ).to.be.revertedWith("CharacterNFT: statusScore exceeds 1000");
    });

    it("should reject mint to zero address", async function () {
      await expect(
        nft.connect(minter).mintCharacter(ethers.ZeroAddress, VALID_GENOME, 100, 0, 0, VALID_URI)
      ).to.be.revertedWithCustomError(nft, "ERC721InvalidReceiver");
    });
  });

  // ── Soul Fracture ─────────────────────────────────────────────────────────

  describe("Soul Fracture", function () {
    beforeEach(async function () {
      await nft
        .connect(minter)
        .mintCharacter(player.address, VALID_GENOME, 500, 0, 0, VALID_URI);
    });

    it("should fracture a character", async function () {
      const tx = await nft.connect(minter).fractureCharacter(1, 5);
      await expect(tx).to.emit(nft, "CharacterFractured");

      const data = await nft.getCharacterData(1);
      expect(data.isFractured).to.equal(true);
      expect(data.shardCount).to.equal(5);
    });

    it("should reject double fracture", async function () {
      await nft.connect(minter).fractureCharacter(1, 5);
      await expect(
        nft.connect(minter).fractureCharacter(1, 3)
      ).to.be.revertedWith("CharacterNFT: already fractured");
    });

    it("should reject fracture from non-minter", async function () {
      await expect(
        nft.connect(other).fractureCharacter(1, 5)
      ).to.be.revertedWith("CharacterNFT: caller is not minter");
    });

    it("should reject fracture of nonexistent token", async function () {
      await expect(
        nft.connect(minter).fractureCharacter(999, 5)
      ).to.be.revertedWith("CharacterNFT: fracture of nonexistent token");
    });
  });

  // ── Ascension ─────────────────────────────────────────────────────────────

  describe("Ascension", function () {
    beforeEach(async function () {
      await nft
        .connect(minter)
        .mintCharacter(player.address, VALID_GENOME, 1000, 0, 0, VALID_URI);
    });

    it("should ascend a character", async function () {
      const tx = await nft.connect(minter).ascendCharacter(1);
      await expect(tx).to.emit(nft, "CharacterAscended");

      const data = await nft.getCharacterData(1);
      expect(data.isAscended).to.equal(true);
    });

    it("should reject double ascension", async function () {
      await nft.connect(minter).ascendCharacter(1);
      await expect(
        nft.connect(minter).ascendCharacter(1)
      ).to.be.revertedWith("CharacterNFT: already ascended");
    });

    it("should not allow ascension of a fractured character", async function () {
      await nft.connect(minter).fractureCharacter(1, 3);
      await expect(
        nft.connect(minter).ascendCharacter(1)
      ).to.be.revertedWith("CharacterNFT: cannot ascend fractured character");
    });

    it("should reject ascension of nonexistent token", async function () {
      await expect(
        nft.connect(minter).ascendCharacter(999)
      ).to.be.revertedWith("CharacterNFT: ascension of nonexistent token");
    });
  });

  // ── Royalties (ERC-2981) ──────────────────────────────────────────────────

  describe("Royalties", function () {
    it("should return 2.5% royalty info", async function () {
      await nft
        .connect(minter)
        .mintCharacter(player.address, VALID_GENOME, 100, 0, 0, VALID_URI);

      const salePrice = ethers.parseEther("100");
      const [receiver, amount] = await nft.royaltyInfo(1, salePrice);

      expect(receiver).to.equal(owner.address);
      // 2.5% of 100 = 2.5
      expect(amount).to.equal(ethers.parseEther("2.5"));
    });
  });

  // ── View queries on nonexistent tokens ────────────────────────────────────

  describe("View guards", function () {
    it("should revert tokenGenome for nonexistent token", async function () {
      await expect(nft.tokenGenome(999)).to.be.revertedWith(
        "CharacterNFT: query for nonexistent token"
      );
    });

    it("should revert getCharacterData for nonexistent token", async function () {
      await expect(nft.getCharacterData(999)).to.be.revertedWith(
        "CharacterNFT: query for nonexistent token"
      );
    });
  });

  // ── ERC-165 (supportsInterface) ───────────────────────────────────────────

  describe("ERC-165", function () {
    it("should support ERC-721 interface", async function () {
      // ERC-721 interfaceId = 0x80ac58cd
      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("should support ERC-2981 (royalty) interface", async function () {
      // ERC-2981 interfaceId = 0x2a55205a
      expect(await nft.supportsInterface("0x2a55205a")).to.equal(true);
    });
  });
});
