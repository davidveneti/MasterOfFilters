/**
 * Optional sound effects, synthesized with WebAudio (no audio files).
 * Disabled by default; the AudioContext is created lazily after a user gesture.
 */
export class SoundFx {
  constructor() { this.enabled = false; this.ac = null; }

  setEnabled(v) { this.enabled = !!v; }

  _ctx() {
    if (!this.ac) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      try { this.ac = new AC(); } catch { return null; }
    }
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
    return this.ac;
  }

  _tone(freq, start, dur, type = 'sine', gain = 0.12) {
    const ac = this.ac;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime + start);
    g.gain.setValueAtTime(0.0001, ac.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
    o.connect(g).connect(ac.destination);
    o.start(ac.currentTime + start);
    o.stop(ac.currentTime + start + dur + 0.05);
  }

  /** @param {'tick'|'wrong'|'success'|'level'|'badge'} name */
  play(name) {
    if (!this.enabled || !this._ctx()) return;
    switch (name) {
      case 'tick': this._tone(880, 0, 0.05, 'square', 0.04); break;
      case 'wrong': this._tone(160, 0, 0.22, 'sawtooth', 0.07); break;
      case 'success': [523, 659, 784].forEach((f, i) => this._tone(f, i * 0.09, 0.22)); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => this._tone(f, i * 0.08, 0.25, 'triangle')); break;
      case 'badge': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this._tone(f, i * 0.1, 0.45, 'triangle', 0.1)); break;
      default: break;
    }
  }
}
