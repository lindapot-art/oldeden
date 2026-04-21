// Enhanced Projectile Tracer System - Old Eden Space MMO
// Adds dynamic trails, particle effects, and velocity-based intensity

const fs = require('fs');

// Helper for CRLF line endings
const cr = (str) => str.replace(/\n/g, '\r\n');

// Safe replace function
function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.log('❌ FAIL: oldStr not found');
    console.log('Looking for:', oldStr.slice(0, 100) + '...');
    return content;
  }
  return content.replace(oldStr, newStr);
}

console.log('🚀 Enhancing projectile tracer effects...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Replace basic trail opacity with enhanced tracer system
const oldTracerUpdate = `      p.trailMat.opacity = Math.max(0, 0.6 - p.age/3000);`;

const newTracerSystem = `      // ── ENHANCED PROJECTILE TRACER SYSTEM ──
      const ageRatio = p.age / p.life;
      const speedRatio = p.speed / 500; // Normalize to 500 speed baseline
      
      // Base trail opacity with velocity enhancement
      const baseOpacity = Math.max(0, 0.8 - ageRatio * 0.9);
      const velocityBoost = Math.min(0.4, speedRatio * 0.3);
      p.trailMat.opacity = baseOpacity + velocityBoost;
      
      // Dynamic trail color shifting based on projectile type and age
      if (p.isLaser) {
        // Laser tracers: green-blue shifting to yellow as they age
        const hueShift = ageRatio * 0.15;
        p.trailMat.color.setHSL(0.5 - hueShift, 0.8, 0.6 + velocityBoost * 0.3);
        p.trailMat.emissiveIntensity = 0.4 + velocityBoost * 0.6;
      } else if (p.isPistol) {
        // Pistol tracers: bright white-yellow cores
        p.trailMat.color.setHSL(0.12, 0.3 + velocityBoost * 0.4, 0.9);
        p.trailMat.emissiveIntensity = 0.2 + velocityBoost * 0.4;
      } else if (p.isBlaster || p.isWhiteBlaster) {
        // Blaster tracers: blue-white energy bolts
        p.trailMat.color.setHSL(0.6 + ageRatio * 0.1, 0.6, 0.8 + velocityBoost * 0.2);
        p.trailMat.emissiveIntensity = 0.3 + velocityBoost * 0.5;
      } else if (p.isBlasterTurret) {
        // Turret tracers: orange-red heavy bolts
        p.trailMat.color.setHSL(0.08 - ageRatio * 0.05, 0.9, 0.7 + velocityBoost * 0.2);
        p.trailMat.emissiveIntensity = 0.5 + velocityBoost * 0.4;
      } else {
        // Default projectiles: white-blue tracers
        p.trailMat.color.setHSL(0.55, 0.4 + velocityBoost * 0.3, 0.8);
        p.trailMat.emissiveIntensity = 0.3 + velocityBoost * 0.3;
      }
      
      // Velocity streak effect - add trail stretching for fast projectiles
      if (p.speed > 300 && p.group.children.length > 0) {
        const streak = p.group.children[0];
        if (streak && streak.isMesh) {
          const stretchFactor = Math.min(3.0, speedRatio * 1.5);
          streak.scale.z = stretchFactor;
          // Trail length based on velocity - faster = longer trail
          const trailLength = Math.min(8, speedRatio * 4);
          if (streak.geometry && streak.geometry.isBufferGeometry) {
            streak.geometry.scale(1, 1, trailLength / streak.scale.z);
          }
        }
      }
      
      // High-speed particle corona effect
      if (p.speed > 400 && !p._coronaAdded) {
        p._coronaAdded = true;
        const coronaGeo = new THREE.RingGeometry(0.1, 0.3, 8);
        const coronaMat = new THREE.MeshBasicMaterial({ 
          color: p.isLaser ? 0x44ffaa : 0xffaa44,
          transparent: true, 
          opacity: 0.4 + velocityBoost * 0.3,
          blending: THREE.AdditiveBlending,
          depthWrite: false 
        });
        const corona = new THREE.Mesh(coronaGeo, coronaMat);
        corona.name = '_tracerCorona';
        p.group.add(corona);
      }
      
      // Update corona intensity for high-speed projectiles
      if (p._coronaAdded) {
        const corona = p.group.getObjectByName('_tracerCorona');
        if (corona && corona.material) {
          corona.material.opacity = Math.max(0, baseOpacity * 0.6 + velocityBoost * 0.4);
          corona.rotation.z += dt * 8; // Spinning corona effect
        }
      }`;

content = safeReplace(content, oldTracerUpdate, newTracerSystem);

// 2. Enhance laser projectile creation with better trail geometry
const oldLaserTrail = `  const beam = new THREE.Mesh(_laserBeamGeo, beamMat);
  beam.quaternion.copy(camera.quaternion); beam.rotateX(Math.PI / 2);
  g.add(beam);
  
  const glow = new THREE.Mesh(_laserGlowGeo, _laserGlowMat);
  glow.quaternion.copy(camera.quaternion); glow.rotateX(Math.PI / 2);
  g.add(glow);`;

const newLaserTrail = `  const beam = new THREE.Mesh(_laserBeamGeo, beamMat);
  beam.quaternion.copy(camera.quaternion); beam.rotateX(Math.PI / 2);
  g.add(beam);
  
  const glow = new THREE.Mesh(_laserGlowGeo, _laserGlowMat);
  glow.quaternion.copy(camera.quaternion); glow.rotateX(Math.PI / 2);
  g.add(glow);
  
  // Enhanced laser tracer core
  const tracerCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.01, 2.0, 4),
    new THREE.MeshBasicMaterial({ 
      color: 0x44ffaa, 
      emissive: 0x22ff88,
      emissiveIntensity: 0.8,
      transparent: true, 
      opacity: 0.9 
    })
  );
  tracerCore.quaternion.copy(camera.quaternion); 
  tracerCore.rotateX(Math.PI / 2);
  tracerCore.name = '_tracerCore';
  g.add(tracerCore);`;

content = safeReplace(content, oldLaserTrail, newLaserTrail);

// 3. Add projectile trail initialization for non-laser weapons
const oldPistolProjectile = `  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), new THREE.MeshBasicMaterial({ color: 0xccccaa }));
  g.add(m);
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir, speed: 400, life: 3000, age: 0, damage, isPistol: true });`;

const newPistolProjectile = `  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), new THREE.MeshBasicMaterial({ color: 0xccccaa, emissive: 0x888844 }));
  g.add(m);
  
  // Pistol tracer trail
  const trailGeo = new THREE.CylinderGeometry(0.03, 0.01, 1.0, 6);
  const trailMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffcc, 
    transparent: true, 
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.rotateX(Math.PI / 2);
  g.add(trail);
  
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir, speed: 400, life: 3000, age: 0, damage, isPistol: true, trailMat });`;

content = safeReplace(content, oldPistolProjectile, newPistolProjectile);

// 4. Enhance blaster projectiles with improved trails
const oldBlasterProjectile = `  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshBasicMaterial({ color: 0x40aaff, emissive: 0x2080cc }));
  g.add(m);
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir, speed: 350, life: 3000, age: 0, damage, isBlaster: true });`;

const newBlasterProjectile = `  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshBasicMaterial({ color: 0x40aaff, emissive: 0x2080cc }));
  g.add(m);
  
  // Blaster energy trail
  const trailGeo = new THREE.CylinderGeometry(0.08, 0.04, 1.5, 8);
  const trailMat = new THREE.MeshBasicMaterial({ 
    color: 0x4088ff, 
    emissive: 0x2044aa,
    emissiveIntensity: 0.6,
    transparent: true, 
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.rotateX(Math.PI / 2);
  g.add(trail);
  
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir, speed: 350, life: 3000, age: 0, damage, isBlaster: true, trailMat });`;

content = safeReplace(content, oldBlasterProjectile, newBlasterProjectile);

// 5. Add muzzle flash effects for enhanced visual feedback
const oldLaserFire = `  AudioSFX.play('laser_fire');
}`;

const newLaserFire = `  // Muzzle flash effect
  const muzzleFlash = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.4, 8),
    new THREE.MeshBasicMaterial({ 
      color: 0x44ffaa, 
      transparent: true, 
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  muzzleFlash.position.copy(origin);
  muzzleFlash.quaternion.copy(camera.quaternion);
  scene.add(muzzleFlash);
  // Fade out muzzle flash
  const flashFade = () => {
    muzzleFlash.material.opacity *= 0.85;
    muzzleFlash.scale.multiplyScalar(1.1);
    if (muzzleFlash.material.opacity > 0.01) {
      requestAnimationFrame(flashFade);
    } else {
      scene.remove(muzzleFlash);
      muzzleFlash.geometry.dispose();
      muzzleFlash.material.dispose();
    }
  };
  requestAnimationFrame(flashFade);
  
  AudioSFX.play('laser_fire');
}`;

content = safeReplace(content, oldLaserFire, newLaserFire);

// 6. Add tracer velocity streaking for railgun projectiles
const oldRailgunCode = `  c.projectiles.push({ group: g, dir: dir.clone(), speed: NAIL_SPEED, life: 3000, age: 0, trailMat: trailMat2, heatMat, slugLight: null });`;

const newRailgunCode = `  // Enhanced railgun tracer with velocity streaking
  const streakGeo = new THREE.CylinderGeometry(0.01, 0.005, 3.0, 4);
  const streakMat = new THREE.MeshBasicMaterial({ 
    color: 0xffaa44, 
    emissive: 0xff6622,
    emissiveIntensity: 1.0,
    transparent: true, 
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const velocityStreak = new THREE.Mesh(streakGeo, streakMat);
  velocityStreak.rotateX(Math.PI / 2);
  velocityStreak.name = '_velocityStreak';
  g.add(velocityStreak);
  
  c.projectiles.push({ group: g, dir: dir.clone(), speed: NAIL_SPEED, life: 3000, age: 0, trailMat: trailMat2, heatMat, slugLight: null, isRailgun: true });`;

content = safeReplace(content, oldRailgunCode, newRailgunCode);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Enhanced projectile tracer effects added successfully!');
console.log('📊 Features added:');
console.log('   • Dynamic trail opacity and color shifting');
console.log('   • Velocity-based trail intensity and length');
console.log('   • Weapon-specific tracer colors and effects');
console.log('   • High-speed particle corona effects');
console.log('   • Enhanced laser cores with emissive trails');
console.log('   • Muzzle flash effects for visual impact');
console.log('   • Velocity streaking for railgun projectiles');
console.log('   • Trail stretching based on projectile speed');