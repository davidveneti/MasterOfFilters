import { h, clear } from '../dom.js';
import { Modal } from '../components/Modal.js';
import { THEORY } from '../../content/theory.js';
import { caesarEncrypt } from '../../crypto/caesar.js';
import { normalize } from '../../crypto/alphabet.js';

/** "Spiegami": theory in simple Italian, with tabs and a small "try it" Caesar demo. */
export class HelpPanel {
  constructor() {
    this.modal = new Modal({ title: '📖 Spiegami', className: 'help' });
    this.current = THEORY[0].id;
    this._build();
  }

  _build() {
    this.tabs = h('div', { class: 'tabs', role: 'tablist' });
    this.content = h('div', { class: 'help-content', role: 'tabpanel' });
    for (const s of THEORY) {
      this.tabs.append(h('button', { class: 'tab', type: 'button', role: 'tab', dataset: { id: s.id }, onClick: () => this.show(s.id) }, s.title));
    }
    this.modal.setContent(this.tabs, this.content);
    this.show(this.current);
  }

  show(id) {
    this.current = id;
    for (const b of this.tabs.children) {
      const on = b.dataset.id === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    }
    const section = THEORY.find((s) => s.id === id);
    clear(this.content).append(h('h3', {}, section.title), ...section.blocks.map((b) => this._block(b)));
  }

  _block(b) {
    switch (b.type) {
      case 'p': { const p = h('p'); p.innerHTML = b.text; return p; } // static, trusted content
      case 'note': return h('div', { class: 'callout note' }, '⚠️ ', this._html(b.text));
      case 'tip': return h('div', { class: 'callout tip' }, '💡 ', this._html(b.text));
      case 'list': {
        const ul = h('ul');
        b.items.forEach((t) => { const li = h('li'); li.innerHTML = t; ul.append(li); });
        return h('div', {}, b.title && h('h4', {}, b.title), ul);
      }
      case 'table': return h('div', { class: 'table-wrap' }, h('table', {},
        h('thead', {}, h('tr', {}, b.head.map((c) => h('th', {}, c)))),
        h('tbody', {}, b.rows.map((r) => h('tr', {}, r.map((c, i) => h(i === 0 ? 'th' : 'td', {}, c)))))));
      case 'tryit': return this._tryIt();
      default: return h('span');
    }
  }

  _html(text) { const s = h('span'); s.innerHTML = text; return s; }

  /** Interactive: type a word, pick a key, see the Caesar result. */
  _tryIt() {
    const out = h('output', { class: 'tryit-out' }, 'KHOOR');
    const input = h('input', { type: 'text', value: 'HELLO', maxlength: 14, 'aria-label': 'Parola da cifrare', autocomplete: 'off' });
    const range = h('input', { type: 'range', min: 1, max: 25, value: 3, 'aria-label': 'Chiave' });
    const val = h('b', {}, '3');
    const refresh = () => { val.textContent = range.value; out.textContent = caesarEncrypt(normalize(input.value), Number(range.value)) || '…'; };
    input.addEventListener('input', refresh);
    range.addEventListener('input', refresh);
    return h('div', { class: 'tryit' }, h('h4', {}, '✍️ Prova tu!'),
      h('label', {}, 'Parola: ', input), h('label', {}, 'Chiave: ', val, range), h('p', {}, 'Cifrato: ', out));
  }

  open(sectionId) { if (sectionId) this.show(sectionId); this.modal.open(); }
  close() { this.modal.close(); }
}
