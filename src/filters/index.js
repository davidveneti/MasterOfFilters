import { HookahFilter } from './HookahFilter.js';
import { LightningEyesFilter } from './LightningEyesFilter.js';
import { PowerUpFilter } from './PowerUpFilter.js';
import { BossBattleFilter } from './BossBattleFilter.js';
import { IronManHUDFilter } from './IronManHUDFilter.js';
import { DragonPetFilter } from './DragonPetFilter.js';

/**
 * To add a new filter: create src/filters/MyFilter.js (extends BaseFilter,
 * with static meta + static settings) and add it to this list.
 */
export const ALL_FILTERS = [
  HookahFilter,
  LightningEyesFilter,
  PowerUpFilter,
  BossBattleFilter,
  IronManHUDFilter,
  DragonPetFilter,
];

export function registerAllFilters(manager) {
  for (const F of ALL_FILTERS) manager.register(F);
  return manager;
}
