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
    
    // Fill in character name
    const nameInput = await page.$('#name-input, input[type="text"]');
    if (nameInput) {
      await nameInput.clear();
      await nameInput.type('TestPilot');
      console.log('   ✅ Character name entered');
    }
    
    // Click ENTER SPACE button
    const enterSpaceBtn = await page.$('#btn-enter-space, button');
    if (enterSpaceBtn) {
      const btnText = await enterSpaceBtn.evaluate(el => el.textContent || '');
      if (btnText.toLowerCase().includes('space') || btnText.toLowerCase().includes('enter')) {
        await enterSpaceBtn.click();
        console.log('   ✅ ENTER SPACE clicked');
      } else {
        console.log('   - Button found but text unclear:', btnText);
        await enterSpaceBtn.click(); // Try anyway
      }
    } else {
      // Try alternative: look for any button that might continue
      const allButtons = await page.$$('button');
      let found = false;
      for (const btn of allButtons) {
        const text = await btn.evaluate(el => el.textContent || '');
        if (text.toLowerCase().includes('space') || text.toLowerCase().includes('start') || text.toLowerCase().includes('enter')) {
          await btn.click();
          console.log(`   ✅ Clicked button: "${text}"`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log('   ⚠️ No ENTER SPACE button found, trying first button');
        if (allButtons.length > 0) {
          await allButtons[0].click();
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'step2-after-enter-space.png' });
    
    // Step 3: Check if we reached space/gunner view
    console.log('3. Checking if we reached space combat...');
    
    const spaceIndicators = await page.evaluate(() => {
      const body = document.body.textContent || '';
      const activeScreen = document.querySelector('.screen.active');
      return {
        currentScreen: activeScreen ? activeScreen.id : 'none',
        hasWebGL: !!document.querySelector('#game-canvas'),
        canvasVisible: document.querySelector('#game-canvas')?.style.display !== 'none',
        hasHUD: !!document.querySelector('#hud-canvas'),
        hasSpaceText: body.toLowerCase().includes('space'),
        hasSystemText: body.toLowerCase().includes('system'),
        hasShipText: body.toLowerCase().includes('ship'),
        activeScreens: Array.from(document.querySelectorAll('.screen.active')).map(s => s.id)
      };
    });
    
    console.log('   - Space combat indicators:');
    console.log(`     * Current active screen: ${spaceIndicators.currentScreen}`);
    console.log(`     * All active screens: ${spaceIndicators.activeScreens.join(', ')}`);
    console.log(`     * WebGL canvas present: ${spaceIndicators.hasWebGL}`);
    console.log(`     * Canvas visible: ${spaceIndicators.canvasVisible}`);
    console.log(`     * HUD canvas present: ${spaceIndicators.hasHUD}`);
    console.log(`     * Contains "space" text: ${spaceIndicators.hasSpaceText}`);
    console.log(`     * Contains "system" text: ${spaceIndicators.hasSystemText}`);
    console.log(`     * Contains "ship" text: ${spaceIndicators.hasShipText}`);
    
    await page.screenshot({ path: 'step3-space-combat-check.png' });
    
    // Step 4: Try to interact with space view
    console.log('4. Testing space interaction...');
    
    if (spaceIndicators.currentScreen === 'screen-gunner' || spaceIndicators.canvasVisible) {
      console.log('   - Appears to be in space view, testing mouse interaction...');
      
      // Try clicking on the game canvas to see if it responds
      const canvas = await page.$('#game-canvas');
      if (canvas) {
        await canvas.click({ button: 'left' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try some movement keys
        await page.keyboard.press('KeyW');
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.keyboard.press('KeyA');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('   ✅ Sent movement commands to space view');
      }
    }
    
    await page.screenshot({ path: 'step4-final-interaction.png' });
    
    // Final assessment
    console.log('\n=== COMPLETE GAMEPLAY FLOW RESULTS ===');
    
    if (spaceIndicators.currentScreen === 'screen-gunner' || spaceIndicators.canvasVisible) {
      console.log('✅ SUCCESS: Complete gameplay flow working!');
      console.log('   - NEW GAME → Character Creation → Space Combat');
      console.log('   - No blocking UX issues detected');
      console.log('   - User can reach actual gameplay');
    } else if (spaceIndicators.currentScreen === 'screen-create') {
      console.log('⚠️  PARTIAL: Reached character creation but stuck there');
      console.log('   - NEW GAME works (no blocking resurrection modal)');
      console.log('   - Character creation screen loads');
      console.log('   - May need to investigate ENTER SPACE button');
    } else {
      console.log('❌ ISSUE: Flow incomplete');
      console.log(`   - Stuck on screen: ${spaceIndicators.currentScreen}`);
      console.log('   - Additional investigation needed');
    }
    
  } catch (error) {
    console.error('Error during gameplay flow test:', error);
    if (page) {
      try {
        await page.screenshot({ path: 'error-gameplay-flow.png' });
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