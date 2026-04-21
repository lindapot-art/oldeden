const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🔧 FIXING: Duplicate updateEnemyAI function');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Find and remove the first (simpler) updateEnemyAI function
const duplicateFunction = `// ── Enhanced Enemy AI Behaviors ──
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
      if (distance > 50) {
        enemy.group.position.lerp(shipPos, 0.01);
      }
      break;
      
    case 'defensive':
      // Keep distance but engage
      if (distance < 100) {
        const moveVector = enemyPos.clone().sub(shipPos).normalize().multiplyScalar(0.5);
        enemy.group.position.add(moveVector);
      } else if (distance > 200) {
        enemy.group.position.lerp(shipPos, 0.005);
      }
      break;
      
    case 'hunter':
      // Predict player movement
      if (ship.velocity) {
        const predictedPos = shipPos.clone().add(ship.velocity.clone().multiplyScalar(2));
        enemy.group.position.lerp(predictedPos, 0.008);
      }
      break;
      
    case 'swarm':
      // Coordinate with other enemies
      if (enemies.length > 1) {
        const avgPos = new THREE.Vector3();
        enemies.forEach(e => avgPos.add(e.group.position));
        avgPos.divideScalar(enemies.length);
        enemy.group.position.lerp(avgPos, 0.003);
      }
      break;
      
    case 'elite':
      // Advanced tactics
      enemy.group.rotation.z += 0.02;
      if (distance > 80 && distance < 150) {
        const circleVector = new THREE.Vector3(
          Math.cos(Date.now() * 0.001) * 100,
          Math.sin(Date.now() * 0.001) * 100,
          0
        );
        enemy.group.position.lerp(shipPos.clone().add(circleVector), 0.01);
      }
      break;
  }
  
  // Enhanced firing logic
  if (distance < 150 && Math.random() < state.enemyAI.aggressionLevel) {
    fireEnemyBullet(enemy);
  }
}

function adaptAIBehavior() {
  const behaviors = ['aggressive', 'defensive', 'hunter', 'swarm', 'elite'];
  
  // Adapt based on player performance
  if (state.player.score > state.enemyAI.lastScore + 500) {
    // Player doing well, increase difficulty
    state.enemyAI.aggressionLevel = Math.min(state.enemyAI.aggressionLevel + 0.1, 1.0);
    state.enemyAI.behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
  } else if (state.player.health < 30) {
    // Player struggling, ease up slightly
    state.enemyAI.aggressionLevel = Math.max(state.enemyAI.aggressionLevel - 0.05, 0.3);
  }
  
  state.enemyAI.lastScore = state.player.score;
  console.log(\`🤖 AI adapted: \${state.enemyAI.behavior} (aggression: \${state.enemyAI.aggressionLevel.toFixed(2)})\`);
}`;

// Remove the duplicate function
indexContent = indexContent.replace(duplicateFunction, '// ── Enhanced Enemy AI Functions (Moved to Advanced AI Section) ──');

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Removed duplicate updateEnemyAI function!');
console.log('💡 Kept the enhanced AI implementation with better behavior system');