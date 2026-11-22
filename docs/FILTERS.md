# Filtri

Tutti estendono `BaseFilter` e vivono solo mentre sono attivi (zero risorse da inattivi).

| Id | Nome | Overlay 2D | Missione |
|---|---|---|---|
| `hookah` | Hookah | sì (lettere nel fumo) | Smoke Decoder |
| `lightning-eyes` | Lightning Eyes | sì | Secret Agent |
| `power-up` | Power Up | sì | – |
| `boss-battle` | Boss Battle | sì | – |
| `iron-man` | Iron Man HUD | sì | – |
| `dragon-pet` | Dragon Pet | sì (bagliori, fulmini, onde d'urto) | **Dragon Evolution** (3 rebus) |

## Hookah · "Smoke Decoder"

**Conservato:** narghilè procedurale, tubo flessibile a molle (CatmullRom), sistema di fumo a pool, face tracking,
impostazioni (densità, particelle, velocità, scala).

**Aggiunto:**

- **Colore del fumo = progresso.** `HookahFilter` legge lo *stadio* della missione (`ctx.games.getStage()`,
  indice = prove superate) e colora il fumo con `SmokeEmitter.setTint()` con una dissolvenza morbida:

  | Stadio | 0 | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|---|
  | Colore | bianco | giallo | rosso | verde | blu | viola |

  I colori sono dati in `stages` di `src/game/missions.js` (non nel filtro): per cambiarli basta modificare lì.
- `SmokeLetters` (`filters/fx/SmokeLetters.js`): con la bocca aperta le lettere cifrate salgono nel fumo, **dello stesso colore**.
- Prova superata → le lettere **decifrate** salgono in oro + scintille dorate.
- Badge → 220 particelle dorate e **arcobaleno di fumo** (~4 s) che poi torna al colore viola.
- Ascolta: `GAME_STATE`, `GAME_LEVEL_COMPLETE`, `GAME_COMPLETE`, `MISSION_START`, `REWARD`.

## Lightning Eyes · "Secret Agent"

**Conservato:** pupille luminose, archi elettrici, fulmine più forte con bocca aperta, impulso all'ammiccamento, particelle.

**Colore = progresso** (stadi in `stages` di `missions.js`, palette nel filtro):

| Prove superate | Occhi e lampi |
|---|---|
| 0 | **blu** (entrambi gli occhi) |
| 1 (Cesare) | **viola** |
| 2-3 (Vigenère guidato, poi 1° non guidato) | **rosso** — occhi fiammeggianti |
| 4 (2° Vigenère non guidato) | **rosso + Power Up** |

**Power Up come effetto sommato.** `PowerUpFilter` si può usare in modalità `embedded` (`new PowerUpFilter(ctx, settings, {embedded:true, power:70})`):
niente HUD né punteggio, l'aura resta a potenza fissa (più forte con la bocca aperta) e `burst()` scatena l'esplosione.
`LightningEyesFilter` lo crea quando lo stadio ha `powerUp: true` (con esplosione), lo ricrea senza esplosione se la missione è già finita
quando riapri il filtro, e lo distrugge se la missione viene ricominciata. Nessun codice duplicato.

**Altre reazioni** (moltiplicatore temporaneo `surge`): `GAME_WRONG` +25% · `GAME_STEP` +50% · `GAME_LEVEL_COMPLETE` +100% e scintille dorate ·
`MISSION_PHASE_UNLOCKED` +160% · `REWARD` badge +200%.

## Dragon Pet · "Dragon Evolution"

Il filtro non mostra subito il drago: la **forma** dipende dai rebus risolti (stadio della missione, `ctx.games.getStage()`):

| Stadio | Forma | Modello / effetti |
|---|---|---|
| 0 | **Uovo** verde sulla spalla | 8 gusci + macchie; oscilla piano; nessun drago |
| 1 | **Cucciolo** senza ali (scala 0.7) | ali nascoste, coda che scodinzola, testa che si guarda intorno, **non vola**; soffio **verde** |
| 2 | **Drago alato** verde (scala 0.95) | è il Dragon Pet originale: ali, volo intorno al viso, soffio verde, **particelle magiche verdi** leggere |
| 3 | **Leggendario** rosso (scala 1.55) | colori verde→rosso, creste dorate, ali ×1.3, **fuoco viola**, particelle epiche (viola/rosso/oro), aura, fulmini, scia di braci, vola più spesso |

**Animazioni** (la timeline avanza solo se il viso è inquadrato):

| Transizione | Durata | Svolgimento |
|---|---|---|
| Schiusa 0→1 | 3.4 s | l'uovo trema e brilla (scintille) → a 2.0 s il guscio si **frantuma in 8 pezzi** che volano via, onda d'urto verde, flash, tremolio → il cucciolo spunta con effetto "pop" |
| Ali 1→2 | 2.6 s | energia verde che converge → a 0.9 s esplosione, **le ali spuntano** (easeOutBack) e il drago **cresce** con una molla che supera un po' il valore finale |
| Leggendario 2→3 | 4.2 s | il drago si solleva, vortice viola/rosso, **fulmini**, tremolio crescente → a 1.5 s flash, 2 onde d'urto, 300 particelle, **tremolio forte**; passa da verde a rosso, cresce a 1.55×, spuntano le creste |

La forma mostrata viene ricalcolata dai progressi salvati: al ritorno nel filtro il drago riappare **già nella forma raggiunta**, senza rivedere l'animazione.
Se la missione viene ricominciata si torna all'uovo. Il badge `Dragon Keeper` usa `delayMs` per comparire dopo l'ultima trasformazione.

Impostazioni conservate: *Dragon Size* e *Fire Intensity*. Tracking della bocca, spalla (si sposta se ti avvicini al bordo), ruota con l'inclinazione del capo: invariati.

## Altri filtri

- **Power Up**: aura, anelli, scintille, POWER LEVEL; bocca/sopracciglia/testa; 100% = tremolio + esplosione + forma Ultimate. Può essere incorporato in altri filtri (`embedded`).
- **Boss Battle**: barra HP, attacchi con la bocca, combo, critici, numeri di danno, sconfitta e ricompensa.
- **Iron Man HUD**: scansione, riquadri di puntamento, riconoscimento facciale, energia, carica arma, radar.

## Contratto di un filtro

```js
class MyFilter extends BaseFilter {
  static meta = { id, name, icon, description, usesOverlay };
  static settings = [ { key, label, type: 'range'|'color'|'checkbox', min, max, step, default } ];
  initialize() { super.initialize(); /* risorse; this.listen(evt, fn) per gli eventi */ }
  update(dt, time) {}   // this.ctx.face · ctx.faceVisible · ctx.mouth
  render() {}           // ctx.g (overlay 2D, già pulito)
  dispose() { super.dispose(); }
}
```

Registrazione: aggiungere la classe a `ALL_FILTERS` in `src/filters/index.js`.
Per legarla a una missione: aggiungere una voce in `src/game/missions.js` con `filterId`.
