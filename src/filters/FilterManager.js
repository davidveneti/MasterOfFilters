import { loadFilterSettings, saveFilterSettings, defaultsFromSchema } from '../settingsStore.js';

/**
 * Registers filter classes and keeps exactly one instance alive at a time.
 * Activating a filter fully disposes the previous one first (no leaks, and
 * inactive filters consume zero CPU/GPU).
 */
export class FilterManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.registry = new Map(); // id -> FilterClass
    this.settingsById = new Map();
    this.active = null;
    this.activeId = null;
    this.listeners = new Map();
  }

  // ---- events: 'change' | 'error'
  on(evt, fn) {
    if (!this.listeners.has(evt)) this.listeners.set(evt, new Set());
    this.listeners.get(evt).add(fn);
    return () => this.listeners.get(evt).delete(fn);
  }
  _emit(evt, payload) {
    const set = this.listeners.get(evt);
    if (set) for (const fn of set) fn(payload);
  }

  // ---- registration
  register(FilterClass) {
    const id = FilterClass.meta.id;
    if (this.registry.has(id)) throw new Error(`Filter "${id}" already registered`);
    this.registry.set(id, FilterClass);
    return this;
  }
  list() { return [...this.registry.values()].map((F) => F.meta); }
  has(id) { return this.registry.has(id); }

  // ---- settings
  getSettings(id) {
    let s = this.settingsById.get(id);
    if (!s) {
      s = loadFilterSettings(id, this.registry.get(id).settings);
      this.settingsById.set(id, s);
    }
    return s;
  }
  setSetting(key, value) {
    if (!this.active) return;
    const s = this.getSettings(this.activeId);
    s[key] = value;
    saveFilterSettings(this.activeId, s);
    this.active.onSettingChange(key);
  }
  resetSettings() {
    if (!this.active) return;
    const s = this.getSettings(this.activeId);
    Object.assign(s, defaultsFromSchema(this.registry.get(this.activeId).settings));
    saveFilterSettings(this.activeId, s);
    this.active.onSettingChange('*');
  }

  // ---- activation
  activate(id) {
    if (id === this.activeId && this.active) return true;
    const FilterClass = this.registry.get(id);
    if (!FilterClass) return false;

    this.deactivate();
    const filter = new FilterClass(this.ctx, this.getSettings(id));
    try {
      filter.initialize();
      const { w, h, dpr } = this.ctx.viewport;
      filter.onResize(w, h, dpr);
    } catch (err) {
      console.error(`Filter "${id}" failed to initialize`, err);
      try { filter.dispose(); } catch { /* ignore */ }
      this._emit('error', err);
      this._emit('change', null);
      return false;
    }
    this.active = filter;
    this.activeId = id;
    this._emit('change', filter);
    return true;
  }

  deactivate() {
    if (!this.active) return;
    try { this.active.dispose(); }
    catch (err) { console.error('Filter dispose failed', err); }
    this.active = null;
    this.activeId = null;
    this.ctx.clearOverlay();
  }

  // ---- per-frame
  update(dt, time) { if (this.active) this.active.update(dt, time); }
  render() {
    const f = this.active;
    if (!f) return;
    if (f.constructor.meta.usesOverlay) { this.ctx.clearOverlay(); f.render(); }
  }
  onResize(w, h, dpr) { if (this.active) this.active.onResize(w, h, dpr); }

  dispose() { this.deactivate(); this.listeners.clear(); }
}
