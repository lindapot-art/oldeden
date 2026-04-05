/**
 * Audit 4 — Fix 7 verified bugs atomically
 * Uses line-based editing for CRLF-safe operation
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
let lines = src.split('\n');
let fixes = 0;

// Line-based replace (1-indexed line numbers, inclusive range)
function replaceLines(name, startLine, endLine, newContent) {
  const idx0 = startLine - 1;
  const idx1 = endLine - 1;
  // Verify we're in range
  if (idx0 < 0 || idx1 >= lines.length) {
    console.error(`[FAIL] ${name} — line range ${startLine}-${endLine} out of bounds (file has ${lines.length} lines)`);
    process.exit(1);
  }
  // Show what we're replacing for verification
  console.log(`  Replacing lines ${startLine}-${endLine}:`);
  for (let i = idx0; i <= Math.min(idx1, idx0 + 2); i++) {
    console.log(`    ${i+1}: ${lines[i].trimEnd().substring(0, 80)}`);
  }
  if (idx1 - idx0 > 2) console.log(`    ... (${endLine - startLine + 1} lines total)`);
  
  // newContent lines should have \r at the end (CRLF file)
  const newLines = newContent.split('\n').map(l => l.endsWith('\r') ? l : l + '\r');
  lines.splice(idx0, endLine - startLine + 1, ...newLines);
  fixes++;
  console.log(`[OK] ${name} (replaced ${endLine - startLine + 1} lines with ${newLines.length} lines)`);
}

// Single-line content replace (finds first match in specific line)
function replaceInLine(name, lineNum, oldStr, newStr) {
  const idx = lineNum - 1;
  if (!lines[idx].includes(oldStr)) {
    console.error(`[FAIL] ${name} — '${oldStr}' not found on line ${lineNum}`);
    console.error(`  Actual: ${lines[idx].trimEnd()}`);
    process.exit(1);
  }
  lines[idx] = lines[idx].replace(oldStr, newStr);
  fixes++;
  console.log(`[OK] ${name} (line ${lineNum})`);
}

// Insert lines after a specific line
function insertAfterLine(name, lineNum, newContent) {
  const newLines = newContent.split('\n').map(l => l.endsWith('\r') ? l : l + '\r');
  lines.splice(lineNum, 0, ...newLines);
  fixes++;
  console.log(`[OK] ${name} (inserted ${newLines.length} lines after line ${lineNum})`);
}

// ============================================================
// FIX 1: CRITICAL — Corrupted interceptor entry + missing _materialCache/_getCachedMaterial
// Lines 3375-3385 have stray code from corruption (0-indexed: 3374-3384)
// The interceptor line (3375 in 1-indexed) through "}" line need replacing
// ============================================================
replaceLines(
  'Fix 1: ENEMY_CONFIGS corruption + restore _materialCache/_getCachedMaterial',
  3375, 3385,
  `  interceptor: { scale: 0.5, hp: 3, points: 15, speed: 1.6, shootRate: 4000, model: 'fighter_beta', tint: 0xff8844 },
};

const _materialCache = new Map();
function _getCachedMaterial(baseMaterial, tintColor, emissiveIntensity) {
  const key = \`\${baseMaterial.uuid}_\${tintColor}_\${emissiveIntensity}\`;
  if (_materialCache.has(key)) return _materialCache.get(key);
  const m = baseMaterial.clone();
  m.emissive = new THREE.Color(tintColor);
  m.emissiveIntensity = emissiveIntensity;
  m._pooled = true;
  _materialCache.set(key, m);
  return m;
}`
);

// ============================================================
// FIX 2: CRITICAL — Mobile fire button calls nonexistent fireWeapon()
// Line 4068 (but shifted by Fix 1 delta: +2 lines = 4070)
// ============================================================
// Fix 1 added 3 lines net (was 11 lines, now 14 lines), so line numbers shift by +3
replaceInLine(
  'Fix 2a: Mobile fire touchstart',
  4071,
  "if (c.active && typeof fireWeapon === 'function') fireWeapon();",
  "if (c.active) { state.activeWeapon === 'laser' ? fireLaser() : fireRailgun(); }"
);
replaceInLine(
  'Fix 2b: Mobile fire interval',
  4072,
  "if (c.active && typeof fireWeapon === 'function') fireWeapon();",
  "if (c.active) { state.activeWeapon === 'laser' ? fireLaser() : fireRailgun(); }"
);

// ============================================================
// FIX 3: HIGH — style.remove() ReferenceError in drawStreaks on 2nd+ jump
// Original line 2252, not affected by Fix 1 (which is after it)
// ============================================================
replaceInLine(
  'Fix 3: Warp animation style.remove() scoping fix',
  2252,
  "style.remove();",
  "const ws = document.getElementById('warp-flash-style'); if (ws) ws.remove();"
);

// ============================================================
// FIX 4: HIGH — HUD vignette reads c.hull/c.maxHull (state.combat has no hull)
// Original line 3595, shifted by +3 = 3598
// ============================================================
replaceInLine(
  'Fix 4: HUD vignette hull reference fix',
  3598,
  'c.hull / c.maxHull',
  'state.ship.hull / state.ship.maxHull'
);

// ============================================================
// FIX 5: HIGH — exitGunnerMode uses style.display='none' on panels
// Original line 3361, not shifted (before Fix 1 location)
// ============================================================
replaceInLine(
  'Fix 5a: exitGunnerMode chatbot panel',
  3361,
  "chatEl.style.display = 'none'",
  "chatEl.classList.remove('open')"
);
replaceInLine(
  'Fix 5b: exitGunnerMode skin panel',
  3362,
  "skinEl.style.display = 'none'",
  "skinEl.classList.remove('open')"
);

// ============================================================
// FIX 6: HIGH — Stray fuel loot handler after </body>
// Original line 6027, shifted by +3 = 6030
// ============================================================
// Find and remove the orphaned fuel line (fuel handler already exists at line 5868)
{
  let strayIdx = -1;
  for (let i = lines.length - 1; i >= lines.length - 10; i--) {
    if (lines[i] && lines[i].includes("l.type === 'fuel'")) { strayIdx = i; break; }
  }
  if (strayIdx === -1) {
    console.error('[FAIL] Fix 6 — stray fuel line not found near end of file');
    process.exit(1);
  }
  console.log(`  Found stray line at index ${strayIdx}: ${lines[strayIdx].trimEnd().substring(0, 80)}`);
  lines.splice(strayIdx, 1);
  fixes++;
  console.log('[OK] Fix 6: Remove stray code after </body>');
}

// ============================================================
// FIX 7: MEDIUM — Death sequence doesn't stop engine hum
// Original line 5422 (after "c.dead = true;"), shifted by +2 = 5424, minus 1 from fix 6 = 5423
// Actually let's just find it
// ============================================================
let deathSeqLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function playerDeathSequence(cause)')) {
    deathSeqLine = i;
    break;
  }
}
if (deathSeqLine === -1) {
  console.error('[FAIL] Fix 7 — playerDeathSequence not found');
  process.exit(1);
}
// Insert AudioSFX.stopEngineHum() after "c.dead = true;" (3 lines after function def)
const insertIdx = deathSeqLine + 3; // after "c.dead = true;"
if (!lines[insertIdx].includes('c.dead = true')) {
  console.error(`[FAIL] Fix 7 — expected 'c.dead = true' at line ${insertIdx + 1}, got: ${lines[insertIdx].trimEnd()}`);
  process.exit(1);
}
lines.splice(insertIdx + 1, 0, '  AudioSFX.stopEngineHum();\r');
fixes++;
console.log(`[OK] Fix 7: Stop engine hum on death (after line ${insertIdx + 1})`);

// ============================================================
// WRITE
// ============================================================
const output = lines.join('\n');
fs.writeFileSync(FILE, output, 'utf8');
console.log(`\n=== ${fixes} fixes applied successfully ===`);

// Balance check
const finalSrc = fs.readFileSync(FILE, 'utf8');
let braces = 0, parens = 0;
for (const ch of finalSrc) {
  if (ch === '{') braces++;
  else if (ch === '}') braces--;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
}
console.log(`Brace balance: ${braces}`);
console.log(`Paren balance: ${parens}`);
const totalLines = finalSrc.split('\n').length;
console.log(`Total lines: ${totalLines}`);
if (braces !== 0 || parens !== 0) {
  console.error('!!! BALANCE ERROR — DO NOT COMMIT !!!');
  process.exit(1);
}
console.log('Balance OK');
