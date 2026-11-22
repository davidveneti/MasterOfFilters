import * as THREE from 'three';

/** White soft radial sprite for GL particles (alpha carries the shape). */
export function makeGlowTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/** Colored soft glow canvas for 2D additive drawing. rgb in 0..255. */
export function makeGlowCanvas(size, rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const [R, G, B] = rgb;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, `rgba(${R},${G},${B},1)`);
  gr.addColorStop(0.3, `rgba(${R},${G},${B},0.55)`);
  gr.addColorStop(0.65, `rgba(${R},${G},${B},0.14)`);
  gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}
