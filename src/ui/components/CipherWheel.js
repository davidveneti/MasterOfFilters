import { h, reducedMotion } from '../dom.js';
import { ALPHABET, indexOf } from '../../crypto/alphabet.js';

const STEP = (Math.PI * 2) / 26;

/**
 * Caesar wheel drawn on a canvas. The outer ring is the plain alphabet (fixed);
 * the inner ring is the cipher alphabet and rotates smoothly with the key.
 * Colors come from CSS variables so it follows the dark/light theme.
 */
export class CipherWheel {
  constructor() {
    this.canvas = h('canvas', { class: 'wheel', role: 'img', 'aria-label': 'Ruota del cifrario di Cesare' });
    this.g = this.canvas.getContext('2d');
    this.shift = 0;          // target key
    this.angle = 0;          // animated key (float)
    this.hi = -1;            // highlighted plain-letter index
    this.raf = 0;
    this.alive = true;
    this.reduced = reducedMotion();
    this.el = this.canvas;
  }

  /** @param {number} key @param {boolean} [animate] */
  setShift(key, animate = true) {
    this.shift = key;
    if (!animate || this.reduced) { this.angle = key; this.draw(); return; }
    this._loop();
  }

  /** Highlight the outer letter `plainLetter` and the inner letter aligned with it. */
  highlight(plainLetter) {
    const i = plainLetter ? indexOf(plainLetter) : -1;
    if (i === this.hi) return;
    this.hi = i;
    this.draw();
  }

  _loop() {
    if (this.raf || !this.alive) return;
    const tick = () => {
      this.raf = 0;
      const d = this.shift - this.angle;
      if (Math.abs(d) < 0.003) { this.angle = this.shift; this.draw(); return; }
      this.angle += d * 0.18;
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  _css(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  draw() {
    const c = this.canvas, g = this.g;
    if (!g) return;
    const css = c.clientWidth || 240;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(css * dpr)) { c.width = Math.round(css * dpr); c.height = Math.round(css * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, css, css);

    const cx = css / 2, R = css / 2 - 3;
    const outer = this._css('--wheel-outer', '#243049'), inner = this._css('--wheel-inner', '#3a2f63');
    const text = this._css('--text', '#fff'), accent = this._css('--accent', '#ff8a3d'), gold = this._css('--gold', '#ffc83d');

    const ring = (r1, r0, fill) => {
      g.beginPath(); g.arc(cx, cx, r1, 0, 6.2832); g.arc(cx, cx, r0, 6.2832, 0, true); g.fillStyle = fill; g.fill();
    };
    ring(R, R * 0.76, outer);
    ring(R * 0.72, R * 0.44, inner);

    const wedge = (r1, r0, i, fill) => {
      const a0 = -Math.PI / 2 + i * STEP - STEP / 2, a1 = a0 + STEP;
      g.beginPath(); g.arc(cx, cx, r1, a0, a1); g.arc(cx, cx, r0, a1, a0, true); g.closePath(); g.fillStyle = fill; g.fill();
    };

    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fo = Math.round(R * 0.115), fi = Math.round(R * 0.105);

    // inner ring rotates: inner letter j sits at the angle of outer index (j - key)
    if (this.hi >= 0) { wedge(R, R * 0.76, this.hi, gold); wedge(R * 0.72, R * 0.44, this.hi, gold); }
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + i * STEP;
      g.fillStyle = i === this.hi ? '#1a1a1a' : text;
      g.font = `700 ${fo}px ui-monospace, Menlo, Consolas, monospace`;
      g.fillText(ALPHABET[i], cx + Math.cos(a) * R * 0.88, cx + Math.sin(a) * R * 0.88);
    }
    for (let j = 0; j < 26; j++) {
      const a = -Math.PI / 2 + (j - this.angle) * STEP;
      const aligned = this.hi >= 0 && Math.abs(((j - this.angle - this.hi) % 26 + 26) % 26) < 0.5;
      g.fillStyle = aligned ? '#1a1a1a' : text;
      g.globalAlpha = aligned ? 1 : 0.85;
      g.font = `700 ${fi}px ui-monospace, Menlo, Consolas, monospace`;
      g.fillText(ALPHABET[j], cx + Math.cos(a) * R * 0.58, cx + Math.sin(a) * R * 0.58);
      g.globalAlpha = 1;
    }

    // pointer at 12 o'clock + center label
    g.fillStyle = accent;
    g.beginPath(); g.moveTo(cx - 7, 1); g.lineTo(cx + 7, 1); g.lineTo(cx, 15); g.closePath(); g.fill();
    g.fillStyle = text;
    g.font = `800 ${Math.round(R * 0.2)}px system-ui, sans-serif`;
    g.fillText(`+${Math.round(this.angle)}`, cx, cx - R * 0.04);
    g.globalAlpha = 0.7;
    g.font = `600 ${Math.round(R * 0.085)}px system-ui, sans-serif`;
    g.fillText('chiave', cx, cx + R * 0.14);
    g.globalAlpha = 1;
  }

  destroy() {
    this.alive = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
