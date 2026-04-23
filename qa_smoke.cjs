/** qa_smoke.cjs — 20 frames @ 2s = 40s smoke test */
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = { js: [], console: [] };
  page.on('pageerror', (e) => errors.js.push({ msg: e.message, stack: (e.stack || '').split('\n').slice(0,4).join(' | ') }));
  page.on('console', (m) => { if (m.type() === 'error') errors.console.push(m.text().slice(0, 250)); });

  await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => document.getElementById('btn-new')?.click());
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    document.getElementById('pilot-name').value = 'Smoke';
    document.querySelector('#faction-grid .faction-card')?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => document.getElementById('btn-create-char')?.click());
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => document.getElementById('btn-launch')?.click());
  await new Promise(r => setTimeout(r, 3000));

  console.log('[boot]', JSON.stringify(await page.evaluate(() => ({
    screen: document.querySelector('.screen.active')?.id,
    threeReady: window.__qa?.threeReady
  }))));

  // 20 frames, 2s each — fire and check errors over time
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => { try { window.__qa?.fireGatlingGun?.('dual'); } catch(e){} });
    await new Promise(r => setTimeout(r, 2000));
    const s = await page.evaluate(() => ({
      screen: document.querySelector('.screen.active')?.id,
      proj: window.__qa?.c?.projectiles?.length,
      enemies: window.__qa?.c?.enemies?.length
    }));
    if (i % 5 === 0 || i === 19) console.log(`[${i}] screen=${s.screen} proj=${s.proj} enemies=${s.enemies} jsErr=${errors.js.length} conErr=${errors.console.length}`);
  }

  console.log('\n══ UNIQUE JS ERRORS ══');
  const jsUnique = {};
  errors.js.forEach(e => { const k = e.msg + ' @ ' + e.stack; jsUnique[k] = (jsUnique[k]||0)+1; });
  Object.entries(jsUnique).forEach(([k,n]) => console.log(`  [${n}x] ${k}`));

  console.log('\n══ UNIQUE CONSOLE ERRORS ══');
  const conUnique = {};
  errors.console.forEach(m => { const k = (m.split('\n')[0]).slice(0,180); conUnique[k] = (conUnique[k]||0)+1; });
  Object.entries(conUnique).forEach(([k,n]) => console.log(`  [${n}x] ${k}`));

  await browser.close();
})();
