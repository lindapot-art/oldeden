/**
 * Tests for EconomySystem — wallets, currency, subscriptions, and exchange rates.
 */
import { jest } from '@jest/globals';
import { EconomySystem, CURRENCY, SUBSCRIPTION_TIER } from '../src/systems/EconomySystem.js';

describe('EconomySystem', () => {
  let economy;
  let stubEngine;

  beforeEach(() => {
    economy = new EconomySystem();
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
    };
    economy._engine = stubEngine;
    economy._wallets = new Map();
    economy._subscriptions = new Map();
    economy._exchangeRateFactor = 1.0;
  });

  // ── Wallets ────────────────────────────────────────────────────────────────

  describe('getWallet()', () => {
    it('creates a new wallet with default EC and no SM', () => {
      const wallet = economy.getWallet('player-1');
      expect(wallet.ec).toBeGreaterThan(0);
      expect(wallet.sm).toBe(0);
    });

    it('returns the same wallet on subsequent calls', () => {
      const a = economy.getWallet('player-1');
      const b = economy.getWallet('player-1');
      expect(a).toBe(b);
    });
  });

  describe('credit()', () => {
    it('increases EC balance', () => {
      const before = economy.getWallet('p').ec;
      economy.credit('p', CURRENCY.EC, 1000);
      expect(economy.getWallet('p').ec).toBe(before + 1000);
    });

    it('increases SM balance', () => {
      economy.credit('p', CURRENCY.SM, 50);
      expect(economy.getWallet('p').sm).toBe(50);
    });

    it('throws for non-positive amount', () => {
      expect(() => economy.credit('p', CURRENCY.EC, 0)).toThrow();
      expect(() => economy.credit('p', CURRENCY.EC, -5)).toThrow();
    });

    it('throws for on-chain currency', () => {
      expect(() => economy.credit('p', CURRENCY.EDEN, 100)).toThrow();
    });
  });

  describe('debit()', () => {
    it('decreases EC balance and returns true', () => {
      economy.credit('p', CURRENCY.EC, 1000);
      const before = economy.getWallet('p').ec;
      const success = economy.debit('p', CURRENCY.EC, 500);
      expect(success).toBe(true);
      expect(economy.getWallet('p').ec).toBe(before - 500);
    });

    it('returns false for insufficient funds', () => {
      const result = economy.debit('p', CURRENCY.EC, 9_999_999);
      expect(result).toBe(false);
    });

    it('does not modify balance when returning false', () => {
      const before = economy.getWallet('p').ec;
      economy.debit('p', CURRENCY.EC, 9_999_999);
      expect(economy.getWallet('p').ec).toBe(before);
    });
  });

  // ── Subscriptions ──────────────────────────────────────────────────────────

  describe('getSubscription() / setSubscription()', () => {
    it('defaults to FREE tier', () => {
      expect(economy.getSubscription('p')).toBe(SUBSCRIPTION_TIER.FREE);
    });

    it('updates tier correctly', () => {
      economy.setSubscription('p', SUBSCRIPTION_TIER.COMMANDER);
      expect(economy.getSubscription('p')).toBe(SUBSCRIPTION_TIER.COMMANDER);
    });

    it('throws for invalid tier', () => {
      expect(() => economy.setSubscription('p', 'legendary')).toThrow();
    });
  });

  describe('getEcMultiplier()', () => {
    it('returns 1.0 for FREE tier', () => {
      expect(economy.getEcMultiplier('p')).toBe(1.0);
    });

    it('returns higher multiplier for premium tiers', () => {
      economy.setSubscription('p', SUBSCRIPTION_TIER.ADMIRAL);
      expect(economy.getEcMultiplier('p')).toBeGreaterThan(1.0);
    });
  });

  // ── Exchange ───────────────────────────────────────────────────────────────

  describe('sellEcForSm()', () => {
    it('converts EC to SM correctly', () => {
      economy.credit('p', CURRENCY.EC, 100_000);
      const { success, smReceived } = economy.sellEcForSm('p', 10_000);
      expect(success).toBe(true);
      expect(smReceived).toBeGreaterThan(0);
    });

    it('returns false if insufficient EC', () => {
      const { success } = economy.sellEcForSm('p', 9_999_999);
      expect(success).toBe(false);
    });
  });

  describe('sellSmForEc()', () => {
    it('converts SM to EC correctly', () => {
      economy.credit('p', CURRENCY.SM, 10);
      const { success, ecReceived } = economy.sellSmForEc('p', 5);
      expect(success).toBe(true);
      expect(ecReceived).toBeGreaterThan(0);
    });
  });

  describe('getExchangeRates()', () => {
    it('returns ecPerSmSell and ecPerSmBuy', () => {
      const rates = economy.getExchangeRates();
      expect(rates).toHaveProperty('ecPerSmSell');
      expect(rates).toHaveProperty('ecPerSmBuy');
      expect(rates.ecPerSmBuy).toBeGreaterThan(rates.ecPerSmSell);
    });
  });
});
