# Mistake Patterns — Old Eden

## Anti-Repeat Database
Scan this file BEFORE every task. If your task matches a pattern below, apply the mitigation.

---

### Pattern 1: Fake QA Stamp
**When:** Agent stamps QA pass without running verification
**Example:** 2026-04-04 pitch-invert change — stamped pass without ANY check
**Mitigation:** NEVER stamp without raw terminal output showing pass. No exceptions for "trivial" changes.

### Pattern 2: Trusting Exit Codes Blindly
**When:** Exit code 1 from `Select-Object -First N` pipe interpreted as server crash
**Example:** 2026-04-07 — all terminal tabs showed exit code 1; server was actually fine on port 3848
**Mitigation:** Always check actual server response, not just exit codes. PowerShell pipes can break node.

### Pattern 3: Object Property Access on Refactored Types
**When:** Old code accesses `.value` / `.name` on something refactored to a plain string
**Example:** 2026-04-05 loot freeze — `ld.type.value` on string `'credits'` crashed every frame
**Mitigation:** After ANY refactor that changes a data type, grep ALL usages of the old access pattern.

### Pattern 4: Per-Frame Object Creation
**When:** `new THREE.*Material()` or `new THREE.*Geometry()` inside gameLoop without caching
**Example:** 2026-04-05 — `new THREE.LineBasicMaterial()` every frame in tractor beam code
**Mitigation:** Search for `new THREE.` inside gameLoop. Materials/geometries MUST be cached outside loop.

### Pattern 5: try/catch Hiding Fatal Errors
**When:** gameLoop try/catch swallows errors; render at bottom of try = frozen screen
**Example:** 2026-04-05 — loot crash caught silently, `composer.render()` never reached
**Mitigation:** If screen freezes but audio plays, check gameLoop try block for exceptions. `requestAnimationFrame` is ABOVE try.

### Pattern 6: Duplicate Function Definitions
**When:** Old and new versions of same function both exist after refactor
**Example:** 2026-04-05 — two `spawnLootDrop` functions (old object-type + new string-type)
**Mitigation:** After adding new version of a function, GREP for old version and remove it.

### Pattern 7: CSP Blocking CDN Imports
**When:** Content Security Policy in HttpServer.js missing CDN domain
**Example:** 2026-04-05 — Three.js from cdn.jsdelivr.net blocked by CSP
**Mitigation:** When adding CDN imports, check `script-src` in HttpServer.js CSP header.

### Pattern 8: replace_string_in_file Corruption
**When:** Using the VS Code replace tool on public/index.html
**Example:** Multiple incidents — buffer/disk divergence corrupts file
**Mitigation:** ALWAYS use .cjs patch scripts with fs.readFileSync/writeFileSync. NEVER use replace_string_in_file on index.html.