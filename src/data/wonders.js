// src/data/wonders.js — ancient wonders + infestation kinds
//
// Additive schema notes (SPEC §3 wonders + additive fields, per project convention):
//   wonders: { id, name, desc, tier:1..4,
//     guard:{ tags:[animal|undead|elemental|dragon|giant|fiend|construct|eldritch|fey|angelic|marauder,...], tiers:[loTier,hiTier], count:[min,max], pool:[unitId,...] },
//     rewards:{ gold, mana, knowledge, imperium, items:n, itemTier:1..4, unitTags:[tag,...] } (Rally-of-the-Lieges-style roster flavor),
//     annexEffects:{...§3.1} (flat approximation of the wonder's "when annexed" empire bonus),
//     look:'golden_ruins'|'pyramid'|'wizard_tower'|'dwelling'|'crypt'|'grove'|'forge'|'monolith'|'library'|'sunken'|'battlefield'|'roost'|'shrine'|'obelisk',
//     terrains:[terrainId,...] }
//   guard.pool ids follow the wild-units convention (src/data/units_wild.js, not yet authored): wild_wolf, undead_skeleton,
//   elemental_fire, dragon_young_fire, giant_hill, fiend_imp, construct_iron_golem, eldritch_watcher, fey_sprite,
//   celestial_guardian_angel, marauder_bandit — Data.validate() will flag these as missing units until that file exists; expected.
//   Data.define('names', {id:'infestation_kinds', list:[{id, name, desc, guardTags, look, spawnTags}, ...]})
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  const POOL = {
    animal: ['wild_wolf'], undead: ['undead_skeleton'], elemental: ['elemental_fire'], dragon: ['dragon_young_fire'],
    giant: ['giant_hill'], fiend: ['fiend_imp'], construct: ['construct_iron_golem'], eldritch: ['eldritch_watcher'],
    fey: ['fey_sprite'], angelic: ['celestial_guardian_angel'], marauder: ['marauder_bandit'],
  };
  const poolFor = (tags) => tags.reduce((acc, t) => acc.concat(POOL[t] || []), []);

  const W = (id, ko, en, dko, den, o) => Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, tier: 1,
    guard: { tags: ['animal'], tiers: [1, 2], count: [3, 5], pool: poolFor(['animal']) },
    rewards: { gold: 0, mana: 0, knowledge: 0, imperium: 0, items: 1, itemTier: 1, unitTags: [] },
    annexEffects: {}, look: 'golden_ruins', terrains: ['grass'],
  }, o);

  const wonders = [
    // ================================================================ tier 1 (Bronze)
    W('wonder_hidden_wellspring', '숨겨진 샘', 'Hidden Wellspring',
      '요정들이 지키는 신비로운 샘. 정화된 물이 끝없이 솟아나며 주변 땅을 비옥하게 만든다. 도시가 합병하면 농장으로 개조할 수 있다.',
      'A mystic spring guarded by fey folk, its purified waters enriching the land forever. Once annexed it can be developed as a farm.',
      {
        tier: 1, guard: { tags: ['fey'], tiers: [1, 2], count: [3, 4], pool: poolFor(['fey']) },
        rewards: { gold: 0, mana: 10, knowledge: 0, imperium: 0, items: 1, itemTier: 1, unitTags: ['fey'] },
        annexEffects: { stability: 6, healPerTurn: 4 }, look: 'grove', terrains: ['grass', 'forest'],
      }),
    W('wonder_crystal_forest', '수정 숲', 'Crystal Forest',
      '살아있는 마나가 수정 나무로 자라난 숲. 걸음마다 은은한 빛과 마력의 파동이 인다. 도시가 합병하면 전도체로 개조할 수 있다.',
      'A forest where living mana has crystallized into glimmering trees, humming with arcane power. Once annexed it can be developed as a conduit.',
      {
        tier: 1, guard: { tags: ['eldritch'], tiers: [1, 2], count: [3, 5], pool: poolFor(['eldritch']) },
        rewards: { gold: 0, mana: 20, knowledge: 0, imperium: 0, items: 1, itemTier: 1, unitTags: ['eldritch'] },
        annexEffects: { mana: 10 }, look: 'monolith', terrains: ['forest', 'snow'],
      }),
    W('wonder_castle_ruins', '성 폐허', 'Castle Ruins',
      '오래전 무너진 성의 잔해. 오우거 무리가 술통과 잔해를 뒤지며 눌러앉았다. 도시가 합병하면 연구소로 개조할 수 있다.',
      'The rubble of a long-fallen castle, now squatted by a band of ogres rummaging through the wreckage. Once annexed it can be developed as a research post.',
      {
        tier: 1, guard: { tags: ['giant'], tiers: [1, 2], count: [3, 4], pool: poolFor(['giant']) },
        rewards: { gold: 20, mana: 0, knowledge: 0, imperium: 0, items: 1, itemTier: 1, unitTags: ['giant'] },
        annexEffects: { knowledge: 8, draft: 6 }, look: 'golden_ruins', terrains: ['grass', 'hills'],
      }),
    W('wonder_ancient_cave', '고대 동굴', 'Ancient Cave',
      '거대한 뱀이 똬리를 튼 어두운 동굴. 안쪽 깊은 곳에서 원석이 반짝인다. 도시가 합병하면 채석장으로 개조할 수 있다.',
      'A dark cavern coiled by great serpents, its depths glittering with raw ore. Once annexed it can be developed as a quarry.',
      {
        tier: 1, guard: { tags: ['animal'], tiers: [1, 2], count: [3, 5], pool: poolFor(['animal']) },
        rewards: { gold: 0, mana: 10, knowledge: 0, imperium: 0, items: 1, itemTier: 1, unitTags: ['animal'] },
        annexEffects: { production: 8, mana: 4 }, look: 'dwelling', terrains: ['hills', 'mountain'],
      }),
    W('wonder_crimson_fane', '진홍의 사당', 'Crimson Fane',
      '핏빛 스테인드글라스로 뒤덮인 낡은 사당. 그림자 속에서 끼익거리는 박쥐 떼가 서식한다. 도시가 합병하면 연구소로 개조할 수 있다.',
      'A crumbling fane of blood-red stained glass, home to a colony of shrieking bats in its rafters. Once annexed it can be developed as a research post.',
      {
        tier: 1, guard: { tags: ['undead'], tiers: [1, 2], count: [3, 4], pool: poolFor(['undead']) },
        rewards: { gold: 0, mana: 10, knowledge: 8, imperium: 0, items: 1, itemTier: 1, unitTags: ['undead'] },
        annexEffects: { mana: 6 }, look: 'shrine', terrains: ['swamp', 'forest'],
      }),
    W('wonder_barren_wellspring', '메마른 샘', 'Barren Wellspring',
      '모래에 반쯤 파묻힌 오래된 샘. 까마귀 정령이 남은 마력을 지킨다. 도시가 합병하면 농장으로 개조할 수 있다.',
      'An ancient spring half-buried in sand, watched over by a crow spirit guarding what magic remains. Once annexed it can be developed as a farm.',
      {
        tier: 1, guard: { tags: ['fey'], tiers: [1, 2], count: [3, 4], pool: poolFor(['fey']) },
        rewards: { gold: 0, mana: 15, knowledge: 0, imperium: 0, items: 1, itemTier: 1, unitTags: ['fey'] },
        annexEffects: { stability: 4 }, look: 'sunken', terrains: ['desert'],
      }),
    W('wonder_breached_arcanum', '뚫린 비전 서고', 'Breached Arcanum',
      '봉인이 뚫려 위험한 마력이 새어 나오는 서고. 무엇이 안에 도사리는지는 주변 환경에 따라 다르다. 복원하면 가려진 비전 서고가 된다.',
      'A once-sealed archive now breached, leaking dangerous magic. What lurks within varies with its surroundings; it can be restored into a Shrouded Arcanum.',
      {
        tier: 1, guard: { tags: ['eldritch'], tiers: [1, 2], count: [3, 5], pool: poolFor(['eldritch']) },
        rewards: { gold: 0, mana: 0, knowledge: 15, imperium: 0, items: 1, itemTier: 1, unitTags: ['eldritch'] },
        annexEffects: { knowledge: 6 }, look: 'library', terrains: ['desert', 'mountain'],
      }),

    // ================================================================ tier 2 (Silver)
    W('wonder_secret_temple', '비밀 사원', 'Secret Temple',
      '축복받은 영혼들이 지키는 숨은 사원. 신성한 기운이 벽 틈새로 스며 나온다. 도시가 합병하면 전도체로 개조할 수 있다.',
      'A hidden temple guarded by blessed souls, holiness seeping from every crack in its walls. Once annexed it can be developed as a conduit.',
      {
        tier: 2, guard: { tags: ['angelic'], tiers: [2, 3], count: [3, 5], pool: poolFor(['angelic']) },
        rewards: { gold: 0, mana: 25, knowledge: 0, imperium: 0, items: 1, itemTier: 2, unitTags: ['angelic'] },
        annexEffects: { knowledge: 6, mana: 6 }, look: 'shrine', terrains: ['forest', 'hills'],
      }),
    W('wonder_magma_forge', '마그마 대장간', 'Magma Forge',
      '불의 거인이 지키는 용암 대장간. 벼려지는 무기마다 불씨가 튄다. 도시가 합병하면 광산으로 개조할 수 있다.',
      'A lava-fed forge guarded by a fire giant, sparks flying from every weapon struck. Once annexed it can be developed as a mine.',
      {
        tier: 2, guard: { tags: ['giant'], tiers: [2, 3], count: [3, 4], pool: poolFor(['giant']) },
        rewards: { gold: 10, mana: 0, knowledge: 0, imperium: 0, items: 1, itemTier: 2, unitTags: ['giant'] },
        annexEffects: { draft: 15, gold: 10, recruitCostPct: -25 }, look: 'forge', terrains: ['volcanic', 'mountain'],
      }),
    W('wonder_lost_tomb', '잃어버린 무덤', 'Lost Tomb',
      '타락한 영혼들이 배회하는 봉인된 무덤. 갇힌 영웅들의 유해가 마력을 뿜는다. 도시가 합병하면 연구소로 개조할 수 있다.',
      'A sealed tomb haunted by corrupt souls, the remains of trapped heroes still radiating power. Once annexed it can be developed as a research post.',
      {
        tier: 2, guard: { tags: ['undead'], tiers: [2, 3], count: [4, 5], pool: poolFor(['undead']) },
        rewards: { gold: 0, mana: 0, knowledge: 25, imperium: 0, items: 1, itemTier: 2, unitTags: ['undead'] },
        annexEffects: { mana: 6, knowledge: 6 }, look: 'crypt', terrains: ['desert', 'swamp'],
      }),
    W('wonder_archon_observatory', '아르콘 천문대', 'Archon Observatory',
      '빛의 정령들이 별을 관측하는 높은 천문대. 하늘의 흐름을 읽어 앎을 전한다. 도시가 합병하면 연구소로 개조할 수 있다.',
      'A tall observatory where light spirits chart the stars, reading the heavens for knowledge. Once annexed it can be developed as a research post.',
      {
        tier: 2, guard: { tags: ['angelic'], tiers: [2, 3], count: [3, 5], pool: poolFor(['angelic']) },
        rewards: { gold: 0, mana: 0, knowledge: 25, imperium: 0, items: 1, itemTier: 2, unitTags: ['angelic'] },
        annexEffects: { knowledge: 10 }, look: 'wizard_tower', terrains: ['mountain', 'hills'],
      }),
    W('wonder_lava_prison', '용암 감옥', 'Lava Prison',
      '태초의 짐승들이 갇힌 화산 속 감옥. 뜨거운 균열 사이로 으르렁대는 소리가 새어 나온다. 도시가 합병하면 연구소로 개조할 수 있다.',
      'A volcanic prison holding primordial beasts, their growls echoing through scorching fissures. Once annexed it can be developed as a research post.',
      {
        tier: 2, guard: { tags: ['elemental'], tiers: [2, 3], count: [3, 4], pool: poolFor(['elemental']) },
        rewards: { gold: 0, mana: 0, knowledge: 20, imperium: 0, items: 2, itemTier: 2, unitTags: ['elemental'] },
        annexEffects: { knowledge: 8 }, look: 'crypt', terrains: ['volcanic'],
      }),
    W('wonder_forsaken_temple', '버려진 사원', 'Forsaken Temple',
      '영혼 매가 둥지를 튼 버림받은 사원. 잊힌 기도가 아직 벽에 메아리친다. 도시가 합병하면 전도체로 개조할 수 있다.',
      'An abandoned temple nested by spirit hawks, forgotten prayers still echoing off its walls. Once annexed it can be developed as a conduit.',
      {
        tier: 2, guard: { tags: ['fey'], tiers: [2, 3], count: [3, 5], pool: poolFor(['fey']) },
        rewards: { gold: 0, mana: 15, knowledge: 0, imperium: 0, items: 1, itemTier: 2, unitTags: ['fey'] },
        annexEffects: { production: 6 }, look: 'shrine', terrains: ['swamp', 'forest'],
      }),
    W('wonder_shrouded_arcanum', '가려진 비전 서고', 'Shrouded Arcanum',
      '안개 같은 결계로 둘러싸인 서고. 시전자의 마력을 증폭시키는 힘이 감돈다. 도시가 합병하면 연구소로 개조할 수 있다.',
      'An archive wrapped in mist-like wards that amplify a caster\'s power. Once annexed it can be developed as a research post.',
      {
        tier: 2, guard: { tags: ['eldritch'], tiers: [2, 3], count: [4, 5], pool: poolFor(['eldritch']) },
        rewards: { gold: 0, mana: 0, knowledge: 25, imperium: 0, items: 1, itemTier: 2, unitTags: ['eldritch'] },
        annexEffects: { casting: 5, combatCasting: 5 }, look: 'library', terrains: ['mountain', 'desert', 'snow'],
      }),

    // ================================================================ tier 3 (Gold, standard)
    W('wonder_rose_choked_palace', '장미에 잠긴 궁전', 'Rose Choked Palace',
      '가시 장미 덩굴에 뒤덮인 궁전. 가시 갑옷을 두른 해골 기사들이 무너진 회랑을 순찰한다.',
      'A palace strangled by thorned roses, patrolled by skeletal knights clad in briar armor along its ruined halls.',
      {
        tier: 3, guard: { tags: ['undead'], tiers: [3, 4], count: [4, 6], pool: poolFor(['undead']) },
        rewards: { gold: 0, mana: 15, knowledge: 0, imperium: 0, items: 2, itemTier: 3, unitTags: ['undead'] },
        annexEffects: { food: 15, mana: 15 }, look: 'golden_ruins', terrains: ['swamp', 'forest'],
      }),
    W('wonder_vaultsphere', '금고구', 'Vaultsphere',
      '스스로 회전하며 떠 있는 거대한 금속 구체. 안에는 부서지지 않는 수호자가 잠들어 있다.',
      'A vast metal sphere that turns slowly in midair, an unbreakable guardian slumbering within.',
      {
        tier: 3, guard: { tags: ['construct'], tiers: [3, 4], count: [3, 5], pool: poolFor(['construct']) },
        rewards: { gold: 0, mana: 0, knowledge: 30, imperium: 0, items: 2, itemTier: 3, unitTags: ['construct'] },
        annexEffects: { knowledge: 10, mana: 6 }, look: 'obelisk', terrains: ['mountain', 'desert'],
      }),
    W('wonder_withered_tree', '시든 나무', 'Withered Tree',
      '한때 세계수였을 시든 거목. 죽음을 먹는 시체새 떼가 앙상한 가지에 둥지를 틀었다. 복원하면 세계수로 되살아난다.',
      'A withered giant tree, once a World Tree, now nested by carrion birds among its bare branches. It can be restored into a World Tree.',
      {
        tier: 3, guard: { tags: ['animal'], tiers: [3, 4], count: [4, 5], pool: poolFor(['animal']) },
        rewards: { gold: 0, mana: 0, knowledge: 0, imperium: 0, items: 2, itemTier: 3, unitTags: ['animal'] },
        annexEffects: { food: 10, production: 10 }, look: 'grove', terrains: ['desert', 'snow'],
      }),
    W('wonder_fractured_tower', '부서진 탑', 'Fractured Tower',
      '차원이 갈라진 채 멈춰버린 탑. 균열 속에서 뒤틀린 소환사들이 걸어 나온다.',
      'A tower frozen mid-collapse through a fracture in reality, warped evokers stepping out of its cracks.',
      {
        tier: 3, guard: { tags: ['eldritch'], tiers: [3, 4], count: [4, 6], pool: poolFor(['eldritch']) },
        rewards: { gold: 0, mana: 0, knowledge: 30, imperium: 0, items: 2, itemTier: 3, unitTags: ['eldritch'] },
        annexEffects: { knowledge: 15 }, look: 'wizard_tower', terrains: ['snow', 'mountain'],
      }),

    // ================================================================ tier 4 (Gold, mightiest / capstone)
    W('wonder_world_tree', '세계수', 'World Tree',
      '세상이 태어날 때부터 뿌리내린 살아있는 거목. 뒤엉킨 뿌리 정령들이 나무 자체를 이루어 지킨다.',
      'A living giant tree rooted since the world\'s birth, its trunk itself formed of tangled root-spirits standing guard.',
      {
        tier: 4, guard: { tags: ['fey'], tiers: [3, 5], count: [5, 6], pool: poolFor(['fey']) },
        rewards: { gold: 0, mana: 15, knowledge: 0, imperium: 0, items: 3, itemTier: 4, unitTags: ['fey'] },
        annexEffects: { food: 15, production: 15, mana: 10, knowledge: 10 }, look: 'grove', terrains: ['forest', 'grass'],
      }),
    W('wonder_lost_wizard_tower', '잃어버린 마법사의 탑', 'Lost Wizard Tower',
      '위대한 마법사가 남기고 사라진 탑. 뼈만 남은 거대한 용이 꼭대기에 둥지를 틀었다.',
      'A tower left behind by a vanished archmage, now roosted at its summit by a great bone dragon.',
      {
        tier: 4, guard: { tags: ['undead', 'dragon'], tiers: [4, 5], count: [3, 5], pool: poolFor(['undead', 'dragon']) },
        rewards: { gold: 0, mana: 15, knowledge: 15, imperium: 0, items: 3, itemTier: 4, unitTags: ['undead', 'dragon'] },
        annexEffects: { mana: 15, knowledge: 15 }, look: 'wizard_tower', terrains: ['mountain', 'hills'],
      }),
    W('wonder_golden_ziggurat', '황금 지구라트', 'Golden Ziggurat',
      '순금으로 뒤덮인 거대한 계단식 신전. 정상에서 불사조가 영원히 불타오르며 감시한다.',
      'A vast stepped temple sheathed in solid gold, an eternal phoenix burning watch atop its summit.',
      {
        tier: 4, guard: { tags: ['elemental'], tiers: [4, 5], count: [3, 5], pool: poolFor(['elemental']) },
        rewards: { gold: 30, mana: 0, knowledge: 0, imperium: 0, items: 3, itemTier: 4, unitTags: ['elemental'] },
        annexEffects: { gold: 30, upkeepPct: -25 }, look: 'pyramid', terrains: ['desert'],
      }),
    W('wonder_giants_throne', '거인의 옥좌', 'Giant\'s Throne',
      '태고의 거인 왕이 앉았던 거대한 돌 옥좌. 바위 거인과 폭풍 거인이 그 유산을 지킨다.',
      'A colossal stone throne once seated by an ancient giant-king, its legacy guarded by rock and storm giants.',
      {
        tier: 4, guard: { tags: ['giant'], tiers: [4, 5], count: [3, 5], pool: poolFor(['giant']) },
        rewards: { gold: 30, mana: 0, knowledge: 0, imperium: 0, items: 3, itemTier: 4, unitTags: ['giant'] },
        annexEffects: { imperium: 8 }, look: 'monolith', terrains: ['mountain', 'hills'],
      }),
  ];
  for (const w of wonders) Data.define('wonders', w);

  // ================================================================ infestation kinds (10)
  Data.define('names', {
    id: 'infestation_kinds',
    list: [
      { id: 'bandit_camp', name: { ko: '산적 야영지', en: 'Bandit Camp' }, desc: { ko: '무법자 무리가 대상단을 노리며 숨어든 야영지.', en: 'A hideout where outlaws lie in wait to prey on passing caravans.' }, guardTags: ['marauder'], look: 'dwelling', spawnTags: ['marauder', 'infantry'] },
      { id: 'spider_nest', name: { ko: '거미 둥지', en: 'Spider Nest' }, desc: { ko: '두꺼운 거미줄로 뒤덮인 숲 속 둥지. 독을 품은 거미들이 들끓는다.', en: 'A thicket choked in webbing, swarming with venomous spiders.' }, guardTags: ['animal'], look: 'grove', spawnTags: ['animal', 'blight'] },
      { id: 'undead_barrow', name: { ko: '언데드 고분', en: 'Undead Barrow' }, desc: { ko: '오래된 고분에서 되살아난 망자들이 밤마다 기어 나온다.', en: 'The restless dead crawl from an ancient burial mound each night.' }, guardTags: ['undead'], look: 'crypt', spawnTags: ['undead'] },
      { id: 'elemental_rift', name: { ko: '정령의 균열', en: 'Elemental Rift' }, desc: { ko: '원소계로 통하는 균열이 열려 순수한 원소의 힘이 흘러나온다.', en: 'A tear into the elemental planes bleeds raw primal force into the world.' }, guardTags: ['elemental'], look: 'obelisk', spawnTags: ['elemental'] },
      { id: 'dragon_lair', name: { ko: '용의 둥지', en: 'Dragon\'s Lair' }, desc: { ko: '어린 용이 보물을 쌓아두고 웅크린 험준한 동굴.', en: 'A craggy cave where a young dragon coils atop a hoard of treasure.' }, guardTags: ['dragon'], look: 'roost', spawnTags: ['dragon'] },
      { id: 'goblin_warren', name: { ko: '고블린 소굴', en: 'Goblin Warren' }, desc: { ko: '땅굴을 파고 불어나는 고블린 무리의 소굴.', en: 'A warren of tunnels where a goblin clan digs and multiplies unchecked.' }, guardTags: ['marauder'], look: 'dwelling', spawnTags: ['marauder', 'goblin'] },
      { id: 'ogre_den', name: { ko: '오우거 소굴', en: 'Ogre Den' }, desc: { ko: '뼈다귀와 부서진 무기가 나뒹구는 오우거 무리의 소굴.', en: 'A den littered with bones and broken weapons, home to a band of ogres.' }, guardTags: ['giant'], look: 'dwelling', spawnTags: ['giant'] },
      { id: 'harpy_roost', name: { ko: '하피 둥지', en: 'Harpy Roost' }, desc: { ko: '깎아지른 절벽에 자리한 하피 무리의 둥지. 날카로운 울음이 메아리친다.', en: 'A roost on a sheer cliff where harpies shriek and circle overhead.' }, guardTags: ['animal'], look: 'roost', spawnTags: ['animal'] },
      { id: 'cultist_shrine', name: { ko: '광신도의 제단', en: 'Cultist Shrine' }, desc: { ko: '금지된 의식을 치르며 공허의 존재를 불러내려는 광신도들의 제단.', en: 'A shrine where cultists perform forbidden rites to summon things from beyond.' }, guardTags: ['fiend'], look: 'shrine', spawnTags: ['fiend', 'eldritch'] },
      { id: 'lich_crypt', name: { ko: '리치의 지하묘', en: 'Lich Crypt' }, desc: { ko: '불사의 리치가 은둔하며 언데드 군세를 키우는 지하묘.', en: 'A subterranean crypt where an undying lich broods and raises an undead host.' }, guardTags: ['undead'], look: 'crypt', spawnTags: ['undead', 'mage'] },
    ],
  });

  AOW.log && AOW.log('wonders.js: ' + wonders.length + ' wonders + infestation kinds loaded');
})(window.AOW = window.AOW || {});
