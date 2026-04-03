/**
 * GeneticFitnessEvaluator — ML-inspired genome fitness scoring for Old Eden.
 *
 * Uses a multi-layer perceptron (MLP) implemented from scratch in pure JS to
 * evaluate 256-byte genomes across six fitness dimensions. The network encodes
 * domain knowledge via meaningful initial weights that map genome clusters to
 * the fitness dimensions they biologically influence, while cross-connections
 * capture gene synergies (e.g. agility + combat aptitude → combat fitness).
 *
 * Fitness dimensions (all normalised 0–1):
 *   - survivalFitness       — harsh-environment survival (physical + resistance)
 *   - combatFitness         — combat effectiveness (strength, agility, combat, aggression)
 *   - socialFitness         — social influence (empathy, leadership, trade)
 *   - explorationFitness    — discovery potential (curiosity, piloting, science, endurance)
 *   - adaptability          — well-roundedness (variance penalty for specialisation)
 *   - evolutionaryPotential — offspring quality (genetic diversity score)
 *
 * Online learning:
 *   The network is trained incrementally via `recordOutcome()` using
 *   mini-batch SGD with momentum (lr = 0.001, momentum = 0.9).
 *   Death events from the engine are automatically ingested so the evaluator
 *   learns which gene combinations actually produce successful characters.
 *
 * Integration:
 *   - Listens: `npc:died`, `npc:spawned`
 *   - Emits:   `genetics:fitness_evaluated`, `genetics:population_shift`
 *
 * @module GeneticFitnessEvaluator
 */

import {
  GENOME_LENGTH,
  GENE_CLUSTER,
  APTITUDE_GENES,
  PHYSICAL_GENES,
} from '../systems/GeneticSystem.js';

// ── Personality gene offsets (absolute byte indices) ─────────────────────────

const PERSONALITY_GENES = Object.freeze({
  AGGRESSION: 64,
  EMPATHY:    65,
  CURIOSITY:  66,
  GREED:      67,
});

// ── Resistance gene offsets (absolute byte indices within cluster [96,128]) ──

const RESISTANCE_GENES = Object.freeze({
  RADIATION: 96,
  TOXIN:     97,
  DISEASE:   98,
  VACUUM:    99,
});

// ── MLP architecture constants ───────────────────────────────────────────────

/** Input layer size — one neuron per genome byte. */
const INPUT_SIZE  = GENOME_LENGTH;  // 256
/** First hidden layer size. */
const HIDDEN1_SIZE = 64;
/** Second hidden layer size. */
const HIDDEN2_SIZE = 32;
/** Output layer size — one per fitness dimension. */
const OUTPUT_SIZE  = 6;

/** Learning rate for stochastic gradient descent. */
const LEARNING_RATE = 0.001;
/** Momentum coefficient for SGD updates. */
const MOMENTUM = 0.9;

// ── Fitness dimension indices ────────────────────────────────────────────────

const FITNESS_DIMS = Object.freeze({
  SURVIVAL:     0,
  COMBAT:       1,
  SOCIAL:       2,
  EXPLORATION:  3,
  ADAPTABILITY: 4,
  EVOLUTIONARY: 5,
});

// ── Matrix / vector helpers ──────────────────────────────────────────────────

/**
 * Create a zero-filled matrix (array of Float64Arrays).
 * @param {number} rows
 * @param {number} cols
 * @returns {Float64Array[]}
 */
function zeroMatrix(rows, cols) {
  const m = new Array(rows);
  for (let i = 0; i < rows; i++) m[i] = new Float64Array(cols);
  return m;
}

/**
 * Create a zero-filled vector.
 * @param {number} size
 * @returns {Float64Array}
 */
function zeroVector(size) {
  return new Float64Array(size);
}

/**
 * Matrix-vector multiply: y = W · x
 * @param {Float64Array[]} W  Matrix (rows × cols)
 * @param {Float64Array}   x  Input vector  (cols)
 * @param {Float64Array}   y  Output vector (rows)
 */
function matVecMul(W, x, y) {
  const rows = W.length;
  const cols = x.length;
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    const wi = W[i];
    for (let j = 0; j < cols; j++) sum += wi[j] * x[j];
    y[i] = sum;
  }
}

/**
 * Vector addition in place: y[i] += b[i]
 * @param {Float64Array} y
 * @param {Float64Array} b
 */
function vecAddInPlace(y, b) {
  for (let i = 0; i < y.length; i++) y[i] += b[i];
}

/**
 * ReLU activation in place.
 * @param {Float64Array} v
 */
function reluInPlace(v) {
  for (let i = 0; i < v.length; i++) {
    if (v[i] < 0) v[i] = 0;
  }
}

/**
 * Sigmoid activation in place.
 * @param {Float64Array} v
 */
function sigmoidInPlace(v) {
  for (let i = 0; i < v.length; i++) {
    v[i] = 1 / (1 + Math.exp(-v[i]));
  }
}

/**
 * Derivative of ReLU: 1 if x > 0, else 0.
 * @param {number} x
 * @returns {number}
 */
function reluDeriv(x) {
  return x > 0 ? 1 : 0;
}

/**
 * Derivative of sigmoid given the sigmoid output itself: σ(x)·(1−σ(x)).
 * @param {number} s  The sigmoid output value.
 * @returns {number}
 */
function sigmoidDeriv(s) {
  return s * (1 - s);
}

// ── Domain-knowledge weight initialisation ───────────────────────────────────

/**
 * Build the initial weight matrix for layer 1 (input → hidden1).
 *
 * Encodes which genome bytes are relevant to each hidden neuron.
 * Hidden neurons are loosely grouped:
 *   0–9   : survival features (physical + resistance)
 *   10–19 : combat features (strength, agility, combat aptitude, aggression)
 *   20–29 : social features (empathy, leadership, trade, charisma)
 *   30–39 : exploration features (curiosity, piloting, science, endurance)
 *   40–49 : adaptability features (whole genome variance detectors)
 *   50–63 : cross-connection / synergy features
 *
 * @returns {{ W: Float64Array[], b: Float64Array }}
 */
function initLayer1Weights() {
  const W = zeroMatrix(HIDDEN1_SIZE, INPUT_SIZE);
  const b = zeroVector(HIDDEN1_SIZE);

  const BASE = 0.15;
  const WEAK = 0.05;

  // Helper: set connection weight from genome byte j → hidden neuron i
  const set = (i, j, w) => { W[i][j] = w; };

  // ── Survival neurons (0–9) — physical + resistance clusters ──
  for (let n = 0; n < 10; n++) {
    // Physical cluster (bytes 0–31)
    for (let j = GENE_CLUSTER.PHYSICAL[0]; j < GENE_CLUSTER.PHYSICAL[1]; j++) {
      set(n, j, BASE * (0.5 + 0.5 * Math.sin(n * 0.7 + j * 0.3)));
    }
    // Strong connections from key physical genes
    set(n, PHYSICAL_GENES.LIFESPAN,   BASE * 2);
    set(n, PHYSICAL_GENES.ENDURANCE,  BASE * 1.5);
    set(n, PHYSICAL_GENES.METABOLISM, BASE * 1.2);

    // Resistance cluster (bytes 96–127)
    for (let j = GENE_CLUSTER.RESISTANCE[0]; j < GENE_CLUSTER.RESISTANCE[1]; j++) {
      set(n, j, BASE * (0.6 + 0.4 * Math.cos(n * 0.5 + j * 0.2)));
    }
    set(n, RESISTANCE_GENES.RADIATION, BASE * 1.8);
    set(n, RESISTANCE_GENES.VACUUM,    BASE * 1.5);
    set(n, RESISTANCE_GENES.DISEASE,   BASE * 1.3);
    set(n, RESISTANCE_GENES.TOXIN,     BASE * 1.2);

    b[n] = -0.5; // bias pushes activation down so only strong genomes fire
  }

  // ── Combat neurons (10–19) — strength, agility, combat, aggression ──
  for (let n = 10; n < 20; n++) {
    set(n, PHYSICAL_GENES.STRENGTH, BASE * 2);
    set(n, PHYSICAL_GENES.AGILITY,  BASE * 2);
    set(n, PHYSICAL_GENES.ENDURANCE, BASE * 0.8);
    set(n, APTITUDE_GENES.COMBAT,   BASE * 2.5);
    set(n, APTITUDE_GENES.STEALTH,  BASE * 0.6);
    set(n, PERSONALITY_GENES.AGGRESSION, BASE * 1.5);

    // Light connections from other aptitude genes for synergy
    set(n, APTITUDE_GENES.PILOTING, WEAK);
    set(n, APTITUDE_GENES.ENGINEERING, WEAK * 0.5);

    b[n] = -0.3;
  }

  // ── Social neurons (20–29) — empathy, leadership, trade ──
  for (let n = 20; n < 30; n++) {
    set(n, PERSONALITY_GENES.EMPATHY,   BASE * 2);
    set(n, APTITUDE_GENES.LEADERSHIP,   BASE * 2.5);
    set(n, APTITUDE_GENES.TRADE,        BASE * 2);
    set(n, APTITUDE_GENES.MEDICINE,     BASE * 0.8);
    set(n, PERSONALITY_GENES.GREED,    -BASE * 0.5); // greed hurts social
    set(n, PERSONALITY_GENES.AGGRESSION, -BASE * 0.3);

    b[n] = -0.2;
  }

  // ── Exploration neurons (30–39) — curiosity, piloting, science, endurance ──
  for (let n = 30; n < 40; n++) {
    set(n, PERSONALITY_GENES.CURIOSITY,  BASE * 2);
    set(n, APTITUDE_GENES.PILOTING,      BASE * 2.5);
    set(n, APTITUDE_GENES.SCIENCE,       BASE * 2);
    set(n, PHYSICAL_GENES.ENDURANCE,     BASE * 1.5);
    set(n, APTITUDE_GENES.ENGINEERING,   BASE * 0.8);

    // Resistance helps survival during exploration
    set(n, RESISTANCE_GENES.RADIATION,   WEAK);
    set(n, RESISTANCE_GENES.VACUUM,      WEAK);

    b[n] = -0.3;
  }

  // ── Adaptability neurons (40–49) — whole-genome variance detectors ──
  // These neurons have small positive weights across ALL genome bytes
  // so they fire when the genome is broadly activated (well-rounded).
  for (let n = 40; n < 50; n++) {
    const phase = n * 0.4;
    for (let j = 0; j < INPUT_SIZE; j++) {
      // Small uniform weight with slight variation to break symmetry
      W[n][j] = WEAK * (0.8 + 0.4 * Math.sin(phase + j * 0.1));
    }
    b[n] = -2.0; // high threshold — only fires when many genes are moderate+
  }

  // ── Cross-connection / synergy neurons (50–63) ──
  // Detect interesting gene pairings that create emergent capabilities
  const synergies = [
    // [neuron, geneA, geneB, weightA, weightB] — synergy pairs
    [50, PHYSICAL_GENES.AGILITY,    APTITUDE_GENES.COMBAT,    BASE * 1.5, BASE * 1.5],
    [51, PHYSICAL_GENES.STRENGTH,   APTITUDE_GENES.ENGINEERING, BASE * 1.2, BASE * 1.2],
    [52, APTITUDE_GENES.PILOTING,   APTITUDE_GENES.SCIENCE,   BASE * 1.3, BASE * 1.3],
    [53, PERSONALITY_GENES.EMPATHY, APTITUDE_GENES.MEDICINE,  BASE * 1.5, BASE * 1.5],
    [54, APTITUDE_GENES.TRADE,      PERSONALITY_GENES.GREED,  BASE * 1.0, BASE * 1.0],
    [55, APTITUDE_GENES.LEADERSHIP, APTITUDE_GENES.COMBAT,    BASE * 1.2, BASE * 1.2],
    [56, PHYSICAL_GENES.ENDURANCE,  RESISTANCE_GENES.RADIATION, BASE * 1.5, BASE * 1.5],
    [57, APTITUDE_GENES.STEALTH,    PERSONALITY_GENES.CURIOSITY, BASE * 1.0, BASE * 1.0],
    [58, PHYSICAL_GENES.METABOLISM, PHYSICAL_GENES.LIFESPAN,  BASE * 1.3, BASE * 1.3],
    [59, APTITUDE_GENES.ENGINEERING, APTITUDE_GENES.SCIENCE,  BASE * 1.4, BASE * 1.4],
    [60, RESISTANCE_GENES.TOXIN,    RESISTANCE_GENES.DISEASE, BASE * 1.2, BASE * 1.2],
    [61, PERSONALITY_GENES.AGGRESSION, APTITUDE_GENES.STEALTH, BASE * 1.0, BASE * 1.0],
    [62, APTITUDE_GENES.LEADERSHIP, PERSONALITY_GENES.EMPATHY, BASE * 1.3, BASE * 1.3],
    [63, PHYSICAL_GENES.AGILITY,    APTITUDE_GENES.PILOTING,  BASE * 1.4, BASE * 1.4],
  ];
  for (const [n, gA, gB, wA, wB] of synergies) {
    set(n, gA, wA);
    set(n, gB, wB);
    b[n] = -0.6; // requires both genes active
  }

  return { W, b };
}

/**
 * Build the initial weight matrix for layer 2 (hidden1 → hidden2).
 *
 * Routes hidden1 neuron groups towards their target fitness dimensions
 * with learned feature compression.
 *
 * @returns {{ W: Float64Array[], b: Float64Array }}
 */
function initLayer2Weights() {
  const W = zeroMatrix(HIDDEN2_SIZE, HIDDEN1_SIZE);
  const b = zeroVector(HIDDEN2_SIZE);

  const BASE = 0.2;

  // Hidden2 neuron grouping (≈5 neurons per fitness dimension, 2 shared):
  //   0–4   : survival
  //   5–9   : combat
  //   10–14 : social
  //   15–19 : exploration
  //   20–24 : adaptability
  //   25–29 : evolutionary potential
  //   30–31 : shared / cross-dimension

  // Survival neurons ← hidden1 survival group (0–9) + synergies
  for (let n = 0; n < 5; n++) {
    for (let h = 0; h < 10; h++) W[n][h] = BASE * (1.0 + 0.2 * Math.sin(n + h));
    W[n][56] = BASE * 0.8; // endurance-radiation synergy
    W[n][58] = BASE * 0.6; // metabolism-lifespan synergy
    W[n][60] = BASE * 0.5; // toxin-disease synergy
    b[n] = -0.3;
  }

  // Combat neurons ← hidden1 combat group (10–19) + synergies
  for (let n = 5; n < 10; n++) {
    for (let h = 10; h < 20; h++) W[n][h] = BASE * (1.0 + 0.2 * Math.cos(n + h));
    W[n][50] = BASE * 1.0; // agility-combat synergy
    W[n][55] = BASE * 0.7; // leadership-combat synergy
    W[n][61] = BASE * 0.5; // aggression-stealth synergy
    b[n] = -0.2;
  }

  // Social neurons ← hidden1 social group (20–29) + synergies
  for (let n = 10; n < 15; n++) {
    for (let h = 20; h < 30; h++) W[n][h] = BASE * (1.0 + 0.15 * Math.sin(n * 2 + h));
    W[n][53] = BASE * 0.8; // empathy-medicine synergy
    W[n][62] = BASE * 0.7; // leadership-empathy synergy
    b[n] = -0.2;
  }

  // Exploration neurons ← hidden1 exploration group (30–39) + synergies
  for (let n = 15; n < 20; n++) {
    for (let h = 30; h < 40; h++) W[n][h] = BASE * (1.0 + 0.2 * Math.cos(n + h * 0.5));
    W[n][52] = BASE * 0.9; // piloting-science synergy
    W[n][57] = BASE * 0.6; // stealth-curiosity synergy
    W[n][63] = BASE * 0.7; // agility-piloting synergy
    b[n] = -0.2;
  }

  // Adaptability neurons ← hidden1 adaptability group (40–49)
  for (let n = 20; n < 25; n++) {
    for (let h = 40; h < 50; h++) W[n][h] = BASE * 1.5;
    // Negative weights from specialist groups to penalise narrow genomes
    for (let h = 0; h < 40; h++) W[n][h] = -BASE * 0.05;
    b[n] = 0.5; // positive bias — starts high, specialists drag it down
  }

  // Evolutionary potential neurons ← mix of all groups
  for (let n = 25; n < 30; n++) {
    // Broad positive from adaptability neurons
    for (let h = 40; h < 50; h++) W[n][h] = BASE * 0.8;
    // Moderate from every specialist group — diversity is key
    for (let h = 0; h < 40; h++) W[n][h] = BASE * 0.1;
    // Strong from synergy neurons — synergies indicate rich genomes
    for (let h = 50; h < 64; h++) W[n][h] = BASE * 0.6;
    b[n] = -0.5;
  }

  // Shared cross-dimension neurons
  for (let h = 0; h < HIDDEN1_SIZE; h++) {
    W[30][h] = BASE * 0.15 * Math.sin(h * 0.3);
    W[31][h] = BASE * 0.15 * Math.cos(h * 0.3);
  }
  b[30] = -0.1;
  b[31] = -0.1;

  return { W, b };
}

/**
 * Build the initial weight matrix for the output layer (hidden2 → output).
 *
 * Maps hidden2 neuron groups directly to the 6 fitness dimension outputs.
 *
 * @returns {{ W: Float64Array[], b: Float64Array }}
 */
function initOutputWeights() {
  const W = zeroMatrix(OUTPUT_SIZE, HIDDEN2_SIZE);
  const b = zeroVector(OUTPUT_SIZE);

  const BASE = 0.3;

  // Each output neuron draws primarily from its dedicated hidden2 group
  // with light contributions from shared neurons (30–31).

  // survivalFitness ← hidden2 0–4 + shared
  for (let h = 0; h < 5; h++)  W[0][h] = BASE * (1.2 + 0.1 * h);
  W[0][30] = BASE * 0.3;
  W[0][31] = BASE * 0.2;
  b[0] = -0.5;

  // combatFitness ← hidden2 5–9 + shared
  for (let h = 5; h < 10; h++) W[1][h] = BASE * (1.2 + 0.1 * (h - 5));
  W[1][30] = BASE * 0.2;
  W[1][31] = BASE * 0.3;
  b[1] = -0.4;

  // socialFitness ← hidden2 10–14 + shared
  for (let h = 10; h < 15; h++) W[2][h] = BASE * (1.2 + 0.1 * (h - 10));
  W[2][30] = BASE * 0.25;
  W[2][31] = BASE * 0.25;
  b[2] = -0.3;

  // explorationFitness ← hidden2 15–19 + shared
  for (let h = 15; h < 20; h++) W[3][h] = BASE * (1.2 + 0.1 * (h - 15));
  W[3][30] = BASE * 0.2;
  W[3][31] = BASE * 0.3;
  b[3] = -0.4;

  // adaptability ← hidden2 20–24 + shared
  for (let h = 20; h < 25; h++) W[4][h] = BASE * (1.3 + 0.05 * (h - 20));
  W[4][30] = BASE * 0.3;
  W[4][31] = BASE * 0.3;
  b[4] = -0.2;

  // evolutionaryPotential ← hidden2 25–29 + shared
  for (let h = 25; h < 30; h++) W[5][h] = BASE * (1.2 + 0.1 * (h - 25));
  W[5][30] = BASE * 0.35;
  W[5][31] = BASE * 0.35;
  b[5] = -0.4;

  return { W, b };
}

// ── Outcome mapping ──────────────────────────────────────────────────────────

/**
 * Recognised outcome types and their default target fitness vectors.
 * Each vector has six values corresponding to the fitness dimensions.
 * @type {Object<string, Float64Array>}
 */
const OUTCOME_TARGETS = Object.freeze({
  thrived:   new Float64Array([0.9, 0.7, 0.8, 0.8, 0.85, 0.9]),
  survived:  new Float64Array([0.7, 0.5, 0.5, 0.5, 0.6,  0.7]),
  died:      new Float64Array([0.2, 0.3, 0.3, 0.3, 0.3,  0.2]),
  died_combat:    new Float64Array([0.3, 0.1, 0.3, 0.3, 0.3,  0.2]),
  died_environment: new Float64Array([0.1, 0.3, 0.3, 0.2, 0.2, 0.2]),
  died_old_age:   new Float64Array([0.8, 0.5, 0.6, 0.5, 0.7,  0.6]),
});

// ── Population shift detection ───────────────────────────────────────────────

/** Minimum genomes required before population shift detection triggers. */
const POP_SHIFT_MIN_SAMPLES = 10;
/** Absolute change in mean fitness that constitutes a "significant" shift. */
const POP_SHIFT_THRESHOLD = 0.05;

// ─────────────────────────────────────────────────────────────────────────────
// GeneticFitnessEvaluator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GeneticFitnessEvaluator — multi-layer perceptron for genome fitness scoring.
 *
 * Implements the engine system contract (`init`, `tick`, `destroy`) and exposes
 * public methods for single-genome evaluation, population analysis, crossover
 * pair selection, offspring prediction, and evolutionary pressure detection.
 *
 * The neural network performs real matrix math with full forward pass and
 * backpropagation through three weight layers using SGD with momentum.
 */
export class GeneticFitnessEvaluator {
  constructor() {
    /** @private */ this._engine = null;

    // ── Network parameters ──
    /** @private */ this._W1 = null; // Float64Array[64][256]
    /** @private */ this._b1 = null; // Float64Array[64]
    /** @private */ this._W2 = null; // Float64Array[32][64]
    /** @private */ this._b2 = null; // Float64Array[32]
    /** @private */ this._W3 = null; // Float64Array[6][32]
    /** @private */ this._b3 = null; // Float64Array[6]

    // ── Momentum velocity buffers (same shape as weight matrices) ──
    /** @private */ this._vW1 = null;
    /** @private */ this._vb1 = null;
    /** @private */ this._vW2 = null;
    /** @private */ this._vb2 = null;
    /** @private */ this._vW3 = null;
    /** @private */ this._vb3 = null;

    // ── Population tracking ──
    /** @private @type {Float64Array|null} */
    this._lastPopulationMeanFitness = null;
    /** @private */ this._evaluationCount = 0;

    // ── Bound event handlers (for clean removal in destroy) ──
    /** @private */ this._onNpcDied = null;
    /** @private */ this._onNpcSpawned = null;
  }

  // ── Engine system lifecycle ────────────────────────────────────────────────

  /**
   * Initialise the evaluator: build the MLP, wire up event listeners.
   * @param {import('../core/GameEngine.js').GameEngine} engine
   */
  async init(engine) {
    this._engine = engine;

    // Build network with domain-knowledge weights
    this._initNetwork();

    // Bind event handlers
    this._onNpcDied = (data) => this._handleNpcDied(data);
    this._onNpcSpawned = (data) => this._handleNpcSpawned(data);

    engine.events.on('npc:died', this._onNpcDied);
    engine.events.on('npc:spawned', this._onNpcSpawned);

    console.log('[GeneticFitnessEvaluator] Initialised.');
  }

  /**
   * Per-tick update.  The evaluator is primarily event-driven so this is a
   * no-op reserved for future batch processing or decay logic.
   * @param {number} _deltaMs  Milliseconds since last tick.
   */
  tick(_deltaMs) {
    // Intentionally empty — evaluation is event-driven.
  }

  /**
   * Tear down: remove event listeners and release buffers.
   */
  async destroy() {
    if (this._engine) {
      this._engine.events.off('npc:died', this._onNpcDied);
      this._engine.events.off('npc:spawned', this._onNpcSpawned);
    }
    this._W1 = null;
    this._b1 = null;
    this._W2 = null;
    this._b2 = null;
    this._W3 = null;
    this._b3 = null;
    this._vW1 = null;
    this._vb1 = null;
    this._vW2 = null;
    this._vb2 = null;
    this._vW3 = null;
    this._vb3 = null;
    this._engine = null;
    console.log('[GeneticFitnessEvaluator] Destroyed.');
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Evaluate a single genome and return fitness scores across all dimensions.
   *
   * Runs a full forward pass through the MLP and returns a normalised
   * fitness object.  Also emits `genetics:fitness_evaluated`.
   *
   * @param {Uint8Array} genome  256-byte genome to evaluate.
   * @returns {FitnessScore}
   */
  evaluate(genome) {
    if (!genome || genome.length !== GENOME_LENGTH) {
      throw new RangeError(
        `[GeneticFitnessEvaluator] Genome must be a Uint8Array of length ${GENOME_LENGTH}.`
      );
    }

    const output = this._forward(genome);

    const score = {
      survivalFitness:      output[FITNESS_DIMS.SURVIVAL],
      combatFitness:        output[FITNESS_DIMS.COMBAT],
      socialFitness:        output[FITNESS_DIMS.SOCIAL],
      explorationFitness:   output[FITNESS_DIMS.EXPLORATION],
      adaptability:         output[FITNESS_DIMS.ADAPTABILITY],
      evolutionaryPotential: output[FITNESS_DIMS.EVOLUTIONARY],
      overall: 0,
    };

    // Overall is a weighted combination
    score.overall =
      score.survivalFitness      * 0.20 +
      score.combatFitness        * 0.15 +
      score.socialFitness        * 0.15 +
      score.explorationFitness   * 0.15 +
      score.adaptability         * 0.20 +
      score.evolutionaryPotential * 0.15;

    this._evaluationCount++;

    if (this._engine) {
      this._engine.events.emit('genetics:fitness_evaluated', {
        genome,
        score,
        timestamp: Date.now(),
      });
    }

    return score;
  }

  /**
   * Record an observed outcome for a genome and train the network.
   *
   * Uses a single step of SGD with momentum to nudge the network weights
   * towards predicting the given outcome.  Accepted outcome types:
   *   `'thrived'`, `'survived'`, `'died'`, `'died_combat'`,
   *   `'died_environment'`, `'died_old_age'`.
   *
   * Alternatively, a custom 6-element target vector (Float64Array) can
   * be passed directly via `outcome.target`.
   *
   * @param {Uint8Array} genome   The 256-byte genome.
   * @param {object}     outcome
   * @param {string}     [outcome.type]    One of the recognised outcome types.
   * @param {Float64Array} [outcome.target] Custom 6-dim target vector (overrides type).
   */
  recordOutcome(genome, outcome) {
    if (!genome || genome.length !== GENOME_LENGTH) {
      throw new RangeError(
        `[GeneticFitnessEvaluator] Genome must be a Uint8Array of length ${GENOME_LENGTH}.`
      );
    }

    let target;
    if (outcome.target && outcome.target.length === OUTPUT_SIZE) {
      target = outcome.target;
    } else if (outcome.type && OUTCOME_TARGETS[outcome.type]) {
      target = OUTCOME_TARGETS[outcome.type];
    } else {
      throw new Error(
        `[GeneticFitnessEvaluator] Unknown outcome type "${outcome.type}". ` +
        `Provide a valid type or a custom target vector.`
      );
    }

    this._backprop(genome, target);
  }

  /**
   * Analyse a population of genomes and return aggregate fitness statistics.
   *
   * @param {Uint8Array[]} genomes  Array of 256-byte genomes.
   * @returns {PopulationAnalysis}
   */
  analyzePopulation(genomes) {
    if (!genomes || genomes.length === 0) {
      return {
        count: 0,
        mean: _emptyScore(),
        min: _emptyScore(),
        max: _emptyScore(),
        stdDev: _emptyScore(),
      };
    }

    const fields = /** @type {(keyof FitnessScore)[]} */ ([
      'survivalFitness', 'combatFitness', 'socialFitness',
      'explorationFitness', 'adaptability', 'evolutionaryPotential', 'overall',
    ]);

    const scores = genomes.map((g) => this.evaluate(g));

    const mean = /** @type {FitnessScore} */ ({});
    const min  = /** @type {FitnessScore} */ ({});
    const max  = /** @type {FitnessScore} */ ({});
    const stdDev = /** @type {FitnessScore} */ ({});

    for (const f of fields) {
      const vals = scores.map((s) => s[f]);
      const sum  = vals.reduce((a, v) => a + v, 0);
      const m    = sum / vals.length;
      mean[f] = m;
      min[f]  = Math.min(...vals);
      max[f]  = Math.max(...vals);
      const variance = vals.reduce((a, v) => a + (v - m) ** 2, 0) / vals.length;
      stdDev[f] = Math.sqrt(variance);
    }

    // Check for population shift
    this._checkPopulationShift(mean);

    return { count: genomes.length, mean, min, max, stdDev };
  }

  /**
   * Find the optimal crossover pair from a set of genomes that is likely to
   * produce the fittest and most genetically diverse offspring.
   *
   * Strategy: score every pair on (parent fitness sum + genetic distance) and
   * return the pair with the highest combined score.  For large populations
   * (>200), a random subsample is used to keep runtime tractable.
   *
   * @param {Uint8Array[]} genomes  Array of candidate parent genomes.
   * @returns {{ parentA: Uint8Array, parentB: Uint8Array, expectedFitness: number, geneticDistance: number }}
   */
  findOptimalCrossoverPair(genomes) {
    if (!genomes || genomes.length < 2) {
      throw new Error(
        '[GeneticFitnessEvaluator] Need at least 2 genomes to find a crossover pair.'
      );
    }

    // Subsample for large populations
    let pool = genomes;
    const MAX_POOL = 200;
    if (pool.length > MAX_POOL) {
      pool = _subsample(pool, MAX_POOL);
    }

    // Pre-compute fitness scores for all candidates
    const fitnessCache = pool.map((g) => this.evaluate(g));

    let bestScore = -Infinity;
    let bestA = 0;
    let bestB = 1;
    let bestDist = 0;

    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const fitSum = fitnessCache[i].overall + fitnessCache[j].overall;
        const dist = _geneticDistance(pool[i], pool[j]);

        // Combined score: 60% fitness, 40% diversity
        const combined = fitSum * 0.6 + dist * 0.4;
        if (combined > bestScore) {
          bestScore = combined;
          bestA = i;
          bestB = j;
          bestDist = dist;
        }
      }
    }

    return {
      parentA: pool[bestA],
      parentB: pool[bestB],
      expectedFitness: (fitnessCache[bestA].overall + fitnessCache[bestB].overall) / 2,
      geneticDistance: bestDist,
    };
  }

  /**
   * Predict the fitness of a hypothetical offspring from two parent genomes.
   *
   * Simulates crossover by averaging both parents' normalised byte values and
   * running the averaged "expected child genome" through the MLP.
   *
   * @param {Uint8Array} parentA  First parent genome.
   * @param {Uint8Array} parentB  Second parent genome.
   * @returns {FitnessScore}
   */
  predictOffspringFitness(parentA, parentB) {
    if (!parentA || parentA.length !== GENOME_LENGTH ||
        !parentB || parentB.length !== GENOME_LENGTH) {
      throw new RangeError(
        `[GeneticFitnessEvaluator] Both parents must be Uint8Arrays of length ${GENOME_LENGTH}.`
      );
    }

    // Build an expected child genome (midpoint of both parents)
    const expectedChild = new Uint8Array(GENOME_LENGTH);
    for (let i = 0; i < GENOME_LENGTH; i++) {
      expectedChild[i] = Math.round((parentA[i] + parentB[i]) / 2);
    }

    return this.evaluate(expectedChild);
  }

  /**
   * Identify evolutionary pressures acting on a population.
   *
   * Compares trait-level statistics to detect which genes are trending high
   * (selected for) or low (selected against) relative to a uniform baseline.
   *
   * @param {Uint8Array[]} genomes  Population of genomes.
   * @returns {EvolutionaryPressure}
   */
  getEvolutionaryPressure(genomes) {
    if (!genomes || genomes.length === 0) {
      return { selectedFor: [], selectedAgainst: [], neutralDrift: [], populationSize: 0 };
    }

    // Compute mean and standard deviation for every gene locus
    const means = new Float64Array(GENOME_LENGTH);
    const sds   = new Float64Array(GENOME_LENGTH);

    for (let j = 0; j < GENOME_LENGTH; j++) {
      let sum = 0;
      for (const g of genomes) sum += g[j];
      means[j] = sum / genomes.length;
    }

    for (let j = 0; j < GENOME_LENGTH; j++) {
      let ssq = 0;
      for (const g of genomes) ssq += (g[j] - means[j]) ** 2;
      sds[j] = Math.sqrt(ssq / genomes.length);
    }

    // Uniform baseline: mean = 127.5, sd ≈ 73.6 for U(0,255)
    const UNIFORM_MEAN = 127.5;
    const THRESHOLD = 25; // deviation from uniform mean to flag

    const selectedFor     = [];
    const selectedAgainst = [];
    const neutralDrift    = [];

    const geneLabels = _buildGeneLabels();

    for (let j = 0; j < GENOME_LENGTH; j++) {
      const deviation = means[j] - UNIFORM_MEAN;
      const entry = {
        locus: j,
        label: geneLabels[j] || `gene_${j}`,
        populationMean: Math.round(means[j] * 100) / 100,
        populationStdDev: Math.round(sds[j] * 100) / 100,
        deviationFromBaseline: Math.round(deviation * 100) / 100,
      };

      if (deviation > THRESHOLD) {
        selectedFor.push(entry);
      } else if (deviation < -THRESHOLD) {
        selectedAgainst.push(entry);
      } else if (sds[j] < 30) {
        // Low variance + near baseline → converging (neutral drift / fixation)
        neutralDrift.push(entry);
      }
    }

    // Sort by magnitude of deviation
    selectedFor.sort((a, b) => b.deviationFromBaseline - a.deviationFromBaseline);
    selectedAgainst.sort((a, b) => a.deviationFromBaseline - b.deviationFromBaseline);

    return {
      selectedFor,
      selectedAgainst,
      neutralDrift,
      populationSize: genomes.length,
    };
  }

  /**
   * Return the total number of evaluations performed since initialisation.
   * @returns {number}
   */
  getEvaluationCount() {
    return this._evaluationCount;
  }

  /**
   * Export the current network weights for serialisation / checkpointing.
   * @returns {NetworkSnapshot}
   */
  exportWeights() {
    return {
      W1: this._W1.map((r) => Array.from(r)),
      b1: Array.from(this._b1),
      W2: this._W2.map((r) => Array.from(r)),
      b2: Array.from(this._b2),
      W3: this._W3.map((r) => Array.from(r)),
      b3: Array.from(this._b3),
    };
  }

  /**
   * Import previously exported network weights (e.g. from a checkpoint).
   * @param {NetworkSnapshot} snapshot
   */
  importWeights(snapshot) {
    this._W1 = snapshot.W1.map((r) => Float64Array.from(r));
    this._b1 = Float64Array.from(snapshot.b1);
    this._W2 = snapshot.W2.map((r) => Float64Array.from(r));
    this._b2 = Float64Array.from(snapshot.b2);
    this._W3 = snapshot.W3.map((r) => Float64Array.from(r));
    this._b3 = Float64Array.from(snapshot.b3);

    // Reset momentum buffers
    this._initMomentum();
  }

  // ── Private: Network initialisation ────────────────────────────────────────

  /**
   * Build the MLP with domain-knowledge initial weights.
   * @private
   */
  _initNetwork() {
    const l1 = initLayer1Weights();
    this._W1 = l1.W;
    this._b1 = l1.b;

    const l2 = initLayer2Weights();
    this._W2 = l2.W;
    this._b2 = l2.b;

    const l3 = initOutputWeights();
    this._W3 = l3.W;
    this._b3 = l3.b;

    this._initMomentum();
  }

  /**
   * Zero-initialise momentum velocity buffers for all layers.
   * @private
   */
  _initMomentum() {
    this._vW1 = zeroMatrix(HIDDEN1_SIZE, INPUT_SIZE);
    this._vb1 = zeroVector(HIDDEN1_SIZE);
    this._vW2 = zeroMatrix(HIDDEN2_SIZE, HIDDEN1_SIZE);
    this._vb2 = zeroVector(HIDDEN2_SIZE);
    this._vW3 = zeroMatrix(OUTPUT_SIZE, HIDDEN2_SIZE);
    this._vb3 = zeroVector(OUTPUT_SIZE);
  }

  // ── Private: Forward pass ──────────────────────────────────────────────────

  /**
   * Run a full forward pass through the MLP.
   *
   * @private
   * @param {Uint8Array} genome  Raw 256-byte genome.
   * @returns {Float64Array}     6-element output vector (sigmoid-activated).
   */
  _forward(genome) {
    const { a1, a2, a3 } = this._forwardFull(genome);
    return a3;
  }

  /**
   * Full forward pass returning all intermediate activations (needed for backprop).
   *
   * @private
   * @param {Uint8Array} genome
   * @returns {{ x: Float64Array, z1: Float64Array, a1: Float64Array, z2: Float64Array, a2: Float64Array, z3: Float64Array, a3: Float64Array }}
   */
  _forwardFull(genome) {
    // Normalise genome bytes to [0, 1]
    const x = new Float64Array(INPUT_SIZE);
    for (let i = 0; i < INPUT_SIZE; i++) x[i] = genome[i] / 255;

    // Layer 1: z1 = W1·x + b1,  a1 = ReLU(z1)
    const z1 = new Float64Array(HIDDEN1_SIZE);
    matVecMul(this._W1, x, z1);
    vecAddInPlace(z1, this._b1);
    const a1 = new Float64Array(z1);
    reluInPlace(a1);

    // Layer 2: z2 = W2·a1 + b2,  a2 = ReLU(z2)
    const z2 = new Float64Array(HIDDEN2_SIZE);
    matVecMul(this._W2, a1, z2);
    vecAddInPlace(z2, this._b2);
    const a2 = new Float64Array(z2);
    reluInPlace(a2);

    // Output layer: z3 = W3·a2 + b3,  a3 = sigmoid(z3)
    const z3 = new Float64Array(OUTPUT_SIZE);
    matVecMul(this._W3, a2, z3);
    vecAddInPlace(z3, this._b3);
    const a3 = new Float64Array(z3);
    sigmoidInPlace(a3);

    return { x, z1, a1, z2, a2, z3, a3 };
  }

  // ── Private: Backpropagation ───────────────────────────────────────────────

  /**
   * Run one step of backpropagation with SGD + momentum.
   *
   * Loss function: mean squared error (MSE) per output neuron.
   *
   * @private
   * @param {Uint8Array}   genome  Input genome.
   * @param {Float64Array} target  6-element target vector.
   */
  _backprop(genome, target) {
    // ── Forward pass (keep intermediates) ──
    const { x, z1, a1, z2, a2, z3, a3 } = this._forwardFull(genome);

    // ── Output layer gradients ──
    // dL/dz3 = (a3 - target) * sigmoid'(z3)   (element-wise)
    // For MSE loss and sigmoid output: dL/da3 = (a3 - target),
    // dL/dz3 = dL/da3 * σ'(z3) = (a3 - target) * a3 * (1 - a3)
    const dz3 = new Float64Array(OUTPUT_SIZE);
    for (let i = 0; i < OUTPUT_SIZE; i++) {
      dz3[i] = (a3[i] - target[i]) * sigmoidDeriv(a3[i]);
    }

    // Gradients for W3 and b3
    // dW3[i][j] = dz3[i] * a2[j]
    // db3[i]    = dz3[i]
    const dW3 = zeroMatrix(OUTPUT_SIZE, HIDDEN2_SIZE);
    const db3 = new Float64Array(OUTPUT_SIZE);
    for (let i = 0; i < OUTPUT_SIZE; i++) {
      for (let j = 0; j < HIDDEN2_SIZE; j++) {
        dW3[i][j] = dz3[i] * a2[j];
      }
      db3[i] = dz3[i];
    }

    // ── Hidden layer 2 gradients ──
    // da2 = W3^T · dz3
    const da2 = new Float64Array(HIDDEN2_SIZE);
    for (let j = 0; j < HIDDEN2_SIZE; j++) {
      let sum = 0;
      for (let i = 0; i < OUTPUT_SIZE; i++) sum += this._W3[i][j] * dz3[i];
      da2[j] = sum;
    }
    // dz2 = da2 * ReLU'(z2)
    const dz2 = new Float64Array(HIDDEN2_SIZE);
    for (let j = 0; j < HIDDEN2_SIZE; j++) {
      dz2[j] = da2[j] * reluDeriv(z2[j]);
    }

    const dW2 = zeroMatrix(HIDDEN2_SIZE, HIDDEN1_SIZE);
    const db2 = new Float64Array(HIDDEN2_SIZE);
    for (let i = 0; i < HIDDEN2_SIZE; i++) {
      for (let j = 0; j < HIDDEN1_SIZE; j++) {
        dW2[i][j] = dz2[i] * a1[j];
      }
      db2[i] = dz2[i];
    }

    // ── Hidden layer 1 gradients ──
    // da1 = W2^T · dz2
    const da1 = new Float64Array(HIDDEN1_SIZE);
    for (let j = 0; j < HIDDEN1_SIZE; j++) {
      let sum = 0;
      for (let i = 0; i < HIDDEN2_SIZE; i++) sum += this._W2[i][j] * dz2[i];
      da1[j] = sum;
    }
    // dz1 = da1 * ReLU'(z1)
    const dz1 = new Float64Array(HIDDEN1_SIZE);
    for (let j = 0; j < HIDDEN1_SIZE; j++) {
      dz1[j] = da1[j] * reluDeriv(z1[j]);
    }

    const dW1 = zeroMatrix(HIDDEN1_SIZE, INPUT_SIZE);
    const db1 = new Float64Array(HIDDEN1_SIZE);
    for (let i = 0; i < HIDDEN1_SIZE; i++) {
      for (let j = 0; j < INPUT_SIZE; j++) {
        dW1[i][j] = dz1[i] * x[j];
      }
      db1[i] = dz1[i];
    }

    // ── SGD with momentum weight update ──
    this._applyMomentumUpdate(this._W1, this._vW1, dW1);
    this._applyMomentumUpdateVec(this._b1, this._vb1, db1);
    this._applyMomentumUpdate(this._W2, this._vW2, dW2);
    this._applyMomentumUpdateVec(this._b2, this._vb2, db2);
    this._applyMomentumUpdate(this._W3, this._vW3, dW3);
    this._applyMomentumUpdateVec(this._b3, this._vb3, db3);
  }

  /**
   * Apply SGD + momentum update to a weight matrix.
   *
   * v = momentum * v - lr * grad
   * W = W + v
   *
   * @private
   * @param {Float64Array[]} W     Weight matrix.
   * @param {Float64Array[]} V     Velocity matrix (same shape).
   * @param {Float64Array[]} dW    Gradient matrix.
   */
  _applyMomentumUpdate(W, V, dW) {
    for (let i = 0; i < W.length; i++) {
      const wi = W[i];
      const vi = V[i];
      const gi = dW[i];
      for (let j = 0; j < wi.length; j++) {
        vi[j] = MOMENTUM * vi[j] - LEARNING_RATE * gi[j];
        wi[j] += vi[j];
      }
    }
  }

  /**
   * Apply SGD + momentum update to a bias vector.
   * @private
   * @param {Float64Array} b   Bias vector.
   * @param {Float64Array} vb  Velocity vector.
   * @param {Float64Array} db  Gradient vector.
   */
  _applyMomentumUpdateVec(b, vb, db) {
    for (let i = 0; i < b.length; i++) {
      vb[i] = MOMENTUM * vb[i] - LEARNING_RATE * db[i];
      b[i] += vb[i];
    }
  }

  // ── Private: Event handlers ────────────────────────────────────────────────

  /**
   * Handle `npc:died` — learn from death outcomes.
   * @private
   * @param {{ npcId: string, cause: string }} data
   */
  _handleNpcDied(data) {
    const npcSystem = this._engine.getSystem('npc');
    if (!npcSystem) return;

    const npc = npcSystem.getNPC(data.npcId);
    if (!npc || !npc.genome) return;

    // Map cause of death to an outcome type
    let outcomeType = 'died';
    if (data.cause === 'old_age') {
      outcomeType = 'died_old_age';
    } else if (data.cause === 'combat' || data.cause === 'raid' || data.cause === 'attack') {
      outcomeType = 'died_combat';
    } else if (
      data.cause === 'radiation' || data.cause === 'vacuum' ||
      data.cause === 'toxin' || data.cause === 'disease'
    ) {
      outcomeType = 'died_environment';
    }

    this.recordOutcome(npc.genome, { type: outcomeType });
  }

  /**
   * Handle `npc:spawned` — evaluate newly spawned genomes.
   * @private
   * @param {{ npcId: string }} data
   */
  _handleNpcSpawned(data) {
    const npcSystem = this._engine.getSystem('npc');
    if (!npcSystem) return;

    const npc = npcSystem.getNPC(data.npcId);
    if (!npc || !npc.genome) return;

    this.evaluate(npc.genome);
  }

  // ── Private: Population shift detection ────────────────────────────────────

  /**
   * Check if the population's mean fitness has shifted significantly and
   * emit `genetics:population_shift` if so.
   *
   * @private
   * @param {FitnessScore} currentMean
   */
  _checkPopulationShift(currentMean) {
    if (!this._engine) return;

    const fields = [
      'survivalFitness', 'combatFitness', 'socialFitness',
      'explorationFitness', 'adaptability', 'evolutionaryPotential',
    ];

    if (this._lastPopulationMeanFitness) {
      let maxDelta = 0;
      const deltas = {};
      for (let i = 0; i < fields.length; i++) {
        const delta = currentMean[fields[i]] - this._lastPopulationMeanFitness[i];
        deltas[fields[i]] = Math.round(delta * 10000) / 10000;
        if (Math.abs(delta) > maxDelta) maxDelta = Math.abs(delta);
      }

      if (maxDelta >= POP_SHIFT_THRESHOLD) {
        this._engine.events.emit('genetics:population_shift', {
          deltas,
          currentMean: { ...currentMean },
          timestamp: Date.now(),
        });
      }
    }

    // Store current mean for next comparison
    this._lastPopulationMeanFitness = new Float64Array(fields.length);
    for (let i = 0; i < fields.length; i++) {
      this._lastPopulationMeanFitness[i] = currentMean[fields[i]];
    }
  }
}

// ── Private utility functions ────────────────────────────────────────────────

/**
 * Compute normalised genetic distance between two genomes.
 * Uses Manhattan distance normalised to [0, 1].
 *
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {number}
 */
function _geneticDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < GENOME_LENGTH; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  // Max possible Manhattan distance: 255 * 256
  return sum / (255 * GENOME_LENGTH);
}

/**
 * Create an empty fitness score object with all values at 0.
 * @returns {FitnessScore}
 */
function _emptyScore() {
  return {
    survivalFitness: 0,
    combatFitness: 0,
    socialFitness: 0,
    explorationFitness: 0,
    adaptability: 0,
    evolutionaryPotential: 0,
    overall: 0,
  };
}

/**
 * Random subsample without replacement using Fisher-Yates partial shuffle.
 * @param {Uint8Array[]} arr
 * @param {number} n
 * @returns {Uint8Array[]}
 */
function _subsample(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > copy.length - 1 - n && i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(copy.length - n);
}

/**
 * Build a lookup table mapping genome byte indices to human-readable labels.
 * @returns {Object<number, string>}
 */
function _buildGeneLabels() {
  const labels = {};

  // Physical genes
  for (const [name, idx] of Object.entries(PHYSICAL_GENES)) {
    labels[idx] = `physical:${name.toLowerCase()}`;
  }

  // Aptitude genes
  for (const [name, idx] of Object.entries(APTITUDE_GENES)) {
    labels[idx] = `aptitude:${name.toLowerCase()}`;
  }

  // Personality genes
  for (const [name, idx] of Object.entries(PERSONALITY_GENES)) {
    labels[idx] = `personality:${name.toLowerCase()}`;
  }

  // Resistance genes
  for (const [name, idx] of Object.entries(RESISTANCE_GENES)) {
    labels[idx] = `resistance:${name.toLowerCase()}`;
  }

  // Cluster labels for unlabelled bytes
  for (let i = GENE_CLUSTER.PHYSICAL[0]; i < GENE_CLUSTER.PHYSICAL[1]; i++) {
    if (!labels[i]) labels[i] = `physical:gene_${i}`;
  }
  for (let i = GENE_CLUSTER.APTITUDE[0]; i < GENE_CLUSTER.APTITUDE[1]; i++) {
    if (!labels[i]) labels[i] = `aptitude:gene_${i}`;
  }
  for (let i = GENE_CLUSTER.PERSONALITY[0]; i < GENE_CLUSTER.PERSONALITY[1]; i++) {
    if (!labels[i]) labels[i] = `personality:gene_${i}`;
  }
  for (let i = GENE_CLUSTER.RESISTANCE[0]; i < GENE_CLUSTER.RESISTANCE[1]; i++) {
    if (!labels[i]) labels[i] = `resistance:gene_${i}`;
  }
  for (let i = GENE_CLUSTER.APPEARANCE[0]; i < GENE_CLUSTER.APPEARANCE[1]; i++) {
    if (!labels[i]) labels[i] = `appearance:gene_${i}`;
  }

  return labels;
}

// ── JSDoc Type Definitions ───────────────────────────────────────────────────

/**
 * @typedef {object} FitnessScore
 * @property {number} survivalFitness       Survival in harsh environments (0–1).
 * @property {number} combatFitness         Combat effectiveness (0–1).
 * @property {number} socialFitness         Social influence potential (0–1).
 * @property {number} explorationFitness    Discovery potential (0–1).
 * @property {number} adaptability          Well-roundedness score (0–1).
 * @property {number} evolutionaryPotential Offspring fitness likelihood (0–1).
 * @property {number} overall               Weighted aggregate score (0–1).
 */

/**
 * @typedef {object} PopulationAnalysis
 * @property {number}       count   Number of genomes analysed.
 * @property {FitnessScore} mean    Mean fitness across population.
 * @property {FitnessScore} min     Minimum fitness per dimension.
 * @property {FitnessScore} max     Maximum fitness per dimension.
 * @property {FitnessScore} stdDev  Standard deviation per dimension.
 */

/**
 * @typedef {object} EvolutionaryPressure
 * @property {PressureEntry[]} selectedFor      Genes trending above baseline.
 * @property {PressureEntry[]} selectedAgainst  Genes trending below baseline.
 * @property {PressureEntry[]} neutralDrift     Genes converging near baseline.
 * @property {number}          populationSize   Number of genomes analysed.
 */

/**
 * @typedef {object} PressureEntry
 * @property {number} locus                 Genome byte index.
 * @property {string} label                 Human-readable gene label.
 * @property {number} populationMean        Mean value across population (0–255).
 * @property {number} populationStdDev      Standard deviation across population.
 * @property {number} deviationFromBaseline Deviation from uniform mean (127.5).
 */

/**
 * @typedef {object} NetworkSnapshot
 * @property {number[][]} W1  Layer 1 weight matrix (64×256).
 * @property {number[]}   b1  Layer 1 bias vector (64).
 * @property {number[][]} W2  Layer 2 weight matrix (32×64).
 * @property {number[]}   b2  Layer 2 bias vector (32).
 * @property {number[][]} W3  Output weight matrix (6×32).
 * @property {number[]}   b3  Output bias vector (6).
 */
