# Old Eden — Blockchain Integration Guide

**Version:** 0.1

---

## Overview

Old Eden uses the **Polygon PoS** network for all on-chain activities:
- Character Genome NFTs (ERC-721)
- Ship and asset NFTs (ERC-721 / ERC-1155)
- EDEN governance token (ERC-20)
- In-game marketplace settlements

Polygon was chosen for:
- Near-zero gas fees (essential for frequent micro-transactions)
- Ethereum ecosystem compatibility
- Strong gaming community (Decentraland, The Sandbox, Axie are all Polygon-based)
- Native MATIC staking security

---

## Wallet Integration

Players connect their Polygon wallet (MetaMask, WalletConnect, Coinbase Wallet) via the game client:

```javascript
// Client-side wallet connection (ethers.js v6)
import { BrowserProvider } from 'ethers';

async function connectWallet() {
  const provider = new BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  
  // Ensure Polygon mainnet
  const network = await provider.getNetwork();
  if (network.chainId !== 137n) {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }],  // 137 in hex
    });
  }
  
  const signer = await provider.getSigner();
  return signer.address;
}
```

---

## EDEN Token (ERC-20)

### Contract: `OldEdenToken.sol`

The EDEN token serves as:
- Governance token (on-chain voting via Snapshot or Tally)
- Premium subscription payment (discounted vs. fiat)
- Staking for marketplace fee share
- Exchange currency for Stellar Marks (in-game premium currency)

### Token Distribution

| Allocation | % | Amount | Vesting |
|---|---|---|---|
| Player Rewards | 40% | 400M EDEN | 10-year linear via RewardsDistributor |
| Development | 20% | 200M EDEN | 1-year cliff + 3-year linear |
| Ecosystem Fund | 15% | 150M EDEN | Controlled by multisig |
| Public Sale | 15% | 150M EDEN | Unlocked at TGE |
| Team & Advisors | 10% | 100M EDEN | 6-month cliff + 2-year linear |

### Exchange Rate
EDEN ↔ Stellar Marks (SM) exchange is handled by an automated market maker (AMM):
- Initial rate: 1 EDEN = 10 SM
- Rate fluctuates based on supply/demand
- The RebirthSystem re-roll cost (paid in SM) creates consistent SM demand

---

## Character NFT (ERC-721)

### Contract: `CharacterNFT.sol`

Each Character NFT encodes:
- **genomeHex**: 512-character hex string (256 bytes of genetic data)
- **statusScore**: 0–1000 integer (wealth + skills + reputation snapshot)
- **generation**: How many ancestors this character has (0 = genesis)
- **parentTokenId**: NFT token ID of parent character (0 = no parent)
- **mintedAt**: Block timestamp of minting

### Minting Flow

```
Player creates character → Server generates genome → [optional] Player pays mint fee
         → Server calls mintCharacter() → NFT minted to player wallet
         → IPFS metadata uploaded → tokenURI set
```

Mint fee (recommended): 5 MATIC (~$5 at current prices)

### Metadata Standard (OpenSea compatible)

```json
{
  "name": "Old Eden Character #1234",
  "description": "A unique character genome from the Old Eden universe.",
  "image": "https://assets.oldeden.io/characters/1234.png",
  "animation_url": "https://assets.oldeden.io/characters/1234.glb",
  "external_url": "https://oldeden.io/characters/1234",
  "attributes": [
    { "trait_type": "Status Score", "value": 342 },
    { "trait_type": "Age", "value": 34 },
    { "trait_type": "Combat Skill", "value": 67, "max_value": 100 },
    { "trait_type": "Piloting Skill", "value": 45, "max_value": 100 },
    { "trait_type": "Generation", "value": 2 }
  ],
  "genome": "a3f8c2...e4b1"
}
```

---

## NFT-Locked Items

Items that a player explicitly mints as NFTs are "NFT-locked":
- They exist both in-game and on-chain simultaneously
- If the player's character dies, the item stays in their wallet
- They can be transferred/sold on the secondary market
- Re-equipping requires the in-game item registry to verify on-chain ownership

Locking fee: 2 MATIC per item + gas

---

## Marketplace

The Old Eden Marketplace (Phase 2) will be an on-chain exchange:

- Listings stored on Polygon (no centralised database)
- Instant settlement in MATIC or EDEN
- 2.5% platform fee:
  - 1% burned (deflationary)
  - 1.5% to treasury (DAO-controlled)
- Supports auctions and fixed-price listings

---

## Play-to-Earn

Players can earn EDEN tokens through:
- First-discovery bonuses (new star systems)
- Competitive PvP tournament prizes
- Rare loot drops (converted to EDEN at server controlled rate)
- NPC farming contributions (seeding high-quality NPCs)
- Community governance participation

**Anti-inflation safeguards:**
- Total EDEN supply is hard-capped at 1,000,000,000
- Reward emission rate decreases over time (halving schedule)
- Buy-and-burn from marketplace fees

---

## Fiat On-Ramp

Players without crypto can purchase Stellar Marks directly with fiat:

- Stripe integration for credit/debit cards
- PayPal integration
- Price: $9.99 = 1,000 SM
- Fiat purchases bypass the EDEN token (SM is created server-side)
- Players can convert SM to EDEN later if they set up a wallet

---

## Regulatory Considerations

NFT gaming operates in an evolving regulatory environment:

- **EU MiCA Regulation**: EDEN token likely classified as utility token; legal review required
- **US SEC**: Avoid framing EDEN as an investment security; utility framing is key
- **Age verification**: Required for real-money transactions in most jurisdictions
- **Loot box laws**: The Rebirth re-roll mechanic must be analysed per-jurisdiction (Belgium, Netherlands have restrictions)
- **Tax reporting**: Players who earn >$600/year in EDEN may have US tax reporting obligations

*Always consult legal counsel before launch in any jurisdiction.*
