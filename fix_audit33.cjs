const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
const cr = s => s.replace(/\n/g, '\r\n');
let ok = 0, fail = 0;
function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr), n = cr(newStr);
  if (!src.includes(o)) { console.error('FAIL: ' + label); fail++; return; }
  const count = src.split(o).length - 1;
  if (count !== 1) { console.error('FAIL (multiple): ' + label + ' (' + count + ')'); fail++; return; }
  src = src.replace(o, n);
  console.log('OK: ' + label);
  ok++;
}

// ================================================================
// Fix 1: Character creation — feedback when no faction selected
// ================================================================
safeReplace(
  `  if (!state.player.faction) return;`,
  `  if (!state.player.faction) {
    const _fg = document.getElementById('faction-grid');
    if (_fg) { _fg.style.outline = '2px solid var(--danger)'; setTimeout(() => _fg.style.outline = '', 2000); }
    return;
  }`,
  'F1: faction selection feedback on createCharacter'
);

// ================================================================
// Fix 2: Pilot name error border clears on input
// ================================================================
safeReplace(
  `  if (!name || name.length < 2 || name.length > 24) { document.getElementById('pilot-name').style.borderColor = 'var(--danger)'; return; }`,
  `  if (!name || name.length < 2 || name.length > 24) { document.getElementById('pilot-name').style.borderColor = 'var(--danger)'; return; }
  document.getElementById('pilot-name').style.borderColor = '';`,
  'F2: clear pilot name error border on valid input'
);

// ================================================================
// Fix 3: Fire recoil kick — framerate-independent decay
// ================================================================
safeReplace(
  `    // Fire recoil kick (recovers over time)
    if (c.fireRecoilKick > 0) {
      c.fireRecoilKick *= 0.88;
      if (c.fireRecoilKick < 0.001) c.fireRecoilKick = 0;
    }`,
  `    // Fire recoil kick (recovers over time — framerate-independent)
    if (c.fireRecoilKick > 0) {
      c.fireRecoilKick *= Math.pow(0.88, dt * 60);
      if (c.fireRecoilKick < 0.001) c.fireRecoilKick = 0;
    }`,
  'F3: fire recoil framerate-independent decay'
);

// ================================================================
// Fix 4: Engine exhaust — accumulator pattern instead of modulo
// ================================================================
safeReplace(
  `    // Engine exhaust
    if (state.gameTime % 200 < dtMs) spawnExhaust();`,
  `    // Engine exhaust (accumulator for consistent spawn rate)
    if (!c._exhaustAccum) c._exhaustAccum = 0;
    c._exhaustAccum += dtMs;
    if (c._exhaustAccum >= 200) { c._exhaustAccum -= 200; spawnExhaust(); }`,
  'F4: exhaust spawn uses accumulator'
);

// ================================================================
// Fix 5: Explosion ring — billboard to camera each frame
// ================================================================
safeReplace(
  `        } else if (ch.userData && ch.userData.isRing) {
          ch.scale.setScalar(1 + progress * 8);
          ch.material.opacity = Math.max(0, 0.6 * (1 - progress));
        }`,
  `        } else if (ch.userData && ch.userData.isRing) {
          ch.scale.setScalar(1 + progress * 8);
          ch.material.opacity = Math.max(0, 0.6 * (1 - progress));
          ch.lookAt(camera.position);
        }`,
  'F5: explosion ring billboards to camera'
);

// ================================================================
// Fix 6: Station sell — decrement quantity instead of removing stack
// ================================================================
safeReplace(
  `window._sell = (name, price) => {
  const idx = state.inventory.findIndex(i => i.name === name);
  if (idx < 0) { addComms('Station', 'You don\\'t have that item.'); return; }
  if (state.socket) {
    state.inventory.splice(idx, 1);
    state.socket.emit('station:sell', { name, price });
  } else {
    const boostedPrice = Math.floor(price * getPlayerTradeMult());
    state.inventory.splice(idx, 1);`,
  `window._sell = (name, price) => {
  const idx = state.inventory.findIndex(i => i.name === name);
  if (idx < 0) { addComms('Station', 'You don\\'t have that item.'); return; }
  if (state.socket) {
    state.inventory[idx].quantity = (state.inventory[idx].quantity || 1) - 1;
    if (state.inventory[idx].quantity <= 0) state.inventory.splice(idx, 1);
    state.socket.emit('station:sell', { name, price });
  } else {
    const boostedPrice = Math.floor(price * getPlayerTradeMult());
    state.inventory[idx].quantity = (state.inventory[idx].quantity || 1) - 1;
    if (state.inventory[idx].quantity <= 0) state.inventory.splice(idx, 1);`,
  'F6: station sell decrements quantity instead of removing stack'
);

// ================================================================
// Fix 7: Enemy HP scaling — cap diffScale at 5x
// ================================================================
safeReplace(
  `    const diffScale = 1 + (state.player.rebirths || 0) * 0.15 + (c.cycle - 1) * 0.08;`,
  `    const diffScale = Math.min(5, 1 + (state.player.rebirths || 0) * 0.15 + (c.cycle - 1) * 0.08);`,
  'F7: cap enemy diffScale at 5x'
);

// ================================================================
// Fix 8: Life insurance — non-market items valued highly
// ================================================================
safeReplace(
  `  const _getItemVal = (n) => (MARKET_ITEMS.find(m => m.name === n)?.basePrice || 0);`,
  `  const _getItemVal = (n) => { const _m = MARKET_ITEMS.find(m => m.name === n); return _m ? _m.basePrice : 5000; };`,
  'F8: life insurance values non-market items highly'
);

// ================================================================
// Fix 9: Dock sound inside guard + station:enter on initial dock only
// ================================================================
safeReplace(
  `    gainSkillXP('trading', 0.1);
  }

  state.location.docked = true; AudioSFX.play('dock');`,
  `    gainSkillXP('trading', 0.1);
    AudioSFX.play('dock');
  }

  state.location.docked = true;`,
  'F9: dock sound inside docked guard'
);

safeReplace(
  `  // Request dynamic prices from server
  if (state.socket) state.socket.emit('station:enter', { systemIndex: state.location.systemIndex });`,
  `  // Request dynamic prices from server — only on initial dock
  if (state.socket && !state.location.docked) state.socket.emit('station:enter', { systemIndex: state.location.systemIndex });`,
  'F10: station:enter only on initial dock'
);

// ================================================================
// Fix 11: Shared laser materials (clone only beam, share glow)
// ================================================================
safeReplace(
  `const _laserBeamGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4);
const _laserGlowGeo = new THREE.CylinderGeometry(0.04, 0.01, 2.0, 4);`,
  `const _laserBeamGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4);
const _laserGlowGeo = new THREE.CylinderGeometry(0.04, 0.01, 2.0, 4);
const _laserBeamTpl = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
const _laserGlowMat = new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });`,
  'F11a: laser material templates'
);

safeReplace(
  `  const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(_laserBeamGeo, beamMat);
  beam.quaternion.copy(camera.quaternion); beam.rotateX(Math.PI / 2);
  g.add(beam);
  
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(_laserGlowGeo, glowMat);`,
  `  const beamMat = _laserBeamTpl.clone();
  const beam = new THREE.Mesh(_laserBeamGeo, beamMat);
  beam.quaternion.copy(camera.quaternion); beam.rotateX(Math.PI / 2);
  g.add(beam);
  
  const glow = new THREE.Mesh(_laserGlowGeo, _laserGlowMat);`,
  'F11b: reuse laser material templates'
);

// ================================================================
// Fix 12: Shared nail materials (slug + sparks static, trail/heat cloned)
// ================================================================
safeReplace(
  `const _nailSlugGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 6);
const _nailTrailGeo = new THREE.CylinderGeometry(0.06, 0.01, 3, 6);
const _nailHeatGeo = new THREE.CylinderGeometry(0.08, 0.02, 1.5, 6);`,
  `const _nailSlugGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 6);
const _nailTrailGeo = new THREE.CylinderGeometry(0.06, 0.01, 3, 6);
const _nailHeatGeo = new THREE.CylinderGeometry(0.08, 0.02, 1.5, 6);
const _nailSlugMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
const _nailTrailTpl = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
const _nailHeatTpl = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
const _sparkMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 });`,
  'F12a: nail material templates'
);

safeReplace(
  `  const slugMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
  const slug = new THREE.Mesh(_nailSlugGeo, slugMat);`,
  `  const slug = new THREE.Mesh(_nailSlugGeo, _nailSlugMat);`,
  'F12b: reuse nail slug material'
);

safeReplace(
  `  const trailMat2 = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const trail = new THREE.Mesh(_nailTrailGeo, trailMat2);`,
  `  const trailMat2 = _nailTrailTpl.clone();
  const trail = new THREE.Mesh(_nailTrailGeo, trailMat2);`,
  'F12c: clone nail trail material from template'
);

safeReplace(
  `  const heatMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const heat = new THREE.Mesh(_nailHeatGeo, heatMat);`,
  `  const heatMat = _nailHeatTpl.clone();
  const heat = new THREE.Mesh(_nailHeatGeo, heatMat);`,
  'F12d: clone nail heat material from template'
);

safeReplace(
  `      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 })`,
  `      _sparkMat`,
  'F12e: reuse shared spark material'
);

// ================================================================
// Fix 13: Bolt pool overflow — dispose excess bolts
// ================================================================
safeReplace(
  `  if (_boltPool.length < BOLT_POOL_MAX) _boltPool.push(b);
}`,
  `  if (_boltPool.length < BOLT_POOL_MAX) _boltPool.push(b);
  else { disposeObject(b.group); }
}`,
  'F13: dispose excess bolts when pool full'
);

// ================================================================
// Write + verify
// ================================================================
fs.writeFileSync(file, src, 'utf8');
console.log('\n--- RESULTS ---');
console.log('OK: ' + ok + '  FAIL: ' + fail);
const opens = (src.match(/\{/g) || []).length;
const closes = (src.match(/\}/g) || []).length;
console.log('Braces: ' + opens + '/' + closes + (opens === closes ? ' BALANCED' : ' IMBALANCED'));
const lines = src.split('\n').length;
console.log('Lines: ' + lines);
