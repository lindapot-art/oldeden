// Visual Proxy QA with 1000 Screenshots - Old Eden Space MMO
// Advanced QA system with continuous visual monitoring

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

console.log('🎯 Starting Visual Proxy QA with 1000 screenshots...');

async function runVisualProxyQA() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const screenshotDir = path.join(__dirname, 'gameplay_screenshots', 'continuous_monitoring');
  
  // Create screenshots directory
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  console.log('📸 Screenshot directory:', screenshotDir);
  
  try {
    console.log('🌐 Navigating to game...');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 10000 });
    
    console.log('🎮 Starting gameplay session...');
    
    // Click New Game
    await page.click('#btn-new');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Select first faction
    await page.evaluate(() => {
      const factionCards = document.querySelectorAll('.faction-card');
      if (factionCards.length > 0) {
        factionCards[0].click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start continuous monitoring
    let screenshotCount = 0;
    const maxScreenshots = 1000;
    const intervalMs = 4000; // Every 4 seconds as requested
    
    const gameplayActions = [
      () => page.keyboard.press('1'), // Laser
      () => page.keyboard.press('2'), // Railgun  
      () => page.keyboard.press('3'), // Pistol
      () => page.keyboard.press('t'), // Target enemy
      () => page.keyboard.press('q'), // Shield boost
      () => page.keyboard.press('z'), // Weapon overdrive
      () => page.mouse.move(640, 450), // Center mouse
      () => page.mouse.click(640, 450), // Click to fire
      () => page.keyboard.press('Space'), // Afterburner
      () => page.keyboard.press('y'), // Auto-targeting
    ];
    
    console.log(`🔄 Starting ${maxScreenshots} screenshot monitoring (every ${intervalMs}ms)...`);
    
    const monitoringInterval = setInterval(async () => {
      try {
        screenshotCount++;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = path.join(screenshotDir, `gameplay_${screenshotCount.toString().padStart(4, '0')}_${timestamp}.png`);
        
        // Take screenshot
        await page.screenshot({ path: screenshotPath });
        
        // Perform random gameplay action
        const randomAction = gameplayActions[Math.floor(Math.random() * gameplayActions.length)];
        await randomAction();
        
        // Check for errors
        const errors = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('[data-error], .error, .warning');
          return Array.from(errorElements).map(el => el.textContent);
        });
        
        // Check gameplay state
        const gameState = await page.evaluate(() => {
          return {
            screen: window.state ? window.state.screen : 'unknown',
            health: window.state && window.state.ship ? window.state.ship.hull : 'unknown',
            shield: window.state && window.state.ship ? window.state.ship.shield : 'unknown',
            enemyCount: window.c && window.c.enemies ? window.c.enemies.length : 'unknown',
            active: window.c ? window.c.active : false
          };
        });
        
        console.log(`📸 Screenshot ${screenshotCount}/${maxScreenshots} - Screen: ${gameState.screen}, Health: ${gameState.health}, Enemies: ${gameState.enemyCount}`);
        
        if (errors.length > 0) {
          console.log('⚠️ Errors detected:', errors);
        }
        
        if (screenshotCount >= maxScreenshots) {
          console.log('✅ Completed 1000 screenshot monitoring session');
          clearInterval(monitoringInterval);
          await browser.close();
          
          // Generate summary report
          generateMonitoringReport(screenshotDir, screenshotCount);
        }
        
      } catch (error) {
        console.error('❌ Error during screenshot:', error.message);
      }
    }, intervalMs);
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('🛑 Stopping visual monitoring...');
      clearInterval(monitoringInterval);
      await browser.close();
      generateMonitoringReport(screenshotDir, screenshotCount);
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Visual Proxy QA failed:', error);
    await browser.close();
  }
}

function generateMonitoringReport(screenshotDir, totalScreenshots) {
  const reportPath = path.join(__dirname, 'visual_monitoring_report.txt');
  const report = `
VISUAL PROXY QA MONITORING REPORT
=================================
Timestamp: ${new Date().toISOString()}
Total Screenshots: ${totalScreenshots}
Screenshot Directory: ${screenshotDir}
Interval: Every 4 seconds
Duration: ${Math.floor(totalScreenshots * 4 / 60)} minutes

GAMEPLAY ACTIONS TESTED:
- Weapon switching (1,2,3 keys)
- Targeting system (T key)
- Special abilities (Q,Z keys) 
- Mouse aiming and firing
- Afterburner (Space)
- Auto-targeting toggle (Y)

MONITORING COMPLETE
Screenshots saved for frame-by-frame analysis
Game state logged every 4 seconds
Error detection active throughout session
  `;
  
  fs.writeFileSync(reportPath, report);
  console.log('📋 Monitoring report saved:', reportPath);
}

// Start the visual monitoring
runVisualProxyQA().catch(console.error);