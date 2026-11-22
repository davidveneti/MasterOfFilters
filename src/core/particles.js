import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uMaxSize;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha; vColor = aColor;
    gl_PointSize = min(aSize * uPixelRatio, uMaxSize);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

/**
 * Generic pooled GL point-sprite system (struct-of-arrays, free-list).
 * Coordinates are SCREEN pixels (y down); written to the GPU as world y = -y.
 * `gravity` is px/s^2 (+ = down) scaled per particle by `gm`.
 * Zero allocations in emit()/update().
 */
export class ParticlePool {
  constructor(parent, renderer, texture, opts = {}) {
    const { max = 500, additive = true, gravity = 0, drag = 0, fade = 2, z = 300, order = 10 } = opts;
    const n = (this.max = max);
    this.gravity = gravity; this.drag = drag; this.fade = fade;
    this.px = new Float32Array(n); this.py = new Float32Array(n);
    this.vx = new Float32Array(n); this.vy = new Float32Array(n);
    this.age = new Float32Array(n); this.life = new Float32Array(n);
    this.s0 = new Float32Array(n); this.s1 = new Float32Array(n);
    this.cr = new Float32Array(n); this.cg = new Float32Array(n); this.cb = new Float32Array(n);
    this.a0 = new Float32Array(n); this.gm = new Float32Array(n);
    this.free = new Int32Array(n);
    for (let i = 0; i < n; i++) this.free[i] = n - 1 - i;
    this.freeTop = n;
    this.active = 0;
    this._dirty = false;

    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos[i * 3 + 2] = z;
    this.posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);
    this.geometry.setAttribute('aColor', this.colAttr);

    const gl = renderer.getContext();
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uMap: { value: texture },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uMaxSize: { value: range ? range[1] : 64 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = order;
    parent.add(this.points);
  }

  setPixelRatio(r) { this.material.uniforms.uPixelRatio.value = r; }

  emit(x, y, vx, vy, life, s0, s1, r, g, b, a = 1, gm = 1) {
    if (this.freeTop === 0) return -1;
    const i = this.free[--this.freeTop];
    this.px[i] = x; this.py[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.age[i] = 0; this.life[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    this.cr[i] = r; this.cg[i] = g; this.cb[i] = b; this.a0[i] = a; this.gm[i] = gm;
    this.active++;
    return i;
  }

  clear() {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] > 0) { this.life[i] = 0; this.free[this.freeTop++] = i; }
    }
    this.alphaAttr.array.fill(0);
    this.alphaAttr.needsUpdate = true;
    this.active = 0;
    this._dirty = false;
  }

  update(dt) {
    if (this.active === 0 && !this._dirty) return;
    const pos = this.posAttr.array, sz = this.sizeAttr.array;
    const al = this.alphaAttr.array, col = this.colAttr.array;
    const drag = Math.exp(-this.drag * dt);
    const g = this.gravity * dt;
    const quad = this.fade === 2;

    for (let i = 0; i < this.max; i++) {
      const life = this.life[i];
      if (life <= 0) continue;
      const age = (this.age[i] += dt);
      const t = age / life;
      if (t >= 1) {
        this.life[i] = 0; al[i] = 0; sz[i] = 0;
        this.free[this.freeTop++] = i;
        this.active--;
        continue;
      }
      this.vx[i] *= drag;
      this.vy[i] = this.vy[i] * drag + g * this.gm[i];
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      const fo = 1 - t;
      const fi = age < 0.05 ? age * 20 : 1;
      pos[i * 3] = this.px[i];
      pos[i * 3 + 1] = -this.py[i];
      sz[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      al[i] = this.a0[i] * fi * (quad ? fo * fo : fo);
      col[i * 3] = this.cr[i]; col[i * 3 + 1] = this.cg[i]; col[i * 3 + 2] = this.cb[i];
    }
    this._dirty = this.active > 0;
    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
  }

  dispose() {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose(); // texture is owned by the ResourceCache
  }
}
