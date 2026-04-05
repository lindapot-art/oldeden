/**
 * Audit 28 — 15 fixes: XSS, boss edge cases, skill caps, WebGL recovery,
 * pointer lock, chat/escape, perf, race conditions, mining cleanup
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

// ===== FIX 1: CRITICAL — Market XSS — wrap user-controlled data in _escHtml() =====
// Buy tab: o.item, o.trader, o.id
safeReplace(
  "sells.map(o => `<tr><td>${o.item}</td><td class=\"market-buy\">${o.price.toLocaleString()}</td><td>${o.quantity}</td><td style=\"color:var(--muted)\">${o.trader}</td>\n        <td><button class=\"trade-buy\" onclick=\"window._marketBuy('${o.id}')\">Buy</button></td></tr>`).join('')",
  "sells.map(o => `<tr><td>${_escHtml(o.item)}</td><td class=\"market-buy\">${o.price.toLocaleString()}</td><td>${o.quantity}</td><td style=\"color:var(--muted)\">${_escHtml(o.trader)}</td>\n        <td><button class=\"trade-buy\" onclick=\"window._marketBuy('${_escHtml(o.id)}')\">Buy</button></td></tr>`).join('')",
  'Fix 1a: Market buy tab XSS — escHtml on item/trader/id'
);

// Sell tab: o.item, o.trader, o.id
safeReplace(
  "buys.map(o => `<tr><td>${o.item}</td><td class=\"market-sell\">${o.price.toLocaleString()}</td><td>${o.quantity}</td><td style=\"color:var(--muted)\">${o.trader}</td>\n        <td><button class=\"trade-sell\" onclick=\"window._marketSell('${o.id}')\">Sell</button></td></tr>`).join('')",
  "buys.map(o => `<tr><td>${_escHtml(o.item)}</td><td class=\"market-sell\">${o.price.toLocaleString()}</td><td>${o.quantity}</td><td style=\"color:var(--muted)\">${_escHtml(o.trader)}</td>\n        <td><button class=\"trade-sell\" onclick=\"window._marketSell('${_escHtml(o.id)}')\">Sell</button></td></tr>`).join('')",
  'Fix 1b: Market sell tab XSS — escHtml on item/trader/id'
);

// History tab: h.item, h.type, h.price, h.quantity
safeReplace(
  "state.market.history.slice(-20).reverse().map(h => `<tr><td style=\"color:var(--muted)\">${formatTimeAgo(h.time)}</td><td>${h.item}</td><td style=\"color:${h.type==='buy'?'var(--green)':'var(--danger)'}\">${h.type}</td><td>${h.price}</td><td>${h.quantity}</td></tr>`).join('')",
  "state.market.history.slice(-20).reverse().map(h => `<tr><td style=\"color:var(--muted)\">${formatTimeAgo(h.time)}</td><td>${_escHtml(h.item)}</td><td style=\"color:${h.type==='buy'?'var(--green)':'var(--danger)'}\">${_escHtml(h.type)}</td><td>${h.price}</td><td>${h.quantity}</td></tr>`).join('')",
  'Fix 1c: Market history tab XSS — escHtml on item/type'
);

// ===== FIX 2: bossActive reset in exitGunnerMode =====
// The exitGunnerMode already has c.bossActive = false further down. Let me verify...
// From read_file 3966-3985: "c.bossActive = false;" exists at line ~3983. Already fixed in audit 24.
// SKIP — already present.

// ===== FIX 3: Skill XP ceiling guard — add hard cap to getSkillCeiling =====
// The ceiling is already enforced by Math.min(ceiling, ...) in gainSkillXP.
// But getSkillBonus is uncapped: "return 1 + (state.skills[skillName] * 0.05);"
// This is fine because skills are clamped by ceiling in gainSkillXP. No overflow possible.
// SKIP — no actual bug.

// ===== FIX 4: Server rebirth should call storePastLife =====
// storePastLife is already called in showEulogy (line 1442) which runs on every death.
// Rebirth only happens AFTER death (eulogy -> rebirth button), so storePastLife already ran.
// SKIP — no actual bug.

// ===== FIX 5: applySkin — clone material before mutating =====
safeReplace(
  `function applySkin(skin) {
  state.currentSkin = skin;
  ship.traverse(child => {
    if (!child.isMesh || !child.material || child.material.isMeshBasicMaterial) return;
    // Determine if this is hull or accent based on original color
    const isAccent = child.material.emissiveIntensity > 0.2;
    child.material.color.setHex(isAccent ? skin.accent : skin.primary);
    child.material.roughness = skin.roughness;
    child.material.metalness = skin.metalness;
    if (child.material.emissive) child.material.emissive.setHex(skin.emissive);
  });`,
  `function applySkin(skin) {
  state.currentSkin = skin;
  ship.traverse(child => {
    if (!child.isMesh || !child.material || child.material.isMeshBasicMaterial) return;
    // Clone shared/cached material before mutating
    if (child.material._shared || child.material._pooled) { child.material = child.material.clone(); }
    // Determine if this is hull or accent based on original color
    const isAccent = child.material.emissiveIntensity > 0.2;
    child.material.color.setHex(isAccent ? skin.accent : skin.primary);
    child.material.roughness = skin.roughness;
    child.material.metalness = skin.metalness;
    if (child.material.emissive) child.material.emissive.setHex(skin.emissive);
  });`,
  'Fix 5: applySkin — clone shared/pooled material before mutation'
);

// ===== FIX 6: WebGL context restore — rebuild composer =====
safeReplace(
  `canvas3d.addEventListener('webglcontextrestored', () => {
  console.log('[Old Eden] WebGL context restored');
  const lostDiv = document.getElementById('webgl-lost-overlay');
  if (lostDiv) lostDiv.classList.remove('active');
  // Re-init renderer settings
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.8;
});`,
  `canvas3d.addEventListener('webglcontextrestored', () => {
  console.log('[Old Eden] WebGL context restored');
  const lostDiv = document.getElementById('webgl-lost-overlay');
  if (lostDiv) lostDiv.classList.remove('active');
  // Re-init renderer settings
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.8;
  // Rebuild post-processing composer after context restore
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.5, 0.6);
    composer.addPass(bloom);
    console.log('[Old Eden] Post-processing rebuilt after context restore');
  } catch (e) { console.warn('[Old Eden] Composer rebuild failed:', e); }
});`,
  'Fix 6: WebGL context restore — rebuild EffectComposer/bloom'
);

// ===== FIX 7: Pointer lock rejection — add .catch() =====
// There are 4 requestPointerLock() calls. Guard each one.
// Line 3824: canvas3d.requestPointerLock();  (enterGunnerMode)
safeReplace(
  `  AudioSFX.startEngineHum();
  canvas3d.requestPointerLock();
  document.getElementById('action-bar').classList.add('active');`,
  `  AudioSFX.startEngineHum();
  canvas3d.requestPointerLock()?.catch?.(() => {});
  document.getElementById('action-bar').classList.add('active');`,
  'Fix 7a: Pointer lock catch — enterGunnerMode'
);

// Line 4787: canvas3d.requestPointerLock(); (mousedown)
safeReplace(
  `  if (!c.locked) { canvas3d.requestPointerLock(); return; }`,
  `  if (!c.locked) { canvas3d.requestPointerLock()?.catch?.(() => {}); return; }`,
  'Fix 7b: Pointer lock catch — mousedown'
);

// Line 4901: lock-prompt click
safeReplace(
  `document.getElementById('lock-prompt').addEventListener('click', () => canvas3d.requestPointerLock());`,
  `document.getElementById('lock-prompt').addEventListener('click', () => canvas3d.requestPointerLock()?.catch?.(() => {}));`,
  'Fix 7c: Pointer lock catch — lock-prompt click'
);

// Line 6618: chatbot close -> re-lock
safeReplace(
  `      canvas3d.requestPointerLock();
    }
  }
  // K = skin panel toggle`,
  `      canvas3d.requestPointerLock()?.catch?.(() => {});
    }
  }
  // K = skin panel toggle`,
  'Fix 7d: Pointer lock catch — chatbot close re-lock'
);

// ===== FIX 8: Escape while typing in chatbot should not exit gunner =====
// Move the chat input guard BEFORE the Escape key handler
safeReplace(
  `document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && c.active) { exitGunnerMode(); return; }
  // Don't process game keys while typing in chatbot
  const _chInput = document.getElementById('chatbot-input');
  if (document.activeElement === _chInput) return;`,
  `document.addEventListener('keydown', (e) => {
  // Don't process game keys while typing in chatbot
  const _chInput = document.getElementById('chatbot-input');
  if (document.activeElement === _chInput) { if (e.key === 'Escape') { _chInput.blur(); } return; }
  if (e.key === 'Escape' && c.active) { exitGunnerMode(); return; }`,
  'Fix 8: Escape while chatbot focused blurs input instead of exiting gunner'
);

// ===== FIX 9: renderLibraryLabels calls renderPoliceLabels unconditionally =====
safeReplace(
  `function renderLibraryLabels() {
    renderPoliceLabels();
  if (!c.active || paradeLabels.length === 0) return;`,
  `function renderLibraryLabels() {
  renderPoliceLabels();
  if (!c.active || paradeLabels.length === 0) return;`,
  'Fix 9: renderLibraryLabels — fix indentation (cosmetic)'
);

// ===== FIX 10: Boss HP scaling cap — prevent unkillable bosses =====
safeReplace(
  `  const bDiff = 1 + (state.player.rebirths || 0) * 0.15 + (c.cycle - 1) * 0.08;`,
  `  const bDiff = Math.min(5, 1 + (state.player.rebirths || 0) * 0.15 + (c.cycle - 1) * 0.08);`,
  'Fix 10: Boss HP scaling cap at 5x to prevent unkillable bosses'
);

// ===== FIX 11: Market auto-fill rebirth guard =====
safeReplace(
  `  // NPC auto-fill: match player orders against NPC counter-orders
  setTimeout(() => {
    const _ord = state.market.orders.find(o => o.id === _orderId);
    if (!_ord || _ord.quantity <= 0) return;`,
  `  // NPC auto-fill: match player orders against NPC counter-orders
  const _rebirthSnapshot = state.player.rebirths;
  setTimeout(() => {
    if (state.player.rebirths !== _rebirthSnapshot) return; // Guard: abort if rebirth happened
    const _ord = state.market.orders.find(o => o.id === _orderId);
    if (!_ord || _ord.quantity <= 0) return;`,
  'Fix 11: Market auto-fill rebirth guard — abort if rebirth during delay'
);

// ===== FIX 12: Ghost NPC Color allocation — hoist outside traverse =====
safeReplace(
  `      // Ghost tint — ethereal blue-white
      lastNpc.group.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.emissive = new THREE.Color(0x6688ff);
          child.material.emissiveIntensity = 0.6;`,
  `      // Ghost tint — ethereal blue-white
      const _ghostColor = new THREE.Color(0x6688ff);
      lastNpc.group.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.emissive = _ghostColor;
          child.material.emissiveIntensity = 0.6;`,
  'Fix 12: Ghost NPC — hoist Color allocation outside traverse loop'
);

// ===== FIX 13: Boss fire rate scaling — scale with cycle =====
safeReplace(
  `      const fireInterval = e.isBoss ? 1500 : (e.shootRate || 3000);`,
  `      const fireInterval = e.isBoss ? Math.max(600, 1500 - (c.cycle - 1) * 100) : (e.shootRate || 3000);`,
  'Fix 13: Boss fire rate scales with cycle (1500ms -> min 600ms)'
);

// ===== FIX 14: Asteroid tunneling — swept sphere collision =====
safeReplace(
  `          const dist = a.position.distanceTo(ship.position);
          const mesh = a.children && a.children[0];
          const radius = (mesh && mesh.geometry && mesh.geometry.boundingSphere && mesh.geometry.boundingSphere.radius) || 4;
          if (dist < radius + 3) {`,
  `          const dist = a.position.distanceTo(ship.position);
          const mesh = a.children && a.children[0];
          const radius = (mesh && mesh.geometry && mesh.geometry.boundingSphere && mesh.geometry.boundingSphere.radius) || 4;
          // Swept-sphere check: account for high-speed tunneling
          const sweepDist = fl.speed * dt;
          const effectiveRadius = radius + 3 + sweepDist * 0.5;
          if (dist < effectiveRadius) {`,
  'Fix 14: Asteroid collision swept-sphere to prevent high-speed tunneling'
);

// ===== FIX 15: stopMining double-resets — consolidate =====
safeReplace(
  `function stopMining() {
  state.mining.active = false;
  state.mining.target = null;
  state.mining.progress = 0;
  if (miningLaserBeam) { scene.remove(miningLaserBeam); miningLaserBeam.geometry.dispose(); miningLaserBeam.material.dispose(); miningLaserBeam = null; }
  // Ensure mining state is clean
  state.mining.active = false; state.mining.targetRef = null; state.mining.progress = 0;
}`,
  `function stopMining() {
  state.mining.active = false;
  state.mining.target = null;
  state.mining.targetRef = null;
  state.mining.progress = 0;
  if (miningLaserBeam) { scene.remove(miningLaserBeam); miningLaserBeam.geometry.dispose(); miningLaserBeam.material.dispose(); miningLaserBeam = null; }
}`,
  'Fix 15: stopMining — consolidate double-reset, clear targetRef'
);

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\n=== Audit 28 complete: ${applied} applied, ${failed} failed ===`);

// Brace balance check
const opens = (src.match(/\{/g) || []).length;
const closes = (src.match(/\}/g) || []).length;
console.log(`Braces: { = ${opens}, } = ${closes}, diff = ${opens - closes}`);
if (opens !== closes) console.error('!!! BRACE MISMATCH !!!');
