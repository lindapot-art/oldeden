#!/usr/bin/env node
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('[TEST] Checking New Game button flow...\n');
  
  try {
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('✓ Page loaded');
    
    // Check if New Game button exists
    const btnExists = await page.$('#btn-new');
    console.log(btnExists ? '✓ New Game button found' : '✗ New Game button NOT found');
    
    // Check current screen
    const screen1 = await page.evaluate(() => {
      const s = document.getElementById('screen-title');
      return { exists: !!s, visible: s && getComputedStyle(s).display !== 'none' };
    });
    console.log(`✓ Title screen: exists=${screen1.exists}, visible=${screen1.visible}`);
    
    // Click New Game
    console.log('\nClicking New Game...');
    await page.click('#btn-new', { delay: 100 });
    await page.waitForTimeout(1000);
    
    // Check screen after click
    const screen2 = await page.evaluate(() => {
      const screens = ['screen-create', 'screen-bridge', 'screen-gunner'];
      return screens.map(id => {
        const s = document.getElementById(id);
        return { id, exists: !!s, visible: s && getComputedStyle(s).display !== 'none' };
      });
    });
    console.log('Screens after click:');
    screen2.forEach(s => console.log(`  ${s.id}: exists=${s.exists}, visible=${s.visible}`));
    
  } catch (e) {
    console.error('[ERROR]', e.message);
  }
  
  await browser.close();
  process.exit(0);
})();
