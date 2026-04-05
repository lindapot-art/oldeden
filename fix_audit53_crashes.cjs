/**
 * Audit 53 — Fix 4 confirmed crash bugs in public/index.html
 *
 * BUG #1 (CRITICAL): glbSceneObjects and libraryLabels are UNDECLARED at line 4077.
 *   In <script type="module"> (strict mode), accessing undeclared vars = ReferenceError.
 *   Every gunner exit crashes → death locks, _transitioning locks, game freezes.
 *   FIX: Declare both as module-scope variables near stationModels.
 *
 * BUG #2 (HIGH): Ship parade cooldown calls async _loadNextParadeShip() without
 *   changing paradePhase first. While async loads, paradePhase stays "cooldown",
 *   causing per-frame re-entry → multiple concurrent loads, memory leak.
 *   FIX: Set paradePhase = "loading" before the async call.
 *
 * BUG #3 (MEDIUM): Station trade injects unescaped c.name into onclick attributes.
 *   XSS via poisoned server commodity names.
 *   FIX: Use _escHtml(c.name) for display + sanitized string for onclick.
 *
 * BUG #4 (LOW): renderStarMap connection target has no null guard.
 *   If starSystems[ci] is undefined (stale connection index), t.x throws TypeError.
 *   FIX: Add null guard.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
const original = src;

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let patchCount = 0;
function safeReplace(oldStr, newStr, label) {
  const old = cr(oldStr);
  const rep = cr(newStr);
  if (!src.includes(old)) {
    console.error(`[FAIL] ${label}: old string NOT found`);
    process.exit(1);
  }
  const count = src.split(old).length - 1;
  if (count !== 1) {
    console.error(`[FAIL] ${label}: found ${count} matches (expected 1)`);
    process.exit(1);
  }
  src = src.replace(old, rep);
  patchCount++;
  console.log(`[OK] ${label}`);
}

// ─── BUG #1: Declare glbSceneObjects and libraryLabels ───
// Insert right after `let stationModels = [];` (line ~6111)
safeReplace(
  `let stationModels = [];`,
  `let stationModels = [];
let glbSceneObjects = [];   // GLB models added to scene (cleaned up on exit gunner)
let libraryLabels = [];     // Ship library HUD labels (cleaned up on exit gunner)`,
  'BUG-1: Declare glbSceneObjects and libraryLabels'
);

// ─── BUG #2: Parade cooldown race condition ───
// In updateShipParade, the cooldown block:
safeReplace(
  `  if (paradePhase === "cooldown") {
    paradeTimer += dtMs;
    if (paradeTimer >= PARADE_COOLDOWN) {
      paradeIndex++;
      _loadNextParadeShip();
    }
  }`,
  `  if (paradePhase === "cooldown") {
    paradeTimer += dtMs;
    if (paradeTimer >= PARADE_COOLDOWN) {
      paradeIndex++;
      paradePhase = "loading";  // prevent per-frame re-entry during async load
      _loadNextParadeShip();
    }
  }`,
  'BUG-2: Parade cooldown race condition — set loading before async call'
);

// ─── BUG #3: XSS in station trade onclick ───
// The onclick attributes inject c.name unescaped into single-quoted JS strings.
// A commodity named `O'Malley` or `'; alert(1); '` would break out.
// Fix: sanitize name in template. Use _escHtml for display, replace ' with &#x27; for onclick.
safeReplace(
  `  market.innerHTML = prices.map(c => \`
    <div class="trade-row">
      <span>\$` + `{c.name}</span>
      <span>
        <button class="trade-buy" onclick="window._buy('\$` + `{c.name}',\$` + `{c.buy})">Buy \$` + `{c.buy} EC</button>
        <button class="trade-sell" onclick="window._sell('\$` + `{c.name}',\$` + `{c.sell})">Sell \$` + `{c.sell} EC</button>
      </span>
    </div>\`).join('');`,
  `  market.innerHTML = prices.map(c => {
    const safeName = _escHtml(c.name);
    const jsName = c.name.replace(/'/g, "\\\\'");
    return \`
    <div class="trade-row">
      <span>\$` + `{safeName}</span>
      <span>
        <button class="trade-buy" onclick="window._buy('\$` + `{jsName}',\$` + `{c.buy})">Buy \$` + `{c.buy} EC</button>
        <button class="trade-sell" onclick="window._sell('\$` + `{jsName}',\$` + `{c.sell})">Sell \$` + `{c.sell} EC</button>
      </span>
    </div>\`;
  }).join('');`,
  'BUG-3: XSS — sanitize commodity name in station trade onclick'
);

// ─── BUG #4: renderStarMap null guard on connection target ───
safeReplace(
  `    (s.connections || []).forEach(ci => {
      const t = state.starSystems[ci];
      const tx = cx + t.x * scale, ty = cy + t.y * scale;`,
  `    (s.connections || []).forEach(ci => {
      const t = state.starSystems[ci];
      if (!t) return;
      const tx = cx + t.x * scale, ty = cy + t.y * scale;`,
  'BUG-4: Null guard on starmap connection target'
);

// Write
fs.writeFileSync(FILE, src, 'utf8');
console.log(`\n✅ All ${patchCount} patches applied successfully.`);
console.log(`File size: ${src.length} bytes`);
