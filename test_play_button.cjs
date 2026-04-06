const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Page loaded.');
    const titleVisible = await page.$eval('#screen-title', el => { const style = window.getComputedStyle(el); return style.display !== 'none'; });
    console.log('Title screen visible:', titleVisible);
    const btnNewState = await page.$eval('#btn-new', el => ({ text: el.textContent.trim(), disabled: el.disabled, display: window.getComputedStyle(el).display, pointerEvents: window.getComputedStyle(el).pointerEvents }));
    console.log('New Game button:', JSON.stringify(btnNewState));
    const btnContState = await page.$eval('#btn-continue', el => ({ text: el.textContent.trim(), disabled: el.disabled, display: window.getComputedStyle(el).display }));
    console.log('Continue button:', JSON.stringify(btnContState));
    console.log('Clicking New Game...');
    await page.click('#btn-new');
    await new Promise(r => setTimeout(r, 1000));
    const activeScreen = await page.$$eval('.screen.active', els => els.map(e => e.id));
    console.log('Active screen(s) after click:', activeScreen);
    const createVisible = await page.$eval('#screen-create', el => { const style = window.getComputedStyle(el); return { display: style.display, visibility: style.visibility, opacity: style.opacity }; }).catch(e => 'NOT FOUND');
    console.log('Create screen style:', JSON.stringify(createVisible));
    const factionCount = await page.$eval('#faction-grid', el => el.children.length).catch(() => 0);
    console.log('Faction cards rendered:', factionCount);
    if (factionCount > 0) {
      console.log('Selecting first faction...');
      await page.click('#faction-grid .faction-card');
      await new Promise(r => setTimeout(r, 200));
      console.log('Entering pilot name...');
      await page.type('#pilot-name', 'TestPilot');
      await new Promise(r => setTimeout(r, 200));
      console.log('Clicking Create Pilot...');
      await page.click('#btn-create-char');
      await new Promise(r => setTimeout(r, 1000));
      const activeAfterCreate = await page.$$eval('.screen.active', els => els.map(e => e.id));
      console.log('Active screen(s) after create:', activeAfterCreate);
      const bridgeStyle = await page.$eval('#screen-bridge', el => ({ display: window.getComputedStyle(el).display, classList: [...el.classList] }));
      console.log('Bridge screen:', JSON.stringify(bridgeStyle));
      const navBar = await page.$eval('#nav-bar', el => ({ display: window.getComputedStyle(el).display, classList: [...el.classList] }));
      console.log('Nav bar:', JSON.stringify(navBar));
      if (navBar.display !== 'none') {
        console.log('Clicking Gunner button...');
        const gunnerBtn = await page.$('button[data-screen="gunner"]');
        if (gunnerBtn) {
          await gunnerBtn.click();
          await new Promise(r => setTimeout(r, 2000));
          const activeAfterGunner = await page.$$eval('.screen.active', els => els.map(e => e.id));
          console.log('Active screen(s) after Gunner click:', activeAfterGunner);
          const combatActive = await page.evaluate(() => { return typeof state !== 'undefined' ? state.combat.active : 'state not found'; });
          console.log('Combat active:', combatActive);
          const threeReady = await page.evaluate(() => { return typeof threeReady !== 'undefined' ? threeReady : 'not accessible'; });
          console.log('threeReady:', threeReady);
        }
      }
    }
    console.log('=== BROWSER CONSOLE ERRORS ===');
    if (errors.length === 0) console.log('None');
    else errors.forEach(e => console.log('ERROR:', e));
  } catch(err) {
    console.error('TEST FAILED:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
