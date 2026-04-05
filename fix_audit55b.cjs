/**
 * Audit 55b — Second pass: remaining XSS + socket handler try/catch
 *
 * Client:
 *   1. Past lives panel: escape life.name, life.occupation, life.deathCause
 *   2. Past lives dialogue: escape quote (contains raw deathCause)
 *
 * Server:
 *   3-12. Wrap all remaining unwrapped socket handlers in try/catch
 */

const fs = require('fs');
const path = require('path');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let ok = 0, fail = 0;

// ── CLIENT ──────────────────────────────────────────────────────────────────
const htmlPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

function safeReplace(oldStr, newStr, label) {
  const old = cr(oldStr);
  const nw = cr(newStr);
  if (!html.includes(old)) { console.error(`[FAIL] ${label} — not found`); fail++; return; }
  const count = html.split(old).length - 1;
  if (count > 1) { console.error(`[FAIL] ${label} — ${count} matches`); fail++; return; }
  html = html.replace(old, nw);
  console.log(`[OK] ${label}`);
  ok++;
}

// 1. Past lives panel list — life.name, life.occupation, life.deathCause unescaped
safeReplace(
  '<div style="color:var(--gold);font-size:0.95rem">${life.name} <span style="color:var(--muted);font-size:0.7rem">— ${life.occupation}</span></div>',
  '<div style="color:var(--gold);font-size:0.95rem">${_escHtml(life.name)} <span style="color:var(--muted);font-size:0.7rem">— ${_escHtml(life.occupation)}</span></div>',
  'Fix 1a: past lives list life.name/occupation'
);

safeReplace(
  '<div style="font-size:0.7rem;color:${fac?.color || \'#888\'}">${fac?.name || \'Independent\'} · Died: ${life.deathCause}</div>',
  '<div style="font-size:0.7rem;color:${fac?.color || \'#888\'}">${_escHtml(fac?.name || \'Independent\')} · Died: ${_escHtml(life.deathCause)}</div>',
  'Fix 1b: past lives list fac.name/deathCause'
);

// 2. Past lives dialogue — quote variable contains raw deathCause
// The quote is built from hardcoded strings + life.deathCause, but since the whole
// quote is inserted via innerHTML, we need to escape it
safeReplace(
  `'<div style="font-style:italic;color:#ccc;font-size:0.85rem">"' + quote + '"</div>' +`,
  `'<div style="font-style:italic;color:#ccc;font-size:0.85rem">"' + _escHtml(quote) + '"</div>' +`,
  'Fix 2: past lives dialogue quote escaping'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`\n=== CLIENT: ${ok} applied, ${fail} failed ===\n`);

// ── SERVER ──────────────────────────────────────────────────────────────────
const jsPath = path.join(__dirname, 'src', 'core', 'index.js');
let js = fs.readFileSync(jsPath, 'utf8');
let sok = 0, sfail = 0;

function safeReplaceJS(oldStr, newStr, label) {
  const old = cr(oldStr);
  const nw = cr(newStr);
  if (!js.includes(old)) { console.error(`[FAIL] ${label} — not found`); sfail++; return; }
  const count = js.split(old).length - 1;
  if (count > 1) { console.error(`[FAIL] ${label} — ${count} matches`); sfail++; return; }
  js = js.replace(old, nw);
  console.log(`[OK] ${label}`);
  sok++;
}

// 3. player:create
safeReplaceJS(
  `socket.on('player:create', (data) => {
    // Input validation
    const name = typeof data?.name === 'string' ? data.name.slice(0, 32).replace(/[<>"'&]/g, '') : 'Unknown Pilot';`,
  `socket.on('player:create', (data) => {
    try {
    // Input validation
    const name = typeof data?.name === 'string' ? data.name.slice(0, 32).replace(/[<>"'&]/g, '') : 'Unknown Pilot';`,
  'Fix 3: try/catch player:create (open)'
);
safeReplaceJS(
  `    socket.emit('character:created', {
      id: playerId,
      name,
      faction,
      genome,
      wallet: { ec: wallet.ec, sm: wallet.sm },
    });
  });

  // ── Combat Kill`,
  `    socket.emit('character:created', {
      id: playerId,
      name,
      faction,
      genome,
      wallet: { ec: wallet.ec, sm: wallet.sm },
    });
    } catch (err) { console.error('[Socket] player:create error:', err.message); }
  });

  // ── Combat Kill`,
  'Fix 3b: try/catch player:create (close)'
);

// 4. combat:kill
safeReplaceJS(
  `socket.on('combat:kill', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const enemyType = typeof data?.enemyType === 'string' ? data.enemyType : 'fighter';`,
  `socket.on('combat:kill', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player) return;
    const enemyType = typeof data?.enemyType === 'string' ? data.enemyType : 'fighter';`,
  'Fix 4: try/catch combat:kill (open)'
);
safeReplaceJS(
  `    socket.emit('combat:rewarded', {
      enemyType, reward, wallet: { ec: wallet.ec, sm: wallet.sm },
      questUpdates,
    });
  });

  // ── Death Report`,
  `    socket.emit('combat:rewarded', {
      enemyType, reward, wallet: { ec: wallet.ec, sm: wallet.sm },
      questUpdates,
    });
    } catch (err) { console.error('[Socket] combat:kill error:', err.message); }
  });

  // ── Death Report`,
  'Fix 4b: try/catch combat:kill (close)'
);

// 5. station:buy
safeReplaceJS(
  `socket.on('station:buy', (data) => {
    const player = players.get(socket.id);
    if (!player || player.currentStation < 0) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
    if (!itemName) return;
    // Server-authoritative price lookup
    const stationPrices = getStationPrices(player.currentStation);`,
  `socket.on('station:buy', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player || player.currentStation < 0) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
    if (!itemName) return;
    // Server-authoritative price lookup
    const stationPrices = getStationPrices(player.currentStation);`,
  'Fix 5: try/catch station:buy (open)'
);
safeReplaceJS(
  `      socket.emit('station:error', { error: 'Insufficient credits' });
    }
  });

  socket.on('station:sell',`,
  `      socket.emit('station:error', { error: 'Insufficient credits' });
    }
    } catch (err) { console.error('[Socket] station:buy error:', err.message); }
  });

  socket.on('station:sell',`,
  'Fix 5b: try/catch station:buy (close)'
);

// 6. station:sell
safeReplaceJS(
  `socket.on('station:sell', (data) => {
    const player = players.get(socket.id);
    if (!player || player.currentStation < 0) return;`,
  `socket.on('station:sell', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player || player.currentStation < 0) return;`,
  'Fix 6: try/catch station:sell (open)'
);
safeReplaceJS(
  `    socket.emit('station:sold', { name: itemName, price, wallet: { ec: wallet.ec, sm: wallet.sm } });
  });

  // ── Cargo deposit`,
  `    socket.emit('station:sold', { name: itemName, price, wallet: { ec: wallet.ec, sm: wallet.sm } });
    } catch (err) { console.error('[Socket] station:sell error:', err.message); }
  });

  // ── Cargo deposit`,
  'Fix 6b: try/catch station:sell (close)'
);

// 7. cargo:deposit
safeReplaceJS(
  `socket.on('cargo:deposit', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
    if (!itemName) return;
    // Only allow known commodities`,
  `socket.on('cargo:deposit', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
    if (!itemName) return;
    // Only allow known commodities`,
  'Fix 7: try/catch cargo:deposit (open)'
);
// cargo:deposit ends with socket.emit then });
safeReplaceJS(
  `    socket.emit('cargo:deposited', { name: itemName, quantity: held + 1 });
  });

  // ── Game Save`,
  `    socket.emit('cargo:deposited', { name: itemName, quantity: held + 1 });
    } catch (err) { console.error('[Socket] cargo:deposit error:', err.message); }
  });

  // ── Game Save`,
  'Fix 7b: try/catch cargo:deposit (close)'
);

// 8. game:load — async handler without try/catch (unhandled rejection risk!)
safeReplaceJS(
  `socket.on('game:load', async () => {
    const player = players.get(socket.id);
    if (!player) return;
    // Players can only load their own saves (session-scoped auth)
    const saved = await fileStore.load(player.playerId);
    socket.emit('game:loaded', saved ? { ok: true, data: saved } : { ok: false });
  });`,
  `socket.on('game:load', async () => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      // Players can only load their own saves (session-scoped auth)
      const saved = await fileStore.load(player.playerId);
      socket.emit('game:loaded', saved ? { ok: true, data: saved } : { ok: false });
    } catch (err) { console.error('[Socket] game:load error:', err.message); socket.emit('game:loaded', { ok: false }); }
  });`,
  'Fix 8: try/catch game:load (async)'
);

// 9. player:sync
safeReplaceJS(
  `socket.on('player:sync', () => {
    const player = players.get(socket.id);
    if (!player) return;
    const econ = engine.getSystem('economy');
    const wallet = econ.getWallet(player.playerId);
    const activeQuests = [];
    for (const [qid, aq] of player.activeQuests) {
      activeQuests.push({ questId: qid, ...aq });
    }
    socket.emit('player:state', {
      playerId: player.playerId,
      wallet: { ec: wallet.ec, sm: wallet.sm },
      activeQuests,
    });
  });`,
  `socket.on('player:sync', () => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const econ = engine.getSystem('economy');
      const wallet = econ.getWallet(player.playerId);
      const activeQuests = [];
      for (const [qid, aq] of player.activeQuests) {
        activeQuests.push({ questId: qid, ...aq });
      }
      socket.emit('player:state', {
        playerId: player.playerId,
        wallet: { ec: wallet.ec, sm: wallet.sm },
        activeQuests,
      });
    } catch (err) { console.error('[Socket] player:sync error:', err.message); }
  });`,
  'Fix 9: try/catch player:sync'
);

// 10. rebirth:perform
safeReplaceJS(
  `socket.on('rebirth:perform', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const rebirthSys = engine.getSystem('rebirth');`,
  `socket.on('rebirth:perform', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player) return;
    const rebirthSys = engine.getSystem('rebirth');`,
  'Fix 10: try/catch rebirth:perform (open)'
);
safeReplaceJS(
  `      statusScore: rebirthSys.computeStatusScore(chosenNpc),
    });
  });

  socket.on('starmap:request',`,
  `      statusScore: rebirthSys.computeStatusScore(chosenNpc),
    });
    } catch (err) { console.error('[Socket] rebirth:perform error:', err.message); }
  });

  socket.on('starmap:request',`,
  'Fix 10b: try/catch rebirth:perform (close)'
);

// 11. starmap:request
safeReplaceJS(
  `socket.on('starmap:request', () => {
    const proc = engine.getSystem('procedural');
    const systems = [];
    for (let i = 0; i < 40; i++) {
      systems.push(proc.generateStarSystem(\`system-\${i}\`));
    }
    socket.emit('starmap:data', { systems });
  });`,
  `socket.on('starmap:request', () => {
    try {
      const proc = engine.getSystem('procedural');
      const systems = [];
      for (let i = 0; i < 40; i++) {
        systems.push(proc.generateStarSystem(\`system-\${i}\`));
      }
      socket.emit('starmap:data', { systems });
    } catch (err) { console.error('[Socket] starmap:request error:', err.message); }
  });`,
  'Fix 11: try/catch starmap:request'
);

// 12. quests:request
safeReplaceJS(
  `socket.on('quests:request', () => {
    const proc = engine.getSystem('procedural');
    const questHooks = [];
    for (let i = 0; i < 5; i++) {
      questHooks.push(proc.generateQuestHook());`,
  `socket.on('quests:request', () => {
    try {
    const proc = engine.getSystem('procedural');
    const questHooks = [];
    for (let i = 0; i < 5; i++) {
      questHooks.push(proc.generateQuestHook());`,
  'Fix 12: try/catch quests:request (open)'
);
safeReplaceJS(
  `    socket.emit('quests:data', { quests: questHooks });
  });

  socket.on('disconnect',`,
  `    socket.emit('quests:data', { quests: questHooks });
    } catch (err) { console.error('[Socket] quests:request error:', err.message); }
  });

  socket.on('disconnect',`,
  'Fix 12b: try/catch quests:request (close)'
);

fs.writeFileSync(jsPath, js, 'utf8');
console.log(`\n=== SERVER: ${sok} applied, ${sfail} failed ===`);
console.log(`\n=== TOTAL: ${ok + sok} applied, ${fail + sfail} failed ===`);

if (fail + sfail > 0) process.exit(1);
