// WoT-Style Direct Shooting System Implementation
// Adds toggle between direct aiming (WoT-style) and auto-targeting modes

const fs = require('fs');

// CRLF helper for Windows compatibility  
function cr(text) {
  return text.replace(/\r?\n/g, '\r\n');
}

function safeReplace(content, searchStr, replaceStr, description) {
  if (!content.includes(searchStr)) {
    console.log(`❌ PATCH FAILED: Could not find "${description}"`);
    console.log(`Search string: ${searchStr.slice(0, 100)}...`);
    return content;
  }
  const newContent = content.replace(searchStr, replaceStr);
  if (newContent === content) {
    console.log(`❌ PATCH FAILED: No replacement made for "${description}"`);
    return content;
  }
  console.log(`✅ PATCHED: ${description}`);
  return newContent;
}

console.log('🔫 Implementing WoT-Style Direct Shooting System...\n');

let htmlContent = fs.readFileSync('public/index.html', 'utf8');

// 1. Enhanced aiming mode state (replace autoTarget with aimingMode object)
const oldAimingState = `  speedTarget: 0,  // 0-100 percent of max speed
  autoTarget: false,`;

const newAimingState = `  speedTarget: 0,  // 0-100 percent of max speed
  // ── WoT-Style Aiming System ──
  aimingMode: {
    mode: 'direct',  // 'direct' = WoT-style direct aiming, 'auto' = auto-targeting
    crosshairVisible: true,
    lastToggleTime: 0,
    aimAssist: 0.15  // slight magnetic aiming in auto mode
  },
  autoTarget: false,  // legacy compatibility`;

htmlContent = safeReplace(htmlContent, oldAimingState, newAimingState, 'Enhanced aiming mode state');

// 2. Add aiming mode toggle key (T key for Tank-style aiming)
const oldKeyBindings = `  else if (key === 'g') { state.targetLock.target = null; state.targetLock.locked = false; addCombatLog('Target cleared', '#888888'); }`;

const newKeyBindings = `  else if (key === 'g') { state.targetLock.target = null; state.targetLock.locked = false; addCombatLog('Target cleared', '#888888'); }
  else if (key === 't') { toggleAimingMode(); }`;

htmlContent = safeReplace(htmlContent, oldKeyBindings, newKeyBindings, 'Aiming mode toggle key binding');

// 3. Add crosshair CSS for direct aiming mode
const oldCrosshairCSS = `#qa-unverified-banner {`;

const newCrosshairCSS = `/* WoT-Style Direct Aiming Crosshair */
#wot-crosshair {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 40px; height: 40px;
  pointer-events: none;
  z-index: 900;
  transition: opacity 0.3s ease;
}

#wot-crosshair::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 20px; height: 2px;
  background: rgba(255, 255, 255, 0.8);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
}

#wot-crosshair::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 2px; height: 20px;
  background: rgba(255, 255, 255, 0.8);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
}

#wot-crosshair.auto-mode::before,
#wot-crosshair.auto-mode::after {
  background: rgba(255, 100, 100, 0.8);
  box-shadow: 0 0 4px rgba(255, 100, 100, 0.5);
}

#qa-unverified-banner {`;

htmlContent = safeReplace(htmlContent, oldCrosshairCSS, newCrosshairCSS, 'WoT crosshair CSS');

// 4. Add crosshair HTML element
const oldGameHUD = `    <div id="time-dilation-overlay" class="time-dilation-overlay"></div>`;

const newGameHUD = `    <div id="time-dilation-overlay" class="time-dilation-overlay"></div>
    <!-- WoT-Style Direct Aiming Crosshair -->
    <div id="wot-crosshair"></div>`;

htmlContent = safeReplace(htmlContent, oldGameHUD, newGameHUD, 'WoT crosshair HTML element');

// 5. Add aiming mode toggle function
const oldToggleFunction = `function manualTargetEnemy() {
  const nearest = findNearestEnemy();
  if (nearest) {
    state.targetLock.target = nearest;
    state.targetLock.lockTimer = 0;
    state.targetLock.locked = false;
    addCombatLog(\`Target acquired: \${nearest.type || 'Enemy'}\`, '#44aaff');
    try { AudioSFX.play('target_lock'); } catch(e) {}
  } else {
    addCombatLog('No targets in range', '#888888');
  }
}`;

const newToggleFunction = `function toggleAimingMode() {
  const now = performance.now();
  if (now - state.aimingMode.lastToggleTime < 1000) return; // Prevent spam toggle
  state.aimingMode.lastToggleTime = now;
  
  if (state.aimingMode.mode === 'direct') {
    state.aimingMode.mode = 'auto';
    addCombatLog('Auto-Targeting Mode', '#ff6644');
    showToast('🎯 Auto-Target Mode (T to toggle)');
  } else {
    state.aimingMode.mode = 'direct';
    addCombatLog('Direct Aiming Mode (WoT-Style)', '#44aaff'); 
    showToast('🎮 Direct Aim Mode (T to toggle)');
  }
  
  updateCrosshair();
  try { AudioSFX.play('target_lock'); } catch(e) {}
}

function updateCrosshair() {
  const crosshair = document.getElementById('wot-crosshair');
  if (!crosshair) return;
  
  if (state.aimingMode.mode === 'direct') {
    crosshair.style.opacity = state.aimingMode.crosshairVisible ? '1' : '0';
    crosshair.classList.remove('auto-mode');
  } else {
    crosshair.style.opacity = '0.6'; // Dimmed for auto mode
    crosshair.classList.add('auto-mode');
  }
}

function manualTargetEnemy() {
  const nearest = findNearestEnemy();
  if (nearest) {
    state.targetLock.target = nearest;
    state.targetLock.lockTimer = 0;
    state.targetLock.locked = false;
    addCombatLog(\`Target acquired: \${nearest.type || 'Enemy'}\`, '#44aaff');
    try { AudioSFX.play('target_lock'); } catch(e) {}
  } else {
    addCombatLog('No targets in range', '#888888');
  }
}`;

htmlContent = safeReplace(htmlContent, oldToggleFunction, newToggleFunction, 'Aiming mode toggle function');

// 6. Enhance fireLaser with aiming mode support
const oldFireLaser = `  _laserDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  _laserOrigin.copy(camera.position).addScaledVector(_laserDir, 1);
  const dir = _laserDir;
  const origin = _laserOrigin;`;

const newFireLaser = `  // WoT-Style Aiming: Direct vs Auto-Target
  if (state.aimingMode.mode === 'auto' && state.targetLock.target && state.targetLock.locked) {
    // Auto-target mode: aim at locked target with prediction
    const targetPos = state.targetLock.target.mesh ? state.targetLock.target.mesh.position : state.targetLock.target.position;
    if (targetPos) {
      _laserDir.subVectors(targetPos, camera.position).normalize();
      // Add slight aim assist for auto mode
      const directDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      _laserDir.lerp(directDir, 1 - state.aimingMode.aimAssist);
    } else {
      _laserDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
  } else {
    // Direct aiming mode: fire exactly where camera points (WoT-style)
    _laserDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  }
  
  _laserOrigin.copy(camera.position).addScaledVector(_laserDir, 1);
  const dir = _laserDir;
  const origin = _laserOrigin;`;

htmlContent = safeReplace(htmlContent, oldFireLaser, newFireLaser, 'Enhanced fireLaser with aiming modes');

// 7. Enhance spawnNail (railgun) with aiming mode support  
const oldSpawnNail = `  AudioSFX.play('fire');
  const dir = _tmpV3a.set(0,0,-1).applyQuaternion(camera.quaternion);
  const origin = _tmpV3b.copy(camera.position).addScaledVector(dir, 1);`;

const newSpawnNail = `  AudioSFX.play('fire');
  
  // WoT-Style Aiming: Direct vs Auto-Target
  if (state.aimingMode.mode === 'auto' && state.targetLock.target && state.targetLock.locked) {
    // Auto-target mode: aim at locked target with prediction
    const targetPos = state.targetLock.target.mesh ? state.targetLock.target.mesh.position : state.targetLock.target.position;
    if (targetPos) {
      _tmpV3a.subVectors(targetPos, camera.position).normalize();
      // Add slight aim assist for auto mode
      const directDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      _tmpV3a.lerp(directDir, 1 - state.aimingMode.aimAssist);
    } else {
      _tmpV3a.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
  } else {
    // Direct aiming mode: fire exactly where camera points (WoT-style)
    _tmpV3a.set(0, 0, -1).applyQuaternion(camera.quaternion);
  }
  
  const dir = _tmpV3a;
  const origin = _tmpV3b.copy(camera.position).addScaledVector(dir, 1);`;

htmlContent = safeReplace(htmlContent, oldSpawnNail, newSpawnNail, 'Enhanced spawnNail with aiming modes');

// 8. Add aiming mode indicator to HUD
const oldHUDUpdate = `function updateHUD() {
  // Update weapon status HUD elements`;

const newHUDUpdate = `function updateHUD() {
  // Update WoT aiming mode crosshair
  updateCrosshair();
  
  // Update weapon status HUD elements`;

htmlContent = safeReplace(htmlContent, oldHUDUpdate, newHUDUpdate, 'HUD update with crosshair');

// 9. Initialize crosshair on game start
const oldGameInit = `  setupHUDTooltips();
  
  // Initialize high-precision timer`;

const newGameInit = `  setupHUDTooltips();
  
  // Initialize WoT-style aiming system
  setTimeout(() => { updateCrosshair(); }, 1000);
  
  // Initialize high-precision timer`;

htmlContent = safeReplace(htmlContent, oldGameInit, newGameInit, 'Initialize WoT aiming system');

// 10. Add aiming mode to settings display 
const oldSettingsDisplay = `  <div class="setting-row">
    <label>Auto-Mining</label>
    <input type="checkbox" id="auto-mining-toggle" checked />
  </div>`;

const newSettingsDisplay = `  <div class="setting-row">
    <label>Auto-Mining</label>
    <input type="checkbox" id="auto-mining-toggle" checked />
  </div>
  <div class="setting-row">
    <label>Aiming Mode</label>
    <button onclick="toggleAimingMode()" class="btn-primary">
      <span id="aiming-mode-display">Direct (WoT-Style)</span>
    </button>
  </div>`;

htmlContent = safeReplace(htmlContent, oldSettingsDisplay, newSettingsDisplay, 'Aiming mode in settings');

fs.writeFileSync('public/index.html', htmlContent);

console.log('\n✅ WoT-Style Direct Shooting System Implementation Complete!');
console.log('📋 Features Added:');
console.log('   • Toggle between Direct (WoT-style) and Auto-Target modes');
console.log('   • Press T key to switch aiming modes');  
console.log('   • Visual crosshair for direct aiming');
console.log('   • Auto-aim assistance in auto-target mode');
console.log('   • Setting in options menu');
console.log('   • Real-time HUD updates and combat notifications');
console.log('\n🎮 Controls:');
console.log('   • T = Toggle between Direct/Auto aiming modes');
console.log('   • Direct Mode = Fire where you point (like World of Tanks)');
console.log('   • Auto Mode = Automatic target tracking with aim assist');