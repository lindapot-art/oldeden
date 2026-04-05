#!/usr/bin/env node
/**
 * Audit 16 — Remaining Polish + Bug Fixes
 * 6 genuine fixes for broken/missing features
 */
const fs = require('fs');
const FILE = 'public/index.html';

let src = fs.readFileSync(FILE, 'utf8');
const origLen = src.length;
const cr = s => s.replace(/\n/g, '\r\n');

function countBraces(s) {
  let b = 0, p = 0, k = 0;
  for (const ch of s) {
    if (ch === '{') b++; else if (ch === '}') b--;
    if (ch === '(') p++; else if (ch === ')') p--;
    if (ch === '[') k++; else if (ch === ']') k--;
  }
  return { b, p, k };
}
const before = countBraces(src);

let applied = 0, failed = 0;
function safeReplace(old, replacement, label) {
  const o = cr(old);
  const r = cr(replacement);
  const idx = src.indexOf(o);
  if (idx === -1) { console.log(`  SKIP [${label}] — old string not found`); failed++; return; }
  const second = src.indexOf(o, idx + 1);
  if (second !== -1) { console.log(`  SKIP [${label}] — ambiguous (2+ matches)`); failed++; return; }
  src = src.slice(0, idx) + r + src.slice(idx + o.length);
  console.log(`  \u2713 [${label}]`);
  applied++;
}

// ════════════════════════════════════════════════════
//  FIX 1: Offline quest tracking for 'visit' + 'collect' types
//  Currently only 'kill' quests are tracked offline
// ════════════════════════════════════════════════════

// Add visit quest tracking to the system jump function
safeReplace(
  `// Report visit to server for quest progress
  if (state.socket) state.socket.emit('system:visit', { systemId: sys.id });`,
  `// Report visit to server for quest progress
  if (state.socket) state.socket.emit('system:visit', { systemId: sys.id });
  // Offline visit quest progress
  state.quests.filter(q => q.active && !q.completed && q.objectives).forEach(q => {
    q.objectives.forEach(o => {
      if (o.type === 'visit' && (o.target === '*' || o.target === sys.id)) {
        o.current = (o.current || 0) + 1;
      }
    });
    if (q.objectives.every(o => (o.current || 0) >= o.required)) {
      q.completed = true; q.active = false;
      state.player.credits += q.rewards?.credits || 0;
      addComms('Mission', 'COMPLETED: ' + (q.title || q.name) + ' — +' + (q.rewards?.credits || 0) + ' EC');
      AudioSFX.play('quest_complete');
    }
  });`,
  'Fix 1a: Offline visit quest tracking'
);

// Add collect quest tracking to mining completion
safeReplace(
  `addComms('Mining', \`Extracted \${qty}x \${ore} (+\${credits} EC)\`);
    AudioSFX.play('quest_complete');`,
  `addComms('Mining', \`Extracted \${qty}x \${ore} (+\${credits} EC)\`);
    AudioSFX.play('quest_complete');
    // Offline collect quest progress
    state.quests.filter(q => q.active && !q.completed && q.objectives).forEach(q => {
      q.objectives.forEach(o => {
        if (o.type === 'collect' && (o.target === '*' || o.target === ore)) {
          o.current = (o.current || 0) + qty;
        }
      });
      if (q.objectives.every(o => (o.current || 0) >= o.required)) {
        q.completed = true; q.active = false;
        state.player.credits += q.rewards?.credits || 0;
        addComms('Mission', 'COMPLETED: ' + (q.title || q.name) + ' — +' + (q.rewards?.credits || 0) + ' EC');
        AudioSFX.play('quest_complete');
      }
    });`,
  'Fix 1b: Offline collect quest tracking via mining'
);

// ════════════════════════════════════════════════════
//  FIX 2: (SKIPPED — pastLives already capped at 200)
// ════════════════════════════════════════════════════

// ════════════════════════════════════════════════════
//  FIX 3: SFX master volume not applied to several sound types
//  fire, hit, explode, charge, shield_hit, jump, quest_complete use raw values
// ════════════════════════════════════════════════════
safeReplace(
  `case 'fire': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, now); osc.frequency.exponentialRampToValueAtTime(40, now+0.15); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.15); osc.start(now); osc.stop(now+0.15); break;`,
  `case 'fire': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, now); osc.frequency.exponentialRampToValueAtTime(40, now+0.15); gain.gain.setValueAtTime(0.22*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.15); osc.start(now); osc.stop(now+0.15); break;`,
  'Fix 3a: Fire SFX apply vol + punchier'
);

safeReplace(
  `case 'hit': osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now+0.08); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.08); osc.start(now); osc.stop(now+0.08); break;`,
  `case 'hit': osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now+0.08); gain.gain.setValueAtTime(0.1*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.08); osc.start(now); osc.stop(now+0.08); break;`,
  'Fix 3b: Hit SFX apply vol'
);

safeReplace(
  `case 'explode': { const dur = 0.35; const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/d.length); const src = ctx.createBufferSource(); src.buffer = buf; src.connect(gain); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now+dur); src.start(now); return; }`,
  `case 'explode': { const dur = 0.35; const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/d.length); const src = ctx.createBufferSource(); src.buffer = buf; src.connect(gain); gain.gain.setValueAtTime(0.2*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+dur); src.start(now); return; }`,
  'Fix 3c: Explode SFX apply vol'
);

safeReplace(
  `case 'charge': osc.type = 'sine'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(1200, now+0.6); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0.12, now+0.6); osc.start(now); osc.stop(now+0.6); break;`,
  `case 'charge': osc.type = 'sine'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(1200, now+0.6); gain.gain.setValueAtTime(0.05*vol, now); gain.gain.linearRampToValueAtTime(0.12*vol, now+0.6); osc.start(now); osc.stop(now+0.6); break;`,
  'Fix 3d: Charge SFX apply vol'
);

safeReplace(
  `case 'shield_hit': osc.type = 'sine'; osc.frequency.setValueAtTime(2000, now); osc.frequency.exponentialRampToValueAtTime(400, now+0.2); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.2); osc.start(now); osc.stop(now+0.2); break;`,
  `case 'shield_hit': osc.type = 'sine'; osc.frequency.setValueAtTime(2000, now); osc.frequency.exponentialRampToValueAtTime(400, now+0.2); gain.gain.setValueAtTime(0.08*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.2); osc.start(now); osc.stop(now+0.2); break;`,
  'Fix 3e: Shield_hit SFX apply vol'
);

safeReplace(
  `case 'jump': osc.type = 'sine'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(2000, now+0.5); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.8); osc.start(now); osc.stop(now+0.8); break;`,
  `case 'jump': osc.type = 'sine'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(2000, now+0.5); gain.gain.setValueAtTime(0.1*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.8); osc.start(now); osc.stop(now+0.8); break;`,
  'Fix 3f: Jump SFX apply vol'
);

safeReplace(
  `case 'quest_complete': osc.type = 'sine'; osc.frequency.setValueAtTime(523, now); osc.frequency.setValueAtTime(659, now+0.15); osc.frequency.setValueAtTime(784, now+0.3); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.5); osc.start(now); osc.stop(now+0.5); break;`,
  `case 'quest_complete': osc.type = 'sine'; osc.frequency.setValueAtTime(523, now); osc.frequency.setValueAtTime(659, now+0.15); osc.frequency.setValueAtTime(784, now+0.3); gain.gain.setValueAtTime(0.1*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.5); osc.start(now); osc.stop(now+0.5); break;`,
  'Fix 3g: Quest_complete SFX apply vol'
);

// ════════════════════════════════════════════════════
//  FIX 4: Mining laser beam properly disposed on scene exit
//  stopMining already disposes — but exitGunnerMode doesn't call stopMining
// ════════════════════════════════════════════════════
safeReplace(
  `if (miningLaserBeam) { scene.remove(miningLaserBeam); miningLaserBeam.geometry.dispose(); miningLaserBeam.material.dispose(); miningLaserBeam = null; }`,
  `if (miningLaserBeam) { scene.remove(miningLaserBeam); miningLaserBeam.geometry.dispose(); miningLaserBeam.material.dispose(); miningLaserBeam = null; }
  // Ensure mining state is clean
  state.mining.active = false; state.mining.target = null; state.mining.progress = 0;`,
  'Fix 4: Mining cleanup extra safety'
);

// ════════════════════════════════════════════════════
//  FIX 5: (SKIPPED — already uses disposeObject)
// ════════════════════════════════════════════════════

// ════════════════════════════════════════════════════
//  FIX 6: (SKIPPED — already uses disposeObject)
// ════════════════════════════════════════════════════


// ════════════════════════════════════════════════════
//  BALANCE CHECK
// ════════════════════════════════════════════════════
const after = countBraces(src);
const db = after.b - before.b;
const dp = after.p - before.p;
const dk = after.k - before.k;

console.log(`\n=== Audit 16: Remaining Polish + Bug Fixes ===`);
console.log(`Applied: ${applied}/11, Failed: ${failed}`);
console.log(`Balance delta — B:${db} P:${dp} K:${dk}`);
if (db !== 0 || dp !== 0 || dk !== 0) {
  console.log('\u274c BALANCE ERROR — aborting write');
  process.exit(1);
}
if (failed > 0) {
  console.log('\u274c SOME FIXES FAILED — aborting write');
  process.exit(1);
}
fs.writeFileSync(FILE, src);
console.log(`\u2705 File written. Size: ${origLen} \u2192 ${src.length} (+${src.length - origLen})`);
