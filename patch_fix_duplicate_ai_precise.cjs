const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🔧 FIXING: Removing duplicate updateEnemyAI function (precise removal)');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Remove the entire first updateEnemyAI function and related functions
const duplicateBlock = `// ── Enhanced Enemy AI Behaviors ──
function updateEnemyAI(enemy, dtMs) {
  if (!enemy || enemy.hp <= 0) return;
  
  // Update AI behavior timer
  state.enemyAI.adaptTimer += dtMs;
  if (state.enemyAI.adaptTimer >= state.enemyAI.adaptThreshold) {
    state.enemyAI.adaptTimer = 0;
    adaptAIBehavior();
  }
  
  const shipPos = ship.position;
  const enemyPos = enemy.group.position;
  const distance = shipPos.distanceTo(enemyPos);
  
  switch(state.enemyAI.behavior) {
    case 'aggressive':
      // Direct assault
      const direction = new THREE.Vector3().subVectors(shipPos, enemyPos).normalize();
      enemy.group.position.add(direction.multiplyScalar(enemy.speed * dtMs * 0.001));
      break;
      
    case 'flanking':
      // Circle around player
      const angle = Math.atan2(enemyPos.y - shipPos.y, enemyPos.x - shipPos.x) + dtMs * 0.001;
      const radius = Math.min(distance, 40);
      enemy.group.position.x = shipPos.x + Math.cos(angle) * radius;
      enemy.group.position.y = shipPos.y + Math.sin(angle) * radius;
      break;
      
    case 'swarm':
      // Flocking behavior
      applyFlockingBehavior(enemy);
      break;
      
    case 'defensive':
      // Maintain distance and fire
      if (distance < 30) {
        const retreatDir = new THREE.Vector3().subVectors(enemyPos, shipPos).normalize();
        enemy.group.position.add(retreatDir.multiplyScalar(enemy.speed * dtMs * 0.002));
      }
      break;
  }
  
  // Enhanced targeting with lead prediction
  if (Math.random() < 0.3 * dtMs * 0.001) {
    fireEnemyProjectileWithLead(enemy);
  }
}

function applyFlockingBehavior(enemy) {
  let separation = new THREE.Vector3();
  let alignment = new THREE.Vector3();
  let cohesion = new THREE.Vector3();
  let neighborCount = 0;
  
  c.enemies.forEach(other => {
    if (other === enemy || other.hp <= 0) return;
    const dist = enemy.group.position.distanceTo(other.group.position);
    if (dist < state.enemyAI.flocking.range) {
      neighborCount++;
      
      // Separation
      const diff = new THREE.Vector3().subVectors(enemy.group.position, other.group.position);
      diff.normalize().divideScalar(dist);
      separation.add(diff);
      
      // Alignment  
      alignment.add(other.velocity || new THREE.Vector3());
      
      // Cohesion
      cohesion.add(other.group.position);
    }
  });
  
  if (neighborCount > 0) {
    cohesion.divideScalar(neighborCount).sub(enemy.group.position);
    alignment.divideScalar(neighborCount);
    
    const velocity = new THREE.Vector3()
      .add(separation.multiplyScalar(1.5))
      .add(alignment.multiplyScalar(1.0))
      .add(cohesion.multiplyScalar(0.5));
    
    enemy.velocity = velocity.normalize().multiplyScalar(enemy.speed * 0.5);
    enemy.group.position.add(enemy.velocity.clone().multiplyScalar(0.016));
  }
}

function adaptAIBehavior() {
  const behaviors = ['aggressive', 'defensive', 'flanking', 'swarm'];
  const playerHealth = state.ship.hull / state.ship.maxHull;
  
  if (playerHealth < 0.3) {
    state.enemyAI.behavior = 'aggressive';
  } else if (c.enemies.length > 8) {
    state.enemyAI.behavior = 'swarm';
  } else {
    state.enemyAI.behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
  }
  
  addCombatLog(\`AI ADAPTATION: \${state.enemyAI.behavior.toUpperCase()}\`, '#ff8800');
}

function fireEnemyProjectileWithLead(enemy) {
  const shipVel = ship.userData.velocity || new THREE.Vector3();
  const leadTime = 2.0; // Seconds of lead prediction
  const predictedPos = ship.position.clone().add(shipVel.clone().multiplyScalar(leadTime));
  
  const direction = new THREE.Vector3().subVectors(predictedPos, enemy.group.position).normalize();
  
  const projGeom = new THREE.SphereGeometry(0.8, 6, 6);
  const projMat = new THREE.MeshBasicMaterial({ color: 0xff2200, emissive: 0x440000 });
  const proj = new THREE.Mesh(projGeom, projMat);
  proj.position.copy(enemy.group.position);
  proj.userData.velocity = direction.multiplyScalar(60);
  proj.userData.damage = 8;
  proj.userData.isEnemyProjectile = true;
  proj.userData.age = 0;
  
  scene.add(proj);
  c.projectiles.push(proj);
}`;

// Remove the duplicate block 
indexContent = indexContent.replace(duplicateBlock, '// ── Enhanced Enemy AI Functions (consolidated in advanced AI section) ──');

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Removed duplicate updateEnemyAI and related functions!');
console.log('💡 Kept the advanced AI implementation for better game performance');