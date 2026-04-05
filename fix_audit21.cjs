// fix_audit21.cjs — Audit 21: 10 fixes for Old Eden
// Space dust shared geo/mat, explosion shared geo + frame-independent shrink,
// NPC radar hostile check, market buy/sell escrow, character name validation,
// station model dispose, glb scene object dispose, karma particle cleanup

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
const cr = s => s.replace(/\n/g, '\r\n');
let applied = 0;

function safeReplace(old, rep, label) {
  if (!src.includes(old)) { console.error('MISS: ' + label); return; }
  const count = src.split(old).length - 1;
  if (count !== 1) { console.error('MULTI(' + count + '): ' + label); return; }
  src = src.replace(old, rep);
  applied++;
  console.log('OK: ' + label);
}

// =================================================================
// Fix 1: Shared geometry + material for space dust (40 allocs → 1+1)
// =================================================================
safeReplace(
  cr(`function spawnSpaceDust() {
  for (let i = 0; i < 40; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.3 + Math.random() * 0.3 });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 4, 4), mat);`),
  cr(`const _dustGeo = new THREE.SphereGeometry(0.08, 4, 4);
const _dustMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.45 });
function spawnSpaceDust() {
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(_dustGeo, _dustMat);`),
  'Fix 1: Shared dust geometry+material'
);

// =================================================================
// Fix 2: Shared geometries for explosions (reduce per-explosion allocs)
// =================================================================
safeReplace(
  cr(`function spawnExplosion(pos, scale) {
  const g = new THREE.Group();
  const s = scale || 1;
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 8, 8), coreMat);`),
  cr(`const _explCoreGeo = new THREE.SphereGeometry(0.5, 8, 8);
const _explFragGeos = [0.15, 0.25, 0.35, 0.45].map(r => new THREE.SphereGeometry(r, 4, 4));
const _explRingGeo = new THREE.RingGeometry(0.3, 0.6, 16);
function spawnExplosion(pos, scale) {
  const g = new THREE.Group();
  const s = scale || 1;
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(_explCoreGeo, coreMat);
  core.scale.setScalar(s);`),
  'Fix 2: Shared explosion core geometry'
);

// Fix 2b: Shared ring geometry
safeReplace(
  cr(`  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.6, 16), ringMat);`),
  cr(`  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(_explRingGeo, ringMat);`),
  'Fix 2b: Shared explosion ring geometry'
);

// Fix 2c: Shared fragment geometries
safeReplace(
  cr(`    const sz = (0.1 + Math.random() * 0.4) * s;
    const m = new THREE.Mesh(new THREE.SphereGeometry(sz, 4, 4), mat2);`),
  cr(`    const sz = (0.1 + Math.random() * 0.4) * s;
    const geoIdx = Math.min(3, Math.floor(Math.random() * 4));
    const m = new THREE.Mesh(_explFragGeos[geoIdx], mat2);
    m.scale.setScalar(sz / [0.15, 0.25, 0.35, 0.45][geoIdx]);`),
  'Fix 2c: Shared explosion fragment geometries'
);

// =================================================================
// Fix 3: NPC radar dots — use n.friendly instead of n.hostile
// =================================================================
safeReplace(
  cr(`        hudCtx.fillStyle = n.hostile ? '#ff6600' : '#00ccff';`),
  cr(`        hudCtx.fillStyle = n.friendly ? '#00ccff' : '#ff6600';`),
  'Fix 3: NPC radar dot color uses friendly property'
);

// =================================================================
// Fix 4: Market buy-order deducts credits upfront (escrow)
// =================================================================
safeReplace(
  cr(`  if (type === 'buy' && state.player.credits < price * qty) { addComms('Market', 'Insufficient credits for buy order.'); return; }
  if (type === 'sell') {
    const inv = state.inventory.find(i => i.name === item);
    if (!inv || (inv.quantity || 1) < qty) { addComms('Market', \`Insufficient \${item} in cargo.\`); return; }
  }
  state.market.orders.push({ id: 'player-' + Date.now(), item, type, price, quantity: qty, trader: state.player.name || 'You', isNPC: false });`),
  cr(`  if (type === 'buy' && state.player.credits < price * qty) { addComms('Market', 'Insufficient credits for buy order.'); return; }
  if (type === 'sell') {
    const inv = state.inventory.find(i => i.name === item);
    if (!inv || (inv.quantity || 1) < qty) { addComms('Market', \`Insufficient \${item} in cargo.\`); return; }
    inv.quantity = (inv.quantity || 1) - qty;
    if (inv.quantity <= 0) state.inventory = state.inventory.filter(i => i !== inv);
  }
  if (type === 'buy') { state.player.credits -= price * qty; }
  state.market.orders.push({ id: 'player-' + Date.now(), item, type, price, quantity: qty, trader: state.player.name || 'You', isNPC: false });`),
  'Fix 4: Market buy/sell escrow (deduct credits + inventory upfront)'
);

// =================================================================
// Fix 5: Character name length validation (2-24 chars)
// =================================================================
safeReplace(
  cr(`function createCharacter() {
  const name = document.getElementById('pilot-name').value.trim();
  if (!name) { document.getElementById('pilot-name').style.borderColor = 'var(--danger)'; return; }`),
  cr(`function createCharacter() {
  const name = document.getElementById('pilot-name').value.trim();
  if (!name || name.length < 2 || name.length > 24) { document.getElementById('pilot-name').style.borderColor = 'var(--danger)'; return; }`),
  'Fix 5: Character name 2-24 char validation'
);

// =================================================================
// Fix 6: Station models — disposeObject on exitGunnerMode
// =================================================================
safeReplace(
  cr(`  stationModels.forEach(m => scene.remove(m)); stationModels = [];
  glbSceneObjects.forEach(o => scene.remove(o)); glbSceneObjects = []; libraryLabels = [];`),
  cr(`  stationModels.forEach(m => { scene.remove(m); disposeObject(m); }); stationModels = [];
  glbSceneObjects.forEach(o => { scene.remove(o); disposeObject(o); }); glbSceneObjects = []; libraryLabels = [];`),
  'Fix 6: Dispose station models + GLB scene objects on exit'
);

// =================================================================
// Fix 7: Karma wheel particles cleanup after animation
// =================================================================
safeReplace(
  cr(`    particleEl.appendChild(p);
  }
  
  // Rarity aura`),
  cr(`    particleEl.appendChild(p);
  }
  setTimeout(() => { particleEl.innerHTML = ''; }, 2000);
  
  // Rarity aura`),
  'Fix 7: Karma particles cleanup timer (2s after animation)'
);

// =================================================================
// Fix 8: Explosion fragment shrink — frame-rate independent
// =================================================================
safeReplace(
  cr(`          ch.scale.multiplyScalar(0.98);`),
  cr(`          ch.scale.multiplyScalar(Math.pow(0.98, dt * 60));`),
  'Fix 8: Frame-rate independent explosion fragment shrink'
);

// =================================================================
// Write result
// =================================================================
fs.writeFileSync(file, src, 'utf8');
console.log('\n=== Applied: ' + applied + '/9 ===');

// Quick brace/tag balance check
const openBraces = (src.match(/{/g) || []).length;
const closeBraces = (src.match(/}/g) || []).length;
console.log('Brace balance: { ' + openBraces + ' } ' + closeBraces + ' diff=' + (openBraces - closeBraces));
const openScript = (src.match(/<script/gi) || []).length;
const closeScript = (src.match(/<\/script>/gi) || []).length;
console.log('Script tags: open=' + openScript + ' close=' + closeScript);
