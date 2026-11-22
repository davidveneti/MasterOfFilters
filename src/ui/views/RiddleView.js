import { h } from '../dom.js';
import { RiddleBoard } from '../components/RiddleBoard.js';

/**
 * View of RiddleGame: stage title, the riddle picture, an answer field, progressive hints and the
 * "next stage" button. Talks to the game only through GameManager (gm). There is deliberately no
 * "skip" button: a stage must be solved to evolve the dragon.
 */
export class RiddleView {
  /** @param {{gm: import('../../game/GameManager.js').GameManager, sound: import('../../core/SoundFx.js').SoundFx}} deps */
  constructor({ gm, sound }) {
    this.gm = gm;
    this.sound = sound;
    this.riddleId = '';
    this.hintCount = -1;
    this.snap = null;
  }

  mount(container) {
    this.title = h('h3', { class: 'gv-title' });
    this.intro = h('p', { class: 'gv-intro' });
    this.board = new RiddleBoard();

    this.input = h('input', {
      class: 'ans-input', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false',
      placeholder: 'Scrivi la risposta…', 'aria-label': 'La tua risposta',
    });
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._submit(); });

    this.btnAnswer = h('button', { class: 'btn primary', type: 'button', onClick: () => this._submit() }, 'RISPONDI');
    this.btnHint = h('button', { class: 'btn', type: 'button', onClick: () => this._hint() }, '💡 Indizio');
    this.btnSwap = h('button', { class: 'btn hidden', type: 'button', onClick: () => this._swap() }, '🎲 Cambia enigma');
    this.btnNext = h('button', { class: 'btn accent hidden', type: 'button', onClick: () => this.gm.advance() }, 'Avanti →');
    this.hints = h('ul', { class: 'hint-list', 'aria-live': 'polite' });
    this.feedback = h('p', { class: 'gv-feedback', role: 'status', 'aria-live': 'polite' });

    this.root = h('div', { class: 'gv riddle' },
      this.title, this.intro, this.board.el,
      h('div', { class: 'ans-row' }, this.input, this.btnAnswer),
      h('div', { class: 'btn-row' }, this.btnHint, this.btnSwap),
      this.hints, this.btnNext, this.feedback);
    container.append(this.root);
  }

  /** @param {object} snap RiddleGame snapshot */
  update(snap) {
    this.snap = snap;
    this.title.textContent = snap.title;
    this.intro.textContent = snap.intro;

    if (snap.riddleId !== this.riddleId) {            // a new riddle: redraw the picture, reset the form
      this.riddleId = snap.riddleId;
      this.board.set(snap.question, snap.visual);
      this.input.value = '';
      this.feedback.textContent = '';
      this.feedback.className = 'gv-feedback';
      this.hintCount = -1;
    }
    if (snap.hints.length !== this.hintCount) {       // hints are only ever added: rebuild the short list
      this.hintCount = snap.hints.length;
      this.hints.textContent = '';
      snap.hints.forEach((t, i) => this.hints.append(h('li', { class: 'hint' }, h('b', {}, `Indizio ${i + 1}: `), t)));
    }

    this.input.disabled = snap.solved;
    this.btnAnswer.disabled = snap.solved;
    this.btnHint.disabled = snap.solved || snap.hints.length >= snap.hintsTotal;
    this.btnHint.textContent = `💡 Indizio (${snap.hints.length}/${snap.hintsTotal})`;
    this.btnSwap.classList.toggle('hidden', !snap.canSwap);
    this.btnNext.classList.toggle('hidden', !(snap.solved && !snap.finished));
    this.btnNext.textContent = snap.level < snap.levels ? `Stadio ${snap.level + 1} →` : 'Avanti →';
    this.input.classList.toggle('ok', snap.solved);
    if (snap.solved && !this.feedback.textContent) {
      this._say(snap.finished ? `🎉 Esatto: "${snap.answer}"! Il tuo drago è leggendario!` : `✅ Esatto: "${snap.answer}"!`, 'ok');
    }
  }

  _say(text, kind = '') { this.feedback.textContent = text; this.feedback.className = `gv-feedback ${kind}`; }

  _submit() {
    if (!this.snap || this.snap.solved) return;
    const res = this.gm.submit(this.input.value);
    this.sound.play(res.correct ? 'success' : 'wrong');
    this._say(`${res.correct ? '✅' : '❌'} ${res.message}`, res.correct ? 'ok' : 'bad');
    if (!res.correct) { this.input.classList.remove('shake'); void this.input.offsetWidth; this.input.classList.add('shake'); }
    if (this.input.focus) this.input.focus();
  }

  _hint() {
    const text = this.gm.hint();
    if (text && this.snap && this.snap.hints.length >= this.snap.hintsTotal) this._say('Hai visto tutti gli indizi. Se sei bloccato puoi cambiare enigma!', 'hint');
  }

  _swap() {
    if (this.gm.invoke('swap')) this.sound.play('tick');
  }

  destroy() { if (this.root) this.root.remove(); }
}
