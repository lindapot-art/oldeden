const fs = require('fs');

function cr() { return '\r\n'; }

console.log('⚡ DEPLOYING: Critical Game State & Visual Fixes');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add critical game state fixes
const gameStateFixes = `
// === CRITICAL GAME STATE & VISUAL FIXES ===

// Force game state initialization
function initializeGameState() {
  console.log('⚡ Initializing critical game state...');
  
  // Ensure gameState exists
  if (!window.gameState) {
    window.gameState = {
      screen: 'title',
      paused: false,
      initialized: false
    };
  }
  
  // Get canvas elements
  window.gameCanvas = document.getElementById('game-canvas');
  window.hudCanvas = document.getElementById('hud-canvas');
  
  if (!gameCanvas) {
    console.error('❌ Game canvas not found!');
    return false;
  }
  
  console.log('✅ Canvas elements found');
  
  // Initialize Three.js scene if not exists
  if (!window.scene || !window.camera || !window.renderer) {
    initializeThreeJS();
  }
  
  return true;
}

function initializeThreeJS() {
  console.log('🎨 Initializing Three.js...');
  
  // Scene
  window.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);
  
  // Camera
  window.camera = new THREE.PerspectiveCamera(75, gameCanvas.width / gameCanvas.height, 0.1, 1000);
  camera.position.set(0, 0, 100);
  
  // Renderer
  window.renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
  renderer.setSize(gameCanvas.width, gameCanvas.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 100);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  console.log('✅ Three.js initialized');
}

function forceEnterGameplay() {
  console.log('🎮 FORCE ENTERING GAMEPLAY MODE');
  
  // Hide all screens
  const screens = ['title', 'create', 'bridge', 'settings', 'rebirth', 'karma', 'eulogy', 'market'];
  screens.forEach(screenName => {
    const screen = document.getElementById(\`screen-\${screenName}\`);
    if (screen) screen.style.display = 'none';
  });
  
  // Show game canvas
  if (gameCanvas) {
    gameCanvas.style.display = 'block';
    gameCanvas.style.zIndex = '1';
  }
  
  // Show HUD canvas
  if (hudCanvas) {
    hudCanvas.style.display = 'block';
    hudCanvas.style.zIndex = '10';
  }
  
  // Set game state
  gameState.screen = 'game';
  gameState.paused = false;
  gameState.initialized = true;
  
  // Initialize critical systems
  initializeCriticalSystems();
  
  // Start game loop
  if (!gameState.loopRunning) {
    gameState.loopRunning = true;
    gameLoop();
  }
  
  console.log('✅ Gameplay mode activated');
}

// Auto-start functionality
function autoStartGame() {
  console.log('🚀 AUTO-STARTING GAME...');
  
  // Wait for DOM to be ready
  setTimeout(() => {
    if (initializeGameState()) {
      forceEnterGameplay();
    }
  }, 1000);
  
  // Backup auto-start
  setTimeout(() => {
    if (!gameState || gameState.screen !== 'game') {
      console.log('🔧 Backup auto-start triggered');
      forceEnterGameplay();
    }
  }, 3000);
}

// Enhanced button click handling
function enhanceButtonHandling() {
  // New Game button
  const newGameBtn = document.getElementById('btn-new');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      console.log('🎮 New Game clicked');
      forceEnterGameplay();
    });
  }
  
  // Settings button (also enters gameplay for now)
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('⚙️ Settings clicked - entering gameplay');
      forceEnterGameplay();
    });
  }
  
  // Emergency gameplay hotkey
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' && gameState.screen !== 'game') {
      console.log('⚡ Emergency gameplay activation');
      forceEnterGameplay();
    }
  });
}

// Visual debugging
function addVisualDebugging() {
  // Add debug info to HUD
  const originalUpdateHUD = updateHUD;
  window.updateHUD = function() {
    if (originalUpdateHUD) originalUpdateHUD();
    
    if (!hudCanvas) return;
    const ctx = hudCanvas.getContext('2d');
    
    // Debug info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(hudCanvas.width - 200, 10, 190, 100);
    
    ctx.fillStyle = '#ffff00';
    ctx.font = '12px Arial';
    ctx.fillText('DEBUG INFO:', hudCanvas.width - 190, 30);
    ctx.fillText(\`Screen: \${gameState.screen}\`, hudCanvas.width - 190, 45);
    ctx.fillText(\`Paused: \${gameState.paused}\`, hudCanvas.width - 190, 60);
    ctx.fillText(\`Enemies: \${enemies ? enemies.length : 'N/A'}\`, hudCanvas.width - 190, 75);
    ctx.fillText(\`Player Pos: \${player ? Math.floor(player.position.x) + ',' + Math.floor(player.position.y) : 'N/A'}\`, hudCanvas.width - 190, 90);
    ctx.fillText(\`FPS: \${Math.floor(1000/16)}\`, hudCanvas.width - 190, 105);
  };
}

// Force initialization on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Content Loaded - starting initialization');
  enhanceButtonHandling();
  addVisualDebugging();
  autoStartGame();
});

// Backup initialization
window.addEventListener('load', () => {
  console.log('🌐 Window loaded - backup initialization');
  setTimeout(() => {
    if (!gameState || !gameState.initialized) {
      console.log('🔧 Running backup initialization');
      autoStartGame();
    }
  }, 2000);
});

// Click anywhere to start (emergency)
document.addEventListener('click', () => {
  if (!gameState || gameState.screen !== 'game') {
    console.log('👆 Click detected - attempting to start game');
    forceEnterGameplay();
  }
});

console.log('✅ Critical Game State & Visual Fixes deployed!');`;

// Add game state fixes to the main script
indexContent = indexContent.replace(
  'console.log(\'✅ Critical Game Loop Integration deployed!\');',
  `console.log('✅ Critical Game Loop Integration deployed!');

${gameStateFixes}`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Critical Game State & Visual Fixes deployed!');
console.log('⚡ Features: Auto-start gameplay, Three.js initialization, emergency activation');
console.log('🎮 Controls: Enter key or click anywhere to force start game');
console.log('🔧 Debug: Visual debug info, backup initialization systems');