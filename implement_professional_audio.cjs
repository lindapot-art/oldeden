const fs = require('fs');

// 🔊 IMPLEMENT PROFESSIONAL AUDIO SYSTEM - Cycle 2 Improvement  
console.log('🔊 IMPLEMENTING PROFESSIONAL AUDIO SYSTEM...');

function safeReplace(content, search, replacement) {
  if (!content.includes(search)) {
    console.warn(`⚠️  Search string not found: ${search.substring(0, 80)}...`);
    return content;
  }
  return content.replace(search, replacement);
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  let html = fs.readFileSync('public/index.html', 'utf-8');
  
  // 1. REPLACE SYNTHETIC AUDIO WITH PROFESSIONAL BASS-HEAVY SOUNDS
  const oldBasicAudio = `    // Basic sound system
    function playSound(type) {
      if (!audioContext) return;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch(type) {
        case 'shoot':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
          break;
        case 'hit':
          oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
          break;
        case 'explosion':
          oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 0.5);
          break;
      }
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    }`;

  const newProfessionalAudio = `    // PROFESSIONAL BASS-HEAVY AUDIO SYSTEM
    const audioCache = new Map();
    const masterVolume = 0.3;
    let bassContext = null;
    
    // Initialize professional audio context with bass enhancement
    function initProfessionalAudio() {
      if (!audioContext) return;
      
      // Create bass enhancement pipeline
      bassContext = {
        compressor: audioContext.createDynamicsCompressor(),
        bassBoost: audioContext.createBiquadFilter(),
        masterGain: audioContext.createGain()
      };
      
      // Configure bass boost filter
      bassContext.bassBoost.type = 'lowshelf';
      bassContext.bassBoost.frequency.setValueAtTime(200, audioContext.currentTime);
      bassContext.bassBoost.gain.setValueAtTime(8, audioContext.currentTime); // +8dB bass boost
      
      // Configure compressor for punchy dynamics
      bassContext.compressor.threshold.setValueAtTime(-24, audioContext.currentTime);
      bassContext.compressor.knee.setValueAtTime(30, audioContext.currentTime);
      bassContext.compressor.ratio.setValueAtTime(12, audioContext.currentTime);
      bassContext.compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
      bassContext.compressor.release.setValueAtTime(0.25, audioContext.currentTime);
      
      // Master volume
      bassContext.masterGain.gain.setValueAtTime(masterVolume, audioContext.currentTime);
      
      // Connect audio pipeline: bassBoost → compressor → masterGain → destination
      bassContext.bassBoost.connect(bassContext.compressor);
      bassContext.compressor.connect(bassContext.masterGain);
      bassContext.masterGain.connect(audioContext.destination);
    }
    
    // Professional sound generation with bass-heavy characteristics
    function playSound(type, intensity = 1.0) {
      if (!audioContext || !bassContext) {
        setTimeout(() => {
          initProfessionalAudio();
          playSound(type, intensity);
        }, 100);
        return;
      }
      
      const now = audioContext.currentTime;
      const duration = getAudioDuration(type);
      
      switch(type) {
        case 'shoot':
          generateGatlingSound(intensity, now, duration);
          break;
        case 'hit':
          generateImpactSound(intensity, now, duration);
          break;
        case 'explosion':
          generateExplosionSound(intensity, now, duration);
          break;
        case 'missile':
          generateMissileSound(intensity, now, duration);
          break;
        case 'collision':
          generateCollisionSound(intensity, now, duration);
          break;
        default:
          generateGenericSound(type, intensity, now, duration);
      }
    }
    
    function getAudioDuration(type) {
      const durations = {
        'shoot': 0.15,
        'hit': 0.3,
        'explosion': 1.2,
        'missile': 0.8,
        'collision': 0.6
      };
      return durations[type] || 0.3;
    }
    
    // GATLING GUN - Deep mechanical sound with bass undertones
    function generateGatlingSound(intensity, startTime, duration) {
      // Bass rumble (simulates barrel rotation)
      const bassOsc = audioContext.createOscillator();
      const bassGain = audioContext.createGain();
      
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(45, startTime); // Deep bass
      bassOsc.frequency.linearRampToValueAtTime(38, startTime + duration);
      
      bassGain.gain.setValueAtTime(0.4 * intensity, startTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      bassOsc.connect(bassGain);
      bassGain.connect(bassContext.bassBoost);
      
      // Mid-range crack (bullet sound)
      const crackOsc = audioContext.createOscillator();
      const crackGain = audioContext.createGain();
      const crackFilter = audioContext.createBiquadFilter();
      
      crackOsc.type = 'square';
      crackOsc.frequency.setValueAtTime(800, startTime);
      crackOsc.frequency.exponentialRampToValueAtTime(200, startTime + duration * 0.7);
      
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(1200, startTime);
      crackFilter.Q.setValueAtTime(8, startTime);
      
      crackGain.gain.setValueAtTime(0.25 * intensity, startTime);
      crackGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      crackOsc.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(bassContext.bassBoost);
      
      bassOsc.start(startTime);
      bassOsc.stop(startTime + duration);
      crackOsc.start(startTime);
      crackOsc.stop(startTime + duration);
    }
    
    // EXPLOSION - Massive bass with harmonic distortion
    function generateExplosionSound(intensity, startTime, duration) {
      // Sub-bass thump (feels like actual explosion)
      const subBass = audioContext.createOscillator();
      const subGain = audioContext.createGain();
      
      subBass.type = 'sine';
      subBass.frequency.setValueAtTime(25, startTime); // Very low frequency
      subBass.frequency.exponentialRampToValueAtTime(15, startTime + duration);
      
      subGain.gain.setValueAtTime(0.6 * intensity, startTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      subBass.connect(subGain);
      subGain.connect(bassContext.bassBoost);
      
      // Mid-bass boom
      const boomOsc = audioContext.createOscillator();
      const boomGain = audioContext.createGain();
      const distortion = audioContext.createWaveShaper();
      
      // Create distortion curve for gritty explosion sound
      const samples = 44100;
      const curve = new Float32Array(samples);
      const deg = Math.PI / 180;
      
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + 20) * x * 20 * deg) / (Math.PI + 20 * Math.abs(x));
      }
      distortion.curve = curve;
      distortion.oversample = '4x';
      
      boomOsc.type = 'square';
      boomOsc.frequency.setValueAtTime(80, startTime);
      boomOsc.frequency.exponentialRampToValueAtTime(20, startTime + duration);
      
      boomGain.gain.setValueAtTime(0.4 * intensity, startTime);
      boomGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.8);
      
      boomOsc.connect(distortion);
      distortion.connect(boomGain);
      boomGain.connect(bassContext.bassBoost);
      
      // High-frequency crackle for realism
      const crackle = audioContext.createBufferSource();
      const crackleGain = audioContext.createGain();
      
      // Generate white noise buffer
      const bufferSize = audioContext.sampleRate * duration;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      crackle.buffer = noiseBuffer;
      crackleGain.gain.setValueAtTime(0.15 * intensity, startTime);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.6);
      
      crackle.connect(crackleGain);
      crackleGain.connect(bassContext.bassBoost);
      
      subBass.start(startTime);
      subBass.stop(startTime + duration);
      boomOsc.start(startTime);
      boomOsc.stop(startTime + duration);
      crackle.start(startTime);
      crackle.stop(startTime + duration);
    }
    
    // COLLISION - Metallic crash with resonance
    function generateCollisionSound(intensity, startTime, duration) {
      // Low metallic clang
      const clang1 = audioContext.createOscillator();
      const clang2 = audioContext.createOscillator();
      const clangGain = audioContext.createGain();
      
      clang1.type = 'square';
      clang1.frequency.setValueAtTime(120, startTime);
      clang2.type = 'square';  
      clang2.frequency.setValueAtTime(180, startTime); // Slight detuning for beating effect
      
      clangGain.gain.setValueAtTime(0.3 * intensity, startTime);
      clangGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      clang1.connect(clangGain);
      clang2.connect(clangGain);
      clangGain.connect(bassContext.bassBoost);
      
      clang1.start(startTime);
      clang1.stop(startTime + duration);
      clang2.start(startTime);
      clang2.stop(startTime + duration);
    }
    
    // IMPACT - Sharp attack with bass punch
    function generateImpactSound(intensity, startTime, duration) {
      const impact = audioContext.createOscillator();
      const impactGain = audioContext.createGain();
      
      impact.type = 'sawtooth';
      impact.frequency.setValueAtTime(150, startTime);
      impact.frequency.exponentialRampToValueAtTime(60, startTime + duration);
      
      impactGain.gain.setValueAtTime(0.35 * intensity, startTime);
      impactGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      impact.connect(impactGain);
      impactGain.connect(bassContext.bassBoost);
      
      impact.start(startTime);
      impact.stop(startTime + duration);
    }
    
    // MISSILE - Whoosh with Doppler effect
    function generateMissileSound(intensity, startTime, duration) {
      const whoosh = audioContext.createOscillator();
      const whooshGain = audioContext.createGain();
      const whooshFilter = audioContext.createBiquadFilter();
      
      whoosh.type = 'sawtooth';
      whoosh.frequency.setValueAtTime(200, startTime);
      whoosh.frequency.linearRampToValueAtTime(150, startTime + duration * 0.8);
      whoosh.frequency.linearRampToValueAtTime(100, startTime + duration); // Doppler effect
      
      whooshFilter.type = 'lowpass';
      whooshFilter.frequency.setValueAtTime(800, startTime);
      whooshFilter.frequency.linearRampToValueAtTime(400, startTime + duration);
      
      whooshGain.gain.setValueAtTime(0.25 * intensity, startTime);
      whooshGain.gain.linearRampToValueAtTime(0.35 * intensity, startTime + duration * 0.3);
      whooshGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      whoosh.connect(whooshFilter);
      whooshFilter.connect(whooshGain);
      whooshGain.connect(bassContext.bassBoost);
      
      whoosh.start(startTime);
      whoosh.stop(startTime + duration);
    }
    
    function generateGenericSound(type, intensity, startTime, duration) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.setValueAtTime(200, startTime);
      gain.gain.setValueAtTime(0.2 * intensity, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      osc.connect(gain);
      gain.connect(bassContext.bassBoost);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    }
    
    // Initialize the professional audio system
    setTimeout(() => {
      if (audioContext) {
        initProfessionalAudio();
        console.log('[Audio] Professional bass-heavy audio system initialized');
      }
    }, 1000);`;

  html = safeReplace(html, oldBasicAudio, cr(newProfessionalAudio));

  // 2. UPDATE COMBAT SOUNDS TO USE NEW SYSTEM  
  const oldShootingSound = `        playSound('shoot');`;
  const newShootingSound = `        playSound('shoot', 1.0); // Full intensity gatling`;
  
  html = html.replace(new RegExp(oldShootingSound.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newShootingSound);

  // 3. ADD EXPLOSION SOUNDS FOR BETTER COMBAT FEEL
  const explosionSoundIntegration = `
        // Play professional explosion sound
        playSound('explosion', 1.2);`;

  // Insert explosion sounds where enemies are destroyed
  const enemyDestroyPoint = `        effects.splice(i, 1);`;
  html = safeReplace(html, enemyDestroyPoint, enemyDestroyPoint + cr(explosionSoundIntegration));

  fs.writeFileSync('public/index.html', html);
  console.log('✅ PROFESSIONAL AUDIO SYSTEM IMPLEMENTED!');
  console.log('   🔊 Bass-heavy explosion sounds with sub-bass (25-80Hz)');
  console.log('   🔊 Professional gatling gun sounds with mechanical rumble');  
  console.log('   🔊 Metallic collision sounds with harmonic resonance');
  console.log('   🔊 Missile whoosh with Doppler effect simulation');
  console.log('   🔊 Dynamic range compression for punchy combat audio');
  console.log('   🔊 +8dB bass boost filter for enhanced low-end response');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}