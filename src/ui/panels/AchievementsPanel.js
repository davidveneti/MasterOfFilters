import { h, formatDate } from '../dom.js';
import { Modal } from '../components/Modal.js';
import { ProgressBar } from '../components/ProgressBar.js';

/** Trophy room: every badge with description, status and date, plus mission progress. */
export class AchievementsPanel {
  /**
   * @param {{badges: import('../../game/BadgeSystem.js').BadgeSystem, store: import('../../storage/ProgressStore.js').ProgressStore,
   *          missions: Map<string, object>, onReset: () => void}} deps
   */
  constructor({ badges, store, missions, onReset }) {
    this.badges = badges;
    this.store = store;
    this.missions = missions;
    this.onReset = onReset;
    this.modal = new Modal({ title: '🏆 Trofei e badge', className: 'achievements' });
  }

  _missionRow(m) {
    const saved = this.store.getMission(m.id);
    const bar = new ProgressBar({ label: `${m.title} · ${saved && saved.completed ? 'completata' : 'in corso'}` });
    const n = m.phases.length;
    const ratio = !saved ? 0 : saved.completed ? 1 : Math.min(1, ((saved.phaseIndex || 0)) / n);
    bar.set(ratio);
    return bar.el;
  }

  render() {
    const list = this.badges.list();
    const cards = list.map((b) => h('li', { class: `ach ${b.earned ? 'earned' : 'locked'}` },
      h('div', { class: 'ach-icon', 'aria-hidden': 'true' }, b.icon),
      h('div', { class: 'ach-info' },
        h('h3', {}, b.name),
        h('p', {}, b.description),
        h('p', { class: 'ach-status' }, b.earned ? `✅ Sbloccato il ${formatDate(b.earnedAt)}` : `🔒 Bloccato · ${b.how}`))));
    this.modal.setContent(
      h('p', { class: 'ach-count' }, `${this.badges.earnedCount()} / ${list.length} badge ottenuti`),
      h('ul', { class: 'ach-list' }, cards),
      h('h4', {}, 'Missioni'),
      h('div', { class: 'ach-missions' }, [...this.missions.values()].map((m) => this._missionRow(m))),
      h('button', { class: 'btn danger', type: 'button', onClick: () => {
        if (globalThis.confirm('Vuoi davvero azzerare progressi e badge?')) { this.onReset(); this.render(); }
      } }, 'Azzera progressi'));
  }

  open() { this.render(); this.modal.open(); }
  close() { this.modal.close(); }
}
