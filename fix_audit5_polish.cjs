/**
 * Audit 5 — 10 polish improvements (visual + audio)
 * Line-based editing for CRLF-safe operation
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let lines = fs.readFileSync(FILE, 'utf8').split('\n');
let fixes = 0;
let lineShift = 0; // cumulative line shift tracker

function cr(s) { return s.endsWith('\r') ? s : s + '\r'; }

// Find exact line index (0-based) containing a string, searching near expected position
function findLine(str, nearLine, range = 50) {
  const start = Math.max(0, nearLine - range);
  const end = Math.min(lines.length, nearLine + range);
  for (let i = start; i < end; i++) {
    if (lines[i].includes(str)) return i;
  }
  // Fallback: search entire file
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(str)) return i;
  }
  return -1;
}

// Insert lines after a 0-based index
function insertAfter(name, idx, newContent) {
  const newLines = newContent.split('\n').map(cr);
  lines.splice(idx + 1, 0, ...newLines);
  lineShift += newLines.length;
  fixes++;
  console.log(`[OK] ${name} (+${newLines.length} lines after ${idx + 1})`);
}

// Replace content on a single line
function replaceInLine(name, idx, oldStr, newStr) {
  if (!lines[idx].includes(oldStr)) {
    console.error(`[FAIL] ${name} — '${oldStr.substring(0, 40)}' not found at line ${idx + 1}`);
    console.error(`  Got: ${lines[idx].trimEnd().substring(0, 100)}`);
    process.exit(1);
  }
  lines[idx] = lines[idx].replace(oldStr, newStr);
  fixes++;
  console.log(`[OK] ${name} (line ${idx + 1})`);
}

// Replace a range of lines
function replaceRange(name, startIdx, endIdx, newContent) {
  const newLines = newContent.split('\n').map(cr);
  const removed = endIdx - startIdx + 1;
  lines.splice(startIdx, removed, ...newLines);
  const delta = newLines.length - removed;
  lineShift += delta;
  fixes++;
  console.log(`[OK] ${name} (replaced ${removed} lines with ${newLines.length}, shift: ${delta > 0 ? '+' : ''}${delta})`);
}

console.log(`Starting with ${lines.length} lines\n`);

// ============================================================
// 1. AUDIO: Add hull_hit, loot_credits, loot_ammo, loot_health, loot_fuel,
//    dock, warp_arrive sounds to AudioSFX.play switch block.
//    Insert before the closing `}` of the switch (after player_death case).
// ============================================================
{
  const idx = findLine("case 'player_death':", 0);
  if (idx === -1) { console.error('[FAIL] player_death case not found'); process.exit(1); }
  // Find the next line with just `}` that closes the switch
  let switchEnd = -1;
  for (let i = idx + 1; i < idx + 10; i++) {
    if (lines[i].trimEnd().replace('\r','') === '    }') { switchEnd = i; break; }
  }
  if (switchEnd === -1) { console.error('[FAIL] switch closing brace not found after player_death'); process.exit(1); }
  
  insertAfter('Audio: 7 new SFX types', switchEnd - 1, 
`      case 'hull_hit': { osc.disconnect(); const dur=0.12; const buf=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length)*0.8; const src=ctx.createBufferSource(); src.buffer=buf; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600; src.connect(lp); lp.connect(gain); gain.gain.setValueAtTime(0.18*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur); src.start(now); return; }
      case 'loot_credits': osc.type='sine'; osc.frequency.setValueAtTime(880,now); osc.frequency.setValueAtTime(1100,now+0.06); osc.frequency.setValueAtTime(1320,now+0.12); gain.gain.setValueAtTime(0.08*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.2); osc.start(now); osc.stop(now+0.2); break;
      case 'loot_ammo': osc.type='square'; osc.frequency.setValueAtTime(300,now); osc.frequency.setValueAtTime(450,now+0.05); gain.gain.setValueAtTime(0.06*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.1); osc.start(now); osc.stop(now+0.1); break;
      case 'loot_health': osc.type='sine'; osc.frequency.setValueAtTime(440,now); osc.frequency.linearRampToValueAtTime(880,now+0.2); gain.gain.setValueAtTime(0.07*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.25); osc.start(now); osc.stop(now+0.25); break;
      case 'loot_fuel': { osc.disconnect(); const dur2=0.15; const buf2=ctx.createBuffer(1,ctx.sampleRate*dur2,ctx.sampleRate); const d2=buf2.getChannelData(0); for(let i=0;i<d2.length;i++) d2[i]=(Math.random()*2-1)*(1-i/d2.length)*0.3; const src2=ctx.createBufferSource(); src2.buffer=buf2; const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2000; src2.connect(hp); hp.connect(gain); gain.gain.setValueAtTime(0.06*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+dur2); src2.start(now); return; }
      case 'dock': osc.type='sine'; osc.frequency.setValueAtTime(300,now); osc.frequency.setValueAtTime(400,now+0.1); osc.frequency.setValueAtTime(500,now+0.2); gain.gain.setValueAtTime(0.08*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.4); osc.start(now); osc.stop(now+0.4); break;
      case 'warp_arrive': osc.type='sine'; osc.frequency.setValueAtTime(2000,now); osc.frequency.exponentialRampToValueAtTime(200,now+0.6); gain.gain.setValueAtTime(0.1*vol,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.8); osc.start(now); osc.stop(now+0.8); break;`
  );
}

// ============================================================
// 2. AUDIO: Add fuelWarningBeep, uiClick, uiHover methods to AudioSFX object
//    Insert after stopEngineHum method
// ============================================================
{
  const idx = findLine('stopEngineHum()', 0);
  if (idx === -1) { console.error('[FAIL] stopEngineHum not found'); process.exit(1); }
  // Find closing brace+comma of stopEngineHum
  let closeIdx = -1;
  for (let i = idx; i < idx + 15; i++) {
    if (lines[i].trimEnd().replace('\r','').endsWith('},')) { closeIdx = i; break; }
  }
  if (closeIdx === -1) { console.error('[FAIL] stopEngineHum closing not found'); process.exit(1); }
  
  insertAfter('Audio: fuelWarningBeep + uiClick + uiHover methods', closeIdx,
`  _fuelWarnLast: 0,
  fuelWarningBeep() {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this._fuelWarnLast < 2000) return;
    this._fuelWarnLast = now;
    this.ensure();
    const ctx = this.ctx;
    const vol = state.settings.masterVol * state.settings.sfxVol;
    if (vol <= 0) return;
    const t = ctx.currentTime;
    const g = ctx.createGain(); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.06*vol, t);
    g.gain.setValueAtTime(0.06*vol, t+0.08);
    g.gain.setValueAtTime(0.001, t+0.1);
    g.gain.setValueAtTime(0.06*vol, t+0.15);
    g.gain.setValueAtTime(0.001, t+0.25);
    const o = ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(1200, t);
    o.connect(g); o.start(t); o.stop(t+0.25);
  },
  uiClick() {
    if (!this.ctx) return; this.ensure();
    const ctx = this.ctx; const t = ctx.currentTime;
    const vol = state.settings.masterVol * state.settings.sfxVol * 0.5;
    const g = ctx.createGain(); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.04*vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.05);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1000;
    o.connect(g); o.start(t); o.stop(t+0.05);
  },
  uiHover() {
    if (!this.ctx) return; this.ensure();
    const ctx = this.ctx; const t = ctx.currentTime;
    const vol = state.settings.masterVol * state.settings.sfxVol * 0.3;
    const g = ctx.createGain(); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.015*vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.03);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1400;
    o.connect(g); o.start(t); o.stop(t+0.03);
  },`
  );
}

// ============================================================
// 3. VISUAL: Multi-layer parallax starfield — replace single starfield
// ============================================================
{
  const idx = findLine('// ── Starfield ────', 0);
  if (idx === -1) { console.error('[FAIL] starfield marker not found'); process.exit(1); }
  // Find end of current starfield (the line with scene.add(new THREE.Points(starGeo...))
  let endIdx = findLine('scene.add(new THREE.Points(starGeo', idx);
  if (endIdx === -1) { console.error('[FAIL] starfield scene.add not found'); process.exit(1); }
  
  replaceRange('Visual: Multi-layer parallax starfield', idx, endIdx,
`// ── Multi-layer Parallax Starfield ────
const starLayers = [];
const STAR_LAYER_CFG = [
  { count: 1500, minR: 400, maxR: 2000, size: 3.5, opacity: 0.95, parallax: 0.04, color: 0xffeedd },
  { count: 3000, minR: 2000, maxR: 6000, size: 2.0, opacity: 0.7, parallax: 0.015, color: 0xccbbaa },
  { count: 4000, minR: 6000, maxR: 12000, size: 1.2, opacity: 0.45, parallax: 0.004, color: 0x9999aa },
];
STAR_LAYER_CFG.forEach(cfg => {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(cfg.count * 3);
  for (let i = 0; i < cfg.count; i++) {
    const r = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i*3+2] = r * Math.cos(phi);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: cfg.color, size: cfg.size, sizeAttenuation: true,
    transparent: true, opacity: cfg.opacity, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.userData.parallax = cfg.parallax;
  scene.add(points);
  starLayers.push(points);
});`
  );
}

// ============================================================
// 4. VISUAL: Shield shimmer mesh — insert after scene is fully set up
//    We'll add it near the camera/ship setup
// ============================================================
{
  const idx = findLine('// Nebulae', 0);
  if (idx === -1) { console.error('[FAIL] Nebulae marker not found'); process.exit(1); }
  
  insertAfter('Visual: Shield shimmer mesh', idx - 1,
`
// ── Shield shimmer (additive flash on shield hit) ────
const shieldShimmerMat = new THREE.MeshBasicMaterial({
  color: 0x44aaff, transparent: true, opacity: 0, 
  side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending,
});
const shieldShimmerGeo = new THREE.IcosahedronGeometry(4.5, 1);
const shieldShimmer = new THREE.Mesh(shieldShimmerGeo, shieldShimmerMat);
shieldShimmer.name = 'shield-shimmer';
camera.add(shieldShimmer);
let shieldShimmerTimer = 0;

function triggerShieldShimmer() {
  shieldShimmerTimer = 300;
  shieldShimmerMat.opacity = 0.35;
  shieldShimmerMat.color.setHex(0x44aaff);
}`
  );
}

// ============================================================
// 5. VISUAL: Impact sparks function — insert near spawnExplosion
// ============================================================
{
  const idx = findLine('const BOSS_MODELS =', 0);
  if (idx === -1) { console.error('[FAIL] BOSS_MODELS not found'); process.exit(1); }
  
  insertAfter('Visual: spawnImpactSparks function', idx - 2,
`
function spawnImpactSparks(position, color) {
  color = color || 0xffaa44;
  const sparkCount = 8 + Math.floor(Math.random() * 5);
  const g = new THREE.Group();
  for (let i = 0; i < sparkCount; i++) {
    const sz = 0.04 + Math.random() * 0.06;
    const mat = new THREE.MeshBasicMaterial({
      color: i < 3 ? 0xffffff : color, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const spark = new THREE.Mesh(new THREE.SphereGeometry(sz, 4, 4), mat);
    spark.userData = {
      dir: new THREE.Vector3(
        (Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2
      ).normalize(),
      speed: 15 + Math.random() * 25,
    };
    g.add(spark);
  }
  const fl = new THREE.PointLight(color, 3, 12);
  g.add(fl);
  g.position.copy(position);
  scene.add(g);
  c.explosions.push({ group: g, age: 0, maxAge: 250 });
}`
  );
}

// ============================================================
// 6. CSS: Screen transition overlay
// ============================================================
{
  const idx = findLine('@keyframes fadeIn', 0);
  if (idx === -1) { console.error('[FAIL] fadeIn keyframe not found'); process.exit(1); }
  
  insertAfter('CSS: screen-transition-overlay', idx,
`#screen-transition-overlay{position:fixed;inset:0;background:#0a0a0f;z-index:9990;pointer-events:none;opacity:0;transition:opacity 0.25s ease;}
#screen-transition-overlay.active{opacity:1;}`
  );
}

// ============================================================
// 7. HTML: Add screen-transition-overlay div — insert after QA banner
// ============================================================
{
  const idx = findLine('qa-unverified-banner', 0);
  if (idx === -1) { console.error('[FAIL] qa-unverified-banner not found'); process.exit(1); }
  
  insertAfter('HTML: transition overlay div', idx,
`<div id="screen-transition-overlay"></div>`
  );
}

// ============================================================
// 8. JS: Modify showScreen to add fade transitions
// ============================================================
{
  const idx = findLine('function showScreen(name) {', 0);
  if (idx === -1) { console.error('[FAIL] showScreen not found'); process.exit(1); }
  // Find the line after the gunner guard: "document.querySelectorAll('.screen')..."
  let bodyStart = -1;
  for (let i = idx + 1; i < idx + 10; i++) {
    if (lines[i].includes("document.querySelectorAll('.screen')")) { bodyStart = i; break; }
  }
  if (bodyStart === -1) { console.error('[FAIL] showScreen body not found'); process.exit(1); }
  
  // Insert transition wrapper before the querySelectorAll line
  const oldLine = lines[bodyStart];
  // We need to replace from bodyStart through the end of showScreen with a version that uses transitions
  // Instead, let's just add a quick fade wrapper at the top
  // Find the end of the guard block
  let guardEnd = -1;
  for (let i = idx; i < idx + 10; i++) {
    if (lines[i].includes('return;') && lines[i].includes('3D engine')) { guardEnd = i; break; }
  }
  if (guardEnd === -1) guardEnd = idx + 4;
  // Find the closing `}` + `return;` line of the guard
  for (let i = guardEnd; i < guardEnd + 3; i++) {
    if (lines[i].trimEnd().replace('\r','') === '  }') { guardEnd = i; break; }
  }
  
  // Insert transition logic after the guard block
  insertAfter('JS: showScreen fade transitions', guardEnd,
`  // Fade transition for non-gunner screens
  if (name !== 'gunner' && state.screen !== 'gunner' && name !== state.screen) {
    const _overlay = document.getElementById('screen-transition-overlay');
    if (_overlay) {
      _overlay.classList.add('active');
      setTimeout(() => { _showScreenInner(name); _overlay.classList.remove('active'); }, 250);
      return;
    }
  }
  _showScreenInner(name);
}
function _showScreenInner(name) {`
  );
}

// ============================================================
// 9. Game loop additions: parallax starfield + shield shimmer decay + fuel warning
// ============================================================
{
  // Find the fuel consumption section in game loop
  const idx = findLine('// Engine exhaust', 0, 200);
  if (idx === -1) { console.error('[FAIL] Engine exhaust marker not found in game loop'); process.exit(1); }
  
  insertAfter('Game loop: parallax + shield shimmer + fuel warning', idx - 1,
`
    // Parallax starfield
    if (typeof starLayers !== 'undefined') {
      starLayers.forEach(layer => {
        layer.position.x = -ship.position.x * layer.userData.parallax;
        layer.position.y = -ship.position.y * layer.userData.parallax;
        layer.position.z = -ship.position.z * layer.userData.parallax;
      });
    }

    // Shield shimmer decay
    if (shieldShimmerTimer > 0) {
      shieldShimmerTimer -= dtMs;
      shieldShimmerMat.opacity = Math.max(0, (shieldShimmerTimer / 300) * 0.35);
      shieldShimmer.rotation.y += dt * 3;
      shieldShimmer.rotation.x += dt * 1.5;
      if (shieldShimmerTimer <= 100) shieldShimmerMat.color.setHex(0x2266cc);
    }

    // Low fuel warning beep
    if (state.ship.fuel > 0 && state.ship.fuel <= 15) {
      AudioSFX.fuelWarningBeep();
    }`
  );
}

// ============================================================
// 10. Hook shield_hit calls to also trigger shimmer + hull_hit sound
// ============================================================
{
  // Ram damage — "shield > 0) { ...shield_hit..." followed by "else state.ship.hull..."
  // Find all 3 shield_hit + hull damage pairs
  const patterns = [
    { shieldStr: "AudioSFX.play('shield_hit');", hullStr: "else state.ship.hull = Math.max(0, state.ship.hull -" },
  ];
  
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("AudioSFX.play('shield_hit')")) {
      // Add triggerShieldShimmer after shield_hit
      lines[i] = lines[i].replace("AudioSFX.play('shield_hit');", "AudioSFX.play('shield_hit'); triggerShieldShimmer();");
      count++;
      // Check next line for hull damage path
      if (i + 1 < lines.length && lines[i+1].includes('else state.ship.hull')) {
        // Add hull_hit sound
        if (!lines[i+1].includes('hull_hit')) {
          lines[i+1] = lines[i+1].replace(
            /else state\.ship\.hull = Math\.max\(0, state\.ship\.hull - ([^)]+)\);/,
            "else { state.ship.hull = Math.max(0, state.ship.hull - $1); AudioSFX.play('hull_hit'); }"
          );
        }
      }
    }
  }
  if (count > 0) { fixes++; console.log(`[OK] Shield shimmer + hull_hit hooks (${count} locations)`); }
  else { console.error('[WARN] No shield_hit calls found to hook'); }
}

// ============================================================
// 11. Hook impact sparks on projectile-enemy hit
// ============================================================
{
  const idx = findLine("AudioSFX.play('hit_marker')", 0);
  if (idx !== -1) {
    insertAfter('Visual: impact sparks on enemy hit', idx,
`          spawnImpactSparks(p.group.position.clone(), p.isLaser ? 0x44ffaa : 0xffaa44);`
    );
  } else {
    console.log('[WARN] hit_marker not found — skipping impact sparks hook');
  }
}

// ============================================================
// 12. Per-type loot pickup sounds (replace single quest_complete)
// ============================================================
{
  // Find the loot pickup section
  const idx = findLine("AudioSFX.play('quest_complete')", 0, 200);
  if (idx === -1) {
    // Search in loot drops area
    const altIdx = findLine("AudioSFX.play('quest_complete')", 5800);
    if (altIdx !== -1) {
      // Replace the single quest_complete with nothing — we'll add per-type sounds inline
      lines[altIdx] = lines[altIdx].replace("AudioSFX.play('quest_complete');", '');
      // Now add per-type sounds to each loot line above
      for (let i = altIdx - 10; i < altIdx; i++) {
        if (lines[i].includes("l.type === 'credits'") && !lines[i].includes('loot_credits')) {
          lines[i] = lines[i].replace("c.dmgNumbers.push({ text: '+25 EC'", "AudioSFX.play('loot_credits'); c.dmgNumbers.push({ text: '+25 EC'");
        }
        if (lines[i].includes("l.type === 'ammo'") && !lines[i].includes('loot_ammo')) {
          lines[i] = lines[i].replace("c.dmgNumbers.push({ text: '+6 AMMO'", "AudioSFX.play('loot_ammo'); c.dmgNumbers.push({ text: '+6 AMMO'");
        }
        if (lines[i].includes("l.type === 'health'") && !lines[i].includes('loot_health')) {
          lines[i] = lines[i].replace("c.dmgNumbers.push({ text: '+15 HULL'", "AudioSFX.play('loot_health'); c.dmgNumbers.push({ text: '+15 HULL'");
        }
        if (lines[i].includes("l.type === 'fuel'") && !lines[i].includes('loot_fuel')) {
          lines[i] = lines[i].replace("c.dmgNumbers.push({ text: '+20 FUEL'", "AudioSFX.play('loot_fuel'); c.dmgNumbers.push({ text: '+20 FUEL'");
        }
      }
      fixes++;
      console.log('[OK] Per-type loot pickup sounds');
    } else {
      console.log('[WARN] quest_complete in loot section not found');
    }
  } else {
    // Found it — same logic
    lines[idx] = lines[idx].replace("AudioSFX.play('quest_complete');", '');
    for (let i = idx - 10; i < idx; i++) {
      if (lines[i].includes("l.type === 'credits'") && !lines[i].includes('loot_credits')) {
        lines[i] = lines[i].replace("c.dmgNumbers.push({ text: '+25 EC'", "AudioSFX.play('loot_credits'); c.dmgNumbers.push({ text: '+25 EC'");
      }
      if (lines[i].includes("l.type === 'ammo'") && !lines[i].includes('loot_ammo')) {
        lines[i] = lines[i].replace("c.dmgNumbers.push({ text: '+6 AMMO'", "AudioSFX.play('loot_ammo'); c.dmgNumbers.push({ text: '+6 AMMO'");
      }
      if (lines[i].includes("l.type === 'health'") && !lines[i].includes('loot_health')) {
        lines[i] = lines[i].replace("c.dmgNumbers.push({ text: '+15 HULL'", "AudioSFX.play('loot_health'); c.dmgNumbers.push({ text: '+15 HULL'");
      }
      if (lines[i].includes("l.type === 'fuel'") && !lines[i].includes('loot_fuel')) {
        lines[i] = lines[i].replace("c.dmgNumbers.push({ text: '+20 FUEL'", "AudioSFX.play('loot_fuel'); c.dmgNumbers.push({ text: '+20 FUEL'");
      }
    }
    fixes++;
    console.log('[OK] Per-type loot pickup sounds');
  }
}

// ============================================================
// 13. Dock sound — add to all 3 docking locations
// ============================================================
{
  let dockCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("state.location.docked = true") && !lines[i].includes("AudioSFX.play('dock')")) {
      lines[i] = lines[i].replace("state.location.docked = true;", "state.location.docked = true; AudioSFX.play('dock');");
      dockCount++;
    }
  }
  if (dockCount > 0) { fixes++; console.log(`[OK] Dock sound (${dockCount} locations)`); }
}

// ============================================================
// 14. Warp arrival sound — add setTimeout in jumpToSystem
// ============================================================
{
  const idx = findLine("addComms('Navigation', `Jumped to", 0);
  if (idx !== -1) {
    insertAfter('Audio: warp_arrive sound', idx,
`  setTimeout(() => AudioSFX.play('warp_arrive'), 1200);`
    );
  }
}

// ============================================================
// 15. UI click/hover sounds — event delegation in init area
// ============================================================
{
  const idx = findLine('function init()', 0);
  if (idx === -1) { console.error('[FAIL] init() not found'); process.exit(1); }
  // Find the line right after init() opening brace
  insertAfter('Audio: UI click/hover delegation', idx + 1,
`  // UI sounds — delegated
  document.addEventListener('click', (e) => {
    if (e.target.closest('.menu-btn,.btn,.nav-btn,.action-btn,.trade-buy,.trade-sell,.sf-tab,.chat-toggle')) {
      AudioSFX.uiClick();
    }
  });
  document.addEventListener('mouseenter', (e) => {
    if (e.target.matches('.menu-btn,.btn,.nav-btn,.action-btn')) {
      AudioSFX.uiHover();
    }
  }, true);`
  );
}

// ============================================================
// 16. VISUAL: Enhanced muzzle flash on railgun fire
// ============================================================
{
  const idx = findLine('muzzleMat.opacity = 1;', 0);
  if (idx !== -1) {
    insertAfter('Visual: enhanced muzzle flash', idx,
`    // Screen-space muzzle flash overlay
    const _mfDiv = document.createElement('div');
    _mfDiv.style.cssText = 'position:fixed;inset:0;z-index:14;pointer-events:none;background:radial-gradient(circle at 50% 55%,rgba(68,170,255,0.12) 0%,transparent 40%);';
    document.body.appendChild(_mfDiv);
    setTimeout(() => _mfDiv.remove(), 60);
    // Muzzle point light burst
    const _mfLight = new THREE.PointLight(0x88ccff, 8, 20);
    _mfLight.position.copy(camera.position).add(new THREE.Vector3(0, -0.3, -4).applyQuaternion(camera.quaternion));
    scene.add(_mfLight);
    setTimeout(() => scene.remove(_mfLight), 60);`
    );
  } else {
    console.log('[WARN] muzzleMat.opacity not found — skipping muzzle flash');
  }
}

// ============================================================
// WRITE
// ============================================================
const output = lines.join('\n');
fs.writeFileSync(FILE, output, 'utf8');
console.log(`\n=== ${fixes} improvements applied ===`);

// Balance check
let braces = 0, parens = 0;
for (const ch of output) {
  if (ch === '{') braces++;
  else if (ch === '}') braces--;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
}
console.log(`Brace balance: ${braces}`);
console.log(`Paren balance: ${parens}`);
console.log(`Total lines: ${lines.length}`);
if (braces !== 0 || parens !== 0) {
  console.error('!!! BALANCE ERROR — DO NOT COMMIT !!!');
  process.exit(1);
}
console.log('Balance OK');
