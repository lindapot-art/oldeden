import { randomUUID } from 'crypto';
import { APTITUDE_GENES, PHYSICAL_GENES } from './GeneticSystem.js';

/**
 * CombatSystem — full tactical combat with AI opponents that learn from
 * player strategies.
 *
 * Features:
 *   - Turn-based combat resolved over multiple engine ticks
 *   - 1v1 through 5v5 group encounters
 *   - Genome-driven combat stats (strength, agility, endurance, aptitude)
 *   - AI pattern-recognition: tracks player aggression, target priorities,
 *     and ability usage, then selects counter-strategies
 *   - Weighted loot tables (common → legendary) with deterministic RNG
 *   - Full integration with NPCSystem, GeneticSystem, and EconomySystem
 *
 * Combat flow:
 *   1. `initiateCombat()` creates a CombatEncounter
 *   2. Each engine tick advances pending encounters by one turn
 *   3. `resolveCombat()` finalises outcomes (XP, loot, reputation)
 *
 * Events emitted:
 *   combat:started, combat:turn_resolved, combat:ended,
 *   combat:critical_hit, combat:flee_attempt,
 *   player:combat_win, player:combat_loss
 */

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum combatants allowed on a single side. */
const MAX_TEAM_SIZE = 5;

/** Milliseconds between automatic turn resolution. */
const TURN_INTERVAL_MS = 1_000;

/** Temporary stat reduction (fraction) applied after a defeat. */
const INJURY_PENALTY = 0.20;

/** Duration (ms) that injury debuffs last after a defeat. */
const INJURY_DURATION_MS = 300_000; // 5 real minutes

/** Base XP reward for a combat victory. */
const BASE_XP_REWARD = 50;

/** Base Eden-Credits reward for a combat victory. */
const BASE_EC_REWARD = 100;

/** Speed-check bonus that the fleeing combatant needs to escape. */
const FLEE_SPEED_THRESHOLD = 0.40;

/** Reputation gained on victory / lost on flee. */
const REPUTATION_WIN  = 5;
const REPUTATION_FLEE = -3;

// ─── Loot rarity tiers ─────────────────────────────────────────────────────

/**
 * @readonly
 * @enum {string}
 */
export const LOOT_RARITY = Object.freeze({
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  LEGENDARY: 'legendary',
});

/**
 * Default loot table.  Each entry carries a cumulative weight; rolls are
 * performed with a seeded PRNG so drops are deterministic for a given
 * encounter ID.
 *
 * @type {ReadonlyArray<{rarity: string, weight: number, ecValue: number}>}
 */
const DEFAULT_LOOT_TABLE = Object.freeze([
  { rarity: LOOT_RARITY.COMMON,    weight: 60, ecValue:   25 },
  { rarity: LOOT_RARITY.UNCOMMON,  weight: 25, ecValue:  100 },
  { rarity: LOOT_RARITY.RARE,      weight: 12, ecValue:  500 },
  { rarity: LOOT_RARITY.LEGENDARY, weight:  3, ecValue: 2500 },
]);

// ─── AI strategy labels ────────────────────────────────────────────────────

/**
 * @readonly
 * @enum {string}
 */
export const AI_STANCE = Object.freeze({
  AGGRESSIVE:  'aggressive',
  DEFENSIVE:   'defensive',
  BALANCED:    'balanced',
  COUNTER:     'counter_attack',
  ATTRITION:   'attrition',
  FLANKING:    'flanking',
  ADAPTIVE:    'adaptive',
});

// ─── Encounter state machine ────────────────────────────────────────────────

/**
 * @readonly
 * @enum {string}
 */
export const ENCOUNTER_STATE = Object.freeze({
  ACTIVE:   'active',
  RESOLVED: 'resolved',
  FLED:     'fled',
});

// ─── Typedefs ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CombatStats
 * @property {number} attackPower   - Offensive damage output
 * @property {number} defense       - Damage mitigation rating
 * @property {number} speed         - Turn-order initiative
 * @property {number} accuracy      - Hit chance modifier
 * @property {number} evasion       - Dodge chance modifier
 * @property {number} maxHitPoints  - Maximum health
 * @property {number} criticalChance - Probability (0-1) of a critical strike
 */

/**
 * @typedef {Object} Combatant
 * @property {string}      id        - NPC / player ID
 * @property {CombatStats} stats     - Derived combat statistics
 * @property {number}      hp        - Current hit points
 * @property {string}      team      - 'attacker' or 'defender'
 * @property {boolean}     alive     - Still in the fight
 * @property {number}      damageDealt    - Total damage dealt
 * @property {number}      damageReceived - Total damage taken
 * @property {number}      turnsSurvived  - Number of turns survived
 */

/**
 * @typedef {Object} CombatEncounter
 * @property {string}        id          - Unique encounter ID
 * @property {Combatant[]}   attackers   - Attacking team
 * @property {Combatant[]}   defenders   - Defending team
 * @property {number}        turn        - Current turn number
 * @property {string}        state       - ENCOUNTER_STATE value
 * @property {Object|null}   outcome     - Final outcome after resolution
 * @property {string}        context     - Free-form context tag
 * @property {number}        createdAt   - Timestamp (ms) when encounter began
 * @property {TurnResult[]}  turnLog     - Ordered log of every turn result
 */

/**
 * @typedef {Object} TurnResult
 * @property {number}  turn       - Turn number
 * @property {string}  actorId    - Who acted
 * @property {string}  targetId   - Who was targeted
 * @property {boolean} hit        - Whether the attack landed
 * @property {number}  damage     - Damage dealt (0 on miss)
 * @property {boolean} critical   - Whether it was a critical hit
 * @property {string}  stance     - AI stance used this turn
 */

/**
 * @typedef {Object} StrategyProfile
 * @property {number}   aggressiveness  - Ratio of attacks to defensive moves (0-1)
 * @property {string}   targetPriority  - 'weakest' | 'strongest' | 'closest'
 * @property {Object<string,number>} abilityUsage - Ability name → usage count
 * @property {number}   encounters      - Total encounters analysed
 */

/**
 * @typedef {Object} CombatOutcome
 * @property {string}   result     - 'victory' | 'defeat' | 'flee'
 * @property {string[]} winners    - IDs of the winning team members
 * @property {string[]} losers     - IDs of the losing team members
 * @property {number}   xpReward   - XP granted to the victors
 * @property {number}   ecReward   - Eden Credits granted to the victors
 * @property {Object|null} loot    - Loot drop (null if none)
 * @property {number}   reputationChange - Reputation delta
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Simple seeded 32-bit PRNG (Mulberry32).  Produces deterministic sequences
 * from a numeric seed so loot drops are reproducible for a given encounter.
 *
 * @param {number} seed
 * @returns {() => number} A function returning values in [0, 1).
 */
function mulberry32(seed) {
  return () => {
    /* eslint-disable no-param-reassign */
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    /* eslint-enable no-param-reassign */
  };
}

/**
 * Derive a numeric seed from a UUID string.
 *
 * @param {string} uuid
 * @returns {number}
 */
function seedFromUUID(uuid) {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash + uuid.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Clamp a number between min and max.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ─── CombatSystem ───────────────────────────────────────────────────────────

export class CombatSystem {
  // ── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Initialise the combat system.
   *
   * @param {Object} engine - The game engine instance.
   */
  async init(engine) {
    /** @private */
    this._engine = engine;

    /** @type {Map<string, CombatEncounter>} Active and recently-resolved encounters. */
    this._encounters = new Map();

    /** @type {Map<string, StrategyProfile>} Per-player AI strategy profiles. */
    this._strategyProfiles = new Map();

    /** @type {Map<string, {until: number, penalty: number}>} Active injury debuffs. */
    this._injuries = new Map();

    /** @private Accumulated ms since last turn tick. */
    this._turnAccumulator = 0;

    // Listen for combat requests from other systems.
    this._engine.events.on('combat:request', (payload) => {
      this.initiateCombat(payload.attackerId, payload.defenderId, payload.context);
    });

    console.log('[CombatSystem] Initialised.');
  }

  /**
   * Advance all active encounters.  Called once per engine frame.
   *
   * @param {number} deltaMs - Milliseconds elapsed since the last tick.
   */
  tick(deltaMs) {
    this._turnAccumulator += deltaMs;

    // Expire old injuries.
    const now = Date.now();
    for (const [id, injury] of this._injuries) {
      if (now >= injury.until) this._injuries.delete(id);
    }

    // Resolve one turn per interval.
    if (this._turnAccumulator < TURN_INTERVAL_MS) return;
    this._turnAccumulator -= TURN_INTERVAL_MS;

    for (const encounter of this._encounters.values()) {
      if (encounter.state !== ENCOUNTER_STATE.ACTIVE) continue;
      this._processTurn(encounter);
    }
  }

  /**
   * Tear down and clean up.
   */
  async destroy() {
    this._encounters.clear();
    this._strategyProfiles.clear();
    this._injuries.clear();
    console.log('[CombatSystem] Destroyed.');
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Start a combat encounter between one or more attackers and defenders.
   *
   * `attackerId` and `defenderId` may each be a single NPC / player ID or
   * an array of IDs (for group combat up to 5v5).
   *
   * @param {string|string[]} attackerId  - Attacker ID(s).
   * @param {string|string[]} defenderId  - Defender ID(s).
   * @param {string}          [context='encounter'] - Free-form tag.
   * @returns {CombatEncounter} The newly created encounter.
   */
  initiateCombat(attackerId, defenderId, context = 'encounter') {
    const attackerIds = Array.isArray(attackerId) ? attackerId : [attackerId];
    const defenderIds = Array.isArray(defenderId) ? defenderId : [defenderId];

    if (attackerIds.length > MAX_TEAM_SIZE || defenderIds.length > MAX_TEAM_SIZE) {
      throw new RangeError(`Teams cannot exceed ${MAX_TEAM_SIZE} combatants.`);
    }

    const id = randomUUID();

    /** @type {CombatEncounter} */
    const encounter = {
      id,
      attackers: attackerIds.map((aid) => this._buildCombatant(aid, 'attacker')),
      defenders: defenderIds.map((did) => this._buildCombatant(did, 'defender')),
      turn: 0,
      state: ENCOUNTER_STATE.ACTIVE,
      outcome: null,
      context,
      createdAt: Date.now(),
      turnLog: [],
    };

    this._encounters.set(id, encounter);

    this._engine.events.emit('combat:started', {
      encounterId: id,
      attackerIds,
      defenderIds,
      context,
    });

    return encounter;
  }

  /**
   * Manually resolve (finalise) an encounter.  If the encounter is still
   * active it will fast-forward until one side is eliminated.
   *
   * @param {string} encounterId
   * @returns {CombatOutcome} The final outcome of the encounter.
   */
  resolveCombat(encounterId) {
    const encounter = this._encounters.get(encounterId);
    if (!encounter) throw new Error(`Unknown encounter: ${encounterId}`);

    // Fast-forward until decisive.
    let safety = 500;
    while (encounter.state === ENCOUNTER_STATE.ACTIVE && --safety > 0) {
      this._processTurn(encounter);
    }

    return encounter.outcome;
  }

  /**
   * Attempt to flee from an active encounter.
   *
   * @param {string} encounterId
   * @param {string} fleeingId - ID of the combatant attempting to flee.
   * @returns {{success: boolean, speedRoll: number}} Whether the flee succeeded.
   */
  attemptFlee(encounterId, fleeingId) {
    const encounter = this._encounters.get(encounterId);
    if (!encounter || encounter.state !== ENCOUNTER_STATE.ACTIVE) {
      throw new Error(`Cannot flee: encounter ${encounterId} is not active.`);
    }

    const combatant = this._findCombatant(encounter, fleeingId);
    if (!combatant || !combatant.alive) {
      throw new Error(`Combatant ${fleeingId} is not active in this encounter.`);
    }

    const speedNorm = combatant.stats.speed / 500; // normalise to rough 0-1
    const roll = Math.random();
    const success = roll < (speedNorm + FLEE_SPEED_THRESHOLD);

    this._engine.events.emit('combat:flee_attempt', {
      encounterId,
      fleeingId,
      success,
      speedRoll: roll,
    });

    if (success) {
      encounter.state = ENCOUNTER_STATE.FLED;
      encounter.outcome = this._buildFleeOutcome(encounter, fleeingId);
      this._applyOutcome(encounter);
    }

    return { success, speedRoll: roll };
  }

  /**
   * Retrieve an encounter by ID.
   *
   * @param {string} encounterId
   * @returns {CombatEncounter|undefined}
   */
  getEncounter(encounterId) {
    return this._encounters.get(encounterId);
  }

  /**
   * Compute combat stats for an NPC / player from their genome, skills, and
   * optional equipment modifiers.
   *
   * @param {string} npcId
   * @param {{weaponModifier?: number, armorModifier?: number, weaponAccuracy?: number}} [equipment]
   * @returns {CombatStats}
   */
  getCombatStats(npcId, equipment = {}) {
    return this._deriveCombatStats(npcId, equipment);
  }

  /**
   * Return the AI strategy profile tracked for a given player / NPC.
   *
   * @param {string} playerId
   * @returns {StrategyProfile}
   */
  getStrategyProfile(playerId) {
    return this._getOrCreateProfile(playerId);
  }

  /**
   * Check whether a combatant currently has an injury debuff.
   *
   * @param {string} combatantId
   * @returns {{injured: boolean, penalty: number, remainingMs: number}}
   */
  getInjuryStatus(combatantId) {
    const injury = this._injuries.get(combatantId);
    if (!injury || Date.now() >= injury.until) {
      return { injured: false, penalty: 0, remainingMs: 0 };
    }
    return {
      injured: true,
      penalty: injury.penalty,
      remainingMs: injury.until - Date.now(),
    };
  }

  // ── Internal: stat derivation ───────────────────────────────────────────

  /**
   * Derive all combat stats for an NPC from their genome, skills, and
   * equipment modifiers.
   *
   * @private
   * @param {string} npcId
   * @param {{weaponModifier?: number, armorModifier?: number, weaponAccuracy?: number}} equipment
   * @returns {CombatStats}
   */
  _deriveCombatStats(npcId, equipment = {}) {
    const npc       = this._engine.getSystem('npc').getNPC(npcId);
    const genetics   = this._engine.getSystem('genetics');

    if (!npc) throw new Error(`NPC ${npcId} not found.`);

    const genome = npc.genome;

    // Raw gene values (0-255).
    const strength  = genetics.getTrait(genome, PHYSICAL_GENES.STRENGTH);
    const agility   = genetics.getTrait(genome, PHYSICAL_GENES.AGILITY);
    const endurance = genetics.getTrait(genome, PHYSICAL_GENES.ENDURANCE);
    const combatApt = genetics.getTrait(genome, APTITUDE_GENES.COMBAT);
    const piloting  = genetics.getTrait(genome, APTITUDE_GENES.PILOTING);
    const stealth   = genetics.getTrait(genome, APTITUDE_GENES.STEALTH);

    // NPC skill levels (0-100).
    const combatSkill  = (npc.skills && npc.skills.combat)  || 0;
    const pilotSkill   = (npc.skills && npc.skills.piloting) || 0;
    const stealthSkill = (npc.skills && npc.skills.stealth)  || 0;

    const weaponMod    = equipment.weaponModifier  ?? 1;
    const armorMod     = equipment.armorModifier   ?? 1;
    const weaponAcc    = equipment.weaponAccuracy   ?? 1;

    // Injury debuff.
    const injuryMul = this._getInjuryMultiplier(npcId);

    const attackPower    = (strength / 255) * (combatSkill / 100 + 0.1) * weaponMod * injuryMul;
    const defense        = (endurance / 255) * armorMod * injuryMul;
    const speed          = (agility / 255) * (pilotSkill / 100 + 0.1) * injuryMul;
    const accuracy       = (combatSkill / 100 + 0.01) * weaponAcc;
    const evasion        = (agility / 255) * (stealthSkill / 100 + 0.1);
    const maxHitPoints   = 100 + (endurance / 255) * 200;
    const criticalChance = (combatSkill / 100) * 0.15;

    return {
      attackPower:    Math.max(0, attackPower),
      defense:        Math.max(0, defense),
      speed:          Math.max(0, speed),
      accuracy:       clamp(accuracy, 0.01, 1),
      evasion:        clamp(evasion, 0, 0.95),
      maxHitPoints:   Math.round(maxHitPoints),
      criticalChance: clamp(criticalChance, 0, 1),
    };
  }

  /**
   * Build a Combatant record for an NPC / player.
   *
   * @private
   * @param {string} id
   * @param {string} team - 'attacker' | 'defender'
   * @returns {Combatant}
   */
  _buildCombatant(id, team) {
    const stats = this._deriveCombatStats(id);
    return {
      id,
      stats,
      hp: stats.maxHitPoints,
      team,
      alive: true,
      damageDealt: 0,
      damageReceived: 0,
      turnsSurvived: 0,
    };
  }

  /**
   * Return the injury multiplier for a combatant (1.0 if healthy).
   *
   * @private
   * @param {string} combatantId
   * @returns {number}
   */
  _getInjuryMultiplier(combatantId) {
    const injury = this._injuries.get(combatantId);
    if (!injury || Date.now() >= injury.until) return 1.0;
    return 1.0 - injury.penalty;
  }

  // ── Internal: turn resolution ───────────────────────────────────────────

  /**
   * Process a single turn of an active encounter.
   *
   * @private
   * @param {CombatEncounter} encounter
   */
  _processTurn(encounter) {
    encounter.turn += 1;

    const allAlive = this._getLivingCombatants(encounter);

    // Sort by speed (highest first → acts first).
    allAlive.sort((a, b) => b.stats.speed - a.stats.speed);

    /** @type {TurnResult[]} */
    const turnResults = [];

    for (const actor of allAlive) {
      // Actor might have been killed earlier this turn.
      if (!actor.alive) continue;

      const enemies = this._getEnemies(encounter, actor);
      if (enemies.length === 0) break;

      const stance = this._pickAIStance(actor, encounter);
      const target = this._pickTarget(actor, enemies, stance);

      const result = this._resolveAttack(encounter, actor, target, stance);
      turnResults.push(result);

      // Check if target was killed.
      if (target.hp <= 0) {
        target.alive = false;
        target.hp = 0;
      }

      actor.turnsSurvived = encounter.turn;
    }

    // Update survived count for everyone still alive.
    for (const c of allAlive) {
      if (c.alive) c.turnsSurvived = encounter.turn;
    }

    encounter.turnLog.push(...turnResults);

    this._engine.events.emit('combat:turn_resolved', {
      encounterId: encounter.id,
      turn: encounter.turn,
      results: turnResults,
    });

    // Check win condition: one side fully eliminated.
    const attackersAlive = encounter.attackers.some((c) => c.alive);
    const defendersAlive = encounter.defenders.some((c) => c.alive);

    if (!attackersAlive || !defendersAlive) {
      encounter.state = ENCOUNTER_STATE.RESOLVED;
      encounter.outcome = this._buildCombatOutcome(encounter, attackersAlive);
      this._applyOutcome(encounter);
    }
  }

  /**
   * Resolve a single attack action.
   *
   * @private
   * @param {CombatEncounter} encounter
   * @param {Combatant} actor
   * @param {Combatant} target
   * @param {string} stance
   * @returns {TurnResult}
   */
  _resolveAttack(encounter, actor, target, stance) {
    // Stance modifiers.
    let atkMod = 1.0;
    let defMod = 1.0;
    switch (stance) {
      case AI_STANCE.AGGRESSIVE:  atkMod = 1.25; defMod = 0.85; break;
      case AI_STANCE.DEFENSIVE:   atkMod = 0.75; defMod = 1.30; break;
      case AI_STANCE.COUNTER:     atkMod = 1.10; defMod = 1.10; break;
      case AI_STANCE.ATTRITION:   atkMod = 0.90; defMod = 1.15; break;
      case AI_STANCE.FLANKING:    atkMod = 1.20; defMod = 0.90; break;
      default: break; // balanced / adaptive: 1.0 × 1.0
    }

    const hitRoll = Math.random();
    const hitChance = clamp(actor.stats.accuracy - target.stats.evasion * 0.5, 0.05, 0.99);
    const hit = hitRoll < hitChance;

    let damage = 0;
    let critical = false;

    if (hit) {
      const rawDamage = actor.stats.attackPower * atkMod
        * (1 - (target.stats.defense * defMod) / 500)
        * (0.8 + Math.random() * 0.4); // 0.8-1.2 multiplier

      // Critical hit check.
      if (Math.random() < actor.stats.criticalChance) {
        damage = Math.round(rawDamage * 2);
        critical = true;

        this._engine.events.emit('combat:critical_hit', {
          encounterId: encounter.id,
          actorId: actor.id,
          targetId: target.id,
          damage,
        });
      } else {
        damage = Math.max(1, Math.round(rawDamage));
      }

      // Ensure minimum 1 damage on hit.
      damage = Math.max(1, damage);

      target.hp -= damage;
      target.damageReceived += damage;
      actor.damageDealt += damage;
    }

    return {
      turn: encounter.turn,
      actorId: actor.id,
      targetId: target.id,
      hit,
      damage,
      critical,
      stance,
    };
  }

  // ── Internal: AI strategy ─────────────────────────────────────────────

  /**
   * Get or initialise the strategy profile for a combatant.
   *
   * @private
   * @param {string} playerId
   * @returns {StrategyProfile}
   */
  _getOrCreateProfile(playerId) {
    if (!this._strategyProfiles.has(playerId)) {
      this._strategyProfiles.set(playerId, {
        aggressiveness: 0.5,
        targetPriority: 'weakest',
        abilityUsage: {},
        encounters: 0,
      });
    }
    return this._strategyProfiles.get(playerId);
  }

  /**
   * Update a player's strategy profile based on the most recent encounter.
   *
   * @private
   * @param {CombatEncounter} encounter
   */
  _updateStrategyProfiles(encounter) {
    const allCombatants = [...encounter.attackers, ...encounter.defenders];

    for (const combatant of allCombatants) {
      const profile = this._getOrCreateProfile(combatant.id);
      profile.encounters += 1;

      // Analyse turn log for this combatant.
      const actions = encounter.turnLog.filter((t) => t.actorId === combatant.id);
      if (actions.length === 0) continue;

      const aggressiveActions = actions.filter(
        (a) => a.stance === AI_STANCE.AGGRESSIVE || a.stance === AI_STANCE.FLANKING
      ).length;
      const ratio = aggressiveActions / actions.length;

      // Exponential moving average so recent fights weigh more.
      const alpha = 0.3;
      profile.aggressiveness = profile.aggressiveness * (1 - alpha) + ratio * alpha;

      // Determine target priority from most-targeted enemies.
      const targetCounts = {};
      for (const a of actions) {
        targetCounts[a.targetId] = (targetCounts[a.targetId] || 0) + 1;
      }
      const enemies = combatant.team === 'attacker' ? encounter.defenders : encounter.attackers;
      const mostTargeted = Object.entries(targetCounts)
        .sort((a, b) => b[1] - a[1])[0];

      if (mostTargeted) {
        const targetedEnemy = enemies.find((e) => e.id === mostTargeted[0]);
        if (targetedEnemy) {
          const weakest = [...enemies].sort((a, b) => a.stats.maxHitPoints - b.stats.maxHitPoints)[0];
          const strongest = [...enemies].sort((a, b) => b.stats.attackPower - a.stats.attackPower)[0];
          if (targetedEnemy.id === weakest?.id) profile.targetPriority = 'weakest';
          else if (targetedEnemy.id === strongest?.id) profile.targetPriority = 'strongest';
          else profile.targetPriority = 'closest';
        }
      }

      // Track stance usage as ability usage.
      for (const a of actions) {
        profile.abilityUsage[a.stance] = (profile.abilityUsage[a.stance] || 0) + 1;
      }
    }
  }

  /**
   * Select the AI stance for a combatant this turn, counter-adapting to
   * the opponent's tracked strategy profile.
   *
   * @private
   * @param {Combatant} actor
   * @param {CombatEncounter} encounter
   * @returns {string} An AI_STANCE value.
   */
  _pickAIStance(actor, encounter) {
    const enemies = this._getEnemies(encounter, actor);
    if (enemies.length === 0) return AI_STANCE.BALANCED;

    // Use the primary opponent's profile for counter-strategy.
    const primaryEnemy = enemies[0];
    const enemyProfile = this._getOrCreateProfile(primaryEnemy.id);

    if (enemyProfile.encounters < 2) {
      // Not enough data — use a balanced approach.
      return AI_STANCE.BALANCED;
    }

    // Counter-strategy selection.
    if (enemyProfile.aggressiveness > 0.65) {
      // Against aggressive players → defensive / counter-attack.
      return Math.random() < 0.5 ? AI_STANCE.DEFENSIVE : AI_STANCE.COUNTER;
    }
    if (enemyProfile.aggressiveness < 0.35) {
      // Against defensive players → attrition / flanking.
      return Math.random() < 0.5 ? AI_STANCE.ATTRITION : AI_STANCE.FLANKING;
    }

    // Balanced opponent → adaptive mirroring.
    return AI_STANCE.ADAPTIVE;
  }

  /**
   * Pick a target from a list of enemies based on AI stance.
   *
   * @private
   * @param {Combatant} actor
   * @param {Combatant[]} enemies
   * @param {string} stance
   * @returns {Combatant}
   */
  _pickTarget(actor, enemies, stance) {
    const profile = this._getOrCreateProfile(actor.id);

    switch (profile.targetPriority) {
      case 'weakest':
        return [...enemies].sort((a, b) => a.hp - b.hp)[0];
      case 'strongest':
        return [...enemies].sort((a, b) => b.stats.attackPower - a.stats.attackPower)[0];
      case 'closest':
      default:
        return enemies[0]; // default ordering
    }
  }

  // ── Internal: encounter helpers ─────────────────────────────────────────

  /**
   * Get all living combatants across both teams.
   *
   * @private
   * @param {CombatEncounter} encounter
   * @returns {Combatant[]}
   */
  _getLivingCombatants(encounter) {
    return [...encounter.attackers, ...encounter.defenders].filter((c) => c.alive);
  }

  /**
   * Get living enemies for a combatant.
   *
   * @private
   * @param {CombatEncounter} encounter
   * @param {Combatant} combatant
   * @returns {Combatant[]}
   */
  _getEnemies(encounter, combatant) {
    const pool = combatant.team === 'attacker' ? encounter.defenders : encounter.attackers;
    return pool.filter((c) => c.alive);
  }

  /**
   * Find a combatant by ID across both teams.
   *
   * @private
   * @param {CombatEncounter} encounter
   * @param {string} id
   * @returns {Combatant|undefined}
   */
  _findCombatant(encounter, id) {
    return [...encounter.attackers, ...encounter.defenders].find((c) => c.id === id);
  }

  // ── Internal: outcome building ──────────────────────────────────────────

  /**
   * Build the outcome object when one team is eliminated.
   *
   * @private
   * @param {CombatEncounter} encounter
   * @param {boolean} attackersWon
   * @returns {CombatOutcome}
   */
  _buildCombatOutcome(encounter, attackersWon) {
    const winners = attackersWon ? encounter.attackers : encounter.defenders;
    const losers  = attackersWon ? encounter.defenders : encounter.attackers;

    const difficulty = this._estimateDifficulty(losers);
    const xpReward   = Math.round(BASE_XP_REWARD * difficulty);
    const ecReward   = Math.round(BASE_EC_REWARD * difficulty);
    const loot       = this._rollLoot(encounter.id, difficulty);

    return {
      result: 'victory',
      winners: winners.map((c) => c.id),
      losers:  losers.map((c) => c.id),
      xpReward,
      ecReward,
      loot,
      reputationChange: REPUTATION_WIN,
    };
  }

  /**
   * Build the outcome object when a combatant flees.
   *
   * @private
   * @param {CombatEncounter} encounter
   * @param {string} fleeingId
   * @returns {CombatOutcome}
   */
  _buildFleeOutcome(encounter, fleeingId) {
    const fleeingCombatant = this._findCombatant(encounter, fleeingId);
    const isAttacker = fleeingCombatant.team === 'attacker';

    const winners = isAttacker ? encounter.defenders : encounter.attackers;
    const losers  = isAttacker ? encounter.attackers : encounter.defenders;

    return {
      result: 'flee',
      winners: winners.map((c) => c.id),
      losers:  losers.map((c) => c.id),
      xpReward: 0,
      ecReward: 0,
      loot: null,
      reputationChange: REPUTATION_FLEE,
    };
  }

  /**
   * Estimate opponent difficulty as a multiplier (1.0 = baseline).
   *
   * @private
   * @param {Combatant[]} opponents
   * @returns {number}
   */
  _estimateDifficulty(opponents) {
    if (opponents.length === 0) return 1;
    const avgHP = opponents.reduce((s, c) => s + c.stats.maxHitPoints, 0) / opponents.length;
    const avgAtk = opponents.reduce((s, c) => s + c.stats.attackPower, 0) / opponents.length;
    // Scale relative to a "baseline" combatant (200 HP, 0.5 attack).
    return clamp(((avgHP / 200) + (avgAtk / 0.5)) / 2, 0.5, 5.0);
  }

  // ── Internal: loot ──────────────────────────────────────────────────────

  /**
   * Roll loot for an encounter using a deterministic seeded PRNG.
   *
   * @private
   * @param {string} encounterId - Used as the random seed.
   * @param {number} difficulty   - Scales drop chance and quality.
   * @returns {{rarity: string, ecValue: number}|null}
   */
  _rollLoot(encounterId, difficulty) {
    const rng = mulberry32(seedFromUUID(encounterId));

    // Base drop chance: 40%, boosted by difficulty.
    const dropChance = clamp(0.40 + (difficulty - 1) * 0.10, 0.2, 0.90);
    if (rng() > dropChance) return null;

    // Weighted rarity selection.
    const totalWeight = DEFAULT_LOOT_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = rng() * totalWeight;

    for (const entry of DEFAULT_LOOT_TABLE) {
      roll -= entry.weight;
      if (roll <= 0) {
        return {
          rarity:  entry.rarity,
          ecValue: Math.round(entry.ecValue * difficulty),
        };
      }
    }

    // Fallback (should not happen).
    return { rarity: LOOT_RARITY.COMMON, ecValue: DEFAULT_LOOT_TABLE[0].ecValue };
  }

  // ── Internal: outcome application ───────────────────────────────────────

  /**
   * Apply a finalised outcome: distribute rewards, apply injuries,
   * update strategy profiles, and emit events.
   *
   * @private
   * @param {CombatEncounter} encounter
   */
  _applyOutcome(encounter) {
    const outcome = encounter.outcome;
    if (!outcome) return;

    // Update strategy profiles with data from this encounter.
    this._updateStrategyProfiles(encounter);

    const economy = this._tryGetSystem('economy');

    if (outcome.result === 'victory') {
      // Reward winners.
      for (const winnerId of outcome.winners) {
        if (economy && outcome.ecReward > 0) {
          economy.credit(winnerId, 'ec', outcome.ecReward);
        }
        this._engine.events.emit('player:combat_win', {
          encounterId: encounter.id,
          playerId: winnerId,
          xpReward: outcome.xpReward,
          ecReward: outcome.ecReward,
          loot: outcome.loot,
        });
      }

      // Injure losers.
      for (const loserId of outcome.losers) {
        this._injuries.set(loserId, {
          until: Date.now() + INJURY_DURATION_MS,
          penalty: INJURY_PENALTY,
        });
        this._engine.events.emit('player:combat_loss', {
          encounterId: encounter.id,
          playerId: loserId,
          injuryPenalty: INJURY_PENALTY,
          injuryDurationMs: INJURY_DURATION_MS,
        });
      }

      // Loot EC reward via economy system.
      if (economy && outcome.loot) {
        for (const winnerId of outcome.winners) {
          economy.credit(winnerId, 'ec', outcome.loot.ecValue);
        }
      }
    } else if (outcome.result === 'flee') {
      for (const loserId of outcome.losers) {
        this._engine.events.emit('player:combat_loss', {
          encounterId: encounter.id,
          playerId: loserId,
          fled: true,
          reputationChange: outcome.reputationChange,
        });
      }
    }

    this._engine.events.emit('combat:ended', {
      encounterId: encounter.id,
      outcome,
    });
  }

  /**
   * Safely attempt to fetch a sibling system (returns undefined if missing).
   *
   * @private
   * @param {string} name
   * @returns {Object|undefined}
   */
  _tryGetSystem(name) {
    try {
      return this._engine.getSystem(name);
    } catch {
      return undefined;
    }
  }
}
