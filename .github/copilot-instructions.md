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

## KING — Supreme Agent Authority
**The KING agent (`@king`) has ABSOLUTE authority over ALL agents. No exceptions.**
- KING's standing orders apply to EVERY agent at ALL times, whether KING is invoked or not
- No agent may override KING. Priority order: KING (P-∞) > Ms. BS Cutter (P-2) > Guardian/QA (P-1) > Master Mamba (P0) > all others
- See `.github/agents/king.agent.md` for full standing orders

## QA BOARD — 5 SPECIALIST TEAM (MANDATORY)
**Every code edit must be approved by ALL 5 QA specialists before task_complete.**

| # | Specialist | Domain | Checks |
|---|-----------|--------|--------|
| 1 | QA-Visual | Screenshots & visual | CSS vars, screenshots, QA banner, layout |
| 2 | QA-Code | Source integrity | Brace balance, markers, line count, hash |
| 3 | QA-Runtime | WebGL & JS errors | WebGL context, fatal errors, stability |
| 4 | QA-API | Server & endpoints | HTTP 200, Socket.IO, static assets |
| 5 | QA-UX | DOM & interactions | 13 critical elements, button clicks, navigation |

Run `node qa_board.cjs` — it executes ALL 5 specialists and generates:
- **Report file**: `qa_reports/report_<timestamp>.txt`
- **Screenshots**: `qa_reports/screenshots/*.png`
- **QA log entry**: appended to `qa_proxy_log.txt`
- **Hash file**: `qa_proxy_hash.txt` (only on PASS)

**ALL 5 must show APPROVED. If ANY rejects → task is NOT complete.**

## QA PROXY — MANDATORY ENFORCEMENT (4 measures)
**EVERY code edit MUST pass live QA before task_complete. No exceptions. No excuses.**

### Measure 1: Live Headless Browser Gate
Run `node qa_proxy_live.cjs` (quick) or `node qa_board.cjs` (full 5-specialist) after every batch of code changes. It:
- Launches real Puppeteer browser, loads `http://localhost:3000`
- Catches WebGL crashes, JS errors, missing DOM elements
- Writes pass/fail to `qa_proxy_log.txt` with timestamp
- Writes SHA-256 hash to `qa_proxy_hash.txt`
- Exit code 0 = PASS, 1 = FAIL. FAIL = do not mark complete.

### Measure 2: Timestamped QA Log
Every QA run appends to `qa_proxy_log.txt`. The user can verify ANY claim by checking timestamps. Lying is detectable.

### Measure 3: Build Hash Verification
`qa_proxy_hash.txt` contains SHA-256 of index.html at QA time. If code changes after QA:
- Run `node qa_verify_hash.cjs` — it will FAIL with mismatch.
- You MUST re-run QA after any edit.

### Measure 4: Visual UNVERIFIED Banner
`public/index.html` has a red `#qa-unverified-banner` div at the top of `<body>`. It reads:
"⚠ UNVERIFIED BUILD — run: node qa_proxy_live.cjs ⚠"
The user sees this in-game every time. It's a permanent visual reminder.

### Required Workflow (ALL AGENTS — NO EXCEPTIONS)
```
1. Make code edits
2. Start server: node src/core/index.js
3. Run: node qa_board.cjs        (full 5-specialist check + screenshots)
   OR:  node qa_proxy_live.cjs   (quick check without screenshots)
4. If FAIL → fix and re-run
5. If ALL 5 APPROVED → may call task_complete
6. Stamp: "✅ QA BOARD: 5/5 APPROVED — hash:<hash>"
7. Include: report path + screenshot count as proof
```
