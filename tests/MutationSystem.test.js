/**
 * Tests for MutationSystem — radiation and mutation mechanics.
 */
import { MutationSystem, RADIATION_TIER } from '../src/systems/MutationSystem.js';
import { GeneticSystem, GENOME_LENGTH } from '../src/systems/GeneticSystem.js';

describe('MutationSystem', () => {
  let mutation;
  let genetics;

  beforeEach(() => {
    genetics = new GeneticSystem();
    genetics._engine = {};
    mutation = new MutationSystem();
    mutation._engine = {};
    mutation._sectorRadiation = new Map();
  });

  describe('setSectorRadiation() / getSectorRadiation()', () => {
    it('stores and retrieves radiation level', () => {
      mutation.setSectorRadiation('alpha-prime', 0.5);
      expect(mutation.getSectorRadiation('alpha-prime')).toBe(0.5);
    });

    it('clamps radiation to [0, 1]', () => {
      mutation.setSectorRadiation('test', 2.5);
      expect(mutation.getSectorRadiation('test')).toBe(1);
      mutation.setSectorRadiation('test', -1);
      expect(mutation.getSectorRadiation('test')).toBe(0);
    });

    it('returns 0 for unknown sector', () => {
      expect(mutation.getSectorRadiation('unknown-sector')).toBe(0);
    });
  });

  describe('applyRadiation()', () => {
    it('returns an object with genome and mutations array', () => {
      const genome = genetics.generateRandom();
      const result = mutation.applyRadiation(genome, 0.5, 1);
      expect(result).toHaveProperty('genome');
      expect(result).toHaveProperty('mutations');
      expect(result.genome).toBeInstanceOf(Uint8Array);
      expect(Array.isArray(result.mutations)).toBe(true);
    });

    it('output genome has correct length', () => {
      const genome = genetics.generateRandom();
      const { genome: mutated } = mutation.applyRadiation(genome, 0.5, 1);
      expect(mutated.length).toBe(GENOME_LENGTH);
    });

    it('zero radiation produces no mutations', () => {
      const genome = genetics.generateRandom();
      const { mutations } = mutation.applyRadiation(genome, 0, 100);
      expect(mutations.length).toBe(0);
    });

    it('extreme radiation produces more mutations than low radiation', () => {
      const genome = genetics.generateRandom();
      let totalLow = 0;
      let totalHigh = 0;
      // Average over many trials to reduce noise
      for (let i = 0; i < 50; i++) {
        const g = genetics.generateRandom();
        totalLow  += mutation.applyRadiation(g, 0.05, 10).mutations.length;
        totalHigh += mutation.applyRadiation(g, 0.9,  10).mutations.length;
      }
      expect(totalHigh).toBeGreaterThan(totalLow);
    });

    it('all mutation results have type field', () => {
      const genome = genetics.generateRandom();
      // Run many times to collect diverse mutations
      let found = false;
      for (let i = 0; i < 100; i++) {
        const { mutations } = mutation.applyRadiation(genetics.generateRandom(), 0.8, 100);
        for (const m of mutations) {
          expect(['point', 'inversion', 'radical']).toContain(m.type);
          found = true;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('calculateResistance()', () => {
    it('high resistance gene reduces effective dose', () => {
      const lowResGenome  = new Uint8Array(GENOME_LENGTH).fill(0);
      const highResGenome = new Uint8Array(GENOME_LENGTH).fill(255);
      const dose = 0.5;

      const lowDamage  = mutation.calculateResistance(lowResGenome, dose);
      const highDamage = mutation.calculateResistance(highResGenome, dose);

      expect(highDamage).toBeLessThan(lowDamage);
    });
  });

  describe('isLethalDose()', () => {
    it('returns false for low dose', () => {
      const genome = new Uint8Array(GENOME_LENGTH).fill(128);
      expect(mutation.isLethalDose(genome, 0.1)).toBe(false);
    });

    it('returns true for very high dose on zero-resistance genome', () => {
      const genome = new Uint8Array(GENOME_LENGTH).fill(0);
      expect(mutation.isLethalDose(genome, 2.0)).toBe(true);
    });
  });
});
