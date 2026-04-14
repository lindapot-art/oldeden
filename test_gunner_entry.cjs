// test_gunner_entry.cjs — Test entering gunner mode from bridge
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

  // Navigate through title → create → bridge
  console.log('1. Loading...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 800));
  
  // Select faction + name
  const factionCards = await page.$$('.faction-card');
  if (factionCards.length > 0) await factionCards[0].click();
  const nameInput = await page.$('#pilot-name');
  if (nameInput) { await nameInput.click({ clickCount: 3 }); await nameInput.type('TestPilot'); }
  await new Promise(r => setTimeout(r, 300));
  
  // Click Create Pilot
  const btns = await page.$$('button');
  for (const btn of btns) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes('Create Pilot')) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 2000));
  console.log('2. At bridge. Entering gunner mode...');

  // Click "ENTER SPACE" button or Gunner nav
  const enterBtn = await page.$('#btn-enter-space');
  if (enterBtn) {
    await enterBtn.click();
    console.log('   Clicked #btn-enter-space');
  } else {
    // Try the Gunner nav button
    const navBtns = await page.$$('.nav-btn, [data-screen]');
    let clicked = false;
    for (const nb of navBtns) {
      const text = await nb.evaluate(el => el.textContent);
      if (text.includes('Gunner')) { await nb.click(); clicked = true; console.log('   Clicked Gunner nav'); break; }
    }
    if (!clicked) {
      // Try ENTER SPACE by text
      const allBtns = await page.$$('button, .btn, [role="button"]');
      for (const b of allBtns) {
        const text = await b.evaluate(el => el.textContent);
        if (text.includes('ENTER SPACE')) { await b.click(); console.log('   Clicked ENTER SPACE by text'); break; }
      }
    }
  }

  // Wait for gunner mode to load (GLBs loading)
  console.log('3. Waiting 8s for gunner mode + GLB loading...');
  await new Promise(r => setTimeout(r, 8000));
  await page.screenshot({ path: path.join(OUT, 'gunner_mode_01.png') });

  // Check state
  const state = await page.evaluate(() => {
    const screens = document.querySelectorAll('[id^="screen-"]');
    const visible = [];
    screens.forEach(s => {
      const cs = getComputedStyle(s);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0') visible.push(s.id);
    });
    return {
      visibleScreens: visible,
      hudDisplay: getComputedStyle(document.getElementById('hud-canvas') || document.body).display,
      actionBar: document.getElementById('action-bar')?.classList.contains('active'),
      commsCount: document.getElementById('comms-log')?.children.length || 0,
      glbOverlay: document.getElementById('glb-loading-overlay')?.classList.contains('active')
    };
  });
  console.log('4. State:', JSON.stringify(state));

  // Wait more and take another screenshot
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: path.join(OUT, 'gunner_mode_02.png') });

  // Check for freeze
  const frameCheck = await page.evaluate(() => {
    return new Promise(resolve => {
      let count = 0;
      const start = performance.now();
      function tick() { count++; if (count < 60) requestAnimationFrame(tick); else resolve({ frames: count, ms: Math.round(performance.now() - start) }); }
      requestAnimationFrame(tick);
      setTimeout(() => resolve({ frames: count, ms: Math.round(performance.now() - start), timedOut: true }), 4000);
    });
  });
  console.log('5. Frame check:', JSON.stringify(frameCheck));

  // Errors
  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.slice(0, 10).forEach(e => console.log('  ERR:', e.substring(0, 200)));

  // GLB logs
  const glbLogs = logs.filter(l => l.includes('[GLB]') || l.includes('GLB') || l.includes('glb'));
  console.log('\n=== GLB MESSAGES (' + glbLogs.length + ') ===');
  glbLogs.slice(0, 20).forEach(l => console.log('  ' + l.substring(0, 200)));

  // GameLoop errors
  const loopErrs = logs.filter(l => l.includes('[GameLoop]'));
  console.log('\n=== GAMELOOP ERRORS (' + loopErrs.length + ') ===');
  loopErrs.slice(0, 10).forEach(l => console.log('  ' + l.substring(0, 200)));

  console.log('\n=== DONE ===');
  await browser.close();
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
