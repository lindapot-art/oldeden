// test_deep_freeze.cjs — Deep freeze diagnostic: monitors frame errors, FPS, and render state
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const URL = 'http://localhost:3847';
const OUT = 'test_screenshots';

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--enable-webgl', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 }
  });
  const page = await browser.newPage();
  const allErrors = [];
  const allWarns = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') allErrors.push(text);
    if (msg.type() === 'warning' && text.includes('[GLB]')) allWarns.push(text);
    if (text.includes('[GameLoop]')) allErrors.push('GAMELOOP: ' + text);
  });
  page.on('pageerror', err => allErrors.push('PAGEERROR: ' + err.message));

  // 1. Load page
  console.log('=== PHASE 1: TITLE ===');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // 2. New Game → Create
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 800));
  const fCards = await page.$$('.faction-card');
  if (fCards.length > 0) await fCards[0].click();
  const ni = await page.$('#pilot-name');
  if (ni) { await ni.click({ clickCount: 3 }); await ni.type('FreezeTest'); }
  await new Promise(r => setTimeout(r, 300));
  
  // Click Create Pilot
  const btns = await page.$$('button');
  for (const btn of btns) {
    const t = await btn.evaluate(el => el.textContent);
    if (t.includes('Create Pilot')) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 2000));
  console.log('=== PHASE 2: BRIDGE ===');
  
  // Check bridge state
  const bridgeState = await page.evaluate(() => ({
    screen: document.querySelector('[id^="screen-"]:not([style*="display: none"])')?.id || 'none',
    threeReady: typeof threeReady !== 'undefined' ? threeReady : 'N/A',
    combatActive: typeof state !== 'undefined' ? state.combat?.active : 'N/A',
    gameScreen: typeof state !== 'undefined' ? state.screen : 'N/A'
  }));
  console.log('Bridge state:', JSON.stringify(bridgeState));
  await page.screenshot({ path: path.join(OUT, 'deep_bridge.png') });
  
  // 3. Enter gunner mode
  console.log('=== PHASE 3: ENTERING GUNNER ===');
  // Click Gunner nav button
  const navBtns = await page.$$('.nav-btn, [data-screen]');
  for (const nb of navBtns) {
    const t = await nb.evaluate(el => el.textContent);
    if (t.includes('Gunner')) { await nb.click(); console.log('Clicked Gunner'); break; }
  }
  
  // Wait for GLB loading
  await new Promise(r => setTimeout(r, 10000));
  console.log('=== PHASE 4: GUNNER MODE ACTIVE ===');
  
  // Inject frame counter with error detection
  const diagnostics = await page.evaluate(() => {
    return new Promise(resolve => {
      const results = { renderFrames: 0, errorFrames: 0, totalFrames: 0, errors: [], lastErrCount: gameLoop._errCount || 0 };
      const startErrCount = gameLoop._errCount || 0;
      let frameCount = 0;
      
      // Monitor for 3 seconds
      function monitor() {
        frameCount++;
        results.totalFrames = frameCount;
        const newErrCount = gameLoop._errCount || 0;
        if (newErrCount > results.lastErrCount + results.errorFrames) {
          results.errorFrames = newErrCount - startErrCount;
        }
        if (frameCount < 90) requestAnimationFrame(monitor);
        else {
          results.renderFrames = frameCount;
          results.errorFrames = (gameLoop._errCount || 0) - startErrCount;
          results.combatActive = state.combat?.active;
          results.screen = state.screen;
          results.threeReady = threeReady;
          results.enemyCount = state.combat?.enemies?.length || 0;
          results.lootCount = state.combat?.lootDrops?.length || 0;
          results.asteroidCount = state.combat?.asteroids?.length || 0;
          results.loadedModels = Object.keys(state.loadedModels || {});
          resolve(results);
        }
      }
      requestAnimationFrame(monitor);
      setTimeout(() => resolve(results), 10000);
    });
  });
  
  console.log('Diagnostics:', JSON.stringify(diagnostics, null, 2));
  await page.screenshot({ path: path.join(OUT, 'deep_gunner.png') });
  
  // Error summary
  console.log('\n=== ALL ERRORS (' + allErrors.length + ') ===');
  allErrors.slice(0, 20).forEach(e => console.log('  ' + e.substring(0, 200)));
  
  console.log('\n=== GLB WARNS (' + allWarns.length + ') ===');
  allWarns.slice(0, 10).forEach(w => console.log('  ' + w.substring(0, 150)));
  
  await browser.close();
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
