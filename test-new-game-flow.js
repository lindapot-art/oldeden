const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Starting NEW GAME flow test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Step 1: Navigate to the game
    console.log('1. Navigating to http://localhost:3847');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2' });
    
    // Wait a moment for the page to fully load
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'main-menu.png' });
    console.log('   - Screenshot saved: main-menu.png');
    
    // Step 2: Look for NEW GAME button and click it
    console.log('2. Looking for NEW GAME button...');
    const newGameButton = await page.button:contains("NEW GAME"), input[value*="NEW"], .new-game, #new-game, [id*="new"], [class*="new"];
    
    if (!newGameButton) {
      // Try alternative selectors
      const allButtons = await page.:3847('button, input[type="button"], input[type="submit"], .button');
      console.log(   - Found  potential buttons);
      
      for (let i = 0; i < allButtons.length; i++) {
        const buttonText = await allButtons[i].evaluate(el => el.textContent || el.value || '');
        console.log(   - Button : "");
        if (buttonText.toLowerCase().includes('new') || buttonText.toLowerCase().includes('game')) {
          console.log('   - Found NEW GAME button!');
          await allButtons[i].click();
          break;
        }
      }
    } else {
      console.log('   - Found NEW GAME button, clicking...');
      await newGameButton.click();
    }
    
    // Wait for navigation/response
    await page.waitForTimeout(3000);
    
    // Step 3: Check if resurrection modal appears
    console.log('3. Checking for resurrection modal...');
    const resurrectionModal = await page..modal, .resurrection, [id*="resurrection"], [class*="resurrection"];
    
    if (resurrectionModal) {
      console.log('   - ❌ ISSUE: Resurrection modal still appears!');
      await page.screenshot({ path: 'resurrection-modal-issue.png' });
      console.log('   - Screenshot saved: resurrection-modal-issue.png');
    } else {
      console.log('   - ✅ SUCCESS: No resurrection modal detected');
    }
    
    // Step 4: Check if we're at character creation
    console.log('4. Checking for character creation screen...');
    
    // Look for character creation indicators
    const charCreateIndicators = await page.evaluate(() => {
      const body = document.body.textContent || '';
      return {
        hasCharacterText: body.toLowerCase().includes('character'),
        hasCreateText: body.toLowerCase().includes('create'),
        hasNameInput: !!document.querySelector('input[type="text"], input[name*="name"], #name, .name-input'),
        hasClassSelection: body.toLowerCase().includes('class') || body.toLowerCase().includes('profession')
      };
    });
    
    console.log('   - Character creation indicators:');
    console.log(     * Has "character" text: );
    console.log(     * Has "create" text: );
    console.log(     * Has name input: );
    console.log(     * Has class selection: );
    
    // Step 5: Take final screenshot
    await page.screenshot({ path: 'final-state.png' });
    console.log('   - Screenshot saved: final-state.png');
    
    // Summary
    console.log('\n=== TEST RESULTS ===');
    if (!resurrectionModal && (charCreateIndicators.hasCharacterText || charCreateIndicators.hasCreateText || charCreateIndicators.hasNameInput)) {
      console.log('✅ SUCCESS: NEW GAME flow appears to be working correctly!');
      console.log('   - No resurrection modal blocking the flow');
      console.log('   - User reaches what appears to be character creation');
    } else {
      console.log('❌ ISSUES DETECTED:');
      if (resurrectionModal) console.log('   - Resurrection modal still appears');
      if (!charCreateIndicators.hasCharacterText && !charCreateIndicators.hasCreateText && !charCreateIndicators.hasNameInput) {
        console.log('   - May not have reached character creation screen');
      }
    }
    
  } catch (error) {
    console.error('Error during testing:', error);
    await page.screenshot({ path: 'error-state.png' });
  } finally {
    await browser.close();
  }
})();
