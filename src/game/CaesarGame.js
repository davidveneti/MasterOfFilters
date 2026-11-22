import { BaseGame } from './BaseGame.js';
import { GameEvents } from './events.js';
import { caesarEncrypt, caesarDecrypt, caesarMapping } from '../crypto/caesar.js';

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clampInt = (v, a, b) => Math.min(b, Math.max(a, Math.round(Number(v) || a)));

/**
 * Caesar cipher mini-game. The preset decides how many levels there are and
 * whether the key is shown or hidden. Each level: a ciphertext, a rotation
 * slider (the "wheel"), a live preview, and a DECRYPT check.
 *
 * Emits: GAME_STATE, GAME_WRONG, GAME_LEVEL_COMPLETE, GAME_COMPLETE.
 */
export class CaesarGame extends BaseGame {
  static meta = { id: 'caesar', name: 'Cifrario di Cesare' };
  static trialCount(preset) { return preset.levels.length; }

  initialize(saved = null) {
    this.levels = this.preset.levels;
    this.levelIndex = 0;
    this.completed = new Set();
    this.seen = {};            // levelIndex -> number of messages already served
    this.lastPlain = '';
    this.attempts = 0;         // wrong attempts on the current level
    this.hintsUsed = 0;        // hints on the current level
    this.totalAttempts = 0;
    this.solved = false;
    this.finished = false;
    this.rewardClaimed = false;
    this.current = null;
    this.sliderKey = 1;

    if (saved && typeof saved === 'object') this._restore(saved);
    if (!this.current) this._pickMessage();
  }

  _restore(s) {
    const n = this.levels.length;
    this.levelIndex = clampInt(s.levelIndex, 0, n - 1);
    this.completed = new Set((s.completed || []).filter((i) => Number.isInteger(i) && i >= 0 && i < n));
    this.seen = s.seen && typeof s.seen === 'object' ? s.seen : {};
    this.attempts = Number(s.attempts) || 0;
    this.hintsUsed = Number(s.hintsUsed) || 0;
    this.totalAttempts = Number(s.totalAttempts) || 0;
    this.solved = !!s.solved && this.completed.has(this.levelIndex);
    this.finished = this.completed.size === n;
    this.rewardClaimed = !!s.rewardClaimed;
    const c = s.current;
    if (c && /^[A-Z]+$/.test(c.plain || '') && Number.isInteger(c.key)) {
      this.current = { plain: c.plain, key: c.key, cipher: caesarEncrypt(c.plain, c.key) };
      this.sliderKey = clampInt(s.sliderKey, ...this._level().keyRange);
    }
  }

  _level() { return this.levels[this.levelIndex]; }

  _pickMessage() {
    const lv = this._level();
    const served = this.seen[this.levelIndex] || 0;
    let msg;
    if (lv.fixedFirst && served === 0) msg = lv.messages[0];
    else {
      const pool = lv.messages.filter((m) => m.plain !== this.lastPlain);
      msg = (pool.length ? pool : lv.messages)[Math.floor(Math.random() * (pool.length || lv.messages.length))];
    }
    this.seen[this.levelIndex] = served + 1;
    const key = msg.key ?? randInt(lv.keyRange[0], lv.keyRange[1]);
    this.current = { plain: msg.plain, key, cipher: caesarEncrypt(msg.plain, key) };
    this.lastPlain = msg.plain;
    this.attempts = 0;
    this.hintsUsed = 0;
    this.solved = false;
    // start on the lowest value, but never on the solution of a hidden-key level
    const [lo, hi] = lv.keyRange;
    this.sliderKey = lv.keyMode === 'hidden' && lo === key ? Math.min(hi, lo + 1) : lo;
  }

  /** Player moves the rotation slider. @param {number} k */
  setKey(k) {
    if (this.solved) return;
    const [lo, hi] = this._level().keyRange;
    this.sliderKey = clampInt(k, lo, hi);
    this.emitState();
  }

  getPreview() { return caesarDecrypt(this.current.cipher, this.sliderKey); }

  /**
   * @param {{key?:number}} [input] key to test (defaults to the slider value)
   * @returns {{correct:boolean, message:string}}
   */
  checkSolution(input) {
    if (this.solved) return { correct: true, message: 'Già risolto!' };
    const key = input && input.key != null ? input.key : this.sliderKey;
    if (key === this.current.key) {
      this.solved = true;
      this.completed.add(this.levelIndex);
      this.finished = this.completed.size === this.levels.length;
      this.sliderKey = key;
      this.emit(this.finished ? GameEvents.GAME_COMPLETE : GameEvents.GAME_LEVEL_COMPLETE);
      return { correct: true, message: `Esatto! "${this.current.cipher}" significa "${this.current.plain}".` };
    }
    this.attempts++;
    this.totalAttempts++;
    const message = this.attempts >= 3
      ? 'Ancora no. Ti serve un aiuto? Premi "Suggerimento".'
      : `Con la chiave ${key} esce "${caesarDecrypt(this.current.cipher, key)}": non è una parola vera. Riprova!`;
    this.emit(GameEvents.GAME_WRONG, { message });
    return { correct: false, message };
  }

  /** Go to the next level after a solved one. */
  advance() {
    if (!this.solved || this.finished) return;
    this.levelIndex++;
    this._pickMessage();
    this.emitState();
  }

  hint() {
    this.hintsUsed++;
    const { cipher, plain, key } = this.current;
    const [lo, hi] = this._level().keyRange;
    let text;
    if (this.hintsUsed === 1) text = `La chiave è un numero tra ${lo} e ${hi}. Muovi la ruota finché l'anteprima diventa una parola vera.`;
    else if (this.hintsUsed === 2) text = `La prima lettera cifrata è "${cipher[0]}" e deve diventare "${plain[0]}". Quanti passi indietro servono?`;
    else text = `La chiave è ${key}.`;
    this.emitState();
    return text;
  }

  getTrials() { return { done: this.completed.size, total: this.levels.length }; }

  getProgress() {
    const total = this.levels.length, completed = this.completed.size;
    return { completed, total, ratio: completed / total };
  }

  unlockReward() {
    if (!this.finished || this.rewardClaimed) return null;
    this.rewardClaimed = true;
    return { type: 'game-complete', gameId: CaesarGame.meta.id, presetId: this.preset.id };
  }

  reset() {
    this.initialize(null);
    this.started = true;
    this.emitState();
  }

  getSnapshot() {
    const lv = this._level(), c = this.current;
    return {
      game: CaesarGame.meta.id,
      presetId: this.preset.id,
      level: this.levelIndex + 1,
      levels: this.levels.length,
      title: lv.title,
      intro: lv.intro,
      keyMode: lv.keyMode,
      keyRange: lv.keyRange,
      keyShown: lv.keyMode === 'shown' ? c.key : null,
      cipher: c.cipher,
      sliderKey: this.sliderKey,
      preview: this.getPreview(),
      mapping: caesarMapping(c.cipher, this.sliderKey),
      plain: this.solved ? c.plain : null,
      solved: this.solved,
      finished: this.finished,
      attempts: this.attempts,
      hintsUsed: this.hintsUsed,
      progress: this.getProgress(),
    };
  }

  serialize() {
    return {
      levelIndex: this.levelIndex, completed: [...this.completed], seen: this.seen,
      attempts: this.attempts, hintsUsed: this.hintsUsed, totalAttempts: this.totalAttempts,
      solved: this.solved, rewardClaimed: this.rewardClaimed,
      current: this.current && { plain: this.current.plain, key: this.current.key },
      sliderKey: this.sliderKey,
    };
  }
}
