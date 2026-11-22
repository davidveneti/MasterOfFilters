import { h } from '../dom.js';
import { ALPHABET } from '../../crypto/alphabet.js';

/** Alphabet with numbers (A=0 ... Z=25) and an animated pointer, used by the Vigenère steps. */
export class NumberStrip {
  constructor() {
    this.cells = [];
    this.el = h('div', { class: 'nstrip', role: 'img', 'aria-label': 'Alfabeto numerato da 0 a 25' });
    for (let i = 0; i < 26; i++) {
      const cell = h('div', { class: 'ncell' }, h('span', { class: 'n-letter' }, ALPHABET[i]), h('span', { class: 'n-idx' }, i));
      this.cells.push(cell);
      this.el.append(cell);
    }
  }

  /** @param {number} start index of the start letter (-1 none) @param {number} pointer current pointer (-1 none) @param {number} end result index (-1 none) */
  mark(start = -1, pointer = -1, end = -1) {
    this.cells.forEach((c, i) => {
      c.classList.toggle('start', i === start);
      c.classList.toggle('pointer', i === pointer);
      c.classList.toggle('end', i === end);
    });
  }
}
