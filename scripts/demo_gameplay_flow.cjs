// Puppeteer gameplay-demo flow — drives the real UI from title screen through
// pirate combat and captures ordered screenshots. Non-destructive.
// Usage:  node scripts/demo_gameplay_flow.cjs
// Pre-req: server running on http://localhost:3000

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

const OUT   = path.join(__dirname, '..', 'qa_reports', 'gameplay_demo');
const URL   = process.env.DEMO_URL || 'http://localhost:3000/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  const shot = async (name) => {
    const p = path.join(OUT, name);
    await page.screenshot({ path: p });
    console.log('   >', path.relative(process.cwd(), p));
  };

  console.log('1. loading title screen...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);
  await shot('01_title.png');

  console.log('2. click New Game -> create screen...');
  await page.click('#btn-new');
  await sleep(800);
  await page.type('#create-name', 'DEMO-RUNNER');
  await page.evaluate(() => {
    const r = document.querySelector('input[name="faction"][value="garrisons"]');
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await shot('02_create.png');

  console.log('3. LAUNCH into space...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('#screen-create button')]
      .find((b) => /LAUNCH/i.test(b.textContent));
    if (btn) btn.click();
  });
  await sleep(3500);
  await shot('03_space_ship_view.png');

  console.log('4. advance missions (m1 -> m2 -> m3 triggers pirate wave)...');
  await page.evaluate(() => window.advanceMission && window.advanceMission());
  await sleep(500);
  await page.evaluate(() => window.advanceMission && window.advanceMission());
  await sleep(2500);
  await shot('04_mission3_pirates_spawning.png');

  console.log('5. press F -> gunner mode HUD...');
  await page.keyboard.press('f');
  await sleep(1500);
  await shot('05_gunner_mode_hud.png');

  console.log('6. aim camera + fire at pirates...');
  const vp = page.viewport();
  const cx = Math.floor(vp.width / 2);
  const cy = Math.floor(vp.height / 2);
  let firstKillShot = false;
  let midShot = false;
  for (let i = 0; i < 80; i++) {
    // Rotate camera to face the closest living enemy (fire raycasts through
    // screen center, so the camera must already be aimed at the target).
    const aimed = await page.evaluate(() =>
      window.__oldEdenDebug ? window.__oldEdenDebug.aimAtNearestEnemy() : false);
    if (!aimed) {
      if (i > 5 && i % 6 === 0) {
        await page.evaluate(() => window.__oldEdenDebug && window.__oldEdenDebug.spawnWave(3));
        await sleep(700);
      }
      continue;
    }
    // Click somewhere on the canvas to trigger the in-game mousedown fire path.
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'left' });
    await sleep(60);
    await page.mouse.up({ button: 'left' });
    await sleep(200);

    // Prevent laser overheat from stalling the flow (heat increments 15/shot, caps at 100).
    if (i % 4 === 3) {
      await page.evaluate(() => window.__oldEdenDebug && window.__oldEdenDebug.coolLaser());
    }

    const kills = await page.evaluate(() =>
      window.__oldEdenDebug ? window.__oldEdenDebug.getState().pirateKills : 0);
    if (!firstKillShot && kills >= 1) {
      await shot('06_firing_at_enemies.png');
      firstKillShot = true;
    }
    if (!midShot && kills >= 3) {
      await shot('07_mid_combat.png');
      midShot = true;
    }
    if (kills >= 5) break;
  }
  if (!firstKillShot) await shot('06_firing_at_enemies.png');
  if (!midShot)       await shot('07_mid_combat.png');
  await sleep(1200);
  await shot('08_post_combat.png');

  const stats = await page.evaluate(() =>
    window.__oldEdenDebug ? window.__oldEdenDebug.getState() : null);
  console.log('\nSTATS:', JSON.stringify(stats, null, 2));
  if (pageErrors.length) console.log('\nPAGE ERRORS:', pageErrors.slice(0, 5));

  fs.writeFileSync(
    path.join(OUT, 'stats.json'),
    JSON.stringify({ stats, pageErrors, ts: new Date().toISOString() }, null, 2)
  );

  await browser.close();
  console.log('\nDONE. Screenshots + stats.json in', path.relative(process.cwd(), OUT));

  const combatProved = stats.gunnerMode === true && (stats.pirateKills || 0) >= 1;
  process.exit(combatProved ? 0 : 2);
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
