/**
 * Audit 59b — Server-side fixes (src/core/index.js + systems)
 *
 * Fix1  (HIGH)  Disconnect — clean up 6 leaked system Maps
 * Fix2  (HIGH)  /api/game/load/:id — require active socket session
 * Fix3  (MEDIUM) rebirth:sync — validate genome values + faction whitelist
 * Fix4  (MEDIUM) death:report — use server-authoritative player name
 * Fix5  (MEDIUM) game:save whitelist — remove economy/player (shadow server state)
 * Fix6  (LOW)  system:visit — validate systemId format
 */
const fs = require('fs');
const path = require('path');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let errors = 0;
let applied = 0;

function patch(filePath, oldStr, newStr, label) {
  let src = fs.readFileSync(filePath, 'utf8');
  const target = cr(oldStr);
  const idx = src.indexOf(target);
  if (idx === -1) {
    console.error(`FAIL [${label}] — anchor not found in ${path.basename(filePath)}`);
    errors++;
    return;
  }
  if (src.indexOf(target, idx + 1) !== -1) {
    console.error(`FAIL [${label}] — ambiguous anchor in ${path.basename(filePath)}`);
    errors++;
    return;
  }
  src = src.slice(0, idx) + cr(newStr) + src.slice(idx + target.length);
  fs.writeFileSync(filePath, src, 'utf8');
  applied++;
  console.log(`OK   [${label}]`);
}

const IDX = path.join(__dirname, 'src', 'core', 'index.js');

// ═══════════════════════════════════════════════════════════════════════
// FIX 1 (HIGH): Disconnect — clean up 6 system Maps that leak per player
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `    // Clean up economy state to prevent memory leak
    if (player) {
      const econ = engine.getSystem('economy');
      econ.removePlayer?.(player.playerId);
    }`,
  `    // Clean up all system state to prevent memory leaks
    if (player) {
      const pid = player.playerId;
      const econ = engine.getSystem('economy');
      econ.removePlayer?.(pid);
      // Clean up per-player Maps in remaining systems
      const factionSys = engine.getSystem('factions');
      if (factionSys?._reputation) factionSys._reputation.delete(pid);
      const skillSys = engine.getSystem('skills');
      if (skillSys?._players) skillSys._players.delete(pid);
      const invSys = engine.getSystem('inventory');
      if (invSys?._inventories) invSys._inventories.delete(pid);
      const questSys = engine.getSystem('quests');
      if (questSys?._players) questSys._players.delete(pid);
      const cosmeticsSys = engine.getSystem('cosmetics');
      if (cosmeticsSys?._playerInventory) cosmeticsSys._playerInventory.delete(pid);
      const cycleSys = engine.getSystem('cyclepass');
      if (cycleSys?._playerProgress) cycleSys._playerProgress.delete(pid);
    }`,
  'Fix1-disconnect-cleanup-all-systems'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 2 (HIGH): /api/game/load/:id — require active socket session
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
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
  `app.get('/api/game/load/:id', async (req, res) => {
  try {
    // Authorization: only allow loading if the requesting player ID matches an active session
    const requestedId = req.params.id;
    let authorized = false;
    for (const [, player] of players) {
      if (player.playerId === requestedId) { authorized = true; break; }
    }
    if (!authorized) return res.status(403).json({ error: 'Unauthorized — no active session for this player' });
    const data = await fileStore.load(requestedId);
    if (!data) return res.status(404).json({ error: 'Save not found' });
    res.json(data);
  } catch (e) {
    console.error('[API] Load error:', e.message);
    res.status(500).json({ error: 'Failed to load save' });
  }
});`,
  'Fix2-api-load-auth'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 3 (MEDIUM): rebirth:sync — validate genome + faction
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `      if (typeof data.name === 'string') player.name = data.name.slice(0, 50);
      if (typeof data.faction === 'string') player.faction = data.faction.slice(0, 50);
      if (Array.isArray(data.genome) && data.genome.length === 7) player.genome = data.genome.map(Number);`,
  `      if (typeof data.name === 'string') player.name = data.name.slice(0, 50);
      if (typeof data.faction === 'string' && FACTIONS.some(f => f.id === data.faction)) player.faction = data.faction;
      if (Array.isArray(data.genome) && data.genome.length === 7) {
        const validated = data.genome.map(v => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 128; });
        player.genome = validated;
      }`,
  'Fix3-rebirth-sync-validation'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 4 (MEDIUM): death:report — use server-authoritative name
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `  socket.on('death:report', (data) => {
    try {
      const name = typeof data?.name === 'string' ? data.name.slice(0, 30) : 'Unknown';
      const cause = typeof data?.cause === 'string' ? data.cause.slice(0, 50) : 'the void';
      const text = ` + '`${name}' + ` was destroyed — ` + '${cause}`' + `;
      io.emit('death:feed', { type: 'death', text });`,
  `  socket.on('death:report', (data) => {
    try {
      const player = players.get(socket.id);
      const name = player ? player.name.slice(0, 30) : 'Unknown';
      const cause = typeof data?.cause === 'string' ? data.cause.slice(0, 50).replace(/[<>&"']/g, '') : 'the void';
      const text = ` + '`${name}' + ` was destroyed — ` + '${cause}`' + `;
      io.emit('death:feed', { type: 'death', text });`,
  'Fix4-death-report-server-name'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 5 (MEDIUM): game:save — remove economy/player from whitelist
// These shadow server-authoritative wallet/player state
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `        const allowedKeys = ['position', 'rotation', 'currentSystem', 'settings',
          'combat', 'inventory', 'quests', 'upgrades', 'flight', 'pastLives',
          'skills', 'soulMemory', 'economy', 'activeWeapon', 'persistentItems',
          'currentSkin', 'market', 'insuredItemId', 'chatbot', 'factionRep',
          'ship', 'location', 'player'];`,
  `        const allowedKeys = ['position', 'rotation', 'currentSystem', 'settings',
          'combat', 'inventory', 'quests', 'upgrades', 'flight', 'pastLives',
          'skills', 'soulMemory', 'activeWeapon', 'persistentItems',
          'currentSkin', 'market', 'insuredItemId', 'chatbot', 'factionRep',
          'ship', 'location'];`,
  'Fix5-save-whitelist-remove-economy-player'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 6 (LOW): system:visit — validate systemId format
// ═══════════════════════════════════════════════════════════════════════
patch(IDX,
  `      const systemId = typeof data?.systemId === 'string' ? data.systemId : '';
      if (!systemId || player.visitedSystems.has(systemId)) return;`,
  `      const systemId = typeof data?.systemId === 'string' ? data.systemId : '';
      if (!systemId || !/^system-\\d{1,2}$/.test(systemId) || player.visitedSystems.has(systemId)) return;`,
  'Fix6-system-visit-validate-id'
);

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log(`\n=== Audit 59b (server): ${applied} applied, ${errors} failed ===`);
if (errors > 0) { process.exit(1); }
