const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));
    
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 30000 });
    
    const moduleLoaded = await page.evaluate(() => window.__oldEdenLoaded);
    console.log('TEST 1 - Module loaded flag:', moduleLoaded === true ? 'PASS' : 'FAIL (' + moduleLoaded + ')');
    
    await page.click('#btn-new');
    await new Promise(r => setTimeout(r, 500));
    let active = await page.$$eval('.screen.active', els => els.map(e => e.id));
    console.log('TEST 2a - After New Game:', active.includes('screen-create') ? 'PASS' : 'FAIL (' + active + ')');
    
    await page.click('#faction-grid .faction-card:first-child');
    await page.type('#pilot-name', 'TestPilot');
    await page.click('#btn-create-char');
    await new Promise(r => setTimeout(r, 500));
    active = await page.$$eval('.screen.active', els => els.map(e => e.id));
    console.log('TEST 2b - After Create:', active.includes('screen-bridge') ? 'PASS' : 'FAIL (' + active + ')');
    
    console.log('\nTEST 3 - Gunner with no WebGL (dead-state prevention):');
    await page.click('button[data-screen="gunner"]');
    await new Promise(r => setTimeout(r, 500));
    active = await page.$$eval('.screen.active', els => els.map(e => e.id));
    const navVisible = await page.$eval('#nav-bar', el => el.classList.contains('visible'));
    console.log('  Active screens:', JSON.stringify(active));
    console.log('  Nav bar visible:', navVisible);
    console.log('  Result:', active.includes('screen-bridge') && navVisible ? 'PASS (stayed on bridge)' : 'FAIL (got trapped)');
    
    await page.click('button[data-screen="starmap"]');
    await new Promise(r => setTimeout(r, 500));
    active = await page.$$eval('.screen.active', els => els.map(e => e.id));
    console.log('\nTEST 4 - Navigate to starmap:', active.includes('screen-starmap') ? 'PASS' : 'FAIL (' + active + ')');
    
    await page.click('button[data-screen="bridge"]');
    await new Promise(r => setTimeout(r, 500));
    active = await page.$$eval('.screen.active', els => els.map(e => e.id));
    console.log('TEST 5 - Back to bridge:', active.includes('screen-bridge') ? 'PASS' : 'FAIL (' + active + ')');
    
    console.log('\n=== Browser Errors ===');
    const relevantErrors = errors.filter(e => !e.includes('WebGL') && !e.includes('SwiftShader'));
    if (relevantErrors.length === 0) console.log('None (beyond expected WebGL in headless)');
    else relevantErrors.forEach(e => console.log('ERR:', e));
    
  } catch(err) {
    console.error('FAILED:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
