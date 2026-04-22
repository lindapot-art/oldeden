/**
 * AuctionHouseSystem — Player-driven market with orders and price discovery
 * 
 * Provides:
 * - Player market orders (buy/sell listings)
 * - Regional markets with supply/demand dynamics
 * - Price discovery and historical data
 * - Anti-manipulation measures and taxation
 * - Integration with guild territories and faction space
 *
 * INTEGRATION POINTS:
 * - EconomySystem: Base currency and pricing mechanisms
 * - InventorySystem: Item listings and transfers
 * - GuildSystem: Guild market taxation and bonuses
 * - FactionSystem: Faction space market access restrictions
 * - TerritoryControlSystem: Regional market control effects
 */

// ── Market Order Types and States ───────────────────────────────────────────

export const ORDER_TYPES = Object.freeze({
  BUY: 'buy',
  SELL: 'sell'
});

export const ORDER_STATES = Object.freeze({
  ACTIVE: 'active',       // Order is live on the market
  PARTIAL: 'partial',     // Order partially filled
  FILLED: 'filled',       // Order completely filled
  CANCELLED: 'cancelled', // Order cancelled by player
  EXPIRED: 'expired'      // Order expired (time-based)
});

// ── Market Configuration ────────────────────────────────────────────────────

const ORDER_DURATION_OPTIONS = Object.freeze({
  IMMEDIATE: { duration: 0, name: 'Immediate', fee: 0.01 },        // Fill or cancel
  SHORT: { duration: 86400000, name: '24 Hours', fee: 0.02 },     // 1 day
  MEDIUM: { duration: 604800000, name: '7 Days', fee: 0.025 },    // 7 days
  LONG: { duration: 2592000000, name: '30 Days', fee: 0.03 }      // 30 days
});

const MARKET_REGIONS = Object.freeze({
  CORE_SYSTEMS: {
    id: 'core_systems',
    name: 'Core Systems Market',
    systems: ['system-0', 'system-1', 'system-2', 'system-3', 'system-4'],
    taxRate: 0.05,
    bonuses: { liquidity: 1.2, priceStability: 1.1 }
  },
  FRONTIER: {
    id: 'frontier',
    name: 'Frontier Markets',
    systems: ['system-35', 'system-36', 'system-37', 'system-38', 'system-39'],
    taxRate: 0.02,
    bonuses: { volatility: 1.5, rareMaterials: 1.3 }
  },
  TRADE_LANES: {
    id: 'trade_lanes', 
    name: 'Trade Lane Hubs',
    systems: ['system-10', 'system-15', 'system-20', 'system-25', 'system-30'],
    taxRate: 0.03,
    bonuses: { volume: 1.4, access: 1.2 }
  }
});

// ── Anti-Manipulation Security ─────────────────────────────────────────────

const MAX_ORDER_VALUE = 10000000; // Maximum single order value
const MAX_ORDERS_PER_PLAYER = 50; // Maximum concurrent orders
const MIN_ORDER_VALUE = 100; // Minimum order value to prevent spam
const PRICE_DEVIATION_ALERT = 0.3; // 30% price change triggers monitoring

export class AuctionHouseSystem {
  constructor(engine) {
    this.engine = engine;
    
    // Market data structures
    this.orders = new Map(); // orderId -> Order
    this.playerOrders = new Map(); // playerId -> Set(orderId)
    this.marketsByRegion = new Map(); // regionId -> Market
    this.itemOrders = new Map(); // itemId -> { buyOrders: [], sellOrders: [] }
    
    // Price tracking and history
    this.priceHistory = new Map(); // itemId -> PriceRecord[]
    this.marketStats = new Map(); // regionId -> Statistics
    this.dailyVolumes = new Map(); // itemId -> { volume, revenue }
    
    // Transaction records
    this.transactions = new Map(); // transactionId -> Transaction
    this.playerTransactions = new Map(); // playerId -> TransactionRecord[]
    
    // Security and monitoring
    this.suspiciousActivity = new Map(); // playerId -> Alert[]
    this.priceManipulationFlags = new Map(); // itemId -> Flag[]
    
    // Regional market control
    this.marketControllers = new Map(); // regionId -> guildId
    this.marketAccess = new Map(); // playerId -> Set(regionId)
  }

  async init() {
    console.log('[AuctionHouseSystem] Initializing player markets...');
    
    // Initialize regional markets
    for (const [regionId, regionConfig] of Object.entries(MARKET_REGIONS)) {
      this.marketsByRegion.set(regionId, {
        ...regionConfig,
        activeOrders: new Map(),
        totalVolume: 0,
        dailyTransactions: 0,
        lastReset: Date.now()
      });
      
      this.marketStats.set(regionId, {
        averagePrice: new Map(),
        volumeStats: new Map(),
        volatilityIndex: new Map()
      });
    }
    
    // Process order matching every 5 seconds
    setInterval(() => {
      this.processOrderMatching();
    }, 5000);
    
    // Update market statistics every minute
    setInterval(() => {
      this.updateMarketStatistics();
    }, 60000);
    
    // Clean expired orders every 10 minutes
    setInterval(() => {
      this.cleanExpiredOrders();
    }, 600000);
    
    // Reset daily statistics at midnight
    setInterval(() => {
      this.resetDailyStats();
    }, 86400000);
    
    return true;
  }

  // ── Order Creation and Management ───────────────────────────────────────────

  /**
   * Create a new market order
   */
  createOrder(playerId, orderData) {
    const { type, itemId, quantity, price, duration, regionId } = orderData;
    
    // Validation
    const validation = this.validateOrder(playerId, orderData);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Check player order limits
    const playerOrderCount = (this.playerOrders.get(playerId) || new Set()).size;
    if (playerOrderCount >= MAX_ORDERS_PER_PLAYER) {
      return { success: false, error: 'Maximum orders reached' };
    }
    
    // Check market access
    if (!this.hasMarketAccess(playerId, regionId)) {
      return { success: false, error: 'No access to this market' };
    }
    
    const durationConfig = ORDER_DURATION_OPTIONS[duration] || ORDER_DURATION_OPTIONS.SHORT;
    const orderValue = quantity * price;
    const marketingFee = Math.floor(orderValue * durationConfig.fee);
    
    // Handle order-specific validation and escrow
    if (type === ORDER_TYPES.SELL) {
      // Validate seller has items and escrow them
      const result = this.escrowItems(playerId, itemId, quantity);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    } else {
      // Validate buyer has credits and escrow them
      const result = this.escrowCredits(playerId, orderValue + marketingFee);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }
    
    // Create order
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      playerId,
      type,
      itemId,
      quantity,
      originalQuantity: quantity,
      price,
      orderValue,
      marketingFee,
      regionId,
      state: ORDER_STATES.ACTIVE,
      
      // Timing
      createdAt: Date.now(),
      expiresAt: durationConfig.duration > 0 ? Date.now() + durationConfig.duration : null,
      
      // Tracking
      filledQuantity: 0,
      remainingQuantity: quantity,
      transactions: [],
      
      // Metadata
      itemName: this.getItemName(itemId),
      duration: duration
    };
    
    // Register order
    this.orders.set(orderId, order);
    
    // Add to player's orders
    if (!this.playerOrders.has(playerId)) {
      this.playerOrders.set(playerId, new Set());
    }
    this.playerOrders.get(playerId).add(orderId);
    
    // Add to item order book
    if (!this.itemOrders.has(itemId)) {
      this.itemOrders.set(itemId, { buyOrders: [], sellOrders: [] });
    }
    
    const orderBook = this.itemOrders.get(itemId);
    if (type === ORDER_TYPES.BUY) {
      orderBook.buyOrders.push(orderId);
      // Sort by price descending (highest buy orders first)
      orderBook.buyOrders.sort((a, b) => {
        const orderA = this.orders.get(a);
        const orderB = this.orders.get(b);
        return orderB.price - orderA.price;
      });
    } else {
      orderBook.sellOrders.push(orderId);
      // Sort by price ascending (lowest sell orders first)
      orderBook.sellOrders.sort((a, b) => {
        const orderA = this.orders.get(a);
        const orderB = this.orders.get(b);
        return orderA.price - orderB.price;
      });
    }
    
    // Add to regional market
    const market = this.marketsByRegion.get(regionId);
    if (market) {
      market.activeOrders.set(orderId, order);
    }
    
    console.log(`[AuctionHouse] Order created: ${type} ${quantity}x ${itemId} @ ${price} credits`);
    
    // Emit order created event
    this.engine.events.emit('market:order_created', {
      orderId,
      playerId,
      type,
      itemId,
      quantity,
      price,
      regionId
    });
    
    return { success: true, orderId, order };
  }

  /**
   * Cancel an active order
   */
  cancelOrder(playerId, orderId) {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }
    
    if (order.playerId !== playerId) {
      return { success: false, error: 'Not your order' };
    }
    
    if (order.state !== ORDER_STATES.ACTIVE && order.state !== ORDER_STATES.PARTIAL) {
      return { success: false, error: 'Cannot cancel order in current state' };
    }
    
    // Return escrowed items/credits
    if (order.type === ORDER_TYPES.SELL && order.remainingQuantity > 0) {
      this.returnEscrowedItems(playerId, order.itemId, order.remainingQuantity);
    } else if (order.type === ORDER_TYPES.BUY && order.remainingQuantity > 0) {
      const remainingValue = order.remainingQuantity * order.price;
      this.returnEscrowedCredits(playerId, remainingValue);
    }
    
    // Update order state
    order.state = ORDER_STATES.CANCELLED;
    order.cancelledAt = Date.now();
    
    // Remove from order books
    this.removeFromOrderBook(orderId);
    
    // Remove from regional market
    const market = this.marketsByRegion.get(order.regionId);
    if (market) {
      market.activeOrders.delete(orderId);
    }
    
    // Emit cancellation event
    this.engine.events.emit('market:order_cancelled', {
      orderId,
      playerId,
      remainingQuantity: order.remainingQuantity
    });
    
    return { success: true };
  }

  // ── Order Matching Engine ───────────────────────────────────────────────────

  /**
   * Process automatic order matching
   */
  processOrderMatching() {
    for (const [itemId, orderBook] of this.itemOrders) {
      this.matchOrdersForItem(itemId, orderBook);
    }
  }

  /**
   * Match buy and sell orders for a specific item
   */
  matchOrdersForItem(itemId, orderBook) {
    if (orderBook.buyOrders.length === 0 || orderBook.sellOrders.length === 0) {
      return;
    }
    
    // Get highest buy order and lowest sell order
    const topBuyOrderId = orderBook.buyOrders[0];
    const topSellOrderId = orderBook.sellOrders[0];
    
    const buyOrder = this.orders.get(topBuyOrderId);
    const sellOrder = this.orders.get(topSellOrderId);
    
    // Check if orders can match (buy price >= sell price)
    if (!buyOrder || !sellOrder || 
        buyOrder.price < sellOrder.price ||
        buyOrder.state !== ORDER_STATES.ACTIVE ||
        sellOrder.state !== ORDER_STATES.ACTIVE) {
      return;
    }
    
    // Prevent self-trading
    if (buyOrder.playerId === sellOrder.playerId) {
      return;
    }
    
    // Calculate match
    const matchQuantity = Math.min(buyOrder.remainingQuantity, sellOrder.remainingQuantity);
    const matchPrice = sellOrder.price; // Buyer pays seller's asking price
    const totalValue = matchQuantity * matchPrice;
    
    // Execute the trade
    this.executeOrderMatch(buyOrder, sellOrder, matchQuantity, matchPrice, totalValue);
  }

  /**
   * Execute a matched trade between two orders
   */
  executeOrderMatch(buyOrder, sellOrder, quantity, price, totalValue) {
    const transactionId = this.generateTransactionId();
    
    // Calculate taxes and fees
    const market = this.marketsByRegion.get(buyOrder.regionId);
    const taxRate = market ? market.taxRate : 0.03;
    const marketTax = Math.floor(totalValue * taxRate);
    
    // Guild market bonuses
    const guildBonuses = this.calculateGuildMarketBonuses(buyOrder.playerId, sellOrder.playerId, market);
    const buyerFeeReduction = guildBonuses.buyer.feeReduction;
    const sellerBonus = guildBonuses.seller.revenueBonus;
    
    // Final amounts
    const buyerCost = totalValue + Math.floor(marketTax * (1 - buyerFeeReduction));
    const sellerRevenue = totalValue - marketTax + Math.floor(totalValue * sellerBonus);
    
    // Create transaction record
    const transaction = {
      id: transactionId,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      buyerId: buyOrder.playerId,
      sellerId: sellOrder.playerId,
      itemId: buyOrder.itemId,
      quantity,
      price,
      totalValue,
      marketTax,
      buyerCost,
      sellerRevenue,
      regionId: buyOrder.regionId,
      timestamp: Date.now(),
      guildBonuses
    };
    
    // Execute transfers
    try {
      // Transfer items from seller to buyer
      this.transferItems(sellOrder.playerId, buyOrder.playerId, buyOrder.itemId, quantity);
      
      // Transfer credits (already escrowed from buyer, pay seller)
      this.paySellerFromEscrow(sellOrder.playerId, sellerRevenue);
      
      // Update order quantities
      buyOrder.filledQuantity += quantity;
      buyOrder.remainingQuantity -= quantity;
      sellOrder.filledQuantity += quantity;
      sellOrder.remainingQuantity -= quantity;
      
      // Update order states
      if (buyOrder.remainingQuantity === 0) {
        buyOrder.state = ORDER_STATES.FILLED;
        this.removeFromOrderBook(buyOrder.id);
      } else {
        buyOrder.state = ORDER_STATES.PARTIAL;
      }
      
      if (sellOrder.remainingQuantity === 0) {
        sellOrder.state = ORDER_STATES.FILLED;
        this.removeFromOrderBook(sellOrder.id);
      } else {
        sellOrder.state = ORDER_STATES.PARTIAL;
      }
      
      // Record transaction
      this.transactions.set(transactionId, transaction);
      buyOrder.transactions.push(transactionId);
      sellOrder.transactions.push(transactionId);
      
      // Add to player transaction history
      this.addToPlayerTransactionHistory(buyOrder.playerId, transaction);
      this.addToPlayerTransactionHistory(sellOrder.playerId, transaction);
      
      // Update market statistics
      this.updateMarketStatsForTransaction(transaction);
      
      // Update price history
      this.updatePriceHistory(buyOrder.itemId, price, quantity, buyOrder.regionId);
      
      console.log(`[AuctionHouse] Trade executed: ${quantity}x ${buyOrder.itemId} @ ${price} credits`);
      
      // Emit transaction event
      this.engine.events.emit('market:transaction', transaction);
      
    } catch (error) {
      console.error('[AuctionHouse] Trade execution failed:', error.message);
      
      // Rollback on failure (implement as needed)
      this.engine.events.emit('market:transaction_failed', {
        transactionId,
        error: error.message
      });
    }
  }

  // ── Market Data and Analysis ────────────────────────────────────────────────

  /**
   * Get current market prices for an item
   */
  getMarketPrices(itemId, regionId = null) {
    const orderBook = this.itemOrders.get(itemId);
    if (!orderBook) {
      return { bestBuy: null, bestSell: null, spread: null };
    }
    
    // Filter by region if specified
    let buyOrders = orderBook.buyOrders;
    let sellOrders = orderBook.sellOrders;
    
    if (regionId) {
      buyOrders = buyOrders.filter(orderId => {
        const order = this.orders.get(orderId);
        return order && order.regionId === regionId && order.state === ORDER_STATES.ACTIVE;
      });
      
      sellOrders = sellOrders.filter(orderId => {
        const order = this.orders.get(orderId);
        return order && order.regionId === regionId && order.state === ORDER_STATES.ACTIVE;
      });
    }
    
    const bestBuy = buyOrders.length > 0 ? this.orders.get(buyOrders[0])?.price : null;
    const bestSell = sellOrders.length > 0 ? this.orders.get(sellOrders[0])?.price : null;
    const spread = (bestBuy && bestSell) ? bestSell - bestBuy : null;
    
    return { bestBuy, bestSell, spread };
  }

  /**
   * Get price history for an item
   */
  getPriceHistory(itemId, days = 7) {
    const history = this.priceHistory.get(itemId) || [];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return history.filter(record => record.timestamp > cutoff);
  }

  /**
   * Get market depth (order book) for an item
   */
  getMarketDepth(itemId, regionId = null, maxLevels = 10) {
    const orderBook = this.itemOrders.get(itemId);
    if (!orderBook) {
      return { buyOrders: [], sellOrders: [] };
    }
    
    const buyDepth = [];
    const sellDepth = [];
    
    // Process buy orders (highest prices first)
    for (let i = 0; i < Math.min(maxLevels, orderBook.buyOrders.length); i++) {
      const order = this.orders.get(orderBook.buyOrders[i]);
      if (order && order.state === ORDER_STATES.ACTIVE &&
          (!regionId || order.regionId === regionId)) {
        buyDepth.push({
          price: order.price,
          quantity: order.remainingQuantity,
          total: order.remainingQuantity * order.price
        });
      }
    }
    
    // Process sell orders (lowest prices first)
    for (let i = 0; i < Math.min(maxLevels, orderBook.sellOrders.length); i++) {
      const order = this.orders.get(orderBook.sellOrders[i]);
      if (order && order.state === ORDER_STATES.ACTIVE &&
          (!regionId || order.regionId === regionId)) {
        sellDepth.push({
          price: order.price,
          quantity: order.remainingQuantity,
          total: order.remainingQuantity * order.price
        });
      }
    }
    
    return { buyOrders: buyDepth, sellOrders: sellDepth };
  }

  // ── Regional Markets and Access Control ─────────────────────────────────────

  /**
   * Check if player has access to a market region
   */
  hasMarketAccess(playerId, regionId) {
    // Basic access - all players can access basic markets
    if (regionId === 'core_systems') {
      return true;
    }
    
    // Check faction standings for restricted regions
    const factionSystem = this.engine.getSystem('factions');
    if (factionSystem) {
      const playerFactionRep = this.getPlayerHighestFactionRep(playerId);
      
      // Frontier markets require positive reputation
      if (regionId === 'frontier' && playerFactionRep < 100) {
        return false;
      }
    }
    
    // Check guild territory control
    const guildSystem = this.engine.getSystem('guilds');
    if (guildSystem) {
      const playerGuild = guildSystem.getPlayerGuild(playerId);
      const marketController = this.marketControllers.get(regionId);
      
      // If market is controlled by a guild and player isn't in that guild
      if (marketController && (!playerGuild || playerGuild.id !== marketController)) {
        // Check if guild allows public access (implement guild policies)
        return false;
      }
    }
    
    return true;
  }

  /**
   * Calculate guild bonuses for market transactions
   */
  calculateGuildMarketBonuses(buyerId, sellerId, market) {
    const guildSystem = this.engine.getSystem('guilds');
    const bonuses = {
      buyer: { feeReduction: 0 },
      seller: { revenueBonus: 0 }
    };
    
    if (!guildSystem) return bonuses;
    
    const buyerGuild = guildSystem.getPlayerGuild(buyerId);
    const sellerGuild = guildSystem.getPlayerGuild(sellerId);
    
    // Same guild bonus
    if (buyerGuild && sellerGuild && buyerGuild.id === sellerGuild.id) {
      bonuses.buyer.feeReduction = 0.5; // 50% fee reduction
      bonuses.seller.revenueBonus = 0.1; // 10% revenue bonus
    }
    
    // Market control bonuses
    const marketController = this.marketControllers.get(market?.id);
    if (marketController) {
      if (buyerGuild && buyerGuild.id === marketController) {
        bonuses.buyer.feeReduction += 0.2;
      }
      if (sellerGuild && sellerGuild.id === marketController) {
        bonuses.seller.revenueBonus += 0.15;
      }
    }
    
    return bonuses;
  }

  // ── Order Validation and Escrow ─────────────────────────────────────────────

  /**
   * Validate order creation parameters
   */
  validateOrder(playerId, orderData) {
    const { type, itemId, quantity, price, regionId } = orderData;
    
    // Basic validation
    if (!Object.values(ORDER_TYPES).includes(type)) {
      return { valid: false, error: 'Invalid order type' };
    }
    
    if (!itemId || quantity <= 0 || price <= 0) {
      return { valid: false, error: 'Invalid order parameters' };
    }
    
    const orderValue = quantity * price;
    
    if (orderValue < MIN_ORDER_VALUE) {
      return { valid: false, error: `Minimum order value: ${MIN_ORDER_VALUE}` };
    }
    
    if (orderValue > MAX_ORDER_VALUE) {
      return { valid: false, error: `Maximum order value: ${MAX_ORDER_VALUE}` };
    }
    
    if (!MARKET_REGIONS[regionId]) {
      return { valid: false, error: 'Invalid market region' };
    }
    
    // Item validation (check if item exists and is tradeable)
    const itemExists = this.validateItemExists(itemId);
    if (!itemExists) {
      return { valid: false, error: 'Item not found or not tradeable' };
    }
    
    // Check for suspicious pricing
    const recentPrice = this.getRecentAveragePrice(itemId);
    if (recentPrice > 0) {
      const priceDeviation = Math.abs(price - recentPrice) / recentPrice;
      if (priceDeviation > PRICE_DEVIATION_ALERT) {
        // Flag for review but allow order
        this.flagSuspiciousPricing(playerId, itemId, price, recentPrice);
      }
    }
    
    return { valid: true };
  }

  /**
   * Escrow items for sell orders
   */
  escrowItems(playerId, itemId, quantity) {
    const inventorySystem = this.engine.getSystem('inventory');
    if (!inventorySystem) {
      return { success: false, error: 'Inventory system unavailable' };
    }
    
    if (!inventorySystem.hasItem(playerId, itemId, quantity)) {
      return { success: false, error: 'Insufficient items' };
    }
    
    // Remove items from player inventory (held in escrow)
    inventorySystem.removeItem(playerId, itemId, quantity);
    
    return { success: true };
  }

  /**
   * Escrow credits for buy orders
   */
  escrowCredits(playerId, amount) {
    const economySystem = this.engine.getSystem('economy');
    if (!economySystem) {
      return { success: false, error: 'Economy system unavailable' };
    }
    
    const wallet = economySystem.getWallet(playerId);
    if (wallet.ec < amount) {
      return { success: false, error: 'Insufficient credits' };
    }
    
    // Debit credits from player (held in escrow)
    economySystem.debit(playerId, 'ec', amount);
    
    return { success: true };
  }

  // ── Utility and Helper Methods ──────────────────────────────────────────────

  generateOrderId() {
    return 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateTransactionId() {
    return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  validateItemExists(itemId) {
    // Integration with item/inventory system to validate item exists
    return true; // Placeholder
  }

  getItemName(itemId) {
    // Integration with item system to get display name
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getRecentAveragePrice(itemId) {
    const history = this.priceHistory.get(itemId) || [];
    if (history.length === 0) return 0;
    
    const recentHistory = history.filter(record => 
      Date.now() - record.timestamp < 86400000 // Last 24 hours
    );
    
    if (recentHistory.length === 0) return 0;
    
    const totalValue = recentHistory.reduce((sum, record) => sum + (record.price * record.quantity), 0);
    const totalQuantity = recentHistory.reduce((sum, record) => sum + record.quantity, 0);
    
    return totalQuantity > 0 ? totalValue / totalQuantity : 0;
  }

  updatePriceHistory(itemId, price, quantity, regionId) {
    if (!this.priceHistory.has(itemId)) {
      this.priceHistory.set(itemId, []);
    }
    
    const history = this.priceHistory.get(itemId);
    history.push({
      price,
      quantity,
      regionId,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 records per item
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  removeFromOrderBook(orderId) {
    const order = this.orders.get(orderId);
    if (!order) return;
    
    const orderBook = this.itemOrders.get(order.itemId);
    if (!orderBook) return;
    
    if (order.type === ORDER_TYPES.BUY) {
      const index = orderBook.buyOrders.indexOf(orderId);
      if (index > -1) orderBook.buyOrders.splice(index, 1);
    } else {
      const index = orderBook.sellOrders.indexOf(orderId);
      if (index > -1) orderBook.sellOrders.splice(index, 1);
    }
  }

  cleanExpiredOrders() {
    const now = Date.now();
    const expiredOrders = [];
    
    for (const [orderId, order] of this.orders) {
      if (order.expiresAt && now > order.expiresAt && 
          (order.state === ORDER_STATES.ACTIVE || order.state === ORDER_STATES.PARTIAL)) {
        expiredOrders.push(orderId);
      }
    }
    
    for (const orderId of expiredOrders) {
      const order = this.orders.get(orderId);
      
      // Return escrowed items/credits
      if (order.type === ORDER_TYPES.SELL && order.remainingQuantity > 0) {
        this.returnEscrowedItems(order.playerId, order.itemId, order.remainingQuantity);
      } else if (order.type === ORDER_TYPES.BUY && order.remainingQuantity > 0) {
        const remainingValue = order.remainingQuantity * order.price;
        this.returnEscrowedCredits(order.playerId, remainingValue);
      }
      
      order.state = ORDER_STATES.EXPIRED;
      this.removeFromOrderBook(orderId);
    }
    
    console.log(`[AuctionHouse] Expired ${expiredOrders.length} orders`);
  }

  returnEscrowedItems(playerId, itemId, quantity) {
    const inventorySystem = this.engine.getSystem('inventory');
    if (inventorySystem) {
      inventorySystem.addItem(playerId, itemId, quantity);
    }
  }

  returnEscrowedCredits(playerId, amount) {
    const economySystem = this.engine.getSystem('economy');
    if (economySystem) {
      economySystem.credit(playerId, 'ec', amount);
    }
  }

  transferItems(fromPlayerId, toPlayerId, itemId, quantity) {
    // Items are already escrowed from seller, just give to buyer
    const inventorySystem = this.engine.getSystem('inventory');
    if (inventorySystem) {
      inventorySystem.addItem(toPlayerId, itemId, quantity);
    }
  }

  paySellerFromEscrow(sellerId, amount) {
    const economySystem = this.engine.getSystem('economy');
    if (economySystem) {
      economySystem.credit(sellerId, 'ec', amount);
    }
  }

  addToPlayerTransactionHistory(playerId, transaction) {
    if (!this.playerTransactions.has(playerId)) {
      this.playerTransactions.set(playerId, []);
    }
    
    const history = this.playerTransactions.get(playerId);
    history.push({
      transactionId: transaction.id,
      itemId: transaction.itemId,
      quantity: transaction.quantity,
      price: transaction.price,
      isBuyer: transaction.buyerId === playerId,
      timestamp: transaction.timestamp
    });
    
    // Keep only last 100 transactions per player
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  updateMarketStatsForTransaction(transaction) {
    // Update daily volumes
    const dailyKey = transaction.itemId;
    if (!this.dailyVolumes.has(dailyKey)) {
      this.dailyVolumes.set(dailyKey, { volume: 0, revenue: 0 });
    }
    
    const dailyStats = this.dailyVolumes.get(dailyKey);
    dailyStats.volume += transaction.quantity;
    dailyStats.revenue += transaction.totalValue;
    
    // Update regional market stats
    const market = this.marketsByRegion.get(transaction.regionId);
    if (market) {
      market.totalVolume += transaction.totalValue;
      market.dailyTransactions += 1;
    }
  }

  updateMarketStatistics() {
    // Update volatility indices, average prices, etc.
    // Complex market analysis would go here
  }

  resetDailyStats() {
    this.dailyVolumes.clear();
    
    for (const market of this.marketsByRegion.values()) {
      market.dailyTransactions = 0;
      market.lastReset = Date.now();
    }
  }

  flagSuspiciousPricing(playerId, itemId, price, recentPrice) {
    if (!this.suspiciousActivity.has(playerId)) {
      this.suspiciousActivity.set(playerId, []);
    }
    
    this.suspiciousActivity.get(playerId).push({
      type: 'suspicious_pricing',
      itemId,
      price,
      recentPrice,
      timestamp: Date.now()
    });
  }

  getPlayerHighestFactionRep(playerId) {
    // Integration with faction system
    return 0; // Placeholder
  }

  /**
   * Get player's active orders
   */
  getPlayerOrders(playerId) {
    const orderIds = this.playerOrders.get(playerId) || new Set();
    return Array.from(orderIds).map(id => this.orders.get(id)).filter(order => 
      order && (order.state === ORDER_STATES.ACTIVE || order.state === ORDER_STATES.PARTIAL)
    );
  }

  /**
   * Get player's transaction history
   */
  getPlayerTransactionHistory(playerId, limit = 20) {
    const history = this.playerTransactions.get(playerId) || [];
    return history.slice(-limit);
  }

  /**
   * Get market overview for a region
   */
  getMarketOverview(regionId) {
    const market = this.marketsByRegion.get(regionId);
    if (!market) return null;
    
    const stats = this.marketStats.get(regionId);
    
    return {
      region: market,
      activeOrders: market.activeOrders.size,
      dailyVolume: market.totalVolume,
      dailyTransactions: market.dailyTransactions,
      statistics: stats
    };
  }

  /**
   * Search markets for items
   */
  searchMarkets(query, filters = {}) {
    const results = new Map();
    
    for (const [itemId, orderBook] of this.itemOrders) {
      if (query && !itemId.toLowerCase().includes(query.toLowerCase())) {
        continue;
      }
      
      const prices = this.getMarketPrices(itemId, filters.regionId);
      
      if (filters.hasOrders && !prices.bestBuy && !prices.bestSell) {
        continue;
      }
      
      results.set(itemId, {
        itemId,
        itemName: this.getItemName(itemId),
        prices,
        volume: this.dailyVolumes.get(itemId)?.volume || 0
      });
    }
    
    return Array.from(results.values());
  }
}