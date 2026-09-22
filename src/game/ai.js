// src/game/ai.js — AOW.AI: strategic AI (SPEC §5, §9)
//
// Contract: AOW.AI.playTurn(game, pid) — synchronous, time-bounded (~220ms budget, see TIME_BUDGET_MS)
// with early-outs so a slow map never blows the per-AI turn budget. AOW.AI.explain(game, pid) → a view
// model describing the AI's current strategy (for debug/UI). Neither function ever throws: every call
// into AOW.Rules / AOW.Combat is guarded (`has()`/`call()`) and skipped if the function is missing or
// throws, so ai.js works against a partially-implemented rules.js/combat.js and keeps working as those
// fill in. AOW.Diplomacy is treated as complete and called directly (still wrapped in try/catch per phase).
//
// Design: each turn runs a fixed pipeline of phases (diplomacy, economy, expansion, research, spells,
// heroes, empire skills, free cities, military, victory pursuit), each wrapped in try/catch and gated by
// a remaining-time check. Diplomacy.tick(game) (idempotent per game.turn) drives the actual propose/
// declareWar/peace actions for every AI player; ai.js additionally reads Diplomacy.wantsWar/wantsPeace/
// atWar/strengthRatio to build this player's own war-planning context (ctx.atWarWith/planningWar), which
// biases the economy (military production) and military (siege targeting) phases.
//
// Additive state fields (plain JSON, documented per Ground Rule 0):
//   army.aiRole   null|'defense'|'expedition'|'siege'|'outpost'   the army's current standing order
//   army.aiTarget hexIdx|null                                     the hex it is pursuing (city/structure/rally point)
//     Multiple armies sharing the same aiRole:'siege' + aiTarget are one another's "gathering stack" —
//     that is how 2-3 armies coordinate a siege without a separate group-id field.
//   player.ai.freeCityTurn  {[cityId]: lastActionTurn}   throttles gift/whisper attempts per free city
//     (player.ai.lastWarTurn / warTargetPid are diplomacy.js's own fields in the same bag; ai.js only adds freeCityTurn)
//
// Verification: node tools/playtest.js is the canonical check. While rules.js/combat.js/turn.js were
// still partial, this file was also exercised headlessly with `new Function` loading the real core+data+
// game modules directly (no browser/art/render/ui needed) and mocking whatever Rules/Combat functions
// were not yet written, per the has()/call() guards above — see the session notes for that harness.
(function (AOW) {
  'use strict';
  const AI = {};

  const S = () => AOW.State;
  const R = () => AOW.Rules;
  const D = () => AOW.Diplomacy;
  const CB = () => AOW.Combat;
  const Data = () => AOW.Data;
  const Hex = () => AOW.Hex;

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const warn = (tag, e) => { if (AOW.warn) { try { AOW.warn('[AI] ' + tag, (e && e.message) || e); } catch (e2) { /* ignore */ } } };
  const has = (ns, fn) => !!ns && typeof ns[fn] === 'function';
  function call(ns, fn, args, fallback) {
    if (!has(ns, fn)) return fallback;
    try { const r = ns[fn].apply(ns, args); return r === undefined ? fallback : r; } catch (e) { warn(fn, e); return fallback; }
  }

  // ------------------------------------------------------------------ i18n (log text)
  if (AOW.I18n && typeof AOW.I18n.add === 'function') {
    AOW.I18n.add({
      ko: { 'ai.log.summary': '[{name}] {personality}: {summary} ({ms}ms)', 'ai.log.idle': '정비 중' },
      en: { 'ai.log.summary': '[{name}] {personality}: {summary} ({ms}ms)', 'ai.log.idle': 'consolidating' },
    });
  }
  const t = (key, params) => (typeof AOW.t === 'function' ? AOW.t(key, params) : key);

  // ------------------------------------------------------------------ constants
  const TIME_BUDGET_MS = 220;
  const PERSONALITIES = ['expansionist', 'militarist', 'scholar', 'diplomat', 'defender'];
  const DIFF_MULT = { easy: 0.85, normal: 1, hard: 1.15, brutal: 1.3 };
  const THREAT_RADIUS = 6;             // hexes: an enemy/raider within this of a city marks it "threatened"
  const MIN_GARRISON = 2;              // a garrison below this size never gets pulled for offense/outposts
  const SIEGE_RANGE = 30, SIEGE_GATHER_MAX = 3, EXPEDITION_RANGE = 16, EXPEDITION_MARGIN = 1.3;
  const FREE_CITY_RANGE = 22, FREE_CITY_COOLDOWN = 4;
  const AI_OUTPOST_MIN_DIST = 5, AI_OUTPOST_MAX_DIST = 18;

  const TREE_PERS = { militarist: 'chaos', scholar: 'astral', diplomat: 'order', defender: 'materium', expansionist: 'nature' };
  const ECON_WEIGHT = {
    militarist: { draft: 3, production: 2, gold: 1, walls: 2, stability: 1 },
    scholar: { knowledge: 4, mana: 2, gold: 1, researchPct: 5, stability: 1 },
    diplomat: { gold: 2, stability: 2, diplomacyOpinion: 4, food: 1 },
    defender: { walls: 5, cityDefense: 4, stability: 3, def: 3, hp: 2 },
    expansionist: { food: 3, growthPct: 4, gold: 2, production: 2, provinceCostPct: 2 },
  };
  const INVERT_KEYS = new Set(['recruitCostPct', 'upkeepPct', 'spellCostPct', 'provinceCostPct']);
  const ROLE_PERS_BONUS = {
    militarist: { shock: 3, cavalry: 3, siege: 3, ranged: 1, mage: 1 },
    defender: { shield: 3, pike: 3, support: 2, polearm: 2 },
    scholar: { mage: 3, support: 2, ranged: 1 },
    diplomat: { support: 2, ranged: 1, shield: 1 },
    expansionist: { skirmisher: 3, scout: 3, ranged: 1 },
  };
  const TYPE_WEIGHT = {
    scholar: { spell: 3, improvement: 2, empire: 2, unit: 1, transformation: 2, skill: 1 },
    militarist: { unit: 3, empire: 1, spell: 1, improvement: 0.5, transformation: 1, skill: 1 },
    diplomat: { improvement: 2, empire: 2, spell: 1, unit: 1, transformation: 1, skill: 1 },
    defender: { improvement: 2, spell: 1, unit: 1.5, empire: 1, transformation: 1, skill: 1 },
    expansionist: { improvement: 3, unit: 1, spell: 1, empire: 1, transformation: 1, skill: 1 },
  };

  function aiMem(p) { p.ai = p.ai || {}; return p.ai; }

  // ==================================================================== generic helpers
  function armyHpFrac(game, army) {
    let hp = 0, max = 0;
    for (const uid of army.units) { const u = S().unit(game, uid); if (!u) continue; hp += u.hp || 0; max += u.maxHp || 1; }
    return max > 0 ? hp / max : 1;
  }
  function basicStrength(game, army) {
    let s = 0;
    for (const uid of army.units) {
      const u = S().unit(game, uid); if (!u) continue;
      const type = S().unitType(u);
      const hpFrac = u.maxHp > 0 ? Math.max(0.1, Math.min(1, u.hp / u.maxHp)) : 1;
      s += ((type.tier || 1) * 12 + 8) * hpFrac * (1 + 0.1 * (u.rank || 0));
    }
    return s;
  }
  /** Group strength estimate: Combat.threat when present, else Diplomacy.armyStrength, else a local tier/hp sum. */
  function threatOfArmies(game, ids) {
    if (!ids || !ids.length) return 0;
    if (has(CB(), 'threat')) { const v = call(CB(), 'threat', [game, ids], null); if (typeof v === 'number' && isFinite(v)) return v; }
    let s = 0;
    for (const id of ids) {
      const a = S().army(game, id); if (!a) continue;
      if (has(D(), 'armyStrength')) { s += call(D(), 'armyStrength', [game, a], basicStrength(game, a)); }
      else s += basicStrength(game, a);
    }
    return s;
  }
  function nearestOwnCity(game, cities, hex) {
    let best = null, bestD = Infinity;
    for (const c of cities) { const d = Hex().distIdx(hex, c.hex, game.W); if (d < bestD) { bestD = d; best = c; } }
    return best;
  }
  function nearestOwnCityDist(game, cities, hex) { const c = nearestOwnCity(game, cities, hex); return c ? Hex().distIdx(hex, c.hex, game.W) : Infinity; }
  function bestOwnCity(game, ctx) {
    const real = ctx.cities.filter(c => c.tier >= 1);
    if (!real.length) return null;
    const cap = real.find(c => c.isCapital);
    if (cap) return cap;
    return real.reduce((a, b) => (b.tier > a.tier ? b : a));
  }
  function strongestArmy(ctx) {
    let best = null, bestN = -1;
    for (const a of ctx.armies) if (a.units.length > bestN) { bestN = a.units.length; best = a; }
    return best;
  }
  function armyHasRulerHero(game, p, army) {
    if (p.rulerHeroId === undefined || p.rulerHeroId === null || p.rulerHeroId < 0) return false;
    const hero = S().hero(game, p.rulerHeroId);
    if (!hero || hero.unitId === null || hero.unitId < 0) return false;
    return army.units.includes(hero.unitId);
  }
  function armyRoleCounts(game, p) {
    const counts = {};
    for (const u of game.units) {
      if (u.owner !== p.id) continue;
      const role = S().unitType(u).role || 'fighter';
      counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
  }
  function roleBonus(role, pers) { return (ROLE_PERS_BONUS[pers] && ROLE_PERS_BONUS[pers][role]) || 0; }
  function totalAffinity(p) { let s = 0; for (const k of Object.keys(p.affinity || {})) s += p.affinity[k] || 0; return s; }

  /** Move `army` one step toward `targetHex` via Rules.pathfind + Rules.moveArmy. Skipped if either is missing. */
  function moveArmyToward(game, army, targetHex, ctx) {
    if (!has(R(), 'pathfind') || !has(R(), 'moveArmy')) return false;
    const pf = call(R(), 'pathfind', [game, army, targetHex], null);
    if (!pf || !pf.path || !pf.path.length) return false;
    const res = call(R(), 'moveArmy', [game, army, pf.path], null);
    if (res) { ctx.counts.moves++; return true; }
    return false;
  }

  // ==================================================================== context
  function buildContext(game, p, t0) {
    const cities = S().playerCities(game, p.id);
    const armies = S().playerArmies(game, p.id);
    const garrisonArmyIds = new Set();
    for (const c of cities) if (c.garrisonArmyId >= 0) garrisonArmyIds.add(c.garrisonArmyId);
    const personality = PERSONALITIES.includes(p.personality) ? p.personality : 'expansionist';
    const diffMult = DIFF_MULT[(game.settings && game.settings.difficulty) || 'normal'] || 1;
    return {
      cities, armies, garrisonArmyIds, personality, diffMult,
      counts: { moves: 0, recruits: 0, annexes: 0, spells: 0, wars: 0 },
      atWarWith: [], wantsWarWith: [], wantsPeaceWith: [], planningWar: false,
      threatenedCities: null, _roleCounts: null,
      timeLeft: () => TIME_BUDGET_MS - (now() - t0),
    };
  }
  function roleCounts(game, p, ctx) { if (!ctx._roleCounts) ctx._roleCounts = armyRoleCounts(game, p); return ctx._roleCounts; }

  // ==================================================================== diplomacy
  /**
   * Diplomacy.tick(game) is idempotent per game.turn and itself drives every AI player's propose/
   * declareWar/peace decisions (via Diplomacy.wantsWar/wantsPeace internally). Calling it here means
   * ai.js works even before turn.js exists. We then read wantsWar/wantsPeace/atWar/strengthRatio
   * ourselves to build this player's own war-planning context for the economy & military phases.
   */
  function runDiplomacy(game, p, ctx) {
    if (!D()) return;
    const before = new Set();
    for (const o of game.players) if (o.id !== p.id && call(D(), 'atWar', [game, p.id, o.id], false)) before.add(o.id);
    call(D(), 'tick', [game], null);
    for (const o of game.players) {
      if (o.id === p.id || o.alive === false) continue;
      const atWar = call(D(), 'atWar', [game, p.id, o.id], false);
      if (atWar) {
        ctx.atWarWith.push(o.id);
        if (!before.has(o.id)) ctx.counts.wars++;
        if (call(D(), 'wantsPeace', [game, p.id, o.id], false)) ctx.wantsPeaceWith.push(o.id);
      } else if (call(D(), 'wantsWar', [game, p.id, o.id], false)) {
        ctx.wantsWarWith.push(o.id);
      }
    }
    ctx.planningWar = ctx.atWarWith.length > 0 || ctx.wantsWarWith.length > 0;
  }

  // ==================================================================== economy
  function computeThreatenedCities(game, p, ctx) {
    const set = new Set();
    for (const city of ctx.cities) {
      for (const a of game.armies) {
        if (!a.units.length) continue;
        const hostile = (a.owner >= 0 && ctx.atWarWith.includes(a.owner)) || (a.owner === -1 && a.raid);
        if (!hostile) continue;
        if (Hex().distIdx(a.hex, city.hex, game.W) <= THREAT_RADIUS) { set.add(city.id); break; }
      }
    }
    return set;
  }
  function pickBuildingWithEffect(game, buildingIds, key) {
    for (const id of buildingIds) {
      let b; try { b = Data().get('buildings', id); } catch (e) { continue; }
      if (b.effects && b.effects[key]) return id;
    }
    return null;
  }
  function buildingScore(b, pers) {
    const w = ECON_WEIGHT[pers] || {};
    const eff = b.effects || {};
    let s = 1;
    for (const k of Object.keys(eff)) {
      if (k === 'unitTier' || k === 'walls') continue;
      const v = eff[k];
      const num = typeof v === 'number' ? v : (v ? 1 : 0);
      const signed = INVERT_KEYS.has(k) ? -num : num;
      s += (w[k] !== undefined ? w[k] : 0.4) * signed;
    }
    if (eff.unitTier) s += (6 + (w.unitTier || 0)) * eff.unitTier;
    if (eff.walls) s += (4 + (w.walls || 0)) * eff.walls * 0.2;
    return s;
  }
  function pickEconomyBuilding(buildingIds, pers) {
    let best = null, bestScore = -Infinity;
    for (const id of buildingIds) {
      let b; try { b = Data().get('buildings', id); } catch (e) { continue; }
      const s = buildingScore(b, pers);
      if (s > bestScore) { bestScore = s; best = id; }
    }
    return bestScore > 1.5 ? best : null; // skip if nothing meaningfully useful is buildable
  }
  function pickRecruit(game, p, unitIds, ctx) {
    if (!unitIds.length) return null;
    const counts = roleCounts(game, p, ctx);
    let best = null, bestScore = -Infinity, bestAffordable = null, bestAffordableScore = -Infinity;
    for (const id of unitIds) {
      let u; try { u = Data().get('units', id); } catch (e) { continue; }
      const role = u.role || 'fighter';
      const have = counts[role] || 0;
      const underRep = 10 / (1 + have);
      const cost = has(R(), 'unitCost') ? call(R(), 'unitCost', [game, p, u], u.cost || {}) : (u.cost || {});
      const score = underRep + (u.tier || 1) * 2 + roleBonus(role, ctx.personality);
      if (score > bestScore) { bestScore = score; best = id; }
      const afford = (cost.gold || 0) <= (p.resources.gold || 0) && (cost.mana || 0) <= (p.resources.mana || 0);
      if (afford && score > bestAffordableScore) { bestAffordableScore = score; bestAffordable = id; }
    }
    return bestAffordable || best;
  }
  function enqueueSafe(game, p, city, item, ctx) {
    if (!has(R(), 'enqueue')) return null;
    const r = call(R(), 'enqueue', [game, city, item], null);
    if (r && r.ok) { if (item.type === 'unit') ctx.counts.recruits++; else ctx.counts.queued = (ctx.counts.queued || 0) + 1; }
    return r;
  }
  function ensureCityQueue(game, p, city, ctx, depth) {
    const q = city.queue || [];
    if (q.length >= depth || !has(R(), 'enqueue')) return;
    const threatened = ctx.threatenedCities.has(city.id);
    const wantsMilitary = ctx.planningWar || threatened || ctx.personality === 'militarist';
    const buildings = has(R(), 'buildableBuildings') ? call(R(), 'buildableBuildings', [game, city], []) : [];
    const units = has(R(), 'recruitableUnits') ? call(R(), 'recruitableUnits', [game, city], []) : [];

    if (threatened && !(city.walls > 0)) {
      const wallBuild = pickBuildingWithEffect(game, buildings, 'walls');
      if (wallBuild) { enqueueSafe(game, p, city, { type: 'building', id: wallBuild }, ctx); return; }
    }
    const econBuilding = pickEconomyBuilding(buildings, ctx.personality);
    const unitId = pickRecruit(game, p, units, ctx);
    const preferMilitary = wantsMilitary && (q.length % 2 === 0 || !econBuilding);
    if (preferMilitary && unitId) enqueueSafe(game, p, city, { type: 'unit', id: unitId }, ctx);
    else if (econBuilding) enqueueSafe(game, p, city, { type: 'building', id: econBuilding }, ctx);
    else if (unitId) enqueueSafe(game, p, city, { type: 'unit', id: unitId }, ctx);
  }
  function maybeAnnex(game, p, city, ctx) {
    if (!has(R(), 'annexableProvinces') || !has(R(), 'annexProvince')) return;
    const options = call(R(), 'annexableProvinces', [game, city], []) || [];
    if (!options.length) return;
    let best = null, bestScore = -Infinity;
    for (const opt of options) {
      const pid = typeof opt === 'object' && opt !== null ? (opt.id !== undefined ? opt.id : opt.pid) : opt;
      const prov = game.provinces[pid]; if (!prov) continue;
      let score = 2;
      if (prov.resource) score += 8;
      if (prov.magicMaterial) score += 6;
      if (opt && opt.cost) score -= ((opt.cost.gold || 0) + (opt.cost.imperium || 0) * 2) / 50;
      if (score > bestScore) { bestScore = score; best = pid; }
    }
    if (best === null || best === undefined) return;
    const cost = has(R(), 'annexCost') ? call(R(), 'annexCost', [game, city], null) : null;
    if (cost && (((cost.gold || 0) > (p.resources.gold || 0)) || ((cost.imperium || 0) > (p.resources.imperium || 0)))) return;
    const r = call(R(), 'annexProvince', [game, city, best], null);
    if (r && r.ok) ctx.counts.annexes++;
  }
  function pickImprovement(opts, prov, pers) {
    const w = ECON_WEIGHT[pers] || {};
    let best = null, bestScore = -Infinity;
    for (const o of opts) {
      const id = typeof o === 'string' ? o : o.id;
      let imp; try { imp = Data().get('improvements', id); } catch (e) { continue; }
      let score = 1;
      for (const k of Object.keys(imp.yields || {})) score += (w[k] !== undefined ? w[k] : 1) * (imp.yields[k] || 0) * 0.2;
      if (prov.resource && imp.yields && imp.yields[prov.resource]) score += 5;
      if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
  }
  function maybeImprove(game, p, city, ctx) {
    if (!has(R(), 'improvementOptions') || !has(R(), 'buildImprovement')) return;
    for (const pid of city.provinces || []) {
      const prov = game.provinces[pid]; if (!prov || prov.improvement) continue;
      const opts = call(R(), 'improvementOptions', [game, city, pid], []) || [];
      if (!opts.length) continue;
      const pick = pickImprovement(opts, prov, ctx.personality);
      if (!pick) continue;
      const r = call(R(), 'buildImprovement', [game, city, pid, pick], null);
      if (r && r.ok) { ctx.counts.improvements = (ctx.counts.improvements || 0) + 1; break; }
    }
  }
  function runEconomy(game, p, ctx) {
    ctx.threatenedCities = computeThreatenedCities(game, p, ctx);
    const depth = Math.max(1, Math.round(2 + (ctx.diffMult - 1) * 4));
    for (const city of ctx.cities) {
      if (ctx.timeLeft() < 10) break;
      if (city.tier < 1) continue;
      ensureCityQueue(game, p, city, ctx, depth);
      maybeAnnex(game, p, city, ctx);
      maybeImprove(game, p, city, ctx);
    }
  }

  // ==================================================================== expansion (outposts)
  function desiredOutpostCount(game, p, ctx) {
    let n = 1 + Math.floor(ctx.cities.filter(c => c.tier >= 1).length * 0.5);
    if (ctx.personality === 'expansionist') n += 3;
    else if (ctx.personality === 'scholar' || ctx.personality === 'diplomat') n += 1;
    return Math.min(8, Math.round(n * ctx.diffMult));
  }
  function pickOutpostCandidate(game, p, ctx) {
    if (ctx.timeLeft() < 30) return null;
    const W = game.W, N = W * game.H;
    const explored = game.explored[p.id];
    if (!explored) return null;
    let best = -1, bestScore = -Infinity;
    for (let i = 0; i < N; i++) {
      if (!explored[i] || game.terrain[i] <= 2 || game.structure[i] >= 0 || game.owner[i] >= 0) continue;
      const minCityDist = nearestOwnCityDist(game, ctx.cities, i);
      if (minCityDist < AI_OUTPOST_MIN_DIST || minCityDist > AI_OUTPOST_MAX_DIST) continue;
      const prov = S().provinceOf(game, i);
      let score = 20 - minCityDist * 0.5;
      if (prov) { if (prov.resource) score += 10; if (prov.magicMaterial) score += 8; }
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best >= 0 ? best : null;
  }
  function pickExpansionParty(game, p, ctx) {
    const threatened = ctx.threatenedCities || new Set();
    let best = null, bestScore = Infinity;
    for (const a of ctx.armies) {
      if (!a.units.length || (a.aiRole && a.aiRole !== 'outpost') || armyHasRulerHero(game, p, a)) continue;
      const city = ctx.cities.find(c => c.garrisonArmyId === a.id);
      if (city && threatened.has(city.id)) continue;
      if (a.units.length > 3) continue;
      if (a.units.length < bestScore) { bestScore = a.units.length; best = a; }
    }
    return best;
  }
  function ensureOutpostUpgrades(game, p, ctx) {
    if (!has(R(), 'upgradeOutpost')) return;
    const cap = has(R(), 'cityCap') ? call(R(), 'cityCap', [game, p], 3) : 3;
    if (ctx.cities.filter(c => c.tier >= 1).length >= cap) return;
    for (const o of game.cities) {
      if (o.owner !== p.id || o.tier !== 0) continue;
      const r = call(R(), 'upgradeOutpost', [game, o], null);
      if (r && r.ok) { ctx.counts.upgrades = (ctx.counts.upgrades || 0) + 1; break; }
    }
  }
  function runExpansion(game, p, ctx) {
    ensureOutpostUpgrades(game, p, ctx);
    if (!has(R(), 'canFoundOutpost') || !has(R(), 'foundOutpost')) return;
    const haveOutposts = game.cities.filter(c => c.owner === p.id && c.tier === 0).length;
    if (haveOutposts >= desiredOutpostCount(game, p, ctx)) return;
    const party = pickExpansionParty(game, p, ctx);
    if (!party) return;
    const targetHex = (party.aiRole === 'outpost' && party.aiTarget !== null && party.aiTarget !== undefined)
      ? party.aiTarget : pickOutpostCandidate(game, p, ctx);
    if (targetHex === null || targetHex === undefined) return;
    party.aiRole = 'outpost'; party.aiTarget = targetHex;
    if (party.hex === targetHex) {
      const can = call(R(), 'canFoundOutpost', [game, p, targetHex], { ok: false });
      if (can && can.ok) {
        const r = call(R(), 'foundOutpost', [game, p, targetHex, party.id], null);
        if (r && r.ok) { ctx.counts.outposts = (ctx.counts.outposts || 0) + 1; party.aiRole = null; party.aiTarget = null; }
      }
    } else {
      moveArmyToward(game, party, targetHex, ctx);
    }
  }

  // ==================================================================== research
  function wantsNewTome(game, p) {
    if (!p.tomes || !p.tomes.length) return true;
    if (p.research && p.research.current) return false;
    const opts = has(R(), 'researchOptions') ? call(R(), 'researchOptions', [game, p], []) : [];
    return !opts || !opts.length;
  }
  function affinityShare(p) {
    const keys = Object.keys(p.affinity || {});
    let sum = 0; for (const k of keys) sum += Math.max(0, p.affinity[k] || 0);
    const out = {}; for (const k of keys) out[k] = sum > 0 ? Math.max(0, p.affinity[k] || 0) / sum : 1 / Math.max(1, keys.length);
    return out;
  }
  function pickTome(p, avail, pers) {
    const share = affinityShare(p);
    let best = null, bestScore = -Infinity;
    for (const t2 of avail) {
      const id = typeof t2 === 'string' ? t2 : t2.id;
      let tome; try { tome = Data().get('tomes', id); } catch (e) { continue; }
      if ((p.tomes || []).includes(id)) continue;
      let score = 0;
      for (const k of Object.keys(tome.affinity || {})) score += (share[k] || 0) * (tome.affinity[k] || 0) * 4;
      if (TREE_PERS[pers] && tome.affinity && tome.affinity[TREE_PERS[pers]]) score += 6;
      if (pers === 'scholar') score += (tome.tier || 1) + (tome.contents || []).length * 0.5;
      if (pers === 'militarist') score += (tome.contents || []).filter(c => c.type === 'unit').length * 3;
      if (pers === 'expansionist') score += (tome.contents || []).filter(c => c.type === 'improvement').length * 2;
      if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
  }
  function pickResearch(opts, pers) {
    const w = TYPE_WEIGHT[pers] || {};
    let best = null, bestScore = Infinity;
    for (const o of opts) {
      const cost = Math.max(1, o.cost || o.knowledge || 100);
      const score = cost / (w[o.type] || 1);
      if (score < bestScore) { bestScore = score; best = o; }
    }
    return best;
  }
  function runResearch(game, p, ctx) {
    if (has(R(), 'availableTomes') && has(R(), 'selectTome') && wantsNewTome(game, p)) {
      const avail = call(R(), 'availableTomes', [game, p], []) || [];
      if (avail.length) {
        const tomeId = pickTome(p, avail, ctx.personality);
        if (tomeId) { const r = call(R(), 'selectTome', [game, p, tomeId], null); if (r && r.ok) ctx.counts.tomes = (ctx.counts.tomes || 0) + 1; }
      }
    }
    if ((!p.research || !p.research.current) && has(R(), 'researchOptions') && has(R(), 'startResearch')) {
      const opts = call(R(), 'researchOptions', [game, p], []) || [];
      if (opts.length) {
        const opt = pickResearch(opts, ctx.personality);
        if (opt) {
          const tomeId = opt.tomeId || opt.tome || (opt.source && opt.source.tomeId);
          const contentId = opt.contentId || opt.id;
          if (tomeId && contentId) { const r = call(R(), 'startResearch', [game, p, tomeId, contentId], null); if (r && r.ok) ctx.counts.research = (ctx.counts.research || 0) + 1; }
        }
      }
    }
  }

  // ==================================================================== spells
  function manaReserve(ctx) { return 30 + ctx.cities.length * 15; }
  function pickSpellTarget(game, p, sp, ctx) {
    switch (sp.target) {
      case 'city': { const c = bestOwnCity(game, ctx); return c ? c.id : undefined; }
      case 'army': { const a = strongestArmy(ctx); return a ? a.id : undefined; }
      case 'unit': case 'ally_unit': { const a = strongestArmy(ctx); return (a && a.units.length) ? a.units[0] : undefined; }
      case 'province': { const c = bestOwnCity(game, ctx); return c && c.provinces[0]; }
      case 'hex': { const c = bestOwnCity(game, ctx); return c ? c.hex : undefined; }
      case 'player': case 'empire': return p.id;
      default: return undefined;
    }
  }
  function runSpells(game, p, ctx) {
    if (!has(R(), 'canCast') || !has(R(), 'castSpell')) return;
    const known = (p.spells && p.spells.known) || [];
    if (!known.length) return;
    const reserve = manaReserve(ctx);
    let castCount = 0;
    for (const spellId of known) {
      if (castCount >= 2 || ctx.timeLeft() < 10) break;
      let sp; try { sp = Data().get('spells', spellId); } catch (e) { continue; }
      if (!sp || sp.kind === 'combat') continue; // combat spells are cast during battles, not on the world map
      if (((p.resources.mana || 0) - ((sp.cost && sp.cost.mana) || 0)) < reserve) continue;
      const target = pickSpellTarget(game, p, sp, ctx);
      if (target === undefined) continue;
      const can = call(R(), 'canCast', [game, p, spellId, target], { ok: false });
      if (!can || !can.ok) continue;
      const r = call(R(), 'castSpell', [game, p, spellId, target], null);
      if (r && r.ok) { ctx.counts.spells++; castCount++; }
    }
  }

  // ==================================================================== heroes
  function pickHeroSkill(opts, hero) {
    let best = null, bestScore = -Infinity;
    for (const o of opts) {
      const id = typeof o === 'string' ? o : o.id;
      let sk; try { sk = Data().get('heroSkills', id); } catch (e) { continue; }
      let score = 0;
      if (sk.class && sk.class === hero.classId) score += 10; else if (!sk.class) score += 2;
      score -= (sk.tier || 1);
      if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
  }
  function runHeroes(game, p, ctx) {
    const heroes = S().playerHeroes(game, p.id).filter(h => !h.dead);
    for (const hero of heroes) {
      if (ctx.timeLeft() < 5) break;
      if (hero.skillPoints > 0 && has(R(), 'heroAvailableSkills') && has(R(), 'heroLevelUp')) {
        const opts = call(R(), 'heroAvailableSkills', [game, hero], []) || [];
        const pick = pickHeroSkill(opts, hero);
        if (pick) { const r = call(R(), 'heroLevelUp', [game, hero, pick], null); if (r && r.ok) ctx.counts.heroSkills = (ctx.counts.heroSkills || 0) + 1; }
      }
      if (has(R(), 'equipItem')) {
        const inv = p.items || [];
        for (const itemId of inv) {
          let it; try { it = Data().get('items', itemId); } catch (e) { continue; }
          if (!it || hero.items[it.slot]) continue;
          const r = call(R(), 'equipItem', [game, hero, itemId, it.slot], null);
          if (r && r.ok) { ctx.counts.equip = (ctx.counts.equip || 0) + 1; break; }
        }
      }
    }
  }

  // ==================================================================== empire skills
  function runEmpireSkills(game, p, ctx) {
    if (!has(R(), 'buyEmpireSkill')) return;
    const owned = new Set(p.empireSkills || []);
    const favored = TREE_PERS[ctx.personality] || 'general';
    const list = Data().list('empireSkills');
    const reserve = 50;
    let best = null, bestScore = -Infinity;
    for (const sk of list) {
      if (owned.has(sk.id)) continue;
      if ((sk.prereq || []).some(id => !owned.has(id))) continue;
      const need = sk.affinityReq || 0;
      const have = sk.tree === 'general' ? totalAffinity(p) : ((p.affinity && p.affinity[sk.tree]) || 0);
      if (have < need) continue;
      const cost = (sk.cost && sk.cost.imperium) || 0;
      if (cost > (p.resources.imperium || 0) - reserve) continue;
      let score = 10 - (sk.tier || 1);
      if (sk.tree === favored) score += 6;
      if (sk.tree === 'general') score += 2;
      if (sk.rite) score += 3;
      score -= cost / 200;
      if (score > bestScore) { bestScore = score; best = sk; }
    }
    if (!best) return;
    const r = call(R(), 'buyEmpireSkill', [game, p, best.id], null);
    if (r && r.ok) ctx.counts.empireSkills = (ctx.counts.empireSkills || 0) + 1;
  }

  // ==================================================================== free cities
  function runFreeCities(game, p, ctx) {
    const freeCities = game.cities.filter(c => c.freeCity && c.owner < 0 && !c.freeCity.integrated);
    if (!freeCities.length) return;
    const mem = aiMem(p); mem.freeCityTurn = mem.freeCityTurn || {};
    for (const city of freeCities) {
      if (ctx.timeLeft() < 8) break;
      if (nearestOwnCityDist(game, ctx.cities, city.hex) > FREE_CITY_RANGE) continue;
      if (ctx.personality === 'militarist') continue; // conquest handled by the military phase's siege targeting
      if (!has(R(), 'freeCityAction')) continue;
      const last = mem.freeCityTurn[city.id] || -99;
      if (game.turn - last < FREE_CITY_COOLDOWN) continue;
      const opinion = has(R(), 'freeCityOpinion') ? call(R(), 'freeCityOpinion', [game, p, city], 0) : ((city.freeCity.opinion || {})[p.id] || 0);
      let action = null;
      if ((p.resources.gold || 0) > 150 && opinion < 60) action = 'gift';
      else if ((p.whisperStones || 0) > 0 && opinion < 80) action = 'whisper';
      if (!action) continue;
      const r = call(R(), 'freeCityAction', [game, p, city, action, {}], null);
      if (r && r.ok) { mem.freeCityTurn[city.id] = game.turn; ctx.counts.diplomacy = (ctx.counts.diplomacy || 0) + 1; }
    }
  }

  // ==================================================================== military
  function isRoleValid(game, p, army, ctx) {
    if (army.aiTarget === null || army.aiTarget === undefined) return false;
    if (army.aiRole === 'siege') {
      const c = S().cityAt(game, army.aiTarget);
      if (!c || c.owner === p.id) return false;
      if (c.freeCity) return ctx.personality === 'militarist' && !c.freeCity.integrated;
      return c.owner >= 0 && ctx.atWarWith.includes(c.owner);
    }
    if (army.aiRole === 'expedition') {
      const st = S().structureAt(game, army.aiTarget);
      return !!st && st.guardArmyId >= 0 && !st.cleared;
    }
    if (army.aiRole === 'defense') {
      const c = S().cityAt(game, army.aiTarget);
      return !!c && c.owner === p.id;
    }
    if (army.aiRole === 'outpost') return game.structure[army.aiTarget] < 0 && game.owner[army.aiTarget] < 0;
    return false;
  }
  function countAssigned(armies, hex, role) { let n = 0; for (const a of armies) if (a.aiRole === role && a.aiTarget === hex) n++; return n; }
  function pickSiegeTarget(game, p, ctx, army) {
    if (!ctx.atWarWith.length && ctx.personality !== 'militarist') return null;
    let best = null, bestScore = -Infinity;
    for (const c of game.cities) {
      if (c.owner === p.id) continue;
      let hostile = false;
      if (c.owner >= 0 && ctx.atWarWith.includes(c.owner)) hostile = true;
      else if (c.freeCity && !c.freeCity.integrated && ctx.personality === 'militarist') hostile = true;
      if (!hostile) continue;
      const assigned = countAssigned(ctx.armies, c.hex, 'siege');
      if (assigned >= SIEGE_GATHER_MAX) continue;
      const dist = Hex().distIdx(army.hex, c.hex, game.W);
      if (dist > SIEGE_RANGE) continue;
      const ratio = (c.owner >= 0 && D()) ? call(D(), 'strengthRatio', [game, p.id, c.owner], 1) : 1.2;
      const score = 30 - dist * 0.5 + Math.min(20, (ratio - 1) * 10) - assigned * 4;
      if (score > bestScore) { bestScore = score; best = c.hex; }
    }
    return best;
  }
  function pickExpeditionTarget(game, p, ctx, army) {
    const myThreat = threatOfArmies(game, [army.id]);
    if (myThreat <= 0) return null;
    let best = null, bestScore = -Infinity;
    for (const st of game.structures) {
      if (!st || st.kind === 'removed' || st.cleared) continue;
      if (st.kind !== 'wonder' && st.kind !== 'infestation') continue;
      if (st.guardArmyId < 0) continue;
      const guard = S().army(game, st.guardArmyId);
      if (!guard) continue;
      const guardThreat = threatOfArmies(game, [guard.id]);
      if (guardThreat > 0 && myThreat < guardThreat * EXPEDITION_MARGIN) continue;
      const dist = Hex().distIdx(army.hex, st.hex, game.W);
      if (dist > EXPEDITION_RANGE) continue;
      const score = 20 - dist * 0.4 + (st.kind === 'wonder' ? 6 : 0);
      if (score > bestScore) { bestScore = score; best = st.hex; }
    }
    return best;
  }
  function assignRoles(game, p, ctx) {
    const threatened = ctx.threatenedCities || new Set();
    for (const army of ctx.armies) {
      if (!army.units.length || army.aiRole === 'outpost') continue;
      const garrisonCity = ctx.cities.find(c => c.garrisonArmyId === army.id);
      if (garrisonCity && (threatened.has(garrisonCity.id) || army.units.length < MIN_GARRISON)) {
        army.aiRole = 'defense'; army.aiTarget = army.hex; continue;
      }
      if (army.aiRole && isRoleValid(game, p, army, ctx)) continue;
      const siegeTarget = pickSiegeTarget(game, p, ctx, army);
      if (siegeTarget !== null && siegeTarget !== undefined) { army.aiRole = 'siege'; army.aiTarget = siegeTarget; continue; }
      const expTarget = pickExpeditionTarget(game, p, ctx, army);
      if (expTarget !== null && expTarget !== undefined) { army.aiRole = 'expedition'; army.aiTarget = expTarget; continue; }
      const home = nearestOwnCity(game, ctx.cities, army.hex);
      army.aiRole = 'defense'; army.aiTarget = home ? home.hex : army.hex;
    }
  }
  function readyToSiege(game, p, army, ctx) {
    const group = ctx.armies.filter(a => a.aiRole === 'siege' && a.aiTarget === army.aiTarget);
    const myThreat = threatOfArmies(game, group.map(a => a.id));
    const city = S().cityAt(game, army.aiTarget);
    let defThreat = 0;
    if (city) {
      const garr = S().army(game, city.garrisonArmyId);
      if (garr) defThreat = threatOfArmies(game, [garr.id]);
      defThreat *= 1 + (city.walls || 0) * 0.15;
    }
    if (myThreat > defThreat * 2) return true; // overwhelming force: strike without waiting to gather more
    if (group.length >= 2 && myThreat > defThreat * 1.2) return true;
    return group.length >= SIEGE_GATHER_MAX;
  }
  function findOpportunityTarget(game, p, army, ctx) {
    const myThreat = threatOfArmies(game, [army.id]);
    for (const n of S().neighbors(game, army.hex)) {
      const hostileArmies = S().armiesAt(game, n).filter(a => (a.owner >= 0 && ctx.atWarWith.includes(a.owner)) || a.owner === -1);
      if (hostileArmies.length) {
        const th = threatOfArmies(game, hostileArmies.map(a => a.id));
        if (th === 0 || myThreat > th * EXPEDITION_MARGIN) return n;
        continue;
      }
      const st = S().structureAt(game, n);
      if (st && (st.kind === 'wonder' || st.kind === 'infestation') && !st.cleared && st.guardArmyId >= 0) {
        const guard = S().army(game, st.guardArmyId);
        const th = guard ? threatOfArmies(game, [guard.id]) : 0;
        if (myThreat > th * EXPEDITION_MARGIN) return n;
      }
    }
    return null;
  }
  function doAttack(game, p, army, targetHex, ctx) {
    const defenderArmies = S().armiesAt(game, targetHex).filter(a => a.owner !== p.id);
    const cityHere = S().cityAt(game, targetHex);
    const defenderPid = cityHere ? cityHere.owner : (defenderArmies[0] ? defenderArmies[0].owner : -1);
    const defender = defenderPid >= 0 ? S().player(game, defenderPid) : null;
    const defIds = defenderArmies.map(a => a.id);
    if (cityHere && cityHere.garrisonArmyId >= 0 && !defIds.includes(cityHere.garrisonArmyId)) defIds.push(cityHere.garrisonArmyId);
    if (defender && defender.isHuman && game.settings && game.settings.manualDefense) {
      game.pendingBattles = game.pendingBattles || [];
      game.pendingBattles.push({ battleSetup: { attackerArmyIds: [army.id], defenderArmyIds: defIds, hexIdx: targetHex, siege: !!cityHere } });
      ctx.counts.battlesQueued = (ctx.counts.battlesQueued || 0) + 1;
      return;
    }
    let result = null;
    if (has(R(), 'attackTarget')) { try { result = R().attackTarget(game, army, targetHex); } catch (e) { warn('attackTarget', e); } }
    if (!result && has(CB(), 'create') && has(CB(), 'autoResolve')) {
      try {
        const battle = CB().create(game, { attackerArmyIds: [army.id], defenderArmyIds: defIds, hexIdx: targetHex, siege: !!cityHere });
        result = call(CB(), 'autoResolve', [game, battle], null);
      } catch (e) { warn('combat fallback', e); }
    }
    if (result) ctx.counts.battles = (ctx.counts.battles || 0) + 1;
  }
  function retreatHome(game, p, army, ctx) {
    const home = nearestOwnCity(game, ctx.cities, army.hex);
    if (!home) return;
    if (army.hex === home.hex) { army.aiRole = 'defense'; army.aiTarget = home.hex; return; }
    moveArmyToward(game, army, home.hex, ctx);
  }
  function actArmy(game, p, army, ctx) {
    if (armyHpFrac(game, army) < 0.5 && army.aiRole !== 'defense') { retreatHome(game, p, army, ctx); return; }
    const opp = findOpportunityTarget(game, p, army, ctx);
    if (opp !== null) { doAttack(game, p, army, opp, ctx); return; }
    if (army.aiRole === 'siege' || army.aiRole === 'expedition') {
      const target = army.aiTarget;
      if (target === null || target === undefined) return;
      const dist = Hex().distIdx(army.hex, target, game.W);
      if (dist <= 1 && (army.aiRole === 'expedition' || readyToSiege(game, p, army, ctx))) { doAttack(game, p, army, target, ctx); return; }
      moveArmyToward(game, army, target, ctx);
      return;
    }
    if (army.aiRole === 'defense' && army.hex !== army.aiTarget) moveArmyToward(game, army, army.aiTarget, ctx);
  }
  function tryMerge(game, keep, other) {
    const fn = R() && R().mergeArmies;
    if (typeof fn !== 'function') return null;
    try { return fn.length >= 3 ? fn(game, keep, other) : fn(game, [keep.id, other.id]); } catch (e) { warn('mergeArmies', e); return null; }
  }
  function mergeStacks(game, p, ctx) {
    const cap = (R() && R().C && R().C.UNITS_PER_ARMY) || 6;
    const byHex = new Map();
    for (const a of ctx.armies) { if (!a.units.length) continue; if (!byHex.has(a.hex)) byHex.set(a.hex, []); byHex.get(a.hex).push(a); }
    for (const list of byHex.values()) {
      if (list.length < 2) continue;
      let total = 0; for (const a of list) total += a.units.length;
      if (total > cap) continue;
      if (!list.some(a => armyHpFrac(game, a) < 0.98)) continue;
      const keep = list.slice().sort((a, b) => b.units.length - a.units.length)[0];
      for (const a of list) {
        if (a === keep) continue;
        if (tryMerge(game, keep, a)) ctx.counts.merges = (ctx.counts.merges || 0) + 1;
      }
    }
  }
  function runMilitary(game, p, ctx) {
    if (!ctx.threatenedCities) ctx.threatenedCities = computeThreatenedCities(game, p, ctx);
    assignRoles(game, p, ctx);
    mergeStacks(game, p, ctx);
    for (const army of ctx.armies) {
      if (ctx.timeLeft() < 8) break;
      if (!army.units.length) continue;
      actArmy(game, p, army, ctx);
    }
  }

  // ==================================================================== victory pursuit
  function runVictoryPursuit(game, p, ctx) {
    if (ctx.personality !== 'scholar' || !has(R(), 'startMagicVictory') || p.magicVictory) return;
    const tier5 = (p.tomes || []).some(id => { try { return Data().get('tomes', id).tier === 5; } catch (e) { return false; } });
    if (!tier5 || !(p.annexedWonders || []).length) return;
    const r = call(R(), 'startMagicVictory', [game, p], null);
    if (r && r.ok) ctx.counts.magicVictory = 1;
  }

  // ==================================================================== logging
  function pushLog(game, p, ctx, ms) {
    if (!game.log) game.log = [];
    const c = ctx.counts;
    const parts = [];
    if (c.wars) parts.push(c.wars + ' war');
    if (c.recruits) parts.push(c.recruits + ' recruit');
    if (c.annexes) parts.push(c.annexes + ' annex');
    if (c.outposts) parts.push(c.outposts + ' outpost');
    if (c.upgrades) parts.push(c.upgrades + ' upgrade');
    if (c.battles) parts.push(c.battles + ' battle');
    if (c.battlesQueued) parts.push(c.battlesQueued + ' queued battle');
    if (c.spells) parts.push(c.spells + ' spell');
    if (c.empireSkills) parts.push(c.empireSkills + ' skill');
    if (c.moves) parts.push(c.moves + ' move');
    const summary = parts.length ? parts.join(', ') : t('ai.log.idle');
    const text = t('ai.log.summary', { name: p.name || ('P' + p.id), personality: ctx.personality, summary, ms: Math.round(ms) });
    game.log.push({ turn: game.turn, pid: p.id, kind: 'ai', text });
    if (game.log.length > 500) game.log.splice(0, game.log.length - 500);
  }

  // ==================================================================== entry point
  AI.playTurn = function (game, pid) {
    if (!game || !AOW.State) return;
    const t0 = now();
    let p; try { p = S().player(game, pid); } catch (e) { warn('player', e); return; }
    if (!p || p.alive === false) return;
    call(R(), 'ensurePlayer', [game, p], null);
    const ctx = buildContext(game, p, t0);
    try { runDiplomacy(game, p, ctx); } catch (e) { warn('diplomacy', e); }
    if (ctx.timeLeft() > 20) { try { runEconomy(game, p, ctx); } catch (e) { warn('economy', e); } }
    if (ctx.timeLeft() > 20) { try { runExpansion(game, p, ctx); } catch (e) { warn('expansion', e); } }
    if (ctx.timeLeft() > 15) { try { runResearch(game, p, ctx); } catch (e) { warn('research', e); } }
    if (ctx.timeLeft() > 15) { try { runSpells(game, p, ctx); } catch (e) { warn('spells', e); } }
    if (ctx.timeLeft() > 10) { try { runHeroes(game, p, ctx); } catch (e) { warn('heroes', e); } }
    if (ctx.timeLeft() > 10) { try { runEmpireSkills(game, p, ctx); } catch (e) { warn('empireSkills', e); } }
    if (ctx.timeLeft() > 10) { try { runFreeCities(game, p, ctx); } catch (e) { warn('freeCities', e); } }
    if (ctx.timeLeft() > 15) { try { runMilitary(game, p, ctx); } catch (e) { warn('military', e); } }
    try { runVictoryPursuit(game, p, ctx); } catch (e) { warn('victory', e); }
    try { pushLog(game, p, ctx, now() - t0); } catch (e) { /* ignore */ }
  };

  /** View model describing pid's current AI strategy — for debug/UI, never mutates game state. */
  AI.explain = function (game, pid) {
    const empty = { pid, personality: null, focus: null, cities: 0, armies: { defense: 0, expedition: 0, siege: 0, outpost: 0, idle: 0, total: 0 }, atWarWith: [], text: { ko: '', en: '' } };
    if (!game || !AOW.State) return empty;
    let p; try { p = S().player(game, pid); } catch (e) { return empty; }
    if (!p) return empty;
    const personality = PERSONALITIES.includes(p.personality) ? p.personality : 'expansionist';
    const cities = S().playerCities(game, pid).length;
    const armies = S().playerArmies(game, pid);
    const roles = { defense: 0, expedition: 0, siege: 0, outpost: 0, idle: 0 };
    for (const a of armies) { const r = roles.hasOwnProperty(a.aiRole) ? a.aiRole : 'idle'; roles[r]++; }
    const atWar = [];
    if (D()) for (const o of game.players) if (o.id !== pid && call(D(), 'atWar', [game, pid, o.id], false)) atWar.push(o.id);
    const focus = atWar.length || roles.siege > 0 ? 'war' : (personality === 'expansionist' ? 'expansion' : personality === 'scholar' ? 'research' : 'economy');
    const names = atWar.map(o => (game.players[o] && game.players[o].name) || ('#' + o));
    const summary = `${p.name || ('Player ' + pid)} (${personality}) — ${cities} cities, ${armies.length} armies ` +
      `(def ${roles.defense}/exp ${roles.expedition}/siege ${roles.siege}). ` +
      (atWar.length ? `At war with ${names.join(', ')}.` : 'At peace.') +
      (p.research && p.research.current ? ` Researching.` : '');
    return { pid, personality, focus, cities, armies: { defense: roles.defense, expedition: roles.expedition, siege: roles.siege, outpost: roles.outpost, idle: roles.idle, total: armies.length }, atWarWith: atWar, text: { ko: summary, en: summary } };
  };

  AOW.AI = AI;
})(window.AOW = window.AOW || {});
