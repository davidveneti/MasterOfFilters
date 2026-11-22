import * as THREE from 'three';

/**
 * Base class for every AR filter.
 *
 * Lifecycle (driven by FilterManager):
 *   new Filter(ctx, settings) -> initialize() -> { update(dt,time) -> render() }* -> dispose()
 *
 * A filter instance only exists while it is active. Everything it creates must
 * be registered with track() (disposables) or acquire() (shared cache), or be
 * a child of this.root (geometries/materials are disposed automatically).
 * That makes dispose() leak-free and gives inactive filters a zero footprint.
 *
 * Static metadata:
 *   static meta     = { id, name, icon, description, usesOverlay }
 *   static settings = [ { key, label, type:'range'|'color'|'checkbox', ... default } ]
 */
export class BaseFilter {
  static meta = { id: 'base', name: 'Base', icon: '?', description: '', usesOverlay: false };
  static settings = [];

  constructor(ctx, settings) {
    this.ctx = ctx;
    this.settings = settings;
    this.root = new THREE.Group();
    this._tracked = [];
    this._cacheKeys = [];
    this.disposed = false;
  }

  /**
   * Subscribe to the shared EventBus (ctx.events). The subscription is removed
   * automatically in dispose(), so a filter can never leak a listener.
   * @param {string} evt event name (see game/events.js)
   * @param {(payload:any)=>void} fn
   */
  listen(evt, fn) {
    if (!this.ctx.events) return;
    this._tracked.push({ dispose: this.ctx.events.on(evt, fn) });
  }

  /** Register anything with a dispose() method; returns it for chaining. */
  track(obj) { this._tracked.push(obj); return obj; }

  /** Get a ref-counted shared resource; released automatically on dispose(). */
  acquire(key, factory) {
    this._cacheKeys.push(key);
    return this.ctx.cache.acquire(key, factory);
  }

  /** Create resources. Subclasses must call super.initialize() first. */
  initialize() { this.ctx.scene.add(this.root); }

  /** Logic step (60 Hz). Face data lives in this.ctx.face / ctx.faceVisible. */
  update(dt, time) {}

  /** 2D overlay drawing (ctx.g, CSS pixels). The overlay is cleared before this call. */
  render() {}

  onResize(w, h, dpr) {}
  onSettingChange(key) {}
  /** Optional: draw filter-specific debug markers (dbg = DebugOverlay). */
  debugDraw(dbg) {}

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ctx.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.root.clear();
    for (const t of this._tracked) { try { t.dispose(); } catch (e) { console.warn(e); } }
    this._tracked.length = 0;
    for (const k of this._cacheKeys) this.ctx.cache.release(k);
    this._cacheKeys.length = 0;
  }
}
