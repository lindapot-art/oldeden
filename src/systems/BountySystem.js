/**
 * BountySystem — Dynamic bounty boards for Old Eden.
 *
 * Generates procedural bounty contracts that reward players for killing
 * specific enemy types, clearing systems, or defeating bosses.
 * Integrates with CombatSystem and EconomySystem.
 *
 * Features:
 *  - Auto-generated bounties based on system danger level
 *  - Tiered rewards (bronze/silver/gold/platinum)
 *  - Time-limited contracts with bonus for speed
 *  - Kill streak bounties for consecutive kills
 *  - Boss-specific bounties with premium rewards
 *  - Faction-aligned bounties that affect reputation
 */

// ── Constants ──────────────────────────────────────────────────────────────────

const BOUNTY_TIER = Object.freeze({
  BRONZE:   'bronze',
  SILVER:   'silver',
  GOLD:     'gold',
  PLATINUM: 'platinum',
});

const TIER_MULTIPLIERS = {
  [BOUNTY_TIER.BRONZE]:   1.0,
  [BOUNTY_TIER.SILVER]:   1.8,
  [BOUNTY_TIER.GOLD]:     3.0,
  [BOUNTY_TIER.PLATINUM]: 5.0,
};

const BOUNTY_TYPE = Object.freeze({
  KILL_COUNT:   'kill_count',    // Kill N enemies of type
  BOSS_HUNT:    'boss_hunt',     // Defeat a boss
  SYSTEM_CLEAR: 'system_clear',  // Clear N enemies in a system
  STREAK:       'streak',        // Get a kill streak of N
  TIMED_HUNT:   'timed_hunt',    // Kill N enemies within time limit
});

const MAX_ACTIVE_BOUNTIES = 5;
const BOUNTY_REFRESH_INTERVAL_MS = 120_000; // 2 minutes
const MAX_BOARD_SIZE = 10;

// Enemy type names used in bounty generation
const ENEMY_TYPES = ['scout', 'fighter', 'bomber', 'interceptor'];
const BOSS_NAMES = ['Void Reaver', 'Crimson Scourge', 'Shadow Wraith', 'Iron Titan', 'Quantum Devourer'];

// ── Helpers ──────────────────────────────────────────────────────────────────

let _bountyIdCounter = 0;

function generateBountyId() {
  return `bounty_${Date.now()}_${++_bountyIdCounter}`;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function tierFromDifficulty(difficulty) {
  if (difficulty >= 8) return BOUNTY_TIER.PLATINUM;
  if (difficulty >= 5) return BOUNTY_TIER.GOLD;
  if (difficulty >= 3) return BOUNTY_TIER.SILVER;
  return BOUNTY_TIER.BRONZE;
}

// ── Bounty System Class ──────────────────────────────────────────────────────

export class BountySystem {
  /**
   * @param {object} engine       GameEngine reference
   * @param {object} [options]
   * @param {number} [options.refreshIntervalMs]  Time between board refreshes
   * @param {number} [options.maxBoardSize]        Max bounties on board
   * @param {number} [options.maxActiveBounties]   Max active per player
   */
  constructor(engine, options = {}) {
    this._engine = engine;
    this._refreshInterval = options.refreshIntervalMs ?? BOUNTY_REFRESH_INTERVAL_MS;
    this._maxBoard = options.maxBoardSize ?? MAX_BOARD_SIZE;
    this._maxActive = options.maxActiveBounties ?? MAX_ACTIVE_BOUNTIES;

    /** Available bounties on the board: Map<bountyId, BountyData> */
    this._board = new Map();

    /** Player active bounties: Map<playerId, Map<bountyId, BountyProgress>> */
    this._playerBounties = new Map();

    /** Player completed bounty count (for stat tracking) */
    this._completionCounts = new Map();

    /** Last board refresh timestamp */
    this._lastRefresh = 0;

    /** Current system difficulty (updated externally) */
    this._systemDifficulty = 1;

    /** Event callback references */
    this._onKill = null;
    this._onBossKill = null;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  /**
   * Initialize the bounty system and subscribe to combat events.
   */
  init() {
    if (this._engine?.events) {
      this._onKill = (data) => this._handleKill(data);
      this._onBossKill = (data) => this._handleBossKill(data);
      this._engine.events.on('combat:kill', this._onKill);
      this._engine.events.on('combat:bossKill', this._onBossKill);
    }
    this._refreshBoard();
    return this;
  }

  /**
   * Tick — called every game loop iteration.
   * Refreshes the board periodically and checks timed bounties.
   * @param {number} dtMs  Delta time in milliseconds
   * @param {number} now   Current timestamp
   */
  tick(dtMs, now = Date.now()) {
    // Refresh board periodically
    if (now - this._lastRefresh > this._refreshInterval) {
      this._refreshBoard(now);
    }

    // Check timed bounty expirations
    for (const [playerId, bounties] of this._playerBounties) {
      for (const [bountyId, progress] of bounties) {
        if (progress.expiresAt && now > progress.expiresAt && !progress.completed) {
          progress.failed = true;
          bounties.delete(bountyId);
          this._emit('bounty:expired', { playerId, bountyId, bounty: progress });
        }
      }
    }
  }

  /**
   * Clean up event listeners.
   */
  destroy() {
    if (this._engine?.events) {
      if (this._onKill) this._engine.events.off('combat:kill', this._onKill);
      if (this._onBossKill) this._engine.events.off('combat:bossKill', this._onBossKill);
    }
  }

  // ── Board Management ─────────────────────────────────────────────────

  /**
   * Refresh the bounty board with new procedurally generated bounties.
   * @param {number} [now]
   */
  _refreshBoard(now = Date.now()) {
    this._lastRefresh = now;

    // Remove expired bounties from board
    for (const [id, bounty] of this._board) {
      if (bounty.expiresAt && now > bounty.expiresAt) {
        this._board.delete(id);
      }
    }

    // Fill board to max
    while (this._board.size < this._maxBoard) {
      const bounty = this._generateBounty();
      this._board.set(bounty.id, bounty);
    }

    this._emit('bounty:boardRefreshed', { bounties: this.getBoardList() });
  }

  /**
   * Generate a single bounty based on current system difficulty.
   * @returns {object} BountyData
   */
  _generateBounty() {
    const diff = this._systemDifficulty;
    const tier = tierFromDifficulty(diff + randomInt(-1, 2));
    const mult = TIER_MULTIPLIERS[tier];

    // Pick bounty type weighted by difficulty
    const types = [BOUNTY_TYPE.KILL_COUNT, BOUNTY_TYPE.KILL_COUNT, BOUNTY_TYPE.SYSTEM_CLEAR, BOUNTY_TYPE.STREAK];
    if (diff >= 3) types.push(BOUNTY_TYPE.TIMED_HUNT);
    if (diff >= 5) types.push(BOUNTY_TYPE.BOSS_HUNT);
    const type = pickRandom(types);

    const bounty = {
      id: generateBountyId(),
      type,
      tier,
      title: '',
      description: '',
      targetType: null,
      targetCount: 0,
      streakRequired: 0,
      timeLimitMs: 0,
      rewards: { credits: 0, stellarMarks: 0, factionRep: 0 },
      expiresAt: Date.now() + 300_000 + randomInt(0, 300_000), // 5-10 min expiry
      createdAt: Date.now(),
    };

    switch (type) {
      case BOUNTY_TYPE.KILL_COUNT: {
        const enemy = pickRandom(ENEMY_TYPES);
        const count = randomInt(3, 8 + diff * 2);
        bounty.targetType = enemy;
        bounty.targetCount = count;
        bounty.title = `Eliminate ${count} ${enemy}s`;
        bounty.description = `Destroy ${count} ${enemy}-class hostiles in the current sector.`;
        bounty.rewards.credits = Math.floor(count * 15 * mult);
        bounty.rewards.stellarMarks = tier === BOUNTY_TIER.PLATINUM ? 3 : tier === BOUNTY_TIER.GOLD ? 2 : 1;
        break;
      }
      case BOUNTY_TYPE.BOSS_HUNT: {
        const bossName = pickRandom(BOSS_NAMES);
        bounty.targetType = 'boss';
        bounty.targetCount = 1;
        bounty.title = `Hunt: ${bossName}`;
        bounty.description = `Locate and destroy the boss-class entity "${bossName}".`;
        bounty.rewards.credits = Math.floor(200 * mult);
        bounty.rewards.stellarMarks = tier === BOUNTY_TIER.PLATINUM ? 8 : 5;
        break;
      }
      case BOUNTY_TYPE.SYSTEM_CLEAR: {
        const count = randomInt(10, 20 + diff * 3);
        bounty.targetType = '*';
        bounty.targetCount = count;
        bounty.title = `System Purge: ${count} kills`;
        bounty.description = `Eliminate ${count} hostiles of any type to clear the sector.`;
        bounty.rewards.credits = Math.floor(count * 10 * mult);
        bounty.rewards.stellarMarks = tier === BOUNTY_TIER.GOLD ? 3 : 1;
        break;
      }
      case BOUNTY_TYPE.STREAK: {
        const streak = randomInt(5, 10 + diff);
        bounty.streakRequired = streak;
        bounty.title = `Kill Streak: ${streak}x`;
        bounty.description = `Achieve a ${streak}-kill streak without dying.`;
        bounty.rewards.credits = Math.floor(streak * 25 * mult);
        bounty.rewards.stellarMarks = tier === BOUNTY_TIER.PLATINUM ? 5 : 2;
        break;
      }
      case BOUNTY_TYPE.TIMED_HUNT: {
        const count = randomInt(5, 10 + diff);
        const timeMin = randomInt(1, 3);
        bounty.targetType = '*';
        bounty.targetCount = count;
        bounty.timeLimitMs = timeMin * 60_000;
        bounty.title = `Speed Hunt: ${count} in ${timeMin}m`;
        bounty.description = `Destroy ${count} hostiles within ${timeMin} minute${timeMin > 1 ? 's' : ''}.`;
        bounty.rewards.credits = Math.floor(count * 20 * mult * 1.5);
        bounty.rewards.stellarMarks = 3;
        break;
      }
    }

    // Faction reputation bonus for higher tiers
    if (tier === BOUNTY_TIER.GOLD || tier === BOUNTY_TIER.PLATINUM) {
      bounty.rewards.factionRep = Math.floor(5 * mult);
    }

    return bounty;
  }

  // ── Player Interactions ──────────────────────────────────────────────

  /**
   * Accept a bounty from the board.
   * @param {string} playerId
   * @param {string} bountyId
   * @returns {{ ok: boolean, error?: string, bounty?: object }}
   */
  acceptBounty(playerId, bountyId) {
    const bounty = this._board.get(bountyId);
    if (!bounty) return { ok: false, error: 'Bounty not found or expired.' };

    if (!this._playerBounties.has(playerId)) {
      this._playerBounties.set(playerId, new Map());
    }
    const active = this._playerBounties.get(playerId);
    if (active.size >= this._maxActive) {
      return { ok: false, error: `Maximum ${this._maxActive} active bounties.` };
    }
    if (active.has(bountyId)) {
      return { ok: false, error: 'Already tracking this bounty.' };
    }

    const progress = {
      ...bounty,
      acceptedAt: Date.now(),
      currentCount: 0,
      currentStreak: 0,
      completed: false,
      failed: false,
      expiresAt: bounty.timeLimitMs ? Date.now() + bounty.timeLimitMs : bounty.expiresAt,
    };

    active.set(bountyId, progress);
    this._board.delete(bountyId);

    this._emit('bounty:accepted', { playerId, bounty: progress });
    return { ok: true, bounty: progress };
  }

  /**
   * Abandon an active bounty.
   * @param {string} playerId
   * @param {string} bountyId
   * @returns {{ ok: boolean }}
   */
  abandonBounty(playerId, bountyId) {
    const active = this._playerBounties.get(playerId);
    if (!active || !active.has(bountyId)) return { ok: false };
    active.delete(bountyId);
    this._emit('bounty:abandoned', { playerId, bountyId });
    return { ok: true };
  }

  /**
   * Get all bounties on the board (for client display).
   * @returns {Array<object>}
   */
  getBoardList() {
    return [...this._board.values()].sort((a, b) => {
      const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
      return (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9);
    });
  }

  /**
   * Get a player's active bounties.
   * @param {string} playerId
   * @returns {Array<object>}
   */
  getPlayerBounties(playerId) {
    const active = this._playerBounties.get(playerId);
    if (!active) return [];
    return [...active.values()];
  }

  /**
   * Get completion stats for a player.
   * @param {string} playerId
   * @returns {{ completed: number }}
   */
  getPlayerStats(playerId) {
    return { completed: this._completionCounts.get(playerId) || 0 };
  }

  // ── Event Handlers ───────────────────────────────────────────────────

  /**
   * Handle a combat kill event — update all relevant bounties.
   * @param {{ playerId: string, enemyType: string, streak?: number }} data
   */
  _handleKill(data) {
    const { playerId, enemyType, streak } = data;
    const active = this._playerBounties.get(playerId);
    if (!active) return;

    for (const [bountyId, progress] of active) {
      if (progress.completed || progress.failed) continue;

      switch (progress.type) {
        case BOUNTY_TYPE.KILL_COUNT:
          if (progress.targetType === enemyType || progress.targetType === '*') {
            progress.currentCount++;
            if (progress.currentCount >= progress.targetCount) {
              this._completeBounty(playerId, bountyId, progress);
            }
          }
          break;

        case BOUNTY_TYPE.SYSTEM_CLEAR:
        case BOUNTY_TYPE.TIMED_HUNT:
          progress.currentCount++;
          if (progress.currentCount >= progress.targetCount) {
            this._completeBounty(playerId, bountyId, progress);
          }
          break;

        case BOUNTY_TYPE.STREAK:
          progress.currentStreak = streak || 0;
          if (progress.currentStreak >= progress.streakRequired) {
            this._completeBounty(playerId, bountyId, progress);
          }
          break;
      }
    }
  }

  /**
   * Handle a boss kill event.
   * @param {{ playerId: string }} data
   */
  _handleBossKill(data) {
    const { playerId } = data;
    const active = this._playerBounties.get(playerId);
    if (!active) return;

    for (const [bountyId, progress] of active) {
      if (progress.completed || progress.failed) continue;
      if (progress.type === BOUNTY_TYPE.BOSS_HUNT) {
        this._completeBounty(playerId, bountyId, progress);
      }
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────

  /**
   * Complete a bounty and distribute rewards.
   * @param {string} playerId
   * @param {string} bountyId
   * @param {object} progress
   */
  _completeBounty(playerId, bountyId, progress) {
    progress.completed = true;
    progress.completedAt = Date.now();

    // Speed bonus: complete in under half the time limit → +50% credits
    let speedBonus = 1;
    if (progress.timeLimitMs) {
      const elapsed = progress.completedAt - progress.acceptedAt;
      if (elapsed < progress.timeLimitMs * 0.5) {
        speedBonus = 1.5;
      }
    }

    const rewards = {
      credits: Math.floor(progress.rewards.credits * speedBonus),
      stellarMarks: progress.rewards.stellarMarks,
      factionRep: progress.rewards.factionRep || 0,
    };

    // Track completion count
    const prev = this._completionCounts.get(playerId) || 0;
    this._completionCounts.set(playerId, prev + 1);

    // Remove from active
    const active = this._playerBounties.get(playerId);
    if (active) active.delete(bountyId);

    this._emit('bounty:completed', { playerId, bountyId, bounty: progress, rewards });
  }

  /**
   * Update system difficulty (affects generated bounties).
   * @param {number} difficulty
   */
  setDifficulty(difficulty) {
    this._systemDifficulty = Math.max(1, Math.min(10, difficulty));
  }

  /**
   * Emit an event through the engine's event system.
   * @param {string} event
   * @param {object} data
   */
  _emit(event, data) {
    if (this._engine?.events) {
      this._engine.events.emit(event, data);
    }
  }
}

export { BOUNTY_TIER, BOUNTY_TYPE };
