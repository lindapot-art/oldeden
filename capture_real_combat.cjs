const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureRealCombat() {
  console.log('⚔️ Capturing ACTUAL LIVE COMBAT & SPACE ACTION...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Keep visible to see action
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
  
  // Ensure screenshots directory exists
  const screenshotDir = 'gameplay_screenshots/live_combat';
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
    await delay(2000);
    await takeActionShot('title_screen');
    
    // ═══ COMPLETE CHARACTER CREATION ═══
    console.log('👤 Creating character...');
    await page.click('#btn-new');
    await delay(2000);
    await page.click('#btn-create-char');
    await delay(2000);
    
    // Select faction (click first faction card)
    try {
      const factionCard = await page.$('.faction-card');
      if (factionCard) {
        await factionCard.click();
        await delay(1000);
      }
    } catch (e) {
      console.log('Faction selection failed, continuing...');
    }
    
    // Enter pilot name
    try {
      await page.type('input', 'CombatPilot');
      await delay(500);
    } catch (e) {
      console.log('Name entry failed, continuing...');
    }
    
    // Create pilot - try multiple approaches
    let pilotCreated = false;
    const createSelectors = [
      'button[onclick*="createPilot"]',
      '#create-pilot-btn',
      '#btn-create-pilot',
      'button:last-of-type'
    ];
    
    for (const selector of createSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          pilotCreated = true;
          console.log(`✅ Pilot created with: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // If all else fails, press Enter
    if (!pilotCreated) {
      await page.keyboard.press('Enter');
      console.log('Tried Enter key for pilot creation');
    }
    
    await delay(4000);
    
    await takeActionShot('character_created');
    
    // ═══ ENTER GUNNER MODE FOR LIVE COMBAT ═══
    console.log('🚀 Entering gunner mode for live space combat...');
    
    // Wait for navigation to be available, try multiple selectors
    let gunnerEntered = false;
    const gunnerSelectors = [
      '#nav-gunner',
      '[onclick*="gunner"]', 
      'button:contains("GUNNER")',
      '.nav-btn[data-target="gunner"]'
    ];
    
    for (const selector of gunnerSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          console.log(`✅ Gunner mode entered via: ${selector}`);
          gunnerEntered = true;
          break;
        }
      } catch (e) {
        console.log(`❌ Failed selector: ${selector}`);
      }
    }
    
    if (!gunnerEntered) {
      // Try pressing G key (common gunner hotkey)
      await page.keyboard.press('g');
      await delay(1000);
      await page.keyboard.press('G');
      console.log('Tried hotkey approach');
    }
    
    // Let 3D scene initialize and enemies spawn
    await delay(8000);
    await takeActionShot('gunner_mode_3d_space');
    
    // ═══ LIVE COMBAT SEQUENCE ═══
    console.log('💥 STARTING LIVE COMBAT - WEAPONS HOT!');
    
    // Combat action loop - fire weapons and move
    for (let combat = 0; combat < 15; combat++) {
      // Fire primary weapons
      await page.keyboard.press('Space');
      await delay(300);
      
      // Move and maneuver
      const moves = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      await page.keyboard.press(randomMove);
      
      await delay(500);
      await takeActionShot(`combat_action_${combat + 1}`);
      
      // Try secondary systems every few shots
      if (combat % 3 === 0) {
        await page.keyboard.press('r'); // Reload
        await delay(200);
      }
      
      if (combat % 5 === 0) {
        await page.keyboard.press('Tab'); // Target cycle
        await delay(200);
      }
    }
    
    // ═══ MINING OPERATIONS ═══
    console.log('⛏️ TESTING MINING SYSTEMS...');
    
    // Look for mining controls
    try {
      const miningBtn = await page.$('#btn-mining-drone, [onclick*="mining"], button:contains("MINE")');
      if (miningBtn) {
        await miningBtn.click();
        await delay(2000);
        await takeActionShot('mining_operation_active');
      }
    } catch (e) {
      console.log('Mining interface not found, continuing combat...');
    }
    
    // ═══ ADVANCED COMBAT MANEUVERS ═══
    console.log('🎯 Advanced combat maneuvers...');
    
    for (let i = 0; i < 10; i++) {
      // Combat combinations
      await page.keyboard.press('Space'); // Fire
      await page.keyboard.press('w'); // Forward thrust
      await delay(200);
      await page.keyboard.press('a'); // Strafe left
      await delay(200);
      await page.keyboard.press('Space'); // Fire again
      await page.keyboard.press('d'); // Strafe right
      await delay(300);
      
      await takeActionShot(`advanced_maneuver_${i + 1}`);
      
      // Try boost/special abilities
      if (i % 3 === 0) {
        await page.keyboard.press('Shift'); // Boost
        await delay(100);
      }
    }
    
    // ═══ UI INTERACTION TESTS ═══
    console.log('🖱️ Testing UI interactions during combat...');
    
    // Try clicking on screen areas for targeting
    await page.mouse.click(700, 400); // Center screen
    await delay(500);
    await takeActionShot('manual_targeting');
    
    await page.mouse.click(800, 300); // Upper right
    await delay(500);
    await takeActionShot('target_acquisition');
    
    // Final combat burst
    console.log('💀 FINAL COMBAT SEQUENCE!');
    for (let final = 0; final < 8; final++) {
      await page.keyboard.press('Space');
      await delay(250);
      await takeActionShot(`final_combat_${final + 1}`);
    }
    
    console.log(`✅ REAL COMBAT CAPTURED: ${shotCounter - 1} screenshots of live space combat action!`);
    
  } catch (error) {
    console.error('❌ Error during combat capture:', error.message);
    await takeActionShot('combat_error_state');
  } finally {
    await browser.close();
  }
}

captureRealCombat().catch(console.error);