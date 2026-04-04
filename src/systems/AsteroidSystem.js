/**
 * @fileoverview Asteroid System - Manages asteroid spawning, physics, and mining.
 * Generates procedural asteroid belts with mineable resources.
 */

export class AsteroidSystem {
  /**
   * @param {THREE} THREE - Three.js library
   * @param {THREE.Scene} scene - Scene to add asteroids to
   * @param {object} options - Configuration options
   */
  constructor(THREE, scene, options = {}) {
    this._THREE = THREE;
    this._scene = scene;
    
    // Configuration
    this._beltRadius = options.beltRadius ?? 500;
    this._beltThickness = options.beltThickness ?? 100;
    this._asteroidCount = options.asteroidCount ?? 50;
    this._minSize = options.minSize ?? 2;
    this._maxSize = options.maxSize ?? 15;
    
    // Asteroid storage
    this._asteroids = new Map(); // id -> asteroid data
    this._nextId = 1;
    
    // Ore types and their values
    this._oreTypes = [
      { name: 'Ice', color: 0x88ccff, value: 1, rarity: 0.4 },
      { name: 'Iron', color: 0x886644, value: 2, rarity: 0.3 },
      { name: 'Copper', color: 0xcc8844, value: 3, rarity: 0.15 },
      { name: 'Gold', color: 0xffcc00, value: 5, rarity: 0.08 },
      { name: 'Platinum', color: 0xccccff, value: 10, rarity: 0.05 },
      { name: 'Xenonite', color: 0xff00ff, value: 20, rarity: 0.02 }
    ];
    
    // Mining state
    this._activeMiningTarget = null;
    this._miningProgress = 0;
    this._miningRate = 0.01; // 1% per frame
  }
  
  /**
   * Initialize the asteroid belt
   */
  initialize() {
    console.log(`[AsteroidSystem] Generating ${this._asteroidCount} asteroids...`);
    this._generateAsteroidBelt();
  }
  
  /**
   * Generate a procedural asteroid belt
   */
  _generateAsteroidBelt() {
    const rng = this._mulberry32(Date.now());
    
    for (let i = 0; i < this._asteroidCount; i++) {
      const asteroid = this._createAsteroid(rng);
      this._asteroids.set(asteroid.id, asteroid);
      this._scene.add(asteroid.mesh);
    }
    
    console.log(`[AsteroidSystem] Generated ${this._asteroids.size} asteroids`);
  }
  
  /**
   * Create a single procedural asteroid
   */
  _createAsteroid(rng) {
    const id = this._nextId++;
    
    // Position in belt (torus shape)
    const angle = rng() * Math.PI * 2;
    const radiusOffset = (rng() - 0.5) * this._beltThickness;
    const heightOffset = (rng() - 0.5) * this._beltThickness;
    const radius = this._beltRadius + radiusOffset;
    
    const position = new this._THREE.Vector3(
      Math.cos(angle) * radius,
      heightOffset,
      Math.sin(angle) * radius
    );
    
    // Random size and rotation
    const size = this._minSize + rng() * (this._maxSize - this._minSize);
    const rotation = new this._THREE.Euler(
      rng() * Math.PI * 2,
      rng() * Math.PI * 2,
      rng() * Math.PI * 2
    );
    
    // Select ore type based on rarity
    const oreType = this._selectOreType(rng);
    
    // Create mesh
    const mesh = this._createAsteroidMesh(size, oreType, rng);
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    
    // Slow rotation animation
    const rotationSpeed = new this._THREE.Vector3(
      (rng() - 0.5) * 0.001,
      (rng() - 0.5) * 0.001,
      (rng() - 0.5) * 0.001
    );
    
    return {
      id,
      mesh,
      position,
      size,
      oreType,
      rotationSpeed,
      health: 100,
      maxHealth: 100,
      mined: false
    };
  }
  
  /**
   * Select ore type based on rarity
   */
  _selectOreType(rng) {
    const roll = rng();
    let cumulative = 0;
    
    for (const ore of this._oreTypes) {
      cumulative += ore.rarity;
      if (roll < cumulative) {
        return ore;
      }
    }
    
    return this._oreTypes[0]; // Default to Ice
  }
  
  /**
   * Create procedural asteroid mesh
   */
  _createAsteroidMesh(size, oreType, rng) {
    // Create irregular shape using icosahedron with displaced vertices
    const geometry = new this._THREE.IcosahedronGeometry(size, 1);
    const positions = geometry.attributes.position;
    
    // Displace vertices for irregular shape
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const length = Math.sqrt(x * x + y * y + z * z);
      const displacement = 0.7 + rng() * 0.6; // 70% to 130% of original
      
      positions.setXYZ(
        i,
        (x / length) * size * displacement,
        (y / length) * size * displacement,
        (z / length) * size * displacement
      );
    }
    
    geometry.computeVertexNormals();
    
    // Material with ore color
    const material = new this._THREE.MeshStandardMaterial({
      color: oreType.color,
      roughness: 0.9,
      metalness: 0.3,
      flatShading: true
    });
    
    const mesh = new this._THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Store metadata on mesh for raycasting
    mesh.userData.asteroidId = this._nextId;
    mesh.userData.oreType = oreType.name;
    
    return mesh;
  }
  
  /**
   * Update asteroid rotations
   */
  update(deltaTime) {
    for (const [id, asteroid] of this._asteroids) {
      if (!asteroid.mined) {
        asteroid.mesh.rotation.x += asteroid.rotationSpeed.x;
        asteroid.mesh.rotation.y += asteroid.rotationSpeed.y;
        asteroid.mesh.rotation.z += asteroid.rotationSpeed.z;
      }
    }
    
    // Update mining progress
    if (this._activeMiningTarget) {
      this._updateMining(deltaTime);
    }
  }
  
  /**
   * Start mining an asteroid
   */
  startMining(asteroidId) {
    const asteroid = this._asteroids.get(asteroidId);
    if (!asteroid || asteroid.mined) {
      console.warn(`[AsteroidSystem] Cannot mine asteroid ${asteroidId}`);
      return false;
    }
    
    this._activeMiningTarget = asteroidId;
    this._miningProgress = 0;
    console.log(`[AsteroidSystem] Started mining asteroid ${asteroidId} (${asteroid.oreType.name})`);
    return true;
  }
  
  /**
   * Stop mining
   */
  stopMining() {
    if (this._activeMiningTarget) {
      console.log(`[AsteroidSystem] Stopped mining asteroid ${this._activeMiningTarget}`);
      this._activeMiningTarget = null;
      this._miningProgress = 0;
    }
  }
  
  /**
   * Update mining progress
   */
  _updateMining(deltaTime) {
    const asteroid = this._asteroids.get(this._activeMiningTarget);
    if (!asteroid) {
      this.stopMining();
      return;
    }
    
    // Increase progress
    this._miningProgress += this._miningRate;
    
    // Visual feedback - scale down as we extract
    const scale = 1 - (this._miningProgress * 0.5);
    asteroid.mesh.scale.set(scale, scale, scale);
    
    // Complete mining
    if (this._miningProgress >= 1.0) {
      this._completeMining(asteroid);
    }
  }
  
  /**
   * Complete mining and collect resources
   */
  _completeMining(asteroid) {
    console.log(`[AsteroidSystem] Mining complete! Collected ${asteroid.oreType.name} worth ${asteroid.oreType.value} credits`);
    
    // Mark as mined
    asteroid.mined = true;
    
    // Remove from scene
    this._scene.remove(asteroid.mesh);
    
    // Emit mining complete event
    const event = new CustomEvent('asteroid:mined', {
      detail: {
        asteroidId: asteroid.id,
        oreType: asteroid.oreType.name,
        value: asteroid.oreType.value
      }
    });
    window.dispatchEvent(event);
    
    this._activeMiningTarget = null;
    this._miningProgress = 0;
  }
  
  /**
   * Get all asteroids in range of a point
   */
  getAsteroidsInRange(position, maxDistance) {
    const results = [];
    
    for (const [id, asteroid] of this._asteroids) {
      if (asteroid.mined) continue;
      
      const distance = asteroid.position.distanceTo(position);
      if (distance <= maxDistance) {
        results.push({
          id,
          position: asteroid.position,
          distance,
          size: asteroid.size,
          oreType: asteroid.oreType,
          mesh: asteroid.mesh
        });
      }
    }
    
    // Sort by value (best first), then by distance (nearest first)
    results.sort((a, b) => {
      const valueDiff = b.oreType.value - a.oreType.value;
      if (valueDiff !== 0) return valueDiff;
      return a.distance - b.distance;
    });
    
    return results;
  }
  
  /**
   * Get the best asteroid for auto-mining
   */
  getBestAsteroid(position, maxDistance) {
    const asteroids = this.getAsteroidsInRange(position, maxDistance);
    return asteroids.length > 0 ? asteroids[0] : null;
  }
  
  /**
   * Get mining status
   */
  getMiningStatus() {
    if (!this._activeMiningTarget) {
      return null;
    }
    
    const asteroid = this._asteroids.get(this._activeMiningTarget);
    return {
      asteroidId: this._activeMiningTarget,
      oreType: asteroid.oreType.name,
      progress: this._miningProgress,
      value: asteroid.oreType.value
    };
  }
  
  /**
   * Simple PRNG (Mulberry32)
   */
  _mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  
  /**
   * Cleanup
   */
  dispose() {
    for (const [id, asteroid] of this._asteroids) {
      this._scene.remove(asteroid.mesh);
      asteroid.mesh.geometry.dispose();
      asteroid.mesh.material.dispose();
    }
    this._asteroids.clear();
  }
}
