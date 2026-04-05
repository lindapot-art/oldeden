const fs = require('fs');
let f = fs.readFileSync('public/index.html', 'utf8');

// Replace the beginning of spawnAsteroids to add system-driven variation
const old7 = 'function spawnAsteroids() {\r\n  for (let i = 0; i < 30; i++) {';
const rep7 = `function spawnAsteroids() {\r\n  const sys = state.starSystems[state.location.systemIndex];\r\n  const hasAsteroidHazard = sys?.hazards?.some(h => h.includes('Asteroid'));\r\n  const baseCount = hasAsteroidHazard ? 50 : 30;\r\n  const tints = { 'Titanite Ore': 0x665544, 'Dark Matter Crystals': 0x332255, 'Hydrogen Fuel': 0x334455, 'Rare Earth Compounds': 0x556633, 'Ancient Artefacts': 0x554422, 'Quantum Processors': 0x335566 };\r\n  const resTint = tints[sys?.resources?.[0]] || 0x554433;\r\n  const fogColors = { hegemony_vanguard: 0x050a14, free_traders: 0x050f08, void_cult: 0x0a0512, iron_syndicate: 0x0f0a05, eden_remnants: 0x0a0a08, stellar_church: 0x0f050a, autonomous_collective: 0x050a0f, rogue_ai_network: 0x100508 };\r\n  const fogColor = fogColors[sys?.controllingFaction] || 0x050510;\r\n  scene.fog = new THREE.FogExp2(fogColor, 0.0015);\r\n  scene.background = new THREE.Color(fogColor);\r\n  for (let i = 0; i < baseCount; i++) {`;
if (f.includes(old7)) { f = f.replace(old7, rep7); console.log('PATCH7a APPLIED'); }
else console.log('PATCH7a FAILED');

// Replace asteroid material color with system tint
const old7b = "const mat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9, metalness: 0.2, flatShading: true });";
const rep7b = "const mat = new THREE.MeshStandardMaterial({ color: resTint, roughness: 0.9, metalness: 0.2, flatShading: true });";
if (f.includes(old7b)) { f = f.replace(old7b, rep7b); console.log('PATCH7b APPLIED'); }
else console.log('PATCH7b FAILED');

fs.writeFileSync('public/index.html', f);
