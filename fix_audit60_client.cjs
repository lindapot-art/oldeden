/**
 * Audit 60 — Client-side Performance & Visual Patches
 *
 * Fix 1: Combat fog density 0.0015 → 0.00025 (was 10x too dense)
 * Fix 2: Cockpit MeshBasicMaterial → MeshStandardMaterial (unlit → lit)
 * Fix 3: Enemy PointLight → emissive mesh (perf: 15+ point lights)
 * Fix 4: Police PointLights → emissive meshes
 * Fix 5: Explosion PointLight → emissive mesh + material pooling
 * Fix 6: Impact sparks material pooling + PointLight → emissive mesh
 * Fix 7: Loot drop material pooling (4 types pre-created)
 * Fix 8: Bloom context-restore params mismatch fix
 * Fix 9: Near plane 0.01 → 0.1 (z-fighting fix)
 * Fix 10: legacyChain unbounded → cap at 200
 * Fix 11: Label rendering .clone() → temp vector reuse
 */

const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let src = fs.readFileSync(FILE, 'utf8');
const origLen = src.length;
let applied = 0;
let failed = 0;

function safeReplace(label, oldStr, newStr) {
  const o = cr(oldStr);
  const n = cr(newStr);
  if (!src.includes(o)) {
    console.error(`FAIL [${label}]: old string not found`);
    failed++;
    return;
  }
  const count = src.split(o).length - 1;
  if (count > 1) {
    console.error(`FAIL [${label}]: ${count} matches (expected 1)`);
    failed++;
    return;
  }
  src = src.replace(o, n);
  console.log(`OK   [${label}]`);
  applied++;
}

// ── Fix 1: Combat fog density ──
safeReplace('Fix1-fog-density',
  `scene.fog = new THREE.FogExp2(fogColor, 0.0015);`,
  `scene.fog = new THREE.FogExp2(fogColor, 0.00025);`
);

// ── Fix 2: Cockpit MeshBasicMaterial → MeshStandardMaterial ──
// Frame material
safeReplace('Fix2a-frameMat',
  `const frameMat = new THREE.MeshBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.5 });`,
  `const frameMat = new THREE.MeshStandardMaterial({ color: 0x334466, transparent: true, opacity: 0.5, roughness: 0.6, metalness: 0.8 });`
);
// Seat material
safeReplace('Fix2b-seatMat',
  `const seatMat = new THREE.MeshBasicMaterial({ color: 0x2a3540, transparent: true, opacity: 0.7 });`,
  `const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a3540, transparent: true, opacity: 0.7, roughness: 0.8, metalness: 0.3 });`
);
// Rail barrel material
safeReplace('Fix2c-railMat',
  `const railMat = new THREE.MeshBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.8 });`,
  `const railMat = new THREE.MeshStandardMaterial({ color: 0x556677, transparent: true, opacity: 0.8, roughness: 0.3, metalness: 0.9 });`
);
// Side panel material
safeReplace('Fix2d-panelMat',
  `const panelMat = new THREE.MeshBasicMaterial({ color: 0x1a2030, transparent: true, opacity: 0.6 });`,
  `const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, transparent: true, opacity: 0.6, roughness: 0.7, metalness: 0.5 });`
);
// Console material (inline)
safeReplace('Fix2e-consoleMat',
  `const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.08,0.8), new THREE.MeshBasicMaterial({ color: 0x1a2030, transparent: true, opacity: 0.5 }));`,
  `const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.08,0.8), new THREE.MeshStandardMaterial({ color: 0x1a2030, transparent: true, opacity: 0.5, roughness: 0.7, metalness: 0.5 }));`
);

// ── Fix 3: Enemy PointLight → emissive mesh ──
safeReplace('Fix3-enemy-pointlight',
  `  // Engine glow
  const engineGlow = new THREE.PointLight(0xff4422, 1.5, 15);
  engineGlow.position.set(0, 0, 2 * cfg.scale);
  g.add(engineGlow);`,
  `  // Engine glow — emissive sprite instead of PointLight for performance
  const _engGlowGeo = new THREE.SphereGeometry(0.5 * cfg.scale, 6, 6);
  const _engGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const engineGlow = new THREE.Mesh(_engGlowGeo, _engGlowMat);
  engineGlow.position.set(0, 0, 2 * cfg.scale);
  g.add(engineGlow);`
);

// ── Fix 4: Police PointLights → emissive meshes ──
safeReplace('Fix4a-police-pointlight',
  `    // Blue police lights (point light)
    const policeLight = new THREE.PointLight(0x4488ff, 3, 30);
    policeLight.position.set(0, 1, 0);
    patrol.add(policeLight);
    patrol.userData.policeLight = policeLight;`,
  `    // Blue police lights (emissive mesh — cheaper than PointLight)
    const _policeLightGeo = new THREE.SphereGeometry(0.6, 6, 6);
    const _policeLightMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    const policeLight = new THREE.Mesh(_policeLightGeo, _policeLightMat);
    policeLight.position.set(0, 1, 0);
    patrol.add(policeLight);
    patrol.userData.policeLight = policeLight;`
);
safeReplace('Fix4b-police-engine-glow',
  `    // Engine glow (blue for police)
    const engGlow = new THREE.PointLight(0x44aaff, 1.5, 15);
    engGlow.position.set(0, 0, 2);
    patrol.add(engGlow);`,
  `    // Engine glow (blue for police — emissive mesh)
    const _polEngGeo = new THREE.SphereGeometry(0.4, 6, 6);
    const _polEngMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const engGlow = new THREE.Mesh(_polEngGeo, _polEngMat);
    engGlow.position.set(0, 0, 2);
    patrol.add(engGlow);`
);

// ── Fix 5: Explosion material pooling + PointLight → emissive mesh ──
safeReplace('Fix5-explosion-pool',
  `function spawnExplosion(pos, scale) {
  const g = new THREE.Group();
  const s = scale || 1;
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(_explCoreGeo, coreMat);
  core.scale.setScalar(s);
  core.userData = { dir: new THREE.Vector3(0,0,0), speed: 0, isCore: true };
  g.add(core);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(_explRingGeo, ringMat);
  ring.userData = { dir: new THREE.Vector3(0,0,0), speed: 0, isRing: true };
  ring.lookAt(camera.position);
  g.add(ring);
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const color = t < 0.3 ? 0xffffff : t < 0.6 ? 0xff8800 : 0xff2200;
    const mat2 = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const sz = (0.1 + Math.random() * 0.4) * s;
    const geoIdx = Math.min(3, Math.floor(Math.random() * 4));
    const m = new THREE.Mesh(_explFragGeos[geoIdx], mat2);
    m.scale.setScalar(sz / [0.15, 0.25, 0.35, 0.45][geoIdx]);
    m.userData = { dir: new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize(), speed: 12+Math.random()*30, lifeVariance: 0.7 + Math.random() * 0.6 };
    g.add(m);
  }
  const fl = new THREE.PointLight(0xff6600, 5, 40 * s);
  g.add(fl);
  g.position.copy(pos); scene.add(g);
  c.explosions.push({ group: g, age: 0, maxAge: 700 });
}`,
  `// Pooled explosion materials (reused across explosions)
const _explCoreTpl = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false }); _explCoreTpl._pooled = true;
const _explRingTpl = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }); _explRingTpl._pooled = true;
const _explFragTpls = [
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
  new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
]; _explFragTpls.forEach(m => m._pooled = true);
const _explFlashGeo = new THREE.SphereGeometry(2, 6, 6); _explFlashGeo._pooled = true;
const _explFlashTpl = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }); _explFlashTpl._pooled = true;
function spawnExplosion(pos, scale) {
  const g = new THREE.Group();
  const s = scale || 1;
  const coreMat = _explCoreTpl.clone();
  const core = new THREE.Mesh(_explCoreGeo, coreMat);
  core.scale.setScalar(s);
  core.userData = { dir: new THREE.Vector3(0,0,0), speed: 0, isCore: true };
  g.add(core);
  const ringMat = _explRingTpl.clone();
  const ring = new THREE.Mesh(_explRingGeo, ringMat);
  ring.userData = { dir: new THREE.Vector3(0,0,0), speed: 0, isRing: true };
  ring.lookAt(camera.position);
  g.add(ring);
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const tplIdx = t < 0.3 ? 0 : t < 0.6 ? 1 : 2;
    const mat2 = _explFragTpls[tplIdx].clone();
    const sz = (0.1 + Math.random() * 0.4) * s;
    const geoIdx = Math.min(3, Math.floor(Math.random() * 4));
    const m = new THREE.Mesh(_explFragGeos[geoIdx], mat2);
    m.scale.setScalar(sz / [0.15, 0.25, 0.35, 0.45][geoIdx]);
    m.userData = { dir: new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize(), speed: 12+Math.random()*30, lifeVariance: 0.7 + Math.random() * 0.6 };
    g.add(m);
  }
  // Emissive flash mesh instead of PointLight
  const fl = new THREE.Mesh(_explFlashGeo, _explFlashTpl.clone());
  fl.scale.setScalar(s * 3);
  g.add(fl);
  g.position.copy(pos); scene.add(g);
  c.explosions.push({ group: g, age: 0, maxAge: 700 });
}`
);

// ── Fix 6: Impact sparks material pooling + PointLight → emissive mesh ──
safeReplace('Fix6-sparks-pool',
  `function spawnImpactSparks(position, color) {
  color = color || 0xffaa44;
  const sparkCount = 8 + Math.floor(Math.random() * 5);
  const g = new THREE.Group();
  for (let i = 0; i < sparkCount; i++) {
    const sz = 0.04 + Math.random() * 0.06;
    const mat = new THREE.MeshBasicMaterial({
      color: i < 3 ? 0xffffff : color, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const spark = new THREE.Mesh(_sparkUnitGeo, mat);
    spark.scale.setScalar(sz);
    spark.userData = {
      dir: new THREE.Vector3(
        (Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2
      ).normalize(),
      speed: 15 + Math.random() * 25,
    };
    g.add(spark);
  }
  const fl = new THREE.PointLight(color, 3, 12);
  g.add(fl);
  g.position.copy(position);
  scene.add(g);
  c.explosions.push({ group: g, age: 0, maxAge: 250 });
}`,
  `// Pooled spark material templates
const _sparkWhiteTpl = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }); _sparkWhiteTpl._pooled = true;
const _sparkTintTpls = new Map();
function _getSparkTintTpl(color) {
  if (_sparkTintTpls.has(color)) return _sparkTintTpls.get(color);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  m._pooled = true;
  _sparkTintTpls.set(color, m);
  if (_sparkTintTpls.size > 20) { const first = _sparkTintTpls.keys().next().value; _sparkTintTpls.get(first).dispose(); _sparkTintTpls.delete(first); }
  return m;
}
const _sparkFlashGeo = new THREE.SphereGeometry(0.8, 6, 6); _sparkFlashGeo._pooled = true;
function spawnImpactSparks(position, color) {
  color = color || 0xffaa44;
  const sparkCount = 8 + Math.floor(Math.random() * 5);
  const g = new THREE.Group();
  const tintMat = _getSparkTintTpl(color);
  for (let i = 0; i < sparkCount; i++) {
    const sz = 0.04 + Math.random() * 0.06;
    const mat = (i < 3 ? _sparkWhiteTpl : tintMat).clone();
    const spark = new THREE.Mesh(_sparkUnitGeo, mat);
    spark.scale.setScalar(sz);
    spark.userData = {
      dir: new THREE.Vector3(
        (Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2
      ).normalize(),
      speed: 15 + Math.random() * 25,
    };
    g.add(spark);
  }
  // Emissive flash sphere instead of PointLight
  const flMat = tintMat.clone(); flMat.opacity = 0.7;
  const fl = new THREE.Mesh(_sparkFlashGeo, flMat);
  g.add(fl);
  g.position.copy(position);
  scene.add(g);
  c.explosions.push({ group: g, age: 0, maxAge: 250 });
}`
);

// ── Fix 7: Loot drop material pooling ──
safeReplace('Fix7-loot-pool',
  `function spawnLootDrop(pos, type, creditValue) {
  const g = new THREE.Group();
  const colors = { credits: 0xffd700, ammo: 0x44aaff, health: 0x44ff44, fuel: 0xff8844 };
  const mat = new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(_lootOctGeo, mat);
  g.add(mesh);
  // Glow ring
  const ring = new THREE.Mesh(_lootRingGeo, new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
  g.add(ring);
  // Emissive glow sphere — cheaper than PointLight
  const _lootGlowMat = new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  const lootGlow = new THREE.Mesh(_lootSphereGeo, _lootGlowMat);
  g.add(lootGlow);`,
  `// Pooled loot materials (one set per type — reused across drops)
const _lootColors = { credits: 0xffd700, ammo: 0x44aaff, health: 0x44ff44, fuel: 0xff8844 };
const _lootMatPool = {};
const _lootRingMatPool = {};
const _lootGlowMatPool = {};
for (const [lt, lc] of Object.entries(_lootColors)) {
  _lootMatPool[lt] = new THREE.MeshBasicMaterial({ color: lc, transparent: true, opacity: 0.8 }); _lootMatPool[lt]._pooled = true;
  _lootRingMatPool[lt] = new THREE.MeshBasicMaterial({ color: lc, transparent: true, opacity: 0.3, side: THREE.DoubleSide }); _lootRingMatPool[lt]._pooled = true;
  _lootGlowMatPool[lt] = new THREE.MeshBasicMaterial({ color: lc, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }); _lootGlowMatPool[lt]._pooled = true;
}
function spawnLootDrop(pos, type, creditValue) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(_lootOctGeo, (_lootMatPool[type] || _lootMatPool.credits).clone());
  g.add(mesh);
  // Glow ring
  const ring = new THREE.Mesh(_lootRingGeo, (_lootRingMatPool[type] || _lootRingMatPool.credits).clone());
  g.add(ring);
  // Emissive glow sphere — cheaper than PointLight
  const lootGlow = new THREE.Mesh(_lootSphereGeo, (_lootGlowMatPool[type] || _lootGlowMatPool.credits).clone());
  g.add(lootGlow);`
);

// ── Fix 8: Bloom context-restore params match main init ──
safeReplace('Fix8-bloom-mismatch',
  `const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.5, 0.6);`,
  `const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.85);`
);

// ── Fix 9: Near plane 0.01 → 0.1 (z-fighting fix) ──
safeReplace('Fix9-near-plane',
  `camera = new THREE.PerspectiveCamera(75, 1, 0.01, 50000);`,
  `camera = new THREE.PerspectiveCamera(75, 1, 0.1, 50000);`
);

// ── Fix 10: legacyChain cap at 200 ──
safeReplace('Fix10-legacyChain-cap',
  `  p.legacyChain.push({
    rebirthNum: p.rebirths + 1,
    fragmentId: fragment.id,
    kills: c.kills,
    score: c.score,
    faction: p.faction,
    timestamp: Date.now(),
  });`,
  `  p.legacyChain.push({
    rebirthNum: p.rebirths + 1,
    fragmentId: fragment.id,
    kills: c.kills,
    score: c.score,
    faction: p.faction,
    timestamp: Date.now(),
  });
  if (p.legacyChain.length > 200) p.legacyChain.splice(0, p.legacyChain.length - 200);`
);

// ── Fix 11a: renderLibraryLabels .clone() → temp vector ──
safeReplace('Fix11a-library-label-clone',
  `    const pos = lbl.obj.position.clone();
    pos.y += 10;
    pos.project(camera);`,
  `    _tmpV3a.copy(lbl.obj.position);
    _tmpV3a.y += 10;
    _tmpV3a.project(camera);
    const pos = _tmpV3a;`
);

// ── Fix 11b: renderPoliceLabels .clone() → temp vector ──
safeReplace('Fix11b-police-label-clone',
  `    const pos = p.position.clone();
    pos.y += 6;
    pos.project(camera);`,
  `    _tmpV3a.copy(p.position);
    _tmpV3a.y += 6;
    _tmpV3a.project(camera);
    const pos = _tmpV3a;`
);

// ── Fix 11b additional: police light color update (it's now a mesh, not PointLight) ──
// The police update loop references policeLight.color and policeLight.intensity
// which won't exist on a Mesh — need to update to .material.color and .material.opacity
safeReplace('Fix4c-police-light-update',
  `      p.userData.policeLight.color.setHex(flash ? 0x4488ff : 0xff2244);
      p.userData.policeLight.intensity = 2 + Math.sin(p.userData.lightTimer * 0.012) * 2;`,
  `      p.userData.policeLight.material.color.setHex(flash ? 0x4488ff : 0xff2244);
      p.userData.policeLight.material.opacity = 0.4 + Math.sin(p.userData.lightTimer * 0.012) * 0.4;`
);

// Write result
fs.writeFileSync(FILE, src, 'utf8');
console.log(`\n--- AUDIT 60 CLIENT PATCHES ---`);
console.log(`Applied: ${applied}, Failed: ${failed}`);
console.log(`Size: ${origLen} → ${src.length} (${src.length > origLen ? '+' : ''}${src.length - origLen})`);
if (failed > 0) process.exit(1);
