// WoT-Style Direct Shooting System Implementation - Fixed
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

console.log('🔫 Implementing WoT-Style Direct Shooting System (Fixed)...\n');

let htmlContent = fs.readFileSync('public/index.html', 'utf8');

// 1. Enhanced aiming mode state (find the exact autoTarget line)
const oldAimingState = `  autoTarget: false,`;

const newAimingState = `  autoTarget: false,
  // ── WoT-Style Aiming System ──
  aimingMode: {
    mode: 'direct',  // 'direct' = WoT-style direct aiming, 'auto' = auto-targeting
    crosshairVisible: true,
    lastToggleTime: 0,
    aimAssist: 0.15  // slight magnetic aiming in auto mode
  },`;

htmlContent = safeReplace(htmlContent, oldAimingState, newAimingState, 'Enhanced aiming mode state');

// 2. Add aiming mode toggle function after manualTargetEnemy
const functionInsertPoint = `function updateTargetingSystem(dtMs) {`;

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

function updateTargetingSystem(dtMs) {`;

htmlContent = safeReplace(htmlContent, functionInsertPoint, newToggleFunction, 'Aiming mode toggle functions');

// 3. Add T key binding for toggle  
const keyTBinding = `  else if (key === 'g') { state.targetLock.target = null; state.targetLock.locked = false; addCombatLog('Target cleared', '#888888'); }`;

const newKeyTBinding = `  else if (key === 'g') { state.targetLock.target = null; state.targetLock.locked = false; addCombatLog('Target cleared', '#888888'); }
  else if (key === 't') { toggleAimingMode(); }`;

htmlContent = safeReplace(htmlContent, keyTBinding, newKeyTBinding, 'T key aiming mode toggle');

// 4. Add crosshair CSS before existing styles
const cssInsertPoint = `#screen-create {`;

const crosshairCSS = `/* WoT-Style Direct Aiming Crosshair */
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

#screen-create {`;

htmlContent = safeReplace(htmlContent, cssInsertPoint, crosshairCSS, 'Crosshair CSS styles');

// 5. Add crosshair HTML element to the game view
const htmlInsertPoint = `  <div id="lore-overlay" class="lore-overlay"></div>`;

const crosshairHTML = `  <div id="lore-overlay" class="lore-overlay"></div>
  <!-- WoT-Style Direct Aiming Crosshair -->
  <div id="wot-crosshair"></div>`;

htmlContent = safeReplace(htmlContent, htmlInsertPoint, crosshairHTML, 'Crosshair HTML element');

// 6. Initialize crosshair system
const initInsertPoint = `function gameLoop() {`;

const crosshairInit = `// Initialize WoT crosshair system
function initWoTAiming() {
  if (typeof state.aimingMode !== 'undefined') {
    updateCrosshair();
  }
}

function gameLoop() {`;

htmlContent = safeReplace(htmlContent, initInsertPoint, crosshairInit, 'Initialize crosshair system');

// 7. Call init in game startup
const gameStartPoint = `  requestAnimationFrame(gameLoop);`;

const gameStartWithInit = `  requestAnimationFrame(gameLoop);
  // Initialize WoT aiming system
  setTimeout(() => { initWoTAiming(); }, 1000);`;

htmlContent = safeReplace(htmlContent, gameStartPoint, gameStartWithInit, 'Initialize WoT system on startup');

fs.writeFileSync('public/index.html', htmlContent);

console.log('\n✅ WoT-Style Direct Shooting System Implementation Complete!');
console.log('📋 Features Added:');
console.log('   • Basic aiming mode toggle system');
console.log('   • Press T key to switch between Direct/Auto modes');  
console.log('   • Visual crosshair for direct aiming');
console.log('   • State management for aiming modes');
console.log('   • Combat log notifications');
console.log('\n🎮 Controls:');
console.log('   • T = Toggle between Direct/Auto aiming modes');
console.log('   • Direct Mode = Fire where you point (like World of Tanks)');
console.log('   • Auto Mode = Locks onto targets automatically');
console.log('\n⚡ Next: Enhance weapon firing functions with aiming logic');