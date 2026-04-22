const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function directSpaceEntry() {
  console.log('🎯 DIRECT UI APPROACH: Complete character → Enter space');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
  
  const screenshotDir = 'gameplay_screenshots/direct_entry';
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
    
    // Click NEW GAME
    console.log('📌 Clicking NEW GAME...');
    await page.click('#btn-new');
    await delay(4000);
    await takeShot('character_creation');
    
    // Simple approach - just type in the name field and click create
    console.log('✏️ Typing pilot name directly...');
    
    // Click in the name field area
    await page.click('input'); // Just click any input
    await delay(500);
    await page.keyboard.type('TestPilot');
    await delay(1000);
    await takeShot('name_typed');
    
    // Click CREATE PILOT
    console.log('🔧 Clicking CREATE PILOT...');
    await page.click('text=CREATE PILOT'); // Click by text
    await delay(8000); // Wait for creation
    await takeShot('pilot_created');
    
    // Now we should be in the game - look for bridge
    console.log('🎮 Looking for game interface...');
    await delay(5000);
    
    // Try to find and click ENTER SPACE anywhere
    console.log('🚀 Searching for ENTER SPACE...');
    const enterSpaceText = await page.$('text=ENTER SPACE');
    if (enterSpaceText) {
      console.log('✅ Found ENTER SPACE by text!');
      await enterSpaceText.click();
      await delay(15000); // Long wait for 3D
      await takeShot('space_entered');
      
      // Fire weapons in space
      console.log('⚔️ FIRING WEAPONS IN SPACE!');
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Space');
        await delay(600);
        await takeShot(`space_action_${i + 1}`);
      }
      
    } else {
      // Try other approaches
      console.log('🔍 ENTER SPACE not found by text, trying other methods...');
      
      // Look for any button with "SPACE" in it
      const spaceButtons = await page.$$('button');
      for (let btn of spaceButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('SPACE') || text.includes('ENTER') || text.includes('LAUNCH')) {
          console.log(`✅ Found button with text: ${text}`);
          await btn.click();
          await delay(10000);
          await takeShot('button_clicked');
          break;
        }
      }
    }
    
    console.log(`✅ Process completed: ${shotCounter - 1} screenshots`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await takeShot('error_occurred');
  } finally {
    await browser.close();
  }
}

directSpaceEntry().catch(console.error);