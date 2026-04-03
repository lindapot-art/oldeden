/**
 * Tests for RebirthSystem — lottery mechanics and status scoring.
 */
import { jest } from '@jest/globals';
import { RebirthSystem } from '../src/systems/RebirthSystem.js';
import { GeneticSystem, GENOME_LENGTH } from '../src/systems/GeneticSystem.js';

function makeNPC(overrides = {}) {
  const genome = new Uint8Array(GENOME_LENGTH).fill(128);
  return {
    id: `npc-${Math.random()}`,
    genome,
    credits: 1000,
    ageYears: 30,
    reputation: 100,
    isActive: true,
    isPlayerAvatar: false,
    skills: {},
    ...overrides,
  };
}

describe('RebirthSystem', () => {
  let rebirth;
  let stubEngine;

  beforeEach(() => {
    rebirth = new RebirthSystem();
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
      getSystem: jest.fn(),
    };
    rebirth._engine = stubEngine;
  });

  describe('computeStatusScore()', () => {
    it('returns a number between 0 and 1', () => {
      const npc = makeNPC();
      const score = rebirth.computeStatusScore(npc);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('wealthy NPC has higher score than destitute NPC', () => {
      const wealthy = makeNPC({ credits: 900_000 });
      const poor    = makeNPC({ credits: 10 });
      expect(rebirth.computeStatusScore(wealthy)).toBeGreaterThan(rebirth.computeStatusScore(poor));
    });

    it('older NPC has higher score than young NPC (all else equal)', () => {
      const old   = makeNPC({ ageYears: 70 });
      const young = makeNPC({ ageYears: 20 });
      expect(rebirth.computeStatusScore(old)).toBeGreaterThan(rebirth.computeStatusScore(young));
    });

    it('handles NPC with no genome gracefully', () => {
      const npc = makeNPC({ genome: null });
      const score = rebirth.computeStatusScore(npc);
      expect(typeof score).toBe('number');
      expect(isNaN(score)).toBe(false);
    });
  });

  describe('performLottery()', () => {
    it('returns a RebirthResult with required fields', () => {
      const pool   = [makeNPC(), makeNPC(), makeNPC()];
      const result = rebirth.performLottery('player-1', pool);
      expect(result).toHaveProperty('lotteryId');
      expect(result).toHaveProperty('playerId', 'player-1');
      expect(result).toHaveProperty('chosenNpc');
      expect(result).toHaveProperty('rerollsRemaining');
      expect(result).toHaveProperty('timestamp');
    });

    it('chosen NPC is from the provided pool', () => {
      const pool   = [makeNPC(), makeNPC(), makeNPC()];
      const ids    = pool.map((n) => n.id);
      for (let i = 0; i < 20; i++) {
        const result = rebirth.performLottery('player-1', pool);
        expect(ids).toContain(result.chosenNpc.id);
      }
    });

    it('throws when pool is empty', () => {
      expect(() => rebirth.performLottery('player-1', [])).toThrow();
    });

    it('low-status NPCs are drawn more often than high-status NPCs', () => {
      const poor  = makeNPC({ credits: 0,         ageYears: 20, reputation: 0   });
      const rich  = makeNPC({ credits: 999_999,   ageYears: 70, reputation: 990 });

      // Run 1000 lottery draws and count how often each is picked
      const counts = { [poor.id]: 0, [rich.id]: 0 };
      for (let i = 0; i < 1000; i++) {
        const { chosenNpc } = rebirth.performLottery('p', [poor, rich]);
        counts[chosenNpc.id]++;
      }

      // Poor NPC should win at least 80% of the time
      expect(counts[poor.id]).toBeGreaterThan(counts[rich.id]);
      expect(counts[poor.id] / 1000).toBeGreaterThan(0.8);
    });
  });
});
