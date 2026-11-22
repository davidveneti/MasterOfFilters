import { BADGES } from './badges.js';
import { GameEvents } from './events.js';

/**
 * Awards badges when missions complete and keeps the achievements list.
 * Listens to MISSION_COMPLETE; announces BADGE_UNLOCKED and REWARD(kind:'badge').
 */
export class BadgeSystem {
  /**
   * @param {{store: import('../storage/ProgressStore.js').ProgressStore, bus: import('../core/EventBus.js').EventBus}} deps
   */
  constructor({ store, bus }) {
    this.store = store;
    this.bus = bus;
    this.defs = BADGES;
    this.off = bus.on(GameEvents.MISSION_COMPLETE, ({ mission }) => {
      const def = this.defs.find((b) => b.missionId === mission.id);
      if (def) this.unlock(def.id, mission.id);
    });
  }

  /** @returns {boolean} true if newly unlocked */
  unlock(id, missionId = null) {
    const def = this.defs.find((b) => b.id === id);
    if (!def || !this.store.earnBadge(id)) return false;
    const badge = this.get(id);
    this.bus.emit(GameEvents.BADGE_UNLOCKED, { badge });
    this.bus.emit(GameEvents.REWARD, { kind: 'badge', missionId, badgeId: id, badge });
    // meta-badges (e.g. Crypto Apprentice) depend on other badges
    for (const d of this.defs) {
      if (d.requires && d.requires.every((r) => this.store.hasBadge(r))) this.unlock(d.id, missionId);
    }
    return true;
  }

  /** @returns {object} catalogue entry + {earned, earnedAt} */
  get(id) {
    const def = this.defs.find((b) => b.id === id);
    const got = this.store.getBadges()[id];
    return def && { ...def, earned: !!got, earnedAt: got ? got.earnedAt : null };
  }

  list() { return this.defs.map((d) => this.get(d.id)); }
  earnedCount() { return this.list().filter((b) => b.earned).length; }
  dispose() { this.off(); }
}
