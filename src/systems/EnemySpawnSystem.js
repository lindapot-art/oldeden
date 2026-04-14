/**
 * EnemySpawnSystem — procedurally spawns hostile NPCs in space combat zones.
 *
 * Creates enemies near the player with varying difficulty, loadouts, and behaviors.
 * Manages enemy waves, difficulty scaling, and spatial distribution.
 *
 * Enemy Types:
 *   - Scout     — fast, light armor, low damage
 *   - Fighter   — balanced stats, medium threat
 *   - Bomber    — slow, heavy armor, high damage
 *   - Interceptor — very fast, medium armor, tracking weapons
 *
 * Usage:
 *   const spawner = new EnemySpawnSystem(npcSystem, combatSystem);
 *   engine.registerSystem('enemies', spawner);
 *   
 *   // Spawn wave near player
 *   spawner.spawnWave(playerPosition, difficulty: 2, count: 5);
 */

import { WEAPON_TYPE, ARMOR_TYPE } from './CombatSystem.js';

export class EnemySpawnSystem {
  /**
   * @param {object} npcSystem     Reference to NPCSystem.
   * @param {object} combatSystem  Reference to CombatSystem.
   * @param {object} [options]
   * @param {number} [options.spawnRadius=150]       Distance from player to spawn.
   * @param {number} [options.maxActiveEnemies=20]   Max enemies at once.
   * @param {number} [options.waveIntervalMs=30000]  Time between auto-waves.
   * @param {object} [options.bossSystem]            Optional BossSystem for boss spawning.
   * @param {number} [options.bossWaveInterval=5]    Spawn boss every N waves.
   */
  constructor(npcSystem, combatSystem, options = {}) {
    this._npcSystem = npcSystem;
    this._combatSystem = combatSystem;
    
    this._spawnRadius = options.spawnRadius ?? 150;
    this._maxActiveEnemies = options.maxActiveEnemies ?? 20;
    this._waveIntervalMs = options.waveIntervalMs ?? 30000;
    this._bossSystem = options.bossSystem || null;
    this._bossWaveInterval = options.bossWaveInterval ?? 5;

    /** Active enemies: Map<enemyId, enemyData> */
    this._enemies = new Map();

    /** Player position reference (updated externally) */
    this._playerPosition = { x: 0, y: 0, z: 0 };

    /** Wave spawning state */
    this._lastWaveTime = 0;
    this._currentDifficulty = 1;
    this._waveCount = 0;

    /** Event emitter (set by GameEngine) */
    this.events = null;

    /** Pending timers to clear on destroy */
    this._pendingTimers = [];

    /** Enemy type templates */
    this.ENEMY_TYPES = {
      SCOUT: {
        name: 'Scout',
        health: 50,
        shield: 30,
        armorType: ARMOR_TYPE.LIGHT,
        weaponType: WEAPON_TYPE.LASER,
        damage: 15,
        speed: 35,
        evasion: 25,
        accuracy: 70,
        scale: 0.6,
        color: 0x88aa44,
      },
      FIGHTER: {
        name: 'Fighter',
        health: 100,
        shield: 60,
        armorType: ARMOR_TYPE.MEDIUM,
        weaponType: WEAPON_TYPE.BALLISTIC,
        damage: 25,
        speed: 25,
        evasion: 15,
        accuracy: 75,
        scale: 1.0,
        color: 0xaa4444,
      },
      BOMBER: {
        name: 'Bomber',
        health: 180,
        shield: 40,
        armorType: ARMOR_TYPE.HEAVY,
        weaponType: WEAPON_TYPE.MISSILE,
        damage: 40,
        speed: 15,
        evasion: 5,
        accuracy: 80,
        scale: 1.4,
        color: 0x446688,
      },
      INTERCEPTOR: {
        name: 'Interceptor',
        health: 70,
        shield: 50,
        armorType: ARMOR_TYPE.LIGHT,
        weaponType: WEAPON_TYPE.PLASMA,
        damage: 20,
        speed: 45,
        evasion: 30,
        accuracy: 85,
        scale: 0.8,
        color: 0xaa66ff,
      },
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Initialize the system. Called by GameEngine.
   * @param {object} engine
   */
  init(engine) {
    this.events = engine.events;
    this._lastWaveTime = Date.now();
    this._destroyed = false;
    console.log('[EnemySpawnSystem] Initialized.');
  }

  async destroy() {
    this._destroyed = true;
    for (const timer of this._pendingTimers) clearTimeout(timer);
    this._pendingTimers.length = 0;
    this._enemies.clear();
  }

  /**
   * Per-frame tick. Auto-spawn waves, update enemy AI.
   * @param {number} deltaMs
   */
  tick(deltaMs) {
    // Auto-spawn waves if below max enemies
    const now = Date.now();
    if (now - this._lastWaveTime >= this._waveIntervalMs) {
      if (this._enemies.size < this._maxActiveEnemies) {
        this._autoSpawnWave();
      }
      this._lastWaveTime = now;
    }

    // Update enemy AI (simple approach/attack)
    for (const [id, enemy] of this._enemies) {
      this._updateEnemyAI(enemy, deltaMs);
    }

    // Clean up dead enemies
    for (const [id, enemy] of this._enemies) {
      if (enemy.health <= 0) {
        this._removeEnemy(id);
      }
    }
  }

  /**
   * Manually spawn a wave of enemies.
   * @param {object} centerPosition  { x, y, z } spawn center.
   * @param {number} difficulty      Wave difficulty (1-10).
   * @param {number} count           Number of enemies to spawn.
   */
  spawnWave(centerPosition, difficulty, count) {
    this._playerPosition = centerPosition;
    this._currentDifficulty = difficulty;

    const enemies = [];
    for (let i = 0; i < count; i++) {
      const enemyType = this._selectEnemyType(difficulty);
      const enemy = this._spawnEnemy(enemyType, centerPosition);
      enemies.push(enemy);
    }

    this._waveCount++;
    this._emitEvent('enemy:wave_spawned', {
      waveNumber: this._waveCount,
      difficulty,
      count,
      enemies: enemies.map(e => e.id),
    });

    return enemies;
  }

  /**
   * Update player position (for spawn location and enemy AI).
   * @param {object} position  { x, y, z }
   */
  setPlayerPosition(position) {
    this._playerPosition = position;
  }

  /**
   * Get all active enemies.
   * @returns {Array<object>}
   */
  getActiveEnemies() {
    return Array.from(this._enemies.values());
  }

  /**
   * Get enemy by ID.
   * @param {string} id
   * @returns {object|null}
   */
  getEnemy(id) {
    return this._enemies.get(id) || null;
  }

  /**
   * Damage an enemy.
   * @param {string} enemyId
   * @param {number} damage
   * @returns {boolean} True if enemy is killed.
   */
  damageEnemy(enemyId, damage) {
    const enemy = this._enemies.get(enemyId);
    if (!enemy) return false;

    // Apply to shield first
    if (enemy.shield > 0) {
      const shieldDamage = Math.min(enemy.shield, damage);
      enemy.shield -= shieldDamage;
      damage -= shieldDamage;
    }

    // Apply remaining to health
    enemy.health -= damage;

    if (enemy.health <= 0) {
      this._killEnemy(enemyId);
      return true;
    }

    return false;
  }

  /**
   * Remove all enemies (e.g., on scene reset).
   */
  clearAll() {
    this._enemies.clear();
    this._waveCount = 0;
    this._emitEvent('enemy:cleared', {});
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Auto-spawn a wave based on current difficulty.
   */
  _autoSpawnWave() {
    // Check if it's time for a boss wave
    if (this._bossSystem && this._waveCount > 0 && this._waveCount % this._bossWaveInterval === 0) {
      this._spawnBossWave();
      return;
    }

    const count = Math.min(5, this._maxActiveEnemies - this._enemies.size);
    if (count > 0) {
      this.spawnWave(this._playerPosition, this._currentDifficulty, count);
      // Increase difficulty over time
      this._currentDifficulty = Math.min(10, this._currentDifficulty + 0.1);
    }
  }

  /**
   * Spawn a boss wave with warning and clear area.
   */
  _spawnBossWave() {
    // Determine boss type based on difficulty
    const bossType = this._selectBossType(this._currentDifficulty);
    
    // Calculate boss spawn position (in front of player)
    const spawnDistance = 300;
    const spawnPos = {
      x: this._playerPosition.x,
      y: this._playerPosition.y,
      z: this._playerPosition.z + spawnDistance,
    };

    // Emit warning event
    if (this.events) {
      this.events.emit('boss:warning', {
        bossType,
        spawnPosition: spawnPos,
        difficulty: this._currentDifficulty,
        warningTimeMs: 5000,
      });
    }

    console.log(`[EnemySpawnSystem] WARNING: ${bossType} boss incoming! Prepare for battle!`);

    // Delay boss spawn for dramatic effect
    const timer = setTimeout(() => {
      if (this._destroyed || !this._bossSystem) return;
      const bossId = this._bossSystem.spawnBoss(bossType, spawnPos, this._currentDifficulty);
      
      // Emit boss spawned event
      if (this.events) {
        this.events.emit('boss:wave_spawned', {
          bossId,
          bossType,
          wave: this._waveCount,
          difficulty: this._currentDifficulty,
        });
      }
    }, 5000);
    this._pendingTimers.push(timer);

    // Increase difficulty significantly after boss wave
    this._currentDifficulty = Math.min(10, this._currentDifficulty + 0.5);
  }

  /**
   * Select boss type based on difficulty.
   * @param {number} difficulty
   * @returns {string} Boss type key.
   */
  _selectBossType(difficulty) {
    if (difficulty < 3) {
      return 'DESTROYER'; // Early game boss
    } else if (difficulty < 6) {
      return Math.random() < 0.6 ? 'DESTROYER' : 'CARRIER'; // Mid game
    } else if (difficulty < 8) {
      const roll = Math.random();
      if (roll < 0.3) return 'DESTROYER';
      if (roll < 0.6) return 'CARRIER';
      return 'DREADNOUGHT'; // Late game
    } else {
      // Endgame: any boss type, including mothership
      const roll = Math.random();
      if (roll < 0.2) return 'DESTROYER';
      if (roll < 0.4) return 'CARRIER';
      if (roll < 0.7) return 'DREADNOUGHT';
      return 'MOTHERSHIP'; // Ultimate boss
    }
  }

  /**
   * Select an enemy type based on difficulty.
   * @param {number} difficulty
   * @returns {string} Enemy type key.
   */
  _selectEnemyType(difficulty) {
    const roll = Math.random();
    
    if (difficulty < 3) {
      // Early game: mostly scouts, some fighters
      return roll < 0.7 ? 'SCOUT' : 'FIGHTER';
    } else if (difficulty < 6) {
      // Mid game: fighters, interceptors, some bombers
      if (roll < 0.4) return 'FIGHTER';
      if (roll < 0.7) return 'INTERCEPTOR';
      if (roll < 0.9) return 'SCOUT';
      return 'BOMBER';
    } else {
      // Late game: all types, more bombers/interceptors
      if (roll < 0.3) return 'BOMBER';
      if (roll < 0.6) return 'INTERCEPTOR';
      if (roll < 0.85) return 'FIGHTER';
      return 'SCOUT';
    }
  }

  /**
   * Spawn a single enemy.
   * @param {string} typeKey
   * @param {object} centerPosition
   * @returns {object} Enemy data.
   */
  _spawnEnemy(typeKey, centerPosition) {
    const template = this.ENEMY_TYPES[typeKey];
    if (!template) {
      throw new Error(`Unknown enemy type: ${typeKey}`);
    }

    // Random position in sphere around center
    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
    const distance = this._spawnRadius + (Math.random() - 0.5) * 50;

    const position = {
      x: centerPosition.x + Math.cos(angle) * Math.cos(elevation) * distance,
      y: centerPosition.y + Math.sin(elevation) * distance,
      z: centerPosition.z + Math.sin(angle) * Math.cos(elevation) * distance,
    };

    const id = `enemy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const enemy = {
      id,
      type: typeKey,
      name: template.name,
      position,
      velocity: { x: 0, y: 0, z: 0 },
      health: template.health,
      maxHealth: template.health,
      shield: template.shield,
      maxShield: template.shield,
      armorType: template.armorType,
      weaponType: template.weaponType,
      damage: template.damage,
      speed: template.speed,
      evasion: template.evasion,
      accuracy: template.accuracy,
      scale: template.scale,
      color: template.color,
      targetId: 'player',  // Always target player for now
      lastFireTime: 0,
      fireRateMs: 2000 + Math.random() * 1000,  // 2-3 seconds
      spawnedAt: Date.now(),
    };

    this._enemies.set(id, enemy);

    // Register shield with combat system
    if (this._combatSystem && enemy.maxShield > 0) {
      this._combatSystem.registerShield(id, {
        maxCapacity: enemy.maxShield,
        regenRate: enemy.maxShield * 0.05,  // 5% per second
        rechargeDelayMs: 3000,
      });
    }

    this._emitEvent('enemy:spawned', {
      enemyId: id,
      type: typeKey,
      position,
    });

    return enemy;
  }

  /**
   * Simple AI: approach player and fire periodically.
   * @param {object} enemy
   * @param {number} deltaMs
   */
  _updateEnemyAI(enemy, deltaMs) {
    const deltaSec = deltaMs / 1000;

    // Calculate direction to player
    const dx = this._playerPosition.x - enemy.position.x;
    const dy = this._playerPosition.y - enemy.position.y;
    const dz = this._playerPosition.z - enemy.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 0.1) {
      // Normalize direction
      const dirX = dx / dist;
      const dirY = dy / dist;
      const dirZ = dz / dist;

      // Move toward player (simple approach)
      const approachDist = dist > 80 ? dist - 80 : 0;  // Keep 80m distance
      const moveSpeed = enemy.speed * (approachDist / 100);  // Slow down when close

      enemy.velocity.x = dirX * moveSpeed;
      enemy.velocity.y = dirY * moveSpeed;
      enemy.velocity.z = dirZ * moveSpeed;

      enemy.position.x += enemy.velocity.x * deltaSec;
      enemy.position.y += enemy.velocity.y * deltaSec;
      enemy.position.z += enemy.velocity.z * deltaSec;
    }

    // Fire at player periodically (DISABLED: enemies never attack)
    // const now = Date.now();
    // if (now - enemy.lastFireTime >= enemy.fireRateMs && dist < 200) {
    //   enemy.lastFireTime = now;
    //   this._emitEvent('enemy:fired', {
    //     enemyId: enemy.id,
    //     targetId: enemy.targetId,
    //     weaponType: enemy.weaponType,
    //     damage: enemy.damage,
    //     position: { ...enemy.position },
    //   });
    // }
  }

  /**
   * Kill an enemy.
   * @param {string} enemyId
   */
  _killEnemy(enemyId) {
    const enemy = this._enemies.get(enemyId);
    if (!enemy) return;

    this._emitEvent('enemy:killed', {
      enemyId,
      type: enemy.type,
      position: { ...enemy.position },
    });

    this._removeEnemy(enemyId);
  }

  /**
   * Remove an enemy from the system.
   * @param {string} enemyId
   */
  _removeEnemy(enemyId) {
    this._enemies.delete(enemyId);
    
    // Unregister shield and DoTs from combat system to prevent memory leaks
    if (this._combatSystem) {
      this._combatSystem.removeShield(enemyId);
      this._combatSystem.cleanseDots(enemyId);
    }
  }

  /**
   * Emit an event via the engine event bus.
   * @param {string} eventName
   * @param {object} data
   */
  _emitEvent(eventName, data) {
    if (this.events) {
      this.events.emit(eventName, data);
    }
  }
}
