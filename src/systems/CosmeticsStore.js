import { randomUUID } from 'crypto';

/**
 * CosmeticsStore — the purely-visual item shop of Old Eden.
 *
 * All items are cosmetic only — zero gameplay advantage.
 *
 * Categories:
 *   - Ship: paint jobs, engine trails, weapon effects
 *   - Character: outfits, emotes, voice packs
 *   - Housing: furniture, decorations
 *   - Station: exterior customisation
 *
 * Pricing: 50–500 SM ($0.50–$5.00 equivalent)
 */

const COSMETIC_CATEGORY = Object.freeze({
  SHIP:      'ship',
  CHARACTER: 'character',
  HOUSING:   'housing',
  STATION:   'station',
  EMOTE:     'emote',
  EFFECT:    'effect',
});

export { COSMETIC_CATEGORY };

export class CosmeticsStore {
  async init(engine) {
    this._engine = engine;
    /** @type {Map<string, CosmeticItem>} itemId → item */
    this._catalog = new Map();
    /** @type {Map<string, Set<string>>} playerId → Set of owned item IDs */
    this._playerInventory = new Map();

    this._seedCatalog();
    console.log('[CosmeticsStore] Initialised.');
  }

  tick(_deltaMs) {}

  async destroy() {
    this._catalog.clear();
    this._playerInventory.clear();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Get the full catalog of available cosmetic items.
   * @returns {CosmeticItem[]}
   */
  getCatalog() {
    return [...this._catalog.values()];
  }

  /**
   * Get items by category.
   * @param {string} category  COSMETIC_CATEGORY value
   * @returns {CosmeticItem[]}
   */
  getByCategory(category) {
    return [...this._catalog.values()].filter(i => i.category === category);
  }

  /**
   * Purchase a cosmetic item for a player.
   * @param {string} playerId
   * @param {string} itemId
   * @returns {{ success: boolean, reason?: string }}
   */
  purchase(playerId, itemId) {
    const item = this._catalog.get(itemId);
    if (!item) return { success: false, reason: 'Item not found.' };
    if (!item.available) return { success: false, reason: 'Item not currently available.' };

    const inventory = this._getInventory(playerId);
    if (inventory.has(itemId)) return { success: false, reason: 'Already owned.' };

    const economy = this._engine.getSystem('economy');
    if (!economy) return { success: false, reason: 'Economy system unavailable.' };

    const success = economy.debit(playerId, 'sm', item.priceSm);
    if (!success) return { success: false, reason: 'Insufficient Stellar Marks.' };

    inventory.add(itemId);
    this._engine.events.emit('cosmetics:purchased', {
      playerId,
      itemId,
      itemName: item.name,
      category: item.category,
      priceSm: item.priceSm,
    });

    return { success: true };
  }

  /**
   * Gift a cosmetic item from one player to another.
   * @param {string} fromPlayerId
   * @param {string} toPlayerId
   * @param {string} itemId
   * @returns {{ success: boolean, reason?: string }}
   */
  gift(fromPlayerId, toPlayerId, itemId) {
    const item = this._catalog.get(itemId);
    if (!item) return { success: false, reason: 'Item not found.' };

    const toInventory = this._getInventory(toPlayerId);
    if (toInventory.has(itemId)) return { success: false, reason: 'Recipient already owns this item.' };

    const economy = this._engine.getSystem('economy');
    if (!economy) return { success: false, reason: 'Economy system unavailable.' };

    const success = economy.debit(fromPlayerId, 'sm', item.priceSm);
    if (!success) return { success: false, reason: 'Insufficient Stellar Marks.' };

    toInventory.add(itemId);
    this._engine.events.emit('cosmetics:gifted', {
      fromPlayerId,
      toPlayerId,
      itemId,
      itemName: item.name,
      priceSm: item.priceSm,
    });

    return { success: true };
  }

  /**
   * Get a player's owned cosmetics.
   * @param {string} playerId
   * @returns {CosmeticItem[]}
   */
  getPlayerCosmetics(playerId) {
    const inventory = this._getInventory(playerId);
    return [...inventory].map(id => this._catalog.get(id)).filter(Boolean);
  }

  /**
   * Check if a player owns a specific item.
   * @param {string} playerId
   * @param {string} itemId
   * @returns {boolean}
   */
  ownsItem(playerId, itemId) {
    return this._getInventory(playerId).has(itemId);
  }

  /**
   * Add a new item to the catalog (admin/season feature).
   * @param {CosmeticItem} item
   */
  addToCatalog(item) {
    if (!item.id) item.id = randomUUID();
    this._catalog.set(item.id, item);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _getInventory(playerId) {
    if (!this._playerInventory.has(playerId)) {
      this._playerInventory.set(playerId, new Set());
    }
    return this._playerInventory.get(playerId);
  }

  _seedCatalog() {
    const items = [
      // Ship cosmetics
      { id: 'ship_paint_crimson',    name: 'Crimson Nebula Paint',   category: COSMETIC_CATEGORY.SHIP,      priceSm: 150, rarity: 'common',    available: true },
      { id: 'ship_paint_void',       name: 'Void Black Paint',       category: COSMETIC_CATEGORY.SHIP,      priceSm: 200, rarity: 'uncommon',  available: true },
      { id: 'ship_trail_plasma',     name: 'Plasma Engine Trail',    category: COSMETIC_CATEGORY.SHIP,      priceSm: 250, rarity: 'rare',      available: true },
      { id: 'ship_trail_stardust',   name: 'Stardust Trail',         category: COSMETIC_CATEGORY.SHIP,      priceSm: 300, rarity: 'rare',      available: true },

      // Character cosmetics
      { id: 'char_outfit_explorer',  name: 'Deep Space Explorer Suit', category: COSMETIC_CATEGORY.CHARACTER, priceSm: 100, rarity: 'common',  available: true },
      { id: 'char_outfit_pirate',    name: 'Corsair Captain\'s Coat',  category: COSMETIC_CATEGORY.CHARACTER, priceSm: 200, rarity: 'uncommon', available: true },
      { id: 'char_outfit_ascended',  name: 'Ascended Aura Cloak',     category: COSMETIC_CATEGORY.CHARACTER, priceSm: 500, rarity: 'legendary', available: true },

      // Emotes
      { id: 'emote_salute',          name: 'Stellar Salute',          category: COSMETIC_CATEGORY.EMOTE,     priceSm: 50,  rarity: 'common',    available: true },
      { id: 'emote_fracture_dance',  name: 'Fracture Dance',          category: COSMETIC_CATEGORY.EMOTE,     priceSm: 100, rarity: 'uncommon',  available: true },

      // Effects
      { id: 'effect_soul_glow',      name: 'Soul Glow Aura',         category: COSMETIC_CATEGORY.EFFECT,    priceSm: 350, rarity: 'epic',      available: true },
      { id: 'effect_fracture_echo',  name: 'Fracture Echo Particles', category: COSMETIC_CATEGORY.EFFECT,   priceSm: 400, rarity: 'epic',      available: true },

      // Housing
      { id: 'housing_nebula_window', name: 'Nebula View Window',      category: COSMETIC_CATEGORY.HOUSING,   priceSm: 150, rarity: 'common',   available: true },
      { id: 'housing_trophy_shelf',  name: 'Shard Trophy Display',    category: COSMETIC_CATEGORY.HOUSING,   priceSm: 200, rarity: 'uncommon', available: true },
    ];

    for (const item of items) {
      this._catalog.set(item.id, item);
    }
  }
}

/**
 * @typedef {object} CosmeticItem
 * @property {string}  id
 * @property {string}  name
 * @property {string}  category   COSMETIC_CATEGORY value
 * @property {number}  priceSm    Price in Stellar Marks
 * @property {string}  rarity     'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
 * @property {boolean} available  Whether the item is currently purchasable
 */
