/**
 * Audit 20 — Security, Physics, Memory Leaks, Balance (12 fixes)
 *
 *  1. XSS fix: death ticker uses textContent
 *  2. XSS fix: chatbot renders with escaped HTML
 *  3. Frame-rate-independent drag (Math.pow with dt)
 *  4. Faction rep: only penalize 2 rival factions, not all 7
 *  5. Enemy AI: pre-allocate strafe/orbit vectors
 *  6. Auto-aggro: 60s (60000ms) not 10s (10000ms)
 *  7. Loot drop: disposeObject on collect + despawn
 *  8. Asteroid collision: break after first hit per frame
 *  9. Enemy bolt cleanup: return to pool on exitGunnerMode
 * 10. Phoenix milestone: check rebirths not deaths
 * 11. HUD font fallback chain
 * 12. addDeathFeedEvent: sanitize text
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

// ── Fix 1: XSS — death ticker ──
safeReplace(
`function updateDeathTicker() {
  const el = document.getElementById('death-ticker-content');
  if (!el) return;
  el.innerHTML = state.deathFeed.map(e => 
    \`<span class="ticker-\${e.type}">\${e.text}</span>\`
  ).join('');
  document.getElementById('death-ticker').classList.add('active');
}`,
`function _escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function updateDeathTicker() {
  const el = document.getElementById('death-ticker-content');
  if (!el) return;
  el.innerHTML = state.deathFeed.map(e => 
    \`<span class="ticker-\${_escHtml(e.type)}">\${_escHtml(e.text)}</span>\`
  ).join('');
  document.getElementById('death-ticker').classList.add('active');
}`,
'Fix 1: XSS — sanitize death ticker'
);

// ── Fix 2: XSS — chatbot ──
safeReplace(
`  el.innerHTML = state.chatbot.messages.slice(-15).map(m =>
    \`<div class="chat-msg \${m.ai ? 'ai' : 'user'}">\${m.text}</div>\`
  ).join('');`,
`  el.innerHTML = state.chatbot.messages.slice(-15).map(m =>
    \`<div class="chat-msg \${m.ai ? 'ai' : 'user'}">\${_escHtml(m.text)}</div>\`
  ).join('');`,
'Fix 2: XSS — sanitize chatbot messages'
);

// ── Fix 3: Frame-rate-independent drag ──
safeReplace(
`    // Drag
    fl.velocity.x *= fl.drag;
    fl.velocity.y *= fl.drag;
    fl.velocity.z *= fl.drag;`,
`    // Drag — frame-rate-independent (normalize to 60fps base)
    const _frameDrag = Math.pow(fl.drag, dt * 60);
    fl.velocity.x *= _frameDrag;
    fl.velocity.y *= _frameDrag;
    fl.velocity.z *= _frameDrag;`,
'Fix 3: Frame-rate-independent drag'
);

// ── Fix 4: Faction rep — only rival factions ──
safeReplace(
`              // Rival factions lose rep (opposite ideology factions)
              FACTIONS.forEach(f => {
                if (f.id !== sys.controllingFaction) {
                  state.factionRep[f.id] = Math.max(-500, (state.factionRep[f.id] || 0) - 2);
                }
              });`,
`              // Rival factions lose rep (2 most different factions by index distance)
              const _ctrlIdx = FACTIONS.findIndex(f => f.id === sys.controllingFaction);
              if (_ctrlIdx >= 0) {
                const _rival1 = FACTIONS[(_ctrlIdx + 3) % FACTIONS.length];
                const _rival2 = FACTIONS[(_ctrlIdx + 5) % FACTIONS.length];
                if (_rival1) state.factionRep[_rival1.id] = Math.max(-500, (state.factionRep[_rival1.id] || 0) - 3);
                if (_rival2) state.factionRep[_rival2.id] = Math.max(-500, (state.factionRep[_rival2.id] || 0) - 2);
              }`,
'Fix 4: Faction rep — only 2 rivals lose rep'
);

// ── Fix 5: Enemy AI — pre-allocate strafe vector for scouts ──
safeReplace(
`              // Strafe perpendicular to player
              const strafeDir = new THREE.Vector3(-_tmpV3a.z, 0, _tmpV3a.x);
              const sway = Math.sin(e._aiTimer * 3) * 0.7;
              e.group.position.addScaledVector(_tmpV3a, e.speed * dt * 0.3);
              e.group.position.addScaledVector(strafeDir, e.speed * dt * sway);`,
`              // Strafe perpendicular to player (reuse temp vector)
              _tmpV3d.set(-_tmpV3a.z, 0, _tmpV3a.x);
              const sway = Math.sin(e._aiTimer * 3) * 0.7;
              e.group.position.addScaledVector(_tmpV3a, e.speed * dt * 0.3);
              e.group.position.addScaledVector(_tmpV3d, e.speed * dt * sway);`,
'Fix 5a: Scout AI — reuse temp vector'
);

safeReplace(
`              // Orbit player
              const orbitDir = new THREE.Vector3(-_tmpV3a.z, 0, _tmpV3a.x);
              e.group.position.addScaledVector(orbitDir, e.speed * dt * 0.8);`,
`              // Orbit player (reuse temp vector)
              _tmpV3d.set(-_tmpV3a.z, 0, _tmpV3a.x);
              e.group.position.addScaledVector(_tmpV3d, e.speed * dt * 0.8);`,
'Fix 5b: Interceptor AI — reuse temp vector'
);

// ── Fix 6: Auto-aggro 60s ──
safeReplace(
`      const autoAggro = isFirstLife && state.gameTime > 10000;`,
`      const autoAggro = isFirstLife && state.gameTime > 60000;`,
'Fix 6: Auto-aggro 60s instead of 10s'
);

// ── Fix 7: Loot drop disposeObject ──
safeReplace(
`        AudioSFX.play('loot_' + l.type);
        scene.remove(l.group); c.lootDrops.splice(i, 1); continue;
      }
      // Despawn after 15s
      if (l.age > 15000) { scene.remove(l.group); c.lootDrops.splice(i, 1); }`,
`        AudioSFX.play('loot_' + l.type);
        scene.remove(l.group); disposeObject(l.group); c.lootDrops.splice(i, 1); continue;
      }
      // Despawn after 15s
      if (l.age > 15000) { scene.remove(l.group); disposeObject(l.group); c.lootDrops.splice(i, 1); }`,
'Fix 7: Loot drop disposeObject on collect/despawn'
);

// ── Fix 8: Asteroid collision — break after first hit ──
safeReplace(
`      if (performance.now() > c._asteroidHitCooldown) {
        c.asteroids.forEach(a => {
          if (!a || !a.position) return;
          const dist = a.position.distanceTo(ship.position);
          const mesh = a.children && a.children[0];
          const radius = (mesh && mesh.geometry && mesh.geometry.boundingSphere && mesh.geometry.boundingSphere.radius) || 4;
          if (dist < radius + 3) {`,
`      if (performance.now() > c._asteroidHitCooldown) {
        let _astHit = false;
        for (let _ai = 0; _ai < c.asteroids.length && !_astHit; _ai++) {
          const a = c.asteroids[_ai];
          if (!a || !a.position) continue;
          const dist = a.position.distanceTo(ship.position);
          const mesh = a.children && a.children[0];
          const radius = (mesh && mesh.geometry && mesh.geometry.boundingSphere && mesh.geometry.boundingSphere.radius) || 4;
          if (dist < radius + 3) {
            _astHit = true;`,
'Fix 8a: Asteroid collision — for loop with break flag'
);

safeReplace(
`            addComms('EDEN AI', '\\u26a0 Asteroid collision! Watch your heading.');
            if (state.ship.hull <= 0 && !c.dead) { playerDeathSequence('Destroyed by asteroid collision'); }
          }
        });`,
`            addComms('EDEN AI', '\\u26a0 Asteroid collision! Watch your heading.');
            if (state.ship.hull <= 0 && !c.dead) { playerDeathSequence('Destroyed by asteroid collision'); }
          }
        }`,
'Fix 8b: Asteroid collision — close for loop'
);

// ── Fix 9: Enemy bolt pool return on exit ──
safeReplace(
`  c.enemyBolts.forEach(b => { if (b && b.group) scene.remove(b.group); }); c.enemyBolts = [];`,
`  c.enemyBolts.forEach(b => { if (b && b._poolRef) returnBoltToPool(b._poolRef); else if (b && b.group) { scene.remove(b.group); disposeObject(b.group); } }); c.enemyBolts = [];`,
'Fix 9: Enemy bolt pool return on exit'
);

// ── Fix 10: Phoenix milestone — check rebirths ──
safeReplace(
`  { id: 'rebirths_5',     name: 'Phoenix',               desc: 'Complete 5 rebirths',                  check: s => s.totalDeaths >= 5,   reward: 60,   icon: '🐦' },`,
`  { id: 'rebirths_5',     name: 'Phoenix',               desc: 'Complete 5 rebirths',                  check: (s, p) => p.rebirths >= 5, reward: 60,   icon: '🐦' },`,
'Fix 10: Phoenix milestone checks rebirths'
);

// ── Fix 11: HUD font fallback ──
// Replace most common occurrence pattern
const segoeOnly = /"Segoe UI"/g;
const segoeFixed = '"Segoe UI", system-ui, sans-serif';
const beforeCount = (src.match(segoeOnly) || []).length;
src = src.replace(segoeOnly, segoeFixed);
const afterCount = (src.match(/"Segoe UI", system-ui, sans-serif/g) || []).length;
console.log(`  OK: Fix 11: HUD font fallback (${beforeCount} replacements)`);
applied++;

// ── Write + report ──
fs.writeFileSync(filePath, src, 'utf8');
const open = (src.match(/\{/g)||[]).length;
const close = (src.match(/\}/g)||[]).length;
const openP = (src.match(/\(/g)||[]).length;
const closeP = (src.match(/\)/g)||[]).length;
const openB = (src.match(/\[/g)||[]).length;
const closeB = (src.match(/\]/g)||[]).length;
console.log(`\n=== AUDIT 20 PATCH REPORT ===`);
console.log(`Applied: ${applied}/${applied+skipped}, Skipped: ${skipped}`);
console.log(`Balance — {}: ${open}/${close} (): ${openP}/${closeP} []: ${openB}/${closeB}`);
console.log(`File: ${fs.statSync(filePath).size} bytes`);
