// Collision Physics System - Realistic collision damage and effects
const fs = require('fs');

function safeReplace(content, searchStr, replaceStr, description) {
  if (!content.includes(searchStr)) {
    console.log(`❌ PATCH FAILED: Could not find "${description}"`);
    console.log(`Search preview: ${searchStr.slice(0, 150)}...`);
    return content;
  }
  const newContent = content.replace(searchStr, replaceStr);
  console.log(`✅ PATCHED: ${description}`);
  return newContent;
}

console.log('💥 Implementing Collision Physics System...\n');

let content = fs.readFileSync('public/index.html', 'utf8');

// 1. Add collision physics object after ship creation
const shipCreationLine = `ship = new THREE.Group(); ship.name = 'player-ship';`;

const shipWithCollisionPhysics = `ship = new THREE.Group(); ship.name = 'player-ship';

// Collision Physics System - Realistic damage and effects
const collisionPhysics = {
  lastCollisionTime: 0,
  collisionCooldown: 500,
  minCollisionVelocity: 8,
  
  // Calculate collision damage based on relative velocity  
  calculateDamage(velocity, objectType = 'unknown') {
    const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
    if (speed < this.minCollisionVelocity) return 0;
    
    let baseDamage = (speed - this.minCollisionVelocity) * 1.2;
    
    // Object-specific damage modifiers
    switch(objectType) {
      case 'asteroid': baseDamage *= 1.8; break;
      case 'enemy': baseDamage *= 1.3; break;
      case 'station': baseDamage *= 0.6; break;
      case 'debris': baseDamage *= 0.8; break;
      default: baseDamage *= 1.0;
    }
    
    return Math.floor(Math.min(baseDamage, 45));
  },
  
  // Apply collision effects and damage
  applyCollision(damage, velocity, objectType) {
    if (damage <= 0) return;
    
    const now = performance.now();
    if (now - this.lastCollisionTime < this.collisionCooldown) return;
    this.lastCollisionTime = now;
    
    const c = getCurrentCharacter();
    if (!c) return;
    
    // Shield-first damage system
    let remainingDamage = damage;
    if (c.shield > 0) {
      const shieldAbsorption = Math.min(c.shield, remainingDamage * 0.65);
      c.shield = Math.max(0, c.shield - shieldAbsorption);
      remainingDamage *= 0.35;
    }
    
    // Hull damage
    const hullDamage = Math.min(c.hull, remainingDamage);
    c.hull = Math.max(0, c.hull - hullDamage);
    
    // Collision audio effects
    if (damage > 25) {
      if (AudioSFX.playExplosion) AudioSFX.playExplosion('heavy');
      else AudioSFX.play('explosion_pro');
    } else if (damage > 12) {
      AudioSFX.play('collision');
    } else {
      AudioSFX.play('hit');
    }
    
    // Screen shake based on damage
    const shakeIntensity = Math.min(damage * 0.4, 18);
    if (typeof screenShake !== 'undefined') {
      screenShake(shakeIntensity, 350);
    }
    
    // Collision warning
    const totalDamage = Math.floor(damage);
    addComms('Ship', \`⚠️ Collision! -\${totalDamage} damage (\${objectType})\`);
    
    // Critical damage warning
    if (c.hull < c.maxHull * 0.25) {
      addComms('Ship', '🚨 CRITICAL: Hull integrity compromised!');
    }
    
    return totalDamage;
  },
  
  // Check collision with object (sphere collision)
  checkCollision(pos1, pos2, radius1, radius2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y; 
    const dz = pos1.z - pos2.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    return distance < (radius1 + radius2);
  }
};`;

content = safeReplace(content, shipCreationLine, shipWithCollisionPhysics, 'Added collision physics system');

// 2. Add collision detection after ship movement
const shipMovement = `    // Move ship
    ship.position.x += fl.velocity.x * dt;
    ship.position.y += fl.velocity.y * dt;
    ship.position.z += fl.velocity.z * dt;`;

const shipMovementWithCollision = `    // Move ship
    const oldPosition = { x: ship.position.x, y: ship.position.y, z: ship.position.z };
    ship.position.x += fl.velocity.x * dt;
    ship.position.y += fl.velocity.y * dt;
    ship.position.z += fl.velocity.z * dt;
    
    // Collision Detection System
    const shipRadius = 4; // Ship collision radius
    
    // Check asteroid collisions
    if (typeof asteroids !== 'undefined') {
      asteroids.forEach(asteroid => {
        if (asteroid && asteroid.position && collisionPhysics.checkCollision(ship.position, asteroid.position, shipRadius, 8)) {
          const damage = collisionPhysics.calculateDamage(fl.velocity, 'asteroid');
          if (damage > 0) {
            collisionPhysics.applyCollision(damage, fl.velocity, 'asteroid');
            // Bounce effect
            fl.velocity.x *= -0.4;
            fl.velocity.y *= -0.4;
            fl.velocity.z *= -0.4;
          }
        }
      });
    }
    
    // Check enemy collisions
    if (typeof enemies !== 'undefined') {
      enemies.forEach(enemy => {
        if (enemy && enemy.mesh && enemy.mesh.position && collisionPhysics.checkCollision(ship.position, enemy.mesh.position, shipRadius, 5)) {
          const damage = collisionPhysics.calculateDamage(fl.velocity, 'enemy');
          if (damage > 0) {
            collisionPhysics.applyCollision(damage, fl.velocity, 'enemy');
            // Mutual damage - enemy takes damage too
            if (enemy.health) {
              enemy.health = Math.max(0, enemy.health - damage * 0.6);
            }
          }
        }
      });
    }`;

content = safeReplace(content, shipMovement, shipMovementWithCollision, 'Added collision detection to ship movement');

// 3. Add collision indicator to HUD
const hudShieldBar = `        // Shield bar
        ctx.fillStyle = c.shield > c.maxShield * 0.2 ? '#00ffff' : '#ff4400';
        ctx.fillRect(20, 70, Math.max(0, (c.shield / c.maxShield) * 200), 8);`;

const hudWithCollisionIndicator = `        // Shield bar
        ctx.fillStyle = c.shield > c.maxShield * 0.2 ? '#00ffff' : '#ff4400';
        ctx.fillRect(20, 70, Math.max(0, (c.shield / c.maxShield) * 200), 8);
        
        // Collision damage flash effect
        const now = performance.now();
        if (now - collisionPhysics.lastCollisionTime < 2000) {
          const alpha = Math.max(0, 1 - (now - collisionPhysics.lastCollisionTime) / 2000);
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillStyle = '#ff6644';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('⚠️ COLLISION', 250, 45);
          ctx.globalAlpha = 1;
        }`;

content = safeReplace(content, hudShieldBar, hudWithCollisionIndicator, 'Added collision HUD indicator');

fs.writeFileSync('public/index.html', content);

console.log('\n✅ Collision Physics System Complete!');
console.log('📋 Features Implemented:');
console.log('   • Realistic collision damage based on velocity');
console.log('   • Object-specific damage modifiers (asteroids 1.8x, enemies 1.3x)');
console.log('   • Shield-first damage (65% absorption)');
console.log('   • Professional collision audio integration');
console.log('   • Screen shake effects based on impact force');
console.log('   • Collision warning messages with damage amounts');
console.log('   • HUD collision indicator with 2-second flash');
console.log('   • Mutual enemy damage on collision');
console.log('\n💥 Collision Parameters:');
console.log('   • Minimum velocity for damage: 8 units');
console.log('   • Maximum collision damage: 45 per impact');
console.log('   • Collision cooldown: 500ms between calculations');
console.log('   • Ship collision radius: 4 units');
console.log('   • Bounce effect reduces velocity by 60% on impact');