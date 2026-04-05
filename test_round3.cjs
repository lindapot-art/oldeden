/**
 * QA Round 3 — Full gameplay flow test via Puppeteer
 * Tests: load, char creation, gunner entry, screen nav, API endpoints, no fatal errors
 */
const puppeteer = require('puppeteer');
const http = require('http');

const URL = 'http://localhost:3000';
const jsErrors = [];
const results = [];

function log(name, pass, msg) {
  const icon = pass ? '✔' : '✘';
  results.push({ name, pass, msg });
  console.log(`  ${icon}  ${name}: ${msg}`);
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${URL}${path}`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

(async () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  QA ROUND 3 — Gameplay Flow Test      ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // ── Section A: Server API endpoints ──
  console.log('  ── Server API Tests ──');
  const endpoints = ['/health', '/', '/api/game/starmap', '/api/game/quests', '/api/game/factions', '/api/game/economy/rates'];
  for (const ep of endpoints) {
    try {
      const r = await httpGet(ep);
      log(`GET ${ep}`, r.status === 200, `HTTP ${r.status} (${r.body.length} bytes)`);
    } catch(e) {
      log(`GET ${ep}`, false, e.message);
    }
  }

  // ── Section B: Browser gameplay flow ──
  console.log('\n  ── Browser Gameplay Tests ──');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-web-security']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('pageerror', err => jsErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('WebGL'))
      jsErrors.push(msg.text());
  });

  // Test: Page loads
  try {
    const resp = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    log('Page Load', resp.status() === 200, `HTTP ${resp.status()}`);
  } catch(e) {
    log('Page Load', false, e.message);
  }
  await new Promise(r => setTimeout(r, 2000));

  // Test: Title screen
  const titleOk = await page.evaluate(() => {
    const el = document.getElementById('screen-title');
    return el && el.classList.contains('active');
  });
  log('Title Screen Active', titleOk, titleOk ? 'YES' : 'NO');

  // Test: Critical DOM elements exist
  const domChecks = ['game-canvas', 'hud-canvas', 'screen-title', 'screen-bridge', 'screen-create',
    'screen-settings', 'screen-rebirth', 'screen-karma', 'screen-eulogy', 'screen-market',
    'btn-new', 'btn-settings', 'qa-unverified-banner'];
  const missingDom = await page.evaluate((ids) => ids.filter(id => !document.getElementById(id)), domChecks);
  log('Critical DOM Elements', missingDom.length === 0,
    missingDom.length === 0 ? `all ${domChecks.length} present` : `MISSING: ${missingDom.join(', ')}`);

  // Test: Click New Game → character creation
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 1500));
  const createOk = await page.evaluate(() => document.getElementById('screen-create')?.classList.contains('active'));
  log('New Game → Create', createOk, createOk ? 'character creation visible' : 'FAILED');

  // Test: Faction cards exist
  const factionCount = await page.evaluate(() => document.querySelectorAll('.faction-card').length);
  log('Faction Cards', factionCount >= 3, `${factionCount} faction cards`);

  // Test: Select faction + fill name + create
  if (factionCount > 0) {
    await page.evaluate(() => document.querySelectorAll('.faction-card')[0].click());
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const nameInput = document.getElementById('char-name');
      if (nameInput) { nameInput.value = 'QARound3Pilot'; nameInput.dispatchEvent(new Event('input')); }
    });
    const createBtn = await page.$('#btn-create-go');
    if (createBtn) {
      await createBtn.click();
      await new Promise(r => setTimeout(r, 3000));
    }
    // Check we're in game (bridge or gunner)
    const postCreate = await page.evaluate(() => {
      if (document.getElementById('screen-bridge')?.classList.contains('active')) return 'bridge';
      const c = document.getElementById('game-canvas');
      if (c && c.width > 0 && c.height > 0) return 'game-canvas-active';
      return 'unknown';
    });
    log('Character Created → Game', postCreate !== 'unknown', `state: ${postCreate}`);
  }

  // Test: Zero ReferenceErrors
  const refErrors = jsErrors.filter(e => e.includes('ReferenceError'));
  log('Zero ReferenceErrors', refErrors.length === 0,
    refErrors.length === 0 ? 'none' : `${refErrors.length}: ${refErrors[0]}`);

  // Test: Zero TypeErrors on null/undefined
  const typeErrors = jsErrors.filter(e => e.includes('TypeError') && (e.includes('null') || e.includes('undefined')));
  log('Zero TypeErrors', typeErrors.length === 0,
    typeErrors.length === 0 ? 'none' : `${typeErrors.length}: ${typeErrors[0]}`);

  // Test: Socket.IO connected (check if socket exists in page)
  const socketOk = await page.evaluate(() => {
    return typeof window.io !== 'undefined' || document.querySelector('script[src*="socket.io"]') !== null;
  });
  log('Socket.IO Available', socketOk, socketOk ? 'loaded' : 'missing');

  // Screenshot
  await page.screenshot({ path: 'qa_reports/screenshots/round3_final.png' });
  log('Final Screenshot', true, 'qa_reports/screenshots/round3_final.png');

  await browser.close();

  // ── Summary ──
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed${' '.repeat(Math.max(0, 16 - String(passed).length - String(failed).length))}║`);
  console.log(`╚═══════════════════════════════════════╝`);

  if (jsErrors.length > 0) {
    console.log(`\n  Non-WebGL JS errors (${jsErrors.length}):`);
    jsErrors.slice(0, 5).forEach((e, i) => console.log(`    ${i+1}. ${e.substring(0, 120)}`));
  }

  process.exit(failed > 0 ? 1 : 0);
})();
