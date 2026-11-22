import { LM, TRACKING } from './config.js';
import { OneEuro, clamp } from './filters.js';

const MP_BASE = `${import.meta.env.BASE_URL}mediapipe/face_mesh/`;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.FaceMesh) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () =>
      reject(new Error(`Cannot load ${src}. Did "npm install" finish? (its postinstall copies the MediaPipe assets)`));
    document.head.appendChild(s);
  });
}

/**
 * Wraps MediaPipe FaceMesh. All output coordinates are in SCREEN pixels of the
 * current viewport, already mirrored and "object-fit: cover" corrected, so they
 * line up exactly with the mirrored <video> element.
 */
export class FaceTracker {
  constructor(video) {
    this.video = video;
    this.viewport = { w: window.innerWidth, h: window.innerHeight };
    this.faceMesh = null;
    this.running = false;
    this.busy = false;
    this._lastVideoTime = -1;
    this._loop = this._loop.bind(this);

    const P = () => new OneEuro(TRACKING.position);
    const S = () => new OneEuro(TRACKING.size);
    const A = () => new OneEuro(TRACKING.angle);
    const O = () => new OneEuro(TRACKING.openness);
    this.f = {
      cx: P(), cy: P(), nx: P(), ny: P(), mx: P(), my: P(), ux: P(), uy: P(), lx: P(), ly: P(),
      w: S(), h: S(), yaw: A(), pitch: A(), roll: A(), open: O(),
      elx: P(), ely: P(), erx: P(), ery: P(), tx: P(), ty: P(),
      ew: S(),
      ear: new OneEuro(TRACKING.ear),
      brow: new OneEuro(TRACKING.brow),
    };
    this._earBase = null;
    this._eyesClosed = false;
    this._browBase = null;

    this.state = {
      lastSeen: -1e9,
      center: { x: 0, y: 0 },
      nose: { x: 0, y: 0 },
      mouth: { x: 0, y: 0 },
      upperLip: { x: 0, y: 0 },
      lowerLip: { x: 0, y: 0 },
      faceWidth: 0,
      faceHeight: 0,
      yaw: 0,      // radians, + = face turned toward screen right
      pitch: 0,    // radians, + = looking up
      roll: 0,     // radians, + = head tilted clockwise on screen
      openness: 0, // lip gap / face height
      // eyes (screen-space; "L"/"R" refer to the mirrored screen, not the anatomy)
      eyeL: { x: 0, y: 0 },
      eyeR: { x: 0, y: 0 },
      eyeWidth: 0,     // avg eye width in px
      eyeOpen01: 1,    // 0 = closed, 1 = open
      blinkSeq: 0,     // increments on every blink
      lastBlink: -1e9, // performance.now() of last blink
      brow: 0,         // eyebrow raise 0..1 (relative to your resting baseline)
      top: { x: 0, y: 0 },  // forehead point
      up: { x: 0, y: -1 },  // head "up" unit vector in screen space
      right: { x: 1, y: 0 }, // head "right" unit vector in screen space
      landmarks: new Float32Array(468 * 2), // raw screen-space x,y pairs (debug)
      landmarkCount: 0,
    };
  }

  async init() {
    await loadScript(`${MP_BASE}face_mesh.js`);
    this.faceMesh = new window.FaceMesh({ locateFile: (f) => `${MP_BASE}${f}` });
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    this.faceMesh.onResults((r) => this._onResults(r));
    await this.faceMesh.initialize();
  }

  setViewport(w, h) { this.viewport.w = w; this.viewport.h = h; }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this._loop);
  }
  stop() { this.running = false; }

  isFaceVisible(now) { return now - this.state.lastSeen < TRACKING.faceLostMs; }

  async _loop() {
    if (!this.running) return;
    const v = this.video;
    if (!this.busy && v.readyState >= 2 && v.currentTime !== this._lastVideoTime) {
      this._lastVideoTime = v.currentTime;
      this.busy = true;
      try { await this.faceMesh.send({ image: v }); }
      catch (e) { console.error('FaceMesh error', e); }
      this.busy = false;
    }
    requestAnimationFrame(this._loop);
  }

  _resetFilters() {
    for (const k in this.f) this.f[k].reset();
    this._earBase = null;
    this._eyesClosed = false;
    this._browBase = null;
  }

  _onResults(results) {
    const lm = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
    if (!lm || lm.length < 468) return;

    const now = performance.now();
    const s = this.state;
    const vw = this.video.videoWidth, vh = this.video.videoHeight;
    if (!vw || !vh) return;
    if (now - s.lastSeen > 1000) this._resetFilters();
    s.lastSeen = now;

    const { w: sw, h: sh } = this.viewport;

    // object-fit: cover mapping + horizontal mirror
    const scale = Math.max(sw / vw, sh / vh);
    const ox = (sw - vw * scale) / 2;
    const oy = (sh - vh * scale) / 2;
    const kx = vw * scale, ky = vh * scale;
    const SX = (l) => sw - (ox + l.x * kx);
    const SY = (l) => oy + l.y * ky;

    for (let i = 0; i < 468; i++) {
      s.landmarks[i * 2] = SX(lm[i]);
      s.landmarks[i * 2 + 1] = SY(lm[i]);
    }
    s.landmarkCount = 468;

    const cheekL = lm[LM.CHEEK_L], cheekR = lm[LM.CHEEK_R];
    const fore = lm[LM.FOREHEAD], chin = lm[LM.CHIN];
    const nose = lm[LM.NOSE_TIP];
    const up = lm[LM.UPPER_LIP], lo = lm[LM.LOWER_LIP];
    const eyeA = lm[LM.EYE_L_OUTER], eyeB = lm[LM.EYE_R_OUTER];

    // Face size in px, yaw-invariant (MediaPipe z uses the same scale as x)
    const dxW = (cheekR.x - cheekL.x) * kx;
    const dyW = (cheekR.y - cheekL.y) * ky;
    const dzW = (cheekR.z - cheekL.z) * kx;
    const width = Math.hypot(dxW, dyW, dzW);

    const dxH = (chin.x - fore.x) * kx;
    const dyH = (chin.y - fore.y) * ky;
    const dzH = (chin.z - fore.z) * kx;
    const height = Math.hypot(dxH, dyH, dzH);

    const yaw = -Math.atan2(dzW, dxW);   // mirrored view: + = toward screen right
    const pitch = -Math.atan2(dzH, dyH); // + = looking up
    // after mirroring, eyeB (263) sits on the screen-left of eyeA (33)
    const roll = Math.atan2(SY(eyeA) - SY(eyeB), SX(eyeA) - SX(eyeB));

    const gap = Math.hypot((up.x - lo.x) * kx, (up.y - lo.y) * ky);
    const openness = gap / Math.max(height, 1);

    const f = this.f, t = now;
    s.center.x = f.cx.filter((SX(cheekL) + SX(cheekR)) / 2, t);
    s.center.y = f.cy.filter((SY(fore) + SY(chin)) / 2, t);
    s.nose.x = f.nx.filter(SX(nose), t);
    s.nose.y = f.ny.filter(SY(nose), t);
    s.upperLip.x = f.ux.filter(SX(up), t);
    s.upperLip.y = f.uy.filter(SY(up), t);
    s.lowerLip.x = f.lx.filter(SX(lo), t);
    s.lowerLip.y = f.ly.filter(SY(lo), t);
    s.mouth.x = f.mx.filter((SX(up) + SX(lo)) / 2, t);
    s.mouth.y = f.my.filter((SY(up) + SY(lo)) / 2, t);
    s.faceWidth = f.w.filter(width, t);
    s.faceHeight = f.h.filter(height, t);
    s.yaw = f.yaw.filter(yaw, t);
    s.pitch = f.pitch.filter(pitch, t);
    s.roll = f.roll.filter(roll, t);
    s.openness = f.open.filter(openness, t);

    // ---- eyes -------------------------------------------------------------
    const [rO, rI, rU, rL] = LM.EYE_SCREEN_RIGHT.map((i) => lm[i]);
    const [lO, lI, lU, lL] = LM.EYE_SCREEN_LEFT.map((i) => lm[i]);
    const erx = (SX(rO) + SX(rI) + SX(rU) + SX(rL)) / 4;
    const ery = (SY(rO) + SY(rI) + SY(rU) + SY(rL)) / 4;
    const elx = (SX(lO) + SX(lI) + SX(lU) + SX(lL)) / 4;
    const ely = (SY(lO) + SY(lI) + SY(lU) + SY(lL)) / 4;
    const wR = Math.hypot(SX(rO) - SX(rI), SY(rO) - SY(rI));
    const wL = Math.hypot(SX(lO) - SX(lI), SY(lO) - SY(lI));
    const gR = Math.hypot(SX(rU) - SX(rL), SY(rU) - SY(rL));
    const gL = Math.hypot(SX(lU) - SX(lL), SY(lU) - SY(lL));
    s.eyeR.x = f.erx.filter(erx, t); s.eyeR.y = f.ery.filter(ery, t);
    s.eyeL.x = f.elx.filter(elx, t); s.eyeL.y = f.ely.filter(ely, t);
    s.eyeWidth = f.ew.filter((wR + wL) / 2, t);

    // blink: eye-aspect-ratio drops well below its own running baseline
    const ear = f.ear.filter((gR / Math.max(wR, 1) + gL / Math.max(wL, 1)) / 2, t);
    if (this._earBase === null) this._earBase = ear;
    this._earBase += (ear - this._earBase) * (ear > this._earBase ? 0.25 : 0.004);
    const ratio = ear / Math.max(this._earBase, 1e-4);
    if (!this._eyesClosed && ratio < 0.62) {
      this._eyesClosed = true; s.blinkSeq++; s.lastBlink = now;
    } else if (this._eyesClosed && ratio > 0.8) {
      this._eyesClosed = false;
    }
    s.eyeOpen01 = clamp((ratio - 0.3) / 0.5, 0, 1);

    // ---- eyebrows: distance brow<->upper lid vs. resting baseline ----------
    const bR = lm[LM.BROW_SCREEN_RIGHT], bL = lm[LM.BROW_SCREEN_LEFT];
    const browGap = (Math.hypot(SX(bR) - SX(rU), SY(bR) - SY(rU)) +
                     Math.hypot(SX(bL) - SX(lU), SY(bL) - SY(lU))) / 2;
    const browRatio = browGap / Math.max(height, 1);
    if (this._browBase === null) this._browBase = browRatio;
    else this._browBase += (browRatio - this._browBase) * 0.01;
    s.brow = clamp(f.brow.filter(clamp((browRatio / this._browBase - 1) / 0.22, 0, 1), t), 0, 1);

    // ---- forehead + head axes ------------------------------------------
    s.top.x = f.tx.filter(SX(fore), t);
    s.top.y = f.ty.filter(SY(fore), t);
    const sr = Math.sin(s.roll), cr = Math.cos(s.roll);
    s.up.x = sr; s.up.y = -cr;
    s.right.x = cr; s.right.y = sr;
  }
}
