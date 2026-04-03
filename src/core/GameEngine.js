import { EventEmitter } from './EventEmitter.js';

/**
 * GameEngine — the central orchestrator for all Old Eden game systems.
 *
 * Responsibilities:
 *  - Register and initialise game systems in dependency order
 *  - Drive the main game tick at a configurable rate
 *  - Provide a shared event bus and system registry to every subsystem
 *  - Handle graceful startup and shutdown
 *
 * Architecture:
 *   Each "system" is an object that implements:
 *     - async init(engine)  — called once at startup
 *     - tick(deltaMs)       — called every game tick
 *     - async destroy()     — called on shutdown
 */
export class GameEngine {
  /**
   * @param {object} [options]
   * @param {number} [options.tickRateMs=100] Game tick interval in milliseconds
   */
  constructor(options = {}) {
    this.tickRateMs = options.tickRateMs ?? parseInt(process.env.GAME_TICK_MS ?? '100', 10);
    this.events = new EventEmitter();
    /** @type {Map<string, object>} */
    this._systems = new Map();
    this._running = false;
    this._tickInterval = null;
    this._lastTickTime = null;
    this._tickCount = 0;
  }

  /**
   * Register a named system with the engine.
   * Systems are initialised in registration order.
   * @param {string} name
   * @param {object} system  Must implement { init, tick, destroy }
   * @returns {this}
   */
  registerSystem(name, system) {
    if (this._running) {
      throw new Error(`Cannot register system "${name}" while engine is running.`);
    }
    this._systems.set(name, system);
    return this;
  }

  /**
   * Retrieve a registered system by name.
   * @param {string} name
   * @returns {object}
   */
  getSystem(name) {
    const system = this._systems.get(name);
    if (!system) throw new Error(`System "${name}" is not registered.`);
    return system;
  }

  /**
   * Initialise all registered systems and start the game tick.
   */
  async start() {
    if (this._running) return;

    console.log('[GameEngine] Starting Old Eden engine…');

    for (const [name, system] of this._systems) {
      console.log(`[GameEngine]   Initialising system: ${name}`);
      await system.init(this);
    }

    this._running = true;
    this._lastTickTime = Date.now();
    this._tickInterval = setInterval(() => this._tick(), this.tickRateMs);

    this.events.emit('engine:started', { timestamp: Date.now() });
    console.log(`[GameEngine] Engine running at ${1000 / this.tickRateMs} TPS.`);
  }

  /**
   * Stop the game tick and destroy all systems.
   */
  async stop() {
    if (!this._running) return;

    this._running = false;
    clearInterval(this._tickInterval);
    this._tickInterval = null;

    for (const [name, system] of [...this._systems].reverse()) {
      console.log(`[GameEngine]   Destroying system: ${name}`);
      await system.destroy?.();
    }

    this.events.emit('engine:stopped', { timestamp: Date.now(), totalTicks: this._tickCount });
    console.log('[GameEngine] Engine stopped.');
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _tick() {
    const now = Date.now();
    const deltaMs = now - this._lastTickTime;
    this._lastTickTime = now;
    this._tickCount++;

    for (const [, system] of this._systems) {
      try {
        system.tick?.(deltaMs);
      } catch (err) {
        console.error('[GameEngine] Error in system tick:', err);
      }
    }

    this.events.emit('engine:tick', { tick: this._tickCount, deltaMs });
  }
}
