#!/usr/bin/env node
/**
 * Audit 37 — Server-side security, reliability & logic fixes (CRLF-aware)
 */

const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;

function cr(s) { return s.replace(/\n/g, '\r\n'); }

function safeReplace(file, oldStr, newStr, label) {
  const abs = path.resolve(__dirname, file);
  let content = fs.readFileSync(abs, 'utf-8');
  const old = cr(oldStr);
  const idx = content.indexOf(old);
  if (idx === -1) {
    console.error(`  \u2718 [${label}] old string not found in ${file}`);
    fail++;
    return;
  }
  const secondIdx = content.indexOf(old, idx + 1);
  if (secondIdx !== -1) {
    console.error(`  \u2718 [${label}] multiple matches in ${file}`);
    fail++;
    return;
  }
  content = content.slice(0, idx) + cr(newStr) + content.slice(idx + old.length);
  fs.writeFileSync(abs, content, 'utf-8');
  console.log(`  \u2714 [${label}] OK`);
  ok++;
}

// F1 — cargo:deposit: Add max cargo cap to prevent free-mint abuse
safeReplace(
  'src/core/index.js',
  `  // \u2500\u2500 Cargo deposit (for client-registered items like mined ore) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  socket.on('cargo:deposit', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
    if (!itemName) return;
    // Only allow known commodities
    if (!COMMODITIES.find(c => c.name === itemName)) return;
    player.cargo.set(itemName, (player.cargo.get(itemName) || 0) + 1);
    socket.emit('cargo:deposited', { name: itemName, quantity: player.cargo.get(itemName) });
  });`,
  `  // \u2500\u2500 Cargo deposit (for client-registered items like mined ore) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  socket.on('cargo:deposit', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
    if (!itemName) return;
    // Only allow known commodities
    if (!COMMODITIES.find(c => c.name === itemName)) return;
    // Cap per-item cargo to prevent free-mint abuse
    const held = player.cargo.get(itemName) || 0;
    if (held >= 50) {
      socket.emit('cargo:error', { error: 'Cargo hold full for this item' });
      return;
    }
    player.cargo.set(itemName, held + 1);
    socket.emit('cargo:deposited', { name: itemName, quantity: held + 1 });
  });`,
  'F1-cargo-deposit-cap'
);

// F2 — Extend rate limits to cover unprotected events
safeReplace(
  'src/core/index.js',
  `  'game:save':       { max: 1,  windowMs: 3000 },
  'game:load':       { max: 1,  windowMs: 3000 },
  'quest:accept':    { max: 5,  windowMs: 1000 },
  'cargo:deposit':   { max: 3,  windowMs: 1000 },
};`,
  `  'game:save':       { max: 1,  windowMs: 3000 },
  'game:load':       { max: 1,  windowMs: 3000 },
  'quest:accept':    { max: 5,  windowMs: 1000 },
  'cargo:deposit':   { max: 3,  windowMs: 1000 },
  'death:report':    { max: 2,  windowMs: 5000 },
  'system:visit':    { max: 3,  windowMs: 1000 },
  'starmap:request': { max: 2,  windowMs: 5000 },
  'quests:request':  { max: 2,  windowMs: 5000 },
  'player:sync':     { max: 3,  windowMs: 1000 },
};`,
  'F2-rate-limits-extend'
);

// F3 — REST /api/game/load/:id: try/catch for Express 4 async safety
safeReplace(
  'src/core/index.js',
  `app.get('/api/game/load/:id', async (req, res) => {
  const data = await fileStore.load(req.params.id);
  if (!data) return res.status(404).json({ error: 'Save not found' });
  res.json(data);
});`,
  `app.get('/api/game/load/:id', async (req, res) => {
  try {
    const data = await fileStore.load(req.params.id);
    if (!data) return res.status(404).json({ error: 'Save not found' });
    res.json(data);
  } catch (e) {
    console.error('[API] Load error:', e.message);
    res.status(500).json({ error: 'Failed to load save' });
  }
});`,
  'F3-load-try-catch'
);

// F4 — station:enter: Bounds check systemIndex (0-39)
safeReplace(
  'src/core/index.js',
  `  socket.on('station:enter', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const systemIdx = typeof data?.systemIndex === 'number' ? data.systemIndex : 0;
    player.currentStation = systemIdx;`,
  `  socket.on('station:enter', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const raw = typeof data?.systemIndex === 'number' ? data.systemIndex : 0;
    const systemIdx = Math.max(0, Math.min(39, Math.floor(raw)));
    player.currentStation = systemIdx;`,
  'F4-station-enter-bounds'
);

// F5 — rebirth:perform: Use debit/credit instead of direct wallet mutation
safeReplace(
  'src/core/index.js',
  `    // EC resets (belonged to old character), SM persists (premium currency)
    const wallet = econ.getWallet(player.playerId);
    wallet.ec = 500;`,
  `    // EC resets (belonged to old character), SM persists (premium currency)
    const wallet = econ.getWallet(player.playerId);
    if (wallet.ec > 500) {
      econ.debit(player.playerId, 'ec', wallet.ec - 500);
    } else if (wallet.ec < 500) {
      econ.credit(player.playerId, 'ec', 500 - wallet.ec);
    }`,
  'F5-rebirth-wallet-proper'
);

// F6 — Socket game:save: Use server-authoritative state
safeReplace(
  'src/core/index.js',
  `  socket.on('game:save', async (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    try {
      await fileStore.save(player.playerId, data);
      socket.emit('game:saved', { ok: true, playerId: player.playerId });
    } catch (e) {
      socket.emit('game:saved', { ok: false, error: e.message });
    }
  });`,
  `  socket.on('game:save', async (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    try {
      // Save server-authoritative state \u2014 ignore client wallet/currency data
      const econ = engine.getSystem('economy');
      const w = econ.getWallet(player.playerId);
      const serverState = {
        playerId: player.playerId,
        name: player.name,
        faction: player.faction,
        genome: player.genome,
        wallet: { ec: w.ec, sm: w.sm },
        trades: player.trades,
        savedAt: Date.now(),
      };
      // Allow non-authoritative display data (position, settings, etc.)
      if (data && typeof data === 'object') {
        for (const key of ['position', 'rotation', 'currentSystem', 'settings']) {
          if (data[key] !== undefined) serverState[key] = data[key];
        }
      }
      await fileStore.save(player.playerId, serverState);
      socket.emit('game:saved', { ok: true, playerId: player.playerId });
    } catch (e) {
      socket.emit('game:saved', { ok: false, error: e.message });
    }
  });`,
  'F6-save-server-authoritative'
);

// F7 — Disconnect: Clean up EconomySystem maps
safeReplace(
  'src/core/index.js',
  `    players.delete(socket.id);
    console.log(\`[Socket.IO] Client disconnected: \${socket.id}\`);
  });
});`,
  `    // Clean up economy state to prevent memory leak
    if (player) {
      const econ = engine.getSystem('economy');
      econ.removePlayer?.(player.playerId);
    }
    players.delete(socket.id);
    console.log(\`[Socket.IO] Client disconnected: \${socket.id}\`);
  });
});`,
  'F7-disconnect-economy-cleanup'
);

// F8 — REST /api/game/save: Verify playerId belongs to active session
safeReplace(
  'src/core/index.js',
  `app.post('/api/game/save', async (req, res) => {
  try {
    const { playerId, data } = req.body;
    if (!playerId || typeof playerId !== 'string' || !data) {
      return res.status(400).json({ error: 'Missing playerId or data' });
    }
    await fileStore.save(playerId, data);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});`,
  `app.post('/api/game/save', async (req, res) => {
  try {
    const { playerId, data } = req.body;
    if (!playerId || typeof playerId !== 'string' || !data) {
      return res.status(400).json({ error: 'Missing playerId or data' });
    }
    // Verify playerId belongs to an active socket session
    let authorised = false;
    for (const [, p] of players) {
      if (p.playerId === playerId) { authorised = true; break; }
    }
    if (!authorised) {
      return res.status(403).json({ error: 'No active session for this player' });
    }
    await fileStore.save(playerId, data);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});`,
  'F8-rest-save-session-check'
);

// F9a — EconomySystem: Floor EC-to-SM exchange
safeReplace(
  'src/systems/EconomySystem.js',
  `  sellEcForSm(playerId, ecAmount) {
    const rate = BASE_EC_PER_SM_SELL * this._exchangeRateFactor;
    const smReceived = ecAmount / rate;
    const success = this.debit(playerId, CURRENCY.EC, ecAmount);
    if (success) this.credit(playerId, CURRENCY.SM, smReceived);
    return { success, smReceived: success ? smReceived : 0 };
  }`,
  `  sellEcForSm(playerId, ecAmount) {
    const rate = BASE_EC_PER_SM_SELL * this._exchangeRateFactor;
    const smReceived = Math.floor((ecAmount / rate) * 100) / 100;
    if (smReceived <= 0) return { success: false, smReceived: 0 };
    const success = this.debit(playerId, CURRENCY.EC, ecAmount);
    if (success) this.credit(playerId, CURRENCY.SM, smReceived);
    return { success, smReceived: success ? smReceived : 0 };
  }`,
  'F9a-floor-ec-to-sm'
);

// F9b — EconomySystem: Floor SM-to-EC exchange
safeReplace(
  'src/systems/EconomySystem.js',
  `  sellSmForEc(playerId, smAmount) {
    const rate = BASE_EC_PER_SM_BUY * this._exchangeRateFactor;
    const ecReceived = smAmount * rate;
    const success = this.debit(playerId, CURRENCY.SM, smAmount);
    if (success) this.credit(playerId, CURRENCY.EC, ecReceived);
    return { success, ecReceived: success ? ecReceived : 0 };
  }`,
  `  sellSmForEc(playerId, smAmount) {
    const rate = BASE_EC_PER_SM_BUY * this._exchangeRateFactor;
    const ecReceived = Math.floor(smAmount * rate);
    if (ecReceived <= 0) return { success: false, ecReceived: 0 };
    const success = this.debit(playerId, CURRENCY.SM, smAmount);
    if (success) this.credit(playerId, CURRENCY.EC, ecReceived);
    return { success, ecReceived: success ? ecReceived : 0 };
  }`,
  'F9b-floor-sm-to-ec'
);

// F10 — EconomySystem: Add removePlayer method
safeReplace(
  'src/systems/EconomySystem.js',
  `  async destroy() {}`,
  `  async destroy() {}

  /**
   * Remove all state for a disconnected player to prevent memory leaks.
   * @param {string} playerId
   */
  removePlayer(playerId) {
    this._wallets.delete(playerId);
    this._subscriptions.delete(playerId);
    this._shardInventories.delete(playerId);
    this._activeItems.delete(playerId);
  }`,
  'F10-economy-removePlayer'
);

// F11 — FileStore: Atomic write-then-rename
safeReplace(
  'src/persistence/FileStore.js',
  `  async save(playerId, data) {
    if (!VALID_ID.test(playerId)) throw new Error('Invalid player ID');
    const json = JSON.stringify(data);
    if (json.length > MAX_SAVE_SIZE) throw new Error('Save data too large');
    const filePath = path.join(this._saveDir, \`\${playerId}.json\`);
    await fs.writeFile(filePath, json, 'utf-8');
  }`,
  `  async save(playerId, data) {
    if (!VALID_ID.test(playerId)) throw new Error('Invalid player ID');
    const json = JSON.stringify(data);
    if (json.length > MAX_SAVE_SIZE) throw new Error('Save data too large');
    const filePath = path.join(this._saveDir, \`\${playerId}.json\`);
    // Atomic write: temp file + rename prevents corruption from concurrent writes
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, json, 'utf-8');
    await fs.rename(tmpPath, filePath);
  }`,
  'F11-filestore-atomic-write'
);

// F12 — AssetUploadRouter: try/catch around glbProcessor.inspect
safeReplace(
  'src/server/AssetUploadRouter.js',
  `      // Run glTF-Transform inspection on GLB/glTF files
      const ext = path.extname(f.originalname).toLowerCase();
      if (GLB_EXTENSIONS.has(ext)) {
        const report = await glbProcessor.inspect(f.path);
        entry.glbReport = report;
      }`,
  `      // Run glTF-Transform inspection on GLB/glTF files
      const ext = path.extname(f.originalname).toLowerCase();
      if (GLB_EXTENSIONS.has(ext)) {
        try {
          const report = await glbProcessor.inspect(f.path);
          entry.glbReport = report;
        } catch (inspectErr) {
          console.error('[AssetUpload] GLB inspection failed:', inspectErr.message);
          entry.glbReport = { error: 'Inspection failed', detail: inspectErr.message };
        }
      }`,
  'F12-glb-inspect-try-catch'
);

// Done
console.log(`\n  Audit 37 complete: ${ok} OK, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
