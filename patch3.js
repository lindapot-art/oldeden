const fs = require('fs');
let f = fs.readFileSync('public/index.html','utf8');

const old = "case 'hit_marker': osc.type = 'square'; osc.frequency.setValueAtTime(1600, now); gain.gain.setValueAtTime(0.04*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.04); osc.start(now); osc.stop(now+0.04); break;\r\n    }";
const rep = "case 'hit_marker': osc.type = 'square'; osc.frequency.setValueAtTime(1600, now); gain.gain.setValueAtTime(0.04*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.04); osc.start(now); osc.stop(now+0.04); break;\r\n      case 'player_death': { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(30, now+2); gain.gain.setValueAtTime(0.2*vol, now); gain.gain.linearRampToValueAtTime(0.12*vol, now+0.8); gain.gain.exponentialRampToValueAtTime(0.001, now+2); osc.start(now); osc.stop(now+2); const sub2 = ctx.createOscillator(); sub2.type = 'sine'; sub2.frequency.value = 40; const sg2 = ctx.createGain(); sg2.gain.setValueAtTime(0.15*vol, now); sg2.gain.exponentialRampToValueAtTime(0.001, now+2.5); sub2.connect(sg2); sg2.connect(ctx.destination); sub2.start(now); sub2.stop(now+2.5); break; }\r\n    }";

if(f.includes(old)){
  f = f.replace(old, rep);
  fs.writeFileSync('public/index.html', f);
  console.log('PATCH3 APPLIED');
} else {
  console.log('PATCH3 FAILED');
}
