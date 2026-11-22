/** Tiny DOM helpers shared by every UI component (no framework). */

/**
 * Create an element.
 * @param {string} tag
 * @param {Object} [props] class, dataset, style(object), on<Event> handlers, or plain attributes
 * @param {...(Node|string|number|null|false|Array)} children
 * @returns {HTMLElement}
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') {
      // CSS custom properties (--x) must go through setProperty; plain props can be assigned
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

/** Append strings/nodes (arrays are flattened, null/false ignored). */
export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Remove every child. */
export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export const reducedMotion = () => !!(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Italian long date, e.g. "12 novembre 2026". */
export function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return String(iso || ''); }
}
