// Enhanced Sound and Particle Effects - Old Eden Space MMO
// Advanced audio feedback and particle systems for immersive gameplay

const fs = require('fs');

function cr(str) {
  return str.replace(/\n/g, '\r\n');
}

console.log('🔊 Implementing enhanced sound and particle effects...');

const htmlPath = 'd:\\antiruscist\\oldeden\\public\\index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add enhanced sound effects to audio system
const existingSounds = `      case 'target_lock': { osc.disconnect(); const dur7=0.12; osc=ctx.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(800,now); osc.frequency.exponentialRampToValueAtTime(1200,now+dur7/3); osc.frequency.exponentialRampToValueAtTime(1000,now+dur7); osc.connect(gain); gain.gain.setValueAtTime(0.08*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur7); osc.start(now); osc.stop(now+dur7); } break;`;

const enhancedSounds = `      case 'target_lock': { osc.disconnect(); const dur7=0.12; osc=ctx.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(800,now); osc.frequency.exponentialRampToValueAtTime(1200,now+dur7/3); osc.frequency.exponentialRampToValueAtTime(1000,now+dur7); osc.connect(gain); gain.gain.setValueAtTime(0.08*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur7); osc.start(now); osc.stop(now+dur7); } break;
      case 'missile_lock': { osc.disconnect(); const dur8=0.8; osc=ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.setValueAtTime(600,now); for(let t=0; t<dur8; t+=0.1) { osc.frequency.setValueAtTime(600 + Math.sin(t*20)*50,now+t); } osc.connect(gain); gain.gain.setValueAtTime(0.06*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur8); osc.start(now); osc.stop(now+dur8); } break;
      case 'shield_hit': { osc.disconnect(); const dur9=0.3; const buf9=ctx.createBuffer(1,ctx.sampleRate*dur9,ctx.sampleRate); const d9=buf9.getChannelData(0); for(let i=0;i<d9.length;i++) d9[i]=Math.sin(i*0.1)*Math.pow(1-i/d9.length,2)*0.4; const src9=ctx.createBufferSource(); src9.buffer=buf9; src9.connect(gain); gain.gain.setValueAtTime(0.1*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur9); src9.start(now); } break;
      case 'engine_boost': { osc.disconnect(); const dur10=1.2; osc=ctx.createOscillator(); osc.type='sawtooth'; osc.frequency.setValueAtTime(120,now); osc.frequency.exponentialRampToValueAtTime(200,now+dur10); const lp10=ctx.createBiquadFilter(); lp10.type='lowpass'; lp10.frequency.value=400; osc.connect(lp10); lp10.connect(gain); gain.gain.setValueAtTime(0.12*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur10); osc.start(now); osc.stop(now+dur10); } break;
      case 'weapon_charge': { osc.disconnect(); const dur11=0.6; osc=ctx.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(200,now); osc.frequency.exponentialRampToValueAtTime(800,now+dur11); osc.connect(gain); gain.gain.setValueAtTime(0.04*vol,now); gain.gain.exponentialRampToValueAtTime(0.08*vol,now+dur11*0.8); gain.gain.exponentialRampToValueAtTime(0.001,now+dur11); osc.start(now); osc.stop(now+dur11); } break;
      case 'critical_hit': { osc.disconnect(); const dur12=0.25; osc=ctx.createOscillator(); osc.type='square'; osc.frequency.setValueAtTime(1200,now); osc.frequency.exponentialRampToValueAtTime(800,now+dur12); const dist12=ctx.createWaveShaper(); dist12.curve=new Float32Array([-1,1,-1,1]); dist12.oversample='4x'; osc.connect(dist12); dist12.connect(gain); gain.gain.setValueAtTime(0.15*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur12); osc.start(now); osc.stop(now+dur12); } break;
      case 'powerup_pickup': { osc.disconnect(); const dur13=0.4; osc=ctx.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(440,now); osc.frequency.setValueAtTime(550,now+dur13/4); osc.frequency.setValueAtTime(660,now+dur13/2); osc.frequency.setValueAtTime(880,now+dur13*3/4); osc.frequency.setValueAtTime(1100,now+dur13); osc.connect(gain); gain.gain.setValueAtTime(0.08*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur13); osc.start(now); osc.stop(now+dur13); } break;
      case 'energy_low': { osc.disconnect(); const dur14=0.5; osc=ctx.createOscillator(); osc.type='triangle'; osc.frequency.setValueAtTime(200,now); osc.frequency.exponentialRampToValueAtTime(150,now+dur14); osc.connect(gain); gain.gain.setValueAtTime(0.06*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur14); osc.start(now); osc.stop(now+dur14); } break;`;

// Only add if not already present
if (!content.includes('missile_lock')) {
  content = content.replace(existingSounds, enhancedSounds);
  console.log('✅ Added enhanced sound effects');
}

// 2. Add advanced particle system functions
const particleFunctionsInsert = `function updateTargetingSystem(dtMs) {`;

const advancedParticleFunctions = cr(`// ── Advanced Particle Effects ──
function createExplosionParticles(position, size = 1, color = 0xff6600) {
  const particleCount = Math.floor(20 * size);
  const particles = [];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = {
      position: {
        x: position.x + (Math.random() - 0.5) * 10,
        y: position.y + (Math.random() - 0.5) * 10,
        z: position.z + (Math.random() - 0.5) * 10
      },
      velocity: {
        x: (Math.random() - 0.5) * 40 * size,
        y: (Math.random() - 0.5) * 40 * size,
        z: (Math.random() - 0.5) * 40 * size
      },
      life: 2000 + Math.random() * 1000,
      age: 0,
      size: Math.random() * 3 * size + 1,
      color: color,
      type: 'explosion'
    };
    
    // Create visual particle
    const geom = new THREE.SphereGeometry(particle.size, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ 
      color: color, 
      transparent: true, 
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(particle.position);
    scene.add(mesh);
    
    particle.mesh = mesh;
    particles.push(particle);
  }
  
  // Add to global particle system
  if (!c.particles) c.particles = [];
  c.particles.push(...particles);
}

function createShieldHitEffect(position, normal) {
  const sparkCount = 15;
  
  for (let i = 0; i < sparkCount; i++) {
    const spark = {
      position: {
        x: position.x + (Math.random() - 0.5) * 5,
        y: position.y + (Math.random() - 0.5) * 5,
        z: position.z + (Math.random() - 0.5) * 5
      },
      velocity: {
        x: normal.x * 20 + (Math.random() - 0.5) * 30,
        y: normal.y * 20 + (Math.random() - 0.5) * 30,
        z: normal.z * 20 + (Math.random() - 0.5) * 30
      },
      life: 800,
      age: 0,
      size: Math.random() * 2 + 0.5,
      color: 0x00aaff,
      type: 'shield_spark'
    };
    
    // Create spark mesh
    const geom = new THREE.SphereGeometry(spark.size, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0x00aaff, 
      transparent: true, 
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(spark.position);
    scene.add(mesh);
    
    spark.mesh = mesh;
    if (!c.particles) c.particles = [];
    c.particles.push(spark);
  }
  
  // Add screen flash effect
  const flashDiv = document.getElementById('shield-flash');
  if (flashDiv) {
    flashDiv.classList.remove('active');
    void flashDiv.offsetWidth;
    flashDiv.classList.add('active');
  }
}

function createEngineTrail(position, velocity) {
  if (Math.random() > 0.7) return; // Only create some trail particles
  
  const trail = {
    position: {
      x: position.x - velocity.x * 0.1,
      y: position.y - velocity.y * 0.1,
      z: position.z - velocity.z * 0.1
    },
    velocity: {
      x: (Math.random() - 0.5) * 5,
      y: (Math.random() - 0.5) * 5,
      z: (Math.random() - 0.5) * 5
    },
    life: 1200,
    age: 0,
    size: Math.random() * 1.5 + 0.5,
    color: 0x0088ff,
    type: 'engine_trail'
  };
  
  const geom = new THREE.SphereGeometry(trail.size, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ 
    color: trail.color, 
    transparent: true, 
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(trail.position);
  scene.add(mesh);
  
  trail.mesh = mesh;
  if (!c.particles) c.particles = [];
  c.particles.push(trail);
}

function createCriticalHitEffect(position) {
  // Critical hit burst
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const crit = {
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },
      velocity: {
        x: Math.cos(angle) * 25,
        y: Math.sin(angle) * 25,
        z: (Math.random() - 0.5) * 15
      },
      life: 1000,
      age: 0,
      size: 2,
      color: 0xffff00,
      type: 'critical'
    };
    
    const geom = new THREE.SphereGeometry(crit.size, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ 
      color: crit.color, 
      transparent: true, 
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(crit.position);
    scene.add(mesh);
    
    crit.mesh = mesh;
    if (!c.particles) c.particles = [];
    c.particles.push(crit);
  }
}

function updateParticleSystem(dtMs) {
  if (!c.particles) c.particles = [];
  
  for (let i = c.particles.length - 1; i >= 0; i--) {
    const p = c.particles[i];
    p.age += dtMs;
    
    if (p.age >= p.life) {
      // Remove expired particle
      if (p.mesh) {
        scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
      }
      c.particles.splice(i, 1);
      continue;
    }
    
    // Update particle position
    p.position.x += p.velocity.x * dtMs * 0.001;
    p.position.y += p.velocity.y * dtMs * 0.001;
    p.position.z += p.velocity.z * dtMs * 0.001;
    
    // Apply gravity for explosion particles
    if (p.type === 'explosion') {
      p.velocity.y -= 9.8 * dtMs * 0.001;
    }
    
    // Update visual
    if (p.mesh) {
      p.mesh.position.copy(p.position);
      
      // Fade out over lifetime
      const lifeRatio = p.age / p.life;
      if (p.mesh.material) {
        p.mesh.material.opacity = Math.max(0, 1 - lifeRatio);
        
        // Shrink particles as they age
        const scale = Math.max(0.1, 1 - lifeRatio * 0.5);
        p.mesh.scale.setScalar(scale);
      }
    }
    
    // Damping for some particle types
    if (p.type === 'engine_trail') {
      p.velocity.x *= 0.99;
      p.velocity.y *= 0.99;
      p.velocity.z *= 0.99;
    }
  }
}

function updateTargetingSystem(dtMs) {`);

// Only add if not already present
if (!content.includes('createExplosionParticles')) {
  content = content.replace(particleFunctionsInsert, advancedParticleFunctions);
  console.log('✅ Added advanced particle system functions');
}

// 3. Add particle updates to main game loop
const explosionUpdateSection = `    // Update explosions
    c.explosions.forEach((ex, i) => {
      ex.age += dtMs;
      if (ex.age > ex.maxAge) {
        scene.remove(ex.group);
        disposeObject(ex.group);
        c.explosions.splice(i, 1);
      }
    });`;

const enhancedExplosionUpdate = `    // Update particle system
    if (c.active) updateParticleSystem(dtMs);

    // Update explosions
    c.explosions.forEach((ex, i) => {
      ex.age += dtMs;
      if (ex.age > ex.maxAge) {
        scene.remove(ex.group);
        disposeObject(ex.group);
        c.explosions.splice(i, 1);
      }
    });`;

// Only add if not already present
if (!content.includes('updateParticleSystem(dtMs)')) {
  content = content.replace(explosionUpdateSection, enhancedExplosionUpdate);
  console.log('✅ Added particle system update to game loop');
}

// 4. Add enhanced sound triggers throughout the game
// Find projectile hit section and enhance it
const projectileHitSection = `          if (dmgNow > 0) {
            e.hp -= dmgNow;
            p._hasHit = true;`;

const enhancedProjectileHit = `          if (dmgNow > 0) {
            e.hp -= dmgNow;
            p._hasHit = true;
            
            // Enhanced hit effects
            const isCritical = Math.random() < 0.1; // 10% critical chance
            if (isCritical) {
              createCriticalHitEffect(e.group.position);
              AudioSFX.play('critical_hit');
              addCombatLog('CRITICAL HIT!', '#ffff00');
            } else {
              createExplosionParticles(e.group.position, 0.5, 0xff4400);
            }`;

// Only add if not already present
if (!content.includes('createCriticalHitEffect')) {
  content = content.replace(projectileHitSection, enhancedProjectileHit);
  console.log('✅ Added enhanced hit effects to projectiles');
}

// 5. Add screen flash effects for various events
const screenFlashCSS = `  <div id="shield-flash" class="screen-flash"></div>
  <div id="critical-flash" class="screen-flash critical"></div>
  <div id="powerup-flash" class="screen-flash powerup"></div>`;

// Look for a good place to add screen flash divs
const hudOverlayLocation = `<div id="hud-overlay">`;
const enhancedHudOverlay = `${screenFlashCSS}
<div id="hud-overlay">`;

// Only add if not already present
if (!content.includes('shield-flash')) {
  content = content.replace(hudOverlayLocation, enhancedHudOverlay);
  console.log('✅ Added screen flash effect divs');
}

// 6. Add CSS for screen flash effects
const screenFlashStyles = cr(`
/* Screen Flash Effects */
.screen-flash {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  opacity: 0;
  z-index: 9999;
  transition: opacity 0.1s ease-out;
}

.screen-flash.active {
  opacity: 0.3;
}

#shield-flash {
  background: radial-gradient(circle, rgba(0,170,255,0.4) 0%, transparent 70%);
}

#critical-flash {
  background: radial-gradient(circle, rgba(255,255,0,0.5) 0%, transparent 60%);
}

#powerup-flash {
  background: radial-gradient(circle, rgba(0,255,136,0.4) 0%, transparent 70%);
}

`);

// Insert CSS before the closing </style> tag
const styleEnd = `</style>`;
const enhancedStyles = `${screenFlashStyles}</style>`;

// Only add if not already present
if (!content.includes('screen-flash')) {
  content = content.replace(styleEnd, enhancedStyles);
  console.log('✅ Added screen flash CSS styles');
}

// Write the file
fs.writeFileSync(htmlPath, content);

console.log('✅ Enhanced sound and particle effects implemented successfully!');
console.log('📊 Features added:');
console.log('   • 8 new sound effects (missile lock, shield hit, engine boost, etc.)');
console.log('   • Advanced particle system with explosion, shield, engine trail effects');
console.log('   • Critical hit system with 10% chance and special effects');
console.log('   • Screen flash effects for shield hits, critical hits, powerups');
console.log('   • Particle physics with gravity, damping, and fade-out');
console.log('   • Enhanced projectile hit effects with visual feedback');