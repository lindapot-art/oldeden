// Real Gameplay Capture - Navigate through ACTUAL screens, not just title
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const OUTPUT_DIR = 'gameplay_screenshots/real_gameplay';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(page, selector, timeout = 10000) {
    try {
        await page.waitForSelector(selector, { timeout, visible: true });
        return true;
    } catch (e) {
        console.log(`⚠️  Element not found: ${selector}`);
        return false;
    }
}

async function takeScreenshot(page, name, description) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    await page.screenshot({
        path: filepath,
        fullPage: false,
        type: 'png'
    });
    
    console.log(`📸 ${filename} - ${description}`);
    return filename;
}

async function navigateToScreen(page, screenName) {
    console.log(`🔄 Navigating to ${screenName} screen...`);
    
    // Try navigation button first
    const navSelector = `#nav-${screenName}`;
    if (await waitForElement(page, navSelector, 2000)) {
        await page.click(navSelector);
        await delay(1000); // Wait for transition
        return true;
    }
    
    // Try direct showScreen call
    await page.evaluate((screen) => {
        if (typeof showScreen === 'function') {
            showScreen(screen);
        }
    }, screenName);
    
    await delay(1000);
    return true;
}

async function createCharacterIfNeeded(page) {
    console.log('🧑‍🚀 Checking if character creation is needed...');
    
    // Check if we're on title screen and need to create character
    const titleScreen = await page.$('#screen-title');
    if (titleScreen) {
        console.log('📝 Creating new character...');
        
        // Click New Game
        if (await waitForElement(page, '#btn-new', 5000)) {
            await page.click('#btn-new');
            await delay(2000);
        }
        
        // Wait for create screen
        await waitForElement(page, '#screen-create', 5000);
        await takeScreenshot(page, 'character_creation', 'Character creation screen loaded');
        
        // Select first faction (wait for faction grid to load)
        if (await waitForElement(page, '#faction-grid .faction-card', 5000)) {
            await page.click('#faction-grid .faction-card');
            await delay(500);
        }
        
        // Enter name
        const nameInput = await page.$('#pilot-name');
        if (nameInput) {
            await page.click('#pilot-name');
            await page.keyboard.type('TestPilot', { delay: 100 });
        }
        
        await takeScreenshot(page, 'character_configured', 'Character configured with faction and name');
        
        // Click Create Pilot
        if (await waitForElement(page, '#btn-create-char', 5000)) {
            await page.click('#btn-create-char');
            await delay(5000); // Wait longer for character creation to complete
        }
    }
}

async function captureRealGameplay() {
    console.log('🚀 Starting REAL gameplay capture...');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content'
        ]
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate to game
        console.log('🌐 Loading game...');
        await page.goto('http://localhost:3847', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait for game to initialize
        await delay(3000);
        
        // Initial screenshot - should be title screen
        await takeScreenshot(page, '001_game_loaded', 'Game loaded - title screen');
        
        // Create character if needed
        await createCharacterIfNeeded(page);
        
        // Bridge screen - main hub
        await navigateToScreen(page, 'bridge');
        await takeScreenshot(page, '002_bridge_screen', 'Bridge - main command center with ship status');
        
        // Character screen - pilot info
        await navigateToScreen(page, 'character');
        await takeScreenshot(page, '003_character_screen', 'Character - pilot stats and faction info');
        
        // Market screen - trading
        await navigateToScreen(page, 'market');
        await takeScreenshot(page, '004_market_screen', 'Market - galactic trading interface');
        
        // Fitting screen - ship modules
        await navigateToScreen(page, 'fitting');
        await takeScreenshot(page, '005_fitting_screen', 'Fitting - ship module configuration');
        
        // Station screen - docked services
        await navigateToScreen(page, 'station');
        await takeScreenshot(page, '006_station_screen', 'Station - docked at space station');
        
        // Atlas screen - galactic atlas
        await navigateToScreen(page, 'atlas');
        await takeScreenshot(page, '007_atlas_screen', 'Atlas - galactic exploration interface');
        
        // Interior screen - ship interior
        await navigateToScreen(page, 'interior');
        await takeScreenshot(page, '008_interior_screen', 'Interior - inside ship compartments');
        
        // Star map screen - navigation
        await navigateToScreen(page, 'starmap');
        await takeScreenshot(page, '009_starmap_screen', 'Star Map - galactic navigation');
        
        // Settings screen
        await navigateToScreen(page, 'settings');
        await takeScreenshot(page, '010_settings_screen', 'Settings - game configuration');
        
        // Back to bridge for gunner mode entry
        await navigateToScreen(page, 'bridge');
        await delay(1000);
        
        // Try to enter gunner mode for 3D space view
        console.log('🎯 Attempting to enter gunner mode...');
        
        // Look for gunner entry button or use keyboard shortcut
        const gunnerBtn = await page.$('[onclick*="gunner"], #enter-gunner-btn, .gunner-mode-btn');
        if (gunnerBtn) {
            await gunnerBtn.click();
        } else {
            // Try keyboard shortcut (usually G or Enter)
            await page.keyboard.press('g');
        }
        
        await delay(3000);
        await takeScreenshot(page, '011_gunner_mode', '3D Gunner Mode - space combat view');
        
        // Simulate some actions in gunner mode
        console.log('🎮 Simulating gunner actions...');
        
        // Mouse movement to look around
        await page.mouse.move(960, 540);
        await page.mouse.move(1200, 400);
        await delay(500);
        await takeScreenshot(page, '012_gunner_looking', 'Gunner mode - looking around space');
        
        // Try targeting (T key)
        await page.keyboard.press('t');
        await delay(1000);
        await takeScreenshot(page, '013_gunner_targeting', 'Gunner mode - targeting system active');
        
        // Try mining (M key)
        await page.keyboard.press('m');
        await delay(1000);
        await takeScreenshot(page, '014_gunner_mining', 'Gunner mode - mining action');
        
        // Try shooting (Space or left click)
        await page.mouse.click(960, 540);
        await delay(500);
        await takeScreenshot(page, '015_gunner_combat', 'Gunner mode - weapons firing');
        
        // Exit gunner mode
        await page.keyboard.press('Escape');
        await delay(2000);
        
        // Market transactions
        await navigateToScreen(page, 'market');
        await delay(1000);
        
        // Try to buy something
        console.log('💰 Simulating market transactions...');
        const buyButton = await page.$('.market-buy-btn, [onclick*="buy"], button:contains("Buy")');
        if (buyButton) {
            await buyButton.click();
            await delay(1000);
            await takeScreenshot(page, '016_market_buying', 'Market - purchasing items');
        }
        
        // Fitting - try to fit modules
        await navigateToScreen(page, 'fitting');
        await delay(1000);
        
        const fittingSlot = await page.$('.fitting-slot, .module-slot');
        if (fittingSlot) {
            await fittingSlot.click();
            await delay(1000);
            await takeScreenshot(page, '017_fitting_modules', 'Fitting - installing ship modules');
        }
        
        console.log('✅ Real gameplay capture completed!');
        console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}`);
        
    } catch (error) {
        console.error('❌ Gameplay capture failed:', error.message);
        await takeScreenshot(page, 'error_state', `Error occurred: ${error.message}`);
    }
    
    await browser.close();
}

// Run the capture
captureRealGameplay().catch(console.error);