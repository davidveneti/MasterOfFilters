# Gameplay e uso in classe

Target: 12-14 anni (scuola secondaria di primo grado), laboratori STEM, introduzione a
crittografia e cybersecurity. Il tono è quello di una missione, non di una verifica.

## Obiettivi di apprendimento

- Capire cos'è **cifrare/decifrare**, testo in chiaro/cifrato, **chiave**.
- Cesare: spostamento dell'alfabeto, ruolo della chiave, perché è facile da rompere (25 chiavi).
- Vigenère: chiave-parola, somma/sottrazione modulo 26 (A=0), ripetizione della chiave.
- Confronto tra i due cifrari.

## Missione 1 · SMOKE DECODER (filtro Hookah) — 5 prove

Il fumo del narghilè nasconde messaggi. Apri la bocca: le lettere cifrate salgono nel fumo.
**A ogni prova superata il fumo cambia colore** (e le lettere con lui):

| Prove superate | Colore del fumo |
|---|---|
| 0 (all'inizio) | ⚪ bianco |
| 1 | 🟡 giallo |
| 2 | 🔴 rosso |
| 3 | 🟢 verde |
| 4 | 🔵 blu |
| 5 (missione completata) | 🟣 viola |

| Livello | Chiave | Esempio |
|---|---|---|
| 1 · Chiave in vista | mostrata (slider 1-10) | `KHOOR` con chiave 3 → `HELLO` |
| 2 | nascosta, da 1 a 5 | da trovare provando |
| 3 | nascosta, da 1 a 10 | da trovare provando |
| 4 | nascosta, da 1 a 15 | da trovare provando |
| 5 | nascosta, da 1 a 25 | da trovare provando |

Un errore **non** cambia il colore: cambia solo quando superi la prova. Completate le 5 prove: badge **Smoke Decoder**
(particelle dorate, arcobaleno di fumo, lettere dorate). Il fumo resta viola.

## Missione 2 · SECRET AGENT (filtro Lightning Eyes) — 4 prove

| Prova | Contenuto | Effetto sugli occhi dopo averla superata |
|---|---|---|
| (inizio) | – | 🔵 **occhi blu** con lampi blu |
| 1 | **Cesare**: messaggio intercettato `PHVVDJJLR` → `MESSAGGIO` | 🟣 lampi **viola** |
| 2 | **Vigenère guidato** (`SOLE`, una lettera alla volta) | 🔴 lampi **rossi** (occhi fiammeggianti) |
| 3 | **Vigenère senza aiuti** (`LUNA`, tutta la parola) | resta 🔴 |
| 4 | **Vigenère senza aiuti** (`ROMA`, tutta la parola) | 🔴 + **Power Up**: esplosione, aura, anelli e scintille attorno agli occhi |

**Prova 1 · Cesare.** Ruota la ruota finché `P→M`, `H→E`, `V→S`… e compare `MESSAGGIO`. Sblocca la fase 2.

**Prove 2-4 · Vigenère.** Niente tabula recta. Il round 1 è guidato; i round 2 e 3 sono **non guidati**: niente spiegazioni passo-passo
né "Guidami", si scrive l'intera parola e si preme CONTROLLA (il suggerimento resta disponibile).

```
 Round 1 (guidato), chiave SOLE   Messaggio:  U  W  L  S
                                   Chiave:     S  O  L  E
 U − S = 20 − 18 =  2 = C          Risultato:  C  I  A  O
 W − O = 22 − 14 =  8 = I
 L − L = 11 − 11 =  0 = A          Round 2 (non guidato): LARNEY con chiave LUNA (LUNALU) → AGENTE
 S − E = 18 −  4 = 14 = O          Round 3 (non guidato): chiave ROMA (ROMAROM) → SEGRETO
```

Se il risultato è sotto zero si aggiunge 26 (si "gira" attorno all'alfabeto).
Completate le 4 prove: badge **Secret Agent**, e quindi **Crypto Apprentice** (richiede entrambi). L'aura Power Up resta attiva
finché non si ricomincia la missione.

## Missione 3 · DRAGON EVOLUTION (filtro Dragon Pet) — 3 rebus

Non esiste "subito" un drago: **prima c'è un uovo verde sulla tua spalla**. Ogni rebus risolto lo fa crescere.

| Rebus risolti | Cosa vedi | Soffio |
|---|---|---|
| 0 | 🥚 uovo di drago verde sulla spalla (nessun drago) | – |
| 1 | 🐲 **cucciolo verde senza ali**, piccolo: segue la spalla, muove testa, coda e corpo | fiammata **verde** |
| 2 | 🐉 **drago alato verde** (il Dragon Pet classico), un po' più grande, grandi ali, vola intorno al viso | verde + leggere particelle magiche verdi |
| 3 | 🔥 **drago leggendario**: molto più grande, **rosso**, creste dorate, ali enormi | fuoco **viola** + effetti epici |

Animazioni: **schiusa** (l'uovo trema e brilla, il guscio si frantuma in 8 pezzi, il cucciolo salta fuori), **evoluzione** (energia che si
raccoglie, esplosione verde, le ali spuntano e il drago cresce) e **trasformazione leggendaria** (il drago si solleva, fulmini viola, onde d'urto,
passa dal verde al rosso e cresce). Il badge **Dragon Keeper** compare *dopo* l'ultima trasformazione, così non la copre.

**I rebus** (61, almeno 20 per stadio, uno solo scelto a caso per stadio):

| Stadio | Difficoltà | Esempi |
|---|---|---|
| 1 · Schiusa | riconoscere e ricette semplici | progressione dei materiali, "che mob è?", torcia = carbone + bastoncino, banco da lavoro, fornace |
| 2 · Ali | ricette più complesse, osservazione, due indizi | secchio a V, scudo, bussola, torta, golem di ferro (forma a T), "quale mob NON è ostile?", calcoli con assi e bastoncini |
| 3 · Leggendario | più passaggi logici | Wither, Occhio di Ender, "quale piccone manca nella catena?", quanti tronchi servono in totale, creeper carico, fulmine + maiale, X sulla mappa |

Come si risponde: si scrive nel campo (maiuscole, accenti, articoli e punteggiatura non contano; un refuso su parole lunghe è perdonato).
Ogni errore mostra **un nuovo indizio** (3 per rebus); visti tutti gli indizi compare **🎲 Cambia enigma** (un altro rebus *dello stesso stadio*).
**Non si può saltare uno stadio**: il rebus successivo si apre solo risolvendo quello in corso. I progressi si salvano e al ritorno il drago
riappare nella forma raggiunta, senza ripetere l'animazione.

## Aiuti

| Aiuto | Cosa fa |
|---|---|
| Anteprima | mostra in tempo reale cosa esce con la chiave scelta |
| 💡 Suggerimento | 1° range della chiave · 2° prima lettera · 3° (solo Cesare) la chiave. Nei rebus: un indizio alla volta (3) |
| 🧭 Guidami (solo round guidato) | anima il passo e lo compila; conta come assistenza |
| 📖 Spiegami | teoria: crittografia, Cesare, Vigenère, differenze, esempi + "Prova tu!" |

Dopo 3 errori (Cesare) compare l'invito a usare il suggerimento. Non ci sono punteggi negativi né tempi.

## Badge

| Badge | Come si ottiene |
|---|---|
| 💨 Smoke Decoder | supera le 5 prove di Smoke Decoder |
| 🕵️ Secret Agent | supera le 4 prove di Secret Agent |
| 🐲 Dragon Keeper | risolvi i 3 rebus di Dragon Pet (il popup arriva dopo la trasformazione) |
| 🎓 Crypto Apprentice | ottieni sia Smoke Decoder sia Secret Agent |

Ogni badge mostra descrizione, stato e **data di ottenimento** (Trofei 🏆).

## Suggerimento di lezione (45-50 min)

1. (5') Domanda aperta: "Come si manda un segreto a un amico davanti a tutti?" Mostra *Spiegami → Cos'è la crittografia*.
2. (15') Smoke Decoder in coppia (una webcam ogni due). Uno muove lo slider, l'altro legge l'anteprima.
3. (5') Discussione: perché Cesare è facile da rompere? (Solo 25 chiavi.)
4. (15') Secret Agent: Cesare, Vigenère guidato, poi i due round senza aiuti.
5. (5') Confronto con la tabella *Differenze*; sfida a casa: cifrare il proprio nome.

## Accessibilità e inclusione

Etichette ARIA, navigazione da tastiera (tasti `1`-`6`, `←` `→`, Invio nel Vigenère),
`prefers-reduced-motion` rispettato, tema chiaro/scuro, suoni disattivati di default.
Chi non vuole usare la webcam può giocare comunque al pannello: il fumo e i fulmini sono solo scenografia.
