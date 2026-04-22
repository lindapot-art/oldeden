/**
 * TerritoryControlSystem — Guild territory claiming and strategic warfare
 * 
 * Provides:
 * - Guild-claimable star systems with strategic value
 * - Territory benefits (mining bonuses, defensive stations, market access)
 * - Sovereignty mechanics requiring active defense and investment
 * - Territory conflicts and guild vs guild warfare
 * - Integration with faction space and exploration systems
 * - Economic benefits and taxation from controlled territories
 *
 * INTEGRATION POINTS:
 * - GuildSystem: Territory ownership and guild progression
 * - ExplorationSystem: Contested wormholes and expansion mechanics
 * - FactionSystem: Faction space relationships affect claiming
 * - AuctionHouseSystem: Territory-based market control
 * - FleetSystem: Territory defense and conquest operations
 */

// ── Territory Types and Strategic Value ─────────────────────────────────────

export const TERRITORY_TYPES = Object.freeze({
  MINING_SYSTEM: {
    name: 'Mining System',
    description: 'Rich asteroid belts and mining operations',
    benefits: {
      miningYield: 1.5,
      resourceGeneration: 200, // Credits per hour
      defensiveBonus: 1.1
    },
    requirements: {
      minGuildSize: 15,
      investmentCost: 50000,
      maintenanceCost: 1000 // Per day
    },
    strategicValue: 3
  },
  
  TRADE_HUB: {
    name: 'Trade Hub',
    description: 'Major trade routes and commercial stations',
    benefits: {
      marketTaxRate: 0.02, // Guild gets 2% of all trades
      tradingBonus: 1.3,
      economicInfluence: 1.4
    },
    requirements: {
      minGuildSize: 20,
      investmentCost: 75000,
      maintenanceCost: 1500
    },
    strategicValue: 4
  },
  
  MILITARY_OUTPOST: {
    name: 'Military Outpost',
    description: 'Strategic military position with defensive advantages',
    benefits: {
      defensiveBonus: 2.0,
      fleetSupport: 1.5,
      combatBonus: 1.2,
      respawnPoint: true
    },
    requirements: {
      minGuildSize: 25,
      investmentCost: 100000,
      maintenanceCost: 2000
    },
    strategicValue: 5
  },
  
  RESEARCH_STATION: {
    name: 'Research Station',
    description: 'Advanced technology and ship modifications',
    benefits: {
      technologyAccess: ['advanced_modules', 'experimental_weapons'],
      skillBonus: 1.3,
      blueprintGeneration: 5 // Per day
    },
    requirements: {
      minGuildSize: 10,
      investmentCost: 60000,
      maintenanceCost: 800
    },
    strategicValue: 4
  },
  
  FRONTIER_COLONY: {
    name: 'Frontier Colony',
    description: 'Expansion into unexplored space',
    benefits: {
      explorationBonus: 1.4,
      wormholeAccess: true,
      territoryExpansion: 1.2
    },
    requirements: {
      minGuildSize: 8,
      investmentCost: 30000,
      maintenanceCost: 500
    },
    strategicValue: 2
  }
});

// ── Territory States and Control Mechanics ──────────────────────────────────

export const TERRITORY_STATES = Object.freeze({
  UNCLAIMED: 'unclaimed',        // No guild control
  CLAIMED: 'claimed',            // Guild has basic control
  FORTIFIED: 'fortified',        // Defensive structures built
  CONTESTED: 'contested',        // Under attack or dispute
  ABANDONED: 'abandoned',        // Guild stopped maintenance
  REINFORCED: 'reinforced'       // Maximum defensive state
});

export const CONTROL_ACTIONS = Object.freeze({
  CLAIM: 'claim',                // Initial territory claiming
  FORTIFY: 'fortify',           // Build defensive structures
  ATTACK: 'attack',             // Challenge guild control
  DEFEND: 'defend',             // Defend territory from attack
  ABANDON: 'abandon',           // Give up territory
  REINFORCE: 'reinforce'        // Maximum defensive investment
});

// ── Territory Conflict System ───────────────────────────────────────────────

const CONFLICT_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const REINFORCEMENT_TIMER = 24 * 60 * 60 * 1000;    // 24 hours
const VULNERABILITY_WINDOW = 4 * 60 * 60 * 1000;    // 4 hours daily

export class TerritoryControlSystem {
  constructor(engine) {
    this.engine = engine;
    
    // Territory data structures
    this.territories = new Map(); // territoryId -> Territory
    this.systemTerritories = new Map(); // systemId -> territoryId
    this.guildTerritories = new Map(); // guildId -> Set(territoryId)
    
    // Conflict and warfare
    this.activeConflicts = new Map(); // conflictId -> Conflict
    this.territoryAttacks = new Map(); // territoryId -> Attack[]
    this.defensiveStructures = new Map(); // territoryId -> Structure[]
    
    // Economic and strategic tracking
    this.territoryIncome = new Map(); // territoryId -> IncomeData
    this.strategicNetwork = new Map(); // guildId -> NetworkData
    this.territoryHistory = new Map(); // territoryId -> OwnershipHistory[]
    
    // Alliance and diplomacy
    this.territoryAlliances = new Map(); // territoryId -> AlliedGuilds[]
    this.accessAgreements = new Map(); // territoryId -> AccessData
  }

  async init() {
    console.log('[TerritoryControlSystem] Initializing territory control...');
    
    // Initialize territories from procedural systems
    await this.initializeTerritories();
    
    // Listen for relevant events
    this.engine.events.on('guild:created', this.onGuildCreated.bind(this));
    this.engine.events.on('guild:disbanded', this.onGuildDisbanded.bind(this));
    this.engine.events.on('fleet:combat_engaged', this.onFleetCombat.bind(this));
    this.engine.events.on('exploration:system_discovered', this.onSystemDiscovered.bind(this));
    
    // Process territory maintenance and conflicts
    setInterval(() => {
      this.processTerritoryMaintenance();
      this.processActiveConflicts();
    }, 300000); // Every 5 minutes
    
    // Daily territory income and upkeep
    setInterval(() => {
      this.processDailyTerritoryOperations();
    }, 24 * 60 * 60 * 1000);
    
    // Vulnerability windows (guilds can set preferred times)
    setInterval(() => {
      this.processVulnerabilityWindows();
    }, 60 * 60 * 1000); // Every hour
    
    return true;
  }

  // ── Territory Initialization ────────────────────────────────────────────────

  /**
   * Initialize claimable territories from procedural star systems
   */
  async initializeTerritories() {
    const proceduralSystem = this.engine.getSystem('procedural');
    if (!proceduralSystem) return;
    
    // Analyze procedural systems for strategic value
    for (let i = 0; i < 40; i++) {
      const systemId = `system-${i}`;
      const systemData = proceduralSystem.generateStarSystem(systemId);
      
      // Determine if system has claimable territory
      const territoryType = this.evaluateSystemForTerritoryType(systemData, i);
      if (territoryType) {
        this.createTerritory(systemId, territoryType, systemData);
      }
    }
    
    console.log(`[TerritoryControlSystem] Initialized ${this.territories.size} claimable territories`);
  }

  /**
   * Evaluate star system for territory type based on procedural data
   */
  evaluateSystemForTerritoryType(systemData, systemIndex) {
    // Use deterministic evaluation based on system properties
    const hash = this.hashString(systemData.name || `system-${systemIndex}`);
    const rand = (hash % 1000) / 1000;
    
    // Core systems (0-9) are more likely to be trade hubs
    if (systemIndex < 10) {
      if (rand < 0.4) return TERRITORY_TYPES.TRADE_HUB;
      if (rand < 0.7) return TERRITORY_TYPES.MILITARY_OUTPOST;
      if (rand < 0.9) return TERRITORY_TYPES.RESEARCH_STATION;
      return null;
    }
    
    // Mid-range systems (10-29) mixed strategic value
    if (systemIndex < 30) {
      if (rand < 0.3) return TERRITORY_TYPES.MINING_SYSTEM;
      if (rand < 0.5) return TERRITORY_TYPES.TRADE_HUB;
      if (rand < 0.7) return TERRITORY_TYPES.MILITARY_OUTPOST;
      if (rand < 0.85) return TERRITORY_TYPES.RESEARCH_STATION;
      return null;
    }
    
    // Frontier systems (30+) mostly colonies and mining
    if (rand < 0.4) return TERRITORY_TYPES.MINING_SYSTEM;
    if (rand < 0.6) return TERRITORY_TYPES.FRONTIER_COLONY;
    if (rand < 0.8) return TERRITORY_TYPES.RESEARCH_STATION;
    return null;
  }

  /**
   * Create a claimable territory in a star system
   */
  createTerritory(systemId, territoryType, systemData) {
    const territoryId = this.generateTerritoryId(systemId);
    
    const territory = {
      id: territoryId,
      systemId,
      type: territoryType,
      name: `${systemData.name || systemId} ${territoryType.name}`,
      
      // Ownership
      ownerGuildId: null,
      claimedAt: null,
      state: TERRITORY_STATES.UNCLAIMED,
      
      // Strategic data
      strategicValue: territoryType.strategicValue,
      benefits: { ...territoryType.benefits },
      requirements: { ...territoryType.requirements },
      
      // Infrastructure
      developmentLevel: 0,
      defensiveRating: 0,
      structures: [],
      
      // Economic
      dailyIncome: 0,
      maintenanceCost: territoryType.requirements.maintenanceCost,
      totalInvestment: 0,
      
      // Conflict
      vulnerabilityWindow: null, // Set by owning guild
      lastAttacked: null,
      attackers: [],
      
      // Metadata
      systemData,
      history: []
    };
    
    this.territories.set(territoryId, territory);
    this.systemTerritories.set(systemId, territoryId);
    
    return territory;
  }

  // ── Territory Claiming and Management ───────────────────────────────────────

  /**
   * Claim an unclaimed territory for a guild
   */
  claimTerritory(guildId, territoryId, playerId) {
    const territory = this.territories.get(territoryId);
    if (!territory) {
      return { success: false, error: 'Territory not found' };
    }
    
    if (territory.state !== TERRITORY_STATES.UNCLAIMED) {
      return { success: false, error: 'Territory not available for claiming' };
    }
    
    // Validate guild requirements
    const validation = this.validateClaimRequirements(guildId, territory);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Check faction relationships
    const factionCheck = this.checkFactionTerritoryRights(guildId, territory);
    if (!factionCheck.allowed) {
      return { success: false, error: factionCheck.reason };
    }
    
    // Deduct claiming cost from guild treasury
    const guildSystem = this.engine.getSystem('guilds');
    const guild = guildSystem.getGuild(guildId);
    
    if (guild.treasury.ec < territory.requirements.investmentCost) {
      return { success: false, error: 'Insufficient guild treasury' };
    }
    
    guild.treasury.ec -= territory.requirements.investmentCost;
    
    // Claim territory
    territory.ownerGuildId = guildId;
    territory.claimedAt = Date.now();
    territory.state = TERRITORY_STATES.CLAIMED;
    territory.totalInvestment = territory.requirements.investmentCost;
    
    // Add to guild territories
    if (!this.guildTerritories.has(guildId)) {
      this.guildTerritories.set(guildId, new Set());
    }
    this.guildTerritories.get(guildId).add(territoryId);
    
    // Record in history
    territory.history.push({
      action: 'claimed',
      guildId,
      playerId,
      timestamp: Date.now(),
      cost: territory.requirements.investmentCost
    });
    
    // Set default vulnerability window (can be changed later)
    territory.vulnerabilityWindow = {
      startHour: 20, // 8 PM server time
      duration: 4    // 4 hours
    };
    
    console.log(`[TerritoryControlSystem] Territory ${territoryId} claimed by guild ${guildId}`);
    
    // Emit claiming event
    this.engine.events.emit('territory:claimed', {
      territoryId,
      guildId,
      playerId,
      territory
    });
    
    return { success: true, territory };
  }

  /**
   * Fortify territory with defensive structures
   */
  fortifyTerritory(guildId, territoryId, fortificationLevel, playerId) {
    const territory = this.territories.get(territoryId);
    if (!territory) {
      return { success: false, error: 'Territory not found' };
    }
    
    if (territory.ownerGuildId !== guildId) {
      return { success: false, error: 'Not your territory' };
    }
    
    if (territory.state !== TERRITORY_STATES.CLAIMED && territory.state !== TERRITORY_STATES.FORTIFIED) {
      return { success: false, error: 'Cannot fortify in current state' };
    }
    
    // Calculate fortification cost
    const baseCost = territory.requirements.investmentCost * 0.5;
    const levelCost = baseCost * fortificationLevel;
    
    const guildSystem = this.engine.getSystem('guilds');
    const guild = guildSystem.getGuild(guildId);
    
    if (guild.treasury.ec < levelCost) {
      return { success: false, error: 'Insufficient guild treasury' };
    }
    
    // Apply fortification
    guild.treasury.ec -= levelCost;
    territory.developmentLevel += fortificationLevel;
    territory.defensiveRating += fortificationLevel * 10;
    territory.totalInvestment += levelCost;
    
    // Create defensive structures
    for (let i = 0; i < fortificationLevel; i++) {
      territory.structures.push({
        type: 'defensive_platform',
        name: `Defense Platform ${territory.structures.length + 1}`,
        health: 100,
        firepower: 50,
        constructedAt: Date.now()
      });
    }
    
    // Update territory state
    if (territory.developmentLevel >= 5) {
      territory.state = TERRITORY_STATES.FORTIFIED;
    }
    
    if (territory.developmentLevel >= 10) {
      territory.state = TERRITORY_STATES.REINFORCED;
    }
    
    // Record in history
    territory.history.push({
      action: 'fortified',
      guildId,
      playerId,
      level: fortificationLevel,
      cost: levelCost,
      timestamp: Date.now()
    });
    
    console.log(`[TerritoryControlSystem] Territory ${territoryId} fortified to level ${territory.developmentLevel}`);
    
    // Emit fortification event
    this.engine.events.emit('territory:fortified', {
      territoryId,
      guildId,
      developmentLevel: territory.developmentLevel,
      defensiveRating: territory.defensiveRating
    });
    
    return { success: true, newLevel: territory.developmentLevel };
  }

  // ── Territory Conflicts and Warfare ─────────────────────────────────────────

  /**
   * Initiate an attack on enemy territory
   */
  attackTerritory(attackingGuildId, territoryId, attackForce, playerId) {
    const territory = this.territories.get(territoryId);
    if (!territory) {
      return { success: false, error: 'Territory not found' };
    }
    
    if (!territory.ownerGuildId) {
      return { success: false, error: 'Territory is unclaimed' };
    }
    
    if (territory.ownerGuildId === attackingGuildId) {
      return { success: false, error: 'Cannot attack your own territory' };
    }
    
    // Check if territory is in vulnerability window
    if (!this.isInVulnerabilityWindow(territory)) {
      return { success: false, error: 'Territory not vulnerable to attack' };
    }
    
    // Check attacking guild has sufficient forces
    const fleetSystem = this.engine.getSystem('fleets');
    const attackingFleet = fleetSystem.getGuildFleetInSystem(attackingGuildId, territory.systemId);
    
    if (!attackingFleet || attackingFleet.memberCount < 5) {
      return { success: false, error: 'Insufficient attacking force' };
    }
    
    // Create attack instance
    const attackId = this.generateAttackId();
    const attack = {
      id: attackId,
      territoryId,
      attackingGuildId,
      defendingGuildId: territory.ownerGuildId,
      initiatedBy: playerId,
      
      // Forces
      attackingForce: attackForce,
      defendingForce: territory.defensiveRating,
      
      // Timing
      startedAt: Date.now(),
      resolvesAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours to resolve
      
      // State
      status: 'active',
      battlePhases: [],
      
      // Participants
      attackers: new Set([playerId]),
      defenders: new Set()
    };
    
    // Register attack
    this.activeConflicts.set(attackId, attack);
    
    if (!this.territoryAttacks.has(territoryId)) {
      this.territoryAttacks.set(territoryId, []);
    }
    this.territoryAttacks.get(territoryId).push(attack);
    
    // Update territory state
    territory.state = TERRITORY_STATES.CONTESTED;
    territory.lastAttacked = Date.now();
    
    // Notify defending guild
    this.notifyTerritoryAttack(territory, attack);
    
    console.log(`[TerritoryControlSystem] Territory ${territoryId} under attack by guild ${attackingGuildId}`);
    
    // Emit attack event
    this.engine.events.emit('territory:under_attack', {
      territoryId,
      attackingGuildId,
      defendingGuildId: territory.ownerGuildId,
      attack
    });
    
    return { success: true, attackId, attack };
  }

  /**
   * Defend territory during an active attack
   */
  defendTerritory(defendingGuildId, attackId, defenseForce, playerId) {
    const attack = this.activeConflicts.get(attackId);
    if (!attack) {
      return { success: false, error: 'Attack not found' };
    }
    
    if (attack.defendingGuildId !== defendingGuildId) {
      return { success: false, error: 'Not defending this territory' };
    }
    
    if (attack.status !== 'active') {
      return { success: false, error: 'Attack not active' };
    }
    
    // Add defender to battle
    attack.defenders.add(playerId);
    attack.defendingForce += defenseForce;
    
    // Record battle phase
    attack.battlePhases.push({
      timestamp: Date.now(),
      playerId,
      action: 'defend',
      force: defenseForce,
      side: 'defense'
    });
    
    console.log(`[TerritoryControlSystem] Defense reinforcements: ${defenseForce} force added`);
    
    // Emit defense event
    this.engine.events.emit('territory:defense_reinforced', {
      attackId,
      playerId,
      additionalForce: defenseForce,
      totalDefense: attack.defendingForce
    });
    
    return { success: true };
  }

  /**
   * Process active territory conflicts
   */
  processActiveConflicts() {
    const now = Date.now();
    const resolvedConflicts = [];
    
    for (const [attackId, attack] of this.activeConflicts) {
      if (now >= attack.resolvesAt && attack.status === 'active') {
        const result = this.resolveAttack(attack);
        resolvedConflicts.push({ attackId, result });
        
        attack.status = 'resolved';
        attack.result = result;
      }
    }
    
    // Clean up resolved conflicts
    for (const { attackId, result } of resolvedConflicts) {
      this.finalizeAttackResult(attackId, result);
    }
  }

  /**
   * Resolve territory attack based on forces and strategy
   */
  resolveAttack(attack) {
    const territory = this.territories.get(attack.territoryId);
    
    // Calculate battle outcome
    const attackStrength = attack.attackingForce;
    const defenseStrength = attack.defendingForce;
    
    // Add randomness and tactical bonuses
    const attackRoll = attackStrength * (0.8 + Math.random() * 0.4);
    const defenseRoll = defenseStrength * (0.8 + Math.random() * 0.4);
    
    // Territory defensive bonuses
    const territoryBonus = territory.defensiveRating * 0.1;
    const finalDefense = defenseRoll + territoryBonus;
    
    const attackWins = attackRoll > finalDefense;
    const damage = Math.abs(attackRoll - finalDefense);
    
    return {
      attackWins,
      attackRoll,
      defenseRoll: finalDefense,
      damage,
      casualties: {
        attackers: attackWins ? Math.floor(damage * 0.1) : Math.floor(damage * 0.3),
        defenders: attackWins ? Math.floor(damage * 0.2) : Math.floor(damage * 0.1)
      }
    };
  }

  /**
   * Finalize attack result and transfer territory if needed
   */
  finalizeAttackResult(attackId, result) {
    const attack = this.activeConflicts.get(attackId);
    const territory = this.territories.get(attack.territoryId);
    
    if (result.attackWins) {
      // Territory changes hands
      const oldOwner = territory.ownerGuildId;
      
      // Remove from old guild
      if (this.guildTerritories.has(oldOwner)) {
        this.guildTerritories.get(oldOwner).delete(attack.territoryId);
      }
      
      // Add to new guild
      territory.ownerGuildId = attack.attackingGuildId;
      territory.claimedAt = Date.now();
      territory.state = TERRITORY_STATES.CLAIMED;
      
      if (!this.guildTerritories.has(attack.attackingGuildId)) {
        this.guildTerritories.set(attack.attackingGuildId, new Set());
      }
      this.guildTerritories.get(attack.attackingGuildId).add(attack.territoryId);
      
      // Damage defensive structures
      const structureDamage = Math.floor(result.damage / 10);
      territory.structures = territory.structures.slice(0, -structureDamage);
      territory.defensiveRating -= structureDamage * 10;
      territory.developmentLevel -= structureDamage;
      
      console.log(`[TerritoryControlSystem] Territory ${attack.territoryId} conquered by guild ${attack.attackingGuildId}`);
      
      // Emit conquest event
      this.engine.events.emit('territory:conquered', {
        territoryId: attack.territoryId,
        oldOwner,
        newOwner: attack.attackingGuildId,
        casualties: result.casualties
      });
      
    } else {
      // Territory successfully defended
      territory.state = territory.developmentLevel >= 5 ? TERRITORY_STATES.FORTIFIED : TERRITORY_STATES.CLAIMED;
      
      console.log(`[TerritoryControlSystem] Territory ${attack.territoryId} successfully defended`);
      
      // Emit defense success event
      this.engine.events.emit('territory:defended', {
        territoryId: attack.territoryId,
        defendingGuildId: attack.defendingGuildId,
        casualties: result.casualties
      });
    }
    
    // Clean up
    this.activeConflicts.delete(attackId);
    
    // Remove from territory attacks
    const attacks = this.territoryAttacks.get(attack.territoryId) || [];
    const filteredAttacks = attacks.filter(a => a.id !== attackId);
    this.territoryAttacks.set(attack.territoryId, filteredAttacks);
    
    // Record in territory history
    territory.history.push({
      action: result.attackWins ? 'conquered' : 'defended',
      attackingGuildId: attack.attackingGuildId,
      defendingGuildId: attack.defendingGuildId,
      result,
      timestamp: Date.now()
    });
  }

  // ── Economic Operations and Benefits ────────────────────────────────────────

  /**
   * Process daily territory operations and income
   */
  processDailyTerritoryOperations() {
    console.log('[TerritoryControlSystem] Processing daily territory operations...');
    
    for (const territory of this.territories.values()) {
      if (territory.ownerGuildId && territory.state !== TERRITORY_STATES.CONTESTED) {
        this.processTerritoryIncome(territory);
        this.processTerritoryMaintenance(territory);
      }
    }
    
    // Update strategic network bonuses
    this.updateStrategicNetworks();
  }

  /**
   * Generate daily income from territory
   */
  processTerritoryIncome(territory) {
    const baseIncome = territory.benefits.resourceGeneration || 0;
    const developmentMultiplier = 1 + (territory.developmentLevel * 0.1);
    const dailyIncome = Math.floor(baseIncome * developmentMultiplier);
    
    if (dailyIncome > 0) {
      const guildSystem = this.engine.getSystem('guilds');
      const guild = guildSystem.getGuild(territory.ownerGuildId);
      
      if (guild) {
        guild.treasury.ec += dailyIncome;
        territory.dailyIncome = dailyIncome;
        
        // Track income
        if (!this.territoryIncome.has(territory.id)) {
          this.territoryIncome.set(territory.id, {
            totalGenerated: 0,
            dailyAverage: 0,
            history: []
          });
        }
        
        const incomeData = this.territoryIncome.get(territory.id);
        incomeData.totalGenerated += dailyIncome;
        incomeData.history.push({
          date: new Date().toISOString().split('T')[0],
          income: dailyIncome
        });
        
        // Keep only last 30 days
        if (incomeData.history.length > 30) {
          incomeData.history.shift();
        }
        
        incomeData.dailyAverage = incomeData.history.reduce((sum, record) => 
          sum + record.income, 0) / incomeData.history.length;
      }
    }
  }

  /**
   * Process territory maintenance costs
   */
  processTerritoryMaintenance(territory) {
    const maintenanceCost = territory.maintenanceCost;
    const guildSystem = this.engine.getSystem('guilds');
    const guild = guildSystem.getGuild(territory.ownerGuildId);
    
    if (!guild) return;
    
    if (guild.treasury.ec >= maintenanceCost) {
      // Pay maintenance
      guild.treasury.ec -= maintenanceCost;
    } else {
      // Cannot afford maintenance - territory degrades
      territory.developmentLevel = Math.max(0, territory.developmentLevel - 1);
      territory.defensiveRating = Math.max(0, territory.defensiveRating - 5);
      
      // Remove defensive structures
      if (territory.structures.length > 0) {
        territory.structures.pop();
      }
      
      // If completely degraded, abandon territory
      if (territory.developmentLevel === 0 && territory.structures.length === 0) {
        this.abandonTerritory(territory.ownerGuildId, territory.id, 'maintenance_failure');
      }
      
      console.log(`[TerritoryControlSystem] Territory ${territory.id} degraded due to unpaid maintenance`);
    }
  }

  // ── Utility and Helper Methods ──────────────────────────────────────────────

  /**
   * Validate guild meets territory claiming requirements
   */
  validateClaimRequirements(guildId, territory) {
    const guildSystem = this.engine.getSystem('guilds');
    const guild = guildSystem.getGuild(guildId);
    
    if (!guild) {
      return { valid: false, error: 'Guild not found' };
    }
    
    // Check guild size requirement
    if (guild.memberCount < territory.requirements.minGuildSize) {
      return { 
        valid: false, 
        error: `Requires ${territory.requirements.minGuildSize} guild members` 
      };
    }
    
    // Check guild treasury
    if (guild.treasury.ec < territory.requirements.investmentCost) {
      return { 
        valid: false, 
        error: `Requires ${territory.requirements.investmentCost} credits` 
      };
    }
    
    // Check guild tier (higher tier territories require advanced guilds)
    if (territory.strategicValue > 3 && guild.tier.level < 2) {
      return { 
        valid: false, 
        error: 'Guild tier too low for this territory type' 
      };
    }
    
    return { valid: true };
  }

  /**
   * Check faction relationships for territory rights
   */
  checkFactionTerritoryRights(guildId, territory) {
    const factionSystem = this.engine.getSystem('factions');
    if (!factionSystem) return { allowed: true };
    
    // Check if territory is in hostile faction space
    const systemIndex = parseInt(territory.systemId.split('-')[1]);
    const dominantFaction = this.getDominantSystemFaction(systemIndex);
    
    if (dominantFaction) {
      const guildSystem = this.engine.getSystem('guilds');
      const guild = guildSystem.getGuild(guildId);
      
      // Check guild's collective faction standing
      const guildFactionRep = this.calculateGuildFactionReputation(guildId, dominantFaction);
      
      if (guildFactionRep < 0) {
        return { 
          allowed: false, 
          reason: 'Hostile faction space - improve standing first' 
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Check if territory is in its vulnerability window
   */
  isInVulnerabilityWindow(territory) {
    if (!territory.vulnerabilityWindow) return false;
    
    const now = new Date();
    const currentHour = now.getUTCHours();
    const window = territory.vulnerabilityWindow;
    
    const startHour = window.startHour;
    const endHour = (startHour + window.duration) % 24;
    
    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // Window crosses midnight
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  /**
   * Abandon territory (voluntary or forced)
   */
  abandonTerritory(guildId, territoryId, reason = 'voluntary') {
    const territory = this.territories.get(territoryId);
    if (!territory || territory.ownerGuildId !== guildId) {
      return { success: false, error: 'Territory not owned by guild' };
    }
    
    // Remove from guild territories
    const guildTerritories = this.guildTerritories.get(guildId);
    if (guildTerritories) {
      guildTerritories.delete(territoryId);
    }
    
    // Reset territory to unclaimed
    territory.ownerGuildId = null;
    territory.claimedAt = null;
    territory.state = TERRITORY_STATES.ABANDONED;
    territory.vulnerabilityWindow = null;
    
    // Reduce development level but keep some infrastructure
    territory.developmentLevel = Math.floor(territory.developmentLevel * 0.5);
    territory.defensiveRating = Math.floor(territory.defensiveRating * 0.3);
    territory.structures = territory.structures.slice(0, Math.floor(territory.structures.length * 0.3));
    
    // Record abandonment
    territory.history.push({
      action: 'abandoned',
      guildId,
      reason,
      timestamp: Date.now()
    });
    
    console.log(`[TerritoryControlSystem] Territory ${territoryId} abandoned by guild ${guildId}: ${reason}`);
    
    // Emit abandonment event
    this.engine.events.emit('territory:abandoned', {
      territoryId,
      guildId,
      reason
    });
    
    // Territory becomes claimable again after 24 hours
    setTimeout(() => {
      if (territory.state === TERRITORY_STATES.ABANDONED) {
        territory.state = TERRITORY_STATES.UNCLAIMED;
      }
    }, 24 * 60 * 60 * 1000);
    
    return { success: true };
  }

  /**
   * Update strategic network bonuses for guilds
   */
  updateStrategicNetworks() {
    for (const [guildId, territories] of this.guildTerritories) {
      if (territories.size === 0) continue;
      
      const network = {
        totalTerritories: territories.size,
        territoryTypes: new Map(),
        strategicValue: 0,
        networkBonuses: {}
      };
      
      // Analyze guild's territory portfolio
      for (const territoryId of territories) {
        const territory = this.territories.get(territoryId);
        if (!territory) continue;
        
        network.strategicValue += territory.strategicValue;
        
        const typeName = territory.type.name;
        if (!network.territoryTypes.has(typeName)) {
          network.territoryTypes.set(typeName, 0);
        }
        network.territoryTypes.set(typeName, network.territoryTypes.get(typeName) + 1);
      }
      
      // Calculate network bonuses
      if (network.territoryTypes.get('Trade Hub') >= 2) {
        network.networkBonuses.tradeNetworkBonus = 1.2;
      }
      
      if (network.territoryTypes.get('Military Outpost') >= 3) {
        network.networkBonuses.militaryNetworkBonus = 1.3;
      }
      
      if (network.totalTerritories >= 5) {
        network.networkBonuses.empireBonus = 1.1;
      }
      
      this.strategicNetwork.set(guildId, network);
    }
  }

  notifyTerritoryAttack(territory, attack) {
    // Notify all guild members of the attack
    this.engine.events.emit('guild:territory_under_attack', {
      guildId: territory.ownerGuildId,
      territoryId: territory.id,
      territoryName: territory.name,
      attackingGuildId: attack.attackingGuildId,
      timeToResolve: attack.resolvesAt - Date.now()
    });
  }

  processVulnerabilityWindows() {
    // Check all owned territories for vulnerability window status
    for (const territory of this.territories.values()) {
      if (territory.ownerGuildId && territory.vulnerabilityWindow) {
        const isVulnerable = this.isInVulnerabilityWindow(territory);
        
        // Emit vulnerability status changes
        this.engine.events.emit('territory:vulnerability_status', {
          territoryId: territory.id,
          isVulnerable,
          window: territory.vulnerabilityWindow
        });
      }
    }
  }

  // ── Event Handlers ──────────────────────────────────────────────────────────

  onGuildCreated(event) {
    const { guildId } = event;
    this.guildTerritories.set(guildId, new Set());
  }

  onGuildDisbanded(event) {
    const { guildId } = event;
    
    // Abandon all guild territories
    const territories = this.guildTerritories.get(guildId);
    if (territories) {
      for (const territoryId of territories) {
        this.abandonTerritory(guildId, territoryId, 'guild_disbanded');
      }
    }
    
    this.guildTerritories.delete(guildId);
  }

  onFleetCombat(event) {
    const { fleetId, location } = event;
    
    // Check if combat is in claimed territory
    const territoryId = this.systemTerritories.get(location.systemId);
    if (territoryId) {
      const territory = this.territories.get(territoryId);
      
      if (territory && territory.ownerGuildId) {
        // Combat in claimed territory may affect defensive bonuses
        this.engine.events.emit('territory:combat_in_territory', {
          territoryId,
          ownerGuildId: territory.ownerGuildId,
          fleetId
        });
      }
    }
  }

  onSystemDiscovered(event) {
    const { systemId, discoveredBy } = event;
    
    // Check if new system should have claimable territory
    if (!this.systemTerritories.has(systemId)) {
      // Chance for frontier systems to be claimable
      if (Math.random() < 0.3) {
        const territoryType = TERRITORY_TYPES.FRONTIER_COLONY;
        const systemData = { name: systemId };
        this.createTerritory(systemId, territoryType, systemData);
        
        console.log(`[TerritoryControlSystem] New claimable territory discovered: ${systemId}`);
      }
    }
  }

  // ── Utility Functions ───────────────────────────────────────────────────────

  generateTerritoryId(systemId) {
    return `territory_${systemId}_${Date.now()}`;
  }

  generateAttackId() {
    return 'attack_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getDominantSystemFaction(systemIndex) {
    // Determine which faction controls this system based on procedural generation
    if (systemIndex < 5) return 'hegemony_vanguard';
    if (systemIndex < 10) return 'free_traders';
    if (systemIndex < 15) return 'void_cult';
    if (systemIndex < 20) return 'iron_syndicate';
    // etc...
    return null;
  }

  calculateGuildFactionReputation(guildId, factionId) {
    // Calculate average faction reputation of guild members
    const guildSystem = this.engine.getSystem('guilds');
    const guild = guildSystem.getGuild(guildId);
    
    if (!guild) return 0;
    
    // Placeholder - would integrate with actual faction system
    return 0;
  }

  /**
   * Get all territories owned by a guild
   */
  getGuildTerritories(guildId) {
    const territoryIds = this.guildTerritories.get(guildId) || new Set();
    return Array.from(territoryIds).map(id => this.territories.get(id)).filter(t => t);
  }

  /**
   * Get territory information by system
   */
  getTerritoryBySystem(systemId) {
    const territoryId = this.systemTerritories.get(systemId);
    return territoryId ? this.territories.get(territoryId) : null;
  }

  /**
   * Get all claimable territories
   */
  getClaimableTerritories() {
    return Array.from(this.territories.values()).filter(t => 
      t.state === TERRITORY_STATES.UNCLAIMED
    );
  }

  /**
   * Get territory conflict information
   */
  getTerritoryConflicts(territoryId) {
    return this.territoryAttacks.get(territoryId) || [];
  }

  /**
   * Get guild strategic network information
   */
  getGuildStrategicNetwork(guildId) {
    return this.strategicNetwork.get(guildId) || null;
  }

  /**
   * Search territories by criteria
   */
  searchTerritories(criteria = {}) {
    const results = [];
    
    for (const territory of this.territories.values()) {
      let matches = true;
      
      if (criteria.type && territory.type.name !== criteria.type) {
        matches = false;
      }
      
      if (criteria.state && territory.state !== criteria.state) {
        matches = false;
      }
      
      if (criteria.ownerGuildId && territory.ownerGuildId !== criteria.ownerGuildId) {
        matches = false;
      }
      
      if (criteria.minStrategicValue && territory.strategicValue < criteria.minStrategicValue) {
        matches = false;
      }
      
      if (criteria.systemId && territory.systemId !== criteria.systemId) {
        matches = false;
      }
      
      if (matches) {
        results.push(territory);
      }
    }
    
    return results.sort((a, b) => b.strategicValue - a.strategicValue);
  }
}