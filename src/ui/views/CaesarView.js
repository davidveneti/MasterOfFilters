import { h, sleep, reducedMotion } from '../dom.js';
import { LetterRow } from '../components/LetterRow.js';
import { CipherWheel } from '../components/CipherWheel.js';
import { AlphabetStrip } from '../components/AlphabetStrip.js';

/**
 * View of CaesarGame. Builds its DOM once and then only patches it, so the
 * slider keeps working smoothly while the game state changes under it.
 * Talks to the game only through GameManager (gm).
 */
export class CaesarView {
  /** @param {{gm: import('../../game/GameManager.js').GameManager, sound: import('../../core/SoundFx.js').SoundFx}} deps */
  constructor({ gm, sound }) {
    this.gm = gm;
    this.sound = sound;
    this.busy = false;
    this.dead = false;
    this.level = -1;
    this.activeCipher = null;
    this.snap = null;
  }

  mount(container) {
    this.title = h('h3', { class: 'gv-title' });
    this.intro = h('p', { class: 'gv-intro' });
    this.keyInfo = h('p', { class: 'gv-keyinfo' });
    this.row = new LetterRow();
    this.wheel = new CipherWheel();
    this.strip = new AlphabetStrip();

    this.slider = h('input', { type: 'range', min: 1, max: 10, step: 1, value: 1, 'aria-label': 'Chiave di rotazione', dataset: { role: 'slider' } });
    this.keyVal = h('output', { class: 'gv-keyval' }, '1');
    this.slider.addEventListener('input', () => {
      this.sound.play('tick');
      this.gm.invoke('setKey', Number(this.slider.value));
    });

    this.previewText = h('div', { class: 'gv-preview-text', 'aria-live': 'polite' });
    this.preview = h('div', { class: 'gv-preview' }, h('span', { class: 'gv-label' }, 'Anteprima'), this.previewText);

    this.btnDecrypt = h('button', { class: 'btn primary', type: 'button', dataset: { role: 'decrypt' }, onClick: () => this._decrypt() }, 'DECRIPTA');
    this.btnHint = h('button', { class: 'btn', type: 'button', dataset: { role: 'hint' }, onClick: () => this._hint() }, '💡 Suggerimento');
    this.btnNext = h('button', { class: 'btn accent hidden', type: 'button', onClick: () => this.gm.advance() }, 'Livello successivo →');
    this.feedback = h('p', { class: 'gv-feedback', role: 'status', 'aria-live': 'polite' });

    this.tabs = h('div', { class: 'seg', role: 'tablist' },
      h('button', { type: 'button', class: 'on', onClick: (e) => this._tab('wheel', e.currentTarget) }, 'Ruota'),
      h('button', { type: 'button', onClick: (e) => this._tab('strip', e.currentTarget) }, 'Alfabeto'));

    this.visual = h('div', { class: 'gv-visual', dataset: { tab: 'wheel' } }, this.wheel.el, this.strip.el);
    this.root = h('div', { class: 'gv caesar' },
      this.title, this.intro,
      h('span', { class: 'gv-label' }, 'Messaggio cifrato'), this.row.el,
      this.keyInfo,
      h('label', { class: 'gv-slider' }, h('span', { class: 'gv-label' }, 'Chiave'), this.slider, this.keyVal),
      this.tabs, this.visual,
      this.preview,
      h('div', { class: 'btn-row' }, this.btnDecrypt, this.btnHint),
      this.btnNext, this.feedback);
    container.append(this.root);
  }

  _tab(name, btn) {
    this.visual.dataset.tab = name;
    [...this.tabs.children].forEach((b) => b.classList.toggle('on', b === btn));
    this.wheel.draw();
  }

  /** @param {object} snap CaesarGame snapshot */
  update(snap) {
    this.snap = snap;
    const newLevel = snap.level !== this.level || snap.cipher !== this.row.cipher;
    if (newLevel) { this.feedback.textContent = ''; this.feedback.className = 'gv-feedback'; this.level = snap.level; }
    this.title.textContent = `${snap.title}`;
    this.intro.textContent = snap.intro;

    const rebuilt = this.row.setCipher(snap.cipher);
    const [lo, hi] = snap.keyRange;
    if (this.slider.min !== String(lo)) this.slider.min = lo;
    if (this.slider.max !== String(hi)) this.slider.max = hi;
    if (Number(this.slider.value) !== snap.sliderKey) this.slider.value = snap.sliderKey;
    this.slider.disabled = snap.solved;
    this.keyVal.textContent = snap.sliderKey;
    this.keyInfo.textContent = snap.keyShown != null
      ? `🔑 La chiave di questo messaggio è ${snap.keyShown}. Impostala con lo slider!`
      : `🔒 Chiave nascosta: è un numero da ${lo} a ${hi}. Trovala tu!`;

    this.row.setPreview(snap.preview, snap.solved);
    this.previewText.textContent = [...snap.preview].join(' ');
    this.preview.classList.toggle('ok', snap.solved);
    this.wheel.setShift(snap.sliderKey, !rebuilt);
    this.strip.update(snap.sliderKey, snap.cipher, this.activeCipher);

    this.btnDecrypt.disabled = snap.solved || this.busy;
    this.btnHint.disabled = snap.solved;
    this.btnNext.classList.toggle('hidden', !(snap.solved && !snap.finished));
    this.btnNext.textContent = snap.level < snap.levels ? `Livello ${snap.level + 1} →` : 'Avanti →';
    if (snap.solved && snap.finished && !this.feedback.textContent) this._say(`🎉 Messaggio decifrato: "${snap.plain}". Hai completato tutti i livelli!`, 'ok');
  }

  _say(text, kind = '') {
    this.feedback.textContent = text;
    this.feedback.className = `gv-feedback ${kind}`;
  }

  _hint() {
    const text = this.gm.hint();
    if (text) this._say(`💡 ${text}`, 'hint');
  }

  /** Animate the decoding letter by letter (wheel + strip + message), then check. */
  async _decrypt() {
    const snap = this.snap;
    if (this.busy || !snap || snap.solved) return;
    this.busy = true;
    this.btnDecrypt.disabled = true;
    const delay = reducedMotion() ? 0 : 140;
    const key = snap.sliderKey;
    for (let i = 0; i < snap.cipher.length; i++) {
      if (this.dead) return;
      this.row.highlight(i);
      this.wheel.highlight(snap.preview[i]);
      this.activeCipher = snap.cipher[i];
      this.strip.update(key, snap.cipher, this.activeCipher);
      this.sound.play('tick');
      if (delay) await sleep(delay);
    }
    if (this.dead) return;
    this.row.highlight(-1);
    this.wheel.highlight(null);
    this.activeCipher = null;
    this.busy = false;

    const res = this.gm.submit({ key });
    this.sound.play(res.correct ? 'success' : 'wrong');
    this._say(`${res.correct ? '✅' : '❌'} ${res.message}`, res.correct ? 'ok' : 'bad');
    if (!res.correct) {
      this.preview.classList.remove('shake'); void this.preview.offsetWidth; this.preview.classList.add('shake');
      this.btnDecrypt.disabled = false;
    }
  }

  destroy() {
    this.dead = true;
    this.wheel.destroy();
    if (this.root) this.root.remove();
  }
}
