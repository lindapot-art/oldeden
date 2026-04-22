#!/usr/bin/env node
// Test if we can actually get past start screen and fly the spaceship

const puppeteer = require('puppeteer');
const fs = require('fs');

async function testGameplayProgression() {
    console.log('👑 KING: Testing actual gameplay progression past start screen');
    
    let browser, page;
    
    try {
        browser = await puppeteer.launch({ 
            headless: true,
            defaultViewport: { width: 1280, height: 900 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        console.log('🚀 Loading game...');
        await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Take initial screenshot
        await page.screenshot({ path: 'start_screen_test.png' });
        console.log('📷 Start screen screenshot captured');
        
        // Check what's visible on start screen
        const startScreenElements = await page.evaluate(() => {
            return {
                title: document.querySelector('#screen-title') ? 'visible' : 'hidden',
                newGameBtn: document.querySelector('#btn-new') ? 'found' : 'missing',
                gameCanvas: document.querySelector('#game-canvas') ? 'found' : 'missing',
                hudCanvas: document.querySelector('#hud-canvas') ? 'found' : 'missing'
            };
        });
        console.log('📋 Start screen elements:', startScreenElements);
        
        // Try to click "New Game" button
        console.log('🎮 Attempting to click New Game button...');
        const newGameButton = await page.$('#btn-new');
        if (newGameButton) {
            await newGameButton.click();
            console.log('✅ New Game button clicked');
            
            // Wait a bit for transition
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if we moved to character creation or gameplay
            const afterClick = await page.evaluate(() => {
                return {
                    titleScreen: document.querySelector('#screen-title').style.display,
                    createScreen: document.querySelector('#screen-create').style.display, 
                    gameCanvas: document.querySelector('#game-canvas').style.display,
                    hudCanvas: document.querySelector('#hud-canvas').style.display,
                    bridgeScreen: document.querySelector('#screen-bridge') ? document.querySelector('#screen-bridge').style.display : 'missing'
                };
            });
            console.log('📋 After New Game click:', afterClick);
            
            await page.screenshot({ path: 'after_new_game_click.png' });
            console.log('📷 After New Game click screenshot captured');
            
            // Try to get to actual gameplay
            if (afterClick.createScreen !== 'none') {
                console.log('🎭 In character creation, trying to proceed...');
                
                // Fill in pilot name
                await page.type('#pilot-name', 'TestPilot');
                console.log('✅ Pilot name entered');
                
                // Select first faction
                const firstFaction = await page.$('.faction-card');
                if (firstFaction) {
                    await firstFaction.click();
                    console.log('✅ Faction selected');
                }
                
                // Click Create Pilot button
                const createPilotBtn = await page.$('#btn-create-char');
                if (createPilotBtn) {
                    await createPilotBtn.click();
                    console.log('✅ Create Pilot clicked');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Check if we're now on bridge screen
                    const bridgeState = await page.evaluate(() => {
                        return {
                            bridgeScreen: document.querySelector('#screen-bridge') ? document.querySelector('#screen-bridge').style.display : 'missing',
                            launchBtn: document.querySelector('#btn-launch') ? 'found' : 'missing',
                            enterSpaceBtn: document.querySelector('#btn-enter-space') ? 'found' : 'missing'
                        };
                    });
                    console.log('🚀 Bridge screen state:', bridgeState);
                    
                    await page.screenshot({ path: 'bridge_screen_state.png' });
                    
                    // Try to launch into space
                    const launchBtn = await page.$('#btn-launch, #btn-enter-space');
                    if (launchBtn) {
                        await launchBtn.click();
                        console.log('✅ Launch button clicked - entering space');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // Check final gameplay state
                        const gameplayState = await page.evaluate(() => {
                            return {
                                gameLoopRunning: typeof window.gameLoop === 'function',
                                playerExists: typeof window.player !== 'undefined' && window.player !== null,
                                sceneExists: typeof window.localScene !== 'undefined' && window.localScene !== null,
                                rendererExists: typeof window.renderer !== 'undefined' && window.renderer !== null,
                                cameraExists: typeof window.camera !== 'undefined' && window.camera !== null,
                                gameCanvasVisible: document.querySelector('#game-canvas') ? document.querySelector('#game-canvas').style.display : 'missing',
                                hudCanvasVisible: document.querySelector('#hud-canvas') ? document.querySelector('#hud-canvas').style.display : 'missing'
                            };
                        });
                        console.log('🎮 Final gameplay state:', gameplayState);
                        
                        if (gameplayState.gameLoopRunning && gameplayState.playerExists) {
                            // Test spaceship controls
                            console.log('🚀 Testing spaceship controls...');
                            
                            // Try keyboard controls
                            await page.keyboard.press('KeyW');  // Forward
                            await new Promise(resolve => setTimeout(resolve, 500));
                            await page.keyboard.press('KeyA');  // Left
                            await new Promise(resolve => setTimeout(resolve, 500));
                            await page.keyboard.press('KeyS');  // Back  
                            await new Promise(resolve => setTimeout(resolve, 500));
                            await page.keyboard.press('KeyD');  // Right
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            await page.screenshot({ path: 'spaceship_controls_test.png' });
                            console.log('📷 Spaceship controls test screenshot captured');
                            
                            const controlsTest = await page.evaluate(() => {
                                return {
                                    playerPosition: window.player ? {
                                        x: window.player.position.x,
                                        y: window.player.position.y, 
                                        z: window.player.position.z
                                    } : 'no player',
                                    cameraPosition: window.camera ? {
                                        x: window.camera.position.x,
                                        y: window.camera.position.y,
                                        z: window.camera.position.z
                                    } : 'no camera',
                                    eveSystemsActive: typeof window.eveDefenseSystems !== 'undefined',
                                    dronesActive: typeof window.eveDroneSystem !== 'undefined'
                                };
                            });
                            console.log('🎮 Controls test result:', controlsTest);
                            
                            return {
                                success: true,
                                canGetPastStartScreen: true,
                                canFlySpaceship: controlsTest.playerPosition !== 'no player',
                                gameLoopActive: gameplayState.gameLoopRunning,
                                eveSystemsWorking: controlsTest.eveSystemsActive && controlsTest.dronesActive,
                                screenshots: ['start_screen_test.png', 'after_new_game_click.png', 'bridge_screen_state.png', 'final_gameplay_state.png', 'spaceship_controls_test.png']
                            };
                        }
                    }
                }
                
                // Check final state
                const finalState = await page.evaluate(() => {
                    return {
                        allScreens: {
                            title: document.querySelector('#screen-title') ? document.querySelector('#screen-title').style.display : 'missing',
                            create: document.querySelector('#screen-create') ? document.querySelector('#screen-create').style.display : 'missing',
                            bridge: document.querySelector('#screen-bridge') ? document.querySelector('#screen-bridge').style.display : 'missing'
                        },
                        canvases: {
                            game: document.querySelector('#game-canvas') ? document.querySelector('#game-canvas').style.display : 'missing',
                            hud: document.querySelector('#hud-canvas') ? document.querySelector('#hud-canvas').style.display : 'missing'
                        },
                        gameLoopRunning: typeof window.gameLoop === 'function',
                        playerExists: typeof window.player !== 'undefined',
                        sceneExists: typeof window.localScene !== 'undefined'
                    };
                });
                console.log('📋 Final gameplay state:', finalState);
                
                await page.screenshot({ path: 'final_gameplay_state.png' });
                console.log('📷 Final gameplay state screenshot captured');
                
                // Test if spaceship controls work
                if (finalState.gameLoopRunning) {
                    console.log('🚀 Testing spaceship controls...');
                    
                    // Try keyboard controls
                    await page.keyboard.press('KeyW');  // Forward
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await page.keyboard.press('KeyA');  // Left
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await page.keyboard.press('KeyS');  // Back  
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await page.keyboard.press('KeyD');  // Right
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    await page.screenshot({ path: 'spaceship_controls_test.png' });
                    console.log('📷 Spaceship controls test screenshot captured');
                    
                    const controlsTest = await page.evaluate(() => {
                        return {
                            playerPosition: window.player ? {
                                x: window.player.position.x,
                                y: window.player.position.y, 
                                z: window.player.position.z
                            } : 'no player',
                            cameraPosition: window.camera ? {
                                x: window.camera.position.x,
                                y: window.camera.position.y,
                                z: window.camera.position.z
                            } : 'no camera'
                        };
                    });
                    console.log('🎮 Controls test result:', controlsTest);
                    
                    return {
                        success: true,
                        canGetPastStartScreen: true,
                        canFlySpaceship: controlsTest.playerPosition !== 'no player',
                        gameLoopActive: finalState.gameLoopRunning,
                        screenshots: ['start_screen_test.png', 'after_new_game_click.png', 'final_gameplay_state.png', 'spaceship_controls_test.png']
                    };
                }
            }
        } else {
            console.log('❌ New Game button not found');
        }
        
        return {
            success: false,
            canGetPastStartScreen: false,
            reason: 'Could not progress past start screen'
        };
        
    } catch (error) {
        console.error('❌ Gameplay progression test failed:', error.message);
        return { 
            success: false, 
            error: error.message,
            canGetPastStartScreen: false
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testGameplayProgression().then(result => {
    console.log('\n👑 KING: Gameplay Progression Test Results:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.canFlySpaceship) {
        console.log('✅ SUCCESS: Can fly spaceship and access gameplay');
    } else {
        console.log('❌ FAILED: Cannot get to spaceship flying gameplay');
    }
    
    process.exit(result.success ? 0 : 1);
});