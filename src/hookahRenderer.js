import * as THREE from 'three';
import { HOOKAH } from './config.js';
import { clamp, damp } from './filters.js';

const phong = (color, o = {}) =>
  new THREE.MeshPhongMaterial({ color, shininess: 70, specular: 0x666666, ...o });

/**
 * Procedural stylized hookah built from primitives (cylinder, cone, torus,
 * sphere). Local origin = center of the foot, +Y up. Scene units are screen
 * pixels (orthographic camera), world Y = -screenY.
 */
export class HookahRenderer {
  constructor(scene) {
    this.group = new THREE.Group();
    this.model = new THREE.Group();
    this.group.add(this.model);
    scene.add(this.group);

    this.side = 1; // +1 = hookah on the right of the face, -1 = on the left
    this.ready = false;
    this.x = 0; this.y = 0; this.h = 100;
    this.anchor = new THREE.Object3D(); // hose port tip
    this._build();
  }

  _build() {
    const brass = phong(0xd4a24c, { shininess: 90 });
    const steel = phong(0xc9ced6, { shininess: 110 });
    const glass = phong(0x2aa6a0, { shininess: 130, transparent: true, opacity: 0.92 });
    const clay = phong(0xb5593a, { shininess: 15 });
    this.coalMat = new THREE.MeshPhongMaterial({ color: 0x3a1a10, emissive: 0xff4a14, emissiveIntensity: 0.9 });

    const add = (geo, mat, x, y, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, 0);
      m.scale.set(sx, sy, sz);
      this.model.add(m);
      return m;
    };

    // BASE (foot + vase + neck + collar)
    add(new THREE.CylinderGeometry(22, 25, 5, 32), brass, 0, 2.5);
    add(new THREE.SphereGeometry(1, 32, 24), glass, 0, 30, 25, 26, 25);
    add(new THREE.CylinderGeometry(7, 11, 16, 24), glass, 0, 57);
    add(new THREE.TorusGeometry(9, 2.2, 12, 28), brass, 0, 66).rotation.x = Math.PI / 2;

    // STEM (shaft + decorative knobs + flared cone)
    add(new THREE.CylinderGeometry(3.4, 3.4, 46, 16), steel, 0, 89);
    add(new THREE.SphereGeometry(1, 20, 14), brass, 0, 80, 7, 5, 7);
    add(new THREE.SphereGeometry(1, 20, 14), brass, 0, 96, 7, 5, 7);
    add(new THREE.ConeGeometry(8, 10, 24), steel, 0, 108).rotation.x = Math.PI; // wide end up

    // TRAY (disc + rim)
    add(new THREE.CylinderGeometry(22, 22, 2.5, 40), steel, 0, 115);
    add(new THREE.TorusGeometry(22, 1.6, 8, 40), steel, 0, 115).rotation.x = Math.PI / 2;

    // BOWL (clay cup + glowing coal)
    add(new THREE.CylinderGeometry(12, 8, 14, 24), clay, 0, 123.5);
    this.coal = add(new THREE.SphereGeometry(1, 20, 12), this.coalMat, 0, 131, 11, 5, 11);

    // HOSE PORT (side pipe on the stem, pointing to local +X)
    add(new THREE.CylinderGeometry(2.6, 2.6, 16, 12), brass, 11.4, 74).rotation.z = -Math.PI / 2;
    add(new THREE.TorusGeometry(3.6, 1.2, 8, 16), brass, 5, 74).rotation.y = Math.PI / 2;

    this.anchor.position.set(19.5, 74, 0);
    this.model.add(this.anchor);
  }

  reset() { this.ready = false; }

  /** @param face FaceTracker.state  @param p live params */
  update(dt, face, p, vw, vh, time) {
    const W = face.faceWidth;

    if (!this.ready) this.side = face.center.x < vw * 0.5 ? 1 : -1;
    else if (this.side === 1 && face.center.x > vw * HOOKAH.sideSwitchHigh) this.side = -1;
    else if (this.side === -1 && face.center.x < vw * HOOKAH.sideSwitchLow) this.side = 1;

    const tx = clamp(face.center.x + this.side * W * HOOKAH.sideOffset, W * 0.55, vw - W * 0.55);
    const ty = Math.min(face.center.y + W * HOOKAH.baseDrop, vh - 6);
    const th = W * HOOKAH.heightFactor * p.hookahScale;

    if (!this.ready) {
      this.x = tx; this.y = ty; this.h = th; this.ready = true;
    } else {
      this.x = damp(this.x, tx, HOOKAH.posLambda, dt);
      this.y = damp(this.y, ty, HOOKAH.posLambda, dt);
      this.h = damp(this.h, th, HOOKAH.scaleLambda, dt);
    }

    this.group.position.set(this.x, -this.y, 0);
    this.group.rotation.z = -face.roll * 0.2 + Math.sin(time * 0.9) * 0.012;
    this.model.scale.setScalar(this.h / HOOKAH.modelHeight);
    // port faces the user; slight turn follows head yaw for a 3D feel
    this.model.rotation.y = (this.side === 1 ? Math.PI : 0) + face.yaw * 0.35 + 0.25;

    this.coalMat.emissiveIntensity = 0.75 + Math.sin(time * 3.1) * 0.12 + Math.sin(time * 7.3) * 0.06;
  }

  getAnchorWorld(out) {
    this.group.updateMatrixWorld(true);
    return this.anchor.getWorldPosition(out);
  }

  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.group.clear();
  }
}
