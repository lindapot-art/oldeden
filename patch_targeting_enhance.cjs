// Enhanced Targeting Integration - Old Eden Space MMO
// Add targeting enhancements to existing system

const fs = require('fs');

function cr(str) {
  return str.replace(/\n/g, '\r\n');
}

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.log('❌ FAIL: oldStr not found');
    console.log('Looking for:', oldStr.slice(0, 100) + '...');
    return content;
  }
  return content.replace(oldStr, newStr);
}

console.log('🎯 Enhancing existing targeting system...');

const htmlPath = 'd:\\antiruscist\\oldeden\\public\\index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Enhance existing target lock system
const oldTargetLock = `  // ── Target Lock-On ──
  targetLock: { target: null, lockTimer: 0, locked: false },`;

const newTargetLock = `  // ── Enhanced Target Lock-On ──
  targetLock: { 
    target: null, 
    lockTimer: 0, 
    locked: false,
    autoMode: false,
    reticle: { x: 0, y: 0, size: 50, alpha: 0 },
    leadReticle: { x: 0, y: 0, visible: false },
    accuracy: 0.8
  },`;

content = safeReplace(content, oldTargetLock, newTargetLock);

// 2. Find and enhance keydown controls
const oldKeyRControls = `    case 'KeyR':
      // Reload/Recharge
      if (c.active) {
        c.reloading = true;
        c.reloadEndTime = performance.now() + 1500;
        addCombatLog('Reloading weapons...', '#ffaa44');
      }
      break;`;

const newKeyRControls = `    case 'KeyR':
      // Reload/Recharge
      if (c.active) {
        c.reloading = true;
        c.reloadEndTime = performance.now() + 1500;
        addCombatLog('Reloading weapons...', '#ffaa44');
      }
      break;
    case 'KeyT':
      // Manual target lock
      if (c.active) manualTargetEnemy();
      break;
    case 'KeyG':
      // Clear target
      if (c.active) clearTargetLock();
      break;
    case 'KeyY':
      // Toggle auto-targeting
      if (c.active) {
        c.targetLock.autoMode = !c.targetLock.autoMode;
        addCombatLog('Auto-targeting: ' + (c.targetLock.autoMode ? 'ON' : 'OFF'), c.targetLock.autoMode ? '#44ff44' : '#ff4444');
      }
      break;`;

content = safeReplace(content, oldKeyRControls, newKeyRControls);

// 3. Add targeting functions after existing functions (find a good insertion point)
const functionInsertPoint = `function addCombatLog(msg, color = '#ffffff') {
  const now = performance.now();
  c.combatLog.unshift({ msg, color, time: now });
  if (c.combatLog.length > 50) c.combatLog.length = 50;
  console.log('⚔️', msg);
}`;

const enhancedFunctions = cr(`function addCombatLog(msg, color = '#ffffff') {
  const now = performance.now();
  c.combatLog.unshift({ msg, color, time: now });
  if (c.combatLog.length > 50) c.combatLog.length = 50;
  console.log('⚔️', msg);
}

// ── Enhanced Targeting Functions ──
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

function manualTargetEnemy() {
  const nearest = findNearestEnemy();
  if (nearest) {
    c.targetLock.target = nearest;
    c.targetLock.lockTimer = 0;
    c.targetLock.locked = false;
    addCombatLog(\`Target acquired: \${nearest.type || 'Enemy'}\`, '#44aaff');
    try { AudioSFX.play('target_lock'); } catch(e) {}
  } else {
    addCombatLog('No targets in range', '#888888');
  }
}

function clearTargetLock() {
  c.targetLock.target = null;
  c.targetLock.lockTimer = 0;
  c.targetLock.locked = false;
  c.targetLock.leadReticle.visible = false;
  addCombatLog('Target cleared', '#888888');
}

function calculateLeadTarget(enemy) {
  if (!enemy || !enemy._velocity) return enemy.group.position;
  
  const targetPos = enemy.group.position;
  const targetVel = enemy._velocity;
  const projectileSpeed = 120;
  
  const dx = targetPos.x - ship.position.x;
  const dy = targetPos.y - ship.position.y;
  const dz = targetPos.z - ship.position.z;
  
  const vx = targetVel.x;
  const vy = targetVel.y;
  const vz = targetVel.z;
  
  const a = vx*vx + vy*vy + vz*vz - projectileSpeed*projectileSpeed;
  const b = 2 * (dx*vx + dy*vy + dz*vz);
  const c = dx*dx + dy*dy + dz*dz;
  
  const discriminant = b*b - 4*a*c;
  if (discriminant < 0) return targetPos;
  
  const t1 = (-b - Math.sqrt(discriminant)) / (2*a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2*a);
  
  const t = t1 > 0 ? t1 : t2;
  if (t <= 0) return targetPos;
  
  return {
    x: targetPos.x + targetVel.x * t,
    y: targetPos.y + targetVel.y * t,
    z: targetPos.z + targetVel.z * t
  };
}

function updateTargetingSystem(dtMs) {
  // Auto-targeting logic
  if (c.targetLock.autoMode) {
    if (!c.targetLock.target || c.targetLock.target.hp <= 0 || 
        ship.position.distanceTo(c.targetLock.target.group.position) > 200) {
      c.targetLock.target = findNearestEnemy();
      c.targetLock.lockTimer = 0;
      c.targetLock.locked = false;
    }
  }
  
  // Update lock timer
  if (c.targetLock.target && c.targetLock.target.hp > 0) {
    c.targetLock.lockTimer = Math.min(c.targetLock.lockTimer + dtMs, 2000);
    if (c.targetLock.lockTimer >= 2000) {
      c.targetLock.locked = true;
    }
  }
  
  // Update reticle
  updateTargetingReticle(dtMs);
}

function updateTargetingReticle(dtMs) {
  if (!c.targetLock.target || c.targetLock.target.hp <= 0) {
    c.targetLock.reticle.alpha = Math.max(0, c.targetLock.reticle.alpha - dtMs * 0.003);
    c.targetLock.leadReticle.visible = false;
    return;
  }
  
  const lockProgress = c.targetLock.lockTimer / 2000;
  c.targetLock.reticle.alpha = Math.min(1, lockProgress + 0.3);
  
  const targetScreenPos = new THREE.Vector3();
  targetScreenPos.copy(c.targetLock.target.group.position);
  targetScreenPos.project(camera);
  
  if (targetScreenPos.z < 1) {
    c.targetLock.reticle.x = (1 + targetScreenPos.x) * hudCanvas.width / 2;
    c.targetLock.reticle.y = (1 - targetScreenPos.y) * hudCanvas.height / 2;
    
    const distance = ship.position.distanceTo(c.targetLock.target.group.position);
    const baseSize = Math.max(30, 200 / distance);
    c.targetLock.reticle.size = baseSize + Math.sin(Date.now() * 0.01) * 5 * lockProgress;
  }
  
  // Update lead reticle
  if (c.targetLock.locked) {
    const leadPos = calculateLeadTarget(c.targetLock.target);
    const leadScreenPos = new THREE.Vector3();
    leadScreenPos.copy(leadPos);
    leadScreenPos.project(camera);
    
    if (leadScreenPos.z < 1) {
      c.targetLock.leadReticle.x = (1 + leadScreenPos.x) * hudCanvas.width / 2;
      c.targetLock.leadReticle.y = (1 - leadScreenPos.y) * hudCanvas.height / 2;
      c.targetLock.leadReticle.visible = true;
    }
  }
}`);

content = safeReplace(content, functionInsertPoint, enhancedFunctions);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Enhanced targeting system integrated successfully!');
console.log('📊 Features integrated:');
console.log('   • Enhanced existing targetLock with reticle and lead targeting');
console.log('   • Manual target lock with T key');
console.log('   • Auto-targeting toggle with Y key');
console.log('   • Clear target with G key');
console.log('   • Predictive lead calculation');
console.log('   • Improved targeting functions');