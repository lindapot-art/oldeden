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
// Fix 1: Death sequence — track timeouts + clear in exitGunnerMode
// Add _deathTimeouts array near _deathSequenceActive
// ================================================================
safeReplace(
  `let _deathSequenceActive = false;`,
  `let _deathSequenceActive = false;\nlet _deathTimeouts = [];`,
  'F1a: add _deathTimeouts array'
);

// Wrap the death sequence setTimeouts in _deathTimeouts.push
// and reorder: exitGunnerMode BEFORE clearing flags
safeReplace(
  `  // Phase 1: 3 second slow-mo pullback (existing)
  setTimeout(() => {
    // Phase 2: 1.5s full freeze — camera holds on wreckage
    state._deathTimeDilation = 0;
    setTimeout(() => {
      state._deathTimeDilation = 1;
      state._deathPullback = null;
      _deathSequenceActive = false;
      c.dead = false;
      // Soul departure flash — bridges 3D→2D transition
      const df = document.createElement('div');
      df.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;opacity:1;transition:opacity 0.5s ease;pointer-events:none;';
      document.body.appendChild(df);
      requestAnimationFrame(() => { df.style.opacity = '0'; setTimeout(() => df.remove(), 600); });
      exitGunnerMode(true);
      showEulogy(c.deathStats, cause);
    }, 1500);
  }, 3000);`,
  `  // Phase 1: 3 second slow-mo pullback
  _deathTimeouts.push(setTimeout(() => {
    // Phase 2: 1.5s full freeze — camera holds on wreckage
    state._deathTimeDilation = 0;
    _deathTimeouts.push(setTimeout(() => {
      state._deathTimeDilation = 1;
      state._deathPullback = null;
      // Exit gunner FIRST (sets c.active = false), then clear death flags
      const df = document.createElement('div');
      df.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;opacity:1;transition:opacity 0.5s ease;pointer-events:none;';
      document.body.appendChild(df);
      requestAnimationFrame(() => { df.style.opacity = '0'; setTimeout(() => df.remove(), 600); });
      exitGunnerMode(true);
      _deathSequenceActive = false;
      c.dead = false;
      showEulogy(c.deathStats, cause);
    }, 1500));
  }, 3000));`,
  'F1b: death timeouts tracked + reorder exitGunnerMode before flag clear'
);

// Clear death timeouts in exitGunnerMode (add after tutorial timeout cleanup)
safeReplace(
  `  if (c._tutorialTimeouts) { c._tutorialTimeouts.forEach(clearTimeout); c._tutorialTimeouts = []; }`,
  `  if (c._tutorialTimeouts) { c._tutorialTimeouts.forEach(clearTimeout); c._tutorialTimeouts = []; }
  _deathTimeouts.forEach(clearTimeout); _deathTimeouts = [];
  state._deathTimeDilation = 1; state._deathPullback = null;`,
  'F1c: clear death timeouts in exitGunnerMode'
);

// ================================================================
// Fix 2: jumpToSystem — move connectivity check BEFORE animation
// ================================================================
safeReplace(
  `  _isJumping = true;
  AudioSFX.play('jump');
  // Warp flash animation`,
  `  // Enforce jump route connectivity BEFORE animation
  if (!state.inAltUniverse) {
    const _curSys = state.starSystems[state.location.systemIndex];
    if (_curSys && _curSys.connections && !_curSys.connections.includes(idx)) {
      addComms('Navigation', 'No jump route to that system. Select a connected system.');
      AudioSFX.play('shield_hit');
      return;
    }
  }
  _isJumping = true;
  AudioSFX.play('jump');
  // Warp flash animation`,
  'F2a: move connectivity check before animation'
);

// Remove the OLD connectivity check that's now after the animation
safeReplace(
  `  // Enforce jump route connectivity
  if (!state.inAltUniverse) {
    const _curSys = state.starSystems[state.location.systemIndex];
    if (_curSys && _curSys.connections && !_curSys.connections.includes(idx)) {
      addComms('Navigation', 'No jump route to that system. Select a connected system.');
      AudioSFX.play('shield_hit');
      return;
    }
  }
  state.location.systemIndex = idx;`,
  `  state.location.systemIndex = idx;`,
  'F2b: remove old connectivity check after animation'
);

// ================================================================
// Fix 3: presentKarmaCard — track + cancel previous reveal chain
// ================================================================
safeReplace(
  `function presentKarmaCard(roll) {
  const card = document.getElementById('karma-card');`,
  `let _karmaTimeouts = [];
function presentKarmaCard(roll) {
  // Cancel any in-progress reveal chain
  _karmaTimeouts.forEach(clearTimeout); _karmaTimeouts = [];
  const card = document.getElementById('karma-card');`,
  'F3a: add _karmaTimeouts + cancel on re-enter'
);

// Wrap the 6 staged setTimeout calls — step 1
safeReplace(
  `  // ── Staged reveal with distinct SFX per stage ──
  setTimeout(() => {
    // Step 1: Name + title + rarity badge`,
  `  // ── Staged reveal with distinct SFX per stage ──
  _karmaTimeouts.push(setTimeout(() => {
    // Step 1: Name + title + rarity badge`,
  'F3b: wrap step 1 timeout'
);

safeReplace(
  `    AudioSFX.play('karma_step');
  }, t1);
  
  setTimeout(() => {
    // Step 2: Genome bars + pixel art`,
  `    AudioSFX.play('karma_step');
  }, t1));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 2: Genome bars + pixel art`,
  'F3c: wrap step 2 timeout'
);

safeReplace(
  `    AudioSFX.play('karma_reveal');
  }, t2);
  
  setTimeout(() => {
    // Step 3: Faction`,
  `    AudioSFX.play('karma_reveal');
  }, t2));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 3: Faction`,
  'F3d: wrap step 3 timeout'
);

safeReplace(
  `    AudioSFX.play('karma_step');
  }, t3);
  
  setTimeout(() => {
    // Step 4: Wealth — counting animation for drama`,
  `    AudioSFX.play('karma_step');
  }, t3));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 4: Wealth — counting animation for drama`,
  'F3e: wrap step 4 timeout'
);

safeReplace(
  `    AudioSFX.play('karma_reveal');
  }, t4);
  
  setTimeout(() => {
    // Step 5: Card reveal + backstory + aura glow`,
  `    AudioSFX.play('karma_reveal');
  }, t4));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 5: Card reveal + backstory + aura glow`,
  'F3f: wrap step 5 timeout'
);

safeReplace(
  `    aura.classList.add('active');
  }, t5);
  
  setTimeout(() => {
    // Step 6: Show action buttons`,
  `    aura.classList.add('active');
  }, t5));
  
  _karmaTimeouts.push(setTimeout(() => {
    // Step 6: Show action buttons`,
  'F3g: wrap step 6 timeout'
);

safeReplace(
  `    document.getElementById('reroll-cost').textContent = isFreeReroll ? 'FREE' : cost;
  }, t6);
}`,
  `    document.getElementById('reroll-cost').textContent = isFreeReroll ? 'FREE' : cost;
  }, t6));
}`,
  'F3h: close step 6 push'
);

// ================================================================
// Fix 4: fireLaser — shared geometries + projectile disposeObject
// ================================================================
safeReplace(
  `const _explCoreGeo = new THREE.SphereGeometry(0.5, 8, 8);`,
  `const _laserBeamGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4);
const _laserGlowGeo = new THREE.CylinderGeometry(0.04, 0.01, 2.0, 4);
const _explCoreGeo = new THREE.SphereGeometry(0.5, 8, 8);`,
  'F4a: shared laser geometries'
);

safeReplace(
  `  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4), beamMat);`,
  `  const beam = new THREE.Mesh(_laserBeamGeo, beamMat);`,
  'F4b: reuse laser beam geo'
);

safeReplace(
  `  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.01, 2.0, 4), glowMat);`,
  `  const glow = new THREE.Mesh(_laserGlowGeo, glowMat);`,
  'F4c: reuse laser glow geo'
);

safeReplace(
  `      if (hit || p.age > p.life) { scene.remove(p.group); c.projectiles.splice(i, 1); }`,
  `      if (hit || p.age > p.life) { scene.remove(p.group); disposeObject(p.group); c.projectiles.splice(i, 1); }`,
  'F4d: disposeObject on projectile cleanup'
);

// ================================================================
// Fix 5: spawnLootDrop — shared geometries
// ================================================================
safeReplace(
  `const _laserBeamGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4);`,
  `const _lootOctGeo = new THREE.OctahedronGeometry(1.2, 0);
const _lootRingGeo = new THREE.RingGeometry(1.5, 2, 16);
const _lootSphereGeo = new THREE.SphereGeometry(2.5, 8, 8);
const _laserBeamGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.5, 4);`,
  'F5a: shared loot geometries'
);

safeReplace(
  `  const geo = new THREE.OctahedronGeometry(1.2, 0);
  const mat = new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);`,
  `  const mat = new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(_lootOctGeo, mat);`,
  'F5b: reuse loot octahedron geo'
);

safeReplace(
  `  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2, 16), new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));`,
  `  const ring = new THREE.Mesh(_lootRingGeo, new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));`,
  'F5c: reuse loot ring geo'
);

safeReplace(
  `  const _lootGlowGeo = new THREE.SphereGeometry(2.5, 8, 8);
  const _lootGlowMat = new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  const lootGlow = new THREE.Mesh(_lootGlowGeo, _lootGlowMat);`,
  `  const _lootGlowMat = new THREE.MeshBasicMaterial({ color: colors[type] || 0xffffff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
  const lootGlow = new THREE.Mesh(_lootSphereGeo, _lootGlowMat);`,
  'F5d: reuse loot sphere geo'
);

// ================================================================
// Fix 6: loadDashboardGun — clone materials before mutation
// ================================================================
safeReplace(
  `    gun.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {`,
  `    gun.traverse(child => {
      if (child.isMesh && child.material) {
        // Clone materials to avoid mutating cached model
        child.material = Array.isArray(child.material) ? child.material.map(m => m.clone()) : child.material.clone();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {`,
  'F6: clone materials in loadDashboardGun'
);

// ================================================================
// Fix 7: keysDown + mouseHeld clear on window blur / visibilitychange
// ================================================================
safeReplace(
  `document.addEventListener('keyup', (e) => {
  keysDown.delete(e.key.toLowerCase());
});`,
  `document.addEventListener('keyup', (e) => {
  keysDown.delete(e.key.toLowerCase());
});
window.addEventListener('blur', () => { keysDown.clear(); mouseHeld = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { keysDown.clear(); mouseHeld = false; } });`,
  'F7: clear keysDown + mouseHeld on blur/visibilitychange'
);

// ================================================================
// Fix 8: mouseHeld clear on pointer lock loss
// ================================================================
safeReplace(
  `document.addEventListener('pointerlockchange', () => {
  c.locked = document.pointerLockElement === canvas3d;
  document.getElementById('lock-prompt').style.display = c.locked ? 'none' : (c.active ? 'flex' : 'none');
});`,
  `document.addEventListener('pointerlockchange', () => {
  c.locked = document.pointerLockElement === canvas3d;
  if (!c.locked) mouseHeld = false;
  document.getElementById('lock-prompt').style.display = c.locked ? 'none' : (c.active ? 'flex' : 'none');
});`,
  'F8: mouseHeld = false on pointer lock loss'
);

// ================================================================
// Fix 9: Reload timeout — always clear _reloading, guard rest
// ================================================================
safeReplace(
  `      setTimeout(() => {
        if (!c.active || c.dead) { c._reloading = false; return; }
        c.ammo = c.maxAmmo;
        c._reloading = false;
        c.weaponReady = true;
        AudioSFX.play('quest_complete');
        addComms('System', 'Ammo replenished.');
      }, 1500);`,
  `      setTimeout(() => {
        c._reloading = false;
        if (!c.active || c.dead) return;
        c.ammo = c.maxAmmo;
        c.weaponReady = true;
        AudioSFX.play('quest_complete');
        addComms('System', 'Ammo replenished.');
      }, 1500);`,
  'F9: reload always clears _reloading before guard'
);

// ================================================================
// Fix 10: Autopilot — steer via c.yaw/c.pitch instead of ship.rotation
// ================================================================
safeReplace(
  `  // Rotate ship towards target
  const targetDir = toTarget.normalize();
  _tmpV3a.set(0, 0, -1).applyQuaternion(ship.quaternion);
  _tmpV3b.set(0,0,0).crossVectors(_tmpV3a, targetDir);
  const currentFwd = _tmpV3a;
  const cross = _tmpV3b;
  const dot = currentFwd.dot(targetDir);

  // Yaw towards target
  ship.rotation.y += cross.y * 2.0 * dt;
  // Pitch towards target
  const pitchAngle = Math.asin(Math.max(-1, Math.min(1, targetDir.y)));
  ship.rotation.x += (pitchAngle - ship.rotation.x) * dt * 1.5;

  // Thrust`,
  `  // Steer camera yaw/pitch toward target (ship follows camera via quaternion slerp)
  const targetDir = toTarget.normalize();
  _tmpV3a.copy(targetDir);
  _tmpQuat.copy(camera.quaternion).invert();
  _tmpV3a.applyQuaternion(_tmpQuat);
  const steerYaw = -Math.atan2(_tmpV3a.x, -_tmpV3a.z);
  const steerPitch = Math.atan2(_tmpV3a.y, Math.sqrt(_tmpV3a.x * _tmpV3a.x + _tmpV3a.z * _tmpV3a.z));
  c.yaw += steerYaw * Math.min(1, dt * 2);
  c.pitch += steerPitch * Math.min(1, dt * 2);
  c.pitch = Math.max(-1.48, Math.min(1.48, c.pitch));

  // Thrust`,
  'F10: autopilot steers via c.yaw/c.pitch instead of ship.rotation'
);

// ================================================================
// Fix 11: Station procedural fallback — shared geometries
// ================================================================
safeReplace(
  `  const g = new THREE.Group();
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.4, metalness: 0.7 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 4, 12), hubMat));
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.3, metalness: 0.8, emissive: 0x223344, emissiveIntensity: 0.1 });
  const torusM = new THREE.Mesh(new THREE.TorusGeometry(12, 1.5, 8, 24), ringMat);`,
  `  const g = new THREE.Group();
  if (!spawnStationModel._hubGeo) {
    spawnStationModel._hubGeo = new THREE.CylinderGeometry(6, 6, 4, 12);
    spawnStationModel._torusGeo = new THREE.TorusGeometry(12, 1.5, 8, 24);
    spawnStationModel._panelGeo2 = new THREE.BoxGeometry(2, 10, 0.1);
    spawnStationModel._lightGeo2 = new THREE.SphereGeometry(0.3, 8, 8);
  }
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.4, metalness: 0.7 });
  g.add(new THREE.Mesh(spawnStationModel._hubGeo, hubMat));
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.3, metalness: 0.8, emissive: 0x223344, emissiveIntensity: 0.1 });
  const torusM = new THREE.Mesh(spawnStationModel._torusGeo, ringMat);`,
  'F11a: station shared hub + torus geo'
);

safeReplace(
  `  const _panelGeo = new THREE.BoxGeometry(2, 10, 0.1);
  const _panelMat = new THREE.MeshStandardMaterial({color:0x2244aa,roughness:0.2,metalness:0.5});
  for (let i = 0; i < 4; i++) {
    const angle = (i/4)*Math.PI*2;
    const panel = new THREE.Mesh(_panelGeo, _panelMat);`,
  `  const _panelMat = new THREE.MeshStandardMaterial({color:0x2244aa,roughness:0.2,metalness:0.5});
  for (let i = 0; i < 4; i++) {
    const angle = (i/4)*Math.PI*2;
    const panel = new THREE.Mesh(spawnStationModel._panelGeo2, _panelMat);`,
  'F11b: station shared panel geo'
);

safeReplace(
  `  const _lightGeo = new THREE.SphereGeometry(0.3,8,8);
  const _lightMat = new THREE.MeshBasicMaterial({color:0x44ff44,transparent:true,opacity:0.8});
  for (let i = 0; i < 8; i++) {
    const angle = (i/8)*Math.PI*2;
    const light = new THREE.Mesh(_lightGeo, _lightMat);`,
  `  const _lightMat = new THREE.MeshBasicMaterial({color:0x44ff44,transparent:true,opacity:0.8});
  for (let i = 0; i < 8; i++) {
    const angle = (i/8)*Math.PI*2;
    const light = new THREE.Mesh(spawnStationModel._lightGeo2, _lightMat);`,
  'F11c: station shared light geo'
);

// ================================================================
// Fix 12: Damage numbers — use dtMs instead of hardcoded 16
// ================================================================
safeReplace(
  `function renderHUD() {
  if (!hudCanvas || !hudCtx) return;`,
  `function renderHUD(dtMs) {
  if (!hudCanvas || !hudCtx) return;`,
  'F12a: renderHUD takes dtMs param'
);

safeReplace(
  `    dn.age += 16;`,
  `    dn.age += dtMs || 16;`,
  'F12b: damage numbers use dtMs'
);

safeReplace(
  `    renderHUD();`,
  `    renderHUD(dtMs);`,
  'F12c: pass dtMs to renderHUD'
);

// ================================================================
// Fix 13: Market buy order — refund unfilled after NPC auto-fill timeout
// ================================================================
safeReplace(
  `    renderMarketScreen();
  }, 2000 + Math.random() * 3000);
  renderMarketScreen();
};`,
  `    // Refund unfilled buy order portion
    if (_ord && _ord.quantity > 0 && _ord.type === 'buy') {
      const refund = _ord.price * _ord.quantity;
      state.player.credits += refund;
      state.market.orders = state.market.orders.filter(o => o.id !== _orderId);
      if (refund > 0) addComms('Market', 'Order expired. Refunded ' + refund + ' EC for unfilled ' + _ord.item + '.');
    }
    renderMarketScreen();
  }, 2000 + Math.random() * 3000);
  renderMarketScreen();
};`,
  'F13: refund unfilled buy orders after NPC timeout'
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
