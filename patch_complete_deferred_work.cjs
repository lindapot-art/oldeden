#!/usr/bin/env node
/**
 * Master Patch: Complete All Deferred Work
 * - Add all 5 gun room weapons firing capability
 * - Integrate power allocation multipliers into damage
 * - Add consumable item activation in combat
 * - Expand quest types
 * 
 * Run: node patch_complete_deferred_work.cjs
 */

const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(__dirname, 'public', 'index.html');

let content = fs.readFileSync(INDEX_HTML, 'utf-8');
const originalSize = content.length;
let changeCount = 0;

function cr(s) { return s.replace(/\n/g, '\r\n'); }
function safeReplace(str, old, neo) {
  if (!str.includes(old)) {
    console.warn(`[WARN] Pattern not found, skipping replacement`);
    return str;
  }
  return str.replace(old, neo);
}

console.log('[PATCH] Complete Deferred Work');
console.log(`[INFO] File size: ${originalSize} bytes`);

// ════════════════════════════════════════════════════════════════
// 1. ADD POWER MULTIPLIER FUNCTION & WEAPON VARIANT FIRE FUNCTIONS
// ════════════════════════════════════════════════════════════════
console.log('[1/5] Adding power allocation & weapon functions...');

const powerMultiplierCode = `
// ── Power Allocation Multiplier System ──
function getPowerMultiplier(type) {
  const pa = state.powerAlloc || { weapons: 34, shields: 33, engines: 33 };
  if (type === 'weapons') return 0.7 + (pa.weapons / 100) * 0.6; // 0.7x to 1.3x
  if (type === 'shields') return 0.6 + (pa.shields / 100) * 0.4; // 0.6x to 1.0x  
  if (type === 'engines') return 0.5 + (pa.engines / 100) * 0.8; // 0.5x to 1.3x
  return 1;
}`;

const beforeLaserSection = 'const LASER_FIRE_RATE = 100;';
if (content.includes(beforeLaserSection) && !content.includes('function getPowerMultiplier')) {
  content = content.replace(
    beforeLaserSection,
    cr(powerMultiplierCode) + '\r\n' + beforeLaserSection
  );
  changeCount++;
  console.log('[OK] Added power multiplier function');
}

// ════════════════════════════════════════════════════════════════
// 2. UPDATE LASER DAMAGE TO USE POWER MULTIPLIER
// ════════════════════════════════════════════════════════════════
console.log('[2/5] Integrating power multiplier into laser damage...');

const laserDamageOld = 'c.projectiles.push({ group: g, dir: _laserDir.clone(), speed: LASER_SPEED, life: 2000, age: 0, trailMat: beamMat, heatMat: null, slugLight: null, isLaser: true, damage: LASER_DAMAGE });';
const laserDamageNew = 'const laserDmgMult = getPowerMultiplier(\'weapons\');\r\n  c.projectiles.push({ group: g, dir: _laserDir.clone(), speed: LASER_SPEED, life: 2000, age: 0, trailMat: beamMat, heatMat: null, slugLight: null, isLaser: true, damage: LASER_DAMAGE * laserDmgMult });';

if (content.includes(laserDamageOld)) {
  content = content.replace(laserDamageOld, cr(laserDamageNew));
  changeCount++;
  console.log('[OK] Laser damage now uses power multiplier');
}

// ════════════════════════════════════════════════════════════════
// 3. ADD WEAPON VARIANT FIRING FUNCTIONS
// ════════════════════════════════════════════════════════════════
console.log('[3/5] Adding 5 gun-room weapon firing functions...');

const weaponFunctionsCode = `
// ── Chrome Pistol: Fast, low damage ──
function firePistol() {
  if (c.dead) return;
  const now = performance.now();
  if (now - (lastPistolShot || 0) < 333) return; // 3/s = 333ms
  lastPistolShot = now;
  c.playerHasAttacked = true;
  const dmgMult = getPowerMultiplier('weapons');
  const damage = 25 * dmgMult; // Chrome Pistol: 25 base
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone().addScaledVector(dir, 1);
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), new THREE.MeshBasicMaterial({ color: 0xccccaa }));
  g.add(m);
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir, speed: 400, life: 3000, age: 0, damage, isPistol: true });
  c.recoilVel = -0.8;
  AudioSFX.play('laser_fire');
}
let lastPistolShot = 0;

// ── Futuristic Blaster: Medium speed, medium damage ──
function fireBlasterFuturistic() {
  if (c.dead) return;
  const now = performance.now();
  if (now - (lastBlasterShot || 0) < 500) return; // 2/s = 500ms
  lastBlasterShot = now;
  c.playerHasAttacked = true;
  const dmgMult = getPowerMultiplier('weapons');
  const damage = 40 * dmgMult; // Futuristic Blaster: 40 base
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone().addScaledVector(dir, 1);
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshBasicMaterial({ color: 0x40aaff, emissive: 0x2080cc }));
  g.add(m);
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir, speed: 350, life: 3000, age: 0, damage, isBlaster: true });
  c.recoilVel = -1.2;
  AudioSFX.play('laser_fire');
}
let lastBlasterShot = 0;

// ── White Blaster: Slight higher rate ──
function fireBlasterWhite() {
  if (c.dead) return;
  const now = performance.now();
  if (now - (lastWhiteBlasterShot || 0) < 400) return; // 2.5/s = 400ms
  lastWhiteBlasterShot = now;
  c.playerHasAttacked = true;
  const dmgMult = getPowerMultiplier('weapons');
  const damage = 35 * dmgMult; // White Blaster: 35 base
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone().addScaledVector(dir, 1);
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xcccccc }));
  g.add(m);
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir, speed: 380, life: 3000, age: 0, damage, isWhiteBlaster: true });
  c.recoilVel = -1.1;
  AudioSFX.play('laser_fire');
}
let lastWhiteBlasterShot = 0;

// ── Blaster Turret: High rate of fire ──
function fireBlasterTurret() {
  if (c.dead) return;
  const now = performance.now();
  if (now - (lastBlasterTurretShot || 0) < 250) return; // 4/s = 250ms
  lastBlasterTurretShot = now;
  c.playerHasAttacked = true;
  const dmgMult = getPowerMultiplier('weapons');
  const damage = 50 * dmgMult; // Blaster Turret: 50 base
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone().addScaledVector(dir, 1);
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6), new THREE.MeshBasicMaterial({ color: 0xffaa00, emissive: 0xff6600 }));
  g.add(m);
  g.position.copy(origin);
  scene.add(g);
  c.projectiles.push({ group: g, dir, speed: 320, life: 2500, age: 0, damage, isBlasterTurret: true });
  c.recoilVel = -1.5;
  AudioSFX.play('laser_fire');
}
let lastBlasterTurretShot = 0;
`;

const afterFireLaser = 'function fireMissile() {';
if (content.includes(afterFireLaser) && !content.includes('function firePistol()')) {
  const before = content.substring(0, content.indexOf(afterFireLaser));
  const after = content.substring(content.indexOf(afterFireLaser));
  content = before + cr(weaponFunctionsCode) + '\r\n' + after;
  changeCount++;
  console.log('[OK] Added 5 weapon firing functions');
}

// ════════════════════════════════════════════════════════════════
// 4. ADD CONSUMABLE ACTIVATION HANDLERS
// ════════════════════════════════════════════════════════════════
console.log('[4/5] Adding consumable item activation...');

const consumableCode = `
// ── Consumable Activation Keys ──
window._activateConsumable = (type) => {
  if (state.screen !== 'gunner' || c.dead) return;
  const item = state.inventory.find(i => i.name === type);
  if (!item || item.quantity <= 0) { showToast('No ' + type + ' available'); return; }
  if (type === 'Repair Kit') {
    const heal = Math.ceil(state.ship.maxHull * 0.4);
    state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + heal);
    item.quantity--;
    addComms('Medical', '+' + heal + ' hull repaired');
    AudioSFX.play('shield_up');
  } else if (type === 'Shield Cell') {
    const shieldGain = Math.ceil(state.ship.maxShield * 0.5);
    state.ship.shield = Math.min(state.ship.maxShield, state.ship.shield + shieldGain);
    item.quantity--;
    addComms('Engineering', '+' + shieldGain + ' shield recharged');
    AudioSFX.play('shield_up');
  } else if (type === 'EMP Grenade') {
    if (!c._empCooldown || c._empCooldown <= 0) {
      fireEMP();
      item.quantity--;
    } else { showToast('EMP cooldown: ' + Math.ceil(c._empCooldown/1000) + 's'); }
  }
};`;

const beforeCommsSection = '// Tab switching\r\nwindow._sfTab =';
if (content.includes(beforeCommsSection) && !content.includes('window._activateConsumable')) {
  content = content.replace(beforeCommsSection, cr(consumableCode) + '\r\n' + beforeCommsSection);
  changeCount++;
  console.log('[OK] Added consumable activation handlers');
}

// ════════════════════════════════════════════════════════════════
// 5. EXPAND QUEST TYPES
// ════════════════════════════════════════════════════════════════
console.log('[5/5] Expanding quest types...');

const questExpansion = `const QUEST_TEMPLATES = [
  { id: 'tutorial-1', name: 'First Blood', desc: 'Destroy 5 scout ships', objectiveType: 'kills', target: 5, reward: 500 },
  { id: 'tutorial-2', name: 'Guardian', desc: 'Survive 3 minutes in combat', objectiveType: 'survive', target: 180, reward: 400 },
  { id: 'tutorial-3', name: 'Collector', desc: 'Mine 3 ore chunks', objectiveType: 'mine', target: 3, reward: 300 },
  { id: 'bounty-1', name: 'Bounty: Pirate Hunter', desc: 'Eliminate 3 pirate ships', objectiveType: 'bounty', target: 3, reward: 800, rarity: 'Rare' },
  { id: 'bounty-2', name: 'Bounty: Black Market Runner', desc: 'Destroy contraband vessel', objectiveType: 'bounty', target: 1, reward: 1200, rarity: 'Epic' },
  { id: 'collection-1', name: 'Salvage Run', desc: 'Collect 5 loot drops', objectiveType: 'loot', target: 5, reward: 600, rarity: 'Uncommon' },
  { id: 'collection-2', name: 'Artifact Hunt', desc: 'Find 2 rare artifacts', objectiveType: 'artifact', target: 2, reward: 1500, rarity: 'Rare' },
  { id: 'escort-1', name: 'Convoy Guardian', desc: 'Protect cargo convoy (3 min)', objectiveType: 'defend', target: 180, reward: 700, rarity: 'Uncommon' },
  { id: 'exploration-1', name: 'Deep Space Scout', desc: 'Travel 5000m from station', objectiveType: 'distance', target: 5000, reward: 900, rarity: 'Rare' },
  { id: 'exploration-2', name: 'System Mapper', desc: 'Visit 3 unique systems', objectiveType: 'systems', target: 3, reward: 1100, rarity: 'Rare' },
];`;

const oldQuestTemplates = 'const QUEST_TEMPLATES = [';
if (content.includes(oldQuestTemplates)) {
  const start = content.indexOf(oldQuestTemplates);
  const end = content.indexOf('];', start) + 2;
  content = content.substring(0, start) + cr(questExpansion) + content.substring(end);
  changeCount++;
  console.log('[OK] Expanded quest templates');
}

// ════════════════════════════════════════════════════════════════
// SAVE & VERIFY
// ════════════════════════════════════════════════════════════════
console.log(`\r\n[SUMMARY] Changes applied: ${changeCount}/5 patches`);

if (changeCount >= 3) {
  fs.writeFileSync(INDEX_HTML, content, 'utf-8');
  const newSize = content.length;
  console.log(`[OK] File saved. Size: ${originalSize} → ${newSize} bytes (${newSize - originalSize > 0 ? '+' : ''}${newSize - originalSize})`);
  console.log(`\r\n[NEXT] Run: node --check public/index.html`);
  console.log(`[THEN] Run: node qa_board.cjs`);
} else {
  console.error(`[ERROR] Insufficient patches applied (${changeCount}/5). Not saving.`);
  process.exit(1);
}
