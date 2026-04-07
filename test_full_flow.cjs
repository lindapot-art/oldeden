const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: 'new', 
      args: ['--no-sandbox', '--enable-webgl', '--use-gl=swiftshader']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    const errors = [];
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
      else logs.push(msg.type() + ': ' + msg.text());
    });
    page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));
    page.on('requestfailed', req => errors.push('NET_FAIL: ' + req.url() + ' ' + req.failure().errorText));
    
    // Step 1: Load page
    console.log('Step 1: Loading page...');
    const response = await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Page status:', response.status());
    await page.screenshot({ path: 'test_screenshots/01_title.png' });
    console.log('Screenshot: 01_title.png');
    
    // Step 2: Check WebGL
    const webglStatus = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return 'NO WEBGL';
      return 'WebGL: ' + gl.getParameter(gl.RENDERER);
    });
    console.log('WebGL:', webglStatus);
    
    // Step 3: Check if Three.js loaded via module  
    const canvasInfo = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      if (!c) return 'game-canvas NOT FOUND';
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return {
        exists: true,
        width: c.width,
        height: c.height,
        hasWebGL: !!gl,
        renderer: gl ? gl.getParameter(gl.RENDERER) : 'none'
      };
    });
    console.log('Game canvas:', JSON.stringify(canvasInfo));
    
    // Step 4: Click New Game
    console.log('\nStep 4: Clicking New Game...');
    await page.click('#btn-new');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'test_screenshots/02_create.png' });
    console.log('Screenshot: 02_create.png');
    
    // Step 5: Create character
    console.log('Step 5: Creating character...');
    await page.click('#faction-grid .faction-card:first-child');
    await new Promise(r => setTimeout(r, 200));
    await page.type('#pilot-name', 'TestPilot');
    await page.click('#btn-create-char');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'test_screenshots/03_bridge.png' });
    console.log('Screenshot: 03_bridge.png');
    
    // Check bridge state
    const bridgeState = await page.evaluate(() => {
      const screens = [...document.querySelectorAll('.screen.active')].map(s => s.id);
      const nav = document.getElementById('nav-bar');
      return {
        activeScreens: screens,
        navVisible: nav ? nav.classList.contains('visible') : 'nav not found',
        navDisplay: nav ? window.getComputedStyle(nav).display : 'nav not found',
      };
    });
    console.log('Bridge state:', JSON.stringify(bridgeState));
    
    // Step 6: Click Gunner
    console.log('\nStep 6: Clicking Gunner in nav bar...');
    await page.click('button[data-screen="gunner"]');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'test_screenshots/04_gunner.png' });
    console.log('Screenshot: 04_gunner.png');
    
    // Check what we see
    const gunnerState = await page.evaluate(() => {
      const screens = [...document.querySelectorAll('.screen.active')].map(s => s.id);
      const hud = document.getElementById('hud-canvas');
      const hudActive = hud ? hud.classList.contains('active') : 'hud not found';
      const lockPrompt = document.getElementById('lock-prompt');
      const lockPromptDisplay = lockPrompt ? window.getComputedStyle(lockPrompt).display : 'lock-prompt not found';
      return {
        activeScreens: screens,
        hudActive,
        lockPromptDisplay,
        cursor: document.body.style.cursor,
      };
    });
    console.log('Gunner state:', JSON.stringify(gunnerState));
    
    // Step 7: Press ESC to exit gunner
    console.log('\nStep 7: Pressing ESC to exit gunner...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'test_screenshots/05_after_esc.png' });
    
    const afterEsc = await page.evaluate(() => {
      const screens = [...document.querySelectorAll('.screen.active')].map(s => s.id);
      const nav = document.getElementById('nav-bar');
      return {
        activeScreens: screens,
        navVisible: nav ? nav.classList.contains('visible') : 'nav not found',
      };
    });
    console.log('After ESC:', JSON.stringify(afterEsc));
    
    // Report errors
    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log('ERR:', e));
    if (errors.length === 0) console.log('None');
    
    // Key console logs
    console.log('\n=== GAME LOGS (first 20) ===');
    logs.filter(l => l.includes('[Old Eden]') || l.includes('System') || l.includes('error')).slice(0, 20).forEach(l => console.log(l));
    
  } catch(err) {
    console.error('TEST FAILED:', err.message);
  } finally {
    if (browser) await browser.close();
  }
})();
