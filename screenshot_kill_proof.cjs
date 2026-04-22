const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function takeScreenshotProof() {
  console.log('📸 SCREENSHOT PROOF: Taking visual evidence of enemy kills');
  
  const screenshotDir = './test_screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to game
    console.log('🌐 Loading Old Eden Space MMO...');
    await page.goto('http://localhost:3847', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for game interface
    await page.waitForSelector('#screen-title', { timeout: 15000 });
    console.log('✅ Game loaded successfully');
    
    // Take screenshot of main menu
    await page.screenshot({ path: `${screenshotDir}/01_main_menu.png`, fullPage: true });
    console.log('📸 Screenshot 1: Main menu');
    
    // Start new game - click the "New Game" button we found
    console.log('🎮 Starting new game...');
    await page.click('#btn-new');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot of character creation
    await page.screenshot({ path: `${screenshotDir}/02_character_creation.png`, fullPage: true });
    console.log('📸 Screenshot 2: Character creation');
    
    // Skip character creation and go to space
    try {
      // Try different ways to get to space combat
      const spaceButtons = ['#btn-enter-eden', '#btn-launch', '[onclick*="space"]', 'button:has-text("SPACE")', 'button:has-text("ENTER")'];
      
      let entered = false;
      for (const btn of spaceButtons) {
        try {
          const element = await page.$(btn);
          if (element) {
            console.log(`🚀 Clicking space button: ${btn}`);
            await page.click(btn);
            entered = true;
            break;
          }
        } catch (e) {
          // Try next button
        }
      }
      
      if (!entered) {
        // Click create pilot then enter eden
        const createBtn = await page.$('#btn-create-char');
        if (createBtn) {
          await page.click('#btn-create-char');
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page.click('#btn-enter-eden');
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 4000));
    } catch (e) {
      console.log('⚠️  Navigation error:', e.message);
    }
    
    // Take screenshot after entering game
    await page.screenshot({ path: `${screenshotDir}/03_entering_space.png`, fullPage: true });
    console.log('📸 Screenshot 3: Entering space');
    
    // Wait for 3D canvas and combat state
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Inject combat monitoring script
    console.log('⚔️  Starting combat monitoring...');
    const combatResults = await page.evaluate(async () => {
      const results = {
        phase: 'INIT',
        screenshots: [],
        enemies: { before: 0, after: 0, killed: 0 },
        combat: { shots: 0, hits: 0, damage: 0 },
        timeline: []
      };
      
      // Helper function to get enemy status
      const getEnemyStatus = () => {
        if (!window.c || !window.c.enemies) return { count: 0, alive: 0, details: [] };
        
        const alive = window.c.enemies.filter(e => e && e.hp > 0);
        const details = window.c.enemies.map((e, i) => ({
          id: i,
          hp: e ? e.hp : 0,
          maxHp: e ? e.maxHp : 0,
          alive: e && e.hp > 0,
          type: e ? e.type : 'unknown'
        }));
        
        return {
          count: window.c.enemies.length,
          alive: alive.length,
          details: details
        };
      };
      
      // Wait for combat system
      results.timeline.push('Waiting for combat system...');
      let attempts = 0;
      while ((!window.c || !window.c.active) && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!window.c || !window.c.active) {
        results.phase = 'ERROR';
        results.timeline.push('Combat system not found after 15 seconds');
        return results;
      }
      
      results.timeline.push('Combat system found and active');
      results.phase = 'PRE_COMBAT';
      
      // Get initial enemy count
      const initialStatus = getEnemyStatus();
      results.enemies.before = initialStatus.count;
      results.timeline.push(`Initial enemies: ${initialStatus.count} (${initialStatus.alive} alive)`);
      
      // Force spawn enemies if none exist
      if (initialStatus.count === 0) {
        results.timeline.push('No enemies found, attempting to spawn...');
        try {
          // Try multiple enemy spawn methods
          if (typeof window.createEnemy === 'function') {
            for (let i = 0; i < 5; i++) {
              window.createEnemy();
              results.timeline.push(`Spawned enemy ${i+1} via window.createEnemy`);
            }
          } else if (typeof createEnemy === 'function') {
            for (let i = 0; i < 5; i++) {
              createEnemy();
              results.timeline.push(`Spawned enemy ${i+1} via createEnemy`);
            }
          } else if (window.c && typeof window.c.spawnEnemy === 'function') {
            for (let i = 0; i < 5; i++) {
              window.c.spawnEnemy();
              results.timeline.push(`Spawned enemy ${i+1} via c.spawnEnemy`);
            }
          }
          
          // Wait for spawn
          await new Promise(resolve => setTimeout(resolve, 2000));
          const afterSpawn = getEnemyStatus();
          results.enemies.before = afterSpawn.count;
          results.timeline.push(`After spawn: ${afterSpawn.count} enemies (${afterSpawn.alive} alive)`);
        } catch (e) {
          results.timeline.push(`Spawn error: ${e.message}`);
        }
      }
      
      // Auto-combat for 15 seconds
      results.phase = 'COMBAT';
      results.timeline.push('Starting auto-combat sequence...');
      
      const combatDuration = 15000;
      const startTime = performance.now();
      let shotsFired = 0;
      let lastEnemyCheck = performance.now();
      
      const fireInterval = setInterval(() => {
        try {
          // Get current enemy status
          const status = getEnemyStatus();
          
          // Find alive enemies
          const aliveEnemies = status.details.filter(e => e.alive);
          
          if (aliveEnemies.length > 0) {
            // Target nearest enemy
            let targetEnemy = null;
            let nearestDist = Infinity;
            
            if (window.c.enemies && window.ship) {
              window.c.enemies.forEach(e => {
                if (e && e.hp > 0 && e.group && window.ship.position) {
                  const dist = e.group.position.distanceTo(window.ship.position);
                  if (dist < nearestDist) {
                    nearestDist = dist;
                    targetEnemy = e;
                  }
                }
              });
            }
            
            if (targetEnemy && nearestDist < 150) {
              // Aim at target
              if (window.ship && targetEnemy.group) {
                window.ship.lookAt(targetEnemy.group.position);
              }
              
              // Fire weapon - try multiple methods
              let fired = false;
              
              if (typeof window.firePrimary === 'function') {
                window.firePrimary();
                fired = true;
              } else if (typeof firePrimary === 'function') {
                firePrimary();
                fired = true;
              } else if (window.c && typeof window.c.firePrimary === 'function') {
                window.c.firePrimary();
                fired = true;
              }
              
              if (fired) {
                shotsFired++;
                results.combat.shots = shotsFired;
              }
            }
          }
          
          // Log enemy status every 2 seconds
          if (performance.now() - lastEnemyCheck > 2000) {
            const currentStatus = getEnemyStatus();
            results.timeline.push(`Combat update: ${currentStatus.alive}/${currentStatus.count} enemies alive, ${shotsFired} shots fired`);
            lastEnemyCheck = performance.now();
          }
          
        } catch (error) {
          results.timeline.push(`Combat error: ${error.message}`);
        }
      }, 100);
      
      // Wait for combat duration
      await new Promise(resolve => setTimeout(resolve, combatDuration));
      clearInterval(fireInterval);
      
      // Get final enemy status
      results.phase = 'POST_COMBAT';
      const finalStatus = getEnemyStatus();
      results.enemies.after = finalStatus.count;
      results.enemies.killed = results.enemies.before - finalStatus.alive;
      
      results.timeline.push(`FINAL RESULTS:`);
      results.timeline.push(`- Started with: ${results.enemies.before} enemies`);
      results.timeline.push(`- Ended with: ${finalStatus.alive} alive, ${finalStatus.count} total`);
      results.timeline.push(`- Enemies killed: ${results.enemies.killed}`);
      results.timeline.push(`- Shots fired: ${shotsFired}`);
      results.timeline.push(`- Kill count (c.kills): ${window.c ? window.c.kills || 0 : 'N/A'}`);
      
      // Detailed enemy status
      results.timeline.push('Enemy details:');
      finalStatus.details.forEach((e, i) => {
        if (e.maxHp > 0) {
          const status = e.alive ? 'ALIVE' : 'DEAD';
          const hpPct = Math.floor((e.hp / e.maxHp) * 100);
          results.timeline.push(`  Enemy ${i}: ${e.type} - ${status} (${e.hp}/${e.maxHp} = ${hpPct}%)`);
        }
      });
      
      results.phase = 'COMPLETE';
      return results;
    });
    
    // Take screenshot during combat
    await page.screenshot({ path: `${screenshotDir}/04_during_combat.png`, fullPage: true });
    console.log('📸 Screenshot 4: During combat');
    
    // Wait a moment more for effects
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take final screenshot
    await page.screenshot({ path: `${screenshotDir}/05_after_combat.png`, fullPage: true });
    console.log('📸 Screenshot 5: After combat');
    
    // Print combat results
    console.log('\n' + '='.repeat(60));
    console.log('🏆 COMBAT RESULTS:');
    console.log(`📊 Phase: ${combatResults.phase}`);
    console.log(`🎯 Enemies killed: ${combatResults.enemies.killed}`);
    console.log(`🔫 Shots fired: ${combatResults.combat.shots}`);
    console.log(`📈 Before/After: ${combatResults.enemies.before} → ${combatResults.enemies.after} alive`);
    console.log('');
    
    console.log('📝 Combat Timeline:');
    combatResults.timeline.forEach((event, i) => {
      console.log(`  ${i+1}. ${event}`);
    });
    
    // Keep browser open for visual inspection
    console.log('\n⏳ Keeping browser open for 8 seconds for visual inspection...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const success = combatResults.enemies.killed > 0;
    
    console.log('\n' + '='.repeat(60));
    console.log(success ? '✅ SUCCESS: ENEMIES WERE KILLED!' : '❌ FAILED: No enemies killed');
    console.log(`📸 Screenshots saved in ${screenshotDir}/`);
    console.log('Evidence files:');
    console.log('  - 01_main_menu.png');
    console.log('  - 02_character_creation.png'); 
    console.log('  - 03_entering_space.png');
    console.log('  - 04_during_combat.png');
    console.log('  - 05_after_combat.png');
    
    return {
      success: success,
      killed: combatResults.enemies.killed,
      shots: combatResults.combat.shots,
      phase: combatResults.phase,
      screenshots: 5
    };
    
  } catch (error) {
    console.error('❌ Screenshot test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  takeScreenshotProof().then(result => {
    console.log('\n' + '═'.repeat(60));
    if (result.success) {
      console.log('🎉 PROOF COMPLETE: Visual evidence captured!');
      console.log(`💀 Enemies eliminated: ${result.killed}`);
      console.log(`📸 Screenshots taken: ${result.screenshots}`);
    } else {
      console.log('💥 PROOF FAILED');
      if (result.error) console.log(`   Error: ${result.error}`);
    }
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { takeScreenshotProof };