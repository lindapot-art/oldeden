/**
 * qa_long_run.cjs — 200 screenshots at 4s intervals (~13min capture)
 *
 * Flow:
 *   1. Launch game, auto-progress through title → create → bridge → gunner
 *   2. Every 4 seconds, capture screenshot + JSON state snapshot
 *   3. Every ~5 frames, trigger an action (fire weapon, switch, move) so gameplay is dynamic
 *   4. At the end, write summary.json with per-frame state and error counts
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRAMES = 200;
const INTERVAL_MS = 4000;
const OUT = path.join(__dirname, 'qa_reports', 'long_run');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = path.join(OUT, `run_${stamp}`);
fs.mkdirSync(RUN_DIR, { recursive: true });
const SHOTS_DIR = path.join(RUN_DIR, 'screenshots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const log = (msg) => { console.log(msg); };

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const errors = { js: [], console: [], resource: [] };
  page.on('pageerror', (e) => errors.js.push({ t: Date.now(), msg: e.message, stack: (e.stack || '').split('\n').slice(0, 4).join(' | ') }));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.console.push({ t: Date.now(), msg: m.text().slice(0, 300) });
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.resource.push({ t: Date.now(), status: r.status(), url: r.url() });
  });

  log(`\n═══ QA Long Run: ${FRAMES} frames @ ${INTERVAL_MS}ms ═══`);
  log(`Output: ${RUN_DIR}\n`);

  // --- Progress into gameplay ---
  log('[boot] Loading page...');
  await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3500));

  log('[boot] Clicking New Game...');
  await page.evaluate(() => document.getElementById('btn-new')?.click());
  await new Promise(r => setTimeout(r, 1500));

  log('[boot] Filling pilot name + faction...');
  await page.evaluate(() => {
    const p = document.getElementById('pilot-name');
    if (p) p.value = 'QA_Pilot';
    const cards = document.querySelectorAll('#faction-grid .faction-card');
    if (cards.length) cards[0].click();
  });
  await new Promise(r => setTimeout(r, 700));

  log('[boot] Creating character...');
  await page.evaluate(() => document.getElementById('btn-create-char')?.click());
  await new Promise(r => setTimeout(r, 2500));

  log('[boot] Launching into gunner...');
  await page.evaluate(() => document.getElementById('btn-launch')?.click());
  await new Promise(r => setTimeout(r, 3500));

  const bootState = await page.evaluate(() => ({
    screen: document.querySelector('.screen.active')?.id,
    qa: !!window.__qa,
    threeReady: window.__qa?.threeReady,
    sceneChildren: window.__qa?.scene?.children?.length ?? 0,
    fireGatlingExists: typeof window.__qa?.fireGatlingGun === 'function'
  }));
  log(`[boot] ${JSON.stringify(bootState)}\n`);

  if (bootState.screen !== 'screen-gunner') {
    log(`!! FAILED to reach gunner — stuck on ${bootState.screen}. Aborting.`);
    await browser.close();
    process.exit(1);
  }

  // --- 200-frame capture loop with dynamic actions ---
  const frames = [];
  const startAt = Date.now();
  const actions = [
    { key: '1', label: 'laser' },
    { key: '2', label: 'railgun' },
    { key: '9', label: 'gatling_dual' },
    { key: '7', label: 'gatling_L' },
    { key: '8', label: 'gatling_R' },
    { key: 'w', label: 'forward' },
    { key: 's', label: 'back' },
    { key: 'a', label: 'left' },
    { key: 'd', label: 'right' },
    { key: 'Shift', label: 'boost' },
    { key: 'r', label: 'reload' },
    { key: 't', label: 'target' }
  ];

  for (let i = 0; i < FRAMES; i++) {
    const frameStart = Date.now();
    const action = actions[i % actions.length];

    // Press the action key
    try {
      await page.keyboard.down(action.key);
      await new Promise(r => setTimeout(r, 80));
      await page.keyboard.up(action.key);
    } catch (_e) {}

    // Every 5 frames, also fire gatling directly (bypasses render-order issues)
    if (i % 5 === 0) {
      await page.evaluate(() => {
        try { window.__qa?.fireGatlingGun?.('dual'); } catch (_e) {}
      });
    }

    // Capture state
    const snap = await page.evaluate(() => {
      const qa = window.__qa || {};
      const c = qa.c;
      const s = qa.state;
      return {
        t: Date.now(),
        screen: document.querySelector('.screen.active')?.id || 'NONE',
        activeWeapon: s?.activeWeapon,
        playerHull: s?.ship?.hull,
        playerShield: s?.ship?.shield,
        playerFuel: s?.ship?.fuel,
        credits: s?.player?.credits,
        cockpit: c ? {
          active: c.active,
          dead: c.dead,
          heat: Number((c.heat || 0).toFixed(3)),
          projectiles: c.projectiles?.length || 0,
          enemies: c.enemies?.length || 0,
          enemyBolts: c.enemyBolts?.length || 0,
          playerHasAttacked: c.playerHasAttacked
        } : null,
        scene: {
          children: qa.scene?.children?.length ?? 0,
          threeReady: qa.threeReady
        }
      };
    });

    // Screenshot
    const shotPath = path.join(SHOTS_DIR, `frame_${String(i).padStart(3, '0')}.jpg`);
    await page.screenshot({ path: shotPath, type: 'jpeg', quality: 60 });

    const frame = {
      index: i,
      elapsed: Date.now() - startAt,
      action: action.label,
      shot: path.basename(shotPath),
      ...snap
    };
    frames.push(frame);

    if (i % 10 === 0 || i === FRAMES - 1) {
      log(`[${String(i).padStart(3,'0')}/${FRAMES}] screen=${snap.screen} weapon=${snap.activeWeapon} hull=${snap.playerHull} proj=${snap.cockpit?.projectiles} enemies=${snap.cockpit?.enemies} heat=${snap.cockpit?.heat} jsErr=${errors.js.length} conErr=${errors.console.length}`);
    }

    // Wait remainder of interval
    const elapsed = Date.now() - frameStart;
    const wait = Math.max(0, INTERVAL_MS - elapsed);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
  }

  // --- Summary ---
  const summary = {
    run: stamp,
    frames: FRAMES,
    intervalMs: INTERVAL_MS,
    totalDurationMs: Date.now() - startAt,
    boot: bootState,
    errors: {
      jsTotal: errors.js.length,
      consoleTotal: errors.console.length,
      resourceTotal: errors.resource.length,
      jsUnique: [...new Set(errors.js.map(e => e.msg))].slice(0, 20),
      consoleUnique: [...new Set(errors.console.map(e => e.msg))].slice(0, 20),
      resourceSample: errors.resource.slice(0, 20)
    },
    firstFrame: frames[0],
    lastFrame: frames[frames.length - 1],
    weaponUseCounts: (() => {
      const counts = {};
      frames.forEach(f => { counts[f.action] = (counts[f.action] || 0) + 1; });
      return counts;
    })(),
    screensSeen: [...new Set(frames.map(f => f.screen))],
    maxProjectiles: Math.max(...frames.map(f => f.cockpit?.projectiles || 0)),
    maxEnemies: Math.max(...frames.map(f => f.cockpit?.enemies || 0)),
    maxHeat: Math.max(...frames.map(f => f.cockpit?.heat || 0)),
    playerDiedAt: frames.find(f => f.cockpit?.dead)?.index ?? null
  };

  fs.writeFileSync(path.join(RUN_DIR, 'frames.json'), JSON.stringify(frames, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'errors.json'), JSON.stringify(errors, null, 2));

  log(`\n══ DONE ══`);
  log(`Frames captured: ${frames.length}`);
  log(`JS errors: ${errors.js.length}  Console errors: ${errors.console.length}  404s: ${errors.resource.length}`);
  log(`Max projectiles alive: ${summary.maxProjectiles}`);
  log(`Max enemies alive: ${summary.maxEnemies}`);
  log(`Max heat: ${summary.maxHeat}`);
  log(`Player died at frame: ${summary.playerDiedAt}`);
  log(`Screens seen: ${summary.screensSeen.join(', ')}`);
  log(`Report: ${RUN_DIR}`);

  await browser.close();
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
