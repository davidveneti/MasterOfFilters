/**
 * "Spiegami" content, written for 12-14 year olds.
 * Block types: p (paragraph), list, table, note, tip, tryit (interactive Caesar demo).
 */
export const THEORY = [
  {
    id: 'crypto',
    title: 'Cos\'è la crittografia?',
    blocks: [
      { type: 'p', text: 'La crittografia è l\'arte di nascondere un messaggio in modo che solo chi ha la "chiave giusta" riesca a leggerlo. La parola viene dal greco e vuol dire "scrittura nascosta".' },
      { type: 'p', text: 'Pensa a un lucchetto: tutti vedono la scatola, ma solo chi ha la chiave può aprirla. Nella crittografia la scatola è il messaggio e la chiave è un numero o una parola segreta.' },
      { type: 'list', title: 'Quattro parole da ricordare', items: [
        '<b>Testo in chiaro</b>: il messaggio normale, che si capisce (es. CIAO).',
        '<b>Testo cifrato</b>: il messaggio "mescolato" (es. FLDR).',
        '<b>Chiave</b>: il segreto che serve per cifrare e decifrare.',
        '<b>Cifrare / decifrare</b>: trasformare in codice / tornare al messaggio vero.',
      ] },
      { type: 'tip', text: 'Oggi la crittografia protegge le tue chat, le password e i pagamenti online. Quella che usi nel gioco è antichissima, ma i principi sono gli stessi!' },
    ],
  },
  {
    id: 'caesar',
    title: 'Il cifrario di Cesare',
    blocks: [
      { type: 'p', text: 'Giulio Cesare, 2000 anni fa, mandava ordini segreti ai suoi generali spostando ogni lettera di 3 posti in avanti nell\'alfabeto. Così A diventa D, B diventa E, C diventa F…' },
      { type: 'table', head: ['Lettera', 'A', 'B', 'C', 'D', 'E', '…', 'X', 'Y', 'Z'], rows: [['Diventa (chiave 3)', 'D', 'E', 'F', 'G', 'H', '…', 'A', 'B', 'C']] },
      { type: 'p', text: 'Esempio: <b>HELLO</b> → H+3=K, E+3=H, L+3=O, L+3=O, O+3=R → <b>KHOOR</b>.' },
      { type: 'p', text: 'Per <b>decifrare</b> si fa il contrario: si torna indietro di 3 posti. Se arrivi prima della A, ricominci dalla Z (come su un cerchio: ecco perché esiste la ruota!).' },
      { type: 'note', text: 'La chiave è il numero di posti (qui 3). Ma ci sono solo 25 chiavi possibili: basta provarle tutte per scoprire il messaggio. Per questo oggi Cesare non è sicuro.' },
      { type: 'tryit' },
    ],
  },
  {
    id: 'vigenere',
    title: 'Il cifrario di Vigenère',
    blocks: [
      { type: 'p', text: 'Vigenère è un\'idea più furba: invece di un numero, la chiave è una <b>parola</b>. Ogni lettera della parola dice di quanto spostare una lettera del messaggio.' },
      { type: 'p', text: 'Prima trasformiamo le lettere in numeri: A=0, B=1, C=2 … Z=25. Poi si somma (per cifrare) o si sottrae (per decifrare).' },
      { type: 'table', head: ['Messaggio', 'C', 'I', 'A', 'O'], rows: [
        ['Chiave (SOLE)', 'S', 'O', 'L', 'E'],
        ['Numeri', '2 + 18', '8 + 14', '0 + 11', '14 + 4'],
        ['Somma', '20', '22', '11', '18'],
        ['Cifrato', 'U', 'W', 'L', 'S'],
      ] },
      { type: 'p', text: 'Così CIAO diventa <b>UWLS</b>. Se la somma supera 25 si ricomincia da 0 (da A). Se il messaggio è più lungo della chiave, la chiave si <b>ripete</b>: SOLESOLE…' },
      { type: 'p', text: 'Per <b>decifrare</b> fai il contrario: lettera cifrata − lettera della chiave. Se il risultato è sotto zero aggiungi 26. Nel gioco ti guido passo per passo!' },
    ],
  },
  {
    id: 'diff',
    title: 'Differenze',
    blocks: [
      { type: 'table', head: ['', 'Cesare', 'Vigenère'], rows: [
        ['La chiave è', 'un numero', 'una parola'],
        ['Ogni lettera si sposta', 'sempre dello stesso numero', 'di numeri diversi'],
        ['La stessa lettera diventa', 'sempre la stessa', 'lettere diverse'],
        ['Chiavi possibili', 'solo 25', 'tantissime'],
        ['Difficile da rompere?', 'No, si prova a mano', 'Più difficile'],
      ] },
      { type: 'p', text: 'Vigenère per secoli è stato chiamato "il cifrario indecifrabile". Poi, nell\'Ottocento, qualcuno ha trovato il modo di romperlo. Anche i codici migliori prima o poi vengono battuti: è per questo che la crittografia moderna è sempre in evoluzione!' },
    ],
  },
  {
    id: 'examples',
    title: 'Esempi pratici',
    blocks: [
      { type: 'list', title: 'Dove si usa la crittografia, oggi', items: [
        '<b>WhatsApp e Telegram</b>: i messaggi viaggiano cifrati.',
        '<b>Il lucchetto 🔒 del browser</b>: protegge i siti dove inserisci dati.',
        '<b>Le password</b>: i siti seri non le salvano "in chiaro".',
        '<b>La carta di pagamento</b>: il numero viaggia cifrato.',
      ] },
      { type: 'list', title: 'Prova con un amico', items: [
        'Scegli una parola e una chiave (es. 5) e cifrala con Cesare.',
        'Passa il messaggio al tuo amico senza dirgli la chiave: riesce a scoprirla provando?',
        'Poi prova con una parola-chiave e Vigenère: è più difficile?',
      ] },
      { type: 'tip', text: 'Trucco da detective: nelle parole italiane le lettere più frequenti sono E, A, I, O. Se in un messaggio cifrato una lettera compare spesso, forse nasconde una E o una A!' },
    ],
  },
];
