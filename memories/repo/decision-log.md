# Decision Log — Old Eden

## Format: Date | Decision | Alternatives | Why | Outcome

---

### 2026-04-05 | Fix loot string types inline vs refactor to objects
- **Decision:** Fix collection loop to use string comparison instead of reverting loot types to objects
- **Alternatives:** (a) Revert loot to object types, (b) Fix all consumers to use strings
- **Why:** String types are simpler, less memory, already used by dropLootFromEnemy/spawnSystemLoot
- **Outcome:** Fixed. Gunner freeze resolved. QA 5/5 PASS.

### 2026-04-05 | Merge duplicate loot loops vs remove one
- **Decision:** Keep both loops — first for visual-only (rotate/glow), second for collection logic
- **Alternatives:** (a) Merge into single loop, (b) Remove first entirely
- **Why:** Separation of concerns — visual loop runs every frame cheaply, collection loop does heavier logic
- **Outcome:** Clean separation. No more double-reward bug.

### 2026-04-05 | CSP: add cdn.jsdelivr.net to script-src
- **Decision:** Add CDN domain + wasm-unsafe-eval to CSP headers
- **Alternatives:** (a) Self-host Three.js, (b) Remove CSP entirely
- **Why:** CDN is the standard Three.js delivery method; self-hosting adds maintenance burden
- **Outcome:** Three.js loads correctly. QA 5/5 PASS.

### 2026-04-16 | Move frame render outside gameLoop update try/catch
- **Decision:** Always attempt render after the gameplay update block, with separate render error logging
- **Alternatives:** (a) Keep render inside update try/catch, (b) Wrap every subsystem individually
- **Why:** A single update exception should not blank the frame or mimic a hard freeze while the loop keeps running
- **Outcome:** Pending QA