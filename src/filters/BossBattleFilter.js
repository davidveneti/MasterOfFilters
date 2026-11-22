import { BaseFilter } from './BaseFilter.js';
import { ParticlePool } from '../core/particles.js';
import { makeGlowTexture, makeGlowCanvas } from '../core/textures.js';
import { rrect, easeOutBack } from '../core/draw.js';
import { damp, clamp } from '../filters.js';

const NAMES = ['SHADOW GOLEM', 'CRIMSON WYRM', 'VOID WARDEN', 'IRON TITAN', 'NIGHT REAPER'];
const ICONS = ['👹', '🐲', '👾', '💀', '🤖'];
const MAX_PROJ = 8, MAX_NUMS = 20;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const CONFETTI = [[1, 0.35, 0.35], [1, 0.85, 0.2], [0.4, 0.9, 0.5], [0.4, 0.7, 1], [0.85, 0.5, 1]];

export class BossBattleFilter extends BaseFilter {
  static meta = {
    id: 'boss-battle',
    name: 'Boss Battle',
    icon: '👹',
    description: 'Every time you open your mouth you attack the boss above your head.',
    usesOverlay: true,
  };
  static settings = [
    { key: 'bossHealth', label: 'Boss Health', type: 'range', min: 100, max: 2000, step: 50, default: 500, digits: 0 },
    { key: 'attackPower', label: 'Attack Power', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1, digits: 1 },
  ];

  initialize() {
    super.initialize();
    const c = this.ctx;
    const tex = this.acquire('tex:glow', () => makeGlowTexture(64));
    this.fx = this.track(new ParticlePool(this.root, c.renderer, tex, { max: 700, gravity: 620, drag: 0.6 }));
    this.fx.setPixelRatio(c.viewport.dpr);
    this.glowWhite = this.acquire('glow2d:white', () => makeGlowCanvas(128, [255, 255, 255]));
    this.glowRed = this.acquire('glow2d:red', () => makeGlowCanvas(128, [255, 80, 60]));

    this.level = 1;
    this.maxHp = this.settings.bossHealth; this.hp = this.maxHp; this.hpShown = this.maxHp;
    this.chipDelay = 0; this.hitFlash = 0; this.attackCd = 0;
    this.mode = 0; // 0 = fight, 1 = defeated
    this.defeatT = 0; this.xpGain = 0;
    this.combo = 0; this.comboT = 0; this.comboPop = 0; this.comboStr = '';
    this.bx = 0; this.by = 0; this.bw = 200; this.bh = 20; this.placed = false;
    this.hpStr = ''; this._syncHpStr();
    this.t = 0;

    this.projX = new Float32Array(MAX_PROJ); this.projY = new Float32Array(MAX_PROJ);
    this.projSx = new Float32Array(MAX_PROJ); this.projSy = new Float32Array(MAX_PROJ);
    this.projK = new Float32Array(MAX_PROJ).fill(2);
    this.projDmg = new Float32Array(MAX_PROJ); this.projCrit = new Uint8Array(MAX_PROJ);

    this.numX = new Float32Array(MAX_NUMS); this.numY = new Float32Array(MAX_NUMS);
    this.numVx = new Float32Array(MAX_NUMS);
    this.numAge = new Float32Array(MAX_NUMS).fill(9);
    this.numCrit = new Uint8Array(MAX_NUMS);
    this.numText = new Array(MAX_NUMS).fill('');
  }

  onSettingChange(key) {
    if (key === 'bossHealth' || key === '*') {
      this.maxHp = this.settings.bossHealth; this.hp = this.maxHp; this.hpShown = this.maxHp;
      this.mode = 0; this._syncHpStr();
    }
  }
  _syncHpStr() { this.hpStr = `${Math.ceil(this.hp)} / ${this.maxHp}`; }

  _attack() {
    const f = this.ctx.face;
    if (this.comboT > 0) this.combo++; else this.combo = 1;
    this.comboT = 1.4; this.comboPop = 1; this.comboStr = `COMBO x${this.combo}`;
    this.attackCd = 0.15;
    const crit = Math.random() < 0.15;
    let dmg = (8 + Math.random() * 10) * this.settings.attackPower * (1 + Math.min(this.combo, 10) * 0.1);
    if (crit) dmg *= 2;
    let i = 0;
    for (let k = 0; k < MAX_PROJ; k++) if (this.projK[k] >= 1) { i = k; break; }
    this.projSx[i] = f.mouth.x; this.projSy[i] = f.mouth.y;
    this.projX[i] = f.mouth.x; this.projY[i] = f.mouth.y;
    this.projK[i] = 0; this.projDmg[i] = Math.round(dmg); this.projCrit[i] = crit ? 1 : 0;
  }

  _hit(dmg, crit, x, y) {
    const c = this.ctx, W = c.face.faceWidth || 200;
    this.hp = Math.max(0, this.hp - dmg);
    this.hitFlash = 1; this.chipDelay = 0.45;
    this._syncHpStr();
    // floating damage number
    let slot = 0;
    for (let i = 0; i < MAX_NUMS; i++) if (this.numAge[i] > this.numAge[slot]) slot = i;
    this.numX[slot] = x + (Math.random() - 0.5) * W * 0.5; this.numY[slot] = y;
    this.numVx[slot] = (Math.random() - 0.5) * 40;
    this.numAge[slot] = 0; this.numCrit[slot] = crit ? 1 : 0;
    this.numText[slot] = crit ? `${dmg}!` : String(dmg);
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * 6.2832, sp = (120 + Math.random() * 320) * (W / 260);
      this.fx.emit(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.3 + Math.random() * 0.3,
        W * 0.04, W * 0.01, 1, crit ? 0.85 : 0.5, crit ? 0.2 : 0.2, 1, 0.3);
    }
    c.shake(crit ? 9 : 4, 0.15);
    if (this.hp <= 0) this._defeat();
  }

  _defeat() {
    const c = this.ctx, W = c.face.faceWidth || 200, vw = c.viewport.w;
    this.mode = 1; this.defeatT = 0;
    this.xpGain = 100 * this.level;
    c.shake(14, 0.5);
    this.hitFlash = 1;
    for (let i = 0; i < 70; i++) { // bar shatters
      this.fx.emit(this.bx + (Math.random() - 0.5) * this.bw, this.by, (Math.random() - 0.5) * 500, -Math.random() * 400,
        0.8 + Math.random() * 0.6, W * 0.05, W * 0.01, 1, 0.3, 0.25, 1, 1);
    }
    for (let i = 0; i < 160; i++) { // reward confetti
      const k = CONFETTI[i % CONFETTI.length];
      this.fx.emit(Math.random() * vw, -20 - Math.random() * 200, (Math.random() - 0.5) * 120, 80 + Math.random() * 200,
        1.6 + Math.random() * 1.2, 10 + Math.random() * 10, 5, k[0], k[1], k[2], 1, 1);
    }
  }

  update(dt, time) {
    const c = this.ctx, f = c.face, vis = c.faceVisible, { w: vw } = c.viewport;
    this.t = time;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
    this.attackCd -= dt;
    this.comboPop = Math.max(0, this.comboPop - dt * 5);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    if (vis) {
      const W = f.faceWidth;
      const tx = f.top.x + f.up.x * W * 0.6, ty = Math.max(f.top.y + f.up.y * W * 0.6, 100);
      this.bw = Math.min(W * 1.9, vw * 0.9);
      this.bh = Math.max(14, W * 0.1);
      if (!this.placed) { this.bx = tx; this.by = ty; this.placed = true; }
      else { this.bx = damp(this.bx, tx, 14, dt); this.by = damp(this.by, ty, 14, dt); }
      if (this.mode === 0 && c.mouth.justOpened && this.attackCd <= 0) this._attack();
    } else {
      this.placed = false;
    }

    // projectiles
    for (let i = 0; i < MAX_PROJ; i++) {
      if (this.projK[i] >= 1) continue;
      this.projK[i] += dt / 0.28;
      const k = Math.min(this.projK[i], 1);
      this.projX[i] = this.projSx[i] + (this.bx - this.projSx[i]) * k;
      this.projY[i] = this.projSy[i] + (this.by - this.projSy[i]) * k - Math.sin(Math.PI * k) * 40;
      const W = f.faceWidth || 200;
      this.fx.emit(this.projX[i], this.projY[i], (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60,
        0.25, W * 0.05, W * 0.01, 1, 0.75, 0.3, 0.9, 0);
      if (this.projK[i] >= 1) this._hit(this.projDmg[i], this.projCrit[i] === 1, this.bx, this.by);
    }

    for (let i = 0; i < MAX_NUMS; i++) {
      if (this.numAge[i] > 1.1) continue;
      this.numAge[i] += dt;
      this.numY[i] -= 70 * dt; this.numX[i] += this.numVx[i] * dt;
    }

    if (this.chipDelay > 0) this.chipDelay -= dt;
    else this.hpShown = damp(this.hpShown, this.hp, 5, dt);

    if (this.mode === 1) {
      this.defeatT += dt;
      if (this.defeatT > 2.8) { // reset: next boss, full HP
        this.level++; this.hp = this.maxHp; this.hpShown = 0; this.mode = 0; this.chipDelay = 0;
        this.hpShownRefill = true; this._syncHpStr();
      }
    }
    if (this.hpShownRefill) {
      this.hpShown = damp(this.hpShown, this.maxHp, 4, dt);
      if (this.hpShown > this.maxHp - 1) this.hpShownRefill = false;
    }
    this.fx.update(dt);
  }

  render() {
    const c = this.ctx, g = c.g, f = c.face, { w: vw, h: vh } = c.viewport;
    g.save();
    g.textBaseline = 'alphabetic';

    // red vignette on hit
    if (this.hitFlash > 0) {
      g.fillStyle = `rgba(255,40,40,${this.hitFlash * 0.12})`;
      g.fillRect(0, 0, vw, vh);
    }

    if (c.faceVisible && this.placed) {
      const { bx, by, bw, bh } = this;
      const ratio = clamp(this.hp / this.maxHp, 0, 1), chip = clamp(this.hpShown / this.maxHp, 0, 1);
      const px = bx - bw / 2 - 8, py = by - bh / 2 - 28, pw = bw + 16, ph = bh + 48;

      rrect(g, px, py, pw, ph, 12);
      g.fillStyle = 'rgba(10,10,16,0.6)'; g.fill();

      const idx = (this.level - 1) % NAMES.length;
      g.textAlign = 'left';
      g.font = `700 ${Math.max(11, bh * 0.85)}px ${FONT}`;
      g.fillStyle = '#fff';
      g.fillText(`${ICONS[idx]} ${NAMES[idx]}  LV.${this.level}`, px + 10, py + 20);
      g.textAlign = 'right';
      g.font = `600 ${Math.max(10, bh * 0.7)}px ui-monospace, Menlo, monospace`;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillText(this.hpStr, px + pw - 10, py + 20);

      const tx = bx - bw / 2, ty = by - bh / 2 + 6;
      rrect(g, tx, ty, bw, bh, bh / 2); g.fillStyle = '#2a0f14'; g.fill();
      if (chip > 0.005) { rrect(g, tx, ty, Math.max(bh, bw * chip), bh, bh / 2); g.fillStyle = '#ffe9a6'; g.fill(); }
      if (ratio > 0.005) {
        rrect(g, tx, ty, Math.max(bh, bw * ratio), bh, bh / 2);
        g.fillStyle = ratio > 0.3 ? '#ff4d4d' : '#ff9a2e'; g.fill();
        rrect(g, tx + 2, ty + 2, Math.max(bh - 4, bw * ratio - 4), bh * 0.35, bh * 0.17);
        g.fillStyle = 'rgba(255,255,255,0.28)'; g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
      g.beginPath();
      for (let i = 1; i < 10; i++) { g.moveTo(tx + (bw * i) / 10, ty); g.lineTo(tx + (bw * i) / 10, ty + bh); }
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.5;
      rrect(g, tx, ty, bw, bh, bh / 2); g.stroke();

      if (this.hitFlash > 0) {
        g.globalAlpha = this.hitFlash * 0.6;
        rrect(g, tx, ty, bw, bh, bh / 2); g.fillStyle = '#fff'; g.fill();
        g.globalCompositeOperation = 'lighter';
        const r = bw * 0.45;
        g.globalAlpha = this.hitFlash * 0.8;
        g.drawImage(this.glowRed, bx - r, by - r, r * 2, r * 2);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      }

      // projectiles
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < MAX_PROJ; i++) {
        if (this.projK[i] >= 1) continue;
        const r = f.faceWidth * 0.22;
        g.globalAlpha = 0.95;
        g.drawImage(this.glowWhite, this.projX[i] - r, this.projY[i] - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;

      // combo counter
      if (this.combo > 1) {
        const s = 1 + this.comboPop * 0.4, size = (22 + Math.min(this.combo, 10) * 2) * s;
        g.textAlign = 'center';
        g.font = `900 ${size}px ${FONT}`;
        g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,0.7)';
        const x = Math.min(vw - 90, f.center.x + f.faceWidth * 1.0), y = f.center.y;
        g.strokeText(this.comboStr, x, y);
        g.fillStyle = this.combo >= 5 ? '#ffd23c' : '#ffffff';
        g.fillText(this.comboStr, x, y);
      }
    }

    // floating damage numbers
    g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.75)';
    for (let i = 0; i < MAX_NUMS; i++) {
      const a = this.numAge[i];
      if (a > 1.1) continue;
      const pop = a < 0.15 ? 1 + (0.15 - a) * 4 : 1;
      g.globalAlpha = a > 0.7 ? Math.max(0, 1 - (a - 0.7) / 0.4) : 1;
      g.font = `900 ${(this.numCrit[i] ? 38 : 26) * pop}px ${FONT}`;
      g.strokeText(this.numText[i], this.numX[i], this.numY[i]);
      g.fillStyle = this.numCrit[i] ? '#ffd23c' : '#ffffff';
      g.fillText(this.numText[i], this.numX[i], this.numY[i]);
    }
    g.globalAlpha = 1;

    // defeated banner
    if (this.mode === 1) {
      const k = clamp(this.defeatT / 0.5, 0, 1), s = easeOutBack(k);
      const fade = this.defeatT > 2.3 ? clamp(1 - (this.defeatT - 2.3) / 0.5, 0, 1) : 1;
      g.globalAlpha = fade;
      g.textAlign = 'center';
      g.save();
      g.translate(vw / 2, vh * 0.42);
      g.scale(s, s);
      g.font = `900 ${Math.min(56, vw * 0.1)}px ${FONT}`;
      g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.8)';
      g.strokeText('BOSS DEFEATED!', 0, 0);
      g.fillStyle = '#ffd23c'; g.fillText('BOSS DEFEATED!', 0, 0);
      g.font = `800 ${Math.min(28, vw * 0.055)}px ${FONT}`;
      g.strokeText(`+${this.xpGain} XP  ·  🏆`, 0, 44);
      g.fillStyle = '#fff'; g.fillText(`+${this.xpGain} XP  ·  🏆`, 0, 44);
      g.restore();
    }
    g.restore();
  }
}
