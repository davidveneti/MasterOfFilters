/** Names of every event travelling on the shared EventBus. */
export const GameEvents = Object.freeze({
  MISSION_START: 'mission:start',          // { mission, phaseIndex }
  MISSION_STOP: 'mission:stop',            // { missionId }
  MISSION_PHASE: 'mission:phase',          // { mission, phaseIndex, phase }
  MISSION_PHASE_UNLOCKED: 'mission:phaseUnlocked', // { mission, nextPhaseIndex }
  MISSION_COMPLETE: 'mission:complete',    // { mission }
  GAME_STATE: 'game:state',                // { snapshot }  (any change the UI must redraw)
  GAME_WRONG: 'game:wrong',                // { snapshot, message }
  GAME_STEP: 'game:step',                  // { snapshot }  (Vigenere: one letter solved)
  GAME_LEVEL_COMPLETE: 'game:levelComplete', // { snapshot }
  GAME_COMPLETE: 'game:complete',          // { snapshot }
  REWARD: 'reward',                        // { kind:'level'|'phase'|'badge', missionId, badgeId? }
  BADGE_UNLOCKED: 'badge:unlocked',        // { badge }
  PREFS_CHANGED: 'prefs:changed',          // { key, value }
});
