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
//   Rules.improvementOptions(game, city, pid) / buildableImprovements (alias) / canBuildImprovement / placeImprovement /
//        buildImprovement / annexableProvinces / annexProvince / annexRange / claimProvince
//   Rules.queueItemCost / moveQueueItem / renameCity / cityYieldBreakdown / stabilityBreakdown / addStabilityMod   (UI helpers)
//   Rules.canFoundOutpost / foundOutpost / upgradeOutpost
//   Rules.unitStats(game, unit) / unitEnchantments / syncUnit / createUnitFor(game, pid, typeId, armyId) / killUnit / applyStatus
//   Rules.grantXp / rankName / heroLevelUp / heroAvailableSkills / heroStats / equipItem / unequipItem / rollLoot /
//        heroXpForLevel / heroXpToNext / grantHeroXp / HERO_ITEM_SLOTS
//   Rules.moveProfile / moveCost / armyMaxMp / pathfind / reachable / moveArmy / attackTarget / mergeArmies / splitArmy / disband
//   Rules.isHostile / freeCityAtWar / canEmbark / encounterAt(game, army, idx, occ?) / blocksMovement / inEnemyZoc /
//        occupancy(game) (hex → armies map for bulk pathfinding) / onArmyArrive (node claim, teleporters)
//   Rules.recomputeVisibility / canSee / hasExplored / visionRadius
//   Rules.availableTomes / tomeLockReason / tomeAffinity / selectTome / researchOptions / researchCost / startResearch /
//        completeResearch / advanceResearch (per-turn) / autoResearch (AI) / isResearched
//   Rules.canCast / castSpell / cancelCasting / advanceCasting (per-turn) / dispel / activeSpells / knownSpells /
//        applySpellEffect / spellCost / castingMax / summonUnits
//   Rules.canBuyEmpireSkill / buyEmpireSkill / unlockEmpireSkill (alias) / empireSkillOptions / empireSkillCost / totalAffinity
//   Rules.captureCity(game, city, pid, 'annex'|'vassal'|'raze') / freeCities / freeCityOpinion / freeCityAction / freeCityTick /
//        freeCityStones / clearStructure / spawnGuards / regenGuards / guardSpecFor / guardPool / pickGuardUnits
//   Rules.armyStrength / quickResolve (fallback battle resolution when AOW.Combat is absent)
//   Rules.victoryCheck / startMagicVictory / score / playerAlive / checkElimination / landProvinceCount
//   Rules.reasonText / notify / log / L (bilingual text helper)
//   Rules.ensurePlayer(game, player) / ensureCity(game, city)   fill the extra state fields listed below
//
// Extra state fields (all plain JSON, survive State.serialize):
//   player.unlocked {units:[], improvements:[], skills:[]}, player.transformations [ids], player.research.done [contentIds],
//   player.items [itemIds] (inventory), player.annexedWonders [structureIds], player.tempEffects [{id, effects, turns}],
//   player.whisperStones n, player.magicVictory null|{startTurn, turns, beacons:[cityIds]}, player.expansionTurns n
//   (+ player.expansionMark, the turn it last counted), player.unlocked.buildings [ids],
//   player.casting.current null|{spellId, target, progress, need}, player.stats.researched n
//   city.draft (stockpiled draft), city.tempEffects [{id, effects, turns}], city.culture (null = owner culture),
//   city.beacon bool, city.stabilityMods [{id, amount, turns, text}]
//   city.freeCity.stones [pids] (assigned whispering stones), city.freeCity.warWith [pids]
//   army.raid {home: structureId, born: turn, targetCity} on marauder raid armies; structure.spawnTimer on infestations
//   structure.infestationCleared (bool, set just before the spawner is removed)
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
  // Korean particle after a (possibly bilingual) name, e.g. J(city.name, '이/가') → '하늘성이'
  const J = (w, pair) => AOW.I18n.josa(w, pair);
  const KO = o => (o && typeof o === 'object' ? (o.ko || o.en || '') : String(o === null || o === undefined ? '' : o));
  const EN = o => (o && typeof o === 'object' ? (o.en || o.ko || '') : String(o === null || o === undefined ? '' : o));
  const tIn = (lang, key) => ((AOW.I18n.dict[lang] || {})[key] || AOW.t(key));

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
    ANNEX_BASE: 40, ANNEX_STEP: 0.15, ANNEX_SPECIAL_MULT: 1.5, ANNEX_RANGE: 3,
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
    SPELL_RESOURCE_TURNS: 5, SUMMON_RANGE: 6, RESEARCH_SCALE: 0.03,
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
  /**
   * Push a notification {turn, pid, kind, text:{ko,en}, icon, ref, low} for the HUMAN player and emit 'notify'.
   * Events about AI realms, free cities or marauders (pid < 0 / non-human pid) are dropped here — they never
   * reach the human's feed (and never evict the human's own entries from the capped list). Realm-wide events
   * everyone should see go through Rules.notifyWorld. opts.low = routine news (rank-ups, production done…)
   * that only belongs in the HUD list, not in a centre-screen toast.
   */
  Rules.notify = function (game, pid, kind, text, icon, ref, opts) {
    opts = opts || {};
    const world = !!opts.world;
    const p = pid >= 0 ? game.players[pid] : null;
    if (!world && !(p && p.isHuman)) return null;
    game.notifications = game.notifications || [];
    const n = { id: S().newId(game, 'notification'), turn: game.turn, pid: world ? -1 : pid, kind, text, icon: icon || null, ref: ref || null, low: !!opts.low };
    game.notifications.push(n);
    if (game.notifications.length > C.NOTIFICATION_KEEP) game.notifications.splice(0, game.notifications.length - C.NOTIFICATION_KEEP);
    if (Events()) Events().emit('notify', { kind, text: AOW.L(text), icon: n.icon, ref: n.ref, notification: n, low: n.low });
    return n;
  };
  /** A world event every realm sees (eliminations, victory rituals, the winner). */
  Rules.notifyWorld = function (game, kind, text, icon, ref) { return Rules.notify(game, -1, kind, text, icon, ref, { world: true }); };
  const LOW = { low: true };
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
      Rules.notify(game, city.owner, 'good', L(`${city.name}: ${b ? b.name.ko : it.id} 완공`, `${city.name}: ${b ? b.name.en : it.id} completed`), 'production', { cityId: city.id }, LOW);
    } else if (it.type === 'unit') {
      const army = Rules.garrisonArmy(game, city, true);
      const unit = Rules.createUnitFor(game, city.owner, it.id, army.id);
      if (unit) {
        const t = S().unitType(unit);
        if (Events()) Events().emit('unit:recruited', { unitId: unit.id, cityId: city.id });
        Rules.notify(game, city.owner, 'good', L(`${city.name}: ${t.name.ko} 모집 완료`, `${city.name}: ${t.name.en} recruited`), 'recruit', { cityId: city.id, unitId: unit.id }, LOW);
      }
    } else if (it.type === 'improvement') {
      Rules.placeImprovement(game, city, it.pid, it.id);
    }
    if (player) player.stats.units = S().allUnitsOfPlayer(game, player.id).length;
    if (Events()) Events().emit('city:changed', { cityId: city.id });
  };

  /** Production still needed for a queue item (UI helper). */
  Rules.queueItemCost = function (game, city, item) {
    if (!item) return 0;
    if (item.need !== undefined) return item.need;
    if (item.type === 'building') return Rules.buildingCost(game, city, item.id);
    if (item.type === 'improvement') { const i = get('improvements', item.id); return (i && i.cost && i.cost.production) || 0; }
    if (item.type === 'unit') { const t = get('units', item.id); return t ? Rules.unitCost(game, city.owner, t).draft : 0; }
    return 0;
  };
  /** Reorder the queue (UI drag/arrows). */
  Rules.moveQueueItem = function (game, city, from, to) {
    const q = city.queue || [];
    if (from < 0 || from >= q.length || to < 0 || to >= q.length || from === to) return fail('badIndex');
    const it = q.splice(from, 1)[0];
    q.splice(to, 0, it);
    if (Events()) Events().emit('city:changed', { cityId: city.id });
    return { ok: true };
  };
  Rules.renameCity = function (game, city, name) {
    if (!city || !name) return fail('badIndex');
    city.name = String(name).slice(0, 40);
    if (Events()) Events().emit('city:changed', { cityId: city.id });
    return { ok: true };
  };

  /** Per-resource contribution list for the city screen tooltips: {food:[{label,value}], …}. */
  Rules.cityYieldBreakdown = function (game, city) {
    Rules.ensureCity(game, city);
    const keys = ['food', 'production', 'gold', 'mana', 'knowledge', 'draft'];
    const out = {}; for (const k of keys) out[k] = [];
    const tier = clamp(city.tier | 0, 0, C.MAX_TIER);
    for (const k of keys) {
      if (C.TIER_BASE[k][tier]) out[k].push({ label: AOW.L(L('도시 등급 ' + tier, 'City tier ' + tier)), value: C.TIER_BASE[k][tier] });
      if (tier >= 1 && C.POP_YIELD[k]) out[k].push({ label: AOW.L(L('인구 ' + city.pop, 'Population ' + city.pop)), value: C.POP_YIELD[k] * city.pop });
    }
    for (const pid of city.provinces) {
      const prov = game.provinces[pid]; if (!prov) continue;
      const py = Rules.provinceYields(game, prov, city);
      const label = provinceLabel(game, prov);
      for (const k of keys) if (Math.round(py[k] || 0)) out[k].push({ label, value: Math.round(py[k]) });
      if (tier === 0) break;
    }
    for (const id of city.buildings || []) {
      const b = get('buildings', id); if (!b || !b.effects) continue;
      for (const k of keys) if (b.effects[k]) out[k].push({ label: AOW.L(b.name), value: b.effects[k] });
    }
    for (const id of city.enchantments || []) {
      const sp = get('spells', id); if (!sp || !sp.enchant || !sp.enchant.effects) continue;
      for (const k of keys) if (sp.enchant.effects[k]) out[k].push({ label: AOW.L(sp.name), value: sp.enchant.effects[k] });
    }
    const eff = city.owner >= 0 ? Rules.playerEffects(game, city.owner) : {};
    for (const k of ['food', 'production', 'draft']) if (eff[k]) out[k].push({ label: AOW.L(L('제국 보너스', 'Empire bonuses')), value: eff[k] });
    const band = Rules.stabilityBand(city.stability);
    if (band.pct) for (const k of keys) out[k].push({ label: AOW.L(L('안정도', 'Stability')) + ' (' + band.id + ')', value: null, pct: band.pct });
    if (tier >= 1) {
      out.food.push({ label: AOW.L(L('인구 소비', 'Population upkeep')), value: -city.pop * C.FOOD_PER_POP });
      let up = 0; for (const id of city.buildings || []) { const b = get('buildings', id); if (b && b.upkeep) up += b.upkeep.gold || 0; }
      if (up) out.gold.push({ label: AOW.L(L('건물 유지비', 'Building upkeep')), value: -up });
    }
    return out;
  };
  function provinceLabel(game, prov) {
    const t = Data().has('terrains', S().TERRAINS[prov.terrain]) ? Data().get('terrains', S().TERRAINS[prov.terrain]) : null;
    const imp = prov.improvement ? get('improvements', prov.improvement) : null;
    return (imp ? AOW.L(imp.name) : (t ? AOW.L(t.name) : 'province')) + ' #' + prov.id;
  }
  /** Stability contributions for the city screen tooltip: [{label, value}]. */
  Rules.stabilityBreakdown = function (game, city) {
    const eff = Rules.cityEffects(game, city);
    const out = [{ label: AOW.L(L('기본', 'Base')), value: C.STAB_BASE }];
    if (eff.stability) out.push({ label: AOW.L(L('건물·특성', 'Buildings & traits')), value: eff.stability });
    if (city.isCapital) out.push({ label: AOW.L(L('수도', 'Capital')), value: C.STAB_CAPITAL });
    if (city.pop) out.push({ label: AOW.L(L('인구', 'Population')), value: -city.pop * C.STAB_PER_POP });
    const extra = Math.max(0, city.provinces.length - 1);
    if (extra) out.push({ label: AOW.L(L('병합 지방', 'Annexed provinces')), value: -extra * C.STAB_PER_PROVINCE });
    for (const m of city.stabilityMods || []) out.push({ label: AOW.L(m.text || L(m.id, m.id)), value: m.amount });
    if (city.owner >= 0) { const over = Rules.cityCount(game, city.owner) - Rules.cityCap(game, city.owner); if (over > 0 && city.tier >= 1) out.push({ label: AOW.L(L('도시 상한 초과', 'Over city cap')), value: -over * 10 }); }
    return out;
  };
  /** Add a timed stability modifier to a city. */
  Rules.addStabilityMod = function (game, city, id, amount, turns, text) {
    Rules.ensureCity(game, city);
    const ex = city.stabilityMods.find(m => m.id === id);
    if (ex) { ex.amount = amount; ex.turns = turns; return ex; }
    const m = { id, amount, turns: turns === undefined ? C.STAB_MOD_TURNS : turns, text: text || null };
    city.stabilityMods.push(m);
    return m;
  };

  // ==================================================================== PROVINCE IMPROVEMENTS
  const provTerrain = prov => S().TERRAINS[prov.terrain] || 'grass';
  const provFeature = prov => S().FEATURES[prov.feature] || 'none';
  function featureMatches(list, feat) {
    if (!list || !list.length) return true;
    for (const f of list) { if (f === null || f === 'none') { if (feat === 'none') return true; } else if (f === feat) return true; }
    return false;
  }
  /** Gold/imperium/production cost of an improvement for a player (provinceCostPct applies). */
  Rules.improvementCost = function (game, player, imp) {
    player = playerOf(game, player);
    const eff = player ? Rules.playerEffects(game, player) : {};
    const m = 1 + clamp(eff.provinceCostPct || 0, -75, 200) / 100;
    const c = imp.cost || {};
    return { gold: Math.max(0, Math.round((c.gold || 0) * m)), imperium: Math.max(0, Math.round((c.imperium || 0) * m)), production: Math.max(0, Math.round(c.production || 0)) };
  };
  /** Can `city` develop province `pid` with improvement `id`? → {ok, cost} | {ok:false, reason}. */
  Rules.canBuildImprovement = function (game, city, pid, id) {
    if (!city || city.owner < 0) return fail('notOwner');
    const player = S().player(game, city.owner); Rules.ensurePlayer(game, player);
    const prov = game.provinces[pid];
    if (!prov) return fail('badIndex');
    if (!city.provinces.includes(pid)) return fail('notYourProvince');
    if (prov.improvement) return fail('alreadyImproved');
    const imp = get('improvements', id); if (!imp) return fail('unknownImprovement');
    if (imp.tome && !(player.tomes || []).includes(imp.tome) && !player.unlocked.improvements.includes(id)) return fail('notUnlocked');
    if (imp.resource) { if (prov.resource !== imp.resource) return fail('needsResource'); }
    if (imp.material) { if (prov.magicMaterial !== imp.material) return fail('needsMaterial'); }
    if (!imp.resource && !imp.material) {
      if (imp.terrain && imp.terrain.length && !imp.terrain.includes(provTerrain(prov))) return fail('wrongTerrain');
      if (imp.feature && imp.feature.length && !featureMatches(imp.feature, provFeature(prov))) return fail('wrongFeature');
    }
    if (imp.unique) { for (const p of game.provinces) if (p.owner === player.id && p.improvement === id) return fail('unique'); }
    const cost = Rules.improvementCost(game, player, imp);
    if (player.resources.gold < cost.gold) return fail('notEnoughGold');
    if (player.resources.imperium < cost.imperium) return fail('notEnoughImperium');
    return { ok: true, cost };
  };
  /** Improvement ids buildable on province `pid` of `city`. */
  Rules.improvementOptions = function (game, city, pid) {
    const out = [];
    for (const imp of Data().list('improvements')) {
      const r = Rules.canBuildImprovement(game, city, pid, imp.id);
      if (r.ok || r.reason === 'notEnoughGold' || r.reason === 'notEnoughImperium') out.push(imp.id);
    }
    return out;
  };
  Rules.buildableImprovements = function (game, city, pid) { return Rules.improvementOptions(game, city, pid); };
  /** Place the improvement immediately (no cost checks — called by the queue or an instant build). */
  Rules.placeImprovement = function (game, city, pid, id) {
    const prov = game.provinces[pid]; if (!prov) return fail('badIndex');
    const imp = get('improvements', id); if (!imp) return fail('unknownImprovement');
    prov.improvement = id;
    Rules.invalidate(city.owner);
    Rules.notify(game, city.owner, 'good', L(`${city.name}: ${KO(imp.name)} 건설 완료`, `${city.name}: ${EN(imp.name)} built`), 'production', { cityId: city.id, provinceId: pid }, LOW);
    if (Events()) Events().emit('city:changed', { cityId: city.id });
    return { ok: true, improvement: id };
  };
  /** Pay for and start (or instantly finish) a province improvement. */
  Rules.buildImprovement = function (game, city, pid, id) {
    const r = Rules.canBuildImprovement(game, city, pid, id);
    if (!r.ok) return r;
    return Rules.enqueue(game, city, { type: 'improvement', id, pid });
  };

  // ==================================================================== ANNEXATION
  /** Imperium cost of the city's next province annexation. */
  Rules.annexCost = function (game, city, prov) {
    const annexed = Math.max(0, (city.provinces || []).length - 1);
    const eff = city.owner >= 0 ? Rules.playerEffects(game, city.owner) : {};
    let n = C.ANNEX_BASE * Math.pow(1 + C.ANNEX_STEP, annexed);
    if (prov) {
      const st = prov.center >= 0 ? S().structureAt(game, prov.center) : null;
      if (st && (st.kind === 'wonder' || st.kind === 'free_city')) n *= C.ANNEX_SPECIAL_MULT;
      if (prov.magicMaterial) n *= C.ANNEX_SPECIAL_MULT;
    }
    n *= 1 + clamp(eff.provinceCostPct || 0, -75, 200) / 100;
    return { imperium: Math.max(1, Math.round(n)) };
  };
  /** Max annex range (hexes from the city centre). */
  Rules.annexRange = function (game, city) {
    const eff = city.owner >= 0 ? Rules.playerEffects(game, city.owner) : {};
    return C.ANNEX_RANGE + Math.max(0, (city.tier | 0) - 1) + (eff.annexRange || 0);
  };
  /** Province ids the city may annex next (adjacent to its domain, unclaimed, in range, under the pop limit). */
  Rules.annexableProvinces = function (game, city) {
    if (!city || city.owner < 0 || city.tier < 1) return [];
    const annexed = Math.max(0, (city.provinces || []).length - 1);
    if (annexed >= city.pop) return [];
    const range = Rules.annexRange(game, city);
    const owned = new Set(city.provinces);
    const out = new Set();
    for (const pid of city.provinces) {
      const prov = game.provinces[pid]; if (!prov) continue;
      for (const np of provinceNeighbors(game, prov)) {
        if (owned.has(np) || out.has(np)) continue;
        const q = game.provinces[np];
        if (!q || q.owner >= 0 || q.cityId >= 0) continue;
        if (S().isWater(game, q.center)) continue;
        if (Hex().distIdx(city.hex, q.center, game.W) > range) continue;
        const st = S().structureAt(game, q.center);
        if (st && (st.kind === 'infestation' || st.kind === 'free_city' || st.kind === 'city' || st.kind === 'outpost')) continue;
        if (st && st.kind === 'wonder' && !st.cleared) continue;
        out.add(np);
      }
    }
    return Array.from(out);
  };
  /** Claim every hex of a province for a player and refresh the domain layer. */
  function claimProvince(game, prov, pid, cityId) {
    prov.owner = pid;
    prov.annexTurn = game.turn;
    if (cityId !== undefined && cityId !== null) prov.cityId = cityId;
    for (const h of prov.hexes) game.owner[h] = pid;
  }
  Rules.claimProvince = claimProvince;
  /** Annex province `pid` into `city` (pays imperium, applies annexed-wonder bonuses). */
  Rules.annexProvince = function (game, city, pid) {
    if (!city || city.owner < 0) return fail('notOwner');
    const player = S().player(game, city.owner); Rules.ensurePlayer(game, player);
    const prov = game.provinces[pid];
    if (!prov) return fail('badIndex');
    if (!Rules.annexableProvinces(game, city).includes(pid)) {
      if (Math.max(0, city.provinces.length - 1) >= city.pop) return fail('popLimit');
      return fail('notAnnexable');
    }
    const cost = Rules.annexCost(game, city, prov);
    if (player.resources.imperium < cost.imperium) return fail('notEnoughImperium');
    player.resources.imperium -= cost.imperium;
    claimProvince(game, prov, player.id, city.id);
    city.provinces.push(pid);
    // annexed ancient wonder → empire-wide annexEffects
    const st = S().structureAt(game, prov.center);
    if (st && st.kind === 'wonder' && st.cleared) {
      st.owner = player.id;
      if (!player.annexedWonders.includes(st.id)) player.annexedWonders.push(st.id);
      const w = get('wonders', st.refId);
      if (w) Rules.notify(game, player.id, 'good', L(`${KO(w.name)} 합병 — 제국 보너스 획득`, `${EN(w.name)} annexed — empire bonus gained`), 'star', { cityId: city.id, structureId: st.id });
    }
    player.stats.territory = game.provinces.filter(p => p.owner === player.id).length;
    Rules.invalidate(player.id);
    Rules.recomputeVisibility(game, player.id);
    Rules.notify(game, player.id, 'good', L(`${city.name}: 새 지방을 병합했습니다.`, `${city.name}: province annexed.`), 'stability', { cityId: city.id, provinceId: pid }, LOW);
    if (Events()) Events().emit('city:changed', { cityId: city.id });
    return { ok: true, cost, provinceId: pid };
  };

  // ==================================================================== OUTPOSTS & CITY FOUNDING
  /** Can `player` found an outpost at hexIdx (optionally with `armyId` standing there)? */
  Rules.canFoundOutpost = function (game, player, hexIdx, armyId) {
    player = playerOf(game, player); if (!player) return fail('notOwner');
    Rules.ensurePlayer(game, player);
    if (hexIdx === undefined || hexIdx < 0 || hexIdx >= game.W * game.H) return fail('badIndex');
    if (S().isWater(game, hexIdx)) return fail('notLand');
    if (game.feature[hexIdx] === S().F.peak) return fail('notLand');
    if (game.structure[hexIdx] >= 0) return fail('occupied');
    const prov = S().provinceOf(game, hexIdx);
    if (!prov) return fail('notLand');
    if (prov.owner >= 0 && prov.owner !== player.id) return fail('inDomain');
    if (prov.cityId >= 0) return fail('inDomain');
    for (const c of game.cities) if (Hex().distIdx(c.hex, hexIdx, game.W) < C.OUTPOST_MIN_DIST) return fail('tooClose');
    if (armyId !== undefined && armyId !== null) {
      const army = S().army(game, armyId);
      if (!army) return fail('noArmy');
      if (army.hex !== hexIdx) return fail('armyNotHere');
      if (army.owner !== player.id) return fail('notOwner');
    }
    if (player.resources.gold < C.OUTPOST_COST) return fail('notEnoughGold');
    if (player.resources.imperium < C.OUTPOST_IMPERIUM) return fail('notEnoughImperium');
    return { ok: true, cost: { gold: C.OUTPOST_COST, imperium: C.OUTPOST_IMPERIUM } };
  };
  /** Found a tier-0 outpost (claims its province). */
  Rules.foundOutpost = function (game, player, hexIdx, armyId) {
    player = playerOf(game, player);
    const r = Rules.canFoundOutpost(game, player, hexIdx, armyId);
    if (!r.ok) return r;
    player.resources.gold -= r.cost.gold;
    player.resources.imperium -= r.cost.imperium;
    const name = S().cityName(game, player, rng(game));
    const city = S().createCity(game, player.id, hexIdx, { name, tier: 0, pop: 1 });
    Rules.ensureCity(game, city);
    const prov = S().provinceOf(game, hexIdx);
    if (prov) { claimProvince(game, prov, player.id, city.id); if (!city.provinces.includes(prov.id)) city.provinces.push(prov.id); }
    player.stats.territory = game.provinces.filter(p => p.owner === player.id).length;
    Rules.invalidate(player.id);
    Rules.recomputeVisibility(game, player.id);
    Rules.notify(game, player.id, 'good', L(`전초기지 ${name} 건설`, `Outpost ${name} founded`), 'city', { cityId: city.id }, LOW);
    if (Events()) { Events().emit('city:founded', { cityId: city.id }); Events().emit('city:changed', { cityId: city.id }); }
    return { ok: true, cityId: city.id, city };
  };
  /** Upgrade a tier-0 outpost into a real city (imperium + city cap). */
  Rules.upgradeOutpost = function (game, city) {
    if (!city || city.owner < 0) return fail('notOwner');
    if (city.tier !== 0) return fail('notOutpost');
    const player = S().player(game, city.owner); Rules.ensurePlayer(game, player);
    if (Rules.cityCount(game, player.id) >= Rules.cityCap(game, player.id)) return fail('cityCap');
    const eff = Rules.playerEffects(game, player);
    const cost = Math.max(1, Math.round(C.OUTPOST_UPGRADE_IMPERIUM * (1 + clamp(eff.provinceCostPct || 0, -75, 200) / 100)));
    if (player.resources.imperium < cost) return fail('notEnoughImperium');
    player.resources.imperium -= cost;
    city.tier = 1;
    city.pop = Math.max(1, city.pop);
    city.stability = 50;
    const st = S().structureAt(game, city.hex);
    if (st) st.kind = 'city';
    player.stats.cities = Rules.cityCount(game, player.id);
    Rules.invalidate(player.id);
    Rules.notify(game, player.id, 'good', L(`${J(city.name, '이/가')} 도시로 성장했습니다.`, `${city.name} has grown into a city.`), 'city', { cityId: city.id });
    if (Events()) { Events().emit('city:founded', { cityId: city.id }); Events().emit('city:changed', { cityId: city.id }); }
    return { ok: true, cost: { imperium: cost } };
  };

  // ==================================================================== UNITS, RANKS, STATS
  Rules.rankName = r => AOW.t('rules.rank.' + clamp(r | 0, 0, C.RANK_MAX));
  const isRacial = type => (type.tags || []).includes('racial');

  /** Does a unit_enchant apply to this unit? `appliesTo` holds roles, tags, 'racial' or 'all'. */
  function enchantApplies(ench, type) {
    const list = ench && ench.appliesTo;
    if (!list || !list.length || list.includes('all')) return true;
    if (list.includes(type.role)) return true;
    for (const tag of type.tags || []) if (list.includes(tag)) return true;
    if (list.includes('racial') && isRacial(type)) return true;
    return false;
  }
  /** Spell ids of every enchantment currently affecting `unit` (empire-wide unit enchants + personal ones). */
  Rules.unitEnchantments = function (game, unit) {
    const out = [];
    const type = S().unitType(unit);
    const player = unit.owner >= 0 ? S().player(game, unit.owner) : null;
    if (player && player.spells && player.spells.active) {
      for (const a of player.spells.active) {
        const sp = get('spells', a.spellId);
        if (!sp || sp.kind !== 'unit_enchant' || !sp.enchant) continue;
        if (enchantApplies(sp.enchant, type)) out.push(sp.id);
      }
    }
    for (const id of unit.enchantments || []) if (!out.includes(id)) out.push(id);
    return out;
  };

  const HERO_ITEM_SLOTS = ['weapon', 'offhand', 'armor', 'helm', 'trinket', 'mount'];
  Rules.HERO_ITEM_SLOTS = HERO_ITEM_SLOTS;

  /**
   * Full resolved stats of a unit: base type (or unit.custom) + rank + player/racial/ruler effects +
   * enchantments + transformations + hero level/skills/items + statuses.
   * → {hp, maxHp, def, res, attacks, abilities, passives, immunities, mp, morale, vision, tags, moveClass, …}
   */
  Rules.unitStats = function (game, unit) {
    const type = S().unitType(unit);
    const b = {};                                     // summed §3.1 unit effects
    const grantAbilities = [];
    const player = unit.owner >= 0 ? S().player(game, unit.owner) : null;
    const hero = unit.heroId !== null && unit.heroId >= 0 ? S().hero(game, unit.heroId) : null;
    // rank
    const rank = clamp(unit.rank | 0, 0, C.RANK_MAX);
    if (rank) {
      b.hpPct = (b.hpPct || 0) + C.RANK.hpPct * rank;
      for (const at of C.RANK.defResAt) if (rank >= at) { b.def = (b.def || 0) + 1; b.res = (b.res || 0) + 1; }
      if (rank >= C.RANK.dmgPctAt) b.dmgPct = (b.dmgPct || 0) + C.RANK.dmgPct;
    }
    // empire effects
    if (player) {
      const eff = Rules.playerEffects(game, player);
      const parts = eff._parts || {};
      for (const k of Object.keys(parts.units || {})) if (isUnitKey(k)) b[k] = (b[k] || 0) + parts.units[k];
      if (isRacial(type)) for (const k of Object.keys(parts.racial || {})) if (isUnitKey(k)) b[k] = (b[k] || 0) + parts.racial[k];
      if (hero && hero.isRuler) for (const k of Object.keys(parts.ruler || {})) if (isUnitKey(k)) b[k] = (b[k] || 0) + parts.ruler[k];
    }
    // per-unit transformations
    for (const id of unit.transformations || []) {
      const tr = get('transformations', id); if (!tr) continue;
      for (const k of Object.keys(tr.effects || {})) if (isUnitKey(k)) b[k] = (b[k] || 0) + tr.effects[k];
    }
    // enchantments
    const enchants = Rules.unitEnchantments(game, unit);
    let attackChannel = null, attackStatus = null;
    for (const id of enchants) {
      const sp = get('spells', id); if (!sp || !sp.enchant) continue;
      for (const k of Object.keys(sp.enchant.effects || {})) if (isUnitKey(k)) b[k] = (b[k] || 0) + sp.enchant.effects[k];
      if (sp.enchant.grantAbility) grantAbilities.push(sp.enchant.grantAbility);
      if (sp.enchant.attackChannel) attackChannel = sp.enchant.attackChannel;
      if (sp.enchant.attackStatus) attackStatus = sp.enchant.attackStatus;
    }
    // hero: class growth, skills, items
    let attackBonus = null, attackOverride = null;
    if (hero) {
      const cls = get('heroClasses', hero.classId);
      const lv = Math.max(0, (hero.level || 1) - 1);
      if (cls && cls.growth) {
        b.hp = (b.hp || 0) + (cls.growth.hp || 0) * lv;
        b.def = (b.def || 0) + Math.floor((cls.growth.def || 0) * lv);
        b.res = (b.res || 0) + Math.floor((cls.growth.res || 0) * lv);
        b.dmg = (b.dmg || 0) + Math.round((cls.growth.dmg || 0) * lv);
      }
      b.hp = (b.hp || 0) + C.HERO_HP * lv;
      for (const sid of hero.skills || []) {
        const sk = get('heroSkills', sid); if (!sk) continue;
        for (const k of Object.keys(sk.effects || {})) if (isUnitKey(k)) b[k] = (b[k] || 0) + sk.effects[k];
        if (sk.ability) grantAbilities.push(sk.ability);
      }
      for (const slot of HERO_ITEM_SLOTS) {
        const it = get('items', (hero.items || {})[slot]); if (!it) continue;
        for (const k of Object.keys(it.effects || {})) if (isUnitKey(k)) b[k] = (b[k] || 0) + it.effects[k];
        if (it.ability) grantAbilities.push(it.ability);
        if (it.attack) attackOverride = it.attack;
        else if (it.attackBonus) attackBonus = it.attackBonus;
      }
    }
    // statuses
    const statusFlags = {};
    for (const s of unit.statuses || []) {
      const def = get('statuses', s.id); if (!def) continue;
      const stacks = Math.max(1, s.stacks || 1);
      for (const k of Object.keys(def.effects || {})) {
        const v = def.effects[k];
        if (typeof v === 'number') { if (isUnitKey(k)) b[k] = (b[k] || 0) + v * stacks; }
        else if (v === true) statusFlags[k] = true;
      }
    }
    // ---- resolve
    const baseHp = type.hp || 50;
    const maxHp = Math.max(1, Math.round((baseHp + (b.hp || 0)) * (1 + (b.hpPct || 0) / 100)));
    const statusRes = {};
    for (const ch of ['physical', 'fire', 'frost', 'lightning', 'blight', 'spirit']) {
      statusRes[ch] = ((type.statusRes || {})[ch] || 0) + (b.statusRes || 0) + (b['statusRes_' + ch] || 0);
    }
    const prot = {};
    for (const ch of ['physical', 'fire', 'frost', 'lightning', 'blight', 'spirit']) if (b['prot_' + ch]) prot[ch] = b['prot_' + ch];
    const dmgPct = 1 + (b.dmgPct || 0) / 100;
    const attacks = [];
    const src = attackOverride ? [attackOverride] : (type.attacks || []);
    for (let i = 0; i < src.length; i++) {
      const a = src[i];
      const ch = a.channel || 'physical';
      const extra = b['channelDmg_' + ch] || 0;
      const atk = Object.assign({}, a);
      atk.damage = Math.max(1, Math.round(((a.damage || 10) + (b.dmg || 0) + extra) * dmgPct));
      atk.accuracy = clamp((a.accuracy === undefined ? 85 : a.accuracy) + (b.accuracy || 0), 5, 100);
      atk.effects = (a.effects || []).slice();
      atk.props = (a.props || []).slice();
      if (i === 0 && attackBonus) {
        atk.damage += attackBonus.dmg || 0;
        if (attackBonus.channel && attackBonus.channel !== ch) atk.bonusChannel = { channel: attackBonus.channel, damage: attackBonus.dmg || 0 };
        if (attackBonus.status) atk.effects.push({ status: attackBonus.status.id, chance: attackBonus.status.chance || 25 });
      }
      if (attackChannel && attackChannel !== ch) atk.bonusChannel = { channel: attackChannel, damage: b['channelDmg_' + attackChannel] || 2 };
      if (attackStatus) atk.effects.push({ status: attackStatus.id, chance: attackStatus.chance || 25 });
      attacks.push(atk);
    }
    const passives = (type.passives || []).slice();
    const abilities = (type.abilities || []).slice();
    for (const id of grantAbilities) {
      const ab = get('abilities', id);
      if (ab && ab.kind === 'passive') { if (!passives.includes(id)) passives.push(id); }
      else if (!abilities.includes(id)) abilities.push(id);
    }
    const immunities = [];
    for (const id of passives) if (id.indexOf('immune_') === 0) immunities.push(id.slice(7));
    let moveClass = type.move || 'walk';
    if (passives.includes('flying')) moveClass = 'fly';
    else if (passives.includes('floating') && moveClass === 'walk') moveClass = 'float';
    else if (passives.includes('swimming') && moveClass === 'walk') moveClass = 'swim';
    const out = {
      typeId: type.id, name: unit.name || AOW.L(type.name), tier: type.tier || 1, role: type.role, rank,
      hp: unit.hp, maxHp,
      def: (type.def || 0) + (b.def || 0), res: (type.res || 0) + (b.res || 0),
      dmgPct: b.dmgPct || 0, accuracy: b.accuracy || 0, critChance: b.critChance || 0, evasion: b.evasion || 0,
      mp: Math.max(4, (type.mp || 32) + (b.mp || 0)),
      morale: (type.morale || 0) + (b.morale || 0),
      vision: C.VISION.ARMY + (b.vision || 0) + (passives.includes('farsight') ? C.VISION.FARSIGHT : 0) + (moveClass === 'fly' ? C.VISION.FLYING : 0),
      healPerTurn: b.healPerTurn || 0, xpPct: b.xpPct || 0, armyMove: b.armyMove || 0,
      attacks, abilities, passives, immunities, statusRes, prot,
      statuses: (unit.statuses || []).slice(), enchantments: enchants, flags: statusFlags,
      tags: (type.tags || []).slice(), moveClass, isHero: !!hero, heroId: hero ? hero.id : null,
      upkeep: Rules.unitUpkeep(game, unit), effects: b,
    };
    return out;
  };

  /** Recompute unit.maxHp from unitStats, keeping the HP ratio (or healing fully). */
  Rules.syncUnit = function (game, unit, healFull) {
    const st = Rules.unitStats(game, unit);
    const old = unit.maxHp || st.maxHp;
    const ratio = old > 0 ? clamp(unit.hp / old, 0, 1) : 1;
    unit.maxHp = st.maxHp;
    unit.hp = healFull ? st.maxHp : Math.max(1, Math.round(st.maxHp * ratio));
    return st;
  };

  /** Create a unit of `typeId` for player `pid` (applies starting rank from effects, full HP). */
  Rules.createUnitFor = function (game, pid, typeId, armyId) {
    const player = S().player(game, pid);
    const unit = S().createUnit(game, typeId, pid, armyId === undefined ? null : armyId);
    if (player) {
      unit.formId = player.formId;
      const eff = Rules.playerEffects(game, player);
      if (eff.rankUp) unit.rank = clamp(Math.round(eff.rankUp), 0, C.RANK_MAX);
    }
    Rules.syncUnit(game, unit, true);
    if (player) player.stats.units = S().allUnitsOfPlayer(game, pid).length;
    return unit;
  };

  /** Award experience; promotes ranks and feeds the hero's own level track. */
  Rules.grantXp = function (game, unit, amount, reason) {
    if (!unit || amount <= 0) return null;
    const st = Rules.unitStats(game, unit);
    const gain = Math.max(0, amount * (1 + (st.xpPct || 0) / 100));
    unit.xp = (unit.xp || 0) + gain;
    let promoted = 0;
    while (unit.rank < C.RANK_MAX && unit.xp >= C.RANK_XP[unit.rank + 1]) { unit.rank++; promoted++; }
    if (promoted) {
      Rules.syncUnit(game, unit);
      const type = S().unitType(unit);
      const rk = 'rules.rank.' + clamp(unit.rank | 0, 0, C.RANK_MAX);
      Rules.notify(game, unit.owner, 'good', L(`${J(unit.name || KO(type.name), '이/가')} ${J(tIn('ko', rk), '으로/로')} 승급했습니다.`,
        `${unit.name || EN(type.name)} promoted to ${tIn('en', rk)}.`), 'star', { unitId: unit.id }, LOW);
    }
    if (unit.heroId !== null && unit.heroId >= 0) {
      const hero = S().hero(game, unit.heroId);
      if (hero) Rules.grantHeroXp(game, hero, amount, reason);
    }
    return { xp: unit.xp, rank: unit.rank, promoted };
  };

  // ==================================================================== HEROES
  Rules.heroXpForLevel = level => Math.round(C.HERO_XP_PER_LEVEL * Math.max(1, level));
  Rules.heroXpToNext = function (game, hero) { return Math.max(0, Rules.heroXpForLevel(hero.level) - (hero.xp || 0)); };
  /** Hero experience → levels (1 skill point each, a signature pick every C.HERO_SIGNATURE_EVERY levels). */
  Rules.grantHeroXp = function (game, hero, amount, reason) {
    if (!hero || hero.dead || amount <= 0) return null;
    hero.xp = (hero.xp || 0) + amount;
    let levels = 0;
    while (hero.level < C.HERO_MAX_LEVEL && hero.xp >= Rules.heroXpForLevel(hero.level)) {
      hero.xp -= Rules.heroXpForLevel(hero.level);
      hero.level++; hero.skillPoints++; levels++;
      if (hero.level % C.HERO_SIGNATURE_EVERY === 0) hero.skillPoints++;
    }
    if (levels) {
      const unit = S().unit(game, hero.unitId);
      if (unit) Rules.syncUnit(game, unit);
      Rules.invalidate(hero.owner);
      if (Events()) Events().emit('hero:levelup', { heroId: hero.id, level: hero.level });
      Rules.notify(game, hero.owner, 'good', L(`${hero.name} 레벨 ${hero.level} 달성 (기술 점수 ${hero.skillPoints})`,
        `${hero.name} reached level ${hero.level} (${hero.skillPoints} skill points)`), 'star', { heroId: hero.id });
    }
    return { level: hero.level, xp: hero.xp, levels };
  };
  /** Hero skills the hero may learn right now (class/level/prereq/tome gated). */
  Rules.heroAvailableSkills = function (game, hero) {
    const player = S().player(game, hero.owner);
    if (player) Rules.ensurePlayer(game, player);
    const known = new Set(hero.skills || []);
    const out = [];
    for (const sk of Data().list('heroSkills')) {
      if (known.has(sk.id)) continue;
      if (sk.class && sk.class !== hero.classId) continue;
      if (sk.rulerType && sk.rulerType !== hero.rulerType) continue;
      if ((sk.minLevel || 1) > hero.level) continue;
      if (sk.tome && player && !(player.tomes || []).includes(sk.tome) && !player.unlocked.skills.includes(sk.id)) continue;
      let ok = true;
      for (const p of sk.prereq || []) if (!known.has(p)) { ok = false; break; }
      if (!ok) continue;
      out.push(sk.id);
    }
    return out;
  };
  /** Spend a skill point on `skillId`. */
  Rules.heroLevelUp = function (game, hero, skillId) {
    if (!hero) return fail('heroDead');
    if (hero.dead) return fail('heroDead');
    if ((hero.skillPoints || 0) <= 0) return fail('noSkillPoints');
    const sk = get('heroSkills', skillId); if (!sk) return fail('skillLocked');
    if (!Rules.heroAvailableSkills(game, hero).includes(skillId)) return fail('skillLocked');
    hero.skills.push(skillId);
    hero.skillPoints -= (sk.cost || 1);
    if (hero.skillPoints < 0) hero.skillPoints = 0;
    const unit = S().unit(game, hero.unitId);
    if (unit) Rules.syncUnit(game, unit);
    Rules.invalidate(hero.owner);
    if (Events()) Events().emit('hero:levelup', { heroId: hero.id, level: hero.level, skillId });
    return { ok: true, skillId };
  };
  /** Resolved stats of the hero's unit plus hero-specific info. */
  Rules.heroStats = function (game, hero) {
    const unit = S().unit(game, hero.unitId);
    const base = unit ? Rules.unitStats(game, unit) : { maxHp: 0, def: 0, res: 0, attacks: [], abilities: [], passives: [] };
    return Object.assign({}, base, {
      heroId: hero.id, level: hero.level, xp: hero.xp, xpToNext: Rules.heroXpToNext(game, hero),
      skillPoints: hero.skillPoints, skills: (hero.skills || []).slice(), items: Object.assign({}, hero.items),
      classId: hero.classId, isRuler: !!hero.isRuler, dead: !!hero.dead,
    });
  };
  const itemSlotOf = it => it.slot || 'trinket';
  /** Equip an item from the player's inventory onto a hero (class weapon rules apply). */
  Rules.equipItem = function (game, hero, itemId, slot) {
    if (!hero) return fail('heroDead');
    const player = S().player(game, hero.owner); Rules.ensurePlayer(game, player);
    const it = get('items', itemId); if (!it) return fail('unknownItem');
    if (!player.items.includes(itemId)) return fail('notInInventory');
    const s = slot || itemSlotOf(it);
    if (!HERO_ITEM_SLOTS.includes(s) || itemSlotOf(it) !== s) return fail('wrongSlot');
    if (it.weaponType) {
      const cls = get('heroClasses', hero.classId);
      if (cls && cls.allowedWeapons && cls.allowedWeapons.length && !cls.allowedWeapons.includes(it.weaponType)) return fail('weaponNotAllowed');
    }
    hero.items = hero.items || {};
    const prev = hero.items[s];
    if (prev) player.items.push(prev);
    hero.items[s] = itemId;
    const i = player.items.indexOf(itemId);
    if (i >= 0) player.items.splice(i, 1);
    const unit = S().unit(game, hero.unitId);
    if (unit) Rules.syncUnit(game, unit);
    Rules.invalidate(hero.owner);
    return { ok: true, slot: s, replaced: prev || null };
  };
  Rules.unequipItem = function (game, hero, slot) {
    if (!hero) return fail('heroDead');
    const player = S().player(game, hero.owner); Rules.ensurePlayer(game, player);
    const id = (hero.items || {})[slot];
    if (!id) return fail('wrongSlot');
    hero.items[slot] = null;
    player.items.push(id);
    const unit = S().unit(game, hero.unitId);
    if (unit) Rules.syncUnit(game, unit);
    Rules.invalidate(hero.owner);
    return { ok: true, itemId: id };
  };
  /** Roll `count` loot items of a tier from Data.names.loot_tables. */
  Rules.rollLoot = function (game, tier, count) {
    const out = [];
    const table = Data().has('names', 'loot_tables') ? Data().get('names', 'loot_tables') : null;
    const tiers = table && table.tiers ? table.tiers : null;
    const r = rng(game);
    for (let i = 0; i < (count || 1); i++) {
      let list = tiers ? (tiers[clamp(tier || 1, 1, 4)] || tiers[1]) : null;
      if (!list || !list.length) { const all = Data().list('items'); if (!all.length) break; out.push(r.pick(all).id); continue; }
      out.push(r.pick(list));
    }
    return out;
  };

  // ==================================================================== MOVEMENT
  const Dip = () => AOW.Diplomacy;
  /** Are two owners hostile? Neutral (-1) guards are hostile to everyone; free cities need a declared war. */
  Rules.isHostile = function (game, a, b) {
    if (a === b) return false;
    if (a < 0 && b < 0) return false;
    if (a < 0 || b < 0) return true;               // neutral guards / marauders
    const D = Dip();
    if (D && typeof D.atWar === 'function') return D.atWar(game, a, b);
    const p = S().player(game, a);
    return !!(p && p.diplomacy && p.diplomacy[b] && p.diplomacy[b].state === 'war');
  };
  Rules.freeCityAtWar = function (game, city, pid) {
    return !!(city && city.freeCity && (city.freeCity.warWith || []).includes(pid));
  };
  /** Empire skills / effects that let land units cross water. */
  Rules.canEmbark = function (game, player) {
    player = playerOf(game, player);
    if (!player) return false;
    for (const id of player.empireSkills || []) if (id.indexOf('seafaring') >= 0) return true;
    return false;
  };
  /** Movement profile of an army: the most restrictive class of its units and its MP pool. */
  Rules.moveProfile = function (game, army) {
    const units = S().unitsOf(game, army);
    let cls = 'fly', mp = Infinity, bonus = 0;
    const RANK = { walk: 0, mounted: 1, swim: 2, float: 3, fly: 4 };
    for (const u of units) {
      const st = Rules.unitStats(game, u);
      if (RANK[st.moveClass] < RANK[cls]) cls = st.moveClass;
      if (st.mp < mp) mp = st.mp;
      if (st.armyMove > bonus) bonus = st.armyMove;
    }
    if (!isFinite(mp)) mp = 32;
    if (!units.length) cls = 'walk';
    const eff = army.owner >= 0 ? Rules.playerEffects(game, army.owner) : {};
    bonus += eff.armyMove || 0;
    return { moveClass: cls, maxMp: Math.max(8, Math.round(mp + bonus * 2)), units: units.length };
  };
  Rules.armyMaxMp = function (game, army) { return Rules.moveProfile(game, army).maxMp; };

  /**
   * Move cost from an adjacent hex to another for a movement class: terrain + feature, roads (flat 3),
   * river crossings (+2 for land classes), −1 inside your own domain, never below C.MOVE.MIN.
   */
  Rules.moveCost = function (game, player, fromIdx, toIdx, moveClass) {
    if (toIdx === undefined || toIdx < 0 || toIdx >= game.W * game.H) return Infinity;
    const pid = pidOf(player);
    const mc = moveClass || 'walk';
    const land = mc === 'walk' || mc === 'mounted';
    let base;
    if (S().isWater(game, toIdx) && land) {
      if (!Rules.canEmbark(game, player)) return Infinity;
      base = C.MOVE.WATER;
    } else {
      base = S().hexMoveCost(game, toIdx, mc);
    }
    if (!isFinite(base)) return Infinity;
    if (S().edgeHasRoad(game, fromIdx, toIdx) && S().edgeHasRoad(game, toIdx, fromIdx)) base = Math.min(base, C.MOVE.ROAD);
    else if (land && S().edgeHasRiver(game, fromIdx, toIdx)) base += C.MOVE.RIVER;
    if (pid >= 0 && game.owner[toIdx] === pid) base -= C.MOVE.DOMAIN_DISCOUNT;
    return Math.max(C.MOVE.MIN, base);
  };

  /** hex → armies map, built once per pathfinding call (armiesAt is O(armies)). */
  Rules.occupancy = function (game) {
    const m = new Map();
    for (const a of game.armies) { if (!a.units.length) continue; const l = m.get(a.hex); if (l) l.push(a); else m.set(a.hex, [a]); }
    return m;
  };
  /** What stops an army from entering `idx` (null when it may simply walk in). `occ` is an optional occupancy map. */
  Rules.encounterAt = function (game, army, idx, occ) {
    const pid = army.owner;
    const armies = occ ? (occ.get(idx) || []) : S().armiesAt(game, idx).filter(a => a.units.length);
    const hostile = armies.filter(a => Rules.isHostile(game, pid, a.owner));
    const city = S().cityAt(game, idx);
    const st = S().structureAt(game, idx);
    // a foreign city first (its garrison makes it a siege), then an uncleared site, then loose stacks
    if (city && city.owner !== pid) {
      const ids = hostile.map(a => a.id);
      if (city.freeCity) {
        if (Rules.freeCityAtWar(game, city, pid)) return { kind: 'free_city', idx, armyIds: ids, cityId: city.id, siege: (city.walls || 0) > 0, empty: !ids.length };
        return { kind: 'blocked', idx, cityId: city.id, armyIds: ids };
      }
      if (city.owner >= 0 && Rules.isHostile(game, pid, city.owner)) return { kind: 'city', idx, armyIds: ids, cityId: city.id, siege: (city.walls || 0) > 0, empty: !ids.length };
      if (ids.length) return { kind: 'enemy', idx, armyIds: ids };
      return { kind: 'blocked', idx, cityId: city.id };
    }
    if (st && !st.cleared && (st.kind === 'wonder' || st.kind === 'infestation')) {
      const guard = S().army(game, st.guardArmyId);
      const ids = hostile.map(a => a.id);
      if (guard && guard.units.length && !ids.includes(guard.id)) ids.push(guard.id);
      return { kind: st.kind, idx, structureId: st.id, armyIds: ids, empty: !ids.length };
    }
    if (hostile.length) return { kind: 'enemy', idx, armyIds: hostile.map(a => a.id) };
    const foreign = armies.filter(a => a.owner !== pid);
    if (foreign.length) return { kind: 'blocked', idx, armyIds: foreign.map(a => a.id) };
    return null;
  };
  /** Is the army currently inside an enemy zone of control? */
  Rules.inEnemyZoc = function (game, army, hexIdx) {
    const idx = hexIdx === undefined ? army.hex : hexIdx;
    for (const n of S().neighbors(game, idx)) {
      for (const a of S().armiesAt(game, n)) if (a.units.length && Rules.isHostile(game, army.owner, a.owner)) return true;
    }
    return false;
  };
  /** Can this army enter `idx` freely (used by the pathfinder)? */
  Rules.blocksMovement = function (game, army, idx, occ) {
    return !!Rules.encounterAt(game, army, idx, occ);
  };

  /**
   * A* path from the army to `targetIdx`.
   * → {path:[idx…] (excluding start), cost, turns, turnBreaks:[index in path where a new turn begins]} | null
   */
  Rules.pathfind = function (game, army, targetIdx, opts) {
    opts = opts || {};
    if (!army || targetIdx === undefined || targetIdx < 0) return null;
    if (army.hex === targetIdx) return { path: [], cost: 0, turns: 0, turnBreaks: [] };
    const prof = Rules.moveProfile(game, army);
    const occ = Rules.occupancy(game);
    const costFn = (a, b) => {
      if (b !== targetIdx && Rules.blocksMovement(game, army, b, occ)) return Infinity;
      return Rules.moveCost(game, army.owner, a, b, prof.moveClass);
    };
    const r = Hex().astar(army.hex, targetIdx, game.W, game.H, costFn, { allowGoalBlocked: !!opts.allowGoalBlocked, maxCost: opts.maxCost || Infinity });
    if (!r) return null;
    let mp = opts.fresh ? prof.maxMp : Math.max(0, army.mp || 0);
    let turns = 1;
    const turnBreaks = [];
    let prev = army.hex;
    for (let i = 0; i < r.path.length; i++) {
      const c = Rules.moveCost(game, army.owner, prev, r.path[i], prof.moveClass);
      const cc = isFinite(c) ? c : prof.maxMp;
      if (cc > mp) { turns++; turnBreaks.push(i); mp = prof.maxMp; }
      mp = Math.max(0, mp - cc);
      prev = r.path[i];
    }
    return { path: r.path, cost: r.cost, turns, turnBreaks, moveClass: prof.moveClass };
  };
  /** Dijkstra flood of every hex the army can reach with its remaining MP → Map(idx → cost). */
  Rules.reachable = function (game, army, budget) {
    const prof = Rules.moveProfile(game, army);
    const b = budget === undefined ? Math.max(0, army.mp || 0) : budget;
    const occ = Rules.occupancy(game);
    const costFn = (a, x) => (Rules.blocksMovement(game, army, x, occ) ? Infinity : Rules.moveCost(game, army.owner, a, x, prof.moveClass));
    return Hex().reachable(army.hex, game.W, game.H, b, costFn);
  };

  function mergeInto(game, army) {
    // merge with a friendly stack on the same hex when the result still fits in one army
    for (const other of S().armiesAt(game, army.hex)) {
      if (other === army || other.owner !== army.owner) continue;
      if (other.units.length + army.units.length > C.UNITS_PER_ARMY) continue;
      for (const uid of army.units.slice()) S().addUnitToArmy(game, uid, other.id);
      other.mp = Math.min(other.mp, army.mp);
      S().removeArmy(game, army.id);
      return other;
    }
    return army;
  }
  /** Claim nodes / enter teleporters / capture undefended structures after an army lands on a hex. */
  Rules.onArmyArrive = function (game, army) {
    const st = S().structureAt(game, army.hex);
    if (!st) return null;
    if (st.kind === 'node' && st.owner !== army.owner) { st.owner = army.owner; return { claimed: st.id }; }
    if (st.kind === 'teleporter' && st.refId !== null && st.refId >= 0 && army.mp > 0) {
      const other = S().structure(game, st.refId);
      if (other && other.hex >= 0 && other.hex !== army.hex && !army._teleported) {
        army._teleported = true;
        army.hex = other.hex; army.mp = 0;
        S().reveal(game, army.owner, army.hex, Rules.visionRadius(game, army));
        return { teleportedTo: other.hex };
      }
    }
    return null;
  };

  /**
   * Walk the army along `path` one hex at a time, spending MP, stopping in front of enemies/structures.
   * → {moved:[idx…], stoppedBy:'enemy'|'structure'|'mp'|'zoc'|'blocked'|null, encounter}
   */
  Rules.moveArmy = function (game, army, path) {
    const out = { moved: [], stoppedBy: null, encounter: null };
    if (!army || !path || !path.length) { out.stoppedBy = 'mp'; return out; }
    const prof = Rules.moveProfile(game, army);
    delete army._teleported;
    let cur = army;
    for (const next of path) {
      if (Hex().distIdx(cur.hex, next, game.W) !== 1) { out.stoppedBy = out.stoppedBy || 'blocked'; break; }
      const enc = Rules.encounterAt(game, cur, next);
      if (enc) {
        out.encounter = enc;
        out.stoppedBy = enc.kind === 'enemy' ? 'enemy' : (enc.kind === 'blocked' ? 'blocked' : 'structure');
        if (Events()) Events().emit('army:encounter', { armyId: cur.id, targetIdx: next, kind: enc.kind, encounter: enc });
        break;
      }
      const cost = Rules.moveCost(game, cur.owner, cur.hex, next, prof.moveClass);
      if (!isFinite(cost)) { out.stoppedBy = 'blocked'; break; }
      if (cur.mp <= 0) { out.stoppedBy = 'mp'; break; }
      if (cost > cur.mp && cur.mp < prof.maxMp) { out.stoppedBy = 'mp'; break; }
      const zoc = Rules.inEnemyZoc(game, cur, cur.hex);
      cur.hex = next;
      cur.mp = Math.max(0, cur.mp - cost);
      out.moved.push(next);
      if (cur.owner >= 0) S().reveal(game, cur.owner, next, Rules.visionRadius(game, cur));
      const arrive = Rules.onArmyArrive(game, cur);
      if (arrive && arrive.teleportedTo !== undefined) { out.moved.push(cur.hex); out.stoppedBy = 'mp'; break; }
      if (zoc) { cur.mp = 0; out.stoppedBy = 'zoc'; break; }
      if (cur.mp <= 0) { out.stoppedBy = out.stoppedBy || 'mp'; break; }
    }
    if (out.moved.length) {
      cur = mergeInto(game, cur);
      out.armyId = cur.id;
      if (Events()) Events().emit('army:moved', { armyId: cur.id, path: out.moved.slice() });
    }
    delete cur._teleported;
    return out;
  };

  /**
   * Build the battle descriptor for attacking `targetIdx` with `army` (pulls in reinforcements within 3 hexes).
   * → {ok, attackerArmyIds, defenderArmyIds, siege, cityId, structureId, hexIdx}
   */
  Rules.attackTarget = function (game, army, targetIdx) {
    if (!army) return fail('noArmy');
    if (Hex().distIdx(army.hex, targetIdx, game.W) > 1) return fail('notAdjacent');
    const defenders = S().armiesAt(game, targetIdx).filter(a => a.units.length && a.owner !== army.owner);
    const city = S().cityAt(game, targetIdx);
    const st = S().structureAt(game, targetIdx);
    const struct = st && !st.cleared && (st.kind === 'wonder' || st.kind === 'infestation') ? st : null;
    if (!defenders.length && !city && !struct) return fail('nothingToAttack');
    if (city && city.owner === army.owner) return fail('sameOwner');
    if (city && city.freeCity && !Rules.freeCityAtWar(game, city, army.owner)) return fail('freeCityPeace');
    if (city && !city.freeCity && city.owner >= 0 && !Rules.isHostile(game, army.owner, city.owner)) return fail('notAtWar');
    if (!city && !struct && defenders.length && !defenders.some(a => Rules.isHostile(game, army.owner, a.owner))) return fail('notAtWar');
    // reinforcements: up to 3 armies per side within 3 hexes
    const attackerArmyIds = [army.id];
    for (const a of game.armies) {
      if (attackerArmyIds.length >= 3) break;
      if (a.id === army.id || a.owner !== army.owner || !a.units.length) continue;
      if (Hex().distIdx(a.hex, targetIdx, game.W) <= 3 && a.mp > 0) attackerArmyIds.push(a.id);
    }
    const defOwner = defenders.length ? defenders[0].owner : (city ? city.owner : -1);
    const defenderArmyIds = defenders.map(a => a.id);
    if (!struct) {
      for (const a of game.armies) {
        if (defenderArmyIds.length >= 3) break;
        if (a.owner !== defOwner || !a.units.length || defenderArmyIds.includes(a.id)) continue;
        if (Hex().distIdx(a.hex, targetIdx, game.W) <= 3) defenderArmyIds.push(a.id);
      }
    }
    return {
      ok: true, attackerArmyIds, defenderArmyIds, hexIdx: targetIdx,
      siege: !!(city && (city.walls || 0) > 0), cityId: city ? city.id : null, structureId: struct ? struct.id : null,
      defenderOwner: defOwner,
    };
  };

  /** Merge army `b` into army `a` (same owner + hex, ≤ 6 units). */
  Rules.mergeArmies = function (game, a, b) {
    if (!a || !b || a.id === b.id) return fail('badIndex');
    if (a.owner !== b.owner) return fail('sameOwner');
    if (a.hex !== b.hex) return fail('differentHex');
    if (a.units.length + b.units.length > C.UNITS_PER_ARMY) return fail('tooMany');
    const mp = Math.min(a.mp, b.mp);
    for (const uid of b.units.slice()) S().addUnitToArmy(game, uid, a.id);
    S().removeArmy(game, b.id);
    a.mp = mp;
    return { ok: true, armyId: a.id };
  };
  /** Split `unitIds` off into a new army on the same hex. */
  Rules.splitArmy = function (game, army, unitIds) {
    if (!army) return fail('noArmy');
    const ids = (unitIds || []).filter(id => army.units.includes(id));
    if (!ids.length || ids.length >= army.units.length) return fail('badIndex');
    const next = S().createArmy(game, army.owner, army.hex, []);
    for (const id of ids) S().addUnitToArmy(game, id, next.id);
    next.mp = Math.min(army.mp, Rules.armyMaxMp(game, next));
    return { ok: true, armyId: next.id, army: next };
  };
  /**
   * Hold position: the stack spends the rest of its movement and braces. Every unit in it gains `fortified`
   * until the owner's next turn, which the tactical layer reads as defense mode when a battle starts here.
   */
  Rules.defendArmy = function (game, army) {
    army = army && typeof army === 'object' ? army : S().army(game, army);
    if (!army) return fail('noArmy');
    army.mp = 0; army.defending = true; army.sleeping = false;
    for (const uid of army.units) { const u = S().unit(game, uid); if (u) Rules.applyStatus(game, u, 'fortified', 1); }
    return { ok: true, armyId: army.id };
  };
  /** Skip this stack for the rest of the turn (no next-unit stop, no end-turn warning). */
  Rules.sleepArmy = function (game, army) {
    army = army && typeof army === 'object' ? army : S().army(game, army);
    if (!army) return fail('noArmy');
    army.mp = 0; army.sleeping = true; army.defending = false;
    return { ok: true, armyId: army.id };
  };
  /** Disband a single unit (a hero's unit kills the hero unless it is a ruler, which respawns). */
  Rules.disband = function (game, unitId) {
    const unit = S().unit(game, unitId);
    if (!unit) return fail('badIndex');
    const owner = unit.owner;
    Rules.killUnit(game, unit);
    if (owner >= 0) { const p = S().player(game, owner); if (p) p.stats.units = S().allUnitsOfPlayer(game, owner).length; }
    return { ok: true };
  };
  /** Remove a unit from the world, handling hero death / ruler respawn. */
  Rules.killUnit = function (game, unit) {
    if (!unit) return false;
    const hero = unit.heroId !== null && unit.heroId >= 0 ? S().hero(game, unit.heroId) : null;
    if (hero) {
      hero.dead = true; hero.unitId = -1;
      hero.respawnTurns = C.HERO_RESPAWN_TURNS;
      hero.respawnAt = game.turn + C.HERO_RESPAWN_TURNS;
      Rules.notify(game, hero.owner, 'bad', L(`${J(hero.name, '이/가')} 쓰러졌습니다.`, `${hero.name} has fallen.`), 'skull', { heroId: hero.id });
    }
    S().removeUnit(game, unit.id);
    return true;
  };

  // ==================================================================== VISIBILITY
  Rules.visionRadius = function (game, army) {
    let r = C.VISION.ARMY;
    for (const u of S().unitsOf(game, army)) { const st = Rules.unitStats(game, u); if (st.vision > r) r = st.vision; }
    const f = game.feature[army.hex];
    if (f === S().F.hills || f === S().F.mountain) r += C.VISION.HIGH_GROUND;
    return r;
  };
  /** Recompute `game.visible[pid]` from cities, armies and the domain; also grows `explored`. */
  Rules.recomputeVisibility = function (game, pid) {
    const vis = game.visible[pid], ex = game.explored[pid];
    if (!vis || !ex) return;
    vis.fill(0);
    const player = S().player(game, pid);
    const eff = player ? Rules.playerEffects(game, player) : {};
    const bonus = eff.vision || 0;
    const mark = (idx, radius) => { for (const h of Hex().spiralIdx(idx, radius, game.W, game.H)) { vis[h] = 1; ex[h] = 1; } };
    for (const c of game.cities) if (c.owner === pid) mark(c.hex, C.VISION.CITY + bonus + (c.tier >= 3 ? 1 : 0));
    for (const a of game.armies) if (a.owner === pid && a.units.length) mark(a.hex, Rules.visionRadius(game, a) + bonus);
    const N = game.W * game.H;
    for (let i = 0; i < N; i++) if (game.owner[i] === pid) { vis[i] = 1; ex[i] = 1; }
    if (C.VISION.DOMAIN > 0) {
      for (const c of game.cities) if (c.owner === pid) for (const pidx of c.provinces) {
        const prov = game.provinces[pidx]; if (!prov) continue;
        for (const h of prov.hexes) for (const n of S().neighbors(game, h)) { vis[n] = 1; ex[n] = 1; }
      }
    }
    return vis;
  };
  Rules.canSee = function (game, pid, idx) {
    const vis = game.visible[pid];
    return !!(vis && vis[idx]);
  };
  Rules.hasExplored = function (game, pid, idx) {
    const ex = game.explored[pid];
    return !!(ex && ex[idx]);
  };

  // ==================================================================== RESEARCH (TOMES)
  /** Tomes owned / affinity needed to unlock each tome tier. */
  const TOME_TIER_TOMES = { 1: 0, 2: 2, 3: 4, 4: 6, 5: 8 };
  const TOME_TIER_AFFINITY = { 1: 0, 2: 0, 3: 0, 4: 6, 5: 8 };
  C.TOME_TIER_TOMES = TOME_TIER_TOMES; C.TOME_TIER_AFFINITY = TOME_TIER_AFFINITY;

  /** Highest affinity the player has among a tome's affinities. */
  Rules.tomeAffinity = function (player, tome) {
    let best = 0;
    for (const k of Object.keys(tome.affinity || {})) best = Math.max(best, (player.affinity && player.affinity[k]) || 0);
    return best;
  };
  /** Why a tome cannot be picked, or null when it can. */
  Rules.tomeLockReason = function (game, player, tomeId) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const tome = tomeOf(tomeId);
    if (!tome) return Rules.reasonText('unknownTome');
    if ((player.tomes || []).includes(tomeId)) return Rules.reasonText('tomeOwned');
    const tier = tome.tier || 1;
    if ((player.tomes || []).length < (TOME_TIER_TOMES[tier] || 0)) return Rules.reasonText('tierLocked');
    if (Rules.tomeAffinity(player, tome) < (TOME_TIER_AFFINITY[tier] || 0)) return Rules.reasonText('affinityLow');
    if (tier === 5) { for (const id of player.tomes || []) { const t = tomeOf(id); if (t && t.tier === 5) return Rules.reasonText('oneTierFive'); } }
    return null;
  };
  /** Tome ids the player may add to their book right now. */
  Rules.availableTomes = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const out = [];
    for (const t of Data().list('tomes')) if (!Rules.tomeLockReason(game, player, t.id)) out.push(t.id);
    return out;
  };
  /** Add a tome to the player's book (free — tomes are chosen, their contents are researched). */
  Rules.selectTome = function (game, player, tomeId) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const reason = Rules.tomeLockReason(game, player, tomeId);
    if (reason) return { ok: false, reason: 'tierLocked', text: reason };
    const tome = tomeOf(tomeId);
    player.tomes.push(tomeId);
    for (const k of Object.keys(tome.affinity || {})) player.affinity[k] = (player.affinity[k] || 0) + tome.affinity[k];
    Rules.invalidate(player.id);
    Rules.notify(game, player.id, 'good', L(`${J(KO(tome.name), '을/를')} 서고에 추가했습니다.`, `${EN(tome.name)} added to your book.`), 'knowledge', { tomeId });
    if (!player.research.current) {
      const opts = Rules.researchOptions(game, player).filter(o => o.tomeId === tomeId);
      if (opts.length) Rules.startResearch(game, player, tomeId, opts[0].contentId);
    }
    return { ok: true, tomeId };
  };
  Rules.isResearched = function (game, player, contentId) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    return player.research.done.includes(contentId);
  };
  const CONTENT_KIND = { spell: 'spells', unit: 'units', improvement: 'improvements', skill: 'heroSkills', transformation: 'transformations', empire: 'empireSkills', building: 'buildings' };
  /** Knowledge cost of one tome content for this player (research speed + progressive scaling). */
  Rules.researchCost = function (game, player, content) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const eff = Rules.playerEffects(game, player);
    const base = (content && content.cost) || 120;
    const scale = 1 + C.RESEARCH_SCALE * player.research.done.length;
    return Math.max(1, Math.round(base * scale / (1 + clamp(eff.researchPct || 0, -75, 200) / 100)));
  };
  /** Everything the player could research next → [{tomeId, contentId, type, id, cost, name, registry}]. */
  Rules.researchOptions = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const out = [];
    for (const tomeId of player.tomes || []) {
      const tome = tomeOf(tomeId); if (!tome) continue;
      for (const c of tome.contents || []) {
        if (player.research.done.includes(c.id)) continue;
        const registry = CONTENT_KIND[c.type];
        const def = registry && Data().has(registry, c.id) ? Data().get(registry, c.id) : null;
        out.push({ tomeId, contentId: c.id, type: c.type, id: c.id, registry, cost: Rules.researchCost(game, player, c), name: def ? def.name : { ko: c.id, en: c.id }, def });
      }
    }
    return out;
  };
  /** Begin researching one tome content. */
  Rules.startResearch = function (game, player, tomeId, contentId) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const tome = tomeOf(tomeId); if (!tome) return fail('unknownTome');
    if (!(player.tomes || []).includes(tomeId)) return fail('notInTome');
    const content = (tome.contents || []).find(c => c.id === contentId);
    if (!content) return fail('notInTome');
    if (player.research.done.includes(contentId)) return fail('alreadyResearched');
    const cost = Rules.researchCost(game, player, content);
    const keep = player.research.current && player.research.current.contentId === contentId ? player.research.progress : 0;
    player.research.current = { tomeId, contentId, type: content.type, cost };
    player.research.progress = keep;
    return { ok: true, cost };
  };
  /** Grant the researched content and clear the current research slot. */
  Rules.completeResearch = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const cur = player.research.current;
    if (!cur) return fail('badIndex');
    const { tomeId, contentId, type } = cur;
    const registry = CONTENT_KIND[type];
    const def = registry && Data().has(registry, contentId) ? Data().get(registry, contentId) : null;
    if (type === 'spell') {
      if (!player.spells.known.includes(contentId)) player.spells.known.push(contentId);
      const sp = def;
      if (sp && sp.kind === 'empire' && !player.spells.active.some(a => a.spellId === contentId)) player.spells.active.push({ spellId: contentId, target: null });
    } else if (type === 'unit') {
      if (!player.unlocked.units.includes(contentId)) player.unlocked.units.push(contentId);
    } else if (type === 'improvement') {
      if (!player.unlocked.improvements.includes(contentId)) player.unlocked.improvements.push(contentId);
    } else if (type === 'skill') {
      if (!player.unlocked.skills.includes(contentId)) player.unlocked.skills.push(contentId);
    } else if (type === 'transformation') {
      if (!player.transformations.includes(contentId)) player.transformations.push(contentId);
      for (const u of S().allUnitsOfPlayer(game, player.id)) Rules.syncUnit(game, u);
    } else if (type === 'empire') {
      if (!player.empireSkills.includes(contentId)) player.empireSkills.push(contentId);
    } else if (type === 'building') {
      player.unlocked.buildings = player.unlocked.buildings || [];
      if (!player.unlocked.buildings.includes(contentId)) player.unlocked.buildings.push(contentId);
    }
    player.research.done.push(contentId);
    player.stats.researched = player.research.done.length;
    player.research.current = null;
    player.research.progress = 0;
    Rules.invalidate(player.id);
    if (Events()) Events().emit('research:complete', { pid: player.id, tomeId, contentId });
    Rules.notify(game, player.id, 'good', L(`연구 완료: ${def ? KO(def.name) : contentId}`, `Research complete: ${def ? EN(def.name) : contentId}`), 'knowledge', { tomeId, contentId });
    log(game, `[research] p${player.id} ${contentId}`);
    return { ok: true, contentId, type, def };
  };
  /** Spend accumulated knowledge on the current research (called once per turn by Turn). */
  Rules.advanceResearch = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    if (!player.research.current) { if (!player.isHuman) Rules.autoResearch(game, player); }
    const cur = player.research.current;
    if (!cur) return null;
    const need = cur.cost - player.research.progress;
    const take = Math.min(Math.max(0, player.resources.knowledge), Math.max(0, need));
    player.resources.knowledge -= take;
    player.research.progress += take;
    if (player.research.progress >= cur.cost) return Rules.completeResearch(game, player);
    return { ok: true, progress: player.research.progress, cost: cur.cost };
  };
  /** AI/auto: pick a new tome when nothing is left to research, then the cheapest useful content. */
  Rules.autoResearch = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    if (player.research.current) return null;
    let opts = Rules.researchOptions(game, player);
    if (!opts.length) {
      const tomes = Rules.availableTomes(game, player);
      if (!tomes.length) return null;
      const r = rng(game);
      // prefer a tome matching the player's strongest affinity
      let best = tomes[0], bestScore = -1;
      for (const id of tomes) {
        const t = tomeOf(id); if (!t) continue;
        let score = Rules.tomeAffinity(player, t) + (t.tier || 1) * 2 + r.next();
        if (score > bestScore) { bestScore = score; best = id; }
      }
      Rules.selectTome(game, player, best);
      opts = Rules.researchOptions(game, player);
    }
    if (!opts.length) return null;
    opts.sort((a, b) => a.cost - b.cost);
    return Rules.startResearch(game, player, opts[0].tomeId, opts[0].contentId);
  };

  // ==================================================================== SPELLS (world map)
  /** Normalize a spell target: number → {hexIdx}; passes objects through. */
  function normTarget(game, target) {
    if (target === null || target === undefined) return {};
    if (typeof target === 'number') return { hexIdx: target };
    const t = Object.assign({}, target);
    if (t.hex !== undefined && t.hexIdx === undefined) t.hexIdx = t.hex;
    if (t.cityId !== undefined && t.hexIdx === undefined) { const c = S().city(game, t.cityId); if (c) t.hexIdx = c.hex; }
    if (t.armyId !== undefined && t.hexIdx === undefined) { const a = S().army(game, t.armyId); if (a) t.hexIdx = a.hex; }
    if (t.unitId !== undefined && t.armyId === undefined) { const u = S().unit(game, t.unitId); if (u && u.armyId !== null) { t.armyId = u.armyId; const a = S().army(game, u.armyId); if (a && t.hexIdx === undefined) t.hexIdx = a.hex; } }
    if (t.provinceId !== undefined && t.hexIdx === undefined) { const p = game.provinces[t.provinceId]; if (p) t.hexIdx = p.center; }
    if (t.hexIdx !== undefined && t.provinceId === undefined) { const p = game.province[t.hexIdx]; if (p >= 0) t.provinceId = p; }
    return t;
  }
  /** Mana + casting-point cost of a spell after spellCostPct. */
  Rules.spellCost = function (game, player, spell) {
    player = playerOf(game, player);
    const eff = player ? Rules.playerEffects(game, player) : {};
    const m = 1 + clamp(eff.spellCostPct || 0, -75, 200) / 100;
    const c = spell.cost || {};
    return { mana: Math.max(0, Math.round((c.mana || 0) * m)), cp: Math.max(0, Math.round((c.cp || 0) * m)) };
  };
  Rules.castingMax = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const eff = Rules.playerEffects(game, player);
    const max = C.CP_BASE + (eff.casting || 0);
    player.casting.cpMax = max;
    return max;
  };
  /** Spell ids the player may cast on the world map. */
  Rules.knownSpells = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    return (player.spells.known || []).filter(id => { const s = get('spells', id); return s && s.kind !== 'combat'; });
  };
  Rules.activeSpells = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    return (player.spells.active || []).slice();
  };

  /** Is the hex a legal world-spell target location for this player (own domain, or near an own army/city)? */
  function inCastRange(game, player, hexIdx, range) {
    if (hexIdx === undefined || hexIdx < 0) return false;
    if (game.owner[hexIdx] === player.id) return true;
    const r = range || C.SUMMON_RANGE;
    for (const c of game.cities) if (c.owner === player.id && Hex().distIdx(c.hex, hexIdx, game.W) <= r) return true;
    for (const a of game.armies) if (a.owner === player.id && Hex().distIdx(a.hex, hexIdx, game.W) <= r) return true;
    return false;
  }
  /** Validate a world spell cast → {ok, cost} | {ok:false, reason}. */
  Rules.canCast = function (game, player, spellId, target) {
    player = playerOf(game, player); if (!player) return fail('notOwner');
    Rules.ensurePlayer(game, player);
    const sp = get('spells', spellId); if (!sp) return fail('unknownSpell');
    if (sp.kind === 'combat') return fail('combatOnly');
    if (!player.spells.known.includes(spellId) && sp.kind !== 'empire') return fail('notKnown');
    const cost = Rules.spellCost(game, player, sp);
    if (player.resources.mana < cost.mana) return fail('notEnoughMana');
    if (player.casting.current && player.casting.current.spellId !== spellId) return fail('casting');
    const t = normTarget(game, target);
    if (sp.kind === 'unit_enchant' || sp.kind === 'empire') {
      if (player.spells.active.some(a => a.spellId === spellId)) return fail('alreadyActive');
      return { ok: true, cost, target: t };
    }
    if (sp.kind === 'city_enchant') {
      const city = S().city(game, t.cityId);
      if (!city) return fail('badTarget');
      if (city.owner !== player.id && !(city.freeCity && city.freeCity.vassalOf === player.id)) return fail('notOwner');
      if ((city.enchantments || []).includes(spellId)) return fail('alreadyActive');
      return { ok: true, cost, target: t };
    }
    if (sp.kind === 'summon') {
      if (sp.target === 'city') { const city = S().city(game, t.cityId); if (!city || city.owner !== player.id) return fail('badTarget'); }
      else if (!inCastRange(game, player, t.hexIdx, sp.range || C.SUMMON_RANGE)) return fail('notInDomain');
      return { ok: true, cost, target: t };
    }
    if (sp.kind === 'transform') {
      if (t.provinceId === undefined || !game.provinces[t.provinceId]) return fail('badTarget');
      if (!inCastRange(game, player, t.hexIdx, sp.range || C.SUMMON_RANGE)) return fail('notInDomain');
      return { ok: true, cost, target: t };
    }
    // strategic
    if (sp.target === 'army') { const a = S().army(game, t.armyId); if (!a) return fail('badTarget'); }
    else if (sp.target === 'city') { const c = S().city(game, t.cityId); if (!c) return fail('badTarget'); }
    else if (sp.target === 'unit' || sp.target === 'ally_unit' || sp.target === 'enemy_unit') { if (!S().unit(game, t.unitId)) return fail('badTarget'); }
    else if (sp.target === 'province' || sp.target === 'hex') { if (!inCastRange(game, player, t.hexIdx, (sp.range || 0) + C.SUMMON_RANGE)) return fail('notInDomain'); }
    return { ok: true, cost, target: t };
  };

  /**
   * Cast a world spell. Mana is paid immediately; casting points may accumulate over several turns
   * (player.casting.current). Returns {ok, cast:true} when it resolved now, {ok, casting:true} otherwise.
   */
  Rules.castSpell = function (game, player, spellId, target) {
    player = playerOf(game, player);
    const check = Rules.canCast(game, player, spellId, target);
    if (!check.ok) return check;
    const sp = get('spells', spellId);
    const cost = check.cost;
    const t = check.target;
    const resuming = player.casting.current && player.casting.current.spellId === spellId;
    if (!resuming) {
      player.resources.mana -= cost.mana;
      player.casting.current = { spellId, target: t, progress: 0, need: cost.cp };
    }
    const cur = player.casting.current;
    const take = Math.min(player.casting.cp, Math.max(0, cur.need - cur.progress));
    player.casting.cp -= take;
    cur.progress += take;
    if (cur.progress >= cur.need) {
      player.casting.current = null;
      const r = Rules.applySpellEffect(game, player, sp, t);
      if (Events()) Events().emit('spell:cast', { pid: player.id, spellId, target: t });
      Rules.notify(game, player.id, 'good', L(`${KO(sp.name)} 시전`, `${EN(sp.name)} cast`), 'mana', { spellId, target: t }, LOW);
      return Object.assign({ ok: true, cast: true, cost }, r || {});
    }
    Rules.notify(game, player.id, 'info', L(`${KO(sp.name)} 시전 중… (${cur.progress}/${cur.need})`, `Casting ${EN(sp.name)}… (${cur.progress}/${cur.need})`), 'mana', { spellId }, LOW);
    return { ok: true, casting: true, progress: cur.progress, need: cur.need, cost };
  };
  /** Abort a multi-turn cast (mana is not refunded). */
  Rules.cancelCasting = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const cur = player.casting.current;
    player.casting.current = null;
    return { ok: true, cancelled: cur ? cur.spellId : null };
  };
  /** Add this turn's casting points to an in-progress spell (called by Turn). */
  Rules.advanceCasting = function (game, player) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const cur = player.casting.current;
    if (!cur) return null;
    const take = Math.min(player.casting.cp, Math.max(0, cur.need - cur.progress));
    player.casting.cp -= take;
    cur.progress += take;
    if (cur.progress < cur.need) return { casting: true, progress: cur.progress, need: cur.need };
    const sp = get('spells', cur.spellId);
    player.casting.current = null;
    if (!sp) return null;
    const r = Rules.applySpellEffect(game, player, sp, cur.target);
    if (Events()) Events().emit('spell:cast', { pid: player.id, spellId: sp.id, target: cur.target });
    Rules.notify(game, player.id, 'good', L(`${KO(sp.name)} 시전 완료`, `${EN(sp.name)} completed`), 'mana', { spellId: sp.id });
    return Object.assign({ cast: true }, r || {});
  };

  /** Summon `count` units of `unitId` for the player at/near `hexIdx`. */
  Rules.summonUnits = function (game, player, unitId, count, hexIdx) {
    player = playerOf(game, player);
    const ids = [];
    let hex = hexIdx;
    if (hex === undefined || hex < 0 || S().isWater(game, hex)) {
      const cap = S().capital(game, player.id);
      hex = cap ? cap.hex : (game.starts[player.id] !== undefined ? game.starts[player.id] : 0);
    }
    let army = S().armiesAt(game, hex).find(a => a.owner === player.id && a.units.length < C.UNITS_PER_ARMY);
    if (!army) {
      const blocked = S().armiesAt(game, hex).some(a => a.owner !== player.id);
      if (blocked) { for (const n of S().neighbors(game, hex)) if (!S().isWater(game, n) && !S().armiesAt(game, n).some(a => a.owner !== player.id)) { hex = n; break; } }
      army = S().armiesAt(game, hex).find(a => a.owner === player.id && a.units.length < C.UNITS_PER_ARMY) || S().createArmy(game, player.id, hex, []);
    }
    for (let i = 0; i < (count || 1); i++) {
      if (army.units.length >= C.UNITS_PER_ARMY) army = S().createArmy(game, player.id, hex, []);
      const u = Rules.createUnitFor(game, player.id, unitId, army.id);
      if (u) ids.push(u.id);
    }
    army.mp = Rules.armyMaxMp(game, army);
    return { unitIds: ids, armyId: army.id, hexIdx: hex };
  };

  function healUnits(game, units, amount) {
    let healed = 0;
    for (const u of units) { const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + amount); healed += u.hp - before; }
    return healed;
  }
  function targetUnits(game, player, sp, t) {
    if (t.unitId !== undefined) { const u = S().unit(game, t.unitId); return u ? [u] : []; }
    if (t.armyId !== undefined) return S().unitsOf(game, t.armyId);
    if (t.provinceId !== undefined) {
      const prov = game.provinces[t.provinceId];
      if (!prov) return [];
      const set = new Set(prov.hexes);
      const out = [];
      for (const a of game.armies) if (set.has(a.hex)) for (const u of S().unitsOf(game, a)) out.push(u);
      return out;
    }
    if (t.hexIdx !== undefined) { const out = []; for (const a of S().armiesAt(game, t.hexIdx)) for (const u of S().unitsOf(game, a)) out.push(u); return out; }
    return [];
  }

  /** Apply a resolved world spell. Unknown `special` ids are ignored gracefully. */
  Rules.applySpellEffect = function (game, player, sp, target) {
    player = playerOf(game, player);
    const t = normTarget(game, target || {});
    const e = sp.effect || {};
    const out = { kind: sp.kind };
    if (sp.kind === 'unit_enchant' || sp.kind === 'empire') {
      player.spells.active.push({ spellId: sp.id, target: null });
      Rules.invalidate(player.id);
      for (const u of S().allUnitsOfPlayer(game, player.id)) Rules.syncUnit(game, u);
      return out;
    }
    if (sp.kind === 'city_enchant') {
      const city = S().city(game, t.cityId);
      if (city) { Rules.ensureCity(game, city); if (!city.enchantments.includes(sp.id)) city.enchantments.push(sp.id); }
      player.spells.active.push({ spellId: sp.id, target: { cityId: t.cityId } });
      Rules.invalidate(player.id);
      if (city && Events()) Events().emit('city:changed', { cityId: city.id });
      return out;
    }
    if (sp.kind === 'summon' || e.type === 'summon') {
      let hex = t.hexIdx;
      if (sp.target === 'city') { const c = S().city(game, t.cityId); if (c) { hex = c.hex; for (const n of S().neighbors(game, c.hex)) if (!S().isWater(game, n) && !S().armiesAt(game, n).length) { hex = n; break; } } }
      const r = Rules.summonUnits(game, player, e.unit, e.count || 1, hex);
      return Object.assign(out, r);
    }
    if (sp.kind === 'transform' || e.type === 'terraform') {
      const prov = game.provinces[t.provinceId];
      if (!prov) return out;
      const radius = e.radius || 0;
      const provs = [prov];
      if (radius > 0) for (const np of provinceNeighbors(game, prov)) { const q = game.provinces[np]; if (q) provs.push(q); }
      const tIdx = e.terrain !== undefined && e.terrain !== null ? S().T[e.terrain] : undefined;
      const fIdx = e.feature !== undefined && e.feature !== null ? S().F[e.feature] : undefined;
      const changed = [];
      for (const p of provs) {
        for (const h of p.hexes) {
          if (S().isWater(game, h)) continue;
          if (tIdx !== undefined) game.terrain[h] = tIdx;
          if (fIdx !== undefined && game.feature[h] !== S().F.peak) game.feature[h] = fIdx;
          changed.push(h);
        }
        if (tIdx !== undefined) p.terrain = tIdx;
        if (fIdx !== undefined) p.feature = fIdx;
      }
      if (AOW.WorldRender && typeof AOW.WorldRender.invalidate === 'function') { try { AOW.WorldRender.invalidate(null); } catch (err) { /* ignore */ } }
      out.hexes = changed.length;
      return out;
    }
    // strategic
    switch (e.type) {
      case 'heal': {
        const units = targetUnits(game, player, sp, t);
        out.healed = healUnits(game, units, e.amount || 20);
        if (e.cleanse) for (const u of units) u.statuses = (u.statuses || []).filter(s => { const d = get('statuses', s.id); return d && d.kind === 'buff'; });
        break;
      }
      case 'damage': {
        const units = targetUnits(game, player, sp, t).filter(u => Rules.isHostile(game, player.id, u.owner));
        let dmg = 0;
        for (const u of units) { const d = Math.max(1, Math.round(e.amount || 10)); u.hp -= d; dmg += d; }
        for (const u of units.slice()) if (u.hp <= 0) Rules.killUnit(game, u);
        if (e.status) applyStatusTo(game, units.filter(u => u.hp > 0), e.status);
        out.damage = dmg;
        break;
      }
      case 'status': {
        const units = targetUnits(game, player, sp, t);
        applyStatusTo(game, units, { id: e.status, duration: e.duration, chance: e.chance });
        out.statused = units.length;
        break;
      }
      case 'resource': {
        const turns = e.duration || C.SPELL_RESOURCE_TURNS;
        const effects = {};
        for (const k of Object.keys(e)) if (k !== 'type' && k !== 'duration' && typeof e[k] === 'number') effects[k] = e[k];
        if (t.cityId !== undefined && S().city(game, t.cityId)) {
          const city = S().city(game, t.cityId); Rules.ensureCity(game, city);
          city.tempEffects.push({ id: sp.id, effects, turns });
          if (Events()) Events().emit('city:changed', { cityId: city.id });
        } else {
          for (const k of Object.keys(effects)) if (player.resources[k] !== undefined) player.resources[k] += effects[k];
          player.tempEffects.push({ id: sp.id, effects, turns });
          Rules.invalidate(player.id);
        }
        out.resource = effects;
        break;
      }
      case 'reveal': {
        const r = e.radius || 6;
        if (t.hexIdx !== undefined) S().reveal(game, player.id, t.hexIdx, r);
        else { const ex = game.explored[player.id]; if (ex) ex.fill(1); }
        out.revealed = true;
        break;
      }
      case 'stability': {
        const city = S().city(game, t.cityId);
        if (city) Rules.addStabilityMod(game, city, 'spell_' + sp.id, e.amount || 10, e.duration || C.STAB_MOD_TURNS, sp.name);
        break;
      }
      default: {
        // 'special' and unknown ids: apply any declared flat effects as a temporary empire bonus
        if (sp.effects && Object.keys(sp.effects).length) {
          player.tempEffects.push({ id: sp.id, effects: sp.effects, turns: e.duration || C.SPELL_RESOURCE_TURNS });
          Rules.invalidate(player.id);
        }
        out.special = e.id || null;
        break;
      }
    }
    return out;
  };
  function applyStatusTo(game, units, st) {
    if (!st || !st.id) return;
    const def = get('statuses', st.id);
    for (const u of units) {
      u.statuses = u.statuses || [];
      const ex = u.statuses.find(s => s.id === st.id);
      const turns = st.duration || (def && def.duration) || 3;
      if (ex) ex.turns = Math.max(ex.turns, turns);
      else u.statuses.push({ id: st.id, turns });
    }
  }
  Rules.applyStatus = function (game, unit, statusId, turns) { applyStatusTo(game, [unit], { id: statusId, duration: turns }); return unit; };

  /** Remove an active enchantment (empire-wide or from one city). */
  Rules.dispel = function (game, player, spellId, target) {
    player = playerOf(game, player); Rules.ensurePlayer(game, player);
    const t = normTarget(game, target || {});
    let removed = false;
    if (t.cityId !== undefined) {
      const city = S().city(game, t.cityId);
      if (city && city.enchantments) {
        const i = city.enchantments.indexOf(spellId);
        if (i >= 0) { city.enchantments.splice(i, 1); removed = true; }
      }
      player.spells.active = player.spells.active.filter(a => !(a.spellId === spellId && a.target && a.target.cityId === t.cityId));
      if (city && Events()) Events().emit('city:changed', { cityId: city.id });
    } else {
      const before = player.spells.active.length;
      player.spells.active = player.spells.active.filter(a => a.spellId !== spellId);
      removed = player.spells.active.length < before;
      for (const c of game.cities) if (c.owner === player.id && c.enchantments) { const i = c.enchantments.indexOf(spellId); if (i >= 0) c.enchantments.splice(i, 1); }
    }
    if (!removed) return fail('notKnown');
    Rules.invalidate(player.id);
    for (const u of S().allUnitsOfPlayer(game, player.id)) Rules.syncUnit(game, u);
    return { ok: true, spellId };
  };

  // ==================================================================== EMPIRE SKILLS
  Rules.totalAffinity = function (player) {
    let n = 0; for (const k of Object.keys(player.affinity || {})) n += player.affinity[k] || 0;
    return n;
  };
  Rules.empireSkillCost = function (game, player, sk) {
    player = playerOf(game, player);
    const eff = Rules.playerEffects(game, player);
    const base = (sk.cost && sk.cost.imperium) || 100;
    return Math.max(1, Math.round(base * (1 + clamp(eff.provinceCostPct || 0, -50, 100) / 100)));
  };
  /** Check an empire-skill purchase → {ok, cost} | {ok:false, reason}. */
  Rules.canBuyEmpireSkill = function (game, player, id) {
    player = playerOf(game, player); if (!player) return fail('notOwner');
    Rules.ensurePlayer(game, player);
    const sk = get('empireSkills', id); if (!sk) return fail('unknownAction');
    if ((player.empireSkills || []).includes(id)) return fail('alreadyResearched');
    for (const p of sk.prereq || []) if (!player.empireSkills.includes(p)) return fail('missingPrereq');
    const req = sk.affinityReq || 0;
    if (req > 0) {
      const have = sk.tree && sk.tree !== 'general' ? (player.affinity[sk.tree] || 0) : Rules.totalAffinity(player);
      if (have < req) return fail('affinityLow');
    }
    const cost = Rules.empireSkillCost(game, player, sk);
    if (player.resources.imperium < cost) return fail('notEnoughImperium');
    return { ok: true, cost };
  };
  /** Buy an empire-development skill (spends imperium, applies its effects empire-wide). */
  Rules.buyEmpireSkill = function (game, player, id) {
    player = playerOf(game, player);
    const r = Rules.canBuyEmpireSkill(game, player, id);
    if (!r.ok) return r;
    const sk = get('empireSkills', id);
    player.resources.imperium -= r.cost;
    player.empireSkills.push(id);
    for (const k of Object.keys(sk.affinity || {})) player.affinity[k] = (player.affinity[k] || 0) + sk.affinity[k];
    Rules.invalidate(player.id);
    for (const u of S().allUnitsOfPlayer(game, player.id)) Rules.syncUnit(game, u);
    Rules.notify(game, player.id, 'good', L(`제국 기술 습득: ${KO(sk.name)}`, `Empire skill learned: ${EN(sk.name)}`), 'imperium', { empireSkill: id }, LOW);
    return { ok: true, cost: r.cost, id };
  };
  Rules.unlockEmpireSkill = function (game, player, id) { return Rules.buyEmpireSkill(game, player, id); };
  /** Empire skills the player could buy (affordability aside). */
  Rules.empireSkillOptions = function (game, player) {
    const out = [];
    for (const sk of Data().list('empireSkills')) {
      const r = Rules.canBuyEmpireSkill(game, player, sk.id);
      if (r.ok || r.reason === 'notEnoughImperium') out.push(sk.id);
    }
    return out;
  };

  // ==================================================================== CITY CAPTURE
  /**
   * Transfer or destroy a city after a successful assault.
   * mode 'annex' (keep it), 'vassal' (free cities only), 'raze' (remove it).
   */
  Rules.captureCity = function (game, city, pid, mode) {
    if (!city) return fail('badIndex');
    mode = mode || 'annex';
    const from = city.owner;
    const player = S().player(game, pid);
    if (!player) return fail('notOwner');
    Rules.ensurePlayer(game, player);
    if (mode === 'vassal') {
      if (!city.freeCity) return fail('notFreeCity');
      city.freeCity.vassalOf = pid;
      city.freeCity.opinion = city.freeCity.opinion || {};
      city.freeCity.opinion[pid] = C.FC.VASSAL_OPINION;
      city.freeCity.warWith = (city.freeCity.warWith || []).filter(p => p !== pid);
      Rules.notify(game, pid, 'good', L(`${J(city.name, '이/가')} 봉신이 되었습니다.`, `${city.name} is now your vassal.`), 'crown', { cityId: city.id });
      if (Events()) Events().emit('city:captured', { cityId: city.id, from, to: pid, mode });
      return { ok: true, mode };
    }
    if (mode === 'raze') {
      const hex = city.hex;
      for (const pidx of city.provinces.slice()) {
        const prov = game.provinces[pidx];
        if (!prov) continue;
        prov.owner = -1; prov.cityId = -1; prov.improvement = null;
        for (const h of prov.hexes) game.owner[h] = -1;
      }
      const st = S().structureAt(game, hex);
      if (st) S().removeStructure(game, st.id);
      const i = game.cities.indexOf(city);
      if (i >= 0) game.cities.splice(i, 1);
      if (game._maps) delete game._maps.cities;
      if (from >= 0) { const op = S().player(game, from); if (op) { op.stats.cities = Rules.cityCount(game, from); Rules.invalidate(from); } }
      Rules.notify(game, pid, 'warn', L(`${J(city.name, '을/를')} 파괴했습니다.`, `${city.name} has been razed.`), 'skull', { hexIdx: hex });
      if (Events()) Events().emit('city:captured', { cityId: city.id, from, to: pid, mode });
      return { ok: true, mode };
    }
    // annex
    city.owner = pid;
    city.queue = [];
    city.draft = 0;
    city.enchantments = [];
    city.garrisonArmyId = -1;
    city.isCapital = false;
    city.stability = clamp((city.stability || 50) + C.STAB_CAPTURE, -100, 100);
    Rules.addStabilityMod(game, city, 'captured', C.STAB_CAPTURE, C.STAB_MOD_TURNS, L('최근 점령', 'Recently conquered'));
    if (city.freeCity) { city.freeCity.integrated = true; city.freeCity.vassalOf = -1; city.culture = city.freeCity.culture; }
    for (const pidx of city.provinces) {
      const prov = game.provinces[pidx];
      if (!prov) continue;
      claimProvince(game, prov, pid, city.id);
    }
    const st = S().structureAt(game, city.hex);
    if (st) { st.owner = pid; if (st.kind === 'free_city') st.kind = 'city'; }
    if (from >= 0) {
      const op = S().player(game, from);
      if (op) {
        op.stats.cities = Rules.cityCount(game, from);
        op.stats.territory = game.provinces.filter(p => p.owner === from).length;
        if (op.capitalId === city.id) { const next = game.cities.find(c => c.owner === from); op.capitalId = next ? next.id : -1; if (next) next.isCapital = true; }
        Rules.invalidate(from);
        Rules.notify(game, from, 'bad', L(`${J(city.name, '을/를')} 빼앗겼습니다.`, `${city.name} has been lost!`), 'skull', { cityId: city.id });
      }
    }
    player.stats.cities = Rules.cityCount(game, pid);
    player.stats.territory = game.provinces.filter(p => p.owner === pid).length;
    Rules.invalidate(pid);
    Rules.recomputeVisibility(game, pid);
    Rules.notify(game, pid, 'good', L(`${J(city.name, '을/를')} 점령했습니다!`, `${city.name} captured!`), 'crown', { cityId: city.id });
    log(game, `[capture] city ${city.id} ${from} → ${pid}`);
    if (Events()) { Events().emit('city:captured', { cityId: city.id, from, to: pid, mode }); Events().emit('city:changed', { cityId: city.id }); }
    return { ok: true, mode, cityId: city.id };
  };

  // ==================================================================== FREE CITIES
  Rules.freeCities = function (game) { return game.cities.filter(c => c.freeCity && c.owner < 0); };
  Rules.freeCityOpinion = function (game, city, pid) {
    if (!city || !city.freeCity) return 0;
    city.freeCity.opinion = city.freeCity.opinion || {};
    const base = city.freeCity.opinion[pid];
    return base === undefined ? C.FC.BASE_OPINION : base;
  };
  function setFcOpinion(game, city, pid, v) {
    city.freeCity.opinion = city.freeCity.opinion || {};
    city.freeCity.opinion[pid] = clamp(Math.round(v), -100, 100);
    return city.freeCity.opinion[pid];
  }
  Rules.freeCityStones = function (game, city) { return (city.freeCity && city.freeCity.stones) || []; };
  /**
   * gift | whisper | vassalize | integrate | declare — the free-city diplomacy verbs.
   * Opinion grows each turn for every whispering stone assigned (see Turn).
   */
  Rules.freeCityAction = function (game, player, city, action, opts) {
    player = playerOf(game, player); if (!player) return fail('notOwner');
    Rules.ensurePlayer(game, player);
    if (!city || !city.freeCity) return fail('notFreeCity');
    opts = opts || {};
    const fc = city.freeCity;
    fc.stones = fc.stones || [];
    fc.warWith = fc.warWith || [];
    const op = Rules.freeCityOpinion(game, city, player.id);
    switch (action) {
      case 'gift': {
        const gold = opts.gold || C.FC.GIFT_GOLD;
        if (player.resources.gold < gold) return fail('notEnoughGold');
        player.resources.gold -= gold;
        const gain = Math.max(1, Math.round(C.FC.GIFT_OPINION * gold / C.FC.GIFT_GOLD));
        setFcOpinion(game, city, player.id, op + gain);
        Rules.notify(game, player.id, 'info', L(`${city.name}에 선물을 보냈습니다 (+${gain})`, `Gift sent to ${city.name} (+${gain})`), 'gold', { cityId: city.id }, LOW);
        return { ok: true, opinion: Rules.freeCityOpinion(game, city, player.id) };
      }
      case 'whisper': {
        if (fc.stones.includes(player.id)) return fail('alreadyActive');
        const used = Rules.freeCities(game).filter(c => (c.freeCity.stones || []).includes(player.id)).length;
        if (used >= (player.whisperStones || 0)) return fail('notEnoughImperium');
        fc.stones.push(player.id);
        Rules.notify(game, player.id, 'info', L(`${city.name}에 속삭임의 돌을 보냈습니다.`, `A whispering stone was sent to ${city.name}.`), 'mana', { cityId: city.id }, LOW);
        return { ok: true, stones: fc.stones.slice() };
      }
      case 'vassalize': {
        if (fc.vassalOf === player.id) return fail('alreadyVassal');
        if (fc.vassalOf >= 0) return fail('alreadyVassal');
        if (op < C.FC.VASSAL_OPINION) return fail('opinionLow');
        fc.vassalOf = player.id;
        setFcOpinion(game, city, player.id, 0);
        Rules.invalidate(player.id);
        Rules.notify(game, player.id, 'good', L(`${J(city.name, '이/가')} 봉신이 되었습니다.`, `${city.name} has become your vassal.`), 'crown', { cityId: city.id });
        return { ok: true, vassal: true };
      }
      case 'integrate': {
        if (fc.vassalOf !== player.id) return fail('notVassal');
        if (op < C.FC.INTEGRATE_OPINION) return fail('opinionLow');
        if (Rules.cityCount(game, player.id) >= Rules.cityCap(game, player.id)) return fail('cityCap');
        const cost = Math.max(1, Math.round(city.pop * C.FC.INTEGRATE_IMPERIUM_PER_POP));
        if (player.resources.imperium < cost) return fail('notEnoughImperium');
        player.resources.imperium -= cost;
        Rules.captureCity(game, city, player.id, 'annex');
        city.stability = 50;
        city.stabilityMods = (city.stabilityMods || []).filter(m => m.id !== 'captured');
        return { ok: true, integrated: true, cost: { imperium: cost } };
      }
      case 'declare': {
        if (fc.warWith.includes(player.id)) return fail('alreadyAtWar');
        fc.warWith.push(player.id);
        fc.stones = fc.stones.filter(p => p !== player.id);
        if (fc.vassalOf === player.id) fc.vassalOf = -1;
        setFcOpinion(game, city, player.id, op + C.FC.DECLARE_OPINION);
        Rules.notify(game, player.id, 'warn', L(`${city.name}에 선전포고했습니다.`, `War declared on ${city.name}.`), 'sword', { cityId: city.id });
        return { ok: true, war: true };
      }
      default: return fail('unknownAction');
    }
  };
  /** Per-turn free-city opinion drift (whispering stones, vassal bonding). */
  Rules.freeCityTick = function (game, city) {
    if (!city || !city.freeCity || city.owner >= 0) return;
    const fc = city.freeCity;
    fc.stones = fc.stones || [];
    for (const pid of fc.stones) setFcOpinion(game, city, pid, Rules.freeCityOpinion(game, city, pid) + C.FC.STONE_PER_TURN);
    if (fc.vassalOf >= 0) setFcOpinion(game, city, fc.vassalOf, Rules.freeCityOpinion(game, city, fc.vassalOf) + 1);
  };

  // ==================================================================== GUARDS & STRUCTURES
  const GUARD_FAMILY = { animal: 'animals', undead: 'undead', marauder: 'bandits', bandit: 'bandits', elemental: 'elementals', dragon: 'dragons', giant: 'giants',
    fiend: 'fiends', construct: 'constructs', eldritch: 'eldritch', fey: 'fey', angelic: 'celestial', celestial: 'celestial' };
  function guardPools() {
    const n = Data().has('names', 'guard_pools') ? Data().get('names', 'guard_pools') : null;
    return (n && n.pools) || {};
  }
  /** Unit ids for a guard family ('animal','undead','marauder',…) up to `maxTier`. */
  Rules.guardPool = function (tags, tiers) {
    const pools = guardPools();
    const lo = (tiers && tiers[0]) || 1, hi = (tiers && tiers[1]) || 2;
    const out = [];
    for (const tag of (tags && tags.length ? tags : ['animal'])) {
      const fam = GUARD_FAMILY[tag] || tag;
      for (let t = lo; t <= hi; t++) {
        const list = pools[fam + '_t' + t];
        if (list) for (const id of list) if (has('units', id) && !out.includes(id)) out.push(id);
      }
    }
    if (!out.length) {
      for (const key of Object.keys(pools)) {
        const t = +(key.split('_t')[1] || 1);
        if (t < lo || t > hi) continue;
        for (const id of pools[key]) if (has('units', id) && !out.includes(id)) out.push(id);
      }
    }
    if (!out.length) for (const u of Data().list('units')) if ((u.tier || 1) <= hi && u.role !== 'hero') out.push(u.id);
    return out;
  };
  /** Roll a guard roster: {pool, tags, tiers, count:[min,max]} → [unitId…]. */
  Rules.pickGuardUnits = function (game, spec) {
    const r = rng(game);
    let pool = (spec.pool || []).filter(id => has('units', id));
    if (!pool.length) pool = Rules.guardPool(spec.tags, spec.tiers);
    if (!pool.length) return [];
    const cnt = spec.count || [3, 4];
    const n = clamp(r.int(cnt[0], cnt[1]), 1, C.UNITS_PER_ARMY);
    const out = [];
    for (let i = 0; i < n; i++) {
      const id = r.pick(pool);
      const t = get('units', id);
      out.push(id);
      if (t && (t.tier || 1) >= 4 && out.length >= 3) break;   // big monsters come in smaller packs
    }
    return out;
  };
  /** Guard spec for a structure (wonder tier / infestation kind / free-city culture roster). */
  Rules.guardSpecFor = function (game, st) {
    if (!st) return null;
    if (st.kind === 'wonder') {
      const w = get('wonders', st.refId);
      const tier = (w && w.tier) || st.tier || 1;
      const tags = (w && w.guard && w.guard.tags) || ['animal'];
      const tiers = (w && w.guard && w.guard.tiers) || [Math.max(1, tier), Math.min(5, tier + 1)];
      // the wonder's own short list is widened with the matching guard pools so stacks are varied
      const pool = ((w && w.guard && w.guard.pool) || []).filter(id => has('units', id));
      for (const id of Rules.guardPool(tags, tiers)) if (!pool.includes(id)) pool.push(id);
      return { pool, tags, tiers, count: (w && w.guard && w.guard.count) || [Math.min(5, tier + 1), Math.min(6, tier + 2)] };
    }
    if (st.kind === 'infestation') {
      const list = Data().has('names', 'infestation_kinds') ? Data().get('names', 'infestation_kinds').list : [];
      const k = (list || []).find(x => x.id === st.refId);
      const tiers = st.refId === 'dragon_lair' ? [3, 4] : [1, 3];
      return { pool: [], tags: (k && k.guardTags) || ['marauder'], tiers, count: st.refId === 'dragon_lair' ? [2, 3] : [3, 5], kind: st.refId };
    }
    if (st.kind === 'free_city') {
      const city = S().city(game, st.refId);
      const culture = city && city.freeCity ? city.freeCity.culture : null;
      const cul = get('cultures', culture);
      const roster = cul ? (cul.units || []).filter(id => has('units', id) && (get('units', id).tier || 1) <= 2 && get('units', id).role !== 'hero') : [];
      const pools = guardPools();
      const pool = roster.concat((pools.free_city || []).filter(id => has('units', id)));
      return { pool, tags: ['marauder'], tiers: [1, 2], count: [3, 4] };
    }
    return null;
  };
  /**
   * Make sure every uncleared wonder / infestation and every free city has a guard stack.
   * Called by Turn.beginGame and after raids; returns the number of armies created.
   */
  Rules.spawnGuards = function (game, opts) {
    opts = opts || {};
    let made = 0;
    for (const st of game.structures) {
      if (!st || st.kind === 'removed') continue;
      if (st.kind !== 'wonder' && st.kind !== 'infestation' && st.kind !== 'free_city') continue;
      if (st.kind !== 'free_city' && st.cleared) continue;
      let army = S().army(game, st.guardArmyId);
      if (army && army.units.length) continue;
      const spec = Rules.guardSpecFor(game, st);
      if (!spec) continue;
      const ids = Rules.pickGuardUnits(game, spec);
      if (!ids.length) continue;
      if (!army) { army = S().createArmy(game, -1, st.hex, []); st.guardArmyId = army.id; }
      for (const id of ids) { const u = S().createUnit(game, id, -1, army.id); Rules.syncUnit(game, u, true); }
      army.mp = Rules.armyMaxMp(game, army);
      if (st.kind === 'free_city') { const c = S().city(game, st.refId); if (c) c.garrisonArmyId = army.id; }
      made++;
    }
    return made;
  };
  /** Heal a structure's guards a little each turn (they never leave). */
  Rules.regenGuards = function (game) {
    for (const st of game.structures) {
      if (!st || st.cleared || (st.kind !== 'wonder' && st.kind !== 'infestation')) continue;
      const army = S().army(game, st.guardArmyId);
      if (!army) continue;
      for (const u of S().unitsOf(game, army)) u.hp = Math.min(u.maxHp, u.hp + Math.ceil(u.maxHp * C.GUARD_REGEN_PCT / 100));
    }
  };

  /** Clear a wonder / infestation once its guards are gone: pays rewards to `pid`. */
  Rules.clearStructure = function (game, structureId, pid) {
    const st = S().structure(game, structureId);
    if (!st) return fail('badIndex');
    if (st.cleared) return fail('alreadyResearched');
    const guard = S().army(game, st.guardArmyId);
    if (guard && guard.units.length) return fail('nothingToAttack');
    const player = S().player(game, pid);
    if (player) Rules.ensurePlayer(game, player);
    st.cleared = true;
    if (guard) S().removeArmy(game, guard.id);
    st.guardArmyId = -1;
    const reward = { gold: 0, mana: 0, knowledge: 0, imperium: 0, items: [] };
    if (st.kind === 'wonder') {
      const w = get('wonders', st.refId);
      const tier = (w && w.tier) || st.tier || 1;
      const r = (w && w.rewards) || {};
      reward.gold = r.gold || tier * 25;
      reward.mana = r.mana || 0;
      reward.knowledge = r.knowledge || 0;
      reward.imperium = (r.imperium || 0) + tier * 5;
      reward.items = Rules.rollLoot(game, r.itemTier || tier, r.items || 1);
      if (player) Rules.notify(game, pid, 'good', L(`${J(w ? KO(w.name) : '고대 불가사의', '을/를')} 정복했습니다!`, `${w ? EN(w.name) : 'Ancient wonder'} cleared!`), 'star', { structureId: st.id });
    } else if (st.kind === 'infestation') {
      const tier = st.refId === 'dragon_lair' ? 3 : 2;
      reward.gold = 40 * tier;
      reward.mana = 15 * tier;
      reward.imperium = 5 * tier;
      reward.items = Rules.rollLoot(game, tier, 1);
      st.infestationCleared = true;
      if (player) Rules.notify(game, pid, 'good', L('소굴을 소탕했습니다!', 'Infestation destroyed!'), 'skull', { structureId: st.id });
      // the spawner is gone for good
      for (const a of game.armies.slice()) if (a.owner < 0 && a.raid && a.raid.home === st.id) a.raid.home = -1;
      S().removeStructure(game, st.id);
    }
    if (player) {
      player.resources.gold += reward.gold;
      player.resources.mana += reward.mana;
      player.resources.knowledge += reward.knowledge;
      player.resources.imperium += reward.imperium;
      for (const it of reward.items) player.items.push(it);
      Rules.invalidate(pid);
    }
    log(game, `[clear] structure ${structureId} by p${pid}`);
    return { ok: true, reward, kind: st.kind };
  };

  // ==================================================================== BATTLE FALLBACK & STRENGTH
  /** Rough army strength estimate (used by the AI, diplomacy and the fallback resolver). */
  Rules.armyStrength = function (game, armyOrIds) {
    const ids = Array.isArray(armyOrIds) ? armyOrIds : [armyOrIds && armyOrIds.id !== undefined ? armyOrIds.id : armyOrIds];
    let total = 0;
    for (const id of ids) {
      const army = typeof id === 'object' ? id : S().army(game, id);
      if (!army) continue;
      for (const u of S().unitsOf(game, army)) {
        const st = Rules.unitStats(game, u);
        let dmg = 0;
        for (const a of st.attacks) dmg = Math.max(dmg, (a.damage || 0) * (a.repeat || 1));
        total += (u.hp / 10) * (1 + (st.def + st.res) * 0.08) + dmg * 1.2 + (st.isHero ? 25 : 0);
      }
    }
    return Math.round(total);
  };
  /**
   * Simplified battle resolution used when AOW.Combat is unavailable.
   * → {winner:0|1, losses:[[unitId…],[unitId…]], xp, attackerIds, defenderIds}
   */
  Rules.quickResolve = function (game, spec) {
    const A = (spec.attackerArmyIds || []).map(id => S().army(game, id)).filter(Boolean);
    const D = (spec.defenderArmyIds || []).map(id => S().army(game, id)).filter(Boolean);
    const sa = Math.max(1, Rules.armyStrength(game, A.map(a => a.id)));
    let sd = Math.max(1, Rules.armyStrength(game, D.map(a => a.id)));
    if (spec.siege) sd = Math.round(sd * 1.3);
    const r = rng(game);
    const roll = (sa + r.float(0, sa * 0.25)) / (sa + sd + r.float(0, sd * 0.25));
    const attackerWins = roll > 0.5;
    const ratio = clamp(attackerWins ? sd / (sa + sd) : sa / (sa + sd), 0.1, 0.9);
    const losses = [[], []];
    const sides = [A, D];
    for (let s = 0; s < 2; s++) {
      const winner = (s === 0) === attackerWins;
      const lossPct = winner ? ratio * 0.6 : 0.55 + ratio * 0.45;
      for (const army of sides[s]) {
        for (const u of S().unitsOf(game, army).slice()) {
          const dmg = Math.round(u.maxHp * clamp(lossPct + r.float(-0.15, 0.15), 0, 1.2));
          u.hp -= dmg;
          if (u.hp <= 0) { losses[s].push(u.id); Rules.killUnit(game, u); }
          else if (winner) Rules.grantXp(game, u, C.XP_WIN);
        }
      }
    }
    const result = { winner: attackerWins ? 0 : 1, losses, attackerIds: spec.attackerArmyIds || [], defenderIds: spec.defenderArmyIds || [], quick: true, hexIdx: spec.hexIdx };
    return result;
  };

  // ==================================================================== VICTORY & SCORE
  Rules.landProvinceCount = function (game) {
    if (game._landProvinces === undefined) {
      let n = 0;
      for (const p of game.provinces) if (!S().isWater(game, p.center)) n++;
      Object.defineProperty(game, '_landProvinces', { value: n, enumerable: false, writable: true, configurable: true });
    }
    return game._landProvinces;
  };
  /** Empire score (cities, territory, army, research, banked resources). */
  Rules.score = function (game, player) {
    player = playerOf(game, player); if (!player) return 0;
    Rules.ensurePlayer(game, player);
    let s = 0;
    for (const c of game.cities) if (c.owner === player.id) s += C.SCORE.city * (c.tier >= 1 ? 1 : 0.4) + c.pop * 5;
    s += game.provinces.filter(p => p.owner === player.id).length * C.SCORE.province;
    for (const u of game.units) if (u.owner === player.id) s += C.SCORE.unit * (S().unitType(u).tier || 1);
    s += player.research.done.length * C.SCORE.research;
    s += (player.resources.gold + player.resources.mana + player.resources.knowledge + player.resources.imperium) * C.SCORE.resource;
    s += (player.annexedWonders || []).length * 50;
    player.stats.score = Math.round(s);
    return player.stats.score;
  };
  /** A player is alive while they hold a city or at least one unit. */
  Rules.playerAlive = function (game, pid) {
    const p = S().player(game, pid);
    if (!p) return false;
    if (game.cities.some(c => c.owner === pid)) return true;
    return game.units.some(u => u.owner === pid);
  };
  /** Mark eliminated empires (call once per turn). */
  Rules.checkElimination = function (game) {
    const out = [];
    for (const p of game.players) {
      if (!p.alive) continue;
      if (Rules.playerAlive(game, p.id)) continue;
      p.alive = false;
      out.push(p.id);
      Rules.notifyWorld(game, 'warn', L(`${p.name} 세력이 멸망했습니다.`, `${p.name} has been eliminated.`), 'skull', { pid: p.id });
      log(game, `[eliminated] p${p.id}`);
    }
    return out;
  };
  /** Begin the magic victory ritual (needs a fully-researched tier V tome, 3 cities and mana for the beacons). */
  Rules.startMagicVictory = function (game, player) {
    player = playerOf(game, player); if (!player) return fail('notOwner');
    Rules.ensurePlayer(game, player);
    if (player.magicVictory) return fail('alreadyStarted');
    let ok5 = false;
    for (const id of player.tomes || []) {
      const t = tomeOf(id);
      if (!t || (t.tier || 1) < 5) continue;
      if ((t.contents || []).every(c => player.research.done.includes(c.id))) { ok5 = true; break; }
    }
    if (!ok5) return fail('needTierFive');
    const cities = game.cities.filter(c => c.owner === player.id && c.tier >= 1);
    if (cities.length < C.BEACONS) return fail('needCities');
    const cost = C.BEACON_COST * C.BEACONS;
    if (player.resources.mana < cost) return fail('notEnoughMana');
    player.resources.mana -= cost;
    const beacons = cities.slice(0, C.BEACONS).map(c => { Rules.ensureCity(game, c); c.beacon = true; return c.id; });
    player.magicVictory = { startTurn: game.turn, turns: C.MAGIC_HOLD, beacons };
    Rules.notifyWorld(game, 'warn', L(`${J(player.name, '이/가')} 마법 승리 의식을 시작했습니다!`, `${player.name} has begun the ritual of magic victory!`), 'mana', { pid: player.id });
    log(game, `[magic victory] p${player.id} started`);
    return { ok: true, beacons, cost: { mana: cost } };
  };
  /**
   * Victory check, evaluated in priority order military → magic → expansion → score.
   * → null | {type:'military'|'magic'|'expansion'|'score', winner:pid, turn}
   */
  Rules.victoryCheck = function (game) {
    if (game.victory) return game.victory;
    const V = (game.settings && game.settings.victory) || {};
    const alive = game.players.filter(p => p.alive);
    if (V.military !== false && alive.length === 1 && game.players.length > 1) return { type: 'military', winner: alive[0].id, turn: game.turn };
    if (V.magic !== false) {
      for (const p of alive) {
        if (!p.magicVictory) continue;
        const held = game.cities.filter(c => c.owner === p.id && c.beacon).length;
        if (held < C.BEACONS) { p.magicVictory = null; Rules.notify(game, p.id, 'bad', L('봉화를 잃어 의식이 중단되었습니다.', 'A beacon was lost — the ritual collapses.'), 'mana', { pid: p.id }); continue; }
        if (game.turn - p.magicVictory.startTurn >= (p.magicVictory.turns || C.MAGIC_HOLD)) return { type: 'magic', winner: p.id, turn: game.turn };
      }
    }
    if (V.expansion !== false) {
      const total = Math.max(1, Rules.landProvinceCount(game));
      for (const p of alive) {
        Rules.ensurePlayer(game, p);
        const own = game.provinces.filter(q => q.owner === p.id).length;
        if (own / total >= C.EXPANSION_PCT) {
          if (p.expansionMark !== game.turn) { p.expansionMark = game.turn; p.expansionTurns = (p.expansionTurns || 0) + 1; }
          if (p.expansionTurns >= C.EXPANSION_HOLD) return { type: 'expansion', winner: p.id, turn: game.turn };
        } else { p.expansionTurns = 0; p.expansionMark = game.turn; }
      }
    }
    if (V.score !== false && V.turnLimit && game.turn > V.turnLimit) {
      let best = null, bestScore = -Infinity;
      for (const p of alive) { const s = Rules.score(game, p); if (s > bestScore) { bestScore = s; best = p; } }
      if (best) return { type: 'score', winner: best.id, turn: game.turn, score: bestScore };
    }
    return null;
  };

  AOW.Rules = Rules;
})(window.AOW = window.AOW || {});
