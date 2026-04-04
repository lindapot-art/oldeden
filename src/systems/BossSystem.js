/**
 * BossSystem — manages boss enemy entities with advanced behaviors and mechanics.
 *
 * Provides a complete boss combat system with:
 *   - Phase-based health progression (multi-phase bosses)
 *   - Attack pattern sequences (timed, scripted attacks)
 *   - Special abilities (shields, summons, area effects)
 *   - Movement behaviors (orbit, strafe, charge, retreat)
 *   - Loot drops and rewards
 *   - Integration with existing combat/spawn systems
 *
 * Boss Types:
 *   - DESTROYER   — Heavy capital ship with massive firepower
 *   - CARRIER     — Spawns fighter waves, mobile fortress
 *   - DREADNOUGHT — Armored tank with shield phases
 *   - MOTHERSHIP  — Ultimate endgame boss with all mechanics
 *
 * Usage:
 *   const bossSystem = new BossSystem(npcSystem, combatSystem, enemySpawnSystem);
 *   engine.registerSystem('bosses', bossSystem);
 *   
 *   // Spawn a boss
 *   const bossId = bossSystem.spawnBoss('DESTROYER', playerPosition, difficulty);
 *   
 *   // Check boss status
 *   const boss = bossSystem.getBoss(bossId);
 *   console.log(`Phase ${boss.currentPhase}/${boss.maxPhases}`);
 */

import { WEAPON_TYPE, ARMOR_TYPE } from './CombatSystem.js';

/** Boss behavior states */
const BOSS_STATE = {
  IDLE: 'idle',
  APPROACH: 'approach',
  ORBIT: 'orbit',
  STRAFE: 'strafe',
  CHARGE: 'charge',
  RETREAT: 'retreat',
  SPECIAL_ABILITY: 'special_ability',
  PHASE_TRANSITION: 'phase_transition',
  DEATH: 'death',
};

/** Boss ability types */
const BOSS_ABILITY = {
  SUMMON_FIGHTERS: 'summon_fighters',
  SHIELD_BURST: 'shield_burst',
  MISSILE_BARRAGE: 'missile_barrage',
  LASER_SWEEP: 'laser_sweep',
  WARP_STRIKE: 'warp_strike',
  REPAIR_DRONES: 'repair_drones',
};

export class BossSystem {
  /**
   * @param {object} npcSystem         Reference to NPCSystem.
   * @param {object} combatSystem      Reference to CombatSystem.
   * @param {object} enemySpawnSystem  Reference to EnemySpawnSystem.
   * @param {object} [options]
   */
  constructor(npcSystem, combatSystem, enemySpawnSystem, options = {}) {
    this._npcSystem = npcSystem;
    this._combatSystem = combatSystem;
    this._enemySpawnSystem = enemySpawnSystem;

    /** Active bosses: Map<bossId, BossEntity> */
    this._bosses = new Map();

    /** Event emitter (set by GameEngine) */
    this.events = null;

    /** Boss ID counter */
    this._nextBossId = 1;

    /** Boss type templates */
    this.BOSS_TYPES = {
      DESTROYER: {
        name: 'Destroyer-Class Warship',
        maxHealth: 5000,
        maxShield: 2000,
        armorType: ARMOR_TYPE.HEAVY,
        baseSpeed: 12,
        baseDamage: 80,
        scale: 8.0,
        color: 0xff4444,
        phases: [
          {
            healthPercent: 100,
            attackPatterns: ['RAILGUN_BURST', 'MISSILE_VOLLEY'],
            movePattern: 'ORBIT',
            attackIntervalMs: 4000,
          },
          {
            healthPercent: 60,
            attackPatterns: ['RAILGUN_BURST', 'MISSILE_BARRAGE', 'LASER_SWEEP'],
            movePattern: 'STRAFE',
            attackIntervalMs: 3000,
            specialAbility: BOSS_ABILITY.SHIELD_BURST,
          },
          {
            healthPercent: 30,
            attackPatterns: ['ALL_WEAPONS', 'MISSILE_BARRAGE'],
            movePattern: 'CHARGE',
            attackIntervalMs: 2000,
            specialAbility: BOSS_ABILITY.SUMMON_FIGHTERS,
          },
        ],
        lootTable: {
          credits: [5000, 10000],
          items: ['boss_fragment_destroyer', 'heavy_railgun_blueprint'],
          rareLoot: 'destroyer_core',
        },
      },
      CARRIER: {
        name: 'Carrier-Class Command Ship',
        maxHealth: 7000,
        maxShield: 3000,
        armorType: ARMOR_TYPE.MEDIUM,
        baseSpeed: 8,
        baseDamage: 50,
        scale: 12.0,
        color: 0x4444ff,
        phases: [
          {
            healthPercent: 100,
            attackPatterns: ['SUMMON_WAVE'],
            movePattern: 'ORBIT',
            attackIntervalMs: 8000,
            specialAbility: BOSS_ABILITY.SUMMON_FIGHTERS,
          },
          {
            healthPercent: 70,
            attackPatterns: ['SUMMON_WAVE', 'LASER_GRID'],
            movePattern: 'RETREAT',
            attackIntervalMs: 6000,
            specialAbility: BOSS_ABILITY.SUMMON_FIGHTERS,
          },
          {
            healthPercent: 40,
            attackPatterns: ['SUMMON_ELITE', 'MISSILE_BARRAGE', 'LASER_GRID'],
            movePattern: 'RETREAT',
            attackIntervalMs: 4000,
            specialAbility: BOSS_ABILITY.REPAIR_DRONES,
          },
        ],
        lootTable: {
          credits: [8000, 15000],
          items: ['boss_fragment_carrier', 'fighter_bay_blueprint'],
          rareLoot: 'carrier_core',
        },
      },
      DREADNOUGHT: {
        name: 'Dreadnought-Class Fortress',
        maxHealth: 10000,
        maxShield: 5000,
        armorType: ARMOR_TYPE.HEAVY,
        baseSpeed: 6,
        baseDamage: 120,
        scale: 15.0,
        color: 0x888844,
        phases: [
          {
            healthPercent: 100,
            attackPatterns: ['HEAVY_RAILGUN'],
            movePattern: 'APPROACH',
            attackIntervalMs: 5000,
          },
          {
            healthPercent: 75,
            attackPatterns: ['HEAVY_RAILGUN', 'MISSILE_BARRAGE'],
            movePattern: 'ORBIT',
            attackIntervalMs: 4000,
            specialAbility: BOSS_ABILITY.SHIELD_BURST,
          },
          {
            healthPercent: 50,
            attackPatterns: ['ALL_WEAPONS'],
            movePattern: 'STRAFE',
            attackIntervalMs: 3000,
            specialAbility: BOSS_ABILITY.SHIELD_BURST,
          },
          {
            healthPercent: 25,
            attackPatterns: ['BERSERKER_MODE'],
            movePattern: 'CHARGE',
            attackIntervalMs: 2000,
            specialAbility: BOSS_ABILITY.WARP_STRIKE,
          },
        ],
        lootTable: {
          credits: [15000, 25000],
          items: ['boss_fragment_dreadnought', 'heavy_armor_blueprint', 'shield_generator_mk3'],
          rareLoot: 'dreadnought_core',
        },
      },
      MOTHERSHIP: {
        name: 'Mothership-Class Titan',
        maxHealth: 20000,
        maxShield: 8000,
        armorType: ARMOR_TYPE.HEAVY,
        baseSpeed: 5,
        baseDamage: 150,
        scale: 25.0,
        color: 0xff00ff,
        phases: [
          {
            healthPercent: 100,
            attackPatterns: ['LASER_GRID', 'SUMMON_WAVE'],
            movePattern: 'ORBIT',
            attackIntervalMs: 6000,
            specialAbility: BOSS_ABILITY.SUMMON_FIGHTERS,
          },
          {
            healthPercent: 80,
            attackPatterns: ['LASER_GRID', 'MISSILE_BARRAGE', 'HEAVY_RAILGUN'],
            movePattern: 'ORBIT',
            attackIntervalMs: 5000,
            specialAbility: BOSS_ABILITY.SHIELD_BURST,
          },
          {
            healthPercent: 60,
            attackPatterns: ['ALL_WEAPONS', 'SUMMON_ELITE'],
            movePattern: 'STRAFE',
            attackIntervalMs: 4000,
            specialAbility: BOSS_ABILITY.REPAIR_DRONES,
          },
          {
            healthPercent: 40,
            attackPatterns: ['BERSERKER_MODE', 'MISSILE_BARRAGE'],
            movePattern: 'CHARGE',
            attackIntervalMs: 3000,
            specialAbility: BOSS_ABILITY.WARP_STRIKE,
          },
          {
            healthPercent: 20,
            attackPatterns: ['DESPERATION_MODE'],
            movePattern: 'CHARGE',
            attackIntervalMs: 1500,
            specialAbility: BOSS_ABILITY.LASER_SWEEP,
          },
        ],
        lootTable: {
          credits: [50000, 100000],
          items: ['boss_fragment_mothership', 'titan_core_blueprint', 'legendary_weapon_cache'],
          rareLoot: 'mothership_core',
          guaranteedRare: true,
        },
      },
    };
  }

  /**
   * Spawn a boss at a given position.
   * 
   * @param {string} bossType      One of BOSS_TYPES keys.
   * @param {object} position      {x, y, z} spawn location.
   * @param {number} [difficulty]  Difficulty multiplier (1.0 = base).
   * @returns {string}             Boss ID.
   */
  spawnBoss(bossType, position, difficulty = 1.0) {
    const template = this.BOSS_TYPES[bossType];
    if (!template) {
      throw new Error(`Unknown boss type: ${bossType}`);
    }

    const bossId = `boss_${this._nextBossId++}`;

    // Scale stats by difficulty
    const maxHealth = Math.floor(template.maxHealth * difficulty);
    const maxShield = Math.floor(template.maxShield * difficulty);
    const damage = Math.floor(template.baseDamage * difficulty);

    const boss = {
      id: bossId,
      type: bossType,
      name: template.name,
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      
      // Combat stats
      maxHealth,
      health: maxHealth,
      maxShield,
      shield: maxShield,
      armorType: template.armorType,
      damage,
      
      // Visual
      scale: template.scale,
      color: template.color,
      rotation: { x: 0, y: 0, z: 0 },
      
      // Phase progression
      phases: template.phases,
      currentPhase: 0,
      maxPhases: template.phases.length,
      
      // AI state
      state: BOSS_STATE.APPROACH,
      stateTimer: 0,
      attackTimer: 0,
      abilityTimer: 0,
      targetPosition: null,
      
      // Loot
      lootTable: template.lootTable,
      
      // Metadata
      spawnTime: Date.now(),
      difficulty,
      active: true,
    };

    this._bosses.set(bossId, boss);

    // Register with NPC system for combat integration
    this._npcSystem.createNPC({
      id: bossId,
      name: boss.name,
      position: boss.position,
      health: boss.health,
      maxHealth: boss.maxHealth,
      shield: boss.shield,
      maxShield: boss.maxShield,
      armorType: boss.armorType,
      hostile: true,
      boss: true,
    });

    // Emit spawn event
    if (this.events) {
      this.events.emit('boss:spawned', {
        bossId,
        type: bossType,
        name: boss.name,
        position: boss.position,
        difficulty,
      });
    }

    console.log(`[BossSystem] Spawned ${boss.name} (${bossId}) at difficulty ${difficulty.toFixed(1)}x`);
    return bossId;
  }

  /**
   * Get a boss entity by ID.
   * 
   * @param {string} bossId
   * @returns {object|null}
   */
  getBoss(bossId) {
    return this._bosses.get(bossId) || null;
  }

  /**
   * Get all active bosses.
   * 
   * @returns {object[]}
   */
  getActiveBosses() {
    return Array.from(this._bosses.values()).filter(b => b.active);
  }

  async init(engine) {
    this._engine = engine;
    console.log('[BossSystem] Initialised.');
  }

  async destroy() {}

  /**
   * Update boss AI and behaviors.
   * 
   * @param {number} deltaMs
   */
  tick(deltaMs) {
    for (const boss of this._bosses.values()) {
      if (!boss.active) continue;

      // Update timers
      boss.stateTimer += deltaMs;
      boss.attackTimer += deltaMs;
      boss.abilityTimer += deltaMs;

      // Check for phase transitions
      this._checkPhaseTransition(boss);

      // Update AI behavior
      this._updateBossAI(boss, deltaMs);

      // Update attack patterns
      this._updateAttacks(boss, deltaMs);

      // Sync with NPC system
      this._syncWithNPCSystem(boss);
    }
  }

  /**
   * Check if boss should transition to next phase.
   * 
   * @param {object} boss
   */
  _checkPhaseTransition(boss) {
    const healthPercent = (boss.health / boss.maxHealth) * 100;
    const currentPhaseData = boss.phases[boss.currentPhase];
    
    // Check if we should advance to next phase
    if (boss.currentPhase < boss.maxPhases - 1) {
      const nextPhaseData = boss.phases[boss.currentPhase + 1];
      if (healthPercent <= nextPhaseData.healthPercent) {
        boss.currentPhase++;
        boss.state = BOSS_STATE.PHASE_TRANSITION;
        boss.stateTimer = 0;
        boss.attackTimer = 0;

        // Emit phase change event
        if (this.events) {
          this.events.emit('boss:phase_change', {
            bossId: boss.id,
            phase: boss.currentPhase + 1,
            maxPhases: boss.maxPhases,
            healthPercent,
          });
        }

        console.log(`[BossSystem] ${boss.name} entered Phase ${boss.currentPhase + 1}/${boss.maxPhases}`);
      }
    }
  }

  /**
   * Update boss AI behavior based on current state and phase.
   * 
   * @param {object} boss
   * @param {number} deltaMs
   */
  _updateBossAI(boss, deltaMs) {
    const phaseData = boss.phases[boss.currentPhase];
    const speed = this.BOSS_TYPES[boss.type].baseSpeed;

    // Handle phase transition state
    if (boss.state === BOSS_STATE.PHASE_TRANSITION) {
      if (boss.stateTimer > 2000) { // 2 second transition
        boss.state = this._getStateFromMovePattern(phaseData.movePattern);
        boss.stateTimer = 0;
      }
      return; // Don't move during transition
    }

    // Get player position (assume at origin for now, should be injected)
    const playerPos = boss.targetPosition || { x: 0, y: 0, z: 0 };

    // Calculate direction to player
    const dx = playerPos.x - boss.position.x;
    const dy = playerPos.y - boss.position.y;
    const dz = playerPos.z - boss.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Normalize direction
    const dirX = distance > 0 ? dx / distance : 0;
    const dirY = distance > 0 ? dy / distance : 0;
    const dirZ = distance > 0 ? dz / distance : 0;

    // Execute behavior based on state
    switch (boss.state) {
      case BOSS_STATE.APPROACH:
        if (distance > 200) {
          boss.velocity.x = dirX * speed;
          boss.velocity.y = dirY * speed;
          boss.velocity.z = dirZ * speed;
        } else {
          boss.state = BOSS_STATE.ORBIT;
        }
        break;

      case BOSS_STATE.ORBIT:
        // Circle around player
        const orbitRadius = 150;
        const orbitSpeed = speed * 0.6;
        const angle = (boss.stateTimer * 0.0005) % (Math.PI * 2);
        
        boss.position.x = playerPos.x + Math.cos(angle) * orbitRadius;
        boss.position.z = playerPos.z + Math.sin(angle) * orbitRadius;
        boss.position.y = playerPos.y + Math.sin(angle * 0.5) * 30;
        break;

      case BOSS_STATE.STRAFE:
        // Strafe side to side while maintaining distance
        const strafeAngle = Math.sin(boss.stateTimer * 0.002) * Math.PI * 0.5;
        const strafeX = Math.cos(strafeAngle) * speed * 0.8;
        const strafeZ = Math.sin(strafeAngle) * speed * 0.8;
        
        boss.velocity.x = strafeX;
        boss.velocity.z = strafeZ;
        
        if (distance < 100 || distance > 250) {
          boss.velocity.x += dirX * speed * 0.5;
          boss.velocity.z += dirZ * speed * 0.5;
        }
        break;

      case BOSS_STATE.CHARGE:
        // Charge directly at player
        boss.velocity.x = dirX * speed * 1.5;
        boss.velocity.y = dirY * speed * 1.5;
        boss.velocity.z = dirZ * speed * 1.5;
        
        if (distance < 50 || boss.stateTimer > 5000) {
          boss.state = BOSS_STATE.RETREAT;
          boss.stateTimer = 0;
        }
        break;

      case BOSS_STATE.RETREAT:
        // Move away from player
        boss.velocity.x = -dirX * speed;
        boss.velocity.y = -dirY * speed;
        boss.velocity.z = -dirZ * speed;
        
        if (distance > 200 || boss.stateTimer > 3000) {
          boss.state = BOSS_STATE.ORBIT;
          boss.stateTimer = 0;
        }
        break;

      case BOSS_STATE.SPECIAL_ABILITY:
        // Stationary during ability
        boss.velocity.x = 0;
        boss.velocity.y = 0;
        boss.velocity.z = 0;
        
        if (boss.stateTimer > 3000) {
          boss.state = this._getStateFromMovePattern(phaseData.movePattern);
          boss.stateTimer = 0;
        }
        break;
    }

    // Apply velocity to position
    const deltaSeconds = deltaMs / 1000;
    boss.position.x += boss.velocity.x * deltaSeconds;
    boss.position.y += boss.velocity.y * deltaSeconds;
    boss.position.z += boss.velocity.z * deltaSeconds;

    // Update rotation to face movement direction
    if (boss.velocity.x !== 0 || boss.velocity.z !== 0) {
      boss.rotation.y = Math.atan2(boss.velocity.x, boss.velocity.z);
    }
  }

  /**
   * Convert movement pattern string to boss state.
   * 
   * @param {string} pattern
   * @returns {string}
   */
  _getStateFromMovePattern(pattern) {
    const stateMap = {
      'APPROACH': BOSS_STATE.APPROACH,
      'ORBIT': BOSS_STATE.ORBIT,
      'STRAFE': BOSS_STATE.STRAFE,
      'CHARGE': BOSS_STATE.CHARGE,
      'RETREAT': BOSS_STATE.RETREAT,
    };
    return stateMap[pattern] || BOSS_STATE.ORBIT;
  }

  /**
   * Update boss attacks based on attack patterns.
   * 
   * @param {object} boss
   * @param {number} deltaMs
   */
  _updateAttacks(boss, deltaMs) {
    const phaseData = boss.phases[boss.currentPhase];
    
    // Check attack interval
    if (boss.attackTimer >= phaseData.attackIntervalMs) {
      boss.attackTimer = 0;
      
      // Select random attack pattern
      const patterns = phaseData.attackPatterns;
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      
      this._executeAttackPattern(boss, pattern);
    }

    // Check special ability
    if (phaseData.specialAbility && boss.abilityTimer >= 15000) { // Every 15 seconds
      boss.abilityTimer = 0;
      this._executeSpecialAbility(boss, phaseData.specialAbility);
    }
  }

  /**
   * Execute a boss attack pattern.
   * 
   * @param {object} boss
   * @param {string} pattern
   */
  _executeAttackPattern(boss, pattern) {
    // Emit attack event for integration with projectile system
    if (this.events) {
      this.events.emit('boss:attack', {
        bossId: boss.id,
        pattern,
        position: boss.position,
        rotation: boss.rotation,
        damage: boss.damage,
      });
    }

    console.log(`[BossSystem] ${boss.name} executed ${pattern}`);
  }

  /**
   * Execute a boss special ability.
   * 
   * @param {object} boss
   * @param {string} ability
   */
  _executeSpecialAbility(boss, ability) {
    boss.state = BOSS_STATE.SPECIAL_ABILITY;
    boss.stateTimer = 0;

    // Handle different abilities
    switch (ability) {
      case BOSS_ABILITY.SUMMON_FIGHTERS:
        // Spawn fighter wave around boss
        if (this._enemySpawnSystem) {
          for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3;
            const spawnPos = {
              x: boss.position.x + Math.cos(angle) * 50,
              y: boss.position.y,
              z: boss.position.z + Math.sin(angle) * 50,
            };
            // Spawn enemy near boss
            // Note: Would need to integrate with EnemySpawnSystem properly
          }
        }
        break;

      case BOSS_ABILITY.SHIELD_BURST:
        // Restore shield
        boss.shield = Math.min(boss.maxShield, boss.shield + boss.maxShield * 0.3);
        break;

      case BOSS_ABILITY.REPAIR_DRONES:
        // Repair health
        boss.health = Math.min(boss.maxHealth, boss.health + boss.maxHealth * 0.1);
        break;

      case BOSS_ABILITY.WARP_STRIKE:
      case BOSS_ABILITY.LASER_SWEEP:
      case BOSS_ABILITY.MISSILE_BARRAGE:
        // These would trigger visual effects and damage events
        break;
    }

    if (this.events) {
      this.events.emit('boss:ability', {
        bossId: boss.id,
        ability,
        position: boss.position,
      });
    }

    console.log(`[BossSystem] ${boss.name} used ${ability}`);
  }

  /**
   * Sync boss data with NPC system.
   * 
   * @param {object} boss
   */
  _syncWithNPCSystem(boss) {
    const npc = this._npcSystem.getNPC(boss.id);
    if (npc) {
      npc.position = boss.position;
      npc.health = boss.health;
      npc.shield = boss.shield;
      
      // Check if boss died
      if (npc.health <= 0 && boss.active) {
        this._killBoss(boss);
      }
    }
  }

  /**
   * Handle boss death, drop loot, and cleanup.
   * 
   * @param {object} boss
   */
  _killBoss(boss) {
    boss.active = false;
    boss.state = BOSS_STATE.DEATH;

    // Drop loot
    const loot = this._generateLoot(boss);

    // Emit death event
    if (this.events) {
      this.events.emit('boss:killed', {
        bossId: boss.id,
        type: boss.type,
        name: boss.name,
        position: boss.position,
        loot,
        survivalTime: Date.now() - boss.spawnTime,
      });
    }

    console.log(`[BossSystem] ${boss.name} defeated! Dropped ${loot.length} items.`);
  }

  /**
   * Generate loot from boss loot table.
   * 
   * @param {object} boss
   * @returns {object[]}
   */
  _generateLoot(boss) {
    const lootTable = boss.lootTable;
    const loot = [];

    // Credits
    if (lootTable.credits) {
      const [min, max] = lootTable.credits;
      const credits = Math.floor(min + Math.random() * (max - min));
      loot.push({ type: 'credits', amount: credits });
    }

    // Common items
    if (lootTable.items) {
      for (const item of lootTable.items) {
        if (Math.random() < 0.8) { // 80% drop rate
          loot.push({ type: 'item', itemId: item, quantity: 1 });
        }
      }
    }

    // Rare loot
    if (lootTable.rareLoot) {
      const dropRate = lootTable.guaranteedRare ? 1.0 : 0.3;
      if (Math.random() < dropRate) {
        loot.push({ type: 'rare_item', itemId: lootTable.rareLoot, quantity: 1 });
      }
    }

    return loot;
  }

  /**
   * Damage a boss (called by combat system).
   * 
   * @param {string} bossId
   * @param {number} damage
   * @param {string} damageType
   */
  damageBoss(bossId, damage, damageType) {
    const boss = this._bosses.get(bossId);
    if (!boss || !boss.active) return;

    // Apply damage to shield first, then health
    if (boss.shield > 0) {
      boss.shield -= damage;
      if (boss.shield < 0) {
        boss.health += boss.shield; // Overflow to health
        boss.shield = 0;
      }
    } else {
      boss.health -= damage;
    }

    // Clamp health
    boss.health = Math.max(0, boss.health);

    // Emit damage event
    if (this.events) {
      this.events.emit('boss:damaged', {
        bossId: boss.id,
        damage,
        damageType,
        health: boss.health,
        shield: boss.shield,
        healthPercent: (boss.health / boss.maxHealth) * 100,
      });
    }
  }

  /**
   * Set player position for boss targeting.
   * 
   * @param {object} position  {x, y, z}
   */
  setPlayerPosition(position) {
    for (const boss of this._bosses.values()) {
      boss.targetPosition = { ...position };
    }
  }

  /**
   * Remove all bosses.
   */
  clearBosses() {
    for (const boss of this._bosses.values()) {
      this._npcSystem.removeNPC(boss.id);
    }
    this._bosses.clear();
  }
}

export { BOSS_STATE, BOSS_ABILITY };
