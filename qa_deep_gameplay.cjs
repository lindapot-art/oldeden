/**
 * qa_deep_gameplay.cjs — actually plays the game.
 *  - Holds W+Shift continuously (no release between frames)
 *  - Periodically taps strafe keys without releasing W
 *  - Force-spawns enemies if combat stays empty
 *  - Captures screenshot every 2.5s for 80 frames (~3.3 min)
 *  - Tracks position, kills, hull, weapon label, comms count, errors
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRAMES = 80;
const INTERVAL_MS = 2500;
const OUT = path.join(__dirname, 'qa_reports', 'deep_gameplay');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = path.join(OUT, `run_${stamp}`);
const SHOTS_DIR = path.join(RUN_DIR, 'screenshots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });
const log = (m) => console.log(m);

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = { js: [], console: [], resource404: [] };
  page.on('pageerror', (e) => errors.js.push({ t: Date.now(), msg: e.message, stack: (e.stack||'').split('\n').slice(0,3).join(' | ') }));
  page.on('console', (m) => { if (m.type() === 'error') errors.console.push({ t: Date.now(), msg: m.text().slice(0,250) }); });
  page.on('response', (r) => { if (r.status() >= 400) errors.resource404.push({ url: r.url(), status: r.status() }); });

  log(`\n═══ DEEP GAMEPLAY QA: ${FRAMES} frames @ ${INTERVAL_MS}ms ═══`);
  log(`Output: ${RUN_DIR}\n`);

  await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3500));
  await page.evaluate(() => document.getElementById('btn-new')?.click());
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    const n = document.getElementById('pilot-name'); if (n) n.value = 'DeepGamer';
    document.querySelector('#faction-grid .faction-card')?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => document.getElementById('btn-create-char')?.click());
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => document.getElementById('btn-launch')?.click());
  await new Promise(r => setTimeout(r, 4000));

  // Force lock + hold W + Shift
  await page.evaluate(() => {
    const qa = window.__qa;
    qa?.forceLock?.();
    qa?.press?.('w');
    qa?.press?.('shift');
    if (qa?.state) qa.state.activeWeapon = 'gatling_dual';
  });

  const boot = await page.evaluate(() => ({
    screen: document.querySelector('.screen.active')?.id,
    threeReady: window.__qa?.threeReady,
    locked: window.__qa?.c?.locked,
    weapon: window.__qa?.state?.activeWeapon
  }));
  log(`[boot] ${JSON.stringify(boot)}\n`);
  if (boot.screen !== 'screen-gunner') {
    log('!! Boot failed — not on gunner screen');
    await browser.close();
    process.exit(1);
  }

  const frames = [];
  const startAt = Date.now();
  const strafePattern = ['', 'a', '', 'd', '', '', 'a', 's', '', 'd'];

  for (let i = 0; i < FRAMES; i++) {
    const frameStart = Date.now();

    await page.evaluate((idx, strafe) => {
      const qa = window.__qa;
      if (!qa) return;
      qa.forceLock();
      qa.press('w');
      qa.press('shift');
      if (strafe) {
        qa.press(strafe);
        setTimeout(() => qa.release(strafe), 800);
      }
      // Force enemy spawn every 4 frames if none alive
      if (qa.c?.enemies?.length === 0 && idx % 2 === 0) {
        try {
          if (typeof spawnEnemy === 'function') spawnEnemy();
          // fallback: bump spawn timer to be way past trigger
          if (qa.c) qa.c.enemySpawnTimer = 99999;
        } catch(_) {}
      }
      // Fire weapons
      try {
        if (qa.state.activeWeapon === 'gatling_dual') qa.fireGatlingGun?.('dual');
        else if (qa.state.activeWeapon === 'laser') qa.fireLaser?.();
        else if (qa.state.activeWeapon === 'railgun') qa.fireRailgun?.();
      } catch(_) {}
      // Cycle weapon every 16 frames
      if (idx > 0 && idx % 16 === 0) {
        const cycle = ['gatling_dual', 'laser', 'railgun', 'gatling_dual'];
        qa.state.activeWeapon = cycle[Math.floor(idx / 16) % cycle.length];
      }
    }, i, strafePattern[i % strafePattern.length]);

    const snap = await page.evaluate(() => {
      const qa = window.__qa || {};
      const c = qa.c, s = qa.state;
      const ship = qa.ship?.();
      return {
        screen: document.querySelector('.screen.active')?.id,
        locked: c?.locked,
        weapon: s?.activeWeapon,
        hull: c?.hull,
        shield: c?.shield,
        heat: Number((c?.heat || 0).toFixed(2)),
        kills: c?.kills,
        cycle: c?.cycle,
        score: c?.score,
        credits: s?.player?.credits,
        projectiles: c?.projectiles?.length || 0,
        enemies: c?.enemies?.length || 0,
        enemyBolts: c?.enemyBolts?.length || 0,
        commsLogLen: s?.commsLog?.length || 0,
        shipPos: ship?.position ? { x: +ship.position.x.toFixed(1), y: +ship.position.y.toFixed(1), z: +ship.position.z.toFixed(1) } : null,
        speed: Number((s?.flight?.speed || 0).toFixed(1)),
        dead: c?.dead
      };
    });

    const shot = path.join(SHOTS_DIR, `frame_${String(i).padStart(3, '0')}.jpg`);
    await page.screenshot({ path: shot, type: 'jpeg', quality: 70 });
    frames.push({ i, elapsed: Date.now() - startAt, ...snap });

    if (i % 5 === 0 || i === FRAMES - 1) {
      log(`[${String(i).padStart(3,'0')}] pos=${snap.shipPos ? `${snap.shipPos.x},${snap.shipPos.y},${snap.shipPos.z}` : 'n/a'} spd=${snap.speed} kills=${snap.kills} hull=${snap.hull} shd=${snap.shield} weap=${snap.weapon} heat=${snap.heat} enemies=${snap.enemies} proj=${snap.projectiles} eBolts=${snap.enemyBolts} jsErr=${errors.js.length} 404=${errors.resource404.length}`);
    }

    const wait = Math.max(0, INTERVAL_MS - (Date.now() - frameStart));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
  }

  // Release keys
  await page.evaluate(() => { ['w','a','s','d','shift'].forEach(k => window.__qa?.release(k)); });

  const dist = frames[0]?.shipPos && frames[frames.length-1]?.shipPos
    ? Math.hypot(
        frames[frames.length-1].shipPos.x - frames[0].shipPos.x,
        frames[frames.length-1].shipPos.y - frames[0].shipPos.y,
        frames[frames.length-1].shipPos.z - frames[0].shipPos.z
      ).toFixed(1)
    : 'n/a';

  const summary = {
    run: stamp, frames: FRAMES, intervalMs: INTERVAL_MS, totalDurationMs: Date.now() - startAt, boot,
    errors: {
      jsTotal: errors.js.length, consoleTotal: errors.console.length, r404: errors.resource404.length,
      jsUnique: [...new Set(errors.js.map(e => e.msg))].slice(0, 10),
      consoleUnique: [...new Set(errors.console.map(e => e.msg.split('\n')[0].slice(0,180)))].slice(0, 10)
    },
    stats: {
      totalKills: frames[frames.length - 1]?.kills || 0,
      finalScore: frames[frames.length - 1]?.score || 0,
      maxProjectiles: Math.max(...frames.map(f => f.projectiles || 0)),
      maxEnemies: Math.max(...frames.map(f => f.enemies || 0)),
      maxEnemyBolts: Math.max(...frames.map(f => f.enemyBolts || 0)),
      maxHeat: Math.max(...frames.map(f => f.heat || 0)),
      minHull: Math.min(...frames.map(f => f.hull ?? 100)),
      minShield: Math.min(...frames.map(f => f.shield ?? 100)),
      maxSpeed: Math.max(...frames.map(f => f.speed || 0)),
      distanceTraveled: dist,
      weaponsUsed: [...new Set(frames.map(f => f.weapon))],
      diedAt: frames.find(f => f.dead)?.i ?? null,
      screensVisited: [...new Set(frames.map(f => f.screen))]
    }
  };

  fs.writeFileSync(path.join(RUN_DIR, 'frames.json'), JSON.stringify(frames, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'errors.json'), JSON.stringify(errors, null, 2));

  log(`\n══ DEEP GAMEPLAY DONE ══`);
  log(`Frames: ${frames.length}  Distance: ${dist}m  MaxSpeed: ${summary.stats.maxSpeed}`);
  log(`Kills: ${summary.stats.totalKills}  MaxEnemies: ${summary.stats.maxEnemies}  MaxBolts: ${summary.stats.maxEnemyBolts}`);
  log(`MinHull: ${summary.stats.minHull}  MinShield: ${summary.stats.minShield}  MaxHeat: ${summary.stats.maxHeat}`);
  log(`Weapons: ${summary.stats.weaponsUsed.join(', ')}`);
  log(`JS errors: ${errors.js.length}  Console: ${errors.console.length}  404: ${errors.resource404.length}`);
  log(`Report: ${RUN_DIR}`);

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
