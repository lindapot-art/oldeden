/**
 * Tests for CyclePass and CosmeticsStore systems.
 */
import { jest } from '@jest/globals';
import { CyclePass, MAX_TIER, XP_PER_TIER, PREMIUM_COST_SM, CYCLE_DURATION_MS } from '../src/systems/CyclePass.js';
import { CosmeticsStore, COSMETIC_CATEGORY } from '../src/systems/CosmeticsStore.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CyclePass
// ═══════════════════════════════════════════════════════════════════════════════

describe('CyclePass', () => {
  let pass;
  let stubEngine;

  beforeEach(async () => {
    pass = new CyclePass();
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
      getSystem: jest.fn().mockReturnValue({
        debit: jest.fn().mockReturnValue(true),
      }),
    };
    await pass.init(stubEngine);
  });

  // ── startSeason ───────────────────────────────────────────────────────────

  describe('startSeason()', () => {
    it('creates a season with correct fields and emits event', () => {
      const season = pass.startSeason({ name: 'Fracture Wars', theme: 'fracture' });

      expect(season).toHaveProperty('id');
      expect(season.name).toBe('Fracture Wars');
      expect(season.theme).toBe('fracture');
      expect(season.isActive).toBe(true);
      expect(season.endsAt).toBe(season.startedAt + CYCLE_DURATION_MS);

      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'cycle:season_started',
        expect.objectContaining({ name: 'Fracture Wars', theme: 'fracture' }),
      );
    });

    it('ends previous season if one exists', () => {
      pass.startSeason({ name: 'Season 1' });
      pass.startSeason({ name: 'Season 2' });

      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'cycle:season_ended',
        expect.objectContaining({ name: 'Season 1' }),
      );
    });
  });

  // ── awardXp ───────────────────────────────────────────────────────────────

  describe('awardXp()', () => {
    beforeEach(() => {
      pass.startSeason({ name: 'Test Season' });
    });

    it('increases XP and computes tier correctly', () => {
      const result = pass.awardXp('p1', 2500);
      expect(result.currentXp).toBe(2500);
      expect(result.currentTier).toBe(2); // floor(2500 / 1000)
    });

    it('emits cycle:tier_up on tier change', () => {
      pass.awardXp('p1', XP_PER_TIER);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'cycle:tier_up',
        expect.objectContaining({ playerId: 'p1', tier: 1 }),
      );
    });

    it('throws when no active season', async () => {
      const fresh = new CyclePass();
      await fresh.init(stubEngine);
      expect(() => fresh.awardXp('p1', 100)).toThrow('No active season');
    });

    it('tier caps at MAX_TIER (50)', () => {
      const hugeXp = (MAX_TIER + 10) * XP_PER_TIER;
      const result = pass.awardXp('p1', hugeXp);
      expect(result.currentTier).toBe(MAX_TIER);
    });
  });

  // ── unlockPremium ─────────────────────────────────────────────────────────

  describe('unlockPremium()', () => {
    beforeEach(() => {
      pass.startSeason({ name: 'Premium Season' });
    });

    it('debits SM and sets isPremium', () => {
      const result = pass.unlockPremium('p1');
      expect(result).toBe(true);

      const economy = stubEngine.getSystem('economy');
      expect(economy.debit).toHaveBeenCalledWith('p1', 'sm', PREMIUM_COST_SM);
      expect(pass.getPlayerProgress('p1').isPremium).toBe(true);
    });

    it('returns true if already premium', () => {
      pass.unlockPremium('p1');
      const result = pass.unlockPremium('p1');
      expect(result).toBe(true);
    });
  });

  // ── getPlayerProgress ─────────────────────────────────────────────────────

  describe('getPlayerProgress()', () => {
    it('returns correct progress', () => {
      pass.startSeason({ name: 'S' });
      pass.awardXp('p1', 3500);
      const progress = pass.getPlayerProgress('p1');
      expect(progress.xp).toBe(3500);
      expect(progress.tier).toBe(3);
      expect(progress.isPremium).toBe(false);
      expect(progress.playerId).toBe('p1');
    });
  });

  // ── getCurrentSeason ──────────────────────────────────────────────────────

  describe('getCurrentSeason()', () => {
    it('returns null when no season', () => {
      expect(pass.getCurrentSeason()).toBeNull();
    });
  });

  // ── getTierRewards ────────────────────────────────────────────────────────

  describe('getTierRewards()', () => {
    it('returns free rewards', () => {
      const rewards = pass.getTierRewards(5);
      expect(rewards.tier).toBe(5);
      expect(rewards.free).not.toBeNull();
      expect(rewards.premium).toBeNull();
    });

    it('returns premium rewards when isPremium', () => {
      const rewards = pass.getTierRewards(5, true);
      expect(rewards.premium).not.toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CosmeticsStore
// ═══════════════════════════════════════════════════════════════════════════════

describe('CosmeticsStore', () => {
  let store;
  let stubEngine;
  let mockDebit;

  beforeEach(async () => {
    store = new CosmeticsStore();
    mockDebit = jest.fn().mockReturnValue(true);
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
      getSystem: jest.fn().mockReturnValue({ debit: mockDebit }),
    };
    await store.init(stubEngine);
  });

  // ── getCatalog ────────────────────────────────────────────────────────────

  describe('getCatalog()', () => {
    it('returns seeded catalog (13 items)', () => {
      expect(store.getCatalog()).toHaveLength(13);
    });
  });

  // ── getByCategory ─────────────────────────────────────────────────────────

  describe('getByCategory()', () => {
    it('filters correctly', () => {
      const ships = store.getByCategory(COSMETIC_CATEGORY.SHIP);
      expect(ships.length).toBeGreaterThan(0);
      ships.forEach(item => expect(item.category).toBe(COSMETIC_CATEGORY.SHIP));
    });
  });

  // ── purchase ──────────────────────────────────────────────────────────────

  describe('purchase()', () => {
    it('debits SM, adds to inventory, emits event', () => {
      const result = store.purchase('p1', 'ship_paint_crimson');
      expect(result.success).toBe(true);
      expect(mockDebit).toHaveBeenCalledWith('p1', 'sm', 150);
      expect(store.ownsItem('p1', 'ship_paint_crimson')).toBe(true);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'cosmetics:purchased',
        expect.objectContaining({ playerId: 'p1', itemId: 'ship_paint_crimson' }),
      );
    });

    it('fails if item not found', () => {
      const result = store.purchase('p1', 'nonexistent');
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not found/i);
    });

    it('fails if already owned', () => {
      store.purchase('p1', 'ship_paint_crimson');
      const result = store.purchase('p1', 'ship_paint_crimson');
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/already owned/i);
    });

    it('fails if insufficient SM', () => {
      mockDebit.mockReturnValue(false);
      const result = store.purchase('p1', 'ship_paint_crimson');
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/insufficient/i);
    });
  });

  // ── gift ──────────────────────────────────────────────────────────────────

  describe('gift()', () => {
    it('debits from sender, adds to recipient', () => {
      const result = store.gift('sender', 'recipient', 'emote_salute');
      expect(result.success).toBe(true);
      expect(mockDebit).toHaveBeenCalledWith('sender', 'sm', 50);
      expect(store.ownsItem('recipient', 'emote_salute')).toBe(true);
    });

    it('fails if recipient already owns', () => {
      store.gift('sender', 'recipient', 'emote_salute');
      const result = store.gift('sender2', 'recipient', 'emote_salute');
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/already owns/i);
    });
  });

  // ── getPlayerCosmetics ────────────────────────────────────────────────────

  describe('getPlayerCosmetics()', () => {
    it('returns owned items', () => {
      store.purchase('p1', 'emote_salute');
      store.purchase('p1', 'ship_paint_crimson');
      const owned = store.getPlayerCosmetics('p1');
      expect(owned).toHaveLength(2);
      expect(owned.map(i => i.id)).toContain('emote_salute');
      expect(owned.map(i => i.id)).toContain('ship_paint_crimson');
    });
  });

  // ── ownsItem ──────────────────────────────────────────────────────────────

  describe('ownsItem()', () => {
    it('returns correct boolean', () => {
      expect(store.ownsItem('p1', 'emote_salute')).toBe(false);
      store.purchase('p1', 'emote_salute');
      expect(store.ownsItem('p1', 'emote_salute')).toBe(true);
    });
  });

  // ── addToCatalog ──────────────────────────────────────────────────────────

  describe('addToCatalog()', () => {
    it('adds new item', () => {
      const before = store.getCatalog().length;
      store.addToCatalog({
        id: 'custom_item',
        name: 'Custom Item',
        category: COSMETIC_CATEGORY.EMOTE,
        priceSm: 75,
        rarity: 'common',
        available: true,
      });
      expect(store.getCatalog()).toHaveLength(before + 1);
    });
  });
});
