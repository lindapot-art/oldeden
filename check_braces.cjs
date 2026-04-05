const fs = require('fs');
const s = fs.readFileSync('public/index.html', 'utf8');
const lines = s.split('\n');
let depth = 0;
let negLines = [];

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  // Strip strings (simplified)
  const clean = raw.replace(/`[^`]*`|'[^']*'|"[^"]*"/g, '');
  let lineOpen = 0, lineClose = 0;
  for (const c of clean) {
    if (c === '{') { lineOpen++; depth++; }
    if (c === '}') { lineClose++; depth--; }
  }
  if (depth < 0) {
    negLines.push({ line: i + 1, depth, content: raw.trim().substring(0, 80) });
  }
  // Also track where depth first goes to -1
  if (depth === -1 && negLines.length <= 5) {
    // already captured
  }
}
console.log('Final depth:', depth);
console.log('Lines where depth went negative:');
negLines.slice(0, 10).forEach(n => console.log(`  L${n.line}: depth=${n.depth} "${n.content}"`));

// Also check: does CSS section have balanced braces?
let cssStart = -1, cssEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<style>')) cssStart = i;
  if (lines[i].includes('</style>')) { cssEnd = i; break; }
}
if (cssStart >= 0 && cssEnd >= 0) {
  let cssDepth = 0;
  for (let i = cssStart; i <= cssEnd; i++) {
    for (const c of lines[i]) {
      if (c === '{') cssDepth++;
      if (c === '}') cssDepth--;
    }
  }
  console.log(`\nCSS section (L${cssStart+1}-L${cssEnd+1}): brace depth = ${cssDepth}`);
}

// Check JS section balance
let jsStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<script type="module">')) { jsStart = i; break; }
}
if (jsStart >= 0) {
  let jsDepth = 0;
  for (let i = jsStart; i < lines.length; i++) {
    const clean = lines[i].replace(/`[^`]*`|'[^']*'|"[^"]*"/g, '');
    for (const c of clean) {
      if (c === '{') jsDepth++;
      if (c === '}') jsDepth--;
    }
  }
  console.log(`JS section (L${jsStart+1}-end): brace depth = ${jsDepth}`);
}
