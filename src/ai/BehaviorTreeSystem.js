import { randomUUID } from 'crypto';

/**
 * BehaviorTreeSystem — hierarchical behavior tree system for NPC decision-making
 * in Old Eden.
 *
 * Provides emergent NPC behavior through utility-based AI scoring on a
 * hierarchical behavior tree.  Each NPC receives a personal tree shaped by
 * its genome personality cluster (bytes 64–95), creating diverse behavioral
 * archetypes — from aggressive pirates to empathetic traders to restless
 * explorers.
 *
 * Core subsystems:
 *   - **Behavior Tree Nodes** — Sequence, Selector, Decorator, UtilitySelector
 *     and Action leaf nodes providing structured decision flow.
 *   - **Utility Scoring** — Each action computes a 0–1 utility score from the
 *     NPC's current needs, personality, memory and environment context.
 *   - **NPC Needs Model** — Five core needs (hunger, safety, social, wealth,
 *     exploration) on a 0–1 scale that decay naturally over time, driving
 *     NPCs to seek fulfillment.
 *   - **Memory System** — NPCs remember recent events (threats, allies,
 *     resource locations) with configurable time-based decay.
 *   - **Goal System** — Short-term (1–5 ticks) and long-term (100+ ticks)
 *     goals give NPCs persistent motivation beyond immediate needs.
 *   - **Behavior Profiles** — Personality genes weight which needs feel most
 *     urgent, producing emergent archetypes without hard-coding roles.
 *   - **Emergent Behaviors** — Group formation, trade caravans and territorial
 *     disputes arise naturally from individual utility calculations.
 *
 * Integration:
 *   - Listens: `npc:spawned` — assigns a personalised behavior tree
 *   - Listens: `npc:died`    — cleans up NPC state
 *   - Emits:   `npc:action`  — broadcasts the chosen action each tick
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Possible return statuses from behavior tree node evaluation. */
export const NODE_STATUS = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure',
  RUNNING: 'running',
});

/**
 * Personality gene indices within the genome (bytes 64–95).
 * These map directly to the PERSONALITY cluster defined in GeneticSystem.
 */
export const PERSONALITY_GENES = Object.freeze({
  AGGRESSION:  64,
  EMPATHY:     65,
  CURIOSITY:   66,
  GREED:       67,
  LOYALTY:     68,
  RESILIENCE:  69,
  IMPULSIVITY: 70,
  CHARISMA:    71,
});

/**
 * Per-millisecond decay rates for each NPC need.  Needs drift toward 0
 * (unsatisfied) over time, motivating NPCs to seek fulfillment.
 */
const NEED_DECAY_RATES = Object.freeze({
  hunger:      0.00002,
  safety:      0.00001,
  social:      0.000015,
  wealth:      0.000008,
  exploration: 0.000012,
});

/** Default memory entry lifetime in milliseconds (5 minutes). */
const DEFAULT_MEMORY_DURATION_MS = 300_000;

/** Action type constants for NPC behaviors. */
export const NPC_ACTIONS = Object.freeze({
  // Combat / piracy
  ATTACK:           'attack',
  FLEE:             'flee',
  PATROL:           'patrol',
  RAID:             'raid',
  // Social / trade
  TRADE:            'trade',
  FORM_GROUP:       'form_group',
  COMMUNICATE:      'communicate',
  JOIN_CARAVAN:     'join_caravan',
  // Exploration
  EXPLORE:          'explore',
  SCOUT:            'scout',
  INVESTIGATE:      'investigate',
  // Economic
  MINE:             'mine',
  HARVEST:          'harvest',
  SELL:             'sell',
  BUY:              'buy',
  // Survival
  SEEK_FOOD:        'seek_food',
  SEEK_SHELTER:     'seek_shelter',
  REST:             'rest',
  // Territory
  DEFEND_TERRITORY: 'defend_territory',
  // Idle fallback
  IDLE:             'idle',
});

// ── Behavior Tree Node Classes ───────────────────────────────────────────────

/**
 * Base class for all behavior tree nodes.
 * Every concrete node must override `evaluate(context)` to return a
 * {@link NODE_STATUS} value.
 */
export class BehaviorNode {
  /**
   * @param {string} name  Human-readable label for debugging / logging
   */
  constructor(name = 'BehaviorNode') {
    this.name = name;
  }

  /**
   * Evaluate this node given the current NPC context.
   * @param {BTContext} context
   * @returns {string} One of NODE_STATUS values
   */
  evaluate(_context) {
    return NODE_STATUS.FAILURE;
  }
}

/**
 * SequenceNode — runs child nodes left-to-right.
 * Succeeds only if **all** children succeed.  Fails immediately when any
 * child fails.  Returns RUNNING if a child returns RUNNING.
 */
export class SequenceNode extends BehaviorNode {
  /**
   * @param {string} name
   * @param {BehaviorNode[]} children
   */
  constructor(name, children = []) {
    super(name);
    /** @type {BehaviorNode[]} */
    this.children = children;
  }

  /** @param {BTContext} context */
  evaluate(context) {
    for (const child of this.children) {
      const status = child.evaluate(context);
      if (status !== NODE_STATUS.SUCCESS) return status;
    }
    return NODE_STATUS.SUCCESS;
  }
}

/**
 * SelectorNode — runs child nodes left-to-right.
 * Succeeds if **any** child succeeds.  Fails only when all children fail.
 * Returns RUNNING if a child returns RUNNING.
 */
export class SelectorNode extends BehaviorNode {
  /**
   * @param {string} name
   * @param {BehaviorNode[]} children
   */
  constructor(name, children = []) {
    super(name);
    /** @type {BehaviorNode[]} */
    this.children = children;
  }

  /** @param {BTContext} context */
  evaluate(context) {
    for (const child of this.children) {
      const status = child.evaluate(context);
      if (status !== NODE_STATUS.FAILURE) return status;
    }
    return NODE_STATUS.FAILURE;
  }
}

/**
 * DecoratorNode — wraps a single child and transforms its result.
 *
 * Built-in decorator types:
 *   - `'inverter'`         — flips SUCCESS ↔ FAILURE, RUNNING passes through
 *   - `'succeeder'`        — always returns SUCCESS regardless of child result
 *   - `'repeater'`         — repeats child up to `repeatCount` times
 *   - `'until_fail'`       — repeats child until it fails, then returns SUCCESS
 *   - `'condition_guard'`  — only evaluates child if `guardFn(context)` is truthy
 */
export class DecoratorNode extends BehaviorNode {
  /**
   * @param {string} name
   * @param {BehaviorNode} child
   * @param {string} decoratorType  One of the built-in types listed above
   * @param {object} [options]
   * @param {Function} [options.guardFn]     Predicate for 'condition_guard'
   * @param {number}   [options.repeatCount] Iteration count for 'repeater' (default 1)
   */
  constructor(name, child, decoratorType = 'inverter', options = {}) {
    super(name);
    /** @type {BehaviorNode} */
    this.child = child;
    this.decoratorType = decoratorType;
    this.guardFn = options.guardFn ?? null;
    this.repeatCount = options.repeatCount ?? 1;
  }

  /** @param {BTContext} context */
  evaluate(context) {
    switch (this.decoratorType) {
      case 'inverter': {
        const status = this.child.evaluate(context);
        if (status === NODE_STATUS.SUCCESS) return NODE_STATUS.FAILURE;
        if (status === NODE_STATUS.FAILURE) return NODE_STATUS.SUCCESS;
        return status;
      }
      case 'succeeder':
        this.child.evaluate(context);
        return NODE_STATUS.SUCCESS;
      case 'repeater':
        for (let i = 0; i < this.repeatCount; i++) {
          const status = this.child.evaluate(context);
          if (status === NODE_STATUS.FAILURE) return NODE_STATUS.FAILURE;
        }
        return NODE_STATUS.SUCCESS;
      case 'until_fail':
        for (let i = 0; i < 100; i++) {
          const status = this.child.evaluate(context);
          if (status === NODE_STATUS.FAILURE) return NODE_STATUS.SUCCESS;
          if (status === NODE_STATUS.RUNNING) return NODE_STATUS.RUNNING;
        }
        return NODE_STATUS.SUCCESS;
      case 'condition_guard':
        if (this.guardFn && !this.guardFn(context)) return NODE_STATUS.FAILURE;
        return this.child.evaluate(context);
      default:
        return this.child.evaluate(context);
    }
  }
}

/**
 * ActionNode — leaf node that performs an NPC action.
 *
 * Each action exposes:
 *   - `actionType`      — a constant from {@link NPC_ACTIONS}
 *   - `utilityFn`       — `(context) → number` returning 0–1 utility score
 *   - `executeFn`       — `(context) → NODE_STATUS` performing the action
 *   - `preconditionFn`  — optional `(context) → boolean` gating execution
 *
 * The utility score is consumed by {@link UtilitySelectorNode} to rank actions
 * dynamically each tick.
 */
export class ActionNode extends BehaviorNode {
  /**
   * @param {string}   name
   * @param {string}   actionType       One of NPC_ACTIONS values
   * @param {Function} utilityFn        (context) → number (0–1)
   * @param {Function} executeFn        (context) → NODE_STATUS
   * @param {Function} [preconditionFn] (context) → boolean
   */
  constructor(name, actionType, utilityFn, executeFn, preconditionFn = null) {
    super(name);
    this.actionType = actionType;
    this.utilityFn = utilityFn;
    this.executeFn = executeFn;
    this.preconditionFn = preconditionFn;
  }

  /**
   * Compute the utility of this action in the current context.
   * Returns 0 if preconditions are not met.
   * @param {BTContext} context
   * @returns {number} 0–1 utility score
   */
  getUtility(context) {
    if (this.preconditionFn && !this.preconditionFn(context)) return 0;
    return Math.max(0, Math.min(1, this.utilityFn(context)));
  }

  /** @param {BTContext} context */
  evaluate(context) {
    if (this.preconditionFn && !this.preconditionFn(context)) {
      return NODE_STATUS.FAILURE;
    }
    return this.executeFn(context);
  }
}

/**
 * UtilitySelectorNode — selects the child with the highest utility score.
 *
 * Unlike a standard {@link SelectorNode} that evaluates children in fixed
 * order, the UtilitySelector dynamically ranks children by their current
 * utility scores and evaluates them highest-first.  This is the core
 * mechanism that gives NPCs emergent, context-sensitive behavior.
 *
 * Utility propagation for non-ActionNode children:
 *   - Composite nodes (Sequence, Selector) → max utility of their children
 *   - Decorator nodes → utility of their wrapped child
 */
export class UtilitySelectorNode extends BehaviorNode {
  /**
   * @param {string} name
   * @param {BehaviorNode[]} children
   */
  constructor(name, children = []) {
    super(name);
    /** @type {BehaviorNode[]} */
    this.children = children;
  }

  /**
   * Score each child, sort descending by utility, and evaluate in that order
   * until one succeeds or returns RUNNING.
   * @param {BTContext} context
   * @returns {string} NODE_STATUS
   */
  evaluate(context) {
    const scored = this.children.map((child) => ({
      node: child,
      utility: this._getNodeUtility(child, context),
    }));

    scored.sort((a, b) => b.utility - a.utility);

    for (const { node, utility } of scored) {
      if (utility <= 0) continue;
      const status = node.evaluate(context);
      if (status !== NODE_STATUS.FAILURE) return status;
    }

    return NODE_STATUS.FAILURE;
  }

  /**
   * Recursively extract utility from a node.  ActionNodes expose getUtility()
   * directly; composite nodes return the max utility of their descendants.
   * @param {BehaviorNode} node
   * @param {BTContext} context
   * @returns {number}
   */
  _getNodeUtility(node, context) {
    if (typeof node.getUtility === 'function') return node.getUtility(context);
    if (node.children) {
      return Math.max(0, ...node.children.map((c) => this._getNodeUtility(c, context)));
    }
    if (node.child) return this._getNodeUtility(node.child, context);
    return 0;
  }
}

// ── BehaviorTreeSystem ───────────────────────────────────────────────────────

export class BehaviorTreeSystem {
  async init(engine) {
    this._engine = engine;

    /** @type {Map<string, BehaviorNode>} Per-NPC root behavior tree node */
    this._behaviorTrees = new Map();

    /** @type {Map<string, NPCMemory>} Per-NPC memory store */
    this._npcMemory = new Map();

    /** @type {Map<string, NPCNeeds>} Per-NPC needs (all 0–1, 1 = fully satisfied) */
    this._npcNeeds = new Map();

    /** @type {Map<string, NPCGoal[]>} Per-NPC active goals */
    this._npcGoals = new Map();

    /** @type {Map<string, PersonalityProfile>} Per-NPC personality cache (normalised 0–1) */
    this._personalityCache = new Map();

    /** @type {number} Running tick counter */
    this._tickCount = 0;

    this._onNpcSpawned = (data) => this._handleNpcSpawned(data);
    this._onNpcDied = (data) => this._handleNpcDied(data);
    engine.events.on('npc:spawned', this._onNpcSpawned);
    engine.events.on('npc:died', this._onNpcDied);

    console.log('[BehaviorTreeSystem] Initialised.');
  }

  tick(deltaMs) {
    this._tickCount++;
    const now = Date.now();

    for (const [npcId, tree] of this._behaviorTrees) {
      this._decayNeeds(npcId, deltaMs);
      this._pruneMemory(npcId, now);
      this._updateGoals(npcId);

      const context = this._buildContext(npcId, deltaMs, now);
      if (!context) continue;

      tree.evaluate(context);

      if (context.chosenAction) {
        this._engine.events.emit('npc:action', {
          npcId,
          action: context.chosenAction,
          utility: context.chosenUtility ?? 0,
          tick: this._tickCount,
        });
      }
    }
  }

  async destroy() {
    this._engine.events.off('npc:spawned', this._onNpcSpawned);
    this._engine.events.off('npc:died', this._onNpcDied);
    this._behaviorTrees.clear();
    this._npcMemory.clear();
    this._npcNeeds.clear();
    this._npcGoals.clear();
    this._personalityCache.clear();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Get the behavior tree root node for an NPC.
   * @param {string} npcId
   * @returns {BehaviorNode|undefined}
   */
  getBehaviorTree(npcId) {
    return this._behaviorTrees.get(npcId);
  }

  /**
   * Get the current needs state for an NPC.
   * @param {string} npcId
   * @returns {NPCNeeds|undefined}
   */
  getNeeds(npcId) {
    return this._npcNeeds.get(npcId);
  }

  /**
   * Get the memory store for an NPC.
   * @param {string} npcId
   * @returns {NPCMemory|undefined}
   */
  getMemory(npcId) {
    return this._npcMemory.get(npcId);
  }

  /**
   * Get active goals for an NPC.
   * @param {string} npcId
   * @returns {NPCGoal[]}
   */
  getGoals(npcId) {
    return this._npcGoals.get(npcId) ?? [];
  }

  /**
   * Get the cached personality profile for an NPC.
   * @param {string} npcId
   * @returns {PersonalityProfile|undefined}
   */
  getPersonality(npcId) {
    return this._personalityCache.get(npcId);
  }

  /**
   * Record an event into an NPC's memory.
   *
   * @param {string} npcId
   * @param {object} entry
   * @param {string} entry.type       Category: 'threat' | 'ally' | 'resource' | 'event'
   * @param {string} entry.sourceId   ID of entity involved
   * @param {string} [entry.sectorId] Location where the event occurred
   * @param {object} [entry.data]     Arbitrary payload
   * @param {number} [entry.durationMs] Custom decay time (default 5 min)
   */
  recordMemory(npcId, entry) {
    const memory = this._npcMemory.get(npcId);
    if (!memory) return;

    const now = Date.now();

    memory.entries.push({
      id: randomUUID(),
      type: entry.type,
      sourceId: entry.sourceId,
      sectorId: entry.sectorId ?? null,
      data: entry.data ?? {},
      timestamp: now,
      durationMs: entry.durationMs ?? DEFAULT_MEMORY_DURATION_MS,
    });

    if (entry.type === 'threat') {
      memory.knownThreats.set(entry.sourceId, now);
    } else if (entry.type === 'ally') {
      memory.knownAllies.set(entry.sourceId, now);
    } else if (entry.type === 'resource') {
      memory.knownResources.set(entry.sectorId ?? entry.sourceId, {
        sourceId: entry.sourceId,
        data: entry.data ?? {},
        timestamp: now,
      });
    }
  }

  /**
   * Add a goal to an NPC's goal list.
   *
   * @param {string} npcId
   * @param {object} goal
   * @param {string} goal.type       Goal category (e.g. 'acquire_wealth', 'explore_sector')
   * @param {string} goal.horizon    'short_term' | 'long_term'
   * @param {number} goal.targetTick Tick by which the goal should be completed
   * @param {object} [goal.params]   Goal-specific parameters
   * @param {number} [goal.priority] 0–1 priority weighting
   */
  addGoal(npcId, goal) {
    const goals = this._npcGoals.get(npcId);
    if (!goals) return;

    goals.push({
      id: randomUUID(),
      type: goal.type,
      horizon: goal.horizon,
      targetTick: goal.targetTick,
      createdTick: this._tickCount,
      params: goal.params ?? {},
      priority: goal.priority ?? 0.5,
      progress: 0,
      isComplete: false,
    });
  }

  /**
   * Satisfy a need by a given amount (clamped to 0–1).
   *
   * @param {string} npcId
   * @param {string} needName  One of: hunger, safety, social, wealth, exploration
   * @param {number} amount    Value to add (0–1)
   */
  satisfyNeed(npcId, needName, amount) {
    const needs = this._npcNeeds.get(npcId);
    if (!needs || !(needName in needs)) return;
    needs[needName] = Math.min(1, Math.max(0, needs[needName] + amount));
  }

  /**
   * Return the number of NPCs currently managed by the behavior tree system.
   * @returns {number}
   */
  getManagedCount() {
    return this._behaviorTrees.size;
  }

  /**
   * Return aggregate statistics for monitoring / analytics dashboards.
   * @returns {BehaviorTreeStats}
   */
  getStats() {
    let totalNeeds = 0;
    let needSamples = 0;
    let totalMemoryEntries = 0;
    let totalGoals = 0;

    for (const needs of this._npcNeeds.values()) {
      for (const val of Object.values(needs)) {
        totalNeeds += val;
        needSamples++;
      }
    }
    for (const memory of this._npcMemory.values()) {
      totalMemoryEntries += memory.entries.length;
    }
    for (const goals of this._npcGoals.values()) {
      totalGoals += goals.length;
    }

    return {
      managedNPCs: this._behaviorTrees.size,
      averageNeedSatisfaction: needSamples > 0 ? totalNeeds / needSamples : 0,
      totalMemoryEntries,
      totalActiveGoals: totalGoals,
      tickCount: this._tickCount,
    };
  }

  // ── Private — NPC lifecycle ────────────────────────────────────────────────

  /**
   * Handle a newly spawned NPC: extract personality, initialise needs/memory/
   * goals, and build a personalised behavior tree.
   * @param {object} data
   * @param {string} data.npcId
   */
  _handleNpcSpawned({ npcId }) {
    const npcSystem = this._engine.getSystem('npc');
    const npc = npcSystem?.getNPC(npcId);
    if (!npc || !npc.genome) return;

    const personality = this._extractPersonality(npc.genome);
    this._personalityCache.set(npcId, personality);

    this._npcNeeds.set(npcId, {
      hunger:      0.7 + Math.random() * 0.3,
      safety:      0.6 + Math.random() * 0.4,
      social:      0.5 + Math.random() * 0.5,
      wealth:      0.4 + Math.random() * 0.3,
      exploration: 0.5 + Math.random() * 0.5,
    });

    this._npcMemory.set(npcId, {
      entries: [],
      knownThreats: new Map(),
      knownAllies: new Map(),
      knownResources: new Map(),
    });

    this._npcGoals.set(npcId, []);
    this._assignStarterGoals(npcId, personality);

    const tree = this._buildBehaviorTree(npcId, personality);
    this._behaviorTrees.set(npcId, tree);
  }

  /**
   * Clean up all state for a dead NPC.
   * @param {object} data
   * @param {string} data.npcId
   */
  _handleNpcDied({ npcId }) {
    this._behaviorTrees.delete(npcId);
    this._npcMemory.delete(npcId);
    this._npcNeeds.delete(npcId);
    this._npcGoals.delete(npcId);
    this._personalityCache.delete(npcId);
  }

  // ── Private — Personality ──────────────────────────────────────────────────

  /**
   * Extract normalised (0–1) personality traits from a genome.
   * Falls back to 0.5 (neutral) for any unreadable byte.
   * @param {Uint8Array} genome
   * @returns {PersonalityProfile}
   */
  _extractPersonality(genome) {
    const profile = {};
    for (const [traitName, byteIndex] of Object.entries(PERSONALITY_GENES)) {
      profile[traitName.toLowerCase()] = (genome[byteIndex] ?? 128) / 255;
    }
    return profile;
  }

  /**
   * Assign initial long-term goals based on dominant personality traits.
   * The strongest trait determines the primary long-term motivation;
   * a sufficiently strong secondary trait adds a second goal.
   * @param {string} npcId
   * @param {PersonalityProfile} personality
   */
  _assignStarterGoals(npcId, personality) {
    const mapping = [
      { trait: 'aggression', goal: 'dominate_sector' },
      { trait: 'empathy',    goal: 'build_alliance' },
      { trait: 'curiosity',  goal: 'explore_unknown' },
      { trait: 'greed',      goal: 'acquire_wealth' },
    ];

    mapping.sort((a, b) => (personality[b.trait] ?? 0) - (personality[a.trait] ?? 0));

    this.addGoal(npcId, {
      type: mapping[0].goal,
      horizon: 'long_term',
      targetTick: this._tickCount + 200,
      priority: personality[mapping[0].trait] ?? 0.5,
    });

    if ((personality[mapping[1].trait] ?? 0) > 0.5) {
      this.addGoal(npcId, {
        type: mapping[1].goal,
        horizon: 'long_term',
        targetTick: this._tickCount + 150,
        priority: (personality[mapping[1].trait] ?? 0.5) * 0.8,
      });
    }
  }

  // ── Private — Needs ────────────────────────────────────────────────────────

  /**
   * Decay all needs for an NPC proportionally to elapsed time.
   * @param {string} npcId
   * @param {number} deltaMs
   */
  _decayNeeds(npcId, deltaMs) {
    const needs = this._npcNeeds.get(npcId);
    if (!needs) return;

    for (const [needName, rate] of Object.entries(NEED_DECAY_RATES)) {
      if (needName in needs) {
        needs[needName] = Math.max(0, needs[needName] - rate * deltaMs);
      }
    }
  }

  // ── Private — Memory ───────────────────────────────────────────────────────

  /**
   * Remove expired memory entries and prune stale convenience-index references.
   * @param {string} npcId
   * @param {number} now  Current timestamp in ms
   */
  _pruneMemory(npcId, now) {
    const memory = this._npcMemory.get(npcId);
    if (!memory) return;

    memory.entries = memory.entries.filter(
      (e) => now - e.timestamp < e.durationMs
    );

    for (const [id, ts] of memory.knownThreats) {
      if (now - ts > DEFAULT_MEMORY_DURATION_MS) memory.knownThreats.delete(id);
    }
    for (const [id, ts] of memory.knownAllies) {
      if (now - ts > DEFAULT_MEMORY_DURATION_MS) memory.knownAllies.delete(id);
    }
    for (const [id, info] of memory.knownResources) {
      if (now - info.timestamp > DEFAULT_MEMORY_DURATION_MS) {
        memory.knownResources.delete(id);
      }
    }
  }

  // ── Private — Goals ────────────────────────────────────────────────────────

  /**
   * Expire overdue or completed goals and generate a new short-term goal
   * when the NPC has none remaining.
   * @param {string} npcId
   */
  _updateGoals(npcId) {
    const goals = this._npcGoals.get(npcId);
    if (!goals) return;

    for (let i = goals.length - 1; i >= 0; i--) {
      if (goals[i].isComplete || this._tickCount > goals[i].targetTick) {
        goals.splice(i, 1);
      }
    }

    const hasShortTerm = goals.some((g) => g.horizon === 'short_term');
    if (!hasShortTerm) {
      this._generateShortTermGoal(npcId);
    }
  }

  /**
   * Generate a short-term goal targeting the NPC's most pressing unmet need,
   * weighted by personality traits.
   * @param {string} npcId
   */
  _generateShortTermGoal(npcId) {
    const needs = this._npcNeeds.get(npcId);
    const personality = this._personalityCache.get(npcId);
    if (!needs || !personality) return;

    const candidates = [
      { need: 'hunger',      weight: 1.0,                                            goal: 'find_food' },
      { need: 'safety',      weight: 1.0 + (personality.aggression ?? 0.5) * 0.3,    goal: 'secure_area' },
      { need: 'social',      weight: 0.8 + (personality.empathy ?? 0.5) * 0.4,       goal: 'find_company' },
      { need: 'wealth',      weight: 0.7 + (personality.greed ?? 0.5) * 0.5,         goal: 'earn_credits' },
      { need: 'exploration', weight: 0.6 + (personality.curiosity ?? 0.5) * 0.5,     goal: 'explore_nearby' },
    ];

    let bestScore = -1;
    let bestCandidate = candidates[0];

    for (const c of candidates) {
      const urgency = (1 - (needs[c.need] ?? 0.5)) * c.weight;
      if (urgency > bestScore) {
        bestScore = urgency;
        bestCandidate = c;
      }
    }

    this.addGoal(npcId, {
      type: bestCandidate.goal,
      horizon: 'short_term',
      targetTick: this._tickCount + 3 + Math.floor(Math.random() * 3),
      priority: Math.min(1, bestScore),
    });
  }

  // ── Private — Context ──────────────────────────────────────────────────────

  /**
   * Build the evaluation context object passed into every behavior tree node.
   * Returns null if the NPC is no longer active (cleanup deferred to death event).
   * @param {string} npcId
   * @param {number} deltaMs
   * @param {number} now
   * @returns {BTContext|null}
   */
  _buildContext(npcId, deltaMs, now) {
    const npcSystem = this._engine.getSystem('npc');
    const npc = npcSystem?.getNPC(npcId);
    if (!npc || !npc.isActive) return null;

    return {
      npcId,
      npc,
      needs: this._npcNeeds.get(npcId),
      memory: this._npcMemory.get(npcId),
      goals: this._npcGoals.get(npcId) ?? [],
      personality: this._personalityCache.get(npcId),
      deltaMs,
      now,
      tick: this._tickCount,
      engine: this._engine,
      system: this,
      // Mutable — written by action nodes during evaluation
      chosenAction: null,
      chosenUtility: 0,
    };
  }

  // ── Private — Behavior Tree Construction ───────────────────────────────────

  /**
   * Build a complete behavior tree for an NPC based on its personality profile.
   *
   * The tree is a {@link UtilitySelectorNode} at the root with subtrees for
   * each behavioral domain.  Personality weights bias which subtrees score
   * the highest utility, so aggressive NPCs naturally gravitate toward combat
   * while empathetic NPCs prefer social interactions — all without explicit
   * role assignment.
   *
   * @param {string} _npcId  (reserved for future per-NPC customisation)
   * @param {PersonalityProfile} personality
   * @returns {UtilitySelectorNode}
   */
  _buildBehaviorTree(_npcId, personality) {
    return new UtilitySelectorNode('root', [
      this._buildSurvivalBranch(personality),
      this._buildCombatBranch(personality),
      this._buildSocialBranch(personality),
      this._buildEconomicBranch(personality),
      this._buildExplorationBranch(personality),
      this._buildTerritoryBranch(personality),
      this._buildIdleFallback(),
    ]);
  }

  /**
   * Survival branch — seek food, shelter, or rest when needs are critical.
   * Resilience reduces perceived urgency, making hardy NPCs push through.
   * @param {PersonalityProfile} personality
   * @returns {SelectorNode}
   */
  _buildSurvivalBranch(personality) {
    const resilienceMod = 1 - (personality.resilience ?? 0.5) * 0.2;

    return new SelectorNode('survival', [
      new ActionNode(
        'seek_food',
        NPC_ACTIONS.SEEK_FOOD,
        (ctx) => {
          const urgency = 1 - (ctx.needs?.hunger ?? 0.5);
          return urgency * resilienceMod * 1.2;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.SEEK_FOOD;
          ctx.chosenUtility = 1 - (ctx.needs?.hunger ?? 0.5);
          ctx.system.satisfyNeed(ctx.npcId, 'hunger', 0.15);
          return NODE_STATUS.SUCCESS;
        },
        (ctx) => (1 - (ctx.needs?.hunger ?? 0.5)) > 0.5
      ),

      new ActionNode(
        'seek_shelter',
        NPC_ACTIONS.SEEK_SHELTER,
        (ctx) => {
          const safetyUrgency = 1 - (ctx.needs?.safety ?? 0.5);
          const threatCount = ctx.memory?.knownThreats.size ?? 0;
          return safetyUrgency * resilienceMod + threatCount * 0.1;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.SEEK_SHELTER;
          ctx.chosenUtility = 1 - (ctx.needs?.safety ?? 0.5);
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.2);
          return NODE_STATUS.SUCCESS;
        },
        (ctx) => (1 - (ctx.needs?.safety ?? 0.5)) > 0.5
      ),

      new ActionNode(
        'rest',
        NPC_ACTIONS.REST,
        (ctx) => {
          const hungerUrgency = 1 - (ctx.needs?.hunger ?? 0.5);
          const safetyUrgency = 1 - (ctx.needs?.safety ?? 0.5);
          return (hungerUrgency + safetyUrgency) * 0.3 * resilienceMod;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.REST;
          ctx.chosenUtility = 0.3;
          ctx.system.satisfyNeed(ctx.npcId, 'hunger', 0.05);
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.05);
          return NODE_STATUS.SUCCESS;
        }
      ),
    ]);
  }

  /**
   * Combat branch — attack, patrol, raid, or flee depending on personality
   * and current threat assessment.
   * High aggression → attack/raid; low aggression + threats → flee.
   * @param {PersonalityProfile} personality
   * @returns {SelectorNode}
   */
  _buildCombatBranch(personality) {
    const aggression  = personality.aggression ?? 0.5;
    const impulsivity = personality.impulsivity ?? 0.5;
    const resilience  = personality.resilience ?? 0.5;

    return new SelectorNode('combat', [
      new ActionNode(
        'flee',
        NPC_ACTIONS.FLEE,
        (ctx) => {
          const threatCount = ctx.memory?.knownThreats.size ?? 0;
          if (threatCount === 0) return 0;
          const fleeDesire = (1 - aggression) * 0.6 + (1 - resilience) * 0.3;
          const safetyUrgency = 1 - (ctx.needs?.safety ?? 0.5);
          return fleeDesire * safetyUrgency * Math.min(1, threatCount * 0.5);
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.FLEE;
          ctx.chosenUtility = (1 - aggression) * 0.6;
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.3);
          return NODE_STATUS.SUCCESS;
        },
        (ctx) => (ctx.memory?.knownThreats.size ?? 0) > 0 && aggression < 0.4
      ),

      new ActionNode(
        'attack',
        NPC_ACTIONS.ATTACK,
        (ctx) => {
          const threatCount = ctx.memory?.knownThreats.size ?? 0;
          const combatDesire = aggression * 0.7 + impulsivity * 0.2;
          const hasTarget = threatCount > 0 ? 0.3 : 0;
          return combatDesire * 0.5 + hasTarget;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.ATTACK;
          ctx.chosenUtility = aggression * 0.7;
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.1);
          return NODE_STATUS.SUCCESS;
        },
        () => aggression > 0.5
      ),

      new ActionNode(
        'raid',
        NPC_ACTIONS.RAID,
        (ctx) => {
          const greed = personality.greed ?? 0.5;
          const wealthUrgency = 1 - (ctx.needs?.wealth ?? 0.5);
          return aggression * 0.4 + greed * 0.3 + wealthUrgency * 0.3;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.RAID;
          ctx.chosenUtility = aggression * 0.5;
          ctx.system.satisfyNeed(ctx.npcId, 'wealth', 0.25);
          return NODE_STATUS.SUCCESS;
        },
        () => aggression > 0.6 && (personality.greed ?? 0) > 0.4
      ),

      new ActionNode(
        'patrol',
        NPC_ACTIONS.PATROL,
        (ctx) => {
          const safetyUrgency = 1 - (ctx.needs?.safety ?? 0.5);
          return aggression * 0.3 + safetyUrgency * 0.3 + resilience * 0.1;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.PATROL;
          ctx.chosenUtility = aggression * 0.3;
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.1);
          ctx.system.satisfyNeed(ctx.npcId, 'exploration', 0.05);
          return NODE_STATUS.SUCCESS;
        },
        () => aggression > 0.3
      ),
    ]);
  }

  /**
   * Social branch — form groups, join caravans, trade, communicate.
   * Weighted heavily by empathy, charisma and loyalty.
   * @param {PersonalityProfile} personality
   * @returns {SelectorNode}
   */
  _buildSocialBranch(personality) {
    const empathy  = personality.empathy ?? 0.5;
    const charisma = personality.charisma ?? 0.5;
    const loyalty  = personality.loyalty ?? 0.5;

    return new SelectorNode('social', [
      new ActionNode(
        'form_group',
        NPC_ACTIONS.FORM_GROUP,
        (ctx) => {
          const socialUrgency = 1 - (ctx.needs?.social ?? 0.5);
          const allyCount = ctx.memory?.knownAllies.size ?? 0;
          const groupDesire = empathy * 0.4 + loyalty * 0.3 + charisma * 0.2;
          return groupDesire * socialUrgency + allyCount * 0.05;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.FORM_GROUP;
          ctx.chosenUtility = empathy * 0.6;
          ctx.system.satisfyNeed(ctx.npcId, 'social', 0.3);
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.1);
          return NODE_STATUS.SUCCESS;
        },
        (ctx) => empathy > 0.4 && (1 - (ctx.needs?.social ?? 0.5)) > 0.3
      ),

      new ActionNode(
        'join_caravan',
        NPC_ACTIONS.JOIN_CARAVAN,
        (ctx) => {
          const socialUrgency = 1 - (ctx.needs?.social ?? 0.5);
          const wealthUrgency = 1 - (ctx.needs?.wealth ?? 0.5);
          return empathy * 0.3 + (socialUrgency + wealthUrgency) * 0.25;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.JOIN_CARAVAN;
          ctx.chosenUtility = empathy * 0.5;
          ctx.system.satisfyNeed(ctx.npcId, 'social', 0.2);
          ctx.system.satisfyNeed(ctx.npcId, 'wealth', 0.1);
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.1);
          return NODE_STATUS.SUCCESS;
        },
        () => empathy > 0.3
      ),

      new ActionNode(
        'trade',
        NPC_ACTIONS.TRADE,
        (ctx) => {
          const socialUrgency = 1 - (ctx.needs?.social ?? 0.5);
          const wealthUrgency = 1 - (ctx.needs?.wealth ?? 0.5);
          return empathy * 0.2 + charisma * 0.2 + socialUrgency * 0.15 + wealthUrgency * 0.2;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.TRADE;
          ctx.chosenUtility = empathy * 0.4;
          ctx.system.satisfyNeed(ctx.npcId, 'social', 0.1);
          ctx.system.satisfyNeed(ctx.npcId, 'wealth', 0.15);
          return NODE_STATUS.SUCCESS;
        },
        () => empathy > 0.25 || charisma > 0.4
      ),

      new ActionNode(
        'communicate',
        NPC_ACTIONS.COMMUNICATE,
        (ctx) => {
          const socialUrgency = 1 - (ctx.needs?.social ?? 0.5);
          return empathy * 0.2 + socialUrgency * 0.3;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.COMMUNICATE;
          ctx.chosenUtility = empathy * 0.3;
          ctx.system.satisfyNeed(ctx.npcId, 'social', 0.15);
          return NODE_STATUS.SUCCESS;
        }
      ),
    ]);
  }

  /**
   * Economic branch — mine, harvest, buy, sell.
   * Weighted by greed and charisma (trade aptitude).
   * @param {PersonalityProfile} personality
   * @returns {SelectorNode}
   */
  _buildEconomicBranch(personality) {
    const greed    = personality.greed ?? 0.5;
    const charisma = personality.charisma ?? 0.5;

    return new SelectorNode('economic', [
      new ActionNode(
        'mine',
        NPC_ACTIONS.MINE,
        (ctx) => {
          const wealthUrgency = 1 - (ctx.needs?.wealth ?? 0.5);
          const hasResources = (ctx.memory?.knownResources.size ?? 0) > 0 ? 0.15 : 0;
          return greed * 0.4 + wealthUrgency * 0.35 + hasResources;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.MINE;
          ctx.chosenUtility = greed * 0.5;
          ctx.system.satisfyNeed(ctx.npcId, 'wealth', 0.2);
          return NODE_STATUS.SUCCESS;
        },
        (ctx) => (1 - (ctx.needs?.wealth ?? 0.5)) > 0.3
      ),

      new ActionNode(
        'harvest',
        NPC_ACTIONS.HARVEST,
        (ctx) => {
          const wealthUrgency = 1 - (ctx.needs?.wealth ?? 0.5);
          const hungerUrgency = 1 - (ctx.needs?.hunger ?? 0.5);
          return greed * 0.3 + wealthUrgency * 0.2 + hungerUrgency * 0.2;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.HARVEST;
          ctx.chosenUtility = greed * 0.4;
          ctx.system.satisfyNeed(ctx.npcId, 'wealth', 0.1);
          ctx.system.satisfyNeed(ctx.npcId, 'hunger', 0.15);
          return NODE_STATUS.SUCCESS;
        }
      ),

      new ActionNode(
        'sell',
        NPC_ACTIONS.SELL,
        (ctx) => {
          const wealthUrgency = 1 - (ctx.needs?.wealth ?? 0.5);
          return greed * 0.3 + charisma * 0.15 + wealthUrgency * 0.25;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.SELL;
          ctx.chosenUtility = greed * 0.4;
          ctx.system.satisfyNeed(ctx.npcId, 'wealth', 0.2);
          return NODE_STATUS.SUCCESS;
        },
        (ctx) => (1 - (ctx.needs?.wealth ?? 0.5)) > 0.25
      ),

      new ActionNode(
        'buy',
        NPC_ACTIONS.BUY,
        (ctx) => {
          const hungerUrgency = 1 - (ctx.needs?.hunger ?? 0.5);
          const safetyUrgency = 1 - (ctx.needs?.safety ?? 0.5);
          return (hungerUrgency + safetyUrgency) * 0.25 + greed * 0.1;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.BUY;
          ctx.chosenUtility = 0.3;
          ctx.system.satisfyNeed(ctx.npcId, 'hunger', 0.1);
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.05);
          return NODE_STATUS.SUCCESS;
        }
      ),
    ]);
  }

  /**
   * Exploration branch — explore, scout, investigate anomalies.
   * Weighted by curiosity and impulsivity.
   * @param {PersonalityProfile} personality
   * @returns {SelectorNode}
   */
  _buildExplorationBranch(personality) {
    const curiosity   = personality.curiosity ?? 0.5;
    const impulsivity = personality.impulsivity ?? 0.5;

    return new SelectorNode('exploration', [
      new ActionNode(
        'explore',
        NPC_ACTIONS.EXPLORE,
        (ctx) => {
          const urgency = 1 - (ctx.needs?.exploration ?? 0.5);
          return curiosity * 0.5 + urgency * 0.35 + impulsivity * 0.1;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.EXPLORE;
          ctx.chosenUtility = curiosity * 0.6;
          ctx.system.satisfyNeed(ctx.npcId, 'exploration', 0.25);
          return NODE_STATUS.SUCCESS;
        },
        () => curiosity > 0.3
      ),

      new ActionNode(
        'scout',
        NPC_ACTIONS.SCOUT,
        (ctx) => {
          const urgency = 1 - (ctx.needs?.exploration ?? 0.5);
          const safetyUrgency = 1 - (ctx.needs?.safety ?? 0.5);
          return curiosity * 0.35 + urgency * 0.25 + safetyUrgency * 0.1;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.SCOUT;
          ctx.chosenUtility = curiosity * 0.4;
          ctx.system.satisfyNeed(ctx.npcId, 'exploration', 0.15);
          ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.05);
          return NODE_STATUS.SUCCESS;
        }
      ),

      new ActionNode(
        'investigate',
        NPC_ACTIONS.INVESTIGATE,
        (ctx) => {
          const urgency = 1 - (ctx.needs?.exploration ?? 0.5);
          const hasResources = (ctx.memory?.knownResources.size ?? 0) > 0 ? 0.2 : 0;
          return curiosity * 0.3 + urgency * 0.2 + hasResources;
        },
        (ctx) => {
          ctx.chosenAction = NPC_ACTIONS.INVESTIGATE;
          ctx.chosenUtility = curiosity * 0.45;
          ctx.system.satisfyNeed(ctx.npcId, 'exploration', 0.2);
          // Investigating may reveal resources
          if (Math.random() < 0.3) {
            ctx.system.recordMemory(ctx.npcId, {
              type: 'resource',
              sourceId: `resource_${randomUUID()}`,
              sectorId: ctx.npc.sectorId,
              data: { discoveredAt: ctx.now },
            });
          }
          return NODE_STATUS.SUCCESS;
        }
      ),
    ]);
  }

  /**
   * Territory branch — defend territory when aggression + loyalty warrant it
   * and threats are present.
   * @param {PersonalityProfile} personality
   * @returns {ActionNode}
   */
  _buildTerritoryBranch(personality) {
    const aggression = personality.aggression ?? 0.5;
    const loyalty    = personality.loyalty ?? 0.5;
    const greed      = personality.greed ?? 0.5;

    return new ActionNode(
      'defend_territory',
      NPC_ACTIONS.DEFEND_TERRITORY,
      (ctx) => {
        const safetyUrgency = 1 - (ctx.needs?.safety ?? 0.5);
        const threatCount = ctx.memory?.knownThreats.size ?? 0;
        const allyCount = ctx.memory?.knownAllies.size ?? 0;
        const desire = aggression * 0.3 + loyalty * 0.3 + greed * 0.2;
        const contextBonus = threatCount * 0.1 + allyCount * 0.05;
        return desire * safetyUrgency + contextBonus;
      },
      (ctx) => {
        ctx.chosenAction = NPC_ACTIONS.DEFEND_TERRITORY;
        ctx.chosenUtility = aggression * 0.5;
        ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.15);
        ctx.system.satisfyNeed(ctx.npcId, 'social', 0.05);
        return NODE_STATUS.SUCCESS;
      },
      (ctx) => {
        return (aggression + loyalty) > 0.8
          && (1 - (ctx.needs?.safety ?? 0.5)) > 0.3;
      }
    );
  }

  /**
   * Idle fallback — always available with the lowest possible utility.
   * Slightly restores all needs so NPCs are never completely stuck.
   * @returns {ActionNode}
   */
  _buildIdleFallback() {
    return new ActionNode(
      'idle',
      NPC_ACTIONS.IDLE,
      () => 0.01,
      (ctx) => {
        ctx.chosenAction = NPC_ACTIONS.IDLE;
        ctx.chosenUtility = 0.01;
        ctx.system.satisfyNeed(ctx.npcId, 'hunger', 0.01);
        ctx.system.satisfyNeed(ctx.npcId, 'safety', 0.02);
        ctx.system.satisfyNeed(ctx.npcId, 'social', 0.01);
        return NODE_STATUS.SUCCESS;
      }
    );
  }
}

// ── Typedefs ─────────────────────────────────────────────────────────────────

/**
 * @typedef {object} NPCNeeds
 * @property {number} hunger       0–1 satisfaction level
 * @property {number} safety       0–1 satisfaction level
 * @property {number} social       0–1 satisfaction level
 * @property {number} wealth       0–1 satisfaction level
 * @property {number} exploration  0–1 satisfaction level
 */

/**
 * @typedef {object} NPCMemory
 * @property {MemoryEntry[]}       entries         All memory entries
 * @property {Map<string, number>} knownThreats    sourceId → timestamp
 * @property {Map<string, number>} knownAllies     sourceId → timestamp
 * @property {Map<string, object>} knownResources  sectorId → { sourceId, data, timestamp }
 */

/**
 * @typedef {object} MemoryEntry
 * @property {string} id          Unique entry ID
 * @property {string} type        'threat' | 'ally' | 'resource' | 'event'
 * @property {string} sourceId    ID of entity involved
 * @property {string|null} sectorId  Location of the event
 * @property {object} data        Arbitrary payload
 * @property {number} timestamp   Creation time (ms since epoch)
 * @property {number} durationMs  Lifetime before decay
 */

/**
 * @typedef {object} NPCGoal
 * @property {string}  id           Unique goal ID
 * @property {string}  type         Goal category
 * @property {string}  horizon      'short_term' | 'long_term'
 * @property {number}  targetTick   Deadline tick
 * @property {number}  createdTick  Tick when goal was created
 * @property {object}  params       Goal-specific parameters
 * @property {number}  priority     0–1 weighting
 * @property {number}  progress     0–1 completion fraction
 * @property {boolean} isComplete   Whether the goal has been achieved
 */

/**
 * @typedef {object} PersonalityProfile
 * @property {number} aggression   0–1 tendency toward combat and confrontation
 * @property {number} empathy      0–1 tendency toward social cooperation
 * @property {number} curiosity    0–1 tendency toward exploration
 * @property {number} greed        0–1 tendency toward wealth accumulation
 * @property {number} loyalty      0–1 tendency toward group fidelity
 * @property {number} resilience   0–1 tolerance for hardship
 * @property {number} impulsivity  0–1 tendency toward immediate action
 * @property {number} charisma     0–1 social influence capability
 */

/**
 * @typedef {object} BTContext
 * @property {string}             npcId         NPC identifier
 * @property {object}             npc           Full NPC record from NPCSystem
 * @property {NPCNeeds}           needs         Current need levels
 * @property {NPCMemory}          memory        NPC memory store
 * @property {NPCGoal[]}          goals         Active goals
 * @property {PersonalityProfile} personality   Cached personality traits
 * @property {number}             deltaMs       Tick duration in ms
 * @property {number}             now           Current timestamp (ms)
 * @property {number}             tick          Current tick number
 * @property {object}             engine        Game engine reference
 * @property {BehaviorTreeSystem} system        This system (for satisfyNeed etc.)
 * @property {string|null}        chosenAction  Mutable — set by winning action node
 * @property {number}             chosenUtility Mutable — utility of chosen action
 */

/**
 * @typedef {object} BehaviorTreeStats
 * @property {number} managedNPCs              Number of NPCs with active behavior trees
 * @property {number} averageNeedSatisfaction  Mean satisfaction across all needs and NPCs
 * @property {number} totalMemoryEntries       Sum of all memory entries across all NPCs
 * @property {number} totalActiveGoals         Sum of all active goals across all NPCs
 * @property {number} tickCount                Total ticks processed
 */
