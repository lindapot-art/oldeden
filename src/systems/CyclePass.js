import { randomUUID } from 'crypto';

/**
 * CyclePass — the season/battle pass system of Old Eden.
 *
 * Each "Cycle" (season) lasts 8 weeks and is themed around a major universe
 * event.  Players earn Cycle XP through gameplay; XP unlocks rewards on two
 * tracks:
 *
 *   - **Free Track**: Basic cosmetics, EC rewards, 1 free Shard Detector
 *   - **Premium Track** (1500 SM or $14.99): Exclusive ship skins, character
 *     cosmetics, portrait frames, SM bonuses, guaranteed rare shard at end
 *
 * Vanguard and Overlord subscribers receive the Premium Track for free.
 */

const CYCLE_DURATION_MS = 8 * 7 * 24 * 60 * 60 * 1000; // 8 weeks
const MAX_TIER = 50;
const XP_PER_TIER = 1000;
const PREMIUM_COST_SM = 1500;

export { CYCLE_DURATION_MS, MAX_TIER, XP_PER_TIER, PREMIUM_COST_SM };

export class CyclePass {
  async init(engine) {
    this._engine = engine;
    /** @type {CycleSeason|null} */
    this._currentSeason = null;
    /** @type {Map<string, PlayerProgress>} playerId → progress */
    this._playerProgress = new Map();

    console.log('[CyclePass] Initialised.');
  }

  tick(_deltaMs) {
    // Check if current season has expired
    if (this._currentSeason && Date.now() >= this._currentSeason.endsAt) {
      this._endSeason();
    }
  }

  async destroy() {
    this._playerProgress.clear();
    this._currentSeason = null;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Start a new Cycle season.
   * @param {object} params
   * @param {string} params.name     Season name (e.g., "The Fracture Wars")
   * @param {string} [params.theme]  Visual/narrative theme
   * @returns {CycleSeason}
   */
  startSeason({ name, theme = 'default' }) {
    if (this._currentSeason) {
      this._endSeason();
    }

    const now = Date.now();
    this._currentSeason = {
      id: randomUUID(),
      name,
      theme,
      startedAt: now,
      endsAt: now + CYCLE_DURATION_MS,
      isActive: true,
    };
    this._playerProgress.clear();

    this._engine.events.emit('cycle:season_started', {
      seasonId: this._currentSeason.id,
      name,
      theme,
      endsAt: this._currentSeason.endsAt,
    });

    console.log(`[CyclePass] Season "${name}" started.`);
    return { ...this._currentSeason };
  }

  /**
   * Award Cycle XP to a player.
   * @param {string} playerId
   * @param {number} xp
   * @returns {{ currentXp: number, currentTier: number, tierUp: boolean }}
   */
  awardXp(playerId, xp) {
    if (!this._currentSeason?.isActive) {
      throw new Error('[CyclePass] No active season.');
    }
    if (xp <= 0) throw new RangeError('XP must be positive.');

    const progress = this._getProgress(playerId);
    const oldTier = progress.tier;
    progress.xp += xp;
    progress.tier = Math.min(MAX_TIER, Math.floor(progress.xp / XP_PER_TIER));

    const tierUp = progress.tier > oldTier;
    if (tierUp) {
      this._engine.events.emit('cycle:tier_up', {
        playerId,
        tier: progress.tier,
        seasonId: this._currentSeason.id,
      });
    }

    return { currentXp: progress.xp, currentTier: progress.tier, tierUp };
  }

  /**
   * Unlock the premium track for a player.
   * @param {string} playerId
   * @returns {boolean}  true if successfully unlocked
   */
  unlockPremium(playerId) {
    const progress = this._getProgress(playerId);
    if (progress.isPremium) return true; // already unlocked

    const economy = this._engine.getSystem('economy');
    if (!economy) {
      throw new Error('[CyclePass] EconomySystem not available.');
    }

    const success = economy.debit(playerId, 'sm', PREMIUM_COST_SM);
    if (success) {
      progress.isPremium = true;
      this._engine.events.emit('cycle:premium_unlocked', {
        playerId,
        seasonId: this._currentSeason?.id,
      });
    }
    return success;
  }

  /**
   * Get a player's current Cycle progress.
   * @param {string} playerId
   * @returns {PlayerProgress}
   */
  getPlayerProgress(playerId) {
    return { ...this._getProgress(playerId) };
  }

  /**
   * Get the current season info.
   * @returns {CycleSeason|null}
   */
  getCurrentSeason() {
    return this._currentSeason ? { ...this._currentSeason } : null;
  }

  /**
   * Get rewards for a given tier.
   * @param {number} tier
   * @param {boolean} isPremium
   * @returns {TierReward}
   */
  getTierRewards(tier, isPremium = false) {
    const free = this._freeReward(tier);
    const premium = isPremium ? this._premiumReward(tier) : null;
    return { tier, free, premium };
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _getProgress(playerId) {
    if (!this._playerProgress.has(playerId)) {
      this._playerProgress.set(playerId, {
        playerId,
        xp: 0,
        tier: 0,
        isPremium: false,
        claimedTiers: [],
      });
    }
    return this._playerProgress.get(playerId);
  }

  _endSeason() {
    if (!this._currentSeason) return;
    this._currentSeason.isActive = false;
    this._engine.events.emit('cycle:season_ended', {
      seasonId: this._currentSeason.id,
      name: this._currentSeason.name,
    });
    console.log(`[CyclePass] Season "${this._currentSeason.name}" ended.`);
  }

  _freeReward(tier) {
    if (tier <= 0) return null;
    if (tier % 10 === 0) return { type: 'shard_detector', quantity: 1 };
    if (tier % 5 === 0) return { type: 'ec', amount: 5000 };
    return { type: 'cosmetic', item: `free_cosmetic_tier_${tier}` };
  }

  _premiumReward(tier) {
    if (tier <= 0) return null;
    if (tier === MAX_TIER) return { type: 'rare_shard', description: 'Guaranteed rare shard' };
    if (tier % 10 === 0) return { type: 'sm', amount: 200 };
    if (tier % 5 === 0) return { type: 'ship_skin', item: `premium_skin_tier_${tier}` };
    return { type: 'cosmetic', item: `premium_cosmetic_tier_${tier}` };
  }
}

/**
 * @typedef {object} CycleSeason
 * @property {string}  id
 * @property {string}  name
 * @property {string}  theme
 * @property {number}  startedAt
 * @property {number}  endsAt
 * @property {boolean} isActive
 */

/**
 * @typedef {object} PlayerProgress
 * @property {string}   playerId
 * @property {number}   xp
 * @property {number}   tier
 * @property {boolean}  isPremium
 * @property {number[]} claimedTiers
 */

/**
 * @typedef {object} TierReward
 * @property {number}      tier
 * @property {object|null} free
 * @property {object|null} premium
 */
