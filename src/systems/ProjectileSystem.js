/**
 * ProjectileSystem — manages active projectiles/shots in 3D space.
 *
 * Tracks fired projectiles (railgun nails, lasers, missiles) from launch to impact.
 * Each frame:
 *   - Advances projectile positions along velocity vectors
 *   - Checks for collisions with targets (NPCs, ships, obstacles)
 *   - Removes expired projectiles (hit target, out of range, or timed out)
 *   - Emits combat events on successful hits
 *
 * Projectile types:
 *   - RAILGUN: high-velocity giant nail, long trail, penetrates armor
 *   - LASER: instant beam (represented as very fast projectile)
 *   - BALLISTIC: slower bullets with gravity drop
 *   - MISSILE: tracking projectiles that curve toward targets
 *
 * Usage:
 *   const projSys = new ProjectileSystem(combatSystem);
 *   engine.registerSystem('projectiles', projSys);
 *   projSys.fireProjectile({
 *     type: 'railgun',
 *     origin: new THREE.Vector3(0, 0, 0),
 *     direction: new THREE.Vector3(0, 0, -1),
 *     speed: 500,
 *     damage: 75,
 *     shooterId: 'player',
 *     weaponType: CombatSystem.WEAPON_TYPE.BALLISTIC
 *   });
 */

export class ProjectileSystem {
  /**
   * @param {object} combatSystem  Reference to CombatSystem for damage resolution.
   * @param {object} [options]
   * @param {number} [options.maxRange=5000]        Max projectile travel distance.
   * @param {number} [options.maxLifetimeMs=10000]  Max projectile lifetime.
   */
  constructor(combatSystem, options = {}) {
    this._combatSystem = combatSystem;
    this._maxRange = options.maxRange ?? 5000;
    this._maxLifetimeMs = options.maxLifetimeMs ?? 10000;

    /** Active projectiles: Map<projId, projectile> */
    this._projectiles = new Map();
    
    /** Next unique projectile ID */
    this._nextId = 1;

    /** Registered targets: Map<entityId, { position: Vector3, radius: number, ... }> */
    this._targets = new Map();

    /** Event emitter (set by GameEngine on registration) */
    this.events = null;

    /** Projectile type configs */
    this.PROJECTILE_TYPES = {
      RAILGUN: {
        trailLength: 8.0,
        trailColor: 0x44aaff,
        glowIntensity: 1.5,
        hitRadius: 0.15,
        speed: 500,
      },
      LASER: {
        trailLength: 2.0,
        trailColor: 0xff4444,
        glowIntensity: 2.0,
        hitRadius: 0.1,
        speed: 1000,
      },
      BALLISTIC: {
        trailLength: 0.5,
        trailColor: 0xffaa44,
        glowIntensity: 0.8,
        hitRadius: 0.12,
        speed: 200,
        gravity: -5.0,  // m/s²
      },
      MISSILE: {
        trailLength: 3.0,
        trailColor: 0xffff00,
        glowIntensity: 1.2,
        hitRadius: 0.3,
        speed: 150,
        tracking: true,
        turnRate: 2.0,  // radians/sec
      },
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Initialize the system. Called once by GameEngine.
   * @param {object} engine  The game engine instance.
   */
  init(engine) {
    this.events = engine.events;
    console.log('[ProjectileSystem] Initialized.');
  }

  /**
   * Per-frame tick. Advance projectiles, check collisions, remove expired.
   * @param {number} deltaMs  Milliseconds since last tick.
   */
  tick(deltaMs) {
    const deltaSec = deltaMs / 1000;

    for (const [id, proj] of this._projectiles) {
      // ── Update projectile position ────────────────────────────────────
      const config = this.PROJECTILE_TYPES[proj.type] || {};

      // Apply gravity if ballistic
      if (config.gravity) {
        proj.velocity.y += config.gravity * deltaSec;
      }

      // Apply tracking if missile
      if (config.tracking && proj.targetId) {
        const target = this._targets.get(proj.targetId);
        if (target) {
          this._applyTracking(proj, target, deltaSec, config.turnRate);
        }
      }

      // Advance position (zero-allocation — no .clone())
      const dx = proj.velocity.x * deltaSec;
      const dy = proj.velocity.y * deltaSec;
      const dz = proj.velocity.z * deltaSec;
      proj.position.x += dx;
      proj.position.y += dy;
      proj.position.z += dz;
      proj.traveledDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Update lifetime
      proj.age += deltaMs;

      // ── Check for expiry ──────────────────────────────────────────────
      if (proj.age > this._maxLifetimeMs || proj.traveledDistance > this._maxRange) {
        this._projectiles.delete(id);
        this._emitEvent('projectile:expired', { projectileId: id, ...proj });
        continue;
      }

      // ── Check for collisions with targets ─────────────────────────────
      const hit = this._checkCollisions(proj, config.hitRadius ?? 0.15);
      if (hit) {
        // Resolve combat damage
        if (this._combatSystem && hit.entityId !== proj.shooterId) {
          const result = this._combatSystem.resolveAttack({
            attackerId: proj.shooterId,
            defenderId: hit.entityId,
            baseDamage: proj.damage,
            weaponType: proj.weaponType,
            armorType: hit.armorType || 'none',
            accuracy: 100,  // Projectile already hit geometrically
            evasion: 0,
          });

          this._emitEvent('projectile:hit', {
            projectileId: id,
            targetId: hit.entityId,
            position: proj.position.clone(),
            damage: result.damage,
            critical: result.critical,
            ...proj,
          });
        }

        // Remove projectile
        this._projectiles.delete(id);
      }
    }
  }

  /**
   * Fire a new projectile into the world.
   * @param {object} params
   * @param {string} params.type           Projectile type (RAILGUN, LASER, etc.).
   * @param {THREE.Vector3} params.origin  World-space starting position.
   * @param {THREE.Vector3} params.direction  Normalized direction vector.
   * @param {number} params.damage         Base damage value.
   * @param {string} params.shooterId      Entity ID of the shooter.
   * @param {string} params.weaponType     CombatSystem weapon type.
   * @param {number} [params.speed]        Override default speed (m/s).
   * @param {string} [params.targetId]     Optional target for tracking missiles.
   * @returns {number} The unique projectile ID.
   */
  fireProjectile(params) {
    const {
      type,
      origin,
      direction,
      damage,
      shooterId,
      weaponType,
      speed,
      targetId,
    } = params;

    const config = this.PROJECTILE_TYPES[type] || this.PROJECTILE_TYPES.RAILGUN;
    const finalSpeed = speed ?? config.speed;

    const id = this._nextId++;
    const velocity = direction.clone().normalize().multiplyScalar(finalSpeed);

    const projectile = {
      id,
      type,
      position: origin.clone(),
      velocity,
      damage,
      shooterId,
      weaponType,
      targetId: targetId || null,
      age: 0,
      traveledDistance: 0,
      spawnedAt: Date.now(),
    };

    this._projectiles.set(id, projectile);

    this._emitEvent('projectile:fired', {
      projectileId: id,
      type,
      shooterId,
      origin: origin.clone(),
      direction: direction.clone(),
    });

    return id;
  }

  /**
   * Register a target entity for collision detection.
   * @param {string} entityId
   * @param {object} targetData
   * @param {THREE.Vector3} targetData.position  World position.
   * @param {number} [targetData.radius=1.0]      Collision sphere radius.
   * @param {string} [targetData.armorType='none'] Armor type for combat.
   */
  registerTarget(entityId, targetData) {
    this._targets.set(entityId, {
      position: targetData.position,
      radius: targetData.radius ?? 1.0,
      armorType: targetData.armorType ?? 'none',
    });
  }

  /**
   * Update a target's position (call each frame for moving targets).
   * @param {string} entityId
   * @param {THREE.Vector3} newPosition
   */
  updateTargetPosition(entityId, newPosition) {
    const target = this._targets.get(entityId);
    if (target) {
      target.position = newPosition;
    }
  }

  /**
   * Unregister a target entity.
   * @param {string} entityId
   */
  unregisterTarget(entityId) {
    this._targets.delete(entityId);
  }

  /**
   * Get all active projectiles (for rendering).
   * @returns {Array<object>} Array of projectile data.
   */
  getActiveProjectiles() {
    return Array.from(this._projectiles.values());
  }

  /**
   * Get projectile type configuration.
   * @param {string} type
   * @returns {object|null}
   */
  getProjectileConfig(type) {
    return this.PROJECTILE_TYPES[type] || null;
  }

  /**
   * Clear all projectiles (e.g., on scene reset).
   */
  clearAll() {
    this._projectiles.clear();
    this._emitEvent('projectile:cleared', {});
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Check if projectile collides with any registered target.
   * @param {object} proj
   * @param {number} hitRadius
   * @returns {object|null} Hit target data or null.
   */
  _checkCollisions(proj, hitRadius) {
    for (const [entityId, target] of this._targets) {
      const dist = proj.position.distanceTo(target.position);
      if (dist <= target.radius + hitRadius) {
        return { entityId, ...target };
      }
    }
    return null;
  }

  /**
   * Apply tracking (homing) to missile projectile.
   * @param {object} proj
   * @param {object} target
   * @param {number} deltaSec
   * @param {number} turnRate  Radians per second.
   */
  _applyTracking(proj, target, deltaSec, turnRate) {
    const toTarget = target.position.clone().sub(proj.position).normalize();
    const currentDir = proj.velocity.clone().normalize();
    
    // Slerp toward target direction
    const maxTurn = turnRate * deltaSec;
    const angle = currentDir.angleTo(toTarget);
    
    if (angle > 0.001) {
      const t = Math.min(maxTurn / angle, 1.0);
      currentDir.lerp(toTarget, t).normalize();
      proj.velocity.copy(currentDir.multiplyScalar(proj.velocity.length()));
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
