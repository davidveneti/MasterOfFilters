/**
 * Reference-counted shared resource cache.
 * Filters acquire() what they need and release() on dispose, so a resource
 * (texture, canvas sprite...) lives only while at least one filter uses it.
 */
export class ResourceCache {
  constructor() { this.map = new Map(); }
  acquire(key, factory) {
    let e = this.map.get(key);
    if (!e) { e = { res: factory(), refs: 0 }; this.map.set(key, e); }
    e.refs++;
    return e.res;
  }
  release(key) {
    const e = this.map.get(key);
    if (!e) return;
    if (--e.refs <= 0) {
      if (e.res && typeof e.res.dispose === 'function') e.res.dispose();
      this.map.delete(key);
    }
  }
  get size() { return this.map.size; }
}
