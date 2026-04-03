import { randomUUID } from 'crypto';
import { APTITUDE_GENES, PHYSICAL_GENES } from './GeneticSystem.js';

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
 *     3 times per death, but never to cherry-pick a specific NPC
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

  _onPlayerDeath({ playerId, characterId, causeOfDeath, sectorId }) {
    console.log(`[RebirthSystem] Player ${playerId} died (char: ${characterId}, cause: ${causeOfDeath}).`);

    // Promote old character to permanent NPC
    const npcSystem = this._engine.getSystem('npc');
    npcSystem.promoteToNPC(characterId, { causeOfDeath, sectorId });

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
