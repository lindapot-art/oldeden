// Comprehensive gameplay test — exercises all screens and game flow
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

  // Collect ALL errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));

  try {
    console.log('=== FULL GAME FLOW TEST ===');
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('[1] Title screen loaded');

    // Click NEW GAME
    await page.click('#btn-new');
    await new Promise(r => setTimeout(r, 1000));
    console.log('[2] Create screen');

    // Fill character name and select faction
    await page.type('#pilot-name', 'TestPilot');
    await page.evaluate(() => {
      const fBtns = document.querySelectorAll('.faction-btn');
      if (fBtns.length > 0) fBtns[0].click();
    });
    await new Promise(r => setTimeout(r, 500));
    console.log('[3] Name/faction filled');

    // Click CREATE PILOT
    await page.evaluate(() => {
      const btn = document.getElementById('btn-create-char');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    // Check which screen is active by DOM visibility
    const afterStart = await page.evaluate(() => {
      const screens = document.querySelectorAll('.screen.active');
      return screens.length > 0 ? screens[0].id : 'none';
    });
    console.log('[4] After start: screen=' + afterStart);
    await page.screenshot({ path: path.join(DIR, 'flow_bridge.png') });

    // Test all nav buttons SEQUENTIALLY from bridge
    const screens = ['starmap', 'station', 'character', 'rebirth', 'market', 'settings', 'quarters', 'interior', 'gunroom'];
    for (const scr of screens) {
      // Navigate to bridge first
      await page.evaluate(() => showScreen('bridge'));
      await new Promise(r => setTimeout(r, 300));
      // Navigate to target
      await page.evaluate((s) => showScreen(s), scr);
      await new Promise(r => setTimeout(r, 800));
      const actual = await page.evaluate(() => {
        const active = document.querySelectorAll('.screen.active');
        return active.length > 0 ? active[0].id : 'none';
      });
      const navVisible = await page.evaluate(() => document.getElementById('nav-bar').classList.contains('visible'));
      console.log(`[NAV] ${scr}: screen=${actual}, navBar=${navVisible ? 'VISIBLE' : 'HIDDEN'}`);
      await page.screenshot({ path: path.join(DIR, `flow_${scr}.png`) });
    }

    // Test gunner mode
    await page.evaluate(() => showScreen('bridge'));
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      const btn = document.getElementById('btn-launch');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 3000)); // Wait for gunner to load
    const gunnerScreen = await page.evaluate(() => {
      const active = document.querySelectorAll('.screen.active');
      return active.length > 0 ? active[0].id : 'gunner-mode';
    });
    const gunnerNavBar = await page.evaluate(() => document.getElementById('nav-bar').classList.contains('visible'));
    console.log(`[GUNNER] screen=${gunnerScreen}, navBar=${gunnerNavBar ? 'VISIBLE(BUG!)' : 'HIDDEN(ok)'}`);
    await page.screenshot({ path: path.join(DIR, 'flow_gunner.png') });

    // Check for errors in gunner after some time
    await new Promise(r => setTimeout(r, 3000));
    const gunnerErrors = [...errors];
    console.log(`[GUNNER] After 6s: ${errors.length} total errors`);

    // Exit gunner back to bridge via ESC
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));
    const afterEsc = await page.evaluate(() => {
      const active = document.querySelectorAll('.screen.active');
      return active.length > 0 ? active[0].id : 'none';
    });
    console.log(`[ESC] After escape: screen=${afterEsc}`);

    // Test quarters data population
    await page.evaluate(() => showScreen('quarters'));
    await new Promise(r => setTimeout(r, 500));
    const qData = await page.evaluate(() => ({
      name: document.getElementById('q-name')?.textContent,
      faction: document.getElementById('q-faction')?.textContent,
      credits: document.getElementById('q-credits')?.textContent,
      kills: document.getElementById('q-kills')?.textContent,
      hull: document.getElementById('q-hull')?.textContent,
      shield: document.getElementById('q-shield')?.textContent,
      trophies: document.getElementById('q-trophies')?.textContent,
    }));
    console.log('[QUARTERS] Data:', JSON.stringify(qData));
    await page.screenshot({ path: path.join(DIR, 'flow_quarters_data.png') });

    // Test station
    await page.evaluate(() => showScreen('station'));
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(DIR, 'flow_station.png') });

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log('Total JS errors: ' + errors.length);
    if (errors.length > 0) {
      const unique = [...new Set(errors)];
      unique.forEach(e => console.log('  ERR: ' + e.substring(0, 200)));
    }

  } catch (err) {
    console.error('TEST FAILED:', err.message);
  } finally {
    await browser.close();
  }
})();
