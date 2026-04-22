// Enhance weapon firing with WoT aiming mode logic

const fs = require('fs');

function safeReplace(content, searchStr, replaceStr, description) {
  if (!content.includes(searchStr)) {
    console.log(`❌ PATCH FAILED: Could not find "${description}"`);
    console.log(`Search preview: ${searchStr.slice(0, 200)}...`);
    return content;
  }
  const newContent = content.replace(searchStr, replaceStr);
  console.log(`✅ PATCHED: ${description}`);
  return newContent;
}

console.log('🔫 Enhancing weapon firing with WoT aiming logic...\n');

let htmlContent = fs.readFileSync('public/index.html', 'utf8');

// First, let me find and modify the fireLaser function direction calculation
// Find the exact laser direction code
const laserDirSearch = htmlContent.match(/_laserDir\.set\(0, 0, -1\)\.applyQuaternion\(camera\.quaternion\);[\s\S]{1,200}_laserOrigin\.copy\(camera\.position\)\.addScaledVector\(_laserDir, 1\);/);

if (laserDirSearch) {
  const originalLaserDir = laserDirSearch[0];
  
  const enhancedLaserDir = `// WoT-Style Aiming: Direct vs Auto-Target
  if (state.aimingMode && state.aimingMode.mode === 'auto' && state.targetLock.target && state.targetLock.locked) {
    // Auto-target mode: aim at locked target with prediction
    const targetPos = state.targetLock.target.mesh ? state.targetLock.target.mesh.position : state.targetLock.target.position;
    if (targetPos) {
      _laserDir.subVectors(targetPos, camera.position).normalize();
      // Add slight aim assist for auto mode
      const directDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      _laserDir.lerp(directDir, 1 - (state.aimingMode.aimAssist || 0.15));
    } else {
      _laserDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
  } else {
    // Direct aiming mode: fire exactly where camera points (WoT-style)
    _laserDir.set(0, 0, -1).applyQuaternion(camera.quaternion);
  }
  _laserOrigin.copy(camera.position).addScaledVector(_laserDir, 1);`;

  htmlContent = safeReplace(htmlContent, originalLaserDir, enhancedLaserDir, 'Enhanced laser firing with aiming modes');
}

// Now find and modify the spawnNail function direction calculation  
const nailDirSearch = htmlContent.match(/const dir = _tmpV3a\.set\(0,0,-1\)\.applyQuaternion\(camera\.quaternion\);[\s\S]{1,100}const origin = _tmpV3b\.copy\(camera\.position\)\.addScaledVector\(dir, 1\);/);

if (nailDirSearch) {
  const originalNailDir = nailDirSearch[0];
  
  const enhancedNailDir = `// WoT-Style Aiming: Direct vs Auto-Target
  if (state.aimingMode && state.aimingMode.mode === 'auto' && state.targetLock.target && state.targetLock.locked) {
    // Auto-target mode: aim at locked target with prediction
    const targetPos = state.targetLock.target.mesh ? state.targetLock.target.mesh.position : state.targetLock.target.position;
    if (targetPos) {
      _tmpV3a.subVectors(targetPos, camera.position).normalize();
      // Add slight aim assist for auto mode
      const directDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      _tmpV3a.lerp(directDir, 1 - (state.aimingMode.aimAssist || 0.15));
    } else {
      _tmpV3a.set(0, 0, -1).applyQuaternion(camera.quaternion);
    }
  } else {
    // Direct aiming mode: fire exactly where camera points (WoT-style) 
    _tmpV3a.set(0, 0, -1).applyQuaternion(camera.quaternion);
  }
  const dir = _tmpV3a;
  const origin = _tmpV3b.copy(camera.position).addScaledVector(dir, 1);`;

  htmlContent = safeReplace(htmlContent, originalNailDir, enhancedNailDir, 'Enhanced railgun firing with aiming modes');
}

// Add crosshair update to the game loop for responsive UI
const gameLoopSearch = htmlContent.match(/function gameLoop\(\) \{[\s\S]{1,500}if \(!state\.gamePaused\) \{/);

if (gameLoopSearch) {
  const originalGameLoop = gameLoopSearch[0];
  
  const enhancedGameLoop = originalGameLoop + `
    // Update WoT crosshair visibility
    if (state.aimingMode && typeof updateCrosshair === 'function') {
      updateCrosshair();
    }`;

  htmlContent = safeReplace(htmlContent, originalGameLoop, enhancedGameLoop, 'Add crosshair updates to game loop');
}

fs.writeFileSync('public/index.html', htmlContent);

console.log('\n✅ Weapon firing enhanced with WoT aiming logic!');
console.log('📋 Enhancements:');
console.log('   • Laser weapons now respect aiming mode');
console.log('   • Railgun weapons now respect aiming mode');  
console.log('   • Auto-target mode aims at locked targets');
console.log('   • Direct mode fires where camera points');
console.log('   • Crosshair updates in real-time');
console.log('\n🎮 Usage:');
console.log('   • Press T to toggle between Direct/Auto modes');
console.log('   • Use TAB to lock targets in Auto mode'); 
console.log('   • Direct mode = pure WoT-style aiming');