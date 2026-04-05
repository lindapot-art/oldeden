/**
 * Audit 49 — Fix missing _pooled flags on shared Three.js resources
 */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
let fixes = 0;

// Fix 1: _dustMat missing _pooled
const f1old = "const _dustMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.45 });";
const f1new = "const _dustMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.45 }); _dustMat._pooled = true;";
if (src.includes(f1old) && !src.includes("_dustMat._pooled")) {
  src = src.replace(f1old, f1new);
  fixes++;
  console.log('Fix 1: Added _pooled to _dustMat');
} else if (src.includes("_dustMat._pooled")) {
  console.log('Fix 1: Already applied');
} else {
  console.error('Fix 1: PATTERN NOT FOUND');
  process.exit(1);
}

// Fix 2: createStargate._chevGeo missing _pooled
// Insert after the existing _chevMat._pooled line
if (!src.includes("createStargate._chevGeo._pooled")) {
  const chevTarget = "createStargate._chevMat._pooled = true;";
  if (src.includes(chevTarget)) {
    src = src.replace(chevTarget, chevTarget + "\r\n    createStargate._chevGeo._pooled = true;");
    fixes++;
    console.log('Fix 2: Added _pooled to createStargate._chevGeo');
  } else {
    console.error('Fix 2: PATTERN NOT FOUND');
    process.exit(1);
  }
} else {
  console.log('Fix 2: Already applied');
}

// Fix 3: spawnStationModel geometries missing _pooled
// Insert after the existing _lightMat2._pooled line
if (!src.includes("spawnStationModel._hubGeo._pooled")) {
  const stationTarget = "spawnStationModel._panelMat2._pooled = true; spawnStationModel._lightMat2._pooled = true;";
  if (src.includes(stationTarget)) {
    src = src.replace(stationTarget, stationTarget + "\r\n    spawnStationModel._hubGeo._pooled = true; spawnStationModel._torusGeo._pooled = true;\r\n    spawnStationModel._panelGeo2._pooled = true; spawnStationModel._lightGeo2._pooled = true;");
    fixes++;
    console.log('Fix 3: Added _pooled to station model geometries (4 geometries)');
  } else {
    console.error('Fix 3: PATTERN NOT FOUND');
    process.exit(1);
  }
} else {
  console.log('Fix 3: Already applied');
}

if (fixes > 0) {
  fs.writeFileSync(file, src, 'utf8');
  console.log('\nApplied ' + fixes + ' fixes. File saved.');
} else {
  console.log('\nAll fixes already applied.');
}
