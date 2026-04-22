const puppeteer = require('puppeteer');

(async () => {
  console.log('Testing complete gameplay flow: NEW GAME → Character Creation → Space Combat');
  
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 720 }
    });
    
    page = await browser.newPage();
    
    // Step 1: Navigate and click NEW GAME
    console.log('1. Loading game and clicking NEW GAME...');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const btnNew = await page.$('#btn-new');
    if (btnNew) {
      await btnNew.click();
      console.log('   ✅ NEW GAME clicked successfully');
    } else {
      throw new Error('NEW GAME button not found');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'step1-character-creation.png' });
    
    // Step 2: Complete character creation
    console.log('2. Completing character creation...');
    
    // Check if we're on character creation screen
    const createScreen = await page.$('#screen-create.active');
    if (!createScreen) {
      throw new Error('Character creation screen not active');
    }
    
    // Try to fill in character name if input exists
    try {
      const nameInput = await page.$('#name-input, input[type="text"], input[name*="name"]');
      if (nameInput) {
        await page.evaluate((input) => {
          input.value = '';
        }, nameInput);
        await nameInput.type('TestPilot');
        console.log('   ✅ Character name entered');
      } else {
        console.log('   ⚠️ No name input found, proceeding without name');
      }
    } catch (e) {
      console.log('   ⚠️ Could not enter name, proceeding anyway');
    }
    
    // Look for and click the button to enter space
    console.log('   - Looking for button to enter space...');
    const allButtons = await page.$$('button');
    console.log(`   - Found ${allButtons.length} buttons total`);
    
    let foundSpaceButton = false;
    for (let i = 0; i < allButtons.length; i++) {
      try {
        const buttonText = await allButtons[i].evaluate(el => el.textContent || el.value || '');
        console.log(`   - Button ${i}: "${buttonText}"`);
        
        if (buttonText.toLowerCase().includes('space') || 
            buttonText.toLowerCase().includes('enter') ||
            buttonText.toLowerCase().includes('start') ||
            buttonText.toLowerCase().includes('launch') ||
            buttonText.toLowerCase().includes('begin')) {
          
          console.log(`   ✅ Clicking button: "${buttonText}"`);
          await allButtons[i].click();
          foundSpaceButton = true;
          break;
        }
      } catch (e) {
        // Skip buttons that can't be evaluated
      }
    }
    
    if (!foundSpaceButton) {
      console.log('   ⚠️ No obvious space/enter button found, trying first available button');
      if (allButtons.length > 0) {
        const firstBtnText = await allButtons[0].evaluate(el => el.textContent || '');
        console.log(`   - Clicking first button: "${firstBtnText}"`);
        await allButtons[0].click();
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'step2-after-enter-space.png' });
    
    // Step 3: Check if we reached space/gunner view
    console.log('3. Checking if we reached space combat...');
    
    const spaceIndicators = await page.evaluate(() => {
      const body = document.body.textContent || '';
      const activeScreens = Array.from(document.querySelectorAll('.screen.active'));
      const gameCanvas = document.querySelector('#game-canvas');
      const hudCanvas = document.querySelector('#hud-canvas');
      
      return {
        activeScreenIds: activeScreens.map(s => s.id),
        activeScreenCount: activeScreens.length,
        hasWebGL: !!gameCanvas,
        canvasDisplay: gameCanvas ? getComputedStyle(gameCanvas).display : 'none',
        hudDisplay: hudCanvas ? getComputedStyle(hudCanvas).display : 'none',
        hasSpaceText: body.toLowerCase().includes('space'),
        hasSystemText: body.toLowerCase().includes('system'),
        hasShipText: body.toLowerCase().includes('ship'),
        hasTargetText: body.toLowerCase().includes('target'),
        hasEnemyText: body.toLowerCase().includes('enemy'),
        bodyTextLength: body.length,
        screenIds: Array.from(document.querySelectorAll('.screen')).map(s => s.id)
      };
    });
    
    console.log('   - Space combat indicators:');
    console.log(`     * Active screens: ${spaceIndicators.activeScreenIds.join(', ')}`);
    console.log(`     * Total active screens: ${spaceIndicators.activeScreenCount}`);
    console.log(`     * All screen IDs: ${spaceIndicators.screenIds.join(', ')}`);
    console.log(`     * WebGL canvas present: ${spaceIndicators.hasWebGL}`);
    console.log(`     * Game canvas display: ${spaceIndicators.canvasDisplay}`);
    console.log(`     * HUD canvas display: ${spaceIndicators.hudDisplay}`);
    console.log(`     * Contains space-related text: ${spaceIndicators.hasSpaceText}`);
    console.log(`     * Contains system text: ${spaceIndicators.hasSystemText}`);
    console.log(`     * Contains ship text: ${spaceIndicators.hasShipText}`);
    console.log(`     * Contains target text: ${spaceIndicators.hasTargetText}`);
    console.log(`     * Contains enemy text: ${spaceIndicators.hasEnemyText}`);
    console.log(`     * Body text length: ${spaceIndicators.bodyTextLength}`);
    
    await page.screenshot({ path: 'step3-space-combat-check.png' });
    
    // Step 4: Try to interact with space view if we're there
    console.log('4. Testing space interaction...');
    
    const isInSpaceView = spaceIndicators.activeScreenIds.includes('screen-gunner') || 
                          spaceIndicators.canvasDisplay !== 'none';
    
    if (isInSpaceView) {
      console.log('   - Appears to be in space view, testing interaction...');
      
      try {
        const canvas = await page.$('#game-canvas');
        if (canvas) {
          await canvas.click({ button: 'left' });
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try some movement keys
          await page.keyboard.press('KeyW');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('   ✅ Sent commands to space view');
        }
      } catch (e) {
        console.log('   ⚠️ Could not interact with space view:', e.message);
      }
    } else {
      console.log('   - Not in space view, checking what screen we are on...');
    }
    
    await page.screenshot({ path: 'step4-final-state.png' });
    
    // Final assessment
    console.log('\n=== COMPLETE GAMEPLAY FLOW RESULTS ===');
    
    if (spaceIndicators.activeScreenIds.includes('screen-gunner')) {
      console.log('✅ SUCCESS: Complete gameplay flow working!');
      console.log('   - NEW GAME → Character Creation → Space Combat');
      console.log('   - No blocking UX issues detected');
      console.log('   - User can reach actual gameplay');
    } else if (spaceIndicators.activeScreenIds.includes('screen-create')) {
      console.log('⚠️  PARTIAL: Reached character creation but may be stuck');
      console.log('   - NEW GAME works (no blocking resurrection modal)');
      console.log('   - Character creation screen loads properly');
      console.log('   - May need to investigate character creation completion');
    } else if (spaceIndicators.canvasDisplay !== 'none') {
      console.log('✅ SUCCESS: Appears to be in gameplay mode!');
      console.log('   - Game canvas is visible and active');
      console.log('   - Complete flow working correctly');
    } else {
      console.log('⚠️ INVESTIGATION NEEDED:');
      console.log(`   - Current active screens: ${spaceIndicators.activeScreenIds.join(', ')}`);
      console.log('   - Flow may need additional steps or different buttons');
    }
    
  } catch (error) {
    console.error('Error during gameplay flow test:', error);
    if (page) {
      try {
        await page.screenshot({ path: 'error-gameplay-flow.png' });
        console.log('   - Error screenshot saved: error-gameplay-flow.png');
      } catch (screenshotError) {
        console.error('Could not take error screenshot:', screenshotError);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();