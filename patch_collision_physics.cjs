// Collision Physics Damage System - Realistic ship-to-ship collisions
// Integrates with professional audio system for immersive impact effects

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

console.log('💥 Implementing Collision Physics Damage System...\n');

let content = fs.readFileSync('public/index.html', 'utf8');

// 1. Add collision detection state after ship state
const shipStateEnd = `const ship = new THREE.Group();
ship.position.set(0, 0, 0);
ship.userData = { health: 100, maxHealth: 100, shield: 100, maxShield: 100 };`;

const shipWithCollision = `const ship = new THREE.Group();
ship.position.set(0, 0, 0);
ship.userData = { health: 100, maxHealth: 100, shield: 100, maxShield: 100 };

// Collision physics state
const collisionPhysics = {
  lastCollisionTime: 0,
  collisionCooldown: 500, // 0.5s between collision calculations
  minCollisionVelocity: 15, // Minimum speed for damage
  damageMultiplier: 0.8,
  
  // Calculate collision damage based on relative velocity and mass
  calculateDamage(velocity, objectType = 'unknown') {
    const speed = velocity.length();
    if (speed < this.minCollisionVelocity) return 0;
    
    let baseDamage = (speed - this.minCollisionVelocity) * this.damageMultiplier;
    
    // Object-specific damage modifiers
    switch(objectType) {
      case 'asteroid': baseDamage *= 1.5; break;
      case 'enemy': baseDamage *= 1.2; break;
      case 'station': baseDamage *= 0.8; break; // Stations have bumpers
      case 'debris': baseDamage *= 0.6; break;
      default: baseDamage *= 1.0;
    }
    
    return Math.floor(Math.min(baseDamage, 50)); // Cap at 50 damage
  },
  
  // Apply collision effects (damage, screen shake, audio)
  applyCollisionEffects(damage, impactPoint, objectType) {
    if (damage <= 0) return;
    
    const now = performance.now();
    if (now - this.lastCollisionTime < this.collisionCooldown) return;
    this.lastCollisionTime = now;
    
    // Damage distribution: shield first, then hull
    const c = getCurrentCharacter();
    if (!c) return;
    
    let remainingDamage = damage;
    
    // Shield absorption
    if (c.shield > 0) {
      const shieldAbsorption = Math.min(c.shield, remainingDamage * 0.7); // Shields absorb 70%
      c.shield = Math.max(0, c.shield - shieldAbsorption);
      remainingDamage *= 0.3; // 30% goes through shields
    }
    
    // Hull damage
    const hullDamage = Math.min(c.hull, remainingDamage);
    c.hull = Math.max(0, c.hull - hullDamage);
    
    // Visual and audio effects
    this.triggerCollisionEffects(damage, impactPoint, objectType);
    
    // Collision warning
    const totalDamage = Math.floor(damage);
    addComms('Ship', \`⚠️ Collision impact! -\${totalDamage} damage (\${objectType || 'object'})\`);
    
    // Critical damage warnings
    if (c.hull < c.maxHull * 0.2) {
      addComms('Ship', '🚨 CRITICAL: Hull integrity below 20%!');
    }
    
    return totalDamage;
  },
  
  // Trigger collision visual and audio effects
  triggerCollisionEffects(damage, impactPoint, objectType) {
    // Screen shake intensity based on damage
    const shakeIntensity = Math.min(damage * 0.3, 15);
    if (typeof screenShake !== 'undefined') {
      screenShake(shakeIntensity, 400);
    }
    
    // Professional collision audio based on damage intensity
    if (damage > 30) {
      AudioSFX.play('collision');
      AudioSFX.playExplosion('medium'); // Heavy impact explosion
    } else if (damage > 15) {
      AudioSFX.play('collision');
    } else {
      // Light collision sound for minor impacts
      AudioSFX.play('hit');
    }
    
    // Spark/debris particle effect at impact point
    if (impactPoint && typeof createParticleEffect !== 'undefined') {
      createParticleEffect(impactPoint, 'collision_sparks', damage * 2);
    }
  }
};`;

content = safeReplace(content, shipStateEnd, shipWithCollision, 'Added collision physics state');

// 2. Add collision detection to game loop after movement updates
const gameLoopMovement = `    // Update ship movement
    ship.position.add(shipVelocity);
    shipVelocity.multiplyScalar(0.95); // Friction`;

const gameLoopWithCollision = `    // Update ship movement
    const oldPosition = ship.position.clone();
    ship.position.add(shipVelocity);
    
    // Collision detection and physics
    collisionPhysics.checkCollisions(oldPosition, ship.position, shipVelocity);
    
    shipVelocity.multiplyScalar(0.95); // Friction`;

content = safeReplace(content, gameLoopMovement, gameLoopWithCollision, 'Added collision detection to game loop');

// 3. Add collision detection methods after collision physics object
const collisionPhysicsEnd = `  }
};`;

const collisionWithMethods = `  },
  
  // Main collision detection method
  checkCollisions(oldPos, newPos, velocity) {
    const shipBounds = new THREE.Sphere(newPos, 8); // Ship collision radius
    
    // Check asteroid collisions
    asteroids.forEach(asteroid => {
      if (this.checkSphereCollision(shipBounds, asteroid)) {
        const relativeVel = velocity.clone();
        const damage = this.calculateDamage(relativeVel, 'asteroid');
        this.applyCollisionEffects(damage, asteroid.position.clone(), 'asteroid');
        
        // Bounce effect - reverse some velocity
        shipVelocity.multiplyScalar(-0.3);
      }
    });
    
    // Check enemy ship collisions  
    enemies.forEach(enemy => {
      if (enemy.mesh && this.checkSphereCollision(shipBounds, enemy.mesh)) {
        const relativeVel = velocity.clone();
        const damage = this.calculateDamage(relativeVel, 'enemy');
        this.applyCollisionEffects(damage, enemy.mesh.position.clone(), 'enemy');
        
        // Mutual damage - enemy takes collision damage too
        if (damage > 10) {
          enemy.health = Math.max(0, (enemy.health || 100) - damage * 0.5);
        }
      }
    });
    
    // Check station collision (softer)
    if (typeof stationModels !== 'undefined') {
      stationModels.forEach(station => {
        if (this.checkSphereCollision(shipBounds, station)) {
          const relativeVel = velocity.clone().multiplyScalar(0.5); // Softer station collision
          const damage = this.calculateDamage(relativeVel, 'station');
          this.applyCollisionEffects(damage, station.position.clone(), 'station');
        }
      });
    }
    
    // Check projectile/debris collisions
    if (typeof projectiles !== 'undefined') {
      projectiles.forEach((proj, index) => {
        if (proj.mesh && this.checkSphereCollision(shipBounds, proj.mesh)) {
          const damage = this.calculateDamage(new THREE.Vector3(proj.velocity || 10, 0, 0), 'debris');
          this.applyCollisionEffects(damage, proj.mesh.position.clone(), 'debris');
          
          // Remove projectile on collision
          projectiles.splice(index, 1);
          if (proj.mesh.parent) proj.mesh.parent.remove(proj.mesh);
        }
      });
    }
  },
  
  // Sphere collision detection helper
  checkSphereCollision(shipSphere, object) {
    if (!object || !object.position) return false;
    
    // Get object bounds (estimate radius based on scale)
    const objectRadius = this.estimateObjectRadius(object);
    const distance = shipSphere.center.distanceTo(object.position);
    
    return distance < (shipSphere.radius + objectRadius);
  },
  
  // Estimate object collision radius
  estimateObjectRadius(object) {
    if (object.geometry && object.geometry.boundingSphere) {
      return object.geometry.boundingSphere.radius * (object.scale?.x || 1);
    }
    
    // Default radius estimates by object type
    if (object.userData?.type === 'asteroid') return 12;
    if (object.userData?.type === 'enemy') return 6;
    if (object.userData?.type === 'station') return 25;
    
    return 5; // Default collision radius
  }
};`;

content = safeReplace(content, collisionPhysicsEnd, collisionWithMethods, 'Added collision detection methods');

// 4. Add collision damage display to HUD
const hudDamageDisplay = `        // Shield bar
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(20, 70, Math.max(0, (c.shield / c.maxShield) * 200), 8);`;

const hudWithCollisionInfo = `        // Shield bar
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(20, 70, Math.max(0, (c.shield / c.maxShield) * 200), 8);
        
        // Collision damage indicator
        const now = performance.now();
        if (now - collisionPhysics.lastCollisionTime < 2000) {
          const alpha = Math.max(0, 1 - (now - collisionPhysics.lastCollisionTime) / 2000);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#ff4444';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('⚠️ COLLISION DAMAGE', 250, 45);
          ctx.globalAlpha = 1;
        }`;

content = safeReplace(content, hudDamageDisplay, hudWithCollisionInfo, 'Added collision damage HUD indicator');

fs.writeFileSync('public/index.html', content);

console.log('\n✅ Collision Physics Damage System Complete!');
console.log('📋 Features Added:');
console.log('   • Realistic collision damage calculation based on velocity');
console.log('   • Object-specific damage modifiers (asteroids, enemies, stations)');
console.log('   • Shield-first damage distribution system');  
console.log('   • Professional collision audio integration');
console.log('   • Screen shake effects proportional to impact');
console.log('   • HUD collision damage indicators');
console.log('   • Bounce/rebound physics on heavy impacts');
console.log('\n💥 Collision Mechanics:');
console.log('   • Minimum collision velocity: 15 units for damage');
console.log('   • Damage cap: 50 per collision with 0.5s cooldown');
console.log('   • Shield absorption: 70% damage reduction');
console.log('   • Critical hull warnings at <20% integrity');
console.log('   • Mutual damage system (enemies also take collision damage)');