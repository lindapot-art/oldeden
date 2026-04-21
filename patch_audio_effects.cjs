const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🔊 DEPLOYING: Audio Integration & Sound Effects');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add sound effect functions
const soundEffectFunctions = `
// === SOUND EFFECT FUNCTIONS ===
function playSound(soundName, position = null, intensity = 1.0, pitch = 1.0) {
  if (!state.audio.enabled || !audioSystem.context) return;
  
  if (audioSystem.activeAudioNodes >= audioSystem.maxConcurrentSounds) {
    return; // Prevent audio overload
  }
  
  const soundDef = audioSystem.soundEffects[soundName];
  if (!soundDef) {
    console.warn(\`🔇 Unknown sound: \${soundName}\`);
    return;
  }
  
  let audioNode;
  
  // Create appropriate audio based on type
  switch(soundDef.type) {
    case 'weapon':
      audioNode = createWeaponSound(soundDef, intensity, pitch);
      break;
    case 'explosion':
      audioNode = createExplosionSound(soundDef, intensity);
      break;
    case 'ui':
      audioNode = createUISound(soundDef, intensity);
      break;
    case 'engine':
      audioNode = updateEngineSound(intensity);
      break;
    case 'ambient':
      audioNode = createAmbientSound(soundDef, intensity);
      break;
    case 'impact':
    case 'shield':
    case 'armor':
      audioNode = createImpactSound(soundDef, intensity);
      break;
    case 'pickup':
    case 'success':
      audioNode = createPositiveSound(soundDef, intensity);
      break;
    default:
      audioNode = createGenericSound(soundDef, intensity, pitch);
  }
  
  // Apply 3D positioning if position provided
  if (position && audioNode && state.audio.spatialAudio) {
    apply3DPositioning(audioNode, position);
  }
  
  audioSystem.activeAudioNodes++;
  
  // Clean up after sound ends
  if (audioNode && soundDef.duration !== 'loop') {
    setTimeout(() => {
      audioSystem.activeAudioNodes = Math.max(0, audioSystem.activeAudioNodes - 1);
    }, soundDef.duration * 1000 + 100);
  }
  
  return audioNode;
}

function createWeaponSound(soundDef, intensity, pitch) {
  const synth = audioSystem.synthesizers.get('weapon');
  if (!synth) return null;
  
  const frequency = soundDef.frequency * pitch;
  const duration = soundDef.duration;
  
  return synth.create(frequency, soundDef.type, duration);
}

function createExplosionSound(soundDef, intensity) {
  const synth = audioSystem.synthesizers.get('explosion');
  if (!synth) return null;
  
  return synth.create(soundDef.frequency, intensity, soundDef.duration);
}

function createUISound(soundDef, intensity) {
  if (!audioSystem.context) return null;
  
  const now = audioSystem.context.currentTime;
  const osc = audioSystem.context.createOscillator();
  const gain = audioSystem.context.createGain();
  const filter = audioSystem.context.createBiquadFilter();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(soundDef.frequency, now);
  
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(soundDef.frequency * 2, now);
  filter.Q.setValueAtTime(2, now);
  
  // Sharp attack, quick decay for UI sounds
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(intensity * 0.1, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + soundDef.duration);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioSystem.effectsGain);
  
  osc.start(now);
  osc.stop(now + soundDef.duration);
  
  return osc;
}

function createImpactSound(soundDef, intensity) {
  if (!audioSystem.context) return null;
  
  const now = audioSystem.context.currentTime;
  
  // Create noise burst for impact
  const bufferSize = audioSystem.context.sampleRate * soundDef.duration;
  const buffer = audioSystem.context.createBuffer(1, bufferSize, audioSystem.context.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * intensity * 0.05;
  }
  
  const noise = audioSystem.context.createBufferSource();
  noise.buffer = buffer;
  
  const gain = audioSystem.context.createGain();
  const filter = audioSystem.context.createBiquadFilter();
  
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(soundDef.frequency, now);
  filter.Q.setValueAtTime(1, now);
  
  gain.gain.setValueAtTime(intensity * 0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + soundDef.duration);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioSystem.effectsGain);
  
  noise.start(now);
  noise.stop(now + soundDef.duration);
  
  return noise;
}

function createPositiveSound(soundDef, intensity) {
  if (!audioSystem.context) return null;
  
  const now = audioSystem.context.currentTime;
  const osc1 = audioSystem.context.createOscillator();
  const osc2 = audioSystem.context.createOscillator();
  const gain = audioSystem.context.createGain();
  
  // Harmonious frequencies for positive sounds
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(soundDef.frequency, now);
  
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(soundDef.frequency * 1.5, now); // Perfect fifth
  
  // Pleasant envelope
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(intensity * 0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + soundDef.duration);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioSystem.effectsGain);
  
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + soundDef.duration);
  osc2.stop(now + soundDef.duration);
  
  return [osc1, osc2];
}

function createGenericSound(soundDef, intensity, pitch) {
  if (!audioSystem.context) return null;
  
  const now = audioSystem.context.currentTime;
  const osc = audioSystem.context.createOscillator();
  const gain = audioSystem.context.createGain();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(soundDef.frequency * pitch, now);
  
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(intensity * 0.1, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + soundDef.duration);
  
  osc.connect(gain);
  gain.connect(audioSystem.effectsGain);
  
  osc.start(now);
  osc.stop(now + soundDef.duration);
  
  return osc;
}

function updateEngineSound(thrustLevel) {
  if (!audioSystem.engineAudio || !state.audio.enabled) return;
  
  const now = audioSystem.context.currentTime;
  const engine = audioSystem.engineAudio;
  
  // Update engine volume based on thrust
  const targetVolume = thrustLevel * 0.05;
  engine.gain.gain.linearRampToValueAtTime(targetVolume, now + 0.1);
  
  // Update engine frequency based on thrust
  const targetFreq = 80 + (thrustLevel * 40);
  engine.oscillator.frequency.linearRampToValueAtTime(targetFreq, now + 0.1);
  
  // Update filter cutoff for engine character
  const targetFilter = 200 + (thrustLevel * 300);
  engine.filter.frequency.linearRampToValueAtTime(targetFilter, now + 0.1);
}

function apply3DPositioning(audioNode, position) {
  if (!audioSystem.context || !audioSystem.listener) return;
  
  try {
    // Create panner for 3D audio
    const panner = audioSystem.context.createPanner();
    
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'linear';
    panner.refDistance = 10;
    panner.maxDistance = 200;
    panner.rolloffFactor = 1;
    
    // Set position
    if (panner.positionX) {
      panner.positionX.setValueAtTime(position.x, audioSystem.context.currentTime);
      panner.positionY.setValueAtTime(position.y, audioSystem.context.currentTime);
      panner.positionZ.setValueAtTime(position.z, audioSystem.context.currentTime);
    } else {
      panner.setPosition(position.x, position.y, position.z);
    }
    
    // Re-route audio through panner
    if (audioNode.disconnect && audioNode.connect) {
      audioNode.disconnect();
      audioNode.connect(panner);
      panner.connect(audioSystem.effectsGain);
    }
    
  } catch (error) {
    console.warn('3D audio positioning failed:', error);
  }
}

// Audio control functions
function setMasterVolume(volume) {
  if (!audioSystem.masterGain) return;
  
  state.audio.masterVolume = Math.max(0, Math.min(1, volume));
  audioSystem.masterGain.gain.setValueAtTime(
    state.audio.masterVolume,
    audioSystem.context.currentTime
  );
}

function setEffectsVolume(volume) {
  if (!audioSystem.effectsGain) return;
  
  state.audio.effectsVolume = Math.max(0, Math.min(1, volume));
  audioSystem.effectsGain.gain.setValueAtTime(
    state.audio.effectsVolume,
    audioSystem.context.currentTime
  );
}

function setMusicVolume(volume) {
  if (!audioSystem.musicGain) return;
  
  state.audio.musicVolume = Math.max(0, Math.min(1, volume));
  audioSystem.musicGain.gain.setValueAtTime(
    state.audio.musicVolume,
    audioSystem.context.currentTime
  );
}

function setAmbientVolume(volume) {
  if (!audioSystem.ambientGain) return;
  
  state.audio.ambientVolume = Math.max(0, Math.min(1, volume));
  audioSystem.ambientGain.gain.setValueAtTime(
    state.audio.ambientVolume,
    audioSystem.context.currentTime
  );
}

function toggleAudio() {
  state.audio.enabled = !state.audio.enabled;
  
  if (state.audio.enabled) {
    // Resume audio context if needed
    if (audioSystem.context && audioSystem.context.state === 'suspended') {
      audioSystem.context.resume();
    }
    setMasterVolume(0.7);
    console.log('🔊 Audio enabled');
  } else {
    // Suspend audio context
    if (audioSystem.context) {
      audioSystem.context.suspend();
    }
    setMasterVolume(0);
    console.log('🔇 Audio disabled');
  }
}

function toggle3DAudio() {
  state.audio.spatialAudio = !state.audio.spatialAudio;
  const status = state.audio.spatialAudio ? 'enabled' : 'disabled';
  console.log(\`🎧 3D audio \${status}\`);
}

// Update audio system
function updateAudioSystem(deltaTime) {
  if (!state.audio.enabled || !audioSystem.context) return;
  
  // Update listener position (follow camera/player)
  updateListenerPosition();
  
  // Update engine sound based on ship movement
  updateEngineAudio(deltaTime);
  
  // Update ambient audio
  updateAmbientAudio(deltaTime);
  
  // Manage audio node count
  if (audioSystem.activeAudioNodes > audioSystem.maxConcurrentSounds) {
    console.warn('⚠️ Too many concurrent audio nodes, throttling');
  }
}

function updateListenerPosition() {
  if (!audioSystem.listener || !ship) return;
  
  const pos = ship.position;
  const now = audioSystem.context.currentTime;
  
  if (audioSystem.listener.positionX) {
    audioSystem.listener.positionX.linearRampToValueAtTime(pos.x, now + 0.1);
    audioSystem.listener.positionY.linearRampToValueAtTime(pos.y, now + 0.1);
    audioSystem.listener.positionZ.linearRampToValueAtTime(pos.z, now + 0.1);
  } else {
    audioSystem.listener.setPosition(pos.x, pos.y, pos.z);
  }
}

function updateEngineAudio(deltaTime) {
  // Calculate thrust level based on ship movement
  let thrustLevel = 0;
  
  if (ship && ship.userData && ship.userData.velocity) {
    thrustLevel = Math.min(ship.userData.velocity.length() / 10, 1.0);
  }
  
  // Add input-based thrust
  if (keys['KeyW'] || keys['ArrowUp']) thrustLevel = Math.max(thrustLevel, 0.8);
  if (keys['KeyS'] || keys['ArrowDown']) thrustLevel = Math.max(thrustLevel, 0.6);
  if (keys['KeyA'] || keys['ArrowLeft'] || keys['KeyD'] || keys['ArrowRight']) {
    thrustLevel = Math.max(thrustLevel, 0.4);
  }
  
  updateEngineSound(thrustLevel);
}

function updateAmbientAudio(deltaTime) {
  // Subtle variations in ambient space sound
  if (audioSystem.ambientSpace && audioSystem.ambientSpace.gains) {
    audioSystem.ambientSpace.gains.forEach((gain, index) => {
      if (gain && gain.gain) {
        const variation = Math.sin(Date.now() * 0.0001 + index) * 0.005;
        const targetGain = 0.02 / audioSystem.ambientSpace.gains.length + variation;
        gain.gain.setTargetAtTime(targetGain, audioSystem.context.currentTime, 1.0);
      }
    });
  }
}

// Gameplay audio integration functions
function playWeaponFireSound(weaponType, position = null) {
  const weaponSounds = {
    'pulse': 'weapon_pulse',
    'plasma': 'weapon_plasma', 
    'laser': 'weapon_laser',
    'ion': 'weapon_ion',
    'missile': 'weapon_missile',
    'railgun': 'weapon_railgun'
  };
  
  const soundName = weaponSounds[weaponType] || 'weapon_pulse';
  playSound(soundName, position, 1.0, 1.0 + Math.random() * 0.2 - 0.1);
}

function playEnemyDeathSound(position, isBoss = false) {
  const intensity = isBoss ? 2.0 : 1.0;
  playSound('enemy_explosion', position, intensity);
}

function playPlayerHitSound(damageType = 'hull') {
  const sounds = {
    'hull': 'player_hit',
    'shield': 'shield_hit',
    'armor': 'armor_hit'
  };
  
  playSound(sounds[damageType] || 'player_hit', null, 1.0);
}

function playUISound(actionType) {
  const sounds = {
    'select': 'ui_select',
    'confirm': 'ui_confirm',
    'error': 'ui_error',
    'notification': 'ui_notification'
  };
  
  playSound(sounds[actionType] || 'ui_select');
}

function playLootPickupSound() {
  playSound('loot_pickup', null, 1.0, 1.0 + Math.random() * 0.4 - 0.2);
}

function playTerritoryClaimSound() {
  playSound('territory_claim');
}`;

// Add sound effect functions
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${soundEffectFunctions}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Audio Integration & Sound Effects deployed!');
console.log('🔊 Features: Sound effect functions, 3D positioning, procedural audio');
console.log('🎮 Integration: Weapon sounds, explosions, UI feedback, engine audio');
console.log('🎚️ Controls: Volume management, 3D audio toggle, audio enable/disable');