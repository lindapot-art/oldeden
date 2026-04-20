const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.QA_PORT ? `http://localhost:${process.env.QA_PORT}` : 'http://localhost:3847';
const OUT = path.join(__dirname, '..', 'gameplay_screenshots', 'visual_200');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(OUT, { withFileTypes: true })) {
  fs.rmSync(path.join(OUT, entry.name), { recursive: true, force: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--enable-webgl', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });
  const page = await browser.newPage();
  const errors = [];
  let shot = 0;
  const flow = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
  });
  page.on('pageerror', error => errors.push('[page] ' + error.message));

  async function snap(label) {
    shot += 1;
    const fileName = `${String(shot).padStart(3, '0')}_${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.png`;
    await page.screenshot({ path: path.join(OUT, fileName), fullPage: false });
    const state = await page.evaluate(() => ({
      screen: document.querySelector('.screen.active')?.id || 'none',
      bodyScreen: document.body.dataset.screen || 'none',
      transition: document.getElementById('screen-transition-overlay')?.classList.contains('active') || false,
    }));
    const logLine = `${String(shot).padStart(3, '0')} | ${label} | screen=${state.screen} | body=${state.bodyScreen} | transition=${state.transition}`;
    flow.push(logLine);
    console.log(logLine);
  }

  async function clickButtonText(text) {
    const clicked = await page.evaluate((wanted) => {
      const buttons = Array.from(document.querySelectorAll('button, .nav-btn'));
      const match = buttons.find(button => button.textContent.trim() === wanted || button.textContent.trim().includes(wanted));
      if (!match) return false;
      match.click();
      return true;
    }, text);
    return clicked;
  }

  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  for (let i = 0; i < 10; i++) {
    await snap(`title_idle_${i + 1}`);
    await delay(500);
  }

  await clickButtonText('New Game');
  for (let i = 0; i < 10; i++) {
    await snap(`create_idle_${i + 1}`);
    await delay(500);
  }

  await page.click('.faction-card');
  await page.type('#pilot-name', 'VisualAuditPilot');
  await snap('create_filled');
  await clickButtonText('Create Pilot');

  for (let i = 0; i < 10; i++) {
    await snap(`bridge_idle_${i + 1}`);
    await delay(500);
  }

  const navTargets = ['Map', 'Station', 'Pilot', 'Market', 'Ship', 'Settings', 'Bridge'];
  for (const target of navTargets) {
    await clickButtonText(target);
    for (let i = 0; i < 6; i++) {
      await snap(`nav_${target}_${i + 1}`);
      await delay(350);
    }
  }

  await clickButtonText('ENTER SPACE');
  for (let i = 0; i < 80; i++) {
    await snap(`space_${i + 1}`);
    if ((i + 1) % 10 === 0) {
      await page.keyboard.press('KeyW').catch(() => {});
    }
    await delay(500);
  }

  await page.keyboard.press('Escape').catch(() => {});
  await delay(1000);
  await clickButtonText('Bridge').catch(() => {});
  await delay(800);
  await clickButtonText('Ship');
  for (let i = 0; i < 20; i++) {
    await snap(`interior_${i + 1}`);
    await delay(350);
  }

  await clickButtonText('Bridge');
  await clickButtonText('ENTER SPACE');
  for (let i = 0; i < 27; i++) {
    await snap(`combat_return_${i + 1}`);
    await delay(400);
  }

  fs.writeFileSync(path.join(OUT, '_flow.txt'), flow.join('\n') + '\n' + errors.join('\n'));
  console.log(`Captured ${shot} screenshots to ${OUT}`);
  if (shot !== 200) {
    console.error(`Expected 200 screenshots, got ${shot}`);
    process.exitCode = 1;
  }
  if (errors.length > 0) {
    console.error(`Collected ${errors.length} browser errors`);
  }
  await browser.close();
})();