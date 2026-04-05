// Audit 17 — Performance + Station Polish + HUD Improvements
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
const origLen = src.length;
const cr = s => s.replace(/\n/g, '\r\n');
let applied = 0, skipped = 0;

function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr), n = cr(newStr);
  const idx = src.indexOf(o);
  if (idx === -1) { console.log('  SKIP: ' + label + ' (not found)'); skipped++; return; }
  const idx2 = src.indexOf(o, idx + 1);
  if (idx2 !== -1) { console.log('  SKIP: ' + label + ' (ambiguous)'); skipped++; return; }
  src = src.slice(0, idx) + n + src.slice(idx + o.length);
  console.log('  OK: ' + label);
  applied++;
}

// ========================================================
// Fix 1 — Add CSS: save indicator, boss warning overlay,
// muzzle flash overlay, reduced-motion
// Insert before </style>
// ========================================================
safeReplace(
`#qa-unverified-banner.qa-passed{background:#00aa44;}
</style>`,
`#qa-unverified-banner.qa-passed{background:#00aa44;}

/* ── Save Indicator ──────────────────────── */
#save-indicator{position:fixed;top:10px;right:10px;color:rgba(0,255,136,0.7);font-size:0.72rem;z-index:200;pointer-events:none;opacity:0;transition:opacity 0.3s ease;letter-spacing:0.08em;}
#save-indicator.show{opacity:1;}

/* ── Boss Warning Overlay ────────────────── */
#boss-warning-overlay{position:fixed;inset:0;z-index:16;pointer-events:none;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(255,0,0,0.08);}
#boss-warning-overlay.active{display:flex;}
#boss-warning-overlay .bw-title{font-size:clamp(2rem,5vw,4rem);color:#ff2200;font-weight:900;letter-spacing:0.3em;text-shadow:0 0 40px rgba(255,34,0,0.8),0 0 80px rgba(255,34,0,0.4);animation:bossWarnPulse 0.3s ease 3;}
#boss-warning-overlay .bw-sub{font-size:1.2rem;color:#ff8844;letter-spacing:0.2em;margin-top:0.5rem;}
@keyframes bossWarnPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.7;transform:scale(1.05);}}

/* ── Muzzle Flash Overlay ────────────────── */
#muzzle-flash-overlay{position:fixed;inset:0;z-index:14;pointer-events:none;background:radial-gradient(circle at 50% 55%,rgba(68,170,255,0.12) 0%,transparent 40%);opacity:0;transition:opacity 0.04s ease;}

/* ── Reduced Motion ──────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  .title-star { animation: none; opacity: 0.5; }
  .karma-spin-particle { animation: none; }
}
</style>`,
'Fix 1: CSS for save-indicator, boss-warning, muzzle-flash, reduced-motion');

// ========================================================
// Fix 2 — Add HTML elements after QA banner
// ========================================================
safeReplace(
`<div id="qa-unverified-banner">⚠ UNVERIFIED BUILD — run: node qa_proxy_live.cjs ⚠</div>

<!-- Screen transition fade overlay (moved from broken <style> location) -->`,
`<div id="qa-unverified-banner">⚠ UNVERIFIED BUILD — run: node qa_proxy_live.cjs ⚠</div>
<div id="save-indicator">&#10003; SAVED</div>
<div id="boss-warning-overlay"><div class="bw-title">&#9888; WARNING &#9888;</div><div class="bw-sub">MASSIVE HOSTILE SIGNATURE</div></div>
<div id="muzzle-flash-overlay"></div>

<!-- Screen transition fade overlay (moved from broken <style> location) -->`,
'Fix 2: HTML for save-indicator, boss-warning, muzzle-flash');

// ========================================================
// Fix 3 — Boss warning: replace createElement with persistent overlay
// ========================================================
safeReplace(
`        AudioSFX.play('boss_warn');
        addComms('AI Director', '⚠ BOSS DETECTED — massive hostile signature!');
        // Boss warning full-screen overlay
        const bossWarn = document.createElement('div');
        bossWarn.style.cssText = 'position:fixed;inset:0;z-index:16;pointer-events:none;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(255,0,0,0.08);';
        bossWarn.innerHTML = '<div style="font-size:clamp(2rem,5vw,4rem);color:#ff2200;font-weight:900;letter-spacing:0.3em;text-shadow:0 0 40px rgba(255,34,0,0.8),0 0 80px rgba(255,34,0,0.4);animation:bossWarnPulse 0.3s ease 3">\\u26a0 WARNING \\u26a0</div><div style="font-size:1.2rem;color:#ff8844;letter-spacing:0.2em;margin-top:0.5rem;">MASSIVE HOSTILE SIGNATURE</div>';
        if (!document.getElementById('boss-warn-style')) {
          const st = document.createElement('style'); st.id = 'boss-warn-style';
          st.textContent = '@keyframes bossWarnPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.05)}}';
          document.head.appendChild(st);
        }
        document.body.appendChild(bossWarn);
        c.damageFlash = 400;
        setTimeout(() => bossWarn.remove(), 2500);`,
`        AudioSFX.play('boss_warn');
        addComms('AI Director', '⚠ BOSS DETECTED — massive hostile signature!');
        // Boss warning — reuse persistent overlay element
        const _bwEl = document.getElementById('boss-warning-overlay');
        if (_bwEl) { _bwEl.classList.add('active'); setTimeout(() => _bwEl.classList.remove('active'), 2500); }
        c.damageFlash = 400;`,
'Fix 3: Boss warning uses persistent overlay');

// ========================================================
// Fix 4 — Muzzle flash: replace per-shot DOM + PointLight
// ========================================================
safeReplace(
`  muzzleMat.opacity = 1;
    // Screen-space muzzle flash overlay
    const _mfDiv = document.createElement('div');
    _mfDiv.style.cssText = 'position:fixed;inset:0;z-index:14;pointer-events:none;background:radial-gradient(circle at 50% 55%,rgba(68,170,255,0.12) 0%,transparent 40%);';
    document.body.appendChild(_mfDiv);
    setTimeout(() => _mfDiv.remove(), 60);
    // Muzzle point light burst
    const _mfLight = new THREE.PointLight(0x88ccff, 8, 20);
    _mfLight.position.copy(camera.position).add(new THREE.Vector3(0, -0.3, -4).applyQuaternion(camera.quaternion));
    scene.add(_mfLight);
    setTimeout(() => scene.remove(_mfLight), 60);`,
`  muzzleMat.opacity = 1;
    // Screen-space muzzle flash overlay — reuse persistent element
    const _mfEl = document.getElementById('muzzle-flash-overlay');
    if (_mfEl) { _mfEl.style.opacity = '1'; clearTimeout(_mfEl._hideTimer); _mfEl._hideTimer = setTimeout(() => { _mfEl.style.opacity = '0'; }, 60); }
    // Muzzle point light burst — reuse persistent light
    if (window._mfLight) { window._mfLight.intensity = 8; window._mfLight.position.copy(camera.position).addScaledVector(_tmpV3a.set(0, -0.3, -4).applyQuaternion(camera.quaternion), 1); clearTimeout(window._mfLightTimer); window._mfLightTimer = setTimeout(() => { if (window._mfLight) window._mfLight.intensity = 0; }, 60); }`,
'Fix 4: Persistent muzzle flash overlay + PointLight');

// ========================================================
// Fix 5 — Init persistent muzzle PointLight in scene
// ========================================================
safeReplace(
`scene.add(new THREE.AmbientLight(0x667799, 2.0));`,
`scene.add(new THREE.AmbientLight(0x667799, 2.0));

// Persistent muzzle flash point light (reused per shot)
window._mfLight = new THREE.PointLight(0x88ccff, 0, 20);
scene.add(window._mfLight);`,
'Fix 5: Persistent muzzle PointLight in scene');

// ========================================================
// Fix 6 — Pre-allocate death pullback vector
// ========================================================
safeReplace(
`const _tmpV3d = new THREE.Vector3();`,
`const _tmpV3d = new THREE.Vector3();
const _deathPullDir = new THREE.Vector3();`,
'Fix 6: Pre-allocate death pullback vector');

safeReplace(
`    const backDir = new THREE.Vector3(0, 0.3, 1).applyQuaternion(camera.quaternion).normalize();
    camera.position.addScaledVector(backDir, pb);`,
`    _deathPullDir.set(0, 0.3, 1).applyQuaternion(camera.quaternion).normalize();
    camera.position.addScaledVector(_deathPullDir, pb);`,
'Fix 7: Use pre-allocated death pullback vector');

// ========================================================
// Fix 8 — Save indicator (visual "SAVED" notification on auto-save)
// ========================================================
safeReplace(
`    // Auto-save every 60s
    if (state.gameTime - c.lastAutoSave > 60000) {
      c.lastAutoSave = state.gameTime;
      saveGame();
    }`,
`    // Auto-save every 60s
    if (state.gameTime - c.lastAutoSave > 60000) {
      c.lastAutoSave = state.gameTime;
      saveGame();
      const _si = document.getElementById('save-indicator');
      if (_si) { _si.classList.add('show'); setTimeout(() => _si.classList.remove('show'), 1500); }
    }`,
'Fix 8: Save indicator on auto-save');

// ========================================================
// Fix 9 — Faction territory HUD indicator + Stargate proximity
// Insert after alt-universe HUD block
// ========================================================
safeReplace(
`  // Alt universe status
  if (state.inAltUniverse) {
    hudCtx.font = 'bold 12px "Segoe UI"'; hudCtx.fillStyle = '#cc44ff'; hudCtx.globalAlpha = 0.7 + 0.3 * Math.sin(state.gameTime * 0.003);
    hudCtx.fillText('\\u2726 ALT UNIVERSE — Artifacts: ' + (state.altUniverse ? state.altUniverse.artifactsCollected : 0), cx - 100, 22);
    hudCtx.globalAlpha = 1;
  }

  // Keybind hints (bottom-right, above weapon)`,
`  // Alt universe status
  if (state.inAltUniverse) {
    hudCtx.font = 'bold 12px "Segoe UI"'; hudCtx.fillStyle = '#cc44ff'; hudCtx.globalAlpha = 0.7 + 0.3 * Math.sin(state.gameTime * 0.003);
    hudCtx.fillText('\\u2726 ALT UNIVERSE — Artifacts: ' + (state.altUniverse ? state.altUniverse.artifactsCollected : 0), cx - 100, 22);
    hudCtx.globalAlpha = 1;
  }

  // Faction territory indicator (bottom-left)
  {
    const sys = state.starSystems[state.location.systemIndex];
    if (sys && sys.controllingFaction) {
      const fInfo = typeof FACTIONS !== 'undefined' && FACTIONS.find(f => f.id === sys.controllingFaction || f.name === sys.controllingFaction);
      const fColor = sys.factionColor || (fInfo ? fInfo.color : '#556677');
      const fName = fInfo ? fInfo.name : sys.controllingFaction;
      hudCtx.font = '10px "Segoe UI"'; hudCtx.fillStyle = fColor; hudCtx.globalAlpha = 0.7;
      hudCtx.fillText('\\u2691 ' + fName + ' territory', 24, H - 36);
      hudCtx.globalAlpha = 1;
    }
  }

  // Stargate proximity indicator
  if (stargateGroup) {
    const sgDist = ship.position.distanceTo(stargateGroup.position);
    if (sgDist < 120) {
      const sgAlpha = Math.max(0.4, 1 - sgDist / 120);
      hudCtx.font = 'bold 11px "Segoe UI"'; hudCtx.fillStyle = '#cc44ff'; hudCtx.globalAlpha = sgAlpha;
      hudCtx.fillText('\\u2726 STARGATE: ' + Math.floor(sgDist) + 'm' + (sgDist < 40 ? ' \\u2014 [G] to enter' : ''), cx - 80, H - 50);
      hudCtx.globalAlpha = 1;
    }
  }

  // Keybind hints (bottom-right, above weapon)`,
'Fix 9: Faction territory HUD + Stargate proximity');

// ========================================================
// Fix 10 — Buy commodity SFX
// ========================================================
safeReplace(
`    state.player.credits -= discountedPrice;
    state.inventory.push({ name, quantity: 1 });
    addComms('Station', \`Purchased \${name} for \${discountedPrice} EC\${discountedPrice < price ? ' (trade discount!)' : ''}.\`);`,
`    state.player.credits -= discountedPrice;
    state.inventory.push({ name, quantity: 1 });
    AudioSFX.play('dock');
    addComms('Station', \`Purchased \${name} for \${discountedPrice} EC\${discountedPrice < price ? ' (trade discount!)' : ''}.\`);`,
'Fix 10: Buy commodity SFX');

// ========================================================
// Fix 11 — Sell commodity SFX + better no-inventory feedback
// ========================================================
safeReplace(
`  if (idx < 0) return;
  if (state.socket) {`,
`  if (idx < 0) { addComms('Station', 'You don\\'t have that item.'); return; }
  if (state.socket) {`,
'Fix 11: Sell — better no-inventory feedback');

safeReplace(
`    state.player.credits += boostedPrice;
    addComms('Station', \`Sold \${name} for \${boostedPrice} EC\${boostedPrice > price ? ' (trade bonus!)' : ''}.\`);`,
`    state.player.credits += boostedPrice;
    AudioSFX.play('loot_credits');
    addComms('Station', \`Sold \${name} for \${boostedPrice} EC\${boostedPrice > price ? ' (trade bonus!)' : ''}.\`);`,
'Fix 12: Sell commodity SFX');

// ========================================================
// Fix 13 — Quest accept SFX
// ========================================================
safeReplace(
`    if (q) { q.active = true; addComms('Mission Board', \`Accepted: \${q.title || q.name}\`); renderStation(); }`,
`    if (q) { q.active = true; AudioSFX.play('quest_complete'); addComms('Mission Board', \`Accepted: \${q.title || q.name}\`); renderStation(); }`,
'Fix 13: Quest accept SFX');

// ========================================================
// Fix 14-16 — Station services SFX
// ========================================================
safeReplace(
`  state.ship.hull = state.ship.maxHull;
  addComms('Station', \`Hull fully repaired. (-\${cost} EC)\`);`,
`  state.ship.hull = state.ship.maxHull;
  AudioSFX.play('charge');
  addComms('Station', \`Hull fully repaired. (-\${cost} EC)\`);`,
'Fix 14: Repair hull SFX');

safeReplace(
`  state.combat.ammo = state.combat.maxAmmo;
  addComms('Station', \`Ammo restocked. (-\${cost} EC)\`);`,
`  state.combat.ammo = state.combat.maxAmmo;
  AudioSFX.play('reload');
  addComms('Station', \`Ammo restocked. (-\${cost} EC)\`);`,
'Fix 15: Ammo restock SFX');

safeReplace(
`  state.ship.fuel = 100;
  addComms('Station', \`Ship refueled. (-\${cost} EC)\`);`,
`  state.ship.fuel = 100;
  AudioSFX.play('dock');
  addComms('Station', \`Ship refueled. (-\${cost} EC)\`);`,
'Fix 16: Refuel SFX');

// ========================================================
// REPORT
// ========================================================
const bracesBefore = (src.match(/\{/g)||[]).length;
const closeBraces = (src.match(/\}/g)||[]).length;
const parensBefore = (src.match(/\(/g)||[]).length;
const closeParens = (src.match(/\)/g)||[]).length;
const bracketsBefore = (src.match(/\[/g)||[]).length;
const closeBrackets = (src.match(/\]/g)||[]).length;
console.log('\n=== AUDIT 17 PATCH REPORT ===');
console.log('Applied: ' + applied + '/' + (applied + skipped) + ', Skipped: ' + skipped);
console.log('Balance — {}: ' + bracesBefore + '/' + closeBraces + ' (): ' + parensBefore + '/' + closeParens + ' []: ' + bracketsBefore + '/' + closeBrackets);
if (bracesBefore !== closeBraces) console.log('  !! BRACE IMBALANCE !!');
if (parensBefore !== closeParens) console.log('  !! PAREN IMBALANCE !!');
if (bracketsBefore !== closeBrackets) console.log('  !! BRACKET IMBALANCE !!');
console.log('File: ' + origLen + ' -> ' + src.length + ' (' + (src.length > origLen ? '+' : '') + (src.length - origLen) + ' bytes)');
fs.writeFileSync(file, src);
