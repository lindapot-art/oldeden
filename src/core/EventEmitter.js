/**
 * EventEmitter — typed in-process event bus used by all game systems.
 *
 * Usage:
 *   const emitter = new EventEmitter();
 *   emitter.on('player:death', (data) => { ... });
 *   emitter.emit('player:death', { characterId: '...' });
 */
export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    /** @type {Map<string, Set<Function>>} */
    this._onceListeners = new Map();
  }

  /**
   * Register a persistent listener for the given event.
   * @param {string} event
   * @param {Function} handler
   * @returns {this}
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return this;
  }

  /**
   * Register a one-time listener that removes itself after first invocation.
   * @param {string} event
   * @param {Function} handler
   * @returns {this}
   */
  once(event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      this.off(event, wrapper);
    };
    if (!this._onceListeners.has(event)) {
      this._onceListeners.set(event, new Set());
    }
    this._onceListeners.get(event).add(wrapper);
    this.on(event, wrapper);
    return this;
  }

  /**
   * Remove a previously registered listener.
   * @param {string} event
   * @param {Function} handler
   * @returns {this}
   */
  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
    this._onceListeners.get(event)?.delete(handler);
    return this;
  }

  /**
   * Emit an event, invoking all registered listeners synchronously.
   * @param {string} event
   * @param {*} data
   * @returns {this}
   */
  emit(event, data) {
    this._listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventEmitter] Error in handler for "${event}":`, err);
      }
    });
    return this;
  }

  /**
   * Remove all listeners, optionally for a specific event.
   * @param {string} [event]
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
      this._onceListeners.delete(event);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }
}
