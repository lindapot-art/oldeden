/**
 * Fix: Guard e.target.matches/closest calls for non-Element nodes
 * In delegated events (especially capture-phase mouseenter), e.target 
 * can be a text node or document, which don't have matches/closest methods.
 */
const fs = require('fs');
const PATH = 'public/index.html';

let src = fs.readFileSync(PATH, 'utf8');
let lines = src.split('\n');

let applied = 0;

// Fix 1: Guard mouseenter handler's e.target.matches
const matchesLine = lines.findIndex(l => l.includes("e.target.matches('.menu-btn,.btn,.nav-btn,.action-btn')"));
if (matchesLine >= 0) {
  lines[matchesLine] = lines[matchesLine].replace(
    "if (e.target.matches('.menu-btn,.btn,.nav-btn,.action-btn'))",
    "if (e.target.matches && e.target.matches('.menu-btn,.btn,.nav-btn,.action-btn'))"
  );
  applied++;
  console.log(`[FIX 1] Guarded e.target.matches at line ${matchesLine + 1}`);
}

// Fix 2: Guard click handler's e.target.closest (defensive)
const closestLine = lines.findIndex(l => l.includes("e.target.closest('.menu-btn,.btn,.nav-btn,.action-btn"));
if (closestLine >= 0) {
  lines[closestLine] = lines[closestLine].replace(
    "if (e.target.closest(",
    "if (e.target.closest && e.target.closest("
  );
  applied++;
  console.log(`[FIX 2] Guarded e.target.closest at line ${closestLine + 1}`);
}

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
console.log(`Applied: ${applied} fixes | Balance delta: B=${now.b-orig.b} P=${now.p-orig.p}`);
if (now.b !== orig.b || now.p !== orig.p) { console.error('BALANCE CHANGED'); process.exit(1); }
fs.writeFileSync(PATH, out, 'utf8');
console.log('Written.');
