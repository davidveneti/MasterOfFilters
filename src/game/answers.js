/**
 * Free-text answer matching for riddles.
 * Case, accents, punctuation, spaces and leading articles are ignored ("Il Tavolo da Lavoro!" = "tavolo da lavoro").
 */
const ARTICLES = new Set(['il', 'lo', 'la', 'le', 'gli', 'i', 'un', 'uno', 'una', 'l', 'the', 'a', 'an']);

/** @returns {string} canonical form: lowercase letters/digits only */
export function normalizeAnswer(text) {
  const s = String(text == null ? '' : text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`´]/g, ' ');
  const words = s.split(/[^a-z0-9]+/).filter(Boolean);
  while (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join('');
}

/** Levenshtein distance, early-exit above `max`. */
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * @param {string} input what the player typed
 * @param {string[]} answers accepted answers
 * @returns {boolean} true on exact match, or a 1-letter typo on answers of 6+ letters
 */
export function matchesAnswer(input, answers) {
  const x = normalizeAnswer(input);
  if (!x) return false;
  for (const a of answers) {
    const y = normalizeAnswer(a);
    if (x === y) return true;
    if (y.length >= 6 && editDistance(x, y, 1) <= 1) return true;
  }
  return false;
}
