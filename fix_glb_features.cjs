/**
 * fix_glb_features.cjs — Old Eden GLB Asset Integration
 * 
 * 1. Register all 49 newly optimized GLB models in GLB_ASSETS
 * 2. Fix railgun size (too small → scale up significantly)
 * 3. Swap cockpit to new "cockpit_new.glb" model
 * 4. Replace spawnShipLibrary with sequential parade system
 * 5. Add space police patrol system
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
const origSrc = src;
const lines = src.split('\n');

// ── CRLF helper ──
const hasCR = lines[0].endsWith('\r');
function cr(s) { return hasCR ? s.replace(/\r?\n/g, '\r\n') : s; }

// ── Balance check helper ──
function countBalance(text) {
  let braces = 0, parens = 0, brackets = 0;
  const noStr = text.replace(/`[^`]*`|'[^']*'|"[^"]*"/g, '');
  for (const ch of noStr) {
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '(') parens++;
    if (ch === ')') parens--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }
  return { braces, parens, brackets };
}

// ── Line-based editing ──
function findLine(content, searchStr, startFrom = 0) {
  const ls = content.split('\n');
  for (let i = startFrom; i < ls.length; i++) {
    if (ls[i].includes(searchStr)) return i;
  }
  return -1;
}

function replaceLine(content, lineIdx, newContent) {
  const ls = content.split('\n');
  ls[lineIdx] = cr(newContent);
  return ls.join('\n');
}

function insertAfterLine(content, lineIdx, newLines) {
  const ls = content.split('\n');
  const insert = newLines.map(l => cr(l));
  ls.splice(lineIdx + 1, 0, ...insert);
  return ls.join('\n');
}

function replaceLines(content, startIdx, endIdx, newLines) {
  const ls = content.split('\n');
  const insert = newLines.map(l => cr(l));
  ls.splice(startIdx, endIdx - startIdx + 1, ...insert);
  return ls.join('\n');
}

let changes = 0;

// ═══════════════════════════════════════════════════
//  FIX 1: Expand GLB_ASSETS with all new models
// ═══════════════════════════════════════════════════
console.log('\n⚙ Fix 1: Register all new GLB assets...');
const glbAssetsLine = findLine(src, 'const GLB_ASSETS = {');
if (glbAssetsLine >= 0) {
  // Find the closing }; of GLB_ASSETS
  let closeLine = glbAssetsLine + 1;
  const ls = src.split('\n');
  let depth = 1;
  while (closeLine < ls.length && depth > 0) {
    const line = ls[closeLine].replace(/\/\/.*/g, '');
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth > 0) closeLine++;
  }
  
  // Build the complete new GLB_ASSETS block
  const newGlbAssets = [
    'const GLB_ASSETS = {',
    '  // ── Original models ──',
    "  cyborg_ship:       { path: '/3d/glb/optimized/cyborg_ship.glb',       role: 'npc',     scale: 0.5 },",
    "  station_a:         { path: '/3d/glb/optimized/station_a.glb',         role: 'station', scale: 1.0 },",
    "  station_b:         { path: '/3d/glb/optimized/station_b.glb',         role: 'station', scale: 1.0 },",
    "  freighter:         { path: '/3d/glb/optimized/freighter.glb',         role: 'npc',     scale: 0.8 },",
    "  iron_sentinel:     { path: '/3d/glb/optimized/iron_sentinel.glb',     role: 'enemy',   scale: 0.8 },",
    "  evac_pod_a:        { path: '/3d/glb/optimized/evac_pod_a.glb',        role: 'npc',     scale: 0.6 },",
    "  evac_pod_b:        { path: '/3d/glb/optimized/evac_pod_b.glb',        role: 'npc',     scale: 0.6 },",
    "  railgun_turret:    { path: '/3d/glb/optimized/railgun_turret.glb',    role: 'weapon',  scale: 0.3 },",
    "  railgun_ship:      { path: '/3d/glb/optimized/railgun_ship.glb',      role: 'weapon',  scale: 0.6 },",
    "  titan_a:           { path: '/3d/glb/optimized/titan_a.glb',           role: 'boss',    scale: 1.2 },",
    "  titan_b:           { path: '/3d/glb/optimized/titan_b.glb',           role: 'boss',    scale: 1.2 },",
    "  demon_battleship:  { path: '/3d/glb/optimized/demon_battleship.glb',  role: 'boss',    scale: 1.0 },",
    "  alien_battleship:  { path: '/3d/glb/optimized/alien_battleship.glb',  role: 'enemy',   scale: 0.9 },",
    "  cargo_shuttle:     { path: '/3d/glb/optimized/cargo_shuttle.glb',     role: 'npc',     scale: 0.7 },",
    "  shuttle:           { path: '/3d/glb/optimized/shuttle.glb',           role: 'npc',     scale: 0.6 },",
    "  fighter_alpha:     { path: '/3d/glb/optimized/fighter_alpha.glb',     role: 'enemy',   scale: 0.5 },",
    "  fighter_beta:      { path: '/3d/glb/optimized/fighter_beta.glb',      role: 'enemy',   scale: 0.5 },",
    "  blaster_turret:    { path: '/3d/glb/optimized/blaster_turret.glb',    role: 'weapon',  scale: 0.3 },",
    "  railgun_barrel:    { path: '/3d/glb/optimized/railgun_barrel.glb',    role: 'weapon',  scale: 0.8 },",
    "  cockpit_shuttle:   { path: '/3d/glb/optimized/cockpit_shuttle.glb',   role: 'cockpit', scale: 1.0 },",
    '  // ── Patrol / Police ships ──',
    "  patrol_alpha:      { path: '/3d/glb/optimized/patrol_alpha.glb',      role: 'police',  scale: 0.6 },",
    "  patrol_beta:       { path: '/3d/glb/optimized/patrol_beta.glb',       role: 'police',  scale: 0.6 },",
    "  patrol_gamma:      { path: '/3d/glb/optimized/patrol_gamma.glb',      role: 'police',  scale: 0.6 },",
    '  // ── New ships (parade + police + enemies) ──',
    "  cruiser_alpha:     { path: '/3d/glb/optimized/cruiser_alpha.glb',     role: 'enemy',   scale: 0.7 },",
    "  cargo_cruiser:     { path: '/3d/glb/optimized/cargo_cruiser.glb',     role: 'npc',     scale: 0.7 },",
    "  escort_ship:       { path: '/3d/glb/optimized/escort_ship.glb',       role: 'npc',     scale: 0.6 },",
    "  interceptor:       { path: '/3d/glb/optimized/interceptor.glb',       role: 'enemy',   scale: 0.5 },",
    "  scout_ship:        { path: '/3d/glb/optimized/scout_ship.glb',        role: 'enemy',   scale: 0.5 },",
    "  cargo_small:       { path: '/3d/glb/optimized/cargo_small.glb',       role: 'npc',     scale: 0.5 },",
    "  shuttle_b:         { path: '/3d/glb/optimized/shuttle_b.glb',         role: 'npc',     scale: 0.6 },",
    "  home_module:       { path: '/3d/glb/optimized/home_module.glb',       role: 'npc',     scale: 0.8 },",
    "  frigate_alpha:     { path: '/3d/glb/optimized/frigate_alpha.glb',     role: 'enemy',   scale: 0.7 },",
    "  corvette_alpha:    { path: '/3d/glb/optimized/corvette_alpha.glb',    role: 'enemy',   scale: 0.7 },",
    "  destroyer_alpha:   { path: '/3d/glb/optimized/destroyer_alpha.glb',   role: 'enemy',   scale: 0.8 },",
    "  cruiser_beta:      { path: '/3d/glb/optimized/cruiser_beta.glb',      role: 'enemy',   scale: 0.7 },",
    "  gunship_alpha:     { path: '/3d/glb/optimized/gunship_alpha.glb',     role: 'enemy',   scale: 0.7 },",
    "  red_fighter:       { path: '/3d/glb/optimized/red_fighter.glb',       role: 'enemy',   scale: 0.6 },",
    "  red_cruiser:       { path: '/3d/glb/optimized/red_cruiser.glb',       role: 'enemy',   scale: 0.7 },",
    "  container_shuttle: { path: '/3d/glb/optimized/container_shuttle.glb', role: 'npc',     scale: 0.7 },",
    "  red_battleship:    { path: '/3d/glb/optimized/red_battleship.glb',    role: 'boss',    scale: 1.0 },",
    "  demon_cruiser:     { path: '/3d/glb/optimized/demon_cruiser.glb',     role: 'boss',    scale: 1.0 },",
    '  // ── Cockpit (new) ──',
    "  cockpit_new:       { path: '/3d/glb/optimized/cockpit_new.glb',       role: 'cockpit', scale: 1.0 },",
    "  dashboard_red:     { path: '/3d/glb/optimized/dashboard_red.glb',     role: 'cockpit', scale: 0.8 },",
    "  dashboard_basic:   { path: '/3d/glb/optimized/dashboard_basic.glb',   role: 'cockpit', scale: 0.6 },",
    '  // ── Railguns (bigger) ──',
    "  railgun_large:     { path: '/3d/glb/optimized/railgun_large.glb',     role: 'weapon',  scale: 1.5 },",
    "  railgun_med:       { path: '/3d/glb/optimized/railgun_med.glb',       role: 'weapon',  scale: 1.0 },",
    "  railgun_ship_b:    { path: '/3d/glb/optimized/railgun_ship_b.glb',    role: 'weapon',  scale: 0.8 },",
    "  railgun_barrel_b:  { path: '/3d/glb/optimized/railgun_barrel_b.glb',  role: 'weapon',  scale: 1.0 },",
    "  railgun_massive:   { path: '/3d/glb/optimized/railgun_massive.glb',   role: 'weapon',  scale: 1.5 },",
    '  // ── Stations ──',
    "  station_massive:   { path: '/3d/glb/optimized/station_massive.glb',   role: 'station', scale: 2.0 },",
    "  station_sphere:    { path: '/3d/glb/optimized/station_sphere.glb',    role: 'station', scale: 1.5 },",
    "  station_light:     { path: '/3d/glb/optimized/station_light.glb',     role: 'station', scale: 1.5 },",
    "  station_facility:  { path: '/3d/glb/optimized/station_facility.glb',  role: 'station', scale: 1.5 },",
    "  station_zorgus:    { path: '/3d/glb/optimized/station_zorgus.glb',    role: 'station', scale: 1.5 },",
    '  // ── Planets ──',
    "  planet_earth:      { path: '/3d/glb/optimized/planet_earth.glb',      role: 'planet',  scale: 50.0 },",
    "  planet_earthlike:  { path: '/3d/glb/optimized/planet_earthlike.glb',  role: 'planet',  scale: 50.0 },",
    "  planet_purple:     { path: '/3d/glb/optimized/planet_purple.glb',     role: 'planet',  scale: 40.0 },",
    "  planet_green:      { path: '/3d/glb/optimized/planet_green.glb',      role: 'planet',  scale: 40.0 },",
    "  planet_yellow:     { path: '/3d/glb/optimized/planet_yellow.glb',     role: 'planet',  scale: 30.0 },",
    "  planet_moon:       { path: '/3d/glb/optimized/planet_moon.glb',       role: 'planet',  scale: 20.0 },",
    '  // ── Characters / misc ──',
    "  space_body:        { path: '/3d/glb/optimized/space_body.glb',        role: 'prop',    scale: 0.5 },",
    "  space_suit:        { path: '/3d/glb/optimized/space_suit.glb',        role: 'prop',    scale: 0.5 },",
    "  stargate:          { path: '/3d/glb/optimized/stargate.glb',          role: 'prop',    scale: 2.0 },",
    "  dyson_sphere:      { path: '/3d/glb/optimized/dyson_sphere.glb',      role: 'prop',    scale: 5.0 },",
    '  // ── Weapons ──',
    "  gun_futuristic:    { path: '/3d/glb/optimized/gun_futuristic.glb',    role: 'weapon',  scale: 0.5 },",
    "  blaster_white:     { path: '/3d/glb/optimized/blaster_white.glb',     role: 'weapon',  scale: 0.5 },",
    "  pistol_chrome:     { path: '/3d/glb/optimized/pistol_chrome.glb',     role: 'weapon',  scale: 0.5 },",
    '  // ── Creatures ──',
    "  alien_insect:      { path: '/3d/glb/optimized/alien_insect.glb',      role: 'creature', scale: 0.8 },",
    "  space_insect:      { path: '/3d/glb/optimized/space_insect.glb',      role: 'creature', scale: 0.6 },",
    '};',
  ];
  
  src = replaceLines(src, glbAssetsLine, closeLine, newGlbAssets);
  changes++;
  console.log('   ✅ GLB_ASSETS expanded: 69 models registered');
} else {
  console.log('   ❌ GLB_ASSETS not found');
}


// ═══════════════════════════════════════════════════
//  FIX 2: Scale up railgun barrels (were 0.03 radius — too thin!)
// ═══════════════════════════════════════════════════
console.log('\n⚙ Fix 2: Scale up railgun barrels...');

// Fix procedural railgun barrels in cockpit
let railLLine = findLine(src, "railL = new THREE.Mesh(new THREE.CylinderGeometry(0.03");
if (railLLine >= 0) {
  src = replaceLine(src, railLLine, "railL = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,5,8), railMat);");
  changes++;
}
let railRLine = findLine(src, "railR = new THREE.Mesh(new THREE.CylinderGeometry(0.03");
if (railRLine >= 0) {
  src = replaceLine(src, railRLine, "railR = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,5,8), railMat);");
  changes++;
}

// Scale up railgun glow cylinders too
let rgLLine = findLine(src, "const rgL = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,4");
if (rgLLine >= 0) {
  src = replaceLine(src, rgLLine, "{ const rgL = new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.10,5,8), railGlowMatL); rgL.rotation.set(Math.PI/2,0,0); rgL.position.set(-0.18,-0.3,-2.0); cockpit.add(rgL); }");
  changes++;
}
let rgRLine = findLine(src, "const rgR = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,4");
if (rgRLine >= 0) {
  src = replaceLine(src, rgRLine, "{ const rgR = new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.10,5,8), railGlowMatR); rgR.rotation.set(Math.PI/2,0,0); rgR.position.set(0.18,-0.3,-2.0); cockpit.add(rgR); }");
  changes++;
}

// Scale up the muzzle flash sphere
let muzzleLine = findLine(src, "const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.15");
if (muzzleLine >= 0) {
  src = replaceLine(src, muzzleLine, "const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.3,12,12), muzzleMat);");
  changes++;
}

// Use railgun_large.glb instead of railgun_barrel — BIGGER railgun
let loadRailgunLine = findLine(src, "const model = await loadGLBModel('railgun_barrel');");
if (loadRailgunLine >= 0) {
  src = replaceLine(src, loadRailgunLine, "    const model = await loadGLBModel('railgun_large');");
  changes++;
}
// Scale up the railgun GLB model – was 1.4, now 3.0 for proper size
let railScaleLine = findLine(src, "gun.scale.setScalar(1.4);");
if (railScaleLine >= 0) {
  src = replaceLine(src, railScaleLine, "    gun.scale.setScalar(3.5);");
  changes++;
}
// Position the bigger railgun model further forward
let railPosLine = findLine(src, "gun.position.set(0, -0.35, -3.0);");
if (railPosLine >= 0) {
  src = replaceLine(src, railPosLine, "    gun.position.set(0, -0.5, -4.0);");
  changes++;
}
console.log('   ✅ Railgun scaled up: barrels 0.08r, glow 0.10r, GLB 3.5x, muzzle 0.3r');


// ═══════════════════════════════════════════════════
//  FIX 3: Use new cockpit model (cockpit_new.glb)
// ═══════════════════════════════════════════════════
console.log('\n⚙ Fix 3: Swap to new cockpit model...');
let cockpitLoadLine = findLine(src, "const model = await loadGLBModel('cockpit_shuttle');");
if (cockpitLoadLine >= 0) {
  src = replaceLine(src, cockpitLoadLine, "    const model = await loadGLBModel('cockpit_new');");
  changes++;
  console.log('   ✅ Cockpit model changed to cockpit_new.glb');
} else {
  console.log('   ❌ cockpit_shuttle load line not found');
}


// ═══════════════════════════════════════════════════
//  FIX 4: Replace spawnShipLibrary with ship parade system
//         Load one ship → circle around player → fly away → unload → next
// ═══════════════════════════════════════════════════
console.log('\n⚙ Fix 4: Build sequential ship parade system...');

// Find the spawnShipLibrary section and replace it entirely
const libraryStart = findLine(src, '// ================================================================');
let shipLibSectionStart = -1;
let shipLibSectionEnd = -1;

// Find the SHIP LIBRARY comment block
{
  const ls = src.split('\n');
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].includes('SHIP LIBRARY') && ls[i].includes('Lineup display')) {
      shipLibSectionStart = i - 1; // include the === line above
      break;
    }
  }
  // Find the end — should be after updateLibraryRotation function
  if (shipLibSectionStart >= 0) {
    const endMarker = findLine(src, 'function updateLibraryRotation', shipLibSectionStart);
    if (endMarker >= 0) {
      // Find closing brace of updateLibraryRotation
      let braceDepth = 0;
      let foundOpen = false;
      for (let i = endMarker; i < ls.length; i++) {
        for (const ch of ls[i]) {
          if (ch === '{') { braceDepth++; foundOpen = true; }
          if (ch === '}') braceDepth--;
        }
        if (foundOpen && braceDepth === 0) {
          shipLibSectionEnd = i;
          break;
        }
      }
    }
  }
}

if (shipLibSectionStart >= 0 && shipLibSectionEnd >= 0) {
  const paradeSystem = [
    '// ================================================================',
    '//  SHIP PARADE — Sequential showcase (load → circle → fly away → unload)',
    '// ================================================================',
    'let paradeShip = null;       // currently displayed ship',
    'let paradeIndex = 0;         // current index in parade queue',
    'let paradePhase = "idle";    // idle | loading | circling | flyaway | cooldown',
    'let paradeTimer = 0;         // phase timer in ms',
    'let paradeAngle = 0;         // current orbit angle',
    'let paradeLabels = [];       // HUD label data',
    'const PARADE_ORBIT_DIST = 35;  // distance from player ship',
    'const PARADE_ORBIT_SPEED = 0.6; // radians per second',
    'const PARADE_CIRCLE_TIME = 8000; // ms to orbit',
    'const PARADE_FLYAWAY_SPEED = 80; // units/sec',
    'const PARADE_COOLDOWN = 1500;    // ms between ships',
    '',
    '// All ships to parade — load one at a time to keep scene light',
    'const PARADE_SHIPS = [',
    "  'iron_sentinel', 'fighter_alpha', 'fighter_beta', 'alien_battleship',",
    "  'patrol_alpha', 'patrol_beta', 'patrol_gamma',",
    "  'cruiser_alpha', 'cargo_cruiser', 'escort_ship',",
    "  'frigate_alpha', 'corvette_alpha', 'destroyer_alpha',",
    "  'cruiser_beta', 'gunship_alpha', 'red_fighter', 'red_cruiser',",
    "  'container_shuttle', 'shuttle_b', 'home_module',",
    "  'titan_a', 'titan_b', 'demon_battleship', 'red_battleship', 'demon_cruiser',",
    "  'cargo_shuttle', 'shuttle', 'freighter',",
    "  'interceptor', 'scout_ship', 'cargo_small',",
    '];',
    '',
    'async function spawnShipLibrary() {',
    '  // Start the parade from beginning',
    '  paradeIndex = 0;',
    '  paradePhase = "loading";',
    '  paradeTimer = 0;',
    '  paradeAngle = 0;',
    '  addComms("System", `Ship parade starting: ${PARADE_SHIPS.length} ships in queue.`);',
    '  await _loadNextParadeShip();',
    '}',
    '',
    'async function _loadNextParadeShip() {',
    '  // Unload previous ship and free GPU memory',
    '  if (paradeShip) {',
    '    scene.remove(paradeShip);',
    '    disposeObject(paradeShip);',
    '    paradeShip = null;',
    '  }',
    '  paradeLabels = [];',
    '',
    '  if (paradeIndex >= PARADE_SHIPS.length) {',
    '    paradePhase = "idle";',
    '    paradeIndex = 0; // loop back for next time',
    '    addComms("System", "Ship parade complete — all models showcased.");',
    '    return;',
    '  }',
    '',
    '  const key = PARADE_SHIPS[paradeIndex];',
    '  try {',
    '    const model = await loadGLBModel(key);',
    '    paradeShip = model.clone();',
    '    const asset = GLB_ASSETS[key];',
    '    const displayScale = (asset ? asset.scale : 0.6) * 2.5; // bigger for showcase',
    '    paradeShip.scale.setScalar(displayScale);',
    '    // Position at orbit distance, same Y as player',
    '    paradeAngle = 0;',
    '    const px = ship.position.x + Math.cos(paradeAngle) * PARADE_ORBIT_DIST;',
    '    const pz = ship.position.z + Math.sin(paradeAngle) * PARADE_ORBIT_DIST;',
    '    paradeShip.position.set(px, ship.position.y, pz);',
    '    paradeShip.lookAt(ship.position);',
    '    scene.add(paradeShip);',
    '    paradePhase = "circling";',
    '    paradeTimer = 0;',
    '    paradeLabels = [{',
    '      obj: paradeShip,',
    '      name: key.replace(/_/g, " ").toUpperCase(),',
    '      role: asset ? asset.role : "ship",',
    '      index: paradeIndex + 1,',
    '      total: PARADE_SHIPS.length,',
    '    }];',
    '    addComms("Fleet Review", `[${paradeIndex+1}/${PARADE_SHIPS.length}] ${key.replace(/_/g," ").toUpperCase()} — ${asset ? asset.role : "ship"}`);',
    '  } catch(e) {',
    '    console.warn("[Parade] Failed to load", key, e);',
    '    paradeIndex++;',
    '    await _loadNextParadeShip();',
    '  }',
    '}',
    '',
    'function updateShipParade(dt, dtMs) {',
    '  if (paradePhase === "idle" || !paradeShip) return;',
    '',
    '  if (paradePhase === "circling") {',
    '    paradeTimer += dtMs;',
    '    paradeAngle += PARADE_ORBIT_SPEED * dt;',
    '    // Orbit around player ship',
    '    const px = ship.position.x + Math.cos(paradeAngle) * PARADE_ORBIT_DIST;',
    '    const pz = ship.position.z + Math.sin(paradeAngle) * PARADE_ORBIT_DIST;',
    '    paradeShip.position.set(px, ship.position.y + Math.sin(paradeAngle * 2) * 3, pz);',
    '    // Face direction of travel (tangent to orbit)',
    '    const nextAngle = paradeAngle + 0.1;',
    '    const nx = ship.position.x + Math.cos(nextAngle) * PARADE_ORBIT_DIST;',
    '    const nz = ship.position.z + Math.sin(nextAngle) * PARADE_ORBIT_DIST;',
    '    paradeShip.lookAt(nx, paradeShip.position.y, nz);',
    '    // Slow rotation for showcase effect',
    '    paradeShip.rotateY(0.3 * dt);',
    '',
    '    if (paradeTimer >= PARADE_CIRCLE_TIME) {',
    '      paradePhase = "flyaway";',
    '      paradeTimer = 0;',
    '      // Set flyaway direction — away from player',
    '      const dir = paradeShip.position.clone().sub(ship.position).normalize();',
    '      paradeShip.userData.flyDir = dir;',
    '    }',
    '  }',
    '',
    '  if (paradePhase === "flyaway") {',
    '    paradeTimer += dtMs;',
    '    const dir = paradeShip.userData.flyDir;',
    '    paradeShip.position.addScaledVector(dir, PARADE_FLYAWAY_SPEED * dt);',
    '    // Scale down as it flies away for effect',
    '    const fade = Math.max(0.1, 1 - paradeTimer / 3000);',
    '    paradeShip.scale.multiplyScalar(0.997);',
    '',
    '    if (paradeTimer >= 3000) {',
    '      // Unload this ship',
    '      scene.remove(paradeShip);',
    '      disposeObject(paradeShip);',
    '      paradeShip = null;',
    '      paradeLabels = [];',
    '      paradePhase = "cooldown";',
    '      paradeTimer = 0;',
    '    }',
    '  }',
    '',
    '  if (paradePhase === "cooldown") {',
    '    paradeTimer += dtMs;',
    '    if (paradeTimer >= PARADE_COOLDOWN) {',
    '      paradeIndex++;',
    '      _loadNextParadeShip();',
    '    }',
    '  }',
    '}',
    '',
    '// Render parade labels on HUD',
    'function renderLibraryLabels() {',
    '  if (!c.active || paradeLabels.length === 0) return;',
    '  const W = hudCanvas.width, H = hudCanvas.height;',
    '  for (const lbl of paradeLabels) {',
    '    if (!lbl.obj || !lbl.obj.parent) continue;',
    '    const pos = lbl.obj.position.clone();',
    '    pos.y += 10;',
    '    pos.project(camera);',
    '    if (pos.z > 1) continue;',
    '    const sx = (pos.x * 0.5 + 0.5) * W;',
    '    const sy = (-pos.y * 0.5 + 0.5) * H;',
    '    if (sx < 0 || sx > W || sy < 0 || sy > H) continue;',
    '    // Label background',
    '    hudCtx.fillStyle = "#0d1117dd";',
    '    hudCtx.fillRect(sx - 70, sy - 22, 140, 48);',
    '    hudCtx.strokeStyle = "#d4a85666";',
    '    hudCtx.strokeRect(sx - 70, sy - 22, 140, 48);',
    '    // Ship number',
    '    hudCtx.font = "bold 12px \\"Segoe UI\\"";',
    '    hudCtx.fillStyle = "#ffcc00";',
    '    hudCtx.textAlign = "center";',
    '    hudCtx.fillText(`[${lbl.index}/${lbl.total}]`, sx, sy - 6);',
    '    // Ship name',
    '    hudCtx.font = "bold 10px \\"Segoe UI\\"";',
    '    hudCtx.fillStyle = "#44aaff";',
    '    hudCtx.fillText(lbl.name, sx, sy + 8);',
    '    // Role tag',
    '    hudCtx.font = "9px \\"Segoe UI\\"";',
    '    hudCtx.fillStyle = "#88aa66";',
    '    hudCtx.fillText(lbl.role.toUpperCase(), sx, sy + 20);',
    '  }',
    '  hudCtx.textAlign = "left";',
    '}',
    '',
    '// Compatibility stub',
    'function updateLibraryRotation(dt) {',
    '  // Now handled by updateShipParade',
    '}',
  ];
  
  src = replaceLines(src, shipLibSectionStart, shipLibSectionEnd, paradeSystem);
  changes++;
  console.log('   ✅ Ship parade system built (load → circle → fly away → unload → next)');
} else {
  console.log('   ❌ Ship library section not found (start:', shipLibSectionStart, 'end:', shipLibSectionEnd, ')');
}


// ═══════════════════════════════════════════════════
//  FIX 5: Add space police patrol system
// ═══════════════════════════════════════════════════
console.log('\n⚙ Fix 5: Add space police patrol system...');

// Insert police patrol system after the parade system
const policeInsertLine = findLine(src, 'function updateLibraryRotation(dt)');
if (policeInsertLine >= 0) {
  // Find end of that function
  const ls = src.split('\n');
  let policeEnd = policeInsertLine;
  let depth = 0;
  let foundOpen = false;
  for (let i = policeInsertLine; i < ls.length; i++) {
    for (const ch of ls[i]) {
      if (ch === '{') { depth++; foundOpen = true; }
      if (ch === '}') depth--;
    }
    if (foundOpen && depth === 0) { policeEnd = i; break; }
  }

  const policeSystem = [
    '',
    '// ================================================================',
    '//  SPACE POLICE PATROL — AI-controlled patrol ships',
    '// ================================================================',
    'const policeShips = [];        // active police ship objects',
    'const MAX_POLICE = 3;          // max simultaneous patrol ships',
    'const POLICE_MODELS = ["patrol_alpha", "patrol_beta", "patrol_gamma"];',
    'let _policeSpawnTimer = 0;',
    'const POLICE_SPAWN_INTERVAL = 15000; // ms between spawns',
    'const POLICE_PATROL_RADIUS = 200;    // patrol orbit radius',
    'const POLICE_SPEED = 25;             // units/sec',
    'const POLICE_LIFETIME = 45000;       // ms before despawn',
    '',
    'async function spawnPolicePatrol() {',
    '  if (policeShips.length >= MAX_POLICE) return;',
    '  const modelKey = POLICE_MODELS[Math.floor(Math.random() * POLICE_MODELS.length)];',
    '  try {',
    '    const model = await loadGLBModel(modelKey);',
    '    const patrol = model.clone();',
    '    const asset = GLB_ASSETS[modelKey];',
    '    patrol.scale.setScalar((asset ? asset.scale : 0.6) * 2.0);',
    '    // Spawn at random angle around player, far out',
    '    const spawnAngle = Math.random() * Math.PI * 2;',
    '    const spawnDist = POLICE_PATROL_RADIUS + Math.random() * 50;',
    '    patrol.position.set(',
    '      ship.position.x + Math.cos(spawnAngle) * spawnDist,',
    '      ship.position.y + (Math.random() - 0.5) * 30,',
    '      ship.position.z + Math.sin(spawnAngle) * spawnDist',
    '    );',
    '    // Police identity',
    '    patrol.userData.isPolice = true;',
    '    patrol.userData.orbitAngle = spawnAngle;',
    '    patrol.userData.orbitSpeed = 0.15 + Math.random() * 0.1;',
    '    patrol.userData.orbitRadius = POLICE_PATROL_RADIUS + (Math.random() - 0.5) * 40;',
    '    patrol.userData.orbitY = ship.position.y + (Math.random() - 0.5) * 20;',
    '    patrol.userData.age = 0;',
    '    patrol.userData.patrolId = "EDEN-" + Math.floor(Math.random() * 999).toString().padStart(3, "0");',
    '    // Blue police lights (point light)',
    '    const policeLight = new THREE.PointLight(0x4488ff, 3, 30);',
    '    policeLight.position.set(0, 1, 0);',
    '    patrol.add(policeLight);',
    '    patrol.userData.policeLight = policeLight;',
    '    patrol.userData.lightTimer = 0;',
    '    // Engine glow (blue for police)',
    '    const engGlow = new THREE.PointLight(0x44aaff, 1.5, 15);',
    '    engGlow.position.set(0, 0, 2);',
    '    patrol.add(engGlow);',
    '    scene.add(patrol);',
    '    policeShips.push(patrol);',
    '    addComms("EDEN Police", `Patrol ${patrol.userData.patrolId} — sector sweep in progress.`);',
    '  } catch(e) {',
    '    console.warn("[Police] Failed to spawn patrol:", e);',
    '  }',
    '}',
    '',
    'function updatePolicePatrol(dt, dtMs) {',
    '  _policeSpawnTimer += dtMs;',
    '  if (_policeSpawnTimer >= POLICE_SPAWN_INTERVAL && policeShips.length < MAX_POLICE) {',
    '    _policeSpawnTimer = 0;',
    '    spawnPolicePatrol();',
    '  }',
    '',
    '  for (let i = policeShips.length - 1; i >= 0; i--) {',
    '    const p = policeShips[i];',
    '    p.userData.age += dtMs;',
    '',
    '    // Orbit around the system center (near player)',
    '    p.userData.orbitAngle += p.userData.orbitSpeed * dt;',
    '    const a = p.userData.orbitAngle;',
    '    const r = p.userData.orbitRadius;',
    '    const targetX = ship.position.x + Math.cos(a) * r;',
    '    const targetZ = ship.position.z + Math.sin(a) * r;',
    '    const targetY = p.userData.orbitY + Math.sin(a * 1.5) * 8;',
    '',
    '    // Smooth movement towards orbit position',
    '    p.position.x += (targetX - p.position.x) * Math.min(1, 2 * dt);',
    '    p.position.y += (targetY - p.position.y) * Math.min(1, 2 * dt);',
    '    p.position.z += (targetZ - p.position.z) * Math.min(1, 2 * dt);',
    '',
    '    // Face direction of travel',
    '    const nextA = a + 0.1;',
    '    const nx = ship.position.x + Math.cos(nextA) * r;',
    '    const nz = ship.position.z + Math.sin(nextA) * r;',
    '    p.lookAt(nx, p.position.y, nz);',
    '',
    '    // Flashing police lights (blue/red alternation)',
    '    p.userData.lightTimer += dtMs;',
    '    if (p.userData.policeLight) {',
    '      const flash = Math.sin(p.userData.lightTimer * 0.008) > 0;',
    '      p.userData.policeLight.color.setHex(flash ? 0x4488ff : 0xff2244);',
    '      p.userData.policeLight.intensity = 2 + Math.sin(p.userData.lightTimer * 0.012) * 2;',
    '    }',
    '',
    '    // Despawn after lifetime',
    '    if (p.userData.age >= POLICE_LIFETIME) {',
    '      scene.remove(p);',
    '      disposeObject(p);',
    '      policeShips.splice(i, 1);',
    '    }',
    '  }',
    '}',
    '',
    '// Render police labels on HUD',
    'function renderPoliceLabels() {',
    '  if (!c.active || policeShips.length === 0) return;',
    '  const W = hudCanvas.width, H = hudCanvas.height;',
    '  for (const p of policeShips) {',
    '    const pos = p.position.clone();',
    '    pos.y += 6;',
    '    pos.project(camera);',
    '    if (pos.z > 1) continue;',
    '    const sx = (pos.x * 0.5 + 0.5) * W;',
    '    const sy = (-pos.y * 0.5 + 0.5) * H;',
    '    if (sx < 0 || sx > W || sy < 0 || sy > H) continue;',
    '    const dist = Math.floor(ship.position.distanceTo(p.position));',
    '    // Police tag',
    '    hudCtx.fillStyle = "#0d1117cc";',
    '    hudCtx.fillRect(sx - 50, sy - 12, 100, 28);',
    '    hudCtx.strokeStyle = "#4488ff66";',
    '    hudCtx.strokeRect(sx - 50, sy - 12, 100, 28);',
    '    hudCtx.font = "bold 10px \\"Segoe UI\\"";',
    '    hudCtx.fillStyle = "#4488ff";',
    '    hudCtx.textAlign = "center";',
    '    hudCtx.fillText("\\u2605 " + p.userData.patrolId, sx, sy + 2);',
    '    hudCtx.font = "8px \\"Segoe UI\\"";',
    '    hudCtx.fillStyle = "#667788";',
    '    hudCtx.fillText(dist + "m — EDEN POLICE", sx, sy + 12);',
    '  }',
    '  hudCtx.textAlign = "left";',
    '}',
  ];

  src = insertAfterLine(src, policeEnd, policeSystem);
  changes++;
  console.log('   ✅ Space police patrol system added (3 patrol ships, orbiting, flashing lights)');
} else {
  console.log('   ❌ Could not find insertion point for police system');
}


// ═══════════════════════════════════════════════════
//  FIX 6: Wire parade + police into game loop
// ═══════════════════════════════════════════════════
console.log('\n⚙ Fix 6: Wire new systems into game loop...');

// Find updateLibraryRotation(dt) call in game loop and replace with parade + police
let libRotCall = findLine(src, 'updateLibraryRotation(');
if (libRotCall >= 0) {
  src = replaceLine(src, libRotCall, '    updateShipParade(dt, dtMs); updatePolicePatrol(dt, dtMs);');
  changes++;
  console.log('   ✅ Game loop updated: parade + police wired in');
} else {
  // Try to find a good place in the game loop to add it
  const gameLoopLine = findLine(src, 'function gameLoop()');
  if (gameLoopLine >= 0) {
    // Find where asteroids are rotated (nearby code in the loop)
    const asteroidRotLine = findLine(src, 'c.asteroids.forEach(a => {', gameLoopLine);
    if (asteroidRotLine >= 0) {
      // Insert before asteroid rotation
      src = insertAfterLine(src, asteroidRotLine - 1, [
        '    // Ship parade + police patrol update',
        '    updateShipParade(dt, dtMs); updatePolicePatrol(dt, dtMs);',
      ]);
      changes++;
      console.log('   ✅ Game loop updated (inserted before asteroids)');
    }
  }
}

// Also wire renderPoliceLabels into HUD render
let renderLabelsCall = findLine(src, 'renderLibraryLabels()');
if (renderLabelsCall >= 0) {
  // This is the call in the render section — add police labels after it
  src = insertAfterLine(src, renderLabelsCall, ['    renderPoliceLabels();']);
  changes++;
  console.log('   ✅ Police labels wired into HUD render');
} else {
  console.log('   ⚠ renderLibraryLabels call not found — searching for HUD render section');
  // Find renderHUD and add after it
  const renderHUDCall = findLine(src, 'renderHUD(');
  if (renderHUDCall >= 0) {
    src = insertAfterLine(src, renderHUDCall, ['    renderLibraryLabels(); renderPoliceLabels();']);
    changes++;
    console.log('   ✅ Labels wired in after renderHUD');
  }
}

// ═══════════════════════════════════════════════════
//  FIX 7: Clean up police ships on exitGunnerMode
// ═══════════════════════════════════════════════════
console.log('\n⚙ Fix 7: Add police + parade cleanup to exitGunnerMode...');
const exitCleanupLine = findLine(src, 'c.dmgNumbers = [];');
if (exitCleanupLine >= 0) {
  src = insertAfterLine(src, exitCleanupLine, [
    '  // Clean up police patrols',
    '  policeShips.forEach(p => { scene.remove(p); disposeObject(p); }); policeShips.length = 0;',
    '  _policeSpawnTimer = 0;',
    '  // Clean up parade ship',
    '  if (paradeShip) { scene.remove(paradeShip); disposeObject(paradeShip); paradeShip = null; }',
    '  paradePhase = "idle"; paradeLabels = []; paradeTimer = 0;',
  ]);
  changes++;
  console.log('   ✅ Cleanup added to exitGunnerMode');
}


// ═══════════════════════════════════════════════════
//  VERIFY & WRITE
// ═══════════════════════════════════════════════════
const origBal = countBalance(origSrc);
const newBal = countBalance(src);
const deltaB = newBal.braces - origBal.braces;
const deltaP = newBal.parens - origBal.parens;
const deltaK = newBal.brackets - origBal.brackets;

console.log(`\n📊 Balance check — Delta B:${deltaB} P:${deltaP} K:${deltaK}`);
if (Math.abs(deltaB) > 0 || Math.abs(deltaP) > 0 || Math.abs(deltaK) > 0) {
  console.log('   ⚠ Balance mismatch! Investigating...');
  console.log(`   Original — B:${origBal.braces} P:${origBal.parens} K:${origBal.brackets}`);
  console.log(`   Modified — B:${newBal.braces} P:${newBal.parens} K:${newBal.brackets}`);
}

const lineCount = src.split('\n').length;
console.log(`📝 Writing ${lineCount} lines (${changes} changes applied)`);
fs.writeFileSync(FILE, src, 'utf8');
console.log('✅ File written successfully');
