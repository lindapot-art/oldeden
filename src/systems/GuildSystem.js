/**
 * GuildSystem — Player organizations with shared resources and progression
 * 
 * Provides corporation-style guilds where players can:
 * - Form persistent organizations with role hierarchy 
 * - Share resources through guild hangars and treasury
 * - Coordinate group activities and fleet operations
 * - Compete for territory and reputation
 * - Progress together through guild-specific content
 *
 * INTEGRATION POINTS:
 * - FactionSystem: Guild reputation affects faction relationships
 * - TerritoryControlSystem: Guilds claim and defend star systems
 * - FleetSystem: Guild members form coordinated fleets
 * - AuctionHouseSystem: Guild taxation and market access
 */

// ── Guild Role Definitions ──────────────────────────────────────────────────

export const GUILD_ROLES = Object.freeze({
  GUILD_MASTER: 'guild_master',
  DIRECTOR: 'director', 
  OFFICER: 'officer',
  MEMBER: 'member',
  RECRUIT: 'recruit'
});

export const ROLE_PERMISSIONS = Object.freeze({
  [GUILD_ROLES.GUILD_MASTER]: {
    level: 5,
    name: 'Guild Master',
    permissions: ['*'], // Full control
    color: '#FFD700'
  },
  [GUILD_ROLES.DIRECTOR]: {
    level: 4,
    name: 'Director',
    permissions: ['invite', 'kick_below', 'manage_hangar', 'manage_treasury', 'diplomacy'],
    color: '#FF6B35'
  },
  [GUILD_ROLES.OFFICER]: {
    level: 3,
    name: 'Officer', 
    permissions: ['invite', 'kick_recruit', 'view_hangar', 'fleet_commander'],
    color: '#4ECDC4'
  },
  [GUILD_ROLES.MEMBER]: {
    level: 2,
    name: 'Member',
    permissions: ['use_hangar', 'join_fleet', 'chat'],
    color: '#45B7D1'
  },
  [GUILD_ROLES.RECRUIT]: {
    level: 1,
    name: 'Recruit',
    permissions: ['chat'],
    color: '#96CEB4'
  }
});

// ── Guild Creation Requirements ─────────────────────────────────────────────

const GUILD_CREATION_COST = 1000; // Credits required to create guild
const MIN_MEMBERS_FOR_BENEFITS = 10; // Minimum active members for full benefits
const MAX_GUILD_SIZE = 200; // Maximum guild membership
const MAX_GUILD_NAME_LENGTH = 32;
const MAX_GUILD_DESC_LENGTH = 256;

// ── Guild Progression Tiers ────────────────────────────────────────────────

const GUILD_TIERS = Object.freeze({
  STARTUP: { level: 1, name: 'Startup', minRep: 0, maxMembers: 50, hangarSlots: 100 },
  ESTABLISHED: { level: 2, name: 'Established', minRep: 1000, maxMembers: 100, hangarSlots: 250 },
  CORPORATION: { level: 3, name: 'Corporation', minRep: 5000, maxMembers: 150, hangarSlots: 500 },
  EMPIRE: { level: 4, name: 'Empire', minRep: 15000, maxMembers: 200, hangarSlots: 1000 }
});

export class GuildSystem {
  constructor(engine) {
    this.engine = engine;
    
    // Core guild data structures
    this.guilds = new Map(); // guildId -> Guild
    this.playerGuilds = new Map(); // playerId -> guildId
    this.guildInvites = new Map(); // playerId -> [guildId, ...]
    
    // Guild progression tracking
    this.guildReputationHistory = new Map(); // guildId -> ReputationEvent[]
    this.guildAchievements = new Map(); // guildId -> Achievement[]
    
    // Territory and diplomacy (integration hooks)
    this.guildTerritories = new Map(); // guildId -> Set(systemId)
    this.guildWars = new Map(); // guildId -> Set(enemyGuildId)
    this.guildAlliances = new Map(); // guildId -> Set(alliedGuildId)
  }

  async init() {
    console.log('[GuildSystem] Initializing player organizations...');
    
    // Listen for player events to sync guild state
    this.engine.events.on('player:connected', this.onPlayerConnected.bind(this));
    this.engine.events.on('player:disconnected', this.onPlayerDisconnected.bind(this));
    this.engine.events.on('combat:victory', this.onCombatVictory.bind(this));
    this.engine.events.on('exploration:discovery', this.onExplorationDiscovery.bind(this));
    
    return true;
  }

  // ── Guild Creation and Management ───────────────────────────────────────────

  /**
   * Create a new guild with the specified player as Guild Master
   */
  createGuild(founderId, guildName, description = '') {
    // Validation
    if (this.playerGuilds.has(founderId)) {
      return { success: false, error: 'Already in a guild' };
    }
    
    if (!guildName || guildName.length > MAX_GUILD_NAME_LENGTH) {
      return { success: false, error: 'Invalid guild name' };
    }
    
    if (description.length > MAX_GUILD_DESC_LENGTH) {
      return { success: false, error: 'Description too long' };
    }
    
    // Check if player has sufficient credits
    const economySystem = this.engine.getSystem('economy');
    if (!economySystem) {
      return { success: false, error: 'Economy system unavailable' };
    }
    
    const wallet = economySystem.getWallet(founderId);
    if (wallet.ec < GUILD_CREATION_COST) {
      return { success: false, error: 'Insufficient credits' };
    }
    
    // Create guild
    const guildId = this.generateGuildId();
    const guild = {
      id: guildId,
      name: guildName,
      description,
      foundedAt: Date.now(),
      founderId,
      tier: GUILD_TIERS.STARTUP,
      
      // Member management
      members: new Map(), // playerId -> { joinedAt, role, lastSeen }
      memberCount: 1,
      
      // Resources
      treasury: { ec: 0, sm: 0 }, // Guild shared currency
      hangar: new Map(), // itemId -> { item, quantity, depositedBy, timestamp }
      
      // Progression
      reputation: 0,
      achievements: [],
      
      // Relations
      territories: new Set(), // systemId
      wars: new Set(), // guildId
      alliances: new Set(), // guildId
      
      // Settings
      public: true, // Open recruitment vs invite-only
      taxRate: 0, // Percentage of member earnings contributed to treasury
      motd: '', // Message of the day
    };
    
    // Add founder as Guild Master
    guild.members.set(founderId, {
      joinedAt: Date.now(),
      role: GUILD_ROLES.GUILD_MASTER,
      lastSeen: Date.now(),
      contributed: { credits: GUILD_CREATION_COST, items: 0 }
    });
    
    // Deduct creation cost from founder
    economySystem.debit(founderId, 'ec', GUILD_CREATION_COST);
    
    // Store guild data
    this.guilds.set(guildId, guild);
    this.playerGuilds.set(founderId, guildId);
    
    console.log(`[GuildSystem] Guild "${guildName}" created by ${founderId}`);
    
    // Emit guild creation event
    this.engine.events.emit('guild:created', {
      guildId,
      founderId,
      guildName
    });
    
    return { success: true, guildId, guild };
  }

  /**
   * Invite a player to join a guild
   */
  invitePlayer(inviterId, targetPlayerId, guildId) {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }
    
    // Check inviter permissions
    const inviterMember = guild.members.get(inviterId);
    if (!inviterMember || !this.hasPermission(inviterMember.role, 'invite')) {
      return { success: false, error: 'No permission to invite' };
    }
    
    // Check if target is already in guild
    if (this.playerGuilds.has(targetPlayerId)) {
      return { success: false, error: 'Player already in a guild' };
    }
    
    // Check guild size limit
    if (guild.memberCount >= guild.tier.maxMembers) {
      return { success: false, error: 'Guild at member limit' };
    }
    
    // Add invite to player's pending invites
    if (!this.guildInvites.has(targetPlayerId)) {
      this.guildInvites.set(targetPlayerId, []);
    }
    
    const invites = this.guildInvites.get(targetPlayerId);
    if (invites.includes(guildId)) {
      return { success: false, error: 'Invite already pending' };
    }
    
    invites.push(guildId);
    
    // Emit invite event for real-time notification
    this.engine.events.emit('guild:invite', {
      guildId,
      guildName: guild.name,
      inviterId,
      targetPlayerId
    });
    
    return { success: true };
  }

  /**
   * Accept a guild invitation
   */
  acceptInvite(playerId, guildId) {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }
    
    // Check if invite exists
    const invites = this.guildInvites.get(playerId) || [];
    if (!invites.includes(guildId)) {
      return { success: false, error: 'No pending invite' };
    }
    
    // Check if already in guild
    if (this.playerGuilds.has(playerId)) {
      return { success: false, error: 'Already in a guild' };
    }
    
    // Check guild size limit
    if (guild.memberCount >= guild.tier.maxMembers) {
      return { success: false, error: 'Guild at member limit' };
    }
    
    // Add player to guild
    guild.members.set(playerId, {
      joinedAt: Date.now(),
      role: GUILD_ROLES.RECRUIT,
      lastSeen: Date.now(),
      contributed: { credits: 0, items: 0 }
    });
    
    guild.memberCount++;
    this.playerGuilds.set(playerId, guildId);
    
    // Remove invite
    const updatedInvites = invites.filter(id => id !== guildId);
    if (updatedInvites.length > 0) {
      this.guildInvites.set(playerId, updatedInvites);
    } else {
      this.guildInvites.delete(playerId);
    }
    
    // Emit join event
    this.engine.events.emit('guild:member_joined', {
      guildId,
      playerId,
      memberCount: guild.memberCount
    });
    
    return { success: true, guild };
  }

  // ── Role and Permission Management ──────────────────────────────────────────

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role, permission) {
    const roleConfig = ROLE_PERMISSIONS[role];
    if (!roleConfig) return false;
    
    return roleConfig.permissions.includes('*') || 
           roleConfig.permissions.includes(permission);
  }

  /**
   * Promote or demote a guild member
   */
  changeRole(actorId, targetId, newRole, guildId) {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return { success: false, error: 'Guild not found' };
    }
    
    const actor = guild.members.get(actorId);
    const target = guild.members.get(targetId);
    
    if (!actor || !target) {
      return { success: false, error: 'Invalid members' };
    }
    
    // Only Guild Master and Directors can change roles
    if (!this.hasPermission(actor.role, 'manage_roles')) {
      return { success: false, error: 'No permission to change roles' };
    }
    
    // Cannot change Guild Master role or promote above actor's level
    if (target.role === GUILD_ROLES.GUILD_MASTER || 
        ROLE_PERMISSIONS[newRole].level >= ROLE_PERMISSIONS[actor.role].level) {
      return { success: false, error: 'Cannot change to this role' };
    }
    
    target.role = newRole;
    
    // Emit role change event
    this.engine.events.emit('guild:role_changed', {
      guildId,
      actorId,
      targetId,
      newRole
    });
    
    return { success: true };
  }

  // ── Guild Hangar (Shared Storage) ───────────────────────────────────────────

  /**
   * Deposit an item into the guild hangar
   */
  depositToHangar(playerId, itemId, quantity = 1) {
    const guildId = this.playerGuilds.get(playerId);
    if (!guildId) {
      return { success: false, error: 'Not in a guild' };
    }
    
    const guild = this.guilds.get(guildId);
    const member = guild.members.get(playerId);
    
    if (!this.hasPermission(member.role, 'use_hangar')) {
      return { success: false, error: 'No hangar access' };
    }
    
    // Check hangar capacity
    const currentItems = Array.from(guild.hangar.values())
      .reduce((sum, item) => sum + item.quantity, 0);
    
    if (currentItems + quantity > guild.tier.hangarSlots) {
      return { success: false, error: 'Hangar full' };
    }
    
    // Get item from player inventory (integration with InventorySystem)
    const inventorySystem = this.engine.getSystem('inventory');
    if (!inventorySystem.hasItem(playerId, itemId, quantity)) {
      return { success: false, error: 'Insufficient items' };
    }
    
    // Transfer item
    inventorySystem.removeItem(playerId, itemId, quantity);
    
    const hangarKey = `${itemId}`;
    if (guild.hangar.has(hangarKey)) {
      const existing = guild.hangar.get(hangarKey);
      existing.quantity += quantity;
    } else {
      guild.hangar.set(hangarKey, {
        itemId,
        quantity,
        depositedBy: playerId,
        timestamp: Date.now()
      });
    }
    
    // Track contribution
    member.contributed.items += quantity;
    
    return { success: true };
  }

  // ── Guild Treasury Management ───────────────────────────────────────────────

  /**
   * Contribute credits to guild treasury
   */
  contributeTreasury(playerId, amount, currency = 'ec') {
    const guildId = this.playerGuilds.get(playerId);
    if (!guildId) {
      return { success: false, error: 'Not in a guild' };
    }
    
    const guild = this.guilds.get(guildId);
    const economySystem = this.engine.getSystem('economy');
    
    const wallet = economySystem.getWallet(playerId);
    if (wallet[currency] < amount) {
      return { success: false, error: 'Insufficient funds' };
    }
    
    // Transfer funds
    economySystem.debit(playerId, currency, amount);
    guild.treasury[currency] = (guild.treasury[currency] || 0) + amount;
    
    // Track contribution
    const member = guild.members.get(playerId);
    member.contributed.credits += amount;
    
    // Emit contribution event
    this.engine.events.emit('guild:treasury_contribution', {
      guildId,
      playerId,
      amount,
      currency
    });
    
    return { success: true };
  }

  // ── Guild Progression and Reputation ────────────────────────────────────────

  /**
   * Award reputation to a guild for collective activities
   */
  awardReputation(guildId, amount, source = 'activity') {
    const guild = this.guilds.get(guildId);
    if (!guild) return;
    
    guild.reputation += amount;
    
    // Check for tier advancement
    const newTier = this.calculateGuildTier(guild.reputation);
    if (newTier.level > guild.tier.level) {
      guild.tier = newTier;
      
      // Emit tier advancement event
      this.engine.events.emit('guild:tier_advanced', {
        guildId,
        oldTier: guild.tier,
        newTier,
        reputation: guild.reputation
      });
    }
    
    // Log reputation history
    if (!this.guildReputationHistory.has(guildId)) {
      this.guildReputationHistory.set(guildId, []);
    }
    
    this.guildReputationHistory.get(guildId).push({
      amount,
      source,
      timestamp: Date.now(),
      newTotal: guild.reputation
    });
  }

  /**
   * Calculate guild tier based on reputation
   */
  calculateGuildTier(reputation) {
    const tiers = Object.values(GUILD_TIERS);
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (reputation >= tiers[i].minRep) {
        return tiers[i];
      }
    }
    return GUILD_TIERS.STARTUP;
  }

  // ── Event Handlers ──────────────────────────────────────────────────────────

  onPlayerConnected(event) {
    const { playerId } = event;
    const guildId = this.playerGuilds.get(playerId);
    
    if (guildId) {
      const guild = this.guilds.get(guildId);
      const member = guild.members.get(playerId);
      if (member) {
        member.lastSeen = Date.now();
      }
    }
  }

  onPlayerDisconnected(event) {
    // Guild state persists when players disconnect
  }

  onCombatVictory(event) {
    const { playerId } = event;
    const guildId = this.playerGuilds.get(playerId);
    
    if (guildId) {
      // Award guild reputation for member combat victories
      this.awardReputation(guildId, 5, 'combat_victory');
    }
  }

  onExplorationDiscovery(event) {
    const { playerId } = event;
    const guildId = this.playerGuilds.get(playerId);
    
    if (guildId) {
      // Award guild reputation for exploration discoveries
      this.awardReputation(guildId, 10, 'exploration_discovery');
    }
  }

  // ── Utility Methods ─────────────────────────────────────────────────────────

  generateGuildId() {
    return 'guild_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get guild information for a player
   */
  getPlayerGuild(playerId) {
    const guildId = this.playerGuilds.get(playerId);
    if (!guildId) return null;
    
    return this.guilds.get(guildId);
  }

  /**
   * Get all guilds (for admin/leaderboards)
   */
  getAllGuilds() {
    return Array.from(this.guilds.values());
  }

  /**
   * Get guild member list with roles
   */
  getGuildMembers(guildId) {
    const guild = this.guilds.get(guildId);
    if (!guild) return [];
    
    return Array.from(guild.members.entries()).map(([playerId, member]) => ({
      playerId,
      role: member.role,
      joinedAt: member.joinedAt,
      lastSeen: member.lastSeen,
      contributed: member.contributed
    }));
  }

  /**
   * Search guilds by name or criteria
   */
  searchGuilds(query, filters = {}) {
    const results = [];
    
    for (const guild of this.guilds.values()) {
      let matches = true;
      
      // Name search
      if (query && !guild.name.toLowerCase().includes(query.toLowerCase())) {
        matches = false;
      }
      
      // Public filter
      if (filters.publicOnly && !guild.public) {
        matches = false;
      }
      
      // Size filter
      if (filters.minMembers && guild.memberCount < filters.minMembers) {
        matches = false;
      }
      
      if (matches) {
        results.push({
          id: guild.id,
          name: guild.name,
          description: guild.description,
          memberCount: guild.memberCount,
          tier: guild.tier,
          reputation: guild.reputation,
          public: guild.public
        });
      }
    }
    
    return results.sort((a, b) => b.reputation - a.reputation);
  }
}