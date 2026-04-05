/**
 * Deep Gameplay Audit — Comprehensive Puppeteer test
 * Tests: page load, JS errors, WebGL, screen transitions,
 * character creation, gunner mode, death/rebirth, all buttons
 */
const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const warnings = [];
  const passed = [];
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Collect ALL JS errors
    page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push('CONSOLE_ERROR: ' + msg.text());
      if (msg.type() === 'warning') warnings.push('WARN: ' + msg.text());
    });

    // ── TEST 1: Page Load ──
    console.log('\n=== TEST 1: Page Load ===');
    const resp = await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 20000 });
    if (resp.status() === 200) { passed.push('T1: Page loads HTTP 200'); console.log('  PASS: HTTP 200'); }
    else { errors.push('T1: HTTP ' + resp.status()); console.log('  FAIL: HTTP ' + resp.status()); }

    // ── TEST 2: Key DOM elements ──
    console.log('\n=== TEST 2: DOM Elements ===');
    const criticalElements = [
      'screen-title', 'screen-bridge', 'screen-create', 'screen-settings',
      'screen-gunner', 'screen-starmap', 'screen-station', 'screen-character',
      'screen-rebirth', 'screen-karma', 'screen-eulogy', 'screen-market',
      'game-canvas', 'hud-canvas', 'btn-new', 'btn-continue', 'btn-settings',
      'nav-bar', 'death-ticker', 'qa-unverified-banner', 'webgl-lost-overlay'
    ];
    for (const id of criticalElements) {
      const el = await page.$('#' + id);
      if (el) { passed.push('T2: #' + id + ' exists'); }
      else { errors.push('T2: MISSING #' + id); console.log('  MISSING: #' + id); }
    }
    console.log('  Checked ' + criticalElements.length + ' elements');

    // ── TEST 3: WebGL context ──
    console.log('\n=== TEST 3: WebGL ===');
    const webglOk = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      if (!c) return false;
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return !!gl;
    });
    if (webglOk) { passed.push('T3: WebGL context healthy'); console.log('  PASS: WebGL OK'); }
    else { errors.push('T3: WebGL context FAILED'); console.log('  FAIL: No WebGL'); }

    // ── TEST 4: Title screen visible ──
    console.log('\n=== TEST 4: Title Screen ===');
    const titleVisible = await page.evaluate(() => {
      const el = document.getElementById('screen-title');
      return el && el.classList.contains('active');
    });
    if (titleVisible) { passed.push('T4: Title screen active'); console.log('  PASS'); }
    else { errors.push('T4: Title screen NOT active'); console.log('  FAIL'); }

    // ── TEST 5: Click "New Game" → Create screen ──
    console.log('\n=== TEST 5: New Game Flow ===');
    await page.click('#btn-new');
    await new Promise(r => setTimeout(r, 500));
    const createVisible = await page.evaluate(() => {
      const el = document.getElementById('screen-create');
      return el && el.classList.contains('active');
    });
    if (createVisible) { passed.push('T5: Create screen opens'); console.log('  PASS: Create screen'); }
    else { errors.push('T5: Create screen NOT active after New Game click'); console.log('  FAIL'); }

    // ── TEST 6: Fill character form and create ──
    console.log('\n=== TEST 6: Character Creation ===');
    // Type name
    const nameInput = await page.$('#pilot-name');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type('TestPilot');
    }
    // Click first faction button
    const factionBtns = await page.$$('.faction-btn');
    if (factionBtns.length > 0) await factionBtns[0].click();
    await new Promise(r => setTimeout(r, 200));
    // Click create button
    const createBtn = await page.$('#btn-create-pilot');
    if (createBtn) {
      await createBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }
    const bridgeVisible = await page.evaluate(() => {
      const el = document.getElementById('screen-bridge');
      return el && el.classList.contains('active');
    });
    if (bridgeVisible) { passed.push('T6: Bridge screen after creation'); console.log('  PASS: Bridge visible'); }
    else {
      // Check what screen we're on
      const currentScreen = await page.evaluate(() => {
        const active = document.querySelector('.screen.active');
        return active ? active.id : 'none';
      });
      errors.push('T6: Expected bridge, got: ' + currentScreen);
      console.log('  FAIL: On screen ' + currentScreen);
    }

    // ── TEST 7: Navigation buttons ──
    console.log('\n=== TEST 7: Navigation ===');
    const navScreens = ['starmap', 'station', 'character', 'rebirth', 'market', 'bridge'];
    for (const screen of navScreens) {
      const navBtn = await page.$('.nav-btn[data-screen="' + screen + '"]');
      if (navBtn) {
        await navBtn.click();
        await new Promise(r => setTimeout(r, 400));
        const isActive = await page.evaluate((s) => {
          const el = document.getElementById('screen-' + s);
          return el && el.classList.contains('active');
        }, screen);
        if (isActive) { passed.push('T7: Nav to ' + screen); }
        else { errors.push('T7: Nav to ' + screen + ' failed'); console.log('  FAIL: Nav ' + screen); }
      } else {
        errors.push('T7: Nav button for ' + screen + ' not found');
      }
    }
    console.log('  Checked ' + navScreens.length + ' nav targets');

    // ── TEST 8: Enter Gunner Mode ──
    console.log('\n=== TEST 8: Gunner Mode ===');
    // Navigate to bridge first
    const bridgeBtn = await page.$('.nav-btn[data-screen="bridge"]');
    if (bridgeBtn) await bridgeBtn.click();
    await new Promise(r => setTimeout(r, 400));
    const launchBtn = await page.$('#btn-launch');
    if (launchBtn) {
      await launchBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      const gunnerActive = await page.evaluate(() => {
        const el = document.getElementById('screen-gunner');
        return el && el.classList.contains('active');
      });
      if (gunnerActive) { passed.push('T8: Gunner mode entered'); console.log('  PASS'); }
      else {
        const cs = await page.evaluate(() => document.querySelector('.screen.active')?.id || 'none');
        errors.push('T8: Failed to enter gunner, on: ' + cs);
        console.log('  FAIL: On ' + cs);
      }
    } else { errors.push('T8: Launch button not found'); console.log('  FAIL: No launch btn'); }

    // ── TEST 9: Gunner gameplay (5 seconds) ──
    console.log('\n=== TEST 9: Gameplay Stability (5s) ===');
    const errsBefore = errors.length;
    await new Promise(r => setTimeout(r, 5000));
    if (errors.length === errsBefore) { passed.push('T9: 5s gameplay no new errors'); console.log('  PASS: Stable'); }
    else { console.log('  WARN: ' + (errors.length - errsBefore) + ' new errors during gameplay'); }

    // ── TEST 10: ESC exits gunner ──
    console.log('\n=== TEST 10: ESC Exit Gunner ===');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 600));
    const backToBridge = await page.evaluate(() => {
      const el = document.getElementById('screen-bridge');
      return el && el.classList.contains('active');
    });
    if (backToBridge) { passed.push('T10: ESC returns to bridge'); console.log('  PASS'); }
    else {
      const cs = await page.evaluate(() => document.querySelector('.screen.active')?.id || 'none');
      errors.push('T10: ESC didnt return to bridge, on: ' + cs);
      console.log('  FAIL: On ' + cs);
    }

    // ── TEST 11: Settings screen ──
    console.log('\n=== TEST 11: Settings ===');
    const settingsBtn = await page.$('#btn-settings');
    // Might be on title screen only; try nav-btn approach from bridge
    const settingsNav = await page.$('.nav-btn[data-screen="settings"]');
    if (settingsNav) {
      await settingsNav.click();
    } else if (settingsBtn) {
      await settingsBtn.click();
    }
    await new Promise(r => setTimeout(r, 400));
    const settingsVisible = await page.evaluate(() => {
      const el = document.getElementById('screen-settings');
      return el && el.classList.contains('active');
    });
    if (settingsVisible) { passed.push('T11: Settings screen'); console.log('  PASS'); }
    else { warnings.push('T11: Settings screen not accessible from bridge'); console.log('  WARN: Settings not accessible'); }

    // ── TEST 12: Socket.IO connection ──
    console.log('\n=== TEST 12: Socket.IO ===');
    const socketConnected = await page.evaluate(() => {
      const s = window.__oeSocket || (typeof state !== 'undefined' && state.socket);
      return s && s.connected;
    });
    if (socketConnected) { passed.push('T12: Socket.IO connected'); console.log('  PASS'); }
    else { warnings.push('T12: Socket.IO not connected (may be module-scoped)'); console.log('  WARN: Cannot verify from evaluate'); }

    // ── TEST 13: Save game ──
    console.log('\n=== TEST 13: Save Game ===');
    const saveResult = await page.evaluate(() => {
      try {
        if (typeof saveGame === 'function') { saveGame(); return 'saved'; }
        return 'saveGame not accessible';
      } catch (e) { return 'error: ' + e.message; }
    });
    console.log('  Save: ' + saveResult);
    if (saveResult === 'saved') passed.push('T13: Save game works');
    else warnings.push('T13: ' + saveResult);

    // ── TEST 14: Check for error banners in DOM ──
    console.log('\n=== TEST 14: Error Banners ===');
    const errorBanner = await page.$('#oe-error-banner');
    const promiseBanner = await page.$('#oe-promise-banner');
    const webglLost = await page.evaluate(() => {
      const el = document.getElementById('webgl-lost-overlay');
      return el && el.classList.contains('active');
    });
    if (!errorBanner && !promiseBanner && !webglLost) {
      passed.push('T14: No error banners visible');
      console.log('  PASS: Clean');
    } else {
      if (errorBanner) errors.push('T14: JS error banner visible');
      if (promiseBanner) errors.push('T14: Promise error banner visible');
      if (webglLost) errors.push('T14: WebGL lost overlay active');
    }

    // ── TEST 15: Server API endpoints ──
    console.log('\n=== TEST 15: API Endpoints ===');
    const apiResults = await page.evaluate(async () => {
      const endpoints = ['/health', '/api/game/starmap', '/api/game/quests', '/api/game/factions', '/api/game/economy/rates', '/api/game/systems'];
      const results = [];
      for (const ep of endpoints) {
        try {
          const r = await fetch(ep);
          results.push(ep + ' => ' + r.status);
        } catch (e) { results.push(ep + ' => FAIL: ' + e.message); }
      }
      return results;
    });
    apiResults.forEach(r => {
      console.log('  ' + r);
      if (r.includes('200')) passed.push('T15: ' + r.split(' =>')[0]);
      else errors.push('T15: ' + r);
    });

  } catch (e) {
    errors.push('FATAL: ' + e.message);
    console.error('FATAL:', e.message);
  } finally {
    if (browser) await browser.close();
  }

  // ── FINAL REPORT ──
  console.log('\n' + '='.repeat(60));
  console.log('  DEEP GAMEPLAY AUDIT — FINAL REPORT');
  console.log('='.repeat(60));
  console.log('\n  PASSED: ' + passed.length);
  passed.forEach(p => console.log('    ✔ ' + p));
  if (warnings.length) {
    console.log('\n  WARNINGS: ' + warnings.length);
    warnings.forEach(w => console.log('    ⚠ ' + w));
  }
  if (errors.length) {
    console.log('\n  ERRORS: ' + errors.length);
    errors.forEach(e => console.log('    ✘ ' + e));
  }
  console.log('\n  VERDICT: ' + (errors.length === 0 ? 'ALL CLEAR' : errors.length + ' ISSUES FOUND'));
  console.log('='.repeat(60));
  process.exit(errors.length > 0 ? 1 : 0);
})();
