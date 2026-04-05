/**
 * Crash diagnostic — plays through the game and captures every JS error
 */
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
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
  const errors = [];
  const warnings = [];

  page.on('pageerror', (err) => {
    errors.push({ type: 'PAGEERROR', msg: err.message, ts: Date.now() });
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('favicon') && !text.includes('404')) {
      errors.push({ type: 'CONSOLE_ERR', msg: text, ts: Date.now() });
    } else if (msg.type() === 'warning') {
      warnings.push(text);
    }
  });

  console.log('[DIAG] Loading game...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log(`[DIAG] After load: ${errors.length} errors`);
  errors.forEach((e, i) => console.log(`  ${i + 1}. [${e.type}] ${e.msg.slice(0, 200)}`));

  // Click New Game
  console.log('[DIAG] Clicking New Game...');
  await page.click('#btn-new').catch(() => console.log('[DIAG] btn-new not found'));
  await new Promise(r => setTimeout(r, 2000));

  console.log(`[DIAG] After New Game: ${errors.length} errors`);

  // Fill in character creation and start game
  console.log('[DIAG] Looking for create screen...');
  const createVisible = await page.evaluate(() => {
    const el = document.getElementById('screen-create');
    return el ? el.style.display !== 'none' : false;
  });
  console.log(`[DIAG] Create screen visible: ${createVisible}`);

  if (createVisible) {
    // Type a name
    await page.evaluate(() => {
      const input = document.getElementById('pilot-name');
      if (input) input.value = 'CrashTest';
    });

    // Click start/launch button
    const startBtn = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        const text = b.textContent.toLowerCase();
        if (text.includes('launch') || text.includes('start') || text.includes('play') || text.includes('begin') || text.includes('create')) {
          b.click();
          return b.textContent;
        }
      }
      return null;
    });
    console.log(`[DIAG] Clicked start button: "${startBtn}"`);
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`[DIAG] After game start: ${errors.length} errors`);
  errors.slice(-10).forEach((e, i) => console.log(`  ${i + 1}. [${e.type}] ${e.msg.slice(0, 200)}`));

  // Let the game run for 10 seconds to catch runtime errors
  console.log('[DIAG] Running game for 10 seconds...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('\n========== FINAL ERROR REPORT ==========');
  console.log(`Total errors: ${errors.length}`);
  console.log(`Total warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('\nAll errors:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. [${e.type}] ${e.msg.slice(0, 300)}`));
  } else {
    console.log('\nZERO errors during full gameplay test');
  }

  if (warnings.length > 0) {
    console.log(`\nFirst 10 warnings:`);
    warnings.slice(0, 10).forEach((w, i) => console.log(`  ${i + 1}. ${w.slice(0, 200)}`));
  }

  // Check what screen we're on
  const screenState = await page.evaluate(() => {
    const screens = ['screen-title', 'screen-create', 'screen-bridge', 'screen-settings',
      'screen-rebirth', 'screen-karma', 'screen-eulogy', 'screen-market'];
    const visible = [];
    for (const id of screens) {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none') visible.push(id);
    }
    return { visibleScreens: visible, canvasVisible: !!document.getElementById('game-canvas') };
  });
  console.log(`\nVisible screens: ${JSON.stringify(screenState)}`);

  await browser.close();
})().catch(e => {
  console.error('CRASH DIAG FAILED:', e.message);
  process.exit(1);
});
