const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (text.includes('[GameLoop] Frame error') || text.includes('Error') || text.includes('error')) {
      errors.push(text);
    }
  });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));
  
  console.log('Loading page...');
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 15000 });
  console.log('Page loaded. Waiting 2s for init...');
  await new Promise(r => setTimeout(r, 2000));
  
  // Click New Game
  console.log('Clicking New Game...');
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 1000));
  
  // Fill character form and start game
  const hasStart = await page.evaluate(() => {
    const nameInput = document.querySelector('#char-name');
    if (nameInput) nameInput.value = 'TestPilot';
    // Look for a start/play button on character creation screen
    const btns = [...document.querySelectorAll('button, .btn, [onclick]')];
    const startBtn = btns.find(b => /start|play|create|begin|launch/i.test(b.textContent));
    if (startBtn) { startBtn.click(); return 'clicked: ' + startBtn.textContent.trim(); }
    // Try clicking #btn-start-game directly  
    const sg = document.getElementById('btn-start-game');
    if (sg) { sg.click(); return 'clicked: btn-start-game'; }
    return 'no start button found. Buttons: ' + btns.map(b => b.textContent.trim().substring(0,30)).join(' | ');
  });
  console.log('Start button result:', hasStart);
  await new Promise(r => setTimeout(r, 3000));
  
  // Check state
  const state = await page.evaluate(() => {
    return {
      screen: window.state?.screen,
      combatActive: window.state?.combat?.active,
      threeReady: window.threeReady,
      frameCount: window.state?._frameCount,
      errCount: window.gameLoop?._errCount,
      canvasSize: { w: document.getElementById('game-canvas')?.width, h: document.getElementById('game-canvas')?.height }
    };
  });
  console.log('\nGAME STATE:', JSON.stringify(state, null, 2));
  
  // Wait more and check frame progress
  await new Promise(r => setTimeout(r, 3000));
  const state2 = await page.evaluate(() => ({
    frameCount: window.state?._frameCount,
    errCount: window.gameLoop?._errCount,
    screen: window.state?.screen,
    combatActive: window.state?.combat?.active
  }));
  console.log('AFTER 3s MORE:', JSON.stringify(state2, null, 2));
  
  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.slice(0, 20).forEach(e => console.log(e));
  
  console.log('\n=== GAMELOOP LOGS ===');
  logs.filter(l => l.includes('GameLoop') || l.includes('Frame error')).slice(0,10).forEach(l => console.log(l));
  
  // Screenshot
  await page.screenshot({ path: 'test_screenshots/freeze_test.png', fullPage: false });
  console.log('\nScreenshot saved to test_screenshots/freeze_test.png');
  
  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
