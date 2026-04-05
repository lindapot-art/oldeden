/**
 * Fix: Move `composer` declaration from try{} block scope to module scope
 * Root cause: `let composer;` was INSIDE a try{} block (line 3090), making it 
 * block-scoped and invisible to gameLoop() which is at module scope.
 * Other 3D vars (renderer, scene, camera, ship, turretMount) are declared at
 * module scope on line 3071 — composer needs to be there too.
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

// Fix 1: Add `composer` to the module-scope variable declarations
const declLine = findLine('let renderer, scene, camera, ship, turretMount, cockpit;');
if (declLine >= 0) {
  lines[declLine] = lines[declLine].replace(
    'let renderer, scene, camera, ship, turretMount, cockpit;',
    'let renderer, scene, camera, ship, turretMount, cockpit, composer;'
  );
  applied++;
  console.log(`[FIX 1] Added 'composer' to module-scope declarations at line ${declLine + 1}`);
} else {
  console.error('[FIX 1] FAILED — could not find variable declaration line');
}

// Fix 2: Remove `let` from the inner `let composer;` (now just a comment)
const innerComposer = findLine('let composer;');
if (innerComposer >= 0) {
  lines[innerComposer] = cr('// composer declared at module scope above');
  applied++;
  console.log(`[FIX 2] Removed inner 'let composer;' at line ${innerComposer + 1}`);
} else {
  console.error('[FIX 2] FAILED — could not find inner let composer;');
}

// Fix 3: Add fallback rendering if composer unavailable
const composerRender = findLine('composer.render();');
if (composerRender >= 0) {
  lines[composerRender] = lines[composerRender].replace(
    'composer.render();',
    'if (composer) composer.render(); else if (renderer) renderer.render(scene, camera);'
  );
  applied++;
  console.log(`[FIX 3] Added fallback rendering at line ${composerRender + 1}`);
} else {
  console.error('[FIX 3] FAILED — could not find composer.render()');
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
console.log(`\nApplied: ${applied}/3 fixes`);
console.log(`Balance delta — Braces: ${now.b - orig.b}  Parens: ${now.p - orig.p}  Lines: ${lines.length}`);
if (now.b !== orig.b || now.p !== orig.p) {
  console.error('BALANCE CHANGED — NOT WRITING FILE');
  process.exit(1);
}
fs.writeFileSync(PATH, out, 'utf8');
console.log('File written successfully.');
