// src/data/improvements.js — province improvements (SPEC §3 `improvements`)
//
// Schema (SPEC §3 + additive fields, documented here per Ground Rule 0):
//   { id, name, desc, kind:'farm'|'forester'|'quarry'|'mine'|'research_post'|'conduit'|'fishery'|'special',
//     terrain:[terrainIds]|null (null = any land terrain), feature:[featureIds]|null,
//     cost:{gold, imperium}, yields:{food,production,gold,mana,knowledge,draft},
//     adjacencyBonus:{sameKind:+n}, tome:null|tomeId, unique:true|false,
//     resource:null|'gold'|'mana'|'food'|'production'|'knowledge'|'draft' (additive — matches
//       State.provinces[].resource; this improvement is the upgraded structure built on that resource node),
//     material:null|materialId (additive — matches State.provinces[].magicMaterial; only buildable on a
//       province holding that magic material), globalEffects:null|{...§3.1 vocabulary} (additive — a
//       small empire-wide passive bonus granted while at least one is owned, on top of its local `yields`) }
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  const I = (id, ko, en, dko, den, o) => Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, kind: 'special', terrain: null, feature: null,
    cost: { gold: 60, imperium: 0 }, yields: {}, adjacencyBonus: {}, tome: null, unique: false,
    resource: null, material: null, globalEffects: null,
  }, o);

  const improvements = [
    // ================================================================ BASE IMPROVEMENTS
    I('farm', '농장', 'Farm', '비옥한 초원을 갈아 식량을 생산합니다.', 'Tills fertile grassland for Food.',
      { kind: 'farm', terrain: ['grass'], feature: [null], cost: { gold: 60, imperium: 0 }, yields: { food: 10 }, adjacencyBonus: { sameKind: 2 } }),
    I('forester', '벌목장', 'Forester', '숲에서 목재와 사냥감을 함께 거둡니다.', 'Harvests timber and game from the forest.',
      { kind: 'forester', terrain: ['forest'], feature: ['forest', 'dense_forest'], cost: { gold: 60, imperium: 0 }, yields: { food: 2, production: 6 }, adjacencyBonus: { sameKind: 2 } }),
    I('quarry', '채석장', 'Quarry', '구릉과 산에서 돌을 캐내 생산력을 늘립니다.', 'Quarries stone from hills and mountains for Production.',
      { kind: 'quarry', terrain: ['hills', 'mountain'], feature: ['hills', 'mountain'], cost: { gold: 60, imperium: 0 }, yields: { production: 8 }, adjacencyBonus: { sameKind: 2 } }),
    I('mine', '광산', 'Mine', '땅속 광맥을 캐내 금을 얻습니다.', 'Digs into mineral veins for Gold.',
      { kind: 'mine', terrain: ['hills', 'mountain', 'desert'], feature: null, cost: { gold: 80, imperium: 0 }, yields: { gold: 8 }, adjacencyBonus: { sameKind: 2 } }),
    I('research_post', '연구소', 'Research Post', '고대의 흔적이나 마력의 흐름을 연구해 지식을 얻습니다.', 'Studies ancient traces or currents of magic for Knowledge.',
      { kind: 'research_post', terrain: ['grass', 'forest', 'hills', 'mountain', 'desert', 'snow', 'swamp', 'volcanic'], feature: ['ruins'], cost: { gold: 70, imperium: 0 }, yields: { knowledge: 10 }, adjacencyBonus: { sameKind: 2 } }),
    I('conduit', '마력 도관', 'Conduit', '흐르는 마력을 끌어모아 마나를 생산합니다.', 'Draws in ambient magic to produce Mana.',
      { kind: 'conduit', terrain: ['grass', 'forest', 'hills', 'mountain', 'desert', 'snow', 'swamp', 'volcanic'], feature: ['crystal'], cost: { gold: 70, imperium: 0 }, yields: { mana: 10 }, adjacencyBonus: { sameKind: 2 } }),
    I('fishery', '어장', 'Fishery', '연안과 호수에 그물을 놓아 식량을 얻습니다.', 'Nets set along coast and lake shores yield Food.',
      { kind: 'fishery', terrain: ['coast', 'lake', 'ocean'], feature: null, cost: { gold: 60, imperium: 0 }, yields: { food: 8 }, adjacencyBonus: { sameKind: 2 } }),
    I('hunters_lodge', '사냥꾼의 오두막', 'Hunter\'s Lodge', '노련한 사냥꾼들이 식량과 병력을 함께 대줍니다.', 'Seasoned hunters supply both Food and Draft.',
      { kind: 'special', terrain: ['forest', 'hills', 'snow'], feature: ['forest', 'dense_forest'], cost: { gold: 60, imperium: 0 }, yields: { food: 6, draft: 4 } }),
    I('vineyard', '포도원', 'Vineyard', '포도와 과실을 길러 술을 빚어 팔아 금을 얻습니다.', 'Grows grapes and fruit for wine sold at a tidy profit.',
      { kind: 'special', terrain: ['grass', 'hills', 'desert'], feature: null, cost: { gold: 70, imperium: 0 }, yields: { gold: 6, food: 2 } }),

    // ================================================================ RESOURCE-NODE IMPROVEMENTS
    I('gold_mine', '금맥 광산', 'Gold Mine', '금맥이 흐르는 지방에 세워 금 수입을 크게 늘립니다.', 'Built over a vein of Gold, greatly boosting income.',
      { kind: 'mine', terrain: null, feature: null, resource: 'gold', cost: { gold: 100, imperium: 20 }, yields: { gold: 20 }, adjacencyBonus: { sameKind: 3 } }),
    I('mana_spring', '마나천', 'Mana Spring', '마나가 샘솟는 지방에 세워 마나 수입을 크게 늘립니다.', 'Built over a spring of Mana, greatly boosting income.',
      { kind: 'conduit', terrain: null, feature: null, resource: 'mana', cost: { gold: 100, imperium: 20 }, yields: { mana: 20 }, adjacencyBonus: { sameKind: 3 } }),
    I('granary_estate', '곡물 장원', 'Granary Estate', '식량이 넘쳐나는 지방에 세워 식량 수입을 크게 늘립니다.', 'Built over an abundant Food node, greatly boosting income.',
      { kind: 'farm', terrain: null, feature: null, resource: 'food', cost: { gold: 100, imperium: 20 }, yields: { food: 20 }, adjacencyBonus: { sameKind: 3 } }),
    I('lumber_mill', '제재소', 'Lumber Mill', '생산 자원이 풍부한 지방에 세워 생산력과 식량을 함께 늘립니다.', 'Built over a rich Production node, boosting Production and Food together.',
      { kind: 'forester', terrain: null, feature: null, resource: 'production', cost: { gold: 100, imperium: 20 }, yields: { production: 16, food: 4 }, adjacencyBonus: { sameKind: 3 } }),
    I('scholar_post', '학사원', 'Scholar\'s Post', '지식의 원천이 있는 지방에 세워 지식 수입을 크게 늘립니다.', 'Built over a wellspring of Knowledge, greatly boosting income.',
      { kind: 'research_post', terrain: null, feature: null, resource: 'knowledge', cost: { gold: 100, imperium: 20 }, yields: { knowledge: 20 }, adjacencyBonus: { sameKind: 3 } }),
    I('mustering_grounds', '소집장', 'Mustering Grounds', '병력 소집에 유리한 지방에 세워 징집력을 크게 늘립니다.', 'Built over a Draft-rich node, greatly boosting recruitment.',
      { kind: 'special', terrain: null, feature: null, resource: 'draft', cost: { gold: 100, imperium: 20 }, yields: { draft: 20 }, adjacencyBonus: { sameKind: 3 } }),

    // ================================================================ MAGIC MATERIAL EXTRACTION
    I('mithril_works', '미스릴 채광소', 'Mithril Works', '가볍고 단단한 미스릴을 캐내 장비를 가볍게 만들어 제국 전역의 유지비를 줄입니다.', 'Extracts light, strong Mithril, lightening gear and lowering upkeep empire-wide.',
      { kind: 'special', terrain: null, feature: null, material: 'mithril', cost: { gold: 120, imperium: 30 }, yields: { gold: 8, production: 4 }, unique: true, globalEffects: { upkeepPct: -10 } }),
    I('crystal_conclave', '수정 회당', 'Crystal Conclave', '마력이 응결된 수정을 캐내 제국 전역의 마나 수입을 늘립니다.', 'Extracts mana-charged Crystal, boosting Mana income empire-wide.',
      { kind: 'special', terrain: null, feature: null, material: 'crystal', cost: { gold: 120, imperium: 30 }, yields: { mana: 10 }, unique: true, globalEffects: { manaPct: 10 } }),
    I('sunstone_terrace', '태양석 테라스', 'Sunstone Terrace', '따스한 빛을 머금은 태양석을 캐내 제국 전역의 회복력을 높입니다.', 'Extracts warm, radiant Sunstone, raising empire-wide recovery.',
      { kind: 'special', terrain: null, feature: null, material: 'sunstone', cost: { gold: 120, imperium: 30 }, yields: { gold: 6, mana: 4 }, unique: true, globalEffects: { healPerTurn: 3 } }),
    I('nightshade_garden', '나이트셰이드 정원', 'Nightshade Garden', '맹독을 지닌 나이트셰이드를 재배해 제국 전역의 유닛 공격에 독기를 더합니다.', 'Cultivates venomous Nightshade, lacing every unit\'s attacks with extra Blight.',
      { kind: 'special', terrain: null, feature: null, material: 'nightshade', cost: { gold: 120, imperium: 30 }, yields: { gold: 4, knowledge: 4 }, unique: true, globalEffects: { channelDmg_blight: 2 } }),
    I('dragon_bone_yard', '용골 채굴장', 'Dragon Bone Yard', '태고의 용골을 캐내 갑주를 벼려 제국 전역의 유닛을 더 튼튼하게 만듭니다.', 'Excavates ancient Dragon Bone, forging armor that toughens every unit empire-wide.',
      { kind: 'special', terrain: null, feature: null, material: 'dragon_bone', cost: { gold: 130, imperium: 30 }, yields: { production: 8 }, unique: true, globalEffects: { hp: 5 } }),
    I('moonstone_hollow', '월장석 동굴', 'Moonstone Hollow', '달빛을 머금은 월장석을 캐내 제국 전역의 시야를 넓힙니다.', 'Extracts moonlit Moonstone, extending vision empire-wide.',
      { kind: 'special', terrain: null, feature: null, material: 'moonstone', cost: { gold: 120, imperium: 30 }, yields: { mana: 8 }, unique: true, globalEffects: { vision: 1 } }),
    I('ironwood_grove', '철목림', 'Ironwood Grove', '쇠처럼 단단한 철목을 베어내 제국 전역의 방어구를 강화합니다.', 'Fells iron-hard Ironwood, reinforcing armor empire-wide.',
      { kind: 'special', terrain: null, feature: null, material: 'ironwood', cost: { gold: 120, imperium: 30 }, yields: { production: 10 }, unique: true, globalEffects: { def: 1 } }),
    I('frost_crystal_vault', '서리 수정 금고', 'Frost Crystal Vault', '얼어붙은 서리 수정을 캐내 제국 전역의 냉기 저항을 높입니다.', 'Extracts frozen Frost Crystal, raising Frost Status Resistance empire-wide.',
      { kind: 'special', terrain: null, feature: null, material: 'frost_crystal', cost: { gold: 120, imperium: 30 }, yields: { mana: 6, gold: 4 }, unique: true, globalEffects: { statusRes_frost: 3 } }),
    I('ember_coal_pit', '잉걸탄 갱', 'Ember Coal Pit', '화산의 잉걸탄을 캐내 제국 전역의 유닛 공격에 화염을 더합니다.', 'Mines volcanic Ember Coal, lacing every unit\'s attacks with extra Fire.',
      { kind: 'special', terrain: null, feature: null, material: 'ember_coal', cost: { gold: 120, imperium: 30 }, yields: { production: 10, gold: 2 }, unique: true, globalEffects: { channelDmg_fire: 2 } }),
    I('star_metal_forge', '별금속 대장간', 'Star Metal Forge', '하늘에서 떨어진 별금속을 벼려 제국 전역의 유닛을 강하고 굳세게 만듭니다.', 'Forges fallen Star Metal, making every unit empire-wide stronger and steadier.',
      { kind: 'special', terrain: null, feature: null, material: 'star_metal', cost: { gold: 130, imperium: 30 }, yields: { gold: 10, knowledge: 4 }, unique: true, globalEffects: { dmg: 1, res: 1 } }),
  ];

  for (const i of improvements) Data.define('improvements', i);
})(window.AOW = window.AOW || {});
