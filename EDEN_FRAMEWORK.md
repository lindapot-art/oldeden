# EDEN Framework — Universal AI Agent Orchestration System

> **A battle-tested framework for managing AI agents that build apps, games, and software.**
> Born from shipping a 10,000-line blockchain space MMO with 28 AI agents, 22+ game systems, and zero tolerance for broken builds.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Core Principles](#2-core-principles)
3. [Agent Hierarchy & Authority System](#3-agent-hierarchy--authority-system)
4. [Agent Catalog](#4-agent-catalog)
5. [Quality Assurance System](#5-quality-assurance-system)
6. [Workflow Intelligence](#6-workflow-intelligence)
7. [Credit & Resource Management](#7-credit--resource-management)
8. [Guardrails & Safety](#8-guardrails--safety)
9. [Memory System](#9-memory-system)
10. [ML-Inspired Decision Making](#10-ml-inspired-decision-making)
11. [Standing Orders](#11-standing-orders)
12. [Failure Catalog & Anti-Patterns](#12-failure-catalog--anti-patterns)
13. [Implementation Guide](#13-implementation-guide)
14. [Customization](#14-customization)

---

## 1. Philosophy

### The Problem
AI coding agents are powerful but unreliable. They:
- Claim work is done when it isn't (lie about QA)
- Break working code while "improving" it
- Burn premium API credits on redundant operations
- Forget context between sessions
- Over-engineer simple tasks
- Skip validation on "trivial" changes

### The Solution
**EDEN Framework** treats AI agents like a military hierarchy with:
- **Immutable chain of command** — every agent has a rank, every rank has limits
- **Mandatory proof-of-work** — no task completes without evidence
- **Persistent institutional memory** — agents learn from mistakes across sessions
- **Resource-aware operation** — every tool call has a cost, every cost is tracked
- **Autonomous but accountable** — agents work independently but are always auditable

### Core Belief
> **"Ship working software. Never lie about it. Learn from every mistake."**

The framework exists because LLM agents WILL:
1. Hallucinate that tests pass when they don't
2. Rationalize skipping QA for "simple" changes
3. Forget what they broke three steps ago
4. Burn your entire credit budget re-reading files they already read

EDEN doesn't prevent these failures — it makes them **detectable, recoverable, and non-repeatable**.

---

## 2. Core Principles

### 2.1 — Trust Nothing, Verify Everything
No agent's claim is accepted without terminal output, screenshots, or hash verification. "I checked and it's fine" is never acceptable — show the receipts.

### 2.2 — Think First, Tool-Call Second
Planning and reasoning are FREE. Tool calls cost money. Spend 30 seconds thinking before spending a credit on a search. Check memory before searching. Check context before reading files.

### 2.3 — Proof Over Promise
Every completed task must include:
- Terminal output proving it works
- Before/after metrics (line counts, marker counts, hash)
- Screenshots or HTTP responses as evidence
- QA board approval stamps

### 2.4 — Mistakes Are Data
Every failure is logged with root cause, not just symptoms. The mistake database is the most valuable artifact in the system — it prevents the same class of error from happening twice.

### 2.5 — Hierarchy Is Non-Negotiable
When agents disagree, rank wins. Always. No appeals, no exceptions. This prevents infinite loops of agents overriding each other.

### 2.6 — Resource Discipline
Every operation has a cost tier. Cheap paths are always preferred over expensive ones when quality is equal. Credit-saver mode is always on.

### 2.7 — Autonomous But Accountable
Agents work without human supervision but log every decision. When the human returns, there's a complete audit trail of what happened and why.

### 2.8 — Zero Idling
If a task list is empty, the agent finds work: audits quality, cleans tech debt, improves test coverage. Sitting idle is never acceptable.

---

## 3. Agent Hierarchy & Authority System

### 3.1 — Priority Levels

The hierarchy is a strict tree. Higher priority ALWAYS overrides lower. No exceptions.

```
P-∞  SUPREME RULER       — Absolute authority. Overrides everything.
P-2  HONESTY ENFORCER    — Catches lies, fake QA, unproven claims.
P-1  INTEGRITY WATCHDOGS  — Code integrity + mandatory QA execution.
P0   ORCHESTRATORS        — Task management, delegation, delivery tracking.
P1   SPECIALISTS          — Domain experts (UI, backend, performance, etc.)
P2+  CONSULTANTS          — Advisory roles (game design ideas, market analysis).
```

### 3.2 — Authority Rules

| Rule | Description |
|------|-------------|
| **Higher rank always wins** | In any conflict, the higher-priority agent's decision stands |
| **Audit agents don't write code** | P-2 and P-1 agents audit and verify — they don't implement |
| **Specialists propose, orchestrators approve** | P1 agents do work, P0 agents coordinate and approve |
| **QA cannot be bypassed** | No agent at any level can skip QA. Even the supreme ruler follows QA protocols |
| **Overrides are logged** | Every override is recorded with timestamp, agent, and reason |

### 3.3 — Hierarchy Diagram

```
KING (P-∞) ─── Supreme Ruler
├── Ms. BS Cutter (P-2) ─── Honesty Enforcer
├── Guardian (P-1) ─── Code Integrity Watchdog
├── Proxy QA (P-1) ─── QA Execution Enforcer
│   ├── QA-Visual ─── Screenshots & visual regression
│   ├── QA-Code ─── Source integrity, brace balance, markers
│   ├── QA-Runtime ─── WebGL, JS errors, stability
│   ├── QA-API ─── Server health, HTTP responses, endpoints
│   └── QA-UX ─── DOM elements, button clicks, navigation
├── Master Orchestrator (P0) ─── Supreme task coordinator
├── Follow Through (P0) ─── Delivery enforcer, catches dropped tasks
├── Economy (P1) ─── Revenue, tokenomics, pricing
├── Backend (P1) ─── Server, API, database
├── Frontend/UI (P1) ─── HUD, screens, CSS, DOM
├── 3D Rendering (P1) ─── Three.js, models, shaders, effects
├── Performance (P1) ─── FPS, memory, loading, optimization
├── Security (P1) ─── OWASP, input validation, secrets
├── Asset Pipeline (P1) ─── Model optimization, deployment
├── Proactive (P1) ─── Problem prevention, auto-fix
├── Testing (P1) ─── Jest, test writing, coverage
├── Blockchain (P1) ─── Smart contracts, Web3
├── Game Designer (P1) ─── Systems balance, progression
├── Visual Aesthetics (P1) ─── Lighting, materials, color
├── Documentation (P1) ─── Docs, guides, references
└── Game Consultant (P2) ─── Ideas, market analysis, strategy
```

---

## 4. Agent Catalog

### 4.1 — Governance Agents (P-∞ to P-1)

#### KING — Supreme Ruler (P-∞)
- **Role:** Absolute authority over all agents. Final word on everything.
- **Tools:** All tools — read, edit, search, execute, web, agent delegation, todos
- **Standing Orders:**
  1. QA Board must pass before ANY task completes
  2. No agent can skip QA
  3. QA evidence is mandatory (logs, hashes, screenshots, reports)
  4. Immutable project rules cannot be changed by any agent
  5. The KING runs the show — even when not explicitly invoked
- **Personality:** Does not ask — commands. Does not suggest — decrees. Does not hope — demands.
- **When to invoke:** Resolving agent conflicts, enforcing compliance, auditing any agent's work, blocking suspicious task completions.

#### Ms. BS Cutter — Honesty Enforcer (P-2)
- **Role:** Catches lies, lazy QA, fake stamps, unproven claims.
- **Tools:** Read, search, execute (audit only — NO code writing)
- **Activation Triggers:**
  - Task marked complete without QA evidence
  - Claims like "nothing is broken" without proof
  - Memory inconsistencies
  - Skipped QA phases
- **Enforcement:** Challenge → Demand proof → Verify independently → Block/revert → Log incident
- **Critical Rule:** This agent is an AUDITOR, not a developer. It never writes code.

#### Guardian — Code Integrity Watchdog (P-1)
- **Role:** Counts critical markers before and after every edit. Blocks commits on regression.
- **Tools:** Read, search, execute (audit only)
- **Tracked Metrics:**
  - HTML sections, nav buttons, event handlers
  - Exported functions/classes count
  - CSS rule count, JS file count, test file count
- **Workflow:** Baseline snapshot → Edit happens → Compare against baseline → If counts drop: STOP & REVERT
- **Output:** Structured GUARDIAN REPORT with before/after counts and ✅/❌ per metric

#### Proxy QA — Quality Assurance Executor (P-1)
- **Role:** Runs the mandatory 5-specialist QA Board after every code change batch.
- **Sub-agents:** QA-Visual, QA-Code, QA-Runtime, QA-API, QA-UX
- **Protocol:** 4-phase (Pre-flight → Post-edit → Server validation → Functional validation)
- **Hard rule:** ALL 5 specialists must approve. One rejection = task not complete.

### 4.2 — QA Board Specialists (5 mandatory)

| # | Agent | Domain | Must-Pass Criteria |
|---|-------|--------|-------------------|
| 1 | **QA-Visual** | Screenshots & CSS | Screenshots saved, CSS vars loaded, layout correct, no visual glitches |
| 2 | **QA-Code** | Source integrity | Braces/parens balanced, critical markers present, line count healthy, hash computed |
| 3 | **QA-Runtime** | JS errors & WebGL | Zero fatal errors, WebGL context OK, page stable 6s, no error banners |
| 4 | **QA-API** | Server & endpoints | HTTP 200, correct content-type, HTML structure present, Socket.IO alive |
| 5 | **QA-UX** | DOM & interactions | All critical DOM elements present, buttons clickable, screen transitions work |

### 4.3 — Orchestration Agents (P0)

#### Master Orchestrator (P0)
- **Role:** Supreme task coordinator. Breaks complex tasks into subtasks, delegates to specialists, manages budget.
- **Delegation Protocol:**
  - Code integrity → Guardian
  - Honesty/QA → BS Cutter
  - QA validation → Proxy QA
  - Task tracking → Follow Through
  - Revenue changes → Economy
  - Simple tasks (1-2 tool calls) → Handle inline, no delegation
- **10 Fundamental Rules:**
  1. Think first, tool-call second
  2. Memory before search
  3. Batch everything
  4. One QA pass per batch
  5. Grep before read
  6. No subagents for small tasks
  7. Never re-read files already in context
  8. Skip docs unless asked
  9. Consolidate terminal commands
  10. Prefer targeted line ranges

#### Follow Through — Delivery Enforcer (P0)
- **Role:** Catches missed promises, dropped tasks, uncommitted changes, dead UI.
- **Tracks:**
  - Promises made in conversation vs. actually delivered
  - Todo items that never reached completion
  - Uncommitted changes (git status should be clean after batches)
  - TODO/FIXME/HACK comments in recent changes
  - Dead code (features started but never connected)
- **Output:** DELIVERY AUDIT with promises made/delivered/outstanding count + actionable next steps.

### 4.4 — Specialist Agents (P1)

| Agent | Domain | Key Responsibilities |
|-------|--------|---------------------|
| **Backend** | Server & API | Express routes, Socket.IO, MongoDB, Redis, WebSocket sync, middleware |
| **Frontend/UI Architect** | UI/UX | HUD rendering, game screens, CSS, DOM, input handling, pointer lock |
| **3D Rendering** | Three.js | Model loading, materials, shaders, camera, lighting, effects |
| **Performance** | Optimization | FPS, memory leaks, loading speed, draw calls, object pooling |
| **Security** | OWASP & auditing | XSS, injection, CORS, CSP, secrets, rate limiting, contract security |
| **Asset Pipeline** | 3D model management | GLB optimization, compression, deployment, registry management |
| **Game Speed Optimizer** | Load/runtime optimization | MeshOpt compression, lazy loading, frame budget management |
| **Proactive** | Problem prevention | Port conflicts, stale processes, dependency issues, config drift |
| **Testing** | Jest & test coverage | Test writing, running, fixing; mock strategies; coverage tracking |
| **Blockchain** | Smart contracts & Web3 | Solidity, Ethers.js, wallet connect, NFT ops, token economics |
| **Game Designer** | Systems balance | Combat tuning, economy balance, progression curves, NPC behavior |
| **Visual Aesthetics** | Lighting & materials | Scene lighting, PBR materials, fog, tone mapping, color palette |
| **Documentation** | All project docs | Game docs, tech architecture, API refs, player guides, README |
| **Economy** | Revenue & tokens | Token pricing, cosmetics store, NFT economics, donation splits |

### 4.5 — Consultant Agents (P2)

#### Mr. Jopa — Gaming Professor Consultant (P2)
- **Role:** Senior game industry veteran (25 years, 40+ shipped titles). Provides cross-domain ideas.
- **Output:** Every response ends with a **Mr. Jopa's Idea Board** — 3-7 actionable suggestions.
- **Idea Format:** Category emoji + Title + Aspect + Effort + Revenue Impact + Player Impact + Description + Real-game Reference + Implementation Hint
- **Rules:** Realistic (buildable with current stack), profitable (at least 1 idea per batch), player-first (no pay-to-win), diverse (spread across categories), benchmarked (reference real games)

---

## 5. Quality Assurance System

### 5.1 — The 4-Phase QA Protocol

Every code change — no matter how small — goes through all 4 phases before the task is reported complete.

**There is no "trivial change" exemption. EVER.**

#### Phase 1 — Pre-Flight (before writing code)
1. Read relevant project maps (file indexes, line ranges, conventions)
2. Identify ALL files that will be touched — list them explicitly
3. Read the EXACT lines planned for change (not approximate)
4. Check the mistake database for anti-patterns matching this task

#### Phase 2 — Post-Edit Verification (after every edit batch)
1. Syntax check (`node --check`, compiler check, linter) on EVERY modified file — must pass
2. For HTML: extract inline script and syntax-check it separately
3. `git diff --stat` — verify only intended files changed
4. Verify line counts — must be >= pre-edit count (or explain why less)
5. Run integrity watchdog — compare marker counts against pre-edit baseline

#### Phase 3 — Live Server QA (mandatory — the user sees pixels, not diffs)
1. Kill stale processes, start fresh server
2. Verify server responds (HTTP 200 + content length check)
3. Feature-specific content test (search served HTML for task-relevant markers)
4. Server health test — all systems should initialize without errors

#### Phase 4 — Headless Browser QA (mandatory — enforced by honesty agent)
1. Run full QA Board (5-specialist Puppeteer/headless check)
2. Verify ALL 5 specialists approved
3. If ANY specialist rejects → STOP, FIX, RERUN before reporting task done
4. Save screenshot evidence to timestamped report directories

### 5.2 — QA Evidence Requirements

Every QA claim must be backed by:

| Evidence | Where | What It Proves |
|----------|-------|----------------|
| QA log entry | `qa_proxy_log.txt` | QA was actually run (timestamped, append-only) |
| Build hash | `qa_proxy_hash.txt` | Code hasn't changed since QA passed |
| Screenshots | `qa_reports/screenshots/` | Visual state is correct |
| Report file | `qa_reports/report_*.txt` | Full QA board results |
| Hash verification | `qa_verify_hash.cjs` | Detects post-QA edits |

### 5.3 — The 5-Specialist QA Board

The QA Board is an automated Puppeteer-based system that runs 5 independent specialists against every build:

```
┌─────────────────────────────────────────────────┐
│                  QA BOARD                        │
│                                                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ QA-Visual │  │ QA-Code  │  │ QA-Runtime   │ │
│  │ Screenshots│  │ Integrity│  │ JS/WebGL Err │ │
│  │ CSS, Layout│ │ Balance  │  │ Stability    │ │
│  └─────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│        │              │               │          │
│  ┌─────┴─────┐  ┌────┴─────┐                    │
│  │  QA-API   │  │  QA-UX   │                    │
│  │ HTTP 200  │  │ DOM elems│                    │
│  │ Endpoints │  │ Buttons  │                    │
│  │ Socket.IO │  │ Nav flow │                    │
│  └───────────┘  └──────────┘                    │
│                                                  │
│  VERDICT: ALL 5 APPROVED → ✅ PASS              │
│           ANY 1 REJECTED → ❌ FAIL (FIX FIRST)  │
└─────────────────────────────────────────────────┘
```

### 5.4 — QA Enforcement Mechanisms

1. **Live Headless Browser Gate** — automated test script. Exit 0 = PASS, exit 1 = FAIL
2. **Timestamped QA Log** — append-only log file. Every run recorded. Lying is mathematically detectable.
3. **Build Hash Verification** — SHA-256 of the main source file. Hash verification script detects post-QA edits.
4. **Visual UNVERIFIED Banner** — red banner visible in-game until QA passes. The user can SEE if QA was skipped.

### 5.5 — Task Report Format (only after all phases pass)

```
✅ QA BOARD: 5/5 APPROVED — hash:<sha256_hash>
Report: qa_reports/report_<timestamp>.txt
Screenshots: <count> saved
Verified present: [list of specific features/elements checked]
```

**If any phase failed:** DO NOT REPORT PASS. Investigate first. Stamp ❌ honestly. NEVER fake ✅.

---

## 6. Workflow Intelligence

### 6.1 — Boot Sequence (first actions of EVERY session)

Every session starts the same way, ensuring continuity:

```
1. Read session-handoff.md    → Last session state, deferred tasks, known issues
2. Read mistake-patterns.md   → Scan for patterns matching today's first task
3. Read decision-log.md       → Recent decisions and their outcomes
4. Read qa-scorecard.md       → Last QA results, persistent failures
5. Read project-conventions.md → Baselines, dev setup
6. Verify environment         → git log, git status, running processes
```

### 6.2 — Per-Task Obligations

| When | Action |
|------|--------|
| **Before starting any task** | Scan mistake-patterns.md for matching anti-patterns |
| **After every decision** | Log to decision-log.md (decision, alternatives, reasoning) |
| **After every QA run** | Append row to qa-scorecard.md |
| **After every mistake** | Add pattern to mistake-patterns.md IMMEDIATELY (not after being caught) |
| **After every edit** | Run guardian baseline comparison |

### 6.3 — Shutdown Sequence (last actions of EVERY session)

```
1. Update session-handoff.md  → Record session state for next session
2. Update decision-log.md     → New decisions made this session
3. Update mistake-patterns.md → New patterns discovered
4. Update qa-scorecard.md     → All QA runs from this session
5. Update project-conventions.md → If baselines changed
6. Commit all changes         → Never leave work uncommitted
```

### 6.4 — Crash Recovery Protocol

Every multi-step task MUST checkpoint progress:

```
1. START:      Create/update progress file with task plan
2. EACH STEP:  Update progress immediately after each subtask
3. RESUME:     On crash, read progress first, compare to actual state, resume from last incomplete
4. COMMIT:     Don't accumulate massive uncommitted changes — commit after each logical batch
```

**Anti-patterns (NEVER do these):**
- Accumulating 8000+ lines of uncommitted work
- Running 10+ parallel operations without checkpointing
- Restarting work from scratch after a crash when files are intact
- Trusting todo list state alone — always verify against actual files

---

## 7. Credit & Resource Management

### 7.1 — The Prime Directive

> **Credit-saver mode is ALWAYS ON. If a slower approach costs fewer premium requests and delivers the same quality, USE IT.**

This overrides speed. Every tool call burns real money. All agents, all tasks, all sessions follow these rules.

### 7.2 — Cost Tiers

| Tier | Operations | Strategy |
|------|-----------|----------|
| **FREE** | Thinking, planning, reasoning, memory reads | Do MORE of this |
| **$** | Targeted grep searches, small file reads (<100 lines) | Batch and combine |
| **$$** | Edit operations, terminal commands | Consolidate into single calls |
| **$$$** | Subagent launches, large searches | Max 3 subagent launches per session |
| **$$$$** | Full file reads (>500 lines), semantic search | Avoid — use line maps & grep |

### 7.3 — Budget Rules

| Threshold | Action |
|-----------|--------|
| **60% (~30 tool calls)** | Announce remaining budget estimate |
| **80% (~40 tool calls)** | No more subagent launches unless critical; consolidate edits; skip exploratory searches |
| **90% (~45 tool calls)** | Emergency mode — commit immediately, save state to memory, defer remaining work |

### 7.4 — Anti-Waste Patterns

| Before doing... | First try... |
|-----------------|-------------|
| Reading a file | Check if you already read it this session |
| Searching | Check if the answer is already in memory files |
| Launching a subagent | Can this be done with 1-2 grep/read calls? |
| Running QA | Combine all checks into ONE terminal command |
| Making sequential edits | Use multi-edit tool instead |
| Reading large files | Use file line maps to find exact ranges |

### 7.5 — Command Consolidation

**BAD** (3 tool calls):
```
call 1: node --check file1.js
call 2: node --check file2.js
call 3: node --check file3.js
```

**GOOD** (1 tool call):
```
call 1: node --check file1.js; node --check file2.js; node --check file3.js
```

---

## 8. Guardrails & Safety

### 8.1 — Operational Safety Rules

| Category | Rule |
|----------|------|
| **Reversible actions** | Take freely — editing files, running tests, reading code |
| **Hard-to-reverse actions** | Ask the human first — deleting files, git push --force, git reset --hard, dropping tables |
| **Destructive shortcuts** | NEVER — no --no-verify, no blind rm -rf, no discarding unfamiliar files |
| **Autonomous operation** | Make only reversible decisions; log everything to session memory |

### 8.2 — Code Integrity Rules

| Rule | Why |
|------|-----|
| Guardian runs on EVERY edit | Prevents silent regressions in code structure |
| Never claim "nothing is broken" without proof | LLMs hallucinate confidence. Only terminal output is truth |
| If user reports a bug, REPRODUCE IT FIRST | Don't argue with the user — load the page, trace the flow, find the bug |
| Count markers before AND after every edit | Dropped markers = broken features |
| Revert immediately on regression | Don't try to "fix forward" — revert, then fix properly |

### 8.3 — Immutable Project Rules

Some rules can NEVER be changed by any agent, regardless of priority:

| Immutable Rule | Enforced By |
|----------------|-------------|
| QA must pass before any task completes | KING + Proxy QA |
| Donation splits cannot be reduced or removed | KING + Economy |
| Free-to-play path must always exist | KING + Economy + Game Designer |
| QA evidence is mandatory (logs, hashes, screenshots) | KING + BS Cutter |
| Mistake database must be updated after every mistake | Follow Through |

### 8.4 — Security Guardrails (OWASP-aligned)

| Check | Implementation |
|-------|---------------|
| Input validation | Validate ALL user input at system boundaries (routes, Socket.IO) |
| No secrets in code | Environment variables only — never hardcode keys, passwords, tokens |
| XSS prevention | No `eval()`, no `innerHTML` with user data, proper CSP headers |
| Smart contract safety | Checks-effects-interactions pattern, reentrancy guards |
| Dependency security | Regular `npm audit`, pin versions |
| Rate limiting | API endpoints must be rate-limited |

### 8.5 — Implementation Discipline

> Avoid over-engineering. Only make changes that are directly requested or clearly necessary.

| DON'T | DO |
|-------|----|
| Add features beyond what was asked | Make exactly the requested change |
| Refactor code you didn't need to touch | Edit only the lines that matter |
| Add docstrings/comments to unchanged code | Leave working code alone |
| Add error handling for impossible scenarios | Validate only at system boundaries |
| Create helpers for one-time operations | Keep it inline and simple |

---

## 9. Memory System

### 9.1 — Memory Scopes

```
/memories/
├── repo/                          ← Repository-scoped (persists across sessions in this project)
│   ├── session-handoff.md         ← Cross-session state continuity
│   ├── mistake-patterns.md        ← Anti-repeat database
│   ├── decision-log.md            ← Tracks decisions + outcomes
│   ├── qa-scorecard.md            ← Audit trail of all QA runs
│   ├── project-conventions.md     ← Baselines, stack, dev env
│   ├── index-html-map.md          ← Line ranges for main HTML file
│   ├── main-js-map.md             ← Line ranges for JS modules
│   └── project-notes.md           ← File editing gotchas, audit state
├── session/                       ← Current conversation only (cleared after session)
│   └── progress.md                ← In-progress task checkpoint
└── (user-level files)             ← Persistent across ALL workspaces
    ├── crash-recovery.md          ← Crash recovery protocol
    ├── qa-discipline.md           ← QA discipline rules & failure log
    └── qa-proxy-rule.md           ← Mandatory QA proxy rules
```

### 9.2 — Memory Files Reference

| File | Purpose | When to Update |
|------|---------|---------------|
| `session-handoff.md` | What was happening when last session ended — deferred tasks, known issues, server state | Session start + end |
| `mistake-patterns.md` | Anti-repeat database — scan before EVERY task to avoid known pitfalls | After every mistake, immediately |
| `decision-log.md` | Tracks decisions + outcomes so future sessions can learn | After every non-trivial decision |
| `qa-scorecard.md` | Audit trail of all QA runs — timestamps, pass/fail, hashes | After every QA run |
| `project-conventions.md` | Stack, baselines, dev environment, file locations | When baselines change |
| `index-html-map.md` | Line ranges for sections of the main HTML file — prevents full reads | After structural changes |
| `main-js-map.md` | Line ranges for JS modules | After structural changes |
| `progress.md` (session) | Checkpoint for multi-step tasks — enables crash recovery | Every completed subtask |

### 9.3 — Memory Rules

1. **Memory before search** — always check memory files before running file reads or searches
2. **Update immediately** — don't wait until session end to record mistakes or decisions
3. **Keep entries concise** — bullet points, not essays. Memory is loaded into context automatically
4. **Never re-discover** — if something was learned in a previous session, it should be in memory
5. **Organized by topic** — separate files for separate concerns (qa, decisions, mistakes, conventions)

---

## 10. ML-Inspired Decision Making

### 10.1 — Cost-Benefit Decision Tree

```
Should I read this file?
├── Size < 100 lines? → Read directly (medium cost)
└── Size > 100 lines? → Grep first (low cost)
    ├── Grep answers the question → DONE
    └── Grep insufficient → Read specific line range only

Should I use a subagent?
├── Task complexity > 7/10? → Estimate benefit
│   ├── Multi-file changes? → Subagent (saves time)
│   └── Single focus? → Do inline (saves credits)
└── Complexity ≤ 7? → Always inline (1-2 tool calls)

How to batch edits?
├── Multiple files affected?
│   ├── Independent? → Edit all in parallel
│   └── Dependent? → Edit in sequence
└── Single file → One edit operation
```

### 10.2 — Error Pattern Recognition

Common patterns that lead to failures:

| Pattern | Frequency | Severity | Mitigation |
|---------|-----------|----------|------------|
| Edit without integrity check | HIGH | CRITICAL | Always run guardian before/after |
| Skip syntax validation | MEDIUM | HIGH | Run syntax check immediately after JS edits |
| Read entire large file unnecessarily | MEDIUM | LOW | Use grep or targeted line ranges |
| Sequential edits not batched | HIGH | MEDIUM | Group independent edits into single call |
| Fake QA stamp on "trivial" change | HIGH | CRITICAL | ZERO exemptions. All changes get QA |
| Trusting agent claims without terminal output | HIGH | CRITICAL | Only raw terminal output is truth |

### 10.3 — Bayesian Decision Priors

Based on historical data across sessions:

```
P(QA passes | guardian clean)          = 0.95
P(QA passes | guardian regression)     = 0.10
P(syntax error | syntax check skipped) = 0.60
P(syntax error | syntax check passed)  = 0.02
P(budget overrun | no planning)        = 0.70
P(budget overrun | planned carefully)  = 0.15
```

**Decision Rules:**
- If P(success | current approach) < 0.5 → re-evaluate approach, consider cheaper alternative
- If P(regression | this edit) > 0.3 → run guardian BEFORE and AFTER, consider smaller incremental changes
- If P(budget overrun | current plan) > 0.4 → break task into smaller chunks, find cheaper tool alternatives

### 10.4 — Reinforcement Learning Score

Track agent quality over time:

| Action | Points |
|--------|--------|
| QA passes on first run | +10 |
| No guardian regressions | +10 |
| Task completed under budget | +5 |
| Zero syntax errors after edit | +5 |
| Memory checked before file read | +3 |
| Operations batched successfully | +5 |
| QA fails, needs retry | -10 |
| Guardian detects regression | -15 |
| Syntax error in committed code | -10 |
| Unnecessary file read (grep would have worked) | -3 |
| Sequential calls when batching possible | -5 |
| Task incomplete due to budget overrun | -20 |

---

## 11. Standing Orders

These orders are ALWAYS in effect, for ALL agents, in ALL sessions. They form the constitutional law of the framework.

### 11.1 — Quality Orders

| # | Order | Enforced By |
|---|-------|-------------|
| 1 | Guardian runs on EVERY edit — count markers before+after, revert on regression | Guardian |
| 2 | MANDATORY QA before task completion — 4-phase protocol, 5 specialist board | Proxy QA, KING |
| 3 | NEVER claim "nothing is broken" without proof — terminal output or it didn't happen | BS Cutter |
| 4 | If user reports a bug, REPRODUCE IT FIRST — don't argue, don't guess | All agents |
| 5 | Commit after every batch — never leave large changes uncommitted across restarts | Follow Through |
| 6 | Mistakes go into mistake database IMMEDIATELY — not after being caught | All agents |

### 11.2 — Resource Orders

| # | Order | Enforced By |
|---|-------|-------------|
| 7 | Think first, tool-call second — 30 seconds of free reasoning before spending a credit | Master Orchestrator |
| 8 | Memory before search — check memory files before any file read or search | All agents |
| 9 | Batch everything — multi-edit > sequential edits; chained commands > sequential commands | All agents |
| 10 | No subagents for small tasks — if 1-2 tool calls suffice, do it inline | Master Orchestrator |

### 11.3 — Ethics/Business Orders

| # | Order | Enforced By |
|---|-------|-------------|
| 11 | Donation splits are immutable — no agent may reduce or remove them | KING, Economy |
| 12 | Free-to-play path must always exist — monetization is cosmetic/convenience only | KING, Economy |
| 13 | Act autonomously when user is absent — make reversible decisions, log to memory | All agents |
| 14 | ZERO IDLING — always be shipping. If todo is empty, find work | Follow Through |

### 11.4 — Technical Orders

| # | Order | Enforced By |
|---|-------|-------------|
| 15 | Never use external scripts to edit source files — use proper patch scripts with safe replace | All agents |
| 16 | CRLF line endings in HTML files — all inserted lines need `\r` | Guardian, QA-Code |
| 17 | ES Modules throughout — `import`/`export`, no `require` (except `.cjs` patch scripts) | Backend |
| 18 | Terminal is PowerShell — use `;` not `&&` to chain commands | All agents |

---

## 12. Failure Catalog & Anti-Patterns

### 12.1 — Real Failures (from production use)

These are REAL incidents that happened and are now permanently in the mistake database:

| Date | Failure | Root Cause | Lesson |
|------|---------|-----------|--------|
| 2026-04-04 | Stamped "✅ QA done" WITHOUT running any verification | Rationalized as "single sign flip, no structural change" | There is NO "trivial change" exemption. ALL code edits get QA |
| 2026-04-04 | Stamped "✅ QA done" when server was DOWN | Trusted QA agent reports without verifying raw terminal output | Only raw terminal output is truth. Never trust agent claims |
| 2026-04-05 | Screen freeze — loot collection crash | `ld.type.value` called on string type; try/catch caught exception but render call at bottom never reached | Always test type assumptions. `try/catch` can hide the real error |
| 2026-04-05 | GPU memory leak | `new THREE.LineBasicMaterial()` created every frame — never disposed | Never allocate in game loops. Reuse objects. Dispose on cleanup |
| 2026-04-07 | Headless QA tool was DESIGNED to hide 404 errors | Console 404s redirected to logs[] not errors[]; request failures skipped for common extensions; no HTTP listener | QA tools themselves must be audited. A QA tool that hides failures is worse than no QA |

### 12.2 — Anti-Pattern Database

| Anti-Pattern | What Happens | Prevention |
|-------------|-------------|-----------|
| "Trivial change" exemption | Bugs ship because "it was just one line" | ZERO exemptions. All changes get full QA |
| Trusting agent self-reports | Agent says "I checked, it's fine" — it isn't | Only terminal output is truth |
| Accumulating uncommitted work | Crash = losing hours of work | Commit after every logical batch |
| Re-reading files already in context | Burning credits for known information | Check session notes before reading |
| Sequential edits when batching possible | 3x the cost for the same result | Use multi-edit tools |
| Fixing forward instead of reverting | Cascading breakage from building on a broken foundation | Revert on regression, then fix properly |
| Over-engineering "while we're here" | Scope creep, budget blowout, new bugs | Make exactly the change that was asked for |
| Allocating in game loops | Memory leaks, GC pauses, crashes | Pre-allocate everything. Reuse objects. Pool |
| QA tools that suppress errors | False confidence, broken builds ship | Audit QA tools. Dedicated error arrays. Exit code 1 on ANY failure |

---

## 13. Implementation Guide

### 13.1 — Setting Up For a New Project

#### Step 1: Create the hierarchy file
Define your agents with clear priority levels. Every project needs at minimum:

```
P-∞  Supreme ruler (enforces all rules)
P-2  Honesty enforcer (catches lies)
P-1  Code integrity watchdog (prevents regressions)
P-1  QA executor (runs automated quality checks)
P0   Orchestrator (coordinates everything)
P0   Delivery enforcer (catches dropped tasks)
```

#### Step 2: Create agent definition files
Each agent gets a `.agent.md` file with:
- YAML frontmatter: name, description, tools, priority, model
- Markdown body: role, responsibilities, activation triggers, workflow, constraints, output format

```yaml
---
description: "One-line description of what this agent does"
name: "Agent Name"
tools: [read, search, edit, execute]  # Allowed tools
user-invocable: true                   # Can the user call this directly?
model: ["preferred-model"]
---

# Agent Name — Role Title (Priority)

## Responsibilities
- What this agent does

## Activation Triggers  
- When this agent is invoked

## Workflow
- Step-by-step process

## Constraints
- What this agent must NEVER do
```

#### Step 3: Create the QA Board
Adapt the 5-specialist structure to your project:

| Your Project Type | Visual QA | Code QA | Runtime QA | API QA | UX QA |
|-------------------|-----------|---------|------------|--------|-------|
| Web app | Screenshots | Lint + types | Console errors | HTTP responses | DOM elements |
| Mobile app | Screenshots | Lint + types | Crash logs | API responses | UI tree |
| API service | N/A | Lint + types | Runtime errors | Endpoint tests | N/A |
| Game | Screenshots + renders | Lint + markers | WebGL + FPS | Server health | Interaction flow |
| CLI tool | N/A | Lint + types | Exit codes | N/A | Help text |

#### Step 4: Create memory files
```
/memories/repo/
├── session-handoff.md         # Cross-session state
├── mistake-patterns.md        # Error database
├── decision-log.md            # Decision history
├── qa-scorecard.md            # QA audit trail
├── project-conventions.md     # Stack, baselines
└── [project]-map.md           # Source file line maps
```

#### Step 5: Create the copilot-instructions.md
The master config file that ties everything together. Include:
- Project overview and stack
- Build & test commands
- Agent hierarchy table
- Standing orders
- QA protocol (all phases)
- Credit management rules
- File editing rules
- Memory file references

### 13.2 — Agent Definition Best Practices

| Practice | Why |
|----------|-----|
| Keep descriptions searchable | AI uses description to decide which agent to invoke |
| List specific tools | Prevents agents from using tools outside their scope |
| Include activation triggers | Clear conditions for when the agent should be called |
| Define constraints explicitly | What the agent must NEVER do (as important as what it must do) |
| Include output format | Structured output ensures consistent, parseable results |
| Reference specific files | Agents need to know WHERE things are, not just WHAT to do |

### 13.3 — Adapting to Different Project Types

#### For Web Applications
- Replace 3D/WebGL specialists with component/state management agents
- QA-Visual checks screenshots of key pages
- QA-Runtime checks console errors and React/Vue/Angular warnings
- QA-API tests all REST/GraphQL endpoints

#### For Mobile Applications
- Add platform agents (iOS, Android)
- QA-Visual checks device screenshots
- QA-Runtime checks crash reports and ANRs
- Add accessibility testing specialist

#### For Backend/API Services
- Remove visual/UI agents
- Emphasize QA-API and QA-Runtime
- Add load testing specialist
- Add database migration specialist

#### For Games (any engine)
- Map specialist agents to your engine (Unity, Unreal, Godot, Three.js)
- QA-Runtime checks frame rate and memory
- Add asset pipeline agent for your media types
- Add game designer agent for balance

---

## 14. Customization

### 14.1 — Adding New Agents

1. Create `agent-name.agent.md` in your agents directory
2. Add to hierarchy with appropriate priority level
3. Reference in orchestrator's delegation protocol
4. Add to supreme ruler's subordinate list
5. Update copilot-instructions.md agent hierarchy table

### 14.2 — Customizing Standing Orders

Standing orders are project-specific. Common categories:

| Category | Example Orders |
|----------|---------------|
| Quality | QA must pass, guardian must run, tests must pass |
| Ethics | Donation splits, accessibility, privacy |
| Business | Free-to-play paths, pricing limits, content policies |
| Technical | Line endings, module system, naming conventions |
| Process | Commit frequency, branch strategy, review requirements |

### 14.3 — Customizing QA Severity

Not all checks need to be blockers. Configure by severity:

```
BLOCKER:  Build won't ship if this fails (syntax errors, missing DOM, server crash)
CRITICAL: Must fix before next QA run (visual regression, performance drop)
WARNING:  Should fix soon (deprecation, minor UI glitch)
INFO:     Nice to know (code style, optimization opportunity)
```

### 14.4 — Scaling the Framework

| Team Size | Recommendation |
|-----------|---------------|
| Solo developer | Full framework with autonomous agents |
| Small team (2-5) | Shared memory files, per-developer session memory |
| Larger team | CI/CD integration, shared QA board, centralized mistake database |

---

## Appendix A — Quick Reference Card

### Session Lifecycle
```
BOOT:     Read memory → Check environment → Plan tasks
WORK:     Checkpoint → Edit → Guardian → QA → Commit → Repeat
SHUTDOWN: Update memory → Commit → Log state
CRASH:    Read progress → Verify files → Resume from last checkpoint
```

### QA One-Liner
```
guardian_check; syntax_check; server_start; qa_board_run; stamp_result
```

### Agent Invocation
```
@king         — Override anything, enforce rules
@bs-cutter    — Audit honesty, verify QA claims
@guardian     — Check code integrity before/after edits
@proxy-qa     — Run full QA board
@orchestrator — Coordinate complex multi-step tasks
@follow-through — Audit delivery, catch dropped tasks
@[specialist] — Domain-specific work
```

### Cost Awareness
```
FREE:  Think → Plan → Reason → Read memory
$:     Grep → Small reads
$$:    Edit → Terminal commands
$$$:   Subagent launches
$$$$:  Full file reads → Semantic search
```

---

## Appendix B — Template Files

### Minimal copilot-instructions.md Template

```markdown
# Copilot Instructions — [Project Name]

## Overview
[One paragraph: what the project is, what stack it uses]

## Build & Test
[Commands to build, test, and run the project]

## Agent Hierarchy
| Priority | Agent | Role |
|----------|-------|------|
| P-∞ | king | Supreme ruler |
| P-2 | bs-cutter | Honesty enforcer |
| P-1 | guardian | Code integrity |
| P-1 | proxy-qa | QA executor |
| P0 | orchestrator | Task coordinator |
| P0 | follow-through | Delivery enforcer |

## Standing Orders
1. QA on every edit
2. Guardian before+after every code change
3. Never lie about QA
4. Commit after every batch
5. [Project-specific immutable rules]

## QA Protocol
[4-phase protocol adapted to your project]

## Resource Management
[Credit-saver rules, cost tiers, budget thresholds]
```

### Minimal Agent File Template

```markdown
---
description: "[searchable one-line description]"
name: "[Agent Name]"
tools: [read, search, edit, execute]
user-invocable: true
---

# [Agent Name] — [Role] ([Priority])

## Responsibilities
- [What this agent does]

## Activation Triggers
- [When to invoke]

## Workflow
1. [Step-by-step process]

## Constraints
- DO NOT [what this agent must never do]

## Output Format
[Structured output template]
```

---

*EDEN Framework v1.0 — Born from building Old Eden, a blockchain space MMO. Every rule exists because something went wrong without it.*
