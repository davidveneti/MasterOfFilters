# Architettura

La Crypto Edition **estende** l'architettura esistente (FilterManager, BaseFilter, ctx, loop) senza
sostituirla. Nuovi strati: `EventBus`, `GameManager`, giochi, `ProgressStore`, `AppUI`.

## 1. Livelli

```
┌──────────────────────────────────────────────────────────────┐
│ UI            AppUI · MissionPanel · viste · pannelli        │  DOM
├──────────────────────────────────────────────────────────────┤
│ FilterManager  registra, attiva, disattiva i filtri          │  esistente
├──────────────────────────────────────────────────────────────┤
│ GameManager    missioni, fasi, persistenza, ricompense       │  NUOVO
├──────────────────────────────────────────────────────────────┤
│ CaesarGame · VigenereGame · RiddleGame (logica pura, no DOM) │  NUOVO
├──────────────────────────────────────────────────────────────┤
│ Renderer       Three.js (#scene) + Canvas 2D (#overlay)      │  esistente
└──────────────────────────────────────────────────────────────┘
```

Il `GameManager` non è nel percorso di rendering: osserva il `FilterManager` (evento `change`)
e pubblica eventi. Così UI e filtri restano disaccoppiati dai giochi.

## 2. Flusso dei dati

```
 gallery click
     │
     ▼
 FilterManager.activate(id) ── dispose(filtro vecchio) ── initialize(filtro nuovo)
     │  emit 'change'
     ▼
 GameManager._onFilterChange ── mission = getMissionForFilter(id)
     │ si → startMission()  ── ProgressStore.getMission() ── game.initialize(saved) ── game.start()
     │ no → stopMission()
     ▼
 EventBus: MISSION_START · MISSION_PHASE · GAME_STATE
     ├──► AppUI/MissionPanel   (ridisegna, coalescendo in 1 rAF)
     └──► Filtro attivo        (this.listen: lettere nel fumo, picchi di fulmini)
```

Azione del giocatore:

```
 slider/bottone ──► View ──► gm.invoke('setKey') / gm.submit() / gm.hint() / gm.advance()
                              │
                              ▼
                         game.checkSolution()  ── emit GAME_WRONG | GAME_LEVEL_COMPLETE | GAME_COMPLETE
                              │
                              ▼
        GameManager: persist ── REWARD(level|phase) ── MISSION_COMPLETE
                              │
                              ▼
        BadgeSystem: ProgressStore.earnBadge ── BADGE_UNLOCKED + REWARD(badge)
                              │
                              ▼
        UI: popup badge, suono, toast        Filtri: particelle dorate, fumo colorato
```

## 3. Event system

Il bus (`core/EventBus.js`) è unico (`ctx.events`). Catalogo in `src/game/events.js`:

| Evento | Payload | Emesso da | Ascoltato da |
|---|---|---|---|
| `mission:start` / `mission:stop` | `{mission}` / `{missionId}` | GameManager | AppUI |
| `mission:phase` | `{mission, phaseIndex, phase}` | GameManager | – |
| `mission:phaseUnlocked` | `{mission, nextPhaseIndex}` | GameManager | AppUI, Lightning Eyes |
| `mission:complete` | `{mission}` | GameManager | BadgeSystem |
| `game:state` | `{snapshot}` | giochi | MissionPanel, Hookah |
| `game:wrong` / `game:step` | `{snapshot, …}` | giochi | AppUI, Lightning Eyes |
| `game:levelComplete` / `game:complete` | `{snapshot}` | giochi | GameManager, AppUI, filtri |
| `reward` | `{kind: level\|phase\|badge, …}` | GameManager, BadgeSystem | filtri |
| `badge:unlocked` | `{badge}` | BadgeSystem | AppUI (popup + suono) |

`FilterManager.on('change'|'error')` resta com'era: è l'API locale del manager.

## 4. Pipeline di rendering (invariata)

```
 video (#video, specchiato)
   └► #scene    WebGL: hookah, tubo, fumo, particelle (Three.js, camera ortografica in pixel)
       └► #overlay  Canvas 2D: HUD, fulmini, testo, lettere nel fumo
           └► #debug    landmark e punti tracciati
 ──────────────────────────────────────────────────────────
 DOM sopra tutto: galleria, impostazioni, toolbar, pannello missione, modali
```

Hookah ora ha `usesOverlay: true` per disegnare le lettere nel fumo: il manager pulisce l'overlay
a ogni frame solo per i filtri che lo usano.

## 5. Loop

`main.js → frame()`:

```
 face/mouth update → games.update(dt) → manager.update → manager.render → renderer.render → debug
```

`games.update(dt)` è un no-op quando il filtro attivo non ha missione.

## 6. Persistenza

| Chiave localStorage | Contenuto | Modulo |
|---|---|---|
| `ar-settings-v2:<filterId>` | impostazioni del filtro | `settingsStore.js` (esistente) |
| `ar-globals-v2` | soglia bocca, debug | `settingsStore.js` (esistente) |
| `ar-last-filter-v1` | ultimo filtro | `main.js` (esistente) |
| `ar-crypto-progress-v1` | missioni, badge, preferenze UI | `storage/ProgressStore.js` (nuovo) |

Schema `ar-crypto-progress-v1`:

```json
{
  "v": 1,
  "missions": {
    "smoke-decoder": {
      "phaseIndex": 0, "completed": false, "completedAt": null,
      "phases": { "caesar": { "levelIndex": 1, "completed": [0], "current": {"plain":"AGENTE","key":2}, "sliderKey": 1 } }
    }
  },
  "badges": { "smoke-decoder": { "earnedAt": "2026-11-20T10:00:00.000Z" } },
  "prefs": { "theme": "dark", "sound": false, "panelCollapsed": false }
}
```

Il puzzle in corso è salvato (messaggio + chiave): ricaricare la pagina non cambia l'esercizio.
Se il documento è corrotto o di versione diversa si torna ai default; senza localStorage si lavora in memoria.

## 7. Ciclo di vita e memoria

- Un solo filtro esiste per volta; `dispose()` rilascia geometrie, materiali, texture e **listener**
  (`BaseFilter.listen()` li traccia).
- Anche la UI missione è distrutta quando il filtro non ha missione (`MissionPanel.hide()` → `view.destroy()`).
- Le viste sono costruite una volta e poi *patchate*: lo slider non viene mai ricreato mentre si trascina.
- Test eseguiti: 48 cambi di filtro consecutivi senza crescita di listener né di cache.

## 8. Stadi della missione (colore = progresso)

Ogni missione dichiara `stages` (dati in `game/missions.js`). Lo **stadio** è l'indice = *prove superate*
(`GameManager.getStage()`), limitato all'ultimo stadio:

```
 prove superate ──► GameManager.getTrials()  (somma di prove di fasi concluse + gioco corrente)
                └─► GameManager.getStage()   { index, name, css, data, last }
                        ├─► Pannello missione   striscia di pallini + etichetta
                        ├─► HookahFilter        data.tint   → colore del fumo
                        ├─► LightningEyes       data.effect → blu/viola/rosso · data.powerUp → PowerUpFilter embedded
                        └─► DragonPetFilter     data.form   → uovo / cucciolo / alato / leggendario (+ animazione a ogni salto)
```

Ogni gioco dichiara quante prove ha (`static trialCount(preset)`, `getTrials()`): Caesar = livelli, Vigenère = round.
Un salvataggio più corto di quello attuale (es. fatto con 3 livelli invece di 5) viene letto senza errori e la missione
torna "non completata" finché non si arriva in fondo.

## 9. Rebus (RiddleGame)

```
 content/riddles.js ──► game/presets.js (RIDDLE_PRESETS: 3 tier) ──► RiddleGame ──► GameManager ──► stadio 0..3
        (dati)                                                          │ getSnapshot()  (mai la soluzione)
 content/pixelArt.js ─► ui/components/PixelIcon ─► RiddleBoard ◄───────┘
                                                    RiddleView  (campo risposta, indizi, "cambia enigma")
```

- Un **tier = una prova = uno stadio**. `RiddleGame` serve un rebus a caso per tier, senza ripetizioni finché il pool non è esaurito,
  e salva l'id del rebus in corso (un refresh non lo cambia).
- Gli **stadi non si saltano**: `advance()` funziona solo a rebus risolto; "Cambia enigma" sceglie un altro rebus **dello stesso** tier ed è
  disponibile solo dopo aver visto tutti gli indizi.
- La risposta si confronta con `game/answers.js` (normalizzazione + tolleranza a un refuso su parole di 6+ lettere).
- Le immagini sono **icone 8×8 disegnate nel codice** (nessun asset del gioco), emoji e una griglia di crafting 3×3.
- Il `DragonPetFilter` non conosce il gioco: legge lo stadio e anima il passaggio quando l'indice cresce.

## 10. Decisioni di progetto

| Decisione | Motivo |
|---|---|
| Giochi senza DOM/renderer | testabili in Node, riusabili, responsabilità separate |
| Missione = lista di fasi (gioco + preset) | `Secret Agent` compone Caesar + Vigenère senza accoppiarli |
| Preset come dati | nuovi livelli senza toccare la logica |
| `gm.invoke()` | le viste non tengono riferimenti al gioco; persistenza centralizzata |
| Eventi invece di chiamate dirette | i filtri reagiscono senza conoscere i giochi |
| Coda dei popup badge | più badge insieme (es. Secret Agent + Crypto Apprentice) non si perdono |
