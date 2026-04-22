const puppeteer = require('puppeteer');

// 🎯 REAL GAMEPLAY QA - Actually test combat, missions, mining
console.log('🎯 RUNNING REAL GAMEPLAY QA - KILL ENEMIES, DO MISSIONS, MINE ORE');

async function testRealGameplay() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-web-security', '--allow-running-insecure-content']
  });
  
  const page = await browser.newPage();
  
  try {
    // Load game
    console.log('1. Loading Old Eden...');
    await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Click NEW GAME
    console.log('2. Starting NEW GAME...');
    await page.click('#btn-new');
    await page.waitForTimeout(2000);
    
    // Complete character creation quickly
    console.log('3. Character creation...');
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[placeholder*="name"]') || document.querySelector('#player-name');
      if (nameInput) nameInput.value = 'TestPilot';
    });
    
    await page.waitForTimeout(1000);
    
    // Click Create Pilot
    const createBtn = await page.$('button:contains("Create Pilot"), button[id*="create"], .btn:contains("→")');
    if (createBtn) {
      await createBtn.click();
      console.log('   ✓ Character created');
    }
    
    await page.waitForTimeout(3000);
    
    // Enter space combat
    console.log('4. Launching into space...');
    const launchBtn = await page.$('#btn-launch, button:contains("ENTER SPACE"), button:contains("LAUNCH")');
    if (launchBtn) {
      await launchBtn.click();
      console.log('   ✓ Launched into space');
    } else {
      console.warn('   ⚠ Launch button not found');
    }
    
    await page.waitForTimeout(5000);
    
    // Test combat - look for enemies and try to kill them
    console.log('5. TESTING REAL COMBAT...');
    
    const combatResults = await page.evaluate(() => {
      let enemiesKilled = 0;
      let shotsfired = 0;
      let damageDealt = 0;
      let combatActive = false;
      
      // Check if we have enemies
      if (typeof enemies !== 'undefined' && enemies.length > 0) {
        console.log(`Found ${enemies.length} enemies`);
        combatActive = true;
        
        // Simulate combat for 10 seconds
        const combatInterval = setInterval(() => {
          if (enemies.length === 0) {
            clearInterval(combatInterval);
            return;
          }
          
          // Simulate shooting (find shoot function)
          if (typeof shootProjectile === 'function') {
            shootProjectile();
            shotsfired++;
          } else if (typeof fireWeapon === 'function') {
            fireWeapon();
            shotsired++;
          }
          
          // Check for enemy deaths
          const aliveenemies = enemies.filter(e => !e.isDead && e.health > 0);
          const newKills = enemies.length - aliveEnemies.length - enemiesKilled;
          if (newKills > 0) {
            enemiesKilled += newKills;
            console.log(`Killed ${newKills} enemies! Total: ${enemiesKilled}`);
          }
          
        }, 200); // Fire every 200ms
        
        // Stop after 10 seconds
        setTimeout(() => {
          clearInterval(combatInterval);
        }, 10000);
        
      } else {
        console.log('No enemies found - checking spawn system');
        
        // Try to manually spawn enemies for testing
        if (typeof spawnEnemy === 'function') {
          for (let i = 0; i < 5; i++) {
            spawnEnemy();
          }
          console.log('Spawned 5 test enemies');
        }
      }
      
      return {
        combatActive,
        enemiesFound: (typeof enemies !== 'undefined') ? enemies.length : 0,
        enemiesKilled,
        shotsFirered,
        damageDealt
      };
    });
    
    console.log('   📊 COMBAT RESULTS:');
    console.log(`      Enemies found: ${combatResults.enemiesFound}`);
    console.log(`      Enemies killed: ${combatResults.enemiesKilled}`);
    console.log(`      Shots fired: ${combatResults.shotsFired}`);
    console.log(`      Combat active: ${combatResults.combatActive}`);
    
    // Test mining
    console.log('6. TESTING MINING...');
    
    const miningResults = await page.evaluate(() => {
      let oreeMined = 0;
      let miningActive = false;
      
      // Look for mining function
      if (typeof startMining === 'function') {
        startMining();
        miningActive = true;
        console.log('Started mining operation');
      } else if (typeof mine === 'function') {
        mine();
        miningActive = true;
      }
      
      // Check inventory for ore
      if (typeof player !== 'undefined' && player.inventory) {
        const oreItems = Object.keys(player.inventory).filter(item => 
          item.includes('ore') || item.includes('Ore') || item.includes('mineral')
        );
        oreMined = oreItems.reduce((total, item) => total + (player.inventory[item] || 0), 0);
      }
      
      return { miningActive, oreMined };
    });
    
    console.log('   ⛏️ MINING RESULTS:');
    console.log(`      Mining active: ${miningResults.miningActive}`);
    console.log(`      Ore mined: ${miningResults.oreMined}`);
    
    // Test missions
    console.log('7. TESTING MISSIONS...');
    
    const missionResults = await page.evaluate(() => {
      let missionsCompleted = 0;
      let activeMissions = 0;
      let missionSystem = false;
      
      // Check for mission system
      if (typeof missions !== 'undefined' && missions.length > 0) {
        missionSystem = true;
        activeMissions = missions.filter(m => !m.completed).length;
        missionsCompleted = missions.filter(m => m.completed).length;
      } else if (typeof gameState !== 'undefined' && gameState.missions) {
        missionSystem = true;
        activeMissions = gameState.missions.filter(m => !m.completed).length;
      }
      
      return { missionSystem, activeMissions, missionsCompleted };
    });
    
    console.log('   🎯 MISSION RESULTS:');
    console.log(`      Mission system: ${missionResults.missionSystem}`);
    console.log(`      Active missions: ${missionResults.activeMissions}`);
    console.log(`      Missions completed: ${missionResults.missionsCompleted}`);
    
    // Final evaluation
    console.log('\n🏆 REAL GAMEPLAY QA SUMMARY:');
    
    const totalScore = (combatResults.enemiesKilled > 0 ? 1 : 0) + 
                      (miningResults.oreMined > 0 ? 1 : 0) + 
                      (missionResults.missionsCompleted > 0 ? 1 : 0);
    
    if (totalScore === 0) {
      console.log('❌ GAMEPLAY QA FAILED - NO ACTUAL GAMEPLAY WORKING');
      console.log('   - Zero enemies killed');
      console.log('   - Zero ore mined');  
      console.log('   - Zero missions completed');
      console.log('   - Game is NOT actually playable!');
    } else {
      console.log(`✅ PARTIAL GAMEPLAY - ${totalScore}/3 systems working`);
    }
    
  } catch (error) {
    console.error('❌ Real gameplay test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testRealGameplay().catch(console.error);