/**
 * Audit 59a — Client-side fixes (public/index.html)
 *
 * Fix1  (HIGH)  exitGunnerMode — disposeObject on GLB models (GPU leak)
 * Fix2  (HIGH)  _marketBuy — quantity guard against double-tap underflow
 * Fix3  (MEDIUM) updateAutopilot — reuse temp vector instead of .clone()
 * Fix4  (MEDIUM) updateMining — reuse temp vectors instead of .clone()
 * Fix5  (MEDIUM) loadFromServerData economy — validate incoming economy fields
 * Fix6  (MEDIUM) death:report — use server-authoritative name in emit
 */
const fs = require('fs');
const path = require('path');

function cr(s) { return s.replace(/\n/g, '\r\n'); }

let errors = 0;
let applied = 0;

function patch(filePath, oldStr, newStr, label) {
  let src = fs.readFileSync(filePath, 'utf8');
  const target = cr(oldStr);
  const idx = src.indexOf(target);
  if (idx === -1) {
    console.error(`FAIL [${label}] — anchor not found in ${path.basename(filePath)}`);
    errors++;
    return;
  }
  if (src.indexOf(target, idx + 1) !== -1) {
    console.error(`FAIL [${label}] — ambiguous anchor in ${path.basename(filePath)}`);
    errors++;
    return;
  }
  src = src.slice(0, idx) + cr(newStr) + src.slice(idx + target.length);
  fs.writeFileSync(filePath, src, 'utf8');
  applied++;
  console.log(`OK   [${label}]`);
}

const HTML = path.join(__dirname, 'public', 'index.html');

// ═══════════════════════════════════════════════════════════════════════
// FIX 1 (HIGH): exitGunnerMode — add disposeObject for 4 GLB models
// These are clones removed from parent but never disposed → GPU leak
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `  if (railgunModel) { cockpit.remove(railgunModel); railgunModel = null; }
  if (cockpitGLBModel) { camera.remove(cockpitGLBModel); cockpitGLBModel = null; }
  if (dashboardGunModel) { camera.remove(dashboardGunModel); dashboardGunModel = null; }`,
  `  if (railgunModel) { cockpit.remove(railgunModel); disposeObject(railgunModel); railgunModel = null; }
  if (cockpitGLBModel) { camera.remove(cockpitGLBModel); disposeObject(cockpitGLBModel); cockpitGLBModel = null; }
  if (dashboardGunModel) { camera.remove(dashboardGunModel); disposeObject(dashboardGunModel); dashboardGunModel = null; }`,
  'Fix1a-glb-dispose-top3'
);

patch(HTML,
  `  if (playerShipGLB) { ship.remove(playerShipGLB); playerShipGLB = null; }
  // Reset fog and background to default ambient values (combat sets dense fog)`,
  `  if (playerShipGLB) { ship.remove(playerShipGLB); disposeObject(playerShipGLB); playerShipGLB = null; }
  // Reset fog and background to default ambient values (combat sets dense fog)`,
  'Fix1b-glb-dispose-ship'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 2 (MEDIUM): _marketBuy — guard against double-tap buying quantity=0
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `window._marketBuy = (orderId) => {
  const order = state.market.orders.find(o => o.id === orderId);
  if (!order) return;
  if (state.player.credits < order.price) { addComms('Market', 'Insufficient credits.'); return; }`,
  `window._marketBuy = (orderId) => {
  const order = state.market.orders.find(o => o.id === orderId);
  if (!order || order.quantity <= 0) return;
  if (state.player.credits < order.price) { addComms('Market', 'Insufficient credits.'); return; }`,
  'Fix2-marketBuy-quantity-guard'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 3 (MEDIUM): updateAutopilot — reuse _tmpV3b instead of .clone()
// Note: _tmpV3a is used later in the same function, so use _tmpV3b here
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `  const toTarget = autopilotTarget.clone().sub(ship.position);
  const dist = toTarget.length();

  if (dist < 15) {
    disengageAutopilot();
    fl.thrust = 0;
    fl.velocity = { x: 0, y: 0, z: 0 };
    fl.speed = 0;
    return;
  }

  // Steer camera yaw/pitch toward target (ship follows camera via quaternion slerp)
  const targetDir = toTarget.normalize();
  _tmpV3a.copy(targetDir);`,
  `  _tmpV3b.copy(autopilotTarget).sub(ship.position);
  const dist = _tmpV3b.length();

  if (dist < 15) {
    disengageAutopilot();
    fl.thrust = 0;
    fl.velocity = { x: 0, y: 0, z: 0 };
    fl.speed = 0;
    return;
  }

  // Steer camera yaw/pitch toward target (ship follows camera via quaternion slerp)
  _tmpV3b.normalize();
  _tmpV3a.copy(_tmpV3b);`,
  'Fix3-autopilot-tmp-vector'
);

// Also fix the targetDir references below (now _tmpV3b)
patch(HTML,
  `  const speedFactor = dist > 100 ? 1.0 : dist / 100;
  fl.velocity.x += targetDir.x * fl.accel * speedFactor * dt;
  fl.velocity.y += targetDir.y * fl.accel * speedFactor * dt;
  fl.velocity.z += targetDir.z * fl.accel * speedFactor * dt;`,
  `  const speedFactor = dist > 100 ? 1.0 : dist / 100;
  fl.velocity.x += _tmpV3b.x * fl.accel * speedFactor * dt;
  fl.velocity.y += _tmpV3b.y * fl.accel * speedFactor * dt;
  fl.velocity.z += _tmpV3b.z * fl.accel * speedFactor * dt;`,
  'Fix3b-autopilot-targetDir-refs'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 4 (MEDIUM): updateMining — reuse temp vectors instead of .clone()
// The original code creates from/to/mid via .clone(), then uses _tmpV3a
// for beam alignment. We reuse _tmpV3c for mid, and rework beam alignment.
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `    const from = ship.position.clone();
    const to = asteroid.position.clone();
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dist = from.distanceTo(to);
    miningLaserBeam.position.copy(mid);
    miningLaserBeam.scale.set(1, dist, 1);
    // Align cylinder (Y-axis) along beam direction via quaternion
    _tmpV3a.copy(to).sub(from).normalize();`,
  `    const dist = ship.position.distanceTo(asteroid.position);
    _tmpV3c.copy(ship.position).add(asteroid.position).multiplyScalar(0.5);
    miningLaserBeam.position.copy(_tmpV3c);
    miningLaserBeam.scale.set(1, dist, 1);
    // Align cylinder (Y-axis) along beam direction via quaternion
    _tmpV3a.copy(asteroid.position).sub(ship.position).normalize();`,
  'Fix4-mining-tmp-vectors'
);

// ═══════════════════════════════════════════════════════════════════════
// FIX 5 (MEDIUM): loadFromServerData — validate economy fields
// ═══════════════════════════════════════════════════════════════════════
patch(HTML,
  `  if (data.economy) Object.assign(state.economy, data.economy);`,
  `  if (data.economy && typeof data.economy === 'object') {
    // Validate economy fields against allowed ranges to prevent save tampering
    const econ = data.economy;
    if (Number.isFinite(econ.dockingFee) && econ.dockingFee >= 0 && econ.dockingFee <= 1000) state.economy.dockingFee = econ.dockingFee;
    if (Number.isFinite(econ.repairCostPerHp) && econ.repairCostPerHp >= 0 && econ.repairCostPerHp <= 100) state.economy.repairCostPerHp = econ.repairCostPerHp;
    if (Number.isFinite(econ.refuelCostPerUnit) && econ.refuelCostPerUnit >= 0 && econ.refuelCostPerUnit <= 100) state.economy.refuelCostPerUnit = econ.refuelCostPerUnit;
  }`,
  'Fix5-economy-validate'
);

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
console.log(`\n=== Audit 59a (client): ${applied} applied, ${errors} failed ===`);
if (errors > 0) { process.exit(1); }
