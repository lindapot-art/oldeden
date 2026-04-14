// Debug gameplay errors — captures full stack traces
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', '--use-gl=swiftshader', '--use-angle=swiftshader-webgl',
      '--enable-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
      '--window-size=1280,720'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const dir = 'debug_screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // Capture ALL console messages
  const allLogs = [];
  page.on('console', msg => {
    allLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    allLogs.push(`[PAGEERROR] ${err.message}\n${err.stack}`);
  });

  console.log('Loading page...');
  await page.goto('http://localhost:3847', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Check WebGL
  const webglOK = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return gl ? gl.getParameter(gl.RENDERER) : 'NONE';
  });
  console.log('WebGL:', webglOK);

  await page.screenshot({ path: path.join(dir, '01_title.png') });

  // Create character
  console.log('Creating character...');
  await page.evaluate(() => {
    document.querySelectorAll('.menu-btn').forEach(b => { if (b.textContent.includes('New Game')) b.click(); });
  });
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    // Click first faction card
    const cards = document.querySelectorAll('.faction-card');
    if (cards[0]) { cards[0].click(); console.log('Clicked faction:', cards[0].querySelector('.fname')?.textContent); }
    else console.log('No faction cards found');
  });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const ni = document.getElementById('pilot-name');
    if (ni) { ni.value = 'DEBUG_PILOT'; ni.dispatchEvent(new Event('input')); }
    setTimeout(() => {
      const cb = document.getElementById('btn-create-char');
      if (cb) { console.log('Clicking create char button'); cb.click(); }
      else console.log('btn-create-char NOT FOUND');
    }, 200);
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(dir, '02_bridge.png') });

  // Check current screen state before entering space
  const preState = await page.evaluate(() => {
    const screens = {};
    document.querySelectorAll('[id^="screen-"]').forEach(s => {
      const d = getComputedStyle(s).display;
      if (d !== 'none') screens[s.id] = { display: d, opacity: getComputedStyle(s).opacity };
    });
    return { screens, btnEnterSpace: !!document.getElementById('btn-enter-space') };
  });
  console.log('Pre-enter state:', JSON.stringify(preState, null, 2));

  // Enter space
  console.log('Entering space...');
  await page.evaluate(() => {
    const es = document.getElementById('btn-launch');
    if (es) { console.log('Clicking ENTER SPACE button'); es.click(); }
    else console.log('btn-launch NOT FOUND');
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(dir, '03_after_enter_1.5s.png') });

  // Check for flight controls dialog and dismiss
  await page.evaluate(() => {
    document.querySelectorAll('.btn, .menu-btn, button, .modal-close, .dialog-close').forEach(b => {
      const t = b.textContent.trim().toUpperCase();
      if (t.includes('GOT IT') || t.includes('CLOSE') || t.includes('DISMISS') || t.includes('OK')) {
        console.log('Dismissing dialog button:', b.textContent.trim());
        b.click();
      }
    });
    // Also click on overlay to dismiss
    const overlay = document.getElementById('screen-transition-overlay');
    if (overlay) console.log('Transition overlay display:', getComputedStyle(overlay).display, 'opacity:', getComputedStyle(overlay).opacity);
  });
  await new Promise(r => setTimeout(r, 500));

  // Try clicking anywhere on the game canvas to ensure focus
  await page.mouse.click(640, 360);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(dir, '04_after_dismiss.png') });

  // Wait for gameplay and take screenshots + check state every 3 seconds
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const state = await page.evaluate(() => {
      const result = {};
      // Check screens
      result.visibleScreens = [];
      document.querySelectorAll('[id^="screen-"]').forEach(s => {
        const d = getComputedStyle(s).display;
        if (d !== 'none') result.visibleScreens.push(s.id);
      });
      // Check canvas
      const gameCanvas = document.querySelector('canvas');
      result.canvasExists = !!gameCanvas;
      result.canvasSize = gameCanvas ? `${gameCanvas.width}x${gameCanvas.height}` : 'N/A';
      // Check for error banners
      result.errorBanner = document.getElementById('oe-error-banner')?.innerText || null;
      // Check HUD elements
      result.hudElements = {};
      ['hull-bar-fill', 'shield-bar-fill', 'crosshair', 'minimap', 'radar-canvas'].forEach(id => {
        const el = document.getElementById(id);
        result.hudElements[id] = el ? getComputedStyle(el).display : 'missing';
      });
      return result;
    });
    console.log(`State at ${(i+1)*3}s:`, JSON.stringify(state));
    await page.screenshot({ path: path.join(dir, `05_gameplay_${(i+1)*3}s.png`) });
  }

  // Print all captured logs
  console.log('\n=== ALL CONSOLE LOGS ===');
  allLogs.forEach(l => console.log(l));

  await browser.close();
  console.log('\nDone. Screenshots in', dir);
})();
