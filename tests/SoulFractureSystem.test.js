/**
 * Tests for SoulFractureSystem — soul fracture mechanics, shard generation, and absorption.
 */
import { jest } from '@jest/globals';
import { SoulFractureSystem, SHARD_TYPES, SHARD_DECAY_MS } from '../src/systems/SoulFractureSystem.js';

function makeCharacter(overrides = {}) {
  return {
    id: `char-${Math.random().toString(36).slice(2, 10)}`,
    name: 'TestChar',
    credits: 5000,
    ageYears: 40,
    reputation: 200,
    sectorId: 'genesis',
    skills: { COMBAT: 50, MINING: 30, HACKING: 20 },
    ...overrides,
  };
}

describe('SoulFractureSystem', () => {
  let system;
  let stubEngine;
  let mockRebirthSystem;
  let mockEconomySystem;

  beforeEach(() => {
    system = new SoulFractureSystem();
    mockRebirthSystem = { computeStatusScore: jest.fn().mockReturnValue(0.5) };
    mockEconomySystem = { credit: jest.fn() };
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
      getSystem: jest.fn((name) => {
        if (name === 'rebirth') return mockRebirthSystem;
        if (name === 'economy') return mockEconomySystem;
        return null;
      }),
    };
    system._engine = stubEngine;
    system._activeShards = new Map();
    system._fractureHistory = new Map();
  });

  // ── computeFracturePower() ───────────────────────────────────────────────

  describe('computeFracturePower()', () => {
    it('returns a number between 1 and 100', () => {
      const char = makeCharacter();
      const power = system.computeFracturePower(char);
      expect(power).toBeGreaterThanOrEqual(1);
      expect(power).toBeLessThanOrEqual(100);
    });

    it('returns higher power for high-status characters', () => {
      mockRebirthSystem.computeStatusScore.mockReturnValue(0.9);
      const highPower = system.computeFracturePower(makeCharacter());

      mockRebirthSystem.computeStatusScore.mockReturnValue(0.1);
      const lowPower = system.computeFracturePower(makeCharacter());

      expect(highPower).toBeGreaterThan(lowPower);
    });

    it('clamps to 1 when status score is 0', () => {
      mockRebirthSystem.computeStatusScore.mockReturnValue(0);
      const power = system.computeFracturePower(makeCharacter());
      expect(power).toBe(1);
    });

    it('clamps to 100 when status score is 1', () => {
      mockRebirthSystem.computeStatusScore.mockReturnValue(1);
      const power = system.computeFracturePower(makeCharacter());
      expect(power).toBe(100);
    });
  });

  // ── executeFracture() ────────────────────────────────────────────────────

  describe('executeFracture()', () => {
    it('generates correct shard count based on power level', () => {
      mockRebirthSystem.computeStatusScore.mockReturnValue(0.5);
      const char = makeCharacter();
      const result = system.executeFracture('player-1', char);
      const expectedPower = 50; // round(0.5 * 100)
      const expectedShards = Math.floor(expectedPower / 2) + 5; // 30
      expect(result.shardCount).toBe(expectedShards);
      expect(result.shards).toHaveLength(expectedShards);
    });

    it('emits soul:fractured event', () => {
      const char = makeCharacter();
      system.executeFracture('player-1', char);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'soul:fractured',
        expect.objectContaining({
          playerId: 'player-1',
          characterId: char.id,
        }),
      );
    });

    it('emits fracture:event with shard details', () => {
      const char = makeCharacter();
      system.executeFracture('player-1', char);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'fracture:event',
        expect.objectContaining({
          shardCount: expect.any(Number),
          shards: expect.any(Array),
        }),
      );
    });

    it('records fracture in history', () => {
      const char = makeCharacter();
      const result = system.executeFracture('player-1', char);
      const history = system.getFractureHistory();
      expect(history).toHaveLength(1);
      expect(history[0].fractureId).toBe(result.fractureId);
      expect(history[0].characterId).toBe(char.id);
      expect(history[0].playerId).toBe('player-1');
    });

    it('all shards have valid types from SHARD_TYPES', () => {
      const char = makeCharacter();
      const result = system.executeFracture('player-1', char);
      for (const shard of result.shards) {
        expect(SHARD_TYPES).toContain(shard.type);
      }
    });

    it('throws on invalid character (null)', () => {
      expect(() => system.executeFracture('player-1', null)).toThrow();
    });

    it('throws on character without id', () => {
      expect(() => system.executeFracture('player-1', { name: 'NoId' })).toThrow();
    });
  });

  // ── absorbShard() ────────────────────────────────────────────────────────

  describe('absorbShard()', () => {
    it('returns result with correct fields', () => {
      const char = makeCharacter();
      const { shards } = system.executeFracture('player-1', char);
      const shard = shards[0];
      const result = system.absorbShard(shard.id, 'player-2');
      expect(result).toHaveProperty('shardId', shard.id);
      expect(result).toHaveProperty('playerId', 'player-2');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('bonus');
      expect(result).toHaveProperty('originCharacterName');
      expect(result).toHaveProperty('absorbedAt');
    });

    it('removes shard from active shards after absorption', () => {
      const char = makeCharacter();
      const { shards } = system.executeFracture('player-1', char);
      const shard = shards[0];
      system.absorbShard(shard.id, 'player-2');
      expect(system._activeShards.has(shard.id)).toBe(false);
    });

    it('emits shard:absorbed event', () => {
      const char = makeCharacter();
      const { shards } = system.executeFracture('player-1', char);
      const shard = shards[0];
      system.absorbShard(shard.id, 'player-2');
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'shard:absorbed',
        expect.objectContaining({
          shardId: shard.id,
          playerId: 'player-2',
        }),
      );
    });

    it('returns null for nonexistent shard', () => {
      const result = system.absorbShard('nonexistent-id', 'player-2');
      expect(result).toBeNull();
    });

    it('same shard cannot be absorbed twice', () => {
      const char = makeCharacter();
      const { shards } = system.executeFracture('player-1', char);
      const shard = shards[0];
      const first = system.absorbShard(shard.id, 'player-2');
      const second = system.absorbShard(shard.id, 'player-3');
      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });
  });

  // ── getActiveShards() ────────────────────────────────────────────────────

  describe('getActiveShards()', () => {
    it('returns all active shards', () => {
      const char = makeCharacter();
      const { shardCount } = system.executeFracture('player-1', char);
      const active = system.getActiveShards();
      expect(active).toHaveLength(shardCount);
    });

    it('returns empty array when no shards exist', () => {
      expect(system.getActiveShards()).toHaveLength(0);
    });
  });

  // ── getShardsInSector() ──────────────────────────────────────────────────

  describe('getShardsInSector()', () => {
    it('filters shards by sectorId', () => {
      const char = makeCharacter();
      system.executeFracture('player-1', char);
      const allShards = system.getActiveShards();
      const genesisShards = system.getShardsInSector('genesis');
      // All genesis shards must have sectorId === 'genesis'
      for (const shard of genesisShards) {
        expect(shard.sectorId).toBe('genesis');
      }
      // Count should match manual filter
      const manualCount = allShards.filter(s => s.sectorId === 'genesis').length;
      expect(genesisShards).toHaveLength(manualCount);
    });

    it('returns empty array for sector with no shards', () => {
      expect(system.getShardsInSector('nonexistent-sector')).toHaveLength(0);
    });
  });

  // ── getRevealedShards() ──────────────────────────────────────────────────

  describe('getRevealedShards()', () => {
    it('filters shards by revealAt time', () => {
      const char = makeCharacter();
      system.executeFracture('player-1', char);
      // First shard has revealAt ≈ now, later ones are staggered over 5 min
      const revealed = system.getRevealedShards(false);
      const allShards = system.getActiveShards();
      // At least the first shard should be revealed immediately
      expect(revealed.length).toBeGreaterThanOrEqual(1);
      expect(revealed.length).toBeLessThanOrEqual(allShards.length);
    });

    it('priority gives 60s head start — reveals more shards', () => {
      const char = makeCharacter();
      system.executeFracture('player-1', char);
      const normal = system.getRevealedShards(false);
      const priority = system.getRevealedShards(true);
      expect(priority.length).toBeGreaterThanOrEqual(normal.length);
    });
  });

  // ── tick() ───────────────────────────────────────────────────────────────

  describe('tick()', () => {
    it('decays expired shards', () => {
      const char = makeCharacter();
      system.executeFracture('player-1', char);
      const beforeCount = system.getActiveShards().length;
      expect(beforeCount).toBeGreaterThan(0);

      // Force all shards to be expired
      for (const [, shard] of system._activeShards) {
        shard.expiresAt = Date.now() - 1;
      }

      system.tick(1000);
      expect(system.getActiveShards()).toHaveLength(0);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'shard:decayed',
        expect.objectContaining({ shardId: expect.any(String) }),
      );
    });

    it('does not decay shards that have not expired', () => {
      const char = makeCharacter();
      system.executeFracture('player-1', char);
      const beforeCount = system.getActiveShards().length;
      system.tick(1000);
      expect(system.getActiveShards()).toHaveLength(beforeCount);
    });
  });

  // ── getFractureHistory() ─────────────────────────────────────────────────

  describe('getFractureHistory()', () => {
    it('returns empty array when no fractures have occurred', () => {
      expect(system.getFractureHistory()).toHaveLength(0);
    });

    it('returns recorded fractures in order', () => {
      const char1 = makeCharacter({ name: 'First' });
      const char2 = makeCharacter({ name: 'Second' });
      system.executeFracture('p1', char1);
      system.executeFracture('p2', char2);
      const history = system.getFractureHistory();
      expect(history).toHaveLength(2);
      expect(history[0].characterName).toBe('First');
      expect(history[1].characterName).toBe('Second');
    });
  });

  // ── Amplified fracture ───────────────────────────────────────────────────

  describe('amplified fracture', () => {
    it('does not crash with amplified=true', () => {
      const char = makeCharacter();
      expect(() =>
        system.executeFracture('player-1', char, { amplified: true }),
      ).not.toThrow();
    });

    it('produces shards with amplified flag recorded in history', () => {
      const char = makeCharacter();
      system.executeFracture('player-1', char, { amplified: true });
      const history = system.getFractureHistory();
      expect(history[0].amplified).toBe(true);
    });

    it('produces shards successfully', () => {
      const char = makeCharacter();
      const result = system.executeFracture('player-1', char, { amplified: true });
      expect(result.shards.length).toBeGreaterThan(0);
      for (const shard of result.shards) {
        expect(SHARD_TYPES).toContain(shard.type);
      }
    });
  });
});
