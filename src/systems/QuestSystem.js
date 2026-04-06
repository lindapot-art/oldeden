/**
 * QuestSystem — quest management for Old Eden.
 *
 * Handles the full quest lifecycle in the blockchain-native AI-driven space MMO,
 * from acceptance through completion and reward distribution.
 *
 * Core mechanics:
 *  1. Quest acceptance & tracking — players accept quests from a pool;
 *     states: available → active → completed | failed. Max 10 active per player.
 *  2. Multi-objective quests — quests may require killing enemies, collecting
 *     items, visiting locations, or talking to NPCs. Each objective is tracked
 *     independently; the quest completes when every objective is fulfilled.
 *  3. Quest chains with prerequisites — quests can depend on prior quest
 *     completions, forming sequential chains.
 *  4. Timed quests with expiration — optional time limit (ms). tick() auto-fails
 *     expired quests.
 *  5. Quest rewards distribution — on completion distribute EC credits, SM, XP,
 *     items (by id), and faction reputation changes.
 */

// ── Constants & Enums ──────────────────────────────────────────────────────────

/** Maximum number of active quests a single player may hold. */
const MAX_ACTIVE_QUESTS = 10;

/** Possible states a quest instance can be in. */
export const QUEST_STATE = Object.freeze({
  AVAILABLE: 'available',
  ACTIVE:    'active',
  COMPLETED: 'completed',
  FAILED:    'failed',
});

/** Supported objective types. */
export const OBJECTIVE_TYPE = Object.freeze({
  KILL:    'kill',
  COLLECT: 'collect',
  VISIT:   'visit',
  TALK:    'talk',
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deep-clone an array of objective definitions, initialising progress to 0.
 *
 * @param {Array<ObjectiveDefinition>} objectives
 * @returns {Array<ObjectiveProgress>}
 */
function cloneObjectives(objectives) {
  return objectives.map(o => ({
    type:     o.type,
    target:   o.target,
    required: o.required,
    current:  0,
  }));
}

// ── Quest System ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ObjectiveDefinition
 * @property {string} type     - One of OBJECTIVE_TYPE values.
 * @property {string} target   - Target identifier (enemy id, item id, etc.).
 * @property {number} required - How many needed to fulfil the objective.
 */

/**
 * @typedef {Object} ObjectiveProgress
 * @property {string} type
 * @property {string} target
 * @property {number} required
 * @property {number} current
 */

/**
 * @typedef {Object} QuestRewards
 * @property {number}               [credits]    - EC credits.
 * @property {number}               [sm]         - Soul Matter.
 * @property {number}               [xp]         - Experience points.
 * @property {Array<string>}        [items]      - Item ids to grant.
 * @property {Record<string,number>} [reputation] - Faction id → rep delta.
 */

/**
 * @typedef {Object} QuestDefinition
 * @property {string}                id            - Unique quest identifier.
 * @property {string}                name          - Display name.
 * @property {Array<ObjectiveDefinition>} objectives
 * @property {Array<string>}         [prerequisites] - Quest ids that must be completed first.
 * @property {number|null}           [timeLimitMs]   - Optional time limit in ms.
 * @property {QuestRewards}          [rewards]       - Rewards on completion.
 */

/**
 * @typedef {Object} QuestInstance
 * @property {string}                questId
 * @property {string}                state
 * @property {Array<ObjectiveProgress>} objectives
 * @property {number}                acceptedAt   - Timestamp (ms) when accepted.
 * @property {number|null}           expiresAt    - Timestamp (ms) or null.
 */

export class QuestSystem {
  constructor() {
    /** @type {import('../engine').Engine|null} */
    this._engine = null;

    /**
     * Registry of quest definitions keyed by quest id.
     * @type {Map<string, QuestDefinition>}
     */
    this._definitions = new Map();

    /**
     * Per-player quest instances.
     * Outer key = playerId, inner key = questId.
     * @type {Map<string, Map<string, QuestInstance>>}
     */
    this._players = new Map();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Initialise the system with the game engine reference.
   *
   * @param {import('../engine').Engine} engine
   */
  async init(engine) {
    this._engine = engine;
  }

  /**
   * Per-frame update — checks for timed quest expirations.
   *
   * @param {number} deltaMs - Milliseconds elapsed since last tick.
   */
  tick(deltaMs) {
    const now = Date.now();
    for (const [playerId, quests] of this._players) {
      for (const [questId, qi] of quests) {
        if (qi.state === QUEST_STATE.ACTIVE && qi.expiresAt !== null && now >= qi.expiresAt) {
          qi.state = QUEST_STATE.FAILED;
          this._engine.events.emit('quest:failed', { playerId, questId, reason: 'expired' });
        }
      }
    }
  }

  /**
   * Tear down the system and release resources.
   */
  async destroy() {
    this._definitions.clear();
    this._players.clear();
    this._engine = null;
  }

  // ── Quest Registration ───────────────────────────────────────────────────

  /**
   * Register a quest definition in the system.
   *
   * @param {QuestDefinition} def
   */
  registerQuest(def) {
    this._definitions.set(def.id, def);
  }

  // ── 1. Acceptance & Tracking ─────────────────────────────────────────────

  /**
   * Accept a quest for a player, moving it from available to active.
   *
   * @param {string} playerId
   * @param {string} questId
   * @returns {{ ok: boolean, error?: string }}
   */
  acceptQuest(playerId, questId) {
    const def = this._definitions.get(questId);
    if (!def) return { ok: false, error: 'quest_not_found' };

    const pq = this._ensurePlayer(playerId);

    // Already have this quest?
    const existing = pq.get(questId);
    if (existing && (existing.state === QUEST_STATE.ACTIVE || existing.state === QUEST_STATE.COMPLETED)) {
      return { ok: false, error: 'quest_already_accepted' };
    }

    // Check active cap
    const activeCount = this._activeCount(playerId);
    if (activeCount >= MAX_ACTIVE_QUESTS) {
      return { ok: false, error: 'max_active_quests' };
    }

    // Check prerequisites
    if (!this.meetsPrerequisites(playerId, questId)) {
      return { ok: false, error: 'prerequisites_not_met' };
    }

    const now = Date.now();
    /** @type {QuestInstance} */
    const qi = {
      questId,
      state:      QUEST_STATE.ACTIVE,
      objectives: cloneObjectives(def.objectives),
      acceptedAt: now,
      expiresAt:  def.timeLimitMs != null ? now + def.timeLimitMs : null,
    };

    pq.set(questId, qi);
    this._engine.events.emit('quest:accepted', { playerId, questId });
    return { ok: true };
  }

  /**
   * Return the current state of a quest for a player.
   *
   * @param {string} playerId
   * @param {string} questId
   * @returns {string|null} QUEST_STATE value or null if not found.
   */
  getQuestState(playerId, questId) {
    const pq = this._players.get(playerId);
    if (!pq) return null;
    const qi = pq.get(questId);
    return qi ? qi.state : null;
  }

  /**
   * Return all active quest instances for a player.
   *
   * @param {string} playerId
   * @returns {QuestInstance[]}
   */
  getActiveQuests(playerId) {
    const pq = this._players.get(playerId);
    if (!pq) return [];
    return [...pq.values()].filter(qi => qi.state === QUEST_STATE.ACTIVE);
  }

  // ── 2. Multi-Objective Progress ──────────────────────────────────────────

  /**
   * Report progress toward a quest objective.
   *
   * @param {string} playerId
   * @param {string} questId
   * @param {string} objectiveType - OBJECTIVE_TYPE value.
   * @param {string} target        - Target identifier.
   * @param {number} [amount=1]    - Amount of progress to add.
   * @returns {{ ok: boolean, completed?: boolean, error?: string }}
   */
  reportProgress(playerId, questId, objectiveType, target, amount = 1) {
    const pq = this._players.get(playerId);
    if (!pq) return { ok: false, error: 'player_not_found' };

    const qi = pq.get(questId);
    if (!qi || qi.state !== QUEST_STATE.ACTIVE) {
      return { ok: false, error: 'quest_not_active' };
    }

    let matched = false;
    for (const obj of qi.objectives) {
      if (obj.type === objectiveType && obj.target === target) {
        obj.current = Math.min(obj.current + amount, obj.required);
        matched = true;
        this._engine.events.emit('quest:objective_progress', {
          playerId, questId, type: objectiveType, target, current: obj.current, required: obj.required,
        });
      }
    }

    if (!matched) return { ok: false, error: 'objective_not_found' };

    // Check if all objectives are complete
    const allDone = qi.objectives.every(o => o.current >= o.required);
    if (allDone) {
      this._completeQuest(playerId, questId, qi);
      return { ok: true, completed: true };
    }

    return { ok: true, completed: false };
  }

  /**
   * Return the objectives and their progress for a player's quest.
   *
   * @param {string} playerId
   * @param {string} questId
   * @returns {Array<ObjectiveProgress>|null}
   */
  getObjectives(playerId, questId) {
    const pq = this._players.get(playerId);
    if (!pq) return null;
    const qi = pq.get(questId);
    return qi ? qi.objectives : null;
  }

  // ── 3. Prerequisites & Chains ────────────────────────────────────────────

  /**
   * Check whether a player meets all prerequisite quests for the given quest.
   *
   * @param {string} playerId
   * @param {string} questId
   * @returns {boolean}
   */
  meetsPrerequisites(playerId, questId) {
    const def = this._definitions.get(questId);
    if (!def || !def.prerequisites || def.prerequisites.length === 0) return true;

    const pq = this._players.get(playerId);
    if (!pq) return false;

    return def.prerequisites.every(preId => {
      const qi = pq.get(preId);
      return qi && qi.state === QUEST_STATE.COMPLETED;
    });
  }

  /**
   * Return the list of available quest ids for which a player is eligible
   * (prerequisites met and not already active/completed).
   *
   * @param {string} playerId
   * @returns {string[]}
   */
  getEligibleQuests(playerId) {
    const result = [];
    const pq = this._players.get(playerId);

    for (const [questId] of this._definitions) {
      const existing = pq && pq.get(questId);
      if (existing && (existing.state === QUEST_STATE.ACTIVE || existing.state === QUEST_STATE.COMPLETED)) {
        continue;
      }
      if (this.meetsPrerequisites(playerId, questId)) {
        result.push(questId);
      }
    }
    return result;
  }

  // ── 4. Timed Quests (expiration handled in tick()) ───────────────────────

  /**
   * Return the remaining time in ms for a timed quest, or null if untimed.
   *
   * @param {string} playerId
   * @param {string} questId
   * @returns {number|null}
   */
  getRemainingTime(playerId, questId) {
    const pq = this._players.get(playerId);
    if (!pq) return null;
    const qi = pq.get(questId);
    if (!qi || qi.expiresAt === null) return null;
    return Math.max(0, qi.expiresAt - Date.now());
  }

  // ── 5. Reward Distribution (called internally on completion) ─────────────

  /**
   * Distribute rewards for a completed quest. Called automatically by
   * _completeQuest. Emits individual reward events.
   *
   * @param {string}       playerId
   * @param {string}       questId
   * @param {QuestRewards} rewards
   * @private
   */
  _distributeRewards(playerId, questId, rewards) {
    if (!rewards) return;

    if (rewards.credits) {
      this._engine.events.emit('quest:reward_credits', { playerId, questId, amount: rewards.credits });
    }
    if (rewards.sm) {
      this._engine.events.emit('quest:reward_sm', { playerId, questId, amount: rewards.sm });
    }
    if (rewards.xp) {
      this._engine.events.emit('quest:reward_xp', { playerId, questId, amount: rewards.xp });
    }
    if (rewards.items && rewards.items.length > 0) {
      this._engine.events.emit('quest:reward_items', { playerId, questId, items: rewards.items });
    }
    if (rewards.reputation) {
      for (const [factionId, delta] of Object.entries(rewards.reputation)) {
        this._engine.events.emit('quest:reward_reputation', { playerId, questId, factionId, delta });
      }
    }
  }

  // ── Internal Helpers ─────────────────────────────────────────────────────

  /**
   * Ensure a player entry exists in the map and return it.
   *
   * @param {string} playerId
   * @returns {Map<string, QuestInstance>}
   * @private
   */
  _ensurePlayer(playerId) {
    if (!this._players.has(playerId)) {
      this._players.set(playerId, new Map());
    }
    return this._players.get(playerId);
  }

  /**
   * Count active quests for a player.
   *
   * @param {string} playerId
   * @returns {number}
   * @private
   */
  _activeCount(playerId) {
    const pq = this._players.get(playerId);
    if (!pq) return 0;
    let count = 0;
    for (const qi of pq.values()) {
      if (qi.state === QUEST_STATE.ACTIVE) count++;
    }
    return count;
  }

  /**
   * Mark a quest as completed and distribute rewards.
   *
   * @param {string}        playerId
   * @param {string}        questId
   * @param {QuestInstance} qi
   * @private
   */
  _completeQuest(playerId, questId, qi) {
    qi.state = QUEST_STATE.COMPLETED;
    const def = this._definitions.get(questId);
    this._engine.events.emit('quest:completed', { playerId, questId });
    if (def && def.rewards) {
      this._distributeRewards(playerId, questId, def.rewards);
    }
  }
}
