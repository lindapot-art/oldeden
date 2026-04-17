const p = require('puppeteer');
(async () => {
  const b = await p.launch({headless:'new', args:['--no-sandbox','--disable-gpu']});
  const pg = await b.newPage();
  const errs = [];
  const warns = [];
  pg.on('pageerror', e => errs.push({msg: e.message, stack: e.stack ? e.stack.split('\n').slice(0,3).join(' | ') : ''}));
  pg.on('console', m => { if (m.type()==='warning') warns.push(m.text().substring(0,150)); });
  
  await pg.goto('http://localhost:3847', {waitUntil:'networkidle0', timeout:20000});
  await new Promise(r => setTimeout(r, 2000));
  console.log('=== PHASE 1: Title Screen ===');
  console.log('Errors so far:', errs.length);
  
  // Click New Game
  const btnNew = await pg.$('[id="btn-new"]');
  if (btnNew) { await btnNew.click(); console.log('Clicked New Game'); }
  else { console.log('ERROR: btn-new not found!'); }
  await new Promise(r => setTimeout(r, 1500));
  
  console.log('=== PHASE 2: Create Screen ===');
  const createVisible = await pg.evaluate(() => {
    const el = document.getElementById('screen-create');
    return el ? getComputedStyle(el).display : 'NOT FOUND';
  });
  console.log('Create screen display:', createVisible);
  console.log('Errors after create:', errs.length);

  // Fill in pilot name
  await pg.evaluate(() => {
    const input = document.getElementById('pilot-name');
    if (input) { input.value = 'TestPilot'; input.dispatchEvent(new Event('input')); }
  });
  console.log('Filled pilot name');

  // Select first faction
  await new Promise(r => setTimeout(r, 500));
  const factionSelected = await pg.evaluate(() => {
    const card = document.querySelector('.faction-card');
    if (card) { card.click(); return card.textContent.trim().substring(0,30); }
    return 'no faction cards found';
  });
  console.log('Selected faction:', factionSelected);
  
  // Find visible buttons
  const visibleBtns = await pg.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns
      .filter(b => getComputedStyle(b).display !== 'none' && b.offsetParent !== null)
      .map(b => ({id: b.id, text: b.textContent.trim().substring(0,40)}))
      .slice(0, 20);
  });
  console.log('Visible buttons:', JSON.stringify(visibleBtns));
  
  // Click begin/create/start button
  const beginBtn = await pg.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const begin = btns.find(b => /create pilot|begin|born|journey|embark/i.test(b.textContent) && b.offsetParent !== null);
    if (begin) { begin.click(); return begin.textContent.trim().substring(0,40); }
    return null;
  });
  console.log('Clicked begin button:', beginBtn);
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('=== PHASE 3: After Character Creation ===');
  const currentScreens = await pg.evaluate(() => {
    const screens = document.querySelectorAll('.screen');
    const visible = [];
    screens.forEach(s => { if (s.classList.contains('active') && s.id) visible.push(s.id); });
    return visible;
  });
  console.log('Visible screens:', currentScreens);
  console.log('Errors after begin:', errs.length);
  
  // Check game state
  const stateCheck = await pg.evaluate(() => {
    try {
      // Access module-scope variables via window.__debugState if exposed
      return 'state not directly accessible (module scope)';
    } catch(e) { return e.message; }
  });
  console.log('State check:', stateCheck);

  // Try Enter Space (may be blocked by threeReady guard in headless)
  const launchResult = await pg.evaluate(() => {
    const btn = document.getElementById('btn-launch');
    if (btn) { btn.click(); return 'clicked btn-launch: ' + btn.textContent.trim().substring(0,30); }
    return 'not found';
  });
  console.log('Launch result:', launchResult);
  await new Promise(r => setTimeout(r, 3000));
  
  // Check for comms messages indicating success/failure
  const commsContent = await pg.evaluate(() => {
    const feed = document.getElementById('comms-feed');
    return feed ? feed.textContent.substring(0, 500) : 'no comms-feed';
  });
  console.log('Comms feed:', commsContent);
    const visible = [];
    screens.forEach(s => { if (getComputedStyle(s).display !== 'none' && s.id) visible.push(s.id); });
    return visible;
  });
  console.log('Visible screens:', finalScreens);
  
  const gameState = await pg.evaluate(() => {
    const c = document.getElementById('game-canvas');
    const h = document.getElementById('hud-canvas');
    return {
      canvas: c ? {display: getComputedStyle(c).display, w: c.width, h: c.height} : 'NOT FOUND',
      hud: h ? {display: getComputedStyle(h).display} : 'NOT FOUND',
      hasThree: typeof THREE !== 'undefined',
      hasState: typeof state !== 'undefined',
      screen: typeof state !== 'undefined' ? state.screen : 'N/A'
    };
  });
  console.log('Game state:', JSON.stringify(gameState));
  
  console.log('\n=== ALL ERRORS ===');
  errs.forEach((e,i) => console.log('ERR '+(i+1)+':', e.msg.substring(0,150), '\n  ', e.stack.substring(0,200)));
  console.log('Total errors:', errs.length);
  
  console.log('\n=== MISSING ELEMENT WARNINGS ===');
  warns.filter(w => w.includes('[_on]')).forEach(w => console.log(w));
  
  await b.close();
})();
