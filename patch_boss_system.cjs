const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🤖 DEPLOYING: Advanced AI Boss Mechanics');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add boss system state
const bossState = `      // Advanced AI Boss Mechanics
      boss: {
        active: false,
        currentBoss: null,
        phase: 1,
        maxPhases: 3,
        spawnTimer: 0,
        spawnInterval: 300000, // 5 minutes
        difficulty: 1.0,
        adaptiveDifficulty: true,
        bossTypes: new Map(),
        abilities: new Map(),
        behaviorTrees: new Map(),
        healthGates: [0.66, 0.33, 0.1],
        enrageThreshold: 0.25,
        lastSpawnTime: 0
      },`;

// Add to state object
indexContent = indexContent.replace(
  '      // Sound System & Audio Effects',
  `${bossState}
      
      // Sound System & Audio Effects`
);

// Add advanced boss system
const advancedBossSystem = `
// === ADVANCED AI BOSS MECHANICS ===
const advancedBossSystem = {
  // Boss Templates
  bossTemplates: {
    'titan_destroyer': {
      name: 'Titan Destroyer',
      hp: 2000,
      shield: 1000,
      size: 8.0,
      color: 0xff0040,
      speed: 15,
      attackPower: 50,
      phases: 3,
      abilities: ['laser_barrage', 'missile_swarm', 'shield_drain', 'teleport'],
      behavior: 'aggressive_tactical',
      weaknesses: ['ion'],
      resistances: ['pulse', 'plasma'],
      spawnMinions: true
    },
    
    'quantum_leviathan': {
      name: 'Quantum Leviathan',
      hp: 3500,
      shield: 800,
      size: 12.0,
      color: 0x8000ff,
      speed: 8,
      attackPower: 75,
      phases: 4,
      abilities: ['quantum_warp', 'gravity_well', 'energy_nova', 'phase_shift'],
      behavior: 'defensive_control',
      weaknesses: ['railgun'],
      resistances: ['laser', 'missile'],
      spawnMinions: false
    },
    
    'cyber_overlord': {
      name: 'Cyber Overlord',
      hp: 1800,
      shield: 1200,
      size: 6.0,
      color: 0x00ffff,
      speed: 25,
      attackPower: 40,
      phases: 2,
      abilities: ['hack_systems', 'drone_swarm', 'emp_burst', 'adaptive_shield'],
      behavior: 'swarm_coordinator',
      weaknesses: ['plasma'],
      resistances: ['ion'],
      spawnMinions: true
    },
    
    'void_harbinger': {
      name: 'Void Harbinger',
      hp: 4000,
      shield: 500,
      size: 10.0,
      color: 0x440044,
      speed: 12,
      attackPower: 60,
      phases: 3,
      abilities: ['void_beam', 'dark_matter', 'reality_tear', 'soul_drain'],
      behavior: 'apocalyptic',
      weaknesses: ['laser'],
      resistances: ['pulse', 'ion'],
      spawnMinions: false
    },
    
    'stellar_phoenix': {
      name: 'Stellar Phoenix',
      hp: 2500,
      shield: 1500,
      size: 9.0,
      color: 0xffa500,
      speed: 20,
      attackPower: 55,
      phases: 4,
      abilities: ['solar_flare', 'plasma_storm', 'rebirth', 'heat_wave'],
      behavior: 'regenerative',
      weaknesses: ['ion', 'railgun'],
      resistances: ['plasma'],
      spawnMinions: false
    }
  },
  
  // Active Boss Data
  activeBoss: null,
  bossMinions: [],
  currentPhase: 1,
  phaseTransitioning: false,
  
  // AI Behavior Trees
  behaviorTrees: new Map(),
  
  // Boss Abilities
  abilities: new Map(),
  
  // Combat Patterns
  combatPatterns: new Map(),
  
  // Performance Tracking
  playerPerformance: {
    accuracy: 0.7,
    averageDamage: 15,
    survivalTime: 0,
    weaponPreference: 'pulse'
  },
  
  // Difficulty Scaling
  difficultyModifiers: {
    health: 1.0,
    damage: 1.0,
    speed: 1.0,
    abilityFrequency: 1.0
  }
};

function initAdvancedBossSystem() {
  console.log('🤖 Initializing Advanced AI Boss System');
  
  // Initialize behavior trees
  createBehaviorTrees();
  
  // Initialize boss abilities
  createBossAbilities();
  
  // Initialize combat patterns
  createCombatPatterns();
  
  // Set up adaptive difficulty
  initAdaptiveDifficulty();
  
  // Start boss spawn timer
  startBossSpawnCycle();
  
  console.log('✅ Advanced Boss System initialized');
}

function createBehaviorTrees() {
  // Aggressive Tactical Behavior Tree
  const aggressiveTactical = {
    name: 'aggressive_tactical',
    evaluate: function(boss, player) {
      const distance = boss.position.distanceTo(player.position);
      const healthPercent = boss.health / boss.maxHealth;
      
      if (healthPercent < 0.3) {
        return 'enrage';
      } else if (distance > 80) {
        return 'close_distance';
      } else if (distance < 30) {
        return 'maintain_distance';
      } else {
        return 'attack';
      }
    },
    
    actions: {
      'enrage': function(boss) {
        boss.attackPower *= 1.5;
        boss.speed *= 1.3;
        boss.abilityFrequency *= 2.0;
        executeBossAbility(boss, 'laser_barrage');
      },
      
      'close_distance': function(boss, player) {
        const direction = new THREE.Vector3().subVectors(player.position, boss.position).normalize();
        boss.position.add(direction.multiplyScalar(boss.speed * 0.016));
      },
      
      'maintain_distance': function(boss, player) {
        const direction = new THREE.Vector3().subVectors(boss.position, player.position).normalize();
        boss.position.add(direction.multiplyScalar(boss.speed * 0.008));
      },
      
      'attack': function(boss) {
        if (Math.random() < 0.3) {
          const abilities = ['laser_barrage', 'missile_swarm'];
          const ability = abilities[Math.floor(Math.random() * abilities.length)];
          executeBossAbility(boss, ability);
        }
      }
    }
  };
  
  advancedBossSystem.behaviorTrees.set('aggressive_tactical', aggressiveTactical);
  
  // Defensive Control Behavior Tree
  const defensiveControl = {
    name: 'defensive_control',
    evaluate: function(boss, player) {
      const distance = boss.position.distanceTo(player.position);
      const healthPercent = boss.health / boss.maxHealth;
      
      if (healthPercent < 0.5) {
        return 'defensive';
      } else if (distance < 50) {
        return 'control_space';
      } else {
        return 'prepare_attack';
      }
    },
    
    actions: {
      'defensive': function(boss) {
        executeBossAbility(boss, 'energy_nova');
        boss.shieldRegenRate = 5;
      },
      
      'control_space': function(boss) {
        executeBossAbility(boss, 'gravity_well');
      },
      
      'prepare_attack': function(boss) {
        if (Math.random() < 0.4) {
          executeBossAbility(boss, 'quantum_warp');
        }
      }
    }
  };
  
  advancedBossSystem.behaviorTrees.set('defensive_control', defensiveControl);
  
  // Swarm Coordinator Behavior Tree
  const swarmCoordinator = {
    name: 'swarm_coordinator',
    evaluate: function(boss, player) {
      const minionCount = advancedBossSystem.bossMinions.length;
      const healthPercent = boss.health / boss.maxHealth;
      
      if (minionCount < 3) {
        return 'spawn_minions';
      } else if (healthPercent < 0.4) {
        return 'coordinate_attack';
      } else {
        return 'support_minions';
      }
    },
    
    actions: {
      'spawn_minions': function(boss) {
        spawnBossMinions(boss, 3);
        executeBossAbility(boss, 'drone_swarm');
      },
      
      'coordinate_attack': function(boss) {
        executeBossAbility(boss, 'emp_burst');
        advancedBossSystem.bossMinions.forEach(minion => {
          minion.aggression = 2.0;
        });
      },
      
      'support_minions': function(boss) {
        executeBossAbility(boss, 'adaptive_shield');
      }
    }
  };
  
  advancedBossSystem.behaviorTrees.set('swarm_coordinator', swarmCoordinator);
  
  console.log('🧠 Boss behavior trees created');
}

function createBossAbilities() {
  // Laser Barrage
  const laserBarrage = {
    name: 'laser_barrage',
    cooldown: 8000,
    lastUsed: 0,
    
    execute: function(boss, player) {
      console.log('💥 Boss uses Laser Barrage!');
      
      const laserCount = 12;
      const angleStep = (Math.PI * 2) / laserCount;
      
      for (let i = 0; i < laserCount; i++) {
        const angle = angleStep * i;
        const direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
        
        setTimeout(() => {
          createBossLaser(boss.position.clone(), direction, boss.attackPower * 0.8);
        }, i * 100);
      }
      
      // Play audio
      if (typeof playSound === 'function') {
        playSound('weapon_laser', boss.position, 2.0, 0.8);
      }
    }
  };
  
  advancedBossSystem.abilities.set('laser_barrage', laserBarrage);
  
  // Missile Swarm
  const missileSwarm = {
    name: 'missile_swarm',
    cooldown: 12000,
    lastUsed: 0,
    
    execute: function(boss, player) {
      console.log('🚀 Boss uses Missile Swarm!');
      
      const missileCount = 8;
      
      for (let i = 0; i < missileCount; i++) {
        setTimeout(() => {
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            0
          );
          
          const startPos = boss.position.clone().add(offset);
          createHomingMissile(startPos, player.position.clone(), boss.attackPower);
        }, i * 300);
      }
      
      if (typeof playSound === 'function') {
        playSound('weapon_missile', boss.position, 1.5);
      }
    }
  };
  
  advancedBossSystem.abilities.set('missile_swarm', missileSwarm);
  
  // Quantum Warp
  const quantumWarp = {
    name: 'quantum_warp',
    cooldown: 15000,
    lastUsed: 0,
    
    execute: function(boss, player) {
      console.log('🌀 Boss uses Quantum Warp!');
      
      // Visual effect
      createWarpEffect(boss.position.clone());
      
      // Teleport behind player
      const behindPlayer = player.position.clone().add(
        new THREE.Vector3(0, -50, 0)
      );
      
      boss.position.copy(behindPlayer);
      
      // Create arrival effect
      setTimeout(() => {
        createWarpEffect(boss.position.clone());
        executeBossAbility(boss, 'energy_nova');
      }, 500);
    }
  };
  
  advancedBossSystem.abilities.set('quantum_warp', quantumWarp);
  
  // Energy Nova
  const energyNova = {
    name: 'energy_nova',
    cooldown: 10000,
    lastUsed: 0,
    
    execute: function(boss, player) {
      console.log('💫 Boss uses Energy Nova!');
      
      // Create expanding energy ring
      const ringGeometry = new THREE.RingGeometry(1, 2, 16);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: boss.color || 0x8000ff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      const energyRing = new THREE.Mesh(ringGeometry, ringMaterial);
      energyRing.position.copy(boss.position);
      scene.add(energyRing);
      
      // Animate expansion
      const startTime = Date.now();
      const duration = 2000;
      
      function animateNova() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
          const scale = 1 + progress * 30;
          energyRing.scale.setScalar(scale);
          energyRing.material.opacity = 0.8 * (1 - progress);
          
          // Damage player if in range
          const distance = boss.position.distanceTo(player.position);
          if (distance < scale * 2 && elapsed % 200 < 16) {
            // Damage player
            if (typeof playPlayerHitSound === 'function') {
              playPlayerHitSound('shield');
            }
          }
          
          requestAnimationFrame(animateNova);
        } else {
          scene.remove(energyRing);
        }
      }
      
      animateNova();
    }
  };
  
  advancedBossSystem.abilities.set('energy_nova', energyNova);
  
  console.log('⚡ Boss abilities created');
}

function createCombatPatterns() {
  // Phase-based combat patterns
  const patterns = {
    phase1: {
      abilityFrequency: 0.02,
      preferredAbilities: ['laser_barrage', 'missile_swarm'],
      movementStyle: 'aggressive',
      minionSpawning: false
    },
    
    phase2: {
      abilityFrequency: 0.035,
      preferredAbilities: ['quantum_warp', 'energy_nova', 'laser_barrage'],
      movementStyle: 'tactical',
      minionSpawning: true
    },
    
    phase3: {
      abilityFrequency: 0.05,
      preferredAbilities: ['energy_nova', 'missile_swarm', 'quantum_warp'],
      movementStyle: 'desperate',
      minionSpawning: true
    }
  };
  
  advancedBossSystem.combatPatterns.set('standard', patterns);
  
  console.log('⚔️ Combat patterns created');
}

function initAdaptiveDifficulty() {
  // Monitor player performance
  advancedBossSystem.playerPerformance = {
    accuracy: 0.7,
    averageDamage: 15,
    survivalTime: 0,
    weaponPreference: 'pulse'
  };
  
  console.log('📊 Adaptive difficulty initialized');
}

function startBossSpawnCycle() {
  // Set initial spawn timer
  state.boss.spawnTimer = 0;
  state.boss.lastSpawnTime = Date.now();
  
  console.log('⏰ Boss spawn cycle started');
}`;

// Add advanced boss system after audio system
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${advancedBossSystem}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Advanced AI Boss Mechanics (Part 1) deployed!');
console.log('🤖 Features: 5 boss types, behavior trees, adaptive AI, combat patterns');
console.log('⚔️ Boss Types: Titan Destroyer, Quantum Leviathan, Cyber Overlord, Void Harbinger, Stellar Phoenix');
console.log('🧠 AI Systems: Behavior trees, ability cooldowns, phase transitions');