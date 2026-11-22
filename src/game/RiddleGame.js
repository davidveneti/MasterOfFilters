import { BaseGame } from './BaseGame.js';
import { GameEvents } from './events.js';
import { matchesAnswer } from './answers.js';

/**
 * Visual-riddle ("rebus") mini-game. The preset defines TIERS (stages); each tier has a pool of riddles
 * and the game serves ONE random riddle per tier. A tier must be solved to unlock the next one:
 * stages can't be skipped. Wrong answers reveal progressive hints; once every hint has been seen the
 * player may swap the riddle for another one of the SAME tier (never to skip it).
 * Each tier is one "trial" of the mission.
 *
 * Emits: GAME_STATE, GAME_WRONG, GAME_LEVEL_COMPLETE, GAME_COMPLETE.
 */
export class RiddleGame extends BaseGame {
  static meta = { id: 'riddle', name: 'Rebus' };
  static trialCount(preset) { return preset.tiers.length; }

  initialize(saved = null) {
    this.tiers = this.preset.tiers;
    this.levelIndex = 0;
    this.completed = new Set();
    this.seen = {};          // tierIndex -> ids already served (no repeats until the pool is exhausted)
    this.attempts = 0;       // wrong answers on the current riddle
    this.hintsShown = 0;
    this.totalAttempts = 0;
    this.solved = false;
    this.finished = false;
    this.rewardClaimed = false;
    this.current = null;
    if (saved && typeof saved === 'object') this._restore(saved);
    if (!this.current) this._pick();
  }

  _restore(s) {
    const n = this.tiers.length;
    this.levelIndex = Math.min(n - 1, Math.max(0, Math.round(Number(s.levelIndex) || 0)));
    this.completed = new Set((s.completed || []).filter((i) => Number.isInteger(i) && i >= 0 && i < n));
    this.seen = s.seen && typeof s.seen === 'object' ? s.seen : {};
    this.totalAttempts = Number(s.totalAttempts) || 0;
    this.finished = this.completed.size === n;
    this.rewardClaimed = !!s.rewardClaimed;
    const r = this.tiers[this.levelIndex].riddles.find((x) => x.id === s.currentId);
    if (r) {
      this.current = r;
      this.attempts = Math.max(0, Number(s.attempts) || 0);
      this.hintsShown = Math.min(r.h.length, Math.max(0, Number(s.hintsShown) || 0));
      this.solved = !!s.solved && this.completed.has(this.levelIndex);
    }
  }

  _pool() { return this.tiers[this.levelIndex].riddles; }

  /** Pick a random riddle of the current tier (not seen yet, never the one on screen). */
  _pick() {
    const pool = this._pool();
    let seen = this.seen[this.levelIndex] || [];
    let options = pool.filter((r) => !seen.includes(r.id) && (!this.current || r.id !== this.current.id));
    if (!options.length) { seen = []; options = pool.filter((r) => !this.current || r.id !== this.current.id); }
    const r = options[Math.floor(Math.random() * options.length)] || pool[0];
    this.seen[this.levelIndex] = [...seen, r.id];
    this.current = r;
    this.attempts = 0;
    this.hintsShown = 0;
    this.solved = false;
  }

  _label() { const a = this.current.a[0]; return a.charAt(0).toUpperCase() + a.slice(1); }

  /**
   * @param {string|{answer:string}} input the typed answer
   * @returns {{correct:boolean, message:string}}
   */
  checkSolution(input) {
    if (this.solved) return { correct: true, message: 'Già risolto!' };
    const text = typeof input === 'string' ? input : input && input.answer;
    if (!String(text == null ? '' : text).trim()) return { correct: false, message: 'Scrivi la tua risposta nel campo!' };

    if (matchesAnswer(text, this.current.a)) {
      this.solved = true;
      this.completed.add(this.levelIndex);
      this.finished = this.completed.size === this.tiers.length;
      this.emit(this.finished ? GameEvents.GAME_COMPLETE : GameEvents.GAME_LEVEL_COMPLETE);
      return { correct: true, message: `Esatto! La risposta è "${this._label()}".` };
    }
    this.attempts++;
    this.totalAttempts++;
    const hints = this.current.h.length;
    if (this.hintsShown < Math.min(this.attempts, hints)) this.hintsShown = Math.min(this.attempts, hints);
    const message = this.hintsShown >= hints
      ? 'Non è questa. Hai visto tutti gli indizi: leggili con calma!'
      : 'Non è questa. Ecco un nuovo indizio! 💡';
    this.emit(GameEvents.GAME_WRONG, { message });
    return { correct: false, message };
  }

  /** Reveal the next hint. @returns {string} */
  hint() {
    const hints = this.current.h;
    if (this.hintsShown < hints.length) {
      this.hintsShown++;
      this.emitState();
      return hints[this.hintsShown - 1];
    }
    return 'Hai già visto tutti gli indizi. Rileggi la domanda e osserva bene le immagini!';
  }

  /** Swap the riddle for another of the same tier (only when stuck: every hint already seen). @returns {boolean} */
  swap() {
    if (this.solved || this.hintsShown < this.current.h.length) return false;
    this._pick();
    this.emitState();
    return true;
  }

  /** Move to the next tier after a solved one. */
  advance() {
    if (!this.solved || this.finished) return;
    this.levelIndex++;
    this.current = null;
    this._pick();
    this.emitState();
  }

  getTrials() { return { done: this.completed.size, total: this.tiers.length }; }

  getProgress() {
    const total = this.tiers.length, completed = this.completed.size;
    return { completed, total, ratio: completed / total };
  }

  unlockReward() {
    if (!this.finished || this.rewardClaimed) return null;
    this.rewardClaimed = true;
    return { type: 'game-complete', gameId: RiddleGame.meta.id, presetId: this.preset.id };
  }

  reset() {
    this.initialize(null);
    this.started = true;
    this.emitState();
  }

  getSnapshot() {
    const t = this.tiers[this.levelIndex], r = this.current;
    return {
      game: RiddleGame.meta.id,
      presetId: this.preset.id,
      level: this.levelIndex + 1,
      levels: this.tiers.length,
      title: t.title,
      intro: t.intro,
      riddleId: r.id,
      question: r.q,
      visual: r.v,                              // static data, never mutated by the UI
      hints: r.h.slice(0, this.hintsShown),
      hintsTotal: r.h.length,
      attempts: this.attempts,
      canSwap: !this.solved && this.hintsShown >= r.h.length,
      solved: this.solved,
      finished: this.finished,
      answer: this.solved ? this._label() : null, // the solution is only revealed once solved
      progress: this.getProgress(),
    };
  }

  serialize() {
    return {
      levelIndex: this.levelIndex, completed: [...this.completed], seen: this.seen,
      currentId: this.current && this.current.id, attempts: this.attempts, hintsShown: this.hintsShown,
      totalAttempts: this.totalAttempts, solved: this.solved, rewardClaimed: this.rewardClaimed,
    };
  }
}
