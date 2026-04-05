// fix_audit24.cjs — Audit 24: 10 fixes for Old Eden
// NPC engine glow shared, mining dead guard, dock distance+dead check,
// bossActive reset, saveGame try-catch, action-bar z-index, chatbot reset,
// keydown chatInput guard, cockpit not re-fixed (skip #10 — low impact)

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
// Fix 1: NPC engine glow — shared geometry + materials
// =================================================================
safeReplace(
  cr(`  // Engine glow
  const eMat = new THREE.MeshBasicMaterial({ color: npcDef.friendly ? 0x44aaff : 0xff4422, transparent: true, opacity: 0.7 });
  { const eM = new THREE.Mesh(new THREE.CircleGeometry(0.25, 8), eMat); eM.position.set(0, 0, 1.6); g.add(eM); }`),
  cr(`  // Engine glow (shared geometry + materials)
  if (!window._npcEngineGeo) {
    window._npcEngineGeo = new THREE.CircleGeometry(0.25, 8);
    window._npcEngineMatF = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7 });
    window._npcEngineMatH = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.7 });
  }
  { const eM = new THREE.Mesh(window._npcEngineGeo, npcDef.friendly ? window._npcEngineMatF : window._npcEngineMatH); eM.position.set(0, 0, 1.6); g.add(eM); }`),
  'Fix 1: NPC engine glow shared geo+mat'
);

// =================================================================
// Fix 2: Mining — dead + docked guard
// =================================================================
safeReplace(
  cr(`function startMining(asteroidIndex) {
  if (state.mining.active) return;`),
  cr(`function startMining(asteroidIndex) {
  if (state.mining.active || c.dead || state.location.docked) return;`),
  'Fix 2: Mining dead+docked guard'
);

// =================================================================
// Fix 3: Docking — distance check + dead guard
// =================================================================
safeReplace(
  cr(`  if (e.key === 'b' || e.key === 'B') {
    const sys = state.starSystems[state.location.systemIndex];
    if (sys && sys.hasStation) { state.location.docked = true; AudioSFX.play('dock'); showScreen('station'); }
    else addComms('System', 'No station in this system.');`),
  cr(`  if (e.key === 'b' || e.key === 'B') {
    if (c.dead) return;
    const sys = state.starSystems[state.location.systemIndex];
    if (sys && sys.hasStation) {
      const stationInRange = stationModels.length === 0 || stationModels.some(m => ship.position.distanceTo(m.position) < 80);
      if (!stationInRange) { addComms('Navigation', 'Station out of docking range. Fly closer.'); return; }
      state.location.docked = true; AudioSFX.play('dock'); showScreen('station');
    }
    else addComms('System', 'No station in this system.');`),
  'Fix 3: Dock distance check + dead guard'
);

// =================================================================
// Fix 4: bossActive reset on exitGunnerMode
// =================================================================
safeReplace(
  cr(`  stopMining();
  state.mining.active = false;
  state.chatbot.visible = false;`),
  cr(`  stopMining();
  state.mining.active = false;
  c.bossActive = false;
  state.chatbot.visible = false;`),
  'Fix 4: Reset bossActive on exit gunner mode'
);

// =================================================================
// Fix 5: saveGame try-catch for localStorage quota
// =================================================================
safeReplace(
  cr(`  localStorage.setItem('oe-save', JSON.stringify(data));
  // Also save to server
  if (state.socket) state.socket.emit('game:save', data);`),
  cr(`  try { localStorage.setItem('oe-save', JSON.stringify(data)); }
  catch (e) { addComms('System', 'Save failed — storage full.'); }
  // Also save to server
  if (state.socket) state.socket.emit('game:save', data);`),
  'Fix 5: saveGame try-catch for quota'
);

// =================================================================
// Fix 6: Action bar z-index above lock-prompt
// =================================================================
safeReplace(
  cr(`#action-bar{position:fixed;bottom:60px;left:50%;transform:translateX(-50%);display:none;gap:8px;z-index:50;`),
  cr(`#action-bar{position:fixed;bottom:60px;left:50%;transform:translateX(-50%);display:none;gap:8px;z-index:56;`),
  'Fix 6: Action bar z-index 56 (above lock-prompt 55)'
);

// =================================================================
// Fix 7: Clear chatbot messages on rebirth
// =================================================================
safeReplace(
  cr(`  state.combat.score = 0; state.combat.kills = 0; state.combat.cycle = 1; state.combat.bestStreak = 0;
  state.combat.dead = false;`),
  cr(`  state.combat.score = 0; state.combat.kills = 0; state.combat.cycle = 1; state.combat.bestStreak = 0;
  state.combat.dead = false;
  state.chatbot.messages = [];`),
  'Fix 7: Clear chatbot messages on rebirth'
);

// =================================================================
// Fix 8: Keydown handler #1 — chatInput focus guard
// =================================================================
safeReplace(
  cr(`document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && c.active) { exitGunnerMode(); return; }
  // R = reload ammo (1.5s reload animation)
  if ((e.key === 'r' || e.key === 'R') && c.active) {`),
  cr(`document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && c.active) { exitGunnerMode(); return; }
  // Don't process game keys while typing in chatbot
  const _chInput = document.getElementById('chatbot-input');
  if (document.activeElement === _chInput) return;
  // R = reload ammo (1.5s reload animation)
  if ((e.key === 'r' || e.key === 'R') && c.active) {`),
  'Fix 8: Keydown handler chatInput focus guard'
);

// =================================================================
// Fix 9: Add dead guard to F (warp/starmap) key
// =================================================================
safeReplace(
  cr(`  // F = warp (open star map)
  if (e.key === 'f' || e.key === 'F') {
    showScreen('starmap');
  }`),
  cr(`  // F = warp (open star map)
  if (e.key === 'f' || e.key === 'F') {
    if (c.dead) return;
    showScreen('starmap');
  }`),
  'Fix 9: F key dead guard (prevent warping while dead)'
);

// =================================================================
// Write result
// =================================================================
fs.writeFileSync(file, src, 'utf8');
console.log('\n=== Applied: ' + applied + '/9 ===');

const openBraces = (src.match(/{/g) || []).length;
const closeBraces = (src.match(/}/g) || []).length;
console.log('Brace balance: { ' + openBraces + ' } ' + closeBraces + ' diff=' + (openBraces - closeBraces));
const openScript = (src.match(/<script/gi) || []).length;
const closeScript = (src.match(/<\/script>/gi) || []).length;
console.log('Script tags: open=' + openScript + ' close=' + closeScript);
