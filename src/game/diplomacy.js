// src/game/diplomacy.js — relations, treaties, proposals, war & peace, AI responses (SPEC §5 "Diplomacy")
//
// SPEC contract: Diplomacy.propose(game, from, to, kind, terms), Diplomacy.aiRespond, Diplomacy.declareWar,
//                Diplomacy.opinion(game, a, b), Diplomacy.tick(game)
// Additive API (documented per Ground Rule 0; every helper is defensive and never throws on missing modules):
//   Diplomacy.STATES   'peace'|'war'|'alliance'|'defensive_pact'|'non_aggression'|'truce'
//   Diplomacy.KINDS    proposal kinds: peace|non_aggression|defensive_pact|alliance|open_borders|trade|demand|declare_war|break_treaty|gift
//   Diplomacy.C        tunables (truce length, decay rates, grievance values, AI proposal interval …)
//   Diplomacy.rel(game, a, b)        a's relation record toward b (player.diplomacy[b], lazily extended):
//        { state, opinion, grievances:[{kind,value,turn}], treaties:[{kind,since,turns,terms,initiator}], truce,
//          warScore, warSince, weariness, mood, gifts, lastProposalTurn }
//   Diplomacy.state(game,a,b) / atWar / isAllied / hasTreaty(game,a,b,kind) / canDeclareWar(game,a,b)
//   Diplomacy.canPropose(game, from, to, kind, terms) → {ok, reason:{ko,en}}
//   Diplomacy.propose(...) → {ok, accepted?, pending?, reason:{ko,en}, proposal}
//        AI recipients answer at once (aiRespond); human recipients get the proposal queued in game.pendingProposals
//        and Events 'diplomacy:proposal' {from,to,kind,terms,proposal}; answer with Diplomacy.resolve(game, proposal, accept).
//   Diplomacy.pending(game, pid) → proposals awaiting player pid
//   Diplomacy.declareWar(game, a, b, opts) (drags allies / defensive pacts), Diplomacy.makePeace(game, a, b) (→ truce)
//   Diplomacy.addGrievance(game, victim, culprit, kind, value?) ; Diplomacy.grievanceTotal(game, a, b)
//   Diplomacy.opinion(game,a,b) → −100..100 recomputed from factors ; Diplomacy.opinionFactors(game,a,b) → [{key,label:{ko,en},value}]
//   Diplomacy.strength(game, pid) → military strength estimate (Combat.threat, cached per turn) ; strengthRatio(game,a,b)
//   Diplomacy.recordBattle(game, winnerPid, loserPid, value) / recordCapture(game, taker, loser) → war score + grievances
//   Diplomacy.tick(game)  once per game turn (guarded by game.diplomacyTurn): drift/decay, truce & treaty countdown,
//        trade transfers, trespass grievances, proposal expiry, AI proposals (~1 per AI per 8 turns), AI war/peace decisions
//   Diplomacy.summary(game, a, b) → view model for the diplomacy screen
//   Diplomacy.stateName(state) / kindName(kind) → {ko,en}
//   Extra player fields used: player.reputation (treaty keeping, ±), player.ai.lastWarTurn ; game.pendingProposals ; game.log entries kind 'diplomacy'
(function (AOW) {
  'use strict';
  const Diplomacy = {};
  const S = () => AOW.State;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const R = (ko, en) => ({ ko, en });
  const fn = (ns, name) => AOW[ns] && typeof AOW[ns][name] === 'function' ? AOW[ns][name] : null;

  Diplomacy.STATES = ['peace', 'war', 'alliance', 'defensive_pact', 'non_aggression', 'truce'];
  Diplomacy.KINDS = ['peace', 'non_aggression', 'defensive_pact', 'alliance', 'open_borders', 'trade', 'demand', 'declare_war', 'break_treaty', 'gift'];
  Diplomacy.TREATIES = ['open_borders', 'trade', 'non_aggression', 'defensive_pact', 'alliance'];
  const FRIENDLY = { alliance: 3, defensive_pact: 2, non_aggression: 1, truce: 0, peace: 0, war: -1 };

  const C = Diplomacy.C = {
    TRUCE_TURNS: 10, NAP_TURNS: 20, TRADE_TURNS: 10, PROPOSAL_EXPIRE: 3,
    AI_PROPOSAL_INTERVAL: 8, AI_WAR_COOLDOWN: 10, MIN_WAR_TURN: 10, PEACE_RETRY: 4,
    GRIEVANCE_DECAY: 0.95, GRIEVANCE_CAP: 60, MOOD_DECAY: 0.88, GIFT_DECAY: 0.9, GIFT_CAP: 30,
    WAR_OPINION: -50, BORDER_RADIUS: 8, BORDER_PENALTY: 5, BORDER_CAP: 15, COMMON_ENEMY: 10, COMMON_ENEMY_CAP: 20,
    TREATY_OPINION: { open_borders: 5, trade: 5, non_aggression: 10, defensive_pact: 15, alliance: 25, truce: 5 },
    GRIEVANCE: { trespass: 2, attacked: 15, city_taken: 30, broken_treaty: 30, refused_demand: 8, insult: 10, unjust_war: 20, outpost_near: 5, ally_war: 10, vassal_taken: 10, demand: 6 },
    WEARINESS_PER_TURN: 1, WEARINESS_PER_LOSS: 0.5, REPUTATION_BREAK: -10, REPUTATION_KEEP: 1, REPUTATION_CAP: 30,
    RESOURCE_VALUE: { gold: 1, mana: 1.2, knowledge: 1.1, imperium: 2 },
    LOG_MAX: 400,
  };

  // ------------------------------------------------------------------ i18n
  if (AOW.I18n && typeof AOW.I18n.add === 'function') {
    AOW.I18n.add({
      ko: {
        'dip.state.peace': '평화', 'dip.state.war': '전쟁', 'dip.state.alliance': '동맹', 'dip.state.defensive_pact': '방위 협정', 'dip.state.non_aggression': '불가침 조약', 'dip.state.truce': '휴전',
        'dip.kind.peace': '평화 협정', 'dip.kind.non_aggression': '불가침 조약', 'dip.kind.defensive_pact': '방위 협정', 'dip.kind.alliance': '동맹', 'dip.kind.open_borders': '국경 개방',
        'dip.kind.trade': '교역', 'dip.kind.demand': '공물 요구', 'dip.kind.declare_war': '선전포고', 'dip.kind.break_treaty': '조약 파기', 'dip.kind.gift': '선물',
        'dip.factor.affinity': '친화 유사성', 'dip.factor.personality': '성향', 'dip.factor.grievances': '불만', 'dip.factor.border': '국경 마찰', 'dip.factor.gifts': '선물',
        'dip.factor.treaties': '조약', 'dip.factor.commonEnemies': '공동의 적', 'dip.factor.vassals': '봉신 경쟁', 'dip.factor.war': '전쟁 중', 'dip.factor.reputation': '평판',
        'dip.factor.bonus': '외교 보너스', 'dip.factor.mood': '최근 사건', 'dip.factor.truce': '휴전',
        'dip.opinion.hostile': '적대적', 'dip.opinion.unfriendly': '비우호적', 'dip.opinion.neutral': '중립', 'dip.opinion.friendly': '우호적', 'dip.opinion.admiring': '매우 우호적',
        'dip.msg.proposal': '{from:이/가} {kind:을/를} 제안했습니다.', 'dip.msg.accepted': '{who:이/가} {kind:을/를} 수락했습니다.', 'dip.msg.declined': '{who:이/가} {kind:을/를} 거절했습니다.',
        'dip.msg.warDeclared': '{from:이/가} {to}에게 선전포고했습니다!', 'dip.msg.peace': '{a:과/와} {b:이/가} 평화를 맺었습니다.', 'dip.msg.treatyBroken': '{who:이/가} {kind:을/를} 파기했습니다.',
        'dip.msg.gift': '{from:이/가} {to}에게 선물을 보냈습니다.', 'dip.msg.demand': '{from:이/가} {to}에게 공물을 요구했습니다.', 'dip.msg.joinedWar': '{who:이/가} 동맹을 따라 {to:과/와}의 전쟁에 참전했습니다.',
        'dip.msg.truceEnded': '{a:과/와} {b}의 휴전이 끝났습니다.', 'dip.msg.napExpired': '{a:과/와} {b}의 불가침 조약이 만료되었습니다.', 'dip.msg.tradeLapsed': '{a:과/와} {b}의 교역이 중단되었습니다.',
      },
      en: {
        'dip.state.peace': 'Peace', 'dip.state.war': 'War', 'dip.state.alliance': 'Alliance', 'dip.state.defensive_pact': 'Defensive Pact', 'dip.state.non_aggression': 'Non-Aggression Pact', 'dip.state.truce': 'Truce',
        'dip.kind.peace': 'Peace Treaty', 'dip.kind.non_aggression': 'Non-Aggression Pact', 'dip.kind.defensive_pact': 'Defensive Pact', 'dip.kind.alliance': 'Alliance', 'dip.kind.open_borders': 'Open Borders',
        'dip.kind.trade': 'Trade', 'dip.kind.demand': 'Demand Tribute', 'dip.kind.declare_war': 'Declaration of War', 'dip.kind.break_treaty': 'Break Treaty', 'dip.kind.gift': 'Gift',
        'dip.factor.affinity': 'Affinity similarity', 'dip.factor.personality': 'Personality', 'dip.factor.grievances': 'Grievances', 'dip.factor.border': 'Border friction', 'dip.factor.gifts': 'Gifts',
        'dip.factor.treaties': 'Treaties', 'dip.factor.commonEnemies': 'Common enemies', 'dip.factor.vassals': 'Vassal rivalry', 'dip.factor.war': 'At war', 'dip.factor.reputation': 'Reputation',
        'dip.factor.bonus': 'Diplomatic bonus', 'dip.factor.mood': 'Recent events', 'dip.factor.truce': 'Truce',
        'dip.opinion.hostile': 'Hostile', 'dip.opinion.unfriendly': 'Unfriendly', 'dip.opinion.neutral': 'Neutral', 'dip.opinion.friendly': 'Friendly', 'dip.opinion.admiring': 'Admiring',
        'dip.msg.proposal': '{from} proposes {kind}.', 'dip.msg.accepted': '{who} accepted {kind}.', 'dip.msg.declined': '{who} declined {kind}.',
        'dip.msg.warDeclared': '{from} declared war on {to}!', 'dip.msg.peace': '{a} and {b} made peace.', 'dip.msg.treatyBroken': '{who} broke {kind}.',
        'dip.msg.gift': '{from} sent a gift to {to}.', 'dip.msg.demand': '{from} demands tribute from {to}.', 'dip.msg.joinedWar': '{who} joined the war against {to} alongside an ally.',
        'dip.msg.truceEnded': 'The truce between {a} and {b} has ended.', 'dip.msg.napExpired': 'The non-aggression pact between {a} and {b} expired.', 'dip.msg.tradeLapsed': 'Trade between {a} and {b} lapsed.',
      },
    });
  }
  const t = (key, params) => (typeof AOW.t === 'function' ? AOW.t(key, params) : key);
  Diplomacy.stateName = state => R(t('dip.state.' + state), (AOW.I18n && AOW.I18n.dict && AOW.I18n.dict.en['dip.state.' + state]) || state);
  Diplomacy.kindName = kind => R(t('dip.kind.' + kind), (AOW.I18n && AOW.I18n.dict && AOW.I18n.dict.en['dip.kind.' + kind]) || kind);
  const pname = (game, pid) => { const p = game.players[pid]; return p ? p.name : ('#' + pid); };

  // ------------------------------------------------------------------ per-turn caches (never serialized)
  const caches = new WeakMap();
  function cache(game) {
    let c = caches.get(game);
    if (!c || c.turn !== game.turn) { c = { turn: game.turn, strength: {}, bonus: {} }; caches.set(game, c); }
    return c;
  }

  // ------------------------------------------------------------------ relation records
  /** a's relation record toward b (created and upgraded lazily). */
  Diplomacy.rel = function (game, a, b) {
    const p = game && game.players && game.players[a];
    if (!p || a === b || !game.players[b]) return null;
    if (!p.diplomacy) p.diplomacy = {};
    let r = p.diplomacy[b];
    if (!r) r = p.diplomacy[b] = { state: 'peace', opinion: 0, grievances: [], treaties: [], truce: 0 };
    if (r.warScore === undefined) Object.assign(r, { warScore: 0, warSince: -1, weariness: 0, mood: 0, gifts: 0, lastProposalTurn: -99 });
    if (!Array.isArray(r.grievances)) r.grievances = [];
    if (!Array.isArray(r.treaties)) r.treaties = [];
    if (!Diplomacy.STATES.includes(r.state)) r.state = 'peace';
    return r;
  };
  Diplomacy.state = function (game, a, b) { const r = Diplomacy.rel(game, a, b); return r ? r.state : 'peace'; };
  Diplomacy.atWar = (game, a, b) => a !== b && Diplomacy.state(game, a, b) === 'war';
  Diplomacy.isAllied = (game, a, b) => a !== b && Diplomacy.state(game, a, b) === 'alliance';
  Diplomacy.isFriendly = (game, a, b) => a !== b && FRIENDLY[Diplomacy.state(game, a, b)] >= 1;
  Diplomacy.hasTreaty = function (game, a, b, kind) {
    const r = Diplomacy.rel(game, a, b);
    if (!r) return false;
    if (r.state === kind) return true;
    return r.treaties.some(tr => tr.kind === kind);
  };
  /** Alive players other than pid. */
  function others(game, pid) { const out = []; for (const p of game.players) if (p.id !== pid && p.alive !== false) out.push(p.id); return out; }
  function alive(game, pid) { const p = game.players[pid]; return !!p && p.alive !== false; }
  function isAI(game, pid) { const p = game.players[pid]; return !!p && !p.isHuman; }

  // ------------------------------------------------------------------ logging & notifications
  function logLine(game, pid, text) {
    if (!game.log) game.log = [];
    game.log.push({ turn: game.turn, pid, kind: 'diplomacy', text });
    if (game.log.length > C.LOG_MAX) game.log.splice(0, game.log.length - C.LOG_MAX);
  }
  function notify(game, pids, kind, text) {
    const humanInvolved = pids.some(pid => game.players[pid] && game.players[pid].isHuman);
    if (!humanInvolved || !AOW.Events) return;
    try { AOW.Events.emit('notify', { kind, text, icon: 'crown' }); } catch (e) { /* ignore */ }
  }
  function emit(name, payload) { if (AOW.Events) { try { AOW.Events.emit(name, payload); } catch (e) { /* ignore */ } } }

  // ------------------------------------------------------------------ strength
  function fallbackArmyStrength(game, army) {
    let s = 0;
    for (const uid of army.units) {
      const u = S().unit(game, uid); if (!u) continue;
      const type = S().unitType(u);
      const hpFrac = u.maxHp > 0 ? clamp(u.hp / u.maxHp, 0.1, 1) : 1;
      s += ((type.tier || 1) * 12 + 8) * hpFrac * (1 + 0.1 * (u.rank || 0)) * (u.heroId !== null && u.heroId >= 0 ? 1.5 : 1);
    }
    return s;
  }
  /** Army strength (Combat.threat when present, else a tier/hp estimate). */
  Diplomacy.armyStrength = function (game, army) {
    const threat = fn('Combat', 'threat');
    if (threat) {
      try { const v = threat(game, [army.id]); if (typeof v === 'number' && isFinite(v) && v > 0) return v; } catch (e) { /* fall through */ }
    }
    return fallbackArmyStrength(game, army);
  };
  /** Total military strength of a player, cached per turn. */
  Diplomacy.strength = function (game, pid) {
    const c = cache(game);
    if (c.strength[pid] !== undefined) return c.strength[pid];
    let s = 0;
    for (const a of game.armies) if (a.owner === pid) s += Diplomacy.armyStrength(game, a);
    c.strength[pid] = s;
    return s;
  };
  Diplomacy.strengthRatio = function (game, a, b) {
    const sa = Diplomacy.strength(game, a), sb = Diplomacy.strength(game, b);
    return (sa + 10) / (sb + 10);
  };

  // ------------------------------------------------------------------ opinion model
  function normalizedAffinity(p) {
    const aff = p.affinity || {};
    const keys = (S() && S().AFFINITIES) || ['order', 'chaos', 'nature', 'materium', 'astral', 'shadow'];
    let sum = 0; for (const k of keys) sum += Math.max(0, aff[k] || 0);
    const out = {};
    for (const k of keys) out[k] = sum > 0 ? Math.max(0, aff[k] || 0) / sum : 1 / keys.length;
    return out;
  }
  function affinitySimilarity(pa, pb) {
    const na = normalizedAffinity(pa), nb = normalizedAffinity(pb);
    let sim = 0; for (const k of Object.keys(na)) sim += Math.min(na[k], nb[k] || 0);
    return sim; // 0..1
  }
  const PERS_SELF = { diplomat: 8, scholar: 3, expansionist: 0, defender: 0, militarist: -8 };
  const PERS_OTHER = { diplomat: 5, scholar: 2, expansionist: -3, defender: 0, militarist: -6 };
  function borderFriction(game, a, b) {
    const Hx = AOW.Hex; if (!Hx) return 0;
    const ca = game.cities.filter(c => c.owner === a), cb = game.cities.filter(c => c.owner === b);
    let pairs = 0;
    for (const x of ca) for (const y of cb) if (Hx.distIdx(x.hex, y.hex, game.W) <= C.BORDER_RADIUS) pairs++;
    return -Math.min(C.BORDER_CAP, pairs * C.BORDER_PENALTY);
  }
  function commonEnemies(game, a, b) {
    let n = 0;
    for (const c of others(game, a)) if (c !== b && Diplomacy.atWar(game, a, c) && Diplomacy.atWar(game, b, c)) n++;
    return n;
  }
  function vassalCount(game, pid) { let n = 0; for (const c of game.cities) if (c.freeCity && c.freeCity.vassalOf === pid) n++; return n; }
  /** Sum of `diplomacyOpinion` effects a player projects (culture sub-choice, empire skills, buildings), capped. */
  Diplomacy.playerOpinionBonus = function (game, pid) {
    const c = cache(game);
    if (c.bonus[pid] !== undefined) return c.bonus[pid];
    const p = game.players[pid]; const D = AOW.Data;
    let v = 0;
    if (p && D) {
      try {
        if (p.subChoice && D.has('cultures', p.cultureId)) {
          const sc = (D.get('cultures', p.cultureId).subChoices || []).find(s => s.id === p.subChoice);
          if (sc && sc.effects) v += sc.effects.diplomacyOpinion || 0;
        }
        for (const id of p.empireSkills || []) if (D.has('empireSkills', id)) v += (D.get('empireSkills', id).effects || {}).diplomacyOpinion || 0;
        for (const city of game.cities) if (city.owner === pid) for (const bid of city.buildings || []) if (D.has('buildings', bid)) v += (D.get('buildings', bid).effects || {}).diplomacyOpinion || 0;
        for (const id of p.traits || []) if (D.has('traits', id)) v += (D.get('traits', id).effects || {}).diplomacyOpinion || 0;
      } catch (e) { /* ignore data problems */ }
    }
    v = clamp(v, -25, 25);
    c.bonus[pid] = v;
    return v;
  };
  Diplomacy.grievanceTotal = function (game, a, b) {
    const r = Diplomacy.rel(game, a, b); if (!r) return 0;
    let s = 0; for (const g of r.grievances) s += g.value || 0;
    return s;
  };
  /**
   * Opinion factors of a toward b. Each entry {key, label:{ko,en}, value}.
   */
  Diplomacy.opinionFactors = function (game, a, b) {
    const pa = game.players[a], pb = game.players[b];
    const out = [];
    if (!pa || !pb || a === b) return out;
    const r = Diplomacy.rel(game, a, b);
    const add = (key, value) => { if (value) out.push({ key, label: R(t('dip.factor.' + key), key), value: Math.round(value) }); };
    add('affinity', (affinitySimilarity(pa, pb) - 0.35) * 50);
    add('personality', (PERS_SELF[pa.personality] || 0) + (PERS_OTHER[pb.personality] || 0));
    add('grievances', -Math.min(C.GRIEVANCE_CAP, Diplomacy.grievanceTotal(game, a, b)));
    if (r.state !== 'alliance') add('border', borderFriction(game, a, b) * (pa.personality === 'expansionist' ? 1.3 : 1));
    add('gifts', Math.min(C.GIFT_CAP, r.gifts || 0));
    let treaty = C.TREATY_OPINION[r.state] || 0;
    for (const tr of r.treaties) if (tr.kind !== r.state) treaty += C.TREATY_OPINION[tr.kind] || 0;
    add('treaties', treaty);
    add('commonEnemies', Math.min(C.COMMON_ENEMY_CAP, commonEnemies(game, a, b) * C.COMMON_ENEMY));
    add('vassals', -Math.min(8, vassalCount(game, b) * 2));
    if (r.state === 'war') add('war', C.WAR_OPINION);
    add('reputation', clamp((pb.reputation || 0) * 0.5, -15, 15));
    add('bonus', Diplomacy.playerOpinionBonus(game, b));
    add('mood', clamp(r.mood || 0, -40, 40));
    return out;
  };
  /** Recomputed opinion of a toward b, −100..100. */
  Diplomacy.opinion = function (game, a, b) {
    if (!game || a === b || !game.players[a] || !game.players[b]) return 0;
    let v = 0;
    for (const f of Diplomacy.opinionFactors(game, a, b)) v += f.value;
    return clamp(Math.round(v), -100, 100);
  };
  Diplomacy.opinionLabel = function (v) {
    const key = v <= -50 ? 'hostile' : v < -15 ? 'unfriendly' : v < 15 ? 'neutral' : v < 50 ? 'friendly' : 'admiring';
    return { key, label: R(t('dip.opinion.' + key), key) };
  };

  // ------------------------------------------------------------------ grievances, war score
  /** victim gains a grievance against culprit. */
  Diplomacy.addGrievance = function (game, victim, culprit, kind, value) {
    const r = Diplomacy.rel(game, victim, culprit); if (!r) return null;
    const v = value !== undefined ? value : (C.GRIEVANCE[kind] || 5);
    const last = r.grievances[r.grievances.length - 1];
    if (last && last.kind === kind && last.turn === game.turn) { last.value += v; return last; }
    const g = { kind, value: v, turn: game.turn };
    r.grievances.push(g);
    if (r.grievances.length > 24) r.grievances.splice(0, r.grievances.length - 24);
    return g;
  };
  /** War score bookkeeping after a battle between two players (value ≈ strength destroyed). */
  Diplomacy.recordBattle = function (game, winner, loser, value) {
    if (winner < 0 || loser < 0 || winner === loser) return;
    const v = Math.max(1, Math.round(value || 10));
    const rw = Diplomacy.rel(game, winner, loser), rl = Diplomacy.rel(game, loser, winner);
    if (rw) rw.warScore += v;
    if (rl) { rl.warScore -= v; rl.weariness += C.WEARINESS_PER_LOSS * Math.min(10, v / 10); }
    if (rl && rl.state !== 'war') Diplomacy.addGrievance(game, loser, winner, 'attacked');
  };
  Diplomacy.recordCapture = function (game, taker, loser) {
    if (taker < 0 || loser < 0 || taker === loser) return;
    Diplomacy.recordBattle(game, taker, loser, 30);
    Diplomacy.addGrievance(game, loser, taker, 'city_taken');
    for (const c of others(game, taker)) if (c !== loser && Diplomacy.isFriendly(game, c, loser)) Diplomacy.addGrievance(game, c, taker, 'ally_war', 6);
  };
  if (AOW.Events && typeof AOW.Events.on === 'function') {
    AOW.Events.on('city:captured', p => {
      try { const g = AOW.game; if (g && p && p.from >= 0 && p.to >= 0) Diplomacy.recordCapture(g, p.to, p.from); } catch (e) { /* ignore */ }
    });
    AOW.Events.on('battle:end', p => {
      try {
        const g = AOW.game; if (!g || !p || !p.battle) return;
        const b = p.battle, res = p.result || {};
        const owners = battleOwners(g, b);
        if (owners.att < 0 || owners.def < 0 || owners.att === owners.def) return;
        const winnerSide = res.winner !== undefined ? res.winner : b.winner;
        if (winnerSide !== 0 && winnerSide !== 1) return;
        const w = winnerSide === 0 ? owners.att : owners.def, l = winnerSide === 0 ? owners.def : owners.att;
        Diplomacy.recordBattle(g, w, l, 10);
      } catch (e) { /* ignore */ }
    });
  }
  function battleOwners(game, b) {
    const own = ids => { for (const id of ids || []) { const a = S().army(game, id); if (a) return a.owner; } return -1; };
    let att = b.attackerOwner !== undefined ? b.attackerOwner : own(b.attackerArmyIds);
    let def = b.defenderOwner !== undefined ? b.defenderOwner : own(b.defenderArmyIds);
    if ((att < 0 || def < 0) && Array.isArray(b.units)) {
      for (const u of b.units) { const gu = S().unit(game, u.gameUnitId); if (!gu) continue; if (u.side === 0 && att < 0) att = gu.owner; if (u.side === 1 && def < 0) def = gu.owner; }
    }
    return { att, def };
  }

  // ------------------------------------------------------------------ state changes
  function setState(game, a, b, state) {
    const ra = Diplomacy.rel(game, a, b), rb = Diplomacy.rel(game, b, a);
    if (!ra || !rb) return;
    const prev = ra.state;
    ra.state = state; rb.state = state;
    if (state === 'war') { ra.warSince = rb.warSince = game.turn; ra.warScore = rb.warScore = 0; }
    if (state !== 'war' && prev === 'war') { ra.warSince = rb.warSince = -1; }
    if (state !== 'truce') { ra.truce = rb.truce = 0; }
    // exclusive states drop the same-kind treaty entries; war drops everything
    const keep = tr => state !== 'war' && tr.kind !== state && !(state === 'peace' && (tr.kind === 'non_aggression' || tr.kind === 'defensive_pact' || tr.kind === 'alliance'));
    ra.treaties = ra.treaties.filter(keep); rb.treaties = rb.treaties.filter(keep);
    emit('diplomacy:changed', { a, b, state, prev });
  }
  Diplomacy.setState = setState;
  function addTreaty(game, a, b, kind, terms, turns, initiator) {
    for (const [x, y] of [[a, b], [b, a]]) {
      const r = Diplomacy.rel(game, x, y); if (!r) continue;
      r.treaties = r.treaties.filter(tr => tr.kind !== kind || kind === 'trade');
      r.treaties.push({ kind, since: game.turn, turns: turns || 0, terms: terms ? JSON.parse(JSON.stringify(terms)) : null, initiator: initiator === undefined ? a : initiator });
    }
  }
  function removeTreaty(game, a, b, kind) {
    for (const [x, y] of [[a, b], [b, a]]) { const r = Diplomacy.rel(game, x, y); if (r) r.treaties = r.treaties.filter(tr => tr.kind !== kind); }
  }
  function bumpReputation(game, pid, delta) {
    const p = game.players[pid]; if (!p) return;
    p.reputation = clamp((p.reputation || 0) + delta, -C.REPUTATION_CAP, C.REPUTATION_CAP);
  }

  Diplomacy.canDeclareWar = function (game, a, b) {
    if (!alive(game, a) || !alive(game, b) || a === b) return { ok: false, reason: R('대상이 없습니다.', 'No such player.') };
    const r = Diplomacy.rel(game, a, b);
    if (r.state === 'war') return { ok: false, reason: R('이미 전쟁 중입니다.', 'Already at war.') };
    if (r.state === 'truce' && r.truce > 0) return { ok: false, reason: R('휴전 중에는 선전포고할 수 없습니다.', 'Cannot declare war during a truce.') };
    return { ok: true, reason: null };
  };
  /**
   * a declares war on b. Breaking a pact/alliance costs reputation and grants grievances. Allies of b (alliance or
   * defensive pact) join against a; allies of a (alliance) join against b unless bound to b.
   * opts: {justified:boolean, silent:boolean, viaAlly:boolean}
   */
  Diplomacy.declareWar = function (game, a, b, opts) {
    opts = opts || {};
    const can = Diplomacy.canDeclareWar(game, a, b);
    if (!can.ok && !opts.force) return can;
    const r = Diplomacy.rel(game, a, b);
    const prev = r.state;
    const grievancesJustify = Diplomacy.grievanceTotal(game, a, b) >= 15;
    const justified = opts.justified !== undefined ? opts.justified : grievancesJustify;
    if (prev === 'alliance' || prev === 'defensive_pact' || prev === 'non_aggression' || (prev === 'truce' && r.truce > 0)) {
      Diplomacy.addGrievance(game, b, a, 'broken_treaty');
      bumpReputation(game, a, C.REPUTATION_BREAK);
      for (const c of others(game, a)) if (c !== b) { const rc = Diplomacy.rel(game, c, a); if (rc) rc.mood -= 12; }
    }
    if (!justified && !opts.viaAlly) {
      Diplomacy.addGrievance(game, b, a, 'unjust_war');
      for (const c of others(game, a)) if (c !== b) { const rc = Diplomacy.rel(game, c, a); if (rc) rc.mood -= 6; }
    }
    setState(game, a, b, 'war');
    const ra = Diplomacy.rel(game, a, b), rb = Diplomacy.rel(game, b, a);
    ra.mood -= 10; rb.mood -= 20;
    logLine(game, a, t('dip.msg.warDeclared', { from: pname(game, a), to: pname(game, b) }));
    if (!opts.silent) notify(game, [a, b], 'bad', t('dip.msg.warDeclared', { from: pname(game, a), to: pname(game, b) }));
    // drag allies
    for (const c of others(game, a)) {
      if (c === b) continue;
      const cb = Diplomacy.state(game, c, b), ca = Diplomacy.state(game, c, a);
      if ((cb === 'alliance' || cb === 'defensive_pact') && ca !== 'alliance' && ca !== 'war' && Diplomacy.canDeclareWar(game, c, a).ok) {
        Diplomacy.declareWar(game, c, a, { justified: true, viaAlly: true, silent: true });
        logLine(game, c, t('dip.msg.joinedWar', { who: pname(game, c), to: pname(game, a) }));
        notify(game, [c, a], 'warn', t('dip.msg.joinedWar', { who: pname(game, c), to: pname(game, a) }));
      } else if (ca === 'alliance' && cb !== 'alliance' && cb !== 'defensive_pact' && cb !== 'war' && !opts.viaAlly && Diplomacy.canDeclareWar(game, c, b).ok && FRIENDLY[cb] <= 0) {
        Diplomacy.declareWar(game, c, b, { justified: justified, viaAlly: true, silent: true });
        logLine(game, c, t('dip.msg.joinedWar', { who: pname(game, c), to: pname(game, b) }));
        notify(game, [c, b], 'warn', t('dip.msg.joinedWar', { who: pname(game, c), to: pname(game, b) }));
      }
    }
    return { ok: true, reason: null };
  };
  /** Ends a war with a truce of C.TRUCE_TURNS. */
  Diplomacy.makePeace = function (game, a, b) {
    if (!alive(game, a) || !alive(game, b) || a === b) return { ok: false };
    const r = Diplomacy.rel(game, a, b);
    if (r.state !== 'war') return { ok: false };
    setState(game, a, b, 'truce');
    const ra = Diplomacy.rel(game, a, b), rb = Diplomacy.rel(game, b, a);
    ra.truce = rb.truce = C.TRUCE_TURNS;
    ra.weariness = rb.weariness = 0;
    ra.warScore = rb.warScore = 0;
    ra.mood += 5; rb.mood += 5;
    logLine(game, a, t('dip.msg.peace', { a: pname(game, a), b: pname(game, b) }));
    notify(game, [a, b], 'good', t('dip.msg.peace', { a: pname(game, a), b: pname(game, b) }));
    return { ok: true };
  };

  // ------------------------------------------------------------------ proposals
  function resourceValue(res) { let v = 0; for (const k of Object.keys(res || {})) v += (res[k] || 0) * (C.RESOURCE_VALUE[k] || 1); return v; }
  function canAfford(p, res) { for (const k of Object.keys(res || {})) if ((res[k] || 0) > 0 && (p.resources[k] || 0) < res[k]) return false; return true; }
  function transfer(game, from, to, res) {
    const pf = game.players[from], pt = game.players[to];
    for (const k of Object.keys(res || {})) {
      const v = Math.max(0, res[k] || 0); if (!v) continue;
      if (pf && pf.resources) pf.resources[k] = (pf.resources[k] || 0) - v;
      if (pt && pt.resources) pt.resources[k] = (pt.resources[k] || 0) + v;
    }
  }
  function normTerms(kind, terms) {
    terms = terms || {};
    if (kind === 'gift' || kind === 'demand') return { gold: Math.max(0, Math.round(terms.gold || 0)), mana: Math.max(0, Math.round(terms.mana || 0)) };
    if (kind === 'trade') return { give: Object.assign({}, terms.give || {}), get: Object.assign({}, terms.get || {}), turns: Math.max(1, Math.round(terms.turns || C.TRADE_TURNS)) };
    if (kind === 'peace') return { gold: Math.max(0, Math.round(terms.gold || 0)) };
    if (kind === 'break_treaty') return { treaty: terms.treaty || null };
    return {};
  }
  /** Validates a proposal without sending it. */
  Diplomacy.canPropose = function (game, from, to, kind, terms) {
    if (!game || !alive(game, from) || !alive(game, to) || from === to) return { ok: false, reason: R('대상이 없습니다.', 'No such player.') };
    if (!Diplomacy.KINDS.includes(kind)) return { ok: false, reason: R('알 수 없는 제안입니다.', 'Unknown proposal kind.') };
    const r = Diplomacy.rel(game, from, to), st = r.state, pf = game.players[from];
    terms = normTerms(kind, terms);
    const war = st === 'war';
    switch (kind) {
      case 'peace': if (!war) return { ok: false, reason: R('전쟁 중이 아닙니다.', 'Not at war.') }; if (terms.gold && !canAfford(pf, terms)) return { ok: false, reason: R('자원이 부족합니다.', 'Cannot afford the terms.') }; break;
      case 'non_aggression': if (war) return { ok: false, reason: R('전쟁 중입니다.', 'At war.') }; if (FRIENDLY[st] >= 1) return { ok: false, reason: R('이미 더 강한 조약이 있습니다.', 'A stronger treaty already exists.') }; break;
      case 'defensive_pact': if (war) return { ok: false, reason: R('전쟁 중입니다.', 'At war.') }; if (FRIENDLY[st] >= 2) return { ok: false, reason: R('이미 더 강한 조약이 있습니다.', 'A stronger treaty already exists.') }; break;
      case 'alliance': if (st !== 'defensive_pact') return { ok: false, reason: R('동맹에는 방위 협정이 먼저 필요합니다.', 'An alliance requires a defensive pact first.') }; break;
      case 'open_borders': if (war) return { ok: false, reason: R('전쟁 중입니다.', 'At war.') }; if (Diplomacy.hasTreaty(game, from, to, 'open_borders')) return { ok: false, reason: R('이미 국경이 열려 있습니다.', 'Borders are already open.') }; break;
      case 'trade': if (war) return { ok: false, reason: R('전쟁 중입니다.', 'At war.') }; if (resourceValue(terms.give) <= 0 && resourceValue(terms.get) <= 0) return { ok: false, reason: R('교역 조건이 비어 있습니다.', 'Empty trade terms.') }; if (!canAfford(pf, terms.give)) return { ok: false, reason: R('자원이 부족합니다.', 'Cannot afford the terms.') }; break;
      case 'demand': if (war) return { ok: false, reason: R('전쟁 중입니다.', 'At war.') }; if (resourceValue(terms) <= 0) return { ok: false, reason: R('요구 조건이 비어 있습니다.', 'Empty demand.') }; break;
      case 'declare_war': { const c = Diplomacy.canDeclareWar(game, from, to); if (!c.ok) return c; break; }
      case 'break_treaty': if (!terms.treaty || !Diplomacy.hasTreaty(game, from, to, terms.treaty)) return { ok: false, reason: R('그런 조약이 없습니다.', 'No such treaty.') }; break;
      case 'gift': if (resourceValue(terms) <= 0) return { ok: false, reason: R('선물이 비어 있습니다.', 'Empty gift.') }; if (!canAfford(pf, terms)) return { ok: false, reason: R('자원이 부족합니다.', 'Cannot afford the gift.') }; break;
      default: break;
    }
    return { ok: true, reason: null, terms };
  };

  /**
   * Send a proposal. Unilateral kinds (declare_war, break_treaty, gift) apply at once. AI recipients answer
   * immediately; human recipients get it queued (game.pendingProposals) with Events 'diplomacy:proposal'.
   */
  Diplomacy.propose = function (game, from, to, kind, terms) {
    const can = Diplomacy.canPropose(game, from, to, kind, terms);
    if (!can.ok) return { ok: false, accepted: false, reason: can.reason, proposal: null };
    terms = can.terms;
    if (!game.nextId) game.nextId = {};
    if (!game.nextId.proposal) game.nextId.proposal = 1;
    const proposal = { id: game.nextId.proposal++, from, to, kind, terms, turn: game.turn };
    const r = Diplomacy.rel(game, from, to);
    r.lastProposalTurn = game.turn;
    if (kind === 'declare_war' || kind === 'break_treaty' || kind === 'gift') {
      applyProposal(game, proposal);
      return { ok: true, accepted: true, reason: null, proposal };
    }
    if (isAI(game, to)) {
      const ans = Diplomacy.aiRespond(game, proposal);
      if (ans.accept) applyProposal(game, proposal); else refuseProposal(game, proposal);
      const msg = t(ans.accept ? 'dip.msg.accepted' : 'dip.msg.declined', { who: pname(game, to), kind: AOW.L ? AOW.L(Diplomacy.kindName(kind)) : kind });
      logLine(game, to, msg);
      notify(game, [from, to], ans.accept ? 'good' : 'warn', msg);
      return { ok: true, accepted: !!ans.accept, reason: ans.reason, proposal };
    }
    if (!game.pendingProposals) game.pendingProposals = [];
    game.pendingProposals = game.pendingProposals.filter(p => !(p.from === from && p.to === to && p.kind === kind));
    game.pendingProposals.push(proposal);
    const msg = t('dip.msg.proposal', { from: pname(game, from), kind: AOW.L ? AOW.L(Diplomacy.kindName(kind)) : kind });
    logLine(game, from, msg);
    emit('diplomacy:proposal', { from, to, kind, terms, proposal });
    notify(game, [to], 'info', msg);
    return { ok: true, pending: true, accepted: false, reason: null, proposal };
  };
  /** Proposals waiting for player pid's answer. */
  Diplomacy.pending = function (game, pid) { return (game.pendingProposals || []).filter(p => p.to === pid); };
  /** Human (or UI) answers a pending proposal. */
  Diplomacy.resolve = function (game, proposal, accept) {
    if (!game || !proposal) return { ok: false, accepted: false };
    const list = game.pendingProposals || [];
    const i = list.findIndex(p => p.id === proposal.id);
    if (i >= 0) list.splice(i, 1);
    if (!alive(game, proposal.from) || !alive(game, proposal.to)) return { ok: false, accepted: false };
    const still = Diplomacy.canPropose(game, proposal.from, proposal.to, proposal.kind, proposal.terms);
    if (accept && !still.ok) return { ok: false, accepted: false, reason: still.reason };
    if (accept) applyProposal(game, proposal); else refuseProposal(game, proposal);
    const msg = t(accept ? 'dip.msg.accepted' : 'dip.msg.declined', { who: pname(game, proposal.to), kind: AOW.L ? AOW.L(Diplomacy.kindName(proposal.kind)) : proposal.kind });
    logLine(game, proposal.to, msg);
    return { ok: true, accepted: !!accept };
  };

  function applyProposal(game, p) {
    const { from, to, kind, terms } = p;
    switch (kind) {
      case 'peace':
        Diplomacy.makePeace(game, from, to);
        if (terms && terms.gold) transfer(game, from, to, { gold: terms.gold });
        break;
      case 'non_aggression': setState(game, from, to, 'non_aggression'); addTreaty(game, from, to, 'non_aggression', null, C.NAP_TURNS, from); break;
      case 'defensive_pact': setState(game, from, to, 'defensive_pact'); break;
      case 'alliance': setState(game, from, to, 'alliance'); break;
      case 'open_borders': addTreaty(game, from, to, 'open_borders', null, 0, from); break;
      case 'trade': addTreaty(game, from, to, 'trade', terms, terms.turns, from); break;
      case 'demand': {
        transfer(game, to, from, terms);
        Diplomacy.addGrievance(game, to, from, 'demand');
        const r = Diplomacy.rel(game, to, from); if (r) r.mood -= 8;
        logLine(game, from, t('dip.msg.demand', { from: pname(game, from), to: pname(game, to) }));
        break;
      }
      case 'declare_war': Diplomacy.declareWar(game, from, to, {}); break;
      case 'break_treaty': {
        const tr = terms.treaty;
        if (Diplomacy.state(game, from, to) === tr) setState(game, from, to, tr === 'non_aggression' || tr === 'defensive_pact' || tr === 'alliance' ? 'peace' : 'peace');
        removeTreaty(game, from, to, tr);
        Diplomacy.addGrievance(game, to, from, 'broken_treaty', tr === 'open_borders' || tr === 'trade' ? 10 : C.GRIEVANCE.broken_treaty);
        bumpReputation(game, from, tr === 'open_borders' || tr === 'trade' ? -3 : C.REPUTATION_BREAK);
        const r = Diplomacy.rel(game, to, from); if (r) r.mood -= 15;
        const msg = t('dip.msg.treatyBroken', { who: pname(game, from), kind: AOW.L ? AOW.L(Diplomacy.kindName(tr)) : tr });
        logLine(game, from, msg); notify(game, [from, to], 'warn', msg);
        break;
      }
      case 'gift': {
        transfer(game, from, to, terms);
        const r = Diplomacy.rel(game, to, from);
        if (r) { r.gifts = Math.min(C.GIFT_CAP + 10, (r.gifts || 0) + resourceValue(terms) / 8); r.mood += 3; }
        const msg = t('dip.msg.gift', { from: pname(game, from), to: pname(game, to) });
        logLine(game, from, msg); notify(game, [from, to], 'good', msg);
        break;
      }
      default: break;
    }
    if (kind === 'non_aggression' || kind === 'defensive_pact' || kind === 'alliance' || kind === 'open_borders' || kind === 'trade') {
      const ra = Diplomacy.rel(game, from, to), rb = Diplomacy.rel(game, to, from);
      if (ra) ra.mood += 4; if (rb) rb.mood += 4;
      bumpReputation(game, from, C.REPUTATION_KEEP); bumpReputation(game, to, C.REPUTATION_KEEP);
    }
  }
  function refuseProposal(game, p) {
    const { from, to, kind } = p;
    if (kind === 'demand') {
      const r = Diplomacy.rel(game, from, to); if (r) r.mood -= 6;
      Diplomacy.addGrievance(game, from, to, 'refused_demand');
      const rr = Diplomacy.rel(game, to, from); if (rr) rr.mood -= 4;
    } else {
      const r = Diplomacy.rel(game, from, to); if (r) r.mood -= 2;
    }
  }

  // ------------------------------------------------------------------ AI response
  function rng(game) { return (S() && typeof S().rng === 'function') ? S().rng(game) : { next: () => 0.5, float: (a, b) => (a + b) / 2, chance: p => p >= 0.5, shuffle: a => a, pick: a => a[0] }; }
  function personality(game, pid) { const p = game.players[pid]; return (p && p.personality) || 'expansionist'; }
  function turnsAtWar(game, r) { return r.warSince >= 0 ? game.turn - r.warSince : 0; }
  /**
   * How AI player `to` answers proposal p. Returns {accept, reason:{ko,en}, score}.
   */
  Diplomacy.aiRespond = function (game, p) {
    const { from, to, kind, terms } = p;
    const r = Diplomacy.rel(game, to, from);
    if (!r) return { accept: false, reason: R('대상이 없습니다.', 'No such player.'), score: -99 };
    const op = Diplomacy.opinion(game, to, from);
    const ratio = Diplomacy.strengthRatio(game, from, to);   // > 1: proposer is stronger
    const pers = personality(game, to);
    const griev = Diplomacy.grievanceTotal(game, to, from);
    const rnd = rng(game).float(-10, 10);
    const enemies = commonEnemies(game, to, from);
    const pf = game.players[from], pt = game.players[to];
    let score = 0, accept = false, reason = null;
    const yes = (ko, en) => { accept = true; reason = R(ko, en); };
    const no = (ko, en) => { accept = false; reason = R(ko, en); };
    switch (kind) {
      case 'peace': {
        if (r.state !== 'war') { no('전쟁 중이 아닙니다.', 'We are not at war.'); break; }
        score = r.weariness * 2 + (ratio - 1) * 40 + op * 0.3 - griev * 0.4 - r.warScore * 0.5 + (terms.gold || 0) / 20 + rnd + turnsAtWar(game, r) * 0.5;
        if (pers === 'militarist') score -= 15; else if (pers === 'diplomat' || pers === 'scholar') score += 10;
        if (score > 10) yes('전쟁에 지쳤으니 평화를 받아들이겠소.', 'We have grown weary of this war. Peace it is.');
        else if (r.warScore > 20) no('우리가 이기고 있는데 왜 멈추겠소?', 'Why stop now, when we are winning?');
        else no('아직 평화를 논할 때가 아니오.', 'It is not yet time to speak of peace.');
        break;
      }
      case 'non_aggression': {
        score = op * 0.6 - griev * 0.5 + rnd + (pers === 'diplomat' ? 15 : pers === 'militarist' ? -10 : pers === 'defender' ? 8 : 0);
        if (ratio > 1.3) score += 5;
        if (score > 5) yes('서로의 국경을 존중하기로 합시다.', 'Let us respect each other\'s borders.');
        else no('당신을 아직 신뢰할 수 없소.', 'We do not trust you enough for that.');
        break;
      }
      case 'defensive_pact': {
        let pacts = 0; for (const o of others(game, to)) if (FRIENDLY[Diplomacy.state(game, to, o)] >= 2) pacts++;
        score = op * 0.5 + enemies * 10 - griev * 0.6 - pacts * 5 + (ratio > 0.7 ? 5 : -10) + rnd + (pers === 'diplomat' ? 10 : pers === 'defender' ? 8 : pers === 'militarist' ? -8 : 0);
        if (op < 15) score -= 20;
        if (score > 20) yes('함께라면 누구도 우리를 넘보지 못할 것이오.', 'Together, none will dare threaten us.');
        else no('그런 약속을 하기엔 우리의 관계가 아직 얕소.', 'Our friendship is not yet deep enough for such vows.');
        break;
      }
      case 'alliance': {
        score = op * 0.5 + enemies * 12 - griev * 0.6 + rnd + (pers === 'diplomat' ? 10 : pers === 'militarist' ? -5 : 0) + (ratio > 0.8 ? 5 : -5);
        if (op < 40) score -= 25;
        if (score > 35) yes('우리의 운명을 함께하겠소.', 'Our fates shall be bound together.');
        else no('동맹은 가볍게 맺는 것이 아니오.', 'An alliance is not sworn lightly.');
        break;
      }
      case 'open_borders': {
        score = op * 0.5 - griev * 0.5 + rnd + (pers === 'diplomat' ? 10 : pers === 'defender' ? -10 : pers === 'militarist' ? -5 : 0);
        if (score > 10) yes('우리 땅을 지나가도 좋소.', 'You may pass through our lands.');
        else no('낯선 군대가 우리 땅을 지나는 것을 원치 않소.', 'We would rather not see foreign armies in our lands.');
        break;
      }
      case 'trade': {
        const give = resourceValue(terms.get), get = resourceValue(terms.give); // from `to`'s point of view
        const need = k => (pt.resources[k] || 0) < 60 ? 1.4 : 1;
        let want = 0; for (const k of Object.keys(terms.give || {})) want += (terms.give[k] || 0) * (C.RESOURCE_VALUE[k] || 1) * need(k);
        score = (want - give) + op / 10 + rnd / 4 - griev * 0.2;
        if (!canAfford(pt, terms.get)) { no('그만한 자원이 없소.', 'We lack the resources for this.'); break; }
        if (score >= -3 && get > 0) yes('공정한 거래요. 받아들이겠소.', 'A fair bargain. We accept.');
        else no('우리에게 손해인 거래요.', 'This bargain favors you too much.');
        break;
      }
      case 'demand': {
        const value = resourceValue(terms);
        const share = value / Math.max(1, resourceValue(pt.resources || {}));
        score = (ratio - 1) * 40 - share * 100 + op * 0.2 - griev * 0.3 + rnd + (pers === 'militarist' || pers === 'defender' ? -15 : 0);
        if (ratio > 1.5 && share < 0.35 && canAfford(pt, terms) && score > 0) yes('…이번만은 공물을 바치겠소.', '…This once, we will pay your tribute.');
        else no('우리는 협박에 굴하지 않소!', 'We will not bow to threats!');
        break;
      }
      case 'gift': yes('감사히 받겠소.', 'We accept with gratitude.'); break;
      default: no('그런 제안은 답할 수 없소.', 'That is not a proposal we can answer.'); break;
    }
    if (pf && pf.isHuman === false && kind !== 'gift') { /* AI-to-AI: identical rules */ }
    return { accept, reason, score: Math.round(score) };
  };

  // ------------------------------------------------------------------ AI decisions (used by tick)
  /** Fallback war desire when AOW.AI.wantsWar is absent. */
  function defaultWantsWar(game, a, b) {
    const r = Diplomacy.rel(game, a, b);
    if (!r || r.state !== 'peace') return false;
    if (game.turn < C.MIN_WAR_TURN) return false;
    const pers = personality(game, a);
    const aggression = pers === 'militarist' ? 0.9 : pers === 'expansionist' ? 0.4 : 0.15;
    const op = Diplomacy.opinion(game, a, b), ratio = Diplomacy.strengthRatio(game, a, b);
    let wars = 0; for (const o of others(game, a)) if (Diplomacy.atWar(game, a, o)) wars++;
    let score = aggression * 40 + clamp((ratio - 1) * 30, -40, 30) - op * 0.4 + Diplomacy.grievanceTotal(game, a, b) * 0.8 - wars * 25 + rng(game).float(-8, 8);
    if (ratio < 0.8) score -= 40;
    return score >= 50;
  }
  function defaultWantsPeace(game, a, b) {
    const r = Diplomacy.rel(game, a, b);
    if (!r || r.state !== 'war') return false;
    const ratio = Diplomacy.strengthRatio(game, a, b);
    const pers = personality(game, a);
    let wars = 0; for (const o of others(game, a)) if (Diplomacy.atWar(game, a, o)) wars++;
    let score = r.weariness * 1.5 + (1 - ratio) * 40 - r.warScore * 0.3 + (wars - 1) * 10 + (pers === 'diplomat' ? 15 : pers === 'militarist' ? -15 : 0);
    if (turnsAtWar(game, r) >= 25 && Math.abs(r.warScore) < 20) score += 20;
    return score >= 30;
  }
  Diplomacy.wantsWar = function (game, a, b) {
    const f = fn('AI', 'wantsWar');
    if (f) { try { return !!f(game, a, b); } catch (e) { /* fall back */ } }
    return defaultWantsWar(game, a, b);
  };
  Diplomacy.wantsPeace = function (game, a, b) {
    const f = fn('AI', 'wantsPeace');
    if (f) { try { return !!f(game, a, b); } catch (e) { /* fall back */ } }
    return defaultWantsPeace(game, a, b);
  };
  function aiMemory(game, pid) { const p = game.players[pid]; if (!p.ai) p.ai = {}; return p.ai; }
  /** Pick the proposal an AI would like to make to o (or null). */
  function pickProposal(game, p, o) {
    const r = Diplomacy.rel(game, p, o);
    const op = Diplomacy.opinion(game, p, o);
    const pers = personality(game, p);
    const pp = game.players[p], po = game.players[o];
    const st = r.state;
    const ratio = Diplomacy.strengthRatio(game, p, o);
    const enemies = commonEnemies(game, p, o);
    if (st === 'defensive_pact' && op >= 60) return { kind: 'alliance', terms: {} };
    if ((st === 'peace' || st === 'non_aggression' || st === 'truce') && op >= 35 && (enemies > 0 || pers === 'diplomat' || pers === 'defender') && st !== 'defensive_pact') return { kind: 'defensive_pact', terms: {} };
    if ((st === 'peace' || st === 'truce') && op >= (pers === 'diplomat' ? 0 : 10) && r.truce === 0) return { kind: 'non_aggression', terms: {} };
    if (!Diplomacy.hasTreaty(game, p, o, 'open_borders') && op >= 25 && st !== 'war' && pers !== 'defender') return { kind: 'open_borders', terms: {} };
    if (pers === 'diplomat' && (pp.resources.gold || 0) >= 300 && op < 20 && st !== 'war') return { kind: 'gift', terms: { gold: 50 } };
    if (pers === 'militarist' && ratio >= 1.6 && op < 0 && (po.resources.gold || 0) >= 100 && st === 'peace') return { kind: 'demand', terms: { gold: Math.min(150, Math.round((po.resources.gold || 0) * 0.25)) } };
    if ((pp.resources.gold || 0) >= 400 && (pp.resources.mana || 0) < 60 && (po.resources.mana || 0) >= 150 && st !== 'war' && op >= 0) return { kind: 'trade', terms: { give: { gold: 30 }, get: { mana: 25 }, turns: C.TRADE_TURNS } };
    return null;
  }
  function aiDecide(game, pid) {
    if (game.settings && game.settings.aiPassive) return;
    const mem = aiMemory(game, pid);
    const list = rng(game).shuffle(others(game, pid).slice());
    let proposed = false, declared = false;
    for (const o of list) {
      const r = Diplomacy.rel(game, pid, o);
      if (!r) continue;
      if (r.state === 'war') {
        if (!proposed && r.lastProposalTurn + C.PEACE_RETRY <= game.turn && Diplomacy.wantsPeace(game, pid, o)) {
          const res = Diplomacy.propose(game, pid, o, 'peace', {});
          if (res.ok) proposed = true;
        }
        continue;
      }
      if (!declared && (mem.lastWarTurn === undefined || mem.lastWarTurn + C.AI_WAR_COOLDOWN <= game.turn) && Diplomacy.canDeclareWar(game, pid, o).ok && Diplomacy.wantsWar(game, pid, o)) {
        const res = Diplomacy.declareWar(game, pid, o, {});
        if (res.ok) { declared = true; mem.lastWarTurn = game.turn; mem.warTargetPid = o; continue; }
      }
      if (proposed || r.lastProposalTurn + C.AI_PROPOSAL_INTERVAL > game.turn) continue;
      const pick = pickProposal(game, pid, o);
      if (!pick) continue;
      const res = Diplomacy.propose(game, pid, o, pick.kind, pick.terms);
      if (res.ok) proposed = true;
    }
  }

  // ------------------------------------------------------------------ tick
  function decayPair(game, a, b) {
    const r = Diplomacy.rel(game, a, b); if (!r) return;
    for (const g of r.grievances) g.value *= C.GRIEVANCE_DECAY;
    r.grievances = r.grievances.filter(g => g.value >= 1);
    r.mood = Math.abs(r.mood) < 0.5 ? 0 : r.mood * C.MOOD_DECAY;
    r.gifts = (r.gifts || 0) * C.GIFT_DECAY; if (r.gifts < 0.5) r.gifts = 0;
    if (r.state === 'war') r.weariness += C.WEARINESS_PER_TURN; else r.weariness = Math.max(0, r.weariness - 1);
  }
  function tickPair(game, a, b) {
    const ra = Diplomacy.rel(game, a, b), rb = Diplomacy.rel(game, b, a);
    if (!ra || !rb) return;
    decayPair(game, a, b); decayPair(game, b, a);
    if (ra.state === 'truce') {
      ra.truce = Math.max(0, (ra.truce || 0) - 1); rb.truce = ra.truce;
      if (ra.truce === 0) { setState(game, a, b, 'peace'); logLine(game, a, t('dip.msg.truceEnded', { a: pname(game, a), b: pname(game, b) })); }
    }
    // timed treaties
    for (const tr of ra.treaties.slice()) {
      if (!tr.turns) continue;
      if (game.turn - tr.since < tr.turns) continue;
      if (tr.kind === 'non_aggression') {
        removeTreaty(game, a, b, 'non_aggression');
        if (ra.state === 'non_aggression') { setState(game, a, b, 'peace'); logLine(game, a, t('dip.msg.napExpired', { a: pname(game, a), b: pname(game, b) })); }
      } else if (tr.kind === 'trade') removeTreaty(game, a, b, 'trade');
    }
    // trade transfers (processed once, from the initiator's copy)
    for (const tr of ra.treaties.slice()) {
      if (tr.kind !== 'trade' || tr.initiator !== a || !tr.terms) continue;
      const pa = game.players[a], pb = game.players[b];
      if (!canAfford(pa, tr.terms.give) || !canAfford(pb, tr.terms.get)) {
        removeTreaty(game, a, b, 'trade');
        logLine(game, a, t('dip.msg.tradeLapsed', { a: pname(game, a), b: pname(game, b) }));
        continue;
      }
      transfer(game, a, b, tr.terms.give); transfer(game, b, a, tr.terms.get);
    }
    ra.opinion = Diplomacy.opinion(game, a, b);
    rb.opinion = Diplomacy.opinion(game, b, a);
  }
  function trespassGrievances(game) {
    const seen = new Set();
    for (const army of game.armies) {
      if (army.owner < 0 || army.hex < 0) continue;
      const owner = game.owner[army.hex];
      if (owner < 0 || owner === army.owner || !alive(game, owner)) continue;
      const key = owner + ':' + army.owner;
      if (seen.has(key)) continue;
      const st = Diplomacy.state(game, owner, army.owner);
      if (st === 'war' || st === 'alliance' || Diplomacy.hasTreaty(game, owner, army.owner, 'open_borders')) continue;
      seen.add(key);
      Diplomacy.addGrievance(game, owner, army.owner, 'trespass');
    }
  }
  /**
   * Once per game turn (guarded by game.diplomacyTurn): decay/drift, truce & treaty countdowns, trade transfers,
   * trespass grievances, proposal expiry and AI proposals / war decisions. Safe to call repeatedly.
   */
  Diplomacy.tick = function (game) {
    if (!game || !game.players) return false;
    if (game.diplomacyTurn === game.turn) return false;
    game.diplomacyTurn = game.turn;
    const ids = game.players.map(p => p.id);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      if (!alive(game, ids[i]) || !alive(game, ids[j])) continue;
      try { tickPair(game, ids[i], ids[j]); } catch (e) { AOW.warn && AOW.warn('Diplomacy.tick pair', e); }
    }
    try { trespassGrievances(game); } catch (e) { /* ignore */ }
    if (game.pendingProposals) game.pendingProposals = game.pendingProposals.filter(p => game.turn - p.turn < C.PROPOSAL_EXPIRE && alive(game, p.from) && alive(game, p.to));
    for (const pid of ids) {
      if (!alive(game, pid) || !isAI(game, pid)) continue;
      try { aiDecide(game, pid); } catch (e) { AOW.warn && AOW.warn('Diplomacy.tick ai ' + pid, e); }
    }
    return true;
  };

  // ------------------------------------------------------------------ UI summary
  /** View model for the diplomacy screen: state, opinion with factors, treaties, grievances, proposal availability. */
  Diplomacy.summary = function (game, a, b) {
    const r = Diplomacy.rel(game, a, b);
    if (!r) return null;
    const op = Diplomacy.opinion(game, a, b);
    const theirs = Diplomacy.opinion(game, b, a);
    const canPropose = {};
    for (const k of Diplomacy.KINDS) canPropose[k] = Diplomacy.canPropose(game, a, b, k, k === 'gift' ? { gold: 1 } : k === 'demand' ? { gold: 1 } : k === 'trade' ? { give: { gold: 1 }, get: { mana: 1 } } : k === 'break_treaty' ? { treaty: r.state !== 'peace' && r.state !== 'war' && r.state !== 'truce' ? r.state : (r.treaties[0] && r.treaties[0].kind) } : {}).ok;
    return {
      a, b, state: r.state, stateName: Diplomacy.stateName(r.state),
      opinion: op, opinionLabel: Diplomacy.opinionLabel(op).label, theirOpinion: theirs, theirOpinionLabel: Diplomacy.opinionLabel(theirs).label,
      factors: Diplomacy.opinionFactors(game, a, b),
      treaties: r.treaties.map(tr => ({ kind: tr.kind, name: Diplomacy.kindName(tr.kind), since: tr.since, turnsLeft: tr.turns ? Math.max(0, tr.turns - (game.turn - tr.since)) : null, terms: tr.terms })),
      grievances: r.grievances.map(g => ({ kind: g.kind, value: Math.round(g.value), turn: g.turn })),
      theirGrievances: (Diplomacy.rel(game, b, a).grievances || []).map(g => ({ kind: g.kind, value: Math.round(g.value), turn: g.turn })),
      truce: r.truce || 0, warScore: r.warScore || 0, warTurns: turnsAtWar(game, r), weariness: Math.round(r.weariness || 0),
      strengthRatio: Math.round(Diplomacy.strengthRatio(game, a, b) * 100) / 100,
      canPropose, pending: Diplomacy.pending(game, a).filter(p => p.from === b),
    };
  };

  AOW.Diplomacy = Diplomacy;
})(window.AOW = window.AOW || {});
