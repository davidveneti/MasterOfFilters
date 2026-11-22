import { h } from './dom.js';
import { GameEvents as E } from '../game/events.js';
import { MissionPanel } from './panels/MissionPanel.js';
import { AchievementsPanel } from './panels/AchievementsPanel.js';
import { HelpPanel } from './panels/HelpPanel.js';
import { BadgePopup } from './components/BadgePopup.js';
import { Toast } from './components/Toast.js';

/** Game events that require the mission panel to redraw. */
const REDRAW = [E.GAME_STATE, E.GAME_STEP, E.GAME_WRONG, E.GAME_LEVEL_COMPLETE, E.GAME_COMPLETE,
  E.MISSION_PHASE_UNLOCKED, E.MISSION_COMPLETE, E.MISSION_START, E.MISSION_PHASE];

/**
 * Orchestrates the whole crypto UI: toolbar, mission panel, trophies, help,
 * badge celebration, toasts, theme and sound. It only talks to the
 * GameManager and listens to the shared EventBus.
 */
export class AppUI {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.root
   * @param {import('../game/GameManager.js').GameManager} deps.gm
   * @param {import('../game/BadgeSystem.js').BadgeSystem} deps.badges
   * @param {import('../storage/ProgressStore.js').ProgressStore} deps.store
   * @param {import('../core/EventBus.js').EventBus} deps.bus
   * @param {import('../core/SoundFx.js').SoundFx} deps.sound
   * @param {import('./ThemeManager.js').ThemeManager} deps.theme
   */
  constructor({ root, gm, badges, store, bus, sound, theme }) {
    Object.assign(this, { root, gm, badges, store, bus, sound, theme });
    this.toast = new Toast();
    this.popup = new BadgePopup();
    this.help = new HelpPanel();
    this.trophies = new AchievementsPanel({
      badges, store, missions: gm.missions,
      onReset: () => { store.resetProgress(); if (gm.mission) gm.resetMission(); },
    });
    this.panel = new MissionPanel({ gm, store, sound, onHelp: () => this.help.open(), onBadges: () => this.trophies.open() });
    this.dirty = false;
    this.timers = [];
    this._buildToolbar();
    root.append(this.panel.el, this.toolbar);
    this._bind();
  }

  _buildToolbar() {
    this.btnMission = h('button', { class: 'tb-btn', type: 'button', title: 'Missione', 'aria-label': 'Mostra la missione', onClick: () => this.panel.setCollapsed(!this.panel.collapsed) }, '🎯');
    this.btnBadges = h('button', { class: 'tb-btn', type: 'button', title: 'Trofei', 'aria-label': 'Trofei e badge', onClick: () => this.trophies.open() }, '🏆');
    this.btnHelp = h('button', { class: 'tb-btn', type: 'button', title: 'Spiegami', 'aria-label': 'Spiegami', onClick: () => this.help.open() }, '❓');
    this.btnTheme = h('button', { class: 'tb-btn', type: 'button', title: 'Tema chiaro/scuro', 'aria-label': 'Cambia tema', onClick: () => this._toggleTheme() });
    this.btnSound = h('button', { class: 'tb-btn', type: 'button', title: 'Suoni', 'aria-label': 'Attiva o disattiva i suoni', onClick: () => this._toggleSound() });
    this.toolbar = h('nav', { class: 'toolbar', 'aria-label': 'Strumenti' }, this.btnMission, this.btnBadges, this.btnHelp, this.btnTheme, this.btnSound);
    this._syncToolbar();
  }

  _syncToolbar() {
    this.btnTheme.textContent = this.theme.theme === 'dark' ? '🌙' : '☀️';
    this.btnSound.textContent = this.sound.enabled ? '🔊' : '🔇';
    this.btnMission.classList.toggle('hidden', !this.gm.active);
  }

  _toggleTheme() { this.theme.toggle(); this._syncToolbar(); }

  _toggleSound() {
    this.sound.setEnabled(!this.sound.enabled);
    this.store.setPref('sound', this.sound.enabled);
    this._syncToolbar();
    this.sound.play('tick');
  }

  _bind() {
    const { bus } = this;
    this.unsubs = [];
    const on = (evt, fn) => this.unsubs.push(bus.on(evt, fn));

    for (const evt of REDRAW) on(evt, () => this._scheduleRender());
    on(E.MISSION_STOP, () => { this.panel.render(null); this._syncToolbar(); });
    on(E.MISSION_START, () => this._syncToolbar());

    on(E.GAME_LEVEL_COMPLETE, () => { this.sound.play('level'); this.toast.show('Livello superato!', { icon: '⭐', kind: 'ok' }); });
    on(E.MISSION_PHASE_UNLOCKED, ({ nextPhaseIndex }) => { this.sound.play('level'); this.toast.show(`Fase ${nextPhaseIndex + 1} sbloccata!`, { icon: '🔓', kind: 'ok' }); });
    on(E.BADGE_UNLOCKED, ({ badge }) => {
      // some badges wait (delayMs) so that a final AR animation, e.g. the legendary dragon, is not covered
      const show = () => { this.sound.play('badge'); this.popup.show(badge); };
      if (badge.delayMs) this.timers.push(setTimeout(show, badge.delayMs)); else show();
    });
    on(E.GAME_WRONG, () => this.sound.play('wrong'));
  }

  /** Coalesce bursts of events into one redraw per frame. */
  _scheduleRender() {
    if (this.dirty) return;
    this.dirty = true;
    requestAnimationFrame(() => { this.dirty = false; this.panel.render(this.gm.getSnapshot()); this._syncToolbar(); });
  }

  dispose() {
    this.unsubs.forEach((u) => u());
    this.timers.forEach(clearTimeout);
    this.popup.hide();
    this.toast.dispose();
    this.panel.hide();
    this.panel.el.remove();
    this.toolbar.remove();
  }
}
