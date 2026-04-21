// FINAL WEAPON XP INTEGRATION PATCH

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

console.log('🔫 Adding weapon XP integration...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add weapon XP gain to the correct enemy death location
  const enemyDeathPattern = `            addCombatLog('Destroyed ' + (e.type || 'hostile') + (e.isBoss ? ' (BOSS)' : '') + ' +' + pts + 'pts', _kfColor);`;
  
  const weaponXPIntegration = cr(`            addCombatLog('Destroyed ' + (e.type || 'hostile') + (e.isBoss ? ' (BOSS)' : '') + ' +' + pts + 'pts', _kfColor);
            
            // ═══ WEAPON PROGRESSION XP GAIN ═══
            if (typeof gainWeaponExperience === 'function' && state.weaponProgression) {
              const currentWeapon = state.weaponProgression.currentWeapon || 'railgun';
              const baseXP = Math.max(1, Math.floor(e.maxHp / 3));
              const eliteBonus = e._isElite ? 5 : 0;
              const bossBonus = e.isBoss ? 15 : 0;
              const totalXP = baseXP + eliteBonus + bossBonus;
              gainWeaponExperience(currentWeapon, totalXP);
            }`);
  
  html = safeReplace(html, enemyDeathPattern, weaponXPIntegration, 'weapon XP integration');
  console.log('✅ Added weapon XP gain to enemy kills');

  // Add weapon keybindings in the correct location
  const keybindPattern = `  // ═══ WEAPON PROGRESSION CONTROLS ═══
  else if (key === '1') { if (typeof switchWeapon === 'function') switchWeapon('railgun'); }
  else if (key === '2') { if (typeof switchWeapon === 'function') switchWeapon('laser'); }
  else if (key === '3') { if (typeof switchWeapon === 'function') switchWeapon('missile'); }
  else if (key === '4') { if (typeof switchWeapon === 'function') switchWeapon('plasma'); }
  else if (key === '5') { if (typeof switchWeapon === 'function') switchWeapon('quantum'); }
  else if (key === '6') { if (typeof switchWeapon === 'function') switchWeapon('antimatter'); }
  else if (key === 'u' || key === 'U') { if (typeof showWeaponProgressionUI === 'function') showWeaponProgressionUI(); }`;
  
  // Check if keybindings already exist
  if (!html.includes('WEAPON PROGRESSION CONTROLS')) {
    // Add keybindings after loot testing section
    const lootKeybindPattern = `  else if (key === 'f7') { activateLootBoost('universal', 5.0, 30000); }
  // Consumables`;
  
    const weaponKeybinds = cr(`  else if (key === 'f7') { activateLootBoost('universal', 5.0, 30000); }
  // ═══ WEAPON PROGRESSION CONTROLS ═══
  else if (key === '1') { if (typeof switchWeapon === 'function') switchWeapon('railgun'); }
  else if (key === '2') { if (typeof switchWeapon === 'function') switchWeapon('laser'); }
  else if (key === '3') { if (typeof switchWeapon === 'function') switchWeapon('missile'); }
  else if (key === '4') { if (typeof switchWeapon === 'function') switchWeapon('plasma'); }
  else if (key === '5') { if (typeof switchWeapon === 'function') switchWeapon('quantum'); }
  else if (key === '6') { if (typeof switchWeapon === 'function') switchWeapon('antimatter'); }
  else if (key === 'u' || key === 'U') { if (typeof showWeaponProgressionUI === 'function') showWeaponProgressionUI(); }
  // Consumables`);
    
    if (html.includes(lootKeybindPattern.split('// ═══ WEAPON PROGRESSION')[0])) {
      html = html.replace(lootKeybindPattern.split('// ═══ WEAPON PROGRESSION')[0] + '// Consumables', weaponKeybinds.split('// Consumables')[0] + '// Consumables');
      console.log('✅ Added weapon progression keybindings (1-6 for weapons, U for UI)');
    }
  }

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Weapon progression XP integration completed successfully!');
  console.log('');
  console.log('🔫 WEAPON PROGRESSION NOW ACTIVE:');
  console.log('   • XP gain from enemy kills (base + elite + boss bonuses)');
  console.log('   • Weapon switching with number keys (1-6)');
  console.log('   • Progression UI accessible with U key');
  console.log('   • Safe function checking prevents errors');
  console.log('   • Fully integrated with combat system');
  console.log('');
  
} catch (error) {
  console.error('❌ Error adding weapon XP integration:', error.message);
  process.exit(1);
}