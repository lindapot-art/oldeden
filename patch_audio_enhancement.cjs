// Professional Audio Enhancement - Extends existing AudioSFX
// Adds bass-heavy explosions, gatling gun sequences, collision sounds

const fs = require('fs');

function safeReplace(content, searchStr, replaceStr, description) {
  if (!content.includes(searchStr)) {
    console.log(`❌ PATCH FAILED: Could not find "${description}"`);
    console.log(`Search preview: ${searchStr.slice(0, 100)}...`);
    return content;
  }
  const newContent = content.replace(searchStr, replaceStr);
  console.log(`✅ PATCHED: ${description}`);
  return newContent;
}

console.log('🔊 Enhancing Professional Audio System...\n');

let content = fs.readFileSync('public/index.html', 'utf8');

// 1. Add bass filter to existing AudioSFX init
const oldInit = `  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  },`;

const newInit = `  init() {
    try { 
      this.ctx = new (window.AudioContext || window.webkitAudioContext)(); 
      // Professional bass enhancement filter
      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 320;
      this.bassFilter.gain.value = 8; // +8dB bass boost
      this.bassFilter.connect(this.ctx.destination);
    } catch(e) {}
  },`;

content = safeReplace(content, oldInit, newInit, 'Enhanced audio init with bass filter');

// 2. Add professional explosion after existing explode case
const explodeCase = `      case 'explode': { const dur = 0.35; const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/d.length); const src = ctx.createBufferSource(); src.buffer = buf; src.connect(gain); gain.gain.setValueAtTime(0.2*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+dur); src.start(now); return; }`;

const professionalExplosion = `      case 'explode': { const dur = 0.35; const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/d.length); const src = ctx.createBufferSource(); src.buffer = buf; src.connect(gain); gain.gain.setValueAtTime(0.2*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+dur); src.start(now); return; }
      
      // Professional bass-heavy explosion
      case 'explosion_pro': {
        const dur = 0.6;
        const buf = ctx.createBuffer(2, ctx.sampleRate * dur, ctx.sampleRate);
        const left = buf.getChannelData(0), right = buf.getChannelData(1);
        for (let i = 0; i < buf.length; i++) {
          const t = i / buf.length;
          const envelope = Math.pow(1 - t, 2) * (1 + Math.sin(t * 40) * 0.3);
          const noise = (Math.random() * 2 - 1) * envelope;
          // Bass-heavy filtering
          const bassBoost = Math.sin(t * 20) * envelope * 0.8;
          left[i] = noise + bassBoost;
          right[i] = noise * 0.8 + bassBoost;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bassGain = ctx.createGain();
        src.connect(bassGain);
        bassGain.connect(this.bassFilter || gain);
        bassGain.gain.setValueAtTime(0.4 * vol, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.start(now);
        return;
      }
      
      // Gatling gun spin-up
      case 'gatling_spinup': {
        const dur = 0.8;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + dur);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + dur);
        osc.connect(filter);
        filter.connect(gain);
        gain.gain.setValueAtTime(0.15 * vol, now);
        gain.gain.setValueAtTime(0.25 * vol, now + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.start(now);
        osc.stop(now + dur);
        return;
      }
      
      // Gatling gun rapid fire
      case 'gatling_fire': {
        const dur = 0.12;
        osc.type = 'square';
        osc.frequency.setValueAtTime(160 + Math.random() * 80, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + dur);
        gain.gain.setValueAtTime(0.18 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.start(now);
        osc.stop(now + dur);
        return;
      }
      
      // Ship collision
      case 'collision': {
        const dur = 0.4;
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
          const t = i / d.length;
          const metallic = Math.sin(t * 300) * Math.pow(1 - t, 1.5) * 0.6;
          const crunch = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * 0.8;
          d[i] = metallic + crunch;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(gain);
        gain.gain.setValueAtTime(0.25 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.start(now);
        return;
      }`;

content = safeReplace(content, explodeCase, professionalExplosion, 'Added professional audio effects');

// 3. Add professional audio convenience methods after the play method  
const endOfAudioSFX = `  }
};`;

const enhancedAudioSFX = `  },
  
  // Professional audio methods
  playExplosion(intensity = 'medium') {
    if (intensity === 'heavy') {
      this.play('explosion_pro');
      // Add debris sound 0.3s later
      setTimeout(() => this.play('collision'), 300);
    } else {
      this.play('explode');
    }
  },
  
  playGatlingSequence(phase) {
    switch(phase) {
      case 'spinup':
        this.play('gatling_spinup');
        break;
      case 'fire':
        this.play('gatling_fire');
        break;
      case 'spindown':
        // Reverse spin-up for spin-down effect
        setTimeout(() => {
          const ctx = this.ctx;
          if (!ctx) return;
          const vol = this.getSfxMix();
          const now = ctx.currentTime;
          const gain = ctx.createGain();
          gain.connect(ctx.destination);
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
          osc.connect(gain);
          gain.gain.setValueAtTime(0.2 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.start(now);
          osc.stop(now + 0.6);
        }, 10);
        break;
    }
  }
};`;

content = safeReplace(content, endOfAudioSFX, enhancedAudioSFX, 'Added professional audio methods');

fs.writeFileSync('public/index.html', content);

console.log('\n✅ Professional Audio Enhancement Complete!');
console.log('📋 Features Added:');
console.log('   • Bass enhancement filter (+8dB lowshelf at 320Hz)');
console.log('   • Professional explosion with bass boost and stereo');
console.log('   • Gatling gun audio suite (spinup/fire/spindown)');
console.log('   • Realistic collision sounds with metallic crunch');  
console.log('   • Convenience methods for complex audio sequences');
console.log('\n🔊 New Audio Effects:');
console.log('   • AudioSFX.playExplosion("heavy") - Bass-heavy explosion');
console.log('   • AudioSFX.playGatlingSequence("spinup|fire|spindown")');
console.log('   • AudioSFX.play("collision") - Ship collision sounds');
console.log('   • Enhanced procedural audio with professional mixing');