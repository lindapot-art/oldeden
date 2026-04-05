const fs = require('fs');
let f = fs.readFileSync('public/index.html', 'utf8');

// 10a: Star map animation loop
const old10a = "if (name === 'starmap') { resizeStarMap(); renderStarMap(); }";
const rep10a = "if (name === 'starmap') { resizeStarMap(); starMapAnimLoop(); }";
if (f.includes(old10a)) { f = f.replace(old10a, rep10a); console.log('PATCH10a APPLIED'); }
else console.log('PATCH10a FAILED');

// 10b: Add starMapAnimLoop function + resize handler after renderStarMap closing
const old10b = "  // Legend\r\n  renderMapLegend();\r\n}\r\n\r\nfunction renderMapLegend() {";
const rep10b = "  // Legend\r\n  renderMapLegend();\r\n}\r\n\r\nfunction starMapAnimLoop() {\r\n  if (state.screen !== 'starmap') return;\r\n  renderStarMap();\r\n  requestAnimationFrame(starMapAnimLoop);\r\n}\r\nwindow.addEventListener('resize', () => { if (state.screen === 'starmap') resizeStarMap(); });\r\n\r\nfunction renderMapLegend() {";
if (f.includes(old10b)) { f = f.replace(old10b, rep10b); console.log('PATCH10b APPLIED'); }
else console.log('PATCH10b FAILED');

// 10c: Add cinematic death sequence function before GAME LOOP
const old10c = "// ================================================================\r\n//  GAME LOOP\r\n// ================================================================\r\nconst clock = new THREE.Clock();";
const deathFunc = "// ================================================================\r\n//  CINEMATIC DEATH SEQUENCE\r\n// ================================================================\r\nlet _deathSequenceActive = false;\r\nfunction playerDeathSequence(cause) {\r\n  if (_deathSequenceActive) return;\r\n  _deathSequenceActive = true;\r\n  c.dead = true;\r\n  c.deathStats = { kills: c.kills, score: c.score, streak: c.bestStreak, credits: state.player.credits };\r\n  const frag = createSoulFragment();\r\n  addComms('AI Director', `Ship destroyed! Soul Fragment ${frag.id} created (Power: ${frag.powerLevel})`);\r\n  addDeathFeedEvent('death', `${state.player.name} ${cause} in ${state.starSystems[state.location.systemIndex]?.name || 'Unknown'}`);\r\n  if (state.socket) state.socket.emit('death:report', { name: state.player.name, cause, kills: c.kills, score: c.score });\r\n  state._deathTimeDilation = 0.2;\r\n  AudioSFX.play('player_death');\r\n  spawnExplosion(ship.position.clone(), 4);\r\n  let pullback = 0;\r\n  const pullInterval = setInterval(() => { pullback = Math.min(pullback + 0.5, 20); }, 16);\r\n  state._deathPullback = { active: true, getValue: () => pullback };\r\n  setTimeout(() => {\r\n    clearInterval(pullInterval);\r\n    state._deathTimeDilation = 1;\r\n    state._deathPullback = null;\r\n    _deathSequenceActive = false;\r\n    c.dead = false;\r\n    exitGunnerMode(true);\r\n    showEulogy(c.deathStats, cause);\r\n  }, 3000);\r\n}\r\n\r\n";
const rep10c = deathFunc + old10c;
if (f.includes(old10c)) { f = f.replace(old10c, rep10c); console.log('PATCH10c APPLIED'); }
else console.log('PATCH10c FAILED');

// 10d: Time dilation + camera pullback in game loop
const old10d = "  const dt = Math.min(clock.getDelta(), 0.1);\r\n  const dtMs = dt * 1000;\r\n  state.gameTime += dtMs;\r\n\r\n  // Camera — always positioned at turret mount\r\n  turretMount.getWorldPosition(_tmpV3a);\r\n  camera.position.copy(_tmpV3a);";
const rep10d = "  const rawDt = Math.min(clock.getDelta(), 0.1);\r\n  const dt = rawDt * (state._deathTimeDilation || 1);\r\n  const dtMs = dt * 1000;\r\n  state.gameTime += dtMs;\r\n\r\n  // Camera — always positioned at turret mount\r\n  turretMount.getWorldPosition(_tmpV3a);\r\n  camera.position.copy(_tmpV3a);\r\n  // Death camera pullback\r\n  if (state._deathPullback && state._deathPullback.active) {\r\n    const pb = state._deathPullback.getValue();\r\n    const backDir = new THREE.Vector3(0, 0.3, 1).applyQuaternion(camera.quaternion).normalize();\r\n    camera.position.addScaledVector(backDir, pb);\r\n  }";
if (f.includes(old10d)) { f = f.replace(old10d, rep10d); console.log('PATCH10d APPLIED'); }
else console.log('PATCH10d FAILED');

// 10e: Replace first death handler (ram death) with playerDeathSequence call
const old10e = "        if (state.ship.hull <= 0 && !c.dead) {\r\n          c.dead = true;\r\n          c.deathStats = { kills: c.kills, score: c.score, streak: c.bestStreak, credits: state.player.credits };\r\n          const frag = createSoulFragment();\r\n          addComms('AI Director', `Ship destroyed! Soul Fragment ${frag.id} created (Power: ${frag.powerLevel})`);\r\n          AudioSFX.play('explode');\r\n          spawnExplosion(ship.position.clone(), 3);\r\n          // Update soul memory based on death cause\r\n          state.soulMemory.combatInstinct = Math.min(10, state.soulMemory.combatInstinct + (c.kills * 0.02));\r\n          // Broadcast death to ticker\r\n          addDeathFeedEvent('death', `${state.player.name} destroyed by ${e.type} in ${state.starSystems[state.location.systemIndex]?.name || 'Unknown'}`);\r\n          if (state.socket) state.socket.emit('death:report', { name: state.player.name, cause: 'Rammed by ' + e.type, kills: c.kills, score: c.score });\r\n          setTimeout(() => { c.dead = false; exitGunnerMode(true); showEulogy(c.deathStats, 'Rammed by hostile ' + e.type); }, 2500);\r\n        }";
const rep10e = "        if (state.ship.hull <= 0 && !c.dead) {\r\n          state.soulMemory.combatInstinct = Math.min(10, state.soulMemory.combatInstinct + (c.kills * 0.02));\r\n          playerDeathSequence('Rammed by hostile ' + e.type);\r\n        }";
if (f.includes(old10e)) { f = f.replace(old10e, rep10e); console.log('PATCH10e APPLIED'); }
else console.log('PATCH10e FAILED');

// 10f: Replace second death handler (bolt death) with playerDeathSequence call
const old10f = "        if (!c.godMode && state.ship.hull <= 0 && !c.dead) {\r\n          c.dead = true;\r\n          c.deathStats = { kills: c.kills, score: c.score, streak: c.bestStreak, credits: state.player.credits };\r\n          const frag = createSoulFragment();\r\n          addComms('AI Director', `Ship destroyed! Soul Fragment ${frag.id} created (Power: ${frag.powerLevel})`);\r\n          AudioSFX.play('explode'); spawnExplosion(ship.position.clone(), 3);\r\n          // Update soul memory\r\n          state.soulMemory.shieldMemory = Math.min(10, state.soulMemory.shieldMemory + 0.5);\r\n          addDeathFeedEvent('death', `${state.player.name} destroyed by enemy fire in ${state.starSystems[state.location.systemIndex]?.name || 'Unknown'}`);\r\n          if (state.socket) state.socket.emit('death:report', { name: state.player.name, cause: 'Enemy bolt fire', kills: c.kills, score: c.score });\r\n          setTimeout(() => { c.dead = false; exitGunnerMode(true); showEulogy(c.deathStats, 'Destroyed by enemy weapons fire'); }, 2500);\r\n        }";
const rep10f = "        if (!c.godMode && state.ship.hull <= 0 && !c.dead) {\r\n          state.soulMemory.shieldMemory = Math.min(10, state.soulMemory.shieldMemory + 0.5);\r\n          playerDeathSequence('Destroyed by enemy weapons fire');\r\n        }";
if (f.includes(old10f)) { f = f.replace(old10f, rep10f); console.log('PATCH10f APPLIED'); }
else console.log('PATCH10f FAILED');

fs.writeFileSync('public/index.html', f);
