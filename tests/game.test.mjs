// Game-logic tests (pure Node, no browser):  npm test
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/EventBus.js';
import { ProgressStore } from '../src/storage/ProgressStore.js';
import { createGameLayer } from '../src/game/index.js';
import { GameEvents as E } from '../src/game/events.js';

const mem = new Map();
const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };

function boot() {
  const bus = new EventBus(), store = new ProgressStore(storage);
  const listeners = new Map();
  const fm = { on: (e, f) => { listeners.set(e, f); return () => {}; } };
  const layer = createGameLayer({ filterManager: fm, bus, store });
  const switchTo = (id) => listeners.get('change')(id ? { constructor: { meta: { id } } } : null);
  return { bus, store, layer, switchTo };
}
const solve = (gm) => { const g = gm.game; g.setKey(g.current.key); return gm.submit(); };

let { bus, store, layer, switchTo } = boot();
const log = [];
bus.on('*', ({ type }) => log.push(type));

// ---------------------------------------------------------------- Smoke Decoder: 5 trials, 6 smoke colors
switchTo('hookah');
let gm = layer.games, st = gm.getStage();
assert.equal(gm.getSnapshot().game.cipher, 'KHOOR');
assert.equal(gm.getSnapshot().game.keyShown, 3);
assert.deepEqual([st.index, st.name, st.done, st.total], [0, 'Bianco', 0, 5]);

gm.game.setKey(1); assert.equal(gm.submit().correct, false);
assert.equal(gm.getStage().index, 0, 'a wrong answer does not change the color');
gm.game.setKey(3); assert.equal(gm.game.getPreview(), 'HELLO');
assert.equal(gm.submit().correct, true);

const expected = ['Bianco', 'Giallo', 'Rosso', 'Verde', 'Blu', 'Viola'];
assert.equal(gm.getStage().name, 'Giallo');                           // level 1 passed -> yellow
const ranges = [[1, 10], [1, 5], [1, 10], [1, 15], [1, 25]];
for (let lv = 1; lv <= 5; lv++) {
  if (lv > 1) {
    assert.equal(gm.advance(), 'level');
    const sn = gm.getSnapshot().game;
    assert.equal(sn.level, lv); assert.equal(sn.keyShown, null);
    assert.deepEqual(sn.keyRange, ranges[lv - 1]);
    assert.ok(gm.game.current.key >= ranges[lv - 1][0] && gm.game.current.key <= ranges[lv - 1][1]);
    assert.equal(gm.getStage().name, expected[lv - 1], 'color before solving level ' + lv);
    assert.equal(solve(gm).correct, true);
  }
  assert.equal(gm.getStage().name, expected[lv], `after trial ${lv}`);
}
assert.equal(gm.getStage().last, true);
assert.ok(store.hasBadge('smoke-decoder')); assert.ok(!store.hasBadge('crypto-apprentice'));
assert.ok(log.includes(E.BADGE_UNLOCKED) && log.includes(E.REWARD));
assert.equal(gm.getSnapshot().trials.done, 5);
console.log('Smoke Decoder: 5 trials, colors', expected.join(' > '), 'OK');

// restore from storage
({ bus, store, layer, switchTo } = boot()); gm = layer.games;
switchTo('hookah');
assert.equal(gm.getSnapshot().completed, true); assert.equal(gm.getStage().name, 'Viola');
console.log('restore OK');

// ---------------------------------------------------------------- Secret Agent: 4 trials
switchTo('lightning-eyes'); gm = layer.games;
let s = gm.getSnapshot(), expectedFx = ['blue', 'purple', 'red', 'red', 'red'];
assert.equal(s.game.cipher, 'PHVVDJJLR'); assert.equal(s.trials.total, 4);
assert.equal(gm.getStage().data.effect, 'blue');                       // eyes start blue
gm.game.setKey(3); assert.equal(gm.game.getPreview(), 'MESSAGGIO');
assert.equal(gm.submit().correct, true);
assert.equal(gm.getStage().data.effect, 'purple');                      // Caesar passed -> purple
assert.equal(gm.advance(), 'phase');

let v = gm.game; assert.equal(v.constructor.meta.id, 'vigenere');
assert.equal(v.getSnapshot().guided, true); assert.equal(v.getSnapshot().cipher, 'UWLS');
assert.equal(gm.submit('x').correct, false);
assert.equal(gm.submit('C').correct, true); assert.equal(v.solveStep().result, 'I');
assert.equal(gm.submit('AO').correct, false);
assert.equal(gm.submit('A').correct, true); assert.equal(gm.submit('O').correct, true);
assert.equal(gm.getStage().data.effect, 'red');                         // guided Vigenere passed -> red
assert.equal(gm.getStage().done, 2); assert.equal(gm.getStage().last, false);
assert.equal(gm.advance(), 'level');

// round 2: NOT guided
let sn = v.getSnapshot();
assert.equal(sn.guided, false); assert.equal(sn.explain, null); assert.equal(sn.keyExpanded, 'LUNALU');
assert.equal(v.solveStep(), null, 'no "Guidami" in unguided rounds');
assert.equal(gm.submit('A').correct, false, 'single letters are not accepted when unguided');
assert.match(gm.submit('AG').message, /tutta la parola/);
assert.equal(gm.submit('XXXXXX').correct, false);
assert.match(gm.hint(), /lettera cifrata/);
assert.equal(gm.submit('AGENTE').correct, true);
assert.equal(gm.getStage().done, 3); assert.equal(gm.getStage().last, false);
assert.equal(gm.advance(), 'level');

// round 3 (4th trial): last unguided -> mission complete -> Power Up stage
sn = v.getSnapshot(); assert.equal(sn.guided, false); assert.equal(sn.keyExpanded, 'ROMAROM');
assert.equal(gm.getStage().data.powerUp, undefined);
assert.equal(gm.submit('SEGRETO').correct, true);
st = gm.getStage();
assert.equal(st.done, 4); assert.equal(st.last, true); assert.equal(st.data.powerUp, true);
assert.ok(store.hasBadge('secret-agent') && store.hasBadge('crypto-apprentice'));
console.log('Secret Agent: eyes', expectedFx.join(' > '), '+ Power Up on trial 4 OK');

// ---------------------------------------------------------------- Dragon Evolution: 3 riddles, 4 forms
switchTo('dragon-pet'); gm = layer.games;
let ds = gm.getStage();
assert.deepEqual([ds.missionId, ds.index, ds.total, ds.data.form], ['dragon-evolution', 0, 3, 'egg']);
assert.equal(gm.getSnapshot().game.game, 'riddle'); assert.equal(gm.getSnapshot().stages.length, 4);
gm.advance(); assert.equal(gm.getStage().index, 0, 'advance() does nothing before solving: stages cannot be skipped');
assert.equal(gm.submit('risposta sbagliata xyz').correct, false);
assert.equal(gm.getStage().index, 0, 'a wrong answer does not evolve the dragon');
const forms = ['egg', 'hatchling', 'winged', 'legendary'];
for (let i = 1; i <= 3; i++) {
  assert.equal(gm.submit(gm.game.current.a[0]).correct, true);
  assert.equal(gm.getStage().data.form, forms[i], 'after riddle ' + i);
  if (i < 3) assert.equal(gm.advance(), 'level');
}
assert.equal(gm.getStage().last, true); assert.ok(store.hasBadge('dragon-keeper'));
assert.equal(store.getBadges()['dragon-keeper'].earnedAt.length > 10, true);
assert.equal(layer.badges.get('dragon-keeper').delayMs > 0, true);
// the saved state restores the final form
({ bus, store, layer, switchTo } = boot()); gm = layer.games; switchTo('dragon-pet');
assert.equal(layer.games.getStage().data.form, 'legendary'); assert.equal(layer.games.getSnapshot().completed, true);
console.log('Dragon Evolution: egg > hatchling > winged > legendary, no skipping, persisted OK');

// ---------------------------------------------------------------- old/short saves & misc
switchTo('power-up'); assert.equal(gm.getSnapshot(), null); assert.equal(gm.getStage(), null);
mem.set('ar-crypto-progress-v1', JSON.stringify({ v: 1, missions: { 'smoke-decoder': { phaseIndex: 0, completed: true, phases: { caesar: { levelIndex: 2, completed: [0, 1, 2], solved: true, current: { plain: 'MISSIONE', key: 4 }, sliderKey: 4 } } } }, badges: {}, prefs: {} }));
({ bus, store, layer, switchTo } = boot()); switchTo('hookah');
assert.equal(layer.games.getSnapshot().completed, false, 'a 3-level save is no longer "completed" with 5 levels');
assert.equal(layer.games.getStage().name, 'Verde'); // 3 trials done
assert.equal(layer.games.advance(), 'level');       // and it can continue to level 4
mem.set('ar-crypto-progress-v1', '{{{bad'); assert.deepEqual(new ProgressStore(storage).getBadges(), {});
console.log('migration of short saves + corrupt storage OK');
console.log('all game logic tests passed');
