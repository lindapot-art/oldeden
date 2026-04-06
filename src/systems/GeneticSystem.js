import { randomBytes } from 'crypto';

/**
 * GeneticSystem — manages the DNA genome for every character and NPC in Old Eden.
 *
 * Each genome is a fixed-length Uint8Array (256 bytes) where each byte represents
 * the expression level (0–255) of a gene locus.  Gene loci are grouped into
 * functional clusters:
 *
 *   Bytes 0–31   → Physical traits  (height, build, metabolism, lifespan)
 *   Bytes 32–63  → Aptitude traits  (combat, piloting, engineering, trade, science)
 *   Bytes 64–95  → Personality      (aggression, empathy, curiosity, greed)
 *   Bytes 96–127 → Resistance       (radiation, toxins, disease, vacuum)
 *   Bytes 128–159 → Appearance      (skin tone, facial features — fed into phenotype renderer)
 *   Bytes 160–255 → Reserved / future expansion
 */

export const GENOME_LENGTH = 256;

// Byte ranges for each trait cluster
export const GENE_CLUSTER = Object.freeze({
  PHYSICAL:     [0,   32],
  APTITUDE:     [32,  64],
  PERSONALITY:  [64,  96],
  RESISTANCE:   [96,  128],
  APPEARANCE:   [128, 160],
});

// Named aptitude gene indices within the APTITUDE cluster
export const APTITUDE_GENES = Object.freeze({
  COMBAT:      32,
  PILOTING:    33,
  ENGINEERING: 34,
  TRADE:       35,
  SCIENCE:     36,
  LEADERSHIP:  37,
  STEALTH:     38,
  MEDICINE:    39,
});

// Named physical gene indices
export const PHYSICAL_GENES = Object.freeze({
  LIFESPAN:    0,
  METABOLISM:  1,
  STRENGTH:    2,
  AGILITY:     3,
  ENDURANCE:   4,
});

export class GeneticSystem {
  async init(engine) {
    this._engine = engine;
    console.log('[GeneticSystem] Initialised.');
  }

  tick(_deltaMs) {
    // Genetics are event-driven, not tick-driven.
  }

  async destroy() {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate a random genome for a brand-new character.
   * @returns {Uint8Array}
   */
  generateRandom() {
    return new Uint8Array(randomBytes(GENOME_LENGTH));
  }

  /**
   * Produce a child genome by crossing over two parent genomes.
   * Uses uniform crossover with a configurable blend point per locus.
   *
   * @param {Uint8Array} parentA
   * @param {Uint8Array} parentB
   * @param {object} [options]
   * @param {number} [options.mutationRate=0.005] Per-locus chance of random mutation
   * @returns {Uint8Array}
   */
  crossover(parentA, parentB, { mutationRate = 0.005 } = {}) {
    const child = new Uint8Array(GENOME_LENGTH);
    for (let i = 0; i < GENOME_LENGTH; i++) {
      // 50/50 inheritance from either parent per locus
      child[i] = Math.random() < 0.5 ? parentA[i] : parentB[i];

      // Spontaneous mutation: replace locus with fully random value
      if (Math.random() < mutationRate) {
        child[i] = Math.floor(Math.random() * 256);
      }
    }
    return child;
  }

  /**
   * Extract a named trait value (0–255) from a genome.
   * @param {Uint8Array} genome
   * @param {number} geneIndex
   * @returns {number}
   */
  getTrait(genome, geneIndex) {
    return genome[geneIndex] ?? 0;
  }

  /**
   * Derive a normalised stat (0.0–1.0) from a gene locus.
   * @param {Uint8Array} genome
   * @param {number} geneIndex
   * @returns {number}
   */
  getNormalisedTrait(genome, geneIndex) {
    return this.getTrait(genome, geneIndex) / 255;
  }

  /**
   * Calculate the expected maximum lifespan (in in-game years) for a genome.
   * Base lifespan: 60–120 years depending on LIFESPAN gene.
   * @param {Uint8Array} genome
   * @returns {number}
   */
  getLifespan(genome) {
    const lifespanGene = this.getNormalisedTrait(genome, PHYSICAL_GENES.LIFESPAN);
    return Math.round(60 + lifespanGene * 60);
  }

  /**
   * Serialise a genome to a hex string (suitable for storage / NFT metadata).
   * @param {Uint8Array} genome
   * @returns {string}
   */
  toHex(genome) {
    return Buffer.from(genome).toString('hex');
  }

  /**
   * Deserialise a genome from a hex string.
   * @param {string} hex
   * @returns {Uint8Array}
   */
  fromHex(hex) {
    return new Uint8Array(Buffer.from(hex, 'hex'));
  }
}
