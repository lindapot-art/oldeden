/**
 * Tests for AscensionSystem — trial mechanics, ascended entities, and challenges.
 */
import { jest } from '@jest/globals';
import {
  AscensionSystem,
  MAX_ASCENDED_PER_SERVER,
  PASSIVE_INCOME_RATE,
  MIN_REBIRTHS_REQUIRED,
} from '../src/systems/AscensionSystem.js';

function makeCharacter(overrides = {}) {
  return {
    id: `char-${Math.random().toString(36).slice(2, 10)}`,
    name: 'Test Character',
    credits: 500_000,
    reputation: 500,
    skills: { combat: 80, survival: 70, navigation: 60 },
    ...overrides,
  };
}

/** Character with maxed-out stats for deterministic power = 100 */
function makeStrongCharacter(overrides = {}) {
  return makeCharacter({
    credits: 1_000_000,
    reputation: 1000,
    skills: { combat: 100, survival: 100, navigation: 100, endurance: 100 },
    ...overrides,
  });
}

/** Character with minimal stats for deterministic low power */
function makeWeakCharacter(overrides = {}) {
  return makeCharacter({
    credits: 0,
    reputation: 0,
    skills: { combat: 1 },
    ...overrides,
  });
}

describe('AscensionSystem', () => {
  let ascension;
  let stubEngine;
  let handlers;

  beforeEach(async () => {
    handlers = {};
    ascension = new AscensionSystem();
    stubEngine = {
      events: {
        on: jest.fn((event, handler) => { handlers[event] = handler; }),
        emit: jest.fn(),
      },
    };
    await ascension.init(stubEngine);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Eligibility ──────────────────────────────────────────────────────────────

  describe('checkEligibility()', () => {
    it('returns ineligible when player has fewer than 3 rebirths', () => {
      ascension.setRebirthCount('p1', 2);
      const result = ascension.checkEligibility('p1');
      expect(result.eligible).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('returns eligible when player has 3 or more rebirths', () => {
      ascension.setRebirthCount('p1', 3);
      const result = ascension.checkEligibility('p1');
      expect(result.eligible).toBe(true);
    });

    it('returns eligible with reason when all slots are full', () => {
      ascension.setRebirthCount('p1', 5);

      // Fill all slots with active ascended entities
      for (let i = 0; i < MAX_ASCENDED_PER_SERVER; i++) {
        ascension._ascended.set(`asc-${i}`, {
          id: `asc-${i}`,
          playerId: `other-${i}`,
          isActive: true,
          powerLevel: 50,
          passiveIncomeAccumulated: 0,
        });
      }

      const result = ascension.checkEligibility('p1');
      expect(result.eligible).toBe(true);
      expect(result.reason).toMatch(/slots full/i);
    });
  });

  // ── Rebirth count ────────────────────────────────────────────────────────────

  describe('setRebirthCount() / getRebirthCount()', () => {
    it('stores and returns the rebirth count correctly', () => {
      expect(ascension.getRebirthCount('p1')).toBe(0);
      ascension.setRebirthCount('p1', 7);
      expect(ascension.getRebirthCount('p1')).toBe(7);
    });
  });

  // ── attemptTrial ─────────────────────────────────────────────────────────────

  describe('attemptTrial()', () => {
    it('throws when player is not eligible', () => {
      const char = makeCharacter();
      expect(() => ascension.attemptTrial('p1', char)).toThrow(/not eligible/i);
    });

    it('returns a TrialResult with required fields', () => {
      ascension.setRebirthCount('p1', MIN_REBIRTHS_REQUIRED);
      const char = makeStrongCharacter();
      const result = ascension.attemptTrial('p1', char, { targetSystemId: 'sys-1' });

      expect(result).toHaveProperty('trialId');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('stagesPassed');
      expect(result).toHaveProperty('ascendedId');
      expect(result).toHaveProperty('systemId');
    });

    it('on success creates an Ascended entity and emits ascension:succeeded', () => {
      ascension.setRebirthCount('p1', MIN_REBIRTHS_REQUIRED);
      const char = makeStrongCharacter();

      // Force all random rolls to 0 so every stage passes
      jest.spyOn(Math, 'random').mockReturnValue(0);

      const result = ascension.attemptTrial('p1', char, { targetSystemId: 'sys-alpha' });

      expect(result.success).toBe(true);
      expect(result.ascendedId).toBeDefined();
      expect(result.systemId).toBe('sys-alpha');

      // Ascended entity exists
      const entity = ascension.getAscended(result.ascendedId);
      expect(entity).toBeDefined();
      expect(entity.isActive).toBe(true);
      expect(entity.playerId).toBe('p1');

      // Event emitted
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'ascension:succeeded',
        expect.objectContaining({
          trialId: result.trialId,
          playerId: 'p1',
          ascendedId: result.ascendedId,
          systemId: 'sys-alpha',
        }),
      );
    });

    it('on failure emits ascension:failed', () => {
      ascension.setRebirthCount('p1', MIN_REBIRTHS_REQUIRED);
      const char = makeWeakCharacter();

      // Force all random rolls to 1 so stages fail
      jest.spyOn(Math, 'random').mockReturnValue(0.99);

      const result = ascension.attemptTrial('p1', char);

      expect(result.success).toBe(false);
      expect(result.ascendedId).toBeNull();
      expect(result.systemId).toBeNull();

      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'ascension:failed',
        expect.objectContaining({
          trialId: result.trialId,
          playerId: 'p1',
          stagesPassed: result.stagesPassed,
        }),
      );
    });
  });

  // ── Ascended entities ────────────────────────────────────────────────────────

  describe('getAscendedEntities()', () => {
    it('returns only active entities', () => {
      ascension._ascended.set('a1', { id: 'a1', isActive: true, passiveIncomeAccumulated: 0 });
      ascension._ascended.set('a2', { id: 'a2', isActive: false, passiveIncomeAccumulated: 0 });
      ascension._ascended.set('a3', { id: 'a3', isActive: true, passiveIncomeAccumulated: 0 });

      const active = ascension.getAscendedEntities();
      expect(active).toHaveLength(2);
      expect(active.map(e => e.id)).toEqual(expect.arrayContaining(['a1', 'a3']));
    });
  });

  describe('getAvailableSlots()', () => {
    it('returns the correct number of available slots', () => {
      expect(ascension.getAvailableSlots()).toBe(MAX_ASCENDED_PER_SERVER);

      ascension._ascended.set('a1', { id: 'a1', isActive: true, passiveIncomeAccumulated: 0 });
      ascension._ascended.set('a2', { id: 'a2', isActive: false, passiveIncomeAccumulated: 0 });
      ascension._ascended.set('a3', { id: 'a3', isActive: true, passiveIncomeAccumulated: 0 });

      // Only 2 active, so 98 slots available
      expect(ascension.getAvailableSlots()).toBe(MAX_ASCENDED_PER_SERVER - 2);
    });
  });

  // ── Challenge ────────────────────────────────────────────────────────────────

  describe('challengeAscended()', () => {
    it('throws for non-existent target', () => {
      const char = makeStrongCharacter();
      expect(() => ascension.challengeAscended('p1', 'nonexistent', char)).toThrow(/not found/i);
    });

    it('on success deactivates old entity, creates new one, and emits event', () => {
      // Create an existing weak ascended entity
      ascension._ascended.set('asc-old', {
        id: 'asc-old',
        playerId: 'old-player',
        characterId: 'old-char',
        systemId: 'sys-beta',
        powerLevel: 1,
        isActive: true,
        passiveIncomeAccumulated: 10,
        defeatedBy: null,
        defeatedAt: null,
      });

      const challenger = makeStrongCharacter();

      // Force Math.random to 0 so ascendedPower = powerLevel * 0.8 = 0.8, challenger wins easily
      jest.spyOn(Math, 'random').mockReturnValue(0);

      const result = ascension.challengeAscended('p1', 'asc-old', challenger);

      expect(result.success).toBe(true);
      expect(result.ascendedId).toBeDefined();
      expect(result.systemId).toBe('sys-beta');

      // Old entity deactivated
      const oldEntity = ascension.getAscended('asc-old');
      expect(oldEntity.isActive).toBe(false);
      expect(oldEntity.defeatedBy).toBe('p1');

      // New entity active
      const newEntity = ascension.getAscended(result.ascendedId);
      expect(newEntity.isActive).toBe(true);
      expect(newEntity.playerId).toBe('p1');

      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'ascension:challenged',
        expect.objectContaining({
          challengerPlayerId: 'p1',
          defeatedAscendedId: 'asc-old',
          newAscendedId: result.ascendedId,
          systemId: 'sys-beta',
        }),
      );
    });
  });

  // ── Tick / passive income ────────────────────────────────────────────────────

  describe('tick()', () => {
    it('accumulates passive income for active entities', () => {
      ascension._ascended.set('a1', { id: 'a1', isActive: true, passiveIncomeAccumulated: 0 });
      ascension._ascended.set('a2', { id: 'a2', isActive: false, passiveIncomeAccumulated: 0 });

      const deltaMs = 5000; // 5 seconds
      ascension.tick(deltaMs);

      const a1 = ascension.getAscended('a1');
      const a2 = ascension.getAscended('a2');

      expect(a1.passiveIncomeAccumulated).toBeCloseTo(PASSIVE_INCOME_RATE * 5);
      expect(a2.passiveIncomeAccumulated).toBe(0);
    });
  });

  // ── Trial history ────────────────────────────────────────────────────────────

  describe('getTrialHistory()', () => {
    it('returns recorded trials', () => {
      ascension.setRebirthCount('p1', MIN_REBIRTHS_REQUIRED);
      const char = makeStrongCharacter();

      ascension.attemptTrial('p1', char);
      ascension.attemptTrial('p1', char);

      const history = ascension.getTrialHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toHaveProperty('trialId');
      expect(history[0]).toHaveProperty('playerId', 'p1');
      expect(history[0]).toHaveProperty('success');
      expect(history[0]).toHaveProperty('stagesPassed');
    });
  });

  // ── _onRebirthReady via event handler ────────────────────────────────────────

  describe('_onRebirthReady (via event)', () => {
    it('increments rebirth count when player:rebirth_ready is emitted', () => {
      expect(ascension.getRebirthCount('p1')).toBe(0);

      // Invoke the stored handler directly
      handlers['player:rebirth_ready']({ playerId: 'p1' });
      expect(ascension.getRebirthCount('p1')).toBe(1);

      handlers['player:rebirth_ready']({ playerId: 'p1' });
      expect(ascension.getRebirthCount('p1')).toBe(2);
    });
  });
});
