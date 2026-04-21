const fs = require('fs');

function cr() { return '\r\n'; }

console.log('🎯 DEPLOYING: Critical Player Combat & Targeting');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add critical player combat system
const playerCombatSystem = `
// === CRITICAL PLAYER COMBAT & TARGETING ===

// Ensure player projectiles array exists
if (!player.projectiles) {
  player.projectiles = [];
}

// Enhanced player stats for better gameplay
player.maxHealth = 100;
player.health = player.maxHealth;
player.fireRate = 200; // Fire every 200ms
player.lastFireTime = 0;
player.projectileSpeed = 60;
player.projectileDamage = 25;

// Targeting system configuration
if (!window.targetingSystem) {
  window.targetingSystem = {
    enabled: true,
    target: null,
    lockOn: false,
    lockOnTime: 0,
    lockOnDuration: 3000,
    crosshairSize: 20,
    aimAssist: true,
    aimAssistRange: 30
  };
}

function updatePlayerCombat() {
  // Update player projectiles
  updatePlayerProjectiles();
  
  // Update targeting system
  updateTargetingSystem();
  
  // Handle continuous firing
  handleContinuousFiring();
}

function updatePlayerProjectiles() {
  if (!player.projectiles) player.projectiles = [];
  
  player.projectiles.forEach((projectile, index) => {
    // Update projectile position
    projectile.position.add(projectile.velocity.clone().multiplyScalar(0.016));
    
    if (projectile.mesh) {
      projectile.mesh.position.copy(projectile.position);
    }
    
    // Check collision with enemies
    let hitEnemy = false;
    enemies.forEach((enemy, enemyIndex) => {
      const distance = projectile.position.distanceTo(enemy.position);
      
      if (distance < enemy.size + 1) {
        // Hit enemy
        enemy.health -= projectile.damage;
        
        console.log(\`🎯 Hit \${enemy.type} enemy! -\${projectile.damage} damage\`);
        
        // Create hit effect
        if (typeof createExplosionEffect === 'function') {
          createExplosionEffect(projectile.position.clone(), 2, 0xffaa00);
        }
        
        hitEnemy = true;
        
        // Remove projectile
        if (projectile.mesh) scene.remove(projectile.mesh);
        player.projectiles.splice(index, 1);
        return;
      }
    });
    
    if (hitEnemy) return;
    
    // Remove projectile if too far or old
    projectile.life -= 0.016;
    if (projectile.life <= 0 || projectile.position.length() > 250) {
      if (projectile.mesh) scene.remove(projectile.mesh);
      player.projectiles.splice(index, 1);
    }
  });
}

function updateTargetingSystem() {
  if (!targetingSystem.enabled) return;
  
  // Auto-target nearest enemy if no target or target is dead
  if (!targetingSystem.target || !enemies.find(e => e.id === targetingSystem.target.id)) {
    autoTargetNearestEnemy();
  }
  
  // Update lock-on timer
  if (targetingSystem.lockOn) {
    const elapsed = Date.now() - targetingSystem.lockOnTime;
    if (elapsed > targetingSystem.lockOnDuration) {
      targetingSystem.lockOn = false;
      console.log('🔓 Lock-on expired');
    }
  }
}

function autoTargetNearestEnemy() {
  if (enemies.length === 0) {
    targetingSystem.target = null;
    return;
  }
  
  let nearestEnemy = null;
  let nearestDistance = Infinity;
  
  enemies.forEach(enemy => {
    const distance = player.position.distanceTo(enemy.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestEnemy = enemy;
    }
  });
  
  if (nearestEnemy && nearestDistance < 100) {
    targetingSystem.target = nearestEnemy;
    console.log(\`🎯 Auto-targeted \${nearestEnemy.type} enemy\`);
  }
}

function handleContinuousFiring() {
  // Auto-fire if mouse is held down and we have a target
  if (mouseState.leftButton && targetingSystem.target) {
    const now = Date.now();
    if (now - player.lastFireTime > player.fireRate) {
      firePlayerProjectile();
      player.lastFireTime = now;
    }
  }
}

function firePlayerProjectile() {
  let direction;
  
  // Aim at target if available and lock-on is active
  if (targetingSystem.target && targetingSystem.lockOn) {
    direction = new THREE.Vector3().subVectors(targetingSystem.target.position, player.position).normalize();
    console.log('🎯 Firing locked-on shot');
  } else if (targetingSystem.target && targetingSystem.aimAssist) {
    // Aim assist - slight correction toward target
    const mouseDir = new THREE.Vector3().subVectors(mouseWorldPos, player.position).normalize();
    const targetDir = new THREE.Vector3().subVectors(targetingSystem.target.position, player.position).normalize();
    
    // Blend mouse direction with target direction
    direction = mouseDir.lerp(targetDir, 0.3).normalize();
  } else {
    // Normal firing toward mouse
    direction = new THREE.Vector3().subVectors(mouseWorldPos, player.position).normalize();
  }
  
  const projectile = {
    position: player.position.clone(),
    velocity: direction.multiplyScalar(player.projectileSpeed),
    damage: player.projectileDamage,
    life: 4.0,
    mesh: null
  };
  
  // Create projectile visual
  const geometry = new THREE.SphereGeometry(0.8, 8, 6);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0x00ffff,
    emissive: 0x004444
  });
  projectile.mesh = new THREE.Mesh(geometry, material);
  projectile.mesh.position.copy(projectile.position);
  scene.add(projectile.mesh);
  
  player.projectiles.push(projectile);
  
  // Play fire sound if available
  if (typeof playSound === 'function') {
    playSound('weapon_fire', player.position, 0.5);
  }
}

// Enhanced targeting controls
function handleTargetingInput(key) {
  switch (key) {
    case 'KeyT': // Target nearest enemy
      autoTargetNearestEnemy();
      if (targetingSystem.target) {
        console.log(\`🎯 Targeted \${targetingSystem.target.type} enemy\`);
      }
      break;
      
    case 'KeyG': // Lock-on to target
      if (targetingSystem.target) {
        targetingSystem.lockOn = true;
        targetingSystem.lockOnTime = Date.now();
        console.log(\`🔒 Locked onto \${targetingSystem.target.type} enemy\`);
      }
      break;
      
    case 'KeyY': // Cycle target
      cycleTarget();
      break;
      
    case 'KeyB': // Toggle aim assist
      targetingSystem.aimAssist = !targetingSystem.aimAssist;
      console.log(\`🎯 Aim assist: \${targetingSystem.aimAssist ? 'ON' : 'OFF'}\`);
      break;
  }
}

function cycleTarget() {
  if (enemies.length === 0) return;
  
  const currentIndex = targetingSystem.target ? 
    enemies.findIndex(e => e.id === targetingSystem.target.id) : -1;
  
  const nextIndex = (currentIndex + 1) % enemies.length;
  targetingSystem.target = enemies[nextIndex];
  
  console.log(\`🔄 Cycled to \${targetingSystem.target.type} enemy\`);
}

// Mouse state tracking
if (!window.mouseState) {
  window.mouseState = {
    leftButton: false,
    rightButton: false,
    x: 0,
    y: 0
  };
}

if (!window.mouseWorldPos) {
  window.mouseWorldPos = new THREE.Vector3(0, 0, 0);
}

// Enhanced visual feedback
function renderTargetingUI(ctx, canvas) {
  if (!targetingSystem.target) return;
  
  // Get screen position of target
  const targetScreenPos = worldToScreen(targetingSystem.target.position);
  
  if (!targetScreenPos) return;
  
  // Draw targeting crosshair
  ctx.save();
  ctx.strokeStyle = targetingSystem.lockOn ? '#ff0000' : '#00ff00';
  ctx.lineWidth = 2;
  
  const size = targetingSystem.crosshairSize;
  const x = targetScreenPos.x;
  const y = targetScreenPos.y;
  
  // Crosshair lines
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x - size/2, y);
  ctx.moveTo(x + size/2, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y - size/2);
  ctx.moveTo(x, y + size/2);
  ctx.lineTo(x, y + size);
  ctx.stroke();
  
  // Lock-on indicator
  if (targetingSystem.lockOn) {
    ctx.strokeStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Lock-on timer
    const elapsed = Date.now() - targetingSystem.lockOnTime;
    const progress = elapsed / targetingSystem.lockOnDuration;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.8, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2);
    ctx.stroke();
  }
  
  // Target info
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(\`\${targetingSystem.target.type.toUpperCase()}\`, x, y - size - 10);
  
  // Health bar
  const healthPercent = targetingSystem.target.health / targetingSystem.target.maxHealth;
  const barWidth = 40;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x - barWidth/2, y + size + 10, barWidth, 4);
  ctx.fillStyle = \`rgb(\${255 * (1-healthPercent)}, \${255 * healthPercent}, 0)\`;
  ctx.fillRect(x - barWidth/2, y + size + 10, barWidth * healthPercent, 4);
  
  ctx.restore();
}

function worldToScreen(worldPos) {
  // Simple world to screen conversion
  if (!camera || !renderer) return null;
  
  const vector = worldPos.clone();
  vector.project(camera);
  
  return {
    x: (vector.x + 1) * renderer.domElement.width / 2,
    y: (-vector.y + 1) * renderer.domElement.height / 2
  };
}

console.log('✅ Critical Player Combat & Targeting deployed!');`;

// Add player combat system to the main script
indexContent = indexContent.replace(
  'console.log(\'✅ Critical Enemy Combat System deployed!\');',
  `console.log('✅ Critical Enemy Combat System deployed!');

${playerCombatSystem}`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Critical Player Combat & Targeting deployed!');
console.log('🎯 Features: Enhanced targeting, lock-on system, aim assist');
console.log('💥 Combat: Continuous firing, projectile collision, visual feedback');
console.log('🎮 Controls: T (target), G (lock-on), Y (cycle), B (aim assist)');