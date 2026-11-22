import { GameEvents } from './events.js';

/**
 * Sits between FilterManager and the UI:
 *
 *   UI  ->  FilterManager  ->  GameManager  ->  CaesarGame / VigenereGame
 *
 * - Listens to FilterManager 'change' and starts/stops the mission bound to the
 *   active filter (no mission = no game, zero cost).
 * - Owns the active game, its persistence and the phase flow of a mission.
 * - Translates game results into mission events and rewards on the shared bus.
 * Games never know about filters; filters never know about games (they only
 * hear events such as REWARD).
 */
export class GameManager {
  /**
   * @param {object} deps
   * @param {import('../filters/FilterManager.js').FilterManager} deps.filterManager
   * @param {import('../core/EventBus.js').EventBus} deps.bus
   * @param {import('../storage/ProgressStore.js').ProgressStore} deps.store
   */
  constructor({ filterManager, bus, store }) {
    this.filterManager = filterManager;
    this.bus = bus;
    this.store = store;
    this.gameClasses = new Map();  // gameId -> class
    this.presets = new Map();      // gameId -> { presetId: preset }
    this.missions = new Map();     // missionId -> mission
    this.mission = null;
    this.phaseIndex = 0;
    this.game = null;
    this.savedPhases = {};
    this.completed = false;

    this.unsubs = [
      filterManager.on('change', (filter) => this._onFilterChange(filter)),
      bus.on(GameEvents.GAME_LEVEL_COMPLETE, () => this._onLevelComplete()),
      bus.on(GameEvents.GAME_COMPLETE, () => this._onGameComplete()),
    ];
  }

  // ---------------------------------------------------------------- registration
  registerGame(GameClass, presets) {
    this.gameClasses.set(GameClass.meta.id, GameClass);
    this.presets.set(GameClass.meta.id, presets);
    return this;
  }
  registerMission(mission) { this.missions.set(mission.id, mission); return this; }
  getMissionForFilter(filterId) {
    for (const m of this.missions.values()) if (m.filterId === filterId) return m;
    return null;
  }
  get active() { return !!this.mission; }

  // ---------------------------------------------------------------- filter coupling
  _onFilterChange(filter) {
    const id = filter && filter.constructor.meta.id;
    const mission = id ? this.getMissionForFilter(id) : null;
    if (mission) this.startMission(mission.id);
    else this.stopMission();
  }

  // ---------------------------------------------------------------- mission flow
  /** Start (or resume from storage) a mission. */
  startMission(missionId) {
    const mission = this.missions.get(missionId);
    if (!mission) return false;
    if (this.mission && this.mission.id === missionId) return true;
    this.stopMission();
    const saved = this.store.getMission(missionId);
    this.mission = mission;
    this.savedPhases = (saved && saved.phases) || {};
    this.completed = !!(saved && saved.completed);
    const idx = saved ? Math.min(Math.max(0, saved.phaseIndex | 0), mission.phases.length - 1) : 0;
    this.bus.emit(GameEvents.MISSION_START, { mission, phaseIndex: idx });
    this._openPhase(idx);
    // a save made with an older, shorter mission must not count as "completed"
    const reallyDone = idx === mission.phases.length - 1 && this.game.finished;
    if (this.completed && !reallyDone) { this.completed = false; this._persist(); }
    return true;
  }

  stopMission() {
    if (!this.mission) return;
    this._disposeGame();
    const id = this.mission.id;
    this.mission = null;
    this.bus.emit(GameEvents.MISSION_STOP, { missionId: id });
  }

  _openPhase(index) {
    this._disposeGame();
    const phase = this.mission.phases[index];
    const GameClass = this.gameClasses.get(phase.game);
    const preset = this.presets.get(phase.game)[phase.preset];
    if (!GameClass || !preset) throw new Error(`Unknown game/preset: ${phase.game}/${phase.preset}`);
    this.phaseIndex = index;
    this.game = new GameClass({ bus: this.bus, preset });
    this.game.initialize(this.savedPhases[phase.id] || null);
    this.bus.emit(GameEvents.MISSION_PHASE, { mission: this.mission, phaseIndex: index, phase });
    this.game.start();
    this._persist();
  }

  _disposeGame() {
    if (this.game) { this.game.dispose(); this.game = null; }
  }

  /**
   * Continue after a solved level/round/phase.
   * @returns {'level'|'phase'|'done'|'none'}
   */
  advance() {
    if (!this.game) return 'none';
    const snap = this.game.getSnapshot();
    if (!snap.solved) return 'none';
    if (this.game.finished) {
      if (this.phaseIndex < this.mission.phases.length - 1) {
        this._openPhase(this.phaseIndex + 1);
        return 'phase';
      }
      return 'done';
    }
    this.game.advance();
    this._persist();
    return 'level';
  }

  /** @returns {{correct:boolean, message:string}} */
  submit(input) {
    if (!this.game) return { correct: false, message: '' };
    const res = this.game.checkSolution(input);
    this._persist();
    return res;
  }

  /**
   * Call a game-specific action (e.g. 'setKey', 'solveStep') through the manager
   * so views never hold a reference to the game itself.
   * @param {string} name method name @param {...*} args
   */
  invoke(name, ...args) {
    if (!this.game || typeof this.game[name] !== 'function') return undefined;
    const res = this.game[name](...args);
    if (name !== 'setKey') this._persist(); // slider drags are not worth a write each
    return res;
  }

  hint() {
    if (!this.game) return '';
    const text = this.game.hint();
    this._persist();
    return text;
  }

  /** Forget this mission's progress and restart it (badges are kept). */
  resetMission() {
    if (!this.mission) return;
    const m = this.mission;
    this.store.resetMission(m.id);
    this.savedPhases = {};
    this.completed = false;
    this._openPhase(0);
  }

  update(dt) { if (this.game) this.game.update(dt); }

  // ---------------------------------------------------------------- game events
  _onLevelComplete() {
    if (!this.mission) return;
    this._persist();
    this.bus.emit(GameEvents.REWARD, { kind: 'level', missionId: this.mission.id });
  }

  _onGameComplete() {
    if (!this.mission || !this.game) return;
    const reward = this.game.unlockReward();
    const last = this.phaseIndex >= this.mission.phases.length - 1;
    if (!last) {
      this._persist();
      this.bus.emit(GameEvents.MISSION_PHASE_UNLOCKED, { mission: this.mission, nextPhaseIndex: this.phaseIndex + 1 });
      this.bus.emit(GameEvents.REWARD, { kind: 'phase', missionId: this.mission.id });
      return;
    }
    const firstTime = !this.completed;
    this.completed = true;
    this._persist(firstTime ? new Date().toISOString() : undefined);
    // BadgeSystem listens to MISSION_COMPLETE and announces a NEW badge (REWARD kind 'badge')
    const hadBadge = this.store.hasBadge(this.mission.badgeId);
    if (reward || firstTime) this.bus.emit(GameEvents.MISSION_COMPLETE, { mission: this.mission });
    // replaying a finished mission: no new badge, but still celebrate
    if (hadBadge) this.bus.emit(GameEvents.REWARD, { kind: 'level', missionId: this.mission.id });
  }

  // ---------------------------------------------------------------- persistence + views
  _persist(completedAt) {
    if (!this.mission || !this.game) return;
    const phase = this.mission.phases[this.phaseIndex];
    this.savedPhases[phase.id] = this.game.serialize();
    const prev = this.store.getMission(this.mission.id) || {};
    this.store.saveMission(this.mission.id, {
      phaseIndex: this.phaseIndex,
      phases: this.savedPhases,
      completed: this.completed,
      completedAt: completedAt || prev.completedAt || null,
    });
  }

  /** @returns {{done:number,total:number}} trials (levels/rounds) passed in the whole mission */
  getTrials() {
    if (!this.mission || !this.game) return { done: 0, total: 0 };
    let done = 0, total = 0;
    this.mission.phases.forEach((phase, i) => {
      const n = this.gameClasses.get(phase.game).trialCount(this.presets.get(phase.game)[phase.preset]);
      total += n;
      if (i < this.phaseIndex) done += n;
    });
    done += this.game.getTrials().done;
    return { done: Math.min(done, total), total };
  }

  /** @returns {number} overall mission progress 0..1 (trials passed / total trials) */
  getMissionProgress() {
    const { done, total } = this.getTrials();
    return total ? done / total : 0;
  }

  /**
   * Visual stage of the active mission: index = trials passed (capped to the last stage).
   * Filters read this to change their look (smoke color, eye lightning color, Power Up...).
   * @returns {{missionId:string, index:number, done:number, total:number, name:string, css:string, data:object|null, last:boolean}|null}
   */
  getStage() {
    if (!this.mission || !this.game) return null;
    const stages = this.mission.stages || [];
    const { done, total } = this.getTrials();
    const index = Math.min(done, Math.max(0, stages.length - 1));
    const data = stages[index] || null;
    return {
      missionId: this.mission.id, index, done, total,
      name: data ? data.name : '', css: data ? data.css : '#ffffff', data,
      last: stages.length > 0 && index === stages.length - 1,
    };
  }

  /** @returns {object|null} UI-ready view model of the whole mission */
  getSnapshot() {
    if (!this.mission || !this.game) return null;
    const m = this.mission;
    return {
      mission: { id: m.id, title: m.title, subtitle: m.subtitle, badgeId: m.badgeId, filterId: m.filterId, stageLabel: m.stageLabel || 'Effetto' },
      phaseIndex: this.phaseIndex,
      phaseCount: m.phases.length,
      phase: m.phases[this.phaseIndex],
      completed: this.completed,
      progress: this.getMissionProgress(),
      trials: this.getTrials(),
      stage: this.getStage(),
      stages: (m.stages || []).map(({ name, css }) => ({ name, css })),
      game: this.game.getSnapshot(),
    };
  }

  dispose() {
    this.stopMission();
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }
}
