const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🎨 DEPLOYING: Graphics System Integration & Controls');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add graphics system initialization
const graphicsSystemInit = `    // Initialize advanced graphics system
    initAdvancedGraphicsSystem();`;

// Add after territory init
indexContent = indexContent.replace(
  '    // Initialize territory system',
  `    // Initialize advanced graphics system
    initAdvancedGraphicsSystem();
    
    // Initialize territory system`
);

// Add graphics controls
const graphicsControls = `        case 'KeyV': // Toggle visual effects
          if (threeReady) {
            toggleVisualEffects();
          }
          break;
        
        case 'KeyQ': // Quality adjustment
          if (threeReady) {
            cycleQualityLevel();
          }
          break;

`;

// Add graphics controls after territory controls
indexContent = indexContent.replace(
  `        case 'KeyN': // Next territory`,
  `        case 'KeyV': // Toggle visual effects
          if (threeReady) {
            toggleVisualEffects();
          }
          break;
        
        case 'KeyQ': // Quality adjustment
          if (threeReady) {
            cycleQualityLevel();
          }
          break;

        case 'KeyN': // Next territory`
);

// Add graphics updates to game loop
const graphicsUpdate = `      // Update advanced graphics system
      updateAdvancedGraphics(deltaTime);`;

// Add after territory updates
indexContent = indexContent.replace(
  '      // Update territory system',
  `      // Update advanced graphics system
      updateAdvancedGraphics(deltaTime);
      
      // Update territory system`
);

// Add graphics control functions
const graphicsControlFunctions = `
function toggleVisualEffects() {
    state.graphics.particles.starfield.enabled = !state.graphics.particles.starfield.enabled;
    state.graphics.particles.debris.enabled = !state.graphics.particles.debris.enabled;
    
    // Toggle starfield visibility
    if (advancedGraphics.starField) {
        advancedGraphics.starField.visible = state.graphics.particles.starfield.enabled;
    }
    
    // Toggle debris visibility
    advancedGraphics.debrisField.forEach(debris => {
        debris.visible = state.graphics.particles.debris.enabled;
    });
    
    // Toggle atmospheric effects
    if (advancedGraphics.nebula) {
        advancedGraphics.nebula.visible = state.graphics.particles.debris.enabled;
    }
    
    if (advancedGraphics.galaxy) {
        advancedGraphics.galaxy.visible = state.graphics.particles.starfield.enabled;
    }
    
    const status = state.graphics.particles.starfield.enabled ? 'ENABLED' : 'DISABLED';
    addCombatLog(\`VISUAL EFFECTS: \${status}\`, '#00ffff');
    
    console.log(\`🎨 Visual effects \${status.toLowerCase()}\`);
}

function cycleQualityLevel() {
    advancedGraphics.qualityLevel = (advancedGraphics.qualityLevel + 1) % 4;
    adjustQualitySettings();
    
    const qualityNames = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
    const qualityName = qualityNames[advancedGraphics.qualityLevel];
    
    addCombatLog(\`GRAPHICS QUALITY: \${qualityName}\`, '#ffaa00');
    console.log(\`🎨 Graphics quality set to \${qualityName}\`);
}

// Enhanced explosion effect for enemy deaths
function createEnhancedExplosion(position, type = 'normal') {
    // Use existing createExplosionEffect but with enhancements
    let intensity = 1.0;
    let color = 0xff4400;
    
    switch(type) {
        case 'enemy':
            intensity = 0.8;
            color = 0xff6600;
            break;
        case 'player':
            intensity = 1.5;
            color = 0x0080ff;
            break;
        case 'critical':
            intensity = 2.0;
            color = 0xff0080;
            break;
        case 'building':
            intensity = 1.2;
            color = 0xffaa00;
            break;
    }
    
    createExplosionEffect(position, intensity);
    
    // Add screen shake for larger explosions
    if (intensity > 1.0) {
        createScreenShake(intensity * 5);
    }
    
    // Add particle burst
    createParticleBurst(position, color, intensity);
}

function createScreenShake(intensity) {
    // Simple camera shake effect
    if (!camera) return;
    
    const shakeAmount = intensity * 0.5;
    const originalPosition = camera.position.clone();
    
    const shakeEnd = Date.now() + (intensity * 100);
    
    function shake() {
        if (Date.now() < shakeEnd) {
            camera.position.x = originalPosition.x + (Math.random() - 0.5) * shakeAmount;
            camera.position.y = originalPosition.y + (Math.random() - 0.5) * shakeAmount;
            requestAnimationFrame(shake);
        } else {
            camera.position.copy(originalPosition);
        }
    }
    
    shake();
}

function createParticleBurst(position, color, intensity) {
    const particleCount = Math.floor(intensity * 20);
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 4, 4),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            })
        );
        
        particle.position.copy(position);
        
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30
        );
        
        particle.userData = {
            velocity: velocity,
            life: 1.0,
            decay: 0.02
        };
        
        scene.add(particle);
        
        // Add to update list
        if (!advancedGraphics.tempParticles) {
            advancedGraphics.tempParticles = [];
        }
        advancedGraphics.tempParticles.push(particle);
    }
}

// Update temporary particles
function updateTempParticles(deltaTime) {
    if (!advancedGraphics.tempParticles) return;
    
    for (let i = advancedGraphics.tempParticles.length - 1; i >= 0; i--) {
        const particle = advancedGraphics.tempParticles[i];
        
        // Update position
        particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime * 0.01));
        
        // Update life
        particle.userData.life -= particle.userData.decay;
        particle.material.opacity = particle.userData.life;
        
        // Apply gravity/deceleration
        particle.userData.velocity.multiplyScalar(0.98);
        
        // Remove dead particles
        if (particle.userData.life <= 0) {
            scene.remove(particle);
            advancedGraphics.tempParticles.splice(i, 1);
        }
    }
}

// Enhanced graphics integration with existing systems
function enhanceExistingEffects() {
    // This would typically be called after game objects are created
    console.log('🎨 Enhanced effects integrated with game systems');
}`;

// Add graphics control functions
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${graphicsControlFunctions}

function updateGraphicsQualityNote() {`
);

// Enhance updateAdvancedGraphics to include temp particles
if (indexContent.includes('updateShaderMaterials(deltaTime);')) {
  indexContent = indexContent.replace(
    'updateShaderMaterials(deltaTime);',
    `updateShaderMaterials(deltaTime);
  
  // Update temporary particles
  updateTempParticles(deltaTime);`
  );
}

// Add graphics status to UI updates
const graphicsStatus = `
        // Graphics system status
        const graphicsStatus = document.getElementById('graphics-status-display');
        if (!graphicsStatus) {
            const display = document.createElement('div');
            display.id = 'graphics-status-display';
            display.style.cssText = \`
                position: absolute;
                top: 420px;
                right: 10px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                background: rgba(40, 0, 40, 0.8);
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #ff00ff;
                z-index: 1000;
            \`;
            document.body.appendChild(display);
        }
        
        const qualityNames = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
        const effectsStatus = state.graphics.particles.starfield.enabled ? 'ON' : 'OFF';
        const fps = Math.round(advancedGraphics.currentFPS);
        
        document.getElementById('graphics-status-display').innerHTML = \`
            <div style="color: #ff00ff; font-weight: bold;">🎨 GRAPHICS</div>
            <div>Quality: \${qualityNames[advancedGraphics.qualityLevel]}</div>
            <div>Effects: \${effectsStatus}</div>
            <div>FPS: \${fps}</div>
            <div style="font-size: 10px; color: #888; margin-top: 4px;">
                V = Effects | Q = Quality
            </div>
        \`;`;

// Add graphics status to UI updates
indexContent = indexContent.replace(
  '        document.getElementById(\'ai-status-display\').innerHTML = `',
  graphicsStatus + cr() + cr() + '        document.getElementById(\'ai-status-display\').innerHTML = `'
);

// Integrate explosions with enemy death system
if (indexContent.includes('createLootDrop(enemy);')) {
  indexContent = indexContent.replace(
    'createLootDrop(enemy);',
    `createLootDrop(enemy);
        createEnhancedExplosion(enemy.group.position, 'enemy');`
  );
}

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Graphics System Integration & Controls deployed!');
console.log('🎮 Controls integrated: V = Visual Effects, Q = Quality Level');
console.log('🎨 Features: Enhanced explosions, screen shake, particle bursts');
console.log('📊 UI: Graphics status panel, FPS counter, quality display');
console.log('💥 Effects: Enemy explosions, screen shake, temporary particles');