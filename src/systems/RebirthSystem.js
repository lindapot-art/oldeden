import { randomUUID } from 'crypto';
import { APTITUDE_GENES } from './GeneticSystem.js';

export const DEATH_PATH = Object.freeze({
  STANDARD_REBIRTH: 'standard_rebirth',
  SOUL_FRACTURE: 'soul_fracture',
  ASCENSION: 'ascension',
});

export const REROLL_COSTS = Object.freeze([30, 60, 120, 250, 500]);
export const MAX_REROLLS = 5;

/**
 * RebirthSystem — the signature mechanic of Old Eden.
 *
 * When a player's avatar dies, they do not simply respawn.  Instead they are
 * entered into a **Rebirth Lottery** that selects a new host body from the
 * living NPC pool.
 *
 * Weighting:
 *   - Every NPC has a computed "status score" (wealth + skills + age)
 *   - The lottery is inversely weighted — lower-status NPCs appear far more
 *     often so that high-status NPCs remain rare and valuable prizes
 *   - Players may spend "Stellar Marks" (premium currency) to re-roll up to
 *     5 times per death (escalating cost), but never to cherry-pick a specific NPC
 *
 * What carries over after rebirth:
 *   - Player meta-reputation (faction standing modifiers)
 *   - NFT-locked items in the player's blockchain wallet
 *   - Premium subscription benefits
 *
 * What does NOT carry over:
 *   - In-game credits, ships, stations, gear (all belonged to the old avatar)
 *   - Skills and relationships of the old avatar
 *
 * The deceased player's avatar becomes a persistent NPC, continuing to live
 * in the world under AI control.
 */
export class RebirthSystem {
  async init(engine) {
    this._engine = engine;
    this._npcSystem = null; // resolved lazily after all systems init

    engine.events.on('player:death', (data) => this._onPlayerDeath(data));
    console.log('[RebirthSystem] Initialised.');
  }

  tick(_deltaMs) {}

  async destroy() {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Handle a player's death path choice.
   *
   * @param {string} playerId
   * @param {string} path        DEATH_PATH enum value
   * @param {object} character   The dying character object
   * @param {object} [options]
   * @param {boolean} [options.amplified=false]  For Soul Fracture: amplifier active?
   * @param {string}  [options.targetSystemId]   For Ascension: target star system
   * @returns {object}  Path-specific result
   */
  chooseDeathPath(playerId, path, character, options = {}) {
    switch (path) {
      case DEATH_PATH.STANDARD_REBIRTH: {
        // Standard: promote to NPC + enter lottery
        const npcSystem = this._engine.getSystem('npc');
        npcSystem.promoteToNPC(character.id, {
          causeOfDeath: options.causeOfDeath ?? 'death',
          sectorId: character.sectorId,
        });
        this._engine.events.emit('player:rebirth_ready', { playerId, characterId: character.id });
        return { path, playerId };
      }
      case DEATH_PATH.SOUL_FRACTURE: {
        // Fracture: shatter into shards (fractured chars do NOT become NPCs)
        const fracture = this._engine.getSystem('fracture');
        if (!fracture) throw new Error('[RebirthSystem] SoulFractureSystem not registered.');
        const result = fracture.executeFracture(playerId, character, {
          amplified: options.amplified ?? false,
        });
        // Player still rebirths after fracture
        this._engine.events.emit('player:rebirth_ready', { playerId, characterId: character.id });
        return { path, playerId, fractureResult: result };
      }
      case DEATH_PATH.ASCENSION: {
        const ascension = this._engine.getSystem('ascension');
        if (!ascension) throw new Error('[RebirthSystem] AscensionSystem not registered.');
        const result = ascension.attemptTrial(playerId, character, {
          targetSystemId: options.targetSystemId,
        });
        if (!result.success) {
          // Failed ascension: standard rebirth, attempt becomes NPC story
          const npcSystem = this._engine.getSystem('npc');
          npcSystem.promoteToNPC(character.id, {
            causeOfDeath: 'failed_ascension',
            sectorId: character.sectorId,
          });
          this._engine.events.emit('player:rebirth_ready', { playerId, characterId: character.id });
        }
        return { path, playerId, ascensionResult: result };
      }
      default:
        throw new Error(`[RebirthSystem] Unknown death path: ${path}`);
    }
  }

  /**
   * Get the SM cost for a specific re-roll number (1-indexed).
   * @param {number} rerollNumber  Which re-roll (1 = first, 2 = second, etc.)
   * @param {string} [playerId]    Optional: to check subscription for free re-rolls
   * @returns {{ cost: number, isFree: boolean }}
   */
  computeRerollCost(rerollNumber, playerId) {
    if (rerollNumber < 1 || rerollNumber > MAX_REROLLS) {
      throw new RangeError(`Re-roll number must be 1–${MAX_REROLLS}.`);
    }

    // Check subscription tier for free re-rolls
    if (playerId) {
      const economy = this._engine.getSystem('economy');
      if (economy) {
        const tier = economy.getSubscription(playerId);
        const freeRolls = this._freeRerollsForTier(tier);
        if (rerollNumber <= freeRolls) {
          return { cost: 0, isFree: true };
        }
      }
    }

    return { cost: REROLL_COSTS[rerollNumber - 1], isFree: false };
  }

  /**
   * Perform a rebirth lottery draw for a deceased player.
   *
   * @param {string} playerId
   * @param {object[]} npcPool   Array of NPC objects from NPCSystem
   * @param {object}  [options]
   * @param {number}  [options.rerollsRemaining=0]  Number of allowed re-rolls
   * @returns {RebirthResult}
   */
  performLottery(playerId, npcPool, { rerollsRemaining = 0 } = {}) {
    if (!npcPool || npcPool.length === 0) {
      throw new Error('[RebirthSystem] NPC pool is empty — cannot perform rebirth lottery.');
    }

    const weights = npcPool.map((npc) => this._inverseStatusWeight(npc));
    const chosen = this._weightedRandom(npcPool, weights);

    return {
      lotteryId: randomUUID(),
      playerId,
      chosenNpc: chosen,
      rerollsRemaining,
      timestamp: Date.now(),
    };
  }

  /**
   * Compute the "status score" of an NPC (higher = rarer lottery draw).
   * Score is normalised to [0, 1].
   *
   * Status components:
   *   - Wealth (in-game credits, normalised)
   *   - Skill average (derived from genome aptitude genes)
   *   - Age (older = more developed)
   *   - Reputation (faction standing)
   *
   * @param {object} npc
   * @returns {number}
   */
  computeStatusScore(npc) {
    const wealthScore   = Math.min(npc.credits / 1_000_000, 1); // cap at 1M credits
    const skillScore    = this._averageAptitude(npc.genome);
    const ageScore      = Math.min(npc.ageYears / 80, 1);
    const repScore      = Math.min((npc.reputation ?? 0) / 1000, 1);

    return (wealthScore * 0.35 + skillScore * 0.35 + ageScore * 0.15 + repScore * 0.15);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _freeRerollsForTier(tier) {
    switch (tier) {
      case 'pioneer':  return 1;
      case 'vanguard': return 2;
      case 'overlord': return 2;
      default:         return 0;
    }
  }

  _onPlayerDeath({ playerId, characterId, causeOfDeath, sectorId }) {
    console.log(`[RebirthSystem] Player ${playerId} died (char: ${characterId}, cause: ${causeOfDeath}).`);

    // Note: NPC promotion is handled by chooseDeathPath() per-path, not here.
    // (SOUL_FRACTURE path does NOT promote to NPC; STANDARD/ASCENSION do.)

    // Emit ready-for-rebirth event — server will orchestrate the client UX
    this._engine.events.emit('player:rebirth_ready', { playerId, characterId });
  }

  /**
   * Inverse weighting: lower status → higher weight (more common draw).
   * Uses an exponential decay so that truly high-status NPCs are very rare.
   *
   * @param {object} npc
   * @returns {number}
   */
  _inverseStatusWeight(npc) {
    const status = this.computeStatusScore(npc);
    // w = e^(-6 * status)  → status=0 gives w≈1, status=1 gives w≈0.0025
    return Math.exp(-6 * status);
  }

  /**
   * Weighted random selection from an array.
   * @param {object[]} items
   * @param {number[]} weights
   * @returns {object}
   */
  _weightedRandom(items, weights) {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /**
   * Average the aptitude gene values across all named aptitude loci.
   * @param {Uint8Array} genome
   * @returns {number}  0–1
   */
  _averageAptitude(genome) {
    if (!genome) return 0;
    const loci = Object.values(APTITUDE_GENES);
    const sum = loci.reduce((acc, idx) => acc + (genome[idx] ?? 0), 0);
    return sum / (loci.length * 255);
  }
}

/**
 * @typedef {object} RebirthResult
 * @property {string}   lotteryId
 * @property {string}   playerId
 * @property {object}   chosenNpc
 * @property {number}   rerollsRemaining
 * @property {number}   timestamp
 */

/**
 * @typedef {typeof DEATH_PATH} DeathPath
 * Enum of supported death paths: STANDARD_REBIRTH, SOUL_FRACTURE, ASCENSION.
 */

/**
 * @typedef {typeof REROLL_COSTS} RerollCosts
 * Escalating SM costs for re-rolls: [30, 60, 120, 250, 500].
 */
