const puppeteer = require('puppeteer');

async function openGameForManualTesting() {
  console.log('🎮 OPENING OLD EDEN FOR MANUAL COMBAT TESTING');
  console.log('🌐 Game URL: http://localhost:3847');
  console.log('');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-web-security'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('📍 Loading Old Eden Space MMO...');
    await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded' });
    
    console.log('✅ Game loaded - browser window opened');
    console.log('');
    console.log('='.repeat(60));
    console.log('🎯 MANUAL COMBAT TESTING INSTRUCTIONS:');
    console.log('');
    console.log('1. Click "NEW GAME" (blue button)');
    console.log('2. Choose any faction, enter pilot name');
    console.log('3. Click "CREATE PILOT →"');
    console.log('4. Look for "ENTER EDEN" or "⚔ ENTER SPACE" button');
    console.log('5. Click to enter 3D space combat');
    console.log('6. Wait ~10 seconds for enemies to spawn');
    console.log('7. Left-click to fire at red enemy ships');
    console.log('8. Watch health bars decrease and explosions occur');
    console.log('9. Observe kill counter increase when enemies die');
    console.log('');
    console.log('🎯 PROOF TO LOOK FOR:');
    console.log('   ✅ Enemy health bars decrease when shot');
    console.log('   ✅ Explosion effects when enemy HP reaches 0');
    console.log('   ✅ Enemy ships disappear after death');
    console.log('   ✅ Kill counter increases in HUD');
    console.log('   ✅ Score/credits increase from kills');
    console.log('   ✅ Loot drops appear at death locations');
    console.log('');
    console.log('⏳ Browser will stay open for manual testing...');
    console.log('   Press Ctrl+C in terminal to close when done');
    
    // Keep browser open indefinitely for manual testing
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Failed to open game:', error.message);
  }
}

if (require.main === module) {
  openGameForManualTesting().catch(console.error);
}