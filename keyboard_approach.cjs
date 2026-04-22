const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function keyboardApproach() {
  console.log('⌨️ KEYBOARD ONLY APPROACH - No clicking');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0' });
  
  const screenshotDir = 'gameplay_screenshots/keyboard_approach';
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
    
    // Click NEW GAME (this works)
    console.log('📌 Clicking NEW GAME...');
    await page.click('#btn-new');
    await delay(4000);
    await takeShot('character_creation');
    
    // Use Tab to navigate to name field, then type
    console.log('⌨️ Using keyboard navigation...');
    await page.keyboard.press('Tab'); // Tab to first focusable element
    await delay(500);
    await page.keyboard.press('Tab'); // Tab to next element  
    await delay(500);
    await page.keyboard.press('Tab'); // Tab to next element
    await delay(500);
    await takeShot('tabbed_navigation');
    
    // Type the pilot name
    console.log('✏️ Typing pilot name...');
    await page.keyboard.type('SpacePilot', { delay: 100 });
    await delay(1000);
    await takeShot('name_entered');
    
    // Press Enter or Tab to CREATE button, then press Enter
    console.log('🔧 Navigating to CREATE button...');
    await page.keyboard.press('Tab');
    await delay(500);
    await page.keyboard.press('Tab');
    await delay(500);
    await page.keyboard.press('Enter'); // Press CREATE PILOT
    await delay(8000); // Wait for character creation
    await takeShot('character_created');
    
    // Now look for space entry
    console.log('🚀 Looking for space entry options...');
    await delay(5000);
    await takeShot('after_creation');
    
    // Try various keyboard shortcuts that might launch space
    console.log('⌨️ Trying space launch shortcuts...');
    const shortcuts = ['Enter', 'Space', 'g', 'l', 'F1'];
    
    for (let key of shortcuts) {
      console.log(`Trying key: ${key}`);
      await page.keyboard.press(key);
      await delay(2000);
      await takeShot(`tried_${key}`);
    }
    
    // Try Tab navigation to find launch button
    console.log('🔍 Tab navigation to find launch...');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      await delay(500);
      await takeShot(`tab_${i + 1}`);
      
      // Try pressing Enter on each tabbed element
      await page.keyboard.press('Enter');
      await delay(2000);
      await takeShot(`enter_on_tab_${i + 1}`);
    }
    
    console.log(`✅ Keyboard approach completed: ${shotCounter - 1} screenshots`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await takeShot('keyboard_error');
  } finally {
    await browser.close();
  }
}

keyboardApproach().catch(console.error);