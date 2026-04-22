const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureRealSpaceCombat() {
  console.log('🚀 DIRECT APPROACH - ENTERING ACTUAL SPACE COMBAT...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
  
  const screenshotDir = 'gameplay_screenshots/space_combat';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  let shotCounter = 1;
  
  async function takeShot(description) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${screenshotDir}/${String(shotCounter).padStart(3, '0')}_${description}_${timestamp}.png`;
    await page.screenshot({ path: filename });
    console.log(`📸 ${description}: ${filename}`);
    shotCounter++;
    return filename;
  }
  
  try {
    await delay(3000);
    await takeShot('game_loaded');
    
    // SKIP CHARACTER CREATION - Go directly to bridge if possible
    console.log('🎯 Attempting direct bridge access...');
    
    // Try clicking "CONTINUE" first to bypass character creation
    try {
      const continueBtn = await page.$('#btn-continue, button:contains("CONTINUE")');
      if (continueBtn) {
        await continueBtn.click();
        await delay(2000);
        console.log('✅ Used CONTINUE button');
      }
    } catch (e) {
      console.log('Continue not available, trying other approaches...');
    }
    
    // Wait longer for any loading/navigation
    await delay(3000);
    await takeShot('after_continue_attempt');
    
    // FIND THE "ENTER SPACE" LAUNCH BUTTON
    console.log('🔍 Looking for ENTER SPACE button...');
    
    const spaceSelectors = [
      '#btn-launch',              // Direct button ID
      'button:contains("ENTER SPACE")', 
      '[onclick*="gunner"]',
      'button:contains("SPACE")',
      '#bridge-launch button'     // Button in bridge launch container
    ];
    
    let spaceEntered = false;
    for (const selector of spaceSelectors) {
      try {
        const spaceBtn = await page.$(selector);
        if (spaceBtn) {
          console.log(`🚀 Found ENTER SPACE button: ${selector}`);
          await spaceBtn.click();
          spaceEntered = true;
          break;
        }
      } catch (e) {
        console.log(`❌ Space selector failed: ${selector}`);
      }
    }
    
    if (!spaceEntered) {
      console.log('🔧 Trying keyboard shortcuts for space...');
      await page.keyboard.press('Enter');
      await delay(500);
      await page.keyboard.press(' '); // Space key
      await delay(500);
      await page.keyboard.press('g'); // Gunner hotkey
    }
    
    // WAIT FOR SPACE/3D SCENE TO LOAD
    await delay(10000); // Give time for 3D engine to initialize
    await takeShot('space_entry_attempt');
    
    // NOW CAPTURE LIVE SPACE COMBAT
    console.log('⚔️ CAPTURING LIVE SPACE COMBAT!');
    
    for (let i = 0; i < 20; i++) {
      // Fire weapons continuously
      await page.keyboard.press('Space');
      await delay(200);
      
      // Movement in 3D space
      if (i % 2 === 0) {
        await page.keyboard.press('w'); // Forward
      } else {
        await page.keyboard.press('s'); // Backward  
      }
      
      if (i % 3 === 0) {
        await page.keyboard.press('a'); // Left
      } else {
        await page.keyboard.press('d'); // Right
      }
      
      await delay(300);
      await takeShot(`space_combat_${i + 1}`);
      
      // Target cycling and special abilities
      if (i % 4 === 0) {
        await page.keyboard.press('Tab'); // Target next enemy
      }
      
      if (i % 6 === 0) {
        await page.keyboard.press('r'); // Reload
      }
    }
    
    // Test mouse targeting
    console.log('🎯 Testing mouse targeting in 3D space...');
    for (let m = 0; m < 8; m++) {
      await page.mouse.move(400 + m * 100, 300 + m * 50);
      await page.mouse.click(400 + m * 100, 300 + m * 50);
      await delay(400);
      await page.keyboard.press('Space'); // Fire at target
      await delay(200);
      await takeShot(`mouse_targeting_${m + 1}`);
    }
    
    console.log(`✅ SPACE COMBAT CAPTURED: ${shotCounter - 1} screenshots!`);
    
  } catch (error) {
    console.error('❌ Space combat error:', error.message);
    await takeShot('space_error');
  } finally {
    await browser.close();
  }
}

captureRealSpaceCombat().catch(console.error);