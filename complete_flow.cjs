const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function completeCharacterCreation() {
  console.log('🎯 CAREFUL CHARACTER CREATION → ENTER SPACE → REAL COMBAT');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
  
  const screenshotDir = 'gameplay_screenshots/complete_flow';
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
    console.log('📌 STEP 1: Clicking NEW GAME...');
    await page.click('#btn-new');
    await delay(4000);
    await takeShot('new_game_clicked');
    
    // STEP 2: CAREFULLY complete character creation
    console.log('📌 STEP 2: Completing character creation CAREFULLY...');
    
    // Faction should already be selected (Hegemony Vanguard)
    // Focus on name field and enter name
    console.log('✏️ Entering pilot name...');
    const nameField = await page.$('input[placeholder*="pilot"], input[type="text"], #pilot-name');
    if (nameField) {
      await nameField.click(); // Focus the field
      await delay(500);
      await nameField.type('SpacePilot', { delay: 100 }); // Type slowly
      await delay(1000);
    } else {
      // Try alternative approach
      await page.keyboard.press('Tab'); // Tab to name field
      await delay(500);
      await page.keyboard.type('SpacePilot', { delay: 100 });
    }
    
    await takeShot('name_entered');
    
    // STEP 3: Click CREATE PILOT button
    console.log('🔧 Clicking CREATE PILOT...');
    const createBtn = await page.$('#btn-create-pilot, button:contains("CREATE PILOT"), .btn:contains("CREATE")');
    if (createBtn) {
      await createBtn.click();
      console.log('✅ CREATE PILOT clicked');
    } else {
      // Find button by text content
      const buttons = await page.$$('button');
      for (let btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('CREATE') || text.includes('PILOT')) {
          await btn.click();
          console.log('✅ Found CREATE button by text');
          break;
        }
      }
    }
    
    // WAIT for character creation to complete
    console.log('⏳ Waiting for character creation to process...');
    await delay(8000);
    await takeShot('character_created');
    
    // STEP 4: Look for bridge/game interface
    console.log('📌 STEP 4: Looking for bridge interface...');
    await delay(3000);
    
    // Check if we're now on bridge/game screen
    const bridgeElements = await page.$$('#nav-bridge, #bridge-launch, .nav-btn');
    if (bridgeElements.length > 0) {
      console.log('✅ Reached bridge interface!');
      await takeShot('bridge_interface');
      
      // STEP 5: Find and click ENTER SPACE
      console.log('🚀 Looking for ENTER SPACE button...');
      
      const enterSpaceBtn = await page.$('#btn-launch');
      if (enterSpaceBtn) {
        console.log('✅ Found ENTER SPACE button!');
        await enterSpaceBtn.click();
        
        // WAIT for 3D space to load
        console.log('⏳ Waiting for 3D space to initialize...');
        await delay(12000);
        await takeShot('entering_space');
        
        // STEP 6: REAL SPACE COMBAT!
        console.log('⚔️ REAL SPACE COMBAT STARTING!');
        
        for (let i = 0; i < 20; i++) {
          // Fire weapons
          await page.keyboard.press('Space');
          await delay(400);
          
          // Movement
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
          
          await delay(500);
          await takeShot(`space_combat_${i + 1}`);
          
          // Additional combat actions
          if (i % 5 === 0) {
            await page.keyboard.press('Tab'); // Target next
          }
        }
        
        console.log(`✅ SPACE COMBAT SUCCESS: ${shotCounter - 1} screenshots captured!`);
        
      } else {
        console.log('❌ ENTER SPACE button not found on bridge');
        await takeShot('no_enter_space_button');
      }
      
    } else {
      console.log('❌ Bridge interface not reached');
      await takeShot('not_on_bridge');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await takeShot('error_state');
  } finally {
    await browser.close();
  }
}

completeCharacterCreation().catch(console.error);