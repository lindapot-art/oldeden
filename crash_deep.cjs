/**
 * Deep gameplay crash test — simulates actual combat and interactions
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

  page.on('pageerror', (err) => {
    errors.push({ type: 'PAGEERROR', msg: err.message });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404'))
        errors.push({ type: 'CONSOLE_ERR', msg: text });
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Start game
  await page.click('#btn-new');
  await new Promise(r => setTimeout(r, 1500));

  // Create pilot
  await page.evaluate(() => {
    const input = document.getElementById('pilot-name');
    if (input) input.value = 'CrashTest';
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.toLowerCase().includes('create') || b.textContent.toLowerCase().includes('launch')) {
        b.click(); break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 3000));
  console.log(`After create: ${errors.length} errors`);

  // Test 1: Simulate combat interactions via game state
  console.log('--- TEST 1: Force enemy spawn + combat ---');
  const test1 = await page.evaluate(() => {
    try {
      const errs = [];
      // Check if game state exists
      if (typeof state === 'undefined') return { err: 'state not defined' };
      if (!state.active) return { err: 'game not active, screen=' + state.screen };
      
      // Try to spawn some enemies to trigger combat code
      if (typeof spawnEnemy === 'function') {
        try { spawnEnemy(); } catch(e) { errs.push('spawnEnemy: ' + e.message); }
      }
      
      // Try firing weapons
      if (typeof fireLaser === 'function') {
        try { fireLaser(); } catch(e) { errs.push('fireLaser: ' + e.message); }
      }
      if (typeof spawnNail === 'function') {
        try { spawnNail(); } catch(e) { errs.push('spawnNail: ' + e.message); }
      }
      
      return { active: state.active, screen: state.screen, errs };
    } catch(e) {
      return { err: e.message };
    }
  });
  console.log('Test 1 result:', JSON.stringify(test1));

  // Test 2: Force damage/death
  console.log('--- TEST 2: Force player damage + death ---');
  const test2 = await page.evaluate(() => {
    try {
      const errs = [];
      if (typeof c === 'undefined') return { err: 'c (character) not defined' };
      
      // Deal damage
      if (typeof takeDamage === 'function') {
        try { takeDamage(50); } catch(e) { errs.push('takeDamage(50): ' + e.message); }
      }
      
      // Force death
      const oldHull = c.hull;
      c.hull = 0;
      if (typeof playerDeathSequence === 'function') {
        try { playerDeathSequence('crash test'); } catch(e) { errs.push('playerDeathSequence: ' + e.message); }
      }
      
      return { hull: c.hull, dead: c.dead, errs };
    } catch(e) {
      return { err: e.message };
    }
  });
  console.log('Test 2 result:', JSON.stringify(test2));
  await new Promise(r => setTimeout(r, 3000));

  // Test 3: Rapid-fire actions
  console.log('--- TEST 3: Rapid keyboard input simulation ---');
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Space'); // Fire
    await page.keyboard.press('w');
    await page.keyboard.press('a');
    await new Promise(r => setTimeout(r, 50));
  }
  await new Promise(r => setTimeout(r, 2000));

  // Test 4: Screen transitions
  console.log('--- TEST 4: Rapid screen transitions ---');
  const test4 = await page.evaluate(() => {
    try {
      const errs = [];
      if (typeof showScreen === 'function') {
        try { showScreen('settings'); } catch(e) { errs.push('showScreen settings: ' + e.message); }
        try { showScreen('bridge'); } catch(e) { errs.push('showScreen bridge: ' + e.message); }
        try { showScreen('market'); } catch(e) { errs.push('showScreen market: ' + e.message); }
        try { showScreen('bridge'); } catch(e) { errs.push('showScreen bridge: ' + e.message); }
      }
      return { errs };
    } catch(e) {
      return { err: e.message };
    }
  });
  console.log('Test 4 result:', JSON.stringify(test4));
  await new Promise(r => setTimeout(r, 2000));

  // Test 5: Force rebirth flow
  console.log('--- TEST 5: Rebirth/karma ---');
  const test5 = await page.evaluate(() => {
    try {
      const errs = [];
      if (typeof showScreen === 'function') {
        try { showScreen('rebirth'); } catch(e) { errs.push('showScreen rebirth: ' + e.message); }
      }
      if (typeof startKarmaWheel === 'function') {
        try { startKarmaWheel(); } catch(e) { errs.push('startKarmaWheel: ' + e.message); }
      }
      return { errs };
    } catch(e) {
      return { err: e.message };
    }
  });
  console.log('Test 5 result:', JSON.stringify(test5));
  await new Promise(r => setTimeout(r, 5000));

  // Final error count
  console.log('\n========== FINAL REPORT ==========');
  console.log(`Total JS errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach((e, i) => console.log(`  ${i + 1}. [${e.type}] ${e.msg.slice(0, 300)}`));
  }

  // Check for red error overlays
  const overlays = await page.evaluate(() => {
    const divs = document.querySelectorAll('div[style*="background:red"], div[style*="background:darkred"]');
    return Array.from(divs).map(d => d.textContent).slice(0, 5);
  });
  if (overlays.length > 0) {
    console.log('\nError overlays on screen:');
    overlays.forEach((o, i) => console.log(`  ${i + 1}. ${o.slice(0, 200)}`));
  }

  await browser.close();
})().catch(e => {
  console.error('CRASH DIAG FAILED:', e.message);
  process.exit(1);
});
