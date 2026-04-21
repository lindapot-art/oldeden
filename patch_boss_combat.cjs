const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🤖 DEPLOYING: Boss Combat Integration & Controls');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add boss combat and spawning functions
const bossCombatIntegration = `
// === BOSS COMBAT INTEGRATION ===

function updateBossSystem() {
  if (!state.boss.active) {
    checkBossSpawn();
  } else if (advancedBossSystem.activeBoss) {
    updateActiveBoss();
  }
  
  updateBossMinions();
}

function checkBossSpawn() {
  const now = Date.now();
  const timeSinceLastSpawn = now - state.boss.lastSpawnTime;
  
  // Check if it's time to spawn a boss
  if (timeSinceLastSpawn >= state.boss.spawnInterval) {
    spawnRandomBoss();
  }
  
  // Update spawn timer for UI
  state.boss.spawnTimer = Math.max(0, state.boss.spawnInterval - timeSinceLastSpawn);
}

function spawnRandomBoss() {
  console.log('👹 BOSS INCOMING!');
  
  // Select random boss type based on player progress
  const bossTypes = Object.keys(advancedBossSystem.bossTemplates);
  const selectedType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
  const template = advancedBossSystem.bossTemplates[selectedType];
  
  // Apply adaptive difficulty
  const difficultyMod = calculateDifficultyModifier();
  
  // Create boss object
  const boss = {
    id: 'boss_' + Date.now(),
    type: selectedType,
    name: template.name,
    position: new THREE.Vector3(
      (Math.random() - 0.5) * 200,
      100 + Math.random() * 50,
      0
    ),
    velocity: new THREE.Vector3(0, 0, 0),
    health: template.hp * difficultyMod.health,
    maxHealth: template.hp * difficultyMod.health,
    shield: template.shield * difficultyMod.health,
    maxShield: template.shield * difficultyMod.health,
    size: template.size,
    color: template.color,
    speed: template.speed * difficultyMod.speed,
    attackPower: template.attackPower * difficultyMod.damage,
    abilities: [...template.abilities],
    behavior: template.behavior,
    weaknesses: [...template.weaknesses],
    resistances: [...template.resistances],
    spawnMinions: template.spawnMinions,
    
    // Boss-specific properties
    phase: 1,
    maxPhases: template.phases,
    enraged: false,
    abilityCooldowns: new Map(),
    lastAbilityTime: 0,
    threatTarget: null,
    invulnerable: false,
    
    // Visual mesh (will be created)
    mesh: null
  };
  
  // Create visual representation
  createBossVisual(boss);
  
  // Set as active boss
  advancedBossSystem.activeBoss = boss;
  advancedBossSystem.currentPhase = 1;
  state.boss.active = true;
  state.boss.currentBoss = boss;
  state.boss.lastSpawnTime = Date.now();
  
  // Add boss warning UI
  showBossWarning(boss);
  
  // Play boss spawn sound
  if (typeof playSound === 'function') {
    playSound('boss_spawn', boss.position, 3.0);
  }
  
  console.log(\`🎯 \${boss.name} has spawned!\`);
}

function createBossVisual(boss) {
  // Create boss geometry - larger and more detailed
  const bossGeometry = new THREE.SphereGeometry(boss.size, 16, 12);
  const bossMaterial = new THREE.MeshPhongMaterial({
    color: boss.color,
    emissive: boss.color,
    emissiveIntensity: 0.3,
    shininess: 100
  });
  
  boss.mesh = new THREE.Mesh(bossGeometry, bossMaterial);
  boss.mesh.position.copy(boss.position);
  
  // Add boss glow effect
  const glowGeometry = new THREE.SphereGeometry(boss.size * 1.3, 12, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: boss.color,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending
  });
  
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  boss.mesh.add(glowMesh);
  
  // Add boss to scene
  scene.add(boss.mesh);
  
  // Create boss health bar
  createBossHealthBar(boss);
}

function createBossHealthBar(boss) {
  // Boss health bar will be handled in UI update
  boss.healthBarVisible = true;
}

function updateActiveBoss() {
  const boss = advancedBossSystem.activeBoss;
  if (!boss) return;
  
  // Update boss AI
  updateBossAI(boss);
  
  // Update boss position
  boss.position.add(boss.velocity.clone().multiplyScalar(0.016));
  if (boss.mesh) {
    boss.mesh.position.copy(boss.position);
  }
  
  // Update boss abilities
  updateBossAbilities(boss);
  
  // Check phase transitions
  checkBossPhaseTransition(boss);
  
  // Check boss death
  if (boss.health <= 0) {
    destroyBoss(boss);
  }
  
  // Keep boss in bounds
  boss.position.x = Math.max(-150, Math.min(150, boss.position.x));
  boss.position.y = Math.max(20, Math.min(180, boss.position.y));
}

function updateBossAI(boss) {
  // Get behavior tree for this boss
  const behaviorTree = advancedBossSystem.behaviorTrees.get(boss.behavior);
  if (!behaviorTree) return;
  
  // Evaluate current state and get action
  const action = behaviorTree.evaluate(boss, player);
  
  // Execute action
  if (behaviorTree.actions[action]) {
    behaviorTree.actions[action](boss, player);
  }
  
  // Update threat assessment
  updateBossThreatAssessment(boss);
}

function updateBossThreatAssessment(boss) {
  // Simple threat model for now
  boss.threatTarget = player;
  
  // Calculate distance and adjust behavior
  const distance = boss.position.distanceTo(player.position);
  
  // Adjust movement based on distance
  if (distance > 100) {
    // Too far - move closer
    const direction = new THREE.Vector3().subVectors(player.position, boss.position).normalize();
    boss.velocity.copy(direction.multiplyScalar(boss.speed * 0.5));
  } else if (distance < 40) {
    // Too close - back away
    const direction = new THREE.Vector3().subVectors(boss.position, player.position).normalize();
    boss.velocity.copy(direction.multiplyScalar(boss.speed * 0.3));
  } else {
    // Good distance - circle strafe
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
    boss.velocity.copy(perpendicular.multiplyScalar(boss.speed * 0.4));
  }
  
  // Apply some randomness
  boss.velocity.add(new THREE.Vector3(
    (Math.random() - 0.5) * boss.speed * 0.2,
    (Math.random() - 0.5) * boss.speed * 0.2,
    0
  ));
}

function updateBossAbilities(boss) {
  const now = Date.now();
  
  // Check if boss should use an ability
  const timeSinceLastAbility = now - boss.lastAbilityTime;
  const abilityChance = 0.05 * advancedBossSystem.difficultyModifiers.abilityFrequency;
  
  if (timeSinceLastAbility > 3000 && Math.random() < abilityChance) {
    // Select available ability
    const availableAbilities = boss.abilities.filter(abilityName => {
      const ability = advancedBossSystem.abilities.get(abilityName);
      if (!ability) return false;
      
      const cooldownKey = \`\${boss.id}_\${abilityName}\`;
      const lastUsed = boss.abilityCooldowns.get(cooldownKey) || 0;
      return (now - lastUsed) >= ability.cooldown;
    });
    
    if (availableAbilities.length > 0) {
      const selectedAbility = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
      executeBossAbility(boss, selectedAbility);
      boss.lastAbilityTime = now;
    }
  }
}

function executeBossAbility(boss, abilityName) {
  const ability = advancedBossSystem.abilities.get(abilityName);
  if (!ability) return;
  
  const now = Date.now();
  const cooldownKey = \`\${boss.id}_\${abilityName}\`;
  const lastUsed = boss.abilityCooldowns.get(cooldownKey) || 0;
  
  // Check cooldown
  if ((now - lastUsed) < ability.cooldown) return;
  
  // Execute ability
  console.log(\`🔥 \${boss.name} uses \${ability.name}!\`);
  ability.execute(boss, player);
  
  // Set cooldown
  boss.abilityCooldowns.set(cooldownKey, now);
}

function checkBossPhaseTransition(boss) {
  const healthPercent = boss.health / boss.maxHealth;
  const newPhase = Math.ceil((1 - healthPercent) * boss.maxPhases) + 1;
  
  if (newPhase > advancedBossSystem.currentPhase && newPhase <= boss.maxPhases) {
    triggerBossPhaseTransition(boss, newPhase);
  }
}

function triggerBossPhaseTransition(boss, newPhase) {
  console.log(\`🌟 \${boss.name} enters Phase \${newPhase}!\`);
  
  advancedBossSystem.currentPhase = newPhase;
  advancedBossSystem.phaseTransitioning = true;
  
  // Make boss briefly invulnerable
  boss.invulnerable = true;
  
  // Phase transition effects
  createPhaseTransitionEffect(boss);
  
  // Update boss stats based on phase
  switch (newPhase) {
    case 2:
      boss.attackPower *= 1.2;
      boss.speed *= 1.1;
      break;
    case 3:
      boss.attackPower *= 1.4;
      boss.speed *= 1.2;
      boss.enraged = true;
      break;
  }
  
  // End invulnerability after effect
  setTimeout(() => {
    boss.invulnerable = false;
    advancedBossSystem.phaseTransitioning = false;
  }, 2000);
  
  // Play phase transition sound
  if (typeof playSound === 'function') {
    playSound('boss_phase', boss.position, 2.0);
  }
}

function createPhaseTransitionEffect(boss) {
  // Create expanding ring effect
  const ringGeometry = new THREE.RingGeometry(boss.size, boss.size * 1.5, 16);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending
  });
  
  const phaseRing = new THREE.Mesh(ringGeometry, ringMaterial);
  phaseRing.position.copy(boss.position);
  scene.add(phaseRing);
  
  // Animate ring
  const startTime = Date.now();
  const duration = 2000;
  
  function animatePhaseRing() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (progress < 1) {
      const scale = 1 + progress * 4;
      phaseRing.scale.setScalar(scale);
      phaseRing.material.opacity = 1.0 * (1 - progress);
      
      requestAnimationFrame(animatePhaseRing);
    } else {
      scene.remove(phaseRing);
    }
  }
  
  animatePhaseRing();
}

function destroyBoss(boss) {
  console.log(\`💀 \${boss.name} has been defeated!\`);
  
  // Remove boss from scene
  if (boss.mesh) {
    scene.remove(boss.mesh);
  }
  
  // Create boss explosion effect
  createBossExplosionEffect(boss);
  
  // Award loot
  awardBossLoot(boss);
  
  // Update player stats
  updatePlayerBossKillStats(boss);
  
  // Clear boss state
  advancedBossSystem.activeBoss = null;
  state.boss.active = false;
  state.boss.currentBoss = null;
  
  // Clear minions
  advancedBossSystem.bossMinions.forEach(minion => {
    if (minion.mesh) scene.remove(minion.mesh);
  });
  advancedBossSystem.bossMinions = [];
  
  // Set next spawn timer
  state.boss.lastSpawnTime = Date.now();
  
  // Play victory sound
  if (typeof playSound === 'function') {
    playSound('boss_defeat', boss.position, 3.0);
  }
}

function createBossExplosionEffect(boss) {
  // Multiple explosion particles
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * boss.size * 2,
        (Math.random() - 0.5) * boss.size * 2,
        0
      );
      
      createExplosionEffect(boss.position.clone().add(offset), boss.size * 2, boss.color);
    }, i * 200);
  }
}

function awardBossLoot(boss) {
  // Award high-value loot based on boss difficulty
  const lootTypes = ['credits', 'rare_material', 'legendary_component'];
  
  lootTypes.forEach(type => {
    const loot = {
      type: type,
      rarity: 'legendary',
      value: boss.maxHealth / 10,
      position: boss.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        0
      ))
    };
    
    // Use existing loot system
    if (typeof spawnLoot === 'function') {
      spawnLoot(loot.position, loot.type, loot.rarity);
    }
  });
}

function updatePlayerBossKillStats(boss) {
  // Track boss kills for progression
  if (!player.stats.bossKills) {
    player.stats.bossKills = {};
  }
  
  if (!player.stats.bossKills[boss.type]) {
    player.stats.bossKills[boss.type] = 0;
  }
  
  player.stats.bossKills[boss.type]++;
  player.stats.totalBossKills = (player.stats.totalBossKills || 0) + 1;
  
  // Award experience/credits
  player.stats.experience += boss.maxHealth;
  player.stats.credits += Math.floor(boss.maxHealth / 5);
}

function calculateDifficultyModifier() {
  const perf = advancedBossSystem.playerPerformance;
  
  // Base modifiers
  let healthMod = 1.0;
  let damageMod = 1.0;
  let speedMod = 1.0;
  let abilityMod = 1.0;
  
  // Adjust based on player performance
  if (perf.accuracy > 0.8) {
    healthMod *= 1.3;
    damageMod *= 1.2;
  } else if (perf.accuracy < 0.4) {
    healthMod *= 0.7;
    damageMod *= 0.8;
  }
  
  if (perf.averageDamage > 25) {
    healthMod *= 1.2;
    speedMod *= 1.1;
  }
  
  // Clamp modifiers
  healthMod = Math.max(0.5, Math.min(2.0, healthMod));
  damageMod = Math.max(0.5, Math.min(2.0, damageMod));
  speedMod = Math.max(0.5, Math.min(1.5, speedMod));
  abilityMod = Math.max(0.5, Math.min(2.0, abilityMod));
  
  advancedBossSystem.difficultyModifiers = {
    health: healthMod,
    damage: damageMod,
    speed: speedMod,
    abilityFrequency: abilityMod
  };
  
  return advancedBossSystem.difficultyModifiers;
}`;

// Add boss combat integration before existing functions
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${bossCombatIntegration}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Boss Combat Integration deployed!');
console.log('⚔️ Features: Boss spawning, AI behaviors, phase transitions, adaptive difficulty');
console.log('💥 Combat: Ability system, cooldowns, threat assessment, death effects');
console.log('🎯 Progression: Boss loot, player stats, difficulty scaling');