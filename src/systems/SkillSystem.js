/**
 * SkillSystem — trainable skill progression for Old Eden.
 *
 * Twenty skills across five categories power everything from combat
 * effectiveness to social negotiations in the blockchain-native AI-driven
 * space MMO.
 *
 * Categories & Skills:
 *  - Combat:      marksmanship, melee, tactics, evasion
 *  - Piloting:    navigation, maneuvering, docking, ftlOps
 *  - Engineering: repair, fabrication, electronics, mining
 *  - Science:     biology, chemistry, physics, xenology
 *  - Social:      diplomacy, trading, leadership, deception
 *
 * Core mechanics:
 *  1. Exponential XP curve — XP needed for level N = BASE_XP × N^1.5
 *  2. Skill levels capped at 1–100
 *  3. Skill decay — 1% XP lost per week of inactivity after a 30-day grace window
 *  4. Synergy bonuses — related skills in the same category grant +2% per
 *     related skill above level 25
 *  5. Skill-gated actions — define minimum requirements and check eligibility
 */

// ── Constants & Enums ──────────────────────────────────────────────────────────

/** Base XP required per level (scaled by level^1.5). */
const BASE_XP = 100;

/** Maximum achievable skill level. */
const MAX_LEVEL = 100;

/** Pre-computed cumulative XP table for fast level lookup. */
const _xpTable = new Float64Array(MAX_LEVEL + 1);
{
  let cum = 0;
  for (let n = 1; n <= MAX_LEVEL; n++) {
    cum += BASE_XP * Math.pow(n, 1.5);
    _xpTable[n] = Math.floor(cum);
  }
}

/** Grace period before decay begins (ms). */
const DECAY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Decay rate per tick — 1% of current XP lost per week of inactivity. */
const DECAY_RATE_PER_MS = 0.01 / (7 * 24 * 60 * 60 * 1000);

/** Minimum related-skill level before it contributes a synergy bonus. */
const SYNERGY_THRESHOLD = 25;

/** Synergy bonus per qualifying related skill (2%). */
const SYNERGY_BONUS_PER_SKILL = 0.02;

export const SKILL_CATEGORY = Object.freeze({
  COMBAT:      'combat',
  PILOTING:    'piloting',
  ENGINEERING: 'engineering',
  SCIENCE:     'science',
  SOCIAL:      'social',
});

/**
 * All trainable skills keyed by their identifier.
 * Each entry specifies the category it belongs to.
 *
 * @type {Record<string, { id: string, name: string, category: string }>}
 */
export const SKILLS = Object.freeze({
  // Combat
  marksmanship: { id: 'marksmanship', name: 'Marksmanship', category: SKILL_CATEGORY.COMBAT },
  melee:        { id: 'melee',        name: 'Melee',        category: SKILL_CATEGORY.COMBAT },
  tactics:      { id: 'tactics',      name: 'Tactics',      category: SKILL_CATEGORY.COMBAT },
  evasion:      { id: 'evasion',      name: 'Evasion',      category: SKILL_CATEGORY.COMBAT },
  // Piloting
  navigation:   { id: 'navigation',   name: 'Navigation',   category: SKILL_CATEGORY.PILOTING },
  maneuvering:  { id: 'maneuvering',  name: 'Maneuvering',  category: SKILL_CATEGORY.PILOTING },
  docking:      { id: 'docking',      name: 'Docking',      category: SKILL_CATEGORY.PILOTING },
  ftlOps:       { id: 'ftlOps',       name: 'FTL Operations', category: SKILL_CATEGORY.PILOTING },
  // Engineering
  repair:       { id: 'repair',       name: 'Repair',       category: SKILL_CATEGORY.ENGINEERING },
  fabrication:  { id: 'fabrication',  name: 'Fabrication',  category: SKILL_CATEGORY.ENGINEERING },
  electronics:  { id: 'electronics',  name: 'Electronics',  category: SKILL_CATEGORY.ENGINEERING },
  mining:       { id: 'mining',       name: 'Mining',       category: SKILL_CATEGORY.ENGINEERING },
  // Science
  biology:      { id: 'biology',      name: 'Biology',      category: SKILL_CATEGORY.SCIENCE },
  chemistry:    { id: 'chemistry',    name: 'Chemistry',    category: SKILL_CATEGORY.SCIENCE },
  physics:      { id: 'physics',      name: 'Physics',      category: SKILL_CATEGORY.SCIENCE },
  xenology:     { id: 'xenology',     name: 'Xenology',     category: SKILL_CATEGORY.SCIENCE },
  // Social
  diplomacy:    { id: 'diplomacy',    name: 'Diplomacy',    category: SKILL_CATEGORY.SOCIAL },
  trading:      { id: 'trading',      name: 'Trading',      category: SKILL_CATEGORY.SOCIAL },
  leadership:   { id: 'leadership',   name: 'Leadership',   category: SKILL_CATEGORY.SOCIAL },
  deception:    { id: 'deception',    name: 'Deception',    category: SKILL_CATEGORY.SOCIAL },
});

/** Pre-computed lookup: category → skill IDs in that category. */
const CATEGORY_SKILLS = Object.freeze(
  Object.values(SKILLS).reduce((acc, skill) => {
    (acc[skill.category] ??= []).push(skill.id);
    return acc;
  }, {}),
);

// ── System ─────────────────────────────────────────────────────────────────────

export class SkillSystem {
  /**
   * Initialise the skill system.
   * @param {object} engine  The game engine instance.
   */
  async init(engine) {
    this._engine = engine;

    /** @type {Map<string, Map<string, SkillState>>} playerId → (skillId → state) */
    this._players = new Map();

    console.log('[SkillSystem] Initialised.');
  }

  /**
   * Per-frame update — processes skill decay for all players.
   * @param {number} deltaMs  Milliseconds since last tick.
   */
  tick(deltaMs) {
    this._tickDecay(deltaMs);
  }

  /** Cleanup resources. */
  async destroy() {
    this._players.clear();
  }

  // ── 1. XP Progression ─────────────────────────────────────────────────────

  /**
   * Calculate the cumulative XP required to reach a given level.
   *
   * XP(level) = Σ (BASE_XP × n^1.5) for n = 1..level
   *
   * @param {number} level  Target level (1–100).
   * @returns {number}  Total XP required.
   */
  xpForLevel(level) {
    const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
    let total = 0;
    for (let n = 1; n <= clamped; n++) {
      total += BASE_XP * Math.pow(n, 1.5);
    }
    return Math.floor(total);
  }

  /**
   * Derive the current level from accumulated XP.
   *
   * @param {number} xp  Total accumulated XP.
   * @returns {number}  Current level (1–100).
   */
  levelFromXp(xp) {
    if (xp <= 0) return 1;
    // Binary search on pre-computed table
    let lo = 1, hi = MAX_LEVEL;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (_xpTable[mid] <= xp) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /**
   * Award XP to a player's skill.
   *
   * @param {string} playerId
   * @param {string} skillId
   * @param {number} amount  XP to add (must be positive).
   */
  addXp(playerId, skillId, amount) {
    this._validateSkill(skillId);
    if (amount <= 0) throw new RangeError('XP amount must be positive.');

    const state = this._getSkillState(playerId, skillId);
    const prevLevel = this.levelFromXp(state.xp);

    // Cap XP at max-level ceiling
    const maxXp = this.xpForLevel(MAX_LEVEL);
    state.xp = Math.min(state.xp + amount, maxXp);
    state.lastUsedAt = Date.now();

    const newLevel = this.levelFromXp(state.xp);

    if (newLevel > prevLevel) {
      this._engine.events.emit('skill:level_up', {
        playerId,
        skillId,
        oldLevel: prevLevel,
        newLevel,
      });
    }

    this._engine.events.emit('skill:xp_gained', { playerId, skillId, amount, totalXp: state.xp });
  }

  // ── 2. Skill Level Queries ────────────────────────────────────────────────

  /**
   * Get the current level of a player's skill.
   *
   * @param {string} playerId
   * @param {string} skillId
   * @returns {number}  Current level (1–100).
   */
  getLevel(playerId, skillId) {
    this._validateSkill(skillId);
    const state = this._getSkillState(playerId, skillId);
    return this.levelFromXp(state.xp);
  }

  /**
   * Get all skill levels for a player.
   *
   * @param {string} playerId
   * @returns {Record<string, number>}  skillId → level
   */
  getAllLevels(playerId) {
    const result = {};
    for (const skillId of Object.keys(SKILLS)) {
      result[skillId] = this.getLevel(playerId, skillId);
    }
    return result;
  }

  /**
   * Get the raw skill state (XP, timestamps) for a player's skill.
   *
   * @param {string} playerId
   * @param {string} skillId
   * @returns {SkillState}
   */
  getSkillState(playerId, skillId) {
    this._validateSkill(skillId);
    return { ...this._getSkillState(playerId, skillId) };
  }

  // ── 3. Skill Decay ────────────────────────────────────────────────────────

  /**
   * Process skill decay for all players.
   *
   * Any skill not used within the 30-day decay window loses 1% of its
   * current XP per week of inactivity, applied proportionally per tick.
   *
   * @param {number} deltaMs
   */
  _tickDecay(deltaMs) {
    const now = Date.now();

    for (const [playerId, skills] of this._players.entries()) {
      for (const [skillId, state] of skills.entries()) {
        const inactiveMs = now - state.lastUsedAt;
        if (inactiveMs <= DECAY_WINDOW_MS) continue;
        if (state.xp <= 0) continue;

        const prevLevel = this.levelFromXp(state.xp);
        const loss = state.xp * DECAY_RATE_PER_MS * deltaMs;
        state.xp = Math.max(0, state.xp - loss);
        const newLevel = this.levelFromXp(state.xp);

        // Only emit events on actual level changes to avoid flooding
        if (newLevel < prevLevel) {
          this._engine.events.emit('skill:level_down', {
            playerId,
            skillId,
            oldLevel: prevLevel,
            newLevel,
          });
        }
      }
    }
  }

  // ── 4. Synergy Bonuses ────────────────────────────────────────────────────

  /**
   * Calculate the synergy bonus multiplier for a skill.
   *
   * Each related skill in the same category that is above level 25
   * grants a +2% bonus.  The bonus is additive across peers.
   *
   * @param {string} playerId
   * @param {string} skillId
   * @returns {number}  Multiplier (≥ 1.0). e.g. 1.06 = +6%.
   */
  getSynergyBonus(playerId, skillId) {
    this._validateSkill(skillId);
    const category = SKILLS[skillId].category;
    const peers = CATEGORY_SKILLS[category];

    let bonus = 0;
    for (const peerId of peers) {
      if (peerId === skillId) continue;
      const peerLevel = this.getLevel(playerId, peerId);
      if (peerLevel > SYNERGY_THRESHOLD) {
        bonus += SYNERGY_BONUS_PER_SKILL;
      }
    }

    return 1.0 + bonus;
  }

  /**
   * Get the effective level of a skill after applying synergy bonuses.
   *
   * effectiveLevel = floor(baseLevel × synergyMultiplier)
   * Capped at MAX_LEVEL.
   *
   * @param {string} playerId
   * @param {string} skillId
   * @returns {number}
   */
  getEffectiveLevel(playerId, skillId) {
    const base = this.getLevel(playerId, skillId);
    const multiplier = this.getSynergyBonus(playerId, skillId);
    return Math.min(MAX_LEVEL, Math.floor(base * multiplier));
  }

  // ── 5. Skill-Gated Actions ────────────────────────────────────────────────

  /**
   * Define a skill-gated action requirement.
   *
   * @param {string} actionName  Human-readable action name.
   * @param {Record<string, number>} requirements  skillId → minimum level.
   * @returns {SkillGate}
   */
  defineGate(actionName, requirements) {
    for (const skillId of Object.keys(requirements)) {
      this._validateSkill(skillId);
    }
    return { actionName, requirements };
  }

  /**
   * Check whether a player meets all requirements of a skill gate.
   *
   * @param {string} playerId
   * @param {SkillGate} gate
   * @returns {{ allowed: boolean, failing: Array<{ skillId: string, required: number, actual: number }> }}
   */
  checkGate(playerId, gate) {
    const failing = [];
    for (const [skillId, required] of Object.entries(gate.requirements)) {
      const actual = this.getEffectiveLevel(playerId, skillId);
      if (actual < required) {
        failing.push({ skillId, required, actual });
      }
    }

    const allowed = failing.length === 0;
    if (allowed) {
      this._engine.events.emit('skill:gate_passed', {
        playerId,
        actionName: gate.actionName,
      });
    }

    return { allowed, failing };
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  /**
   * Retrieve (or create) the internal skill state for a player.
   * @param {string} playerId
   * @param {string} skillId
   * @returns {SkillState}
   */
  _getSkillState(playerId, skillId) {
    if (!this._players.has(playerId)) {
      this._players.set(playerId, new Map());
    }
    const skills = this._players.get(playerId);
    if (!skills.has(skillId)) {
      skills.set(skillId, { xp: 0, lastUsedAt: Date.now() });
    }
    return skills.get(skillId);
  }

  /**
   * Validate that a skill identifier exists.
   * @param {string} skillId
   */
  _validateSkill(skillId) {
    if (!SKILLS[skillId]) throw new Error(`Unknown skill: ${skillId}`);
  }
}

// ── Typedefs ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} SkillState
 * @property {number} xp          Accumulated experience points.
 * @property {number} lastUsedAt  Timestamp (ms) of last XP gain or usage.
 */

/**
 * @typedef {object} SkillGate
 * @property {string} actionName                Action this gate protects.
 * @property {Record<string, number>} requirements  skillId → minimum level.
 */
