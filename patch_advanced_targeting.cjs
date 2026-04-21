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
  // 1. ADD ADVANCED TARGETING STATE
  // ═════════════════════════════════════════════════════════════
  
  const targetingStatePattern = `      definition:`);
  
  const advancedTargetingState = cr(`      definitions: {
        // Combat Achievements
        firstBlood: {
          name: 'First Blood',
          description: 'Destroy your first enemy',
          icon: '🎯',
          condition: () => state.achievements.statistics.enemiesKilled >= 1,
          reward: { type: 'credits', amount: 100 },
          category: 'combat'
        },`);
  
  if (html.includes('firstBlood:')) {
    // Targeting state already exists or not needed here, proceed to functions
  } else {
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
  }

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
  
  // Update target memory
  updateTargetMemory();
  
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
  const enemyArrays = [c.enemies, c.bosses, c.asteroids].filter(arr => arr && arr.length > 0);
  
  for (const enemyArray of enemyArrays) {
    for (const enemy of enemyArray) {
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
  
  // Threat level (moving toward player)
  if (enemy.group && ship.position) {
    const enemyPos = enemy.group.position;
    const shipPos = ship.position;
    
    // Calculate if enemy is moving toward player
    if (enemy._velocity) {
      const toPlayer = new THREE.Vector3(shipPos.x - enemyPos.x, shipPos.y - enemyPos.y, shipPos.z - enemyPos.z);
      const velocityDot = enemy._velocity.dot(toPlayer.normalize());
      if (velocityDot > 0) {
        priority += targeting.priority.threat * 30;
      }
    }
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
  const shipPos = ship.position;
  
  // Calculate enemy velocity (simplified)
  let velocity = { x: 0, y: 0, z: 0 };
  if (target._velocity) {
    velocity = target._velocity;
  } else if (target._lastPos) {
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
  const enemyArrays = [c.enemies, c.bosses, c.asteroids].filter(arr => arr && arr.length > 0);
  
  for (const enemyArray of enemyArrays) {
    for (const enemy of enemyArray) {
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

function updateTargetMemory() {
  const targeting = state.targeting;
  if (!targeting) return;
  
  const currentTime = performance.now();
  
  // Add current target to memory
  if (targeting.currentTarget) {
    const memoryEntry = {
      target: targeting.currentTarget,
      lastSeen: currentTime,
      threat: calculateTargetPriority(targeting.currentTarget, getDistanceToTarget(targeting.currentTarget))
    };
    
    // Update existing entry or add new one
    const existing = targeting.targetMemory.find(entry => entry.target === targeting.currentTarget);
    if (existing) {
      existing.lastSeen = currentTime;
      existing.threat = memoryEntry.threat;
    } else {
      targeting.targetMemory.push(memoryEntry);
    }
  }
  
  // Clean up old memory entries (older than 10 seconds)
  targeting.targetMemory = targeting.targetMemory.filter(entry => {
    return currentTime - entry.lastSeen < 10000 && isValidTarget(entry.target);
  });
  
  // Limit memory size
  if (targeting.targetMemory.length > targeting.maxTargets) {
    targeting.targetMemory.sort((a, b) => b.threat - a.threat);
    targeting.targetMemory = targeting.targetMemory.slice(0, targeting.maxTargets);
  }
}

function renderTargetingIndicators(ctx) {
  const targeting = state.targeting;
  if (!targeting || !targeting.showTargetMarkers) return;
  
  ctx.save();
  
  // Render current target indicator
  if (targeting.currentTarget && isValidTarget(targeting.currentTarget)) {
    renderPrimaryTargetIndicator(ctx, targeting.currentTarget);
  }
  
  // Render lead indicator
  if (targeting.showLeadIndicator && targeting.currentTarget) {
    renderLeadIndicator(ctx, targeting.currentTarget);
  }
  
  // Render threat indicators for other enemies
  if (targeting.showThreatLevel) {
    renderThreatIndicators(ctx);
  }
  
  ctx.restore();
}

function renderPrimaryTargetIndicator(ctx, target) {
  if (!target.group || !ship.position) return;
  
  const enemyPos = target.group.position;
  const shipPos = ship.position;
  
  // Project 3D position to 2D screen
  const screenPos = projectToScreen(enemyPos);
  if (!screenPos) return;
  
  const targeting = state.targeting;
  const lockProgress = targeting.lockOnTime / targeting.lockOnDuration;
  
  ctx.save();
  ctx.globalAlpha = 0.8;
  
  // Target circle
  const radius = 30 + Math.sin(performance.now() * 0.005) * 5;
  
  // Lock-on progress ring
  ctx.strokeStyle = lockProgress >= 1.0 ? '#ff4444' : '#44aaff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2 * lockProgress);
  ctx.stroke();
  
  // Target brackets
  if (lockProgress >= 0.5) {
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    
    const bracketSize = 15;
    const offset = radius + 10;
    
    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(screenPos.x - offset, screenPos.y - offset + bracketSize);
    ctx.lineTo(screenPos.x - offset, screenPos.y - offset);
    ctx.lineTo(screenPos.x - offset + bracketSize, screenPos.y - offset);
    ctx.stroke();
    
    // Top-right bracket
    ctx.beginPath();
    ctx.moveTo(screenPos.x + offset - bracketSize, screenPos.y - offset);
    ctx.lineTo(screenPos.x + offset, screenPos.y - offset);
    ctx.lineTo(screenPos.x + offset, screenPos.y - offset + bracketSize);
    ctx.stroke();
    
    // Bottom-left bracket
    ctx.beginPath();
    ctx.moveTo(screenPos.x - offset, screenPos.y + offset - bracketSize);
    ctx.lineTo(screenPos.x - offset, screenPos.y + offset);
    ctx.lineTo(screenPos.x - offset + bracketSize, screenPos.y + offset);
    ctx.stroke();
    
    // Bottom-right bracket
    ctx.beginPath();
    ctx.moveTo(screenPos.x + offset - bracketSize, screenPos.y + offset);
    ctx.lineTo(screenPos.x + offset, screenPos.y + offset);
    ctx.lineTo(screenPos.x + offset, screenPos.y + offset - bracketSize);
    ctx.stroke();
  }
  
  // Target info
  if (lockProgress >= 1.0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px var(--font-mono)';
    ctx.textAlign = 'center';
    
    let targetName = target.type || 'Enemy';
    if (target.isBoss) targetName += ' BOSS';
    if (target._isElite) targetName += ' ELITE';
    
    ctx.fillText(targetName, screenPos.x, screenPos.y - radius - 20);
    
    // Health bar
    if (target.hp && target.maxHp) {
      const healthPercent = target.hp / target.maxHp;
      const barWidth = 60;
      const barHeight = 4;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(screenPos.x - barWidth/2, screenPos.y - radius - 35, barWidth, barHeight);
      
      ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : healthPercent > 0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(screenPos.x - barWidth/2, screenPos.y - radius - 35, barWidth * healthPercent, barHeight);
    }
  }
  
  ctx.restore();
}

function renderLeadIndicator(ctx, target) {
  const leadPos = getLeadTargetPosition(target);
  if (!leadPos) return;
  
  const screenPos = projectToScreen(leadPos);
  if (!screenPos) return;
  
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 2;
  
  // Lead indicator cross
  const size = 8;
  ctx.beginPath();
  ctx.moveTo(screenPos.x - size, screenPos.y);
  ctx.lineTo(screenPos.x + size, screenPos.y);
  ctx.moveTo(screenPos.x, screenPos.y - size);
  ctx.lineTo(screenPos.x, screenPos.y + size);
  ctx.stroke();
  
  ctx.restore();
}

function renderThreatIndicators(ctx) {
  // Render simplified threat indicators for other enemies
  const enemyArrays = [c.enemies, c.bosses, c.asteroids].filter(arr => arr && arr.length > 0);
  
  for (const enemyArray of enemyArrays) {
    for (const enemy of enemyArray) {
      if (isValidTarget(enemy) && enemy !== state.targeting.currentTarget) {
        renderThreatIndicator(ctx, enemy);
      }
    }
  }
}

function renderThreatIndicator(ctx, target) {
  if (!target.group) return;
  
  const screenPos = projectToScreen(target.group.position);
  if (!screenPos) return;
  
  const threat = calculateTargetPriority(target, getDistanceToTarget(target));
  const alpha = Math.min(0.5, threat / 300);
  
  ctx.save();
  ctx.globalAlpha = alpha;
  
  let color = '#888888';
  if (target.isBoss) color = '#ff4444';
  else if (target._isElite) color = '#ffaa00';
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, 3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function projectToScreen(worldPos) {
  if (!camera || !worldPos) return null;
  
  const vector = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
  vector.project(camera);
  
  const x = (vector.x + 1) / 2 * canvas.width;
  const y = (-vector.y + 1) / 2 * canvas.height;
  
  // Check if position is in front of camera and on screen
  if (vector.z > 1 || x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
    return null;
  }
  
  return { x: x, y: y };
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
      updateTargetingSystem(dt);
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

  // ═════════════════════════════════════════════════════════════
  // 5. ADD TARGETING INDICATORS TO RENDERING
  // ═════════════════════════════════════════════════════════════
  
  const renderingPattern = `      // Render achievement flash overlay
      if (typeof renderAchievementFlash === 'function') {
        renderAchievementFlash(ctx);
      }`;
      
  const renderingWithTargeting = cr(`      // Render achievement flash overlay
      if (typeof renderAchievementFlash === 'function') {
        renderAchievementFlash(ctx);
      }
      
      // Render targeting indicators
      if (typeof renderTargetingIndicators === 'function') {
        renderTargetingIndicators(ctx);
      }`);
  
  html = safeReplace(html, renderingPattern, renderingWithTargeting, 'targeting rendering');
  console.log('✅ Added targeting indicators to rendering pipeline');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Advanced Targeting System implemented successfully!');
  console.log('');
  console.log('🎯 ADVANCED TARGETING FEATURES DEPLOYED:');
  console.log('   • Auto-targeting with priority system (bosses > elites > closest > damaged)');
  console.log('   • Lead targeting with predictive aim assistance');
  console.log('   • Visual targeting indicators (lock-on circles, brackets, health bars)');
  console.log('   • Target switching and memory system');
  console.log('   • Threat level indicators for all enemies');
  console.log('   • Smart proximity targeting with 300m scan range');
  console.log('   • Target controls: T=next, G=clear, F=auto-toggle, R=system toggle');
  console.log('   • Real-time lock-on progress and lead indicators');
  console.log('   • Multi-target awareness and priority calculation');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing advanced targeting system:', error.message);
  process.exit(1);
}