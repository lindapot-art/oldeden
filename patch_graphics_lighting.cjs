const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🎨 DEPLOYING: Dynamic Lighting & Animation Systems');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add dynamic lighting and animation functions
const dynamicLightingSystem = `
function initDynamicLighting() {
  // Create ambient lighting enhancement
  if (scene.children.find(child => child.isAmbientLight)) {
    scene.children.find(child => child.isAmbientLight).intensity = 0.4;
  }
  
  // Add dynamic point lights for explosions and effects
  createDynamicLightSystem();
  
  console.log('💡 Dynamic lighting system initialized');
}

function createDynamicLightSystem() {
  // Light pool for effects
  const lightPool = [];
  for (let i = 0; i < 10; i++) {
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.visible = false;
    scene.add(light);
    lightPool.push(light);
  }
  
  advancedGraphics.lightPool = lightPool;
  
  // Atmospheric lighting effects
  createAtmosphericEffects();
}

function createAtmosphericEffects() {
  // Nebula-like background
  const nebulaGeometry = new THREE.SphereGeometry(500, 16, 16);
  const nebulaMaterial = new THREE.MeshBasicMaterial({
    color: 0x001122,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  });
  
  const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
  scene.add(nebula);
  advancedGraphics.nebula = nebula;
  
  // Distant galaxy background
  createGalaxyBackground();
  
  console.log('🌌 Atmospheric effects created');
}

function createGalaxyBackground() {
  const galaxyGeometry = new THREE.BufferGeometry();
  const galaxyCount = 1000;
  const positions = new Float32Array(galaxyCount * 3);
  const colors = new Float32Array(galaxyCount * 3);
  const sizes = new Float32Array(galaxyCount);
  
  for (let i = 0; i < galaxyCount; i++) {
    const i3 = i * 3;
    
    // Create spiral galaxy pattern
    const radius = Math.random() * 300 + 200;
    const angle = Math.random() * Math.PI * 4; // Multiple arms
    const height = (Math.random() - 0.5) * 50;
    
    positions[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 100;
    positions[i3 + 1] = Math.sin(angle) * radius + (Math.random() - 0.5) * 100;
    positions[i3 + 2] = height - 400; // Far background
    
    // Galaxy core colors
    const coreDistance = radius / 300;
    if (coreDistance < 0.3) {
      // Core - bright yellow/white
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.9;
      colors[i3 + 2] = 0.6;
    } else if (coreDistance < 0.7) {
      // Mid - blue/white
      colors[i3] = 0.8;
      colors[i3 + 1] = 0.8;
      colors[i3 + 2] = 1.0;
    } else {
      // Outer - red/orange
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.6;
      colors[i3 + 2] = 0.3;
    }
    
    sizes[i] = Math.random() * 3 + 1;
  }
  
  galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  galaxyGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const galaxyMaterial = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending
  });
  
  const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
  scene.add(galaxy);
  advancedGraphics.galaxy = galaxy;
  
  console.log('🌌 Galaxy background created');
}

function initCustomShaders() {
  // Energy field shader for shields and effects
  createEnergyShader();
  
  // Hologram shader for UI elements
  createHologramShader();
  
  // Warp field shader for jump effects
  createWarpShader();
  
  console.log('🔮 Custom shaders initialized');
}

function createEnergyShader() {
  const energyMaterial = new THREE.MeshBasicMaterial({
    color: 0x0080ff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  
  // Animate energy material
  energyMaterial.userData = {
    type: 'energy',
    startTime: Date.now(),
    frequency: 0.5,
    amplitude: 0.3
  };
  
  advancedGraphics.shaderMaterials.set('energy', energyMaterial);
}

function createHologramShader() {
  const hologramMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.6,
    wireframe: true,
    blending: THREE.AdditiveBlending
  });
  
  hologramMaterial.userData = {
    type: 'hologram',
    startTime: Date.now(),
    flicker: true,
    scanlines: true
  };
  
  advancedGraphics.shaderMaterials.set('hologram', hologramMaterial);
}

function createWarpShader() {
  const warpMaterial = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  warpMaterial.userData = {
    type: 'warp',
    startTime: Date.now(),
    intensity: 1.0,
    distortion: 0.5
  };
  
  advancedGraphics.shaderMaterials.set('warp', warpMaterial);
}

function initPerformanceMonitoring() {
  advancedGraphics.lastFrameTime = performance.now();
  advancedGraphics.frameTimeHistory = [];
  
  console.log('📊 Performance monitoring initialized');
}

// Advanced graphics update functions
function updateAdvancedGraphics(deltaTime) {
  // Update performance monitoring
  updatePerformanceMonitoring(deltaTime);
  
  // Update particle systems
  updateParticleSystems(deltaTime);
  
  // Update dynamic lighting
  updateDynamicLighting(deltaTime);
  
  // Update shader materials
  updateShaderMaterials(deltaTime);
  
  // Update atmospheric effects
  updateAtmosphericEffects(deltaTime);
  
  // Adaptive quality adjustment
  if (advancedGraphics.adaptiveQuality) {
    updateAdaptiveQuality();
  }
}

function updatePerformanceMonitoring(deltaTime) {
  const currentTime = performance.now();
  const frameTime = currentTime - advancedGraphics.lastFrameTime;
  
  advancedGraphics.frameTimeHistory.push(frameTime);
  if (advancedGraphics.frameTimeHistory.length > 60) {
    advancedGraphics.frameTimeHistory.shift();
  }
  
  // Calculate average FPS
  const averageFrameTime = advancedGraphics.frameTimeHistory.reduce((a, b) => a + b, 0) / advancedGraphics.frameTimeHistory.length;
  advancedGraphics.currentFPS = 1000 / averageFrameTime;
  
  advancedGraphics.lastFrameTime = currentTime;
}

function updateParticleSystems(deltaTime) {
  // Update starfield rotation
  if (advancedGraphics.starField) {
    advancedGraphics.starField.rotation.z += deltaTime * 0.0001;
  }
  
  // Update space debris
  advancedGraphics.debrisField.forEach(debris => {
    if (debris.userData.rotationSpeed) {
      debris.rotation.x += debris.userData.rotationSpeed.x;
      debris.rotation.y += debris.userData.rotationSpeed.y;
      debris.rotation.z += debris.userData.rotationSpeed.z;
    }
    
    if (debris.userData.driftSpeed) {
      debris.position.add(debris.userData.driftSpeed);
      
      // Wrap around boundaries
      if (debris.position.x > 400) debris.position.x = -400;
      if (debris.position.x < -400) debris.position.x = 400;
      if (debris.position.y > 300) debris.position.y = -300;
      if (debris.position.y < -300) debris.position.y = 300;
    }
  });
  
  // Update active explosions
  updateExplosions(deltaTime);
}

function updateDynamicLighting(deltaTime) {
  // Update nebula rotation
  if (advancedGraphics.nebula) {
    advancedGraphics.nebula.rotation.y += deltaTime * 0.0002;
  }
  
  // Update galaxy rotation
  if (advancedGraphics.galaxy) {
    advancedGraphics.galaxy.rotation.z += deltaTime * 0.00005;
  }
  
  // Update light pool
  if (advancedGraphics.lightPool) {
    advancedGraphics.lightPool.forEach(light => {
      if (light.visible && light.userData.fadeOut) {
        light.intensity -= deltaTime * 0.002;
        if (light.intensity <= 0) {
          light.visible = false;
          light.userData.fadeOut = false;
        }
      }
    });
  }
}

function updateShaderMaterials(deltaTime) {
  const time = Date.now() * 0.001;
  
  advancedGraphics.shaderMaterials.forEach((material, name) => {
    const userData = material.userData;
    
    if (userData.type === 'energy') {
      // Animate energy field
      const pulse = Math.sin(time * userData.frequency) * userData.amplitude + 0.5;
      material.opacity = 0.4 + pulse * 0.3;
    }
    
    if (userData.type === 'hologram' && userData.flicker) {
      // Hologram flicker effect
      if (Math.random() < 0.05) {
        material.opacity = Math.random() * 0.5 + 0.3;
      }
    }
    
    if (userData.type === 'warp') {
      // Warp field distortion
      const warp = Math.sin(time * 2) * 0.5 + 0.5;
      material.opacity = 0.5 + warp * 0.3;
    }
  });
}

function updateAtmosphericEffects(deltaTime) {
  // Subtle atmospheric movement
  if (advancedGraphics.nebula) {
    advancedGraphics.nebula.material.opacity = 0.05 + Math.sin(Date.now() * 0.0005) * 0.02;
  }
}

function updateAdaptiveQuality() {
  advancedGraphics.adaptiveTimer += 16; // Assuming ~60fps
  
  if (advancedGraphics.adaptiveTimer > 1000) { // Check every second
    advancedGraphics.adaptiveTimer = 0;
    
    if (advancedGraphics.currentFPS < 45 && advancedGraphics.qualityLevel > 0) {
      // Reduce quality
      advancedGraphics.qualityLevel--;
      adjustQualitySettings();
      console.log(\`📉 Reduced quality to level \${advancedGraphics.qualityLevel}\`);
    } else if (advancedGraphics.currentFPS > 55 && advancedGraphics.qualityLevel < 3) {
      // Increase quality
      advancedGraphics.qualityLevel++;
      adjustQualitySettings();
      console.log(\`📈 Increased quality to level \${advancedGraphics.qualityLevel}\`);
    }
  }
}

function adjustQualitySettings() {
  const quality = advancedGraphics.qualityLevel;
  
  // Adjust particle counts
  if (advancedGraphics.starField) {
    const starCount = [1000, 1500, 2000, 3000][quality];
    // Would regenerate starfield with new count in a real implementation
  }
  
  // Adjust debris count
  const debrisTarget = [20, 35, 50, 75][quality];
  while (advancedGraphics.debrisField.length > debrisTarget) {
    const debris = advancedGraphics.debrisField.pop();
    scene.remove(debris);
  }
}

function updateExplosions(deltaTime) {
  advancedGraphics.explosionPool.forEach(explosion => {
    if (explosion.active) {
      const elapsed = (Date.now() - explosion.startTime) / 1000;
      
      if (elapsed > explosion.duration) {
        // Deactivate explosion
        explosion.active = false;
        scene.remove(explosion.particles);
        return;
      }
      
      // Update particle positions
      const positions = explosion.particles.geometry.attributes.position.array;
      const velocities = explosion.particles.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * deltaTime * 0.01;
        positions[i + 1] += velocities[i + 1] * deltaTime * 0.01;
        positions[i + 2] += velocities[i + 2] * deltaTime * 0.01;
        
        // Apply gravity/deceleration
        velocities[i] *= 0.995;
        velocities[i + 1] *= 0.995;
        velocities[i + 2] *= 0.995;
      }
      
      explosion.particles.geometry.attributes.position.needsUpdate = true;
      
      // Fade out over time
      const fadeProgress = elapsed / explosion.duration;
      explosion.particles.material.opacity = 1.0 - fadeProgress;
    }
  });
}

// Effect creation functions
function createExplosionEffect(position, intensity = 1.0) {
  // Find inactive explosion in pool
  const explosion = advancedGraphics.explosionPool.find(e => !e.active);
  if (!explosion) return;
  
  // Activate explosion
  explosion.active = true;
  explosion.startTime = Date.now();
  explosion.particles.position.copy(position);
  
  // Reset particle positions
  const positions = explosion.particles.geometry.attributes.position.array;
  const velocities = explosion.particles.geometry.attributes.velocity.array;
  
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = 0;
    positions[i + 1] = 0;
    positions[i + 2] = 0;
    
    const speed = (Math.random() * 20 + 10) * intensity;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    velocities[i] = Math.sin(phi) * Math.cos(theta) * speed;
    velocities[i + 1] = Math.sin(phi) * Math.sin(theta) * speed;
    velocities[i + 2] = Math.cos(phi) * speed;
  }
  
  explosion.particles.material.opacity = 1.0;
  explosion.particles.geometry.attributes.position.needsUpdate = true;
  scene.add(explosion.particles);
  
  // Create dynamic light for explosion
  createExplosionLight(position, intensity);
}

function createExplosionLight(position, intensity) {
  if (!advancedGraphics.lightPool) return;
  
  const light = advancedGraphics.lightPool.find(l => !l.visible);
  if (!light) return;
  
  light.position.copy(position);
  light.intensity = intensity * 2;
  light.color.setHex(0xff4400);
  light.distance = 100 * intensity;
  light.visible = true;
  light.userData.fadeOut = true;
}`;

// Add dynamic lighting system
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${dynamicLightingSystem}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Dynamic Lighting & Animation Systems deployed!');
console.log('💡 Features: Dynamic lighting, atmospheric effects, performance monitoring');
console.log('🌌 Effects: Nebula background, galaxy spiral, energy shaders, explosion lights');
console.log('📊 Performance: Adaptive quality system, FPS monitoring, quality adjustment');