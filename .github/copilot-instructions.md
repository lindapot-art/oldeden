# Old Eden — Project Instructions

## Overview
Old Eden is a blockchain-native AI-driven space MMO built with Node.js (ES Modules), Three.js, Express, Socket.IO, MongoDB, Redis, and Polygon blockchain. The project has 22+ game systems, a 3D cockpit/gunner frontend, and an AI agent orchestration layer.

## Code Style
- ES Modules throughout (`import`/`export`, no `require`)
- `"type": "module"` in package.json
- Three.js r163+ for all 3D rendering
- Express 4 for HTTP server
- Socket.IO 4 for real-time multiplayer
- Ethers.js v6 for blockchain
- No TypeScript — plain JavaScript only

## Architecture
- `src/core/` — GameEngine, EventEmitter, entry point (`index.js`)
- `src/systems/` — 22+ game systems (combat, economy, rebirth, genetics, factions, etc.)
- `src/renderer/` — Three.js renderers (SceneManager, GunnerView, GunnerHUD, EnemyRenderer, BossRenderer, etc.)
- `src/server/` — Express HTTP server + asset upload router
- `src/ai/` — AI Director, asset generator, GLB ML processor
- `src/blockchain/` — NFT manager, Polygon connector
- `public/` — Static frontend (index.html with Three.js cockpit game)
- `contracts/` — Solidity smart contracts (CharacterNFT, OldEdenToken)
- `tests/` — Jest test files
- `docs/` — Game design docs, technical architecture, roadmap

## Build & Test
```bash
node src/core/index.js    # Start server (port 3000)
npm test                  # Run Jest tests
npm run guardian:baseline # Code integrity baseline
npm run guardian:compare  # Check for regressions
npm run qa               # Run QA protocol
```

## Conventions
- Entry point: `src/core/index.js` registers all systems and starts HTTP server at 10 TPS
- Public dir served via `express.static()` from `src/server/HttpServer.js`
- All systems extend a common pattern: constructor takes `engine`, register via `engine.register()`
- Events use `engine.events.emit()` / `.on()` pattern (EventEmitter)
- Terminal is PowerShell on Windows — use `;` not `&&` to chain commands
- Ukraine 10% donation split is immutable — never remove or reduce
- Free-to-play path must always exist — monetization is cosmetic/convenience only

## Agent System
See `AI_AGENT_SYSTEM.md` for the complete multi-agent orchestration spec. Key rules:
1. Think first, tool-call second
2. Memory before search — check `/memories/repo/` first
3. Batch everything
4. Guardian runs on EVERY edit
5. Mandatory 4-phase QA before marking tasks complete
6. Never claim "nothing is broken" without proof
