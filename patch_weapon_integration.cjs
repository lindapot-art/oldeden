// SIMPLIFIED WEAPON PROGRESSION PATCH - Add missing integration

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

console.log('⚔️ Completing weapon progression integration...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add weapon XP gain to enemy death - find a simpler pattern
  const enemyDeathPattern = `        addCombatLog(\`Destroyed \${e.type} (+\${_creditsGain} EC)\`, '#44ff88');`;
  
  const weaponXPGain = cr(`        addCombatLog(\`Destroyed \${e.type} (+\${_creditsGain} EC)\`, '#44ff88');
        
        // ═══ WEAPON PROGRESSION XP GAIN ═══ 
        if (typeof gainWeaponExperience === 'function') {
          const currentWeapon = state.weaponProgression?.currentWeapon || 'railgun';
          const xpGain = Math.max(1, Math.floor(e.maxHp / 3)) + (e._isElite ? 5 : 0);
          gainWeaponExperience(currentWeapon, xpGain);
        }`);
  
  html = safeReplace(html, enemyDeathPattern, weaponXPGain, 'weapon XP integration');
  console.log('✅ Added weapon XP gain to enemy kills');

  // Add keybindings for weapon progression
  const keybindPattern = `  // Boss encounters
  else if (key === 'f12') { spawnRandomBoss(); }
  else if (key === 'f11') { if (state.bossSystem.activeBoss) { state.bossSystem.activeBoss.currentHp = Math.max(0, state.bossSystem.activeBoss.currentHp - 1000); } }`;
  
  const weaponKeybinds = cr(`  // Boss encounters
  else if (key === 'f12') { spawnRandomBoss(); }
  else if (key === 'f11') { if (state.bossSystem.activeBoss) { state.bossSystem.activeBoss.currentHp = Math.max(0, state.bossSystem.activeBoss.currentHp - 1000); } }
  // ═══ WEAPON PROGRESSION CONTROLS ═══
  else if (key === '1') { if (typeof switchWeapon === 'function') switchWeapon('railgun'); }
  else if (key === '2') { if (typeof switchWeapon === 'function') switchWeapon('laser'); }
  else if (key === '3') { if (typeof switchWeapon === 'function') switchWeapon('missile'); }
  else if (key === '4') { if (typeof switchWeapon === 'function') switchWeapon('plasma'); }
  else if (key === '5') { if (typeof switchWeapon === 'function') switchWeapon('quantum'); }
  else if (key === '6') { if (typeof switchWeapon === 'function') switchWeapon('antimatter'); }
  else if (key === 'u' || key === 'U') { if (typeof showWeaponProgressionUI === 'function') showWeaponProgressionUI(); }`);
  
  html = safeReplace(html, keybindPattern, weaponKeybinds, 'weapon keybindings');
  console.log('✅ Added weapon progression keybindings (1-6 for weapons, U for UI)');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Weapon progression integration completed successfully!');
  console.log('');
  console.log('🎯 INTEGRATION COMPLETE:');
  console.log('   • Weapon XP gain integrated into enemy kills');
  console.log('   • Weapon switching keybindings (1-6)');
  console.log('   • Progression UI keybinding (U key)');
  console.log('   • Safe function checking to prevent errors');
  console.log('');
  
} catch (error) {
  console.error('❌ Error completing weapon progression integration:', error.message);
  process.exit(1);
}