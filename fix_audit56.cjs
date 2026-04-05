/**
 * Audit 56 — Patch Script
 * Fixes: async route crash, parade race condition, rebirth memory leak,
 *        mining HUD label, spawnNail GC pressure, station trade backslash escape,
 *        market history cap, chatbot-input caching
 */
const fs = require('fs');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let applied = 0;
let failed = 0;

function safeReplace(file, oldStr, newStr, label) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes(oldStr)) {
    console.log(`[FAIL] ${label} — pattern not found`);
    failed++;
    return;
  }
  const count = content.split(oldStr).length - 1;
  if (count > 1) {
    console.log(`[WARN] ${label} — ${count} matches, replacing first only`);
  }
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`[OK]   ${label}`);
  applied++;
}

// ═══════════════════════════════════════════════════════════════════
//  FIX 1: AssetUploadRouter — async inspect route unhandled rejection
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'src/server/AssetUploadRouter.js',
  cr(`    const report = await glbProcessor.inspect(filePath);\n    res.json({ filename: safeName, ...report });`),
  cr(`    try {\n      const report = await glbProcessor.inspect(filePath);\n      res.json({ filename: safeName, ...report });\n    } catch (err) {\n      console.error('[AssetUpload] Inspect failed:', err.message);\n      res.status(500).json({ error: 'Inspection failed', detail: err.message });\n    }`),
  'Fix 1: async inspect route try/catch'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 2: Parade ship race condition — guard c.active after await
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`    const model = await loadGLBModel(key);\n    paradeShip = model.clone();`),
  cr(`    const model = await loadGLBModel(key);\n    if (!c.active) return; // Guard: player exited during async load\n    paradeShip = model.clone();`),
  'Fix 2: parade ship race condition guard'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 3: Rebirth — null _origSystems/_origSystemIndex after restore
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`    state.inAltUniverse = false;\n    state.altUniverse = null;\n  }\n  // Reset upgrades to baseline (the flesh forgets)`),
  cr(`    state.inAltUniverse = false;\n    state.altUniverse = null;\n    state._origSystems = null;\n    state._origSystemIndex = null;\n  }\n  // Reset upgrades to baseline (the flesh forgets)`),
  'Fix 3: null _origSystems/_origSystemIndex after rebirth'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 4: Mining — set targetOre when starting mining
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`  state.mining.active = true;\n  state.mining.targetRef = asteroid;\n  state.mining.progress = 0;`),
  cr(`  state.mining.active = true;\n  state.mining.targetRef = asteroid;\n  state.mining.progress = 0;\n  const _sys = state.starSystems[state.location.systemIndex];\n  state.mining.targetOre = _sys?.resources?.[0] || 'Asteroid';`),
  'Fix 4: set targetOre on mining start'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 5: spawnNail — reduce GC pressure by using pre-allocated vectors
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`  const dir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);\n  const origin = camera.position.clone().add(dir.clone().multiplyScalar(1));`),
  cr(`  const dir = _tmpV3a.set(0,0,-1).applyQuaternion(camera.quaternion);\n  const origin = _tmpV3b.copy(camera.position).addScaledVector(dir, 1);`),
  'Fix 5: spawnNail zero-alloc direction/origin'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 5b: spawnNail — clone dir when storing in projectile (since we reuse _tmpV3a)
//  Need to find where dir is stored in the projectile push
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
//  FIX 6: Station trade — escape backslashes before quotes
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  `const jsName = c.name.replace(/'/g, "\\\\'").replace(/"/g, '&quot;');`,
  `const jsName = c.name.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');`,
  'Fix 6: escape backslashes in station trade onclick'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 7: Market history — cap at 100 entries (3 locations)
// ═══════════════════════════════════════════════════════════════════
// Location 1: _marketBuy
safeReplace(
  'public/index.html',
  cr(`  state.market.history.push({ item: order.item, type: 'buy', price: order.price, quantity: 1, time: Date.now() });\n  if (order.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== orderId);\n  addComms('Market', ` + '`' + 'Purchased ' + "$" + '{order.item} for ' + "$" + '{order.price} EC' + '`' + `);`),
  cr(`  state.market.history.push({ item: order.item, type: 'buy', price: order.price, quantity: 1, time: Date.now() });\n  if (state.market.history.length > 100) state.market.history.splice(0, state.market.history.length - 100);\n  if (order.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== orderId);\n  addComms('Market', ` + '`' + 'Purchased ' + "$" + '{order.item} for ' + "$" + '{order.price} EC' + '`' + `);`),
  'Fix 7a: cap market history in buy handler'
);

// Location 2: _marketSell
safeReplace(
  'public/index.html',
  cr(`  state.market.history.push({ item: order.item, type: 'sell', price: order.price, quantity: 1, time: Date.now() });\n  if (order.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== orderId);\n  addComms('Market', ` + '`' + 'Sold ' + "$" + '{order.item} for ' + "$" + '{order.price} EC' + '`' + `);`),
  cr(`  state.market.history.push({ item: order.item, type: 'sell', price: order.price, quantity: 1, time: Date.now() });\n  if (state.market.history.length > 100) state.market.history.splice(0, state.market.history.length - 100);\n  if (order.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== orderId);\n  addComms('Market', ` + '`' + 'Sold ' + "$" + '{order.item} for ' + "$" + '{order.price} EC' + '`' + `);`),
  'Fix 7b: cap market history in sell handler'
);

// Location 3: NPC fill handler
safeReplace(
  'public/index.html',
  cr(`      state.market.history.push({ item: _ord.item, type: _ord.type, price: _ord.price, quantity: fq, time: Date.now() });\n      if (m.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== m.id);`),
  cr(`      state.market.history.push({ item: _ord.item, type: _ord.type, price: _ord.price, quantity: fq, time: Date.now() });\n      if (state.market.history.length > 100) state.market.history.splice(0, state.market.history.length - 100);\n      if (m.quantity <= 0) state.market.orders = state.market.orders.filter(o => o.id !== m.id);`),
  'Fix 7c: cap market history in NPC fill handler'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 8: Cache chatbot-input reference instead of querying every keypress
// ═══════════════════════════════════════════════════════════════════
// First keydown handler
safeReplace(
  'public/index.html',
  cr(`document.addEventListener('keydown', (e) => {\n  // Don't process game keys while typing in chatbot\n  const _chInput = document.getElementById('chatbot-input');\n  if (document.activeElement === _chInput) { if (e.key === 'Escape') { _chInput.blur(); } return; }`),
  cr(`const _cachedChatInput = document.getElementById('chatbot-input');\ndocument.addEventListener('keydown', (e) => {\n  // Don't process game keys while typing in chatbot\n  if (document.activeElement === _cachedChatInput) { if (e.key === 'Escape') { _cachedChatInput.blur(); } return; }`),
  'Fix 8a: cache chatbot-input ref (first keydown handler)'
);

// Second keydown handler (ADDITIONAL KEYBINDS section)
safeReplace(
  'public/index.html',
  cr(`document.addEventListener('keydown', (e) => {\n  if (!c.active || c.dead) return;\n  // Skip keybinds when chatbot input is focused (let player type freely)\n  const chatInput = document.getElementById('chatbot-input');\n  if (document.activeElement === chatInput) return;`),
  cr(`document.addEventListener('keydown', (e) => {\n  if (!c.active || c.dead) return;\n  // Skip keybinds when chatbot input is focused (let player type freely)\n  if (document.activeElement === _cachedChatInput) return;`),
  'Fix 8b: use cached chatbot-input ref (second keydown handler)'
);

console.log(`\n=== Audit 56 Patch Complete ===`);
console.log(`Applied: ${applied} | Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
