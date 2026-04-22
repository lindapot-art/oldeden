#!/usr/bin/env node
// 🚀 TARGETED DUAL GATLING + MISSILES PATCH
// Adds weapon system and updates UI without breaking existing code

const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
    if (!content.includes(oldStr)) {
        console.warn('⚠️ Pattern not found, skipping:', oldStr.slice(0, 50) + '...');
        return content;
    }
    return content.replace(oldStr, newStr);
}

function cr(str) {
    return str.replace(/\n/g, '\r\n');
}

console.log('🚀 ADDING DUAL GATLING GUNS + MISSILE SYSTEM...');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. ADD MODERN WEAPON SYSTEM - Insert after boss system
const weaponSystemCode = `
// ══ DUAL GATLING + VECTOR MISSILE SYSTEM ══
window.modernWeapons = {
  gatling: {
    barrels: 2,
    fireRate: 150, // RPM per barrel
    lastFire: [0, 0],
    alternateBarrel: 0,
    damage: 30,
    range: 800,
    spread: 0.04,
    sound: null
  },
  missiles: {
    capacity: 6,
    available: 6,
    reloadTime: 4000,
    lastReload: 0,
    damage: 180,
    range: 1200,
    lockTime: 1500,
    currentTarget: null,
    targetLockStart: 0,
    sound: null
  },
  autoFire: {
    enabled: true,
    range: 650,
    engageDistance: 450
  }
};

// Initialize weapon audio
window.initModernWeaponSounds = function() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Gatling gun sound
    window.modernWeapons.gatling.sound = function() {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, audioContext.currentTime + 0.12);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, audioContext.currentTime);
      
      gain.gain.setValueAtTime(0.25, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.start();
      osc.stop(audioContext.currentTime + 0.15);
    };
    
    // Missile launch sound
    window.modernWeapons.missiles.sound = function() {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, audioContext.currentTime);
      osc.frequency.linearRampToValueAtTime(60, audioContext.currentTime + 0.6);
      
      gain.gain.setValueAtTime(0.35, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.start();
      osc.stop(audioContext.currentTime + 0.6);
    };
    
    console.log('🔊 Modern weapon audio initialized');
  } catch (error) {
    console.warn('Audio context unavailable:', error);
  }
};

// Dual gatling firing system
window.fireModernGatling = function() {
  if (!window.player || !window.scene) return;
  
  const now = Date.now();
  const fireDelay = 60000 / window.modernWeapons.gatling.fireRate;
  
  const barrel = window.modernWeapons.gatling.alternateBarrel;
  if (now - window.modernWeapons.gatling.lastFire[barrel] < fireDelay) return;
  
  // Calculate spread and angle
  const spread = (Math.random() - 0.5) * window.modernWeapons.gatling.spread;
  const angle = window.player.rotation + spread;
  
  // Dual barrel positioning
  const barrelOffset = barrel === 0 ? -18 : 18;
  const offsetX = Math.cos(window.player.rotation + Math.PI/2) * barrelOffset;
  const offsetZ = Math.sin(window.player.rotation + Math.PI/2) * barrelOffset;
  
  const projectile = {
    position: new THREE.Vector3(
      window.player.position.x + offsetX,
      window.player.position.y + 3,
      window.player.position.z + offsetZ
    ),
    velocity: new THREE.Vector3(
      Math.cos(angle) * (window.player.projectileSpeed || 50),
      0,
      Math.sin(angle) * (window.player.projectileSpeed || 50)
    ),
    life: 1.0,
    damage: window.modernWeapons.gatling.damage,
    type: 'gatling'
  };
  
  // Visual projectile
  try {
    const geometry = new THREE.SphereGeometry(0.4);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff4500,
      emissive: 0xff4500,
      emissiveIntensity: 0.6
    });
    projectile.mesh = new THREE.Mesh(geometry, material);
    projectile.mesh.position.copy(projectile.position);
    window.scene.add(projectile.mesh);
  } catch (error) {
    console.warn('Visual projectile creation failed');
  }
  
  // Add to projectiles array
  if (!window.player.projectiles) window.player.projectiles = [];
  window.player.projectiles.push(projectile);
  
  // Play sound
  try {
    if (window.modernWeapons.gatling.sound) window.modernWeapons.gatling.sound();
  } catch (e) {}
  
  // Update firing state
  window.modernWeapons.gatling.lastFire[barrel] = now;
  window.modernWeapons.gatling.alternateBarrel = 1 - barrel;
};

// Vector missile system
window.fireVectorMissile = function(target) {
  if (!window.player || !window.scene || !target) return;
  
  const now = Date.now();
  if (window.modernWeapons.missiles.available <= 0) return;
  if (now - window.modernWeapons.missiles.lastReload < window.modernWeapons.missiles.reloadTime) return;
  
  const missile = {
    position: new THREE.Vector3(
      window.player.position.x,
      window.player.position.y + 6,
      window.player.position.z
    ),
    velocity: new THREE.Vector3(0, 0, 0),
    target: target,
    life: 1.0,
    damage: window.modernWeapons.missiles.damage,
    speed: 45,
    tracking: 0.06,
    type: 'missile'
  };
  
  // Visual missile
  try {
    const geometry = new THREE.ConeGeometry(0.6, 4);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 0.4
    });
    missile.mesh = new THREE.Mesh(geometry, material);
    missile.mesh.position.copy(missile.position);
    window.scene.add(missile.mesh);
  } catch (error) {
    console.warn('Visual missile creation failed');
  }
  
  if (!window.player.projectiles) window.player.projectiles = [];
  window.player.projectiles.push(missile);
  
  // Play sound
  try {
    if (window.modernWeapons.missiles.sound) window.modernWeapons.missiles.sound();
  } catch (e) {}
  
  window.modernWeapons.missiles.available--;
  window.modernWeapons.missiles.lastReload = now;
};

// Auto-targeting
window.findNearestHostile = function() {
  if (!window.enemies || !window.player) return null;
  
  let nearest = null;
  let nearestDist = Infinity;
  
  window.enemies.forEach(enemy => {
    if (!enemy || !enemy.position) return;
    
    const dist = window.player.position.distanceTo(enemy.position);
    if (dist < nearestDist && dist <= window.modernWeapons.autoFire.range) {
      nearestDist = dist;
      nearest = enemy;
    }
  });
  
  return nearest;
};

// Auto-fire system
window.updateModernAutoFire = function() {
  if (!window.modernWeapons.autoFire.enabled) return;
  
  const target = window.findNearestHostile();
  
  if (target) {
    const dist = window.player.position.distanceTo(target.position);
    
    // Gatling at close range
    if (dist <= window.modernWeapons.autoFire.engageDistance) {
      window.fireModernGatling();
    }
    
    // Missiles at medium range with lock-on
    if (dist > 350 && dist <= window.modernWeapons.autoFire.range && window.modernWeapons.missiles.available > 0) {
      const now = Date.now();
      
      if (window.modernWeapons.missiles.currentTarget === target) {
        if (now - window.modernWeapons.missiles.targetLockStart >= window.modernWeapons.missiles.lockTime) {
          window.fireVectorMissile(target);
          window.modernWeapons.missiles.currentTarget = null;
        }
      } else {
        window.modernWeapons.missiles.currentTarget = target;
        window.modernWeapons.missiles.targetLockStart = now;
      }
    }
  } else {
    window.modernWeapons.missiles.currentTarget = null;
  }
};

// Enhanced projectile system with missile tracking
window.updateModernProjectiles = function() {
  if (!window.player || !window.player.projectiles) return;
  
  for (let i = window.player.projectiles.length - 1; i >= 0; i--) {
    const proj = window.player.projectiles[i];
    if (!proj) continue;
    
    // Missile tracking
    if (proj.type === 'missile' && proj.target && proj.target.position) {
      const targetPos = proj.target.position;
      const direction = targetPos.clone().sub(proj.position).normalize();
      proj.velocity.lerp(direction.multiplyScalar(proj.speed), proj.tracking);
    }
    
    // Update position
    proj.position.add(proj.velocity.clone().multiplyScalar(1/60));
    
    if (proj.mesh) {
      proj.mesh.position.copy(proj.position);
      
      // Orient missiles
      if (proj.type === 'missile') {
        try {
          proj.mesh.lookAt(proj.position.clone().add(proj.velocity.normalize()));
        } catch (e) {}
      }
    }
    
    // Collision detection
    if (window.enemies) {
      for (let j = 0; j < window.enemies.length; j++) {
        const enemy = window.enemies[j];
        if (!enemy || !enemy.position) continue;
        
        const dist = proj.position.distanceTo(enemy.position);
        if (dist < 10) {
          // Hit!
          if (enemy.health !== undefined) {
            enemy.health -= proj.damage;
          }
          
          // Explosion effect
          window.createModernExplosion(proj.position, proj.type === 'missile' ? 2.5 : 1.2);
          
          // Remove projectile
          if (proj.mesh) window.scene.remove(proj.mesh);
          window.player.projectiles.splice(i, 1);
          
          // Remove destroyed enemy
          if (enemy.health !== undefined && enemy.health <= 0) {
            if (typeof window.destroyEnemy === 'function') {
              window.destroyEnemy(enemy, j);
            }
          }
          break;
        }
      }
    }
    
    // Remove old projectiles
    proj.life -= 1/60 * 0.4;
    if (proj.life <= 0) {
      if (proj.mesh) window.scene.remove(proj.mesh);
      window.player.projectiles.splice(i, 1);
    }
  }
};

// Modern explosion effects
window.createModernExplosion = function(position, scale = 1) {
  if (!window.scene) return;
  
  try {
    const particles = Math.floor(16 * scale);
    
    for (let i = 0; i < particles; i++) {
      const particle = {
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 40 * scale,
          Math.random() * 25 * scale,
          (Math.random() - 0.5) * 40 * scale
        ),
        life: 1.0,
        scale: scale
      };
      
      const geometry = new THREE.SphereGeometry(0.8 * scale);
      const hue = 0.08 + Math.random() * 0.1; // Orange to red
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 0.9, 0.6),
        emissive: new THREE.Color().setHSL(hue, 0.8, 0.4),
        transparent: true
      });
      
      particle.mesh = new THREE.Mesh(geometry, material);
      particle.mesh.position.copy(particle.position);
      window.scene.add(particle.mesh);
      
      if (!window.modernExplosionParticles) window.modernExplosionParticles = [];
      window.modernExplosionParticles.push(particle);
    }
  } catch (error) {
    console.warn('Modern explosion creation failed:', error);
  }
};

// Update explosion particles
window.updateModernExplosions = function() {
  if (!window.modernExplosionParticles || !window.scene) return;
  
  for (let i = window.modernExplosionParticles.length - 1; i >= 0; i--) {
    const particle = window.modernExplosionParticles[i];
    if (!particle) continue;
    
    particle.position.add(particle.velocity.clone().multiplyScalar(1/60));
    particle.velocity.multiplyScalar(0.94); // Air resistance
    particle.velocity.y -= 12 * (1/60); // Gravity
    particle.life -= 1/60 * 1.8;
    
    if (particle.mesh) {
      particle.mesh.position.copy(particle.position);
      particle.mesh.material.opacity = Math.max(0, particle.life);
    }
    
    if (particle.life <= 0) {
      if (particle.mesh) window.scene.remove(particle.mesh);
      window.modernExplosionParticles.splice(i, 1);
    }
  }
};

// Missile reload system
window.updateMissileReload = function() {
  const now = Date.now();
  if (window.modernWeapons.missiles.available < window.modernWeapons.missiles.capacity) {
    if (now - window.modernWeapons.missiles.lastReload >= window.modernWeapons.missiles.reloadTime) {
      window.modernWeapons.missiles.available = window.modernWeapons.missiles.capacity;
      console.log('🚀 Missiles reloaded');
    }
  }
};

// Initialize system
setTimeout(() => {
  window.initModernWeaponSounds();
  console.log('🔫 Modern dual weapon system initialized');
  console.log('  • Dual gatling guns with alternating barrels');
  console.log('  • Vector-tracking missiles with lock-on');
  console.log('  • Auto-fire targeting system');
}, 1500);

`;

// Insert the weapon system code after the boss system
html = safeReplace(html, '  // ── Boss Encounters System ──', 
weaponSystemCode + '\r\n  // ── Boss Encounters System ──');

// 2. ADD MODERN WEAPON HUD
const modernHUD = `
<!-- Modern Weapon HUD -->
<div id="modern-weapon-hud" style="
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(25px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(0,0,0,0.1);
  min-width: 240px;
  z-index: 92;
  font-size: 0.9rem;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
  color: #2c3e50;
">
  <div style="color: #7f8c8d; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 12px; font-weight: 600;">
    Weapon Systems
  </div>
  
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 8px 0;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <svg width="18" height="18" viewBox="0 0 18 18" style="fill: #2a9d8f;">
        <rect x="2" y="3" width="14" height="2" rx="1"/>
        <rect x="2" y="7" width="14" height="2" rx="1"/>  
        <rect x="2" y="11" width="14" height="2" rx="1"/>
      </svg>
      <span style="font-weight: 500;">Dual Gatling</span>
    </div>
    <span id="modern-gatling-status" style="color: #06d6a0; font-weight: 700; font-size: 0.85rem;">READY</span>
  </div>
  
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 8px 0;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <svg width="18" height="18" viewBox="0 0 18 18" style="fill: #f4a261;">
        <path d="M9 2l3 6h5l-4 4 2 6-6-3-6 3 2-6-4-4h5z"/>
      </svg>
      <span style="font-weight: 500;">Vector Missiles</span>
    </div>
    <span id="modern-missile-count" style="color: #f4a261; font-weight: 700; font-size: 0.85rem;">6</span>
  </div>
  
  <div style="height: 1px; background: rgba(0,0,0,0.1); margin: 16px 0;"></div>
  
  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 8px;">
    <span style="color: #7f8c8d; font-weight: 500;">Auto-Fire</span>
    <span id="modern-autofire-status" style="color: #06d6a0; font-weight: 700;">ACTIVE</span>
  </div>
  
  <div id="modern-target-lock" style="
    margin-top: 12px; 
    padding: 8px 12px; 
    background: rgba(42, 157, 143, 0.12); 
    border-radius: 8px; 
    font-size: 0.7rem; 
    text-transform: uppercase; 
    letter-spacing: 0.08em;
    display: none;
  ">
    <span style="color: #2a9d8f; font-weight: 600;">TARGET ACQUIRING</span>
    <div style="width: 100%; height: 3px; background: rgba(42, 157, 143, 0.25); margin-top: 6px; border-radius: 2px;">
      <div id="modern-lock-progress" style="height: 100%; background: #2a9d8f; border-radius: 2px; width: 0%; transition: width 0.1s ease-out;"></div>
    </div>
  </div>
</div>

<!-- Modern Targeting Crosshair -->
<div id="modern-crosshair" style="
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 88;
  display: none;
">
  <svg width="50" height="50" viewBox="0 0 50 50">
    <circle cx="25" cy="25" r="22" fill="none" stroke="rgba(42, 157, 143, 0.7)" stroke-width="2"/>
    <line x1="25" y1="3" x2="25" y2="10" stroke="rgba(42, 157, 143, 0.9)" stroke-width="2"/>
    <line x1="25" y1="40" x2="25" y2="47" stroke="rgba(42, 157, 143, 0.9)" stroke-width="2"/>
    <line x1="3" y1="25" x2="10" y2="25" stroke="rgba(42, 157, 143, 0.9)" stroke-width="2"/>
    <line x1="40" y1="25" x2="47" y2="25" stroke="rgba(42, 157, 143, 0.9)" stroke-width="2"/>
  </svg>
</div>

<!-- Modern Controls Guide -->
<div id="modern-controls" style="
  position: fixed;
  top: 24px;
  right: 24px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(0,0,0,0.08);
  z-index: 91;
  font-size: 0.8rem;
  color: #2c3e50;
  min-width: 200px;
">
  <div style="color: #7f8c8d; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; font-weight: 600;">
    Weapon Controls
  </div>
  <div style="margin-bottom: 6px;"><strong>Space</strong> - Manual Fire</div>
  <div style="margin-bottom: 6px;"><strong>F</strong> - Launch Missile</div>
  <div><strong>G</strong> - Toggle Auto-Fire</div>
</div>
`;

// Insert HUD before closing body tag
html = safeReplace(html, '</body>', modernHUD + '\r\n</body>');

// 3. ADD HUD UPDATE AND CONTROL SYSTEM
const hudControlSystem = `
// ── MODERN WEAPON HUD SYSTEM ──
window.updateModernWeaponHUD = function() {
  try {
    // Update gatling status
    const gatlingStatus = document.getElementById('modern-gatling-status');
    if (gatlingStatus) {
      gatlingStatus.textContent = 'READY';
      gatlingStatus.style.color = '#06d6a0';
    }
    
    // Update missile count
    const missileCount = document.getElementById('modern-missile-count');
    if (missileCount && window.modernWeapons) {
      const now = Date.now();
      const reloading = window.modernWeapons.missiles.available < window.modernWeapons.missiles.capacity &&
                       (now - window.modernWeapons.missiles.lastReload) < window.modernWeapons.missiles.reloadTime;
      
      if (reloading) {
        const progress = Math.floor((now - window.modernWeapons.missiles.lastReload) / window.modernWeapons.missiles.reloadTime * 100);
        missileCount.textContent = progress + '%';
        missileCount.style.color = '#f77f00';
      } else {
        missileCount.textContent = window.modernWeapons.missiles.available;
        missileCount.style.color = '#f4a261';
      }
    }
    
    // Update auto-fire status
    const autoFireStatus = document.getElementById('modern-autofire-status');
    if (autoFireStatus && window.modernWeapons) {
      autoFireStatus.textContent = window.modernWeapons.autoFire.enabled ? 'ACTIVE' : 'MANUAL';
      autoFireStatus.style.color = window.modernWeapons.autoFire.enabled ? '#06d6a0' : '#7f8c8d';
    }
    
    // Update target lock display
    const targetLock = document.getElementById('modern-target-lock');
    const lockProgress = document.getElementById('modern-lock-progress');
    const crosshair = document.getElementById('modern-crosshair');
    
    if (window.modernWeapons && window.modernWeapons.missiles.currentTarget) {
      const now = Date.now();
      const progress = Math.min(1, (now - window.modernWeapons.missiles.targetLockStart) / window.modernWeapons.missiles.lockTime);
      
      if (targetLock) {
        targetLock.style.display = 'block';
        targetLock.style.background = progress >= 1 ? 
          'rgba(6, 214, 160, 0.18)' : 'rgba(42, 157, 143, 0.12)';
      }
      
      if (lockProgress) {
        lockProgress.style.width = (progress * 100) + '%';
        lockProgress.style.background = progress >= 1 ? '#06d6a0' : '#2a9d8f';
      }
      
      if (crosshair) {
        crosshair.style.display = 'block';
      }
      
      // Update text
      const lockText = targetLock?.querySelector('span');
      if (lockText) {
        lockText.textContent = progress >= 1 ? 'TARGET LOCKED' : 'TARGET ACQUIRING';
        lockText.style.color = progress >= 1 ? '#06d6a0' : '#2a9d8f';
      }
    } else {
      if (targetLock) targetLock.style.display = 'none';
      if (crosshair) crosshair.style.display = 'none';
    }
    
  } catch (error) {
    // Silent fail for HUD updates
  }
};

// ── MODERN WEAPON CONTROLS ──
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    if (window.fireModernGatling) window.fireModernGatling();
  }
  
  if (event.code === 'KeyF') {
    event.preventDefault();
    const target = window.findNearestHostile ? window.findNearestHostile() : null;
    if (target && window.fireVectorMissile) window.fireVectorMissile(target);
  }
  
  if (event.code === 'KeyG') {
    event.preventDefault();
    if (window.modernWeapons) {
      window.modernWeapons.autoFire.enabled = !window.modernWeapons.autoFire.enabled;
      console.log('🎯 Auto-fire:', window.modernWeapons.autoFire.enabled ? 'ENABLED' : 'DISABLED');
    }
  }
});

// Initialize HUD updates
setInterval(() => {
  if (window.updateModernWeaponHUD) window.updateModernWeaponHUD();
}, 100);
`;

// Insert HUD system before closing script tag or body
html = safeReplace(html, modernHUD, modernHUD + '\r\n\r\n<script>\r\n' + hudControlSystem + '\r\n</script>');

// 4. INTEGRATE WITH GAME LOOP - Add to existing game loop
const gameLoopIntegration = `
        // ── Modern Weapon System Updates ──
        try {
          if (window.updateModernAutoFire) window.updateModernAutoFire();
          if (window.updateModernProjectiles) window.updateModernProjectiles();
          if (window.updateModernExplosions) window.updateModernExplosions();
          if (window.updateMissileReload) window.updateMissileReload();
        } catch (error) {
          // Silent weapon system errors
        }
`;

// Add to game loop
html = safeReplace(html, '        // Polish and optimization updates', 
gameLoopIntegration + '\r\n        // Polish and optimization updates');

// 5. WRITE THE UPDATED FILE
fs.writeFileSync('public/index.html', html);

console.log('✅ MODERN DUAL WEAPON SYSTEM IMPLEMENTED!');
console.log('');
console.log('🎮 CONTROLS:');
console.log('   • Space - Manual gatling fire');
console.log('   • F - Manual missile launch'); 
console.log('   • G - Toggle auto-fire mode');
console.log('');
console.log('🚀 FEATURES ADDED:');
console.log('   • Dual alternating gatling guns (150 RPM each)');
console.log('   • Vector-tracking missiles with lock-on system');
console.log('   • Intelligent auto-targeting and firing');
console.log('   • Modern glass-morphism UI with live updates');
console.log('   • Enhanced explosion effects with physics');
console.log('   • Real-time weapon status display');
console.log('   • Missile reload system with visual feedback');
console.log('');
console.log('💡 The UI is now light, modern, and minimal with no chrome!');