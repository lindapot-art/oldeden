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
    
    // Try alternative selectors to find NEW GAME button
    const allButtons = await page.$$('button, input[type="button"], input[type="submit"], .button');
    console.log(`   - Found ${allButtons.length} potential buttons`);
    
    let foundNewGame = false;
    for (let i = 0; i < allButtons.length; i++) {
      const buttonText = await allButtons[i].evaluate(el => el.textContent || el.value || '');
      console.log(`   - Button ${i}: "${buttonText}"`);
      if (buttonText.toLowerCase().includes('new') || buttonText.toLowerCase().includes('game')) {
        console.log('   - Found NEW GAME button, clicking...');
        await allButtons[i].click();
        foundNewGame = true;
        break;
      }
    }
    
    if (!foundNewGame) {
      console.log('   - No NEW GAME button found, checking all button IDs...');
      for (let i = 0; i < allButtons.length; i++) {
        const buttonId = await allButtons[i].evaluate(el => el.id || '');
        if (buttonId.toLowerCase().includes('new') || buttonId.toLowerCase().includes('btn-new')) {
          console.log(`   - Found NEW GAME button by ID: ${buttonId}`);
          await allButtons[i].click();
          foundNewGame = true;
          break;
        }
      }
    }
    
    // Wait for navigation/response
    await page.waitForTimeout(3000);
    
    // Step 3: Check if resurrection modal appears
    console.log('3. Checking for resurrection modal...');
    const resurrectionModal = await page.$('#screen-create-holo, .modal, .resurrection');
    
    if (resurrectionModal) {
      const isVisible = await resurrectionModal.evaluate(el => el.classList.contains('active') || getComputedStyle(el).display !== 'none');
      if (isVisible) {
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
      return {
        hasCharacterText: body.toLowerCase().includes('character'),
        hasCreateText: body.toLowerCase().includes('create'),
        hasNameInput: !!document.querySelector('input[type="text"], input[name*="name"], #name, .name-input'),
        hasClassSelection: body.toLowerCase().includes('class') || body.toLowerCase().includes('profession'),
        currentScreen: document.querySelector('.screen.active')?.id || 'none'
      };
    });
    
    console.log('   - Character creation indicators:');
    console.log(`     * Current active screen: ${charCreateIndicators.currentScreen}`);
    console.log(`     * Has "character" text: ${charCreateIndicators.hasCharacterText}`);
    console.log(`     * Has "create" text: ${charCreateIndicators.hasCreateText}`);
    console.log(`     * Has name input: ${charCreateIndicators.hasNameInput}`);
    console.log(`     * Has class selection: ${charCreateIndicators.hasClassSelection}`);
    
    // Step 5: Take final screenshot
    await page.screenshot({ path: 'final-state.png' });
    console.log('   - Screenshot saved: final-state.png');
    
    // Summary
    console.log('\n=== TEST RESULTS ===');
    const modalVisible = resurrectionModal && await resurrectionModal.evaluate(el => el.classList.contains('active') || getComputedStyle(el).display !== 'none');
    
    if (!modalVisible && (charCreateIndicators.hasCharacterText || charCreateIndicators.hasCreateText || charCreateIndicators.hasNameInput)) {
      console.log('✅ SUCCESS: NEW GAME flow appears to be working correctly!');
      console.log('   - No resurrection modal blocking the flow');
      console.log('   - User reaches what appears to be character creation');
    } else {
      console.log('❌ ISSUES DETECTED:');
      if (modalVisible) console.log('   - Resurrection modal still appears and blocks UI');
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