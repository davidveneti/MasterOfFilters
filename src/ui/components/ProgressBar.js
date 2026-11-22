import { h } from '../dom.js';

/** Labeled progress bar (ratio 0..1). */
export class ProgressBar {
  constructor({ label = '' } = {}) {
    this.labelEl = h('span', { class: 'pb-label' }, label);
    this.valueEl = h('span', { class: 'pb-value' }, '0%');
    this.fill = h('div', { class: 'pb-fill' });
    this.track = h('div', { class: 'pb-track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, this.fill);
    this.el = h('div', { class: 'pb' }, h('div', { class: 'pb-head' }, this.labelEl, this.valueEl), this.track);
  }
  /** @param {number} ratio 0..1 @param {string} [label] */
  set(ratio, label) {
    const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
    this.fill.style.width = `${pct}%`;
    this.valueEl.textContent = `${pct}%`;
    this.track.setAttribute('aria-valuenow', String(pct));
    if (label != null) this.labelEl.textContent = label;
    this.el.classList.toggle('full', pct >= 100);
  }
}
