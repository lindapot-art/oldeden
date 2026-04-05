/**
 * Audit 18b — Touch boost button handler
 */
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(filePath, 'utf8');
const cr = s => s.replace(/\n/g, '\r\n');

let applied = 0, skipped = 0;
function safeReplace(oldStr, newStr, label) {
  const o = cr(oldStr), n = cr(newStr);
  if (!src.includes(o)) { console.log('  SKIP: ' + label); skipped++; return; }
  const count = src.split(o).length - 1;
  if (count !== 1) { console.log('  SKIP (multi ' + count + '): ' + label); skipped++; return; }
  src = src.replace(o, n);
  console.log('  OK: ' + label);
  applied++;
}

safeReplace(
`  }, { passive: false });
})();

document.addEventListener('pointerlockchange', () => {`,
`  }, { passive: false });
  // Touch boost button
  const boostBtn = document.getElementById('touch-boost');
  if (boostBtn) {
    boostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keysDown.add('shift'); }, { passive: false });
    boostBtn.addEventListener('touchend', () => { keysDown.delete('shift'); });
    boostBtn.addEventListener('touchcancel', () => { keysDown.delete('shift'); });
  }
})();

document.addEventListener('pointerlockchange', () => {`,
'Fix 16: Touch boost button handler'
);

fs.writeFileSync(filePath, src, 'utf8');
const open = (src.match(/\{/g)||[]).length;
const close = (src.match(/\}/g)||[]).length;
const openP = (src.match(/\(/g)||[]).length;
const closeP = (src.match(/\)/g)||[]).length;
const openB = (src.match(/\[/g)||[]).length;
const closeB = (src.match(/\]/g)||[]).length;
console.log(`\nApplied: ${applied}/${applied+skipped}`);
console.log(`Balance — {}: ${open}/${close} (): ${openP}/${closeP} []: ${openB}/${closeB}`);
