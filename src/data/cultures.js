// src/data/cultures.js — the 11 playable cultures (SPEC §3 `cultures`)
//
// Schema (SPEC §3 + additive fields, documented here per Ground Rule 0):
//   { id, name, desc, affinity:{order:1,...}|{} (Architects have none fixed),
//     traits:[{id, name, desc, effects:{...§3.1}, ability:null|abilityId}],  // culture passives; `id` lets
//       Rules.js hook bespoke combat logic (e.g. matching a canonical ability) beyond the flat `effects`
//     units:[unitId,...]  // roster ids '<culture>_<unit_snake_name>', defined by src/data/units_cultures.js
//                          // (NOT YET WRITTEN — Data.validate() reporting these as missing is expected)
//     buildings:[buildingId,...]  // this culture's unique building(s), defined in src/data/buildings.js
//     palette:{primary, secondary, accent, roof, wall}, architecture, bannerShape,
//     subChoices:[{id, name, desc, affinity:{}, effects:{...}}],  // authority/school/oath/kinship/company choice
//     startingTomes:[tomeId,...] }  // suggestions only, ids follow 'tome_<snake_name>'
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  const C = (id, ko, en, dko, den, o) => Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, affinity: {}, traits: [], units: [], buildings: [],
    palette: { primary: '#888888', secondary: '#666666', accent: '#c9a24a', roof: '#5a4a3a', wall: '#7a746c' },
    architecture: 'gothic', bannerShape: 'square', subChoices: [], startingTomes: [],
  }, o);
  const CT = (id, ko, en, dko, den, effects, extra) => Object.assign({ id, name: { ko, en }, desc: { ko: dko, en: den }, effects: effects || {} }, extra || {});
  const SC = (id, ko, en, dko, den, affinity, effects) => ({ id, name: { ko, en }, desc: { ko: dko, en: den }, affinity: affinity || {}, effects: effects || {} });

  const cultures = [
    // ================================================================ FEUDAL
    C('feudal', '봉건', 'Feudal', '기사와 성채, 깃발 아래 뭉친 중세 왕국. 군주에게 충성을 바치는 백성들이 나라를 지탱한다.',
      'A medieval kingdom of knights, castles and banners, sustained by subjects loyal to their Monarch.',
      {
        affinity: { order: 1, materium: 1 },
        traits: [
          CT('loyal_service', '충성스러운 봉사', 'Loyal Service', '군주나 왕도 근처에서 싸우는 유닛은 사기가 오르고 더 굳세게 버틴다.', 'Units fighting near the ruler or Throne City gain Morale and hold the line more firmly.',
            { morale: 5 }),
          CT('growing_realm', '번영하는 영지', 'Growing Realm', '농장과 장원이 잘 발달해 식량 생산이 늘어난다.', 'Well-tended farms and manors boost Food production.',
            { foodPct: 10 }),
        ],
        units: ['feudal_scout', 'feudal_peasant_pikeman', 'feudal_archer', 'feudal_defender', 'feudal_bannerman', 'feudal_aspirant_knight', 'feudal_longbow', 'feudal_liege_guard', 'feudal_knight'],
        buildings: ['retainers_estate'],
        palette: { primary: '#2a4a8a', secondary: '#8a1f1f', accent: '#c9a24a', roof: '#8a5a3a', wall: '#8a8478' },
        architecture: 'gothic', bannerShape: 'swallow',
        subChoices: [
          SC('monarchy', '군주정', 'Monarchy', '절대적인 군주 아래 백성이 하나로 뭉친다. 궁수는 견습생을 거쳐 장궁병으로 승급한다.', 'The people rally behind an absolute Monarch; Archers promote through Aspirant to Longbow.',
            { order: 1, materium: 1 }, { stability: 10 }),
          SC('aristocracy', '귀족정', 'Aristocracy', '유력 가문과 종속 영주들이 나라를 다스린다. 수비병은 견습생을 거쳐 근위병으로 승급한다.', 'Noble houses and vassal lords rule the realm; Defenders promote through Aspirant to Liege Guard.',
            { order: 1, chaos: 1 }, { diplomacyOpinion: 10 }),
        ],
        startingTomes: ['tome_faith', 'tome_warband'],
      }),

    // ================================================================ HIGH
    C('high', '고귀', 'High', '태양과 빛을 숭상하는 유서 깊은 문명. 백성들의 내면에는 잠든 빛이 깃들어 있다.',
      'An ancient sun-and-light-worshipping civilisation whose people carry a dormant inner light.',
      {
        affinity: { order: 2 },
        traits: [
          CT('awakening', '각성', 'Awakening', '고귀 유닛은 잠재 상태로 시작하며, 각성하면 공격에 영혼 피해가 더해지고 숨겨진 특성이 열린다.', 'High units start Dormant; once Awakened their attacks gain Spirit damage and a hidden trait unlocks.',
            { channelDmg_spirit: 2 }),
          CT('radiant_knowledge', '빛나는 지식', 'Radiant Knowledge', '지식을 숭상하는 문화로 지식 수입이 늘어난다.', 'A culture that reveres learning: extra Knowledge income.',
            { knowledgePct: 10 }),
        ],
        units: ['high_lightseeker', 'high_dawn_defender', 'high_sunray_archer', 'high_sun_priest', 'high_daylight_spear', 'high_awakener'],
        buildings: ['atrium_of_dawn'],
        palette: { primary: '#f4ecd8', secondary: '#e8c357', accent: '#7ab8f0', roof: '#e8c357', wall: '#f0e8d0' },
        architecture: 'elven', bannerShape: 'square',
        subChoices: [],
        startingTomes: ['tome_faith', 'tome_warding'],
      }),

    // ================================================================ BARBARIAN
    C('barbarian', '야만', 'Barbarian', '속도와 공격성을 앞세우는 부족 전사들. 모피와 문신, 토템이 전장을 물들인다.',
      'Tribal warriors who favor speed and aggression, marked by furs, war paint and totems.',
      {
        affinity: { chaos: 1, nature: 1 },
        traits: [
          CT('savage_strike', '야만의 일격', 'Savage Strike', '치명타를 터뜨리면 추가로 역병 피해를 입힌다.', 'A Critical Hit deals extra Blight damage.',
            { channelDmg_blight: 4 }),
          CT('war_frenzy', '전쟁의 광란', 'War Frenzy', '전쟁으로 살아가는 부족이라 징집력과 식량 수입이 늘어난다.', 'A tribe that lives for war: extra Draft and Food income.',
            { draft: 10, foodPct: 5 }),
        ],
        units: ['barbarian_pathfinder', 'barbarian_warrior', 'barbarian_sunderer', 'barbarian_fury', 'barbarian_war_shaman', 'barbarian_berserker'],
        buildings: ['totem_of_the_hunt'],
        palette: { primary: '#7a5030', secondary: '#a83a2a', accent: '#e8e0c8', roof: '#6a4a2a', wall: '#5a4530' },
        architecture: 'tribal', bannerShape: 'round',
        subChoices: [],
        startingTomes: ['tome_horde', 'tome_beasts'],
      }),

    // ================================================================ INDUSTRIOUS
    C('industrious', '근면', 'Industrious', '돌과 강철을 다루는 장인들의 문화. 방어와 생산에 뛰어나며 적이 먼저 다가오게 만든다.',
      'A culture of master builders in stone and steel, superb at defense and production, content to let the enemy come to them.',
      {
        affinity: { materium: 2 },
        traits: [
          CT('bolstering', '보강', 'Bolstering', '피해를 입으면 방어력이 한 단계 오르는 방어 강화를 얻는다 (턴당 한 번).', 'Taking damage grants a stack of Bolstered Defense, once per turn.',
            { def: 1 }),
          CT('prospecting', '탐광', 'Prospecting', '자원을 캐내는 데 능해 금과 생산력 수입이 늘어난다.', 'Skilled at prospecting the land: extra Gold and Production income.',
            { gold: 10, productionPct: 5 }),
        ],
        units: ['industrious_pioneer', 'industrious_anvil_guard', 'industrious_arbalest', 'industrious_halberdier', 'industrious_steelshaper', 'industrious_bastion'],
        buildings: ['bastions_barricade'],
        palette: { primary: '#6d7480', secondary: '#b47a3a', accent: '#ff8a2a', roof: '#5c5f66', wall: '#7a746c' },
        architecture: 'industrial', bannerShape: 'square',
        subChoices: [],
        startingTomes: ['tome_rock', 'tome_alchemy'],
      }),

    // ================================================================ MYSTIC
    C('mystic', '신비', 'Mystic', '마법 그 자체가 살아 숨 쉬는 문명. 떠다니는 수정과 나선형 탑에서 아스트랄의 힘을 연구한다.',
      'A civilisation where magic itself lives, studying the Astral Sea from floating crystals and spiralling towers.',
      {
        affinity: { astral: 2 },
        traits: [
          CT('star_blades', '별의 칼날', 'Star Blades', '전술 주문을 시전할 때마다 무기에 그 속성의 피해가 더해진다.', 'Casting a tactical spell adds that element\'s damage to weapons.',
            { channelDmg_lightning: 2 }),
          CT('mana_wellspring', '마나의 원천', 'Mana Wellspring', '마력이 흐르는 땅 위에 세워진 문명으로 마나 수입이 크게 늘어난다.', 'Built upon ley-rich land: greatly increased Mana income.',
            { manaPct: 15 }),
        ],
        units: ['mystic_projection', 'mystic_arcanist', 'mystic_warder', 'mystic_spellshield', 'mystic_soother', 'mystic_spellbreaker', 'mystic_summoner'],
        buildings: ['altar_of_the_allseers'],
        palette: { primary: '#2a3a7a', secondary: '#6a3a9a', accent: '#dfe3ea', roof: '#4a3a8a', wall: '#2a2a4a' },
        architecture: 'arcane', bannerShape: 'spear',
        subChoices: [
          SC('attunement', '조율 학파', 'School of Attunement', '아군의 주문 시전에 맞춰 무기에 원소의 힘이 실린다.', 'Weapons resonate with the element of every spell an ally casts.', {}, { dmgPct: 5 }),
          SC('potential', '잠재 학파', 'School of Potential', '실험적인 마법으로 적에게 불협화음을 쌓고, 과충전 주문으로 터뜨린다.', 'Experimental magic stacks Dissonance on foes, detonated by an Overcharged spell.', {}, { critChance: 5 }),
          SC('summoning', '소환 학파', 'School of Summoning', '마법 기원 유닛에 크게 의존하며 소환수를 더욱 강하게 만든다.', 'Leans on Magic-Origin units, making summoned creatures stronger still.', {}, { manaPct: 10 }),
        ],
        startingTomes: ['tome_evocation', 'tome_enchantment'],
      }),

    // ================================================================ DARK
    C('dark', '암흑', 'Dark', '잔혹함을 통치 수단으로 삼는 고딕풍 폭정. 서리와 그림자 마법, 감옥과 지하묘가 지배한다.',
      'A gothic tyranny that rules through cruelty, steeped in frost and shadow magic, prisons and crypts.',
      {
        affinity: { shadow: 2 },
        traits: [
          CT('cull_the_weak', '약자 도태', 'Cull the Weak', '기본 물리 공격이 높은 확률로 약화를 입히고, 약화된 적에게는 피해가 더 들어간다.', 'Base physical attacks have a high chance to inflict Weakened, and deal bonus damage to Weakened foes.',
            {}, { ability: 'cull_the_weak' }),
          CT('sinister_rule', '음험한 통치', 'Sinister Rule', '감옥과 지하묘에서 지식과 금을 거두어들인다.', 'Draws Knowledge and Gold from prisons and crypts.',
            { knowledge: 10, gold: 10 }),
        ],
        units: ['dark_outrider', 'dark_pursuer', 'dark_warrior', 'dark_warlock', 'dark_night_guard', 'dark_knight'],
        buildings: ['crypt_of_whispers'],
        palette: { primary: '#1a1a22', secondary: '#4a1f5a', accent: '#7ad8ff', roof: '#2a1a2a', wall: '#26202c' },
        architecture: 'dark', bannerShape: 'pennant',
        subChoices: [],
        startingTomes: ['tome_necromancy', 'tome_blood_rite'],
      }),

    // ================================================================ REAVER
    C('reaver', '약탈자', 'Reaver', '증기와 화약으로 무장한 정복자들. 용병과 노예, 전쟁으로 부를 쌓는 산업 제국.',
      'Conquistador-armed conquerors of steam and gunpowder, an industrial empire built on mercenaries, slaves and war.',
      {
        affinity: { materium: 1, chaos: 1 },
        traits: [
          CT('war_spoils', '전리품', 'War Spoils', '적을 처치할 때마다 등급에 비례한 전리품을 얻어 금과 징집력으로 바꾼다.', 'Killing an enemy grants spoils scaling with its tier, convertible into Gold and Draft.',
            { gold: 5, draft: 5 }),
          CT('marked_prey', '표적 사냥감', 'Marked Prey', '공격이 적에게 표식을 남겨 아군의 측면 공격이 더 아프게 들어간다.', 'Attacks Mark enemies, so allied flanking strikes hit harder.',
            { dmgPct: 5 }),
        ],
        units: ['reaver_observer', 'reaver_magelock', 'reaver_harrier', 'reaver_overseer', 'reaver_breacher', 'reaver_dragoon', 'reaver_magelock_cannon', 'reaver_sapper'],
        buildings: ['mercenary_hall'],
        palette: { primary: '#2a2320', secondary: '#8a3a2a', accent: '#b47a3a', roof: '#4a3a30', wall: '#3a332e' },
        architecture: 'reaver', bannerShape: 'pennant',
        subChoices: [
          SC('mercenary', '용병단', 'Mercenary Companies', '기본이 되는 레이버 방식으로 드라군을 모집할 수 있다.', 'The baseline Reaver approach; Dragoons are available.', {}, { recruitCostPct: -5 }),
          SC('federated', '연방', 'Federated', '드라군 대신 대체 3등급 유닛을 쓰며 마법총 대포 자원을 더 쉽게 얻는다.', 'Trades the Dragoon for an alternative Tier III unit and easier access to the Magelock Cannon\'s resource.', {}, { draft: 10 }),
        ],
        startingTomes: ['tome_alchemy', 'tome_horde'],
      }),

    // ================================================================ PRIMAL
    C('primal', '원시', 'Primal', '영수와 하나 된 자연의 부족들. 그림과 뼈, 깃털로 몸을 꾸미고 영수의 분노를 함께 나눈다.',
      'Nature-bound tribes united with a kin spirit animal, adorned in paint, bone and feathers, sharing in the beast\'s fury.',
      {
        affinity: { nature: 2 },
        traits: [
          CT('animal_kinship', '영수의 친족', 'Animal Kinship', '선택한 영수에 따라 선호 지형과 원소, 분노 효과가 정해진다 (하위 선택 참고).', 'The chosen kin animal sets a favored terrain, element and Fury effect (see sub-choices).',
            {}),
          CT('primal_bond', '원시의 유대', 'Primal Bond', '땅과 맺은 유대로 식량과 징집력이 늘어난다.', 'A bond with the land grants extra Food and Draft.',
            { foodPct: 5, draft: 5 }),
        ],
        units: ['primal_spirit_tracker', 'primal_protector', 'primal_darter', 'primal_charger', 'primal_animist', 'primal_ancestral_warden', 'primal_stormbringer',
          'primal_ash_sabertooth', 'primal_dune_serpent', 'primal_glacial_mammoth', 'primal_mire_crocodile', 'primal_storm_crow', 'primal_sylvan_wolf', 'primal_tunneling_spider'],
        buildings: ['spirit_lodge'],
        palette: { primary: '#5a7a3a', secondary: '#8a5a2a', accent: '#e8d8a0', roof: '#6a4a2a', wall: '#7a5a3a' },
        architecture: 'primal', bannerShape: 'round',
        subChoices: [
          SC('ash_sabertooth', '재벌 검치호', 'Ash Sabertooth', '재로 뒤덮인 황무지를 선호하며 공격이 화염으로 적을 불태운다.', 'Favors ashlands; attacks ignite enemies with Fire.', {}, { production: 3 }),
          SC('dune_serpent', '사구 대사', 'Dune Serpent', '사막을 누비며 독으로 물어뜯는 굴착 뱀.', 'A burrowing serpent of the desert that bites with venom.', {}, { gold: 3 }),
          SC('glacial_mammoth', '빙하 매머드', 'Glacial Mammoth', '북극 지대를 선호하며 적을 얼려 그 자리에 묶어둔다.', 'Favors the arctic; freezes enemies in place.', {}, { production: 3 }),
          SC('mire_crocodile', '늪지 악어', 'Mire Crocodile', '늪을 누비며 질병에 면역이고 공격으로 질병을 퍼뜨린다.', 'Roams the swamp, immune to disease and spreading it with every bite.', {}, { food: 3 }),
          SC('storm_crow', '폭풍 까마귀', 'Storm Crow', '높은 지대를 선호하는 날개 달린 까마귀로 번개를 내리친다.', 'A winged crow favoring high ground that calls down lightning.', {}, { mana: 3 }),
          SC('sylvan_wolf', '숲의 늑대', 'Sylvan Wolf', '숲을 선호하며 무리 전술과 출혈로 사냥한다.', 'Favors the forest, hunting with pack tactics and Bleeding.', {}, { draft: 3 }),
          SC('tunneling_spider', '굴착 거미', 'Tunneling Spider', '버섯 숲 지하를 선호하며 거미줄과 독으로 사냥감을 묶는다.', 'Favors mushroom-forest depths, binding prey with web and venom.', {}, { knowledge: 2 }),
        ],
        startingTomes: ['tome_beasts', 'tome_roots'],
      }),

    // ================================================================ OATHSWORN
    C('oathsworn', '서약자', 'Oathsworn', '동양의 신화와 무대를 본뜬 무예의 사회. 무사와 승려, 옻칠한 갑옷과 깃발이 맹세 아래 하나가 된다.',
      'A martial society drawn from Eastern myth and theatre, uniting warrior-monks in lacquered armour and banners under a sworn Oath.',
      {
        affinity: { order: 1 },
        traits: [
          CT('the_oath', '맹세', 'The Oath', '맹세에 따라 행동하면 맹세 단계가 올라 안정도와 전투력이 강해지고, 어기면 맹세 파기자가 되어 불이익을 받는다.', 'Acting by the Oath raises its level, strengthening Stability and combat power; breaking it brings the penalties of an Oathbreaker.',
            { stability: 5 }),
          CT('discipline', '수양', 'Discipline', '엄격한 수련 문화로 안정도가 늘어난다.', 'A culture of strict discipline: extra Stability.',
            { stability: 10 }),
        ],
        units: ['oathsworn_wayfarer', 'oathsworn_sworn_guard', 'oathsworn_honor_blade', 'oathsworn_vowkeeper', 'oathsworn_oath_caster', 'oathsworn_avenger', 'oathsworn_warbound', 'oathsworn_peacebringer'],
        buildings: ['monastery_of_the_oath'],
        palette: { primary: '#a8302a', secondary: '#f0e8d0', accent: '#e8c357', roof: '#2a5a3a', wall: '#8a1f1f' },
        architecture: 'oathsworn', bannerShape: 'pennant',
        subChoices: [
          SC('righteousness', '정의의 맹세', 'Oath of Righteousness', '악을 처단하고 선한 성향을 쌓으며, 악한 세력에게 우위를 갖는다.', 'Vanquishes evil and gathers Good alignment, gaining the upper hand over evil factions.', { order: 1 }, { diplomacyOpinion: 10 }),
          SC('strife', '투쟁의 맹세', 'Oath of Strife', '강하고 가치 있는 적과의 전쟁을 추구하며 그 보상을 누린다.', 'Wages war on the strong and worthy, and is rewarded for it.', { chaos: 1 }, { dmgPct: 10 }),
          SC('harmony', '화합의 맹세', 'Oath of Harmony', '가능한 한 전쟁을 피하며 다문화 종속국과 동맹으로 제국을 이룬다.', 'Avoids war where possible, building an empire of vassals and alliances.', { nature: 1 }, { stability: 10 }),
        ],
        startingTomes: ['tome_discipline', 'tome_faith'],
      }),

    // ================================================================ ARCHITECT
    C('architect', '건축가', 'Architect', '그리스·로마풍의 기념비 건축가들. 대리석과 청동으로 문자 그대로 자신들의 힘을 쌓아 올린다.',
      'Greco-Roman monument builders in marble and bronze, literally building their power one structure at a time.',
      {
        affinity: {},
        traits: [
          CT('affinity_incarnate', '친화의 화신', 'Affinity Incarnate', '제국의 주도 친화 중첩당 피해가 늘고, 공격 속성과 외형이 그 친화를 따른다.', 'Gains damage per stack of the empire\'s dominant affinity; attack element and visuals follow it.',
            {}, { ability: 'affinity_incarnate' }),
          CT('monuments', '기념비', 'Monuments', '친화에 헌정된 거대한 기념비를 세워 임페리움과 생산력을 늘린다.', 'Raises vast Monuments dedicated to an affinity, boosting Imperium and Production.',
            { imperium: 5, productionPct: 5 }),
        ],
        units: ['architect_surveyor', 'architect_cultivator', 'architect_earthbreaker', 'architect_guardian', 'architect_shademaker', 'architect_architect'],
        buildings: ['wonderstone_forum'],
        palette: { primary: '#f0ece0', secondary: '#b47a3a', accent: '#5a7ff0', roof: '#d9c9a0', wall: '#e8e0d0' },
        architecture: 'classical', bannerShape: 'square',
        subChoices: [],
        startingTomes: ['tome_evocation', 'tome_rock'],
      }),

    // ================================================================ NOMAD
    C('nomad', '유목민', 'Nomad', '시든 세계에서 살아남은 사막의 대상들. 짐을 꾸린 도시가 바람을 따라 자리를 옮긴다.',
      'Desert caravaneers who survived the Withered Worlds, their packed-up cities moving with the wind.',
      {
        affinity: { chaos: 1, materium: 1 },
        traits: [
          CT('mobile_cities', '이동 도시', 'Mobile Cities', '유목민 도시는 짐을 꾸려 유닛처럼 이동한 뒤 다른 곳에 다시 세울 수 있다.', 'A Nomad city can pack up, travel as a unit, and unpack elsewhere.',
            { armyMove: 2 }),
          CT('essence_harvesting', '정수 수확', 'Essence Harvesting', '땅에서 정수를 짜내 자리를 옮기기 전 금과 생산력을 거두어들인다.', 'Drains the land of essence for Gold and Production before moving on.',
            { gold: 5, production: 5 }),
        ],
        units: ['nomad_dunerider', 'nomad_wind_warrior', 'nomad_raider', 'nomad_looter', 'nomad_strider', 'nomad_dustweaver', 'nomad_warbringer', 'nomad_champion', 'nomad_warlord'],
        buildings: ['caravan_bazaar'],
        palette: { primary: '#d8b878', secondary: '#b45a3a', accent: '#3ab8b0', roof: '#c9a878', wall: '#b89860' },
        architecture: 'nomad', bannerShape: 'pennant',
        subChoices: [
          SC('conquerors', '정복자', 'Conquerors', '빠르고 공격적인 습격으로 적의 영토를 빼앗으며 거의 끊이지 않는 기세를 유지한다.', 'Fast, aggressive raids seize enemy territory, sustaining a near-permanent Momentum.', { chaos: 1 }, { armyMove: 2 }),
          SC('scavengers', '약탈꾼', 'Scavengers', '고대의 경이와 전장의 전리품을 거두어 아군에게 나누어 준다.', 'Harvests ancient wonders and battlefield loot, passing it to allies.', { materium: 1 }, { gold: 5 }),
        ],
        startingTomes: ['tome_warband', 'tome_alchemy'],
      }),
  ];

  for (const c of cultures) Data.define('cultures', c);
})(window.AOW = window.AOW || {});
