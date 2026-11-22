# Master of Filters

Piattaforma AR **100% nel browser** (MediaPipe FaceMesh + Three.js, nessun backend, nessuna API key)
che trasforma i filtri in **missioni di crittografia classica** per ragazzi di 12-14 anni:
laboratori STEM, introduzione alla cybersecurity.

- 💨 **Hookah → "Smoke Decoder"**: il fumo rivela messaggi segreti. Cifrario di **Cesare** in **5 prove**; a ogni prova superata il **fumo cambia colore** (bianco → giallo → rosso → verde → blu → viola).
- ⚡ **Lightning Eyes → "Secret Agent"**: 4 prove (Cesare, Vigenère guidato, 2 Vigenère senza aiuti). Gli occhi partono **blu**, i lampi diventano **viola**, poi **rossi** (occhi fiammeggianti); alla quarta prova si aggiunge l'effetto **Power Up**.
- 🐉 **Dragon Pet → "Dragon Evolution"**: un uovo di drago verde sulla spalla. Risolvi **3 rebus visivi a tema Minecraft** (20+ per stadio, scelti a caso, con indizi progressivi): l'uovo si schiude, il cucciolo senza ali evolve in drago alato e infine diventa un **drago leggendario** rosso con fuoco viola.
- 🏆 Badge: *Smoke Decoder*, *Secret Agent*, *Dragon Keeper*, *Crypto Apprentice*.
- 🎮 Altri 3 filtri (Power Up, Boss Battle, Iron Man HUD) restano disponibili come intrattenimento.

Consenti l'uso della **webcam** quando il browser lo chiede. I dati restano sul dispositivo.

## I filtri

| Filtro | Ruolo | Missione |
|---|---|---|
| Hookah | narghilè, tubo flessibile, fumo (colore = progresso) | **Smoke Decoder** (5 prove) |
| Lightning Eyes | occhi elettrici (colore = progresso) + Power Up finale | **Secret Agent** (4 prove) |
| Dragon Pet | uovo → cucciolo → drago alato → drago leggendario | **Dragon Evolution** (3 rebus) |
| Power Up, Boss Battle, Iron Man | intrattenimento | – |

## I minigiochi

- **CaesarGame** – ruota/slider della chiave, anteprima in tempo reale, corrispondenze A→D, B→E, C→F evidenziate,
  decifratura animata lettera per lettera. 5 livelli: chiave mostrata, poi nascosta 1-5, 1-10, 1-15, 1-25.
- **RiddleGame** – rebus visivi a tema Minecraft: immagini pixel-art disegnate nel codice, ricette di crafting 3×3, sequenze, strutture, mob e biomi. Campo di risposta libero (maiuscole, articoli e un refuso su parole lunghe sono tollerati), indizi progressivi a ogni errore, nessun salto degli stadi. Le domande sono dati in `src/content/riddles.js`.
- **VigenereGame** – senza tabula recta: per ogni lettera `cifrata − chiave` (A=0). Il primo round è **guidato**
  (una lettera alla volta, passeggiata animata sull'alfabeto numerato, pulsante *Guidami*); gli altri due sono
  **non guidati**: si decifra l'intera parola senza spiegazioni.


