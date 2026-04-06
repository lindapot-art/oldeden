# Old Eden — Game Design Document (GDD)

**Version:** 0.1 — Concept Phase  
**Last Updated:** April 2026

---

## 1. High Concept

Old Eden is a persistent, multiplayer space game set thousands of years in the future where civilisation has colonised hundreds of star systems. Players experience a living, breathing universe where they can explore, fight, trade, build, and most importantly — *live a life*. When that life ends, they are reborn into a new one, drawn from the living NPC population by a weighted lottery.

The universe never repeats. No two play sessions are alike. AI systems generate dynamic content, evolving factions, and procedural narrative in real time.

---

## 2. Core Gameplay Loops

### 2.1 Micro Loop (Session — minutes)
- Log in as your current character
- Accept a quest hook from the AI Director
- Engage in tactical FPS combat, piloting, or social gameplay
- Earn Eden Credits and experience

### 2.2 Mid Loop (Week)
- Advance skills and relationships
- Build or purchase assets (ships, property, equipment)
- Participate in faction politics and trade routes
- Operate remote drones/robots as a secondary income stream

### 2.3 Macro Loop (Months/Years)
- Your character ages and eventually dies
- Rebirth lottery assigns a new identity from the NPC pool
- Long-term meta-progression (faction rep, NFT assets, EDEN tokens) persists
- Contribute to the generational history of the universe

---

## 3. Core Mechanics

### 3.1 Character System
- Characters are defined by a **256-gene genome** (see GeneticSystem.js)
- Gene expression determines base stats, aptitudes, personality, appearance, and lifespan
- Characters gain skills through experience (capped by genome aptitude)
- Characters age at a configured rate relative to real-world time

### 3.2 Combat
#### Ground Combat (Counter-Strike / Escape from Tarkov inspired)
- First-person tactical shooter mechanics
- Permadeath consequences: heavy equipment loss on death
- Armour, weapons, and augmentations affect performance
- Cover system, breach mechanics, environmental hazards

#### Space Combat (EVE Online inspired)
- Third-person ship combat with Newtonian physics
- Module-based ship fitting (shields, weapons, propulsion, ECM)
- Fleet warfare with command bonuses
- Wormhole ambushes and deep-space encounters

### 3.3 Remote Operations
Inspired by real-world drone and field robot operators:
- Players can operate drones and service robots remotely from safety
- Drones have limited range (signal propagation), battery life, and physical capabilities
- Robots can perform mining, rescue, reconnaissance, or combat roles
- High-value remote operation missions are auctioned in the marketplace

### 3.4 Life Simulation (Second Life / The Sims)
- Housing system: rent or own apartments, stations, planetary estates
- Relationships: NPC and player social graphs with trust, love, rivalry
- Jobs and businesses: from delivery driver to megacorp executive
- Social events, markets, performances, and community-built spaces

### 3.5 Grand Strategy (StarCraft / Civilization)
- Players can rise to command fleets, run corporations, or rule sectors
- Tech tree research (shared per faction — players contribute research points)
- Resource chain: mining → refining → manufacturing → distribution
- Territory control via military, economic, and cultural dominance

### 3.6 Exploration (Elite Dangerous / Mass Effect)
- Hundreds of procedurally generated star systems
- First-discovery bonuses (resources, naming rights, NFT claim)
- Ancient ruins with lore, puzzles, and rare artefacts
- Wormholes to deep-space anomalies with unique physics

---

## 4. The Rebirth System

See [rebirth-system.md](rebirth-system.md) for the full specification.

**Short version:**
1. Your avatar dies (combat, age, disease, accident)
2. You choose one of three paths:
   - **Standard Rebirth**: Enter the Rebirth Lottery — weighted random draw from NPC pool. Your old avatar becomes a permanent NPC.
   - **Soul Fracture**: Your character shatters into Soul Shards that scatter across the galaxy. A server-wide Fracture Event announces the shard hunt. Any player can absorb shards for permanent bonuses. Your NFT is marked "Fractured" (rare collectible).
   - **Ascension** (requires 3+ rebirths): Attempt a solo procedural gauntlet. Success = become an Ascended entity with passive powers over a star system. Fail = standard rebirth.
3. NFT-locked items and meta-reputation carry over; in-game possessions do not

---

## 5. Genetic & Mutation System

### 5.1 Genome Structure
- 256-byte genome (see GeneticSystem.js for cluster definitions)
- Gene clusters: Physical, Aptitude, Personality, Resistance, Appearance

### 5.2 Inheritance
- Child characters inherit genes via uniform crossover from two "parent" records
- The "parents" can be two NPCs, a player and an NPC, or two players
- Spontaneous point mutations introduce variation

### 5.3 Radiation & Mutation
- Radiation zones apply mutations to living characters over time
- Mutation types: point, inversion, amplification, suppression, radical
- High-resistance characters (via genome) absorb more radiation before mutating
- Lethal dose: characters can die from radiation poisoning
- Mutation effects may be beneficial (adapted resistance) or detrimental

### 5.4 Evolutionary Pressure
- Isolated star systems develop distinct genetic populations over time
- Extreme environments apply selection pressure
- Players can observe "evolution maps" showing genetic drift across the galaxy

---

## 6. NPC Ecosystem

- 100,000+ tracked NPCs run lightweight simulations each game tick
- NPCs have genomes, skills, wealth, relationships, and goals
- High-value NPCs ("Named" tier) have detailed behavioural scripts and long-term goals
- Player-deceased avatars join the NPC pool with their full history
- NPC deaths create population pressure, influencing the Rebirth Lottery odds

---

## 7. World Design

### 7.1 Galaxy Structure
- ~1,000 star systems at launch (procedurally generated)
- Organised into regions controlled by major factions
- Jump gates connect nearby systems; wormholes connect distant ones
- "Old Eden" (Earth system) is a rare, contested zone with extreme radiation

### 7.2 Factions
| Faction | Archetype | Home Region |
|---|---|---|
| Hegemony Vanguard | Military empire | Core systems |
| Free Traders Consortium | Merchant republic | Trade lanes |
| Void Cult | Mystic extremists | Outer fringe |
| Iron Syndicate | Industrial megacorp | Mining belts |
| Eden Remnants | Archaeologists / cultists | Old Eden system |
| Stellar Church | Theocracy | Central worlds |
| Autonomous Collective | AI-rights movement | Robotic hubs |
| Rogue AI Network | Antagonist faction | Deep space |

### 7.3 Economy
- Supply and demand emergent from NPC and player activity
- Resources travel through physical logistics chains (can be interdicted)
- Player corporations can own production facilities, taxing output
- Black markets exist in lawless zones

---

## 8. Monetisation

### 8.1 Base Model
- Free-to-play core with full gameplay access
- No pay-to-win mechanics — all purchasable advantages are cosmetic or convenience

### 8.2 Subscription Tiers
| Tier | Price | Perks |
|---|---|---|
| Free | $0 | Full gameplay, standard rebirth |
| Pioneer | $7.99/mo | 2× EC, Priority Fracture Alerts, 1 free re-roll/death, 500 SM/mo |
| Vanguard | $14.99/mo | 3× EC, all Pioneer perks, Cycle Pass included, 2 free re-rolls/death |
| Overlord | $29.99/mo | 5× EC, all Vanguard perks, 1 Ascension Trial/mo, monthly NFT drop, 1500 SM/mo |

### 8.3 NFT Marketplace
- Characters, ships, stations, land parcels, and rare equipment are NFTs
- Player-to-player trading on the integrated Polygon marketplace
- 2.5% platform fee on secondary sales, split: 1% burn, 1.5% treasury

### 8.4 Rebirth Re-Rolls
- Players can spend Stellar Marks for up to 5 re-rolls per death
- Escalating SM cost per re-roll: 30 / 60 / 120 / 250 / 500
- Encourages spending without being mandatory

### 8.5 Cycle Pass (Season/Battle Pass)
- Free Track: Basic cosmetics, EC rewards, 1 free Shard Detector per season
- Premium Track (1500 SM or $14.99): Exclusive ship skins, character cosmetics, portrait frames, SM bonuses, guaranteed rare shard at end of season
- Seasons last 8 weeks, themed around major universe events

### 8.6 Cosmetics Store
- Ship paint jobs, engine trails, weapon effects
- Character outfits, emotes, voice packs
- Housing furniture and decorations
- All purely visual — zero gameplay advantage
- Priced 50–500 SM ($0.50–$5.00 equivalent)

### 8.7 Soul Fracture Premium Items
- Shard Detector (50 SM): Shows approximate shard locations for 24h
- Shard Magnet (200 SM): 5× pickup radius for 1h
- Fracture Amplifier (100 SM): Your shards are 20% more powerful when you fracture

---

## 9. AI & ML Systems

### 9.1 AI Director
- Monitors engagement, adjusts difficulty, spawns world events
- Generates personalised quest hooks using ProceduralGenerator
- Drives faction AI decision-making (war declarations, trade policies)

### 9.2 ML Asset Generation
- Character portraits generated from genome via GAN
- Spaceship hulls generated from class + faction aesthetic prompts
- Planet textures generated from biome + atmosphere parameters
- All generation is style-consistent via fine-tuned diffusion models

### 9.3 NPC AI Stack
| NPC Tier | AI Budget | Capabilities |
|---|---|---|
| Background | Ultra-light | Location + job simulation only |
| Regular | Lightweight | Behaviour tree: work, trade, socialise |
| Notable | Medium | Utility AI + goal planning |
| Named | Full | HTN planner + memory + emotional model |

---

## 10. Technical Architecture

See [technical-architecture.md](technical-architecture.md) for the full technical specification.
