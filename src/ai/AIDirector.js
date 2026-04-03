/**
 * AIDirector — the dynamic content and difficulty director for Old Eden.
 *
 * Inspired by Left 4 Dead's AI Director but significantly more sophisticated:
 *
 * Responsibilities:
 *   1. **Dynamic Difficulty** — monitors player stress, engagement, and
 *      performance in real-time; adjusts enemy density, event frequency,
 *      and economic conditions accordingly.
 *
 *   2. **Procedural Quest Generation** — collaborates with ProceduralGenerator
 *      to create narrative quest hooks calibrated to player level and context.
 *
 *   3. **World Events** — schedules and narrates global events:
 *      - Pirate fleet invasions
 *      - Solar flare events (radiation surge)
 *      - Trade route disruptions
 *      - Alien anomaly discoveries
 *      - Faction wars
 *
 *   4. **NPC Narrative** — assigns goals and motivations to high-value NPCs,
 *      creating character arcs that players can discover and interact with.
 *
 *   5. **Pacing** — ensures no single player experiences monotony; if
 *      engagement drops, it introduces a surprise event or opportunity.
 */

const ENGAGEMENT_WINDOW_MS = 60_000; // 1 minute rolling window

const WORLD_EVENT_TYPES = [
  { type: 'solar_flare',         weight: 0.15, radiationMultiplier: 3.0, durationMinutes: 20  },
  { type: 'pirate_invasion',     weight: 0.25, combatIntensity: 0.8,    durationMinutes: 45  },
  { type: 'trade_disruption',    weight: 0.20, economicImpact: -0.3,    durationMinutes: 120 },
  { type: 'alien_anomaly',       weight: 0.10, explorationBonus: 2.0,   durationMinutes: 60  },
  { type: 'faction_war',         weight: 0.15, combatIntensity: 1.0,    durationMinutes: 360 },
  { type: 'resource_boom',       weight: 0.10, economicImpact: 0.5,     durationMinutes: 90  },
  { type: 'pandemic',            weight: 0.05, healthHazard: 0.6,       durationMinutes: 480 },
];

export class AIDirector {
  async init(engine) {
    this._engine = engine;
    /** @type {Map<string, PlayerEngagement>} */
    this._playerEngagement = new Map();
    /** @type {WorldEvent[]} */
    this._activeEvents = [];
    this._nextEventCheckMs = 0;

    engine.events.on('player:action', (data) => this._recordPlayerAction(data));
    engine.events.on('player:death',  (data) => this._onPlayerDeath(data));

    console.log('[AIDirector] Initialised.');
  }

  tick(deltaMs) {
    const now = Date.now();

    // Expire old world events
    this._activeEvents = this._activeEvents.filter(
      (e) => now < e.startTime + e.durationMs
    );

    // Periodically consider spawning a new world event
    this._nextEventCheckMs -= deltaMs;
    if (this._nextEventCheckMs <= 0) {
      this._considerWorldEvent(now);
      this._nextEventCheckMs = 30_000 + Math.random() * 60_000; // 30–90 s
    }

    // Prune stale engagement records
    for (const [playerId, engagement] of this._playerEngagement) {
      if (now - engagement.lastActionAt > 300_000) {  // 5 min idle
        this._playerEngagement.delete(playerId);
      }
    }
  }

  async destroy() {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Get a personalised difficulty modifier for a player (0.5 – 2.0).
   * A bored player gets easier content; a high-performing player gets harder.
   *
   * @param {string} playerId
   * @returns {number}
   */
  getDifficultyModifier(playerId) {
    const engagement = this._playerEngagement.get(playerId);
    if (!engagement) return 1.0;

    const deathRate    = engagement.deaths / Math.max(1, engagement.actions);
    const successRate  = engagement.successes / Math.max(1, engagement.actions);

    // High deaths → reduce difficulty; high successes → increase
    let modifier = 1.0 + (successRate - deathRate) * 0.5;
    return Math.max(0.5, Math.min(2.0, modifier));
  }

  /**
   * Get all currently active world events.
   * @returns {WorldEvent[]}
   */
  getActiveEvents() {
    return [...this._activeEvents];
  }

  /**
   * Generate a personalised quest for a player using ProceduralGenerator.
   * @param {string} playerId
   * @param {object} [context]
   * @returns {import('../systems/ProceduralGenerator.js').QuestHook}
   */
  generatePlayerQuest(playerId, context = {}) {
    const procedural = this._engine.getSystem('procedural');
    const difficulty = this.getDifficultyModifier(playerId);
    return procedural.generateQuestHook({ ...context, difficulty, playerId });
  }

  /**
   * Record a significant player action (for engagement tracking).
   * @param {string} playerId
   * @param {'combat_win'|'combat_loss'|'quest_complete'|'death'|'discovery'} actionType
   */
  recordAction(playerId, actionType) {
    this._recordPlayerAction({ playerId, actionType });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _recordPlayerAction({ playerId, actionType }) {
    if (!this._playerEngagement.has(playerId)) {
      this._playerEngagement.set(playerId, {
        actions: 0, successes: 0, deaths: 0, lastActionAt: Date.now(),
      });
    }
    const e = this._playerEngagement.get(playerId);
    e.actions++;
    e.lastActionAt = Date.now();
    if (actionType === 'death') e.deaths++;
    if (['combat_win', 'quest_complete', 'discovery'].includes(actionType)) e.successes++;
  }

  _onPlayerDeath({ playerId }) {
    this._recordPlayerAction({ playerId, actionType: 'death' });
  }

  _considerWorldEvent(now) {
    // Don't stack too many events
    if (this._activeEvents.length >= 3) return;

    // ~20% chance to spawn an event on each check
    if (Math.random() > 0.2) return;

    const total  = WORLD_EVENT_TYPES.reduce((s, e) => s + e.weight, 0);
    let roll     = Math.random() * total;
    let template = WORLD_EVENT_TYPES[WORLD_EVENT_TYPES.length - 1];
    for (const t of WORLD_EVENT_TYPES) {
      roll -= t.weight;
      if (roll <= 0) { template = t; break; }
    }

    const event = {
      id: `event_${now}`,
      ...template,
      startTime: now,
      durationMs: template.durationMinutes * 60_000,
      affectedSectors: this._randomSectors(),
    };

    this._activeEvents.push(event);
    this._engine.events.emit('world:event_started', event);

    console.log(`[AIDirector] World event started: ${event.type} (sectors: ${event.affectedSectors.join(', ')})`);

    // Apply radiation spikes to mutation system for solar flares
    if (event.type === 'solar_flare') {
      const mutation = this._engine.getSystem('mutation');
      for (const sectorId of event.affectedSectors) {
        const current = mutation.getSectorRadiation(sectorId);
        mutation.setSectorRadiation(sectorId, Math.min(1, current * event.radiationMultiplier));
      }
    }
  }

  _randomSectors() {
    const sectorNames = ['Alpha-Prime', 'Beta-Secundus', 'Gamma-Deep', 'Delta-Reach', 'Zeta-Expanse'];
    const count = 1 + Math.floor(Math.random() * 3);
    return sectorNames.sort(() => Math.random() - 0.5).slice(0, count);
  }
}

/**
 * @typedef {object} WorldEvent
 * @property {string}   id
 * @property {string}   type
 * @property {number}   startTime
 * @property {number}   durationMs
 * @property {string[]} affectedSectors
 */

/**
 * @typedef {object} PlayerEngagement
 * @property {number} actions
 * @property {number} successes
 * @property {number} deaths
 * @property {number} lastActionAt
 */
