const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testRealCombat() {
  console.log('🎯 REAL COMBAT TEST: Proving enemies can be killed');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1200, height: 800 },
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to game
    console.log('📍 Loading game...');
    await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for game to load
    await page.waitForSelector('#screen-title', { timeout: 15000 });
    console.log('✅ Game loaded');
    
    // Take screenshot to see the interface
    await page.screenshot({ path: './test_screenshots/game_interface.png' });
    console.log('📸 Interface screenshot saved');
    
    // Check what buttons are available
    const buttons = await page.evaluate(() => {
      const btns = document.querySelectorAll('button, .btn, [onclick]');
      return Array.from(btns).map(btn => ({
        id: btn.id,
        className: btn.className,
        text: btn.textContent?.trim().substring(0, 50),
        tag: btn.tagName
      }));
    });
    console.log('🔍 Available buttons:', buttons);
    
    // Try different button selectors for starting game
    let gameStarted = false;
    const buttonSelectors = ['#btn-new-game', '.btn-new-game', '[onclick*="newGame"]', '[onclick*="create"]', 'button:contains("NEW")', 'button:contains("Start")', 'button:contains("Play")'];
    
    for (const selector of buttonSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          console.log(`🎮 Found start button: ${selector}`);
          await page.click(selector);
          gameStarted = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!gameStarted) {
      // Try clicking any button with "new", "start", "play" text
      const success = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, .btn, [onclick]');
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('new') || text.includes('start') || text.includes('play') || text.includes('create')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (success) {
        console.log('🎮 Clicked game start button via text match');
        gameStarted = true;
      }
    }
    
    if (!gameStarted) {
      // Try the visible NEW GAME button from the screenshot
      try {
        console.log('🎮 Trying visible NEW GAME button...');
        await page.click('text=NEW GAME');
        gameStarted = true;
      } catch (e) {
        throw new Error('Could not find or click NEW GAME button: ' + e.message);
      }
    }
    await page.waitForTimeout(3000);
    
    // Skip create character, go straight to space
    const spaceBtn = await page.$('#btn-skip-to-space');
    if (spaceBtn) {
      await page.click('#btn-skip-to-space');
      await page.waitForTimeout(3000);
    }
    
    console.log('🚀 Entering space combat...');
    
    // Combat test script - inject into page
    const combatResult = await page.evaluate(async () => {
      // Wait for combat state to be ready
      if (!window.c || !window.c.active) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const startTime = performance.now();
      const report = {
        startEnemyCount: window.c.enemies ? window.c.enemies.length : 0,
        killsStart: window.c.kills || 0,
        events: []
      };
      
      report.events.push(`INITIAL: ${report.startEnemyCount} enemies, ${report.killsStart} kills`);
      
      // Force spawn enemies if none exist
      if (report.startEnemyCount === 0) {
        try {
          // Try different enemy creation functions
          if (typeof createEnemy === 'function') {
            for (let i = 0; i < 3; i++) {
              createEnemy();
              report.events.push(`Spawned enemy ${i+1}`);
            }
          } else if (typeof window.createEnemy === 'function') {
            for (let i = 0; i < 3; i++) {
              window.createEnemy();
              report.events.push(`Spawned enemy ${i+1} via window`);
            }
          }
        } catch (e) {
          report.events.push(`Enemy spawn failed: ${e.message}`);
        }
      }
      
      // Wait for enemies to appear
      await new Promise(resolve => setTimeout(resolve, 1000));
      const actualEnemyCount = window.c.enemies ? window.c.enemies.length : 0;
      report.events.push(`AFTER SPAWN: ${actualEnemyCount} enemies`);
      
      if (actualEnemyCount === 0) {
        report.error = "No enemies found after spawn attempts";
        return report;
      }
      
      // Auto-fire at enemies for 10 seconds
      const testDuration = 10000;
      let shotsFired = 0;
      
      const fireInterval = setInterval(() => {
        try {
          // Find nearest enemy
          let nearestEnemy = null;
          let nearestDist = Infinity;
          
          if (window.c.enemies) {
            window.c.enemies.forEach(e => {
              if (e && e.group && e.hp > 0) {
                const dist = e.group.position.distanceTo(window.ship.position);
                if (dist < nearestDist) {
                  nearestDist = dist;
                  nearestEnemy = e;
                }
              }
            });
          }
          
          if (nearestEnemy && nearestDist < 100) {
            // Aim at enemy and fire
            window.ship.lookAt(nearestEnemy.group.position);
            
            // Trigger weapon fire - try different methods
            if (typeof firePrimary === 'function') {
              firePrimary();
              shotsFired++;
            } else if (typeof window.firePrimary === 'function') {
              window.firePrimary();
              shotsFired++;
            } else if (window.c && typeof window.c.firePrimary === 'function') {
              window.c.firePrimary();
              shotsFired++;
            }
          }
        } catch (e) {
          report.events.push(`Fire error: ${e.message}`);
        }
      }, 100);
      
      // Monitor combat for test duration
      return new Promise(resolve => {
        let checkInterval;
        
        const cleanup = () => {
          clearInterval(fireInterval);
          if (checkInterval) clearInterval(checkInterval);
        };
        
        // Monitor enemy deaths
        checkInterval = setInterval(() => {
          const currentEnemyCount = window.c.enemies ? window.c.enemies.length : 0;
          const currentKills = window.c.kills || 0;
          const aliveEnemies = window.c.enemies ? window.c.enemies.filter(e => e && e.hp > 0).length : 0;
          
          if (currentKills > report.killsStart) {
            const newKills = currentKills - report.killsStart;
            report.events.push(`🎯 KILLS: ${newKills} enemies killed! (${currentEnemyCount} remain, ${aliveEnemies} alive)`);
          }
          
          // Check individual enemy health
          if (window.c.enemies && window.c.enemies.length > 0) {
            window.c.enemies.forEach((e, i) => {
              if (e && e.hp !== undefined) {
                const healthPct = e.maxHp ? Math.floor((e.hp / e.maxHp) * 100) : '?';
                if (e.hp <= 0 && !e._reportedDead) {
                  report.events.push(`💀 Enemy ${i} DEAD (was ${e.type || 'unknown'})`);
                  e._reportedDead = true;
                } else if (e.hp < e.maxHp && !e._reportedDamaged) {
                  report.events.push(`🩸 Enemy ${i} damaged: ${e.hp}/${e.maxHp} (${healthPct}%)`);
                  e._reportedDamaged = true;
                }
              }
            });
          }
        }, 500);
        
        // End test after duration
        setTimeout(() => {
          cleanup();
          
          const finalEnemyCount = window.c.enemies ? window.c.enemies.length : 0;
          const finalKills = window.c.kills || 0;
          const finalAlive = window.c.enemies ? window.c.enemies.filter(e => e && e.hp > 0).length : 0;
          
          report.endEnemyCount = finalEnemyCount;
          report.killsEnd = finalKills;
          report.aliveEnemies = finalAlive;
          report.totalKills = finalKills - report.killsStart;
          report.shotsFired = shotsFired;
          report.duration = performance.now() - startTime;
          
          report.events.push(`FINAL: ${finalEnemyCount} enemies (${finalAlive} alive), ${report.totalKills} kills, ${shotsFired} shots`);
          
          // SUCCESS if any enemies were killed
          report.success = report.totalKills > 0;
          report.verdict = report.success ? 'ENEMIES CAN BE KILLED' : 'NO ENEMIES KILLED';
          
          resolve(report);
        }, testDuration);
      });
    });
    
    console.log('\n=== REAL COMBAT TEST RESULTS ===');
    console.log(`🎯 Total Kills: ${combatResult.totalKills}`);
    console.log(`🔫 Shots Fired: ${combatResult.shotsFired}`);
    console.log(`⏱️  Duration: ${(combatResult.duration/1000).toFixed(1)}s`);
    console.log(`📊 Start/End Enemies: ${combatResult.startEnemyCount} → ${combatResult.endEnemyCount} (${combatResult.aliveEnemies} alive)`);
    console.log(`\n🏆 VERDICT: ${combatResult.verdict}`);
    
    console.log('\n📝 Combat Events:');
    combatResult.events.forEach((event, i) => {
      console.log(`  ${i+1}. ${event}`);
    });
    
    if (combatResult.error) {
      console.log(`\n❌ Error: ${combatResult.error}`);
    }
    
    // Take screenshot as evidence
    await page.screenshot({ path: './test_screenshots/real_combat_proof.png', fullPage: true });
    console.log('\n📸 Screenshot saved to ./test_screenshots/real_combat_proof.png');
    
    // Wait for user to see the action
    console.log('\n⏳ Keeping browser open for 5 seconds to observe...');
    await page.waitForTimeout(5000);
    
    return {
      success: combatResult.success,
      kills: combatResult.totalKills,
      shots: combatResult.shotsFired,
      report: combatResult
    };
    
  } catch (error) {
    console.error('❌ Combat test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  testRealCombat().then(result => {
    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log('✅ PROOF: Enemies CAN be killed!');
      console.log(`📈 Evidence: ${result.kills} enemies eliminated with ${result.shots} shots`);
    } else {
      console.log('❌ FAILED: Could not kill enemies');
      if (result.error) console.log(`   Error: ${result.error}`);
    }
    process.exit(result.success ? 0 : 1);
  });
}