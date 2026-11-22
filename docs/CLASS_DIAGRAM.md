# Diagramma delle classi

## Livello applicazione

```
                         ┌───────────────┐
                         │    main.js    │  crea ctx, bus, store, manager, UI
                         └───────┬───────┘
        ┌────────────────────────┼─────────────────────────────┐
        ▼                        ▼                             ▼
┌────────────────┐     ┌──────────────────┐          ┌──────────────────┐
│  FilterManager │────▶│   GameManager    │─────────▶│  ProgressStore   │
│ register()     │ on  │ registerGame()   │ get/save │ getMission()     │
│ activate()     │'chg'│ registerMission()│          │ saveMission()    │
│ deactivate()   │     │ startMission()   │          │ earnBadge()      │
│ update/render()│     │ advance()        │          │ getPref/setPref()│
└───────┬────────┘     │ submit() hint()  │          └────────▲─────────┘
        │ 1 attivo     │ invoke() reset() │                   │
        ▼              │ getTrials()      │          ┌────────┴─────────┐
┌────────────────┐     │ getStage()       │          │   BadgeSystem    │
│   BaseFilter   │     │ getSnapshot()    │          │ unlock() list()  │
│ initialize()   │     └───────┬──────────┘          │ (ascolta         │
│ update()       │             │ 1 attivo            │  MISSION_COMPLETE│
│ render()       │             ▼                     └──────────────────┘
│ dispose()      │     ┌────────────────┐
│ listen()       │     │    BaseGame    │
│ track()/acquire│     │ initialize()   │
│                │     │ start()        │
│                │     │ update()       │
└──────┬─────────┘     │ checkSolution()│
       │               │ getProgress()  │
       │               │ unlockReward() │
       │               │ reset()        │
       │               │ advance() hint │
       │               │ getSnapshot()  │
       │               │ serialize()    │
       │               └───────┬────────┘
       │                  ┌────┴─────────────┐
       │                  ▼                  ▼
       │           ┌─────────────┐   ┌──────────────┐
       │           │ CaesarGame  │   │ VigenereGame │   RiddleGame (rebus: swap(), hint())
       │           │ setKey()    │   │ solveStep()  │
       │           │ getPreview()│   │ explainStep()│
       │           └─────────────┘   └──────────────┘
       │
       ├── HookahFilter ─────── HookahRenderer · HoseRenderer · SmokeEmitter · SmokeLetters · ParticlePool
       ├── LightningEyesFilter ─ ParticlePool · bolt.js · PowerUpFilter (embedded, add-on finale)
       ├── DragonPetFilter ───── 4 forme (uovo/cucciolo/alato/leggendario) · animazioni · ParticlePool · bolt.js
       ├── PowerUpFilter · BossBattleFilter · IronManHUDFilter
```

## Bus eventi (accoppiamento debole)

```
 CaesarGame ─┐                                    ┌──► MissionPanel / AppUI
 VigenereGame┼─► EventBus ◄── GameManager ◄───────┤──► HookahFilter (this.listen)
 BadgeSystem ┘      ▲                             └──► LightningEyesFilter (this.listen)
                    └── ctx.events
```

## Livello UI

```
 AppUI
  ├── Toast · BadgePopup(coda)
  ├── toolbar (🎯 🏆 ❓ tema suono)
  ├── MissionPanel ── ProgressBar
  │      └── view corrente (una sola)
  │            ├── CaesarView ───── LetterRow · CipherWheel · AlphabetStrip
  │            ├── VigenereView ─── NumberStrip
  │            └── RiddleView ───── RiddleBoard ── PixelIcon (content/pixelArt.js)
  ├── AchievementsPanel ── Modal · ProgressBar
  ├── HelpPanel ───────── Modal · content/theory.js · crypto/caesar.js ("Prova tu!")
  └── ThemeManager · SoundFx
```

## Crittografia (funzioni pure)

```
 alphabet.js ──► caesar.js     caesarEncrypt / caesarDecrypt / caesarMapping / alphabetMapping
             └─► vigenere.js   vigenereEncrypt / vigenereDecrypt / expandKey / decryptStep
```

## Ciclo di vita di una missione

```
 (nessuna) ─activate(hookah)─► MISSION_START ─► fase 0: game.initialize(saved) ─► game.start()
      ▲                                              │ livello risolto  → GAME_LEVEL_COMPLETE → REWARD(level)
      │                                              │ ultimo livello   → GAME_COMPLETE
      │                                              │      ├─ altre fasi → MISSION_PHASE_UNLOCKED → advance() → fase n+1
      │                                              │      └─ ultima     → MISSION_COMPLETE → badge → REWARD(badge)
      └────────activate(altro filtro)────── MISSION_STOP (stato già salvato)
```
