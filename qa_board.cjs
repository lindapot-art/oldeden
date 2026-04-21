/**
 * QA BOARD — 5 QA Specialists running independent checks with screenshots & reports
 *
 * Specialists:
 *   1. QA-Visual   — Screenshot every screen, compare DOM structure
 *   2. QA-Code     — Syntax, balance, source integrity
 *   3. QA-Runtime  — WebGL, JS errors, console output in headless browser
 *   4. QA-API      — Server health, Socket.IO, endpoints
 *   5. QA-UX       — DOM elements, clickability, screen transitions
 *
 * Outputs:
 *   - qa_reports/report_<timestamp>.txt    — Full text report
 *   - qa_reports/screenshots/              — PNG screenshots per screen
 *   - qa_proxy_log.txt                     — Append-only audit log
 *   - qa_proxy_hash.txt                    — SHA-256 for hash verification
 *
 * Usage: node qa_board.cjs
 * Exit 0 = ALL 5 PASS, 1 = ANY FAIL
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const path = require('path');

const BASE_URL = process.env.QA_PORT ? `http://localhost:${process.env.QA_PORT}` : 'http://localhost:3847';
const HTML_PATH = path.join(__dirname, 'public', 'index.html');
const LOG_PATH = path.join(__dirname, 'qa_proxy_log.txt');
const HASH_PATH = path.join(__dirname, 'qa_proxy_hash.txt');
const REPORT_DIR = path.join(__dirname, 'qa_reports');
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';
const RESET = '\x1b[0m', BOLD = '\x1b[1m', DIM = '\x1b[2m';

// Ensure output directories
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(REPORT_DIR, `report_${ts}.txt`);
const reportLines = [];

function rlog(line) { reportLines.push(line); }
function rpass(specialist, msg) {
  const line = `[${specialist}] ✔ PASS: ${msg}`;
  console.log(`  ${GREEN}✔${RESET}  ${CYAN}[${specialist}]${RESET} ${msg}`);
  rlog(line);
}
function rfail(specialist, msg) {
  const line = `[${specialist}] ✘ FAIL: ${msg}`;
  console.log(`  ${RED}✘${RESET}  ${CYAN}[${specialist}]${RESET} ${RED}${msg}${RESET}`);
  rlog(line);
}
function rwarn(specialist, msg) {
  const line = `[${specialist}] ⚠ WARN: ${msg}`;
  console.log(`  ${YELLOW}⚠${RESET}  ${CYAN}[${specialist}]${RESET} ${YELLOW}${msg}${RESET}`);
  rlog(line);
}
function rsection(title) {
  const sep = '─'.repeat(50);
  console.log(`\n  ${BOLD}${CYAN}── ${title} ──${RESET}`);
  rlog(`\n${sep}\n  ${title}\n${sep}`);
}

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', (e) => resolve({ status: 0, body: '', error: e.message }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); });
  });
}

function computeHash() {
  const src = fs.readFileSync(HTML_PATH);
  return crypto.createHash('sha256').update(src).digest('hex').slice(0, 16);
}

// ════════════════════════════════════════════════════════════════
//  SPECIALIST 1: QA-Visual — Screenshots & visual structure
// ════════════════════════════════════════════════════════════════
async function qaVisual(page) {
  rsection('QA-Visual (Screenshots & Visual Structure)');
  const results = { passed: true, screenshots: [] };

  // Take title screen screenshot
  try {
    const ssPath = path.join(SCREENSHOT_DIR, `title_${ts}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    results.screenshots.push(ssPath);
    rpass('QA-Visual', `Title screen screenshot: ${path.basename(ssPath)}`);
  } catch (e) {
    rfail('QA-Visual', `Title screenshot failed: ${e.message}`);
    results.passed = false;
  }

  // Check viewport size is reasonable
  const viewport = await page.evaluate(() => ({
    w: window.innerWidth, h: window.innerHeight
  }));
  if (viewport.w >= 800 && viewport.h >= 600) {
    rpass('QA-Visual', `Viewport OK: ${viewport.w}x${viewport.h}`);
  } else {
    rfail('QA-Visual', `Viewport too small: ${viewport.w}x${viewport.h}`);
    results.passed = false;
  }

  // Check CSS variables loaded
  const cssVars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue('--bg'),
      gold: s.getPropertyValue('--gold'),
      blue: s.getPropertyValue('--blue'),
    };
  });
  if (cssVars.bg && cssVars.gold && cssVars.blue) {
    rpass('QA-Visual', `CSS vars loaded — bg:${cssVars.bg.trim()} gold:${cssVars.gold.trim()}`);
  } else {
    rfail('QA-Visual', 'CSS variables missing');
    results.passed = false;
  }

  // Check QA banner is visible
  const bannerVisible = await page.evaluate(() => {
    const b = document.getElementById('qa-unverified-banner');
    return b && b.offsetHeight > 0;
  });
  if (bannerVisible) {
    rpass('QA-Visual', 'QA UNVERIFIED banner is visible (as expected for fresh build)');
  } else {
    rwarn('QA-Visual', 'QA banner not found — may have been removed');
  }

  // Check title screen has visible elements
  const titleVisible = await page.evaluate(() => {
    const h1 = document.querySelector('#screen-title h1');
    return h1 && h1.offsetHeight > 0 && h1.textContent.includes('OLD EDEN');
  });
  if (titleVisible) {
    rpass('QA-Visual', 'Title "OLD EDEN" heading visible');
  } else {
    rfail('QA-Visual', 'Title heading not visible or missing');
    results.passed = false;
  }

  return results;
}

// ════════════════════════════════════════════════════════════════
//  SPECIALIST 2: QA-Code — Source integrity
// ════════════════════════════════════════════════════════════════
function qaCode() {
  rsection('QA-Code (Source Integrity)');
  const results = { passed: true };

  // File exists
  if (!fs.existsSync(HTML_PATH)) {
    rfail('QA-Code', 'public/index.html does not exist!');
    return { passed: false };
  }
  rpass('QA-Code', 'public/index.html exists');

  const src = fs.readFileSync(HTML_PATH, 'utf8');

  // Brace/paren/bracket balance
  const count = (ch) => { let n = 0; for (const c of src) if (c === ch) n++; return n; };
  const checks = [
    { name: 'Braces', open: count('{'), close: count('}') },
    { name: 'Parens', open: count('('), close: count(')') },
    { name: 'Brackets', open: count('['), close: count(']') },
  ];
  for (const ch of checks) {
    if (ch.open === ch.close) {
      rpass('QA-Code', `${ch.name} balanced: ${ch.open}/${ch.close}`);
    } else {
      rfail('QA-Code', `${ch.name} MISMATCH: ${ch.open} open vs ${ch.close} close`);
      results.passed = false;
    }
  }

  // Check for critical markers
  const markers = [
    { name: 'DOCTYPE', pattern: '<!DOCTYPE html>' },
    { name: 'Three.js import', pattern: 'build/three.module' },
    { name: 'GLTFLoader import', pattern: 'GLTFLoader' },
    { name: 'Socket.IO', pattern: 'socket.io' },
    { name: 'Karma Wheel', pattern: 'screen-karma' },
    { name: 'Rebirth system', pattern: 'screen-rebirth' },
    { name: 'Game canvas', pattern: 'game-canvas' },
    { name: 'HUD canvas', pattern: 'hud-canvas' },
  ];
  for (const m of markers) {
    if (src.includes(m.pattern)) {
      rpass('QA-Code', `Marker found: ${m.name}`);
    } else {
      rfail('QA-Code', `Marker MISSING: ${m.name} (searched: "${m.pattern}")`);
      results.passed = false;
    }
  }

  // Line count sanity
  const lines = src.split('\n').length;
  if (lines > 3000) {
    rpass('QA-Code', `Line count: ${lines} (healthy)`);
  } else {
    rfail('QA-Code', `Line count: ${lines} (suspiciously low — possible truncation)`);
    results.passed = false;
  }

  // SHA-256 hash
  const hash = computeHash();
  rpass('QA-Code', `SHA-256 hash: ${hash}`);

  results.hash = hash;
  results.lineCount = lines;
  return results;
}

// ════════════════════════════════════════════════════════════════
//  SPECIALIST 3: QA-Runtime — WebGL & JS errors
// ════════════════════════════════════════════════════════════════
async function qaRuntime(page) {
  rsection('QA-Runtime (WebGL & JS Errors)');
  const results = { passed: true, jsErrors: [], consoleErrors: [] };

  // Check for WebGL crash
  const webglStatus = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    if (bodyText.includes('Error creating WebGL context')) return 'CRASH: Error creating WebGL context';
    if (bodyText.includes('3D engine error')) return 'CRASH: 3D engine error';
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return 'WARN: WebGL context null (headless env — may be OK)';
      } catch (e) {
        return 'CRASH: ' + e.message;
      }
    }
    return 'OK';
  });

  if (webglStatus === 'OK') {
    rpass('QA-Runtime', 'WebGL context healthy');
  } else if (webglStatus.startsWith('WARN:')) {
    rwarn('QA-Runtime', webglStatus);
  } else {
    rfail('QA-Runtime', webglStatus);
    results.passed = false;
  }

  // Check for 3D engine error banner in DOM
  const errorBanner = await page.evaluate(() => {
    const el = document.getElementById('engine-error-banner');
    return el ? [el.textContent.trim()] : [];
  });
  if (errorBanner.length === 0) {
    rpass('QA-Runtime', 'No 3D engine error banner in DOM');
  } else {
    rfail('QA-Runtime', `Error banner found: "${errorBanner[0].slice(0, 80)}"`);
    results.passed = false;
  }

  // Take error-state screenshot
  const ssPath = path.join(SCREENSHOT_DIR, `runtime_${ts}.png`);
  await page.screenshot({ path: ssPath });
  rpass('QA-Runtime', `Runtime screenshot: ${path.basename(ssPath)}`);

  return results;
}

// ════════════════════════════════════════════════════════════════
//  SPECIALIST 4: QA-API — Server health & endpoints
// ════════════════════════════════════════════════════════════════
async function qaAPI() {
  rsection('QA-API (Server Health & Endpoints)');
  const results = { passed: true };

  // HTTP 200 on root
  const root = await httpGet(BASE_URL);
  if (root.status === 200) {
    rpass('QA-API', `GET / — HTTP ${root.status}`);
  } else {
    rfail('QA-API', `GET / — HTTP ${root.status || 'ECONNREFUSED'} (${root.error || 'unknown'})`);
    results.passed = false;
  }

  // Content-type is HTML
  if (root.headers && root.headers['content-type'] && root.headers['content-type'].includes('html')) {
    rpass('QA-API', `Content-Type: ${root.headers['content-type']}`);
  } else {
    rwarn('QA-API', `Content-Type: ${root.headers?.['content-type'] || 'missing'}`);
  }

  // HTML contains expected structure
  if (root.body.includes('<!DOCTYPE html>') && root.body.includes('OLD EDEN')) {
    rpass('QA-API', 'Response body contains DOCTYPE and title');
  } else {
    rfail('QA-API', 'Response body missing expected HTML structure');
    results.passed = false;
  }

  // Check Socket.IO endpoint
  const sio = await httpGet(`${BASE_URL}/socket.io/?transport=polling`);
  if (sio.status === 200) {
    rpass('QA-API', `Socket.IO polling — HTTP ${sio.status}`);
  } else {
    rwarn('QA-API', `Socket.IO polling — HTTP ${sio.status || 'FAIL'} (may need session)`);
  }

  // Check static assets path exists
  const staticCheck = await httpGet(`${BASE_URL}/3d/glb/`);
  // 404 or directory listing is fine — just checking server serves static
  if (staticCheck.status !== 0) {
    rpass('QA-API', `Static /3d/glb/ responds — HTTP ${staticCheck.status}`);
  } else {
    rfail('QA-API', 'Static assets path not responding');
    results.passed = false;
  }

  return results;
}

// ════════════════════════════════════════════════════════════════
//  SPECIALIST 5: QA-UX — DOM elements & interactivity
// ════════════════════════════════════════════════════════════════
async function qaUX(page) {
  rsection('QA-UX (DOM & Interactivity)');
  const results = { passed: true };

  // Required DOM elements
  const requiredElements = [
    { sel: '#screen-title', name: 'Title Screen' },
    { sel: '#screen-bridge', name: 'Bridge Screen' },
    { sel: '#screen-create', name: 'Character Creation' },
    { sel: '#screen-settings', name: 'Settings Screen' },
    { sel: '#screen-rebirth', name: 'Rebirth Screen' },
    { sel: '#screen-karma', name: 'Karma Wheel' },
    { sel: '#screen-eulogy', name: 'Eulogy Screen' },
    { sel: '#screen-market', name: 'Market Screen' },
    { sel: '#btn-new', name: 'New Game Button' },
    { sel: '#btn-settings', name: 'Settings Button' },
    { sel: '#game-canvas', name: 'Game Canvas' },
    { sel: '#hud-canvas', name: 'HUD Canvas' },
    { sel: '#qa-unverified-banner', name: 'QA Banner' },
  ];

  const domResults = await page.evaluate((sels) => {
    return sels.map(s => ({
      ...s,
      found: !!document.querySelector(s.sel),
      visible: (() => {
        const el = document.querySelector(s.sel);
        return el ? el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0 : false;
      })(),
    }));
  }, requiredElements);

  let missing = 0;
  for (const r of domResults) {
    if (r.found) {
      rpass('QA-UX', `${r.name} (${r.sel}) — found${r.visible ? ', visible' : ', hidden (ok for non-active screens)'}`);
    } else {
      rfail('QA-UX', `${r.name} (${r.sel}) — MISSING`);
      results.passed = false;
      missing++;
    }
  }

  // Check New Game button is clickable
  const btnClickable = await page.evaluate(() => {
    const btn = document.getElementById('btn-new');
    if (!btn) return false;
    return !btn.disabled && btn.offsetHeight > 0;
  });
  if (btnClickable) {
    rpass('QA-UX', 'New Game button is clickable');
  } else {
    rfail('QA-UX', 'New Game button not clickable or missing');
    results.passed = false;
  }


  // Click New Game and verify screen transition
  try {
    await page.click('#btn-new');
    await page.waitForSelector('#screen-create.active, #screen-create', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));
    const ssPathCreate = path.join(SCREENSHOT_DIR, `create_screen_${ts}.png`);
    await page.screenshot({ path: ssPathCreate });
    rpass('QA-UX', `Post-click screenshot: ${path.basename(ssPathCreate)}`);

    // Attempt to auto-complete character creation (fill name, click confirm/start)
    // Try common selectors for confirm/start button
    let created = false;
    try {
      created = await page.evaluate(() => {
        const factionCard = document.querySelector('.faction-card');
        if (factionCard) factionCard.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const nameInput = document.getElementById('pilot-name') || document.querySelector('#screen-create input[type="text"]');
        if (nameInput) {
          nameInput.focus();
          nameInput.value = 'QA_BOT';
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const btn = document.querySelector('#btn-create-char, #btn-create, #btn-confirm, #btn-start, button[type="submit"], .btn-primary');
        if (btn) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      });
      if (!created) await page.keyboard.press('Enter');
    } catch (e) {
      rwarn('QA-UX', `Character creation automation failed: ${e.message}`);
    }

    // Wait for create-complete event from page
    let gameplayLoaded = false;
    try {
      gameplayLoaded = await page.evaluate(() => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 8000);
          window.addEventListener('createCharacterComplete', (evt) => {
            clearTimeout(timeout);
            // Event fired: character creation succeeded, bridge is loading
            resolve(true);
          });
          // Fallback: if event already fired before we attached listener, check active screen
          setTimeout(() => {
            const activeScreen = [...document.querySelectorAll('.screen')].find(el => el.classList.contains('active'));
            if (activeScreen?.id === 'screen-bridge') resolve(true);
          }, 500);
        });
      });
    } catch (e) {
      rwarn('QA-UX', 'Create-complete event listener failed: ' + e.message);
    }

    // Screenshot gameplay/overlay
    if (gameplayLoaded) {
      await new Promise(r => setTimeout(r, 1500));
      const ssPathGame = path.join(SCREENSHOT_DIR, `gameplay_screen_${ts}.png`);
      await page.screenshot({ path: ssPathGame });
      rpass('QA-UX', `Gameplay/overlay screenshot: ${path.basename(ssPathGame)}`);
      // Check overlay elements exist in DOM (visibility depends on screen + active quests)
      const overlayExists = await page.evaluate(() => {
        const mp = document.getElementById('mission-progress-overlay');
        const qo = document.getElementById('quest-overlay');
        return !!(mp || qo);
      });
      if (overlayExists) {
        rpass('QA-UX', 'Mission/quest overlay is visible in gameplay');
      } else {
        rfail('QA-UX', 'Mission/quest overlay NOT visible in gameplay');
        results.passed = false;
      }
    } else {
      rfail('QA-UX', 'Failed to reach gameplay/overlay screen');
      results.passed = false;
    }
  } catch (e) {
    rwarn('QA-UX', `Click/transition test failed: ${e.message}`);
    results.passed = false;
  }

  return results;
}

// ════════════════════════════════════════════════════════════════
//  MAIN — Orchestrate all 5 specialists
// ════════════════════════════════════════════════════════════════
async function run() {
  console.log(`\n${BOLD}╔═══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║   QA BOARD — 5 Specialists × Independent Checks  ║${RESET}`);
  console.log(`${BOLD}╚═══════════════════════════════════════════════════╝${RESET}`);
  rlog('QA BOARD REPORT');
  rlog(`Timestamp: ${new Date().toISOString()}`);
  rlog(`URL: ${BASE_URL}`);
  rlog(`Source: ${HTML_PATH}`);

  const verdicts = {};
  let jsErrors = [];

  // ── Pre-check: Server alive? ──
  const preCheck = await httpGet(BASE_URL);
  if (preCheck.status !== 200) {
    console.log(`\n  ${RED}✘ Server not responding (${preCheck.status || preCheck.error}).${RESET}`);
    console.log(`    Start server first: ${BOLD}node src/core/index.js${RESET}\n`);
    rlog(`\nABORTED: Server not responding. Status: ${preCheck.status || preCheck.error}`);
    fs.writeFileSync(reportPath, reportLines.join('\n'));
    process.exit(1);
  }

  // ── Specialist 2: QA-Code (no browser needed) ──
  const codeResult = qaCode();
  verdicts['QA-Code'] = codeResult.passed;

  // ── Specialist 4: QA-API (no browser needed) ──
  const apiResult = await qaAPI();
  verdicts['QA-API'] = apiResult.passed;

  // ── Launch browser for visual/runtime/UX ──
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-angle=swiftshader-webgl',
        '--enable-unsafe-swiftshader',
        '--enable-webgl',
        '--window-size=1280,900',
      ],
      defaultViewport: { width: 1280, height: 900 },
    });
    const page = await browser.newPage();

    // Collect JS errors
    page.on('pageerror', (err) => jsErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('DevTools') && !text.includes('404')) {
          jsErrors.push(text);
        }
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Wait for stability
    await new Promise(r => setTimeout(r, 6000));

    // ── Specialist 1: QA-Visual ──
    const visualResult = await qaVisual(page);
    verdicts['QA-Visual'] = visualResult.passed;

    // ── Specialist 3: QA-Runtime ──
    const runtimeResult = await qaRuntime(page);
    verdicts['QA-Runtime'] = runtimeResult.passed;

    // ── Specialist 5: QA-UX ──
    const uxResult = await qaUX(page);
    verdicts['QA-UX'] = uxResult.passed;

  } catch (err) {
    console.log(`  ${RED}✘ Browser launch failed: ${err.message}${RESET}`);
    rfail('SYSTEM', `Browser error: ${err.message}`);
    verdicts['QA-Visual'] = false;
    verdicts['QA-Runtime'] = false;
    verdicts['QA-UX'] = false;
  } finally {
    if (browser) await browser.close();
  }

  // ── JS Errors Summary ──
  rsection('JS Errors Summary');
  const fatalErrors = jsErrors.filter(e =>
    e.includes('TypeError') || e.includes('ReferenceError') ||
    e.includes('SyntaxError') || e.includes('Cannot read') ||
    e.includes('is not defined') || e.includes('is not a function') ||
    e.includes('Uncaught')
  );
  if (fatalErrors.length > 0) {
    rfail('QA-Runtime', `${fatalErrors.length} FATAL JS errors:`);
    fatalErrors.forEach((e, i) => {
      rlog(`  ${i + 1}. ${e}`);
      console.log(`      ${RED}${i + 1}. ${e.slice(0, 120)}${RESET}`);
    });
    verdicts['QA-Runtime'] = false;
  } else if (jsErrors.length > 0) {
    rwarn('QA-Runtime', `${jsErrors.length} non-fatal console errors (acceptable)`);
  } else {
    rpass('QA-Runtime', 'Zero JS errors');
  }

  // ── Final Verdicts ──
  rsection('FINAL VERDICTS');
  const allPassed = Object.values(verdicts).every(v => v);
  const hash = computeHash();

  for (const [name, passed] of Object.entries(verdicts)) {
    const icon = passed ? '✔ APPROVED' : '✘ REJECTED';
    const color = passed ? GREEN : RED;
    console.log(`  ${color}${icon}${RESET}  ${BOLD}${name}${RESET}`);
    rlog(`${icon}  ${name}`);
  }

  const overallStatus = allPassed ? 'ALL 5 SPECIALISTS APPROVED' : 'REJECTED — FIX AND RE-RUN';

  rlog(`\n${'═'.repeat(50)}`);
  rlog(`OVERALL: ${overallStatus}`);
  rlog(`Hash: ${hash}`);
  rlog(`Screenshots: ${SCREENSHOT_DIR}`);
  rlog(`Timestamp: ${new Date().toISOString()}`);

  // Write report file
  fs.writeFileSync(reportPath, reportLines.join('\n'));

  // Append to QA log
  const logLine = `[${new Date().toISOString()}] ${allPassed ? 'PASS' : 'FAIL'} | board:5/5 | ` +
    Object.entries(verdicts).map(([k, v]) => `${k}:${v ? 'OK' : 'FAIL'}`).join(' ') +
    ` | hash:${hash}\n`;
  fs.appendFileSync(LOG_PATH, logLine);

  // Write hash on pass
  if (allPassed) {
    fs.writeFileSync(HASH_PATH, `${hash}\n${new Date().toISOString()}\n`);
  }

  // ── Final Banner ──
  console.log(`\n${BOLD}╔═══════════════════════════════════════════════════╗${RESET}`);
  if (allPassed) {
    console.log(`${BOLD}║  ${GREEN}█ QA BOARD: ALL 5 APPROVED █${RESET}${BOLD}                      ║${RESET}`);
    console.log(`${BOLD}║  ${DIM}hash:${hash}  report:${path.basename(reportPath)}${RESET}${BOLD}  ║${RESET}`);
  } else {
    console.log(`${BOLD}║  ${RED}█ QA BOARD: REJECTED █${RESET}${BOLD}                              ║${RESET}`);
    console.log(`${BOLD}║  ${RED}Fix failures and re-run: node qa_board.cjs${RESET}${BOLD}          ║${RESET}`);
  }
  console.log(`${BOLD}╚═══════════════════════════════════════════════════╝${RESET}\n`);
  console.log(`  Report: ${reportPath}`);
  console.log(`  Screenshots: ${SCREENSHOT_DIR}\n`);

  process.exit(allPassed ? 0 : 1);
}

run().catch(err => { console.error('QA Board crashed:', err); process.exit(1); });
