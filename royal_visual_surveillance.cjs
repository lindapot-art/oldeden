#!/usr/bin/env node
// 👑 ROYAL VISUAL SURVEILLANCE SYSTEM
// Continuous visual monitoring with 1000 screenshots every 4 seconds as commanded

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class RoyalVisualSurveillance {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.screenshotCount = 0;
        this.sessionStartTime = new Date();
        this.reportDir = path.join(__dirname, 'royal_surveillance');
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.reportDir)) {
            fs.mkdirSync(this.reportDir, { recursive: true });
        }
        const screenshotDir = path.join(this.reportDir, 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
    }

    async initialize() {
        console.log('👑 ROYAL VISUAL SURVEILLANCE: Initializing...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Visible for monitoring
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--window-size=1920,1080'
            ],
            defaultViewport: { width: 1920, height: 1080 }
        });

        this.page = await this.browser.newPage();
        
        // Navigate to the game
        await this.page.goto('http://localhost:3847', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        console.log('👑 SURVEILLANCE: Connected to Old Eden on port 3847');
        return true;
    }

    async captureScreenshotBatch() {
        if (!this.page) return;
        
        const batchStartTime = Date.now();
        console.log(`👑 SURVEILLANCE: Starting 1000-screenshot batch at ${new Date().toISOString()}`);
        
        for (let i = 0; i < 1000; i++) {
            try {
                const timestamp = Date.now();
                const filename = `royal_${this.screenshotCount}_${timestamp}.png`;
                const filepath = path.join(this.reportDir, 'screenshots', filename);
                
                await this.page.screenshot({ 
                    path: filepath,
                    fullPage: false
                });
                
                this.screenshotCount++;
                
                // Log progress every 100 screenshots
                if ((i + 1) % 100 === 0) {
                    console.log(`👑 SURVEILLANCE: ${i + 1}/1000 screenshots captured`);
                }
                
                // Minimal delay between screenshots (4ms for 1000 in 4 seconds)
                await new Promise(resolve => setTimeout(resolve, 4));
                
            } catch (error) {
                console.error(`👑 SURVEILLANCE ERROR: Screenshot ${i + 1} failed:`, error.message);
            }
        }
        
        const batchDuration = Date.now() - batchStartTime;
        console.log(`👑 SURVEILLANCE: Batch complete in ${batchDuration}ms (target: 4000ms)`);
        
        // Generate batch report
        await this.generateBatchReport(batchDuration);
    }

    async generateBatchReport(duration) {
        const report = {
            timestamp: new Date().toISOString(),
            duration: duration,
            screenshotCount: 1000,
            totalScreenshots: this.screenshotCount,
            sessionDuration: Date.now() - this.sessionStartTime.getTime(),
            gameUrl: 'http://localhost:3847',
            performance: {
                targetDuration: 4000,
                actualDuration: duration,
                efficiency: (4000 / duration * 100).toFixed(1) + '%'
            }
        };

        // Analyze current game state
        try {
            const gameState = await this.page.evaluate(() => {
                return {
                    currentScreen: document.body.getAttribute('data-screen') || 'unknown',
                    activeScreen: [...document.querySelectorAll('.screen.active')].map(s => s.id),
                    visibleElements: {
                        gameCanvas: !!document.getElementById('game-canvas')?.offsetParent,
                        hudCanvas: !!document.getElementById('hud-canvas')?.offsetParent,
                        titleHeading: !!document.querySelector('h1, .title, [class*="title"]')?.offsetParent,
                        newGameBtn: !!document.getElementById('btn-new')?.offsetParent
                    },
                    errors: window.console?.errors || [],
                    threeJsStatus: typeof window.THREE !== 'undefined' ? 'loaded' : 'missing'
                };
            });
            
            report.gameState = gameState;
            
        } catch (error) {
            report.gameStateError = error.message;
        }

        const reportPath = path.join(this.reportDir, `batch_report_${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`👑 SURVEILLANCE: Batch report saved to ${reportPath}`);
        console.log(`👑 GAME STATE: Screen=${report.gameState?.currentScreen}, ThreeJS=${report.gameState?.threeJsStatus}`);
        
        return report;
    }

    async startContinuousSurveillance() {
        this.isRunning = true;
        console.log('👑 ROYAL SURVEILLANCE: Continuous monitoring ACTIVATED');
        
        while (this.isRunning) {
            try {
                await this.captureScreenshotBatch();
                
                // Wait 4 seconds between batches as commanded
                console.log('👑 SURVEILLANCE: Waiting 4 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 4000));
                
            } catch (error) {
                console.error('👑 SURVEILLANCE CRITICAL ERROR:', error);
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s on error
            }
        }
    }

    async shutdown() {
        console.log('👑 SURVEILLANCE: Shutting down...');
        this.isRunning = false;
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Auto-start surveillance
async function main() {
    const surveillance = new RoyalVisualSurveillance();
    
    try {
        await surveillance.initialize();
        await surveillance.startContinuousSurveillance();
        
    } catch (error) {
        console.error('👑 SURVEILLANCE INITIALIZATION FAILED:', error);
        process.exit(1);
    }
    
    // Graceful shutdown on CTRL+C
    process.on('SIGINT', async () => {
        await surveillance.shutdown();
        process.exit(0);
    });
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { RoyalVisualSurveillance };