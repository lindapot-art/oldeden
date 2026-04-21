// QUICK TARGETING FIX - Add targeting after progression keybinds

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

console.log('🎯 Adding Quick Targeting System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add targeting keybindings after progression
  const keybindPattern = `  else if (key === 'p' || key === 'P') { if (typeof showProgressionUI === 'function') showProgressionUI(); }
  // Consumables`;
  
  const targetingKeybinds = cr(`  else if (key === 'p' || key === 'P') { if (typeof showProgressionUI === 'function') showProgressionUI(); }
  // ═══ TARGETING SYSTEM ═══
  else if (key === 't' || key === 'T') { findAndTargetNearestEnemy(); }
  else if (key === 'g' || key === 'G') { clearCurrentTarget(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, targetingKeybinds, 'targeting keybindings');
  console.log('✅ Added targeting keybindings (T=target, G=clear)');

  // Add targeting functions before game loop
  const functionInsertionPoint = html.indexOf('function gameLoop() {');
  
  const targetingFunctions = cr(`
// ═══ TARGETING SYSTEM ═══

function findAndTargetNearestEnemy() {
  if (!c.enemies || c.enemies.length === 0) {
    addComms('TARGETING', 'No enemies detected');
    return;
  }
  
  let nearestEnemy = null;
  let nearestDistance = Infinity;
  
  for (const enemy of c.enemies) {
    if (enemy.hp > 0 && enemy.group && enemy.group.position) {
      const distance = Math.sqrt(
        Math.pow(enemy.group.position.x - ship.position.x, 2) +
        Math.pow(enemy.group.position.y - ship.position.y, 2) +
        Math.pow(enemy.group.position.z - ship.position.z, 2)
      );
      
      if (distance < nearestDistance && distance < 300) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }
  }
  
  if (nearestEnemy) {
    c.targetedEnemy = nearestEnemy;
    
    c.dmgNumbers.push({
      text: '🎯 TARGET: ' + (nearestEnemy.type || 'Enemy'),
      px: ship.position.x,
      py: ship.position.y + 8,
      pz: ship.position.z,
      age: 0,
      color: '#ff4400',
      scale: 1.5
    });
    
    addComms('TARGETING', \`Locked: \${nearestEnemy.type || 'Enemy'} (\${nearestDistance.toFixed(0)}m)\`);
  } else {
    addComms('TARGETING', 'No targets in range (300m)');
  }
}

function clearCurrentTarget() {
  if (c.targetedEnemy) {
    c.targetedEnemy = null;
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

`);
  
  html = html.slice(0, functionInsertionPoint) + targetingFunctions + cr('\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added targeting functions');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Quick Targeting System implemented successfully!');
  console.log('');
  console.log('🎯 TARGETING FEATURES:');
  console.log('   • T key: Target nearest enemy (300m range)');
  console.log('   • G key: Clear current target');
  console.log('   • Visual target feedback with distance');
  console.log('   • Automatic target validation');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing targeting:', error.message);
  process.exit(1);
}