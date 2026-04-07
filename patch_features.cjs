/**
 * Feature patch: 8 new features + improvements
 * 1. Compass/heading indicator on HUD
 * 2. Target lock-on system with lead reticle
 * 3. Cockpit damage overlay at low hull
 * 4. Proximity collision warnings
 * 5. Loot magnet (auto-collect nearby drops)
 * 6. Environment hazard visual effects
 * 7. Improved death stats summary
 * 8. Dynamic crosshair (weapon heat/charge feedback)
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
const origLen = src.length;

// Helpers
function cr(s) { return s.replace(/\n/g, '\r\n'); }

function safeReplace(label, search, replacement) {
  if (typeof search === 'string') {
    const idx = src.indexOf(search);
    if (idx === -1) { console.log('  SKIP (not found): ' + label); return false; }
    src = src.slice(0, idx) + replacement + src.slice(idx + search.length);
    console.log('  OK: ' + label);
    return true;
  }
  // regex
  if (!search.test(src)) { console.log('  SKIP (regex not found): ' + label); return false; }
  src = src.replace(search, replacement);
  console.log('  OK: ' + label);
  return true;
}

function insertAfter(label, anchor, code) {
  const idx = src.indexOf(anchor);
  if (idx === -1) { console.log('  SKIP (anchor not found): ' + label); return false; }
  const insertAt = idx + anchor.length;
  src = src.slice(0, insertAt) + code + src.slice(insertAt);
  console.log('  OK: ' + label);
  return true;
}

function insertBefore(label, anchor, code) {
  const idx = src.indexOf(anchor);
  if (idx === -1) { console.log('  SKIP (anchor not found): ' + label); return false; }
  src = src.slice(0, idx) + code + src.slice(idx);
  console.log('  OK: ' + label);
  return true;
}

let changes = 0;

// ═══════════════════════════════════════════════
// 1. CSS: Cockpit damage overlay + proximity warning
// ═══════════════════════════════════════════════
console.log('\n[1] CSS additions...');
const cssAnchor = '#nav-bar.visible{display:flex;}';
const newCSS = cr(`
/* ── Cockpit Damage Overlay ──────────────────── */
#cockpit-damage-overlay{position:fixed;inset:0;pointer-events:none;z-index:15;opacity:0;transition:opacity 0.3s;}
#cockpit-damage-overlay .crack{position:absolute;background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.06) 50%,transparent 60%);pointer-events:none;}
#cockpit-damage-overlay .crack-1{top:10%;left:15%;width:35%;height:2px;transform:rotate(12deg);}
#cockpit-damage-overlay .crack-2{top:25%;right:20%;width:25%;height:1px;transform:rotate(-8deg);}
#cockpit-damage-overlay .crack-3{bottom:30%;left:30%;width:20%;height:2px;transform:rotate(25deg);}
#cockpit-damage-overlay .crack-4{top:40%;left:5%;width:15%;height:1px;transform:rotate(-15deg);}
#cockpit-damage-overlay .crack-5{bottom:15%;right:10%;width:30%;height:2px;transform:rotate(5deg);}
#cockpit-damage-overlay.active{opacity:1;}
#cockpit-damage-overlay.critical .crack{background:linear-gradient(135deg,transparent 35%,rgba(255,100,50,0.12) 50%,transparent 65%);animation:crackPulse 2s ease-in-out infinite alternate;}
@keyframes crackPulse{0%{opacity:0.6;}100%{opacity:1;}}

/* ── Proximity Warning Flash ─────────────────── */
#proximity-warning{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:16;font-size:0.9rem;color:#ff8800;text-shadow:0 0 10px rgba(255,136,0,0.5);opacity:0;transition:opacity 0.2s;letter-spacing:0.1em;}
#proximity-warning.active{opacity:1;animation:proxPulse 0.5s ease-in-out infinite alternate;}
@keyframes proxPulse{0%{opacity:0.7;}100%{opacity:1;}}

/* ── Loot Magnet Indicator ───────────────────── */
#loot-magnet-indicator{position:fixed;bottom:100px;right:20px;pointer-events:none;z-index:16;font-size:0.75rem;color:#00ff88;opacity:0;transition:opacity 0.3s;}
#loot-magnet-indicator.active{opacity:1;}

/* ── Environment Hazard Overlay ──────────────── */
#hazard-overlay{position:fixed;inset:0;pointer-events:none;z-index:14;opacity:0;transition:opacity 1s;}
#hazard-overlay.radiation{opacity:1;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,255,0,0.03) 70%,rgba(0,255,0,0.06) 100%);animation:radGlow 4s ease-in-out infinite alternate;}
#hazard-overlay.storm{opacity:1;background:radial-gradient(ellipse at center,transparent 30%,rgba(100,100,255,0.04) 60%,rgba(80,80,200,0.08) 100%);animation:stormFlicker 0.8s ease-in-out infinite;}
@keyframes radGlow{0%{opacity:0.5;}100%{opacity:1;}}
@keyframes stormFlicker{0%,100%{opacity:0.7;}50%{opacity:1;}}
`);
if (insertAfter('CSS: cockpit/proximity/hazard styles', cssAnchor, newCSS)) changes++;

// ═══════════════════════════════════════════════
// 2. HTML: New overlay elements
// ═══════════════════════════════════════════════
console.log('\n[2] HTML overlay elements...');
const htmlAnchor = '<div id="screen-transition-overlay"></div>';
const newHTML = cr(`
<div id="cockpit-damage-overlay"><div class="crack crack-1"></div><div class="crack crack-2"></div><div class="crack crack-3"></div><div class="crack crack-4"></div><div class="crack crack-5"></div></div>
<div id="proximity-warning">\u26a0 COLLISION WARNING</div>
<div id="loot-magnet-indicator">\u25C9 MAGNET ACTIVE</div>
<div id="hazard-overlay"></div>
`);
if (insertAfter('HTML: new overlay divs', htmlAnchor, newHTML)) changes++;

// ═══════════════════════════════════════════════
// 3. State additions: target lock, loot magnet, proximity
// ═══════════════════════════════════════════════
console.log('\n[3] State additions...');
const stateAnchor = '    bossKills: 0,\n  },';
// Check CRLF
const stateAnchorCRLF = stateAnchor.replace(/\n/g, '\r\n');
const useAnchor = src.includes(stateAnchorCRLF) ? stateAnchorCRLF : stateAnchor;
const newStateFields = cr(`
  // ── Target Lock-On ──
  targetLock: { target: null, lockTimer: 0, locked: false },
  // ── Loot Magnet ──
  lootMagnet: { active: false, range: 80, cooldown: 0 },
  // ── Proximity Warning ──
  proximityAlert: false,
`);
if (insertAfter('State: targetLock, lootMagnet, proximityAlert', useAnchor, newStateFields)) changes++;

// ═══════════════════════════════════════════════
// 4. HUD: Compass/heading indicator
// ═══════════════════════════════════════════════
console.log('\n[4] HUD: Compass + heading...');
const compassAnchor = "hudCtx.fillText('RADAR', mapCx-15, mapCy+mapR+12);";
const compassCode = cr(`

  // ── Compass / Heading Indicator (top center) ──
  {
    const compY = 40, compW = 240, compH = 18;
    const compX = cx - compW/2;
    // Get camera yaw in degrees (0-360)
    const _camDir = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    let heading = Math.atan2(_camDir.x, -_camDir.z) * (180/Math.PI);
    if (heading < 0) heading += 360;
    const cardinals = [{a:0,l:'N'},{a:45,l:'NE'},{a:90,l:'E'},{a:135,l:'SE'},{a:180,l:'S'},{a:225,l:'SW'},{a:270,l:'W'},{a:315,l:'NW'}];
    // Background
    hudCtx.fillStyle = 'rgba(10,20,30,0.5)';
    hudCtx.fillRect(compX, compY, compW, compH);
    hudCtx.strokeStyle = 'rgba(68,170,255,0.3)';
    hudCtx.lineWidth = 1;
    hudCtx.strokeRect(compX, compY, compW, compH);
    // Center tick
    hudCtx.fillStyle = '#44aaff';
    hudCtx.fillRect(cx-1, compY, 2, compH);
    // Cardinal directions
    hudCtx.font = '9px "Segoe UI", system-ui, sans-serif';
    hudCtx.textAlign = 'center';
    cardinals.forEach(cd => {
      let diff = cd.a - heading;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const px = cx + diff * (compW / 120); // 120 degree FOV mapped to compass width
      if (px > compX + 5 && px < compX + compW - 5) {
        hudCtx.fillStyle = cd.l === 'N' ? '#ff4444' : cd.l.length === 1 ? '#88ccff' : '#556677';
        hudCtx.fillText(cd.l, px, compY + 13);
      }
    });
    // Degree readout
    hudCtx.font = '8px "Segoe UI", system-ui, sans-serif';
    hudCtx.fillStyle = '#88aacc';
    hudCtx.fillText(Math.round(heading) + '\u00B0', cx, compY + compH + 10);
    hudCtx.textAlign = 'left';
  }
`);
if (insertAfter('HUD: Compass heading indicator', compassAnchor, compassCode)) changes++;

// ═══════════════════════════════════════════════
// 5. HUD: Dynamic crosshair with heat/charge feedback
// ═══════════════════════════════════════════════
console.log('\n[5] HUD: Dynamic crosshair...');
// Find current crosshair code and enhance it
const crosshairAnchor = "// Scanlines (throttled — every 4th frame)";
const crosshairCode = cr(`
  // ── Dynamic Crosshair — weapon state feedback ──
  {
    const crSize = 14 + c.heat * 20;     // Spread with heat
    const crColor = c.charging ? '#ffcc' + Math.floor((1-c.chargeLevel)*9).toString(16) + '0' :
                    c.heat > 0.7 ? '#ff4444' :
                    c.heat > 0.4 ? '#ffaa00' :
                    c.hitMarkerTimer > 0 ? '#ff2222' : '#44aaff';
    hudCtx.save();
    hudCtx.strokeStyle = crColor;
    hudCtx.lineWidth = c.hitMarkerTimer > 0 ? 2.5 : 1.5;
    hudCtx.globalAlpha = 0.8;
    // Outer ring (expands with heat)
    hudCtx.beginPath(); hudCtx.arc(cx, cy, crSize, 0, Math.PI*2); hudCtx.stroke();
    // Inner dot
    hudCtx.fillStyle = crColor; hudCtx.beginPath(); hudCtx.arc(cx, cy, 2, 0, Math.PI*2); hudCtx.fill();
    // Tick marks (4 cardinal)
    const tickInner = crSize + 3, tickOuter = crSize + 8;
    for (let ti = 0; ti < 4; ti++) {
      const ta = ti * Math.PI / 2;
      hudCtx.beginPath();
      hudCtx.moveTo(cx + Math.cos(ta)*tickInner, cy + Math.sin(ta)*tickInner);
      hudCtx.lineTo(cx + Math.cos(ta)*tickOuter, cy + Math.sin(ta)*tickOuter);
      hudCtx.stroke();
    }
    // Charge arc
    if (c.charging && c.chargeLevel > 0) {
      hudCtx.strokeStyle = '#ffcc00'; hudCtx.lineWidth = 3; hudCtx.globalAlpha = 0.6;
      hudCtx.beginPath(); hudCtx.arc(cx, cy, crSize + 12, -Math.PI/2, -Math.PI/2 + c.chargeLevel * Math.PI * 2); hudCtx.stroke();
    }
    // Kill confirm X flash
    if (c.killConfirmTimer > 0) {
      hudCtx.strokeStyle = '#ff2222'; hudCtx.lineWidth = 2; hudCtx.globalAlpha = c.killConfirmTimer / 400;
      const kx1 = 6;
      hudCtx.beginPath(); hudCtx.moveTo(cx-kx1,cy-kx1); hudCtx.lineTo(cx+kx1,cy+kx1); hudCtx.stroke();
      hudCtx.beginPath(); hudCtx.moveTo(cx+kx1,cy-kx1); hudCtx.lineTo(cx-kx1,cy+kx1); hudCtx.stroke();
    }
    hudCtx.restore();
  }

`);
if (insertBefore('HUD: Dynamic crosshair', crosshairAnchor, crosshairCode)) changes++;

// ═══════════════════════════════════════════════
// 6. Target lock-on system (in gameLoop, after enemy spawn)
// ═══════════════════════════════════════════════
console.log('\n[6] Target lock-on system...');
const lockAnchor = '// Rotate asteroids';
const lockCode = cr(`    // ── Target Lock-On System (closest enemy auto-lock) ──
    {
      let closestEnemy = null, closestDist = 999;
      c.enemies.forEach(e => {
        const d = e.group.position.distanceTo(ship.position);
        if (d < closestDist && d < 250) { closestDist = d; closestEnemy = e; }
      });
      if (closestEnemy && closestDist < 250) {
        state.targetLock.target = closestEnemy;
        state.targetLock.lockTimer = Math.min(1, state.targetLock.lockTimer + dt * 2);
        state.targetLock.locked = state.targetLock.lockTimer >= 0.8;
      } else {
        state.targetLock.target = null;
        state.targetLock.lockTimer = Math.max(0, state.targetLock.lockTimer - dt * 3);
        state.targetLock.locked = false;
      }
    }

`);
if (insertBefore('Target lock-on system', lockAnchor, lockCode)) changes++;

// ═══════════════════════════════════════════════
// 7. Loot magnet & proximity warning (in gameLoop)
// ═══════════════════════════════════════════════
console.log('\n[7] Loot magnet + proximity warning...');
// Insert after asteroid rotation block
const asteroidRotAnchor = "c.asteroids.forEach(a => {\n      a.rotation.x += a.userData.rotSpeed.x * dt;\n      a.rotation.y += a.userData.rotSpeed.y * dt;\n      a.rotation.z += a.userData.rotSpeed.z * dt;\n    });";
const asteroidRotAnchorCRLF = asteroidRotAnchor.replace(/\n/g, '\r\n');
const asteroidUseAnchor = src.includes(asteroidRotAnchorCRLF) ? asteroidRotAnchorCRLF : asteroidRotAnchor;

const lootProxCode = cr(`

    // ── Loot Magnet — auto-pull nearby loot drops ──
    if (c.lootDrops && c.lootDrops.length > 0) {
      const magnetRange = state.lootMagnet.range || 80;
      for (let li = c.lootDrops.length - 1; li >= 0; li--) {
        const ld = c.lootDrops[li];
        if (!ld || !ld.group) continue;
        const ldDist = ld.group.position.distanceTo(ship.position);
        // Pull loot toward player within magnet range
        if (ldDist < magnetRange && ldDist > 5) {
          const pullStrength = (1 - ldDist / magnetRange) * 120 * dt;
          _tmpV3b.copy(ship.position).sub(ld.group.position).normalize().multiplyScalar(pullStrength);
          ld.group.position.add(_tmpV3b);
          state.lootMagnet.active = true;
        }
      }
    }
    // Update magnet indicator
    const magnetEl = document.getElementById('loot-magnet-indicator');
    if (magnetEl) {
      if (state.lootMagnet.active && c.lootDrops && c.lootDrops.length > 0) magnetEl.classList.add('active');
      else { magnetEl.classList.remove('active'); state.lootMagnet.active = false; }
    }

    // ── Proximity Warning — asteroids & enemies too close ──
    {
      let proxDanger = false;
      c.asteroids.forEach(a => {
        if (!a || !a.position) return;
        const ad = a.position.distanceTo(ship.position);
        if (ad < 25 && fl.speed > 30) proxDanger = true;
      });
      c.enemies.forEach(e => {
        const ed = e.group.position.distanceTo(ship.position);
        if (ed < 15) proxDanger = true;
      });
      state.proximityAlert = proxDanger;
      const proxEl = document.getElementById('proximity-warning');
      if (proxEl) { if (proxDanger) proxEl.classList.add('active'); else proxEl.classList.remove('active'); }
    }
`);
if (insertAfter('Loot magnet + proximity warning', asteroidUseAnchor, lootProxCode)) changes++;

// ═══════════════════════════════════════════════
// 8. Cockpit damage overlay + hazard effects (in gameLoop HUD section)
// ═══════════════════════════════════════════════
console.log('\n[8] Cockpit damage + hazard overlay updates...');
// Insert logic into the HUD drawing near damage flash
const cockpitAnchor = "// Keybind hints (bottom-right, above weapon)";
const cockpitCode = cr(`
  // ── Cockpit Damage Overlay — Hull-based crack visibility ──
  {
    const cdOverlay = document.getElementById('cockpit-damage-overlay');
    if (cdOverlay) {
      if (hullPct < 0.5) {
        cdOverlay.classList.add('active');
        if (hullPct < 0.2) cdOverlay.classList.add('critical');
        else cdOverlay.classList.remove('critical');
        cdOverlay.style.opacity = String(0.3 + (1 - hullPct / 0.5) * 0.7);
      } else {
        cdOverlay.classList.remove('active', 'critical');
      }
    }
  }

  // ── Environment Hazard Overlay — system-specific effects ──
  {
    const hzOverlay = document.getElementById('hazard-overlay');
    if (hzOverlay) {
      const sys = state.starSystems[state.location.systemIndex];
      const hazards = sys?.hazards || [];
      if (hazards.some(h => h.includes('Radiation'))) {
        hzOverlay.className = 'radiation';
      } else if (hazards.some(h => h.includes('Storm') || h.includes('Electromagnetic'))) {
        hzOverlay.className = 'storm';
      } else {
        hzOverlay.className = '';
      }
    }
  }

  // ── Target Lock-On HUD — bracket + distance + lead reticle ──
  if (state.targetLock.target) {
    const tgt = state.targetLock.target;
    _tmpV3a.copy(tgt.group.position).project(camera);
    if (_tmpV3a.z < 1) {
      const tx = (_tmpV3a.x * 0.5 + 0.5) * W;
      const ty = (-_tmpV3a.y * 0.5 + 0.5) * H;
      const tDist = tgt.group.position.distanceTo(ship.position);
      const lockProg = state.targetLock.lockTimer;
      const bracketSize = 18 + (1 - lockProg) * 20;
      hudCtx.save();
      hudCtx.strokeStyle = state.targetLock.locked ? '#ff2222' : '#ffaa00';
      hudCtx.lineWidth = state.targetLock.locked ? 2 : 1.5;
      hudCtx.globalAlpha = 0.6 + lockProg * 0.4;
      // Corner brackets
      const bs = bracketSize, bl = 8;
      hudCtx.beginPath();
      hudCtx.moveTo(tx-bs, ty-bs+bl); hudCtx.lineTo(tx-bs, ty-bs); hudCtx.lineTo(tx-bs+bl, ty-bs); hudCtx.stroke();
      hudCtx.beginPath();
      hudCtx.moveTo(tx+bs-bl, ty-bs); hudCtx.lineTo(tx+bs, ty-bs); hudCtx.lineTo(tx+bs, ty-bs+bl); hudCtx.stroke();
      hudCtx.beginPath();
      hudCtx.moveTo(tx+bs, ty+bs-bl); hudCtx.lineTo(tx+bs, ty+bs); hudCtx.lineTo(tx+bs-bl, ty+bs); hudCtx.stroke();
      hudCtx.beginPath();
      hudCtx.moveTo(tx-bs+bl, ty+bs); hudCtx.lineTo(tx-bs, ty+bs); hudCtx.lineTo(tx-bs, ty+bs-bl); hudCtx.stroke();
      // Lock progress arc
      if (!state.targetLock.locked) {
        hudCtx.beginPath(); hudCtx.arc(tx, ty, bracketSize+5, -Math.PI/2, -Math.PI/2 + lockProg * Math.PI * 2); hudCtx.stroke();
      }
      // Target info text
      hudCtx.font = '9px "Segoe UI", system-ui, sans-serif';
      hudCtx.fillStyle = state.targetLock.locked ? '#ff4444' : '#ffaa00';
      hudCtx.textAlign = 'center';
      hudCtx.fillText(tgt.type.toUpperCase() + ' | ' + Math.floor(tDist) + 'm', tx, ty + bracketSize + 16);
      const hpPctT = tgt.hp / tgt.maxHp;
      hudCtx.fillText('HP ' + Math.floor(hpPctT * 100) + '%', tx, ty + bracketSize + 28);
      // Lead reticle (predicted position for railgun projectiles)
      if (state.targetLock.locked && tgt._velocity) {
        const tof = tDist / 300; // approx projectile time-of-flight
        const leadX = tgt.group.position.x + (tgt._velocity.x || 0) * tof;
        const leadY = tgt.group.position.y + (tgt._velocity.y || 0) * tof;
        const leadZ = tgt.group.position.z + (tgt._velocity.z || 0) * tof;
        _tmpV3b.set(leadX, leadY, leadZ).project(camera);
        if (_tmpV3b.z < 1) {
          const lx = (_tmpV3b.x * 0.5 + 0.5) * W;
          const ly = (-_tmpV3b.y * 0.5 + 0.5) * H;
          hudCtx.strokeStyle = '#ff6644'; hudCtx.lineWidth = 1; hudCtx.globalAlpha = 0.5;
          hudCtx.beginPath(); hudCtx.arc(lx, ly, 6, 0, Math.PI*2); hudCtx.stroke();
          hudCtx.beginPath(); hudCtx.moveTo(lx-3,ly); hudCtx.lineTo(lx+3,ly); hudCtx.stroke();
          hudCtx.beginPath(); hudCtx.moveTo(lx,ly-3); hudCtx.lineTo(lx,ly+3); hudCtx.stroke();
        }
      }
      hudCtx.textAlign = 'left';
      hudCtx.restore();
    }
  }

`);
if (insertBefore('Cockpit damage + target lock HUD', cockpitAnchor, cockpitCode)) changes++;

// ═══════════════════════════════════════════════
// 9. Enemy velocity tracking (needed for lead reticle)
// ═══════════════════════════════════════════════
console.log('\n[9] Enemy velocity tracking...');
const enemyMoveAnchor = 'e.hitFlash = Math.max(0, (e.hitFlash || 0) - dtMs);';
if (src.includes(enemyMoveAnchor)) {
  const velocityTrackCode = cr(`
      // Track enemy velocity for lead reticle
      if (!e._prevPos) e._prevPos = e.group.position.clone();
      if (!e._velocity) e._velocity = {x:0,y:0,z:0};
      if (dt > 0) {
        e._velocity.x = (e.group.position.x - e._prevPos.x) / dt;
        e._velocity.y = (e.group.position.y - e._prevPos.y) / dt;
        e._velocity.z = (e.group.position.z - e._prevPos.z) / dt;
        e._prevPos.copy(e.group.position);
      }
`);
  insertAfter('Enemy velocity tracking', enemyMoveAnchor, velocityTrackCode);
  changes++;
}

// ═══════════════════════════════════════════════
// 10. Improved death stats (enhance death screen info)
// ═══════════════════════════════════════════════
console.log('\n[10] Enhanced death stats...');
const deathStatsAnchor = "c.deathStats = {";
if (src.includes(deathStatsAnchor)) {
  // Find the death stats object and add more fields
  const deathStatsEnd = src.indexOf('};', src.indexOf(deathStatsAnchor)) + 2;
  // Just insert extra fields alongside existing ones
  const deathStatsReplace = "c.deathStats = {";
  const newDeathStats = "c.deathStats = { accuracy: c._shotsHit ? Math.round(c._shotsHit / Math.max(1, c._shotsFired) * 100) : 0, longestLife: Math.floor(state.gameTime / 1000),";
  if (safeReplace('Death stats: add accuracy + longestLife', deathStatsReplace, newDeathStats)) changes++;
}

// ═══════════════════════════════════════════════
// 11. Shot tracking counters (for accuracy stat)
// ═══════════════════════════════════════════════
console.log('\n[11] Shot tracking...');
// Add _shotsFired and _shotsHit to combat state
const combatStateAnchor = "    bossKills: 0,";
const shotTrackFields = cr(`
    _shotsFired: 0,
    _shotsHit: 0,`);
if (insertAfter('Shot tracking counters', combatStateAnchor, shotTrackFields)) changes++;

// Increment _shotsFired in spawnNail
const spawnNailAnchor = 'function spawnNail() {';
if (src.includes(spawnNailAnchor)) {
  const afterSpawnNail = src.indexOf('{', src.indexOf(spawnNailAnchor)) + 1;
  const nailTrackCode = cr(`
  c._shotsFired = (c._shotsFired || 0) + 1;`);
  src = src.slice(0, afterSpawnNail) + nailTrackCode + src.slice(afterSpawnNail);
  console.log('  OK: Shot tracking in spawnNail');
  changes++;
}

// Increment _shotsHit on enemy hit
const hitConfirmAnchor = "c.hitMarkerTimer = 150;";
if (src.includes(hitConfirmAnchor)) {
  const hitTrackCode = cr(`
          c._shotsHit = (c._shotsHit || 0) + 1;`);
  insertAfter('Shot tracking hit confirm', hitConfirmAnchor, hitTrackCode);
  changes++;
}

// ═══════════════════════════════════════════════
// WRITE
// ═══════════════════════════════════════════════
fs.writeFileSync(FILE, src, 'utf8');
const newLen = src.length;
console.log(`\n========================================`);
console.log(`Changes applied: ${changes}`);
console.log(`File size: ${origLen} → ${newLen} (${newLen > origLen ? '+' : ''}${newLen - origLen})`);

// Verify brace/paren balance
let braces = 0, parens = 0, brackets = 0;
for (const ch of src) {
  if (ch === '{') braces++;
  else if (ch === '}') braces--;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
  else if (ch === '[') brackets++;
  else if (ch === ']') brackets--;
}
console.log(`Brace balance: ${braces} (${braces === 0 || braces === -1 ? 'OK — CSS artifact' : 'PROBLEM'})`);
console.log(`Paren balance: ${parens} (${parens === 0 ? 'OK' : 'PROBLEM'})`);
console.log(`Bracket balance: ${brackets} (${brackets === 0 ? 'OK' : 'PROBLEM'})`);
console.log(`========================================`);
