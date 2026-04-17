const p = require('puppeteer');
(async () => {
  const b = await p.launch({headless:'new', args:['--no-sandbox','--disable-gpu']});
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message.substring(0,200)));
  pg.on('console', m => { if (m.type()==='error') errs.push('[console] ' + m.text().substring(0,200)); });
  
  await pg.goto('http://localhost:3847', {waitUntil:'networkidle0', timeout:20000});
  await new Promise(r => setTimeout(r, 2000));
  console.log('=== PHASE 1: Title Screen ===');
  const titleActive = await pg.evaluate(() => document.getElementById('screen-title')?.classList.contains('active'));
  console.log('Title screen active:', titleActive);
  console.log('Errors:', errs.length);
  
  // Click New Game
  const btnNew = await pg.$('[id="btn-new"]');
  if (btnNew) { await btnNew.click(); console.log('Clicked New Game'); }
  else { console.log('ERROR: btn-new not found!'); }
  await new Promise(r => setTimeout(r, 1500));
  
  console.log('\n=== PHASE 2: Create Screen ===');
  const createActive = await pg.evaluate(() => document.getElementById('screen-create')?.classList.contains('active'));
  console.log('Create screen active:', createActive);
  
  // Fill in pilot name
  await pg.evaluate(() => {
    const input = document.getElementById('pilot-name');
    if (input) { input.value = 'TestPilot'; input.dispatchEvent(new Event('input')); }
    else { console.error('pilot-name input not found!'); }
  });
  console.log('Filled pilot name');

  // Select first faction
  await new Promise(r => setTimeout(r, 500));
  const factionResult = await pg.evaluate(() => {
    const cards = document.querySelectorAll('.faction-card');
    if (cards.length > 0) { cards[0].click(); return 'Selected: ' + cards[0].textContent.trim().substring(0,30); }
    return 'No faction cards found (count: ' + cards.length + ')';
  });
  console.log('Faction:', factionResult);
  console.log('Errors after faction:', errs.length);

  // Click Create Pilot
  const createResult = await pg.evaluate(() => {
    const btn = document.getElementById('btn-create-char');
    if (btn) { btn.click(); return 'clicked'; }
    return 'not found';
  });
  console.log('Create Pilot clicked:', createResult);
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('\n=== PHASE 3: After Character Creation ===');
  const activeScreens = await pg.evaluate(() => {
    return Array.from(document.querySelectorAll('.screen.active')).map(s => s.id);
  });
  console.log('Active screens:', activeScreens);
  
  // Check comms for messages
  const comms = await pg.evaluate(() => {
    const feed = document.getElementById('comms-feed');
    return feed ? feed.textContent.trim().substring(0, 400) : 'no comms-feed';
  });
  console.log('Comms:', comms);
  
  // Check nav-bar visibility
  const navVisible = await pg.evaluate(() => {
    const nav = document.getElementById('nav-bar');
    return nav ? nav.classList.contains('visible') : 'nav-bar not found';
  });
  console.log('Nav bar visible:', navVisible);
  console.log('Errors after create:', errs.length);
  
  // Try Enter Space
  const launchResult = await pg.evaluate(() => {
    const btn = document.getElementById('btn-launch');
    if (btn) { btn.click(); return 'clicked: ' + btn.textContent.trim(); }
    return 'not found';
  });
  console.log('\n=== PHASE 4: Launch ===');
  console.log('Launch button:', launchResult);
  await new Promise(r => setTimeout(r, 3000));
  
  const afterLaunch = await pg.evaluate(() => {
    return Array.from(document.querySelectorAll('.screen.active')).map(s => s.id);
  });
  console.log('Active screens after launch:', afterLaunch);
  
  // Check comms for gunner block message
  const comms2 = await pg.evaluate(() => {
    const feed = document.getElementById('comms-feed');
    return feed ? feed.textContent.trim().substring(0, 500) : 'no comms-feed';
  });
  console.log('Comms after launch:', comms2);

  console.log('\n=== ALL ERRORS ===');
  errs.forEach((e,i) => console.log('ERR '+(i+1)+':', e));
  console.log('Total errors:', errs.length);
  
  await b.close();
})();
