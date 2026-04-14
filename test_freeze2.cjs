const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  const frameErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GameLoop] Frame error') || text.includes('Frame error')) {
      frameErrors.push(text);
    }
    if (msg.type() === 'error' || text.includes('Error') || text.includes('error')) {
      errors.push(`[${msg.type()}] ${text}`);
    }
  });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));
  
  console.log('1. Loading page...');
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('2. Clicking New Game...');
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 1000));
  
  // Fill name and select faction, then create
  console.log('3. Filling character form...');
  await page.evaluate(() => {
    const nameInput = document.querySelector('#char-name');
    if (nameInput) { nameInput.value = 'TestPilot'; nameInput.dispatchEvent(new Event('input')); }
    // Click first faction
    const factionBtns = document.querySelectorAll('.faction-card');
    if (factionBtns.length > 0) factionBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 500));
  
  // Click Create Pilot button
  console.log('4. Creating pilot...');
  const createResult = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, .btn')];
    const createBtn = btns.find(b => /create.*pilot|start.*game|launch|begin/i.test(b.textContent));
    if (createBtn) { createBtn.click(); return 'clicked: ' + createBtn.textContent.trim(); }
    return 'not found. Buttons: ' + btns.map(b => b.id + '=' + b.textContent.trim().substring(0,20)).join(' | ');
  });
  console.log('   Result:', createResult);
  await new Promise(r => setTimeout(r, 2000));
  
  // Check what screen we're on
  const screenInfo = await page.evaluate(() => {
    const active = document.querySelector('.screen.active');
    return {
      activeScreen: active?.id,
      visibleScreens: [...document.querySelectorAll('.screen')].filter(s => s.classList.contains('active')).map(s => s.id)
    };  
  });
  console.log('5. Current screen:', JSON.stringify(screenInfo));
  
  // If we're on bridge, try to enter gunner mode
  if (screenInfo.activeScreen !== 'screen-gunner') {
    console.log('6. Trying to navigate to gunner mode...');
    await page.evaluate(() => {
      // Try direct
      if (typeof showScreen === 'function') showScreen('gunner');
      else {
        const gunnerBtn = document.querySelector('[data-screen="gunner"]');
        if (gunnerBtn) gunnerBtn.click();
      }
    });
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Take screenshot  
  await page.screenshot({ path: 'test_screenshots/freeze_gunner.png' });
  
  // Check for frame errors after 5 more seconds in gunner mode
  await new Promise(r => setTimeout(r, 5000));
  
  const finalState = await page.evaluate(() => {
    const active = document.querySelector('.screen.active');
    const canvas = document.getElementById('game-canvas');
    const hud = document.getElementById('hud-canvas');
    return {
      activeScreen: active?.id,
      canvasDisplay: canvas ? getComputedStyle(canvas).display : 'no canvas',
      hudVisible: hud?.classList.contains('active'),
    };
  });
  console.log('7. Final state:', JSON.stringify(finalState));
  
  console.log('\n=== FRAME ERRORS (' + frameErrors.length + ') ===');
  frameErrors.slice(0, 15).forEach(e => console.log(e));
  
  console.log('\n=== ALL ERRORS (' + errors.length + ') ===');
  // Deduplicate
  const unique = [...new Set(errors)];
  unique.slice(0, 15).forEach(e => console.log(e));
  
  await page.screenshot({ path: 'test_screenshots/freeze_final.png' });
  console.log('\nScreenshots saved.');
  
  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
