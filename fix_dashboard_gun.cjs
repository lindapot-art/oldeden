#!/usr/bin/env node
/**
 * fix_dashboard_gun.cjs — Add black futuristic gun to cockpit dashboard
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
// FIX 1: Add dashboard gun loader function (after cockpit GLB section)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  '// ================================================================\n' +
  '//  RAILGUN 3D MODEL \u2014 Enhanced procedural + GLB fallback\n' +
  '// ================================================================\n' +
  'let railgunModel = null;',

  '// ================================================================\n' +
  '//  DASHBOARD GUN \u2014 Black futuristic sidearm mounted on cockpit dash\n' +
  '// ================================================================\n' +
  'let dashboardGunModel = null;\n' +
  '\n' +
  'async function loadDashboardGun() {\n' +
  '  if (dashboardGunModel) { camera.remove(dashboardGunModel); dashboardGunModel = null; }\n' +
  '  try {\n' +
  '    const model = await loadGLBModel(\'gun_futuristic\');\n' +
  '    const gun = model.clone();\n' +
  '    // Position on the right side of dashboard, angled naturally\n' +
  '    gun.position.set(0.55, -0.85, -0.6);\n' +
  '    gun.scale.setScalar(0.12);\n' +
  '    // Lay flat on dashboard, barrel pointing right-forward\n' +
  '    gun.rotation.set(-0.1, -0.4, -0.15);\n' +
  '    gun.name = \'dashboard-gun-glb\';\n' +
  '    // Darken materials for black gun look\n' +
  '    gun.traverse(child => {\n' +
  '      if (child.isMesh && child.material) {\n' +
  '        const mats = Array.isArray(child.material) ? child.material : [child.material];\n' +
  '        mats.forEach(m => {\n' +
  '          m.color.setHex(0x1a1a1a);\n' +
  '          m.roughness = 0.25;\n' +
  '          m.metalness = 0.9;\n' +
  '          m.emissive = new THREE.Color(0x111111);\n' +
  '          m.emissiveIntensity = 0.1;\n' +
  '        });\n' +
  '      }\n' +
  '    });\n' +
  '    camera.add(gun);\n' +
  '    dashboardGunModel = gun;\n' +
  '    addComms(\'System\', \'Sidearm secured on dashboard.\');\n' +
  '  } catch(e) {\n' +
  '    console.warn(\'[GLB] Dashboard gun load failed:\', e);\n' +
  '  }\n' +
  '}\n' +
  '\n' +
  '// ================================================================\n' +
  '//  RAILGUN 3D MODEL \u2014 Enhanced procedural + GLB fallback\n' +
  '// ================================================================\n' +
  'let railgunModel = null;',
  'Add loadDashboardGun function'
);

// ═══════════════════════════════════════════════════════════════
// FIX 2: Call loadDashboardGun during cockpit setup (after loadCockpitGLB)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  '  loadCockpitGLB();\n  spawnShipLibrary();',
  '  loadCockpitGLB();\n  loadDashboardGun();\n  spawnShipLibrary();',
  'Call loadDashboardGun in init sequence'
);

// ═══════════════════════════════════════════════════════════════
// FIX 3: Clean up dashboard gun on exitGunnerMode (prevent leak)
// ═══════════════════════════════════════════════════════════════
safeReplace(
  '  if (railgunModel) { cockpit.remove(railgunModel); railgunModel = null; }\n  if (cockpitGLBModel) { camera.remove(cockpitGLBModel); cockpitGLBModel = null; }',
  '  if (railgunModel) { cockpit.remove(railgunModel); railgunModel = null; }\n  if (cockpitGLBModel) { camera.remove(cockpitGLBModel); cockpitGLBModel = null; }\n  if (dashboardGunModel) { camera.remove(dashboardGunModel); dashboardGunModel = null; }',
  'Cleanup dashboard gun on exitGunnerMode'
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
