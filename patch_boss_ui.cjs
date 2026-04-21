const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🤖 DEPLOYING: Boss UI Controls & Game Loop Integration');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add boss controls to keyboard handler
const bossControlsKeyboard = `        
        // === BOSS SYSTEM CONTROLS ===
        case 'KeyH': // Force spawn boss (debug/testing)
          if (player.stats.credits >= 500) { // Cost to summon
            player.stats.credits -= 500;
            console.log('🎯 Player summoned a boss!');
            spawnRandomBoss();
            if (typeof playSound === 'function') {
              playSound('ui_purchase', player.position, 1.0);
            }
          }
          break;
          
        case 'KeyJ': // Boss info/status
          if (advancedBossSystem.activeBoss) {
            const boss = advancedBossSystem.activeBoss;
            const info = \`\${boss.name} - Phase \${advancedBossSystem.currentPhase}/\${boss.maxPhases} - HP: \${Math.floor(boss.health)}/\${boss.maxHealth}\`;
            console.log(\`👹 Boss Info: \${info}\`);
          } else {
            const timeToNext = Math.floor(state.boss.spawnTimer / 1000);
            console.log(\`⏰ Next boss in: \${timeToNext} seconds\`);
          }
          break;
          
        case 'KeyK': // Target nearest boss (enhanced targeting)
          if (advancedBossSystem.activeBoss) {
            const boss = advancedBossSystem.activeBoss;
            if (boss && boss.position) {
              // Lock onto boss
              targetingSystem.target = boss;
              targetingSystem.lockOn = true;
              targetingSystem.lockOnTime = Date.now();
              console.log(\`🎯 Locked onto \${boss.name}!\`);
              
              if (typeof playSound === 'function') {
                playSound('target_lock', boss.position, 1.2);
              }
            }
          }
          break;`;

// Add boss controls to existing keyboard handler
indexContent = indexContent.replace(
  '        case \'Minus\': // Volume down',
  `${bossControlsKeyboard}
          
        case 'Minus': // Volume down`
);

// Add boss UI elements
const bossUIElements = `
      // === BOSS STATUS UI ===
      if (state.boss.active && advancedBossSystem.activeBoss) {
        const boss = advancedBossSystem.activeBoss;
        
        // Boss health bar (top center)
        const bossHealthPercent = boss.health / boss.maxHealth;
        const bossShieldPercent = boss.shield / boss.maxShield;
        
        ctx.fillStyle = 'rgba(60, 60, 60, 0.9)';
        ctx.fillRect(canvas.width / 2 - 250, 20, 500, 60);
        
        // Boss name and phase
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(\`\${boss.name} - Phase \${advancedBossSystem.currentPhase}/\${boss.maxPhases}\`, canvas.width / 2, 40);
        
        // Health bar
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 240, 45, 480, 12);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(canvas.width / 2 - 240, 45, 480 * bossHealthPercent, 12);
        
        // Shield bar (if boss has shields)
        if (boss.maxShield > 0) {
          ctx.fillStyle = '#00aaff';
          ctx.fillRect(canvas.width / 2 - 240, 60, 480 * bossShieldPercent, 8);
        }
        
        // Boss abilities status
        if (boss.abilities && boss.abilities.length > 0) {
          ctx.font = '12px Arial';
          ctx.fillStyle = '#aaaaaa';
          ctx.textAlign = 'center';
          
          const abilityText = boss.abilities.slice(0, 3).join(', ');
          ctx.fillText(\`Abilities: \${abilityText}\`, canvas.width / 2, 95);
        }
        
        // Phase transition indicator
        if (advancedBossSystem.phaseTransitioning) {
          ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('PHASE TRANSITION', canvas.width / 2, 120);
        }
        
        // Boss warning indicator (if boss just spawned)
        const timeSinceSpawn = Date.now() - state.boss.lastSpawnTime;
        if (timeSinceSpawn < 5000) {
          const alpha = Math.sin(timeSinceSpawn / 200) * 0.5 + 0.5;
          ctx.fillStyle = \`rgba(255, 0, 0, \${alpha})\`;
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('⚠️ BOSS INCOMING ⚠️', canvas.width / 2, 150);
        }
        
        // Distance to boss
        const distance = Math.floor(player.position.distanceTo(boss.position));
        ctx.fillStyle = '#ffaa00';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(\`Distance: \${distance}m\`, 20, canvas.height - 200);
      } else {
        // Boss spawn countdown
        const timeToNext = Math.floor(state.boss.spawnTimer / 1000);
        if (timeToNext > 0) {
          ctx.fillStyle = 'rgba(40, 40, 40, 0.7)';
          ctx.fillRect(20, canvas.height - 220, 200, 30);
          
          ctx.fillStyle = '#888888';
          ctx.font = '14px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(\`Next Boss: \${Math.floor(timeToNext / 60)}:\${String(timeToNext % 60).padStart(2, '0')}\`, 25, canvas.height - 200);
        }
      }
      
      // === BOSS CONTROLS HELP ===
      if (showControls) {
        const bossControlsText = [
          '',
          '=== BOSS CONTROLS ===',
          'H - Summon Boss (500 credits)',
          'J - Boss Status/Info',
          'K - Lock Target on Boss'
        ];
        
        let yOffset = 520;
        bossControlsText.forEach(line => {
          if (line.startsWith('===')) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 14px Arial';
          } else {
            ctx.fillStyle = '#cccccc';
            ctx.font = '12px Arial';
          }
          ctx.textAlign = 'left';
          ctx.fillText(line, canvas.width - 280, yOffset);
          yOffset += 18;
        });
      }`;

// Add boss UI to existing UI rendering
indexContent = indexContent.replace(
  '      // === AUDIO CONTROLS HELP ===',
  `${bossUIElements}
      
      // === AUDIO CONTROLS HELP ===`
);

// Update game loop to include boss system
const gameLoopBossIntegration = `    // Update boss system
    updateBossSystem();
    
    // Check collisions with boss
    if (state.boss.active && advancedBossSystem.activeBoss) {
      checkBossCollisions();
    }
    
    `;

// Add boss system to game loop
indexContent = indexContent.replace(
  '    // Update sound system',
  `${gameLoopBossIntegration}// Update sound system`
);

// Add boss collision detection
const bossCollisionSystem = `
// === BOSS COLLISION SYSTEM ===

function checkBossCollisions() {
  const boss = advancedBossSystem.activeBoss;
  if (!boss || boss.invulnerable) return;
  
  // Check player projectiles hitting boss
  player.projectiles.forEach((projectile, index) => {
    const distance = projectile.position.distanceTo(boss.position);
    
    if (distance < boss.size + 2) {
      // Calculate damage based on weapon type and boss resistances
      let damage = projectile.damage;
      
      // Check for weakness/resistance modifiers
      const weaponType = projectile.type || 'pulse';
      if (boss.weaknesses.includes(weaponType)) {
        damage *= 1.5; // 50% more damage
        console.log(\`💥 \${boss.name} is weak to \${weaponType}! +50% damage\`);
      } else if (boss.resistances.includes(weaponType)) {
        damage *= 0.7; // 30% less damage
        console.log(\`🛡️ \${boss.name} resists \${weaponType}! -30% damage\`);
      }
      
      // Apply damage to shields first
      if (boss.shield > 0) {
        const shieldDamage = Math.min(damage, boss.shield);
        boss.shield -= shieldDamage;
        damage -= shieldDamage;
        
        // Shield hit effect
        createShieldHitEffect(boss.position.clone());
      }
      
      // Apply remaining damage to health
      if (damage > 0) {
        boss.health -= damage;
        createBossDamageEffect(boss.position.clone(), damage);
      }
      
      // Create hit explosion
      createExplosionEffect(projectile.position.clone(), 3, 0xffaa00);
      
      // Remove projectile
      scene.remove(projectile.mesh);
      player.projectiles.splice(index, 1);
      
      // Play hit sound
      if (typeof playSound === 'function') {
        const soundType = boss.shield > 0 ? 'shield_hit' : 'armor_hit';
        playSound(soundType, boss.position, 1.5);
      }
      
      // Update player performance tracking
      updatePlayerPerformanceTracking(damage, weaponType);
    }
  });
  
  // Check boss projectiles/abilities hitting player
  checkBossAttacksHittingPlayer(boss);
}

function createBossDamageEffect(position, damage) {
  // Damage number effect
  const damageGeometry = new THREE.PlaneGeometry(2, 1);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = damage > 30 ? '#ff0000' : '#ffaa00';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(\`-\${Math.floor(damage)}\`, 64, 40);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1
  });
  
  const damageText = new THREE.Mesh(damageGeometry, material);
  damageText.position.copy(position);
  damageText.position.y += 5;
  scene.add(damageText);
  
  // Animate damage text
  const startTime = Date.now();
  const duration = 1500;
  
  function animateDamageText() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress < 1) {
      damageText.position.y += 0.05;
      damageText.material.opacity = 1.0 * (1 - progress);
      requestAnimationFrame(animateDamageText);
    } else {
      scene.remove(damageText);
      damageText.material.dispose();
      texture.dispose();
    }
  }
  
  animateDamageText();
}

function createShieldHitEffect(position) {
  // Shield ripple effect
  const rippleGeometry = new THREE.RingGeometry(2, 4, 16);
  const rippleMaterial = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
  ripple.position.copy(position);
  scene.add(ripple);
  
  // Animate ripple
  const startTime = Date.now();
  const duration = 500;
  
  function animateRipple() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress < 1) {
      const scale = 1 + progress * 3;
      ripple.scale.setScalar(scale);
      ripple.material.opacity = 0.8 * (1 - progress);
      requestAnimationFrame(animateRipple);
    } else {
      scene.remove(ripple);
    }
  }
  
  animateRipple();
}

function checkBossAttacksHittingPlayer(boss) {
  // This will be implemented by the boss ability system
  // Each boss ability handles its own player collision detection
}

function updatePlayerPerformanceTracking(damage, weaponType) {
  const perf = advancedBossSystem.playerPerformance;
  
  // Track hit accuracy (simplified for now)
  perf.accuracy = Math.min(0.95, perf.accuracy * 0.9 + 0.1);
  
  // Track average damage
  perf.averageDamage = perf.averageDamage * 0.9 + damage * 0.1;
  
  // Track weapon preference
  perf.weaponPreference = weaponType;
  
  // Track survival time
  perf.survivalTime = Date.now() - (state.boss.lastSpawnTime || Date.now());
}

function spawnBossMinions(boss, count) {
  console.log(\`🤖 \${boss.name} spawns \${count} minions!\`);
  
  for (let i = 0; i < count; i++) {
    const minion = {
      id: 'minion_' + Date.now() + '_' + i,
      position: new THREE.Vector3(
        boss.position.x + (Math.random() - 0.5) * 40,
        boss.position.y + (Math.random() - 0.5) * 20,
        0
      ),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 50,
      maxHealth: 50,
      size: 2,
      speed: 30,
      attackPower: 15,
      behavior: 'escort_boss',
      aggression: 1.0,
      mesh: null
    };
    
    // Create minion visual
    createMinionVisual(minion);
    
    // Add to boss minions list
    advancedBossSystem.bossMinions.push(minion);
  }
}

function createMinionVisual(minion) {
  // Create minion geometry
  const minionGeometry = new THREE.SphereGeometry(minion.size, 8, 6);
  const minionMaterial = new THREE.MeshBasicMaterial({
    color: 0xaa0000,
    wireframe: true
  });
  
  minion.mesh = new THREE.Mesh(minionGeometry, minionMaterial);
  minion.mesh.position.copy(minion.position);
  scene.add(minion.mesh);
}

function updateBossMinions() {
  advancedBossSystem.bossMinions.forEach((minion, index) => {
    // Update minion AI (simple escort behavior)
    updateMinionAI(minion);
    
    // Update position
    minion.position.add(minion.velocity.clone().multiplyScalar(0.016));
    if (minion.mesh) {
      minion.mesh.position.copy(minion.position);
    }
    
    // Check if minion is dead
    if (minion.health <= 0) {
      // Remove from scene and list
      if (minion.mesh) scene.remove(minion.mesh);
      advancedBossSystem.bossMinions.splice(index, 1);
      
      // Create small explosion
      createExplosionEffect(minion.position.clone(), 2, 0xff4444);
    }
  });
}

function updateMinionAI(minion) {
  const boss = advancedBossSystem.activeBoss;
  if (!boss) return;
  
  // Simple escort AI - stay near boss and attack player
  const toBoss = new THREE.Vector3().subVectors(boss.position, minion.position);
  const toPlayer = new THREE.Vector3().subVectors(player.position, minion.position);
  
  const bossDistance = toBoss.length();
  const playerDistance = toPlayer.length();
  
  if (bossDistance > 30) {
    // Too far from boss - return to escort position
    minion.velocity.copy(toBoss.normalize().multiplyScalar(minion.speed * 0.5));
  } else if (playerDistance < 40) {
    // Player is close - attack
    minion.velocity.copy(toPlayer.normalize().multiplyScalar(minion.speed * minion.aggression));
  } else {
    // Circle around boss
    const perpendicular = new THREE.Vector3(-toBoss.y, toBoss.x, 0).normalize();
    minion.velocity.copy(perpendicular.multiplyScalar(minion.speed * 0.3));
  }
}`;

// Add boss collision system before update functions
indexContent = indexContent.replace(
  'function updateBossMinions() {',
  `${bossCollisionSystem}

function updateBossMinions() {`
);

// Initialize boss system
const initBossSystem = `  // Initialize boss system
  initAdvancedBossSystem();
  
  `;

// Add boss initialization to init function
indexContent = indexContent.replace(
  '  // Initialize sound system',
  `${initBossSystem}// Initialize sound system`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Boss UI Controls & Game Loop Integration deployed!');
console.log('🎮 Controls: H (summon boss), J (boss info), K (lock target)');
console.log('🖥️ UI: Boss health bar, phase indicators, spawn countdown, damage numbers');
console.log('⚔️ Combat: Collision detection, damage calculation, resistance/weakness system, minion support');