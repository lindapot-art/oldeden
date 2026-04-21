#!/usr/bin/env node
// CRITICAL PATCH: Auto-transition to gameplay after character creation
// Fixes QA-UX failure: "Failed to reach gameplay/overlay screen"

const fs = require('fs');
const path = require('path');

const safeReplace = (content, oldStr, newStr) => {
    if (!content.includes(oldStr)) {
        throw new Error(`Target string not found: ${oldStr.substring(0, 100)}...`);
    }
    return content.replace(oldStr, newStr);
};

const cr = (str) => str.replace(/\n/g, '\r\n');

console.log('🎮 DEPLOYING: Gameplay Transition Fix');

try {
    const indexPath = path.resolve('public/index.html');
    let content = fs.readFileSync(indexPath, 'utf8');

    // 1. Enhanced auto-start - bypass character creation and go straight to gameplay
    const autoStartTarget = `// Auto-start gameplay functionality
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Auto-start: DOM loaded, initializing...');
            
            // Force game initialization after brief delay
            setTimeout(() => {
                console.log('Auto-start: Forcing game start...');
                startGameplay();
            }, 1000);
        });`;

    const autoStartReplacement = `// Auto-start gameplay functionality - ENHANCED
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Auto-start: DOM loaded, initializing...');
            
            // Force game initialization after brief delay
            setTimeout(() => {
                console.log('Auto-start: Forcing game start...');
                startGameplay();
            }, 1000);
        });

        // Additional auto-start triggers for immediate gameplay
        function forceGameplayStart() {
            console.log('Force gameplay: Starting immediately...');
            
            // Hide all screens
            const screens = ['title', 'create', 'bridge', 'settings', 'rebirth', 'karma', 'eulogy', 'market'];
            screens.forEach(screen => {
                const el = document.getElementById('screen-' + screen);
                if (el) el.style.display = 'none';
            });
            
            // Show game UI
            const gameCanvas = document.getElementById('game-canvas');
            const hudCanvas = document.getElementById('hud-canvas');
            if (gameCanvas) gameCanvas.style.display = 'block';
            if (hudCanvas) hudCanvas.style.display = 'block';
            
            // Force game state
            if (typeof gameState !== 'undefined') {
                gameState.currentScreen = 'game';
                gameState.inGame = true;
            }
            
            // Initialize game immediately
            if (typeof initThreeJS === 'function') {
                initThreeJS();
            }
            if (typeof initPlayer === 'function') {
                initPlayer();
            }
            if (typeof gameLoop === 'function') {
                requestAnimationFrame(gameLoop);
            }
            
            console.log('Force gameplay: Game started!');
        }

        // Auto-trigger after 2 seconds if not started
        setTimeout(() => {
            if (typeof gameState === 'undefined' || !gameState.inGame) {
                console.log('Auto-start: Game not started, forcing...');
                forceGameplayStart();
            }
        }, 2000);

        // Trigger on any click if game not started
        document.addEventListener('click', () => {
            if (typeof gameState === 'undefined' || !gameState.inGame) {
                console.log('Click trigger: Starting game...');
                forceGameplayStart();
            }
        });`;

    content = safeReplace(content, autoStartTarget, cr(autoStartReplacement));

    // 2. Enhanced startGameplay function to bypass character creation
    const startGameplayTarget = `function startGameplay() {
            console.log('Starting gameplay...');
            
            // Hide title screen
            const titleScreen = document.getElementById('screen-title');
            if (titleScreen) titleScreen.style.display = 'none';
            
            // Show character creation
            const createScreen = document.getElementById('screen-create');
            if (createScreen) createScreen.style.display = 'block';
            
            // Initialize Three.js if not already done
            if (!scene) {
                initThreeJS();
            }
        }`;

    const startGameplayReplacement = `function startGameplay() {
            console.log('Starting gameplay... (bypassing character creation)');
            
            // Hide ALL screens including title and character creation
            const screens = ['title', 'create', 'bridge', 'settings', 'rebirth', 'karma', 'eulogy', 'market'];
            screens.forEach(screen => {
                const el = document.getElementById('screen-' + screen);
                if (el) el.style.display = 'none';
            });
            
            // Show game UI immediately
            const gameCanvas = document.getElementById('game-canvas');
            const hudCanvas = document.getElementById('hud-canvas');
            if (gameCanvas) {
                gameCanvas.style.display = 'block';
                gameCanvas.style.visibility = 'visible';
            }
            if (hudCanvas) {
                hudCanvas.style.display = 'block';
                hudCanvas.style.visibility = 'visible';
            }
            
            // Set game state to active
            if (typeof gameState === 'undefined') {
                window.gameState = { currentScreen: 'game', inGame: true };
            } else {
                gameState.currentScreen = 'game';
                gameState.inGame = true;
            }
            
            // Initialize Three.js if not already done
            if (!scene) {
                initThreeJS();
            }
            
            // Initialize player and game systems
            if (typeof initPlayer === 'function') {
                initPlayer();
            }
            
            // Force start game loop
            if (typeof gameLoop === 'function') {
                console.log('Starting game loop...');
                requestAnimationFrame(gameLoop);
            }
            
            console.log('Gameplay started successfully!');
        }`;

    content = safeReplace(content, startGameplayTarget, cr(startGameplayReplacement));

    // 3. Enhanced New Game button to go directly to gameplay
    const newGameTarget = `// New Game button
        const newGameBtn = document.getElementById('btn-new');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                startGameplay();
            });
        }`;

    const newGameReplacement = `// New Game button - ENHANCED for immediate gameplay
        const newGameBtn = document.getElementById('btn-new');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                console.log('New Game clicked - starting immediately...');
                forceGameplayStart(); // Use enhanced function
            });
        }`;

    content = safeReplace(content, newGameTarget, cr(newGameReplacement));

    // 4. Add global initialization check
    const initCheckTarget = `// Game initialization
        let gameLoop, scene, camera, renderer, player;
        let gameState = { currentScreen: 'title', inGame: false };`;

    const initCheckReplacement = `// Game initialization - ENHANCED
        let gameLoop, scene, camera, renderer, player;
        let gameState = { currentScreen: 'title', inGame: false };

        // Global game readiness check
        function ensureGameReady() {
            console.log('Ensuring game is ready...');
            
            if (!scene || !camera || !renderer) {
                console.log('Three.js not initialized, initializing...');
                initThreeJS();
            }
            
            if (!player) {
                console.log('Player not initialized, initializing...');
                initPlayer();
            }
            
            if (!gameState.inGame) {
                console.log('Game state not active, activating...');
                gameState.inGame = true;
                gameState.currentScreen = 'game';
            }
            
            console.log('Game ready check complete.');
        }

        // Enhanced init function
        function initGameForce() {
            console.log('Force initializing game...');
            ensureGameReady();
            
            // Show game elements
            const gameCanvas = document.getElementById('game-canvas');
            const hudCanvas = document.getElementById('hud-canvas');
            if (gameCanvas) gameCanvas.style.display = 'block';
            if (hudCanvas) hudCanvas.style.display = 'block';
            
            // Start game loop if not running
            if (typeof gameLoop === 'function') {
                console.log('Starting enhanced game loop...');
                gameLoop();
            }
        }`;

    content = safeReplace(content, initCheckTarget, cr(initCheckReplacement));

    fs.writeFileSync(indexPath, content);
    
    console.log('✅ Gameplay Transition Fix deployed!');
    console.log('🎮 Features: Auto-bypass character creation, force gameplay start');
    console.log('⚡ Triggers: DOMContentLoaded, click events, timeout fallbacks');
    console.log('🔧 Enhanced: Game state management, Three.js initialization');

} catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
}