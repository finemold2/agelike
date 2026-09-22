// src/game/rules.js — economy, cities, research, spells, movement, visibility, heroes, victory (SPEC §5)
//
// Every rule function mutates `game` and emits events; none touch the DOM. Balance numbers live in Rules.C.
//
// Additive helpers beyond the SPEC §5 contract (all documented here per Ground Rule 0):
//   Rules.C / Rules.EFFECT_KEYS                     balance constants / documented §3.1 effect vocabulary
//   Rules.playerEffects(game, player) → flat sum of ruler bonuses, traits, culture traits + subChoice, tome passives,
//        empire skills, empire spells, transformations, improvement globalEffects, annexed wonder annexEffects, temp effects
//        (cached per turn; Rules.invalidate(pid|null) drops the cache; result carries hidden `_parts` for unitStats)
//   Rules.cityEffects(game, city)                   playerEffects + buildings + city enchantments + city temp effects
//   Rules.cityYields(game, city) → {food, production, gold, mana, knowledge, draft, stability, detail}
//        (gold is net of building upkeep, food is net of population upkeep; stability = target value the city drifts toward)
//   Rules.playerIncome(game, player) → {gold, mana, knowledge, imperium, detail}
//   Rules.cityCulture / cityUnitTier / cityCap / cityCount / unitCost / buildingCost / annexCost / improvementCost
//   Rules.recruitableUnits / canRecruit / buildableBuildings / canBuild / enqueue / dequeue / processQueue(game, city, production)
//   Rules.improvementOptions(game, city, pid) / buildImprovement / annexableProvinces / annexProvince
//   Rules.canFoundOutpost / foundOutpost / upgradeOutpost
//   Rules.unitStats(game, unit) / unitEnchantments / syncUnit / createUnitFor(game, pid, typeId, armyId)
//   Rules.grantXp / rankName / heroLevelUp / heroAvailableSkills / heroStats / equipItem / unequipItem / rollLoot / heroXpForLevel
//   Rules.moveProfile / moveCost / armyMaxMp / pathfind / reachable / moveArmy / attackTarget / mergeArmies / splitArmy / disband
//   Rules.recomputeVisibility / canSee / visionRadius
//   Rules.availableTomes / selectTome / researchOptions / researchCost / startResearch / completeResearch / isResearched
//   Rules.canCast / castSpell / cancelCasting / dispel / activeSpells / applySpellEffect
//   Rules.captureCity / freeCityOpinion / freeCityAction / clearStructure / spawnGuards / guardPool / pickGuardUnits
//   Rules.armyStrength / quickResolve (fallback battle resolution when AOW.Combat is absent)
//   Rules.victoryCheck / startMagicVictory / score / reasonText / notify / L (bilingual text helper)
//   Rules.ensurePlayer(game, player) / ensureCity(game, city)   fill the extra state fields listed below
//
// Extra state fields (all plain JSON, survive State.serialize):
//   player.unlocked {units:[], improvements:[], skills:[]}, player.transformations [ids], player.research.done [contentIds],
//   player.items [itemIds] (inventory), player.annexedWonders [structureIds], player.tempEffects [{id, effects, turns}],
//   player.whisperStones n, player.magicVictory null|{startTurn, turns, beacons:[cityIds]}, player.expansionTurns n,
//   player.casting.current null|{spellId, target, progress, need}, player.stats.researched n
//   city.draft (stockpiled draft), city.tempEffects [{id, effects, turns}], city.culture (null = owner culture),
//   city.beacon bool, city.stabilityMods [{id, amount, turns}]
//   army.raid {home: structureId, born: turn} on marauder raid armies; structure.spawnTimer on infestations
//   hero.respawnAt (turn number) while a dead ruler waits to return
(function (AOW) {
  'use strict';
  const Rules = {};
  const S = () => AOW.State;
  const Hex = () => AOW.Hex;
  const Data = () => AOW.Data;
  const Events = () => AOW.Events;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const L = (ko, en) => ({ ko, en });
  Rules.L = L;

  // ------------------------------------------------------------------ i18n
  AOW.I18n.add({
    ko: {
      'rules.reason.notOwner': '소유자가 아닙니다.', 'rules.reason.notEnoughGold': '금이 부족합니다.', 'rules.reason.notEnoughMana': '마나가 부족합니다.',
      'rules.reason.notEnoughImperium': '임페리움이 부족합니다.', 'rules.reason.notEnoughKnowledge': '지식이 부족합니다.',
      'rules.reason.unknownUnit': '알 수 없는 유닛입니다.', 'rules.reason.notRecruitable': '이 도시에서 모집할 수 없습니다.', 'rules.reason.tierTooHigh': '더 높은 등급의 병영이 필요합니다.',
      'rules.reason.queueFull': '생산 대기열이 가득 찼습니다.', 'rules.reason.unknownBuilding': '알 수 없는 건물입니다.', 'rules.reason.alreadyBuilt': '이미 건설했습니다.',
      'rules.reason.alreadyQueued': '이미 대기열에 있습니다.', 'rules.reason.cityTierTooLow': '도시 등급이 낮습니다.', 'rules.reason.missingPrereq': '선행 건물이 필요합니다.',
      'rules.reason.wrongCulture': '다른 문화의 건물입니다.', 'rules.reason.needsCoast': '해안 도시만 건설할 수 있습니다.', 'rules.reason.outpostCannotBuild': '전초기지는 건설할 수 없습니다.',
      'rules.reason.badIndex': '잘못된 항목입니다.', 'rules.reason.notYourProvince': '이 도시의 지방이 아닙니다.', 'rules.reason.alreadyImproved': '이미 개발된 지방입니다.',
      'rules.reason.unknownImprovement': '알 수 없는 개선물입니다.', 'rules.reason.wrongTerrain': '지형이 맞지 않습니다.', 'rules.reason.wrongFeature': '지형 특성이 맞지 않습니다.',
      'rules.reason.needsResource': '해당 자원 지점이 필요합니다.', 'rules.reason.needsMaterial': '해당 마법 재료가 필요합니다.', 'rules.reason.notUnlocked': '아직 연구하지 않았습니다.',
      'rules.reason.unique': '제국에 하나만 지을 수 있습니다.', 'rules.reason.notAnnexable': '병합할 수 없는 지방입니다.', 'rules.reason.popLimit': '인구가 더 필요합니다.',
      'rules.reason.notLand': '육지가 아닙니다.', 'rules.reason.inDomain': '이미 다른 영역에 속합니다.', 'rules.reason.tooClose': '다른 도시와 너무 가깝습니다.',
      'rules.reason.occupied': '이미 구조물이 있습니다.', 'rules.reason.noArmy': '부대가 없습니다.', 'rules.reason.armyNotHere': '부대가 그곳에 없습니다.',
      'rules.reason.notOutpost': '전초기지가 아닙니다.', 'rules.reason.cityCap': '도시 상한에 도달했습니다.', 'rules.reason.noMp': '이동력이 없습니다.',
      'rules.reason.notAdjacent': '인접하지 않았습니다.', 'rules.reason.nothingToAttack': '공격할 대상이 없습니다.', 'rules.reason.notAtWar': '전쟁 중이 아닙니다.',
      'rules.reason.freeCityPeace': '자유도시와 평화 상태입니다. 먼저 전쟁을 선포하세요.', 'rules.reason.sameOwner': '아군입니다.', 'rules.reason.tooMany': '부대는 최대 6유닛입니다.',
      'rules.reason.differentHex': '같은 칸에 있어야 합니다.', 'rules.reason.unknownTome': '알 수 없는 서입니다.', 'rules.reason.tomeOwned': '이미 선택한 서입니다.',
      'rules.reason.tierLocked': '서 등급이 잠겨 있습니다.', 'rules.reason.affinityLow': '친화가 부족합니다.', 'rules.reason.oneTierFive': '5등급 서는 하나만 선택할 수 있습니다.',
      'rules.reason.notInTome': '선택한 서의 내용이 아닙니다.', 'rules.reason.alreadyResearched': '이미 연구했습니다.', 'rules.reason.unknownSpell': '알 수 없는 주문입니다.',
      'rules.reason.notKnown': '아직 배우지 않은 주문입니다.', 'rules.reason.combatOnly': '전투 중에만 시전할 수 있습니다.', 'rules.reason.alreadyActive': '이미 활성화된 주문입니다.',
      'rules.reason.casting': '다른 주문을 시전하는 중입니다.', 'rules.reason.badTarget': '잘못된 대상입니다.', 'rules.reason.notInDomain': '아군 영역 안이어야 합니다.',
      'rules.reason.unknownItem': '알 수 없는 아이템입니다.', 'rules.reason.notInInventory': '보관함에 없는 아이템입니다.', 'rules.reason.wrongSlot': '장착 부위가 맞지 않습니다.',
      'rules.reason.weaponNotAllowed': '이 직업은 그 무기를 쓸 수 없습니다.', 'rules.reason.noMount': '탈것을 쓸 수 없는 군주입니다.', 'rules.reason.heroDead': '영웅이 죽었습니다.',
      'rules.reason.noSkillPoints': '기술 점수가 없습니다.', 'rules.reason.skillLocked': '아직 배울 수 없는 기술입니다.', 'rules.reason.opinionLow': '호감도가 부족합니다.',
      'rules.reason.notVassal': '봉신이 아닙니다.', 'rules.reason.alreadyVassal': '이미 봉신입니다.', 'rules.reason.alreadyAtWar': '이미 전쟁 중입니다.',
      'rules.reason.notFreeCity': '자유도시가 아닙니다.', 'rules.reason.needTierFive': '5등급 서를 모두 연구해야 합니다.', 'rules.reason.needCities': '도시가 3개 이상 필요합니다.',
      'rules.reason.alreadyStarted': '이미 시작했습니다.', 'rules.reason.unknownAction': '알 수 없는 행동입니다.', 'rules.reason.ok': '가능합니다.',
      'rules.rank.0': '신병', 'rules.rank.1': '병사', 'rules.rank.2': '고참병', 'rules.rank.3': '정예', 'rules.rank.4': '전설',
    },
    en: {
      'rules.reason.notOwner': 'Not the owner.', 'rules.reason.notEnoughGold': 'Not enough gold.', 'rules.reason.notEnoughMana': 'Not enough mana.',
      'rules.reason.notEnoughImperium': 'Not enough imperium.', 'rules.reason.notEnoughKnowledge': 'Not enough knowledge.',
      'rules.reason.unknownUnit': 'Unknown unit.', 'rules.reason.notRecruitable': 'Cannot be recruited in this city.', 'rules.reason.tierTooHigh': 'Requires a higher barracks tier.',
      'rules.reason.queueFull': 'The production queue is full.', 'rules.reason.unknownBuilding': 'Unknown building.', 'rules.reason.alreadyBuilt': 'Already built.',
      'rules.reason.alreadyQueued': 'Already queued.', 'rules.reason.cityTierTooLow': 'City tier too low.', 'rules.reason.missingPrereq': 'Missing prerequisite building.',
      'rules.reason.wrongCulture': 'Building of another culture.', 'rules.reason.needsCoast': 'Only coastal cities can build this.', 'rules.reason.outpostCannotBuild': 'Outposts cannot build.',
      'rules.reason.badIndex': 'Bad queue index.', 'rules.reason.notYourProvince': 'Not a province of this city.', 'rules.reason.alreadyImproved': 'Province already developed.',
      'rules.reason.unknownImprovement': 'Unknown improvement.', 'rules.reason.wrongTerrain': 'Wrong terrain.', 'rules.reason.wrongFeature': 'Wrong terrain feature.',
      'rules.reason.needsResource': 'Requires that resource node.', 'rules.reason.needsMaterial': 'Requires that magic material.', 'rules.reason.notUnlocked': 'Not researched yet.',
      'rules.reason.unique': 'Only one per empire.', 'rules.reason.notAnnexable': 'Province cannot be annexed.', 'rules.reason.popLimit': 'More population needed.',
      'rules.reason.notLand': 'Not land.', 'rules.reason.inDomain': 'Already inside a domain.', 'rules.reason.tooClose': 'Too close to another city.',
      'rules.reason.occupied': 'A structure is already here.', 'rules.reason.noArmy': 'No army.', 'rules.reason.armyNotHere': 'The army is not there.',
      'rules.reason.notOutpost': 'Not an outpost.', 'rules.reason.cityCap': 'City cap reached.', 'rules.reason.noMp': 'No movement points.',
      'rules.reason.notAdjacent': 'Not adjacent.', 'rules.reason.nothingToAttack': 'Nothing to attack.', 'rules.reason.notAtWar': 'Not at war.',
      'rules.reason.freeCityPeace': 'At peace with this free city. Declare war first.', 'rules.reason.sameOwner': 'Friendly.', 'rules.reason.tooMany': 'An army holds at most 6 units.',
      'rules.reason.differentHex': 'Must be on the same hex.', 'rules.reason.unknownTome': 'Unknown tome.', 'rules.reason.tomeOwned': 'Tome already chosen.',
      'rules.reason.tierLocked': 'Tome tier locked.', 'rules.reason.affinityLow': 'Affinity too low.', 'rules.reason.oneTierFive': 'Only one tier V tome may be chosen.',
      'rules.reason.notInTome': 'Not part of a chosen tome.', 'rules.reason.alreadyResearched': 'Already researched.', 'rules.reason.unknownSpell': 'Unknown spell.',
      'rules.reason.notKnown': 'Spell not learned.', 'rules.reason.combatOnly': 'Can only be cast in battle.', 'rules.reason.alreadyActive': 'Spell already active.',
      'rules.reason.casting': 'Another spell is being cast.', 'rules.reason.badTarget': 'Invalid target.', 'rules.reason.notInDomain': 'Must be inside your domain.',
      'rules.reason.unknownItem': 'Unknown item.', 'rules.reason.notInInventory': 'Item not in inventory.', 'rules.reason.wrongSlot': 'Wrong equipment slot.',
      'rules.reason.weaponNotAllowed': 'This class cannot use that weapon.', 'rules.reason.noMount': 'This ruler cannot use mounts.', 'rules.reason.heroDead': 'The hero is dead.',
      'rules.reason.noSkillPoints': 'No skill points.', 'rules.reason.skillLocked': 'Skill not available yet.', 'rules.reason.opinionLow': 'Opinion too low.',
      'rules.reason.notVassal': 'Not a vassal.', 'rules.reason.alreadyVassal': 'Already a vassal.', 'rules.reason.alreadyAtWar': 'Already at war.',
      'rules.reason.notFreeCity': 'Not a free city.', 'rules.reason.needTierFive': 'A tier V tome must be fully researched.', 'rules.reason.needCities': 'At least 3 cities are needed.',
      'rules.reason.alreadyStarted': 'Already started.', 'rules.reason.unknownAction': 'Unknown action.', 'rules.reason.ok': 'OK.',
      'rules.rank.0': 'Recruit', 'rules.rank.1': 'Soldier', 'rules.rank.2': 'Veteran', 'rules.rank.3': 'Elite', 'rules.rank.4': 'Legend',
    },
  });
  Rules.reasonText = reason => AOW.t('rules.reason.' + reason);
  const fail = reason => ({ ok: false, reason, text: Rules.reasonText(reason) });
  const OK = { ok: true };

  // ------------------------------------------------------------------ balance constants
  const C = {
    UNITS_PER_ARMY: 6,
    QUEUE_MAX: 8,
    CITY_TIERS: [1, 4, 8, 14, 22, 32],          // population needed for city tier 1..5 (tier 0 = outpost); last entry = max population
    MAX_TIER: 5,
    GROWTH_BASE: 35, GROWTH_STEP: 1.15,           // food needed to grow from pop N: GROWTH_BASE * GROWTH_STEP^(N-1)
    FOOD_PER_POP: 3,
    // base city yields by tier 0..5
    TIER_BASE: { food: [2, 6, 10, 14, 18, 22], production: [2, 5, 8, 12, 16, 20], gold: [4, 6, 10, 14, 18, 24], mana: [0, 2, 4, 6, 8, 10], knowledge: [0, 2, 4, 6, 8, 10], draft: [0, 8, 12, 16, 20, 24] },
    POP_YIELD: { gold: 2, knowledge: 1, production: 1, draft: 1 },
    PROVINCE_YIELD_SCALE: 0.5,                    // per-hex terrain/feature yields are halved when summed into a province
    NODE_YIELD: 5,                                // unimproved resource node bonus of its resource
    MATERIAL_YIELD: { mana: 2, gold: 2 },         // unimproved magic material bonus
    GOLD_BASE: 20, IMPERIUM_BASE: 5, IMPERIUM_PER_CITY: 2, IMPERIUM_CAPITAL: 3,
    CP_BASE: 20,
    DRAFT_CAP: 400,
    RANK_XP: [0, 15, 40, 80, 140],
    RANK: { hpPct: 10, defResAt: [2, 4], dmgPctAt: 4, dmgPct: 10 },
    RANK_MAX: 4,
    XP_PER_TURN: 1, XP_KILL_PER_TIER: 10, XP_WIN: 8,
    HERO_XP_PER_LEVEL: 60, HERO_MAX_LEVEL: 20, HERO_HP: 8, HERO_RESPAWN_TURNS: 3, HERO_SIGNATURE_EVERY: 4,
    ANNEX_BASE: 40, ANNEX_STEP: 0.15, ANNEX_SPECIAL_MULT: 1.5,
    OUTPOST_COST: 100, OUTPOST_IMPERIUM: 20, OUTPOST_MIN_DIST: 3, OUTPOST_UPGRADE_IMPERIUM: 150, OUTPOST_UPKEEP: 3,
    BASE_CITY_CAP: 3, OVER_CAP_PENALTY_PCT: 25,
    STAB_BASE: 20, STAB_PER_POP: 2, STAB_PER_PROVINCE: 3, STAB_CAPITAL: 10, STAB_DRIFT: 5, STAB_CAPTURE: -30, STAB_MOD_TURNS: 10,
    STAB_BANDS: [{ min: 80, pct: 20, id: 'harmony' }, { min: 40, pct: 10, id: 'orderly' }, { min: 10, pct: 5, id: 'stable' }, { min: -9, pct: 0, id: 'neutral' },
      { min: -39, pct: -10, id: 'unstable' }, { min: -79, pct: -25, id: 'unrest' }, { min: -100, pct: -50, id: 'rioting' }],
    MOVE: { ROAD: 3, RIVER: 2, DOMAIN_DISCOUNT: 1, MIN: 2, WATER: 4, FAST_MOVEMENT: 8 },
    VISION: { CITY: 3, ARMY: 2, DOMAIN: 1, HIGH_GROUND: 1, FLYING: 1, FARSIGHT: 1 },
    HEAL: { DOMAIN: 15, OUTSIDE: 5, CITY: 10, HOSTILE: 2 },
    UPKEEP_CAP_PCT: -50,
    RAID_INTERVAL: 8, RAID_SIZE: [2, 3], RAID_MAX: 12, RAID_LIFETIME: 15, RAID_RANGE: 14, GUARD_REGEN_PCT: 10,
    PILLAGE_GOLD: 30, PILLAGE_STABILITY: -10,
    FC: { VASSAL_OPINION: 45, INTEGRATE_OPINION: 40, GIFT_GOLD: 50, GIFT_OPINION: 10, STONE_PER_TURN: 3, INTEGRATE_IMPERIUM_PER_POP: 25, VASSAL_SHARE: 0.25, DECLARE_OPINION: -50, BASE_OPINION: 0 },
    EXPANSION_PCT: 0.6, EXPANSION_HOLD: 10, MAGIC_HOLD: 15, BEACON_COST: 300, BEACONS: 3,
    SPELL_RESOURCE_TURNS: 5, SUMMON_RANGE: 6,
    SCORE: { city: 100, province: 10, unit: 5, research: 20, resource: 0.02 },
    NOTIFICATION_KEEP: 200,
  };
  Rules.C = C;

  /** §3.1 effect vocabulary summed by Rules (values are flat unless the key ends in Pct). UNIT keys also feed unitStats. */
  Rules.EFFECT_KEYS = {
    economy: ['food', 'production', 'gold', 'mana', 'knowledge', 'draft', 'imperium', 'stability', 'growthPct', 'foodPct', 'productionPct', 'goldPct', 'manaPct', 'knowledgePct',
      'unitTier', 'upkeepPct', 'recruitCostPct', 'casting', 'combatCasting', 'cityCap', 'provinceCostPct', 'spellCostPct', 'researchPct', 'wallHp', 'cityDefense', 'diplomacyOpinion', 'warScore', 'heroSlots'],
    unit: ['hp', 'hpPct', 'def', 'res', 'dmg', 'dmgPct', 'accuracy', 'mp', 'morale', 'critChance', 'healPerTurn', 'vision', 'armyMove', 'xpPct', 'rankUp', 'statusRes',
      'statusRes_<channel>', 'channelDmg_<channel>', 'prot_<channel>', 'evasion'],
  };
  const UNIT_KEYS = new Set(['hp', 'hpPct', 'def', 'res', 'dmg', 'dmgPct', 'accuracy', 'mp', 'morale', 'critChance', 'healPerTurn', 'vision', 'armyMove', 'xpPct', 'rankUp', 'statusRes', 'evasion']);
  const isUnitKey = k => UNIT_KEYS.has(k) || k.startsWith('statusRes_') || k.startsWith('channelDmg_') || k.startsWith('prot_');

  // ------------------------------------------------------------------ small helpers
  function addEffects(acc, eff, mult) {
    if (!eff) return acc;
    mult = mult === undefined ? 1 : mult;
    for (const k of Object.keys(eff)) {
      const v = eff[k];
      if (typeof v === 'number') acc[k] = (acc[k] || 0) + v * mult;
      else if (v === true) acc[k] = true;
      else if (v && typeof v === 'object' && !Array.isArray(v)) { acc[k] = acc[k] || {}; for (const kk of Object.keys(v)) acc[k][kk] = (acc[k][kk] || 0) + (v[kk] || 0); }
    }
    return acc;
  }
  Rules.addEffects = addEffects;
  const has = (kind, id) => !!id && Data().has(kind, id);
  const get = (kind, id) => (has(kind, id) ? Data().get(kind, id) : null);
  const pidOf = p => (typeof p === 'object' && p !== null ? p.id : p);
  const playerOf = (game, p) => (typeof p === 'object' && p !== null ? p : S().player(game, p));
  const rng = game => S().rng(game);
  const pct = (v, p) => v * (1 + (p || 0) / 100);
  const sumArr = (arr, f) => { let s = 0; for (const x of arr) s += f(x); return s; };

  /** Fill additive state fields on a player (idempotent). */
  Rules.ensurePlayer = function (game, player) {
    if (!player) return player;
    player.unlocked = player.unlocked || { units: [], improvements: [], skills: [] };
    player.unlocked.units = player.unlocked.units || []; player.unlocked.improvements = player.unlocked.improvements || []; player.unlocked.skills = player.unlocked.skills || [];
    player.transformations = player.transformations || [];
    player.research = player.research || { tomeQueue: [], current: null, progress: 0 };
    player.research.done = player.research.done || [];
    player.items = player.items || [];
    player.annexedWonders = player.annexedWonders || [];
    player.tempEffects = player.tempEffects || [];
    if (player.whisperStones === undefined) player.whisperStones = 1;
    if (player.magicVictory === undefined) player.magicVictory = null;
    if (player.expansionTurns === undefined) player.expansionTurns = 0;
    player.spells = player.spells || { known: [], active: [] };
    player.casting = player.casting || { cp: C.CP_BASE, cpMax: C.CP_BASE };
    if (player.casting.current === undefined) player.casting.current = null;
    player.stats = player.stats || { score: 0, cities: 0, units: 0, territory: 0 };
    if (player.stats.researched === undefined) player.stats.researched = 0;
    if (!player.affinity) { player.affinity = {}; for (const a of S().AFFINITIES) player.affinity[a] = 0; }
    return player;
  };
  Rules.ensureCity = function (game, city) {
    if (!city) return city;
    if (city.draft === undefined) city.draft = 0;
    city.tempEffects = city.tempEffects || [];
    if (city.culture === undefined) city.culture = null;
    if (city.beacon === undefined) city.beacon = false;
    city.stabilityMods = city.stabilityMods || [];
    city.queue = city.queue || [];
    city.enchantments = city.enchantments || [];
    return city;
  };

  // ------------------------------------------------------------------ notifications (shared with Turn)
  /** Push a notification {turn, pid, kind, text:{ko,en}, icon, ref}; emits 'notify' for human players. */
  Rules.notify = function (game, pid, kind, text, icon, ref) {
    const n = { id: S().newId(game, 'notification'), turn: game.turn, pid, kind, text, icon: icon || null, ref: ref || null };
    game.notifications.push(n);
    if (game.notifications.length > C.NOTIFICATION_KEEP) game.notifications.splice(0, game.notifications.length - C.NOTIFICATION_KEEP);
    const p = pid >= 0 ? game.players[pid] : null;
    if (p && p.isHuman && Events()) Events().emit('notify', { kind, text: AOW.L(text), icon: n.icon, ref: n.ref, notification: n });
    return n;
  };
  function log(game, text) { game.log.push({ turn: game.turn, text }); if (game.log.length > 500) game.log.splice(0, game.log.length - 500); }
  Rules.log = log;

  // ==================================================================== EFFECTS AGGREGATION
  const cache = { game: null, turn: -1, players: {} };
  /** Drop cached player effects (pid null = all). */
  Rules.invalidate = function (pid) {
    if (pid === null || pid === undefined) cache.players = {};
    else delete cache.players[pid];
  };
  function tomeOf(id) { return get('tomes', id); }

  /**
   * Sum every empire-wide effect for a player. Returns a flat object plus non-enumerable `_parts`:
   *   { units: effects applied to every unit, racial: effects applied to racial units only (body/mind traits + transformations),
   *     ruler: rulerType bonuses (unit keys apply to the ruler's hero unit only) }
   */
  Rules.playerEffects = function (game, player) {
    player = playerOf(game, player);
    if (!player) return {};
    if (cache.game !== game || cache.turn !== game.turn) { cache.game = game; cache.turn = game.turn; cache.players = {}; }
    const hit = cache.players[player.id];
    if (hit) return hit;
    Rules.ensurePlayer(game, player);
    const all = {}, units = {}, racial = {}, ruler = {};
    const addAll = (eff) => { addEffects(all, eff); addEffects(units, eff); };
    // ruler type bonuses: economy keys empire-wide, unit keys only for the ruler hero
    const rt = get('rulerTypes', player.rulerType);
    if (rt && rt.bonuses) {
      for (const k of Object.keys(rt.bonuses)) { if (isUnitKey(k)) ruler[k] = (ruler[k] || 0) + rt.bonuses[k]; else all[k] = (all[k] || 0) + rt.bonuses[k]; }
      if (rt.perLevel) { const h = S().hero(game, player.rulerHeroId); const lv = h ? h.level - 1 : 0; for (const k of Object.keys(rt.perLevel)) all[k] = (all[k] || 0) + rt.perLevel[k] * lv; }
    }
    // faction traits: society → everyone; body/mind → racial units only (+ economy keys empire-wide)
    for (const id of player.traits || []) {
      const t = get('traits', id); if (!t) continue;
      if (t.kind === 'society') addAll(t.effects);
      else { for (const k of Object.keys(t.effects || {})) { if (isUnitKey(k)) racial[k] = (racial[k] || 0) + t.effects[k]; else all[k] = (all[k] || 0) + t.effects[k]; } }
    }
    // culture traits + sub-choice
    const cul = get('cultures', player.cultureId);
    if (cul) {
      for (const ct of cul.traits || []) addAll(ct.effects);
      const sc = (cul.subChoices || []).find(s => s.id === player.subChoice);
      if (sc) addAll(sc.effects);
    }
    // tome passives
    for (const id of player.tomes || []) { const t = tomeOf(id); if (t && t.passive) addAll(t.passive.effects); }
    // empire skills
    for (const id of player.empireSkills || []) { const e = get('empireSkills', id); if (e) addAll(e.effects); }
    // active spells: empire (permanent passives) and resource/enchant-like actives with `effects`
    for (const a of player.spells.active || []) {
      const sp = get('spells', a.spellId); if (!sp) continue;
      if (sp.kind === 'empire') addAll(sp.effects || (sp.effect && sp.effect.effects) || {});
      else if (a.effects && !a.target) addAll(a.effects);
    }
    // transformations (racial units) — economy keys still empire-wide
    for (const id of player.transformations || []) {
      const tr = get('transformations', id); if (!tr) continue;
      for (const k of Object.keys(tr.effects || {})) { if (isUnitKey(k)) racial[k] = (racial[k] || 0) + tr.effects[k]; else all[k] = (all[k] || 0) + tr.effects[k]; }
    }
    // improvements' globalEffects (each improvement id counts once)
    const seenImp = new Set();
    for (const prov of game.provinces) {
      if (prov.owner !== player.id || !prov.improvement || seenImp.has(prov.improvement)) continue;
      const imp = get('improvements', prov.improvement);
      if (imp && imp.globalEffects) { seenImp.add(prov.improvement); addAll(imp.globalEffects); }
    }
    // annexed wonders
    for (const sid of player.annexedWonders || []) {
      const st = S().structure(game, sid); if (!st || st.kind !== 'wonder') continue;
      const w = get('wonders', st.refId); if (w) addAll(w.annexEffects);
    }
    // temporary effects (strategic spells on the empire)
    for (const te of player.tempEffects || []) addAll(te.effects);
    Object.defineProperty(all, '_parts', { value: { units, racial, ruler }, enumerable: false });
    cache.players[player.id] = all;
    return all;
  };

  /** playerEffects + buildings + city enchantments + city temp effects (not cached; cheap). */
  Rules.cityEffects = function (game, city) {
    Rules.ensureCity(game, city);
    const out = {};
    if (city.owner >= 0) addEffects(out, Rules.playerEffects(game, city.owner));
    for (const id of city.buildings || []) { const b = get('buildings', id); if (b) addEffects(out, b.effects); }
    for (const id of city.enchantments || []) { const sp = get('spells', id); if (sp && sp.enchant) addEffects(out, sp.enchant.effects); }
    for (const te of city.tempEffects || []) addEffects(out, te.effects);
    return out;
  };

  // ==================================================================== CITY ECONOMY
  Rules.cityCulture = function (game, city) {
    if (city.culture) return city.culture;
    if (city.freeCity && city.freeCity.culture && city.owner < 0) return city.freeCity.culture;
    const p = S().player(game, city.owner);
    return p ? p.cultureId : (city.freeCity ? city.freeCity.culture : null);
  };
  /** Highest unit tier recruitable in the city (buildings' unitTier, default 1). */
  Rules.cityUnitTier = function (game, city) {
    let t = 1;
    for (const id of city.buildings || []) { const b = get('buildings', id); if (b && b.effects && b.effects.unitTier > t) t = b.effects.unitTier; }
    return t;
  };
  Rules.cityCount = function (game, pid) { let n = 0; for (const c of game.cities) if (c.owner === pid && c.tier >= 1) n++; return n; };
  Rules.cityCap = function (game, player) {
    player = playerOf(game, player); if (!player) return C.BASE_CITY_CAP;
    const eff = Rules.playerEffects(game, player);
    const cap = C.BASE_CITY_CAP + (eff.cityCap || 0) + (player.cityCapBonus || 0);
    player.cityCap = cap;
    return cap;
  };
  Rules.cityTierForPop = function (pop) { let t = 1; for (let i = 1; i < C.MAX_TIER; i++) if (pop >= C.CITY_TIERS[i]) t = i + 1; return Math.min(C.MAX_TIER, t); };
  Rules.growthNeeded = function (game, city) {
    const eff = Rules.cityEffects(game, city);
    return Math.round(C.GROWTH_BASE * Math.pow(C.GROWTH_STEP, Math.max(0, city.pop - 1)) * (1 - clamp(eff.growthPct || 0, -50, 75) / 100));
  };

  function provinceNeighbors(game, prov) {
    const out = new Set();
    for (const h of prov.hexes) for (const n of S().neighbors(game, h)) { const p = game.province[n]; if (p >= 0 && p !== prov.id) out.add(p); }
    return Array.from(out);
  }
  Rules.provinceNeighbors = function (game, prov) { return provinceNeighbors(game, prov); };

  /** Yields of one province for the city owning it (terrain/feature hexes, node, material, improvement + adjacency). */
  Rules.provinceYields = function (game, prov, city) {
    const y = { food: 0, production: 0, gold: 0, mana: 0, knowledge: 0, draft: 0 };
    for (const h of prov.hexes) {
      const t = S().terrainDef(game, h), f = S().featureDef(game, h);
      if (t && t.yields) for (const k of Object.keys(t.yields)) if (y[k] !== undefined) y[k] += t.yields[k] * C.PROVINCE_YIELD_SCALE;
      if (f && f.yields) for (const k of Object.keys(f.yields)) if (y[k] !== undefined) y[k] += f.yields[k] * C.PROVINCE_YIELD_SCALE;
    }
    const imp = prov.improvement ? get('improvements', prov.improvement) : null;
    if (prov.resource && y[prov.resource] !== undefined && !(imp && imp.resource === prov.resource)) y[prov.resource] += C.NODE_YIELD;
    if (prov.magicMaterial && !(imp && imp.material === prov.magicMaterial)) { y.mana += C.MATERIAL_YIELD.mana; y.gold += C.MATERIAL_YIELD.gold; }
    if (imp) {
      for (const k of Object.keys(imp.yields || {})) if (y[k] !== undefined) y[k] += imp.yields[k];
      const adj = imp.adjacencyBonus || {};
      if (Object.keys(adj).length) {
        let bonus = 0;
        for (const np of provinceNeighbors(game, prov)) {
          const o = game.provinces[np];
          if (!o || !o.improvement || o.owner !== prov.owner) continue;
          const oi = get('improvements', o.improvement); if (!oi) continue;
          if (adj.sameKind && oi.kind === imp.kind) bonus += adj.sameKind;
          if (adj.improvement) bonus += adj.improvement;
          if (adj[oi.kind] && oi.kind !== 'sameKind') bonus += adj[oi.kind];
        }
        if (bonus) { // adjacency bonus goes to the improvement's main yield
          const keys = Object.keys(imp.yields || {}).filter(k => y[k] !== undefined);
          const main = keys.sort((a, b) => imp.yields[b] - imp.yields[a])[0] || 'production';
          y[main] += bonus;
        }
      }
    }
    return y;
  };

  /** Stability band for a value. */
  Rules.stabilityBand = function (value) { for (const b of C.STAB_BANDS) if (value >= b.min) return b; return C.STAB_BANDS[C.STAB_BANDS.length - 1]; };

  /** Target stability the city drifts toward each turn. */
  Rules.cityStabilityTarget = function (game, city, eff) {
    eff = eff || Rules.cityEffects(game, city);
    let s = C.STAB_BASE + (eff.stability || 0);
    if (city.isCapital) s += C.STAB_CAPITAL;
    s -= city.pop * C.STAB_PER_POP;
    s -= Math.max(0, city.provinces.length - 1) * C.STAB_PER_PROVINCE;
    for (const m of city.stabilityMods || []) s += m.amount;
    if (city.owner >= 0) { const over = Rules.cityCount(game, city.owner) - Rules.cityCap(game, city.owner); if (over > 0 && city.tier >= 1) s -= over * 10; }
    return clamp(Math.round(s), -100, 100);
  };

  /**
   * City yields per turn. gold is net of building upkeep; food is net of population upkeep.
   * Returns {food, production, gold, mana, knowledge, draft, stability(target), detail:{gross, buildingUpkeep, foodUpkeep, band, mult, overCap}}.
   */
  Rules.cityYields = function (game, city) {
    Rules.ensureCity(game, city);
    const eff = Rules.cityEffects(game, city);
    const tier = clamp(city.tier | 0, 0, C.MAX_TIER);
    const g = { food: 0, production: 0, gold: 0, mana: 0, knowledge: 0, draft: 0 };
    for (const k of Object.keys(g)) g[k] += C.TIER_BASE[k][tier];
    if (tier >= 1) for (const k of Object.keys(C.POP_YIELD)) g[k] += C.POP_YIELD[k] * city.pop;
    for (const pid of city.provinces) {
      const prov = game.provinces[pid]; if (!prov) continue;
      const py = Rules.provinceYields(game, prov, city);
      for (const k of Object.keys(g)) g[k] += py[k] || 0;
      if (tier === 0) break; // outposts only gather their home province
    }
    // flat effects (buildings, enchantments, empire-wide flats for city resources)
    for (const k of ['food', 'production', 'draft']) g[k] += eff[k] || 0;
    // gold/mana/knowledge flats from buildings & enchantments only (empire-wide flats are added once in playerIncome)
    let bflat = { gold: 0, mana: 0, knowledge: 0 };
    for (const id of city.buildings || []) { const b = get('buildings', id); if (b && b.effects) for (const k of Object.keys(bflat)) bflat[k] += b.effects[k] || 0; }
    for (const id of city.enchantments || []) { const sp = get('spells', id); if (sp && sp.enchant && sp.enchant.effects) for (const k of Object.keys(bflat)) bflat[k] += sp.enchant.effects[k] || 0; }
    for (const te of city.tempEffects || []) for (const k of Object.keys(bflat)) bflat[k] += (te.effects && te.effects[k]) || 0;
    for (const k of Object.keys(bflat)) g[k] += bflat[k];
    // percentage modifiers
    g.food = pct(g.food, eff.foodPct); g.production = pct(g.production, eff.productionPct); g.gold = pct(g.gold, eff.goldPct);
    g.mana = pct(g.mana, eff.manaPct); g.knowledge = pct(g.knowledge, eff.knowledgePct);
    // stability band multiplier
    const band = Rules.stabilityBand(city.stability);
    let mult = 1 + band.pct / 100;
    // over city cap penalty
    let overCap = 0;
    if (city.owner >= 0 && tier >= 1) { overCap = Math.max(0, Rules.cityCount(game, city.owner) - Rules.cityCap(game, city.owner)); if (overCap) mult *= Math.max(0.25, 1 - overCap * C.OVER_CAP_PENALTY_PCT / 100); }
    for (const k of Object.keys(g)) g[k] = Math.round(g[k] * mult);
    // upkeep
    let buildingUpkeep = 0;
    for (const id of city.buildings || []) { const b = get('buildings', id); if (b && b.upkeep) buildingUpkeep += b.upkeep.gold || 0; }
    if (tier === 0) buildingUpkeep += C.OUTPOST_UPKEEP;
    const foodUpkeep = tier >= 1 ? city.pop * C.FOOD_PER_POP : 0;
    const out = { food: g.food - foodUpkeep, production: g.production, gold: g.gold - buildingUpkeep, mana: g.mana, knowledge: g.knowledge, draft: g.draft,
      stability: Rules.cityStabilityTarget(game, city, eff), detail: { gross: g, buildingUpkeep, foodUpkeep, band: band.id, mult, overCap } };
    return out;
  };

  /** Upkeep for one unit {gold, mana, imperium} after upkeepPct (capped at −50%). */
  Rules.unitUpkeep = function (game, unit, eff) {
    const type = S().unitType(unit);
    const up = type.upkeep || {};
    if (!eff) eff = unit.owner >= 0 ? Rules.playerEffects(game, unit.owner) : {};
    const m = 1 + clamp(eff.upkeepPct || 0, C.UPKEEP_CAP_PCT, 100) / 100;
    const hero = unit.heroId !== null && unit.heroId >= 0;
    return { gold: hero ? 0 : Math.round((up.gold || 0) * m), mana: Math.round((up.mana || 0) * m), imperium: up.imperium || 0 };
  };

  /** Empire income per turn {gold, mana, knowledge, imperium, detail}. */
  Rules.playerIncome = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const eff = Rules.playerEffects(game, player);
    const d = { cities: { gold: 0, mana: 0, knowledge: 0 }, base: { gold: C.GOLD_BASE, imperium: C.IMPERIUM_BASE }, flats: { gold: eff.gold || 0, mana: eff.mana || 0, knowledge: eff.knowledge || 0, imperium: eff.imperium || 0 },
      unitUpkeep: { gold: 0, mana: 0, imperium: 0 }, enchantUpkeep: 0, vassals: 0, cityImperium: 0 };
    for (const c of game.cities) {
      if (c.owner !== player.id) continue;
      const y = Rules.cityYields(game, c);
      d.cities.gold += y.gold; d.cities.mana += y.mana; d.cities.knowledge += y.knowledge;
      if (c.tier >= 1) d.cityImperium += C.IMPERIUM_PER_CITY + (c.isCapital ? C.IMPERIUM_CAPITAL : 0);
    }
    for (const u of game.units) { if (u.owner !== player.id) continue; const up = Rules.unitUpkeep(game, u, eff); d.unitUpkeep.gold += up.gold; d.unitUpkeep.mana += up.mana; d.unitUpkeep.imperium += up.imperium; }
    for (const a of player.spells.active || []) { const sp = get('spells', a.spellId); if (sp && sp.upkeep) d.enchantUpkeep += sp.upkeep.mana || 0; }
    for (const c of game.cities) {
      if (!c.freeCity || c.freeCity.vassalOf !== player.id || c.owner >= 0) continue;
      const y = Rules.cityYields(game, c); d.vassals += Math.max(0, Math.round(y.gold * C.FC.VASSAL_SHARE));
    }
    const gold = d.base.gold + d.cities.gold + d.flats.gold + d.vassals - d.unitUpkeep.gold;
    const mana = d.cities.mana + d.flats.mana - d.unitUpkeep.mana - d.enchantUpkeep;
    const knowledge = d.cities.knowledge + d.flats.knowledge;
    const imperium = d.base.imperium + d.cityImperium + d.flats.imperium - d.unitUpkeep.imperium;
    const inc = { gold: Math.round(gold), mana: Math.round(mana), knowledge: Math.round(knowledge), imperium: Math.round(imperium), detail: d };
    player.income = { gold: inc.gold, mana: inc.mana, knowledge: inc.knowledge, imperium: inc.imperium };
    return inc;
  };

  // ==================================================================== RECRUITMENT, BUILDINGS, QUEUE
  /** Gold/mana/draft cost of a unit type for a player (recruitCostPct applies to gold & mana). */
  Rules.unitCost = function (game, player, type) {
    player = playerOf(game, player);
    const eff = player ? Rules.playerEffects(game, player) : {};
    const c = type.cost || {};
    const m = 1 + clamp(eff.recruitCostPct || 0, -60, 100) / 100;
    return { gold: Math.max(0, Math.round((c.gold || 0) * m)), mana: Math.max(0, Math.round((c.mana || 0) * m)), draft: Math.max(1, Math.round(c.draft || 0)) };
  };
  Rules.buildingCost = function (game, city, id) { const b = get('buildings', id); return b ? Math.round((b.cost && b.cost.production) || 100) : Infinity; };
  const isSummonOnly = t => !t || t.role === 'hero' || (t.source && t.source.type === 'summon') || (((t.cost && t.cost.draft) || 0) <= 0 && ((t.cost && t.cost.gold) || 0) <= 0);

  /** Unit type ids the city may recruit: culture roster + researched tome units, tier ≤ city unit tier. */
  Rules.recruitableUnits = function (game, city) {
    if (!city || city.owner < 0 || city.tier < 1) return [];
    const player = S().player(game, city.owner); Rules.ensurePlayer(game, player);
    const maxTier = Rules.cityUnitTier(game, city) + (Rules.playerEffects(game, player).unitTier || 0);
    const out = [];
    const seen = new Set();
    const cul = get('cultures', Rules.cityCulture(game, city));
    const push = id => { const t = get('units', id); if (!t || seen.has(id) || isSummonOnly(t) || (t.tier || 1) > maxTier) return; seen.add(id); out.push(id); };
    if (cul) for (const id of cul.units || []) push(id);
    for (const id of player.unlocked.units) push(id);
    return out;
  };
  Rules.canRecruit = function (game, city, typeId) {
    if (!city || city.owner < 0) return fail('notOwner');
    if (city.tier < 1) return fail('outpostCannotBuild');
    const type = get('units', typeId); if (!type) return fail('unknownUnit');
    if (isSummonOnly(type)) return fail('notRecruitable');
    const player = S().player(game, city.owner);
    const maxTier = Rules.cityUnitTier(game, city) + (Rules.playerEffects(game, player).unitTier || 0);
    if ((type.tier || 1) > maxTier) return fail('tierTooHigh');
    if (!Rules.recruitableUnits(game, city).includes(typeId)) return fail('notRecruitable');
    if ((city.queue || []).length >= C.QUEUE_MAX) return fail('queueFull');
    const cost = Rules.unitCost(game, player, type);
    if (player.resources.gold < cost.gold) return fail('notEnoughGold');
    if (player.resources.mana < cost.mana) return fail('notEnoughMana');
    return { ok: true, cost };
  };

  Rules.cityIsCoastal = function (game, city) {
    for (const pid of city.provinces) { const p = game.provinces[pid]; if (p && p.coastal) return true; }
    for (const n of Hex().spiralIdx(city.hex, 1, game.W, game.H)) if (S().isWater(game, n)) return true;
    return false;
  };
  Rules.canBuild = function (game, city, id) {
    if (!city || city.owner < 0) return fail('notOwner');
    if (city.tier < 1) return fail('outpostCannotBuild');
    const b = get('buildings', id); if (!b) return fail('unknownBuilding');
    if (city.buildings.includes(id)) return fail('alreadyBuilt');
    if ((city.queue || []).some(q => q.type === 'building' && q.id === id)) return fail('alreadyQueued');
    if ((b.tier || 1) > city.tier) return fail('cityTierTooLow');
    for (const p of b.prereq || []) if (!city.buildings.includes(p)) return fail('missingPrereq');
    if (b.culture && b.culture !== Rules.cityCulture(game, city)) return fail('wrongCulture');
    if (b.needsCoast && !Rules.cityIsCoastal(game, city)) return fail('needsCoast');
    if ((city.queue || []).length >= C.QUEUE_MAX) return fail('queueFull');
    return { ok: true, cost: Rules.buildingCost(game, city, id) };
  };
  Rules.buildableBuildings = function (game, city) {
    const out = [];
    for (const b of Data().list('buildings')) if (Rules.canBuild(game, city, b.id).ok) out.push(b.id);
    return out;
  };

  /** Add an item to the city queue: {type:'unit'|'building'|'improvement', id, pid?}. Unit gold/mana and improvement gold/imperium are paid now. */
  Rules.enqueue = function (game, city, item) {
    Rules.ensureCity(game, city);
    const player = S().player(game, city.owner); if (!player) return fail('notOwner');
    if (item.type === 'unit') {
      const r = Rules.canRecruit(game, city, item.id); if (!r.ok) return r;
      player.resources.gold -= r.cost.gold; player.resources.mana -= r.cost.mana;
      city.queue.push({ type: 'unit', id: item.id, progress: 0, cost: r.cost, need: r.cost.draft });
    } else if (item.type === 'building') {
      const r = Rules.canBuild(game, city, item.id); if (!r.ok) return r;
      city.queue.push({ type: 'building', id: item.id, progress: 0, need: r.cost });
    } else if (item.type === 'improvement') {
      const r = Rules.canBuildImprovement(game, city, item.pid, item.id); if (!r.ok) return r;
      const imp = get('improvements', item.id);
      player.resources.gold -= r.cost.gold; player.resources.imperium -= r.cost.imperium;
      const need = (imp.cost && imp.cost.production) || 0;
      if (need <= 0) { Rules.placeImprovement(game, city, item.pid, item.id); return { ok: true, instant: true, cost: r.cost }; }
      city.queue.push({ type: 'improvement', id: item.id, pid: item.pid, progress: 0, need, paid: r.cost });
    } else return fail('unknownAction');
    if (Events()) Events().emit('city:changed', { cityId: city.id });
    return { ok: true, index: city.queue.length - 1 };
  };
  /** Remove queue item `index`, refunding up-front costs (draft progress returns to the city stockpile). */
  Rules.dequeue = function (game, city, index) {
    const q = city.queue || [];
    if (index < 0 || index >= q.length) return fail('badIndex');
    const it = q[index];
    const player = S().player(game, city.owner);
    if (player) {
      if (it.type === 'unit' && it.cost) { player.resources.gold += it.cost.gold; player.resources.mana += it.cost.mana; city.draft = Math.min(C.DRAFT_CAP, (city.draft || 0) + (it.progress || 0)); }
      if (it.type === 'improvement' && it.paid) { player.resources.gold += it.paid.gold; player.resources.imperium += it.paid.imperium; }
    }
    q.splice(index, 1);
    if (Events()) Events().emit('city:changed', { cityId: city.id });
    return { ok: true, item: it };
  };

  /** Garrison army of a city (created on demand). Returns an army with room, creating a second stack if the garrison is full. */
  Rules.garrisonArmy = function (game, city, needRoom) {
    let army = S().army(game, city.garrisonArmyId);
    if (army && army.hex !== city.hex) army = null;
    if (!army) {
      army = S().armiesAt(game, city.hex).find(a => a.owner === city.owner) || null;
      if (!army) army = S().createArmy(game, city.owner, city.hex, []);
      city.garrisonArmyId = army.id;
    }
    if (needRoom && army.units.length >= C.UNITS_PER_ARMY) {
      const other = S().armiesAt(game, city.hex).find(a => a.owner === city.owner && a.units.length < C.UNITS_PER_ARMY);
      if (other) return other;
      return S().createArmy(game, city.owner, city.hex, []);
    }
    return army;
  };

  /**
   * Advance the city queue: `production` goes to the first building/improvement item, the city's draft stockpile to the first unit item.
   * Returns the completed items. Called by Turn once per turn.
   */
  Rules.processQueue = function (game, city, production, draftIncome) {
    Rules.ensureCity(game, city);
    const done = [];
    const q = city.queue;
    city.draft = Math.min(C.DRAFT_CAP, city.draft + Math.max(0, draftIncome || 0));
    let prod = Math.max(0, production || 0);
    // buildings / improvements lane
    for (let guard = 0; guard < 4 && prod > 0; guard++) {
      const i = q.findIndex(x => x.type !== 'unit'); if (i < 0) break;
      const it = q[i];
      const take = Math.min(prod, Math.max(0, it.need - it.progress));
      it.progress += take; prod -= take;
      if (it.progress < it.need) break;
      q.splice(i, 1);
      Rules.completeQueueItem(game, city, it); done.push(it);
    }
    // unit lane: one unit per turn at most
    const ui = q.findIndex(x => x.type === 'unit');
    if (ui >= 0) {
      const it = q[ui];
      const take = Math.min(city.draft, Math.max(0, it.need - it.progress));
      it.progress += take; city.draft -= take;
      if (it.progress >= it.need) { q.splice(ui, 1); Rules.completeQueueItem(game, city, it); done.push(it); }
    }
    return done;
  };
  Rules.completeQueueItem = function (game, city, it) {
    const player = S().player(game, city.owner);
    if (it.type === 'building') {
      if (!city.buildings.includes(it.id)) city.buildings.push(it.id);
      const b = get('buildings', it.id);
      if (b && b.effects && b.effects.walls) city.walls = Math.max(city.walls || 0, b.effects.walls);
      Rules.invalidate(city.owner);
      Rules.notify(game, city.owner, 'good', L(`${city.name}: ${b ? b.name.ko : it.id} 완공`, `${city.name}: ${b ? b.name.en : it.id} completed`), 'production', { cityId: city.id });
    } else if (it.type === 'unit') {
      const army = Rules.garrisonArmy(game, city, true);
      const unit = Rules.createUnitFor(game, city.owner, it.id, army.id);
      if (unit) {
        const t = S().unitType(unit);
        if (Events()) Events().emit('unit:recruited', { unitId: unit.id, cityId: city.id });
        Rules.notify(game, city.owner, 'good', L(`${city.name}: ${t.name.ko} 모집 완료`, `${city.name}: ${t.name.en} recruited`), 'recruit', { cityId: city.id, unitId: unit.id });
      }
    } else if (it.type === 'improvement') {
      Rules.placeImprovement(game, city, it.pid, it.id);
    }
    if (player) player.stats.units = S().allUnitsOfPlayer(game, player.id).length;
    if (Events()) Events().emit('city:changed', { cityId: city.id });
  };

  AOW.Rules = Rules;
})(window.AOW = window.AOW || {});
