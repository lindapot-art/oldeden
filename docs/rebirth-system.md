# Old Eden — Rebirth System Specification

**Version:** 0.1  
**Status:** Design — Pre-implementation

---

## Overview

The Rebirth System is the central differentiating mechanic of Old Eden. Unlike conventional MMOs where death is a minor inconvenience (respawn at checkpoint), death in Old Eden is a meaningful life event that permanently ends one character's story and begins another's.

This creates genuine stakes, a dynamic economy of character "value", and a universe that feels lived-in and mortal.

---

## The Death Event

A character can die from:

| Cause | Mechanic |
|---|---|
| Combat | HP reaches zero in PvE or PvP |
| Old Age | Age exceeds genome-determined lifespan |
| Disease | Untreated illness progresses to terminal stage |
| Radiation Poisoning | Cumulative radiation dose exceeds resistance threshold |
| Vacuum Exposure | Unprotected in open space |
| Starvation | Basic needs unmet for extended period |
| Execution | Sentenced by faction judicial system |

When death occurs:
1. The server emits a `player:death` event
2. All active sessions for this player are frozen
3. The character's inventory is flagged for distribution (loot/inheritance)
4. The RebirthSystem begins the lottery process

---

## The NPC Pool

The Rebirth Lottery draws from the **living NPC pool**: all active NPCs that are:
- Not currently a player avatar
- Living (not deceased)
- Above a minimum age threshold (default: 18 in-game years)

The NPC pool is continuously maintained by the NPCSystem:
- New NPCs are born from NPC relationships (child NPCs inherit parent genomes)
- Old NPCs die of natural causes, freeing their slot
- Deceased player avatars are immediately added to the pool

At launch target: **100,000 tracked NPCs** galaxy-wide.

---

## Status Score Calculation

Each NPC has a **status score** (0.0–1.0) computed by the RebirthSystem:

```
statusScore = wealthScore × 0.35 
            + skillScore  × 0.35 
            + ageScore    × 0.15 
            + repScore    × 0.15
```

Where:
- `wealthScore` = min(credits / 1,000,000, 1.0)
- `skillScore` = average of all aptitude gene expressions (0–1)
- `ageScore` = min(ageYears / 80, 1.0)
- `repScore` = min(reputation / 1000, 1.0)

---

## Lottery Weighting

The lottery uses **inverse exponential weighting** to make high-status NPCs rare prizes:

```
weight(npc) = e^(-6 × statusScore)
```

| Status Score | Approx. Weight | Relative Frequency |
|---|---|---|
| 0.0 (destitute) | 1.000 | ~1000× baseline |
| 0.2 (poor) | 0.301 | ~300× |
| 0.5 (middle) | 0.050 | ~50× |
| 0.7 (wealthy) | 0.014 | ~14× |
| 0.9 (elite) | 0.004 | ~4× |
| 1.0 (legendary) | 0.002 | ~2× |

This means a newly minted player is *far* more likely to be reborn as a struggling scavenger than as a wealthy trader captain — which matches real-world probability distributions and creates aspirational gameplay.

---

## Re-Roll Mechanic

Players may spend **Stellar Marks** to re-roll their lottery draw up to 3 times per death:

| Re-Roll | Cost (SM) | Odds Shift |
|---|---|---|
| 1st | 50 SM | None — pure random |
| 2nd | 150 SM | None — pure random |
| 3rd | 500 SM | None — pure random |

**Important:** Re-rolls are never targeted — you cannot select a specific NPC. The lottery is always random. Re-rolls simply give you another chance at a better draw.

---

## What Carries Over

### Carries Over (Persistent Meta)
- **EDEN Tokens** in your blockchain wallet (they are yours, not your character's)
- **Character NFTs** you own (the genomes remain in your wallet)
- **NFT-locked items** (items you explicitly minted as NFTs before death)
- **Faction standing modifiers** (a small % of your old reputation influences your standing with factions in future lives)
- **Player skill bonuses** (meta-progression: each death teaches you, giving a small player-side efficiency bonus)

### Does NOT Carry Over
- In-game Eden Credits (belonged to the character)
- Non-NFT items and ships (belonged to the character)
- Character skills and relationships (belonged to the character)
- Social standing specific to the old identity

---

## The Deceased Avatar as NPC

After a player dies, their old character does not disappear. It becomes a **permanent autonomous NPC**:

- Retains the personality, skills, and wealth it had at death
- The NPCSystem runs AI behaviour based on established patterns
- Other players can encounter, trade with, or fight this NPC
- The NPC's history is publicly viewable ("This was once {PlayerName}")
- Over time, the NPC may marry, have children, build a business, or die of old age

This means the world fills with living history. Famous players' old characters become legends — pursued, admired, or hunted by others.

---

## NPC Genome NFT on Rebirth

When a player is reborn into an NPC, they may optionally **mint the NPC's genome as an NFT** at a one-time fee:

- Records the genetic blueprint on-chain permanently
- The NFT carries the full lineage (parentTokenId chain)
- Provides provenance for the character's genetic history
- Can be traded if the player later dies and wants to sell access to the genome record

---

## Player Experience Flow

```
Player Character Dies
        │
        ▼
Inventory distribution (loot drops, inheritance to designated heirs)
        │
        ▼
Old avatar → NPC (promoted to autonomous NPC pool)
        │
        ▼
Player presented with Rebirth Screen:
  - Summary of life lived (age, wealth, kills, discoveries)
  - Lottery card drawn from NPC pool (animated reveal)
  - Optional: Pay SM to re-roll (up to 3 times)
        │
        ▼
Player accepts new character
        │
        ▼
Character creation overlay (customise name, minor cosmetics)
        │
        ▼
Spawn at new character's last known location
        │
        ▼
Optional: View old character's current NPC status
```

---

## Economic Implications

The Rebirth System creates several interesting economic dynamics:

1. **NPC quality pressure**: Players benefit from maintaining a rich NPC ecosystem because they may be reborn into it. This incentivises players to invest in server-wide prosperity.

2. **Character insurance**: High-value players (wealthy traders, elite fighters) may purchase "Genome Insurance" — a service that backups their genome to an NFT, ensuring their genetic traits survive even if the character dies before they manually mint.

3. **NPC farming**: Some players may deliberately create and develop NPCs to "seed" the pool with high-quality characters for future rebirths. This is a legitimate, valued activity.

4. **Assassination economy**: Killing a high-status player opens their NPC slot for rebirth by *other* players. This creates a dark incentive layer — powerful enemies may be worth killing not just for loot but to "destroy" their character permanently.
