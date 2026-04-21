#!/usr/bin/env node
/**
 * Direct Integration: Add weapon key bindings, consumable init, cleanup
 * This writes complete integration blocks directly
 */

const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(INDEX_HTML, 'utf-8');

console.log('[DIRECT-INTEGRATION] Adding gameplay wiring...\n');

// ════════════════════════════════════════════════════════════════
// ADD WEAPON KEY BINDINGS - immediately after all weapon functions
// ════════════════════════════════════════════════════════════════

const keyBindingsCode = `

// ════════════════════════════════════════════════════════════════
//  WEAPON & CONSUMABLE KEY BINDINGS
// ════════════════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  if (state.screen !== 'gunner' || !c.active || c.dead) return;
  const key = e.key.toLowerCase();
  
  // Weapon selection & fire
  if (key === '1') { state.activeWeapon = 'laser'; fireLaser(); }
  else if (key === '2') { state.activeWeapon = 'railgun'; fireRailgun(); }
  else if (key === '3') { state.activeWeapon = 'pistol'; firePistol(); }
  else if (key === '4') { state.activeWeapon = 'blaster'; fireBlasterFuturistic(); }
  else if (key === '5') { state.activeWeapon = 'white_blaster'; fireBlasterWhite(); }
  else if (key === '6') { state.activeWeapon = 'turret'; fireBlasterTurret(); }
  else if (key === 'm') { fireMissile(); }
  // Consumables
  else if (key === 'r') { window._activateConsumable('Repair Kit'); }
  else if (key === 's') { window._activateConsumable('Shield Cell'); }
  else if (key === 'e') { window._activateConsumable('EMP Grenade'); }
}, true);

// Show consumable hints on HUD
window._showConsumableStatus = () => {
  const repair = state.inventory.find(i => i.name === 'Repair Kit')?.quantity || 0;
  const shield = state.inventory.find(i => i.name === 'Shield Cell')?.quantity || 0;
  const emp = state.inventory.find(i => i.name === 'EMP Grenade')?.quantity || 0;
  const hints = document.getElementById('consumable-hints');
  if (hints) hints.innerHTML = \`R:Repair×\${repair} S:Shield×\${shield} E:EMP×\${emp}\`;
};
`;

// Insert right before fireEMP or at a key function boundary
const fireEmpMarker = 'function fireEMP() {';
if (content.includes(fireEmpMarker)) {
  const pos = content.indexOf(fireEmpMarker);
  if (pos > 0 && !content.substring(pos - 500, pos).includes('WEAPON & CONSUMABLE KEY')) {
    content = content.substring(0, pos) + keyBindingsCode + '\r\n' + content.substring(pos);
    console.log('[OK] Weapon & consumable key bindings added');
  }
}

// ════════════════════════════════════════════════════════════════
// INITIALIZE CONSUMABLES AT COMBAT START
// ════════════════════════════════════════════════════════════════

const consumableInitCode = `  
  // Consumables: Repair Kit, Shield Cell, EMP Grenade
  if (!state.inventory.find(i => i.name === 'Repair Kit')) state.inventory.push({ name: 'Repair Kit', quantity: 3 });
  if (!state.inventory.find(i => i.name === 'Shield Cell')) state.inventory.push({ name: 'Shield Cell', quantity: 2 });
  if (!state.inventory.find(i => i.name === 'EMP Grenade')) state.inventory.push({ name: 'EMP Grenade', quantity: 1 });`;

const enterGunnerMarker = 'score insurance: +';
if (content.includes(enterGunnerMarker)) {
  const pos = content.indexOf(enterGunnerMarker);
  if (pos > 0 && !content.substring(pos - 200, pos + 200).includes('Repair Kit')) {
    const lineEnd = content.indexOf('\n', pos);
    content = content.substring(0, lineEnd) + '\r\n' + consumableInitCode + content.substring(lineEnd);
    console.log('[OK] Consumable initialization added to enterGunnerMode');
  }
}

// ════════════════════════════════════════════════════════════════
// GUN ROOM WEBGL CLEANUP
// ════════════════════════════════════════════════════════════════

const gunRoomCleanupCode = `
  // Gun Room WebGL Context Cleanup
  if (state.gunRoomRenderers && Array.isArray(state.gunRoomRenderers)) {
    state.gunRoomRenderers.forEach(renderer => {
      try {
        if (renderer && renderer.dispose) renderer.dispose();
        if (renderer && renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      } catch (e) { /* Silent fail */ }
    });
    state.gunRoomRenderers = [];
  }`;

const gunroomExitMarker = 'if (previousScreen === \'gunroom\'';
if (!content.includes(gunroomExitMarker)) {
  // Add gun room cleanup in _showScreenInner function
  const showScreenMarker = 'if (previousScreen === \'interior\' && name !== \'interior\') destroyInterior();';
  if (content.includes(showScreenMarker)) {
    content = content.replace(
      showScreenMarker,
      showScreenMarker + '\r\n' + gunRoomCleanupCode
    );
    console.log('[OK] Gun Room WebGL cleanup added');
  }
}

// ════════════════════════════════════════════════════════════════
// SAVE
// ════════════════════════════════════════════════════════════════

fs.writeFileSync(INDEX_HTML, content, 'utf-8');
console.log('\n[SUCCESS] All integrations applied');
console.log('[NEXT] Run: node check_syntax.cjs');
console.log('[THEN] Run: node qa_board.cjs');
