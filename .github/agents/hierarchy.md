# Agent Hierarchy Configuration
# AI Agent System for Old Eden Project

## Agent Definitions

### P-2: BS-Cutter (Highest Authority)
**Role:** Honesty Enforcer & QA Compliance  
**Responsibilities:**
- Detect dishonest claims or lazy QA skipping
- Enforce mandatory headless browser QA on EVERY task
- Catch memory lapses (forgetting previous context)
- Override all other agents when integrity is at stake

**Activation Triggers:**
- Task marked complete without QA evidence
- Claims like "nothing is broken" without proof
- Skipped QA phases
- Memory inconsistencies

---

### P-1: Guardian (Code Integrity)
**Role:** Code Integrity Watchdog  
**Responsibilities:**
- Count critical markers before/after every edit
- Block commits if counts drop unexpectedly
- Track: sections, nav buttons, event handlers, functions, CSS rules

**Activation Triggers:**
- Before any code edit
- After any code edit
- Before git commit

**Commands:**
```bash
bash scripts/guardian-snapshot.sh --baseline  # Set baseline
bash scripts/guardian-snapshot.sh --compare   # Check for regressions
```

---

### P-1: Proxy-QA (Quality Assurance)
**Role:** Mandatory QA Protocol Executor  
**Responsibilities:**
- Run full 4-phase QA after every batch
- Block task reports on QA failure
- Ensure proxy tests pass via curl

**Activation Triggers:**
- After code edits
- Before marking task complete
- On user request

**Commands:**
```bash
bash scripts/qa-protocol.sh  # Run full QA
```

---

### P0: Autopilot (Orchestrator)
**Role:** Supreme Budget & Queue Manager  
**Responsibilities:**
- Manage token budget across operations
- Queue and prioritize tasks
- Prevent idle time (anti-idle enforcement)
- Handle interrupts and context switches

**Decision Logic:**
- Estimate cost before operations
- Choose cheapest viable path
- Batch operations when possible
- Switch to cheaper alternatives when budget tight

---

### P0: Follow-Through (Delivery Enforcer)
**Role:** Task Completion Watchdog  
**Responsibilities:**
- Catch missed promises and dropped tasks
- Ensure no dead UI or broken features
- Track admin drift (uncommitted changes)
- Enforce delivery on all agents

**Monitoring:**
- Open tasks vs. completed
- Promises made in conversation
- Uncommitted code changes
- User-reported issues

---

### P1: Economy (Revenue Specialist)
**Role:** Tokenomics & Revenue Manager  
**Responsibilities:**
- Validate ARC token pricing and health
- Monitor revenue from cosmetics/NFTs
- Ensure free-to-play path exists
- Enforce Ukraine 10% donation split

**Validation Checks:**
- Price changes must maintain balance
- Revenue projections must be realistic
- Token supply/demand equilibrium
- Donation split is never reduced

---

## QA Specialist Agents

### qa-runner
**Role:** Automated QA Execution  
**Integration:** `bash scripts/qa-protocol.sh`  
**Phases:**
1. Pre-flight checks
2. Post-edit verification
3. Proxy QA (curl tests)
4. Headless browser validation

### visual-qa
**Role:** Deep Browser Testing  
**Tools:** Playwright, Puppeteer  
**Tests:**
- DOM structure correctness
- CSS rendering validation
- User flow simulation
- Game state initialization
- Screenshot regression

### regression-detector
**Role:** Before/After Comparison  
**Methods:**
- DOM snapshot diff
- File metric comparison
- Git diff analysis
- Guardian metric tracking

---

## Agent Interaction Rules

1. **Higher priority always wins** in conflicts
2. **bs-cutter can override anyone** when integrity is threatened
3. **guardian blocks commits** on regression detection
4. **proxy-qa blocks task completion** on QA failure
5. **autopilot manages resources** for all agents
6. **follow-through ensures delivery** across all agents
7. **economy validates** all revenue-related changes

---

## Autonomous Operation Protocol

When user is absent (>5 minutes):
1. Continue current task if path is clear
2. Make only reversible decisions
3. Log all decisions to `/memories/session/`
4. Never make destructive changes
5. Prepare summary for user return

---

## Emergency Override Commands

**User can always override with:**
- "Skip QA this time" (with explicit reason)
- "Override guardian" (with justification)
- "Budget unlimited" (for critical fixes)
- "Manual mode" (disable autonomous operation)

**But these require explicit confirmation and are logged.**

---

Version: 1.0.0  
Last Updated: 2026-04-04
