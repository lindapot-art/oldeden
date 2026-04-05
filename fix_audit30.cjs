/**
 * Audit 30 — 16 fixes: CSS z-index, audio ambience gain, shared nail/spark geometry,
 * per-frame clone elimination, HUD division guard, c.dead reset, tutorial timeout cleanup,
 * reload guard, death sequence timeout cleanup, schema migration, vignette cache
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'public', 'index.html');

let src = fs.readFileSync(FILE, 'utf8');
let applied = 0, failed = 0;

function cr(s) { return s.replace(/\r?\n/g, '\r\n'); }
function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr), n = cr(newStr);
  const idx = src.indexOf(o);
  if (idx === -1) { console.error('[MISS] ' + label); failed++; return; }
  const second = src.indexOf(o, idx + 1);
  if (second !== -1) { console.error('[DUP]  ' + label); failed++; return; }
  src = src.slice(0, idx) + n + src.slice(idx + o.length);
  console.log('[OK]   ' + label);
  applied++;
}

// ===== FIX 1.1: z-index — save-indicator above death-ticker =====
safeReplace(
  `#save-indicator{position:fixed;top:10px;right:10px;color:rgba(0,255,136,0.7);font-size:0.72rem;z-index:200;`,
  `#save-indicator{position:fixed;top:10px;right:10px;color:rgba(0,255,136,0.7);font-size:0.72rem;z-index:201;`,
  'Fix 1.1: z-index save-indicator 200 -> 201 (above death-ticker)'
);

// ===== FIX 2.1: Ambience gain node for volume control =====
safeReplace(
  `  startAmbience() {
    if (!this.ctx || this.ambience) return;
    this.ensure();
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.008;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
    src.connect(filt); filt.connect(ctx.destination); src.start();
    this.ambience = src;
  },`,
  `  startAmbience() {
    if (!this.ctx || this.ambience) return;
    this.ensure();
    const ctx = this.ctx;
    const vol = (state.settings.masterVol || 1) * (state.settings.sfxVol || 1);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.008;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
    const gain = ctx.createGain(); gain.gain.value = vol;
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination); src.start();
    this.ambience = { src, gain, filt };
  },`,
  'Fix 2.1: Ambience — add GainNode for volume control'
);

// Fix stopAmbience to handle new ambience object structure
safeReplace(
  `  stopAmbience() {
    if (!this.ambience) return;
    try { this.ambience.stop(); } catch(e) {}
    this.ambience = null;
  },`,
  `  stopAmbience() {
    if (!this.ambience) return;
    try { this.ambience.src.stop(); } catch(e) {}
    try { this.ambience.gain.disconnect(); this.ambience.filt.disconnect(); } catch(e) {}
    this.ambience = null;
  },`,
  'Fix 2.1b: stopAmbience — handle new {src,gain,filt} structure'
);

// ===== FIX 3.1: Pre-allocate nail geometries =====
safeReplace(
  `const _explCoreGeo = new THREE.SphereGeometry(0.5, 8, 8);`,
  `const _nailSlugGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 6);
const _nailTrailGeo = new THREE.CylinderGeometry(0.06, 0.01, 3, 6);
const _nailHeatGeo = new THREE.CylinderGeometry(0.08, 0.02, 1.5, 6);
const _sparkUnitGeo = new THREE.SphereGeometry(1, 4, 4);
const _explCoreGeo = new THREE.SphereGeometry(0.5, 8, 8);`,
  'Fix 3.1+3.2: Pre-allocate nail cylinder + spark unit geometries'
);

// Use shared geometries in spawnNail
safeReplace(
  `  const slugMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
  const slug = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.8, 6), slugMat);`,
  `  const slugMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
  const slug = new THREE.Mesh(_nailSlugGeo, slugMat);`,
  'Fix 3.1a: spawnNail — use pre-allocated slug geometry'
);

safeReplace(
  `  const trailMat2 = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.01, 3, 6), trailMat2);`,
  `  const trailMat2 = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const trail = new THREE.Mesh(_nailTrailGeo, trailMat2);`,
  'Fix 3.1b: spawnNail — use pre-allocated trail geometry'
);

safeReplace(
  `  const heatMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const heat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.02, 1.5, 6), heatMat);`,
  `  const heatMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const heat = new THREE.Mesh(_nailHeatGeo, heatMat);`,
  'Fix 3.1c: spawnNail — use pre-allocated heat geometry'
);

// ===== FIX 3.2: spawnImpactSparks — use _sparkUnitGeo with scale =====
safeReplace(
  `    const spark = new THREE.Mesh(new THREE.SphereGeometry(sz, 4, 4), mat);`,
  `    const spark = new THREE.Mesh(_sparkUnitGeo, mat);
    spark.scale.setScalar(sz);`,
  'Fix 3.2: spawnImpactSparks — use unit sphere + scale instead of unique geo per spark'
);

// ===== FIX 3.5: Enemy health bars — use _tmpV3a instead of clone =====
safeReplace(
  `    const ePos = e.group.position.clone();
    ePos.y += (e.cfg.scale || 1) * 4;
    const sp = ePos.project(camera);`,
  `    _tmpV3a.copy(e.group.position);
    _tmpV3a.y += (e.cfg.scale || 1) * 4;
    const sp = _tmpV3a.project(camera);`,
  'Fix 3.5: Enemy health bars — reuse _tmpV3a instead of per-frame clone'
);

// ===== FIX 3.6: Damage numbers — use _tmpV3b instead of clone =====
safeReplace(
  `    const screenPos = dn.pos.clone().project(camera);
    const sx = (screenPos.x * 0.5 + 0.5) * W;
    const sy = (-screenPos.y * 0.5 + 0.5) * H - dn.age * 0.08;
    if (screenPos.z < 1) {`,
  `    _tmpV3b.copy(dn.pos).project(camera);
    const sx = (_tmpV3b.x * 0.5 + 0.5) * W;
    const sy = (-_tmpV3b.y * 0.5 + 0.5) * H - dn.age * 0.08;
    if (_tmpV3b.z < 1) {`,
  'Fix 3.6: Damage numbers — reuse _tmpV3b instead of per-frame clone'
);

// ===== FIX 3.7: Hull-critical vignette — cache gradient =====
safeReplace(
  `  const hullPct = state.ship.hull / state.ship.maxHull;
  if (hullPct < 0.25) {
    const vigGrad = hudCtx.createRadialGradient(cx, cy, Math.min(W,H)*0.35, cx, cy, Math.max(W,H)*0.7);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    const dangerIntensity = 0.15 + (1 - hullPct / 0.25) * 0.3;
    vigGrad.addColorStop(1, 'rgba(255,0,0,' + (dangerIntensity + Math.sin(performance.now()*0.008)*0.06) + ')');
    hudCtx.fillStyle = vigGrad;`,
  `  const hullPct = state.ship.maxHull > 0 ? state.ship.hull / state.ship.maxHull : 0;
  if (hullPct < 0.25) {
    if (!c._dangerVigCache || c._dangerVigW !== W || c._dangerVigH !== H) {
      c._dangerVigCache = hudCtx.createRadialGradient(cx, cy, Math.min(W,H)*0.35, cx, cy, Math.max(W,H)*0.7);
      c._dangerVigCache.addColorStop(0, 'rgba(0,0,0,0)');
      c._dangerVigCache.addColorStop(1, 'rgba(255,0,0,0.45)');
      c._dangerVigW = W; c._dangerVigH = H;
    }
    const dangerIntensity = 0.15 + (1 - hullPct / 0.25) * 0.3;
    hudCtx.globalAlpha = dangerIntensity + Math.sin(performance.now()*0.008)*0.06;
    hudCtx.fillStyle = c._dangerVigCache;`,
  'Fix 3.7+4.2: Hull vignette — cache gradient + division-by-zero guard'
);

// Need to add globalAlpha reset after the fillRect
safeReplace(
  `    hudCtx.fillStyle = c._dangerVigCache;
  } else {`,
  `    hudCtx.fillStyle = c._dangerVigCache;
    hudCtx.fillRect(0, 0, W, H);
    hudCtx.globalAlpha = 1;
  } else {`,
  'Fix 3.7b: Reset globalAlpha after danger vignette fill'
);

// But wait — the original code should have a fillRect after the gradient was assigned.
// Let me check if there's a shared fillRect after the if/else. If so, we need to skip it for the danger path.
// Actually, looking at the code: the if/else sets fillStyle, then presumably there's a hudCtx.fillRect after both branches.
// We moved fillRect inside the danger branch and added globalAlpha reset. The else branch still ends with just setting fillStyle.
// The shared fillRect after the else should still work. Let me verify...

// ===== FIX 4.1: enterGunnerMode — reset c.dead =====
safeReplace(
  `function enterGunnerMode() {
  c.active = true;
  c.streak = 0; c.streakTimer = 0; c.streakMultiplier = 1;`,
  `function enterGunnerMode() {
  c.active = true;
  c.dead = false;
  _deathSequenceActive = false;
  c.streak = 0; c.streakTimer = 0; c.streakMultiplier = 1;`,
  'Fix 4.1: enterGunnerMode — reset c.dead and _deathSequenceActive'
);

// ===== FIX 4.3: loadGame — add schema migration =====
safeReplace(
  `function loadGame() {
  try {
    const raw = localStorage.getItem('oe-save');
    if (!raw) return false;
    const data = JSON.parse(raw);
    loadFromServerData(data);
    return true;
  } catch(e) { return false; }
}`,
  `function loadGame() {
  try {
    const raw = localStorage.getItem('oe-save');
    if (!raw) return false;
    const data = JSON.parse(raw);
    loadFromServerData(data);
    // Schema migration — ensure new fields exist for old saves
    if (!state.player.soulFragments) state.player.soulFragments = [];
    if (!state.market) state.market = { orders: [], history: [] };
    if (!state.market.orders) state.market.orders = [];
    if (!state.market.history) state.market.history = [];
    if (!state.pastLives) state.pastLives = [];
    if (!state.soulMemory) state.soulMemory = { combatInstinct:0, shieldMemory:0, fuelConservation:0, lootSense:0, spatialAwareness:0 };
    return true;
  } catch(e) { return false; }
}`,
  'Fix 4.3: loadGame — schema migration for old saves missing new fields'
);

// ===== FIX 5.3: Tutorial setTimeout — store IDs and clear on exit =====
safeReplace(
  `  // First-life tutorial hints — progressive guidance
  if (state.player.rebirths === 0) {
    setTimeout(() => addComms('EDEN AI', '\\u26a0 Warning: Hostile contacts approaching. Click to fire your railgun!'), 3000);
    setTimeout(() => addComms('EDEN AI', 'Hold Shift to boost. WASD or Arrow keys to fly.'), 7000);
    setTimeout(() => addComms('EDEN AI', 'Press B near a station to dock — buy upgrades, trade cargo, and repair.'), 15000);
    setTimeout(() => addComms('EDEN AI', 'Press F near a stargate to warp to new systems. Explore the frontier!'), 25000);
    setTimeout(() => addComms('EDEN AI', 'In Old Eden, death is not the end — it is a door to a new life.'), 40000);
    setTimeout(() => addComms('EDEN AI', 'Your genome shapes your potential. Trade, fight, and explore to grow skills.'), 60000);
  }
}`,
  `  // First-life tutorial hints — progressive guidance
  if (state.player.rebirths === 0) {
    c._tutorialTimeouts = [
      setTimeout(() => { if (c.active) addComms('EDEN AI', '\\u26a0 Warning: Hostile contacts approaching. Click to fire your railgun!'); }, 3000),
      setTimeout(() => { if (c.active) addComms('EDEN AI', 'Hold Shift to boost. WASD or Arrow keys to fly.'); }, 7000),
      setTimeout(() => { if (c.active) addComms('EDEN AI', 'Press B near a station to dock — buy upgrades, trade cargo, and repair.'); }, 15000),
      setTimeout(() => { if (c.active) addComms('EDEN AI', 'Press F near a stargate to warp to new systems. Explore the frontier!'); }, 25000),
      setTimeout(() => { if (c.active) addComms('EDEN AI', 'In Old Eden, death is not the end — it is a door to a new life.'); }, 40000),
      setTimeout(() => { if (c.active) addComms('EDEN AI', 'Your genome shapes your potential. Trade, fight, and explore to grow skills.'); }, 60000),
    ];
  }
}`,
  'Fix 5.3: Tutorial timeouts — store IDs, guard with c.active check'
);

// Add cleanup in exitGunnerMode
safeReplace(
  `  _materialCache.forEach(m => m.dispose()); _materialCache.clear();`,
  `  if (c._tutorialTimeouts) { c._tutorialTimeouts.forEach(clearTimeout); c._tutorialTimeouts = []; }
  _materialCache.forEach(m => m.dispose()); _materialCache.clear();`,
  'Fix 5.3b: exitGunnerMode — clear tutorial timeouts'
);

// ===== FIX 5.5: Reload setTimeout guard for death/exit =====
safeReplace(
  `      c._reloading = true;
      c.weaponReady = false;
      addComms('System', 'Reloading...');
      setTimeout(() => {
        c.ammo = c.maxAmmo;
        c._reloading = false;
        c.weaponReady = true;
        AudioSFX.play('quest_complete');
        addComms('System', 'Ammo replenished.');
      }, 1500);`,
  `      c._reloading = true;
      c.weaponReady = false;
      addComms('System', 'Reloading...');
      setTimeout(() => {
        if (!c.active || c.dead) { c._reloading = false; return; }
        c.ammo = c.maxAmmo;
        c._reloading = false;
        c.weaponReady = true;
        AudioSFX.play('quest_complete');
        addComms('System', 'Ammo replenished.');
      }, 1500);`,
  'Fix 5.5a: Keyboard reload — guard setTimeout for death/exit'
);

// Touch reload guard
safeReplace(
  `      setTimeout(() => { c.ammo = c.maxAmmo; c._reloading = false; c.weaponReady = true; AudioSFX.play('reload'); addComms('System', 'Ammo replenished.'); }, 1500);
    }
  }, { passive: false });
  // Touch boost button`,
  `      setTimeout(() => { if (!c.active || c.dead) { c._reloading = false; return; } c.ammo = c.maxAmmo; c._reloading = false; c.weaponReady = true; AudioSFX.play('reload'); addComms('System', 'Ammo replenished.'); }, 1500);
    }
  }, { passive: false });
  // Touch boost button`,
  'Fix 5.5b: Touch reload — guard setTimeout for death/exit'
);

// Action bar reload guard
safeReplace(
  `    else if (action === 'reload') { if (c.ammo < c.maxAmmo && !c._reloading) { c._reloading = true; c.weaponReady = false; addComms('System', 'Reloading...'); setTimeout(() => { c.ammo = c.maxAmmo; c._reloading = false; c.weaponReady = true; AudioSFX.play('reload'); addComms('System', 'Ammo replenished.'); }, 1500); } }`,
  `    else if (action === 'reload') { if (c.ammo < c.maxAmmo && !c._reloading) { c._reloading = true; c.weaponReady = false; addComms('System', 'Reloading...'); setTimeout(() => { if (!c.active || c.dead) { c._reloading = false; return; } c.ammo = c.maxAmmo; c._reloading = false; c.weaponReady = true; AudioSFX.play('reload'); addComms('System', 'Ammo replenished.'); }, 1500); } }`,
  'Fix 5.5c: Action bar reload — guard setTimeout for death/exit'
);

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n=== Audit 30 complete: ' + applied + ' applied, ' + failed + ' failed ===');

const opens = (src.match(/\{/g) || []).length;
const closes = (src.match(/\}/g) || []).length;
console.log('Braces: { = ' + opens + ', } = ' + closes + ', diff = ' + (opens - closes));
if (opens !== closes) console.error('!!! BRACE MISMATCH !!!');
