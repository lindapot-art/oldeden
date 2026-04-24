// Captures a mobile-viewport screenshot showing the new touch action bar.
const puppeteer = require('puppeteer');
const fs   = require('fs');
const path = require('path');

const OUT   = path.join(__dirname, '..', 'qa_reports', 'mobile_demo');
const URL   = 'http://localhost:3000/?mobile=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  // iPhone 12 Pro
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '01_title_mobile.png') });

  await page.tap('#btn-new');
  await sleep(800);
  await page.type('#create-name', 'PHONE-PILOT');
  await page.evaluate(() => {
    const r = document.querySelector('input[name="faction"][value="garrisons"]');
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.screenshot({ path: path.join(OUT, '02_create_mobile.png') });

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#screen-create button')]
      .find((b) => /LAUNCH/i.test(b.textContent));
    if (btn) btn.click();
  });
  await sleep(3500);
  await page.screenshot({ path: path.join(OUT, '03_in_space_mobile.png') });

  // Tap GUNNER
  await page.tap('#mob-btn-gunner');
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '04_gunner_mobile.png') });

  // Open menu
  await page.tap('#mob-btn-menu');
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, '05_menu_mobile.png') });

  const dump = await page.evaluate(() => {
    const bar = document.getElementById('mobile-action-bar');
    const cs  = bar ? getComputedStyle(bar) : null;
    return {
      barDisplay: cs ? cs.display : null,
      barVisible: bar ? bar.offsetHeight > 0 : false,
      hasGunnerBtn: !!document.getElementById('mob-btn-gunner'),
      hasFireBtn:   !!document.getElementById('mob-btn-fire'),
      hasDockBtn:   !!document.getElementById('mob-btn-dock'),
      hasWarpBtn:   !!document.getElementById('mob-btn-warp'),
      hasMenuBtn:   !!document.getElementById('mob-btn-menu'),
      menuOpen:     getComputedStyle(document.getElementById('mobile-menu')).display !== 'none',
      gunnerMode:   typeof window.__oldEdenDebug !== 'undefined' ? window.__oldEdenDebug.getState().gunnerMode : 'no-debug',
    };
  });
  console.log('MOBILE STATS:', JSON.stringify(dump, null, 2));

  await browser.close();
  console.log('DONE -', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
