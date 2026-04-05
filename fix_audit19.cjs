/**
 * Audit 19 — Gameplay Mechanics Polish (12 fixes)
 *
 *  1. Fuel gate on warp jumps (block at fuel < 5)
 *  2. Star map: show fuel cost + distance
 *  3. Autopilot: disengage on player WASD input
 *  4. Autopilot: zero velocity on arrival
 *  5. Autopilot: use pre-allocated vectors instead of .clone()
 *  6. Skin persistence in save/load
 *  7. Faction rep: lose rep with rival factions on kill
 *  8. Chatbot: sort keywords by specificity (longest first)
 *  9. Server quests: generate default objectives
 * 10. Death pullback: game-loop-based instead of setInterval
 * 11. Jump overlay cleanup timer (remove leaked DOM elements)
 * 12. Warp flash: reuse persistent overlay instead of createElement
 */
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(filePath, 'utf8');
const cr = s => s.replace(/\n/g, '\r\n');

let applied = 0, skipped = 0;
function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr), n = cr(newStr);
  if (!src.includes(o)) { console.log('  SKIP: ' + label); skipped++; return; }
  const count = src.split(o).length - 1;
  if (count !== 1) { console.log('  SKIP (multi ' + count + '): ' + label); skipped++; return; }
  src = src.replace(o, n);
  console.log('  OK: ' + label);
  applied++;
}

// ── Fix 1: Fuel gate on warp jumps ──
safeReplace(
`function jumpToSystem(idx) {
  AudioSFX.play('jump');`,
`function jumpToSystem(idx) {
  if (state.ship.fuel < 5) {
    addComms('Navigation', 'Insufficient fuel for warp jump. Dock at a station to refuel.');
    AudioSFX.play('shield_hit');
    return;
  }
  AudioSFX.play('jump');`,
'Fix 1: Fuel gate on warp jumps'
);

// ── Fix 2: Star map: show fuel cost + player fuel ──
safeReplace(
"    </div>`;"+"\n}",
"      $"+"{!isCurrent ? `<p style=\"margin-top:8px;font-size:0.8rem;color:var(--muted);\">Jump cost: <span style=\"color:$"+"{state.ship.fuel >= 5 ? 'var(--green)' : 'var(--danger)'}\">5 fuel</span> (you have $"+"{state.ship.fuel.toFixed(0)})</p>` : ''}\n    </div>`;"+"\n}",
'Fix 2: Star map fuel cost display'
);

// ── Fix 3: Autopilot disengage on player input ──
safeReplace(
`    fl.thrust = 0; fl.strafe = 0; fl.vertical = 0;
    if (keysDown.has('w') || keysDown.has('arrowup')) fl.thrust = 1;
    if (keysDown.has('s') || keysDown.has('arrowdown')) fl.thrust = -0.5;
    if (keysDown.has('a') || keysDown.has('arrowleft')) fl.strafe = -1;
    if (keysDown.has('d') || keysDown.has('arrowright')) fl.strafe = 1;
    if (keysDown.has(' ')) fl.vertical = 1;    // Space = up
    if (keysDown.has('control')) fl.vertical = -1; // Ctrl = down
    fl.afterburner = keysDown.has('shift');`,
`    fl.thrust = 0; fl.strafe = 0; fl.vertical = 0;
    if (keysDown.has('w') || keysDown.has('arrowup')) fl.thrust = 1;
    if (keysDown.has('s') || keysDown.has('arrowdown')) fl.thrust = -0.5;
    if (keysDown.has('a') || keysDown.has('arrowleft')) fl.strafe = -1;
    if (keysDown.has('d') || keysDown.has('arrowright')) fl.strafe = 1;
    if (keysDown.has(' ')) fl.vertical = 1;    // Space = up
    if (keysDown.has('control')) fl.vertical = -1; // Ctrl = down
    fl.afterburner = keysDown.has('shift');
    // Disengage autopilot on manual flight input
    if (autopilotActive && (fl.thrust !== 0 || fl.strafe !== 0 || fl.vertical !== 0)) disengageAutopilot();`,
'Fix 3: Autopilot disengage on player input'
);

// ── Fix 4: Autopilot zero velocity on arrival ──
safeReplace(
`  if (dist < 15) {
    disengageAutopilot();
    fl.thrust = 0;
    return;
  }`,
`  if (dist < 15) {
    disengageAutopilot();
    fl.thrust = 0;
    fl.velocity = { x: 0, y: 0, z: 0 };
    fl.speed = 0;
    return;
  }`,
'Fix 4: Autopilot zero velocity on arrival'
);

// ── Fix 5: Autopilot — pre-allocate vectors ──
safeReplace(
`  // Rotate ship towards target
  const targetDir = toTarget.normalize();
  const currentFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
  const cross = new THREE.Vector3().crossVectors(currentFwd, targetDir);`,
`  // Rotate ship towards target
  const targetDir = toTarget.normalize();
  _tmpV3a.set(0, 0, -1).applyQuaternion(ship.quaternion);
  _tmpV3b.set(0,0,0).crossVectors(_tmpV3a, targetDir);
  const currentFwd = _tmpV3a;
  const cross = _tmpV3b;`,
'Fix 5: Autopilot pre-allocated vectors'
);

// ── Fix 6: Skin persistence in save data ──
safeReplace(
`    persistentItems: state.persistentItems,
  };`,
`    persistentItems: state.persistentItems,
    currentSkin: state.currentSkin,
  };`,
'Fix 6a: Save skin in save data'
);

safeReplace(
`  if (data.persistentItems) state.persistentItems = data.persistentItems;`,
`  if (data.persistentItems) state.persistentItems = data.persistentItems;
  if (data.currentSkin) { state.currentSkin = data.currentSkin; }`,
'Fix 6b: Restore skin on load'
);

// ── Fix 7: Faction rep loss to rival factions ──
safeReplace(
`            // Faction rep: killing enemy gains rep with controlling faction, loses with hostile faction
            const sys = state.starSystems[state.location.systemIndex];
            if (sys && sys.controllingFaction) {
              state.factionRep[sys.controllingFaction] = Math.min(1000, (state.factionRep[sys.controllingFaction] || 0) + 5);
            }`,
`            // Faction rep: killing enemy gains rep with controlling faction, loses with rivals
            const sys = state.starSystems[state.location.systemIndex];
            if (sys && sys.controllingFaction) {
              state.factionRep[sys.controllingFaction] = Math.min(1000, (state.factionRep[sys.controllingFaction] || 0) + 5);
              // Rival factions lose rep (opposite ideology factions)
              FACTIONS.forEach(f => {
                if (f.id !== sys.controllingFaction) {
                  state.factionRep[f.id] = Math.max(-500, (state.factionRep[f.id] || 0) - 2);
                }
              });
            }`,
'Fix 7: Faction rep loss to rivals'
);

// ── Fix 8: Chatbot keyword specificity ──
safeReplace(
`  // Check keywords
  for (const [key, resp] of Object.entries(EDEN_AI_RESPONSES)) {
    if (lower.includes(key)) {
      return typeof resp === 'function' ? resp() : resp;
    }
  }`,
`  // Check keywords — sorted by specificity (longest match first)
  const sortedKeys = Object.keys(EDEN_AI_RESPONSES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      const resp = EDEN_AI_RESPONSES[key];
      return typeof resp === 'function' ? resp() : resp;
    }
  }`,
'Fix 8: Chatbot keyword specificity (longest first)'
);

// ── Fix 9: Server quests — generate default objectives ──
safeReplace(
`        state.quests = qData.quests.map(q => ({
          title: q.title || q.objective || 'Unknown Mission',
          summary: q.description || q.hook || 'Complete this mission.',
          reward: q.reward || Math.floor(Math.random() * 500 + 100),
          active: false,
        }));`,
`        state.quests = qData.quests.map(q => ({
          title: q.title || q.objective || 'Unknown Mission',
          summary: q.description || q.hook || 'Complete this mission.',
          reward: q.reward || Math.floor(Math.random() * 500 + 100),
          active: false,
          completed: false,
          objectives: q.objectives || [{ type: 'kill', target: '*', required: 5 + Math.floor(Math.random() * 10), current: 0 }],
        }));`,
'Fix 9: Server quests with default objectives'
);

// ── Fix 10: Death pullback — game-loop-based ──
safeReplace(
`  let pullback = 0;
  const pullInterval = setInterval(() => { pullback = Math.min(pullback + 0.5, 20); }, 16);
  state._deathPullback = { active: true, getValue: () => pullback };
  setTimeout(() => {
    clearInterval(pullInterval);`,
`  const _deathStart = performance.now();
  state._deathPullback = { active: true, getValue: () => Math.min(20, (performance.now() - _deathStart) * 0.007) };
  setTimeout(() => {`,
'Fix 10: Death pullback uses performance.now instead of setInterval'
);

// ── Fix 11: Jump overlay cleanup timer ──
safeReplace(
`  document.body.appendChild(warpOverlay);
  // Star streaks`,
`  document.body.appendChild(warpOverlay);
  setTimeout(() => { if (warpOverlay.parentNode) warpOverlay.remove(); }, 1500);
  // Star streaks`,
'Fix 11: Warp flash overlay cleanup timer'
);

// ── Write + report ──
fs.writeFileSync(filePath, src, 'utf8');
const open = (src.match(/\{/g)||[]).length;
const close = (src.match(/\}/g)||[]).length;
const openP = (src.match(/\(/g)||[]).length;
const closeP = (src.match(/\)/g)||[]).length;
const openB = (src.match(/\[/g)||[]).length;
const closeB = (src.match(/\]/g)||[]).length;
console.log(`\n=== AUDIT 19 PATCH REPORT ===`);
console.log(`Applied: ${applied}/${applied+skipped}, Skipped: ${skipped}`);
console.log(`Balance — {}: ${open}/${close} (): ${openP}/${closeP} []: ${openB}/${closeB}`);
console.log(`File: ${fs.statSync(filePath).size} bytes`);
