#!/usr/bin/env node
/**
 * fix_combat_economy.cjs — Audit 11: Combat Feel + Economy Balance
 * 13 fixes for the core 10-minute death loop
 */
const fs = require('fs');
const FILE = require('path').join(__dirname, 'public', 'index.html');

let src = fs.readFileSync(FILE, 'utf8');
const isCRLF = src.includes('\r\n');
const cr = s => isCRLF ? s.replace(/(?<!\r)\n/g, '\r\n') : s;
let changes = 0, errors = 0;

function countChar(s, ch) { let n = 0; for (const c of s) if (c === ch) n++; return n; }
const bracesBefore = countChar(src, '{') - countChar(src, '}');
const parensBefore = countChar(src, '(') - countChar(src, ')');
const bracketsBefore = countChar(src, '[') - countChar(src, ']');

function safeReplace(oldStr, newStr, label) {
  const old = cr(oldStr);
  const nw = cr(newStr);
  if (!src.includes(old)) {
    console.error('\u274C NOT FOUND:', label);
    errors++;
    return false;
  }
  const count = src.split(old).length - 1;
  if (count > 1) {
    console.error('\u274C AMBIGUOUS (' + count + ' matches):', label);
    errors++;
    return false;
  }
  src = src.replace(old, nw);
  changes++;
  console.log('\u2705', label);
  return true;
}

// ═══════════════════════════════════════════════════════════════
// FIX 1: Enemy push — scale points, speed (with cycle), fire rate (with cycle)
// Points didn't scale → harder enemies gave same credits
// Speed only scaled with rebirths → first-life enemies never got faster
// Fire rate was flat → cycle-5 enemies same threat as cycle-1
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "c.enemies.push({ group: g, hp: Math.ceil(cfg.hp * diffScale), maxHp: Math.ceil(cfg.hp * diffScale), speed: ENEMY_SPEED * cfg.speed * (1 + (state.player.rebirths || 0) * 0.05), type, points: cfg.points, cfg, hitFlash: 0, lastShot: 0, shootRate: cfg.shootRate });",
  "c.enemies.push({ group: g, hp: Math.ceil(cfg.hp * diffScale), maxHp: Math.ceil(cfg.hp * diffScale), speed: ENEMY_SPEED * cfg.speed * (1 + (state.player.rebirths || 0) * 0.05 + (c.cycle - 1) * 0.03), type, points: Math.floor(cfg.points * diffScale), cfg, hitFlash: 0, lastShot: 0, shootRate: Math.max(1000, cfg.shootRate * (1 - (c.cycle - 1) * 0.04)) });",
  'Enemies: scale points, speed, fire rate with cycle + rebirths'
);

// ═══════════════════════════════════════════════════════════════
// FIX 2: Boss HP scales with difficulty
// Was hardcoded 30/40 — by cycle 5+ regular bombers are tougher
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "const bossHp = bossKey.startsWith('titan') ? 40 : 30;",
  "const bDiff = 1 + (state.player.rebirths || 0) * 0.15 + (c.cycle - 1) * 0.08;\n  const bossHp = Math.ceil((bossKey.startsWith('titan') ? 40 : 30) * bDiff);",
  'Boss HP: scales with rebirths + cycle'
);

// ═══════════════════════════════════════════════════════════════
// FIX 3: Heat decay 0.15→0.25 (skilled players can pace shots)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "c.heat = Math.max(0, c.heat - dt * 0.15);",
  "c.heat = Math.max(0, c.heat - dt * 0.25);",
  'Heat: faster decay (0.15\u21920.25) for better pacing'
);

// ═══════════════════════════════════════════════════════════════
// FIX 4: Breather system — threshold-based (modulo-skip fix)
// Old: c.kills % 10 === 0 could be skipped if 2 kills in 1 frame
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "    const _inBreather = c.kills > 0 && c.kills % 10 === 0 && c.enemies.length === 0 && !c._breatherDone;\n" +
  "    if (_inBreather && !c._breatherStart) { c._breatherStart = state.gameTime; addComms('EDEN AI', 'Sector clear... for now.'); }\n" +
  "    if (c._breatherStart && state.gameTime - c._breatherStart > 4000) { c._breatherDone = true; c._breatherStart = 0; }\n" +
  "    if (c.kills > 0 && c.kills % 10 !== 0) c._breatherDone = false;",
  "    if (!c._breatherStart) {\n" +
  "      const _brkAt = c._nextBreatherAt || 10;\n" +
  "      if (c.kills >= _brkAt && c.enemies.length === 0) { c._breatherStart = state.gameTime; c._nextBreatherAt = _brkAt + 10; addComms('EDEN AI', 'Sector clear... for now.'); }\n" +
  "    }\n" +
  "    const _inBreather = c._breatherStart > 0 && (state.gameTime - c._breatherStart < 4000);\n" +
  "    if (c._breatherStart > 0 && !_inBreather) c._breatherStart = 0;",
  'Breather: threshold-based (no modulo-skip bug)'
);

// ═══════════════════════════════════════════════════════════════
// FIX 5: Cycle advance — threshold-based (modulo-skip fix)
// Old: kills % 15 could be skipped if kills jumped 14→16 in one frame
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "if (c.kills > 0 && c.kills % 15 === 0 && c.kills !== c._lastCycleKills) { c._lastCycleKills = c.kills; c.cycle++; addComms('AI Director', `Cycle ${c.cycle} \u2014 hostiles intensifying`); }",
  "if (c.kills >= (c._nextCycleAt || 15)) { c._nextCycleAt = (c._nextCycleAt || 15) + 15; c.cycle++; addComms('AI Director', 'Cycle ' + c.cycle + ' \u2014 hostiles intensifying'); }",
  'Cycle advance: threshold-based (no modulo-skip)'
);

// ═══════════════════════════════════════════════════════════════
// FIX 6: Boss spawn — threshold-based (modulo-skip fix)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "if (c.kills > 0 && c.kills % 20 === 0 && !c.bossActive) {\n        c.bossActive = true;",
  "if (c.kills >= (c._nextBossAt || 20) && !c.bossActive) {\n        c._nextBossAt = (c._nextBossAt || 20) + 20;\n        c.bossActive = true;",
  'Boss spawn: threshold-based (no modulo-skip)'
);

// ═══════════════════════════════════════════════════════════════
// FIX 7: Streak timer 3s→5s (bridges spawn gaps)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "c.streak++; c.streakTimer = 3000;",
  "c.streak++; c.streakTimer = 5000;",
  'Streak timer: 3s\u21925s (bridges spawn gaps)'
);

// ═══════════════════════════════════════════════════════════════
// FIX 8: Streak cap extended — rewards sustained combat
// Old: max 3x at 10 kills. New: 3.5x at 15, 4x at 20
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "c.streakMultiplier = c.streak >= 10 ? 3 : c.streak >= 5 ? 2 : c.streak >= 3 ? 1.5 : 1;",
  "c.streakMultiplier = c.streak >= 20 ? 4 : c.streak >= 15 ? 3.5 : c.streak >= 10 ? 3 : c.streak >= 5 ? 2 : c.streak >= 3 ? 1.5 : 1;",
  'Streak cap: extended to 4x at 20 kills'
);

// ═══════════════════════════════════════════════════════════════
// FIX 9: Kill credits — 40% of point score (prevent inflation)
// Full points still go to score, but credits are throttled
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "c.score += pts; c.kills++;\n            state.player.credits += pts;",
  "c.score += pts; c.kills++;\n            state.player.credits += Math.floor(pts * 0.4);",
  'Credits: 40% of point score (counter inflation)'
);

// ═══════════════════════════════════════════════════════════════
// FIX 10: Boss loot — guaranteed drop (always credits)
// Regular enemies: 40% drop. Bosses should ALWAYS reward.
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "            if (Math.random() < 0.4) {\n              const r = Math.random(); const lootType = r < 0.35 ? 'credits' : r < 0.55 ? 'ammo' : r < 0.75 ? 'health' : 'fuel';",
  "            if (e.isBoss || Math.random() < 0.4) {\n              const r = Math.random(); const lootType = e.isBoss ? 'credits' : r < 0.35 ? 'credits' : r < 0.55 ? 'ammo' : r < 0.75 ? 'health' : 'fuel';",
  'Boss loot: guaranteed credits drop'
);

// ═══════════════════════════════════════════════════════════════
// FIX 11: Combat threshold resets on rebirth
// New _nextCycleAt, _nextBossAt, _nextBreatherAt need resetting
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "  state.combat.score = 0; state.combat.kills = 0; state.combat.cycle = 1; state.combat.bestStreak = 0;\n  state.combat.dead = false;",
  "  state.combat.score = 0; state.combat.kills = 0; state.combat.cycle = 1; state.combat.bestStreak = 0;\n  state.combat.dead = false;\n  state.combat._nextCycleAt = 15; state.combat._nextBossAt = 20; state.combat._nextBreatherAt = 10; state.combat._breatherStart = 0;",
  'Rebirth: reset combat thresholds'
);

// ═══════════════════════════════════════════════════════════════
// Balance check
// ═══════════════════════════════════════════════════════════════
const bracesAfter = countChar(src, '{') - countChar(src, '}');
const parensAfter = countChar(src, '(') - countChar(src, ')');
const bracketsAfter = countChar(src, '[') - countChar(src, ']');

const dB = bracesAfter - bracesBefore;
const dP = parensAfter - parensBefore;
const dK = bracketsAfter - bracketsBefore;

console.log('\n\u2550\u2550\u2550 Summary \u2550\u2550\u2550');
console.log('Changes: ' + changes + ', Errors: ' + errors);
console.log('Balance delta \u2014 B:' + dB + ' P:' + dP + ' K:' + dK);

if (errors > 0) {
  console.error('\n\u274C ABORTING \u2014 ' + errors + ' errors. File NOT written.');
  process.exit(1);
}

if (dB !== 0 || dP !== 0 || dK !== 0) {
  console.error('\n\u26A0 WARNING: Balance drift detected!');
}

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n\u2705 File written: ' + FILE);
console.log('Lines: ' + src.split(isCRLF ? '\r\n' : '\n').length);
