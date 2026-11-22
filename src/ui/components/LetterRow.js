import { h } from '../dom.js';

/**
 * Columns of "cipher letter ↓ decrypted letter". Rebuilt only when the cipher
 * text changes; the preview letters are patched in place (smooth while dragging).
 */
export class LetterRow {
  constructor() {
    this.el = h('div', { class: 'lrow', role: 'group', 'aria-label': 'Messaggio' });
    this.cols = [];
    this.cipher = '';
  }

  /** @returns {boolean} true if the structure was rebuilt */
  setCipher(cipher) {
    if (cipher === this.cipher) return false;
    this.cipher = cipher;
    this.cols = [];
    this.el.textContent = '';
    for (const ch of cipher) {
      const top = h('span', { class: 'lbox cipher' }, ch);
      const bottom = h('span', { class: 'lbox plain' }, '?');
      const col = h('div', { class: 'lcol' }, top, h('span', { class: 'larrow', 'aria-hidden': 'true' }, '↓'), bottom);
      this.cols.push({ col, top, bottom });
      this.el.append(col);
    }
    return true;
  }

  /** @param {string} text decrypted letters @param {boolean} solved */
  setPreview(text, solved) {
    this.cols.forEach((c, i) => {
      const ch = text[i] || '?';
      if (c.bottom.textContent !== ch) c.bottom.textContent = ch;
      c.col.classList.toggle('ok', !!solved);
    });
  }

  /** Highlight one column (-1 = none). */
  highlight(index) {
    this.cols.forEach((c, i) => c.col.classList.toggle('active', i === index));
  }
}
