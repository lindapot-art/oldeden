const puppeteer = require('puppeteer');

async function quickGameplayDiagnosis() {
  console.log('🔍 QUICK GAMEPLAY DIAGNOSIS - FINDING CRITICAL ISSUES');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // Track console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate to game
    console.log('🌐 Loading game...');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'diagnosis_01_initial.png' });
    
    // Check for game elements
    const gameCanvas = await page.$('#game-canvas');
    const hudCanvas = await page.$('#hud-canvas');
    const newGameBtn = await page.$('#btn-new');
    
    console.log(`🎮 Game Canvas: ${gameCanvas ? 'FOUND' : 'MISSING'}`);
    console.log(`🖥️ HUD Canvas: ${hudCanvas ? 'FOUND' : 'MISSING'}`);
    console.log(`🎯 New Game Button: ${newGameBtn ? 'FOUND' : 'MISSING'}`);
    
    // Click New Game
    if (newGameBtn) {
      console.log('🎮 Starting new game...');
      await newGameBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'diagnosis_02_newgame.png' });
    }
    
    // Check if gameplay screen is visible
    const gameplayActive = await page.evaluate(() => {
      return window.gameState && window.gameState.screen === 'game';
    });
    
    console.log(`🎯 Gameplay Active: ${gameplayActive ? 'YES' : 'NO'}`);
    
    if (!gameplayActive) {
      // Try to navigate to gameplay
      console.log('🔧 Attempting to enter gameplay...');
      await page.keyboard.press('Escape'); // Try to get to game
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'diagnosis_03_escape.png' });
    }
    
    // Check game state
    const gameStateInfo = await page.evaluate(() => {
      if (!window.gameState) return 'NO GAME STATE';
      
      return {
        screen: window.gameState.screen,
        paused: window.gameState.paused,
        playerPosition: window.player ? {
          x: Math.floor(window.player.position.x),
          y: Math.floor(window.player.position.y)
        } : 'NO PLAYER',
        enemies: window.enemies ? window.enemies.length : 'NO ENEMIES ARRAY',
        projectiles: window.player && window.player.projectiles ? window.player.projectiles.length : 'NO PROJECTILES'
      };
    });
    
    console.log('📊 Game State:', JSON.stringify(gameStateInfo, null, 2));
    
    // Test basic controls
    console.log('🎮 Testing basic controls...');
    await page.keyboard.press('KeyW'); // Move forward
    await page.waitForTimeout(500);
    await page.keyboard.press('Space'); // Fire
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'diagnosis_04_controls.png' });
    
    // Check for enemies
    const enemyInfo = await page.evaluate(() => {
      if (!window.enemies) return 'NO ENEMIES ARRAY';
      
      return {
        count: window.enemies.length,
        spawning: typeof window.spawnEnemies === 'function' ? 'FUNCTION EXISTS' : 'NO SPAWN FUNCTION',
        enemySystem: typeof window.updateEnemies === 'function' ? 'UPDATE EXISTS' : 'NO UPDATE FUNCTION'
      };
    });
    
    console.log('👹 Enemy System:', JSON.stringify(enemyInfo, null, 2));
    
    // Force enemy spawn if possible
    await page.evaluate(() => {
      if (typeof window.spawnEnemies === 'function') {
        console.log('🔧 Force spawning enemies...');
        window.spawnEnemies();
      }
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'diagnosis_05_enemies.png' });
    
    // Check targeting system
    const targetingInfo = await page.evaluate(() => {
      if (!window.targetingSystem) return 'NO TARGETING SYSTEM';
      
      return {
        exists: true,
        target: window.targetingSystem.target ? 'HAS TARGET' : 'NO TARGET',
        lockOn: window.targetingSystem.lockOn ? 'LOCKED ON' : 'NOT LOCKED'
      };
    });
    
    console.log('🎯 Targeting System:', JSON.stringify(targetingInfo, null, 2));
    
    // Test targeting key
    await page.keyboard.press('KeyT');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'diagnosis_06_targeting.png' });
    
    // Check if game loop is running
    const gameLoopInfo = await page.evaluate(() => {
      return {
        gameLoop: typeof window.gameLoop === 'function' ? 'EXISTS' : 'MISSING',
        requestAnimationFrame: typeof window.requestAnimationFrame === 'function' ? 'EXISTS' : 'MISSING',
        scene: window.scene ? 'EXISTS' : 'MISSING',
        camera: window.camera ? 'EXISTS' : 'MISSING',
        renderer: window.renderer ? 'EXISTS' : 'MISSING'
      };
    });
    
    console.log('🔄 Game Loop:', JSON.stringify(gameLoopInfo, null, 2));
    
    // Final screenshot
    await page.screenshot({ path: 'diagnosis_07_final.png' });
    
    console.log('🔍 DIAGNOSIS COMPLETE');
    console.log(`❌ Console Errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach((error, index) => {
        console.log(`❌ Error ${index + 1}: ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

quickGameplayDiagnosis().catch(console.error);