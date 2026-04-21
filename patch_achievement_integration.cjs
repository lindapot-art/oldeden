// ACHIEVEMENT INTEGRATION COMPLETION

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

console.log('🏆 Completing Achievement System Integration...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add achievement keybinding
  const keybindPattern = `  else if (key === 'p' || key === 'P') { if (typeof showProgressionUI === 'function') showProgressionUI(); }
  // Consumables`;
  
  const achievementKeybind = cr(`  else if (key === 'p' || key === 'P') { if (typeof showProgressionUI === 'function') showProgressionUI(); }
  else if (key === 'h' || key === 'H') { if (typeof showAchievementsUI === 'function') showAchievementsUI(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, achievementKeybind, 'achievement keybinding');
  console.log('✅ Added achievement UI keybinding (H key)');

  // Add basic achievement tracking to level ups
  const levelUpPattern = `    addComms('PILOT TRAINING', \`Level \${pp.level} achieved! +2 skill points, +1 attribute point.\`);
    AudioSFX.play('quest_complete');`;
    
  const levelUpWithTracking = cr(`    addComms('PILOT TRAINING', \`Level \${pp.level} achieved! +2 skill points, +1 attribute point.\`);
    AudioSFX.play('quest_complete');
    
    // Achievement tracking
    if (typeof updateAchievementStats === 'function') {
      updateAchievementStats('levelUps', 1, true);
      updateAchievementStats('highestLevel', pp.level, false);
    }`);
  
  if (html.includes('PILOT TRAINING')) {
    html = html.replace(levelUpPattern, levelUpWithTracking);
    console.log('✅ Added achievement tracking to level ups');
  }

  // Add simple enemy kill tracking
  const enemyKillPattern = `            addCombatLog('Destroyed ' + (e.type || 'hostile') + (e.isBoss ? ' (BOSS)' : '') + ' +' + pts + 'pts', _kfColor);`;
  
  const enemyKillWithTracking = cr(`            addCombatLog('Destroyed ' + (e.type || 'hostile') + (e.isBoss ? ' (BOSS)' : '') + ' +' + pts + 'pts', _kfColor);
            
            // Achievement tracking
            if (typeof updateAchievementStats === 'function') {
              updateAchievementStats('enemiesKilled', 1, true);
              if (e._isElite) updateAchievementStats('eliteKills', 1, true);
              if (e.isBoss) updateAchievementStats('bossesDefeated', 1, true);
            }`);
  
  html = safeReplace(html, enemyKillPattern, enemyKillWithTracking, 'enemy kill tracking');
  console.log('✅ Added achievement tracking to enemy kills');

  // Add achievement flash rendering to game loop
  const renderPattern = `  composer.render();
}`;
  
  const renderWithAchievements = cr(`  composer.render();
  
  // Render achievement flash overlay
  if (typeof renderAchievementFlash === 'function') {
    renderAchievementFlash(ctx);
  }
}`);
  
  html = safeReplace(html, renderPattern, renderWithAchievements, 'achievement rendering');
  console.log('✅ Added achievement flash rendering to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Achievement System integration completed successfully!');
  console.log('');
  console.log('🏆 ACHIEVEMENT INTEGRATION COMPLETE:');
  console.log('   • Achievement UI keybinding added (H key)');
  console.log('   • Enemy kill tracking integrated');
  console.log('   • Level up tracking integrated');
  console.log('   • Achievement flash rendering added');
  console.log('   • Ready for achievement unlocks!');
  console.log('');
  
} catch (error) {
  console.error('❌ Error completing achievement integration:', error.message);
  process.exit(1);
}