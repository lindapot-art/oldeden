// Enhanced Visual Effects System - Simplified Addition
const fs = require('fs');

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

console.log('🎨 Adding Enhanced Visual Effects Functions...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');
  
  // Find insertion point after createExplosionParticles function
  const insertionPoint = html.indexOf('function createExplosionParticles');
  if (insertionPoint === -1) {
    throw new Error('createExplosionParticles function not found');
  }
  
  // Find the end of the function
  let braceCount = 0;
  let insertPos = insertionPoint;
  let inFunction = false;
  
  for (let i = insertionPoint; i < html.length; i++) {
    if (html[i] === '{') {
      inFunction = true;
      braceCount++;
    } else if (html[i] === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        insertPos = i + 1;
        break;
      }
    }
  }
  
  // Enhanced visual functions to insert
  const newFunctions = cr(`

// ── Enhanced Visual Effects Functions ──
function updateVisualFX() {
  if (!state.visualFX) return;
  
  // Enhanced particle system update
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
    
    // Update particle physics
    p.position.add(p.velocity.clone().multiplyScalar(0.016));
    if (p.gravity) p.velocity.y += p.gravity * 0.016;
    if (p.drag) p.velocity.multiplyScalar(1 - p.drag);
    
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
      } else if (p.type === 'spark') {
        geom = new THREE.CylinderGeometry(0.1, 0.1, p.size, 4);
        mat = new THREE.MeshBasicMaterial({ 
          color: p.color, 
          transparent: true, 
          opacity: alpha,
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
      p.mesh.rotation.x += 0.12;
      p.mesh.rotation.y += 0.18;
    }
  }
  
  // Enhanced screen shake
  if (state.visualFX.screenShake.intensity > 0) {
    const elapsed = performance.now() - (state.visualFX.screenShake.startTime || 0);
    if (elapsed < state.visualFX.screenShake.duration) {
      const progress = elapsed / state.visualFX.screenShake.duration;
      const intensity = state.visualFX.screenShake.intensity * (1 - progress);
      
      camera.position.x += (Math.random() - 0.5) * intensity * 0.15;
      camera.position.y += (Math.random() - 0.5) * intensity * 0.15;
      camera.position.z += (Math.random() - 0.5) * intensity * 0.08;
    } else {
      state.visualFX.screenShake.intensity = 0;
    }
  }
  
  // Enhanced color overlay fade
  if (state.visualFX.colorOverlay.alpha > 0) {
    state.visualFX.colorOverlay.alpha = Math.max(0, state.visualFX.colorOverlay.alpha - 0.04);
  }
  
  // Update advanced effects
  updateHyperspaceEffect();
  updateNebulaEffect();
  updateWeaponTrails();
  updateDynamicLighting();
}

function createShockwaveRing(position, scale = 1) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1, 4, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  
  ring.position.copy(position);
  ring.lookAt(camera.position);
  scene.add(ring);
  
  const startTime = performance.now();
  const duration = 1200;
  
  function animateShockwave() {
    const elapsed = performance.now() - startTime;
    const progress = elapsed / duration;
    
    if (progress >= 1) {
      scene.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
      return;
    }
    
    const size = 1 + progress * 30 * scale;
    ring.scale.setScalar(size);
    ring.material.opacity = (1 - progress) * 1.0;
    
    requestAnimationFrame(animateShockwave);
  }
  
  animateShockwave();
}

function activateHyperspace(duration = 4000) {
  if (!state.visualFX.hyperspace) {
    state.visualFX.hyperspace = { active: false, intensity: 0, streamers: [] };
  }
  
  state.visualFX.hyperspace.active = true;
  state.visualFX.hyperspace.intensity = 0;
  state.visualFX.hyperspace.streamers = [];
  
  // Create star streamers
  for (let i = 0; i < 80; i++) {
    const streamer = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 300,
        Math.random() * 1000 + 200
      ),
      velocity: 500 + Math.random() * 400,
      color: Math.random() > 0.6 ? 0x00aaff : 0xffffff,
      size: 1 + Math.random() * 2
    };
    state.visualFX.hyperspace.streamers.push(streamer);
  }
  
  setTimeout(() => {
    deactivateHyperspace();
  }, duration);
}

function updateHyperspaceEffect() {
  if (!state.visualFX.hyperspace || !state.visualFX.hyperspace.active) return;
  
  state.visualFX.hyperspace.intensity = Math.min(1, state.visualFX.hyperspace.intensity + 0.1);
  
  state.visualFX.hyperspace.streamers.forEach(streamer => {
    streamer.position.z -= streamer.velocity * 0.016;
    
    if (streamer.position.z < -200) {
      streamer.position.z = 1000;
      streamer.position.x = (Math.random() - 0.5) * 400;
      streamer.position.y = (Math.random() - 0.5) * 300;
    }
  });
  
  // Color flash effect
  state.visualFX.colorOverlay = {
    r: 0.2, g: 0.4, b: 1.0,
    alpha: state.visualFX.hyperspace.intensity * 0.3
  };
}

function deactivateHyperspace() {
  if (!state.visualFX.hyperspace) return;
  
  state.visualFX.hyperspace.active = false;
  state.visualFX.hyperspace.intensity = 0;
  state.visualFX.hyperspace.streamers = [];
}

function createNebulaField() {
  if (!state.visualFX.nebula) {
    state.visualFX.nebula = { clouds: [], density: 0.3, color: 0x4400ff, speed: 0.02 };
  }
  
  // Clear existing clouds
  state.visualFX.nebula.clouds.forEach(cloud => {
    if (cloud.mesh) {
      scene.remove(cloud.mesh);
      cloud.mesh.geometry.dispose();
      cloud.mesh.material.dispose();
    }
  });
  state.visualFX.nebula.clouds = [];
  
  for (let i = 0; i < 15; i++) {
    const cloud = {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 600,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 800
      ),
      size: 80 + Math.random() * 160,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: 0.06 + Math.random() * 0.12,
      rotationSpeed: 0.001 + Math.random() * 0.003
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
  if (!state.visualFX.nebula || !state.visualFX.nebula.clouds.length) return;
  
  const time = performance.now() * 0.001;
  
  state.visualFX.nebula.clouds.forEach(cloud => {
    if (cloud.mesh) {
      cloud.mesh.rotation.y += cloud.rotationSpeed;
      cloud.mesh.rotation.x += cloud.rotationSpeed * 0.7;
      
      const pulse = Math.sin(time + cloud.phase) * 0.2 + 1.0;
      cloud.mesh.material.opacity = cloud.baseOpacity * pulse;
      cloud.mesh.scale.setScalar(pulse * 0.15 + 0.9);
    }
  });
}

function updateWeaponTrails() {
  if (!state.visualFX.weaponTrails) {
    state.visualFX.weaponTrails = [];
    return;
  }
  
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
      const opacity = (trail.life / trail.maxLife) * 0.9;
      if (trail.mesh) {
        trail.mesh.material.opacity = opacity;
      }
    }
  }
}

function createWeaponTrail(start, end, color = 0xff4400, duration = 0.8) {
  if (!state.visualFX.weaponTrails) {
    state.visualFX.weaponTrails = [];
  }
  
  const trail = {
    life: duration,
    maxLife: duration
  };
  
  const direction = end.clone().sub(start);
  const length = direction.length();
  direction.normalize();
  
  const geometry = new THREE.CylinderGeometry(0.4, 0.2, length, 8);
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
  if (!state.visualFX.lighting || !state.visualFX.lighting.flashLights) {
    state.visualFX.lighting = { flashLights: [] };
    return;
  }
  
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

function createFlashLight(position, color = 0xffffff, intensity = 12, duration = 1.5) {
  if (!state.visualFX.lighting) {
    state.visualFX.lighting = { flashLights: [] };
  }
  
  const flashLight = {
    life: duration,
    maxLife: duration,
    baseIntensity: intensity,
    pointLight: new THREE.PointLight(color, intensity, 150)
  };
  
  flashLight.pointLight.position.copy(position);
  scene.add(flashLight.pointLight);
  state.visualFX.lighting.flashLights.push(flashLight);
}

function createEnergyBurst(position, count = 30, color = 0x00ff44) {
  for (let i = 0; i < count; i++) {
    const particle = {
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 50
      ),
      life: 1.8 + Math.random() * 1.2,
      maxLife: 2.5,
      size: 1.2 + Math.random() * 2.0,
      color: color,
      type: 'energy',
      drag: 0.04
    };
    state.visualFX.particlePool.push(particle);
  }
  
  // Enhanced flash
  createFlashLight(position, color, 15, 1.2);
  
  // Screen shake
  state.visualFX.screenShake = {
    intensity: 8,
    duration: 500,
    startTime: performance.now()
  };
  
  // Color flash
  state.visualFX.colorOverlay = {
    r: (color >> 16 & 255) / 255,
    g: (color >> 8 & 255) / 255,
    b: (color & 255) / 255,
    alpha: 0.6
  };
  
  // Create shockwave
  createShockwaveRing(position, 1.5);
}
`);
  
  // Insert the new functions
  html = html.slice(0, insertPos) + newFunctions + html.slice(insertPos);
  
  fs.writeFileSync('public/index.html', html);
  console.log('✅ Enhanced Visual Effects Functions added successfully!');
  console.log('');
  console.log('🎨 MASSIVE VISUAL FEATURES ADDED:');
  console.log('   • Enhanced particle systems with energy, spark, and explosion types');
  console.log('   • Hyperspace effect with star streaming visuals (H key)');
  console.log('   • Dynamic nebula field generation (N key)');
  console.log('   • Shockwave ring effects for explosions');
  console.log('   • Dynamic lighting system with flash lights');
  console.log('   • Weapon trail systems with enhanced fadeout');
  console.log('   • Enhanced screen shake and color overlay effects');
  console.log('   • Energy burst system with multiple particle types (J key)');
  console.log('   • Advanced particle physics with drag and rotation');
  console.log('');
  
} catch (error) {
  console.error('❌ Error adding enhanced visual effects:', error.message);
  process.exit(1);
}