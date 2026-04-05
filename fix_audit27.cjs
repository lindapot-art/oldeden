const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
let applied = 0, failed = 0;

function cr(s) { return s.replace(/\n/g, '\r\n'); }
function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr);
  if (!src.includes(o)) { console.error('MISS:', label); failed++; return; }
  const count = src.split(o).length - 1;
  if (count > 1) { console.error('MULTI(' + count + '):', label); failed++; return; }
  src = src.replace(o, cr(newStr));
  console.log('OK:', label);
  applied++;
}

// ─── Fix 1: Client rebirth speed 120 not 60, always reset ───
safeReplace(
  `  if (r.dmg > 0) state.upgrades.railgunDmg = 1 + (r.dmg / 100);
  if (r.shield > 0) state.upgrades.maxShield = 100 + r.shield;
  if (r.speed > 0) state.flight.maxSpeed = 60 * (1 + r.speed / 100);
  applyUpgrades();`,
  `  if (r.dmg > 0) state.upgrades.railgunDmg = 1 + (r.dmg / 100);
  if (r.shield > 0) state.upgrades.maxShield = 100 + r.shield;
  state.flight.maxSpeed = 120 * (1 + (r.speed || 0) / 100);
  applyUpgrades();`,
  'Fix1: Client rebirth speed 120'
);

// ─── Fix 2: Server rebirth:result full reset + applyUpgrades ───
safeReplace(
  `        s.on('rebirth:result', (data) => {
          // Soul Fragment was already created in the click handler
          state.player.genome = data.genome;
          state.player.rebirths++;
          state.player.credits = data.wallet.ec;
          state.player.stellarMarks = data.wallet.sm;
          state.combat.score = 0; state.combat.kills = 0; state.combat.cycle = 1; state.combat.bestStreak = 0;
          state.ship = { hull: 100, maxHull: 100, shield: 100, maxShield: 100, fuel: 100, maxFuel: 100, power: 100 };
          state.inventory = [];
          state.quests = state.quests.filter(q => !q.active);
          // Apply resonance bonuses to new life
          const r = state.player.resonanceBonuses;
          if (r.dmg > 0) state.upgrades.railgunDmg = 1 + (r.dmg / 100);
          if (r.shield > 0) state.upgrades.maxShield = 100 + r.shield;
          if (r.speed > 0) state.flight.maxSpeed = 60 * (1 + r.speed / 100);
          addComms('AI Director', 'You have been reborn. Your soul echoes with resonance.');
          checkAndClaimMilestones();
          saveGame();
          showScreen('bridge');
        });`,
  `        s.on('rebirth:result', (data) => {
          // Soul Fragment was already created in the click handler
          state.player.genome = data.genome;
          state.player.rebirths++;
          state.player.credits = data.wallet.ec;
          state.player.stellarMarks = data.wallet.sm;
          state.combat.score = 0; state.combat.kills = 0; state.combat.cycle = 1; state.combat.bestStreak = 0;
          state.combat.bossActive = false;
          state.inventory = [];
          state.quests = state.quests.filter(q => !q.active);
          // Reset upgrades to baseline before applying resonance
          state.upgrades.railgunDmg = 1; state.upgrades.shieldRegen = 3;
          state.upgrades.maxAmmo = 24; state.upgrades.maxHull = 100;
          state.upgrades.maxShield = 100; state.upgrades.engineSpeed = 1;
          const r = state.player.resonanceBonuses;
          if (r.dmg > 0) state.upgrades.railgunDmg = 1 + (r.dmg / 100);
          if (r.shield > 0) state.upgrades.maxShield = 100 + r.shield;
          state.flight.maxSpeed = 120 * (1 + (r.speed || 0) / 100);
          applyUpgrades();
          state.ship.hull = state.ship.maxHull; state.ship.shield = state.ship.maxShield;
          state.ship.fuel = state.ship.maxFuel;
          state.combat.ammo = state.combat.maxAmmo;
          state.combat.heat = 0; state.combat.godMode = false;
          addComms('AI Director', 'You have been reborn. Your soul echoes with resonance.');
          checkAndClaimMilestones();
          saveGame();
          showScreen('bridge');
        });`,
  'Fix2: Server rebirth full reset + applyUpgrades'
);

// ─── Fix 3: mouseHeld reset in exitGunnerMode ───
safeReplace(
  `function exitGunnerMode(skipScreenChange) {
  c.active = false;
  if (document.pointerLockElement) document.exitPointerLock();`,
  `function exitGunnerMode(skipScreenChange) {
  c.active = false;
  mouseHeld = false;
  if (document.pointerLockElement) document.exitPointerLock();`,
  'Fix3: mouseHeld reset on exit gunner'
);

// ─── Fix 4: F key exits gunner before star map ───
safeReplace(
  `  // F = warp (open star map)
  if (e.key === 'f' || e.key === 'F') {
    if (c.dead) return;
    showScreen('starmap');
  }`,
  `  // F = warp (exit gunner first so 3D scene is cleaned)
  if (e.key === 'f' || e.key === 'F') {
    if (c.dead) return;
    if (c.active) exitGunnerMode(true);
    showScreen('starmap');
  }`,
  'Fix4: F key exits gunner before starmap'
);

// ─── Fix 5: Action bar dock range check ───
safeReplace(
  `    else if (action === 'dock') { const sys = state.starSystems[state.location.systemIndex]; if (sys && sys.hasStation) { state.location.docked = true; AudioSFX.play('dock'); showScreen('station'); } else addComms('System', 'No station in this system.'); }`,
  `    else if (action === 'dock') { const sys = state.starSystems[state.location.systemIndex]; if (sys && sys.hasStation) { const stationInRange = stationModels.length === 0 || stationModels.some(m => ship.position.distanceTo(m.position) < 80); if (!stationInRange) { addComms('Navigation', 'Station out of docking range. Fly closer.'); return; } state.location.docked = true; AudioSFX.play('dock'); showScreen('station'); } else addComms('System', 'No station in this system.'); }`,
  'Fix5: Action bar dock range check'
);

// ─── Fix 6: Audio gain/filter disconnect on stop ───
safeReplace(
  `  stopEngineHum() {
    if (!this.engineHum) return;
    try { this.engineHum.osc1.stop(); this.engineHum.osc2.stop(); } catch(e) {}
    this.engineHum = null;
  },
  stopAmbience() {
    if (!this.ambience) return;
    try { this.ambience.stop(); } catch(e) {}
    this.ambience = null;
  },`,
  `  stopEngineHum() {
    if (!this.engineHum) return;
    try { this.engineHum.osc1.stop(); this.engineHum.osc2.stop(); } catch(e) {}
    try { this.engineHum.gain.disconnect(); this.engineHum.lp.disconnect(); } catch(e) {}
    this.engineHum = null;
  },
  stopAmbience() {
    if (!this.ambience) return;
    try { this.ambience.stop(); } catch(e) {}
    this.ambience = null;
  },`,
  'Fix6: Audio gain/filter disconnect'
);

// ─── Fix 6b: BGM gain disconnect ───
safeReplace(
  `  stopBGM() {
    if (!this.bgm) return;
    try { this.bgm.bass.stop(); this.bgm.pad.stop(); this.bgm.lfo.stop(); this.bgm.noise.stop(); } catch(e) {}
    this.bgm = null;
  },`,
  `  stopBGM() {
    if (!this.bgm) return;
    try { this.bgm.bass.stop(); this.bgm.pad.stop(); this.bgm.lfo.stop(); this.bgm.noise.stop(); } catch(e) {}
    try { if (this.bgm.masterGain) this.bgm.masterGain.disconnect(); } catch(e) {}
    this.bgm = null;
  },`,
  'Fix6b: BGM gain disconnect'
);

// ─── Fix 7: jumpToSystem connection check ───
safeReplace(
  `  state.location.systemIndex = idx;
  state.location.docked = false;
  state.ship.fuel = Math.max(0, state.ship.fuel - 5);
  // Economy sink: fuel cost for warp jump`,
  `  // Enforce jump route connectivity
  if (!state.inAltUniverse) {
    const _curSys = state.starSystems[state.location.systemIndex];
    if (_curSys && _curSys.connections && !_curSys.connections.includes(idx)) {
      addComms('Navigation', 'No jump route to that system. Select a connected system.');
      AudioSFX.play('shield_hit');
      return;
    }
  }
  state.location.systemIndex = idx;
  state.location.docked = false;
  state.ship.fuel = Math.max(0, state.ship.fuel - 5);
  // Economy sink: fuel cost for warp jump`,
  'Fix7: jumpToSystem connection check'
);

// ─── Fix 8: Outer systems guaranteed 1+ connection ───
safeReplace(
  `      if (dist < 120) s.connections.push(j);
    });
  });
  return systems;`,
  `      if (dist < 120) s.connections.push(j);
    });
  });
  // Guarantee every system has at least 1 connection
  systems.forEach((s, i) => {
    if (s.connections.length === 0) {
      let _nearIdx = -1, _nearDist = Infinity;
      systems.forEach((t, j) => {
        if (i === j) return;
        const d = Math.hypot(s.x - t.x, s.y - t.y);
        if (d < _nearDist) { _nearDist = d; _nearIdx = j; }
      });
      if (_nearIdx >= 0) {
        s.connections.push(_nearIdx);
        if (!systems[_nearIdx].connections.includes(i)) systems[_nearIdx].connections.push(i);
      }
    }
  });
  return systems;`,
  'Fix8: Outer systems guaranteed connections'
);

// ─── Fix 9: fade-in class reset for re-animation ───
safeReplace(
  `  if (el) { el.classList.add('active'); el.classList.add('fade-in'); }`,
  `  if (el) {
    el.classList.remove('fade-in');
    el.classList.add('active');
    void el.offsetWidth;
    el.classList.add('fade-in');
  }`,
  'Fix9: fade-in class reset for re-animation'
);

// ─── Fix 10: Save flight.maxSpeed ───
safeReplace(
  `    upgrades: state.upgrades,
    settings: state.settings,
    // Persist new systems across sessions`,
  `    upgrades: state.upgrades,
    settings: state.settings,
    flight: { maxSpeed: state.flight.maxSpeed },
    // Persist new systems across sessions`,
  'Fix10a: Save flight.maxSpeed'
);

// ─── Fix 10b: Load flight.maxSpeed ───
safeReplace(
  `  if (data.insuredItemId) state.insuredItemId = data.insuredItemId;
  // Soul Fracture migration for old saves`,
  `  if (data.insuredItemId) state.insuredItemId = data.insuredItemId;
  if (data.flight && data.flight.maxSpeed) state.flight.maxSpeed = data.flight.maxSpeed;
  // Soul Fracture migration for old saves`,
  'Fix10b: Load flight.maxSpeed'
);

fs.writeFileSync(file, src, 'utf8');
console.log('\n=== AUDIT 27 RESULT: ' + applied + ' applied, ' + failed + ' failed ===');
const open = (src.match(/\{/g) || []).length;
const close = (src.match(/\}/g) || []).length;
console.log('Braces: { ' + open + ' } ' + close + ' delta=' + (open - close));
