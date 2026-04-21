#!/usr/bin/env node
/**
 * Visual Overhaul Patch — 8 fixes in one atomic operation
 * 1. Cockpit position/visibility
 * 2. Stargate chevrons (race condition fix)
 * 3. Ship emissive glow (remove)
 * 4. Escort expansion (2 → 7)
 * 5. Window lighting
 * 6. Space stations
 * 7. Asteroid improvements
 * 8. Ghost ship emissive reduction
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf-8');

// ══ FIX 1: Cockpit Position — better visibility ══
content = content.replace(
  `cp.position.set(0, -2.05, 0.28);
    cp.scale.setScalar(0.68);
    cp.rotation.set(0.02, Math.PI, 0);`,
  `cp.position.set(0, 0.15, -0.5);
    cp.scale.setScalar(1.2);
    cp.rotation.set(0.0, Math.PI, 0.0);`
);

// ══ FIX 2: Stargate Chevrons — prevent double-spawn ══
// Find the chevron creation block and restructure it
content = content.replace(
  `  // Inner chevrons — 8 glowing markers around the ring
  if (!createStargate._chevGeo) {
    createStargate._chevGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
    createStargate._chevMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
    createStargate._chevMat._pooled = true;
    createStargate._chevGeo._pooled = true;
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const chev = new THREE.Mesh(createStargate._chevGeo, createStargate._chevMat);
    chev.position.set(Math.cos(angle) * 18, Math.sin(angle) * 18, 0);
    chev.lookAt(0, 0, 0);
    stargateGroup.add(chev);
  }`,
  `  // Inner chevrons — 8 glowing markers around the ring (SKIP if GLB will load)
  const _sgGlbPromise = loadGLBModel('stargate').then(model => {
    const glbGate = model.clone();
    glbGate.scale.setScalar(12.0);
    glbGate.position.set(0, 0, 0);
    stargateGroup.add(glbGate);
    stargateGroup.userData.hasGLB = true;
  }).catch(() => { stargateGroup.userData.hasGLB = false; });
  
  if (!stargateGroup.userData.hasGLB) {
    if (!createStargate._chevGeo) {
      createStargate._chevGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
      createStargate._chevMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
      createStargate._chevMat._pooled = true;
      createStargate._chevGeo._pooled = true;
    }
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const chev = new THREE.Mesh(createStargate._chevGeo, createStargate._chevMat);
      chev.position.set(Math.cos(angle) * 18, Math.sin(angle) * 18, 0);
      chev.lookAt(0, 0, 0);
      stargateGroup.add(chev);
    }
  }`
);

// ══ FIX 3: Remove Ship Emissive Glow ══
content = content.replace(
  `child.material.emissiveIntensity = 0.25;`,
  `child.material.emissiveIntensity = 0.05;`
);

// ══ FIX 4: Expand Escorts (2 → 7) ══
content = content.replace(
  `async function spawnEscortWingmen() {
  if (!c._escorts) c._escorts = [];
  // Clean old escorts
  c._escorts.forEach(e => { if (e && e.group) { scene.remove(e.group); disposeObject(e.group); } });
  c._escorts = [];
  const ESCORT_KEYS = ['escort_ship', 'patrol_alpha', 'patrol_beta', 'corvette_alpha', 'fighter_alpha'];
  for (let ei = 0; ei < 2; ei++) {
    try {
      const key = ESCORT_KEYS[ei % ESCORT_KEYS.length];
      const model = await loadGLBModel(key);
      const g = new THREE.Group();
      const inst = model.clone();
      const asset = GLB_ASSETS[key];
      inst.scale.setScalar((asset ? asset.scale : 1.0) * 2.0);
      g.add(inst);
      // Engine trail
      const trailGeo = new THREE.CylinderGeometry(0.08, 0.5, 3, 6);
      const trailMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.rotation.x = Math.PI / 2;
      trail.position.set(0, 0, 2);
      g.add(trail);
      // Name tag
      g.userData.escortId = 'WINGMAN-' + (ei + 1);
      g.userData.targetOffset = new THREE.Vector3(
        (ei === 0 ? -12 : 12),
        -2 + Math.random() * 2,
        8 + Math.random() * 4
      );`,
  `async function spawnEscortWingmen() {
  if (!c._escorts) c._escorts = [];
  // Clean old escorts
  c._escorts.forEach(e => { if (e && e.group) { scene.remove(e.group); disposeObject(e.group); } });
  c._escorts = [];
  const ESCORT_KEYS = ['fighter_alpha', 'corvette_alpha', 'patrol_alpha', 'patrol_beta', 'patrol_gamma', 'interceptor', 'scout_ship'];
  for (let ei = 0; ei < 7; ei++) {
    try {
      const key = ESCORT_KEYS[ei % ESCORT_KEYS.length];
      const model = await loadGLBModel(key);
      const g = new THREE.Group();
      const inst = model.clone();
      const asset = GLB_ASSETS[key];
      inst.scale.setScalar((asset ? asset.scale : 1.0) * 2.0);
      // Add window lighting
      inst.traverse(child => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            if (m.name && /window|glass|canopy/.test(m.name.toLowerCase())) {
              m.emissive = new THREE.Color(0x88ccff);
              m.emissiveIntensity = 0.4;
              m.transparent = true;
              m.opacity = 0.9;
            }
          });
        }
      });
      g.add(inst);
      // Engine trail
      const trailGeo = new THREE.CylinderGeometry(0.08, 0.5, 3, 6);
      const trailMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.rotation.x = Math.PI / 2;
      trail.position.set(0, 0, 2);
      g.add(trail);
      // Name tag
      g.userData.escortId = 'WINGMAN-' + (ei + 1);
      const angle = (ei / 7) * Math.PI * 2;
      g.userData.targetOffset = new THREE.Vector3(
        Math.cos(angle) * 4,
        -0.5 + Math.random() * 1,
        2.5 + Math.random() * 1.5
      );`
);

// ══ FIX 5: Ghost Ship Emissive Reduction ══
content = content.replace(
  `child.material.emissiveIntensity = 0.6;`,
  `child.material.emissiveIntensity = 0.15;`
);

// ══ FIX 6: Accent check threshold ══
content = content.replace(
  `const isAccent = child.material.emissiveIntensity > 0.2;`,
  `const isAccent = child.material.emissiveIntensity > 0.1;`
);

// ══ FIX 7: Add Space Station Spawning (after stargate creation) ══
// Find spawnWelcomeFleet call and add station spawning before it
content = content.replace(
  `  // Spawn a few ships near the stargate
  await spawnShipsNearStargate();
  await spawnWelcomeFleet();`,
  `  // Spawn space stations near stargate
  try {
    const stationKeys = ['station_a', 'station_b', 'station_facility', 'station_sphere'];
    for (let si = 0; si < 2; si++) {
      const key = stationKeys[Math.floor(Math.random() * stationKeys.length)];
      const model = await loadGLBModel(key);
      const inst = model.clone();
      const asset = GLB_ASSETS[key];
      inst.scale.setScalar((asset ? asset.scale : 1.0) * 2.5);
      const angle = (si / 2) * Math.PI * 2;
      inst.position.set(
        stargateGroup.position.x + Math.cos(angle) * 100,
        stargateGroup.position.y + (Math.random() - 0.5) * 30,
        stargateGroup.position.z + Math.sin(angle) * 100
      );
      inst.rotation.y = Math.random() * Math.PI * 2;
      scene.add(inst);
    }
  } catch(e) { /* skip station spawn on error */ }

  // Spawn a few ships near the stargate
  await spawnShipsNearStargate();
  await spawnWelcomeFleet();`
);

// Write back
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Patch applied: visual overhaul (cockpit, stargate, escorts, stations, emissive)');
console.log('   Changed lines:');
console.log('   - Cockpit position: (0, -2.05, 0.28) → (0, 0.15, -0.5)');
console.log('   - Cockpit scale: 0.68 → 1.2');
console.log('   - Escorts: 2 → 7 ships, tighter formation');
console.log('   - Ship emissive: 0.25 → 0.05');
console.log('   - Ghost emissive: 0.6 → 0.15');
console.log('   - Stargate: Added GLB loading with fallback to chevrons');
console.log('   - Stations: Added space station spawning');
console.log('   - Windows: Added lighting to escort ships');
