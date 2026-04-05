/**
 * Audit 8 — First-Time Player UX Fixes
 * 
 * Fix 1: Move misplaced <div id="screen-transition-overlay"> out of <style> into <body>
 * Fix 2: Add #controls-overlay HTML (flight keybindings overlay)
 * Fix 3: Add CSS for controls overlay + launch button
 * Fix 4: Add "ENTER SPACE" launch button on Bridge screen
 * Fix 5: JS — Show controls overlay on first gunner entry, auto-dismiss
 * Fix 6: JS — Launch button click handler
 * Fix 7: First-visit bridge comms hint after character creation
 */
const fs = require('fs');
const PATH = 'public/index.html';

let src = fs.readFileSync(PATH, 'utf8');
let lines = src.split('\n');
function cr(s) { return s.endsWith('\r') ? s : s + '\r'; }
function findLine(content, startFrom = 0) {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(content)) return i;
  }
  return -1;
}

let applied = 0;

// ═══════════════════════════════════════════════
// FIX 1: Remove misplaced <div> from inside <style>
// The screen-transition-overlay div was accidentally placed inside the <style> block,
// which means it's treated as CSS text and never rendered in the DOM.
// ═══════════════════════════════════════════════
const misplacedDiv = findLine('<div id="screen-transition-overlay"></div>');
const styleClose = findLine('</style>');
if (misplacedDiv >= 0 && styleClose >= 0 && misplacedDiv < styleClose) {
  lines.splice(misplacedDiv, 1);
  applied++;
  console.log(`[FIX 1] Removed misplaced <div> from inside <style> at line ${misplacedDiv + 1}`);
} else {
  console.warn('[FIX 1] SKIP — screen-transition-overlay not inside <style> (may be fine)');
}

// ═══════════════════════════════════════════════
// FIX 2: Insert transition overlay + controls overlay HTML after QA banner
// ═══════════════════════════════════════════════
const qaBanner = findLine('id="qa-unverified-banner"', findLine('<body>'));
if (qaBanner >= 0) {
  const htmlInsert = [
    '',
    '<!-- Screen transition fade overlay (moved from broken <style> location) -->',
    '<div id="screen-transition-overlay"></div>',
    '',
    '<!-- Controls overlay — shown on first gunner entry -->',
    '<div id="controls-overlay">',
    '  <div class="controls-grid">',
    '    <h3>FLIGHT CONTROLS</h3>',
    '    <div class="ctrl-item"><span class="ctrl-key">W A S D</span><span class="ctrl-desc">Fly / Strafe</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">MOUSE</span><span class="ctrl-desc">Aim</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">CLICK</span><span class="ctrl-desc">Fire weapon</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">SHIFT</span><span class="ctrl-desc">Afterburner boost</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">SPACE</span><span class="ctrl-desc">Fly up</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">CTRL</span><span class="ctrl-desc">Fly down</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">R</span><span class="ctrl-desc">Reload ammo</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">Q</span><span class="ctrl-desc">Switch weapon</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">ESC</span><span class="ctrl-desc">Exit to bridge</span></div>',
    '    <div class="ctrl-item"><span class="ctrl-key">M</span><span class="ctrl-desc">Mine asteroid</span></div>',
    '    <p class="controls-dismiss">Click anywhere or press any key to dismiss</p>',
    '  </div>',
    '</div>',
  ];
  lines.splice(qaBanner + 1, 0, ...htmlInsert.map(cr));
  applied++;
  console.log(`[FIX 2] Transition overlay + controls overlay HTML inserted after QA banner`);
} else {
  console.error('[FIX 2] FAILED — could not find qa-unverified-banner');
}

// ═══════════════════════════════════════════════
// FIX 3: Add CSS for controls overlay + launch button
// Insert after #screen-transition-overlay.active{opacity:1;}
// ═══════════════════════════════════════════════
const transitionCss = findLine('#screen-transition-overlay.active{opacity:1;}');
if (transitionCss >= 0) {
  const cssInsert = [
    '#controls-overlay{position:fixed;inset:0;z-index:9980;background:rgba(0,0,0,0.6);display:none;justify-content:center;align-items:center;pointer-events:none;transition:opacity 1.5s ease;}',
    '#controls-overlay.active{display:flex;pointer-events:auto;}',
    '#controls-overlay.fading{opacity:0;}',
    '.controls-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 36px;max-width:540px;padding:24px 32px;background:rgba(13,17,23,0.92);border:1px solid rgba(68,170,255,0.2);border-radius:12px;backdrop-filter:blur(10px);}',
    '.controls-grid h3{grid-column:1/3;text-align:center;color:var(--gold);font-size:1.1rem;font-weight:300;letter-spacing:0.15em;margin-bottom:4px;}',
    '.ctrl-item{display:flex;align-items:center;gap:10px;}',
    '.ctrl-key{background:rgba(68,170,255,0.1);border:1px solid rgba(68,170,255,0.25);border-radius:4px;padding:3px 10px;color:var(--blue);font-family:"Consolas",monospace;font-size:0.82rem;min-width:62px;text-align:center;white-space:nowrap;}',
    '.ctrl-desc{color:var(--text);font-size:0.78rem;}',
    '.controls-dismiss{grid-column:1/3;text-align:center;color:var(--muted);font-size:0.72rem;margin-top:6px;animation:pulse 2s infinite;}',
    '#bridge-launch{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:5;pointer-events:auto;}',
    '#btn-launch{font-size:1.15rem;padding:18px 52px;border-color:var(--gold);color:var(--gold);background:rgba(212,168,86,0.06);letter-spacing:0.12em;animation:pulse 2.5s infinite;cursor:pointer;font-family:inherit;border-radius:6px;border-width:1px;border-style:solid;transition:all 0.3s;}',
    '#btn-launch:hover{background:rgba(212,168,86,0.15);box-shadow:0 0 40px rgba(212,168,86,0.2);transform:scale(1.05);}',
    '.launch-hint{color:var(--muted);font-size:0.72rem;margin-top:8px;letter-spacing:0.05em;}',
    '.launch-hint span{color:var(--blue);}',
  ];
  lines.splice(transitionCss + 1, 0, ...cssInsert.map(cr));
  applied++;
  console.log(`[FIX 3] Controls overlay + launch button CSS inserted`);
} else {
  console.error('[FIX 3] FAILED — could not find #screen-transition-overlay.active');
}

// ═══════════════════════════════════════════════
// FIX 4: Add "ENTER SPACE" launch button inside Bridge screen
// Insert after bridge-right closing div, before screen-bridge closing div
// ═══════════════════════════════════════════════
const questTracker = findLine('id="quest-tracker"');
if (questTracker >= 0) {
  // Next </div> after quest-tracker closes bridge-right
  const bridgeRightClose = findLine('</div>', questTracker + 1);
  if (bridgeRightClose >= 0) {
    const launchHtml = [
      '  <div id="bridge-launch">',
      '    <button id="btn-launch">&#9876; ENTER SPACE</button>',
      '    <div class="launch-hint">or click <span>Gunner</span> in nav bar</div>',
      '  </div>',
    ];
    lines.splice(bridgeRightClose + 1, 0, ...launchHtml.map(cr));
    applied++;
    console.log(`[FIX 4] Launch button HTML inserted in bridge screen`);
  } else {
    console.error('[FIX 4] FAILED — could not find bridge-right closing div');
  }
} else {
  console.error('[FIX 4] FAILED — could not find quest-tracker');
}

// ═══════════════════════════════════════════════
// FIX 5: JS — Show controls overlay on first gunner entry
// Insert before "// First-life tutorial hints" in enterGunnerMode()
// ═══════════════════════════════════════════════
const firstLifeHints = findLine('// First-life tutorial hints');
if (firstLifeHints >= 0) {
  const jsInsert = [
    '  // Controls overlay — show on first gunner entry this session',
    '  if (!state._controlsShown) {',
    '    state._controlsShown = true;',
    '    const _co = document.getElementById(\'controls-overlay\');',
    '    if (_co) {',
    '      _co.classList.add(\'active\');',
    '      let _dismissed = false;',
    '      const _dismiss = () => { if (_dismissed) return; _dismissed = true; _co.classList.add(\'fading\'); setTimeout(() => _co.classList.remove(\'active\', \'fading\'), 1500); };',
    '      setTimeout(() => { document.addEventListener(\'mousedown\', _dismiss, { once: true }); document.addEventListener(\'keydown\', _dismiss, { once: true }); }, 500);',
    '      setTimeout(_dismiss, 10000);',
    '    }',
    '  }',
  ];
  lines.splice(firstLifeHints, 0, ...jsInsert.map(cr));
  applied++;
  console.log(`[FIX 5] Controls overlay JS inserted in enterGunnerMode()`);
} else {
  console.error('[FIX 5] FAILED — could not find first-life tutorial hints');
}

// ═══════════════════════════════════════════════
// FIX 6: JS — Launch button click handler
// Insert before the btn-new click handler line
// ═══════════════════════════════════════════════
const btnNewHandler = findLine("getElementById('btn-new')");
if (btnNewHandler >= 0) {
  const launchJs = [
    "document.getElementById('btn-launch').addEventListener('click', () => showScreen('gunner'));",
  ];
  lines.splice(btnNewHandler, 0, ...launchJs.map(cr));
  applied++;
  console.log(`[FIX 6] Launch button click handler inserted`);
} else {
  console.error('[FIX 6] FAILED — could not find btn-new handler');
}

// ═══════════════════════════════════════════════
// FIX 7: First-visit bridge hint after character creation
// Insert after showScreen('bridge') in createCharacter()
// ═══════════════════════════════════════════════
const createFunc = findLine('function createCharacter');
if (createFunc >= 0) {
  const showBridgeLine = findLine("showScreen('bridge')", createFunc);
  if (showBridgeLine >= 0) {
    const bridgeHint = [
      "  addComms('EDEN AI', '\\u2694 Click ENTER SPACE to launch into combat, pilot.');",
    ];
    lines.splice(showBridgeLine + 1, 0, ...bridgeHint.map(cr));
    applied++;
    console.log(`[FIX 7] First-visit bridge hint inserted after createCharacter showScreen`);
  } else {
    console.error('[FIX 7] FAILED — could not find showScreen bridge in createCharacter');
  }
} else {
  console.error('[FIX 7] FAILED — could not find createCharacter function');
}

// ═══════════════════════════════════════════════
// VALIDATION — compare against original balance (regex not 100% accurate on CSS/HTML)
// ═══════════════════════════════════════════════
const RX = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\/.*$/gm;
function countBalance(text) {
  let b = 0, p = 0;
  const s = text.replace(RX, '');
  for (const ch of s) { if (ch === '{') b++; else if (ch === '}') b--; else if (ch === '(') p++; else if (ch === ')') p--; }
  return { b, p };
}
const orig = countBalance(src);
const out = lines.join('\n');
const now = countBalance(out);
console.log(`\nApplied: ${applied}/7 fixes`);
console.log(`Original balance — Braces: ${orig.b}  Parens: ${orig.p}`);
console.log(`New balance      — Braces: ${now.b}  Parens: ${now.p}  Lines: ${lines.length}`);
if (now.b !== orig.b || now.p !== orig.p) {
  console.error(`BALANCE CHANGED (delta braces: ${now.b - orig.b}, delta parens: ${now.p - orig.p}) — NOT WRITING FILE`);
  process.exit(1);
}
fs.writeFileSync(PATH, out, 'utf8');
console.log('File written successfully.');
