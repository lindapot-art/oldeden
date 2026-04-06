/**
 * Audit 60 — Server-side Patches
 *
 * Fix 1: NPC reaper — prune dead NPCs older than 10 minutes when map > 500
 * Fix 2: starmap:request — cache star systems once instead of regenerating per call
 */

const fs = require('fs');
const path = require('path');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

// ── Fix 1: NPC reaper ──
const NPC_FILE = path.join(__dirname, 'src', 'systems', 'NPCSystem.js');
let npcSrc = fs.readFileSync(NPC_FILE, 'utf8');
const npcOrigLen = npcSrc.length;
let applied = 0;
let failed = 0;

function safeReplaceFile(label, srcRef, oldStr, newStr) {
  const o = cr(oldStr);
  const n = cr(newStr);
  if (!srcRef.value.includes(o)) {
    console.error(`FAIL [${label}]: old string not found`);
    failed++;
    return;
  }
  const count = srcRef.value.split(o).length - 1;
  if (count > 1) {
    console.error(`FAIL [${label}]: ${count} matches (expected 1)`);
    failed++;
    return;
  }
  srcRef.value = srcRef.value.replace(o, n);
  console.log(`OK   [${label}]`);
  applied++;
}

const npcRef = { value: npcSrc };
safeReplaceFile('Fix1-npc-reaper', npcRef,
  `  tick(deltaMs) {
    this._accumulatedTime += deltaMs;

    // Simulate NPC ageing once per in-game day (optional batching)
    const inGameYearsPassed = (deltaMs / 1000) * IN_GAME_YEARS_PER_SECOND;

    for (const npc of this._npcs.values()) {
      if (npc.isActive) {
        this._simulateNPC(npc, inGameYearsPassed, deltaMs);
      }
    }
  }`,
  `  tick(deltaMs) {
    this._accumulatedTime += deltaMs;

    // Simulate NPC ageing once per in-game day (optional batching)
    const inGameYearsPassed = (deltaMs / 1000) * IN_GAME_YEARS_PER_SECOND;

    for (const npc of this._npcs.values()) {
      if (npc.isActive) {
        this._simulateNPC(npc, inGameYearsPassed, deltaMs);
      }
    }

    // Reaper: prune dead non-player NPCs older than 10 minutes when map grows large
    if (this._npcs.size > 500) {
      const cutoff = Date.now() - 600_000;
      for (const [id, npc] of this._npcs) {
        if (!npc.isActive && !npc.isPlayerAvatar && !npc.isDeceasedAvatar && !npc.isAscended && npc.spawnedAt < cutoff) {
          this._npcs.delete(id);
        }
      }
    }
  }`
);

fs.writeFileSync(NPC_FILE, npcRef.value, 'utf8');
console.log(`NPCSystem: ${npcOrigLen} → ${npcRef.value.length}`);

// ── Fix 2: starmap:request cache ──
const IDX_FILE = path.join(__dirname, 'src', 'core', 'index.js');
let idxSrc = fs.readFileSync(IDX_FILE, 'utf8');
const idxOrigLen = idxSrc.length;
const idxRef = { value: idxSrc };

safeReplaceFile('Fix2-starmap-cache', idxRef,
  `  socket.on('starmap:request', () => {
    try {
      const proc = engine.getSystem('procedural');
      const systems = [];
      for (let i = 0; i < 40; i++) {
        systems.push(proc.generateStarSystem(\`system-$\{i}\`));
      }
      socket.emit('starmap:data', { systems });
    } catch (err) { console.error('[Socket] starmap:request error:', err.message); }
  });`,
  `  socket.on('starmap:request', () => {
    try {
      // Cache star systems once — they are deterministic and don't change
      if (!engine._starmapCache) {
        const proc = engine.getSystem('procedural');
        const systems = [];
        for (let i = 0; i < 40; i++) {
          systems.push(proc.generateStarSystem(\`system-$\{i}\`));
        }
        engine._starmapCache = { systems };
      }
      socket.emit('starmap:data', engine._starmapCache);
    } catch (err) { console.error('[Socket] starmap:request error:', err.message); }
  });`
);

fs.writeFileSync(IDX_FILE, idxRef.value, 'utf8');
console.log(`index.js: ${idxOrigLen} → ${idxRef.value.length}`);

console.log(`\n--- AUDIT 60 SERVER PATCHES ---`);
console.log(`Applied: ${applied}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
