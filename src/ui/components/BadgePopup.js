import { h, formatDate } from '../dom.js';

/** Full-screen celebration when a badge is unlocked: gold rays, confetti and colored smoke (CSS only). */
export class BadgePopup {
  constructor() { this.el = null; this.timer = 0; this.queue = []; }

  /**
   * Show a badge celebration. If one is already on screen (e.g. Secret Agent and
   * Crypto Apprentice unlocked together) the new one waits in a queue.
   * @param {{name:string, icon:string, description:string, earnedAt:string}} badge @param {() => void} [onClose]
   */
  show(badge, onClose) {
    if (this.el) { this.queue.push([badge, onClose]); return; }
    this._render(badge, onClose);
  }

  _render(badge, onClose) {
    const confetti = [];
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * 6.2832, d = 110 + Math.random() * 190;
      confetti.push(h('i', {
        class: 'confetti',
        style: {
          '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d - 60}px`,
          '--rot': `${Math.random() * 720 - 360}deg`, '--delay': `${Math.random() * 0.25}s`,
          background: ['#ffd23c', '#ffb300', '#fff1a8', '#ff8a3d'][i % 4],
        },
      }));
    }
    const puffs = ['#ff5d8f', '#59b8ff', '#ffd23c', '#7cffb2'].map((c, i) =>
      h('i', { class: 'puff', style: { '--c': c, '--x': `${(i - 1.5) * 70}px`, '--delay': `${i * 0.18}s` } }));

    const close = () => {
      this._remove();
      if (onClose) onClose();
      const next = this.queue.shift();
      if (next) setTimeout(() => { if (!this.el) this._render(...next); }, 250);
    };
    this.el = h('div', { class: 'badge-pop', role: 'alertdialog', 'aria-label': `Nuovo badge: ${badge.name}`, onClick: (e) => { if (e.target === this.el) close(); } },
      h('div', { class: 'badge-card' },
        h('div', { class: 'badge-rays', 'aria-hidden': 'true' }),
        h('div', { class: 'badge-fx', 'aria-hidden': 'true' }, puffs, confetti),
        h('div', { class: 'badge-icon' }, badge.icon),
        h('p', { class: 'badge-kicker' }, 'Nuovo badge sbloccato!'),
        h('h2', { class: 'badge-name' }, badge.name),
        h('p', { class: 'badge-desc' }, badge.description),
        h('p', { class: 'badge-date' }, `Ottenuto il ${formatDate(badge.earnedAt)}`),
        h('button', { class: 'btn primary', type: 'button', onClick: close }, 'Fantastico!')));
    document.body.append(this.el);
    void this.el.offsetWidth;
    this.el.classList.add('open');
    this.timer = setTimeout(() => { if (this.el) this.el.querySelector('.badge-fx')?.remove(); }, 3500);
  }

  _remove() {
    clearTimeout(this.timer);
    if (this.el) { this.el.remove(); this.el = null; }
  }

  /** Close the current popup and drop anything still queued. */
  hide() { this.queue.length = 0; this._remove(); }
}
