/**
 * Tests for NPCSystem — spawning, killing, promotion, fracture, ascension, population stats.
 */
import { jest } from '@jest/globals';
import { NPCSystem } from '../src/systems/NPCSystem.js';
import { APTITUDE_GENES, PHYSICAL_GENES } from '../src/systems/GeneticSystem.js';

describe('NPCSystem', () => {
  let npc;
  let mockEngine;
  let testGenome;

  beforeEach(async () => {
    npc = new NPCSystem();
    mockEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
      getSystem: jest.fn((name) => {
        if (name === 'genetics') {
          return {
            getLifespan: jest.fn().mockReturnValue(100),
          };
        }
        if (name === 'rebirth') {
          return {
            computeStatusScore: jest.fn().mockReturnValue(42),
          };
        }
        return null;
      }),
    };
    await npc.init(mockEngine);

    // Create a deterministic genome
    testGenome = new Uint8Array(256);
    for (let i = 0; i < 256; i++) testGenome[i] = 128;
  });

  afterEach(async () => {
    await npc.destroy();
    jest.restoreAllMocks();
  });

  // ── init / destroy ────────────────────────────────────────────────────────

  describe('init()', () => {
    it('initializes with empty NPC pool', () => {
      expect(npc._npcs.size).toBe(0);
    });

    it('stores engine reference', () => {
      expect(npc._engine).toBe(mockEngine);
    });
  });

  describe('destroy()', () => {
    it('clears entire NPC pool', async () => {
      npc.spawnNPC({ genome: testGenome });
      npc.spawnNPC({ genome: testGenome });
      expect(npc._npcs.size).toBe(2);

      await npc.destroy();
      expect(npc._npcs.size).toBe(0);
    });
  });

  // ── spawnNPC() ────────────────────────────────────────────────────────────

  describe('spawnNPC()', () => {
    it('creates an NPC with default values', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      expect(spawned).toBeDefined();
      expect(spawned.id).toBeDefined();
      expect(spawned.sectorId).toBe('genesis');
      expect(spawned.credits).toBe(100);
      expect(spawned.ageYears).toBe(20);
      expect(spawned.isActive).toBe(true);
      expect(spawned.isPlayerAvatar).toBe(false);
    });

    it('stores the genome', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      expect(spawned.genome).toBe(testGenome);
    });

    it('respects custom params', () => {
      const spawned = npc.spawnNPC({
        genome: testGenome,
        sectorId: 'alpha-sector',
        credits: 500,
        ageYears: 35,
      });
      expect(spawned.sectorId).toBe('alpha-sector');
      expect(spawned.credits).toBe(500);
      expect(spawned.ageYears).toBe(35);
    });

    it('emits npc:spawned event', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      expect(mockEngine.events.emit).toHaveBeenCalledWith('npc:spawned', {
        npcId: spawned.id,
        sectorId: 'genesis',
      });
    });

    it('adds NPC to the internal map', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      expect(npc._npcs.get(spawned.id)).toBe(spawned);
    });

    it('initializes skills from genome', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      expect(spawned.skills).toBeDefined();
      expect(typeof spawned.skills).toBe('object');
      // With genome byte 128/255 ≈ 0.502, starting skill = floor(0.502 * 20) = 10
      for (const skillName of Object.keys(APTITUDE_GENES)) {
        expect(spawned.skills[skillName]).toBeDefined();
      }
    });
  });

  // ── getNPC() ──────────────────────────────────────────────────────────────

  describe('getNPC()', () => {
    it('returns NPC by id', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      expect(npc.getNPC(spawned.id)).toBe(spawned);
    });

    it('returns undefined for unknown id', () => {
      expect(npc.getNPC('nonexistent')).toBeUndefined();
    });
  });

  // ── getLivingNPCPool() ────────────────────────────────────────────────────

  describe('getLivingNPCPool()', () => {
    it('returns only active, non-player, non-fractured, non-ascended NPCs', () => {
      const a = npc.spawnNPC({ genome: testGenome });
      const b = npc.spawnNPC({ genome: testGenome });
      const c = npc.spawnNPC({ genome: testGenome });

      b.isPlayerAvatar = true;
      c.isFractured = true;

      const pool = npc.getLivingNPCPool();
      expect(pool).toHaveLength(1);
      expect(pool[0].id).toBe(a.id);
    });

    it('returns empty array when no NPCs exist', () => {
      expect(npc.getLivingNPCPool()).toEqual([]);
    });

    it('excludes ascended NPCs', () => {
      const a = npc.spawnNPC({ genome: testGenome });
      a.isAscended = true;
      expect(npc.getLivingNPCPool()).toHaveLength(0);
    });
  });

  // ── killNPC() ─────────────────────────────────────────────────────────────

  describe('killNPC()', () => {
    it('sets NPC as inactive', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.killNPC(spawned.id, 'combat');
      expect(spawned.isActive).toBe(false);
    });

    it('sets cause of death', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.killNPC(spawned.id, 'old_age');
      expect(spawned.causeOfDeath).toBe('old_age');
    });

    it('emits npc:died event with status score', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.killNPC(spawned.id, 'combat');
      expect(mockEngine.events.emit).toHaveBeenCalledWith('npc:died', {
        npcId: spawned.id,
        cause: 'combat',
        statusScore: 42,
      });
    });

    it('defaults cause to unknown', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.killNPC(spawned.id);
      expect(spawned.causeOfDeath).toBe('unknown');
    });

    it('does nothing for already dead NPC', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.killNPC(spawned.id, 'combat');
      mockEngine.events.emit.mockClear();

      npc.killNPC(spawned.id, 'double_kill');
      expect(mockEngine.events.emit).not.toHaveBeenCalledWith(
        'npc:died',
        expect.anything()
      );
    });

    it('does nothing for nonexistent NPC', () => {
      npc.killNPC('nonexistent', 'combat');
      expect(mockEngine.events.emit).not.toHaveBeenCalledWith(
        'npc:died',
        expect.anything()
      );
    });
  });

  // ── promoteToNPC() ────────────────────────────────────────────────────────

  describe('promoteToNPC()', () => {
    it('marks NPC as deceased avatar', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      spawned.isPlayerAvatar = true;

      npc.promoteToNPC(spawned.id, { causeOfDeath: 'heroic_sacrifice' });
      expect(spawned.isPlayerAvatar).toBe(false);
      expect(spawned.isDeceasedAvatar).toBe(true);
      expect(spawned.causeOfDeath).toBe('heroic_sacrifice');
    });

    it('emits npc:promoted_from_avatar event', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.promoteToNPC(spawned.id);
      expect(mockEngine.events.emit).toHaveBeenCalledWith(
        'npc:promoted_from_avatar',
        { npcId: spawned.id }
      );
    });

    it('updates sectorId if provided', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.promoteToNPC(spawned.id, { sectorId: 'valhalla' });
      expect(spawned.sectorId).toBe('valhalla');
    });

    it('does nothing for nonexistent character', () => {
      // Should not throw
      npc.promoteToNPC('nonexistent');
      expect(mockEngine.events.emit).not.toHaveBeenCalledWith(
        'npc:promoted_from_avatar',
        expect.anything()
      );
    });
  });

  // ── markFractured() ───────────────────────────────────────────────────────

  describe('markFractured()', () => {
    it('marks NPC as fractured and inactive', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.markFractured(spawned.id);
      expect(spawned.isFractured).toBe(true);
      expect(spawned.isActive).toBe(false);
    });

    it('emits npc:fractured event', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.markFractured(spawned.id);
      expect(mockEngine.events.emit).toHaveBeenCalledWith('npc:fractured', {
        npcId: spawned.id,
      });
    });

    it('does nothing for nonexistent character', () => {
      npc.markFractured('nonexistent');
      expect(mockEngine.events.emit).not.toHaveBeenCalledWith(
        'npc:fractured',
        expect.anything()
      );
    });
  });

  // ── markAscended() ────────────────────────────────────────────────────────

  describe('markAscended()', () => {
    it('marks NPC as ascended and inactive', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.markAscended(spawned.id, 'sol');
      expect(spawned.isAscended).toBe(true);
      expect(spawned.isActive).toBe(false);
    });

    it('updates sectorId to the ascended system', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.markAscended(spawned.id, 'alpha-centauri');
      expect(spawned.sectorId).toBe('alpha-centauri');
    });

    it('emits npc:ascended event', () => {
      const spawned = npc.spawnNPC({ genome: testGenome });
      npc.markAscended(spawned.id, 'sol');
      expect(mockEngine.events.emit).toHaveBeenCalledWith('npc:ascended', {
        npcId: spawned.id,
        systemId: 'sol',
      });
    });

    it('does nothing for nonexistent character', () => {
      npc.markAscended('nonexistent', 'sol');
      expect(mockEngine.events.emit).not.toHaveBeenCalledWith(
        'npc:ascended',
        expect.anything()
      );
    });
  });

  // ── getPopulationStats() ──────────────────────────────────────────────────

  describe('getPopulationStats()', () => {
    it('returns zeroes when pool is empty', () => {
      const stats = npc.getPopulationStats();
      expect(stats).toEqual({
        total: 0, living: 0, deceased: 0,
        playerAvatars: 0, deceasedAvatars: 0, fractured: 0, ascended: 0,
      });
    });

    it('counts living, deceased, and special categories', () => {
      const a = npc.spawnNPC({ genome: testGenome });
      const b = npc.spawnNPC({ genome: testGenome });
      const c = npc.spawnNPC({ genome: testGenome });
      const d = npc.spawnNPC({ genome: testGenome });

      npc.killNPC(b.id, 'combat');
      npc.markFractured(c.id);
      d.isPlayerAvatar = true;

      const stats = npc.getPopulationStats();
      expect(stats.total).toBe(4);
      expect(stats.living).toBe(2); // a + d (d is still active as player)
      expect(stats.deceased).toBe(2); // b + c (both inactive)
      expect(stats.playerAvatars).toBe(1); // d
      expect(stats.fractured).toBe(1); // c
    });

    it('counts ascended NPCs', () => {
      const a = npc.spawnNPC({ genome: testGenome });
      npc.markAscended(a.id, 'sol');

      const stats = npc.getPopulationStats();
      expect(stats.ascended).toBe(1);
      expect(stats.living).toBe(0);
    });
  });

  // ── tick() ────────────────────────────────────────────────────────────────

  describe('tick()', () => {
    it('accumulates time', () => {
      const before = npc._accumulatedTime;
      npc.tick(100);
      expect(npc._accumulatedTime).toBe(before + 100);
    });

    it('ages active NPCs', () => {
      const spawned = npc.spawnNPC({ genome: testGenome, ageYears: 50 });
      npc.tick(1000); // 1 second = IN_GAME_YEARS_PER_SECOND years
      expect(spawned.ageYears).toBeGreaterThan(50);
    });

    it('does not age inactive NPCs', () => {
      const spawned = npc.spawnNPC({ genome: testGenome, ageYears: 50 });
      npc.killNPC(spawned.id);
      const ageAfterDeath = spawned.ageYears;
      npc.tick(1000);
      expect(spawned.ageYears).toBe(ageAfterDeath);
    });

    it('kills NPCs that exceed max lifespan', () => {
      const spawned = npc.spawnNPC({ genome: testGenome, ageYears: 99.999 });
      // Mock getLifespan to return 100
      npc.tick(60000); // Enough time to push past 100
      // NPC should now be dead from old_age
      expect(spawned.isActive).toBe(false);
      expect(spawned.causeOfDeath).toBe('old_age');
    });
  });

  // ── _initSkillsFromGenome() ───────────────────────────────────────────────

  describe('_initSkillsFromGenome()', () => {
    it('derives starting skills from genome', () => {
      const skills = npc._initSkillsFromGenome(testGenome);
      // With all bytes = 128: floor(128/255 * 20) = floor(10.04) = 10
      for (const skillName of Object.keys(APTITUDE_GENES)) {
        expect(skills[skillName]).toBe(10);
      }
    });

    it('zero genome gives zero skills', () => {
      const zeroGenome = new Uint8Array(256);
      const skills = npc._initSkillsFromGenome(zeroGenome);
      for (const skillName of Object.keys(APTITUDE_GENES)) {
        expect(skills[skillName]).toBe(0);
      }
    });

    it('max genome gives max starting skills', () => {
      const maxGenome = new Uint8Array(256).fill(255);
      const skills = npc._initSkillsFromGenome(maxGenome);
      for (const skillName of Object.keys(APTITUDE_GENES)) {
        expect(skills[skillName]).toBe(20);
      }
    });
  });
});
