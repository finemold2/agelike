// src/data/empire.js — Empire Development (affinity trees + general tree + rites) — SPEC §3, §3.1
//
// Schema (SPEC §3 `empireSkills` + additive fields, documented here per Ground Rule 0):
//   { id, name, desc, tree:'order'|'chaos'|'nature'|'materium'|'astral'|'shadow'|'general',
//     affinity:{<tree>:1}|{} (empty for 'general'), tier:1..4, affinityReq:0|5|10|16 (accumulated
//     affinity points needed in `tree` to unlock this node; 'general' checks total empire affinity),
//     cost:{imperium}: tier1 100 / tier2 200 / tier3 350 / tier4 500, prereq:[empireSkillId,…],
//     effects:{...§3.1, plus additive 'heroSlots':+n (extra hero roster slots)},
//     rite:true|false (a one-shot Imperium-cost power spike; only the six tier-4 capstones — one per
//       affinity tree below — carry it), col:0.. / row:0..3 (grid layout hints for the empire screen UI) }
// Numbers adapted from AoW4's real Affinity & Empire Development trees
// (docs/research/tomes_spells_affinity.md Part 2), compressed from the game's 10-level/affinity-score
// gating into this project's simpler 4-tier structure.
(function (AOW) {
  'use strict';
  const Data = AOW.Data;
  const nm = (ko, en) => ({ ko, en });

  const TIER_REQ = { 1: 0, 2: 5, 3: 10, 4: 16 };
  const TIER_COST = { 1: 100, 2: 200, 3: 350, 4: 500 };
  const ES = (id, ko, en, dko, den, tree, tier, col, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), tree, affinity: tree === 'general' ? {} : { [tree]: 1 },
    tier, affinityReq: TIER_REQ[tier], cost: { imperium: TIER_COST[tier] }, prereq: [], effects: {},
    col, row: tier - 1, rite: false,
  }, o);

  /** Builds a tier-gridded branch: rows[tierIndex] = array of {slug,ko,en,dko,den,effects,rite?} (any column count).
   *  Column c at tier t prereqs column min(c, len(t-1)-1) at tier t-1 (tier 1 has no prereq). Returns the ids grid. */
  function buildTree(tree, rows) {
    const ids = [];
    rows.forEach((rowDefs, ti) => {
      const tier = ti + 1;
      ids[ti] = [];
      rowDefs.forEach((d, col) => {
        const id = `es_${tree}_${d.slug}`;
        const prereq = tier > 1 ? [ids[ti - 1][Math.min(col, ids[ti - 1].length - 1)]] : [];
        Data.define('empireSkills', ES(id, d.ko, d.en, d.dko, d.den, tree, tier, col, { effects: d.effects, prereq, rite: !!d.rite }));
        ids[ti][col] = id;
      });
    });
    return ids;
  }

  //#region ===================================================== GENERAL TREE (13 nodes, no rite — gated by total empire affinity)
  buildTree('general', [
    [ // tier 1 — 100 Imperium, affinityReq 0
      { slug: 'basic_seafaring', ko: '기초 항해술', en: 'Basic Seafaring', dko: '유닛이 배에 올라 물을 건널 수 있게 되고, 비행·부유 유닛도 바다 위를 지날 수 있습니다.', den: 'Units may embark to cross water, and Flying/Floating units may travel over the sea.', effects: { armyMove: 1 } },
      { slug: 'excavation', ko: '굴착', en: 'Excavation', dko: '지하의 흙 지형을 굴착할 수 있게 되어 생산력이 늘어납니다.', den: 'Unlocks excavating earthen terrain underground, boosting Production.', effects: { production: 5 } },
      { slug: 'road_building', ko: '도로 건설', en: 'Road Building', dko: '군세가 이동하며 도로를 놓을 수 있게 되어 행군이 한결 빨라집니다.', den: 'Armies may build roads as they move, speeding up marches.', effects: { armyMove: 1 } },
      { slug: 'advanced_seafaring', ko: '고급 항해술', en: 'Advanced Seafaring', dko: '승선 비용이 줄고, 승선한 유닛은 매우 빠른 이동을 얻습니다.', den: 'Embarking costs less, and embarked units gain Very Fast Movement.', effects: { armyMove: 2 } },
    ],
    [ // tier 2 — 200 Imperium, affinityReq 5
      { slug: 'diplomatic_focus', ko: '외교적 집중', en: 'Diplomatic Focus', dko: '다른 세력과의 관계가 개선됩니다.', den: 'Improves standing relations with other rulers.', effects: { diplomacyOpinion: 10 } },
      { slug: 'advanced_sensing', ko: '고급 탐지', en: 'Advanced Sensing', dko: '아군 유닛과 도시의 시야가 넓어집니다.', den: "Extends friendly units' and cities' Vision Range.", effects: { vision: 2 } },
      { slug: 'wizard_king', ko: '마법왕', en: 'Wizard King', dko: '세계 지도 및 전투 시전 포인트를 추가로 얻습니다.', den: 'Grants extra World Map and Combat Casting Points.', effects: { casting: 10, combatCasting: 10 } },
    ],
    [ // tier 3 — 350 Imperium, affinityReq 10
      { slug: 'forced_march', ko: '강행군', en: 'Forced March', dko: '군세가 강행군을 사용할 수 있게 되어 순간적으로 이동력이 크게 늘어납니다.', den: 'Armies may Forced March for a sharp burst of extra movement.', effects: { armyMove: 3 } },
      { slug: 'siege_specialization', ko: '공성 전문화', en: 'Siege Specialization', dko: '공성 작전 슬롯이 늘어나고 도시 방어가 굳건해집니다.', den: 'Grants an extra Siege Project slot and toughens city defenses.', effects: { cityDefense: 5 } },
      { slug: 'advanced_logistics', ko: '고급 병참', en: 'Advanced Logistics', dko: '도로 이동 비용이 줄고 승선한 유닛이 매우 빠르게 이동합니다.', den: 'Roads cost less movement and embarked units move very quickly.', effects: { armyMove: 2 } },
    ],
    [ // tier 4 — 500 Imperium, affinityReq 16
      { slug: 'teleporter_infrastructure', ko: '순간이동 기반시설', en: 'Teleporter Infrastructure', dko: '도시가 순간이동 장치를 건설할 수 있게 되어 지방 확장 비용이 줄어듭니다.', den: 'Cities may build Teleporters; province expansion costs less.', effects: { provinceCostPct: -10 } },
      { slug: 'cosmic_affinity', ko: '우주적 친화', en: 'Cosmic Affinity', dko: '친화 점수를 지닌 각 계통마다 매 턴 자원을 소량씩 얻습니다.', den: 'Gain a trickle of resources each turn for every affinity branch you hold points in.', effects: { mana: 4, gold: 4, knowledge: 4, production: 4, food: 4 } },
      { slug: 'focused_affinity', ko: '집중된 친화', en: 'Focused Affinity', dko: '연구 속도가 크게 빨라집니다.', den: 'Sharply speeds up research.', effects: { researchPct: 12 } },
    ],
  ]);
  Data.define('empireSkills', ES('es_general_vassal_bonds', '봉신의 유대', 'Bonds of Vassalage', '봉신과의 관계가 두터워져 그들이 바치는 조공이 늘어납니다.',
    'Deepens ties with vassals, increasing the tribute they provide.', 'general', 2, 3, { effects: { goldPct: 5 }, prereq: ['es_general_diplomatic_focus'] }));
  Data.define('empireSkills', ES('es_general_hero_reserves', '영웅 예비군', 'Heroic Reserves', '왕실이 예비 영웅 한 명을 더 거둘 자리를 마련합니다.',
    'The court makes room for one more hero in reserve.', 'general', 3, 3, { effects: { heroSlots: 1 }, prereq: ['es_general_forced_march'] }));
  Data.define('empireSkills', ES('es_general_expanded_cap', '확장된 통치', 'Expanded Governance', '통치 체계를 정비해 다스릴 수 있는 도시 수가 늘어납니다.',
    'Reorganizes governance so the empire can administer one more city.', 'general', 4, 3, { effects: { cityCap: 1 }, prereq: ['es_general_teleporter_infrastructure'] }));
  //#endregion

  //#region ===================================================== ORDER TREE (13 nodes incl. 1 rite)
  buildTree('order', [
    [
      { slug: 'aligned_relations', ko: '동조하는 관계', en: 'Aligned Relations', dko: '성향이 반대되지 않는 자유도시들과의 관계가 크게 좋아집니다.', den: 'Greatly improves relations with Free Cities whose alignment does not oppose yours.', effects: { diplomacyOpinion: 15 } },
      { slug: 'pacification', ko: '평정', en: 'Pacification', dko: '침공지를 정리할 때마다 제국 전체 도시의 안정도가 한동안 오릅니다.', den: 'Clearing an Infestation raises Stability empire-wide for a while.', effects: { stability: 4 } },
      { slug: 'gold_infrastructure', ko: '금화 기반시설', en: 'Gold Infrastructure', dko: '금 관련 시설이 늘어나 도시의 안정도와 금 수입이 함께 오릅니다.', den: 'Gold-related structures raise both City Stability and Gold income.', effects: { stability: 3, gold: 5 } },
    ],
    [
      { slug: 'diplomatic_expertise', ko: '외교 전문성', en: 'Diplomatic Expertise', dko: '속삭이는 돌을 하나 더 얻고, 그 효과가 강해집니다.', den: 'Grants an extra Whispering Stone with a stronger effect.', effects: { diplomacyOpinion: 10 } },
      { slug: 'cultural_exchangers', ko: '문화 교류자', en: 'Cultural Exchangers', dko: '다른 세력과 맺은 협정마다 지식을 얻습니다.', den: 'Gain Knowledge for every active treaty with other empires.', effects: { knowledge: 8 } },
      { slug: 'spiritual_conviction', ko: '영적 확신', en: 'Spiritual Conviction', dko: '안정도가 평온 이상인 도시일수록 마나 수입이 늘어납니다.', den: 'Cities above Neutral Stability generate extra Mana.', effects: { mana: 8 } },
    ],
    [
      { slug: 'dutiful_watch', ko: '충직한 경계', en: 'Dutiful Watch', dko: '도시에 주둔한 아군 유닛이 안정도를 끌어올리고 경험치를 더 빨리 얻습니다.', den: 'Friendly units garrisoned in cities raise Stability and gain Experience faster.', effects: { stability: 8, xpPct: 5 } },
      { slug: 'oaths_of_vengeance', ko: '복수의 맹약', en: 'Oaths of Vengeance', dko: '포상금 임무를 완수하면 보상과 관계 개선이 크게 늘어납니다.', den: 'Completing a Bounty grants far better rewards and relations.', effects: { diplomacyOpinion: 20 } },
      { slug: 'shared_prosperity', ko: '공유된 번영', en: 'Shared Prosperity', dko: '금화 시설이 안정도와 생산력을 함께 안겨줍니다.', den: 'Gold structures also grant Stability and Production.', effects: { stability: 10, production: 5 } },
    ],
    [
      { slug: 'benevolent_conquerors', ko: '자비로운 정복자', en: 'Benevolent Conquerors', dko: '정복한 도시를 봉신으로 삼는 과정이 빨라지고 관계 손실이 사라집니다.', den: 'Converting conquered cities into Vassals is faster and costs no relations.', effects: { diplomacyOpinion: 15 } },
      { slug: 'bonds_of_brotherhood', ko: '형제의 유대', en: 'Bonds of Brotherhood', dko: '방위 협정과 동맹을 맺은 세력마다 임페리움을 얻습니다.', den: 'Gain Imperium income for every Defensive Pact and Alliance you hold.', effects: { imperium: 10 } },
      { slug: 'absolute_loyalty', ko: '절대적 충성', en: 'Absolute Loyalty', dko: '최고 수준의 충성을 바치는 봉신의 조공이 크게 늘어납니다.', den: 'Vassals at the highest loyalty grant far greater income.', effects: { goldPct: 10 } },
      { slug: 'knightly_oaths', ko: '기사의 서약', en: 'Order of Knightly Oaths', dko: '전설급 유닛이 유형에 맞는 강력한 축복을 받는, 질서 계통의 정점에 선 의식.', den: "The capstone rite of the Order tree: Legendary-rank units gain a powerful blessing suited to their role.", effects: { hp: 10, def: 2 }, rite: true },
    ],
  ]);
  //#endregion

  //#region ===================================================== CHAOS TREE (13 nodes incl. 1 rite)
  buildTree('chaos', [
    [
      { slug: 'war_industry', ko: '전쟁 산업', en: 'War Industry', dko: '채석장이 징집력을 추가로 내줍니다.', den: 'Quarries yield extra Draft income.', effects: { draft: 6 } },
      { slug: 'war_infrastructure', ko: '전쟁 기반시설', en: 'War Infrastructure', dko: '징집 시설을 짓는 비용이 줄어듭니다.', den: 'Draft structures cost less to build.', effects: { recruitCostPct: -8 } },
      { slug: 'specialized_troops', ko: '전문 부대', en: 'Specialized Troops', dko: '유닛 연구 비용과 신규 유닛 징집 비용이 줄어듭니다.', den: 'Unit research and newly-unlocked recruit costs are reduced.', effects: { recruitCostPct: -8, researchPct: 8 } },
    ],
    [
      { slug: 'battlefield_looting', ko: '전장 약탈', en: 'Battlefield Looting', dko: '전투에서 처치한 유닛의 등급에 따라 금을 얻습니다.', den: "Gain Gold based on the tier of units slain in combat.", effects: { gold: 8 } },
      { slug: 'might_makes_right', ko: '힘이 곧 정의', en: 'Might Makes Right', dko: '고티어 유닛이 저티어 아군과 함께할 때 서로 강해집니다.', den: 'High- and low-tier units strengthen each other when fighting side by side.', effects: { hp: 5 } },
      { slug: 'chaotic_inspiration', ko: '혼돈의 영감', en: 'Chaotic Inspiration', dko: '새 연구를 시작할 때마다 무작위 기술의 지식 비용이 줄어듭니다.', den: 'Starting new research randomly discounts another skill.', effects: { researchPct: 8 } },
    ],
    [
      { slug: 'otherworldly_reinforcements', ko: '이계의 증원', en: 'Otherworldly Reinforcements', dko: '소환 주문의 시전 비용이 줄어듭니다.', den: 'Summon spells cost less to cast.', effects: { spellCostPct: -10 } },
      { slug: 'skilled_raiders', ko: '숙련된 약탈자', en: 'Skilled Raiders', dko: '지방 약탈이 더 빨라지고 더 많은 전리품을 안겨주며 부대를 치유합니다.', den: 'Pillaging is faster, yields more loot, and heals the raiding army.', effects: { healPerTurn: 4 } },
      { slug: 'destiny_of_war', ko: '전쟁의 운명', en: 'Destiny of War', dko: '왕도가 참전 중인 전쟁마다 금과 마나를 추가로 얻습니다.', den: 'The Throne City gains extra Gold and Mana for every active war.', effects: { gold: 10, mana: 10 } },
    ],
    [
      { slug: 'conquerors', ko: '정복자', en: 'Conquerors', dko: '도시를 흡수하거나 이주시키는 과정이 빨라지고 그 도시가 영구적인 자원 보너스를 얻습니다.', den: 'Absorbing or Migrating cities is faster and grants them a permanent bonus.', effects: { production: 8 } },
      { slug: 'despoilers', ko: '파괴자', en: 'Despoilers', dko: '도시를 파괴할 때 더 빠르고 인구당 더 큰 보상을 얻습니다.', den: 'Razing a city is faster and yields more per Population lost.', effects: { gold: 10 } },
      { slug: 'first_blood', ko: '첫 피의 시작', en: 'First Blood Initiation', dko: '아군 유닛의 치명타 확률이 크게 오릅니다 (계급이 오를수록 감소).', den: "Units gain a large Critical Hit bonus that fades as they rank up.", effects: { critChance: 15 } },
      { slug: 'chosen_of_ruin', ko: '파멸에 선택받은 자', en: 'Chosen of Ruin', dko: '전쟁으로 제국을 뒤흔드는, 혼돈 계통의 정점에 선 의식. 모든 아군이 격노하며 강해집니다.', den: "The capstone rite of the Chaos tree, shaking the empire with war: every army is briefly enraged and empowered.", effects: { dmgPct: 15 }, rite: true },
    ],
  ]);
  //#endregion

  //#region ===================================================== NATURE TREE (13 nodes incl. 1 rite)
  buildTree('nature', [
    [
      { slug: 'food_infrastructure', ko: '식량 기반시설', en: 'Food Infrastructure', dko: '식량 시설을 짓는 비용이 줄어듭니다.', den: 'Food structures cost less to build.', effects: { recruitCostPct: 0, goldPct: -3 } },
      { slug: 'fruitful_integration', ko: '풍요로운 통합', en: 'Fruitful Integration', dko: '도시를 세우거나 흡수하는 과정이 빨라지고 인구가 곧바로 늘어납니다.', den: 'Founding or absorbing cities is faster and grants extra Population at once.', effects: { growthPct: 5 } },
      { slug: 'prosperous_lands', ko: '번영하는 땅', en: 'Prosperous Lands', dko: '농장이 금과 안정도를 함께 내줍니다.', den: 'Farms also yield Gold and Stability.', effects: { gold: 5, stability: 2 } },
    ],
    [
      { slug: 'tree_keepers', ko: '나무의 수호자', en: 'Tree Keepers', dko: '벌목장이 마나와 안정도를 함께 내줍니다.', den: 'Foresters also yield Mana and Stability.', effects: { mana: 4, stability: 2 } },
      { slug: 'foraging', ko: '채집', en: 'Foraging', dko: '아군 영토 안의 부대가 매 턴 체력을 더 회복하고 경험치를 얻습니다.', den: 'Armies in friendly territory heal more each turn and gain Experience.', effects: { healPerTurn: 4, xpPct: 4 } },
      { slug: 'symbiotic_armies', ko: '공생하는 군세', en: 'Symbiotic Armies', dko: '비고유 유닛이 고유 유닛과 함께할 때 체력과 경험치를 더 얻습니다.', den: 'Non-racial units gain extra Hit Points and Experience alongside racial ones.', effects: { hp: 4, xpPct: 4 } },
    ],
    [
      { slug: 'fields_of_fertility', ko: '비옥한 들판', en: 'Fields of Fertility', dko: '자원이 없는 지방에서도 식량 수입을 얻습니다.', den: 'Provinces without a Resource Node still yield Food.', effects: { food: 6 } },
      { slug: 'adapt_and_overcome', ko: '적응과 극복', en: 'Adapt and Overcome', dko: '이번 턴 처음 약화에 걸리면 잠시 상태이상 보호를 얻습니다.', den: 'The first debuff each turn grants brief protection against further status effects.', effects: { statusRes: 2 } },
      { slug: 'sacred_waters', ko: '신성한 물', en: 'Sacred Waters', dko: '연안·강·수상 지방에서 지식을 얻습니다.', den: 'Coast, river and water provinces yield extra Knowledge.', effects: { knowledge: 6 } },
    ],
    [
      { slug: 'expansive_reach', ko: '확장하는 손길', en: 'Expansive Reach', dko: '도시가 더 먼 지방까지 영역을 넓힐 수 있습니다.', den: 'Cities may expand their domain further out.', effects: { provinceCostPct: -8 } },
      { slug: 'well_supplied', ko: '충분한 보급', en: 'Well Supplied', dko: '영역 안에서 시작한 아군 부대가 영역 밖에서도 한동안 보급 효과를 유지합니다.', den: 'Armies that start their turn in your domain keep a supply bonus for a while outside it.', effects: { armyMove: 1, hp: 3 } },
      { slug: 'plowshares_to_swords', ko: '쟁기를 검으로', en: 'Plowshares to Swords', dko: '도시가 식량 수입의 일부만큼 징집력을 추가로 얻습니다.', den: "Cities gain Draft income proportional to their Food income.", effects: { draft: 8 } },
      { slug: 'druidic_empire', ko: '드루이드 제국', en: 'Druidic Empire', dko: '자연과 완전히 하나가 되는, 자연 계통의 정점에 선 의식. 모든 도시의 인구가 자원을 아낌없이 내줍니다.', den: "The capstone rite of the Nature tree, becoming one with the land: every city's Population yields resources freely for a while.", effects: { food: 10, knowledge: 5, gold: 5 }, rite: true },
    ],
  ]);
  //#endregion

  //#region ===================================================== MATERIUM TREE (13 nodes incl. 1 rite)
  buildTree('materium', [
    [
      { slug: 'industrial_infrastructure', ko: '산업 기반시설', en: 'Industrial Infrastructure', dko: '생산 시설을 짓는 비용이 줄어듭니다.', den: 'Production structures cost less to build.', effects: { productionPct: 4 } },
      { slug: 'land_sculptors', ko: '땅의 조각가', en: 'Land Sculptors', dko: '지형변화 주문의 비용이 줄어듭니다.', den: 'Terraforming spells cost less to cast.', effects: { spellCostPct: -10 } },
      { slug: 'outpost_expertise', ko: '전초기지 전문성', en: 'Outpost Expertise', dko: '전초기지를 세우는 시간과 비용이 줄어듭니다.', den: 'Founding Outposts takes less time and Gold.', effects: { provinceCostPct: -8 } },
    ],
    [
      { slug: 'metropolitan_plans', ko: '대도시 계획', en: 'Metropolitan Plans', dko: '도시 주문과 시설의 연구 비용이 줄어듭니다.', den: 'City Spell and City Structure research costs less.', effects: { researchPct: 6 } },
      { slug: 'mythical_alloys', ko: '신비의 합금', en: 'Mythical Alloys', dko: '광산이 마나를 추가로 내줍니다.', den: 'Mines also yield Mana.', effects: { mana: 5 } },
      { slug: 'purified_gold', ko: '정제된 황금', en: 'Purified Gold', dko: '광산이 금을 추가로 내줍니다.', den: 'Mines also yield extra Gold.', effects: { gold: 5 } },
    ],
    [
      { slug: 'bastion_builders', ko: '요새 건축가', en: 'Bastion Builders', dko: '도시 방어 시설의 비용이 줄고 안정도와 생산력을 함께 내줍니다.', den: 'City Defense structures cost less and grant Stability and Production.', effects: { stability: 5, production: 5 } },
      { slug: 'consolidated_industry', ko: '통합된 산업', en: 'Consolidated Industry', dko: '같은 종류의 지방 시설이 서로 인접할 때 안정도를 더 얻습니다.', den: 'Adjacent Province Improvements of the same kind grant extra Stability.', effects: { stability: 4 } },
      { slug: 'metropolitan_society', ko: '대도시 사회', en: 'Metropolitan Society', dko: '왕도와 그 접경 도시들의 모든 수입이 늘어납니다.', den: 'All income rises in the Throne City and cities bordering it.', effects: { goldPct: 6, productionPct: 6 } },
    ],
    [
      { slug: 'logistical_centers', ko: '병참 중심지', en: 'Logistical Centers', dko: '도시에 인접한 지방의 수입이 크게 늘어납니다.', den: 'Provinces adjacent to your cities yield much more income.', effects: { production: 10 } },
      { slug: 'formula_archives', ko: '비법 문서고', en: 'Formula Archives', dko: '희귀한 마법 재료를 소량 얻습니다.', den: 'Gain a small stock of rare magic materials.', effects: { production: 6 } },
      { slug: 'competitive_markets', ko: '경쟁하는 시장', en: 'Competitive Markets', dko: '도시가 상회 자리를 하나 더 얻습니다.', den: 'Cities gain an additional trade Guild slot.', effects: { gold: 8 } },
      { slug: 'the_forge_eternal', ko: '영원의 대장간', en: 'The Forge Eternal', dko: '온 제국의 대장간이 하나로 이어지는, 물질 계통의 정점에 선 의식. 모든 유닛의 장비가 벼려집니다.', den: "The capstone rite of the Materium tree, linking every forge in the empire: every unit's gear is reforged stronger.", effects: { def: 2, res: 1 }, rite: true },
    ],
  ]);
  //#endregion

  //#region ===================================================== ASTRAL TREE (13 nodes incl. 1 rite)
  buildTree('astral', [
    [
      { slug: 'mana_infrastructure', ko: '마나 기반시설', en: 'Mana Infrastructure', dko: '마나 시설을 짓는 비용이 줄어듭니다.', den: 'Mana structures cost less to build.', effects: { manaPct: 4 } },
      { slug: 'supercharged_conduits', ko: '과충전된 도관', en: 'Supercharged Conduits', dko: '마력 도관이 생산력과 식량을 함께 내줍니다.', den: 'Conduits also yield Production and Food.', effects: { production: 3, food: 3 } },
      { slug: 'ancient_studies', ko: '고대 연구', en: 'Ancient Studies', dko: '병합한 고대 유적마다 등급에 비례해 지식을 얻습니다.', den: 'Annexed Ancient Wonders yield Knowledge scaled to their Tier.', effects: { knowledge: 5 } },
    ],
    [
      { slug: 'transformative_expertise', ko: '변형의 전문성', en: 'Transformative Expertise', dko: '인챈트와 변이 주문의 비용이 줄어듭니다.', den: 'Enchantment and Transformation spells cost less to cast.', effects: { spellCostPct: -10 } },
      { slug: 'grand_casting_reserves', ko: '위대한 시전 저장고', en: 'Grand Casting Reserves', dko: '세계 지도 시전 포인트를 크게 얻습니다.', den: 'Grants a large boost to World Map Casting Points.', effects: { casting: 15 } },
      { slug: 'tactical_casting_reserves', ko: '전술 시전 저장고', en: 'Tactical Casting Reserves', dko: '전투 시전 포인트를 크게 얻습니다.', den: 'Grants a large boost to Combat Casting Points.', effects: { combatCasting: 15 } },
    ],
    [
      { slug: 'summoning_bonds', ko: '소환의 유대', en: 'Summoning Bonds', dko: '마법 기원 유닛과 그렇지 않은 유닛이 함께할 때 경험치와 상태이상 저항을 얻습니다.', den: 'Magic Origin and non-Magic Origin units gain Experience and Status Resistance from fighting together.', effects: { statusRes: 2, xpPct: 4 } },
      { slug: 'cosmic_breaches', ko: '우주의 균열', en: 'Cosmic Breaches', dko: '전투에서 피해·약화 주문이 대상의 저항력을 추가로 깎습니다.', den: 'Combat Damage and Debuff spells also Sunder Resistance.', effects: { res: -1 } },
      { slug: 'spell_warding', ko: '주문의 가호', en: 'Spell Warding', dko: '치유·강화 주문이 대상에게 저항 강화까지 함께 부여합니다.', den: 'Healing and Buff spells also grant Bolstered Resistance.', effects: { res: 1 } },
    ],
    [
      { slug: 'alchemical_applications', ko: '연금술 응용', en: 'Alchemical Applications', dko: '마나 자원 지점이 금과 생산력을 함께 내줍니다.', den: 'Mana Resource Nodes also yield Gold and Production.', effects: { gold: 8, production: 8 } },
      { slug: 'teleportation_mastery', ko: '순간이동 숙련', en: 'Teleportation Mastery', dko: '순간이동 장치가 마나 수입을 늘리고, 사용한 유닛을 완전히 회복시킵니다.', den: 'Teleporters yield extra Mana and fully heal units that use them.', effects: { mana: 10 } },
      { slug: 'astral_absorption', ko: '아스트랄 흡수', en: 'Astral Absorption', dko: '적이 전투에서 주문을 시전할 때마다 전투 시전 포인트와 마나를 얻습니다.', den: "Gain Combat Casting Points and Mana whenever an enemy casts a spell against you in battle.", effects: { mana: 8, combatCasting: 5 } },
      { slug: 'astral_convergence_rite', ko: '아스트랄 수렴', en: 'Astral Convergence', dko: '온 하늘의 별이 한 점으로 모이는, 아스트랄 계통의 정점에 선 의식. 시전 포인트가 폭발적으로 차오릅니다.', den: "The capstone rite of the Astral tree, drawing every star to a single point: Casting Points surge across the empire.", effects: { casting: 20, combatCasting: 20 }, rite: true },
    ],
  ]);
  //#endregion

  //#region ===================================================== SHADOW TREE (13 nodes incl. 1 rite)
  buildTree('shadow', [
    [
      { slug: 'finders_keepers', ko: '주운 자가 임자', en: "Finders Keepers", dko: '보물 상자에서 얻는 자원 보상이 늘어납니다.', den: 'Resource rewards from Pickups are increased.', effects: { gold: 4 } },
      { slug: 'wonder_reavers', ko: '유적 강탈자', en: 'Wonder Reavers', dko: '고대 유적을 정리하면 등급에 따라 지식을 얻습니다.', den: 'Clearing an Ancient Wonder grants Knowledge scaled to its rank.', effects: { knowledge: 6 } },
      { slug: 'extracted_essence', ko: '추출된 정수', en: 'Extracted Essence', dko: '전투에서 처치한 유닛의 등급에 따라 마나를 얻습니다.', den: 'Gain Mana based on the tier of units slain in combat.', effects: { mana: 5 } },
    ],
    [
      { slug: 'turncoat_masters', ko: '변절자의 주인', en: 'Turncoat Masters', dko: '전투에서 승리하면 도주하는 적 유닛을 포로로 삼을 수 있습니다.', den: 'Winning a battle lets you capture routing enemy units.', effects: { gold: 5 } },
      { slug: 'hexes_and_curses', ko: '저주와 마법', en: 'Hexes and Curses', dko: '적 부대 주문과 약화 주문의 시전 비용이 줄어듭니다.', den: 'Enemy Army spells and Debuff spells cost less to cast.', effects: { spellCostPct: -10 } },
      { slug: 'research_infrastructure', ko: '연구 기반시설', en: 'Research Infrastructure', dko: '지식 시설을 짓는 비용이 줄어듭니다.', den: 'Knowledge structures cost less to build.', effects: { knowledgePct: 4 } },
    ],
    [
      { slug: 'seeing_stones', ko: '천리안의 돌', en: 'Seeing Stones', dko: '속삭이는 돌을 배치한 자유도시나 봉신에게서 지식과 시야를 얻습니다.', den: 'Free Cities and Vassals holding a Whispering Stone grant Vision and Knowledge.', effects: { knowledge: 10, vision: 1 } },
      { slug: 'interrogation_studies', ko: '심문의 연구', en: 'Interrogation Studies', dko: '지식 시설이 마나와 금을 함께 내줍니다.', den: 'Knowledge structures also yield Mana and Gold.', effects: { mana: 5, gold: 5 } },
      { slug: 'shadow_binding', ko: '그림자 결속', en: 'Shadow Binding', dko: '마법 기원 유닛의 기본 유지비가 줄어듭니다.', den: 'Base upkeep for Magic Origin units is reduced.', effects: { upkeepPct: -12 } },
    ],
    [
      { slug: 'dark_vigor', ko: '어둠의 활력', en: 'Dark Vigor', dko: '적대적인 영역 안에서 아군 부대가 매 턴 체력을 더 회복합니다.', den: 'Armies regenerate extra Hit Points per turn in hostile domain.', effects: { healPerTurn: 6 } },
      { slug: 'feeding_on_fear', ko: '두려움을 먹고', en: 'Feeding on Fear', dko: '전투에서 도주한 적 유닛마다 아군이 체력을 회복합니다.', den: 'Units heal Hit Points for every enemy that Routed in the battle.', effects: { healPerTurn: 4 } },
      { slug: 'headhunters', ko: '목 사냥꾼', en: 'Headhunters', dko: '아군이 적 영웅에게 주는 피해가 늘어납니다.', den: 'Deals extra damage against enemy Heroes.', effects: { dmgPct: 8 } },
      { slug: 'eyes_everywhere', ko: '어디에나 있는 눈', en: 'Eyes Everywhere', dko: '온 세상에 그림자의 눈을 심는, 그림자 계통의 정점에 선 의식. 즉시 지도 전체가 드러납니다.', den: "The capstone rite of the Shadow tree, seeding eyes of shadow across the world: the map is revealed at once.", effects: { vision: 3 }, rite: true },
    ],
  ]);
  //#endregion

})(window.AOW = window.AOW || {});
