/**
 * Audit 53b — Fix 5 remaining issues found by deep re-audit
 *
 * 1. Station trade onclick: jsName missing " escape for HTML attribute context
 * 2. Inventory item.name not escaped in innerHTML
 * 3. Quest q.name / o.type / o.target not escaped
 * 4. Controls overlay timeouts not stored → leak on early exit
 * 5. Parade recursive fail has no depth guard
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');

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

// ─── FIX 1: Also escape " for HTML attribute context in station trade onclick ───
safeReplace(
  `    const jsName = c.name.replace(/'/g, "\\\\'");`,
  `    const jsName = c.name.replace(/'/g, "\\\\'").replace(/"/g, '&quot;');`,
  'FIX-1: Escape double quotes in trade onclick attribute'
);

// ─── FIX 2: Escape inventory item.name in innerHTML ───
safeReplace(
  `state.inventory.map(item => \`<div class="trade-row"><span>` + "$" + `{item.name}</span><span style="color:var(--muted)">x` + "$" + `{item.quantity || 1}</span></div>\`).join('')`,
  `state.inventory.map(item => \`<div class="trade-row"><span>` + "$" + `{_escHtml(item.name)}</span><span style="color:var(--muted)">x` + "$" + `{item.quantity || 1}</span></div>\`).join('')`,
  'FIX-2: Escape inventory item names'
);

// ─── FIX 3: Escape quest names and objectives ───
safeReplace(
  `<div class="qt">` + "$" + `{q.name}</div>`,
  `<div class="qt">` + "$" + `{_escHtml(q.name)}</div>`,
  'FIX-3a: Escape quest name'
);

safeReplace(
  `<span style="color:var(--muted);font-size:0.7rem">` + "$" + `{o.type}: ` + "$" + `{o.target === '*' ? 'any' : o.target} (` + "$" + `{o.required})</span>`,
  `<span style="color:var(--muted);font-size:0.7rem">` + "$" + `{_escHtml(o.type)}: ` + "$" + `{o.target === '*' ? 'any' : _escHtml(o.target)} (` + "$" + `{o.required})</span>`,
  'FIX-3b: Escape quest objective type and target'
);

// ─── FIX 4: Store controls overlay timeouts so they get cleared on exit ───
safeReplace(
  `      setTimeout(() => { document.addEventListener('mousedown', _dismiss, { once: true }); document.addEventListener('keydown', _dismiss, { once: true }); }, 2000);
      setTimeout(_dismiss, 15000);`,
  `      const _t1 = setTimeout(() => { document.addEventListener('mousedown', _dismiss, { once: true }); document.addEventListener('keydown', _dismiss, { once: true }); }, 2000);
      const _t2 = setTimeout(_dismiss, 15000);
      if (!c._tutorialTimeouts) c._tutorialTimeouts = [];
      c._tutorialTimeouts.push(_t1, _t2);`,
  'FIX-4: Store controls overlay timeouts for cleanup'
);

// ─── FIX 5: Parade recursive fail — use iteration instead of recursion ───
safeReplace(
  `  } catch(e) {
    console.warn("[Parade] Failed to load", key, e);
    paradeIndex++;
    await _loadNextParadeShip();
  }`,
  `  } catch(e) {
    console.warn("[Parade] Failed to load", key, e);
    paradeIndex++;
    if (paradeIndex < PARADE_SHIPS.length) {
      await _loadNextParadeShip();
    } else {
      paradePhase = "idle";
      paradeIndex = 0;
      addComms("System", "Ship parade complete — some models failed to load.");
    }
  }`,
  'FIX-5: Parade recursive fail — add bounds check to prevent infinite recursion'
);

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\n✅ All ${patchCount} patches applied successfully.`);
console.log(`File size: ${src.length} bytes`);
