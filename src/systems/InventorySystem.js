/**
 * InventorySystem — Weight-based inventory management with equipment slots,
 * item stacking, durability degradation, and rarity tiers.
 *
 * Each player carries items constrained by a maximum weight limit. Stackable
 * goods (ammo, materials, consumables) consolidate into a single slot up to
 * their maxStack cap, while non-stackable gear (weapons, armour) occupies
 * individual slots. Eight equipment slots let players wear or wield items
 * that match the correct slot type. Every piece of gear tracks durability
 * that decreases with use and must be repaired before it reaches zero.
 * Rarity tiers apply stat multipliers that scale item effectiveness.
 */

// ── Constants ───────────────────────────────────────────────────────────────

/** @enum {string} Rarity tier identifiers. */
export const RARITY = Object.freeze({
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  EPIC:      'epic',
  LEGENDARY: 'legendary',
});

/** Stat multiplier for each rarity tier. */
export const RARITY_MULTIPLIER = Object.freeze({
  [RARITY.COMMON]:    1.0,
  [RARITY.UNCOMMON]:  1.15,
  [RARITY.RARE]:      1.3,
  [RARITY.EPIC]:      1.5,
  [RARITY.LEGENDARY]: 2.0,
});

/** @enum {string} Equipment slot identifiers. */
export const EQUIP_SLOT = Object.freeze({
  HEAD:      'head',
  CHEST:     'chest',
  LEGS:      'legs',
  FEET:      'feet',
  MAIN_HAND: 'mainHand',
  OFF_HAND:  'offHand',
  IMPLANT:   'implant',
  ACCESSORY: 'accessory',
});

/** Set of all valid equipment slot values for quick lookup. */
const VALID_SLOTS = Object.freeze(new Set(Object.values(EQUIP_SLOT)));

/** Default maximum carry weight in kilograms. */
const DEFAULT_MAX_WEIGHT = 100;

/** Default maximum stack size for stackable items. */
const DEFAULT_MAX_STACK = 99;

// ── System ──────────────────────────────────────────────────────────────────

export class InventorySystem {
  /**
   * Initialise the inventory system and register engine event listeners.
   * @param {object} engine  The game engine instance.
   */
  async init(engine) {
    this._engine = engine;

    /** @type {Map<string, Inventory>} playerId → Inventory */
    this._inventories = new Map();

    console.log('[InventorySystem] Initialised.');
  }

  /**
   * Per-frame update. Currently a no-op; reserved for future time-based
   * inventory effects (e.g. perishable item decay).
   * @param {number} deltaMs  Milliseconds since last tick.
   */
  tick(deltaMs) {
    // Reserved for future use.
  }

  /**
   * Tear down the system and release all state.
   */
  async destroy() {
    this._inventories.clear();
  }

  // ── Inventory access ────────────────────────────────────────────────────

  /**
   * Retrieve (or create) the inventory for a player.
   * @param {string} playerId
   * @returns {Inventory}
   * @private
   */
  _getOrCreateInventory(playerId) {
    if (!this._inventories.has(playerId)) {
      this._inventories.set(playerId, {
        items: [],
        maxWeight: DEFAULT_MAX_WEIGHT,
        equipment: {
          [EQUIP_SLOT.HEAD]:      null,
          [EQUIP_SLOT.CHEST]:     null,
          [EQUIP_SLOT.LEGS]:      null,
          [EQUIP_SLOT.FEET]:      null,
          [EQUIP_SLOT.MAIN_HAND]: null,
          [EQUIP_SLOT.OFF_HAND]:  null,
          [EQUIP_SLOT.IMPLANT]:   null,
          [EQUIP_SLOT.ACCESSORY]: null,
        },
      });
    }
    return this._inventories.get(playerId);
  }

  /**
   * Return a snapshot of the player's inventory items.
   * @param {string} playerId
   * @returns {ItemStack[]}
   */
  getItems(playerId) {
    return this._getOrCreateInventory(playerId).items;
  }

  /**
   * Return the player's equipped items keyed by slot.
   * @param {string} playerId
   * @returns {Record<string, ItemStack|null>}
   */
  getEquipment(playerId) {
    return this._getOrCreateInventory(playerId).equipment;
  }

  // ── Weight helpers ──────────────────────────────────────────────────────

  /**
   * Calculate the total weight currently carried by a player.
   * @param {string} playerId
   * @returns {number}
   */
  getCurrentWeight(playerId) {
    const inv = this._getOrCreateInventory(playerId);
    let total = 0;
    for (const stack of inv.items) {
      total += (stack.item.weight ?? 0) * stack.quantity;
    }
    for (const slot of Object.values(inv.equipment)) {
      if (slot) {
        total += (slot.item.weight ?? 0) * slot.quantity;
      }
    }
    return total;
  }

  /**
   * Set a custom maximum carry weight for a player.
   * @param {string} playerId
   * @param {number} maxWeight  New maximum weight in kg.
   */
  setMaxWeight(playerId, maxWeight) {
    if (maxWeight <= 0) {
      throw new RangeError('Max weight must be positive.');
    }
    this._getOrCreateInventory(playerId).maxWeight = maxWeight;
  }

  /**
   * Return the maximum carry weight for a player.
   * @param {string} playerId
   * @returns {number}
   */
  getMaxWeight(playerId) {
    return this._getOrCreateInventory(playerId).maxWeight;
  }

  // ── Add / Remove items ─────────────────────────────────────────────────

  /**
   * Add an item to a player's inventory, respecting weight limits and
   * stacking rules. Stackable items merge into existing stacks before
   * creating new ones. Returns the quantity actually added.
   *
   * @param {string} playerId
   * @param {ItemDef} item       Item definition object.
   * @param {number}  [quantity=1] Number of items to add.
   * @returns {number} Quantity successfully added.
   */
  addItem(playerId, item, quantity = 1) {
    if (quantity <= 0) {
      throw new RangeError('Quantity must be positive.');
    }

    const inv = this._getOrCreateInventory(playerId);
    const weightPerUnit = item.weight ?? 0;
    const currentWeight = this.getCurrentWeight(playerId);

    // Calculate how many units we can carry
    const availableWeight = inv.maxWeight - currentWeight;
    const maxByWeight = weightPerUnit > 0
      ? Math.floor(availableWeight / weightPerUnit)
      : quantity;
    let toAdd = Math.min(quantity, maxByWeight);

    if (toAdd <= 0) return 0;

    let added = 0;
    const stackable = item.stackable ?? false;
    const maxStack = item.maxStack ?? DEFAULT_MAX_STACK;

    if (stackable) {
      // Fill existing stacks first
      for (const stack of inv.items) {
        if (toAdd <= 0) break;
        if (stack.item.id === item.id && stack.quantity < maxStack) {
          const space = maxStack - stack.quantity;
          const fill = Math.min(space, toAdd);
          stack.quantity += fill;
          toAdd -= fill;
          added += fill;
        }
      }

      // Create new stacks for the remainder
      while (toAdd > 0) {
        const fill = Math.min(maxStack, toAdd);
        inv.items.push(this._createStack(item, fill));
        toAdd -= fill;
        added += fill;
      }
    } else {
      // Non-stackable: one slot per item
      for (let i = 0; i < toAdd; i++) {
        inv.items.push(this._createStack(item, 1));
        added++;
      }
    }

    if (added > 0) {
      this._engine.events.emit('inventory:item_added', {
        playerId,
        itemId: item.id,
        quantity: added,
      });
    }

    return added;
  }

  /**
   * Remove a quantity of an item from the player's inventory.
   * Returns the quantity actually removed.
   *
   * @param {string} playerId
   * @param {string} itemId
   * @param {number} [quantity=1]
   * @returns {number} Quantity removed.
   */
  removeItem(playerId, itemId, quantity = 1) {
    if (quantity <= 0) {
      throw new RangeError('Quantity must be positive.');
    }

    const inv = this._getOrCreateInventory(playerId);
    let toRemove = quantity;
    let removed = 0;

    for (let i = inv.items.length - 1; i >= 0; i--) {
      if (toRemove <= 0) break;
      const stack = inv.items[i];
      if (stack.item.id !== itemId) continue;

      const take = Math.min(stack.quantity, toRemove);
      stack.quantity -= take;
      toRemove -= take;
      removed += take;

      if (stack.quantity <= 0) {
        inv.items.splice(i, 1);
      }
    }

    if (removed > 0) {
      this._engine.events.emit('inventory:item_removed', {
        playerId,
        itemId,
        quantity: removed,
      });
    }

    return removed;
  }

  /**
   * Count the total quantity of an item across all stacks.
   * @param {string} playerId
   * @param {string} itemId
   * @returns {number}
   */
  countItem(playerId, itemId) {
    const inv = this._getOrCreateInventory(playerId);
    let total = 0;
    for (const stack of inv.items) {
      if (stack.item.id === itemId) total += stack.quantity;
    }
    return total;
  }

  // ── Equipment ───────────────────────────────────────────────────────────

  /**
   * Equip an item from the player's inventory into the appropriate slot.
   * If the slot is already occupied the currently equipped item is returned
   * to the inventory first.
   *
   * @param {string} playerId
   * @param {string} itemId   ID of the item in the inventory to equip.
   * @returns {ItemStack} The newly equipped item stack.
   */
  equipItem(playerId, itemId) {
    const inv = this._getOrCreateInventory(playerId);

    // Find the item in inventory
    const idx = inv.items.findIndex((s) => s.item.id === itemId);
    if (idx === -1) {
      throw new Error(`[InventorySystem] Item ${itemId} not found in inventory.`);
    }

    const stack = inv.items[idx];
    const slot = stack.item.slot;

    if (!slot || !VALID_SLOTS.has(slot)) {
      throw new Error(`[InventorySystem] Item ${itemId} has no valid equipment slot.`);
    }

    // Unequip current item in that slot (if any)
    if (inv.equipment[slot] !== null) {
      this.unequipSlot(playerId, slot);
    }

    // Take one unit from inventory
    const equipped = this._createStack(stack.item, 1);
    equipped.currentDurability = stack.currentDurability;
    stack.quantity -= 1;
    if (stack.quantity <= 0) {
      inv.items.splice(idx, 1);
    }

    inv.equipment[slot] = equipped;

    this._engine.events.emit('inventory:item_equipped', {
      playerId,
      itemId,
      slot,
    });

    return equipped;
  }

  /**
   * Unequip the item in a given slot and return it to inventory.
   *
   * @param {string} playerId
   * @param {string} slot     One of the EQUIP_SLOT values.
   * @returns {ItemStack|null} The unequipped item, or null if slot was empty.
   */
  unequipSlot(playerId, slot) {
    if (!VALID_SLOTS.has(slot)) {
      throw new Error(`[InventorySystem] Invalid equipment slot: ${slot}`);
    }

    const inv = this._getOrCreateInventory(playerId);
    const equipped = inv.equipment[slot];
    if (!equipped) return null;

    inv.equipment[slot] = null;

    // Return to inventory (bypass weight check for unequip — item was
    // already carried)
    inv.items.push(equipped);

    this._engine.events.emit('inventory:item_unequipped', {
      playerId,
      itemId: equipped.item.id,
      slot,
    });

    return equipped;
  }

  // ── Durability ──────────────────────────────────────────────────────────

  /**
   * Reduce an item's durability by a given amount. If durability reaches
   * zero the item is considered broken and an event is emitted.
   *
   * @param {string} playerId
   * @param {string} itemId
   * @param {number} [amount=1]  Durability points to subtract.
   * @returns {number} Remaining durability.
   */
  degradeItem(playerId, itemId, amount = 1) {
    if (amount <= 0) {
      throw new RangeError('Degradation amount must be positive.');
    }

    const stack = this._findStack(playerId, itemId);
    if (!stack) {
      throw new Error(`[InventorySystem] Item ${itemId} not found.`);
    }

    if (stack.item.maxDurability == null) {
      return Infinity;
    }

    stack.currentDurability = Math.max(0, stack.currentDurability - amount);

    this._engine.events.emit('inventory:durability_changed', {
      playerId,
      itemId,
      currentDurability: stack.currentDurability,
      maxDurability: stack.item.maxDurability,
    });

    if (stack.currentDurability === 0) {
      this._engine.events.emit('inventory:item_broken', {
        playerId,
        itemId,
      });
    }

    return stack.currentDurability;
  }

  /**
   * Repair an item back to its maximum durability.
   *
   * @param {string} playerId
   * @param {string} itemId
   * @returns {number} New (restored) durability value.
   */
  repairItem(playerId, itemId) {
    const stack = this._findStack(playerId, itemId);
    if (!stack) {
      throw new Error(`[InventorySystem] Item ${itemId} not found.`);
    }

    if (stack.item.maxDurability == null) {
      return Infinity;
    }

    stack.currentDurability = stack.item.maxDurability;

    this._engine.events.emit('inventory:item_repaired', {
      playerId,
      itemId,
      currentDurability: stack.currentDurability,
    });

    return stack.currentDurability;
  }

  // ── Rarity helpers ──────────────────────────────────────────────────────

  /**
   * Return the stat multiplier for a given rarity tier.
   *
   * @param {string} rarity  One of the RARITY values.
   * @returns {number} Multiplier (1.0 – 2.0).
   */
  getStatMultiplier(rarity) {
    const mult = RARITY_MULTIPLIER[rarity];
    if (mult == null) {
      throw new Error(`[InventorySystem] Unknown rarity: ${rarity}`);
    }
    return mult;
  }

  /**
   * Calculate the effective stat value for an item, factoring in its
   * rarity tier multiplier.
   *
   * @param {ItemDef} item
   * @param {string}  statName  Key in the item's `stats` object.
   * @returns {number} The stat value multiplied by the rarity modifier.
   */
  getEffectiveStat(item, statName) {
    const base = item.stats?.[statName] ?? 0;
    const mult = this.getStatMultiplier(item.rarity ?? RARITY.COMMON);
    return Math.round(base * mult * 100) / 100;
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  /**
   * Create a new item stack with durability initialised.
   * @param {ItemDef} item
   * @param {number}  quantity
   * @returns {ItemStack}
   * @private
   */
  _createStack(item, quantity) {
    return {
      item,
      quantity,
      currentDurability: item.maxDurability ?? null,
    };
  }

  /**
   * Search inventory and equipment for a stack matching the given item ID.
   * @param {string} playerId
   * @param {string} itemId
   * @returns {ItemStack|null}
   * @private
   */
  _findStack(playerId, itemId) {
    const inv = this._getOrCreateInventory(playerId);

    for (const stack of inv.items) {
      if (stack.item.id === itemId) return stack;
    }
    for (const slot of Object.values(inv.equipment)) {
      if (slot && slot.item.id === itemId) return slot;
    }

    return null;
  }
}

// ── Typedefs ────────────────────────────────────────────────────────────────

/**
 * @typedef {object} ItemDef
 * @property {string}  id             Unique item identifier.
 * @property {string}  name           Display name.
 * @property {number}  weight         Weight in kg per unit.
 * @property {boolean} [stackable]    Whether the item can stack (default false).
 * @property {number}  [maxStack]     Maximum stack size (default 99).
 * @property {string}  [slot]         Equipment slot (one of EQUIP_SLOT values).
 * @property {number}  [maxDurability] Maximum durability points.
 * @property {string}  [rarity]       Rarity tier (one of RARITY values).
 * @property {Record<string, number>} [stats]  Base stats for the item.
 */

/**
 * @typedef {object} ItemStack
 * @property {ItemDef}     item              Reference to the item definition.
 * @property {number}      quantity           Number of items in this stack.
 * @property {number|null} currentDurability  Current durability (null if N/A).
 */

/**
 * @typedef {object} Inventory
 * @property {ItemStack[]}                   items      Bag contents.
 * @property {number}                        maxWeight  Maximum carry weight.
 * @property {Record<string, ItemStack|null>} equipment  Equipped item slots.
 */
