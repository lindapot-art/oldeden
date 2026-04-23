/**
 * Visual QA — gameplay screenshot series
 * Goes through: title → new game → create → launch → gunner → fire weapons
 * Saves screenshots at each stage. Reports FACTS only.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'qa_reports', 'gameplay_series');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = [];
const R = (msg) => { console.log(msg); report.push(msg); };

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

  const jsErrors = [];
  const consoleErrors = [];
  const resource404s = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('response', (res) => {
    const s = res.status();
    if (s >= 400) resource404s.push(`${s} ${res.url()}`);
  });

  R(`\n═══ Visual QA Gameplay Series ${stamp} ═══\n`);

  try {
    // 1. Load title
    R('[1] Loading http://localhost:3847 ...');
    await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(OUT, `01_title_${stamp}.png`) });

    const titleState = await page.evaluate(() => ({
      title: document.title,
      currentScreen: document.querySelector('.screen.active')?.id || 'NONE',
      hasNewGameBtn: !!document.getElementById('btn-new'),
      newGameVisible: (() => {
        const b = document.getElementById('btn-new');
        if (!b) return false;
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })(),
      hasStateObj: !!window.state,
      hasCockpit: !!window.c,
      bodyClasses: document.body.className
    }));
    R(`  Screen: ${titleState.currentScreen}`);
    R(`  New Game btn: exists=${titleState.hasNewGameBtn} visible=${titleState.newGameVisible}`);
    R(`  window.state: ${titleState.hasStateObj}, window.c: ${titleState.hasCockpit}`);

    // 2. Click New Game
    R('\n[2] Clicking New Game ...');
    const clickedNew = await page.evaluate(() => {
      const b = document.getElementById('btn-new');
      if (!b) return false;
      b.click();
      return true;
    });
    R(`  Click: ${clickedNew}`);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT, `02_after_newgame_${stamp}.png`) });

    const afterNew = await page.evaluate(() => ({
      currentScreen: document.querySelector('.screen.active')?.id || 'NONE',
      hasPilotName: !!document.getElementById('pilot-name'),
      hasLaunchBtn: !!document.getElementById('btn-launch'),
      launchVisible: (() => {
        const b = document.getElementById('btn-launch');
        if (!b) return false;
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })()
    }));
    R(`  Screen: ${afterNew.currentScreen}`);
    R(`  Pilot input: ${afterNew.hasPilotName}, Launch btn visible: ${afterNew.launchVisible}`);

    // 3. Fill pilot name + select faction + click Create
    if (afterNew.hasPilotName) {
      R('\n[3a] Filling pilot name = "TestPilot" ...');
      await page.evaluate(() => {
        const p = document.getElementById('pilot-name');
        if (p) p.value = 'TestPilot';
      });
    }

    R('  [3b] Selecting first faction card ...');
    const factionSel = await page.evaluate(() => {
      const cards = document.querySelectorAll('#faction-grid .faction-card');
      if (cards.length === 0) return { count: 0 };
      cards[0].click();
      return { count: cards.length, selected: cards[0].classList.contains('selected') };
    });
    R(`  Faction cards: ${factionSel.count}, selected: ${factionSel.selected}`);

    R('  [3c] Clicking Create Pilot (btn-create-char) ...');
    const clickedLaunch = await page.evaluate(() => {
      const b = document.getElementById('btn-create-char');
      if (b) { b.click(); return true; }
      return false;
    });
    R(`  Click: ${clickedLaunch}`);
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(OUT, `03_after_launch_${stamp}.png`) });

    const afterLaunch = await page.evaluate(() => ({
      currentScreen: document.querySelector('.screen.active')?.id || 'NONE',
      hasGameCanvas: !!document.getElementById('game-canvas'),
      canvasVisible: (() => {
        const c = document.getElementById('game-canvas');
        if (!c) return false;
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })(),
      enterSpaceBtn: !!document.querySelector('button'),
      bridgeActive: document.getElementById('screen-bridge')?.classList.contains('active'),
      gunnerActive: document.getElementById('screen-gunner')?.classList.contains('active'),
      stateExists: !!window.state,
      cockpitExists: !!window.c
    }));
    R(`  Screen: ${afterLaunch.currentScreen}`);
    R(`  Bridge active: ${afterLaunch.bridgeActive}, Gunner active: ${afterLaunch.gunnerActive}`);
    R(`  Game canvas visible: ${afterLaunch.canvasVisible}`);
    R(`  window.state: ${afterLaunch.stateExists}, window.c: ${afterLaunch.cockpitExists}`);

    // 4. If on bridge, click ENTER SPACE (btn-launch)
    if (afterLaunch.bridgeActive) {
      R('\n[4] On bridge — clicking btn-launch (ENTER SPACE) ...');
      const enterSpace = await page.evaluate(() => {
        const b = document.getElementById('btn-launch');
        if (b) { b.click(); return b.textContent.trim(); }
        return null;
      });
      R(`  Clicked: ${enterSpace}`);
      await new Promise(r => setTimeout(r, 4000));
      await page.screenshot({ path: path.join(OUT, `04_after_enterspace_${stamp}.png`) });

      const afterSpace = await page.evaluate(() => ({
        currentScreen: document.querySelector('.screen.active')?.id || 'NONE',
        gunnerActive: document.getElementById('screen-gunner')?.classList.contains('active'),
        cockpitActive: window.c?.active,
        sceneChildren: window.scene?.children?.length ?? 'n/a'
      }));
      R(`  Screen after: ${afterSpace.currentScreen}`);
      R(`  Gunner active: ${afterSpace.gunnerActive}, c.active: ${afterSpace.cockpitActive}, scene: ${afterSpace.sceneChildren}`);
    }

    // 5. Test weapons — press keys 1-9 and measure projectile count
    R('\n[5] Testing weapons (keys 1-9) ...');
    const weaponTest = await page.evaluate(async () => {
      const keys = ['1','2','3','4','5','6','7','8','9','m'];
      for (const k of keys) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: `Digit${k}`, bubbles: true }));
        await new Promise(r => setTimeout(r, 200));
      }
      const qa = window.__qa || {};
      return {
        qaExposed: !!window.__qa,
        state: qa.state ? {
          screen: qa.state.screen,
          activeWeapon: qa.state.activeWeapon,
          playerFaction: qa.state.player?.faction,
          playerName: qa.state.player?.name
        } : null,
        cockpit: qa.c ? {
          active: qa.c.active,
          dead: qa.c.dead,
          heat: qa.c.heat,
          projectiles: qa.c.projectiles?.length || 0,
          playerHasAttacked: qa.c.playerHasAttacked
        } : null,
        threeReady: qa.threeReady,
        sceneChildren: qa.scene?.children?.length ?? 'n/a',
        fireGatlingGunExists: typeof qa.fireGatlingGun === 'function',
        currentScreen: document.querySelector('.screen.active')?.id || 'NONE'
      };
    });
    R(`  Current screen: ${weaponTest.currentScreen}`);
    R(`  __qa exposed: ${weaponTest.qaExposed}`);
    R(`  state: ${JSON.stringify(weaponTest.state)}`);
    R(`  cockpit: ${JSON.stringify(weaponTest.cockpit)}`);
    R(`  threeReady: ${weaponTest.threeReady}, scene children: ${weaponTest.sceneChildren}`);
    R(`  fireGatlingGun fn exposed: ${weaponTest.fireGatlingGunExists}`);
    await page.screenshot({ path: path.join(OUT, `05_after_weapons_${stamp}.png`) });

    // 5b. Call fireGatlingGun directly
    R('\n[5b] Calling window.__qa.fireGatlingGun("dual") 5x ...');
    const directFire = await page.evaluate(async () => {
      const qa = window.__qa;
      if (!qa || typeof qa.fireGatlingGun !== 'function') return { callable: false };
      const before = qa.c?.projectiles?.length || 0;
      for (let i = 0; i < 5; i++) {
        try { qa.fireGatlingGun('dual'); } catch (e) { return { callable: true, error: e.message }; }
        await new Promise(r => setTimeout(r, 60));
      }
      const after = qa.c?.projectiles?.length || 0;
      return { callable: true, projectilesBefore: before, projectilesAfter: after, heat: qa.c?.heat };
    });
    R(`  Direct fire result: ${JSON.stringify(directFire)}`);

    // 6. Try clicking FIRE button on screen
    R('\n[6] Looking for FIRE button and clicking it 5x ...');
    const fireTest = await page.evaluate(async () => {
      const btns = Array.from(document.querySelectorAll('button'));
      const fireBtn = btns.find(b => /^FIRE$/i.test(b.textContent.trim()));
      if (!fireBtn) return { found: false };
      const rect = fireBtn.getBoundingClientRect();
      for (let i = 0; i < 5; i++) {
        fireBtn.click();
        await new Promise(r => setTimeout(r, 150));
      }
      return {
        found: true,
        visible: rect.width > 0 && rect.height > 0,
        position: { x: rect.x, y: rect.y }
      };
    });
    R(`  FIRE button: ${JSON.stringify(fireTest)}`);
    await page.screenshot({ path: path.join(OUT, `06_after_fire_clicks_${stamp}.png`) });

  } catch (e) {
    R(`\n!! EXCEPTION: ${e.message}`);
  }

  R('\n══ ERRORS ══');
  R(`JS errors: ${jsErrors.length}`);
  jsErrors.slice(0, 5).forEach(e => R(`  - ${e}`));
  R(`Console errors: ${consoleErrors.length}`);
  consoleErrors.slice(0, 5).forEach(e => R(`  - ${e}`));
  R(`Resource 404s: ${resource404s.length}`);
  resource404s.slice(0, 8).forEach(e => R(`  - ${e}`));

  await browser.close();

  const reportPath = path.join(OUT, `report_${stamp}.txt`);
  fs.writeFileSync(reportPath, report.join('\n'), 'utf8');
  R(`\nReport: ${reportPath}`);
  R(`Screenshots: ${OUT}`);
})();
