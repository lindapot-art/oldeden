#!/usr/bin/env node
/**
 * fix_edge_cases.cjs — Audit 12: Edge Cases + Soft-lock Prevention
 * 3 critical/high fixes for damage paths
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
// FIX 1: Enemy ram — add !c.dead guard (prevents SFX spam during death)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "if (e.group.position.distanceTo(ship.position) < 5 && !c.godMode && performance.now() > c.deathImmunityUntil) {",
  "if (e.group.position.distanceTo(ship.position) < 5 && !c.godMode && !c.dead && performance.now() > c.deathImmunityUntil) {",
  'Enemy ram: add !c.dead guard'
);

// ═══════════════════════════════════════════════════════════════
// FIX 2: Enemy bolt — add !c.dead guard (prevents SFX spam during death)
// Context: inside "if (b.group.position.distanceTo(ship.position) < 6)"
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "if (b.group.position.distanceTo(ship.position) < 6) {\n        if (!c.godMode && performance.now() > c.deathImmunityUntil) {",
  "if (b.group.position.distanceTo(ship.position) < 6) {\n        if (!c.godMode && !c.dead && performance.now() > c.deathImmunityUntil) {",
  'Enemy bolt: add !c.dead guard'
);

// ═══════════════════════════════════════════════════════════════
// FIX 3: Asteroid collision — add !c.dead guard + death trigger
// Was missing both: no dead check AND no playerDeathSequence call
// ═══════════════════════════════════════════════════════════════
safeReplace(
  "    // Asteroid collision (with cooldown to prevent per-frame damage spam)\n    if (!c.godMode && performance.now() > c.deathImmunityUntil) {",
  "    // Asteroid collision (with cooldown to prevent per-frame damage spam)\n    if (!c.godMode && !c.dead && performance.now() > c.deathImmunityUntil) {",
  'Asteroid: add !c.dead guard'
);

safeReplace(
  "addComms('EDEN AI', '\\u26a0 Asteroid collision! Watch your heading.');",
  "addComms('EDEN AI', '\\u26a0 Asteroid collision! Watch your heading.');\n            if (state.ship.hull <= 0 && !c.dead) { playerDeathSequence('Destroyed by asteroid collision'); }",
  'Asteroid: add death trigger on hull=0'
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

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n\u2705 File written: ' + FILE);
