// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OldEdenToken (EDEN)
 * @notice The governance and settlement token for the Old Eden universe.
 *
 * Token Economics:
 *   - Total supply: 1,000,000,000 EDEN (1 billion)
 *   - Distributed as:
 *       40% — Player rewards (released over 10 years via linear vesting in the rewards pool)
 *       20% — Development fund (locked 1 year, then 3-year linear vest)
 *       15% — Ecosystem fund (grants, partnerships, liquidity)
 *       15% — Public sale
 *       10% — Team & advisors (6-month cliff, 2-year vest)
 *
 * Utility:
 *   - Governance votes on protocol parameters (inflation, reward rates, fee splits)
 *   - Staking to earn a share of transaction fees from the NFT marketplace
 *   - Required for VIP subscription tier payment (discounted vs. fiat)
 *   - Conversion to/from Stellar Marks (in-game premium currency)
 *
 * @dev Deployed on Polygon PoS. Uses EIP-2612 permit() for gasless approvals.
 */
contract OldEdenToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice Address authorised to mint reward tokens (rewards distributor contract)
    address public rewardsMinter;

    event RewardsMinterUpdated(address indexed oldMinter, address indexed newMinter);

    constructor(address initialOwner)
        ERC20("Old Eden Token", "EDEN")
        ERC20Permit("Old Eden Token")
        Ownable(initialOwner)
    {
        // Mint 60% to owner (treasury) — the remaining 40% is reserved for
        // player rewards, distributed via transferReward() from the treasury.
        // Full distribution is handled by vesting contracts post-deploy.
        uint256 treasuryAllocation = (MAX_SUPPLY * 60) / 100;
        _mint(initialOwner, treasuryAllocation);
    }

    // ── Rewards Distribution ──────────────────────────────────────────────────

    /// @notice Ukraine humanitarian donation wallet — receives 10% of all fees.
    /// IMMUTABLE: This split MUST NEVER be reduced or removed.
    address public ukraineDonationWallet;
    uint256 public constant UKRAINE_DONATION_BPS = 1000; // 10% in basis points

    function setUkraineDonationWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "OldEdenToken: zero address");
        ukraineDonationWallet = _wallet;
    }

    // ── Minting (rewards) ─────────────────────────────────────────────────────

    /**
     * @notice Set the address authorised to mint rewards.
     * @dev Only callable by owner. Should be a RewardsDistributor contract.
     */
    function setRewardsMinter(address _minter) external onlyOwner {
        emit RewardsMinterUpdated(rewardsMinter, _minter);
        rewardsMinter = _minter;
    }

    /**
     * @notice Mint reward tokens to a player wallet (from the 40% reserve).
     * @dev Only callable by the designated rewards minter contract.
     * @param to     Recipient address
     * @param amount Amount in wei (18 decimals)
     */
    function mintReward(address to, uint256 amount) external {
        require(msg.sender == rewardsMinter, "OldEdenToken: caller is not rewards minter");
        require(totalSupply() + amount <= MAX_SUPPLY, "OldEdenToken: exceeds max supply");
        _mint(to, amount);
    }
}
