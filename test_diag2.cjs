// Diagnostic test — inject error trapping into createCharacter
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-gpu','--disable-software-rasterizer'] });
  const page = await browser.newPage();
  const allLogs = [];
  
  page.on('console', msg => allLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => allLogs.push(`PAGE_ERROR: ${err.message}`));

  try {
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('#screen-title.active', { timeout: 5000 });

    // Click New Game
    await page.click('[id="btn-new"]');
    await new Promise(r => setTimeout(r, 500));
    
    // Fill name
    await page.type('#pilot-name', 'TestPilot');
    
    // Select faction
    await page.click('#faction-grid .faction-card');
    await new Promise(r => setTimeout(r, 200));

    // Wrap createCharacter in try/catch via page.evaluate
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          // Access module-scope function via the button click
          const btn = document.getElementById('btn-create-char');
          if (!btn) return resolve({ error: 'btn-create-char not found' });
          
          // Intercept errors by wrapping the click
          const origOnerror = window.onerror;
          let caughtError = null;
          window.onerror = (msg, src, line, col, err) => {
            caughtError = { msg, src, line, col, stack: err?.stack };
            return true;
          };
          
          btn.click();
          
          setTimeout(() => {
            window.onerror = origOnerror;
            const activeScreens = [...document.querySelectorAll('.screen.active')].map(e => e.id);
            resolve({
              activeScreens,
              caughtError,
              commsItems: document.querySelectorAll('#comms-feed li, #comms-feed .comms-item').length,
            });
          }, 1000);
        } catch (e) {
          resolve({ error: e.message, stack: e.stack });
        }
      });
    });
    
    console.log('Create result:', JSON.stringify(result, null, 2));
    
    // Print any page errors that happened
    const pageErrors = allLogs.filter(l => l.includes('PAGE_ERROR') || l.includes('ERROR') || l.includes('error'));
    console.log(`\nRelevant logs (${pageErrors.length}):`);
    pageErrors.forEach(l => console.log(`  ${l}`));

  } catch (err) {
    console.log(`FATAL: ${err.message}`);
  } finally {
    await browser.close();
  }
})();
