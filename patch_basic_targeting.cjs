// SIMPLIFIED ADVANCED TARGETING - Core features only

const fs = require('fs');

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

function safeReplace(content, searchStr, replaceStr, context = '') {
  const searchNormalized = searchStr.replace(/\r?\n/g, '\r\n');
  const replaceNormalized = replaceStr.replace(/\r?\n/g, '\r\n');
  
  if (!content.includes(searchNormalized)) {
    throw new Error(`Pattern not found in ${context}: "${searchStr.substring(0, 50)}..."`);
  }
  
  const newContent = content.replace(searchNormalized, replaceNormalized);
  if (newContent === content) {
    throw new Error(`No changes made in ${context}`);
  }
  
  return newContent;
}

console.log('🎯 Implementing Simplified Advanced Targeting...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add targeting keybindings first
  const keybindPattern = `  else if (key === 'h' || key === 'H') { if (typeof showAchievementsUI === 'function') showAchievementsUI(); }
  // Consumables`;
  
  const targetingKeybinds = cr(`  else if (key === 'h' || key === 'H') { if (typeof showAchievementsUI === 'function') showAchievementsUI(); }
  // ═══ ADVANCED TARGETING CONTROLS ═══
  else if (key === 't' || key === 'T') { findAndTargetNearestEnemy(); }
  else if (key === 'g' || key === 'G') { clearCurrentTarget(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, targetingKeybinds, 'targeting keybindings');
  console.log('✅ Added targeting keybindings (T=next target, G=clear target)');

  // Add basic targeting functions before game loop
  const functionInsertionPoint = html.indexOf('function gameLoop() {');
  
  const basicTargetingFunctions = cr(`
// ═══ BASIC ADVANCED TARGETING FUNCTIONS ═══

function findAndTargetNearestEnemy() {
  if (!c.enemies || c.enemies.length === 0) {
    addComms('TARGETING', 'No enemies detected');
    return;
  }
  
  let nearestEnemy = null;
  let nearestDistance = Infinity;
  
  for (const enemy of c.enemies) {
    if (enemy.hp > 0 && enemy.group && enemy.group.position) {
      const distance = getDistanceToShip(enemy.group.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }
  }
  
  if (nearestEnemy) {
    // Set target lock
    c.targetedEnemy = nearestEnemy;
    c.targetLockTime = performance.now();
    
    // Visual feedback
    c.dmgNumbers.push({
      text: '🎯 TARGET LOCKED',
      px: ship.position.x,
      py: ship.position.y + 8,
      pz: ship.position.z,
      age: 0,
      color: '#ff4400',
      scale: 1.5
    });
    
    addComms('TARGETING', \`Target locked: \${nearestEnemy.type || 'Enemy'} at \${nearestDistance.toFixed(0)}m\`);
    AudioSFX.play('target_lock');
  } else {
    addComms('TARGETING', 'No valid targets in range');
  }
}

function clearCurrentTarget() {
  if (c.targetedEnemy) {
    c.targetedEnemy = null;
    c.targetLockTime = 0;
    
    addComms('TARGETING', 'Target cleared');
    
    c.dmgNumbers.push({
      text: '❌ TARGET CLEARED',
      px: ship.position.x,
      py: ship.position.y + 5,
      pz: ship.position.z,
      age: 0,
      color: '#888888',
      scale: 1.0
    });
  }
}

function getDistanceToShip(position) {
  if (!ship.position || !position) return Infinity;
  
  return Math.sqrt(
    Math.pow(position.x - ship.position.x, 2) +
    Math.pow(position.y - ship.position.y, 2) +
    Math.pow(position.z - ship.position.z, 2)
  );
}

function updateTargetingSystem() {
  // Clear target if enemy is dead
  if (c.targetedEnemy && (c.targetedEnemy.hp <= 0 || !c.targetedEnemy.group)) {
    clearCurrentTarget();
  }
  
  // Auto-target nearby enemies if no target
  if (!c.targetedEnemy && c.enemies && c.enemies.length > 0) {
    const nearbyEnemies = c.enemies.filter(e => 
      e.hp > 0 && e.group && getDistanceToShip(e.group.position) < 150
    );
    
    if (nearbyEnemies.length > 0) {
      // Priority to elites and bosses
      let target = nearbyEnemies.find(e => e._isElite || e.isBoss);
      if (!target) {
        // Sort by distance and pick closest
        nearbyEnemies.sort((a, b) => 
          getDistanceToShip(a.group.position) - getDistanceToShip(b.group.position)
        );
        target = nearbyEnemies[0];
      }
      
      if (target) {
        c.targetedEnemy = target;
        c.targetLockTime = performance.now();
      }
    }
  }
}

`);
  
  html = html.slice(0, functionInsertionPoint) + basicTargetingFunctions + cr('\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added basic targeting functions');

  // Add targeting update to game loop  
  const gameLoopPattern = `      updateLootSystem();
      if (gameLoop._errCount) gameLoop._errCount = 0;`;
      
  const gameLoopWithTargeting = cr(`      updateLootSystem();
      updateTargetingSystem();
      if (gameLoop._errCount) gameLoop._errCount = 0;`);
  
  html = safeReplace(html, gameLoopPattern, gameLoopWithTargeting, 'targeting game loop');
  console.log('✅ Added targeting update to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Simplified Advanced Targeting implemented successfully!');
  console.log('');
  console.log('🎯 TARGETING FEATURES DEPLOYED:');
  console.log('   • Manual target selection with T key');
  console.log('   • Target clearing with G key');
  console.log('   • Auto-targeting for nearby enemies');
  console.log('   • Priority targeting (elites/bosses first)');
  console.log('   • Visual target feedback');
  console.log('   • Target lock indicators');
  console.log('   • Distance-based targeting');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing targeting system:', error.message);
  process.exit(1);
}