/**
 * EconomySystem — the multi-currency economy of Old Eden.
 *
 * Three currency layers:
 *
 * 1. Eden Credits (EC)     — soft currency, earned in-game, not tradeable off-chain
 * 2. Stellar Marks (SM)    — premium hard currency, purchasable with fiat/crypto,
 *                            can be partially converted to EDEN tokens
 * 3. EDEN Token (on-chain) — ERC-20 governance and settlement token on Polygon
 *
 * Exchange Rates (dynamic, updated by market forces):
 *   EC  → SM:  10,000 EC = 1 SM  (floor price, can fluctuate ±30%)
 *   SM  → EC:  1 SM = 12,000 EC  (buy spread)
 *   SM  → EDEN token: managed by on-chain AMM (see PolygonConnector)
 *
 * Subscription tiers control EC earning multipliers and SM allowances.
 */

export const CURRENCY = Object.freeze({
  EC:   'ec',    // Eden Credits
  SM:   'sm',    // Stellar Marks
  EDEN: 'eden',  // EDEN on-chain token (managed by blockchain layer)
});

export const SUBSCRIPTION_TIER = Object.freeze({
  FREE:      'free',
  PIONEER:   'pioneer',
  VANGUARD:  'vanguard',
  OVERLORD:  'overlord',
});

const TIER_CONFIG = {
  [SUBSCRIPTION_TIER.FREE]:      { ecMultiplier: 1.0,  monthlySmAllowance: 0,    priceUsd: 0     },
  [SUBSCRIPTION_TIER.PIONEER]:   { ecMultiplier: 2.0,  monthlySmAllowance: 500,  priceUsd: 7.99  },
  [SUBSCRIPTION_TIER.VANGUARD]:  { ecMultiplier: 3.0,  monthlySmAllowance: 750,  priceUsd: 14.99 },
  [SUBSCRIPTION_TIER.OVERLORD]:  { ecMultiplier: 5.0,  monthlySmAllowance: 1500, priceUsd: 29.99 },
};

// Base exchange rates (EC per 1 SM)
const BASE_EC_PER_SM_SELL = 10_000;
const BASE_EC_PER_SM_BUY  = 12_000;

/**
 * Ukraine donation split — IMMUTABLE.
 * 10% of all real-money revenue is donated to Ukraine humanitarian aid.
 * This constant MUST NEVER be reduced or removed.
 */
export const UKRAINE_DONATION_SPLIT = 0.10;
export const UKRAINE_DONATION_WALLET = process.env.UKRAINE_DONATION_WALLET ?? '0x0000000000000000000000000000000000000000';

/**
 * Premium shard-hunting items purchasable with SM.
 */
export const SHARD_ITEMS = Object.freeze({
  SHARD_DETECTOR:     { id: 'shard_detector',     name: 'Shard Detector',     priceSm: 50,  durationHours: 24, description: 'Shows approximate shard locations on map for 24h' },
  SHARD_MAGNET:       { id: 'shard_magnet',       name: 'Shard Magnet',       priceSm: 200, durationHours: 1,  description: 'Increases shard pickup radius 5× for 1h' },
  FRACTURE_AMPLIFIER: { id: 'fracture_amplifier', name: 'Fracture Amplifier', priceSm: 100, durationHours: 0,  description: 'Your shards glow with a unique cosmic aura when you fracture (cosmetic)' },
});

export class EconomySystem {
  async init(engine) {
    this._engine = engine;
    /** @type {Map<string, Wallet>} playerId → wallet */
    this._wallets = new Map();
    /** @type {Map<string, string>} playerId → subscription tier */
    this._subscriptions = new Map();
    /** EC:SM exchange rate volatility factor (0.7–1.3) */
    this._exchangeRateFactor = 1.0;
    /** @type {Map<string, ShardInventory>} playerId → shard inventory */
    this._shardInventories = new Map();
    /** @type {Map<string, ActiveItem[]>} playerId → active premium items */
    this._activeItems = new Map();
    console.log('[EconomySystem] Initialised.');
  }

  tick(deltaMs) {
    // Slowly drift exchange rate toward 1.0 (mean-reversion) + small noise
    const noise = (Math.random() - 0.5) * 0.001;
    this._exchangeRateFactor = Math.max(0.7, Math.min(1.3,
      this._exchangeRateFactor * 0.9999 + 1.0 * 0.0001 + noise
    ));
  }

  async destroy() {}

  /**
   * Remove all state for a disconnected player to prevent memory leaks.
   * @param {string} playerId
   */
  removePlayer(playerId) {
    this._wallets.delete(playerId);
    this._subscriptions.delete(playerId);
    this._shardInventories.delete(playerId);
    this._activeItems.delete(playerId);
  }

  /**
   * Remove all state for a disconnected player to prevent memory leaks.
   * @param {string} playerId
   */
  removePlayer(playerId) {
    this._wallets.delete(playerId);
    this._subscriptions.delete(playerId);
    this._shardInventories.delete(playerId);
    this._activeItems.delete(playerId);
  }

  /**
   * Remove all state for a disconnected player to prevent memory leaks.
   * @param {string} playerId
   */
  removePlayer(playerId) {
    this._wallets.delete(playerId);
    this._subscriptions.delete(playerId);
    this._shardInventories.delete(playerId);
    this._activeItems.delete(playerId);
  }

  // ── Wallets ──────────────────────────────────────────────────────────────────

  /**
   * Get or create a wallet for a player.
   * @param {string} playerId
   * @returns {Wallet}
   */
  getWallet(playerId) {
    if (!this._wallets.has(playerId)) {
      this._wallets.set(playerId, { ec: 500, sm: 0, edenTokenAddress: null });
    }
    return this._wallets.get(playerId);
  }

  /**
   * Credit a currency amount to a player's wallet.
   * @param {string} playerId
   * @param {string} currency  CURRENCY enum value
   * @param {number} amount
   */
  credit(playerId, currency, amount) {
    if (amount <= 0) throw new RangeError('Credit amount must be positive.');
    const wallet = this.getWallet(playerId);
    if (currency === CURRENCY.EC) wallet.ec += amount;
    else if (currency === CURRENCY.SM) wallet.sm += amount;
    else throw new Error(`Cannot credit on-chain currency "${currency}" through EconomySystem.`);
    this._engine.events.emit('economy:credit', { playerId, currency, amount });
  }

  /**
   * Debit a currency amount from a player's wallet.
   * @param {string} playerId
   * @param {string} currency
   * @param {number} amount
   * @returns {boolean}  true if successful, false if insufficient funds
   */
  debit(playerId, currency, amount) {
    if (amount <= 0) throw new RangeError('Debit amount must be positive.');
    const wallet = this.getWallet(playerId);
    if (currency === CURRENCY.EC) {
      if (wallet.ec < amount) return false;
      wallet.ec -= amount;
    } else if (currency === CURRENCY.SM) {
      if (wallet.sm < amount) return false;
      wallet.sm -= amount;
    } else {
      throw new Error(`Cannot debit on-chain currency "${currency}" through EconomySystem.`);
    }
    this._engine.events.emit('economy:debit', { playerId, currency, amount });
    return true;
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────────

  /**
   * Set the subscription tier for a player (called after payment confirmation).
   * @param {string} playerId
   * @param {string} tier  SUBSCRIPTION_TIER enum value
   */
  setSubscription(playerId, tier) {
    if (!TIER_CONFIG[tier]) throw new Error(`Unknown subscription tier: ${tier}`);
    this._subscriptions.set(playerId, tier);
    this._engine.events.emit('economy:subscription_changed', { playerId, tier });
  }

  /**
   * Get the subscription tier for a player.
   * @param {string} playerId
   * @returns {string}
   */
  getSubscription(playerId) {
    return this._subscriptions.get(playerId) ?? SUBSCRIPTION_TIER.FREE;
  }

  /**
   * Get the EC earning multiplier for a player based on their subscription.
   * @param {string} playerId
   * @returns {number}
   */
  getEcMultiplier(playerId) {
    const tier = this.getSubscription(playerId);
    return TIER_CONFIG[tier]?.ecMultiplier ?? 1.0;
  }

  // ── Shard Inventory ─────────────────────────────────────────────────────────

  /**
   * Get a player's shard inventory (tracking absorbed shards).
   * @param {string} playerId
   * @returns {ShardInventory}
   */
  getShardInventory(playerId) {
    if (!this._shardInventories.has(playerId)) {
      this._shardInventories.set(playerId, {
        totalAbsorbed: 0,
        skillShards: 0,
        wealthShards: 0,
        itemShards: 0,
        mutationShards: 0,
        memoryShards: 0,
      });
    }
    return this._shardInventories.get(playerId);
  }

  /**
   * Record an absorbed shard in a player's inventory.
   * @param {string} playerId
   * @param {string} shardType  One of: skill, wealth, item, mutation, memory
   */
  recordShardAbsorption(playerId, shardType) {
    const inv = this.getShardInventory(playerId);
    inv.totalAbsorbed++;
    const key = `${shardType}Shards`;
    if (key in inv) inv[key]++;
  }

  // ── Premium Shard Items ────────────────────────────────────────────────────

  /**
   * Purchase a premium shard-hunting item.
   * @param {string} playerId
   * @param {string} itemId  Key from SHARD_ITEMS
   * @returns {{ success: boolean, reason?: string }}
   */
  purchaseShardItem(playerId, itemId) {
    const item = Object.values(SHARD_ITEMS).find(i => i.id === itemId);
    if (!item) return { success: false, reason: 'Unknown item.' };

    const success = this.debit(playerId, CURRENCY.SM, item.priceSm);
    if (!success) return { success: false, reason: 'Insufficient Stellar Marks.' };

    // Ukraine 10% donation split on every SM purchase — IMMUTABLE
    const donationAmount = item.priceSm * UKRAINE_DONATION_SPLIT;
    this._engine.events.emit('economy:ukraine_donation', { playerId, itemId: item.id, donationSm: donationAmount });

    if (item.durationHours > 0) {
      if (!this._activeItems.has(playerId)) this._activeItems.set(playerId, []);
      this._activeItems.get(playerId).push({
        itemId: item.id,
        activatedAt: Date.now(),
        expiresAt: Date.now() + item.durationHours * 60 * 60 * 1000,
      });
    }

    this._engine.events.emit('economy:shard_item_purchased', { playerId, itemId: item.id, priceSm: item.priceSm });
    return { success: true };
  }

  /**
   * Check if a player has an active premium item.
   * @param {string} playerId
   * @param {string} itemId
   * @returns {boolean}
   */
  hasActiveItem(playerId, itemId) {
    const items = this._activeItems.get(playerId);
    if (!items) return false;
    const now = Date.now();
    return items.some(i => i.itemId === itemId && now < i.expiresAt);
  }

  // ── Exchange ──────────────────────────────────────────────────────────────────

  /**
   * Convert EC to SM for a player (player sells EC, buys SM).
   * @param {string} playerId
   * @param {number} ecAmount
   * @returns {{ success: boolean, smReceived: number }}
   */
  sellEcForSm(playerId, ecAmount) {
    const rate = BASE_EC_PER_SM_SELL * this._exchangeRateFactor;
    const smReceived = Math.floor((ecAmount / rate) * 100) / 100;
    if (smReceived <= 0) return { success: false, smReceived: 0 };
    const success = this.debit(playerId, CURRENCY.EC, ecAmount);
    if (success) this.credit(playerId, CURRENCY.SM, smReceived);
    return { success, smReceived: success ? smReceived : 0 };
  }

  /**
   * Convert SM to EC for a player (player sells SM, buys EC).
   * @param {string} playerId
   * @param {number} smAmount
   * @returns {{ success: boolean, ecReceived: number }}
   */
  sellSmForEc(playerId, smAmount) {
    const rate = BASE_EC_PER_SM_BUY * this._exchangeRateFactor;
    const ecReceived = Math.floor(smAmount * rate);
    if (ecReceived <= 0) return { success: false, ecReceived: 0 };
    const success = this.debit(playerId, CURRENCY.SM, smAmount);
    if (success) this.credit(playerId, CURRENCY.EC, ecReceived);
    return { success, ecReceived: success ? ecReceived : 0 };
  }

  /**
   * Get current EC:SM exchange rates.
   * @returns {{ sellRate: number, buyRate: number }}
   */
  getExchangeRates() {
    return {
      ecPerSmSell: BASE_EC_PER_SM_SELL * this._exchangeRateFactor,
      ecPerSmBuy:  BASE_EC_PER_SM_BUY  * this._exchangeRateFactor,
    };
  }
}

/**
 * @typedef {object} Wallet
 * @property {number}      ec
 * @property {number}      sm
 * @property {string|null} edenTokenAddress  Polygon wallet address (if linked)
 */
