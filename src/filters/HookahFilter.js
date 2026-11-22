import * as THREE from 'three';
import { BaseFilter } from './BaseFilter.js';
import { HookahRenderer } from '../hookahRenderer.js';
import { HoseRenderer } from '../hoseRenderer.js';
import { SmokeEmitter } from '../smokeEmitter.js';
import { ParticlePool } from '../core/particles.js';
import { makeGlowTexture } from '../core/textures.js';
import { SmokeLetters } from './fx/SmokeLetters.js';
import { GameEvents } from '../game/events.js';
import { damp } from '../filters.js';

/** HSV(h,1,1) -> [r,g,b] written into `out` (no allocation). */
function hue(h, out) {
  const k = (n) => { const x = (n + h * 6) % 6; return 1 - Math.max(0, Math.min(x, 4 - x, 1)); };
  out[0] = k(5); out[1] = k(3); out[2] = k(1);
  return out;
}

export class HookahFilter extends BaseFilter {
  static meta = {
    id: 'hookah',
    name: 'Hookah',
    icon: '💨',
    description: 'Smoke Decoder: il fumo del narghilè nasconde messaggi segreti da decifrare.',
    usesOverlay: true, // floating smoke letters are drawn on the 2D overlay
  };
  static settings = [
    { key: 'smokeDensity', label: 'Smoke Density', type: 'range', min: 0.1, max: 3, step: 0.05, default: 1, digits: 2 },
    { key: 'particleCount', label: 'Particle Count', type: 'range', min: 100, max: 2000, step: 50, default: 800, digits: 0 },
    { key: 'smokeSpeed', label: 'Smoke Speed', type: 'range', min: 0.2, max: 3, step: 0.05, default: 1, digits: 2 },
    { key: 'hookahScale', label: 'Hookah Scale', type: 'range', min: 0.5, max: 2, step: 0.05, default: 1, digits: 2 },
  ];

  initialize() {
    super.initialize();
    const c = this.ctx;
    this.hookah = new HookahRenderer(this.root);
    this.hose = new HoseRenderer(this.root);
    this.smoke = new SmokeEmitter(this.root, c.renderer);
    this.smoke.setPixelRatio(c.viewport.dpr);
    this.anchorW = new THREE.Vector3();
    this.mouthW = new THREE.Vector3();
    this.smokeCtx = { emitting: false, mouthX: 0, mouthY: 0, faceW: 0, side: 1 };

    // --- Smoke Decoder additions: message letters in the smoke + reward effects
    const tex = this.acquire('tex:glow', () => makeGlowTexture(64));
    this.gold = this.track(new ParticlePool(this.root, c.renderer, tex, { max: 500, gravity: 260, drag: 0.8 }));
    this.gold.setPixelRatio(c.viewport.dpr);
    this.letters = new SmokeLetters();
    this.tintT = 0;                 // rainbow celebration timer (badge)
    this.rgb = [1, 1, 1];
    this.targetTint = [1, 1, 1];    // smoke color of the current mission stage
    this.curTint = [1, 1, 1];       // smoothed toward the target (no hard color pop)

    const snap = c.games && c.games.getSnapshot();
    if (snap && snap.game.cipher) this.letters.setText(snap.game.cipher);
    this._syncStage(true);
    this.listen(GameEvents.GAME_STATE, ({ snapshot }) => {
      if (snapshot.game === 'caesar' && snapshot.cipher && snapshot.cipher !== this.letters.text) this.letters.setText(snapshot.cipher);
      this._syncStage();
    });
    const decoded = ({ snapshot }) => {
      this._syncStage();                 // level passed -> the smoke changes color
      if (snapshot.plain) this._reveal(snapshot.plain);
      this._goldBurst(40);
    };
    this.listen(GameEvents.GAME_LEVEL_COMPLETE, decoded);
    this.listen(GameEvents.GAME_COMPLETE, decoded);
    this.listen(GameEvents.MISSION_START, () => this._syncStage());
    this.listen(GameEvents.REWARD, ({ kind }) => { if (kind === 'badge') this._badgeShow(); });
  }

  /**
   * Smoke color = mission stage (0 white, 1 yellow, 2 red, 3 green, 4 blue, 5 purple).
   * @param {boolean} [snap] jump to the color instead of fading (first frame)
   */
  _syncStage(snap = false) {
    const st = this.ctx.games && this.ctx.games.getStage();
    const tint = st && st.missionId === 'smoke-decoder' && st.data ? st.data.tint : [1, 1, 1];
    this.targetTint[0] = tint[0]; this.targetTint[1] = tint[1]; this.targetTint[2] = tint[2];
    if (snap) { this.curTint[0] = tint[0]; this.curTint[1] = tint[1]; this.curTint[2] = tint[2]; }
    this.letters.setColor(st && st.missionId === 'smoke-decoder' ? st.css : '#e9edf2');
  }

  _anchors() {
    const f = this.ctx.face, h = this.hookah;
    return { mx: f.mouth.x, my: f.mouth.y, bx: h.x, by: h.y - h.h * 0.95 };
  }

  /** Decoded letters float out of the smoke in gold. */
  _reveal(text) {
    if (!this.ctx.faceVisible) return;
    const a = this._anchors();
    this.letters.celebrate(text, a.mx, a.my, this.ctx.face.faceWidth);
  }

  /** Golden sparkles from the hookah bowl and the mouth. */
  _goldBurst(n) {
    if (!this.ctx.faceVisible) return;
    const a = this._anchors(), W = this.ctx.face.faceWidth;
    for (let i = 0; i < n; i++) {
      const fromBowl = i % 2 === 0;
      const ang = Math.random() * 6.2832, sp = (120 + Math.random() * 380) * (W / 260);
      this.gold.emit(fromBowl ? a.bx : a.mx, fromBowl ? a.by : a.my, Math.cos(ang) * sp, Math.sin(ang) * sp - 120,
        0.7 + Math.random() * 0.9, W * (0.03 + Math.random() * 0.04), W * 0.008,
        1, 0.78 + Math.random() * 0.15, 0.2 + Math.random() * 0.3, 1, 0.5);
    }
  }

  /** Badge unlocked: bigger gold burst + colored (rainbow) smoke for a few seconds. */
  _badgeShow() {
    this._goldBurst(220);
    this.tintT = 4;
  }

  update(dt, time) {
    const c = this.ctx, face = c.face, sc = this.smokeCtx;
    if (c.faceVisible) {
      const { w: vw, h: vh } = c.viewport;
      this.hookah.group.visible = true;
      this.hose.visible = true;
      this.hookah.update(dt, face, this.settings, vw, vh - c.uiInsets.bottom + 10, time);
      this.hookah.getAnchorWorld(this.anchorW);
      this.mouthW.set(face.mouth.x, -face.mouth.y, this.anchorW.z);
      this.hose.update(dt, time, this.anchorW, this.mouthW, face.faceWidth, this.hookah.side);

      sc.emitting = c.mouth.open;
      sc.mouthX = face.mouth.x;
      sc.mouthY = face.mouth.y;
      sc.faceW = face.faceWidth;
      sc.side = this.hookah.side;
    } else {
      this.hookah.group.visible = false;
      this.hose.visible = false;
      this.hookah.reset();
      this.hose.reset();
      sc.emitting = false;
    }

    // smoke color follows the stage; a badge temporarily plays a rainbow on top of it
    for (let i = 0; i < 3; i++) this.curTint[i] = damp(this.curTint[i], this.targetTint[i], 4, dt);
    let r = this.curTint[0], g = this.curTint[1], b = this.curTint[2];
    if (this.tintT > 0) {
      this.tintT -= dt;
      const k = Math.min(1, this.tintT);
      hue((time * 0.7) % 1, this.rgb);
      r += (this.rgb[0] - r) * k; g += (this.rgb[1] - g) * k; b += (this.rgb[2] - b) * k;
    }
    this.smoke.setTint(r, g, b);

    this.smoke.update(dt, time, sc, this.settings);
    this.gold.update(dt);
    this.letters.update(dt, c.faceVisible && c.mouth.open, sc.mouthX, sc.mouthY, sc.faceW || 200);
  }

  render() { this.letters.render(this.ctx.g); }

  onResize(w, h, dpr) {
    if (this.smoke) this.smoke.setPixelRatio(dpr);
    if (this.gold) this.gold.setPixelRatio(dpr);
  }

  debugDraw(dbg) {
    if (!this.ctx.faceVisible) return;
    const g = dbg.ctx, pts = this.hose.ctrl;
    g.strokeStyle = 'rgba(255,220,60,0.7)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) g.moveTo(pts[i].x, -pts[i].y); else g.lineTo(pts[i].x, -pts[i].y);
    }
    g.stroke();
    for (let i = 0; i < pts.length; i++) {
      dbg.dot(pts[i].x, -pts[i].y, i === 0 || i === 4 ? 5 : 4, '#ffd23c');
      dbg.label(`P${i}`, pts[i].x, -pts[i].y, '#ffd23c');
    }
    dbg.dot(this.anchorW.x, -this.anchorW.y, 3, '#7dff7d');
  }

  dispose() {
    if (this.disposed) return;
    this.hookah.dispose();
    this.hose.dispose();
    this.smoke.dispose();
    super.dispose();
  }
}
