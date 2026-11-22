import { BaseFilter } from './BaseFilter.js';
import { hexToRgb, rgbCss } from '../core/color.js';
import { clamp, damp } from '../filters.js';
import { rrect } from '../core/draw.js';

const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const DASH_A = [10, 8], DASH_B = [3, 5], NO_DASH = [];
const SEGS = 20, BLIPS = 6;

export class IronManHUDFilter extends BaseFilter {
  static meta = {
    id: 'iron-man',
    name: 'Iron Man',
    icon: '🤖',
    description: 'Sci-fi helmet HUD: scanner, targeting, energy meter and radar.',
    usesOverlay: true,
  };
  static settings = [
    { key: 'hudColor', label: 'HUD Color', type: 'color', default: '#4de1ff' },
    { key: 'hudOpacity', label: 'HUD Opacity', type: 'range', min: 0.3, max: 1, step: 0.05, default: 1, digits: 2 },
  ];

  initialize() {
    super.initialize();
    this.rgb = [0.3, 0.88, 1];
    this.css = {};
    this._applyColor();
    this.t = 0; this.scanStart = -1; this.lastFace = -9;
    this.charge = 0; this.energy = 0.85;
    this.txtT = 0;
    this.energyStr = '85%'; this.chargeStr = '0%';
    this.telemetry = ['', '', '', ''];
    this.clock = '00:00:00';
    this.blipA = new Float32Array(BLIPS); this.blipD = new Float32Array(BLIPS);
    for (let i = 0; i < BLIPS; i++) { this.blipA[i] = Math.random() * 6.2832; this.blipD[i] = 0.25 + Math.random() * 0.7; }
    this.band = document.createElement('canvas');
    this.band.width = 4; this.band.height = 64;
    this.vignette = document.createElement('canvas');
    this.scanTile = document.createElement('canvas');
    this.scanTile.width = 2; this.scanTile.height = 4;
    this.scanPattern = null;
    this._buildStatic();
  }

  _applyColor() {
    hexToRgb(this.settings.hudColor, this.rgb);
    const [r, g, b] = this.rgb;
    this.css = {
      a100: rgbCss(r, g, b, 1), a80: rgbCss(r, g, b, 0.8), a60: rgbCss(r, g, b, 0.6),
      a35: rgbCss(r, g, b, 0.35), a18: rgbCss(r, g, b, 0.18), a08: rgbCss(r, g, b, 0.08),
    };
  }
  onSettingChange(key) {
    if (key === 'hudColor' || key === '*') { this._applyColor(); this._buildStatic(); }
  }
  onResize() { this._buildStatic(); }

  /** Pre-render everything that doesn't change per frame. */
  _buildStatic() {
    const { w, h } = this.ctx.viewport;
    if (!w || !h) return;
    const [r, g, b] = this.rgb;

    // helmet vignette + visor frame
    const v = this.vignette; v.width = w; v.height = h;
    const vg = v.getContext('2d');
    const rad = vg.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    rad.addColorStop(0, 'rgba(0,10,20,0)');
    rad.addColorStop(1, 'rgba(0,12,24,0.7)');
    vg.fillStyle = rad; vg.fillRect(0, 0, w, h);
    vg.strokeStyle = this.css.a35; vg.lineWidth = 2;
    rrect(vg, 10, 10, w - 20, h - 20, Math.min(40, w * 0.08)); vg.stroke();
    vg.strokeStyle = this.css.a18; vg.lineWidth = 1;
    rrect(vg, 18, 18, w - 36, h - 36, Math.min(34, w * 0.07)); vg.stroke();

    // moving scan band
    const bg = this.band.getContext('2d');
    const lg = bg.createLinearGradient(0, 0, 0, 64);
    lg.addColorStop(0, rgbCss(r, g, b, 0));
    lg.addColorStop(0.85, rgbCss(r, g, b, 0.18));
    lg.addColorStop(1, rgbCss(r, g, b, 0.7));
    bg.clearRect(0, 0, 4, 64); bg.fillStyle = lg; bg.fillRect(0, 0, 4, 64);

    // static scanlines
    const st = this.scanTile.getContext('2d');
    st.clearRect(0, 0, 2, 4); st.fillStyle = rgbCss(r, g, b, 0.07); st.fillRect(0, 0, 2, 1);
    this.scanPattern = this.ctx.g.createPattern(this.scanTile, 'repeat');
  }

  update(dt, time) {
    const c = this.ctx, f = c.face;
    this.t = time;
    if (c.faceVisible) {
      if (time - this.lastFace > 1) this.scanStart = time;
      this.lastFace = time;
    }
    this.charge = damp(this.charge, c.mouth.level, 8, dt);
    this.energy = 0.82 + 0.1 * Math.sin(time * 0.8) - 0.2 * this.charge;

    this.txtT -= dt;
    if (this.txtT <= 0) {
      this.txtT = 0.125;
      this.energyStr = `${Math.round(this.energy * 100)}%`;
      this.chargeStr = `${Math.round(this.charge * 100)}%`;
      const d = (v) => (v * 57.2958).toFixed(1).padStart(6, ' ');
      this.telemetry[0] = `YAW   ${d(f.yaw)}°`;
      this.telemetry[1] = `PITCH ${d(f.pitch)}°`;
      this.telemetry[2] = `ROLL  ${d(f.roll)}°`;
      this.telemetry[3] = `RANGE ${(3600 / Math.max(f.faceWidth, 1)).toFixed(2)}m`;
      this.clock = new Date().toTimeString().slice(0, 8);
    }
  }

  _bracket(g, x, y, w, h, l) {
    g.beginPath();
    g.moveTo(x, y + l); g.lineTo(x, y); g.lineTo(x + l, y);
    g.moveTo(x + w - l, y); g.lineTo(x + w, y); g.lineTo(x + w, y + l);
    g.moveTo(x + w, y + h - l); g.lineTo(x + w, y + h); g.lineTo(x + w - l, y + h);
    g.moveTo(x + l, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - l);
    g.stroke();
  }

  _meter(g, x, y, w, h, value, label, valueStr, alignRight) {
    const segH = h / SEGS;
    for (let i = 0; i < SEGS; i++) {
      const on = (SEGS - i) / SEGS <= value + 1e-6;
      g.fillStyle = on ? this.css.a80 : this.css.a18;
      g.fillRect(x, y + i * segH + 1, w, segH - 2);
    }
    g.strokeStyle = this.css.a60; g.lineWidth = 1;
    g.strokeRect(x - 3, y - 3, w + 6, h + 6);
    g.textAlign = alignRight ? 'right' : 'left';
    g.fillStyle = this.css.a100;
    g.font = `600 11px ${MONO}`;
    const tx = alignRight ? x + w + 3 : x - 3;
    g.fillText(label, tx, y - 14);
    g.font = `700 16px ${MONO}`;
    g.fillText(valueStr, tx, y + h + 22);
  }

  render() {
    const c = this.ctx, g = c.g, f = c.face, t = this.t, { w: vw, h: vh } = c.viewport;
    const css = this.css, bottom = vh - c.uiInsets.bottom;
    g.save();
    g.globalAlpha = this.settings.hudOpacity;
    g.lineJoin = 'round';

    g.drawImage(this.vignette, 0, 0, vw, vh);
    if (this.scanPattern) { g.fillStyle = this.scanPattern; g.fillRect(0, 0, vw, vh); }
    const by = ((t * 0.3) % 1.15 - 0.1) * vh;
    g.drawImage(this.band, 0, by - 50, vw, 100);

    // top status
    g.textAlign = 'center'; g.fillStyle = css.a100;
    g.font = `700 12px ${MONO}`;
    g.fillText('◢ HELMET SYSTEMS ONLINE ◣', vw / 2, 26);
    g.font = `500 11px ${MONO}`; g.fillStyle = css.a60;
    g.fillText(this.clock, vw / 2, 42);

    // face tracking
    if (c.faceVisible) {
      const W = f.faceWidth, H = f.faceHeight, cx = f.center.x, cy = f.center.y;
      const bw = W * 1.25, bh = H * 1.2, bx = cx - bw / 2, bY = cy - bh / 2;

      g.strokeStyle = css.a100; g.lineWidth = 2;
      this._bracket(g, bx, bY, bw, bh, W * 0.2);
      g.strokeStyle = css.a35; g.lineWidth = 1; g.setLineDash(DASH_B);
      g.strokeRect(bx, bY, bw, bh);

      // rotating reticle
      g.setLineDash(DASH_A); g.lineDashOffset = -t * 30; g.strokeStyle = css.a60;
      g.beginPath(); g.arc(cx, cy, H * 0.86, 0, 6.2832); g.stroke();
      g.lineDashOffset = t * 20; g.strokeStyle = css.a35;
      g.beginPath(); g.arc(cx, cy, H * 0.95, 0, 6.2832); g.stroke();
      g.setLineDash(NO_DASH); g.lineDashOffset = 0;

      // scan line inside the face box
      const sy = bY + ((t * 0.8) % 1) * bh;
      g.fillStyle = css.a35; g.fillRect(bx, sy, bw, 2);
      g.fillStyle = css.a08; g.fillRect(bx, sy - 14, bw, 14);

      // eye + mouth targeting boxes
      g.lineWidth = 1.5; g.font = `600 10px ${MONO}`; g.fillStyle = css.a100; g.strokeStyle = css.a100;
      const es = f.eyeWidth * 1.5;
      this._bracket(g, f.eyeL.x - es / 2, f.eyeL.y - es / 2, es, es, es * 0.3);
      this._bracket(g, f.eyeR.x - es / 2, f.eyeR.y - es / 2, es, es, es * 0.3);
      g.textAlign = 'right'; g.fillText('L.EYE', f.eyeL.x - es / 2 - 4, f.eyeL.y - es / 2 - 2);
      g.textAlign = 'left'; g.fillText('R.EYE', f.eyeR.x + es / 2 + 4, f.eyeR.y - es / 2 - 2);
      const mw = W * 0.45, mh = W * 0.2 + f.openness * H * 0.8;
      this._bracket(g, f.mouth.x - mw / 2, f.mouth.y - mh / 2, mw, mh, mw * 0.22);
      g.textAlign = 'center';
      g.fillText(c.mouth.open ? 'VOCAL: ACTIVE' : 'VOCAL: IDLE', f.mouth.x, f.mouth.y + mh / 2 + 14);

      // facial recognition readout
      const p = clamp((t - this.scanStart) / 2.5, 0, 1);
      const tx = bx, ty = bY > 70 ? bY - 8 : bY + bh + 16;
      g.textAlign = 'left'; g.fillStyle = css.a100; g.font = `700 11px ${MONO}`;
      g.fillText('FACIAL RECOGNITION', tx, ty - (bY > 70 ? 14 : 0));
      g.font = `500 11px ${MONO}`; g.fillStyle = css.a80;
      g.fillText(p < 1 ? `SCANNING... ${Math.floor(p * 100)}%` : 'MATCH 98.7%  ·  SUBJECT USER-01', tx, ty);
      g.fillStyle = css.a18; g.fillRect(tx, ty + 5, bw, 3);
      g.fillStyle = css.a100; g.fillRect(tx, ty + 5, bw * p, 3);
    } else {
      g.textAlign = 'center'; g.fillStyle = css.a80; g.font = `700 13px ${MONO}`;
      g.fillText(Math.floor(t * 2) % 2 ? 'NO TARGET' : 'SEARCHING...', vw / 2, vh / 2);
      g.setLineDash(DASH_A); g.lineDashOffset = -t * 30; g.strokeStyle = css.a35; g.lineWidth = 1.5;
      g.beginPath(); g.arc(vw / 2, vh / 2, Math.min(vw, vh) * 0.22, 0, 6.2832); g.stroke();
      g.setLineDash(NO_DASH);
    }

    // energy (left) + weapon charge (right)
    const mh = Math.min(200, vh * 0.3), my = vh / 2 - mh / 2;
    this._meter(g, 26, my, 16, mh, this.energy, 'ENERGY', this.energyStr, false);
    this._meter(g, vw - 42, my, 16, mh, this.charge, 'WEAPON', this.chargeStr, true);

    // arc-reactor gauge
    const rx = 62, ry = my - 62, rr = 24;
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = i === 0 ? css.a100 : i === 1 ? css.a60 : css.a35;
      const a = t * (1.2 + i * 0.6) * (i % 2 ? -1 : 1) + i * 2;
      g.beginPath(); g.arc(rx, ry, rr - i * 6, a, a + 3.6 - i * 0.7); g.stroke();
    }
    g.fillStyle = css.a100; g.beginPath(); g.arc(rx, ry, 4 + Math.sin(t * 4), 0, 6.2832); g.fill();

    // telemetry (bottom-left)
    g.textAlign = 'left'; g.fillStyle = css.a80; g.font = `500 11px ${MONO}`;
    for (let i = 0; i < 4; i++) g.fillText(this.telemetry[i], 28, bottom - 8 - (3 - i) * 15 - 4);

    // radar (bottom-right)
    const R = Math.min(64, vw * 0.14), rcx = vw - R - 28, rcy = bottom - R - 14;
    g.strokeStyle = css.a35; g.lineWidth = 1;
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(rcx, rcy, (R * i) / 3, 0, 6.2832); g.stroke(); }
    g.beginPath();
    g.moveTo(rcx - R, rcy); g.lineTo(rcx + R, rcy); g.moveTo(rcx, rcy - R); g.lineTo(rcx, rcy + R);
    g.stroke();
    const sweep = (t * 2.2) % 6.2832;
    for (let i = 0; i < 5; i++) {
      g.fillStyle = rgbCss(this.rgb[0], this.rgb[1], this.rgb[2], 0.22 - i * 0.04);
      g.beginPath(); g.moveTo(rcx, rcy);
      g.arc(rcx, rcy, R, sweep - (i + 1) * 0.14, sweep - i * 0.14);
      g.closePath(); g.fill();
    }
    g.strokeStyle = css.a100; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(rcx, rcy); g.lineTo(rcx + Math.cos(sweep) * R, rcy + Math.sin(sweep) * R); g.stroke();
    for (let i = 0; i < BLIPS; i++) {
      let d = sweep - this.blipA[i]; d = ((d % 6.2832) + 6.2832) % 6.2832;
      const a = Math.max(0.15, 1 - d / 3.5);
      g.globalAlpha = a * this.settings.hudOpacity;
      g.fillStyle = css.a100;
      g.beginPath();
      g.arc(rcx + Math.cos(this.blipA[i]) * R * this.blipD[i], rcy + Math.sin(this.blipA[i]) * R * this.blipD[i], 2.5, 0, 6.2832);
      g.fill();
    }
    g.globalAlpha = this.settings.hudOpacity;
    g.textAlign = 'center'; g.fillStyle = css.a80; g.font = `600 10px ${MONO}`;
    g.fillText('RADAR', rcx, rcy - R - 6);
    g.restore();
  }
}
