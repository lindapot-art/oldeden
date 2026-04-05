/**
 * Audit 18 — UX Polish, Safety, & Discoverability (10 fixes)
 *
 *  1. showScreen race condition guard (_transitioning flag)
 *  2. Gunner enter/exit fade transition (150ms)
 *  3. H key to re-show controls overlay
 *  4. WebGL context lost/restored handling
 *  5. Radar asteroid dots (yellow)
 *  6. Action bar button tooltips
 *  7. Settings: BGM volume slider (HTML + JS + state)
 *  8. Settings: Keybinds reference section
 *  9. GLB loading overlay (CSS + HTML + progress tracking)
 * 10. Mobile boost button
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

// ── Fix 1: showScreen race condition guard ──
safeReplace(
`function showScreen(name) {
  // Guard: don't enter gunner if 3D engine isn't ready — prevents dead-state trap
  if (name === 'gunner' && !threeReady) {
    addComms('System', '3D engine not available. Cannot enter gunner mode.');
    return;
  }
  // Fade transition for non-gunner screens
  if (name !== 'gunner' && state.screen !== 'gunner' && name !== state.screen) {
    const _overlay = document.getElementById('screen-transition-overlay');
    if (_overlay) {
      _overlay.classList.add('active');
      setTimeout(() => { _showScreenInner(name); _overlay.classList.remove('active'); }, 250);
      return;
    }
  }
  _showScreenInner(name);
}`,
`let _transitioning = false;
function showScreen(name) {
  // Guard: block during active transition to prevent race conditions
  if (_transitioning) return;
  // Guard: don't enter gunner if 3D engine isn't ready — prevents dead-state trap
  if (name === 'gunner' && !threeReady) {
    addComms('System', '3D engine not available. Cannot enter gunner mode.');
    return;
  }
  // Same-screen guard
  if (name === state.screen) return;
  const _overlay = document.getElementById('screen-transition-overlay');
  // Fade transition for ALL screen changes (150ms for gunner, 250ms for menus)
  const dur = (name === 'gunner' || state.screen === 'gunner') ? 150 : 250;
  if (_overlay) {
    _transitioning = true;
    _overlay.classList.add('active');
    setTimeout(() => { _showScreenInner(name); _overlay.classList.remove('active'); _transitioning = false; }, dur);
    return;
  }
  _showScreenInner(name);
}`,
'Fix 1: showScreen race guard + gunner fade'
);

// ── Fix 2: H key to re-show controls overlay ──
safeReplace(
`  // K = skin panel toggle
  if (e.key === 'k' || e.key === 'K') {
    document.getElementById('skin-panel').classList.toggle('open');
  }`,
`  // K = skin panel toggle
  if (e.key === 'k' || e.key === 'K') {
    document.getElementById('skin-panel').classList.toggle('open');
  }
  // H = show controls help overlay
  if (e.key === 'h' || e.key === 'H') {
    const _co = document.getElementById('controls-overlay');
    if (_co) {
      _co.classList.toggle('active');
      if (_co.classList.contains('active')) {
        const _dismissH = () => { _co.classList.add('fading'); setTimeout(() => _co.classList.remove('active', 'fading'), 1500); };
        setTimeout(() => { document.addEventListener('mousedown', _dismissH, { once: true }); document.addEventListener('keydown', (ev) => { if (ev.key !== 'h' && ev.key !== 'H') _dismissH(); }, { once: true }); }, 300);
      }
    }
  }`,
'Fix 2: H key re-shows controls overlay'
);

// ── Fix 3: WebGL context lost/restored handling ──
// Insert after renderer setup, before scene creation
safeReplace(
`renderer.shadowMap.enabled = false;

// Bloom post-processing`,
`renderer.shadowMap.enabled = false;

// WebGL context lost/restored recovery
canvas3d.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.error('[Old Eden] WebGL context lost');
  const lostDiv = document.getElementById('webgl-lost-overlay');
  if (lostDiv) lostDiv.classList.add('active');
});
canvas3d.addEventListener('webglcontextrestored', () => {
  console.log('[Old Eden] WebGL context restored');
  const lostDiv = document.getElementById('webgl-lost-overlay');
  if (lostDiv) lostDiv.classList.remove('active');
  // Re-init renderer settings
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.8;
});

// Bloom post-processing`,
'Fix 3: WebGL context lost/restored handling'
);

// ── Fix 4: CSS for webgl-lost-overlay + glb-loading-overlay ──
safeReplace(
`/* ── Reduced Motion ──────────────────────── */`,
`/* ── WebGL Lost Overlay ───────────────────── */
#webgl-lost-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.92);display:none;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;}
#webgl-lost-overlay.active{display:flex;}
#webgl-lost-overlay .wl-title{font-size:1.6rem;color:#ff4444;margin-bottom:1rem;letter-spacing:0.15em;}
#webgl-lost-overlay .wl-sub{font-size:0.9rem;color:#888;margin-bottom:1.5rem;}
#webgl-lost-overlay .wl-btn{padding:10px 24px;background:#cc0000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:1rem;}

/* ── GLB Loading Overlay ─────────────────── */
#glb-loading-overlay{position:fixed;bottom:60px;left:50%;transform:translateX(-50%);z-index:50;padding:6px 18px;background:rgba(10,10,15,0.85);border:1px solid rgba(68,170,255,0.3);border-radius:6px;color:rgba(68,170,255,0.8);font-size:0.75rem;letter-spacing:0.1em;pointer-events:none;opacity:0;transition:opacity 0.3s ease;}
#glb-loading-overlay.active{opacity:1;}
#glb-loading-overlay .glb-bar{width:120px;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:4px;overflow:hidden;}
#glb-loading-overlay .glb-fill{height:100%;background:rgba(68,170,255,0.6);border-radius:2px;transition:width 0.2s ease;width:0%;}

/* ── Reduced Motion ──────────────────────── */`,
'Fix 4: CSS for webgl-lost + glb-loading overlays'
);

// ── Fix 5: HTML for webgl-lost-overlay + glb-loading-overlay ──
safeReplace(
`<div id="muzzle-flash-overlay"></div>

<!-- Screen transition fade overlay`,
`<div id="muzzle-flash-overlay"></div>
<div id="webgl-lost-overlay"><div class="wl-title">&#9888; GPU CONNECTION LOST</div><div class="wl-sub">The WebGL context was lost. This may be a driver issue.</div><button class="wl-btn" onclick="location.reload()">&#8635; Reload Game</button></div>
<div id="glb-loading-overlay">LOADING ASSETS <span id="glb-load-count">0/0</span><div class="glb-bar"><div class="glb-fill" id="glb-load-fill"></div></div></div>

<!-- Screen transition fade overlay`,
'Fix 5: HTML for webgl-lost + glb-loading overlays'
);

// ── Fix 6: Radar asteroid dots ──
safeReplace(
`  hudCtx.globalAlpha = 1;
  hudCtx.font = '9px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.fillText('RADAR', mapCx-15, mapCy+mapR+12);`,
`  // Asteroid dots (yellow)
  c.asteroids.forEach(a => {
    if (!a || !a.position) return;
    const dx = a.position.x - ship.position.x;
    const dz = a.position.z - ship.position.z;
    const mapScale = mapR / (SPAWN_RADIUS + 200);
    const mx = mapCx + dx * mapScale;
    const my = mapCy + dz * mapScale;
    if (Math.abs(mx-mapCx) < mapR && Math.abs(my-mapCy) < mapR) {
      hudCtx.fillStyle = '#ffcc44';
      hudCtx.globalAlpha = 0.5;
      hudCtx.beginPath(); hudCtx.arc(mx, my, 1.5, 0, Math.PI*2); hudCtx.fill();
    }
  });
  hudCtx.globalAlpha = 1;
  hudCtx.font = '9px "Segoe UI"'; hudCtx.fillStyle = '#445566'; hudCtx.fillText('RADAR', mapCx-15, mapCy+mapR+12);`,
'Fix 6: Radar asteroid dots'
);

// ── Fix 7: Action bar tooltips ──
safeReplace(
`  <button class="action-btn" id="act-mine" data-action="mine"><span class="act-icon">&#9874;</span><span class="act-label">Mine</span><span class="act-key">M</span></button>
  <button class="action-btn" id="act-chat" data-action="chat"><span class="act-icon">&#9733;</span><span class="act-label">AI Chat</span><span class="act-key">T</span></button>
  <button class="action-btn" id="act-skins" data-action="skins"><span class="act-icon">&#9998;</span><span class="act-label">Skins</span><span class="act-key">K</span></button>
  <button class="action-btn" id="act-gate" data-action="gate"><span class="act-icon">&#10026;</span><span class="act-label">Gate</span><span class="act-key">G</span></button>
  <button class="action-btn" id="act-collect" data-action="collect"><span class="act-icon">&#10024;</span><span class="act-label">Collect</span><span class="act-key">C</span></button>
  <button class="action-btn" id="act-reload" data-action="reload"><span class="act-icon">&#8635;</span><span class="act-label">Reload</span><span class="act-key">R</span></button>
  <button class="action-btn" id="act-warp" data-action="warp"><span class="act-icon">&#9889;</span><span class="act-label">Warp</span><span class="act-key">F</span></button>
  <button class="action-btn" id="act-dock" data-action="dock"><span class="act-icon">&#9875;</span><span class="act-label">Dock</span><span class="act-key">B</span></button>`,
`  <button class="action-btn" id="act-mine" data-action="mine" title="Mine nearby asteroids for resources (M)"><span class="act-icon">&#9874;</span><span class="act-label">Mine</span><span class="act-key">M</span></button>
  <button class="action-btn" id="act-chat" data-action="chat" title="Open EDEN AI chatbot — ask questions, get advice (T)"><span class="act-icon">&#9733;</span><span class="act-label">AI Chat</span><span class="act-key">T</span></button>
  <button class="action-btn" id="act-skins" data-action="skins" title="Customize your ship skin (K)"><span class="act-icon">&#9998;</span><span class="act-label">Skins</span><span class="act-key">K</span></button>
  <button class="action-btn" id="act-gate" data-action="gate" title="Enter nearby stargate to alternate universe (G)"><span class="act-icon">&#10026;</span><span class="act-label">Gate</span><span class="act-key">G</span></button>
  <button class="action-btn" id="act-collect" data-action="collect" title="Collect ancient artifacts in alt universe (C)"><span class="act-icon">&#10024;</span><span class="act-label">Collect</span><span class="act-key">C</span></button>
  <button class="action-btn" id="act-reload" data-action="reload" title="Reload railgun ammo — 1.5s reload time (R)"><span class="act-icon">&#8635;</span><span class="act-label">Reload</span><span class="act-key">R</span></button>
  <button class="action-btn" id="act-warp" data-action="warp" title="Open star map — warp to another system (F)"><span class="act-icon">&#9889;</span><span class="act-label">Warp</span><span class="act-key">F</span></button>
  <button class="action-btn" id="act-dock" data-action="dock" title="Dock at station — trade, upgrade, repair (B)"><span class="act-icon">&#9875;</span><span class="act-label">Dock</span><span class="act-key">B</span></button>`,
'Fix 7: Action bar tooltips'
);

// ── Fix 8: Settings — BGM volume slider (HTML) ──
safeReplace(
`    <div style="margin-bottom:20px;">
      <label style="font-size:0.85rem;color:var(--muted);display:block;margin-bottom:6px;">Mouse Sensitivity</label>
      <input type="range" id="setting-sens" min="1" max="10" value="5" style="width:100%;accent-color:var(--green);">
      <span id="setting-sens-val" style="color:var(--green);font-size:0.8rem;">5</span>
    </div>`,
`    <div style="margin-bottom:20px;">
      <label style="font-size:0.85rem;color:var(--muted);display:block;margin-bottom:6px;">BGM Volume</label>
      <input type="range" id="vol-bgm" min="0" max="100" value="60" style="width:100%;accent-color:var(--magenta,#cc44aa);">
      <span id="vol-bgm-val" style="color:var(--magenta,#cc44aa);font-size:0.8rem;">60%</span>
    </div>
    <div style="margin-bottom:20px;">
      <label style="font-size:0.85rem;color:var(--muted);display:block;margin-bottom:6px;">Mouse Sensitivity</label>
      <input type="range" id="setting-sens" min="1" max="10" value="5" style="width:100%;accent-color:var(--green);">
      <span id="setting-sens-val" style="color:var(--green);font-size:0.8rem;">5</span>
    </div>`,
'Fix 8: Settings BGM volume slider HTML'
);

// ── Fix 9: Settings — Keybinds reference section (HTML) ──
safeReplace(
`  </div>
  <div class="btn-row"><button class="btn" id="btn-settings-back">&larr; Back</button></div>
</div>

<!-- ════════════════════════════════════════════ -->
<!--  REBIRTH SCREEN                              -->
<!-- ════════════════════════════════════════════ -->
<div class="screen" id="screen-rebirth">`,
`    <div style="margin-top:20px;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">
      <h3 style="font-size:0.85rem;color:var(--gold);letter-spacing:0.15em;margin-bottom:10px;">KEYBINDS</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:0.75rem;color:var(--muted);">
        <span><span style="color:var(--blue);">WASD</span> Fly/Strafe</span>
        <span><span style="color:var(--blue);">Mouse</span> Aim</span>
        <span><span style="color:var(--blue);">Click</span> Fire</span>
        <span><span style="color:var(--blue);">Shift</span> Boost</span>
        <span><span style="color:var(--blue);">Space</span> Up</span>
        <span><span style="color:var(--blue);">Ctrl</span> Down</span>
        <span><span style="color:var(--blue);">R</span> Reload</span>
        <span><span style="color:var(--blue);">Q</span> Swap weapon</span>
        <span><span style="color:var(--blue);">M</span> Mine</span>
        <span><span style="color:var(--blue);">T</span> AI Chat</span>
        <span><span style="color:var(--blue);">K</span> Skins</span>
        <span><span style="color:var(--blue);">G</span> Stargate</span>
        <span><span style="color:var(--blue);">F</span> Star map</span>
        <span><span style="color:var(--blue);">B</span> Dock</span>
        <span><span style="color:var(--blue);">P</span> Autopilot</span>
        <span><span style="color:var(--blue);">L</span> Labels</span>
        <span><span style="color:var(--blue);">H</span> Controls help</span>
        <span><span style="color:var(--blue);">ESC</span> Exit gunner</span>
      </div>
    </div>
  </div>
  <div class="btn-row"><button class="btn" id="btn-settings-back">&larr; Back</button></div>
</div>

<!-- ════════════════════════════════════════════ -->
<!--  REBIRTH SCREEN                              -->
<!-- ════════════════════════════════════════════ -->
<div class="screen" id="screen-rebirth">`,
'Fix 9: Settings keybinds reference section'
);

// ── Fix 10: bgmVol in state defaults ──
safeReplace(
`    sfxVol: 0.8,
    sensitivity: 5,`,
`    sfxVol: 0.8,
    bgmVol: 0.6,
    sensitivity: 5,`,
'Fix 10: bgmVol in state defaults'
);

// ── Fix 11: Settings init — BGM volume binding ──
safeReplace(
`  volS.oninput = () => { state.settings.sfxVol = volS.value / 100; document.getElementById('vol-sfx-val').textContent = volS.value + '%'; };
  sens.oninput = () => { state.settings.sensitivity = parseInt(sens.value); document.getElementById('setting-sens-val').textContent = sens.value; };`,
`  volS.oninput = () => { state.settings.sfxVol = volS.value / 100; document.getElementById('vol-sfx-val').textContent = volS.value + '%'; };
  const volB = document.getElementById('vol-bgm');
  if (volB) {
    volB.value = (state.settings.bgmVol || 0.6) * 100;
    document.getElementById('vol-bgm-val').textContent = Math.round((state.settings.bgmVol || 0.6) * 100) + '%';
    volB.oninput = () => { state.settings.bgmVol = volB.value / 100; document.getElementById('vol-bgm-val').textContent = volB.value + '%'; if (AudioSFX.bgm) AudioSFX.bgm.masterGain.gain.value = 0.04 * state.settings.bgmVol; };
  }
  sens.oninput = () => { state.settings.sensitivity = parseInt(sens.value); document.getElementById('setting-sens-val').textContent = sens.value; };`,
'Fix 11: Settings BGM volume binding'
);

// ── Fix 12: BGM startBGM uses bgmVol instead of masterVol ──
safeReplace(
`    masterGain.gain.value = 0.04 * state.settings.masterVol;
    masterGain.connect(ctx.destination);
    // Deep bass drone`,
`    masterGain.gain.value = 0.04 * (state.settings.bgmVol != null ? state.settings.bgmVol : state.settings.masterVol);
    masterGain.connect(ctx.destination);
    // Deep bass drone`,
'Fix 12: BGM uses bgmVol setting'
);

// ── Fix 13: GLB loading progress tracking ──
safeReplace(
`  preloadEnemyModel();
  loadRailgunTurretGLB();
  loadCockpitGLB();
  loadDashboardGun();
  spawnShipLibrary();
  replaceShipWithGLB();`,
`  // GLB loading with progress tracking
  const _glbTasks = ['enemy','railgun_turret','cockpit','dashboard_gun','ship_library','player_ship'];
  let _glbDone = 0;
  const _glbOverlay = document.getElementById('glb-loading-overlay');
  const _glbCount = document.getElementById('glb-load-count');
  const _glbFill = document.getElementById('glb-load-fill');
  if (_glbOverlay) { _glbOverlay.classList.add('active'); if (_glbCount) _glbCount.textContent = '0/' + _glbTasks.length; }
  const _glbTick = () => { _glbDone++; if (_glbCount) _glbCount.textContent = _glbDone + '/' + _glbTasks.length; if (_glbFill) _glbFill.style.width = Math.round(_glbDone/_glbTasks.length*100) + '%'; if (_glbDone >= _glbTasks.length && _glbOverlay) setTimeout(() => _glbOverlay.classList.remove('active'), 800); };
  preloadEnemyModel().then(_glbTick).catch(_glbTick);
  loadRailgunTurretGLB().then(_glbTick).catch(_glbTick);
  loadCockpitGLB().then(_glbTick).catch(_glbTick);
  loadDashboardGun().then(_glbTick).catch(_glbTick);
  spawnShipLibrary().then(_glbTick).catch(_glbTick);
  replaceShipWithGLB().then(_glbTick).catch(_glbTick);`,
'Fix 13: GLB loading progress overlay'
);

// ── Fix 14: Mobile boost button ──
safeReplace(
`<div id="mobile-controls">
  <div id="touch-move-zone"><div id="touch-stick"></div></div>
  <div id="touch-fire">FIRE</div>
  <div id="touch-reload">R</div>
</div>`,
`<div id="mobile-controls">
  <div id="touch-move-zone"><div id="touch-stick"></div></div>
  <div id="touch-fire">FIRE</div>
  <div id="touch-reload">R</div>
  <div id="touch-boost" style="position:absolute;right:20px;bottom:140px;width:50px;height:50px;background:rgba(212,168,86,0.2);border:1px solid rgba(212,168,86,0.5);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gold,#d4a856);font-size:0.65rem;font-weight:700;letter-spacing:0.05em;user-select:none;-webkit-user-select:none;touch-action:none;">BOOST</div>
</div>`,
'Fix 14: Mobile boost button'
);

// ── Fix 15: Controls overlay — add H hint + more keybinds ──
safeReplace(
`    <div class="ctrl-item"><span class="ctrl-key">M</span><span class="ctrl-desc">Mine asteroid</span></div>
    <p class="controls-dismiss">Click anywhere or press any key to dismiss</p>`,
`    <div class="ctrl-item"><span class="ctrl-key">M</span><span class="ctrl-desc">Mine asteroid</span></div>
    <div class="ctrl-item"><span class="ctrl-key">B</span><span class="ctrl-desc">Dock at station</span></div>
    <div class="ctrl-item"><span class="ctrl-key">F</span><span class="ctrl-desc">Star map / Warp</span></div>
    <div class="ctrl-item"><span class="ctrl-key">P</span><span class="ctrl-desc">Autopilot</span></div>
    <div class="ctrl-item"><span class="ctrl-key">G</span><span class="ctrl-desc">Enter stargate</span></div>
    <div class="ctrl-item"><span class="ctrl-key">H</span><span class="ctrl-desc">Show this help</span></div>
    <p class="controls-dismiss">Click anywhere or press any key to dismiss &bull; Press H anytime</p>`,
'Fix 15: Controls overlay more keybinds + H hint'
);

// ── Write + report ──
fs.writeFileSync(filePath, src, 'utf8');
const open = (src.match(/\{/g)||[]).length;
const close = (src.match(/\}/g)||[]).length;
const openP = (src.match(/\(/g)||[]).length;
const closeP = (src.match(/\)/g)||[]).length;
const openB = (src.match(/\[/g)||[]).length;
const closeB = (src.match(/\]/g)||[]).length;
console.log(`\n=== AUDIT 18 PATCH REPORT ===`);
console.log(`Applied: ${applied}/${applied+skipped}, Skipped: ${skipped}`);
console.log(`Balance — {}: ${open}/${close} (): ${openP}/${closeP} []: ${openB}/${closeB}`);
console.log(`File: ${fs.statSync(filePath).size} bytes`);
