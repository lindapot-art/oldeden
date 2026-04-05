/**
 * QA PROXY LIVE — Headless browser verification for Old Eden
 * 
 * Runs 6 checks:
 *   1. Server is alive (HTTP 200)
 *   2. Brace/paren/bracket balance in source
 *   3. Headless browser loads page without fatal JS errors
 *   4. Key DOM elements exist
 *   5. No WebGL crash for 6 seconds
 *   6. Writes QA log + build hash on success
 * 
 * Usage: node qa_proxy_live.cjs
 * Exit code 0 = PASS, 1 = FAIL
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const path = require('path');

const URL = 'http://localhost:3000';
const HTML_PATH = path.join(__dirname, 'public', 'index.html');
const LOG_PATH = path.join(__dirname, 'qa_proxy_log.txt');
const HASH_PATH = path.join(__dirname, 'qa_proxy_hash.txt');
const WAIT_MS = 6000; // 6 seconds stability window

const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RESET = '\x1b[0m', BOLD = '\x1b[1m';

function log(icon, msg) { console.log(`  ${icon}  ${msg}`); }
function pass(msg) { log(`${GREEN}✔${RESET}`, msg); }
function fail(msg) { log(`${RED}✘${RESET}`, `${RED}${msg}${RESET}`); }
function warn(msg) { log(`${YELLOW}⚠${RESET}`, `${YELLOW}${msg}${RESET}`); }

async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      resolve(res.statusCode);
      res.resume();
    });
    req.on('error', () => resolve(0));
    req.setTimeout(5000, () => { req.destroy(); resolve(0); });
  });
}

function checkBalance() {
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  const count = (ch) => { let n = 0; for (const c of src) if (c === ch) n++; return n; };
  const ob = count('{'), cb = count('}');
  const op = count('('), cp = count(')');
  const os = count('['), cs = count(']');
  return {
    braces: { open: ob, close: cb, ok: ob === cb },
    parens: { open: op, close: cp, ok: op === cp },
    brackets: { open: os, close: cs, ok: os === cs },
  };
}

function computeHash() {
  const src = fs.readFileSync(HTML_PATH);
  return crypto.createHash('sha256').update(src).digest('hex').slice(0, 16);
}

function appendLog(result) {
  const ts = new Date().toISOString();
  const hash = computeHash();
  const status = result.passed ? 'PASS' : 'FAIL';
  const line = `[${ts}] ${status} | hash:${hash} | errors:${result.jsErrors.length} | webgl:${result.webglOk ? 'OK' : 'CRASH'} | dom:${result.domOk ? 'OK' : 'MISSING'}\n`;
  fs.appendFileSync(LOG_PATH, line);
  if (result.passed) {
    fs.writeFileSync(HASH_PATH, `${hash}\n${ts}\n`);
  }
  return { hash, ts };
}

async function run() {
  console.log(`\n${BOLD}═══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  QA PROXY LIVE — Old Eden Verification ${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════${RESET}\n`);

  const result = { passed: false, jsErrors: [], webglOk: true, domOk: true };

  // ── CHECK 1: Server alive ──
  const status = await checkServer();
  if (status !== 200) {
    fail(`Server not responding (got ${status || 'ECONNREFUSED'}). Start server first: node src/core/index.js`);
    process.exit(1);
  }
  pass(`Server alive — HTTP ${status}`);

  // ── CHECK 2: Brace/paren/bracket balance ──
  const bal = checkBalance();
  if (!bal.braces.ok) { fail(`Braces MISMATCH: ${bal.braces.open}/${bal.braces.close}`); process.exit(1); }
  if (!bal.parens.ok) { fail(`Parens MISMATCH: ${bal.parens.open}/${bal.parens.close}`); process.exit(1); }
  if (!bal.brackets.ok) { fail(`Brackets MISMATCH: ${bal.brackets.open}/${bal.brackets.close}`); process.exit(1); }
  pass(`Balance OK — {${bal.braces.open}} (${bal.parens.open}) [${bal.brackets.open}]`);

  // ── CHECK 3-5: Headless browser ──
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
      ],
    });
    const page = await browser.newPage();

    // Collect JS errors
    page.on('pageerror', (err) => {
      result.jsErrors.push(err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter known non-fatal warnings
        if (text.includes('favicon') || text.includes('DevTools') || text.includes('404')) return;
        result.jsErrors.push(text);
      }
    });

    // Navigate
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    pass('Page loaded in headless browser');

    // Wait for stability
    await new Promise(r => setTimeout(r, WAIT_MS));

    // Check for WebGL crash message
    const webglCrash = await page.evaluate(() => {
      const el = document.body.innerText;
      if (el.includes('Error creating WebGL context')) return 'Error creating WebGL context';
      if (el.includes('3D engine error')) return '3D engine error detected';
      // Check if canvas exists and has a context
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        try {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (!gl) return 'WebGL context is null';
        } catch(e) {
          return 'WebGL context creation threw: ' + e.message;
        }
      }
      return null;
    });

    if (webglCrash) {
      fail(`WebGL CRASH: ${webglCrash}`);
      result.webglOk = false;
    } else {
      pass(`WebGL stable for ${WAIT_MS / 1000}s — no crash`);
    }

    // ── CHECK 4: DOM elements ──
    const requiredElements = [
      '#screen-title',
      '#screen-bridge',
      '#screen-create',
      '#btn-new',
      '#game-canvas',
      '#hud-canvas',
      '#qa-unverified-banner',
    ];
    const domResults = await page.evaluate((selectors) => {
      return selectors.map(s => ({ sel: s, found: !!document.querySelector(s) }));
    }, requiredElements);

    const missing = domResults.filter(d => !d.found);
    if (missing.length > 0) {
      fail(`DOM missing: ${missing.map(m => m.sel).join(', ')}`);
      result.domOk = false;
    } else {
      pass(`DOM OK — ${requiredElements.length} key elements found`);
    }

    // ── Fatal JS errors ──
    // Filter to only truly fatal errors (WebGL, TypeError, ReferenceError, SyntaxError)
    const fatalErrors = result.jsErrors.filter(e =>
      e.includes('WebGL') || e.includes('TypeError') || e.includes('ReferenceError') ||
      e.includes('SyntaxError') || e.includes('Cannot read') || e.includes('is not defined') ||
      e.includes('is not a function') || e.includes('Uncaught')
    );

    if (fatalErrors.length > 0) {
      fail(`${fatalErrors.length} FATAL JS error(s):`);
      fatalErrors.forEach((e, i) => console.log(`      ${RED}${i + 1}. ${e}${RESET}`));
    } else if (result.jsErrors.length > 0) {
      warn(`${result.jsErrors.length} non-fatal console error(s) (warnings OK)`);
    } else {
      pass('Zero JS errors in console');
    }

    result.passed = result.webglOk && result.domOk && fatalErrors.length === 0;

  } catch (err) {
    fail(`Browser error: ${err.message}`);
    result.passed = false;
  } finally {
    if (browser) await browser.close();
  }

  // ── Write log + hash ──
  const { hash, ts } = appendLog(result);

  // ── Final verdict ──
  console.log(`\n${BOLD}═══════════════════════════════════════${RESET}`);
  if (result.passed) {
    console.log(`  ${GREEN}${BOLD}█ QA PROXY: PASS █${RESET}  hash:${hash}  ${ts}`);
  } else {
    console.log(`  ${RED}${BOLD}█ QA PROXY: FAIL █${RESET}  — DO NOT SHIP`);
  }
  console.log(`${BOLD}═══════════════════════════════════════${RESET}\n`);

  process.exit(result.passed ? 0 : 1);
}

run().catch(err => { fail('QA script crashed: ' + err.message); process.exit(1); });
