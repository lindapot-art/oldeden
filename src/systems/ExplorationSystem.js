import { randomUUID } from 'crypto';

/**
 * ExplorationSystem — transforms procedural content into functional gameplay.
 *
 * Activates the ProceduralGenerator data by implementing:
 *   - Navigation constraints (fuel consumption, jump range limits)
 *   - Wormhole mechanics (using existing 5% wormhole generation)
 *   - Sector hazards (radiation damage, environmental effects)
 *   - Anomaly scanning (scannable sites with rewards)
 *   - Exploration progression (skill gates, unlocks)
 */

export class ExplorationSystem {
  async init(engine) {
    this._engine = engine;
    this._proceduralGenerator = null;
    this._activeHazardTimers = new Map();
    this._discoveredAnomalies = new Set();
    this._sectorStates = new Map(); // Track per-sector state
    
    // Find the ProceduralGenerator instance
    this._proceduralGenerator = engine.getSystem('procedural');

    if (!this._proceduralGenerator) {
      console.warn('[ExplorationSystem] ProceduralGenerator not found - some features may not work');
    }

    console.log('[ExplorationSystem] Initialized - enhanced exploration active');
  }

  tick(deltaMs) {
    // Process active sector hazards
    this._processActiveHazards(deltaMs);
  }

  async destroy() {
    // Clear all hazard timers
    this._activeHazardTimers.clear();
  }

  // ── Navigation System ──────────────────────────────────────────────────────

  /**
   * Calculate fuel cost for a jump between systems.
   * @param {number} fromSystemIdx Source system index
   * @param {number} toSystemIdx Target system index
   * @param {object} shipData Current ship configuration
   * @returns {object} {cost, canJump, reason}
   */
  calculateJumpCost(fromSystemIdx, toSystemIdx, shipData) {
    const baseFuelCost = 10;
    const distance = this._calculateSystemDistance(fromSystemIdx, toSystemIdx);
    
    // Distance-based fuel consumption
    let fuelCost = Math.ceil(baseFuelCost + (distance / 50));
    
    // Ship efficiency modifiers
    const efficiency = this._getShipJumpEfficiency(shipData);
    fuelCost = Math.ceil(fuelCost * efficiency);

    // Check if ship has enough fuel
    const canJump = shipData.fuel >= fuelCost;
    const reason = canJump ? null : `Insufficient fuel (need ${fuelCost}, have ${shipData.fuel})`;

    return { cost: fuelCost, canJump, reason };
  }

  /**
   * Calculate maximum jump range for current ship.
   * @param {object} shipData Current ship configuration
   * @returns {number} Maximum jump range in distance units
   */
  calculateJumpRange(shipData) {
    const baseRange = 120; // Base range from current system
    
    // Ship class modifiers (would integrate with fitting system)
    let rangeMultiplier = 1.0;
    
    // TODO: Integrate with fitting system for navigation modules
    // if (shipData.fittings) {
    //   shipData.fittings.forEach(module => {
    //     if (module.type === 'jump_drive') rangeMultiplier *= module.rangeBonus;
    //   });
    // }

    return baseRange * rangeMultiplier;
  }

  /**
   * Check if a jump route is valid considering fuel and range.
   * @param {number} fromSystemIdx Source system index
   * @param {number} toSystemIdx Target system index
   * @param {object} shipData Current ship configuration
   * @param {array} starSystems Array of all star systems
   * @returns {object} {valid, reason, cost}
   */
  validateJumpRoute(fromSystemIdx, toSystemIdx, shipData, starSystems) {
    const distance = this._calculateSystemDistance(fromSystemIdx, toSystemIdx);
    const maxRange = this.calculateJumpRange(shipData);
    
    // Range check
    if (distance > maxRange) {
      return {
        valid: false,
        reason: `Target system out of range (${Math.ceil(distance)} > ${Math.ceil(maxRange)})`,
        cost: 0
      };
    }

    // Fuel check
    const jumpCost = this.calculateJumpCost(fromSystemIdx, toSystemIdx, shipData);
    if (!jumpCost.canJump) {
      return {
        valid: false,
        reason: jumpCost.reason,
        cost: jumpCost.cost
      };
    }

    return {
      valid: true,
      reason: null,
      cost: jumpCost.cost
    };
  }

  // ── Wormhole System ────────────────────────────────────────────────────────

  /**
   * Find wormholes in the current system using ProceduralGenerator data.
   * @param {number} systemIdx Current system index
   * @returns {array} Array of wormhole objects
   */
  findWormholesInSystem(systemIdx) {
    if (!this._proceduralGenerator) return [];

    // Generate system data using the same seed as the original system
    const systemSeed = `sys-${systemIdx}`;
    const systemData = this._proceduralGenerator.generateStarSystem(systemSeed);
    
    if (!systemData.hasWormhole) return [];

    // Generate wormhole details
    const wormholes = [{
      id: `wh-${systemIdx}-${systemSeed}`,
      type: 'unstable',
      stability: 0.3 + Math.random() * 0.4, // 30-70% stability
      destination: this._generateWormholeDestination(systemIdx),
      scanData: null, // Null until scanned
      usageCount: 0,
      maxUses: Math.floor(Math.random() * 3) + 2, // 2-4 uses before collapse
    }];

    return wormholes;
  }

  /**
   * Use a wormhole for travel.
   * @param {object} wormhole Wormhole object
   * @param {object} shipData Current ship data
   * @returns {object} {success, destination, damage, message}
   */
  useWormhole(wormhole, shipData) {
    wormhole.usageCount++;
    
    // Calculate transit risks
    const riskRoll = Math.random();
    const stabilityThreshold = wormhole.stability;
    
    let damage = 0;
    let message = 'Wormhole transit successful';
    
    if (riskRoll > stabilityThreshold) {
      // Unstable transit - hull damage
      damage = Math.floor(5 + Math.random() * 15); // 5-20 hull damage
      message = 'Unstable wormhole transit - hull damage taken!';
    }

    // Check if wormhole collapses
    const collapsed = wormhole.usageCount >= wormhole.maxUses;
    if (collapsed) {
      message += ' Wormhole collapsed after transit!';
    }

    return {
      success: true,
      destination: wormhole.destination,
      damage: damage,
      message: message,
      collapsed: collapsed
    };
  }

  // ── Sector Hazards ─────────────────────────────────────────────────────────

  /**
   * Get active hazards for a system using ProceduralGenerator data.
   * @param {number} systemIdx System index
   * @returns {array} Array of hazard objects
   */
  getSystemHazards(systemIdx) {
    if (!this._proceduralGenerator) return [];

    const systemSeed = `sys-${systemIdx}`;
    const systemData = this._proceduralGenerator.generateStarSystem(systemSeed);
    
    return systemData.hazards.map(hazardName => ({
      type: hazardName,
      intensity: this._getHazardIntensity(hazardName, systemData),
      effects: this._getHazardEffects(hazardName),
      active: true
    }));
  }

  /**
   * Apply hazard effects to ship systems.
   * @param {object} shipData Current ship data
   * @param {array} hazards Active hazards
   * @returns {object} Damage/effect summary
   */
  applyHazardEffects(shipData, hazards) {
    const effects = {
      hullDamage: 0,
      heatBuildup: 0,
      powerDrain: 0,
      message: []
    };

    hazards.forEach(hazard => {
      switch (hazard.type) {
        case 'Radiation Belt':
          const radiationDamage = hazard.intensity * 0.5; // % per minute
          effects.hullDamage += radiationDamage;
          effects.message.push(`Radiation damage: ${radiationDamage.toFixed(1)}% hull integrity`);
          break;
          
        case 'Electromagnetic Storm':
          const powerLoss = hazard.intensity * 0.8;
          effects.powerDrain += powerLoss;
          effects.message.push(`EM interference: ${powerLoss.toFixed(1)}% power drain`);
          break;
          
        case 'Extreme Gravity Well':
          const gravityStrain = hazard.intensity * 0.3;
          effects.heatBuildup += gravityStrain;
          effects.message.push(`Gravity strain: +${gravityStrain.toFixed(1)}% heat generation`);
          break;
      }
    });

    return effects;
  }

  /**
   * Start monitoring hazards in current system.
   * @param {number} systemIdx System to monitor
   * @param {function} updateCallback Function to call with damage updates
   */
  startHazardMonitoring(systemIdx, updateCallback) {
    this.stopHazardMonitoring(); // Clear existing monitoring
    
    const hazards = this.getSystemHazards(systemIdx);
    if (hazards.length === 0) return;

    // Start hazard processing timer (every 10 seconds)
    const timerId = setInterval(() => {
      const effects = this.applyHazardEffects({ fuel: 100 }, hazards); // TODO: Get real ship data
      if (updateCallback) updateCallback(effects);
    }, 10000);

    this._activeHazardTimers.set(systemIdx, timerId);
  }

  /**
   * Stop hazard monitoring.
   */
  stopHazardMonitoring() {
    this._activeHazardTimers.forEach((timerId, systemIdx) => {
      clearInterval(timerId);
    });
    this._activeHazardTimers.clear();
  }

  // ── Anomaly System ─────────────────────────────────────────────────────────

  /**
   * Generate scannable anomalies for a system.
   * @param {number} systemIdx System index
   * @returns {array} Array of anomaly objects
   */
  generateSystemAnomalies(systemIdx) {
    if (!this._proceduralGenerator) return [];

    const systemSeed = `sys-${systemIdx}`;
    const systemData = this._proceduralGenerator.generateStarSystem(systemSeed);
    
    const anomalies = [];
    
    // Generate 0-3 anomalies per system based on system properties
    const anomalyCount = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < anomalyCount; i++) {
      const anomaly = {
        id: `anomaly-${systemIdx}-${i}`,
        type: this._pickAnomalyType(systemData),
        position: this._generateAnomalyPosition(),
        scanDifficulty: 1 + Math.floor(Math.random() * 5), // 1-5 difficulty
        scanned: false,
        rewards: null, // Generated when scanned
        discovered: this._discoveredAnomalies.has(`anomaly-${systemIdx}-${i}`)
      };
      
      anomalies.push(anomaly);
    }

    return anomalies;
  }

  /**
   * Scan an anomaly to reveal its contents.
   * @param {object} anomaly Anomaly to scan
   * @param {number} playerScanSkill Player's scanning skill level
   * @returns {object} Scan result
   */
  scanAnomaly(anomaly, playerScanSkill) {
    const scanRoll = Math.random() * playerScanSkill;
    const success = scanRoll >= anomaly.scanDifficulty;
    
    if (success) {
      anomaly.scanned = true;
      anomaly.rewards = this._generateAnomalyRewards(anomaly);
      this._discoveredAnomalies.add(anomaly.id);
      
      return {
        success: true,
        message: `Anomaly scanned successfully - ${anomaly.type} detected`,
        rewards: anomaly.rewards
      };
    } else {
      return {
        success: false,
        message: `Scan failed - need scanning skill ${anomaly.scanDifficulty}+`,
        rewards: null
      };
    }
  }

  // ── Private Helper Methods ─────────────────────────────────────────────────

  _calculateSystemDistance(fromIdx, toIdx) {
    // TODO: Get actual system coordinates from star map
    // For now, return a reasonable distance based on indices
    return Math.abs(fromIdx - toIdx) * 25 + Math.random() * 50;
  }

  _getShipJumpEfficiency(shipData) {
    // Base efficiency - would integrate with fitting system
    let efficiency = 1.0;
    
    // TODO: Factor in ship modules, ship class, etc.
    // More advanced ships = better fuel efficiency
    
    return efficiency;
  }

  _generateWormholeDestination(fromSystemIdx) {
    // Generate a random destination system (can be distant)
    const maxSystems = 40; // Current system count
    let destination = Math.floor(Math.random() * maxSystems);
    
    // Ensure it's not the same system
    while (destination === fromSystemIdx) {
      destination = Math.floor(Math.random() * maxSystems);
    }
    
    return destination;
  }

  _getHazardIntensity(hazardName, systemData) {
    // Use system properties to determine hazard intensity
    const baseIntensity = 1.0;
    let intensity = baseIntensity;
    
    // Factor in radiation levels, star type, etc.
    if (systemData.baseRadiation > 0.5) {
      intensity *= (1 + systemData.baseRadiation);
    }
    
    return Math.min(intensity, 3.0); // Cap at 3x intensity
  }

  _getHazardEffects(hazardName) {
    const hazardEffects = {
      'Radiation Belt': { type: 'hull_damage', rate: 1.0 },
      'Electromagnetic Storm': { type: 'power_drain', rate: 0.8 },
      'Extreme Gravity Well': { type: 'heat_buildup', rate: 0.6 },
      'Toxic Atmosphere': { type: 'hull_damage', rate: 0.4 },
      'Temporal Anomaly': { type: 'random_effects', rate: 0.2 }
    };
    
    return hazardEffects[hazardName] || { type: 'none', rate: 0 };
  }

  _processActiveHazards(deltaMs) {
    // Process any continuous hazard effects
    // This would integrate with the main game loop
  }

  _pickAnomalyType(systemData) {
    const anomalyTypes = ['Combat Site', 'Resource Cache', 'Derelict Ship', 'Research Data'];
    
    // Weight anomaly types based on system properties
    let weights = [1, 1, 1, 1];
    
    if (systemData.hazards.includes('Pirate Territory')) {
      weights[0] *= 2; // More combat sites in pirate territory
    }
    
    if (systemData.resources.length > 2) {
      weights[1] *= 1.5; // More resource caches in resource-rich systems
    }
    
    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < anomalyTypes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return anomalyTypes[i];
      }
    }
    
    return anomalyTypes[0];
  }

  _generateAnomalyPosition() {
    return {
      x: (Math.random() - 0.5) * 1000,
      y: (Math.random() - 0.5) * 1000,
      z: (Math.random() - 0.5) * 200
    };
  }

  _generateAnomalyRewards(anomaly) {
    const rewards = {
      credits: 0,
      items: [],
      skillXP: {}
    };
    
    switch (anomaly.type) {
      case 'Combat Site':
        rewards.credits = 500 + Math.floor(Math.random() * 2000);
        rewards.items.push('Boss Fragment');
        rewards.skillXP.combat = 50;
        break;
        
      case 'Resource Cache':
        rewards.credits = 200 + Math.floor(Math.random() * 800);
        rewards.items.push('Exotic Materials', 'Rare Minerals');
        rewards.skillXP.mining = 25;
        break;
        
      case 'Derelict Ship':
        rewards.credits = 100 + Math.floor(Math.random() * 500);
        rewards.items.push('Ship Module', 'Salvage Components');
        rewards.skillXP.engineering = 30;
        break;
        
      case 'Research Data':
        rewards.credits = 300 + Math.floor(Math.random() * 1200);
        rewards.items.push('Technology Data', 'Research Notes');
        rewards.skillXP.science = 40;
        break;
    }
    
    return rewards;
  }
}