const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixResurrectionMenu() {
  console.log('🎯 FIXING RESURRECTION MENU → ENTER EDEN → REAL GAMEPLAY');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
  
  const screenshotDir = 'gameplay_screenshots/fixed_flow';
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
    await takeShot('title_screen');
    
    // STEP 1: Click NEW GAME
    console.log('📌 STEP 1: Click NEW GAME...');
    await page.click('#btn-new');
    await delay(4000);
    await takeShot('resurrection_menu_blocking');
    
    // STEP 2: Click "ENTER EDEN" to dismiss the blocking resurrection menu
    console.log('🚪 STEP 2: Click ENTER EDEN to dismiss resurrection menu...');
    await page.click('#btn-enter-eden');
    await delay(3000);
    await takeShot('resurrection_menu_dismissed');
    
    // STEP 3: Now complete character creation
    console.log('👤 STEP 3: Complete character creation...');
    
    // Enter pilot name
    await page.keyboard.press('Tab'); // Tab to name field
    await delay(500);
    await page.keyboard.type('SpacePilot', { delay: 100 });
    await delay(1000);
    await takeShot('pilot_name_entered');
    
    // Click CREATE PILOT
    await page.keyboard.press('Tab'); // Tab to CREATE button
    await delay(500);
    await page.keyboard.press('Enter'); // Press CREATE
    await delay(6000); // Wait for character creation
    await takeShot('character_creation_complete');
    
    // STEP 4: Now look for ENTER SPACE
    console.log('🚀 STEP 4: Looking for ENTER SPACE...');
    await delay(3000);
    await takeShot('looking_for_enter_space');
    
    // Try to find ENTER SPACE button
    const enterSpaceBtn = await page.$('#btn-launch');
    if (enterSpaceBtn) {
      console.log('✅ Found ENTER SPACE button!');
      await enterSpaceBtn.click();
      
      // WAIT for 3D space to load
      console.log('⏳ Loading 3D space...');
      await delay(15000);
      await takeShot('space_loaded');
      
      // STEP 5: REAL SPACE COMBAT!
      console.log('⚔️ REAL SPACE COMBAT!');
      
      for (let i = 0; i < 20; i++) {
        // Fire weapons
        await page.keyboard.press('Space');
        await delay(300);
        
        // Movement
        const moves = ['w', 'a', 's', 'd'];
        await page.keyboard.press(moves[i % 4]);
        
        await delay(400);
        await takeShot(`space_combat_${i + 1}`);
        
        // Special actions
        if (i % 5 === 0) {
          await page.keyboard.press('Tab'); // Target
        }
        if (i % 7 === 0) {
          await page.keyboard.press('r'); // Reload
        }
      }
      
      console.log(`✅ SUCCESS: Real space combat captured!`);
      
    } else {
      console.log('❌ ENTER SPACE button still not found');
      
      // Try keyboard navigation to find it
      console.log('🔍 Trying keyboard navigation...');
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await delay(500);
        await takeShot(`tab_search_${i + 1}`);
        await page.keyboard.press('Enter');
        await delay(2000);
        await takeShot(`enter_attempt_${i + 1}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await takeShot('error_state');
  } finally {
    await browser.close();
  }
}

fixResurrectionMenu().catch(console.error);