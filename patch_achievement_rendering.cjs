// FINAL ACHIEVEMENT RENDERING PATCH

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

console.log('🎨 Adding Achievement Rendering...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add achievement flash rendering to game loop
  const renderPattern = `      if (composer) composer.render();
    } catch (loopError) {`;
  
  const renderWithAchievements = cr(`      if (composer) composer.render();
      
      // Render achievement flash overlay
      if (typeof renderAchievementFlash === 'function') {
        renderAchievementFlash(ctx);
      }
    } catch (loopError) {`);
  
  html = safeReplace(html, renderPattern, renderWithAchievements, 'achievement rendering');
  console.log('✅ Added achievement flash rendering to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Achievement rendering patch completed successfully!');
  console.log('');
  console.log('🎨 ACHIEVEMENT RENDERING COMPLETE:');
  console.log('   • Achievement flash overlay added to game loop');
  console.log('   • Visual feedback for achievement unlocks');
  console.log('   • Screen flash effects for major achievements');
  console.log('');
  
} catch (error) {
  console.error('❌ Error adding achievement rendering:', error.message);
  process.exit(1);
}