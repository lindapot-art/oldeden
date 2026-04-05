import { GENOME_LENGTH, GENE_CLUSTER } from './GeneticSystem.js';

/**
 * MutationSystem — applies radiation and environmental mutations to genomes.
 *
 * Radiation Sources:
 *  - Post-war sectors (persistent background radiation)
 *  - Solar flare events (temporary intense bursts)
 *  - Neutron star proximity
 *  - Nuclear detonation fallout
 *  - Ancient pre-war sites
 *
 * Mutation Types:
 *  - Point mutation: a single gene locus shifts by ±1–32
 *  - Inversion: a segment of the genome is reversed
 *  - Amplification: a gene cluster is upregulated (values pushed toward 255)
 *  - Suppression: a gene cluster is downregulated (values pushed toward 0)
 *  - Radical: a locus is replaced with a fully random value (rare, high radiation)
 */

/** Radiation level thresholds that gate mutation type availability */
export const RADIATION_TIER = Object.freeze({
  TRACE:    0.01,   // Almost nothing — long-term exposure only
  LOW:      0.10,
  MODERATE: 0.30,
  HIGH:     0.60,
  EXTREME:  0.90,   // Near lethal — rapid, dramatic mutations
});

export class MutationSystem {
  async init(engine) {
    this._engine = engine;
    /** @type {Map<string, number>} sectorId → radiation level (0–1) */
    this._sectorRadiation = new Map();
    console.log('[MutationSystem] Initialised.');
  }

  tick(_deltaMs) {}

  async destroy() {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Set the radiation level for a named sector.
   * @param {string} sectorId
   * @param {number} level  0.0 (none) – 1.0 (lethal)
   */
  setSectorRadiation(sectorId, level) {
    this._sectorRadiation.set(sectorId, Math.max(0, Math.min(1, level)));
  }

  /**
   * Get the current radiation level for a sector.
   * @param {string} sectorId
   * @returns {number}
   */
  getSectorRadiation(sectorId) {
    return this._sectorRadiation.get(sectorId) ?? 0;
  }

  /**
   * Apply a mutation pass to a genome based on accumulated radiation exposure.
   *
   * Called when a character has spent time in a radiation zone.  The number
   * and severity of mutations scale with the radiation level and exposure
   * duration (exposureHours).
   *
   * @param {Uint8Array} genome
   * @param {number} radiationLevel   0–1
   * @param {number} [exposureHours=1]
   * @returns {{ genome: Uint8Array, mutations: MutationEvent[] }}
   */
  applyRadiation(genome, radiationLevel, exposureHours = 1) {
    const mutated = new Uint8Array(genome);
    const mutations = [];

    // Effective mutation probability per locus per hour
    const baseMutationRate = radiationLevel * exposureHours * 0.002;

    for (let i = 0; i < GENOME_LENGTH; i++) {
      if (Math.random() < baseMutationRate) {
        const event = this._applyPointMutation(mutated, i, radiationLevel);
        mutations.push(event);
      }
    }

    // High radiation may trigger inversion events
    if (radiationLevel >= RADIATION_TIER.HIGH && Math.random() < radiationLevel * 0.1) {
      const event = this._applyInversion(mutated);
      mutations.push(event);
    }

    return { genome: mutated, mutations };
  }

  /**
   * Calculate the cumulative radiation damage to a character's resistance genes.
   * Returns a degradation factor (0 = none, 1 = maximum degradation).
   *
   * Characters with high RESISTANCE genes take less effective radiation damage.
   * @param {Uint8Array} genome
   * @param {number} totalRadiationDose
   * @returns {number}
   */
  calculateResistance(genome, totalRadiationDose) {
    const [start, end] = GENE_CLUSTER.RESISTANCE;
    let resistanceSum = 0;
    for (let i = start; i < end; i++) {
      resistanceSum += genome[i];
    }
    const avgResistance = resistanceSum / (end - start) / 255;
    return Math.max(0, totalRadiationDose * (1 - avgResistance));
  }

  /**
   * Determine whether a character should die from radiation poisoning.
   * @param {Uint8Array} genome
   * @param {number} cumulativeDose
   * @returns {boolean}
   */
  isLethalDose(genome, cumulativeDose) {
    const effectiveDose = this.calculateResistance(genome, cumulativeDose);
    return effectiveDose > 1.0;
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _applyPointMutation(genome, locus, radiationLevel) {
    const original = genome[locus];
    let delta;

    if (radiationLevel >= RADIATION_TIER.EXTREME && Math.random() < 0.2) {
      // Radical mutation — completely random value
      genome[locus] = Math.floor(Math.random() * 256);
      return { type: 'radical', locus, original, result: genome[locus] };
    }

    // Scaled delta: low radiation → subtle shift; high radiation → larger shift
    const maxDelta = Math.round(1 + radiationLevel * 31);
    delta = Math.floor(Math.random() * maxDelta) * (Math.random() < 0.5 ? 1 : -1);
    genome[locus] = Math.max(0, Math.min(255, original + delta));

    return { type: 'point', locus, original, result: genome[locus], delta };
  }

  _applyInversion(genome) {
    const start = Math.floor(Math.random() * (GENOME_LENGTH - 10));
    const length = 5 + Math.floor(Math.random() * 20);
    const end = Math.min(start + length, GENOME_LENGTH);

    const segment = genome.slice(start, end).reverse();
    genome.set(segment, start);

    return { type: 'inversion', start, end };
  }
}

/**
 * @typedef {object} MutationEvent
 * @property {'point'|'inversion'|'radical'} type
 * @property {number} [locus]
 * @property {number} [original]
 * @property {number} [result]
 * @property {number} [delta]
 * @property {number} [start]
 * @property {number} [end]
 */
