# AR Crypto Lab · Hookah AR Filter – Crypto Edition

Piattaforma AR **100% nel browser** (MediaPipe FaceMesh + Three.js, nessun backend, nessuna API key)
che trasforma i filtri in **missioni di crittografia classica** per ragazzi di 12-14 anni:
laboratori STEM, introduzione alla cybersecurity.

- 💨 **Hookah → "Smoke Decoder"**: il fumo rivela messaggi segreti. Cifrario di **Cesare** in **5 prove**; a ogni prova superata il **fumo cambia colore** (bianco → giallo → rosso → verde → blu → viola).
- ⚡ **Lightning Eyes → "Secret Agent"**: 4 prove (Cesare, Vigenère guidato, 2 Vigenère senza aiuti). Gli occhi partono **blu**, i lampi diventano **viola**, poi **rossi** (occhi fiammeggianti); alla quarta prova si aggiunge l'effetto **Power Up**.
- 🐉 **Dragon Pet → "Dragon Evolution"**: un uovo di drago verde sulla spalla. Risolvi **3 rebus visivi a tema Minecraft** (20+ per stadio, scelti a caso, con indizi progressivi): l'uovo si schiude, il cucciolo senza ali evolve in drago alato e infine diventa un **drago leggendario** rosso con fuoco viola.
- 🏆 Badge: *Smoke Decoder*, *Secret Agent*, *Dragon Keeper*, *Crypto Apprentice*.
- 🎮 Altri 3 filtri (Power Up, Boss Battle, Iron Man HUD) restano disponibili come intrattenimento.

L'utente non vive un esercizio scolastico ma una missione: apre la bocca, il fumo esce, il messaggio va decifrato.

## Installazione

Serve **Node.js 18+** ([nodejs.org](https://nodejs.org)).

**Windows (consigliato per studenti e docenti):** doppio clic su `avvia.bat`.
Verifica Node.js, installa le dipendenze se mancano, avvia Vite e apre il browser.

**Manuale (tutti i sistemi):**

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:https    # per provare da telefono (la camera richiede HTTPS)
npm run build        # versione di produzione in dist/ (da servire in HTTPS)
```

Consenti l'uso della **webcam** quando il browser lo chiede. I dati restano sul dispositivo.

## Come si gioca

1. Scegli il filtro dalla galleria in basso (o tasti `1`-`6`, `←` `→`).
2. Con **Hookah** o **Lightning Eyes** compare il **Pannello missione**.
3. Muovi lo slider (ruota di Cesare) o scrivi la lettera (Vigenère), guarda l'**anteprima**.
4. **DECRIPTA / CONTROLLA** → animazione passo-passo e verifica. **Suggerimento** aiuta senza dare la soluzione.
5. **Spiegami** apre la teoria in linguaggio semplice. **Trofei** mostra i badge.

Guida completa per insegnanti e studenti: [docs/GAMEPLAY.md](docs/GAMEPLAY.md).

## Panoramica dell'architettura

```
 UI (AppUI, MissionPanel, viste, componenti)
   │  eventi (EventBus)            ▲
   ▼                               │
 FilterManager  ──'change'──►  GameManager ──► CaesarGame / VigenereGame
   │                               │                  (logica pura)
   ▼                               ├─► ProgressStore (localStorage)
 Filtri (Hookah, Lightning…)       └─► BadgeSystem
   │  ▲ REWARD / GAME_* (EventBus)
   ▼  │
 Renderer: Three.js (#scene) + Canvas 2D (#overlay)
```

I giochi sono **logica pura**: non toccano né DOM né renderer. Parlano tramite eventi; la UI
disegna il pannello, i filtri disegnano gli effetti. Dettagli: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/CLASS_DIAGRAM.md](docs/CLASS_DIAGRAM.md).

## Dipendenze

| Pacchetto | Uso |
|---|---|
| `three` | rendering 3D e particelle |
| `@mediapipe/face_mesh` | tracking del volto, copiato in `public/mediapipe/` dallo script `postinstall` (nessuna CDN) |
| `vite` | dev server e build |
| `@vitejs/plugin-basic-ssl` | `npm run dev:https` per i telefoni |

Il codice dell'app non usa altre librerie: ES6 Modules, DOM nativo, WebAudio, localStorage.

## I filtri

| Filtro | Ruolo | Missione |
|---|---|---|
| Hookah | narghilè, tubo flessibile, fumo (colore = progresso) | **Smoke Decoder** (5 prove) |
| Lightning Eyes | occhi elettrici (colore = progresso) + Power Up finale | **Secret Agent** (4 prove) |
| Dragon Pet | uovo → cucciolo → drago alato → drago leggendario | **Dragon Evolution** (3 rebus) |
| Power Up, Boss Battle, Iron Man | intrattenimento | – |

Descrizione completa: [docs/FILTERS.md](docs/FILTERS.md).

## I minigiochi

- **CaesarGame** – ruota/slider della chiave, anteprima in tempo reale, corrispondenze A→D, B→E, C→F evidenziate,
  decifratura animata lettera per lettera. 5 livelli: chiave mostrata, poi nascosta 1-5, 1-10, 1-15, 1-25.
- **RiddleGame** – rebus visivi a tema Minecraft: immagini pixel-art disegnate nel codice, ricette di crafting 3×3, sequenze, strutture, mob e biomi. Campo di risposta libero (maiuscole, articoli e un refuso su parole lunghe sono tollerati), indizi progressivi a ogni errore, nessun salto degli stadi. Le domande sono dati in `src/content/riddles.js`.
- **VigenereGame** – senza tabula recta: per ogni lettera `cifrata − chiave` (A=0). Il primo round è **guidato**
  (una lettera alla volta, passeggiata animata sull'alfabeto numerato, pulsante *Guidami*); gli altri due sono
  **non guidati**: si decifra l'intera parola senza spiegazioni.

## Struttura del progetto

```
index.html  avvia.bat  package.json  vite.config.js  CHANGELOG.md
docs/                     ARCHITECTURE · GAMEPLAY · FILTERS · DEVELOPER_GUIDE · CLASS_DIAGRAM
scripts/copy-mediapipe.mjs
src/
  main.js                 bootstrap, ctx condiviso, loop
  faceTracker.js          volto, bocca, occhi, blink, sopracciglia
  core/                   EventBus, SoundFx, particelle, cache, bolt, mouth, ...
  crypto/                 alphabet, caesar, vigenere (funzioni pure)
  game/                   GameManager, BaseGame, CaesarGame, VigenereGame, RiddleGame, answers, missions, presets, badges
  storage/                ProgressStore
  filters/                FilterManager, BaseFilter, 6 filtri, fx/SmokeLetters
  ui/                     AppUI, ThemeManager, panels/, views/, components/, crypto.css
  content/theory.js       testi di "Spiegami"
  content/riddles.js      61 rebus di Minecraft (dati: domanda, immagine, risposte, indizi)
  content/pixelArt.js     26 icone 8x8 originali
```

## Risoluzione dei problemi

| Problema | Soluzione |
|---|---|
| "Camera permission denied" | Consenti la camera dal lucchetto 🔒 accanto all'indirizzo e ricarica. |
| La camera non parte su telefono | Serve HTTPS: `npm run dev:https` e apri l'indirizzo `https://…` mostrato. |
| `Cannot load …face_mesh.js` | `npm install` non è terminato: rilancialo (ricopia gli asset MediaPipe). |
| Il fumo non esce | Pannello ⚙ → **Toggle Debug** → guarda `open` e regola **Mouth Threshold**. |
| Il pannello missione copre il viso (mobile) | Tocca ▾ per ridurlo o il 🎯 nella barra in alto. |
| Il drago non evolve | L'evoluzione parte quando risolvi il rebus; resta in attesa se il tuo viso non è inquadrato. Nel pannello missione vedi lo stadio raggiunto. |
| Il fumo / gli occhi non cambiano colore | Il colore dipende dalle prove superate: guarda la striscia di pallini nel pannello missione. |
| Voglio ricominciare | Pannello missione → **↺ Ricomincia** (i badge restano) o **Trofei → Azzera progressi**. |
| Non sento i suoni | Sono disattivati di default: tocca 🔇 nella barra in alto. |
| `avvia.bat` dice che manca Node | Installa la versione LTS da nodejs.org e rilancia. |
| Prestazioni basse | ⚙ → riduci *Particle Count* (Hookah) o chiudi altre schede. |

I progressi stanno nel `localStorage` del browser: cambiando browser/profilo non si ritrovano.

## Roadmap

- Più cifrari: Atbash, Scytale, ROT13, forza bruta guidata ("prova tutte le chiavi").
- Modalità "cifra tu": lo studente scrive un messaggio e lo invia a un compagno (codice condivisibile).
- Pannello docente: esportazione dei progressi della classe (CSV) e codici missione.
- Analisi delle frequenze come minigioco (rompere Cesare senza chiave).
- Traduzioni (EN/ES) tramite file di stringhe.
- Test automatici in CI (Vitest + jsdom) e controlli di accessibilità.
