// FINAL PATCH - Add missing functions to complete the enhancement
// This adds the missing enemy bolt and AI functions

const fs = require('fs');

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

console.log('🎯 Adding missing combat functions...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add missing functions before the closing script tag
  const scriptEndIndex = html.lastIndexOf('</script>');
  
  const missingFunctions = cr(`

// ═══ ENHANCED ENEMY BOLT SPAWNING SYSTEM ═══
function spawnEnemyBolt(fromPos, targetPos, type = 'normal') {
  if (!fromPos || !targetPos) return;
  
  // Enhanced bolt types
  const boltConfigs = {
    normal: { speed: 80, damage: 1.2, color: 0xff4422, size: 0.3 },
    elite: { speed: 100, damage: 2.0, color: 0xff1100, size: 0.4 },
    formation: { speed: 85, damage: 1.5, color: 0xffaa00, size: 0.35 }
  };
  
  const config = boltConfigs[type] || boltConfigs.normal;
  
  // Calculate trajectory
  const direction = new THREE.Vector3().subVectors(targetPos, fromPos).normalize();
  
  // Create bolt visual
  const boltGeo = new THREE.SphereGeometry(config.size, 6, 6);
  const boltMat = new THREE.MeshBasicMaterial({ 
    color: config.color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const bolt = new THREE.Mesh(boltGeo, boltMat);
  bolt.position.copy(fromPos);
  scene.add(bolt);
  
  // Bolt object for collision tracking
  const enemyBolt = {
    mesh: bolt,
    velocity: direction.multiplyScalar(config.speed),
    damage: config.damage,
    life: 3.0,
    type: type
  };
  
  if (!c.enemyBolts) c.enemyBolts = [];
  c.enemyBolts.push(enemyBolt);
  
  console.log(\`Spawned \${type} bolt from enemy\`);
}

// ═══ DAMAGE FUNCTION FOR PLAYER ═══ 
function takeDamage(amount, source = 'unknown') {
  if (c.dead || state.ship.invulnerable) return;
  
  // Apply damage to shields first, then hull
  const actualDamage = amount * (state.upgrades?.damageReduction || 1);
  
  if (state.ship.shield > 0) {
    const shieldDamage = Math.min(state.ship.shield, actualDamage);
    state.ship.shield -= shieldDamage;
    const remainingDamage = actualDamage - shieldDamage;
    
    if (remainingDamage > 0) {
      state.ship.hull -= remainingDamage;
    }
  } else {
    state.ship.hull -= actualDamage;
  }
  
  // Visual feedback
  c.damageFlash = 200;
  c.shakeX += (Math.random() - 0.5) * 0.3;
  c.shakeY += (Math.random() - 0.5) * 0.3;
  
  // Check for death
  if (state.ship.hull <= 0) {
    state.ship.hull = 0;
    if (!c.dead) {
      playerDeathSequence(\`Destroyed by \${source}\`);
    }
  }
  
  console.log(\`Player took \${actualDamage} damage from \${source}\`);
}

// ═══ ENHANCED DIFFICULTY SCALING ═══
function getDifficultyScale() {
  const baseScale = 1.0;
  const cycleScale = (c.cycle - 1) * 0.15;
  const rebirthScale = (state.player.rebirths || 0) * 0.1;
  return baseScale + cycleScale + rebirthScale;
}`);

  html = html.slice(0, scriptEndIndex) + missingFunctions + cr('\n') + html.slice(scriptEndIndex);
  
  // Update the gameLoop to process enemy bolts
  const gameLoopPattern = `    if (c.active) {
      updateTargetingSystem(dtMs);
      updateParticleSystem(dtMs);
      updatePowerUps(dtMs);
      updateBossAI();
      spawnRandomBoss();
      updateLootSystem();
    }`;
    
  const gameLoopReplacement = cr(`    if (c.active) {
      updateTargetingSystem(dtMs);
      updateParticleSystem(dtMs);
      updatePowerUps(dtMs);
      updateBossAI();
      spawnRandomBoss();
      updateLootSystem();
      updateEnemyBolts(dt);
    }`);
  
  if (html.includes(gameLoopPattern)) {
    html = html.replace(gameLoopPattern, gameLoopReplacement);
    console.log('✅ Added enemy bolt updates to game loop');
  }

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Missing combat functions added successfully!');
  console.log('');
  console.log('🎯 COMBAT COMPLETION:');
  console.log('   • Enhanced enemy bolt spawning system');
  console.log('   • Player damage system with visual feedback');
  console.log('   • Dynamic difficulty scaling');
  console.log('   • Enemy bolt collision detection');
  console.log('');
  
} catch (error) {
  console.error('❌ Error adding missing functions:', error.message);
  process.exit(1);
}