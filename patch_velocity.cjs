/**
 * Micro-patch: Add enemy velocity tracking for lead reticle
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'public', 'index.html');
let src = fs.readFileSync(FILE, 'utf8');

const anchor = 'e.hitFlash = Math.max(0, e.hitFlash - dtMs);';
const idx = src.indexOf(anchor);
if (idx === -1) { console.log('SKIP: anchor not found'); process.exit(0); }

const code = '\r\n      // Track enemy velocity for lead reticle\r\n      if (!e._prevPos) e._prevPos = e.group.position.clone();\r\n      if (!e._velocity) e._velocity = {x:0,y:0,z:0};\r\n      if (dt > 0) {\r\n        e._velocity.x = (e.group.position.x - e._prevPos.x) / dt;\r\n        e._velocity.y = (e.group.position.y - e._prevPos.y) / dt;\r\n        e._velocity.z = (e.group.position.z - e._prevPos.z) / dt;\r\n        e._prevPos.copy(e.group.position);\r\n      }\r\n';

const insertAt = idx + anchor.length;
src = src.slice(0, insertAt) + code + src.slice(insertAt);
fs.writeFileSync(FILE, src, 'utf8');
console.log('OK: Enemy velocity tracking added');

// Verify balance
let b=0,p=0,k=0;
for(const ch of src){if(ch==='{')b++;else if(ch==='}')b--;else if(ch==='(')p++;else if(ch===')')p--;else if(ch==='[')k++;else if(ch===']')k--;}
console.log('Brace:', b, '| Paren:', p, '| Bracket:', k);
