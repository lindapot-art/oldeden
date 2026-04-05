/**
 * Audit 48 — Fix 3 bugs:
 * 1. _nailSlugMat missing _pooled (premature disposal on projectile removal)
 * 2. _sparkMat missing _pooled (premature disposal on spark removal)
 * 3. heatMat: glowMat in fireLaser — wrong material reference (dead property)
 */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
const orig = src;
let fixes = 0;

// Fix 1: _nailSlugMat missing _pooled
const fix1old = "const _nailSlugMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });";
const fix1new = "const _nailSlugMat = new THREE.MeshBasicMaterial({ color: 0xddeeff }); _nailSlugMat._pooled = true;";
if (src.includes(fix1old) && !src.includes(fix1new)) {
  src = src.replace(fix1old, fix1new);
  fixes++;
  console.log('Fix 1: Added _pooled to _nailSlugMat');
} else if (src.includes(fix1new)) {
  console.log('Fix 1: Already applied');
} else {
  console.error('Fix 1: PATTERN NOT FOUND');
  process.exit(1);
}

// Fix 2: _sparkMat missing _pooled
const fix2old = "const _sparkMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 });";
const fix2new = "const _sparkMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 }); _sparkMat._pooled = true;";
if (src.includes(fix2old) && !src.includes(fix2new)) {
  src = src.replace(fix2old, fix2new);
  fixes++;
  console.log('Fix 2: Added _pooled to _sparkMat');
} else if (src.includes(fix2new)) {
  console.log('Fix 2: Already applied');
} else {
  console.error('Fix 2: PATTERN NOT FOUND');
  process.exit(1);
}

// Fix 3: heatMat: glowMat → heatMat: null in fireLaser
const fix3old = "trailMat: beamMat, heatMat: glowMat, slugLight: null, isLaser: true";
const fix3new = "trailMat: beamMat, heatMat: null, slugLight: null, isLaser: true";
if (src.includes(fix3old)) {
  src = src.replace(fix3old, fix3new);
  fixes++;
  console.log('Fix 3: Changed heatMat: glowMat → heatMat: null in fireLaser');
} else if (src.includes(fix3new)) {
  console.log('Fix 3: Already applied');
} else {
  console.error('Fix 3: PATTERN NOT FOUND');
  process.exit(1);
}

if (fixes > 0) {
  fs.writeFileSync(file, src, 'utf8');
  console.log(`\nApplied ${fixes} fixes. File saved.`);
} else {
  console.log('\nAll fixes already applied. No changes needed.');
}
