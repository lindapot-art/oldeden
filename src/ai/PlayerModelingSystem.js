/**
 * PlayerModelingSystem — ML-based player behavior prediction and profiling
 * for Old Eden.
 *
 * Builds rich behavioral profiles for each player using lightweight machine
 * learning models implemented from scratch. Profiles drive personalisation
 * across the entire game: the AIDirector consumes churn risk and engagement
 * scores, ProceduralGenerator uses preference vectors to tailor quest hooks,
 * and EconomySystem can trigger targeted retention offers.
 *
 * Core subsystems:
 *
 *   1. **Player Profiling** — maintains a rolling behavioural profile per
 *      player including play-style archetype, preference vector, engagement
 *      score, churn risk, lifetime value, skill progression rate and social
 *      graph.
 *
 *   2. **Behavior Tracking** — listens to game events (actions, deaths,
 *      logins, logouts, purchases, quest completions) and aggregates them
 *      into per-session and per-player metrics.
 *
 *   3. **ML Prediction Models** (all pure JS, no dependencies):
 *      - Logistic Regression churn predictor (online SGD)
 *      - Linear Regression engagement predictor with exponential decay
 *      - KNN play-style classifier over preference vectors
 *
 *   4. **Content Recommendations** — suggests quest types, difficulty
 *      settings and retention interventions based on the player profile.
 *
 *   5. **Population Analytics** — player segmentation, engagement
 *      distribution histograms and churn risk reports.
 *
 * Integration:
 *   - Listens: `player:action`, `player:death`, `player:login`,
 *              `player:logout`, `player:purchase`, `player:quest_complete`
 *   - Emits:   `player:profile_updated`, `player:churn_warning`,
 *              `player:segment_changed`
 *
 * @module PlayerModelingSystem
 */

import { randomUUID } from 'crypto';

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of sessions retained in the rolling session history. */
const MAX_SESSION_HISTORY = 50;

/** Engagement score half-life in milliseconds (4 hours of inactivity). */
const ENGAGEMENT_HALF_LIFE_MS = 4 * 60 * 60 * 1000;

/** Tick interval between model updates in milliseconds. */
const MODEL_UPDATE_INTERVAL_MS = 10_000;

/** Churn risk threshold that triggers a warning event. */
const CHURN_WARNING_THRESHOLD = 0.7;

/** Number of preference dimensions. */
const PREF_DIMS = 6;

/** Action type → preference dimension index mapping. */
const ACTION_CATEGORY = Object.freeze({
  combat:  0,
  explore: 1,
  trade:   2,
  social:  3,
  craft:   4,
});

/**
 * Play-style archetype definitions keyed by dominant preference index.
 * Index 5 (cosmetic/progression) maps to 'achiever'; ties yield 'hybrid'.
 */
const ARCHETYPE_BY_DIMENSION = Object.freeze([
  'fighter',    // 0 — combat
  'explorer',   // 1 — exploration
  'trader',     // 2 — economy
  'socializer', // 3 — social
  'achiever',   // 4 — progression
  'achiever',   // 5 — cosmetic
]);

/** All valid play-style archetypes. */
export const PLAY_STYLES = Object.freeze([
  'explorer',
  'fighter',
  'trader',
  'socializer',
  'achiever',
  'hybrid',
]);

/**
 * Content type recommendations keyed by play-style.
 * Each entry lists activity types best suited for the archetype.
 */
const CONTENT_MAP = Object.freeze({
  fighter:    ['combat_mission', 'arena_challenge', 'bounty_hunt', 'faction_war'],
  explorer:   ['uncharted_sector', 'anomaly_scan', 'cartography', 'relic_hunt'],
  trader:     ['trade_route', 'market_speculation', 'smuggling_run', 'supply_contract'],
  socializer: ['guild_event', 'diplomatic_mission', 'mentorship', 'group_expedition'],
  achiever:   ['achievement_chain', 'leaderboard_climb', 'collection_quest', 'prestige_mission'],
  hybrid:     ['dynamic_event', 'multi_objective', 'exploration_combat', 'community_challenge'],
});

// ── ML Helpers ───────────────────────────────────────────────────────────────

/**
 * Standard sigmoid activation function.
 * @param {number} x
 * @returns {number} Value in (0, 1)
 */
function sigmoid(x) {
  if (x >= 0) {
    return 1 / (1 + Math.exp(-x));
  }
  // Numerically stable variant for negative inputs
  const ex = Math.exp(x);
  return ex / (1 + ex);
}

/**
 * Clamp a number between min and max.
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Euclidean distance between two equal-length vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Normalise a vector so its elements sum to 1.
 * If all zeros, returns a uniform distribution.
 * @param {number[]} v
 * @returns {number[]}
 */
function normalise(v) {
  const sum = v.reduce((s, x) => s + x, 0);
  if (sum === 0) return v.map(() => 1 / v.length);
  return v.map((x) => x / sum);
}

// ── Logistic Regression (Online SGD) ─────────────────────────────────────────

/**
 * Minimal online logistic regression trained with stochastic gradient descent.
 *
 * Used for churn prediction. Supports incremental weight updates on each
 * observation so the model improves continuously as players log out.
 */
class LogisticRegression {
  /**
   * @param {number} numFeatures  Number of input features
   * @param {number} [lr=0.01]    Learning rate
   */
  constructor(numFeatures, lr = 0.01) {
    /** @type {number[]} Weight vector (one per feature) */
    this.weights = new Array(numFeatures).fill(0);
    /** Bias term */
    this.bias = 0;
    /** Learning rate */
    this.lr = lr;
  }

  /**
   * Predict P(y=1 | x) using the current weights.
   * @param {number[]} features
   * @returns {number} Probability in (0, 1)
   */
  predict(features) {
    let z = this.bias;
    for (let i = 0; i < this.weights.length; i++) {
      z += this.weights[i] * (features[i] ?? 0);
    }
    return sigmoid(z);
  }

  /**
   * Perform one step of online SGD given a single labelled example.
   * @param {number[]} features  Input feature vector
   * @param {number}   label     Ground-truth label (0 or 1)
   */
  train(features, label) {
    const predicted = this.predict(features);
    const error = predicted - label;
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] -= this.lr * error * (features[i] ?? 0);
    }
    this.bias -= this.lr * error;
  }
}

// ── Linear Regression (Online SGD) ───────────────────────────────────────────

/**
 * Minimal online linear regression for engagement prediction.
 * Trained incrementally with SGD on each observation.
 */
class LinearRegression {
  /**
   * @param {number} numFeatures  Number of input features
   * @param {number} [lr=0.005]   Learning rate
   */
  constructor(numFeatures, lr = 0.005) {
    /** @type {number[]} */
    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0.5; // Start at mid-engagement
    this.lr = lr;
  }

  /**
   * Predict a continuous engagement score (clamped to 0–1).
   * @param {number[]} features
   * @returns {number}
   */
  predict(features) {
    let y = this.bias;
    for (let i = 0; i < this.weights.length; i++) {
      y += this.weights[i] * (features[i] ?? 0);
    }
    return clamp(y, 0, 1);
  }

  /**
   * Perform one step of online SGD.
   * @param {number[]} features
   * @param {number}   label  Observed engagement score (0–1)
   */
  train(features, label) {
    const predicted = this.predict(features);
    const error = predicted - label;
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] -= this.lr * error * (features[i] ?? 0);
    }
    this.bias -= this.lr * error;
  }
}

// ── Main System ──────────────────────────────────────────────────────────────

export class PlayerModelingSystem {
  async init(engine) {
    this._engine = engine;

    /** @type {Map<string, PlayerProfile>} playerId → full behavioural profile */
    this._profiles = new Map();

    /** @type {Map<string, SessionState>} playerId → current live session state */
    this._activeSessions = new Map();

    /**
     * Churn predictor — logistic regression with 6 features:
     *   [days_since_last_login, avg_session_duration_min, session_freq_per_week,
     *    engagement_trend, social_connections, money_spent]
     */
    this._churnModel = new LogisticRegression(6, 0.01);
    // Seed sensible initial weights so early predictions are meaningful
    this._churnModel.weights = [0.4, -0.3, -0.5, -0.6, -0.2, -0.15];
    this._churnModel.bias = -0.5;

    /**
     * Engagement predictor — linear regression with 4 features:
     *   [recency_score, frequency_score, session_quality, social_score]
     */
    this._engagementModel = new LinearRegression(4, 0.005);
    this._engagementModel.weights = [0.3, 0.25, 0.25, 0.2];

    /** Timer accumulator for periodic model updates. */
    this._modelUpdateTimer = 0;

    // ── Event listeners ──────────────────────────────────────────────────────
    engine.events.on('player:action',         (d) => this._onPlayerAction(d));
    engine.events.on('player:death',          (d) => this._onPlayerDeath(d));
    engine.events.on('player:login',          (d) => this._onPlayerLogin(d));
    engine.events.on('player:logout',         (d) => this._onPlayerLogout(d));
    engine.events.on('player:purchase',       (d) => this._onPlayerPurchase(d));
    engine.events.on('player:quest_complete', (d) => this._onQuestComplete(d));

    console.log('[PlayerModelingSystem] Initialised.');
  }

  tick(deltaMs) {
    const now = Date.now();

    // Decay engagement scores for all known players
    for (const [, profile] of this._profiles) {
      this._decayEngagement(profile, deltaMs);
    }

    // Periodic bulk model update (re-score all active players)
    this._modelUpdateTimer += deltaMs;
    if (this._modelUpdateTimer >= MODEL_UPDATE_INTERVAL_MS) {
      this._modelUpdateTimer = 0;
      this._updateAllModels(now);
    }
  }

  async destroy() {
    this._profiles.clear();
    this._activeSessions.clear();
  }

  // ── Public API — Profile Access ────────────────────────────────────────────

  /**
   * Retrieve the full behavioural profile for a player.
   * Creates a default profile if one does not yet exist.
   *
   * @param {string} playerId
   * @returns {PlayerProfile}
   */
  getProfile(playerId) {
    if (!this._profiles.has(playerId)) {
      this._profiles.set(playerId, this._createDefaultProfile(playerId));
    }
    return this._profiles.get(playerId);
  }

  /**
   * Get the computed play-style archetype for a player.
   *
   * @param {string} playerId
   * @returns {'explorer'|'fighter'|'trader'|'socializer'|'achiever'|'hybrid'}
   */
  getPlayStyle(playerId) {
    return this.getProfile(playerId).playStyle;
  }

  /**
   * Get the current engagement score (0–1) for a player.
   *
   * @param {string} playerId
   * @returns {number}
   */
  getEngagementScore(playerId) {
    return this.getProfile(playerId).engagementScore;
  }

  /**
   * Get the current churn risk (0–1) for a player.
   *
   * @param {string} playerId
   * @returns {number}
   */
  getChurnRisk(playerId) {
    return this.getProfile(playerId).churnRisk;
  }

  // ── Public API — Content Recommendations ───────────────────────────────────

  /**
   * Suggest personalised content for a player based on their preference
   * vector and current engagement level.
   *
   * Returns an ordered list of recommended activity types and a brief
   * rationale for each.
   *
   * @param {string} playerId
   * @returns {ContentRecommendation[]}
   */
  getRecommendedContent(playerId) {
    const profile = this.getProfile(playerId);
    const style = profile.playStyle;
    const prefs = profile.preferenceVector;

    const primary = CONTENT_MAP[style] ?? CONTENT_MAP.hybrid;

    // Build scored recommendations from primary content pool
    const scored = primary.map((activity) => {
      // Higher relevance if it matches the top preference dimension
      const relevance = this._activityRelevance(activity, prefs);
      return { activity, relevance };
    });

    // Mix in one item from an under-served preference to encourage variety
    const weakest = prefs.indexOf(Math.min(...prefs));
    const weakStyle = ARCHETYPE_BY_DIMENSION[weakest] ?? 'hybrid';
    const varietyPool = CONTENT_MAP[weakStyle] ?? CONTENT_MAP.hybrid;
    const varietyPick = varietyPool[Math.floor(Math.random() * varietyPool.length)];
    if (!scored.find((s) => s.activity === varietyPick)) {
      scored.push({ activity: varietyPick, relevance: 0.3 });
    }

    scored.sort((a, b) => b.relevance - a.relevance);

    return scored.map((s) => ({
      activity: s.activity,
      relevance: Math.round(s.relevance * 100) / 100,
      reason: s.relevance >= 0.7
        ? 'Highly aligned with current play-style'
        : s.relevance >= 0.4
          ? 'Moderate fit — may broaden engagement'
          : 'Variety pick — explores under-used preference',
    }));
  }

  /**
   * Compute a fine-grained difficulty recommendation for a player.
   *
   * Returns a multiplier (0.5 – 2.0) and a qualitative label.
   * This is more nuanced than AIDirector's `getDifficultyModifier` because
   * it factors in skill progression rate and engagement trajectory.
   *
   * @param {string} playerId
   * @returns {{ multiplier: number, label: string }}
   */
  getOptimalDifficulty(playerId) {
    const profile = this.getProfile(playerId);
    const engagement = profile.engagementScore;
    const skillRate = profile.skillProgression;
    const churn = profile.churnRisk;

    // Base: scale with skill progression (better players get harder content)
    let multiplier = 0.8 + skillRate * 1.2;

    // If engagement is low, ease off slightly to re-engage
    if (engagement < 0.3) {
      multiplier *= 0.85;
    }

    // If churn risk is high, reduce difficulty to avoid frustration
    if (churn > 0.6) {
      multiplier *= 0.8;
    }

    // If engagement is very high, nudge difficulty upward
    if (engagement > 0.8) {
      multiplier *= 1.1;
    }

    multiplier = clamp(multiplier, 0.5, 2.0);

    let label;
    if (multiplier < 0.75)      label = 'very_easy';
    else if (multiplier < 1.0)  label = 'easy';
    else if (multiplier < 1.25) label = 'normal';
    else if (multiplier < 1.6)  label = 'hard';
    else                        label = 'very_hard';

    return {
      multiplier: Math.round(multiplier * 100) / 100,
      label,
    };
  }

  /**
   * If a player has high churn risk, suggest concrete retention actions.
   *
   * Returns an empty array if churn risk is below the warning threshold.
   *
   * @param {string} playerId
   * @returns {RetentionAction[]}
   */
  getRetentionActions(playerId) {
    const profile = this.getProfile(playerId);
    if (profile.churnRisk < CHURN_WARNING_THRESHOLD) return [];

    /** @type {RetentionAction[]} */
    const actions = [];
    const prefs = profile.preferenceVector;

    // Bonus reward in the player's favourite currency
    const topDim = prefs.indexOf(Math.max(...prefs));
    actions.push({
      type: 'bonus_reward',
      description: `Grant bonus credits in ${['combat', 'exploration', 'economy', 'social', 'progression', 'cosmetic'][topDim]} category`,
      priority: 'high',
      expectedImpact: 0.15,
    });

    // Social prompt if they have friends online
    if (profile.socialGraph.size > 0) {
      actions.push({
        type: 'social_prompt',
        description: 'Notify friends and suggest group activity',
        priority: 'medium',
        expectedImpact: 0.2,
      });
    }

    // New content teaser
    actions.push({
      type: 'new_content',
      description: 'Surface upcoming content preview or exclusive early access',
      priority: 'medium',
      expectedImpact: 0.1,
    });

    // Reduced difficulty if they have been struggling
    if (profile.skillProgression < 0.3) {
      actions.push({
        type: 'difficulty_adjustment',
        description: 'Temporarily reduce encounter difficulty by 25%',
        priority: 'high',
        expectedImpact: 0.12,
      });
    }

    // Re-engagement reward for lapsed players
    if (profile.engagementScore < 0.2) {
      actions.push({
        type: 'comeback_package',
        description: 'Offer welcome-back package with premium items',
        priority: 'high',
        expectedImpact: 0.25,
      });
    }

    return actions;
  }

  // ── Public API — Population Analytics ──────────────────────────────────────

  /**
   * Cluster active players into behavioural segments using their preference
   * vectors and a simple k-nearest-neighbours assignment against archetype
   * centroids.
   *
   * @returns {PlayerSegment[]}
   */
  getPlayerSegments() {
    /** @type {Map<string, string[]>} archetype → playerId[] */
    const segments = new Map();
    for (const style of PLAY_STYLES) {
      segments.set(style, []);
    }

    for (const [playerId, profile] of this._profiles) {
      segments.get(profile.playStyle)?.push(playerId);
    }

    return [...segments.entries()].map(([style, players]) => ({
      segment: style,
      count: players.length,
      playerIds: players,
      avgEngagement: players.length > 0
        ? players.reduce((s, id) => s + this._profiles.get(id).engagementScore, 0) / players.length
        : 0,
      avgChurnRisk: players.length > 0
        ? players.reduce((s, id) => s + this._profiles.get(id).churnRisk, 0) / players.length
        : 0,
    }));
  }

  /**
   * Return a histogram of engagement scores across all tracked players.
   * Buckets: [0–0.1), [0.1–0.2), …, [0.9–1.0].
   *
   * @returns {{ bucket: string, count: number }[]}
   */
  getEngagementDistribution() {
    const buckets = new Array(10).fill(0);
    for (const [, profile] of this._profiles) {
      const idx = Math.min(9, Math.floor(profile.engagementScore * 10));
      buckets[idx]++;
    }
    return buckets.map((count, i) => ({
      bucket: `${(i * 0.1).toFixed(1)}–${((i + 1) * 0.1).toFixed(1)}`,
      count,
    }));
  }

  /**
   * Generate a churn risk report listing players at risk and suggested
   * retention interventions for each.
   *
   * @returns {ChurnRiskEntry[]}
   */
  getChurnRiskReport() {
    /** @type {ChurnRiskEntry[]} */
    const report = [];
    for (const [playerId, profile] of this._profiles) {
      if (profile.churnRisk >= CHURN_WARNING_THRESHOLD) {
        report.push({
          playerId,
          churnRisk: Math.round(profile.churnRisk * 1000) / 1000,
          daysSinceLastLogin: this._daysSinceLastLogin(profile),
          suggestedActions: this.getRetentionActions(playerId),
        });
      }
    }
    report.sort((a, b) => b.churnRisk - a.churnRisk);
    return report;
  }

  // ── Private — Event Handlers ───────────────────────────────────────────────

  /**
   * Handle any player action (combat, trade, explore, social, craft).
   * @param {{ playerId: string, actionType: string, category?: string }} data
   */
  _onPlayerAction({ playerId, actionType, category }) {
    const profile = this.getProfile(playerId);
    const session = this._activeSessions.get(playerId);
    const now = Date.now();

    // Determine action category
    const cat = category ?? this._inferCategory(actionType);

    // Update preference vector raw counts
    const dimIdx = ACTION_CATEGORY[cat];
    if (dimIdx !== undefined) {
      profile._rawPreferences[dimIdx]++;
    }

    // Increment session action counter
    if (session) {
      session.actionCount++;
      session.categoryCounts[cat] = (session.categoryCounts[cat] ?? 0) + 1;
    }

    // Boost engagement on activity
    profile.engagementScore = clamp(profile.engagementScore + 0.02, 0, 1);
    profile._lastActivityAt = now;
  }

  /**
   * Handle player death — track for skill progression calculation.
   * @param {{ playerId: string }} data
   */
  _onPlayerDeath({ playerId }) {
    const profile = this.getProfile(playerId);
    profile._deathCount++;
    // Deaths reduce engagement slightly
    profile.engagementScore = clamp(profile.engagementScore - 0.03, 0, 1);
  }

  /**
   * Handle player login — start a new session.
   * @param {{ playerId: string }} data
   */
  _onPlayerLogin({ playerId }) {
    const profile = this.getProfile(playerId);
    const now = Date.now();

    this._activeSessions.set(playerId, {
      loginTime: now,
      actionCount: 0,
      categoryCounts: {},
    });

    profile._loginCount++;
    profile._lastLoginAt = now;

    // Boost engagement on login
    profile.engagementScore = clamp(profile.engagementScore + 0.1, 0, 1);
  }

  /**
   * Handle player logout — finalise session metrics, train models.
   * @param {{ playerId: string }} data
   */
  _onPlayerLogout({ playerId }) {
    const profile = this.getProfile(playerId);
    const session = this._activeSessions.get(playerId);
    const now = Date.now();

    if (session) {
      const durationMs = now - session.loginTime;
      const durationMin = durationMs / 60_000;
      const apm = durationMin > 0 ? session.actionCount / durationMin : 0;

      // Determine dominant activity
      let dominantActivity = 'explore';
      let maxCount = 0;
      for (const [cat, count] of Object.entries(session.categoryCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantActivity = cat;
        }
      }

      // Compute variety score: Shannon entropy normalised to 0–1
      const variety = this._varietyScore(session.categoryCounts);

      // Add to session history (rolling window)
      profile.sessionHistory.push({
        timestamp: session.loginTime,
        durationMs,
        actionsPerMinute: Math.round(apm * 100) / 100,
        dominantActivity,
        varietyScore: Math.round(variety * 100) / 100,
      });
      if (profile.sessionHistory.length > MAX_SESSION_HISTORY) {
        profile.sessionHistory.shift();
      }

      this._activeSessions.delete(playerId);
    }

    // Recompute derived metrics
    this._recomputeProfile(profile, now);

    // Train churn model with this observation (label: 0 = still playing)
    this._trainChurnModel(profile, 0);

    // Train engagement model
    this._trainEngagementModel(profile);
  }

  /**
   * Handle player purchase — factors into lifetime value and churn features.
   * @param {{ playerId: string, amount?: number }} data
   */
  _onPlayerPurchase({ playerId, amount }) {
    const profile = this.getProfile(playerId);
    profile.lifetimeValue += (amount ?? 1);
    profile.engagementScore = clamp(profile.engagementScore + 0.05, 0, 1);
  }

  /**
   * Handle quest completion — track for progression and engagement.
   * @param {{ playerId: string, questType?: string }} data
   */
  _onQuestComplete({ playerId, questType }) {
    const profile = this.getProfile(playerId);
    profile._questsCompleted++;
    // Progression-dimension preference boost
    profile._rawPreferences[4]++;
    profile.engagementScore = clamp(profile.engagementScore + 0.04, 0, 1);
  }

  // ── Private — Model Logic ─────────────────────────────────────────────────

  /**
   * Exponentially decay a player's engagement score based on elapsed time.
   * @param {PlayerProfile} profile
   * @param {number} deltaMs
   */
  _decayEngagement(profile, deltaMs) {
    const decayFactor = Math.pow(0.5, deltaMs / ENGAGEMENT_HALF_LIFE_MS);
    profile.engagementScore *= decayFactor;
    if (profile.engagementScore < 0.001) profile.engagementScore = 0;
  }

  /**
   * Periodically re-score all tracked players (called from tick).
   * @param {number} now
   */
  _updateAllModels(now) {
    for (const [playerId, profile] of this._profiles) {
      const prevStyle = profile.playStyle;
      const prevSegment = this._segmentLabel(profile);

      this._recomputeProfile(profile, now);

      // Emit events on significant changes
      if (profile.playStyle !== prevStyle) {
        this._engine.events.emit('player:profile_updated', {
          playerId,
          field: 'playStyle',
          oldValue: prevStyle,
          newValue: profile.playStyle,
        });
      }

      const newSegment = this._segmentLabel(profile);
      if (newSegment !== prevSegment) {
        this._engine.events.emit('player:segment_changed', {
          playerId,
          oldSegment: prevSegment,
          newSegment,
        });
      }

      if (profile.churnRisk >= CHURN_WARNING_THRESHOLD) {
        this._engine.events.emit('player:churn_warning', {
          playerId,
          churnRisk: profile.churnRisk,
        });
      }
    }
  }

  /**
   * Recompute all derived fields on a player profile from raw data.
   * @param {PlayerProfile} profile
   * @param {number} now
   */
  _recomputeProfile(profile, now) {
    // ── Preference vector ────────────────────────────────────────────────
    profile.preferenceVector = normalise([...profile._rawPreferences]);

    // ── Play style (KNN classifier) ─────────────────────────────────────
    profile.playStyle = this._classifyPlayStyle(profile.preferenceVector);

    // ── Skill progression ───────────────────────────────────────────────
    profile.skillProgression = this._computeSkillProgression(profile);

    // ── Churn risk (logistic regression) ────────────────────────────────
    const churnFeatures = this._extractChurnFeatures(profile, now);
    profile.churnRisk = clamp(this._churnModel.predict(churnFeatures), 0, 1);

    // ── Engagement prediction (linear regression with decay) ────────────
    const engFeatures = this._extractEngagementFeatures(profile, now);
    const predicted = this._engagementModel.predict(engFeatures);
    // Blend predicted with current decayed score for smoothness
    profile.engagementScore = clamp(
      profile.engagementScore * 0.6 + predicted * 0.4,
      0,
      1
    );
  }

  /**
   * Classify play style using KNN over archetype centroids.
   *
   * Archetype centroids are ideal preference vectors where one dimension
   * dominates.  If the player's vector has no clear dominant dimension
   * (max < 0.3), classify as 'hybrid'.
   *
   * @param {number[]} prefVector  Normalised 6-d preference vector
   * @returns {'explorer'|'fighter'|'trader'|'socializer'|'achiever'|'hybrid'}
   */
  _classifyPlayStyle(prefVector) {
    const max = Math.max(...prefVector);
    if (max < 0.3) return 'hybrid';

    // Build ideal centroids: one-hot per dimension
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let d = 0; d < PREF_DIMS; d++) {
      const centroid = new Array(PREF_DIMS).fill(0.05);
      centroid[d] = 0.75;
      const remaining = (1 - 0.75 - 0.05 * (PREF_DIMS - 1));
      // Distribute remaining evenly among non-dominant dims
      for (let j = 0; j < PREF_DIMS; j++) {
        if (j !== d) centroid[j] += remaining / (PREF_DIMS - 1);
      }
      const dist = euclidean(prefVector, normalise(centroid));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = d;
      }
    }

    return ARCHETYPE_BY_DIMENSION[bestIdx];
  }

  /**
   * Compute a skill progression rate (0–1) based on improving session
   * quality over time.
   *
   * Compares average actions-per-minute in the recent half of sessions
   * vs. the older half.  More improvement → higher score.
   *
   * @param {PlayerProfile} profile
   * @returns {number}
   */
  _computeSkillProgression(profile) {
    const history = profile.sessionHistory;
    if (history.length < 4) return 0.5; // Not enough data — assume average

    const mid = Math.floor(history.length / 2);
    const oldAvg = history.slice(0, mid).reduce((s, h) => s + h.actionsPerMinute, 0) / mid;
    const newAvg = history.slice(mid).reduce((s, h) => s + h.actionsPerMinute, 0) / (history.length - mid);

    if (oldAvg === 0) return 0.5;

    // Ratio of improvement capped to a 0–1 scale via sigmoid-like transform
    const ratio = newAvg / oldAvg;
    // ratio 1.0 → 0.5, ratio 2.0 → ~0.73, ratio 0.5 → ~0.27
    return clamp(sigmoid((ratio - 1) * 3), 0, 1);
  }

  /**
   * Extract the 6-dimensional feature vector for the churn model.
   *
   * Features:
   *   0. days_since_last_login      — recency (higher = more churn risk)
   *   1. avg_session_duration_min   — session length
   *   2. session_frequency_per_week — how often they play
   *   3. engagement_trend           — slope of recent engagement
   *   4. social_connections          — size of social graph
   *   5. money_spent                — lifetime monetary value
   *
   * All features are normalised to roughly [0, 1] range.
   *
   * @param {PlayerProfile} profile
   * @param {number} now
   * @returns {number[]}
   */
  _extractChurnFeatures(profile, now) {
    const daysSinceLogin = (now - profile._lastLoginAt) / (24 * 60 * 60 * 1000);
    const normDays = clamp(daysSinceLogin / 30, 0, 1); // 0–30 days mapped to 0–1

    const avgDuration = profile.sessionHistory.length > 0
      ? profile.sessionHistory.reduce((s, h) => s + h.durationMs, 0)
        / profile.sessionHistory.length / 60_000
      : 0;
    const normDuration = clamp(avgDuration / 120, 0, 1); // 0–120 min → 0–1

    // Session frequency: sessions per 7 days
    const recentSessions = profile.sessionHistory.filter(
      (h) => now - h.timestamp < 7 * 24 * 60 * 60 * 1000
    ).length;
    const normFrequency = clamp(recentSessions / 14, 0, 1); // 0–14 sessions/week

    // Engagement trend: difference between recent and older engagement scores
    const trend = this._engagementTrend(profile);

    const normSocial = clamp(profile.socialGraph.size / 20, 0, 1);
    const normSpent = clamp(profile.lifetimeValue / 100, 0, 1);

    return [normDays, normDuration, normFrequency, trend, normSocial, normSpent];
  }

  /**
   * Extract features for the engagement prediction model.
   *
   * Features:
   *   0. recency_score     — inverse of time since last activity
   *   1. frequency_score   — sessions per week
   *   2. session_quality   — avg variety * duration
   *   3. social_score      — social connections
   *
   * @param {PlayerProfile} profile
   * @param {number} now
   * @returns {number[]}
   */
  _extractEngagementFeatures(profile, now) {
    const hoursSinceActivity = (now - profile._lastActivityAt) / (60 * 60 * 1000);
    const recency = clamp(1 - hoursSinceActivity / 168, 0, 1); // 168 h = 1 week

    const recentSessions = profile.sessionHistory.filter(
      (h) => now - h.timestamp < 7 * 24 * 60 * 60 * 1000
    ).length;
    const frequency = clamp(recentSessions / 14, 0, 1);

    const quality = profile.sessionHistory.length > 0
      ? profile.sessionHistory.slice(-5).reduce((s, h) => {
        const durNorm = clamp(h.durationMs / (60 * 60_000), 0, 1);
        return s + durNorm * (0.5 + 0.5 * h.varietyScore);
      }, 0) / Math.min(5, profile.sessionHistory.length)
      : 0.5;

    const social = clamp(profile.socialGraph.size / 20, 0, 1);

    return [recency, frequency, quality, social];
  }

  /**
   * Train the churn model with one observation.
   * @param {PlayerProfile} profile
   * @param {number} label  0 = not churned, 1 = churned
   */
  _trainChurnModel(profile, label) {
    const features = this._extractChurnFeatures(profile, Date.now());
    this._churnModel.train(features, label);
  }

  /**
   * Train the engagement model with the current engagement as the label.
   * @param {PlayerProfile} profile
   */
  _trainEngagementModel(profile) {
    const features = this._extractEngagementFeatures(profile, Date.now());
    this._engagementModel.train(features, profile.engagementScore);
  }

  /**
   * Compute engagement trend as the slope of engagement over recent sessions.
   * Returns a value in roughly [-1, 1].
   * @param {PlayerProfile} profile
   * @returns {number}
   */
  _engagementTrend(profile) {
    const history = profile.sessionHistory;
    if (history.length < 2) return 0;

    // Use variety scores as a proxy for per-session engagement
    const recent = history.slice(-5);
    if (recent.length < 2) return 0;

    const first = recent[0].varietyScore;
    const last = recent[recent.length - 1].varietyScore;
    return clamp(last - first, -1, 1);
  }

  // ── Private — Utilities ────────────────────────────────────────────────────

  /**
   * Create a default (blank) player profile.
   * @param {string} playerId
   * @returns {PlayerProfile}
   */
  _createDefaultProfile(playerId) {
    const now = Date.now();
    return {
      playerId,
      playStyle: 'hybrid',
      sessionHistory: [],
      preferenceVector: new Array(PREF_DIMS).fill(1 / PREF_DIMS),
      engagementScore: 0.5,
      churnRisk: 0,
      lifetimeValue: 0,
      skillProgression: 0.5,
      socialGraph: new Set(),
      // Internal tracking fields (prefixed with _)
      _rawPreferences: new Array(PREF_DIMS).fill(0),
      _lastLoginAt: now,
      _lastActivityAt: now,
      _loginCount: 0,
      _deathCount: 0,
      _questsCompleted: 0,
    };
  }

  /**
   * Infer an action category from a raw action type string.
   * @param {string} actionType
   * @returns {string}
   */
  _inferCategory(actionType) {
    if (!actionType) return 'explore';
    const lower = actionType.toLowerCase();
    if (lower.includes('combat') || lower.includes('attack') || lower.includes('kill') || lower.includes('fight')) return 'combat';
    if (lower.includes('trade') || lower.includes('buy') || lower.includes('sell') || lower.includes('market')) return 'trade';
    if (lower.includes('social') || lower.includes('chat') || lower.includes('guild') || lower.includes('party')) return 'social';
    if (lower.includes('craft') || lower.includes('build') || lower.includes('forge') || lower.includes('refine')) return 'craft';
    return 'explore';
  }

  /**
   * Compute Shannon entropy–based variety score from action category counts.
   * Returns 0 (single-category) to 1 (perfectly uniform).
   *
   * @param {Record<string, number>} categoryCounts
   * @returns {number}
   */
  _varietyScore(categoryCounts) {
    const counts = Object.values(categoryCounts);
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return 0;

    let entropy = 0;
    for (const c of counts) {
      if (c === 0) continue;
      const p = c / total;
      entropy -= p * Math.log2(p);
    }

    // Normalise: max entropy is log2(numCategories)
    const maxEntropy = Math.log2(counts.length || 1);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Compute relevance score of an activity string to a preference vector.
   * @param {string} activity
   * @param {number[]} prefs
   * @returns {number}
   */
  _activityRelevance(activity, prefs) {
    const lower = activity.toLowerCase();
    let score = 0.5; // base relevance
    if (lower.includes('combat') || lower.includes('arena') || lower.includes('bounty') || lower.includes('war')) {
      score += prefs[0] * 0.5;
    }
    if (lower.includes('explo') || lower.includes('chart') || lower.includes('anomaly') || lower.includes('relic') || lower.includes('uncharted')) {
      score += prefs[1] * 0.5;
    }
    if (lower.includes('trade') || lower.includes('market') || lower.includes('supply') || lower.includes('smuggl')) {
      score += prefs[2] * 0.5;
    }
    if (lower.includes('guild') || lower.includes('group') || lower.includes('diplomat') || lower.includes('mentor')) {
      score += prefs[3] * 0.5;
    }
    if (lower.includes('achieve') || lower.includes('leader') || lower.includes('collect') || lower.includes('prestige')) {
      score += prefs[4] * 0.5;
    }
    return clamp(score, 0, 1);
  }

  /**
   * Number of days since a player last logged in.
   * @param {PlayerProfile} profile
   * @returns {number}
   */
  _daysSinceLastLogin(profile) {
    return Math.round((Date.now() - profile._lastLoginAt) / (24 * 60 * 60 * 1000) * 10) / 10;
  }

  /**
   * Get a segment label for a profile (same as playStyle for now).
   * @param {PlayerProfile} profile
   * @returns {string}
   */
  _segmentLabel(profile) {
    return profile.playStyle;
  }

  /**
   * Add a player to another player's social graph (bidirectional).
   * Called externally or via future social events.
   *
   * @param {string} playerA
   * @param {string} playerB
   */
  recordSocialInteraction(playerA, playerB) {
    const profileA = this.getProfile(playerA);
    const profileB = this.getProfile(playerB);
    profileA.socialGraph.add(playerB);
    profileB.socialGraph.add(playerA);
    // Social interaction boosts social preference dimension
    profileA._rawPreferences[3]++;
    profileB._rawPreferences[3]++;
  }
}

// ── Type Definitions ─────────────────────────────────────────────────────────

/**
 * @typedef {object} PlayerProfile
 * @property {string}       playerId
 * @property {'explorer'|'fighter'|'trader'|'socializer'|'achiever'|'hybrid'} playStyle
 * @property {SessionRecord[]} sessionHistory      Rolling window of last 50 sessions
 * @property {number[]}     preferenceVector        6-d normalised float vector
 * @property {number}       engagementScore         Current engagement level (0–1)
 * @property {number}       churnRisk               Probability of churn within 7 days (0–1)
 * @property {number}       lifetimeValue           Estimated economic contribution
 * @property {number}       skillProgression        Rate of improvement (0–1)
 * @property {Set<string>}  socialGraph             Player IDs frequently interacted with
 * @property {number[]}     _rawPreferences         Unnormalised preference accumulator
 * @property {number}       _lastLoginAt            Timestamp of last login
 * @property {number}       _lastActivityAt         Timestamp of last activity
 * @property {number}       _loginCount             Total login count
 * @property {number}       _deathCount             Total death count
 * @property {number}       _questsCompleted        Total quests completed
 */

/**
 * @typedef {object} SessionRecord
 * @property {number} timestamp         Login time (ms since epoch)
 * @property {number} durationMs        Session length in milliseconds
 * @property {number} actionsPerMinute  Actions per minute during session
 * @property {string} dominantActivity  Most frequent action category
 * @property {number} varietyScore      Shannon entropy variety (0–1)
 */

/**
 * @typedef {object} SessionState
 * @property {number}                 loginTime       Login timestamp
 * @property {number}                 actionCount     Actions this session
 * @property {Record<string, number>} categoryCounts  Actions per category
 */

/**
 * @typedef {object} ContentRecommendation
 * @property {string} activity   Recommended activity type identifier
 * @property {number} relevance  Relevance score (0–1)
 * @property {string} reason     Human-readable rationale
 */

/**
 * @typedef {object} RetentionAction
 * @property {string} type            Intervention type
 * @property {string} description     Human-readable description
 * @property {'high'|'medium'|'low'} priority
 * @property {number} expectedImpact  Estimated churn reduction (0–1)
 */

/**
 * @typedef {object} PlayerSegment
 * @property {string}   segment        Segment name (play-style archetype)
 * @property {number}   count          Number of players in segment
 * @property {string[]} playerIds      Player IDs in this segment
 * @property {number}   avgEngagement  Average engagement score
 * @property {number}   avgChurnRisk   Average churn risk
 */

/**
 * @typedef {object} ChurnRiskEntry
 * @property {string}            playerId
 * @property {number}            churnRisk          Churn probability (0–1)
 * @property {number}            daysSinceLastLogin
 * @property {RetentionAction[]} suggestedActions
 */
