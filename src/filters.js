const TWO_PI = Math.PI * 2;

/** One-Euro filter: low jitter when still, low lag when moving. */
export class OneEuro {
  constructor({ minCutoff = 1, beta = 0, dCutoff = 1 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = null;
    this.dx = 0;
    this.t = null;
  }
  static alpha(cutoff, dt) {
    const tau = 1 / (TWO_PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  reset() { this.x = null; this.dx = 0; this.t = null; }
  filter(v, tMs) {
    if (this.x === null) { this.x = v; this.t = tMs; this.dx = 0; return v; }
    const dt = Math.max((tMs - this.t) * 0.001, 1e-3);
    this.t = tMs;
    const rawD = (v - this.x) / dt;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (rawD - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (v - this.x);
    return this.x;
  }
}

/** Frame-rate independent exponential smoothing (interpolation). */
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
