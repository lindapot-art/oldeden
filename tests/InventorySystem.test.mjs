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
      expect(sys.getItems('p1')).toHaveLength(0);
      expect(sys.getEquipment('p1')[EQUIP_SLOT.CHEST].item.id).toBe('chest_plate');
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
  });
});
