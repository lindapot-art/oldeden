#!/usr/bin/env node
// Check for 3D engine initialization errors

const puppeteer = require('puppeteer');

async function check3DEngineErrors() {
    console.log('👑 KING: Checking for 3D engine initialization errors...');
    
    let browser, page;
    
    try {
        browser = await puppeteer.launch({ 
            headless: true,
            defaultViewport: { width: 1280, height: 900 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Listen for page errors
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
        });
        
        console.log('🚀 Loading game to check 3D initialization...');
        await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait a bit for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for error banners and 3D status
        const engineStatus = await page.evaluate(() => {
            return {
                engineErrorBanner: document.getElementById('engine-error-banner') ? {
                    exists: true,
                    text: document.getElementById('engine-error-banner').textContent
                } : { exists: false },
                webglLostOverlay: document.getElementById('webgl-lost-overlay') ? {
                    exists: true,
                    active: document.getElementById('webgl-lost-overlay').classList.contains('active')
                } : { exists: false },
                gameCanvas: document.getElementById('game-canvas') ? {
                    exists: true,
                    width: document.getElementById('game-canvas').width,
                    height: document.getElementById('game-canvas').height
                } : { exists: false },
                threeReady: typeof window.threeReady !== 'undefined' ? window.threeReady : 'undefined',
                renderer: typeof window.renderer !== 'undefined' ? 'exists' : 'missing',
                scene: typeof window.scene !== 'undefined' ? 'exists' : 'missing',
                camera: typeof window.camera !== 'undefined' ? 'exists' : 'missing',
                THREE: typeof window.THREE !== 'undefined' ? 'loaded' : 'missing',
                WebGLSupport: (() => {
                    try {
                        const canvas = document.createElement('canvas');
                        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                        return gl ? 'supported' : 'not-supported';
                    } catch (e) {
                        return 'error: ' + e.message;
                    }
                })()
            };
        });
        
        console.log('🔍 Engine Status:', JSON.stringify(engineStatus, null, 2));
        console.log('🔍 Console Errors:', consoleErrors);
        console.log('🔍 Page Errors:', pageErrors);
        
        // Take screenshot for visual inspection
        await page.screenshot({ path: '3d_engine_diagnostic.png' });
        console.log('📷 Diagnostic screenshot saved');
        
        // Try to manually test 3D initialization
        const manualTest = await page.evaluate(() => {
            try {
                if (typeof window.THREE === 'undefined') {
                    return { success: false, error: 'THREE.js not loaded' };
                }
                
                const testCanvas = document.createElement('canvas');
                const testRenderer = new THREE.WebGLRenderer({ canvas: testCanvas });
                const testScene = new THREE.Scene();
                const testCamera = new THREE.PerspectiveCamera(75, 1, 1, 1000);
                
                return { 
                    success: true, 
                    rendererType: testRenderer.constructor.name,
                    sceneType: testScene.constructor.name 
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('🧪 Manual 3D Test:', manualTest);
        
        const diagnosis = {
            threeReady: engineStatus.threeReady,
            hasEngineError: engineStatus.engineErrorBanner.exists,
            engineErrorMessage: engineStatus.engineErrorBanner.text,
            webglSupported: engineStatus.WebGLSupport,
            threeJSLoaded: engineStatus.THREE === 'loaded',
            consoleErrors: consoleErrors.length,
            pageErrors: pageErrors.length,
            manualTestSuccess: manualTest.success,
            canEnterGunnerMode: engineStatus.threeReady === true && !engineStatus.engineErrorBanner.exists
        };
        
        return diagnosis;
        
    } catch (error) {
        console.error('❌ 3D diagnostic failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

check3DEngineErrors().then(result => {
    console.log('\n👑 KING: 3D Engine Diagnostic Results:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.canEnterGunnerMode) {
        console.log('✅ 3D engine is working - should be able to fly spaceship');
    } else {
        console.log('❌ 3D engine has issues - cannot fly spaceship');
        if (result.engineErrorMessage) {
            console.log('🚨 Error:', result.engineErrorMessage);
        }
    }
    
    process.exit(result.canEnterGunnerMode ? 0 : 1);
});