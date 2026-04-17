// Full game flow test — correct nav selectors
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-gpu','--disable-software-rasterizer'] });
  const page = await browser.newPage();
  const jsErrors = [];
  
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error' && !txt.includes('WebGL') && !txt.includes('THREE.WebGLRenderer') && !txt.includes('ERR_CONNECTION_REFUSED') && !txt.includes('3D engine failed')) {
      jsErrors.push(txt);
    }
  });
  page.on('pageerror', err => jsErrors.push(`PAGE_ERROR: ${err.message}`));

  let pass = true;
  function check(label, ok) {
    console.log(`${ok ? '✅' : '❌'} ${label}`);
    if (!ok) pass = false;
  }

  try {
    // === TITLE SCREEN ===
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('#screen-title.active', { timeout: 5000 });
    check('Title screen active', true);

    // === CREATE SCREEN ===
    await page.evaluate(() => document.getElementById('btn-new').click());
    await new Promise(r => setTimeout(r, 800));
    const createActive = await page.$eval('#screen-create', el => el.classList.contains('active'));
    check('Create screen active', createActive);

    // Fill name + select faction
    await page.type('#pilot-name', 'TestPilot');
    await page.click('#faction-grid .faction-card');
    await new Promise(r => setTimeout(r, 200));

    // Create character
    await page.evaluate(() => document.getElementById('btn-create-char').click());
    await new Promise(r => setTimeout(r, 1200));

    // === BRIDGE SCREEN ===
    const bridgeActive = await page.$eval('#screen-bridge', el => el.classList.contains('active'));
    check('Bridge screen active', bridgeActive);

    const navVisible = await page.$eval('#nav-bar', el => el.classList.contains('visible')).catch(() => false);
    check('Nav bar visible', navVisible);

    // === NAV TO SCREENS (using data-screen selectors) ===
    const navTests = [
      // Station requires hasStation — test separately
      { screen: 'starmap', name: 'Star Map' },
      { screen: 'character', name: 'Character' },
      { screen: 'market', name: 'Market' },
      { screen: 'interior', name: 'Ship/Interior' },
      { screen: 'settings', name: 'Settings' },
      { screen: 'bridge', name: 'Bridge' },
    ];

    for (const nav of navTests) {
      // Click the nav button with matching data-screen
      await page.evaluate((screen) => {
        const btn = document.querySelector(`.nav-btn[data-screen="${screen}"]`);
        if (btn) btn.click();
      }, nav.screen);
      // Wait for transition (250ms) + buffer
      await new Promise(r => setTimeout(r, 500));
      
      const allActive = await page.$$eval('.screen.active', els => els.map(e => e.id));
      const expected = `screen-${nav.screen}`;
      const isActive = allActive.includes(expected);
      check(`Nav → ${nav.name}: ${expected} active (showing: ${allActive.join(',')})`, isActive);
    }

    // === STATION (requires star system with station) ===
    // Set up the station availability first
    await page.evaluate(() => {
      if (window.state) {
        state.starSystems = state.starSystems || [{ name: 'Alpha', hasStation: true }];
        state.location = state.location || { systemIndex: 0 };
        if (state.starSystems[state.location.systemIndex]) {
          state.starSystems[state.location.systemIndex].hasStation = true;
        }
      }
    });
    await page.evaluate(() => {
      const btn = document.querySelector('.nav-btn[data-screen="station"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const stationActive = await page.$$eval('.screen.active', els => els.map(e => e.id));
    check(`Nav → Station: screen-station active (showing: ${stationActive.join(',')})`, stationActive.includes('screen-station'));

    // Back to bridge
    await page.evaluate(() => {
      const btn = document.querySelector('.nav-btn[data-screen="bridge"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // === ENTER SPACE ===
    await page.evaluate(() => document.getElementById('btn-launch').click());
    await new Promise(r => setTimeout(r, 500));
    const postLaunch = await page.$$eval('.screen.active', els => els.map(e => e.id));
    console.log(`  After ENTER SPACE: active = ${JSON.stringify(postLaunch)} (expected: bridge, because no WebGL)`);

    // === CHECK KEY ELEMENTS ===
    const elChecks = ['action-bar', 'death-ticker', 'dock-overlay', 'auto-target-btn', 
                      'speed-control-panel', 'drone-bay', 'mobile-controls', 'comms-feed',
                      'quest-overlay', 'mission-overlay'];
    for (const id of elChecks) {
      const exists = await page.$(`#${id}`);
      check(`Element #${id}`, !!exists);
    }

    // === SUMMARY ===
    console.log('\n=== SUMMARY ===');
    console.log(`Real JS errors: ${jsErrors.length}`);
    jsErrors.forEach(e => console.log(`  ${e}`));
    console.log(`Overall: ${pass ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

  } catch (err) {
    console.log(`❌ FATAL: ${err.message}`);
    console.log(`Errors: ${jsErrors.length}`);
    jsErrors.forEach(e => console.log(`  ${e}`));
  } finally {
    await browser.close();
  }
})();
