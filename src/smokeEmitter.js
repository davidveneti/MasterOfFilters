import * as THREE from 'three';
import { SMOKE } from './config.js';
import { damp } from './filters.js';

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aRot;
  attribute float aTone;
  uniform float uPixelRatio;
  uniform float uMaxSize;
  varying float vAlpha;
  varying float vRot;
  varying float vTone;
  void main() {
    vAlpha = aAlpha; vRot = aRot; vTone = aTone;
    gl_PointSize = min(aSize * uPixelRatio, uMaxSize);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  varying float vAlpha;
  varying float vRot;
  varying float vTone;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vRot), co = cos(vRot);
    vec2 r = vec2(co * c.x - s * c.y, s * c.x + co * c.y) + 0.5;
    float a = texture2D(uMap, r).a * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vec3(vTone) * uTint, a);
  }
`;

/** Soft, puffy cloud sprite (alpha only) drawn from overlapping radial gradients. */
function makeSmokeTexture() {
  const s = SMOKE.textureSize;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const blobs = [
    [0.5, 0.5, 0.42, 1.0], [0.38, 0.45, 0.28, 0.7], [0.62, 0.42, 0.26, 0.7],
    [0.5, 0.62, 0.3, 0.6], [0.45, 0.35, 0.22, 0.5],
  ];
  for (const [x, y, r, a] of blobs) {
    const gr = g.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
    gr.addColorStop(0, `rgba(255,255,255,${a * 0.55})`);
    gr.addColorStop(0.5, `rgba(255,255,255,${a * 0.22})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/**
 * Pooled smoke particles (struct-of-arrays). Everything is preallocated; the
 * render loop never allocates. Particles live in SCREEN space (y down) and are
 * written to the GPU buffer with world y = -screenY.
 */
export class SmokeEmitter {
  constructor(scene, renderer) {
    const n = (this.max = SMOKE.maxParticles);
    this.px = new Float32Array(n); this.py = new Float32Array(n);
    this.vx = new Float32Array(n); this.vy = new Float32Array(n);
    this.age = new Float32Array(n); this.life = new Float32Array(n);
    this.size0 = new Float32Array(n); this.peak = new Float32Array(n);
    this.rot = new Float32Array(n); this.rotSpeed = new Float32Array(n);
    this.phase = new Float32Array(n);

    this.free = new Int32Array(n);
    for (let i = 0; i < n; i++) this.free[i] = n - 1 - i;
    this.freeTop = n;
    this.active = 0;
    this._prevActive = 0;
    this.acc = 0;
    this.strength = 0;
    this.scale = 200; // last known face width, for existing particles

    const posArr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) posArr[i * 3 + 2] = SMOKE.zDepth;
    this.posAttr = new THREE.BufferAttribute(posArr, 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.rotAttr = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    const toneArr = new Float32Array(n);
    for (let i = 0; i < n; i++) toneArr[i] = 0.82 + Math.random() * 0.18;
    const toneAttr = new THREE.BufferAttribute(toneArr, 1);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aSize', this.sizeAttr);
    geo.setAttribute('aAlpha', this.alphaAttr);
    geo.setAttribute('aRot', this.rotAttr);
    geo.setAttribute('aTone', toneAttr);

    const gl = renderer.getContext();
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uMap: { value: makeSmokeTexture() },
        uTint: { value: new THREE.Vector3(1, 1, 1) },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uMaxSize: { value: range ? range[1] : 64 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      premultipliedAlpha: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    scene.add(this.points);
  }

  setPixelRatio(r) { this.material.uniforms.uPixelRatio.value = r; }

  /** Colorize the smoke (1,1,1 = natural white-gray). Used by reward effects. */
  setTint(r, g, b) { this.material.uniforms.uTint.value.set(r, g, b); }

  _spawn(x, y, W, speed, side) {
    if (this.freeTop === 0) return;
    const i = this.free[--this.freeTop];
    this.px[i] = x + (Math.random() - 0.5) * W * 0.06;
    this.py[i] = y + (Math.random() - 0.5) * W * 0.04;
    this.vx[i] = ((Math.random() - 0.5) * 0.3 - side * 0.08) * W * speed;
    this.vy[i] = -(0.22 + Math.random() * 0.33) * W * speed; // up
    this.age[i] = 0;
    this.life[i] = (1.8 + Math.random() * 1.7) / Math.sqrt(Math.max(speed, 0.4));
    this.size0[i] = W * (0.12 + Math.random() * 0.14);
    this.peak[i] = 0.28 + Math.random() * 0.27;
    this.rot[i] = Math.random() * 6.2832;
    this.rotSpeed[i] = (Math.random() - 0.5) * 0.8;
    this.phase[i] = Math.random() * 6.2832;
    this.active++;
  }

  /**
   * @param ctx { emitting, mouthX, mouthY (screen px), faceW, side }
   * @param p live params
   */
  update(dt, time, ctx, p) {
    this.strength = damp(this.strength, ctx.emitting ? 1 : 0, 7, dt);
    if (ctx.faceW > 0) this.scale = ctx.faceW;
    const W = this.scale, speed = p.smokeSpeed;

    if (ctx.emitting) {
      this.acc += SMOKE.baseRate * p.smokeDensity * this.strength * dt;
      let n = Math.floor(this.acc);
      this.acc -= n;
      if (n > SMOKE.maxSpawnPerFrame) n = SMOKE.maxSpawnPerFrame;
      const cap = Math.min(p.particleCount, this.max);
      while (n-- > 0 && this.active < cap) this._spawn(ctx.mouthX, ctx.mouthY, W, speed, ctx.side);
    } else {
      this.acc = 0;
    }

    if (this.active === 0 && this._prevActive === 0) return;

    const pos = this.posAttr.array, sz = this.sizeAttr.array;
    const al = this.alphaAttr.array, ro = this.rotAttr.array;
    const drag = Math.exp(-0.9 * dt);
    const buoy = W * 0.1 * speed * dt;
    const turb = W * 0.25 * speed * dt;

    for (let i = 0; i < this.max; i++) {
      const life = this.life[i];
      if (life <= 0) continue;
      const age = (this.age[i] += dt);
      const t = age / life;
      if (t >= 1) {
        this.life[i] = 0;
        al[i] = 0; sz[i] = 0;
        this.free[this.freeTop++] = i;
        this.active--;
        continue;
      }
      this.vy[i] = this.vy[i] * drag - buoy;
      this.vx[i] = this.vx[i] * drag + Math.sin(this.py[i] * 0.012 + time * 1.7 + this.phase[i]) * turb;
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.rot[i] += this.rotSpeed[i] * dt;

      const fadeIn = t < 0.08 ? t / 0.08 : 1;
      const fo = 1 - t;
      pos[i * 3] = this.px[i];
      pos[i * 3 + 1] = -this.py[i];
      sz[i] = this.size0[i] * (1 + 2.4 * Math.sqrt(t));
      al[i] = this.peak[i] * fadeIn * fo * fo;
      ro[i] = this.rot[i];
    }
    this._prevActive = this.active;

    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.rotAttr.needsUpdate = true;
  }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.uniforms.uMap.value.dispose();
    this.material.dispose();
  }
}
