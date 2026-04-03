/**
 * MarketIntelligenceSystem — ML-driven economic analysis and auto-balancing
 * for Old Eden.
 *
 * Provides real-time intelligence about the game's multi-currency economy,
 * detecting anomalies, forecasting supply/demand, and generating balancing
 * recommendations through lightweight reinforcement learning.
 *
 * Core subsystems:
 *
 *   1. **Price History Tracking** — rolling windows of EC/SM exchange rates,
 *      per-currency transaction volumes, and sector-level economic activity.
 *
 *   2. **Anomaly Detection** — Z-score based detection of volume spikes,
 *      price manipulation attempts, and wealth concentration via Gini
 *      coefficient monitoring.
 *
 *   3. **Supply/Demand Prediction** — Holt-Winters triple exponential
 *      smoothing for EC/SM demand forecasting with confidence intervals.
 *
 *   4. **Auto-Balancing via RL Signals** — Q-table reinforcement learning
 *      that observes economic state (inflation, volume, Gini buckets) and
 *      recommends adjustments to emission rates, SM pricing, and drop rates.
 *
 *   5. **Wealth Distribution Analysis** — Gini coefficient, percentile
 *      distribution, composite health score, and money velocity tracking.
 *
 *   6. **Sector Economics** — per-sector activity tracking, trade hub
 *      identification, dead zone detection, and resource event targeting.
 *
 * Integration:
 *   - Listens: `economy:credit`, `economy:debit`, `economy:transaction`,
 *              `economy:subscription_changed`
 *   - Emits:   `economy:anomaly_detected`, `economy:forecast_update`,
 *              `economy:health_report`
 *
 * All ML models are implemented from scratch using only standard Node.js
 * APIs — no external dependencies.
 *
 * @module MarketIntelligenceSystem
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of exchange-rate data points retained in the rolling window. */
const MAX_PRICE_HISTORY = 1000;

/** Duration of a single volume-tracking time bucket in milliseconds. */
const VOLUME_BUCKET_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum number of volume buckets retained per currency. */
const MAX_VOLUME_BUCKETS = 288; // 24 hours at 5-min intervals

/** Z-score threshold for anomaly detection (>2σ from rolling mean). */
const ANOMALY_Z_THRESHOLD = 2.0;

/** Minimum data points required before anomaly detection activates. */
const ANOMALY_MIN_SAMPLES = 20;

/** Window size for rolling mean/stddev in anomaly detection. */
const ANOMALY_ROLLING_WINDOW = 50;

/** Number of recent trades inspected for manipulation detection. */
const MANIPULATION_WINDOW = 20;

/**
 * Fraction of unidirectional trades that triggers a manipulation alert.
 * If ≥80 % of recent trades flow in one direction, we flag it.
 */
const MANIPULATION_THRESHOLD = 0.8;

/** Gini coefficient above which we emit a wealth-concentration anomaly. */
const GINI_ALERT_THRESHOLD = 0.65;

/** Interval between forecast recomputations in milliseconds. */
const FORECAST_INTERVAL_MS = 60_000; // 1 minute

/** Interval between economic health report emissions in milliseconds. */
const HEALTH_REPORT_INTERVAL_MS = 120_000; // 2 minutes

/** Interval between Q-table RL updates in milliseconds. */
const RL_UPDATE_INTERVAL_MS = 30_000; // 30 seconds

/** Q-learning discount factor (γ). */
const RL_GAMMA = 0.9;

/** Q-learning learning rate (α). */
const RL_ALPHA = 0.1;

/** Q-learning exploration probability (ε). */
const RL_EPSILON = 0.15;

/** Number of buckets per state dimension for Q-table discretisation. */
const STATE_BUCKETS = 3; // low / medium / high

/** Holt-Winters default smoothing parameters. */
const HW_ALPHA = 0.3;  // level
const HW_BETA  = 0.1;  // trend
const HW_GAMMA_SEASONAL = 0.2; // seasonality

/** Number of periods in one seasonal cycle (12 five-minute buckets = 1 hour). */
const HW_SEASON_LENGTH = 12;

/** Minimum observations before Holt-Winters forecasting activates. */
const HW_MIN_OBSERVATIONS = HW_SEASON_LENGTH * 2;

/** Target annual EC inflation rate (as a fraction, e.g. 0.02 = 2 %). */
const TARGET_INFLATION = 0.02;

/** Sectors with fewer than this many transactions are considered dead zones. */
const DEAD_ZONE_THRESHOLD = 5;

/** Sectors with more than this many transactions are considered trade hubs. */
const TRADE_HUB_THRESHOLD = 50;

// ── RL Action Space ──────────────────────────────────────────────────────────

/**
 * Possible actions the RL agent can recommend for each economic lever.
 * Index 0 = decrease, 1 = hold, 2 = increase.
 */
const RL_ACTIONS = Object.freeze(['decrease', 'hold', 'increase']);

/**
 * Number of levers the RL agent controls:
 *   0 — EC emission rate
 *   1 — SM pricing modifier
 *   2 — Item/resource drop rate
 */
const RL_NUM_LEVERS = 3;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Clamp a number between a minimum and maximum.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the arithmetic mean of a numeric array.
 * @param {number[]} values
 * @returns {number}  Mean, or 0 if empty.
 */
function mean(values) {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  return sum / values.length;
}

/**
 * Compute the population standard deviation of a numeric array.
 * @param {number[]} values
 * @param {number}   [mu]  Pre-computed mean (saves a pass if already known).
 * @returns {number}  Standard deviation, or 0 if fewer than 2 elements.
 */
function stddev(values, mu) {
  if (values.length < 2) return 0;
  if (mu === undefined) mu = mean(values);
  let sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - mu;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / values.length);
}

/**
 * Map a continuous value to a discrete bucket index in [0, numBuckets).
 * @param {number} value
 * @param {number} min     Expected minimum of the value range.
 * @param {number} max     Expected maximum of the value range.
 * @param {number} numBuckets
 * @returns {number}  Bucket index.
 */
function bucketise(value, min, max, numBuckets) {
  const clamped = clamp(value, min, max);
  const normalised = (clamped - min) / (max - min || 1);
  return Math.min(numBuckets - 1, Math.floor(normalised * numBuckets));
}

// ── MarketIntelligenceSystem ─────────────────────────────────────────────────

export class MarketIntelligenceSystem {
  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialise the system, bind to economy events, and set up internal state.
   * @param {object} engine  The GameEngine instance.
   */
  async init(engine) {
    this._engine = engine;

    // ── Price history ──────────────────────────────────────────────────────
    /** @type {PricePoint[]} Rolling window of EC/SM exchange rate snapshots. */
    this._priceHistory = [];

    // ── Volume tracking ────────────────────────────────────────────────────
    /** @type {Map<string, VolumeBucket[]>} currency → rolling volume buckets. */
    this._volumeBuckets = new Map();
    this._volumeBuckets.set('ec', []);
    this._volumeBuckets.set('sm', []);

    // ── Sector economics ───────────────────────────────────────────────────
    /** @type {Map<string, SectorActivity>} sectorId → activity record. */
    this._sectorActivity = new Map();

    // ── Transaction log (for manipulation detection) ───────────────────────
    /** @type {TradeRecord[]} Recent exchange trades in FIFO order. */
    this._recentTrades = [];

    // ── Anomaly detection ──────────────────────────────────────────────────
    /** @type {number} Last computed Gini coefficient. */
    this._lastGini = 0;

    // ── Holt-Winters forecast state ────────────────────────────────────────
    /** @type {HoltWintersState|null} Forecast model for EC demand. */
    this._hwEc = null;
    /** @type {HoltWintersState|null} Forecast model for SM demand. */
    this._hwSm = null;
    /** @type {number[]} Raw EC volume observations fed into the forecaster. */
    this._ecObservations = [];
    /** @type {number[]} Raw SM volume observations fed into the forecaster. */
    this._smObservations = [];

    // ── RL Q-table ─────────────────────────────────────────────────────────
    /**
     * Q-table mapping state keys to action-value arrays.
     * State key format: `${inflationBucket}_${volumeBucket}_${giniBucket}`
     * Value: Float64Array of length RL_ACTIONS.length ** RL_NUM_LEVERS
     * @type {Map<string, Float64Array>}
     */
    this._qTable = new Map();
    /** @type {string|null} Previous state key for RL update. */
    this._prevState = null;
    /** @type {number|null} Previous combined action index for RL update. */
    this._prevAction = null;

    // ── RL output (current recommendations) ────────────────────────────────
    /** @type {number} Suggested EC emission rate modifier (0.5–2.0). */
    this._ecInflationTarget = 1.0;
    /** @type {number} Suggested SM pricing modifier (0.5–2.0). */
    this._smPricingAdjustment = 1.0;
    /** @type {number} Suggested item/resource drop rate modifier (0.5–2.0). */
    this._dropRateModifier = 1.0;

    // ── Velocity of money ──────────────────────────────────────────────────
    /** @type {number} Total EC transacted in the current measurement window. */
    this._ecTransacted = 0;
    /** @type {number} Total EC supply snapshot (sum of all wallets). */
    this._totalEcSupply = 0;
    /** @type {number} Last computed velocity-of-money metric. */
    this._moneyVelocity = 0;

    // ── Timing accumulators ────────────────────────────────────────────────
    this._forecastTimer = 0;
    this._healthReportTimer = 0;
    this._rlTimer = 0;
    this._volumeBucketTimer = 0;

    // ── Bind to economy events ─────────────────────────────────────────────
    engine.events.on('economy:credit', (data) => this._onCredit(data));
    engine.events.on('economy:debit', (data) => this._onDebit(data));
    engine.events.on('economy:transaction', (data) => this._onTransaction(data));
    engine.events.on('economy:subscription_changed', (data) => this._onSubscriptionChanged(data));

    console.log('[MarketIntelligenceSystem] Initialised.');
  }

  /**
   * Per-frame update: advance rolling statistics, check for anomalies, and
   * periodically recompute forecasts and RL recommendations.
   * @param {number} deltaMs  Milliseconds since last tick.
   */
  tick(deltaMs) {
    // Record current exchange rate snapshot
    this._recordPriceSnapshot();

    // Advance volume bucket timer and rotate buckets when a window elapses
    this._volumeBucketTimer += deltaMs;
    if (this._volumeBucketTimer >= VOLUME_BUCKET_MS) {
      this._rotateVolumeBuckets();
      this._volumeBucketTimer = 0;
    }

    // Anomaly detection (every tick — lightweight)
    this._checkVolumeAnomalies();
    this._checkManipulation();

    // Periodic forecast update
    this._forecastTimer += deltaMs;
    if (this._forecastTimer >= FORECAST_INTERVAL_MS) {
      this._updateForecasts();
      this._forecastTimer = 0;
    }

    // Periodic health report
    this._healthReportTimer += deltaMs;
    if (this._healthReportTimer >= HEALTH_REPORT_INTERVAL_MS) {
      this._emitHealthReport();
      this._healthReportTimer = 0;
    }

    // Periodic RL update
    this._rlTimer += deltaMs;
    if (this._rlTimer >= RL_UPDATE_INTERVAL_MS) {
      this._rlStep();
      this._rlTimer = 0;
    }
  }

  /**
   * Tear down the system and release resources.
   */
  async destroy() {
    this._priceHistory = [];
    this._volumeBuckets.clear();
    this._sectorActivity.clear();
    this._recentTrades = [];
    this._qTable.clear();
    this._ecObservations = [];
    this._smObservations = [];
    this._hwEc = null;
    this._hwSm = null;
  }

  // ── Public API — RL Recommendations ────────────────────────────────────────

  /**
   * Suggested EC emission rate modifier based on RL policy.
   *
   * A value of 1.0 means no change. Values below 1.0 recommend reducing EC
   * emission (contractionary), values above 1.0 recommend increasing it
   * (expansionary).
   *
   * @returns {number}  Modifier in the range [0.5, 2.0].
   */
  getEcInflationTarget() {
    return this._ecInflationTarget;
  }

  /**
   * Suggested SM pricing adjustment based on RL policy.
   *
   * Multiplier applied to base SM prices. Below 1.0 = cheaper SM (stimulate
   * purchases), above 1.0 = pricier SM (absorb excess supply).
   *
   * @returns {number}  Modifier in the range [0.5, 2.0].
   */
  getSmPricingAdjustment() {
    return this._smPricingAdjustment;
  }

  /**
   * Suggested item/resource drop rate modifier based on RL policy.
   *
   * Applied to base drop tables. Below 1.0 = fewer drops (reduce inflation),
   * above 1.0 = more drops (stimulate activity).
   *
   * @returns {number}  Modifier in the range [0.5, 2.0].
   */
  getDropRateModifier() {
    return this._dropRateModifier;
  }

  // ── Public API — Wealth Distribution ───────────────────────────────────────

  /**
   * Compute the Gini coefficient from an array of wallet balances.
   *
   * The Gini coefficient measures inequality on a scale from 0 (perfect
   * equality) to 1 (maximal inequality). Uses the relative mean absolute
   * difference formula for O(n²) exact computation.
   *
   * @param {number[]} wallets  Array of non-negative balance values.
   * @returns {number}  Gini coefficient in [0, 1], or 0 if input is empty.
   */
  computeGiniCoefficient(wallets) {
    const n = wallets.length;
    if (n < 2) return 0;

    let sumAbsDiff = 0;
    let totalWealth = 0;
    for (let i = 0; i < n; i++) {
      totalWealth += wallets[i];
      for (let j = i + 1; j < n; j++) {
        sumAbsDiff += Math.abs(wallets[i] - wallets[j]);
      }
    }

    if (totalWealth === 0) return 0;

    // Gini = Σ|xi - xj| / (2 * n * Σxi)
    // We summed only upper triangle so multiply by 2
    return (2 * sumAbsDiff) / (2 * n * totalWealth);
  }

  /**
   * Return wealth percentile distribution across all tracked wallets.
   *
   * Queries the EconomySystem for all player wallets, sums each player's
   * total balance (EC + SM converted to EC at current rates), and returns
   * percentile boundaries.
   *
   * @returns {WealthDistribution}  Percentile data and summary statistics.
   */
  getWealthDistribution() {
    const economy = this._engine.getSystem('economy');
    if (!economy) return this._emptyDistribution();

    const balances = this._collectTotalBalances(economy);
    if (balances.length === 0) return this._emptyDistribution();

    balances.sort((a, b) => a - b);
    const n = balances.length;

    const percentile = (p) => {
      const idx = Math.min(n - 1, Math.floor(p * n));
      return balances[idx];
    };

    const mu = mean(balances);
    const gini = this.computeGiniCoefficient(balances);

    return {
      count: n,
      mean: mu,
      median: percentile(0.5),
      p10: percentile(0.1),
      p25: percentile(0.25),
      p75: percentile(0.75),
      p90: percentile(0.9),
      p99: percentile(0.99),
      min: balances[0],
      max: balances[n - 1],
      gini,
    };
  }

  /**
   * Compute a composite economic health score from 0 (critical) to 1 (ideal).
   *
   * Factors weighted into the score:
   *   - Gini coefficient (lower is healthier)          — 25 %
   *   - Transaction volume (moderate is healthy)       — 25 %
   *   - Inflation proximity to target (closer = better)— 25 %
   *   - Money velocity (moderate is healthy)           — 25 %
   *
   * @returns {EconomicHealth}  Health score with component breakdown.
   */
  getEconomicHealth() {
    const gini = this._lastGini;
    const volume = this._getCurrentVolume();
    const inflation = this._estimateInflation();
    const velocity = this._moneyVelocity;

    // Gini score: 1.0 at Gini=0, 0.0 at Gini≥0.8
    const giniScore = clamp(1 - gini / 0.8, 0, 1);

    // Volume score: bell curve centred on "moderate" activity
    // Normalise volume into [0,1] where 0.5 is ideal
    const volNorm = clamp(volume / (TRADE_HUB_THRESHOLD * 2), 0, 1);
    const volumeScore = 1 - 2 * Math.abs(volNorm - 0.5);

    // Inflation score: 1.0 when actual matches target, 0.0 when far off
    const inflDelta = Math.abs(inflation - TARGET_INFLATION);
    const inflationScore = clamp(1 - inflDelta / 0.1, 0, 1);

    // Velocity score: bell curve, 0.5 normalised is ideal
    const velNorm = clamp(velocity / 2, 0, 1);
    const velocityScore = 1 - 2 * Math.abs(velNorm - 0.5);

    const composite = (giniScore + volumeScore + inflationScore + velocityScore) / 4;

    return {
      composite: clamp(composite, 0, 1),
      giniScore,
      volumeScore,
      inflationScore,
      velocityScore,
      gini,
      inflation,
      velocity,
    };
  }

  // ── Public API — Forecasting ───────────────────────────────────────────────

  /**
   * Get the latest EC demand forecast with confidence intervals.
   *
   * Uses Holt-Winters triple exponential smoothing when sufficient data is
   * available, otherwise falls back to a simple exponential moving average.
   *
   * @param {number} [periods=6]  Number of periods ahead to forecast.
   * @returns {Forecast}  Forecasted values with confidence bounds.
   */
  getEcForecast(periods = 6) {
    return this._generateForecast(this._hwEc, this._ecObservations, periods);
  }

  /**
   * Get the latest SM demand forecast with confidence intervals.
   * @param {number} [periods=6]  Number of periods ahead to forecast.
   * @returns {Forecast}  Forecasted values with confidence bounds.
   */
  getSmForecast(periods = 6) {
    return this._generateForecast(this._hwSm, this._smObservations, periods);
  }

  // ── Public API — Sector Economics ──────────────────────────────────────────

  /**
   * Get the economic activity record for a specific sector.
   * @param {string} sectorId
   * @returns {SectorActivity|null}
   */
  getSectorActivity(sectorId) {
    return this._sectorActivity.get(sectorId) ?? null;
  }

  /**
   * Identify sectors functioning as trade hubs (high transaction volume).
   * @returns {string[]}  Array of sector IDs that exceed the trade-hub threshold.
   */
  getTradeHubs() {
    const hubs = [];
    for (const [sectorId, activity] of this._sectorActivity) {
      if (activity.transactionCount >= TRADE_HUB_THRESHOLD) {
        hubs.push(sectorId);
      }
    }
    return hubs;
  }

  /**
   * Identify economic dead zones (sectors with very low activity).
   * @returns {string[]}  Array of sector IDs below the dead-zone threshold.
   */
  getDeadZones() {
    const zones = [];
    for (const [sectorId, activity] of this._sectorActivity) {
      if (activity.transactionCount < DEAD_ZONE_THRESHOLD) {
        zones.push(sectorId);
      }
    }
    return zones;
  }

  /**
   * Suggest sectors where resource events should be spawned to stimulate
   * economic activity in dead zones.
   *
   * Ranks dead zones by staleness (time since last transaction) and returns
   * up to `maxSuggestions` sectors.
   *
   * @param {number} [maxSuggestions=3]  Maximum number of suggestions.
   * @returns {SectorSuggestion[]}  Suggested sectors with rationale.
   */
  suggestResourceEventLocations(maxSuggestions = 3) {
    const deadZones = [];
    const now = Date.now();

    for (const [sectorId, activity] of this._sectorActivity) {
      if (activity.transactionCount < DEAD_ZONE_THRESHOLD) {
        deadZones.push({
          sectorId,
          transactionCount: activity.transactionCount,
          staleness: now - activity.lastTransactionAt,
          wealthOutflow: activity.wealthOutflow,
          wealthInflow: activity.wealthInflow,
        });
      }
    }

    // Prioritise by staleness (oldest first) then by net outflow
    deadZones.sort((a, b) => {
      const stalenessDiff = b.staleness - a.staleness;
      if (Math.abs(stalenessDiff) > 60_000) return stalenessDiff;
      return (b.wealthOutflow - b.wealthInflow) - (a.wealthOutflow - a.wealthInflow);
    });

    return deadZones.slice(0, maxSuggestions).map((zone) => ({
      sectorId: zone.sectorId,
      reason: zone.staleness > 600_000
        ? 'prolonged_inactivity'
        : 'low_transaction_volume',
      stalenessMs: zone.staleness,
      netOutflow: zone.wealthOutflow - zone.wealthInflow,
    }));
  }

  // ── Public API — Price History ─────────────────────────────────────────────

  /**
   * Get the full rolling price history (EC/SM exchange rate snapshots).
   * @returns {PricePoint[]}
   */
  getPriceHistory() {
    return this._priceHistory.slice();
  }

  /**
   * Get the current money velocity metric.
   *
   * Money velocity measures how quickly currency circulates through the
   * economy. Computed as total EC transacted divided by total EC supply
   * over the measurement window.
   *
   * @returns {number}  Velocity value (higher = faster circulation).
   */
  getMoneyVelocity() {
    return this._moneyVelocity;
  }

  // ── Event Handlers ─────────────────────────────────────────────────────────

  /**
   * Handle a wallet credit event from the EconomySystem.
   * @param {{ playerId: string, currency: string, amount: number }} data
   * @private
   */
  _onCredit(data) {
    const { currency, amount, playerId } = data;
    this._recordVolume(currency, amount);
    this._recordSectorTransaction(data.sectorId ?? 'unknown', amount, 'inflow');
    if (currency === 'ec') this._ecTransacted += amount;
  }

  /**
   * Handle a wallet debit event from the EconomySystem.
   * @param {{ playerId: string, currency: string, amount: number }} data
   * @private
   */
  _onDebit(data) {
    const { currency, amount } = data;
    this._recordVolume(currency, amount);
    this._recordSectorTransaction(data.sectorId ?? 'unknown', amount, 'outflow');
    if (currency === 'ec') this._ecTransacted += amount;
  }

  /**
   * Handle a generic transaction event (e.g. player-to-player exchange).
   *
   * Expects at minimum `{ currency, amount }`. Optional fields: `sectorId`,
   * `direction` ('buy'|'sell'), `playerId`.
   *
   * @param {TransactionEvent} data
   * @private
   */
  _onTransaction(data) {
    const { currency, amount, direction, sectorId } = data;
    this._recordVolume(currency ?? 'ec', amount ?? 0);

    if (sectorId) {
      this._recordSectorTransaction(sectorId, amount ?? 0, direction === 'sell' ? 'outflow' : 'inflow');
    }

    // Track for manipulation detection
    if (direction) {
      this._recentTrades.push({ direction, amount: amount ?? 0, timestamp: Date.now() });
      if (this._recentTrades.length > MANIPULATION_WINDOW) {
        this._recentTrades.shift();
      }
    }

    if (currency === 'ec') this._ecTransacted += amount ?? 0;
  }

  /**
   * Handle subscription tier change events.
   * @param {{ playerId: string, tier: string }} data
   * @private
   */
  _onSubscriptionChanged(_data) {
    // Subscription changes affect earning multipliers which indirectly
    // influence supply — no direct action needed, but the next forecast
    // cycle will pick up the shifted volume patterns.
  }

  // ── Price History Tracking ─────────────────────────────────────────────────

  /**
   * Record a snapshot of the current EC/SM exchange rate.
   * @private
   */
  _recordPriceSnapshot() {
    const economy = this._engine.getSystem('economy');
    if (!economy) return;

    const rates = economy.getExchangeRates();
    this._priceHistory.push({
      timestamp: Date.now(),
      ecPerSmSell: rates.ecPerSmSell,
      ecPerSmBuy: rates.ecPerSmBuy,
    });

    if (this._priceHistory.length > MAX_PRICE_HISTORY) {
      this._priceHistory.shift();
    }
  }

  // ── Volume Tracking ────────────────────────────────────────────────────────

  /**
   * Accumulate transaction volume into the current time bucket.
   * @param {string} currency
   * @param {number} amount
   * @private
   */
  _recordVolume(currency, amount) {
    const key = currency === 'sm' ? 'sm' : 'ec';
    const buckets = this._volumeBuckets.get(key);
    if (!buckets) return;

    if (buckets.length === 0) {
      buckets.push({ timestamp: Date.now(), volume: 0 });
    }
    buckets[buckets.length - 1].volume += amount;
  }

  /**
   * Rotate volume buckets at the end of a time window, feed data into
   * the observation arrays for forecasting, and update money velocity.
   * @private
   */
  _rotateVolumeBuckets() {
    const now = Date.now();

    for (const [currency, buckets] of this._volumeBuckets) {
      const lastVolume = buckets.length > 0 ? buckets[buckets.length - 1].volume : 0;

      // Feed into observation arrays
      if (currency === 'ec') this._ecObservations.push(lastVolume);
      if (currency === 'sm') this._smObservations.push(lastVolume);

      // Start a new bucket
      buckets.push({ timestamp: now, volume: 0 });
      if (buckets.length > MAX_VOLUME_BUCKETS) buckets.shift();
    }

    // Update money velocity
    this._updateMoneyVelocity();
  }

  /**
   * Recompute money velocity: total EC transacted / total EC supply.
   * @private
   */
  _updateMoneyVelocity() {
    const economy = this._engine.getSystem('economy');
    if (!economy) return;

    const balances = this._collectTotalBalances(economy);
    this._totalEcSupply = 0;
    for (let i = 0; i < balances.length; i++) this._totalEcSupply += balances[i];

    if (this._totalEcSupply > 0) {
      this._moneyVelocity = this._ecTransacted / this._totalEcSupply;
    } else {
      this._moneyVelocity = 0;
    }

    // Reset transacted accumulator for next window
    this._ecTransacted = 0;
  }

  // ── Sector Economics ───────────────────────────────────────────────────────

  /**
   * Record a transaction against a sector's activity ledger.
   * @param {string} sectorId
   * @param {number} amount
   * @param {'inflow'|'outflow'} flowType
   * @private
   */
  _recordSectorTransaction(sectorId, amount, flowType) {
    if (!this._sectorActivity.has(sectorId)) {
      this._sectorActivity.set(sectorId, {
        transactionCount: 0,
        wealthInflow: 0,
        wealthOutflow: 0,
        lastTransactionAt: Date.now(),
      });
    }

    const record = this._sectorActivity.get(sectorId);
    record.transactionCount++;
    record.lastTransactionAt = Date.now();
    if (flowType === 'inflow') {
      record.wealthInflow += amount;
    } else {
      record.wealthOutflow += amount;
    }
  }

  // ── Anomaly Detection ──────────────────────────────────────────────────────

  /**
   * Check for unusual spikes in transaction volume using Z-scores.
   *
   * For each currency, compute the Z-score of the most recent volume
   * bucket against the rolling mean and standard deviation. If the Z-score
   * exceeds ANOMALY_Z_THRESHOLD, emit an anomaly event.
   *
   * @private
   */
  _checkVolumeAnomalies() {
    for (const [currency, buckets] of this._volumeBuckets) {
      if (buckets.length < ANOMALY_MIN_SAMPLES) continue;

      const window = buckets.slice(-ANOMALY_ROLLING_WINDOW);
      const volumes = window.map((b) => b.volume);
      const currentVolume = volumes[volumes.length - 1];

      const mu = mean(volumes);
      const sigma = stddev(volumes, mu);
      if (sigma === 0) continue;

      const zScore = (currentVolume - mu) / sigma;

      if (Math.abs(zScore) > ANOMALY_Z_THRESHOLD) {
        this._engine.events.emit('economy:anomaly_detected', {
          type: 'volume_spike',
          currency,
          zScore,
          currentVolume,
          rollingMean: mu,
          rollingStdDev: sigma,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Detect potential price manipulation by checking for rapid unidirectional
   * trade sequences.
   *
   * If ≥ MANIPULATION_THRESHOLD of the last N trades are in the same
   * direction (all buys or all sells), we flag it as suspicious.
   *
   * @private
   */
  _checkManipulation() {
    if (this._recentTrades.length < MANIPULATION_WINDOW) return;

    const window = this._recentTrades.slice(-MANIPULATION_WINDOW);
    let buyCount = 0;
    let sellCount = 0;
    for (const trade of window) {
      if (trade.direction === 'buy') buyCount++;
      else if (trade.direction === 'sell') sellCount++;
    }

    const total = buyCount + sellCount;
    if (total === 0) return;

    const buyRatio = buyCount / total;
    const sellRatio = sellCount / total;

    if (buyRatio >= MANIPULATION_THRESHOLD || sellRatio >= MANIPULATION_THRESHOLD) {
      this._engine.events.emit('economy:anomaly_detected', {
        type: 'price_manipulation',
        dominantDirection: buyRatio > sellRatio ? 'buy' : 'sell',
        ratio: Math.max(buyRatio, sellRatio),
        tradeCount: total,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Check for wealth concentration anomalies via Gini coefficient.
   *
   * Called during the health report cycle rather than every tick to avoid
   * the O(n²) cost.
   *
   * @private
   */
  _checkGiniAnomaly() {
    if (this._lastGini > GINI_ALERT_THRESHOLD) {
      this._engine.events.emit('economy:anomaly_detected', {
        type: 'wealth_concentration',
        gini: this._lastGini,
        threshold: GINI_ALERT_THRESHOLD,
        timestamp: Date.now(),
      });
    }
  }

  // ── Holt-Winters Triple Exponential Smoothing ──────────────────────────────

  /**
   * Initialise a Holt-Winters model from a series of observations.
   *
   * Uses the first full seasonal cycle to compute initial seasonal indices
   * via the classical decomposition approach.
   *
   * @param {number[]} observations  Time series data (≥ 2 × season length).
   * @returns {HoltWintersState}  Initialised model state.
   * @private
   */
  _hwInitialise(observations) {
    const L = HW_SEASON_LENGTH;
    const n = observations.length;

    // Initial level: mean of the first season
    let level = 0;
    for (let i = 0; i < L; i++) level += observations[i];
    level /= L;

    // Initial trend: average difference between first two seasons
    let trend = 0;
    if (n >= 2 * L) {
      for (let i = 0; i < L; i++) {
        trend += (observations[i + L] - observations[i]) / L;
      }
      trend /= L;
    }

    // Initial seasonal indices: ratio of first season to level
    const seasonal = new Float64Array(L);
    for (let i = 0; i < L; i++) {
      seasonal[i] = level !== 0 ? observations[i] / level : 1;
    }

    return { level, trend, seasonal, period: 0 };
  }

  /**
   * Update the Holt-Winters model with a new observation and return the
   * one-step-ahead fitted value.
   *
   * Implements the multiplicative Holt-Winters method:
   *   Level:    l_t = α (y_t / s_{t-L}) + (1 - α)(l_{t-1} + b_{t-1})
   *   Trend:    b_t = β (l_t - l_{t-1}) + (1 - β) b_{t-1}
   *   Season:   s_t = γ (y_t / l_t) + (1 - γ) s_{t-L}
   *   Forecast: ŷ_{t+h} = (l_t + h × b_t) × s_{t-L+h mod L}
   *
   * @param {HoltWintersState} state  Model state (mutated in place).
   * @param {number}           observation  New data point.
   * @returns {number}  One-step-ahead forecast made *before* seeing this point.
   * @private
   */
  _hwUpdate(state, observation) {
    const L = HW_SEASON_LENGTH;
    const idx = state.period % L;

    const seasonalPrev = state.seasonal[idx];
    const safeSeasonal = seasonalPrev === 0 ? 1 : seasonalPrev;

    // Forecast made before this observation
    const forecast = (state.level + state.trend) * safeSeasonal;

    // Update level
    const safeLevel = state.level === 0 ? 1 : state.level;
    const newLevel = HW_ALPHA * (observation / safeSeasonal) +
                     (1 - HW_ALPHA) * (state.level + state.trend);

    // Update trend
    const newTrend = HW_BETA * (newLevel - state.level) +
                     (1 - HW_BETA) * state.trend;

    // Update seasonal index
    const safeNewLevel = newLevel === 0 ? 1 : newLevel;
    state.seasonal[idx] = HW_GAMMA_SEASONAL * (observation / safeNewLevel) +
                          (1 - HW_GAMMA_SEASONAL) * safeSeasonal;

    state.level = newLevel;
    state.trend = newTrend;
    state.period++;

    return forecast;
  }

  /**
   * Generate a multi-step-ahead forecast from a Holt-Winters model.
   *
   * @param {HoltWintersState|null} state        Current model state.
   * @param {number[]}              observations  Raw observations for fallback.
   * @param {number}                periods       Number of periods to forecast.
   * @returns {Forecast}  Forecasted values with confidence bounds.
   * @private
   */
  _generateForecast(state, observations, periods) {
    if (!state || observations.length < HW_MIN_OBSERVATIONS) {
      return this._fallbackForecast(observations, periods);
    }

    const L = HW_SEASON_LENGTH;
    const forecasts = [];
    const upper = [];
    const lower = [];

    // Compute residual standard deviation for confidence intervals
    const residualStd = this._computeResidualStd(state, observations);

    for (let h = 1; h <= periods; h++) {
      const seasonIdx = (state.period + h) % L;
      const seasonFactor = state.seasonal[seasonIdx] || 1;
      const pointForecast = (state.level + h * state.trend) * seasonFactor;

      // Confidence widens with horizon: ±1.96σ√h (approx 95 %)
      const margin = 1.96 * residualStd * Math.sqrt(h);
      forecasts.push(Math.max(0, pointForecast));
      upper.push(Math.max(0, pointForecast + margin));
      lower.push(Math.max(0, pointForecast - margin));
    }

    return { forecasts, upper, lower, method: 'holt_winters' };
  }

  /**
   * Compute the standard deviation of one-step-ahead forecast residuals.
   * @param {HoltWintersState} state
   * @param {number[]} observations
   * @returns {number}
   * @private
   */
  _computeResidualStd(state, observations) {
    if (observations.length < HW_MIN_OBSERVATIONS + 1) return 0;

    // Replay the model on the last season's worth of data to get residuals
    const replayStart = Math.max(0, observations.length - HW_SEASON_LENGTH);
    const residuals = [];

    // Create a temporary copy of state for replay
    const tmpState = {
      level: state.level,
      trend: state.trend,
      seasonal: new Float64Array(state.seasonal),
      period: state.period - (observations.length - replayStart),
    };

    for (let i = replayStart; i < observations.length; i++) {
      const forecast = this._hwUpdate(tmpState, observations[i]);
      residuals.push(observations[i] - forecast);
    }

    return stddev(residuals);
  }

  /**
   * Fallback forecast using simple exponential moving average when
   * insufficient data is available for Holt-Winters.
   *
   * @param {number[]} observations
   * @param {number}   periods
   * @returns {Forecast}
   * @private
   */
  _fallbackForecast(observations, periods) {
    if (observations.length === 0) {
      return {
        forecasts: new Array(periods).fill(0),
        upper: new Array(periods).fill(0),
        lower: new Array(periods).fill(0),
        method: 'none',
      };
    }

    // Simple exponential smoothing
    const alpha = 0.3;
    let smoothed = observations[0];
    for (let i = 1; i < observations.length; i++) {
      smoothed = alpha * observations[i] + (1 - alpha) * smoothed;
    }

    const sigma = stddev(observations);
    const forecasts = [];
    const upper = [];
    const lower = [];

    for (let h = 1; h <= periods; h++) {
      forecasts.push(Math.max(0, smoothed));
      upper.push(Math.max(0, smoothed + 1.96 * sigma * Math.sqrt(h)));
      lower.push(Math.max(0, smoothed - 1.96 * sigma * Math.sqrt(h)));
    }

    return { forecasts, upper, lower, method: 'exponential_smoothing' };
  }

  /**
   * Update both EC and SM Holt-Winters forecast models.
   * @private
   */
  _updateForecasts() {
    // Initialise EC model if we have enough data
    if (!this._hwEc && this._ecObservations.length >= HW_MIN_OBSERVATIONS) {
      this._hwEc = this._hwInitialise(this._ecObservations);
      // Catch up the model on all observations past the initialisation window
      for (let i = HW_SEASON_LENGTH; i < this._ecObservations.length; i++) {
        this._hwUpdate(this._hwEc, this._ecObservations[i]);
      }
    } else if (this._hwEc && this._ecObservations.length > 0) {
      // Feed only the latest observation
      const lastIdx = this._ecObservations.length - 1;
      this._hwUpdate(this._hwEc, this._ecObservations[lastIdx]);
    }

    // Initialise SM model if we have enough data
    if (!this._hwSm && this._smObservations.length >= HW_MIN_OBSERVATIONS) {
      this._hwSm = this._hwInitialise(this._smObservations);
      for (let i = HW_SEASON_LENGTH; i < this._smObservations.length; i++) {
        this._hwUpdate(this._hwSm, this._smObservations[i]);
      }
    } else if (this._hwSm && this._smObservations.length > 0) {
      const lastIdx = this._smObservations.length - 1;
      this._hwUpdate(this._hwSm, this._smObservations[lastIdx]);
    }

    this._engine.events.emit('economy:forecast_update', {
      ec: this.getEcForecast(),
      sm: this.getSmForecast(),
      timestamp: Date.now(),
    });
  }

  // ── Reinforcement Learning (Q-Table) ───────────────────────────────────────

  /**
   * Perform one step of the Q-learning update loop.
   *
   * 1. Observe the current economic state and discretise it.
   * 2. Compute the reward signal from the previous action.
   * 3. Update the Q-table entry for the previous (state, action) pair.
   * 4. Choose a new action via ε-greedy policy.
   * 5. Translate the chosen action into modifier recommendations.
   *
   * @private
   */
  _rlStep() {
    const state = this._rlObserveState();
    const reward = this._rlComputeReward();

    // Q-learning update for previous transition
    if (this._prevState !== null && this._prevAction !== null) {
      const prevQ = this._rlGetQ(this._prevState);
      const currQ = this._rlGetQ(state);
      const maxNextQ = this._rlMaxQ(currQ);

      prevQ[this._prevAction] += RL_ALPHA * (
        reward + RL_GAMMA * maxNextQ - prevQ[this._prevAction]
      );
    }

    // ε-greedy action selection
    const action = this._rlSelectAction(state);
    this._prevState = state;
    this._prevAction = action;

    // Decode combined action into per-lever actions and apply modifiers
    this._rlApplyAction(action);
  }

  /**
   * Observe and discretise the current economic state into a Q-table key.
   *
   * State dimensions:
   *   - Inflation bucket (0–2): based on estimated current inflation rate
   *   - Volume bucket (0–2): based on recent aggregate transaction volume
   *   - Gini bucket (0–2): based on latest Gini coefficient
   *
   * @returns {string}  State key of the form `inf_vol_gini`.
   * @private
   */
  _rlObserveState() {
    const inflation = this._estimateInflation();
    const volume = this._getCurrentVolume();
    const gini = this._lastGini;

    const infBucket = bucketise(inflation, -0.05, 0.15, STATE_BUCKETS);
    const volBucket = bucketise(volume, 0, TRADE_HUB_THRESHOLD * 3, STATE_BUCKETS);
    const ginBucket = bucketise(gini, 0, 1, STATE_BUCKETS);

    return `${infBucket}_${volBucket}_${ginBucket}`;
  }

  /**
   * Compute the reward signal for the current economic state.
   *
   * Positive when the economy is healthy (moderate inflation, active trade,
   * low Gini), negative when unhealthy (hyperinflation, deflation,
   * stagnation).
   *
   * @returns {number}  Reward value, typically in [-1, 1].
   * @private
   */
  _rlComputeReward() {
    const health = this.getEconomicHealth();
    // Map composite health [0,1] → reward [-1,1]
    return 2 * health.composite - 1;
  }

  /**
   * Get or create the Q-value array for a given state key.
   * @param {string} stateKey
   * @returns {Float64Array}
   * @private
   */
  _rlGetQ(stateKey) {
    if (!this._qTable.has(stateKey)) {
      // Combined action space: 3 actions ^ 3 levers = 27 possible combos
      this._qTable.set(stateKey, new Float64Array(RL_ACTIONS.length ** RL_NUM_LEVERS));
    }
    return this._qTable.get(stateKey);
  }

  /**
   * Find the maximum Q-value across all actions for a given state.
   * @param {Float64Array} qValues
   * @returns {number}
   * @private
   */
  _rlMaxQ(qValues) {
    let max = -Infinity;
    for (let i = 0; i < qValues.length; i++) {
      if (qValues[i] > max) max = qValues[i];
    }
    return max === -Infinity ? 0 : max;
  }

  /**
   * Select a combined action using ε-greedy exploration.
   * @param {string} stateKey
   * @returns {number}  Combined action index in [0, 27).
   * @private
   */
  _rlSelectAction(stateKey) {
    const numActions = RL_ACTIONS.length ** RL_NUM_LEVERS;

    if (Math.random() < RL_EPSILON) {
      // Explore: random action
      return Math.floor(Math.random() * numActions);
    }

    // Exploit: argmax Q(s, a)
    const qValues = this._rlGetQ(stateKey);
    let bestAction = 0;
    let bestValue = qValues[0];
    for (let i = 1; i < qValues.length; i++) {
      if (qValues[i] > bestValue) {
        bestValue = qValues[i];
        bestAction = i;
      }
    }
    return bestAction;
  }

  /**
   * Decode a combined action index into per-lever actions and update
   * the system's recommendation modifiers.
   *
   * Combined action index is treated as a base-3 number:
   *   action = lever0 * 9 + lever1 * 3 + lever2
   *
   * Each lever's action (0=decrease, 1=hold, 2=increase) maps to a
   * modifier delta of -0.05, 0, or +0.05.
   *
   * @param {number} combinedAction
   * @private
   */
  _rlApplyAction(combinedAction) {
    const deltas = [-0.05, 0, 0.05]; // decrease / hold / increase

    const lever0 = Math.floor(combinedAction / 9) % 3;
    const lever1 = Math.floor(combinedAction / 3) % 3;
    const lever2 = combinedAction % 3;

    this._ecInflationTarget = clamp(
      this._ecInflationTarget + deltas[lever0], 0.5, 2.0
    );
    this._smPricingAdjustment = clamp(
      this._smPricingAdjustment + deltas[lever1], 0.5, 2.0
    );
    this._dropRateModifier = clamp(
      this._dropRateModifier + deltas[lever2], 0.5, 2.0
    );
  }

  // ── Health Reporting ───────────────────────────────────────────────────────

  /**
   * Compute Gini coefficient and emit a comprehensive health report event.
   * @private
   */
  _emitHealthReport() {
    const economy = this._engine.getSystem('economy');
    if (economy) {
      const balances = this._collectTotalBalances(economy);
      this._lastGini = this.computeGiniCoefficient(balances);
    }

    // Check for wealth concentration anomaly
    this._checkGiniAnomaly();

    const health = this.getEconomicHealth();
    const distribution = this.getWealthDistribution();

    this._engine.events.emit('economy:health_report', {
      health,
      distribution,
      tradeHubs: this.getTradeHubs(),
      deadZones: this.getDeadZones(),
      moneyVelocity: this._moneyVelocity,
      timestamp: Date.now(),
    });
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  /**
   * Collect total EC-equivalent balances from all player wallets.
   *
   * Converts SM holdings to EC at the current sell rate so that all wealth
   * is expressed in a single unit.
   *
   * @param {object} economy  The EconomySystem instance.
   * @returns {number[]}  Array of total balances (one per player).
   * @private
   */
  _collectTotalBalances(economy) {
    const rates = economy.getExchangeRates();
    const balances = [];

    // Access wallets via the public API — iterate known wallets
    if (economy._wallets && typeof economy._wallets[Symbol.iterator] === 'function') {
      for (const [, wallet] of economy._wallets) {
        const total = wallet.ec + wallet.sm * rates.ecPerSmSell;
        balances.push(total);
      }
    }

    return balances;
  }

  /**
   * Get the total transaction volume across the most recent volume bucket.
   * @returns {number}
   * @private
   */
  _getCurrentVolume() {
    let total = 0;
    for (const [, buckets] of this._volumeBuckets) {
      if (buckets.length > 0) {
        total += buckets[buckets.length - 1].volume;
      }
    }
    return total;
  }

  /**
   * Estimate the current inflation rate from exchange rate drift.
   *
   * Compares the average exchange rate over the last 100 data points to
   * the average over the 100 before that. Returns the percentage change
   * annualised based on the tick interval.
   *
   * @returns {number}  Estimated inflation rate (e.g. 0.03 = 3 %).
   * @private
   */
  _estimateInflation() {
    const h = this._priceHistory;
    if (h.length < 200) return 0;

    // Recent window: last 100 points
    let recentSum = 0;
    for (let i = h.length - 100; i < h.length; i++) {
      recentSum += h[i].ecPerSmSell;
    }
    const recentAvg = recentSum / 100;

    // Prior window: 100 before that
    let priorSum = 0;
    for (let i = h.length - 200; i < h.length - 100; i++) {
      priorSum += h[i].ecPerSmSell;
    }
    const priorAvg = priorSum / 100;

    if (priorAvg === 0) return 0;

    // Raw rate change over the observation window
    const rawChange = (recentAvg - priorAvg) / priorAvg;

    // Approximate annualisation: each price point is ~one tick (100ms),
    // 100 points ≈ 10 seconds. Scale to annual for interpretability.
    // In practice this gives a noisy but directionally correct signal.
    const windowSeconds = 10;
    const annualisationFactor = (365.25 * 24 * 3600) / windowSeconds;
    return rawChange * annualisationFactor;
  }

  /**
   * Return an empty wealth distribution object (used when no data is available).
   * @returns {WealthDistribution}
   * @private
   */
  _emptyDistribution() {
    return {
      count: 0,
      mean: 0,
      median: 0,
      p10: 0,
      p25: 0,
      p75: 0,
      p90: 0,
      p99: 0,
      min: 0,
      max: 0,
      gini: 0,
    };
  }
}

// ── Type Definitions ─────────────────────────────────────────────────────────

/**
 * @typedef {object} PricePoint
 * @property {number} timestamp   Unix timestamp in milliseconds.
 * @property {number} ecPerSmSell EC per 1 SM at the sell rate.
 * @property {number} ecPerSmBuy  EC per 1 SM at the buy rate.
 */

/**
 * @typedef {object} VolumeBucket
 * @property {number} timestamp  Start time of the bucket (Unix ms).
 * @property {number} volume     Cumulative transaction volume in this bucket.
 */

/**
 * @typedef {object} SectorActivity
 * @property {number} transactionCount  Total transactions in this sector.
 * @property {number} wealthInflow      Total currency flowing into the sector.
 * @property {number} wealthOutflow     Total currency flowing out of the sector.
 * @property {number} lastTransactionAt Unix timestamp of the last transaction.
 */

/**
 * @typedef {object} SectorSuggestion
 * @property {string} sectorId    Sector to target with a resource event.
 * @property {string} reason      Why this sector was chosen.
 * @property {number} stalenessMs Milliseconds since the sector's last transaction.
 * @property {number} netOutflow  Net currency outflow (outflow − inflow).
 */

/**
 * @typedef {object} TradeRecord
 * @property {string} direction  'buy' or 'sell'.
 * @property {number} amount     Trade amount.
 * @property {number} timestamp  Unix timestamp in milliseconds.
 */

/**
 * @typedef {object} TransactionEvent
 * @property {string}  [currency]   Currency code ('ec' | 'sm').
 * @property {number}  [amount]     Transaction amount.
 * @property {string}  [direction]  'buy' or 'sell'.
 * @property {string}  [sectorId]   Sector where the transaction occurred.
 * @property {string}  [playerId]   Player involved.
 */

/**
 * @typedef {object} HoltWintersState
 * @property {number}       level     Current smoothed level.
 * @property {number}       trend     Current smoothed trend.
 * @property {Float64Array} seasonal  Seasonal indices (length = season).
 * @property {number}       period    Current period counter.
 */

/**
 * @typedef {object} Forecast
 * @property {number[]} forecasts  Point forecasts for each future period.
 * @property {number[]} upper      Upper confidence bound (95 %).
 * @property {number[]} lower      Lower confidence bound (95 %).
 * @property {string}   method     Forecasting method used.
 */

/**
 * @typedef {object} WealthDistribution
 * @property {number} count   Number of players.
 * @property {number} mean    Mean total wealth.
 * @property {number} median  Median total wealth.
 * @property {number} p10     10th percentile.
 * @property {number} p25     25th percentile.
 * @property {number} p75     75th percentile.
 * @property {number} p90     90th percentile.
 * @property {number} p99     99th percentile.
 * @property {number} min     Minimum wealth.
 * @property {number} max     Maximum wealth.
 * @property {number} gini    Gini coefficient.
 */

/**
 * @typedef {object} EconomicHealth
 * @property {number} composite       Composite health score (0–1).
 * @property {number} giniScore       Gini health component (0–1).
 * @property {number} volumeScore     Volume health component (0–1).
 * @property {number} inflationScore  Inflation health component (0–1).
 * @property {number} velocityScore   Velocity health component (0–1).
 * @property {number} gini            Raw Gini coefficient.
 * @property {number} inflation       Estimated inflation rate.
 * @property {number} velocity        Money velocity metric.
 */
