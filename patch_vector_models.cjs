const fs = require("fs");
const file = "d:\\antiruscist\\oldeden\\public\\index.html";
let src = fs.readFileSync(file, "utf-8");
const loadStart = src.indexOf("function loadGLBModel(key) {");
const loadEnd = src.indexOf("\r\n\r\n// =", loadStart + 10);
if (loadStart < 0) { console.error("loadGLBModel not found"); process.exit(1); }
if (loadEnd < 0) { console.error("loadGLBModel end not found"); process.exit(1); }
console.log("[FIND] loadGLBModel at", loadStart, "-", loadEnd);
const newLoadLines = [
"function loadGLBModel(key) {",
"  return new Promise((resolve, reject) => {",
"    if (state.loadedModels[key]) { resolve(state.loadedModels[key]); return; }",
"    const asset = GLB_ASSETS[key];",
"    if (!asset) { reject(new Error('Unknown: ' + key)); return; }",
"    const model = _buildVectorModel(key, asset);",
"    model.scale.setScalar(asset.scale);",
"    state.loadedModels[key] = model;",
"    resolve(model);",
"  });",
"}","",
"function _buildVectorModel(key, asset) {",
"  const g = new THREE.Group();",
"  g.name = 'vec_' + key;",
"  const role = asset.role || 'npc';",
"  const COLORS = { enemy: 0xff3333, boss: 0xff0066, npc: 0x44aaff, police: 0x3366ff, station: 0x888888, planet: 0x44aa66, weapon: 0xffaa00, cockpit: 0x556677, prop: 0x999999, creature: 0xaa44ff };",
"  const baseColor = COLORS[role] || 0x888888;",
"  const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.4, metalness: 0.6, flatShading: true });",
"  const glowMat = new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.25 });",
"  if (role === 'planet') {",
"    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 2), mat));",
"    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.08, 2), new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false })));",
"  } else if (role === 'station') {",
"    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.5, 8), mat));",
"    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.15, 6, 16), mat); ring.rotation.x = Math.PI / 2; g.add(ring);",
"    for (let i = 0; i < 4; i++) { const spar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 2.0), glowMat); spar.position.set(Math.cos(i*Math.PI/2)*0.8, 1.4, Math.sin(i*Math.PI/2)*0.8); g.add(spar); }",
"  } else if (role === 'boss') {",
"    g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), mat));",
"    for (let i = 0; i < 6; i++) { const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.0, 4), mat); const a = (i/6)*Math.PI*2; spike.position.set(Math.cos(a)*1.0, 0, Math.sin(a)*1.0); spike.lookAt(spike.position.clone().multiplyScalar(2)); g.add(spike); }",
"    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 })));",
"  } else if (role === 'enemy') {",
"    const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.0, 4), mat); body.rotation.x = Math.PI / 2; g.add(body);",
"    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.6), mat));",
"    const eng = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 })); eng.position.z = 1.0; g.add(eng);",
"  } else if (role === 'police') {",
"    const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.8, 6), mat); body.rotation.x = Math.PI / 2; g.add(body);",
"    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.5), mat));",
"    const lr = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff0000 })); lr.position.set(-0.3, 0.2, 0); g.add(lr);",
"    const lb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), new THREE.MeshBasicMaterial({ color: 0x0044ff })); lb.position.set(0.3, 0.2, 0); g.add(lb);",
"  } else if (role === 'weapon') {",
"    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.0, 6), mat); barrel.rotation.x = Math.PI / 2; g.add(barrel);",
"    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.6), mat); housing.position.z = 0.8; g.add(housing);",
"  } else if (role === 'cockpit') {",
"    const dash = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.1), mat); dash.position.set(0, -0.5, -1.2); g.add(dash);",
"    const strut = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.04), mat); strut.position.set(0, 0.6, -1.0); g.add(strut);",
"    for (const xSign of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.04), mat); side.position.set(xSign * 1.0, 0, -1.1); g.add(side); }",
"    for (let i = 0; i < 5; i++) { const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), new THREE.MeshBasicMaterial({ color: [0x44ff44, 0xff4444, 0x4444ff, 0xffaa00, 0x44ffff][i] })); led.position.set(-0.6 + i * 0.3, -0.3, -1.25); g.add(led); }",
"  } else if (role === 'creature') {",
"    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), mat));",
"    for (let i = 0; i < 5; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.8, 4), mat); const a = (i/5)*Math.PI*2; seg.position.set(Math.cos(a)*0.5, -0.5, Math.sin(a)*0.5); seg.rotation.x = 0.5; g.add(seg); }",
"  } else if (role === 'prop') {",
"    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), mat));",
"    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), glowMat));",
"  } else {",
"    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 4, 8), mat); body.rotation.x = Math.PI / 2; g.add(body);",
"    const eng = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 })); eng.position.z = 0.8; g.add(eng);",
"    for (const xSign of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.3), mat); fin.position.set(xSign * 0.5, 0, 0.2); g.add(fin); }",
"  }",
"  return g;",
"}",];
const newLoad = newLoadLines.join("\r\n");
src = src.substring(0, loadStart) + newLoad + src.substring(loadEnd);
console.log("[PATCH] Replaced loadGLBModel (" + newLoad.length + " chars)");
const preOld = "async function preloadEnemyModel() {\r\n  // Load iron_sentinel first (most common) \u2014 blocks\r\n  try { await loadGLBModel('iron_sentinel'); } catch(e) { /* fallback to box */ }\r\n  // Stagger remaining models: load 2 at a time with delay to avoid frame spikes\r\n  _combatModelIdx = 0;\r\n  _loadNextCombatBatch();\r\n}";
const preNew = "async function preloadEnemyModel() {\r\n  for (const key of COMBAT_MODELS) { try { await loadGLBModel(key); } catch(e) {} }\r\n}";
if (src.includes(preOld)) { src = src.replace(preOld, preNew); console.log("[PATCH] Simplified preloadEnemyModel"); }
else { console.warn("[WARN] preloadEnemyModel not found exactly — skipped"); }
fs.writeFileSync(file, src, "utf-8");
console.log("[DONE] Written. ALL GLB -> vector geometry.");
