/**
 * CommunicationSystem — In-game chat, messaging, and coordination
 * 
 * Provides:
 * - Global and channel-based chat system
 * - Private messaging between players  
 * - Guild and fleet tactical channels
 * - Voice coordination hooks
 * - Anti-spam and moderation systems
 * - Message history and offline delivery
 *
 * INTEGRATION POINTS:
 * - GuildSystem: Guild chat channels with role-based permissions
 * - FleetSystem: Tactical coordination channels
 * - FactionSystem: Faction-specific communication channels
 * - PlayerTradingSystem: Trade negotiation chat
 */

// ── Channel Types and Configuration ─────────────────────────────────────────

export const CHANNEL_TYPES = Object.freeze({
  GLOBAL: 'global',           // Server-wide chat
  LOCAL: 'local',             // Current system chat
  FACTION: 'faction',         // Faction-specific channels
  GUILD: 'guild',             // Guild internal chat
  FLEET: 'fleet',             // Fleet coordination
  TRADE: 'trade',             // Trading channels
  HELP: 'help',               // New player help
  PRIVATE: 'private'          // Direct messages
});

export const CHANNEL_PERMISSIONS = Object.freeze({
  [CHANNEL_TYPES.GLOBAL]: {
    name: 'Global',
    description: 'Server-wide general chat',
    color: '#FFFFFF',
    minRep: 0,
    rateLimit: 2000,  // 2 seconds between messages
    maxLength: 200
  },
  [CHANNEL_TYPES.LOCAL]: {
    name: 'Local',
    description: 'Current system chat',
    color: '#87CEEB',
    minRep: 0,
    rateLimit: 1000,  // 1 second
    maxLength: 150
  },
  [CHANNEL_TYPES.FACTION]: {
    name: 'Faction',
    description: 'Faction members only',
    color: '#FFD700',
    minRep: 100,
    rateLimit: 1500,
    maxLength: 300
  },
  [CHANNEL_TYPES.GUILD]: {
    name: 'Guild',
    description: 'Guild internal chat',
    color: '#9370DB',
    minRep: 0,
    rateLimit: 500,
    maxLength: 400
  },
  [CHANNEL_TYPES.FLEET]: {
    name: 'Fleet',
    description: 'Fleet coordination',
    color: '#FF6347',
    minRep: 0,
    rateLimit: 200,   // Fast tactical chat
    maxLength: 250
  },
  [CHANNEL_TYPES.TRADE]: {
    name: 'Trade',
    description: 'Trading and marketplace',
    color: '#32CD32',
    minRep: 50,
    rateLimit: 5000,  // Prevent spam
    maxLength: 200
  },
  [CHANNEL_TYPES.HELP]: {
    name: 'Help',
    description: 'New player questions',
    color: '#FFA500',
    minRep: 0,
    rateLimit: 3000,
    maxLength: 300
  }
});

// ── Message Types and Security ──────────────────────────────────────────────

export const MESSAGE_TYPES = Object.freeze({
  CHAT: 'chat',               // Regular chat message
  SYSTEM: 'system',           // System announcements
  NOTIFICATION: 'notification', // Game notifications
  WHISPER: 'whisper',         // Private message
  EMOTE: 'emote',            // Player emotes/actions
  TRADE_OFFER: 'trade_offer', // Trade proposals
  FLEET_COMMAND: 'fleet_command' // Fleet tactical commands
});

// ── Anti-Spam and Moderation ───────────────────────────────────────────────

const SPAM_DETECTION = {
  maxMessagesPerMinute: 20,
  maxRepeatedMessages: 3,
  similarityThreshold: 0.8,
  autoMuteThreshold: 5
};

const CHAT_VIOLATIONS = Object.freeze({
  SPAM: { severity: 1, autoMute: 300000 },      // 5 minutes
  ADVERTISING: { severity: 2, autoMute: 600000 }, // 10 minutes
  HARASSMENT: { severity: 3, autoMute: 1800000 }, // 30 minutes
  INAPPROPRIATE: { severity: 2, autoMute: 600000 }
});

export class CommunicationSystem {
  constructor(engine) {
    this.engine = engine;
    
    // Channel management
    this.channels = new Map(); // channelId -> Channel
    this.playerChannels = new Map(); // playerId -> Set(channelId)
    this.channelSubscriptions = new Map(); // channelId -> Set(playerId)
    
    // Message storage and history
    this.messages = new Map(); // messageId -> Message
    this.channelHistory = new Map(); // channelId -> MessageId[]
    this.privateMessages = new Map(); // conversationId -> Message[]
    
    // Player communication state
    this.playerStatus = new Map(); // playerId -> { status, lastSeen, muted }
    this.blockedPlayers = new Map(); // playerId -> Set(blockedPlayerId)
    this.mutedPlayers = new Map(); // playerId -> { mutedUntil, reason }
    
    // Anti-spam and moderation
    this.messageCounts = new Map(); // playerId -> MessageCount[]
    this.spamDetection = new Map(); // playerId -> SpamMetrics
    this.moderationLog = new Map(); // actionId -> ModerationAction
    
    // Voice coordination hooks (future integration)
    this.voiceChannels = new Map(); // channelId -> VoiceChannel
    this.voiceParticipants = new Map(); // channelId -> Set(playerId)
  }

  async init() {
    console.log('[CommunicationSystem] Initializing communication channels...');
    
    // Create default channels
    this.createDefaultChannels();
    
    // Listen for game events
    this.engine.events.on('player:connected', this.onPlayerConnected.bind(this));
    this.engine.events.on('player:disconnected', this.onPlayerDisconnected.bind(this));
    this.engine.events.on('guild:member_joined', this.onGuildMemberJoined.bind(this));
    this.engine.events.on('fleet:member_joined', this.onFleetMemberJoined.bind(this));
    
    // Clean up old messages and reset spam counters periodically
    setInterval(() => {
      this.cleanupOldMessages();
      this.resetSpamCounters();
    }, 300000); // Every 5 minutes
    
    // Process offline message delivery
    setInterval(() => {
      this.processOfflineMessages();
    }, 60000); // Every minute
    
    return true;
  }

  // ── Channel Management ──────────────────────────────────────────────────────

  /**
   * Create default communication channels
   */
  createDefaultChannels() {
    // Global channels
    this.createChannel('global', CHANNEL_TYPES.GLOBAL, 'Server-wide chat');
    this.createChannel('help', CHANNEL_TYPES.HELP, 'New player help and questions');
    this.createChannel('trade', CHANNEL_TYPES.TRADE, 'Trading and marketplace');
    
    // Faction channels (created dynamically when needed)
    const factionSystem = this.engine.getSystem('factions');
    if (factionSystem && factionSystem.FACTIONS) {
      for (const faction of factionSystem.FACTIONS) {
        this.createChannel(
          `faction_${faction.id}`, 
          CHANNEL_TYPES.FACTION,
          `${faction.name} faction chat`,
          { factionId: faction.id }
        );
      }
    }
  }

  /**
   * Create a new communication channel
   */
  createChannel(channelId, type, description, options = {}) {
    if (this.channels.has(channelId)) {
      return { success: false, error: 'Channel already exists' };
    }
    
    const channelConfig = CHANNEL_PERMISSIONS[type];
    if (!channelConfig) {
      return { success: false, error: 'Invalid channel type' };
    }
    
    const channel = {
      id: channelId,
      type,
      name: options.name || channelConfig.name,
      description,
      config: channelConfig,
      createdAt: Date.now(),
      
      // Access control
      isPrivate: options.isPrivate || false,
      password: options.password || null,
      ownerIds: options.ownerIds || [],
      moderatorIds: options.moderatorIds || [],
      
      // Settings
      persistent: options.persistent !== false,
      maxMembers: options.maxMembers || 1000,
      
      // Metadata
      messageCount: 0,
      lastActivity: Date.now(),
      
      // Special properties
      ...options
    };
    
    this.channels.set(channelId, channel);
    this.channelSubscriptions.set(channelId, new Set());
    this.channelHistory.set(channelId, []);
    
    console.log(`[CommunicationSystem] Created channel: ${channelId} (${type})`);
    
    return { success: true, channel };
  }

  /**
   * Join a communication channel
   */
  joinChannel(playerId, channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    
    // Check access permissions
    const accessCheck = this.checkChannelAccess(playerId, channel);
    if (!accessCheck.allowed) {
      return { success: false, error: accessCheck.reason };
    }
    
    // Check if already in channel
    if (this.channelSubscriptions.get(channelId).has(playerId)) {
      return { success: false, error: 'Already in channel' };
    }
    
    // Check channel capacity
    const currentMembers = this.channelSubscriptions.get(channelId).size;
    if (currentMembers >= channel.maxMembers) {
      return { success: false, error: 'Channel full' };
    }
    
    // Add player to channel
    this.channelSubscriptions.get(channelId).add(playerId);
    
    if (!this.playerChannels.has(playerId)) {
      this.playerChannels.set(playerId, new Set());
    }
    this.playerChannels.get(playerId).add(channelId);
    
    // Send recent message history to player
    const recentMessages = this.getRecentChannelMessages(channelId, 20);
    
    // Emit join event
    this.engine.events.emit('chat:channel_joined', {
      playerId,
      channelId,
      channel,
      recentMessages
    });
    
    return { success: true, recentMessages };
  }

  /**
   * Leave a communication channel
   */
  leaveChannel(playerId, channelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    
    // Remove from channel
    this.channelSubscriptions.get(channelId).delete(playerId);
    
    const playerChannelSet = this.playerChannels.get(playerId);
    if (playerChannelSet) {
      playerChannelSet.delete(channelId);
    }
    
    // Emit leave event
    this.engine.events.emit('chat:channel_left', {
      playerId,
      channelId
    });
    
    return { success: true };
  }

  // ── Message Sending and Processing ──────────────────────────────────────────

  /**
   * Send a message to a channel
   */
  sendMessage(playerId, channelId, content, messageType = MESSAGE_TYPES.CHAT) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }
    
    // Check if player is in channel
    if (!this.channelSubscriptions.get(channelId).has(playerId)) {
      return { success: false, error: 'Not in channel' };
    }
    
    // Check if player is muted
    if (this.isPlayerMuted(playerId)) {
      const muteInfo = this.mutedPlayers.get(playerId);
      return { success: false, error: `Muted until ${new Date(muteInfo.mutedUntil)}` };
    }
    
    // Validate message content
    const validation = this.validateMessage(playerId, channel, content);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Check rate limits
    if (!this.checkRateLimit(playerId, channel)) {
      return { success: false, error: 'Sending too fast' };
    }
    
    // Spam detection
    const spamCheck = this.checkForSpam(playerId, content);
    if (spamCheck.isSpam) {
      this.handleSpamViolation(playerId, spamCheck.reason);
      return { success: false, error: 'Message flagged as spam' };
    }
    
    // Create message
    const messageId = this.generateMessageId();
    const message = {
      id: messageId,
      playerId,
      channelId,
      type: messageType,
      content: this.sanitizeMessage(content),
      timestamp: Date.now(),
      
      // Metadata
      playerName: this.getPlayerName(playerId),
      edited: false,
      editedAt: null,
      
      // System messages
      systemData: messageType === MESSAGE_TYPES.SYSTEM ? {
        source: 'system',
        priority: 'normal'
      } : null
    };
    
    // Store message
    this.messages.set(messageId, message);
    
    // Add to channel history
    const history = this.channelHistory.get(channelId);
    history.push(messageId);
    
    // Keep only last 1000 messages per channel
    if (history.length > 1000) {
      const removedId = history.shift();
      this.messages.delete(removedId);
    }
    
    // Update channel stats
    channel.messageCount++;
    channel.lastActivity = Date.now();
    
    // Update player message count for spam detection
    this.updatePlayerMessageCount(playerId);
    
    // Broadcast to channel subscribers
    this.broadcastToChannel(channelId, message);
    
    console.log(`[CommunicationSystem] Message sent to ${channelId}: ${content.slice(0, 50)}`);
    
    return { success: true, messageId };
  }

  /**
   * Send a private message between players
   */
  sendPrivateMessage(senderId, recipientId, content) {
    // Check if players have blocked each other
    if (this.isPlayerBlocked(recipientId, senderId)) {
      return { success: false, error: 'Player has blocked you' };
    }
    
    // Check sender mute status
    if (this.isPlayerMuted(senderId)) {
      const muteInfo = this.mutedPlayers.get(senderId);
      return { success: false, error: `Muted until ${new Date(muteInfo.mutedUntil)}` };
    }
    
    // Validate content
    if (!content || content.length === 0 || content.length > 500) {
      return { success: false, error: 'Invalid message content' };
    }
    
    // Create conversation ID (consistent for both players)
    const conversationId = this.getConversationId(senderId, recipientId);
    
    // Create message
    const messageId = this.generateMessageId();
    const message = {
      id: messageId,
      senderId,
      recipientId,
      conversationId,
      type: MESSAGE_TYPES.WHISPER,
      content: this.sanitizeMessage(content),
      timestamp: Date.now(),
      delivered: false,
      read: false,
      
      // Metadata
      senderName: this.getPlayerName(senderId),
      recipientName: this.getPlayerName(recipientId)
    };
    
    // Store in private message history
    if (!this.privateMessages.has(conversationId)) {
      this.privateMessages.set(conversationId, []);
    }
    
    const conversation = this.privateMessages.get(conversationId);
    conversation.push(message);
    
    // Keep only last 100 messages per conversation
    if (conversation.length > 100) {
      conversation.splice(0, conversation.length - 100);
    }
    
    // Deliver message if recipient is online
    const recipientStatus = this.playerStatus.get(recipientId);
    if (recipientStatus && recipientStatus.status === 'online') {
      this.deliverPrivateMessage(message);
    }
    
    console.log(`[CommunicationSystem] Private message: ${senderId} -> ${recipientId}`);
    
    return { success: true, messageId };
  }

  // ── Message Validation and Security ─────────────────────────────────────────

  /**
   * Validate message content and permissions
   */
  validateMessage(playerId, channel, content) {
    // Content validation
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Invalid message content' };
    }
    
    content = content.trim();
    
    if (content.length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }
    
    if (content.length > channel.config.maxLength) {
      return { valid: false, error: `Message too long (max ${channel.config.maxLength})` };
    }
    
    // Check reputation requirements
    const playerRep = this.getPlayerReputation(playerId);
    if (playerRep < channel.config.minRep) {
      return { valid: false, error: `Requires ${channel.config.minRep} reputation` };
    }
    
    // Content filtering
    const filterResult = this.filterMessageContent(content);
    if (!filterResult.allowed) {
      return { valid: false, error: filterResult.reason };
    }
    
    return { valid: true };
  }

  /**
   * Check channel access permissions
   */
  checkChannelAccess(playerId, channel) {
    // Check if channel is private and player has access
    if (channel.isPrivate) {
      if (!channel.ownerIds.includes(playerId) && !channel.moderatorIds.includes(playerId)) {
        return { allowed: false, reason: 'Private channel' };
      }
    }
    
    // Faction channel access
    if (channel.type === CHANNEL_TYPES.FACTION) {
      const factionSystem = this.engine.getSystem('factions');
      if (factionSystem && channel.factionId) {
        const playerFaction = this.getPlayerFaction(playerId);
        if (playerFaction !== channel.factionId) {
          const factionRep = this.getPlayerFactionRep(playerId, channel.factionId);
          if (factionRep < 100) {
            return { allowed: false, reason: 'Insufficient faction standing' };
          }
        }
      }
    }
    
    // Guild channel access
    if (channel.type === CHANNEL_TYPES.GUILD) {
      const guildSystem = this.engine.getSystem('guilds');
      if (guildSystem && channel.guildId) {
        const playerGuild = guildSystem.getPlayerGuild(playerId);
        if (!playerGuild || playerGuild.id !== channel.guildId) {
          return { allowed: false, reason: 'Not a guild member' };
        }
      }
    }
    
    // Fleet channel access
    if (channel.type === CHANNEL_TYPES.FLEET) {
      const fleetSystem = this.engine.getSystem('fleets');
      if (fleetSystem && channel.fleetId) {
        const playerFleet = fleetSystem.getPlayerFleet(playerId);
        if (!playerFleet || playerFleet.id !== channel.fleetId) {
          return { allowed: false, reason: 'Not in fleet' };
        }
      }
    }
    
    return { allowed: true };
  }

  /**
   * Check rate limits for message sending
   */
  checkRateLimit(playerId, channel) {
    if (!this.messageCounts.has(playerId)) {
      this.messageCounts.set(playerId, []);
    }
    
    const counts = this.messageCounts.get(playerId);
    const now = Date.now();
    const rateLimit = channel.config.rateLimit;
    
    // Remove old entries
    while (counts.length > 0 && now - counts[0] > rateLimit) {
      counts.shift();
    }
    
    // Check if last message was too recent
    if (counts.length > 0 && now - counts[counts.length - 1] < rateLimit) {
      return false;
    }
    
    return true;
  }

  /**
   * Detect spam patterns in messages
   */
  checkForSpam(playerId, content) {
    if (!this.spamDetection.has(playerId)) {
      this.spamDetection.set(playerId, {
        recentMessages: [],
        violationCount: 0,
        lastViolation: 0
      });
    }
    
    const metrics = this.spamDetection.get(playerId);
    const now = Date.now();
    
    // Check message frequency
    const recentCount = metrics.recentMessages.filter(msg => 
      now - msg.timestamp < 60000 // Last minute
    ).length;
    
    if (recentCount > SPAM_DETECTION.maxMessagesPerMinute) {
      return { isSpam: true, reason: 'Too many messages per minute' };
    }
    
    // Check for repeated content
    const similarMessages = metrics.recentMessages.filter(msg => 
      this.calculateStringSimilarity(content, msg.content) > SPAM_DETECTION.similarityThreshold
    ).length;
    
    if (similarMessages >= SPAM_DETECTION.maxRepeatedMessages) {
      return { isSpam: true, reason: 'Repeated message content' };
    }
    
    // Add current message to history
    metrics.recentMessages.push({
      content,
      timestamp: now
    });
    
    // Clean old messages
    metrics.recentMessages = metrics.recentMessages.filter(msg => 
      now - msg.timestamp < 300000 // Last 5 minutes
    );
    
    return { isSpam: false };
  }

  // ── Guild and Fleet Communication ───────────────────────────────────────────

  /**
   * Create guild chat channel when guild is formed
   */
  createGuildChannel(guildId, guildName) {
    const channelId = `guild_${guildId}`;
    
    return this.createChannel(channelId, CHANNEL_TYPES.GUILD, `${guildName} guild chat`, {
      guildId,
      name: guildName,
      isPrivate: true,
      persistent: true
    });
  }

  /**
   * Create fleet coordination channel
   */
  createFleetChannel(fleetId, fleetName) {
    const channelId = `fleet_${fleetId}`;
    
    return this.createChannel(channelId, CHANNEL_TYPES.FLEET, `${fleetName} tactical`, {
      fleetId,
      name: `${fleetName} Tactical`,
      isPrivate: true,
      persistent: false // Temporary channel
    });
  }

  /**
   * Send fleet tactical command
   */
  sendFleetCommand(commanderId, fleetId, command) {
    const fleetSystem = this.engine.getSystem('fleets');
    if (!fleetSystem) return { success: false, error: 'Fleet system unavailable' };
    
    const fleet = fleetSystem.getPlayerFleet(commanderId);
    if (!fleet || fleet.id !== fleetId) {
      return { success: false, error: 'Not in specified fleet' };
    }
    
    // Check if player has command permissions
    const member = fleet.members.get(commanderId);
    if (!member || !fleetSystem.hasFleetPermission(member.role, 'tactical_commands')) {
      return { success: false, error: 'No command permissions' };
    }
    
    const channelId = `fleet_${fleetId}`;
    
    // Send as system message with special formatting
    const content = `[FLEET CMD] ${command}`;
    return this.sendMessage(commanderId, channelId, content, MESSAGE_TYPES.FLEET_COMMAND);
  }

  // ── Event Handlers and Integration ──────────────────────────────────────────

  onPlayerConnected(event) {
    const { playerId } = event;
    
    // Set player status
    this.playerStatus.set(playerId, {
      status: 'online',
      lastSeen: Date.now(),
      location: null
    });
    
    // Auto-join default channels
    this.joinChannel(playerId, 'global');
    this.joinChannel(playerId, 'help');
    
    // Process offline messages
    this.deliverOfflineMessages(playerId);
    
    // Join faction channel if applicable
    const playerFaction = this.getPlayerFaction(playerId);
    if (playerFaction) {
      this.joinChannel(playerId, `faction_${playerFaction}`);
    }
    
    // Join guild channel if applicable
    const guildSystem = this.engine.getSystem('guilds');
    if (guildSystem) {
      const playerGuild = guildSystem.getPlayerGuild(playerId);
      if (playerGuild) {
        this.joinChannel(playerId, `guild_${playerGuild.id}`);
      }
    }
  }

  onPlayerDisconnected(event) {
    const { playerId } = event;
    
    // Update status
    const status = this.playerStatus.get(playerId);
    if (status) {
      status.status = 'offline';
      status.lastSeen = Date.now();
    }
    
    // Leave all channels
    const playerChannelSet = this.playerChannels.get(playerId);
    if (playerChannelSet) {
      for (const channelId of playerChannelSet) {
        this.leaveChannel(playerId, channelId);
      }
    }
  }

  onGuildMemberJoined(event) {
    const { guildId, playerId } = event;
    
    // Add player to guild channel
    const channelId = `guild_${guildId}`;
    if (this.channels.has(channelId)) {
      this.joinChannel(playerId, channelId);
    }
  }

  onFleetMemberJoined(event) {
    const { fleetId, playerId } = event;
    
    // Add player to fleet channel
    const channelId = `fleet_${fleetId}`;
    if (this.channels.has(channelId)) {
      this.joinChannel(playerId, channelId);
    }
  }

  // ── Utility and Helper Methods ──────────────────────────────────────────────

  broadcastToChannel(channelId, message) {
    const subscribers = this.channelSubscriptions.get(channelId);
    if (!subscribers) return;
    
    // Emit to all subscribers
    this.engine.events.emit('chat:message', {
      channelId,
      message,
      subscribers: Array.from(subscribers)
    });
  }

  deliverPrivateMessage(message) {
    message.delivered = true;
    
    this.engine.events.emit('chat:private_message', {
      message,
      recipientId: message.recipientId
    });
  }

  deliverOfflineMessages(playerId) {
    // Find conversations involving this player
    for (const [conversationId, messages] of this.privateMessages) {
      const undeliveredMessages = messages.filter(msg => 
        msg.recipientId === playerId && !msg.delivered
      );
      
      for (const message of undeliveredMessages) {
        this.deliverPrivateMessage(message);
      }
    }
  }

  processOfflineMessages() {
    // Process any pending offline message delivery
    for (const [playerId, status] of this.playerStatus) {
      if (status.status === 'online') {
        this.deliverOfflineMessages(playerId);
      }
    }
  }

  handleSpamViolation(playerId, reason) {
    const metrics = this.spamDetection.get(playerId);
    if (!metrics) return;
    
    metrics.violationCount++;
    metrics.lastViolation = Date.now();
    
    // Auto-mute for repeated violations
    if (metrics.violationCount >= SPAM_DETECTION.autoMuteThreshold) {
      const muteTime = 300000; // 5 minutes
      this.mutePlayer(playerId, muteTime, `Auto-mute: ${reason}`);
    }
  }

  mutePlayer(playerId, duration, reason) {
    this.mutedPlayers.set(playerId, {
      mutedUntil: Date.now() + duration,
      reason,
      mutedBy: 'system'
    });
    
    console.log(`[CommunicationSystem] Player ${playerId} muted for ${duration}ms: ${reason}`);
  }

  isPlayerMuted(playerId) {
    const muteInfo = this.mutedPlayers.get(playerId);
    if (!muteInfo) return false;
    
    if (Date.now() > muteInfo.mutedUntil) {
      this.mutedPlayers.delete(playerId);
      return false;
    }
    
    return true;
  }

  isPlayerBlocked(playerId, otherPlayerId) {
    const blocked = this.blockedPlayers.get(playerId);
    return blocked ? blocked.has(otherPlayerId) : false;
  }

  getConversationId(playerId1, playerId2) {
    // Create consistent conversation ID regardless of order
    return playerId1 < playerId2 ? 
      `${playerId1}_${playerId2}` : `${playerId2}_${playerId1}`;
  }

  getRecentChannelMessages(channelId, count = 20) {
    const history = this.channelHistory.get(channelId) || [];
    const recentIds = history.slice(-count);
    
    return recentIds.map(id => this.messages.get(id)).filter(msg => msg);
  }

  sanitizeMessage(content) {
    // Basic HTML sanitization
    return content
      .replace(/[<>&"']/g, (match) => {
        const htmlEntities = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#39;'
        };
        return htmlEntities[match];
      })
      .trim();
  }

  filterMessageContent(content) {
    // Basic content filtering (extend as needed)
    const blockedWords = ['spam', 'scam']; // Placeholder
    
    const lowerContent = content.toLowerCase();
    for (const word of blockedWords) {
      if (lowerContent.includes(word)) {
        return { allowed: false, reason: 'Inappropriate content' };
      }
    }
    
    return { allowed: true };
  }

  calculateStringSimilarity(str1, str2) {
    // Simple similarity calculation
    if (str1 === str2) return 1.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  updatePlayerMessageCount(playerId) {
    if (!this.messageCounts.has(playerId)) {
      this.messageCounts.set(playerId, []);
    }
    
    const counts = this.messageCounts.get(playerId);
    counts.push(Date.now());
    
    // Keep only last 50 timestamps
    if (counts.length > 50) {
      counts.splice(0, counts.length - 50);
    }
  }

  cleanupOldMessages() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Clean up channel history
    for (const [channelId, history] of this.channelHistory) {
      const validIds = [];
      
      for (const messageId of history) {
        const message = this.messages.get(messageId);
        if (message && message.timestamp > cutoff) {
          validIds.push(messageId);
        } else if (message) {
          this.messages.delete(messageId);
        }
      }
      
      this.channelHistory.set(channelId, validIds);
    }
    
    // Clean up private messages
    for (const [conversationId, messages] of this.privateMessages) {
      const validMessages = messages.filter(msg => msg.timestamp > cutoff);
      this.privateMessages.set(conversationId, validMessages);
    }
    
    console.log('[CommunicationSystem] Cleaned up old messages');
  }

  resetSpamCounters() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [playerId, metrics] of this.spamDetection) {
      if (metrics.lastViolation < cutoff) {
        metrics.violationCount = Math.max(0, metrics.violationCount - 1);
      }
    }
  }

  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getPlayerName(playerId) {
    // Integration with player system
    return `Player_${playerId.slice(-8)}`;
  }

  getPlayerReputation(playerId) {
    // Integration with faction/reputation system
    return 0; // Placeholder
  }

  getPlayerFaction(playerId) {
    // Integration with faction system
    return null; // Placeholder
  }

  getPlayerFactionRep(playerId, factionId) {
    // Integration with faction system
    return 0; // Placeholder
  }

  /**
   * Block another player from sending private messages
   */
  blockPlayer(playerId, targetId) {
    if (!this.blockedPlayers.has(playerId)) {
      this.blockedPlayers.set(playerId, new Set());
    }
    
    this.blockedPlayers.get(playerId).add(targetId);
    
    return { success: true };
  }

  /**
   * Unblock a previously blocked player
   */
  unblockPlayer(playerId, targetId) {
    const blocked = this.blockedPlayers.get(playerId);
    if (blocked) {
      blocked.delete(targetId);
    }
    
    return { success: true };
  }

  /**
   * Get player's conversation history
   */
  getConversationHistory(playerId, otherPlayerId, limit = 50) {
    const conversationId = this.getConversationId(playerId, otherPlayerId);
    const messages = this.privateMessages.get(conversationId) || [];
    
    return messages.slice(-limit);
  }

  /**
   * Get list of channels player can access
   */
  getAvailableChannels(playerId) {
    const available = [];
    
    for (const [channelId, channel] of this.channels) {
      const accessCheck = this.checkChannelAccess(playerId, channel);
      if (accessCheck.allowed) {
        available.push({
          id: channelId,
          name: channel.name,
          type: channel.type,
          description: channel.description,
          memberCount: this.channelSubscriptions.get(channelId).size,
          isJoined: this.channelSubscriptions.get(channelId).has(playerId)
        });
      }
    }
    
    return available;
  }

  /**
   * Get player's current status
   */
  getPlayerStatus(playerId) {
    return this.playerStatus.get(playerId) || { status: 'offline' };
  }
}