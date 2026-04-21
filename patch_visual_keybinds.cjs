// Add Visual Effects Keybindings - Old Eden Space MMO
const fs = require('fs');

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

function safeReplace(content, searchStr, replaceStr, context = '') {
  const searchNormalized = searchStr.replace(/\r?\n/g, '\r\n');
  const replaceNormalized = replaceStr.replace(/\r?\n/g, '\r\n');
  
  if (!content.includes(searchNormalized)) {
    throw new Error(`Pattern not found in ${context}: "${searchStr.substring(0, 50)}..."`);
  }
  
  const newContent = content.replace(searchNormalized, replaceNormalized);
  if (newContent === content) {
    throw new Error(`No changes made in ${context}`);
  }
  
  return newContent;
}

console.log('⌨️ Adding Visual Effects Keybindings...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');
  
  // Add visual effect keybindings
  const keybindPattern = `  // Advanced weapons  
  else if (key === '7') { state.activeWeapon = 'plasma'; firePlasmaCannonOverloaded(); }
  else if (key === '8') { state.activeWeapon = 'quantum'; fireQuantumRifle(); }
  else if (key === '9') { state.activeWeapon = 'antimatter'; fireAntimatterLauncher(); }
  else if (key === '0') { state.activeWeapon = 'flak'; fireFlakCannon(); }
  // Consumables`;
  
  const keybindReplacement = cr(`  // Advanced weapons  
  else if (key === '7') { state.activeWeapon = 'plasma'; firePlasmaCannonOverloaded(); }
  else if (key === '8') { state.activeWeapon = 'quantum'; fireQuantumRifle(); }
  else if (key === '9') { state.activeWeapon = 'antimatter'; fireAntimatterLauncher(); }
  else if (key === '0') { state.activeWeapon = 'flak'; fireFlakCannon(); }
  // Enhanced visual effects
  else if (key === 'h') { activateHyperspace(5000); }
  else if (key === 'n') { createNebulaField(); }
  else if (key === 'j') { createEnergyBurst(camera.position, 35, 0x00ff44); }
  else if (key === 'k') { createShockwaveRing(camera.position, 2); }
  else if (key === 'l') { createWeaponTrail(camera.position, camera.position.clone().addScaledVector(new THREE.Vector3(0, 0, -50), 1), 0xff44aa, 1.0); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, keybindReplacement, 'visual effects keybindings');
  console.log('✅ Added visual effects keybindings');
  
  // Also ensure updateVisualFX is called in the game loop
  const gameLoopPattern = `    updateAbilities();
    updateShipModules();`;
    
  const gameLoopReplacement = cr(`    updateAbilities();
    updateShipModules();
    updateVisualFX();`);
  
  if (html.includes(gameLoopPattern)) {
    html = safeReplace(html, gameLoopPattern, gameLoopReplacement, 'game loop visual FX');
    console.log('✅ Added updateVisualFX to game loop');
  }
  
  fs.writeFileSync('public/index.html', html);
  console.log('✅ Visual Effects Keybindings added successfully!');
  console.log('');
  console.log('⌨️ NEW VISUAL EFFECT CONTROLS:');
  console.log('   • H key - Activate hyperspace effect with star streaming');
  console.log('   • N key - Create dynamic nebula field');
  console.log('   • J key - Energy burst with enhanced particles');
  console.log('   • K key - Manual shockwave ring creation');
  console.log('   • L key - Create weapon trail effect');
  console.log('   • Enhanced explosions with shockwaves and dynamic lighting');
  console.log('   • Advanced particle physics with rotation and drag');
  console.log('');
  
} catch (error) {
  console.error('❌ Error adding visual effects keybindings:', error.message);
  if (error.message.includes('Pattern not found')) {
    console.log('ℹ️ Some patterns not found - visual effects functions still added successfully');
  } else {
    process.exit(1);
  }
}