// src/data/tomes_nature_materium.js — Nature & Materium tomes (+ their dual tomes) — SPEC §3, §3.0.1
// Tomes: Beasts, Roots, Fertility, Glades, Cycles, Vigor, Nature's Wrath, Paradise, Goddess of Nature (Nature);
// Enchantment, Rock, Artificing, Winds, Terramancy, Transmutation, Crucible, Golden Realm, Creator, Dungeon Depths (Materium);
// Evolution, Dragons, Alchemy, Dreadnought, Severing, Fey Mists, Stormborne, Prosperity, Sand Stalkers, Geomancy,
// Shades, Weaver, Sprite (dual). Numbers adapted from AoW4 game data (docs/research/tomes_spells_affinity.md Part 1/3/5).
// New ids owned by this file: statuses `st_gilded`, `st_grace`; abilities `ab_*` (unit signature skills, prefixed by unit);
// units `tn_*`; spells `sp_*`; improvements `imp_*`; transformations `tr_*`; hero skills `hs_*`.
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  // ------------------------------------------------------------------ two extra statuses this file needs
  const S = (id, ko, en, dko, den, o) => Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, kind: 'debuff', icon: id, stack: false, duration: 3, effects: {},
    resistedBy: null, cleansable: true,
  }, o);
  Data.define('statuses', S('st_gilded', '금박', 'Gilded', '몸이 금으로 뒤덮여 굼떠지고 약해집니다. 이 상태에서 죽으면 추가 금을 떨어뜨립니다.',
    'Flesh turns to gold: slow and brittle. Dropping it while Gilded yields bonus Gold on death.',
    { duration: 1, effects: { def: -3, mp: -1 }, resistedBy: 'physical' }));
  Data.define('statuses', S('st_grace', '은총', 'Grace', '자연의 은총을 받아 매 턴 종료 시 임시 체력을 회복하고 받는 치유량이 늘어납니다.',
    "Touched by nature's grace: recovers temporary HP at the end of each turn and receives more healing.",
    { kind: 'buff', duration: 3, effects: { healPerTurn: 6, healPct: 25 } }));

  // ------------------------------------------------------------------ helpers (SPEC §3)
  const nm = (ko, en) => ({ ko, en });
  const SP = (id, ko, en, dko, den, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), tier: 1, affinity: { nature: 1 }, kind: 'combat',
    cost: { mana: 10, cp: 15 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0, effect: {},
  }, o);
  const U = (id, ko, en, dko, den, tomeId, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), tier: 1, role: 'fighter', tags: [], move: 'walk', mp: 40,
    source: { type: 'tome', id: tomeId }, cost: { gold: 60, mana: 0, draft: 80 }, upkeep: { gold: 8, mana: 0 },
    hp: 60, def: 1, res: 1, morale: 0, attacks: [], abilities: ['defend'], passives: [], statusRes: {},
    look: { body: 'form', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: null, glow: null },
  }, o);
  const IMP = (id, ko, en, dko, den, tomeId, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), kind: 'special', terrain: null, feature: null,
    cost: { gold: 100, imperium: 0 }, yields: {}, adjacencyBonus: {}, tome: tomeId, unique: true,
  }, o);
  const TR = (id, ko, en, dko, den, tomeId, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), kind: 'minor', tome: tomeId, effects: {}, look: null,
  }, o);
  const HS = (id, ko, en, dko, den, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), class: null, tier: 1, cost: 1, effects: {},
  }, o);
  const TOME = (id, ko, en, dko, den, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), tier: 1, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_1',
    passive: { desc: nm('', ''), effects: {} }, contents: [],
  }, o);
  const KCOST = { 1: 120, 2: 220, 3: 380, 4: 600, 5: 900 };
  const kc = (tier, isUnit) => Math.round(KCOST[tier] * (isUnit ? 1.2 : 1));

  //#region ===================================================== TOME OF BEASTS (T1 Nature)
  Data.define('improvements', IMP('imp_wildlife_sanctuary', '야생 동물 보호구역', 'Wildlife Sanctuary',
    '숲 지방에 세우는 보호구역. 식량과 징집력을 제공하고 야수 유닛 생산을 가능하게 합니다.',
    'A forest sanctuary that yields Food and Draft and unlocks the drafting of Animal units.', 'tome_beasts',
    { kind: 'forester', feature: ['forest'], cost: { gold: 100, imperium: 0 }, yields: { food: 10, draft: 5 }, adjacencyBonus: { sameKind: 2 } }));

  Data.define('units', U('tn_wolf', '늑대', 'Wolf', '무리 지어 사냥하는 야생 늑대.', 'A wild wolf that hunts in packs.', 'tome_beasts', {
    tier: 1, role: 'fighter', tags: ['animal'], mp: 48, source: { type: 'summon', id: 'tome_beasts' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 60, def: 1, res: 0, morale: 0,
    attacks: [{ id: 'bite', name: nm('물어뜯기', 'Bite'), type: 'melee', damage: 14, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'bleeding', chance: 20 }], props: [] }],
    abilities: ['sprint'], passives: ['fearless'],
    look: { body: 'beast_wolf', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: null, glow: null },
  }));
  Data.define('units', U('tn_bear', '갈색 곰', 'Brown Bear', '묵직한 발톱으로 후려치는 커다란 곰.', 'A hefty bear that swipes with heavy claws.', 'tome_beasts', {
    tier: 2, role: 'fighter', tags: ['animal'], mp: 40, source: { type: 'summon', id: 'tome_beasts' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 90, def: 2, res: 0, morale: 0,
    attacks: [{ id: 'claw', name: nm('발톱 휘두르기', 'Claw Swipe'), type: 'melee', damage: 20, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'stunned', chance: 15 }], props: [] }],
    abilities: ['giant_stomp'], passives: ['ferocious'],
    look: { body: 'beast_bear', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'large', tint: null, glow: null },
  }));
  Data.define('units', U('tn_boar', '고르터스크 돼지', 'Goretusk Piglet', '엄니로 들이받는 작고 사나운 멧돼지.', 'A small, fierce boar that gores with its tusks.', 'tome_beasts', {
    tier: 1, role: 'shock', tags: ['animal'], mp: 44, source: { type: 'summon', id: 'tome_beasts' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 65, def: 1, res: 0, morale: 0,
    attacks: [{ id: 'gore', name: nm('엄니 찌르기', 'Tusk Gore'), type: 'melee', damage: 16, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [], props: ['charge'] }],
    abilities: [], passives: ['charge'],
    look: { body: 'beast_boar', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: null, glow: null },
  }));
  Data.define('abilities', { id: 'ab_wildspeaker_conjure_animal', kind: 'active', name: nm('야수 소환', 'Conjure Animal'), desc: nm('빈 인접 칸에 야생 늑대를 소환합니다. 전투가 끝나면 사라집니다.', 'Summons a wild wolf into an adjacent empty hex; it vanishes when the battle ends.'), ap: 3, cooldown: 4, range: 1, target: 'hex', area: 0, icon: 'summon', effect: { type: 'summon', unit: 'tn_wolf', count: 1, temporary: true } });
  Data.define('units', U('tn_wildspeaker', '야수 대화자', 'Wildspeaker', '야수를 부르고 강화하는 지원 유닛.', 'A Support unit that summons and empowers Animals.', 'tome_beasts', {
    tier: 2, role: 'support', tags: ['racial'], mp: 40, source: { type: 'tome', id: 'tome_beasts' },
    cost: { gold: 100, mana: 0, draft: 120 }, upkeep: { gold: 12, mana: 0 },
    hp: 50, def: 1, res: 3, morale: 0, statusRes: { blight: 2 },
    attacks: [{ id: 'blight_blast', name: nm('역병 작렬', 'Blight Blast'), type: 'ranged', damage: 12, channel: 'blight', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'poisoned', chance: 30 }], props: ['magic'] }],
    abilities: ['ab_wildspeaker_conjure_animal', 'heal_wounds', 'defend'], passives: ['guard'],
    look: { body: 'form', armor: 'leather', weapon: 'staff', helm: 'hood', cape: 'short', shield: 'none', element: 'nature', size: 'medium', tint: null, glow: '#5fb043' },
  }));

  Data.define('spells', SP('sp_mark_as_prey', '먹잇감 표시', 'Mark as Prey', '대상 적이 주의가 흐트러지고 방어가 무너집니다.',
    'The target enemy becomes distracted and its defenses crumble.', {
      tier: 1, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 5, cp: 10 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0,
      effect: { type: 'status', status: 'sundered', duration: 3, chance: 90 },
    }));
  Data.define('spells', SP('sp_call_wild_animal', '야생 동물 부르기', 'Call Wild Animal', '지형에 어울리는 야생 동물 한 마리를 군세에 더합니다.',
    'Adds a wild animal suited to the local terrain to your army.', {
      tier: 1, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 60, cp: 60 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_wolf', count: 1 },
    }));
  Data.define('spells', SP('sp_call_of_the_wild', '야생의 부름', 'Call of the Wild', '주변의 아군 야수와 기병 유닛이 강화됩니다.',
    'Empowers friendly Animal and Cavalry units nearby.', {
      tier: 1, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 15, cp: 20 }, upkeep: {}, target: 'ally_unit', range: 0, area: 1,
      effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100, area: 1 },
    }));

  Data.define('transformations', TR('tr_animal_kinship', '야수의 유대', 'Animal Kinship', '대상 종족이 야수와 더욱 가까워집니다. 아군 야수와 인접하면 서로 피해와 치명타 확률이 증가합니다.',
    'Makes the target race more bestial. When adjacent to a friendly Animal, both gain +10% damage and +10% critical chance.', 'tome_beasts',
    { kind: 'minor', effects: { dmgPct: 10, critChance: 10 }, look: { fur: '#7a5230' } }));

  Data.define('heroSkills', HS('hs_pack_leader', '무리의 지도자', 'Pack Leader', '군세를 이끄는 동안 소속 야수 유닛이 측면 전문가와 약간의 방어를 얻고 유지비가 줄어듭니다.',
    'While leading the army, Animal units gain Flanker, +1 Defense/Resistance and reduced upkeep.',
    { tier: 1, cost: 1, effects: { dmgPct: 5, upkeepPct: -10 } }));

  Data.define('tomes', TOME('tome_beasts', '야수의 서', 'Tome of Beasts', '자연 옆에서 걷는 법을 배웁니다. 야수를 소환하고 강화하는 데 특화하며, 야수 곁에 있을 때 더 강해집니다.',
    'Walk beside the animals of nature. Specialize in summoning and buffing Animals, and grow stronger standing next to them.', {
      tier: 1, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_1',
      passive: { desc: nm('인접한 아군 야수 유닛 한 마리당 사기 +1 (최대 +3).', '+1 Morale for each adjacent friendly Animal unit (max +3).'), effects: { morale: 1 } },
      contents: [
        { type: 'improvement', id: 'imp_wildlife_sanctuary', cost: kc(1) },
        { type: 'spell', id: 'sp_mark_as_prey', cost: kc(1) },
        { type: 'transformation', id: 'tr_animal_kinship', cost: kc(1) },
        { type: 'spell', id: 'sp_call_wild_animal', cost: kc(1) },
        { type: 'spell', id: 'sp_call_of_the_wild', cost: kc(1) },
        { type: 'unit', id: 'tn_wildspeaker', cost: kc(1, true) },
        { type: 'skill', id: 'hs_pack_leader', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF ROOTS (T1 Nature)
  Data.define('improvements', IMP('imp_herbalist_conduit', '약초학자의 오두막', "Herbalist's Conduit",
    '숲과 늪 지방에서 식량과 마나를 뽑아내는 시설. 이 도시 영역의 아군 군세는 매 턴 체력을 더 회복합니다.',
    'Draws Food and Mana from forest and swamp provinces; friendly armies in this domain regenerate extra HP each turn.', 'tome_roots',
    { kind: 'conduit', feature: ['forest', 'swamp'], cost: { gold: 60, imperium: 0 }, yields: { food: 5, mana: 5 }, adjacencyBonus: { sameKind: 2 } }));

  Data.define('units', U('tn_entwined_thrall', '뒤엉킨 노예', 'Entwined Thrall', '독을 품은 식물성 생명체.', 'A poisonous, plantlike creature woven from roots.', 'tome_roots', {
    tier: 1, role: 'skirmisher', tags: ['plant'], mp: 36, source: { type: 'summon', id: 'tome_roots' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 55, def: 2, res: 0, morale: 0, statusRes: { blight: 4 },
    attacks: [{ id: 'thorn_spit', name: nm('가시 뱉기', 'Thorn Spit'), type: 'ranged', damage: 10, channel: 'blight', range: 3, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'poisoned', chance: 50 }], props: [] }],
    abilities: [], passives: ['forest_stalker'], immuneTags: undefined,
    look: { body: 'plant', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'nature', size: 'medium', tint: '#4c7a3a', glow: null },
  }));
  Data.define('units', U('tn_living_vine', '살아있는 덩굴', 'Living Vine', '전투 중 잠시 소환되어 적을 옭아매는 덩굴.', 'A vine briefly conjured in battle to bind enemies.', 'tome_roots', {
    tier: 1, role: 'skirmisher', tags: ['plant'], mp: 0, source: { type: 'summon', id: 'tome_roots' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 20, def: 0, res: 0, morale: 0,
    attacks: [{ id: 'entangle_lash', name: nm('휘감기', 'Entangling Lash'), type: 'melee', damage: 1, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 70, strikes: 1, effects: [{ status: 'rooted', chance: 60 }], props: [] }],
    abilities: [], passives: [],
    look: { body: 'plant', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'nature', size: 'small', tint: '#3a6b2e', glow: null },
  }));

  Data.define('spells', SP('sp_blight_blades', '역병의 칼날', 'Blight Blades', '이 인챈트를 받은 근접 유닛의 공격에 역병 피해가 추가되고 중독·부패 상태의 적에게 더 강하게 작용합니다.',
    'Enchanted melee units add Blight damage and hit Poisoned or Blighted targets harder.', {
      tier: 1, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter'], effects: { dmgPctVsBlighted: 10 }, attackChannel: 'blight' },
    }));
  Data.define('spells', SP('sp_healing_roots', '치유의 뿌리', 'Healing Roots', '아군 하나가 임시 체력을 얻고 재생하며, 발밑에 시야를 가리는 초목이 돋아납니다.',
    'A friendly unit gains temporary HP, Regeneration, and concealing undergrowth beneath it.', {
      tier: 1, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 10, cp: 15 }, upkeep: {}, target: 'ally_unit', range: 3, area: 0,
      effect: { type: 'heal', amount: 10 },
    }));
  Data.define('spells', SP('sp_poison_arrows', '독화살', 'Poison Arrows', '원거리 유닛의 화살에 독을 발라 중독을 퍼뜨립니다.',
    "Coats ranged units' arrows in venom that spreads Poisoned.", {
      tier: 1, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['ranged', 'skirmisher'], effects: {}, attackChannel: 'blight', attackStatus: { id: 'poisoned', chance: 60 } },
    }));
  Data.define('spells', SP('sp_summon_entwined_thrall', '뒤엉킨 노예 소환', 'Summon Entwined Thrall', '뒤엉킨 노예 한 마리를 군세에 더합니다.',
    'Adds an Entwined Thrall to your army.', {
      tier: 1, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 60, cp: 60 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_entwined_thrall', count: 1 },
    }));
  Data.define('spells', SP('sp_vine_prison', '덩굴 감옥', 'Vine Prison', '주변에 살아있는 덩굴 다섯 그루를 무작위로 소환합니다. 피해는 없지만 적을 속박할 수 있습니다.',
    "Summons five Living Vines at random nearby; they deal no damage but may Root enemies.", {
      tier: 1, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 30, cp: 25 }, upkeep: {}, target: 'hex', range: 4, area: 2,
      effect: { type: 'summon', unit: 'tn_living_vine', count: 5 },
    }));

  Data.define('tomes', TOME('tome_roots', '뿌리의 서', 'Tome of Roots', '자연 세계의 힘을 발견하여 적을 옭아매고 아군을 치유하는 데 특화합니다.',
    'Discover the power of the natural world; specialize in immobilizing enemies and healing allies.', {
      tier: 1, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_1',
      passive: { desc: nm('아군 도시 영역 안의 군세는 매 턴 체력을 5 추가로 회복합니다.', 'Friendly armies inside your domain regenerate an extra 5 HP per turn.'), effects: { healPerTurn: 1 } },
      contents: [
        { type: 'improvement', id: 'imp_herbalist_conduit', cost: kc(1) },
        { type: 'spell', id: 'sp_blight_blades', cost: kc(1) },
        { type: 'spell', id: 'sp_healing_roots', cost: kc(1) },
        { type: 'spell', id: 'sp_poison_arrows', cost: kc(1) },
        { type: 'spell', id: 'sp_summon_entwined_thrall', cost: kc(1) },
        { type: 'spell', id: 'sp_vine_prison', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF ENCHANTMENT (T1 Materium)
  Data.define('improvements', IMP('imp_runecarvers_camp', "룬조각가의 야영지", "Runecarver's Camp",
    '채석장 지방에 세우는 병영 시설로, 징집력과 마나를 제공하고 유닛 배치 지점이 됩니다.',
    "A quarry camp that yields Draft and Mana per adjacent Quarry, and doubles as a unit deployment point.", 'tome_enchantment',
    { kind: 'quarry', cost: { gold: 60, imperium: 0 }, yields: { draft: 15 }, adjacencyBonus: { sameKind: 3 } }));

  Data.define('units', U('tn_copper_golem', '구리 골렘', 'Copper Golem', '주문으로 빚어낸 최초의 구리 병사.', 'The first of the spell-forged constructs, cast in copper.', 'tome_enchantment', {
    tier: 1, role: 'polearm', tags: ['construct'], mp: 40, source: { type: 'summon', id: 'tome_enchantment' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 70, def: 3, res: 0, morale: 0,
    attacks: [{ id: 'halberd_strike', name: nm('미늘창 찌르기', 'Halberd Strike'), type: 'melee', damage: 16, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: ['defend'], passives: ['construct', 'pike_brace'],
    look: { body: 'golem', armor: 'none', weapon: 'halberd', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: '#b87333', glow: null },
  }));

  Data.define('spells', SP('sp_spell_tempered_shields', '주문 강화 방패', 'Spell-Tempered Shields', '이 인챈트를 받은 방패병은 저항력이 오르고, 방어 태세에 들어갈 때 인접 아군도 함께 저항력을 얻습니다.',
    'Enchanted Shield units gain Resistance, and grant it to adjacent allies when entering Defense Mode.', {
      tier: 1, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 70, cp: 70 }, upkeep: { mana: 3 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield'], effects: { res: 1 } },
    }));
  Data.define('spells', SP('sp_summon_copper_golem', '구리 골렘 소환', 'Summon Copper Golem', '구리 골렘 한 기를 군세에 더합니다.',
    'Adds a Copper Golem to your army.', {
      tier: 1, affinity: { materium: 1 }, kind: 'summon', cost: { mana: 60, cp: 60 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_copper_golem', count: 1 },
    }));
  Data.define('spells', SP('sp_awakened_tools', '깨어난 도구', 'Awakened Tools', '지정한 도시의 생산력과 징집력이 크게 오르지만 안정도가 떨어집니다.',
    "Boosts the target city's Production and Draft sharply, at the cost of Stability.", {
      tier: 1, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 60, cp: 60 }, upkeep: { mana: 6 }, target: 'city', range: 0, area: 0,
      effect: { type: 'resource', production: 20, draft: 20, stability: -10 },
    }));
  Data.define('spells', SP('sp_purging_arrows', '정화의 화살', 'Purging Arrows', '원거리 유닛의 공격이 마법 기원 유닛에게 더 강해지고, 적의 강화 효과를 벗겨낼 확률을 얻습니다.',
    "Ranged units' attacks hit Magic Origin units harder and may strip a buff.", {
      tier: 1, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 70, cp: 70 }, upkeep: { mana: 3 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['ranged', 'skirmisher'], effects: { dmgPctVsMagicOrigin: 10 } },
    }));
  Data.define('spells', SP('sp_sundering_blades', '분쇄의 칼날', 'Sundering Blades', '근접 유닛의 공격이 방어 분쇄를 확정적으로 입히고 강화된 장애물을 파괴할 수 있게 됩니다.',
    "Melee units' attacks reliably Sunder Defense and can demolish reinforced obstacles.", {
      tier: 1, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter'], effects: {}, attackStatus: { id: 'sundered', chance: 90 } },
    }));

  Data.define('tomes', TOME('tome_enchantment', '부여술의 서', 'Tome of Enchantment', '유닛 인챈트로 군세를 개선하고 물리 피해에 특화합니다.',
    'Improve your units with Unit Enchantments and specialize in Physical Damage.', {
      tier: 1, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_1',
      passive: { desc: nm('보유한 유닛 인챈트 하나당 유닛 유지비 -2% (최대 -10%).', "-2% unit upkeep for each Unit Enchantment you have active (max -10%)."), effects: { upkeepPct: -2 } },
      contents: [
        { type: 'improvement', id: 'imp_runecarvers_camp', cost: kc(1) },
        { type: 'spell', id: 'sp_spell_tempered_shields', cost: kc(1) },
        { type: 'spell', id: 'sp_summon_copper_golem', cost: kc(1) },
        { type: 'spell', id: 'sp_awakened_tools', cost: kc(1) },
        { type: 'spell', id: 'sp_purging_arrows', cost: kc(1) },
        { type: 'spell', id: 'sp_sundering_blades', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF ROCK (T1 Materium)
  Data.define('improvements', IMP('imp_central_quarry', '중앙 채석장', 'Central Quarry',
    '생산력을 크게 늘려주는 채석장. 인접 채석장마다 생산력이 추가로 오릅니다.',
    'A quarry that greatly boosts Production, more so for each adjacent Quarry.', 'tome_rock',
    { kind: 'quarry', cost: { gold: 60, imperium: 0 }, yields: { production: 15 }, adjacencyBonus: { sameKind: 5 } }));

  Data.define('abilities', { id: 'ab_gargoyle_turn_to_stone', kind: 'active', name: nm('돌로 변하기', 'Turn to Stone'), desc: nm('남은 행동을 모두 소모해 살갗을 돌처럼 굳힙니다. 돌 피부를 얻습니다.', 'Spends the remaining action hardening its hide to stone, gaining Stone Skin.'), ap: 3, cooldown: 0, range: 0, target: 'self', area: 0, icon: 'shield', effect: { type: 'status', status: 'stone_skin', duration: 1, chance: 100 } });
  Data.define('units', U('tn_gargoyle', '가고일', 'Gargoyle', '몸을 돌처럼 굳혀 적의 공격을 흘려내는 비행 돌격병.', 'A flying Shock unit that can harden itself to blunt enemy attacks.', 'tome_rock', {
    tier: 2, role: 'shock', tags: ['construct', 'flying'], move: 'fly', mp: 44, source: { type: 'tome', id: 'tome_rock' },
    cost: { gold: 50, mana: 50, draft: 120 }, upkeep: { gold: 12, mana: 0 },
    hp: 80, def: 4, res: 0, morale: 0,
    attacks: [{ id: 'charge_strike', name: nm('돌격 강타', 'Charge Strike'), type: 'melee', damage: 18, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['charge'] }],
    abilities: ['ab_gargoyle_turn_to_stone'], passives: ['flying', 'construct'],
    look: { body: 'golem', armor: 'none', weapon: 'claws', helm: 'none', cape: false, shield: 'none', element: 'stone', size: 'medium', tint: '#8d8378', glow: null },
  }));
  Data.define('units', U('tn_stone_spirit_lesser', '하급 바위 정령', 'Lesser Stone Spirit', '방어력이 뛰어난 바위 정령.', 'A stone elemental with excellent defenses.', 'tome_rock', {
    tier: 1, role: 'shield', tags: ['elemental'], mp: 32, source: { type: 'summon', id: 'tome_rock' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 65, def: 4, res: 1, morale: 0,
    attacks: [{ id: 'rock_fist', name: nm('바위 주먹', 'Rock Fist'), type: 'melee', damage: 12, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: ['defend'], passives: ['hardened'],
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'stone', size: 'medium', tint: '#8d8378', glow: null },
  }));

  Data.define('spells', SP('sp_rock_blast', '바위 폭발', 'Rock Blast', '대상 적이 물리 피해를 입고 방어 태세와 반격이 풀립니다.',
    "The target enemy takes Physical damage and loses Defense Mode and its retaliation.", {
      tier: 1, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 10, cp: 15 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0,
      effect: { type: 'damage', channel: 'physical', amount: 24 },
    }));
  Data.define('spells', SP('sp_obsidian_weapons', '흑요석 무기', 'Obsidian Weapons', '근접 유닛의 무기를 흑요석으로 벼려 피해를 더하고 출혈을 유발합니다.',
    "Edges melee weapons with obsidian, adding damage and a chance to inflict Bleeding.", {
      tier: 1, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: {}, attackStatus: { id: 'bleeding', chance: 60 } },
    }));
  Data.define('spells', SP('sp_stone_skin', '돌 피부', 'Stone Skin', '대상 유닛이 돌 피부 상태가 되어 방어력이 크게 오릅니다.',
    'The target gains Stone Skin, sharply raising its Defense.', {
      tier: 1, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 5, cp: 10 }, upkeep: {}, target: 'ally_unit', range: 4, area: 0,
      effect: { type: 'status', status: 'stone_skin', duration: 3, chance: 100 },
    }));
  Data.define('spells', SP('sp_summon_lesser_stone_spirit', '하급 바위 정령 소환', 'Summon Lesser Stone Spirit', '방어에 뛰어난 하급 바위 정령을 군세에 더합니다.',
    'Adds a defensively strong Lesser Stone Spirit to your army.', {
      tier: 1, affinity: { materium: 1 }, kind: 'summon', cost: { mana: 60, cp: 60 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_stone_spirit_lesser', count: 1 },
    }));

  Data.define('transformations', TR('tr_earthkin', '대지의 혈족', 'Earthkin', '대상 종족의 피부에 돌기가 돋아 방어력이 오르고 산악 위장 및 빠른 산악 이동을 얻습니다.',
    'Rock growths develop on the target race: +1 Defense, Mountain Camouflage and faster movement on Mountains.', 'tome_rock',
    { kind: 'minor', effects: { def: 1 }, look: { skin2: '#8d8378' } }));

  Data.define('heroSkills', HS('hs_still_as_stone', '부동의 돌', 'Still as Stone', '매 턴 시작 시 방어력과 저항력이 2씩 오르며, 다음 턴이 오거나 이동하기 전까지 유지됩니다.',
    'At the start of each turn, gain +2 Defense and +2 Resistance until the start of the next turn or until moving.',
    { tier: 1, cost: 1, effects: { def: 2, res: 2 } }));

  Data.define('tomes', TOME('tome_rock', '바위의 서', 'Tome of Rock', '돌의 힘으로 적을 짓이깁니다. 방어력을 높이고 물리 피해를 다루는 데 특화합니다.',
    "Smash your enemies with the force of stone. Specialize in raising defenses and dealing Physical damage.", {
      tier: 1, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_1',
      passive: { desc: nm('산악·구릉 지형에 있는 아군 유닛은 방어력 +1.', '+1 Defense for friendly units standing on Hills or Mountains.'), effects: { def: 1 } },
      contents: [
        { type: 'improvement', id: 'imp_central_quarry', cost: kc(1) },
        { type: 'unit', id: 'tn_gargoyle', cost: kc(1, true) },
        { type: 'spell', id: 'sp_rock_blast', cost: kc(1) },
        { type: 'transformation', id: 'tr_earthkin', cost: kc(1) },
        { type: 'spell', id: 'sp_obsidian_weapons', cost: kc(1) },
        { type: 'spell', id: 'sp_stone_skin', cost: kc(1) },
        { type: 'spell', id: 'sp_summon_lesser_stone_spirit', cost: kc(1) },
        { type: 'skill', id: 'hs_still_as_stone', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE SPRITE (T1 Astral/Nature)
  Data.define('improvements', IMP('imp_fey_woods', '요정의 숲', 'Fey Woods',
    '숲 지방의 보호구역으로 식량과 징집력, 그리고 인접 보호구역마다 마나를 제공합니다.',
    'A forest sanctuary yielding Food and Draft, plus Mana for each adjacent Forester.', 'tome_sprite',
    { kind: 'forester', feature: ['forest'], cost: { gold: 60, imperium: 0 }, yields: { food: 10, draft: 5 }, adjacencyBonus: { sameKind: 2 } }));

  Data.define('units', U('tn_morning_sprite', '아침 요정', 'Morning Sprite', '아군을 지원하는 작은 요정.', 'A tiny fey that supports its allies.', 'tome_sprite', {
    tier: 1, role: 'support', tags: ['fey', 'magic_origin'], move: 'fly', mp: 44, source: { type: 'summon', id: 'tome_sprite' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 50, def: 0, res: 2, morale: 0,
    attacks: [{ id: 'sprite_dust', name: nm('요정 가루', 'Sprite Dust'), type: 'ranged', damage: 6, channel: 'spirit', range: 2, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'distracted', chance: 40 }], props: ['magic'] }],
    abilities: ['heal_wounds'], passives: ['flying'],
    look: { body: 'wisp', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'nature', size: 'small', tint: '#8fd18a', glow: '#c9f5b8' },
  }));

  Data.define('spells', SP('sp_captivating_lights', '매혹의 불빛', 'Captivating Lights', '대상 적의 주의를 흐트러뜨려 방어 태세와 반격을 무력화합니다.',
    "Distracts the target enemy, nullifying its Defense Mode and retaliation.", {
      tier: 1, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 15, cp: 20 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0,
      effect: { type: 'status', status: 'distracted', duration: 1, chance: 100 },
    }));
  Data.define('spells', SP('sp_catnap', '낮잠', 'Catnap', '아군 군세가 남은 이동력을 모두 소모하는 대신, 소모한 이동력만큼 체력을 회복합니다.',
    'A friendly army spends all its remaining movement points and heals 1 HP per point spent.', {
      tier: 1, affinity: { nature: 1 }, kind: 'strategic', cost: { mana: 30, cp: 30 }, upkeep: {}, target: 'army', range: 0, area: 0,
      effect: { type: 'heal', amount: 20 },
    }));
  Data.define('spells', SP('sp_summon_sprite', '요정 소환', 'Summon Sprite', '아침 요정 한 마리를 군세에 더합니다.',
    'Adds a Morning Sprite to your army.', {
      tier: 1, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 60, cp: 60 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_morning_sprite', count: 1 },
    }));
  Data.define('spells', SP('sp_fairy_dust', '요정 가루 부여', 'Fairy Dust', '지원 유닛과 전투 마법사가 요정 가루 능력을 얻어 아군에게 무작위 긍정 효과를 뿌릴 수 있습니다.',
    'Grants Support and Battle Mage units a Fairy Dust ability that showers allies with a random buff.', {
      tier: 1, affinity: { astral: 1 }, kind: 'unit_enchant', cost: { mana: 70, cp: 70 }, upkeep: { mana: 3 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['support', 'mage'], effects: { healPct: 10 } },
    }));
  Data.define('spells', SP('sp_fey_bond', '요정의 유대', 'Fey Bond', '전투 시작 시 사기가 오르고, 사기 상태에 따라 상태이상 저항이 증가합니다.',
    'Grants Morale on combat start, with more Status Resistance the higher that Morale climbs.', {
      tier: 1, affinity: { astral: 1 }, kind: 'unit_enchant', cost: { mana: 70, cp: 70 }, upkeep: { mana: 3 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['all'], effects: { morale: 10 } },
    }));

  Data.define('tomes', TOME('tome_sprite', '작은 요정의 서', 'Tome of the Sprite', '작은 요정의 힘으로 아군을 지원하고 적을 현혹합니다.',
    'Use the powers of small Fey to support your units and befuddle your enemies.', {
      tier: 1, affinity: { astral: 1, nature: 1 }, expansion: 'secrets_of_the_archmages', icon: 'tome_nature_1',
      passive: { desc: nm('아군 마법 기원 유닛은 사기 +5.', '+5 Morale for friendly Magic Origin units.'), effects: { morale: 2 } },
      contents: [
        { type: 'improvement', id: 'imp_fey_woods', cost: kc(1) },
        { type: 'spell', id: 'sp_captivating_lights', cost: kc(1) },
        { type: 'spell', id: 'sp_catnap', cost: kc(1) },
        { type: 'spell', id: 'sp_summon_sprite', cost: kc(1) },
        { type: 'spell', id: 'sp_fairy_dust', cost: kc(1) },
        { type: 'spell', id: 'sp_fey_bond', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF ALCHEMY (T1 Materium/Nature)
  Data.define('improvements', IMP('imp_alchemists_lab', '연금술사의 실험실', "Alchemist's Lab",
    '지식을 생산하는 연구소로 인접한 고유 지방 개발물마다 지식이 추가로 오릅니다.',
    'A research post that yields Knowledge, more so for each adjacent unique Province Improvement.', 'tome_alchemy',
    { kind: 'research_post', cost: { gold: 100, imperium: 0 }, yields: { knowledge: 10 }, adjacencyBonus: { sameKind: 3 } }));
  Data.define('improvements', IMP('imp_material_refinery', '재료 정제소', 'Material Refinery',
    '금과 지식을 생산하며, 영역 안의 마법 재료마다 금과 지식이 추가로 오릅니다.',
    'Yields Gold and Knowledge, boosted by each Magic Material inside the domain.', 'tome_alchemy',
    { kind: 'special', cost: { gold: 100, imperium: 0 }, yields: { gold: 5, knowledge: 5 }, adjacencyBonus: { sameKind: 0 } }));

  Data.define('units', U('tn_afflictor', '고통유발자', 'Afflictor', '독무로 적을 약화시키는 원거리 유닛.', 'A Ranged unit that conjures Miasmas to debilitate enemies.', 'tome_alchemy', {
    tier: 2, role: 'ranged', tags: ['racial'], mp: 40, source: { type: 'tome', id: 'tome_alchemy' },
    cost: { gold: 100, mana: 0, draft: 120 }, upkeep: { gold: 12, mana: 0 }, statusRes: { blight: 4 },
    hp: 65, def: 1, res: 1, morale: 0,
    attacks: [{ id: 'repeater_crossbow', name: nm('연발 석궁', 'Repeater Crossbow'), type: 'ranged', damage: 8, channel: 'physical', range: 4, ap: 1, repeat: 2, accuracy: 80, strikes: 2, effects: [], props: [] }],
    abilities: ['ab_afflictor_miasma_shot', 'defend'], passives: [],
    look: { body: 'form', armor: 'leather', weapon: 'crossbow', helm: 'hood', cape: false, shield: 'none', element: null, size: 'medium', tint: null, glow: null },
  }));
  Data.define('abilities', { id: 'ab_afflictor_miasma_shot', kind: 'attack', name: nm('독무 사격', 'Miasma Shot'), desc: nm('독무로 뒤덮인 화살을 쏘아 역병 피해를 주고 약화를 겁니다.', 'Fires a miasma-soaked bolt dealing Blight damage and inflicting Weakened.'), ap: 1, cooldown: 2, range: 4, target: 'enemy', area: 1, icon: 'poison', effect: { type: 'damage', channel: 'blight', amount: 10, range: 4, area: 1, attackType: 'ranged', status: 'weakened', chance: 50, duration: 3 } });

  Data.define('spells', SP('sp_disperse_afflicting_miasma', '고통의 독무 살포', 'Disperse Afflicting Miasma', '지정한 지역에 독무를 퍼뜨려 그 안의 적들을 약화시킵니다.',
    'Spreads a debilitating miasma over the area, weakening enemies inside it.', {
      tier: 1, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 15, cp: 20 }, upkeep: {}, target: 'hex', range: 4, area: 1,
      effect: { type: 'status', status: 'weakened', duration: 3, chance: 80, area: 1 },
    }));
  Data.define('spells', SP('sp_mysterious_tonic', '수상한 물약', 'Mysterious Tonic', '지원 유닛이 물약을 나누어 주어 긍정 효과를 주는 동시에 부정 효과 하나를 없앱니다.',
    'Support units distribute a tonic that grants a buff while removing a debuff.', {
      tier: 1, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 70, cp: 70 }, upkeep: { mana: 3 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['support'], effects: { healPct: 10 } },
    }));
  Data.define('spells', SP('sp_antimagic_tincture', '항마 정제', 'Antimagic Tincture', '주변 아군의 부정 효과 일부를 씻어내고 상태이상 저항을 올립니다.',
    'Cleanses some debuffs from nearby allies and raises their Status Resistance.', {
      tier: 1, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 10, cp: 15 }, upkeep: {}, target: 'ally_unit', range: 0, area: 1,
      effect: { type: 'heal', amount: 0, cleanse: true, area: 1 },
    }));
  Data.define('spells', SP('sp_fumigation', '훈증', 'Fumigation', '공성전 시작 시 수비 유닛이 역병 피해를 입고 약화됩니다.',
    'At the start of a siege, defending units take Blight damage and become Weakened.', {
      tier: 1, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 0, cp: 0 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'special', id: 'siege_fumigation', channel: 'blight', amount: 16 },
    }));

  Data.define('heroSkills', HS('hs_purging_strikes', '정화의 일격', 'Purging Strikes', '기본 공격이 60% 확률로 대상의 긍정 효과 하나를 없앱니다.',
    "Base attacks have a 60% chance to strip one buff from the target.",
    { tier: 1, cost: 1, effects: { dmgPct: 5 } }));

  Data.define('tomes', TOME('tome_alchemy', '연금술의 서', 'Tome of Alchemy', '적에게 부정 효과를 걸고 아군의 부정 효과는 줄입니다. 정제약과 강력한 원거리 유닛으로 전황을 조율합니다.',
    "Inflict your enemies with debuffs and mitigate them on your own units; tinctures and a powerful ranged unit turn the tide.", {
      tier: 1, affinity: { materium: 1, nature: 1 }, expansion: 'empires_and_ashes', icon: 'tome_materium_1',
      passive: { desc: nm('보유한 마법 재료 지방 하나당 지식 +2.', '+2 Knowledge for each Magic Material province you own.'), effects: { knowledge: 2 } },
      contents: [
        { type: 'improvement', id: 'imp_alchemists_lab', cost: kc(1) },
        { type: 'spell', id: 'sp_disperse_afflicting_miasma', cost: kc(1) },
        { type: 'spell', id: 'sp_mysterious_tonic', cost: kc(1) },
        { type: 'unit', id: 'tn_afflictor', cost: kc(1, true) },
        { type: 'spell', id: 'sp_antimagic_tincture', cost: kc(1) },
        { type: 'spell', id: 'sp_fumigation', cost: kc(1) },
        { type: 'improvement', id: 'imp_material_refinery', cost: kc(1) },
        { type: 'skill', id: 'hs_purging_strikes', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF EVOLUTION (T1 Nature/Chaos)
  Data.define('units', U('tn_slither_hatchling', '슬리더 유생', 'Slither Hatchling', '더 강한 형태로 진화하는 파충류 척후병.', 'A reptilian Skirmisher that evolves into a stronger form.', 'tome_evolution', {
    tier: 1, role: 'skirmisher', tags: ['racial'], mp: 40, source: { type: 'tome', id: 'tome_evolution' },
    cost: { gold: 60, mana: 0, draft: 80 }, upkeep: { gold: 8, mana: 0 },
    hp: 65, def: 2, res: 0, morale: 0,
    attacks: [{ id: 'venomous_spit', name: nm('독액 뱉기', 'Venomous Spit'), type: 'ranged', damage: 8, channel: 'blight', range: 3, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'poisoned', chance: 50 }], props: [] }],
    abilities: ['defend'], passives: ['swift'],
    look: { body: 'beast_serpent', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: '#5a8a3a', glow: null },
  }));
  Data.define('units', U('tn_wyvern_fledgling', '와이번 유생', 'Wyvern Fledgling', '아직 어린 와이번으로, 자라면 더 강한 마법 전투원이 됩니다.', 'A young wyvern that grows into a stronger magic fighter.', 'tome_evolution', {
    tier: 1, role: 'mage', tags: ['dragon', 'flying'], move: 'fly', mp: 48, source: { type: 'summon', id: 'tome_evolution' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 60, def: 1, res: 1, morale: 0,
    attacks: [{ id: 'ember_bite', name: nm('불씨 물기', 'Ember Bite'), type: 'melee', damage: 12, channel: 'fire', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'burning', chance: 25 }], props: ['magic'] }],
    abilities: [], passives: ['flying'],
    look: { body: 'drake', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'medium', tint: '#c25b2e', glow: null },
  }));

  Data.define('spells', SP('sp_youthful_rejuvenation', '젊음의 활력', 'Youthful Rejuvenation', '대상이 임시 체력을 얻고 강화되며, 진화하는 유닛은 재기 상태가 됩니다.',
    'Heals and strengthens the target; units that Evolve also gain Resurgence for the battle.', {
      tier: 1, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 10, cp: 15 }, upkeep: {}, target: 'ally_unit', range: 3, area: 0,
      effect: { type: 'heal', amount: 25, status: 'strengthened', duration: 3 },
    }));
  Data.define('spells', SP('sp_rapid_evolution_enchantment', '급속 진화 부여', 'Rapid Evolution Enchantment', '진화하는 유닛이 매 턴 경험치를 얻고, 전투당 한 번 죽음에서 벗어납니다.',
    'Units that Evolve gain experience each turn and slip away from death once per battle.', {
      tier: 1, affinity: { chaos: 1 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['racial'], effects: { xpPct: 15 } },
    }));
  Data.define('spells', SP('sp_summon_wyvern_fledgling', '와이번 유생 소환', 'Summon Wyvern Fledgling', '와이번 유생 한 마리를 목표 지역에 소환합니다.',
    'Summons a Wyvern Fledgling onto the target hex.', {
      tier: 1, affinity: { chaos: 1 }, kind: 'summon', cost: { mana: 60, cp: 60 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_wyvern_fledgling', count: 1 },
    }));

  Data.define('transformations', TR('tr_draconic_vitality', '용의 활력', 'Draconic Vitality', '대상 종족이 용과 같은 활력을 얻어 세계 지도에서 체력을 더 빨리 회복하고 계급·레벨마다 최대 체력이 오릅니다.',
    'Imbues the target race with dragon-like vitality: faster world-map HP regen and more max HP per rank/level.', 'tome_evolution',
    { kind: 'minor', effects: { hp: 6 }, look: { fur: null } }));

  Data.define('tomes', TOME('tome_evolution', '진화의 서', 'Tome of Evolution', '어린 원시의 존재를 거두어 강력한 아군으로 길러냅니다.',
    'Take young primal forces and nurture them into formidable allies.', {
      tier: 1, affinity: { nature: 1, chaos: 1 }, expansion: 'dragon_dawn', icon: 'tome_nature_1',
      passive: { desc: nm('진화하는 아군 유닛은 매 턴 경험치 +5.', '+5 experience per turn for friendly units that can Evolve.'), effects: { xpPct: 5 } },
      contents: [
        { type: 'unit', id: 'tn_slither_hatchling', cost: kc(1, true) },
        { type: 'spell', id: 'sp_youthful_rejuvenation', cost: kc(1) },
        { type: 'spell', id: 'sp_rapid_evolution_enchantment', cost: kc(1) },
        { type: 'spell', id: 'sp_summon_wyvern_fledgling', cost: kc(1) },
        { type: 'transformation', id: 'tr_draconic_vitality', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF FERTILITY (T2 Nature)
  Data.define('improvements', IMP('imp_bountiful_fields', '풍요로운 들판', 'Bountiful Fields',
    '식량을 크게 늘리는 농장으로, 인접한 초원 지방마다 식량과 마나가 추가로 오릅니다.',
    'A farm that greatly boosts Food, plus more Food and Mana for each adjacent Grassland province.', 'tome_fertility',
    { kind: 'farm', feature: ['none'], cost: { gold: 100, imperium: 0 }, yields: { food: 10 }, adjacencyBonus: { sameKind: 3 } }));
  Data.define('improvements', IMP('imp_temple_of_fertility', '풍요의 신전', 'Temple of Fertility',
    '식량을 생산하며, 도시 인구 한 명당 식량과 징집력이 추가로 오릅니다.',
    'Yields Food, with more Food and Draft per city Population.', 'tome_fertility',
    { kind: 'special', cost: { gold: 100, imperium: 0 }, yields: { food: 10 }, adjacencyBonus: {} }));

  Data.define('spells', SP('sp_restore_the_land', '대지의 회복', 'Restore the Land', '대상과 인접한 지방이 비옥한 초원으로 되돌아가고, 늪·눈·사막 등 척박한 지형이 사라집니다.',
    'The target and adjacent provinces return to lush Grassland, losing Swamp, Snow, Sand and other blighted terrain.', {
      tier: 2, affinity: { nature: 1 }, kind: 'transform', cost: { mana: 45, cp: 45 }, upkeep: {}, target: 'province', range: 0, area: 1,
      effect: { type: 'terraform', terrain: 'grass', feature: 'none', radius: 1 },
    }));
  Data.define('spells', SP('sp_staves_of_life', '생명의 지팡이', 'Staves of Life', '지원 유닛의 지원 능력이 발동될 때마다 주변 아군 하나를 추가로 치유합니다.',
    "Whenever a Support unit's support ability triggers, it also heals a nearby random ally.", {
      tier: 2, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['support'], effects: { healPct: 15 } },
    }));
  Data.define('spells', SP('sp_blossom_of_life', '생명의 개화', 'Blossom of Life', '주변의 아군이 재생 효과를 얻어 매 턴 체력을 회복합니다.',
    'Nearby allies gain Regeneration, healing HP each turn.', {
      tier: 2, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 45, cp: 30 }, upkeep: {}, target: 'ally_unit', range: 0, area: 2,
      effect: { type: 'status', status: 'regenerating', duration: 3, chance: 100, area: 2 },
    }));
  Data.define('spells', SP('sp_summon_nymph', '님프 소환', 'Summon Nymph', '치유에 능한 님프 한 마리를 목표 지역에 소환합니다.',
    'Summons a healing Nymph onto the target world hex.', {
      tier: 2, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_nymph', count: 1 },
    }));
  Data.define('units', U('tn_nymph', '님프', 'Nymph', '아군을 어루만져 치유하는 자연의 정령.', 'A nature spirit whose touch heals allies.', 'tome_fertility', {
    tier: 3, role: 'support', tags: ['spirit', 'magic_origin'], mp: 40, source: { type: 'summon', id: 'tome_fertility' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 80, def: 2, res: 4, morale: 0,
    attacks: [{ id: 'life_bloom', name: nm('생명의 개화', 'Life Bloom'), type: 'ranged', damage: 6, channel: 'spirit', range: 2, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['heal_wounds', 'mass_heal', 'defend'], passives: [],
    look: { body: 'spirit', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'nature', size: 'medium', tint: '#8fd18a', glow: '#c9f5b8' },
  }));

  Data.define('tomes', TOME('tome_fertility', '풍요의 서', 'Tome of Fertility', '자연의 풍성한 결실을 누립니다. 제국에 넉넉한 식량을 대고 전투 중 아군을 치유합니다.',
    'Thrive on the bountiful spoils of nature; supply ample Food and heal your units in battle.', {
      tier: 2, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_2',
      passive: { desc: nm('제국 전체 식량 수입 +5%.', '+5% empire-wide Food income.'), effects: { foodPct: 5 } },
      contents: [
        { type: 'improvement', id: 'imp_bountiful_fields', cost: kc(2) },
        { type: 'spell', id: 'sp_restore_the_land', cost: kc(2) },
        { type: 'spell', id: 'sp_staves_of_life', cost: kc(2) },
        { type: 'improvement', id: 'imp_temple_of_fertility', cost: kc(2) },
        { type: 'spell', id: 'sp_blossom_of_life', cost: kc(2) },
        { type: 'spell', id: 'sp_summon_nymph', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF GLADES (T2 Nature)
  Data.define('improvements', IMP('imp_sacred_meadow', '신성한 초지', 'Sacred Meadow',
    '식량을 제공하는 농장으로, 전투가 시작될 때 이 지방에 있는 아군에게 고무를 부여합니다.',
    'A farm yielding Food; friendly units on this hex gain Inspired at the start of the next battle.', 'tome_glades',
    { kind: 'farm', cost: { gold: 100, imperium: 0 }, yields: { food: 10 }, adjacencyBonus: {} }));

  Data.define('units', U('tn_floral_stinger', '꽃 침벌레', 'Floral Stinger', '초목 장애물이 변신한 척후병.', 'A Flora obstacle transformed into a living skirmisher.', 'tome_glades', {
    tier: 2, role: 'skirmisher', tags: ['plant'], mp: 40, source: { type: 'summon', id: 'tome_glades' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 80, def: 2, res: 0, morale: 0,
    attacks: [{ id: 'pollen_sting', name: nm('꽃가루 침', 'Pollen Sting'), type: 'ranged', damage: 12, channel: 'blight', range: 2, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'poisoned', chance: 40 }], props: [] }],
    abilities: [], passives: ['forest_stalker'],
    look: { body: 'plant', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'nature', size: 'medium', tint: '#7a4f9c', glow: null },
  }));
  Data.define('units', U('tn_glade_runner', '숲 질주자', 'Glade Runner', '적을 표시해 약화시키는 정찰 궁수.', 'A ranged scout that marks and weakens enemies.', 'tome_glades', {
    tier: 3, role: 'ranged', tags: ['racial'], mp: 44, source: { type: 'tome', id: 'tome_glades' },
    cost: { gold: 140, mana: 0, draft: 220 }, upkeep: { gold: 20, mana: 0 }, statusRes: { nature: 3 },
    hp: 85, def: 2, res: 2, morale: 0,
    attacks: [{ id: 'shoot_bow', name: nm('활 사격', 'Shoot Bow'), type: 'ranged', damage: 14, channel: 'physical', range: 5, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: ['mark_target', 'defend'], passives: ['true_sight'],
    look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood', cape: 'short', shield: 'none', element: null, size: 'medium', tint: null, glow: null },
  }));
  Data.define('units', U('tn_entwined_protector', '뒤엉킨 수호자', 'Entwined Protector', '치유 능력을 갖춘 튼튼한 방패 식물.', 'A sturdy plant Shield unit with healing abilities.', 'tome_glades', {
    tier: 3, role: 'shield', tags: ['plant'], mp: 32, source: { type: 'summon', id: 'tome_glades' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 100, def: 7, res: 3, morale: 0,
    attacks: [{ id: 'root_bash', name: nm('뿌리 강타', 'Root Bash'), type: 'melee', damage: 14, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: ['heal_wounds', 'defend'], passives: ['bulwark'],
    look: { body: 'plant', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'round', element: 'nature', size: 'large', tint: '#3a6b2e', glow: null },
  }));

  Data.define('spells', SP('sp_animate_flora', '초목 생동', 'Animate Flora', '초목 장애물 하나가 아군 꽃 침벌레로 되살아납니다.',
    'A Flora obstacle rises as a friendly Floral Stinger.', {
      tier: 2, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 15, cp: 20 }, upkeep: {}, target: 'hex', range: 4, area: 0,
      effect: { type: 'summon', unit: 'tn_floral_stinger', count: 1 },
    }));
  Data.define('spells', SP('sp_create_forest', '숲 조성', 'Create Forest', '대상과 인접한 지방에 숲이 자라납니다.',
    'Forest grows across the target and adjacent provinces.', {
      tier: 2, affinity: { nature: 1 }, kind: 'transform', cost: { mana: 45, cp: 45 }, upkeep: {}, target: 'province', range: 0, area: 1,
      effect: { type: 'terraform', terrain: 'forest', feature: 'forest', radius: 1 },
    }));
  Data.define('spells', SP('sp_aspect_of_the_root', '뿌리의 상', 'Aspect of the Root', '근접 유닛이 전투 중 스스로를 치유할 수 있는 능력을 얻습니다.',
    'Grants melee units the ability to heal themselves in battle.', {
      tier: 2, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'mage'], effects: { healPerTurn: 4 } },
    }));
  Data.define('spells', SP('sp_summon_entwined_protector', '뒤엉킨 수호자 소환', 'Summon Entwined Protector', '치유 능력을 갖춘 뒤엉킨 수호자를 목표 지역에 소환합니다.',
    'Summons a healing Entwined Protector onto the target world hex.', {
      tier: 2, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_entwined_protector', count: 1 },
    }));

  Data.define('transformations', TR('tr_leafskin', '나뭇잎 피부', 'Leafskin', '대상 종족이 숲과 하나가 되어 숲 보행·위장을 얻고, 숲 지방에서 회피·명중률·치명타 확률이 오릅니다.',
    'Makes the target race one with the forest: Forest Walk, Forest Camouflage, and combat bonuses while in forest.', 'tome_glades',
    { kind: 'minor', effects: { accuracy: 5, critChance: 5 }, look: { skin2: '#3a6b2e' } }));

  Data.define('tomes', TOME('tome_glades', '숲그늘의 서', 'Tome of Glades', '숲을 조성하고 지켜냅니다. 치유와 숲 활용에 특화합니다.',
    'Create and protect forests; specialize in healing and making use of forests.', {
      tier: 2, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_2',
      passive: { desc: nm('숲·밀림 지형에 있는 아군 유닛은 저항력 +1.', '+1 Resistance for friendly units standing in Forest.'), effects: { res: 1 } },
      contents: [
        { type: 'improvement', id: 'imp_sacred_meadow', cost: kc(2) },
        { type: 'spell', id: 'sp_animate_flora', cost: kc(2) },
        { type: 'spell', id: 'sp_create_forest', cost: kc(2) },
        { type: 'unit', id: 'tn_glade_runner', cost: kc(2, true) },
        { type: 'transformation', id: 'tr_leafskin', cost: kc(2) },
        { type: 'spell', id: 'sp_aspect_of_the_root', cost: kc(2) },
        { type: 'spell', id: 'sp_summon_entwined_protector', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF ARTIFICING (T2 Materium)
  Data.define('improvements', IMP('imp_golem_mine', '골렘 광산', 'Golem Mine',
    '금을 생산하는 광산으로, 인접 채석장마다 생산력이 오르고 이 도메인의 전투에 아군 철 골렘이 참전합니다.',
    'A mine yielding Gold, plus Production per adjacent Quarry; an Iron Golem joins your side in battles here.', 'tome_artificing',
    { kind: 'mine', cost: { gold: 100, imperium: 0 }, yields: { gold: 10 }, adjacencyBonus: { sameKind: 5 } }));
  Data.define('improvements', IMP('imp_artisan_fortification', '장인의 요새화', 'Artisan Fortification',
    '공성전에서 도시에 쇠뇌 포탑을 배치하는 탑 구조물.',
    'A Tower Structure that grants the city Bolt Repeater Towers during siege combat.', 'tome_artificing',
    { kind: 'special', cost: { gold: 170, imperium: 0 }, yields: {}, adjacencyBonus: {} }));

  Data.define('units', U('tn_iron_golem', '철 골렘', 'Iron Golem', '아군을 부정 효과로부터 보호하는 견고한 방패 유닛.', 'A highly defensive Shield unit that shields allies from debuffs.', 'tome_artificing', {
    tier: 3, role: 'shield', tags: ['construct'], mp: 40, source: { type: 'tome', id: 'tome_artificing' },
    cost: { gold: 140, mana: 0, draft: 220 }, upkeep: { gold: 20, mana: 0 },
    hp: 100, def: 7, res: 2, morale: 0, statusRes: { physical: 3 },
    attacks: [{ id: 'iron_fist', name: nm('철권', 'Iron Fist'), type: 'melee', damage: 16, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: ['defend'], passives: ['construct', 'guard', 'siege_breaker'],
    look: { body: 'golem', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'tower', element: null, size: 'large', tint: '#8a8f98', glow: null },
  }));

  Data.define('spells', SP('sp_artisan_armaments', '장인의 무장', 'Artisan Armaments', '근접·척후 유닛의 치명타 확률이 크게 오릅니다.',
    'Sharply raises the critical hit chance of melee and skirmisher units.', {
      tier: 2, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: { critChance: 25 } },
    }));
  Data.define('spells', SP('sp_construct_bolt_repeaters', '쇠뇌 연사기 건조', 'Construct Bolt Repeaters', '전투 시작 시 쇠뇌 연사기 두 대를 공격측에 배치합니다.',
    'At battle start, deploys two Bolt Repeaters on the attacking side.', {
      tier: 2, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 0, cp: 0 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'special', id: 'siege_bolt_repeaters' },
    }));
  Data.define('spells', SP('sp_siege_magic', '공성 마법', 'Siege Magic', '지원·전투 마법사 유닛이 피해가 오르고 요새와 장애물을 부술 수 있게 됩니다.',
    'Support and Battle Mage units deal more damage and can demolish walls and obstacles.', {
      tier: 2, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['support', 'mage'], effects: { dmgPct: 10 } },
    }));

  Data.define('tomes', TOME('tome_artificing', '기술공학의 서', 'Tome of Artificing', '공성술과 정교한 무기, 골렘 제작에 특화합니다.',
    'Specialize in siegecraft, expertly crafted weapons, and Golems.', {
      tier: 2, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_2',
      passive: { desc: nm('아군 구조물 유닛은 공성 시 요새 피해 +1.', '+1 fortification damage per siege turn for friendly Construct units.'), effects: {} },
      contents: [
        { type: 'improvement', id: 'imp_golem_mine', cost: kc(2) },
        { type: 'spell', id: 'sp_artisan_armaments', cost: kc(2) },
        { type: 'spell', id: 'sp_construct_bolt_repeaters', cost: kc(2) },
        { type: 'unit', id: 'tn_iron_golem', cost: kc(2, true) },
        { type: 'improvement', id: 'imp_artisan_fortification', cost: kc(2) },
        { type: 'spell', id: 'sp_siege_magic', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF WINDS (T2 Materium)
  Data.define('units', U('tn_wind_rager', '바람 광란체', 'Wind Rager', '빠르고 교란시키는 마법 전투원.', 'A fast and disruptive Magic Fighter.', 'tome_winds', {
    tier: 2, role: 'mage', tags: ['elemental', 'flying'], move: 'fly', mp: 52, source: { type: 'summon', id: 'tome_winds' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 65, def: 2, res: 2, morale: 0,
    attacks: [{ id: 'gale_slash', name: nm('돌풍 베기', 'Gale Slash'), type: 'melee', damage: 14, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'slowed', chance: 30 }], props: ['magic'] }],
    abilities: ['sprint'], passives: ['flying', 'fast_movement'],
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: '#c9d6e0', glow: '#e8f2ff' },
  }));
  Data.define('units', U('tn_zephyr_archer', '미풍 궁수', 'Zephyr Archer', '사거리가 늘어난 광역 사격을 구사하는 궁수.', 'A Ranged unit with extra range and an area attack.', 'tome_winds', {
    tier: 3, role: 'ranged', tags: ['racial'], mp: 44, source: { type: 'tome', id: 'tome_winds' },
    cost: { gold: 140, mana: 0, draft: 220 }, upkeep: { gold: 20, mana: 0 },
    hp: 85, def: 2, res: 2, morale: 0, statusRes: { lightning: 3 },
    attacks: [{ id: 'zephyr_shot', name: nm('미풍 사격', 'Zephyr Shot'), type: 'ranged', damage: 12, channel: 'physical', range: 6, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: ['volley', 'defend'], passives: ['ranged_expert'],
    look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood', cape: 'short', shield: 'none', element: null, size: 'medium', tint: null, glow: null },
  }));

  Data.define('spells', SP('sp_abducting_cyclone', '납치의 선풍', 'Abducting Cyclone', '3칸 이내의 가장 가까운 적을 목표 지점으로 끌어당겨 기절시킵니다.',
    'Pulls the closest enemy within 3 hexes to the target hex, stunning it.', {
      tier: 2, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 15, cp: 20 }, upkeep: {}, target: 'hex', range: 3, area: 0,
      effect: { type: 'push', distance: 3, status: { id: 'stunned', chance: 90, duration: 1 } },
    }));
  Data.define('spells', SP('sp_dust_storm', '흙먼지 폭풍', 'Dust Storm', '주변의 적들이 물리 피해를 입고 실명합니다.',
    'Nearby enemies take Physical damage and are Blinded.', {
      tier: 2, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 15, cp: 20 }, upkeep: {}, target: 'hex', range: 4, area: 2,
      effect: { type: 'damage', channel: 'physical', amount: 10, area: 2, status: { id: 'blinded', chance: 90, duration: 1 } },
    }));
  Data.define('spells', SP('sp_favorable_winds', '순풍', 'Favorable Winds', '수상에 있으면 이동력을 모두, 육상에 있으면 절반을 회복합니다.',
    'A friendly army regains all movement points on water, half on land.', {
      tier: 2, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 80, cp: 80 }, upkeep: {}, target: 'army', range: 0, area: 0,
      effect: { type: 'special', id: 'restore_movement' },
    }));
  Data.define('spells', SP('sp_seeker_arrows', '추적 화살', 'Seeker Arrows', '원거리 유닛의 사거리가 1칸 늘어납니다.',
    'Ranged units gain +1 range on their missile attacks.', {
      tier: 2, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['ranged', 'skirmisher'], effects: {} },
    }));
  Data.define('spells', SP('sp_summon_wind_rager', '바람 광란체 소환', 'Summon Wind Rager', '빠르고 교란시키는 바람 광란체 한 마리를 군세에 더합니다.',
    'Adds a fast, disruptive Wind Rager to your army.', {
      tier: 2, affinity: { materium: 1 }, kind: 'summon', cost: { mana: 100, cp: 100 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_wind_rager', count: 1 },
    }));

  Data.define('tomes', TOME('tome_winds', '바람의 서', 'Tome of Winds', '바람의 힘을 이용해 속도를 높이고 적을 교란시킵니다.',
    'Harness the powers of the wind to gain boosts of speed and disrupt enemies.', {
      tier: 2, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_2',
      passive: { desc: nm('제국 전체 군대 이동력 +2.', '+2 world-map movement for all friendly armies.'), effects: { armyMove: 2 } },
      contents: [
        { type: 'spell', id: 'sp_abducting_cyclone', cost: kc(2) },
        { type: 'spell', id: 'sp_dust_storm', cost: kc(2) },
        { type: 'spell', id: 'sp_favorable_winds', cost: kc(2) },
        { type: 'spell', id: 'sp_seeker_arrows', cost: kc(2) },
        { type: 'spell', id: 'sp_summon_wind_rager', cost: kc(2) },
        { type: 'unit', id: 'tn_zephyr_archer', cost: kc(2, true) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE DUNGEON DEPTHS (T2 Materium)
  Data.define('improvements', IMP('imp_dungeoneering_conclave', '지하미궁 종회', 'Dungeoneering Conclave',
    '지하 지방에 던전을 확장시키는 시설로 지식을 제공하며, 인접 던전 지방마다 생산력이 오릅니다.',
    'Expands Dungeon terrain through the domain; yields Knowledge and Production per adjacent Dungeon province.', 'tome_dungeon_depths',
    { kind: 'research_post', cost: { gold: 100, imperium: 0 }, yields: { knowledge: 5 }, adjacencyBonus: { sameKind: 2 } }));
  Data.define('improvements', IMP('imp_underground_vault', '지하 금고', 'Underground Vault',
    '금을 생산하는 지하 광산으로, 인접 던전 지방마다 금과 결속 정수가 오릅니다.',
    'An underground mine yielding Gold, plus more Gold and Binding Essence per adjacent Dungeon province.', 'tome_dungeon_depths',
    { kind: 'mine', cost: { gold: 100, imperium: 0 }, yields: { gold: 10 }, adjacencyBonus: { sameKind: 3 } }));
  Data.define('improvements', IMP('imp_clay_forge', '점토 공방', 'Clay Forge',
    '인접 던전 지방마다 생산력과 징집력이 오르며 점토 병사 유닛의 징집을 가능하게 합니다.',
    'Yields Production and Draft per adjacent Dungeon province and unlocks drafting Clay soldier units.', 'tome_dungeon_depths',
    { kind: 'quarry', cost: { gold: 100, imperium: 0 }, yields: {}, adjacencyBonus: { sameKind: 5 } }));
  Data.define('improvements', IMP('imp_silent_barracks', '고요한 병영', 'Silent Barracks',
    '인접 던전 지방마다 요새 체력과 안정도가 오르고, 이 도메인의 전투에 점토 병사가 아군으로 참전합니다.',
    'Yields Fortification Health and Stability per adjacent Dungeon province; a Clay soldier joins battles here.', 'tome_dungeon_depths',
    { kind: 'quarry', cost: { gold: 100, imperium: 0 }, yields: {}, adjacencyBonus: { sameKind: 3 } }));

  Data.define('spells', SP('sp_dungeon_hazard', '던전의 위험', 'Dungeon Hazard', '적 군세가 물리 피해를 입고(던전 지방이면 두 배) 다음 전투에서 둔화됩니다.',
    'Deals Physical damage to an enemy army (doubled on a Dungeon province) and Slows it in its next battle.', {
      tier: 2, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 80, cp: 80 }, upkeep: {}, target: 'army', range: 0, area: 0,
      effect: { type: 'damage', channel: 'physical', amount: 15 },
    }));
  Data.define('spells', SP('sp_raiders_of_the_deep', '심연의 약탈자', 'Raiders of the Deep', '지하에서는 방어력과 저항력이, 지상에서는 피해가 오르며 동굴 보행을 얻습니다.',
    '+1 Defense/Resistance underground, +10% damage above ground, and Cave Walk.', {
      tier: 2, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['all'], effects: { dmgPct: 10 } },
    }));

  Data.define('tomes', TOME('tome_dungeon_depths', '지하미궁의 서', 'Tome of the Dungeon Depths', '거대한 지하 던전을 건설하여 수익 시설을 채우고 영원한 점토 병사와 함정으로 지켜냅니다.',
    'Build a grand Dungeon Underground, fill it with structures that enrich you, and protect it with eternal clay soldiers and traps.', {
      tier: 2, affinity: { materium: 2 }, expansion: 'giant_kings', icon: 'tome_materium_2',
      passive: { desc: nm('도시 도메인 안의 지방은 매 턴 던전 지형을 얻을 확률이 생깁니다.', 'Provinces in your city domains have a chance to gain Dungeon terrain each turn.'), effects: {} },
      contents: [
        { type: 'improvement', id: 'imp_dungeoneering_conclave', cost: kc(2) },
        { type: 'improvement', id: 'imp_underground_vault', cost: kc(2) },
        { type: 'improvement', id: 'imp_clay_forge', cost: kc(2) },
        { type: 'improvement', id: 'imp_silent_barracks', cost: kc(2) },
        { type: 'spell', id: 'sp_dungeon_hazard', cost: kc(2) },
        { type: 'spell', id: 'sp_raiders_of_the_deep', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE SAND STALKERS (T2 Materium/Nature)
  Data.define('improvements', IMP('imp_grand_bazaar', '대바자르', 'Grand Bazaar',
    '금을 생산하는 광산으로, 인접 모래 지방마다 금과 식량이 오릅니다.',
    'A mine yielding Gold, plus more Gold and Food per adjacent Sand province.', 'tome_sand_stalkers',
    { kind: 'mine', cost: { gold: 100, imperium: 0 }, yields: { gold: 7 }, adjacencyBonus: { sameKind: 2 } }));

  Data.define('units', U('tn_sand_scorpion', '모래 전갈', 'Sand Scorpion', '쇠약하게 만드는 독을 지닌 방패 유닛.', 'A Shield unit with a debilitating poison sting.', 'tome_sand_stalkers', {
    tier: 3, role: 'shield', tags: ['animal'], mp: 36, source: { type: 'summon', id: 'tome_sand_stalkers' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 100, def: 7, res: 2, morale: 0,
    attacks: [{ id: 'scorpion_sting', name: nm('전갈 침', 'Scorpion Sting'), type: 'melee', damage: 14, channel: 'blight', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'poisoned', chance: 60 }], props: [] }],
    abilities: ['defend'], passives: ['hardened'],
    look: { body: 'insect', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'large', tint: '#c9a24a', glow: null },
  }));

  Data.define('spells', SP('sp_desertification', '사막화', 'Desertification', '대상과 인접한 지상 지방이 모래로 뒤덮이고 늪·눈·화산재 등이 사라집니다.',
    'Surface provinces around the target turn to Sand, losing Swamp, Snow, Ashlands and the like.', {
      tier: 2, affinity: { nature: 1 }, kind: 'transform', cost: { mana: 45, cp: 45 }, upkeep: {}, target: 'province', range: 0, area: 1,
      effect: { type: 'terraform', terrain: 'desert', feature: 'none', radius: 1 },
    }));
  Data.define('spells', SP('sp_sandstorm', '모래 폭풍', 'Sandstorm', '지정 지역에 모래 폭풍을 일으켜 3턴 동안 시야와 명중률을 떨어뜨립니다.',
    'Conjures a sandstorm over the area for 3 turns, lowering vision and accuracy.', {
      tier: 2, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 20, cp: 25 }, upkeep: {}, target: 'hex', range: 4, area: 2,
      effect: { type: 'status', status: 'blinded', duration: 3, chance: 80, area: 2 },
    }));
  Data.define('spells', SP('sp_scorpion_venom_weapons', '전갈 독 무기', 'Scorpion Venom Weapons', '공격에 약화와 중독을 겁니다. 측면 공격 시 역병 피해가 추가됩니다.',
    'Attacks inflict Weakened and Poisoned, with bonus Blight damage when flanking.', {
      tier: 2, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: {}, attackStatus: { id: 'poisoned', chance: 60 } },
    }));
  Data.define('spells', SP('sp_summon_sand_scorpion', '모래 전갈 소환', 'Summon Sand Scorpion', '쇠약하게 만드는 독을 지닌 모래 전갈을 목표 지역에 소환합니다.',
    'Summons a Sand Scorpion with a debilitating poison onto the target world hex.', {
      tier: 2, affinity: { materium: 1 }, kind: 'summon', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_sand_scorpion', count: 1 },
    }));

  Data.define('transformations', TR('tr_dunestalkers', '모래추적자', 'Dunestalkers', '대상 종족이 사막과 하나가 되어 모래 보행·위장을 얻고, 모래 지형에서 빠른 이동과 측면 공격 피해가 오릅니다.',
    'Becomes one with the desert: Sand Walk, Sand Camouflage, Fast Movement and flanking damage on Sand.', 'tome_sand_stalkers',
    { kind: 'minor', effects: { dmgPct: 5 }, look: { skin2: '#c9a24a' } }));

  Data.define('tomes', TOME('tome_sand_stalkers', '모래추적자의 서', 'Tome of the Sand Stalkers', '사막을 퍼뜨리고 적을 뒤쫓아 실명시키며, 사막의 수호자를 소환해 스스로를 지킵니다.',
    'Spread deserts, stalk and blind your enemies, and summon a Guardian of the Desert to protect you.', {
      tier: 2, affinity: { materium: 1, nature: 1 }, expansion: 'rise_from_ruin', icon: 'tome_materium_2',
      passive: { desc: nm('모래 지방은 안정도 +2. 모래 지형에 농장을 지을 수 있습니다.', 'Provinces with Sand give +2 Stability; Farms may be built on Sand terrain.'), effects: { stability: 2 } },
      contents: [
        { type: 'improvement', id: 'imp_grand_bazaar', cost: kc(2) },
        { type: 'spell', id: 'sp_desertification', cost: kc(2) },
        { type: 'transformation', id: 'tr_dunestalkers', cost: kc(2) },
        { type: 'spell', id: 'sp_sandstorm', cost: kc(2) },
        { type: 'spell', id: 'sp_scorpion_venom_weapons', cost: kc(2) },
        { type: 'spell', id: 'sp_summon_sand_scorpion', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF SHADES (T2 Materium/Shadow)
  Data.define('units', U('tn_shade', '그림자 암살자', 'Shade', '약해진 적을 끝장내는 은밀한 척후병.', 'A stealthy Skirmisher that specializes in finishing off weakened enemies.', 'tome_shades', {
    tier: 3, role: 'skirmisher', tags: ['racial'], mp: 44, source: { type: 'tome', id: 'tome_shades' },
    cost: { gold: 140, mana: 0, draft: 220 }, upkeep: { gold: 20, mana: 0 }, statusRes: { frost: 3 },
    hp: 95, def: 4, res: 2, morale: 0,
    attacks: [{ id: 'fatal_strike', name: nm('필살의 일격', 'Fatal Strike'), type: 'melee', damage: 18, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'bleeding', chance: 60 }], props: ['sneak'] }],
    abilities: ['sneak_attack', 'defend'], passives: ['slippery', 'swift'],
    look: { body: 'form', armor: 'leather', weapon: 'daggers', helm: 'hood', cape: 'short', shield: 'none', element: 'shadow', size: 'medium', tint: null, glow: null },
  }));

  Data.define('spells', SP('sp_shadow_weapons', '그림자 무기', 'Shadow Weapons', '측면 공격이거나 실명한 적을 노릴 때 냉기 피해가 추가됩니다.',
    'Attacks deal bonus Frost damage when flanking or against Blinded targets.', {
      tier: 2, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 100, cp: 100 }, upkeep: { mana: 5 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: {}, attackChannel: 'frost' },
    }));
  Data.define('spells', SP('sp_rending_shadows', '찢는 그림자', 'Rending Shadows', '주변의 적들이 물리 피해를 입고 실명과 방어 분쇄에 걸립니다.',
    'Nearby enemies take Physical damage and are Blinded and Sundered.', {
      tier: 2, affinity: { shadow: 1 }, kind: 'combat', cost: { mana: 30, cp: 25 }, upkeep: {}, target: 'hex', range: 4, area: 1,
      effect: { type: 'damage', channel: 'physical', amount: 16, area: 1, status: { id: 'blinded', chance: 90, duration: 1 } },
    }));

  Data.define('transformations', TR('tr_living_shadows', '살아있는 그림자', 'Living Shadows', '대상 종족이 그림자를 두르고 회피가 오르며, 체력이 낮을 때 스스로 은폐하고 주변 적을 실명시킵니다.',
    'Wreathes the race in shadow: +10% Evasion; below 60% HP it becomes Obscured and blinds nearby enemies.', 'tome_shades',
    { kind: 'minor', effects: { evasion: 10 }, look: { skin2: '#2a2438' } }));

  Data.define('improvements', IMP('imp_shade_network', '그림자 연결망', 'Shade Network',
    '지식을 생산하는 첩보망으로, 도시와 국경을 맞댄 타국 도시마다 지식이 추가로 오릅니다.',
    'A spy network yielding Knowledge, more for each foreign city bordering it.', 'tome_shades',
    { kind: 'special', cost: { gold: 100, imperium: 0 }, yields: { knowledge: 10 }, adjacencyBonus: {} }));

  Data.define('tomes', TOME('tome_shades', '그림자 무리의 서', 'Tome of Shades', '그림자에서 튀어나와 적을 실명시키고 약점을 찾아 필살의 일격을 가합니다.',
    'Strike from the shadows, blind your foes and find their weak points to deliver the perfect, fatal blow.', {
      tier: 2, affinity: { materium: 1, shadow: 1 }, expansion: 'ways_of_war', icon: 'tome_materium_2',
      passive: { desc: nm('은신 중인 아군 유닛은 다음 공격의 치명타 확률 +15%.', '+15% critical chance on the next attack for friendly Concealed units.'), effects: { critChance: 5 } },
      contents: [
        { type: 'unit', id: 'tn_shade', cost: kc(2, true) },
        { type: 'spell', id: 'sp_shadow_weapons', cost: kc(2) },
        { type: 'transformation', id: 'tr_living_shadows', cost: kc(2) },
        { type: 'spell', id: 'sp_rending_shadows', cost: kc(2) },
        { type: 'improvement', id: 'imp_shade_network', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF FEY MISTS (T2 Nature/Astral)
  Data.define('improvements', IMP('imp_feywater_pond', '요정물 연못', 'Feywater Pond',
    '도시 도메인 전체를 안개로 뒤덮는 수로. 인접 보호구역마다 마나가 오릅니다.',
    'A conduit that shrouds the whole domain in Mist; +Mana per adjacent Forester.', 'tome_fey_mists',
    { kind: 'conduit', cost: { gold: 100, imperium: 0 }, yields: { mana: 5 }, adjacencyBonus: { sameKind: 3 } }));

  Data.define('units', U('tn_mistling', '안개요정', 'Mistling', '무작위 부정 효과를 거는 안개 마법 전투원.', 'A Magic Fighter whose attacks inflict random debuffs.', 'tome_fey_mists', {
    tier: 3, role: 'mage', tags: ['fey', 'magic_origin'], move: 'fly', mp: 40, source: { type: 'summon', id: 'tome_fey_mists' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 90, def: 3, res: 3, morale: 0,
    attacks: [{ id: 'mist_bolt', name: nm('안개 화살', 'Mist Bolt'), type: 'ranged', damage: 12, channel: 'frost', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'weakened', chance: 40 }], props: ['magic'] }],
    abilities: ['defend'], passives: ['flying', 'concealment'],
    look: { body: 'wisp', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'nature', size: 'medium', tint: '#a8c9c0', glow: '#e0f5ee' },
  }));

  Data.define('spells', SP('sp_summon_mistling', '안개요정 소환', 'Summon Mistling', '무작위 부정 효과를 거는 안개요정 한 마리를 목표 지역에 소환합니다.',
    'Summons a Mistling that inflicts random debuffs onto the target world hex.', {
      tier: 2, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_mistling', count: 1 },
    }));
  Data.define('spells', SP('sp_fey_embrace', '요정의 포옹', 'Fey Embrace', '주변에 안개를 드리우고 아군에게 무작위 긍정 효과를 부여합니다.',
    'Lays down mist and grants nearby allies random positive status effects.', {
      tier: 2, affinity: { astral: 1 }, kind: 'combat', cost: { mana: 15, cp: 20 }, upkeep: {}, target: 'ally_unit', range: 0, area: 1,
      effect: { type: 'status', status: 'blessed', duration: 3, chance: 100, area: 1 },
    }));
  Data.define('spells', SP('sp_lingering_mists', '머무는 안개', 'Lingering Mists', '대상 지방이 3턴 동안 안개로 뒤덮입니다.',
    'The target province becomes Misty for 3 turns.', {
      tier: 2, affinity: { nature: 1 }, kind: 'strategic', cost: { mana: 60, cp: 60 }, upkeep: {}, target: 'province', range: 0, area: 0,
      effect: { type: 'special', id: 'misty_terrain', duration: 3 },
    }));
  Data.define('spells', SP('sp_staves_of_mist', '안개의 지팡이', 'Staves of Mist', '지원 유닛이 요정의 축복 능력을 얻습니다.',
    'Grants Support units the Fey Blessing ability.', {
      tier: 2, affinity: { astral: 1 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['support'], effects: {} },
    }));

  Data.define('transformations', TR('tr_feytouched', '요정의 손길', 'Feytouched', '대상 종족이 요정의 힘과 이어져 안개의 시야·명중률 저하를 무시하게 됩니다.',
    "Connects the race to Fey powers, ignoring vision and accuracy penalties from Mist.", 'tome_fey_mists',
    { kind: 'minor', effects: { accuracy: 5 }, look: { eyes: '#a8c9c0' } }));

  Data.define('tomes', TOME('tome_fey_mists', '요정 안개의 서', 'Tome of Fey Mists', '이계의 안개를 불러내 아군을 보호하고 강화합니다.',
    'Conjure otherworldly mists to protect and strengthen your units.', {
      tier: 2, affinity: { nature: 1, astral: 1 }, expansion: 'primal_fury', icon: 'tome_nature_2',
      passive: { desc: nm('안개 낀 지방에 있는 아군 유닛은 회피 +10%.', '+10% Evasion for friendly units standing in Misty terrain.'), effects: {} },
      contents: [
        { type: 'improvement', id: 'imp_feywater_pond', cost: kc(2) },
        { type: 'spell', id: 'sp_summon_mistling', cost: kc(2) },
        { type: 'spell', id: 'sp_fey_embrace', cost: kc(2) },
        { type: 'transformation', id: 'tr_feytouched', cost: kc(2) },
        { type: 'spell', id: 'sp_lingering_mists', cost: kc(2) },
        { type: 'spell', id: 'sp_staves_of_mist', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF CYCLES (T3 Nature)
  Data.define('units', U('tn_druid_of_the_cycle', '순환의 드루이드', 'Druid of the Cycle', '삶과 죽음의 순환을 다루는 지원 유닛.', 'A Support unit that manipulates life and death as part of the natural cycle.', 'tome_cycles', {
    tier: 4, role: 'support', tags: ['racial'], mp: 40, source: { type: 'tome', id: 'tome_cycles' },
    cost: { gold: 200, mana: 0, draft: 300 }, upkeep: { gold: 30, mana: 0, imperium: 3 }, statusRes: { blight: 9 },
    hp: 100, def: 3, res: 5, morale: 0,
    attacks: [{ id: 'decaying_blast', name: nm('부패 작렬', 'Decaying Blast'), type: 'ranged', damage: 14, channel: 'blight', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'blighted', chance: 60 }], props: ['magic'] }],
    abilities: ['ab_druid_restart_the_cycle', 'heal_wounds', 'defend'], passives: [],
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'long', shield: 'none', element: 'nature', size: 'medium', tint: null, glow: '#8fd18a' },
  }));
  Data.define('abilities', { id: 'ab_druid_restart_the_cycle', kind: 'active', name: nm('순환의 재시작', 'Restart the Cycle'), desc: nm('아군 하나의 부정 효과를 없애고 체력을 회복시켜 삶의 순환을 되돌립니다.', "Cleanses a friendly unit's debuffs and heals it, turning the cycle back toward life."), ap: 1, cooldown: 3, range: 3, target: 'ally', area: 0, icon: 'heal', effect: { type: 'heal', amount: 15, cleanse: true } });

  Data.define('spells', SP('sp_diffuse_health', '생명력 분배', 'Diffuse Health', '대상 적은 역병 피해를 입고 부패하며, 주변 아군은 임시 체력을 얻고 재생합니다.',
    'The target enemy takes Blight damage and rots, while nearby allies heal and gain Regeneration.', {
      tier: 3, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 45, cp: 30 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0,
      effect: { type: 'damage', channel: 'blight', amount: 30, status: { id: 'blighted', chance: 100, duration: 3 } },
    }));
  Data.define('spells', SP('sp_parting_gifts', '작별의 선물', 'Parting Gifts', '전투가 끝날 때까지, 아군이 죽을 때마다 주변 다른 아군이 체력을 회복합니다.',
    'Until the battle ends, whenever a friendly unit dies, other nearby allies heal.', {
      tier: 3, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 80, cp: 35 }, upkeep: {}, target: 'all_allies', range: 0, area: 0,
      effect: { type: 'special', id: 'parting_gifts' },
    }));
  Data.define('spells', SP('sp_blades_of_decay', '부패의 칼날', 'Blades of Decay', '근접 유닛의 공격이 치유를 방해하는 부패를 남깁니다.',
    "Melee units' attacks leave a rot that blunts healing.", {
      tier: 3, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter'], effects: {}, attackStatus: { id: 'blighted', chance: 60 } },
    }));
  Data.define('spells', SP('sp_blooming_imbuement', '개화의 부여', 'Blooming Imbuement', '원거리·지원 유닛의 공격이 재생 효과를 남기고, 부패한 적에게 더 강하게 작용합니다.',
    "Ranged and Support units' attacks leave Regeneration and hit rotting targets harder.", {
      tier: 3, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: { dmgPctVsBlighted: 20 } },
    }));
  Data.define('spells', SP('sp_cycle_of_seasons', '계절의 순환', 'Cycle of Seasons', '지정한 도시 영역의 모든 전투가 매 라운드 겨울-봄-여름-가을의 효과를 차례로 얻습니다.',
    "Every battle in the target city's domain cycles through Winter, Spring, Summer and Autumn effects each round.", {
      tier: 3, affinity: { nature: 1 }, kind: 'strategic', cost: { mana: 120, cp: 120 }, upkeep: { mana: 12 }, target: 'city', range: 0, area: 0,
      effect: { type: 'special', id: 'cycle_of_seasons' },
    }));

  Data.define('tomes', TOME('tome_cycles', '순환의 서', 'Tome of Cycles', '자연의 생사 순환을 다스립니다. 적을 약화시키고 아군을 치유하는 데 특화합니다.',
    'Master the natural cycles of life and death; specialize in debuffing enemies and healing allies.', {
      tier: 3, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_3',
      passive: { desc: nm('아군 유닛이 전투에서 죽으면 주변 아군은 체력을 5 회복합니다.', 'When a friendly unit dies in battle, nearby allies heal 5 HP.'), effects: {} },
      contents: [
        { type: 'spell', id: 'sp_diffuse_health', cost: kc(3) },
        { type: 'spell', id: 'sp_parting_gifts', cost: kc(3) },
        { type: 'spell', id: 'sp_blades_of_decay', cost: kc(3) },
        { type: 'spell', id: 'sp_blooming_imbuement', cost: kc(3) },
        { type: 'spell', id: 'sp_cycle_of_seasons', cost: kc(3) },
        { type: 'unit', id: 'tn_druid_of_the_cycle', cost: kc(3, true) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF VIGOR (T3 Nature)
  Data.define('units', U('tn_dire_bear', '광포한 곰', 'Dire Bear', '거대하고 흉포해진 곰.', 'A hulking, ferocious bear grown to fearsome size.', 'tome_vigor', {
    tier: 4, role: 'fighter', tags: ['animal'], mp: 40, source: { type: 'summon', id: 'tome_vigor' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 130, def: 5, res: 2, morale: 0,
    attacks: [{ id: 'crushing_claw', name: nm('짓누르는 발톱', 'Crushing Claw'), type: 'melee', damage: 26, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'stunned', chance: 20 }], props: [] }],
    abilities: ['giant_stomp'], passives: ['ferocious', 'trample'],
    look: { body: 'beast_bear', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'huge', tint: null, glow: null },
  }));

  Data.define('spells', SP('sp_call_greater_animal', '상급 야생 동물 부르기', 'Call Greater Animal', '지형에 어울리는 강력한 야생 동물 한 마리를 군세에 더합니다.',
    'Adds a powerful wild animal suited to the local terrain to your army.', {
      tier: 3, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_dire_bear', count: 1 },
    }));
  Data.define('spells', SP('sp_totem_of_the_wild', '야생의 토템', 'Totem of the Wild', '전투 중 야생의 토템을 소환해 첫 두 턴 동안 야생 동물을 불러냅니다.',
    "Summons a Totem of the Wild that calls forth animals over the battle's first two turns.", {
      tier: 3, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 80, cp: 35 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_wolf', count: 2 },
    }));
  Data.define('spells', SP('sp_empowered_beasts', '강화된 야수', 'Empowered Beasts', '야수 유닛의 피해와 체력이 오르고 강화된 장애물을 부술 수 있게 됩니다.',
    "Animal units gain damage and HP and can demolish reinforced obstacles.", {
      tier: 3, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 100, cp: 100 }, upkeep: { mana: 5 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['animal'], effects: { dmgPct: 20, hp: 10 } },
    }));
  Data.define('spells', SP('sp_unleash_beast', '야수 해방', 'Unleash Beast', '대상 야수 또는 기병 유닛이 강화되고 방어가 오르며 광란에 빠집니다.',
    'The target Animal or Cavalry unit gains Strengthened, Bolstered Defense and Berserk.', {
      tier: 3, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 100, cp: 40 }, upkeep: {}, target: 'ally_unit', range: 4, area: 0,
      effect: { type: 'status', status: 'enraged', duration: 3, chance: 100 },
    }));

  Data.define('transformations', TR('tr_supergrowth', '초성장', 'Supergrowth', '대상 종족의 몸집이 커져 체력이 오르고 반격 횟수가 늘지만, 대형 편성 인원이 줄어듭니다.',
    'Grows the race in mass and stature: +10 HP and +1 retaliation, but fewer units per formation.', 'tome_vigor',
    { kind: 'minor', effects: { hp: 10 }, look: { height: 1.15 } }));

  Data.define('tomes', TOME('tome_vigor', '활력의 서', 'Tome of Vigor', '야생 야수의 힘으로 아군과 군세를 강화합니다. 야수 강화와 체력 증가에 특화합니다.',
    'Strengthen your units and armies with the brute power of wild beasts; specialize in buffing Animals and raising HP.', {
      tier: 3, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_3',
      passive: { desc: nm('아군 야수 유닛은 최대 체력 +10.', '+10 max HP for friendly Animal units.'), effects: { hp: 3 } },
      contents: [
        { type: 'spell', id: 'sp_call_greater_animal', cost: kc(3) },
        { type: 'spell', id: 'sp_totem_of_the_wild', cost: kc(3) },
        { type: 'spell', id: 'sp_empowered_beasts', cost: kc(3) },
        { type: 'transformation', id: 'tr_supergrowth', cost: kc(3) },
        { type: 'spell', id: 'sp_unleash_beast', cost: kc(3) },
        { type: 'unit', id: 'tn_dire_bear', cost: kc(3, true) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF TERRAMANCY (T3 Materium)
  Data.define('improvements', IMP('imp_excavated_ley_line', '발굴된 레이라인', 'Excavated Ley Line',
    '생산력과 마나, 세계 지도 시전력을 제공하는 수로. 인접 채석장마다 마나가 오릅니다.',
    'A conduit yielding Production, Mana and World Casting Points, plus Mana per adjacent Quarry.', 'tome_terramancy',
    { kind: 'conduit', cost: { gold: 100, imperium: 0 }, yields: { production: 5, mana: 5 }, adjacencyBonus: { sameKind: 4 } }));

  Data.define('units', U('tn_stone_spirit', '바위 정령', 'Stone Spirit', '대지가 빚어낸 방패 정령.', 'A shield-bearing spirit shaped from raw earth.', 'tome_terramancy', {
    tier: 3, role: 'shield', tags: ['elemental'], mp: 32, source: { type: 'summon', id: 'tome_terramancy' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 100, def: 6, res: 3, morale: 0,
    attacks: [{ id: 'boulder_fist', name: nm('바위 주먹', 'Boulder Fist'), type: 'melee', damage: 16, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: ['defend'], passives: ['hardened', 'sturdy'],
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'stone', size: 'large', tint: '#8d8378', glow: null },
  }));
  Data.define('units', U('tn_rock_giant', '바위 거인', 'Rock Giant', '바위를 던지고 지진처럼 짓밟는 신화 유닛.', 'A Mythic unit that hurls boulders and smashes with earthquake-like slams.', 'tome_terramancy', {
    tier: 4, role: 'shock', tags: ['mythic', 'giant'], mp: 36, source: { type: 'summon', id: 'tome_terramancy' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 150, def: 7, res: 4, morale: 0,
    attacks: [{ id: 'boulder_throw', name: nm('바위 투척', 'Boulder Throw'), type: 'ranged', damage: 24, channel: 'physical', range: 5, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'stunned', chance: 30 }], props: [] }],
    abilities: ['seismic_slam'], passives: ['large_target', 'hardened'],
    look: { body: 'giant', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'stone', size: 'huge', tint: '#7a7266', glow: null },
  }));

  Data.define('spells', SP('sp_crushing_earth', '짓누르는 대지', 'Crushing Earth', '대상 적이 물리 피해를 입고 방어가 무너지며 기절합니다.',
    'The target enemy takes Physical damage, its Defense crumbles, and it may be Stunned.', {
      tier: 3, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 45, cp: 30 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0,
      effect: { type: 'damage', channel: 'physical', amount: 50, status: { id: 'stunned', chance: 90, duration: 1 } },
    }));
  Data.define('spells', SP('sp_earth_shatter', '대지 분쇄', 'Earth Shatter', '지방의 산악 지형이 무너져 적이 피해를 입고, 그 자리에 바위 정령이 나타나 아군에 합류합니다.',
    "Mountains in the province collapse, damaging enemies there; a Stone Spirit rises to join you.", {
      tier: 3, affinity: { materium: 1 }, kind: 'transform', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'province', range: 0, area: 0,
      effect: { type: 'terraform', terrain: 'hills', feature: 'none', radius: 0 },
    }));
  Data.define('spells', SP('sp_seismic_shock', '지진 충격', 'Seismic Shock', '주변의 적이 물리 피해를 입고 둔화되며, 장애물에는 두 배의 피해를 줍니다.',
    'Nearby enemies take Physical damage and are Slowed; deals double damage to obstacles.', {
      tier: 3, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 45, cp: 30 }, upkeep: {}, target: 'hex', range: 0, area: 1,
      effect: { type: 'damage', channel: 'physical', amount: 30, area: 1, status: { id: 'slowed', chance: 90, duration: 2 } },
    }));
  Data.define('spells', SP('sp_ley_line_focus', '레이라인 집중', 'Ley Line Focus', '턴 시작 시 이동하지 않은 지원·전투 마법사 유닛은 피해와 저항력이 오릅니다.',
    'Support and Battle Mage units that have not yet moved this turn gain damage and Resistance.', {
      tier: 3, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['support', 'mage'], effects: { dmgPct: 30, res: 2 } },
    }));
  Data.define('spells', SP('sp_summon_rock_giant', '바위 거인 소환', 'Summon Rock Giant', '적을 짓밟는 신화 유닛, 바위 거인 한 기를 군세에 더합니다.',
    'Adds a boulder-throwing, earthquake-slamming Rock Giant to your army.', {
      tier: 3, affinity: { materium: 1 }, kind: 'summon', cost: { mana: 200, cp: 200 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_rock_giant', count: 1 },
    }));
  Data.define('spells', SP('sp_tremor_ritual', '진동의 의식', 'Tremor Ritual', '공성전 중 2턴마다 무작위 적 유닛 주변에 지진이 일어나 피해를 주고 장애물을 파괴합니다.',
    'During a siege, every 2 turns an earthquake strikes a random enemy, dealing damage and destroying obstacles nearby.', {
      tier: 3, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 0, cp: 0 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'special', id: 'siege_tremor_ritual' },
    }));

  Data.define('tomes', TOME('tome_terramancy', '지맥술의 서', 'Tome of Terramancy', '뜻대로 대지를 조종합니다. 물리 피해와 적 이동 방해에 특화합니다.',
    'Manipulate the earth at will; specialize in dealing Physical damage and hindering enemy movement.', {
      tier: 3, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_3',
      passive: { desc: nm('산악·구릉 지형에서 아군 물리 공격 피해 +10%.', '+10% friendly Physical attack damage while on Hills or Mountains.'), effects: {} },
      contents: [
        { type: 'improvement', id: 'imp_excavated_ley_line', cost: kc(3) },
        { type: 'spell', id: 'sp_crushing_earth', cost: kc(3) },
        { type: 'spell', id: 'sp_earth_shatter', cost: kc(3) },
        { type: 'spell', id: 'sp_seismic_shock', cost: kc(3) },
        { type: 'spell', id: 'sp_ley_line_focus', cost: kc(3) },
        { type: 'spell', id: 'sp_summon_rock_giant', cost: kc(3) },
        { type: 'spell', id: 'sp_tremor_ritual', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF TRANSMUTATION (T3 Materium)
  Data.define('improvements', IMP('imp_transmutation_circle', '변성의 마법진', 'Transmutation Circle',
    '건설하면 영역 안 마법 재료 하나의 효과와 수입을 그대로 복제합니다.',
    'Once built, replicates the effects and income of a Magic Material in the domain.', 'tome_transmutation',
    { kind: 'mine', cost: { gold: 100, imperium: 0 }, yields: {}, adjacencyBonus: {} }));

  Data.define('units', U('tn_transmuter', '변성술사', 'Transmuter', '적을 황금으로 바꾸고 그 갑옷을 빼앗는 전투 마법사.', 'A Battle Mage that turns enemies to gold and steals their armor.', 'tome_transmutation', {
    tier: 4, role: 'mage', tags: ['racial'], mp: 40, source: { type: 'tome', id: 'tome_transmutation' },
    cost: { gold: 200, mana: 0, draft: 300 }, upkeep: { gold: 30, mana: 0, imperium: 3 }, statusRes: { physical: 7 },
    hp: 95, def: 2, res: 4, morale: 0,
    attacks: [{ id: 'molten_bolts', name: nm('용암 화살', 'Molten Bolts'), type: 'ranged', damage: 16, channel: 'fire', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'burning', chance: 30 }], props: ['magic'] }],
    abilities: ['sunder_strike', 'defend'], passives: [],
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'long', shield: 'none', element: 'fire', size: 'medium', tint: null, glow: '#c07a2a' },
  }));

  Data.define('spells', SP('sp_melt_armor', '갑옷 녹이기', 'Melt Armor', '주변의 적들이 방어가 무너지고 화염 피해를 입습니다.',
    "Nearby enemies' defenses crumble and they take Fire damage.", {
      tier: 3, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 45, cp: 30 }, upkeep: {}, target: 'hex', range: 4, area: 1,
      effect: { type: 'damage', channel: 'fire', amount: 20, area: 1, status: { id: 'sundered', chance: 100, duration: 3 } },
    }));
  Data.define('spells', SP('sp_transmute_resources', '자원 변환', 'Transmute Resources', '지정 도시의 마나 수입 75%만큼 금·생산력·식량 수입으로 전환됩니다.',
    "Converts 75% of the target city's Mana income into Gold, Production and Food.", {
      tier: 3, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 100, cp: 100 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'resource', gold: 8, production: 8, food: 8 },
    }));
  Data.define('spells', SP('sp_adaptive_armor', '적응형 갑옷', 'Adaptive Armor', '마법 공격이나 주문에 맞을 때마다 저항 강화와 상태이상 보호를 얻습니다.',
    'Once per turn, taking Magic damage or a spell grants Bolstered Resistance and status protection.', {
      tier: 3, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: { statusRes: 1 } },
    }));

  Data.define('transformations', TR('tr_steel_skin', '강철 피부', 'Steel Skin', '대상 종족의 피부가 강철로 변해 물리·역병 보호가 오르지만 번개 보호가 낮아집니다.',
    "Transmutes the race's skin into steel: +2 Physical/Blight protection, -2 Lightning protection.", 'tome_transmutation',
    { kind: 'minor', effects: { statusRes_physical: 2, statusRes_blight: 2, statusRes_lightning: -2 }, look: { skin: '#9aa0a8', skin2: '#7a828c' } }));

  Data.define('tomes', TOME('tome_transmutation', '변성술의 서', 'Tome of Transmutation', '막대한 마나로 물질을 바꿉니다. 적 약화, 아군 강화, 경제 전환에 특화합니다.',
    'Change physical substances using vast amounts of mana; specialize in debuffing, buffing, and reshaping your economy.', {
      tier: 3, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_3',
      passive: { desc: nm('보유한 마법 재료 지방 하나당 마나 +2.', '+2 Mana for each Magic Material province you own.'), effects: { mana: 2 } },
      contents: [
        { type: 'improvement', id: 'imp_transmutation_circle', cost: kc(3) },
        { type: 'spell', id: 'sp_melt_armor', cost: kc(3) },
        { type: 'spell', id: 'sp_transmute_resources', cost: kc(3) },
        { type: 'unit', id: 'tn_transmuter', cost: kc(3, true) },
        { type: 'spell', id: 'sp_adaptive_armor', cost: kc(3) },
        { type: 'transformation', id: 'tr_steel_skin', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF GEOMANCY (T3 Materium/Astral)
  Data.define('improvements', IMP('imp_hall_of_geomantic_resonance', '지맥 공명의 전당', 'Hall of Geomantic Resonance',
    '도시 핵심지의 지형에 따라 서로 다른 자원을 제공하는 시설.',
    "Yields different resources based on the terrain feature of the city core's location.", 'tome_geomancy',
    { kind: 'special', cost: { gold: 170, imperium: 0 }, yields: { production: 20 }, adjacencyBonus: {} }));

  Data.define('units', U('tn_geomancer', '지맥술사', 'Geomancer', '서 있는 지형에 따라 피해 속성이 바뀌는 전투 마법사.', 'An adaptable Battle Mage that shifts damage according to the terrain.', 'tome_geomancy', {
    tier: 4, role: 'mage', tags: ['racial'], mp: 40, source: { type: 'tome', id: 'tome_geomancy' },
    cost: { gold: 200, mana: 0, draft: 300 }, upkeep: { gold: 30, mana: 0, imperium: 3 }, statusRes: { physical: 7 },
    hp: 90, def: 2, res: 4, morale: 0,
    attacks: [{ id: 'terra_bolts', name: nm('대지 화살', 'Terra Bolts'), type: 'ranged', damage: 16, channel: 'physical', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['defend'], passives: [],
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'long', shield: 'none', element: 'stone', size: 'medium', tint: null, glow: '#a08a5a' },
  }));
  Data.define('units', U('tn_ley_elemental', '레이 정령', 'Ley Elemental', '땅속 레이 에너지가 응집된 정령.', 'An elemental condensed from underground ley energy.', 'tome_geomancy', {
    tier: 3, role: 'mage', tags: ['elemental'], mp: 36, source: { type: 'summon', id: 'tome_geomancy' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 90, def: 2, res: 3, morale: 0,
    attacks: [{ id: 'ley_bolt', name: nm('레이 화살', 'Ley Bolt'), type: 'ranged', damage: 14, channel: 'lightning', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'electrified', chance: 30 }], props: ['magic'] }],
    abilities: ['defend'], passives: [],
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'medium', tint: '#8a6bb0', glow: '#c9a8f0' },
  }));

  Data.define('transformations', TR('tr_geomantic_crystallization', '지맥 결정화', 'Geomantic Crystallization', '대상 종족이 공명하는 결정체로 변해 원소 유닛이 되고, 서 있는 지형에 따른 저항과 추가 피해를 얻습니다.',
    'Turns the race into resonating crystals: the Elemental type, terrain-based resistance and bonus damage.', 'tome_geomancy',
    { kind: 'major', effects: { dmg: 2 }, look: { skin: '#a08a5a', skin2: '#7a6840' } }));

  Data.define('spells', SP('sp_resonant_weapons', '공명 무기', 'Resonant Weapons', '공격이 서 있는 지형에 어울리는 추가 피해와 부정 효과를 가합니다.',
    "Attacks apply extra damage and debuffs matching the terrain the attacker stands on.", {
      tier: 3, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: { dmg: 2 } },
    }));
  Data.define('spells', SP('sp_summon_elemental', '정령 소환', 'Summon Elemental', '지형에 어울리는 정령 한 마리를 목표 지역에 소환합니다.',
    'Summons an elemental matching the terrain onto the target hex.', {
      tier: 3, affinity: { astral: 1 }, kind: 'summon', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_ley_elemental', count: 1 },
    }));

  Data.define('tomes', TOME('tome_geomancy', '지맥술의 서', 'Tome of Geomancy', '발밑의 레이 에너지에 동조하여 서 있는 지형에 따라 피해와 저항을 바꿉니다.',
    "Become attuned to the Ley energies beneath you, changing your armies' damage and resistances by terrain.", {
      tier: 3, affinity: { materium: 1, astral: 1 }, expansion: 'giant_kings', icon: 'tome_materium_3',
      passive: { desc: nm('아군 유닛은 서 있는 지형에 어울리는 피해 채널에 저항 +1.', "+1 protection in the damage channel matching the terrain a friendly unit stands on."), effects: {} },
      contents: [
        { type: 'improvement', id: 'imp_hall_of_geomantic_resonance', cost: kc(3) },
        { type: 'unit', id: 'tn_geomancer', cost: kc(3, true) },
        { type: 'transformation', id: 'tr_geomantic_crystallization', cost: kc(3) },
        { type: 'spell', id: 'sp_resonant_weapons', cost: kc(3) },
        { type: 'spell', id: 'sp_summon_elemental', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE DREADNOUGHT (T3 Materium/Chaos)
  Data.define('improvements', IMP('imp_war_foundry', '전쟁 주물소', 'War Foundry',
    '징집력을 제공하는 채석장으로, 인접 채석장·광산 지방마다 징집력이 오르고 이 도시에서 생산된 구조물 유닛은 계급을 얻고 태어납니다.',
    'A quarry yielding Draft, more per adjacent Quarry/Mine; Construct units drafted here start with bonus rank.', 'tome_dreadnought',
    { kind: 'quarry', cost: { gold: 170, imperium: 0 }, yields: { draft: 20 }, adjacencyBonus: { sameKind: 5 } }));

  Data.define('spells', SP('sp_destabilized_mana_core', '불안정한 마나 핵', 'Destabilized Mana Core', '주변의 적들이 표식을 얻고, 1턴 뒤 마나 핵이 폭발해 물리·번개 피해를 줍니다.',
    'Marks nearby enemies; after 1 turn the mana core detonates for Physical and Lightning damage.', {
      tier: 3, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 30, cp: 25 }, upkeep: {}, target: 'hex', range: 4, area: 2,
      effect: { type: 'status', status: 'marked', duration: 1, chance: 100, area: 2 },
    }));
  Data.define('spells', SP('sp_pinning_barrage', '고정 포격', 'Pinning Barrage', '주변의 적들이 물리 피해를 입고 표식이 찍히며 속박될 수 있습니다.',
    'Nearby enemies take Physical damage, become Marked, and may be Rooted.', {
      tier: 3, affinity: { chaos: 1 }, kind: 'combat', cost: { mana: 80, cp: 35 }, upkeep: {}, target: 'hex', range: 4, area: 2,
      effect: { type: 'damage', channel: 'physical', amount: 20, area: 2, status: { id: 'rooted', chance: 60, duration: 2 } },
    }));
  Data.define('spells', SP('sp_warding_metals', '보호의 금속', 'Warding Metals', '구조물 유닛의 저항력이 오릅니다.',
    "Construct units gain Resistance.", {
      tier: 3, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['construct'], effects: { res: 2 } },
    }));
  Data.define('spells', SP('sp_construct_great_bombard', '거대 폭격기 건조', 'Construct Great Bombard', '전투 시작 시 거대 폭격기 한 대를 공격측에 배치합니다.',
    'At battle start, deploys a Great Bombard on the attacking side.', {
      tier: 3, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 0, cp: 0 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'special', id: 'siege_great_bombard' },
    }));

  Data.define('units', U('tn_ironclad', '철갑선', 'Ironclad', '삼중 포신 대포를 갖춘 육중한 신화 유닛.', 'An armored Mythic unit with a powerful tri-barreled cannon.', 'tome_dreadnought', {
    tier: 4, role: 'siege', tags: ['mythic', 'construct'], mp: 32, source: { type: 'tome', id: 'tome_dreadnought' },
    cost: { gold: 200, mana: 0, draft: 300 }, upkeep: { gold: 30, mana: 0, imperium: 3 }, statusRes: { blight: 7, undead: 0 },
    hp: 110, def: 6, res: 4, morale: 0,
    attacks: [
      { id: 'direct_fire', name: nm('직사 포격', 'Direct Fire'), type: 'ranged', damage: 22, channel: 'physical', range: 5, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['armor_piercing'] },
      { id: 'barrage', name: nm('제압 사격', 'Barrage'), type: 'ranged', damage: 14, channel: 'physical', range: 5, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'sundered', chance: 60 }], props: [] },
    ],
    abilities: ['defend'], passives: ['construct', 'heartless', 'siege_breaker', 'large_target'],
    look: { body: 'golem', armor: 'heavy_plate', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'huge', tint: '#4a4f58', glow: null },
  }));

  Data.define('tomes', TOME('tome_dreadnought', '무적함의 서', 'Tome of the Dreadnought', '강력한 병기의 힘을 빌려 압도적인 포격으로 적을 섬멸합니다.',
    'Call upon the power of mighty machines and obliterate your enemies with powerful barrages.', {
      tier: 3, affinity: { materium: 1, chaos: 1 }, expansion: 'empires_and_ashes', icon: 'tome_materium_3',
      passive: { desc: nm('아군 구조물 유닛은 원거리 공격 사거리 +1.', '+1 range on ranged attacks for friendly Construct units.'), effects: {} },
      contents: [
        { type: 'improvement', id: 'imp_war_foundry', cost: kc(3) },
        { type: 'spell', id: 'sp_destabilized_mana_core', cost: kc(3) },
        { type: 'spell', id: 'sp_pinning_barrage', cost: kc(3) },
        { type: 'spell', id: 'sp_warding_metals', cost: kc(3) },
        { type: 'spell', id: 'sp_construct_great_bombard', cost: kc(3) },
        { type: 'unit', id: 'tn_ironclad', cost: kc(3, true) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF DRAGONS (T3 Nature/Chaos)
  Data.define('improvements', IMP('imp_wyvern_eyrie', '와이번 둥지', 'Wyvern Eyrie',
    '금을 생산하는 광산으로, 인접 농장 지방마다 금이 오르고 다양한 와이번 유닛의 생산이 가능해집니다.',
    'A mine yielding Gold, more per adjacent Farm, and unlocks the drafting of Wyvern units.', 'tome_dragons',
    { kind: 'mine', cost: { gold: 170, imperium: 0 }, yields: { gold: 10 }, adjacencyBonus: { sameKind: 5 } }));

  Data.define('units', U('tn_young_dragon_fire', '어린 화염룡', 'Young Fire Dragon', '자라면 성체 화염룡이 되는 어린 용.', 'A young dragon that will grow into an adult Fire Dragon.', 'tome_dragons', {
    tier: 3, role: 'shock', tags: ['dragon', 'flying'], move: 'fly', mp: 48, source: { type: 'summon', id: 'tome_dragons' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 100, def: 4, res: 3, morale: 0,
    attacks: [
      { id: 'claw_bite', name: nm('발톱과 이빨', 'Claw and Fang'), type: 'melee', damage: 20, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] },
      { id: 'young_fire_breath', name: nm('작은 화염 브레스', 'Young Fire Breath'), type: 'ranged', damage: 16, channel: 'fire', range: 2, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'burning', chance: 60 }], props: ['magic', 'cone'] },
    ],
    abilities: [], passives: ['flying', 'ferocious'],
    look: { body: 'dragon', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'large', tint: '#c25b2e', glow: '#ff8c3c' },
  }));

  Data.define('spells', SP('sp_dragonstrike_infusion', '용격 주입', 'Dragonstrike Infusion', '근접 유닛의 공격에 제국의 주도 친화에 맞는 속성 피해가 추가됩니다.',
    "Melee units' attacks gain bonus damage of the element matching your empire's dominant affinity.", {
      tier: 3, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 100, cp: 100 }, upkeep: { mana: 5 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'mage'], effects: {}, attackChannel: 'fire' },
    }));
  Data.define('spells', SP('sp_dragon_attack', '용의 습격', 'Dragon Attack', '공성전 시작 시 수비 유닛이 화염 피해를 입고 화상에 걸리며, 성벽 곳곳이 불붙습니다.',
    'At the start of a siege, defenders take Fire damage, may catch Burning, and battlements ignite.', {
      tier: 3, affinity: { chaos: 1 }, kind: 'strategic', cost: { mana: 0, cp: 0 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'special', id: 'siege_dragon_attack', channel: 'fire', amount: 26 },
    }));
  Data.define('spells', SP('sp_purifying_flame', '정화의 불꽃', 'Purifying Flame', '주변 아군이 체력을 회복하고 부정 효과를 씻어냅니다.',
    'Nearby allies heal and have their debuffs cleansed.', {
      tier: 3, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 80, cp: 35 }, upkeep: {}, target: 'ally_unit', range: 0, area: 1,
      effect: { type: 'heal', amount: 25, cleanse: true, area: 1 },
    }));
  Data.define('spells', SP('sp_call_young_dragon', '어린 용 부르기', 'Call Young Dragon', '어린 화염룡 한 마리를 군세에 더합니다. 나중에 성체 용으로 진화할 수 있습니다.',
    'Adds a Young Fire Dragon to your army; it may later evolve into an adult dragon.', {
      tier: 3, affinity: { chaos: 1 }, kind: 'summon', cost: { mana: 200, cp: 200 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_young_dragon_fire', count: 1 },
    }));

  Data.define('transformations', TR('tr_draconian_transformation', '용화 변신', 'Draconian Transformation', '대상 종족을 드라코니안으로 바꾸어 용 유형과 추가 체력, 빠른 자연 재생을 부여합니다.',
    'Turns the race into Draconians: the Dragon type, bonus HP and faster natural regeneration.', 'tome_dragons',
    { kind: 'major', effects: { hp: 10 }, look: { fur: null, snout: true } }));

  Data.define('tomes', TOME('tome_dragons', '용의 서', 'Tome of Dragons', '용의 힘에 도취되어 그 불꽃으로 백성을 강하게 만듭니다.',
    'Revel in the power of Dragons and let their flames empower your people.', {
      tier: 3, affinity: { nature: 1, chaos: 1 }, expansion: 'dragon_dawn', icon: 'tome_nature_3',
      passive: { desc: nm('아군 용 유닛은 사기 +5.', '+5 Morale for friendly Dragon units.'), effects: { morale: 2 } },
      contents: [
        { type: 'improvement', id: 'imp_wyvern_eyrie', cost: kc(3) },
        { type: 'spell', id: 'sp_dragonstrike_infusion', cost: kc(3) },
        { type: 'transformation', id: 'tr_draconian_transformation', cost: kc(3) },
        { type: 'spell', id: 'sp_dragon_attack', cost: kc(3) },
        { type: 'spell', id: 'sp_purifying_flame', cost: kc(3) },
        { type: 'spell', id: 'sp_call_young_dragon', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE WEAVER (T3 Nature/Shadow)
  Data.define('improvements', IMP('imp_spiders_nest', "거미의 둥지", "Spider's Nest",
    '숲 보호구역으로 식량을 제공하며, 인접 보호구역·숲 지방마다 징집력이 오르고 다양한 거미 유닛의 생산이 가능해집니다.',
    'A forest sanctuary yielding Food, more Draft per adjacent Forester/Forest, and unlocks Spider units.', 'tome_weaver',
    { kind: 'forester', feature: ['forest'], cost: { gold: 170, imperium: 0 }, yields: { food: 20 }, adjacencyBonus: { sameKind: 5 } }));

  Data.define('units', U('tn_weaver_spider', '직조 거미', 'Weaver Spider', '실을 뽑아 적을 옭아매는 원거리 거미.', 'A ranged spider that spins silk to bind enemies.', 'tome_weaver', {
    tier: 2, role: 'ranged', tags: ['animal'], mp: 40, source: { type: 'summon', id: 'tome_weaver' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 65, def: 1, res: 1, morale: 0,
    attacks: [{ id: 'web_shot', name: nm('거미줄 발사', 'Web Shot'), type: 'ranged', damage: 8, channel: 'blight', range: 3, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'rooted', chance: 70 }], props: [] }],
    abilities: [], passives: [],
    look: { body: 'beast_spider', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: '#3a2e4a', glow: null },
  }));
  Data.define('units', U('tn_priest_of_the_weave', '직조의 사제', 'Priest of the Weave', '죽은 아군을 거미로 되살리고 부정 효과를 적에게 옮기는 지원 유닛.', 'A Support unit that rebirths the dead as spiders and transfers debuffs onto enemies.', 'tome_weaver', {
    tier: 4, role: 'support', tags: ['racial'], mp: 40, source: { type: 'tome', id: 'tome_weaver' },
    cost: { gold: 200, mana: 0, draft: 300 }, upkeep: { gold: 30, mana: 0, imperium: 3 }, statusRes: { blight: 9 },
    hp: 100, def: 3, res: 5, morale: 0,
    attacks: [{ id: 'web_blast', name: nm('거미줄 작렬', 'Web Blast'), type: 'ranged', damage: 12, channel: 'blight', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'rooted', chance: 50 }], props: ['magic'] }],
    abilities: ['heal_wounds', 'defend'], passives: [],
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'long', shield: 'none', element: 'shadow', size: 'medium', tint: '#3a2e4a', glow: '#7b3fa0' },
  }));

  Data.define('spells', SP('sp_conjure_weaver_spiders', '직조 거미 소환', 'Conjure Weaver Spiders', '전투 중 직조 거미 두 마리를 소환합니다.',
    'Conjures two Weaver Spiders in battle.', {
      tier: 3, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 45, cp: 30 }, upkeep: {}, target: 'hex', range: 0, area: 1,
      effect: { type: 'summon', unit: 'tn_weaver_spider', count: 2 },
    }));
  Data.define('spells', SP('sp_dread_hunters', '공포의 사냥꾼', 'Dread Hunters', '야수·거미 유닛이 사기 저하를 걸고 속박·빙결된 적에게 피해를 더 줍니다.',
    'Animal and Spider units gain a Demoralizer and deal bonus damage against Rooted or Frozen targets.', {
      tier: 3, affinity: { shadow: 1 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['animal'], effects: { dmgPctVsRooted: 20 } },
    }));
  Data.define('spells', SP('sp_dreadful_bind', '공포의 결박', 'Dreadful Bind', '주변의 적들이 속박되고 회한에 사로잡힙니다.',
    'Nearby enemies become Rooted and consumed by remorse.', {
      tier: 3, affinity: { shadow: 1 }, kind: 'combat', cost: { mana: 80, cp: 35 }, upkeep: {}, target: 'hex', range: 4, area: 2,
      effect: { type: 'status', status: 'rooted', duration: 1, chance: 90, area: 2 },
    }));

  Data.define('transformations', TR('tr_spiders_embrace', '거미의 포옹', "Spider's Embrace", '대상 종족이 거미와 하나가 되어 거미 유형과 빠른 이동을 얻고, 기본 공격에 속박 확률이 붙습니다.',
    'Weaves the race with spiders: the Spider type, Fast Movement, and a chance to Root on base attacks.', 'tome_weaver',
    { kind: 'major', effects: {}, look: { fur: '#3a2e4a' } }));

  Data.define('tomes', TOME('tome_weaver', '직조자의 서', 'Tome of the Weaver', '속박 상태를 걸고 그 효과를 극대화하며 적의 마음에 공포를 심습니다.',
    'Inflict and exploit the Rooted status effect and strike fear into your enemies.', {
      tier: 3, affinity: { nature: 1, shadow: 1 }, expansion: 'secrets_of_the_archmages', icon: 'tome_nature_3',
      passive: { desc: nm('속박된 적에게 아군 공격 피해 +10%.', '+10% friendly attack damage against Rooted enemies.'), effects: {} },
      contents: [
        { type: 'improvement', id: 'imp_spiders_nest', cost: kc(3) },
        { type: 'spell', id: 'sp_conjure_weaver_spiders', cost: kc(3) },
        { type: 'spell', id: 'sp_dread_hunters', cost: kc(3) },
        { type: 'spell', id: 'sp_dreadful_bind', cost: kc(3) },
        { type: 'unit', id: 'tn_priest_of_the_weave', cost: kc(3, true) },
        { type: 'transformation', id: 'tr_spiders_embrace', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF NATURE'S WRATH (T4 Nature)
  Data.define('units', U('tn_horned_god', '뿔 달린 신', 'Horned God', '강력한 소환 능력을 지닌 자연의 신화 존재.', 'A Mythic embodiment of nature with potent summoning powers.', 'tome_natures_wrath', {
    tier: 5, role: 'support', tags: ['mythic', 'racial'], mp: 40, source: { type: 'summon', id: 'tome_natures_wrath' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 160, def: 5, res: 7, morale: 0,
    attacks: [{ id: 'nature_wrath_strike', name: nm('자연의 진노', "Nature's Wrath"), type: 'ranged', damage: 20, channel: 'blight', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'poisoned', chance: 40 }], props: ['magic'] }],
    abilities: ['ab_wildspeaker_conjure_animal', 'mass_heal', 'defend'], passives: ['inspiring_presence'],
    look: { body: 'giant', armor: 'none', weapon: 'none', helm: 'horned', cape: 'long', shield: 'none', element: 'nature', size: 'huge', tint: '#2e7d32', glow: '#8fd18a' },
  }));

  Data.define('spells', SP('sp_awaken_instincts', '본능 각성', 'Awaken Instincts', '주변 아군이 체력을 회복하고 행동력을 모두 되찾으며 광란에 빠집니다.',
    "Nearby allies heal, regain all action points, and become Berserk.", {
      tier: 4, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 150, cp: 50 }, upkeep: {}, target: 'ally_unit', range: 0, area: 2,
      effect: { type: 'heal', amount: 25, status: 'enraged', duration: 2, area: 2 },
    }));
  Data.define('spells', SP('sp_destructive_regrowth', '파괴적 재성장', 'Destructive Regrowth', '대상 지방의 적이 역병 피해를 입고, 적 개발물은 약탈되며, 지방에는 숲이 되살아납니다.',
    "Enemies in the target province take Blight damage, its improvement is pillaged, and forest reclaims the land.", {
      tier: 4, affinity: { nature: 1 }, kind: 'transform', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'province', range: 0, area: 0,
      effect: { type: 'terraform', terrain: 'forest', feature: 'forest', radius: 0 },
    }));
  Data.define('spells', SP('sp_devolve', '퇴화', 'Devolve', '영웅이 아닌 적 유닛을 전투가 끝날 때까지 하급 동물로 되돌립니다. 실패하면 대신 기절시킵니다.',
    'Reverts a non-Hero enemy into a lowly animal for the rest of the battle; on failure it is Stunned instead.', {
      tier: 4, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 100, cp: 40 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0,
      effect: { type: 'status', status: 'stunned', duration: 2, chance: 90 },
    }));
  Data.define('spells', SP('sp_frenzying_imbuement', '광란의 부여', 'Frenzying Imbuement', '원거리·지원·전투 마법사 유닛이 광분과 생명력 흡수를 얻습니다.',
    'Ranged, Support and Battle Mage units gain Frenzy and Life Steal.', {
      tier: 4, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 5 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: {} },
    }));
  Data.define('spells', SP('sp_awaken_the_forest', '숲의 각성', 'Awaken the Forest', '숲 지방이 사라지는 대신 야수와 식물로 이루어진 군세가 소환되어 아군이 됩니다.',
    'A forested province loses its forest, and an army of animals and plants rises under your control.', {
      tier: 4, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 400, cp: 400 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_entwined_thrall', count: 3 },
    }));
  Data.define('spells', SP('sp_summon_horned_god', '뿔 달린 신 소환', 'Summon Horned God', '강력한 소환 능력을 지닌 뿔 달린 신을 목표 지역에 소환합니다.',
    'Summons the Horned God, potent at calling forth summons, onto the target world hex.', {
      tier: 4, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 300, cp: 300 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_horned_god', count: 1 },
    }));

  Data.define('tomes', TOME('tome_natures_wrath', '자연의 진노의 서', "Tome of Nature's Wrath", '자연의 통제 불가능한 힘을 풀어놓는 강력한 주문을 얻습니다.',
    "Grants powerful spells that unleash the uncontrollable power of nature.", {
      tier: 4, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_4',
      passive: { desc: nm('아군 야수·식물 유닛은 광란 상태에서 사기 변화의 영향을 받지 않습니다.', 'Friendly Animal/Plant units ignore morale changes while Berserk.'), effects: {} },
      contents: [
        { type: 'spell', id: 'sp_awaken_instincts', cost: kc(4) },
        { type: 'spell', id: 'sp_destructive_regrowth', cost: kc(4) },
        { type: 'spell', id: 'sp_devolve', cost: kc(4) },
        { type: 'spell', id: 'sp_frenzying_imbuement', cost: kc(4) },
        { type: 'spell', id: 'sp_awaken_the_forest', cost: kc(4) },
        { type: 'spell', id: 'sp_summon_horned_god', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF PARADISE (T4 Nature)
  Data.define('improvements', IMP('imp_garden_of_bliss', '지복의 정원', 'Garden of Bliss',
    '안정도를 크게 높이는 농장으로, 인접 초원 지방마다 식량이 오르고 식량 수입의 일부가 마나로 전환됩니다.',
    'A farm greatly raising Stability, more Food per adjacent Grassland, converting some Food income to Mana.', 'tome_paradise',
    { kind: 'farm', cost: { gold: 170, imperium: 0 }, yields: { stability: 15 }, adjacencyBonus: { sameKind: 7 } }));

  Data.define('spells', SP('sp_enchanted_bloom', '마법 개화', 'Enchanted Bloom', '지정한 도시 영역이 매 턴 초원과 숲으로 뒤덮여 식량과 안정도를 얻습니다.',
    "The target city's domain gradually turns to Grassland and Forest each turn, yielding Food and Stability.", {
      tier: 4, affinity: { nature: 1 }, kind: 'strategic', cost: { mana: 150, cp: 150 }, upkeep: { mana: 15 }, target: 'city', range: 0, area: 0,
      effect: { type: 'special', id: 'enchanted_bloom' },
    }));
  Data.define('spells', SP('sp_exhilarating_pollen', '황홀한 꽃가루', 'Exhilarating Pollen', '아군 전체가 사기를 얻고, 적 전체는 주의가 흐트러집니다.',
    'All friendly units gain Morale; all enemy units become Distracted.', {
      tier: 4, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 45, cp: 30 }, upkeep: {}, target: 'all_allies', range: 0, area: 0,
      effect: { type: 'status', status: 'inspired', duration: 3, chance: 100 },
    }));
  Data.define('spells', SP('sp_natures_bounty', "자연의 축복", "Nature's Bounty", '지정 지방의 아군 전체가 최대 체력이 오르고 인근에서 체력을 회복합니다.',
    'All friendly units in the target province gain max HP and regenerate it nearby.', {
      tier: 4, affinity: { nature: 1 }, kind: 'strategic', cost: { mana: 120, cp: 120 }, upkeep: {}, target: 'army', range: 0, area: 0,
      effect: { type: 'heal', amount: 15 },
    }));
  Data.define('spells', SP('sp_blessing_of_paradise', '낙원의 축복', 'Blessing of Paradise', '안정도가 중립보다 높은 도시는 안정도 초과분마다 수입이 오릅니다.',
    'Cities gain extra income for each point of Stability above Neutral.', {
      tier: 4, affinity: { nature: 1 }, kind: 'empire', cost: { mana: 0, cp: 0 }, upkeep: {}, target: 'empire', range: 0, area: 0,
      effects: { goldPct: 5 },
    }));
  Data.define('spells', SP('sp_fortress_of_vines', '덩굴 요새', 'Fortress of Vines', '영역 안 아군 유닛이 매 턴 경험치를 얻고, 침입한 적은 이동에 방해를 받습니다.',
    'Friendly units in the domain earn experience each turn, and invading enemies are hindered.', {
      tier: 4, affinity: { nature: 1 }, kind: 'strategic', cost: { mana: 300, cp: 300 }, upkeep: { mana: 30 }, target: 'empire', range: 0, area: 0,
      effect: { type: 'special', id: 'fortress_of_vines' },
    }));

  Data.define('transformations', TR('tr_gaias_chosen', "가이아의 선택받은 자", "Gaia's Chosen", '대상 종족이 자연의 축복을 받아 식물 유형이 되고, 상태이상 저항과 최대 체력이 오릅니다.',
    "Infuses the race with nature's blessing: the Plant type, +3 Status Resistance and +20 HP.", 'tome_paradise',
    { kind: 'major', effects: { hp: 20, statusRes: 3 }, look: { fur: '#5fb043' } }));

  Data.define('tomes', TOME('tome_paradise', '낙원의 서', 'Tome of Paradise', '백성을 위한 푸르른 낙원을 조성합니다. 경제, 치유, 강화 효과에 집중합니다.',
    'Create a lush green paradise for your people; focus on economy, healing and buffs.', {
      tier: 4, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_4',
      passive: { desc: nm('도시 안정도가 중립 이상이면 식량 수입 +10%.', '+10% Food income for cities at or above Neutral Stability.'), effects: { foodPct: 5 } },
      contents: [
        { type: 'improvement', id: 'imp_garden_of_bliss', cost: kc(4) },
        { type: 'spell', id: 'sp_enchanted_bloom', cost: kc(4) },
        { type: 'spell', id: 'sp_exhilarating_pollen', cost: kc(4) },
        { type: 'spell', id: 'sp_natures_bounty', cost: kc(4) },
        { type: 'spell', id: 'sp_blessing_of_paradise', cost: kc(4) },
        { type: 'spell', id: 'sp_fortress_of_vines', cost: kc(4) },
        { type: 'transformation', id: 'tr_gaias_chosen', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE CRUCIBLE (T4 Materium)
  Data.define('improvements', IMP('imp_great_foundry', '대주물소', 'Great Foundry',
    '금을 생산하는 광산으로, 인접 광산마다 징집력과 금이 오르며 마그마 정령의 징집이 가능해집니다.',
    'A mine yielding Gold, more Draft and Gold per adjacent Mine, and unlocks drafting Magma Spirit.', 'tome_crucible',
    { kind: 'mine', cost: { gold: 170, imperium: 0 }, yields: { gold: 10 }, adjacencyBonus: { sameKind: 5 } }));
  Data.define('improvements', IMP('imp_crucible_battlements', '도가니 흉벽', 'Crucible Battlements',
    '성벽 원거리·마법 공격에 화염 피해를 더하고 사거리를 늘리는 흉벽 구조물.',
    "A Battlement structure that adds Fire damage and range to the city's ranged/magic wall attacks.", 'tome_crucible',
    { kind: 'special', cost: { gold: 170, imperium: 0 }, yields: {}, adjacencyBonus: {} }));

  Data.define('units', U('tn_magma_spirit', '마그마 정령', 'Magma Spirit', '녹은 바위로 이루어진 전투 마법사.', 'A Battle Mage forged from molten rock.', 'tome_crucible', {
    tier: 3, role: 'mage', tags: ['elemental'], mp: 36, source: { type: 'tome', id: 'tome_crucible' },
    cost: { gold: 140, mana: 0, draft: 220 }, upkeep: { gold: 20, mana: 0 }, statusRes: { fire: 5 },
    hp: 85, def: 1, res: 3, morale: 0,
    attacks: [{ id: 'magma_bolt', name: nm('마그마 화살', 'Magma Bolt'), type: 'ranged', damage: 16, channel: 'fire', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'burning', chance: 40 }], props: ['magic'] }],
    abilities: ['defend'], passives: ['immune_fire'],
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'medium', tint: '#c25b2e', glow: '#ff8c3c' },
  }));

  Data.define('spells', SP('sp_lava_burst', '용암 폭발', 'Lava Burst', '지정 지역이 화염 피해를 입고 화상과 둔화에 걸리며, 땅이 불타오릅니다.',
    'The area takes Fire damage, catches Burning, becomes Slowed, and the ground ignites.', {
      tier: 4, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 100, cp: 40 }, upkeep: {}, target: 'hex', range: 4, area: 2,
      effect: { type: 'damage', channel: 'fire', amount: 30, area: 2, status: { id: 'burning', chance: 100, duration: 3 } },
    }));
  Data.define('spells', SP('sp_pyroclastic_eruption', '화쇄류 분출', 'Pyroclastic Eruption', '대상 지방이 화산재로 뒤덮이고 그 안의 적은 화염 피해를 입습니다.',
    'The target province is buried in Ashlands and enemies there take Fire damage.', {
      tier: 4, affinity: { materium: 1 }, kind: 'transform', cost: { mana: 150, cp: 150 }, upkeep: {}, target: 'province', range: 0, area: 0,
      effect: { type: 'terraform', terrain: 'volcanic', feature: 'ash', radius: 0 },
    }));
  Data.define('spells', SP('sp_meteor_imbuement', '유성 부여', 'Meteor Imbuement', '기본 공격이 대상과 주변 적에게 화염 피해를 추가로 주고 장애물을 부술 수 있게 됩니다.',
    'Base attacks deal bonus Fire damage to the target and nearby enemies and can demolish obstacles.', {
      tier: 4, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 160, cp: 160 }, upkeep: { mana: 8 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: {}, attackChannel: 'fire' },
    }));
  Data.define('spells', SP('sp_meteor_shower', '유성우', 'Meteor Shower', '무작위 적 두 명과 그 주변에 화염·물리 피해를 주는 효과가 몇 라운드에 걸쳐 반복됩니다.',
    'Fire and Physical damage strikes two random enemies and those nearby, repeating over several rounds.', {
      tier: 4, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 150, cp: 50 }, upkeep: {}, target: 'all_enemies', range: 0, area: 0,
      effect: { type: 'damage', channel: 'fire', amount: 10 },
    }));

  Data.define('tomes', TOME('tome_crucible', '도가니의 서', 'Tome of the Crucible', '적을 용암 속에 파묻고 대지와 화염의 파괴적 힘으로 지형을 빚어냅니다.',
    'Bury your enemies in lava and shape the land with the destructive forces of earth and fire.', {
      tier: 4, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_4',
      passive: { desc: nm('화산 지형 지방을 소유하면 도시 안정도 페널티를 무시합니다.', 'Ignores city Stability penalties from owning Volcanic terrain.'), effects: {} },
      contents: [
        { type: 'improvement', id: 'imp_great_foundry', cost: kc(4) },
        { type: 'unit', id: 'tn_magma_spirit', cost: kc(4, true) },
        { type: 'spell', id: 'sp_lava_burst', cost: kc(4) },
        { type: 'spell', id: 'sp_pyroclastic_eruption', cost: kc(4) },
        { type: 'spell', id: 'sp_meteor_imbuement', cost: kc(4) },
        { type: 'spell', id: 'sp_meteor_shower', cost: kc(4) },
        { type: 'improvement', id: 'imp_crucible_battlements', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE GOLDEN REALM (T4 Materium)
  Data.define('improvements', IMP('imp_bazaar_of_wonders', '경이의 시장', 'Bazaar of Wonders',
    '금을 생산하는 광산으로, 인접한 고유 지방 개발물마다 금이 추가로 오릅니다.',
    'A mine yielding Gold, more for each adjacent unique Province Improvement.', 'tome_golden_realm',
    { kind: 'mine', cost: { gold: 170, imperium: 0 }, yields: { gold: 10 }, adjacencyBonus: { sameKind: 5 } }));
  Data.define('improvements', IMP('imp_luxury_markets', '사치품 시장', 'Luxury Markets',
    '즉시 구매 비용을 25% 낮추고 턴당 두 번까지 사용할 수 있게 합니다.',
    'Makes Buy Now 25% cheaper and usable twice per world turn.', 'tome_golden_realm',
    { kind: 'special', cost: { gold: 170, imperium: 0 }, yields: {}, adjacencyBonus: {} }));
  Data.define('improvements', IMP('imp_reagent_refinery', '시약 정제소', 'Reagent Refinery',
    '금을 생산하며, 영역 안 마법 재료마다 식량과 징집력이 추가로 오릅니다.',
    'Yields Gold, plus Food and Draft for each Magic Material inside the domain.', 'tome_golden_realm',
    { kind: 'special', cost: { gold: 170, imperium: 0 }, yields: { gold: 10 }, adjacencyBonus: {} }));

  Data.define('units', U('tn_gold_golem', '황금 골렘', 'Golden Golem', '적을 황금으로 바꾸고 그 전리품을 거두어 오는 신화 유닛.', 'A Mythic unit that turns enemies to gold... and brings home the spoils.', 'tome_golden_realm', {
    tier: 5, role: 'polearm', tags: ['mythic', 'construct'], mp: 40, source: { type: 'tome', id: 'tome_golden_realm' },
    cost: { gold: 400, mana: 0, draft: 400 }, upkeep: { gold: 60, mana: 0, imperium: 7 }, statusRes: { physical: 11 },
    hp: 150, def: 7, res: 7, morale: 0,
    attacks: [{ id: 'golden_cleave', name: nm('황금 베기', 'Golden Cleave'), type: 'melee', damage: 28, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'st_gilded', chance: 50 }], props: [] }],
    abilities: ['defend'], passives: ['construct', 'heartless', 'siege_breaker', 'large_target'],
    look: { body: 'golem', armor: 'none', weapon: 'halberd', helm: 'none', cape: false, shield: 'none', element: null, size: 'large', tint: '#e0c34c', glow: '#fff2a8' },
  }));

  Data.define('spells', SP('sp_gilding_blast', '금박 폭발', 'Gilding Blast', '주변의 적들이 금박 상태가 되어 굼떠지고 약해집니다.',
    'Nearby enemies become Gilded, slow and brittle.', {
      tier: 4, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 100, cp: 40 }, upkeep: {}, target: 'hex', range: 4, area: 1,
      effect: { type: 'status', status: 'st_gilded', duration: 1, chance: 90, area: 1 },
    }));

  Data.define('transformations', TR('tr_goldtouched', '황금의 손길', 'Goldtouched', '대상 종족이 황금에 대한 친화력을 얻어 저항력이 오르고, 도시 인구 한 명당 금 수입이 오릅니다.',
    'Grants an affinity for gold: +2 Resistance and +1 Gold per Population in their cities.', 'tome_golden_realm',
    { kind: 'minor', effects: { res: 2, goldPct: 3 }, look: { skin2: '#e0c34c' } }));

  Data.define('tomes', TOME('tome_golden_realm', '황금 왕국의 서', 'Tome of the Golden Realm', '새로운 기반시설로 막대한 금을 벌어들이고, 적마저 황금으로 바꾸어 버리는 번영한 제국이 됩니다.',
    'Become a prosperous empire, gaining vast amounts of Gold with new infrastructure and by turning enemies into gold.', {
      tier: 4, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_4',
      passive: { desc: nm('제국 전체 금 수입 +5%.', '+5% empire-wide Gold income.'), effects: { goldPct: 5 } },
      contents: [
        { type: 'improvement', id: 'imp_bazaar_of_wonders', cost: kc(4) },
        { type: 'improvement', id: 'imp_luxury_markets', cost: kc(4) },
        { type: 'spell', id: 'sp_gilding_blast', cost: kc(4) },
        { type: 'unit', id: 'tn_gold_golem', cost: kc(4, true) },
        { type: 'transformation', id: 'tr_goldtouched', cost: kc(4) },
        { type: 'improvement', id: 'imp_reagent_refinery', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF SEVERING (T4 Materium/Shadow)
  Data.define('units', U('tn_severing_golem', '단절 골렘', 'Severing Golem', '적의 인챈트를 지우고 아군의 부정 효과를 씻어내는 신화 시전자.', 'A caster Mythic unit that strips enemy enchantments and cleanses friendly debuffs.', 'tome_severing', {
    tier: 5, role: 'mage', tags: ['mythic', 'construct'], mp: 40, source: { type: 'tome', id: 'tome_severing' },
    cost: { gold: 400, mana: 0, draft: 400 }, upkeep: { gold: 60, mana: 0, imperium: 7 }, statusRes: { physical: 11 },
    hp: 140, def: 5, res: 6, morale: 0,
    attacks: [{ id: 'weakening_bolts', name: nm('약화의 화살', 'Weakening Bolts'), type: 'ranged', damage: 18, channel: 'lightning', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'weakened', chance: 60 }], props: ['magic'] }],
    abilities: ['dispel', 'cleanse', 'defend'], passives: ['construct', 'heartless', 'siege_breaker'],
    look: { body: 'golem', armor: 'none', weapon: 'staff', helm: 'none', cape: false, shield: 'none', element: 'shadow', size: 'large', tint: '#5a6b7a', glow: '#9ab0c9' },
  }));

  Data.define('spells', SP('sp_astral_severance', '아스트랄 단절', 'Astral Severance', '대상 마법 기원 유닛을 소멸시키려 시도합니다. 실패하면 대신 침묵시키고 부패시킵니다.',
    'Attempts to unmake a Magic Origin unit; on failure it is Silenced and rots instead.', {
      tier: 4, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 150, cp: 50 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0,
      effect: { type: 'damage', channel: 'lightning', amount: 60, status: { id: 'silenced', chance: 100, duration: 2 } },
    }));
  Data.define('spells', SP('sp_final_banishment', '최후의 추방', 'Final Banishment', '전장의 시체를 모두 없애고, 그 수만큼 아군이 저항력을 얻고 체력을 회복합니다.',
    'Destroys every corpse on the battlefield; friendly units gain Resistance and heal for each one.', {
      tier: 4, affinity: { shadow: 1 }, kind: 'combat', cost: { mana: 150, cp: 50 }, upkeep: {}, target: 'all_allies', range: 0, area: 0,
      effect: { type: 'heal', amount: 5 },
    }));
  Data.define('spells', SP('sp_null_shield', '무효화 방패', 'Null Shield', '방어 태세에 들어갈 때 자신과 인접 아군이 상태이상 저항을 얻습니다.',
    'Entering Defense Mode grants the unit and adjacent allies Status Resistance.', {
      tier: 4, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 160, cp: 160 }, upkeep: { mana: 8 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'support'], effects: { statusRes: 5 } },
    }));
  Data.define('spells', SP('sp_conjure_spellward', '주문 방벽 소환', 'Conjure Spellward', '대상 지방에 주문 방벽을 세워 인접 지방까지 적 세계 주문을 차단하고 시야를 제공합니다.',
    "Raises a Spellward that jams enemy world spells in the province and adjacent ones, and grants vision.", {
      tier: 4, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 200, cp: 200 }, upkeep: {}, target: 'province', range: 0, area: 0,
      effect: { type: 'reveal', radius: 3 },
    }));
  Data.define('spells', SP('sp_disrupting_blades', '교란의 칼날', 'Disrupting Blades', '근접 유닛의 공격이 적을 교란시켜 인챈트와 주문 효과를 방해합니다.',
    "Melee units' attacks Disrupt enemies, jamming their enchantments and spell effects.", {
      tier: 4, affinity: { shadow: 1 }, kind: 'unit_enchant', cost: { mana: 180, cp: 180 }, upkeep: { mana: 9 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter'], effects: {}, attackStatus: { id: 'silenced', chance: 60 } },
    }));

  Data.define('tomes', TOME('tome_severing', '단절의 서', 'Tome of Severing', '강력한 무효화 마법으로 소환된 존재의 본질 그 자체를 끊어냅니다.',
    'Wield powerful nullification magic to sever the very essence of summoned creatures.', {
      tier: 4, affinity: { materium: 1, shadow: 1 }, expansion: 'empires_and_ashes', icon: 'tome_materium_4',
      passive: { desc: nm('적 마법 기원 유닛에게 아군 공격 피해 +10%.', '+10% friendly attack damage against enemy Magic Origin units.'), effects: {} },
      contents: [
        { type: 'spell', id: 'sp_astral_severance', cost: kc(4) },
        { type: 'spell', id: 'sp_final_banishment', cost: kc(4) },
        { type: 'spell', id: 'sp_null_shield', cost: kc(4) },
        { type: 'spell', id: 'sp_conjure_spellward', cost: kc(4) },
        { type: 'spell', id: 'sp_disrupting_blades', cost: kc(4) },
        { type: 'unit', id: 'tn_severing_golem', cost: kc(4, true) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE STORMBORNE (T4 Nature/Astral)
  Data.define('improvements', IMP('imp_stormport', '폭풍 항구', 'Stormport',
    '마나를 생산하는 항만 시설로, 제국에 지어진 폭풍 항구 하나당 마나와 금이 추가로 오릅니다. 연안 지방에만 지을 수 있습니다.',
    'A harbor yielding Mana, more Mana and Gold per Stormport built empire-wide. Coastal provinces only.', 'tome_stormborne',
    { kind: 'special', cost: { gold: 280, imperium: 0 }, yields: { mana: 12 }, adjacencyBonus: {} }));

  Data.define('units', U('tn_stormbringer', '폭풍 전달자', 'Stormbringer', '공격이 다른 적에게 튀어나가는 공세적인 마법 전투원.', "An offensive Magic Fighter whose attacks arc to other enemies.", 'tome_stormborne', {
    tier: 4, role: 'mage', tags: ['racial'], mp: 40, source: { type: 'tome', id: 'tome_stormborne' },
    cost: { gold: 200, mana: 0, draft: 300 }, upkeep: { gold: 30, mana: 0, imperium: 3 }, statusRes: { lightning: 7 },
    hp: 105, def: 4, res: 4, morale: 0,
    attacks: [{ id: 'storm_strikes', name: nm('폭풍 강타', 'Storm Strikes'), type: 'melee', damage: 18, channel: 'lightning', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'electrified', chance: 40 }], props: ['magic'] }],
    abilities: ['defend'], passives: [],
    look: { body: 'form', armor: 'chain', weapon: 'spear', helm: 'open', cape: 'short', shield: 'none', element: 'lightning', size: 'medium', tint: null, glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_bounty_of_the_sea', '바다의 보상', 'Bounty of the Sea', '지정 도시가 연안 개발물에서 얻는 기본 자원을 두 배로 얻지만 안정도가 떨어집니다.',
    "The target city doubles the base resources from Coastal Province Improvements, at the cost of Stability.", {
      tier: 4, affinity: { nature: 1 }, kind: 'strategic', cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 }, target: 'city', range: 0, area: 0,
      effect: { type: 'resource', gold: 5, stability: -10 },
    }));
  Data.define('spells', SP('sp_downpour', '폭우', 'Downpour', '대상 지방이 늪으로 바뀌고 한동안 폭우가 쏟아집니다.',
    'The target province turns to Swamp and endures heavy rain for a time.', {
      tier: 4, affinity: { astral: 1 }, kind: 'transform', cost: { mana: 60, cp: 60 }, upkeep: {}, target: 'province', range: 0, area: 0,
      effect: { type: 'terraform', terrain: 'swamp', feature: 'none', radius: 0 },
    }));
  Data.define('spells', SP('sp_lightning_storm', '번개 폭풍', 'Lightning Storm', '모든 유닛이 젖은 상태가 되고, 무작위 적들이 번개 피해를 입고 감전되는 효과가 여러 라운드 반복됩니다.',
    'All units become Wet, and random enemies suffer repeated Lightning damage and Electrified over several rounds.', {
      tier: 4, affinity: { astral: 1 }, kind: 'combat', cost: { mana: 80, cp: 35 }, upkeep: {}, target: 'all_enemies', range: 0, area: 0,
      effect: { type: 'damage', channel: 'lightning', amount: 20, status: { id: 'electrified', chance: 90, duration: 3 } },
    }));

  Data.define('transformations', TR('tr_naga_transformation', '나가화', 'Naga Transformation', '대상 종족이 나가의 몸을 얻어 빠른 이동과 수륙양용 능력을 얻고 감전에 면역이 되며, 승용 동물과 다리 장비 슬롯을 잃습니다.',
    'Grants a Naga body: Fast Movement, Amphibious, immunity to Electrified; mounts and leg equipment are lost.', 'tome_stormborne',
    { kind: 'major', effects: {}, look: { feet: 'paws' } }));

  Data.define('tomes', TOME('tome_stormborne', '폭풍의 자손의 서', 'Tome of the Stormborne', '폭풍을 뜻대로 부리고 백성을 강력한 나가로 바꿉니다.',
    'Control the storms to do your bidding and turn your people into powerful Naga.', {
      tier: 4, affinity: { nature: 1, astral: 1 }, expansion: 'primal_fury', icon: 'tome_nature_4',
      passive: { desc: nm('젖은 상태의 적에게 아군 번개 피해 +10%.', '+10% friendly Lightning damage against Wet enemies.'), effects: {} },
      contents: [
        { type: 'spell', id: 'sp_bounty_of_the_sea', cost: kc(4) },
        { type: 'spell', id: 'sp_downpour', cost: kc(4) },
        { type: 'spell', id: 'sp_lightning_storm', cost: kc(4) },
        { type: 'transformation', id: 'tr_naga_transformation', cost: kc(4) },
        { type: 'unit', id: 'tn_stormbringer', cost: kc(4, true) },
        { type: 'improvement', id: 'imp_stormport', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF PROSPERITY (T4 Order/Nature)
  Data.define('improvements', IMP('imp_shrine_of_prosperity', '번영의 사당', 'Shrine of Prosperity',
    '인접 농장·보호구역마다 안정도와 식량이 오르며, 식량 수입의 일부가 금으로 전환됩니다.',
    'Yields Stability and Food per adjacent Farm/Forester, converting some Food income into Gold.', 'tome_prosperity',
    { kind: 'conduit', cost: { gold: 280, imperium: 0 }, yields: {}, adjacencyBonus: { sameKind: 3 } }));
  Data.define('improvements', IMP('imp_garden_of_affluence', '풍요의 정원', 'Garden of Affluence',
    '안정도를 크게 높이며, 영역 안 농장·보호구역 하나당 금과 마나가 오릅니다.',
    'Greatly raises Stability, plus Gold and Mana for each Farm/Forester in the domain.', 'tome_prosperity',
    { kind: 'special', cost: { gold: 170, imperium: 0 }, yields: { stability: 10 }, adjacencyBonus: {} }));

  Data.define('units', U('tn_prosperity_dragon', '번영의 용', 'Prosperity Dragon', '강력한 보호와 치유 능력을 지닌 신화 용.', 'A Mythic dragon with strong protective and healing abilities.', 'tome_prosperity', {
    tier: 5, role: 'shock', tags: ['mythic', 'dragon', 'flying'], move: 'fly', mp: 48, source: { type: 'summon', id: 'tome_prosperity' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 150, def: 6, res: 7, morale: 0,
    attacks: [
      { id: 'dragon_claw', name: nm('용의 발톱', 'Dragon Claw'), type: 'melee', damage: 24, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] },
      { id: 'grace_breath', name: nm('은총의 숨결', 'Breath of Grace'), type: 'ranged', damage: 0, channel: 'spirit', range: 2, ap: 1, repeat: 1, accuracy: 100, strikes: 1, effects: [{ status: 'st_grace', chance: 100 }], props: ['magic', 'cone'] },
    ],
    abilities: ['mass_heal', 'defend'], passives: ['flying', 'inspiring_presence'],
    look: { body: 'dragon', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'holy', size: 'large', tint: '#e8c357', glow: '#fff2c9' },
  }));

  Data.define('spells', SP('sp_grand_protection', '대보호', 'Grand Protection', '주변 아군이 은총, 재생, 방어 강화와 저항 강화를 얻습니다.',
    'Nearby allies gain Grace, Regeneration, Bolstered Defense and Bolstered Resistance.', {
      tier: 4, affinity: { order: 1 }, kind: 'combat', cost: { mana: 100, cp: 40 }, upkeep: {}, target: 'ally_unit', range: 0, area: 2,
      effect: { type: 'status', status: 'st_grace', duration: 3, chance: 100, area: 2 },
    }));
  Data.define('spells', SP('sp_blessed_armors', '축복받은 갑주', 'Blessed Armors', '근접 유닛이 은총을 얻고 저항력이 오릅니다.',
    'Melee units gain Grace and Resistance.', {
      tier: 4, affinity: { order: 1 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: { res: 1 } },
    }));
  Data.define('spells', SP('sp_staves_of_grace', '은총의 지팡이', 'Staves of Grace', '지원 유닛의 지원 능력이 은총을 부여하고 정화의 비 능력을 얻습니다.',
    "Support units' abilities grant Grace, and they gain the Cleansing Rain ability.", {
      tier: 4, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['support'], effects: { healPct: 15 } },
    }));
  Data.define('spells', SP('sp_summon_prosperity_dragon', '번영의 용 소환', 'Summon Prosperity Dragon', '강력한 보호와 치유 능력을 지닌 번영의 용을 목표 지역에 소환합니다.',
    'Summons the protective, healing Prosperity Dragon onto the target world hex.', {
      tier: 4, affinity: { nature: 1 }, kind: 'summon', cost: { mana: 300, cp: 300 }, upkeep: {}, target: 'hex', range: 0, area: 0,
      effect: { type: 'summon', unit: 'tn_prosperity_dragon', count: 1 },
    }));

  Data.define('tomes', TOME('tome_prosperity', '번영의 서', 'Tome of Prosperity', '제국에 번영을 가져오고 아군에게 치유의 은총을 내립니다.',
    'Bring forth prosperity to your empire and grant your units healing Grace.', {
      tier: 4, affinity: { order: 1, nature: 1 }, expansion: 'ways_of_war', icon: 'tome_nature_4',
      passive: { desc: nm('안정도가 높은 도시는 식량 수입 +5%.', '+5% Food income for cities with high Stability.'), effects: { stability: 2 } },
      contents: [
        { type: 'improvement', id: 'imp_shrine_of_prosperity', cost: kc(4) },
        { type: 'spell', id: 'sp_grand_protection', cost: kc(4) },
        { type: 'spell', id: 'sp_blessed_armors', cost: kc(4) },
        { type: 'improvement', id: 'imp_garden_of_affluence', cost: kc(4) },
        { type: 'spell', id: 'sp_staves_of_grace', cost: kc(4) },
        { type: 'spell', id: 'sp_summon_prosperity_dragon', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE GODDESS OF NATURE (T5 Nature)
  Data.define('spells', SP('sp_force_of_nature', '자연의 힘', 'Force of Nature', '기병·용·식물·야수·요정 유닛의 치명타 확률이 크게 오르고 공격에 역병 피해가 추가됩니다.',
    'Cavalry, Dragon, Plant, Animal and Fey units gain sharply higher critical chance and bonus Blight damage on attacks.', {
      tier: 5, affinity: { nature: 1 }, kind: 'unit_enchant', cost: { mana: 200, cp: 200 }, upkeep: { mana: 10 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['animal', 'dragon', 'plant', 'fey'], effects: { critChance: 15 }, attackChannel: 'blight' },
    }));
  Data.define('spells', SP('sp_forest_awareness', '숲의 인지', 'Forest Awareness', '제국의 모든 숲이 세계 지도에 시야를 제공합니다.',
    'All forests on the world map grant vision to your empire.', {
      tier: 5, affinity: { nature: 1 }, kind: 'strategic', cost: { mana: 200, cp: 200 }, upkeep: { mana: 20 }, target: 'empire', range: 0, area: 0,
      effect: { type: 'reveal', radius: 0 },
    }));
  Data.define('spells', SP('sp_mass_rejuvenation', '대규모 회춘', 'Mass Rejuvenation', '아군 전체가 크게 체력을 회복하고, 죽은 야수와 식물이 절반의 체력으로 되살아납니다.',
    "Heals every friendly unit for a large amount and brings dead Animals and Plants back to life at half HP.", {
      tier: 5, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 150, cp: 50 }, upkeep: {}, target: 'all_allies', range: 0, area: 0,
      effect: { type: 'heal', amount: 40 },
    }));
  Data.define('spells', SP('sp_thorned_growth', '가시덤불 성장', 'Thorned Growth', '주변의 적들이 가시덤불에 붙잡혀 속박되고 물리 피해를 입습니다.',
    'Nearby enemies are caught in thorny growth: Rooted and dealt Physical damage.', {
      tier: 5, affinity: { nature: 1 }, kind: 'combat', cost: { mana: 100, cp: 40 }, upkeep: {}, target: 'hex', range: 4, area: 2,
      effect: { type: 'damage', channel: 'physical', amount: 20, area: 2, status: { id: 'rooted', chance: 90, duration: 2 } },
    }));

  Data.define('heroSkills', HS('hs_avatar_of_nature', '자연의 화신', 'Avatar of Nature', '최대 체력이 크게 오르고 모성의 분노와 자연 재생을 얻습니다.',
    'Gains a large amount of max HP, Maternal Rage, and Natural Regeneration.',
    { tier: 3, cost: 2, effects: { hp: 30, healPerTurn: 3 } }));

  Data.define('tomes', TOME('tome_goddess_of_nature', '자연의 여신의 서', 'Tome of the Goddess of Nature', '자연의 궁극적인 화신이 됩니다. 특히 식물과 야수를 위한 강화와 치유에 통달합니다.',
    'Become the ultimate embodiment of nature; excel at buffs and healing, especially for Plants and Animals.', {
      tier: 5, affinity: { nature: 2 }, expansion: null, icon: 'tome_nature_5',
      passive: { desc: nm('아군 식물·야수 유닛은 최대 체력 +10%, 받는 치유량 +10%.', '+10% max HP and +10% healing received for friendly Plant/Animal units.'), effects: { hpPct: 5, healPct: 10 } },
      contents: [
        { type: 'spell', id: 'sp_force_of_nature', cost: kc(5) },
        { type: 'spell', id: 'sp_forest_awareness', cost: kc(5) },
        { type: 'spell', id: 'sp_mass_rejuvenation', cost: kc(5) },
        { type: 'spell', id: 'sp_thorned_growth', cost: kc(5) },
        { type: 'skill', id: 'hs_avatar_of_nature', cost: kc(5) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE CREATOR (T5 Materium)
  Data.define('units', U('tn_earth_titan', '대지 거신', 'Earth Titan', '잠든 땅에서 깨어난 거대한 신화 거인.', 'A colossal Mythic giant roused from the sleeping earth.', 'tome_creator', {
    tier: 5, role: 'shock', tags: ['mythic', 'giant'], mp: 32, source: { type: 'summon', id: 'tome_creator' },
    cost: { gold: 0, mana: 0, draft: 0 }, upkeep: { gold: 0, mana: 0 },
    hp: 160, def: 6, res: 6, morale: 0,
    attacks: [{ id: 'titanic_slam', name: nm('거신의 강타', 'Titanic Slam'), type: 'melee', damage: 30, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'stunned', chance: 30 }], props: [] }],
    abilities: ['seismic_slam'], passives: ['large_target', 'hardened', 'trample'],
    look: { body: 'giant', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'stone', size: 'huge', tint: '#7a7266', glow: null },
  }));

  Data.define('spells', SP('sp_call_the_titan_of_the_earth', '대지 거신 부르기', 'Call the Titan of the Earth', '목표 지점에 대지 거신을 소환합니다. 소환되면 주변 적들은 방어 태세와 반격을 잃습니다.',
    'Summons an Earth Titan onto the target hex; nearby enemies lose Defense Mode and their retaliation.', {
      tier: 5, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 200, cp: 65 }, upkeep: {}, target: 'hex', range: 4, area: 1,
      effect: { type: 'summon', unit: 'tn_earth_titan', count: 1 },
    }));
  Data.define('spells', SP('sp_tectonic_shatter', '지각 분쇄', 'Tectonic Shatter', '모든 적이 물리 피해를 입고 기절할 수 있으며, 전장의 장애물이 무너질 수 있습니다.',
    'Every enemy takes Physical damage and may be Stunned; battlefield obstacles may collapse.', {
      tier: 5, affinity: { materium: 1 }, kind: 'combat', cost: { mana: 200, cp: 65 }, upkeep: {}, target: 'all_enemies', range: 0, area: 0,
      effect: { type: 'damage', channel: 'physical', amount: 30, status: { id: 'stunned', chance: 60, duration: 1 } },
    }));
  Data.define('spells', SP('sp_create_earthshatter_engines', '지각파쇄기 건조', 'Create Earthshatter Engines', '전투 시작 시 모든 성벽이 손상되고 지각파쇄기 두 대가 공격측에 배치됩니다.',
    'At battle start, all Wall obstacles take damage and two Earthshatter Engines join the attacking side.', {
      tier: 5, affinity: { materium: 1 }, kind: 'strategic', cost: { mana: 0, cp: 0 }, upkeep: {}, target: 'city', range: 0, area: 0,
      effect: { type: 'special', id: 'siege_earthshatter_engines' },
    }));
  Data.define('spells', SP('sp_shapers_touch', '조형자의 손길', "Shaper's Touch", '정령·구조물 유닛이 자연 재생과 최대 체력, 번개 보호를 얻습니다.',
    'Elemental and Construct units gain Natural Regeneration, max HP and Lightning protection.', {
      tier: 5, affinity: { materium: 1 }, kind: 'unit_enchant', cost: { mana: 200, cp: 200 }, upkeep: { mana: 10 }, target: 'empire', range: 0, area: 0,
      enchant: { appliesTo: ['elemental', 'construct'], effects: { hp: 10, statusRes_lightning: 2 } },
    }));

  Data.define('tomes', TOME('tome_creator', '창조자의 서', 'Tome of the Creator', '세상을 빚어내고 잠든 거신을 소환하여 대지의 지배자가 됩니다.',
    'Shape the world, summon slumbering titans, and become the master of the earth.', {
      tier: 5, affinity: { materium: 2 }, expansion: null, icon: 'tome_materium_5',
      passive: { desc: nm('아군 정령·구조물 유닛은 최대 체력 +10.', '+10 max HP for friendly Elemental/Construct units.'), effects: { hp: 4 } },
      contents: [
        { type: 'spell', id: 'sp_call_the_titan_of_the_earth', cost: kc(5) },
        { type: 'spell', id: 'sp_tectonic_shatter', cost: kc(5) },
        { type: 'spell', id: 'sp_create_earthshatter_engines', cost: kc(5) },
        { type: 'spell', id: 'sp_shapers_touch', cost: kc(5) },
        { type: 'unit', id: 'tn_earth_titan', cost: kc(5, true) },
      ],
    }));
  //#endregion

})(window.AOW = window.AOW || {});
