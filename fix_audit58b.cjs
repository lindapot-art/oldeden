/**
 * Audit 58 — Fix 8 start (tutorial timeout push)
 * Separate patch because \u26a0 is a literal escape in the source file
 */
const fs = require('fs');
const path = require('path');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

const HTML = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(HTML, 'utf8');

const oldStr = cr(
  '    c._tutorialTimeouts = [\n' +
  '      setTimeout(() => { if (c.active) addComms(\'EDEN AI\', \'\\u26a0 Warning: Hostile contacts approaching. Click to fire your railgun!\'); }, 3000),'
);

const newStr = cr(
  '    if (!c._tutorialTimeouts) c._tutorialTimeouts = [];\n' +
  '    c._tutorialTimeouts.push(\n' +
  '      setTimeout(() => { if (c.active) addComms(\'EDEN AI\', \'\\u26a0 Warning: Hostile contacts approaching. Click to fire your railgun!\'); }, 3000),'
);

const idx = src.indexOf(oldStr);
if (idx === -1) {
  console.error('FAIL — anchor not found');
  process.exit(1);
}
if (src.indexOf(oldStr, idx + 1) !== -1) {
  console.error('FAIL — ambiguous anchor');
  process.exit(1);
}

src = src.slice(0, idx) + newStr + src.slice(idx + oldStr.length);
fs.writeFileSync(HTML, src, 'utf8');
console.log('OK   [Fix8-tutorial-timeout-push-start]');
