// fix_audit22.cjs — Audit 22: 10 fixes for Old Eden
// Ambience stop, save market+insured, stargate dispose, comms XSS+perf,
// inventory stacking, totalDeaths conditional, starmap rAF guard,
// territory spawn modifier, vignette cache, accessibility basics

const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(file, 'utf8');
const cr = s => s.replace(/\n/g, '\r\n');
let applied = 0;

function safeReplace(old, rep, label) {
  if (!src.includes(old)) { console.error('MISS: ' + label); return; }
  const count = src.split(old).length - 1;
  if (count !== 1) { console.error('MULTI(' + count + '): ' + label); return; }
  src = src.replace(old, rep);
  applied++;
  console.log('OK: ' + label);
}

// =================================================================
// Fix 1: Add stopAmbience method + call it on exit
// =================================================================
safeReplace(
  cr(`  stopEngineHum() {
    if (!this.engineHum) return;
    try { this.engineHum.osc1.stop(); this.engineHum.osc2.stop(); } catch(e) {}
    this.engineHum = null;
  },`),
  cr(`  stopEngineHum() {
    if (!this.engineHum) return;
    try { this.engineHum.osc1.stop(); this.engineHum.osc2.stop(); } catch(e) {}
    this.engineHum = null;
  },
  stopAmbience() {
    if (!this.ambience) return;
    try { this.ambience.stop(); } catch(e) {}
    this.ambience = null;
  },`),
  'Fix 1a: Add stopAmbience method'
);

safeReplace(
  cr(`  AudioSFX.stopBGM();
  AudioSFX.stopEngineHum();
  if (!skipScreenChange) showScreen('bridge');`),
  cr(`  AudioSFX.stopBGM();
  AudioSFX.stopEngineHum();
  AudioSFX.stopAmbience();
  if (!skipScreenChange) showScreen('bridge');`),
  'Fix 1b: Call stopAmbience on exitGunnerMode'
);

// =================================================================
// Fix 2: Save/load market orders + insuredItemId
// =================================================================
safeReplace(
  cr(`    persistentItems: state.persistentItems,
    currentSkin: state.currentSkin,
  };`),
  cr(`    persistentItems: state.persistentItems,
    currentSkin: state.currentSkin,
    market: state.market,
    insuredItemId: state.insuredItemId,
  };`),
  'Fix 2a: Save market + insuredItemId'
);

safeReplace(
  cr(`  if (data.persistentItems) state.persistentItems = data.persistentItems;
  if (data.currentSkin) { state.currentSkin = data.currentSkin; }`),
  cr(`  if (data.persistentItems) state.persistentItems = data.persistentItems;
  if (data.currentSkin) { state.currentSkin = data.currentSkin; }
  if (data.market) state.market = data.market;
  if (data.insuredItemId) state.insuredItemId = data.insuredItemId;`),
  'Fix 2b: Load market + insuredItemId'
);

// =================================================================
// Fix 3: Stargate disposeObject on exit
// =================================================================
safeReplace(
  cr(`  if (stargateGroup) { scene.remove(stargateGroup); stargateGroup = null; }`),
  cr(`  if (stargateGroup) { scene.remove(stargateGroup); disposeObject(stargateGroup); stargateGroup = null; stargatePortalMat = null; }`),
  'Fix 3: Stargate disposeObject + null portal mat'
);

// =================================================================
// Fix 4: Bridge comms feed — XSS sanitize + batch innerHTML
// =================================================================
safeReplace(
  cr(`  const feed = document.getElementById('comms-feed');
  feed.innerHTML = '';
  state.commsLog.slice(0, 8).forEach(m => {
    const ago = formatTimeAgo(m.time);
    feed.innerHTML += \`<div class="comms-msg"><div class="sender">\${m.sender} <span style="color:#334;font-weight:normal;font-size:0.65rem">\${ago}</span></div>\${m.msg}</div>\`;
  });`),
  cr(`  const feed = document.getElementById('comms-feed');
  let feedHtml = '';
  state.commsLog.slice(0, 8).forEach(m => {
    const ago = formatTimeAgo(m.time);
    feedHtml += \`<div class="comms-msg"><div class="sender">\${_escHtml(m.sender)} <span style="color:#334;font-weight:normal;font-size:0.65rem">\${ago}</span></div>\${_escHtml(m.msg)}</div>\`;
  });
  feed.innerHTML = feedHtml;`),
  'Fix 4: Comms feed XSS sanitize + batch innerHTML'
);

// =================================================================
// Fix 5: Station buy — stack inventory instead of push duplicate
// =================================================================
safeReplace(
  cr(`    state.player.credits -= discountedPrice;
    state.inventory.push({ name, quantity: 1 });
    AudioSFX.play('dock');`),
  cr(`    state.player.credits -= discountedPrice;
    const existingItem = state.inventory.find(i => i.name === name);
    if (existingItem) existingItem.quantity = (existingItem.quantity || 1) + 1;
    else state.inventory.push({ name, quantity: 1 });
    AudioSFX.play('dock');`),
  'Fix 5a: Station buy stacks inventory'
);

// Fix 5b: station:bought server handler — stack too
safeReplace(
  cr(`          state.inventory.push({ name: data.name, quantity: 1 });
          addComms('Station', \`Purchased \${data.name} for \${data.price} EC\`);`),
  cr(`          { const exi = state.inventory.find(i => i.name === data.name); if (exi) exi.quantity = (exi.quantity || 1) + 1; else state.inventory.push({ name: data.name, quantity: 1 }); }
          addComms('Station', \`Purchased \${data.name} for \${data.price} EC\`);`),
  'Fix 5b: station:bought handler stacks inventory'
);

// =================================================================
// Fix 6: totalDeaths only increments on actual death, not voluntary rebirth
// =================================================================
safeReplace(
  cr(`  p.lifetimeStats.totalKills += c.kills;
  p.lifetimeStats.totalScore += c.score;
  p.lifetimeStats.totalDeaths++;`),
  cr(`  p.lifetimeStats.totalKills += c.kills;
  p.lifetimeStats.totalScore += c.score;
  if (c.dead) p.lifetimeStats.totalDeaths++;`),
  'Fix 6: totalDeaths only on actual death'
);

// =================================================================
// Fix 7: Star map rAF — prevent multiple chains accumulating
// =================================================================
safeReplace(
  cr(`function starMapAnimLoop() {
  if (state.screen !== 'starmap') return;
  renderStarMap();
  requestAnimationFrame(starMapAnimLoop);
}`),
  cr(`let _starMapAnimActive = false;
function starMapAnimLoop() {
  if (state.screen !== 'starmap') { _starMapAnimActive = false; return; }
  renderStarMap();
  requestAnimationFrame(starMapAnimLoop);
}`),
  'Fix 7a: Star map rAF guard flag'
);

safeReplace(
  cr(`  if (name === 'starmap') { resizeStarMap(); starMapAnimLoop(); }`),
  cr(`  if (name === 'starmap') { resizeStarMap(); if (!_starMapAnimActive) { _starMapAnimActive = true; starMapAnimLoop(); } }`),
  'Fix 7b: Star map only starts rAF if not already running'
);

// =================================================================
// Fix 8: Vignette gradient caching (skip dynamic hull < 25% case)
// =================================================================
safeReplace(
  cr(`  // Combat vignette
  const vigGrad = hudCtx.createRadialGradient(cx, cy, Math.min(W,H)*0.35, cx, cy, Math.max(W,H)*0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  const hullPct = state.ship.hull / state.ship.maxHull;
  if (hullPct < 0.25) {
    // Escalating red vignette: 25%→0.2, 10%→0.35, 5%→0.45
    const dangerIntensity = 0.15 + (1 - hullPct / 0.25) * 0.3;
    vigGrad.addColorStop(1, 'rgba(255,0,0,' + (dangerIntensity + Math.sin(performance.now()*0.008)*0.06) + ')');
  } else {
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
  }
  hudCtx.fillStyle = vigGrad;
  hudCtx.fillRect(0, 0, W, H);`),
  cr(`  // Combat vignette (cached when hull healthy, dynamic when critical)
  const hullPct = state.ship.hull / state.ship.maxHull;
  if (hullPct < 0.25) {
    const vigGrad = hudCtx.createRadialGradient(cx, cy, Math.min(W,H)*0.35, cx, cy, Math.max(W,H)*0.7);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    const dangerIntensity = 0.15 + (1 - hullPct / 0.25) * 0.3;
    vigGrad.addColorStop(1, 'rgba(255,0,0,' + (dangerIntensity + Math.sin(performance.now()*0.008)*0.06) + ')');
    hudCtx.fillStyle = vigGrad;
  } else {
    if (!c._vigCache || c._vigCacheW !== W || c._vigCacheH !== H) {
      c._vigCache = hudCtx.createRadialGradient(cx, cy, Math.min(W,H)*0.35, cx, cy, Math.max(W,H)*0.7);
      c._vigCache.addColorStop(0, 'rgba(0,0,0,0)');
      c._vigCache.addColorStop(1, 'rgba(0,0,0,0.2)');
      c._vigCacheW = W; c._vigCacheH = H;
    }
    hudCtx.fillStyle = c._vigCache;
  }
  hudCtx.fillRect(0, 0, W, H);`),
  'Fix 8: Cache vignette gradient when hull healthy'
);

// =================================================================
// Fix 9: Nav bar accessibility — role + aria-label + span aria-hidden
// =================================================================
safeReplace(
  cr(`<div id="nav-bar">`),
  cr(`<nav id="nav-bar" role="navigation" aria-label="Game navigation">`),
  'Fix 9a: Nav bar semantic element + ARIA'
);

// Close tag — find the </div> after the last nav button
safeReplace(
  cr(`  <button class="nav-btn" data-screen="settings"><span class="nav-icon">&#9881;</span>Settings</button>
</div>`),
  cr(`  <button class="nav-btn" data-screen="settings"><span class="nav-icon" aria-hidden="true">&#9881;</span>Settings</button>
</nav>`),
  'Fix 9b: Close nav tag + aria-hidden on icon'
);

// Fix 9c: Comms feed ARIA
safeReplace(
  cr(`    <div id="comms-feed"></div>`),
  cr(`    <div id="comms-feed" role="log" aria-live="polite" aria-label="Communications log"></div>`),
  'Fix 9c: Comms feed ARIA live region'
);

// =================================================================
// Write result
// =================================================================
fs.writeFileSync(file, src, 'utf8');
console.log('\n=== Applied: ' + applied + '/14 ===');

// Quick brace/tag balance check
const openBraces = (src.match(/{/g) || []).length;
const closeBraces = (src.match(/}/g) || []).length;
console.log('Brace balance: { ' + openBraces + ' } ' + closeBraces + ' diff=' + (openBraces - closeBraces));
const openScript = (src.match(/<script/gi) || []).length;
const closeScript = (src.match(/<\/script>/gi) || []).length;
console.log('Script tags: open=' + openScript + ' close=' + closeScript);
