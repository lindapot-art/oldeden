// Audit 35 patch — fix 3 critical bugs from corrupted audit 34 commit
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
let ok = 0, fail = 0;

function cr(s) { return s.replace(/\r?\n/g, '\r\n'); }

function safeReplace(old, rep, label) {
  const oldCR = cr(old);
  const idx = src.indexOf(oldCR);
  if (idx === -1) { console.error('FAIL: ' + label + ' — pattern not found'); fail++; return; }
  if (src.indexOf(oldCR, idx + 1) !== -1) { console.error('FAIL: ' + label + ' — pattern not unique'); fail++; return; }
  src = src.slice(0, idx) + cr(rep) + src.slice(idx + oldCR.length);
  console.log('OK: ' + label);
  ok++;
}

// ================================================================
// F1: CRITICAL — Fix stargate chevron SyntaxError
// Remove unused _chevGeo local, fix garbled Mesh line
// ================================================================
safeReplace(
  `  // Inner chevrons — 8 glowing markers around the ring
  const _chevGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
  if (!createStargate._chevGeo) {
    createStargate._chevGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
    createStargate._chevMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
    createStargate._chevMat._pooled = true;
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const chev = new THREE.Mesh(createStargate._chevGeo, createStargate., Math.sin(angle) * 18, 0);
    chev.lookAt(0, 0, 0);
    stargateGroup.add(chev);
  }`,
  `  // Inner chevrons — 8 glowing markers around the ring
  if (!createStargate._chevGeo) {
    createStargate._chevGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
    createStargate._chevMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
    createStargate._chevMat._pooled = true;
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const chev = new THREE.Mesh(createStargate._chevGeo, createStargate._chevMat);
    chev.position.set(Math.cos(angle) * 18, Math.sin(angle) * 18, 0);
    chev.lookAt(0, 0, 0);
    stargateGroup.add(chev);
  }`,
  'F1: Stargate chevron SyntaxError fix'
);

// ================================================================
// F2: CRITICAL — Fix collectArtifact TDZ and mangled guard
// Remove extra broken lines that reference 'name' before const declaration
// ================================================================
safeReplace(
  `function collectArtifact() {
  const existingArt = state.inventory.find(i => i.name === name);
  if (existingArt) existingArt.quantity++;
  else if (!state.altUniverse) return;
  const sys = state.starSystems[state.location.systemIndex];`,
  `function collectArtifact() {
  if (!state.altUniverse) return;
  const sys = state.starSystems[state.location.systemIndex];`,
  'F2: collectArtifact TDZ + guard fix'
);

// ================================================================
// F3: Fix state.currentScreen → state.screen in market order guard
// ================================================================
safeReplace(
  `  const _screenSnapshot = state.currentScreen;`,
  `  const _screenSnapshot = state.screen;`,
  'F3a: state.currentScreen → state.screen (snapshot)'
);

safeReplace(
  `    if (state.currentScreen !== _screenSnapshot) return; // Guard: abort if navigated away`,
  `    if (state.screen !== _screenSnapshot) return; // Guard: abort if navigated away`,
  'F3b: state.currentScreen → state.screen (check)'
);

// ================================================================
// F4: Warp streaks — guard against drawing to detached canvas
// ================================================================
safeReplace(
  `    if (elapsed > 1200) { warpOverlay.remove(); streakCanvas.remove(); const ws = document.getElementById('warp-flash-style'); if (ws) ws.remove(); return; }`,
  `    if (elapsed > 1200 || !streakCanvas.parentNode) { if (warpOverlay.parentNode) warpOverlay.remove(); if (streakCanvas.parentNode) streakCanvas.remove(); const ws = document.getElementById('warp-flash-style'); if (ws) ws.remove(); return; }`,
  'F4: Warp streaks detached canvas guard'
);

// ================================================================
// Write result
// ================================================================
fs.writeFileSync(FILE, src, 'utf8');
const lines = src.split(/\r?\n/).length;
const opens = (src.match(/\{/g) || []).length;
const closes = (src.match(/\}/g) || []).length;
const pOpens = (src.match(/\(/g) || []).length;
const pCloses = (src.match(/\)/g) || []).length;
console.log('\n=== AUDIT 35 PATCH RESULTS ===');
console.log(ok + ' OK, ' + fail + ' FAIL');
console.log('Braces: ' + opens + '/' + closes + (opens === closes ? ' BALANCED' : ' MISMATCH!'));
console.log('Parens: ' + pOpens + '/' + pCloses + (pOpens === pCloses ? ' BALANCED' : ' MISMATCH!'));
console.log('Lines: ' + lines);
if (fail > 0) process.exit(1);
