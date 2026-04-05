/**
 * Audit 52 — Crash Prevention Fixes (CRLF-safe)
 *
 * F1: Game loop has no try/catch — single error cascades at 60fps
 * F2: window.onerror creates unlimited error divs — DOM flood crash
 * F3: exhaustParticles not cleaned in exitGunnerMode — GPU memory leak
 * F4: playerDeathSequence doesn't guard createSoulFragment — stuck immortal
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
let applied = 0;

function cr(s) { return s.replace(/\n/g, '\r\n'); }

function safeReplace(oldStr, newStr, label) {
  const old = cr(oldStr);
  const nw = cr(newStr);
  if (!html.includes(old)) {
    console.error('MISS:', label);
    const first30 = old.slice(0, 60).replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    console.error('  Looking for:', first30);
    return false;
  }
  const count = html.split(old).length - 1;
  if (count > 1) {
    console.error('AMBIGUOUS:', label, `(${count} matches)`);
    return false;
  }
  html = html.replace(old, nw);
  applied++;
  console.log('OK:', label);
  return true;
}

// ── F1a: Wrap game loop body in try ──
safeReplace(
  `function gameLoop() {
  requestAnimationFrame(gameLoop);
  if (!scene || !camera || !ship || !turretMount || !composer) return;
  if (!state._frameCount) state._frameCount = 0;
  state._frameCount++;`,
  `function gameLoop() {
  requestAnimationFrame(gameLoop);
  if (!scene || !camera || !ship || !turretMount || !composer) return;
  try {
  if (!state._frameCount) state._frameCount = 0;
  state._frameCount++;`,
  'F1a: Open try block at top of game loop'
);

// ── F1b: Close try/catch at end of game loop ──
safeReplace(
  `  if (composer) composer.render(); else if (renderer) renderer.render(scene, camera);
}

// ================================================================
//  INITIALIZATION`,
  `  if (composer) composer.render(); else if (renderer) renderer.render(scene, camera);
  } catch (_loopErr) {
    if (!gameLoop._errCount) gameLoop._errCount = 0;
    gameLoop._errCount++;
    if (gameLoop._errCount <= 3) console.error('[GameLoop] Frame error:', _loopErr);
  }
}

// ================================================================
//  INITIALIZATION`,
  'F1b: Close try/catch at bottom of game loop'
);

// ── F2a: Rate-limit window.onerror ──
safeReplace(
  `window.onerror = function(msg, src, line, col, err) {
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:12px;background:red;color:white;font-size:14px;z-index:99999;font-family:monospace;white-space:pre-wrap;';
  d.textContent = 'JS ERROR: ' + msg + '\\nSource: ' + src + ':' + line + ':' + col;
  document.body.appendChild(d);
};`,
  `window._oeErrCount = 0;
window.onerror = function(msg, src, line, col, err) {
  window._oeErrCount++;
  if (window._oeErrCount > 3) return;
  var existing = document.getElementById('oe-error-banner');
  if (existing) existing.remove();
  var d = document.createElement('div');
  d.id = 'oe-error-banner';
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:12px;background:red;color:white;font-size:14px;z-index:99999;font-family:monospace;white-space:pre-wrap;';
  d.textContent = 'JS ERROR: ' + msg + '\\nSource: ' + src + ':' + line + ':' + col + (window._oeErrCount > 1 ? '\\n(' + window._oeErrCount + ' errors total)' : '');
  document.body.appendChild(d);
};`,
  'F2a: Rate-limit window.onerror to prevent DOM flood'
);

// ── F2b: Rate-limit unhandledrejection ──
safeReplace(
  `window.addEventListener('unhandledrejection', function(e) {
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:40px;left:0;right:0;padding:12px;background:darkred;color:white;font-size:14px;z-index:99999;font-family:monospace;white-space:pre-wrap;';
  d.textContent = 'UNHANDLED PROMISE: ' + (e.reason && e.reason.message || e.reason || 'unknown');
  document.body.appendChild(d);
});`,
  `window.addEventListener('unhandledrejection', function(e) {
  window._oeErrCount = (window._oeErrCount || 0) + 1;
  if (window._oeErrCount > 5) return;
  var existing = document.getElementById('oe-promise-banner');
  if (existing) existing.remove();
  var d = document.createElement('div');
  d.id = 'oe-promise-banner';
  d.style.cssText = 'position:fixed;top:40px;left:0;right:0;padding:12px;background:darkred;color:white;font-size:14px;z-index:99999;font-family:monospace;white-space:pre-wrap;';
  d.textContent = 'UNHANDLED PROMISE: ' + (e.reason && e.reason.message || e.reason || 'unknown');
  document.body.appendChild(d);
});`,
  'F2b: Rate-limit unhandledrejection banner'
);

// ── F3: Clean exhaustParticles in exitGunnerMode ──
safeReplace(
  `  c.dmgNumbers = [];
  // Clean up police patrols`,
  `  c.dmgNumbers = [];
  // Clean up exhaust particles (prevent GPU leak across death/rebirth cycles)
  exhaustParticles.forEach(ep => { if (ep && ep.mesh) { scene.remove(ep.mesh); ep.mesh.geometry?.dispose(); ep.mesh.material?.dispose(); } });
  exhaustParticles.length = 0;
  // Clean up police patrols`,
  'F3: Clean exhaustParticles in exitGunnerMode'
);

// ── F4: Guard createSoulFragment in playerDeathSequence ──
safeReplace(
  `  c.deathStats = { kills: c.kills, score: c.score, streak: c.bestStreak, credits: state.player.credits };
  const frag = createSoulFragment();`,
  `  c.deathStats = { kills: c.kills, score: c.score, streak: c.bestStreak, credits: state.player.credits };
  let frag;
  try { frag = createSoulFragment(); } catch (_e) { frag = { id: 'ERR', powerLevel: 0 }; console.error('[Death] Fragment creation failed:', _e); }`,
  'F4: Guard createSoulFragment to prevent _deathSequenceActive stuck'
);

// ── Summary ──
console.log(`\n=== Audit 52: ${applied}/6 fixes applied ===`);
if (applied === 6) {
  fs.writeFileSync(FILE, html, 'utf8');
  console.log('File saved.');
} else {
  console.error('Not all patches applied — file NOT saved.');
  process.exit(1);
}
