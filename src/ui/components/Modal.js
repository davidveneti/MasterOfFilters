import { h, clear } from '../dom.js';

/** Accessible modal dialog (ESC / backdrop / button to close). */
export class Modal {
  /** @param {{title:string, className?:string, onClose?:Function}} opts */
  constructor({ title, className = '', onClose = null }) {
    this.onClose = onClose;
    this.body = h('div', { class: 'modal-body' });
    this.titleEl = h('h2', { class: 'modal-title' }, title);
    this.card = h('div', { class: `modal-card ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'modal-head' }, this.titleEl,
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Chiudi', onClick: () => this.close() }, '✕')),
      this.body);
    this.el = h('div', { class: 'modal', onClick: (e) => { if (e.target === this.el) this.close(); } }, this.card);
    this._key = (e) => { if (e.key === 'Escape') this.close(); };
    this.isOpen = false;
  }

  setTitle(t) { this.titleEl.textContent = t; }
  setContent(...nodes) { clear(this.body).append(...nodes.flat()); }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    document.body.append(this.el);
    void this.el.offsetWidth;
    this.el.classList.add('open');
    document.addEventListener('keydown', this._key);
    const first = this.card.querySelector('button, [href], input');
    if (first && first.focus) first.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.classList.remove('open');
    document.removeEventListener('keydown', this._key);
    setTimeout(() => { if (!this.isOpen) this.el.remove(); }, 220);
    if (this.onClose) this.onClose();
  }
}
