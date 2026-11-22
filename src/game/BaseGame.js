import { GameEvents } from './events.js';

/**
 * Common interface of every mini-game. Games are pure logic: they never touch
 * the DOM or the renderer. They publish events on the shared bus; the UI and
 * the filters react to those events.
 *
 * Lifecycle (driven by GameManager):
 *   new Game({bus, preset}) -> initialize(saved) -> start() -> { update(dt) }*
 *   ... checkSolution(input) / advance() / hint() ... -> unlockReward() -> dispose()
 */
export class BaseGame {
  /** @type {{id:string, name:string}} */
  static meta = { id: 'base', name: 'Base' };

  /** How many "trials" (levels/rounds) this game has for a preset. Used for overall mission progress. */
  static trialCount(preset) { return 1; }

  /**
   * @param {{bus: import('../core/EventBus.js').EventBus, preset: object}} deps
   */
  constructor({ bus, preset }) {
    this.bus = bus;
    this.preset = preset;
    this.started = false;
    this.finished = false;
    this.rewardClaimed = false;
  }

  /** Load the preset and restore a previously serialized state (or start fresh). @param {object|null} saved */
  initialize(saved = null) {}

  /** Begin playing; must publish the first GAME_STATE. */
  start() { this.started = true; this.emitState(); }

  /** Per-frame hook for animations/timers (dt in seconds). */
  update(dt) {}

  /**
   * Validate the player's answer.
   * @param {*} [input] game specific (optional)
   * @returns {{correct:boolean, message:string}}
   */
  checkSolution(input) { return { correct: false, message: '' }; }

  /** @returns {{completed:number, total:number, ratio:number}} progress 0..1 */
  getProgress() { return { completed: 0, total: 1, ratio: 0 }; }

  /** @returns {{done:number, total:number}} trials passed so far (levels/rounds) */
  getTrials() { const p = this.getProgress(); return { done: p.completed, total: p.total }; }

  /** Claim the reward once the game is finished. @returns {object|null} reward descriptor, or null */
  unlockReward() { return null; }

  /** Forget all progress and start over. */
  reset() {}

  /** Move on after a solved level/round. */
  advance() {}

  /** @returns {string} a helpful hint (and counts it) */
  hint() { return ''; }

  /** @returns {object} plain, UI-ready view model (never mutated by the UI) */
  getSnapshot() { return {}; }

  /** @returns {object} JSON-safe state for persistence */
  serialize() { return {}; }

  dispose() {}

  // ---- helpers for subclasses
  emitState() { this.bus.emit(GameEvents.GAME_STATE, { snapshot: this.getSnapshot() }); }
  emit(type, extra = {}) { this.bus.emit(type, { snapshot: this.getSnapshot(), ...extra }); }
}
