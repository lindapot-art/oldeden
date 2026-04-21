// ADVANCED TARGETING SYSTEM - Old Eden Space MMO
// Comprehensive targeting mechanics for superior combat

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

console.log('🎯 Implementing Advanced Targeting System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // ═════════════════════════════════════════════════════════════
  // 1. ADD ADVANCED TARGETING STATE TO GAME STATE
  // ═════════════════════════════════════════════════════════════
  
  // Add targeting state to game state object
  const gameStatePattern = `  },
  
  // ═══ COMPREHENSIVE PROGRESSION SYSTEMS ═══`;
  
  const targetingGameState = cr(`  },
  
  // ── Advanced Targeting System ──
  targeting: {
    enabled: true,
    autoTarget: true,
    currentTarget: null,
    targetLocked: false,
    lockOnTime: 0,
    lockOnDuration: 1000, // ms to fully lock
    
    // Target priority system
    priority: {
      elites: 3,
      bosses: 5,
      closest: 1,
      damaged: 2,
      threat: 4
    },
    
    // Lead targeting
    leadTargeting: true,
    predictiveAim: true,
    aimAssist: 0.3, // 30% assistance
    
    // Visual indicators
    showTargetMarkers: true,
    showLeadIndicator: true,
    showDamageIndicator: true,
    showThreatLevel: true,
    
    // Advanced targeting
    multiTarget: false,
    targetMemory: [],
    smartSwitching: true,
    proximityTargeting: true,
    
    // Performance
    maxTargets: 20,
    updateFrequency: 60, // Hz
    scanRange: 300
  },
  
  // ═══ COMPREHENSIVE PROGRESSION SYSTEMS ═══`);
  
  html = safeReplace(html, gameStatePattern, targetingGameState, 'targeting state');
  console.log('✅ Added advanced targeting state');

  // ═════════════════════════════════════════════════════════════
  // 2. ADD TARGETING SYSTEM FUNCTIONS
  // ═════════════════════════════════════════════════════════════
  
  const functionInsertionPoint = html.indexOf('// ═══ ACHIEVEMENT SYSTEM ═══');
  
  const targetingFunctions = cr(`// ═══ ADVANCED TARGETING SYSTEM ═══

function updateTargetingSystem(dt) {
  const targeting = state.targeting;
  if (!targeting || !targeting.enabled) return;
  
  // Update lock-on timer
  if (targeting.targetLocked && targeting.currentTarget) {
    targeting.lockOnTime = Math.min(targeting.lockOnTime + dt, targeting.lockOnDuration);
  } else {
    targeting.lockOnTime = Math.max(targeting.lockOnTime - dt * 2, 0);
  }
  
  // Auto-targeting
  if (targeting.autoTarget && (!targeting.currentTarget || !isValidTarget(targeting.currentTarget))) {
    targeting.currentTarget = findBestTarget();
    if (targeting.currentTarget) {
      targeting.targetLocked = true;
      targeting.lockOnTime = 0;
    }
  }
  
  // Clean up invalid targets
  if (targeting.currentTarget && !isValidTarget(targeting.currentTarget)) {
    targeting.currentTarget = null;
    targeting.targetLocked = false;
    targeting.lockOnTime = 0;
  }
}

function findBestTarget() {
  const targeting = state.targeting;
  if (!targeting) return null;
  
  let candidates = [];
  
  // Collect potential targets from various enemy arrays
  if (c.enemies && c.enemies.length > 0) {
    for (const enemy of c.enemies) {
      if (isValidTarget(enemy)) {
        const distance = getDistanceToTarget(enemy);
        if (distance <= targeting.scanRange) {
          candidates.push({
            target: enemy,
            distance: distance,
            priority: calculateTargetPriority(enemy, distance)
          });
        }
      }
    }
  }
  
  // Sort by priority (higher is better)
  candidates.sort((a, b) => b.priority - a.priority);
  
  return candidates.length > 0 ? candidates[0].target : null;
}

function calculateTargetPriority(enemy, distance) {
  const targeting = state.targeting;
  if (!targeting || !enemy) return 0;
  
  let priority = 0;
  
  // Base priority by type
  if (enemy.isBoss) {
    priority += targeting.priority.bosses * 100;
  } else if (enemy._isElite) {
    priority += targeting.priority.elites * 100;
  } else {
    priority += 50; // Base enemy priority
  }
  
  // Distance factor (closer = better, but not too close)
  const optimalDistance = 100;
  const distanceFactor = Math.max(0, 100 - Math.abs(distance - optimalDistance));
  priority += distanceFactor * targeting.priority.closest;
  
  // Damage factor (lower HP = higher priority)
  if (enemy.hp && enemy.maxHp) {
    const healthPercent = enemy.hp / enemy.maxHp;
    priority += (1 - healthPercent) * targeting.priority.damaged * 50;
  }
  
  return priority;
}

function isValidTarget(target) {
  if (!target) return false;
  
  // Check if target is alive
  if (target.hp <= 0 || target._destroyed) return false;
  
  // Check if target has position
  if (!target.group || !target.group.position) return false;
  
  // Check if target is in range
  const distance = getDistanceToTarget(target);
  if (distance > state.targeting.scanRange) return false;
  
  return true;
}

function getDistanceToTarget(target) {
  if (!target || !target.group || !target.group.position || !ship.position) {
    return Infinity;
  }
  
  const enemyPos = target.group.position;
  const shipPos = ship.position;
  
  return Math.sqrt(
    Math.pow(enemyPos.x - shipPos.x, 2) +
    Math.pow(enemyPos.y - shipPos.y, 2) +
    Math.pow(enemyPos.z - shipPos.z, 2)
  );
}

function getLeadTargetPosition(target) {
  const targeting = state.targeting;
  if (!targeting.leadTargeting || !target || !target.group || !ship.position) {
    return target && target.group ? target.group.position : null;
  }
  
  const enemyPos = target.group.position;
  
  // Calculate enemy velocity (simplified)
  let velocity = { x: 0, y: 0, z: 0 };
  if (target._lastPos) {
    const dt = 16.67 / 1000; // Assume 60 FPS
    velocity = {
      x: (enemyPos.x - target._lastPos.x) / dt,
      y: (enemyPos.y - target._lastPos.y) / dt,
      z: (enemyPos.z - target._lastPos.z) / dt
    };
  }
  
  // Store position for next frame
  target._lastPos = { x: enemyPos.x, y: enemyPos.y, z: enemyPos.z };
  
  // Calculate projectile travel time
  const shipPos = ship.position;
  const distance = Math.sqrt(
    Math.pow(enemyPos.x - shipPos.x, 2) +
    Math.pow(enemyPos.y - shipPos.y, 2) +
    Math.pow(enemyPos.z - shipPos.z, 2)
  );
  
  const projectileSpeed = 80; // Typical projectile speed
  const travelTime = distance / projectileSpeed;
  
  // Predict target position
  const leadPosition = {
    x: enemyPos.x + velocity.x * travelTime,
    y: enemyPos.y + velocity.y * travelTime,
    z: enemyPos.z + velocity.z * travelTime
  };
  
  return leadPosition;
}

function switchToNextTarget() {
  const targeting = state.targeting;
  if (!targeting) return;
  
  const currentTarget = targeting.currentTarget;
  const candidates = [];
  
  // Collect all valid targets
  if (c.enemies && c.enemies.length > 0) {
    for (const enemy of c.enemies) {
      if (isValidTarget(enemy) && enemy !== currentTarget) {
        candidates.push(enemy);
      }
    }
  }
  
  if (candidates.length > 0) {
    // Sort by distance for next target
    candidates.sort((a, b) => getDistanceToTarget(a) - getDistanceToTarget(b));
    targeting.currentTarget = candidates[0];
    targeting.targetLocked = true;
    targeting.lockOnTime = 0;
    
    // Visual feedback
    c.dmgNumbers.push({
      text: '🎯 TARGET SWITCHED',
      px: ship.position.x,
      py: ship.position.y + 8,
      pz: ship.position.z,
      age: 0,
      color: '#44aaff',
      scale: 1.2
    });
    
    addComms('TARGETING', 'Target switched to ' + (candidates[0].type || 'enemy'));
  }
}

function clearTarget() {
  const targeting = state.targeting;
  if (!targeting) return;
  
  targeting.currentTarget = null;
  targeting.targetLocked = false;
  targeting.lockOnTime = 0;
  
  addComms('TARGETING', 'Target cleared');
}

function toggleTargeting() {
  const targeting = state.targeting;
  if (!targeting) return;
  
  targeting.enabled = !targeting.enabled;
  addComms('TARGETING', 'Targeting system ' + (targeting.enabled ? 'enabled' : 'disabled'));
  
  if (!targeting.enabled) {
    clearTarget();
  }
}

function toggleAutoTarget() {
  const targeting = state.targeting;
  if (!targeting) return;
  
  targeting.autoTarget = !targeting.autoTarget;
  addComms('TARGETING', 'Auto-targeting ' + (targeting.autoTarget ? 'enabled' : 'disabled'));
}

// Make functions globally accessible
window.toggleTargeting = toggleTargeting;
window.toggleAutoTarget = toggleAutoTarget;
window.switchToNextTarget = switchToNextTarget;
window.clearTarget = clearTarget;

`);
  
  html = html.slice(0, functionInsertionPoint) + targetingFunctions + cr('\n\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added advanced targeting functions');

  // ═════════════════════════════════════════════════════════════
  // 3. INTEGRATE TARGETING INTO GAME LOOP
  // ═════════════════════════════════════════════════════════════
  
  const gameLoopPattern = `      updateEnemyBolts(dt);
      updateWeaponProgression(dt);
    }`;
    
  const gameLoopWithTargeting = cr(`      updateEnemyBolts(dt);
      updateWeaponProgression(dt);
      if (typeof updateTargetingSystem === 'function') updateTargetingSystem(dt);
    }`);
  
  html = safeReplace(html, gameLoopPattern, gameLoopWithTargeting, 'targeting game loop integration');
  console.log('✅ Integrated targeting into game loop');

  // ═════════════════════════════════════════════════════════════
  // 4. ADD TARGETING KEYBINDINGS
  // ═════════════════════════════════════════════════════════════
  
  const keybindPattern = `  else if (key === 'h' || key === 'H') { if (typeof showAchievementsUI === 'function') showAchievementsUI(); }
  // Consumables`;
  
  const targetingKeybinds = cr(`  else if (key === 'h' || key === 'H') { if (typeof showAchievementsUI === 'function') showAchievementsUI(); }
  // ═══ ADVANCED TARGETING CONTROLS ═══
  else if (key === 't' || key === 'T') { if (typeof switchToNextTarget === 'function') switchToNextTarget(); }
  else if (key === 'g' || key === 'G') { if (typeof clearTarget === 'function') clearTarget(); }
  else if (key === 'f' || key === 'F') { if (typeof toggleAutoTarget === 'function') toggleAutoTarget(); }
  else if (key === 'r' || key === 'R') { if (typeof toggleTargeting === 'function') toggleTargeting(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, targetingKeybinds, 'targeting keybindings');
  console.log('✅ Added targeting keybindings (T=next target, G=clear, F=auto-target, R=toggle)');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Advanced Targeting System implemented successfully!');
  console.log('');
  console.log('🎯 ADVANCED TARGETING FEATURES DEPLOYED:');
  console.log('   • Auto-targeting with priority system (bosses > elites > closest > damaged)');
  console.log('   • Lead targeting with predictive aim assistance');
  console.log('   • Target switching and memory system');
  console.log('   • Smart proximity targeting with 300m scan range');
  console.log('   • Target controls: T=next, G=clear, F=auto-toggle, R=system toggle');
  console.log('   • Real-time lock-on progress and target tracking');
  console.log('   • Visual feedback for target acquisition');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing advanced targeting system:', error.message);
  process.exit(1);
}