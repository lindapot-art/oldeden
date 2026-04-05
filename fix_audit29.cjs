/**
 * Audit 29 — 14 fixes: save/load fidelity, socket edge cases, memory leaks,
 * UX polish, game balance
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');

let src = fs.readFileSync(FILE, 'utf8');
let applied = 0, failed = 0;

function cr(s) { return s.replace(/\r?\n/g, '\r\n'); }
function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr), n = cr(newStr);
  const idx = src.indexOf(o);
  if (idx === -1) { console.error('[MISS] ' + label); failed++; return; }
  const second = src.indexOf(o, idx + 1);
  if (second !== -1) { console.error('[DUP]  ' + label); failed++; return; }
  src = src.slice(0, idx) + n + src.slice(idx + o.length);
  console.log('[OK]   ' + label);
  applied++;
}

// ===== FIX 1.1: saveGame — add combat.bestStreak =====
safeReplace(
  `    combat: { score: state.combat.score, kills: state.combat.kills, cycle: state.combat.cycle },`,
  `    combat: { score: state.combat.score, kills: state.combat.kills, cycle: state.combat.cycle, bestStreak: state.combat.bestStreak || 0 },`,
  'Fix 1.1: saveGame — persist combat.bestStreak'
);

// ===== FIX 1.1b: loadFromServerData — restore combat.bestStreak =====
safeReplace(
  `  if (data.combat) { state.combat.score = data.combat.score || 0; state.combat.kills = data.combat.kills || 0; state.combat.cycle = data.combat.cycle || 1; }`,
  `  if (data.combat) { state.combat.score = data.combat.score || 0; state.combat.kills = data.combat.kills || 0; state.combat.cycle = data.combat.cycle || 1; state.combat.bestStreak = data.combat.bestStreak || 0; }`,
  'Fix 1.1b: loadFromServerData — restore combat.bestStreak'
);

// ===== FIX 1.2: saveGame — add chatbot toggles =====
safeReplace(
  `    market: state.market,
    insuredItemId: state.insuredItemId,`,
  `    market: state.market,
    insuredItemId: state.insuredItemId,
    chatbot: { autoTarget: state.chatbot.autoTarget, autoMine: state.chatbot.autoMine },`,
  'Fix 1.2: saveGame — persist chatbot autoTarget/autoMine toggles'
);

// ===== FIX 1.2b: loadFromServerData — restore chatbot toggles =====
// Add after the combat restore line
safeReplace(
  `  if (data.inventory) state.inventory = data.inventory;`,
  `  if (data.chatbot) { state.chatbot.autoTarget = !!data.chatbot.autoTarget; state.chatbot.autoMine = !!data.chatbot.autoMine; }
  if (data.inventory) state.inventory = data.inventory;`,
  'Fix 1.2b: loadFromServerData — restore chatbot toggles'
);

// ===== FIX 1.7: saveGame — add starSystems =====
safeReplace(
  `    persistentItems: state.persistentItems,`,
  `    persistentItems: state.persistentItems,
    starSystems: state.starSystems,`,
  'Fix 1.7: saveGame — persist starSystems to preserve star map across reloads'
);

// ===== FIX 1.7b: loadFromServerData — restore starSystems =====
// We need to restore before starmap generation. Add in loadFromServerData.
safeReplace(
  `  if (data.activeWeapon) state.activeWeapon = data.activeWeapon;`,
  `  if (data.activeWeapon) state.activeWeapon = data.activeWeapon;
  if (data.starSystems && data.starSystems.length) state.starSystems = data.starSystems;`,
  'Fix 1.7b: loadFromServerData — restore starSystems from save'
);

// ===== FIX 1.8: Apply saved skin on enter gunner mode =====
safeReplace(
  `  spawnAsteroids();
  if (c.spaceDust.length === 0) spawnSpaceDust();`,
  `  spawnAsteroids();
  if (c.spaceDust.length === 0) spawnSpaceDust();
  // Restore saved skin to 3D ship
  if (state.currentSkin) setTimeout(() => applySkin(state.currentSkin), 100);`,
  'Fix 1.8: Apply saved skin to 3D ship on entering gunner mode'
);

// ===== FIX 2.1: Socket disconnect — trigger saveGame =====
safeReplace(
  `        s.on('disconnect', () => {
          state.connected = false;
          updateServerStatus(false);
        });`,
  `        s.on('disconnect', () => {
          state.connected = false;
          updateServerStatus(false);
          saveGame(); // Emergency save to localStorage (socket emit will silently fail)
        });`,
  'Fix 2.1: Save game state to localStorage on socket disconnect'
);

// ===== FIX 2.2: combat:rewarded — use Math.max to prevent stale server overwrite =====
safeReplace(
  `        s.on('combat:rewarded', (data) => {
          if (data.wallet) {
            state.player.credits = data.wallet.ec;
            state.player.stellarMarks = data.wallet.sm;
          }`,
  `        s.on('combat:rewarded', (data) => {
          if (data.wallet) {
            state.player.credits = Math.max(state.player.credits, data.wallet.ec);
            state.player.stellarMarks = Math.max(state.player.stellarMarks, data.wallet.sm);
          }`,
  'Fix 2.2: combat:rewarded — only accept server wallet if higher (prevent stale overwrite)'
);

// ===== FIX 3.1: showToast — limit concurrent toasts to 3 =====
safeReplace(
  `// Toast notification
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(212,168,86,0.9);color:#000;padding:8px 20px;border-radius:4px;font-size:0.85rem;z-index:9999;pointer-events:none;animation:fadeIn 0.3s ease;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.5s'; setTimeout(() => t.remove(), 500); }, 2000);
}`,
  `// Toast notification
const _activeToasts = [];
function showToast(msg) {
  while (_activeToasts.length >= 3) { const old = _activeToasts.shift(); if (old.parentNode) old.remove(); }
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:' + (60 + _activeToasts.length * 36) + 'px;left:50%;transform:translateX(-50%);background:rgba(212,168,86,0.9);color:#000;padding:8px 20px;border-radius:4px;font-size:0.85rem;z-index:9999;pointer-events:none;animation:fadeIn 0.3s ease;';
  t.textContent = msg;
  document.body.appendChild(t);
  _activeToasts.push(t);
  setTimeout(() => { const idx = _activeToasts.indexOf(t); if (idx !== -1) _activeToasts.splice(idx, 1); t.style.opacity = '0'; t.style.transition = 'opacity 0.5s'; setTimeout(() => { if (t.parentNode) t.remove(); }, 500); }, 2000);
}`,
  'Fix 3.1: showToast — limit to 3 concurrent toasts, stack vertically'
);

// ===== FIX 3.4: Clear _materialCache on exitGunnerMode =====
safeReplace(
  `  stationModels.forEach(m => { scene.remove(m); disposeObject(m); }); stationModels = [];`,
  `  _materialCache.forEach(m => m.dispose()); _materialCache.clear();
  stationModels.forEach(m => { scene.remove(m); disposeObject(m); }); stationModels = [];`,
  'Fix 3.4: Clear _materialCache on exitGunnerMode to prevent memory growth'
);

// ===== FIX 3.6: jumpToSystem — add re-entry guard =====
safeReplace(
  `function jumpToSystem(idx) {
  if (state.ship.fuel < 5) {`,
  `let _isJumping = false;
function jumpToSystem(idx) {
  if (_isJumping) return;
  if (state.ship.fuel < 5) {`,
  'Fix 3.6a: jumpToSystem — add _isJumping guard against double-click'
);

// Find the jump completion to reset the flag
safeReplace(
  `  AudioSFX.play('jump');
  // Warp flash animation`,
  `  _isJumping = true;
  AudioSFX.play('jump');
  // Warp flash animation`,
  'Fix 3.6b: jumpToSystem — set _isJumping = true at start'
);

// Need to find where jump completes. The warpOverlay is removed at 1500ms.
// Let me find the fuel deduction and system change.
safeReplace(
  `  setTimeout(() => { if (warpOverlay.parentNode) warpOverlay.remove(); }, 1500);`,
  `  setTimeout(() => { if (warpOverlay.parentNode) warpOverlay.remove(); _isJumping = false; }, 1500);`,
  'Fix 3.6c: jumpToSystem — reset _isJumping = false when warp completes'
);

// ===== FIX 4.1: _escHtml — also escape single quotes =====
safeReplace(
  `function _escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }`,
  `function _escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;'); }`,
  'Fix 4.1: _escHtml — also escape single quotes to prevent attribute breakout'
);

// ===== FIX 5.2: combatInstinct — cap increment per death =====
// There are multiple call sites that set combatInstinct. Let's fix them.
safeReplace(
  `          state.soulMemory.combatInstinct = Math.min(10, state.soulMemory.combatInstinct + (c.kills * 0.02));
          playerDeathSequence('Rammed by hostile ' + e.type);`,
  `          state.soulMemory.combatInstinct = Math.min(10, state.soulMemory.combatInstinct + Math.min(2, 0.5 + c.kills * 0.005));
          playerDeathSequence('Rammed by hostile ' + e.type);`,
  'Fix 5.2: combatInstinct — cap per-death increment to prevent single-run maxing'
);

// Check if there are other combatInstinct increment sites
// From the grep, there's only one at line 7125. Let me check if there are others near death calls.

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n=== Audit 29 complete: ' + applied + ' applied, ' + failed + ' failed ===');

// Brace balance check
const opens = (src.match(/\{/g) || []).length;
const closes = (src.match(/\}/g) || []).length;
console.log('Braces: { = ' + opens + ', } = ' + closes + ', diff = ' + (opens - closes));
if (opens !== closes) console.error('!!! BRACE MISMATCH !!!');
