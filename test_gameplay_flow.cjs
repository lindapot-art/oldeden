// test_gameplay_flow.cjs — Full gameplay flow test: title → create → gunner
// Checks for freeze, JS errors, and takes screenshots
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
  const errors = [];
  const logs = [];

  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') errors.push(text);
  });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));

  console.log('1. Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, 'flow_01_title.png') });
  console.log('   Title screen loaded');

  // Click New Game
  console.log('2. Clicking New Game...');
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT, 'flow_02_create.png') });

  // Select faction (first one)
  console.log('3. Selecting faction...');
  const factionCards = await page.$$('.faction-card');
  if (factionCards.length > 0) {
    await factionCards[0].click();
    console.log('   Clicked first faction card');
  } else {
    console.log('   WARNING: No faction cards found');
  }

  // Enter pilot name
  console.log('4. Entering pilot name...');
  const nameInput = await page.$('#pilot-name');
  if (nameInput) {
    await nameInput.click({ clickCount: 3 });
    await nameInput.type('TestPilot');
    console.log('   Name entered');
  } else {
    console.log('   WARNING: No name input found');
  }

  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, 'flow_03_filled.png') });

  // Click Create Pilot
  console.log('5. Clicking Create Pilot...');
  const createBtn = await page.$('#btn-create-pilot');
  if (createBtn) {
    await createBtn.click();
    console.log('   Create Pilot clicked');
  } else {
    // Try finding by text
    const btns = await page.$$('button');
    for (const btn of btns) {
      const text = await btn.evaluate(el => el.textContent);
      if (text.includes('Create Pilot')) {
        await btn.click();
        console.log('   Create Pilot found by text');
        break;
      }
    }
  }

  // Wait for transition
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT, 'flow_04_gunner.png') });

  // Check screen state
  const screenState = await page.evaluate(() => {
    const screens = document.querySelectorAll('[id^="screen-"]');
    const visible = [];
    screens.forEach(s => {
      if (s.offsetParent !== null || s.style.display !== 'none') {
        const cs = getComputedStyle(s);
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0') {
          visible.push(s.id);
        }
      }
    });
    const canvas = document.getElementById('game-canvas');
    const hud = document.getElementById('hud-canvas');
    return {
      visibleScreens: visible,
      canvasDisplay: canvas ? getComputedStyle(canvas).display : 'N/A',
      hudDisplay: hud ? getComputedStyle(hud).display : 'N/A',
      actionBarActive: document.getElementById('action-bar')?.classList.contains('active'),
      commsLog: document.getElementById('comms-log')?.children.length || 0
    };
  });
  console.log('6. Screen state:', JSON.stringify(screenState, null, 2));

  // Wait more and check if frames are advancing (freeze detection)
  console.log('7. Freeze detection (5s)...');
  const frameCheck = await page.evaluate(() => {
    return new Promise(resolve => {
      let frameCount = 0;
      function countFrame() {
        frameCount++;
        if (frameCount < 120) requestAnimationFrame(countFrame);
        else resolve({ frames: frameCount, time: performance.now() });
      }
      const start = performance.now();
      requestAnimationFrame(countFrame);
      setTimeout(() => resolve({ frames: frameCount, time: performance.now() - start, timedOut: true }), 5000);
    });
  });
  console.log('   Frames:', JSON.stringify(frameCheck));

  await page.screenshot({ path: path.join(OUT, 'flow_05_after5s.png') });

  // Error summary
  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.forEach(e => console.log('  ERR:', e.substring(0, 200)));

  // GLB loading check
  const glbLogs = logs.filter(l => l.includes('[GLB]'));
  console.log('\n=== GLB LOADING (' + glbLogs.length + ' msgs) ===');
  glbLogs.forEach(l => console.log('  ' + l.substring(0, 200)));

  // GameLoop errors
  const loopErrs = logs.filter(l => l.includes('[GameLoop]'));
  console.log('\n=== GAMELOOP ERRORS (' + loopErrs.length + ') ===');
  loopErrs.forEach(l => console.log('  ' + l.substring(0, 200)));

  console.log('\n=== DONE ===');
  await browser.close();
})().catch(e => { console.error('TEST FAILED:', e); process.exit(1); });
