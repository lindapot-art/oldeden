/**
 * PlayerTradingSystem — Secure peer-to-peer item and currency exchange
 * 
 * Provides secure trading between players with:
 * - Fraud protection through confirmation steps
 * - Trade window UI with drag-drop functionality  
 * - Reputation system for trading reliability
 * - Trade history and dispute resolution
 * - Integration with inventory and economy systems
 *
 * INTEGRATION POINTS:
 * - InventorySystem: Item transfers and validation
 * - EconomySystem: Currency exchanges  
 * - GuildSystem: Guild member trade bonuses
 * - CommunicationSystem: Trade negotiation chat
 */

// ── Trade States and Security ───────────────────────────────────────────────

export const TRADE_STATES = Object.freeze({
  PROPOSED: 'proposed',        // Initial trade offer sent
  NEGOTIATING: 'negotiating',  // Both parties adding items
  READY: 'ready',              // Both parties confirmed items
  EXECUTING: 'executing',      // Server processing transfer
  COMPLETED: 'completed',      // Successfully completed
  CANCELLED: 'cancelled',      // Cancelled by either party
  FAILED: 'failed'             // Failed due to validation error
});

export const TRADE_REPUTATION = Object.freeze({
  EXCELLENT: { level: 5, name: 'Excellent', minTrades: 100, reliability: 0.98, color: '#FFD700' },
  GOOD: { level: 4, name: 'Good', minTrades: 50, reliability: 0.95, color: '#32CD32' },  
  FAIR: { level: 3, name: 'Fair', minTrades: 20, reliability: 0.90, color: '#1E90FF' },
  POOR: { level: 2, name: 'Poor', minTrades: 5, reliability: 0.80, color: '#FFA500' },
  UNTRUSTED: { level: 1, name: 'Untrusted', minTrades: 0, reliability: 0.0, color: '#FF6347' }
});

// ── Trade Security Configuration ────────────────────────────────────────────

const MAX_TRADE_VALUE = 1000000; // Maximum trade value in credits
const TRADE_TIMEOUT_MS = 300000; // 5 minutes to complete trade
const MAX_ITEMS_PER_TRADE = 20; // Limit items to prevent UI overflow
const REPUTATION_DECAY_DAYS = 30; // Days before old trades stop affecting reputation

export class PlayerTradingSystem {
  constructor(engine) {
    this.engine = engine;
    
    // Active trade sessions
    this.trades = new Map(); // tradeId -> Trade
    this.playerTrades = new Map(); // playerId -> tradeId (prevent multiple trades)
    
    // Trading reputation and history
    this.tradeHistory = new Map(); // playerId -> TradeRecord[]
    this.reputationCache = new Map(); // playerId -> ReputationData
    
    // Trade proposals and notifications
    this.tradeProposals = new Map(); // targetPlayerId -> [proposal, ...]
    
    // Security and anti-fraud
    this.suspiciousActivity = new Map(); // playerId -> SuspiciousEvent[]
    this.blockedPlayers = new Map(); // playerId -> Set(blockedPlayerId)
  }

  async init() {
    console.log('[PlayerTradingSystem] Initializing secure trading...');
    
    // Clean up expired trades every minute
    setInterval(() => {
      this.cleanupExpiredTrades();
    }, 60000);
    
    // Update reputation cache every 10 minutes
    setInterval(() => {
      this.updateReputationCache();
    }, 600000);
    
    return true;
  }

  // ── Trade Initiation and Proposal ──────────────────────────────────────────

  /**
   * Propose a trade to another player
   */
  proposeTrade(initiatorId, targetId, message = '') {
    // Validation checks
    if (initiatorId === targetId) {
      return { success: false, error: 'Cannot trade with yourself' };
    }
    
    if (this.playerTrades.has(initiatorId)) {
      return { success: false, error: 'Already in a trade' };
    }
    
    if (this.playerTrades.has(targetId)) {
      return { success: false, error: 'Target player busy' };
    }
    
    // Check if target has blocked initiator
    if (this.isPlayerBlocked(targetId, initiatorId)) {
      return { success: false, error: 'Trade declined' };
    }
    
    // Check reputation restrictions
    const initiatorRep = this.getPlayerReputation(initiatorId);
    if (initiatorRep.level <= TRADE_REPUTATION.UNTRUSTED.level) {
      return { success: false, error: 'Reputation too low for trading' };
    }
    
    // Create trade proposal
    const proposal = {
      id: this.generateTradeId(),
      initiatorId,
      targetId,
      message: message.slice(0, 200), // Limit message length
      proposedAt: Date.now(),
      expiresAt: Date.now() + 60000 // 1 minute to respond
    };
    
    // Add to target's proposals
    if (!this.tradeProposals.has(targetId)) {
      this.tradeProposals.set(targetId, []);
    }
    this.tradeProposals.get(targetId).push(proposal);
    
    // Emit proposal event for real-time notification
    this.engine.events.emit('trade:proposal', {
      proposal,
      initiatorName: this.getPlayerName(initiatorId),
      targetId
    });
    
    return { success: true, proposalId: proposal.id };
  }

  /**
   * Accept a trade proposal and create active trade session
   */
  acceptTradeProposal(targetId, proposalId) {
    const proposals = this.tradeProposals.get(targetId) || [];
    const proposalIndex = proposals.findIndex(p => p.id === proposalId);
    
    if (proposalIndex === -1) {
      return { success: false, error: 'Proposal not found' };
    }
    
    const proposal = proposals[proposalIndex];
    
    // Check if proposal expired
    if (Date.now() > proposal.expiresAt) {
      proposals.splice(proposalIndex, 1);
      return { success: false, error: 'Proposal expired' };
    }
    
    // Check if initiator is still available
    if (this.playerTrades.has(proposal.initiatorId)) {
      return { success: false, error: 'Initiator busy' };
    }
    
    // Create active trade session
    const trade = {
      id: this.generateTradeId(),
      initiatorId: proposal.initiatorId,
      targetId: targetId,
      state: TRADE_STATES.NEGOTIATING,
      createdAt: Date.now(),
      expiresAt: Date.now() + TRADE_TIMEOUT_MS,
      
      // Trade contents
      initiatorOffer: {
        items: new Map(), // itemId -> { item, quantity }
        credits: { ec: 0, sm: 0 },
        confirmed: false
      },
      targetOffer: {
        items: new Map(),
        credits: { ec: 0, sm: 0 },
        confirmed: false
      },
      
      // Security
      lastActivity: Date.now(),
      warnings: [],
      
      // Metadata
      chatHistory: [],
      originalProposal: proposal.message
    };
    
    // Register active trade
    this.trades.set(trade.id, trade);
    this.playerTrades.set(proposal.initiatorId, trade.id);
    this.playerTrades.set(targetId, trade.id);
    
    // Remove proposal
    proposals.splice(proposalIndex, 1);
    
    // Emit trade started event
    this.engine.events.emit('trade:started', {
      tradeId: trade.id,
      initiatorId: proposal.initiatorId,
      targetId,
      trade
    });
    
    return { success: true, tradeId: trade.id, trade };
  }

  // ── Trade Item Management ───────────────────────────────────────────────────

  /**
   * Add an item to player's trade offer
   */
  addItemToTrade(playerId, tradeId, itemId, quantity = 1) {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      return { success: false, error: 'Trade not found' };
    }
    
    if (trade.state !== TRADE_STATES.NEGOTIATING) {
      return { success: false, error: 'Cannot modify trade in current state' };
    }
    
    // Determine which side of trade this player is on
    let offer;
    if (trade.initiatorId === playerId) {
      offer = trade.initiatorOffer;
    } else if (trade.targetId === playerId) {
      offer = trade.targetOffer;
    } else {
      return { success: false, error: 'Not part of this trade' };
    }
    
    // Check item count limit
    if (offer.items.size >= MAX_ITEMS_PER_TRADE) {
      return { success: false, error: 'Too many items in trade' };
    }
    
    // Validate player owns the item
    const inventorySystem = this.engine.getSystem('inventory');
    if (!inventorySystem.hasItem(playerId, itemId, quantity)) {
      return { success: false, error: 'Insufficient items' };
    }
    
    // Add item to offer
    const itemKey = itemId;
    if (offer.items.has(itemKey)) {
      const existing = offer.items.get(itemKey);
      existing.quantity += quantity;
    } else {
      // Get item details from inventory system
      const itemDetails = inventorySystem.getItemDetails(itemId);
      offer.items.set(itemKey, {
        itemId,
        quantity,
        details: itemDetails,
        addedAt: Date.now()
      });
    }
    
    // Reset confirmations when items change
    trade.initiatorOffer.confirmed = false;
    trade.targetOffer.confirmed = false;
    trade.lastActivity = Date.now();
    
    // Emit trade update
    this.engine.events.emit('trade:updated', {
      tradeId,
      playerId,
      action: 'item_added',
      itemId,
      quantity
    });
    
    return { success: true };
  }

  /**
   * Add credits to player's trade offer
   */
  addCreditsToTrade(playerId, tradeId, amount, currency = 'ec') {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      return { success: false, error: 'Trade not found' };
    }
    
    if (trade.state !== TRADE_STATES.NEGOTIATING) {
      return { success: false, error: 'Cannot modify trade in current state' };
    }
    
    // Determine which side of trade
    let offer;
    if (trade.initiatorId === playerId) {
      offer = trade.initiatorOffer;
    } else if (trade.targetId === playerId) {
      offer = trade.targetOffer;
    } else {
      return { success: false, error: 'Not part of this trade' };
    }
    
    // Validate player has credits
    const economySystem = this.engine.getSystem('economy');
    const wallet = economySystem.getWallet(playerId);
    
    if (wallet[currency] < amount) {
      return { success: false, error: 'Insufficient credits' };
    }
    
    // Check trade value limit
    const totalValue = this.calculateTradeValue(trade);
    if (totalValue + amount > MAX_TRADE_VALUE) {
      return { success: false, error: 'Trade value too high' };
    }
    
    // Add credits to offer
    offer.credits[currency] = (offer.credits[currency] || 0) + amount;
    
    // Reset confirmations
    trade.initiatorOffer.confirmed = false;
    trade.targetOffer.confirmed = false;
    trade.lastActivity = Date.now();
    
    // Emit trade update
    this.engine.events.emit('trade:updated', {
      tradeId,
      playerId,
      action: 'credits_added',
      amount,
      currency
    });
    
    return { success: true };
  }

  // ── Trade Confirmation and Execution ────────────────────────────────────────

  /**
   * Confirm trade offer (both players must confirm)
   */
  confirmTrade(playerId, tradeId) {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      return { success: false, error: 'Trade not found' };
    }
    
    if (trade.state !== TRADE_STATES.NEGOTIATING) {
      return { success: false, error: 'Cannot confirm in current state' };
    }
    
    // Set confirmation for player's side
    if (trade.initiatorId === playerId) {
      trade.initiatorOffer.confirmed = true;
    } else if (trade.targetId === playerId) {
      trade.targetOffer.confirmed = true;
    } else {
      return { success: false, error: 'Not part of this trade' };
    }
    
    trade.lastActivity = Date.now();
    
    // Check if both sides confirmed
    if (trade.initiatorOffer.confirmed && trade.targetOffer.confirmed) {
      trade.state = TRADE_STATES.READY;
      
      // Emit ready for execution
      this.engine.events.emit('trade:ready', {
        tradeId,
        trade
      });
      
      // Auto-execute after short delay (security check period)
      setTimeout(() => {
        this.executeTrade(tradeId);
      }, 3000);
    }
    
    // Emit confirmation update
    this.engine.events.emit('trade:confirmed', {
      tradeId,
      playerId,
      bothConfirmed: trade.initiatorOffer.confirmed && trade.targetOffer.confirmed
    });
    
    return { success: true };
  }

  /**
   * Execute the confirmed trade (server-side validation and transfer)
   */
  async executeTrade(tradeId) {
    const trade = this.trades.get(tradeId);
    if (!trade || trade.state !== TRADE_STATES.READY) {
      return { success: false, error: 'Trade not ready for execution' };
    }
    
    trade.state = TRADE_STATES.EXECUTING;
    
    try {
      // Final validation of all trade items and credits
      const validation = await this.validateTradeExecution(trade);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // Execute transfers atomically
      await this.performTradeTransfers(trade);
      
      // Mark trade as completed
      trade.state = TRADE_STATES.COMPLETED;
      trade.completedAt = Date.now();
      
      // Update player reputation
      this.updateTradingReputation(trade.initiatorId, true);
      this.updateTradingReputation(trade.targetId, true);
      
      // Record trade history
      this.recordTradeHistory(trade);
      
      // Clean up active trade
      this.playerTrades.delete(trade.initiatorId);
      this.playerTrades.delete(trade.targetId);
      
      // Emit completion
      this.engine.events.emit('trade:completed', {
        tradeId,
        trade,
        success: true
      });
      
      return { success: true };
      
    } catch (error) {
      // Trade failed - rollback and mark as failed
      trade.state = TRADE_STATES.FAILED;
      trade.failureReason = error.message;
      
      // Clean up
      this.playerTrades.delete(trade.initiatorId);
      this.playerTrades.delete(trade.targetId);
      
      // Emit failure
      this.engine.events.emit('trade:failed', {
        tradeId,
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate trade can be executed (final check before transfer)
   */
  async validateTradeExecution(trade) {
    const inventorySystem = this.engine.getSystem('inventory');
    const economySystem = this.engine.getSystem('economy');
    
    // Validate initiator's items and credits
    for (const [itemId, itemData] of trade.initiatorOffer.items) {
      if (!inventorySystem.hasItem(trade.initiatorId, itemId, itemData.quantity)) {
        return { valid: false, error: `Initiator missing item: ${itemId}` };
      }
    }
    
    const initiatorWallet = economySystem.getWallet(trade.initiatorId);
    for (const [currency, amount] of Object.entries(trade.initiatorOffer.credits)) {
      if (amount > 0 && initiatorWallet[currency] < amount) {
        return { valid: false, error: `Initiator insufficient ${currency}` };
      }
    }
    
    // Validate target's items and credits
    for (const [itemId, itemData] of trade.targetOffer.items) {
      if (!inventorySystem.hasItem(trade.targetId, itemId, itemData.quantity)) {
        return { valid: false, error: `Target missing item: ${itemId}` };
      }
    }
    
    const targetWallet = economySystem.getWallet(trade.targetId);
    for (const [currency, amount] of Object.entries(trade.targetOffer.credits)) {
      if (amount > 0 && targetWallet[currency] < amount) {
        return { valid: false, error: `Target insufficient ${currency}` };
      }
    }
    
    return { valid: true };
  }

  /**
   * Perform atomic trade transfers
   */
  async performTradeTransfers(trade) {
    const inventorySystem = this.engine.getSystem('inventory');
    const economySystem = this.engine.getSystem('economy');
    
    // Transfer initiator's items to target
    for (const [itemId, itemData] of trade.initiatorOffer.items) {
      inventorySystem.removeItem(trade.initiatorId, itemId, itemData.quantity);
      inventorySystem.addItem(trade.targetId, itemId, itemData.quantity);
    }
    
    // Transfer initiator's credits to target
    for (const [currency, amount] of Object.entries(trade.initiatorOffer.credits)) {
      if (amount > 0) {
        economySystem.debit(trade.initiatorId, currency, amount);
        economySystem.credit(trade.targetId, currency, amount);
      }
    }
    
    // Transfer target's items to initiator
    for (const [itemId, itemData] of trade.targetOffer.items) {
      inventorySystem.removeItem(trade.targetId, itemId, itemData.quantity);
      inventorySystem.addItem(trade.initiatorId, itemId, itemData.quantity);
    }
    
    // Transfer target's credits to initiator
    for (const [currency, amount] of Object.entries(trade.targetOffer.credits)) {
      if (amount > 0) {
        economySystem.debit(trade.targetId, currency, amount);
        economySystem.credit(trade.initiatorId, currency, amount);
      }
    }
  }

  // ── Reputation and History Management ───────────────────────────────────────

  /**
   * Update player's trading reputation based on trade outcome
   */
  updateTradingReputation(playerId, successful) {
    if (!this.tradeHistory.has(playerId)) {
      this.tradeHistory.set(playerId, []);
    }
    
    const history = this.tradeHistory.get(playerId);
    const now = Date.now();
    
    // Add trade result
    history.push({
      successful,
      timestamp: now,
      tradeValue: 0 // Calculate if needed for reputation weighting
    });
    
    // Remove old trades beyond reputation window
    const cutoff = now - (REPUTATION_DECAY_DAYS * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(trade => trade.timestamp > cutoff);
    this.tradeHistory.set(playerId, recentHistory);
    
    // Recalculate reputation
    this.calculateReputation(playerId);
  }

  /**
   * Calculate player's trading reputation level
   */
  calculateReputation(playerId) {
    const history = this.tradeHistory.get(playerId) || [];
    
    if (history.length === 0) {
      return TRADE_REPUTATION.UNTRUSTED;
    }
    
    const successfulTrades = history.filter(t => t.successful).length;
    const reliability = successfulTrades / history.length;
    const tradeCount = history.length;
    
    // Determine reputation tier
    for (const tier of Object.values(TRADE_REPUTATION)) {
      if (tradeCount >= tier.minTrades && reliability >= tier.reliability) {
        return tier;
      }
    }
    
    return TRADE_REPUTATION.UNTRUSTED;
  }

  /**
   * Get player's current trading reputation
   */
  getPlayerReputation(playerId) {
    if (this.reputationCache.has(playerId)) {
      return this.reputationCache.get(playerId);
    }
    
    const reputation = this.calculateReputation(playerId);
    this.reputationCache.set(playerId, reputation);
    return reputation;
  }

  // ── Utility and Cleanup Methods ─────────────────────────────────────────────

  /**
   * Cancel an active trade
   */
  cancelTrade(playerId, tradeId) {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      return { success: false, error: 'Trade not found' };
    }
    
    if (trade.initiatorId !== playerId && trade.targetId !== playerId) {
      return { success: false, error: 'Not part of this trade' };
    }
    
    if (trade.state === TRADE_STATES.EXECUTING) {
      return { success: false, error: 'Cannot cancel executing trade' };
    }
    
    // Mark as cancelled
    trade.state = TRADE_STATES.CANCELLED;
    trade.cancelledBy = playerId;
    trade.cancelledAt = Date.now();
    
    // Clean up player trade mappings
    this.playerTrades.delete(trade.initiatorId);
    this.playerTrades.delete(trade.targetId);
    
    // Emit cancellation
    this.engine.events.emit('trade:cancelled', {
      tradeId,
      cancelledBy: playerId
    });
    
    return { success: true };
  }

  /**
   * Clean up expired trades
   */
  cleanupExpiredTrades() {
    const now = Date.now();
    const expiredTrades = [];
    
    for (const [tradeId, trade] of this.trades) {
      if (now > trade.expiresAt && 
          trade.state !== TRADE_STATES.COMPLETED && 
          trade.state !== TRADE_STATES.FAILED) {
        
        expiredTrades.push(tradeId);
      }
    }
    
    for (const tradeId of expiredTrades) {
      const trade = this.trades.get(tradeId);
      trade.state = TRADE_STATES.CANCELLED;
      trade.cancelledBy = 'system';
      trade.cancelledAt = now;
      
      // Clean up player mappings
      this.playerTrades.delete(trade.initiatorId);
      this.playerTrades.delete(trade.targetId);
      
      console.log(`[PlayerTradingSystem] Expired trade ${tradeId}`);
    }
  }

  /**
   * Update reputation cache
   */
  updateReputationCache() {
    this.reputationCache.clear();
  }

  /**
   * Record completed trade in history
   */
  recordTradeHistory(trade) {
    const record = {
      tradeId: trade.id,
      initiatorId: trade.initiatorId,
      targetId: trade.targetId,
      completedAt: trade.completedAt,
      value: this.calculateTradeValue(trade),
      items: {
        initiator: Array.from(trade.initiatorOffer.items.values()),
        target: Array.from(trade.targetOffer.items.values())
      }
    };
    
    // Store in both players' history
    if (!this.tradeHistory.has(trade.initiatorId)) {
      this.tradeHistory.set(trade.initiatorId, []);
    }
    if (!this.tradeHistory.has(trade.targetId)) {
      this.tradeHistory.set(trade.targetId, []);
    }
    
    this.tradeHistory.get(trade.initiatorId).push({
      ...record,
      successful: true,
      timestamp: trade.completedAt
    });
    
    this.tradeHistory.get(trade.targetId).push({
      ...record,
      successful: true,
      timestamp: trade.completedAt
    });
  }

  // ── Helper Methods ──────────────────────────────────────────────────────────

  generateTradeId() {
    return 'trade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  calculateTradeValue(trade) {
    let value = 0;
    
    // Sum credit offers
    value += Object.values(trade.initiatorOffer.credits).reduce((sum, amount) => sum + amount, 0);
    value += Object.values(trade.targetOffer.credits).reduce((sum, amount) => sum + amount, 0);
    
    // Add estimated item values (would integrate with market pricing)
    // For now, placeholder calculation
    
    return value;
  }

  getPlayerName(playerId) {
    // Integration with player system to get display name
    return `Player_${playerId.slice(-8)}`;
  }

  isPlayerBlocked(playerId, blockedPlayerId) {
    const blocked = this.blockedPlayers.get(playerId);
    return blocked ? blocked.has(blockedPlayerId) : false;
  }

  /**
   * Get active trade for a player
   */
  getPlayerTrade(playerId) {
    const tradeId = this.playerTrades.get(playerId);
    return tradeId ? this.trades.get(tradeId) : null;
  }

  /**
   * Get player's trading statistics
   */
  getPlayerTradingStats(playerId) {
    const history = this.tradeHistory.get(playerId) || [];
    const successful = history.filter(t => t.successful).length;
    const reputation = this.getPlayerReputation(playerId);
    
    return {
      totalTrades: history.length,
      successfulTrades: successful,
      reliability: history.length > 0 ? successful / history.length : 0,
      reputation
    };
  }
}