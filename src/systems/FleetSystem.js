/**
 * FleetSystem — Coordinated group operations and tactical gameplay
 * 
 * Enables players to form fleets for:
 * - Coordinated movement and navigation
 * - Shared mission objectives and rewards
 * - Fleet combat with tactical bonuses
 * - Group exploration and wormhole expeditions
 * - Fleet chat and tactical coordination
 *
 * INTEGRATION POINTS:
 * - GuildSystem: Guild members get fleet formation bonuses
 * - ExplorationSystem: Fleet wormhole transit and shared discoveries
 * - CombatSystem: Coordinated attacks and fleet combat bonuses
 * - CommunicationSystem: Fleet tactical channels
 */

// ── Fleet Roles and Structure ───────────────────────────────────────────────

export const FLEET_ROLES = Object.freeze({
  FLEET_COMMANDER: 'fleet_commander',
  WING_COMMANDER: 'wing_commander', 
  SQUAD_LEADER: 'squad_leader',
  MEMBER: 'member'
});

export const FLEET_ROLE_PERMISSIONS = Object.freeze({
  [FLEET_ROLES.FLEET_COMMANDER]: {
    level: 4,
    name: 'Fleet Commander',
    permissions: ['*'], // Full fleet control
    color: '#FFD700',
    maxFleetSize: 50
  },
  [FLEET_ROLES.WING_COMMANDER]: {
    level: 3,
    name: 'Wing Commander',
    permissions: ['set_destination', 'manage_wing', 'tactical_commands'],
    color: '#FF6B35',
    maxWingSize: 15
  },
  [FLEET_ROLES.SQUAD_LEADER]: {
    level: 2,
    name: 'Squad Leader', 
    permissions: ['manage_squad', 'tactical_commands'],
    color: '#4ECDC4',
    maxSquadSize: 5
  },
  [FLEET_ROLES.MEMBER]: {
    level: 1,
    name: 'Member',
    permissions: ['follow', 'chat'],
    color: '#96CEB4',
    maxSquadSize: 1
  }
});

// ── Fleet Types and Configurations ──────────────────────────────────────────

export const FLEET_TYPES = Object.freeze({
  CASUAL: {
    name: 'Casual Fleet',
    maxSize: 10,
    bonuses: { experience: 1.1 },
    requirements: { minRep: 0 }
  },
  MILITARY: {
    name: 'Military Fleet', 
    maxSize: 25,
    bonuses: { combat: 1.2, experience: 1.15 },
    requirements: { minRep: 100, guildRequired: false }
  },
  GUILD: {
    name: 'Guild Fleet',
    maxSize: 50,
    bonuses: { combat: 1.3, loot: 1.2, experience: 1.25 },
    requirements: { minRep: 0, guildRequired: true }
  },
  EXPEDITION: {
    name: 'Deep Space Expedition',
    maxSize: 15,
    bonuses: { exploration: 1.4, discovery: 1.3 },
    requirements: { minRep: 200, explorationSkill: 3 }
  }
});

// ── Fleet Formation Patterns ────────────────────────────────────────────────

const FORMATION_PATTERNS = Object.freeze({
  COLUMN: {
    name: 'Column Formation',
    spacing: 500,
    pattern: 'line',
    bonuses: { speed: 1.1 },
    penalties: { defense: 0.9 }
  },
  WALL: {
    name: 'Wall Formation',
    spacing: 300,
    pattern: 'wall',
    bonuses: { defense: 1.2 },
    penalties: { speed: 0.9 }
  },
  WEDGE: {
    name: 'Wedge Formation',
    spacing: 400,  
    pattern: 'wedge',
    bonuses: { attack: 1.15, speed: 1.05 },
    penalties: {}
  },
  SPHERE: {
    name: 'Sphere Formation',
    spacing: 600,
    pattern: 'sphere', 
    bonuses: { defense: 1.1, coverage: 1.3 },
    penalties: { speed: 0.85 }
  }
});

export class FleetSystem {
  constructor(engine) {
    this.engine = engine;
    
    // Active fleet data
    this.fleets = new Map(); // fleetId -> Fleet
    this.playerFleets = new Map(); // playerId -> fleetId
    
    // Fleet invitations and recruitment
    this.fleetInvites = new Map(); // playerId -> [invite, ...]
    this.openFleets = new Map(); // fleetId -> recruitmentInfo
    
    // Tactical coordination
    this.fleetObjectives = new Map(); // fleetId -> Objective[]
    this.fleetFormations = new Map(); // fleetId -> Formation
    this.fleetDestinations = new Map(); // fleetId -> { system, coordinates }
    
    // Performance tracking
    this.fleetStats = new Map(); // fleetId -> Statistics
    this.fleetHistory = new Map(); // playerId -> FleetRecord[]
  }

  async init() {
    console.log('[FleetSystem] Initializing fleet coordination...');
    
    // Listen for relevant game events
    this.engine.events.on('player:system_change', this.onPlayerSystemChange.bind(this));
    this.engine.events.on('combat:engagement', this.onCombatEngagement.bind(this));
    this.engine.events.on('exploration:discovery', this.onExplorationDiscovery.bind(this));
    this.engine.events.on('player:disconnected', this.onPlayerDisconnected.bind(this));
    
    // Update fleet formations and positions every 2 seconds
    setInterval(() => {
      this.updateFleetFormations();
    }, 2000);
    
    // Clean up empty fleets every minute
    setInterval(() => {
      this.cleanupEmptyFleets();
    }, 60000);
    
    return true;
  }

  // ── Fleet Creation and Management ───────────────────────────────────────────

  /**
   * Create a new fleet with specified configuration
   */
  createFleet(commanderId, fleetName, fleetType = 'CASUAL', options = {}) {
    // Validation
    if (this.playerFleets.has(commanderId)) {
      return { success: false, error: 'Already in a fleet' };
    }
    
    const fleetConfig = FLEET_TYPES[fleetType];
    if (!fleetConfig) {
      return { success: false, error: 'Invalid fleet type' };
    }
    
    // Check requirements
    const meetsRequirements = this.checkFleetRequirements(commanderId, fleetConfig);
    if (!meetsRequirements.valid) {
      return { success: false, error: meetsRequirements.error };
    }
    
    // Create fleet
    const fleetId = this.generateFleetId();
    const fleet = {
      id: fleetId,
      name: fleetName.slice(0, 32),
      type: fleetType,
      config: fleetConfig,
      commanderId,
      createdAt: Date.now(),
      
      // Fleet structure
      members: new Map(), // playerId -> FleetMember
      memberCount: 1,
      wings: new Map(), // wingId -> Wing
      
      // Tactical state
      formation: 'COLUMN',
      destination: null,
      objectives: [],
      status: 'forming', // forming, active, combat, disbanded
      
      // Coordination
      lastCommand: null,
      chatHistory: [],
      tacticalData: {
        averagePosition: null,
        combatReadiness: 0,
        totalFirepower: 0
      },
      
      // Settings
      openRecruitment: options.openRecruitment || false,
      minRep: options.minRep || 0,
      description: options.description || '',
      
      // Statistics
      stats: {
        missionsCompleted: 0,
        enemiesDestroyed: 0,
        systemsExplored: 0,
        lootCollected: 0,
        timeActive: 0
      }
    };
    
    // Add commander as fleet commander
    fleet.members.set(commanderId, {
      playerId: commanderId,
      role: FLEET_ROLES.FLEET_COMMANDER,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      position: null,
      status: 'active',
      stats: {
        contributedKills: 0,
        timeInFleet: 0
      }
    });
    
    // Register fleet
    this.fleets.set(fleetId, fleet);
    this.playerFleets.set(commanderId, fleetId);
    
    // Set up open recruitment if enabled
    if (fleet.openRecruitment) {
      this.openFleets.set(fleetId, {
        fleetId,
        commanderId,
        fleetName,
        fleetType,
        memberCount: 1,
        maxMembers: fleetConfig.maxSize,
        minRep: fleet.minRep
      });
    }
    
    console.log(`[FleetSystem] Fleet "${fleetName}" created by ${commanderId}`);
    
    // Emit fleet creation event
    this.engine.events.emit('fleet:created', {
      fleetId,
      commanderId,
      fleetName,
      fleetType
    });
    
    return { success: true, fleetId, fleet };
  }

  /**
   * Invite player to join fleet
   */
  inviteToFleet(inviterId, targetId, fleetId) {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) {
      return { success: false, error: 'Fleet not found' };
    }
    
    // Check inviter permissions
    const inviter = fleet.members.get(inviterId);
    if (!inviter || !this.hasFleetPermission(inviter.role, 'invite')) {
      return { success: false, error: 'No permission to invite' };
    }
    
    // Check if target is available
    if (this.playerFleets.has(targetId)) {
      return { success: false, error: 'Player already in fleet' };
    }
    
    // Check fleet capacity
    if (fleet.memberCount >= fleet.config.maxSize) {
      return { success: false, error: 'Fleet at capacity' };
    }
    
    // Check target meets requirements
    const meetsRequirements = this.checkFleetRequirements(targetId, fleet.config);
    if (!meetsRequirements.valid) {
      return { success: false, error: meetsRequirements.error };
    }
    
    // Create invitation
    const invite = {
      id: this.generateInviteId(),
      fleetId,
      fleetName: fleet.name,
      inviterId,
      targetId,
      sentAt: Date.now(),
      expiresAt: Date.now() + 300000 // 5 minutes
    };
    
    // Add to target's pending invites
    if (!this.fleetInvites.has(targetId)) {
      this.fleetInvites.set(targetId, []);
    }
    this.fleetInvites.get(targetId).push(invite);
    
    // Emit invitation event
    this.engine.events.emit('fleet:invite', {
      invite,
      inviterName: this.getPlayerName(inviterId)
    });
    
    return { success: true };
  }

  /**
   * Accept fleet invitation
   */
  acceptFleetInvite(targetId, inviteId) {
    const invites = this.fleetInvites.get(targetId) || [];
    const inviteIndex = invites.findIndex(inv => inv.id === inviteId);
    
    if (inviteIndex === -1) {
      return { success: false, error: 'Invitation not found' };
    }
    
    const invite = invites[inviteIndex];
    
    // Check expiration
    if (Date.now() > invite.expiresAt) {
      invites.splice(inviteIndex, 1);
      return { success: false, error: 'Invitation expired' };
    }
    
    // Check if already in fleet
    if (this.playerFleets.has(targetId)) {
      return { success: false, error: 'Already in a fleet' };
    }
    
    // Add to fleet
    const result = this.joinFleet(targetId, invite.fleetId);
    if (!result.success) {
      return result;
    }
    
    // Remove invitation
    invites.splice(inviteIndex, 1);
    
    return { success: true, fleetId: invite.fleetId };
  }

  /**
   * Join a fleet (internal method)
   */
  joinFleet(playerId, fleetId) {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) {
      return { success: false, error: 'Fleet not found' };
    }
    
    // Check capacity and requirements
    if (fleet.memberCount >= fleet.config.maxSize) {
      return { success: false, error: 'Fleet at capacity' };
    }
    
    const meetsRequirements = this.checkFleetRequirements(playerId, fleet.config);
    if (!meetsRequirements.valid) {
      return { success: false, error: meetsRequirements.error };
    }
    
    // Add member to fleet
    fleet.members.set(playerId, {
      playerId,
      role: FLEET_ROLES.MEMBER,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      position: null,
      status: 'active',
      stats: {
        contributedKills: 0,
        timeInFleet: 0
      }
    });
    
    fleet.memberCount++;
    this.playerFleets.set(playerId, fleetId);
    
    // Update fleet status if needed
    if (fleet.status === 'forming' && fleet.memberCount >= 3) {
      fleet.status = 'active';
    }
    
    // Emit member joined event
    this.engine.events.emit('fleet:member_joined', {
      fleetId,
      playerId,
      memberCount: fleet.memberCount
    });
    
    return { success: true };
  }

  // ── Fleet Formation and Movement ────────────────────────────────────────────

  /**
   * Set fleet formation pattern
   */
  setFleetFormation(commanderId, fleetId, formationName) {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) {
      return { success: false, error: 'Fleet not found' };
    }
    
    const commander = fleet.members.get(commanderId);
    if (!commander || !this.hasFleetPermission(commander.role, 'set_formation')) {
      return { success: false, error: 'No permission to set formation' };
    }
    
    const formation = FORMATION_PATTERNS[formationName];
    if (!formation) {
      return { success: false, error: 'Invalid formation' };
    }
    
    fleet.formation = formationName;
    fleet.lastCommand = {
      type: 'formation',
      data: formationName,
      issuedBy: commanderId,
      timestamp: Date.now()
    };
    
    // Emit formation change
    this.engine.events.emit('fleet:formation_changed', {
      fleetId,
      formation: formationName,
      commanderId
    });
    
    return { success: true };
  }

  /**
   * Set fleet destination for coordinated movement
   */
  setFleetDestination(commanderId, fleetId, destination) {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) {
      return { success: false, error: 'Fleet not found' };
    }
    
    const commander = fleet.members.get(commanderId);
    if (!commander || !this.hasFleetPermission(commander.role, 'set_destination')) {
      return { success: false, error: 'No permission to set destination' };
    }
    
    fleet.destination = {
      systemId: destination.systemId,
      coordinates: destination.coordinates || null,
      setAt: Date.now(),
      setBy: commanderId
    };
    
    fleet.lastCommand = {
      type: 'move',
      data: destination,
      issuedBy: commanderId,
      timestamp: Date.now()
    };
    
    // Emit movement command
    this.engine.events.emit('fleet:destination_set', {
      fleetId,
      destination: fleet.destination,
      commanderId
    });
    
    return { success: true };
  }

  /**
   * Update fleet formations based on current positions
   */
  updateFleetFormations() {
    for (const fleet of this.fleets.values()) {
      if (fleet.status !== 'active' || fleet.memberCount < 2) continue;
      
      const formation = FORMATION_PATTERNS[fleet.formation];
      if (!formation) continue;
      
      // Calculate formation positions for all members
      const positions = this.calculateFormationPositions(fleet, formation);
      
      // Update tactical data
      fleet.tacticalData.averagePosition = this.calculateAveragePosition(positions);
      fleet.tacticalData.combatReadiness = this.calculateCombatReadiness(fleet);
      
      // Emit formation update for real-time client updates
      this.engine.events.emit('fleet:formation_update', {
        fleetId: fleet.id,
        positions,
        formation: fleet.formation,
        tacticalData: fleet.tacticalData
      });
    }
  }

  // ── Fleet Combat and Coordination ───────────────────────────────────────────

  /**
   * Process fleet combat engagement
   */
  processFleetCombat(fleetId, enemyData) {
    const fleet = this.fleets.get(fleetId);
    if (!fleet || fleet.status === 'disbanded') return;
    
    fleet.status = 'combat';
    
    // Calculate fleet combat bonuses
    const bonuses = this.calculateFleetCombatBonuses(fleet);
    
    // Apply formation bonuses
    const formation = FORMATION_PATTERNS[fleet.formation];
    if (formation && formation.bonuses.attack) {
      bonuses.attack *= formation.bonuses.attack;
    }
    
    // Emit fleet combat event
    this.engine.events.emit('fleet:combat_engaged', {
      fleetId,
      bonuses,
      formation: fleet.formation,
      memberCount: fleet.memberCount
    });
    
    return bonuses;
  }

  /**
   * Distribute combat rewards among fleet members
   */
  distributeFleetRewards(fleetId, rewards) {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return;
    
    const activeMembers = Array.from(fleet.members.values())
      .filter(member => member.status === 'active');
    
    if (activeMembers.length === 0) return;
    
    // Calculate reward distribution based on participation
    const baseShare = Math.floor(rewards.credits / activeMembers.length);
    const bonusPool = rewards.credits % activeMembers.length;
    
    for (let i = 0; i < activeMembers.length; i++) {
      const member = activeMembers[i];
      let memberReward = baseShare;
      
      // Give bonus to higher roles
      if (member.role === FLEET_ROLES.FLEET_COMMANDER) memberReward += 2;
      else if (member.role === FLEET_ROLES.WING_COMMANDER) memberReward += 1;
      
      // Distribute remaining bonus randomly
      if (i < bonusPool) memberReward += 1;
      
      // Apply fleet bonus from configuration
      memberReward = Math.floor(memberReward * (fleet.config.bonuses.experience || 1));
      
      // Award to player
      const economySystem = this.engine.getSystem('economy');
      economySystem.credit(member.playerId, 'ec', memberReward);
      
      // Update stats
      member.stats.contributedKills += 1;
      fleet.stats.enemiesDestroyed += 1;
    }
    
    fleet.stats.lootCollected += rewards.credits;
    
    // Emit reward distribution
    this.engine.events.emit('fleet:rewards_distributed', {
      fleetId,
      totalReward: rewards.credits,
      memberCount: activeMembers.length,
      bonuses: fleet.config.bonuses
    });
  }

  // ── Fleet Requirements and Validation ───────────────────────────────────────

  /**
   * Check if player meets fleet requirements
   */
  checkFleetRequirements(playerId, fleetConfig) {
    // Check reputation requirement
    if (fleetConfig.requirements.minRep > 0) {
      const factionSystem = this.engine.getSystem('factions');
      if (factionSystem) {
        // Check highest faction reputation
        const playerRep = this.getPlayerHighestRep(playerId);
        if (playerRep < fleetConfig.requirements.minRep) {
          return { valid: false, error: `Requires ${fleetConfig.requirements.minRep} reputation` };
        }
      }
    }
    
    // Check guild requirement
    if (fleetConfig.requirements.guildRequired) {
      const guildSystem = this.engine.getSystem('guilds');
      if (guildSystem && !guildSystem.getPlayerGuild(playerId)) {
        return { valid: false, error: 'Must be in a guild' };
      }
    }
    
    // Check skill requirements
    if (fleetConfig.requirements.explorationSkill) {
      const skillSystem = this.engine.getSystem('skills');
      if (skillSystem) {
        const explorationSkill = skillSystem.getSkillLevel(playerId, 'exploration');
        if (explorationSkill < fleetConfig.requirements.explorationSkill) {
          return { valid: false, error: 'Insufficient exploration skill' };
        }
      }
    }
    
    return { valid: true };
  }

  // ── Event Handlers ──────────────────────────────────────────────────────────

  onPlayerSystemChange(event) {
    const { playerId, oldSystem, newSystem } = event;
    const fleetId = this.playerFleets.get(playerId);
    
    if (fleetId) {
      const fleet = this.fleets.get(fleetId);
      const member = fleet.members.get(playerId);
      
      if (member) {
        member.lastSeen = Date.now();
        
        // Update fleet exploration stats
        fleet.stats.systemsExplored += 1;
        
        // Check if player is following fleet destination
        if (fleet.destination && fleet.destination.systemId === newSystem) {
          this.engine.events.emit('fleet:destination_reached', {
            fleetId,
            playerId,
            systemId: newSystem
          });
        }
      }
    }
  }

  onCombatEngagement(event) {
    const { playerId } = event;
    const fleetId = this.playerFleets.get(playerId);
    
    if (fleetId) {
      // Calculate and apply fleet combat bonuses
      const bonuses = this.processFleetCombat(fleetId, event.enemyData);
      return bonuses;
    }
  }

  onExplorationDiscovery(event) {
    const { playerId, discovery } = event;
    const fleetId = this.playerFleets.get(playerId);
    
    if (fleetId) {
      const fleet = this.fleets.get(fleetId);
      
      // Share exploration discovery with fleet
      this.engine.events.emit('fleet:shared_discovery', {
        fleetId,
        discoveredBy: playerId,
        discovery,
        bonusMultiplier: fleet.config.bonuses.exploration || 1
      });
    }
  }

  onPlayerDisconnected(event) {
    const { playerId } = event;
    const fleetId = this.playerFleets.get(playerId);
    
    if (fleetId) {
      const fleet = this.fleets.get(fleetId);
      const member = fleet.members.get(playerId);
      
      if (member) {
        member.status = 'offline';
        member.lastSeen = Date.now();
        
        // If commander disconnected, transfer command or disband
        if (member.role === FLEET_ROLES.FLEET_COMMANDER) {
          this.handleCommanderDisconnect(fleetId);
        }
      }
    }
  }

  // ── Utility and Helper Methods ──────────────────────────────────────────────

  handleCommanderDisconnect(fleetId) {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return;
    
    // Find highest ranking active member
    let newCommander = null;
    let highestRank = 0;
    
    for (const member of fleet.members.values()) {
      if (member.status === 'active') {
        const roleLevel = FLEET_ROLE_PERMISSIONS[member.role].level;
        if (roleLevel > highestRank) {
          highestRank = roleLevel;
          newCommander = member;
        }
      }
    }
    
    if (newCommander) {
      // Promote to commander
      newCommander.role = FLEET_ROLES.FLEET_COMMANDER;
      fleet.commanderId = newCommander.playerId;
      
      this.engine.events.emit('fleet:command_transferred', {
        fleetId,
        newCommanderId: newCommander.playerId
      });
    } else {
      // No active members, disband fleet
      this.disbandFleet(fleetId, 'no_active_members');
    }
  }

  calculateFleetCombatBonuses(fleet) {
    const bonuses = {
      attack: 1.0,
      defense: 1.0,
      experience: fleet.config.bonuses.experience || 1.0
    };
    
    // Size-based bonuses (diminishing returns)
    const sizeBonus = Math.min(0.5, fleet.memberCount * 0.05);
    bonuses.attack += sizeBonus;
    bonuses.defense += sizeBonus * 0.8;
    
    // Fleet type bonuses
    if (fleet.config.bonuses.combat) {
      bonuses.attack *= fleet.config.bonuses.combat;
      bonuses.defense *= fleet.config.bonuses.combat;
    }
    
    return bonuses;
  }

  calculateFormationPositions(fleet, formation) {
    const positions = new Map();
    const members = Array.from(fleet.members.values())
      .filter(m => m.status === 'active');
    
    // Simple formation calculation (would be more complex in full implementation)
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      let position;
      
      switch (formation.pattern) {
        case 'line':
          position = { x: i * formation.spacing, y: 0, z: 0 };
          break;
        case 'wall':
          const cols = Math.ceil(Math.sqrt(members.length));
          position = { 
            x: (i % cols) * formation.spacing, 
            y: Math.floor(i / cols) * formation.spacing, 
            z: 0 
          };
          break;
        case 'wedge':
          const row = Math.floor(Math.sqrt(i));
          position = { 
            x: (i - row * row) * formation.spacing - row * formation.spacing / 2, 
            y: row * formation.spacing, 
            z: 0 
          };
          break;
        default:
          position = { x: 0, y: 0, z: 0 };
      }
      
      positions.set(member.playerId, position);
    }
    
    return positions;
  }

  calculateAveragePosition(positions) {
    if (positions.size === 0) return { x: 0, y: 0, z: 0 };
    
    let totalX = 0, totalY = 0, totalZ = 0;
    for (const pos of positions.values()) {
      totalX += pos.x;
      totalY += pos.y; 
      totalZ += pos.z;
    }
    
    return {
      x: totalX / positions.size,
      y: totalY / positions.size,
      z: totalZ / positions.size
    };
  }

  calculateCombatReadiness(fleet) {
    const activeMembers = Array.from(fleet.members.values())
      .filter(m => m.status === 'active');
    
    // Simple readiness calculation (would integrate with ship fitting, fuel, etc.)
    return Math.min(1.0, activeMembers.length / 5);
  }

  disbandFleet(fleetId, reason = 'disbanded') {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) return;
    
    fleet.status = 'disbanded';
    fleet.disbandedAt = Date.now();
    fleet.disbandReason = reason;
    
    // Remove all members from fleet
    for (const playerId of fleet.members.keys()) {
      this.playerFleets.delete(playerId);
    }
    
    // Clean up fleet data
    this.openFleets.delete(fleetId);
    
    // Emit disbandment event
    this.engine.events.emit('fleet:disbanded', {
      fleetId,
      reason,
      finalStats: fleet.stats
    });
    
    console.log(`[FleetSystem] Fleet ${fleetId} disbanded: ${reason}`);
  }

  cleanupEmptyFleets() {
    for (const [fleetId, fleet] of this.fleets) {
      if (fleet.memberCount === 0 || 
          (fleet.status === 'forming' && Date.now() - fleet.createdAt > 600000)) {
        this.disbandFleet(fleetId, 'empty_or_expired');
      }
    }
  }

  hasFleetPermission(role, permission) {
    const roleConfig = FLEET_ROLE_PERMISSIONS[role];
    if (!roleConfig) return false;
    
    return roleConfig.permissions.includes('*') || 
           roleConfig.permissions.includes(permission);
  }

  generateFleetId() {
    return 'fleet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateInviteId() {
    return 'invite_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getPlayerName(playerId) {
    // Integration with player system
    return `Player_${playerId.slice(-8)}`;
  }

  getPlayerHighestRep(playerId) {
    // Integration with faction system
    return 0; // Placeholder
  }

  /**
   * Get player's current fleet
   */
  getPlayerFleet(playerId) {
    const fleetId = this.playerFleets.get(playerId);
    return fleetId ? this.fleets.get(fleetId) : null;
  }

  /**
   * Get all active fleets
   */
  getActiveFleets() {
    return Array.from(this.fleets.values())
      .filter(fleet => fleet.status === 'active' || fleet.status === 'forming');
  }

  /**
   * Search for fleets to join
   */
  searchFleets(playerId, criteria = {}) {
    const results = [];
    
    for (const fleet of this.openFleets.values()) {
      const fleetData = this.fleets.get(fleet.fleetId);
      if (!fleetData || fleetData.status === 'disbanded') continue;
      
      // Check if player meets requirements
      const meetsReq = this.checkFleetRequirements(playerId, fleetData.config);
      if (!meetsReq.valid) continue;
      
      // Apply search criteria
      if (criteria.type && fleetData.type !== criteria.type) continue;
      if (criteria.minSize && fleetData.memberCount < criteria.minSize) continue;
      if (criteria.maxSize && fleetData.memberCount > criteria.maxSize) continue;
      
      results.push({
        fleetId: fleet.fleetId,
        name: fleetData.name,
        type: fleetData.type,
        memberCount: fleetData.memberCount,
        maxMembers: fleetData.config.maxSize,
        commander: this.getPlayerName(fleetData.commanderId),
        description: fleetData.description,
        bonuses: fleetData.config.bonuses
      });
    }
    
    return results;
  }
}