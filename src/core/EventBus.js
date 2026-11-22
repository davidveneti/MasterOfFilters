/**
 * Minimal publish/subscribe bus shared by GameManager, filters and the UI.
 * Handlers are isolated: one throwing listener never breaks the others.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.map = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} evt event name
   * @param {(payload:any)=>void} fn handler
   * @returns {() => void} unsubscribe function
   */
  on(evt, fn) {
    let set = this.map.get(evt);
    if (!set) { set = new Set(); this.map.set(evt, set); }
    set.add(fn);
    return () => this.off(evt, fn);
  }

  /** Subscribe for a single delivery. @returns {() => void} unsubscribe */
  once(evt, fn) {
    const off = this.on(evt, (p) => { off(); fn(p); });
    return off;
  }

  off(evt, fn) {
    const set = this.map.get(evt);
    if (set) set.delete(fn);
  }

  /** Publish an event to every subscriber (and to the '*' wildcard). */
  emit(evt, payload) {
    for (const key of [evt, '*']) {
      const set = this.map.get(key);
      if (!set) continue;
      for (const fn of [...set]) {
        try { fn(key === '*' ? { type: evt, payload } : payload); }
        catch (err) { console.error(`[EventBus] handler for "${evt}" failed`, err); }
      }
    }
  }

  clear() { this.map.clear(); }
}
