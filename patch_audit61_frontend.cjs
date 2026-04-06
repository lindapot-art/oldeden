/**
 * Audit 61 — Frontend patch for public/index.html (CRLF-aware)
 * Uses \r\n in all multi-line match strings
 */

const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'public', 'index.html');

let src = fs.readFileSync(filePath, 'utf8');
const originalLen = src.length;
const N = '\r\n'; // CRLF

let patchCount = 0;
let failCount = 0;

function patch(label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.error(`[PATCH FAIL] "${label}"`);
    const first40 = oldStr.replace(/\r\n/g, '\\r\\n').slice(0, 120);
    console.error(`  Looking for: ${first40}`);
    failCount++;
    return false;
  }
  const count = src.split(oldStr).length - 1;
  if (count > 1) {
    console.warn(`[PATCH WARN] "${label}" — matched ${count}x, replacing first`);
  }
  src = src.replace(oldStr, newStr);
  patchCount++;
  console.log(`[PATCH OK] #${patchCount}: ${label}`);
  return true;
}

// ──────────────────────────────────────────────────────────
// PATCH 1: Pool asteroid material (one per system, not per rock)
// ──────────────────────────────────────────────────────────
patch('1: Pool asteroid material',
  `  for (let i = 0; i < baseCount; i++) {${N}` +
  `    const g = new THREE.Group();${N}` +
  `    const size = 2 + Math.random() * 6;${N}` +
  `    const geo = new THREE.IcosahedronGeometry(size, 0);${N}` +
  `    // Deform vertices for rocky look${N}` +
  `    const pos = geo.attributes.position;${N}` +
  `    for (let v = 0; v < pos.count; v++) {${N}` +
  `      pos.setXYZ(v, pos.getX(v) * (0.7 + Math.random()*0.6), pos.getY(v) * (0.7 + Math.random()*0.6), pos.getZ(v) * (0.7 + Math.random()*0.6));${N}` +
  `    }${N}` +
  `    geo.computeVertexNormals();${N}` +
  `    const mat = new THREE.MeshStandardMaterial({ color: resTint, roughness: 0.9, metalness: 0.2, flatShading: true });${N}` +
  `    const mesh = new THREE.Mesh(geo, mat);`,

  `  // Shared asteroid material for this system (disposed on exit via disposeObject)${N}` +
  `  const _astMat = new THREE.MeshStandardMaterial({ color: resTint, roughness: 0.9, metalness: 0.2, flatShading: true });${N}` +
  `  for (let i = 0; i < baseCount; i++) {${N}` +
  `    const g = new THREE.Group();${N}` +
  `    const size = 2 + Math.random() * 6;${N}` +
  `    const geo = new THREE.IcosahedronGeometry(size, 0);${N}` +
  `    // Deform vertices for rocky look${N}` +
  `    const pos = geo.attributes.position;${N}` +
  `    for (let v = 0; v < pos.count; v++) {${N}` +
  `      pos.setXYZ(v, pos.getX(v) * (0.7 + Math.random()*0.6), pos.getY(v) * (0.7 + Math.random()*0.6), pos.getZ(v) * (0.7 + Math.random()*0.6));${N}` +
  `    }${N}` +
  `    geo.computeVertexNormals();${N}` +
  `    const mesh = new THREE.Mesh(geo, _astMat);`
);

// ──────────────────────────────────────────────────────────
// PATCH 2: Pool engine glow geo+mat in createEnemy
// ──────────────────────────────────────────────────────────
patch('2: Pool enemy engine glow geo+mat',
  `  // Engine glow — emissive sprite instead of PointLight for performance${N}` +
  `  const _engGlowGeo = new THREE.SphereGeometry(0.5 * cfg.scale, 6, 6);${N}` +
  `  const _engGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });${N}` +
  `  const engineGlow = new THREE.Mesh(_engGlowGeo, _engGlowMat);`,

  `  // Engine glow — pooled geo+mat per scale tier (avoids per-enemy GPU alloc)${N}` +
  `  if (!createEnemy._glowGeos) { createEnemy._glowGeos = new Map(); createEnemy._glowMat = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }); createEnemy._glowMat._pooled = true; }${N}` +
  `  const _glowR = Math.round(cfg.scale * 50);${N}` +
  `  if (!createEnemy._glowGeos.has(_glowR)) { const gg = new THREE.SphereGeometry(0.5 * cfg.scale, 6, 6); gg._pooled = true; createEnemy._glowGeos.set(_glowR, gg); }${N}` +
  `  const engineGlow = new THREE.Mesh(createEnemy._glowGeos.get(_glowR), createEnemy._glowMat);`
);

// ──────────────────────────────────────────────────────────
// PATCH 3: Boss PointLight → emissive mesh
// ──────────────────────────────────────────────────────────
patch('3: Boss PointLight → emissive mesh',
  `  // Boss warning lights — pulsing point lights${N}` +
  `  const warnLight = new THREE.PointLight(bossTint.tint, 3, 50);${N}` +
  `  warnLight.position.set(0, 2, 0);${N}` +
  `  g.add(warnLight);`,

  `  // Boss warning lights — emissive mesh (cheaper than PointLight)${N}` +
  `  if (!createBossEnemy._warnGeo) { createBossEnemy._warnGeo = new THREE.SphereGeometry(1.5, 8, 8); createBossEnemy._warnGeo._pooled = true; }${N}` +
  `  const _bwMat = new THREE.MeshBasicMaterial({ color: bossTint.tint, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });${N}` +
  `  const warnLight = new THREE.Mesh(createBossEnemy._warnGeo, _bwMat);${N}` +
  `  warnLight.position.set(0, 2, 0);${N}` +
  `  g.add(warnLight);`
);

// ──────────────────────────────────────────────────────────
// PATCH 4: spawnImpactSparks — stop cloning material per spark
// ──────────────────────────────────────────────────────────
patch('4: Sparks stop cloning material per-spark',
  `  for (let i = 0; i < sparkCount; i++) {${N}` +
  `    const sz = 0.04 + Math.random() * 0.06;${N}` +
  `    const mat = (i < 3 ? _sparkWhiteTpl : tintMat).clone();${N}` +
  `    const spark = new THREE.Mesh(_sparkUnitGeo, mat);`,

  `  for (let i = 0; i < sparkCount; i++) {${N}` +
  `    const sz = 0.04 + Math.random() * 0.06;${N}` +
  `    const spark = new THREE.Mesh(_sparkUnitGeo, i < 3 ? _sparkWhiteTpl : tintMat);`
);

// Also fix the flash sphere clone at end of spawnImpactSparks
patch('4b: Spark flash stop cloning material',
  `  // Emissive flash sphere instead of PointLight${N}` +
  `  const flMat = tintMat.clone(); flMat.opacity = 0.7;${N}` +
  `  const fl = new THREE.Mesh(_sparkFlashGeo, flMat);`,

  `  // Emissive flash sphere — reuse pooled tint mat${N}` +
  `  const fl = new THREE.Mesh(_sparkFlashGeo, tintMat);`
);

// ──────────────────────────────────────────────────────────
// PATCH 5: spawnExplosion — stop cloning materials per explosion
// ──────────────────────────────────────────────────────────
patch('5a: Explosion core stop cloning',
  `  const coreMat = _explCoreTpl.clone();${N}` +
  `  const core = new THREE.Mesh(_explCoreGeo, coreMat);`,

  `  const core = new THREE.Mesh(_explCoreGeo, _explCoreTpl);`
);

patch('5b: Explosion ring stop cloning',
  `  const ringMat = _explRingTpl.clone();${N}` +
  `  const ring = new THREE.Mesh(_explRingGeo, ringMat);`,

  `  const ring = new THREE.Mesh(_explRingGeo, _explRingTpl);`
);

// 5c and 5d already applied in previous run — skip if present
if (!src.includes('const mat2 = _explFragTpls[tplIdx];')) {
  patch('5c: Explosion fragments stop cloning',
    `    const mat2 = _explFragTpls[tplIdx].clone();`,
    `    const mat2 = _explFragTpls[tplIdx];`
  );
} else { console.log('[SKIP] 5c already applied'); }

if (!src.includes(`const fl = new THREE.Mesh(_explFlashGeo, _explFlashTpl);${N}`)) {
  patch('5d: Explosion flash stop cloning',
    `  const fl = new THREE.Mesh(_explFlashGeo, _explFlashTpl.clone());`,
    `  const fl = new THREE.Mesh(_explFlashGeo, _explFlashTpl);`
  );
} else { console.log('[SKIP] 5d already applied'); }

// ──────────────────────────────────────────────────────────
// PATCH 6: Nebulae — share one PlaneGeometry
// ──────────────────────────────────────────────────────────
patch('6: Nebulae share single PlaneGeometry',
  `// Nebulae${N}` +
  `for (let i = 0; i < 4; i++) {${N}` +
  `  const nebMat = new THREE.MeshBasicMaterial({${N}` +
  `    color: [0x1a0a2e, 0x0a1a2e, 0x2e0a1a, 0x0a2a1a][i],${N}` +
  `    transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false,${N}` +
  `  });${N}` +
  `  const neb = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), nebMat);`,

  `// Nebulae — shared geometry${N}` +
  `const _nebGeo = new THREE.PlaneGeometry(3000, 3000); _nebGeo._pooled = true;${N}` +
  `for (let i = 0; i < 4; i++) {${N}` +
  `  const nebMat = new THREE.MeshBasicMaterial({${N}` +
  `    color: [0x1a0a2e, 0x0a1a2e, 0x2e0a1a, 0x0a2a1a][i],${N}` +
  `    transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false,${N}` +
  `  });${N}` +
  `  const neb = new THREE.Mesh(_nebGeo, nebMat);`
);

// ──────────────────────────────────────────────────────────
// PATCH 7: disposeObject — guard against double-dispose
// ──────────────────────────────────────────────────────────
patch('7: Guard disposeObject double-dispose',
  `function disposeObject(obj) {${N}` +
  `  if (!obj) return;${N}` +
  `  obj.traverse(child => {${N}` +
  `    if (child.isMesh) {${N}` +
  `      if (child.geometry && !child.geometry._pooled) {${N}` +
  `        child.geometry.dispose();${N}` +
  `      }${N}` +
  `      if (child.material && !child.material._pooled) {${N}` +
  `        if (Array.isArray(child.material)) child.material.forEach(m => { if (!m._pooled) m.dispose(); });${N}` +
  `        else child.material.dispose();${N}` +
  `      }${N}` +
  `    }`,

  `function disposeObject(obj) {${N}` +
  `  if (!obj) return;${N}` +
  `  obj.traverse(child => {${N}` +
  `    if (child.isMesh) {${N}` +
  `      if (child.geometry && !child.geometry._pooled && !child.geometry._disposed) {${N}` +
  `        child.geometry.dispose(); child.geometry._disposed = true;${N}` +
  `      }${N}` +
  `      if (child.material && !child.material._pooled) {${N}` +
  `        if (Array.isArray(child.material)) child.material.forEach(m => { if (!m._pooled && !m._disposed) { m.dispose(); m._disposed = true; } });${N}` +
  `        else if (!child.material._disposed) { child.material.dispose(); child.material._disposed = true; }${N}` +
  `      }${N}` +
  `    }`
);

// ──────────────────────────────────────────────────────────
// PATCH 8: Clear mobile fireInterval on death
// ──────────────────────────────────────────────────────────
patch('8: Clear mobile fireInterval on death',
  `function playerDeathSequence(cause) {${N}` +
  `  if (_deathSequenceActive) return;${N}` +
  `  _deathSequenceActive = true;${N}` +
  `  c.dead = true;${N}` +
  `  AudioSFX.stopEngineHum();`,

  `function playerDeathSequence(cause) {${N}` +
  `  if (_deathSequenceActive) return;${N}` +
  `  _deathSequenceActive = true;${N}` +
  `  c.dead = true;${N}` +
  `  if (window._clearMobileFireInterval) window._clearMobileFireInterval();${N}` +
  `  AudioSFX.stopEngineHum();`
);

// ──────────────────────────────────────────────────────────
// PATCH 9: Unmark _pooled on material cache clear (already applied? check)
// ──────────────────────────────────────────────────────────
if (!src.includes('_materialCache.forEach(m => { m._pooled = false; m.dispose(); })')) {
  patch('9: Unmark _pooled on material cache clear',
    `  _materialCache.forEach(m => m.dispose()); _materialCache.clear();`,
    `  _materialCache.forEach(m => { m._pooled = false; m.dispose(); }); _materialCache.clear();`
  );
} else { console.log('[SKIP] 9 already applied'); }

// ──────────────────────────────────────────────────────────
// PATCH 10: Pool fallback BoxGeometry in createEnemy
// ──────────────────────────────────────────────────────────
patch('10: Pool fallback enemy BoxGeometry',
  `  } else {${N}` +
  `    // Minimal fallback — single red box if no model loaded yet${N}` +
  `    const mat = new THREE.MeshStandardMaterial({ color: 0xff4422, roughness: 0.4, metalness: 0.7, emissive: 0xff2200, emissiveIntensity: 0.3 });${N}` +
  `    g.add(new THREE.Mesh(new THREE.BoxGeometry(2*cfg.scale, 0.6*cfg.scale, 3*cfg.scale), mat));${N}` +
  `  }`,

  `  } else {${N}` +
  `    // Minimal fallback — pooled geo+mat per type if no model loaded yet${N}` +
  `    if (!createEnemy._fbGeos) { createEnemy._fbGeos = {}; createEnemy._fbMat = new THREE.MeshStandardMaterial({ color: 0xff4422, roughness: 0.4, metalness: 0.7, emissive: 0xff2200, emissiveIntensity: 0.3 }); createEnemy._fbMat._pooled = true; }${N}` +
  `    if (!createEnemy._fbGeos[type]) { createEnemy._fbGeos[type] = new THREE.BoxGeometry(2*cfg.scale, 0.6*cfg.scale, 3*cfg.scale); createEnemy._fbGeos[type]._pooled = true; }${N}` +
  `    g.add(new THREE.Mesh(createEnemy._fbGeos[type], createEnemy._fbMat));${N}` +
  `  }`
);

// ── Write ────
fs.writeFileSync(filePath, src, 'utf8');
console.log(`\n========================================`);
console.log(`Audit 61: ${patchCount} patches applied, ${failCount} failed`);
console.log(`File size: ${originalLen} → ${src.length} bytes`);
if (failCount > 0) console.log(`⚠ ${failCount} patches failed — check output above`);
else console.log(`✅ All patches applied successfully`);
