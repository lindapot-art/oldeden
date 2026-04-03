# Old Eden — Technical Architecture

**Version:** 0.1  
**Status:** Design

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                           │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │
│  │  Three.js  │  │   Socket.IO  │  │  ethers.js / MetaMask     │   │
│  │  Renderer  │  │  Real-time   │  │  Polygon Wallet           │   │
│  └─────┬──────┘  └──────┬───────┘  └───────────┬───────────────┘   │
│        │                │                       │                   │
│        └────────────────┴───────────────────────┘                   │
│                         │                                           │
└─────────────────────────┼───────────────────────────────────────────┘
                          │ HTTPS / WSS
┌─────────────────────────┼───────────────────────────────────────────┐
│                    GAME SERVER (Node.js)                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      GameEngine                                │ │
│  │  GeneticSystem  MutationSystem  NPCSystem  EconomySystem       │ │
│  │  RebirthSystem  ProceduralGenerator  AIDirector               │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
│                             │                                        │
│  ┌──────────────┐  ┌────────┴───────┐  ┌────────────────────────┐  │
│  │  MongoDB     │  │    Redis       │  │  PolygonConnector      │  │
│  │  World State │  │  Session Cache │  │  NFTManager            │  │
│  └──────────────┘  └────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                          │ REST API
┌─────────────────────────┼───────────────────────────────────────────┐
│                  AI MICROSERVICE (Python)                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Stable Diffusion│  │  Character GAN   │  │  LLM Quest Gen   │   │
│  │  Asset Gen      │  │  Phenotype Render│  │  Narrative AI    │   │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                          │ JSON-RPC
┌─────────────────────────┼───────────────────────────────────────────┐
│                  POLYGON NETWORK                                     │
│  ┌───────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  OldEdenToken.sol │  │  CharacterNFT.sol                       │ │
│  │  (ERC-20 EDEN)    │  │  (ERC-721 Character Genomes)            │ │
│  └───────────────────┘  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend

### Technology
- **Three.js r163+** — 3D rendering, scene graph, lighting, shadows
- **Cannon-ES** — client-side physics for ship movement and projectiles
- **Socket.IO** — real-time bidirectional communication with game server
- **ethers.js v6** — Polygon wallet integration, NFT queries, token operations
- **Vanilla JS (ES Modules)** — no heavy framework overhead for game loop

### Rendering Pipeline
1. SceneManager initialises Three.js WebGL renderer
2. Space skybox loaded (cubemap from IPFS/CDN)
3. Star system geometry streamed from server as player travels
4. Ship and character models loaded from GLTF files (procedural variants applied via morph targets)
5. Post-processing: ACES tonemapping, bloom, SSAO, motion blur
6. LOD system culls distant objects, replacing with imposters

### Client Prediction & Reconciliation
- Client predicts movement locally at ~60fps
- Server authoritative state at 10 TPS
- Position reconciliation with smooth interpolation
- Combat hit detection is server-side authoritative

---

## Backend

### Technology
- **Node.js 20+** with ES Modules
- **Express 4** — REST API (auth, player profile, NFT queries)
- **Socket.IO 4** — real-time game event delivery
- **Mongoose** — MongoDB ODM for world state persistence
- **Redis** — session caching, rate limiting, pub/sub for distributed instances

### Game Engine Architecture
The server-side GameEngine drives all simulation systems on a configurable tick:

| Tick Rate | Use Case |
|---|---|
| 100ms (10 TPS) | Default: NPC simulation, economy, world events |
| 50ms (20 TPS) | Combat-intensive zones |
| 200ms (5 TPS) | Peaceful/remote zones |

### Database Schema (MongoDB)

```
collections:
  players           — account data, subscription tier, meta-reputation
  characters        — current character stats, genome, position, skills
  npcs              — NPC pool (100k+ documents, indexed by sectorId, statusScore)
  sectors           — star system data (procedural cache + player modifications)
  items             — item registry (both NFT and non-NFT)
  transactions      — economy ledger
  world_events      — active and historical global events
  rebirth_records   — lottery history for audit/analytics
  genome_lineage    — parent-child genome relationships
```

### Scalability
- Horizontal scaling via Node.js cluster + Redis pub/sub for inter-process events
- Sectors sharded across server instances (each instance owns a set of sectors)
- MongoDB Atlas with read replicas for analytics queries
- NPC simulation batched to avoid per-tick full-scan (dirty-flag pattern)

---

## AI Microservice (Python)

### Technology
- **FastAPI** — REST API framework
- **PyTorch** — ML inference
- **Diffusers (Hugging Face)** — Stable Diffusion pipeline for asset generation
- **Custom GAN** — genome → phenotype face generation (trained on procedurally-generated character art)

### Endpoints
```
POST /generate/portrait       — Character portrait from genome prompt
POST /generate/ship           — Ship hull from class + faction
POST /generate/planet_texture — Planet texture from biome + atmosphere
POST /generate/quest_art      — Quest illustration from summary text
POST /npc/backstory           — LLM-generated NPC backstory
GET  /health                  — Service health check
```

### GPU Requirements
- Production: NVIDIA A10G (24GB VRAM) or equivalent per 2 generation workers
- Development: Any GPU with ≥8GB VRAM (reduced quality settings)
- Queued generation with Redis job queue (Bull/RQ)

---

## Blockchain Layer

### Network: Polygon PoS
- Low gas fees (~$0.01 per NFT mint)
- EVM-compatible (all existing Ethereum tooling works)
- Fast finality (~2 seconds)
- Large gaming ecosystem (Opensea, Rarible, etc.)

### Contracts
| Contract | Standard | Address |
|---|---|---|
| OldEdenToken (EDEN) | ERC-20 | TBD |
| CharacterNFT | ERC-721 | TBD |
| ShipNFT | ERC-721 | TBD (Phase 2) |
| EquipmentNFT | ERC-1155 | TBD (Phase 2) |
| RewardsDistributor | Custom | TBD |
| Marketplace | Custom | TBD (Phase 2) |

### Security
- All minting gated behind server-side minter role
- Server private key in HSM (KMS in production)
- Contract audits required before mainnet deployment
- Multi-sig admin (Gnosis Safe) for critical contract parameters

---

## DevOps

### Infrastructure (Kubernetes)
```
Namespaces:
  oldeden-prod     — production game servers
  oldeden-staging  — pre-release testing
  oldeden-dev      — development instances
```

### CI/CD
- GitHub Actions: lint → test → build → deploy (to staging)
- Manual promotion to production via PR approval
- Contract deployments via Hardhat scripts + multi-sig confirmation

### Monitoring
- Prometheus + Grafana for server metrics
- Sentry for error tracking
- Custom analytics dashboard (player counts, economy health, NPC population)

---

## Security Considerations

### Anti-Cheat
- Server-authoritative physics and combat resolution
- Client inputs validated server-side
- Rate limiting on all player actions
- Anomaly detection for economy exploits

### Smart Contract Security
- Reentrancy guards on all state-modifying functions
- Access control via role-based modifiers
- Emergency pause mechanism (circuit breaker)
- External audit by Certik or Hacken before mainnet

### Player Data (GDPR)
- Minimal PII stored (email + optional wallet address)
- Player data export/deletion tools
- Private key never stored server-side
