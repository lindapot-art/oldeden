# Session Handoff — Old Eden

## Last Session State (2026-04-16, batch 3)
- **Server:** Running on port 3847
- **Branch:** improvement-qa-fixes, commit c0937e6
- **QA Board:** 5/5 APPROVED x5 consecutive — hash: `d75868863b1834ee`
- **public/index.html:** ~9918 lines, braces 2330/2330 balanced, zero JS errors
- **Game flow verified:** Title → Create → Bridge → all nav screens (Station, Starmap, Character, Market, Interior, Settings) + Enter Space guard working

## Fixes Applied (2026-04-16 batch 3)
1. **LeaderboardSystem null collection crash** — submitScore/getTopScores/getPlayerRank now null-check this.collection (prevents unhandled promise rejection without MongoDB)
2. **Interior/GunRoom WebGL crash** — initInterior() and initGunRoom() wrapped in try-catch so WebGL failures don't break screen navigation

## Fixes Applied (2026-04-16 batch 2)
1. **CRITICAL: Screen system was broken** — all screens visible simultaneously. Added `.screen{display:none}` / `.screen.active{display:flex}` CSS
2. **CRITICAL: showScreen() had state.screen set BEFORE same-screen guard** — screens never switched. Reordered to check first, set after
3. Added nav-bar with 7 navigation buttons + CSS show/hide rules
4. Added action-bar, death-ticker, mobile-controls, dock-overlay, auto-target-btn elements
5. Added faction-grid to create screen (initCreateScreen was crashing on null getElementById)
6. Added pilot-name input to create screen
7. Replaced QA-only karma screen stub with proper screen + buttons
8. Moved leaderboard JS from raw HTML body into script module (was outside any `<script>` tag!)
9. Removed duplicate elements: warp-target-btn x2, drone buttons x2, speed buttons x2
10. Removed orphaned create section floating outside any screen div
11. Fixed btn-launch handler: was `showScreen('bridge')`, now `showScreen('gunner')`
12. Added null check on navBar.classList.toggle

## Previous Fixes (2026-04-16 batch 1)
1. Removed 182-line duplicate `<script type="module">` block inside Captain's Quarters div
2. Restored `<script type="importmap">` (accidentally removed with duplicate)
3. Fixed AudioSFX.init() missing `},` before ensure()
4. Fixed unclosed template literal in system-detail innerHTML
5. Fixed extra `}` in gameLoop
6. Added #title-stars, .title-star CSS, #lock-prompt, #server-status elements
7. Fixed btn-load → btn-continue ID mismatch
8. Created `_on()` safe event binding helper — 20 bare getElementById().addEventListener wrapped

## Known Issues
- Socket.IO polling returns HTTP 400 (expected, needs session)
- Enter Space blocked in headless (no WebGL) — correct guard behavior
- Missing DOM elements handled by _on(): btn-karma-accept/insure/reroll, action-bar, death-ticker, mobile-controls, pilot-name, reroll-cost, skin-panel
- Port 3847 can get held by zombie node processes — kill before restart
- Game loop try/catch swallows errors after 3 logs