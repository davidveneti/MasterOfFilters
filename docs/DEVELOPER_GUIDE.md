# Guida per sviluppatori

## Setup

```bash
npm install
npm run dev          # sviluppo
npm test             # test della logica di gioco (Node puro, senza browser)
```

Convenzioni: ES6 Modules con estensione `.js` negli import, JSDoc su classi e metodi pubblici, una responsabilità per file,
nessun DOM nei giochi, nessuna allocazione nei loop per frame, risorse sempre rilasciate in `dispose()`.

## Mappa dei file (dove mettere le mani)

| Voglio… | File |
|---|---|
| cambiare messaggi/livelli | `src/game/presets.js` |
| aggiungere / modificare i rebus di Minecraft | `src/content/riddles.js` |
| aggiungere un'icona pixel-art | `src/content/pixelArt.js` |
| aggiungere una missione | `src/game/missions.js` |
| aggiungere un badge | `src/game/badges.js` (+ regola in `BadgeSystem` se non è "missione → badge") |
| cambiare testi di "Spiegami" | `src/content/theory.js` |
| cambiare i colori del fumo / effetti per prova | `stages` in `src/game/missions.js` (+ palette in `LightningEyesFilter`) |
| cambiare grafica/temi | `src/ui/crypto.css` (variabili in `:root` e `:root[data-theme="light"]`) |
| aggiungere effetti ai filtri | `src/filters/*` + `this.listen(...)` |

## Aggiungere un nuovo minigioco (esempio: Atbash)

1. **Logica crittografica** (pura): `src/crypto/atbash.js`.
2. **Gioco**: `src/game/AtbashGame.js` che estende `BaseGame`.

```js
import { BaseGame } from './BaseGame.js';
import { GameEvents } from './events.js';

export class AtbashGame extends BaseGame {
  static meta = { id: 'atbash', name: 'Atbash' };
  initialize(saved = null) { /* leggi this.preset, ripristina `saved`, scegli il puzzle */ }
  checkSolution(input) {
    // se corretto: this.finished = true; this.emit(GameEvents.GAME_COMPLETE);
    return { correct: false, message: '…' };
  }
  getProgress() { return { completed: 0, total: 1, ratio: 0 }; }
  unlockReward() { return this.finished && !this.rewardClaimed ? (this.rewardClaimed = true, { type: 'game-complete' }) : null; }
  getSnapshot() { return { game: 'atbash', /* dati per la UI; NON includere la soluzione */ }; }
  serialize() { return { /* JSON-safe */ }; }
}
```

3. **Preset**: aggiungi `ATBASH_PRESETS` in `presets.js`.
4. **Registrazione**: in `src/game/index.js` → `games.registerGame(AtbashGame, ATBASH_PRESETS)`.
5. **Vista**: `src/ui/views/AtbashView.js` con `mount(container)`, `update(snapshot)`, `destroy()`;
   registrala in `VIEWS` di `src/ui/panels/MissionPanel.js`. Parla con il gioco solo tramite `gm.submit/hint/advance/invoke`.
6. **Missione**: aggiungi una fase `{ id, game: 'atbash', preset: 'x', title }` a una missione.

### Regole del contratto `BaseGame`

| Metodo | Obbligo |
|---|---|
| `initialize(saved)` | idempotente; accetta `null`; valida `saved` (può essere corrotto) |
| `start()` | emette il primo `GAME_STATE` (la base class lo fa) |
| `update(dt)` | solo timer/animazioni di logica |
| `checkSolution(input)` | restituisce `{correct, message}`; emette `GAME_WRONG` / `GAME_LEVEL_COMPLETE` / `GAME_COMPLETE` |
| `getProgress()` | `{completed, total, ratio}` |
| `static trialCount(preset)` · `getTrials()` | quante prove (livelli/round) ha il gioco e quante sono superate: alimentano gli stadi |
| `unlockReward()` | una sola volta (`rewardClaimed`) |
| `reset()` | riparte da zero |
| `getSnapshot()` | oggetto semplice; la soluzione compare solo quando `solved` |
| `serialize()` | JSON-safe; è ciò che finisce in localStorage |

Nota: `GAME_COMPLETE` si emette **al posto di** `GAME_LEVEL_COMPLETE` sull'ultimo livello.

## Aggiungere un filtro

1. `src/filters/MyFilter.js` (estende `BaseFilter`, con `static meta` e `static settings`).
2. Aggiungilo a `ALL_FILTERS` in `src/filters/index.js`. Galleria e pannello impostazioni lo mostrano da soli.
3. Risorse: figli di `this.root` (auto-dispose), `this.track(obj)` per oggetti con `dispose()`,
   `this.acquire(key, factory)` per risorse condivise a conteggio.
4. Eventi: `this.listen(GameEvents.REWARD, fn)` (si disiscrive da solo).

## Aggiungere un rebus

Un rebus è un oggetto in `src/content/riddles.js` (stadio 1, 2 o 3 = difficoltà crescente):

```js
{ id: 't1-torcia',                         // unico
  q: 'Carbone sopra a un bastoncino: cosa fai?',
  v: [G(cl, '', '', st, '', '', '', '', '')],   // immagine: righe di token, oppure G(...9 celle) = griglia di crafting
  a: ['torcia', 'torce', 'torch'],          // risposte accettate (la 1ª è quella mostrata a rebus risolto)
  h: ['indizio 1', 'indizio 2', 'quasi la risposta'] }   // sempre 3, dal più vago al più esplicito
```

Token: `'px:creeper'` icona pixel-art · `'t:testo'` etichetta · `'?'` l'incognita · `+ → =` operatori · qualsiasi altra cosa = emoji.
`npm test` controlla da solo: ≥ 20 rebus per stadio, id unici, icone esistenti, 3 indizi, un "?" nell'immagine, risposte uniche nello stadio e
**nessuno spoiler** (la risposta non deve comparire nella domanda né nei primi due indizi).

Per un nuovo stadio: aggiungi un tier in `RIDDLE_PRESETS` (`presets.js`) e uno stadio in `stages` della missione `dragon-evolution`.

## Far reagire un filtro al progresso (stadi)

```js
// src/game/missions.js: la missione dichiara gli stadi (indice = prove superate)
stages: [{ name: 'Bianco', css: '#fff', tint: [1,1,1] }, { name: 'Giallo', css: '#ffd83d', tint: [1,.86,.15] }, /* … */]

// nel filtro
_syncStage() {
  const st = this.ctx.games && this.ctx.games.getStage();      // null se non c'è missione
  if (st && st.missionId === 'smoke-decoder') this.target = st.data.tint;
}
initialize() { /* … */ this._syncStage(); this.listen(GameEvents.GAME_STATE, () => this._syncStage()); }
```

Sincronizza su `GAME_STATE`, `GAME_LEVEL_COMPLETE` e `GAME_COMPLETE`; gli stadi sono dati, quindi aggiungere una prova
significa aggiungere un livello/round nel preset e uno stadio in `stages`.

## Collegare un filtro a una missione

```js
// src/game/missions.js
{ id: 'my-mission', filterId: 'my-filter', title: '…', subtitle: '…', badgeId: 'my-badge',
  phases: [{ id: 'p1', game: 'caesar', preset: 'myPreset', title: '…' }] }
```

Il `GameManager` la avvia da solo quando quel filtro diventa attivo e la ferma quando non lo è più.

## Eventi: ascoltare e pubblicare

```js
const off = ctx.events.on(GameEvents.REWARD, ({ kind }) => { /* … */ });
ctx.events.emit('mio:evento', { dato: 1 });   // un handler che lancia non blocca gli altri
```

`ctx.events.on('*', ({type, payload}) => …)` riceve tutto (utile per debug).

## Persistenza

```js
store.getMission(id) / saveMission(id, data) / resetMission(id)
store.hasBadge(id) / earnBadge(id)
store.getPref(key) / setPref(key, value)
store.resetProgress()    // missioni + badge, tiene le preferenze
```

Se cambi la forma dei dati incrementa `VERSION` in `ProgressStore.js`: i vecchi salvataggi tornano ai default.

## Componenti UI riutilizzabili

| Componente | Uso |
|---|---|
| `dom.js` (`h`, `clear`, `formatDate`) | creare DOM senza framework |
| `Modal` | finestre (Trofei, Spiegami) |
| `ProgressBar`, `Toast`, `BadgePopup` (con coda) | feedback |
| `CipherWheel`, `AlphabetStrip`, `NumberStrip`, `LetterRow` | visualizzazioni didattiche |

Nelle viste **non ricreare** il DOM a ogni `update()`: costruiscilo in `mount()` e aggiorna solo ciò che cambia
(altrimenti lo slider perde il trascinamento).

## Test e verifiche eseguite

- `npm test`: logica di gioco (livelli, fasi, badge, ripristino, storage corrotto).
- Verifica in fase di sviluppo con DOM simulato: Smoke Decoder (5 prove, colori del fumo), Secret Agent (4 prove, occhi
  blu → viola → rosso + Power Up), round guidati e non guidati, popup badge in coda, tema, suono, ripristino/reset,
  60 cambi filtro senza leak di listener/cache.
- **Non testato in un browser reale** da questo ambiente: provare webcam, rendering WebGL e layout su desktop e telefono.

## Debug

⚙ → **Toggle Debug**: landmark, punti tracciati, FPS e contatori GPU (`geometries`, `textures`, `cache`).
Dalla console: gli eventi si possono osservare con `ctx.events.on('*', console.log)` (aggiungi temporaneamente in `main.js`).
