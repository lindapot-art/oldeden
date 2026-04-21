const fs = require('fs');

function cr() { return '\r\n'; }

console.log('🔄 DEPLOYING: Critical Game Loop Integration');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add critical game loop integration
const gameLoopIntegration = `
// === CRITICAL GAME LOOP INTEGRATION ===

// Ensure game loop calls all critical systems
function gameLoop() {
  try {
    if (!gameState || gameState.paused) {
      requestAnimationFrame(gameLoop);
      return;
    }
    
    // CRITICAL SYSTEMS UPDATE ORDER
    
    // 1. Update player input and movement
    updatePlayerMovement();
    
    // 2. Update player combat system
    updatePlayerCombat();
    
    // 3. Update enemy system
    updateEnemySystem();
    
    // 4. Update enemy projectiles
    updateEnemyProjectiles();
    
    // 5. Update camera
    updateCamera();
    
    // 6. Render scene
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    
    // 7. Update HUD
    updateHUD();
    
    // 8. Continue loop
    requestAnimationFrame(gameLoop);
    
  } catch (error) {
    console.error('❌ Game loop error:', error);
    requestAnimationFrame(gameLoop);
  }
}

// Enhanced player movement
function updatePlayerMovement() {
  if (!player) return;
  
  const speed = 25;
  const acceleration = 0.5;
  
  // Apply input-based movement
  if (keys.KeyW || keys.ArrowUp) {
    player.velocity.y = Math.min(speed, player.velocity.y + acceleration);
  }
  if (keys.KeyS || keys.ArrowDown) {
    player.velocity.y = Math.max(-speed, player.velocity.y - acceleration);
  }
  if (keys.KeyA || keys.ArrowLeft) {
    player.velocity.x = Math.max(-speed, player.velocity.x - acceleration);
  }
  if (keys.KeyD || keys.ArrowRight) {
    player.velocity.x = Math.min(speed, player.velocity.x + acceleration);
  }
  
  // Apply friction
  player.velocity.multiplyScalar(0.95);
  
  // Update position
  player.position.add(player.velocity.clone().multiplyScalar(0.016));
  
  // Keep player in bounds
  player.position.x = Math.max(-150, Math.min(150, player.position.x));
  player.position.y = Math.max(-150, Math.min(150, player.position.y));
  
  // Update player mesh
  if (player.mesh) {
    player.mesh.position.copy(player.position);
  }
}

// Enhanced camera system
function updateCamera() {
  if (!camera || !player) return;
  
  // Camera follows player with smooth interpolation
  const targetPosition = player.position.clone().add(new THREE.Vector3(0, 0, 100));
  
  if (camera.position) {
    camera.position.lerp(targetPosition, 0.1);
    camera.lookAt(player.position);
  }
}

// Enhanced HUD update
function updateHUD() {
  if (!hudCanvas || !hudCanvas.getContext) return;
  
  const ctx = hudCanvas.getContext('2d');
  ctx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
  
  // Player health
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, 10, 200, 30);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.fillText(\`Health: \${Math.floor(player.health)}/\${player.maxHealth}\`, 20, 30);
  
  // Health bar
  const healthPercent = player.health / player.maxHealth;
  ctx.fillStyle = '#333';
  ctx.fillRect(20, 35, 180, 10);
  ctx.fillStyle = \`rgb(\${255 * (1-healthPercent)}, \${255 * healthPercent}, 0)\`;
  ctx.fillRect(20, 35, 180 * healthPercent, 10);
  
  // Score and stats
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, 50, 200, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.fillText(\`Score: \${player.stats.score}\`, 20, 70);
  ctx.fillText(\`Kills: \${player.stats.kills}\`, 20, 90);
  ctx.fillText(\`Enemies: \${enemies.length}\`, 20, 110);
  
  // Targeting info
  if (targetingSystem.target) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 120, 200, 40);
    
    ctx.fillStyle = targetingSystem.lockOn ? '#ff4444' : '#44ff44';
    ctx.font = '14px Arial';
    ctx.fillText(\`Target: \${targetingSystem.target.type}\`, 20, 140);
    ctx.fillText(\`Health: \${Math.floor(targetingSystem.target.health)}/\${targetingSystem.target.maxHealth}\`, 20, 155);
  }
  
  // Render targeting crosshair
  renderTargetingUI(ctx, hudCanvas);
  
  // Controls help
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(hudCanvas.width - 250, hudCanvas.height - 120, 240, 110);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.fillText('CONTROLS:', hudCanvas.width - 240, hudCanvas.height - 100);
  ctx.fillText('WASD - Move', hudCanvas.width - 240, hudCanvas.height - 85);
  ctx.fillText('Mouse - Aim & Fire', hudCanvas.width - 240, hudCanvas.height - 70);
  ctx.fillText('T - Target Enemy', hudCanvas.width - 240, hudCanvas.height - 55);
  ctx.fillText('G - Lock On', hudCanvas.width - 240, hudCanvas.height - 40);
  ctx.fillText('Y - Cycle Target', hudCanvas.width - 240, hudCanvas.height - 25);
  ctx.fillText('B - Toggle Aim Assist', hudCanvas.width - 240, hudCanvas.height - 10);
}

// Enhanced input handling
function enhanceInputHandling() {
  // Ensure key state tracking
  if (!window.keys) {
    window.keys = {};
  }
  
  // Mouse event handling
  document.addEventListener('mousedown', (event) => {
    mouseState.leftButton = event.button === 0;
    mouseState.rightButton = event.button === 2;
    
    // Fire projectile on click
    if (event.button === 0) {
      firePlayerProjectile();
    }
  });
  
  document.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseState.leftButton = false;
    if (event.button === 2) mouseState.rightButton = false;
  });
  
  document.addEventListener('mousemove', (event) => {
    if (!gameCanvas) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    mouseState.x = event.clientX - rect.left;
    mouseState.y = event.clientY - rect.top;
    
    // Convert to world coordinates (simplified)
    const centerX = gameCanvas.width / 2;
    const centerY = gameCanvas.height / 2;
    const worldX = (mouseState.x - centerX) / 5 + player.position.x;
    const worldY = -(mouseState.y - centerY) / 5 + player.position.y;
    
    mouseWorldPos.set(worldX, worldY, 0);
  });
  
  // Keyboard event handling
  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    
    // Handle targeting input
    handleTargetingInput(event.code);
    
    // Debug commands
    if (event.code === 'KeyE') {
      forceSpawnEnemies();
    }
  });
  
  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });
}

// Initialize critical systems
function initializeCriticalSystems() {
  console.log('🚀 Initializing critical gameplay systems...');
  
  // Ensure player object
  if (!window.player) {
    window.player = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 100,
      maxHealth: 100,
      stats: { score: 0, kills: 0, deaths: 0 },
      projectiles: [],
      mesh: null
    };
  }
  
  // Create player visual if missing
  if (!player.mesh && window.scene) {
    const geometry = new THREE.ConeGeometry(2, 4, 8);
    const material = new THREE.MeshPhongMaterial({ color: 0x00aaff });
    player.mesh = new THREE.Mesh(geometry, material);
    player.mesh.position.copy(player.position);
    scene.add(player.mesh);
  }
  
  // Initialize arrays
  if (!window.enemies) window.enemies = [];
  if (!window.enemyProjectiles) window.enemyProjectiles = [];
  
  // Set up input handling
  enhanceInputHandling();
  
  // Force spawn initial enemies
  forceSpawnEnemies();
  
  console.log('✅ Critical systems initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCriticalSystems);
} else {
  initializeCriticalSystems();
}

console.log('✅ Critical Game Loop Integration deployed!');`;

// Add game loop integration to the main script
indexContent = indexContent.replace(
  'console.log(\'✅ Critical Player Combat & Targeting deployed!\');',
  `console.log('✅ Critical Player Combat & Targeting deployed!');

${gameLoopIntegration}`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Critical Game Loop Integration deployed!');
console.log('🔄 Features: Enhanced game loop, player movement, camera system');
console.log('🎮 Input: Mouse aiming, keyboard movement, targeting controls');
console.log('🖥️ HUD: Health, score, target info, controls display');