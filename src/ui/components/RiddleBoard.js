import { h, clear } from '../dom.js';
import { pixelIcon } from './PixelIcon.js';

const OPERATORS = new Set(['+', '→', '=', '≠']);

/** Render one token of a riddle picture (see content/riddles.js for the token syntax). */
function token(t, cls = '') {
  if (t === '?') return h('span', { class: `rb-q ${cls}`, 'aria-label': 'da scoprire' }, '?');
  if (OPERATORS.has(t)) return h('span', { class: 'rb-op', 'aria-hidden': 'true' }, t);
  if (t.startsWith('px:')) return h('span', { class: `rb-cell ${cls}` }, pixelIcon(t.slice(3), 32));
  if (t.startsWith('t:')) return h('span', { class: 'rb-chip' }, t.slice(2));
  return h('span', { class: 'rb-emoji' }, t);
}

/** Minecraft-style 3x3 crafting grid + arrow + result. */
function craftingGrid(row) {
  const slots = row.grid.map((t) => h('span', { class: 'rb-slot' }, t ? (t.startsWith('px:') ? pixelIcon(t.slice(3), 30) : token(t)) : null));
  return h('div', { class: 'rb-row' },
    h('div', { class: 'rb-grid', role: 'img', 'aria-label': 'Griglia di crafting 3 per 3' }, slots),
    h('span', { class: 'rb-op', 'aria-hidden': 'true' }, '→'),
    token(row.result || '?', 'big'));
}

/**
 * The picture of a riddle: the question text plus rows of tokens (pixel-art icons, emoji, labels, a
 * pulsing "?" box) or a crafting grid. Pure presentation: it gets the data, it never changes it.
 */
export class RiddleBoard {
  constructor() {
    this.question = h('p', { class: 'rb-question' });
    this.stage = h('div', { class: 'rb-stage' });
    this.el = h('div', { class: 'rb' }, this.question, this.stage);
  }

  /** @param {string} question @param {Array<string[]|{grid:string[], result?:string}>} visual */
  set(question, visual) {
    this.question.textContent = question;
    clear(this.stage);
    for (const row of visual) {
      this.stage.append(Array.isArray(row) ? h('div', { class: 'rb-row' }, row.map((t) => token(t))) : craftingGrid(row));
    }
  }
}
