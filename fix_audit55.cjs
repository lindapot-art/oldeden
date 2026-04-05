/**
 * Audit 55 — Polish pass: XSS escaping + server socket try/catch
 * 
 * Client (public/index.html):
 *   1. Past-life dialogue: escape life.name
 *   2. renderCharSheet: escape player.name, faction.name
 *   3. Station name: escape sys.name
 *   4. renderSystemDetail: escape s.name, s.starType, faction.name, resources, hazards
 *   5. Karma wheel: escape roll.factionName
 *   6. Bridge inventory: escape item.name
 *   7. Quest tracker: escape o.type, o.target, q.title, q.summary
 *   8. Market dropdown: escape MARKET_ITEMS names
 *
 * Server (src/core/index.js):
 *   9. Wrap socket handlers in try/catch
 *  10. Rate limiter: notify client on drop
 */

const fs = require('fs');
const path = require('path');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let ok = 0, fail = 0;

// ── CLIENT PATCHES ──────────────────────────────────────────────────────────
const htmlPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

function safeReplace(oldStr, newStr, label) {
  const old = cr(oldStr);
  const nw = cr(newStr);
  if (!html.includes(old)) {
    console.error(`[FAIL] ${label} — old string not found`);
    fail++;
    return;
  }
  const count = html.split(old).length - 1;
  if (count > 1) {
    console.error(`[FAIL] ${label} — ${count} matches (expected 1)`);
    fail++;
    return;
  }
  html = html.replace(old, nw);
  console.log(`[OK] ${label}`);
  ok++;
}

// 1. Past-life dialogue: life.name unescaped
safeReplace(
  `dlg.innerHTML = '<div style="color:var(--gold);font-size:0.9rem;margin-bottom:6px">' + life.name + ' speaks:</div>' +`,
  `dlg.innerHTML = '<div style="color:var(--gold);font-size:0.9rem;margin-bottom:6px">' + _escHtml(life.name) + ' speaks:</div>' +`,
  'Fix 1: past-life dialogue life.name'
);

// 2a. renderCharSheet: state.player.name unescaped
safeReplace(
  `<div class="stat-row" style="font-size:0.8rem;">Name <span style="color:var(--gold)">\${state.player.name}</span></div>`,
  `<div class="stat-row" style="font-size:0.8rem;">Name <span style="color:var(--gold)">\${_escHtml(state.player.name)}</span></div>`,
  'Fix 2a: charSheet player.name'
);

// 2b. renderCharSheet: faction.name unescaped
safeReplace(
  `<div class="stat-row" style="font-size:0.8rem;">Faction <span style="color:\${faction?.color || '#888'}">\${faction?.name || 'None'}</span></div>`,
  `<div class="stat-row" style="font-size:0.8rem;">Faction <span style="color:\${faction?.color || '#888'}">\${_escHtml(faction?.name || 'None')}</span></div>`,
  'Fix 2b: charSheet faction.name'
);

// 3. Station name: sys.name unescaped
safeReplace(
  "document.getElementById('station-name').innerHTML = `&#9968; ${sys ? sys.name : 'Unknown'} Station`;",
  "document.getElementById('station-name').innerHTML = `&#9968; ${_escHtml(sys ? sys.name : 'Unknown')} Station`;",
  'Fix 3: station name sys.name'
);

// 4a. renderSystemDetail: s.name
safeReplace(
  `<h3>\${s.name} \${isCurrent ? '<span style="color:var(--gold);font-size:0.75rem">(Current)</span>' : ''}</h3>`,
  `<h3>\${_escHtml(s.name)} \${isCurrent ? '<span style="color:var(--gold);font-size:0.75rem">(Current)</span>' : ''}</h3>`,
  'Fix 4a: systemDetail s.name'
);

// 4b. renderSystemDetail: s.starType
safeReplace(
  `<p>Star: \${s.starType}</p>`,
  `<p>Star: \${_escHtml(s.starType)}</p>`,
  'Fix 4b: systemDetail s.starType'
);

// 4c. renderSystemDetail: faction.name
safeReplace(
  `<p>Faction: <span style="color:\${faction.color}">\${faction.name}</span></p>`,
  `<p>Faction: <span style="color:\${faction.color}">\${_escHtml(faction.name)}</span></p>`,
  'Fix 4c: systemDetail faction.name'
);

// 4d. renderSystemDetail: resources
safeReplace(
  '<div>${(s.resources||[]).map(r => `<span class="tag">${r}</span>`).join(\'\')}</div>',
  '<div>${(s.resources||[]).map(r => `<span class="tag">${_escHtml(r)}</span>`).join(\'\')}</div>',
  'Fix 4d: systemDetail resources'
);

// 4e. renderSystemDetail: hazards
safeReplace(
  `s.hazards.map(h => \`<span class="tag" style="color:var(--warn);border-color:rgba(255,170,0,0.2);background:rgba(255,170,0,0.06)">\${h}</span>\`)`,
  `s.hazards.map(h => \`<span class="tag" style="color:var(--warn);border-color:rgba(255,170,0,0.2);background:rgba(255,170,0,0.06)">\${_escHtml(h)}</span>\`)`,
  'Fix 4e: systemDetail hazards'
);

// 5. Karma wheel: roll.factionName unescaped
safeReplace(
  `factionEl.innerHTML = 'Faction: <span style="color:' + roll.factionColor + '">' + roll.factionName + '</span>';`,
  `factionEl.innerHTML = 'Faction: <span style="color:' + roll.factionColor + '">' + _escHtml(roll.factionName) + '</span>';`,
  'Fix 5: karma factionName'
);

// 6. Bridge inventory: item.name unescaped
safeReplace(
  `? state.inventory.map(item => \`<div style="font-size:0.75rem;color:var(--muted);padding:2px 0;border-bottom:1px solid #111">\${item.name} <span style="float:right">x\${item.quantity||1}</span></div>\`).join('')`,
  `? state.inventory.map(item => \`<div style="font-size:0.75rem;color:var(--muted);padding:2px 0;border-bottom:1px solid #111">\${_escHtml(item.name)} <span style="float:right">x\${item.quantity||1}</span></div>\`).join('')`,
  'Fix 6: bridge inventory item.name'
);

// 7a. Quest tracker: o.type and o.target unescaped
safeReplace(
  `return \`<div style="margin-top:4px;font-size:0.7rem;color:var(--muted)">\${o.type}: \${o.target === '*' ? 'any' : o.target}`,
  `return \`<div style="margin-top:4px;font-size:0.7rem;color:var(--muted)">\${_escHtml(o.type)}: \${o.target === '*' ? 'any' : _escHtml(o.target)}`,
  'Fix 7a: quest tracker o.type/o.target'
);

// 7b. Quest tracker: q.title, q.summary unescaped
safeReplace(
  `qt.innerHTML += \`<div class="quest-item"><div class="qt">\${q.title || q.name || 'Mission'}</div>\${q.summary || ''}\${progressHtml}<br/><span style="color:var(--gold)">\${q.reward || 0} EC</span></div>\`;`,
  `qt.innerHTML += \`<div class="quest-item"><div class="qt">\${_escHtml(q.title || q.name || 'Mission')}</div>\${_escHtml(q.summary || '')}\${progressHtml}<br/><span style="color:var(--gold)">\${q.reward || 0} EC</span></div>\`;`,
  'Fix 7b: quest tracker q.title/q.summary'
);

// 8. Market dropdown: MARKET_ITEMS names unescaped
safeReplace(
  'MARKET_ITEMS.map(i => `<option value="${i.name}">${i.name}</option>`).join(\'\')',
  'MARKET_ITEMS.map(i => `<option value="${_escHtml(i.name)}">${_escHtml(i.name)}</option>`).join(\'\')',
  'Fix 8: market dropdown MARKET_ITEMS'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`\n=== CLIENT: ${ok} applied, ${fail} failed ===\n`);

// ── SERVER PATCHES ──────────────────────────────────────────────────────────
const jsPath = path.join(__dirname, 'src', 'core', 'index.js');
let js = fs.readFileSync(jsPath, 'utf8');
let sok = 0, sfail = 0;

function safeReplaceJS(oldStr, newStr, label) {
  const old = cr(oldStr);
  const nw = cr(newStr);
  if (!js.includes(old)) {
    console.error(`[FAIL] ${label} — old string not found`);
    sfail++;
    return;
  }
  const count = js.split(old).length - 1;
  if (count > 1) {
    console.error(`[FAIL] ${label} — ${count} matches (expected 1)`);
    sfail++;
    return;
  }
  js = js.replace(old, nw);
  console.log(`[OK] ${label}`);
  sok++;
}

// 9. Wrap socket handlers in try/catch — death:report
safeReplaceJS(
  `socket.on('death:report', (data) => {
    const name = typeof data?.name === 'string' ? data.name.slice(0, 30) : 'Unknown';
    const cause = typeof data?.cause === 'string' ? data.cause.slice(0, 50) : 'the void';
    const text = \`\${name} was destroyed — \${cause}\`;
    io.emit('death:feed', { type: 'death', text });
  });`,
  `socket.on('death:report', (data) => {
    try {
      const name = typeof data?.name === 'string' ? data.name.slice(0, 30) : 'Unknown';
      const cause = typeof data?.cause === 'string' ? data.cause.slice(0, 50) : 'the void';
      const text = \`\${name} was destroyed — \${cause}\`;
      io.emit('death:feed', { type: 'death', text });
    } catch (err) { console.error('[Socket] death:report error:', err.message); }
  });`,
  'Fix 9a: try/catch death:report'
);

// 9b. quest:accept
safeReplaceJS(
  `socket.on('quest:accept', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const questId = typeof data?.questId === 'string' ? data.questId : '';
    const def = STARTER_QUESTS.find(q => q.id === questId);
    if (!def || player.activeQuests.has(questId)) return;
    if (player.activeQuests.size >= 5) {
      socket.emit('quest:error', { error: 'Max 5 active quests' });
      return;
    }
    const instance = {
      ...def,
      objectives: def.objectives.map(o => ({ ...o, current: 0 })),
      completed: false,
      acceptedAt: Date.now(),
    };
    player.activeQuests.set(questId, instance);
    socket.emit('quest:accepted', { questId, quest: instance });
  });`,
  `socket.on('quest:accept', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const questId = typeof data?.questId === 'string' ? data.questId : '';
      const def = STARTER_QUESTS.find(q => q.id === questId);
      if (!def || player.activeQuests.has(questId)) return;
      if (player.activeQuests.size >= 5) {
        socket.emit('quest:error', { error: 'Max 5 active quests' });
        return;
      }
      const instance = {
        ...def,
        objectives: def.objectives.map(o => ({ ...o, current: 0 })),
        completed: false,
        acceptedAt: Date.now(),
      };
      player.activeQuests.set(questId, instance);
      socket.emit('quest:accepted', { questId, quest: instance });
    } catch (err) { console.error('[Socket] quest:accept error:', err.message); }
  });`,
  'Fix 9b: try/catch quest:accept'
);

// 9c. quest:list
safeReplaceJS(
  `socket.on('quest:list', () => {
    const player = players.get(socket.id);
    if (!player) return;
    const active = [];
    for (const [qid, aq] of player.activeQuests) {
      active.push({ questId: qid, ...aq });
    }
    socket.emit('quest:active', { quests: active });
  });`,
  `socket.on('quest:list', () => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const active = [];
      for (const [qid, aq] of player.activeQuests) {
        active.push({ questId: qid, ...aq });
      }
      socket.emit('quest:active', { quests: active });
    } catch (err) { console.error('[Socket] quest:list error:', err.message); }
  });`,
  'Fix 9c: try/catch quest:list'
);

// 9d. system:visit
safeReplaceJS(
  `socket.on('system:visit', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const systemId = typeof data?.systemId === 'string' ? data.systemId : '';
    if (!systemId || player.visitedSystems.has(systemId)) return;
    player.visitedSystems.add(systemId);`,
  `socket.on('system:visit', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const systemId = typeof data?.systemId === 'string' ? data.systemId : '';
      if (!systemId || player.visitedSystems.has(systemId)) return;
      player.visitedSystems.add(systemId);`,
  'Fix 9d: try/catch system:visit (open)'
);
// Close the try/catch for system:visit — find the closing }); of the handler
// The system:visit handler ends with a quest:complete emit block then }); at the handler level
// Let me find the pattern. Actually the handler ends at: socket.on('station:enter'
// I need to find the section between system:visit and station:enter

safeReplaceJS(
  `        socket.emit('quest:complete', { questId: qid, rewards: rew, wallet: { ec: wallet.ec, sm: wallet.sm } });
      }
    }
  });

  // ── Station: Get Prices`,
  `        socket.emit('quest:complete', { questId: qid, rewards: rew, wallet: { ec: wallet.ec, sm: wallet.sm } });
      }
    }
    } catch (err) { console.error('[Socket] system:visit error:', err.message); }
  });

  // ── Station: Get Prices`,
  'Fix 9d2: try/catch system:visit (close)'
);

// 9e. station:enter
safeReplaceJS(
  `socket.on('station:enter', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const raw = typeof data?.systemIndex === 'number' ? data.systemIndex : 0;
    const systemIdx = Math.max(0, Math.min(39, Math.floor(raw)));
    player.currentStation = systemIdx;
    const prices = getStationPrices(systemIdx);
    socket.emit('station:prices', { prices, systemIndex: systemIdx });
  });`,
  `socket.on('station:enter', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const raw = typeof data?.systemIndex === 'number' ? data.systemIndex : 0;
      const systemIdx = Math.max(0, Math.min(39, Math.floor(raw)));
      player.currentStation = systemIdx;
      const prices = getStationPrices(systemIdx);
      socket.emit('station:prices', { prices, systemIndex: systemIdx });
    } catch (err) { console.error('[Socket] station:enter error:', err.message); }
  });`,
  'Fix 9e: try/catch station:enter'
);

// 10. Rate limiter: notify client instead of silent drop
safeReplaceJS(
  `socket.use(([eventName], next) => {
    if (!rateLimiter(eventName)) {
      console.warn(\`[RateLimit] \${socket.id} exceeded limit for \${eventName}\`);
      return;
    }
    next();
  });`,
  `socket.use(([eventName], next) => {
    if (!rateLimiter(eventName)) {
      console.warn(\`[RateLimit] \${socket.id} exceeded limit for \${eventName}\`);
      socket.emit('rate:limited', { event: eventName });
      return;
    }
    next();
  });`,
  'Fix 10: rate limiter client notification'
);

fs.writeFileSync(jsPath, js, 'utf8');
console.log(`\n=== SERVER: ${sok} applied, ${sfail} failed ===`);
console.log(`\n=== TOTAL: ${ok + sok} applied, ${fail + sfail} failed ===`);

if (fail + sfail > 0) {
  process.exit(1);
}
