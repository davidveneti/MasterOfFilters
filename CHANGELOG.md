# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) · versioni: [SemVer](https://semver.org/lang/it/).

## [2.2.0] - Dragon Evolution

Il filtro **Dragon Pet** diventa una missione: un drago che si alleva e si fa evolvere risolvendo rebus di Minecraft.

### Aggiunto
- **Missione `dragon-evolution`** (filtro Dragon Pet) con 3 prove e 4 forme: uovo → cucciolo senza ali → drago alato → drago leggendario.
- **Stadio 1 · schiusa**: all'apertura **niente drago**, solo un uovo di drago verde ancorato alla spalla. Rebus risolto → animazione di schiusa
  (uovo che trema e brilla, guscio in 8 pezzi che si frantuma, cucciolo che salta fuori). Il cucciolo è verde, **senza ali**, segue la spalla
  e i movimenti del capo, muove testa/coda/corpo e **sputa una fiammata verde** quando apri la bocca.
- **Stadio 2 · ali**: animazione di evoluzione, il drago cresce leggermente, spuntano le **ali grandi** e diventa l'attuale Dragon Pet verde
  (soffio verde + leggere particelle magiche verdi, volo).
- **Stadio 3 · leggendario**: trasformazione spettacolare (sollevamento, fulmini, onde d'urto), dimensioni molto maggiori, **verde → rosso**,
  **fuoco viola**, creste, aura ed effetti particellari epici.
- **RiddleGame**: gioco di rebus visivi. Un rebus casuale per stadio, risposta libera, **indizi progressivi** a ogni errore, **nessun salto degli stadi**,
  "Cambia enigma" (stesso stadio) solo dopo aver visto tutti gli indizi, rebus in corso salvato.
- **61 rebus** (20 / 20 / 21 per stadio) come dati in `src/content/riddles.js`: progressioni di materiali, ricette di crafting (griglia 3×3), mob, biomi,
  strutture, oggetti intrusi, combinazioni di indizi e calcoli. Difficoltà crescente per stadio, senza crittografia.
- **26 icone pixel-art 8×8 originali** disegnate nel codice (`src/content/pixelArt.js`): nessun asset del gioco.
- Matching delle risposte (`game/answers.js`): ignora maiuscole, accenti, articoli e punteggiatura; tollera un refuso su parole di 6+ lettere.
- UI: `RiddleView`, `RiddleBoard`, `PixelIcon`; striscia dei 4 stadi nel pannello missione ("Il tuo drago").
- Badge **Dragon Keeper** (🐲). Il popup compare con ritardo (`delayMs`) per non coprire la trasformazione finale.
- Test: validazione dei dati dei rebus (id, icone, indizi, **antispoiler**), logica del gioco e della missione.

### Modificato
- `DragonPetFilter`: riscritto attorno alle 4 forme. Il drago alato è il modello esistente; la testa è ora un gruppo separato per poterla muovere.
  `usesOverlay: true` (bagliori, fulmini, onde d'urto, flash).
- `AppUI`: i badge possono avere `delayMs`.
- Impostazioni *Dragon Size* e *Fire Intensity* invariate.

### Note
- La forma del drago è **derivata dai progressi salvati**: al ritorno nel filtro riappare senza ripetere l'animazione; ricominciare la missione riporta all'uovo.
- Le animazioni avanzano solo mentre il viso è inquadrato.
- La difficoltà dei rebus (30-90 s per un dodicenne) è una **stima**: conviene provarli con ragazzi veri e correggere `riddles.js`.

## [2.1.0] - Progressione visiva

### Rimosso
- **Tutorial introduttivo** (overlay a spotlight): non parte più al primo accesso e non c'è più il pulsante
  "Rivedi il tutorial". Si passa direttamente al gioco. Era la causa del pannello di scelta fuori schermo
  nell'ultimo passo. Eliminati `TutorialOverlay`, i suoi stili e la preferenza `tutorialSeen`.

### Aggiunto
- **Smoke Decoder in 5 prove** (prima 3): livelli 4 (chiave 1-15) e 5 (chiave 1-25).
- **Il fumo cambia colore a ogni prova superata**: bianco (0) → giallo (1) → rosso (2) → verde (3) → blu (4) → viola (5),
  con dissolvenza morbida; anche le lettere nel fumo prendono il colore. Un errore non cambia il colore.
- **Secret Agent in 4 prove**: Cesare, Vigenère guidato, e **due Vigenère non guidati** (nuovi): senza spiegazioni
  passo-passo né "Guidami", si decifra l'intera parola (chiavi `LUNA` → `AGENTE`, `ROMA` → `SEGRETO`).
- **Occhi e lampi guidati dai progressi**: blu all'inizio (entrambi gli occhi), **viola** dopo Cesare, **rossi**
  ("occhi fiammeggianti") dopo il Vigenère guidato; superata la **quarta prova** si somma l'effetto **Power Up**
  (esplosione + aura, anelli e scintille). L'aura resta finché la missione non viene ricominciata.
- **Stadi di missione** (`stages` in `game/missions.js`, `GameManager.getStage()` / `getTrials()`): i filtri leggono
  lo stadio invece di conoscere i giochi. Colori ed effetti sono dati modificabili.
- Pannello missione: **striscia di pallini** dello stadio ("Colore del fumo" / "Effetto occhi") e contatore
  "Prove superate n/N".
- `PowerUpFilter` utilizzabile in modalità `embedded` (add-on senza HUD né punteggio) con `burst()`.
- `BaseGame.trialCount()` / `getTrials()`.

### Modificato
- Palette dei lampi di Lightning Eyes: ora una sola per volta (blu/viola/rosso) invece di blu e viola mescolati.
- Il progresso della missione è calcolato sulle **prove superate** (non più sulle lettere).
- Badge: testi aggiornati (5 prove / 4 prove).
- Salvataggi precedenti: letti senza errori. Una missione salvata come "completata" con meno livelli torna "in corso".

### Note
- Nella richiesta i colori erano elencati dal livello 0 al 4 e poi "livello 6 è viola": ho letto "6" come **5**
  (5 prove = stadi da 0 a 5). Basta cambiare `stages` in `src/game/missions.js` per altre associazioni.
- "Fiamme + Power Up" resta attivo finché non si ricomincia la missione. Se lo preferisci temporaneo, si limita a
  una durata fissa in `LightningEyesFilter._syncStage()`.

## [2.0.0] - Crypto Edition

Trasforma i primi due filtri in missioni didattiche sulla crittografia classica
(target: 12-14 anni). Architettura esistente **estesa, non sostituita**.

### Aggiunto
- **GameManager** tra `FilterManager` e UI: avvia/ferma la missione legata al filtro attivo,
  gestisce fasi, persistenza e ricompense. (`src/game/GameManager.js`)
- **Interfaccia comune dei minigiochi** (`BaseGame`): `initialize()`, `start()`, `update()`,
  `checkSolution()`, `getProgress()`, `unlockReward()`, `reset()` (+ `advance()`, `hint()`,
  `getSnapshot()`, `serialize()`, `dispose()`).
- **CaesarGame** con preset `smokeDecoder` (3 livelli: chiave mostrata, nascosta 1-5, nascosta 1-10)
  e `agentIntercept` (messaggio `PHVVDJJLR`).
- **VigenereGame** guidato (senza tabula recta) con preset `agentGuided`.
- **Missioni**: *Smoke Decoder* (filtro Hookah) e *Secret Agent* (filtro Lightning Eyes, 2 fasi).
- **Badge**: Smoke Decoder, Secret Agent, Crypto Apprentice (data, descrizione, stato).
- **Persistenza** `ProgressStore` (localStorage): livelli, fasi, puzzle in corso, badge, preferenze.
- **EventBus** condiviso (`ctx.events`) e catalogo eventi (`game/events.js`).
- **UI**: Mission Panel, Progress Bar, Trofei, "Spiegami" (teoria), Tutorial a spotlight,
  tema scuro/chiaro, suono opzionale, popup badge, toast; responsive desktop/mobile.
- **Componenti didattici**: ruota di Cesare animata (canvas), striscia dell'alfabeto
  (A→D, B→E, C→F…), righe lettera-per-lettera, striscia numerata per il Vigenère.
- **Effetti nei filtri**: lettere nel fumo (Hookah), fumo colorato e particelle dorate alla ricompensa,
  picchi di fulmini alle tappe della missione (Lightning Eyes).
- `BaseFilter.listen()` con rimozione automatica dei listener in `dispose()`.
- `SmokeEmitter.setTint()` per colorare il fumo.
- Documentazione: `README.md`, `docs/` (ARCHITECTURE, GAMEPLAY, FILTERS, DEVELOPER_GUIDE, CLASS_DIAGRAM).
- `avvia.bat` aggiornato: controlla Node.js (>=18), installa solo se mancano le dipendenze, apre il browser.

### Modificato
- `HookahFilter`: `usesOverlay: true` (lettere nel fumo). Comportamento di narghilè, tubo e fumo invariato.
- `main.js`: crea bus, store, game layer e `AppUI`; un solo punto nel loop (`games.update(dt)`).
- `index.html`: contenitore `#app-ui`. Titolo "AR Crypto Lab".
- `package.json`: nome e versione.

### Note
- L'esempio Vigenère `DGSI` + `SOLE` della specifica non produce una parola
  (decifrato `LSHE`, cifrato `VUDM`): nel gioco si usano coppie coerenti (`CIAO` → `UWLS`).
- `PHVVDJJLR` con chiave 3 → `MESSAGGIO` e `KHOOR` → `HELLO` sono invece corretti e usati tal quali.
- Il suono è **disattivato** di default (uso in classe).

### Invariato (nessuna regressione)
Face tracking, filtri Power Up / Boss Battle / Iron Man HUD / Dragon Pet, galleria, pannello
impostazioni, debug, ciclo di vita e dispose dei filtri.

## [1.1.0] - Piattaforma multi-filtro
Sei filtri (Hookah, Lightning Eyes, Power Up, Boss Battle, Iron Man HUD, Dragon Pet),
`FilterManager`, `BaseFilter`, galleria, impostazioni per filtro, particelle in pool.

## [1.0.0] - Hookah AR Filter
Filtro narghilè con MediaPipe FaceMesh + Three.js, tubo flessibile, fumo, debug.
