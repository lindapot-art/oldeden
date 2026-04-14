// test_deep_freeze2.cjs — Deep freeze diagnostic with console monitoring only
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const URL = 'http://localhost:3847';
const OUT = 'test_screenshots';

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--enable-webgl', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 }
  });
  const page = await browser.newPage();
  
  const allErrors = [];
  const allLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    allLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') allErrors.push(text);
  });
  page.on('pageerror', err => allErrors.push('PAGEERROR: ' + err.message));
  
  // Intercept and patch - add error counting to window scope before module loads
  await page.evaluateOnNewDocument(() => {
    window.__freezeDiag = { frameErrors: 0, totalFrames: 0, renderCalls: 0, errors: [] };
    // Monkey-patch requestAnimationFrame to count frames
    const origRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(cb) {
      return origRAF.call(window, function(ts) {
        window.__freezeDiag.totalFrames++;
        try { cb(ts); } catch(e) {
          window.__freezeDiag.frameErrors++;
          window.__freezeDiag.errors.push(e.message);
        }
      });
    };
  });

  // 1. Load page
  console.log('=== PHASE 1: LOADING ===');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // 2. Navigate: title → create → bridge
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 800));
  const fCards = await page.$$('.faction-card');
  if (fCards.length > 0) await fCards[0].click();
  const ni = await page.$('#pilot-name');
  if (ni) { await ni.click({ clickCount: 3 }); await ni.type('FreezeTest'); }
  await new Promise(r => setTimeout(r, 300));
  const btns = await page.$$('button');
  for (const btn of btns) {
    const t = await btn.evaluate(el => el.textContent);
    if (t.includes('Create Pilot')) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 2000));
  console.log('=== PHASE 2: BRIDGE ===');
  
  let diag = await page.evaluate(() => window.__freezeDiag);
  console.log('Bridge diag:', JSON.stringify(diag));
  
  // 3. Enter gunner
  const navBtns = await page.$$('.nav-btn, [data-screen]');
  for (const nb of navBtns) {
    const t = await nb.evaluate(el => el.textContent);
    if (t.includes('Gunner')) { await nb.click(); console.log('Clicked Gunner'); break; }
  }

  // Monitor every 2 seconds for 12 seconds
  for (let sec = 2; sec <= 12; sec += 2) {
    await new Promise(r => setTimeout(r, 2000));
    diag = await page.evaluate(() => {
      const d = window.__freezeDiag;
      // Check DOM state
      const hudCanvas = document.getElementById('hud-canvas');
      const actionBar = document.getElementById('action-bar');
      const glbOverlay = document.getElementById('glb-loading-overlay');
      return {
        ...d,
        hudDisplay: hudCanvas ? getComputedStyle(hudCanvas).display : 'N/A',
        actionBarActive: actionBar?.classList.contains('active'),
        glbLoading: glbOverlay?.classList.contains('active'),
        errorsRecent: d.errors.slice(-3)
      };
    });
    console.log(`  t=${sec}s: frames=${diag.totalFrames} errors=${diag.frameErrors} hud=${diag.hudDisplay} actionBar=${diag.actionBarActive} glbLoading=${diag.glbLoading}`);
    if (diag.errorsRecent?.length) console.log('    Recent errors:', diag.errorsRecent);
  }

  await page.screenshot({ path: path.join(OUT, 'deep_gunner2.png') });
  
  // Final full diagnostics
  diag = await page.evaluate(() => window.__freezeDiag);
  console.log('\n=== FINAL DIAGNOSTICS ===');
  console.log('Total frames:', diag.totalFrames);
  console.log('Frame errors:', diag.frameErrors);
  console.log('Error ratio:', diag.frameErrors > 0 ? (diag.frameErrors / diag.totalFrames * 100).toFixed(1) + '%' : '0%');
  console.log('Unique errors:', [...new Set(diag.errors)].slice(0, 5));
  
  console.log('\n=== CONSOLE ERRORS (' + allErrors.length + ') ===');
  allErrors.slice(0, 15).forEach(e => console.log('  ' + e.substring(0, 200)));
  
  // GLB status
  const glbLogs = allLogs.filter(l => l.includes('[GLB]') || l.includes('Couldn\'t load'));
  console.log('\n=== GLB STATUS (' + glbLogs.length + ' messages) ===');
  glbLogs.slice(0, 15).forEach(l => console.log('  ' + l.substring(0, 200)));
  
  const loopErrs = allLogs.filter(l => l.includes('[GameLoop]'));
  console.log('\n=== GAMELOOP ERRORS (' + loopErrs.length + ') ===');
  loopErrs.slice(0, 10).forEach(l => console.log('  ' + l.substring(0, 200)));
  
  await browser.close();
  console.log('\n=== DONE ===');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
