const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OldEdenToken", function () {
  let token;
  let owner, rewardsMinter, player, other, ukraineWallet;

  const MAX_SUPPLY = ethers.parseEther("1000000000"); // 1 billion
  const TREASURY_ALLOCATION = (MAX_SUPPLY * 60n) / 100n; // 60%

  beforeEach(async function () {
    [owner, rewardsMinter, player, other, ukraineWallet] = await ethers.getSigners();
    const OldEdenToken = await ethers.getContractFactory("OldEdenToken");
    token = await OldEdenToken.deploy(owner.address);
    await token.waitForDeployment();
  });

  // ── Deployment ────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set name and symbol", async function () {
      expect(await token.name()).to.equal("Old Eden Token");
      expect(await token.symbol()).to.equal("EDEN");
    });

    it("should set owner correctly", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("should mint 60% of MAX_SUPPLY to owner", async function () {
      const balance = await token.balanceOf(owner.address);
      expect(balance).to.equal(TREASURY_ALLOCATION);
    });

    it("should have correct MAX_SUPPLY constant", async function () {
      expect(await token.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("should have 18 decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });
  });

  // ── Transfers ─────────────────────────────────────────────────────────────

  describe("Transfers", function () {
    it("should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("1000");
      await token.connect(owner).transfer(player.address, amount);

      expect(await token.balanceOf(player.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(TREASURY_ALLOCATION - amount);
    });

    it("should fail transfer with insufficient balance", async function () {
      const amount = ethers.parseEther("1");
      await expect(
        token.connect(player).transfer(owner.address, amount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("should reject transfer to zero address", async function () {
      const amount = ethers.parseEther("1");
      await expect(
        token.connect(owner).transfer(ethers.ZeroAddress, amount)
      ).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
    });
  });

  // ── Burning ───────────────────────────────────────────────────────────────

  describe("Burning", function () {
    it("should allow holder to burn their tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      await token.connect(owner).burn(burnAmount);
      expect(await token.balanceOf(owner.address)).to.equal(
        TREASURY_ALLOCATION - burnAmount
      );
    });

    it("should reduce total supply on burn", async function () {
      const burnAmount = ethers.parseEther("100");
      const supplyBefore = await token.totalSupply();
      await token.connect(owner).burn(burnAmount);
      expect(await token.totalSupply()).to.equal(supplyBefore - burnAmount);
    });
  });

  // ── Rewards Minter ────────────────────────────────────────────────────────

  describe("Rewards Minter", function () {
    beforeEach(async function () {
      await token.connect(owner).setRewardsMinter(rewardsMinter.address);
    });

    it("should allow owner to set rewards minter", async function () {
      expect(await token.rewardsMinter()).to.equal(rewardsMinter.address);
    });

    it("should emit RewardsMinterUpdated event", async function () {
      await expect(token.connect(owner).setRewardsMinter(other.address))
        .to.emit(token, "RewardsMinterUpdated")
        .withArgs(rewardsMinter.address, other.address);
    });

    it("should reject non-owner setting rewards minter", async function () {
      await expect(
        token.connect(other).setRewardsMinter(other.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should mint rewards via authorised minter", async function () {
      const rewardAmount = ethers.parseEther("5000");
      await token.connect(rewardsMinter).mintReward(player.address, rewardAmount);

      expect(await token.balanceOf(player.address)).to.equal(rewardAmount);
    });

    it("should reject mintReward from non-minter", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        token.connect(other).mintReward(player.address, amount)
      ).to.be.revertedWith("OldEdenToken: caller is not rewards minter");
    });

    it("should reject mintReward that exceeds MAX_SUPPLY", async function () {
      // Remaining supply = MAX_SUPPLY - TREASURY_ALLOCATION = 40%
      const remaining = MAX_SUPPLY - TREASURY_ALLOCATION;
      const tooMuch = remaining + 1n;

      await expect(
        token.connect(rewardsMinter).mintReward(player.address, tooMuch)
      ).to.be.revertedWith("OldEdenToken: exceeds max supply");
    });

    it("should allow minting up to exactly MAX_SUPPLY", async function () {
      const remaining = MAX_SUPPLY - TREASURY_ALLOCATION;
      await token.connect(rewardsMinter).mintReward(player.address, remaining);

      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
    });
  });

  // ── Ukraine Donation Wallet ───────────────────────────────────────────────

  describe("Ukraine Donation Wallet", function () {
    it("should have 10% donation BPS constant (1000)", async function () {
      expect(await token.UKRAINE_DONATION_BPS()).to.equal(1000);
    });

    it("should allow owner to set Ukraine donation wallet", async function () {
      await token.connect(owner).setUkraineDonationWallet(ukraineWallet.address);
      expect(await token.ukraineDonationWallet()).to.equal(ukraineWallet.address);
    });

    it("should reject setting zero address for Ukraine wallet", async function () {
      await expect(
        token.connect(owner).setUkraineDonationWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("OldEdenToken: zero address");
    });

    it("should reject non-owner setting Ukraine wallet", async function () {
      await expect(
        token.connect(other).setUkraineDonationWallet(ukraineWallet.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  // ── Permit (EIP-2612) ─────────────────────────────────────────────────────

  describe("Permit", function () {
    it("should support EIP-2612 permit", async function () {
      // Verify DOMAIN_SEPARATOR exists (EIP-2612 support)
      const domain = await token.eip712Domain();
      expect(domain.name).to.equal("Old Eden Token");
    });
  });
});
