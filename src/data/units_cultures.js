// src/data/units_cultures.js — culture unit rosters (SPEC §3, §3.0) + hero base units
//
// Every unit here is built by U(cultureId, snakeCaseName, ko, en, descKo, descEn, opts) which fills in
// cost/upkeep from tier, movement mp from move class, and registers under id `${cultureId}_${snakeCaseName}`.
// `attacks` are plain inline attack objects (not a Data registry — free to invent). `abilities`/`passives`
// reference existing ids from src/data/abilities.js wherever the flavor matches (most of it was written to
// be reused this way); a handful of unit-specific extras are added here with id 'ab_<unit>_<name>' via X().
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  // ------------------------------------------------------------------ helpers
  const TIER_COST = {
    1: { gold: 70, draft: 10 },
    2: { gold: 125, draft: 20 },
    3: { gold: 215, draft: 30 },
    4: { gold: 350, draft: 40 },
    5: { gold: 600, draft: 50 },
  };

  /** one inline attack entry (SPEC §3 units.attacks) */
  const A = (id, ko, en, o) => Object.assign({
    id, name: { ko, en }, type: 'melee', damage: 12, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, effects: [],
  }, o);

  /** builds (does not register) one culture unit */
  function U(cultureId, snake, ko, en, dko, den, o) {
    const id = cultureId + '_' + snake;
    const tier = o.tier;
    const tc = TIER_COST[tier];
    const cost = Object.assign({ gold: tc.gold, mana: 0, draft: tc.draft }, o.cost || {});
    const upkeep = o.upkeep || { gold: Math.max(1, Math.round(cost.gold * 0.1)), mana: 0 };
    const move = o.move || 'walk';
    const mp = o.mp != null ? o.mp : (move === 'walk' ? 32 : 40);
    return {
      id, name: { ko, en }, desc: { ko: dko, en: den }, tier, role: o.role,
      tags: o.tags || [], move, mp,
      source: { type: 'culture', id: cultureId },
      cost, upkeep,
      hp: o.hp, def: o.def, res: o.res, morale: o.morale || 0,
      attacks: o.attacks || [], abilities: o.abilities || [], passives: o.passives || [],
      statusRes: o.statusRes || {}, look: o.look,
    };
  }

  /** registers a unit-specific extra passive ability (SPEC §3.0: id prefix ab_<unit>_<name>) */
  const X = (id, ko, en, dko, den, o) => Data.define('abilities', Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, kind: 'passive', ap: 0, cooldown: 0, range: 0, target: 'self', area: 0, icon: id,
    effect: { type: 'passive', rule: id },
  }, o));

  // ================================================================ FEUDAL — knights, peasants, banners (Order/Materium)
  const FEUDAL = [
    U('feudal', 'scout', '정찰병', 'Scout', '영지의 국경을 살피는 가벼운 기수. 전투보다는 시야 확보에 능하다.',
      'A light rider who watches the realm\'s borders, better at scouting than at a stand-up fight.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'], move: 'mounted',
        hp: 45, def: 0, res: 0,
        attacks: [A('shoot_bow', '활 사격', 'Shoot Bow', { type: 'ranged', range: 5, damage: 8 })],
        passives: ['farsight'], abilities: ['defend'],
        look: { body: 'horse_rider', armor: 'cloth', weapon: 'bow', helm: 'hood', cape: false, size: 'medium' },
      }),
    U('feudal', 'peasant_pikemen', '농민 창병', 'Peasant Pikemen', '급히 소집된 농민들이 긴 창을 세워 방진을 짜고 기병의 돌격을 막아선다.',
      'Hastily levied farmhands who brace long pikes in a hedge no charge breaks easily.', {
        tier: 1, role: 'pike', tags: ['racial', 'infantry'],
        hp: 65, def: 2, res: 1,
        attacks: [A('pike_thrust', '창 찌르기', 'Pike Thrust', { damage: 13 })],
        passives: ['first_strike', 'pike_brace'], abilities: ['defend'],
        look: { body: 'form', armor: 'cloth', weapon: 'pike', helm: 'cap', cape: false, shield: 'none', size: 'medium' },
      }),
    U('feudal', 'archer', '궁수', 'Archer', '대열 뒤에서 장궁을 당겨 적을 쏘아 맞히는 봉건 궁수.',
      'A Feudal bowman who volleys arrows from behind the battle line.', {
        tier: 1, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 50, def: 0, res: 0,
        attacks: [A('shoot_bow', '활 사격', 'Shoot Bow', { type: 'ranged', range: 5, damage: 12 })],
        abilities: ['defend'],
        look: { body: 'form', armor: 'cloth', weapon: 'bow', helm: 'hood', cape: false, size: 'medium' },
      }),
    U('feudal', 'defender', '수호병', 'Defender', '무거운 방패 뒤에 몸을 숨긴 채 전열을 지키는 봉건의 방패병.',
      'A man-at-arms who shelters behind a heavy shield and refuses to give ground.', {
        tier: 1, role: 'shield', tags: ['racial', 'infantry'],
        hp: 70, def: 2, res: 1,
        attacks: [A('sword_strike', '검격', 'Sword Strike', { damage: 12 })],
        passives: ['shield_wall'], abilities: ['defend'],
        look: { body: 'form', armor: 'chain', weapon: 'sword_shield', helm: 'open', cape: false, shield: 'kite', size: 'medium' },
      }),
    U('feudal', 'bannerman', '기수', 'Bannerman', '군기를 높이 들어 전열을 격려하고 부상병을 다독이는 지원병.',
      'Carries the faction banner high, rallying the line and tending the wounded.', {
        tier: 2, role: 'support', tags: ['racial', 'support'],
        hp: 70, def: 2, res: 3,
        attacks: [A('mace_strike', '철퇴 타격', 'Mace Strike', { damage: 12 })],
        abilities: ['bulwark_standard', 'soothing_standard', 'defend'],
        look: { body: 'form', armor: 'plate', weapon: 'banner', helm: 'open', cape: 'long', size: 'medium' },
      }),
    U('feudal', 'aspirant_knight', '견습 기사', 'Aspirant Knight', '기사 서임을 꿈꾸며 말 위에서 돌격창을 익히는 견습생.',
      'A knight-in-training who has learned to couch a lance and ride down the enemy line.', {
        tier: 2, role: 'shock', tags: ['racial', 'cavalry'], move: 'mounted',
        hp: 80, def: 3, res: 2,
        attacks: [A('lance_strike', '돌격창', 'Lance Strike', { damage: 18 })],
        passives: ['charge', 'slippery'], abilities: ['defend'],
        look: { body: 'horse_rider', armor: 'chain', weapon: 'lance', helm: 'full', cape: 'short', shield: 'kite', size: 'medium' },
      }),
    U('feudal', 'longbow', '장궁병', 'Longbow', '견습 궁수가 계급을 올려 얻은 장궁으로, 먼 거리에서 적을 꿰뚫는다.',
      'A promoted archer whose longbow drives shafts clean through distant foes.', {
        tier: 3, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 75, def: 1, res: 1,
        attacks: [A('longbow_shot', '장궁 사격', 'Longbow Shot', { type: 'ranged', range: 6, damage: 20, accuracy: 90 })],
        passives: ['ranged_expert'], abilities: ['defend'],
        look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'cap', cape: 'short', size: 'medium' },
      }),
    U('feudal', 'liege_guard', '영주 근위대', 'Liege Guard', '수호병 중에서도 영주를 지키도록 발탁된 정예 근위병.',
      'A Defender raised to elite status, sworn to guard the liege\'s own person.', {
        tier: 3, role: 'shield', tags: ['racial', 'infantry'],
        hp: 95, def: 4, res: 2,
        attacks: [A('sword_strike', '검격', 'Sword Strike', { damage: 16 })],
        passives: ['shield_wall', 'guard'], abilities: ['defend', 'taunt'],
        look: { body: 'form', armor: 'plate', weapon: 'sword_shield', helm: 'full', cape: 'short', shield: 'tower', size: 'medium' },
      }),
    U('feudal', 'knight', '기사', 'Knight', '완전무장한 채 군마에 올라 창을 꼬나쥔 봉건의 정예 중기병.',
      'A fully armored elite heavy cavalryman who levels a lance and answers to no one but the crown.', {
        tier: 4, role: 'shock', tags: ['racial', 'cavalry'], move: 'mounted',
        hp: 135, def: 4, res: 3,
        attacks: [A('heavy_lance_charge', '중기병 돌격', 'Heavy Lance Charge', { damage: 26 })],
        passives: ['charge', 'cavalry_charge', 'slippery'], abilities: ['defend', 'inspire_morale'],
        look: { body: 'horse_rider', armor: 'heavy_plate', weapon: 'lance', helm: 'full', cape: 'long', shield: 'kite', size: 'large' },
      }),
  ];
  for (const u of FEUDAL) Data.define('units', u);

  // ================================================================ HIGH — the awakened, sun-lit lords (Order)
  const HIGH = [
    U('high', 'lightseeker', '빛추적자', 'Lightseeker', '흰 준마를 탄 채 빛을 좇아 먼 곳까지 살피는 고귀의 정찰병.',
      'A rider on a white steed who chases the light to scout the farthest reaches.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'], move: 'mounted',
        hp: 45, def: 0, res: 0,
        attacks: [A('shoot_bow', '활 사격', 'Shoot Bow', { type: 'ranged', range: 5, damage: 7 })],
        passives: ['farsight'], abilities: ['defend'],
        look: { body: 'horse_rider', armor: 'cloth', weapon: 'bow', helm: 'circlet', cape: false, size: 'medium', element: 'holy' },
      }),
    U('high', 'dawn_defender', '여명 수호병', 'Dawn Defender', '햇살무늬가 새겨진 도금 방패를 든 채 전열을 지키는 방패병. 아직 잠들어 있는 빛을 품고 있다.',
      'Holds a gilded sunburst shield to guard the line, its inner light still Dormant.', {
        tier: 1, role: 'shield', tags: ['racial', 'infantry'],
        hp: 70, def: 5, res: 0,
        attacks: [A('spear_thrust', '창 찌르기', 'Spear Thrust', { damage: 11 })],
        passives: ['shield_wall'], abilities: ['defend'],
        look: { body: 'form', armor: 'plate', weapon: 'spear_shield', helm: 'open', cape: 'short', shield: 'kite', size: 'medium', element: 'holy' },
      }),
    U('high', 'dusk_hunter', '황혼 사냥꾼', 'Dusk Hunter', '상아빛과 청록빛 옷을 두르고 우아한 장궁으로 적을 노리는 궁수.',
      'A hooded archer in ivory and teal who looses arrows from a tall elegant bow.', {
        tier: 1, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 50, def: 0, res: 0,
        attacks: [A('shoot_bow', '활 사격', 'Shoot Bow', { type: 'ranged', range: 5, damage: 12 })],
        abilities: ['defend'],
        look: { body: 'form', armor: 'cloth', weapon: 'bow', helm: 'hood', cape: 'short', size: 'medium', element: 'holy' },
      }),
    U('high', 'sun_priest', '태양 사제', 'Sun Priest', '금빛 태양 지팡이를 든 사제로, 잠든 동료를 각성시켜 빛의 힘을 깨운다.',
      'A priest with a gold sun-disc staff who awakens dormant allies to their inner light.', {
        tier: 2, role: 'support', tags: ['racial', 'support', 'magic_origin'],
        hp: 60, def: 1, res: 3,
        attacks: [A('cosmic_blast', '천체 폭발', 'Cosmic Blast', { type: 'ranged', range: 4, channel: 'spirit', damage: 16 })],
        abilities: ['awaken', 'mending_awakening', 'defend'],
        look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'circlet', cape: 'long', size: 'medium', element: 'holy', glow: '#ffe9a8' },
      }),
    U('high', 'daylight_spear', '광휘 창병', 'Daylight Spear', '도금된 미늘갑을 두르고 창을 겨눈 채 돌격을 저지하는 창병.',
      'A gilded lamellar spearman who braces against any charge.', {
        tier: 2, role: 'pike', tags: ['racial', 'infantry'],
        hp: 75, def: 3, res: 2,
        attacks: [A('spear_thrust', '창 찌르기', 'Spear Thrust', { damage: 14 })],
        passives: ['first_strike', 'pike_brace'], abilities: ['defend'],
        look: { body: 'form', armor: 'plate', weapon: 'spear', helm: 'open', cape: 'short', size: 'medium', element: 'holy' },
      }),
    U('high', 'awakener', '각성사', 'Awakener', '두 개의 빛 구슬을 곁에 띄운 금욕적인 마법사로, 동료를 한꺼번에 각성시킨다.',
      'An ascetic mage trailing two orbiting light-orbs who awakens allies two at a time.', {
        tier: 3, role: 'mage', tags: ['racial', 'magic_origin', 'support'],
        hp: 80, def: 2, res: 4,
        attacks: [A('spirit_bolt', '영혼 화살', 'Spirit Bolt', { type: 'ranged', range: 4, channel: 'spirit', damage: 14 })],
        abilities: ['twin_awakening', 'exposing_light', 'defend'],
        look: { body: 'form', armor: 'robe', weapon: 'orb', helm: 'circlet', cape: 'long', size: 'medium', element: 'holy', glow: '#ffe9a8' },
      }),
  ];
  for (const u of HIGH) Data.define('units', u);

  // ================================================================ BARBARIAN — furs, war-paint and bronze (Chaos/Nature)
  const BARBARIAN = [
    U('barbarian', 'pathfinder', '길잡이', 'Pathfinder', '털가죽을 두르고 조랑말에 올라 사냥용 활로 무장한 야만 부족의 척후병.',
      'A fur-clad rider on a shaggy pony armed with a hunting bow.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'], move: 'mounted',
        hp: 45, def: 0, res: 0,
        attacks: [A('hunting_bow', '사냥용 활', 'Hunting Bow', { type: 'ranged', range: 5, damage: 8 })],
        passives: ['farsight', 'fast_movement'], abilities: ['outpost_builder', 'defend'],
        look: { body: 'horse_rider', armor: 'leather', weapon: 'bow', helm: 'none', cape: false, size: 'medium' },
      }),
    U('barbarian', 'warrior', '전사', 'Warrior', '둥근 가죽 방패와 손도끼를 든 채 뿔 투구를 쓴 부족의 전열 전사.',
      'A round-shield-and-hatchet fighter in a horned or antlered helm, six to a squad.', {
        tier: 1, role: 'shield', tags: ['racial', 'infantry'],
        hp: 70, def: 2, res: 0,
        attacks: [A('axe_strike', '도끼질', 'Axe Strike', { damage: 12 })],
        abilities: ['shield_bash', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'axe', helm: 'horned', cape: false, shield: 'round', size: 'medium' },
      }),
    U('barbarian', 'sunderer', '파쇄자', 'Sunderer', '전쟁 물감을 칠한 맨팔로 손도끼와 투창 다발을 던져 적의 갑옷을 부순다.',
      'War-painted and bare-armed, hurling hand-axes and javelins that sunder armor.', {
        tier: 1, role: 'skirmisher', tags: ['racial', 'infantry'],
        hp: 55, def: 1, res: 1,
        attacks: [A('javelin', '투창', 'Javelin', { type: 'ranged', range: 3, damage: 12 })],
        passives: ['swift', 'slippery'], abilities: ['sunder_strike', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'axe', helm: 'none', cape: false, size: 'medium' },
      }),
    U('barbarian', 'fury', '격노병', 'Fury', '거대한 합성궁을 당기며 싸울수록 더 강해지는 야성의 궁수.',
      'A wild archer with a huge composite bow who grows stronger with every shot.', {
        tier: 2, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 60, def: 1, res: 1,
        attacks: [A('composite_bow', '합성궁', 'Composite Bow', { type: 'ranged', range: 5, damage: 14 })],
        passives: ['frenzy'], abilities: ['defend'],
        look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'none', cape: false, size: 'medium' },
      }),
    U('barbarian', 'war_shaman', '전쟁 주술사', 'War Shaman', '뼈 장식 지팡이를 든 주술사로, 저주를 걷어내고 전열을 강화한다.',
      'A bone-staff shaman who lifts curses from allies and hardens them for the fight.', {
        tier: 2, role: 'support', tags: ['racial', 'support'],
        hp: 60, def: 1, res: 3, statusRes: { blight: 2 },
        attacks: [A('blight_touch', '역병의 손길', 'Blight Touch', { type: 'ranged', range: 3, channel: 'blight', damage: 10, effects: [{ status: 'poisoned', chance: 40 }] })],
        abilities: ['cleanse', 'bolster', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'staff', helm: 'horned', cape: false, size: 'medium', element: 'nature' },
      }),
    U('barbarian', 'berserker', '광전사', 'Berserker', '곰 가죽을 두르고 양손도끼를 휘두르는 거대한 전사. 죽음을 앞두고 오히려 사나워진다.',
      'A huge bear-pelted warrior with a two-handed axe who grows fiercer as death nears.', {
        tier: 3, role: 'shock', tags: ['racial', 'infantry'],
        hp: 90, def: 3, res: 3, statusRes: { blight: 3 },
        attacks: [A('great_axe_swing', '거대 도끼 휘두르기', 'Great Axe Swing', { damage: 24 })],
        passives: ['frenzy'], abilities: ['unbreakable', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'great_axe', helm: 'horned', cape: false, size: 'medium', tint: '#8a2020' },
      }),
  ];
  for (const u of BARBARIAN) Data.define('units', u);

  // ================================================================ INDUSTRIOUS — forges, brass and tower shields (Materium)
  const INDUSTRIOUS = [
    U('industrious', 'pioneer', '개척자', 'Pioneer', '짐말을 끄는 다부진 정찰병으로, 등에 곡괭이를 메고 지방을 탐사해 숨은 자원을 캔다.',
      'A stocky prospector who surveys provinces for hidden Gold or Production.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'], move: 'mounted',
        hp: 45, def: 1, res: 0,
        attacks: [A('light_crossbow', '소형 석궁', 'Light Crossbow', { type: 'ranged', range: 4, damage: 7 })],
        passives: ['farsight'], abilities: ['prospect', 'defend'],
        look: { body: 'horse_rider', armor: 'leather', weapon: 'crossbow', helm: 'cap', cape: false, size: 'medium' },
      }),
    U('industrious', 'anvil_guard', '모루 수호병', 'Anvil Guard', '모루 문장이 새겨진 탑방패를 든 방패병으로, 얻어맞을수록 더 단단해진다.',
      'A tower-shield defender bearing the anvil crest, hardening with every blow it takes.', {
        tier: 1, role: 'shield', tags: ['racial', 'infantry'],
        hp: 70, def: 6, res: 1,
        attacks: [A('warhammer_strike', '전투망치 타격', 'Warhammer Strike', { damage: 12 })],
        passives: ['bolstering'], abilities: ['taunt', 'defend'],
        look: { body: 'form', armor: 'heavy_plate', weapon: 'hammer', helm: 'full', cape: false, shield: 'tower', size: 'medium' },
      }),
    U('industrious', 'arbalest', '강노병', 'Arbalest', '등에 강철 파비스를 짊어진 중석궁병으로, 갑옷을 꿰뚫는 볼트를 쏜다.',
      'A heavy crossbowman with a steel pavise on his back who fires armor-piercing bolts.', {
        tier: 1, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 55, def: 2, res: 1,
        attacks: [A('heavy_bolt', '중석궁 볼트', 'Heavy Bolt', { type: 'ranged', range: 4, damage: 12, props: ['ignore_half_def'] })],
        passives: ['bolstering'], abilities: ['defend'],
        look: { body: 'form', armor: 'chain', weapon: 'crossbow', helm: 'cap', cape: false, size: 'medium' },
      }),
    U('industrious', 'halberdier', '미늘창병', 'Halberdier', '놋쇠 못을 박은 전신 갑주를 두르고 미늘창을 겨눈 채, 근접한 적에게 반드시 되갚아준다.',
      'A brass-riveted plate halberdier who always strikes back at whoever reaches him.', {
        tier: 2, role: 'polearm', tags: ['racial', 'infantry'],
        hp: 75, def: 3, res: 2,
        attacks: [A('halberd_strike', '미늘창 베기', 'Halberd Strike', { damage: 14 })],
        passives: ['first_strike', 'retaliation'], abilities: ['defend'],
        look: { body: 'form', armor: 'heavy_plate', weapon: 'halberd', helm: 'full', cape: false, size: 'medium' },
      }),
    U('industrious', 'steelshaper', '강철 조형사', 'Steelshaper', '놋쇠 장갑을 낀 대장로, 룬이 새겨진 망치로 아군의 방어 강화를 체력과 힘으로 바꾼다.',
      'A brass-gauntleted forge-priest who converts an ally\'s stacked defenses into healing and strength.', {
        tier: 2, role: 'support', tags: ['racial', 'support'],
        hp: 60, def: 2, res: 3,
        attacks: [A('forge_bolt', '단조 화살', 'Forge Bolt', { type: 'ranged', range: 3, channel: 'lightning', damage: 12 })],
        abilities: ['grant_defense', 'strength_from_steel', 'defend'],
        look: { body: 'form', armor: 'plate', weapon: 'hammer', helm: 'open', cape: false, size: 'medium', element: 'lightning' },
      }),
    U('industrious', 'bastion', '보루병', 'Bastion', '거대한 탑방패와 육중한 철퇴를 든 부동의 방패병. 성벽처럼 자리를 지킨다.',
      'An immovable defender with an enormous tower shield and maul, standing like a wall.', {
        tier: 3, role: 'shield', tags: ['racial', 'infantry'],
        hp: 100, def: 7, res: 3,
        attacks: [A('maul_strike', '육중한 철퇴', 'Maul Strike', { damage: 18 })],
        passives: ['shield_wall', 'bulwark', 'sturdy'], abilities: ['taunt', 'defend'],
        look: { body: 'form', armor: 'heavy_plate', weapon: 'mace', helm: 'full', cape: false, shield: 'tower', size: 'medium' },
      }),
  ];
  for (const u of INDUSTRIOUS) Data.define('units', u);

  // ================================================================ MYSTIC — crystal, starlight and projections (Astral)
  const MYSTIC = [
    U('mystic', 'mystic_projection', '신비한 영상', 'Mystic Projection', '로브 입은 마법사의 반투명한 영상이 빛을 흩날리며 떠다닌다. 도시를 점령할 수 없다.',
      'A translucent astral image of a robed mage, trailing light as it hovers. Cannot take cities.', {
        tier: 1, role: 'scout', tags: ['racial', 'magic_origin', 'floating'], move: 'float',
        hp: 40, def: 0, res: 2,
        attacks: [A('astral_bolt', '아스트랄 화살', 'Astral Bolt', { type: 'ranged', range: 4, channel: 'lightning', damage: 6, accuracy: 90 })],
        passives: ['floating', 'farsight', 'ethereal'], abilities: ['defend'],
        look: { body: 'form', armor: 'robe', weapon: 'orb', helm: 'none', cape: 'long', size: 'medium', element: 'arcane', glow: '#9ab0ff', tint: '#9ab0ff' },
      }),
    U('mystic', 'arcanist', '비전학자', 'Arcanist', '떠다니는 룬 서책과 함께 훈련하는 세 명의 견습 마법사 무리.',
      'A squad of three junior mages drilling with floating rune-tomes.', {
        tier: 1, role: 'mage', tags: ['racial', 'magic_origin', 'ranged'],
        hp: 45, def: 0, res: 2,
        attacks: [A('arcane_bolt', '비전 화살', 'Arcane Bolt', { type: 'ranged', range: 4, channel: 'lightning', damage: 12, accuracy: 90 })],
        abilities: ['defend'],
        look: { body: 'form', armor: 'robe', weapon: 'tome', helm: 'none', cape: 'short', size: 'medium', element: 'arcane' },
      }),
    U('mystic', 'warder', '결계병', 'Warder', '마력이 깃든 창을 겨눈 채 대열을 지키는 신비 문화의 창병.',
      'A spear-wielding line-holder whose weapon crackles with warding magic.', {
        tier: 1, role: 'pike', tags: ['racial', 'infantry', 'magic_origin'],
        hp: 65, def: 2, res: 2,
        attacks: [A('warded_spear', '결계의 창', 'Warded Spear', { damage: 12 })],
        passives: ['first_strike', 'attunement'], abilities: ['defend'],
        look: { body: 'form', armor: 'chain', weapon: 'spear', helm: 'hood', cape: false, size: 'medium', element: 'arcane' },
      }),
    U('mystic', 'spellshield', '마법방패병', 'Spellshield', '마력을 흡수하는 방패를 들고 날렵한 준마를 탄 기마 방패병.',
      'A mounted shield-bearer whose blade-mace and shield drink in hostile magic.', {
        tier: 2, role: 'shield', tags: ['racial', 'cavalry', 'magic_origin'], move: 'mounted',
        hp: 80, def: 6, res: 2,
        attacks: [A('mace_strike', '철퇴 타격', 'Mace Strike', { damage: 13 })],
        passives: ['shield_wall', 'fast_movement', 'attunement'], abilities: ['defend'],
        look: { body: 'horse_rider', armor: 'chain', weapon: 'mace', helm: 'open', cape: 'short', shield: 'round', size: 'medium', element: 'arcane' },
      }),
    U('mystic', 'soother', '진정술사', 'Soother', '수정 구슬을 감싸쥔 순수한 치유사로, 함께하는 동안 전투 주문이 저렴해진다.',
      'A pure healer cradling a crystal orb; combat spells cost less while it stands.', {
        tier: 2, role: 'support', tags: ['racial', 'support', 'magic_origin'],
        hp: 55, def: 0, res: 3,
        attacks: [A('orb_pulse', '구슬 파동', 'Orb Pulse', { type: 'ranged', range: 3, channel: 'lightning', damage: 8 })],
        abilities: ['cleanse', 'heal_wounds', 'defend'],
        look: { body: 'form', armor: 'robe', weapon: 'orb', helm: 'none', cape: 'long', size: 'medium', element: 'arcane' },
      }),
    U('mystic', 'spellbreaker', '마법파괴자', 'Spellbreaker', '떠다니는 수정 파편에 둘러싸인 마법사로, 별빛 폭발로 적의 강화 효과를 모두 벗겨낸다.',
      'A mage ringed by orbiting crystal shards whose starburst strips every buff it touches.', {
        tier: 3, role: 'mage', tags: ['racial', 'magic_origin', 'ranged'],
        hp: 80, def: 2, res: 4,
        attacks: [A('arcane_bolt', '비전 화살', 'Arcane Bolt', { type: 'ranged', range: 4, channel: 'lightning', damage: 16, accuracy: 90 })],
        passives: ['attunement'], abilities: ['star_purge', 'defend'],
        look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'none', cape: 'long', size: 'medium', element: 'arcane', glow: '#9ab0ff' },
      }),
    U('mystic', 'summoner', '소환사', 'Summoner', '열린 책과 작은 아스트랄 차원문을 곁에 둔 소환술사로, 전투 중 아스트랄 생물을 불러낸다.',
      'A conjurer with an open book and a small astral portal, calling creatures into the fight.', {
        tier: 3, role: 'support', tags: ['racial', 'support', 'magic_origin'],
        hp: 70, def: 1, res: 4,
        attacks: [A('staff_strike', '지팡이 타격', 'Staff Strike', { damage: 8 })],
        passives: ['astral_resonance'], abilities: ['summon_wolf', 'defend'],
        look: { body: 'form', armor: 'robe', weapon: 'tome', helm: 'none', cape: 'long', size: 'medium', element: 'arcane' },
      }),
  ];
  for (const u of MYSTIC) Data.define('units', u);

  // ================================================================ DARK — gothic tyranny, frost and shadow (Shadow)
  X('ab_dark_night_guard_dread_aura', '전율의 기운', 'Dread Aura', '매 턴 종료 시 인접한 적에게 30% 확률로 방어 분쇄를 겁니다.',
    'At the end of each turn, adjacent enemies have a 30% chance to suffer Sundered Defense.',
    { effect: { type: 'passive', rule: 'aura', status: 'sundered', radius: 1, chance: 30, side: 'enemy' } });

  const DARK = [
    U('dark', 'outrider', '선발기수', 'Outrider', '붉게 빛나는 눈의 검은 말을 탄 정찰병으로, 적지 깊숙이 잠입해 발각되지 않는다.',
      'A rider on a red-eyed black horse who slips deep into enemy land undetected.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'], move: 'mounted',
        hp: 45, def: 0, res: 0,
        attacks: [A('shoot_bow', '활 사격', 'Shoot Bow', { type: 'ranged', range: 5, damage: 6 })],
        passives: ['farsight', 'night_vision', 'infiltrate'], abilities: ['defend'],
        look: { body: 'horse_rider', armor: 'leather', weapon: 'bow', helm: 'hood', cape: 'short', size: 'medium', tint: '#2a1a2a' },
      }),
    U('dark', 'pursuer', '추적자', 'Pursuer', '표정 없는 흰 가면을 쓴 궁수로, 이미 약해진 적을 집요하게 노린다.',
      'A masked archer behind a featureless white mask, singling out the already Weakened.', {
        tier: 1, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 50, def: 0, res: 0,
        attacks: [A('shoot_bow', '활 사격', 'Shoot Bow', { type: 'ranged', range: 5, damage: 10 })],
        passives: ['cull_the_weak'], abilities: ['defend'],
        look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood', cape: false, size: 'medium', tint: '#2a1a2a' },
      }),
    U('dark', 'dark_warrior', '암흑 전사', 'Dark Warrior', '뾰족한 견갑을 단 채 톱니 검을 쥐고 돌격하는 가녀린 전사.',
      'A spiked-pauldroned fighter who rushes in with a serrated blade, fragile but fast.', {
        tier: 1, role: 'shock', tags: ['racial', 'infantry'],
        hp: 60, def: 1, res: 1,
        attacks: [A('serrated_blade', '톱니 검', 'Serrated Blade', { damage: 14 })],
        passives: ['charge'], abilities: ['defend'],
        look: { body: 'form', armor: 'leather', weapon: 'great_sword', helm: 'hood', cape: false, size: 'medium', tint: '#2a1a2a' },
      }),
    U('dark', 'warlock', '흑마도사', 'Warlock', '해골 장식 지팡이를 든 마도사로, 냉기의 저주로 적의 방어를 통째로 무너뜨린다.',
      'A skull-staffed sorcerer whose frost curse shatters an enemy\'s every defense at once.', {
        tier: 2, role: 'mage', tags: ['racial', 'magic_origin', 'ranged'],
        hp: 60, def: 1, res: 3, statusRes: { frost: 2 },
        attacks: [A('weakening_bolt', '약화의 화살', 'Weakening Bolt', { type: 'ranged', range: 4, channel: 'frost', damage: 8, effects: [{ status: 'weakened', chance: 50 }] })],
        abilities: ['sundering_curse', 'defend'],
        look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'horned', cape: 'long', size: 'medium', element: 'frost', tint: '#2a1a2a' },
      }),
    U('dark', 'night_guard', '야음 경비병', 'Night Guard', '뿔 투구를 쓴 검은 전신 갑주 창병으로, 곁에 남는 적을 서서히 무너뜨린다.',
      'A horned, black-plated halberdier who wears down whatever lingers beside it.', {
        tier: 2, role: 'polearm', tags: ['racial', 'infantry'],
        hp: 75, def: 3, res: 2,
        attacks: [A('halberd_strike', '미늘창 베기', 'Halberd Strike', { damage: 14 })],
        passives: ['first_strike', 'pike_brace', 'ab_dark_night_guard_dread_aura'], abilities: ['defend'],
        look: { body: 'form', armor: 'heavy_plate', weapon: 'halberd', helm: 'horned', cape: 'short', size: 'medium', tint: '#1a1420' },
      }),
    U('dark', 'dark_knight', '암흑 기사', 'Dark Knight', '악몽 같은 검은 군마를 타고 가시 돋친 창을 쥔 기사. 냉기의 격류로 적을 덮친다.',
      'A knight on a nightmare-black barded horse whose lance is joined by a surge of freezing shadow.', {
        tier: 3, role: 'shock', tags: ['racial', 'cavalry'], move: 'mounted',
        hp: 90, def: 3, res: 3, statusRes: { frost: 3 },
        attacks: [A('spiked_lance', '가시 창', 'Spiked Lance', { damage: 22 })],
        passives: ['charge', 'cull_the_weak'], abilities: ['dark_surge', 'defend'],
        look: { body: 'horse_rider', armor: 'heavy_plate', weapon: 'lance', helm: 'full', cape: 'long', shield: 'none', size: 'large', element: 'frost', tint: '#1a1420', glow: '#6a3a8a' },
      }),
  ];
  for (const u of DARK) Data.define('units', u);

  // ================================================================ REAVER — magelocks, cannons and slavers (Materium/Chaos)
  const REAVER = [
    U('reaver', 'observer', '관측병', 'Observer', '망원경을 든 채 하늘을 떠다니는 정찰용 눈. 전투에 가담하지 않고 오직 시야만 밝힌다.',
      'A floating spyglass-eye that never fights, only floods the field with vision.', {
        tier: 1, role: 'scout', tags: ['racial', 'flying', 'noncombat'], move: 'fly',
        hp: 40, def: 0, res: 1,
        attacks: [],
        passives: ['flying', 'farsight'], abilities: ['outpost_builder', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'none', helm: 'hat', cape: 'long', size: 'small' },
      }),
    U('reaver', 'magelock', '마력총병', 'Magelock', '주둥이가 붉게 타오르는 마력총을 짊어진 총사. 세 조가 한 조를 이루어 발포한다.',
      'A rifleman whose magelock barrel glows orange, three to a squad.', {
        tier: 1, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 65, def: 1, res: 1,
        attacks: [A('magelock_shot', '마력총 사격', 'Magelock Shot', { type: 'ranged', range: 5, damage: 12 })],
        abilities: ['magelock_rifle', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'rifle', helm: 'hat', cape: 'long', size: 'medium', glow: '#ff8a2a' },
      }),
    U('reaver', 'harrier', '습격병', 'Harrier', '그물과 갈고리, 투척용 칼날로 무장한 경장 습격대. 근접전에서는 미련 없이 물러난다.',
      'A light raider with nets, hooks and throwing blades who never lingers in melee.', {
        tier: 1, role: 'skirmisher', tags: ['racial', 'infantry'],
        hp: 60, def: 2, res: 0,
        attacks: [A('blade_throw', '칼날 투척', 'Blade Throw', { type: 'ranged', range: 2, damage: 11 })],
        passives: ['slippery'], abilities: ['net_throw', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'daggers', helm: 'none', cape: false, size: 'medium' },
      }),
    U('reaver', 'overseer', '감독관', 'Overseer', '쇠사슬 등불을 든 노예상 출신 감독관으로, 채찍으로 적을 표식하고 아군을 다잡는다.',
      'A slaver-warden with a chained lantern who marks foes with the whip and mends allies.', {
        tier: 2, role: 'support', tags: ['racial', 'support'],
        hp: 70, def: 1, res: 3,
        attacks: [A('whip_crack', '채찍질', 'Whip Crack', { damage: 8, effects: [{ status: 'marked', chance: 60 }] })],
        abilities: ['subdue', 'field_medic', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'whip', helm: 'hood', cape: 'long', size: 'medium' },
      }),
    U('reaver', 'breacher', '돌파병', 'Breacher', '마력 도끼와 정령 산탄총으로 무장한 이 문화 유일의 마법 전사.',
      'The culture\'s only magic-imbued melee fighter, wielding a spirit-charged blunderbuss.', {
        tier: 2, role: 'fighter', tags: ['racial', 'magic_origin', 'infantry'],
        hp: 90, def: 3, res: 3, statusRes: { spirit: 2 },
        attacks: [
          A('magic_axe', '마력 도끼', 'Magic Axe', { channel: 'lightning', damage: 16 }),
          A('spirit_shotgun', '정령 산탄총', 'Spirit Shotgun', { type: 'ranged', range: 2, channel: 'spirit', damage: 14 }),
        ],
        abilities: ['defend'],
        look: { body: 'form', armor: 'chain', weapon: 'axe', helm: 'open', cape: false, size: 'medium', glow: '#ff8a2a' },
      }),
    U('reaver', 'dragoon', '용기병', 'Dragoon', '권총과 기병도로 무장한 채 쏘고 다시 물러나는 용병 기병.',
      'A mercenary rider with pistol and sabre who shoots, then wheels away.', {
        tier: 3, role: 'skirmisher', tags: ['racial', 'cavalry'], move: 'mounted',
        hp: 85, def: 3, res: 3,
        attacks: [A('pistol_shot', '권총 사격', 'Pistol Shot', { type: 'ranged', range: 3, damage: 16 })],
        passives: ['slippery', 'charge'], abilities: ['disengage_shot', 'defend'],
        look: { body: 'horse_rider', armor: 'leather', weapon: 'sword', helm: 'hat', cape: 'short', size: 'medium' },
      }),
    U('reaver', 'magelock_cannon', '마력포', 'Magelock Cannon', '마력으로 빛나는 청동 대포를 세 명의 포수가 조작하는 바퀴 달린 공성 병기.',
      'A wheeled bronze cannon glowing with arcane fire, crewed by three gunners.', {
        tier: 3, role: 'siege', tags: ['construct'], move: 'walk', mp: 24,
        hp: 90, def: 4, res: 2,
        attacks: [A('cannon_shot', '포격', 'Cannon Shot', { type: 'ranged', range: 5, damage: 18, props: ['siege'] })],
        passives: ['construct', 'siege_breaker'], abilities: ['cannon_line', 'defend'],
        look: { body: 'golem', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'large', element: 'lightning', glow: '#ff8a2a' },
      }),
    U('reaver', 'sapper', '공병', 'Sapper', '폭약통을 짊어진 연방 소속 공병으로, 드라군 대신 성벽과 전열을 폭파로 무너뜨린다.',
      'A Federated demolitions specialist hauling charges who blasts through walls and lines instead of riding a Dragoon.', {
        tier: 3, role: 'skirmisher', tags: ['racial', 'infantry'],
        hp: 85, def: 2, res: 2,
        attacks: [A('charge_toss', '폭약통 투척', 'Charge Toss', { type: 'ranged', range: 3, damage: 20, props: ['destroy_obstacles', 'siege'] })],
        passives: ['siege_breaker'], abilities: ['disengage', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'javelin', helm: 'cap', cape: false, size: 'medium', glow: '#ff8a2a' },
      }),
  ];
  for (const u of REAVER) Data.define('units', u);

  // ================================================================ PRIMAL — tribes bonded to an animal kinship (Nature/Chaos)
  const PRIMAL = [
    U('primal', 'spirit_tracker', '영혼 추적자', 'Spirit Tracker', '동물 이빨 목걸이를 두른 사냥꾼으로, 부족의 영수를 타고 먼 곳까지 살핀다.',
      'A tooth-necklaced hunter who rides the tribe\'s kin animal to scout far ahead.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'], move: 'mounted',
        hp: 45, def: 0, res: 0,
        attacks: [A('spear_throw', '창 던지기', 'Spear Throw', { type: 'ranged', range: 4, damage: 8 })],
        passives: ['farsight', 'fast_movement'], abilities: ['defend'],
        look: { body: 'wolf_rider', armor: 'leather', weapon: 'spear', helm: 'none', cape: false, size: 'medium' },
      }),
    U('primal', 'protector', '수호자', 'Protector', '뼈와 가죽으로 만든 방패와 흑요석 곤봉을 든 전열 수호자. 짐승 두개골 투구를 쓴다.',
      'A hide-and-bone shield-bearer with an obsidian club, its helm a beast skull.', {
        tier: 1, role: 'shield', tags: ['racial', 'infantry'],
        hp: 70, def: 5, res: 1,
        attacks: [A('club_strike', '곤봉 타격', 'Club Strike', { damage: 12 })],
        passives: ['shield_wall'], abilities: ['primal_renewal', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'mace', helm: 'horned', cape: false, shield: 'round', size: 'medium' },
      }),
    U('primal', 'darter', '다트사냥꾼', 'Darter', '취관과 깃털 망토를 두른 사냥꾼으로, 쏘자마자 몸을 던져 뒤로 물러난다.',
      'A blowgun hunter in a feathered cloak who fires, then leaps clear.', {
        tier: 1, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 50, def: 0, res: 1,
        attacks: [A('blowgun', '취관 사격', 'Blowgun', { type: 'ranged', range: 4, channel: 'blight', damage: 9, effects: [{ status: 'poisoned', chance: 30 }] })],
        abilities: ['disengage_shot', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'javelin', helm: 'none', cape: 'short', size: 'medium' },
      }),
    U('primal', 'primal_charger', '원시 돌격병', 'Primal Charger', '부족의 영수를 탄 채 돌진해 앞을 가로막는 여러 적을 한꺼번에 베어낸다.',
      'Rides the tribe\'s kin animal into a charge that cleaves through several foes at once.', {
        tier: 2, role: 'shock', tags: ['racial', 'cavalry'], move: 'mounted',
        hp: 80, def: 2, res: 2,
        attacks: [A('kin_charge_strike', '영수 돌격', 'Kin Charge Strike', { damage: 16 })],
        passives: ['charge'], abilities: ['cleaving_charge', 'defend'],
        look: { body: 'wolf_rider', armor: 'leather', weapon: 'spear', helm: 'horned', cape: false, size: 'medium' },
      }),
    U('primal', 'animist', '정령술사', 'Animist', '부족 영수 모양의 토템 지팡이를 든 주술사로, 격노를 태워 치유하거나 영수를 불러낸다.',
      'A shaman with a totem staff carved as the tribe\'s animal, spending Fury to heal or summon.', {
        tier: 2, role: 'support', tags: ['racial', 'support'],
        hp: 60, def: 1, res: 3,
        attacks: [A('totem_bolt', '토템 화살', 'Totem Bolt', { type: 'ranged', range: 3, channel: 'blight', damage: 8 })],
        abilities: ['spiritual_healing', 'summon_spirit_animal', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'staff', helm: 'horned', cape: false, size: 'medium', element: 'nature' },
      }),
    U('primal', 'ancestral_warden', '선조의 수호자', 'Ancestral Warden', '뼈촉 창과 뼈 흉갑을 두른 창병으로, 돌격을 기다리지 않고 스스로 적진 한복판으로 뛰어든다.',
      'A bone-tipped spearman in bone plate who leaps into the thick of the enemy instead of waiting.', {
        tier: 3, role: 'polearm', tags: ['racial', 'infantry'],
        hp: 90, def: 4, res: 3,
        attacks: [A('bone_spear', '뼈촉 창', 'Bone Spear', { damage: 18 })],
        passives: ['first_strike', 'pike_brace'], abilities: ['leap_strike', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'spear', helm: 'horned', cape: false, size: 'medium' },
      }),
    U('primal', 'stormbringer', '폭풍인도자', 'Stormbringer', '벼락을 두른 척후병으로, 폭풍을 부려 적진을 어지럽히고 재빨리 이탈한다.',
      'A lightning-wreathed skirmisher who calls down storms and slips away before the counterstrike.', {
        tier: 4, role: 'skirmisher', tags: ['racial', 'ranged'],
        hp: 130, def: 3, res: 4,
        attacks: [A('storm_lash', '폭풍 채찍', 'Storm Lash', { type: 'ranged', range: 4, channel: 'lightning', damage: 26, effects: [{ status: 'electrified', chance: 40 }] })],
        passives: ['fast_movement', 'lightning_rod'], abilities: ['disengage_shot', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'staff', helm: 'none', cape: 'short', size: 'medium', element: 'lightning', glow: '#c090ff' },
      }),
    // ---- kinship animals: recruitable Primal Animal units, one per Ancient Kinship choice
    U('primal', 'ash_sabertooth', '잿불 검치호', 'Ash Sabertooth', '검게 그을린 줄무늬 털과 이글거리는 갈기를 가진 검치호. 스치는 것마다 불을 붙인다.',
      'A black-and-ember-striped sabertooth cat whose mane smoulders, igniting whatever it claws.', {
        tier: 3, role: 'fighter', tags: ['animal'],
        hp: 100, def: 3, res: 2, statusRes: { fire: 4 },
        attacks: [A('ember_claws', '잿불 발톱', 'Ember Claws', { channel: 'fire', damage: 20, effects: [{ status: 'burning', chance: 40 }] })],
        passives: ['fast_movement'], abilities: ['defend'],
        look: { body: 'beast_lion', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'medium', element: 'fire', tint: '#3a2018', glow: '#ff6a2a' },
      }),
    U('primal', 'dune_serpent', '사구 뱀', 'Dune Serpent', '모래를 파고들어 매복하는 뿔 달린 모래빛 뱀으로, 독니로 적을 무력화한다.',
      'A sand-gold horned serpent that burrows to ambush, its fangs dripping venom.', {
        tier: 3, role: 'fighter', tags: ['animal'],
        hp: 95, def: 3, res: 2,
        attacks: [A('venom_bite', '독니 물기', 'Venom Bite', { channel: 'blight', damage: 20, effects: [{ status: 'poisoned', chance: 60 }] })],
        passives: ['swift'], abilities: ['defend'],
        look: { body: 'beast_serpent', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'medium', element: 'nature', tint: '#c8a848' },
      }),
    U('primal', 'glacial_mammoth', '빙하 매머드', 'Glacial Mammoth', '얼음 엄니를 가진 거대한 매머드로, 발을 구르는 것만으로 주변의 땅을 얼려버린다.',
      'A shaggy white-blue mammoth with icy tusks whose stomp freezes the ground itself.', {
        tier: 3, role: 'fighter', tags: ['animal'],
        hp: 110, def: 4, res: 2, statusRes: { frost: 4 },
        attacks: [A('tusk_slam', '엄니 강타', 'Tusk Slam', { channel: 'frost', damage: 22, effects: [{ status: 'slowed', chance: 50 }] })],
        passives: ['large_target'], abilities: ['giant_stomp', 'defend'],
        look: { body: 'beast_elk', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'large', element: 'frost', tint: '#cfe6f0' },
      }),
    U('primal', 'mire_crocodile', '늪지 악어', 'Mire Crocodile', '이끼로 뒤덮인 등딱지를 가진 악어로, 물어뜯긴 상처에서 역병이 번진다.',
      'A moss-backed crocodile whose bite leaves a wound that spreads disease.', {
        tier: 3, role: 'fighter', tags: ['animal'],
        hp: 100, def: 3, res: 2, statusRes: { blight: 4 },
        attacks: [A('crushing_bite', '짓누르는 물기', 'Crushing Bite', { channel: 'blight', damage: 21, effects: [{ status: 'diseased', chance: 40 }] })],
        passives: ['amphibious', 'plague_carrier'], abilities: ['defend'],
        look: { body: 'beast_serpent', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'medium', element: 'nature', tint: '#3a5a3a' },
      }),
    U('primal', 'storm_crow', '폭풍 까마귀', 'Storm Crow', '날갯짓마다 번개가 튀는 거대한 검푸른 까마귀. 하늘에서 내리꽂혀 적을 덮친다.',
      'A giant blue-black crow crackling with lightning at every wingbeat, diving from above.', {
        tier: 3, role: 'skirmisher', tags: ['animal', 'flying'], move: 'fly',
        hp: 90, def: 2, res: 3, statusRes: { lightning: 4 },
        attacks: [A('lightning_talons', '번개 발톱', 'Lightning Talons', { channel: 'lightning', damage: 19, effects: [{ status: 'electrified', chance: 45 }] })],
        passives: ['flying'], abilities: ['defend'],
        look: { body: 'bird', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'medium', element: 'lightning', tint: '#1a1a3a', glow: '#c090ff' },
      }),
    U('primal', 'sylvan_wolf', '삼림 늑대', 'Sylvan Wolf', '잎사귀와 뿔 무늬 반점이 있는 회녹색 늑대. 무리를 지어 사냥하며 물어뜯은 상처에서 피를 낸다.',
      'A grey-green wolf marked with leaf-and-antler patterns, hunting in a pack that leaves wounds bleeding.', {
        tier: 3, role: 'fighter', tags: ['animal'],
        hp: 95, def: 3, res: 2,
        attacks: [A('pack_bite', '무리 물기', 'Pack Bite', { damage: 22, effects: [{ status: 'bleeding', chance: 45 }] })],
        passives: ['fast_movement', 'ferocious'], abilities: ['defend'],
        look: { body: 'beast_wolf', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'medium', tint: '#6a7a68' },
      }),
    U('primal', 'tunneling_spider', '굴착 거미', 'Tunneling Spider', '땅을 파고드는 앞다리를 가진 옅은 보랏빛 동굴 거미로, 거미줄로 적을 옭아맨다.',
      'A pale violet cave spider with digging forelegs whose webbing snarls anything it touches.', {
        tier: 3, role: 'skirmisher', tags: ['animal'],
        hp: 90, def: 3, res: 2, statusRes: { blight: 3 },
        attacks: [A('venom_bite', '독니 물기', 'Venom Bite', { channel: 'blight', damage: 18, effects: [{ status: 'poisoned', chance: 45 }] })],
        passives: ['night_vision'], abilities: ['web_shot', 'defend'],
        look: { body: 'beast_spider', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'medium', tint: '#7a5a9a' },
      }),
  ];
  for (const u of PRIMAL) Data.define('units', u);

  // ================================================================ OATHSWORN — honor codes of a sworn oath (Order + oath)
  const OATHSWORN = [
    U('oathsworn', 'wayfarer', '방랑자', 'Wayfarer', '등에 깃발을 꽂고 짧은 활을 든 전령 기수로, 넓은 갓을 쓰고 영지를 오간다.',
      'A messenger rider with a back-banner and short bow, a wide conical hat shading its face.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'], move: 'mounted',
        hp: 45, def: 0, res: 1,
        attacks: [A('shoot_bow', '활 사격', 'Shoot Bow', { type: 'ranged', range: 5, damage: 7 })],
        passives: ['farsight'], abilities: ['defend'],
        look: { body: 'horse_rider', armor: 'cloth', weapon: 'bow', helm: 'hat', cape: 'short', size: 'medium' },
      }),
    U('oathsworn', 'sworn_guard', '서약 수호병', 'Sworn Guard', '옻칠한 미늘갑을 두르고 등에 서약의 문장을 꽂은 채 장창을 겨눈 창병.',
      'A lacquered lamellar spearman with the oath\'s sigil on a back-banner, its naginata always braced.', {
        tier: 1, role: 'pike', tags: ['racial', 'infantry'],
        hp: 65, def: 3, res: 1,
        attacks: [A('naginata_strike', '나기나타 베기', 'Naginata Strike', { damage: 12, effects: [{ status: 'sundered', chance: 30 }] })],
        passives: ['first_strike', 'pike_brace'], abilities: ['defend'],
        look: { body: 'form', armor: 'chain', weapon: 'halberd', helm: 'hat', cape: 'short', size: 'medium' },
      }),
    U('oathsworn', 'honor_blade', '명예의 검사', 'Honor Blade', '화려한 투구 장식과 비단 띠를 두른 쌍검사. 일격을 가한 뒤 곧바로 방어 태세에 들어간다.',
      'A twin-blade duelist with an ornate crested helm and silk sash who strikes, then braces at once.', {
        tier: 1, role: 'fighter', tags: ['racial', 'infantry'],
        hp: 70, def: 3, res: 1,
        attacks: [A('twin_blade_strike', '쌍검 베기', 'Twin Blade Strike', { damage: 13 })],
        abilities: ['defensive_strike', 'defend'],
        look: { body: 'form', armor: 'chain', weapon: 'daggers', helm: 'open', cape: 'short', size: 'medium' },
      }),
    U('oathsworn', 'vowkeeper', '맹세지기', 'Vowkeeper', '고리 지팡이와 염주를 든 승려 사제로, 아군을 두루 치유하고 적의 강화 효과를 걷어낸다.',
      'A monk-priest with a ringed staff and prayer beads who heals broadly and strips enemy buffs.', {
        tier: 2, role: 'support', tags: ['racial', 'support'],
        hp: 65, def: 2, res: 3,
        attacks: [A('staff_strike', '지팡이 타격', 'Staff Strike', { damage: 9 })],
        abilities: ['mass_heal', 'dispel', 'defend'],
        look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'none', cape: 'long', size: 'medium', element: 'holy' },
      }),
    U('oathsworn', 'oath_caster', '서약 시전자', 'Oath Caster', '옻칠갑에 넓은 소매 옷을 두른 시전자로, 서약이 내리는 원소의 힘을 광역으로 퍼붓는다.',
      'A lacquered, wide-sleeved caster who unleashes the oath\'s elemental power in a burst.', {
        tier: 2, role: 'mage', tags: ['racial', 'magic_origin', 'ranged'],
        hp: 60, def: 1, res: 3,
        attacks: [A('oath_flame', '서약의 불길', 'Oath Flame', { type: 'ranged', range: 4, channel: 'spirit', damage: 15 })],
        passives: ['arcane_focus'], abilities: ['defend'],
        look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hat', cape: 'long', size: 'medium', element: 'holy' },
      }),
    U('oathsworn', 'avenger', '복수자', 'Avenger', '붉고 검은 옻칠 갑주를 두른 검사로, 투구를 쪼개는 일격으로 적의 방어를 무시한다.',
      'A red-black lacquered swordsman whose helm-splitting blow ignores half of any Defense.', {
        tier: 3, role: 'shock', tags: ['racial', 'infantry'],
        hp: 95, def: 3, res: 3,
        attacks: [A('great_blade_strike', '대검 일격', 'Great Blade Strike', { damage: 22 })],
        passives: ['charge'], abilities: ['helmsplitter', 'defend'],
        look: { body: 'form', armor: 'heavy_plate', weapon: 'great_sword', helm: 'full', cape: 'long', size: 'medium', element: 'holy' },
      }),
    U('oathsworn', 'warbound', '투쟁의 종자', 'Warbound', '투쟁의 서약에 얽매인 거한으로, 곤봉 하나로 대열을 통째로 짓밟는다.',
      'A hulking brute bound to the Oath of Strife, bulldozing whole lines with a single club.', {
        tier: 3, role: 'shock', tags: ['racial', 'infantry'],
        hp: 95, def: 3, res: 3,
        attacks: [A('club_bulldoze', '곤봉 짓밟기', 'Bulldozing Club', { damage: 24 })],
        passives: ['trample'], abilities: ['defend'],
        look: { body: 'form', armor: 'chain', weapon: 'mace', helm: 'horned', cape: 'long', size: 'large', tint: '#3a1414' },
      }),
    U('oathsworn', 'peacebringer', '평화의 사자', 'Peacebringer', '준마에 올라 활을 겨눈 채, 화합의 서약이 내리는 가호로 아군을 지원하는 궁수.',
      'A mounted archer under the Oath of Harmony, blessing allies with speed and healing between shots.', {
        tier: 3, role: 'ranged', tags: ['racial', 'cavalry', 'support'], move: 'mounted',
        hp: 80, def: 2, res: 3,
        attacks: [A('composite_bow', '합성궁', 'Composite Bow', { type: 'ranged', range: 5, damage: 18 })],
        abilities: ['haste', 'heal_wounds', 'defend'],
        look: { body: 'horse_rider', armor: 'chain', weapon: 'bow', helm: 'hat', cape: 'long', size: 'medium', element: 'nature' },
      }),
  ];
  for (const u of OATHSWORN) Data.define('units', u);

  // ================================================================ ARCHITECT — monument builders (affinity adapts to empire)
  const ARCHITECT = [
    U('architect', 'surveyor', '측량사', 'Surveyor', '속보용 정강이받이를 찬 측량사로, 마법 재료를 조사하고 주도 친화의 화살을 쏜다.',
      'A speed-greaved surveyor who reads magic materials and throws bolts of the dominant affinity.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'],
        hp: 45, def: 0, res: 1,
        attacks: [A('affinity_bolt', '친화의 화살', 'Affinity Bolt', { type: 'ranged', range: 4, damage: 9 })],
        passives: ['farsight'], abilities: ['survey', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'sling', helm: 'none', cape: false, size: 'medium' },
      }),
    U('architect', 'cultivator', '배양사', 'Cultivator', '아군 하나와 이어져 매 턴 상처를 다스리고 약화 효과를 걷어내는 지원병.',
      'A support who links to an ally, tending wounds and clearing a debuff each turn.', {
        tier: 1, role: 'support', tags: ['racial', 'support'],
        hp: 55, def: 1, res: 2,
        attacks: [A('staff_strike', '지팡이 타격', 'Staff Strike', { damage: 8 })],
        abilities: ['field_medic', 'cleanse', 'defend'],
        look: { body: 'form', armor: 'cloth', weapon: 'staff', helm: 'none', cape: false, size: 'medium' },
      }),
    U('architect', 'earthbreaker', '대지파쇄병', 'Earthbreaker', '곡괭이와 망치로 무장한 채 장애물과 성벽을 부수며 전진하는 노동자 전열병.',
      'A pick-and-hammer laborer who smashes obstacles and fortifications on its way forward.', {
        tier: 1, role: 'polearm', tags: ['racial', 'infantry'],
        hp: 65, def: 3, res: 1,
        attacks: [A('pick_strike', '곡괭이 타격', 'Pick Strike', { damage: 13, props: ['destroy_obstacles'] })],
        passives: ['siege_breaker'], abilities: ['defend'],
        look: { body: 'form', armor: 'chain', weapon: 'hammer', helm: 'cap', cape: false, size: 'medium' },
      }),
    U('architect', 'guardian', '수호석상병', 'Guardian', '거대한 청동 방패를 든 방패병으로, 제국의 주도 친화가 짙어질수록 함께 강해진다.',
      'A colossal bronze-shield defender that grows stronger as the empire\'s dominant affinity deepens.', {
        tier: 2, role: 'shield', tags: ['racial', 'infantry'],
        hp: 80, def: 5, res: 3,
        attacks: [A('shield_slam', '방패 강타', 'Shield Slam', { damage: 14 })],
        passives: ['shield_wall', 'bulwark', 'affinity_incarnate'], abilities: ['defend'],
        look: { body: 'form', armor: 'plate', weapon: 'sword_shield', helm: 'open', cape: false, shield: 'tower', size: 'medium' },
      }),
    U('architect', 'shademaker', '그림자술사', 'Shademaker', '주도 친화의 속성을 띤 볼트를 쏘며 그림자로 적의 눈을 가리는 마법 궁수.',
      'A magic archer who casts affinity-typed bolts and veils enemies\' eyes in shade.', {
        tier: 2, role: 'mage', tags: ['racial', 'magic_origin', 'ranged'],
        hp: 60, def: 1, res: 3,
        attacks: [A('shade_bolt', '그림자 화살', 'Shade Bolt', { type: 'ranged', range: 4, damage: 14, effects: [{ status: 'blinded', chance: 30 }] })],
        passives: ['affinity_incarnate'], abilities: ['defend'],
        look: { body: 'form', armor: 'robe', weapon: 'orb', helm: 'hood', cape: 'short', size: 'medium', element: 'shadow' },
      }),
    U('architect', 'architect', '건축가', 'Architect', '전장에서 기념비의 힘을 불러내는 설계자로, 주도 친화 화신 효과가 가장 강하게 발현된다.',
      'A designer who channels a Monument\'s power onto the battlefield, the strongest expression of Affinity Incarnate.', {
        tier: 3, role: 'support', tags: ['racial', 'magic_origin', 'support'],
        hp: 80, def: 2, res: 4,
        attacks: [A('affinity_bolt', '친화의 화살', 'Affinity Bolt', { type: 'ranged', range: 4, damage: 16 })],
        passives: ['affinity_incarnate', 'arcane_focus'], abilities: ['bolster', 'defend'],
        look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'circlet', cape: 'long', size: 'medium' },
      }),
  ];
  for (const u of ARCHITECT) Data.define('units', u);

  // ================================================================ NOMAD — mobile cities, Conquerors or Scavengers (Chaos/Materium)
  const NOMAD = [
    U('nomad', 'dunerider', '사구기수', 'Dunerider', '두건과 고글로 얼굴을 가린 채 모래를 가르는 준마를 탄 기수. 활 솜씨가 궁수 못지않다.',
      'A goggled, wrapped rider on a sand-skimming mount whose bow rivals a dedicated archer.', {
        tier: 1, role: 'scout', tags: ['racial', 'ranged'], move: 'mounted',
        hp: 45, def: 0, res: 0,
        attacks: [A('shoot_bow', '활 사격', 'Shoot Bow', { type: 'ranged', range: 5, damage: 10 })],
        passives: ['farsight'], abilities: ['defend'],
        look: { body: 'horse_rider', armor: 'cloth', weapon: 'bow', helm: 'hood', cape: false, size: 'medium' },
      }),
    U('nomad', 'wind_warrior', '바람의 전사', 'Wind Warrior', '겹겹이 두른 사막 옷과 얇은 미늘갑을 걸친 전열 전사. 바람의 축복을 받아 날렵하다.',
      'A layer-wrapped line fighter in light lamellar, blessed with the wind\'s swiftness.', {
        tier: 1, role: 'fighter', tags: ['racial', 'infantry'],
        hp: 65, def: 3, res: 1,
        attacks: [A('curved_blade', '곡검 베기', 'Curved Blade', { damage: 13 })],
        passives: ['swift'], abilities: ['defend'],
        look: { body: 'form', armor: 'leather', weapon: 'sword', helm: 'hood', cape: 'short', size: 'medium' },
      }),
    U('nomad', 'raider', '약탈자', 'Raider', '붉은 전쟁 깃발을 두른 정복자 무리의 약탈병. 기세를 탈수록 더 거세게 몰아붙인다.',
      'A Conqueror raider under a red war-banner who hits harder the more momentum the army carries.', {
        tier: 1, role: 'skirmisher', tags: ['racial', 'infantry'],
        hp: 60, def: 1, res: 1,
        attacks: [A('raiding_blade', '약탈의 칼날', 'Raiding Blade', { damage: 14 })],
        passives: ['momentum'], abilities: ['defend'],
        look: { body: 'form', armor: 'leather', weapon: 'sword', helm: 'none', cape: 'short', size: 'medium', tint: '#8a2020' },
      }),
    U('nomad', 'looter', '도굴꾼', 'Looter', '전리품 주머니를 주렁주렁 매단 채 전장을 누비며 아군에게 노획물을 전해주는 척후병.',
      'A loot-bag-laden scavenger who weaves through the field, passing plunder to allies.', {
        tier: 1, role: 'skirmisher', tags: ['racial', 'infantry'],
        hp: 55, def: 1, res: 1,
        attacks: [A('curved_blade', '곡검 베기', 'Curved Blade', { damage: 11 })],
        passives: ['slippery'], abilities: ['defend'],
        look: { body: 'form', armor: 'leather', weapon: 'daggers', helm: 'none', cape: false, size: 'medium' },
      }),
    U('nomad', 'strider', '광야보행자', 'Strider', '가벼운 갑주로 짐을 던 채 먼 거리에서 활을 쏘는 유목 궁수.',
      'A lightly armored nomad archer who peppers the enemy line from a distance.', {
        tier: 2, role: 'ranged', tags: ['racial', 'ranged'],
        hp: 60, def: 1, res: 2,
        attacks: [A('recurve_bow', '만곡궁 사격', 'Recurve Bow', { type: 'ranged', range: 5, damage: 15 })],
        abilities: ['defend'],
        look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood', cape: false, size: 'medium' },
      }),
    U('nomad', 'dustweaver', '먼지술사', 'Dustweaver', '바람을 엮어 손이 닿지 않는 전리품을 가장 가까운 아군에게 끌어오는 약탈자 지원병.',
      'A Scavenger support who weaves the wind to pull hard-to-reach loot to the nearest ally.', {
        tier: 2, role: 'support', tags: ['racial', 'support', 'magic_origin'],
        hp: 60, def: 1, res: 3,
        attacks: [A('sand_bolt', '모래 화살', 'Sand Bolt', { type: 'ranged', range: 3, damage: 10 })],
        abilities: ['distributing_wind', 'defend'],
        look: { body: 'form', armor: 'cloth', weapon: 'staff', helm: 'hood', cape: 'short', size: 'medium', element: 'nature' },
      }),
    U('nomad', 'warbringer', '전쟁을 부르는 자', 'Warbringer', '노획한 군기를 짊어진 정복자 무리의 선동자로, 북소리에 맞춰 아군의 기세를 끌어올린다.',
      'A Conqueror agitator bearing a captured standard, drumming the army\'s momentum ever higher.', {
        tier: 2, role: 'support', tags: ['racial', 'support'],
        hp: 65, def: 2, res: 2,
        attacks: [A('standard_bash', '군기 강타', 'Standard Bash', { damage: 12 })],
        passives: ['momentum'], abilities: ['war_cry', 'inspire_morale', 'defend'],
        look: { body: 'form', armor: 'leather', weapon: 'banner', helm: 'hood', cape: 'short', size: 'medium', tint: '#8a2020' },
      }),
    U('nomad', 'champion', '결투자', 'Champion', '결투로 이름을 떨친 정예 검사로, 어떤 상대와 맞붙어도 좀처럼 밀리지 않는다.',
      'An elite duelist famed in single combat, rarely losing ground against anyone.', {
        tier: 3, role: 'fighter', tags: ['racial', 'infantry'],
        hp: 90, def: 3, res: 3,
        attacks: [A('duelist_strike', '결투사의 일격', 'Duelist Strike', { damage: 22 })],
        passives: ['elusive', 'ferocious'], abilities: ['defend'],
        look: { body: 'form', armor: 'chain', weapon: 'sword', helm: 'open', cape: 'short', size: 'medium' },
      }),
    U('nomad', 'warlord', '대족장', 'Warlord', '방패와 창, 지휘의 술을 하나로 합친 유목의 정예 지휘관. 홀로도 전열 전체의 역할을 해낸다.',
      'An elite commander who fuses shield, spear and leadership into one — worth an entire line by itself.', {
        tier: 4, role: 'shock', tags: ['racial', 'infantry', 'support'],
        hp: 140, def: 5, res: 4,
        attacks: [A('warlords_spear', '대족장의 창', 'Warlord\'s Spear', { damage: 27 })],
        passives: ['shield_wall', 'first_strike', 'charge'], abilities: ['rally', 'inspire_morale', 'defend'],
        look: { body: 'form', armor: 'heavy_plate', weapon: 'spear_shield', helm: 'full', cape: 'long', shield: 'tower', size: 'large' },
      }),
  ];
  for (const u of NOMAD) Data.define('units', u);

  // ================================================================ HERO BASE UNITS — one per ruler type (source: hero)
  const HERO_BASE = (id, ko, en, dko, den, o) => Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, tier: 3, role: 'hero',
    tags: ['hero'], move: 'walk', mp: 32,
    source: { type: 'hero' }, cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 90, def: 3, res: 3, morale: 0,
    attacks: [A('strike', '타격', 'Strike', { damage: 22 })],
    abilities: ['defend'], passives: [], statusRes: {},
    look: { body: 'form', armor: 'plate', weapon: 'sword_shield', helm: 'open', cape: 'long', size: 'medium' },
  }, o);

  const HEROES = [
    HERO_BASE('hero', '영웅', 'Hero', '어느 문화든 이끌 수 있는 필멸자 영웅. 갑주와 무기는 플레이어의 선택을 따른다.',
      'A mortal hero fit to lead any culture; armor and weapon follow the player\'s choice.', {}),
    HERO_BASE('hero_dragon_lord', '용의 군주', 'Dragon Lord', '네 다리와 두 날개를 가진 진짜 용. 발톱과 브레스만으로 싸우며 탈것이나 다리 장비를 쓰지 않는다.',
      'A true four-limbed, two-winged dragon that fights with claw and breath alone, using no mount or leg gear.', {
        tags: ['hero', 'dragon', 'flying'], move: 'fly', mp: 40,
        hp: 160, def: 4, res: 3,
        attacks: [A('dragon_claws', '용의 발톱', 'Dragon Claws', { damage: 26 })],
        abilities: ['defend', 'dragon_breath_fire', 'roar', 'devour'],
        passives: ['flying', 'fearless', 'large_target'],
        look: { body: 'dragon', armor: 'none', weapon: 'none', helm: 'none', cape: false, size: 'huge', element: 'fire' },
      }),
    HERO_BASE('hero_eldritch_sovereign', '엘드리치 군주', 'Eldritch Sovereign', '공허에서 돌아온 잃어버린 마법사. 촉수와 여분의 눈으로 뒤틀렸으며 다리 장비와 탈것을 쓰지 않는다.',
      'A Lost Wizard returned from the Void, warped with tentacles and extra eyes; no leg items or mounts.', {
        tags: ['hero', 'eldritch', 'floating'], move: 'float', mp: 40,
        hp: 90, def: 2, res: 5,
        attacks: [A('tentacle_lash', '촉수 채찍', 'Tentacle Lash', { channel: 'spirit', damage: 18 })],
        abilities: ['defend', 'mind_control'],
        passives: ['floating', 'control_immunity', 'spellcaster'],
        look: { body: 'eldritch', armor: 'robe', weapon: 'orb', helm: 'none', cape: 'long', size: 'medium', element: 'shadow', glow: '#3fd0c0', tint: '#3fd0c0' },
      }),
    HERO_BASE('hero_giant_king', '거인 왕', 'Giant King', '인간의 두세 배 크기인 거대한 거인. 통나무만 한 망치를 휘두르고 바위를 던진다.',
      'A colossal giant two to three times human height who swings a tree-trunk hammer and hurls boulders.', {
        tags: ['hero', 'giant'],
        hp: 170, def: 4, res: 2,
        attacks: [A('hammer_slam', '망치 강타', 'Hammer Slam', { damage: 28 })],
        abilities: ['defend', 'giant_stomp', 'hurl_boulder'],
        passives: ['large_target', 'sturdy'],
        look: { body: 'giant', armor: 'leather', weapon: 'hammer', helm: 'none', cape: false, size: 'huge' },
      }),
    HERO_BASE('hero_wizard_king', '마법사 왕', 'Wizard King', '아스트랄 바다를 건너온 마법의 대가. 지팡이 하나로 전장의 흐름을 바꾼다.',
      'A master of the arcane who sails the Astral Sea, turning the tide of battle with a single staff.', {
        tags: ['hero', 'racial'],
        hp: 90, def: 2, res: 5,
        attacks: [A('arcane_bolt', '비전 화살', 'Arcane Bolt', { type: 'ranged', range: 4, channel: 'lightning', damage: 18, accuracy: 90 })],
        abilities: ['defend'],
        passives: ['spellcaster', 'arcane_focus'],
        look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'crown', cape: 'long', size: 'medium', element: 'arcane', glow: '#9ab0ff' },
      }),
    HERO_BASE('hero_elder_vampire', '장로 뱀파이어', 'Elder Vampire', '피의 왕좌를 다스리는 불사의 군주. 창백한 피부와 붉은 눈을 지녔으며 피를 마셔 스스로를 되살린다.',
      'An undying lord of the Throne of Blood with pale skin and crimson eyes who drinks blood to renew itself.', {
        tags: ['hero', 'racial'],
        hp: 100, def: 3, res: 4,
        attacks: [A('blood_claws', '핏빛 손톱', 'Blood Claws', { damage: 20 })],
        abilities: ['defend', 'blood_drain'],
        passives: ['life_steal', 'undying', 'night_vision'],
        look: { body: 'form', armor: 'plate', weapon: 'claws', helm: 'none', cape: 'long', size: 'medium', tint: '#3a1020', glow: '#8a1020' },
      }),
  ];
  for (const h of HEROES) Data.define('units', h);

  // ------------------------------------------------------------------ id aliases
  // The mechanical id rule (culture + '_' + snake_case(unit name)) doubles up the culture word for a
  // few unit names that already start with it (e.g. "Mystic Projection" -> mystic_mystic_projection).
  // Register both the literal doubled id and the shorter form so either spelling used elsewhere resolves.
  const ALIAS_OF = {
    feudal_peasant_pikeman: 'feudal_peasant_pikemen',
    high_sunray_archer: 'high_dusk_hunter',
    mystic_projection: 'mystic_mystic_projection',
    dark_warrior: 'dark_dark_warrior',
    dark_knight: 'dark_dark_knight',
    primal_charger: 'primal_primal_charger',
  };
  for (const aliasId of Object.keys(ALIAS_OF)) {
    const src = Data.get('units', ALIAS_OF[aliasId]);
    Data.define('units', Object.assign({}, src, { id: aliasId }));
  }

})(window.AOW = window.AOW || {});
