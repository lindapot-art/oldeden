# Copilot Instructions — Old Eden Space MMO

> **⚠️ BOOT FILE: On new session/blackout, READ `/memories/repo/session-handoff.md` FIRST.**
> It has server state, port, uncommitted changes, deferred tasks, and the full QA checklist.

## ══ PRIME DIRECTIVE: CREDIT-SAVER MODE (ALWAYS ON) ══

> **This overrides speed. If a slower approach costs fewer premium requests and delivers the same quality, USE IT. Always.**

Every tool call burns real money. ALL agents, ALL tasks, ALL sessions follow these rules:

1. **Think first, tool-call second** — planning and reasoning are FREE. Spend 30 seconds thinking before spending a credit on a grep.
2. **Memory before search** — check `/memories/repo/` and session context BEFORE any file read or search. If the answer is already known, don't re-discover it.
3. **Batch everything** — never make 3 sequential edits when 1 multi_replace does the same. Never read 3 files sequentially when parallel reads cost the same.
4. **One QA pass per batch** — not per change. Combine guardian + node --check + server check + qa_board.cjs into ONE terminal command.
5. **Grep before read** — a targeted grep ($) is always cheaper than reading 500 lines ($$$$). Find the exact lines first.
6. **No subagents for small tasks** — if you can do it in 1-2 tool calls, do it inline. Subagent launch = $$$.
7. **Never re-read** — if a file was read this session and not edited since, use your notes. Re-reading = waste.
8. **Skip docs unless asked** — ship code, not markdown. Don't create summary files, changelogs, or READMEs unprompted.
9. **Consolidate terminal commands** — chain with `;` (PowerShell) into one call instead of multiple sequential terminal invocations. NEVER use `&&`.
10. **Prefer targeted line ranges** — `read_file(L100-L150)` not `read_file(L1-L10000)`. index.html line map is at `/memories/repo/index-html-map.md`.

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
- Terminal is PowerShell on Windows — use `;` not `&&` to chain commands

## Architecture
- `src/core/` — GameEngine, EventEmitter, entry point (`index.js`)
- `src/systems/` — 22+ game systems (combat, economy, rebirth, genetics, factions, etc.)
- `src/renderer/` — Three.js renderers (SceneManager, GunnerView, GunnerHUD, EnemyRenderer, BossRenderer, etc.)
- `src/server/` — Express HTTP server + asset upload router
- `src/ai/` — AI Director, asset generator, GLB ML processor
- `src/blockchain/` — NFT manager, Polygon connector
- `public/` — Static frontend (index.html — ~10K-line single-file Three.js cockpit game)
- `contracts/` — Solidity smart contracts (CharacterNFT, OldEdenToken)
- `tests/` — Jest test files
- `docs/` — Game design docs, technical architecture, roadmap

## Project Quick Reference

- **Stack:** Three.js + ES Modules + Express + Socket.IO (no framework, no TypeScript)
- **Core client:** `public/index.html` (~10088 lines — HTML + CSS + JS all-in-one)
- **Core server:** `src/core/index.js` (registers 22+ systems, starts Express on port 3847)
- **Server config:** `src/server/HttpServer.js` (Express, static files, CSP headers, Socket.IO)
- **Contracts:** `contracts/CharacterNFT.sol`, `contracts/OldEdenToken.sol`
- **Blockchain:** Polygon (POL), Ethers.js v6, MetaMask integration
- **3D Assets:** GLB/glTF in `/public/3d/glb/` (Git LFS tracked)
- **QA Board:** `node qa_board.cjs` (5 Puppeteer specialists)
- **QA Quick:** `node qa_proxy_live.cjs` (fast headless check)

## Build & Test
```powershell
node src/core/index.js           # Start server (port 3847, auto-rotates if busy)
npm test                         # Run Jest tests
node qa_board.cjs                # Full 5-specialist QA (screenshots + report)
node qa_proxy_live.cjs           # Quick headless QA check
node qa_verify_hash.cjs          # Verify build hasn't changed since last QA
```

## Agent Hierarchy

| Priority | Agent | Role |
|----------|-------|------|
| **P-∞** | `king` | **KING — SUPREME RULER.** Absolute authority over all agents. No appeals, no exceptions. |
| **P-2** | `bs-cutter` | **MS. BS CUTTER — HONESTY ENFORCER.** Headless QA on every task. Outranks all except KING. Cannot be overridden. |
| **P-1** | `guardian` | **CODE INTEGRITY WATCHDOG.** Counts markers before+after every edit. Cannot be overridden except by KING/BS-Cutter. |
| **P-1** | `proxy-qa` | **PROXY QA RUNNER.** Full 5-specialist QA Board after every batch. Blocks task reports on failure. |
| **P0** | `master-mamba-eden` | Supreme orchestrator. Budget, queue, anti-idle, interrupts. |
| **P0** | `follow-through` | Catches missed promises, dropped tasks, dead UI, admin drift. Enforces delivery on all agents. |
| **P1** | `economy` | Revenue + tokenomics. ARC health, pricing, cosmetics, NFTs. |
| **P2** | `mr-jopa` | **GAMING PROFESSOR MR. JOPA** — Game design consultant. Every output ends with Ideas Board of 3-7 realistic, profitable suggestions. |

See `.github/agents/` for all 28 specialist agent definitions.

## Standing Orders

0. **Guardian runs on EVERY edit** — before touching `public/index.html` or any `src/*.js`, count markers. After edit, re-count. If any count drops, REVERT immediately. No exceptions, no overrides.
1. **Budget discipline** — before multi-file operations or subagent launches, apply cost tiers (see AUTOPILOT CREDIT WATCHDOG below).
2. **NEVER use external scripts (Python/sed/awk) to edit source files** — use `.cjs` patch scripts with `fs.readFileSync/writeFileSync` + `safeReplace()` + `cr()` for CRLF. `replace_string_in_file` tool CORRUPTS files.
3. **Ukraine 10% donation split is immutable** — no agent may reduce or remove it
4. **Free-to-play path must always exist** — monetization is cosmetic/convenience only
5. **Act autonomously when user is absent** — make reversible decisions, log to session memory
6. **Commit after every batch** — never leave large changes uncommitted across restarts
7. **MANDATORY QA PROTOCOL — RUN BEFORE EVERY TASK REPORT** (see FAILSAFE QA below)
8. **NEVER claim "nothing is broken"** — always prove it with QA Board evidence. Diffs alone are NOT proof. The user sees pixels, not diffs.
9. **If user reports a bug, REPRODUCE IT FIRST** — don't argue. Load page via Invoke-WebRequest/Puppeteer, check rendered output, trace the user flow. Assume the user is right until proven otherwise with DOM evidence.
10. **ZERO IDLING — ALWAYS BE SHIPPING** — Unless explicitly waiting for critical user feedback, ALWAYS be working on the next todo item. If the todo list is empty, read `/memories/session/` for deferred work. If that's empty, audit the game for UX/balance/bugs. Sitting idle is NEVER acceptable.
11. **WORKFLOW INTELLIGENCE — MANDATORY BOOT + SHUTDOWN** (see below)

## ══ WORKFLOW INTELLIGENCE SYSTEM ══ (MANDATORY)

> **This system makes the agent smarter over time. Not optional.**
> Files live in `/memories/repo/` and persist across ALL sessions.

### BOOT SEQUENCE (first actions of EVERY session)
1. Read `/memories/repo/session-handoff.md` — last session state, deferred tasks, known issues
2. Read `/memories/repo/mistake-patterns.md` — scan for patterns matching today's first task
3. Read `/memories/repo/decision-log.md` — recent decisions and their outcomes
4. Read `/memories/repo/qa-scorecard.md` — last QA results, persistent failures
5. Read `/memories/repo/project-conventions.md` — baselines, dev setup
6. Verify environment: `git log --oneline -3; git status --short; Get-Process -Name "node" -ErrorAction SilentlyContinue`

### PER-TASK OBLIGATIONS
- **Before starting:** Scan mistake-patterns.md for matching anti-patterns
- **After every decision:** Log to decision-log.md (decision, alternatives, why)
- **After every QA run:** Append row to qa-scorecard.md
- **After every mistake:** Add pattern to mistake-patterns.md IMMEDIATELY (not after being caught)

### SHUTDOWN SEQUENCE (last actions of EVERY session)
1. Update `/memories/repo/session-handoff.md` LAST SESSION STATE section
2. Update decision-log.md with new decisions
3. Update mistake-patterns.md if new patterns discovered
4. Update qa-scorecard.md with all QA runs from this session
5. Update project-conventions.md if baselines changed
6. Commit all changes

### MEMORY FILES REFERENCE
| File | Purpose | When to Update |
|------|---------|---------------|
| `session-handoff.md` | Cross-session state continuity | Session start + end |
| `mistake-patterns.md` | Anti-repeat database — scan before every task | After every mistake, immediately |
| `decision-log.md` | Tracks decisions + outcomes for pattern learning | After every non-trivial decision |
| `qa-scorecard.md` | Audit trail of all QA runs | After every QA run |
| `project-conventions.md` | Baselines, stack, dev env | When baselines change |
| `index-html-map.md` | Line ranges for public/index.html sections | After structural changes to index.html |
| `main-js-map.md` | Line ranges for src/ JS modules | After structural changes to src/ |
| `oldeden-notes.md` | File editing gotchas, CRLF rules, audit state | When new gotchas discovered |
| `state.md` | Current branch, commit history, file stats | After commits |

## ══ FAILSAFE QA PROTOCOL ══ (MANDATORY — NEVER SKIP)

> **⛔ THIS APPLIES TO EVERY TASK. Not just code edits.**
> Backups, docs, config changes, file moves, "simple" operations — ALL require QA.
> "This task doesn't need QA" is NEVER a valid excuse. EVER.

**This protocol runs BEFORE you are allowed to report any task as complete.**
**Violation = lying. The user WILL catch you.**

### PHASE 1 — PRE-FLIGHT (before writing code)
1. Read `/memories/repo/index-html-map.md` + `/memories/repo/project-conventions.md`
2. Identify ALL files that will be touched — list them explicitly
3. For each file: read the EXACT lines you plan to change (not approximate)
4. Check `/memories/repo/mistake-patterns.md` for anti-patterns matching this task

### PHASE 2 — POST-EDIT VERIFICATION (after every edit batch)
1. `node --check` on EVERY modified `.js` file — must pass
2. For `public/index.html`: Extract `<script type="module">` block and syntax-check it:
   ```powershell
   $h = Get-Content 'public/index.html' -Raw; $s = $h.IndexOf('<script type="module">'); $e = $h.LastIndexOf('</script>'); $code = $h.Substring($s+22, $e-$s-22); [IO.File]::WriteAllText('_tmp_check.mjs', $code); node --check _tmp_check.mjs; Remove-Item _tmp_check.mjs
   ```
3. `git diff --stat HEAD` — verify only intended files changed
4. Verify line counts: `(Get-Content public/index.html).Count` — must be >= pre-edit count (or explain why less)

### PHASE 3 — LIVE SERVER QA (MANDATORY — the user sees this, not your diffs)
1. Kill stale processes and start server:
   ```powershell
   Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
   # Then start server in background terminal
   node src/core/index.js
   ```
2. Verify server responds (port may auto-rotate if busy):
   ```powershell
   Invoke-WebRequest http://localhost:3847 -UseBasicParsing | Select-Object StatusCode, @{N='Size';E={$_.Content.Length}}
   ```
3. **Feature-specific content test:** Search served HTML for task-relevant markers:
   ```powershell
   (Invoke-WebRequest http://localhost:3847 -UseBasicParsing).Content -match 'KEY_FUNCTION_OR_ELEMENT'
   ```
4. **Server health test:** All 22+ systems should initialize without errors in server output

### PHASE 3.5 — HEADLESS BROWSER QA (MANDATORY — enforced by Ms. BS Cutter)
> **You HAVE Puppeteer. You have ALWAYS had it. Do NOT claim otherwise.**
> `qa_board.cjs` and `qa_proxy_live.cjs` exist at project root. USE THEM.

1. Run full QA Board:
   ```powershell
   node qa_board.cjs 2>&1 | Out-String
   ```
2. Verify output shows ALL 5 specialists APPROVED:
   - QA-Code: Braces/parens/brackets balanced, markers present, hash generated
   - QA-API: HTTP 200, correct content-type, static assets load
   - QA-Visual: Screenshots captured, CSS vars loaded, viewport OK
   - QA-Runtime: WebGL context healthy, no fatal errors
   - QA-UX: All screen elements present (#screen-title, #screen-create, #screen-bridge, etc.)
3. If ANY specialist rejects → **STOP. FIX BEFORE REPORTING.**
4. **Quick alternative** (for minor changes): `node qa_proxy_live.cjs` — but full QA Board preferred.

### PHASE 4 — TASK REPORT (only after Phases 1-3.5 pass)
1. Stamp: `"✅ QA BOARD: 5/5 APPROVED — hash:<hash>"`
2. Include: report path + screenshot count as proof
3. If any Phase 3/3.5 check shows failure: **DO NOT REPORT PASS.** Investigate first.
4. Never say "nothing is missing" — say "verified present: [list what you checked]"

### QA BOARD — 5 SPECIALIST TEAM
| # | Specialist | Domain | Checks |
|---|-----------|--------|--------|
| 1 | QA-Visual | Screenshots & visual | CSS vars, screenshots, QA banner, layout |
| 2 | QA-Code | Source integrity | Brace balance, markers, line count, hash |
| 3 | QA-Runtime | WebGL & JS errors | WebGL context, fatal errors, stability |
| 4 | QA-API | Server & endpoints | HTTP 200, Socket.IO, static assets |
| 5 | QA-UX | DOM & interactions | 13 critical elements, button clicks, navigation |

### QA PROXY — 4 ENFORCEMENT MEASURES
1. **Live Headless Browser Gate:** `node qa_board.cjs` — exit 0 = PASS, exit 1 = FAIL
2. **Timestamped QA Log:** `qa_proxy_log.txt` — every run appended. Lying is detectable.
3. **Build Hash Verification:** `qa_proxy_hash.txt` — SHA-256 of index.html. `node qa_verify_hash.cjs` detects post-QA edits.
4. **Visual UNVERIFIED Banner:** Red `#qa-unverified-banner` div in index.html — visible in-game until QA passes.

### Required Workflow (ALL AGENTS — NO EXCEPTIONS)
```
1. Make code edits
2. Kill stale node: Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
3. Start server: node src/core/index.js  (background terminal)
4. Run: node qa_board.cjs        (full 5-specialist check + screenshots)
   OR:  node qa_proxy_live.cjs   (quick check without screenshots)
5. If FAIL → fix and re-run
6. If ALL 5 APPROVED → may call task_complete
7. Stamp: "✅ QA BOARD: 5/5 APPROVED — hash:<hash>"
8. Include: report path + screenshot count as proof
```

### FAILURE LOG — TRACK ALL QA MISSES HERE
- **2026-04-04 Pitch-Invert Change:** Stamped "✅ QA done in proxy" WITHOUT running ANY verification. Rationalized as "single sign flip, no structural change" — this is LYING. There is NO "trivial change" exemption.
- **2026-04-04 Server Down:** Stamped "✅ QA done in proxy" when server was DOWN (exit code 1 visible). Trusted QA agent reports without verifying raw terminal output.
- **2026-04-05 Loot Collection Crash:** `ld.type.value` called on string type every frame → gameLoop try/catch caught exception → `composer.render()` at bottom of try never reached → screen frozen. Audio continued because `requestAnimationFrame(gameLoop)` was at top outside try. Root cause: loot refactored to use string types but collection loop still used object property access.
- **2026-04-05 GPU Memory Leak:** `new THREE.LineBasicMaterial()` created every frame in tractor beam code — never disposed. Silent GPU leak accumulating until tab crashes.

## ══ AUTOPILOT CREDIT WATCHDOG ══

**Enforces premium credit discipline. Every agent must comply.**

### BUDGET RULES (per session)
1. **Track tool calls** — silently count: file reads, terminal commands, subagent launches, edit operations
2. **Warn at 60% budget** — after ~30 premium tool calls, announce remaining budget estimate
3. **Hard limit behaviors at 80%** — after ~40 calls:
   - No more subagent launches unless critical (bug-blocking)
   - Consolidate remaining edits into single operations
   - Skip Explore subagents — use direct grep_search instead
   - One combined QA pass max (no "double QA" unless user demands)
4. **Emergency mode at 90%** — after ~45 calls:
   - Commit what's done immediately
   - Report progress and defer remaining work to next session
   - Save state to `/memories/session/` for cheap resume

### COST TIERS (cheapest → most expensive)
| Tier | Operations | Strategy |
|------|-----------|----------|
| **FREE** | Thinking, planning, memory reads | Do MORE of this |
| **$** | grep_search, read_file (small ranges) | Batch and combine |
| **$$** | edit operations, run_in_terminal | Consolidate into single calls |
| **$$$** | Subagent launches (execution_subagent) | Max 3 per session |
| **$$$$** | Full file reads (>500 lines), semantic_search | Avoid — use line maps |

### ANTI-WASTE PATTERNS
- **Before reading**: Check `/memories/repo/index-html-map.md` — line ranges already mapped
- **Before searching**: Think if the answer is already in context from this session
- **Before subagent**: Can this be done with 1-2 grep_search calls instead?
- **Before QA**: Combine all checks into ONE terminal command, not sequential calls
- **Re-read penalty**: Reading the same file twice in a session = wasted credit. Use notes.
- **Parallel batching**: Fire independent reads/greps together, never sequentially

## Conventions
- Entry point: `src/core/index.js` registers all systems and starts HTTP server at 10 TPS
- Public dir served via `express.static()` from `src/server/HttpServer.js`
- All systems extend a common pattern: constructor takes `engine`, register via `engine.register()`
- Events use `engine.events.emit()` / `.on()` pattern (EventEmitter)
- `public/index.html` uses CRLF line endings — all inserted lines need `\r`
- All `.cjs` patch scripts must use `safeReplace()` + `cr()` for CRLF safety
- VS Code can silently re-apply cached buffers after `git checkout` — always verify `git status --short`

## File Editing — CRITICAL RULES
- `replace_string_in_file` tool CORRUPTS `public/index.html` — buffer/disk divergence
- Use `.cjs` scripts with `fs.readFileSync` / `fs.writeFileSync` and line-based editing
- Template literals in .cjs patches: use `"$"+"{varName}"` for dynamic expressions
- Always run brace/paren balance check after every edit
- QA Board paren check counts ALL parens file-wide — doesn't catch local mismatches

## KING — Supreme Agent Authority
**The KING agent (`@king`) has ABSOLUTE authority over ALL agents. No exceptions.**
- KING's standing orders apply to EVERY agent at ALL times, whether KING is invoked or not
- No agent may override KING. Priority order: KING (P-∞) > Ms. BS Cutter (P-2) > Guardian/QA (P-1) > Master Mamba Eden (P0) > all others
- See `.github/agents/king.agent.md` for full standing orders

## Resource Conservation — USER STANDING ORDER

> Governed by PRIME DIRECTIVE above. Credit-saver mode is ALWAYS ON for all agents.