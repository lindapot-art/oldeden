const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting NEW GAME flow test...');
  
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1280, height: 720 }
    });
    
    page = await browser.newPage();
    
    // Step 1: Navigate to the game
    console.log('1. Navigating to http://localhost:3847');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2' });
    
    // Wait a moment for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take initial screenshot
    await page.screenshot({ path: 'main-menu.png' });
    console.log('   - Screenshot saved: main-menu.png');
    
    // Step 2: Look for NEW GAME button and click it
    console.log('2. Looking for NEW GAME button...');
    
    // Try to find the NEW GAME button
    let foundNewGame = false;
    
    // First try by ID
    try {
      const btnNew = await page.$('#btn-new');
      if (btnNew) {
        console.log('   - Found NEW GAME button by ID: btn-new');
        await btnNew.click();
        foundNewGame = true;
      }
    } catch (e) {
      console.log('   - No button with ID btn-new found');
    }
    
    if (!foundNewGame) {
      // Try alternative selectors to find NEW GAME button
      const allButtons = await page.$$('button, input[type="button"], input[type="submit"], .button');
      console.log(`   - Found ${allButtons.length} potential buttons`);
      
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const buttonText = await allButtons[i].evaluate(el => el.textContent || el.value || '');
          console.log(`   - Button ${i}: "${buttonText}"`);
          if (buttonText.toLowerCase().includes('new') && (buttonText.toLowerCase().includes('game') || buttonText.toLowerCase().includes('char'))) {
            console.log('   - Found NEW GAME button, clicking...');
            await allButtons[i].click();
            foundNewGame = true;
            break;
          }
        } catch (e) {
          // Skip buttons that can't be evaluated
        }
      }
    }
    
    if (!foundNewGame) {
      console.log('   - ❌ Could not find NEW GAME button');
      await page.screenshot({ path: 'no-new-game-button.png' });
      return;
    }
    
    // Wait for navigation/response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Check if resurrection modal appears
    console.log('3. Checking for resurrection modal...');
    const resurrectionModal = await page.$('#screen-create-holo');
    
    let modalVisible = false;
    if (resurrectionModal) {
      modalVisible = await resurrectionModal.evaluate(el => {
        const style = getComputedStyle(el);
        const hasActiveClass = el.classList.contains('active');
        const isDisplayed = style.display !== 'none';
        return hasActiveClass || isDisplayed;
      });
      
      if (modalVisible) {
        console.log('   - ❌ ISSUE: Resurrection modal still appears!');
        await page.screenshot({ path: 'resurrection-modal-issue.png' });
        console.log('   - Screenshot saved: resurrection-modal-issue.png');
      } else {
        console.log('   - ✅ SUCCESS: Resurrection modal exists but is hidden');
      }
    } else {
      console.log('   - ✅ SUCCESS: No resurrection modal detected');
    }
    
    // Step 4: Check if we're at character creation
    console.log('4. Checking for character creation screen...');
    
    // Look for character creation indicators
    const charCreateIndicators = await page.evaluate(() => {
      const body = document.body.textContent || '';
      const activeScreen = document.querySelector('.screen.active');
      return {
        hasCharacterText: body.toLowerCase().includes('character'),
        hasCreateText: body.toLowerCase().includes('create'),
        hasNameInput: !!document.querySelector('input[type="text"], input[name*="name"], #name, .name-input'),
        hasClassSelection: body.toLowerCase().includes('class') || body.toLowerCase().includes('profession'),
        currentScreen: activeScreen ? activeScreen.id : 'none',
        screenCount: document.querySelectorAll('.screen').length,
        activeScreenCount: document.querySelectorAll('.screen.active').length
      };
    });
    
    console.log('   - Character creation indicators:');
    console.log(`     * Current active screen: ${charCreateIndicators.currentScreen}`);
    console.log(`     * Total screens: ${charCreateIndicators.screenCount}`);
    console.log(`     * Active screens: ${charCreateIndicators.activeScreenCount}`);
    console.log(`     * Has "character" text: ${charCreateIndicators.hasCharacterText}`);
    console.log(`     * Has "create" text: ${charCreateIndicators.hasCreateText}`);
    console.log(`     * Has name input: ${charCreateIndicators.hasNameInput}`);
    console.log(`     * Has class selection: ${charCreateIndicators.hasClassSelection}`);
    
    // Step 5: Take final screenshot
    await page.screenshot({ path: 'final-state.png' });
    console.log('   - Screenshot saved: final-state.png');
    
    // Summary
    console.log('\n=== TEST RESULTS ===');
    
    if (!modalVisible && (charCreateIndicators.currentScreen === 'screen-create' || charCreateIndicators.hasCharacterText || charCreateIndicators.hasCreateText)) {
      console.log('✅ SUCCESS: NEW GAME flow appears to be working correctly!');
      console.log('   - No resurrection modal blocking the flow');
      console.log('   - User reaches what appears to be character creation');
    } else {
      console.log('❌ ISSUES DETECTED:');
      if (modalVisible) console.log('   - Resurrection modal still appears and blocks UI');
      if (charCreateIndicators.currentScreen !== 'screen-create' && !charCreateIndicators.hasCharacterText && !charCreateIndicators.hasCreateText) {
        console.log('   - May not have reached character creation screen');
        console.log(`   - Current screen: ${charCreateIndicators.currentScreen}`);
      }
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
    if (page) {
      try {
        await page.screenshot({ path: 'error-state.png' });
      } catch (screenshotError) {
        console.error('Could not take screenshot:', screenshotError);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();