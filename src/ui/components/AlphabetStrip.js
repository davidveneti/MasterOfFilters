import { h } from '../dom.js';
import { ALPHABET, letterAt } from '../../crypto/alphabet.js';

/**
 * The shifted alphabet: top = plain letters, bottom = what they become
 * (A→D, B→E, C→F ... for key 3). Cipher letters that appear in the message
 * are highlighted so students see the correspondences.
 */
export class AlphabetStrip {
  constructor() {
    this.legend = h('p', { class: 'astrip-legend' });
    this.grid = h('div', { class: 'astrip', role: 'img', 'aria-label': 'Alfabeto spostato' });
    this.cells = [];
    for (let i = 0; i < 26; i++) {
      const plain = h('span', { class: 'ac-plain' }, ALPHABET[i]);
      const cipher = h('span', { class: 'ac-cipher' }, ALPHABET[i]);
      const cell = h('div', { class: 'acell' }, plain, h('span', { class: 'ac-arrow', 'aria-hidden': 'true' }, '↓'), cipher);
      this.cells.push({ cell, cipher });
      this.grid.append(cell);
    }
    this.el = h('div', { class: 'astrip-wrap' }, this.legend, this.grid);
    this.shift = -1;
  }

  /**
   * @param {number} shift key
   * @param {string} cipherText message letters to highlight (cipher side)
   * @param {string|null} activeCipher letter currently animated
   */
  update(shift, cipherText = '', activeCipher = null) {
    if (shift !== this.shift) {
      this.shift = shift;
      this.cells.forEach((c, i) => { c.cipher.textContent = letterAt(i + shift); });
      this.legend.textContent = `Chiave ${shift}:  A→${letterAt(shift)}   B→${letterAt(1 + shift)}   C→${letterAt(2 + shift)}   …`;
    }
    const hit = new Set(cipherText);
    this.cells.forEach((c, i) => {
      const L = letterAt(i + shift);
      c.cell.classList.toggle('hit', hit.has(L));
      c.cell.classList.toggle('active', L === activeCipher);
    });
  }
}
