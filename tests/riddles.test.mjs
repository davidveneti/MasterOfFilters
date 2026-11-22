// Riddle data + RiddleGame tests (pure Node):  npm test
import assert from 'node:assert/strict';
import { RIDDLES } from '../src/content/riddles.js';
import { ICONS, validateIcons } from '../src/content/pixelArt.js';
import { normalizeAnswer, matchesAnswer } from '../src/game/answers.js';
import { EventBus } from '../src/core/EventBus.js';
import { RiddleGame } from '../src/game/RiddleGame.js';
import { RIDDLE_PRESETS } from '../src/game/presets.js';

// ------------------------------------------------------------------ icons
assert.deepEqual(validateIcons(), [], 'pixel icons are well formed');

// ------------------------------------------------------------------ riddle data
const OPS = new Set(['+', '→', '=', '≠', '?']);
const errors = [];
const ids = new Set();
for (const tier of [1, 2, 3]) {
  const list = RIDDLES[tier];
  assert.ok(list.length >= 20, `tier ${tier} has ${list.length} riddles (need >= 20)`);
  const tierAnswers = new Map();
  for (const r of list) {
    const where = `${r.id}`;
    if (ids.has(r.id)) errors.push(`${where}: duplicate id`); ids.add(r.id);
    if (!r.q || typeof r.q !== 'string') errors.push(`${where}: missing question`);
    if (!Array.isArray(r.v) || !r.v.length) errors.push(`${where}: missing visual`);
    if (!Array.isArray(r.a) || !r.a.length) errors.push(`${where}: no answers`);
    if (!Array.isArray(r.h) || r.h.length !== 3 || r.h.some((x) => !x || typeof x !== 'string')) errors.push(`${where}: needs exactly 3 hints`);

    let hasUnknown = false;
    const labels = [];
    for (const row of r.v) {
      const tokens = Array.isArray(row) ? row : row && row.grid;
      if (!tokens) { errors.push(`${where}: bad row`); continue; }
      if (!Array.isArray(row) && tokens.length !== 9) errors.push(`${where}: grid must have 9 cells`);
      if (!Array.isArray(row) && row.result === '?') hasUnknown = true;
      for (const t of tokens) {
        if (t === '?') hasUnknown = true;
        if (typeof t !== 'string') errors.push(`${where}: token is not a string`);
        else if (t.startsWith('px:') && !ICONS[t.slice(3)]) errors.push(`${where}: unknown icon ${t}`);
        else if (t.startsWith('t:')) labels.push(normalizeAnswer(t.slice(2)));
      }
    }
    // numeric/choice riddles ("Quale di questi...") don't need a "?" box; the others must have one
    if (!hasUnknown && !/^Quale|^Come si chiama|^In quale/.test(r.q)) errors.push(`${where}: no "?" in the picture`);

    // answers: unique inside the tier, and no spoilers
    const nq = normalizeAnswer(r.q);
    r.a.forEach((a) => {
      const na = normalizeAnswer(a);
      if (!na) errors.push(`${where}: empty answer`);
      if (tierAnswers.has(na) && tierAnswers.get(na) !== r.id) errors.push(`${where}: answer "${a}" is also used by ${tierAnswers.get(na)}`);
      tierAnswers.set(na, r.id);
      if (na.length >= 4) {
        if (nq.includes(na)) errors.push(`${where}: answer "${a}" appears in the question`);
        if (labels.some((l) => l.includes(na))) errors.push(`${where}: answer "${a}" appears in a label`);
        r.h.slice(0, 2).forEach((h, i) => { if (normalizeAnswer(h).includes(na)) errors.push(`${where}: answer "${a}" appears in hint ${i + 1}`); });
      }
    });
    // the first (canonical) answer must match itself
    assert.ok(matchesAnswer(r.a[0], r.a), `${where}: canonical answer not accepted`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`riddle data OK: ${RIDDLES[1].length}/${RIDDLES[2].length}/${RIDDLES[3].length} riddles, ${ids.size} unique ids, no spoilers`);

// ------------------------------------------------------------------ answer matching
assert.equal(normalizeAnswer('  L\'ENDER!  '), 'ender');
assert.equal(normalizeAnswer('Il Tavolo da Lavoro'), 'tavolodalavoro');
assert.equal(normalizeAnswer('città dell\'End'), 'cittadellend');
assert.equal(matchesAnswer('creper', ['creeper']), true, '1-letter typo accepted on long words');
assert.equal(matchesAnswer('letta', ['letto']), false, 'short words must be exact');
assert.equal(matchesAnswer('', ['x']), false);

// ------------------------------------------------------------------ game
const bus = new EventBus(); const log = []; bus.on('*', ({ type }) => log.push(type));
const preset = RIDDLE_PRESETS.minecraftRebus;
const g = new RiddleGame({ bus, preset }); g.initialize(null); g.start();
assert.equal(RiddleGame.trialCount(preset), 3);

// the right riddle pool is served per tier, and the solution is never in the snapshot
let snap = g.getSnapshot();
assert.equal(snap.level, 1); assert.ok(RIDDLES[1].some((r) => r.id === snap.riddleId));
assert.equal(snap.answer, null); assert.equal(JSON.stringify(snap).includes('"a":'), false);
assert.deepEqual(snap.hints, []);

// wrong answers -> progressive hints
const first = g.current;
assert.equal(g.checkSolution('   ').correct, false);
assert.equal(g.checkSolution('zzzz').correct, false); assert.equal(g.getSnapshot().hints.length, 1);
assert.equal(g.getSnapshot().hints[0], first.h[0]);
assert.equal(g.checkSolution('qqqq').correct, false); assert.equal(g.getSnapshot().hints.length, 2);
assert.equal(g.swap(), false, 'cannot swap before seeing every hint');
assert.equal(g.hint(), first.h[2]); assert.equal(g.getSnapshot().hints.length, 3);
assert.equal(g.getSnapshot().canSwap, true);
assert.match(g.hint(), /già visto/);

// no skipping: advance() does nothing until solved
g.advance(); assert.equal(g.getSnapshot().level, 1);

// swap = another riddle of the SAME tier
assert.equal(g.swap(), true); const second = g.current;
assert.notEqual(second.id, first.id); assert.ok(RIDDLES[1].includes(second));
assert.equal(g.getSnapshot().hints.length, 0);

// persistence: same riddle after restore
const saved = JSON.parse(JSON.stringify(g.serialize()));
const g2 = new RiddleGame({ bus: new EventBus(), preset }); g2.initialize(saved);
assert.equal(g2.current.id, second.id);

// solve stage 1 (typo + article + capitals tolerated)
const res = g.checkSolution('  Il ' + second.a[0].toUpperCase() + '  ');
assert.equal(res.correct, true); assert.equal(g.getSnapshot().solved, true);
assert.ok(g.getSnapshot().answer); assert.ok(log.includes('game:levelComplete'));
assert.equal(g.getTrials().done, 1);
g.advance(); snap = g.getSnapshot();
assert.equal(snap.level, 2); assert.ok(RIDDLES[2].some((r) => r.id === snap.riddleId));

// play all tiers many times: random but always from the right pool, no repeats inside a run
const seenAll = new Set();
for (let run = 0; run < 30; run++) {
  const x = new RiddleGame({ bus: new EventBus(), preset }); x.initialize(null);
  for (let t = 1; t <= 3; t++) {
    assert.ok(RIDDLES[t].includes(x.current), `run ${run}: tier ${t} riddle comes from the tier pool`);
    seenAll.add(x.current.id);
    assert.equal(x.checkSolution(x.current.a[x.current.a.length - 1]).correct, true);
    if (t < 3) x.advance();
  }
  assert.equal(x.finished, true); assert.ok(x.unlockReward()); assert.equal(x.unlockReward(), null);
}
assert.ok(seenAll.size > 15, `riddles vary between runs (${seenAll.size} different ones seen)`);

// swapping through a whole tier never repeats until the pool is exhausted
const y = new RiddleGame({ bus: new EventBus(), preset }); y.initialize(null);
const served = [y.current.id];
for (let i = 0; i < RIDDLES[1].length - 1; i++) { y.hintsShown = 3; y.swap(); served.push(y.current.id); }
assert.equal(new Set(served).size, RIDDLES[1].length, 'every riddle of the tier served once before any repeat');
console.log('RiddleGame OK (random per tier, progressive hints, no skipping, swap, persistence)');
