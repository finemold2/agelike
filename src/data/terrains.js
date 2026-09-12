// src/data/terrains.js — terrain, feature and realm-trait content
//
// Conventions (shared with src/game/state.js and src/game/worldgen.js):
//   * `terrain` is the base ground / climate of a hex (State.TERRAINS order), `feature` is the relief or
//     decoration drawn on top (State.FEATURES order). Wooded temperate hexes use terrain 'forest' AND
//     feature 'forest'|'dense_forest'; hilly temperate hexes use terrain 'hills' + feature 'hills';
//     mountains always use terrain 'mountain' + feature 'mountain'|'peak'. Cold/dry/wet climates keep
//     their climate terrain ('snow','desert','swamp','volcanic') and carry relief in the feature.
//   * moveCost is per movement class in movement points (units have ~32 mp). Infinity = impassable.
//     Feature moveCost is ADDED to the terrain cost. Roads (Rules) should override to ~3.
//   * yields are per hex; a province sums its hexes (Rules decides scaling).
//   * realmTraits[id].gen holds worldgen parameter tweaks. Numeric entries are ADDED to
//     WorldGen.baseParams(), non-numeric entries replace the value. Keys are documented in worldgen.js.
(function (AOW) {
  'use strict';
  const Data = AOW.Data;
  const INF = Infinity;

  // ------------------------------------------------------------------ terrains
  const terrains = [
    { id: 'ocean', name: { ko: '대양', en: 'Ocean' }, desc: { ko: '깊고 푸른 바다. 배나 비행 유닛만 건널 수 있다.', en: 'Deep blue sea. Only swimming, floating or flying units may cross.' },
      moveCost: { walk: INF, mounted: INF, fly: 4, float: 4, swim: 4 }, yields: { food: 1, production: 0, gold: 0, mana: 0, knowledge: 0 },
      defense: 0, isWater: true, color: '#123c66', color2: '#1b5a8a' },
    { id: 'coast', name: { ko: '연안', en: 'Coast' }, desc: { ko: '육지에 접한 얕은 바다. 물고기가 풍부하다.', en: 'Shallow water hugging the land, rich in fish.' },
      moveCost: { walk: INF, mounted: INF, fly: 4, float: 4, swim: 4 }, yields: { food: 2, production: 0, gold: 1, mana: 0, knowledge: 0 },
      defense: 0, isWater: true, color: '#2f8bb8', color2: '#4fb0d4' },
    { id: 'lake', name: { ko: '호수', en: 'Lake' }, desc: { ko: '내륙의 잔잔한 호수.', en: 'A calm inland lake.' },
      moveCost: { walk: INF, mounted: INF, fly: 4, float: 4, swim: 4 }, yields: { food: 2, production: 0, gold: 0, mana: 1, knowledge: 0 },
      defense: 0, isWater: true, color: '#2b6f9c', color2: '#3f95c4' },
    { id: 'grass', name: { ko: '초원', en: 'Grassland' }, desc: { ko: '비옥한 평야. 농사에 알맞다.', en: 'Fertile open plains, ideal for farming.' },
      moveCost: { walk: 4, mounted: 4, fly: 4, float: 4, swim: 4 }, yields: { food: 3, production: 1, gold: 1, mana: 0, knowledge: 0 },
      defense: 0, isWater: false, color: '#6f9a3c', color2: '#8fb54a' },
    { id: 'forest', name: { ko: '숲', en: 'Forest' }, desc: { ko: '울창한 나무들. 목재와 사냥감을 준다.', en: 'Thick woodland giving timber and game.' },
      moveCost: { walk: 6, mounted: 7, fly: 4, float: 5, swim: 6 }, yields: { food: 1, production: 3, gold: 0, mana: 0, knowledge: 0 },
      defense: 1, isWater: false, color: '#3f7030', color2: '#5c8f3d' },
    { id: 'hills', name: { ko: '구릉', en: 'Hills' }, desc: { ko: '완만한 언덕. 채석과 광산에 좋다.', en: 'Rolling hills, good for quarries and mines.' },
      moveCost: { walk: 6, mounted: 7, fly: 4, float: 5, swim: 6 }, yields: { food: 1, production: 2, gold: 2, mana: 0, knowledge: 0 },
      defense: 1, isWater: false, color: '#8c9a4a', color2: '#a9b25e' },
    { id: 'mountain', name: { ko: '산악', en: 'Mountains' }, desc: { ko: '험준한 산맥. 지나기 어렵지만 광물이 풍부하다.', en: 'Rugged peaks, hard to cross but rich in ore.' },
      moveCost: { walk: 10, mounted: 12, fly: 5, float: 8, swim: 10 }, yields: { food: 0, production: 2, gold: 2, mana: 1, knowledge: 0 },
      defense: 2, isWater: false, color: '#7d7a74', color2: '#a39e95' },
    { id: 'desert', name: { ko: '사막', en: 'Desert' }, desc: { ko: '뜨거운 모래벌판. 금과 마나가 묻혀 있다.', en: 'Hot sands hiding gold and buried magic.' },
      moveCost: { walk: 5, mounted: 5, fly: 4, float: 4, swim: 5 }, yields: { food: 0, production: 0, gold: 2, mana: 1, knowledge: 0 },
      defense: 0, isWater: false, color: '#d6b16a', color2: '#e8cf8f' },
    { id: 'snow', name: { ko: '설원', en: 'Snow' }, desc: { ko: '얼어붙은 땅. 척박하지만 마나가 흐른다.', en: 'Frozen ground, barren but humming with mana.' },
      moveCost: { walk: 6, mounted: 7, fly: 4, float: 5, swim: 6 }, yields: { food: 0, production: 1, gold: 0, mana: 2, knowledge: 0 },
      defense: 0, isWater: false, color: '#dfe7ee', color2: '#f4f8fb' },
    { id: 'swamp', name: { ko: '늪지', en: 'Swamp' }, desc: { ko: '질퍽한 습지. 이동이 느리지만 기묘한 생명이 자란다.', en: 'Sodden marsh, slow to cross, alive with strange growths.' },
      moveCost: { walk: 7, mounted: 9, fly: 4, float: 4, swim: 5 }, yields: { food: 1, production: 0, gold: 0, mana: 2, knowledge: 0 },
      defense: -1, isWater: false, color: '#4b6a3a', color2: '#5f7f47' },
    { id: 'volcanic', name: { ko: '화산 지대', en: 'Volcanic' }, desc: { ko: '재와 용암의 땅. 불의 힘이 깃들어 있다.', en: 'Ash and lava fields steeped in the power of fire.' },
      moveCost: { walk: 6, mounted: 7, fly: 4, float: 5, swim: 6 }, yields: { food: 0, production: 2, gold: 0, mana: 2, knowledge: 0 },
      defense: 0, isWater: false, color: '#3d2b2b', color2: '#5a3a30' },
  ];
  for (const t of terrains) Data.define('terrains', t);

  // ------------------------------------------------------------------ features
  const features = [
    { id: 'none', name: { ko: '없음', en: 'None' }, moveCost: { walk: 0, mounted: 0, fly: 0, float: 0, swim: 0 }, yields: {}, blocksVision: false, impassable: false },
    { id: 'forest', name: { ko: '숲', en: 'Forest' }, desc: { ko: '나무가 우거진 곳.', en: 'Tree cover.' },
      moveCost: { walk: 2, mounted: 3, fly: 0, float: 1, swim: 2 }, yields: { production: 1 }, blocksVision: true, impassable: false, defense: 1 },
    { id: 'dense_forest', name: { ko: '깊은 숲', en: 'Dense Forest' }, desc: { ko: '빛도 들지 않는 깊은 숲.', en: 'Old growth so dense little light reaches the floor.' },
      moveCost: { walk: 3, mounted: 4, fly: 0, float: 1, swim: 3 }, yields: { production: 2 }, blocksVision: true, impassable: false, defense: 2 },
    { id: 'hills', name: { ko: '언덕', en: 'Hills' }, desc: { ko: '높은 언덕. 시야가 넓다.', en: 'High ground with a wide view.' },
      moveCost: { walk: 2, mounted: 3, fly: 0, float: 1, swim: 2 }, yields: { production: 1, gold: 1 }, blocksVision: false, impassable: false, vision: 1, defense: 1 },
    { id: 'mountain', name: { ko: '산', en: 'Mountain' }, desc: { ko: '험한 산.', en: 'A rugged mountain.' },
      moveCost: { walk: 4, mounted: 5, fly: 1, float: 2, swim: 4 }, yields: { production: 1, gold: 1 }, blocksVision: true, impassable: false, vision: 2, defense: 2 },
    { id: 'peak', name: { ko: '봉우리', en: 'Peak' }, desc: { ko: '통과할 수 없는 봉우리.', en: 'An impassable summit.' },
      moveCost: { walk: INF, mounted: INF, fly: 6, float: INF, swim: INF }, yields: {}, blocksVision: true, impassable: true },
    { id: 'ruins', name: { ko: '유적', en: 'Ruins' }, desc: { ko: '옛 문명의 잔해. 지식이 잠들어 있다.', en: 'Remains of an old civilisation holding forgotten knowledge.' },
      moveCost: { walk: 0, mounted: 0, fly: 0, float: 0, swim: 0 }, yields: { knowledge: 2, gold: 1 }, blocksVision: false, impassable: false, defense: 1 },
    { id: 'crystal', name: { ko: '수정', en: 'Crystal' }, desc: { ko: '마력을 머금은 수정 군락.', en: 'A cluster of mana-charged crystals.' },
      moveCost: { walk: 1, mounted: 1, fly: 0, float: 0, swim: 1 }, yields: { mana: 3 }, blocksVision: false, impassable: false },
    { id: 'ash', name: { ko: '잿더미', en: 'Ash' }, desc: { ko: '화산재로 덮인 땅.', en: 'Ground buried under volcanic ash.' },
      moveCost: { walk: 1, mounted: 1, fly: 0, float: 0, swim: 1 }, yields: { production: 1, mana: 1 }, blocksVision: false, impassable: false },
    { id: 'oasis', name: { ko: '오아시스', en: 'Oasis' }, desc: { ko: '사막의 물웅덩이.', en: 'A spring of life in the sands.' },
      moveCost: { walk: 0, mounted: 0, fly: 0, float: 0, swim: 0 }, yields: { food: 3, gold: 1 }, blocksVision: false, impassable: false },
    { id: 'ice', name: { ko: '얼음', en: 'Ice' }, desc: { ko: '얼어붙은 물가.', en: 'Frozen shoreline.' },
      moveCost: { walk: 1, mounted: 2, fly: 0, float: 0, swim: 1 }, yields: { mana: 1 }, blocksVision: false, impassable: false },
    { id: 'mushroom', name: { ko: '거대 버섯', en: 'Giant Mushrooms' }, desc: { ko: '늪에서 자라는 거대한 버섯.', en: 'Towering fungi of the marsh.' },
      moveCost: { walk: 1, mounted: 1, fly: 0, float: 0, swim: 1 }, yields: { food: 2, mana: 1 }, blocksVision: true, impassable: false },
    { id: 'ancient_tree', name: { ko: '고대 수목', en: 'Ancient Tree' }, desc: { ko: '수천 년을 산 거목.', en: 'A tree that has stood for thousands of years.' },
      moveCost: { walk: 2, mounted: 3, fly: 0, float: 1, swim: 2 }, yields: { mana: 2, knowledge: 1, food: 1 }, blocksVision: true, impassable: false, defense: 1 },
  ];
  for (const f of features) Data.define('features', f);

  // ------------------------------------------------------------------ realm traits
  // gen keys (see WorldGen.baseParams): landRatio, continentScale, falloff, hillFrac, mountainFrac, forestBias,
  // denseBias, moistureBias, snowLine, desertBias, swampBias, volcanicClusters, ruinsChance, crystalChance,
  // oasisChance, iceChance, mushroomChance, ashChance, ancientTreeChance, riverCount, resourceChance,
  // magicMaterialChance, wonderCount, freeCities, infestations, dragonLairs, guardStrength, teleporterPairs,
  // infestationBias:'undead'|'animal'|..., lakeMaxSize
  const realmTraits = [
    { id: 'lush', name: { ko: '무성한 대지', en: 'Lush Lands' }, desc: { ko: '비가 잦고 숲과 식량 자원이 풍부한 영역.', en: 'Rain-soaked realm with abundant forests and food.' },
      gen: { forestBias: 0.12, moistureBias: 0.12, resourceChance: 0.1, riverCount: 2, snowLine: -0.05 } },
    { id: 'frozen', name: { ko: '얼어붙은 영역', en: 'Frozen Realm' }, desc: { ko: '만년설이 대지의 절반을 덮는다.', en: 'Eternal snow covers half the land.' },
      gen: { snowLine: 0.28, iceChance: 0.2, desertBias: -0.3, moistureBias: -0.05, infestationBias: 'undead' } },
    { id: 'scorched', name: { ko: '불타는 사막', en: 'Scorched Sands' }, desc: { ko: '넓은 사막이 대륙을 가로지른다.', en: 'Vast deserts stretch across the continents.' },
      gen: { desertBias: 0.3, snowLine: -0.1, moistureBias: -0.12, oasisChance: 0.04 } },
    { id: 'volcanic_wastes', name: { ko: '화산 황무지', en: 'Volcanic Wastes' }, desc: { ko: '화산과 잿더미가 곳곳에 널려 있다.', en: 'Volcanoes and ashlands scar the world.' },
      gen: { volcanicClusters: 4, ashChance: 0.15, mountainFrac: 0.02, infestationBias: 'elemental' } },
    { id: 'ancient_ruins', name: { ko: '고대의 유적', en: 'Ancient Ruins' }, desc: { ko: '사라진 문명의 흔적이 지식을 약속한다.', en: 'Traces of a vanished civilisation promise knowledge.' },
      gen: { ruinsChance: 0.06, resourceChance: 0.05, knowledgeBias: 0.3 } },
    { id: 'many_wonders', name: { ko: '경이의 땅', en: 'Land of Wonders' }, desc: { ko: '고대의 경이가 훨씬 많다.', en: 'Far more ancient wonders dot the map.' },
      gen: { wonderCount: 5 } },
    { id: 'dense_forests', name: { ko: '울창한 숲', en: 'Dense Forests' }, desc: { ko: '깊은 숲이 대륙을 덮는다.', en: 'Deep old forests blanket the continents.' },
      gen: { forestBias: 0.25, denseBias: 0.2, ancientTreeChance: 0.05, infestationBias: 'animal' } },
    { id: 'archipelago', name: { ko: '군도', en: 'Archipelago' }, desc: { ko: '수많은 섬으로 이루어진 세계.', en: 'A world of many islands.' },
      gen: { landRatio: -0.13, continentScale: 0.7, falloff: -0.5, lakeMaxSize: -4, minStartDist: -3 } },
    { id: 'pangaea', name: { ko: '판게아', en: 'Pangaea' }, desc: { ko: '하나의 거대한 초대륙.', en: 'One vast supercontinent.' },
      gen: { landRatio: 0.12, continentScale: -0.3, falloff: 0.35 } },
    { id: 'rich_magic', name: { ko: '마력이 풍부한 땅', en: 'Rich in Magic' }, desc: { ko: '수정과 마법 재료가 넘쳐난다.', en: 'Crystals and magic materials abound.' },
      gen: { crystalChance: 0.04, magicMaterialChance: 0.06, manaBias: 0.3 } },
    { id: 'wild_beasts', name: { ko: '야수의 땅', en: 'Land of Beasts' }, desc: { ko: '위험한 야수 소굴이 많다.', en: 'Dangerous beast dens are common.' },
      gen: { infestations: 3, guardStrength: 1, infestationBias: 'animal' } },
    { id: 'free_city_haven', name: { ko: '자유도시의 낙원', en: 'Free City Haven' }, desc: { ko: '자유도시가 더 많이 세워져 있다.', en: 'More free cities have taken root.' },
      gen: { freeCities: 3 } },
    { id: 'dragon_lands', name: { ko: '용의 땅', en: 'Dragon Lands' }, desc: { ko: '산맥마다 용의 둥지가 있다.', en: 'Dragon lairs nest in every mountain range.' },
      gen: { dragonLairs: 2, mountainFrac: 0.03, guardStrength: 1 } },
    { id: 'highlands', name: { ko: '고원 지대', en: 'Highlands' }, desc: { ko: '언덕과 산이 많은 험한 땅.', en: 'Rugged country of hills and mountains.' },
      gen: { hillFrac: 0.12, mountainFrac: 0.05, riverCount: 2 } },
    { id: 'marshlands', name: { ko: '습지대', en: 'Marshlands' }, desc: { ko: '늪과 버섯 숲이 저지대를 채운다.', en: 'Marsh and fungal groves fill the lowlands.' },
      gen: { swampBias: 0.22, moistureBias: 0.1, mushroomChance: 0.1, infestationBias: 'undead' } },
    { id: 'great_rivers', name: { ko: '큰 강', en: 'Great Rivers' }, desc: { ko: '수많은 강이 대지를 가로지른다.', en: 'Countless rivers cross the land.' },
      gen: { riverCount: 7, resourceChance: 0.05 } },
    { id: 'barren', name: { ko: '척박한 땅', en: 'Barren Realm' }, desc: { ko: '자원이 드물어 경쟁이 치열하다.', en: 'Resources are scarce and contested.' },
      gen: { resourceChance: -0.15, magicMaterialChance: -0.03, forestBias: -0.1 } },
    { id: 'haunted', name: { ko: '저주받은 땅', en: 'Haunted Realm' }, desc: { ko: '유적마다 죽은 자들이 서성인다.', en: 'The dead walk among the ruins.' },
      gen: { ruinsChance: 0.03, infestations: 2, infestationBias: 'undead' } },
  ];
  for (const r of realmTraits) Data.define('realmTraits', r);
})(window.AOW = window.AOW || {});
