import { indexOf, letterAt } from './alphabet.js';

/** Repeat the key so that it is as long as the text. */
export function expandKey(key, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += key[i % key.length];
  return out;
}

/** Vigenere encryption: plain[i] + key[i] (A = 0). */
export function vigenereEncrypt(text, key) {
  let out = '';
  for (let i = 0; i < text.length; i++) out += letterAt(indexOf(text[i]) + indexOf(key[i % key.length]));
  return out;
}

/** Vigenere decryption: cipher[i] - key[i]. */
export function vigenereDecrypt(text, key) {
  let out = '';
  for (let i = 0; i < text.length; i++) out += letterAt(indexOf(text[i]) - indexOf(key[i % key.length]));
  return out;
}

/**
 * Explains ONE decryption step, with every intermediate value the UI shows.
 * @returns {{cipher:string,key:string,cipherIdx:number,keyIdx:number,raw:number,wrapped:boolean,resultIdx:number,result:string}}
 */
export function decryptStep(cipherLetter, keyLetter) {
  const cipherIdx = indexOf(cipherLetter);
  const keyIdx = indexOf(keyLetter);
  const raw = cipherIdx - keyIdx;
  const wrapped = raw < 0;
  const resultIdx = wrapped ? raw + 26 : raw;
  return { cipher: cipherLetter, key: keyLetter, cipherIdx, keyIdx, raw, wrapped, resultIdx, result: letterAt(resultIdx) };
}
