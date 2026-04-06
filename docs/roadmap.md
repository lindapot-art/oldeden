# Old Eden — Development Roadmap

**Last Updated:** April 2026

---

## Realistic Projections & Analysis

### Scope Assessment

Old Eden combines mechanics from EVE Online, Second Life, Counter-Strike, StarCraft, Civilization, Spore, and Elite Dangerous — plus blockchain integration and ML asset generation. This places it firmly in the **Category AAA+** scope.

**Reality check by analogy:**
| Comparable Game | Dev Team | Dev Time | Budget |
|---|---|---|---|
| EVE Online (at launch) | ~50 devs | 3+ years | ~$15M |
| Second Life | ~70 devs | 3 years | ~$20M |
| No Man's Sky (vertical slice) | 4 devs | 4 years | ~$5M |
| Old Eden (MVP, see Phase 2) | 15–20 devs | 2.5 years | ~$8–15M |

A compelling, playable vertical slice of Old Eden is achievable by a focused team. A fully feature-complete version requires serious funding.

---

## Phased Roadmap

### Phase 0 — Foundation (Current → Q3 2026)

**Goal:** Establish architecture, core systems, and proof-of-concept demos.

| Milestone | Status |
|---|---|
| Game design document | ✅ Complete |
| Technical architecture | ✅ Complete |
| Core engine scaffold (GameEngine, EventEmitter) | ✅ Complete |
| GeneticSystem — genome generation & crossover | ✅ Complete |
| MutationSystem — radiation mechanics | ✅ Complete |
| RebirthSystem — lottery algorithm | ✅ Complete |
| NPCSystem — lifecycle simulation | ✅ Complete |
| EconomySystem — multi-currency | ✅ Complete |
| ProceduralGenerator — star systems + quests | ✅ Complete |
| AIDirector — world events + difficulty | ✅ Complete |
| Smart contracts — EDEN token + CharacterNFT | ✅ Complete |
| Blockchain connector — Polygon | ✅ Complete |
| Three.js scene manager scaffold | ✅ Complete |
| ML asset generator interface | ✅ Complete |
| Hardhat development environment | 🔲 Pending |
| Contract tests (Hardhat + Chai) | 🔲 Pending |
| Game system unit tests (Jest) | 🔲 Pending |
| MongoDB schema + Mongoose models | 🔲 Pending |
| REST API (Express + Socket.IO) | 🔲 Pending |

---

### Phase 1 — Prototype (Q4 2026 → Q1 2027)

**Goal:** Playable prototype demonstrating the unique Rebirth System mechanics in a small hand-crafted star system.

**Team required:** 3–5 developers (2 backend, 1 frontend/3D, 1 smart contracts, 1 artist)

| Milestone | Description |
|---|---|
| Playable character in 3D space | WASD movement, basic ship flight |
| 3 hand-crafted star systems | Jump gates between them |
| Basic combat prototype | FPS ground combat + ship-to-ship |
| Rebirth demo | 1000 simulated NPCs, full rebirth flow UX |
| Genetic phenotype renderer | Faces generated from genome via ML |
| Polygon testnet deployment | CharacterNFT mint on Mumbai testnet |
| Closed alpha (50 players) | Invite-only, heavily instrumented |

**Budget estimate:** $500K–$1M (small team, 6 months)

---

### Phase 2 — Alpha (Q2 2027 → Q3 2027)

**Goal:** Feature-complete alpha with all core systems integrated. 500-player stress test.

| Milestone | Description |
|---|---|
| 50 procedurally generated star systems | Full ProceduralGenerator output |
| Complete skill system | 20+ skills, progression curves |
| Economy live | EC, SM, EDEN token on Polygon mainnet |
| NFT marketplace (basic) | Character and ship NFT trading |
| AI Director live | World events, dynamic quests |
| Remote operation gameplay | Drone and robot mechanics |
| Life simulation basics | Housing, relationships, jobs |
| 10,000 NPC pool | Rebirth lottery live |
| Subscription tiers | Stripe + Polygon Pay integration |
| Closed beta (500 players) | Stress test, economy balancing |

**Budget estimate:** $3–5M (10–15 devs, 12 months)

---

### Phase 3 — Beta (Q4 2027 → Q2 2028)

**Goal:** Polished beta with full feature set. Community building, content creator programme.

| Milestone | Description |
|---|---|
| 500 star systems | Galaxy feels expansive |
| Full NPC AI tiers | Background, Regular, Notable, Named |
| ML asset generation live | All visual generation pipelines active |
| Grand strategy layer | Faction wars, territory control |
| Mobile companion app | Map, economy, messaging |
| 100,000 NPC pool | Full Rebirth System depth |
| Open beta (10,000 players) | Full economy stress test |
| Bug bounty programme | Community security audit |

**Budget estimate:** $8–12M cumulative (expand to 20+ devs)

---

### Phase 4 — Launch (Q3 2028 → Q4 2028)

**Goal:** Full public launch. Live service operations. NFT presale and public token sale.

| Milestone | Description |
|---|---|
| Public launch | All platforms (PC, Mac, browser) |
| NFT presale | Genesis character auction |
| EDEN token public sale | Regulated, jurisdiction-compliant |
| Full marketplace | Peer-to-peer NFT trading |
| DAO governance | EDEN holders vote on parameters |
| Console ports (stretch) | PlayStation / Xbox via cloud streaming |

---

## Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep | High | High | Strict phase gating; cut features before dates |
| Regulatory change (NFT/crypto) | Medium | High | Legal counsel; utility-first framing |
| Player onboarding complexity | High | Medium | Progressive disclosure; simple first session |
| AI generation cost at scale | Medium | Medium | Caching, LOD generation, opt-in only |
| Smart contract exploit | Low | High | Audit, bug bounty, pause mechanism |
| Core team retention | Medium | High | Equity + token allocation for founding team |

---

## Recommended First Steps

For a solo founder or small team starting today:

1. **Build the Rebirth System demo** — this is the unique hook. Build a small self-contained tech demo with ~1,000 simulated NPCs and a working rebirth lottery. This can be done in 2–3 months by 1–2 developers.

2. **Set up a Discord and dev blog** — build community early; this drives organic marketing and finds your first alpha players.

3. **Deploy to Polygon testnet** — get the CharacterNFT contract live on Mumbai. Mint test characters. Show NFT ownership to early community members.

4. **Find a 3D artist partner** — the biggest non-code bottleneck is art. Prioritise a style guide and ship model library early.

5. **Apply for grants** — Polygon Studios, Filecoin, and various gaming DAOs offer grants for blockchain game development ($50K–$500K range).

---

## Further Inspiration & Research

- **Game Design:** EVE Online design talks (CCP Games GDC presentations), Raph Koster's *A Theory of Fun*, Sid Meier on randomness
- **Blockchain Gaming:** Axie Infinity post-mortems, Illuvium tokenomics, Big Time Studios architecture talks
- **Procedural Generation:** No Man's Sky GDC talk, Spelunky design document, Dwarf Fortress dev diaries
- **AI in Games:** Left 4 Dead AI Director paper, OpenAI Five, DeepMind AlphaStar
- **Evolution Simulation:** Karl Sims' *Evolved Virtual Creatures*, Conway's Game of Life, NetLogo simulations
