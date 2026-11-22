import { BaseFilter } from './BaseFilter.js';
import { ParticlePool } from '../core/particles.js';
import { makeGlowTexture, makeGlowCanvas } from '../core/textures.js';
import { jagged, randomOffsets, strokeBolt } from '../core/bolt.js';
import { GameEvents } from '../game/events.js';
import { PowerUpFilter } from './PowerUpFilter.js';

const SEG = 9;
const P1 = SEG + 1;
const MAX_ARCS = 16;
const MAX_PULSES = 6;
/**
 * Color palettes. The mission stage picks one (see `stages` in game/missions.js):
 * blue at the start, purple after the Caesar trial, red ("flaming eyes") after the guided Vigenere.
 * style = [halo, mid, core] strokes for bolts; glow = RGB of the eye glow; spark = particle RGB (0-1).
 */
const PALETTES = {
  blue: { style: ['rgba(70,130,255,0.14)', 'rgba(110,170,255,0.5)', 'rgba(235,245,255,0.95)'], glow: [80, 150, 255], spark: [0.45, 0.7, 1] },
  purple: { style: ['rgba(150,70,255,0.14)', 'rgba(180,115,255,0.5)', 'rgba(246,236,255,0.95)'], glow: [170, 90, 255], spark: [0.75, 0.45, 1] },
  red: { style: ['rgba(255,60,40,0.16)', 'rgba(255,110,80,0.55)', 'rgba(255,236,230,0.95)'], glow: [255, 70, 50], spark: [1, 0.4, 0.25] },
};
const WHITE = [1, 1, 1];
/** Add-on Power Up (unlocked by the 4th trial): red-orange flames around the eyes. */
const POWER_SETTINGS = { auraColor: '#ff5a3c', powerGain: 1 };

export class LightningEyesFilter extends BaseFilter {
  static meta = {
    id: 'lightning-eyes',
    name: 'Lightning Eyes',
    icon: '⚡',
    description: 'Secret Agent: occhi elettrici e una missione segreta da decifrare.',
    usesOverlay: true,
  };
  static settings = [
    { key: 'lightningIntensity', label: 'Lightning Intensity', type: 'range', min: 0.3, max: 2.5, step: 0.05, default: 1, digits: 2 },
    { key: 'glowSize', label: 'Glow Size', type: 'range', min: 0.5, max: 2, step: 0.05, default: 1, digits: 2 },
  ];

  initialize() {
    super.initialize();
    const c = this.ctx;
    this.glows = {};
    for (const [name, pal] of Object.entries(PALETTES)) {
      this.glows[name] = this.acquire(`glow2d:${name}`, () => makeGlowCanvas(128, pal.glow));
    }
    this.palette = 'blue'; // both eyes start blue
    this.glowWhite = this.acquire('glow2d:white', () => makeGlowCanvas(128, [255, 255, 255]));
    const tex = this.acquire('tex:glow', () => makeGlowTexture(64));
    this.sparks = this.track(new ParticlePool(this.root, c.renderer, tex, { max: 320, drag: 2.2 }));
    this.sparks.setPixelRatio(c.viewport.dpr);

    this.arcPts = new Float32Array(MAX_ARCS * P1 * 2);
    this.arcOff = new Float32Array(MAX_ARCS * P1);
    this.arcAng = new Float32Array(MAX_ARCS);
    this.arcLen = new Float32Array(MAX_ARCS);
    this.arcAge = new Float32Array(MAX_ARCS);
    this.arcTtl = new Float32Array(MAX_ARCS);
    this.arcAlive = new Uint8Array(MAX_ARCS);
    this.perEye = 0;

    this.bridgePts = new Float32Array(P1 * 2);
    this.bridgeOff = new Float32Array(P1);
    this.bridgeAge = 1; this.bridgeTtl = 0.06;

    this.pulseX = new Float32Array(MAX_PULSES);
    this.pulseY = new Float32Array(MAX_PULSES);
    this.pulseAge = new Float32Array(MAX_PULSES).fill(9);

    this.lastBlinkSeq = c.face.blinkSeq;
    this.sparkAcc = 0;
    this.t = 0;

    // Secret Agent mission feedback: lightning surges when the player progresses
    this.surge = 0;
    this.powerFx = null;
    this.pendingBurst = false;
    this._syncStage(true);
    this.listen(GameEvents.GAME_WRONG, () => { this.surge = Math.max(this.surge, 0.25); });
    this.listen(GameEvents.GAME_STEP, () => { this.surge = Math.max(this.surge, 0.5); });
    this.listen(GameEvents.GAME_STATE, () => this._syncStage());
    this.listen(GameEvents.MISSION_START, () => this._syncStage());
    this.listen(GameEvents.GAME_COMPLETE, () => this._syncStage());
    this.listen(GameEvents.GAME_LEVEL_COMPLETE, () => { this._syncStage(); this._missionBurst(40, 1.0); });
    this.listen(GameEvents.MISSION_PHASE_UNLOCKED, () => this._missionBurst(90, 1.6));
    this.listen(GameEvents.REWARD, ({ kind }) => { if (kind === 'badge') this._missionBurst(200, 2.0); });
  }

  /**
   * Eye/lightning color + Power Up add-on follow the mission stage:
   * 0 blue · 1 purple (Caesar passed) · 2-3 red (guided Vigenere passed) · 4 red + Power Up (4th trial passed).
   * @param {boolean} [initial] true on first call: a restored finished mission shows the aura without the explosion
   */
  _syncStage(initial = false) {
    const st = this.ctx.games && this.ctx.games.getStage();
    const ok = !!(st && st.missionId === 'secret-agent' && st.data);
    const effect = ok ? st.data.effect : 'blue';
    this.palette = PALETTES[effect] ? effect : 'blue';
    const wantPower = ok && !!st.data.powerUp;
    if (wantPower && !this.powerFx) {
      this.powerFx = new PowerUpFilter(this.ctx, { ...POWER_SETTINGS }, { embedded: true, power: 70 });
      this.powerFx.initialize();
      this.pendingBurst = !initial;
    } else if (!wantPower && this.powerFx) {
      this.powerFx.dispose();
      this.powerFx = null;
      this.pendingBurst = false;
    }
  }

  /** Golden/white spark shower from both eyes + temporary intensity boost. */
  _missionBurst(n, surge) {
    this.surge = Math.max(this.surge, surge);
    const f = this.ctx.face;
    if (!this.ctx.faceVisible) return;
    const W = f.faceWidth;
    for (let i = 0; i < n; i++) {
      const eye = i % 2 ? f.eyeR : f.eyeL;
      const a = Math.random() * 6.2832, sp = (160 + Math.random() * 480) * (W / 260);
      const gold = Math.random() < 0.6;
      this.sparks.emit(eye.x, eye.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.5 + Math.random() * 0.7,
        W * 0.035, W * 0.006, 1, gold ? 0.82 : 1, gold ? 0.25 : 1, 1, 0);
    }
  }

  _spark(x, y, ang, W, speedMul = 1) {
    const sp = (120 + Math.random() * 260) * (W / 260) * speedMul;
    const a = ang + (Math.random() - 0.5) * 1.2;
    const k = Math.random() < 0.2 ? WHITE : PALETTES[this.palette].spark;
    this.sparks.emit(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.25 + Math.random() * 0.3,
      W * 0.025, W * 0.004, k[0], k[1], k[2], 1, 0);
  }

  _regen(s, W, I, m) {
    const f = this.ctx.face;
    const eye = (s & 1) ? f.eyeR : f.eyeL;
    const base = Math.atan2(eye.y - f.center.y, eye.x - f.center.x);
    const ang = base + (Math.random() - 0.5) * 2.6;
    const len = W * (0.16 + Math.random() * 0.36) * (0.8 + 0.45 * I) * (1 + 0.9 * m);
    this.arcAng[s] = ang; this.arcLen[s] = len;
    this.arcAge[s] = 0; this.arcTtl[s] = 0.05 + Math.random() * 0.09;
    this.arcAlive[s] = 1;
    randomOffsets(this.arcOff, s * P1, P1);
    if (Math.random() < 0.45 + 0.4 * m) {
      this._spark(eye.x + Math.cos(ang) * len, eye.y + Math.sin(ang) * len, ang, W);
    }
  }

  update(dt) {
    const c = this.ctx, f = c.face;
    this.surge = Math.max(0, this.surge - dt * 0.8);
    const I = this.settings.lightningIntensity * (1 + this.surge), m = c.mouth.level;
    this.t += dt;

    if (this.powerFx) {
      this.powerFx.update(dt, this.t);
      if (this.pendingBurst && c.faceVisible) { this.powerFx.burst(); this.pendingBurst = false; }
    }

    if (!c.faceVisible) { this.arcAlive.fill(0); this.sparks.update(dt); return; }
    const W = f.faceWidth;

    this.perEye = Math.min(8, Math.round(1.5 + 1.2 * I + 3.5 * m * I));
    for (let s = 0; s < MAX_ARCS; s++) {
      if ((s >> 1) >= this.perEye) { this.arcAlive[s] = 0; continue; }
      this.arcAge[s] += dt;
      if (!this.arcAlive[s] || this.arcAge[s] >= this.arcTtl[s]) this._regen(s, W, I, m);
    }

    // eye-to-eye arc across the nose bridge when the mouth is open
    this.bridgeAge += dt;
    if (this.bridgeAge >= this.bridgeTtl) {
      this.bridgeAge = 0;
      this.bridgeTtl = 0.04 + Math.random() * 0.06;
      randomOffsets(this.bridgeOff, 0, P1);
    }

    // ambient sparks from the pupils
    this.sparkAcc += dt * 10 * I * (1 + 2.5 * m);
    while (this.sparkAcc >= 1) {
      this.sparkAcc -= 1;
      const eye = Math.random() < 0.5 ? f.eyeL : f.eyeR;
      this._spark(eye.x, eye.y, Math.random() * 6.2832, W, 0.7);
    }

    // blink -> small energy pulse
    if (f.blinkSeq !== this.lastBlinkSeq) {
      this.lastBlinkSeq = f.blinkSeq;
      for (let e = 0; e < 2; e++) {
        const eye = e ? f.eyeR : f.eyeL;
        let slot = 0;
        for (let i = 0; i < MAX_PULSES; i++) if (this.pulseAge[i] > this.pulseAge[slot]) slot = i;
        this.pulseX[slot] = eye.x; this.pulseY[slot] = eye.y;
        this.pulseAge[slot] = 0;
        for (let k = 0; k < 14; k++) this._spark(eye.x, eye.y, Math.random() * 6.2832, W, 1.1);
      }
    }
    for (let i = 0; i < MAX_PULSES; i++) this.pulseAge[i] += dt;

    this.sparks.update(dt);
  }

  render() {
    const c = this.ctx, g = c.g, f = c.face;
    if (this.powerFx) this.powerFx.render();   // Power Up aura is drawn first, bolts on top
    if (!c.faceVisible) return;
    const I = this.settings.lightningIntensity * (1 + this.surge), gs = this.settings.glowSize, m = c.mouth.level;
    const W = f.faceWidth;
    const flick = 0.82 + Math.random() * 0.18;
    const pal = PALETTES[this.palette];

    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // glowing pupils (bloom = layered additive glows)
    for (let e = 0; e < 2; e++) {
      const eye = e ? f.eyeR : f.eyeL;
      const open = 0.15 + 0.85 * f.eyeOpen01;
      const r0 = f.eyeWidth * 0.9 * gs;
      const boost = (0.7 + 0.3 * I) * (1 + 0.5 * m) * flick;
      const img = this.glows[this.palette];
      let r = r0 * 3.4;
      g.globalAlpha = Math.min(1, 0.35 * open * boost);
      g.drawImage(img, eye.x - r, eye.y - r, r * 2, r * 2);
      r = r0 * 1.7;
      g.globalAlpha = Math.min(1, 0.8 * open * boost);
      g.drawImage(img, eye.x - r, eye.y - r, r * 2, r * 2);
      r = r0 * 0.75;
      g.globalAlpha = Math.min(1, open * boost);
      g.drawImage(this.glowWhite, eye.x - r, eye.y - r, r * 2, r * 2);
    }

    // arcs
    const w = Math.max(0.8, W * 0.0055 * (0.7 + 0.4 * I));
    for (let s = 0; s < MAX_ARCS; s++) {
      if (!this.arcAlive[s]) continue;
      const eye = (s & 1) ? f.eyeR : f.eyeL;
      const ang = this.arcAng[s], len = this.arcLen[s];
      jagged(this.arcPts, s * P1, this.arcOff, s * P1,
        eye.x, eye.y, eye.x + Math.cos(ang) * len, eye.y + Math.sin(ang) * len, SEG, len * 0.2);
      g.globalAlpha = Math.min(1, (0.55 + 0.45 * Math.random()) * (0.6 + 0.4 * I));
      strokeBolt(g, this.arcPts, s * P1, P1, w, pal.style);
    }
    if (m > 0.3) {
      jagged(this.bridgePts, 0, this.bridgeOff, 0, f.eyeL.x, f.eyeL.y, f.eyeR.x, f.eyeR.y, SEG, W * 0.07);
      g.globalAlpha = Math.min(1, (m - 0.3) / 0.5) * (0.6 + 0.4 * Math.random());
      strokeBolt(g, this.bridgePts, 0, P1, w, pal.style);
    }

    // blink pulses: expanding rings
    for (let i = 0; i < MAX_PULSES; i++) {
      const a = this.pulseAge[i];
      if (a > 0.45) continue;
      const k = a / 0.45;
      g.globalAlpha = (1 - k) * 0.9;
      g.strokeStyle = pal.style[2];
      g.lineWidth = 3 * (1 - k) + 0.5;
      g.beginPath();
      g.arc(this.pulseX[i], this.pulseY[i], f.eyeWidth * (0.5 + 2.4 * k), 0, 6.2832);
      g.stroke();
    }
    g.restore();
  }

  dispose() {
    if (this.disposed) return;
    if (this.powerFx) { this.powerFx.dispose(); this.powerFx = null; }
    super.dispose();
  }
}
