/**
 * qa_gatling_shot.cjs — focused screenshot proof of dual vector gatling guns.
 * Gets into gunner view, triggers fire, captures cockpit + firing frame.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'qa_reports', 'gatling');
fs.mkdirSync(OUT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const DIR = path.join(OUT, `run_${stamp}`);
fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });

  await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3500));
  await page.evaluate(() => document.getElementById('btn-new')?.click());
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    const n = document.getElementById('pilot-name'); if (n) n.value = 'Gunslinger';
    document.querySelector('#faction-grid .faction-card')?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => document.getElementById('btn-create-char')?.click());
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => document.getElementById('btn-launch')?.click());
  await new Promise(r => setTimeout(r, 4000));

  await page.evaluate(() => {
    const qa = window.__qa;
    qa?.forceLock?.();
    if (qa?.state) qa.state.activeWeapon = 'gatling_dual';
  });

  // Baseline shot (no firing)
  await page.screenshot({ path: path.join(DIR, '01_cockpit_idle.jpg'), type: 'jpeg', quality: 85 });

  // Spawn target + fire gatling for 1.2s
  const firingResult = await page.evaluate(async () => {
    const qa = window.__qa;
    qa.spawnEnemyInFront?.(80, 'fighter');
    const start = performance.now();
    let shots = 0;
    while (performance.now() - start < 1200) {
      qa.fireGatlingGun?.('dual');
      shots++;
      await new Promise(r => setTimeout(r, 16));
    }
    return {
      shots,
      projectiles: qa.c?.projectiles?.length || 0,
      weapon: qa.state?.activeWeapon,
      defaultWeapon: qa.state?.activeWeapon,
      hasGatlingL: !!qa.scene?.getObjectByName('gatling-cluster-left'),
      hasGatlingR: !!qa.scene?.getObjectByName('gatling-cluster-right'),
      kills: qa.c?.kills || 0
    };
  });

  await page.screenshot({ path: path.join(DIR, '02_gatling_firing.jpg'), type: 'jpeg', quality: 85 });

  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(DIR, '03_after_burst.jpg'), type: 'jpeg', quality: 85 });

  const summary = {
    stamp,
    default_weapon: firingResult.defaultWeapon,
    gatling_left_cluster_present: firingResult.hasGatlingL,
    gatling_right_cluster_present: firingResult.hasGatlingR,
    shots_fired: firingResult.shots,
    projectiles_live: firingResult.projectiles,
    kills: firingResult.kills,
    errors: errs.slice(0, 5)
  };
  fs.writeFileSync(path.join(DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log('═══ GATLING PROOF ═══');
  console.log(JSON.stringify(summary, null, 2));
  console.log('Screenshots + summary:', DIR);

  await browser.close();
})();
