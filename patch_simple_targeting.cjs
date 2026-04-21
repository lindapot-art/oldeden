// Simple Targeting Enhancement - Old Eden Space MMO
// Direct implementation without complex pattern matching

const fs = require('fs');

function cr(str) {
  return str.replace(/\n/g, '\r\n');
}

console.log('🎯 Adding simple targeting enhancements...');

const htmlPath = 'd:\\antiruscist\\oldeden\\public\\index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add targeting control keys after the weapon keys
const weaponKeysEnd = `  else if (key === 'm') { fireMissile(); }
  // Consumables
  else if (key === 'r') { window._activateConsumable('Repair Kit'); }`;

const enhancedWeaponKeys = `  else if (key === 'm') { fireMissile(); }
  // Targeting Controls
  else if (key === 't') { manualTargetEnemy(); }
  else if (key === 'g') { clearTargetLock(); }
  else if (key === 'y') { toggleAutoTargeting(); }
  // Consumables
  else if (key === 'r') { window._activateConsumable('Repair Kit'); }`;

// Only replace if not already done
if (!content.includes('manualTargetEnemy()')) {
  content = content.replace(weaponKeysEnd, enhancedWeaponKeys);
  console.log('✅ Added targeting control keys');
}

// 2. Add targeting functions before the gameLoop function
const gameLoopStart = `function gameLoop() {
  requestAnimationFrame(gameLoop);`;

const targetingFunctions = cr(`// ── Simple Targeting Functions ──
function findNearestEnemy() {
  let nearest = null;
  let nearestDist = Infinity;
  c.enemies.forEach(e => {
    if (e.hp <= 0) return;
    const dist = ship.position.distanceTo(e.group.position);
    if (dist < nearestDist && dist < 120) {
      nearestDist = dist;
      nearest = e;
    }
  });
  return nearest;
}

function manualTargetEnemy() {
  const nearest = findNearestEnemy();
  if (nearest) {
    c.targetLock.target = nearest;
    c.targetLock.lockTimer = 0;
    c.targetLock.locked = false;
    addCombatLog('Target acquired: ' + (nearest.type || 'Enemy'), '#44aaff');
    try { AudioSFX.play('target_lock'); } catch(e) {}
  } else {
    addCombatLog('No targets in range', '#888888');
  }
}

function clearTargetLock() {
  c.targetLock.target = null;
  c.targetLock.lockTimer = 0;
  c.targetLock.locked = false;
  addCombatLog('Target cleared', '#888888');
}

function toggleAutoTargeting() {
  if (!c.targetLock.autoMode) c.targetLock.autoMode = true;
  else c.targetLock.autoMode = false;
  addCombatLog('Auto-targeting: ' + (c.targetLock.autoMode ? 'ON' : 'OFF'), c.targetLock.autoMode ? '#44ff44' : '#ff4444');
}

function updateTargetingSystem(dtMs) {
  // Auto-targeting
  if (c.targetLock.autoMode) {
    if (!c.targetLock.target || c.targetLock.target.hp <= 0) {
      c.targetLock.target = findNearestEnemy();
      c.targetLock.lockTimer = 0;
      c.targetLock.locked = false;
    }
  }
  
  // Update lock timer
  if (c.targetLock.target && c.targetLock.target.hp > 0) {
    c.targetLock.lockTimer = Math.min(c.targetLock.lockTimer + dtMs, 2000);
    if (c.targetLock.lockTimer >= 2000) c.targetLock.locked = true;
  }
}

function gameLoop() {
  requestAnimationFrame(gameLoop);`);

// Only add if not already present
if (!content.includes('function findNearestEnemy()')) {
  content = content.replace(gameLoopStart, targetingFunctions);
  console.log('✅ Added targeting functions');
}

// 3. Add targeting update to main loop (look for a good spot in the loop)
// Find the update systems section and add targeting update
const enemyUpdateSection = `    // Update enemies
    c.enemies.forEach((e, i) => {`;

const enhancedEnemyUpdate = `    // Update targeting system
    if (c.active) updateTargetingSystem(dtMs);

    // Update enemies
    c.enemies.forEach((e, i) => {`;

// Only add if not already present
if (!content.includes('updateTargetingSystem(dtMs)')) {
  content = content.replace(enemyUpdateSection, enhancedEnemyUpdate);
  console.log('✅ Added targeting system update to game loop');
}

// Write the file
fs.writeFileSync(htmlPath, content);

console.log('✅ Simple targeting enhancements applied successfully!');
console.log('📊 Features added:');
console.log('   • T key - Manual target lock on nearest enemy');
console.log('   • G key - Clear current target');
console.log('   • Y key - Toggle auto-targeting mode');
console.log('   • Auto-targeting finds new targets when current dies');
console.log('   • 2-second lock timer for target acquisition');