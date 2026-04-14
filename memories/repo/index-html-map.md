# index.html Line Map — Old Eden
# public/index.html (~10088 lines, CRLF)
# Last updated: 2026-04-07 (hash: 3011ae16caeb6d89)

## Structure Overview
| Section | Lines | Description |
|---------|-------|-------------|
| HTML head + meta | 1-6 | DOCTYPE, charset, viewport, title |
| CSS (inline style) | 7-598 | All game styles in first style block |
| CSS (second style) | 610+ | Additional styles |
| HTML body / screens | 30-560 | All game screen divs |
| QA unverified banner | 562-563 | Red UNVERIFIED banner |
| importmap | 1230-1234 | Three.js + postprocessing CDN imports |
| Socket.IO script | 1235 | Socket.IO client library |
| Module script start | 1237 | `<script type="module">` — ALL game JS below |
| AudioContext setup | 1253 | Web Audio API initialization |
| Socket.IO connect | 1366 | `io()` connection setup |
| Game state object | 1446 | `const state = { ... }` |
| Loot drops array | 1484 | `lootDrops` declaration |
| Karma wheel anim | 2077 | Karma wheel screen logic |
| requestAnimationFrame | 2123, 2153 | Animation loops |
| connectSocket | 2260 | Socket connection function |
| game:init handler | 2277 | Server init data handler |
| showScreen | 2484 | Screen navigation function |
| threeReady flag | 2492 | Three.js initialization flag |
| keydown handlers | 2616 | Keyboard event setup |
| createCharacter | 2681 | Character creation logic |
| spawnSystemLoot | 3180 | System-level loot spawning |
| requestAnimationFrame | 3010, 3133 | More animation loops |
| let renderer | 4014 | Three.js renderer declaration |
| threeReady = true | 4390 | 3D engine ready flag set |
| dropLootFromEnemy | 4440 | Enemy death loot function |
| spawnLootDrop (pooled) | 4784 | Main loot pool spawn function |
| keysDown object | 4534 | Key state tracking |
| keydown events | 4598 | Key event listeners |
| ENEMY_CONFIGS | 4861 | Enemy type definitions |
| Police/criminal | 4819-5600 | NPC faction logic |
| Space creatures | 7054+ | Creature AI systems |
| Convoy system | 7521+ | Trade convoy logic |
| keyup events | 6885 | Key release handlers |
| gameLoop | 8929 | Main game loop function |
| Loot visual loop | ~9233 | Loot rotation/glow (visual only) |
| Tractor beam | 9357-9362 | Tractor beam rendering |
| Loot magnet | ~9395 | Loot magnet long-range pull |
| Loot collection loop | ~9780 | Loot pickup + rewards |
| composer.render | 9981 | Final Three.js render call |
| threeReady check | 10074 | 3D ready gate |
| Module script end | 10085 | `</script>` |
| HTML end | 10087 | `</html>` |

## Screen IDs (HTML body)
| Screen | Line(s) | Purpose |
|--------|---------|---------|
| #screen-title | 30-32 | Title / main menu |
| #screen-create | 42-43 | Character creation |
| #screen-bridge | 68 | Ship bridge (main gameplay) |
| #screen-settings | 833 | Settings panel |
| #screen-rebirth | 190-191 | Rebirth system |
| #screen-karma | 505-506 | Karma wheel |
| #screen-eulogy | 489-490 | Death/eulogy screen |

## Critical Gameloop Sections (inside gameLoop at L8929)
| Feature | Approx Lines | Notes |
|---------|-------------|-------|
| Flight physics | 8929-9000 | Thrust, rotation, afterburner |
| Weapon charge/fire | 9025-9050 | Bolt spawning |
| Shield regen | ~9080 | Shield recovery |
| Target lock-on | 9100-9145 | Nearest enemy targeting |
| Battle/mining drones | 9165-9230 | Drone AI |
| Loot visual updates | ~9233 | Rotate, glow pulse |
| Explosion particles | 9300-9310 | Particle system |
| Tractor beam visual | 9357-9375 | Line rendering |
| Loot magnet pull | ~9395 | Long-range pull |
| Enemy AI patterns | 9590-9650 | Type-specific behaviors |
| Enemy firing | 9670-9700 | Enemy bolt spawning |
| Enemy bolt hits | 9720-9760 | Collision detection |
| Loot collection | ~9780-9810 | Pickup + rewards |
| Asteroid collision | 9835-9865 | Impact detection |
| composer.render | 9981 | Three.js frame output |