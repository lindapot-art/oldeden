// SIMPLE ACHIEVEMENT RENDERING PATCH

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

console.log('🎨 Adding Simple Achievement Rendering...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add achievement flash rendering in the correct location
  const renderPattern = `      if (composer) composer.render();
      else if (renderer) renderer.render(scene, camera);`;
  
  const renderWithAchievements = cr(`      if (composer) composer.render();
      else if (renderer) renderer.render(scene, camera);
      
      // Render achievement flash overlay
      if (typeof renderAchievementFlash === 'function') {
        renderAchievementFlash(ctx);
      }`);
  
  html = safeReplace(html, renderPattern, renderWithAchievements, 'achievement rendering');
  console.log('✅ Added achievement flash rendering to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Achievement rendering completed!');
  console.log('');
  console.log('🎨 ACHIEVEMENT SYSTEM FULLY DEPLOYED:');
  console.log('   • 20+ achievements with comprehensive tracking');
  console.log('   • Visual achievement notifications and screen effects');
  console.log('   • Achievement progress UI (H key)');
  console.log('   • Enemy kill, level up, and progression tracking');
  console.log('   • Reward system with credits, skill points, attribute points');
  console.log('');
  
} catch (error) {
  console.error('❌ Error adding achievement rendering:', error.message);
  process.exit(1);
}