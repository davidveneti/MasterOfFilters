const MAX = 48;
const SIZES = [16, 20, 24, 30, 38];
const FONTS = SIZES.map((s) => `700 ${s}px ui-monospace, Menlo, Consolas, monospace`);

/**
 * Letters that float up inside the smoke ("the smoke reveals the message").
 * Pooled struct-of-arrays, 2D overlay drawing, zero allocations per frame.
 * Cipher letters are drawn smoke-gray; decoded letters are drawn gold.
 */
export class SmokeLetters {
  constructor() {
    this.x = new Float32Array(MAX); this.y = new Float32Array(MAX);
    this.vx = new Float32Array(MAX); this.vy = new Float32Array(MAX);
    this.age = new Float32Array(MAX); this.life = new Float32Array(MAX);
    this.rot = new Float32Array(MAX); this.phase = new Float32Array(MAX);
    this.size = new Uint8Array(MAX); this.gold = new Uint8Array(MAX);
    this.ch = new Array(MAX).fill('');
    this.text = '';
    this.color = '#e9edf2'; // cipher letters take the color of the smoke
    this.cursor = 0;
    this.acc = 0;
  }

  /** @param {string} css color of the (non-decoded) letters */
  setColor(css) { this.color = css; }

  /** @param {string} text letters that are emitted in sequence */
  setText(text) { this.text = text || ''; this.cursor = 0; }

  _spawn(x, y, ch, gold, W) {
    let i = -1;
    for (let k = 0; k < MAX; k++) if (this.life[k] <= 0) { i = k; break; }
    if (i < 0) return;
    this.x[i] = x + (Math.random() - 0.5) * W * 0.1;
    this.y[i] = y;
    this.vx[i] = (Math.random() - 0.5) * W * 0.12;
    this.vy[i] = -(0.25 + Math.random() * 0.2) * W;
    this.age[i] = 0;
    this.life[i] = 2.2 + Math.random() * 1.2;
    this.rot[i] = (Math.random() - 0.5) * 0.6;
    this.phase[i] = Math.random() * 6.28;
    this.size[i] = gold ? 3 + (Math.random() < 0.4 ? 1 : 0) : (Math.random() * 3) | 0;
    this.gold[i] = gold ? 1 : 0;
    this.ch[i] = ch;
  }

  /** Burst of letters in gold (used when a message is decoded). */
  celebrate(text, x, y, W) {
    for (let k = 0; k < text.length; k++) this._spawn(x + (k - text.length / 2) * W * 0.12, y, text[k], true, W);
  }

  /** @param {boolean} emitting true while the mouth is open */
  update(dt, emitting, x, y, W) {
    if (emitting && this.text) {
      this.acc += dt * 5;
      while (this.acc >= 1) {
        this.acc -= 1;
        this._spawn(x, y, this.text[this.cursor % this.text.length], false, W);
        this.cursor++;
      }
    } else this.acc = 0;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.life[i] = 0; continue; }
      this.vx[i] += Math.sin(this.age[i] * 2.1 + this.phase[i]) * W * 0.25 * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.vy[i] *= 1 - 0.35 * dt;
    }
  }

  /** @param {CanvasRenderingContext2D} g */
  render(g) {
    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      const t = this.age[i] / this.life[i];
      const a = Math.min(1, t * 8) * (1 - t) * (1 - t);
      g.globalAlpha = a * (this.gold[i] ? 1 : 0.8);
      g.fillStyle = this.gold[i] ? '#ffd23c' : this.color;
      g.font = FONTS[this.size[i]];
      g.save();
      g.translate(this.x[i], this.y[i]);
      g.rotate(this.rot[i] + Math.sin(this.age[i] * 3 + this.phase[i]) * 0.15);
      if (this.gold[i]) { g.shadowColor = '#ffb300'; g.shadowBlur = 12; }
      g.fillText(this.ch[i], 0, 0);
      g.restore();
    }
    g.restore();
  }

  clear() { this.life.fill(0); }
}
