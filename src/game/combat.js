// src/game/combat.js — AOW.Combat: tactical battle engine, auto-resolve and tactical AI (SPEC §5)
//
// Public API (SPEC §5 + the additive helpers the combat renderer/UI call, documented here per Ground Rule §0):
//   Combat.create(game, {attackerArmyIds, defenderArmyIds, hexIdx, siege})  → battle (20×12 odd-r field)
//   Combat.actions(battle, unitId)   → [{type:'move'|'attack'|'ability'|'defend'|'wait'|'cast'|'retreat', …}]
//   Combat.perform(battle, action)   → [events]   (see EVENTS below; consumed by CombatRender.playEvents)
//   Combat.endUnitTurn(battle, unitId) / Combat.endSideTurn(battle) / Combat.currentSide(battle)
//   Combat.aiStep(battle) → [events] | null      one unit action for the side to move (null when the side is done)
//   Combat.aiTakeTurn(battle) → [events]         alias: runs aiStep until the side turn ends
//   Combat.autoResolve(game, battle) → result    simulate to the end (≤ 30 rounds; stalemate → defender) and finish
//   Combat.finish(game, battle) → result         apply hp/deaths/xp/capture back into `game`, emits 'battle:end'
//   Combat.threat(game, armyIds) → number        army strength estimate (AI + UI)
//   Combat.summary(battle) → {round, side, winner, sides:[{alive, hp, …}]}
//   Combat.demo({siege}) → battle                synthetic battle with inline unit types (no Data dependency)
// Additive helpers:
//   Combat.reachable(battle, unitId) → Map(hexKey → {cost, apCost, ap, path})
//   Combat.path(battle, unitId, hex) → {path, cost, apCost} | null
//   Combat.lineOfSight(battle, from, to) → {clear, blocked, obscured}
//   Combat.previewAttack(battle, attackerId, targetId, attackId) → {min, max, avg, hit, crit, kill, flank, rear, …}
//   Combat.unitAt(battle, col, row) / Combat.unit(battle, id) / Combat.hexKey(col,row) / Combat.hexAt(battle,col,row)
//   Combat.baseStats(game, unit) → stat block from unit type + rank + hero skills (fallback when Rules.unitStats is absent)
//   Combat.unitStats(game, unit)  → Rules.unitStats when available, else baseStats
//   Combat.canRetreat(battle, side) / Combat.retreat(battle, side)
//   Combat.nextActor(battle) / Combat.checkWinner(battle, out) / Combat.applyStatus(battle, unit, id, turns, chance, out)
//   Combat.wallAt(battle, col, row) / Combat.C (all balance numbers) / Combat.CHANNELS / Combat.DEMO_TYPES
//
// Damage model (all numbers in Combat.C):
//   dmg = (attack.damage + flat bonuses) × (1 + dmg%/100) × 0.9^(effective def|res) × crit 1.5 / graze 0.5
//   • Defense is used for the `physical` channel, Resistance for every other channel, plus prot_<channel>.
//   • armor_piercing −2, ignore_half_def halves it, flanking −2, a rear attack ignores it entirely.
//   • dmg% sums rank, status dmgPct, morale band, ferocious/cull_the_weak, charge +30%, pike brace vs cavalry +40%.
//   • The target then applies damageTakenPct / damageTakenPct_<channel> / weak(channel) (+%) ; immune(channel) → 0.
//   • Accuracy = attack.accuracy + attacker accuracy − target evasion + flank 10 / rear 20 − defending 10
//     − 4 per hex beyond 2 (ranged) − 20 per obscuring hex (max 40), clamped to 5…98.
//
// EVENTS emitted by perform/aiStep (shapes the renderer reads — do not rename fields):
//   {type:'move', unitId, from:{col,row}, path:[{col,row}…], charge?}
//   {type:'attack'|'retaliate', attacker, target, kind:'melee'|'ranged', channel, attackId,
//    hits:[{dmg, crit, graze, miss, blocked, status, channel}], killed:[unitId…], flank?, rear?}
//   {type:'ability'|'spell', caster, abilityId|spellId, name, affinity, channel, area, hex:{col,row},
//    hits:[{unitId, dmg, heal, status, resisted, crit, killed}], killed:[…]}
//   {type:'status', unitId, status, applied|resisted|expired}   {type:'heal', unitId, amount}
//   {type:'morale', unitId, state}   {type:'death', unitId}   {type:'defend', unitId}
//   {type:'wall', col, row, dmg, hp, maxHp, destroyed}   {type:'summon', unitId, hex}
//   {type:'teleport', unitId, to}   {type:'push', unitId, path}
//   {type:'round', round}   {type:'end', winner}   {type:'flee', unitId, path}   {type:'log', text}
//
// Battle state (serializable; the live RNG lives on a non-enumerable field):
//   battle = { id, seed, W:20, H:12, terrain, hexes:[{terrain,feature,obstacle,height,cost}], units:[…],
//              sides:[{side, owner, armyIds, cp, cpMax, spells, castThisRound, retreated}], sidePlayers:[pid,pid],
//              attacker, defender, side, round, log:[], winner, cp:{0,1}, spellsCast:{}, walls, gate, siege,
//              deployZones, retreatAllowedFromRound:3, activeUnitId, viewerSide, hexIdx, result }
(function (AOW) {
  'use strict';
  const Combat = {};
  const Hex = () => AOW.Hex;
  const Data = () => AOW.Data;
  const S = () => AOW.State;
  const R = () => AOW.Rules;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  Combat.CHANNELS = ['physical', 'fire', 'frost', 'lightning', 'blight', 'spirit'];

  // ------------------------------------------------------------------ balance constants
  const C = {
    W: 20, H: 12,
    AP: 3,
    CP_START: 10, CP_PER_ROUND: 5, CP_MAX: 30,
    OBSTACLE_MIN: 0.08, OBSTACLE_MAX: 0.14,
    DEPLOY_COLS: 4,
    WALL_HP: 200, GATE_HP: 150,
    RETREAT_ROUND: 3,
    MAX_ROUNDS: 30,
    DEF_STEP: 0.9,                 // damage ×0.9 per point of defense/resistance
    ARMOR_PIERCE: 2,               // armor_piercing lowers the effective def by this much
    CRIT_CHANCE: 10, CRIT_MULT: 1.5,
    GRAZE_CHANCE: 5, GRAZE_MULT: 0.5,
    FLANK_DEF: 2,                  // flank: −2 def; rear: def ignored
    CHARGE_DIST: 3, CHARGE_PCT: 30,
    PIKE_VS_CAVALRY_PCT: 40,
    DEFEND_BONUS: 3,           // defense mode: +3 def/res (the `fortified` status already carries +2 of it)
    BASE_ACCURACY: 85,
    RANGE_ACC_PER_HEX: 4,          // ranged accuracy falls off beyond 2 hexes
    OBSCURED_ACC: 20,              // per obscuring hex on the line (trees, units), capped
    OBSCURED_MAX: 40,
    MIN_HIT: 5, MAX_HIT: 98,
    MORALE_SHAKEN: -10, MORALE_WAVERING: -30, MORALE_BROKEN: -50,
    MORALE_ALLY_DEATH: -8, MORALE_ENEMY_DEATH: 4, MORALE_CRIT: -4, MORALE_LOW_HP: -12,
    MORALE_KILL: 6, MORALE_ROUND_RECOVER: 3,
    SHAKEN_ACC: -10, WAVERING_ACC: -20, WAVERING_DMG: -15, BROKEN_DMG: -30,
    HEX_COST: { base: 1, rough: 1.5, hard: 2 },
    MP_PER_HEX: 5,                 // world mp → battle hexes per turn (mp / 5)
    MP_MIN: 3, MP_MAX: 12,
    STATUS_RES_STEP: 10,           // each point of status resistance cuts the apply chance by 10
    XP_KILL: 10, XP_WIN: 8,
    AI_KILL_BONUS: 900, AI_DMG_W: 3.2, AI_RISK_W: 1.7, AI_FOCUS_W: 40,
  };
  Combat.C = C;

  // ------------------------------------------------------------------ tiny helpers
  const hexKey = (col, row) => col + ',' + row;
  Combat.hexKey = hexKey;
  const has = (kind, id) => { try { return !!(id && Data() && Data().has(kind, id)); } catch (e) { return false; } };
  const get = (kind, id) => (has(kind, id) ? Data().get(kind, id) : null);
  const L = obj => (AOW.L ? AOW.L(obj) : (obj && (obj.en || obj.ko)) || String(obj || ''));
  const isDead = u => !!(u.dead || u.hp <= 0 || u.removed);
  const inField = (battle, col, row) => col >= 0 && row >= 0 && col < battle.W && row < battle.H;
  const idxOf = (battle, col, row) => row * battle.W + col;
  function toHex(battle, v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return { col: v % battle.W, row: Math.floor(v / battle.W) };
    if (typeof v === 'object') {
      if (v.col !== undefined && v.row !== undefined) return { col: v.col, row: v.row };
      if (v.hex !== undefined) return toHex(battle, v.hex);
      if (v.idx !== undefined) return toHex(battle, v.idx);
    }
    return null;
  }
  Combat.unit = function (battle, id) {
    if (id === null || id === undefined) return null;
    if (typeof id === 'object') id = id.id;
    const us = battle && battle.units;
    if (!us) return null;
    for (let i = 0; i < us.length; i++) if (us[i].id === id) return us[i];
    return null;
  };
  Combat.unitAt = function (battle, col, row) {
    if (!battle || !battle.units) return null;
    for (const u of battle.units) if (!isDead(u) && u.col === col && u.row === row) return u;
    return null;
  };
  Combat.hexAt = function (battle, col, row) { return inField(battle, col, row) ? battle.hexes[idxOf(battle, col, row)] : null; };
  const unitAt = Combat.unitAt;
  const alive = battle => battle.units.filter(u => !isDead(u) && !u.fled);
  const aliveOf = (battle, side) => battle.units.filter(u => !isDead(u) && !u.fled && u.side === side);
  function rngOf(battle) {
    if (!battle._rng) {
      Object.defineProperty(battle, '_rng', { value: new AOW.RNG(battle.seed || 'battle'), enumerable: false, writable: true, configurable: true });
      if (battle.rngState !== undefined && battle.rngState !== null) battle._rng.setState(battle.rngState);
    }
    return battle._rng;
  }
  function gameOf(battle) { return battle && battle._game ? battle._game : (AOW.game || null); }
  function setGame(battle, game) {
    Object.defineProperty(battle, '_game', { value: game || null, enumerable: false, writable: true, configurable: true });
  }
  function log(battle, text, data) {
    battle.log.push(Object.assign({ round: battle.round, text }, data || {}));
    if (battle.log.length > 600) battle.log.splice(0, battle.log.length - 600);
  }

  // ------------------------------------------------------------------ unit type / stat resolution
  const FALLBACK_ATTACK = { id: 'strike', name: { ko: '타격', en: 'Strike' }, type: 'melee', damage: 10, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] };

  function typeOf(game, unit) {
    if (!unit) return null;
    if (unit.custom && typeof unit.custom === 'object') return unit.custom;
    if (S() && S().unitType) { try { return S().unitType(unit); } catch (e) { /* fall through */ } }
    if (has('units', unit.typeId)) return get('units', unit.typeId);
    return (S() && S().FALLBACK_UNIT) || null;
  }

  /** Rank bonuses (Rules.C.RANK when present): +10% hp per rank, +1 def/res at rank 2 and 4, +10% damage at rank 4. */
  function rankBonus(rank) {
    const RC = (R() && R().C && R().C.RANK) || { hpPct: 10, defResAt: [2, 4], dmgPctAt: 4, dmgPct: 10 };
    rank = clamp(rank || 0, 0, 4);
    let def = 0;
    for (const at of RC.defResAt || []) if (rank >= at) def++;
    return { hpPct: (RC.hpPct || 10) * rank, def, res: def, dmgPct: rank >= (RC.dmgPctAt || 4) ? (RC.dmgPct || 10) : 0 };
  }

  /**
   * Fallback stat block (type base + rank + unit.custom). Used when AOW.Rules.unitStats is not available.
   * Shape matches Rules.unitStats: {hp, maxHp, def, res, attacks, mp, morale, abilities, passives, statusRes, …}
   */
  Combat.baseStats = function (game, unit) {
    const type = typeOf(game, unit) || {};
    const rb = rankBonus(unit && unit.rank);
    let maxHp = Math.max(1, Math.round((type.hp || 50) * (1 + rb.hpPct / 100)));
    const attacks = (type.attacks && type.attacks.length ? type.attacks : [FALLBACK_ATTACK]).map(a => Object.assign({}, FALLBACK_ATTACK, a, {
      effects: (a.effects || []).slice(), props: (a.props || []).slice(),
    }));
    const abilities = (type.abilities || []).slice();
    const passives = (type.passives || []).slice();
    let bonus = { hp: 0, def: 0, res: 0, dmg: 0, accuracy: 0, critChance: 0, mp: 0, morale: 0 };
    // hero skills grant abilities and flat bonuses (Rules.unitStats supersedes this when it exists)
    if (game && unit && unit.heroId !== undefined && unit.heroId !== null && unit.heroId >= 0 && S() && S().hero) {
      const hero = S().hero(game, unit.heroId);
      if (hero) {
        const RC = (R() && R().C) || {};
        bonus.hp += ((hero.level || 1) - 1) * (RC.HERO_HP || 8);
        for (const sid of hero.skills || []) {
          const sk = get('heroSkills', sid);
          if (!sk) continue;
          if (sk.ability) { if (abilities.indexOf(sk.ability) < 0 && passives.indexOf(sk.ability) < 0) { const ab = get('abilities', sk.ability); if (ab && ab.kind === 'passive') passives.push(sk.ability); else abilities.push(sk.ability); } }
          for (const k of Object.keys(sk.effects || {})) if (bonus[k] !== undefined && typeof sk.effects[k] === 'number') bonus[k] += sk.effects[k];
        }
      }
    }
    maxHp = Math.max(1, maxHp + bonus.hp);
    return {
      typeId: type.id || (unit && unit.typeId) || 'unit',
      type,
      name: type.name,
      tier: type.tier || 1,
      role: type.role || 'fighter',
      tags: (type.tags || []).slice(),
      move: type.move || 'walk',
      maxHp,
      hp: unit && unit.hp !== undefined ? unit.hp : maxHp,
      def: (type.def || 0) + rb.def + bonus.def,
      res: (type.res || 0) + rb.res + bonus.res,
      dmg: bonus.dmg,
      dmgPct: rb.dmgPct,
      accuracy: bonus.accuracy,
      critChance: bonus.critChance,
      mp: (type.mp === undefined ? 32 : type.mp) + bonus.mp * C.MP_PER_HEX,
      morale: (type.morale || 0) + bonus.morale,
      attacks,
      abilities,
      passives,
      statusRes: Object.assign({}, type.statusRes || {}),
      look: type.look || null,
    };
  };

  /** Rules.unitStats when the (parallel) rules module provides it, else the local fallback. Always normalized. */
  Combat.unitStats = function (game, unit) {
    let st = null;
    if (game && R() && typeof R().unitStats === 'function') {
      try { st = R().unitStats(game, unit); } catch (e) { st = null; }
    }
    if (!st) return Combat.baseStats(game, unit);
    const base = Combat.baseStats(game, unit);
    const out = Object.assign({}, base, st);
    out.type = st.type || base.type;
    out.attacks = (st.attacks && st.attacks.length ? st.attacks : base.attacks).map(a => Object.assign({}, FALLBACK_ATTACK, a, {
      effects: (a.effects || []).slice(), props: (a.props || []).slice(),
    }));
    out.abilities = st.abilities || base.abilities;
    out.passives = st.passives || base.passives;
    out.statusRes = Object.assign({}, base.statusRes, st.statusRes || {});
    out.tags = st.tags || base.tags;
    out.maxHp = st.maxHp || st.hp || base.maxHp;
    if (!(out.maxHp > 0)) out.maxHp = base.maxHp;
    out.def = st.def === undefined ? base.def : st.def;
    out.res = st.res === undefined ? base.res : st.res;
    out.mp = st.mp === undefined ? base.mp : st.mp;
    out.morale = st.morale === undefined ? base.morale : st.morale;
    out.role = st.role || base.role;
    out.tier = st.tier || base.tier;
    out.move = st.move || base.move;
    return out;
  };

  /** world mp → hexes the unit may cross with a full turn of AP. */
  function battleMp(stats) {
    const raw = stats.mp === undefined ? 32 : stats.mp;
    if (!(raw > 0)) return 0;
    return clamp(Math.round(raw / C.MP_PER_HEX), C.MP_MIN, C.MP_MAX);
  }

  // ------------------------------------------------------------------ passives
  /** Build {rule: [effect,…]} from a unit's passive + ability ids (unknown ids are ignored gracefully). */
  function passiveRules(stats) {
    const out = {};
    const add = (rule, eff) => { if (!rule) return; (out[rule] = out[rule] || []).push(eff || {}); };
    const scan = ids => {
      for (const id of ids || []) {
        const ab = get('abilities', id);
        if (!ab) { add(id, {}); continue; }          // unknown id: expose it under its own name
        const e = ab.effect || {};
        if (ab.kind === 'passive' || e.type === 'passive') add(e.rule || ab.id, e);
        if (ab.id) out['_has_' + ab.id] = true;
      }
    };
    scan(stats.passives);
    for (const id of stats.abilities || []) { const ab = get('abilities', id); if (ab && ab.kind === 'passive') scan([id]); }
    return out;
  }
  function passive(u, rule) { return u.passiveRules && u.passiveRules[rule] ? u.passiveRules[rule] : null; }
  function hasPassive(u, rule) { return !!(u.passiveRules && u.passiveRules[rule]); }
  function passiveValue(u, rule, key, dflt) {
    const list = passive(u, rule);
    if (!list) return dflt;
    let v = dflt;
    for (const e of list) if (e && e[key] !== undefined) v = e[key];
    return v;
  }
  function hasTag(u, tag) { return (u.stats.tags || []).indexOf(tag) >= 0; }
  function isFlyer(u) { return hasPassive(u, 'flying') || hasTag(u, 'flying') || u.stats.move === 'fly'; }
  function isFloater(u) { return hasPassive(u, 'floating') || hasTag(u, 'floating') || u.stats.move === 'float'; }
  function immuneChannel(u, channel) {
    const list = passive(u, 'immune');
    if (list) for (const e of list) if (e.channel === channel) return true;
    return false;
  }
  function weakChannel(u, channel) {
    const list = passive(u, 'weak');
    let pct = 0;
    if (list) for (const e of list) if (e.channel === channel) pct += e.pct || 50;
    return pct;
  }

  // ------------------------------------------------------------------ status maths
  function statusDef(id) { return get('statuses', id); }
  function effectsOf(u) {
    if (u._eff && u._effToken === u._statusToken) return u._eff;
    const e = {
      def: 0, res: 0, dmgPct: 0, damageTakenPct: 0, accuracy: 0, evasion: 0, critChance: 0, fumbleChance: 0, fumbleDamage: 0,
      morale: 0, moralePerTurn: 0, mp: 0, retaliation: 0, statusRes: 0, healPct: 0, healPerTurn: 0, bonusDmg: 0,
      prot: {}, dmgTakenCh: {}, statusResCh: {}, channelDmg: {}, attackStatus: null, attackStatusChance: 0,
      immuneStatus: [], flags: {}, dots: [], dmgPctVsStatus: null,
    };
    for (const st of u.statuses || []) {
      const d = statusDef(st.id);
      if (!d) continue;
      const stacks = Math.max(1, st.stacks || 1);
      const ef = d.effects || {};
      for (const k of Object.keys(ef)) {
        const v = ef[k];
        if (v === true) { e.flags[k] = true; continue; }
        if (k === 'immuneStatus' && Array.isArray(v)) { for (const s of v) e.immuneStatus.push(s); continue; }
        if (k === 'tickStatus' && Array.isArray(v)) { e.tickStatus = (e.tickStatus || []).concat(v); continue; }
        if (k === 'dmgPctVsStatus' && v && typeof v === 'object') { e.dmgPctVsStatus = Object.assign(e.dmgPctVsStatus || {}, v); continue; }
        if (k === 'dotChannel') continue;
        if (k === 'dotAmount') { e.dots.push({ channel: ef.dotChannel || 'physical', amount: v * stacks, from: st.id }); continue; }
        if (k === 'attackStatus') { e.attackStatus = v; continue; }
        if (k === 'attackStatusChance') { e.attackStatusChance = Math.max(e.attackStatusChance, v); continue; }
        if (typeof v !== 'number') continue;
        if (k.indexOf('prot_') === 0) { const ch = k.slice(5); e.prot[ch] = (e.prot[ch] || 0) + v * stacks; continue; }
        if (k.indexOf('damageTakenPct_') === 0) { const ch = k.slice(15); e.dmgTakenCh[ch] = (e.dmgTakenCh[ch] || 0) + v * stacks; continue; }
        if (k.indexOf('statusRes_') === 0) { const ch = k.slice(10); e.statusResCh[ch] = (e.statusResCh[ch] || 0) + v * stacks; continue; }
        if (k.indexOf('channelDmg_') === 0) { const ch = k.slice(11); e.channelDmg[ch] = (e.channelDmg[ch] || 0) + v * stacks; continue; }
        if (e[k] !== undefined && typeof e[k] === 'number') e[k] += v * stacks;
      }
    }
    // unit-type status resistances (statusRes:{fire:+2,…})
    const sr = u.stats.statusRes || {};
    for (const k of Object.keys(sr)) {
      if (k === 'all' || k === 'generic') e.statusRes += sr[k] || 0;
      else e.statusResCh[k] = (e.statusResCh[k] || 0) + (sr[k] || 0);
    }
    // passives folded into the same shape
    const hard = passive(u, 'hardened'); if (hard) for (const h of hard) e.def += h.value || 1;
    const stur = passive(u, 'sturdy'); if (stur) for (const h of stur) e.def += h.value || 1;
    const elu = passive(u, 'elusive'); if (elu) for (const h of elu) e.evasion += h.value || 20;
    const large = passive(u, 'large_target'); if (large) e.evasion -= 15;
    const deadeye = passive(u, 'deadeye'); if (deadeye) for (const h of deadeye) e.accuracy += h.value || 15;
    const rexp = passive(u, 'ranged_expert'); if (rexp) e.accuracy += 10;
    const retal = passive(u, 'retaliation'); if (retal) for (const h of retal) e.retaliation += h.value || 1;
    if (hasPassive(u, 'fearless')) e.flags.immuneMorale = true;
    if (hasPassive(u, 'unbreakable')) e.flags.immuneMorale = true;
    if (hasPassive(u, 'ethereal')) e.evasion += 20;
    if (u.defending) {
      // total defense-mode bonus is C.DEFEND_BONUS; the `fortified` status (when the data set has it) already gave +2
      const add = findStatus(u, 'fortified') ? Math.max(0, C.DEFEND_BONUS - 2) : C.DEFEND_BONUS;
      e.def += add; e.res += add; e.flags.immuneFlank = true;
    }
    // applied stat effects from Rules (dmg/accuracy already in stats)
    e.def += u.stats.defBonus || 0; e.res += u.stats.resBonus || 0;
    u._eff = e; u._effToken = u._statusToken;
    return e;
  }
  function touchStatuses(u) { u._statusToken = (u._statusToken || 0) + 1; u._eff = null; }

  function statusRes(u, e, channel) {
    let r = e.statusRes || 0;
    if (channel && e.statusResCh[channel]) r += e.statusResCh[channel];
    return r;
  }
  function isRooted(u) { const e = effectsOf(u); return !!(e.flags.rooted || e.flags.stunned); }
  function isSilenced(u) { return !!effectsOf(u).flags.silenced; }

  /** Effective def/res against a channel (defense for physical, resistance otherwise) plus prot_<channel>. */
  function defenseAgainst(u, channel) {
    const e = effectsOf(u);
    const base = channel === 'physical' ? (u.stats.def || 0) + e.def : (u.stats.res || 0) + e.res;
    return base + (e.prot[channel] || 0);
  }
  /** Cover from the hex the unit stands on (ruins, and terrain the unit is at home in). */
  function terrainDefense(battle, u) {
    if (!battle || !battle.hexes || u.col === undefined) return 0;
    const h = Combat.hexAt(battle, u.col, u.row);
    if (!h) return 0;
    let d = 0;
    const forest = h.feature === 'forest' || h.feature === 'dense_forest' || h.terrain === 'forest';
    const high = h.terrain === 'hills' || h.terrain === 'mountain' || h.feature === 'hills' || h.feature === 'mountain';
    if (h.feature === 'ruins') d += 1;
    if (forest && (hasPassive(u, 'forest_stalker') || passiveValue(u, 'terrain_stalker', 'terrain', null) === 'forest')) d += 1;
    if (high && (hasPassive(u, 'mountaineer') || passiveValue(u, 'terrain_stalker', 'terrain', null) === 'mountain')) d += 1;
    return d;
  }

  // ------------------------------------------------------------------ field generation
  const ROUGH = { forest: 1, swamp: 1, snow: 1, desert: 1 };
  const HARD = { hills: 1, mountain: 1, volcanic: 1 };
  function hexCostFor(h) {
    if (!h) return Infinity;
    if (h.obstacle) return Infinity;
    if (HARD[h.terrain] || h.feature === 'hills' || h.feature === 'mountain') return C.HEX_COST.hard;
    if (ROUGH[h.terrain] || h.feature === 'forest' || h.feature === 'dense_forest') return C.HEX_COST.rough;
    return C.HEX_COST.base;
  }

  function makeField(battle, rng, info) {
    const W = battle.W, H = battle.H;
    const base = info.terrain || 'grass';
    const feat = info.feature && info.feature !== 'none' ? info.feature : null;
    const hexes = new Array(W * H);
    const neighbourTerrains = info.around && info.around.length ? info.around : [base];
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        let terrain = base, feature = 'none';
        const n = AOW.Noise ? AOW.Noise.fbm2(c * 0.21, r * 0.29, (battle.seedInt || 7) & 0xffff, 3) : (rng.next() - 0.5);
        if (n > 0.34 && neighbourTerrains.length) terrain = neighbourTerrains[Math.floor(Math.abs(n) * neighbourTerrains.length) % neighbourTerrains.length] || base;
        if (feat && rng.chance(0.35)) feature = feat;
        if (terrain === 'forest' && feature === 'none' && rng.chance(0.5)) feature = 'forest';
        hexes[r * W + c] = { terrain, feature, obstacle: null, height: 0.35 + n * 0.25, cost: 1 };
      }
    }
    battle.hexes = hexes;
    // obstacles: 8–14% of the field, never inside a deployment zone
    const dz = C.DEPLOY_COLS;
    const free = [];
    for (let r = 0; r < H; r++) for (let c = dz; c < W - dz; c++) free.push(r * W + c);
    rng.shuffle(free);
    const want = Math.round(W * H * (C.OBSTACLE_MIN + rng.next() * (C.OBSTACLE_MAX - C.OBSTACLE_MIN)));
    let placed = 0;
    for (const i of free) {
      if (placed >= want) break;
      const h = hexes[i];
      const c = i % W, r = Math.floor(i / W);
      // keep a walkable corridor: never fully block a row
      let rowBlocked = 0;
      for (let cc = 0; cc < W; cc++) if (hexes[r * W + cc].obstacle) rowBlocked++;
      if (rowBlocked > W * 0.45) continue;
      const roll = rng.next();
      h.obstacle = roll < 0.42 ? 'tree' : roll < 0.74 ? 'rock' : roll < 0.9 ? 'hills' : 'ruins';
      if (h.obstacle === 'tree') { h.feature = 'forest'; if (h.terrain === 'grass' && rng.chance(0.5)) h.terrain = 'forest'; }
      if (h.obstacle === 'rock' && rng.chance(0.4)) h.terrain = 'hills';
      if (h.obstacle === 'ruins') h.feature = 'ruins';
      placed++;
    }
    if (info.water) {
      // a small pond away from the deployment zones
      const cc = dz + 2 + rng.int(0, W - 2 * dz - 5), rr = 2 + rng.int(0, H - 5);
      for (const p of Hex().spiral(cc, rr, 1)) {
        if (!inField(battle, p.col, p.row)) continue;
        const h = hexes[p.row * W + p.col];
        h.terrain = 'lake'; h.obstacle = 'water'; h.feature = 'none';
      }
    }
    for (const h of hexes) h.cost = hexCostFor(h);
    return hexes;
  }

  function buildWalls(battle, rng) {
    const W = battle.W, H = battle.H;
    const col = W - 6;
    const gateRow = Math.floor(H / 2) + (rng.chance(0.5) ? 0 : -1);
    const bonus = battle.wallBonus || 0;
    battle.walls = [];
    for (let r = 1; r < H - 1; r++) {
      const gate = r === gateRow;
      const h = battle.hexes[r * W + col];
      h.obstacle = null; h.feature = 'none'; if (h.terrain === 'lake') h.terrain = 'grass';
      h.cost = hexCostFor(h);
      const hp = (gate ? C.GATE_HP : C.WALL_HP) + bonus;
      battle.walls.push({ col, row: r, hp, maxHp: hp, gate, vertical: true, destroyed: false });
    }
    battle.gate = battle.walls.find(w => w.gate) || null;
    battle.wallCol = col;
  }
  function wallAt(battle, col, row) {
    if (!battle.walls) return null;
    for (const w of battle.walls) if (w.col === col && w.row === row && w.hp > 0) return w;
    return null;
  }
  Combat.wallAt = wallAt;

  // ------------------------------------------------------------------ battle unit creation
  function makeBattleUnit(battle, game, gameUnit, side, id, typeOverride) {
    const stats = typeOverride ? typeOverride : Combat.unitStats(game, gameUnit);
    const type = stats.type || {};
    const hero = !!(gameUnit && gameUnit.heroId !== null && gameUnit.heroId !== undefined && gameUnit.heroId >= 0) || stats.role === 'hero' || (stats.tags || []).indexOf('hero') >= 0;
    const maxHp = Math.max(1, Math.round(stats.maxHp || stats.hp || 50));
    const hp = gameUnit && gameUnit.hp > 0 ? Math.min(maxHp, Math.round(gameUnit.hp * (gameUnit.maxHp ? maxHp / gameUnit.maxHp : 1))) : maxHp;
    const u = {
      id,
      gameUnitId: gameUnit ? gameUnit.id : null,
      owner: gameUnit && gameUnit.owner !== undefined ? gameUnit.owner : (battle.sidePlayers ? battle.sidePlayers[side] : -1),
      side,
      typeId: stats.typeId || (type && type.id) || 'unit',
      def: type && type.id ? type : (stats.type || null),
      name: (gameUnit && gameUnit.name) || L(stats.name || (type && type.name)) || String(stats.typeId || 'Unit'),
      col: 0, row: 0,
      facing: side === 0 ? 0 : 3,
      hp, maxHp,
      ap: C.AP, apMax: C.AP,
      mp: battleMp(stats),
      rank: (gameUnit && gameUnit.rank) || 0,
      hero,
      heroId: gameUnit ? (gameUnit.heroId === undefined ? null : gameUnit.heroId) : null,
      tier: stats.tier || 1,
      role: stats.role || 'fighter',
      statuses: [],
      cooldowns: {},
      hasRetaliation: true,
      retaliations: 1,
      hasActed: false,
      defending: false,
      moved: 0,
      morale: 0,
      moraleState: 'steady',
      moraleBand: 'steady',
      dead: false,
      fled: false,
      summoned: false,
      kills: 0,
      damageDealt: 0,
      stats,
    };
    u.passiveRules = passiveRules(stats);
    // carry over persistent statuses from the world unit
    for (const st of (gameUnit && gameUnit.statuses) || []) {
      if (st && st.id && statusDef(st.id)) u.statuses.push({ id: st.id, turns: st.turns || 3, stacks: st.stacks || 1 });
    }
    touchStatuses(u);
    const e = effectsOf(u);
    u.morale = (stats.morale || 0) + (e.morale || 0);
    u.mp = clamp(u.mp + (e.mp || 0) * 3, 0, C.MP_MAX + 6);
    u.retaliations = Math.max(0, 1 + (e.retaliation || 0));
    return u;
  }

  // ------------------------------------------------------------------ deployment
  const ROLE_ROW = { shield: 0, pike: 0, fighter: 0, polearm: 0, shock: 0, cavalry: 0, hero: 1, skirmisher: 1, siege: 2, ranged: 2, support: 2, mage: 2, scout: 2 };
  function deployUnits(battle, units, side, rng) {
    const W = battle.W, H = battle.H;
    const lanes = side === 0 ? [3, 2, 1, 0] : [W - 4, W - 3, W - 2, W - 1];
    const order = units.slice().sort((a, b) => (ROLE_ROW[a.role] === undefined ? 1 : ROLE_ROW[a.role]) - (ROLE_ROW[b.role] === undefined ? 1 : ROLE_ROW[b.role]));
    const mid = (H - 1) / 2;
    const rowOrder = [];
    for (let i = 0; i < H; i++) rowOrder.push(Math.round(mid + (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2)));
    const rows = rowOrder.filter(r => r >= 0 && r < H);
    let li = 0;
    for (const u of order) {
      const want = ROLE_ROW[u.role] === undefined ? 1 : ROLE_ROW[u.role];
      let placed = false;
      for (let lane = 0; lane < lanes.length && !placed; lane++) {
        const col = lanes[(want + lane) % lanes.length];
        for (const row of rows) {
          if (!inField(battle, col, row)) continue;
          const h = battle.hexes[row * W + col];
          if (!h || h.obstacle || wallAt(battle, col, row)) continue;
          if (unitAt(battle, col, row)) continue;
          u.col = col; u.row = row; placed = true; break;
        }
      }
      if (!placed) {
        // last resort: any free hex on the unit's half
        const from = side === 0 ? 0 : Math.floor(W / 2);
        for (let c = from; c < from + Math.floor(W / 2) && !placed; c++) {
          for (let r = 0; r < H && !placed; r++) {
            const h = battle.hexes[r * W + c];
            if (!h || h.obstacle || unitAt(battle, c, r) || wallAt(battle, c, r)) continue;
            u.col = c; u.row = r; placed = true;
          }
        }
      }
      u.facing = side === 0 ? 0 : 3;
      li++;
    }
    return li;
  }

  // ------------------------------------------------------------------ create
  /**
   * Build a tactical battle from two sets of armies standing on world hex `hexIdx`.
   * opts: {attackerArmyIds:[id], defenderArmyIds:[id], hexIdx, siege:false, seed, units0, units1}
   */
  Combat.create = function (game, opts) {
    opts = opts || {};
    const W = C.W, H = C.H;
    const id = game && S() ? S().newId(game, 'battle') : 1;
    const seed = opts.seed !== undefined && opts.seed !== null
      ? opts.seed
      : ((game && game.seed ? game.seed : 'b') + ':battle:' + id + ':' + (opts.hexIdx === undefined ? 0 : opts.hexIdx));
    const battle = {
      id, seed, seedInt: AOW.hashString(String(seed)) >>> 0,
      W, H,
      hexIdx: opts.hexIdx === undefined ? -1 : opts.hexIdx,
      terrain: 'grass',
      hexes: [],
      units: [],
      sides: [],
      sidePlayers: [-1, -1],
      attacker: -1, defender: -1,
      side: 0,
      round: 1,
      log: [],
      winner: null,
      cp: { 0: C.CP_START, 1: C.CP_START },
      spellsCast: {},
      walls: null, gate: null,
      siege: !!opts.siege,
      architecture: opts.architecture || null,
      cultureId: opts.cultureId || null,
      deployZones: [{ side: 0, cols: [0, C.DEPLOY_COLS - 1] }, { side: 1, cols: [W - C.DEPLOY_COLS, W - 1] }],
      retreatAllowedFromRound: C.RETREAT_ROUND,
      activeUnitId: null,
      viewerSide: 0,
      attackerArmyIds: (opts.attackerArmyIds || []).slice(),
      defenderArmyIds: (opts.defenderArmyIds || []).slice(),
      result: null,
      finished: false,
      stats: { damage: [0, 0], kills: [0, 0] },
    };
    setGame(battle, game);
    const rng = rngOf(battle);

    // terrain from the world hex
    const info = { terrain: 'grass', feature: 'none', around: ['grass'], water: false };
    if (game && battle.hexIdx >= 0 && game.terrain) {
      try {
        info.terrain = S().TERRAINS[game.terrain[battle.hexIdx]] || 'grass';
        info.feature = S().FEATURES[game.feature[battle.hexIdx]] || 'none';
        const around = [];
        for (const n of Hex().neighborsIdx(battle.hexIdx, game.W, game.H)) around.push(S().TERRAINS[game.terrain[n]]);
        info.around = around.filter(Boolean);
        info.water = info.around.some(t => t === 'ocean' || t === 'coast' || t === 'lake') && rng.chance(0.6);
      } catch (e) { /* defaults */ }
    }
    battle.terrain = info.terrain;
    makeField(battle, rng, info);
    // a siege borrows the defending city's look and wall strength
    if (game && battle.hexIdx >= 0 && S().cityAt) {
      const city = S().cityAt(game, battle.hexIdx);
      if (city) {
        battle.cityId = city.id;
        const cult = (R() && typeof R().cityCulture === 'function') ? R().cityCulture(game, city) : null;
        const cultureId = cult || (game.players[city.owner] && game.players[city.owner].cultureId) || null;
        if (cultureId && !battle.cultureId) battle.cultureId = cultureId;
        if (!battle.architecture && cultureId && has('cultures', cultureId)) battle.architecture = get('cultures', cultureId).architecture || null;
        battle.wallBonus = Math.max(0, (city.walls || 0)) * 50;
      }
    }
    if (battle.siege) buildWalls(battle, rng);

    // gather units
    const gather = (armyIds, side) => {
      const out = [];
      if (!game) return out;
      for (const aid of armyIds || []) {
        const army = S().army(game, aid);
        if (!army) continue;
        if (battle.sidePlayers[side] < 0) battle.sidePlayers[side] = army.owner;
        for (const uid of army.units) {
          const gu = S().unit(game, uid);
          if (!gu) continue;
          const type = typeOf(game, gu);
          if (type && (type.tags || []).indexOf('noncombat') >= 0) continue;
          out.push(gu);
        }
      }
      return out;
    };
    let nextId = 1;
    const addSide = (gameUnits, inlineUnits, side) => {
      const list = [];
      for (const gu of gameUnits) list.push(makeBattleUnit(battle, game, gu, side, nextId++));
      for (const inl of inlineUnits || []) {
        const stats = normalizeInlineStats(inl);
        const bu = makeBattleUnit(battle, game, null, side, nextId++, stats);
        if (inl.col !== undefined) { bu.col = inl.col; bu.row = inl.row; bu._placed = true; }
        list.push(bu);
      }
      for (const u of list) battle.units.push(u);
      return list;
    };
    const a = addSide(gather(battle.attackerArmyIds, 0), opts.units0, 0);
    const d = addSide(gather(battle.defenderArmyIds, 1), opts.units1, 1);
    if (battle.sidePlayers[0] < 0 && opts.attacker !== undefined) battle.sidePlayers[0] = opts.attacker;
    if (battle.sidePlayers[1] < 0 && opts.defender !== undefined) battle.sidePlayers[1] = opts.defender;
    battle.attacker = battle.sidePlayers[0];
    battle.defender = battle.sidePlayers[1];
    deployUnits(battle, a.filter(u => !u._placed), 0, rng);
    deployUnits(battle, d.filter(u => !u._placed), 1, rng);
    if (battle.siege) {
      // defenders belong behind the wall
      for (const u of d) if (u.col <= battle.wallCol) u.col = Math.min(W - 1, battle.wallCol + 1 + rng.int(0, 2));
      spreadOut(battle, d);
    }
    for (const u of battle.units) delete u._placed;

    const cpBonus = side => {
      const pid = battle.sidePlayers[side];
      if (!game || pid < 0 || !game.players || !game.players[pid]) return 0;
      const p = game.players[pid];
      if (p.combatCasting && typeof p.combatCasting.cpMax === 'number') return Math.max(0, p.combatCasting.cpMax - C.CP_START);
      return 0;
    };
    for (let s = 0; s < 2; s++) {
      battle.sides.push({
        side: s,
        owner: battle.sidePlayers[s],
        armyIds: (s === 0 ? battle.attackerArmyIds : battle.defenderArmyIds).slice(),
        cp: C.CP_START + cpBonus(s),
        cpMax: C.CP_MAX + cpBonus(s),
        spells: knownCombatSpells(game, battle.sidePlayers[s]),
        castThisRound: false,
        retreated: false,
        losses: 0,
      });
      battle.cp[s] = battle.sides[s].cp;
    }
    battle.viewerSide = (game && game.players && battle.sidePlayers[1] >= 0 && game.players[battle.sidePlayers[1]] && game.players[battle.sidePlayers[1]].isHuman) ? 1 : 0;
    for (const u of battle.units) {
      if (hasPassive(u, 'concealment')) applyStatus(battle, u, 'concealed', 0, 100, null);
      refreshMorale(battle, u, null);
    }
    beginRound(battle, true);
    log(battle, 'battle:start', { units: battle.units.length });
    return battle;
  };

  function spreadOut(battle, list) {
    const used = new Set();
    for (const u of battle.units) if (list.indexOf(u) < 0) used.add(hexKey(u.col, u.row));
    for (const u of list) {
      let k = hexKey(u.col, u.row);
      let guard = 0;
      while ((used.has(k) || !inField(battle, u.col, u.row) || (Combat.hexAt(battle, u.col, u.row) || {}).obstacle || wallAt(battle, u.col, u.row)) && guard++ < 200) {
        u.row = (u.row + 1) % battle.H;
        if (u.row === 0) u.col = clamp(u.col + 1, 0, battle.W - 1);
        k = hexKey(u.col, u.row);
      }
      used.add(k);
    }
  }

  /** inline unit types (demo / tests): accept a plain unit-type object and build a stat block from it. */
  function normalizeInlineStats(inl) {
    const type = inl.type || inl;
    const stats = Combat.baseStats(null, { typeId: type.id, custom: type, rank: inl.rank || 0, hp: inl.hp });
    if (inl.hp) stats.hp = inl.hp;
    return stats;
  }

  function knownCombatSpells(game, pid) {
    if (!game || pid === undefined || pid < 0 || !game.players || !game.players[pid]) return [];
    const p = game.players[pid];
    const known = (p.spells && p.spells.known) || [];
    const out = [];
    for (const id of known) { const sp = get('spells', id); if (sp && sp.kind === 'combat') out.push(id); }
    return out;
  }

  // ================================================================ geometry, movement, line of sight
  function blocksMove(battle, u, col, row) {
    if (!inField(battle, col, row)) return true;
    const h = battle.hexes[idxOf(battle, col, row)];
    if (!h) return true;
    const fly = u && (isFlyer(u) || isFloater(u));
    if (h.obstacle && !(fly && h.obstacle !== 'wall')) return true;
    if (h.obstacle === 'water' && !fly && !(u && (hasTag(u, 'amphibious') || hasPassive(u, 'amphibious') || hasPassive(u, 'swimming') || u.stats.move === 'swim'))) return true;
    const w = wallAt(battle, col, row);
    if (w && !(u && isFlyer(u))) return true;
    return false;
  }
  function moveCostAt(battle, u, col, row) {
    if (blocksMove(battle, u, col, row)) return Infinity;
    const h = battle.hexes[idxOf(battle, col, row)];
    if (u && (isFlyer(u) || isFloater(u))) return 1;
    let cost = h.cost === undefined ? hexCostFor(h) : h.cost;
    if (u) {
      if ((h.feature === 'forest' || h.feature === 'dense_forest' || h.terrain === 'forest') &&
        (hasPassive(u, 'forest_stalker') || (passiveValue(u, 'terrain_stalker', 'terrain', null) === 'forest'))) cost = 1;
      if ((h.terrain === 'mountain' || h.feature === 'mountain' || h.terrain === 'hills') && hasPassive(u, 'mountaineer')) cost = 1;
    }
    return cost;
  }
  /** Hexes adjacent to a living enemy exert a zone of control. */
  function inZoc(battle, u, col, row) {
    for (let d = 0; d < 6; d++) {
      const n = Hex().neighbor(col, row, d);
      const o = unitAt(battle, n.col, n.row);
      if (o && o.side !== u.side && !isDead(o) && !effectsOf(o).flags.stunned) return o;
    }
    return null;
  }
  function ignoresZoc(u) { return isFlyer(u) || hasPassive(u, 'slippery') || hasPassive(u, 'elusive') || hasPassive(u, 'infiltrate') || hasPassive(u, 'ethereal'); }

  /** Map(hexKey → {col,row,cost,apCost,ap,path}) of everywhere the unit can walk with its remaining AP. */
  Combat.reachable = function (battle, unitId) {
    const u = Combat.unit(battle, unitId);
    const out = new Map();
    if (!u || isDead(u) || u.ap <= 0 || u.mp <= 0 || isRooted(u)) return out;
    // single-entry memo: the AI asks for the same unit's reach several times per activation
    const ckey = u.id + ':' + u.col + ',' + u.row + ':' + u.ap + ':' + u.mp + ':' + (battle._posToken || 0);
    if (battle._reachKey === ckey && battle._reachMap) return battle._reachMap;
    const perAp = Math.max(0.5, u.mp / u.apMax);
    const budget = perAp * u.ap + 0.001;
    const W = battle.W, H = battle.H;
    const start = idxOf(battle, u.col, u.row);
    const dist = new Map([[start, 0]]);
    const prev = new Map();
    const heap = new (Hex().Heap)();
    heap.push(start, 0);
    const zocStart = ignoresZoc(u) ? null : inZoc(battle, u, u.col, u.row);
    while (heap.size) {
      const cur = heap.pop();
      const dc = dist.get(cur);
      if (dc === undefined) continue;
      const cc = cur % W, cr = Math.floor(cur / W);
      for (let d = 0; d < 6; d++) {
        const n = Hex().neighbor(cc, cr, d);
        if (!inField(battle, n.col, n.row)) continue;
        const ni = idxOf(battle, n.col, n.row);
        const occ = unitAt(battle, n.col, n.row);
        if (occ && occ.id !== u.id) continue;
        const cost = moveCostAt(battle, u, n.col, n.row);
        if (!isFinite(cost)) continue;
        const g = dc + cost;
        if (g > budget) continue;
        const old = dist.has(ni) ? dist.get(ni) : Infinity;
        if (g < old) { dist.set(ni, g); prev.set(ni, cur); heap.push(ni, g); }
      }
    }
    for (const [i, cost] of dist) {
      if (i === start) continue;
      const col = i % W, row = Math.floor(i / W);
      let apCost = Math.max(1, Math.ceil((cost - 0.0001) / perAp));
      if (zocStart && !isAdjacent(zocStart, col, row)) apCost = u.ap;   // ZOC: breaking away costs everything
      if (apCost > u.ap) continue;
      out.set(hexKey(col, row), { col, row, cost: +cost.toFixed(2), apCost, ap: apCost, path: buildPath(battle, prev, start, i) });
    }
    battle._reachKey = ckey; battle._reachMap = out;
    return out;
  };
  /** Any change of unit positions/lives invalidates the movement memo. */
  function bumpPositions(battle) { battle._posToken = (battle._posToken || 0) + 1; battle._reachKey = null; battle._reachMap = null; }
  function isAdjacent(u, col, row) { return Hex().dist(u.col, u.row, col, row) === 1; }
  function buildPath(battle, prev, start, goal) {
    const path = [];
    let n = goal, guard = 0;
    while (n !== start && guard++ < 500) {
      path.push({ col: n % battle.W, row: Math.floor(n / battle.W) });
      const p = prev.get(n);
      if (p === undefined) break;
      n = p;
    }
    path.reverse();
    return path;
  }

  /** Shortest walk for `unitId` to `hex` regardless of AP (used by the renderer's path preview). */
  Combat.path = function (battle, unitId, hex) {
    const u = Combat.unit(battle, unitId);
    const t = toHex(battle, hex);
    if (!u || !t || !inField(battle, t.col, t.row)) return null;
    const reach = Combat.reachable(battle, unitId);
    const hit = reach.get(hexKey(t.col, t.row));
    if (hit) return { path: hit.path, cost: hit.cost, apCost: hit.apCost };
    const W = battle.W, H = battle.H;
    const r = Hex().astar(idxOf(battle, u.col, u.row), idxOf(battle, t.col, t.row), W, H, (from, to) => {
      const c = to % W, rr = Math.floor(to / W);
      const occ = unitAt(battle, c, rr);
      if (occ && occ.id !== u.id) return Infinity;
      return moveCostAt(battle, u, c, rr);
    }, { maxCost: 60 });
    if (!r) return null;
    const perAp = Math.max(0.5, u.mp / u.apMax);
    return { path: r.path.map(i => ({ col: i % W, row: Math.floor(i / W) })), cost: r.cost, apCost: Math.ceil(r.cost / perAp) };
  };

  /** {clear, blocked, obscured} between two hexes (endpoints excluded). Walls and rock/ruins block; trees and units obscure. */
  Combat.lineOfSight = function (battle, from, to) {
    const a = toHex(battle, from), b = toHex(battle, to);
    if (!a || !b) return { clear: true, blocked: false, obscured: 0 };
    const line = Hex().line(a.col, a.row, b.col, b.row);
    let obscured = 0, blocked = false;
    for (let i = 1; i < line.length - 1; i++) {
      const p = line[i];
      if (!inField(battle, p.col, p.row)) continue;
      const h = battle.hexes[idxOf(battle, p.col, p.row)];
      const w = wallAt(battle, p.col, p.row);
      if (w) { blocked = true; break; }
      if (h && h.obstacle) {
        if (h.obstacle === 'rock' || h.obstacle === 'ruins') { blocked = true; break; }
        obscured += 1;                                     // trees / hills / water: shot passes but harder
      } else if (h && (h.feature === 'forest' || h.feature === 'dense_forest')) obscured += 0.5;
      if (unitAt(battle, p.col, p.row)) obscured += 1;
    }
    return { clear: !blocked, blocked, obscured };
  };

  // ================================================================ facing & flanking
  function faceToward(u, col, row) {
    if (u.col === col && u.row === row) return;
    u.facing = Hex().dirTo(u.col, u.row, col, row);
  }
  /** {flank, rear} for an attack coming from `att` onto `tgt`. */
  function flankOf(battle, att, tgt) {
    const e = effectsOf(tgt);
    if (e.flags.immuneFlank) return { flank: false, rear: false };
    if (e.flags.alwaysFlanked) return { flank: true, rear: false };
    const d = Hex().dirTo(tgt.col, tgt.row, att.col, att.row);
    const rel = ((d - (tgt.facing || 0)) % 6 + 6) % 6;
    if (rel === 3) return { flank: true, rear: true };
    if (rel === 2 || rel === 4) return { flank: true, rear: false };
    if (hasPassive(att, 'flanker') && (rel === 1 || rel === 5)) return { flank: true, rear: false };
    return { flank: false, rear: false };
  }

  // ================================================================ statuses
  function findStatus(u, id) { for (const s of u.statuses) if (s.id === id) return s; return null; }
  function removeStatus(u, id) {
    const i = u.statuses.findIndex(s => s.id === id);
    if (i < 0) return false;
    u.statuses.splice(i, 1);
    touchStatuses(u);
    return true;
  }
  /**
   * Try to apply `statusId` to `target`. Returns {applied, resisted, immune, status}.
   * Resistance: chance − (statusRes + statusRes_<resistedBy>) × 10; immunity from tags, immune(channel) and immuneStatus.
   */
  function applyStatus(battle, target, statusId, duration, chance, out) {
    const d = statusDef(statusId);
    if (!d || isDead(target)) return { applied: false };
    const e = effectsOf(target);
    const tags = target.stats.tags || [];
    if ((d.immuneTags || []).some(t => tags.indexOf(t) >= 0)) return { applied: false, immune: true };
    if (e.immuneStatus.indexOf(statusId) >= 0) return { applied: false, immune: true };
    if (d.resistedBy && immuneChannel(target, d.resistedBy)) return { applied: false, immune: true };
    if (d.kind === 'debuff' && hasPassive(target, 'control_immunity') && (d.effects || {}).charmed) return { applied: false, immune: true };
    if (e.flags.immuneMorale && (statusId === 'demoralized' || statusId === 'panicked')) return { applied: false, immune: true };
    let p = chance === undefined || chance === null ? 100 : chance;
    if (d.kind === 'debuff') p -= statusRes(target, e, d.resistedBy) * C.STATUS_RES_STEP;
    if (p < 100 && !rngOf(battle).chance(p / 100)) {
      if (out) out.push({ type: 'status', unitId: target.id, status: statusId, resisted: true });
      return { applied: false, resisted: true };
    }
    for (const b of d.blocks || []) removeStatus(target, b);
    const turns = duration === undefined || duration === null ? (d.duration === undefined ? 3 : d.duration) : duration;
    const existing = findStatus(target, statusId);
    if (existing) {
      const maxStacks = typeof d.stack === 'number' ? d.stack : 1;
      existing.stacks = Math.min(maxStacks, (existing.stacks || 1) + (d.stack ? 1 : 0));
      existing.turns = Math.max(existing.turns, turns === 0 ? 99 : turns);
    } else {
      target.statuses.push({ id: statusId, turns: turns === 0 ? 99 : turns, stacks: 1 });
    }
    touchStatuses(target);
    refreshMorale(battle, target, out);
    if (out) out.push({ type: 'status', unitId: target.id, status: statusId, applied: true });
    return { applied: true, status: statusId };
  }
  Combat.applyStatus = applyStatus;

  function cleanse(battle, target, ids, out) {
    let n = 0;
    for (const s of target.statuses.slice()) {
      const d = statusDef(s.id);
      if (!d || d.kind !== 'debuff') continue;
      if (d.cleansable === false) continue;
      if (ids && ids.length && ids.indexOf(s.id) < 0) continue;
      removeStatus(target, s.id); n++;
      if (out) out.push({ type: 'status', unitId: target.id, status: s.id, removed: true });
    }
    if (n) refreshMorale(battle, target, out);
    return n;
  }

  // ================================================================ morale
  function moraleBand(v) {
    if (v <= C.MORALE_BROKEN) return 'broken';
    if (v <= C.MORALE_WAVERING) return 'wavering';
    if (v <= C.MORALE_SHAKEN) return 'shaken';
    if (v >= 20) return 'inspired';
    return 'steady';
  }
  const RENDER_MORALE = { broken: 'fleeing', wavering: 'breaking', shaken: 'shaken', steady: 'steady', inspired: 'inspired' };
  function moraleValue(battle, u) {
    const e = effectsOf(u);
    if (e.flags.immuneMorale) return 0;
    let v = (u.stats.morale || 0) + (e.morale || 0) + (u.moraleDelta || 0);
    if (u.hp / u.maxHp < 0.3) v += C.MORALE_LOW_HP;
    // inspiring presence from nearby allies
    for (const o of battle.units) {
      if (o.side !== u.side || isDead(o) || o.id === u.id) continue;
      const list = passive(o, 'inspiring_presence');
      if (!list) continue;
      for (const p of list) if (Hex().dist(u.col, u.row, o.col, o.row) <= (p.radius || 2)) v += p.value || 5;
    }
    const s = battle.sides[u.side];
    if (s) v -= (s.losses || 0) * 5;
    return Math.round(v);
  }
  function refreshMorale(battle, u, out) {
    const before = u.moraleState;
    u.morale = moraleValue(battle, u);
    const band = moraleBand(u.morale);
    u.moraleBand = band;
    u.moraleState = RENDER_MORALE[band] || 'steady';
    if (out && before !== u.moraleState && (band !== 'steady' || before !== 'steady')) {
      out.push({ type: 'morale', unitId: u.id, state: u.moraleState, morale: u.morale });
    }
    return u.morale;
  }
  function changeMorale(battle, u, delta, out) {
    if (effectsOf(u).flags.immuneMorale) return;
    u.moraleDelta = (u.moraleDelta || 0) + delta;
    refreshMorale(battle, u, out);
  }
  function moraleAccuracy(u) {
    if (u.moraleBand === 'wavering' || u.moraleBand === 'broken') return C.WAVERING_ACC;
    if (u.moraleBand === 'shaken') return C.SHAKEN_ACC;
    return 0;
  }
  function moraleDamagePct(u) {
    if (u.moraleBand === 'broken') return C.BROKEN_DMG;
    if (u.moraleBand === 'wavering') return C.WAVERING_DMG;
    return 0;
  }

  // ================================================================ damage
  /**
   * damage = (base + flat) × (1 + dmg% ) × 0.9^(effective def|res) × crit/graze × flank × charge
   * `def` is Defense for physical channels and Resistance otherwise (+prot_<channel>);
   * armor_piercing lowers it by 2, a flanking hit by 2, a rear hit ignores it entirely.
   */
  function computeDamage(battle, att, tgt, attack, ctx) {
    ctx = ctx || {};
    const channel = ctx.channel || attack.channel || 'physical';
    const ae = effectsOf(att), te = effectsOf(tgt);
    let base = (ctx.amount !== undefined ? ctx.amount : attack.damage) || 0;
    base += att.stats.dmg || 0;
    base += ae.bonusDmg || 0;
    base += ae.channelDmg[channel] || 0;
    if (base <= 0 && !ctx.allowZero) return { dmg: 0, blocked: true, channel };
    let pct = (att.stats.dmgPct || 0) + (ae.dmgPct || 0) + moraleDamagePct(att);
    const fer = passive(att, 'ferocious'); if (fer) for (const f of fer) if (att.hp / att.maxHp < 0.5) pct += f.pct || 25;
    const cull = passive(att, 'cull_the_weak'); if (cull) if (tgt.hp / tgt.maxHp < 0.4) pct += 25;
    if (ae.dmgPctVsStatus) for (const k of Object.keys(ae.dmgPctVsStatus)) if (findStatus(tgt, k)) pct += ae.dmgPctVsStatus[k];
    if (ctx.charge) pct += C.CHARGE_PCT;
    if (ctx.braced && (hasTag(tgt, 'cavalry') || (tgt.stats.look && tgt.stats.look.size === 'large') || (tgt.stats.look && tgt.stats.look.size === 'huge'))) pct += C.PIKE_VS_CAVALRY_PCT;
    if (hasPassive(att, 'siege_breaker') && ctx.vsWall) pct += 100;
    let dmg = base * (1 + pct / 100);

    // defense
    let def = defenseAgainst(tgt, channel) + terrainDefense(battle, tgt);
    if ((attack.props || []).indexOf('armor_piercing') >= 0 || ctx.armorPiercing) def -= C.ARMOR_PIERCE;
    if ((attack.props || []).indexOf('ignore_half_def') >= 0) def = Math.floor(def / 2);
    if (ctx.rear) def = 0;
    else if (ctx.flank) def -= C.FLANK_DEF;
    if (hasPassive(tgt, 'shield_wall') && tgt.defending && !ctx.flank) def += passiveValue(tgt, 'shield_wall', 'value', 3);
    if (hasPassive(tgt, 'bulwark') && ctx.ranged) def += 2;
    def = Math.max(-6, def);
    dmg *= Math.pow(C.DEF_STEP, def);

    // taken modifiers
    let taken = (te.damageTakenPct || 0) + (te.dmgTakenCh[channel] || 0);
    taken += weakChannel(tgt, channel);
    if (immuneChannel(tgt, channel)) return { dmg: 0, blocked: true, immune: true, channel };
    dmg *= (1 + taken / 100);

    if (ctx.crit) dmg *= C.CRIT_MULT;
    else if (ctx.graze) dmg *= C.GRAZE_MULT;
    dmg = Math.max(ctx.crit ? 2 : 1, Math.round(dmg));
    return { dmg, channel, crit: !!ctx.crit, graze: !!ctx.graze };
  }

  function hitChance(battle, att, tgt, attack, ctx) {
    ctx = ctx || {};
    const ae = effectsOf(att), te = effectsOf(tgt);
    let acc = (attack.accuracy === undefined ? C.BASE_ACCURACY : attack.accuracy) + (att.stats.accuracy || 0) + (ae.accuracy || 0) + moraleAccuracy(att);
    acc -= te.evasion || 0;
    if (ctx.rear) acc += 20; else if (ctx.flank) acc += 10;
    if (tgt.defending) acc -= 10;
    if (ctx.ranged) {
      const dist = Hex().dist(att.col, att.row, tgt.col, tgt.row);
      acc -= Math.max(0, dist - 2) * C.RANGE_ACC_PER_HEX;
      const los = Combat.lineOfSight(battle, att, tgt);
      acc -= Math.min(C.OBSCURED_MAX, Math.round(los.obscured * C.OBSCURED_ACC));
      if (hasPassive(att, 'ranged_expert')) acc += 5;
    }
    if ((attack.props || []).indexOf('cannot_miss') >= 0) return 100;
    return clamp(Math.round(acc), C.MIN_HIT, C.MAX_HIT);
  }

  /** Apply raw damage to a unit; pushes death events. Returns {dmg, killed}. */
  function damageUnit(battle, target, dmg, channel, out, source) {
    if (isDead(target) || dmg <= 0) return { dmg: 0, killed: false };
    const e = effectsOf(target);
    // burning is put out by frost, frozen thaws in fire …
    for (const s of target.statuses.slice()) {
      const d = statusDef(s.id);
      if (d && (d.removedBy || []).indexOf(channel) >= 0) { removeStatus(target, s.id); if (out) out.push({ type: 'status', unitId: target.id, status: s.id, removed: true }); }
    }
    let hp = target.hp - dmg;
    if (e.flags.steadfast && hp < 1) hp = 1;
    target.hp = hp;
    if (source) { source.damageDealt += dmg; const st = battle.stats; if (st) st.damage[source.side] += dmg; }
    if (target.hp <= 0) {
      target.hp = 0;
      killUnit(battle, target, out, source);
      return { dmg, killed: true };
    }
    refreshMorale(battle, target, out);
    return { dmg, killed: false };
  }

  function killUnit(battle, u, out, killer) {
    if (u.dead) return;
    if (hasPassive(u, 'undying') && !u._undyingUsed) {
      u._undyingUsed = true; u.hp = Math.max(1, Math.round(u.maxHp * 0.2));
      if (out) out.push({ type: 'status', unitId: u.id, status: 'steadfast', applied: true });
      return;
    }
    u.dead = true; u.hp = 0;
    bumpPositions(battle);
    const side = battle.sides[u.side];
    if (side) side.losses = (side.losses || 0) + 1;
    if (battle.stats) battle.stats.kills[1 - u.side]++;
    if (out) out.push({ type: 'death', unitId: u.id });
    log(battle, 'death', { unitId: u.id, side: u.side });
    if (killer && !isDead(killer)) {
      killer.kills++;
      changeMorale(battle, killer, C.MORALE_KILL, out);
      const onKill = passive(killer, 'on_kill');
      if (onKill) for (const p of onKill) if (p.status) applyStatus(battle, killer, p.status, p.duration, 100, out);
      if (hasPassive(killer, 'soul_harvest')) { killer.hp = Math.min(killer.maxHp, killer.hp + Math.round(killer.maxHp * 0.15)); if (out) out.push({ type: 'heal', unitId: killer.id, amount: Math.round(killer.maxHp * 0.15) }); }
    }
    // morale shock around the corpse
    for (const o of battle.units) {
      if (isDead(o) || o.id === u.id) continue;
      const d = Hex().dist(u.col, u.row, o.col, o.row);
      if (d > 3) continue;
      changeMorale(battle, o, o.side === u.side ? C.MORALE_ALLY_DEATH : C.MORALE_ENEMY_DEATH, out);
    }
    checkWinner(battle, out);
  }

  // ================================================================ walls
  function damageWall(battle, w, dmg, out) {
    if (!w || w.hp <= 0) return 0;
    w.hp = Math.max(0, w.hp - dmg);
    const destroyed = w.hp <= 0;
    if (destroyed) w.destroyed = true;
    if (out) out.push({ type: 'wall', col: w.col, row: w.row, dmg, hp: w.hp, maxHp: w.maxHp, destroyed });
    log(battle, 'wall', { col: w.col, row: w.row, dmg, hp: w.hp });
    return dmg;
  }

  // ================================================================ turn flow
  function beginRound(battle, first) {
    battle.round = first ? 1 : battle.round + 1;
    for (const s of battle.sides) {
      if (!first) s.cp = Math.min(s.cpMax, s.cp + C.CP_PER_ROUND);
      battle.cp[s.side] = s.cp;
    }
    battle.side = 0;
    beginSideTurn(battle, 0, []);
  }
  /** Start of a side's turn: AP/retaliation reset, status ticks, cooldowns, defend expiry. */
  function beginSideTurn(battle, side, out) {
    battle.side = side;
    const s = battle.sides[side];
    if (s) s.castThisRound = false;
    for (const u of battle.units) {
      if (u.side !== side || isDead(u)) continue;
      const e = effectsOf(u);
      u.ap = e.flags.stunned ? 0 : u.apMax;
      u.moved = 0;
      u.hasActed = false;
      u.defending = false;
      removeStatus(u, 'fortified');
      touchStatuses(u);
      u.retaliations = Math.max(0, 1 + (effectsOf(u).retaliation || 0));
      u.hasRetaliation = u.retaliations > 0;
      for (const k of Object.keys(u.cooldowns)) { u.cooldowns[k] = Math.max(0, u.cooldowns[k] - 1); if (!u.cooldowns[k]) delete u.cooldowns[k]; }
      tickStatusStart(battle, u, out);
      if (u.moraleDelta) u.moraleDelta *= 0.6;            // morale recovers slowly
      refreshMorale(battle, u, out);
    }
    // auras fire at the start of the side's turn
    for (const u of battle.units) {
      if (u.side !== side || isDead(u)) continue;
      const auras = passive(u, 'aura');
      if (!auras) continue;
      for (const a of auras) {
        if (!a.status) continue;
        for (const o of battle.units) {
          if (isDead(o)) continue;
          const wantAlly = a.side !== 'enemy';
          if ((o.side === u.side) !== wantAlly) continue;
          if (Hex().dist(u.col, u.row, o.col, o.row) > (a.radius || 1)) continue;
          if (o.id === u.id && wantAlly && a.selfless) continue;
          if (rngOf(battle).chance((a.chance === undefined ? 100 : a.chance) / 100)) applyStatus(battle, o, a.status, a.duration, 100, out);
        }
      }
    }
    battle.activeUnitId = nextActor(battle) ? nextActor(battle).id : null;
    return out;
  }
  function tickStatusStart(battle, u, out) {
    const e = effectsOf(u);
    for (const dot of e.dots) {
      if (immuneChannel(u, dot.channel)) continue;
      const res = damageUnit(battle, u, Math.max(1, Math.round(dot.amount)), dot.channel, out, null);
      if (out && res.dmg) out.push({ type: 'damage', target: u.id, unitId: u.id, channel: dot.channel, source: 'status', status: dot.from, hits: [{ dmg: res.dmg, channel: dot.channel }] });
      if (isDead(u)) return;
    }
    if (e.tickStatus) for (const sid of e.tickStatus) applyStatus(battle, u, sid, undefined, 60, out);
    if (e.moralePerTurn) changeMorale(battle, u, e.moralePerTurn, out);
  }
  function tickStatusEnd(battle, u, out) {
    if (isDead(u)) return;
    const e = effectsOf(u);
    let heal = e.healPerTurn || 0;
    const regen = passive(u, 'regeneration');
    if (regen && !findStatus(u, 'poisoned') && !findStatus(u, 'blighted')) for (const p of regen) heal += p.amount === undefined ? 10 : p.amount;
    if (heal > 0 && u.hp < u.maxHp) {
      const amt = Math.min(heal, u.maxHp - u.hp);
      u.hp += amt;
      if (out && amt > 0) out.push({ type: 'heal', unitId: u.id, amount: amt });
    }
    for (const s of u.statuses.slice()) {
      if (s.turns >= 99) continue;
      s.turns--;
      if (s.turns <= 0) {
        removeStatus(u, s.id);
        if (out) out.push({ type: 'status', unitId: u.id, status: s.id, expired: true });
      }
    }
    touchStatuses(u);
    refreshMorale(battle, u, out);
  }

  function canAct(u) {
    if (isDead(u) || u.fled) return false;
    if (u.hasActed || u.ap <= 0) return false;
    return true;
  }
  function nextActor(battle) {
    const list = battle.units.filter(u => u.side === battle.side && canAct(u));
    if (!list.length) return null;
    list.sort((a, b) => (b.hero ? 1 : 0) - (a.hero ? 1 : 0) || a.id - b.id);
    return list[0];
  }
  Combat.nextActor = nextActor;
  Combat.currentSide = function (battle) { return battle.side; };

  /** Finish one unit's activation (end-of-turn regen + status durations). */
  Combat.endUnitTurn = function (battle, unitId) {
    const out = [];
    const u = Combat.unit(battle, unitId === undefined ? battle.activeUnitId : unitId);
    if (u) {
      u.ap = 0; u.hasActed = true;
      tickStatusEnd(battle, u, out);
    }
    const next = nextActor(battle);
    battle.activeUnitId = next ? next.id : null;
    if (!next && !battle.winner) out.push.apply(out, Combat.endSideTurn(battle));
    return out;
  };

  /** Hand the initiative to the other side (advancing the round after side 1). */
  Combat.endSideTurn = function (battle) {
    const out = [];
    if (battle.winner !== null && battle.winner !== undefined) return out;
    for (const u of battle.units) if (u.side === battle.side && !isDead(u) && !u.hasActed) { u.hasActed = true; tickStatusEnd(battle, u, out); }
    if (battle.side === 0) {
      beginSideTurn(battle, 1, out);
    } else {
      if (battle.round >= C.MAX_ROUNDS) { finishStalemate(battle, out); return out; }
      beginRound(battle, false);
      out.push({ type: 'round', round: battle.round });
    }
    checkWinner(battle, out);
    return out;
  };

  function finishStalemate(battle, out) {
    battle.winner = 1;                                       // stalemate favours the defender
    battle.stalemate = true;
    out.push({ type: 'end', winner: battle.winner, stalemate: true });
    log(battle, 'stalemate');
  }

  function checkWinner(battle, out) {
    if (battle.winner !== null && battle.winner !== undefined) return battle.winner;
    const a = aliveOf(battle, 0).length, d = aliveOf(battle, 1).length;
    if (a === 0 && d === 0) battle.winner = 1;
    else if (a === 0) battle.winner = 1;
    else if (d === 0) battle.winner = 0;
    else if (battle.sides[0].retreated) battle.winner = 1;
    else if (battle.sides[1].retreated) battle.winner = 0;
    else return null;
    if (out) out.push({ type: 'end', winner: battle.winner });
    log(battle, 'end', { winner: battle.winner });
    return battle.winner;
  }
  Combat.checkWinner = checkWinner;

  // ================================================================ attack helpers
  function attacksOf(u) { return u.stats.attacks && u.stats.attacks.length ? u.stats.attacks : [FALLBACK_ATTACK]; }
  function findAttack(u, attackId) {
    const list = attacksOf(u);
    if (!attackId) return list[0];
    for (const a of list) if (a.id === attackId) return a;
    return list[0];
  }
  function attackRange(u, a) {
    let r = a.range || 1;
    if (a.type === 'ranged' && hasPassive(u, 'ranged_expert')) r += 1;
    return r;
  }
  function canTarget(battle, u, a, tgt) {
    if (!tgt || isDead(tgt) || tgt.side === u.side) return false;
    const e = effectsOf(u);
    if (e.flags.taunted && u.tauntedBy !== undefined && u.tauntedBy !== null && tgt.id !== u.tauntedBy) return false;
    const dist = Hex().dist(u.col, u.row, tgt.col, tgt.row);
    if (dist > attackRange(u, a)) return false;
    if (a.type === 'ranged' || dist > 1) {
      if (findStatus(u, 'blinded') && a.type === 'ranged') { /* allowed but inaccurate */ }
      const los = Combat.lineOfSight(battle, u, tgt);
      if (los.blocked) return false;
      const te = effectsOf(tgt);
      if (te.flags.concealed && dist > 2 && !hasPassive(u, 'true_sight')) return false;
    }
    return true;
  }
  function canRetaliate(battle, tgt, att, ctx) {
    if (isDead(tgt) || tgt.retaliations <= 0) return false;
    const e = effectsOf(tgt);
    if (e.flags.noRetaliation || e.flags.stunned || e.flags.panicked) return false;
    if (tgt.moraleBand === 'broken') return false;
    if (Hex().dist(tgt.col, tgt.row, att.col, att.row) > 1) return false;
    if (ctx && ctx.noRetaliation) return false;
    if (!attacksOf(tgt).some(a => (a.type !== 'ranged' || a.range <= 1) && (a.range || 1) >= 1)) return false;
    return true;
  }
  function meleeAttackOf(u) {
    for (const a of attacksOf(u)) if (a.type !== 'ranged') return a;
    return attacksOf(u)[0];
  }

  /** One attack resolution (also used for retaliations). Returns the event. */
  function resolveAttack(battle, att, tgt, attack, out, opts) {
    opts = opts || {};
    const rng = rngOf(battle);
    const melee = attack.type !== 'ranged' && Hex().dist(att.col, att.row, tgt.col, tgt.row) <= 1;
    const ranged = !melee;
    const fl = flankOf(battle, att, tgt);
    const props = attack.props || [];
    const charge = !!opts.charge;
    const ev = {
      type: opts.retaliation ? 'retaliate' : 'attack',
      attacker: att.id, target: tgt.id,
      kind: ranged ? 'ranged' : 'melee',
      channel: attack.channel || 'physical',
      attackId: attack.id,
      name: L(attack.name) || attack.id,
      hits: [], killed: [],
      flank: fl.flank, rear: fl.rear, charge,
    };
    const apLeft = Math.max(1, att.ap);
    let strikes = attack.repeat && attack.repeat > 1 ? Math.min(attack.repeat, apLeft) : 1;
    if (opts.retaliation) strikes = 1;
    strikes = Math.max(1, Math.round(strikes * (attack.strikes || 1)));
    const hc = hitChance(battle, att, tgt, attack, { ranged, flank: fl.flank, rear: fl.rear });
    const ae = effectsOf(att);
    let total = 0;
    for (let i = 0; i < strikes; i++) {
      if (isDead(tgt)) break;
      if (rng.next() * 100 >= hc) { ev.hits.push({ dmg: 0, miss: true, channel: ev.channel }); continue; }
      const critChance = C.CRIT_CHANCE + (att.stats.critChance || 0) + (ae.critChance || 0);
      const fumbleChance = C.GRAZE_CHANCE + (ae.fumbleChance || 0);
      const crit = rng.chance(critChance / 100);
      const graze = !crit && rng.chance(fumbleChance / 100);
      const res = computeDamage(battle, att, tgt, attack, { crit, graze, flank: fl.flank, rear: fl.rear, charge, braced: opts.braced, ranged });
      const hit = { dmg: res.dmg, crit, graze, channel: res.channel, blocked: !!res.blocked };
      if (res.dmg > 0) {
        const r = damageUnit(battle, tgt, res.dmg, res.channel, out, att);
        total += r.dmg;
        if (crit) changeMorale(battle, tgt, C.MORALE_CRIT, out);
        if (r.killed) ev.killed.push(tgt.id);
      }
      if (graze && ae.fumbleDamage) damageUnit(battle, att, ae.fumbleDamage, 'physical', out, null);
      // statuses on hit
      if (!isDead(tgt) || res.dmg > 0) {
        for (const eff of attack.effects || []) {
          if (!eff || !eff.status) continue;
          const r = applyStatus(battle, tgt, eff.status, eff.duration, eff.chance === undefined ? 100 : eff.chance, out);
          if (r.applied) hit.status = eff.status;
        }
        if (ae.attackStatus && ae.attackStatusChance) {
          const r = applyStatus(battle, tgt, ae.attackStatus, undefined, ae.attackStatusChance, out);
          if (r.applied && !hit.status) hit.status = ae.attackStatus;
        }
        const sav = passive(att, 'savage_strike');
        if (sav && res.dmg > 0) for (const p of sav) if (p.status) applyStatus(battle, tgt, p.status, p.duration, p.chance === undefined ? 30 : p.chance, out);
      }
      ev.hits.push(hit);
      if (isDead(tgt)) break;
    }
    // life steal
    const ls = passive(att, 'life_steal');
    if (ls && total > 0) {
      let pct = 0; for (const p of ls) pct += p.pct || 25;
      const heal = Math.min(att.maxHp - att.hp, Math.round(total * pct / 100));
      if (heal > 0) { att.hp += heal; out.push({ type: 'heal', unitId: att.id, amount: heal }); }
    }
    if (findStatus(att, 'concealed')) { removeStatus(att, 'concealed'); out.push({ type: 'status', unitId: att.id, status: 'concealed', removed: true }); }
    out.push(ev);
    log(battle, opts.retaliation ? 'retaliate' : 'attack', { attacker: att.id, target: tgt.id, dmg: total });
    return ev;
  }

  // ================================================================ generic effect application (abilities + spells)
  function areaUnits(battle, hex, area, filter) {
    const out = [];
    const list = area > 0 ? Hex().spiral(hex.col, hex.row, area) : [hex];
    for (const p of list) {
      if (!inField(battle, p.col, p.row)) continue;
      const u = unitAt(battle, p.col, p.row);
      if (u && !isDead(u) && filter(u)) out.push(u);
    }
    return out;
  }
  function targetFilter(spec, side) {
    switch (spec) {
      case 'ally': case 'ally_unit': case 'all_allies': return u => u.side === side;
      case 'enemy': case 'enemy_unit': case 'all_enemies': return u => u.side !== side;
      case 'self': return u => false;
      default: return () => true;
    }
  }
  /**
   * Apply an ability/spell `effect` (SPEC §3.0.1 vocabulary) around `hex`/`targetUnit`.
   * Unknown effect types and `special` ids are ignored gracefully.
   */
  function applyEffect(battle, caster, effect, ctx, out) {
    const hits = [];
    if (!effect || !effect.type) return hits;
    const side = ctx.side;
    const area = effect.area !== undefined ? effect.area : (ctx.area || 0);
    const spec = ctx.targetSpec || 'any';
    const filter = targetFilter(spec, side);
    let targets = [];
    if (spec === 'self' && caster) targets = [caster];
    else if (spec === 'all_enemies') targets = battle.units.filter(u => !isDead(u) && u.side !== side);
    else if (spec === 'all_allies') targets = battle.units.filter(u => !isDead(u) && u.side === side);
    else if (ctx.targetUnit && area === 0) targets = [ctx.targetUnit];
    else if (ctx.hex) targets = areaUnits(battle, ctx.hex, area, filter);
    if (effect.type === 'summon') targets = [];

    const rng = rngOf(battle);
    switch (effect.type) {
      case 'damage': {
        const channel = effect.channel || 'physical';
        const fake = { id: ctx.id || 'spell', damage: effect.amount || 0, channel, range: ctx.range || 1, accuracy: 100, props: (effect.props || []).slice(), effects: [] };
        for (const t of targets) {
          const src = caster || { id: null, side, stats: { dmg: 0, dmgPct: 0, tags: [] }, statuses: [], passiveRules: {}, hp: 1, maxHp: 1, kills: 0, damageDealt: 0, _statusToken: 0 };
          const crit = caster ? rng.chance((C.CRIT_CHANCE + (effectsOf(caster).critChance || 0)) / 100) : false;
          const res = computeDamage(battle, src, t, fake, { crit, ranged: true, amount: effect.amount });
          const hit = { unitId: t.id, dmg: res.dmg, crit, channel: res.channel };
          if (res.dmg > 0) { const r = damageUnit(battle, t, res.dmg, res.channel, out, caster); if (r.killed) hit.killed = true; }
          if (effect.status) {
            const st = typeof effect.status === 'string' ? { id: effect.status, chance: effect.chance, duration: effect.duration } : effect.status;
            const ar = applyStatus(battle, t, st.id, st.duration, st.chance === undefined ? 100 : st.chance, out);
            if (ar.applied) hit.status = st.id; else if (ar.resisted) hit.resisted = true;
          }
          hits.push(hit);
        }
        break;
      }
      case 'heal': {
        for (const t of targets) {
          const e = effectsOf(t);
          const amt = Math.max(0, Math.round((effect.amount || 0) * (1 + (e.healPct || 0) / 100)));
          const real = Math.min(amt, t.maxHp - t.hp);
          if (real > 0) t.hp += real;
          const hit = { unitId: t.id, heal: real };
          if (effect.cleanse) cleanse(battle, t, Array.isArray(effect.cleanse) ? effect.cleanse : null, out);
          if (effect.status) {
            const st = typeof effect.status === 'string' ? { id: effect.status, chance: effect.chance, duration: effect.duration } : effect.status;
            const ar = applyStatus(battle, t, st.id, st.duration, st.chance === undefined ? 100 : st.chance, out);
            if (ar.applied) hit.status = st.id;
          }
          hits.push(hit);
        }
        break;
      }
      case 'status': case 'buff': case 'debuff': {
        const sid = typeof effect.status === 'string' ? effect.status : (effect.status && effect.status.id);
        for (const t of targets) {
          const hit = { unitId: t.id };
          if (effect.cleanse) cleanse(battle, t, Array.isArray(effect.cleanse) ? effect.cleanse : null, out);
          if (sid) {
            const ar = applyStatus(battle, t, sid, effect.duration, effect.chance === undefined ? 100 : effect.chance, out);
            if (ar.applied) hit.status = sid; else if (ar.resisted) hit.resisted = true;
          } else if (effect.stat) {
            // temporary raw stat buff (e.g. sprint: mp +2 for a turn)
            if (effect.stat === 'mp') t.mp = clamp(t.mp + (effect.value || 0), 0, C.MP_MAX + 8);
            else if (effect.stat === 'ap') t.ap = clamp(t.ap + (effect.value || 0), 0, 6);
            hit.stat = effect.stat;
          }
          hits.push(hit);
        }
        break;
      }
      case 'cleanse': {
        for (const t of targets) { const n = cleanse(battle, t, effect.statuses || null, out); hits.push({ unitId: t.id, cleansed: n }); }
        break;
      }
      case 'teleport': {
        const t = ctx.targetUnit || caster;
        if (t && ctx.hex && !unitAt(battle, ctx.hex.col, ctx.hex.row) && !blocksMove(battle, t, ctx.hex.col, ctx.hex.row)) {
          t.col = ctx.hex.col; t.row = ctx.hex.row; bumpPositions(battle);
          out.push({ type: 'teleport', unitId: t.id, to: { col: t.col, row: t.row } });
          hits.push({ unitId: t.id, teleported: true });
        }
        break;
      }
      case 'push': {
        const dist = effect.distance || 1;
        for (const t of targets) {
          if (!caster) break;
          const d = Hex().dirTo(caster.col, caster.row, t.col, t.row);
          const path = [];
          for (let i = 0; i < dist; i++) {
            const n = Hex().neighbor(t.col, t.row, d);
            if (blocksMove(battle, t, n.col, n.row) || unitAt(battle, n.col, n.row)) break;
            t.col = n.col; t.row = n.row; path.push({ col: n.col, row: n.row }); bumpPositions(battle);
          }
          if (path.length) out.push({ type: 'push', unitId: t.id, path });
          hits.push({ unitId: t.id, pushed: path.length });
        }
        break;
      }
      case 'dispel': {
        for (const t of targets) {
          let n = 0;
          for (const s of t.statuses.slice()) { const d = statusDef(s.id); if (!d || d.cleansable === false) continue; removeStatus(t, s.id); n++; out.push({ type: 'status', unitId: t.id, status: s.id, removed: true }); }
          hits.push({ unitId: t.id, dispelled: n });
        }
        break;
      }
      case 'summon': {
        const id = effect.unit;
        const count = effect.count || 1;
        for (let i = 0; i < count; i++) {
          const spot = freeHexNear(battle, ctx.hex || (caster ? { col: caster.col, row: caster.row } : null));
          if (!spot) break;
          const bu = summonUnit(battle, side, id, spot, caster);
          if (!bu) break;
          out.push({ type: 'summon', unitId: bu.id, hex: { col: bu.col, row: bu.row } });
          hits.push({ unitId: bu.id, summoned: true });
        }
        break;
      }
      case 'resurrect': {
        const dead = battle.units.filter(u => u.dead && u.side === side && !u.resurrected);
        const t = dead[0];
        if (t) {
          t.dead = false; t.resurrected = true;
          t.hp = Math.max(1, Math.round(t.maxHp * ((effect.hpPct || 50) / 100)));
          t.statuses.length = 0; touchStatuses(t);
          const spot = freeHexNear(battle, ctx.hex || { col: t.col, row: t.row });
          if (spot) { t.col = spot.col; t.row = spot.row; }
          bumpPositions(battle);
          out.push({ type: 'summon', unitId: t.id, hex: { col: t.col, row: t.row } });
          hits.push({ unitId: t.id, resurrected: true });
        }
        break;
      }
      default:
        // 'special' and anything unknown: no-op (graceful per SPEC §3.0.1)
        break;
    }
    return hits;
  }

  function freeHexNear(battle, hex) {
    if (!hex) return null;
    for (const p of Hex().spiral(hex.col, hex.row, 3)) {
      if (!inField(battle, p.col, p.row)) continue;
      if (unitAt(battle, p.col, p.row)) continue;
      const h = battle.hexes[idxOf(battle, p.col, p.row)];
      if (!h || h.obstacle) continue;
      if (wallAt(battle, p.col, p.row)) continue;
      return { col: p.col, row: p.row };
    }
    return null;
  }
  function summonUnit(battle, side, typeId, spot, caster) {
    const type = get('units', typeId);
    if (!type) return null;
    let maxId = 0;
    for (const u of battle.units) if (u.id > maxId) maxId = u.id;
    const stats = Combat.baseStats(gameOf(battle), { typeId, custom: type, rank: 0 });
    const bu = makeBattleUnit(battle, gameOf(battle), null, side, maxId + 1, stats);
    bu.col = spot.col; bu.row = spot.row;
    bu.summoned = true;
    bu.owner = battle.sidePlayers[side];
    bu.facing = side === 0 ? 0 : 3;
    bu.ap = 0; bu.hasActed = true;
    battle.units.push(bu);
    bumpPositions(battle);
    return bu;
  }

  // ================================================================ actions
  /** Everything `unitId` may legally do right now (SPEC §5 action shapes). */
  Combat.actions = function (battle, unitId) {
    const u = Combat.unit(battle, unitId);
    const out = [];
    if (!u || isDead(u) || battle.winner !== null) return out;
    if (u.side !== battle.side) return out;
    const e = effectsOf(u);
    if (e.flags.stunned) return out;
    // moves
    if (u.ap > 0 && !isRooted(u)) {
      for (const [, r] of Combat.reachable(battle, u.id)) {
        out.push({ type: 'move', unitId: u.id, hex: { col: r.col, row: r.row }, apCost: r.apCost, cost: r.cost, path: r.path });
      }
    }
    // attacks
    if (u.ap > 0) {
      for (const a of attacksOf(u)) {
        if (a.type === 'ranged' && e.flags.silenced && (a.props || []).indexOf('magic') >= 0) continue;
        for (const t of battle.units) {
          if (!canTarget(battle, u, a, t)) continue;
          out.push({ type: 'attack', unitId: u.id, attackId: a.id, target: t.id, hex: { col: t.col, row: t.row }, kind: a.type === 'ranged' ? 'ranged' : 'melee', range: attackRange(u, a) });
        }
        // wall / gate attacks in a siege
        if (battle.walls && a.type !== 'ranged') {
          for (const w of battle.walls) {
            if (w.hp <= 0) continue;
            if (Hex().dist(u.col, u.row, w.col, w.row) > attackRange(u, a)) continue;
            out.push({ type: 'attack', unitId: u.id, attackId: a.id, target: null, wall: { col: w.col, row: w.row }, hex: { col: w.col, row: w.row }, kind: 'melee' });
          }
        }
      }
    }
    // abilities
    for (const id of u.stats.abilities || []) {
      const ab = get('abilities', id);
      if (!ab || ab.kind === 'passive') continue;
      if (u.cooldowns[id]) continue;
      if ((ab.ap || 0) > u.ap) continue;
      if (e.flags.silenced) continue;
      const eff = ab.effect || {};
      const rng = ab.range === undefined ? 1 : ab.range;
      const hostile = ab.target === 'enemy' || eff.type === 'damage';
      if (ab.target === 'self' || (rng === 0 && ab.area)) {
        out.push({ type: 'ability', unitId: u.id, abilityId: id, target: u.id, hex: { col: u.col, row: u.row }, hostile, area: ab.area || 0 });
        continue;
      }
      for (const t of battle.units) {
        if (isDead(t)) continue;
        if (hostile && t.side === u.side) continue;
        if (!hostile && ab.target === 'ally' && t.side !== u.side) continue;
        if (Hex().dist(u.col, u.row, t.col, t.row) > Math.max(1, rng)) continue;
        if (rng > 1 && Combat.lineOfSight(battle, u, t).blocked) continue;
        out.push({ type: 'ability', unitId: u.id, abilityId: id, target: t.id, hex: { col: t.col, row: t.row }, hostile, area: ab.area || 0 });
      }
    }
    // defend / wait
    if (u.ap > 0) out.push({ type: 'defend', unitId: u.id });
    out.push({ type: 'wait', unitId: u.id });
    // side spells (one per side per round, paid in combat casting points)
    const side = battle.sides[u.side];
    if (side && !side.castThisRound) {
      for (const sid of side.spells || []) {
        const sp = get('spells', sid);
        if (!sp) continue;
        const cost = (sp.cost && sp.cost.cp) || 0;
        if (cost > side.cp) continue;
        const spec = sp.target || 'enemy_unit';
        if (spec === 'all_enemies' || spec === 'all_allies') { out.push({ type: 'cast', unitId: u.id, side: u.side, spellId: sid, target: null, hex: { col: u.col, row: u.row } }); continue; }
        for (const t of battle.units) {
          if (isDead(t)) continue;
          if (spec === 'enemy_unit' && t.side === u.side) continue;
          if (spec === 'ally_unit' && t.side !== u.side) continue;
          out.push({ type: 'cast', unitId: u.id, side: u.side, spellId: sid, target: t.id, hex: { col: t.col, row: t.row } });
        }
      }
    }
    if (Combat.canRetreat(battle, u.side)) out.push({ type: 'retreat', unitId: u.id, side: u.side });
    return out;
  };

  Combat.canRetreat = function (battle, side) {
    return battle.round >= (battle.retreatAllowedFromRound || C.RETREAT_ROUND) && battle.winner === null && !battle.sides[side].retreated;
  };

  // ================================================================ perform
  /** Execute one action from `Combat.actions` and return the events it produced. */
  Combat.perform = function (battle, action) {
    const out = [];
    if (!action || battle.winner !== null) return out;
    const u = Combat.unit(battle, action.unitId);
    switch (action.type) {
      case 'move': return doMove(battle, u, action, out);
      case 'attack': return doAttack(battle, u, action, out);
      case 'ability': return doAbility(battle, u, action, out);
      case 'defend': return doDefend(battle, u, out);
      case 'wait': return doWait(battle, u, out);
      case 'cast': return doCast(battle, action, out);
      case 'retreat': return Combat.retreat(battle, action.side === undefined ? (u ? u.side : battle.side) : action.side);
      case 'endTurn': return Combat.endUnitTurn(battle, action.unitId);
      default: return out;
    }
  };

  function doMove(battle, u, action, out) {
    if (!u || isDead(u) || u.ap <= 0 || isRooted(u)) return out;
    const hex = toHex(battle, action.hex || action.to || action.target);
    if (!hex) return out;
    const reach = Combat.reachable(battle, u.id);
    const r = reach.get(hexKey(hex.col, hex.row));
    if (!r) return out;
    const from = { col: u.col, row: u.row };
    const path = action.path && action.path.length ? action.path.map(p => toHex(battle, p)).filter(Boolean) : r.path;
    u.col = hex.col; u.row = hex.row;
    bumpPositions(battle);
    u.moved += path.length;
    u.ap = Math.max(0, u.ap - r.apCost);
    if (path.length) {
      const prev = path.length > 1 ? path[path.length - 2] : from;
      u.facing = Hex().dirTo(prev.col, prev.row, u.col, u.row);
    }
    out.push({
      type: action.flee ? 'flee' : 'move', unitId: u.id, from, path, apCost: r.apCost,
      charge: path.length >= C.CHARGE_DIST && (hasPassive(u, 'charge') || hasPassive(u, 'cavalry_charge')),
    });
    log(battle, 'move', { unitId: u.id, to: hexKey(hex.col, hex.row) });
    // trample: damage enemies the unit ends next to
    const tr = passive(u, 'trample');
    if (tr) for (const o of battle.units) if (!isDead(o) && o.side !== u.side && Hex().dist(u.col, u.row, o.col, o.row) === 1) {
      let amt = 0; for (const p of tr) amt += p.amount || 6;
      const res = damageUnit(battle, o, amt, 'physical', out, u);
      if (res.dmg) out.push({ type: 'damage', target: o.id, unitId: o.id, channel: 'physical', hits: [{ dmg: res.dmg, channel: 'physical' }] });
    }
    if (u.ap <= 0) out.push.apply(out, Combat.endUnitTurn(battle, u.id));
    return out;
  }
  function doAttack(battle, u, action, out) {
    if (!u || isDead(u) || u.ap <= 0) return out;
    const attack = findAttack(u, action.attackId);
    // wall / gate
    if (action.wall) {
      const w = wallAt(battle, action.wall.col, action.wall.row);
      if (!w) return out;
      faceToward(u, w.col, w.row);
      // battering a wall costs the whole activation, so it lands one blow per remaining AP
      const mult = hasPassive(u, 'siege_breaker') || (attack.props || []).indexOf('siege') >= 0 ? 2.5 : 1;
      const dmg = Math.round((attack.damage || 10) * mult * (attack.repeat || 1) * Math.max(1, u.ap));
      damageWall(battle, w, dmg, out);
      u.ap = 0;
      out.push.apply(out, Combat.endUnitTurn(battle, u.id));
      return out;
    }
    const tgt = Combat.unit(battle, action.target);
    if (!tgt || !canTarget(battle, u, attack, tgt)) return out;
    faceToward(u, tgt.col, tgt.row);
    const melee = attack.type !== 'ranged' && Hex().dist(u.col, u.row, tgt.col, tgt.row) <= 1;
    const charge = melee && u.moved >= C.CHARGE_DIST && (hasPassive(u, 'charge') || hasPassive(u, 'cavalry_charge') || (attack.props || []).indexOf('charge') >= 0);
    const braced = hasPassive(tgt, 'pike_brace');
    let chargeWorks = charge && !braced;
    if (chargeWorks && tgt.defending) { tgt.defending = false; removeStatus(tgt, 'fortified'); touchStatuses(tgt); }
    const noRetal = (attack.props || []).indexOf('no_retaliation') >= 0 || chargeWorks;
    // first strike / pike brace retaliate before the blow lands
    let retaliated = false;
    if (melee && canRetaliate(battle, tgt, u, { noRetaliation: false }) &&
      (hasPassive(tgt, 'first_strike') || (braced && charge))) {
      tgt.retaliations--;
      resolveAttack(battle, tgt, u, meleeAttackOf(tgt), out, { retaliation: true, braced: braced && charge });
      retaliated = true;
      tgt.hasRetaliation = tgt.retaliations > 0;
    }
    if (!isDead(u)) {
      resolveAttack(battle, u, tgt, attack, out, { charge: chargeWorks, braced: false });
    }
    // normal retaliation
    if (!retaliated && melee && !noRetal && !isDead(tgt) && !isDead(u) && canRetaliate(battle, tgt, u, {})) {
      tgt.retaliations--;
      tgt.hasRetaliation = tgt.retaliations > 0;
      resolveAttack(battle, tgt, u, meleeAttackOf(tgt), out, { retaliation: true });
    }
    u.ap = 0;
    out.push.apply(out, Combat.endUnitTurn(battle, u.id));
    return out;
  }

  function doAbility(battle, u, action, out) {
    if (!u || isDead(u)) return out;
    const ab = get('abilities', action.abilityId);
    if (!ab) return out;
    if ((ab.ap || 0) > u.ap) return out;
    if (u.cooldowns[ab.id]) return out;
    const tgtUnit = action.target !== undefined && action.target !== null ? Combat.unit(battle, action.target) : null;
    const hex = toHex(battle, action.hex) || (tgtUnit ? { col: tgtUnit.col, row: tgtUnit.row } : { col: u.col, row: u.row });
    if (tgtUnit) faceToward(u, tgtUnit.col, tgtUnit.row);
    const eff = ab.effect || {};
    const area = eff.area !== undefined ? eff.area : (ab.area || 0);
    const spec = ab.target === 'enemy' ? 'enemy_unit' : ab.target === 'ally' ? 'ally_unit' : ab.target === 'self' ? 'self' : 'any';
    const ev = {
      type: 'ability', caster: u.id, unitId: u.id, abilityId: ab.id, name: L(ab.name) || ab.id,
      channel: eff.channel || null, area: typeof area === 'number' ? area : 0,
      hex: { col: hex.col, row: hex.row }, target: tgtUnit ? tgtUnit.id : null, hits: [], killed: [],
    };
    let hits = [];
    if (ab.kind === 'attack' || eff.type === 'damage') {
      const fake = {
        id: ab.id, name: ab.name, type: eff.attackType === 'ranged' || eff.attackType === 'magic' ? 'ranged' : 'melee',
        damage: eff.amount || 0, channel: eff.channel || 'physical', range: eff.range || ab.range || 1,
        accuracy: eff.accuracy === undefined ? 100 : eff.accuracy, repeat: 1, strikes: 1,
        effects: eff.status ? [{ status: typeof eff.status === 'string' ? eff.status : eff.status.id, chance: eff.chance, duration: eff.duration }] : [],
        props: eff.props || [],
      };
      const targets = (typeof area === 'number' && area > 0)
        ? areaUnits(battle, hex, area, targetFilter(spec === 'any' ? 'enemy_unit' : spec, u.side))
        : (tgtUnit ? [tgtUnit] : []);
      for (const t of targets) {
        if (!t || isDead(t)) continue;
        const sub = [];
        const aev = resolveAttack(battle, u, t, fake, sub, { noRetaliation: true });
        for (const s of sub) if (s.type !== 'attack' && s.type !== 'retaliate') out.push(s);
        const dmg = (aev.hits || []).reduce((a, h) => a + (h.dmg || 0), 0);
        const hit = { unitId: t.id, dmg, channel: fake.channel, crit: (aev.hits || []).some(h => h.crit), miss: dmg === 0 && (aev.hits || []).every(h => h.miss) };
        const stHit = (aev.hits || []).find(h => h.status);
        if (stHit) hit.status = stHit.status;
        if (isDead(t)) { hit.killed = true; ev.killed.push(t.id); }
        hits.push(hit);
      }
    } else {
      hits = applyEffect(battle, u, eff, { side: u.side, hex, targetUnit: tgtUnit, targetSpec: spec, area: typeof area === 'number' ? area : 0, id: ab.id, range: ab.range }, out);
      for (const h of hits) if (h.killed) ev.killed.push(h.unitId);
    }
    ev.hits = hits;
    if (ab.id === 'defend' || (eff.status === 'fortified')) { u.defending = true; touchStatuses(u); }
    if (ab.cooldown) u.cooldowns[ab.id] = ab.cooldown + 1;
    out.push(ev);
    log(battle, 'ability', { unitId: u.id, abilityId: ab.id });
    u.ap = Math.max(0, u.ap - (ab.ap || 0));
    if (u.ap <= 0) out.push.apply(out, Combat.endUnitTurn(battle, u.id));
    return out;
  }

  function doDefend(battle, u, out) {
    if (!u || isDead(u)) return out;
    u.defending = true;
    touchStatuses(u);
    applyStatus(battle, u, 'fortified', 2, 100, null);   // 2 turns so it survives this turn's end-of-turn tick
    out.push({ type: 'defend', unitId: u.id });
    log(battle, 'defend', { unitId: u.id });
    u.ap = 0;
    out.push.apply(out, Combat.endUnitTurn(battle, u.id));
    return out;
  }
  function doWait(battle, u, out) {
    if (!u) return out;
    out.push({ type: 'wait', unitId: u.id });
    out.push.apply(out, Combat.endUnitTurn(battle, u.id));
    return out;
  }

  function doCast(battle, action, out) {
    const side = battle.sides[action.side === undefined ? battle.side : action.side];
    if (!side || side.castThisRound) return out;
    const sp = get('spells', action.spellId);
    if (!sp || sp.kind !== 'combat') return out;
    const cost = (sp.cost && sp.cost.cp) || 0;
    if (cost > side.cp) return out;
    const caster = action.casterId !== undefined && action.casterId !== null ? Combat.unit(battle, action.casterId) : null;
    const tgtUnit = action.target !== undefined && action.target !== null ? Combat.unit(battle, action.target) : null;
    const spec = sp.target || 'enemy_unit';
    if (tgtUnit) {
      if (isDead(tgtUnit)) return out;
      if (spec === 'ally_unit' && tgtUnit.side !== side.side) return out;
      if (spec === 'enemy_unit' && tgtUnit.side === side.side) return out;
    }
    const hex = toHex(battle, action.hex) || (tgtUnit ? { col: tgtUnit.col, row: tgtUnit.row } : null);
    const eff = sp.effect || {};
    const area = eff.area !== undefined ? eff.area : (sp.area || 0);
    side.cp -= cost;
    battle.cp[side.side] = side.cp;
    side.castThisRound = true;
    (battle.spellsCast[side.side] = battle.spellsCast[side.side] || []).push(sp.id);
    const affinity = sp.affinity && typeof sp.affinity === 'object' ? Object.keys(sp.affinity)[0] : (sp.affinity || null);
    const ev = {
      type: 'spell', side: side.side, caster: caster ? caster.id : null, spellId: sp.id, name: L(sp.name) || sp.id,
      affinity, channel: eff.channel || null, area: typeof area === 'number' ? area : 0,
      hex: hex ? { col: hex.col, row: hex.row } : null, target: tgtUnit ? tgtUnit.id : null, hits: [], killed: [],
    };
    const hits = applyEffect(battle, caster, eff, {
      side: side.side, hex, targetUnit: tgtUnit, targetSpec: spec,
      area: typeof area === 'number' ? area : 0, id: sp.id, range: sp.range,
    }, out);
    for (const h of hits) if (h.killed) ev.killed.push(h.unitId);
    ev.hits = hits;
    out.push(ev);
    log(battle, 'spell', { spellId: sp.id, side: side.side, cp: side.cp });
    if (AOW.Events) AOW.Events.emit('spell:cast', { pid: side.owner, spellId: sp.id, target: ev.hex });
    checkWinner(battle, out);
    return out;
  }

  /** Whole side breaks off the engagement (allowed from round `retreatAllowedFromRound`). */
  Combat.retreat = function (battle, side) {
    const out = [];
    if (!Combat.canRetreat(battle, side)) return out;
    battle.sides[side].retreated = true;
    for (const u of battle.units) if (u.side === side && !isDead(u)) { u.fled = true; u.retreated = true; }
    log(battle, 'retreat', { side });
    checkWinner(battle, out);
    return out;
  };

  // ================================================================ preview
  /** Damage/accuracy preview used by the renderer's hover tooltip. */
  Combat.previewAttack = function (battle, attackerId, targetId, attackId) {
    const a = Combat.unit(battle, attackerId), t = Combat.unit(battle, targetId);
    if (!a || !t || isDead(a) || isDead(t) || a.side === t.side) return null;
    let attack = null;
    if (attackId && get('abilities', attackId)) {
      const ab = get('abilities', attackId), eff = ab.effect || {};
      attack = { id: ab.id, type: eff.attackType === 'ranged' ? 'ranged' : 'melee', damage: eff.amount || 0, channel: eff.channel || 'physical', range: ab.range || 1, accuracy: 100, props: eff.props || [], effects: [], repeat: 1 };
    } else attack = findAttack(a, attackId);
    const fl = flankOf(battle, a, t);
    const ranged = attack.type === 'ranged' || Hex().dist(a.col, a.row, t.col, t.row) > 1;
    const hc = hitChance(battle, a, t, attack, { ranged, flank: fl.flank, rear: fl.rear });
    const normal = computeDamage(battle, a, t, attack, { flank: fl.flank, rear: fl.rear, ranged });
    const crit = computeDamage(battle, a, t, attack, { crit: true, flank: fl.flank, rear: fl.rear, ranged });
    const graze = computeDamage(battle, a, t, attack, { graze: true, flank: fl.flank, rear: fl.rear, ranged });
    const strikes = attack.repeat && attack.repeat > 1 ? Math.min(attack.repeat, Math.max(1, a.ap)) : 1;
    const avg = normal.dmg * strikes * (hc / 100);
    return {
      min: graze.dmg * strikes, max: crit.dmg * strikes, avg: Math.round(avg), damage: normal.dmg * strikes,
      inRange: canTarget(battle, a, attack, t), attackId: attack.id,
      hit: hc, crit: C.CRIT_CHANCE + (a.stats.critChance || 0), strikes,
      flank: fl.flank, rear: fl.rear, channel: normal.channel,
      kill: normal.dmg * strikes >= t.hp, lethal: crit.dmg * strikes >= t.hp,
      retaliation: !ranged && canRetaliate(battle, t, a, {}),
    };
  };

  // ================================================================ tactical AI
  const ROLE_VALUE = { mage: 1.55, ranged: 1.4, support: 1.5, siege: 1.3, skirmisher: 1.1, hero: 1.6, shock: 1.15, cavalry: 1.15, shield: 0.8, pike: 0.9, fighter: 1, polearm: 1, scout: 1.1 };
  function targetValue(t) {
    let v = ROLE_VALUE[t.role] === undefined ? 1 : ROLE_VALUE[t.role];
    v *= 1 + (t.tier || 1) * 0.12;
    if (t.hero) v *= 1.3;
    if (t.hp / t.maxHp < 0.4) v *= 1.25;                     // focus fire on the wounded
    return v;
  }
  function threatOfUnit(u) {
    let dmg = 0;
    for (const a of attacksOf(u)) dmg = Math.max(dmg, (a.damage || 0) * (a.repeat || 1));
    return (u.hp * 0.5 + dmg * 3) * (1 + (u.stats.def || 0) * 0.06 + (u.stats.res || 0) * 0.06);
  }
  function sideStrength(battle, side) {
    let s = 0;
    for (const u of battle.units) if (u.side === side && !isDead(u) && !u.fled) s += threatOfUnit(u);
    return s;
  }
  function adjacentEnemies(battle, side, col, row) {
    let n = 0;
    for (let d = 0; d < 6; d++) {
      const p = Hex().neighbor(col, row, d);
      const o = unitAt(battle, p.col, p.row);
      if (o && !isDead(o) && o.side !== side) n++;
    }
    return n;
  }
  /** Expected value of `u` attacking `t` with `attack` while standing on (col,row). */
  function scoreAttack(battle, u, t, attack, col, row, apAfter) {
    const oc = u.col, or_ = u.row, oap = u.ap;
    u.col = col; u.row = row; u.ap = Math.max(1, apAfter);
    let score = -Infinity;
    if (canTarget(battle, u, attack, t)) {
      const ranged = attack.type === 'ranged' || Hex().dist(col, row, t.col, t.row) > 1;
      const fl = flankOf(battle, u, t);
      const charge = !ranged && Hex().dist(oc, or_, col, row) >= C.CHARGE_DIST && (hasPassive(u, 'charge') || hasPassive(u, 'cavalry_charge'));
      const hc = hitChance(battle, u, t, attack, { ranged, flank: fl.flank, rear: fl.rear });
      const d = computeDamage(battle, u, t, attack, { flank: fl.flank, rear: fl.rear, ranged, charge: charge && !hasPassive(t, 'pike_brace') });
      const strikes = attack.repeat && attack.repeat > 1 ? Math.min(attack.repeat, Math.max(1, apAfter)) : 1;
      const expected = d.dmg * strikes * (hc / 100);
      score = expected * C.AI_DMG_W * targetValue(t);
      if (expected >= t.hp) score += C.AI_KILL_BONUS * targetValue(t);
      else if (t.hp - expected < t.maxHp * 0.2) score += C.AI_FOCUS_W;
      // retaliation risk
      if (!ranged && canRetaliate(battle, t, u, {}) && !(charge && !hasPassive(t, 'pike_brace'))) {
        const ra = meleeAttackOf(t);
        const rd = computeDamage(battle, t, u, ra, { ranged: false });
        score -= rd.dmg * C.AI_RISK_W * (u.hp < rd.dmg * 2 ? 2.5 : 1);
      }
      // exposure at the destination
      const exposure = adjacentEnemies(battle, u.side, col, row) - (Hex().dist(oc, or_, col, row) > 0 ? 0 : 0);
      if (u.role === 'ranged' || u.role === 'mage' || u.role === 'support') score -= exposure * 60;
      else score -= Math.max(0, exposure - 1) * 18;
      if (ranged && u.role === 'ranged') score += 20;
      if (fl.rear) score += 30; else if (fl.flank) score += 15;
    }
    u.col = oc; u.row = or_; u.ap = oap;
    return score;
  }

  function aiHealAction(battle, u) {
    let best = null;
    for (const id of u.stats.abilities || []) {
      const ab = get('abilities', id);
      if (!ab || ab.kind === 'passive' || u.cooldowns[id] || (ab.ap || 0) > u.ap) continue;
      const eff = ab.effect || {};
      if (eff.type !== 'heal' && !(eff.type === 'status' && ab.target === 'ally')) continue;
      const range = Math.max(0, ab.range === undefined ? 1 : ab.range);
      for (const t of battle.units) {
        if (isDead(t) || t.side !== u.side) continue;
        if (Hex().dist(u.col, u.row, t.col, t.row) > Math.max(range, ab.area || 0)) continue;
        let score = 0;
        if (eff.type === 'heal') {
          const missing = t.maxHp - t.hp;
          if (missing < 8) continue;
          score = Math.min(missing, eff.amount || 20) * 3.4 * targetValue(t);
        } else {
          const sid = typeof eff.status === 'string' ? eff.status : (eff.status && eff.status.id);
          if (!sid || findStatus(t, sid)) continue;
          score = 60 * targetValue(t);
        }
        if (!best || score > best.score) best = { score, action: { type: 'ability', unitId: u.id, abilityId: id, target: t.id, hex: { col: t.col, row: t.row } } };
      }
    }
    return best;
  }
  function aiOffensiveAbility(battle, u, enemies) {
    let best = null;
    for (const id of u.stats.abilities || []) {
      const ab = get('abilities', id);
      if (!ab || ab.kind === 'passive' || u.cooldowns[id] || (ab.ap || 0) > u.ap) continue;
      const eff = ab.effect || {};
      const hostile = ab.target === 'enemy' || eff.type === 'damage';
      if (!hostile) continue;
      if (isSilenced(u)) continue;
      const range = Math.max(1, ab.range === undefined ? 1 : ab.range);
      const area = typeof (eff.area !== undefined ? eff.area : ab.area) === 'number' ? (eff.area !== undefined ? eff.area : ab.area) : 0;
      for (const t of enemies) {
        if (Hex().dist(u.col, u.row, t.col, t.row) > range) continue;
        if (range > 1 && Combat.lineOfSight(battle, u, t).blocked) continue;
        let score = 0;
        if (eff.type === 'damage' || ab.kind === 'attack') {
          const targets = area > 0 ? areaUnits(battle, { col: t.col, row: t.row }, area, o => true) : [t];
          for (const x of targets) {
            const fake = { id: ab.id, type: 'ranged', damage: eff.amount || 0, channel: eff.channel || 'physical', accuracy: 100, props: eff.props || [], effects: [], range };
            const d = computeDamage(battle, u, x, fake, { ranged: true });
            score += (x.side === u.side ? -2.2 : C.AI_DMG_W) * d.dmg * targetValue(x);
            if (x.side !== u.side && d.dmg >= x.hp) score += C.AI_KILL_BONUS * 0.8;
          }
        } else {
          const sid = typeof eff.status === 'string' ? eff.status : (eff.status && eff.status.id);
          if (!sid || findStatus(t, sid)) continue;
          score = 70 * targetValue(t);
        }
        score += (ab.cooldown || 0) * 5;                     // cooldown abilities are worth using
        if (!best || score > best.score) best = { score, action: { type: 'ability', unitId: u.id, abilityId: id, target: t.id, hex: { col: t.col, row: t.row } } };
      }
    }
    return best;
  }

  /** One side spell per round, chosen greedily (damage clusters, heals, buffs). */
  function aiCast(battle, side) {
    const s = battle.sides[side];
    if (!s || s.castThisRound || !s.spells || !s.spells.length) return null;
    const enemies = aliveOf(battle, 1 - side), allies = aliveOf(battle, side);
    if (!enemies.length) return null;
    let best = null;
    for (const sid of s.spells) {
      const sp = get('spells', sid);
      if (!sp) continue;
      const cost = (sp.cost && sp.cost.cp) || 0;
      if (cost > s.cp) continue;
      const eff = sp.effect || {};
      const area = typeof (eff.area !== undefined ? eff.area : sp.area) === 'number' ? (eff.area !== undefined ? eff.area : sp.area) : 0;
      const spec = sp.target || 'enemy_unit';
      const pool = spec === 'ally_unit' || spec === 'all_allies' ? allies : enemies;
      for (const t of pool) {
        let score = 0;
        if (eff.type === 'damage') {
          const targets = area > 0 ? areaUnits(battle, { col: t.col, row: t.row }, area, () => true) : [t];
          for (const x of targets) {
            const fake = { id: sp.id, damage: eff.amount || 0, channel: eff.channel || 'physical', accuracy: 100, props: [], effects: [] };
            const d = computeDamage(battle, null2unit(battle, side), x, fake, { ranged: true });
            score += (x.side === side ? -3 : 3) * d.dmg * targetValue(x);
            if (x.side !== side && d.dmg >= x.hp) score += 500;
          }
        } else if (eff.type === 'heal') {
          const missing = t.maxHp - t.hp;
          if (missing < 10) continue;
          score = Math.min(missing, eff.amount || 20) * 3 * targetValue(t);
        } else if (eff.type === 'status') {
          const statusId = typeof eff.status === 'string' ? eff.status : (eff.status && eff.status.id);
          if (!statusId || findStatus(t, statusId)) continue;
          score = 80 * targetValue(t);
        } else if (eff.type === 'summon') score = 180;
        else if (eff.type === 'resurrect') score = battle.units.some(x => x.dead && x.side === side) ? 260 : 0;
        else continue;
        score -= cost * 4;
        if (score > 60 && (!best || score > best.score)) {
          best = { score, action: { type: 'cast', side, spellId: sid, target: t.id, hex: { col: t.col, row: t.row } } };
        }
      }
    }
    return best ? best.action : null;
  }
  const NULL_UNITS = {};
  function null2unit(battle, side) {
    // a stand-in caster so computeDamage can read stats for side spells with no unit caster
    if (!NULL_UNITS[side]) NULL_UNITS[side] = { id: null, side, hp: 1, maxHp: 1, kills: 0, damageDealt: 0, statuses: [], passiveRules: {}, defending: false, moraleBand: 'steady', stats: { dmg: 0, dmgPct: 0, tags: [], def: 0, res: 0, statusRes: {}, attacks: [] }, _statusToken: 0 };
    return NULL_UNITS[side];
  }

  function aiFlee(battle, u) {
    const reach = Combat.reachable(battle, u.id);
    let best = null;
    const enemies = aliveOf(battle, 1 - u.side);
    for (const [, r] of reach) {
      let d = 0;
      for (const e of enemies) d += Hex().dist(r.col, r.row, e.col, e.row);
      const score = d - r.apCost * 0.5;
      if (!best || score > best.score) best = { score, r };
    }
    if (!best) return { type: 'defend', unitId: u.id };
    return { type: 'move', unitId: u.id, hex: { col: best.r.col, row: best.r.row }, path: best.r.path, flee: true };
  }

  /** Flood fill of walkable hexes from one hex (units ignored, standing walls block) — one BFS per wall state. */
  function floodFrom(battle, col, row) {
    const seen = new Set([hexKey(col, row)]);
    const q = [{ col, row }];
    while (q.length) {
      const cur = q.pop();
      for (let d = 0; d < 6; d++) {
        const n = Hex().neighbor(cur.col, cur.row, d);
        if (!inField(battle, n.col, n.row)) continue;
        const k = hexKey(n.col, n.row);
        if (seen.has(k)) continue;
        const h = battle.hexes[idxOf(battle, n.col, n.row)];
        if (!h || h.obstacle || wallAt(battle, n.col, n.row)) continue;
        seen.add(k); q.push(n);
      }
    }
    return seen;
  }
  /** Is `u` sealed off from `anchor` by the walls? (cached per round + wall state) */
  function siegeCutOff(battle, u, anchor) {
    const key = battle.round + ':' + (battle.walls ? battle.walls.filter(w => w.hp > 0).length : 0);
    if (battle._sgKey !== key || !battle._sgSet) {
      battle._sgKey = key;
      battle._sgSet = floodFrom(battle, anchor.col, anchor.row);
    }
    return !battle._sgSet.has(hexKey(u.col, u.row));
  }

  function aiApproach(battle, u, enemies) {
    const reach = Combat.reachable(battle, u.id);
    const ranged = u.role === 'ranged' || u.role === 'mage' || u.role === 'siege';
    let maxRange = 1;
    for (const a of attacksOf(u)) maxRange = Math.max(maxRange, attackRange(u, a));
    const want = ranged ? Math.max(2, Math.min(maxRange, 4)) : 1;
    // most valuable reachable enemy
    let prime = null, primeScore = -Infinity;
    for (const e of enemies) {
      const sc = targetValue(e) * 100 - Hex().dist(u.col, u.row, e.col, e.row) * 6;
      if (sc > primeScore) { primeScore = sc; prime = e; }
    }
    if (!prime) return { type: 'defend', unitId: u.id };
    // siege: if the walls cut the unit off from the enemy, head for the weakest segment instead
    if (battle.walls && u.side === 0 && !isFlyer(u)) {
      const standing = battle.walls.filter(w => w.hp > 0);
      if (standing.length && siegeCutOff(battle, u, prime)) {
        let wall = null, wscore = -Infinity;
        for (const w of standing) {
          const sc = -Hex().dist(u.col, u.row, w.col, w.row) * 8 - (w.hp / w.maxHp) * 60 + (w.gate ? 25 : 0);
          if (sc > wscore) { wscore = sc; wall = w; }
        }
        if (wall) prime = { col: wall.col, row: wall.row, side: 1, role: 'wall' };
      }
    }
    let best = null;
    const consider = (col, row, apCost, path) => {
      const d = Hex().dist(col, row, prime.col, prime.row);
      let score = -Math.abs(d - want) * 30;
      if (ranged) {
        const oc = u.col, or_ = u.row; u.col = col; u.row = row;
        const los = Combat.lineOfSight(battle, u, prime);
        u.col = oc; u.row = or_;
        if (!los.blocked && d <= maxRange) score += 120;
        score -= adjacentEnemies(battle, u.side, col, row) * 70;
      } else {
        score -= adjacentEnemies(battle, u.side, col, row) * 4;
        // keep shields/pikes in front of the squishy ones
        if (u.role === 'shield' || u.role === 'pike') score += 10;
      }
      const h = battle.hexes[idxOf(battle, col, row)];
      if (h && (h.feature === 'hills' || h.terrain === 'hills')) score += 8;
      score -= apCost * 2;
      if (!best || score > best.score) best = { score, col, row, path, apCost };
    };
    for (const [, r] of reach) consider(r.col, r.row, r.apCost, r.path);
    if (!best) return { type: 'defend', unitId: u.id };
    if (best.col === u.col && best.row === u.row) return { type: 'defend', unitId: u.id };
    return { type: 'move', unitId: u.id, hex: { col: best.col, row: best.row }, path: best.path };
  }

  /** Pick the best single action for `u` (kill potential, focus fire, risk, positioning, morale). */
  function aiChooseAction(battle, u) {
    const enemies = aliveOf(battle, 1 - u.side);
    if (!enemies.length) return { type: 'wait', unitId: u.id };
    const e = effectsOf(u);
    if (e.flags.stunned) return { type: 'wait', unitId: u.id };
    if (u.moraleBand === 'broken' && !e.flags.immuneMorale) return aiFlee(battle, u);

    let best = { score: 0, action: null };
    const take = (score, action) => { if (action && score > best.score) best = { score, action }; };

    // support first: healing a badly hurt ally beats most attacks
    const heal = aiHealAction(battle, u);
    if (heal) take(heal.score, heal.action);
    const ability = aiOffensiveAbility(battle, u, enemies);
    if (ability) take(ability.score, ability.action);

    // attacks from where the unit stands
    for (const a of attacksOf(u)) {
      for (const t of enemies) {
        const sc = scoreAttack(battle, u, t, a, u.col, u.row, u.ap);
        if (isFinite(sc)) take(sc + 25, { type: 'attack', unitId: u.id, attackId: a.id, target: t.id, hex: { col: t.col, row: t.row } });
      }
    }
    // move then attack (only hexes from which something is actually in range)
    if (u.ap > 0 && !isRooted(u)) {
      const atks = attacksOf(u);
      let maxRange = 1;
      for (const a of atks) maxRange = Math.max(maxRange, attackRange(u, a));
      const reach = Combat.reachable(battle, u.id);
      for (const [, r] of reach) {
        const apAfter = u.ap - r.apCost;
        if (apAfter <= 0) continue;
        let near = false;
        for (const t of enemies) if (Hex().dist(r.col, r.row, t.col, t.row) <= maxRange) { near = true; break; }
        if (!near) continue;
        for (const a of atks) {
          const range = attackRange(u, a);
          for (const t of enemies) {
            if (Hex().dist(r.col, r.row, t.col, t.row) > range) continue;
            const sc = scoreAttack(battle, u, t, a, r.col, r.row, apAfter);
            if (!isFinite(sc)) continue;
            take(sc - r.apCost * 6, { type: 'moveAttack', unitId: u.id, move: { col: r.col, row: r.row }, path: r.path, attackId: a.id, target: t.id });
          }
        }
      }
    }
    // siege: the attackers batter the wall (a breach is what lets the rest of the army in)
    if (battle.walls && u.side === 0 && u.ap > 0) {
      for (const w of battle.walls) {
        if (w.hp <= 0) continue;
        if (Hex().dist(u.col, u.row, w.col, w.row) > 1) continue;
        take(150 + (w.gate ? 80 : 0) + (hasPassive(u, 'siege_breaker') ? 150 : 0) + (w.hp < w.maxHp * 0.4 ? 80 : 0),
          { type: 'attack', unitId: u.id, attackId: meleeAttackOf(u).id, wall: { col: w.col, row: w.row }, hex: { col: w.col, row: w.row } });
      }
    }
    if (best.action) return best.action;
    return aiApproach(battle, u, enemies);
  }

  /** One AI decision: returns the events it produced, or null when the battle is over. */
  Combat.aiStep = function (battle) {
    if (!battle || battle.winner !== null && battle.winner !== undefined) return null;
    const side = battle.sides[battle.side];
    // hopeless? break off instead of dying
    if (side && Combat.canRetreat(battle, battle.side)) {
      const mine = sideStrength(battle, battle.side), theirs = sideStrength(battle, 1 - battle.side);
      if (mine > 0 && theirs > mine * 4.5 && aliveOf(battle, battle.side).length <= 2) {
        const out = Combat.retreat(battle, battle.side);
        if (out.length) return out;
      }
    }
    // one side spell per round
    if (side && !side.castThisRound) {
      const cast = aiCast(battle, battle.side);
      if (cast) {
        const ev = Combat.perform(battle, cast);
        if (ev.length) return ev;
      }
      side.castThisRound = true;
    }
    const u = nextActor(battle);
    if (!u) {
      if (battle.winner !== null && battle.winner !== undefined) return null;
      const ev = Combat.endSideTurn(battle);
      return ev.length ? ev : (battle.winner !== null && battle.winner !== undefined ? null : [{ type: 'log', text: 'side' }]);
    }
    battle.activeUnitId = u.id;
    let out = [];
    let sub = 0;
    // a unit may chain actions while it still has AP (approach, then strike)
    while (sub++ < 4) {
      const action = aiChooseAction(battle, u);
      if (!action) break;
      let ev;
      if (action.type === 'moveAttack') {
        ev = Combat.perform(battle, { type: 'move', unitId: u.id, hex: action.move, path: action.path });
        if (!isDead(u) && u.ap > 0 && !u.hasActed) ev = ev.concat(Combat.perform(battle, { type: 'attack', unitId: u.id, attackId: action.attackId, target: action.target }));
      } else ev = Combat.perform(battle, action);
      out = out.concat(ev);
      if (!ev.length) break;                                   // refused: stop chaining
      if (isDead(u) || u.hasActed || u.ap <= 0) break;
      if (action.type === 'wait' || action.type === 'defend' || action.type === 'retreat') break;
      if (battle.winner !== null && battle.winner !== undefined) break;
    }
    if (!isDead(u) && !u.hasActed && battle.winner === null) out = out.concat(Combat.endUnitTurn(battle, u.id));
    return out;
  };

  /** Run aiStep until the acting side changes (or the battle ends). */
  Combat.aiTakeTurn = function (battle) {
    const out = [];
    const side = battle.side;
    let guard = 0;
    while (battle.winner === null && battle.side === side && guard++ < 400) {
      const ev = Combat.aiStep(battle);
      if (!ev) break;
      for (const x of ev) out.push(x);
    }
    return out;
  };

  // ================================================================ auto-resolve & finish
  /** Simulate the whole battle with the tactical AI (≤ 30 rounds; a stalemate goes to the defender), then finish. */
  Combat.autoResolve = function (game, battle) {
    if (game) setGame(battle, game);
    let guard = 0;
    while ((battle.winner === null || battle.winner === undefined) && battle.round <= C.MAX_ROUNDS && guard++ < 6000) {
      const ev = Combat.aiStep(battle);
      if (!ev) break;
    }
    if (battle.winner === null || battle.winner === undefined) { battle.winner = 1; battle.stalemate = true; }
    battle.autoResolved = true;
    return Combat.finish(game, battle);
  };

  /** Write the battle back into the game: deaths, hp, xp, captured city / cleared structure. Emits 'battle:end'. */
  Combat.finish = function (game, battle) {
    if (battle.finished && battle.result) return battle.result;
    game = game || gameOf(battle);
    if (battle.winner === null || battle.winner === undefined) checkWinner(battle, null);
    if (battle.winner === null || battle.winner === undefined) battle.winner = 1;
    battle.finished = true;
    const winner = battle.winner;
    const result = {
      battleId: battle.id, winner, rounds: battle.round, stalemate: !!battle.stalemate, siege: !!battle.siege,
      attackerLosses: 0, defenderLosses: 0, losses: [0, 0], xp: [0, 0], survivors: [[], []],
      killedUnitIds: [], capturedCityId: null, clearedStructureId: null, hexIdx: battle.hexIdx,
      attacker: battle.sidePlayers[0], defender: battle.sidePlayers[1],
    };
    const St = S();
    const Ru = R();
    const xpPerKill = (Ru && Ru.C && Ru.C.XP_KILL_PER_TIER) || C.XP_KILL;
    const xpWin = (Ru && Ru.C && Ru.C.XP_WIN) || C.XP_WIN;
    const deadUnits = [], liveUnits = [];
    for (const u of battle.units) {
      if (isDead(u)) { result.losses[u.side]++; deadUnits.push(u); } else liveUnits.push(u);
    }
    result.attackerLosses = result.losses[0];
    result.defenderLosses = result.losses[1];
    if (!game || !St) { battle.result = result; if (AOW.Events) AOW.Events.emit('battle:end', { battle, result }); return result; }

    // survivors keep their damage; the dead leave the world
    for (const u of liveUnits) {
      if (u.gameUnitId === null || u.gameUnitId === undefined || u.summoned) continue;
      const gu = St.unit(game, u.gameUnitId);
      if (!gu) continue;
      const ratio = u.maxHp > 0 ? u.hp / u.maxHp : 1;
      gu.hp = Math.max(1, Math.round((gu.maxHp || u.maxHp) * ratio));
      gu.statuses = (gu.statuses || []).filter(s => { const d = statusDef(s.id); return d && d.duration === 0 && d.cleansable === false; });
      result.survivors[u.side].push(gu.id);
      const gained = (u.kills * xpPerKill) + (u.side === winner ? xpWin : Math.round(xpWin / 2));
      result.xp[u.side] += gained;
      if (Ru && typeof Ru.grantXp === 'function') { try { Ru.grantXp(game, gu, gained); } catch (e) { /* optional */ } }
      else gu.xp = (gu.xp || 0) + gained;
    }
    for (const u of deadUnits) {
      if (u.gameUnitId === null || u.gameUnitId === undefined) continue;
      const gu = St.unit(game, u.gameUnitId);
      if (!gu) continue;
      result.killedUnitIds.push(gu.id);
      const hero = gu.heroId !== null && gu.heroId !== undefined && gu.heroId >= 0 ? St.hero(game, gu.heroId) : null;
      St.removeUnit(game, gu.id);
      if (hero) {
        hero.dead = true;
        hero.respawnTurns = (Ru && Ru.C && Ru.C.HERO_RESPAWN_TURNS) || 3;
        hero.respawnAt = (game.turn || 0) + hero.respawnTurns;
        if (hero.isRuler) {
          const text = { ko: (hero.name || '군주') + ' 님이 전장에서 쓰러졌습니다.', en: (hero.name || 'Your ruler') + ' has fallen in battle.' };
          if (Ru && typeof Ru.notify === 'function') { try { Ru.notify(game, hero.owner, 'bad', text, 'skull'); } catch (e) { /* optional */ } }
          else if (AOW.Events) AOW.Events.emit('notify', { kind: 'bad', text: L(text), icon: 'skull' });
        }
      }
    }
    // the losing side's surviving armies are destroyed (units that fled keep their lives)
    const loser = 1 - winner;
    const loserArmies = (loser === 0 ? battle.attackerArmyIds : battle.defenderArmyIds) || [];
    const fled = battle.sides[loser] && battle.sides[loser].retreated;
    if (!fled) {
      for (const u of battle.units) {
        if (u.side !== loser || isDead(u) || u.summoned) continue;
        if (u.gameUnitId === null || u.gameUnitId === undefined) continue;
        const gu = St.unit(game, u.gameUnitId);
        if (!gu) continue;
        const hero = gu.heroId !== null && gu.heroId !== undefined && gu.heroId >= 0 ? St.hero(game, gu.heroId) : null;
        result.losses[loser]++;
        result.killedUnitIds.push(gu.id);
        St.removeUnit(game, gu.id);
        if (hero) { hero.dead = true; hero.respawnTurns = (Ru && Ru.C && Ru.C.HERO_RESPAWN_TURNS) || 3; hero.respawnAt = (game.turn || 0) + hero.respawnTurns; }
      }
      result.survivors[loser].length = 0;
      for (const aid of loserArmies) { const army = St.army(game, aid); if (army) St.removeArmy(game, aid); }
    }
    result.attackerLosses = result.losses[0];
    result.defenderLosses = result.losses[1];

    // spoils: capture the city / clear the structure standing on the contested hex
    if (winner === 0 && battle.hexIdx >= 0) {
      const city = St.cityAt ? St.cityAt(game, battle.hexIdx) : null;
      if (city && city.owner !== battle.sidePlayers[0]) {
        result.capturedCityId = city.id;
        if (Ru && typeof Ru.captureCity === 'function') { try { Ru.captureCity(game, city, battle.sidePlayers[0]); } catch (e) { /* optional */ } }
      }
      const struct = St.structureAt ? St.structureAt(game, battle.hexIdx) : null;
      if (struct && !struct.cleared) {
        result.clearedStructureId = struct.id;
        if (Ru && typeof Ru.clearStructure === 'function') { try { Ru.clearStructure(game, struct, battle.sidePlayers[0]); } catch (e) { /* optional */ } }
      }
    }
    battle.result = result;
    game.battles = game.battles || [];
    game.battles.push({
      id: battle.id, turn: game.turn, hex: battle.hexIdx, winner, rounds: battle.round,
      attacker: battle.sidePlayers[0], defender: battle.sidePlayers[1],
      losses: result.losses.slice(), siege: !!battle.siege, auto: !!battle.autoResolved,
    });
    if (game.battles.length > 200) game.battles.splice(0, game.battles.length - 200);
    if (AOW.Events) AOW.Events.emit('battle:end', { battle, result });
    return result;
  };

  /** Rough strength of a set of armies (AI target picking, UI battle odds). */
  Combat.threat = function (game, armyIds) {
    const St = S();
    if (!game || !St) return 0;
    let total = 0;
    const list = Array.isArray(armyIds) ? armyIds : [armyIds];
    for (const aid of list) {
      const army = typeof aid === 'object' ? aid : St.army(game, aid);
      if (!army) continue;
      for (const uid of army.units) {
        const gu = St.unit(game, uid);
        if (!gu) continue;
        const stats = Combat.unitStats(game, gu);
        let dmg = 0;
        for (const a of stats.attacks || []) dmg = Math.max(dmg, (a.damage || 0) * (a.repeat || 1));
        const hp = (gu.hp || stats.maxHp) * (1 + (stats.def || 0) * 0.06 + (stats.res || 0) * 0.06);
        total += hp * 0.5 + dmg * 3 + (stats.tier || 1) * 10;
      }
    }
    return Math.round(total);
  };

  /** Compact state snapshot for UI/debug. */
  Combat.summary = function (battle) {
    const sides = [0, 1].map(s => {
      const list = battle.units.filter(u => u.side === s);
      const live = list.filter(u => !isDead(u) && !u.fled);
      return {
        side: s, owner: battle.sidePlayers[s], units: list.length, alive: live.length,
        hp: live.reduce((a, u) => a + u.hp, 0), maxHp: list.reduce((a, u) => a + u.maxHp, 0),
        cp: battle.sides[s] ? battle.sides[s].cp : 0, losses: battle.sides[s] ? battle.sides[s].losses : 0,
        retreated: !!(battle.sides[s] && battle.sides[s].retreated),
      };
    });
    return {
      id: battle.id, round: battle.round, side: battle.side, winner: battle.winner,
      activeUnitId: battle.activeUnitId, siege: !!battle.siege, events: battle.log.length, sides,
    };
  };

  // ================================================================ demo (no data dependency)
  const DEMO_TYPES = {
    champion: { id: 'demo_champion', name: { ko: '용사', en: 'Champion' }, tier: 4, role: 'hero', tags: ['racial', 'hero'], move: 'walk', mp: 36, hp: 130, def: 4, res: 3, morale: 10,
      attacks: [{ id: 'great_sword', name: { ko: '대검', en: 'Great Sword' }, type: 'melee', damage: 22, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, effects: [{ status: 'bleeding', chance: 25, duration: 3 }], props: [] }],
      abilities: ['defend', 'rally'], passives: ['fearless', 'inspiring_presence'],
      look: { body: 'form', armor: 'heavy_plate', weapon: 'great_sword', helm: 'crown', cape: 'long', shield: 'none', size: 'medium' } },
    knight: { id: 'demo_knight', name: { ko: '기사', en: 'Knight' }, tier: 3, role: 'shock', tags: ['racial', 'cavalry'], move: 'mounted', mp: 44, hp: 92, def: 4, res: 2,
      attacks: [{ id: 'lance', name: { ko: '돌격창', en: 'Lance' }, type: 'melee', damage: 19, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, effects: [], props: ['charge'] }],
      abilities: ['defend'], passives: ['charge', 'cavalry_charge'],
      look: { body: 'horse_rider', armor: 'plate', weapon: 'lance', helm: 'full', cape: 'short', shield: 'kite', size: 'large' } },
    shield: { id: 'demo_defender', name: { ko: '수호병', en: 'Defender' }, tier: 2, role: 'shield', tags: ['racial', 'infantry'], move: 'walk', mp: 32, hp: 76, def: 5, res: 2,
      attacks: [{ id: 'sword', name: { ko: '검격', en: 'Sword Strike' }, type: 'melee', damage: 13, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, effects: [], props: [] }],
      abilities: ['defend'], passives: ['shield_wall', 'retaliation'],
      look: { body: 'form', armor: 'chain', weapon: 'sword_shield', helm: 'open', shield: 'tower', size: 'medium' } },
    pike: { id: 'demo_pike', name: { ko: '창병', en: 'Pikemen' }, tier: 1, role: 'pike', tags: ['racial', 'infantry'], move: 'walk', mp: 32, hp: 66, def: 3, res: 1,
      attacks: [{ id: 'pike', name: { ko: '창 찌르기', en: 'Pike Thrust' }, type: 'melee', damage: 14, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, effects: [], props: [] }],
      abilities: ['defend'], passives: ['first_strike', 'pike_brace'],
      look: { body: 'form', armor: 'cloth', weapon: 'pike', helm: 'cap', size: 'medium' } },
    archer: { id: 'demo_archer', name: { ko: '궁수', en: 'Archer' }, tier: 1, role: 'ranged', tags: ['racial', 'ranged'], move: 'walk', mp: 32, hp: 52, def: 1, res: 1,
      attacks: [{ id: 'bow', name: { ko: '활 사격', en: 'Shoot Bow' }, type: 'ranged', damage: 13, channel: 'physical', range: 5, ap: 1, repeat: 1, accuracy: 82, effects: [], props: [] }],
      abilities: ['defend'], passives: ['ranged_expert'],
      look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood', size: 'medium' } },
    mage: { id: 'demo_mage', name: { ko: '전투 마법사', en: 'Battle Mage' }, tier: 3, role: 'mage', tags: ['racial', 'magic_origin'], move: 'walk', mp: 32, hp: 58, def: 1, res: 4,
      attacks: [{ id: 'fire_bolt', name: { ko: '화염탄', en: 'Fire Bolt' }, type: 'ranged', damage: 16, channel: 'fire', range: 4, ap: 1, repeat: 1, accuracy: 85, effects: [{ status: 'burning', chance: 40, duration: 3 }], props: ['magic'] }],
      abilities: ['defend', 'heal_wounds'], passives: ['spellcaster'],
      look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hat', cape: 'long', element: 'fire', size: 'medium' } },
    wolf: { id: 'demo_wolf', name: { ko: '다이어 울프', en: 'Dire Wolf' }, tier: 2, role: 'skirmisher', tags: ['animal'], move: 'walk', mp: 44, hp: 60, def: 2, res: 0,
      attacks: [{ id: 'bite', name: { ko: '물어뜯기', en: 'Bite' }, type: 'melee', damage: 14, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 80, effects: [{ status: 'bleeding', chance: 30, duration: 3 }], props: [] }],
      abilities: [], passives: ['fast_movement', 'ferocious'],
      look: { body: 'beast_wolf', armor: 'none', weapon: 'claws', size: 'medium' } },
    ogre: { id: 'demo_ogre', name: { ko: '오우거', en: 'Ogre' }, tier: 3, role: 'fighter', tags: ['giant'], move: 'walk', mp: 32, hp: 130, def: 3, res: 1,
      attacks: [{ id: 'club', name: { ko: '곤봉', en: 'Club' }, type: 'melee', damage: 24, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 75, effects: [{ status: 'stunned', chance: 15, duration: 1 }], props: [] }],
      abilities: [], passives: ['hardened', 'large_target'],
      look: { body: 'giant', armor: 'leather', weapon: 'hammer', helm: 'none', size: 'large' } },
    dragon: { id: 'demo_dragon', name: { ko: '화염 드래곤', en: 'Fire Dragon' }, tier: 5, role: 'shock', tags: ['dragon', 'flying', 'mythic'], move: 'fly', mp: 48, hp: 210, def: 6, res: 6,
      attacks: [{ id: 'claws', name: { ko: '발톱', en: 'Claws' }, type: 'melee', damage: 26, channel: 'physical', range: 1, ap: 1, repeat: 2, accuracy: 85, effects: [], props: [] },
        { id: 'breath', name: { ko: '화염 숨결', en: 'Fire Breath' }, type: 'ranged', damage: 20, channel: 'fire', range: 3, ap: 1, repeat: 1, accuracy: 90, effects: [{ status: 'burning', chance: 60, duration: 3 }], props: ['magic'] }],
      abilities: [], passives: ['flying', 'fearless', 'immune_fire'],
      look: { body: 'dragon', armor: 'none', weapon: 'claws', element: 'fire', size: 'huge', tint: '#c8402a' } },
  };
  /** Synthetic battle used by demo.html?module=combat and by the headless smoke tests. */
  Combat.demo = function (opts) {
    opts = opts || {};
    const side0 = ['champion', 'knight', 'knight', 'shield', 'shield', 'pike', 'archer', 'archer', 'mage', 'ogre'];
    const side1 = ['dragon', 'wolf', 'shield', 'shield', 'pike', 'archer', 'archer', 'mage', 'wolf', 'wolf'];
    const mk = (keys, seedRank) => keys.map((k, i) => ({ type: DEMO_TYPES[k], rank: (i + seedRank) % 3 }));
    const battle = Combat.create(null, {
      seed: opts.seed || 'combat-demo',
      siege: !!opts.siege,
      hexIdx: -1,
      units0: mk(side0, 0),
      units1: mk(side1, 1),
      attacker: 0, defender: 1,
      architecture: 'gothic',
    });
    battle.viewerSide = 0;
    battle.colors = ['#3f7fe0', '#d8402f'];
    if (!opts.raw) {
      const first = battle.units.find(u => u.side === 0 && !isDead(u));
      battle.activeUnitId = first ? first.id : null;
    }
    return battle;
  };
  Combat.DEMO_TYPES = DEMO_TYPES;

  // <<<APPEND>>>

  AOW.Combat = Combat;
})(window.AOW = window.AOW || {});
