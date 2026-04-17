// screenshot_flow.cjs -- Navigate full game flow, screenshot every 5 seconds
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3847';
const OUT = path.join(__dirname, 'gameplay_screenshots', 'flow_run');
const WAIT = 5000;

function sel(id) { return '#' + id; }

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--enable-webgl','--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 }
  });
  const page = await browser.newPage();
  const errors = [];
  const log = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGE: ' + err.message));

  let shotNum = 0;
  async function snap(label) {
    shotNum++;
    const ts = String(shotNum).padStart(3, '0');
    const fname = ts + '_' + label.replace(/[^a-z0-9]/gi, '_') + '.png';
    await page.screenshot({ path: path.join(OUT, fname), fullPage: false });
    const activeScreen = await page.evaluate(() => {
      const s = document.querySelector('.screen.active');
      return s ? s.id : 'none';
    }).catch(() => '?');
    const msg = ts + ' [' + activeScreen + '] ' + label;
    log.push(msg);
    console.log(msg);
  }

  // 1. TITLE SCREEN
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await snap('01_title_screen_loaded');
  await new Promise(r => setTimeout(r, WAIT));
  await snap('02_title_after_5s');

  // 2. CLICK NEW GAME
  const newBtn = await page.$(sel('btn-new'));
  if (newBtn) {
    await newBtn.click();
    console.log('>> Clicked btn-new');
  } else {
    console.log('!! btn-new not found');
  }
  await new Promise(r => setTimeout(r, 2000));
  await snap('03_create_screen');
  await new Promise(r => setTimeout(r, WAIT));
  await snap('04_create_after_5s');

  // 3. CREATE CHARACTER
  const factions = await page.$$('.faction-card');
  if (factions.length) { await factions[0].click(); console.log('>> Selected faction 0'); }
  await new Promise(r => setTimeout(r, 1000));
  await snap('05_faction_selected');

  const nameInput = await page.$(sel('pilot-name'));
  if (nameInput) { await nameInput.click({clickCount:3}); await nameInput.type('FlowTestPilot'); }
  await new Promise(r => setTimeout(r, 500));
  await snap('06_name_entered');

  let created = false;
  for (const btn of await page.$$('button')) {
    const txt = await btn.evaluate(el => el.textContent.trim());
    if (txt.includes('Create Pilot') || txt.includes('Begin')) {
      await btn.click();
      console.log('>> Clicked: ' + txt);
      created = true;
      break;
    }
  }
  if (!created) console.log('!! Create button not found');
  await new Promise(r => setTimeout(r, 3000));
  await snap('07_bridge_initial');
  await new Promise(r => setTimeout(r, WAIT));
  await snap('08_bridge_after_5s');

  // 4. NAVIGATE ALL SCREENS
  const navOrder = ['Map','Station','Pilot','Market','Ship','Settings','Bridge'];
  for (const label of navOrder) {
    let clicked = false;
    for (const nb of await page.$$('.nav-btn')) {
      const txt = await nb.evaluate(el => el.textContent.trim());
      if (txt === label) {
        await nb.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) { console.log('!! Nav "'+label+'" not found'); continue; }
    await new Promise(r => setTimeout(r, 2000));
    await snap('09_nav_' + label);
    await new Promise(r => setTimeout(r, WAIT));
    await snap('10_nav_' + label + '_after_5s');
  }

  // 5. LAUNCH INTO SPACE (from Bridge)
  const launchBtn = await page.$(sel('btn-launch'));
  if (launchBtn) {
    await page.evaluate(el => el.click(), launchBtn);
    console.log('>> Clicked btn-launch (via evaluate)');
    await new Promise(r => setTimeout(r, 3000));
    await snap('11_space_launch');
    await new Promise(r => setTimeout(r, WAIT));
    await snap('12_space_after_5s');
    await new Promise(r => setTimeout(r, WAIT));
    await snap('13_space_after_10s');
  } else {
    console.log('!! btn-launch not found');
    await snap('11_no_launch_btn');
  }

  // 6. ENTER GUNNER MODE
  const gunnerBtn = await page.$(sel('btn-gunner'));
  if (gunnerBtn) {
    await page.evaluate(el => el.click(), gunnerBtn);
    console.log('>> Clicked btn-gunner (via evaluate)');
    await new Promise(r => setTimeout(r, 3000));
    await snap('14_gunner_mode');
    await new Promise(r => setTimeout(r, WAIT));
    await snap('15_gunner_after_5s');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1500));
    await snap('16_after_gunner_exit');
  } else {
    console.log('!! btn-gunner not found (may need to be in space first)');
    await snap('14_no_gunner');
  }

  // SUMMARY
  const jsErrors = errors.filter(e => !e.includes('WebGL') && !e.includes('GL_INVALID'));
  console.log('\n=== SUMMARY ===');
  console.log('Screenshots taken: ' + shotNum);
  console.log('JS errors (non-WebGL): ' + jsErrors.length);
  if (jsErrors.length) jsErrors.slice(0,5).forEach(e => console.log('  ERR: ' + e.substring(0,140)));
  console.log('All WebGL errors (expected headless): ' + errors.filter(e => e.includes('WebGL') || e.includes('GL_INVALID')).length);
  console.log('Flow log:');
  log.forEach(l => console.log('  ' + l));

  const report = [
    'Screenshot Flow Run - ' + new Date().toISOString(),
    'Screenshots: ' + shotNum,
    'JS errors: ' + jsErrors.length,
    ...jsErrors.slice(0,10).map(e => '  ERR: ' + e),
    '', 'Flow:', ...log
  ].join('\n');
  fs.writeFileSync(path.join(OUT, '_report.txt'), report);

  await browser.close();
  console.log('\nDone. Screenshots saved to: ' + OUT);
})();
