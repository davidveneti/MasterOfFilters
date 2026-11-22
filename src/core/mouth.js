import { TRACKING } from '../config.js';
import { clamp, damp } from './../filters.js';

/** Shared mouth-open state with hysteresis, edge events and a smooth 0..1 level. */
export class MouthState {
  constructor() {
    this.open = false;
    this.level = 0;
    this.justOpened = false; // true for exactly one frame
    this.justClosed = false;
  }
  update(openness, threshold, visible, dt) {
    this.justOpened = false;
    this.justClosed = false;
    if (!visible) {
      if (this.open) { this.open = false; this.justClosed = true; }
      this.level = damp(this.level, 0, 14, dt);
      return;
    }
    if (!this.open && openness > threshold) { this.open = true; this.justOpened = true; }
    else if (this.open && openness < threshold * TRACKING.mouthCloseHysteresis) {
      this.open = false; this.justClosed = true;
    }
    const target = this.open ? clamp((openness - threshold * 0.5) / 0.06, 0.15, 1) : 0;
    this.level = damp(this.level, target, 14, dt);
  }
}
