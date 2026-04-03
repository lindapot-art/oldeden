/**
 * Tests for GeneticSystem — genome generation, crossover, and trait extraction.
 */
import { GeneticSystem, GENOME_LENGTH, APTITUDE_GENES, PHYSICAL_GENES } from '../src/systems/GeneticSystem.js';

describe('GeneticSystem', () => {
  let genetics;

  beforeEach(() => {
    genetics = new GeneticSystem();
    // init() requires engine, which we stub
    genetics._engine = {};
  });

  describe('generateRandom()', () => {
    it('produces a Uint8Array of correct length', () => {
      const genome = genetics.generateRandom();
      expect(genome).toBeInstanceOf(Uint8Array);
      expect(genome.length).toBe(GENOME_LENGTH);
    });

    it('produces different genomes each call', () => {
      const a = genetics.generateRandom();
      const b = genetics.generateRandom();
      // With 256 random bytes, collision probability is astronomically low
      expect(genetics.toHex(a)).not.toBe(genetics.toHex(b));
    });
  });

  describe('crossover()', () => {
    it('produces a child of correct length', () => {
      const parentA = genetics.generateRandom();
      const parentB = genetics.generateRandom();
      const child   = genetics.crossover(parentA, parentB);
      expect(child.length).toBe(GENOME_LENGTH);
    });

    it('child values are within byte range (0–255)', () => {
      const parentA = genetics.generateRandom();
      const parentB = genetics.generateRandom();
      const child   = genetics.crossover(parentA, parentB);
      for (const byte of child) {
        expect(byte).toBeGreaterThanOrEqual(0);
        expect(byte).toBeLessThanOrEqual(255);
      }
    });

    it('child loci are drawn from either parent or mutation', () => {
      const parentA = new Uint8Array(GENOME_LENGTH).fill(0);
      const parentB = new Uint8Array(GENOME_LENGTH).fill(255);
      const child   = genetics.crossover(parentA, parentB, { mutationRate: 0 });
      for (const byte of child) {
        expect([0, 255]).toContain(byte);
      }
    });

    it('mutation rate 1.0 produces completely random child', () => {
      const parentA = new Uint8Array(GENOME_LENGTH).fill(0);
      const parentB = new Uint8Array(GENOME_LENGTH).fill(0);
      const child   = genetics.crossover(parentA, parentB, { mutationRate: 1.0 });
      // With all zeros and full mutation, at least some bytes should differ
      const allZero = [...child].every((b) => b === 0);
      expect(allZero).toBe(false);
    });
  });

  describe('getTrait() / getNormalisedTrait()', () => {
    it('returns the correct byte value', () => {
      const genome = new Uint8Array(GENOME_LENGTH);
      genome[APTITUDE_GENES.COMBAT] = 200;
      expect(genetics.getTrait(genome, APTITUDE_GENES.COMBAT)).toBe(200);
    });

    it('normalised trait is between 0 and 1', () => {
      const genome = new Uint8Array(GENOME_LENGTH);
      genome[APTITUDE_GENES.COMBAT] = 128;
      const normalised = genetics.getNormalisedTrait(genome, APTITUDE_GENES.COMBAT);
      expect(normalised).toBeGreaterThanOrEqual(0);
      expect(normalised).toBeLessThanOrEqual(1);
    });
  });

  describe('getLifespan()', () => {
    it('returns between 60 and 120 for any genome', () => {
      for (let i = 0; i < 20; i++) {
        const genome = genetics.generateRandom();
        const lifespan = genetics.getLifespan(genome);
        expect(lifespan).toBeGreaterThanOrEqual(60);
        expect(lifespan).toBeLessThanOrEqual(120);
      }
    });

    it('low LIFESPAN gene → shorter lifespan', () => {
      const genome = new Uint8Array(GENOME_LENGTH);
      genome[PHYSICAL_GENES.LIFESPAN] = 0;
      expect(genetics.getLifespan(genome)).toBe(60);
    });

    it('high LIFESPAN gene → longer lifespan', () => {
      const genome = new Uint8Array(GENOME_LENGTH);
      genome[PHYSICAL_GENES.LIFESPAN] = 255;
      expect(genetics.getLifespan(genome)).toBe(120);
    });
  });

  describe('toHex() / fromHex()', () => {
    it('round-trips correctly', () => {
      const genome  = genetics.generateRandom();
      const hex     = genetics.toHex(genome);
      const decoded = genetics.fromHex(hex);
      expect(decoded).toEqual(genome);
    });

    it('hex string has correct length (512 chars for 256 bytes)', () => {
      const genome = genetics.generateRandom();
      expect(genetics.toHex(genome).length).toBe(512);
    });
  });
});
