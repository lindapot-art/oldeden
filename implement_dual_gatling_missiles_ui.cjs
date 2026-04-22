#!/usr/bin/env node
// 🚀 DUAL GATLING GUNS + MISSILE BAYS + SLEEK UI PATCH
// Replaces railgun with dual weapons + modern minimal UI

const fs = require('fs');
const path = require('path');

function safeReplace(content, oldStr, newStr) {
    if (!content.includes(oldStr)) {
        console.warn('⚠️ Pattern not found:', oldStr.slice(0, 100));
        return content;
    }
    return content.replace(oldStr, newStr);
}

function cr(str) {
    return str.replace(/\n/g, '\r\n');
}

console.log('🚀 IMPLEMENTING DUAL GATLING GUNS + MISSILE BAYS + SLEEK UI...');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. UPDATE WEAPON SYSTEM - Replace railgun with dual gatling + missiles
html = safeReplace(html, `  weaponProgression: {
    unlockedWeapons: ['railgun'],
    upgradePoints: 0,
    currentWeapon: 'railgun',
    weaponExperience: {
      railgun: { xp: 0, level: 1 },`, 
cr(`  weaponProgression: {
    unlockedWeapons: ['dual-gatling', 'vector-missiles'],
    upgradePoints: 0,
    currentWeapon: 'dual-gatling',
    weaponExperience: {
      'dual-gatling': { xp: 0, level: 1, fireRate: 8, damage: 25 },
      'vector-missiles': { xp: 0, level: 1, fireRate: 2, damage: 150 },`));

// 2. UPDATE CSS VARIABLES - Remove chrome, make light and minimal
html = safeReplace(html, `      --bg: #0a0a0f;
      --gold: #e0b15f;
      --blue: #6bc4ff;
        --green: #00ff88;
      --muted: #96a3bc;
      --panel-solid: #121925;
      --panel: #1c2535;
      --border: #314157;
      --text: #eef4ff;
        --warn: #ffaa00;
        --danger: #ff4444;
        --hud: #44aaff;
      --panel-glass: linear-gradient(180deg, rgba(16,24,38,0.92), rgba(8,12,20,0.88));
      --chrome-shadow: 0 24px 64px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04);`,
cr(`      --bg: #fafbfc;
      --gold: #f4a261;
      --blue: #2a9d8f;
        --green: #06d6a0;
      --muted: #6c757d;
      --panel-solid: rgba(255,255,255,0.95);
      --panel: rgba(255,255,255,0.85);
      --border: rgba(0,0,0,0.08);
      --text: #212529;
        --warn: #f77f00;
        --danger: #e63946;
        --hud: #2a9d8f;
      --panel-glass: rgba(255,255,255,0.75);
      --chrome-shadow: none;`));

// 3. UPDATE BODY BACKGROUND - Light modern theme
html = safeReplace(html, 
`html, body { margin: 0; padding: 0; font-family: 'Bahnschrift', 'Segoe UI Variable Display', 'Trebuchet MS', sans-serif; background: radial-gradient(circle at top, #162132 0%, #090d15 48%, #04070c 100%); color: var(--text); min-height: 100vh; }`,
cr(`html, body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); color: var(--text); min-height: 100vh; font-weight: 400; }`));

// 4. ADD DUAL GATLING WEAPONS SYSTEM
const weaponSystem = `
// ── DUAL GATLING + MISSILE SYSTEM ──
const dualWeapons = {
  gatling: {
    barrels: 2,
    fireRate: 120, // RPM per barrel
    lastFire: [0, 0],
    alternateBarrel: 0,
    damage: 25,
    range: 800,
    spread: 0.05,
    sound: null
  },
  missiles: {
    capacity: 6,
    reloadTime: 3000,
    lastReload: 0,
    damage: 150,
    range: 1200,
    lockTime: 1500,
    currentTarget: null,
    targetLockStart: 0,
    sound: null
  },
  autoFire: {
    enabled: true,
    range: 600,
    engageDistance: 500
  }
};

// Initialize weapon sounds
function initWeaponSounds() {
  try {
    // Gatling gun sound (synthesized)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function createGatlingSound() {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filterNode = audioContext.createBiquadFilter();
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(120, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.1);
      
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(800, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
    
    function createMissileSound() {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(50, audioContext.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
    
    dualWeapons.gatling.sound = createGatlingSound;
    dualWeapons.missiles.sound = createMissileSound;
    
  } catch (error) {
    console.warn('Audio context not available:', error);
  }
}

// Dual gatling firing system
function fireDualGatling() {
  const now = Date.now();
  const fireDelay = 60000 / dualWeapons.gatling.fireRate; // Convert RPM to ms
  
  const barrel = dualWeapons.gatling.alternateBarrel;
  if (now - dualWeapons.gatling.lastFire[barrel] < fireDelay) return;
  
  // Fire from current barrel
  const spread = (Math.random() - 0.5) * dualWeapons.gatling.spread;
  const angle = player.rotation + spread;
  
  // Barrel offset for dual positioning
  const barrelOffset = barrel === 0 ? -15 : 15;
  const offsetX = Math.cos(player.rotation + Math.PI/2) * barrelOffset;
  const offsetZ = Math.sin(player.rotation + Math.PI/2) * barrelOffset;
  
  const projectile = {
    position: new THREE.Vector3(
      player.position.x + offsetX,
      player.position.y + 2,
      player.position.z + offsetZ
    ),
    velocity: new THREE.Vector3(
      Math.cos(angle) * player.projectileSpeed,
      0,
      Math.sin(angle) * player.projectileSpeed
    ),
    life: 1.0,
    damage: dualWeapons.gatling.damage,
    type: 'gatling'
  };
  
  // Create visual projectile
  const geometry = new THREE.SphereGeometry(0.3);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0xff6b35,
    emissive: 0xff6b35,
    emissiveIntensity: 0.5
  });
  projectile.mesh = new THREE.Mesh(geometry, material);
  projectile.mesh.position.copy(projectile.position);
  scene.add(projectile.mesh);
  
  if (!player.projectiles) player.projectiles = [];
  player.projectiles.push(projectile);
  
  // Play sound
  if (dualWeapons.gatling.sound) {
    try { dualWeapons.gatling.sound(); } catch(e) {}
  }
  
  // Update firing state
  dualWeapons.gatling.lastFire[barrel] = now;
  dualWeapons.gatling.alternateBarrel = 1 - barrel; // Alternate barrels
}

// Vector missile system
function fireVectorMissile(targetEnemy) {
  const now = Date.now();
  
  if (now - dualWeapons.missiles.lastReload < dualWeapons.missiles.reloadTime) return;
  
  if (!targetEnemy) return;
  
  const missile = {
    position: new THREE.Vector3(
      player.position.x,
      player.position.y + 5,
      player.position.z
    ),
    velocity: new THREE.Vector3(0, 0, 0),
    target: targetEnemy,
    life: 1.0,
    damage: dualWeapons.missiles.damage,
    speed: 40,
    tracking: 0.05,
    type: 'missile'
  };
  
  // Create visual missile
  const geometry = new THREE.ConeGeometry(0.5, 3);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 0.3
  });
  missile.mesh = new THREE.Mesh(geometry, material);
  missile.mesh.position.copy(missile.position);
  scene.add(missile.mesh);
  
  if (!player.projectiles) player.projectiles = [];
  player.projectiles.push(missile);
  
  // Play sound
  if (dualWeapons.missiles.sound) {
    try { dualWeapons.missiles.sound(); } catch(e) {}
  }
  
  dualWeapons.missiles.lastReload = now;
}

// Auto-targeting system
function findNearestEnemy() {
  if (!enemies || enemies.length === 0) return null;
  
  let nearestEnemy = null;
  let nearestDistance = Infinity;
  
  enemies.forEach(enemy => {
    if (!enemy || !enemy.position) return;
    
    const distance = player.position.distanceTo(enemy.position);
    if (distance < nearestDistance && distance <= dualWeapons.autoFire.range) {
      nearestDistance = distance;
      nearestEnemy = enemy;
    }
  });
  
  return nearestEnemy;
}

// Auto-fire system
function updateAutoFire() {
  if (!dualWeapons.autoFire.enabled) return;
  
  const nearestEnemy = findNearestEnemy();
  
  if (nearestEnemy) {
    const distance = player.position.distanceTo(nearestEnemy.position);
    
    // Fire gatling at close range
    if (distance <= dualWeapons.autoFire.engageDistance) {
      fireDualGatling();
    }
    
    // Fire missiles at longer range with lock-on
    if (distance > 400 && distance <= dualWeapons.autoFire.range) {
      const now = Date.now();
      
      if (dualWeapons.missiles.currentTarget === nearestEnemy) {
        if (now - dualWeapons.missiles.targetLockStart >= dualWeapons.missiles.lockTime) {
          fireVectorMissile(nearestEnemy);
          dualWeapons.missiles.currentTarget = null;
        }
      } else {
        dualWeapons.missiles.currentTarget = nearestEnemy;
        dualWeapons.missiles.targetLockStart = now;
      }
    }
  } else {
    dualWeapons.missiles.currentTarget = null;
  }
}

// Enhanced projectile update with missile tracking
function updateDualWeaponProjectiles() {
  if (!player.projectiles) return;
  
  for (let i = player.projectiles.length - 1; i >= 0; i--) {
    const projectile = player.projectiles[i];
    if (!projectile) continue;
    
    if (projectile.type === 'missile' && projectile.target) {
      // Missile tracking
      const targetPos = projectile.target.position;
      if (targetPos) {
        const direction = targetPos.clone().sub(projectile.position).normalize();
        projectile.velocity.lerp(direction.multiplyScalar(projectile.speed), projectile.tracking);
      }
    }
    
    // Update position
    projectile.position.add(projectile.velocity.clone().multiplyScalar(1/60));
    
    if (projectile.mesh) {
      projectile.mesh.position.copy(projectile.position);
      
      // Orient missiles toward velocity
      if (projectile.type === 'missile') {
        projectile.mesh.lookAt(
          projectile.position.clone().add(projectile.velocity.normalize())
        );
      }
    }
    
    // Check collisions with enemies
    if (enemies) {
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (!enemy || !enemy.position) continue;
        
        const distance = projectile.position.distanceTo(enemy.position);
        if (distance < 8) {
          // Hit!
          enemy.health -= projectile.damage;
          
          // Create explosion effect
          createExplosion(projectile.position, projectile.type === 'missile' ? 2 : 1);
          
          // Remove projectile
          if (projectile.mesh) scene.remove(projectile.mesh);
          player.projectiles.splice(i, 1);
          
          // Remove enemy if destroyed
          if (enemy.health <= 0) {
            destroyEnemy(enemy, j);
          }
          break;
        }
      }
    }
    
    // Remove old projectiles
    projectile.life -= 1/60 * 0.5;
    if (projectile.life <= 0) {
      if (projectile.mesh) scene.remove(projectile.mesh);
      player.projectiles.splice(i, 1);
    }
  }
}

// Explosion effect system
function createExplosion(position, scale = 1) {
  try {
    const particles = 12 * scale;
    
    for (let i = 0; i < particles; i++) {
      const particle = {
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 30 * scale,
          Math.random() * 20 * scale,
          (Math.random() - 0.5) * 30 * scale
        ),
        life: 1.0,
        scale: scale
      };
      
      const geometry = new THREE.SphereGeometry(0.5 * scale);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.1, 1, 0.5 + Math.random() * 0.5),
        emissive: new THREE.Color().setHSL(0.1, 1, 0.3),
        transparent: true
      });
      
      particle.mesh = new THREE.Mesh(geometry, material);
      particle.mesh.position.copy(particle.position);
      scene.add(particle.mesh);
      
      if (!window.explosionParticles) window.explosionParticles = [];
      window.explosionParticles.push(particle);
    }
  } catch (error) {
    console.warn('Explosion creation failed:', error);
  }
}

// Update explosion particles
function updateExplosions() {
  if (!window.explosionParticles) return;
  
  for (let i = window.explosionParticles.length - 1; i >= 0; i--) {
    const particle = window.explosionParticles[i];
    if (!particle) continue;
    
    particle.position.add(particle.velocity.clone().multiplyScalar(1/60));
    particle.velocity.multiplyScalar(0.95); // Friction
    particle.velocity.y -= 9.8 * (1/60); // Gravity
    particle.life -= 1/60 * 2;
    
    if (particle.mesh) {
      particle.mesh.position.copy(particle.position);
      particle.mesh.material.opacity = particle.life;
    }
    
    if (particle.life <= 0) {
      if (particle.mesh) scene.remove(particle.mesh);
      window.explosionParticles.splice(i, 1);
    }
  }
}

// Initialize weapons on game start
setTimeout(() => {
  initWeaponSounds();
  console.log('🚀 Dual gatling guns and vector missiles initialized');
}, 1000);
`;

// Insert weapon system after the boss system
html = safeReplace(html, `  // ── Boss Encounters System ──`, 
cr(weaponSystem + `\r\n  // ── Boss Encounters System ──`));

// 5. ADD MODERN WEAPON HUD
const weaponHUD = `
<!-- Modern Weapon HUD -->
<div id="weapon-hud" style="
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--panel-glass);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  min-width: 200px;
  z-index: 90;
  font-size: 0.85rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
">
  <div style="color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
    Weapon Systems
  </div>
  
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 16 16" style="fill: var(--blue);">
        <path d="M2 4h12v2H2V4zm0 4h12v2H2V8zm0 4h12v2H2v-2z"/>
      </svg>
      <span>Dual Gatling</span>
    </div>
    <span id="gatling-ammo" style="color: var(--green); font-weight: 600;">∞</span>
  </div>
  
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 16 16" style="fill: var(--gold);">
        <path d="M8 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/>
      </svg>
      <span>Vector Missiles</span>
    </div>
    <span id="missile-count" style="color: var(--gold); font-weight: 600;">6</span>
  </div>
  
  <div style="height: 1px; background: var(--border); margin: 12px 0;"></div>
  
  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
    <span style="color: var(--muted);">Auto-Fire</span>
    <span id="autofire-status" style="color: var(--green); font-weight: 600;">ACTIVE</span>
  </div>
  
  <div id="target-lock" style="
    margin-top: 8px; 
    padding: 6px 8px; 
    background: rgba(42, 157, 143, 0.1); 
    border-radius: 6px; 
    font-size: 0.7rem; 
    text-transform: uppercase; 
    letter-spacing: 0.05em;
    display: none;
  ">
    <span style="color: var(--blue);">TARGET LOCKED</span>
    <div style="width: 100%; height: 2px; background: rgba(42, 157, 143, 0.2); margin-top: 4px; border-radius: 1px;">
      <div id="lock-progress" style="height: 100%; background: var(--blue); border-radius: 1px; width: 0%; transition: width 0.1s;"></div>
    </div>
  </div>
</div>

<!-- Targeting Crosshair -->
<div id="targeting-crosshair" style="
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 85;
  display: none;
">
  <svg width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(42, 157, 143, 0.6)" stroke-width="1"/>
    <line x1="20" y1="2" x2="20" y2="8" stroke="rgba(42, 157, 143, 0.8)" stroke-width="1"/>
    <line x1="20" y1="32" x2="20" y2="38" stroke="rgba(42, 157, 143, 0.8)" stroke-width="1"/>
    <line x1="2" y1="20" x2="8" y2="20" stroke="rgba(42, 157, 143, 0.8)" stroke-width="1"/>
    <line x1="32" y1="20" x2="38" y2="20" stroke="rgba(42, 157, 143, 0.8)" stroke-width="1"/>
  </svg>
</div>
`;

// Insert HUD before closing body tag
html = safeReplace(html, `</body>`, cr(weaponHUD + `\r\n</body>`));

// 6. ADD HUD UPDATE SYSTEM
const hudSystem = `
// ── WEAPON HUD UPDATE SYSTEM ──
function updateWeaponHUD() {
  try {
    // Update missile count
    const missileElement = document.getElementById('missile-count');
    if (missileElement) {
      const now = Date.now();
      const reloading = (now - dualWeapons.missiles.lastReload) < dualWeapons.missiles.reloadTime;
      missileElement.textContent = reloading ? 'RELOAD' : '6';
      missileElement.style.color = reloading ? 'var(--warn)' : 'var(--gold)';
    }
    
    // Update auto-fire status
    const autoFireElement = document.getElementById('autofire-status');
    if (autoFireElement) {
      autoFireElement.textContent = dualWeapons.autoFire.enabled ? 'ACTIVE' : 'MANUAL';
      autoFireElement.style.color = dualWeapons.autoFire.enabled ? 'var(--green)' : 'var(--muted)';
    }
    
    // Update target lock display
    const targetLockElement = document.getElementById('target-lock');
    const lockProgressElement = document.getElementById('lock-progress');
    const crosshairElement = document.getElementById('targeting-crosshair');
    
    if (dualWeapons.missiles.currentTarget) {
      const now = Date.now();
      const lockProgress = Math.min(1, (now - dualWeapons.missiles.targetLockStart) / dualWeapons.missiles.lockTime);
      
      if (targetLockElement) {
        targetLockElement.style.display = 'block';
        targetLockElement.style.background = lockProgress >= 1 ? 
          'rgba(6, 214, 160, 0.15)' : 'rgba(42, 157, 143, 0.1)';
      }
      
      if (lockProgressElement) {
        lockProgressElement.style.width = (lockProgress * 100) + '%';
        lockProgressElement.style.background = lockProgress >= 1 ? 'var(--green)' : 'var(--blue)';
      }
      
      if (crosshairElement) {
        crosshairElement.style.display = 'block';
      }
    } else {
      if (targetLockElement) targetLockElement.style.display = 'none';
      if (crosshairElement) crosshairElement.style.display = 'none';
    }
    
  } catch (error) {
    // Silent fail for HUD updates
  }
}
`;

// Insert HUD system after weapon system
html = safeReplace(html, `setTimeout(() => {
  initWeaponSounds();
  console.log('🚀 Dual gatling guns and vector missiles initialized');
}, 1000);`, 
cr(`setTimeout(() => {
  initWeaponSounds();
  console.log('🚀 Dual gatling guns and vector missiles initialized');
}, 1000);

${hudSystem}`));

// 7. INTEGRATE WITH GAME LOOP - Add calls to update functions
html = safeReplace(html, `        // Polish and optimization updates`, 
cr(`        // Dual weapon system updates
        try {
          updateAutoFire();
          updateDualWeaponProjectiles();
          updateExplosions();
          updateWeaponHUD();
        } catch (error) {
          console.warn('Weapon system error:', error);
        }
        
        // Polish and optimization updates`));

// 8. REMOVE CHROME SHADOWS FROM EXISTING ELEMENTS
html = html.replace(/box-shadow:\s*var\(--chrome-shadow\);/g, '');

// 9. ADD MANUAL FIRING CONTROLS
const manualControls = `
// ── MANUAL WEAPON CONTROLS ──
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    fireDualGatling();
  }
  
  if (event.code === 'KeyF') {
    event.preventDefault();
    const target = findNearestEnemy();
    if (target) fireVectorMissile(target);
  }
  
  if (event.code === 'KeyG') {
    event.preventDefault();
    dualWeapons.autoFire.enabled = !dualWeapons.autoFire.enabled;
    console.log('Auto-fire:', dualWeapons.autoFire.enabled ? 'ENABLED' : 'DISABLED');
  }
});
`;

// Insert manual controls after HUD system
html = safeReplace(html, hudSystem, hudSystem + cr('\r\n' + manualControls));

// 10. WRITE THE UPDATED FILE
fs.writeFileSync('public/index.html', html);

console.log('✅ DUAL GATLING GUNS + MISSILE BAYS + SLEEK UI IMPLEMENTED!');
console.log('🎮 Controls:');
console.log('   Space - Manual gatling fire');
console.log('   F - Manual missile fire'); 
console.log('   G - Toggle auto-fire');
console.log('💡 Features:');
console.log('   • Dual alternating gatling guns');
console.log('   • Vector-tracking missiles');
console.log('   • Auto-targeting system');
console.log('   • Modern minimal UI design');
console.log('   • Light theme with transparency');
console.log('   • Explosion effects');
console.log('   • Real-time weapon HUD');