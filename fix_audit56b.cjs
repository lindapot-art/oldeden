/**
 * Audit 56b — Second Patch
 * Fixes: BossSystem.createNPC/removeNPC, 3 async race condition guards
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
//  FIX 9: NPCSystem — add createNPC() and removeNPC() methods
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'src/systems/NPCSystem.js',
  cr(`  getNPC(id) {\n    return this._npcs.get(id);\n  }`),
  cr(`  /**\n   * Register an external NPC (e.g. boss) directly into the NPC map.\n   * @param {object} props — must include at least { id }\n   * @returns {object} the stored NPC record\n   */\n  createNPC(props) {\n    if (!props || !props.id) throw new Error('[NPCSystem] createNPC requires { id }');\n    const npc = {\n      id: props.id,\n      genome: props.genome || null,\n      sectorId: props.sectorId || 'unknown',\n      credits: props.credits || 0,\n      ageYears: props.ageYears || 0,\n      skills: {},\n      reputation: 0,\n      relationships: [],\n      isActive: true,\n      isPlayerAvatar: false,\n      isDeceasedAvatar: false,\n      causeOfDeath: null,\n      isFractured: false,\n      isAscended: false,\n      spawnedAt: Date.now(),\n      ...props,\n    };\n    this._npcs.set(npc.id, npc);\n    this._engine.events.emit('npc:spawned', { npcId: npc.id, sectorId: npc.sectorId });\n    return npc;\n  }\n\n  /**\n   * Remove an NPC from the registry entirely.\n   * @param {string} id\n   * @returns {boolean} true if removed\n   */\n  removeNPC(id) {\n    const npc = this._npcs.get(id);\n    if (!npc) return false;\n    this._npcs.delete(id);\n    this._engine.events.emit('npc:removed', { npcId: id });\n    return true;\n  }\n\n  getNPC(id) {\n    return this._npcs.get(id);\n  }`),
  'Fix 9: add createNPC() and removeNPC() to NPCSystem'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 10: spawnPolicePatrol — c.active guard after await
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`    const model = await loadGLBModel(modelKey);\n    const patrol = model.clone();`),
  cr(`    const model = await loadGLBModel(modelKey);\n    if (!c.active) return; // Guard: player exited during async load\n    const patrol = model.clone();`),
  'Fix 10: spawnPolicePatrol c.active guard'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 11: spawnStationModel — c.active guard after await
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`    const model = await loadGLBModel(stationKey);\n    const inst = model.clone();`),
  cr(`    const model = await loadGLBModel(stationKey);\n    if (!c.active) return; // Guard: player exited during async load\n    const inst = model.clone();`),
  'Fix 11: spawnStationModel c.active guard'
);

// ═══════════════════════════════════════════════════════════════════
//  FIX 12: replaceShipWithGLB — c.active guard after await
// ═══════════════════════════════════════════════════════════════════
safeReplace(
  'public/index.html',
  cr(`    const model = await loadGLBModel(PLAYER_SHIP_MODEL);\n    playerShipGLB = model.clone();`),
  cr(`    const model = await loadGLBModel(PLAYER_SHIP_MODEL);\n    if (!c.active) { disposeObject(model); return; } // Guard: player exited during async load\n    playerShipGLB = model.clone();`),
  'Fix 12: replaceShipWithGLB c.active guard'
);

console.log(`\n=== Audit 56b Patch Complete ===`);
console.log(`Applied: ${applied} | Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
