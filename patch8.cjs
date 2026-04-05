const fs = require('fs');
let f = fs.readFileSync('public/index.html', 'utf8');

// 8a: Change loot drop table to include fuel
const old8a = "const lootType = Math.random() < 0.5 ? 'credits' : Math.random() < 0.5 ? 'ammo' : 'health';";
const rep8a = "const r = Math.random(); const lootType = r < 0.35 ? 'credits' : r < 0.55 ? 'ammo' : r < 0.75 ? 'health' : 'fuel';";
if (f.includes(old8a)) { f = f.replace(old8a, rep8a); console.log('PATCH8a APPLIED'); }
else console.log('PATCH8a FAILED');

// 8b: Add fuel to loot drop colors
const old8b = "const colors = { credits: 0xffd700, ammo: 0x44aaff, health: 0x44ff44 };";
const rep8b = "const colors = { credits: 0xffd700, ammo: 0x44aaff, health: 0x44ff44, fuel: 0xff8844 };";
if (f.includes(old8b)) { f = f.replace(old8b, rep8b); console.log('PATCH8b APPLIED'); }
else console.log('PATCH8b FAILED');

// 8c: Add fuel pickup handler
const old8c = "else if (l.type === 'health') { state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + 15); c.dmgNumbers.push({ text: '+15 HULL', pos: l.group.position.clone(), age: 0, color: '#44ff44' }); }";
const rep8c = "else if (l.type === 'health') { state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + 15); c.dmgNumbers.push({ text: '+15 HULL', pos: l.group.position.clone(), age: 0, color: '#44ff44' }); }\r\n        else if (l.type === 'fuel') { state.ship.fuel = Math.min(state.ship.maxFuel, state.ship.fuel + 20); c.dmgNumbers.push({ text: '+20 FUEL', pos: l.group.position.clone(), age: 0, color: '#ff8844' }); }";
if (f.includes(old8c)) { f = f.replace(old8c, rep8c); console.log('PATCH8c APPLIED'); }
else console.log('PATCH8c FAILED');

fs.writeFileSync('public/index.html', f);
