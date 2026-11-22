import { h } from '../dom.js';

/** Short non-blocking messages at the top of the screen. */
export class Toast {
  constructor() {
    this.host = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.append(this.host);
  }
  /** @param {string} text @param {{icon?:string, ms?:number, kind?:'info'|'ok'|'bad'}} [opts] */
  show(text, { icon = '', ms = 2600, kind = 'info' } = {}) {
    const el = h('div', { class: `toast ${kind}` }, icon && h('span', { class: 'toast-icon' }, icon), h('span', {}, text));
    this.host.append(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); }, ms);
  }
  dispose() { this.host.remove(); }
}
