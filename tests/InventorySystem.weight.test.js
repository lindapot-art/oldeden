import { jest } from '@jest/globals';
import { InventorySystem, EQUIP_SLOT } from '../src/systems/InventorySystem.js';

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

describe('InventorySystem - weight management', () => {
  let sys;
  let stubEngine;

  beforeEach(() => {
    sys = new InventorySystem();
    stubEngine = { events: { on: jest.fn(), emit: jest.fn() } };
    sys._engine = stubEngine;
    sys._inventories = new Map();
  });

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
