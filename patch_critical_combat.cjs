const fs = require('fs');

function cr() { return '\r\n'; }

console.log('🚀 DEPLOYING: Critical Gameplay Fixes - Enemy Combat System');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add enemy combat and spawning system
const enemyCombatSystem = `
// === CRITICAL ENEMY COMBAT SYSTEM ===

// Ensure enemies array exists
if (!window.enemies) {
  window.enemies = [];
}

// Enemy spawn configuration
const enemySpawnConfig = {
  maxEnemies: 8,
  spawnDistance: 100,
  spawnRate: 0.02, // Higher spawn rate
  lastSpawnTime: 0,
  spawnCooldown: 2000 // 2 seconds minimum between spawns
};

// Enemy types with better stats
const enemyTypes = {
  basic: {
    health: 30,
    speed: 15,
    damage: 10,
    size: 3,
    color: 0xff3333,
    points: 10,
    behavior: 'aggressive'
  },
  
  fast: {
    health: 20,
    speed: 25,
    damage: 8,
    size: 2.5,
    color: 0x33ff33,
    points: 15,
    behavior: 'hit_and_run'
  },
  
  tank: {
    health: 60,
    speed: 8,
    damage: 15,
    size: 4,
    color: 0x3333ff,
    points: 25,
    behavior: 'defensive'
  }
};

function forceSpawnEnemies() {
  console.log('🔧 FORCE SPAWNING ENEMIES');
  
  // Clear existing enemies first
  enemies.forEach(enemy => {
    if (enemy.mesh) scene.remove(enemy.mesh);
  });
  enemies.length = 0;
  
  // Spawn initial enemies
  for (let i = 0; i < 5; i++) {
    spawnSingleEnemy();
  }
  
  console.log(\`✅ Spawned \${enemies.length} enemies\`);
}

function spawnSingleEnemy() {
  if (enemies.length >= enemySpawnConfig.maxEnemies) return;
  
  // Random enemy type
  const typeNames = Object.keys(enemyTypes);
  const typeName = typeNames[Math.floor(Math.random() * typeNames.length)];
  const type = enemyTypes[typeName];
  
  // Random spawn position around player
  const angle = Math.random() * Math.PI * 2;
  const distance = enemySpawnConfig.spawnDistance + Math.random() * 50;
  
  const enemy = {
    id: 'enemy_' + Date.now() + '_' + Math.random(),
    type: typeName,
    position: new THREE.Vector3(
      player.position.x + Math.cos(angle) * distance,
      player.position.y + Math.sin(angle) * distance,
      0
    ),
    velocity: new THREE.Vector3(0, 0, 0),
    health: type.health,
    maxHealth: type.health,
    speed: type.speed,
    damage: type.damage,
    size: type.size,
    color: type.color,
    points: type.points,
    behavior: type.behavior,
    
    // AI state
    targetPosition: new THREE.Vector3(),
    lastAttackTime: 0,
    attackCooldown: 1000 + Math.random() * 1000,
    
    // Visual
    mesh: null
  };
  
  // Create enemy visual
  createEnemyMesh(enemy);
  
  enemies.push(enemy);
  
  console.log(\`👹 Spawned \${typeName} enemy at (\${Math.floor(enemy.position.x)}, \${Math.floor(enemy.position.y)})\`);
}

function createEnemyMesh(enemy) {
  // Create enemy geometry
  const geometry = new THREE.SphereGeometry(enemy.size, 8, 6);
  const material = new THREE.MeshPhongMaterial({
    color: enemy.color,
    emissive: enemy.color,
    emissiveIntensity: 0.2
  });
  
  enemy.mesh = new THREE.Mesh(geometry, material);
  enemy.mesh.position.copy(enemy.position);
  scene.add(enemy.mesh);
  
  // Add enemy health bar indicator
  const healthBarGeometry = new THREE.PlaneGeometry(enemy.size * 2, 0.5);
  const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  enemy.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
  enemy.healthBar.position.set(0, enemy.size + 2, 0);
  enemy.mesh.add(enemy.healthBar);
}

function updateEnemySystem() {
  // Spawn new enemies
  const now = Date.now();
  if (now - enemySpawnConfig.lastSpawnTime > enemySpawnConfig.spawnCooldown) {
    if (Math.random() < enemySpawnConfig.spawnRate && enemies.length < enemySpawnConfig.maxEnemies) {
      spawnSingleEnemy();
      enemySpawnConfig.lastSpawnTime = now;
    }
  }
  
  // Update existing enemies
  enemies.forEach((enemy, index) => {
    updateEnemyAI(enemy);
    updateEnemyPosition(enemy);
    updateEnemyAttack(enemy);
    
    // Remove dead enemies
    if (enemy.health <= 0) {
      destroyEnemy(enemy, index);
    }
    
    // Update health bar
    if (enemy.healthBar) {
      const healthPercent = enemy.health / enemy.maxHealth;
      enemy.healthBar.scale.x = healthPercent;
      enemy.healthBar.material.color.setRGB(1 - healthPercent, healthPercent, 0);
    }
  });
}

function updateEnemyAI(enemy) {
  const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
  const distance = toPlayer.length();
  
  switch (enemy.behavior) {
    case 'aggressive':
      // Always move toward player
      if (distance > 5) {
        enemy.velocity.copy(toPlayer.normalize().multiplyScalar(enemy.speed));
      } else {
        enemy.velocity.multiplyScalar(0.5); // Slow down when close
      }
      break;
      
    case 'hit_and_run':
      // Attack then retreat
      if (distance > 30) {
        enemy.velocity.copy(toPlayer.normalize().multiplyScalar(enemy.speed));
      } else if (distance < 15) {
        enemy.velocity.copy(toPlayer.normalize().multiplyScalar(-enemy.speed));
      } else {
        enemy.velocity.multiplyScalar(0.8); // Circle
      }
      break;
      
    case 'defensive':
      // Slow approach
      if (distance > 20) {
        enemy.velocity.copy(toPlayer.normalize().multiplyScalar(enemy.speed * 0.6));
      } else {
        enemy.velocity.multiplyScalar(0.3);
      }
      break;
  }
  
  // Add some randomness
  enemy.velocity.add(new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    0
  ));
}

function updateEnemyPosition(enemy) {
  enemy.position.add(enemy.velocity.clone().multiplyScalar(0.016));
  
  if (enemy.mesh) {
    enemy.mesh.position.copy(enemy.position);
  }
  
  // Keep enemies in bounds
  enemy.position.x = Math.max(-200, Math.min(200, enemy.position.x));
  enemy.position.y = Math.max(-200, Math.min(200, enemy.position.y));
}

function updateEnemyAttack(enemy) {
  const now = Date.now();
  const distance = enemy.position.distanceTo(player.position);
  
  // Enemy can attack if close enough and cooldown is ready
  if (distance < 25 && now - enemy.lastAttackTime > enemy.attackCooldown) {
    fireEnemyProjectile(enemy);
    enemy.lastAttackTime = now;
  }
}

function fireEnemyProjectile(enemy) {
  const direction = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
  
  const projectile = {
    position: enemy.position.clone(),
    velocity: direction.multiplyScalar(40),
    damage: enemy.damage,
    life: 3.0,
    mesh: null,
    isEnemyProjectile: true
  };
  
  // Create projectile visual
  const geometry = new THREE.SphereGeometry(0.5, 6, 4);
  const material = new THREE.MeshBasicMaterial({ color: enemy.color });
  projectile.mesh = new THREE.Mesh(geometry, material);
  projectile.mesh.position.copy(projectile.position);
  scene.add(projectile.mesh);
  
  // Add to enemy projectiles array
  if (!enemyProjectiles) window.enemyProjectiles = [];
  enemyProjectiles.push(projectile);
}

function updateEnemyProjectiles() {
  if (!enemyProjectiles) return;
  
  enemyProjectiles.forEach((projectile, index) => {
    // Update position
    projectile.position.add(projectile.velocity.clone().multiplyScalar(0.016));
    if (projectile.mesh) {
      projectile.mesh.position.copy(projectile.position);
    }
    
    // Check collision with player
    const distance = projectile.position.distanceTo(player.position);
    if (distance < 3) {
      // Hit player
      damagePlayer(projectile.damage);
      
      // Remove projectile
      if (projectile.mesh) scene.remove(projectile.mesh);
      enemyProjectiles.splice(index, 1);
      return;
    }
    
    // Remove if too far or old
    projectile.life -= 0.016;
    if (projectile.life <= 0 || projectile.position.length() > 300) {
      if (projectile.mesh) scene.remove(projectile.mesh);
      enemyProjectiles.splice(index, 1);
    }
  });
}

function destroyEnemy(enemy, index) {
  console.log(\`💀 Enemy destroyed! +\${enemy.points} points\`);
  
  // Award points
  player.stats.score += enemy.points;
  player.stats.kills++;
  
  // Create explosion effect
  if (typeof createExplosionEffect === 'function') {
    createExplosionEffect(enemy.position.clone(), 5, 0xff4444);
  }
  
  // Remove from scene
  if (enemy.mesh) scene.remove(enemy.mesh);
  
  // Remove from array
  enemies.splice(index, 1);
  
  // Spawn loot occasionally
  if (Math.random() < 0.3) {
    spawnLoot(enemy.position.clone());
  }
}

function damagePlayer(damage) {
  player.health -= damage;
  
  console.log(\`💥 Player hit! -\${damage} health (\${player.health}/\${player.maxHealth})\`);
  
  // Flash screen red
  if (typeof screenFlash === 'function') {
    screenFlash(0xff0000);
  }
  
  // Check if player is dead
  if (player.health <= 0) {
    handlePlayerDeath();
  }
}

function handlePlayerDeath() {
  console.log('💀 PLAYER DIED!');
  
  // Reset player
  player.health = player.maxHealth;
  player.position.set(0, 0, 0);
  
  // Clear enemies
  enemies.forEach(enemy => {
    if (enemy.mesh) scene.remove(enemy.mesh);
  });
  enemies.length = 0;
  
  // Penalty
  player.stats.deaths++;
  player.stats.score = Math.max(0, player.stats.score - 50);
}

// Initialize enemy arrays
if (!window.enemies) window.enemies = [];
if (!window.enemyProjectiles) window.enemyProjectiles = [];

// Force spawn enemies immediately
forceSpawnEnemies();

console.log('✅ Critical Enemy Combat System deployed!');`;

// Add enemy combat system to the main script
indexContent = indexContent.replace(
  '</script>',
  `${enemyCombatSystem}

</script>`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Critical Enemy Combat System deployed!');
console.log('👹 Features: Force enemy spawning, aggressive AI, projectile attacks');
console.log('⚔️ Combat: Player damage, death handling, score system');
console.log('🎯 Enemies: 3 types (basic/fast/tank), health bars, explosion effects');