const KEY = 'ar-crypto-progress-v1';
const VERSION = 1;

/** @returns {object} fresh default document */
const emptyDoc = () => ({
  v: VERSION,
  missions: {},   // missionId -> { phaseIndex, phases:{phaseId: gameState}, completed, completedAt }
  badges: {},     // badgeId -> { earnedAt: ISO string }
  prefs: { theme: 'dark', sound: false, panelCollapsed: false },
});

/**
 * localStorage-backed persistence for missions, badges and UI preferences.
 * Falls back to memory if storage is unavailable, and to defaults if the
 * saved document is corrupt, so it can never break the app.
 */
export class ProgressStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.doc = this._load();
  }

  _load() {
    const base = emptyDoc();
    try {
      const raw = this.storage && this.storage.getItem(KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || saved.v !== VERSION) return base;
      return {
        v: VERSION,
        missions: saved.missions && typeof saved.missions === 'object' ? saved.missions : {},
        badges: saved.badges && typeof saved.badges === 'object' ? saved.badges : {},
        prefs: { ...base.prefs, ...(saved.prefs || {}) },
      };
    } catch { return base; }
  }

  _save() {
    try { this.storage && this.storage.setItem(KEY, JSON.stringify(this.doc)); }
    catch { /* quota / private mode: keep working in memory */ }
  }

  // ---- missions
  getMission(id) { return this.doc.missions[id] || null; }
  saveMission(id, data) { this.doc.missions[id] = data; this._save(); }
  resetMission(id) { delete this.doc.missions[id]; this._save(); }

  // ---- badges
  getBadges() { return { ...this.doc.badges }; }
  hasBadge(id) { return !!this.doc.badges[id]; }
  /** @returns {boolean} true if the badge was newly earned */
  earnBadge(id, when = new Date().toISOString()) {
    if (this.doc.badges[id]) return false;
    this.doc.badges[id] = { earnedAt: when };
    this._save();
    return true;
  }

  // ---- prefs
  getPref(key) { return this.doc.prefs[key]; }
  setPref(key, value) { this.doc.prefs[key] = value; this._save(); }

  /** Wipe missions and badges; UI preferences (theme, sound) are kept. */
  resetProgress() { this.doc.missions = {}; this.doc.badges = {}; this._save(); }

  /** Wipe everything, preferences included. */
  resetAll() { this.doc = emptyDoc(); this._save(); }
}
