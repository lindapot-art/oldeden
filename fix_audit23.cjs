// fix_audit23.cjs — Audit 23: 10 fixes for Old Eden
// Spark shared geo, quest reward guard, death blocks firing, upgrade clamps,
// viewport user-scalable, projectile lights removed, server quest ids,
// commodity price fix, NPC market price ranges, spark double-add

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
// Fix 1: Shared spark geometry + fix double scene.add
// =================================================================
safeReplace(
  cr(`  // Muzzle flash particles
  for (let i = 0; i < 6; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 })
    );
    const sparkDir = dir.clone().add(new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3));
    spark.position.copy(origin);
    scene.add(spark);
    // Quick spark animation — reuse explosion system
    const sparkG = new THREE.Group(); sparkG.add(spark); sparkG.position.copy(origin); scene.add(sparkG);
    c.explosions.push({ group: sparkG, age: 0, maxAge: 150 });
  }`),
  cr(`  // Muzzle flash particles (shared geometry)
  for (let i = 0; i < 6; i++) {
    const spark = new THREE.Mesh(
      _explFragGeos[0],
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 })
    );
    spark.scale.setScalar(0.6 + Math.random() * 0.8);
    const sparkG = new THREE.Group(); sparkG.add(spark); sparkG.position.copy(origin); scene.add(sparkG);
    c.explosions.push({ group: sparkG, age: 0, maxAge: 150 });
  }`),
  'Fix 1: Shared spark geo + fix double scene.add'
);

// =================================================================
// Fix 2: Quest reward only offline (prevent double-pay when server connected)
// =================================================================
safeReplace(
  cr(`              if (q.objectives.every(o => (o.current || 0) >= o.required)) {
                q.completed = true; q.active = false;
                state.player.credits += q.rewards?.credits || 0;
                addComms('Mission', \`COMPLETED: \${q.title || q.name} — +\${q.rewards?.credits || 0} EC\`);`),
  cr(`              if (q.objectives.every(o => (o.current || 0) >= o.required)) {
                q.completed = true; q.active = false;
                if (!state.socket || !state.connected) { state.player.credits += q.rewards?.credits || 0; }
                addComms('Mission', \`COMPLETED: \${q.title || q.name} — +\${q.rewards?.credits || 0} EC\`);`),
  'Fix 2: Quest reward only offline to prevent double-pay'
);

// =================================================================
// Fix 3: Death blocks weapon firing
// =================================================================
// 3a: mousedown handler
safeReplace(
  cr(`canvas3d.addEventListener('mousedown', (e) => {
  if (state.screen !== 'gunner') return;`),
  cr(`canvas3d.addEventListener('mousedown', (e) => {
  if (state.screen !== 'gunner' || c.dead) return;`),
  'Fix 3a: Block mousedown when dead'
);

// 3b: fireLaser guard
safeReplace(
  cr(`function fireLaser() {
  if (c.heat >= 0.95) return; // overheated`),
  cr(`function fireLaser() {
  if (c.dead || c.heat >= 0.95) return; // dead or overheated`),
  'Fix 3b: fireLaser dead guard'
);

// 3c: fireRailgun guard
safeReplace(
  cr(`function fireRailgun() {
  if (!c.weaponReady || c.ammo <= 0) return;`),
  cr(`function fireRailgun() {
  if (c.dead || !c.weaponReady || c.ammo <= 0) return;`),
  'Fix 3c: fireRailgun dead guard'
);

// 3d: Continuous laser fire in game loop
safeReplace(
  cr(`    if (mouseHeld && state.activeWeapon === 'laser' && c.locked) fireLaser();`),
  cr(`    if (mouseHeld && state.activeWeapon === 'laser' && c.locked && !c.dead) fireLaser();`),
  'Fix 3d: Game loop laser fire dead guard'
);

// =================================================================
// Fix 4: applyUpgrades clamps stats to valid ranges
// =================================================================
safeReplace(
  cr(`function applyUpgrades() {
  state.ship.maxHull = state.upgrades.maxHull;
  state.ship.maxShield = state.upgrades.maxShield;
  state.combat.maxAmmo = state.upgrades.maxAmmo;
}`),
  cr(`function applyUpgrades() {
  state.upgrades.maxHull = Math.max(100, Math.min(500, state.upgrades.maxHull || 100));
  state.upgrades.maxShield = Math.max(100, Math.min(500, state.upgrades.maxShield || 100));
  state.upgrades.maxAmmo = Math.max(24, Math.min(100, state.upgrades.maxAmmo || 24));
  state.upgrades.railgunDmg = Math.max(1, Math.min(5, state.upgrades.railgunDmg || 1));
  state.upgrades.shieldRegen = Math.max(3, Math.min(20, state.upgrades.shieldRegen || 3));
  state.upgrades.engineSpeed = Math.max(1, Math.min(3, state.upgrades.engineSpeed || 1));
  state.ship.maxHull = state.upgrades.maxHull;
  state.ship.maxShield = state.upgrades.maxShield;
  state.combat.maxAmmo = state.upgrades.maxAmmo;
}`),
  'Fix 4: applyUpgrades clamps all stats'
);

// =================================================================
// Fix 5: Viewport meta — disable pinch zoom on mobile
// =================================================================
safeReplace(
  cr(`<meta name="viewport" content="width=device-width, initial-scale=1.0"/>`),
  cr(`<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>`),
  'Fix 5: Viewport disable pinch zoom'
);

// =================================================================
// Fix 6: Remove PointLight from laser projectiles (perf: too many lights)
// =================================================================
safeReplace(
  cr(`  const laserLight = new THREE.PointLight(0x00ff88, 1, 8);
  g.add(laserLight);
  
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir: dir.clone(), speed: LASER_SPEED, life: 2000, age: 0, trailMat: beamMat, heatMat: glowMat, slugLight: laserLight, isLaser: true, damage: LASER_DAMAGE });`),
  cr(`  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir: dir.clone(), speed: LASER_SPEED, life: 2000, age: 0, trailMat: beamMat, heatMat: glowMat, slugLight: null, isLaser: true, damage: LASER_DAMAGE });`),
  'Fix 6a: Remove PointLight from laser bolts'
);

safeReplace(
  cr(`  // Point light on slug for environment illumination
  const slugLight = new THREE.PointLight(0x44aaff, 2, 15);
  g.add(slugLight);

  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir: dir.clone(), speed: NAIL_SPEED, life: 3000, age: 0, trailMat: trailMat2, heatMat, slugLight });`),
  cr(`  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir: dir.clone(), speed: NAIL_SPEED, life: 3000, age: 0, trailMat: trailMat2, heatMat, slugLight: null });`),
  'Fix 6b: Remove PointLight from railgun slugs'
);

// =================================================================
// Fix 7: Server-loaded quests — add id + rewards object
// =================================================================
safeReplace(
  cr(`        state.quests = qData.quests.map(q => ({
          title: q.title || q.objective || 'Unknown Mission',
          summary: q.description || q.hook || 'Complete this mission.',
          reward: q.reward || Math.floor(Math.random() * 500 + 100),
          active: false,
          completed: false,
          objectives: q.objectives || [{ type: 'kill', target: '*', required: 5 + Math.floor(Math.random() * 10), current: 0 }],
        }));`),
  cr(`        state.quests = qData.quests.map((q, idx) => ({
          id: q.id || q._id || ('server-q-' + idx),
          title: q.title || q.objective || 'Unknown Mission',
          summary: q.description || q.hook || 'Complete this mission.',
          reward: q.reward || Math.floor(Math.random() * 500 + 100),
          rewards: { credits: q.reward || Math.floor(Math.random() * 500 + 100) },
          active: false,
          completed: false,
          objectives: q.objectives || [{ type: 'kill', target: '*', required: 5 + Math.floor(Math.random() * 10), current: 0 }],
        }));`),
  'Fix 7: Server quests get id + rewards object'
);

// =================================================================
// Fix 8: Commodity price fix — Salvage Scrap buy must be > sell
// =================================================================
safeReplace(
  cr(`  { name: 'Salvage Scrap', buy: 15, sell: 22 },`),
  cr(`  { name: 'Salvage Scrap', buy: 25, sell: 15 },`),
  'Fix 8: Fix Salvage Scrap arbitrage (buy > sell)'
);

// =================================================================
// Fix 9: NPC market price ranges — no overlap between buy/sell
// =================================================================
safeReplace(
  cr(`      const priceVar = 0.8 + Math.random() * 0.4; // ±20%`),
  cr(`      const priceVar = 0.95 + Math.random() * 0.25; // sell: 0.95–1.2x`),
  'Fix 9a: NPC sell orders priced 0.95-1.2x (was 0.8-1.2)'
);

safeReplace(
  cr(`      const priceVar = 0.6 + Math.random() * 0.35; // lower than sell`),
  cr(`      const priceVar = 0.5 + Math.random() * 0.3; // buy: 0.5–0.8x (no overlap with sell)`),
  'Fix 9b: NPC buy orders priced 0.5-0.8x (was 0.6-0.95)'
);

// =================================================================
// Write result
// =================================================================
fs.writeFileSync(file, src, 'utf8');
console.log('\n=== Applied: ' + applied + '/14 ===');

const openBraces = (src.match(/{/g) || []).length;
const closeBraces = (src.match(/}/g) || []).length;
console.log('Brace balance: { ' + openBraces + ' } ' + closeBraces + ' diff=' + (openBraces - closeBraces));
const openScript = (src.match(/<script/gi) || []).length;
const closeScript = (src.match(/<\/script>/gi) || []).length;
console.log('Script tags: open=' + openScript + ' close=' + closeScript);
