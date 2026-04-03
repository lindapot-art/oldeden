/**
 * Tests for InventorySystem — weight management, stacking, equipment slots,
 * durability / degradation, and rarity tier multipliers.
 */
import { jest } from '@jest/globals';
import {
  InventorySystem,
  RARITY,
  RARITY_MULTIPLIER,
  EQUIP_SLOT,
} from '../src/systems/InventorySystem.js';

// ── Fixture helpers ─────────────────────────────────────────────────────────

const makeItem = (overrides = {}) => ({
  id: 'item_1',
  name: 'Test Item',
  weight: 1,
  stackable: false,
  maxStack: 99,
  slot: null,
  maxDurability: null,
  rarity: RARITY.COMMON,
  stats: {},
  ...overrides,
});

describe('InventorySystem', () => {
  let sys;
  let stubEngine;

  beforeEach(() => {
    sys = new InventorySystem();
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
    };
    sys._engine = stubEngine;
    sys._inventories = new Map();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. Weight-based inventory management ──────────────────────────────

  describe('weight management', () => {
    it('starts with default max weight of 100', () => {
      expect(sys.getMaxWeight('p1')).toBe(100);
    });

    it('allows setting a custom max weight', () => {
      sys.setMaxWeight('p1', 50);
      expect(sys.getMaxWeight('p1')).toBe(50);
    });

    it('throws when setting max weight to zero or negative', () => {
      expect(() => sys.setMaxWeight('p1', 0)).toThrow();
      expect(() => sys.setMaxWeight('p1', -5)).toThrow();
    });

    it('reports current weight as sum of all item weights', () => {
      const item = makeItem({ id: 'i1', weight: 5, stackable: true });
      sys.addItem('p1', item, 4);
      expect(sys.getCurrentWeight('p1')).toBe(20);
    });

    it('includes equipped items in weight calculation', () => {
      const helmet = makeItem({ id: 'helm', weight: 3, slot: EQUIP_SLOT.HEAD });
      sys.addItem('p1', helmet, 1);
      sys.equipItem('p1', 'helm');
      expect(sys.getCurrentWeight('p1')).toBe(3);
    });

    it('limits additions when weight cap would be exceeded', () => {
      sys.setMaxWeight('p1', 10);
      const item = makeItem({ id: 'heavy', weight: 3 });
      const added = sys.addItem('p1', item, 5); // 5 × 3 = 15 > 10
      expect(added).toBe(3); // only 3 × 3 = 9 fits
      expect(sys.getCurrentWeight('p1')).toBe(9);
    });

    it('returns 0 added when inventory is full', () => {
      sys.setMaxWeight('p1', 5);
      const item = makeItem({ id: 'rock', weight: 6 });
      expect(sys.addItem('p1', item, 1)).toBe(0);
    });

    it('allows weightless items regardless of capacity', () => {
      sys.setMaxWeight('p1', 0.1);
      const data = makeItem({ id: 'data', weight: 0, stackable: true });
      expect(sys.addItem('p1', data, 50)).toBe(50);
    });
  });

  // ── 2. Item stacking ──────────────────────────────────────────────────

  describe('item stacking', () => {
    it('stacks stackable items into one slot', () => {
      const ammo = makeItem({ id: 'ammo', stackable: true });
      sys.addItem('p1', ammo, 10);
      const items = sys.getItems('p1');
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(10);
    });

    it('respects maxStack and creates overflow stacks', () => {
      const ammo = makeItem({ id: 'ammo', stackable: true, maxStack: 5 });
      sys.addItem('p1', ammo, 12);
      const items = sys.getItems('p1');
      expect(items).toHaveLength(3); // 5 + 5 + 2
      expect(items[0].quantity).toBe(5);
      expect(items[1].quantity).toBe(5);
      expect(items[2].quantity).toBe(2);
    });

    it('fills existing stacks before creating new ones', () => {
      const mat = makeItem({ id: 'mat', stackable: true, maxStack: 10 });
      sys.addItem('p1', mat, 7);
      sys.addItem('p1', mat, 5);
      const items = sys.getItems('p1');
      // 7 + 5 = 12 → first stack filled to 10, second stack of 2
      expect(items).toHaveLength(2);
      expect(items[0].quantity).toBe(10);
      expect(items[1].quantity).toBe(2);
    });

    it('does not stack non-stackable items', () => {
      const sword = makeItem({ id: 'sword', stackable: false });
      sys.addItem('p1', sword, 3);
      const items = sys.getItems('p1');
      expect(items).toHaveLength(3);
      items.forEach((s) => expect(s.quantity).toBe(1));
    });

    it('uses default maxStack of 99 when not specified', () => {
      const pill = makeItem({ id: 'pill', stackable: true, maxStack: undefined });
      sys.addItem('p1', pill, 99);
      expect(sys.getItems('p1')).toHaveLength(1);
      expect(sys.getItems('p1')[0].quantity).toBe(99);
    });
  });

  // ── 3. Equipment slots ────────────────────────────────────────────────

  describe('equipment slots', () => {
    it('equips an item into the correct slot', () => {
      const helm = makeItem({ id: 'helm', slot: EQUIP_SLOT.HEAD });
      sys.addItem('p1', helm, 1);
      sys.equipItem('p1', 'helm');

      const eq = sys.getEquipment('p1');
      expect(eq[EQUIP_SLOT.HEAD]).not.toBeNull();
      expect(eq[EQUIP_SLOT.HEAD].item.id).toBe('helm');
    });

    it('removes the item from inventory when equipped', () => {
      const chest = makeItem({ id: 'chest_plate', slot: EQUIP_SLOT.CHEST });
      sys.addItem('p1', chest, 1);
      sys.equipItem('p1', 'chest_plate');
      expect(sys.countItem('p1', 'chest_plate')).toBe(0);
    });

    it('swaps out an existing equipped item into inventory', () => {
      const helmA = makeItem({ id: 'helmA', slot: EQUIP_SLOT.HEAD });
      const helmB = makeItem({ id: 'helmB', slot: EQUIP_SLOT.HEAD });
      sys.addItem('p1', helmA, 1);
      sys.addItem('p1', helmB, 1);

      sys.equipItem('p1', 'helmA');
      sys.equipItem('p1', 'helmB');

      const eq = sys.getEquipment('p1');
      expect(eq[EQUIP_SLOT.HEAD].item.id).toBe('helmB');
      // helmA should be back in inventory
      expect(sys.countItem('p1', 'helmA')).toBe(1);
    });

    it('unequips an item and returns it to inventory', () => {
      const boots = makeItem({ id: 'boots', slot: EQUIP_SLOT.FEET });
      sys.addItem('p1', boots, 1);
      sys.equipItem('p1', 'boots');

      const result = sys.unequipSlot('p1', EQUIP_SLOT.FEET);
      expect(result).not.toBeNull();
      expect(result.item.id).toBe('boots');
      expect(sys.getEquipment('p1')[EQUIP_SLOT.FEET]).toBeNull();
      expect(sys.countItem('p1', 'boots')).toBe(1);
    });

    it('returns null when unequipping an empty slot', () => {
      expect(sys.unequipSlot('p1', EQUIP_SLOT.IMPLANT)).toBeNull();
    });

    it('throws when equipping an item without a valid slot', () => {
      const junk = makeItem({ id: 'junk', slot: null });
      sys.addItem('p1', junk, 1);
      expect(() => sys.equipItem('p1', 'junk')).toThrow(/no valid equipment slot/i);
    });

    it('throws when equipping an item not in inventory', () => {
      expect(() => sys.equipItem('p1', 'ghost')).toThrow(/not found in inventory/i);
    });

    it('throws on invalid slot name for unequip', () => {
      expect(() => sys.unequipSlot('p1', 'backpack')).toThrow(/invalid equipment slot/i);
    });

    it('has all 8 equipment slots initialised to null', () => {
      const eq = sys.getEquipment('p1');
      const slots = Object.values(EQUIP_SLOT);
      expect(slots).toHaveLength(8);
      for (const slot of slots) {
        expect(eq[slot]).toBeNull();
      }
    });

    it('emits events on equip and unequip', () => {
      const glove = makeItem({ id: 'glove', slot: EQUIP_SLOT.ACCESSORY });
      sys.addItem('p1', glove, 1);
      stubEngine.events.emit.mockClear();

      sys.equipItem('p1', 'glove');
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'inventory:item_equipped',
        expect.objectContaining({ playerId: 'p1', itemId: 'glove', slot: EQUIP_SLOT.ACCESSORY }),
      );

      stubEngine.events.emit.mockClear();
      sys.unequipSlot('p1', EQUIP_SLOT.ACCESSORY);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'inventory:item_unequipped',
        expect.objectContaining({ playerId: 'p1', itemId: 'glove', slot: EQUIP_SLOT.ACCESSORY }),
      );
    });
  });

  // ── 4. Durability and degradation ─────────────────────────────────────

  describe('durability and degradation', () => {
    it('initialises items with full durability', () => {
      const blade = makeItem({ id: 'blade', maxDurability: 50 });
      sys.addItem('p1', blade, 1);
      const stack = sys.getItems('p1')[0];
      expect(stack.currentDurability).toBe(50);
    });

    it('sets currentDurability to null when maxDurability is absent', () => {
      const gem = makeItem({ id: 'gem' });
      sys.addItem('p1', gem, 1);
      expect(sys.getItems('p1')[0].currentDurability).toBeNull();
    });

    it('reduces durability with degradeItem()', () => {
      const axe = makeItem({ id: 'axe', maxDurability: 100 });
      sys.addItem('p1', axe, 1);
      const remaining = sys.degradeItem('p1', 'axe', 25);
      expect(remaining).toBe(75);
    });

    it('clamps durability to zero and emits item_broken', () => {
      const pick = makeItem({ id: 'pick', maxDurability: 10 });
      sys.addItem('p1', pick, 1);
      const remaining = sys.degradeItem('p1', 'pick', 999);
      expect(remaining).toBe(0);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'inventory:item_broken',
        expect.objectContaining({ playerId: 'p1', itemId: 'pick' }),
      );
    });

    it('emits durability_changed on each degrade call', () => {
      const shield = makeItem({ id: 'shield', maxDurability: 80 });
      sys.addItem('p1', shield, 1);
      sys.degradeItem('p1', 'shield', 10);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'inventory:durability_changed',
        expect.objectContaining({
          playerId: 'p1',
          itemId: 'shield',
          currentDurability: 70,
          maxDurability: 80,
        }),
      );
    });

    it('repairs an item back to max durability', () => {
      const staff = makeItem({ id: 'staff', maxDurability: 60 });
      sys.addItem('p1', staff, 1);
      sys.degradeItem('p1', 'staff', 40);
      const restored = sys.repairItem('p1', 'staff');
      expect(restored).toBe(60);
    });

    it('emits item_repaired event', () => {
      const bow = makeItem({ id: 'bow', maxDurability: 30 });
      sys.addItem('p1', bow, 1);
      sys.degradeItem('p1', 'bow', 5);
      stubEngine.events.emit.mockClear();

      sys.repairItem('p1', 'bow');
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'inventory:item_repaired',
        expect.objectContaining({ playerId: 'p1', itemId: 'bow', currentDurability: 30 }),
      );
    });

    it('returns Infinity for items without durability', () => {
      const orb = makeItem({ id: 'orb' });
      sys.addItem('p1', orb, 1);
      expect(sys.degradeItem('p1', 'orb')).toBe(Infinity);
      expect(sys.repairItem('p1', 'orb')).toBe(Infinity);
    });

    it('throws on invalid degrade amount', () => {
      const blade = makeItem({ id: 'blade', maxDurability: 10 });
      sys.addItem('p1', blade, 1);
      expect(() => sys.degradeItem('p1', 'blade', 0)).toThrow();
      expect(() => sys.degradeItem('p1', 'blade', -1)).toThrow();
    });

    it('throws when degrading a missing item', () => {
      expect(() => sys.degradeItem('p1', 'nope')).toThrow(/not found/i);
    });

    it('degrades equipped items', () => {
      const helm = makeItem({ id: 'helm', slot: EQUIP_SLOT.HEAD, maxDurability: 40 });
      sys.addItem('p1', helm, 1);
      sys.equipItem('p1', 'helm');
      expect(sys.degradeItem('p1', 'helm', 15)).toBe(25);
    });
  });

  // ── 5. Rarity tiers and stat multipliers ──────────────────────────────

  describe('rarity tiers', () => {
    it('defines five rarity tiers', () => {
      const tiers = Object.values(RARITY);
      expect(tiers).toHaveLength(5);
      expect(tiers).toContain('common');
      expect(tiers).toContain('legendary');
    });

    it('maps correct multipliers to each tier', () => {
      expect(RARITY_MULTIPLIER[RARITY.COMMON]).toBe(1.0);
      expect(RARITY_MULTIPLIER[RARITY.UNCOMMON]).toBe(1.15);
      expect(RARITY_MULTIPLIER[RARITY.RARE]).toBe(1.3);
      expect(RARITY_MULTIPLIER[RARITY.EPIC]).toBe(1.5);
      expect(RARITY_MULTIPLIER[RARITY.LEGENDARY]).toBe(2.0);
    });

    it('returns the multiplier via getStatMultiplier()', () => {
      expect(sys.getStatMultiplier(RARITY.EPIC)).toBe(1.5);
    });

    it('throws for unknown rarity', () => {
      expect(() => sys.getStatMultiplier('mythic')).toThrow(/unknown rarity/i);
    });

    it('calculates effective stats with rarity multiplier', () => {
      const item = makeItem({ rarity: RARITY.RARE, stats: { attack: 20 } });
      // 20 × 1.3 = 26
      expect(sys.getEffectiveStat(item, 'attack')).toBe(26);
    });

    it('returns 0 for missing stats', () => {
      const item = makeItem({ rarity: RARITY.LEGENDARY, stats: {} });
      expect(sys.getEffectiveStat(item, 'defense')).toBe(0);
    });

    it('defaults to COMMON multiplier when rarity is absent', () => {
      const item = makeItem({ rarity: undefined, stats: { speed: 10 } });
      expect(sys.getEffectiveStat(item, 'speed')).toBe(10);
    });

    it('applies LEGENDARY multiplier correctly', () => {
      const item = makeItem({ rarity: RARITY.LEGENDARY, stats: { attack: 50 } });
      // 50 × 2.0 = 100
      expect(sys.getEffectiveStat(item, 'attack')).toBe(100);
    });
  });

  // ── Add / Remove events ───────────────────────────────────────────────

  describe('add and remove events', () => {
    it('emits inventory:item_added', () => {
      const item = makeItem({ id: 'coin', stackable: true, weight: 0 });
      sys.addItem('p1', item, 5);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'inventory:item_added',
        expect.objectContaining({ playerId: 'p1', itemId: 'coin', quantity: 5 }),
      );
    });

    it('emits inventory:item_removed', () => {
      const item = makeItem({ id: 'ore', stackable: true, weight: 0 });
      sys.addItem('p1', item, 10);
      stubEngine.events.emit.mockClear();

      sys.removeItem('p1', 'ore', 3);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'inventory:item_removed',
        expect.objectContaining({ playerId: 'p1', itemId: 'ore', quantity: 3 }),
      );
    });

    it('does not emit when nothing is added', () => {
      sys.setMaxWeight('p1', 1);
      const item = makeItem({ id: 'boulder', weight: 10 });
      stubEngine.events.emit.mockClear();
      sys.addItem('p1', item, 1);
      expect(stubEngine.events.emit).not.toHaveBeenCalledWith(
        'inventory:item_added',
        expect.anything(),
      );
    });

    it('removes partial quantity and returns amount removed', () => {
      const item = makeItem({ id: 'bolt', stackable: true, weight: 0 });
      sys.addItem('p1', item, 5);
      const removed = sys.removeItem('p1', 'bolt', 100);
      expect(removed).toBe(5);
      expect(sys.countItem('p1', 'bolt')).toBe(0);
    });

    it('throws on invalid addItem quantity', () => {
      expect(() => sys.addItem('p1', makeItem(), 0)).toThrow();
      expect(() => sys.addItem('p1', makeItem(), -1)).toThrow();
    });

    it('throws on invalid removeItem quantity', () => {
      expect(() => sys.removeItem('p1', 'x', 0)).toThrow();
    });
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('init sets up engine reference and inventories map', async () => {
      const fresh = new InventorySystem();
      await fresh.init(stubEngine);
      expect(fresh._engine).toBe(stubEngine);
      expect(fresh._inventories).toBeInstanceOf(Map);
    });

    it('destroy clears all state', async () => {
      sys.addItem('p1', makeItem({ weight: 0 }), 1);
      await sys.destroy();
      expect(sys._inventories.size).toBe(0);
    });

    it('tick does not throw', () => {
      expect(() => sys.tick(16)).not.toThrow();
    });
  });
});
