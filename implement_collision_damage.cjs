const fs = require('fs');

// ⚡ IMPLEMENT COLLISION DAMAGE SYSTEM - Cycle 3 Improvement
console.log('⚡ IMPLEMENTING WOT-STYLE COLLISION DAMAGE...');

function safeReplace(content, search, replacement) {
  if (!content.includes(search)) {
    console.warn(`⚠️  Search string not found: ${search.substring(0, 80)}...`);
    return content;
  }
  return content.replace(search, replacement);
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  let html = fs.readFileSync('public/index.html', 'utf-8');
  
  // 1. ENHANCE COLLISION PHYSICS TO ACTUALLY APPLY DAMAGE
  const oldCollisionCheck = `    // Basic collision detection
    function checkCollisions() {
      if (!player.mesh) return;
      
      enemies.forEach(enemy => {
        if (!enemy.mesh) return;
        
        const distance = player.mesh.position.distanceTo(enemy.mesh.position);
        if (distance < 3) {
          // Basic collision detected
          console.log('Collision detected');
        }
      });
    }`;

  const newCollisionDamage = `    // WORLD OF TANKS STYLE COLLISION DAMAGE SYSTEM
    function checkCollisions() {
      if (!player.mesh) return;
      
      enemies.forEach((enemy, enemyIndex) => {
        if (!enemy.mesh || enemy.isDead) return;
        
        const distance = player.mesh.position.distanceTo(enemy.mesh.position);
        const collisionThreshold = (player.size || 2) + (enemy.size || 2);
        
        if (distance < collisionThreshold) {
          // Calculate collision damage based on mass and velocity
          const playerVelocity = player.velocity ? player.velocity.length() : gameState.currentSpeed || 5;
          const enemyVelocity = enemy.velocity ? enemy.velocity.length() : enemy.speed || 3;
          
          const relativeVelocity = Math.abs(playerVelocity - enemyVelocity);
          const playerMass = player.mass || 1000;
          const enemyMass = enemy.mass || 800;
          
          // WoT-style damage calculation: kinetic energy transfer
          const playerDamage = Math.floor((enemyMass * relativeVelocity * relativeVelocity) / (2 * playerMass) * 0.1);
          const enemyDamage = Math.floor((playerMass * relativeVelocity * relativeVelocity) / (2 * enemyMass) * 0.1);
          
          // Apply minimum damage threshold
          const finalPlayerDamage = Math.max(playerDamage, 5);
          const finalEnemyDamage = Math.max(enemyDamage, 10);
          
          // APPLY ACTUAL DAMAGE TO BOTH ENTITIES
          if (player.health !== undefined) {
            player.health = Math.max(0, player.health - finalPlayerDamage);
            addComms('COLLISION', \`Impact damage: -\${finalPlayerDamage} HP\`);
            
            // Visual/audio feedback
            playSound('collision', Math.min(relativeVelocity / 10, 1.0));
            flashDamageOverlay(finalPlayerDamage);
          }
          
          if (enemy.health !== undefined) {
            enemy.health = Math.max(0, enemy.health - finalEnemyDamage);
            
            // Enemy death from collision
            if (enemy.health <= 0) {
              enemy.isDead = true;
              addComms('COLLISION', \`Enemy destroyed by ramming! +\${enemy.bounty || 50} credits\`);
              player.credits += (enemy.bounty || 50);
              playSound('explosion', 1.2);
            }
          }
          
          // PHYSICS BOUNCE EFFECT (WoT-style separation)
          const collisionNormal = enemy.mesh.position.clone().sub(player.mesh.position).normalize();
          const bounceForce = Math.min(relativeVelocity * 0.5, 15);
          
          // Push entities apart
          if (player.mesh) {
            player.mesh.position.add(collisionNormal.clone().multiplyScalar(-bounceForce));
          }
          if (enemy.mesh) {
            enemy.mesh.position.add(collisionNormal.clone().multiplyScalar(bounceForce));
          }
          
          // Screen shake for dramatic effect
          if (typeof addScreenShake === 'function') {
            addScreenShake(Math.min(finalPlayerDamage * 0.1, 2.0));
          }
          
          console.log(\`[Collision] Player: -\${finalPlayerDamage}HP | Enemy: -\${finalEnemyDamage}HP | Speed: \${relativeVelocity.toFixed(1)}\`);
        }
      });
      
      // Check projectile collisions with enhanced damage
      checkProjectileCollisions();
    }`;

  html = safeReplace(html, oldCollisionCheck, cr(newCollisionDamage));

  // 2. ADD VISUAL DAMAGE OVERLAY SYSTEM
  const damageOverlaySystem = `
    // DAMAGE OVERLAY SYSTEM for collision feedback
    let damageOverlay = null;
    let overlayFadeTimeout = null;
    
    function flashDamageOverlay(damage) {
      // Create damage overlay if it doesn't exist
      if (!damageOverlay) {
        damageOverlay = document.createElement('div');
        damageOverlay.id = 'collision-damage-overlay';
        damageOverlay.style.cssText = \`
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle, rgba(255,0,0,0.3) 0%, rgba(255,100,100,0.1) 50%, transparent 100%);
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.1s ease;
        \`;
        document.body.appendChild(damageOverlay);
      }
      
      // Flash intensity based on damage
      const intensity = Math.min(damage / 50, 1.0);
      damageOverlay.style.opacity = intensity;
      
      // Fade out
      clearTimeout(overlayFadeTimeout);
      overlayFadeTimeout = setTimeout(() => {
        if (damageOverlay) {
          damageOverlay.style.opacity = '0';
        }
      }, 200);
    }
    
    function addScreenShake(intensity) {
      const gameCanvas = document.getElementById('game-canvas');
      if (!gameCanvas) return;
      
      const shakeAmount = Math.min(intensity * 5, 10);
      gameCanvas.style.transform = \`translate(\${(Math.random() - 0.5) * shakeAmount}px, \${(Math.random() - 0.5) * shakeAmount}px)\`;
      
      setTimeout(() => {
        gameCanvas.style.transform = 'translate(0, 0)';
      }, 100);
    }`;

  // Insert damage overlay system before collision function
  html = safeReplace(html, '    // WORLD OF TANKS STYLE COLLISION DAMAGE SYSTEM', 
                     cr(damageOverlaySystem) + '\r\n\r\n    // WORLD OF TANKS STYLE COLLISION DAMAGE SYSTEM');

  // 3. ENHANCE PROJECTILE COLLISION SYSTEM
  const enhancedProjectileCollisions = `
    // ENHANCED PROJECTILE COLLISION SYSTEM
    function checkProjectileCollisions() {
      projectiles.forEach((projectile, pIndex) => {
        if (!projectile.mesh) return;
        
        // Check projectile vs enemies
        enemies.forEach((enemy, eIndex) => {
          if (!enemy.mesh || enemy.isDead) return;
          
          const distance = projectile.mesh.position.distanceTo(enemy.mesh.position);
          if (distance < (enemy.size || 2)) {
            // Enhanced projectile damage calculation
            const baseDamage = projectile.damage || 15;
            const criticalChance = 0.15; // 15% crit chance
            const isCritical = Math.random() < criticalChance;
            const finalDamage = isCritical ? Math.floor(baseDamage * 1.5) : baseDamage;
            
            enemy.health = Math.max(0, enemy.health - finalDamage);
            
            // Visual feedback for critical hits
            if (isCritical) {
              addComms('CRITICAL', \`CRITICAL HIT! -\${finalDamage} HP\`);
              playSound('hit', 1.3);
            } else {
              playSound('hit', 0.8);
            }
            
            // Remove projectile and handle enemy death
            projectiles.splice(pIndex, 1);
            
            if (enemy.health <= 0) {
              enemy.isDead = true;
              addComms('COMBAT', \`Enemy destroyed! +\${enemy.bounty || 25} credits\`);
              player.credits += (enemy.bounty || 25);
              playSound('explosion', 1.0);
            }
          }
        });
        
        // Check projectile vs player (enemy fire)
        if (projectile.isEnemyProjectile && player.mesh) {
          const distance = projectile.mesh.position.distanceTo(player.mesh.position);
          if (distance < (player.size || 2)) {
            const damage = projectile.damage || 12;
            player.health = Math.max(0, player.health - damage);
            
            addComms('DAMAGE', \`Incoming damage: -\${damage} HP\`);
            playSound('hit', 1.0);
            flashDamageOverlay(damage);
            
            projectiles.splice(pIndex, 1);
          }
        }
      });
    }`;

  // Replace or add enhanced projectile collision function
  const projectileInsertPoint = cr(damageOverlaySystem) + '\r\n\r\n    // WORLD OF TANKS STYLE COLLISION DAMAGE SYSTEM';
  html = safeReplace(html, projectileInsertPoint, 
                     projectileInsertPoint + cr(enhancedProjectileCollisions));

  // 4. INITIALIZE PLAYER HEALTH/MASS PROPERTIES
  const playerInitialization = `
      // Initialize player collision properties
      player.health = player.maxHealth || 100;
      player.mass = 1200; // Player ship mass for collision calculations
      player.size = 2.5;   // Collision radius
      player.velocity = new THREE.Vector3(0, 0, 0); // Track velocity for collision damage`;

  // Insert after player object creation
  const playerInsertPoint = `      player.credits = 1000;`;
  html = safeReplace(html, playerInsertPoint, playerInsertPoint + cr(playerInitialization));

  fs.writeFileSync('public/index.html', html);
  console.log('✅ WOT-STYLE COLLISION DAMAGE SYSTEM IMPLEMENTED!');
  console.log('   ⚡ Kinetic energy damage calculation (mass × velocity²)');
  console.log('   ⚡ Physics bounce effects with separation force');  
  console.log('   ⚡ Visual damage overlay with intensity scaling');
  console.log('   ⚡ Screen shake effects for dramatic collisions');
  console.log('   ⚡ Enhanced projectile system with critical hits');
  console.log('   ⚡ Ramming attacks can destroy enemies for credits');
  console.log('   ⚡ Professional audio feedback for all collision types');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}