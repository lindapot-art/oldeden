const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Navigating to http://localhost:3847...');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if #screen-opening has class "active"
    const screenOpeningActive = await page.evaluate(() => {
      const elem = document.querySelector('#screen-opening');
      return elem ? elem.classList.contains('active') : false;
    });
    console.log('Screen #screen-opening has class "active":', screenOpeningActive);
    
    // Check if #screen-title does NOT have class "active"
    const screenTitleActive = await page.evaluate(() => {
      const elem = document.querySelector('#screen-title');
      return elem ? elem.classList.contains('active') : false;
    });
    console.log('Screen #screen-title has class "active":', screenTitleActive);
    console.log('Screen #screen-title does NOT have class "active":', !screenTitleActive);
    
    // Take screenshot
    const screenshotPath = 'screenshot_' + Date.now() + '.png';
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot taken:', screenshotPath);
    
    // Print findings
    console.log('\n=== FINDINGS ===');
    console.log('Active screens: #screen-opening -', screenOpeningActive ? 'ACTIVE' : 'INACTIVE');
    console.log('Active screens: #screen-title -', screenTitleActive ? 'ACTIVE' : 'INACTIVE');
    
    if (screenOpeningActive && !screenTitleActive) {
      console.log('✓ Test passed: #screen-opening is active, #screen-title is inactive');
    } else {
      console.log('✗ Test failed: Expected #screen-opening active and #screen-title inactive');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
})();
