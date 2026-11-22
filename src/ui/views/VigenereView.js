import { h, sleep, reducedMotion } from '../dom.js';
import { NumberStrip } from '../components/NumberStrip.js';

/**
 * View of VigenereGame: three aligned rows (message / key / result), a step
 * explainer with an animated "walk back" on the numbered alphabet, and
 * Check / Guide-me / Hint buttons. Talks to the game through GameManager only.
 */
export class VigenereView {
  /** @param {{gm: import('../../game/GameManager.js').GameManager, sound: import('../../core/SoundFx.js').SoundFx}} deps */
  constructor({ gm, sound }) {
    this.gm = gm;
    this.sound = sound;
    this.busy = false;
    this.dead = false;
    this.sig = '';
    this.snap = null;
  }

  mount(container) {
    this.title = h('h3', { class: 'gv-title' });
    this.intro = h('p', { class: 'gv-intro' });
    this.grid = h('div', { class: 'vgrid', role: 'table', 'aria-label': 'Messaggio, chiave e risultato' });
    this.explain = h('div', { class: 'vexplain', 'aria-live': 'polite' });
    this.numbers = new NumberStrip();

    this.input = h('input', {
      class: 'vinput', type: 'text', maxlength: 1, inputmode: 'text', autocomplete: 'off', autocapitalize: 'characters',
      spellcheck: 'false', placeholder: '?', 'aria-label': 'Lettera del risultato', dataset: { role: 'slider' },
    });
    this.input.addEventListener('input', () => { this.input.value = this.input.value.toUpperCase().replace(/[^A-Z]/g, ''); });
    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._check(); });

    this.answerLabel = h('span', { class: 'gv-label' }, 'La lettera del risultato è:');
    this.btnCheck = h('button', { class: 'btn primary', type: 'button', dataset: { role: 'decrypt' }, onClick: () => this._check() }, 'CONTROLLA');
    this.btnGuide = h('button', { class: 'btn', type: 'button', onClick: () => this._guide() }, '🧭 Guidami');
    this.btnHint = h('button', { class: 'btn', type: 'button', dataset: { role: 'hint' }, onClick: () => this._hint() }, '💡 Suggerimento');
    this.btnNext = h('button', { class: 'btn accent hidden', type: 'button', onClick: () => this.gm.advance() }, 'Round successivo →');
    this.feedback = h('p', { class: 'gv-feedback', role: 'status', 'aria-live': 'polite' });

    this.root = h('div', { class: 'gv vigenere' },
      this.title, this.intro, this.grid, this.explain, this.numbers.el,
      h('div', { class: 'vanswer' }, this.answerLabel, this.input),
      h('div', { class: 'btn-row' }, this.btnCheck, this.btnGuide, this.btnHint),
      this.btnNext, this.feedback);
    container.append(this.root);
  }

  _buildGrid(snap) {
    this.grid.textContent = '';
    this.cols = { cipher: [], key: [], res: [] };
    const row = (label, kind) => {
      const r = h('div', { class: `vrow ${kind}`, role: 'row' }, h('span', { class: 'vlabel', role: 'rowheader' }, label));
      for (let i = 0; i < snap.cipher.length; i++) {
        const cell = h('span', { class: 'vcell', role: 'cell' });
        this.cols[kind].push(cell);
        r.append(cell);
      }
      this.grid.append(r);
    };
    row('Messaggio', 'cipher'); row('Chiave', 'key'); row('Risultato', 'res');
    this.grid.style.setProperty('--n', snap.cipher.length);
    snap.cipher.split('').forEach((ch, i) => { this.cols.cipher[i].textContent = ch; this.cols.key[i].textContent = snap.keyExpanded[i]; });
  }

  /** @param {object} snap VigenereGame snapshot */
  update(snap) {
    this.snap = snap;
    const sig = `${snap.round}:${snap.cipher}:${snap.key}`;
    if (sig !== this.sig) { this.sig = sig; this._buildGrid(snap); this.feedback.textContent = ''; this.feedback.className = 'gv-feedback'; this.numbers.mark(); }

    this.title.textContent = `Round ${snap.round}/${snap.rounds} · ${snap.guided ? 'guidato' : 'NON guidato'} · chiave "${snap.key}"`;
    // guided: one letter at a time; not guided: the whole word, no explanations, no "Guidami"
    this.input.setAttribute('maxlength', String(snap.guided ? 1 : snap.cipher.length));
    this.input.setAttribute('placeholder', snap.guided ? '?' : 'parola');
    this.input.classList.toggle('wide', !snap.guided);
    this.answerLabel.textContent = snap.guided ? 'La lettera del risultato è:' : `Scrivi tutta la parola (${snap.cipher.length} lettere):`;
    this.btnGuide.classList.toggle('hidden', !snap.guided);
    this.intro.textContent = snap.intro;

    for (let i = 0; i < snap.cipher.length; i++) {
      const done = i < snap.step;
      const cell = this.cols.res[i];
      cell.textContent = done ? snap.answers[i] : '?';
      cell.classList.toggle('done', done);
      cell.classList.toggle('gold', snap.solved);
      for (const kind of ['cipher', 'key', 'res']) this.cols[kind][i].classList.toggle('active', snap.guided && i === snap.step && !snap.solved);
    }

    const e = snap.explain;
    this.explain.textContent = '';
    if (snap.solved) {
      this.explain.append(h('p', { class: 'vsolved' }, `✅ Messaggio decifrato: `, h('b', {}, snap.plain)));
    } else if (!snap.guided) {
      this.explain.append(
        h('p', { class: 'vstep-title' }, 'Prova senza aiuti 🕵️'),
        h('p', {}, 'Per ogni lettera: lettera cifrata − lettera della chiave (A = 0, B = 1, C = 2 …). Sotto zero? Aggiungi 26.'),
        h('p', {}, 'Scrivi la parola intera e premi CONTROLLA.'));
      this.numbers.mark();
    } else if (e && !this.busy) {
      this.explain.append(
        h('p', { class: 'vstep-title' }, `Passo ${snap.step + 1}: ${e.cipher} − ${e.key}`),
        h('p', {}, `${e.cipher} vale ${e.cipherIdx} e ${e.key} vale ${e.keyIdx} (A = 0, B = 1, C = 2 …).`),
        h('p', {}, `Parti da ${e.cipher} e torna indietro di ${e.keyIdx} lettere.`));
      this.numbers.mark(e.cipherIdx, -1, -1);
    }

    this.input.disabled = snap.solved || this.busy;
    this.btnCheck.disabled = snap.solved || this.busy;
    this.btnGuide.disabled = snap.solved || this.busy || !snap.guided;
    this.btnHint.disabled = snap.solved;
    this.btnNext.classList.toggle('hidden', !(snap.solved && !snap.finished));
    if (snap.solved && snap.finished && !this.feedback.textContent) this._say('🎉 Hai decifrato il Vigenère! Missione quasi compiuta, agente.', 'ok');
  }

  _say(text, kind = '') { this.feedback.textContent = text; this.feedback.className = `gv-feedback ${kind}`; }

  _check() {
    if (this.busy || !this.snap || this.snap.solved) return;
    const value = this.input.value;
    const res = this.gm.submit(value);
    this.sound.play(res.correct ? 'success' : 'wrong');
    this._say(`${res.correct ? '✅' : '❌'} ${res.message}`, res.correct ? 'ok' : 'bad');
    if (res.correct) this.input.value = '';
    else { this.input.classList.remove('shake'); void this.input.offsetWidth; this.input.classList.add('shake'); }
    if (this.input.focus) this.input.focus();
  }

  _hint() {
    const text = this.gm.hint();
    if (text) this._say(`💡 ${text}`, 'hint');
  }

  /** "Guidami": walk back on the numbered alphabet, show the full calculation, then fill the letter. */
  async _guide() {
    const snap = this.snap;
    if (this.busy || !snap || snap.solved || !snap.guided || !snap.explain) return;
    const e = snap.explain;
    this.busy = true;
    this.btnGuide.disabled = this.btnCheck.disabled = this.input.disabled = true;
    const delay = reducedMotion() ? 0 : 110;

    this.explain.textContent = '';
    this.explain.append(h('p', { class: 'vstep-title' }, `Passo ${snap.step + 1}: ${e.cipher} − ${e.key}`));
    const line = h('p', {}, `${e.cipher} = ${e.cipherIdx}, ${e.key} = ${e.keyIdx}. Torno indietro di ${e.keyIdx}…`);
    this.explain.append(line);

    this.numbers.mark(e.cipherIdx, e.cipherIdx, -1);
    for (let s = 1; s <= e.keyIdx; s++) {
      if (this.dead) return;
      this.numbers.mark(e.cipherIdx, ((e.cipherIdx - s) % 26 + 26) % 26, -1);
      this.sound.play('tick');
      if (delay) await sleep(delay);
    }
    if (this.dead) return;
    this.numbers.mark(e.cipherIdx, -1, e.resultIdx);
    line.textContent = e.wrapped
      ? `${e.cipherIdx} − ${e.keyIdx} = ${e.raw}: sotto zero, quindi +26 → ${e.resultIdx} = ${e.result}`
      : `${e.cipherIdx} − ${e.keyIdx} = ${e.resultIdx} = ${e.result}`;
    if (delay) await sleep(delay * 6);
    if (this.dead) return;

    this.busy = false;
    this.gm.invoke('solveStep');
    this.sound.play('success');
  }

  destroy() {
    this.dead = true;
    if (this.root) this.root.remove();
  }
}
