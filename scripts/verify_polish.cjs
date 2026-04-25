// Captures the new ENTER GAME button on create screen + drifting corpse in space.
const puppeteer = require('puppeteer');
const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'qa_reports', 'polish_2026-04-24');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1000);

  // Title screen
  await page.screenshot({ path: path.join(OUT, '01_title.png') });

  // Create screen — verify ENTER GAME button + DNA roll
  await page.click('#btn-new');
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, '02_create_with_enter_game.png') });

  const createInfo = await page.evaluate(() => {
    const enterBtn  = document.getElementById('btn-enter-game');
    const rerollBtn = document.getElementById('btn-reroll-genome');
    const genomePrev = document.getElementById('create-genome-preview');
    return {
      hasEnterGame:   !!enterBtn,
      enterText:      enterBtn ? enterBtn.textContent.trim() : null,
      hasReroll:      !!rerollBtn,
      genomePreviewLen: genomePrev ? genomePrev.textContent.length : 0,
    };
  });
  console.log('CREATE SCREEN:', JSON.stringify(createInfo, null, 2));

  // Fill form, click ENTER GAME (scroll into view first; modal scrolls internally)
  await page.type('#create-name', 'NEW-SOUL');
  await page.evaluate(() => {
    const r = document.querySelector('input[name="faction"][value="garrisons"]');
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    const btn = document.getElementById('btn-enter-game');
    if (btn) btn.scrollIntoView({ block: 'center' });
  });
  await sleep(300);
  await page.evaluate(() => document.getElementById('btn-enter-game').click());
  await sleep(4500); // wait for system load

  await page.screenshot({ path: path.join(OUT, '03_in_space.png') });

  // Verify drifting corpse exists in scene
  const sceneInfo = await page.evaluate(() => {
    const corpse = window.__driftingCorpse;
    if (!corpse) return { exists: false };
    return {
      exists: true,
      pos:   { x: +corpse.position.x.toFixed(2), y: +corpse.position.y.toFixed(2), z: +corpse.position.z.toFixed(2) },
      rot:   { x: +corpse.rotation.x.toFixed(2), y: +corpse.rotation.y.toFixed(2), z: +corpse.rotation.z.toFixed(2) },
      childCount: corpse.children.length,
      visible:    corpse.visible,
    };
  });
  console.log('CORPSE:', JSON.stringify(sceneInfo, null, 2));

  // Wait a bit more, take a second shot — corpse should have rotated (proves animation)
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, '04_in_space_later.png') });

  const corpseRotAfter = await page.evaluate(() => {
    const c = window.__driftingCorpse;
    return c ? { x: +c.rotation.x.toFixed(3), y: +c.rotation.y.toFixed(3), z: +c.rotation.z.toFixed(3) } : null;
  });
  console.log('CORPSE ROT AFTER:', JSON.stringify(corpseRotAfter));

  await browser.close();
  console.log('DONE -', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
