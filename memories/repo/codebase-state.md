# Old Eden — Repo State Notes

## Current Branch
`copilot/vscode-mnjwo8jb-b3zd`

## Commit History (this session)
- `b385e38` — cleanup: remove temp patch scripts
- `abf41b5` — fix: 7 critical+high bugs (ENEMY_CONFIGS, _getCachedMaterial, mobile fire, warp style, HUD hull ref, panel classList, stray code, death audio)
- `fca12c0` — polish: 10 visual+audio (parallax starfield, shield shimmer, impact sparks, screen transitions, muzzle flash, hull_hit/dock/warp_arrive SFX, loot sounds, fuel warning, UI sounds)
- `79f80e5` — feel: 8 gameplay (enemy health bars, death ticker in gunner, damage numbers, camera shake 4x, loot glow+pulse, boss fanfare, wave pacing, hull flash)
- `e2180d1` — cleanup: remove temp patch scripts

## File Editing
- **NEVER use `replace_string_in_file`** for public/index.html — it corrupts the file (buffer/disk divergence)
- Use `.cjs` scripts with `fs.readFileSync`/`fs.writeFileSync` and line-based editing
- File uses CRLF line endings — all inserted lines need `\r` at end
- Always run brace/paren balance check after every edit

## public/index.html Stats
- ~6314 lines, CRLF
- Contains full game client (HTML/CSS/JS) in one file

## Critical Architecture Note
- `let composer;` MUST be at module scope (alongside renderer, scene, camera)
  NOT inside try{} block — block scoping makes it invisible to gameLoop()
- The balance check regex reports -1 braces (CSS artifact) — use delta comparison

## QA
- QA Board (qa_board.cjs): 5 specialists, all APPROVED on every commit
- Always kill old node processes before restarting server
- Server at port 3000 (`node src/core/index.js`)

## Key Audio Types
fire, hit, explode, charge, shield_hit, jump, boss_warn, quest_complete,
karma_spin, karma_reveal, karma_rare, karma_legendary, shield_break,
kill_confirm, hit_marker, player_death, hull_hit, loot_credits, loot_ammo,
loot_health, loot_fuel, dock, warp_arrive

## AudioSFX Methods
play(type), startAmbience(), startBGM(), stopBGM(), startEngineHum(),
updateEngineAudio(speed, maxSpeed, afterburner), stopEngineHum(),
fuelWarningBeep(), uiClick(), uiHover()
