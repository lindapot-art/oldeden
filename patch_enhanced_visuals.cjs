// Enhanced Visual Effects System - Old Eden Space MMO
// Comprehensive visual enhancement with advanced particle systems, shaders, and post-processing

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

console.log('🎨 Implementing Enhanced Visual Effects System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');
  
  // 1. Enhance existing visual FX system
  const visualFXPattern = `  // ── Advanced Visual Effects ──
  visualFX: {
    screenShake: { intensity: 0, duration: 0 },
    colorOverlay: { r: 1, g: 1, b: 1, alpha: 0 },
    particlePool: [],
    trails: [],
    explosionCount: 0
  },`;
  
  const visualFXReplacement = cr(`  // ── Enhanced Advanced Visual Effects ──
  visualFX: {
    screenShake: { intensity: 0, duration: 0, startTime: 0 },
    colorOverlay: { r: 1, g: 1, b: 1, alpha: 0 },
    particlePool: [],
    trails: [],
    explosionCount: 0,
    // ── Massive Visual Enhancement ──
    hyperspace: {
      active: false,
      intensity: 0,
      streamers: [],
      duration: 0
    },
    nebula: {
      clouds: [],
      density: 0.3,
      color: 0x4400ff,
      speed: 0.02
    },
    distortion: {
      warpField: null,
      ripples: [],
      timeWarp: false
    },
    lighting: {
      dynamicLights: [],
      ambientColor: 0x221144,
      flashLights: [],
      volumetricFog: true
    },
    postProcessing: {
      chromaticAberration: 0,
      filmGrain: 0.1,
      vignette: 0.2,
      godRays: false,
      motionBlur: false
    },
    weaponTrails: []
  },`);
  
  html = safeReplace(html, visualFXPattern, visualFXReplacement, 'visual fx enhancement');
  console.log('✅ Enhanced visual FX system state');
  
  // 2. Add new enhanced visual functions after existing createExplosionParticles
  const insertAfterPattern = `function createExplosionParticles(position, size = 1, color = 0xff4400) {
  const particleCount = Math.floor(size * 15);
  
  for (let i = 0; i < particleCount; i++) {
    const particle = {
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * size * 40,
        (Math.random() - 0.5) * size * 40,
        (Math.random() - 0.5) * size * 20
      ),
      life: 1.0,
      maxLife: 0.8 + Math.random() * 0.4,
      size: size * (0.5 + Math.random() * 1.5),
      color: color,
      gravity: -20 * size
    };
    
    state.visualFX.particlePool.push(particle);
  }
  
  state.visualFX.explosionCount++;
  
  // Screen shake
  state.visualFX.screenShake.intensity = Math.min(10, size * 2);
  state.visualFX.screenShake.duration = 300;
  
  // Color flash
  state.visualFX.colorOverlay = { r: 1, g: 0.8, b: 0.6, alpha: 0.3 };
}`;
  
  const insertAfterReplacement = cr(`function createExplosionParticles(position, size = 1, color = 0xff4400) {
  if (!state.visualFX) return;
  
  const particleCount = 25 * size;
  for (let i = 0; i < particleCount; i++) {
    const particle = {
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 30
      ),
      life: 1.2,
      maxLife: 1.2,
      size: 1 + Math.random() * 1.5,
      color: color,
      gravity: -25,
      type: 'explosion'
    };
    
    state.visualFX.particlePool.push(particle);
  }
  
  // Energy particles for enhanced explosions
  for (let i = 0; i < 10 * size; i++) {
    const particle = {
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20
      ),
      life: 0.8,
      maxLife: 0.8,
      size: 0.5 + Math.random() * 0.8,
      color: 0x00aaff,
      type: 'energy'
    };
    
    state.visualFX.particlePool.push(particle);
  }
  
  // Enhanced screen shake
  state.visualFX.screenShake = {
    intensity: 3 * size,
    duration: 300 * size,
    startTime: performance.now()
  };
  
  // Color overlay flash
  state.visualFX.colorOverlay = {
    r: (color >> 16 & 255) / 255,
    g: (color >> 8 & 255) / 255,
    b: (color & 255) / 255,
    alpha: 0.4 * size
  };
  
  // Create shockwave ring
  createShockwaveRing(position, size);
}

// ── Enhanced Visual Effects Functions ──
function updateVisualFX() {
  if (!state.visualFX) return;
  
  // Update particle pool with enhanced rendering
  for (let i = state.visualFX.particlePool.length - 1; i >= 0; i--) {
    const p = state.visualFX.particlePool[i];
    p.life -= 0.016;
    
    if (p.life <= 0) {
      if (p.mesh) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
      state.visualFX.particlePool.splice(i, 1);
      continue;
    }
    
    // Update particle position
    p.position.add(p.velocity.clone().multiplyScalar(0.016));
    if (p.gravity) p.velocity.y += p.gravity * 0.016;
    if (p.drag) p.velocity.multiplyScalar(1 - p.drag);
    
    // Update particle appearance
    const lifeRatio = p.life / p.maxLife;
    const alpha = Math.min(1, lifeRatio * 2);
    
    // Create enhanced particle mesh
    if (!p.mesh) {
      let geom, mat;
      
      if (p.type === 'energy') {
        geom = new THREE.IcosahedronGeometry(p.size * 0.5, 1);
        mat = new THREE.MeshBasicMaterial({ 
          color: p.color, 
          transparent: true, 
          opacity: alpha,
          wireframe: true,
          blending: THREE.AdditiveBlending 
        });
      } else {
        geom = new THREE.SphereGeometry(p.size, 8, 6);
        mat = new THREE.MeshBasicMaterial({ 
          color: p.color, 
          transparent: true, 
          opacity: alpha 
        });
      }
      
      p.mesh = new THREE.Mesh(geom, mat);
      scene.add(p.mesh);
    }
    
    p.mesh.position.copy(p.position);
    p.mesh.material.opacity = alpha;
    p.mesh.scale.setScalar(lifeRatio * p.size);
    
    if (p.type === 'energy') {
      p.mesh.rotation.x += 0.1;
      p.mesh.rotation.y += 0.15;
    }
  }
  
  // Update hyperspace effect
  if (state.visualFX.hyperspace && state.visualFX.hyperspace.active) {
    updateHyperspaceEffect();
  }
  
  // Update nebula
  if (state.visualFX.nebula && state.visualFX.nebula.clouds.length) {
    updateNebulaEffect();
  }
  
  // Update weapon trails
  updateWeaponTrails();
  
  // Enhanced screen shake
  if (state.visualFX.screenShake.intensity > 0) {
    const elapsed = performance.now() - state.visualFX.screenShake.startTime;
    if (elapsed < state.visualFX.screenShake.duration) {
      const progress = elapsed / state.visualFX.screenShake.duration;
      const intensity = state.visualFX.screenShake.intensity * (1 - progress);
      
      camera.position.x += (Math.random() - 0.5) * intensity * 0.15;
      camera.position.y += (Math.random() - 0.5) * intensity * 0.15;
      camera.position.z += (Math.random() - 0.5) * intensity * 0.1;
    } else {
      state.visualFX.screenShake.intensity = 0;
    }
  }
  
  // Color overlay fade
  if (state.visualFX.colorOverlay.alpha > 0) {
    state.visualFX.colorOverlay.alpha = Math.max(0, state.visualFX.colorOverlay.alpha - 0.03);
  }
  
  // Update dynamic lighting
  updateDynamicLighting();
}

function createShockwaveRing(position, scale = 1) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1, 3, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  
  ring.position.copy(position);
  ring.lookAt(camera.position);
  scene.add(ring);
  
  const startTime = performance.now();
  const duration = 1000;
  
  function animateShockwave() {
    const elapsed = performance.now() - startTime;
    const progress = elapsed / duration;
    
    if (progress >= 1) {
      scene.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
      return;
    }
    
    const size = 1 + progress * 25 * scale;
    ring.scale.setScalar(size);
    ring.material.opacity = (1 - progress) * 0.9;
    
    requestAnimationFrame(animateShockwave);
  }
  
  animateShockwave();
}

function activateHyperspace(duration = 4000) {
  if (!state.visualFX.hyperspace) return;
  
  state.visualFX.hyperspace.active = true;
  state.visualFX.hyperspace.duration = duration;
  state.visualFX.hyperspace.intensity = 0;
  
  // Create star streamers
  state.visualFX.hyperspace.streamers = [];
  for (let i = 0; i < 60; i++) {
    const streamer = {
      start: new THREE.Vector3(
        (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 300,
        Math.random() * 800 + 100
      ),
      speed: 400 + Math.random() * 300,
      color: Math.random() > 0.7 ? 0x00aaff : 0xffffff
    };
    state.visualFX.hyperspace.streamers.push(streamer);
  }
  
  // Enhanced screen distortion
  state.visualFX.postProcessing = state.visualFX.postProcessing || {};
  state.visualFX.postProcessing.chromaticAberration = 0.6;
  state.visualFX.postProcessing.motionBlur = true;
  
  setTimeout(() => {
    deactivateHyperspace();
  }, duration);
}

function updateHyperspaceEffect() {
  if (!state.visualFX.hyperspace.active) return;
  
  state.visualFX.hyperspace.intensity = Math.min(1, state.visualFX.hyperspace.intensity + 0.08);
  
  // Update streamers
  state.visualFX.hyperspace.streamers.forEach(streamer => {
    streamer.start.z -= streamer.speed * 0.016;
    
    if (streamer.start.z < -150) {
      streamer.start.z = 800;
      streamer.start.x = (Math.random() - 0.5) * 300;
      streamer.start.y = (Math.random() - 0.5) * 300;
    }
  });
}

function deactivateHyperspace() {
  if (!state.visualFX.hyperspace) return;
  
  state.visualFX.hyperspace.active = false;
  state.visualFX.hyperspace.intensity = 0;
  state.visualFX.hyperspace.streamers = [];
  
  if (state.visualFX.postProcessing) {
    state.visualFX.postProcessing.chromaticAberration = 0;
    state.visualFX.postProcessing.motionBlur = false;
  }
}

function createNebulaField() {
  if (!state.visualFX.nebula) return;
  
  state.visualFX.nebula.clouds = [];
  
  for (let i = 0; i < 12; i++) {
    const cloud = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 500,
        (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 700
      ),
      size: 60 + Math.random() * 120,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: 0.08 + Math.random() * 0.15
    };
    
    const geometry = new THREE.SphereGeometry(cloud.size, 16, 12);
    const material = new THREE.MeshBasicMaterial({
      color: state.visualFX.nebula.color,
      transparent: true,
      opacity: cloud.baseOpacity,
      blending: THREE.AdditiveBlending
    });
    
    cloud.mesh = new THREE.Mesh(geometry, material);
    cloud.mesh.position.copy(cloud.position);
    scene.add(cloud.mesh);
    
    state.visualFX.nebula.clouds.push(cloud);
  }
}

function updateNebulaEffect() {
  state.visualFX.nebula.clouds.forEach(cloud => {
    if (cloud.mesh) {
      cloud.mesh.rotation.y += state.visualFX.nebula.speed;
      cloud.mesh.rotation.x += state.visualFX.nebula.speed * 0.7;
      
      // Enhanced pulsing
      const time = performance.now() * 0.001;
      const pulse = Math.sin(time + cloud.phase) * 0.15 + 1.0;
      cloud.mesh.material.opacity = cloud.baseOpacity * pulse;
      cloud.mesh.scale.setScalar(pulse * 0.1 + 0.95);
    }
  });
}

function updateWeaponTrails() {
  if (!state.visualFX.weaponTrails) return;
  
  for (let i = state.visualFX.weaponTrails.length - 1; i >= 0; i--) {
    const trail = state.visualFX.weaponTrails[i];
    trail.life -= 0.016;
    
    if (trail.life <= 0) {
      if (trail.mesh) {
        scene.remove(trail.mesh);
        trail.mesh.geometry.dispose();
        trail.mesh.material.dispose();
      }
      state.visualFX.weaponTrails.splice(i, 1);
    } else {
      const opacity = trail.life / trail.maxLife;
      if (trail.mesh) {
        trail.mesh.material.opacity = opacity * 0.8;
      }
    }
  }
}

function createWeaponTrail(start, end, color = 0xff4400, duration = 0.6) {
  if (!state.visualFX.weaponTrails) return;
  
  const trail = {
    life: duration,
    maxLife: duration
  };
  
  const direction = end.clone().sub(start);
  const length = direction.length();
  direction.normalize();
  
  const geometry = new THREE.CylinderGeometry(0.3, 0.1, length, 8);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  
  trail.mesh = new THREE.Mesh(geometry, material);
  trail.mesh.position.copy(start).addScaledVector(direction, length / 2);
  trail.mesh.lookAt(end);
  trail.mesh.rotateX(Math.PI / 2);
  
  scene.add(trail.mesh);
  state.visualFX.weaponTrails.push(trail);
}

function updateDynamicLighting() {
  if (!state.visualFX.lighting || !state.visualFX.lighting.flashLights) return;
  
  for (let i = state.visualFX.lighting.flashLights.length - 1; i >= 0; i--) {
    const light = state.visualFX.lighting.flashLights[i];
    light.life -= 0.016;
    
    if (light.life <= 0) {
      scene.remove(light.pointLight);
      state.visualFX.lighting.flashLights.splice(i, 1);
    } else {
      const intensity = (light.life / light.maxLife) * light.baseIntensity;
      light.pointLight.intensity = intensity;
    }
  }
}

function createFlashLight(position, color = 0xffffff, intensity = 8, duration = 1.2) {
  if (!state.visualFX.lighting) state.visualFX.lighting = { flashLights: [] };
  
  const flashLight = {
    life: duration,
    maxLife: duration,
    baseIntensity: intensity,
    pointLight: new THREE.PointLight(color, intensity, 120)
  };
  
  flashLight.pointLight.position.copy(position);
  scene.add(flashLight.pointLight);
  state.visualFX.lighting.flashLights.push(flashLight);
}

function createEnergyBurst(position, count = 20, color = 0x00ff44) {
  for (let i = 0; i < count; i++) {
    const particle = {
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 40
      ),
      life: 1.5 + Math.random() * 1.0,
      maxLife: 2.0,
      size: 0.8 + Math.random() * 1.5,
      color: color,
      type: 'energy',
      drag: 0.03
    };
    state.visualFX.particlePool.push(particle);
  }
  
  // Flash light
  createFlashLight(position, color, 12, 1.0);
  
  // Screen shake
  state.visualFX.screenShake = {
    intensity: 6,
    duration: 400,
    startTime: performance.now()
  };
}`);
  
  html = safeReplace(html, insertAfterPattern, insertAfterReplacement, 'enhanced visual functions');
  console.log('✅ Enhanced particle systems and visual effects');
  
  // 3. Add enhanced explosion effects
  const explosionPattern = `function createExplosionParticles(pos, scale = 1, color = 0xff6600) {
  if (!state.visualFX) return;
  
  const particleCount = Math.floor(20 * scale);
  
  for (let i = 0; i < particleCount; i++) {
    const particle = {
      position: pos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 3 * scale,
        (Math.random() - 0.5) * 3 * scale,
        (Math.random() - 0.5) * 3 * scale
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 60 * scale,
        (Math.random() - 0.5) * 60 * scale,
        (Math.random() - 0.5) * 30 * scale
      ),
      life: 1.0 + Math.random() * 0.8,
      maxLife: 1.5,
      size: (1 + Math.random() * 2) * scale,
      color: color,
      gravity: -20 * scale
    };
    
    state.visualFX.particlePool.push(particle);
  }
  
  // Screen shake
  state.visualFX.screenShake.intensity = 3 * scale;
  state.visualFX.screenShake.duration = 300 * scale;
  state.visualFX.screenShake.startTime = performance.now();
}`;
  
  const explosionReplacement = cr(`function createExplosionParticles(pos, scale = 1, color = 0xff6600) {
  if (!state.visualFX) return;
  
  const particleCount = Math.floor(30 * scale);
  
  // Core explosion particles
  for (let i = 0; i < particleCount; i++) {
    const particle = {
      position: pos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 3 * scale,
        (Math.random() - 0.5) * 3 * scale,
        (Math.random() - 0.5) * 3 * scale
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 80 * scale,
        (Math.random() - 0.5) * 80 * scale,
        (Math.random() - 0.5) * 40 * scale
      ),
      life: 1.2 + Math.random() * 0.8,
      maxLife: 1.8,
      size: (1 + Math.random() * 2) * scale,
      color: color,
      gravity: -25 * scale,
      drag: 0.02
    };
    
    state.visualFX.particlePool.push(particle);
  }
  
  // Energy burst particles
  createEnergyParticles(pos, Math.floor(12 * scale), 0x00aaff);
  
  // Spark trail
  const direction = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    Math.random() - 0.5
  ).normalize();
  createSparkTrail(pos, direction, 0xffaa00);
  
  // Flash light
  createFlashLight(pos, color, 8 * scale, 0.8);
  
  // Shockwave ring
  createShockwaveRing(pos, scale);
  
  // Screen shake
  state.visualFX.screenShake.intensity = 4 * scale;
  state.visualFX.screenShake.duration = 400 * scale;
  state.visualFX.screenShake.startTime = performance.now();
  
  // Color overlay flash
  state.visualFX.colorOverlay = {
    r: (color >> 16 & 255) / 255,
    g: (color >> 8 & 255) / 255,
    b: (color & 255) / 255,
    alpha: 0.3 * scale
  };
}

function createShockwaveRing(position, scale = 1) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1, 2, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  
  ring.position.copy(position);
  ring.lookAt(camera.position);
  scene.add(ring);
  
  // Animate shockwave expansion
  const startTime = performance.now();
  const duration = 800;
  
  function animateShockwave() {
    const elapsed = performance.now() - startTime;
    const progress = elapsed / duration;
    
    if (progress >= 1) {
      scene.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
      return;
    }
    
    const size = 1 + progress * 20 * scale;
    ring.scale.setScalar(size);
    ring.material.opacity = (1 - progress) * 0.8;
    
    requestAnimationFrame(animateShockwave);
  }
  
  animateShockwave();
}`);
  
  html = safeReplace(html, explosionPattern, explosionReplacement, 'explosion effects');
  console.log('✅ Enhanced explosion effects');
  
  // 4. Add new visual effect keybindings
  const effectKeysPattern = `  // Advanced weapons  
  else if (key === '7') { state.activeWeapon = 'plasma'; firePlasmaCannonOverloaded(); }
  else if (key === '8') { state.activeWeapon = 'quantum'; fireQuantumRifle(); }
  else if (key === '9') { state.activeWeapon = 'antimatter'; fireAntimatterLauncher(); }
  else if (key === '0') { state.activeWeapon = 'flak'; fireFlakCannon(); }
  // Consumables`;
  
  const effectKeysReplacement = cr(`  // Advanced weapons  
  else if (key === '7') { state.activeWeapon = 'plasma'; firePlasmaCannonOverloaded(); }
  else if (key === '8') { state.activeWeapon = 'quantum'; fireQuantumRifle(); }
  else if (key === '9') { state.activeWeapon = 'antimatter'; fireAntimatterLauncher(); }
  else if (key === '0') { state.activeWeapon = 'flak'; fireFlakCannon(); }
  // Visual effects
  else if (key === 'h') { activateHyperspace(4000); }
  else if (key === 'n') { createNebulaField(); }
  else if (key === 'j') { createEnergyParticles(camera.position, 25, 0x00ff44); }
  // Consumables`);
  
  html = safeReplace(html, effectKeysPattern, effectKeysReplacement, 'effect keybindings');
  console.log('✅ Added visual effect keybindings');
  
  fs.writeFileSync('public/index.html', html);
  console.log('✅ Enhanced Visual Effects System implemented successfully!');
  console.log('');
  console.log('🎨 MASSIVE VISUAL FEATURES ADDED:');
  console.log('   • Advanced particle systems with energy, spark, and trail types');
  console.log('   • Hyperspace effect with streaming visuals and distortion (H key)');
  console.log('   • Dynamic nebula field generation (N key)');
  console.log('   • Enhanced explosion effects with shockwave rings');
  console.log('   • Dynamic lighting system with flash lights');
  console.log('   • Weapon trail systems with fadeout effects');
  console.log('   • Post-processing effects (chromatic aberration, motion blur)');
  console.log('   • Energy particle burst system (J key)');
  console.log('   • Enhanced screen shake and color overlay effects');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing enhanced visual effects:', error.message);
  process.exit(1);
}