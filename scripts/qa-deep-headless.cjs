const puppeteer = require('puppeteer');

const BASE_URL = process.env.QA_PORT ? `http://localhost:${process.env.QA_PORT}` : 'http://localhost:3847';
const RUN_MS = 5 * 60 * 1000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickSelector(page, selector) {
  return page.evaluate((target) => {
    const node = document.querySelector(target);
    if (!node) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    node.click();
    return true;
  }, selector);
}

async function clickButtonText(page, text) {
  return page.evaluate((targetText) => {
    const buttons = Array.from(document.querySelectorAll('button, .nav-btn, .action-btn'));
    const match = buttons.find((button) => {
      const style = getComputedStyle(button);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const label = (button.textContent || '').replace(/\s+/g, ' ').trim();
      return label === targetText || label.includes(targetText);
    });
    if (!match) return false;
    match.click();
    return true;
  }, text);
}

async function waitFor(page, predicate, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const passed = await predicate();
    if (passed) return true;
    await delay(150);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--use-angle=swiftshader-webgl',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=1440,960',
    ],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();
  const errors = [];
  const telemetry = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
  });
  page.on('pageerror', (error) => errors.push('[page] ' + error.message));

  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(1200);

  await page.evaluate(() => {
    const setValue = (selector, value) => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.focus();
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue('#account-email', 'kakababa');
    setValue('#account-password', '1234');
  });
  await clickSelector(page, '#btn-login-account');
  await delay(900);

  const currentScreen = await page.evaluate(() => document.body.dataset.screen || 'title');
  if (currentScreen !== 'create' && currentScreen !== 'bridge') {
    await clickSelector(page, '#btn-new');
    await delay(900);
  }

  const bodyScreen = await page.evaluate(() => document.body.dataset.screen || 'title');
  if (bodyScreen === 'create') {
    await clickSelector(page, '.faction-card');
    await page.evaluate(() => {
      const pilot = document.querySelector('#pilot-name');
      if (!pilot) return;
      pilot.focus();
      pilot.value = 'DeepQA' + Date.now().toString().slice(-5);
      pilot.dispatchEvent(new Event('input', { bubbles: true }));
      pilot.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await clickSelector(page, '#btn-create-char');
  }

  await waitFor(page, () => page.evaluate(() => (document.body.dataset.screen || '') === 'bridge'), 10000, 'bridge screen');
  await clickSelector(page, '#btn-launch');
  await waitFor(page, () => page.evaluate(() => (document.body.dataset.screen || '') === 'gunner'), 10000, 'gunner screen');
  await delay(1500);

  await clickButtonText(page, 'MAX').catch(() => false);
  await clickSelector(page, '#btn-battle-drone').catch(() => false);
  await clickSelector(page, '#auto-target-btn').catch(() => false);

  const start = Date.now();
  let nextLog = 0;
  let lastKills = 0;
  let maxKills = 0;
  let minHull = 100;
  let minShield = 100;
  let deaths = 0;

  while (Date.now() - start < RUN_MS) {
    const elapsed = Date.now() - start;
    const x = 540 + Math.floor(Math.random() * 360);
    const y = 280 + Math.floor(Math.random() * 260);
    const state = await page.evaluate(() => {
      const snap = window.__oldEdenQA?.snapshot?.();
      if (!snap) {
        return {
          bodyScreen: document.body.dataset.screen || 'unknown',
          kills: 0,
          score: 0,
          ammo: 0,
          hull: 0,
          shield: 0,
          enemies: -1,
          dead: false,
          safeSeconds: 0,
          comms: [],
        };
      }
      return {
        bodyScreen: snap.screen || document.body.dataset.screen || 'unknown',
        kills: Number.isFinite(snap.combat?.kills) ? snap.combat.kills : 0,
        score: Number.isFinite(snap.combat?.score) ? snap.combat.score : 0,
        ammo: Number.isFinite(snap.combat?.ammo) ? snap.combat.ammo : 0,
        hull: Number.isFinite(snap.player?.hull) ? snap.player.hull : 0,
        shield: Number.isFinite(snap.player?.shield) ? snap.player.shield : 0,
        enemies: Number.isFinite(snap.combat?.enemies) ? snap.combat.enemies : 0,
        dead: !!snap.combat?.dead,
        safeSeconds: Number.isFinite(snap.combat?.safeSeconds) ? snap.combat.safeSeconds : 0,
        comms: Array.isArray(snap.comms) ? snap.comms : [],
      };
    });

    const combatLive = state.enemies > 0 || state.safeSeconds <= 0;
    if (combatLive && state.ammo > 0) {
      await page.mouse.move(x, y).catch(() => {});
      await page.mouse.click(x, y).catch(() => {});
    }

    if (state.ammo === 0) {
      await clickButtonText(page, 'Reload').catch(() => false);
      await delay(300);
    }

    if (Math.floor(elapsed / 1000) % 4 === 0) {
      await page.keyboard.down('KeyW').catch(() => {});
      await delay(90);
      await page.keyboard.up('KeyW').catch(() => {});
    }
    if (Math.floor(elapsed / 1000) % 11 === 0) {
      await page.keyboard.press('ShiftLeft').catch(() => {});
    }
    if (Math.floor(elapsed / 1000) % 13 === 0) {
      await clickSelector(page, '#warp-target-btn').catch(() => false);
    }

    maxKills = Math.max(maxKills, state.kills);
    minHull = Math.min(minHull, state.hull);
    minShield = Math.min(minShield, state.shield);

    if (state.kills > lastKills) {
      console.log(`[KILL] +${state.kills - lastKills} at ${(elapsed / 1000).toFixed(1)}s (total=${state.kills}, score=${state.score})`);
      lastKills = state.kills;
    }

    if (state.dead) {
      deaths += 1;
      console.log(`[DEATH] screen=${state.bodyScreen} at ${(elapsed / 1000).toFixed(1)}s; relaunch attempt ${deaths}`);
      await clickButtonText(page, 'Bridge').catch(() => false);
      await delay(1000);
      if ((await page.evaluate(() => document.body.dataset.screen || '')) !== 'gunner') {
        await clickSelector(page, '#btn-launch').catch(() => false);
        await delay(2500);
      }
    }

    if (elapsed >= nextLog) {
      telemetry.push({ t: Math.round(elapsed / 1000), ...state });
      console.log(`[T+${String(Math.round(elapsed / 1000)).padStart(3, '0')}s] screen=${state.bodyScreen} kills=${state.kills} enemies=${state.enemies} hull=${Math.round(state.hull)} shield=${Math.round(state.shield)} ammo=${state.ammo}`);
      if (state.comms?.length) console.log(`[COMMS] ${state.comms.join(' | ')}`);
      nextLog += 15000;
    }

    await delay(350);
  }

  console.log('=== HEADLESS COMBAT SUMMARY ===');
  console.log(`elapsed=${Math.round((Date.now() - start) / 1000)}s kills=${maxKills} deaths=${deaths} minHull=${Math.round(minHull)} minShield=${Math.round(minShield)} browserErrors=${errors.length}`);
  if (telemetry.length) console.log(JSON.stringify(telemetry.slice(-5), null, 2));
  if (errors.length) {
    errors.slice(0, 20).forEach((error, index) => console.log(`error[${index + 1}] ${error}`));
  }

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((error) => {
  console.error('[qa-deep-headless] Fatal:', error.message);
  process.exit(1);
});