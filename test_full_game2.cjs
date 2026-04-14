// Comprehensive gameplay test — uses button clicks, not module-scoped functions
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:3847';
const DIR = path.join(__dirname, 'test_screenshots');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));

  try {
    console.log('=== FULL GAME FLOW TEST v2 ===');
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('[1] Title screen loaded');

    // Click NEW GAME
    await page.click('#btn-new');
    await new Promise(r => setTimeout(r, 1000));
    console.log('[2] Create screen');

    // Fill pilot name
    await page.type('#pilot-name', 'TestPilot');
    // Select first faction
    await page.evaluate(() => {
      const fBtns = document.querySelectorAll('.faction-btn');
      if (fBtns.length > 0) fBtns[0].click();
    });
    await new Promise(r => setTimeout(r, 500));
    console.log('[3] Name/faction filled');

    // Click CREATE PILOT
    await page.click('#btn-create-char');
    await new Promise(r => setTimeout(r, 2000));
    
    const activeScreen = () => page.evaluate(() => {
      const el = document.querySelector('.screen.active');
      return el ? el.id.replace('screen-', '') : 'none';
    });
    const navVisible = () => page.evaluate(() => document.getElementById('nav-bar').classList.contains('visible'));

    let scr = await activeScreen();
    console.log('[4] After create: screen=' + scr);
    await page.screenshot({ path: path.join(DIR, 'flow2_bridge.png') });

    // Test nav buttons by clicking them directly
    const navScreens = [
      { screen: 'starmap', selector: '.nav-btn[data-screen="starmap"]' },
      { screen: 'character', selector: '.nav-btn[data-screen="character"]' },
      { screen: 'rebirth', selector: '.nav-btn[data-screen="rebirth"]' },
      { screen: 'market', selector: '.nav-btn[data-screen="market"]' },
      { screen: 'settings', selector: '.nav-btn[data-screen="settings"]' },
      { screen: 'quarters', selector: '.nav-btn[data-screen="quarters"]' },
      { screen: 'interior', selector: '.nav-btn[data-screen="interior"]' },
      { screen: 'gunroom', selector: '.nav-btn[data-screen="gunroom"]' },
    ];

    for (const nav of navScreens) {
      // First go to bridge via bridge button
      await page.evaluate(() => {
        const btn = document.querySelector('.nav-btn[data-screen="bridge"]');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 500));

      // Click target nav button
      const found = await page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (btn) { btn.click(); return true; }
        return false;
      }, nav.selector);
      
      await new Promise(r => setTimeout(r, 800));
      scr = await activeScreen();
      const nav_vis = await navVisible();
      console.log(`[NAV] ${nav.screen}: found=${found}, screen=${scr}, navBar=${nav_vis ? 'VISIBLE' : 'HIDDEN'}`);
      await page.screenshot({ path: path.join(DIR, `flow2_${nav.screen}.png`) });
    }

    // Now test station (needs hasStation or docked check)
    await page.evaluate(() => {
      const btn = document.querySelector('.nav-btn[data-screen="station"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    scr = await activeScreen();
    console.log(`[NAV] station: screen=${scr}`);
    await page.screenshot({ path: path.join(DIR, 'flow2_station.png') });

    // Back to bridge, then gunner via ENTER SPACE button
    await page.evaluate(() => {
      const btn = document.querySelector('.nav-btn[data-screen="bridge"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.click('#btn-launch');
    await new Promise(r => setTimeout(r, 4000));
    scr = await activeScreen();
    const gNavVis = await navVisible();
    console.log(`[GUNNER] screen=${scr}, navBar=${gNavVis ? 'VISIBLE(BUG!)' : 'HIDDEN(ok)'}`);
    await page.screenshot({ path: path.join(DIR, 'flow2_gunner.png') });

    // Wait and check for accumulating errors
    await new Promise(r => setTimeout(r, 3000));
    console.log(`[GUNNER] After 7s total: ${errors.length} errors`);

    // ESC to exit gunner
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));
    scr = await activeScreen();
    console.log(`[ESC] After escape: screen=${scr}`);

    // Test quarters data population
    await page.evaluate(() => {
      const btn = document.querySelector('.nav-btn[data-screen="quarters"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    const qData = await page.evaluate(() => ({
      name: document.getElementById('q-name')?.textContent,
      faction: document.getElementById('q-faction')?.textContent,
      credits: document.getElementById('q-credits')?.textContent,
      kills: document.getElementById('q-kills')?.textContent,
      hull: document.getElementById('q-hull')?.textContent,
      shield: document.getElementById('q-shield')?.textContent,
      trophies: document.getElementById('q-trophies')?.textContent?.substring(0, 60),
    }));
    console.log('[QUARTERS] Data:', JSON.stringify(qData));
    await page.screenshot({ path: path.join(DIR, 'flow2_quarters_data.png') });

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log('Total JS errors: ' + errors.length);
    if (errors.length > 0) {
      const unique = [...new Set(errors)];
      unique.forEach(e => console.log('  ERR: ' + e.substring(0, 200)));
    } else {
      console.log('  ZERO ERRORS! Game is clean.');
    }

  } catch (err) {
    console.error('TEST FAILED:', err.message);
  } finally {
    await browser.close();
  }
})();
