import { randomUUID } from 'crypto';

/**
 * CombatSystem — real-time and turn-resolved combat for Old Eden.
 *
 * Handles all offensive/defensive interactions between entities in the
 * blockchain-native AI-driven space MMO.  Supports five weapon classes
 * and five armor classes with a rock-paper-scissors-style effectiveness
 * matrix, plus damage-over-time effects, shields, critical hits, and a
 * rolling combat log.
 *
 * Weapon Types:
 *  - Laser     — high accuracy, strong vs shields, weak vs heavy armor
 *  - Ballistic — reliable damage, strong vs light armor, weak vs shields
 *  - Missile   — heavy burst, strong vs heavy armor, weak vs evasive targets
 *  - Plasma    — balanced, strong vs medium armor, weak vs shields
 *  - Melee     — close-range, ignores shields, weak vs all armor
 *
 * Armour Types:
 *  - None   — no protection
 *  - Light  — minimal protection, high evasion bonus
 *  - Medium — balanced protection
 *  - Heavy  — high protection, evasion penalty
 *  - Shield — energy barrier with regeneration
 */

// ── Constants & Enums ──────────────────────────────────────────────────────────

export const WEAPON_TYPE = Object.freeze({
  LASER:     'laser',
  BALLISTIC: 'ballistic',
  MISSILE:   'missile',
  PLASMA:    'plasma',
  MELEE:     'melee',
  RAILGUN:   'railgun',
});

export const ARMOR_TYPE = Object.freeze({
  NONE:   'none',
  LIGHT:  'light',
  MEDIUM: 'medium',
  HEAVY:  'heavy',
  SHIELD: 'shield',
});

export const DOT_TYPE = Object.freeze({
  RADIATION_BURN: 'radiation_burn',
  FIRE:           'fire',
  TOXIN:          'toxin',
  BLEED:          'bleed',
});

/**
 * Type effectiveness matrix — multiplier applied to base damage.
 * Rows = weapon type, Columns = armor type.
 * Values > 1.0 are super-effective, < 1.0 are resisted.
 *
 * @type {Record<string, Record<string, number>>}
 */
export const TYPE_EFFECTIVENESS = Object.freeze({
  [WEAPON_TYPE.LASER]: {
    [ARMOR_TYPE.NONE]:   1.0,
    [ARMOR_TYPE.LIGHT]:  1.0,
    [ARMOR_TYPE.MEDIUM]: 0.9,
    [ARMOR_TYPE.HEAVY]:  0.6,
    [ARMOR_TYPE.SHIELD]: 1.5,
  },
  [WEAPON_TYPE.BALLISTIC]: {
    [ARMOR_TYPE.NONE]:   1.0,
    [ARMOR_TYPE.LIGHT]:  1.3,
    [ARMOR_TYPE.MEDIUM]: 1.0,
    [ARMOR_TYPE.HEAVY]:  0.8,
    [ARMOR_TYPE.SHIELD]: 0.5,
  },
  [WEAPON_TYPE.MISSILE]: {
    [ARMOR_TYPE.NONE]:   1.0,
    [ARMOR_TYPE.LIGHT]:  0.9,
    [ARMOR_TYPE.MEDIUM]: 1.1,
    [ARMOR_TYPE.HEAVY]:  1.5,
    [ARMOR_TYPE.SHIELD]: 0.7,
  },
  [WEAPON_TYPE.PLASMA]: {
    [ARMOR_TYPE.NONE]:   1.0,
    [ARMOR_TYPE.LIGHT]:  1.1,
    [ARMOR_TYPE.MEDIUM]: 1.4,
    [ARMOR_TYPE.HEAVY]:  1.0,
    [ARMOR_TYPE.SHIELD]: 0.6,
  },
  [WEAPON_TYPE.MELEE]: {
    [ARMOR_TYPE.NONE]:   1.2,
    [ARMOR_TYPE.LIGHT]:  0.8,
    [ARMOR_TYPE.MEDIUM]: 0.7,
    [ARMOR_TYPE.HEAVY]:  0.5,
    [ARMOR_TYPE.SHIELD]: 1.0,   // melee bypasses shields (handled in resolve)
  },
  [WEAPON_TYPE.RAILGUN]: {
    [ARMOR_TYPE.NONE]:   1.0,
    [ARMOR_TYPE.LIGHT]:  1.4,   // penetrates light armor
    [ARMOR_TYPE.MEDIUM]: 1.3,   // strong vs medium
    [ARMOR_TYPE.HEAVY]:  1.6,   // devastating vs heavy armor
    [ARMOR_TYPE.SHIELD]: 1.2,   // pierces shields
  },
});

/** Base critical-hit chance per weapon type. */
const WEAPON_CRIT_CHANCE = {
  [WEAPON_TYPE.LASER]:     0.05,
  [WEAPON_TYPE.BALLISTIC]: 0.07,
  [WEAPON_TYPE.MISSILE]:   0.03,
  [WEAPON_TYPE.PLASMA]:    0.06,
  [WEAPON_TYPE.MELEE]:     0.10,
  [WEAPON_TYPE.RAILGUN]:   0.12,  // high crit chance
};

/** Base critical-hit damage multiplier. */
const BASE_CRIT_MULTIPLIER = 2.0;

/** Flat armor damage-reduction values per armor type. */
const ARMOR_FLAT_REDUCTION = {
  [ARMOR_TYPE.NONE]:   0,
  [ARMOR_TYPE.LIGHT]:  3,
  [ARMOR_TYPE.MEDIUM]: 8,
  [ARMOR_TYPE.HEAVY]:  15,
  [ARMOR_TYPE.SHIELD]: 0,   // shields absorb, no flat reduction
};

/** DoT effect presets — tick damage per second, default duration in ms. */
const DOT_PRESETS = {
  [DOT_TYPE.RADIATION_BURN]: { tickDamage: 4,  durationMs: 8000,  tickIntervalMs: 1000 },
  [DOT_TYPE.FIRE]:           { tickDamage: 6,  durationMs: 5000,  tickIntervalMs: 1000 },
  [DOT_TYPE.TOXIN]:          { tickDamage: 3,  durationMs: 10000, tickIntervalMs: 2000 },
  [DOT_TYPE.BLEED]:          { tickDamage: 5,  durationMs: 6000,  tickIntervalMs: 1000 },
};

/** Default shield recharge delay after taking damage (ms). */
const DEFAULT_SHIELD_RECHARGE_DELAY_MS = 3000;

/** Maximum number of combat log entries retained per instance. */
const MAX_COMBAT_LOG_SIZE = 200;

// ── System ─────────────────────────────────────────────────────────────────────

export class CombatSystem {
  /**
   * Initialise the combat system.
   * @param {object} engine  The game engine instance.
   */
  async init(engine) {
    this._engine = engine;

    /** @type {Map<string, ShieldState>} entityId → shield state */
    this._shields = new Map();

    /** @type {Map<string, DotEffect[]>} entityId → active DoT effects */
    this._dots = new Map();

    /** @type {CombatLogEntry[]} rolling combat log */
    this._combatLog = [];

    /** Maximum log entries kept in memory. */
    this._maxLogSize = MAX_COMBAT_LOG_SIZE;

    console.log('[CombatSystem] Initialised.');
  }

  /**
   * Per-frame update — processes DoT ticks and shield regeneration.
   * @param {number} deltaMs  Milliseconds since last tick.
   */
  tick(deltaMs) {
    this._tickDots(deltaMs);
    this._tickShields(deltaMs);
  }

  /** Cleanup resources. */
  async destroy() {
    this._shields.clear();
    this._dots.clear();
    this._combatLog.length = 0;
  }

  // ── 1. Damage Calculation ──────────────────────────────────────────────────

  /**
   * Calculate raw damage before hit/miss resolution.
   *
   * Formula:
   *   effectiveDamage = (baseDamage × typeMultiplier − flatReduction) × critMultiplier
   *   Minimum damage is always 1 (attacks that land always scratch).
   *
   * @param {number} baseDamage   Weapon base damage.
   * @param {string} weaponType   WEAPON_TYPE value.
   * @param {string} armorType    ARMOR_TYPE value.
   * @param {boolean} [isCritical=false]  Whether this hit is a critical.
   * @returns {number} Final damage value (≥ 1).
   */
  calculateDamage(baseDamage, weaponType, armorType, isCritical = false) {
    const typeMult = this._getEffectiveness(weaponType, armorType);
    const flatReduc = ARMOR_FLAT_REDUCTION[armorType] ?? 0;
    const critMult = isCritical ? BASE_CRIT_MULTIPLIER : 1.0;

    const raw = (baseDamage * typeMult - flatReduc) * critMult;
    return Math.max(1, Math.round(raw));
  }

  // ── 2. Hit / Miss Resolution ───────────────────────────────────────────────

  /**
   * Determine whether an attack hits.
   *
   * hitChance = clamp(accuracy − evasion + 50, 5, 95)
   * A random roll [0, 100) below hitChance means a hit.
   *
   * @param {number} accuracy  Attacker accuracy (0–100).
   * @param {number} evasion   Defender evasion (0–100).
   * @returns {{ hit: boolean, roll: number, hitChance: number }}
   */
  rollHit(accuracy, evasion) {
    const hitChance = Math.min(95, Math.max(5, accuracy - evasion + 50));
    const roll = Math.random() * 100;
    return { hit: roll < hitChance, roll, hitChance };
  }

  // ── 3. Critical Hit System ─────────────────────────────────────────────────

  /**
   * Roll for a critical hit.
   *
   * critChance = baseCritChance(weaponType) + bonusCritChance
   * Clamped to [0, 0.75] to prevent guaranteed crits.
   *
   * @param {string} weaponType       WEAPON_TYPE value.
   * @param {number} [bonusCritChance=0]  Additional crit chance (0–1).
   * @returns {{ critical: boolean, critChance: number }}
   */
  rollCritical(weaponType, bonusCritChance = 0) {
    const base = WEAPON_CRIT_CHANCE[weaponType] ?? 0.05;
    const critChance = Math.min(0.75, Math.max(0, base + bonusCritChance));
    const roll = Math.random();
    return { critical: roll < critChance, critChance };
  }

  /**
   * Get the critical-hit damage multiplier.
   * @returns {number}
   */
  getCritMultiplier() {
    return BASE_CRIT_MULTIPLIER;
  }

  // ── 4. Full Attack Resolution ──────────────────────────────────────────────

  /**
   * Resolve a complete attack between an attacker and a defender.
   *
   * @param {AttackParams} params
   * @returns {AttackResult}
   */
  resolveAttack({
    attackerId,
    defenderId,
    baseDamage,
    weaponType,
    armorType,
    accuracy,
    evasion,
    bonusCritChance = 0,
  }) {
    // Step 1 — Hit / Miss
    const hitResult = this.rollHit(accuracy, evasion);
    if (!hitResult.hit) {
      const result = {
        attackerId,
        defenderId,
        hit: false,
        damage: 0,
        critical: false,
        shieldAbsorbed: 0,
        hitChance: hitResult.hitChance,
        roll: hitResult.roll,
      };
      this._log('attack_miss', result);
      this._engine.events.emit('combat:miss', result);
      return result;
    }

    // Step 2 — Critical roll
    const critResult = this.rollCritical(weaponType, bonusCritChance);

    // Step 3 — Damage calculation
    let damage = this.calculateDamage(baseDamage, weaponType, armorType, critResult.critical);

    // Step 4 — Shield absorption (melee bypasses shields)
    let shieldAbsorbed = 0;
    if (weaponType !== WEAPON_TYPE.MELEE) {
      shieldAbsorbed = this._absorbWithShield(defenderId, damage);
      damage -= shieldAbsorbed;
    }

    const result = {
      attackerId,
      defenderId,
      hit: true,
      damage,
      critical: critResult.critical,
      shieldAbsorbed,
      hitChance: hitResult.hitChance,
      roll: hitResult.roll,
    };

    this._log(critResult.critical ? 'attack_critical' : 'attack_hit', result);
    this._engine.events.emit('combat:hit', result);
    return result;
  }

  // ── 5. Damage-over-Time Effects ────────────────────────────────────────────

  /**
   * Apply a DoT effect to an entity.
   *
   * @param {string} entityId   The target entity.
   * @param {string} dotType    DOT_TYPE value.
   * @param {object} [overrides]
   * @param {number} [overrides.tickDamage]      Damage per tick.
   * @param {number} [overrides.durationMs]      Total duration in ms.
   * @param {number} [overrides.tickIntervalMs]  Time between ticks in ms.
   * @param {string} [overrides.sourceId]        Who applied the effect.
   * @returns {DotEffect}
   */
  applyDot(entityId, dotType, overrides = {}) {
    const preset = DOT_PRESETS[dotType];
    if (!preset) throw new Error(`Unknown DoT type: ${dotType}`);

    const effect = {
      id: randomUUID(),
      entityId,
      dotType,
      tickDamage:     overrides.tickDamage     ?? preset.tickDamage,
      durationMs:     overrides.durationMs     ?? preset.durationMs,
      tickIntervalMs: overrides.tickIntervalMs ?? preset.tickIntervalMs,
      sourceId:       overrides.sourceId       ?? null,
      elapsedMs: 0,
      timeSinceLastTick: 0,
    };

    if (!this._dots.has(entityId)) {
      this._dots.set(entityId, []);
    }
    this._dots.get(entityId).push(effect);

    this._log('dot_applied', { entityId, dotType, effect });
    this._engine.events.emit('combat:dot_applied', { entityId, dotType, effectId: effect.id });
    return effect;
  }

  /**
   * Get all active DoT effects on an entity.
   * @param {string} entityId
   * @returns {DotEffect[]}
   */
  getActiveDots(entityId) {
    return this._dots.get(entityId) ?? [];
  }

  /**
   * Remove all DoT effects from an entity (e.g. cleanse).
   * @param {string} entityId
   * @returns {number}  Number of effects removed.
   */
  cleanseDots(entityId) {
    const effects = this._dots.get(entityId);
    if (!effects || effects.length === 0) return 0;
    const count = effects.length;
    this._dots.delete(entityId);
    this._engine.events.emit('combat:dots_cleansed', { entityId, count });
    return count;
  }

  // ── 6. Shield System ───────────────────────────────────────────────────────

  /**
   * Register or update a shield for an entity.
   *
   * @param {string} entityId
   * @param {object} config
   * @param {number} config.maxCapacity       Maximum shield hit points.
   * @param {number} config.regenRate         HP regenerated per second.
   * @param {number} [config.rechargeDelayMs] Delay before regen resumes after damage.
   * @returns {ShieldState}
   */
  registerShield(entityId, { maxCapacity, regenRate, rechargeDelayMs }) {
    const state = {
      entityId,
      maxCapacity,
      currentHp: maxCapacity,
      regenRate,
      rechargeDelayMs: rechargeDelayMs ?? DEFAULT_SHIELD_RECHARGE_DELAY_MS,
      timeSinceDamageMs: Infinity,   // starts fully recharged
    };
    this._shields.set(entityId, state);
    return state;
  }

  /**
   * Get the current shield state for an entity.
   * @param {string} entityId
   * @returns {ShieldState|undefined}
   */
  getShield(entityId) {
    return this._shields.get(entityId);
  }

  /**
   * Remove a shield registration entirely.
   * @param {string} entityId
   */
  removeShield(entityId) {
    this._shields.delete(entityId);
  }

  // ── 7. Combat Log ──────────────────────────────────────────────────────────

  /**
   * Retrieve the most recent N combat log entries.
   * @param {number} [count]  Number of entries (defaults to all).
   * @returns {CombatLogEntry[]}
   */
  getCombatLog(count) {
    if (count === undefined) return [...this._combatLog];
    return this._combatLog.slice(-count);
  }

  /**
   * Clear the combat log.
   */
  clearCombatLog() {
    this._combatLog.length = 0;
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  /**
   * Look up the type-effectiveness multiplier.
   * @param {string} weaponType
   * @param {string} armorType
   * @returns {number}
   */
  _getEffectiveness(weaponType, armorType) {
    return TYPE_EFFECTIVENESS[weaponType]?.[armorType] ?? 1.0;
  }

  /**
   * Absorb damage through a shield, returning the amount absorbed.
   * @param {string} entityId
   * @param {number} damage
   * @returns {number} absorbed
   */
  _absorbWithShield(entityId, damage) {
    const shield = this._shields.get(entityId);
    if (!shield || shield.currentHp <= 0) return 0;

    const absorbed = Math.min(shield.currentHp, damage);
    shield.currentHp -= absorbed;
    shield.timeSinceDamageMs = 0;   // reset recharge delay

    if (shield.currentHp <= 0) {
      this._engine.events.emit('combat:shield_broken', { entityId });
    }

    return absorbed;
  }

  /**
   * Process DoT ticks for all entities.
   * @param {number} deltaMs
   */
  _tickDots(deltaMs) {
    for (const [entityId, effects] of this._dots.entries()) {
      let i = effects.length;
      while (i--) {
        const effect = effects[i];
        effect.elapsedMs += deltaMs;
        effect.timeSinceLastTick += deltaMs;

        // Check for ticks
        while (effect.timeSinceLastTick >= effect.tickIntervalMs) {
          effect.timeSinceLastTick -= effect.tickIntervalMs;

          this._engine.events.emit('combat:dot_tick', {
            entityId,
            effectId: effect.id,
            dotType: effect.dotType,
            damage: effect.tickDamage,
          });
        }

        // Expire finished effects
        if (effect.elapsedMs >= effect.durationMs) {
          effects.splice(i, 1);
          this._engine.events.emit('combat:dot_expired', {
            entityId,
            effectId: effect.id,
            dotType: effect.dotType,
          });
        }
      }

      // Clean up empty arrays to prevent memory leak
      if (effects.length === 0) {
        this._dots.delete(entityId);
      }
    }
  }

  /**
   * Regenerate shields that are past their recharge delay.
   * @param {number} deltaMs
   */
  _tickShields(deltaMs) {
    for (const shield of this._shields.values()) {
      shield.timeSinceDamageMs += deltaMs;

      if (
        shield.timeSinceDamageMs >= shield.rechargeDelayMs &&
        shield.currentHp < shield.maxCapacity
      ) {
        const regenAmount = shield.regenRate * (deltaMs / 1000);
        shield.currentHp = Math.min(shield.maxCapacity, shield.currentHp + regenAmount);
      }
    }
  }

  /**
   * Append an entry to the combat log.
   * @param {string} type   Event type label.
   * @param {object} data   Arbitrary payload.
   */
  _log(type, data) {
    this._combatLog.push({ type, data, timestamp: Date.now() });
    if (this._combatLog.length > this._maxLogSize) {
      this._combatLog.shift();
    }
  }
}

// ── Typedefs ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} ShieldState
 * @property {string} entityId
 * @property {number} maxCapacity
 * @property {number} currentHp
 * @property {number} regenRate          HP per second.
 * @property {number} rechargeDelayMs    Delay before regen starts after damage.
 * @property {number} timeSinceDamageMs  Time elapsed since last shield damage.
 */

/**
 * @typedef {object} DotEffect
 * @property {string}      id
 * @property {string}      entityId
 * @property {string}      dotType
 * @property {number}      tickDamage
 * @property {number}      durationMs
 * @property {number}      tickIntervalMs
 * @property {string|null} sourceId
 * @property {number}      elapsedMs
 * @property {number}      timeSinceLastTick
 */

/**
 * @typedef {object} CombatLogEntry
 * @property {string} type
 * @property {object} data
 * @property {number} timestamp
 */

/**
 * @typedef {object} AttackParams
 * @property {string} attackerId
 * @property {string} defenderId
 * @property {number} baseDamage
 * @property {string} weaponType
 * @property {string} armorType
 * @property {number} accuracy
 * @property {number} evasion
 * @property {number} [bonusCritChance]
 */

/**
 * @typedef {object} AttackResult
 * @property {string}  attackerId
 * @property {string}  defenderId
 * @property {boolean} hit
 * @property {number}  damage
 * @property {boolean} critical
 * @property {number}  shieldAbsorbed
 * @property {number}  hitChance
 * @property {number}  roll
 */
