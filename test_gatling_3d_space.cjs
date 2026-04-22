const puppeteer = require('puppeteer');

/**
 * 3D SPACE GATLING GUN VERIFICATION TEST
 * Tests actual 3D space combat with gatling guns
 * User frustration justified — previous QA only tested bridge screens
 */

async function test3DSpaceGatlingGuns() {
  console.log('🔥 TESTING ACTUAL 3D SPACE GATLING GUNS');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('→ Loading Old Eden...');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take title screen
    await page.screenshot({ path: 'debug_screenshots/01_title_screen.png' });
    console.log('→ Title screen captured');
    
    // Click NEW GAME
    await page.click('#btn-new');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take character creation screen  
    await page.screenshot({ path: 'debug_screenshots/02_character_creation.png' });
    console.log('→ Character creation captured');
    
    // Complete character creation properly
    console.log('→ Completing character creation...');
    
    // Choose a faction by clicking the first faction card
    await page.waitForSelector('.faction-card', { visible: true });
    await page.click('.faction-card'); // Click first faction card
    console.log('→ Faction selected');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Enter pilot name
    await page.type('#pilot-name', 'TestPilot');
    console.log('→ Pilot name entered');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click CREATE PILOT button
    await page.click('#btn-create-char');
    console.log('→ CREATE PILOT clicked - waiting for bridge...');
    
    // Wait for bridge screen to load (character creation shows bridge screen)
    await page.waitForSelector('#btn-launch', { visible: true, timeout: 10000 });
    console.log('→ Bridge loaded successfully!');
    
    // Take bridge screen
    await page.screenshot({ path: 'debug_screenshots/03_bridge_screen.png' });
    console.log('→ Bridge screen captured');
    
    // **CRITICAL: ENTER 3D SPACE**
    console.log('→ Entering 3D space (WHERE WEAPONS ACTUALLY WORK)...');
    await page.click('#btn-launch');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Allow 3D scene to load
    
    // Take 3D space screenshot  
    await page.screenshot({ path: 'debug_screenshots/04_3d_space_loaded.png' });
    console.log('→ 3D space captured');
    
    // **TEST GATLING GUNS IN 3D SPACE**
    console.log('🔫 TESTING GATLING GUN KEYS IN 3D SPACE...');
    
    // Test key 7 (left gatling gun)
    await page.keyboard.press('7');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'debug_screenshots/05_key7_left_gatling.png' });
    console.log('→ Key 7 (left gatling) tested');
    
    // Test key 8 (right gatling gun)  
    await page.keyboard.press('8');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'debug_screenshots/06_key8_right_gatling.png' });
    console.log('→ Key 8 (right gatling) tested');
    
    // Test key 9 (dual gatling guns)
    await page.keyboard.press('9');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'debug_screenshots/07_key9_dual_gatling.png' });
    console.log('→ Key 9 (dual gatling) tested');
    
    // Test mouse clicking for gatling fire
    console.log('🖱️ TESTING MOUSE GATLING FIRE...');
    await page.mouse.click(640, 450); // Center click
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'debug_screenshots/08_mouse_gatling_fire.png' });
    console.log('→ Mouse gatling fire tested');
    
    // Hold mouse for continuous fire
    await page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 2000));  
    await page.screenshot({ path: 'debug_screenshots/09_continuous_gatling.png' });
    await page.mouse.up();
    console.log('→ Continuous gatling fire tested');
    
    console.log('✅ 3D SPACE GATLING TEST COMPLETE');
    console.log('📸 Screenshots saved to debug_screenshots/');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await page.screenshot({ path: 'debug_screenshots/ERROR_state.png' });
  }
  
  await browser.close();
}

// Run the test
test3DSpaceGatlingGuns().catch(console.error);