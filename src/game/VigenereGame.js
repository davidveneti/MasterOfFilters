import { BaseGame } from './BaseGame.js';
import { GameEvents } from './events.js';
import { vigenereEncrypt, expandKey, decryptStep } from '../crypto/vigenere.js';
import { normalize } from '../crypto/alphabet.js';

/**
 * Vigenere mini-game (simplified: no tabula recta). Each round is either
 *  - GUIDED: the player decrypts one letter at a time (cipher letter minus key
 *    letter, A = 0); "Guidami" reveals a step; or
 *  - NOT guided: no explanation, the player decrypts the whole word alone.
 * Each round is one "trial" of the mission.
 *
 * Emits: GAME_STATE, GAME_STEP, GAME_WRONG, GAME_LEVEL_COMPLETE, GAME_COMPLETE.
 */
export class VigenereGame extends BaseGame {
  static meta = { id: 'vigenere', name: 'Vigenère' };
  static trialCount(preset) { return preset.rounds.length; }

  initialize(saved = null) {
    this.rounds = this.preset.rounds;
    this.roundIndex = 0;
    this.completedRounds = new Set();
    this.answers = [];
    this.step = 0;
    this.attempts = 0;
    this.hintsUsed = 0;
    this.assists = 0;
    this.solved = false;
    this.finished = false;
    this.rewardClaimed = false;
    if (saved && typeof saved === 'object') this._restore(saved);
    this._loadRound(saved && this.answers.length ? this.answers : null);
  }

  _restore(s) {
    const n = this.rounds.length;
    this.roundIndex = Math.min(n - 1, Math.max(0, Math.round(Number(s.roundIndex) || 0)));
    this.completedRounds = new Set((s.completedRounds || []).filter((i) => Number.isInteger(i) && i >= 0 && i < n));
    this.answers = Array.isArray(s.answers) ? s.answers.map((a) => (typeof a === 'string' ? a.slice(0, 1) : '')) : [];
    this.assists = Number(s.assists) || 0;
    this.attempts = Number(s.attempts) || 0;
    this.hintsUsed = Number(s.hintsUsed) || 0;
    this.finished = this.completedRounds.size === n;
    this.rewardClaimed = !!s.rewardClaimed;
  }

  _loadRound(answers = null) {
    const r = this.rounds[this.roundIndex];
    this.round = {
      key: r.key, plain: r.plain, intro: r.intro, guided: r.guided !== false,
      cipher: vigenereEncrypt(r.plain, r.key),
    };
    this.keyExpanded = expandKey(r.key, r.plain.length);
    this.answers = answers && answers.length === r.plain.length ? answers.slice() : new Array(r.plain.length).fill('');
    this.step = this.answers.findIndex((a) => a === '');
    if (this.step < 0) this.step = r.plain.length;
    this.solved = this.step >= r.plain.length;
    if (!this.round.guided && !this.solved) { // unguided rounds are all-or-nothing
      this.answers.fill('');
      this.step = 0;
    }
  }

  /** @returns {object|null} full explanation of a step (default: the one the player is on) */
  explainStep(i = this.step) {
    if (i < 0 || i >= this.round.cipher.length) return null;
    return decryptStep(this.round.cipher[i], this.keyExpanded[i]);
  }

  _afterStep() {
    this.emit(GameEvents.GAME_STEP);
    if (this.step < this.round.plain.length) return;
    this.solved = true;
    this.completedRounds.add(this.roundIndex);
    this.finished = this.completedRounds.size === this.rounds.length;
    this.emit(this.finished ? GameEvents.GAME_COMPLETE : GameEvents.GAME_LEVEL_COMPLETE);
  }

  _wrong(message) {
    this.emit(GameEvents.GAME_WRONG, { message });
    return { correct: false, message };
  }

  /**
   * @param {string} input guided rounds: one letter (current step) or the whole word;
   *                       unguided rounds: the whole word
   * @returns {{correct:boolean, message:string}}
   */
  checkSolution(input) {
    if (this.solved) return { correct: true, message: 'Round già risolto!' };
    const text = normalize(input);
    if (!text) return { correct: false, message: 'Scrivi una lettera (A-Z).' };
    const { guided, plain } = this.round;

    if (guided && text.length === 1) {
      const e = this.explainStep();
      if (text === e.result) {
        this.answers[this.step] = text;
        this.step++;
        this.attempts = 0;
        this._afterStep();
        return { correct: true, message: `Esatto! ${e.cipher} − ${e.key} = ${e.result}.` };
      }
      this.attempts++;
      return this._wrong(this.attempts >= 2
        ? `Parti da ${e.cipher} (${e.cipherIdx}) e vai INDIETRO di ${e.keyIdx} lettere. Oppure premi "Guidami".`
        : 'Non è quella. Riprova!');
    }

    if (text === plain) {
      this.answers = [...plain];
      this.step = plain.length;
      this._afterStep();
      return { correct: true, message: `Esatto! Il messaggio è "${plain}".` };
    }
    if (!guided && text.length !== plain.length) return this._wrong(`Scrivi tutta la parola: ha ${plain.length} lettere.`);
    this.attempts++;
    return this._wrong(guided
      ? 'La parola non è giusta. Prova una lettera alla volta!'
      : 'Non ancora! Per ogni lettera: lettera cifrata − lettera della chiave. Ti serve un suggerimento?');
  }

  /** "Guidami" (guided rounds only): reveal the current step. @returns {object|null} the explained step */
  solveStep() {
    if (this.solved || !this.round.guided) return null;
    const e = this.explainStep();
    this.assists++;
    this.answers[this.step] = e.result;
    this.step++;
    this._afterStep();
    return e;
  }

  advance() {
    if (!this.solved || this.finished) return;
    this.roundIndex++;
    this.attempts = 0;
    this.hintsUsed = 0;
    this._loadRound(null);
    this.emitState();
  }

  hint() {
    this.hintsUsed++;
    const guided = this.round.guided;
    const e = this.explainStep(guided ? this.step : 0);
    this.emitState();
    if (!e) return '';
    if (guided) {
      return `Tocca a "${e.cipher}" con la lettera-chiave "${e.key}". A=0, B=1, ... "${e.key}" vale ${e.keyIdx}: torna indietro di ${e.keyIdx} posti da "${e.cipher}" (${e.cipherIdx}).`;
    }
    if (this.hintsUsed === 1) return 'Per ogni lettera: lettera cifrata − lettera della chiave (A=0, B=1, C=2…). Se scendi sotto zero aggiungi 26.';
    if (this.hintsUsed === 2) return `Prima lettera: "${e.cipher}" vale ${e.cipherIdx} e la chiave "${e.key}" vale ${e.keyIdx}. Torna indietro di ${e.keyIdx} lettere.`;
    return `La prima lettera del messaggio è "${this.round.plain[0]}".`;
  }

  getTrials() { return { done: this.completedRounds.size, total: this.rounds.length }; }

  getProgress() {
    const total = this.rounds.reduce((s, r) => s + r.plain.length, 0);
    let done = 0;
    for (let i = 0; i < this.rounds.length; i++) {
      if (i < this.roundIndex || this.completedRounds.has(i)) done += this.rounds[i].plain.length;
      else if (i === this.roundIndex) done += this.step;
    }
    return { completed: done, total, ratio: total ? done / total : 0 };
  }

  unlockReward() {
    if (!this.finished || this.rewardClaimed) return null;
    this.rewardClaimed = true;
    return { type: 'game-complete', gameId: VigenereGame.meta.id, presetId: this.preset.id };
  }

  reset() {
    this.initialize(null);
    this.started = true;
    this.emitState();
  }

  getSnapshot() {
    const r = this.round;
    return {
      game: VigenereGame.meta.id,
      presetId: this.preset.id,
      round: this.roundIndex + 1,
      rounds: this.rounds.length,
      guided: r.guided,
      intro: r.intro,
      key: r.key,
      keyExpanded: this.keyExpanded,
      cipher: r.cipher,
      answers: this.answers.slice(),
      step: this.step,
      explain: r.guided ? this.explainStep() : null, // never leaked in unguided rounds
      plain: this.solved ? r.plain : null,
      solved: this.solved,
      finished: this.finished,
      attempts: this.attempts,
      hintsUsed: this.hintsUsed,
      assists: this.assists,
      progress: this.getProgress(),
    };
  }

  serialize() {
    return {
      roundIndex: this.roundIndex, completedRounds: [...this.completedRounds], answers: this.answers.slice(),
      assists: this.assists, attempts: this.attempts, hintsUsed: this.hintsUsed, rewardClaimed: this.rewardClaimed,
    };
  }
}
