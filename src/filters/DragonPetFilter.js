import * as THREE from 'three';
import { BaseFilter } from './BaseFilter.js';
import { ParticlePool } from '../core/particles.js';
import { makeGlowTexture, makeGlowCanvas } from '../core/textures.js';
import { jagged, randomOffsets, strokeBolt } from '../core/bolt.js';
import { easeOutBack } from '../core/draw.js';
import { GameEvents } from '../game/events.js';
import { clamp, damp } from '../filters.js';

const TAIL = 8;
const MAX_BOLTS = 6, BSEG = 7, BP = BSEG + 1, MAX_RINGS = 5;
const SHARDS = 8;

/** Forms (= mission stages): 0 egg · 1 wingless hatchling · 2 winged green dragon (the classic Dragon Pet) · 3 legendary red dragon. */
const FORM_SCALE = [1, 0.7, 0.95, 1.55];
const GREEN = { body: [0.247, 0.749, 0.435], belly: [1, 0.69, 0.29], horn: [1, 0.94, 0.63], eye: [1, 0.88, 0.29], eyeE: [1, 0.78, 0], wing: [0.18, 0.56, 0.36] };
const RED = { body: [0.8, 0.1, 0.14], belly: [1, 0.55, 0.24], horn: [1, 0.82, 0.35], eye: [0.85, 0.45, 1], eyeE: [0.7, 0.2, 1], wing: [0.55, 0.08, 0.12] };
/** Fire colors: [core, middle, outer]. Green for the young dragon, purple for the legendary one. */
const FIRE = {
  green: [[0.7, 1, 0.55], [0.2, 0.9, 0.3], [0.05, 0.55, 0.15]],
  purple: [[0.92, 0.65, 1], [0.62, 0.2, 1], [0.32, 0.05, 0.62]],
};
const MAGIC_GREEN = [[0.4, 1, 0.5], [0.7, 1, 0.6], [0.2, 0.85, 0.4]];
const MAGIC_EPIC = [[0.75, 0.35, 1], [1, 0.25, 0.2], [1, 0.82, 0.3]];
/** Animation timelines in seconds: total duration and the moment of the "burst" (the actual transformation). */
const ANIM = { hatch: { dur: 3.4, burstAt: 2.0 }, wings: { dur: 2.6, burstAt: 0.9 }, legend: { dur: 4.2, burstAt: 1.5 } };
const KIND_OF_FORM = ['hatch', 'wings', 'legend']; // animation played when leaving form 0, 1, 2
const BOLT_STYLE = ['rgba(170,90,255,0.18)', 'rgba(200,140,255,0.6)', 'rgba(250,240,255,0.95)'];
const RING_STYLE = ['rgba(90,255,150,', 'rgba(190,110,255,', 'rgba(255,90,80,'];
const FLASH_STYLE = ['rgb(120,255,170)', 'rgb(200,140,255)', 'rgb(255,255,255)'];

const lerp = (a, b, t) => a + (b - a) * t;
const phong = (color, o = {}) => new THREE.MeshPhongMaterial({ color, shininess: 60, specular: 0x444444, ...o });

/**
 * Dragon Pet - "Dragon Evolution" mission.
 *
 * The mission stage (number of Minecraft riddles solved, see game/missions.js) decides what you see:
 *   0  a green dragon egg on your shoulder
 *   1  hatchling: small green dragon, NO wings, follows you, breathes green fire
 *   2  winged green dragon (the original Dragon Pet): bigger, big wings, light green magic particles
 *   3  legendary dragon: much bigger, red, purple fire, epic particles
 * Each time a riddle is solved the matching animation plays (hatching, wings, legendary transformation).
 * The form is derived from saved progress, so it is restored (without animation) in the next session.
 */
export class DragonPetFilter extends BaseFilter {
  static meta = {
    id: 'dragon-pet',
    name: 'Dragon Pet',
    icon: '🐉',
    description: 'Dragon Evolution: cova un uovo di drago, risolvi i rebus di Minecraft e fallo evolvere!',
    usesOverlay: true,
  };
  static settings = [
    { key: 'dragonSize', label: 'Dragon Size', type: 'range', min: 0.5, max: 2, step: 0.05, default: 1, digits: 2 },
    { key: 'fireIntensity', label: 'Fire Intensity', type: 'range', min: 0.3, max: 2, step: 0.05, default: 1, digits: 2 },
  ];

  initialize() {
    super.initialize();
    const c = this.ctx;
    const tex = this.acquire('tex:glow', () => makeGlowTexture(64));
    this.fx = this.track(new ParticlePool(this.root, c.renderer, tex, { max: 900, gravity: -300, drag: 1.2 }));
    this.fx.setPixelRatio(c.viewport.dpr);
    this.glows = [
      this.acquire('glow2d:dg-green', () => makeGlowCanvas(128, [80, 255, 140])),
      this.acquire('glow2d:dg-purple', () => makeGlowCanvas(128, [170, 90, 255])),
      this.acquire('glow2d:dg-red', () => makeGlowCanvas(128, [255, 70, 60])),
    ];

    this.dragon = new THREE.Group();
    this.model = new THREE.Group();
    this.dragon.add(this.model);
    this.eggRoot = new THREE.Group();
    this.root.add(this.dragon, this.eggRoot);
    this._build();
    this._buildEgg();

    // --- evolution state
    this.form = 0;            // form currently shown
    this.targetForm = 0;      // form the mission asks for
    this.synced = false;      // first stage read = restore without animation
    this.anim = null;         // { kind, t, burst }
    this.wingScale = 0; this.spikeScale = 0; this.lookMix = 0; this.glow = 0;
    this.dragonAppear = 0;    // 0..1 pop-in after hatching
    this.levitate = 0;        // 0..1 hover during the legendary charge
    this.eggShake = 0;
    this.shardsActive = false; this.shardT = 0;
    this.sc = { v: FORM_SCALE[0], vel: 0, target: FORM_SCALE[0] }; // spring: gives growth an overshoot

    // --- behaviour state
    this.ready = false;
    this.px = 0; this.py = 0; this.size = 1; this.vx = 0; this.vy = 0;
    this.side = 1;
    this.state = 'perch'; this.stateT = 0; this.nextFly = 5 + Math.random() * 5;
    this.angle = 0; this.faceDir = -1;
    this.flap = 0; this.t = 0;
    this.magicAcc = 0; this.fireAcc = 0; this.fxAcc = 0; this.boltLevel = 0; this.shakeT = 0;
    this.tmp = new THREE.Vector3();
    this._tgt = { x: 0, y: 0 };

    // --- overlay effects
    this.flashA = 0; this.flashCol = 0;
    this.ringAge = new Float32Array(MAX_RINGS).fill(9);
    this.ringX = new Float32Array(MAX_RINGS); this.ringY = new Float32Array(MAX_RINGS);
    this.ringCol = new Uint8Array(MAX_RINGS);
    this.boltPts = new Float32Array(MAX_BOLTS * BP * 2);
    this.boltOff = new Float32Array(MAX_BOLTS * BP);
    this.boltAng = new Float32Array(MAX_BOLTS); this.boltLen = new Float32Array(MAX_BOLTS);
    this.boltAge = new Float32Array(MAX_BOLTS).fill(9); this.boltTtl = new Float32Array(MAX_BOLTS);

    this._look();
    this._applyVisibility();
    this._syncStage();
    this.listen(GameEvents.GAME_STATE, () => this._syncStage());
    this.listen(GameEvents.MISSION_START, () => this._syncStage());
    this.listen(GameEvents.GAME_LEVEL_COMPLETE, () => this._syncStage());
    this.listen(GameEvents.GAME_COMPLETE, () => this._syncStage());
  }

  // ------------------------------------------------------------------ model
  _build() {
    this.mats = {
      body: phong(0x3fbf6f), belly: phong(0xffb04a), horn: phong(0xfff0a0, { shininess: 90 }),
      eye: new THREE.MeshPhongMaterial({ color: 0xffe14a, emissive: 0xffc800, emissiveIntensity: 0.9 }),
      wing: phong(0x2e8f5c, { side: THREE.DoubleSide, transparent: true, opacity: 0.88 }),
      spike: phong(0xffd25a, { shininess: 100 }),
    };
    const { body, belly, horn, eye, wing, spike } = this.mats;
    const dark = phong(0x1b1b1b);

    const add = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      parent.add(m);
      return m;
    };
    const sph = new THREE.SphereGeometry(1, 20, 14);

    add(this.model, sph, body, 0, 0, 0, 30, 20, 20);          // torso
    add(this.model, sph, belly, 4, -8, 0, 24, 11, 17);        // belly
    add(this.model, sph, body, 28, 10, 0, 13, 15, 11);        // neck
    for (const z of [8, -8]) add(this.model, sph, body, 10, -18, z, 6, 7, 5); // feet

    // head = its own group (pivot on the neck) so it can look around independently
    this.head = new THREE.Group();
    this.head.position.set(36, 14, 0);
    this.model.add(this.head);
    add(this.head, sph, body, 6, 4, 0, 15, 12, 12);           // skull
    const snout = add(this.head, new THREE.ConeGeometry(6, 15, 12), body, 19, 2, 0);
    snout.rotation.z = -Math.PI / 2;
    add(this.head, sph, dark, 25, 6, 0, 1.4, 1.4, 1.4);       // nostril
    add(this.head, sph, eye, 10, 10, 8, 3, 3, 3);
    add(this.head, sph, eye, 10, 10, -8, 3, 3, 3);
    for (const z of [5, -5]) {
      const hn = add(this.head, new THREE.ConeGeometry(3, 13, 8), horn, 0, 17, z);
      hn.rotation.z = 0.6;
    }
    this.mouthAnchor = new THREE.Object3D();
    this.mouthAnchor.position.set(28, 2, 0);
    this.head.add(this.mouthAnchor);

    // wings: flat fan polygon, pivot at the back (only from form 2)
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      0, 0, 0, -4, 30, 0, -22, 48, 0, -30, 26, 0, -48, 28, 0, -34, 2, 0,
    ]), 3));
    wg.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
    wg.computeVertexNormals();
    this.wings = [];
    for (const z of [14, -14]) {
      const pivot = new THREE.Group();
      pivot.position.set(-4, 10, z);
      pivot.add(new THREE.Mesh(wg, wing));
      this.model.add(pivot);
      this.wings.push({ pivot, sign: z > 0 ? 1 : -1 });
    }

    // spikes along the spine (legendary only)
    this.spikes = new THREE.Group();
    const spikeGeo = new THREE.ConeGeometry(4, 15, 8);
    [[20, 19], [10, 22], [0, 23], [-10, 21], [-20, 17]].forEach(([x, y], i) => {
      const sp = add(this.spikes, spikeGeo, spike, x, y, 0);
      sp.scale.set(1, 1 - i * 0.08, 1);
    });
    this.model.add(this.spikes);

    // tail: chain of spheres animated with a travelling wave
    const tailGeo = new THREE.SphereGeometry(1, 14, 10);
    this.tail = [];
    for (let i = 0; i < TAIL; i++) {
      const r = 10 - i * 1.1;
      this.tail.push(add(this.model, tailGeo, body, -28 - i * 9, -4, 0, r, r, r));
    }
    const tip = add(this.model, new THREE.ConeGeometry(4, 12, 10), horn, -28 - TAIL * 9, -4, 0);
    tip.rotation.z = Math.PI / 2;
    this.tailTip = tip;
  }

  /** The egg is split into 8 shell shards that assemble into one egg and fly apart when it hatches. */
  _buildEgg() {
    this.shellMat = phong(0x2f9e57, { shininess: 90, specular: 0x88ffaa, side: THREE.DoubleSide });
    const spotMat = phong(0x16572f);
    const RX = 14, RY = 19;
    this.shards = [];
    for (let pi = 0; pi < 4; pi++) {
      for (let ti = 0; ti < 2; ti++) {
        const geo = new THREE.SphereGeometry(1, 8, 6, (pi * Math.PI) / 2, Math.PI / 2, (ti * Math.PI) / 2, Math.PI / 2);
        const pivot = new THREE.Group();
        const mesh = new THREE.Mesh(geo, this.shellMat);
        mesh.scale.set(RX, RY, RX);
        pivot.add(mesh);
        // outward direction of this patch (three.js sphere parametrization)
        const phi = (pi + 0.5) * (Math.PI / 2), theta = ti ? 0.75 * Math.PI : 0.25 * Math.PI;
        const dir = [-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)];
        const spot = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), spotMat);
        spot.scale.set(3, 3.4, 3);
        spot.position.set(dir[0] * RX * 0.97, dir[1] * RY * 0.97, dir[2] * RX * 0.97);
        pivot.add(spot);
        this.eggRoot.add(pivot);
        this.shards.push({ pivot, dir, spin: [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6] });
      }
    }
  }

  // ------------------------------------------------------------------ evolution
  /** Read the mission stage. First read = restore silently; later increases = play the evolution animation. */
  _syncStage() {
    const st = this.ctx.games && this.ctx.games.getStage();
    if (!st || st.missionId !== 'dragon-evolution') return;
    const idx = clamp(st.index, 0, 3);
    if (!this.synced) { this.synced = true; this._snapTo(idx); return; }
    if (idx < this.targetForm) { this._snapTo(idx); return; } // mission restarted
    this.targetForm = idx;
  }

  _snapTo(idx) {
    this.form = idx; this.targetForm = idx; this.anim = null;
    this.shardsActive = false; this.shardT = 0;
    this.wingScale = idx >= 2 ? 1 : 0;
    this.spikeScale = idx >= 3 ? 1 : 0;
    this.lookMix = idx >= 3 ? 1 : 0;
    this.dragonAppear = idx >= 1 ? 1 : 0;
    this.glow = 0; this.levitate = 0; this.eggShake = 0; this.boltLevel = 0;
    this.sc.v = this.sc.target = FORM_SCALE[idx]; this.sc.vel = 0;
    this._resetShards();
    this._look();
    this._applyVisibility();
  }

  _resetShards() {
    for (const s of this.shards) { s.pivot.position.set(0, 0, 0); s.pivot.rotation.set(0, 0, 0); s.pivot.scale.setScalar(1); }
  }

  _applyVisibility() {
    this.eggRoot.visible = this.form === 0 || this.shardsActive;
    this.dragon.visible = this.form >= 1 && this.dragonAppear > 0.01;
    for (const w of this.wings) w.pivot.visible = this.wingScale > 0.01;
    this.spikes.visible = this.spikeScale > 0.01;
  }

  /** Colors: green -> red by lookMix, plus a white-hot glow while transforming. */
  _look() {
    const m = this.lookMix, gl = this.glow, M = this.mats;
    const mix = (key, mat) => {
      const r = lerp(GREEN[key][0], RED[key][0], m), g = lerp(GREEN[key][1], RED[key][1], m), b = lerp(GREEN[key][2], RED[key][2], m);
      mat.color.setRGB(r, g, b);
      return [r, g, b];
    };
    const [br, bg, bb] = mix('body', M.body);
    mix('belly', M.belly); mix('horn', M.horn); mix('wing', M.wing);
    M.body.emissive.setRGB(Math.min(1, br + 0.4) * gl, Math.min(1, bg + 0.4) * gl, Math.min(1, bb + 0.4) * gl);
    M.belly.emissive.setRGB(0.5 * gl, 0.35 * gl, 0.15 * gl);
    M.wing.emissive.setRGB(0.3 * gl, 0.5 * gl, 0.3 * gl);
    M.eye.color.setRGB(lerp(GREEN.eye[0], RED.eye[0], m), lerp(GREEN.eye[1], RED.eye[1], m), lerp(GREEN.eye[2], RED.eye[2], m));
    M.eye.emissive.setRGB(lerp(GREEN.eyeE[0], RED.eyeE[0], m), lerp(GREEN.eyeE[1], RED.eyeE[1], m), lerp(GREEN.eyeE[2], RED.eyeE[2], m));
    this.shellMat.emissive.setRGB(0.15 * gl, 0.8 * gl, 0.3 * gl);
  }

  _startAnim() {
    this.anim = { kind: KIND_OF_FORM[this.form], t: 0, burst: false };
    this.state = 'perch'; this.stateT = 0;
  }

  _flash(a, col) { this.flashA = Math.max(this.flashA, a); this.flashCol = col; }
  _ring(col, x, y) {
    let slot = 0;
    for (let i = 0; i < MAX_RINGS; i++) if (this.ringAge[i] > this.ringAge[slot]) slot = i;
    this.ringAge[slot] = 0; this.ringX[slot] = x; this.ringY[slot] = y; this.ringCol[slot] = col;
  }

  _burst(x, y, n, cols, W, speed = 1, gm = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832, sp = (180 + Math.random() * 520) * speed * (W / 260);
      const k = cols[(Math.random() * cols.length) | 0];
      this.fx.emit(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.6 + Math.random() * 0.9,
        W * (0.03 + Math.random() * 0.045), W * 0.008, k[0], k[1], k[2], 1, gm);
    }
  }

  /** Particles pulled INTO a point (charging effect). */
  _vortex(x, y, n, cols, W) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832, r = W * (0.7 + Math.random() * 0.5), k = cols[(Math.random() * cols.length) | 0];
      const tang = 1.4;
      this.fx.emit(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8,
        (-Math.cos(a) * r + -Math.sin(a) * r * tang) / 0.7, (-Math.sin(a) * r * 0.8 + Math.cos(a) * r * tang) / 0.7,
        0.55, W * 0.04, W * 0.01, k[0], k[1], k[2], 0.9, 0);
    }
  }

  /** Advance the active animation (called with the dragon's screen position). */
  _updateAnim(dt, x, y, W) {
    const a = this.anim, cfg = ANIM[a.kind], c = this.ctx;
    a.t += dt;
    const p = clamp(a.t / cfg.burstAt, 0, 1);
    const q = a.t - cfg.burstAt;

    if (a.kind === 'hatch') {
      if (!a.burst) {
        this.glow = p * p; this.eggShake = p;
        this.fxAcc += dt * (8 + 60 * p);
        while (this.fxAcc >= 1) {
          this.fxAcc -= 1;
          const ang = Math.random() * 6.2832;
          this.fx.emit(x + Math.cos(ang) * W * 0.1, y + Math.sin(ang) * W * 0.12, Math.cos(ang) * 60, Math.sin(ang) * 60 - 40,
            0.5, W * 0.03, W * 0.008, 0.6, 1, 0.65, 0.9, 0);
        }
        if (a.t >= cfg.burstAt) {
          a.burst = true; this.form = 1; this.dragonAppear = 0; this.shardsActive = true; this.shardT = 0; this.eggShake = 0;
          this.sc.v = this.sc.target = FORM_SCALE[1]; this.sc.vel = 0;
          this._burst(x, y, 110, [[0.8, 1, 0.75], [0.5, 0.95, 0.6], [1, 1, 0.9]], W, 1, 0.4);
          this._burst(x, y, 80, MAGIC_GREEN, W, 1.3);
          this._flash(0.9, 0); this._ring(0, x, y); c.shake(8, 0.4);
        }
      } else {
        this.dragonAppear = easeOutBack(clamp(q / 0.9, 0, 1));
        this.glow = Math.max(0, 1 - q / 0.6);
        this.shardT = q;
        if (q > 1.5) this.shardsActive = false;
      }
    } else if (a.kind === 'wings') {
      if (!a.burst) {
        this.glow = p; this.fxAcc += dt * 70;
        if (this.fxAcc >= 1) { this._vortex(x, y, this.fxAcc | 0, MAGIC_GREEN, W); this.fxAcc %= 1; }
        if (a.t >= cfg.burstAt) {
          a.burst = true; this.form = 2; this.wingScale = 0; this.sc.target = FORM_SCALE[2];
          this._burst(x, y, 130, MAGIC_GREEN, W, 1.1);
          this._flash(0.6, 0); this._ring(0, x, y); c.shake(6, 0.3);
        }
      } else {
        this.wingScale = easeOutBack(clamp(q / 0.8, 0, 1));
        this.glow = Math.max(0, 1 - q / 0.8);
      }
    } else { // legend
      if (!a.burst) {
        this.glow = p; this.levitate = p; this.lookMix = 0.4 * p; this.boltLevel = p;
        this.fxAcc += dt * 110;
        if (this.fxAcc >= 1) { this._vortex(x, y, this.fxAcc | 0, MAGIC_EPIC, W); this.fxAcc %= 1; }
        this.shakeT -= dt;
        if (this.shakeT <= 0) { c.shake(3 + 3 * p, 0.12); this.shakeT = 0.25; }
        if (a.t >= cfg.burstAt) {
          a.burst = true; this.form = 3; this.spikeScale = 0; this.sc.target = FORM_SCALE[3];
          this._burst(x, y, 240, MAGIC_EPIC, W, 1.4);
          this._burst(x, y, 60, [[1, 1, 1]], W, 1.8);
          this._flash(1, 1); this._ring(1, x, y); this._ring(2, x, y); c.shake(18, 0.9);
        }
      } else {
        this.lookMix = clamp(0.4 + (q / 1.2) * 0.6, 0, 1);
        this.glow = Math.max(0, 1 - q / 1.2);
        this.spikeScale = easeOutBack(clamp(q / 0.8, 0, 1));
        this.levitate = Math.max(0, 1 - q / 1.4);
        this.boltLevel = Math.max(0.18, 1 - q / 1.4);
        if (q > 0.5 && !a.ring2) { a.ring2 = true; this._ring(1, x, y); }
      }
    }
    if (a.t >= cfg.dur) { // finished
      this.anim = null; this.glow = 0; this.levitate = 0; this.eggShake = 0;
      this.wingScale = this.form >= 2 ? 1 : this.wingScale;
      this.dragonAppear = this.form >= 1 ? 1 : 0;
      this.lookMix = this.form >= 3 ? 1 : this.lookMix;
      this.spikeScale = this.form >= 3 ? 1 : this.spikeScale;
      this.boltLevel = this.form >= 3 ? 0.18 : 0;
      this.shardsActive = false; this._resetShards();
    }
  }

  // ------------------------------------------------------------------ behaviour
  _shoulderTarget(f, vh, out) {
    const W = f.faceWidth;
    out.x = f.center.x + f.right.x * this.side * W * 1.0 - f.up.x * W * 1.05;
    out.y = f.center.y + f.right.y * this.side * W * 1.0 - f.up.y * W * 1.05 - W * 0.2 * this.size;
    out.y = Math.min(out.y, vh - this.ctx.uiInsets.bottom - 40);
  }

  update(dt, time) {
    const c = this.ctx, f = c.face, { w: vw, h: vh } = c.viewport;
    this.t = time;
    if (!c.faceVisible) {                  // the evolution timeline waits until you are visible again
      this.root.visible = false;
      this.ready = false;
      this.fx.update(dt);
      return;
    }
    this.root.visible = true;
    const W = f.faceWidth, k = W / 260;

    if (!this.ready) this.side = f.center.x < vw * 0.5 ? 1 : -1;
    else if (this.side === 1 && f.center.x > vw * 0.65) this.side = -1;
    else if (this.side === -1 && f.center.x < vw * 0.35) this.side = 1;

    if (!this.anim && this.targetForm > this.form) this._startAnim();

    // ---- state machine: only a winged dragon flies, and never while evolving
    const canFly = this.form >= 2 && !this.anim;
    this.stateT += dt;
    if (!canFly) { if (this.state === 'fly') { this.state = 'perch'; this.stateT = 0; } }
    else if (this.state === 'perch' && this.stateT > this.nextFly) {
      this.state = 'fly'; this.stateT = 0; this.angle = this.side > 0 ? 0 : Math.PI;
    } else if (this.state === 'fly' && this.stateT > (this.form === 3 ? 5.2 : 4.7)) {
      this.state = 'perch'; this.stateT = 0;
      this.nextFly = this.form === 3 ? 3.5 + Math.random() * 3 : 6 + Math.random() * 6;
    }

    let tx, ty;
    if (this.state === 'fly') {
      this.angle += dt * 1.7;
      const a = this.angle;
      tx = f.center.x + Math.cos(a) * W * 1.55;
      ty = f.center.y + Math.sin(a) * W * 0.7 + Math.sin(2 * a) * W * 0.15 - W * 0.2;
    } else {
      this._shoulderTarget(f, vh, this._tgt);
      tx = this._tgt.x; ty = this._tgt.y + Math.sin(time * 2.2) * W * 0.01;
    }
    ty -= this.levitate * W * 0.2;

    const lam = this.state === 'fly' ? 4 : 8;
    const ox = this.px, oy = this.py;
    const sizeNow = W * 0.0043 * this.settings.dragonSize;
    if (!this.ready) { this.px = tx; this.py = ty; this.size = sizeNow; this.ready = true; }
    else {
      this.px = damp(this.px, tx, lam, dt);
      this.py = damp(this.py, ty, lam, dt);
      this.size = damp(this.size, sizeNow, 5, dt);
    }
    this.vx = (this.px - ox) / Math.max(dt, 1e-3);
    this.vy = (this.py - oy) / Math.max(dt, 1e-3);

    if (this.anim) this._updateAnim(dt, this.px, this.py, W);

    // growth spring (overshoots a little: "pop")
    const sc = this.sc;
    sc.vel += ((sc.target - sc.v) * 70 - sc.vel * 8) * dt;
    sc.v += sc.vel * dt;

    this._look();
    this._applyVisibility();
    this._poseEgg(time);
    this._poseDragon(dt, time, W, k);
    this.fx.update(dt);
  }

  _poseEgg(time) {
    if (!this.eggRoot.visible) return;
    const e = this.eggRoot;
    e.position.set(this.px, -this.py, 0);
    const pulse = 1 + this.glow * 0.06 * Math.sin(time * 30);
    e.scale.setScalar(this.size * 1.2 * pulse);
    e.rotation.z = Math.sin(time * 2.3) * 0.05 + this.eggShake * (Math.sin(time * 38) * 0.28 + Math.sin(time * 23) * 0.16);
    if (this.shardsActive) {
      const t = this.shardT, life = clamp(1 - t / 1.4, 0, 1);
      this.shards.forEach((s, i) => {
        const dist = t * (110 + (i % 2) * 50);
        s.pivot.position.set(s.dir[0] * dist, s.dir[1] * dist + 70 * t - 130 * t * t, s.dir[2] * dist);
        s.pivot.rotation.set(s.spin[0] * t, 0, s.spin[1] * t);
        s.pivot.scale.setScalar(Math.max(0.001, life));
      });
    }
  }

  _poseDragon(dt, time, W, k) {
    const c = this.ctx, f = c.face, mouth = c.mouth;
    const dragonSize = this.size * this.sc.v;
    const flying = this.state === 'fly';

    // facing: look at the user when perched, along the path when flying, outward when breathing
    const breathing = mouth.open && this.form >= 1 && this.dragonAppear > 0.85 && (!this.anim || this.anim.burst);
    let dir = this.faceDir;
    if (breathing) dir = this.state === 'perch' ? this.side : (Math.abs(this.vx) > 20 ? Math.sign(this.vx) : dir);
    else if (flying) { if (Math.abs(this.vx) > 25) dir = Math.sign(this.vx); }
    else dir = f.center.x < this.px ? -1 : 1;
    this.faceDir = dir;

    // wings (only exist from form 2). The legendary dragon's are bigger.
    this.flap += dt * (flying ? 14 : 2.2);
    const amp = flying ? 0.9 : 0.12;
    const wscale = this.wingScale * (this.form >= 3 ? 1.3 : 1);
    for (const w of this.wings) {
      w.pivot.rotation.x = w.sign * ((flying ? 0.35 : 0.9) + Math.sin(this.flap) * amp);
      w.pivot.scale.setScalar(Math.max(0.001, wscale));
    }
    this.spikes.scale.setScalar(Math.max(0.001, this.spikeScale));

    // tail wag (livelier for the hatchling), head and body movement
    const wag = this.form === 1 ? 1.8 : 1;
    for (let i = 0; i < TAIL; i++) {
      this.tail[i].position.y = -4 + Math.sin(time * 3 * wag - i * 0.6) * i * 1.6 * wag;
      this.tail[i].position.z = Math.cos(time * 2.2 * wag - i * 0.5) * i * 0.8 * wag;
    }
    this.tailTip.position.y = -4 + Math.sin(time * 3 * wag - TAIL * 0.6) * TAIL * 1.6 * wag;
    this.head.rotation.y = Math.sin(time * 0.9) * 0.28;
    this.head.rotation.z = Math.sin(time * 1.7) * 0.09 + (breathing ? 0.28 : 0) + (this.form === 1 ? Math.sin(time * 3.1) * 0.06 : 0);
    this.model.position.y = Math.sin(time * 2.4) * 1.6;
    const jitter = this.anim && !this.anim.burst ? (Math.random() - 0.5) * 0.12 * this.glow : 0;

    this.dragon.position.set(this.px, -this.py, 0);
    this.dragon.scale.setScalar(Math.max(0.001, dragonSize * this.dragonAppear));
    this.model.rotation.y = damp(this.model.rotation.y, dir > 0 ? 0 : Math.PI, 7, dt);
    this.model.rotation.z = clamp(-this.vy * 0.0006, -0.35, 0.35) * (dir > 0 ? 1 : -1) + Math.sin(time * 2.2) * 0.03 + jitter;
    this.dragon.updateMatrixWorld(true);

    if (this.form < 1 || this.dragonAppear < 0.5) return;
    const legendary = this.form === 3;

    // ambient magic: none for the hatchling, light green for the winged dragon, epic for the legendary one
    if (this.form >= 2 && !(this.anim && !this.anim.burst)) {
      this.magicAcc += (legendary ? (flying ? 95 : 55) : (flying ? 30 : 14)) * dt;
      const cols = legendary ? MAGIC_EPIC : MAGIC_GREEN;
      while (this.magicAcc >= 1) {
        this.magicAcc -= 1;
        const col = cols[(Math.random() * cols.length) | 0];
        const spread = legendary ? 1.6 : 1;
        this.fx.emit(this.px + (Math.random() - 0.5) * 60 * dragonSize * spread, this.py + (Math.random() - 0.5) * 40 * dragonSize * spread,
          (Math.random() - 0.5) * 40 * k, (Math.random() - 0.5) * 40 * k - (legendary ? 40 * k : 0),
          0.8 + Math.random() * 0.8, (legendary ? 12 : 7 + Math.random() * 5) * dragonSize * 1.3, 2, col[0], col[1], col[2], legendary ? 1 : 0.8, 0.25);
      }
    }

    // fire breath: green, purple for the legendary dragon
    if (breathing) {
      this.mouthAnchor.getWorldPosition(this.tmp);
      const mx = this.tmp.x, my = -this.tmp.y;
      const pal = legendary ? FIRE.purple : FIRE.green, big = legendary ? 1.5 : 1;
      this.fireAcc += 140 * this.settings.fireIntensity * mouth.level * (legendary ? 1.3 : 1) * dt;
      while (this.fireAcc >= 1) {
        this.fireAcc -= 1;
        const sp = (280 + Math.random() * 240) * k * (legendary ? 1.2 : 1);
        const m = Math.random(), col = m < 0.35 ? pal[0] : m < 0.75 ? pal[1] : pal[2];
        this.fx.emit(mx + (Math.random() - 0.5) * 6, my + (Math.random() - 0.5) * 6,
          dir * sp + (Math.random() - 0.5) * 60 * k, (Math.random() - 0.5) * 80 * k - 20 * k,
          0.35 + Math.random() * 0.35, W * 0.04 * big, W * 0.2 * big, col[0], col[1], col[2], 0.9, 0.8);
      }
    } else this.fireAcc = 0;

    // legendary: embers trail
    if (legendary && flying && Math.random() < dt * 60) {
      this.fx.emit(this.px, this.py, (Math.random() - 0.5) * 50 * k, -(30 + Math.random() * 60) * k, 1, W * 0.025, W * 0.005, 1, 0.45, 0.1, 0.9, 0.3);
    }
  }

  // ------------------------------------------------------------------ overlay
  render() {
    const c = this.ctx, g = c.g, { w: vw, h: vh } = c.viewport, dt = 1 / 60;
    this.flashA = Math.max(0, this.flashA - dt * 2.2);
    for (let i = 0; i < MAX_RINGS; i++) this.ringAge[i] += dt;
    if (!this.ready || !c.faceVisible) return;

    const W = c.face.faceWidth, x = this.px, y = this.py, ds = this.size * this.sc.v;
    g.save();
    g.globalCompositeOperation = 'lighter';

    // glow while transforming; permanent aura for the legendary dragon
    const gcol = this.anim && this.anim.kind === 'legend' ? (this.glow > 0.5 ? 1 : 2) : 0;
    if (this.glow > 0.01) {
      const r = ds * 120 * (1 + this.glow * 0.5);
      g.globalAlpha = Math.min(1, this.glow * 0.85);
      g.drawImage(this.glows[gcol], x - r, y - r, r * 2, r * 2);
    }
    if (this.form === 3) {
      const r = ds * 135, pulse = 0.22 + 0.07 * Math.sin(this.t * 3);
      g.globalAlpha = pulse * Math.min(1, this.dragonAppear);
      g.drawImage(this.glows[2], x - r, y - r, r * 2, r * 2);
      g.globalAlpha = pulse * 0.7;
      g.drawImage(this.glows[1], x - r * 0.8, y - r * 1.1, r * 1.6, r * 1.6);
    }

    // lightning around the legendary dragon (charging, transformation and a faint idle)
    if (this.boltLevel > 0.01) {
      g.lineCap = 'round'; g.lineJoin = 'round';
      const n = Math.round(this.boltLevel * MAX_BOLTS);
      for (let i = 0; i < MAX_BOLTS; i++) {
        if (i >= n) { this.boltAge[i] = 9; continue; }
        this.boltAge[i] += dt;
        if (this.boltAge[i] >= this.boltTtl[i]) {
          this.boltAge[i] = 0; this.boltTtl[i] = 0.05 + Math.random() * 0.09;
          this.boltAng[i] = Math.random() * 6.2832; this.boltLen[i] = W * (0.5 + Math.random() * 0.9);
          randomOffsets(this.boltOff, i * BP, BP);
        }
        const a = this.boltAng[i], l = this.boltLen[i];
        jagged(this.boltPts, i * BP, this.boltOff, i * BP, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, BSEG, l * 0.18);
        g.globalAlpha = 0.5 + 0.5 * Math.random();
        strokeBolt(g, this.boltPts, i * BP, BP, Math.max(0.8, W * 0.004), BOLT_STYLE);
      }
    }

    // shockwave rings
    for (let i = 0; i < MAX_RINGS; i++) {
      const a = this.ringAge[i];
      if (a > 0.9) continue;
      const kk = a / 0.9;
      g.globalAlpha = 1;
      g.strokeStyle = `${RING_STYLE[this.ringCol[i]]}${(1 - kk).toFixed(2)})`;
      g.lineWidth = 2 + 10 * (1 - kk);
      g.beginPath();
      g.arc(this.ringX[i], this.ringY[i], W * 0.2 + kk * Math.hypot(vw, vh) * 0.35, 0, 6.2832);
      g.stroke();
    }

    if (this.flashA > 0.01) {
      g.globalAlpha = this.flashA * 0.55;
      g.fillStyle = FLASH_STYLE[this.flashCol];
      g.fillRect(0, 0, vw, vh);
    }
    g.restore();
  }

  debugDraw(dbg) {
    if (!this.ready) return;
    dbg.dot(this.px, this.py, 5, '#7dff7d');
    dbg.label(`${['egg', 'hatchling', 'winged', 'legendary'][this.form]} · ${this.state}${this.anim ? ' · ' + this.anim.kind : ''}`, this.px, this.py, '#7dff7d');
  }
}
