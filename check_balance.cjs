const fs = require('fs');
const out = fs.readFileSync('public/index.html', 'utf8');
let b = 0, p = 0;
const stripped = out.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\/.*$/gm, '');
for (const ch of stripped) {
  if (ch === '{') b++;
  else if (ch === '}') b--;
  else if (ch === '(') p++;
  else if (ch === ')') p--;
}
console.log('Braces:', b, 'Parens:', p, 'Lines:', out.split('\n').length);
