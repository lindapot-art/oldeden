// Enhanced Enemy AI System - Old Eden Space MMO
// Advanced AI behaviors, formation flying, and tactical decision making

const fs = require('fs');

function cr(str) {
  return str.replace(/\n/g, '\r\n');
}

console.log('🤖 Implementing enhanced enemy AI system...');

const htmlPath = 'd:\\antiruscist\\oldeden\\public\\index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add AI state to enemy data structure
const enemyCreationSection = `    const enemy = {
      id: 'enemy_' + Date.now(),
      type: type,
      hp: hp,
      maxHp: hp,
      group: group,
      lastFire: 0,
      _velocity: new THREE.Vector3(0, 0, 0)
    };`;

const enhancedEnemyCreation = `    const enemy = {
      id: 'enemy_' + Date.now(),
      type: type,
      hp: hp,
      maxHp: hp,
      group: group,
      lastFire: 0,
      _velocity: new THREE.Vector3(0, 0, 0),
      // Enhanced AI state
      ai: {
        state: 'patrol', // patrol, chase, attack, evade, retreat, formation
        target: null,
        lastDecision: 0,
        decisionCooldown: 1000,
        patrolCenter: group.position.clone(),
        patrolRadius: 30 + Math.random() * 20,
        patrolAngle: Math.random() * Math.PI * 2,
        formationPosition: null,
        formationLeader: null,
        aggressiveness: 0.3 + Math.random() * 0.7,
        accuracy: 0.4 + Math.random() * 0.4,
        evasionSkill: 0.2 + Math.random() * 0.6,
        maxSpeed: 15 + Math.random() * 10,
        fireRate: 1000 + Math.random() * 2000,
        retreatThreshold: hp * 0.2,
        stunTimer: 0,
        lastDamageTime: 0,
        flockingRange: 25,
        separationForce: 0.5,
        alignmentForce: 0.3,
        cohesionForce: 0.2
      }
    };`;

// Only add if not already present
if (!content.includes('ai: {')) {
  content = content.replace(enemyCreationSection, enhancedEnemyCreation);
  console.log('✅ Enhanced enemy data structure with AI state');
}

// 2. Add advanced AI behavior functions
const powerUpFunctionsEnd = `function updateTargetingSystem(dtMs) {`;

const aiBehaviorFunctions = cr(`// ── Enhanced Enemy AI System ──
function updateEnemyAI(enemy, dtMs) {
  if (!enemy || !enemy.ai || enemy.hp <= 0) return;
  
  const ai = enemy.ai;
  const now = performance.now();
  
  // Update timers
  ai.stunTimer = Math.max(0, ai.stunTimer - dtMs);
  if (ai.stunTimer > 0) return; // Skip AI if stunned
  
  // Decision making cooldown
  if (now - ai.lastDecision < ai.decisionCooldown) return;
  ai.lastDecision = now;
  
  // Determine current state based on situation
  const playerDistance = ship.position.distanceTo(enemy.group.position);
  const hpPercent = enemy.hp / enemy.maxHp;
  
  // State transitions
  if (hpPercent < ai.retreatThreshold) {
    ai.state = 'retreat';
  } else if (playerDistance < 40 && canSeePlayer(enemy)) {
    if (playerDistance < 25) {
      ai.state = 'attack';
    } else {
      ai.state = 'chase';
    }
  } else if (playerDistance > 80) {
    ai.state = 'patrol';
  }
  
  // Execute AI behavior
  switch(ai.state) {
    case 'patrol':
      executePatrolBehavior(enemy, dtMs);
      break;
    case 'chase':
      executeChaseBehavior(enemy, dtMs);
      break;
    case 'attack':
      executeAttackBehavior(enemy, dtMs);
      break;
    case 'evade':
      executeEvasiveBehavior(enemy, dtMs);
      break;
    case 'retreat':
      executeRetreatBehavior(enemy, dtMs);
      break;
    case 'formation':
      executeFormationBehavior(enemy, dtMs);
      break;
  }
  
  // Apply flocking behavior if near other enemies
  applyFlockingBehavior(enemy, dtMs);
  
  // Update enemy position based on velocity
  enemy.group.position.add(enemy._velocity.clone().multiplyScalar(dtMs * 0.001));
  
  // Apply velocity damping
  enemy._velocity.multiplyScalar(0.98);
  
  // Keep enemies in bounds
  constrainToBounds(enemy);
}

function canSeePlayer(enemy) {
  // Simple line-of-sight check (can be enhanced with raycasting)
  const distance = ship.position.distanceTo(enemy.group.position);
  return distance < 100 && !c.stealthActive;
}

function executePatrolBehavior(enemy, dtMs) {
  const ai = enemy.ai;
  
  // Circular patrol pattern
  ai.patrolAngle += dtMs * 0.001;
  const targetX = ai.patrolCenter.x + Math.cos(ai.patrolAngle) * ai.patrolRadius;
  const targetZ = ai.patrolCenter.z + Math.sin(ai.patrolAngle) * ai.patrolRadius;
  
  const target = new THREE.Vector3(targetX, ai.patrolCenter.y, targetZ);
  moveTowardsTarget(enemy, target, ai.maxSpeed * 0.4);
  
  // Look around occasionally
  if (Math.random() < 0.01) {
    enemy.group.lookAt(ship.position);
  }
}

function executeChaseBehavior(enemy, dtMs) {
  const ai = enemy.ai;
  
  // Predict player movement
  const predictedPosition = predictPlayerPosition(0.5);
  moveTowardsTarget(enemy, predictedPosition, ai.maxSpeed * 0.8);
  
  // Face the player
  enemy.group.lookAt(ship.position);
  
  // Switch to attack if close enough
  const distance = ship.position.distanceTo(enemy.group.position);
  if (distance < 25) {
    ai.state = 'attack';
  }
  
  // Random evasive moves while chasing
  if (Math.random() < 0.02) {
    const evasion = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 20
    );
    enemy._velocity.add(evasion);
  }
}

function executeAttackBehavior(enemy, dtMs) {
  const ai = enemy.ai;
  const now = performance.now();
  
  // Face the player
  enemy.group.lookAt(ship.position);
  
  // Circle strafe attack pattern
  const distance = ship.position.distanceTo(enemy.group.position);
  const optimalDistance = 20;
  
  if (distance > optimalDistance) {
    // Move closer
    moveTowardsTarget(enemy, ship.position, ai.maxSpeed * 0.6);
  } else {
    // Circle around player
    const angle = Math.atan2(
      enemy.group.position.z - ship.position.z,
      enemy.group.position.x - ship.position.x
    ) + dtMs * 0.002 * ai.aggressiveness;
    
    const targetX = ship.position.x + Math.cos(angle) * optimalDistance;
    const targetZ = ship.position.z + Math.sin(angle) * optimalDistance;
    const target = new THREE.Vector3(targetX, ship.position.y, targetZ);
    
    moveTowardsTarget(enemy, target, ai.maxSpeed);
  }
  
  // Fire weapons
  if (now - enemy.lastFire > ai.fireRate && distance < 35) {
    fireEnemyWeapon(enemy);
    enemy.lastFire = now;
  }
  
  // Evasive maneuvers when taking damage
  if (now - ai.lastDamageTime < 2000) {
    executeEvasiveBehavior(enemy, dtMs);
  }
}

function executeEvasiveBehavior(enemy, dtMs) {
  const ai = enemy.ai;
  
  // Erratic movement pattern
  const evasion = new THREE.Vector3(
    Math.sin(performance.now() * 0.01) * ai.evasionSkill * 30,
    Math.sin(performance.now() * 0.007) * ai.evasionSkill * 15,
    Math.cos(performance.now() * 0.013) * ai.evasionSkill * 30
  );
  
  enemy._velocity.add(evasion.multiplyScalar(dtMs * 0.001));
  
  // Still try to face player for occasional shots
  if (Math.random() < 0.3) {
    enemy.group.lookAt(ship.position);
  }
}

function executeRetreatBehavior(enemy, dtMs) {
  const ai = enemy.ai;
  
  // Move away from player
  const retreatDirection = new THREE.Vector3()
    .subVectors(enemy.group.position, ship.position)
    .normalize();
  
  const retreatTarget = enemy.group.position.clone()
    .add(retreatDirection.multiplyScalar(50));
  
  moveTowardsTarget(enemy, retreatTarget, ai.maxSpeed * 1.2);
  
  // Face player but retreat
  enemy.group.lookAt(ship.position);
  
  // Desperate shots while retreating
  if (Math.random() < 0.005 && performance.now() - enemy.lastFire > ai.fireRate * 1.5) {
    fireEnemyWeapon(enemy);
    enemy.lastFire = performance.now();
  }
}

function executeFormationBehavior(enemy, dtMs) {
  const ai = enemy.ai;
  
  if (!ai.formationLeader || !ai.formationPosition) {
    ai.state = 'patrol';
    return;
  }
  
  // Maintain formation position relative to leader
  const targetPos = ai.formationLeader.group.position.clone()
    .add(ai.formationPosition);
  
  moveTowardsTarget(enemy, targetPos, ai.maxSpeed * 0.6);
  
  // Face same direction as leader
  enemy.group.rotation.copy(ai.formationLeader.group.rotation);
}

function applyFlockingBehavior(enemy, dtMs) {
  const ai = enemy.ai;
  if (ai.state === 'retreat' || ai.state === 'evade') return;
  
  const neighbors = c.enemies.filter(e => 
    e !== enemy && 
    e.hp > 0 && 
    enemy.group.position.distanceTo(e.group.position) < ai.flockingRange
  );
  
  if (neighbors.length === 0) return;
  
  // Separation - avoid crowding neighbors
  const separation = new THREE.Vector3();
  neighbors.forEach(neighbor => {
    const diff = new THREE.Vector3()
      .subVectors(enemy.group.position, neighbor.group.position);
    const distance = diff.length();
    if (distance < 10) {
      separation.add(diff.normalize().divideScalar(distance));
    }
  });
  separation.multiplyScalar(ai.separationForce);
  
  // Alignment - steer towards average heading of neighbors
  const alignment = new THREE.Vector3();
  neighbors.forEach(neighbor => {
    alignment.add(neighbor._velocity);
  });
  alignment.divideScalar(neighbors.length).multiplyScalar(ai.alignmentForce);
  
  // Cohesion - steer towards average position of neighbors
  const cohesion = new THREE.Vector3();
  neighbors.forEach(neighbor => {
    cohesion.add(neighbor.group.position);
  });
  cohesion.divideScalar(neighbors.length)
    .sub(enemy.group.position)
    .multiplyScalar(ai.cohesionForce);
  
  // Apply flocking forces
  const flockingForce = separation.add(alignment).add(cohesion);
  enemy._velocity.add(flockingForce.multiplyScalar(dtMs * 0.001));
}

function moveTowardsTarget(enemy, target, speed) {
  const direction = new THREE.Vector3()
    .subVectors(target, enemy.group.position)
    .normalize()
    .multiplyScalar(speed);
  
  enemy._velocity.add(direction.multiplyScalar(0.1)); // Gradual acceleration
}

function predictPlayerPosition(timeAhead) {
  const velocity = new THREE.Vector3(
    state.flight.velocity.x,
    state.flight.velocity.y,
    state.flight.velocity.z
  );
  
  return ship.position.clone().add(velocity.multiplyScalar(timeAhead));
}

function fireEnemyWeapon(enemy) {
  const ai = enemy.ai;
  
  // Calculate aim with accuracy factor
  const aimDirection = new THREE.Vector3()
    .subVectors(ship.position, enemy.group.position)
    .normalize();
  
  // Add inaccuracy
  const spread = (1 - ai.accuracy) * 0.3;
  aimDirection.x += (Math.random() - 0.5) * spread;
  aimDirection.y += (Math.random() - 0.5) * spread;
  aimDirection.z += (Math.random() - 0.5) * spread;
  aimDirection.normalize();
  
  // Create enemy projectile (reuse existing system if available)
  createEnemyProjectile(enemy.group.position, aimDirection, enemy.type);
}

function createEnemyProjectile(position, direction, enemyType) {
  // Enhanced enemy projectiles with different types
  const speed = 60 + Math.random() * 20;
  const damage = 8 + Math.random() * 4;
  
  // Create projectile visual
  const geom = new THREE.SphereGeometry(0.8, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ 
    color: 0xff0000,
    transparent: true,
    blending: THREE.AdditiveBlending
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(position);
  scene.add(mesh);
  
  const projectile = {
    id: 'enemy_proj_' + Date.now(),
    mesh: mesh,
    position: position.clone(),
    velocity: direction.clone().multiplyScalar(speed),
    life: 4000,
    age: 0,
    damage: damage,
    isEnemy: true
  };
  
  if (!c.enemyProjectiles) c.enemyProjectiles = [];
  c.enemyProjectiles.push(projectile);
}

function constrainToBounds(enemy) {
  const bounds = 200;
  const pos = enemy.group.position;
  
  if (Math.abs(pos.x) > bounds) {
    enemy._velocity.x = -enemy._velocity.x * 0.5;
    pos.x = Math.sign(pos.x) * bounds;
  }
  if (Math.abs(pos.z) > bounds) {
    enemy._velocity.z = -enemy._velocity.z * 0.5;
    pos.z = Math.sign(pos.z) * bounds;
  }
  if (Math.abs(pos.y) > bounds / 2) {
    enemy._velocity.y = -enemy._velocity.y * 0.5;
    pos.y = Math.sign(pos.y) * bounds / 2;
  }
}

// Formation system
function createEnemyFormation(enemies) {
  if (enemies.length < 2) return;
  
  const leader = enemies[0];
  leader.ai.state = 'chase';
  
  for (let i = 1; i < enemies.length; i++) {
    const follower = enemies[i];
    follower.ai.state = 'formation';
    follower.ai.formationLeader = leader;
    
    // V-formation positions
    const side = i % 2 === 0 ? 1 : -1;
    const rank = Math.floor(i / 2);
    follower.ai.formationPosition = new THREE.Vector3(
      side * 15 * (rank + 1),
      0,
      -10 * (rank + 1)
    );
  }
}

function updateTargetingSystem(dtMs) {`);

// Only add if not already present
if (!content.includes('function updateEnemyAI')) {
  content = content.replace(powerUpFunctionsEnd, aiBehaviorFunctions);
  console.log('✅ Added advanced AI behavior functions');
}

// 3. Add AI update to main game loop
const enemyUpdateSection = `    // Update enemies
    c.enemies.forEach((e, i) => {`;

const enhancedEnemyUpdate = `    // Update enemies
    c.enemies.forEach((e, i) => {
      // Update AI
      updateEnemyAI(e, dtMs);`;

// Only add if not already present
if (!content.includes('updateEnemyAI(e, dtMs)')) {
  content = content.replace(enemyUpdateSection, enhancedEnemyUpdate);
  console.log('✅ Added AI update to enemy loop');
}

// 4. Add enemy projectile system
const powerUpUpdateSection = `    // Update power-ups and abilities
    if (c.active) updatePowerUpsAndAbilities(dtMs);`;

const enhancedPowerUpUpdate = `    // Update power-ups and abilities
    if (c.active) updatePowerUpsAndAbilities(dtMs);
    
    // Update enemy projectiles
    if (c.enemyProjectiles) {
      for (let i = c.enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = c.enemyProjectiles[i];
        proj.age += dtMs;
        
        if (proj.age >= proj.life) {
          scene.remove(proj.mesh);
          c.enemyProjectiles.splice(i, 1);
          continue;
        }
        
        // Update position
        proj.position.add(proj.velocity.clone().multiplyScalar(dtMs * 0.001));
        proj.mesh.position.copy(proj.position);
        
        // Check player hit
        const distance = proj.position.distanceTo(ship.position);
        if (distance < 3) {
          // Hit player
          damagePlayer(proj.damage);
          createShieldHitEffect(proj.position, proj.velocity.clone().normalize().negate());
          AudioSFX.play('shield_hit');
          scene.remove(proj.mesh);
          c.enemyProjectiles.splice(i, 1);
        }
      }
    }`;

// Only add if not already present
if (!content.includes('Update enemy projectiles')) {
  content = content.replace(powerUpUpdateSection, enhancedPowerUpUpdate);
  console.log('✅ Added enemy projectile system');
}

// 5. Track damage for AI reactions
const playerDamageSection = `function damagePlayer(amount) {
  if (c.godMode || performance.now() < c.deathImmunityUntil) return;
  
  const actualDamage = Math.min(amount, state.ship.shield + state.ship.hull);
  
  if (state.ship.shield > 0) {
    const shieldDamage = Math.min(amount, state.ship.shield);
    state.ship.shield -= shieldDamage;
    amount -= shieldDamage;
  }
  
  if (amount > 0) {
    state.ship.hull -= amount;
  }
  
  // Visual damage effect
  c.damageFlash = performance.now() + 500;
  
  if (state.ship.hull <= 0) {
    playerDeath();
  }
}`;

// Only add damage tracking if the function doesn't exist
if (!content.includes('function damagePlayer')) {
  const gameLoopStart = `function gameLoop() {`;
  const damageFunction = cr(`function damagePlayer(amount) {
  if (c.godMode || performance.now() < c.deathImmunityUntil) return;
  
  const actualDamage = Math.min(amount, state.ship.shield + state.ship.hull);
  
  // Track damage time for AI reactions
  c.enemies.forEach(e => {
    if (e.ai && ship.position.distanceTo(e.group.position) < 50) {
      e.ai.lastDamageTime = performance.now();
    }
  });
  
  if (state.ship.shield > 0) {
    const shieldDamage = Math.min(amount, state.ship.shield);
    state.ship.shield -= shieldDamage;
    amount -= shieldDamage;
  }
  
  if (amount > 0) {
    state.ship.hull -= amount;
  }
  
  // Visual damage effect
  c.damageFlash = performance.now() + 500;
  
  if (state.ship.hull <= 0) {
    playerDeath();
  }
}

function gameLoop() {`);

  content = content.replace(gameLoopStart, damageFunction);
  console.log('✅ Added enhanced player damage tracking');
}

// Write the file
fs.writeFileSync(htmlPath, content);

console.log('✅ Enhanced enemy AI system implemented successfully!');
console.log('📊 Features added:');
console.log('   • 6 AI states: patrol, chase, attack, evade, retreat, formation');
console.log('   • Flocking behavior with separation, alignment, cohesion');
console.log('   • Formation flying system with leader-follower dynamics');
console.log('   • Predictive targeting and evasive maneuvers');
console.log('   • Individual AI personality traits (aggressiveness, accuracy, evasion)');
console.log('   • Enhanced enemy projectile system');
console.log('   • Tactical decision making based on HP and distance');
console.log('   • Reaction to player damage and stealth state');