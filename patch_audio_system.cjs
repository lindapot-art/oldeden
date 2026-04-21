const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🔊 DEPLOYING: Sound System & Audio Effects');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add sound system state
const soundState = `      // Sound System & Audio Effects
      audio: {
        enabled: true,
        masterVolume: 0.7,
        effectsVolume: 0.8,
        musicVolume: 0.6,
        ambientVolume: 0.4,
        voiceVolume: 0.9,
        currentMusic: null,
        ambientLoops: new Map(),
        soundPools: new Map(),
        spatialAudio: true,
        compressor: null,
        reverb: null
      },`;

// Add to state object
indexContent = indexContent.replace(
  '      // Advanced Graphics & Effects System',
  `${soundState}
      
      // Advanced Graphics & Effects System`
);

// Add audio system
const audioSystem = `
// === SOUND SYSTEM & AUDIO EFFECTS ===
const audioSystem = {
  // Audio Context
  context: null,
  masterGain: null,
  effectsGain: null,
  musicGain: null,
  ambientGain: null,
  voiceGain: null,
  
  // Audio Pools (for performance)
  soundBuffers: new Map(),
  audioSources: new Map(),
  
  // Procedural Audio Generators
  synthesizers: new Map(),
  
  // 3D Audio System
  listener: null,
  spatialSounds: new Map(),
  
  // Music System
  currentTrack: null,
  musicTracks: [
    'combat_theme',
    'exploration_theme', 
    'boss_battle_theme',
    'victory_theme',
    'ambient_space'
  ],
  
  // Sound Effects Library
  soundEffects: {
    // Weapon sounds
    'weapon_pulse': { frequency: 220, type: 'pulse', duration: 0.1 },
    'weapon_plasma': { frequency: 180, type: 'plasma', duration: 0.15 },
    'weapon_laser': { frequency: 440, type: 'laser', duration: 0.08 },
    'weapon_ion': { frequency: 160, type: 'ion', duration: 0.2 },
    'weapon_missile': { frequency: 120, type: 'missile', duration: 0.3 },
    'weapon_railgun': { frequency: 880, type: 'railgun', duration: 0.05 },
    
    // Combat sounds
    'enemy_explosion': { frequency: 80, type: 'explosion', duration: 0.5 },
    'player_hit': { frequency: 320, type: 'impact', duration: 0.1 },
    'shield_hit': { frequency: 400, type: 'shield', duration: 0.12 },
    'armor_hit': { frequency: 280, type: 'armor', duration: 0.15 },
    
    // UI sounds
    'ui_select': { frequency: 600, type: 'ui', duration: 0.05 },
    'ui_confirm': { frequency: 800, type: 'ui', duration: 0.08 },
    'ui_error': { frequency: 150, type: 'ui', duration: 0.2 },
    'ui_notification': { frequency: 500, type: 'ui', duration: 0.1 },
    
    // Environment sounds
    'engine_thrust': { frequency: 100, type: 'engine', duration: 'loop' },
    'ambient_space': { frequency: 60, type: 'ambient', duration: 'loop' },
    'loot_pickup': { frequency: 700, type: 'pickup', duration: 0.1 },
    'territory_claim': { frequency: 300, type: 'success', duration: 0.3 }
  },
  
  // Audio Processing Effects
  filters: new Map(),
  
  // Performance tracking
  activeAudioNodes: 0,
  maxConcurrentSounds: 32
};

function initAudioSystem() {
  try {
    // Initialize Web Audio API
    audioSystem.context = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create master gain node
    audioSystem.masterGain = audioSystem.context.createGain();
    audioSystem.masterGain.connect(audioSystem.context.destination);
    audioSystem.masterGain.gain.setValueAtTime(state.audio.masterVolume, audioSystem.context.currentTime);
    
    // Create channel gain nodes
    createAudioChannels();
    
    // Initialize 3D audio
    init3DAudio();
    
    // Create audio synthesizers
    createAudioSynthesizers();
    
    // Initialize procedural audio generators
    initProceduralAudio();
    
    // Set up audio processing effects
    createAudioEffects();
    
    // Start ambient audio
    startAmbientAudio();
    
    console.log('🔊 Audio system initialized successfully');
    
  } catch (error) {
    console.warn('🔇 Audio initialization failed:', error);
    console.log('🔇 Running in silent mode');
    state.audio.enabled = false;
  }
}

function createAudioChannels() {
  // Effects channel
  audioSystem.effectsGain = audioSystem.context.createGain();
  audioSystem.effectsGain.connect(audioSystem.masterGain);
  audioSystem.effectsGain.gain.setValueAtTime(state.audio.effectsVolume, audioSystem.context.currentTime);
  
  // Music channel
  audioSystem.musicGain = audioSystem.context.createGain();
  audioSystem.musicGain.connect(audioSystem.masterGain);
  audioSystem.musicGain.gain.setValueAtTime(state.audio.musicVolume, audioSystem.context.currentTime);
  
  // Ambient channel
  audioSystem.ambientGain = audioSystem.context.createGain();
  audioSystem.ambientGain.connect(audioSystem.masterGain);
  audioSystem.ambientGain.gain.setValueAtTime(state.audio.ambientVolume, audioSystem.context.currentTime);
  
  // Voice channel
  audioSystem.voiceGain = audioSystem.context.createGain();
  audioSystem.voiceGain.connect(audioSystem.masterGain);
  audioSystem.voiceGain.gain.setValueAtTime(state.audio.voiceVolume, audioSystem.context.currentTime);
  
  console.log('🎚️ Audio channels created');
}

function init3DAudio() {
  if (!audioSystem.context.listener) return;
  
  // Set up 3D audio listener
  audioSystem.listener = audioSystem.context.listener;
  
  // Position listener at camera/player position
  if (audioSystem.listener.positionX) {
    // Modern browsers
    audioSystem.listener.positionX.setValueAtTime(0, audioSystem.context.currentTime);
    audioSystem.listener.positionY.setValueAtTime(0, audioSystem.context.currentTime);
    audioSystem.listener.positionZ.setValueAtTime(0, audioSystem.context.currentTime);
    
    audioSystem.listener.forwardX.setValueAtTime(0, audioSystem.context.currentTime);
    audioSystem.listener.forwardY.setValueAtTime(0, audioSystem.context.currentTime);
    audioSystem.listener.forwardZ.setValueAtTime(-1, audioSystem.context.currentTime);
    
    audioSystem.listener.upX.setValueAtTime(0, audioSystem.context.currentTime);
    audioSystem.listener.upY.setValueAtTime(1, audioSystem.context.currentTime);
    audioSystem.listener.upZ.setValueAtTime(0, audioSystem.context.currentTime);
  } else {
    // Legacy browsers
    audioSystem.listener.setPosition(0, 0, 0);
    audioSystem.listener.setOrientation(0, 0, -1, 0, 1, 0);
  }
  
  console.log('🎧 3D audio initialized');
}

function createAudioSynthesizers() {
  // Weapon sound synthesizer
  const weaponSynth = {
    type: 'weapon',
    oscillator: null,
    gain: null,
    filter: null,
    
    create: function(frequency, type, duration) {
      const now = audioSystem.context.currentTime;
      
      // Create oscillator
      this.oscillator = audioSystem.context.createOscillator();
      this.gain = audioSystem.context.createGain();
      this.filter = audioSystem.context.createBiquadFilter();
      
      // Configure based on weapon type
      switch(type) {
        case 'pulse':
          this.oscillator.type = 'square';
          this.filter.type = 'bandpass';
          this.filter.frequency.setValueAtTime(frequency * 2, now);
          break;
        case 'plasma':
          this.oscillator.type = 'sawtooth';
          this.filter.type = 'lowpass';
          this.filter.frequency.setValueAtTime(frequency * 4, now);
          break;
        case 'laser':
          this.oscillator.type = 'sine';
          this.filter.type = 'highpass';
          this.filter.frequency.setValueAtTime(frequency, now);
          break;
        case 'ion':
          this.oscillator.type = 'triangle';
          this.filter.type = 'bandpass';
          this.filter.frequency.setValueAtTime(frequency * 0.5, now);
          break;
        case 'railgun':
          this.oscillator.type = 'sawtooth';
          this.filter.type = 'highpass';
          this.filter.frequency.setValueAtTime(frequency * 3, now);
          break;
        default:
          this.oscillator.type = 'square';
          this.filter.type = 'bandpass';
      }
      
      // Set frequency
      this.oscillator.frequency.setValueAtTime(frequency, now);
      
      // Create envelope
      this.gain.gain.setValueAtTime(0, now);
      this.gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
      this.gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      // Connect audio graph
      this.oscillator.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(audioSystem.effectsGain);
      
      // Start and stop
      this.oscillator.start(now);
      this.oscillator.stop(now + duration);
      
      return this.oscillator;
    }
  };
  
  audioSystem.synthesizers.set('weapon', weaponSynth);
  
  // Explosion synthesizer
  const explosionSynth = {
    type: 'explosion',
    
    create: function(frequency, intensity = 1.0, duration = 0.5) {
      const now = audioSystem.context.currentTime;
      
      // Create noise for explosion
      const bufferSize = audioSystem.context.sampleRate * duration;
      const buffer = audioSystem.context.createBuffer(1, bufferSize, audioSystem.context.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate pink noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * intensity * 0.1;
      }
      
      const noise = audioSystem.context.createBufferSource();
      noise.buffer = buffer;
      
      const gain = audioSystem.context.createGain();
      const filter = audioSystem.context.createBiquadFilter();
      
      // Low-pass filter for explosion rumble
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(frequency * 2, now);
      filter.Q.setValueAtTime(0.5, now);
      
      // Explosion envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(intensity * 0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      // Connect and play
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioSystem.effectsGain);
      
      noise.start(now);
      noise.stop(now + duration);
      
      return noise;
    }
  };
  
  audioSystem.synthesizers.set('explosion', explosionSynth);
  
  console.log('🎹 Audio synthesizers created');
}

function initProceduralAudio() {
  // Procedural ambient space sound
  createAmbientSpaceAudio();
  
  // Procedural engine sounds
  createEngineAudio();
  
  console.log('🎵 Procedural audio generators initialized');
}

function createAmbientSpaceAudio() {
  if (!audioSystem.context) return;
  
  const now = audioSystem.context.currentTime;
  
  // Create multiple oscillators for rich ambient sound
  const oscillators = [];
  const gains = [];
  
  const frequencies = [40, 60, 80, 120]; // Low frequencies for space ambience
  
  frequencies.forEach((freq, index) => {
    const osc = audioSystem.context.createOscillator();
    const gain = audioSystem.context.createGain();
    const filter = audioSystem.context.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq + Math.random() * 10, now);
    
    // Slow frequency modulation
    const lfo = audioSystem.context.createOscillator();
    const lfoGain = audioSystem.context.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1 + Math.random() * 0.2, now);
    lfoGain.gain.setValueAtTime(5, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    // Low-pass filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2, now);
    
    // Very low gain for subtle ambience
    gain.gain.setValueAtTime(0.02 / frequencies.length, now);
    
    // Connect audio graph
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioSystem.ambientGain);
    
    // Start
    osc.start(now);
    lfo.start(now);
    
    oscillators.push(osc);
    gains.push(gain);
  });
  
  // Store for later control
  audioSystem.ambientSpace = { oscillators, gains };
  
  console.log('🌌 Ambient space audio created');
}

function createEngineAudio() {
  if (!audioSystem.context) return;
  
  const now = audioSystem.context.currentTime;
  
  // Engine oscillator with modulation
  const engineOsc = audioSystem.context.createOscillator();
  const engineGain = audioSystem.context.createGain();
  const engineFilter = audioSystem.context.createBiquadFilter();
  
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.setValueAtTime(80, now);
  
  engineFilter.type = 'lowpass';
  engineFilter.frequency.setValueAtTime(200, now);
  
  engineGain.gain.setValueAtTime(0, now); // Start silent
  
  engineOsc.connect(engineFilter);
  engineFilter.connect(engineGain);
  engineGain.connect(audioSystem.effectsGain);
  
  engineOsc.start(now);
  
  audioSystem.engineAudio = {
    oscillator: engineOsc,
    gain: engineGain,
    filter: engineFilter
  };
  
  console.log('🚀 Engine audio created');
}

function createAudioEffects() {
  if (!audioSystem.context) return;
  
  // Reverb effect
  createReverbEffect();
  
  // Compressor for dynamic range
  createCompressorEffect();
  
  console.log('🎛️ Audio effects created');
}

function createReverbEffect() {
  // Simple reverb using delay and feedback
  const delay = audioSystem.context.createDelay(1.0);
  const feedback = audioSystem.context.createGain();
  const mix = audioSystem.context.createGain();
  
  delay.delayTime.setValueAtTime(0.3, audioSystem.context.currentTime);
  feedback.gain.setValueAtTime(0.3, audioSystem.context.currentTime);
  mix.gain.setValueAtTime(0.1, audioSystem.context.currentTime);
  
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(mix);
  mix.connect(audioSystem.masterGain);
  
  audioSystem.reverb = {
    delay: delay,
    feedback: feedback,
    mix: mix
  };
}

function createCompressorEffect() {
  const compressor = audioSystem.context.createDynamicsCompressor();
  
  compressor.threshold.setValueAtTime(-24, audioSystem.context.currentTime);
  compressor.knee.setValueAtTime(30, audioSystem.context.currentTime);
  compressor.ratio.setValueAtTime(12, audioSystem.context.currentTime);
  compressor.attack.setValueAtTime(0.003, audioSystem.context.currentTime);
  compressor.release.setValueAtTime(0.25, audioSystem.context.currentTime);
  
  // Insert compressor before master gain
  audioSystem.masterGain.disconnect();
  audioSystem.masterGain.connect(compressor);
  compressor.connect(audioSystem.context.destination);
  
  audioSystem.compressor = compressor;
}

function startAmbientAudio() {
  if (!state.audio.enabled || !audioSystem.context) return;
  
  console.log('🎵 Ambient audio started');
}`;

// Add audio system after graphics system
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${audioSystem}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Sound System & Audio Effects (Part 1) deployed!');
console.log('🔊 Features: Web Audio API, 3D spatial audio, procedural synthesis');
console.log('🎵 Generators: Weapon sounds, explosions, ambient space, engine audio');
console.log('🎚️ Channels: Master, Effects, Music, Ambient, Voice with independent volume control');