const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function actualSpaceCombat() {
  console.log('🎯 PROPER FLOW: NEW GAME → ENTER SPACE → REAL COMBAT');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
  
  const screenshotDir = 'gameplay_screenshots/actual_space';
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
    
    // STEP 1: Click "NEW GAME" and WAIT
    console.log('📌 STEP 1: Clicking NEW GAME...');
    await page.click('#btn-new');
    await delay(5000); // Wait longer for UI to respond
    await takeShot('after_new_game_click');
    
    // STEP 2: Complete any character creation quickly
    console.log('📌 STEP 2: Completing character creation...');
    try {
      // Create character button if available
      const createBtn = await page.$('#btn-create-char');
      if (createBtn) {
        await createBtn.click();
        await delay(3000);
        await takeShot('character_creation_started');
        
        // Quick character setup
        try {
          const factionCards = await page.$$('.faction-card');
          if (factionCards.length > 0) {
            await factionCards[0].click(); // Click first faction
            await delay(1000);
          }
        } catch (e) { console.log('Faction selection skipped'); }
        
        // Enter name and create
        try {
          const nameInput = await page.$('input');
          if (nameInput) {
            await nameInput.type('TestPilot');
            await delay(500);
          }
        } catch (e) { console.log('Name entry skipped'); }
        
        // Find CREATE button
        const createPilotBtn = await page.$('button[onclick*="createPilot"]');
        if (createPilotBtn) {
          await createPilotBtn.click();
          await delay(5000); // Wait for character creation to complete
        } else {
          await page.keyboard.press('Enter'); // Fallback
          await delay(5000);
        }
      }
    } catch (e) {
      console.log('Character creation handled or skipped');
    }
    
    await takeShot('character_creation_complete');
    
    // STEP 3: Look for "ENTER SPACE" button - wait longer!
    console.log('📌 STEP 3: Looking for ENTER SPACE button...');
    await delay(8000); // Wait even longer for UI to stabilize
    
    let enterSpaceFound = false;
    const spaceButtonSelectors = [
      '#btn-launch',
      'button:contains("ENTER SPACE")',
      'button:contains("SPACE")',
      '#bridge-launch button',
      '[onclick*="gunner"]',
      'button[onclick*="launch"]'
    ];
    
    for (let attempt = 0; attempt < 3 && !enterSpaceFound; attempt++) {
      console.log(`🔍 Attempt ${attempt + 1}: Searching for ENTER SPACE...`);
      
      for (const selector of spaceButtonSelectors) {
        try {
          const spaceBtn = await page.$(selector);
          if (spaceBtn) {
            console.log(`✅ Found ENTER SPACE: ${selector}`);
            await spaceBtn.click();
            enterSpaceFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!enterSpaceFound) {
        await delay(5000); // Wait more and try again
        await takeShot(`search_attempt_${attempt + 1}`);
      }
    }
    
    if (!enterSpaceFound) {
      console.log('🔧 No ENTER SPACE found, trying navigation approach...');
      // Try navigating to bridge first, then gunner
      try {
        await page.click('#nav-bridge');
        await delay(3000);
        await takeShot('bridge_screen');
        
        // Now look for launch button
        const launchBtn = await page.$('#btn-launch');
        if (launchBtn) {
          await launchBtn.click();
          enterSpaceFound = true;
        }
      } catch (e) {
        console.log('Bridge navigation failed');
      }
    }
    
    // STEP 4: Wait for 3D space to initialize
    if (enterSpaceFound) {
      console.log('🚀 ENTERING 3D SPACE - WAITING FOR INITIALIZATION...');
      await delay(15000); // Long wait for 3D engine
      await takeShot('space_initialized');
      
      // STEP 5: REAL SPACE COMBAT
      console.log('⚔️ REAL SPACE COMBAT STARTING!');
      
      for (let i = 0; i < 25; i++) {
        // Fire weapons
        await page.keyboard.press('Space');
        await delay(300);
        
        // Movement
        const movements = ['w', 's', 'a', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        const move = movements[i % movements.length];
        await page.keyboard.press(move);
        
        await delay(400);
        await takeShot(`real_combat_${i + 1}`);
        
        // Special actions
        if (i % 4 === 0) {
          await page.keyboard.press('Tab'); // Target
        }
        if (i % 6 === 0) {
          await page.keyboard.press('r'); // Reload
        }
      }
      
      console.log(`✅ REAL SPACE COMBAT CAPTURED: ${shotCounter - 1} screenshots!`);
      
    } else {
      console.log('❌ Could not find ENTER SPACE button');
      await takeShot('enter_space_not_found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await takeShot('error_occurred');
  } finally {
    await browser.close();
  }
}

actualSpaceCombat().catch(console.error);