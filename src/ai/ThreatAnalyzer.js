/**
 * ThreatAnalyzer — Real-time multi-factor threat analysis with Bayesian-style
 * probability updates for Old Eden.
 *
 * Provides comprehensive intelligence about entities, sectors, and factions,
 * enabling NPCs and game systems to make informed decisions about combat,
 * navigation, and diplomacy.
 *
 * Core subsystems:
 *
 *   1. **Multi-Factor Threat Assessment** — scores entities across six
 *      dimensions (combat, economic, political, territorial, stealth,
 *      reputation) and produces a composite ThreatReport.
 *
 *   2. **Bayesian Probability Updates** — maintains Beta-distribution
 *      conjugate priors for each entity's hostility probability and updates
 *      posteriors as new evidence arrives (observed actions, combat outcomes,
 *      economic events).
 *
 *   3. **Sector Threat Map** — aggregates per-entity assessments, recent
 *      combat, radiation levels, pirate activity, and faction conflicts into
 *      a real-time heat map of sector-level threat.
 *
 *   4. **Early Warning System** — detects escalation patterns such as
 *      increasing troop/fleet movements and predicts likely attack targets
 *      based on historical patterns.
 *
 *   5. **Alliance / Faction Threat Analysis** — tracks faction relationships
 *      and alliances, assesses collective threat of allied factions, and
 *      identifies power imbalances that could trigger wars.
 *
 *   6. **NPC Decision Support** — recommends fight/flee/hide/trade actions
 *      for NPCs based on local threats, computes safest routes across
 *      sectors, and returns nearby threats sorted by severity.
 *
 * Integration:
 *   - Listens: `combat:started`, `combat:ended`, `npc:action`,
 *              `world:event_started`, `player:action`
 *   - Emits:   `threat:level_changed`, `threat:warning`,
 *              `threat:escalation`
 *
 * All mathematics (Beta PDF, posterior updates, BFS pathfinding) are
 * implemented from scratch using only standard Node.js APIs — no external
 * dependencies.
 *
 * @module ThreatAnalyzer
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Default alpha parameter for the Beta prior (pseudo-count of hostile observations). */
const DEFAULT_ALPHA = 1;

/** Default beta parameter for the Beta prior (pseudo-count of peaceful observations). */
const DEFAULT_BETA = 1;

/** Milliseconds before a threat assessment is considered stale and begins to decay. */
const STALE_THRESHOLD_MS = 120_000; // 2 minutes

/** Per-tick multiplicative decay applied to stale threat scores. */
const DECAY_FACTOR = 0.995;

/** Minimum number of observations before Bayesian estimates are trusted over priors. */
const MIN_OBSERVATIONS = 3;

/** How many recent events to keep per entity for pattern analysis. */
const MAX_EVENT_HISTORY = 200;

/** Sector heat-map recomputation interval in milliseconds. */
const HEATMAP_UPDATE_INTERVAL_MS = 5_000;

/** Threshold above which a sector threat level triggers a warning. */
const SECTOR_WARNING_THRESHOLD = 0.6;

/** Threshold above which an entity threat escalation emits an event. */
const ESCALATION_THRESHOLD = 0.25;

/** Maximum number of early warnings retained. */
const MAX_WARNINGS = 100;

/** Weights for each threat dimension in the composite score. */
const DIMENSION_WEIGHTS = {
  combatThreat:     0.30,
  economicThreat:   0.10,
  politicalThreat:  0.10,
  territorialThreat: 0.20,
  stealthThreat:    0.15,
  reputationThreat: 0.15,
};

/**
 * Evidence type → Bayesian update strengths.
 * Each entry is `[alphaIncrement, betaIncrement]` where alpha represents
 * hostile evidence and beta represents peaceful evidence.
 */
const EVIDENCE_UPDATES = {
  hostile_action:    [3.0, 0.0],
  peaceful_action:   [0.0, 2.0],
  trade_offer:       [0.0, 1.5],
  combat_initiated:  [4.0, 0.0],
  fleet_movement:    [1.5, 0.5],
  resource_hoarding: [1.0, 0.5],
};

/** Reputation archetype modifiers applied to the reputationThreat dimension. */
const REPUTATION_MODIFIERS = {
  pirate:          0.9,
  bounty_hunter:   0.7,
  mercenary:       0.6,
  smuggler:        0.5,
  unknown:         0.4,
  trader:          0.2,
  peaceful_trader: 0.1,
  diplomat:        0.1,
};

// ── Helpers: Beta Distribution Math ──────────────────────────────────────────

/**
 * Compute the natural logarithm of the Gamma function using the
 * Lanczos approximation (g = 7, n = 9).
 *
 * @param {number} z  Positive real number.
 * @returns {number}  ln(Γ(z))
 */
function lnGamma(z) {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    // Reflection formula: Γ(z)Γ(1-z) = π / sin(πz)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Compute the log of the Beta function B(a, b) = Γ(a)Γ(b) / Γ(a+b).
 *
 * @param {number} a  Alpha > 0.
 * @param {number} b  Beta > 0.
 * @returns {number}  ln(B(a, b))
 */
function lnBeta(a, b) {
  return lnGamma(a) + lnGamma(b) - lnGamma(a + b);
}

/**
 * Evaluate the Beta probability density function at x.
 *
 * @param {number} x  Value in [0, 1].
 * @param {number} a  Alpha > 0.
 * @param {number} b  Beta > 0.
 * @returns {number}  PDF value.
 */
function betaPdf(x, a, b) {
  if (x <= 0 || x >= 1) return 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lnBeta(a, b));
}

/**
 * Mean of a Beta(a, b) distribution.
 *
 * @param {number} a  Alpha > 0.
 * @param {number} b  Beta > 0.
 * @returns {number}  Mean = a / (a + b).
 */
function betaMean(a, b) {
  return a / (a + b);
}

/**
 * Variance of a Beta(a, b) distribution.
 *
 * @param {number} a  Alpha > 0.
 * @param {number} b  Beta > 0.
 * @returns {number}  Variance.
 */
function betaVariance(a, b) {
  const total = a + b;
  return (a * b) / (total * total * (total + 1));
}

/**
 * Regularised incomplete beta function I_x(a, b) computed via a continued
 * fraction expansion (Lentz's algorithm).  Used to obtain CDF values for
 * the Beta distribution.
 *
 * @param {number} x  Value in [0, 1].
 * @param {number} a  Alpha > 0.
 * @param {number} b  Beta > 0.
 * @returns {number}  I_x(a, b) ∈ [0, 1].
 */
function betaIncomplete(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use symmetry relation when x > (a+1)/(a+b+2) for better convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betaIncomplete(1 - x, b, a);
  }

  const lnPre = a * Math.log(x) + b * Math.log(1 - x) - Math.log(a) - lnBeta(a, b);
  const prefix = Math.exp(lnPre);

  // Lentz's continued fraction
  const maxIter = 200;
  const eps = 1e-14;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let result = d;

  for (let m = 1; m <= maxIter; m++) {
    // Even step
    let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + numerator * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + numerator / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    result *= d * c;

    // Odd step
    numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + numerator / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const delta = d * c;
    result *= delta;

    if (Math.abs(delta - 1) < eps) break;
  }

  return prefix * result;
}

/**
 * CDF of the Beta distribution: P(X ≤ x) for X ~ Beta(a, b).
 *
 * @param {number} x  Value in [0, 1].
 * @param {number} a  Alpha > 0.
 * @param {number} b  Beta > 0.
 * @returns {number}  CDF value.
 */
function betaCdf(x, a, b) {
  return betaIncomplete(x, a, b);
}

// ── Helpers: Utilities ───────────────────────────────────────────────────────

/** Clamp a number to [0, 1]. */
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// ── Main Class ───────────────────────────────────────────────────────────────

export class ThreatAnalyzer {

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise the ThreatAnalyzer and subscribe to engine events.
   *
   * @param {object} engine  The Old Eden game engine instance.
   */
  async init(engine) {
    this._engine = engine;

    /**
     * Per-entity Bayesian belief state.
     * @type {Map<string, BetaBelief>}
     */
    this._beliefs = new Map();

    /**
     * Per-entity cached threat reports.
     * @type {Map<string, ThreatReport>}
     */
    this._reports = new Map();

    /**
     * Per-entity chronological event history (most recent last).
     * @type {Map<string, EntityEvent[]>}
     */
    this._eventHistory = new Map();

    /**
     * Sector → aggregated threat level.
     * @type {Map<string, number>}
     */
    this._sectorThreat = new Map();

    /**
     * Entity → sectorId mapping (last known location).
     * @type {Map<string, string>}
     */
    this._entitySectors = new Map();

    /**
     * Faction relationship graph.  Key = factionId, value = map of
     * targetFactionId → relationship score (−1 hostile … +1 allied).
     * @type {Map<string, Map<string, number>>}
     */
    this._factionRelations = new Map();

    /**
     * Faction → aggregate power score.
     * @type {Map<string, number>}
     */
    this._factionPower = new Map();

    /**
     * Active early warnings.
     * @type {EarlyWarning[]}
     */
    this._warnings = [];

    /**
     * Predicted entity-pair conflicts.
     * @type {PredictedConflict[]}
     */
    this._predictedConflicts = [];

    /** @type {number} */
    this._heatmapTimer = 0;

    // ── Event subscriptions ──────────────────────────────────────────────
    engine.events.on('combat:started', (data) => this._onCombatStarted(data));
    engine.events.on('combat:ended',   (data) => this._onCombatEnded(data));
    engine.events.on('npc:action',     (data) => this._onNpcAction(data));
    engine.events.on('world:event_started', (data) => this._onWorldEvent(data));
    engine.events.on('player:action',  (data) => this._onPlayerAction(data));

    console.log('[ThreatAnalyzer] Initialised.');
  }

  /**
   * Per-frame update: decay stale assessments, recompute sector heat map,
   * and check for escalation / early warnings.
   *
   * @param {number} deltaMs  Milliseconds since last tick.
   */
  tick(deltaMs) {
    const now = Date.now();

    // Decay stale threat reports
    for (const [entityId, report] of this._reports) {
      const age = now - report.timestamp;
      if (age > STALE_THRESHOLD_MS) {
        const ticks = Math.floor(age / 16); // approximate frame count
        const decayed = report.overallThreat * Math.pow(DECAY_FACTOR, ticks * (deltaMs / 16));
        if (decayed < 0.01) {
          this._reports.delete(entityId);
        } else {
          report.overallThreat = decayed;
        }
      }
    }

    // Periodic heat-map recomputation
    this._heatmapTimer -= deltaMs;
    if (this._heatmapTimer <= 0) {
      this._recomputeHeatMap();
      this._detectEscalations(now);
      this._predictConflicts();
      this._heatmapTimer = HEATMAP_UPDATE_INTERVAL_MS;
    }
  }

  /**
   * Clean up internal state.
   */
  async destroy() {
    this._beliefs.clear();
    this._reports.clear();
    this._eventHistory.clear();
    this._sectorThreat.clear();
    this._entitySectors.clear();
    this._factionRelations.clear();
    this._factionPower.clear();
    this._warnings = [];
    this._predictedConflicts = [];
  }

  // ── Public API: Threat Assessment ──────────────────────────────────────────

  /**
   * Perform a comprehensive multi-factor threat assessment for an entity.
   *
   * Returns a {@link ThreatReport} with an overall threat level in [0, 1]
   * and a per-dimension breakdown.
   *
   * @param {string} entityId  The entity to assess.
   * @param {ThreatContext} [context={}]  Optional contextual information
   *   (combat stats, wealth, faction, sector, etc.).
   * @returns {ThreatReport}
   */
  assessThreat(entityId, context = {}) {
    const belief = this._getOrCreateBelief(entityId);
    const bayesianHostility = betaMean(belief.alpha, belief.beta);

    const combat      = this._scoreCombatThreat(entityId, context, bayesianHostility);
    const economic     = this._scoreEconomicThreat(entityId, context);
    const political    = this._scorePoliticalThreat(entityId, context);
    const territorial  = this._scoreTerritorialThreat(entityId, context);
    const stealth      = this._scoreStealthThreat(entityId, context, bayesianHostility);
    const reputation   = this._scoreReputationThreat(entityId, context);

    const dimensions = {
      combatThreat:      clamp01(combat),
      economicThreat:    clamp01(economic),
      politicalThreat:   clamp01(political),
      territorialThreat: clamp01(territorial),
      stealthThreat:     clamp01(stealth),
      reputationThreat:  clamp01(reputation),
    };

    let overall = 0;
    for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
      overall += dimensions[dim] * weight;
    }
    overall = clamp01(overall);

    const previousReport = this._reports.get(entityId);
    const previousLevel = previousReport ? previousReport.overallThreat : 0;

    /** @type {ThreatReport} */
    const report = {
      entityId,
      overallThreat: overall,
      dimensions,
      bayesian: {
        alpha: belief.alpha,
        beta: belief.beta,
        mean: bayesianHostility,
        variance: betaVariance(belief.alpha, belief.beta),
        observations: belief.observations,
      },
      confidence: Math.min(1, belief.observations / (MIN_OBSERVATIONS * 3)),
      timestamp: Date.now(),
    };

    this._reports.set(entityId, report);

    // Track entity sector for heat-map
    if (context.sectorId) {
      this._entitySectors.set(entityId, context.sectorId);
    }

    // Emit level change event when the delta is significant
    if (Math.abs(overall - previousLevel) > 0.05) {
      this._engine.events.emit('threat:level_changed', {
        entityId,
        previousLevel,
        currentLevel: overall,
        dimensions,
      });
    }

    return report;
  }

  /**
   * Update the Bayesian belief (Beta posterior) for an entity given new
   * evidence.  The posterior is the conjugate update:
   *
   *   α′ = α + Δα
   *   β′ = β + Δβ
   *
   * where Δα/Δβ come from the evidence type lookup table.
   *
   * @param {string} entityId  Entity whose belief to update.
   * @param {Evidence} evidence  The observed evidence.
   */
  updateBelief(entityId, evidence) {
    const belief = this._getOrCreateBelief(entityId);
    const type = evidence.type || evidence;
    const updates = EVIDENCE_UPDATES[type];
    if (!updates) return;

    const strength = typeof evidence.strength === 'number' ? evidence.strength : 1.0;
    belief.alpha += updates[0] * strength;
    belief.beta  += updates[1] * strength;
    belief.observations += 1;
    belief.lastUpdated = Date.now();

    // Record in event history
    this._recordEvent(entityId, {
      type,
      timestamp: Date.now(),
      strength,
      sectorId: evidence.sectorId || null,
    });
  }

  // ── Public API: Sector Threat Map ──────────────────────────────────────────

  /**
   * Get the aggregated threat level for a sector.
   *
   * Combines entity threats, recent combat activity, radiation, pirate
   * activity, and faction conflicts.
   *
   * @param {string} sectorId  The sector identifier.
   * @returns {number}  Threat level in [0, 1].
   */
  getSectorThreatLevel(sectorId) {
    return this._sectorThreat.get(sectorId) || 0;
  }

  /**
   * Get the full heat map of all sectors with known threat levels.
   *
   * @returns {Map<string, number>}  SectorId → threat level [0, 1].
   */
  getHeatMap() {
    return new Map(this._sectorThreat);
  }

  // ── Public API: Early Warning System ───────────────────────────────────────

  /**
   * Get current early warnings — predicted threats with confidence values.
   *
   * @returns {EarlyWarning[]}
   */
  getEarlyWarnings() {
    return [...this._warnings];
  }

  /**
   * Get predicted entity-pair conflicts ranked by probability.
   *
   * @returns {PredictedConflict[]}
   */
  getPredictedConflicts() {
    return [...this._predictedConflicts];
  }

  // ── Public API: Faction Analysis ───────────────────────────────────────────

  /**
   * Register or update a faction relationship.
   *
   * @param {string} factionA  First faction identifier.
   * @param {string} factionB  Second faction identifier.
   * @param {number} score     Relationship score −1 (hostile) to +1 (allied).
   */
  setFactionRelation(factionA, factionB, score) {
    const clamped = Math.max(-1, Math.min(1, score));
    if (!this._factionRelations.has(factionA)) this._factionRelations.set(factionA, new Map());
    if (!this._factionRelations.has(factionB)) this._factionRelations.set(factionB, new Map());
    this._factionRelations.get(factionA).set(factionB, clamped);
    this._factionRelations.get(factionB).set(factionA, clamped);
  }

  /**
   * Update or set a faction's aggregate power score.
   *
   * @param {string} factionId  Faction identifier.
   * @param {number} power      Non-negative power value.
   */
  setFactionPower(factionId, power) {
    this._factionPower.set(factionId, Math.max(0, power));
  }

  /**
   * Assess the collective threat posed by a faction and all of its allies.
   *
   * @param {string} factionId  The faction to analyse.
   * @returns {FactionThreatReport}
   */
  assessFactionThreat(factionId) {
    const allies = this._getAllies(factionId);
    const ownPower = this._factionPower.get(factionId) || 0;
    let alliedPower = 0;
    for (const allyId of allies) {
      alliedPower += this._factionPower.get(allyId) || 0;
    }
    const totalPower = ownPower + alliedPower;

    // Compare to global average power
    let totalGlobal = 0;
    let factionCount = 0;
    for (const p of this._factionPower.values()) {
      totalGlobal += p;
      factionCount++;
    }
    const avgPower = factionCount > 0 ? totalGlobal / factionCount : 1;
    const relativePower = avgPower > 0 ? totalPower / avgPower : 0;

    return {
      factionId,
      ownPower,
      allies,
      alliedPower,
      totalPower,
      relativePower,
      threatLevel: clamp01(relativePower / 3), // normalise: 3× average → max threat
    };
  }

  /**
   * Identify power imbalances between factions that could trigger wars.
   *
   * Returns pairs where one side's collective power exceeds the other by a
   * factor of 2 or more and they have a hostile relationship.
   *
   * @returns {PowerImbalance[]}
   */
  getPowerImbalances() {
    /** @type {PowerImbalance[]} */
    const imbalances = [];

    const factions = [...this._factionRelations.keys()];
    for (let i = 0; i < factions.length; i++) {
      for (let j = i + 1; j < factions.length; j++) {
        const a = factions[i];
        const b = factions[j];
        const rel = this._factionRelations.get(a)?.get(b) ?? 0;
        if (rel >= 0) continue; // only hostile pairs

        const aReport = this.assessFactionThreat(a);
        const bReport = this.assessFactionThreat(b);
        const ratio = aReport.totalPower / Math.max(0.01, bReport.totalPower);

        if (ratio >= 2 || ratio <= 0.5) {
          imbalances.push({
            strongFaction: ratio >= 2 ? a : b,
            weakFaction:   ratio >= 2 ? b : a,
            powerRatio:    ratio >= 2 ? ratio : 1 / ratio,
            relationScore: rel,
            warRisk:       clamp01(Math.abs(rel) * Math.min(1, (ratio >= 2 ? ratio : 1 / ratio) / 4)),
          });
        }
      }
    }

    return imbalances.sort((a, b) => b.warRisk - a.warRisk);
  }

  // ── Public API: NPC Decision Support ───────────────────────────────────────

  /**
   * Recommend an action for an NPC in a given sector based on local threats.
   *
   * @param {string} npcId      The NPC entity identifier.
   * @param {string} sectorId   Current sector.
   * @returns {RecommendedAction}
   */
  getRecommendedAction(npcId, sectorId) {
    const sectorThreat = this.getSectorThreatLevel(sectorId);
    const npcReport = this._reports.get(npcId);
    const npcStrength = npcReport ? (1 - npcReport.overallThreat) : 0.5;

    // Gather local hostile entities
    const hostiles = [];
    for (const [eid, sid] of this._entitySectors) {
      if (sid !== sectorId || eid === npcId) continue;
      const r = this._reports.get(eid);
      if (r && r.overallThreat > 0.3) {
        hostiles.push({ entityId: eid, threat: r.overallThreat });
      }
    }
    hostiles.sort((a, b) => b.threat - a.threat);
    const maxHostileThreat = hostiles.length > 0 ? hostiles[0].threat : 0;

    /** @type {'fight'|'flee'|'hide'|'trade'} */
    let action;
    let confidence;

    if (sectorThreat < 0.2 && maxHostileThreat < 0.3) {
      action = 'trade';
      confidence = 0.8 + (1 - sectorThreat) * 0.2;
    } else if (npcStrength > maxHostileThreat + 0.2) {
      action = 'fight';
      confidence = clamp01(npcStrength - maxHostileThreat);
    } else if (maxHostileThreat > 0.7) {
      action = 'flee';
      confidence = clamp01(maxHostileThreat);
    } else {
      action = 'hide';
      confidence = clamp01(0.5 + (maxHostileThreat - npcStrength) * 0.5);
    }

    return {
      npcId,
      sectorId,
      action,
      confidence: clamp01(confidence),
      sectorThreat,
      nearbyHostiles: hostiles.slice(0, 5),
    };
  }

  /**
   * Compute the safest route between two sectors using BFS over a weighted
   * threat graph.  Each hop's cost is `1 + sectorThreatLevel` so that high-
   * threat sectors are avoided.
   *
   * @param {string} fromSector       Origin sector.
   * @param {string} toSector         Destination sector.
   * @param {string[][]} availableSectors  Adjacency list: `[[sectorA, sectorB], …]`
   * @returns {SafeRoute}
   */
  getSafestRoute(fromSector, toSector, availableSectors) {
    // Build adjacency map
    /** @type {Map<string, Set<string>>} */
    const adj = new Map();
    for (const [a, b] of availableSectors) {
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    }

    if (!adj.has(fromSector) || !adj.has(toSector)) {
      return { path: [], totalThreat: Infinity, found: false };
    }

    // Dijkstra's algorithm with threat as edge weight
    /** @type {Map<string, number>} */
    const dist = new Map();
    /** @type {Map<string, string|null>} */
    const prev = new Map();
    /** @type {Set<string>} */
    const visited = new Set();

    for (const s of adj.keys()) {
      dist.set(s, Infinity);
      prev.set(s, null);
    }
    dist.set(fromSector, this.getSectorThreatLevel(fromSector));

    while (true) {
      // Find unvisited node with smallest distance
      let minDist = Infinity;
      let current = null;
      for (const [s, d] of dist) {
        if (!visited.has(s) && d < minDist) {
          minDist = d;
          current = s;
        }
      }
      if (current === null || current === toSector) break;

      visited.add(current);
      const neighbors = adj.get(current);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        const threatCost = 1 + this.getSectorThreatLevel(neighbor);
        const newDist = dist.get(current) + threatCost;
        if (newDist < dist.get(neighbor)) {
          dist.set(neighbor, newDist);
          prev.set(neighbor, current);
        }
      }
    }

    // Reconstruct path
    if (dist.get(toSector) === Infinity) {
      return { path: [], totalThreat: Infinity, found: false };
    }

    const path = [];
    let node = toSector;
    while (node !== null) {
      path.unshift(node);
      node = prev.get(node);
    }

    let totalThreat = 0;
    for (const s of path) {
      totalThreat += this.getSectorThreatLevel(s);
    }

    return { path, totalThreat, found: true };
  }

  /**
   * Return threats near an entity sorted by severity (highest first).
   *
   * @param {string} entityId  The reference entity.
   * @param {number} [radius=1]  Sector-hop radius to search.
   * @returns {NearbyThreat[]}
   */
  getThreatsNearEntity(entityId, radius = 1) {
    const entitySector = this._entitySectors.get(entityId);
    if (!entitySector) return [];

    // Collect all sectors within radius hops (simple BFS on known sectors)
    const nearbySectors = new Set([entitySector]);
    let frontier = [entitySector];
    for (let hop = 0; hop < radius; hop++) {
      const nextFrontier = [];
      for (const sid of frontier) {
        // Check all entities to discover adjacent sectors
        for (const [, sector] of this._entitySectors) {
          if (!nearbySectors.has(sector)) {
            nearbySectors.add(sector);
            nextFrontier.push(sector);
          }
        }
      }
      frontier = nextFrontier;
    }

    /** @type {NearbyThreat[]} */
    const threats = [];
    for (const [eid, sector] of this._entitySectors) {
      if (eid === entityId) continue;
      if (!nearbySectors.has(sector)) continue;
      const report = this._reports.get(eid);
      if (!report || report.overallThreat < 0.05) continue;
      threats.push({
        entityId: eid,
        sectorId: sector,
        threat: report.overallThreat,
        dimensions: { ...report.dimensions },
      });
    }

    return threats.sort((a, b) => b.threat - a.threat);
  }

  // ── Public API: Bayesian Introspection ─────────────────────────────────────

  /**
   * Get the raw Beta belief state for an entity.
   *
   * @param {string} entityId
   * @returns {BetaBelief|null}
   */
  getBelief(entityId) {
    return this._beliefs.get(entityId) || null;
  }

  /**
   * Evaluate the Beta PDF for an entity's hostility distribution at a given
   * point.  Useful for visualisation / debugging.
   *
   * @param {string} entityId
   * @param {number} x  Point in [0, 1].
   * @returns {number}  PDF value.
   */
  getBeliefPdf(entityId, x) {
    const belief = this._beliefs.get(entityId);
    if (!belief) return 0;
    return betaPdf(x, belief.alpha, belief.beta);
  }

  /**
   * Evaluate the Beta CDF for an entity's hostility distribution at a given
   * point.  P(hostility ≤ x).
   *
   * @param {string} entityId
   * @param {number} x  Point in [0, 1].
   * @returns {number}  CDF value.
   */
  getBeliefCdf(entityId, x) {
    const belief = this._beliefs.get(entityId);
    if (!belief) return 0;
    return betaCdf(x, belief.alpha, belief.beta);
  }

  // ── Private: Dimensional Scoring ───────────────────────────────────────────

  /**
   * Score the combat threat dimension.
   *
   * @param {string} entityId
   * @param {ThreatContext} ctx
   * @param {number} bayesianHostility  Current Bayesian hostility mean.
   * @returns {number}  Raw score (may exceed 1 — clamped by caller).
   * @private
   */
  _scoreCombatThreat(entityId, ctx, bayesianHostility) {
    let score = 0;

    // Combat stats
    const attack  = ctx.combatStats?.attack  ?? 0;
    const defense = ctx.combatStats?.defense ?? 0;
    const hp      = ctx.combatStats?.hp      ?? 0;
    score += clamp01((attack + defense) / 200) * 0.3;
    score += clamp01(hp / 1000) * 0.1;

    // Weapon loadout (count of equipped weapons normalised)
    const weaponCount = ctx.weaponCount ?? 0;
    score += clamp01(weaponCount / 8) * 0.2;

    // Recent combat history from event log
    const history = this._eventHistory.get(entityId) || [];
    const recentCombat = history.filter(
      (e) => (e.type === 'combat_initiated' || e.type === 'hostile_action') &&
             Date.now() - e.timestamp < 300_000
    ).length;
    score += clamp01(recentCombat / 5) * 0.2;

    // Bayesian hostility factor
    score += bayesianHostility * 0.2;

    return score;
  }

  /**
   * Score the economic threat dimension.
   *
   * @param {string} entityId
   * @param {ThreatContext} ctx
   * @returns {number}
   * @private
   */
  _scoreEconomicThreat(entityId, ctx) {
    let score = 0;

    const wealth = ctx.wealth ?? 0;
    score += clamp01(wealth / 1_000_000) * 0.4;

    const marketInfluence = ctx.marketInfluence ?? 0;
    score += clamp01(marketInfluence) * 0.3;

    const resourceControl = ctx.resourceControl ?? 0;
    score += clamp01(resourceControl) * 0.3;

    return score;
  }

  /**
   * Score the political threat dimension.
   *
   * @param {string} entityId
   * @param {ThreatContext} ctx
   * @returns {number}
   * @private
   */
  _scorePoliticalThreat(entityId, ctx) {
    let score = 0;

    const factionStanding = ctx.factionStanding ?? 0;
    score += clamp01(factionStanding) * 0.4;

    const allianceCount = ctx.allianceCount ?? 0;
    score += clamp01(allianceCount / 5) * 0.3;

    const leadershipAptitude = ctx.leadershipAptitude ?? 0;
    score += clamp01(leadershipAptitude) * 0.3;

    return score;
  }

  /**
   * Score the territorial threat dimension.
   *
   * @param {string} entityId
   * @param {ThreatContext} ctx
   * @returns {number}
   * @private
   */
  _scoreTerritorialThreat(entityId, ctx) {
    let score = 0;

    // Proximity (0 = far away, 1 = same sector)
    const proximity = ctx.proximity ?? 0;
    score += clamp01(proximity) * 0.4;

    // Sector control (fraction of sectors controlled)
    const sectorControl = ctx.sectorControl ?? 0;
    score += clamp01(sectorControl) * 0.3;

    // Fleet size normalised
    const fleetSize = ctx.fleetSize ?? 0;
    score += clamp01(fleetSize / 50) * 0.3;

    return score;
  }

  /**
   * Score the stealth threat dimension.
   *
   * @param {string} entityId
   * @param {ThreatContext} ctx
   * @param {number} bayesianHostility
   * @returns {number}
   * @private
   */
  _scoreStealthThreat(entityId, ctx, bayesianHostility) {
    let score = 0;

    const stealthCapability = ctx.stealthCapability ?? 0;
    score += clamp01(stealthCapability) * 0.5;

    // Unknown intentions are more threatening — high Bayesian variance
    // means we know less about this entity.
    const belief = this._beliefs.get(entityId);
    if (belief) {
      const variance = betaVariance(belief.alpha, belief.beta);
      // High variance (max ~0.25 for Beta(1,1)) maps to higher stealth threat
      score += clamp01(variance * 4) * 0.3;
    } else {
      score += 0.3; // completely unknown → high stealth threat
    }

    // If hostile and stealthy, extra dangerous
    score += bayesianHostility * stealthCapability * 0.2;

    return score;
  }

  /**
   * Score the reputation threat dimension based on known entity archetype.
   *
   * @param {string} entityId
   * @param {ThreatContext} ctx
   * @returns {number}
   * @private
   */
  _scoreReputationThreat(entityId, ctx) {
    const archetype = ctx.reputation || 'unknown';
    const base = REPUTATION_MODIFIERS[archetype] ?? REPUTATION_MODIFIERS.unknown;

    // Temper with event history — more hostile events raise reputation threat
    const history = this._eventHistory.get(entityId) || [];
    const hostileCount = history.filter(
      (e) => e.type === 'hostile_action' || e.type === 'combat_initiated'
    ).length;
    const peacefulCount = history.filter(
      (e) => e.type === 'peaceful_action' || e.type === 'trade_offer'
    ).length;
    const total = hostileCount + peacefulCount;
    const historyMod = total > 0 ? (hostileCount - peacefulCount) / total : 0;

    return clamp01(base + historyMod * 0.3);
  }

  // ── Private: Event Handlers ────────────────────────────────────────────────

  /**
   * @param {object} data
   * @private
   */
  _onCombatStarted(data) {
    const { attackerId, defenderId, sectorId } = data;
    if (attackerId) {
      this.updateBelief(attackerId, { type: 'combat_initiated', sectorId, strength: 1.0 });
    }
    if (defenderId) {
      this.updateBelief(defenderId, { type: 'hostile_action', sectorId, strength: 0.3 });
    }
    if (sectorId) {
      this._boostSectorThreat(sectorId, 0.15);
    }
  }

  /**
   * @param {object} data
   * @private
   */
  _onCombatEnded(data) {
    const { winnerId, loserId, sectorId } = data;
    if (winnerId) {
      this.updateBelief(winnerId, { type: 'hostile_action', sectorId, strength: 0.5 });
    }
    if (loserId) {
      this.updateBelief(loserId, { type: 'peaceful_action', sectorId, strength: 0.2 });
    }
  }

  /**
   * @param {object} data
   * @private
   */
  _onNpcAction(data) {
    const { entityId, actionType, sectorId } = data;
    if (!entityId) return;

    const mapping = {
      attack:    'hostile_action',
      patrol:    'fleet_movement',
      trade:     'trade_offer',
      hoard:     'resource_hoarding',
      peaceful:  'peaceful_action',
    };
    const evidenceType = mapping[actionType] || null;
    if (evidenceType) {
      this.updateBelief(entityId, { type: evidenceType, sectorId, strength: 1.0 });
    }

    if (sectorId) {
      this._entitySectors.set(entityId, sectorId);
    }
  }

  /**
   * @param {object} data
   * @private
   */
  _onWorldEvent(data) {
    const { type, affectedSectors } = data;
    if (!affectedSectors) return;

    let boost = 0;
    if (type === 'pirate_invasion')  boost = 0.3;
    if (type === 'faction_war')      boost = 0.4;
    if (type === 'solar_flare')      boost = 0.1;
    if (type === 'pandemic')         boost = 0.05;

    if (boost > 0) {
      for (const sectorId of affectedSectors) {
        this._boostSectorThreat(sectorId, boost);
      }
    }
  }

  /**
   * @param {object} data
   * @private
   */
  _onPlayerAction(data) {
    const { playerId, actionType, sectorId } = data;
    if (!playerId) return;

    if (actionType === 'combat_win' || actionType === 'combat_loss') {
      this.updateBelief(playerId, { type: 'hostile_action', sectorId, strength: 0.5 });
    }
    if (actionType === 'discovery' || actionType === 'quest_complete') {
      this.updateBelief(playerId, { type: 'peaceful_action', sectorId, strength: 0.3 });
    }
    if (sectorId) {
      this._entitySectors.set(playerId, sectorId);
    }
  }

  // ── Private: Sector / Heat-Map ─────────────────────────────────────────────

  /**
   * Temporarily boost a sector's threat level (additive, clamped to [0, 1]).
   *
   * @param {string} sectorId
   * @param {number} amount
   * @private
   */
  _boostSectorThreat(sectorId, amount) {
    const current = this._sectorThreat.get(sectorId) || 0;
    this._sectorThreat.set(sectorId, clamp01(current + amount));
  }

  /**
   * Recompute the sector heat map from scratch based on current entity
   * locations and their cached reports.
   * @private
   */
  _recomputeHeatMap() {
    // Decay all sectors slightly
    for (const [sid, level] of this._sectorThreat) {
      const decayed = level * 0.98;
      if (decayed < 0.01) {
        this._sectorThreat.delete(sid);
      } else {
        this._sectorThreat.set(sid, decayed);
      }
    }

    // Accumulate entity threats per sector
    for (const [entityId, sectorId] of this._entitySectors) {
      const report = this._reports.get(entityId);
      if (!report) continue;
      const current = this._sectorThreat.get(sectorId) || 0;
      // Each entity contributes its threat / 5 to the sector (so ≤5 max-threat
      // entities can fill a sector to 1.0)
      this._sectorThreat.set(sectorId, clamp01(current + report.overallThreat / 5));
    }
  }

  // ── Private: Escalation Detection / Prediction ─────────────────────────────

  /**
   * Detect entities whose threat levels are escalating and emit warnings.
   *
   * @param {number} now  Current timestamp.
   * @private
   */
  _detectEscalations(now) {
    /** @type {EarlyWarning[]} */
    const newWarnings = [];

    for (const [entityId, history] of this._eventHistory) {
      if (history.length < 3) continue;

      // Look at last 60 seconds of hostile events
      const windowMs = 60_000;
      const recent = history.filter(
        (e) => now - e.timestamp < windowMs &&
               (e.type === 'hostile_action' || e.type === 'combat_initiated' || e.type === 'fleet_movement')
      );

      if (recent.length < 3) continue;

      // Compare to previous 60-second window
      const older = history.filter(
        (e) => now - e.timestamp >= windowMs && now - e.timestamp < windowMs * 2 &&
               (e.type === 'hostile_action' || e.type === 'combat_initiated' || e.type === 'fleet_movement')
      );

      if (recent.length > older.length + 1) {
        const sectorId = this._entitySectors.get(entityId) || 'unknown';
        const confidence = clamp01(recent.length / 10);

        newWarnings.push({
          entityId,
          sectorId,
          type: 'escalation',
          confidence,
          detail: `${recent.length} hostile events in last ${windowMs / 1000}s (was ${older.length})`,
          timestamp: now,
        });

        this._engine.events.emit('threat:escalation', {
          entityId,
          sectorId,
          recentEvents: recent.length,
          previousEvents: older.length,
        });
      }
    }

    // Sector-level warnings
    for (const [sectorId, level] of this._sectorThreat) {
      if (level >= SECTOR_WARNING_THRESHOLD) {
        newWarnings.push({
          entityId: null,
          sectorId,
          type: 'high_sector_threat',
          confidence: clamp01(level),
          detail: `Sector threat at ${(level * 100).toFixed(1)}%`,
          timestamp: now,
        });

        this._engine.events.emit('threat:warning', {
          sectorId,
          threatLevel: level,
        });
      }
    }

    // Merge with existing warnings, pruning old ones (> 5 min)
    this._warnings = [
      ...this._warnings.filter((w) => now - w.timestamp < 300_000),
      ...newWarnings,
    ].slice(-MAX_WARNINGS);
  }

  /**
   * Predict which entity pairs are likely to clash based on co-location
   * and mutual hostility.
   * @private
   */
  _predictConflicts() {
    /** @type {PredictedConflict[]} */
    const conflicts = [];

    // Group entities by sector
    /** @type {Map<string, string[]>} */
    const sectorEntities = new Map();
    for (const [eid, sid] of this._entitySectors) {
      if (!sectorEntities.has(sid)) sectorEntities.set(sid, []);
      sectorEntities.get(sid).push(eid);
    }

    for (const [sectorId, entities] of sectorEntities) {
      if (entities.length < 2) continue;

      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const a = entities[i];
          const b = entities[j];
          const beliefA = this._beliefs.get(a);
          const beliefB = this._beliefs.get(b);
          if (!beliefA || !beliefB) continue;

          const hostilityA = betaMean(beliefA.alpha, beliefA.beta);
          const hostilityB = betaMean(beliefB.alpha, beliefB.beta);

          // Both need some level of hostility
          const jointHostility = hostilityA * hostilityB;
          if (jointHostility < 0.1) continue;

          const probability = clamp01(jointHostility * 2); // scale up

          conflicts.push({
            entityA: a,
            entityB: b,
            sectorId,
            probability,
            hostilityA,
            hostilityB,
          });
        }
      }
    }

    this._predictedConflicts = conflicts.sort((a, b) => b.probability - a.probability);
  }

  // ── Private: Belief Management ─────────────────────────────────────────────

  /**
   * Get or create a Beta belief for an entity.
   *
   * @param {string} entityId
   * @returns {BetaBelief}
   * @private
   */
  _getOrCreateBelief(entityId) {
    if (!this._beliefs.has(entityId)) {
      this._beliefs.set(entityId, {
        alpha: DEFAULT_ALPHA,
        beta: DEFAULT_BETA,
        observations: 0,
        lastUpdated: Date.now(),
      });
    }
    return this._beliefs.get(entityId);
  }

  /**
   * Record an event in an entity's chronological history.
   *
   * @param {string} entityId
   * @param {EntityEvent} event
   * @private
   */
  _recordEvent(entityId, event) {
    if (!this._eventHistory.has(entityId)) {
      this._eventHistory.set(entityId, []);
    }
    const history = this._eventHistory.get(entityId);
    history.push(event);
    if (history.length > MAX_EVENT_HISTORY) {
      history.splice(0, history.length - MAX_EVENT_HISTORY);
    }
  }

  /**
   * Get all allied factions for a given faction (relationship > 0.5).
   *
   * @param {string} factionId
   * @returns {string[]}
   * @private
   */
  _getAllies(factionId) {
    const relations = this._factionRelations.get(factionId);
    if (!relations) return [];
    const allies = [];
    for (const [otherId, score] of relations) {
      if (score > 0.5) allies.push(otherId);
    }
    return allies;
  }
}

// ── Type Definitions ─────────────────────────────────────────────────────────

/**
 * @typedef {object} ThreatReport
 * @property {string}  entityId       Entity that was assessed.
 * @property {number}  overallThreat  Composite threat level [0, 1].
 * @property {ThreatDimensions} dimensions  Per-dimension breakdown.
 * @property {BayesianSummary}  bayesian    Bayesian belief summary.
 * @property {number}  confidence     Confidence in the assessment [0, 1].
 * @property {number}  timestamp      When the report was generated (ms).
 */

/**
 * @typedef {object} ThreatDimensions
 * @property {number} combatThreat      Combat capability and history [0, 1].
 * @property {number} economicThreat    Wealth and market influence [0, 1].
 * @property {number} politicalThreat   Faction standing and alliances [0, 1].
 * @property {number} territorialThreat Proximity and territorial control [0, 1].
 * @property {number} stealthThreat     Stealth capability and unknowns [0, 1].
 * @property {number} reputationThreat  Known history and archetype [0, 1].
 */

/**
 * @typedef {object} BayesianSummary
 * @property {number} alpha         Beta distribution alpha parameter.
 * @property {number} beta          Beta distribution beta parameter.
 * @property {number} mean          Posterior mean (expected hostility).
 * @property {number} variance      Posterior variance (uncertainty).
 * @property {number} observations  Total number of evidence observations.
 */

/**
 * @typedef {object} BetaBelief
 * @property {number} alpha         Current alpha of the Beta prior.
 * @property {number} beta          Current beta of the Beta prior.
 * @property {number} observations  Count of evidence updates received.
 * @property {number} lastUpdated   Timestamp of last update (ms).
 */

/**
 * @typedef {object} ThreatContext
 * @property {object}  [combatStats]        Combat statistics `{ attack, defense, hp }`.
 * @property {number}  [weaponCount]        Number of equipped weapons.
 * @property {number}  [wealth]             Currency / asset value.
 * @property {number}  [marketInfluence]    Market influence score [0, 1].
 * @property {number}  [resourceControl]    Fraction of resources controlled [0, 1].
 * @property {number}  [factionStanding]    Political standing [0, 1].
 * @property {number}  [allianceCount]      Number of active alliances.
 * @property {number}  [leadershipAptitude] Leadership score [0, 1].
 * @property {number}  [proximity]          Distance normalised to [0, 1] (1 = same sector).
 * @property {number}  [sectorControl]      Fraction of sectors controlled [0, 1].
 * @property {number}  [fleetSize]          Number of ships in fleet.
 * @property {number}  [stealthCapability]  Stealth rating [0, 1].
 * @property {string}  [reputation]         Archetype string (e.g. 'pirate', 'trader').
 * @property {string}  [sectorId]           Current sector identifier.
 */

/**
 * @typedef {object|string} Evidence
 * @property {'hostile_action'|'peaceful_action'|'trade_offer'|'combat_initiated'|'fleet_movement'|'resource_hoarding'} type
 *   Evidence type key.
 * @property {number}  [strength=1.0]  Multiplier for the update magnitude.
 * @property {string}  [sectorId]      Sector where the evidence was observed.
 */

/**
 * @typedef {object} EntityEvent
 * @property {string} type       Evidence type.
 * @property {number} timestamp  When the event occurred (ms).
 * @property {number} strength   Evidence strength multiplier.
 * @property {string|null} sectorId  Sector where it happened.
 */

/**
 * @typedef {object} EarlyWarning
 * @property {string|null} entityId   Entity responsible (null for sector-level).
 * @property {string}      sectorId   Affected sector.
 * @property {string}      type       Warning type ('escalation'|'high_sector_threat').
 * @property {number}      confidence Confidence in the warning [0, 1].
 * @property {string}      detail     Human-readable description.
 * @property {number}      timestamp  When the warning was issued (ms).
 */

/**
 * @typedef {object} PredictedConflict
 * @property {string} entityA      First entity.
 * @property {string} entityB      Second entity.
 * @property {string} sectorId     Sector where the clash may occur.
 * @property {number} probability  Estimated probability of conflict [0, 1].
 * @property {number} hostilityA   Entity A's Bayesian hostility mean.
 * @property {number} hostilityB   Entity B's Bayesian hostility mean.
 */

/**
 * @typedef {object} RecommendedAction
 * @property {string}                     npcId           The NPC.
 * @property {string}                     sectorId        Current sector.
 * @property {'fight'|'flee'|'hide'|'trade'} action       Recommended action.
 * @property {number}                     confidence      Confidence [0, 1].
 * @property {number}                     sectorThreat    Current sector threat.
 * @property {Array<{entityId:string,threat:number}>} nearbyHostiles  Top hostiles.
 */

/**
 * @typedef {object} SafeRoute
 * @property {string[]} path         Ordered list of sector IDs.
 * @property {number}   totalThreat  Cumulative threat across the path.
 * @property {boolean}  found        Whether a route was found.
 */

/**
 * @typedef {object} FactionThreatReport
 * @property {string}   factionId      The assessed faction.
 * @property {number}   ownPower       Faction's own power.
 * @property {string[]} allies         Allied faction IDs.
 * @property {number}   alliedPower    Sum of allied factions' power.
 * @property {number}   totalPower     Own + allied power.
 * @property {number}   relativePower  Ratio vs global average power.
 * @property {number}   threatLevel    Normalised threat [0, 1].
 */

/**
 * @typedef {object} PowerImbalance
 * @property {string} strongFaction  The more powerful faction.
 * @property {string} weakFaction    The less powerful faction.
 * @property {number} powerRatio     Ratio of strong / weak power.
 * @property {number} relationScore  Current relationship score (negative).
 * @property {number} warRisk        Estimated risk of war [0, 1].
 */
