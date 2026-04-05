#!/usr/bin/env node
/**
 * Audit 14 — First-Time Player Experience & Station Polish
 * 10 fixes — first-life pacing, feedback, bridge urgency, station economy
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
//  FIX 1: Weight first-life spawns toward easy enemies
// ════════════════════════════════════════════════════
safeReplace(
  `const types = ['scout','fighter','bomber','interceptor'];
      const spawnCount = Math.min(1 + Math.floor(c.cycle / 3), MAX_ENEMIES - c.enemies.length);
      for (let si = 0; si < spawnCount; si++) createEnemy(types[Math.floor(Math.random()*4)]);`,
  `const types = ['scout','fighter','bomber','interceptor'];
      // First life: weight spawns toward easier enemies (scouts/interceptors)
      const firstLifeTypes = ['scout','scout','scout','interceptor','interceptor','fighter'];
      const spawnTypes = (isFirstLife && c.cycle <= 2) ? firstLifeTypes : types;
      const spawnCount = Math.min(1 + Math.floor(c.cycle / 3), MAX_ENEMIES - c.enemies.length);
      for (let si = 0; si < spawnCount; si++) createEnemy(spawnTypes[Math.floor(Math.random()*spawnTypes.length)]);`,
  'Fix 1: Weight first-life spawns toward easy enemies'
);

// ════════════════════════════════════════════════════
//  FIX 2: Auto-aggro 60s → 10s for passive newbies
// ════════════════════════════════════════════════════
safeReplace(
  `const autoAggro = isFirstLife && state.gameTime > 60000;`,
  `const autoAggro = isFirstLife && state.gameTime > 10000;`,
  'Fix 2: Auto-aggro 60s to 10s'
);

// ════════════════════════════════════════════════════
//  FIX 3: First death eulogy — faster skip + auto-advance
// ════════════════════════════════════════════════════
safeReplace(
  `let eulogyAdvanced = false;
  function advanceToKarma() {
    if (eulogyAdvanced) return;
    eulogyAdvanced = true;
    if (state.screen === 'eulogy') rollKarmaWheel();
  }
  setTimeout(() => { skipBtn.style.opacity = '1'; }, 5000);
  skipBtn.onclick = advanceToKarma;
  
  // Auto-advance to Karma Wheel after 9 seconds — let all animations finish
  setTimeout(advanceToKarma, 9000);`,
  `let eulogyAdvanced = false;
  function advanceToKarma() {
    if (eulogyAdvanced) return;
    eulogyAdvanced = true;
    if (state.screen === 'eulogy') rollKarmaWheel();
  }
  // First death: faster pacing to maintain momentum through first death→rebirth
  const _firstDeath = (state.player.rebirths || 0) === 0;
  setTimeout(() => { skipBtn.style.opacity = '1'; }, _firstDeath ? 800 : 5000);
  skipBtn.onclick = advanceToKarma;
  setTimeout(advanceToKarma, _firstDeath ? 4500 : 9000);`,
  'Fix 3: First death eulogy faster'
);

// ════════════════════════════════════════════════════
//  FIX 4: Shield damage flash more visible (0.2 → 0.3)
// ════════════════════════════════════════════════════
safeReplace(
  `const flashAlpha = isHullDmg ? (c.damageFlash / 200) * 0.4 : (c.damageFlash / 200) * 0.2;`,
  `const flashAlpha = isHullDmg ? (c.damageFlash / 200) * 0.4 : (c.damageFlash / 200) * 0.3;`,
  'Fix 4: Shield damage flash more visible'
);

// ════════════════════════════════════════════════════
//  FIX 5: Controls overlay — longer display, delayed dismiss
// ════════════════════════════════════════════════════
safeReplace(
  `setTimeout(() => { document.addEventListener('mousedown', _dismiss, { once: true }); document.addEventListener('keydown', _dismiss, { once: true }); }, 500);
      setTimeout(_dismiss, 10000);`,
  `setTimeout(() => { document.addEventListener('mousedown', _dismiss, { once: true }); document.addEventListener('keydown', _dismiss, { once: true }); }, 2000);
      setTimeout(_dismiss, 15000);`,
  'Fix 5: Controls overlay longer + delayed dismiss'
);

// ════════════════════════════════════════════════════
//  FIX 6: Loot credits scale with enemy points
// ════════════════════════════════════════════════════
safeReplace(
  `if (l.type === 'credits') { state.player.credits += 25; c.dmgNumbers.push({ text: '+25 EC', pos: l.group.position.clone(), age: 0, color: '#ffd700' }); }`,
  `if (l.type === 'credits') { const lootAmt = l.creditValue || 50; state.player.credits += lootAmt; c.dmgNumbers.push({ text: '+' + lootAmt + ' EC', pos: l.group.position.clone(), age: 0, color: '#ffd700' }); }`,
  'Fix 6: Loot credits scale (base 50)'
);

// Now we need to pass credit value to the loot drop — find spawnLootDrop call
safeReplace(
  `const r = Math.random(); const lootType = e.isBoss ? 'credits' : r < 0.35 ? 'credits' : r < 0.55 ? 'ammo' : r < 0.75 ? 'health' : 'fuel';
              spawnLootDrop(e.group.position.clone(), lootType);`,
  `const r = Math.random(); const lootType = e.isBoss ? 'credits' : r < 0.35 ? 'credits' : r < 0.55 ? 'ammo' : r < 0.75 ? 'health' : 'fuel';
              const _lootCreditVal = e.isBoss ? Math.ceil(e.points * 0.6) : Math.ceil((e.points || 50) * 0.4);
              spawnLootDrop(e.group.position.clone(), lootType, _lootCreditVal);`,
  'Fix 6b: Pass credit value to spawnLootDrop'
);

// Now find the spawnLootDrop function signature and add the creditValue param
safeReplace(
  `function spawnLootDrop(pos, type) {`,
  `function spawnLootDrop(pos, type, creditValue) {`,
  'Fix 6c: spawnLootDrop signature + creditValue'
);

// Store creditValue on the loot object — find where loot is pushed to array
// Need to find the loot push near the end of spawnLootDrop
safeReplace(
  `c.lootDrops.push({ group: g, type, age: 0 });`,
  `c.lootDrops.push({ group: g, type, age: 0, creditValue: creditValue || 50 });`,
  'Fix 6d: Store creditValue on loot object'
);

// ════════════════════════════════════════════════════
//  FIX 7: Bridge urgency for first life
// ════════════════════════════════════════════════════
safeReplace(
  `saveGame();
  showScreen('bridge');
  addComms('EDEN AI', '\\u2694 Click ENTER SPACE to launch into combat, pilot.');
}`,
  `saveGame();
  showScreen('bridge');
  addComms('EDEN AI', '\\u2694 Click ENTER SPACE to launch into combat, pilot.');
  // First life: create combat urgency to push player into the core loop FAST
  if ((state.player.rebirths || 0) === 0) {
    setTimeout(() => addComms('EDEN AI', '\\u26a0 ALERT: Hostile signatures detected in your sector! Launch immediately!'), 1200);
    setTimeout(() => {
      const launchBtn = document.getElementById('btn-launch');
      if (launchBtn) { launchBtn.style.animation = 'pulse 1s ease infinite'; launchBtn.style.boxShadow = '0 0 20px rgba(255,100,0,0.6)'; }
    }, 1500);
  }
}`,
  'Fix 7: Bridge urgency for first life'
);

// ════════════════════════════════════════════════════
//  FIX 8: Add beginner commodity (profitable!)
// ════════════════════════════════════════════════════
safeReplace(
  `const COMMODITIES = [
  { name: 'Titanite Ore', buy: 120, sell: 95 },
  { name: 'Hydrogen Fuel', buy: 45, sell: 35 },`,
  `const COMMODITIES = [
  { name: 'Salvage Scrap', buy: 15, sell: 22 },
  { name: 'Titanite Ore', buy: 120, sell: 95 },
  { name: 'Hydrogen Fuel', buy: 45, sell: 35 },`,
  'Fix 8: Add beginner commodity (Salvage Scrap, profitable)'
);

// ════════════════════════════════════════════════════
//  FIX 9: First-life enemy bolt damage reduction
// ════════════════════════════════════════════════════
safeReplace(
  `const dmg = 3 + Math.random() * 4;
          const hadShield = state.ship.shield > 0;`,
  `const dmg = isFirstLife ? (2 + Math.random() * 2) : (3 + Math.random() * 4);
          const hadShield = state.ship.shield > 0;`,
  'Fix 9: First-life bolt damage softer (2-4 vs 3-7)'
);

// ════════════════════════════════════════════════════
//  FIX 10: Auto bridge comms log flavor text on subsequent lives
// ════════════════════════════════════════════════════
safeReplace(
  `addComms('EDEN AI', 'All systems online. WASD/Arrows fly, Shift boost, Space up, Ctrl down.');
  addComms('System', 'Gunner mode — Mouse aim, Click fire, Right-click/Dblclick navigate, R reload, ESC exit');
  addComms('System', 'P = autopilot | T = chatbot | L = labels | I = god mode');`,
  `addComms('EDEN AI', 'All systems online. WASD/Arrows fly, Shift boost, Space up, Ctrl down.');
  addComms('System', 'Gunner mode — Mouse aim, Click fire, Right-click/Dblclick navigate, R reload, ESC exit');
  addComms('System', 'P = autopilot | T = chatbot | L = labels | I = god mode');
  // Rebirth flavor — remind player of their journey
  if (state.player.rebirths > 0 && state.pastLives.length > 0) {
    const prevLife = state.pastLives[state.pastLives.length - 1];
    addComms('EDEN AI', 'Soul resonance detected. Previous incarnation: ' + prevLife.name + ' (' + prevLife.occupation + '). The wheel turns.');
  }`,
  'Fix 10: Past-life flavor comms on subsequent lives'
);


// ════════════════════════════════════════════════════
//  BALANCE CHECK
// ════════════════════════════════════════════════════
const after = countBraces(src);
const db = after.b - before.b;
const dp = after.p - before.p;
const dk = after.k - before.k;

console.log(`\n=== Audit 14: First-Time Player UX ===`);
console.log(`Applied: ${applied}/13, Failed: ${failed}`);
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
