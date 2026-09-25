// src/game/turn.js — turn flow: begin game, end turn, per-player upkeep, world tick, victory (SPEC §5)
//
// Public API (SPEC §5 contract + additive helpers, documented here per Ground Rule 0):
//   Turn.beginGame(game)              once after State.create: guards, visibility, first research, notifications
//   Turn.endTurn(game)                human ended their turn → every alive AI plays (AOW.AI.playTurn when present)
//                                     and is upkept, game.turn advances, the human is upkept, Turn.beginTurn runs.
//                                     Fully synchronous.
//   Turn.processPlayer(game, pid)     income, growth, production, research, casting, upkeep, healing, statuses,
//                                     MP reset, hero respawn, stability, visibility + (once per game turn) the world tick
//   Turn.beginTurn(game)              emits 'turn:begin' for the human player
//   Turn.worldTick(game)              once per game turn: free cities, infestation raids, guard regen, Diplomacy.tick,
//                                     elimination + victory check (guarded by game.worldTickTurn)
//   Turn.startBattle(game, spec, opts)  resolve or queue a battle. spec is the Rules.attackTarget shape.
//                                     Battles the human is part of are queued into game.pendingBattles and
//                                     'battle:start' is emitted when game.settings.manualDefense is on; otherwise
//                                     they are auto-resolved through AOW.Combat.autoResolve (or Rules.quickResolve).
//   Turn.finishBattle(game, spec, result)  post-battle bookkeeping: structure clearing, city capture, XP, notifications
//   Turn.resolvePending(game, battle, result)  UI hands a manually-fought battle back here
//   Turn.nextUnit(game, pid)          → {armyId, hex} of the next army with movement left, or null
//   Turn.readyToEnd(game, pid)        → {ok, idle:[armyId…]} — HUD "units can still move" warning
//   Turn.humanPid(game)               → the first human player id (−1 when there is none)
//
// Extra state fields: game.pendingBattles [], game.worldTickTurn, game.turnStats {ms}, army.raid {home, born}
(function (AOW) {
  'use strict';
  const Turn = {};
  const S = () => AOW.State;
  const R = () => AOW.Rules;
  const Hex = () => AOW.Hex;
  const Events = () => AOW.Events;
  const L = (ko, en) => ({ ko, en });
  const J = (w, pair) => AOW.I18n.josa(w, pair);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const fn = (ns, name) => (AOW[ns] && typeof AOW[ns][name] === 'function' ? AOW[ns][name] : null);

  Turn.humanPid = function (game) {
    for (const p of game.players) if (p.isHuman) return p.id;
    return -1;
  };

  // ==================================================================== BEGIN GAME
  /** One-time setup after State.create: guards, initial vision, starting research and the opening notification. */
  Turn.beginGame = function (game) {
    const Rules = R();
    game.pendingBattles = game.pendingBattles || [];
    game.notifications = game.notifications || [];
    game.worldTickTurn = 0;
    game.turnStats = { ms: 0 };
    try { Rules.spawnGuards(game); } catch (e) { AOW.warn('Turn.beginGame guards', e); }
    for (const p of game.players) {
      Rules.ensurePlayer(game, p);
      for (const c of game.cities) if (c.owner === p.id) Rules.ensureCity(game, c);
      for (const u of S().allUnitsOfPlayer(game, p.id)) Rules.syncUnit(game, u, true);
      Rules.cityCap(game, p);
      Rules.castingMax(game, p);
      p.casting.cp = p.casting.cpMax;
      try { Rules.autoResearch(game, p); } catch (e) { AOW.warn('Turn.beginGame research', e); }
      try { Rules.recomputeVisibility(game, p.id); } catch (e) { AOW.warn('Turn.beginGame vision', e); }
      try { Rules.playerIncome(game, p); } catch (e) { AOW.warn('Turn.beginGame income', e); }
      p.stats.cities = Rules.cityCount(game, p.id);
      p.stats.units = S().allUnitsOfPlayer(game, p.id).length;
      p.stats.territory = game.provinces.filter(q => q.owner === p.id).length;
      Rules.score(game, p);
    }
    for (const c of game.cities) if (c.freeCity) { c.freeCity.stones = c.freeCity.stones || []; c.freeCity.warWith = c.freeCity.warWith || []; }
    for (const a of game.armies) a.mp = Rules.armyMaxMp(game, a);
    const hp = Turn.humanPid(game);
    if (hp >= 0) {
      const cap = S().capital(game, hp);
      Rules.notify(game, hp, 'good', L('새로운 영지에서 제국을 일으키십시오.', 'Raise your empire in a new realm.'), 'crown', cap ? { cityId: cap.id } : null);
    }
    Turn.beginTurn(game);
    return game;
  };

  // ==================================================================== END TURN
  /** Human ends their turn: AI players act and are upkept, the turn advances, then the human is upkept. */
  Turn.endTurn = function (game) {
    if (!game) return null;
    const Rules = R();
    const t0 = now();
    const hp = Turn.humanPid(game);
    // the game stops at a result until the player chooses to play on (victory screen → Continue sets .continued)
    if (game.victory && !game.victory.continued) return game.victory;
    // everything notified from here on (AI phase, upkeep, the human's next turn) belongs to the human's next
    // turn in the HUD feed — the AI phase still runs under the old game.turn number
    game.notifSince = game.nextId && game.nextId.notification ? game.nextId.notification - 1 : 0;
    if (Events()) Events().emit('turn:end', { pid: hp, turn: game.turn });
    // AI players act inside the turn the human just finished
    for (const p of game.players) {
      if (!p.alive || p.isHuman) continue;
      const play = fn('AI', 'playTurn');
      if (play) { try { play(game, p.id); } catch (e) { AOW.warn('AI.playTurn p' + p.id, e); } }
      try { Turn.processPlayer(game, p.id); } catch (e) { AOW.warn('processPlayer p' + p.id, e); }
      if (game.victory && !game.victory.continued) break;
    }
    game.turn++;
    if (hp >= 0) { try { Turn.processPlayer(game, hp); } catch (e) { AOW.warn('processPlayer human', e); } }
    else { try { Turn.worldTick(game); } catch (e) { AOW.warn('worldTick', e); } }
    Turn.beginTurn(game);
    game.turnStats = { ms: Math.round((now() - t0) * 10) / 10 };
    return game.victory && !game.victory.continued ? game.victory : null;
  };

  /** Announce the start of the human player's turn. */
  Turn.beginTurn = function (game) {
    const hp = Turn.humanPid(game);
    if (Events()) Events().emit('turn:begin', { turn: game.turn, pid: hp });
    return game.turn;
  };

  // ==================================================================== PER-PLAYER UPKEEP
  /** Income, growth, production, research, casting, healing, statuses and movement reset for one player. */
  Turn.processPlayer = function (game, pid) {
    const Rules = R();
    const player = S().player(game, pid);
    if (!player) return null;
    Rules.ensurePlayer(game, player);
    if (!player.alive) return null;
    Rules.invalidate(pid);
    const out = { pid, income: null, grown: [], completed: [], research: null };

    // --- world-level bookkeeping, once per game turn
    Turn.worldTick(game);

    // --- income
    const inc = Rules.playerIncome(game, player);
    out.income = inc;
    player.resources.gold += inc.gold;
    player.resources.mana += inc.mana;
    player.resources.knowledge += inc.knowledge;
    player.resources.imperium += inc.imperium;
    if (player.resources.gold < 0) {
      Rules.notify(game, pid, 'bad', L('국고가 바닥났습니다! 부대의 사기가 떨어집니다.', 'The treasury is empty! Your troops lose morale.'), 'gold', null);
      for (const c of game.cities) if (c.owner === pid) Rules.addStabilityMod(game, c, 'bankrupt', -10, 2, L('재정 파탄', 'Bankruptcy'));
      player.resources.gold = 0;
    }
    if (player.resources.mana < 0) {
      // drop enchantments until mana upkeep is affordable again
      const actives = (player.spells.active || []).filter(a => { const sp = AOW.Data.spells[a.spellId]; return sp && sp.upkeep && sp.upkeep.mana; });
      while (player.resources.mana < 0 && actives.length) {
        const a = actives.pop();
        Rules.dispel(game, player, a.spellId, a.target || null);
        const sp = AOW.Data.spells[a.spellId];
        player.resources.mana += (sp && sp.upkeep && sp.upkeep.mana) || 0;
        Rules.notify(game, pid, 'warn', L(`마나 부족으로 ${AOW.L(sp ? sp.name : { en: a.spellId })} 효과가 사라졌습니다.`,
          `${AOW.L(sp ? sp.name : { en: a.spellId })} lapsed — not enough mana.`), 'mana', { spellId: a.spellId });
      }
      if (player.resources.mana < 0) player.resources.mana = 0;
    }

    // --- cities: growth, production, stability
    for (const city of game.cities) {
      if (city.owner !== pid) continue;
      Rules.ensureCity(game, city);
      const y = Rules.cityYields(game, city);
      // growth / starvation
      if (city.tier >= 1) {
        city.growth += y.food;
        if (city.growth < 0) {
          if (city.pop > 1) {
            city.pop--;
            city.growth = 0;
            Rules.notify(game, pid, 'bad', L(`${city.name}에 기근이 들어 인구가 줄었습니다.`, `${city.name} is starving — population lost.`), 'food', { cityId: city.id });
          } else city.growth = 0;
        }
        let guard = 0;
        while (city.pop < C_(Rules).CITY_TIERS[C_(Rules).MAX_TIER] && city.growth >= Rules.growthNeeded(game, city) && guard++ < 5) {
          city.growth -= Rules.growthNeeded(game, city);
          city.pop++;
          out.grown.push(city.id);
          const tier = Math.min(Rules.cityTierForPop(city.pop), C_(Rules).MAX_TIER);
          if (tier > city.tier) city.tier = tier;
          Rules.notify(game, pid, 'good', L(`${city.name}의 인구가 ${J(city.pop, '으로/로')} 늘었습니다.`, `${city.name} has grown to ${city.pop} population.`), 'pop', { cityId: city.id }, { low: true });
          if (Events()) Events().emit('city:changed', { cityId: city.id });
        }
      }
      // production queue
      const done = Rules.processQueue(game, city, y.production, y.draft);
      for (const it of done) out.completed.push({ cityId: city.id, item: it });
      // stability drift toward its target
      const target = y.stability;
      const diff = target - city.stability;
      if (diff) city.stability = clamp(city.stability + clamp(diff, -C_(Rules).STAB_DRIFT, C_(Rules).STAB_DRIFT), -100, 100);
      // timed modifiers
      city.stabilityMods = (city.stabilityMods || []).filter(m => { if (m.turns === undefined || m.turns === null) return true; m.turns--; return m.turns > 0; });
      city.tempEffects = (city.tempEffects || []).filter(te => { te.turns--; return te.turns > 0; });
      if (city.stability <= -80) {
        Rules.notify(game, pid, 'warn', L(`${city.name}에서 폭동이 일어나고 있습니다.`, `${city.name} is rioting.`), 'stability', { cityId: city.id });
      }
    }
    // empire-wide temporary effects
    const beforeTemp = player.tempEffects.length;
    player.tempEffects = player.tempEffects.filter(te => { te.turns--; return te.turns > 0; });
    if (player.tempEffects.length !== beforeTemp) Rules.invalidate(pid);

    // --- research
    out.research = Rules.advanceResearch(game, player);

    // --- world casting points
    Rules.castingMax(game, player);
    player.casting.cp = player.casting.cpMax;
    Rules.advanceCasting(game, player);

    // --- units: healing, statuses, XP, movement reset
    for (const u of S().allUnitsOfPlayer(game, pid)) {
      const army = u.armyId !== null && u.armyId >= 0 ? S().army(game, u.armyId) : null;
      const hex = army ? army.hex : -1;
      const st = Rules.unitStats(game, u);
      if (u.maxHp !== st.maxHp) Rules.syncUnit(game, u);
      let heal = 0;
      if (hex >= 0) {
        const owner = game.owner[hex];
        const city = S().cityAt(game, hex);
        if (city && city.owner === pid) heal = C_(Rules).HEAL.DOMAIN + C_(Rules).HEAL.CITY;
        else if (owner === pid) heal = C_(Rules).HEAL.DOMAIN;
        else if (owner >= 0 && owner !== pid) heal = C_(Rules).HEAL.HOSTILE;
        else heal = C_(Rules).HEAL.OUTSIDE;
      }
      heal += st.healPerTurn || 0;
      if (heal > 0 && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + heal);
      // statuses countdown
      if (u.statuses && u.statuses.length) {
        u.statuses = u.statuses.filter(s => { if (s.turns === undefined || s.turns === null || s.turns <= 0) return false; s.turns--; return s.turns > 0; });
      }
      Rules.grantXp(game, u, C_(Rules).XP_PER_TURN);
    }
    for (const a of game.armies) {
      if (a.owner !== pid) continue;
      a.mp = Rules.armyMaxMp(game, a);
      a.path = null;
      a.defending = false; a.sleeping = false;   // hold-position / sleep only last one turn
      delete a._teleported;
    }

    // --- heroes: respawn fallen rulers at the capital
    for (const hero of S().playerHeroes(game, pid)) {
      if (!hero.dead) continue;
      if (hero.respawnTurns > 0) hero.respawnTurns--;
      const due = hero.respawnAt !== undefined ? game.turn >= hero.respawnAt : hero.respawnTurns <= 0;
      if (!due) continue;
      if (!hero.isRuler) continue;                       // only rulers return on their own
      const cap = S().capital(game, pid) || game.cities.find(c => c.owner === pid);
      if (!cap) continue;
      const army = Rules.garrisonArmy(game, cap, true);
      const typeId = heroUnitTypeId(hero.rulerType);
      const unit = Rules.createUnitFor(game, pid, typeId, army.id);
      if (!unit) continue;
      unit.heroId = hero.id; unit.name = hero.name; unit.formId = player.formId;
      hero.unitId = unit.id; hero.dead = false; hero.respawnTurns = 0; hero.respawnAt = undefined;
      Rules.syncUnit(game, unit, true);
      Rules.notify(game, pid, 'good', L(`${J(hero.name, '이/가')} 돌아왔습니다.`, `${hero.name} has returned.`), 'crown', { heroId: hero.id, cityId: cap.id });
    }

    // --- free-city allegiance from this player's whispering stones is handled in the world tick

    Rules.recomputeVisibility(game, pid);
    player.stats.cities = Rules.cityCount(game, pid);
    player.stats.units = S().allUnitsOfPlayer(game, pid).length;
    player.stats.territory = game.provinces.filter(q => q.owner === pid).length;
    Rules.score(game, player);
    Rules.playerIncome(game, player);

    const v = Rules.victoryCheck(game);
    if (v && !game.victory) {
      game.victory = v;
      if (Events()) Events().emit('victory', v);
      const w = S().player(game, v.winner);
      const VT = { military: ['군사 승리', 'military victory'], magic: ['마법 승리', 'magic victory'], expansion: ['확장 승리', 'expansion victory'], score: ['점수 승리', 'score victory'] }[v.type] || [v.type, v.type];
      Rules.notifyWorld(game, 'good', L(`${w ? w.name : ''} — ${VT[0]}!`, `${w ? w.name : ''} wins — ${VT[1]}!`), 'crown', v);
    }
    return out;
  };
  const C_ = Rules => Rules.C;
  function heroUnitTypeId(rulerType) {
    const Data = AOW.Data;
    if (rulerType && Data.has('units', 'hero_' + rulerType)) return 'hero_' + rulerType;
    if (Data.has('units', 'hero')) return 'hero';
    const h = Data.list('units').find(u => u.role === 'hero');
    return h ? h.id : 'hero';
  }

  // ==================================================================== WORLD TICK (once per game turn)
  /** Neutral world: free cities, infestation raids, guard regeneration, diplomacy, eliminations. */
  Turn.worldTick = function (game) {
    if (game.worldTickTurn === game.turn) return false;
    game.worldTickTurn = game.turn;
    const Rules = R();
    // free cities
    for (const c of game.cities) if (c.freeCity && c.owner < 0) { try { Rules.freeCityTick(game, c); } catch (e) { /* ignore */ } }
    // wonder / infestation guards heal and are restocked if something wiped them without clearing
    try { Rules.regenGuards(game); } catch (e) { /* ignore */ }
    // infestation raids + restocking of guard stacks that were wiped without clearing the site
    if (game.turn > 1 && game.turn % Rules.C.RAID_INTERVAL === 0) {
      try { spawnRaids(game); } catch (e) { AOW.warn('raids', e); }
      try { Rules.spawnGuards(game); } catch (e) { AOW.warn('spawnGuards', e); }
    }
    try { moveRaids(game); } catch (e) { AOW.warn('raid movement', e); }
    // diplomacy
    const tick = fn('Diplomacy', 'tick');
    if (tick) { try { tick(game); } catch (e) { AOW.warn('Diplomacy.tick', e); } }
    try { Rules.checkElimination(game); } catch (e) { /* ignore */ }
    return true;
  };

  /** Periodically send a marauder stack out of every live infestation toward the nearest player city. */
  function spawnRaids(game) {
    const Rules = R();
    const C = Rules.C;
    let live = game.armies.filter(a => a.owner < 0 && a.raid).length;
    for (const st of game.structures) {
      if (!st || st.kind !== 'infestation' || st.cleared) continue;
      if (live >= C.RAID_MAX) break;
      // only raid when a player city is within reach
      let target = null, bestD = Infinity;
      for (const c of game.cities) {
        if (c.owner < 0) continue;
        const d = Hex().distIdx(st.hex, c.hex, game.W);
        if (d < bestD && d <= C.RAID_RANGE) { bestD = d; target = c; }
      }
      if (!target) continue;
      const spec = Rules.guardSpecFor(game, st);
      if (!spec) continue;
      spec.count = C.RAID_SIZE;
      const ids = Rules.pickGuardUnits(game, spec);
      if (!ids.length) continue;
      let hex = st.hex;
      for (const n of S().neighbors(game, st.hex)) if (!S().isWater(game, n) && !S().armiesAt(game, n).length && game.structure[n] < 0) { hex = n; break; }
      const army = S().createArmy(game, -1, hex, []);
      for (const id of ids) { const u = S().createUnit(game, id, -1, army.id); Rules.syncUnit(game, u, true); }
      army.mp = Rules.armyMaxMp(game, army);
      army.raid = { home: st.id, born: game.turn, targetCity: target.id };
      live++;
      if (target.owner >= 0) {
        Rules.notify(game, target.owner, 'warn', L(`${target.name} 방면으로 약탈대가 출몰했습니다!`, `A raiding party is marching on ${target.name}!`), 'skull', { hexIdx: army.hex, cityId: target.id });
      }
    }
  }
  /** Raid stacks walk toward their target city and disband when their lifetime runs out. */
  function moveRaids(game) {
    const Rules = R();
    const C = Rules.C;
    for (const army of game.armies.slice()) {
      if (army.owner >= 0 || !army.raid) continue;
      if (game.turn - army.raid.born > C.RAID_LIFETIME) { S().removeArmy(game, army.id); continue; }
      army.mp = Rules.armyMaxMp(game, army);
      const target = S().city(game, army.raid.targetCity);
      if (!target || target.owner < 0) { army.raid.targetCity = -1; continue; }
      const path = Rules.pathfind(game, army, target.hex, { allowGoalBlocked: true });
      if (!path || !path.path.length) continue;
      const res = Rules.moveArmy(game, army, path.path.slice(0, 4));
      if (res.encounter && res.encounter.armyIds && res.encounter.armyIds.length === 0 && res.encounter.cityId !== undefined && res.encounter.cityId !== null) {
        // undefended city: raiders pillage instead of capturing
        const city = S().city(game, res.encounter.cityId);
        if (city && city.owner >= 0) {
          const p = S().player(game, city.owner);
          if (p) {
            const loot = Math.min(p.resources.gold, C.PILLAGE_GOLD);
            p.resources.gold -= loot;
            Rules.addStabilityMod(game, city, 'pillaged', C.PILLAGE_STABILITY, 5, L('약탈당함', 'Pillaged'));
            Rules.notify(game, city.owner, 'bad', L(`${J(city.name, '이/가')} 약탈당했습니다 (−${loot} 금)`, `${city.name} was pillaged (−${loot} gold)`), 'skull', { cityId: city.id });
          }
        }
      } else if (res.encounter && res.encounter.armyIds && res.encounter.armyIds.length) {
        const defender = S().army(game, res.encounter.armyIds[0]);
        if (defender && defender.owner >= 0) {
          Turn.startBattle(game, {
            attackerArmyIds: [army.id], defenderArmyIds: res.encounter.armyIds, hexIdx: res.encounter.idx,
            siege: !!res.encounter.siege, cityId: res.encounter.cityId || null, structureId: null,
            attackerOwner: -1, defenderOwner: defender.owner,
          });
        }
      }
    }
  }

  // ==================================================================== BATTLES
  function involvesHuman(game, spec) {
    const hp = Turn.humanPid(game);
    if (hp < 0) return false;
    if (spec.attackerOwner === hp || spec.defenderOwner === hp) return true;
    for (const id of (spec.attackerArmyIds || []).concat(spec.defenderArmyIds || [])) {
      const a = S().army(game, id);
      if (a && a.owner === hp) return true;
    }
    const city = spec.cityId !== undefined && spec.cityId !== null ? S().city(game, spec.cityId) : null;
    return !!(city && city.owner === hp);
  }
  function ownersOf(game, spec) {
    const own = ids => { for (const id of ids || []) { const a = S().army(game, id); if (a) return a.owner; } return -1; };
    const att = spec.attackerOwner !== undefined ? spec.attackerOwner : own(spec.attackerArmyIds);
    let def = spec.defenderOwner !== undefined ? spec.defenderOwner : own(spec.defenderArmyIds);
    if (def < 0 && spec.cityId !== undefined && spec.cityId !== null) { const c = S().city(game, spec.cityId); if (c) def = c.owner; }
    return { att, def };
  }

  /**
   * Resolve a battle now, or queue it for the UI when the human wants to fight it manually.
   * `spec` is the Rules.attackTarget shape: {attackerArmyIds, defenderArmyIds, hexIdx, siege, cityId, structureId}.
   */
  Turn.startBattle = function (game, spec, opts) {
    const Rules = R();
    opts = opts || {};
    if (spec && spec.battleSetup) spec = spec.battleSetup;
    if (!spec || spec.ok === false) return { ok: false, reason: spec && spec.reason };
    game.pendingBattles = game.pendingBattles || [];
    const owners = ownersOf(game, spec);
    spec = Object.assign({}, spec, { attackerOwner: owners.att, defenderOwner: owners.def });
    const manual = !!(game.settings && game.settings.manualDefense) && involvesHuman(game, spec) && !opts.force;
    const create = fn('Combat', 'create');
    if (manual) {
      let battle = null;
      if (create) { try { battle = create(game, spec); } catch (e) { AOW.warn('Combat.create', e); } }
      if (!battle) battle = Object.assign({ id: S().newId(game, 'battle'), pending: true }, spec);
      battle.attackerOwner = owners.att; battle.defenderOwner = owners.def;
      battle.spec = spec;
      game.pendingBattles.push(battle);
      if (game.pendingBattles.length === 1 && Events()) Events().emit('battle:start', { battle });
      return { queued: true, battle };
    }
    let battle = null, result = null;
    const auto = fn('Combat', 'autoResolve');
    if (create && auto) {
      try {
        battle = create(game, spec);
        result = auto(game, battle);
      } catch (e) { AOW.warn('Combat.autoResolve', e); battle = null; result = null; }
    }
    if (!result) {
      battle = Object.assign({ id: S().newId(game, 'battle'), quick: true }, spec);
      result = Rules.quickResolve(game, spec);
    }
    battle.attackerOwner = owners.att; battle.defenderOwner = owners.def;
    battle.attackerArmyIds = spec.attackerArmyIds; battle.defenderArmyIds = spec.defenderArmyIds;
    if (Events()) Events().emit('battle:end', { battle, result });
    Turn.finishBattle(game, spec, result);
    return { resolved: true, battle, result };
  };
  /** The UI hands back a battle it fought manually. */
  Turn.resolvePending = function (game, battle, result) {
    game.pendingBattles = (game.pendingBattles || []).filter(b => b !== battle && b.id !== (battle && battle.id));
    // accept both shapes: {…spec, spec} queued by Turn.startBattle and {battleSetup:{…}} queued by AOW.AI
    const spec = (battle && (battle.spec || battle.battleSetup)) || battle || {};
    if (Events()) Events().emit('battle:end', { battle, result });
    Turn.finishBattle(game, spec, result);
    if (game.pendingBattles.length && Events()) Events().emit('battle:start', { battle: game.pendingBattles[0] });
    return result;
  };
  /** Post-battle bookkeeping: clear structures, capture cities, notify both sides. */
  Turn.finishBattle = function (game, spec, result) {
    const Rules = R();
    if (!spec || !result) return null;
    const owners = ownersOf(game, spec);
    const attackerWon = result.winner === 0;
    const winner = attackerWon ? owners.att : owners.def;
    const loser = attackerWon ? owners.def : owners.att;
    game.battles = game.battles || [];
    game.battles.push({ turn: game.turn, hexIdx: spec.hexIdx, winner, loser, cityId: spec.cityId || null, structureId: spec.structureId === undefined ? null : spec.structureId });
    if (game.battles.length > 200) game.battles.splice(0, game.battles.length - 200);
    // the losing side's stacks that were standing on the contested hex are destroyed or routed away
    const losingIds = attackerWon ? (spec.defenderArmyIds || []) : (spec.attackerArmyIds || []);
    if (result.keepLosers !== true) {
      for (const id of losingIds) {
        const a = S().army(game, id);
        if (a && a.units.length && a.hex === spec.hexIdx) S().removeArmy(game, a.id);
      }
    }
    if (attackerWon) {
      if (spec.structureId !== undefined && spec.structureId !== null) {
        try { Rules.clearStructure(game, spec.structureId, owners.att); } catch (e) { AOW.warn('clearStructure', e); }
      }
      if (spec.cityId !== undefined && spec.cityId !== null) {
        const city = S().city(game, spec.cityId);
        const defenders = city ? S().armiesAt(game, city.hex).filter(a => a.units.length && a.owner !== owners.att) : [];
        if (city && !defenders.length && owners.att >= 0) {
          try { Rules.captureCity(game, city, owners.att, spec.mode || 'annex'); } catch (e) { AOW.warn('captureCity', e); }
        }
      }
      // the winning stack takes the hex when nothing hostile is left
      const first = S().army(game, (spec.attackerArmyIds || [])[0]);
      if (first && first.units.length && spec.hexIdx !== undefined && Hex().distIdx(first.hex, spec.hexIdx, game.W) === 1) {
        const enc = Rules.encounterAt(game, first, spec.hexIdx);
        if (!enc) Rules.moveArmy(game, first, [spec.hexIdx]);
      }
    }
    if (winner >= 0) Rules.notify(game, winner, 'good', L('전투에서 승리했습니다.', 'Battle won.'), 'sword', { hexIdx: spec.hexIdx });
    if (loser >= 0) Rules.notify(game, loser, 'bad', L('전투에서 패배했습니다.', 'Battle lost.'), 'skull', { hexIdx: spec.hexIdx });
    for (const pid of [owners.att, owners.def]) if (pid >= 0) { const p = S().player(game, pid); if (p) p.stats.units = S().allUnitsOfPlayer(game, pid).length; }
    Rules.checkElimination(game);
    return result;
  };

  // ==================================================================== HUD HELPERS
  /** Next army of `pid` that still has movement points. */
  Turn.nextUnit = function (game, pid, afterArmyId) {
    const list = game.armies.filter(a => a.owner === pid && a.units.length && a.mp > 0);
    if (!list.length) return null;
    let i = 0;
    if (afterArmyId !== undefined && afterArmyId !== null) {
      const at = list.findIndex(a => a.id === afterArmyId);
      if (at >= 0) i = (at + 1) % list.length;
    }
    const a = list[i];
    return { armyId: a.id, hex: a.hex };
  };
  /** Is the player done? → {ok, idle:[armyId…]} */
  Turn.readyToEnd = function (game, pid) {
    const idle = game.armies.filter(a => a.owner === pid && a.units.length && a.mp > 0).map(a => a.id);
    const pending = (game.pendingBattles || []).length;
    return { ok: idle.length === 0 && pending === 0, idle, pendingBattles: pending };
  };

  AOW.Turn = Turn;
})(window.AOW = window.AOW || {});
