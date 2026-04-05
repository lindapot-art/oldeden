# Session Checkpoint — Crash Recovery

**Last Updated:** 2026-04-05
**Status:** ACTIVE

## Current Task Queue (ordered by priority)
1. [x] Fix QA-Code Three.js marker → DONE (ed0d5fa)
2. [x] QA Board 5/5 → DONE (ed0d5fa)
3. [x] Commit Eulogy + Karma Wheel + Factions + Economy → DONE (ed0d5fa)
4. [IN-PROGRESS] Fix game performance bottlenecks (GC pressure from per-frame allocations)
5. [ ] Build Past Lives as NPCs system
6. [ ] Build Character Skills (genome-gated, fast-leveling)
7. [ ] Add economy sinks + aging HUD
8. [ ] QA Board 5/5 + commit

## User's Original Requests (verbatim)
- "Fix the QA-Code marker check and get to 5/5 APPROVED"
- "Continue building out the uncommitted features"
- "Commit what's there and move forward"
- "CRASH RECOVERY MECHANISM SO WE DONT LOOSE DATA AND PROGRESS AND REQUESTS"
- "SET SUBAGENTS TO FIX GAME'S CRASHING DUE TO BOTTLENECKS"

## Design Doc Core Loop (from content.txt)
- Spawn → Combat → Die → Karma Wheel → Spawn as someone new → "holy shit"
- 45-90 min per life (median 60)
- Three hub systems: Rebirth/Karma Wheel, Combat, Economy/Identity
- Past lives as NPCs = the emotional hook
- Character Skills: genome-gated ceilings, fast leveling within a life
- Soul Memory: persists across deaths, subtle bonuses (max 15%)

## Diagnosed Bottlenecks (game crashes)
**Root cause:** ~25 heap allocations per frame inside gameLoop():
- Line 4750: `new THREE.Vector3()` for worldPos
- Line 4768-4769: `new THREE.Vector3()` for thrust directions
- Line 4800-4803: `new THREE.Vector3()`, `new THREE.Matrix4()`, `new THREE.Quaternion()` for ship orientation
- Line 4809: `new THREE.Euler()` for camera
- Line 4936, 4949: `.clone().sub()` for enemy direction
- Line 4954-4959: `new THREE.Mesh()`, `new THREE.Group()` for bolts (not pooled)
- Line 5098-5100: `new THREE.Quaternion()`, `new THREE.Euler()` for idle camera
- spawnExhaust(): creates new geometry + material every call
- updateNPCShips(): `.clone().sub()` per NPC per frame
- updateAutoSystems(): `.clone()` + `.clone().invert()` per frame

**Fix:** Pre-allocate all temp vectors/matrices outside the loop, reuse them. Pool bolt meshes.

## Git State
- Branch: copilot/vscode-mnjwo8jb-b3zd
- Last commit: ed0d5fa (clean working tree)
- All changes committed

## Recovery Instructions
If agent crashes mid-task:
1. Read this file FIRST
2. Check `git diff --stat HEAD` for uncommitted work
3. Check `git log --oneline -3` for last commits
4. Resume from the first unchecked item in "Current Task Queue"
5. Do NOT re-diagnose — the bottleneck list above is complete
