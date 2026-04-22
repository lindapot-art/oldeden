const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureLiveAction() {
  console.log('🚀 Capturing LIVE GAMEPLAY ACTION...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Keep visible to see action
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
  
  // Ensure screenshots directory exists
  const screenshotDir = 'gameplay_screenshots/live_action';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  let shotCounter = 1;
  
  async function takeActionShot(description) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${screenshotDir}/${String(shotCounter).padStart(3, '0')}_${description}_${timestamp}.png`;
    await page.screenshot({ path: filename });
    console.log(`📸 ${description}: ${filename}`);
    shotCounter++;
    return filename;
  }
  
  try {
    // Wait for game to fully load
    await delay(3000);
    await takeActionShot('game_loaded');
    
    // Create character quickly
    const newGameBtn = await page.$('#btn-new');
    if (newGameBtn) {
      await newGameBtn.click();
      await delay(1000);
      
      // Quick character setup
      await page.click('#btn-create-char');
      await delay(500);
      await takeActionShot('character_created');
    }
    
    // Navigate to Bridge first
    try {
      await page.waitForSelector('#nav-bridge', { timeout: 5000 });
      await page.click('#nav-bridge');
      await delay(1500);
      await takeActionShot('bridge_interface');
    } catch (e) {
      console.log('Bridge navigation failed, continuing...');
    }
    
    // NOW ENTER GUNNER MODE FOR LIVE ACTION
    console.log('🎯 ENTERING GUNNER MODE - LIVE COMBAT STARTING...');
    try {
      await page.waitForSelector('#nav-gunner', { timeout: 5000 });
      await page.click('#nav-gunner');
      await delay(5000); // Let 3D scene and enemies initialize
    } catch (e) {
      console.log('Gunner mode entry failed, trying direct approach...');
      // Try alternative - look for any gunner-related button
      const gunnerBtn = await page.$('[id*="gunner"], [onclick*="gunner"], .nav-btn');
      if (gunnerBtn) {
        await gunnerBtn.click();
        await delay(5000);
      }
    }
    
    await takeActionShot('gunner_mode_entered');
    
    // Wait for enemies to spawn and capture action shots
    console.log('⚔️ WAITING FOR ENEMIES TO SPAWN...');
    await delay(5000);
    await takeActionShot('space_view_enemies_spawning');
    
    // Simulate combat - fire weapons multiple times
    console.log('💥 FIRING WEAPONS - LIVE COMBAT...');
    for (let i = 0; i < 8; i++) {
      // Fire weapon (space key or click)
      await page.keyboard.press('Space');
      await delay(800);
      await takeActionShot(`combat_action_${i + 1}`);
      
      // Also try mouse movement for targeting
      if (i % 2 === 0) {
        await page.mouse.move(700, 450); // Center area
        await delay(200);
      }
    }
    
    // Check for mining opportunities
    console.log('⛏️ LOOKING FOR MINING ACTION...');
    await delay(2000);
    
    // Try to deploy mining drone if available
    try {
      const miningBtn = await page.$('#btn-mining-drone');
      if (miningBtn) {
        await miningBtn.click();
        await delay(1000);
        await takeActionShot('mining_drone_deployed');
      }
    } catch (e) {
      console.log('Mining drone not available yet');
    }
    
    // Continue combat action
    console.log('🎮 CONTINUING LIVE GAMEPLAY...');
    for (let i = 0; i < 10; i++) {
      // Movement and combat
      await page.keyboard.press('ArrowLeft');
      await delay(300);
      await page.keyboard.press('Space');
      await delay(500);
      await page.keyboard.press('ArrowRight');
      await delay(300);
      await page.keyboard.press('Space');
      await delay(500);
      
      await takeActionShot(`live_action_sequence_${i + 1}`);
      
      // Check for any UI updates (health, ammo, score changes)
      const scoreElement = await page.$('.score-display');
      if (scoreElement && i % 3 === 0) {
        console.log('📊 Score/status changed - capturing progress');
      }
    }
    
    // Try auto-targeting
    console.log('🎯 TESTING AUTO-TARGET SYSTEM...');
    try {
      const autoTargetBtn = await page.$('#auto-target-btn');
      if (autoTargetBtn) {
        await autoTargetBtn.click();
        await delay(2000);
        await takeActionShot('auto_targeting_active');
      }
    } catch (e) {
      console.log('Auto-target not available');
    }
    
    // Final action shots
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Space');
      await delay(1000);
      await takeActionShot(`final_combat_${i + 1}`);
    }
    
    console.log(`✅ LIVE ACTION CAPTURED: ${shotCounter - 1} screenshots of actual gameplay`);
    
  } catch (error) {
    console.error('❌ Error during live action capture:', error.message);
    await takeActionShot('error_state');
  } finally {
    await browser.close();
  }
}

captureLiveAction().catch(console.error);