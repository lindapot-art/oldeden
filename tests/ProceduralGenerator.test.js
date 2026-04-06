/**
 * Tests for ProceduralGenerator — deterministic and random content generation.
 */
import { ProceduralGenerator } from '../src/systems/ProceduralGenerator.js';

describe('ProceduralGenerator', () => {
  let gen;

  beforeEach(() => {
    gen = new ProceduralGenerator();
    gen._engine = {};
  });

  describe('generateStarSystem()', () => {
    it('returns a valid star system object', () => {
      const system = gen.generateStarSystem();
      expect(system).toHaveProperty('id');
      expect(system).toHaveProperty('name');
      expect(system).toHaveProperty('starType');
      expect(system).toHaveProperty('planets');
      expect(system).toHaveProperty('hazards');
      expect(system).toHaveProperty('resources');
      expect(system).toHaveProperty('baseRadiation');
      expect(typeof system.baseRadiation).toBe('number');
    });

    it('planetCount matches planets array length', () => {
      const system = gen.generateStarSystem();
      expect(system.planets.length).toBe(system.planetCount);
    });

    it('produces the same output for the same seed', () => {
      const a = gen.generateStarSystem('test-seed-123');
      const b = gen.generateStarSystem('test-seed-123');
      expect(a.name).toBe(b.name);
      expect(a.starType).toBe(b.starType);
      expect(a.planetCount).toBe(b.planetCount);
    });

    it('produces different output for different seeds', () => {
      // Very high probability of being different
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        results.add(gen.generateStarSystem(`seed-${i}`).name);
      }
      expect(results.size).toBeGreaterThan(5);
    });

    it('each planet has biome, gravity, and atmosphereDensity', () => {
      const { planets } = gen.generateStarSystem();
      for (const planet of planets) {
        expect(planet).toHaveProperty('biome');
        expect(planet).toHaveProperty('gravity');
        expect(planet).toHaveProperty('atmosphereDensity');
      }
    });
  });

  describe('generateQuestHook()', () => {
    it('returns a valid quest hook', () => {
      const quest = gen.generateQuestHook();
      expect(quest).toHaveProperty('id');
      expect(quest).toHaveProperty('objective');
      expect(quest).toHaveProperty('summary');
      expect(quest).toHaveProperty('rewardType');
      expect(['ec', 'sm', 'nft']).toContain(quest.rewardType);
    });

    it('summary contains objective', () => {
      const quest = gen.generateQuestHook();
      expect(quest.summary.toLowerCase()).toContain(quest.objective.toLowerCase());
    });

    it('expiresInHours is between 6 and 48', () => {
      for (let i = 0; i < 20; i++) {
        const quest = gen.generateQuestHook();
        expect(quest.expiresInHours).toBeGreaterThanOrEqual(6);
        expect(quest.expiresInHours).toBeLessThanOrEqual(48);
      }
    });
  });

  describe('generateNPCBackstory()', () => {
    it('returns a non-empty string', () => {
      const npc = { id: 'abc123def456', ageYears: 35 };
      const backstory = gen.generateNPCBackstory(npc);
      expect(typeof backstory).toBe('string');
      expect(backstory.length).toBeGreaterThan(10);
    });

    it('includes age in backstory', () => {
      const npc = { id: 'xyz789', ageYears: 42 };
      const backstory = gen.generateNPCBackstory(npc);
      expect(backstory).toContain('42');
    });
  });
});
