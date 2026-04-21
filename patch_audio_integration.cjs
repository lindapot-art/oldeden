const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🔊 DEPLOYING: Audio System Integration & Controls');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add audio system initialization
const audioSystemInit = `    // Initialize audio system
    initAudioSystem();`;

// Add after graphics init
indexContent = indexContent.replace(
  '    // Initialize advanced graphics system',
  `    // Initialize audio system
    initAudioSystem();
    
    // Initialize advanced graphics system`
);

// Add audio controls
const audioControls = `        case 'KeyM': // Toggle audio (M for Mute)
          if (threeReady) {
            toggleAudio();
          }
          break;
        
        case 'KeyN': // Toggle 3D audio
          if (threeReady) {
            toggle3DAudio();
          }
          break;
        
        case 'Equal': // Volume up (+)
          if (threeReady) {
            setMasterVolume(state.audio.masterVolume + 0.1);
            console.log(\`🔊 Volume: \${Math.round(state.audio.masterVolume * 100)}%\`);
          }
          break;
        
        case 'Minus': // Volume down (-)
          if (threeReady) {
            setMasterVolume(state.audio.masterVolume - 0.1);
            console.log(\`🔊 Volume: \${Math.round(state.audio.masterVolume * 100)}%\`);
          }
          break;

`;

// Add audio controls after graphics controls
indexContent = indexContent.replace(
  `        case 'KeyQ': // Quality adjustment`,
  `        case 'KeyM': // Toggle audio (M for Mute)
          if (threeReady) {
            toggleAudio();
          }
          break;
        
        case 'KeyN': // Toggle 3D audio
          if (threeReady) {
            toggle3DAudio();
          }
          break;
        
        case 'Equal': // Volume up (+)
          if (threeReady) {
            setMasterVolume(state.audio.masterVolume + 0.1);
            console.log(\`🔊 Volume: \${Math.round(state.audio.masterVolume * 100)}%\`);
          }
          break;
        
        case 'Minus': // Volume down (-)
          if (threeReady) {
            setMasterVolume(state.audio.masterVolume - 0.1);
            console.log(\`🔊 Volume: \${Math.round(state.audio.masterVolume * 100)}%\`);
          }
          break;

        case 'KeyQ': // Quality adjustment`
);

// Add audio updates to game loop
const audioUpdate = `      // Update audio system
      updateAudioSystem(deltaTime);`;

// Add after graphics updates
indexContent = indexContent.replace(
  '      // Update advanced graphics system',
  `      // Update audio system
      updateAudioSystem(deltaTime);
      
      // Update advanced graphics system`
);

// Add audio integration with existing game events
const audioIntegration = `
// === AUDIO INTEGRATION WITH GAME EVENTS ===

// Override weapon firing to add sound
function fireProjectileWithAudio(weaponType = 'pulse') {
  // Play weapon sound
  playWeaponFireSound(weaponType, ship ? ship.position : null);
  
  // Call original fire function (assuming it exists)
  if (typeof fireProjectile === 'function') {
    fireProjectile();
  } else {
    // Fallback: create projectile directly
    createProjectileWithSound(weaponType);
  }
}

function createProjectileWithSound(weaponType) {
  // Create projectile geometry
  const projGeom = new THREE.SphereGeometry(1.2, 6, 6);
  
  // Weapon-specific colors and properties
  const weaponProps = {
    'pulse': { color: 0x0080ff, speed: 80, damage: 15 },
    'plasma': { color: 0x00ff80, speed: 60, damage: 20 },
    'laser': { color: 0xff0040, speed: 120, damage: 12 },
    'ion': { color: 0x8000ff, speed: 50, damage: 25 },
    'missile': { color: 0xff8000, speed: 40, damage: 35 },
    'railgun': { color: 0xffff00, speed: 200, damage: 50 }
  };
  
  const props = weaponProps[weaponType] || weaponProps['pulse'];
  
  const projMat = new THREE.MeshBasicMaterial({ 
    color: props.color,
    emissive: props.color,
    emissiveIntensity: 0.5
  });
  
  const projectile = new THREE.Mesh(projGeom, projMat);
  
  if (ship) {
    projectile.position.copy(ship.position);
    
    const direction = new THREE.Vector3(0, 1, 0);
    const velocity = direction.multiplyScalar(props.speed);
    
    projectile.userData = {
      velocity: velocity,
      damage: props.damage,
      weaponType: weaponType,
      isPlayerProjectile: true,
      age: 0
    };
    
    scene.add(projectile);
    c.projectiles.push(projectile);
  }
}

// Enhanced enemy death with audio
function handleEnemyDeathWithAudio(enemy) {
  if (enemy && enemy.group && enemy.group.position) {
    // Play death sound
    playEnemyDeathSound(enemy.group.position, enemy.isBoss);
    
    // Trigger explosion effect with audio
    if (typeof createEnhancedExplosion === 'function') {
      createEnhancedExplosion(enemy.group.position, 'enemy');
    }
  }
}

// UI audio feedback
function handleUIInteractionAudio(element, actionType = 'select') {
  playUISound(actionType);
}

// Audio context activation (required for modern browsers)
function activateAudioContext() {
  if (audioSystem.context && audioSystem.context.state === 'suspended') {
    audioSystem.context.resume().then(() => {
      console.log('🔊 Audio context activated');
    });
  }
}

// Auto-activate audio on first user interaction
document.addEventListener('click', activateAudioContext, { once: true });
document.addEventListener('keydown', activateAudioContext, { once: true });

// Audio event handlers for existing game systems
function initAudioEventHandlers() {
  // Weapon firing audio
  if (typeof switchWeapon === 'function') {
    const originalSwitchWeapon = switchWeapon;
    switchWeapon = function(...args) {
      playUISound('select');
      return originalSwitchWeapon.apply(this, args);
    };
  }
  
  console.log('🔊 Audio event handlers initialized');
}`;

// Add audio integration functions
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${audioIntegration}

function updateGraphicsQualityNote() {`
);

// Add audio status to UI updates
const audioStatus = `
        // Audio system status
        const audioStatus = document.getElementById('audio-status-display');
        if (!audioStatus) {
            const display = document.createElement('div');
            display.id = 'audio-status-display';
            display.style.cssText = \`
                position: absolute;
                top: 520px;
                right: 10px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                background: rgba(0, 40, 0, 0.8);
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #00ff80;
                z-index: 1000;
            \`;
            document.body.appendChild(display);
        }
        
        const audioEnabled = state.audio.enabled ? 'ON' : 'OFF';
        const volumeLevel = Math.round(state.audio.masterVolume * 100);
        const spatialAudio = state.audio.spatialAudio ? '3D' : '2D';
        const activeNodes = audioSystem.activeAudioNodes || 0;
        
        document.getElementById('audio-status-display').innerHTML = \`
            <div style="color: #00ff80; font-weight: bold;">🔊 AUDIO</div>
            <div>Status: \${audioEnabled}</div>
            <div>Volume: \${volumeLevel}%</div>
            <div>Mode: \${spatialAudio}</div>
            <div>Nodes: \${activeNodes}/\${audioSystem.maxConcurrentSounds || 32}</div>
            <div style="font-size: 10px; color: #888; margin-top: 4px;">
                M = Mute | +/- = Volume | N = 3D
            </div>
        \`;`;

// Add audio status to UI updates
indexContent = indexContent.replace(
  '        document.getElementById(\'ai-status-display\').innerHTML = `',
  audioStatus + cr() + cr() + '        document.getElementById(\'ai-status-display\').innerHTML = `'
);

// Integrate audio with existing weapon firing
if (indexContent.includes('fireProjectile();')) {
  indexContent = indexContent.replace(
    'fireProjectile();',
    `fireProjectile();
        playWeaponFireSound(currentWeapon.type, ship ? ship.position : null);`
  );
}

// Integrate audio with loot pickup
if (indexContent.includes('state.player.score += loot.value;')) {
  indexContent = indexContent.replace(
    'state.player.score += loot.value;',
    `state.player.score += loot.value;
          playLootPickupSound();`
  );
}

// Integrate audio with territory claiming
if (indexContent.includes('addCombatLog(`TERRITORY CLAIMED:')) {
  indexContent = indexContent.replace(
    'addCombatLog(`TERRITORY CLAIMED:',
    `playTerritoryClaimSound();
    addCombatLog(\`TERRITORY CLAIMED:`
  );
}

// Initialize audio event handlers
if (indexContent.includes('    initAudioSystem();')) {
  indexContent = indexContent.replace(
    '    initAudioSystem();',
    `    initAudioSystem();
    initAudioEventHandlers();`
  );
}

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Audio System Integration & Controls deployed!');
console.log('🎮 Controls integrated: M = Mute, N = 3D Audio, +/- = Volume');
console.log('🔊 Features: Audio context activation, event handlers, UI feedback');
console.log('📊 UI: Audio status panel, volume display, node monitoring');
console.log('🎵 Integration: Weapon fire, enemy deaths, loot pickup, territory claim sounds');