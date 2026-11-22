/** Alphabet helpers. The game uses the 26 letters A-Z only (A = 0 ... Z = 25). */
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const SIZE = 26;

/** @param {string} ch single uppercase letter @returns {number} 0..25, or -1 if not a letter */
export const indexOf = (ch) => ALPHABET.indexOf(ch);

/** @param {number} n any integer @returns {string} letter at position n (wraps around) */
export const letterAt = (n) => ALPHABET[((n % SIZE) + SIZE) % SIZE];

/** Uppercase and strip everything that is not A-Z. */
export const normalize = (text) => String(text || '').toUpperCase().replace(/[^A-Z]/g, '');
