/**
 * Audit 57 — Patch Script
 * Fixes: chatInput ReferenceError, enemy bolt hitbox displacement (2 locations),
 *        RebirthSystem double NPC promotion, mobile fire interval leak,
 *        autopilot not reset on exit
 */
const fs = require('fs');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let applied = 0;
let failed = 0;

function safeReplace(file, oldStr, newStr, label) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes(oldStr)) {
    console.log(`[FAIL] ${label} — pattern not found`);
    failed++;
    return;
  }
  const count = content.split(oldStr).length - 1;
  if (count > 1) {
    console.log(`[WARN] ${label} — ${count} matches, replacing first only`);
  }
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[OK]   ${label}`);
  applied++;
}

// ═══════════════════════════════════════════════════════════════════
//  FIX 1: CRITICAL — chatInput ReferenceError on T key press
//  Replace `chatInput.focus()` with `_cachedChatInput.focus()`
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`      setTimeout(() => chatInput.focus(), 100);`),
  cr(`      setTimeout(() => { if (_cachedChatInput) _cachedChatInput.focus(); }, 100);`),
  'Fix 1: chatInput -> _cachedChatInput ReferenceError'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 2: HIGH — Enemy bolt hitbox starts at world origin
//  Set group.position to enemy position, bolt child at local (0,0,0)
//  Location: updateCombatSession enemy shooting (sentinel/boss bolts)
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`        const boltObj = getBoltFromPool();\n        boltObj.bolt.position.copy(e.group.position);\n        boltObj.bolt.quaternion.setFromUnitVectors(_upVec, _tmpV3b);\n        boltObj.trail.position.copy(boltObj.bolt.position); boltObj.trail.quaternion.copy(boltObj.bolt.quaternion);\n        boltObj.group.position.set(0,0,0); boltObj.group.rotation.set(0,0,0);\n        scene.add(boltObj.group);\n        c.enemyBolts.push({ group: boltObj.group, dir: _tmpV3b.clone(), speed: 120, age: 0, life: 4000, _poolRef: boltObj });`),
  cr(`        const boltObj = getBoltFromPool();\n        boltObj.group.position.copy(e.group.position); boltObj.group.rotation.set(0,0,0);\n        boltObj.bolt.position.set(0,0,0);\n        boltObj.bolt.quaternion.setFromUnitVectors(_upVec, _tmpV3b);\n        boltObj.trail.position.set(0,0,0); boltObj.trail.quaternion.copy(boltObj.bolt.quaternion);\n        scene.add(boltObj.group);\n        c.enemyBolts.push({ group: boltObj.group, dir: _tmpV3b.clone(), speed: 120, age: 0, life: 4000, _poolRef: boltObj });`),
  'Fix 2: enemy bolt hitbox — group at enemy pos, children at local origin'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 3: HIGH — NPC bolt hitbox same displacement issue
//  Location: updateNPCShips hostile NPC shooting
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`        const boltObj = getBoltFromPool();\n        boltObj.bolt.position.copy(npc.group.position);\n        boltObj.bolt.quaternion.setFromUnitVectors(_upVec, _tmpV3b);\n        boltObj.trail.position.copy(boltObj.bolt.position); boltObj.trail.quaternion.copy(boltObj.bolt.quaternion);\n        boltObj.group.position.set(0,0,0); boltObj.group.rotation.set(0,0,0);\n        scene.add(boltObj.group);\n        c.enemyBolts.push({ group: boltObj.group, dir: _tmpV3b.clone(), speed: 100, age: 0, life: 5000, _poolRef: boltObj });`),
  cr(`        const boltObj = getBoltFromPool();\n        boltObj.group.position.copy(npc.group.position); boltObj.group.rotation.set(0,0,0);\n        boltObj.bolt.position.set(0,0,0);\n        boltObj.bolt.quaternion.setFromUnitVectors(_upVec, _tmpV3b);\n        boltObj.trail.position.set(0,0,0); boltObj.trail.quaternion.copy(boltObj.bolt.quaternion);\n        scene.add(boltObj.group);\n        c.enemyBolts.push({ group: boltObj.group, dir: _tmpV3b.clone(), speed: 100, age: 0, life: 5000, _poolRef: boltObj });`),
  'Fix 3: NPC bolt hitbox — group at NPC pos, children at local origin'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 4: HIGH — RebirthSystem double NPC promotion
//  Remove promoteToNPC from _onPlayerDeath — let chooseDeathPath handle it
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'src/systems/RebirthSystem.js',
  cr(`    // Promote old character to permanent NPC\n    const npcSystem = this._engine.getSystem('npc');\n    npcSystem.promoteToNPC(characterId, { causeOfDeath, sectorId });\n\n    // Emit ready-for-rebirth event — server will orchestrate the client UX`),
  cr(`    // Note: NPC promotion is handled by chooseDeathPath() per-path, not here.\n    // (SOUL_FRACTURE path does NOT promote to NPC; STANDARD/ASCENSION do.)\n\n    // Emit ready-for-rebirth event — server will orchestrate the client UX`),
  'Fix 4: remove duplicate promoteToNPC from _onPlayerDeath'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 5: MEDIUM — Mobile fire interval leak on rapid touch
//  Clear old interval before creating new one
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`  fireBtn.addEventListener('touchstart', (e) => {\n    e.preventDefault();\n    if (c.active) { state.activeWeapon === 'laser' ? fireLaser() : fireRailgun(); }\n    fireInterval = setInterval`),
  cr(`  fireBtn.addEventListener('touchstart', (e) => {\n    e.preventDefault();\n    clearInterval(fireInterval); // Prevent leak on rapid touch\n    if (c.active) { state.activeWeapon === 'laser' ? fireLaser() : fireRailgun(); }\n    fireInterval = setInterval`),
  'Fix 5: clear fireInterval before creating new one'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 6: MEDIUM — Autopilot not reset in exitGunnerMode
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`  stopMining();\n  state.mining.active = false;\n  c.bossActive = false;`),
  cr(`  stopMining();\n  state.mining.active = false;\n  c.bossActive = false;\n  autopilotActive = false; autopilotTarget = null;`),
  'Fix 6: reset autopilot on gunner exit'
);

console.log(`\n=== Audit 57 Patch Complete ===`);
console.log(`Applied: ${applied} | Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
