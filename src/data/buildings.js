// src/data/buildings.js — city structures (SPEC §3 `buildings`)
//
// Schema (SPEC §3 + additive fields, documented here per Ground Rule 0):
//   { id, name, desc, tier:0..5 (city tier required to build), cost:{production}, upkeep:{gold},
//     prereq:[buildingId,...], culture:null|cultureId, category:'economy'|'military'|'defense'|'stability'|'growth'|'special'|'culture',
//     effects:{...§3.1 vocabulary, plus the additive keys below}, needsCoast:true|false }
// Additive effect keys (beyond §3.1, small and self-documenting — Rules.cityYields/Rules reads them):
//   walls: 1|2|3   fortification tier granted (palisade/stone/fortified); stacks with `wallHp` (flat HP added
//                  to the city's fortification pool) and `cityDefense` (already in §3.1, flat city Defense bonus in sieges).
//   needsCoast: true — the province/city must touch Coast/Ocean/Lake to build this (checked by Rules, ignored elsewhere).
// `category` is a plain UI/browse tag (this file's replacement for a separate 'building_categories' names list).
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  const B = (id, ko, en, dko, den, o) => Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, tier: 1, cost: { production: 70 }, upkeep: { gold: 0 },
    prereq: [], culture: null, category: 'economy', effects: {},
  }, o);

  const buildings = [
    // ================================================================ ECONOMY — food chain
    B('granary', '곡창', 'Granary', '수확한 곡식을 저장해 식량 수입을 늘립니다.', 'Stores the harvest to boost Food income.',
      { tier: 1, cost: { production: 70 }, effects: { food: 10 } }),
    B('storehouse', '대저장고', 'Storehouse', '더 큰 창고를 지어 식량 저장량과 수입을 늘립니다.', 'A larger warehouse further increases Food income.',
      { tier: 2, cost: { production: 140 }, upkeep: { gold: 1 }, prereq: ['granary'], effects: { food: 18 } }),
    B('grand_granary', '대곡창', 'Grand Granary', '제국 전역에서 곡식을 모아들이는 거대한 곡창으로, 식량과 인구 성장률을 함께 늘립니다.', 'A vast granary drawing in grain from across the domain: more Food and faster population growth.',
      { tier: 3, cost: { production: 240 }, upkeep: { gold: 2 }, prereq: ['storehouse'], effects: { food: 28, growthPct: 5 } }),
    // ---- production chain
    B('workshop', '공방', 'Workshop', '목수와 장인들이 일하는 공방으로 생산력을 늘립니다.', 'Carpenters and artisans at work here boost Production.',
      { tier: 1, cost: { production: 70 }, effects: { production: 10 } }),
    B('foundry', '주조소', 'Foundry', '금속을 다루는 주조소를 세워 생산력을 더욱 늘립니다.', 'A metal-working foundry further increases Production.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, prereq: ['workshop'], effects: { production: 18 } }),
    B('forge_complex', '대장간 단지', 'Forge Complex', '여러 대장간을 한데 모은 단지로 생산력과 징집력을 함께 늘립니다.', 'A complex of forges under one roof: more Production and Draft.',
      { tier: 3, cost: { production: 250 }, upkeep: { gold: 2 }, prereq: ['foundry'], effects: { production: 28, draft: 10 } }),
    // ---- gold chain
    B('market', '시장', 'Market', '상인들이 모여드는 시장으로 금 수입을 늘립니다.', 'A bustling market of merchants boosts Gold income.',
      { tier: 1, cost: { production: 80 }, effects: { gold: 15 } }),
    B('bank', '은행', 'Bank', '금화를 맡아 굴리는 은행을 세워 금 수입을 더욱 늘립니다.', 'A bank that lends and invests coin further increases Gold income.',
      { tier: 2, cost: { production: 160 }, upkeep: { gold: 1 }, prereq: ['market'], effects: { gold: 25 } }),
    B('mint', '조폐소', 'Mint', '직접 금화를 주조하는 조폐소로 금 수입이 크게 늘어납니다.', 'A mint striking its own coin greatly increases Gold income.',
      { tier: 3, cost: { production: 260 }, upkeep: { gold: 2 }, prereq: ['bank'], effects: { gold: 35 } }),
    // ---- mana / faith chain
    B('shrine', '성소', 'Shrine', '작은 성소를 세워 마나 수입을 늘립니다.', 'A modest shrine channels a trickle of Mana.',
      { tier: 1, cost: { production: 70 }, effects: { mana: 10 } }),
    B('temple', '신전', 'Temple', '신전을 세워 마나 수입을 늘리고 백성의 마음을 달랩니다.', 'A temple increases Mana income and soothes the people.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, prereq: ['shrine'], effects: { mana: 20, stability: 10 } }),
    B('sanctum', '성역', 'Sanctum', '신성한 힘이 응집된 성역으로 마나 수입이 크게 늘어납니다.', 'A hallowed sanctum where sacred power pools, greatly increasing Mana.',
      { tier: 3, cost: { production: 260 }, upkeep: { gold: 2 }, prereq: ['temple'], effects: { mana: 35 } }),
    // ---- knowledge chain
    B('library', '도서관', 'Library', '책과 두루마리를 모아둔 도서관으로 지식 수입을 늘립니다.', 'A library of books and scrolls boosts Knowledge income.',
      { tier: 1, cost: { production: 70 }, effects: { knowledge: 10 } }),
    B('academy', '학당', 'Academy', '학자들이 연구하는 학당으로 지식 수입을 더욱 늘립니다.', 'Scholars at an academy further increase Knowledge income.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, prereq: ['library'], effects: { knowledge: 20 } }),
    B('university', '대학', 'University', '여러 학당을 아우르는 대학으로 지식 수입이 크게 늘어납니다.', 'A university uniting many academies greatly increases Knowledge.',
      { tier: 3, cost: { production: 260 }, upkeep: { gold: 2 }, prereq: ['academy'], effects: { knowledge: 32 } }),
    B('observatory', '천문대', 'Observatory', '별과 아스트랄 조류를 관측하는 천문대로 지식과 시야를 함께 늘립니다.', 'An observatory tracking stars and astral tides grants Knowledge and Vision.',
      { tier: 4, cost: { production: 400 }, upkeep: { gold: 3 }, prereq: ['university'], effects: { knowledge: 45, vision: 2 } }),

    // ================================================================ MILITARY / DRAFT
    B('militia_post', '민병대 초소', 'Militia Post', '민병을 훈련시키는 초소로 징집력을 늘립니다.', 'A post where militia drill, boosting Draft.',
      { tier: 1, cost: { production: 60 }, category: 'military', effects: { draft: 10 } }),
    B('barracks_1', '병영', 'Barracks', '정규병을 훈련시키는 병영으로 2등급 유닛의 모집을 허가합니다.', 'A barracks training regular troops, unlocking Tier II recruitment.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, prereq: ['militia_post'], category: 'military', effects: { draft: 15, unitTier: 2 } }),
    B('barracks_2', '정예 병영', 'Grand Barracks', '정예병을 길러내는 대병영으로 3등급 유닛의 모집을 허가합니다.', 'A grand barracks raising veteran troops, unlocking Tier III recruitment.',
      { tier: 3, cost: { production: 260 }, upkeep: { gold: 2 }, prereq: ['barracks_1'], category: 'military', effects: { draft: 20, unitTier: 3 } }),
    B('war_academy', '전쟁 학교', 'War Academy', '전술과 지휘를 가르치는 전쟁 학교로 4등급 유닛의 모집을 허가합니다.', 'A war academy teaching tactics and command, unlocking Tier IV recruitment.',
      { tier: 4, cost: { production: 420 }, upkeep: { gold: 3 }, prereq: ['barracks_2'], category: 'military', effects: { draft: 30, unitTier: 4 } }),
    B('grand_hall', '대전당', 'Grand Hall', '제국 최고의 전사들이 모이는 대전당으로 5등급 유닛의 모집을 허가합니다.', 'A grand hall where the empire\'s finest gather, unlocking Tier V recruitment.',
      { tier: 5, cost: { production: 600 }, upkeep: { gold: 5 }, prereq: ['war_academy'], category: 'military', effects: { draft: 40, unitTier: 5 } }),

    // ================================================================ WALLS / DEFENSE
    B('palisade', '목책', 'Palisade', '뾰족한 통나무로 두른 목책으로 도시를 지킵니다.', 'A wall of sharpened logs defends the city.',
      { tier: 1, cost: { production: 60 }, category: 'defense', effects: { walls: 1, wallHp: 20 } }),
    B('stone_walls', '석벽', 'Stone Walls', '돌로 쌓은 성벽으로 방어력이 크게 늘어납니다.', 'Walls of stone provide much stronger defense.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, prereq: ['palisade'], category: 'defense', effects: { walls: 2, wallHp: 35 } }),
    B('fortified_walls', '요새화 성벽', 'Fortified Walls', '탑과 흉벽을 갖춘 요새화 성벽으로 방어력이 최고조에 이릅니다.', 'Towered, crenellated walls bring fortification to its peak.',
      { tier: 3, cost: { production: 260 }, upkeep: { gold: 2 }, prereq: ['stone_walls'], category: 'defense', effects: { walls: 3, wallHp: 55, cityDefense: 2 } }),

    // ================================================================ STABILITY
    B('tavern', '주점', 'Tavern', '술과 이야기가 오가는 주점으로 안정도를 늘립니다.', 'A tavern of drink and gossip raises Stability.',
      { tier: 1, cost: { production: 80 }, category: 'stability', effects: { stability: 15 } }),
    B('theater', '극장', 'Theater', '연극과 공연이 열리는 극장으로 백성의 사기를 북돋아 안정도를 늘립니다.', 'A theater of plays and performances further raises Stability.',
      { tier: 2, cost: { production: 160 }, upkeep: { gold: 1 }, prereq: ['tavern'], category: 'stability', effects: { stability: 20 } }),
    B('courthouse', '재판소', 'Courthouse', '공정한 재판이 열리는 재판소로 안정도와 외교 평판이 오릅니다.', 'A courthouse of fair judgment raises Stability and diplomatic standing.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, category: 'stability', effects: { stability: 15, diplomacyOpinion: 5 } }),
    B('gardens', '정원', 'Gardens', '아름답게 가꾼 정원으로 백성이 안락함과 활력을 느낍니다.', 'Beautifully tended gardens give the people comfort and vigor.',
      { tier: 3, cost: { production: 240 }, upkeep: { gold: 1 }, prereq: ['theater'], category: 'stability', effects: { stability: 20, growthPct: 5 } }),

    // ================================================================ GROWTH
    B('aqueduct', '수도교', 'Aqueduct', '맑은 물을 끌어오는 수도교로 인구 성장과 식량을 늘립니다.', 'An aqueduct bringing clean water speeds growth and boosts Food.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, category: 'growth', effects: { growthPct: 10, food: 5 } }),
    B('sewers', '하수도', 'Sewers', '위생을 개선하는 하수도로 인구 성장과 안정도가 함께 늘어납니다.', 'Sewers improving sanitation further speed growth and raise Stability.',
      { tier: 3, cost: { production: 240 }, upkeep: { gold: 1 }, prereq: ['aqueduct'], category: 'growth', effects: { growthPct: 15, stability: 5 } }),

    // ================================================================ SPECIAL
    B('harbor', '항구', 'Harbor', '바다에 면한 항구로 교역과 어업이 번성합니다.', 'A harbor open to the sea where trade and fishing flourish.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, category: 'special', needsCoast: true, effects: { gold: 15, food: 10 } }),
    B('siege_workshop', '공성 공방', 'Siege Workshop', '공성 무기를 제작하는 공방으로 생산력이 늘고 공성 유닛을 지원합니다.', 'A workshop building siege engines: extra Production and support for siege units.',
      { tier: 3, cost: { production: 220 }, upkeep: { gold: 2 }, prereq: ['workshop'], category: 'special', effects: { production: 10 } }),
    B('healer_house', '치유의 집', 'Healer\'s House', '부상병을 돌보는 치유의 집으로 주둔 유닛의 회복이 빨라집니다.', 'A house of healers speeds recovery for units garrisoned here.',
      { tier: 2, cost: { production: 140 }, upkeep: { gold: 1 }, category: 'special', effects: { healPerTurn: 8 } }),
    B('mage_tower', '마법사의 탑', 'Mage Tower', '마법사들이 연구하고 수련하는 탑으로 마나 수입과 시전 점수를 늘립니다.', 'A tower where mages study and train, boosting Mana income and casting points.',
      { tier: 3, cost: { production: 250 }, upkeep: { gold: 2 }, prereq: ['shrine'], category: 'special', effects: { mana: 20, casting: 5 } }),
    B('wonder_scholarium', '경이의 학당', 'Wonder Scholarium', '고대의 경이를 연구하는 학당으로 지식과 시야를 크게 늘립니다.', 'A scholarium devoted to studying ancient wonders greatly boosts Knowledge and Vision.',
      { tier: 4, cost: { production: 400 }, upkeep: { gold: 3 }, prereq: ['university'], category: 'special', effects: { knowledge: 30, vision: 3 } }),

    // ================================================================ CULTURE UNIQUES (1 per culture)
    B('retainers_estate', '가신의 저택', 'Retainer\'s Estate', '왕실을 섬기는 가신들의 저택으로, 왕도와 국경을 맞대면 식량·금·안정도가 늘어납니다.', 'A house of retainers loyal to the crown: extra Food, Gold and Stability while bordering the Throne City.',
      { tier: 3, cost: { production: 240 }, upkeep: { gold: 1 }, prereq: ['granary'], culture: 'feudal', category: 'culture', effects: { food: 20, gold: 10, stability: 10 } }),
    B('atrium_of_dawn', '여명의 회당', 'Atrium of Dawn', '태양빛이 스며드는 회당으로, 잠든 빛을 깨우며 지식과 마나, 안정도를 늘립니다.', 'A sunlit atrium that stirs dormant light, boosting Knowledge, Mana and Stability.',
      { tier: 3, cost: { production: 250 }, upkeep: { gold: 1 }, prereq: ['library'], culture: 'high', category: 'culture', effects: { knowledge: 20, mana: 10, stability: 10 } }),
    B('totem_of_the_hunt', '사냥의 토템', 'Totem of the Hunt', '부족의 사냥운을 비는 토템으로 징집력과 식량을 늘립니다.', 'A totem invoking the tribe\'s hunting luck: extra Draft and Food.',
      { tier: 2, cost: { production: 140 }, upkeep: { gold: 1 }, prereq: ['militia_post'], culture: 'barbarian', category: 'culture', effects: { draft: 15, food: 10 } }),
    B('bastions_barricade', '보루의 방벽', 'Bastion\'s Barricade', '숙련된 방패병들이 상주하는 방벽으로 성벽 내구도와 안정도가 늘어납니다.', 'A barricade garrisoned by veteran shield-bearers: extra fortification HP and Stability.',
      { tier: 3, cost: { production: 260 }, upkeep: { gold: 2 }, prereq: ['stone_walls'], culture: 'industrious', category: 'culture', effects: { wallHp: 20, stability: 10 } }),
    B('altar_of_the_allseers', '천리안의 제단', 'Altar of the All-Seers', '아스트랄 조류를 읽는 제단으로 마나와 지식 수입이 크게 늘어납니다.', 'An altar reading the astral tides greatly boosts Mana and Knowledge.',
      { tier: 3, cost: { production: 250 }, upkeep: { gold: 2 }, prereq: ['shrine'], culture: 'mystic', category: 'culture', effects: { mana: 25, knowledge: 10 } }),
    B('crypt_of_whispers', '속삭임의 지하묘', 'Crypt of Whispers', '죄수와 유골을 가둔 지하묘로 지식과 금을 얻지만 안정도가 낮아집니다.', 'A crypt of prisoners and bones yielding Knowledge and Gold at the cost of Stability.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, culture: 'dark', category: 'culture', effects: { knowledge: 20, gold: 15, stability: -5 } }),
    B('mercenary_hall', '용병 회관', 'Mercenary Hall', '전 세계에서 모여든 용병들의 회관으로 징집력이 늘고 모집 비용이 줄어듭니다.', 'A hall of mercenaries drawn from across the world: extra Draft and cheaper recruitment.',
      { tier: 2, cost: { production: 150 }, upkeep: { gold: 1 }, prereq: ['militia_post'], culture: 'reaver', category: 'culture', effects: { draft: 15, gold: 10, recruitCostPct: -10 } }),
    B('spirit_lodge', '영혼의 오두막', 'Spirit Lodge', '영수의 영혼을 모시는 오두막으로 징집력과 마나가 늘어납니다.', 'A lodge honoring the kin spirit: extra Draft and Mana.',
      { tier: 2, cost: { production: 140 }, upkeep: { gold: 1 }, culture: 'primal', category: 'culture', effects: { draft: 15, mana: 10 } }),
    B('monastery_of_the_oath', '맹세의 수도원', 'Monastery of the Oath', '맹세를 되새기는 수도원으로 안정도와 지식이 함께 늘어납니다.', 'A monastery for renewing one\'s oath: extra Stability and Knowledge.',
      { tier: 3, cost: { production: 230 }, upkeep: { gold: 1 }, prereq: ['tavern'], culture: 'oathsworn', category: 'culture', effects: { stability: 20, knowledge: 10 } }),
    B('wonderstone_forum', '원더스톤 광장', 'Wonderstone Forum', '원더스톤으로 세운 광장으로 생산력과 금이 늘고 지방 개발 비용이 줄어듭니다.', 'A forum raised in Wonderstone: extra Production and Gold, and cheaper province development.',
      { tier: 3, cost: { production: 250 }, upkeep: { gold: 2 }, prereq: ['workshop'], culture: 'architect', category: 'culture', effects: { production: 20, gold: 10, provinceCostPct: -10 } }),
    B('caravan_bazaar', '대상의 시장', 'Caravan Bazaar', '떠도는 대상들이 모이는 시장으로 금과 식량이 늘고 행군이 빨라집니다.', 'A bazaar where wandering caravans gather: extra Gold and Food, and faster marching.',
      { tier: 2, cost: { production: 140 }, upkeep: { gold: 1 }, culture: 'nomad', category: 'culture', effects: { gold: 15, food: 10, armyMove: 2 } }),
  ];

  for (const b of buildings) Data.define('buildings', b);
})(window.AOW = window.AOW || {});
