// src/main.js — bootstrap, game loop, save/load, debug helpers
(function (AOW) {
  'use strict';
  const Main = {};
  let lastT = 0, rafId = 0, running = false;
  AOW.game = null;
  AOW.battle = null;

  function hasFn(ns, fn) { return AOW[ns] && typeof AOW[ns][fn] === 'function'; }

  Main.loop = function (t) {
    rafId = requestAnimationFrame(Main.loop);
    const dt = Math.min(0.1, (t - lastT) / 1000 || 0.016);
    lastT = t;
    try {
      if (hasFn('VFX', 'update')) AOW.VFX.update(dt);
      if (AOW.battle && hasFn('CombatRender', 'render')) AOW.CombatRender.render(dt);
      else if (AOW.game && hasFn('WorldRender', 'render')) AOW.WorldRender.render(dt);
      if (hasFn('UI', 'tick')) AOW.UI.tick(dt);
    } catch (e) {
      if (!Main._loopErr) { Main._loopErr = true; console.error('[loop]', e); }
    }
  };

  /** start a new game from settings (see State.create) */
  Main.startGame = function (settings) {
    const game = AOW.State.create(settings);
    AOW.game = game;
    AOW.battle = null;
    if (hasFn('WorldRender', 'setGame')) AOW.WorldRender.setGame(game);
    AOW.Events.emit('game:new', { game });
    if (hasFn('Turn', 'beginGame')) AOW.Turn.beginGame(game);
    if (hasFn('WorldRender', 'centerOn')) {
      const cap = game.cities.find(c => c.owner === 0 && c.isCapital) || game.cities[0];
      if (cap) AOW.WorldRender.centerOn(cap.hex, false);
    }
    if (hasFn('UI', 'showScreen')) AOW.UI.showScreen('hud');
    if (hasFn('Music', 'setMood')) AOW.Music.setMood('peace');
    if (hasFn('UI', 'refresh')) AOW.UI.refresh();
    return game;
  };

  Main.loadGame = function (game) {
    AOW.game = game;
    AOW.battle = null;
    if (hasFn('WorldRender', 'setGame')) AOW.WorldRender.setGame(game);
    AOW.Events.emit('game:new', { game, loaded: true });
    if (hasFn('UI', 'showScreen')) AOW.UI.showScreen('hud');
    if (hasFn('Music', 'setMood')) AOW.Music.setMood('peace');
    if (hasFn('UI', 'refresh')) AOW.UI.refresh();
    return game;
  };

  const SAVE_KEY = 'aow.save.';
  Main.save = function (slot = 'quick') {
    if (!AOW.game) return false;
    try {
      const s = AOW.State.serialize(AOW.game);
      localStorage.setItem(SAVE_KEY + slot, s);
      localStorage.setItem(SAVE_KEY + slot + '.meta', JSON.stringify({ turn: AOW.game.turn, date: Date.now(), name: (AOW.game.players[0] || {}).name || '' }));
      AOW.Events.emit('notify', { kind: 'good', text: AOW.t('ui.saved') });
      return true;
    } catch (e) { console.error(e); AOW.Events.emit('notify', { kind: 'bad', text: AOW.t('ui.saveFailed') }); return false; }
  };
  Main.load = function (slot = 'quick') {
    try {
      const s = localStorage.getItem(SAVE_KEY + slot);
      if (!s) return false;
      const game = AOW.State.deserialize(s);
      Main.loadGame(game);
      AOW.Events.emit('notify', { kind: 'good', text: AOW.t('ui.loaded') });
      return true;
    } catch (e) { console.error(e); return false; }
  };
  Main.hasSave = function (slot = 'quick') { try { return !!localStorage.getItem(SAVE_KEY + slot); } catch (e) { return false; } };
  Main.saveMeta = function (slot = 'quick') { try { return JSON.parse(localStorage.getItem(SAVE_KEY + slot + '.meta') || 'null'); } catch (e) { return null; } };

  Main.init = function () {
    if (running) return;
    running = true;
    AOW.I18n.add({
      ko: { 'ui.saved': '저장했습니다.', 'ui.saveFailed': '저장에 실패했습니다.', 'ui.loaded': '불러왔습니다.' },
      en: { 'ui.saved': 'Game saved.', 'ui.saveFailed': 'Save failed.', 'ui.loaded': 'Game loaded.' },
    });
    // dev validation
    try {
      const errs = AOW.Data.validate();
      if (errs.length) console.warn('[Data.validate] ' + errs.length + ' problems', errs.slice(0, 40));
    } catch (e) { console.warn('validate failed', e); }
    // audio unlock on first gesture: create the AudioContext and start the mood playlist (nothing else ever
    // calls Music.play, so without this the game stays silent)
    const unlock = () => {
      try {
        if (hasFn('Audio', 'init')) AOW.Audio.init();
        if (hasFn('Music', 'setMood')) AOW.Music.setMood(AOW.battle ? 'battle' : AOW.game ? 'peace' : 'menu');
        if (hasFn('Music', 'play') && hasFn('Music', 'isPlaying') && !AOW.Music.isPlaying() && !(hasFn('Music', 'isPaused') && AOW.Music.isPaused())) AOW.Music.play(null);
      } catch (e) { console.warn(e); }
      window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    // renderers
    const worldCv = document.getElementById('world');
    if (worldCv && hasFn('WorldRender', 'init')) AOW.WorldRender.init(worldCv, null);
    if (hasFn('UI', 'init')) AOW.UI.init();
    if (hasFn('UI', 'showScreen')) AOW.UI.showScreen('menu');
    lastT = performance.now();
    rafId = requestAnimationFrame(Main.loop);
    // global hotkeys handled by UI; here: F5/F9 quick save/load
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F5') { e.preventDefault(); Main.save('quick'); }
      if (e.key === 'F9') { e.preventDefault(); Main.load('quick'); }
    });
  };

  // ------------------------------------------------------------ debug helpers
  const Debug = {};
  Debug.newGameAndSkipMenu = function (overrides) {
    const settings = AOW.State.quickSettings ? AOW.State.quickSettings(overrides || {}) : (overrides || {});
    return Main.startGame(settings) ? 'ok' : 'fail';
  };
  Debug.giveResources = function (n = 5000) {
    const p = AOW.game && AOW.game.players[0];
    if (!p) return;
    p.resources.gold += n; p.resources.mana += n; p.resources.knowledge += n; p.resources.imperium += n;
    if (hasFn('UI', 'refresh')) AOW.UI.refresh();
  };
  Debug.revealMap = function (pid = 0) {
    const g = AOW.game; if (!g) return;
    g.explored[pid].fill(1); if (g.visible[pid]) g.visible[pid].fill(1);
    if (hasFn('WorldRender', 'invalidate')) AOW.WorldRender.invalidate(null);
  };
  Debug.startTestBattle = function () {
    const g = AOW.game; if (!g || !AOW.Combat) return 'no game';
    const a = g.armies.find(x => x.owner === 0);
    const b = g.armies.find(x => x.owner !== 0 && x.units.length);
    if (!a || !b) return 'no armies';
    const battle = AOW.Combat.create(g, { attackerArmyIds: [a.id], defenderArmyIds: [b.id], hexIdx: b.hex });
    AOW.Events.emit('battle:start', { battle });
    return battle.id;
  };
  /** move an army straight to hexIdx (no pathing/MP) and refresh vision + renderer — test setup helper */
  Debug.teleportArmy = function (armyId, hexIdx) {
    const g = AOW.game; if (!g) return false;
    const a = AOW.State.army(g, armyId); if (!a) return false;
    a.hex = hexIdx; a.path = null;
    if (a.owner >= 0 && hasFn('Rules', 'recomputeVisibility')) AOW.Rules.recomputeVisibility(g, a.owner);
    if (hasFn('WorldRender', 'invalidate')) AOW.WorldRender.invalidate(null);
    if (hasFn('UI', 'refresh')) AOW.UI.refresh();
    return true;
  };
  /** drop every unit of an army to `hp` (default 1) — makes a guard stack beatable in a test */
  Debug.weakenArmy = function (armyId, hp = 1) {
    const g = AOW.game; if (!g) return 0;
    const a = AOW.State.army(g, armyId); if (!a) return 0;
    for (const uid of a.units) { const u = AOW.State.unit(g, uid); if (u) u.hp = Math.min(u.hp, hp); }
    return a.units.length;
  };
  /** knock a realm out of the game: its cities become free cities, its armies vanish; the next turn's
   *  elimination check marks it dead (so Turn/Events report it the normal way) */
  Debug.eliminate = function (pid) {
    const g = AOW.game; if (!g) return false;
    const p = g.players[pid]; if (!p) return false;
    for (const a of g.armies.slice()) if (a.owner === pid) AOW.State.removeArmy(g, a.id);
    for (const c of g.cities) if (c.owner === pid) {
      c.owner = -1; c.isCapital = false; c.queue = [];
      c.freeCity = { culture: p.cultureId, form: p.formId, opinion: {}, vassalOf: -1, integrated: false, stones: [], warWith: [] };
      const st = AOW.State.structureAt(g, c.hex); if (st) { st.kind = 'free_city'; st.owner = -1; }
      for (const pr of c.provinces || []) { const prov = g.provinces[pr]; if (prov) { prov.owner = -1; for (const h of prov.hexes) g.owner[h] = -1; } }
    }
    for (const u of g.units.slice()) if (u.owner === pid && hasFn('State', 'removeUnit')) AOW.State.removeUnit(g, u.id);
    if (hasFn('WorldRender', 'invalidate')) AOW.WorldRender.invalidate(null);
    return true;
  };
  Debug.endTurn = function (n = 1) { for (let i = 0; i < n; i++) AOW.Turn.endTurn(AOW.game); return AOW.game.turn; };
  Debug.stats = function () {
    const g = AOW.game; if (!g) return null;
    return { turn: g.turn, players: g.players.map(p => ({ id: p.id, alive: p.alive, cities: g.cities.filter(c => c.owner === p.id).length, armies: g.armies.filter(a => a.owner === p.id).length, res: p.resources })) };
  };
  AOW.Debug = Debug;
  AOW.Main = Main;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Main.init);
  else Main.init();
})(window.AOW = window.AOW || {});
