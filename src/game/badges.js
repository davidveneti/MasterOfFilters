/** Badge catalogue. Earning rules live in BadgeSystem; this is only data. */
export const BADGES = [
  {
    id: 'smoke-decoder', name: 'Smoke Decoder', icon: '💨', missionId: 'smoke-decoder',
    description: 'Hai letto i messaggi segreti nascosti nel fumo del narghilè usando il cifrario di Cesare.',
    how: 'Supera le 5 prove della missione Smoke Decoder (filtro Hookah).',
  },
  {
    id: 'secret-agent', name: 'Secret Agent', icon: '🕵️', missionId: 'secret-agent',
    description: 'Hai intercettato un messaggio con Cesare e poi decifrato tre codici Vigenère, anche senza aiuti. Agente promosso!',
    how: 'Supera le 4 prove della missione Secret Agent (filtro Lightning Eyes).',
  },
  {
    id: 'dragon-keeper', name: 'Dragon Keeper', icon: '🐲', missionId: 'dragon-evolution',
    delayMs: 5200, // let the legendary transformation play before covering the screen
    description: 'Hai fatto schiudere un uovo di drago e lo hai fatto evolvere fino a renderlo leggendario risolvendo i rebus di Minecraft.',
    how: 'Risolvi i 3 rebus del filtro Dragon Pet.',
  },
  {
    id: 'crypto-apprentice', name: 'Crypto Apprentice', icon: '🎓', requires: ['smoke-decoder', 'secret-agent'],
    description: 'Conosci sia Cesare sia Vigenère: ora sei un vero apprendista crittografo!',
    how: 'Ottieni sia il badge Smoke Decoder sia il badge Secret Agent.',
  },
];
