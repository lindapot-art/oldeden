# Session Handoff — Old Eden

## Last Session State (2026-04-07)
- **Branch:** `copilot/vscode-mnjwo8jb-b3zd`
- **HEAD:** `1841ec7` (pushed to origin)
- **Server:** Express on port 3847 (auto-rotates to 3848 if 3847 busy)
- **Git state:** Clean working tree (only untracked: saves/*.json, test_screenshots/)
- **QA Board:** 5/5 APPROVED — hash: `3011ae16caeb6d89`

## Recent Commits
- `1841ec7` — fix: gunner mode freeze + loot collection crashes + GPU memory leak
- `9145405` — Fix game-breaking bugs: syntax error, duplicate spawnLootDrop, CSP, null guard
- `60f068a` — Fix start.bat/start.sh launcher

## Known Issues
- Port 3847 can get held by zombie node processes — kill before restart
- Select-Object -First N pipe breaks node process (exit code 1) — not a real crash
- Game loop try/catch swallows errors after 3 logs, composer.render() at bottom of try — any crash = frozen screen
- Headless QA cannot test gunner mode gameplay (pointer lock, 3D interaction)

## Deferred Tasks
- Real browser test of gunner mode (headless-only QA so far)
- User has GunnerModeIntegration.js open — may be planning gunner mode work

## Environment
- Windows, PowerShell, Node.js v24.14.0
- public/index.html ~10088 lines (CRLF)
- Kill all node: Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
- Start server: node src/core/index.js (background terminal)