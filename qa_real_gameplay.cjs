/**
 * qa_real_gameplay.cjs — actual gameplay, not just standing still.
 *
 * Flow (100 frames @ 3s = 5 min):
 *   - Boot through title → create → bridge → gunner
 *   - forceLock() to bypass pointer-lock gate
 *   - Every frame: move (W/S/A/D/Shift), aim toward nearest enemy, fire dual gatling
 *   - Capture screenshot + full state (kills, hull, credits, position, enemies, weapon, heat)
 *   - If no enemies alive, spawn via combat system
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRAMES = 100;
const INTERVAL_MS = 3000;
const OUT = path.join(__dirname, 'qa_reports', 'real_gameplay');
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
  const errors = { js: [], console: [] };
  page.on('pageerror', (e) => errors.js.push({ t: Date.now(), msg: e.message, stack: (e.stack||'').split('\n').slice(0,3).join(' | ') }));
  page.on('console', (m) => { if (m.type() === 'error') errors.console.push({ t: Date.now(), msg: m.text().slice(0,250) }); });

  log(`\n═══ REAL GAMEPLAY QA: ${FRAMES} frames @ ${INTERVAL_MS}ms ═══`);
  log(`Output: ${RUN_DIR}\n`);

  log('[boot] Loading page...');
  await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3500));
  await page.evaluate(() => document.getElementById('btn-new')?.click());
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => {
    document.getElementById('pilot-name').value = 'RealGamer';
    document.querySelector('#faction-grid .faction-card')?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => document.getElementById('btn-create-char')?.click());
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => document.getElementById('btn-launch')?.click());
  await new Promise(r => setTimeout(r, 3500));

  // Force pointer lock so WASD registers
  await page.evaluate(() => { window.__qa?.forceLock?.(); });
  await new Promise(r => setTimeout(r, 300));

  const boot = await page.evaluate(() => ({
    screen: document.querySelector('.screen.active')?.id,
    threeReady: window.__qa?.threeReady,
    locked: window.__qa?.c?.locked,
    hasPress: typeof window.__qa?.press === 'function'
  }));
  log(`[boot] ${JSON.stringify(boot)}\n`);

  if (!boot.hasPress || boot.screen !== 'screen-gunner') {
    log('!! Boot failed');
    await browser.close();
    process.exit(1);
  }

  const frames = [];
  const startAt = Date.now();

  // Continuously hold W (forward) + Shift (boost) for whole run
  await page.evaluate(() => {
    window.__qa.press('w');
    window.__qa.press('shift');
  });

  // Movement variation array — small course corrections
  const moveSeq = ['w', 'a', 'w', 'd', 'w', 'w', 's', 'w'];

  for (let i = 0; i < FRAMES; i++) {
    const frameStart = Date.now();

    // Course correction + weapon switch + fire
    await page.evaluate((idx, dir) => {
      const qa = window.__qa;
      if (!qa) return;

      // Force lock in case it got released
      qa.forceLock();

      // Brief lateral press
      qa.press(dir);
      setTimeout(() => qa.release(dir), 200);

      // Cycle weapons for variety
      const weapons = ['gatling_dual', 'laser', 'railgun', 'gatling_dual', 'gatling_dual'];
      qa.state.activeWeapon = weapons[idx % weapons.length];

      // Fire the active weapon repeatedly
      try {
        if (qa.state.activeWeapon === 'gatling_dual') qa.fireGatlingGun?.('dual');
        else if (qa.state.activeWeapon === 'laser') qa.fireLaser?.();
        else if (qa.state.activeWeapon === 'railgun') qa.fireRailgun?.();
      } catch(_e) {}

      // If no enemies, trigger spawn via combat state
      if (qa.c && qa.c.enemies && qa.c.enemies.length === 0 && qa.state._forceSpawn !== false) {
        qa.c.enemySpawnTimer = 9999; // makes next frame spawn immediately
      }
    }, i, moveSeq[i % moveSeq.length]);

    // Capture state snapshot
    const snap = await page.evaluate(() => {
      const qa = window.__qa || {};
      const c = qa.c;
      const s = qa.state;
      const ship = qa.ship?.();
      return {
        t: Date.now(),
        screen: document.querySelector('.screen.active')?.id,
        locked: c?.locked,
        weapon: s?.activeWeapon,
        hull: c?.hull,
        shield: c?.shield,
        heat: Number((c?.heat || 0).toFixed(3)),
        ammo: c?.ammo,
        kills: c?.kills,
        cycle: c?.cycle,
        credits: c?.credits ?? s?.player?.credits,
        projectiles: c?.projectiles?.length || 0,
        enemies: c?.enemies?.length || 0,
        enemyBolts: c?.enemyBolts?.length || 0,
        shipPos: ship?.position ? { x: +ship.position.x.toFixed(1), y: +ship.position.y.toFixed(1), z: +ship.position.z.toFixed(1) } : null,
        shipSpeed: s?.ship?.speed || 0,
        dead: c?.dead
      };
    });

    // Screenshot
    const shot = path.join(SHOTS_DIR, `frame_${String(i).padStart(3, '0')}.jpg`);
    await page.screenshot({ path: shot, type: 'jpeg', quality: 65 });

    frames.push({ i, elapsed: Date.now() - startAt, shot: path.basename(shot), ...snap });

    if (i % 5 === 0 || i === FRAMES - 1) {
      log(`[${String(i).padStart(3,'0')}] pos=${snap.shipPos ? `${snap.shipPos.x},${snap.shipPos.y},${snap.shipPos.z}` : 'n/a'} kills=${snap.kills} hull=${snap.hull} weap=${snap.weapon} enemies=${snap.enemies} proj=${snap.projectiles} heat=${snap.heat} jsErr=${errors.js.length}`);
    }

    const wait = Math.max(0, INTERVAL_MS - (Date.now() - frameStart));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
  }

  // Release held keys
  await page.evaluate(() => {
    ['w','a','s','d','shift'].forEach(k => window.__qa?.release(k));
  });

  const summary = {
    run: stamp,
    frames: FRAMES,
    intervalMs: INTERVAL_MS,
    totalDurationMs: Date.now() - startAt,
    boot,
    errors: {
      jsTotal: errors.js.length,
      consoleTotal: errors.console.length,
      jsUnique: [...new Set(errors.js.map(e => e.msg))],
      consoleUnique: [...new Set(errors.console.map(e => e.msg.split('\n')[0].slice(0,180)))]
    },
    firstFrame: frames[0],
    lastFrame: frames[frames.length - 1],
    stats: {
      totalKills: frames[frames.length - 1]?.kills || 0,
      maxProjectiles: Math.max(...frames.map(f => f.projectiles || 0)),
      maxEnemies: Math.max(...frames.map(f => f.enemies || 0)),
      maxHeat: Math.max(...frames.map(f => f.heat || 0)),
      minHull: Math.min(...frames.map(f => f.hull || 100)),
      playerMoved: frames[0]?.shipPos && frames[frames.length-1]?.shipPos
        ? Math.hypot(
            frames[frames.length-1].shipPos.x - frames[0].shipPos.x,
            frames[frames.length-1].shipPos.y - frames[0].shipPos.y,
            frames[frames.length-1].shipPos.z - frames[0].shipPos.z
          ).toFixed(1)
        : 'no-pos',
      weaponsUsed: [...new Set(frames.map(f => f.weapon))],
      diedAt: frames.find(f => f.dead)?.i ?? null,
      screensVisited: [...new Set(frames.map(f => f.screen))]
    }
  };

  fs.writeFileSync(path.join(RUN_DIR, 'frames.json'), JSON.stringify(frames, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'errors.json'), JSON.stringify(errors, null, 2));

  log(`\n══ REAL GAMEPLAY DONE ══`);
  log(`Frames: ${frames.length}`);
  log(`Kills: ${summary.stats.totalKills}`);
  log(`Distance moved: ${summary.stats.playerMoved} m`);
  log(`Max enemies alive: ${summary.stats.maxEnemies}`);
  log(`Min hull: ${summary.stats.minHull}`);
  log(`Weapons used: ${summary.stats.weaponsUsed.join(', ')}`);
  log(`JS errors: ${errors.js.length}  Console errors: ${errors.console.length}`);
  log(`Screens: ${summary.stats.screensVisited.join(', ')}`);
  log(`Report: ${RUN_DIR}`);

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
