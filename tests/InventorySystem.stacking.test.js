import { jest } from '@jest/globals';
import { InventorySystem } from '../src/systems/InventorySystem.js';

const makeItem = (overrides = {}) => ({
  id: 'item_1',
  name: 'Test Item',
  weight: 1,
  stackable: false,
  maxStack: 99,
  slot: null,
  maxDurability: null,
  rarity: 'common',
  stats: {},
  ...overrides,
});

describe('InventorySystem - item stacking', () => {
  let sys;
  let stubEngine;

  beforeEach(() => {
    sys = new InventorySystem();
    stubEngine = { events: { on: jest.fn(), emit: jest.fn() } };
    sys._engine = stubEngine;
    sys._inventories = new Map();
  });

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
