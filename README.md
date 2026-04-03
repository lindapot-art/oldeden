# Old Eden 🌌

> *"From dust you came. To dust you shall return. And from the dust — someone else entirely."*

**Old Eden** is an ambitious, blockchain-native, AI-driven massively multiplayer online space game that fuses EVE Online's deep economy and exploration, The Sims' life simulation, Counter-Strike's tactical combat, StarCraft's strategic depth, Civilization's long-arc progression, Spore's procedural evolution, and Second Life's open virtual world — all wrapped in a unique **Rebirth System** where death is not an ending but a transformation.

---

## Table of Contents

- [Vision](#vision)
- [Core Pillars](#core-pillars)
- [Rebirth System](#rebirth-system)
- [Genetic & Mutation Engine](#genetic--mutation-engine)
- [Economy & Blockchain](#economy--blockchain)
- [AI & Procedural Systems](#ai--procedural-systems)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Vision

Old Eden is set in a far-future universe where humanity has colonised hundreds of star systems, only for civilisation to fracture into warring factions, trader guilds, pirate clans, robotic service networks, and corporate mega-states. The planet "Old Eden" — Earth — is a radioactive myth, a holy pilgrimage site and a battleground.

Players do not merely *play* a character — they *are* one, living a full simulated life: owning property, building businesses, piloting warships, operating service robots remotely, forming families, and eventually dying. But death in Old Eden is not the end — it is a **rebirth lottery** that transforms you into a new character drawn randomly from the living NPC population.

---

## Core Pillars

| Pillar | Inspiration | Description |
|---|---|---|
| 🚀 Space Exploration | EVE Online, Elite Dangerous | Procedurally generated star systems, wormholes, asteroid mining, deep-space anomalies |
| 🏠 Life Simulation | The Sims, Second Life | Housing, relationships, jobs, social dynamics, ageing |
| 🔫 Tactical Combat | Counter-Strike, Tarkov | First-person/third-person shooter mechanics in ground engagements |
| 🤖 Remote Operations | Real-world drone/robot operators | Pilot drones, service robots, and automated machinery from your avatar |
| ⚡ Grand Strategy | StarCraft, Civilization | Build empires, research tech trees, wage wars across star systems |
| 🧬 Evolution | Spore, Dwarf Fortress | DNA-based character traits, generational inheritance, radiation mutation |
| 🌐 Blockchain Economy | Polygon, Ethereum | NFT assets, play-to-earn, fiat on-ramp, subscription tiers |
| 🤖 AI Director | Left 4 Dead AI Director, WoW | Dynamic difficulty, procedural quests, never-repeating content |

---

## Rebirth System

The signature mechanic of Old Eden is the **Rebirth System**:

1. **Death** — When your avatar dies (in combat, from old age, disease, or accident), you do not simply respawn.
2. **NPC Pool** — Throughout the game world, thousands of NPCs lead autonomous lives, building skills, accumulating wealth, forming relationships, and developing personalities. Every NPC is fully tracked.
3. **Rebirth Lottery** — On death, you are presented with a weighted random draw from the NPC pool. Higher-status NPCs are rarer draws. You may receive a destitute scavenger or a wealthy trader captain — it is chance.
4. **Continuity** — Your new character retains none of your old character's possessions, but your *meta-progression* (player reputation, faction standing bonuses, and NFT-locked items) carries over.
5. **Old Self as NPC** — Your deceased avatar becomes a trackable NPC, continuing to "live" in the world with AI-driven behaviour based on their established personality and skills.

This creates:
- A living, persistent world that deepens over time
- Economic scarcity that mirrors real life
- True stakes in every engagement
- A market for high-status NPC "slots"

See [docs/rebirth-system.md](docs/rebirth-system.md) for full specification.

---

## Genetic & Mutation Engine

Inspired by Spore's creature editor and real evolutionary biology:

- **DNA Genome** — Each character has a 256-gene genome encoding appearance, base stats, skill aptitudes, lifespan, and personality traits.
- **Inheritance** — Characters born in-game inherit genes from parents with random crossover and small mutation chance.
- **Radiation Zones** — Post-war sectors, ancient nuclear sites, solar flare events, and proximity to neutron stars introduce **radiation** that accelerates and amplifies mutations.
- **Generational Drift** — Over many in-game generations, populations in isolated star systems will diverge, creating new sub-species with unique traits and cultural buffs.
- **Evolutionary Pressure** — Harsh environments (extreme gravity, toxin atmospheres) apply selection pressure. Characters with adaptive genes survive longer.

See [docs/game-design-document.md](docs/game-design-document.md) for full details.

---

## Economy & Blockchain

Old Eden features a three-layer economy:

### In-Game Currency
- **Eden Credits (EC)** — Primary soft currency, earned through gameplay
- **Stellar Marks (SM)** — Premium hard currency, purchasable with fiat or crypto

### Blockchain Layer (Polygon)
- All high-value assets are **NFTs on the Polygon network** (ships, stations, rare equipment, character genomes)
- **EDEN Token** — ERC-20 governance and staking token
- Players can cash out Stellar Marks to EDEN tokens and vice versa
- Fiat on-ramp via standard payment processors (Stripe, PayPal)

### Subscription Tiers
| Tier | Price | Benefits |
|---|---|---|
| Free | $0 | Core gameplay, limited storage |
| Explorer | $9.99/mo | Expanded storage, 2× EC earning, priority queue |
| Commander | $19.99/mo | All Explorer perks + exclusive cosmetics, 3× EC, VIP zones |
| Admiral | $49.99/mo | All Commander perks + monthly NFT drop, developer access channel |

See [docs/blockchain-integration.md](docs/blockchain-integration.md) for smart contract details.

---

## AI & Procedural Systems

### AI Director
An adaptive AI Director (inspired by Left 4 Dead and modern WoW) monitors player stress, engagement, and progression in real-time:
- Spawns dynamic events (pirate raids, trade disruptions, alien anomalies) calibrated to player/group capability
- Generates procedural quests with unique narrative hooks — no two quest chains are identical
- Manages global world-state events (wars, economic crashes, stellar phenomena)

### ML Asset Generation
- Spaceship hull variants, planet terrain, alien creature designs, and building facades can be generated on-demand by diffusion models fine-tuned on the game's art style
- Character facial features and genetic phenotype expressions are rendered via a GAN trained on the genome → phenotype mapping
- Player-reported quality feedback continuously fine-tunes generation models

### NPC AI
- Each NPC runs a lightweight behaviour tree + utility AI, making autonomous decisions about work, social interaction, trade, and survival
- High-value NPCs develop "memories" and long-term goals via a hierarchical task network
- NPC populations simulate supply and demand, creating emergent economic dynamics

---

## Tech Stack

| Layer | Technology |
|---|---|
| 3D Engine | [Three.js](https://threejs.org) / [Babylon.js](https://babylonjs.com) |
| Physics | [Cannon.js](https://schteppe.github.io/cannon.js/) / [Rapier](https://rapier.rs) |
| Backend | Node.js + Express + Socket.IO |
| Database | MongoDB (world state) + Redis (session cache) |
| Blockchain | Polygon (PoS), Hardhat, ethers.js |
| Smart Contracts | Solidity 0.8.x |
| AI/ML | Python microservices (PyTorch, Stable Diffusion) |
| Asset Pipeline | Blender + custom procedural generation |
| Auth | JWT + Web3 wallet (MetaMask/WalletConnect) |
| Payments | Stripe (fiat) + Polygon Pay (crypto) |
| DevOps | Docker, Kubernetes, GitHub Actions |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/lindapot-art/oldeden.git
cd oldeden

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/oldeden
REDIS_URL=redis://localhost:6379

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_deployer_key
EDEN_TOKEN_ADDRESS=0x...
CHARACTER_NFT_ADDRESS=0x...

# Auth
JWT_SECRET=your_jwt_secret

# AI Services
AI_SERVICE_URL=http://localhost:8000
```

---

## Project Structure

```
oldeden/
├── src/
│   ├── core/                   # Game engine core
│   │   ├── GameEngine.js       # Central game loop and system orchestration
│   │   └── EventEmitter.js     # Typed event bus
│   ├── systems/                # Game systems
│   │   ├── RebirthSystem.js    # Death → rebirth lottery
│   │   ├── GeneticSystem.js    # DNA genome + inheritance
│   │   ├── MutationSystem.js   # Radiation + mutation
│   │   ├── NPCSystem.js        # Autonomous NPC lifecycle
│   │   ├── EconomySystem.js    # Multi-currency economy
│   │   └── ProceduralGenerator.js  # Procedural content
│   ├── blockchain/             # Blockchain integration
│   │   ├── PolygonConnector.js # Polygon network connector
│   │   └── NFTManager.js       # NFT mint/transfer/query
│   ├── ai/
│   │   ├── AIDirector.js       # Dynamic content director
│   │   └── AssetGenerator.js   # ML-based asset generation
│   └── renderer/
│       └── SceneManager.js     # Three.js 3D scene management
├── contracts/                  # Solidity smart contracts
│   ├── OldEdenToken.sol        # EDEN ERC-20 token
│   └── CharacterNFT.sol        # Character genome NFT (ERC-721)
├── docs/                       # Design and architecture documents
│   ├── game-design-document.md
│   ├── technical-architecture.md
│   ├── rebirth-system.md
│   ├── blockchain-integration.md
│   └── roadmap.md
├── package.json
└── .env.example
```

---

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the full phased roadmap. Summary:

| Phase | Milestone | Target |
|---|---|---|
| 0 — Foundation | Core engine, GDD, architecture | Q3 2026 |
| 1 — Prototype | Rebirth system, genetic engine, basic 3D world | Q1 2027 |
| 2 — Alpha | Combat, economy, Polygon integration | Q3 2027 |
| 3 — Beta | Full NPC ecosystem, AI Director, ML assets | Q2 2028 |
| 4 — Launch | Live service, NFT marketplace, mobile client | Q4 2028 |

---

## Realistic Projections & Analysis

### Scope Reality Check
This is a **Category AAA+ concept** — the combined scope of EVE Online, Second Life, and No Man's Sky. A team of 5–15 developers working 2–3 years could produce a compelling vertical slice. A full feature-complete version requires:
- 50–100 engineer-years of work
- $5M–$50M budget range
- 3–5 year timeline to a meaningful beta

### Recommended Approach
1. **Start with the differentiator**: The Rebirth System + Genetic Engine is the unique hook. Build that first, as a standalone demo.
2. **Modular architecture**: Each system (combat, economy, genetics) should be independently testable and expandable.
3. **Community early**: Open early access and NFT pre-sale to fund development — this is standard in blockchain gaming.
4. **AI as force multiplier**: ML-generated assets dramatically reduce art budget. Prioritise fine-tuning a style-consistent generation pipeline early.
5. **Polygon is the right chain**: Low gas fees, EVM-compatible, large gaming ecosystem, MATIC liquidity.

### Key Risks
- **Regulatory**: NFT/crypto gaming faces evolving regulation in EU, US, and Asia
- **Scope creep**: The instinct to add features must be resisted until core loops are polished
- **Player retention**: Deep systems need onboarding UX that doesn't overwhelm new players

---

## Contributing

Old Eden is in early development. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

*Old Eden — where every death is a new beginning.*
