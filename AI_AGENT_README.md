# AI Agent System - Quick Start Guide

This repository is equipped with an advanced AI agent orchestration system for autonomous project management, quality assurance, and ML-optimized decision making.

## 📚 Core Documentation

- **[AI_AGENT_SYSTEM.md](AI_AGENT_SYSTEM.md)** - Complete system specification
- **[.github/agents/hierarchy.md](.github/agents/hierarchy.md)** - Agent roles and priorities
- **[.github/agents/ml-patterns.md](.github/agents/ml-patterns.md)** - ML decision patterns

## 🚀 Quick Commands

### Guardian (Code Integrity Watchdog)
```bash
# Create baseline snapshot before making changes
npm run guardian:baseline

# Compare current state to baseline (detects regressions)
npm run guardian:compare

# View detailed guardian report
npm run guardian:report
```

### QA Protocol (4-Phase Quality Assurance)
```bash
# Run full QA protocol
npm run qa

# Run guardian + QA together
npm run qa:full
```

## 🤖 Agent Hierarchy

| Priority | Agent | Role |
|----------|-------|------|
| **P-2** | bs-cutter | Honesty enforcer - catches QA skipping |
| **P-1** | guardian | Code integrity watchdog - blocks regressions |
| **P-1** | proxy-qa | Mandatory QA enforcer |
| **P0** | autopilot | Budget & queue manager |
| **P0** | follow-through | Delivery enforcer |
| **P1** | economy | Revenue & tokenomics |

## 🎯 10 Fundamental Rules

1. **Think first, tool-call second** - Planning is free
2. **Memory before search** - Check `/memories/repo/` first
3. **Batch everything** - Combine operations
4. **One QA pass per batch** - Not per change
5. **Grep before read** - Targeted search is cheaper
6. **No subagents for small tasks** - 1-2 tool calls = do inline
7. **Never re-read** - Use session notes
8. **Skip docs unless asked** - Ship code, not markdown
9. **Consolidate commands** - Use `&&` or `;`
10. **Prefer targeted line ranges** - Not full file reads

## 📁 Memory System

```
/memories/
  /repo/              # Persistent repository knowledge
    main-js-map.md    # JS architecture reference
    project-conventions.md  # Coding standards
    guardian-baseline.json  # Code integrity baseline
  
  /session/           # Current session context
    current-task.md   # Active task tracking
    blockers.md       # Dependencies and blockers
```

## 🔍 Guardian Metrics Tracked

- HTML `<section>` tags
- Navigation buttons (`nav-btn`)
- Event listeners (`addEventListener`)
- Exported functions/classes
- CSS rules
- JS file count
- Test file count

## ✅ Mandatory QA Protocol

**PHASE 1: Pre-flight**
- Read memory files
- Create guardian baseline
- Identify files to change

**PHASE 2: Post-edit verification**
- Syntax check all JS files (`node --check`)
- Guardian comparison
- Git diff validation

**PHASE 3: Proxy QA**
- HTTP server tests (curl)
- HTML structure validation
- Asset loading verification

**PHASE 4: Headless browser**
- DOM validation
- Visual regression
- User flow testing

## 🧠 ML Decision Patterns

The system uses ML-inspired patterns for:
- **Cost-benefit analysis** before operations
- **Pattern recognition** from historical data
- **Reinforcement learning** (reward successful strategies)
- **Bayesian decision networks** (probability-based choices)

### Example Decision Tree
```
Should I read this file?
├─ File < 100 lines? → Read directly
└─ File > 100 lines?
   ├─ Grep can answer? → Use grep
   └─ Need full context? → Read with line range
```

## 🚨 Emergency Protocols

### When Guardian Detects Regression
1. **STOP immediately**
2. Revert all changes
3. Analyze root cause
4. Fix and retry

### When QA Fails
1. **DO NOT mark complete**
2. Fix the issue
3. Re-run FULL QA protocol
4. Only complete after ALL phases pass

## 📊 Standing Orders (Immutable)

1. Guardian runs on EVERY edit
2. Autopilot manages budget
3. NEVER use external scripts (sed/awk/Python) to edit source
4. Economy validates all pricing changes
5. Ukraine 10% donation split is immutable
6. Free-to-play path must always exist
7. Act autonomously when user is absent
8. Commit after every batch
9. MANDATORY QA before task completion
10. NEVER claim "nothing is broken" without proof
11. Reproduce bugs FIRST before fixing
12. ZERO IDLING - always be shipping

## 💡 Tips for AI Agents

- **Check memories first** before reading files
- **Batch edits** to same file in one response
- **Use grep** for finding, not reading
- **Run guardian** before and after code changes
- **Always QA** before marking tasks complete
- **Store learnings** in memory for future sessions

## 🔧 Integration Checklist

- [x] Directory structure created
- [x] Guardian script implemented
- [x] QA protocol script implemented
- [x] Agent hierarchy configured
- [x] ML patterns documented
- [x] Memory system initialized
- [x] Package.json scripts added
- [x] Baseline snapshot created

## 📖 Learn More

Read the complete specification in [AI_AGENT_SYSTEM.md](AI_AGENT_SYSTEM.md) for:
- Detailed agent responsibilities
- ML optimization strategies
- Pattern recognition database
- Reinforcement learning rules
- Autonomous operation protocols

---

**Version:** 1.0.0  
**Status:** ✅ Active and Operational  
**Last Updated:** 2026-04-04
