// patch_fix_try_scoping.cjs — Fix block-scoped variables inside try{} that gameLoop needs
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
const origLen = src.split(/\r?\n/).length;
let changes = 0;

function safeReplace(old, replacement, label) {
  if (!src.includes(old)) {
    console.error('FAILED to find:', label);
    console.error('Looking for:', JSON.stringify(old.substring(0, 80)));
    return false;
  }
  const idx1 = src.indexOf(old);
  const idx2 = src.lastIndexOf(old);
  if (idx1 !== idx2) {
    console.error('AMBIGUOUS match for:', label, '— found multiple occurrences');
    return false;
  }
  src = src.replace(old, replacement);
  changes++;
  console.log('OK:', label);
  return true;
}

// ─── FIX 1: Move shield shimmer declarations to module scope (before try block) ───
// Add declarations before "try {" at line 4018
safeReplace(
  'let threeReady = false;\r\n\r\ntry {',
  'let threeReady = false;\r\nlet shieldShimmerMat, shieldShimmerGeo, shieldShimmer;\r\nlet shieldShimmerTimer = 0;\r\n\r\ntry {',
  'Add shield shimmer declarations before try block'
);

// ─── FIX 2: Change const/let declarations to assignments inside try block ───
safeReplace(
  'const shieldShimmerMat = new THREE.MeshBasicMaterial({',
  'shieldShimmerMat = new THREE.MeshBasicMaterial({',
  'shieldShimmerMat: const → assignment'
);

safeReplace(
  'const shieldShimmerGeo = new THREE.IcosahedronGeometry(4.5, 1);',
  'shieldShimmerGeo = new THREE.IcosahedronGeometry(4.5, 1);',
  'shieldShimmerGeo: const → assignment'
);

safeReplace(
  'const shieldShimmer = new THREE.Mesh(shieldShimmerGeo, shieldShimmerMat);',
  'shieldShimmer = new THREE.Mesh(shieldShimmerGeo, shieldShimmerMat);',
  'shieldShimmer: const → assignment'
);

safeReplace(
  'let shieldShimmerTimer = 0;\r\n\r\nfunction triggerShieldShimmer()',
  'shieldShimmerTimer = 0;\r\n',
  'shieldShimmerTimer: remove let inside try, remove function (will add at module scope)'
);

// ─── FIX 3: Move triggerShieldShimmer function to module scope ───
// Add it right after the try/catch block (after the exhaustMat line area)
// First, find the old function text to remove from inside the try block
// The function was partially removed in FIX 2. Let me handle the remaining function body.

// The replacement in FIX 2 removed "let shieldShimmerTimer = 0;\n\nfunction triggerShieldShimmer()"
// but left the body: "{\n  shieldShimmerTimer = ...\n}\n"
// Let me remove the function body that's now orphaned
safeReplace(
  '{\r\n  shieldShimmerTimer = 300;\r\n  shieldShimmerMat.opacity = 0.35;\r\n  shieldShimmerMat.color.setHex(0x44aaff);\r\n  shieldShimmer.visible = true;\r\n}\r\n// Nebulae',
  '// Nebulae',
  'Remove triggerShieldShimmer body from inside try block'
);

// Now add triggerShieldShimmer at module scope — after the try/catch block
// It should go right after "} catch(err) { ... }" block, before "const exhaustMat"
safeReplace(
  '// ── Engine exhaust particles',
  'function triggerShieldShimmer() {\r\n  if (!shieldShimmerMat) return;\r\n  shieldShimmerTimer = 300;\r\n  shieldShimmerMat.opacity = 0.35;\r\n  shieldShimmerMat.color.setHex(0x44aaff);\r\n  shieldShimmer.visible = true;\r\n}\r\n\r\n// ── Engine exhaust particles',
  'Add triggerShieldShimmer function at module scope'
);

// ─── FIX 4: Move starLayers declaration to module scope ───
// Currently at line ~4173 inside try block. Move declaration before try.
safeReplace(
  'let shieldShimmerTimer = 0;\r\n\r\ntry {',
  'let shieldShimmerTimer = 0;\r\nlet starLayers = [];\r\n\r\ntry {',
  'Add starLayers declaration before try block'
);

// Change "const starLayers = [];" inside try to assignment
safeReplace(
  '// ── Multi-layer Parallax Starfield ────\r\nconst starLayers = [];',
  '// ── Multi-layer Parallax Starfield ────\r\nstarLayers = [];',
  'starLayers: const → assignment inside try'
);

// ─── FIX 5: Add null guards on shield shimmer in gameLoop ───
// The gameLoop references shieldShimmerTimer which now exists at module scope,
// but shieldShimmerMat/shieldShimmer might be null if 3D init failed
safeReplace(
  '    // Shield shimmer decay\r\n    if (shieldShimmerTimer > 0) {',
  '    // Shield shimmer decay\r\n    if (shieldShimmerTimer > 0 && shieldShimmerMat && shieldShimmer) {',
  'Add null guard on shield shimmer in gameLoop'
);

// ─── FIX 6: Improve gameLoop error logging — show more errors with stacks ───
safeReplace(
  '    if (gameLoop._errCount <= 3) console.error(\'[GameLoop] Frame error:\', _loopErr);',
  '    if (gameLoop._errCount <= 10) console.error(\'[GameLoop] Frame error:\', _loopErr.message || _loopErr, _loopErr.stack ? _loopErr.stack.split(\'\\n\').slice(0,3).join(\' <- \') : \'\');',
  'Improve gameLoop error logging (show 10 errors + stacks)'
);

// ─── Write result ───
const newLen = src.split(/\r?\n/).length;
fs.writeFileSync(FILE, src);
console.log(`\nDone: ${changes} changes applied.`);
console.log(`Line count: ${origLen} → ${newLen} (${newLen >= origLen ? '+' : ''}${newLen - origLen})`);
