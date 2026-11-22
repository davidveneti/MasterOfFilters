import { GameManager } from './GameManager.js';
import { BadgeSystem } from './BadgeSystem.js';
import { CaesarGame } from './CaesarGame.js';
import { VigenereGame } from './VigenereGame.js';
import { RiddleGame } from './RiddleGame.js';
import { CAESAR_PRESETS, VIGENERE_PRESETS, RIDDLE_PRESETS } from './presets.js';
import { MISSIONS } from './missions.js';

/**
 * Composition root of the game layer.
 * To add a game: create it (extends BaseGame), its presets, and register it below.
 */
export function createGameLayer({ filterManager, bus, store }) {
  const badges = new BadgeSystem({ store, bus });           // subscribe BEFORE missions can complete
  const games = new GameManager({ filterManager, bus, store });
  games.registerGame(CaesarGame, CAESAR_PRESETS);
  games.registerGame(VigenereGame, VIGENERE_PRESETS);
  games.registerGame(RiddleGame, RIDDLE_PRESETS);
  for (const m of MISSIONS) games.registerMission(m);
  return { games, badges };
}
