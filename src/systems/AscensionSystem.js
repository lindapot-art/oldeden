import { randomUUID } from 'crypto';

/**
 * AscensionSystem — the aspirational endgame of Old Eden.
 *
 * After 3+ rebirths, a player may attempt the Ascension Trial — a solo
 * procedurally-generated gauntlet.  Success transforms the character into
 * an Ascended — a semi-permanent force bound to a star system.
 *
 * Ascended entities:
 *   - Exist as ghostly presences in their claimed star system
 *   - Can set bounties, trigger minor events, bless/curse players
 *   - Earn passive EDEN token income (0.01% of system economic activity)
 *   - Can be challenged and defeated (resulting in Soul Fracture)
 *   - Limited to 100 per server (extreme exclusivity)
 *
 * Trial cost: 500 SM (free once/month for Overlord subscribers).
 */

const MAX_ASCENDED_PER_SERVER = 100;
const ASCENSION_TRIAL_COST_SM = 200;
const PASSIVE_INCOME_RATE = 0.0001; // 0.01%
const MIN_REBIRTHS_REQUIRED = 3;
const TRIAL_BASE_DIFFICULTY = 5;      // scales with lifetime stats
const TRIAL_STAGES = 7;              // number of gauntlet stages

export { MAX_ASCENDED_PER_SERVER, ASCENSION_TRIAL_COST_SM, PASSIVE_INCOME_RATE, MIN_REBIRTHS_REQUIRED };

export class AscensionSystem {
  async init(engine) {
    this._engine = engine;
    /** @type {Map<string, AscendedEntity>} ascendedId → entity */
    this._ascended = new Map();
    /** @type {Map<string, TrialRecord>} trialId → record */
    this._trialHistory = new Map();
    /** @type {Map<string, number>} playerId → rebirth count */
    this._rebirthCounts = new Map();

    // Track rebirths to gate ascension eligibility
    engine.events.on('player:rebirth_ready', (data) => this._onRebirthReady(data));
    console.log('[AscensionSystem] Initialised.');
  }

  tick(deltaMs) {
    // Calculate passive income for Ascended entities
    // (In production this would query real economic activity;
    //  here we simulate a fixed trickle per tick)
    const tickSeconds = deltaMs / 1000;
    for (const entity of this._ascended.values()) {
      if (entity.isActive) {
        entity.passiveIncomeAccumulated += PASSIVE_INCOME_RATE * tickSeconds;
      }
    }
  }

  async destroy() {
    this._ascended.clear();
    this._trialHistory.clear();
    this._rebirthCounts.clear();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Check whether a player is eligible to attempt Ascension.
   * @param {string} playerId
   * @returns {{ eligible: boolean, reason?: string }}
   */
  checkEligibility(playerId) {
    const rebirths = this._rebirthCounts.get(playerId) ?? 0;
    if (rebirths < MIN_REBIRTHS_REQUIRED) {
      return { eligible: false, reason: `Requires ${MIN_REBIRTHS_REQUIRED} rebirths (current: ${rebirths}).` };
    }
    if (this._ascended.size >= MAX_ASCENDED_PER_SERVER) {
      // Check if any slot can be won via challenge
      return { eligible: true, reason: 'All slots full — must challenge an existing Ascended.' };
    }
    return { eligible: true };
  }

  /**
   * Attempt the Ascension Trial.
   *
   * @param {string} playerId
   * @param {object} character    The character attempting ascension
   * @param {object} [options]
   * @param {string} [options.targetSystemId]  Star system to claim on success
   * @returns {TrialResult}
   */
  attemptTrial(playerId, character, { targetSystemId = null } = {}) {
    const eligibility = this.checkEligibility(playerId);
    if (!eligibility.eligible) {
      throw new Error(`[AscensionSystem] Player ${playerId} not eligible: ${eligibility.reason}`);
    }

    // Generate trial difficulty based on cumulative lifetime stats
    const rebirths = this._rebirthCounts.get(playerId) ?? MIN_REBIRTHS_REQUIRED;
    const difficulty = TRIAL_BASE_DIFFICULTY + rebirths;

    // Simulate trial stages
    const stages = this._generateTrialStages(difficulty, character);
    let passed = 0;
    for (const stage of stages) {
      if (this._evaluateStage(stage, character)) {
        passed++;
      } else {
        break; // Fail on first failed stage
      }
    }

    const success = passed === TRIAL_STAGES;
    const trialId = randomUUID();

    const record = {
      trialId,
      playerId,
      characterId: character.id,
      difficulty,
      stagesPassed: passed,
      totalStages: TRIAL_STAGES,
      success,
      timestamp: Date.now(),
    };
    this._trialHistory.set(trialId, record);

    // Cap trial history to prevent unbounded growth
    if (this._trialHistory.size > 500) {
      const oldest = this._trialHistory.keys().next().value;
      this._trialHistory.delete(oldest);
    }

    if (success) {
      const systemId = targetSystemId || `system-${randomUUID().slice(0, 8)}`;
      const entity = this._createAscended(playerId, character, systemId);

      this._engine.events.emit('ascension:succeeded', {
        trialId,
        playerId,
        characterId: character.id,
        ascendedId: entity.id,
        systemId,
      });

      return { trialId, success: true, stagesPassed: passed, ascendedId: entity.id, systemId };
    }

    this._engine.events.emit('ascension:failed', {
      trialId,
      playerId,
      characterId: character.id,
      stagesPassed: passed,
    });

    return { trialId, success: false, stagesPassed: passed, ascendedId: null, systemId: null };
  }

  /**
   * Challenge an existing Ascended entity.
   *
   * @param {string} challengerPlayerId
   * @param {string} ascendedId
   * @param {object} challengerCharacter
   * @returns {{ success: boolean, ascendedId?: string, systemId?: string }}
   */
  challengeAscended(challengerPlayerId, ascendedId, challengerCharacter) {
    const entity = this._ascended.get(ascendedId);
    if (!entity || !entity.isActive) {
      throw new Error('[AscensionSystem] Target Ascended entity not found or inactive.');
    }

    // Challenge is a simplified combat check: challenger power vs ascended power
    const challengerPower = this._computePower(challengerCharacter);
    const ascendedPower = entity.powerLevel * (0.8 + Math.random() * 0.4); // ±20% variance
    const success = challengerPower > ascendedPower;

    if (success) {
      // Ascended shatters (Soul Fracture triggered externally)
      entity.isActive = false;
      entity.defeatedBy = challengerPlayerId;
      entity.defeatedAt = Date.now();

      // Create new Ascended for the challenger
      const newEntity = this._createAscended(challengerPlayerId, challengerCharacter, entity.systemId);

      this._engine.events.emit('ascension:challenged', {
        challengerPlayerId,
        defeatedAscendedId: ascendedId,
        defeatedPlayerId: entity.playerId,
        newAscendedId: newEntity.id,
        systemId: entity.systemId,
      });

      return { success: true, ascendedId: newEntity.id, systemId: entity.systemId };
    }

    this._engine.events.emit('ascension:challenge_failed', {
      challengerPlayerId,
      ascendedId,
    });

    return { success: false };
  }

  /**
   * Get all active Ascended entities.
   * @returns {AscendedEntity[]}
   */
  getAscendedEntities() {
    return [...this._ascended.values()].filter(e => e.isActive);
  }

  /**
   * Get a specific Ascended entity by ID.
   * @param {string} id
   * @returns {AscendedEntity|undefined}
   */
  getAscended(id) {
    return this._ascended.get(id);
  }

  /**
   * Get the number of active Ascended slots remaining.
   * @returns {number}
   */
  getAvailableSlots() {
    const activeCount = [...this._ascended.values()].filter(e => e.isActive).length;
    return Math.max(0, MAX_ASCENDED_PER_SERVER - activeCount);
  }

  /**
   * Get a player's rebirth count.
   * @param {string} playerId
   * @returns {number}
   */
  getRebirthCount(playerId) {
    return this._rebirthCounts.get(playerId) ?? 0;
  }

  /**
   * Manually set rebirth count (e.g., during data load).
   * @param {string} playerId
   * @param {number} count
   */
  setRebirthCount(playerId, count) {
    this._rebirthCounts.set(playerId, count);
  }

  /**
   * Get trial history.
   * @returns {TrialRecord[]}
   */
  getTrialHistory() {
    return [...this._trialHistory.values()];
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _onRebirthReady({ playerId }) {
    const count = this._rebirthCounts.get(playerId) ?? 0;
    this._rebirthCounts.set(playerId, count + 1);
  }

  _createAscended(playerId, character, systemId) {
    const entity = {
      id: randomUUID(),
      playerId,
      characterId: character.id,
      characterName: character.name || `Character-${character.id.slice(0, 8)}`,
      systemId,
      powerLevel: this._computePower(character),
      isActive: true,
      passiveIncomeAccumulated: 0,
      createdAt: Date.now(),
      defeatedBy: null,
      defeatedAt: null,
    };
    this._ascended.set(entity.id, entity);
    return entity;
  }

  _computePower(character) {
    const skills = character.skills || {};
    const skillSum = Object.values(skills).reduce((sum, v) => sum + v, 0);
    const skillAvg = skillSum / Math.max(1, Object.keys(skills).length);
    const wealthFactor = Math.min(1, (character.credits || 0) / 1_000_000);
    return Math.round((skillAvg / 100) * 50 + wealthFactor * 30 + Math.min(1, (character.reputation || 0) / 1000) * 20);
  }

  _generateTrialStages(difficulty, character) {
    const stages = [];
    for (let i = 0; i < TRIAL_STAGES; i++) {
      stages.push({
        stageNumber: i + 1,
        difficulty: difficulty + i * 2,       // escalating difficulty
        type: ['combat', 'puzzle', 'survival', 'navigation', 'endurance'][i % 5],
        threshold: 0.3 + (i / TRIAL_STAGES) * 0.4, // 0.3 → 0.7 pass threshold
      });
    }
    return stages;
  }

  _evaluateStage(stage, character) {
    const power = this._computePower(character);
    const normalizedPower = power / 100;
    // Success probability decreases with stage difficulty
    const successChance = Math.max(0.05, Math.min(0.95,
      normalizedPower - (stage.threshold * stage.difficulty / 20)
    ));
    return Math.random() < successChance;
  }
}

/**
 * @typedef {object} AscendedEntity
 * @property {string}  id
 * @property {string}  playerId
 * @property {string}  characterId
 * @property {string}  characterName
 * @property {string}  systemId
 * @property {number}  powerLevel
 * @property {boolean} isActive
 * @property {number}  passiveIncomeAccumulated
 * @property {number}  createdAt
 * @property {string|null} defeatedBy
 * @property {number|null} defeatedAt
 */

/**
 * @typedef {object} TrialResult
 * @property {string}      trialId
 * @property {boolean}     success
 * @property {number}      stagesPassed
 * @property {string|null} ascendedId
 * @property {string|null} systemId
 */

/**
 * @typedef {object} TrialRecord
 * @property {string}  trialId
 * @property {string}  playerId
 * @property {string}  characterId
 * @property {number}  difficulty
 * @property {number}  stagesPassed
 * @property {number}  totalStages
 * @property {boolean} success
 * @property {number}  timestamp
 */
