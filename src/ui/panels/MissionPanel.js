import { h, clear } from '../dom.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { CaesarView } from '../views/CaesarView.js';
import { VigenereView } from '../views/VigenereView.js';
import { RiddleView } from '../views/RiddleView.js';

/** Maps a game id to the view that renders it. Register new game views here. */
const VIEWS = { caesar: CaesarView, vigenere: VigenereView, riddle: RiddleView };

/**
 * Mission Panel: title, phases, progress bar, the active game view and the
 * phase/mission flow buttons. Desktop = left card, mobile = bottom sheet.
 */
export class MissionPanel {
  /**
   * @param {{gm: import('../../game/GameManager.js').GameManager, store: import('../../storage/ProgressStore.js').ProgressStore,
   *          sound: import('../../core/SoundFx.js').SoundFx, onHelp: () => void, onBadges: () => void}} deps
   */
  constructor({ gm, store, sound, onHelp, onBadges }) {
    this.gm = gm;
    this.store = store;
    this.sound = sound;
    this.view = null;
    this.viewKey = '';

    this.title = h('h2', { class: 'mp-title' });
    this.subtitle = h('p', { class: 'mp-sub' });
    this.collapseBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Riduci o espandi il pannello', onClick: () => this.setCollapsed(!this.collapsed) }, '▾');
    this.phases = h('div', { class: 'mp-phases' });
    this.track = h('div', { class: 'stage-track', 'aria-live': 'polite' });
    this.progress = new ProgressBar({ label: 'Progresso missione' });
    this.body = h('div', { class: 'mp-body' });
    this.flow = h('div', { class: 'mp-flow' });
    this.footer = h('div', { class: 'mp-foot' },
      h('button', { class: 'btn', type: 'button', dataset: { role: 'help' }, onClick: onHelp }, '📖 Spiegami'),
      h('button', { class: 'btn', type: 'button', onClick: onBadges }, '🏆 Trofei'),
      h('button', { class: 'btn ghost', type: 'button', onClick: () => this._restart() }, '↺ Ricomincia'));

    this.el = h('section', { class: 'mission-panel hidden', dataset: { role: 'mission' }, 'aria-label': 'Pannello missione' },
      h('header', { class: 'mp-head' }, h('div', { class: 'mp-titles' }, this.title, this.subtitle), this.collapseBtn),
      h('div', { class: 'mp-content' }, this.phases, this.track, this.progress.el, this.body, this.flow, this.footer));
    this.setCollapsed(!!store.getPref('panelCollapsed'), false);
  }

  get collapsed() { return this.el.classList.contains('collapsed'); }

  setCollapsed(v, save = true) {
    this.el.classList.toggle('collapsed', v);
    this.collapseBtn.textContent = v ? '▴' : '▾';
    if (save) this.store.setPref('panelCollapsed', v);
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); this._destroyView(); this.viewKey = ''; }
  get visible() { return !this.el.classList.contains('hidden'); }

  _destroyView() { if (this.view) { this.view.destroy(); this.view = null; } }

  _restart() {
    if (globalThis.confirm('Vuoi ricominciare questa missione dall\'inizio? I badge già ottenuti restano tuoi.')) this.gm.resetMission();
  }

  /** @param {object|null} snap GameManager snapshot */
  render(snap) {
    if (!snap) { this.hide(); return; }
    this.show();
    const key = `${snap.mission.id}:${snap.phase.id}`;
    if (key !== this.viewKey) {
      this._destroyView();
      const View = VIEWS[snap.game.game];
      this.view = new View({ gm: this.gm, sound: this.sound });
      clear(this.body);
      this.view.mount(this.body);
      this.viewKey = key;
    }
    this.view.update(snap.game);

    this.title.textContent = snap.mission.title;
    this.subtitle.textContent = snap.mission.subtitle;
    clear(this.phases);
    this.gm.mission.phases.forEach((p, i) => {
      const state = i < snap.phaseIndex || (i === snap.phaseIndex && snap.game.finished) ? 'done' : i === snap.phaseIndex ? 'now' : 'locked';
      this.phases.append(h('span', { class: `chip ${state}` }, state === 'done' ? '✓ ' : state === 'locked' ? '🔒 ' : '▶ ', p.title));
    });
    this._renderTrack(snap);
    this.progress.set(snap.progress, snap.completed ? 'Missione completata' : `Prove superate · ${snap.trials.done}/${snap.trials.total}`);
    this._renderFlow(snap);
  }

  /** Stage dots: one per visual stage (smoke color / eye effect); lit up to the current one. */
  _renderTrack(snap) {
    clear(this.track);
    if (!snap.stages.length) return;
    this.track.append(h('span', { class: 'st-label' }, `${snap.mission.stageLabel}: `), h('b', {}, snap.stage.name));
    const dots = h('span', { class: 'st-dots', 'aria-hidden': 'true' });
    snap.stages.forEach((st, i) => {
      dots.append(h('i', { class: `st-dot${i <= snap.stage.index ? ' on' : ''}${i === snap.stage.index ? ' now' : ''}`, title: st.name, style: { '--c': st.css } }));
    });
    this.track.append(dots);
  }

  /** Phase / mission flow buttons shown when the current game is finished. */
  _renderFlow(snap) {
    clear(this.flow);
    if (!snap.game.finished || !snap.game.solved) return;
    const last = snap.phaseIndex >= snap.phaseCount - 1;
    if (!last) {
      this.flow.append(h('div', { class: 'flow-card unlock' },
        h('p', {}, '🔓 Fase sbloccata!'),
        h('button', { class: 'btn primary', type: 'button', onClick: () => { this.sound.play('level'); this.gm.advance(); } }, `Continua: ${this.gm.mission.phases[snap.phaseIndex + 1].title} →`)));
    } else {
      this.flow.append(h('div', { class: 'flow-card done' },
        h('p', {}, '🎉 Missione completata!'),
        h('button', { class: 'btn', type: 'button', onClick: () => this._restart() }, 'Rigioca la missione')));
    }
  }
}
