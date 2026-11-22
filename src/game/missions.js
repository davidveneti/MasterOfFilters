/**
 * Missions bind a filter to an ordered list of phases (mini-games + presets).
 * To add a mission: add an entry here (and, if needed, a game + preset).
 * @typedef {{id:string, game:string, preset:string, title:string}} Phase
 * @typedef {{name:string, css:string}} Stage  visual stage of the filter; index = number of trials passed (extra keys are read by the filter)
 * @typedef {{id:string, filterId:string, title:string, subtitle:string, badgeId:string, phases:Phase[], stages:Stage[]}} Mission
 */

/** @type {Mission[]} */
export const MISSIONS = [
  {
    id: 'smoke-decoder',
    filterId: 'hookah',
    title: 'SMOKE DECODER',
    subtitle: 'Il fumo del narghilè nasconde messaggi segreti. Apri la bocca per farlo uscire e decifralo!',
    badgeId: 'smoke-decoder',
    phases: [{ id: 'caesar', game: 'caesar', preset: 'smokeDecoder', title: 'Decifra il fumo' }],
    stageLabel: 'Colore del fumo',
    // 5 trials -> 6 stages. Stage index = trials passed. The smoke changes color at every new level.
    stages: [
      { name: 'Bianco', css: '#f2f4f7', tint: [1.0, 1.0, 1.0] },
      { name: 'Giallo', css: '#ffd83d', tint: [1.0, 0.86, 0.15] },
      { name: 'Rosso', css: '#ff4d4d', tint: [1.0, 0.18, 0.15] },
      { name: 'Verde', css: '#3fd96b', tint: [0.2, 0.9, 0.3] },
      { name: 'Blu', css: '#4d8dff', tint: [0.25, 0.5, 1.0] },
      { name: 'Viola', css: '#a855ff', tint: [0.65, 0.3, 1.0] },
    ],
  },
  {
    id: 'secret-agent',
    filterId: 'lightning-eyes',
    title: 'SECRET AGENT',
    subtitle: 'Hai intercettato un messaggio nemico. Decifralo prima che sia troppo tardi!',
    badgeId: 'secret-agent',
    phases: [
      { id: 'intercept', game: 'caesar', preset: 'agentIntercept', title: 'Fase 1 · Cesare' },
      { id: 'vigenere', game: 'vigenere', preset: 'agentGuided', title: 'Fase 2 · Vigenère' },
    ],
    stageLabel: 'Effetto occhi',
    // 4 trials (Caesar, guided Vigenere, 2 unguided Vigenere) -> 5 stages. Stage index = trials passed.
    stages: [
      { name: 'Occhi blu', css: '#4d8dff', effect: 'blue' },
      { name: 'Lampi viola', css: '#a855ff', effect: 'purple' },
      { name: 'Occhi fiammeggianti', css: '#ff4d3a', effect: 'red' },
      { name: 'Occhi fiammeggianti', css: '#ff4d3a', effect: 'red' },
      { name: 'Fiamme + Power Up', css: '#ff8a3d', effect: 'red', powerUp: true },
    ],
  },
  {
    id: 'dragon-evolution',
    filterId: 'dragon-pet',
    title: 'DRAGON EVOLUTION',
    subtitle: 'Un uovo di drago verde ti aspetta sulla spalla. Risolvi i rebus di Minecraft per farlo schiudere e crescere!',
    badgeId: 'dragon-keeper',
    phases: [{ id: 'rebus', game: 'riddle', preset: 'minecraftRebus', title: 'Fai crescere il drago' }],
    stageLabel: 'Il tuo drago',
    // 3 trials -> 4 forms. Stage index = rebus solved. `form` is read by DragonPetFilter.
    stages: [
      { name: 'Uovo di drago', css: '#4caf50', form: 'egg' },
      { name: 'Cucciolo verde (senza ali)', css: '#4caf50', form: 'hatchling' },
      { name: 'Drago alato verde', css: '#43d96b', form: 'winged' },
      { name: 'Drago leggendario', css: '#ff3b3b', form: 'legendary' },
    ],
  },
];
