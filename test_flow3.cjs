// Full game flow test: Title → Create → Bridge → Nav screens → Gunner attempt
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-gpu','--disable-software-rasterizer'] });
  const page = await browser.newPage();
  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error' && !txt.includes('WebGL') && !txt.includes('THREE.WebGLRenderer') && !txt.includes('ERR_CONNECTION_REFUSED')) {
      errors.push(txt);
    }
    logs.push(`[${msg.type()}] ${txt}`);
  });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));

  try {
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('#screen-title.active', { timeout: 5000 });
    console.log('✅ Title screen active');

    // Click New Game
    await page.click('[id="btn-new"]');
    await page.waitForSelector('#screen-create.active', { timeout: 5000 });
    console.log('✅ Create screen active');

    // Fill name
    const nameInput = await page.$('#pilot-name');
    if (nameInput) {
      await nameInput.type('TestPilot');
      console.log('✅ Pilot name entered');
    } else {
      console.log('❌ pilot-name input missing');
    }

    // Select a faction
    await page.waitForSelector('#faction-grid .faction-card', { timeout: 5000 });
    await page.click('#faction-grid .faction-card');
    const factionText = await page.$eval('#faction-grid .faction-card.selected', el => el.textContent).catch(() => 'none');
    console.log(`✅ Faction selected: ${factionText.substring(0, 40)}`);

    // Create character
    await page.click('#btn-create-char');
    await page.waitForSelector('#screen-bridge.active', { timeout: 5000 });
    console.log('✅ Bridge screen active');

    // Check nav-bar
    const navVisible = await page.$eval('#nav-bar', el => el.classList.contains('visible')).catch(() => false);
    console.log(`✅ Nav bar visible: ${navVisible}`);

    // Test nav buttons — click each and verify screen switches
    const navScreens = ['station', 'starmap', 'character', 'market', 'ship', 'settings', 'bridge'];
    for (const screen of navScreens) {
      const btnId = `nav-${screen}`;
      const btn = await page.$(`#${btnId}`);
      if (btn) {
        await btn.click();
        await new Promise(r => setTimeout(r, 400));
        const activeScreens = await page.$$eval('.screen.active', els => els.map(e => e.id));
        console.log(`  Nav ${screen}: active screens = ${JSON.stringify(activeScreens)}`);
      } else {
        console.log(`  Nav ${screen}: ❌ button #${btnId} not found`);
      }
    }

    // Back on bridge — try Enter Space
    await page.waitForSelector('#screen-bridge.active', { timeout: 3000 }).catch(() => {});
    const enterBtn = await page.$('#btn-launch');
    if (enterBtn) {
      await enterBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const activeAfterLaunch = await page.$$eval('.screen.active', els => els.map(e => e.id));
      console.log(`\n✅ After Enter Space: active = ${JSON.stringify(activeAfterLaunch)}`);
    } else {
      console.log('\n❌ btn-launch not found');
    }

    // Check for gameplay elements
    const elements = ['action-bar', 'death-ticker', 'dock-overlay', 'auto-target-btn', 'speed-control-panel', 'drone-bay'];
    for (const id of elements) {
      const exists = await page.$(`#${id}`);
      console.log(`  Element #${id}: ${exists ? '✅ exists' : '❌ missing'}`);
    }

    // Summary
    console.log(`\n=== SUMMARY ===`);
    console.log(`Real JS errors: ${errors.length}`);
    errors.forEach(e => console.log(`  ERROR: ${e}`));
    
    // Check server logs for errors
    const consoleErrors = logs.filter(l => l.includes('PAGE_ERROR') || (l.includes('[error]') && !l.includes('WebGL')));
    console.log(`Console errors (non-WebGL): ${consoleErrors.length}`);
    consoleErrors.slice(0, 5).forEach(e => console.log(`  ${e}`));

  } catch (err) {
    console.log(`❌ FATAL: ${err.message}`);
  } finally {
    await browser.close();
  }
})();
