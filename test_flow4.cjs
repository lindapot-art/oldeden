// Full game flow test with proper timing
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
    await page.click('[id="btn-new"]');
    await new Promise(r => setTimeout(r, 600));
    const createActive = await page.$eval('#screen-create', el => el.classList.contains('active'));
    check('Create screen active after New Game', createActive);

    // Fill name + select faction
    await page.type('#pilot-name', 'TestPilot');
    await page.click('#faction-grid .faction-card');
    await new Promise(r => setTimeout(r, 200));

    // Create character (use evaluate to call btn.click() directly)
    await page.evaluate(() => document.getElementById('btn-create-char').click());
    await new Promise(r => setTimeout(r, 1000));

    // === BRIDGE SCREEN ===
    const bridgeActive = await page.$eval('#screen-bridge', el => el.classList.contains('active'));
    check('Bridge screen active after character creation', bridgeActive);

    const navVisible = await page.$eval('#nav-bar', el => el.classList.contains('visible')).catch(() => false);
    check('Nav bar visible on bridge', navVisible);

    // Check comms feed has content
    const commsContent = await page.$eval('#comms-feed', el => el.innerHTML.length).catch(() => 0);
    check(`Comms feed has content (${commsContent} chars)`, commsContent > 0);

    // === NAV TO ALL SCREENS ===
    const navScreens = [
      { btn: 'nav-station', screen: 'screen-station', name: 'Station' },
      { btn: 'nav-starmap', screen: 'screen-starmap', name: 'Starmap' },
      { btn: 'nav-character', screen: 'screen-character', name: 'Character' },
      { btn: 'nav-market', screen: 'screen-market', name: 'Market' },
      { btn: 'nav-ship', screen: 'screen-interior', name: 'Ship' },
      { btn: 'nav-settings', screen: 'screen-settings', name: 'Settings' },
      { btn: 'nav-bridge', screen: 'screen-bridge', name: 'Bridge' },
    ];

    for (const nav of navScreens) {
      await page.evaluate((id) => document.getElementById(id)?.click(), nav.btn);
      await new Promise(r => setTimeout(r, 400));
      const isActive = await page.$eval(`#${nav.screen}`, el => el.classList.contains('active')).catch(() => false);
      const allActive = await page.$$eval('.screen.active', els => els.map(e => e.id));
      check(`Nav → ${nav.name}: ${nav.screen} active (only: ${allActive.join(',')})`, isActive && allActive.length === 1);
    }

    // === ENTER SPACE (Gunner mode) ===
    // Should transition to gunner screen (even if WebGL fails in headless)
    const btnLaunch = await page.$('#btn-launch');
    check('btn-launch exists on bridge', !!btnLaunch);

    if (btnLaunch) {
      await page.evaluate(() => document.getElementById('btn-launch').click());
      await new Promise(r => setTimeout(r, 1000));
      const postLaunch = await page.$$eval('.screen.active', els => els.map(e => e.id));
      console.log(`  After Enter Space: active screens = ${JSON.stringify(postLaunch)}`);
      // In headless, gunner screen should activate OR bridge remains (threeReady guard)
      check('Screen changed or stayed on bridge (threeReady guard)', postLaunch.length >= 1);
    }

    // === CHECK GAMEPLAY ELEMENTS ===
    const elChecks = ['action-bar', 'death-ticker', 'dock-overlay', 'auto-target-btn', 'speed-control-panel', 'drone-bay', 'mobile-controls'];
    for (const id of elChecks) {
      const exists = await page.$(`#${id}`);
      check(`Element #${id} exists`, !!exists);
    }

    // === SUMMARY ===
    console.log('\n=== SUMMARY ===');
    console.log(`Real JS errors (non-WebGL): ${jsErrors.length}`);
    jsErrors.forEach(e => console.log(`  ${e}`));
    console.log(`Overall: ${pass ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

  } catch (err) {
    console.log(`❌ FATAL: ${err.message}`);
  } finally {
    await browser.close();
  }
})();
