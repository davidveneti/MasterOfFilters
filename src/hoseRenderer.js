import * as THREE from 'three';
import { HOSE } from './config.js';

function makeStripeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#d23a55'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#8a1630'; g.fillRect(16, 0, 16, 32);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(4, 0, 4, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Flexible hose. 5 control points feed a CatmullRomCurve3. The two end points
 * are pinned (hookah port, mouth); the 3 inner ones are driven by springs so
 * the hose lags, sags and swings like a real one. The tube mesh is a single
 * preallocated BufferGeometry rewritten in place each frame (zero allocations).
 */
export class HoseRenderer {
  constructor(scene) {
    const N = (this.N = HOSE.segments);
    const R = (this.R = HOSE.radialSegments);

    this.ctrl = Array.from({ length: 5 }, () => new THREE.Vector3());
    this.vel = Array.from({ length: 5 }, () => new THREE.Vector3());
    this.target = Array.from({ length: 5 }, () => new THREE.Vector3());
    this.curve = new THREE.CatmullRomCurve3(this.ctrl, false, 'catmullrom', 0.5);
    this.P = Array.from({ length: N + 1 }, () => new THREE.Vector3());
    this.T = Array.from({ length: N + 1 }, () => new THREE.Vector3());
    this.ready = false;

    this.cosT = new Float32Array(R + 1);
    this.sinT = new Float32Array(R + 1);
    for (let j = 0; j <= R; j++) {
      this.cosT[j] = Math.cos((j / R) * Math.PI * 2);
      this.sinT[j] = Math.sin((j / R) * Math.PI * 2);
    }

    const ring = R + 1;
    const vcount = (N + 1) * ring;
    this.pos = new Float32Array(vcount * 3);
    this.nor = new Float32Array(vcount * 3);
    const uv = new Float32Array(vcount * 2);
    const idx = new Uint16Array(N * R * 6);
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= R; j++) {
        const k = i * ring + j;
        uv[k * 2] = (i / N) * HOSE.stripeCount;
        uv[k * 2 + 1] = j / R;
      }
    }
    let o = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < R; j++) {
        const a = i * ring + j, b = a + ring;
        idx[o++] = a; idx[o++] = b; idx[o++] = a + 1;
        idx[o++] = a + 1; idx[o++] = b; idx[o++] = b + 1;
      }
    }

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.norAttr = new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('normal', this.norAttr);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));

    this.material = new THREE.MeshPhongMaterial({
      map: makeStripeTexture(), shininess: 45, specular: 0x555555, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false; // geometry changes every frame
    this.mesh.renderOrder = 1;

    // mouthpiece (reused cylinder)
    this.tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 1, 1, 16),
      new THREE.MeshPhongMaterial({ color: 0xd4a24c, shininess: 100, specular: 0x888888 })
    );
    this.tip.frustumCulled = false;
    this.tip.renderOrder = 1;

    this.group = new THREE.Group();
    this.group.add(this.mesh, this.tip);
    scene.add(this.group);

    this._up = new THREE.Vector3(0, 1, 0);
  }

  set visible(v) { this.group.visible = v; }
  reset() { this.ready = false; }

  /**
   * @param anchor world-space hose port position (THREE.Vector3)
   * @param mouth  world-space mouth position (THREE.Vector3)
   * @param side   +1 hookah on the right, -1 on the left
   */
  update(dt, time, anchor, mouth, faceW, side) {
    const c = this.ctrl, tg = this.target, v = this.vel;
    const dx = mouth.x - anchor.x, dy = mouth.y - anchor.y;
    const dist = Math.hypot(dx, dy);
    const L0 = faceW * HOSE.lengthFactor;
    const slack = Math.max(0, L0 - dist);
    const sag = slack * 0.55 + dist * 0.06;
    const sway = Math.sin(time * 1.7) * faceW * 0.015;

    tg[0].set(anchor.x, anchor.y, anchor.z);
    tg[1].set(anchor.x - side * dist * 0.22, anchor.y - sag * 0.12, anchor.z + 40);
    tg[2].set(anchor.x + dx * 0.5 + sway, anchor.y + dy * 0.5 - sag, anchor.z + 90);
    tg[3].set(mouth.x + side * dist * 0.14, mouth.y - dist * 0.12 - sag * 0.1, anchor.z + 130);
    tg[4].set(mouth.x, mouth.y, anchor.z + 150);

    if (!this.ready) {
      for (let i = 0; i < 5; i++) { c[i].copy(tg[i]); v[i].set(0, 0, 0); }
      this.ready = true;
    } else {
      c[0].copy(tg[0]);
      c[4].copy(tg[4]);
      const steps = Math.max(1, Math.ceil(dt * 120));
      const h = dt / steps, k = HOSE.stiffness, d = HOSE.damping;
      for (let s = 0; s < steps; s++) {
        for (let i = 1; i <= 3; i++) {
          v[i].x += ((tg[i].x - c[i].x) * k - v[i].x * d) * h;
          v[i].y += ((tg[i].y - c[i].y) * k - v[i].y * d) * h;
          c[i].x += v[i].x * h;
          c[i].y += v[i].y * h;
          c[i].z = tg[i].z;
        }
      }
    }
    this._buildTube(faceW * HOSE.radiusFactor);
  }

  _buildTube(radius) {
    const N = this.N, R = this.R, P = this.P, T = this.T;
    const pos = this.pos, nor = this.nor, ring = R + 1;

    for (let i = 0; i <= N; i++) this.curve.getPoint(i / N, P[i]);
    for (let i = 0; i <= N; i++) {
      const a = P[i > 0 ? i - 1 : 0], b = P[i < N ? i + 1 : N];
      T[i].set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
    }

    // parallel-transport frame; initial normal = T x Z
    let nx = T[0].y, ny = -T[0].x, nz = 0;
    let nl = Math.hypot(nx, ny);
    if (nl < 1e-5) { nx = 1; ny = 0; nl = 1; }
    nx /= nl; ny /= nl;

    for (let i = 0; i <= N; i++) {
      const t = T[i];
      const dot = nx * t.x + ny * t.y + nz * t.z;
      nx -= t.x * dot; ny -= t.y * dot; nz -= t.z * dot;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      const bx = t.y * nz - t.z * ny;
      const by = t.z * nx - t.x * nz;
      const bz = t.x * ny - t.y * nx;
      const p = P[i];
      for (let j = 0; j <= R; j++) {
        const cs = this.cosT[j], sn = this.sinT[j];
        const dx = cs * nx + sn * bx, dy = cs * ny + sn * by, dz = cs * nz + sn * bz;
        const k = (i * ring + j) * 3;
        pos[k] = p.x + dx * radius; pos[k + 1] = p.y + dy * radius; pos[k + 2] = p.z + dz * radius;
        nor[k] = dx; nor[k + 1] = dy; nor[k + 2] = dz;
      }
    }
    this.posAttr.needsUpdate = true;
    this.norAttr.needsUpdate = true;

    // mouthpiece at the hose end, oriented along the last tangent
    const tn = T[N], len = radius * 4;
    this.tip.position.set(P[N].x - tn.x * len * 0.15, P[N].y - tn.y * len * 0.15, P[N].z - tn.z * len * 0.15);
    this.tip.quaternion.setFromUnitVectors(this._up, tn);
    this.tip.scale.set(radius * 1.3, len, radius * 1.3);
  }

  dispose() {
    this.group.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.map.dispose();
    this.material.dispose();
    this.tip.geometry.dispose();
    this.tip.material.dispose();
  }
}
