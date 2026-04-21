// Enhanced Targeting System - Old Eden Space MMO
// Advanced targeting with auto-lock, lead reticle, and weapon accuracy

const fs = require('fs');

// Safe replace function
function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.log('❌ FAIL: oldStr not found');
    console.log('Looking for:', oldStr.slice(0, 100) + '...');
    return content;
  }
  return content.replace(oldStr, newStr);
}

console.log('🎯 Implementing enhanced targeting system...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add targeting system variables to game context
const oldContextInit = `  active: false,
  dead: false,
  deathImmunityUntil: 0,`;

const newContextInit = `  active: false,
  dead: false,
  deathImmunityUntil: 0,
  // ── Enhanced Targeting System ──
  targetedEnemy: null,
  targetLockTimer: 0,
  targetLockDuration: 2000, // 2 seconds to lock
  autoTargeting: false,
  targetingReticle: { x: 0, y: 0, size: 50, alpha: 0 },
  leadReticle: { x: 0, y: 0, visible: false },
  weaponAccuracy: 0.8, // Base accuracy
  missileTarget: null,
  missileLockTime: 0,`;

content = safeReplace(content, oldContextInit, newContextInit);

// 2. Add targeting functions
const oldFireActiveGunRoomWeapon = `function fireActiveGunRoomWeapon() {
  if (!c.active || c.dead) return;
  const activeWepKey = state.activeGunRoomWeapon || GUN_ROOM_WEAPONS[0].key;
  const activeWep = GUN_ROOM_WEAPONS.find(w => w.key === activeWepKey) || GUN_ROOM_WEAPONS[0];`;

const newFireActiveGunRoomWeapon = `// ── Enhanced Targeting System Functions ──
function findNearestEnemy() {
  let nearest = null;
  let nearestDist = Infinity;
  
  c.enemies.forEach(e => {
    if (e.hp <= 0) return;
    const dist = ship.position.distanceTo(e.group.position);
    if (dist < nearestDist && dist < 150) { // 150m targeting range
      nearestDist = dist;
      nearest = e;
    }
  });
  
  return nearest;
}

function autoTargetEnemy() {
  if (!c.autoTargeting) return;
  
  // If current target is dead or out of range, find new one
  if (!c.targetedEnemy || c.targetedEnemy.hp <= 0 || 
      ship.position.distanceTo(c.targetedEnemy.group.position) > 200) {
    c.targetedEnemy = findNearestEnemy();
    c.targetLockTimer = 0;
  }
  
  // Update lock timer
  if (c.targetedEnemy) {
    c.targetLockTimer = Math.min(c.targetLockTimer + dtMs, c.targetLockDuration);
  }
}

function manualTargetEnemy() {
  const nearest = findNearestEnemy();
  if (nearest) {
    c.targetedEnemy = nearest;
    c.targetLockTimer = 0;
    addCombatLog(\`Target acquired: \${nearest.type || 'Enemy'}\`, '#44aaff');
    AudioSFX.play('target_lock');
  } else {
    addCombatLog('No targets in range', '#888888');
  }
}

function clearTarget() {
  c.targetedEnemy = null;
  c.targetLockTimer = 0;
  c.leadReticle.visible = false;
}

function calculateLeadTarget(enemy) {
  if (!enemy || !enemy._velocity) return null;
  
  // Calculate intercept point for lead targeting
  const targetPos = enemy.group.position;
  const targetVel = enemy._velocity;
  const projectileSpeed = 120; // Average projectile speed
  
  // Time to intercept calculation
  const dx = targetPos.x - ship.position.x;
  const dy = targetPos.y - ship.position.y;
  const dz = targetPos.z - ship.position.z;
  
  const vx = targetVel.x;
  const vy = targetVel.y;
  const vz = targetVel.z;
  
  // Quadratic formula to solve for intercept time
  const a = vx*vx + vy*vy + vz*vz - projectileSpeed*projectileSpeed;
  const b = 2 * (dx*vx + dy*vy + dz*vz);
  const c = dx*dx + dy*dy + dz*dz;
  
  const discriminant = b*b - 4*a*c;
  if (discriminant < 0) return targetPos; // No solution, aim at current position
  
  const t1 = (-b - Math.sqrt(discriminant)) / (2*a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2*a);
  
  const t = t1 > 0 ? t1 : t2;
  if (t <= 0) return targetPos;
  
  // Calculate lead position
  return {
    x: targetPos.x + targetVel.x * t,
    y: targetPos.y + targetVel.y * t,
    z: targetPos.z + targetVel.z * t
  };
}

function updateTargetingReticle(dtMs) {
  if (!c.targetedEnemy || c.targetedEnemy.hp <= 0) {
    c.targetingReticle.alpha = Math.max(0, c.targetingReticle.alpha - dtMs * 0.003);
    c.leadReticle.visible = false;
    return;
  }
  
  // Update reticle alpha based on lock status
  const lockProgress = c.targetLockTimer / c.targetLockDuration;
  c.targetingReticle.alpha = Math.min(1, lockProgress + 0.3);
  
  // Calculate reticle screen position
  const targetScreenPos = new THREE.Vector3();
  targetScreenPos.copy(c.targetedEnemy.group.position);
  targetScreenPos.project(camera);
  
  if (targetScreenPos.z < 1) { // Target is in front of camera
    c.targetingReticle.x = (1 + targetScreenPos.x) * hudCanvas.width / 2;
    c.targetingReticle.y = (1 - targetScreenPos.y) * hudCanvas.height / 2;
    
    // Reticle size based on distance and lock status
    const distance = ship.position.distanceTo(c.targetedEnemy.group.position);
    const baseSize = Math.max(30, 200 / distance);
    c.targetingReticle.size = baseSize + Math.sin(Date.now() * 0.01) * 5 * lockProgress;
  }
  
  // Update lead reticle for locked targets
  if (lockProgress >= 1) {
    const leadPos = calculateLeadTarget(c.targetedEnemy);
    if (leadPos) {
      const leadScreenPos = new THREE.Vector3();
      leadScreenPos.copy(leadPos);
      leadScreenPos.project(camera);
      
      if (leadScreenPos.z < 1) {
        c.leadReticle.x = (1 + leadScreenPos.x) * hudCanvas.width / 2;
        c.leadReticle.y = (1 - leadScreenPos.y) * hudCanvas.height / 2;
        c.leadReticle.visible = true;
      }
    }
  }
}

function getTargetingAccuracy() {
  let accuracy = c.weaponAccuracy;
  
  // Targeting computer module bonus
  if (c._moduleTargetingAuto) {
    accuracy += 0.2;
  }
  
  // Lock bonus - full lock gives +30% accuracy
  if (c.targetedEnemy && c.targetLockTimer >= c.targetLockDuration) {
    accuracy += 0.3;
  }
  
  // Distance penalty - accuracy drops at long range
  if (c.targetedEnemy) {
    const dist = ship.position.distanceTo(c.targetedEnemy.group.position);
    const distancePenalty = Math.max(0, (dist - 50) * 0.002); // Penalty starts at 50m
    accuracy -= distancePenalty;
  }
  
  // Speed penalty - moving fast reduces accuracy
  const speed = Math.sqrt(state.flight.velocity.x**2 + state.flight.velocity.y**2 + state.flight.velocity.z**2);
  const speedPenalty = speed * 0.001;
  accuracy -= speedPenalty;
  
  return Math.max(0.1, Math.min(0.98, accuracy));
}

function fireActiveGunRoomWeapon() {
  if (!c.active || c.dead) return;
  const activeWepKey = state.activeGunRoomWeapon || GUN_ROOM_WEAPONS[0].key;
  const activeWep = GUN_ROOM_WEAPONS.find(w => w.key === activeWepKey) || GUN_ROOM_WEAPONS[0];`;

content = safeReplace(content, oldFireActiveGunRoomWeapon, newFireActiveGunRoomWeapon);

// 3. Enhance projectile creation with targeting accuracy
const oldCreateProjectile = `  const projectile = {
    id: 'proj_' + Date.now(),
    position: { x: sx, y: sy, z: sz },
    velocity: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    damage: damage,
    life: 3000,
    isLaser: isLaser,
    group: projGroup
  };`;

const newCreateProjectile = `  // Apply targeting accuracy and lead calculation
  let finalDir = dir.clone();
  
  if (c.targetedEnemy && c.targetLockTimer >= c.targetLockDuration) {
    // Use lead targeting for locked targets
    const leadPos = calculateLeadTarget(c.targetedEnemy);
    if (leadPos) {
      finalDir = new THREE.Vector3(leadPos.x - sx, leadPos.y - sy, leadPos.z - sz).normalize();
    }
  }
  
  // Apply accuracy spread
  const accuracy = getTargetingAccuracy();
  const spread = (1 - accuracy) * 0.2; // Max 0.2 radian spread
  finalDir.x += (Math.random() - 0.5) * spread;
  finalDir.y += (Math.random() - 0.5) * spread;
  finalDir.z += (Math.random() - 0.5) * spread;
  finalDir.normalize();

  const projectile = {
    id: 'proj_' + Date.now(),
    position: { x: sx, y: sy, z: sz },
    velocity: { x: finalDir.x * speed, y: finalDir.y * speed, z: finalDir.z * speed },
    damage: damage,
    life: 3000,
    isLaser: isLaser,
    group: projGroup,
    accuracy: accuracy,
    wasTargeted: c.targetedEnemy ? true : false
  };`;

content = safeReplace(content, oldCreateProjectile, newCreateProjectile);

// 4. Add targeting controls
const oldKeydownControls = `    case 'KeyR': // Reload/Recharge
      if (c.active) {
        c.reloading = true;
        c.reloadEndTime = performance.now() + 1500;
        addCombatLog('Reloading weapons...', '#ffaa44');
      }
      break;`;

const newKeydownControls = `    case 'KeyR': // Reload/Recharge
      if (c.active) {
        c.reloading = true;
        c.reloadEndTime = performance.now() + 1500;
        addCombatLog('Reloading weapons...', '#ffaa44');
      }
      break;
    case 'KeyT': // Manual target lock
      if (c.active) manualTargetEnemy();
      break;
    case 'KeyG': // Clear target
      if (c.active) clearTarget();
      break;
    case 'KeyY': // Toggle auto-targeting
      if (c.active) {
        c.autoTargeting = !c.autoTargeting;
        addCombatLog('Auto-targeting: ' + (c.autoTargeting ? 'ON' : 'OFF'), c.autoTargeting ? '#44ff44' : '#ff4444');
      }
      break;`;

content = safeReplace(content, oldKeydownControls, newKeydownControls);

// 5. Add targeting reticle rendering
const oldHudRendering = `  // Damage numbers
  c.dmgNumbers.forEach((d, i) => {
    const age = d.age / 2000;
    if (age >= 1) { c.dmgNumbers.splice(i, 1); return; }
    
    const screenPos = new THREE.Vector3(d.px, d.py, d.pz);
    screenPos.project(camera);
    
    if (screenPos.z > 1) return; // Behind camera
    
    const sx = (1 + screenPos.x) * W / 2;
    const sy = (1 - screenPos.y) * H / 2;
    
    hudCtx.globalAlpha = 1 - age;
    hudCtx.font = 'bold 14px monospace';
    hudCtx.fillStyle = d.color;
    hudCtx.fillText(d.text, sx, sy - age * 50);
    d.age += dtMs;
  });
  hudCtx.globalAlpha = 1;`;

const newHudRendering = `  // Enhanced Targeting Reticles
  updateTargetingReticle(dtMs);
  
  // Draw targeting reticle
  if (c.targetingReticle.alpha > 0) {
    hudCtx.save();
    hudCtx.globalAlpha = c.targetingReticle.alpha;
    hudCtx.strokeStyle = c.targetLockTimer >= c.targetLockDuration ? '#00ff00' : '#ffaa00';
    hudCtx.lineWidth = 2;
    
    const rx = c.targetingReticle.x;
    const ry = c.targetingReticle.y;
    const size = c.targetingReticle.size;
    
    // Main reticle circle
    hudCtx.beginPath();
    hudCtx.arc(rx, ry, size, 0, Math.PI * 2);
    hudCtx.stroke();
    
    // Corner brackets
    const bracketSize = size * 0.3;
    hudCtx.lineWidth = 3;
    // Top-left
    hudCtx.beginPath();
    hudCtx.moveTo(rx - size, ry - size + bracketSize);
    hudCtx.lineTo(rx - size, ry - size);
    hudCtx.lineTo(rx - size + bracketSize, ry - size);
    hudCtx.stroke();
    // Top-right
    hudCtx.beginPath();
    hudCtx.moveTo(rx + size - bracketSize, ry - size);
    hudCtx.lineTo(rx + size, ry - size);
    hudCtx.lineTo(rx + size, ry - size + bracketSize);
    hudCtx.stroke();
    // Bottom-left
    hudCtx.beginPath();
    hudCtx.moveTo(rx - size, ry + size - bracketSize);
    hudCtx.lineTo(rx - size, ry + size);
    hudCtx.lineTo(rx - size + bracketSize, ry + size);
    hudCtx.stroke();
    // Bottom-right
    hudCtx.beginPath();
    hudCtx.moveTo(rx + size - bracketSize, ry + size);
    hudCtx.lineTo(rx + size, ry + size);
    hudCtx.lineTo(rx + size, ry + size - bracketSize);
    hudCtx.stroke();
    
    // Lock progress indicator
    if (c.targetLockTimer > 0 && c.targetLockTimer < c.targetLockDuration) {
      const progress = c.targetLockTimer / c.targetLockDuration;
      hudCtx.strokeStyle = '#ff6600';
      hudCtx.lineWidth = 4;
      hudCtx.beginPath();
      hudCtx.arc(rx, ry, size + 10, -Math.PI/2, -Math.PI/2 + (progress * Math.PI * 2));
      hudCtx.stroke();
    }
    
    // Target info display
    if (c.targetedEnemy) {
      hudCtx.fillStyle = '#ffffff';
      hudCtx.font = 'bold 12px monospace';
      const distance = Math.floor(ship.position.distanceTo(c.targetedEnemy.group.position));
      const hpPercent = Math.floor((c.targetedEnemy.hp / c.targetedEnemy.maxHp) * 100);
      hudCtx.fillText(\`\${c.targetedEnemy.type || 'ENEMY'}\`, rx - 40, ry - size - 15);
      hudCtx.fillText(\`\${distance}m - \${hpPercent}% HP\`, rx - 50, ry + size + 25);
    }
    
    hudCtx.restore();
  }
  
  // Draw lead reticle for predictive targeting
  if (c.leadReticle.visible) {
    hudCtx.save();
    hudCtx.globalAlpha = 0.8;
    hudCtx.strokeStyle = '#00ffaa';
    hudCtx.lineWidth = 2;
    
    const lx = c.leadReticle.x;
    const ly = c.leadReticle.y;
    const leadSize = 15;
    
    // Lead indicator cross
    hudCtx.beginPath();
    hudCtx.moveTo(lx - leadSize, ly);
    hudCtx.lineTo(lx + leadSize, ly);
    hudCtx.moveTo(lx, ly - leadSize);
    hudCtx.lineTo(lx, ly + leadSize);
    hudCtx.stroke();
    
    // Lead circle
    hudCtx.beginPath();
    hudCtx.arc(lx, ly, leadSize - 3, 0, Math.PI * 2);
    hudCtx.stroke();
    
    hudCtx.restore();
  }

  // Damage numbers
  c.dmgNumbers.forEach((d, i) => {
    const maxAge = d.duration || 2000;
    const age = d.age / maxAge;
    if (age >= 1) { c.dmgNumbers.splice(i, 1); return; }
    
    const screenPos = new THREE.Vector3(d.px, d.py, d.pz);
    screenPos.project(camera);
    
    if (screenPos.z > 1) return; // Behind camera
    
    const sx = (1 + screenPos.x) * W / 2;
    const sy = (1 - screenPos.y) * H / 2;
    
    hudCtx.globalAlpha = 1 - age;
    
    // Enhanced styling for different number types
    if (d.isLevelUp) {
      hudCtx.font = 'bold 18px monospace';
      hudCtx.strokeStyle = '#000000';
      hudCtx.lineWidth = 3;
      hudCtx.strokeText(d.text, sx, sy - age * 50);
      hudCtx.fillStyle = d.color;
      hudCtx.fillText(d.text, sx, sy - age * 50);
      // Reset font
      hudCtx.font = 'bold 14px monospace';
    } else {
      hudCtx.font = 'bold 14px monospace';
      hudCtx.fillStyle = d.color;
      hudCtx.fillText(d.text, sx, sy - age * 50);
    }
    
    d.age += dtMs;
  });
  hudCtx.globalAlpha = 1;`;

content = safeReplace(content, oldHudRendering, newHudRendering);

// 6. Add targeting to main game loop
const oldAutoTargeting = `autoTargetEnemy();`;

// Only add if not already present
if (!content.includes('autoTargetEnemy();')) {
  const oldGameLoopUpdate = `    // Update explosions
    c.explosions.forEach((ex, i) => {
      ex.age += dtMs;
      if (ex.age > ex.maxAge) {
        scene.remove(ex.group);
        disposeObject(ex.group);
        c.explosions.splice(i, 1);
      }
    });`;

  const newGameLoopUpdate = `    // Update targeting system
    autoTargetEnemy();

    // Update explosions
    c.explosions.forEach((ex, i) => {
      ex.age += dtMs;
      if (ex.age > ex.maxAge) {
        scene.remove(ex.group);
        disposeObject(ex.group);
        c.explosions.splice(i, 1);
      }
    });`;

  content = safeReplace(content, oldGameLoopUpdate, newGameLoopUpdate);
}

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Enhanced targeting system implemented successfully!');
console.log('📊 Features added:');
console.log('   • Manual target lock with T key');
console.log('   • Auto-targeting toggle with Y key');
console.log('   • Clear target with G key');
console.log('   • Lead targeting for moving enemies');
console.log('   • Dynamic targeting reticle with lock progress');
console.log('   • Weapon accuracy system with distance/speed penalties');
console.log('   • Target info display (distance, HP, type)');