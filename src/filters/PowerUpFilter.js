import { BaseFilter } from './BaseFilter.js';
import { ParticlePool } from '../core/particles.js';
import { makeGlowTexture, makeGlowCanvas } from '../core/textures.js';
import { jagged, randomOffsets, strokeBolt } from '../core/bolt.js';
import { hexToRgb, rgbCss, lerp } from '../core/color.js';
import { clamp, damp } from '../filters.js';
import { rrect } from '../core/draw.js';

const BSEG = 7, BP = BSEG + 1, MAX_BOLTS = 10, MAX_RINGS = 8, MAX_WAVES = 4, STREAKS = 16;
const ULT_RGB = [0.55, 0.9, 1.0];
const FONT_MONO = 'ui-monospace, Menlo, Consolas, monospace';

export class PowerUpFilter extends BaseFilter {
  static meta = {
    id: 'power-up',
    name: 'Power Up',
    icon: '💥',
    description: 'Anime power-up: open your mouth, raise your eyebrows, turn your head. Hit 100% to go Ultimate.',
    usesOverlay: true,
  };
  static settings = [
    { key: 'auraColor', label: 'Aura Color', type: 'color', default: '#ffd23c' },
    { key: 'powerGain', label: 'Power Gain', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1, digits: 1 },
  ];

  /**
   * @param {object} ctx @param {object} settings
   * @param {{embedded?:boolean, power?:number}} [opts] embedded = used as an add-on effect by another
   *        filter (e.g. Lightning Eyes): no HUD, no score; the aura stays at a fixed `power` (0-100,
   *        +30 with the mouth open) and the explosion is triggered with burst().
   */
  constructor(ctx, settings, opts = {}) {
    super(ctx, settings);
    this.opts = opts;
  }

  /** Explosion + shockwaves (used when an embedded Power Up is unlocked). */
  burst() { this._triggerUltimate(); }

  initialize() {
    super.initialize();
    const c = this.ctx;
    const tex = this.acquire('tex:glow', () => makeGlowTexture(64));
    this.fx = this.track(new ParticlePool(this.root, c.renderer, tex, { max: 900, drag: 0.9 }));
    this.fx.setPixelRatio(c.viewport.dpr);
    this.ultSprite = this.acquire('glow2d:cyan', () => makeGlowCanvas(128, [140, 230, 255]));
    this.glowWhite = this.acquire('glow2d:white', () => makeGlowCanvas(128, [255, 255, 255]));

    this.rgb = [1, 0.8, 0.2];
    this.cur = [1, 0.8, 0.2];
    this.auraSprite = null;
    this._applyColor();

    this.power = 0; this.ultimate = false; this.ultT = 0; this.ultK = 0;
    this.flashA = 0; this.shakeT = 0; this.ultDisplayT = 0;
    this.auraAcc = 0; this.floatAcc = 0; this.ringT = 0; this.cssT = 0;
    this.t = 0;

    this.boltPts = new Float32Array(MAX_BOLTS * BP * 2);
    this.boltOff = new Float32Array(MAX_BOLTS * BP);
    this.boltRel = new Float32Array(MAX_BOLTS * 4); // start/end relative to face center, in face widths
    this.boltAge = new Float32Array(MAX_BOLTS);
    this.boltTtl = new Float32Array(MAX_BOLTS);

    this.ringAge = new Float32Array(MAX_RINGS).fill(9);
    this.waveAge = new Float32Array(MAX_WAVES).fill(9);
    this.waveX = new Float32Array(MAX_WAVES);
    this.waveY = new Float32Array(MAX_WAVES);
    this.waveDelay = new Float32Array(MAX_WAVES);
    this.lastCx = 0; this.lastCy = 0; this.lastW = 200;
    this.pctStr = '0%';
  }

  _applyColor() {
    hexToRgb(this.settings.auraColor, this.rgb);
    this.auraSprite = makeGlowCanvas(128, [this.rgb[0] * 255 | 0, this.rgb[1] * 255 | 0, this.rgb[2] * 255 | 0]);
  }
  onSettingChange(key) { if (key === 'auraColor' || key === '*') this._applyColor(); }

  _triggerUltimate() {
    const c = this.ctx;
    this.ultimate = true; this.ultT = 5; this.ultDisplayT = 0;
    this.flashA = 1;
    c.shake(22, 0.9);
    for (let i = 0; i < MAX_WAVES; i++) {
      this.waveAge[i] = 0; this.waveDelay[i] = i * 0.14;
      this.waveX[i] = this.lastCx; this.waveY[i] = this.lastCy;
    }
    const W = this.lastW;
    for (let i = 0; i < 180; i++) {
      const a = Math.random() * 6.2832, sp = (300 + Math.random() * 900) * (W / 260);
      const mix = Math.random();
      this.fx.emit(this.lastCx, this.lastCy, Math.cos(a) * sp, Math.sin(a) * sp, 0.6 + Math.random() * 0.8,
        W * (0.05 + Math.random() * 0.08), W * 0.01,
        lerp(this.cur[0], 1, mix * 0.6), lerp(this.cur[1], 1, mix * 0.6), lerp(this.cur[2], 1, mix * 0.6), 1, 0);
    }
  }

  _regenBolt(i, burstW) {
    const a = Math.random() * 6.2832;
    const da = a + (Math.random() - 0.5) * 1.2;
    const len = 0.25 + Math.random() * 0.45;
    this.boltRel[i * 4] = Math.cos(a) * 0.7;
    this.boltRel[i * 4 + 1] = Math.sin(a) * 0.85;
    this.boltRel[i * 4 + 2] = Math.cos(a) * 0.7 + Math.cos(da) * len;
    this.boltRel[i * 4 + 3] = Math.sin(a) * 0.85 + Math.sin(da) * len;
    this.boltAge[i] = 0; this.boltTtl[i] = 0.05 + Math.random() * 0.08;
    randomOffsets(this.boltOff, i * BP, BP);
  }

  update(dt, time) {
    const c = this.ctx, f = c.face, vis = c.faceVisible, s = this.settings;
    this.t = time;

    const turn = vis ? clamp((Math.abs(f.yaw) + Math.abs(f.roll) * 0.6 + Math.abs(f.pitch) * 0.5 - 0.12) / 0.5, 0, 1) : 0;
    const gain = vis ? (c.mouth.level * 28 + f.brow * 24 + turn * 18) * s.powerGain : 0;

    if (this.opts.embedded) {
      this.power = (this.opts.power ?? 70) + 30 * c.mouth.level;
      if (this.ultimate) { this.ultT -= dt; if (this.ultT <= 0) this.ultimate = false; }
    } else if (!this.ultimate) {
      this.power += gain * dt - 7 * (1 - Math.min(1, gain / 6)) * dt;
      this.power = clamp(this.power, 0, 100);
      if (this.power >= 100 && vis) this._triggerUltimate();
    } else {
      this.ultT -= dt;
      this.ultDisplayT += dt;
      this.power = 100;
      this.shakeT -= dt;
      if (this.shakeT <= 0) { c.shake(5, 0.15); this.shakeT = 0.35; }
      if (this.ultT <= 0) { this.ultimate = false; this.power = 35; }
    }
    this.ultK = damp(this.ultK, this.ultimate && !this.opts.embedded ? 1 : 0, 3, dt);
    this.flashA = Math.max(0, this.flashA - dt * 2.2);
    for (let i = 0; i < 3; i++) this.cur[i] = lerp(this.rgb[i], ULT_RGB[i], this.ultK);

    const p = this.power / 100;
    this.cssT -= dt;
    if (this.cssT <= 0) { this.cssT = 0.1; this.pctStr = `${Math.floor(this.power)}%`; }

    if (vis) {
      const W = f.faceWidth, cx = f.center.x, cy = f.center.y, k = W / 260;
      this.lastCx = cx; this.lastCy = cy; this.lastW = W;
      const ult = 1 + 0.8 * this.ultK;

      // rising aura particles around head + torso
      this.auraAcc += (40 + 260 * p) * ult * dt;
      while (this.auraAcc >= 1) {
        this.auraAcc -= 1;
        const x = cx + (Math.random() * 2 - 1) * W * 0.85;
        const y = cy + (Math.random() * 1.9 - 0.75) * W;
        const white = Math.random() < 0.3 ? 0.45 : 0;
        const s0 = W * (0.05 + Math.random() * 0.08) * (1 + 0.5 * this.ultK);
        this.fx.emit(x, y, (Math.random() - 0.5) * 30 * k, -(90 + Math.random() * 220) * k * ult,
          0.55 + Math.random() * 0.7, s0, s0 * 0.2,
          lerp(this.cur[0], 1, white), lerp(this.cur[1], 1, white), lerp(this.cur[2], 1, white), 0.85, 0);
      }
      // small floating motes
      this.floatAcc += (18 + 40 * p) * dt;
      while (this.floatAcc >= 1) {
        this.floatAcc -= 1;
        this.fx.emit(cx + (Math.random() * 2 - 1) * W * 1.3, cy + (Math.random() * 2 - 0.3) * W,
          (Math.random() - 0.5) * 40 * k, -(30 + Math.random() * 50) * k,
          1.2 + Math.random() * 1.0, W * 0.02, W * 0.01, 1, 1, 0.9, 0.9, 0);
      }

      // electric sparks around the head
      const nb = Math.min(MAX_BOLTS, Math.round((2 + 8 * p) * (this.ultimate ? 1.5 : 1)));
      for (let i = 0; i < MAX_BOLTS; i++) {
        if (i >= nb) { this.boltAge[i] = 9; continue; }
        this.boltAge[i] += dt;
        if (this.boltAge[i] >= this.boltTtl[i]) this._regenBolt(i);
      }

      // moving energy rings
      this.ringT -= dt;
      if (this.ringT <= 0) {
        this.ringT = 0.9 - 0.6 * p;
        let slot = 0;
        for (let i = 0; i < MAX_RINGS; i++) if (this.ringAge[i] > this.ringAge[slot]) slot = i;
        this.ringAge[slot] = 0;
      }
    }
    for (let i = 0; i < MAX_RINGS; i++) this.ringAge[i] += dt;
    for (let i = 0; i < MAX_WAVES; i++) { if (this.waveDelay[i] > 0) this.waveDelay[i] -= dt; else this.waveAge[i] += dt; }
    this.fx.update(dt);
  }

  render() {
    const c = this.ctx, g = c.g, f = c.face, { w: vw, h: vh } = c.viewport;
    const p = this.power / 100, t = this.t;
    const cr = Math.round(this.cur[0] * 255), cg = Math.round(this.cur[1] * 255), cb = Math.round(this.cur[2] * 255);
    const auraCss = `rgb(${cr},${cg},${cb})`;

    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';

    if (c.faceVisible) {
      const W = f.faceWidth, cx = f.center.x, cy = f.center.y;
      g.globalCompositeOperation = 'lighter';

      // big aura glow
      const R = W * (1.5 + 0.5 * p + 0.5 * this.ultK);
      g.globalAlpha = (0.25 + 0.35 * p) * (0.85 + 0.15 * Math.sin(t * 8));
      g.drawImage(this.auraSprite, cx - R, cy + W * 0.3 - R, R * 2, R * 2);
      if (this.ultK > 0.01) {
        g.globalAlpha = this.ultK * 0.5;
        g.drawImage(this.ultSprite, cx - R, cy + W * 0.3 - R, R * 2, R * 2);
      }

      // rising aura streaks
      g.strokeStyle = auraCss;
      g.lineWidth = 2 + 2 * p;
      for (let i = 0; i < STREAKS; i++) {
        const ph = (t * (0.9 + 0.5 * p) + i * 0.137) % 1;
        const ang = (i / STREAKS) * 6.2832 + i;
        const x = cx + Math.cos(ang) * W * 0.62;
        const y = cy + W * 0.9 - ph * W * 1.9;
        const len = W * (0.25 + 0.2 * p) * (1 + 0.5 * this.ultK);
        g.globalAlpha = Math.sin(Math.PI * ph) * (0.35 + 0.4 * p);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.sin(t * 6 + i) * 6, y - len);
        g.stroke();
      }

      // energy rings moving up
      g.lineWidth = 3;
      for (let i = 0; i < MAX_RINGS; i++) {
        const a = this.ringAge[i];
        if (a > 1.2) continue;
        const k = a / 1.2;
        const rx = W * (0.5 + 1.1 * k);
        g.globalAlpha = Math.sin(Math.PI * k) * (0.5 + 0.4 * p);
        g.beginPath();
        g.ellipse(cx, cy + W * 0.95 - k * W * 1.7, rx, rx * 0.28, f.roll * 0.5, 0, 6.2832);
        g.stroke();
      }

      // electric sparks
      const styles = this.ultimate
        ? ['rgba(120,220,255,0.25)', 'rgba(160,235,255,0.6)', 'rgba(255,255,255,0.95)']
        : [rgbCss(this.cur[0], this.cur[1], this.cur[2], 0.25), rgbCss(this.cur[0], this.cur[1], this.cur[2], 0.65), 'rgba(255,255,255,0.95)'];
      for (let i = 0; i < MAX_BOLTS; i++) {
        if (this.boltAge[i] >= this.boltTtl[i]) continue;
        const r = i * 4;
        jagged(this.boltPts, i * BP, this.boltOff, i * BP,
          cx + this.boltRel[r] * W, cy + this.boltRel[r + 1] * W,
          cx + this.boltRel[r + 2] * W, cy + this.boltRel[r + 3] * W, BSEG, W * 0.06);
        g.globalAlpha = 0.6 + 0.4 * Math.random();
        strokeBolt(g, this.boltPts, i * BP, BP, Math.max(0.8, W * 0.004), styles);
      }
    }

    // explosion shockwaves
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < MAX_WAVES; i++) {
      if (this.waveDelay[i] > 0 || this.waveAge[i] > 1) continue;
      const k = this.waveAge[i];
      g.globalAlpha = (1 - k) * 0.9;
      g.strokeStyle = i % 2 ? '#ffffff' : auraCss;
      g.lineWidth = 3 + 14 * (1 - k);
      g.beginPath();
      g.arc(this.waveX[i], this.waveY[i], k * Math.hypot(vw, vh) * 0.7, 0, 6.2832);
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';

    if (!this.opts.embedded) {
      // ---- HUD: POWER LEVEL ------------------------------------------------
      const bw = Math.min(320, vw * 0.7), bh = 10, bx = vw / 2 - bw / 2, by = 76;
      g.globalAlpha = 1;
      g.textAlign = 'center';
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.6)';
      const blink = this.ultimate && Math.floor(this.ultDisplayT * 6) % 2 === 0;
      g.font = `700 12px ${FONT_MONO}`;
      g.fillStyle = this.ultimate ? (blink ? '#ffffff' : auraCss) : 'rgba(255,255,255,0.85)';
      g.fillText(this.ultimate ? '★ ULTIMATE FORM ★' : 'POWER LEVEL', vw / 2, 28);
      g.font = `900 ${this.ultimate ? 44 : 38}px system-ui, sans-serif`;
      g.strokeText(this.pctStr, vw / 2, 66);
      g.fillStyle = auraCss;
      g.fillText(this.pctStr, vw / 2, 66);

      rrect(g, bx, by, bw, bh, 5);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill();
      rrect(g, bx, by, Math.max(bh, bw * p), bh, 5);
      g.fillStyle = auraCss; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
      rrect(g, bx, by, bw, bh, 5); g.stroke();

    }

    // white flash on activation
    if (this.flashA > 0) {
      g.globalAlpha = this.flashA * (this.opts.embedded ? 0.45 : 0.75);
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, vw, vh);
    }
    g.restore();
  }
}
