// Audit 34 patch — fixes corrupted audit 33 NPC engine glow + 9 new fixes
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
let ok = 0, fail = 0;

function cr(s) { return s.replace(/\r?\n/g, '\r\n'); }

function safeReplace(old, rep, label) {
  const oldCR = cr(old);
  const idx = src.indexOf(oldCR);
  if (idx === -1) { console.error('FAIL: ' + label + ' — pattern not found'); fail++; return; }
  if (src.indexOf(oldCR, idx + 1) !== -1) { console.error('FAIL: ' + label + ' — pattern not unique'); fail++; return; }
  src = src.slice(0, idx) + cr(rep) + src.slice(idx + oldCR.length);
  console.log('OK: ' + label);
  ok++;
}

// ================================================================
// F1: CRITICAL — Fix corrupted NPC engine glow code (audit 33 broke this)
// Restore original Mesh creation + add _pooled flags properly
// ================================================================
safeReplace(
  `  { const eM = new THREEF._pooled = true;
    window._npcEngineMatH = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.7 });
    window._npcEngineMatH._pooled = trueneMatH); eM.position.set(0, 0, 1.6); g.add(eM); }`,
  `  window._npcEngineMatF._pooled = true; window._npcEngineMatH._pooled = true;
  { const eM = new THREE.Mesh(window._npcEngineGeo, npcDef.friendly ? window._npcEngineMatF : window._npcEngineMatH); eM.position.set(0, 0, 1.6); g.add(eM); }`,
  'F1: NPC engine glow restore + _pooled flags'
);

// ================================================================
// F2: Shield shimmer — set visible=true on trigger, visible=false on expiry
// ================================================================
safeReplace(
  `function triggerShieldShimmer() {
  shieldShimmerTimer = 300;
  shieldShimmerMat.opacity = 0.35;
  shieldShimmerMat.color.setHex(0x44aaff);
}`,
  `function triggerShieldShimmer() {
  shieldShimmerTimer = 300;
  shieldShimmerMat.opacity = 0.35;
  shieldShimmerMat.color.setHex(0x44aaff);
  shieldShimmer.visible = true;
}`,
  'F2: Shield shimmer visible=true on trigger'
);

safeReplace(
  `    if (shieldShimmerTimer > 0) {
      shieldShimmerTimer -= dtMs;
      shieldShimmerMat.opacity = Math.max(0, (shieldShimmerTimer / 300) * 0.35);
      shieldShimmer.rotation.y += dt * 3;
      shieldShimmer.rotation.x += dt * 1.5;
      if (shieldShimmerTimer <= 100) shieldShimmerMat.color.setHex(0x2266cc);
    }`,
  `    if (shieldShimmerTimer > 0) {
      shieldShimmerTimer -= dtMs;
      shieldShimmerMat.opacity = Math.max(0, (shieldShimmerTimer / 300) * 0.35);
      shieldShimmer.rotation.y += dt * 3;
      if (shieldShimmerTimer <= 0) shieldShimmer.visible = false;
      shieldShimmer.rotation.x += dt * 1.5;
      if (shieldShimmerTimer <= 100) shieldShimmerMat.color.setHex(0x2266cc);
    }`,
  'F2b: Shield shimmer visible=false on expiry'
);

// ================================================================
// F3: enterAltUniverse — guard against double-entry overwriting _origSystems
// ================================================================
safeReplace(
  `function enterAltUniverse() {
  state.altUniverse = generateAltUniverse();
  state.inAltUniverse = true;`,
  `function enterAltUniverse() {
  if (state.inAltUniverse) return; // Prevent double-entry overwriting original systems
  state.altUniverse = generateAltUniverse();
  state.inAltUniverse = true;`,
  'F3: enterAltUniverse double-entry guard'
);

// ================================================================
// F4: exitAltUniverse — null out _origSystems to prevent save bloat
// ================================================================
safeReplace(
  `  state.altUniverse = null;
  AudioSFX.play('jump');
  showScreen('bridge');
}

function collectArtifact() {`,
  `  state.altUniverse = null;
  state._origSystems = null;
  state._origSystemIndex = null;
  AudioSFX.play('jump');
  showScreen('bridge');
}

function collectArtifact() {`,
  'F4: exitAltUniverse cleanup stale _origSystems'
);

// ================================================================
// F5: collectArtifact — deduplicate inventory entries
// ================================================================
safeReplace(
  `  const name = sys.resources[0] || 'Unknown Artifact';
  state.inventory.push({ name, quantity: 1 });`,
  `  const name = sys.resources[0] || 'Unknown Artifact';
  const _existArt = state.inventory.find(i => i.name === name);
  if (_existArt) _existArt.quantity += 1;
  else state.inventory.push({ name, quantity: 1 });`,
  'F5: collectArtifact inventory dedup'
);

// ================================================================
// F6: Market order guards — abort NPC fill if dead/dimension/navigation change
// ================================================================
safeReplace(
  `  const _rebirthSnapshot = state.player.rebirths;
  setTimeout(() => {
    if (state.player.rebirths !== _rebirthSnapshot) return; // Guard: abort if rebirth happened`,
  `  const _rebirthSnapshot = state.player.rebirths;
  const _screenSnapshot = state.currentScreen;
  const _altSnapshot = state.inAltUniverse;
  setTimeout(() => {
    if (state.player.rebirths !== _rebirthSnapshot) return; // Guard: abort if rebirth happened
    if (c.dead) return; // Guard: abort if player died
    if (state.inAltUniverse !== _altSnapshot) return; // Guard: abort if dimension changed
    if (state.currentScreen !== _screenSnapshot) return; // Guard: abort if navigated away`,
  'F6: Market order guards for death/dimension/nav'
);

// ================================================================
// F7: Boss accuracy scaling — inaccuracy decreases at higher cycles
// ================================================================
safeReplace(
  `      const fireInterval = e.isBoss ? Math.max(600, 1500 - (c.cycle - 1) * 100) : (e.shootRate || 3000);
      const MAX_BOLTS = 30;
      if ((c.playerHasAttacked || autoAggro) && c.enemyBolts.length < MAX_BOLTS && state.gameTime - e.lastShot > fireInterval && e.group.position.distanceTo(ship.position) < SPAWN_RADIUS) {
        e.lastShot = state.gameTime;
        _tmpV3b.copy(ship.position).sub(e.group.position).normalize();
        // Add slight inaccuracy
        _tmpV3b.x += (Math.random() - 0.5) * 0.15;
        _tmpV3b.y += (Math.random() - 0.5) * 0.15;`,
  `      const fireInterval = e.isBoss ? Math.max(600, 1500 - (c.cycle - 1) * 100) : (e.shootRate || 3000);
      const MAX_BOLTS = 30;
      // Boss accuracy improves at higher cycles
      const _inaccuracy = e.isBoss ? Math.max(0.04, 0.15 - c.cycle * 0.01) : 0.15;
      if ((c.playerHasAttacked || autoAggro) && c.enemyBolts.length < MAX_BOLTS && state.gameTime - e.lastShot > fireInterval && e.group.position.distanceTo(ship.position) < SPAWN_RADIUS) {
        e.lastShot = state.gameTime;
        _tmpV3b.copy(ship.position).sub(e.group.position).normalize();
        // Add slight inaccuracy
        _tmpV3b.x += (Math.random() - 0.5) * _inaccuracy;
        _tmpV3b.y += (Math.random() - 0.5) * _inaccuracy;`,
  'F7: Boss accuracy scaling by cycle'
);

// ================================================================
// F8: Asteroid collision — play hull_hit when unshielded, shield_hit only when shielded
// ================================================================
safeReplace(
  `            if (hadShield && state.ship.shield <= 0) { c.shieldBreakTimer = 2000; AudioSFX.play('shield_break'); }
            c.damageFlash = 350;
            AudioSFX.play('shield_hit'); triggerShieldShimmer();
            c._asteroidHitCooldown = performance.now() + 800; // 800ms cooldown between hits`,
  `            if (hadShield && state.ship.shield <= 0) { c.shieldBreakTimer = 2000; AudioSFX.play('shield_break'); }
            c.damageFlash = 350;
            if (hadShield) { AudioSFX.play('shield_hit'); triggerShieldShimmer(); } else { AudioSFX.play('hull_hit'); }
            c._asteroidHitCooldown = performance.now() + 800; // 800ms cooldown between hits`,
  'F8: Asteroid collision hull_hit when unshielded'
);

// ================================================================
// F9: sessionStartTime — track combat session start for session-relative timers
// ================================================================
safeReplace(
  `  c.streak = 0; c.streakTimer = 0; c.streakMultiplier = 1;
  c.playerHasAttacked = false;
  // Death immunity shield`,
  `  c.streak = 0; c.streakTimer = 0; c.streakMultiplier = 1;
  c.playerHasAttacked = false;
  c.sessionStartTime = state.gameTime; // Track when this combat session began
  // Death immunity shield`,
  'F9: sessionStartTime in enterGunnerMode'
);

// ================================================================
// F10: Mining laser — proper quaternion alignment (fix missing closing paren from audit 33)
// The current lookAt+rotateX approach works but can jitter at singularities.
// Replace with proper quaternion setFromUnitVectors.
// ================================================================
safeReplace(
  `    miningLaserBeam.position.copy(mid);
    miningLaserBeam.scale.set(1, dist, 1);
    miningLaserBeam.lookAt(to);
    miningLaserBeam.rotateX(Math.PI/2);`,
  `    miningLaserBeam.position.copy(mid);
    miningLaserBeam.scale.set(1, dist, 1);
    // Align cylinder (Y-axis) along beam direction via quaternion
    _tmpV3a.copy(to).sub(from).normalize();
    miningLaserBeam.quaternion.setFromUnitVectors(_upVec, _tmpV3a);`,
  'F10: Mining laser quaternion alignment'
);

// ================================================================
// F11: Ghost NPC — skip MeshBasicMaterial (no emissive property)
// ================================================================
safeReplace(
  `      lastNpc.group.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.emissive = _ghostColor;`,
  `      lastNpc.group.traverse(child => {
        if (child.isMesh && child.material && !child.material.isMeshBasicMaterial) {
          child.material = child.material.clone();
          child.material.emissive = _ghostColor;`,
  'F11: Ghost NPC skip MeshBasicMaterial'
);

// ================================================================
// Write result
// ================================================================
fs.writeFileSync(FILE, src, 'utf8');
const lines = src.split(/\r?\n/).length;
const opens = (src.match(/\{/g) || []).length;
const closes = (src.match(/\}/g) || []).length;
const pOpens = (src.match(/\(/g) || []).length;
const pCloses = (src.match(/\)/g) || []).length;
console.log('\n=== AUDIT 34 PATCH RESULTS ===');
console.log(ok + ' OK, ' + fail + ' FAIL');
console.log('Braces: ' + opens + '/' + closes + (opens === closes ? ' BALANCED' : ' MISMATCH!'));
console.log('Parens: ' + pOpens + '/' + pCloses + (pOpens === pCloses ? ' BALANCED' : ' MISMATCH!'));
console.log('Lines: ' + lines);
if (fail > 0) process.exit(1);
