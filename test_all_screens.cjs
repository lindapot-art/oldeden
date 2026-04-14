// test_all_screens.cjs — Test all nav screens from bridge
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
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGE: ' + err.message));

  // Navigate to bridge
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 800));
  const fc = await page.$$('.faction-card');
  if (fc.length) await fc[0].click();
  const ni = await page.$('#pilot-name');
  if (ni) { await ni.click({clickCount:3}); await ni.type('ScreenTest'); }
  await new Promise(r => setTimeout(r, 300));
  for (const btn of await page.$$('button')) {
    if ((await btn.evaluate(el => el.textContent)).includes('Create Pilot')) { await btn.click(); break; }
  }
  await new Promise(r => setTimeout(r, 2000));
  console.log('At bridge. Testing screens...\n');

  // Get all nav buttons
  const navButtons = await page.$$('.nav-btn');
  const navTexts = [];
  for (const nb of navButtons) {
    navTexts.push(await nb.evaluate(el => el.textContent.trim()));
  }
  console.log('Nav buttons found:', navTexts.join(', '));

  // Test each screen
  const screenResults = [];
  for (const label of navTexts) {
    // Click nav button
    for (const nb of await page.$$('.nav-btn')) {
      const text = await nb.evaluate(el => el.textContent.trim());
      if (text === label) {
        const errBefore = errors.length;
        await nb.click();
        await new Promise(r => setTimeout(r, 1500));
        
        // Check which screen is visible
        const screenInfo = await page.evaluate(() => {
          const all = document.querySelectorAll('.screen');
          const visible = [];
          all.forEach(s => {
            const cs = getComputedStyle(s);
            if (cs.display !== 'none') visible.push(s.id);
          });
          return { visible, bodyScrollTop: document.body.scrollTop };
        });
        
        const newErrors = errors.slice(errBefore);
        const result = {
          button: label,
          screens: screenInfo.visible,
          errors: newErrors.length,
          errMsgs: newErrors.slice(0, 2).map(e => e.substring(0, 80))
        };
        screenResults.push(result);
        const status = newErrors.length === 0 ? '✓' : '✗';
        console.log(`${status} ${label}: visible=[${screenInfo.visible.join(',')}] errors=${newErrors.length}`);
        if (newErrors.length) newErrors.slice(0,2).forEach(e => console.log(`    ERR: ${e.substring(0,120)}`));
        
        await page.screenshot({ path: path.join(OUT, `screen_${label.replace(/[^a-z]/gi,'_').toLowerCase()}.png`) });
        break;
      }
    }
    
    // Navigate back to bridge
    try {
      // In gunner mode, press Escape
      if (label.includes('Gunner')) {
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 1000));
      }
      const backBtn = await page.$('[id*="back"]:not([style*="display: none"])');
      if (backBtn) {
        const visible = await backBtn.evaluate(el => el.offsetParent !== null);
        if (visible) await backBtn.click();
      }
      // Always try Bridge nav as fallback
      for (const nb of await page.$$('.nav-btn')) {
        const t = await nb.evaluate(el => el.textContent.trim());
        if (t.includes('Bridge')) { 
          const vis = await nb.evaluate(el => el.offsetParent !== null);
          if (vis) { await nb.click(); break; }
        }
      }
    } catch(e) { /* navigation back failed, continue */ }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total screens: ${screenResults.length}`);
  console.log(`Clean (0 errors): ${screenResults.filter(r => r.errors === 0).length}`);
  console.log(`With errors: ${screenResults.filter(r => r.errors > 0).length}`);
  console.log(`Total JS errors: ${errors.length}`);
  
  if (errors.length) {
    console.log('\n=== ALL ERRORS ===');
    [...new Set(errors)].slice(0, 10).forEach(e => console.log('  ' + e.substring(0, 150)));
  }
  
  await browser.close();
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
