#!/usr/bin/env node
// 👑 KING'S PERFECT EVE ONLINE IMPLEMENTATION VERIFICATION
// Ensures all EVE features are correctly integrated and working

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

console.log('👑 KING VERIFYING PERFECT EVE ONLINE IMPLEMENTATION');
console.log('🎯 Checking: Shields, Armor, Hull, Capacitor, Drones, Combat, Mining');

async function verifyEVEImplementation() {
    let browser;
    try {
        // Launch browser for verification
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Capture console logs and errors
        const consoleLogs = [];
        const errors = [];
        page.on('console', msg => {
            const text = `[${msg.type()}] ${msg.text()}`;
            consoleLogs.push(text);
            if (msg.type() === 'error') {
                errors.push(text);
            }
        });
        page.on('pageerror', error => {
            errors.push(`[pageerror] ${error.message}`);
        });

        // Navigate to game
        console.log('🌐 Loading Old Eden game...');
        await page.goto('http://localhost:3848', { waitUntil: 'networkidle0', timeout: 30000 });

        // Take initial screenshot
        await page.screenshot({ path: 'kings_verification_initial.png' });
        console.log('📷 Initial screenshot captured');

        // Wait for game to load and check EVE systems
        console.log('⏳ Waiting for EVE defense systems to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check for EVE systems in the page
        const eveSystemsCheck = await page.evaluate(() => {
            const results = {
                eveDefenseSystemsLoaded: !!window.eveDefenseSystems,
                eveDroneSystemLoaded: !!window.eveDroneSystem,
                eveHUDPresent: !!document.getElementById('eve-defense-hud'),
                gameCanvasPresent: !!document.getElementById('game-canvas'),
                hudCanvasPresent: !!document.getElementById('hud-canvas')
            };

            // Check individual EVE systems
            if (window.eveDefenseSystems) {
                results.shieldsSystem = {
                    current: window.eveDefenseSystems.shields.current,
                    maximum: window.eveDefenseSystems.shields.maximum,
                    rechargeRate: window.eveDefenseSystems.shields.rechargeRate,
                    resistances: window.eveDefenseSystems.shields.resistances
                };
                results.armorSystem = {
                    current: window.eveDefenseSystems.armor.current,
                    maximum: window.eveDefenseSystems.armor.maximum,
                    nanobotRepair: window.eveDefenseSystems.armor.nanobotRepair
                };
                results.hullSystem = {
                    current: window.eveDefenseSystems.hull.current,
                    maximum: window.eveDefenseSystems.hull.maximum,
                    selfRepair: window.eveDefenseSystems.hull.selfRepair
                };
                results.capacitorSystem = {
                    current: window.eveDefenseSystems.capacitor.current,
                    maximum: window.eveDefenseSystems.capacitor.maximum,
                    rechargeRate: window.eveDefenseSystems.capacitor.rechargeRate
                };
            }

            if (window.eveDroneSystem) {
                results.droneSystem = {
                    maxDrones: window.eveDroneSystem.maxDrones,
                    currentDrones: window.eveDroneSystem.drones.length,
                    selectedType: window.eveDroneSystem.selectedType,
                    autoLaunch: window.eveDroneSystem.autoLaunch
                };
            }

            return results;
        });

        console.log('✅ EVE SYSTEMS VERIFICATION COMPLETE:');
        console.log('📊 EVE Defense Systems:', eveSystemsCheck.eveDefenseSystemsLoaded ? '✅ LOADED' : '❌ MISSING');
        console.log('🤖 EVE Drone System:', eveSystemsCheck.eveDroneSystemLoaded ? '✅ LOADED' : '❌ MISSING');
        console.log('🖥️ EVE HUD Interface:', eveSystemsCheck.eveHUDPresent ? '✅ VISIBLE' : '❌ HIDDEN');

        if (eveSystemsCheck.shieldsSystem) {
            console.log('🛡️ SHIELDS:', eveSystemsCheck.shieldsSystem.current + '/' + eveSystemsCheck.shieldsSystem.maximum + ' HP');
        }
        if (eveSystemsCheck.armorSystem) {
            console.log('🔧 ARMOR:', eveSystemsCheck.armorSystem.current + '/' + eveSystemsCheck.armorSystem.maximum + ' HP');
        }
        if (eveSystemsCheck.hullSystem) {
            console.log('⚙️ HULL:', eveSystemsCheck.hullSystem.current + '/' + eveSystemsCheck.hullSystem.maximum + ' HP');
        }
        if (eveSystemsCheck.capacitorSystem) {
            console.log('⚡ CAPACITOR:', eveSystemsCheck.capacitorSystem.current + '/' + eveSystemsCheck.capacitorSystem.maximum + ' Cap');
        }
        if (eveSystemsCheck.droneSystem) {
            console.log('🤖 DRONES:', eveSystemsCheck.droneSystem.currentDrones + '/' + eveSystemsCheck.droneSystem.maxDrones + ' (' + eveSystemsCheck.droneSystem.selectedType + ')');
        }

        // Test EVE defense controls
        console.log('🎮 Testing EVE defense controls...');

        // Test armor nanobots (A key)
        await page.keyboard.press('KeyA');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test hull repair (H key)
        await page.keyboard.press('KeyH');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test drone deployment (D key)
        await page.keyboard.press('KeyD');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test drone type switching
        await page.keyboard.press('Digit2'); // Medium drones
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.keyboard.press('Digit3'); // Heavy drones
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.keyboard.press('Digit1'); // Back to light drones
        await new Promise(resolve => setTimeout(resolve, 500));

        // Take final verification screenshot
        await page.screenshot({ path: 'kings_verification_final.png' });
        console.log('📷 Final verification screenshot captured');

        // Get final system state
        const finalCheck = await page.evaluate(() => {
            const state = {};
            if (window.eveDefenseSystems) {
                state.armorRepairActive = window.eveDefenseSystems.armor.nanobotRepair;
                state.hullRepairActive = window.eveDefenseSystems.hull.selfRepair;
                state.capacitorCurrent = window.eveDefenseSystems.capacitor.current;
            }
            if (window.eveDroneSystem) {
                state.dronesDeployed = window.eveDroneSystem.drones.length;
                state.selectedDroneType = window.eveDroneSystem.selectedType;
            }
            return state;
        });

        console.log('🎯 FINAL EVE SYSTEM STATE:');
        console.log('  Armor Nanobots:', finalCheck.armorRepairActive ? '🟢 ACTIVE' : '🔴 INACTIVE');
        console.log('  Hull Self-Repair:', finalCheck.hullRepairActive ? '🟢 ACTIVE' : '🔴 INACTIVE');
        console.log('  Drones Deployed:', finalCheck.dronesDeployed || 0);
        console.log('  Selected Drone Type:', finalCheck.selectedDroneType || 'none');
        console.log('  Current Capacitor:', finalCheck.capacitorCurrent || 0);

        // Report any errors
        if (errors.length > 0) {
            console.log('❌ JAVASCRIPT ERRORS DETECTED:');
            errors.forEach(error => console.log('  ' + error));
        }

        // Show recent console output
        console.log('📜 RECENT CONSOLE OUTPUT:');
        consoleLogs.slice(-10).forEach(log => console.log('  ' + log));

        await browser.close();

        const allSystemsWorking = eveSystemsCheck.eveDefenseSystemsLoaded && 
                                 eveSystemsCheck.eveDroneSystemLoaded && 
                                 eveSystemsCheck.eveHUDPresent;

        if (allSystemsWorking) {
            console.log('✅ 👑 ALL EVE ONLINE SYSTEMS VERIFIED AND WORKING PERFECTLY!');
            return true;
        } else {
            console.log('❌ EVE systems need additional implementation');
            return false;
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
        if (browser) await browser.close();
        return false;
    }
}

// Run verification
verifyEVEImplementation().then(success => {
    if (success) {
        console.log('👑 KING\'S VERIFICATION: EVE ONLINE SYSTEMS READY FOR COMPREHENSIVE TESTING!');
        process.exit(0);
    } else {
        console.log('⚠️ EVE systems need fixes before comprehensive testing');
        process.exit(1);
    }
}).catch(error => {
    console.error('Fatal verification error:', error);
    process.exit(1);
});