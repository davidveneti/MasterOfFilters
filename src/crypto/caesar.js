import { indexOf, letterAt } from './alphabet.js';

/**
 * Shift a single letter. Non-letters are returned unchanged.
 * @param {string} ch letter
 * @param {number} shift positive = forward in the alphabet
 */
export function shiftLetter(ch, shift) {
  const i = indexOf(ch);
  return i < 0 ? ch : letterAt(i + shift);
}

/** Caesar encryption: every letter moves `key` places forward. */
export function caesarEncrypt(text, key) {
  let out = '';
  for (const ch of text) out += shiftLetter(ch, key);
  return out;
}

/** Caesar decryption: every letter moves `key` places backward. */
export function caesarDecrypt(text, key) {
  return caesarEncrypt(text, -key);
}

/**
 * Letter-by-letter mapping used by the UI.
 * @returns {{from:string, to:string}[]} cipher letter -> decrypted letter
 */
export function caesarMapping(text, key) {
  return [...text].map((ch) => ({ from: ch, to: shiftLetter(ch, -key) }));
}

/** The whole alphabet mapping for a key: A->D, B->E, ... (encryption direction). */
export function alphabetMapping(key) {
  const out = [];
  for (let i = 0; i < 26; i++) out.push({ plain: letterAt(i), cipher: letterAt(i + key) });
  return out;
}
