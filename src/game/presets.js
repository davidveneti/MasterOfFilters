import { RIDDLES } from '../content/riddles.js';

/**
 * Level data for the games. Presets are plain data: add a new one here and
 * reference it from missions.js. Messages use the letters A-Z only.
 */

/** @typedef {{plain:string, key?:number}} CaesarMessage */

export const CAESAR_PRESETS = {
  /** "Smoke Decoder" (Hookah). Level 1 shows the key, levels 2-3 hide it. */
  smokeDecoder: {
    id: 'smokeDecoder',
    levels: [
      {
        title: 'Livello 1 · Chiave in vista',
        intro: 'Il fumo ha scritto un messaggio. La chiave è scritta sotto: usala!',
        keyMode: 'shown', keyRange: [1, 10],
        messages: [{ plain: 'HELLO', key: 3 }, { plain: 'CIAO', key: 1 }, { plain: 'FUMO', key: 4 }, { plain: 'CODE', key: 2 }],
        fixedFirst: true, // first time the student always sees KHOOR / key 3
      },
      {
        title: 'Livello 2 · Chiave nascosta (1-5)',
        intro: 'Questa volta la chiave non si vede. So solo che è un numero da 1 a 5.',
        keyMode: 'hidden', keyRange: [1, 5],
        messages: [{ plain: 'SEGRETO' }, { plain: 'AGENTE' }, { plain: 'CODICE' }, { plain: 'LASER' }, { plain: 'ROBOT' }],
      },
      {
        title: 'Livello 3 · Chiave nascosta (1-10)',
        intro: 'Livello da esperti: la chiave può essere un numero da 1 a 10.',
        keyMode: 'hidden', keyRange: [1, 10],
        messages: [{ plain: 'MISSIONE' }, { plain: 'PASSWORD' }, { plain: 'HACKER' }, { plain: 'SPIONAGGIO' }, { plain: 'CRITTOGRAFIA' }],
      },
      {
        title: 'Livello 4 · Chiave nascosta (1-15)',
        intro: 'Ora le chiavi possibili sono di più: ragiona con l\'anteprima, non andare a caso!',
        keyMode: 'hidden', keyRange: [1, 15],
        messages: [{ plain: 'ALFABETO' }, { plain: 'CIFRARIO' }, { plain: 'SEGNALE' }, { plain: 'CODIFICA' }, { plain: 'SICUREZZA' }],
      },
      {
        title: 'Livello 5 · Chiave nascosta (1-25)',
        intro: 'Prova finale: la chiave può essere qualsiasi numero da 1 a 25. Sei un vero decifratore!',
        keyMode: 'hidden', keyRange: [1, 25],
        messages: [{ plain: 'CRITTOGRAFIA' }, { plain: 'INFORMATICA' }, { plain: 'FIREWALL' }, { plain: 'ANTIVIRUS' }, { plain: 'CYBERSPACE' }],
      },
    ],
  },

  /** "Secret Agent" phase 1: one intercepted message. PHVVDJJLR = MESSAGGIO with key 3. */
  agentIntercept: {
    id: 'agentIntercept',
    levels: [
      {
        title: 'Messaggio intercettato',
        intro: 'Un agente nemico ha mandato questo messaggio. Ruota la ruota finché non ha senso!',
        keyMode: 'hidden', keyRange: [1, 5],
        messages: [{ plain: 'MESSAGGIO', key: 3 }],
        fixedFirst: true,
      },
    ],
  },
};

/** @typedef {{key:string, plain:string}} VigenereRound */

export const VIGENERE_PRESETS = {
  /**
   * "Secret Agent" phase 2: Vigenere with NO full tabula recta.
   * Round 1 is guided (step by step); rounds 2-3 are NOT guided: the student decodes the whole word alone.
   */
  agentGuided: {
    id: 'agentGuided',
    rounds: [
      { key: 'SOLE', plain: 'CIAO', guided: true, intro: 'Prova guidata. La parola-chiave è SOLE: ogni lettera del messaggio usa UNA lettera della chiave.' },
      { key: 'LUNA', plain: 'AGENTE', guided: false, intro: 'Prova NON guidata. Questa volta decifra tutta la parola da solo. Ricorda: la chiave si ripete (LUNALU).' },
      { key: 'ROMA', plain: 'SEGRETO', guided: false, intro: 'Ultima prova, senza aiuti! Chiave ROMA: se arrivi sotto zero aggiungi 26.' },
    ],
  },
};

/**
 * "Dragon Pet" evolution: 3 tiers of Minecraft riddles (content/riddles.js), one random riddle per tier.
 * Passing a tier = passing a trial = the dragon evolves (egg -> hatchling -> winged -> legendary).
 */
export const RIDDLE_PRESETS = {
  minecraftRebus: {
    id: 'minecraftRebus',
    tiers: [
      { title: 'Stadio 1 · Schiusa dell\'uovo', intro: 'Un uovo di drago verde è sulla tua spalla! Risolvi il rebus per farlo schiudere.', riddles: RIDDLES[1] },
      { title: 'Stadio 2 · Evoluzione delle ali', intro: 'Il cucciolo è nato, ma non sa ancora volare. Un rebus più difficile gli farà spuntare le ali!', riddles: RIDDLES[2] },
      { title: 'Stadio 3 · Drago leggendario', intro: 'Ultima prova: l\'enigma più difficile. Risolvilo e il tuo drago diventerà leggendario!', riddles: RIDDLES[3] },
    ],
  },
};
