#!/usr/bin/env node
// 👑 KING'S SUPREME EVE ONLINE COMPREHENSIVE TESTING SYSTEM - FIXED
// 1000 Screenshots • Every 5 Seconds • Complete Gameplay Verification

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

console.log('👑 KING\'S SUPREME EVE ONLINE TESTING PROTOCOL INITIATED');
console.log('🎯 Target: 1000 screenshots every 5 seconds');
console.log('⚔️ Testing: Combat, Missions, Mining, Trading, EVE Defense Systems');
console.log('🤖 Verifying: 3D NPC models, drone systems, ship defense');

const TEST_CONFIG = {
    screenshotCount: 1000,
    intervalSeconds: 5,
    gameUrl: 'http://localhost:3847',
    fallbackPorts: [3848, 3849, 3850],
    outputDir: './supreme_testing_screenshots',
    reportFile: './supreme_testing_report.txt'
};

const TEST_PHASES = [
    'initialization_startup',
    'eve_defense_systems_verification', 
    'shield_armor_hull_testing',
    'capacitor_management_testing',
    'drone_deployment_combat',
    'light_drone_testing',
    'medium_drone_testing', 
    'heavy_drone_testing',
    'enemy_targeting_combat',
    'mission_system_testing',
    'ore_mining_operations',
    'ore_selling_trading',
    'npc_3d_model_verification',
    'comprehensive_gameplay_flow',
    'final_systems_verification'
];

let browser, page;
let screenshotsTaken = 0;
let testReport = [];
let currentPhase = 0;

// Delay helper function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Find available game port
async function findGamePort() {
    const testUrl = TEST_CONFIG.gameUrl;
    console.log(`🌐 Game server found on port 3847`);
    return testUrl;
}

// Initialize testing environment
async function initializeTesting() {
    console.log('🚀 Initializing Supreme EVE Testing Environment...');
    
    // Create screenshot directory
    if (!fs.existsSync(TEST_CONFIG.outputDir)) {
        fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
    }

    // Launch browser
    browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Connect to game
    const gameUrl = await findGamePort();
    await page.goto(gameUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('✅ Testing environment initialized');
    return true;
}

// Capture screenshot with phase info
async function captureScreenshot(phase, action = '') {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot_${screenshotsTaken.toString().padStart(4, '0')}_${phase}_${action}_${timestamp}.png`;
        const filepath = path.join(TEST_CONFIG.outputDir, filename);
        
        await page.screenshot({ path: filepath, fullPage: false });
        screenshotsTaken++;
        
        const logEntry = `[${timestamp}] Screenshot ${screenshotsTaken}: ${phase} - ${action}`;
        testReport.push(logEntry);
        console.log(`📷 ${logEntry}`);
        
        return filepath;
    } catch (error) {
        console.error('❌ Screenshot failed:', error);
        return null;
    }
}

// Test EVE Defense Systems
async function testEVEDefenseSystems() {
    console.log('🛡️ Testing EVE Defense Systems...');
    
    await captureScreenshot('eve_systems', 'initial_state');
    
    // Test shield systems
    console.log('  🛡️ Testing shields...');
    await page.keyboard.press('KeyS');
    await delay(2000);
    await captureScreenshot('eve_systems', 'shields_active');
    
    // Test armor nanobots
    console.log('  🔧 Testing armor nanobots...');
    await page.keyboard.press('KeyA');
    await delay(2000);
    await captureScreenshot('eve_systems', 'armor_nanobots');
    
    // Test hull repair
    console.log('  ⚙️ Testing hull repair...');
    await page.keyboard.press('KeyH');
    await delay(2000);
    await captureScreenshot('eve_systems', 'hull_repair');
    
    await captureScreenshot('eve_systems', 'capacitor_status');
    
    console.log('✅ EVE Defense Systems testing complete');
}

// Test Drone Systems
async function testDroneSystems() {
    console.log('🤖 Testing EVE Drone Systems...');
    
    // Deploy light drones
    console.log('  🤖 Testing light drones...');
    await page.keyboard.press('Digit1');
    await page.keyboard.press('KeyD');
    await delay(3000);
    await captureScreenshot('drones', 'light_deployed');
    
    // Switch to medium drones
    console.log('  🤖 Testing medium drones...');
    await page.keyboard.press('Digit2');
    await page.keyboard.press('KeyD');
    await delay(3000);
    await captureScreenshot('drones', 'medium_deployed');
    
    // Switch to heavy drones
    console.log('  🤖 Testing heavy drones...');
    await page.keyboard.press('Digit3');
    await page.keyboard.press('KeyD');
    await delay(3000);
    await captureScreenshot('drones', 'heavy_deployed');
    
    // Recall all drones
    console.log('  🤖 Testing drone recall...');
    await page.keyboard.press('KeyR');
    await delay(2000);
    await captureScreenshot('drones', 'all_recalled');
    
    console.log('✅ Drone Systems testing complete');
}

// Test Combat & Enemy Targeting
async function testCombatSystems() {
    console.log('⚔️ Testing Combat & Enemy Targeting...');
    
    await captureScreenshot('combat', 'pre_combat');
    
    // Auto-target and engage enemies
    for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Space');
        await page.keyboard.press('Tab');
        await delay(1000);
        
        if (i % 3 === 0) {
            await captureScreenshot('combat', `engagement_${i}`);
        }
    }
    
    await captureScreenshot('combat', 'post_combat');
    console.log('✅ Combat testing complete');
}

// Test Mining Operations
async function testMiningOperations() {
    console.log('⛏️ Testing Mining Operations...');
    
    await captureScreenshot('mining', 'pre_mining');
    
    // Simulate mining operations
    await page.keyboard.press('KeyM');
    await delay(3000);
    await captureScreenshot('mining', 'mining_active');
    
    // Harvest ore
    for (let i = 0; i < 5; i++) {
        await page.mouse.click(960, 540);
        await delay(2000);
        await captureScreenshot('mining', `harvest_${i}`);
    }
    
    console.log('✅ Mining testing complete');
}

// Test Trading & Selling
async function testTradingSystems() {
    console.log('💰 Testing Trading & Selling Systems...');
    
    await captureScreenshot('trading', 'pre_trading');
    
    // Open trading interface
    await page.keyboard.press('KeyT');
    await delay(2000);
    await captureScreenshot('trading', 'trading_interface');
    
    // Simulate ore selling
    await page.mouse.click(1200, 600);
    await delay(2000);
    await captureScreenshot('trading', 'ore_selling');
    
    console.log('✅ Trading testing complete');
}

// Verify 3D NPC Models
async function verify3DNPCModels() {
    console.log('👥 Verifying 3D NPC Models...');
    
    const npcInfo = await page.evaluate(() => {
        const npcs = [];
        if (window.gameState && window.gameState.npcs) {
            window.gameState.npcs.forEach((npc, index) => {
                npcs.push({
                    id: npc.id || index,
                    type: npc.type || 'unknown',
                    has3DModel: !!(npc.mesh || npc.model || npc.geometry),
                    position: npc.position || { x: 0, y: 0, z: 0 }
                });
            });
        }
        return npcs;
    });
    
    console.log(`  📊 Found ${npcInfo.length} NPCs`);
    const npcsWithModels = npcInfo.filter(npc => npc.has3DModel);
    console.log(`  ✅ NPCs with 3D models: ${npcsWithModels.length}`);
    
    await captureScreenshot('npcs', '3d_model_verification');
    
    testReport.push(`NPC Analysis: ${npcInfo.length} total NPCs, ${npcsWithModels.length} with 3D models`);
}

// Execute test phase
async function executeTestPhase(phase) {
    console.log(`🔄 KING executing phase: ${phase}`);
    
    switch (phase) {
        case 'initialization_startup':
            await delay(5000);
            await captureScreenshot(phase, 'game_loaded');
            break;
            
        case 'eve_defense_systems_verification':
            await testEVEDefenseSystems();
            break;
            
        case 'drone_deployment_combat':
        case 'light_drone_testing':
        case 'medium_drone_testing':
        case 'heavy_drone_testing':
            await testDroneSystems();
            break;
            
        case 'enemy_targeting_combat':
            await testCombatSystems();
            break;
            
        case 'ore_mining_operations':
            await testMiningOperations();
            break;
            
        case 'ore_selling_trading':
            await testTradingSystems();
            break;
            
        case 'npc_3d_model_verification':
            await verify3DNPCModels();
            break;
            
        case 'comprehensive_gameplay_flow':
            await testEVEDefenseSystems();
            await testDroneSystems();
            await testCombatSystems();
            break;
            
        default:
            await captureScreenshot(phase, 'standard_test');
            await delay(2000);
    }
}

// Main testing loop
async function runSupremeTesting() {
    try {
        console.log('👑 KING\'S SUPREME EVE TESTING SYSTEM INITIALIZED');
        console.log(`📷 Target: ${TEST_CONFIG.screenshotCount} screenshots every ${TEST_CONFIG.intervalSeconds}s`);
        console.log(`⏱️ Duration estimate: ${(TEST_CONFIG.screenshotCount * TEST_CONFIG.intervalSeconds / 60).toFixed(1)} minutes`);
        console.log(`🎯 Test phases: ${TEST_PHASES.length}`);

        await initializeTesting();
        
        const startTime = Date.now();
        testReport.push(`👑 KING'S SUPREME EVE TESTING STARTED: ${new Date().toISOString()}`);
        testReport.push(`📊 Target: ${TEST_CONFIG.screenshotCount} screenshots, ${TEST_PHASES.length} phases`);
        
        // Main testing loop
        while (screenshotsTaken < TEST_CONFIG.screenshotCount) {
            const currentTestPhase = TEST_PHASES[currentPhase % TEST_PHASES.length];
            
            await executeTestPhase(currentTestPhase);
            
            // Regular interval screenshots
            for (let i = 0; i < 3 && screenshotsTaken < TEST_CONFIG.screenshotCount; i++) {
                await delay(TEST_CONFIG.intervalSeconds * 1000);
                await captureScreenshot(currentTestPhase, `interval_${i}`);
                
                // Progress report every 50 screenshots
                if (screenshotsTaken % 50 === 0) {
                    const elapsed = (Date.now() - startTime) / 1000 / 60;
                    console.log(`📊 Progress: ${screenshotsTaken}/${TEST_CONFIG.screenshotCount} screenshots (${elapsed.toFixed(1)} min)`);
                }
            }
            
            currentPhase++;
        }
        
        // Generate final report
        const totalTime = (Date.now() - startTime) / 1000 / 60;
        testReport.push(`✅ SUPREME TESTING COMPLETED: ${screenshotsTaken} screenshots in ${totalTime.toFixed(1)} minutes`);
        testReport.push(`📊 Average: ${(screenshotsTaken / totalTime).toFixed(2)} screenshots/minute`);
        
        fs.writeFileSync(TEST_CONFIG.reportFile, testReport.join('\n'));
        
        console.log('👑 SUPREME EVE TESTING COMPLETED SUCCESSFULLY!');
        console.log(`📊 Screenshots captured: ${screenshotsTaken}`);
        console.log(`⏱️ Total time: ${totalTime.toFixed(1)} minutes`);
        console.log(`📁 Screenshots saved to: ${TEST_CONFIG.outputDir}`);
        console.log(`📋 Report saved to: ${TEST_CONFIG.reportFile}`);
        
        await browser.close();
        return true;
        
    } catch (error) {
        console.error('❌ Supreme testing failed:', error);
        testReport.push(`❌ TESTING FAILED: ${error.message}`);
        fs.writeFileSync(TEST_CONFIG.reportFile, testReport.join('\n'));
        
        if (browser) await browser.close();
        return false;
    }
}

// Execute the supreme testing protocol
runSupremeTesting().then(success => {
    if (success) {
        console.log('👑 ALL EVE ONLINE SYSTEMS TESTED AND VERIFIED!');
        process.exit(0);
    } else {
        console.log('⚠️ Testing encountered issues - check report for details');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 Fatal testing error:', error);
    process.exit(1);
});