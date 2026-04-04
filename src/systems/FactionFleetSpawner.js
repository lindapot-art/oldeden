/**
 * FactionFleetSpawner — spawns faction-specific NPC fleets with GLB models.
 *
 * Creates NPC ships representing different factions (Garrisons, Terran Dominion, etc.)
 * with faction-specific 3D models, behaviors, and diplomacy.
 *
 * Features:
 *   - Faction-based fleet composition
 *   - GLB model integration
 *   - Diplomacy-aware (allies don't attack player)
 *   - Station/capital ship spawning
 *   - AI behavior patterns
 *
 * Usage:
 *   const fleetSpawner = new FactionFleetSpawner(THREE, scene, factionSystem, modelLoader);
 *   await fleetSpawner.spawnGarrisonsFleet(position);
 */

export class FactionFleetSpawner {
  /**
   * @param {object} THREE           Three.js namespace.
   * @param {THREE.Scene} scene      The 3D scene.
   * @param {object} factionSystem   FactionSystem instance.
   * @param {object} modelLoader     ModelLoader instance.
   * @param {object} [options]
   */
  constructor(THREE, scene, factionSystem, modelLoader, options = {}) {
    this._THREE = THREE;
    this._scene = scene;
    this._factionSystem = factionSystem;
    this._modelLoader = modelLoader;

    /** Active faction ships: Map<shipId, shipData> */
    this._ships = new Map();

    /** Active stations: Map<stationId, stationData> */
    this._stations = new Map();

    /** Garrisons fleet composition */
    this._garrisonsFleet = {
      fighters: ['ship_sentinel', 'ship_sentinel_variant'],
      cruisers: ['ship_titan', 'ship_titan_variant'],
      freighters: ['ship_freighter'],
      station: 'garrisons_habitat',
    };
  }

  /**
   * Spawn the Garrisons nation fleet.
   * Creates a space station with defending ships.
   * @param {object} centerPosition  { x, y, z }
   * @returns {Promise<object>} Fleet data with station and ships.
   */
  async spawnGarrisonsFleet(centerPosition) {
    const fleet = {
      faction: 'garrisons',
      station: null,
      ships: [],
    };

    // Spawn Garrisons space station
    fleet.station = await this._spawnStation(
      'garrisons_habitat',
      centerPosition,
      'garrisons'
    );

    // Spawn defending fighters (4 Sentinels)
    const fighterPositions = this._getOrbitPositions(centerPosition, 50, 4);
    for (const pos of fighterPositions) {
      const ship = await this._spawnShip(
        'ship_sentinel',
        pos,
        'garrisons',
        'FIGHTER'
      );
      fleet.ships.push(ship);
    }

    // Spawn cruisers (2 Titans)
    const cruiserPositions = this._getOrbitPositions(centerPosition, 80, 2, Math.PI / 4);
    for (const pos of cruiserPositions) {
      const ship = await this._spawnShip(
        'ship_titan',
        pos,
        'garrisons',
        'BOMBER'
      );
      fleet.ships.push(ship);
    }

    // Spawn a freighter
    const freighterPos = {
      x: centerPosition.x + 60,
      y: centerPosition.y,
      z: centerPosition.z,
    };
    const freighter = await this._spawnShip(
      'ship_freighter',
      freighterPos,
      'garrisons',
      'SCOUT'
    );
    fleet.ships.push(freighter);

    console.log(`[FactionFleetSpawner] Spawned Garrisons fleet: 1 station, ${fleet.ships.length} ships`);
    return fleet;
  }

  /**
   * Spawn a faction station.
   * @param {string} modelName       Model name from ModelLoader.
   * @param {object} position        { x, y, z }
   * @param {string} faction         Faction ID.
   * @returns {Promise<object>}      Station data.
   */
  async _spawnStation(modelName, position, faction) {
    const id = `station-${faction}-${Date.now()}`;

    // Load model
    const model = await this._modelLoader.load(modelName, {
      faction: faction,
      scale: 3.0, // Stations are larger
    });

    model.position.set(position.x, position.y, position.z);
    this._scene.add(model);

    const station = {
      id,
      modelName,
      faction,
      position,
      model,
      health: 5000,
      maxHealth: 5000,
      shield: 2000,
      maxShield: 2000,
      isStation: true,
      spawned: Date.now(),
    };

    this._stations.set(id, station);
    return station;
  }

  /**
   * Spawn a faction ship.
   * @param {string} modelName       Model name from ModelLoader.
   * @param {object} position        { x, y, z }
   * @param {string} faction         Faction ID.
   * @param {string} shipClass       Ship class (FIGHTER, BOMBER, etc.).
   * @returns {Promise<object>}      Ship data.
   */
  async _spawnShip(modelName, position, faction, shipClass) {
    const id = `ship-${faction}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    // Load model
    const model = await this._modelLoader.load(modelName, {
      faction: faction,
      scale: 1.0,
    });

    model.position.set(position.x, position.y, position.z);
    this._scene.add(model);

    // Ship stats based on class
    const stats = this._getShipStats(shipClass);

    const ship = {
      id,
      modelName,
      faction,
      shipClass,
      position,
      velocity: { x: 0, y: 0, z: 0 },
      model,
      health: stats.health,
      maxHealth: stats.health,
      shield: stats.shield,
      maxShield: stats.shield,
      damage: stats.damage,
      speed: stats.speed,
      weaponType: 'RAILGUN',
      behavior: 'patrol', // patrol, guard, attack
      targetId: null,
      lastFireTime: 0,
      fireRateMs: 2000,
      spawned: Date.now(),
    };

    this._ships.set(id, ship);
    return ship;
  }

  /**
   * Get ship stats by class.
   * @param {string} shipClass
   * @returns {object} Stats.
   */
  _getShipStats(shipClass) {
    const stats = {
      FIGHTER: { health: 120, shield: 60, damage: 30, speed: 30 },
      BOMBER: { health: 200, shield: 80, damage: 50, speed: 20 },
      SCOUT: { health: 80, shield: 40, damage: 20, speed: 40 },
    };
    return stats[shipClass] || stats.FIGHTER;
  }

  /**
   * Get evenly-spaced positions in a circular orbit.
   * @param {object} center      { x, y, z }
   * @param {number} radius      Orbit radius.
   * @param {number} count       Number of positions.
   * @param {number} [offset=0]  Angular offset (radians).
   * @returns {Array<object>}    Array of positions.
   */
  _getOrbitPositions(center, radius, count, offset = 0) {
    const positions = [];
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = offset + angleStep * i;
      positions.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + (Math.random() - 0.5) * 10, // Slight vertical variance
        z: center.z + Math.sin(angle) * radius,
      });
    }

    return positions;
  }

  /**
   * Update all ships (AI, movement, combat).
   * @param {number} deltaMs  Milliseconds since last frame.
   * @param {object} playerPosition  { x, y, z }
   * @param {string} playerFaction   Player's faction ID.
   */
  update(deltaMs, playerPosition, playerFaction) {
    for (const [id, ship] of this._ships) {
      this._updateShipAI(ship, deltaMs, playerPosition, playerFaction);
      this._updateShipPosition(ship, deltaMs);
    }
  }

  /**
   * Update ship AI behavior.
   * @param {object} ship
   * @param {number} deltaMs
   * @param {object} playerPosition
   * @param {string} playerFaction
   */
  _updateShipAI(ship, deltaMs, playerPosition, playerFaction) {
    // Check diplomacy - don't attack allied factions
    if (this._factionSystem && playerFaction) {
      const relation = this._factionSystem.getDiplomacy(ship.faction, playerFaction);
      if (relation === 'alliance' || ship.faction === playerFaction) {
        ship.behavior = 'patrol';
        ship.targetId = null;
        return; // Friendly, don't engage
      }
    }

    // Simple patrol behavior for now
    // TODO: Add attack behavior, formation flying, etc.
    if (ship.behavior === 'patrol') {
      // Slowly orbit
      const orbitSpeed = 0.1;
      const angle = (Date.now() * 0.0001 * orbitSpeed) % (Math.PI * 2);
      const orbitRadius = 50;
      
      ship.velocity.x = Math.cos(angle) * orbitSpeed - ship.position.x * 0.01;
      ship.velocity.z = Math.sin(angle) * orbitSpeed - ship.position.z * 0.01;
    }
  }

  /**
   * Update ship position based on velocity.
   * @param {object} ship
   * @param {number} deltaMs
   */
  _updateShipPosition(ship, deltaMs) {
    const deltaSec = deltaMs / 1000;

    ship.position.x += ship.velocity.x * deltaSec;
    ship.position.y += ship.velocity.y * deltaSec;
    ship.position.z += ship.velocity.z * deltaSec;

    // Update 3D model position
    if (ship.model) {
      ship.model.position.set(ship.position.x, ship.position.y, ship.position.z);
    }
  }

  /**
   * Get all active faction ships.
   * @returns {Array<object>}
   */
  getShips() {
    return Array.from(this._ships.values());
  }

  /**
   * Get all active stations.
   * @returns {Array<object>}
   */
  getStations() {
    return Array.from(this._stations.values());
  }

  /**
   * Damage a ship or station.
   * @param {string} id
   * @param {number} damage
   * @returns {boolean} True if destroyed.
   */
  damage(id, damage) {
    const ship = this._ships.get(id);
    const station = this._stations.get(id);
    const target = ship || station;

    if (!target) return false;

    // Apply to shield first
    if (target.shield > 0) {
      const shieldDamage = Math.min(target.shield, damage);
      target.shield -= shieldDamage;
      damage -= shieldDamage;
    }

    // Apply remaining to health
    target.health -= damage;

    if (target.health <= 0) {
      this._destroy(id);
      return true;
    }

    return false;
  }

  /**
   * Destroy a ship or station.
   * @param {string} id
   */
  _destroy(id) {
    const ship = this._ships.get(id);
    const station = this._stations.get(id);
    const target = ship || station;

    if (!target) return;

    // Remove model from scene
    if (target.model) {
      this._scene.remove(target.model);
    }

    if (ship) {
      this._ships.delete(id);
      console.log(`[FactionFleetSpawner] Ship ${id} destroyed`);
    } else if (station) {
      this._stations.delete(id);
      console.log(`[FactionFleetSpawner] Station ${id} destroyed`);
    }
  }

  /**
   * Dispose of all resources.
   */
  dispose() {
    for (const [id, ship] of this._ships) {
      if (ship.model) {
        this._scene.remove(ship.model);
      }
    }
    for (const [id, station] of this._stations) {
      if (station.model) {
        this._scene.remove(station.model);
      }
    }
    this._ships.clear();
    this._stations.clear();
  }
}
