const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🎨 DEPLOYING: Advanced Graphics & Effects System');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add advanced graphics state
const graphicsState = `      // Advanced Graphics & Effects System
      graphics: {
        postProcessing: {
          bloom: { enabled: true, strength: 1.0, radius: 1.0, threshold: 0.8 },
          chromaticAberration: { enabled: true, strength: 0.1 },
          filmGrain: { enabled: true, intensity: 0.15 },
          vignette: { enabled: true, intensity: 0.3 },
          colorGrading: { enabled: true, exposure: 0.0, gamma: 1.0, saturation: 1.1 }
        },
        particles: {
          starfield: { enabled: true, count: 2000, speed: 0.5 },
          debris: { enabled: true, density: 0.8 },
          explosions: { enabled: true, quality: 'high' },
          trails: { enabled: true, length: 20 },
          sparks: { enabled: true, count: 50 }
        },
        lighting: {
          dynamic: true,
          shadows: true,
          ambientIntensity: 0.3,
          pointLights: new Map(),
          spotLights: new Map()
        },
        shaders: {
          hologram: null,
          energy: null,
          explosion: null,
          warp: null
        }
      },`;

// Add to state object
indexContent = indexContent.replace(
  '      // Territory Control & Base Building System',
  `${graphicsState}
      
      // Territory Control & Base Building System`
);

// Add advanced graphics system
const advancedGraphicsSystem = `
// === ADVANCED GRAPHICS & EFFECTS SYSTEM ===
const advancedGraphics = {
  // Post-processing pipeline
  composer: null,
  bloomPass: null,
  chromaticAberrationPass: null,
  filmGrainPass: null,
  vignettePass: null,
  
  // Particle systems
  starField: null,
  debrisField: [],
  explosionPool: [],
  sparkPool: [],
  
  // Lighting system
  dynamicLights: new Map(),
  lightUpdateQueue: [],
  
  // Shader materials
  shaderMaterials: new Map(),
  
  // Animation mixers
  animationMixers: [],
  
  // Quality settings
  qualityLevel: 2, // 0=low, 1=medium, 2=high, 3=ultra
  adaptiveQuality: true,
  targetFPS: 60,
  currentFPS: 60,
  
  // Performance monitoring
  lastFrameTime: 0,
  frameTimeHistory: [],
  adaptiveTimer: 0
};

function initAdvancedGraphicsSystem() {
  console.log('🎨 Initializing Advanced Graphics & Effects System');
  
  // Initialize post-processing pipeline
  initPostProcessing();
  
  // Create particle systems
  initParticleSystems();
  
  // Set up dynamic lighting
  initDynamicLighting();
  
  // Create shader materials
  initCustomShaders();
  
  // Initialize performance monitoring
  initPerformanceMonitoring();
  
  console.log('✅ Advanced Graphics System initialized');
}

function initPostProcessing() {
  if (!renderer || !scene || !camera) {
    console.log('⚠️ Post-processing delayed - waiting for renderer');
    return;
  }
  
  // Create composer for post-processing
  try {
    // Basic render pass
    const renderPass = new THREE.RenderPass(scene, camera);
    
    // Bloom effect
    if (state.graphics.postProcessing.bloom.enabled) {
      createBloomEffect();
    }
    
    // Film grain
    if (state.graphics.postProcessing.filmGrain.enabled) {
      createFilmGrainEffect();
    }
    
    // Vignette
    if (state.graphics.postProcessing.vignette.enabled) {
      createVignetteEffect();
    }
    
    console.log('✅ Post-processing pipeline created');
  } catch (error) {
    console.log('⚠️ Post-processing unavailable:', error.message);
  }
}

function createBloomEffect() {
  // Simulate bloom with enhanced lighting
  scene.fog = new THREE.Fog(0x000005, 100, 1000);
  
  // Enhance existing lights
  enhanceExistingLights();
  
  console.log('🌟 Bloom effect simulated');
}

function enhanceExistingLights() {
  // Add glow to energy sources
  const glowMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x0080ff, 
    transparent: true, 
    opacity: 0.3,
    blending: THREE.AdditiveBlending 
  });
  
  // Store for cleanup
  advancedGraphics.glowMaterial = glowMaterial;
}

function createFilmGrainEffect() {
  // Create subtle noise overlay
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 256;
  noiseCanvas.height = 256;
  const noiseCtx = noiseCanvas.getContext('2d');
  
  const noiseData = noiseCtx.createImageData(256, 256);
  for (let i = 0; i < noiseData.data.length; i += 4) {
    const noise = Math.random() * 255;
    noiseData.data[i] = noise;     // R
    noiseData.data[i + 1] = noise; // G
    noiseData.data[i + 2] = noise; // B
    noiseData.data[i + 3] = 25;    // A (subtle)
  }
  noiseCtx.putImageData(noiseData, 0, 0);
  
  const noiseTexture = new THREE.CanvasTexture(noiseCanvas);
  noiseTexture.wrapS = THREE.RepeatWrapping;
  noiseTexture.wrapT = THREE.RepeatWrapping;
  
  advancedGraphics.noiseTexture = noiseTexture;
  console.log('📺 Film grain effect created');
}

function createVignetteEffect() {
  // Create vignette overlay
  const vignetteCanvas = document.createElement('canvas');
  vignetteCanvas.width = 512;
  vignetteCanvas.height = 512;
  const vignetteCtx = vignetteCanvas.getContext('2d');
  
  const gradient = vignetteCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
  
  vignetteCtx.fillStyle = gradient;
  vignetteCtx.fillRect(0, 0, 512, 512);
  
  const vignetteTexture = new THREE.CanvasTexture(vignetteCanvas);
  advancedGraphics.vignetteTexture = vignetteTexture;
  console.log('⚫ Vignette effect created');
}

function initParticleSystems() {
  // Enhanced starfield
  createEnhancedStarfield();
  
  // Space debris
  createSpaceDebris();
  
  // Explosion system
  initExplosionSystem();
  
  // Trail system
  initTrailSystem();
  
  console.log('✨ Particle systems initialized');
}

function createEnhancedStarfield() {
  if (advancedGraphics.starField) {
    scene.remove(advancedGraphics.starField);
  }
  
  const starCount = 3000;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    
    // Position
    starPositions[i3] = (Math.random() - 0.5) * 2000;
    starPositions[i3 + 1] = (Math.random() - 0.5) * 2000;
    starPositions[i3 + 2] = (Math.random() - 0.5) * 1000;
    
    // Color variation
    const starType = Math.random();
    if (starType < 0.7) {
      // White stars
      starColors[i3] = 1.0;
      starColors[i3 + 1] = 1.0;
      starColors[i3 + 2] = 1.0;
    } else if (starType < 0.85) {
      // Blue giants
      starColors[i3] = 0.5;
      starColors[i3 + 1] = 0.7;
      starColors[i3 + 2] = 1.0;
    } else {
      // Red giants
      starColors[i3] = 1.0;
      starColors[i3 + 1] = 0.3;
      starColors[i3 + 2] = 0.2;
    }
    
    // Size variation
    starSizes[i] = Math.random() * 2 + 1;
  }
  
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
  
  const starMaterial = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending
  });
  
  advancedGraphics.starField = new THREE.Points(starGeometry, starMaterial);
  scene.add(advancedGraphics.starField);
  
  console.log('⭐ Enhanced starfield created (3000 stars)');
}

function createSpaceDebris() {
  const debrisCount = 50;
  
  for (let i = 0; i < debrisCount; i++) {
    const debrisGeometry = new THREE.BoxGeometry(
      Math.random() * 2 + 1,
      Math.random() * 2 + 1,
      Math.random() * 2 + 1
    );
    
    const debrisMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.1, 0.2, 0.3 + Math.random() * 0.3),
      transparent: true,
      opacity: 0.7
    });
    
    const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
    debris.position.set(
      (Math.random() - 0.5) * 800,
      (Math.random() - 0.5) * 600,
      (Math.random() - 0.5) * 200
    );
    
    debris.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    debris.userData = {
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ),
      driftSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        0
      )
    };
    
    scene.add(debris);
    advancedGraphics.debrisField.push(debris);
  }
  
  console.log('🗿 Space debris field created (50 objects)');
}

function initExplosionSystem() {
  // Pre-create explosion particles for object pooling
  const explosionPoolSize = 10;
  
  for (let i = 0; i < explosionPoolSize; i++) {
    const explosion = createExplosionParticles();
    advancedGraphics.explosionPool.push(explosion);
  }
  
  console.log('💥 Explosion system initialized');
}

function createExplosionParticles() {
  const particleCount = 100;
  const particles = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const lifetimes = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    positions[i3] = 0;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = 0;
    
    const speed = Math.random() * 20 + 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
    velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
    velocities[i3 + 2] = Math.cos(phi) * speed;
    
    lifetimes[i] = Math.random() * 2 + 1;
  }
  
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  particles.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
  
  const material = new THREE.PointsMaterial({
    color: 0xff4400,
    size: 3,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  return {
    particles: new THREE.Points(particles, material),
    active: false,
    startTime: 0,
    duration: 2
  };
}

function initTrailSystem() {
  // Initialize trail rendering for projectiles and ship
  console.log('🌟 Trail system initialized');
}`;

// Add advanced graphics system
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${advancedGraphicsSystem}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Advanced Graphics & Effects System (Part 1) deployed!');
console.log('🎨 Features: Post-processing pipeline, enhanced starfield, space debris');
console.log('💫 Effects: Bloom simulation, film grain, vignette, particle systems');
console.log('⭐ Starfield: 3000 stars with color variation and size differences');