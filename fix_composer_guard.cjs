/**
 * Fix: Guard composer.render() in game loop to prevent errors 
 * when EffectComposer fails to initialize (headless browsers, WebGL limitations)
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

// Fix 1: Add composer to the game loop guard
const guardLine = findLine("if (!scene || !camera || !ship || !turretMount) return;");
if (guardLine >= 0) {
  const old = lines[guardLine];
  const patched = old.replace(
    "if (!scene || !camera || !ship || !turretMount) return;",
    "if (!scene || !camera || !ship || !turretMount || !composer) return;"
  );
  lines[guardLine] = patched;
  applied++;
  console.log(`[FIX 1] Added composer to game loop guard at line ${guardLine + 1}`);
} else {
  console.error('[FIX 1] FAILED — game loop guard not found');
}

// Fix 2: Also guard the resize function's composer.setSize call
const resizeComposer = findLine("composer.setSize(w, h);");
if (resizeComposer >= 0) {
  const old = lines[resizeComposer];
  const patched = old.replace("composer.setSize(w, h);", "if (composer) composer.setSize(w, h);");
  lines[resizeComposer] = patched;
  applied++;
  console.log(`[FIX 2] Guarded composer.setSize in resize() at line ${resizeComposer + 1}`);
} else {
  console.error('[FIX 2] FAILED — composer.setSize not found');
}

// Validation
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
console.log(`\nApplied: ${applied}/2 fixes`);
console.log(`Balance delta — Braces: ${now.b - orig.b}  Parens: ${now.p - orig.p}  Lines: ${lines.length}`);
if (now.b !== orig.b || now.p !== orig.p) {
  console.error('BALANCE CHANGED — NOT WRITING FILE');
  process.exit(1);
}
fs.writeFileSync(PATH, out, 'utf8');
console.log('File written successfully.');
