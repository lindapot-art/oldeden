// Diagnostic test — what happens during character creation
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-gpu','--disable-software-rasterizer'] });
  const page = await browser.newPage();
  const errors = [];
  
  page.on('console', msg => {
    const txt = msg.text();
    if (msg.type() === 'error' && !txt.includes('WebGL') && !txt.includes('THREE.WebGLRenderer') && !txt.includes('ERR_CONNECTION_REFUSED')) {
      errors.push(txt);
    }
  });
  page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));

  try {
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('#screen-title.active', { timeout: 5000 });
    console.log('1. Title screen active');

    // Click New Game
    await page.click('[id="btn-new"]');
    await new Promise(r => setTimeout(r, 500));
    
    // Check create screen
    const createActive = await page.$eval('#screen-create', el => el.classList.contains('active')).catch(() => false);
    console.log(`2. Create screen active: ${createActive}`);
    
    // Check faction grid
    const factionCards = await page.$$('#faction-grid .faction-card');
    console.log(`3. Faction cards count: ${factionCards.length}`);
    
    // Check pilot-name exists
    const pilotNameExists = await page.$('#pilot-name');
    console.log(`4. pilot-name exists: ${!!pilotNameExists}`);
    
    // Check genome-canvas exists
    const genomeCanvas = await page.$('#genome-canvas');
    console.log(`5. genome-canvas exists: ${!!genomeCanvas}`);
    
    // Check gene-stats exists
    const geneStats = await page.$('#gene-stats');
    console.log(`6. gene-stats exists: ${!!geneStats}`);

    // Fill name
    if (pilotNameExists) {
      await pilotNameExists.click();
      await pilotNameExists.type('TestPilot');
      const nameVal = await page.$eval('#pilot-name', el => el.value);
      console.log(`7. Pilot name value: "${nameVal}"`);
    }

    // Select faction
    if (factionCards.length > 0) {
      await factionCards[0].click();
      await new Promise(r => setTimeout(r, 200));
      const selected = await page.$$('#faction-grid .faction-card.selected');
      console.log(`8. Selected faction cards: ${selected.length}`);
      
      // Check state.player.faction
      const factionVal = await page.evaluate(() => window.state?.player?.faction || 'NOT SET');
      console.log(`9. state.player.faction: ${factionVal}`);
    }

    // Check state before creating character
    const preState = await page.evaluate(() => ({
      faction: window.state?.player?.faction || 'NOT SET',
      name: document.getElementById('pilot-name')?.value || 'NOT SET',
      screen: window.state?.screen || 'NOT SET',
    }));
    console.log(`10. Pre-create state: ${JSON.stringify(preState)}`);

    // Click create character
    await page.click('#btn-create-char');
    await new Promise(r => setTimeout(r, 1000));

    // Check what happened
    const postState = await page.evaluate(() => ({
      screen: window.state?.screen || 'NOT SET',
      activeScreens: [...document.querySelectorAll('.screen.active')].map(e => e.id),
      playerName: window.state?.player?.name || 'NOT SET',
      faction: window.state?.player?.faction || 'NOT SET',
    }));
    console.log(`11. Post-create state: ${JSON.stringify(postState)}`);

    // Check for any errors during creation
    console.log(`\nErrors during flow: ${errors.length}`);
    errors.forEach(e => console.log(`  ERROR: ${e}`));

  } catch (err) {
    console.log(`FATAL: ${err.message}`);
    console.log(`Errors so far: ${errors.length}`);
    errors.forEach(e => console.log(`  ERROR: ${e}`));
  } finally {
    await browser.close();
  }
})();
