// src/data/traits.js — form (body/mind) point-buy traits + society traits (SPEC §3)
//
// Schema (SPEC §3 + additive `ability` field):
//   { id, name, desc, kind:'body'|'mind'|'society', affinity:{order:1}|{} (society only, may be {}),
//     effects:{...§3.1 vocabulary}, cost:1..3, ability:null|abilityId }
// `ability` (additive, documented here per Ground Rule 0): when set, the trait also grants that
// canonical passive/active ability id from src/data/abilities.js — used instead of, or alongside,
// `effects` when a trait's whole point is "this species/mindset innately has ability X"
// (e.g. body trait `amphibious_form` grants the `amphibious` ability). Rules.unitStats applies a
// unit's form bodyTraits/mindTraits the same way it applies units[].passives.
// Body/mind traits modify the individual units of that form; society traits (picked 2 per faction,
// SPEC §3 cultures doc) modify the empire/city economy and always carry an `affinity` field (possibly
// `{}` for the handful of affinity-neutral ones).
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  // ------------------------------------------------------------------ shared vocabulary (additive to statuses.js)
  AOW.I18n.add({
    ko: {
      'stat.hp': '체력', 'stat.def': '방어', 'stat.res': '저항', 'stat.dmg': '피해', 'stat.mp': '이동력', 'stat.morale': '사기', 'stat.ap': '행동력',
      'tier.1': '1등급', 'tier.2': '2등급', 'tier.3': '3등급', 'tier.4': '4등급', 'tier.5': '5등급',
      'role.shield': '방패병', 'role.pike': '장창병', 'role.polearm': '장병기병', 'role.shock': '돌격병', 'role.ranged': '원거리',
      'role.support': '지원', 'role.skirmisher': '척후병', 'role.mage': '전투 마법사', 'role.fighter': '전사', 'role.cavalry': '기병',
      'role.siege': '공성', 'role.hero': '영웅',
      'affinity.order': '질서', 'affinity.chaos': '혼돈', 'affinity.nature': '자연', 'affinity.materium': '물질', 'affinity.astral': '아스트랄', 'affinity.shadow': '그림자',
      'channel.physical': '물리', 'channel.fire': '화염', 'channel.frost': '냉기', 'channel.lightning': '번개', 'channel.blight': '역병', 'channel.spirit': '영혼',
      'terrain.ocean': '대양', 'terrain.coast': '연안', 'terrain.lake': '호수', 'terrain.grass': '초원', 'terrain.forest': '숲', 'terrain.hills': '구릉',
      'terrain.mountain': '산악', 'terrain.desert': '사막', 'terrain.snow': '설원', 'terrain.swamp': '늪지', 'terrain.volcanic': '화산 지대',
      'resource.gold': '금', 'resource.mana': '마나', 'resource.knowledge': '지식', 'resource.imperium': '임페리움', 'resource.food': '식량',
      'resource.production': '생산력', 'resource.draft': '징집력', 'resource.stability': '안정도', 'resource.pop': '인구',
      'kind.body': '신체 특성', 'kind.mind': '정신 특성', 'kind.society': '사회 특성',
    },
    en: {
      'stat.hp': 'Hit Points', 'stat.def': 'Defense', 'stat.res': 'Resistance', 'stat.dmg': 'Damage', 'stat.mp': 'Movement', 'stat.morale': 'Morale', 'stat.ap': 'Action Points',
      'tier.1': 'Tier I', 'tier.2': 'Tier II', 'tier.3': 'Tier III', 'tier.4': 'Tier IV', 'tier.5': 'Tier V',
      'role.shield': 'Shield', 'role.pike': 'Pike', 'role.polearm': 'Polearm', 'role.shock': 'Shock', 'role.ranged': 'Ranged',
      'role.support': 'Support', 'role.skirmisher': 'Skirmisher', 'role.mage': 'Battle Mage', 'role.fighter': 'Fighter', 'role.cavalry': 'Cavalry',
      'role.siege': 'Siege', 'role.hero': 'Hero',
      'affinity.order': 'Order', 'affinity.chaos': 'Chaos', 'affinity.nature': 'Nature', 'affinity.materium': 'Materium', 'affinity.astral': 'Astral', 'affinity.shadow': 'Shadow',
      'channel.physical': 'Physical', 'channel.fire': 'Fire', 'channel.frost': 'Frost', 'channel.lightning': 'Lightning', 'channel.blight': 'Blight', 'channel.spirit': 'Spirit',
      'terrain.ocean': 'Ocean', 'terrain.coast': 'Coast', 'terrain.lake': 'Lake', 'terrain.grass': 'Grassland', 'terrain.forest': 'Forest', 'terrain.hills': 'Hills',
      'terrain.mountain': 'Mountains', 'terrain.desert': 'Desert', 'terrain.snow': 'Snow', 'terrain.swamp': 'Swamp', 'terrain.volcanic': 'Volcanic',
      'resource.gold': 'Gold', 'resource.mana': 'Mana', 'resource.knowledge': 'Knowledge', 'resource.imperium': 'Imperium', 'resource.food': 'Food',
      'resource.production': 'Production', 'resource.draft': 'Draft', 'resource.stability': 'Stability', 'resource.pop': 'Population',
      'kind.body': 'Body Trait', 'kind.mind': 'Mind Trait', 'kind.society': 'Society Trait',
    },
  });

  // ------------------------------------------------------------------ helpers
  const T = (id, ko, en, dko, den, kind, effects, o) => Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, kind, affinity: {}, effects: effects || {}, cost: 1,
  }, o || {});

  // ================================================================ BODY TRAITS (physical) — 21
  const body = [
    T('tough', '억셈', 'Tough', '피부와 뼈대가 단단하여 모든 유닛의 방어력이 2 오릅니다.', 'Thick hide and bone: +2 Defense on all units of this form.',
      'body', { def: 2 }, { cost: 2 }),
    T('resistant', '강인한 정신', 'Resistant', '타고난 정신력으로 모든 유닛의 저항력이 2 오릅니다.', 'Innate willpower: +2 Resistance on all units of this form.',
      'body', { res: 2 }, { cost: 2 }),
    T('hearty', '튼튼함', 'Hearty', '체구가 크고 생명력이 강해 모든 유닛의 최대 체력이 10 늘어납니다.', 'A hardy constitution: +10 maximum HP on all units of this form.',
      'body', { hp: 10 }, { cost: 2 }),
    T('bulwark', '보루의 몸', 'Bulwark', '방어 태세에 들어가면 방어력·저항력이 추가로 2씩 더 오릅니다.', 'Defense Mode grants an extra +2 Defense and +2 Resistance.',
      'body', {}, { cost: 1, ability: 'bulwark' }),
    T('quick_reflexes', '재빠른 반사', 'Quick Reflexes', '반사 신경이 뛰어나 방어력과 저항력이 각각 1씩 오릅니다.', 'Sharp reflexes: +1 Defense and +1 Resistance.',
      'body', { def: 1, res: 1 }, { cost: 2 }),
    T('keen_sighted', '예리한 눈썰미', 'Keen-Sighted', '시력이 뛰어나 원거리·마법 공격의 명중률이 20 오릅니다.', 'Sharp-eyed: +20 accuracy on ranged and magic attacks.',
      'body', { accuracy: 20 }, { cost: 2 }),
    T('fast_recuperation', '빠른 회복', 'Fast Recuperation', '세계 지도에서 매 턴 체력을 5 추가로 회복합니다.', 'Recovers an extra 5 HP per turn on the world map.',
      'body', { healPerTurn: 5 }, { cost: 1 }),
    T('resolute', '흔들리지 않는 몸', 'Resolute', '몸이 단련되어 모든 속성에 대한 상태이상 저항이 1씩 오릅니다.', 'A hardened body: +1 Status Resistance against every damage channel.',
      'body', { statusRes_physical: 1, statusRes_fire: 1, statusRes_frost: 1, statusRes_lightning: 1, statusRes_blight: 1, statusRes_spirit: 1 }, { cost: 1 }),
    T('strong', '괴력', 'Strong', '팔심이 세어 근접 공격에 물리 피해 2가 추가됩니다.', 'Powerful arms: +2 Physical damage on melee attacks.',
      'body', { dmg: 2 }, { cost: 2 }),
    T('fleet_footed', '빠른 발', 'Fleet-Footed', '타고나길 발이 빨라 세계 지도 이동력과 전투 속도가 늘어납니다.', 'Naturally swift: extra world-map movement and combat speed.',
      'body', {}, { cost: 2, ability: 'fast_movement' }),
    T('cold_blooded', '냉혈', 'Cold-Blooded', '냉혈 신진대사 덕분에 역병 저항이 2 오르지만 추위에는 약합니다.', 'A cold-blooded metabolism grants +2 Blight Status Resistance, at the cost of vulnerability to cold.',
      'body', { statusRes_blight: 2 }, { cost: 1 }),
    T('underground_adaptation', '지하 적응', 'Underground Adaptation', '어둠 속에서도 앞을 볼 수 있어 지하와 어둠의 시야 페널티를 받지 않습니다.', 'Sees clearly underground: no vision penalty in darkness or below ground.',
      'body', {}, { cost: 1, ability: 'night_vision' }),
    T('amphibious_form', '수륙양용 몸', 'Amphibious Form', '물과 늪을 페널티 없이 넘나들며 승선할 필요가 없습니다.', 'Moves through water and swamp without penalty and never needs to embark.',
      'body', {}, { cost: 1, ability: 'amphibious' }),
    T('wetland_adaptation', '습지 적응', 'Wetland Adaptation', '늪지에 적응한 다리 덕분에 세계 지도 이동력이 늘어납니다.', 'Legs built for the marsh: extra world-map movement.',
      'body', { armyMove: 2 }, { cost: 1 }),
    T('mountaineer_form', '산악 체질', 'Mountaineer', '구릉과 산악을 이동 페널티 없이 넘으며 산에서 시야가 넓어집니다.', 'Crosses hills and mountains without penalty and sees further from high ground.',
      'body', {}, { cost: 1, ability: 'mountaineer' }),
    T('desert_adaptation', '사막 적응', 'Desert Adaptation', '뜨거운 모래에 적응해 화염 저항이 오르고 아지랑이 속에서도 시야가 밝습니다.', 'Adapted to burning sands: +Fire Status Resistance and clearer sight through the heat haze.',
      'body', { statusRes_fire: 3, vision: 1 }, { cost: 1 }),
    T('astral_blooded', '아스트랄 혈통', 'Astral-Blooded', '별의 정기가 흐르는 혈통으로 저항력과 영혼 저항이 오릅니다.', 'Starlight runs in the blood: +Resistance and +Spirit Status Resistance.',
      'body', { res: 1, statusRes_spirit: 2 }, { cost: 1 }),
    T('venom_blooded', '독혈', 'Venom-Blooded', '독을 지닌 몸이라 역병 저항이 크게 오르고 공격에 역병 피해가 더해집니다.', 'A venomous body: greatly increased Blight Status Resistance and attacks carry extra Blight damage.',
      'body', { statusRes_blight: 4, channelDmg_blight: 2 }, { cost: 2 }),
    T('night_hunter', '밤의 사냥꾼', 'Night Hunter', '어둠 속의 사냥꾼으로 시야가 넓고 공격에 힘이 더 실립니다.', 'A hunter of the dark: extra vision and a touch more bite to its attacks.',
      'body', { vision: 1, dmg: 1 }, { cost: 1 }),
    T('prolific', '왕성한 번식', 'Prolific', '번식력이 왕성해 이 종족이 사는 도시의 인구 성장 속도가 15% 빨라집니다.', 'Breeds prolifically: cities of this form grow population 15% faster.',
      'body', { growthPct: 15 }, { cost: 1 }),
    T('mount_masters', '기마 전통', 'Mount Masters', '말타기에 통달한 전통 덕분에 기마가 가능한 유닛들의 행군이 한결 빨라집니다.', 'A riding tradition: mountable units of this form march noticeably faster.',
      'body', { armyMove: 4 }, { cost: 2 }),
  ];

  // ================================================================ MIND TRAITS (mental/temperament) — 13
  const mind = [
    T('adaptable', '적응력', 'Adaptable', '무엇이든 빨리 배워 유닛의 경험치 획득이 30% 늘어납니다.', 'Learns quickly from anything: +30% XP gained.',
      'mind', { xpPct: 30 }, { cost: 1 }),
    T('sneaky', '교활함', 'Sneaky', '허점을 노리는 데 능해 측면 공격의 피해가 25% 늘어납니다.', 'Skilled at exploiting openings: flanking attacks deal +25% damage.',
      'mind', {}, { cost: 2, ability: 'flanker' }),
    T('tenacious', '끈질김', 'Tenacious', '쉽게 흔들리지 않는 근성으로 사기 변화가 절반으로 줄어듭니다.', 'Grim tenacity: all morale changes are halved.',
      'mind', {}, { cost: 1, ability: 'heartless' }),
    T('ferocious', '흉포함', 'Ferocious', '반격과 기회 공격에 사나움이 실려 피해가 40% 늘어납니다.', 'A ferocious streak: retaliation and opportunity attacks deal +40% damage.',
      'mind', {}, { cost: 2, ability: 'ferocious' }),
    T('arcane_focus', '비전 집중', 'Arcane Focus', '마법에 대한 타고난 감각으로 마법 공격의 피해가 25% 늘어납니다.', 'A natural sense for magic: magic attacks deal +25% damage.',
      'mind', {}, { cost: 2, ability: 'arcane_focus' }),
    T('fearless', '두려움 없음', 'Fearless', '공포를 모르는 정신으로 사기가 떨어지지 않고 공황·사기 저하에 면역입니다.', 'A fearless mind: morale never drops and it is immune to Panicked and Demoralized.',
      'mind', {}, { cost: 1, ability: 'fearless' }),
    T('nimble', '날렵한 사고', 'Nimble', '판단이 빨라 전투 속도가 1 늘어납니다.', 'Quick-witted and light on its feet: +1 combat speed.',
      'mind', { mp: 1 }, { cost: 1 }),
    T('elusive', '회피의 달인', 'Elusive', '몸을 빼는 데 능해 반격과 기회 공격에 대해 방어력·저항력이 6 오릅니다.', 'A master of slipping away: +6 Defense and Resistance against retaliation and opportunity attacks.',
      'mind', {}, { cost: 1, ability: 'elusive' }),
    T('defensive_tactics', '방어 전술', 'Defensive Tactics', '전열을 지키는 법을 알아 인접한 아군의 방어력·저항력이 1씩 오릅니다.', 'Knows how to hold a line: adjacent allies gain +1 Defense and +1 Resistance.',
      'mind', {}, { cost: 2, ability: 'guard' }),
    T('overwhelm_tactics', '제압 전술', 'Overwhelm Tactics', '이미 교전 중인 적을 노리는 데 능해 주는 피해가 10% 늘어납니다.', 'Knows how to press an advantage: deals 10% more damage overall.',
      'mind', { dmgPct: 10 }, { cost: 2 }),
    T('stalwart', '불굴의 의지', 'Stalwart', '흔들리지 않는 의지로 사기가 5 오릅니다.', 'An unshakeable will: +5 Morale.',
      'mind', { morale: 5 }, { cost: 1 }),
    T('cunning', '영악함', 'Cunning', '약점을 정확히 찔러 치명타 확률이 5% 오릅니다.', 'Strikes precisely at weak points: +5% critical chance.',
      'mind', { critChance: 5 }, { cost: 1 }),
    T('stubborn', '고집불통', 'Stubborn', '밀쳐내기에 면역이며 기절 확률이 절반으로 줄어듭니다.', 'Immune to displacement; stun chance against it is halved.',
      'mind', {}, { cost: 1, ability: 'sturdy' }),
  ];

  // ================================================================ SOCIETY TRAITS (empire, pick 2) — 25
  const society = [
    T('chosen_uniters', '선택받은 통합자', 'Chosen Uniters', '선한 세력들과 좋은 관계를 맺고 종속국에게서 추가 수입을 얻습니다.', 'Better relations with non-evil factions and bonus income from Vassals.',
      'society', { diplomacyOpinion: 15, goldPct: 5 }, { cost: 1, affinity: { order: 1 } }),
    T('devotees_of_good', '선의 신봉자', 'Devotees of Good', '선한 성향에 비례해 안정도와 임페리움을 얻고, 지원·장병기 유닛이 한 등급 높은 계급으로 시작합니다.', 'Gains Stability and Imperium scaling with Good alignment; Support and Polearm units start at a higher rank.',
      'society', { stability: 15, imperium: 5, rankUp: 1 }, { cost: 1, affinity: { order: 1 } }),
    T('imperialists', '제국주의자', 'Imperialists', '수도와 국경을 맞댄 모든 도시의 안정도와 금 수입이 늘어납니다.', 'Every city bordering the Capital gains extra Stability and Gold.',
      'society', { stability: 10, gold: 10 }, { cost: 1, affinity: { order: 1 } }),
    T('chosen_destroyers', '선택받은 파괴자', 'Chosen Destroyers', '점령한 도시를 파괴할 때마다 영구적인 수입이 늘어납니다.', 'Razing a captured city grants a permanent boost to income.',
      'society', { goldPct: 5, warScore: 5 }, { cost: 1, affinity: { chaos: 1 } }),
    T('ruthless_raiders', '무자비한 습격자', 'Ruthless Raiders', '전투에서 적을 처치할 때마다 가장 가까운 도시가 금과 징집력을 얻습니다.', 'Killing an enemy in battle grants Gold and Draft to the nearest city.',
      'society', { gold: 5, draft: 5 }, { cost: 1, affinity: { chaos: 1 } }),
    T('cult_of_personality', '개인 숭배', 'Cult of Personality', '군주를 중심으로 뭉친 제국으로 안정도와 임페리움이 늘어납니다.', 'An empire built around its ruler: extra Stability and Imperium.',
      'society', { imperium: 5, stability: 5 }, { cost: 1, affinity: { chaos: 1 } }),
    T('fabled_hunters', '전설의 사냥꾼', 'Fabled Hunters', '사냥으로 얻는 식량이 늘고 자유도시와의 관계가 좋아집니다.', 'More Food from hunting and better relations with Free Cities.',
      'society', { food: 5, diplomacyOpinion: 10 }, { cost: 1, affinity: { nature: 1 } }),
    T('prolific_swarmers', '왕성한 번식자', 'Prolific Swarmers', '인구 성장이 빨라지고 마법 기원이 아닌 유닛의 유지비가 줄어듭니다.', 'Faster population growth and lower upkeep for non-Magic-Origin units.',
      'society', { growthPct: 15, upkeepPct: -10 }, { cost: 1, affinity: { nature: 1 } }),
    T('druidic_terraformers', '드루이드 지형술사', 'Druidic Terraformers', '지형에 맞춰 식량·생산력이 늘고 지형술 주문의 비용이 줄어듭니다.', 'Bonus Food and Production tied to terrain, and cheaper terraforming spells.',
      'society', { foodPct: 10, productionPct: 10, spellCostPct: -15 }, { cost: 1, affinity: { nature: 1 } }),
    T('scions_of_evil', '악의 후예', 'Scions of Evil', '악한 성향에 비례해 징집력과 임페리움을 얻습니다.', 'Gains Draft and Imperium scaling with Evil alignment.',
      'society', { draft: 10, imperium: 5 }, { cost: 1, affinity: { shadow: 1 } }),
    T('silver_tongued', '능란한 언변', 'Silver Tongued', '외교 관계가 크게 좋아지고 자유도시와의 거래가 유리해집니다.', 'Greatly improved diplomatic relations and favorable trades with Free Cities.',
      'society', { diplomacyOpinion: 20 }, { cost: 1, affinity: { shadow: 1 } }),
    T('talented_collectors', '재능 있는 수집가', 'Talented Collectors', '마법 재료에서 얻는 이득이 늘어납니다.', 'Greater benefit from owned magic materials.',
      'society', { gold: 10 }, { cost: 1, affinity: { shadow: 1 } }),
    T('great_builders', '위대한 건축가', 'Great Builders', '생산력이 늘고 지방 개발 비용이 줄어듭니다.', 'Extra Production and cheaper province improvements.',
      'society', { productionPct: 10, provinceCostPct: -15 }, { cost: 1, affinity: { materium: 1 } }),
    T('perfectionist_artisans', '완벽주의 장인', 'Perfectionist Artisans', '건물을 더 튼튼하게 지어 완공될 때마다 안정도와 금을 얻습니다.', 'Builds structures to a higher standard: extra Stability and Gold on completion.',
      'society', { stability: 5, goldPct: 5 }, { cost: 1, affinity: { materium: 1 } }),
    T('runesmiths', '룬 대장장이', 'Runesmiths', '유닛 마법 부여의 연구·유지 비용이 크게 줄어듭니다.', 'Much cheaper research and upkeep for unit enchantments.',
      'society', { spellCostPct: -15, upkeepPct: -10 }, { cost: 1, affinity: { materium: 1 } }),
    T('ancient_wise_ones', '고대의 현자', 'Ancient Wise Ones', '지식 수입이 늘어납니다.', 'Extra Knowledge income.',
      'society', { knowledgePct: 10 }, { cost: 1, affinity: { astral: 1 } }),
    T('mana_channelers', '마나 전도사', 'Mana Channelers', '마나 수입이 크게 늘어납니다.', 'Greatly increased Mana income.',
      'society', { manaPct: 15 }, { cost: 1, affinity: { astral: 1 } }),
    T('powerful_evokers', '강력한 시전자', 'Powerful Evokers', '전투 시전 점수가 늘고 전투 마법사·지원 유닛이 한 등급 높게 시작합니다.', 'More Combat Casting Points and Battle Mage/Support units start at a higher rank.',
      'society', { combatCasting: 5, rankUp: 1 }, { cost: 1, affinity: { astral: 1 } }),
    T('adept_settlers', '노련한 정착민', 'Adept Settlers', '도시 상한이 늘고 새 도시를 세우는 비용이 줄어듭니다.', 'Higher city cap and cheaper city founding.',
      'society', { cityCap: 1, provinceCostPct: -10 }, { cost: 1, affinity: {} }),
    T('experienced_seafarers', '노련한 뱃사람', 'Experienced Seafarers', '해안 지방의 수입이 늘고 승선한 유닛이 더 강해집니다.', 'More income from coastal provinces and stronger embarked units.',
      'society', { gold: 5, xpPct: 10 }, { cost: 1, affinity: { nature: 1 } }),
    T('artifact_hoarders', '유물 수집가', 'Artifact Hoarders', '보관함에 잠들어 있는 영웅 아이템마다 마나 수입을 얻습니다.', 'Gains Mana income for every unequipped hero item in the inventory.',
      'society', { mana: 5 }, { cost: 1, affinity: { materium: 1 } }),
    T('bannerlords', '군기의 영주', 'Bannerlords', '징집이 빨라지고 유닛 모집 비용이 줄어듭니다.', 'Faster conscription and cheaper unit recruitment.',
      'society', { draft: 10, recruitCostPct: -10 }, { cost: 1, affinity: { order: 1 } }),
    T('swift_marchers', '신속한 행군자', 'Swift Marchers', '전군의 행군 속도가 처음부터 빨라집니다.', 'The whole army marches faster from the very first turn.',
      'society', { armyMove: 4 }, { cost: 1, affinity: { chaos: 1 } }),
    T('delvers_of_the_deep', '심연의 개척자', 'Delvers of the Deep', '지하 개척에 능해 생산력과 지하 시야가 늘어납니다.', 'Skilled at delving underground: extra Production and vision below ground.',
      'society', { productionPct: 5, vision: 1 }, { cost: 1, affinity: { materium: 1 } }),
    T('prophecy_of_the_chosen', '선택받은 자의 예언', 'Prophecy of the Chosen', '군주의 운명이 제국을 이끌어 경험치와 외교 관계가 함께 오릅니다.', 'The ruler\'s destiny guides the empire: bonus XP and diplomatic standing.',
      'society', { xpPct: 15, diplomacyOpinion: 10 }, { cost: 1, affinity: { astral: 1 } }),
  ];

  for (const t of [...body, ...mind, ...society]) Data.define('traits', t);
})(window.AOW = window.AOW || {});
