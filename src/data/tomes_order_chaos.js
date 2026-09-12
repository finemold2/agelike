// src/data/tomes_order_chaos.js — Order & Chaos (+ Order/Chaos-adjacent dual) tomes, spells, units,
// improvements, transformations and hero skills (SPEC §3, §3.0.1). Modeled on AoW4 (base + all
// expansions through Secrets of the Archmages) — see docs/research/tomes_spells_affinity.md Parts 1/3/5.
//
// Conventions specific to this file (additive to SPEC, documented per the "no contract? add one" rule):
//   - spell.cost = {mana, cp}: `cp` holds the doc's Casting Points value, whether it is World Map
//     Casting Points (strategic spell kinds: unit_enchant/city_enchant/summon/transform/strategic/empire)
//     or Combat Casting Points (kind:'combat'); Rules checks the right pool from spell.kind.
//   - enchant.appliesTo uses unit ROLE ids (SPEC §3 role enum) to mirror the source game's
//     "Applies to: Shield Unit, Ranged Unit, ..." unit-class restrictions.
//   - Units that are summon-only (never recruited in a city) still carry a nominal cost/upkeep in mana
//     per SPEC §3.2 ("summoned units pay upkeep in mana rather than gold") and source:{type:'tome', id}.
//   - New statuses (`st_*`) and abilities (`ab_*`) are added only where the canonical vocab (see
//     src/data/statuses.js, src/data/abilities.js) doesn't already cover the AoW4 mechanic.
(function (AOW) {
  'use strict';
  const Data = AOW.Data;
  const L = (ko, en) => ({ ko, en });

  // ------------------------------------------------------------------ collectors
  const tomes = [];
  const spells = [];
  const units = [];
  const improvements = [];
  const transformations = [];
  const heroSkills = [];

  // ------------------------------------------------------------------ helpers
  const TM = (o) => tomes.push(Object.assign({ expansion: null }, o));
  const SP = (o) => spells.push(Object.assign({ upkeep: { mana: 0 }, range: 0, area: 0 }, o));
  const U = (o) => units.push(Object.assign({ move: 'walk', mp: 40, morale: 0, statusRes: {}, abilities: [], passives: [] }, o));
  const IMP = (o) => improvements.push(Object.assign({ terrain: null, feature: null, adjacencyBonus: {}, unique: false }, o));
  const TR = (o) => transformations.push(o);
  const HS = (o) => heroSkills.push(Object.assign({ class: null, cost: 1, prereq: [] }, o));
  // new abilities/statuses local to this file
  const AP = (id, ko, en, dko, den, rule, extra) => Data.define('abilities', {
    id, name: { ko, en }, desc: { ko: dko, en: den }, kind: 'passive', ap: 0, cooldown: 0, range: 0, target: 'self', area: 0, icon: id,
    effect: Object.assign({ type: 'passive', rule: rule || id }, extra || {}),
  });
  const AACT = (id, ko, en, dko, den, o) => Data.define('abilities', Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, kind: 'active', ap: 1, cooldown: 0, range: 1, target: 'enemy', area: 0, icon: id, effect: {},
  }, o));
  const AATK = (id, ko, en, dko, den, o) => {
    const eff = Object.assign({ type: 'damage', channel: 'physical', amount: 12, range: o.range || 1, area: o.area || 0, attackType: (o.range || 1) > 1 ? 'ranged' : 'melee' }, o.effect || {});
    return Data.define('abilities', Object.assign({ id, name: { ko, en }, desc: { ko: dko, en: den }, kind: 'attack', ap: 1, target: 'enemy', icon: id }, o, { effect: eff }));
  };
  const ST = (id, ko, en, dko, den, o) => Data.define('statuses', Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, kind: 'debuff', icon: id, stack: false, duration: 3, effects: {}, resistedBy: null, cleansable: true,
  }, o));
  // tome content knowledge cost by tier (T1 120, T2 220, T3 380, T4 600, T5 900; units +20%)
  const KCOST = { 1: 120, 2: 220, 3: 380, 4: 600, 5: 900 };
  const kc = (tier, isUnit) => Math.round(KCOST[tier] * (isUnit ? 1.2 : 1));
  // unit draft cost/upkeep by tier (from AoW4 data tables in the research doc)
  const UCOST = {
    1: { cost: { draft: 80, gold: 60, mana: 0 }, upkeep: { gold: 8, mana: 0 } },
    2: { cost: { draft: 120, gold: 100, mana: 0 }, upkeep: { gold: 12, mana: 0 } },
    3: { cost: { draft: 220, gold: 140, mana: 0 }, upkeep: { gold: 20, mana: 0 } },
    4: { cost: { draft: 300, gold: 200, mana: 0 }, upkeep: { gold: 30, mana: 0, imperium: 3 } },
    5: { cost: { draft: 400, gold: 300, mana: 0 }, upkeep: { gold: 60, mana: 0, imperium: 7 } },
  };
  // summon-only unit (Magic Origin): no draft cost, small mana upkeep
  const SCOST = (mana) => ({ cost: { draft: 0, gold: 0, mana: 0 }, upkeep: { gold: 0, mana: mana } });

  // ================================================================================================
  // NEW SHARED STATUSES for this file's mechanics
  // ================================================================================================
  ST('st_pacified', '평정', 'Pacified', '진정되어 이번 턴에는 공격할 수 없습니다. 이동은 가능합니다.',
    'Calmed: cannot attack this turn, though it may still move.',
    { duration: 1, effects: { silenced: true }, resistedBy: 'spirit' });
  ST('st_infernal_might', '지옥의 힘', 'Infernal Might', '지옥의 힘이 깃들어 주는 피해가 20% 증가하고 반격을 한 번 더 할 수 있습니다.',
    'Infused with infernal power: deals 20% more damage and gains one extra retaliation.',
    { kind: 'buff', duration: 3, effects: { dmgPct: 20, retaliation: 1 } });
  ST('st_blood_parasite', '혈액 기생체', 'Blood Parasite', '기생체가 피를 빨아먹어 매 턴 시작 시 중첩당 물리 피해 6을 입고, 이 상태로 죽으면 인접한 적에게 옮겨갑니다.',
    'A parasite feeds on the blood: 6 Physical damage per stack at the start of its turn; if it dies afflicted, the parasite leaps to an adjacent enemy.',
    { stack: 3, duration: 3, effects: { dotChannel: 'physical', dotAmount: 6 }, resistedBy: 'physical', immuneTags: ['undead', 'construct', 'elemental'] });
  ST('st_ghostfire', '유령불', 'Ghostfire', '차갑게 타오르는 유령불이 매 턴 시작 시 중첩당 화염 피해 4와 냉기 피해 4를 입힙니다.',
    'Cold, spectral flame burns for 4 Fire and 4 Frost damage per stack at the start of its turn.',
    { stack: 3, duration: 3, effects: { dotChannel: 'fire', dotAmount: 4, dotChannel2: 'frost', dotAmount2: 4 } });
  ST('st_precognition', '예지', 'Precognition', '다음번에 자신을 노리는 공격 하나가 완전히 빗나갑니다.',
    'The next attack made against this unit automatically misses.',
    { kind: 'buff', duration: 1, effects: { evasion: 100, oneShot: true }, cleansable: false });

  // ================================================================================================
  // ORDER TOMES
  // ================================================================================================

  // ---------------------------------------------------------------- Tome of Faith (T1, +2 Order)
  U({
    id: 'oc_lesser_light_spirit', name: L('빛의 하급 정령', 'Lesser Light Spirit'), desc: L('신앙의 서로 소환되는 치유의 빛 정령.', 'A healing spirit of light summoned through the Tome of Faith.'),
    tier: 1, role: 'support', tags: ['magic_origin', 'spirit', 'angelic', 'flying'],
    move: 'fly', mp: 44, ...SCOST(4),
    hp: 50, def: 0, res: 2, statusRes: { spirit: 2 },
    attacks: [{ id: 'light_touch', name: L('빛의 손길', 'Light Touch'), type: 'ranged', damage: 8, channel: 'spirit', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['heal_wounds'], passives: ['flying'],
    source: { type: 'tome', id: 'tome_faith' },
    look: { body: 'spirit', armor: 'robe', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'holy', size: 'small', glow: '#fff0b8' },
  });
  SP({
    id: 'sp_faithful_whispers', name: L('신실한 자의 속삭임', 'Faithful Whispers'), tier: 1, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 자유 도시의 충성도가 30% 더 빠르게 상승합니다.', 'Target Free City\'s allegiance to you grows 30% faster.'),
    cost: { mana: 45, cp: 45 }, target: 'city', range: 0, effect: { type: 'special', id: 'faithful_whispers_allegiance', pct: 30 },
  });
  SP({
    id: 'sp_army_heal', name: L('군대 치유', 'Army Heal'), tier: 1, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 아군 부대의 모든 유닛이 체력을 25 회복합니다.', 'Every unit in the target friendly army heals 25 Hit Points.'),
    cost: { mana: 80, cp: 80 }, target: 'army', range: 0, effect: { type: 'heal', amount: 25 },
  });
  SP({
    id: 'sp_staves_of_mending', name: L('치유의 지팡이', 'Staves of Mending'), tier: 1, affinity: { order: 2 }, kind: 'unit_enchant',
    desc: L('지원 유닛에게 신실함(유지비 감소)과 전투 중 사용할 수 있는 치유 능력을 부여합니다.', 'Support units gain Faithful (reduced upkeep) and a healing ability usable in battle.'),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['support'], effects: { upkeepPct: -10, healPerTurn: 2 }, grantAbility: 'heal_wounds' },
  });
  SP({
    id: 'sp_summon_lesser_light_spirit', name: L('빛의 하급 정령 소환', 'Summon Lesser Light Spirit'), tier: 1, affinity: { order: 2 }, kind: 'summon',
    desc: L('대상 칸에 빛의 하급 정령 지원 유닛을 소환합니다.', 'Summons a Lesser Light Spirit support unit onto the target hex.'),
    cost: { mana: 60, cp: 60 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_lesser_light_spirit', count: 1 },
  });
  SP({
    id: 'sp_wrath_of_the_faithful', name: L('신실한 자의 분노', 'Wrath of the Faithful'), tier: 1, affinity: { order: 2 }, kind: 'combat',
    desc: L('대상 적 유닛에게 영혼 피해 10을 주며, 전장의 신실한 아군 유닛 하나당 영혼 피해 5가 추가됩니다(최대 8).', 'Deals 10 Spirit damage to the target enemy, plus 5 more per friendly Faithful unit in the battle (up to 8).'),
    cost: { mana: 10, cp: 15 }, target: 'enemy_unit', range: 4, effect: { type: 'damage', channel: 'spirit', amount: 10 },
  });
  IMP({
    id: 'imp_abbey', name: L('수도원', 'Abbey'), desc: L('지식을 생산하고, 인접한 농장마다 지식이 추가되며, 이 칸의 아군은 다음 전투 시작 시 상태이상 보호를 얻습니다.', 'Generates Knowledge (more per adjacent Farm) and grants friendly units on this hex Status Protection at the start of their next battle.'),
    kind: 'special', tome: 'tome_faith', cost: { gold: 60, production: 130 }, yields: { knowledge: 10 }, adjacencyBonus: { farm: 3 },
  });
  TM({
    id: 'tome_faith', name: L('신앙의 서', 'Tome of Faith'), tier: 1, affinity: { order: 2 }, expansion: null, icon: 'tome_order_1',
    desc: L('신실한 자들의 힘으로 아군을 치유하고 지탱합니다.', 'Heal and support your units through the power of the Faithful.'),
    passive: { desc: L('신실함을 지닌 아군 유닛의 유지비가 5% 줄어듭니다.', 'Units with Faithful cost 5% less upkeep.'), effects: { upkeepPct: -5 } },
    contents: [
      { type: 'spell', id: 'sp_faithful_whispers', cost: kc(1, false) },
      { type: 'spell', id: 'sp_army_heal', cost: kc(1, false) },
      { type: 'improvement', id: 'imp_abbey', cost: kc(1, false) },
      { type: 'spell', id: 'sp_staves_of_mending', cost: kc(1, false) },
      { type: 'spell', id: 'sp_summon_lesser_light_spirit', cost: kc(1, false) },
      { type: 'spell', id: 'sp_wrath_of_the_faithful', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Zeal (T1, +2 Order)
  U({
    id: 'oc_zealot', name: L('광신도', 'Zealot'), desc: L('단죄된 적에게 강한 무모한 전사.', 'A reckless fighter that is especially deadly against Condemned enemies.'),
    tier: 1, role: 'mage', tags: ['magic_origin'],
    ...SCOST(5),
    hp: 60, def: 2, res: 2, statusRes: { spirit: 1 },
    attacks: [{ id: 'zealous_strike', name: L('광신의 일격', 'Zealous Strike'), type: 'melee', damage: 14, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: [], passives: ['fearless'],
    source: { type: 'tome', id: 'tome_zeal' },
    look: { body: 'form', armor: 'cloth', weapon: 'sword', helm: 'hood', cape: false, shield: 'none', element: 'holy', size: 'medium', glow: '#fff0b8' },
  });
  SP({
    id: 'sp_condemnation', name: L('단죄', 'Condemnation'), tier: 1, affinity: { order: 2 }, kind: 'combat',
    desc: L('대상 적 유닛에게 영혼 피해 15를 주고 전투가 끝날 때까지 단죄 상태로 만듭니다.', 'Deals 15 Spirit damage to the target enemy and inflicts Condemned until the end of battle.'),
    cost: { mana: 5, cp: 10 }, target: 'enemy_unit', range: 4, effect: { type: 'damage', channel: 'spirit', amount: 15, status: { id: 'condemned', chance: 100, duration: 0 } },
  });
  SP({
    id: 'sp_summon_zealot', name: L('광신도 소환', 'Summon Zealot'), tier: 1, affinity: { order: 2 }, kind: 'summon',
    desc: L('대상 세계 지도 칸에 광신도를 소환합니다.', 'Summons a Zealot onto the target world hex.'),
    cost: { mana: 60, cp: 60 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_zealot', count: 1 },
  });
  SP({
    id: 'sp_fanatical_workforce', name: L('광신적 노동력', 'Fanatical Workforce'), tier: 1, affinity: { order: 2 }, kind: 'strategic',
    desc: L('3턴 동안 대상 아군 도시의 생산력이 60 증가하고 식량이 20 감소합니다.', 'For 3 turns, the target owned city gains +60 Production and −20 Food.'),
    cost: { mana: 45, cp: 45 }, target: 'city', range: 0, effect: { type: 'resource', production: 60, food: -20, duration: 3 },
  });
  SP({
    id: 'sp_inspiring_chant', name: L('고무의 성가', 'Inspiring Chant'), tier: 1, affinity: { order: 2 }, kind: 'combat',
    desc: L('주변 2칸의 아군은 사기 +10을 얻고, 열의를 지닌 아군은 강화 2중첩을 얻습니다.', 'Friendly units within 2 hexes gain +10 Morale; those with Zeal also gain 2 stacks of Strengthened.'),
    cost: { mana: 30, cp: 25 }, target: 'ally_unit', range: 0, area: 2, effect: { type: 'status', status: 'inspired', duration: 3, chance: 100, area: 2 },
  });
  SP({
    id: 'sp_legion_of_zeal', name: L('열의의 군단', 'Legion of Zeal'), tier: 1, affinity: { order: 2 }, kind: 'unit_enchant',
    desc: L('방패병·원거리·장병기병·돌격병·전사·척후병 유닛에게 열의를 부여해 공격마다 영혼 피해가 추가됩니다.', 'Grants Shield, Ranged, Polearm, Shock, Fighter and Skirmisher units Zeal, adding Spirit damage to every attack.'),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: { channelDmg_spirit: 2 }, attackChannel: 'spirit' },
  });
  IMP({
    id: 'imp_circle_of_zealotry', name: L('광신의 원 채석장', 'Quarry of the Circle of Zealotry'), desc: L('제국의 성향이 어느 쪽이든 절댓값에 비례해 징집력을 생산하고, 인접한 지방 개선물마다 도시 안정도가 오르며 유닛 배치 지점이 됩니다.', 'Produces Draft proportional to the empire\'s Alignment magnitude, grants City Stability per adjacent improvement, and serves as a unit deployment point.'),
    kind: 'special', tome: 'tome_zeal', cost: { gold: 60, production: 130 }, yields: { draft: 10 }, adjacencyBonus: { improvement: 2 },
  });
  HS({
    id: 'hs_zealous_conviction', name: L('광신적 확신', 'Zealous Conviction'), desc: L('이 유닛의 기본 공격에 영혼 피해가 소폭 추가되고, 단죄된 적을 상대할 때 피해가 10% 증가합니다.', "This unit's base attacks deal a little bonus Spirit damage, and 10% more damage against Condemned targets."),
    tier: 1, effects: { channelDmg_spirit: 1, dmgPct: 3 },
  });
  TM({
    id: 'tome_zeal', name: L('열정의 서', 'Tome of Zeal'), tier: 1, affinity: { order: 2 }, expansion: null, icon: 'tome_order_1',
    desc: L('광신적인 백성을 하나의 목표로 결집시킵니다. 열의를 지닌 유닛과 단죄 효과를 활용합니다.', 'Rile up your fanatic population for a common goal. Use units with Zeal and inflict Condemned on enemies.'),
    passive: { desc: L('제국 정렬의 절댓값에 비례해 징집력을 소량 얻습니다.', 'Gain a small amount of Draft proportional to the empire\'s Alignment magnitude.'), effects: { draft: 2 } },
    contents: [
      { type: 'spell', id: 'sp_condemnation', cost: kc(1, false) },
      { type: 'spell', id: 'sp_summon_zealot', cost: kc(1, false) },
      { type: 'spell', id: 'sp_fanatical_workforce', cost: kc(1, false) },
      { type: 'spell', id: 'sp_inspiring_chant', cost: kc(1, false) },
      { type: 'spell', id: 'sp_legion_of_zeal', cost: kc(1, false) },
      { type: 'improvement', id: 'imp_circle_of_zealotry', cost: kc(1, false) },
      { type: 'skill', id: 'hs_zealous_conviction', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Virtue (T2, +2 Order)
  U({
    id: 'oc_paladin', name: L('성기사', 'Paladin'), desc: L('치유 능력과 강력한 강타를 지닌 방패 유닛.', 'A Shield unit with healing capabilities and a powerful smite.'),
    tier: 3, role: 'shield', tags: ['infantry'],
    ...UCOST[3],
    hp: 90, def: 7, res: 3, statusRes: { spirit: 3 },
    attacks: [{ id: 'strike', name: L('검격', 'Melee Strike'), type: 'melee', damage: 18, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 90, strikes: 1, effects: [], props: [] }],
    abilities: ['smite', 'heal_wounds', 'defend'], passives: ['shield_wall'],
    source: { type: 'tome', id: 'tome_virtue' },
    look: { body: 'form', armor: 'heavy_plate', weapon: 'sword_shield', helm: 'full', cape: 'short', shield: 'kite', element: 'holy', size: 'medium', glow: '#f1d98a' },
  });
  U({
    id: 'oc_vigil', name: L('비질', 'Vigil'), desc: L('정화의 성화를 다루는 전투 마법사 유닛.', 'A Battle Mage unit that channels purifying holy fire.'),
    tier: 3, role: 'mage', tags: ['magic_origin', 'angelic'],
    ...SCOST(10),
    hp: 75, def: 1, res: 3, statusRes: { spirit: 2 },
    attacks: [{ id: 'holy_fire', name: L('정화의 화염', 'Purifying Fire'), type: 'ranged', damage: 16, channel: 'spirit', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'condemned', chance: 40 }], props: ['magic'] }],
    abilities: ['holy_light_heal'], passives: [],
    source: { type: 'tome', id: 'tome_virtue' },
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: false, shield: 'none', element: 'holy', size: 'medium', glow: '#f1d98a' },
  });
  SP({
    id: 'sp_heroic_stand', name: L('영웅적 항전', 'Heroic Stand'), tier: 2, affinity: { order: 2 }, kind: 'combat',
    desc: L('대상 아군의 약화 효과를 모두 없애고 1턴 동안 불굴 상태로 만들며 사상자 페널티를 무시하게 합니다. 전투당 한 번.', 'Removes all debuffs from the target ally, grants Steadfast for 1 turn, and ignores casualty penalties for 1 turn. Once per battle per unit.'),
    cost: { mana: 30, cp: 25 }, target: 'ally_unit', range: 3, effect: { type: 'status', status: 'steadfast', duration: 1, chance: 100, cleanse: true },
  });
  SP({
    id: 'sp_house_of_charity', name: L('자선의 집', 'House of Charity'), tier: 2, affinity: { order: 2 }, kind: 'city_enchant',
    desc: L('대상 도시는 금 수입의 10%를 잃는 대신 그 두 배만큼 식량과 생산력을 얻습니다.', 'The target city loses 10% of its Gold income and gains double that amount as Food and Production instead.'),
    cost: { mana: 45, cp: 45 }, upkeep: { mana: 0 }, target: 'city', enchant: { effects: { goldPct: -10, foodPct: 20, productionPct: 20 } },
  });
  SP({
    id: 'sp_sacred_oath', name: L('신성한 맹세', 'Sacred Oath'), tier: 2, affinity: { order: 2 }, kind: 'combat',
    desc: L('대상 아군 하나에게 축복을 내리고 체력을 15 회복시킵니다.', 'Bestows Blessed on a friendly unit and heals it for 15 HP.'),
    cost: { mana: 20, cp: 20 }, target: 'ally_unit', range: 3, effect: { type: 'heal', amount: 15, status: { id: 'blessed', chance: 100, duration: 3 } },
  });
  SP({
    id: 'sp_summon_vigil', name: L('비질 소환', 'Summon Vigil'), tier: 2, affinity: { order: 2 }, kind: 'summon',
    desc: L('대상 칸에 정화의 성화를 다루는 비질 전투 마법사를 소환합니다.', 'Summons a Vigil battle mage, wielding purifying holy fire, onto the target hex.'),
    cost: { mana: 150, cp: 150 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_vigil', count: 1 },
  });
  TR({
    id: 'tr_virtuous_spirit', name: L('고결한 영혼', 'Virtuous Spirit'), desc: L('약해진 순간에도 힘을 발휘하는 종족으로 만듭니다: 영혼 보호 +2, 체력이 60% 아래로 떨어지면 사상자 50% 무시, 방어력·저항력 +1.', 'Gives the race strength in moments of weakness: +2 Spirit protection; below 60% HP, ignores 50% of casualties and gains +1 Defense/+1 Resistance.'),
    kind: 'minor', tome: 'tome_virtue', effects: { statusRes_spirit: 2, def: 1, res: 1 },
  });
  TM({
    id: 'tome_virtue', name: L('미덕의 서', 'Tome of Virtue'), tier: 2, affinity: { order: 2 }, expansion: 'archon_prophecy', icon: 'tome_order_2',
    desc: L('고결한 군대를 조직하여 끝까지 강인하게 싸우도록 만듭니다.', 'Create a virtuous army and make them fight strong until the end.'),
    passive: { desc: L('영혼 피해에 대한 저항이 소폭 오릅니다.', 'Gain a small amount of Spirit protection empire-wide.'), effects: { statusRes_spirit: 1 } },
    contents: [
      { type: 'spell', id: 'sp_heroic_stand', cost: kc(2, false) },
      { type: 'unit', id: 'oc_paladin', cost: kc(2, true) },
      { type: 'transformation', id: 'tr_virtuous_spirit', cost: kc(2, false) },
      { type: 'spell', id: 'sp_summon_vigil', cost: kc(2, false) },
      { type: 'spell', id: 'sp_house_of_charity', cost: kc(2, false) },
      { type: 'spell', id: 'sp_sacred_oath', cost: kc(2, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Beacon (T2, +2 Order)
  U({
    id: 'oc_divine_beacon', name: L('신성한 봉화', 'Divine Beacon'), desc: L('시전과 동시에 주변 아군을 치유하고 사기를 북돋는 소환된 봉화.', 'A conjured beacon that heals and rallies nearby allies the instant it is cast.'),
    tier: 2, role: 'support', tags: ['magic_origin', 'angelic'], ...SCOST(6),
    hp: 80, def: 2, res: 2,
    attacks: [{ id: 'radiance', name: L('빛의 발산', 'Radiance'), type: 'ranged', damage: 6, channel: 'spirit', range: 2, ap: 1, repeat: 1, accuracy: 90, strikes: 1, effects: [], props: ['magic'] }],
    abilities: [], passives: ['inspiring_presence'],
    source: { type: 'tome', id: 'tome_beacon' },
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'holy', size: 'medium', glow: '#f1d98a' },
  });
  U({
    id: 'oc_blessed_soul', name: L('축복받은 영혼', 'Blessed Soul'), desc: L('아군을 결집시키고 적을 단죄하는 방패 유닛.', 'A Shield unit that rallies allies and condemns the enemy.'),
    tier: 3, role: 'shield', tags: ['magic_origin', 'angelic'], ...SCOST(12),
    hp: 100, def: 7, res: 3,
    attacks: [{ id: 'strike', name: L('신성한 타격', 'Holy Strike'), type: 'melee', damage: 16, channel: 'spirit', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [{ status: 'condemned', chance: 40 }], props: [] }],
    abilities: ['rally', 'defend'], passives: ['shield_wall'],
    source: { type: 'tome', id: 'tome_beacon' },
    look: { body: 'form', armor: 'heavy_plate', weapon: 'sword_shield', helm: 'full', cape: 'long', shield: 'tower', element: 'holy', size: 'medium', glow: '#f1d98a' },
  });
  U({
    id: 'oc_chaplain', name: L('사제', 'Chaplain'), desc: L('아군을 북돋는 신실한 지원 유닛.', 'A Faithful Support unit that bolsters allies.'),
    tier: 3, role: 'support', tags: ['infantry'], ...UCOST[3],
    hp: 80, def: 2, res: 4, statusRes: { spirit: 5 },
    attacks: [{ id: 'spirit_blast', name: L('영혼 작렬', 'Spirit Blast'), type: 'ranged', damage: 14, channel: 'spirit', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['bless', 'holy_light_heal', 'defend'], passives: [],
    source: { type: 'tome', id: 'tome_beacon' },
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'short', shield: 'none', element: 'holy', size: 'medium', glow: '#f1d98a' },
  });
  SP({
    id: 'sp_conjure_divine_beacon', name: L('신성한 봉화 강림', 'Conjure Divine Beacon'), tier: 2, affinity: { order: 2 }, kind: 'combat',
    desc: L('신성한 봉화를 소환합니다. 시전 시와 매 턴 시작 시 주변 2칸의 아군이 임시 체력 15를 얻고 사기가 5 오릅니다. 3턴간 지속.', 'Summons a Divine Beacon. On cast and at the start of each turn, allies within 2 hexes gain +15 temporary HP and +5 Morale. Lasts 3 turns.'),
    cost: { mana: 30, cp: 25 }, target: 'hex', range: 4, effect: { type: 'summon', unit: 'oc_divine_beacon', count: 1, temporary: true, duration: 3 },
  });
  SP({
    id: 'sp_covenant_of_the_faith', name: L('신앙의 서약', 'Covenant of the Faith'), tier: 2, affinity: { order: 2 }, kind: 'city_enchant',
    desc: L('대상 봉신 도시가 매 턴 마나 15를 바치고, 그 도시에서 소집한 유닛은 신실함을 얻습니다.', 'The target vassal city grants +15 Mana per turn, and units levied from it gain Faithful.'),
    cost: { mana: 60, cp: 60 }, upkeep: { mana: 0 }, target: 'city', enchant: { effects: { mana: 15, upkeepPct: -5 } },
  });
  SP({
    id: 'sp_summon_blessed_soul', name: L('축복받은 영혼 소환', 'Summon Blessed Soul'), tier: 2, affinity: { order: 2 }, kind: 'summon',
    desc: L('대상 칸에 축복받은 영혼 방패 유닛을 소환합니다.', 'Summons a Blessed Soul shield unit onto the target hex.'),
    cost: { mana: 150, cp: 150 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_blessed_soul', count: 1 },
  });
  SP({
    id: 'sp_mighty_meek', name: L('미약한 자의 위엄', 'Mighty Meek'), tier: 2, affinity: { order: 2 }, kind: 'unit_enchant',
    desc: L('1·2등급 유닛에게 신실함(유지비 감소)과 상태이상 저항 +2, 등급당 영혼 피해 추가를 부여합니다.', 'Tier I and II units gain Faithful (reduced upkeep), +2 Status Resistance and bonus Spirit damage per unit tier.'),
    cost: { mana: 100, cp: 100 }, upkeep: { mana: 6 },
    enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher', 'support', 'mage'], effects: { upkeepPct: -10, statusRes: 2, channelDmg_spirit: 1 } },
  });
  TM({
    id: 'tome_beacon', name: L('봉화의 서', 'Tome of the Beacon'), tier: 2, affinity: { order: 2 }, expansion: null, icon: 'tome_order_2',
    desc: L('신실한 자의 내면에 깃든 빛을 이끌어내 적을 벌하고 아군을 북돋습니다.', "Brings out the inner radiance of the Faithful to smite enemies and bolster allies."),
    passive: { desc: L('전투 시작 시 신실함을 지닌 아군의 사기가 소폭 오릅니다.', 'Units with Faithful gain a small Morale bonus at the start of battle.'), effects: { morale: 3 } },
    contents: [
      { type: 'spell', id: 'sp_conjure_divine_beacon', cost: kc(2, false) },
      { type: 'spell', id: 'sp_covenant_of_the_faith', cost: kc(2, false) },
      { type: 'spell', id: 'sp_summon_blessed_soul', cost: kc(2, false) },
      { type: 'unit', id: 'oc_chaplain', cost: kc(2, true) },
      { type: 'spell', id: 'sp_mighty_meek', cost: kc(2, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Inquisition (T2, +2 Order)
  U({
    id: 'oc_lightbringer', name: L('빛의 인도자', 'Lightbringer'), desc: L('적을 개종시킬 수 있는 전투 마법사 유닛.', 'A Battle Mage unit that can convert enemies to your cause.'),
    tier: 2, role: 'mage', tags: ['magic_origin'], ...SCOST(8),
    hp: 55, def: 0, res: 2,
    attacks: [{ id: 'holy_bolt2', name: L('심판의 빛', 'Judging Light'), type: 'ranged', damage: 14, channel: 'spirit', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'condemned', chance: 40 }], props: ['magic'] }],
    abilities: ['mark_target'], passives: [],
    source: { type: 'tome', id: 'tome_inquisition' },
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'short', shield: 'none', element: 'holy', size: 'medium', glow: '#f1d98a' },
  });
  U({
    id: 'oc_inquisitor', name: L('심문관', 'Inquisitor'), desc: L('단죄와 기절을 새기는 공격적인 척후병 유닛.', 'An aggressive Skirmisher that inflicts Condemned and Stunned.'),
    tier: 3, role: 'skirmisher', tags: ['infantry'], ...UCOST[3],
    hp: 95, def: 4, res: 2, statusRes: { spirit: 3 },
    attacks: [
      { id: 'strike', name: L('검격', 'Melee Strike'), type: 'melee', damage: 16, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: [] },
      { id: 'bolt_of_judgment', name: L('심판의 화살', 'Bolt of Judgment'), type: 'ranged', damage: 14, channel: 'spirit', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'condemned', chance: 60 }, { status: 'stunned', chance: 20 }], props: ['magic'] },
    ],
    abilities: ['defend'], passives: ['slippery', 'swift', 'true_sight'],
    source: { type: 'tome', id: 'tome_inquisition' },
    look: { body: 'form', armor: 'leather', weapon: 'crossbow', helm: 'hood', cape: 'short', shield: 'none', element: 'holy', size: 'medium', glow: '#f1d98a' },
  });
  SP({
    id: 'sp_summon_lightbringer', name: L('빛의 인도자 소환', 'Summon Lightbringer'), tier: 2, affinity: { order: 2 }, kind: 'summon',
    desc: L('대상 칸에 빛의 인도자를 소환합니다.', 'Summons a Lightbringer onto the target hex.'),
    cost: { mana: 100, cp: 100 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_lightbringer', count: 1 },
  });
  SP({
    id: 'sp_burden_of_guilt', name: L('죄의 짐', 'Burden of Guilt'), tier: 2, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 적 부대에게 영혼 피해 20을 주고 세계 지도 이동력을 50% 잃게 합니다.', 'Deals 20 Spirit damage to the target enemy army and halves its Move Points on the world map.'),
    cost: { mana: 80, cp: 80 }, target: 'army', range: 0, effect: { type: 'damage', channel: 'spirit', amount: 20, status: { id: 'slowed', chance: 100, duration: 1 } },
  });
  SP({
    id: 'sp_mass_condemnation', name: L('대량 단죄', 'Mass Condemnation'), tier: 2, affinity: { order: 2 }, kind: 'combat',
    desc: L('주변 1칸의 적들에게 영혼 피해 10을 주고 전투가 끝날 때까지 단죄시킵니다.', 'Deals 10 Spirit damage to enemies within 1 hex and inflicts Condemned on them until the end of battle.'),
    cost: { mana: 15, cp: 20 }, target: 'hex', range: 4, area: 1, effect: { type: 'damage', channel: 'spirit', amount: 10, area: 1, status: { id: 'condemned', chance: 100, duration: 0 } },
  });
  SP({
    id: 'sp_inquisitors_mark', name: L('심문관의 표식', 'Inquisitor\'s Mark'), tier: 2, affinity: { order: 2 }, kind: 'unit_enchant',
    desc: L('원거리·척후병 유닛의 공격이 60% 확률로 단죄와 약화를 함께 새깁니다.', "Ranged and Skirmisher units' attacks have a 60% chance to inflict both Condemned and Weakened."),
    cost: { mana: 90, cp: 90 }, upkeep: { mana: 9 },
    enchant: { appliesTo: ['ranged', 'skirmisher'], effects: {}, attackStatus: { id: 'condemned', chance: 60 } },
  });
  IMP({
    id: 'imp_tithe_collector', name: L('십일조 징수인', 'Tithe Collector'), desc: L('금을 생산하며 인접한 농장이나 벌목장마다 금이 추가됩니다.', 'Generates Gold, with more per adjacent Farm or Forester.'),
    kind: 'special', tome: 'tome_inquisition', cost: { gold: 100, production: 250 }, yields: { gold: 10 }, adjacencyBonus: { farm: 2 },
  });
  TM({
    id: 'tome_inquisition', name: L('심문의 서', 'Tome of the Inquisition'), tier: 2, affinity: { order: 2 }, expansion: null, icon: 'tome_order_2',
    desc: L('제국의 권위에 따르지 않는 자들을 사냥합니다. 적에게 단죄를 새기고 이동을 제약합니다.', 'Hunt down those who do not agree with your authority. Inflict Condemned on enemies and restrict their movement.'),
    passive: { desc: L('단죄 상태의 적에게 아군 공격이 소폭 더 아프게 들어갑니다.', 'Allied attacks deal slightly more damage against Condemned enemies.'), effects: { dmgPct: 3 } },
    contents: [
      { type: 'spell', id: 'sp_summon_lightbringer', cost: kc(2, false) },
      { type: 'spell', id: 'sp_burden_of_guilt', cost: kc(2, false) },
      { type: 'unit', id: 'oc_inquisitor', cost: kc(2, true) },
      { type: 'spell', id: 'sp_mass_condemnation', cost: kc(2, false) },
      { type: 'spell', id: 'sp_inquisitors_mark', cost: kc(2, false) },
      { type: 'improvement', id: 'imp_tithe_collector', cost: kc(2, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Sanctuary (T3, +2 Order)
  U({
    id: 'oc_light_spirit', name: L('빛의 정령', 'Light Spirit'), desc: L('강력한 치유 능력을 지닌 지원 유닛.', 'A Support unit with strong healing capabilities.'),
    tier: 3, role: 'support', tags: ['magic_origin', 'spirit', 'angelic', 'flying'], move: 'fly', mp: 44, ...SCOST(10),
    hp: 80, def: 2, res: 4,
    attacks: [{ id: 'light_touch', name: L('빛의 손길', 'Light Touch'), type: 'ranged', damage: 12, channel: 'spirit', range: 3, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['mass_heal', 'cleanse'], passives: ['flying'],
    source: { type: 'tome', id: 'tome_sanctuary' },
    look: { body: 'spirit', armor: 'robe', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'holy', size: 'medium', glow: '#fff0b8' },
  });
  SP({
    id: 'sp_consecrated_domain', name: L('축성된 영역', 'Consecrated Domain'), tier: 3, affinity: { order: 2 }, kind: 'city_enchant',
    desc: L('대상 아군 도시 영역의 유닛들은 저항력 +2를 얻고 전투 시작 시 사기 +20을 얻습니다.', "Friendly units in the target city's domain gain +2 Resistance and +20 Morale at the start of battle."),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 }, target: 'city', enchant: { effects: { res: 2, morale: 20 } },
  });
  SP({
    id: 'sp_summon_light_spirit', name: L('빛의 정령 소환', 'Summon Light Spirit'), tier: 3, affinity: { order: 2 }, kind: 'summon',
    desc: L('대상 칸에 강력한 치유의 빛의 정령을 소환합니다.', 'Summons a Light Spirit with strong healing power onto the target hex.'),
    cost: { mana: 150, cp: 150 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_light_spirit', count: 1 },
  });
  SP({
    id: 'sp_keepers_mark', name: L('수호자의 인장', 'Keeper\'s Mark'), tier: 3, affinity: { order: 2 }, kind: 'unit_enchant',
    desc: L('처음으로 치명상을 입을 때 1턴간 불굴과 평정 상태가 되어 죽음을 피합니다.', "The first time it would take fatal damage, the unit gains Steadfast and Pacified for 1 turn instead of dying."),
    cost: { mana: 100, cp: 100 }, upkeep: { mana: 10 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher', 'mage'], effects: { upkeepPct: -10 } },
  });
  SP({
    id: 'sp_salvation', name: L('구원', 'Salvation'), tier: 3, affinity: { order: 2 }, kind: 'combat',
    desc: L('대상 아군의 모든 체력을 임시 체력으로 회복시키고 약화 효과를 모두 없애며 저항 강화 3중첩을 부여합니다.', "Restores the target ally's full Hit Points as temporary HP, removes all its debuffs, and grants 3 stacks of Bolstered Resistance."),
    cost: { mana: 80, cp: 35 }, target: 'ally_unit', range: 3, effect: { type: 'heal', amount: 999, cleanse: true, status: { id: 'warded', chance: 100, duration: 3 } },
  });
  TR({
    id: 'tr_anointed_people', name: L('축성받은 백성', 'Anointed People'), desc: L('대상 종족에게 신의 가호를 내려 상태이상 저항 +3, 영혼 보호 +3을 부여합니다.', 'Grants the target race divine protection: +3 Status Resistance and +3 Spirit protection.'),
    kind: 'minor', tome: 'tome_sanctuary', effects: { statusRes: 3, statusRes_spirit: 3 },
  });
  IMP({
    id: 'imp_conduit_sanctuary', name: L('안식처', 'Sanctuary'), desc: L('마나를 생산하며, 이 영역의 지방 개선물을 약탈하는 데 시간이 더 걸리고 얻는 자원이 줄어듭니다.', 'Generates Mana; pillaging improvements in this domain takes longer and yields fewer resources.'),
    kind: 'special', tome: 'tome_sanctuary', cost: { gold: 170, production: 450 }, yields: { mana: 15 },
  });
  TM({
    id: 'tome_sanctuary', name: L('성역의 서', 'Tome of Sanctuary'), tier: 3, affinity: { order: 2 }, expansion: null, icon: 'tome_order_3',
    desc: L('모든 신도를 위한 안식처를 만듭니다. 치유와 방어 강화에 특화합니다.', 'Create a safe haven for all believers. Specialize in healing and buffing defenses.'),
    passive: { desc: L('제국 도시 영역 안에서 아군 유닛의 저항력이 소폭 오릅니다.', 'Friendly units gain a small Resistance bonus while inside your own domains.'), effects: { res: 1 } },
    contents: [
      { type: 'transformation', id: 'tr_anointed_people', cost: kc(3, false) },
      { type: 'spell', id: 'sp_consecrated_domain', cost: kc(3, false) },
      { type: 'improvement', id: 'imp_conduit_sanctuary', cost: kc(3, false) },
      { type: 'spell', id: 'sp_keepers_mark', cost: kc(3, false) },
      { type: 'spell', id: 'sp_summon_light_spirit', cost: kc(3, false) },
      { type: 'spell', id: 'sp_salvation', cost: kc(3, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Subjugation (T3, +2 Order)
  U({
    id: 'oc_subjugator', name: L('압제자', 'Subjugator', ), desc: L('사기를 짓밟는 것에 특화한 중형 돌격 유닛.', 'A heavy Shock unit that specializes in lowering enemy Morale.'),
    tier: 4, role: 'shock', tags: ['infantry'], ...UCOST[4],
    hp: 120, def: 5, res: 3, statusRes: { spirit: 7 },
    attacks: [{ id: 'demoralizing_charge', name: L('사기 저하의 돌격', 'Demoralizing Charge Strike'), type: 'melee', damage: 22, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [{ status: 'demoralized', chance: 60 }], props: ['charge'] }],
    abilities: ['ab_subjugator_oppress', 'defend'], passives: ['cavalry_charge'],
    source: { type: 'tome', id: 'tome_subjugation' },
    look: { body: 'form', armor: 'heavy_plate', weapon: 'great_sword', helm: 'horned', cape: 'long', shield: 'none', element: 'holy', size: 'large', glow: '#8a6a1c' },
  });
  AACT('ab_subjugator_oppress', '억압', 'Oppress', '대상 적 하나의 사기를 15 낮추고 표식을 남깁니다.', 'Lowers the target enemy\'s Morale by 15 and Marks it.',
    { range: 4, target: 'enemy', cooldown: 2, icon: 'roar', effect: { type: 'status', status: 'demoralized', duration: 3, chance: 100 } });
  SP({
    id: 'sp_final_ultimatum', name: L('최후통첩', 'Final Ultimatum'), tier: 3, affinity: { order: 2 }, kind: 'combat',
    desc: L('패주 중인 비영웅 적 유닛을 90% 확률로 영구히 정신 지배합니다. 실패하면 대신 처치합니다.', 'A Routing non-Hero enemy has a base 90% chance of being permanently mind-controlled; on failure it dies instead.'),
    cost: { mana: 45, cp: 30 }, target: 'enemy_unit', range: 3, effect: { type: 'status', status: 'charmed', duration: 0, chance: 90 },
  });
  SP({
    id: 'sp_intimidating_aura', name: L('위압의 기운', 'Intimidating Aura'), tier: 3, affinity: { order: 2 }, kind: 'unit_enchant',
    desc: L('인접한 적의 사기를 깎는 위압의 기운을 부여합니다.', 'Grants Intimidating Aura, reducing the Morale of nearby enemies.'),
    cost: { mana: 70, cp: 70 }, upkeep: { mana: 7 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: {}, attackStatus: { id: 'demoralized', chance: 20 } },
  });
  SP({
    id: 'sp_oppressive_march', name: L('압제의 행군', 'Oppressive March'), tier: 3, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 적 부대의 사기를 낮추고 2턴 동안 사기 저하 상태로 만듭니다.', "Lowers the target enemy army's Morale and inflicts Demoralized for 2 turns."),
    cost: { mana: 60, cp: 60 }, target: 'army', range: 0, effect: { type: 'status', status: 'demoralized', duration: 2, chance: 100 },
  });
  TR({
    id: 'tr_yoke_of_subjugation', name: L('예속의 굴레', 'Yoke of Subjugation'), desc: L('정복한 도시를 더 잘 다스리는 종족으로 만듭니다: 다른 종족 도시에서 안정도 +10, 반란 확률 감소.', 'Makes the race better rulers of conquered cities: +10 City Stability in cities of another race and reduced rebellion chance.'),
    kind: 'minor', tome: 'tome_subjugation', effects: { stability: 10 },
  });
  TM({
    id: 'tome_subjugation', name: L('예속의 서', 'Tome of Subjugation'), tier: 3, affinity: { order: 2 }, expansion: null, icon: 'tome_order_3',
    desc: L('다른 종족의 도시를 확장하고 예속시킵니다. 적의 사기를 낮추고 도시를 정복하는 데 특화합니다.', 'Expand and subjugate cities from other races. Specialize in lowering enemy Morale and conquering cities.'),
    passive: { desc: L('다른 종족의 도시를 정복했을 때 안정도 페널티가 줄어듭니다.', 'Reduces the stability penalty when conquering cities of another race.'), effects: { stability: 3 } },
    contents: [
      { type: 'spell', id: 'sp_final_ultimatum', cost: kc(3, false) },
      { type: 'unit', id: 'oc_subjugator', cost: kc(3, true) },
      { type: 'spell', id: 'sp_intimidating_aura', cost: kc(3, false) },
      { type: 'spell', id: 'sp_oppressive_march', cost: kc(3, false) },
      { type: 'transformation', id: 'tr_yoke_of_subjugation', cost: kc(3, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Exaltation (T4, +2 Order)
  U({
    id: 'oc_shrine_of_smiting', name: L('강타의 성소', 'Shrine of Smiting'), desc: L('전장의 신실한 유닛 수에 비례해 강해지는 신화 유닛.', 'A Mythic unit whose power scales with the number of Faithful units on the battlefield.'),
    tier: 5, role: 'mage', tags: ['magic_origin', 'mythic', 'angelic'], ...UCOST[5],
    hp: 140, def: 5, res: 7, statusRes: { spirit: 11 },
    attacks: [{ id: 'smiting_blast', name: L('강타의 기도', 'Smiting Prayer Blast'), type: 'ranged', damage: 24, channel: 'spirit', range: 4, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [{ status: 'condemned', chance: 60 }], props: ['magic'] }],
    abilities: ['ab_shrine_divine_vengeance', 'defend'], passives: ['control_immunity', 'fearless', 'heartless', 'inspiring_presence'],
    source: { type: 'tome', id: 'tome_exaltation' },
    look: { body: 'angel', armor: 'ceremonial', weapon: 'orb', helm: 'crown', cape: 'long', shield: 'none', element: 'holy', size: 'huge', glow: '#fff0b8' },
  });
  AACT('ab_shrine_divine_vengeance', '신성한 응징', 'Divine Vengeance', '아군이 쓰러질 때마다 다음 공격의 피해가 증가합니다.', "Each time an ally falls, this unit's next attack deals bonus damage.",
    { ap: 0, range: 0, target: 'self', cooldown: 0, icon: 'holy', effect: { type: 'buff', stat: 'dmgPct', value: 20, duration: 1 } });
  SP({
    id: 'sp_ascended_warriors', name: L('승천한 전사들', 'Ascended Warriors'), tier: 4, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 아군 부대의 비영웅 유닛이 계급을 1 올립니다(전설 계급 초과 불가).', 'Non-Hero units in the target army gain 1 Rank (cannot exceed Legendary).'),
    cost: { mana: 240, cp: 240 }, target: 'army', range: 0, effect: { type: 'special', id: 'rank_up', amount: 1 },
  });
  SP({
    id: 'sp_resurrect_unit', name: L('유닛 부활', 'Resurrect Unit'), tier: 4, affinity: { order: 2 }, kind: 'combat',
    desc: L('전투에서 쓰러진 대상 아군 유닛을 임시 체력 가득 채워 되살립니다.', 'Returns the target fallen friendly unit to full temporary Hit Points.'),
    cost: { mana: 100, cp: 40 }, target: 'ally_unit', range: 3, effect: { type: 'resurrect', hpPct: 100 },
  });
  SP({
    id: 'sp_temple_of_the_exalted', name: L('숭고한 자의 신전', 'Temple of the Exalted'), tier: 4, affinity: { order: 2 }, kind: 'city_enchant',
    desc: L('대상 도시의 마나와 안정도 수입이 각각 30 증가합니다.', "The target city's Mana and Stability income each increase by 30."),
    cost: { mana: 130, cp: 130 }, upkeep: { mana: 0 }, target: 'city', enchant: { effects: { mana: 30, stability: 30 } },
  });
  SP({
    id: 'sp_light_of_ascension', name: L('승천의 빛', 'Light of Ascension'), tier: 4, affinity: { order: 2 }, kind: 'combat',
    desc: L('주변 2칸의 아군이 체력 25를 회복하고 각성합니다.', 'Allies within 2 hexes heal 25 HP and become Awakened.'),
    cost: { mana: 100, cp: 40 }, target: 'ally_unit', range: 0, area: 2, effect: { type: 'heal', amount: 25, status: { id: 'awakened', chance: 100, duration: 0 } },
  });
  TR({
    id: 'tr_angelic_transformation', name: L('천사화', 'Angelic Transformation'), desc: L('대상 종족을 천사 같은 존재로 바꿉니다: 비행 이동, 신실함(유지비 감소), 전투 대형 인원 감소.', 'Turns the target race into angelic beings: Flying movement, Faithful (reduced upkeep), and fewer units per formation.'),
    kind: 'major', tome: 'tome_exaltation', effects: { upkeepPct: -15 }, look: { glow: '#fff0b8', wings: true },
  });
  TM({
    id: 'tome_exaltation', name: L('승격의 서', 'Tome of Exaltation'), tier: 4, affinity: { order: 2 }, expansion: null, icon: 'tome_order_4',
    desc: L('백성을 천상의 존재로 바꾸어 그 신앙으로 적을 벌합니다.', 'Convert your people to Celestials and use their faith to smite your enemies.'),
    passive: { desc: L('군주가 무저갱에 있어도 주문을 시전할 수 있으며, 군주 부활이 1턴 빨라집니다.', "Spells may be cast even while the ruler is in the Void, and the ruler's respawn is 1 turn faster."), effects: {} },
    contents: [
      { type: 'transformation', id: 'tr_angelic_transformation', cost: kc(4, false) },
      { type: 'spell', id: 'sp_ascended_warriors', cost: kc(4, false) },
      { type: 'spell', id: 'sp_resurrect_unit', cost: kc(4, false) },
      { type: 'unit', id: 'oc_shrine_of_smiting', cost: kc(4, true) },
      { type: 'spell', id: 'sp_temple_of_the_exalted', cost: kc(4, false) },
      { type: 'spell', id: 'sp_light_of_ascension', cost: kc(4, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Supremacy (T4, +2 Order)
  U({
    id: 'oc_exemplar', name: L('모범자', 'Exemplar'), desc: L('아군의 사기를 크게 북돋는 비행 방패 유닛.', 'A flying Shield unit that excels at raising the Morale of your troops.'),
    tier: 4, role: 'shield', tags: ['infantry', 'flying'], move: 'fly', mp: 44, ...UCOST[4],
    hp: 120, def: 8, res: 3, statusRes: { spirit: 7 },
    attacks: [{ id: 'strike', name: L('검격', 'Melee Strike'), type: 'melee', damage: 20, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 90, strikes: 1, effects: [], props: [] }],
    abilities: ['inspire_morale', 'defend'], passives: ['flying', 'inspiring_presence', 'shield_wall'],
    source: { type: 'tome', id: 'tome_supremacy' },
    look: { body: 'angel', armor: 'heavy_plate', weapon: 'sword_shield', helm: 'crown', cape: 'long', shield: 'tower', element: 'holy', size: 'large', glow: '#f1d98a' },
  });
  SP({
    id: 'sp_condemn_army', name: L('부대 단죄', 'Condemn Army'), tier: 4, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 적 부대에게 영혼 피해 20을 주고 5턴 동안 단죄시킵니다.', 'Deals 20 Spirit damage to the target enemy army and inflicts Condemned for 5 world turns.'),
    cost: { mana: 80, cp: 80 }, target: 'army', range: 0, effect: { type: 'damage', channel: 'spirit', amount: 20, status: { id: 'condemned', chance: 100, duration: 5 } },
  });
  SP({
    id: 'sp_anthem_of_victory', name: L('승리의 찬가', 'Anthem of Victory'), tier: 4, affinity: { order: 2 }, kind: 'combat',
    desc: L('모든 아군 유닛이 강화 3중첩과 사기 +15를 얻습니다.', 'All allied units gain 3 stacks of Strengthened and +15 Morale.'),
    cost: { mana: 150, cp: 50 }, target: 'ally_unit', range: 0, area: 5, effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100, area: 5 },
  });
  SP({
    id: 'sp_supreme_magic', name: L('지고의 마법', 'Supreme Magic'), tier: 4, affinity: { order: 2 }, kind: 'unit_enchant',
    desc: L('지원·전투 마법사 유닛에게 열의를 부여하고, 처치 시 인접한 적에게 영혼 피해 20을 폭발시킵니다.', 'Grants Support and Battle Mage units Zeal, and killing a unit detonates 20 Spirit damage on adjacent enemies.'),
    cost: { mana: 160, cp: 160 }, upkeep: { mana: 16 },
    enchant: { appliesTo: ['support', 'mage'], effects: { channelDmg_spirit: 3 } },
  });
  IMP({
    id: 'imp_monument_of_supremacy', name: L('패권의 기념비', 'Monument of Supremacy'), desc: L('제국 내 패권의 기념비 하나당 도시 안정도가 5 오릅니다.', '+5 City Stability per Monument of Supremacy in the empire.'),
    kind: 'special', tome: 'tome_supremacy', cost: { gold: 170, production: 450 }, yields: { stability: 5 },
  });
  TM({
    id: 'tome_supremacy', name: L('패권의 서', 'Tome of Supremacy'), tier: 4, affinity: { order: 2 }, expansion: null, icon: 'tome_order_4',
    desc: L('백성을 영광스러운 승리로 이끕니다. 사기 증진과 거대한 제국 관리에 특화합니다.', 'Lead your people to glorious victory. Specialize in increasing Morale and managing a big empire.'),
    passive: { desc: L('제국 전역의 도시 안정도가 소폭 오릅니다.', 'City Stability is slightly higher empire-wide.'), effects: { stability: 3 } },
    contents: [
      { type: 'spell', id: 'sp_condemn_army', cost: kc(4, false) },
      { type: 'unit', id: 'oc_exemplar', cost: kc(4, true) },
      { type: 'improvement', id: 'imp_monument_of_supremacy', cost: kc(4, false) },
      { type: 'spell', id: 'sp_anthem_of_victory', cost: kc(4, false) },
      { type: 'spell', id: 'sp_supreme_magic', cost: kc(4, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Archon (T4, +2 Order)
  U({
    id: 'oc_archon_guardian', name: L('아르콘 수호자', 'Archon Guardian'), desc: L('군주의 부름으로 나타나는 천상의 수호자.', 'A celestial guardian conjured to fight at the ruler\'s side.'),
    tier: 3, role: 'shield', tags: ['magic_origin', 'angelic', 'flying'], move: 'fly', mp: 44, ...SCOST(0),
    hp: 95, def: 6, res: 4,
    attacks: [{ id: 'strike', name: L('빛의 검', 'Blade of Light'), type: 'melee', damage: 18, channel: 'spirit', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: [] }],
    abilities: ['defend'], passives: ['flying', 'guard'],
    source: { type: 'tome', id: 'tome_archon' },
    look: { body: 'angel', armor: 'ceremonial', weapon: 'sword_shield', helm: 'open', cape: 'short', shield: 'round', element: 'holy', size: 'medium', glow: '#fff0b8' },
  });
  U({
    id: 'oc_astra', name: L('아스트라', 'Astra'), desc: L('강력한 공격과 치유 능력을 지닌 천사 신화 유닛.', 'An Angel Mythic unit with strong attacks and healing abilities.'),
    tier: 5, role: 'mage', tags: ['magic_origin', 'mythic', 'angelic', 'flying'], move: 'fly', mp: 48, ...SCOST(20),
    hp: 150, def: 7, res: 6,
    attacks: [{ id: 'radiant_strike', name: L('광휘의 일격', 'Radiant Strike'), type: 'melee', damage: 26, channel: 'spirit', range: 1, ap: 1, repeat: 1, accuracy: 90, strikes: 1, effects: [{ status: 'condemned', chance: 50 }], props: [] }],
    abilities: ['mass_heal', 'defend'], passives: ['flying', 'inspiring_presence'],
    source: { type: 'tome', id: 'tome_archon' },
    look: { body: 'angel', armor: 'ceremonial', weapon: 'sword', helm: 'crown', cape: 'long', shield: 'none', element: 'holy', size: 'large', glow: '#fff0b8' },
  });
  SP({
    id: 'sp_ascended_rebirth', name: L('승천한 재생', 'Ascended Rebirth'), tier: 4, affinity: { order: 2 }, kind: 'combat',
    desc: L('전사한 비영웅·비천상 유닛을 전투가 끝날 때까지 비질로 되살리고, 주변 2칸의 아군을 체력 20 치유합니다.', "Revives a dead non-Hero, non-Celestial unit as a Vigil under your control for the rest of the battle, healing allies within 2 hexes for 20 HP."),
    cost: { mana: 100, cp: 40 }, target: 'hex', range: 3, effect: { type: 'summon', unit: 'oc_vigil', count: 1, temporary: true },
  });
  SP({
    id: 'sp_celestial_guardians', name: L('천상의 수호자들', 'Celestial Guardians'), tier: 4, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 부대의 지휘관은 1턴 동안 전투 시작 시 아르콘 수호자 두 명을 소환하는 능력을 얻습니다.', "The target army's leader gains, for 1 world turn, the ability to conjure two Archon Guardians at the start of any battle."),
    cost: { mana: 200, cp: 200 }, target: 'army', range: 0, effect: { type: 'summon', unit: 'oc_archon_guardian', count: 2 },
  });
  SP({
    id: 'sp_holy_aura', name: L('신성한 기운', 'Holy Aura'), tier: 4, affinity: { order: 2 }, kind: 'unit_enchant',
    desc: L('인접한 아군에게 상태이상 보호를, 인접한 적에게는 피해를 주는 신성한 기운을 부여합니다.', 'Grants Holy Aura, protecting nearby allies from status effects while damaging nearby enemies.'),
    cost: { mana: 140, cp: 140 }, upkeep: { mana: 14 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher', 'mage'], effects: { statusRes: 1 } },
  });
  SP({
    id: 'sp_summon_astra', name: L('아스트라 소환', 'Summon Astra'), tier: 4, affinity: { order: 2 }, kind: 'summon',
    desc: L('강력한 공격과 치유 능력을 지닌 천사 신화 유닛 아스트라를 소환합니다.', 'Summons Astra, an Angel Mythic unit with strong attacks and healing abilities.'),
    cost: { mana: 300, cp: 300 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_astra', count: 1 },
  });
  TR({
    id: 'tr_pure_soul', name: L('순수한 영혼', 'Pure Soul'), desc: L('대상 종족의 영혼을 정화합니다: 매 턴 시작 시 약화 효과 하나를 해제합니다(양성 대응 효과가 있으면 그것을 대신 얻습니다).', 'Purifies the target race: at the start of each turn, dispel one debuff (gaining its positive counter if it has one).'),
    kind: 'minor', tome: 'tome_archon', effects: {},
  });
  IMP({
    id: 'imp_archon_gate', name: L('아르콘의 문', 'Archon Gate'), desc: L('도시 안정도를 올리고 유닛 배치 지점이 되며, 타이탄 유닛 소집을 가능하게 하고 순간이동로로도 기능합니다.', 'Raises City Stability, serves as a unit deployment point, unlocks drafting Titans, and functions as a teleporter.'),
    kind: 'special', tome: 'tome_archon', cost: { gold: 170, production: 450 }, yields: { stability: 20 },
  });
  TM({
    id: 'tome_archon', name: L('아르콘의 서', 'Tome of the Archon'), tier: 4, affinity: { order: 2 }, expansion: 'archon_prophecy', icon: 'tome_order_4',
    desc: L('천상의 동맹을 소환하고 아군을 아르콘의 반열로 승격시킵니다.', 'Summon Celestial allies and ascend your units to the ranks of the Archons.'),
    passive: { desc: L('아군 천상 유닛의 사기가 소폭 오릅니다.', 'Friendly angelic units gain a small Morale bonus.'), effects: { morale: 3 } },
    contents: [
      { type: 'spell', id: 'sp_ascended_rebirth', cost: kc(4, false) },
      { type: 'spell', id: 'sp_celestial_guardians', cost: kc(4, false) },
      { type: 'spell', id: 'sp_holy_aura', cost: kc(4, false) },
      { type: 'transformation', id: 'tr_pure_soul', cost: kc(4, false) },
      { type: 'spell', id: 'sp_summon_astra', cost: kc(4, false) },
      { type: 'improvement', id: 'imp_archon_gate', cost: kc(4, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the God Emperor (T5, +2 Order, capstone)
  SP({
    id: 'sp_divine_protection', name: L('신성한 가호', 'Divine Protection'), tier: 5, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 아군 부대의 유닛들이 1턴 동안 재기 상태를 얻습니다.', 'Units in the target friendly army gain Resurgence for 1 turn.'),
    cost: { mana: 200, cp: 200 }, target: 'army', range: 0, effect: { type: 'status', status: 'strengthened', duration: 1, chance: 100 },
  });
  SP({
    id: 'sp_exalted_champion', name: L('숭고한 용사', 'Exalted Champion'), tier: 5, affinity: { order: 2 }, kind: 'combat',
    desc: L('3턴 동안 대상 아군의 피해가 100% 증가하고 방어 강화·저항 강화·상태이상 보호를 각 5씩 얻습니다.', 'For 3 turns the target ally deals +100% damage and gains +5 Bolstered Defense, +5 Bolstered Resistance and +5 Status Protection.'),
    cost: { mana: 150, cp: 50 }, target: 'ally_unit', range: 3, effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100 },
  });
  SP({
    id: 'sp_wrath_of_the_emperor', name: L('황제의 분노', 'Wrath of the Emperor'), tier: 5, affinity: { order: 2 }, kind: 'strategic',
    desc: L('대상 적 부대에게 영혼 피해 20을 주고 1턴간 사기 저하와 단죄를 입힙니다. 적 영토에서 시전하면 피해가 50% 늘어납니다.', "Deals 20 Spirit damage to the target enemy army and inflicts Demoralized and Condemned for 1 turn; +50% damage if cast in enemy territory."),
    cost: { mana: 120, cp: 120 }, target: 'army', range: 0, effect: { type: 'damage', channel: 'spirit', amount: 20, status: { id: 'condemned', chance: 100, duration: 1 } },
  });
  SP({
    id: 'sp_mass_revive', name: L('대량 소생', 'Mass Revive'), tier: 5, affinity: { order: 2 }, kind: 'combat',
    desc: L('신실함이나 열의를 지닌 모든 전사한 아군을 체력 50%로 되살립니다.', 'Returns every dead friendly unit with Faithful or Zeal to life at 50% Hit Points.'),
    cost: { mana: 200, cp: 65 }, target: 'ally_unit', range: 0, area: 5, effect: { type: 'resurrect', hpPct: 50, area: 5 },
  });
  SP({
    id: 'sp_ascension_of_the_faithful', name: L('신실한 자의 승천', 'Ascension of the Faithful'), tier: 5, affinity: { order: 2 }, kind: 'empire',
    desc: L('제국 전역의 상태이상 저항과 도시 안정도가 크게 오릅니다.', 'Empire-wide Status Resistance and City Stability rise substantially.'),
    cost: { mana: 0, cp: 0 }, target: 'empire', effects: { statusRes: 3, stability: 10 },
  });
  TM({
    id: 'tome_god_emperor', name: L('신성 황제의 서', 'Tome of the God Emperor'), tier: 5, affinity: { order: 2 }, expansion: null, icon: 'tome_order_5',
    desc: L('숭배받는 신이 되십시오. 당신의 존재만으로 병사와 도시가 고무됩니다. 아군 강화에 특화합니다.', 'Become a god to be worshiped. Your mere presence inspires your troops and your cities. Specialize in buffing your units.'),
    passive: { desc: L('군주가 이끄는 부대의 모든 유닛이 충성의 수호 상태를 얻습니다.', "Every unit in the ruler's army gains Loyal Guard."), effects: { morale: 5, def: 1, res: 1 } },
    contents: [
      { type: 'spell', id: 'sp_divine_protection', cost: kc(5, false) },
      { type: 'spell', id: 'sp_exalted_champion', cost: kc(5, false) },
      { type: 'spell', id: 'sp_wrath_of_the_emperor', cost: kc(5, false) },
      { type: 'spell', id: 'sp_mass_revive', cost: kc(5, false) },
      { type: 'spell', id: 'sp_ascension_of_the_faithful', cost: kc(5, false) },
    ],
  });

  // ================================================================================================
  // CHAOS TOMES
  // ================================================================================================

  // ---------------------------------------------------------------- Tome of Pyromancy (T1, +2 Chaos)
  U({
    id: 'oc_lesser_magma_spirit', name: L('용암의 하급 정령', 'Lesser Magma Spirit'), desc: L('불타는 마력탄을 날리는 하급 정령.', 'A lesser elemental spirit that hurls bolts of molten fire.'),
    tier: 1, role: 'mage', tags: ['magic_origin', 'elemental'], ...SCOST(4),
    hp: 50, def: 0, res: 2, statusRes: { fire: 3 },
    attacks: [{ id: 'fire_bolts', name: L('불꽃 화살', 'Fire Bolts'), type: 'ranged', damage: 10, channel: 'fire', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'burning', chance: 40 }], props: ['magic'] }],
    abilities: [], passives: ['immune_fire'],
    source: { type: 'tome', id: 'tome_pyromancy' },
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'small', glow: '#ff7a2a' },
  });
  U({
    id: 'oc_pyromancer', name: L('화염술사', 'Pyromancer'), desc: L('불을 퍼뜨리고 화상을 새기는 전투 마법사.', 'A Battle Mage that spreads fire and inflicts Burning.'),
    tier: 2, role: 'mage', tags: ['infantry'], ...UCOST[2],
    hp: 55, def: 0, res: 2,
    attacks: [
      { id: 'fire_bolts', name: L('불꽃 화살', 'Fire Bolts'), type: 'ranged', damage: 12, channel: 'fire', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'burning', chance: 60 }], props: ['magic'] },
      { id: 'flamestrike', name: L('불꽃 강타', 'Flamestrike'), type: 'ranged', damage: 20, channel: 'fire', range: 3, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'burning', chance: 90 }], props: ['magic'] },
    ],
    abilities: ['defend'], passives: ['immune_fire'],
    source: { type: 'tome', id: 'tome_pyromancy' },
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'short', shield: 'none', element: 'fire', size: 'medium', glow: '#ff7a2a' },
  });
  SP({
    id: 'sp_ignite', name: L('점화', 'Ignite'), tier: 1, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상 적 유닛에게 화염 피해 25를 주고 화상을 입히며 발밑의 땅을 불태웁니다.', 'Deals 25 Fire damage to the target enemy, inflicts Burning, and sets the ground On Fire.'),
    cost: { mana: 10, cp: 15 }, target: 'enemy_unit', range: 4, effect: { type: 'damage', channel: 'fire', amount: 25, status: { id: 'burning', chance: 90, duration: 3 } },
  });
  SP({
    id: 'sp_summon_lesser_magma_spirit', name: L('용암의 하급 정령 소환', 'Summon Lesser Magma Spirit'), tier: 1, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 칸에 용암의 하급 정령을 소환합니다.', 'Summons a Lesser Magma Spirit onto the target hex.'),
    cost: { mana: 60, cp: 60 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_lesser_magma_spirit', count: 1 },
  });
  SP({
    id: 'sp_fiery_imbuement', name: L('불의 주입', 'Fiery Imbuement'), tier: 1, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('원거리·지원·전투 마법사·척후병 유닛의 공격에 화염 피해가 추가되고 60% 확률로 화상을 입힙니다.', 'Ranged, Support, Battle Mage and Skirmisher attacks gain bonus Fire damage with a 60% chance to inflict Burning.'),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: { channelDmg_fire: 1 }, attackChannel: 'fire', attackStatus: { id: 'burning', chance: 60 } },
  });
  SP({
    id: 'sp_immolate', name: L('불사르기', 'Immolate'), tier: 1, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('주변 1칸의 적들에게 화염 피해 10을 주며, 이미 화상 상태인 적에게는 화염 피해 15가 추가로 들어갑니다.', 'Deals 10 Fire damage to enemies within 1 hex, plus 15 more to any that are already Burning.'),
    cost: { mana: 15, cp: 20 }, target: 'hex', range: 4, area: 1, effect: { type: 'damage', channel: 'fire', amount: 10, area: 1 },
  });
  SP({
    id: 'sp_searing_blades', name: L('불타는 칼날', 'Searing Blades'), tier: 1, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('방패병·장병기병·돌격병·전사 유닛의 공격에 화염 피해가 추가되고 화상 걸린 적에게 추가 피해를 줍니다.', 'Shield, Polearm, Shock and Fighter attacks gain bonus Fire damage, dealing extra damage to Burning targets.'),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter'], effects: { channelDmg_fire: 2 }, attackChannel: 'fire' },
  });
  IMP({
    id: 'imp_ritual_pyre', name: L('의식의 화톳불', 'Ritual Pyre'), desc: L('마나를 생산하며, 인접한 벌목장마다 마나가 추가되고 지옥 강아지 유닛 소집을 가능하게 합니다.', 'Generates Mana (more per adjacent Forester) and unlocks the drafting of Inferno Puppies.'),
    kind: 'special', tome: 'tome_pyromancy', cost: { gold: 60, production: 130 }, yields: { mana: 10 }, adjacencyBonus: { forester: 3 },
  });
  TM({
    id: 'tome_pyromancy', name: L('화염술의 서', 'Tome of Pyromancy'), tier: 1, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_1',
    desc: L('화상을 입히고 그 효과를 극대화하여 강력한 화염 피해에 특화합니다.', 'Specialize in high Fire damage by inflicting and exploiting Burning.'),
    passive: { desc: L('아군 유닛이 화염 피해에 대한 저항을 소폭 얻습니다.', 'Friendly units gain a small amount of Fire protection.'), effects: { statusRes_fire: 1 } },
    contents: [
      { type: 'spell', id: 'sp_ignite', cost: kc(1, false) },
      { type: 'spell', id: 'sp_summon_lesser_magma_spirit', cost: kc(1, false) },
      { type: 'spell', id: 'sp_fiery_imbuement', cost: kc(1, false) },
      { type: 'spell', id: 'sp_immolate', cost: kc(1, false) },
      { type: 'unit', id: 'oc_pyromancer', cost: kc(1, true) },
      { type: 'spell', id: 'sp_searing_blades', cost: kc(1, false) },
      { type: 'improvement', id: 'imp_ritual_pyre', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Horde (T1, +2 Chaos)
  U({
    id: 'oc_houndmaster', name: L('사냥개 조련사', 'Houndmaster'), desc: L('전쟁 사냥개를 풀어 적을 약화시키는 원거리 유닛.', 'A Ranged unit that unleashes a War Hound to debilitate enemies.'),
    tier: 2, role: 'ranged', tags: ['infantry'], ...UCOST[2],
    hp: 55, def: 1, res: 1,
    attacks: [{ id: 'weak_point_shot', name: L('급소 사격', 'Weak Point Shot'), type: 'ranged', damage: 14, channel: 'physical', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'weakened', chance: 40 }], props: [] }],
    abilities: ['ab_houndmaster_unleash', 'defend'], passives: [],
    source: { type: 'tome', id: 'tome_horde' },
    look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood', cape: false, shield: 'none', element: null, size: 'medium', tint: '#7a1e12' },
  });
  AACT('ab_houndmaster_unleash', '사냥개 풀어놓기', 'Unleash the Hounds', '인접한 빈 칸에 전쟁 사냥개를 소환합니다. 전투가 끝나면 사라집니다.', 'Summons a War Hound into an adjacent empty hex; it vanishes when the battle ends.',
    { ap: 3, range: 1, target: 'hex', cooldown: 4, icon: 'summon', effect: { type: 'summon', unit: 'oc_war_hound', count: 1, temporary: true } });
  U({
    id: 'oc_war_hound', name: L('전쟁 사냥개', 'War Hound'), desc: L('사냥개 조련사가 부리는 전쟁 사냥개.', "A War Hound loosed by the Houndmaster."),
    tier: 1, role: 'fighter', tags: ['animal'], mp: 48, ...SCOST(0),
    hp: 45, def: 1, res: 0,
    attacks: [{ id: 'bite', name: L('물어뜯기', 'Bite'), type: 'melee', damage: 12, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: [], passives: ['sprint'],
    source: { type: 'tome', id: 'tome_horde' },
    look: { body: 'beast_wolf', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'small' },
  });
  U({
    id: 'oc_irregular_militia', name: L('불규칙 민병대', 'Irregular Militia'), desc: L('무리의 서로 소집되는 값싼 임시 전사.', 'A cheap, hastily-armed fighter levied through the Tome of the Horde.'),
    tier: 1, role: 'fighter', tags: ['infantry'], ...SCOST(2),
    hp: 55, def: 1, res: 0,
    attacks: [{ id: 'strike', name: L('몽둥이질', 'Club Strike'), type: 'melee', damage: 11, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [], props: [] }],
    abilities: ['defend'], passives: [],
    source: { type: 'tome', id: 'tome_horde' },
    look: { body: 'form', armor: 'none', weapon: 'mace', helm: 'cap', cape: false, shield: 'round', element: null, size: 'medium' },
  });
  SP({
    id: 'sp_fury_of_the_horde', name: L('무리의 격노', 'Fury of the Horde'), tier: 1, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('주변 2칸의 1·2등급 아군이 강화 2중첩을 얻습니다.', 'Tier I and II friendly units within 2 hexes gain 2 stacks of Strengthened.'),
    cost: { mana: 10, cp: 15 }, target: 'ally_unit', range: 0, area: 2, effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100, area: 2 },
  });
  SP({
    id: 'sp_blaze_of_the_horde', name: L('무리의 화염', 'Blaze of the Horde'), tier: 1, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상 적 유닛에게 화염 피해 25를 주며, 인접한 아군 유닛 하나당 화염 피해 5가 추가됩니다.', "Deals 25 Fire damage to the target enemy, plus 5 more per adjacent friendly unit."),
    cost: { mana: 5, cp: 10 }, target: 'enemy_unit', range: 4, effect: { type: 'damage', channel: 'fire', amount: 25 },
  });
  SP({
    id: 'sp_summon_irregulars', name: L('불규칙 병력 소환', 'Summon Irregulars'), tier: 1, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 칸에 불규칙 민병대를 소환합니다.', 'Summons a unit of Irregular Militia onto the target hex.'),
    cost: { mana: 60, cp: 60 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_irregular_militia', count: 1 },
  });
  TR({
    id: 'tr_spawnkin', name: L('다산의 혈족', 'Spawnkin'), desc: L('대상 종족을 더 작고 수가 많게 만듭니다: 대형 인원 증가, 비영웅 피해 +20%, 영웅 회피 +10%. 거대 성장과 함께 쓸 수 없습니다.', 'Makes the target race smaller and more numerous: more units per formation, +20% damage for non-heroes, +10% Evasion for heroes. Incompatible with Supergrowth.'),
    kind: 'minor', tome: 'tome_horde', effects: { dmgPct: 20 },
  });
  IMP({
    id: 'imp_mob_camp', name: L('오합지졸 야영지', 'Mob Camp'), desc: L('식량과 징집력을 생산하고 유닛 배치 지점이 되며, 1등급 유닛 소집 비용이 20% 줄어듭니다.', 'Generates Food and Draft, serves as a unit deployment point, and reduces Tier I unit recruitment cost by 20%.'),
    kind: 'special', tome: 'tome_horde', cost: { gold: 60, production: 130 }, yields: { food: 7, draft: 7 },
  });
  TM({
    id: 'tome_horde', name: L('군세의 서', 'Tome of the Horde'), tier: 1, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_1',
    desc: L('가장 값싼 유닛을 거대하고 치명적인 군세로 바꿉니다. 하위 등급 유닛 소환과 강화에 특화합니다.', 'Turn your cheapest units into large, deadly armies. Specialize in summoning and buffing low tier units.'),
    passive: { desc: L('1등급 유닛의 유지비가 소폭 줄어듭니다.', 'Tier I units cost slightly less upkeep.'), effects: { upkeepPct: -3 } },
    contents: [
      { type: 'spell', id: 'sp_fury_of_the_horde', cost: kc(1, false) },
      { type: 'unit', id: 'oc_houndmaster', cost: kc(1, true) },
      { type: 'spell', id: 'sp_blaze_of_the_horde', cost: kc(1, false) },
      { type: 'transformation', id: 'tr_spawnkin', cost: kc(1, false) },
      { type: 'spell', id: 'sp_summon_irregulars', cost: kc(1, false) },
      { type: 'improvement', id: 'imp_mob_camp', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Gluttony (T1, +2 Chaos)
  U({
    id: 'oc_gluttonous_imp', name: L('탐식의 임프', 'Gluttonous Imp'), desc: L('필멸자의 정수를 먹어치우는 작은 악마.', 'A small fiend that feeds on mortal essences.'),
    tier: 1, role: 'fighter', tags: ['magic_origin', 'fiend', 'flying'], move: 'fly', mp: 44, ...SCOST(3),
    hp: 65, def: 2, res: 2,
    attacks: [{ id: 'bite', name: L('탐욕스러운 물어뜯기', 'Gluttonous Bite'), type: 'melee', damage: 13, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: [] }],
    abilities: [], passives: ['life_steal'],
    source: { type: 'tome', id: 'tome_gluttony' },
    look: { body: 'demon', armor: 'none', weapon: 'claws', helm: 'horned', cape: false, shield: 'none', element: 'fire', size: 'small', tint: '#7a1e12' },
  });
  SP({
    id: 'sp_illusory_feast', name: L('환영의 잔치', 'Illusory Feast'), tier: 1, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상 적을 1턴 동안 주의 분산 상태로 만들고 90% 확률로 1턴간 기절시킵니다.', 'Distracts the target enemy for 1 turn and has a base 90% chance of Stunning it for 1 turn.'),
    cost: { mana: 10, cp: 15 }, target: 'enemy_unit', range: 4, effect: { type: 'status', status: 'stunned', duration: 1, chance: 90 },
  });
  SP({
    id: 'sp_summon_gluttonous_imp', name: L('탐식의 임프 소환', 'Summon Gluttonous Imp'), tier: 1, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 칸에 탐식의 임프를 소환합니다.', 'Summons a Gluttonous Imp onto the target hex.'),
    cost: { mana: 60, cp: 60 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_gluttonous_imp', count: 1 },
  });
  SP({
    id: 'sp_corrupt_pact', name: L('타락한 계약', 'Corrupt Pact'), tier: 1, affinity: { chaos: 2 }, kind: 'strategic',
    desc: L('대상 자유 도시의 다른 군주에 대한 호감도가 200 낮아지고, 그 도시 식량 수입의 80%가 당신의 도시로 넘어옵니다.', "The target Free City's relations with other rulers drop by 200, and 80% of its Food income flows to your cities."),
    cost: { mana: 60, cp: 60 }, target: 'city', range: 0, effect: { type: 'special', id: 'corrupt_pact', pct: 80 },
  });
  SP({
    id: 'sp_infernal_jaws', name: L('지옥의 턱', 'Infernal Jaws'), tier: 1, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상 적에게 물리 피해 15와 화염 피해 15를 줍니다. 대상이 죽으면 인접한 아군이 임시 체력 20을 얻습니다.', 'Deals 15 Physical and 15 Fire damage to the target; if it dies, adjacent allies heal 20 temporary HP.'),
    cost: { mana: 10, cp: 15 }, target: 'enemy_unit', range: 4, effect: { type: 'damage', channel: 'fire', amount: 15 },
  });
  TR({
    id: 'tr_demonic_hunger', name: L('악마의 굶주림', 'Demonic Hunger'), desc: L('대상 종족에 탐식의 지옥의 힘을 불어넣습니다: 소환수가 아닌 적을 처치하면 게걸스러움을 얻고(10중첩에서 포만감으로 전환), 지방을 약탈하면 최대 체력의 25%를 회복합니다.', 'Charges the target race with infernal gluttony: killing non-summon enemies grants Gorged (converts to Satiation at 10 stacks); pillaging a province heals 25% of max HP.'),
    kind: 'minor', tome: 'tome_gluttony', effects: { healPerTurn: 2 },
  });
  IMP({
    id: 'imp_hungering_maw', name: L('굶주린 아가리', 'Hungering Maw'), desc: L('식량의 10%를 마나로 전환하며, 전투에서 승리하면 이 도시가 식량 25를 얻습니다.', 'Converts 10% of Food to Mana; winning a battle grants this city 25 Food.'),
    kind: 'special', tome: 'tome_gluttony', cost: { gold: 60, production: 130 }, yields: { mana: 4 },
  });
  TM({
    id: 'tome_gluttony', name: L('폭식의 서', 'Tome of Gluttony'), tier: 1, affinity: { chaos: 2 }, expansion: 'secrets_of_the_archmages', icon: 'tome_chaos_1',
    desc: L('탐식의 지옥 영역을 지배하여 아군을 더 강하고 죽이기 어렵게 만듭니다. 필멸자의 정수를 먹어치우며 강해집니다.', 'Gain control over the infernal domain of Gluttony, making your units harder to kill and stronger as they feed on mortal essences.'),
    passive: { desc: L('전투에서 적을 처치할 때마다 소량의 체력을 회복합니다.', 'Recovers a small amount of HP whenever a unit kills an enemy in battle.'), effects: { healPerTurn: 1 } },
    contents: [
      { type: 'spell', id: 'sp_illusory_feast', cost: kc(1, false) },
      { type: 'spell', id: 'sp_summon_gluttonous_imp', cost: kc(1, false) },
      { type: 'spell', id: 'sp_corrupt_pact', cost: kc(1, false) },
      { type: 'transformation', id: 'tr_demonic_hunger', cost: kc(1, false) },
      { type: 'spell', id: 'sp_infernal_jaws', cost: kc(1, false) },
      { type: 'improvement', id: 'imp_hungering_maw', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Burning Passion (T2, +2 Chaos)
  U({
    id: 'oc_orb_of_desire', name: L('욕망의 구', 'Orb of Desire'), desc: L('시전 즉시 나타나 적을 도발하고 공격자를 불태우는 소환체.', 'A conjured orb that appears instantly to taunt enemies and burn its attackers.'),
    tier: 3, role: 'support', tags: ['magic_origin', 'fiend'], ...SCOST(6),
    hp: 80, def: 3, res: 3,
    attacks: [{ id: 'searing_gaze', name: L('불타는 시선', 'Searing Gaze'), type: 'ranged', damage: 12, channel: 'fire', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'burning', chance: 50 }], props: ['magic'] }],
    abilities: ['taunt'], passives: [],
    source: { type: 'tome', id: 'tome_burning_passion' },
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'small', glow: '#ff7a2a' },
  });
  U({
    id: 'oc_temptress', name: L('유혹자', 'Temptress'), desc: L('적을 매혹시켜 지배하는 전투 마법사 유닛.', 'A Magic Fighter unit that can Dominate enemy units with seduction.'),
    tier: 3, role: 'mage', tags: ['magic_origin', 'fiend'], ...UCOST[3],
    hp: 90, def: 3, res: 4, statusRes: { spirit: 3 },
    attacks: [{ id: 'magic_strike', name: L('마력 강타', 'Magic Strike'), type: 'melee', damage: 18, channel: 'fire', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['ab_temptress_kiss', 'defend'], passives: ['flanker'],
    source: { type: 'tome', id: 'tome_burning_passion' },
    look: { body: 'demon', armor: 'cloth', weapon: 'daggers', helm: 'none', cape: 'long', shield: 'none', element: 'fire', size: 'medium', tint: '#7a1e12' },
  });
  AACT('ab_temptress_kiss', '유혹의 입맞춤', 'Kiss of Seduction', '대상 적을 60% 확률로 매혹시켜 이번 턴 동안 지배합니다.', 'Has a 60% chance to Charm the target enemy, controlling it for this turn.',
    { range: 1, target: 'enemy', cooldown: 3, icon: 'eye', effect: { type: 'status', status: 'charmed', duration: 1, chance: 60 } });
  SP({
    id: 'sp_blazing_aura', name: L('불타는 기운', 'Blazing Aura'), tier: 2, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('방패병·장병기병·돌격병·전사·척후병·전투 마법사 유닛에게 인접한 적을 불태우는 기운을 부여합니다.', 'Grants Shield, Polearm, Shock, Fighter, Skirmisher and Battle Mage units a Blazing Aura that burns and damages nearby enemies.'),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher', 'mage'], effects: {}, attackStatus: { id: 'burning', chance: 20 } },
  });
  SP({
    id: 'sp_conjure_orb_of_desire', name: L('욕망의 구 강림', 'Conjure Orb of Desire'), tier: 2, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상 칸에 욕망의 구를 소환합니다. 3턴간 지속됩니다.', 'Conjures an Orb of Desire on the target hex; it lasts 3 turns.'),
    cost: { mana: 30, cp: 25 }, target: 'hex', range: 4, effect: { type: 'summon', unit: 'oc_orb_of_desire', count: 1, temporary: true, duration: 3 },
  });
  SP({
    id: 'sp_strength_sapping_imbuement', name: L('힘 빨아들이기', 'Strength Sapping Imbuement'), tier: 2, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('원거리·지원·전투 마법사·척후병 유닛의 공격이 화염 피해를 더하고, 60% 확률로 적을 약화시키며 성공 시 자신은 강화됩니다.', "Ranged, Support, Battle Mage and Skirmisher attacks gain bonus Fire damage and have a 60% chance to Weaken the enemy, granting Strengthened on success."),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: { channelDmg_fire: 1 }, attackStatus: { id: 'weakened', chance: 60 } },
  });
  SP({
    id: 'sp_thrill_of_combat', name: L('전투의 전율', 'Thrill of Combat'), tier: 2, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상 아군에게 3턴 동안 광란과 지옥의 힘을 부여합니다.', 'Grants the target ally Berserk and Infernal Might for 3 turns.'),
    cost: { mana: 15, cp: 20 }, target: 'ally_unit', range: 3, effect: { type: 'status', status: 'berserk', duration: 3, chance: 100 },
  });
  TR({
    id: 'tr_fiery_heart', name: L('불타는 심장', 'Fiery Heart'), desc: L('대상 종족에게 불타는 심장을 심습니다: 화염 보호 +2, 치명타 확률 +10%, 화염 재해 면역.', 'Grants the target race a fiery core: +2 Fire protection, +10% critical hit chance, and immunity to fire hazards.'),
    kind: 'minor', tome: 'tome_burning_passion', effects: { statusRes_fire: 2, critChance: 10 },
  });
  IMP({
    id: 'imp_house_of_passion', name: L('정염의 집', 'House of Passion'), desc: L('징집력을 생산하며 인접한 농장마다 금이 추가됩니다.', 'Generates Draft, with more Gold per adjacent Farm.'),
    kind: 'special', tome: 'tome_burning_passion', cost: { gold: 100, production: 250 }, yields: { draft: 10 }, adjacencyBonus: { farm: 6 },
  });
  TM({
    id: 'tome_burning_passion', name: L('정염의 서', 'Tome of Burning Passion'), tier: 2, affinity: { chaos: 2 }, expansion: 'secrets_of_the_archmages', icon: 'tome_chaos_2',
    desc: L('악마의 분노로 아군을 강화하고, 마성의 욕망으로 적을 유혹하며, 둘 모두를 지옥불에 휩싸이게 합니다.', 'Strengthen your units with Demonic wrath, seduce your enemies with fiendish lust, and engulf both in infernal flames.'),
    passive: { desc: L('아군 유닛이 화상 상태의 적에게 소폭 더 큰 피해를 줍니다.', 'Friendly units deal slightly more damage to Burning enemies.'), effects: { dmgPct: 2 } },
    contents: [
      { type: 'spell', id: 'sp_blazing_aura', cost: kc(2, false) },
      { type: 'spell', id: 'sp_conjure_orb_of_desire', cost: kc(2, false) },
      { type: 'spell', id: 'sp_strength_sapping_imbuement', cost: kc(2, false) },
      { type: 'unit', id: 'oc_temptress', cost: kc(2, true) },
      { type: 'spell', id: 'sp_thrill_of_combat', cost: kc(2, false) },
      { type: 'transformation', id: 'tr_fiery_heart', cost: kc(2, false) },
      { type: 'improvement', id: 'imp_house_of_passion', cost: kc(2, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Mayhem (T2, +2 Chaos)
  U({
    id: 'oc_gremlin', name: L('그렘린', 'Gremlin'), desc: L('전장을 어지럽히는 사악한 전투 마법사 유닛.', 'A disruptive and fiendish Battle Mage unit.'),
    tier: 2, role: 'mage', tags: ['magic_origin', 'fiend'], ...SCOST(6),
    hp: 60, def: 2, res: 2,
    attacks: [{ id: 'mischief_bolt', name: L('장난의 화살', 'Mischief Bolt'), type: 'ranged', damage: 12, channel: 'fire', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'misfortune', chance: 40 }], props: ['magic'] }],
    abilities: [], passives: [],
    source: { type: 'tome', id: 'tome_mayhem' },
    look: { body: 'demon', armor: 'none', weapon: 'staff', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'small', tint: '#7a1e12' },
  });
  SP({
    id: 'sp_curse_of_misfortune', name: L('불운의 저주', 'Curse of Misfortune'), tier: 2, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('주변 2칸의 대상들이 불운 2중첩을 얻습니다.', 'Targets within 2 hexes suffer 2 stacks of Misfortune.'),
    cost: { mana: 30, cp: 25 }, target: 'hex', range: 4, area: 2, effect: { type: 'status', status: 'misfortune', duration: 3, chance: 100, area: 2 },
  });
  SP({
    id: 'sp_mark_of_misfortune', name: L('불운의 표식', 'Mark of Misfortune'), tier: 2, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('원거리·지원·전투 마법사·척후병 유닛의 공격이 불운을 새깁니다.', "Ranged, Support, Battle Mage and Skirmisher attacks inflict Misfortune."),
    cost: { mana: 90, cp: 90 }, upkeep: { mana: 9 },
    enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: {}, attackStatus: { id: 'misfortune', chance: 50 } },
  });
  SP({
    id: 'sp_summon_gremlin', name: L('그렘린 소환', 'Summon Gremlin'), tier: 2, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 칸에 그렘린을 소환합니다.', 'Summons a Gremlin onto the target hex.'),
    cost: { mana: 100, cp: 100 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_gremlin', count: 1 },
  });
  SP({
    id: 'sp_incite_revolution', name: L('반란 선동', 'Incite Revolution'), tier: 2, affinity: { chaos: 2 }, kind: 'strategic',
    desc: L('대상 적 도시가 국경 지방 하나와 그 인구를 잃고, 그 지방에 도적 야영지나 해적 소굴이 생겨납니다.', "The target enemy city loses a border province and its population; a Brigand Camp or Pirate Cove appears there."),
    cost: { mana: 100, cp: 100 }, target: 'city', range: 0, effect: { type: 'special', id: 'incite_revolution' },
  });
  SP({
    id: 'sp_maelstrom_of_mayhem', name: L('대혼란의 소용돌이', 'Maelstrom of Mayhem'), tier: 2, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('주변 1칸의 적들을 밀쳐내고 물리 피해 12를 줍니다.', 'Shoves enemies within 1 hex away and deals 12 Physical damage.'),
    cost: { mana: 25, cp: 25 }, target: 'hex', range: 4, area: 1, effect: { type: 'push', distance: 2 },
  });
  TM({
    id: 'tome_mayhem', name: L('대혼란의 서', 'Tome of Mayhem'), tier: 2, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_2',
    desc: L('적을 무작위로 밀쳐내고 불운을 새겨 전장에 혼란을 일으킵니다.', 'Cause chaos on the battlefield by randomly displacing enemies and inflicting Misfortune.'),
    passive: { desc: L('적이 실수(펌블)할 확률이 소폭 오릅니다.', "Enemies' fumble chance is slightly increased."), effects: {} },
    contents: [
      { type: 'spell', id: 'sp_curse_of_misfortune', cost: kc(2, false) },
      { type: 'spell', id: 'sp_mark_of_misfortune', cost: kc(2, false) },
      { type: 'spell', id: 'sp_summon_gremlin', cost: kc(2, false) },
      { type: 'spell', id: 'sp_incite_revolution', cost: kc(2, false) },
      { type: 'spell', id: 'sp_maelstrom_of_mayhem', cost: kc(2, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Revelry (T2, +2 Chaos)
  U({
    id: 'oc_skald', name: L('스칼드', 'Skald'), desc: L('흥청망청을 부추겨 아군을 고무하는 지원 유닛.', 'A Support unit that ensures the revelry never stops by inspiring your units.'),
    tier: 3, role: 'support', tags: ['infantry'], ...UCOST[3],
    hp: 80, def: 2, res: 4, statusRes: { spirit: 5 },
    attacks: [{ id: 'heat_of_the_revel', name: L('흥의 열기', 'Heat of the Revel'), type: 'ranged', damage: 12, channel: 'fire', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['ab_skald_song_of_carnage', 'inspire_morale', 'defend'], passives: [],
    source: { type: 'tome', id: 'tome_revelry' },
    look: { body: 'form', armor: 'leather', weapon: 'instrument', helm: 'none', cape: 'short', shield: 'none', element: 'fire', size: 'medium', tint: '#7a1e12' },
  });
  AACT('ab_skald_song_of_carnage', '유혈의 노래', 'Song of Carnage', '자신과 인접한 아군이 강화 2중첩과 행운 2중첩을 얻습니다.', 'This unit and adjacent allies gain 2 stacks of Strengthened and 2 stacks of Fortune.',
    { range: 0, area: 1, target: 'ally', cooldown: 2, icon: 'banner', effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100, area: 1 } });
  SP({
    id: 'sp_bloodfury_weapons', name: L('피의 격노 무기', 'Bloodfury Weapons'), tier: 2, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('공격에 물리 피해가 추가되고, 처치 시 대상 주변의 적들이 출혈을 얻습니다.', "Attacks gain bonus Physical damage; on a kill, enemies adjacent to the target gain Bleeding."),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher', 'mage'], effects: { channelDmg_physical: 2 } },
  });
  SP({
    id: 'sp_revels_of_carnage', name: L('유혈의 흥청망청', 'Revels of Carnage'), tier: 2, affinity: { chaos: 2 }, kind: 'strategic',
    desc: L('3턴 동안 대상 아군 부대의 비영웅 유닛이 전투 경험치를 100% 더 얻습니다.', 'For 3 turns, non-Hero units in the target friendly army gain +100% Experience from combat.'),
    cost: { mana: 60, cp: 60 }, target: 'army', range: 0, effect: { type: 'special', id: 'xp_boost', pct: 100, duration: 3 },
  });
  TR({
    id: 'tr_revelers_heart', name: L('흥청망청꾼의 심장', 'Reveler\'s Heart'), desc: L('대상 종족을 강렬한 열정으로 뒤덮습니다: 모든 원천의 사기 획득이 50% 증가합니다.', 'Overwhelms the target race with intense fervor: +50% Morale from all sources.'),
    kind: 'minor', tome: 'tome_revelry', effects: { morale: 5 },
  });
  IMP({
    id: 'imp_carnival_of_flesh', name: L('육신의 카니발', 'Carnival of Flesh'), desc: L('식량과 징집력을 생산하며 인접한 농장마다 늘어납니다.', 'Generates Food and Draft, with more per adjacent Farm.'),
    kind: 'special', tome: 'tome_revelry', cost: { gold: 100, production: 250 }, yields: { food: 7, draft: 7 }, adjacencyBonus: { farm: 3 },
  });
  TM({
    id: 'tome_revelry', name: L('향락의 서', 'Tome of Revelry'), tier: 2, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_2',
    desc: L('과감히 도전하는 자에게 보상하는 방탕의 길을 따르며, 사기와 경험치 획득에 특화합니다.', 'Follow the path of debauchery that rewards those who take chances, and specialize in gaining Morale and Experience.'),
    passive: { desc: L('전투에서 얻는 경험치가 소폭 늘어납니다.', 'Units gain slightly more experience from combat.'), effects: { xpPct: 5 } },
    contents: [
      { type: 'spell', id: 'sp_bloodfury_weapons', cost: kc(2, false) },
      { type: 'spell', id: 'sp_revels_of_carnage', cost: kc(2, false) },
      { type: 'unit', id: 'oc_skald', cost: kc(2, true) },
      { type: 'transformation', id: 'tr_revelers_heart', cost: kc(2, false) },
      { type: 'improvement', id: 'imp_carnival_of_flesh', cost: kc(2, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Devastation (T3, +2 Chaos)
  U({
    id: 'oc_warbreed', name: L('전쟁의 산물', 'Warbreed'), desc: L('살아있는 공성 병기로 쓰이는 거대한 돌격 유닛.', 'A monstrous Shock unit used as a living siege weapon.'),
    tier: 4, role: 'shock', tags: ['mythic'], ...UCOST[4],
    hp: 130, def: 5, res: 2, statusRes: { spirit: 4, blight: 3 },
    attacks: [{ id: 'charge_strike', name: L('돌격 강타', 'Charge Strike'), type: 'melee', damage: 24, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: ['charge'] },
      { id: 'power_cleave', name: L('강력한 베기', 'Power Cleave'), type: 'melee', damage: 20, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'sundered', chance: 60 }], props: [] }],
    abilities: ['defend'], passives: ['siege_breaker', 'regeneration'],
    source: { type: 'tome', id: 'tome_devastation' },
    look: { body: 'giant', armor: 'heavy_plate', weapon: 'great_axe', helm: 'horned', cape: false, shield: 'none', element: 'fire', size: 'huge', tint: '#7a1e12' },
  });
  SP({
    id: 'sp_flame_volley', name: L('화염 일제 사격', 'Flame Volley'), tier: 3, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('주변 1칸의 적들에게 물리 피해 16과 화염 피해 16을 주고 화상을 입히며 땅을 불태웁니다.', 'Deals 16 Physical and 16 Fire damage to enemies within 1 hex, inflicts Burning, and sets the ground On Fire.'),
    cost: { mana: 80, cp: 35 }, target: 'hex', range: 4, area: 1, effect: { type: 'damage', channel: 'fire', amount: 16, area: 1, status: { id: 'burning', chance: 100, duration: 3 } },
  });
  SP({
    id: 'sp_monstrous_rebirth', name: L('괴물로의 재탄생', 'Monstrous Rebirth'), tier: 3, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상 아군 하나가 전쟁의 산물의 힘을 빌려 체력 60을 임시로 회복하고 광란에 빠집니다. 전투가 끝나면 원래대로 돌아옵니다.', "Channels a Warbreed's fury into the target ally, healing 60 temporary HP and inflicting Berserk; wears off at the end of battle."),
    cost: { mana: 45, cp: 30 }, target: 'ally_unit', range: 3, effect: { type: 'heal', amount: 60, status: { id: 'berserk', chance: 100, duration: 0 } },
  });
  SP({
    id: 'sp_flameburst_weapons', name: L('화염 폭발 무기', 'Flameburst Weapons'), tier: 3, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('치명타 확률이 오르고, 처치한 적이 폭발해 인접한 적에게 화염 피해와 화상을 입힙니다.', 'Increases critical hit chance; killing a unit makes it explode, dealing Fire damage and Burning to adjacent enemies.'),
    cost: { mana: 160, cp: 160 }, upkeep: { mana: 16 },
    enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: { critChance: 20 } },
  });
  SP({
    id: 'sp_focus_of_devastation', name: L('파괴의 집중', 'Focus of Devastation'), tier: 3, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('지원·전투 마법사 유닛의 공격이 요새화된 장애물을 파괴할 수 있게 되고, 60% 확률로 방어 태세를 취소시킵니다.', 'Support and Battle Mage attacks gain Demolisher (can destroy fortified obstacles) with a 60% chance to cancel Defense Mode.'),
    cost: { mana: 160, cp: 160 }, upkeep: { mana: 16 },
    enchant: { appliesTo: ['support', 'mage'], effects: {} },
  });
  TM({
    id: 'tome_devastation', name: L('파괴의 서', 'Tome of Devastation'), tier: 3, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_3',
    desc: L('압도적인 힘으로 도시를 함락시키는 수단을 얻습니다. 공성과 피해에 특화합니다.', 'Gain the means to take cities with overwhelming force. Specialize in Sieges and dealing damage.'),
    passive: { desc: L('공성 시 요새에 가하는 피해가 소폭 증가합니다.', 'Deals slightly more damage to fortifications during sieges.'), effects: { wallHp: -2 } },
    contents: [
      { type: 'spell', id: 'sp_flame_volley', cost: kc(3, false) },
      { type: 'spell', id: 'sp_monstrous_rebirth', cost: kc(3, false) },
      { type: 'unit', id: 'oc_warbreed', cost: kc(3, true) },
      { type: 'spell', id: 'sp_flameburst_weapons', cost: kc(3, false) },
      { type: 'spell', id: 'sp_focus_of_devastation', cost: kc(3, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Pandemonium (T3, +2 Chaos)
  U({
    id: 'oc_chaos_eater', name: L('혼돈 포식자', 'Chaos Eater'), desc: L('약화 효과를 먹어치우며 강해지는 근접 전투 마법사.', 'A close-range Battle Mage that thrives on devouring Negative Status Effects.'),
    tier: 4, role: 'mage', tags: ['magic_origin', 'fiend'], ...SCOST(14),
    hp: 110, def: 3, res: 5,
    attacks: [{ id: 'devour_status', name: L('상태 포식', 'Devour Affliction'), type: 'melee', damage: 20, channel: 'blight', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'weakened', chance: 50 }], props: ['magic'] }],
    abilities: ['defend'], passives: ['life_steal'],
    source: { type: 'tome', id: 'tome_pandemonium' },
    look: { body: 'demon', armor: 'none', weapon: 'claws', helm: 'horned', cape: false, shield: 'none', element: 'shadow', size: 'medium', tint: '#7a1e12' },
  });
  SP({
    id: 'sp_havoc_magic', name: L('대혼란의 마법', 'Havoc Magic'), tier: 3, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('지원·전투 마법사 유닛의 마법 공격이 60% 확률로 무작위 약화 효과를 새깁니다.', 'Support and Battle Mage magic attacks have a 60% chance to inflict a random debuff.'),
    cost: { mana: 120, cp: 120 }, upkeep: { mana: 12 },
    enchant: { appliesTo: ['support', 'mage'], effects: {}, attackStatus: { id: 'weakened', chance: 60 } },
  });
  SP({
    id: 'sp_mass_hysteria', name: L('집단 히스테리', 'Mass Hysteria'), tier: 3, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('주변 1칸의 모든 유닛에게 무작위 약화 효과를 겁니다(단순화하여 약화를 적용).', 'Inflicts a random debuff (simplified here as Weakened) on every unit within 1 hex.'),
    cost: { mana: 45, cp: 30 }, target: 'hex', range: 4, area: 1, effect: { type: 'status', status: 'weakened', duration: 3, chance: 100, area: 1 },
  });
  SP({
    id: 'sp_summon_chaos_eater', name: L('혼돈 포식자 소환', 'Summon Chaos Eater'), tier: 3, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 칸에 혼돈 포식자를 소환합니다.', 'Summons a Chaos Eater onto the target hex.'),
    cost: { mana: 200, cp: 200 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_chaos_eater', count: 1 },
  });
  SP({
    id: 'sp_infectious_insanity', name: L('전염되는 광기', 'Infectious Insanity'), tier: 3, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상에게 90% 확률로 2턴간 전염성 광기를, 실패 시 1턴간 광기를 겁니다(단순화하여 공황으로 적용).', 'The target has a base 90% chance to be inflicted with Infectious Insanity for 2 turns, or Insanity for 1 turn on failure (approximated here as Panicked).'),
    cost: { mana: 100, cp: 40 }, target: 'enemy_unit', range: 4, effect: { type: 'status', status: 'panicked', duration: 2, chance: 90 },
  });
  TR({
    id: 'tr_vessels_of_chaos', name: L('혼돈의 그릇', 'Vessels of Chaos'), desc: L('대상 종족을 혼돈 에너지의 매개체로 만듭니다: 스스로에게 걸린 약화 효과 하나당 피해 +10%(최대 3중첩).', 'Turns the target race into a conduit for chaotic energies: +10% damage for each of its own debuffs, up to 3 stacks.'),
    kind: 'minor', tome: 'tome_pandemonium', effects: { dmgPct: 10 },
  });
  TM({
    id: 'tome_pandemonium', name: L('대혼돈의 서', 'Tome of Pandemonium'), tier: 3, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_3',
    desc: L('전투의 혼란 속에서 번성하며 적에게 무작위 약화 효과를 걸고, 이미 약화된 적에게 더 큰 피해를 줍니다.', 'Thrive in the chaos of battle and specialize in inflicting random debuffs on enemies, dealing more damage to those already afflicted.'),
    passive: { desc: L('약화 효과에 걸린 적에게 아군 공격이 소폭 더 큰 피해를 줍니다.', 'Friendly attacks deal slightly more damage to enemies with a debuff.'), effects: { dmgPct: 2 } },
    contents: [
      { type: 'spell', id: 'sp_havoc_magic', cost: kc(3, false) },
      { type: 'spell', id: 'sp_mass_hysteria', cost: kc(3, false) },
      { type: 'spell', id: 'sp_summon_chaos_eater', cost: kc(3, false) },
      { type: 'spell', id: 'sp_infectious_insanity', cost: kc(3, false) },
      { type: 'transformation', id: 'tr_vessels_of_chaos', cost: kc(3, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Warlord (T3, +2 Chaos)
  U({
    id: 'oc_war_golem', name: L('전쟁 골렘', 'War Golem'), desc: L('적의 요새를 파괴하는 데 특화한 지옥의 공성 병기.', 'An infernal siege weapon that specializes in destroying enemy fortifications.'),
    tier: 3, role: 'mage', tags: ['magic_origin', 'construct', 'fiend'], ...SCOST(15),
    hp: 90, def: 4, res: 3,
    attacks: [{ id: 'siege_slam', name: L('공성 강타', 'Siege Slam'), type: 'melee', damage: 20, channel: 'fire', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['defend'], passives: ['siege_breaker', 'construct'],
    source: { type: 'tome', id: 'tome_warlord' },
    look: { body: 'golem', armor: 'none', weapon: 'hammer', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'large', tint: '#5a3a30' },
  });
  U({
    id: 'oc_warlord', name: L('전쟁군주', 'Warlord'), desc: L('전장을 지휘하며 근접전을 지배하는 강력한 신화 유닛.', 'A powerful Mythic unit and master of melee combat that commands others in combat.'),
    tier: 4, role: 'shock', tags: ['mythic'], ...UCOST[4],
    hp: 140, def: 5, res: 6, statusRes: { spirit: 4, blight: 3 },
    attacks: [{ id: 'charge_strike', name: L('돌격 강타', 'Charge Strike'), type: 'melee', damage: 24, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: ['charge'] }],
    abilities: ['ab_warlord_command_attack', 'ab_warlord_command_defend', 'defend'], passives: ['first_strike', 'control_immunity'],
    source: { type: 'tome', id: 'tome_warlord' },
    look: { body: 'form', armor: 'heavy_plate', weapon: 'great_axe', helm: 'horned', cape: 'long', shield: 'none', element: 'fire', size: 'large', tint: '#7a1e12' },
  });
  AACT('ab_warlord_command_attack', '공격 명령', 'Command: Attack', '주변 2칸의 아군이 즉시 대상을 공격합니다.', 'Orders allies within 2 hexes to immediately attack the target.',
    { ap: 2, range: 4, target: 'enemy', cooldown: 2, icon: 'sword', effect: { type: 'special', id: 'command_attack' } });
  AACT('ab_warlord_command_defend', '방어 명령', 'Command: Defend', '주변 2칸의 아군이 즉시 방어 태세에 들어갑니다.', 'Orders allies within 2 hexes to immediately enter Defense Mode.',
    { ap: 2, range: 0, area: 2, target: 'ally', cooldown: 2, icon: 'shield', effect: { type: 'status', status: 'fortified', duration: 1, chance: 100, area: 2 } });
  SP({
    id: 'sp_might_of_the_battlefield', name: L('전장의 위력', 'Might of the Battlefield'), tier: 3, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('주변 2칸의 모든 아군이 지옥의 힘과 사기 +15를 얻습니다(1~3등급 유닛은 두 배).', 'All friendly units within 2 hexes gain Infernal Might and +15 Morale (doubled for Tier I-III units).'),
    cost: { mana: 45, cp: 30 }, target: 'ally_unit', range: 0, area: 2, effect: { type: 'status', status: 'st_infernal_might', duration: 3, chance: 100, area: 2 },
  });
  SP({
    id: 'sp_relentless_might', name: L('가차없는 힘', 'Relentless Might'), tier: 3, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('반격을 한 번 더 할 수 있게 되고, 공격할 때마다 지옥의 힘을 얻습니다.', 'Grants one extra retaliation and Infernal Might whenever the unit attacks.'),
    cost: { mana: 100, cp: 100 }, upkeep: { mana: 10 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: { retaliation: 1 } },
  });
  SP({
    id: 'sp_summon_war_golem', name: L('전쟁 골렘 소환', 'Summon War Golem'), tier: 3, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 칸에 요새 파괴에 특화한 전쟁 골렘을 소환합니다.', 'Summons a War Golem, specialized in destroying fortifications, onto the target hex.'),
    cost: { mana: 150, cp: 150 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_war_golem', count: 1 },
  });
  IMP({
    id: 'imp_war_forge', name: L('전쟁의 대장간', 'War Forge'), desc: L('징집력을 생산하며, 제국이 보유한 광석 마법 재료 종류마다 금과 징집력이 추가됩니다.', 'Generates Draft, with more Gold and Draft per type of Ore magic material the empire controls.'),
    kind: 'special', tome: 'tome_warlord', cost: { gold: 100, production: 250 }, yields: { draft: 20 },
  });
  TM({
    id: 'tome_warlord', name: L('전쟁군주의 서', 'Tome of the Warlord'), tier: 3, affinity: { chaos: 2 }, expansion: 'rise_from_ruin', icon: 'tome_chaos_3',
    desc: L('강력한 전사와 지옥의 동맹으로 세계를 정복합니다.', 'Conquer the world with powerful warriors and infernal allies.'),
    passive: { desc: L('공격할 때마다 확률적으로 지옥의 힘을 얻습니다.', 'Attacks have a chance to grant Infernal Might.'), effects: {} },
    contents: [
      { type: 'spell', id: 'sp_might_of_the_battlefield', cost: kc(3, false) },
      { type: 'spell', id: 'sp_relentless_might', cost: kc(3, false) },
      { type: 'spell', id: 'sp_summon_war_golem', cost: kc(3, false) },
      { type: 'unit', id: 'oc_warlord', cost: kc(3, true) },
      { type: 'improvement', id: 'imp_war_forge', cost: kc(3, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Chaos Channeling (T4, +2 Chaos)
  U({
    id: 'oc_fire_dragon', name: L('불의 용', 'Fire Dragon'), desc: L('화염과 화상에 관련된 능력을 지닌 신화 유닛.', 'A Mythic unit with Fire and Burning-related abilities.'),
    tier: 5, role: 'mage', tags: ['mythic', 'dragon', 'flying'], move: 'fly', mp: 48, ...UCOST[5],
    hp: 175, def: 8, res: 6, statusRes: { fire: 10 },
    attacks: [{ id: 'strike', name: L('발톱 할퀴기', 'Claw Strike'), type: 'melee', damage: 26, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: [] }],
    abilities: ['dragon_breath_fire', 'defend'], passives: ['flying', 'immune_fire'],
    source: { type: 'tome', id: 'tome_chaos_channeling' },
    look: { body: 'dragon', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'huge', tint: '#7a1e12' },
  });
  SP({
    id: 'sp_abyssal_flames', name: L('심연의 화염', 'Abyssal Flames'), tier: 4, affinity: { chaos: 2 }, kind: 'transform',
    desc: L('대상 지방의 지형을 화산 지대로 바꾸고, 그 지방의 적 유닛은 1턴 동안 화염 보호가 2 줄어듭니다.', 'Transforms the target province into volcanic terrain; enemy units there lose 2 Fire protection for 1 turn.'),
    cost: { mana: 150, cp: 150 }, target: 'province', range: 0, effect: { type: 'terraform', terrain: 'volcanic', feature: 'ash', radius: 0 },
  });
  SP({
    id: 'sp_fan_the_inferno', name: L('지옥불 부채질', 'Fan the Inferno'), tier: 4, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('모든 적 유닛이 저항력의 절반을 무시하는 화염 피해 5를 입고 화상에 걸립니다.', 'All enemy units take 5 Fire damage that ignores half their Resistance and become Burning.'),
    cost: { mana: 100, cp: 40 }, target: 'hex', range: 0, area: 5, effect: { type: 'damage', channel: 'fire', amount: 5, area: 5, status: { id: 'burning', chance: 100, duration: 3 } },
  });
  SP({
    id: 'sp_flamer_focus', name: L('화염술사의 집중', 'Flamer Focus'), tier: 4, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('지원·전투 마법사 유닛에게 등급에 따라 위력이 커지는 광역 화염 폭탄 능력을 부여합니다.', "Grants Support and Battle Mage units a Fire Bomb ability that deals area magic damage scaling with the unit's tier."),
    cost: { mana: 140, cp: 140 }, upkeep: { mana: 14 },
    enchant: { appliesTo: ['support', 'mage'], effects: { channelDmg_fire: 2 } },
  });
  SP({
    id: 'sp_summon_flame_incarnate', name: L('화염의 화신 소환', 'Summon Flame Incarnate'), tier: 4, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 칸에 화염과 화상에 관련된 능력을 지닌 5등급 신화 유닛을 소환합니다.', 'Summons a Tier V Mythic unit with Fire and Burning-related abilities onto the target hex.'),
    cost: { mana: 300, cp: 300 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_fire_dragon', count: 1 },
  });
  TR({
    id: 'tr_scion_of_flame', name: L('화염의 후예', 'Scion of Flame'), desc: L('대상 종족을 불의 화신으로 만듭니다: 화염 보호 +4, 근접 공격자에게 피해를 주는 복수의 화염, 화상 면역, 용암 위를 걸을 수 있음.', 'Makes the target race the embodiment of fire: +4 Fire protection, Vengeful Flames damaging melee attackers, immunity to Burning, and the ability to walk on Lava.'),
    kind: 'minor', tome: 'tome_chaos_channeling', effects: { statusRes_fire: 4 },
  });
  TM({
    id: 'tome_chaos_channeling', name: L('혼돈 전도의 서', 'Tome of Chaos Channeling'), tier: 4, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_4',
    desc: L('이전 혼돈 서적들로 쌓아온 혼돈의 힘을 다루는 대가가 됩니다.', 'Become the master of chaos by exploiting your accumulated chaotic powers from previous Chaos affinity tomes.'),
    passive: { desc: L('화염 피해를 주는 아군 공격이 소폭 더 강해집니다.', 'Friendly attacks that deal Fire damage hit slightly harder.'), effects: { channelDmg_fire: 1 } },
    contents: [
      { type: 'spell', id: 'sp_abyssal_flames', cost: kc(4, false) },
      { type: 'spell', id: 'sp_fan_the_inferno', cost: kc(4, false) },
      { type: 'spell', id: 'sp_flamer_focus', cost: kc(4, false) },
      { type: 'spell', id: 'sp_summon_flame_incarnate', cost: kc(4, false) },
      { type: 'transformation', id: 'tr_scion_of_flame', cost: kc(4, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Demon Gate (T4, +2 Chaos)
  U({
    id: 'oc_inferno_hound', name: L('지옥 사냥개', 'Inferno Hound'), desc: L('악마의 문으로 소환되는 불타는 사냥개.', 'A burning hound summoned through the Demon Gate.'),
    tier: 3, role: 'mage', tags: ['magic_origin', 'fiend', 'flying'], move: 'fly', mp: 44, ...SCOST(10),
    hp: 90, def: 3, res: 3,
    attacks: [{ id: 'fire_bite', name: L('불타는 물어뜯기', 'Fire Bite'), type: 'melee', damage: 18, channel: 'fire', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'burning', chance: 50 }], props: ['magic'] }],
    abilities: [], passives: ['flying', 'immune_fire'],
    source: { type: 'tome', id: 'tome_demon_gate' },
    look: { body: 'demon', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'fire', size: 'medium', tint: '#7a1e12' },
  });
  U({
    id: 'oc_balor', name: L('발로르', 'Balor'), desc: L('적에게 파멸을 몰고 오는 신화 유닛.', 'A Mythic unit that wreaks havoc on your foes.'),
    tier: 5, role: 'shock', tags: ['magic_origin', 'mythic', 'fiend', 'flying'], move: 'fly', mp: 48, ...SCOST(20),
    hp: 160, def: 7, res: 6,
    attacks: [{ id: 'strike', name: L('검격', 'Melee Strike'), type: 'melee', damage: 28, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: [] }],
    abilities: ['ab_balor_chaos_brand', 'ab_balor_sunder_the_earth', 'defend'], passives: ['flying', 'immune_fire', 'fearless'],
    source: { type: 'tome', id: 'tome_demon_gate' },
    look: { body: 'demon', armor: 'none', weapon: 'whip', helm: 'horned', cape: false, shield: 'none', element: 'fire', size: 'huge', tint: '#3a1a52' },
  });
  AACT('ab_balor_chaos_brand', '혼돈의 낙인', 'Chaos Brand', '대상 적에게 화염 피해 18을 주고 무작위 약화 효과를 겁니다.', 'Deals 18 Fire damage to the target enemy and inflicts a random debuff.',
    { range: 4, target: 'enemy', cooldown: 2, icon: 'fire', effect: { type: 'damage', channel: 'fire', amount: 18, status: 'weakened', chance: 70, duration: 3 } });
  AACT('ab_balor_sunder_the_earth', '대지 붕괴', 'Sunder the Earth', '주변 1칸의 적에게 물리 피해 20을 주고 장애물을 파괴합니다.', 'Deals 20 Physical damage to enemies within 1 hex and destroys obstacles.',
    { ap: 3, range: 0, area: 1, target: 'any', cooldown: 3, icon: 'stomp', effect: { type: 'damage', channel: 'physical', amount: 20, area: 1 } });
  SP({
    id: 'sp_demonic_summoning', name: L('악마 소환술', 'Demonic Summoning'), tier: 4, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 봉신 자유 도시가 인구 1을 잃는 대가로 지옥 사냥개 무리를 소환합니다.', 'The target vassal Free City loses 1 population, summoning a pack of Inferno Hounds under your control instead.'),
    cost: { mana: 150, cp: 150 }, target: 'city', range: 0, effect: { type: 'summon', unit: 'oc_inferno_hound', count: 2 },
  });
  SP({
    id: 'sp_sacrificial_slaughter', name: L('제물의 학살', 'Sacrificial Slaughter'), tier: 4, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('대상 아군 유닛이 폭발하며 주변 2칸의 적들에게 등급에 비례한 화염 피해와 무작위 약화 효과를 입힙니다.', "The target friendly unit explodes; enemies within 2 hexes take Fire damage scaling with its tier and suffer a random debuff."),
    cost: { mana: 100, cp: 40 }, target: 'hex', range: 1, area: 2, effect: { type: 'damage', channel: 'fire', amount: 20, area: 2, status: { id: 'weakened', chance: 60, duration: 3 } },
  });
  SP({
    id: 'sp_summon_balor', name: L('발로르 소환', 'Summon Balor'), tier: 4, affinity: { chaos: 2 }, kind: 'summon',
    desc: L('대상 도시가 인구 2를 잃고 발로르를 소환합니다.', 'The target city loses 2 population and spawns a Balor.'),
    cost: { mana: 300, cp: 300 }, target: 'city', range: 0, effect: { type: 'summon', unit: 'oc_balor', count: 1 },
  });
  TR({
    id: 'tr_demonkin', name: L('악마의 혈족', 'Demonkin'), desc: L('대상 종족을 악마 같은 존재로 바꿉니다: 비행 이동, 공격할 때마다 격분해지는 광분, 화산·용암 지역에서 도시 안정도 페널티 없음.', 'Turns the target race into demonic beings: Flying movement, Frenzy (grows more furious with each attack), and no City Stability penalty from Chasm or Lava.'),
    kind: 'major', tome: 'tome_demon_gate', effects: {}, look: { skinTint: '#7a1e12', horns: true, wings: true },
  });
  IMP({
    id: 'imp_demon_gate', name: L('악마의 문', 'Demon Gate'), desc: L('지옥 악마 유닛 소집을 가능하게 하고 유닛 배치 지점이 되며 순간이동로로도 기능합니다.', 'Unlocks the drafting of Infernal Fiend units, serves as a unit deployment point, and functions as a teleporter.'),
    kind: 'special', tome: 'tome_demon_gate', cost: { gold: 170, production: 450 }, yields: {},
  });
  TM({
    id: 'tome_demon_gate', name: L('마문의 서', 'Tome of the Demon Gate'), tier: 4, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_4',
    desc: L('균열을 열어 지옥의 종자를 소환하고 지나는 길마다 세상을 불태웁니다.', 'Open rifts to summon Fiends and burn the world in your wake.'),
    passive: { desc: L('아군 지옥 종자 유닛의 사기가 소폭 오릅니다.', 'Friendly fiend units gain a small Morale bonus.'), effects: { morale: 3 } },
    contents: [
      { type: 'spell', id: 'sp_demonic_summoning', cost: kc(4, false) },
      { type: 'spell', id: 'sp_sacrificial_slaughter', cost: kc(4, false) },
      { type: 'spell', id: 'sp_summon_balor', cost: kc(4, false) },
      { type: 'transformation', id: 'tr_demonkin', cost: kc(4, false) },
      { type: 'improvement', id: 'imp_demon_gate', cost: kc(4, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Chaos Lord (T5, +2 Chaos, capstone)
  U({
    id: 'oc_avatar_of_chaos', name: L('혼돈의 화신', 'Avatar of Chaos'), desc: L('군주의 화신으로 전장에 나타나는 소환체.', "A conjured avatar of the ruler that appears on the battlefield."),
    tier: 5, role: 'mage', tags: ['magic_origin', 'mythic', 'fiend'], ...SCOST(0),
    hp: 130, def: 5, res: 6,
    attacks: [{ id: 'chaos_bolt', name: L('혼돈의 화살', 'Chaos Bolt'), type: 'ranged', damage: 22, channel: 'fire', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'weakened', chance: 50 }], props: ['magic'] }],
    abilities: ['defend'], passives: ['fearless'],
    source: { type: 'tome', id: 'tome_chaos_lord' },
    look: { body: 'demon', armor: 'none', weapon: 'staff', helm: 'horned', cape: 'long', shield: 'none', element: 'fire', size: 'large', tint: '#7a1e12' },
  });
  SP({
    id: 'sp_demonic_siphon', name: L('악마의 착취', 'Demonic Siphon'), tier: 5, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('용·정령·지옥 종자 유닛은 다른 유닛이 죽을 때마다 지옥의 힘과 사기 +5를 얻습니다.', 'Dragon, Elemental and Fiend units gain Infernal Might and +5 Morale whenever another unit dies in battle.'),
    cost: { mana: 160, cp: 160 }, upkeep: { mana: 16 },
    enchant: { appliesTo: ['mage', 'shock'], effects: { morale: 1 } },
  });
  SP({
    id: 'sp_demonic_onslaught', name: L('악마의 맹공', 'Demonic Onslaught'), tier: 5, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('공격 측의 모든 유닛이 3턴 동안 살육의 기세와 가속을 얻습니다.', 'All attacking units gain Momentum and Hastened for 3 turns.'),
    cost: { mana: 150, cp: 50 }, target: 'ally_unit', range: 0, area: 5, effect: { type: 'status', status: 'hastened', duration: 3, chance: 100, area: 5 },
  });
  SP({
    id: 'sp_call_forth_avatar_of_chaos', name: L('혼돈의 화신 소환', 'Call Forth Avatar of Chaos'), tier: 5, affinity: { chaos: 2 }, kind: 'combat',
    desc: L('군주의 혼돈의 화신을 전장에 소환합니다. 모든 지옥 종자 유닛의 사기가 10 오릅니다. 군주가 이미 전장에 있으면 사용할 수 없습니다.', "Summons the ruler's Avatar of Chaos onto the battlefield; all Fiend units gain +10 Morale. Cannot be used in battles where the ruler is already present."),
    cost: { mana: 150, cp: 50 }, target: 'hex', range: 0, effect: { type: 'summon', unit: 'oc_avatar_of_chaos', count: 1, temporary: true },
  });
  SP({
    id: 'sp_pact_of_ruin', name: L('파멸의 서약', 'Pact of Ruin'), tier: 5, affinity: { chaos: 2 }, kind: 'unit_enchant',
    desc: L('공격에 역병 피해가 추가되고, 처치한 적마다 지옥의 힘을 얻습니다.', 'Attacks gain bonus Blight damage, and each kill grants Infernal Might.'),
    cost: { mana: 150, cp: 150 }, upkeep: { mana: 15 },
    enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher', 'mage'], effects: { channelDmg_blight: 2 } },
  });
  SP({
    id: 'sp_reign_of_ruin', name: L('파멸의 치세', 'Reign of Ruin'), tier: 5, affinity: { chaos: 2 }, kind: 'empire',
    desc: L('제국 전역의 유닛이 주는 피해가 소폭 늘어나고 유지비가 소폭 줄어듭니다.', 'Empire-wide units deal slightly more damage and cost slightly less upkeep.'),
    cost: { mana: 0, cp: 0 }, target: 'empire', effects: { dmgPct: 3, upkeepPct: -5 },
  });
  HS({
    id: 'hs_ruinous_command', name: L('파멸의 호령', 'Ruinous Command'), desc: L('전투 함성 능력을 얻고, 사용할 때마다 자신도 지옥의 힘 1중첩을 얻습니다.', 'Grants the War Cry ability; using it also grants this unit a stack of Infernal Might.'),
    tier: 5, ability: 'war_cry',
  });
  TM({
    id: 'tome_chaos_lord', name: L('혼돈군주의 서', 'Tome of the Chaos Lord'), tier: 5, affinity: { chaos: 2 }, expansion: null, icon: 'tome_chaos_5',
    desc: L('혼돈의 힘을 세상에 풀어놓습니다. 공격적인 강화 효과에 특화합니다.', 'Unleash chaos forces upon the world. Specialize in offensive buffs.'),
    passive: { desc: L('군주가 이끄는 부대의 모든 유닛이 지옥의 힘 1중첩을 안고 전투를 시작합니다.', "Every unit in the ruler's army starts battle with a stack of Infernal Might."), effects: { dmgPct: 3 } },
    contents: [
      { type: 'spell', id: 'sp_demonic_siphon', cost: kc(5, false) },
      { type: 'spell', id: 'sp_demonic_onslaught', cost: kc(5, false) },
      { type: 'spell', id: 'sp_call_forth_avatar_of_chaos', cost: kc(5, false) },
      { type: 'spell', id: 'sp_pact_of_ruin', cost: kc(5, false) },
      { type: 'spell', id: 'sp_reign_of_ruin', cost: kc(5, false) },
      { type: 'skill', id: 'hs_ruinous_command', cost: kc(5, false) },
    ],
  });

  // ================================================================================================
  // DUAL TOMES (Order- or Chaos-adjacent)
  // ================================================================================================

  // ---------------------------------------------------------------- Tome of the Warband (T1, +1 Chaos +1 Materium)
  U({
    id: 'oc_lieutenant', name: L('부관', 'Lieutenant'), desc: L('스스로의 행동으로 아군을 전투 중 강화하는 전사 유닛.', 'A Fighter unit that empowers others in battle through its own actions.'),
    tier: 2, role: 'fighter', tags: ['infantry'], ...UCOST[2],
    hp: 85, def: 3, res: 2,
    attacks: [{ id: 'strike', name: L('검격', 'Melee Strike'), type: 'melee', damage: 16, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: [] }],
    abilities: ['ab_lieutenant_discern_weakness', 'defend'], passives: [],
    source: { type: 'tome', id: 'tome_warband' },
    look: { body: 'form', armor: 'chain', weapon: 'sword_shield', helm: 'open', cape: 'short', shield: 'round', element: null, size: 'medium', tint: '#c07a2a' },
  });
  AACT('ab_lieutenant_discern_weakness', '약점 간파', 'Discern Weakness', '대상 적을 표식하여 아군의 다음 공격이 더 잘 맞고 더 아프게 들어갑니다.', "Marks the target enemy so the next allied attack against it lands more often and hits harder.",
    { range: 3, target: 'enemy', cooldown: 2, icon: 'mark', effect: { type: 'status', status: 'marked', duration: 2, chance: 100 } });
  SP({
    id: 'sp_commanders_call', name: L('지휘관의 부름', "Commander's Call"), tier: 1, affinity: { chaos: 1, materium: 1 }, kind: 'combat',
    desc: L('주변 1칸의 아군이 임시 체력 15와 사기 +15를 얻습니다.', 'Friendly units within 1 hex heal 15 temporary Hit Points and gain +15 Morale.'),
    cost: { mana: 15, cp: 20 }, target: 'ally_unit', range: 0, area: 1, effect: { type: 'heal', amount: 15, area: 1 },
  });
  SP({
    id: 'sp_training_regimen', name: L('훈련 연대', 'Training Regimen'), tier: 1, affinity: { chaos: 1, materium: 1 }, kind: 'city_enchant',
    desc: L('대상 아군 도시가 매 턴 징집력 40을 추가로 얻습니다.', "The target owned city gains +40 Draft per turn."),
    cost: { mana: 45, cp: 45 }, upkeep: { mana: 10 }, target: 'city', enchant: { effects: { draft: 40 } },
  });
  TR({
    id: 'tr_bred_for_war', name: L('전쟁을 위해 태어남', 'Bred for War'), desc: L('대상 종족을 더 강인하고 전투에 준비된 존재로 만듭니다: 체력 +10, 인접한 아군 하나당 사기 저항 +10%.', 'Makes the target race stronger and more battle-ready: +10 Hit Points, +10% Morale resistance per adjacent friendly unit.'),
    kind: 'minor', tome: 'tome_warband', effects: { hp: 10 },
  });
  HS({
    id: 'hs_mentorship', name: L('사사', 'Mentorship'), desc: L('군세를 이끄는 동안, 경험치가 가장 적은 비영웅 유닛이 세계 지도에서 매 턴 경험치 40을 추가로 얻습니다.', 'While leading the army, the non-Hero unit with the least Experience gains +40 Experience per world turn.'),
    tier: 1, effects: { xpPct: 10 },
  });
  TM({
    id: 'tome_warband', name: L('전쟁단의 서', 'Tome of the Warband'), tier: 1, affinity: { chaos: 1, materium: 1 }, expansion: 'rise_from_ruin', icon: 'tome_chaos_1',
    desc: L('강한 군대를 조직하고 유닛의 계급을 이끌어 올립니다.', 'Build strong martial armies and mentor your units through the ranks.'),
    passive: { desc: L('영웅이 이끄는 부대에서 경험치가 가장 적은 유닛이 서서히 경험치를 더 얻습니다.', 'The least-experienced unit in a hero-led army slowly gains bonus experience.'), effects: {} },
    contents: [
      { type: 'spell', id: 'sp_commanders_call', cost: kc(1, false) },
      { type: 'unit', id: 'oc_lieutenant', cost: kc(1, true) },
      { type: 'skill', id: 'hs_mentorship', cost: kc(1, false) },
      { type: 'transformation', id: 'tr_bred_for_war', cost: kc(1, false) },
      { type: 'spell', id: 'sp_training_regimen', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Blood Rite (T1, +1 Chaos +1 Shadow)
  U({
    id: 'oc_blood_cultist', name: L('피의 광신도', 'Blood Cultist'), desc: L('적에게 혈액 기생체를 옮기고 자신의 생명을 대가로 강화되는 전투 마법사.', 'A Battle Mage that inflicts a Blood Parasite on enemies and can empower itself at the cost of its own life.'),
    tier: 2, role: 'mage', tags: ['infantry'], ...UCOST[2],
    hp: 55, def: 0, res: 2,
    attacks: [{ id: 'hemorrhage_bolts', name: L('출혈의 화살', 'Hemorrhage Bolts'), type: 'ranged', damage: 12, channel: 'physical', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'bleeding', chance: 50 }], props: ['magic'] }],
    abilities: ['ab_blood_cultist_scarlet_plague', 'defend'], passives: [],
    source: { type: 'tome', id: 'tome_blood_rite' },
    look: { body: 'form', armor: 'robe', weapon: 'daggers', helm: 'hood', cape: 'long', shield: 'none', element: 'shadow', size: 'medium', tint: '#3a1a52' },
  });
  AACT('ab_blood_cultist_scarlet_plague', '주홍의 역병', 'Scarlet Plague', '대상 적에게 물리 피해 15를 주고 혈액 기생체 2중첩을 겁니다.', 'Deals 15 Physical damage to the target enemy and inflicts 2 stacks of Blood Parasite.',
    { range: 4, target: 'enemy', cooldown: 1, icon: 'poison', effect: { type: 'damage', channel: 'physical', amount: 15, status: 'st_blood_parasite', chance: 90, duration: 3 } });
  SP({
    id: 'sp_rite_of_bloodletting', name: L('방혈 의식', 'Rite of Bloodletting'), tier: 1, affinity: { chaos: 1, shadow: 1 }, kind: 'combat',
    desc: L('대상 아군이 막을 수 없는 물리 피해 5를 입는 대신, 주변 2칸의 적들이 물리 피해 12를 입고 출혈 2중첩을 얻습니다.', "The target ally takes 5 unblockable Physical damage; in exchange, all enemies within 2 hexes take 12 Physical damage and gain 2 stacks of Bleeding."),
    cost: { mana: 10, cp: 15 }, target: 'ally_unit', range: 3, area: 2, effect: { type: 'damage', channel: 'physical', amount: 12, area: 2, status: { id: 'bleeding', chance: 100, duration: 3 } },
  });
  SP({
    id: 'sp_rite_of_life_leeching', name: L('생명 착취 의식', 'Rite of Life Leeching'), tier: 1, affinity: { chaos: 1, shadow: 1 }, kind: 'combat',
    desc: L('대상 아군이 막을 수 없는 물리 피해 5를 입는 대신, 인접한 아군 모두가 3턴 동안 강화와 생명력 흡수를 얻습니다.', "The target ally takes 5 unblockable Physical damage; in exchange, all adjacent allies gain Strengthened and Life Steal for 3 turns."),
    cost: { mana: 15, cp: 20 }, target: 'ally_unit', range: 3, area: 1, effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100, area: 1 },
  });
  SP({
    id: 'sp_blood_drinking_blades', name: L('피를 마시는 칼날', 'Blood Drinking Blades'), tier: 1, affinity: { chaos: 1, shadow: 1 }, kind: 'unit_enchant',
    desc: L('공격에 물리 피해가 추가되고, 출혈 상태인 적을 맞히면 임시 체력을 회복합니다.', 'Attacks gain bonus Physical damage; hitting a Bleeding target restores temporary HP.'),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter'], effects: { channelDmg_physical: 2, healPerTurn: 1 } },
  });
  SP({
    id: 'sp_sanguine_focus', name: L('핏빛 집중', 'Sanguine Focus'), tier: 1, affinity: { chaos: 1, shadow: 1 }, kind: 'unit_enchant',
    desc: L('지원·전투 마법사 유닛의 공격이 물리 피해를 더하고 60% 확률로 출혈을 새깁니다.', 'Support and Battle Mage attacks gain bonus Physical damage with a 60% chance to inflict Bleeding.'),
    cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 },
    enchant: { appliesTo: ['support', 'mage'], effects: { channelDmg_physical: 1 }, attackStatus: { id: 'bleeding', chance: 60 } },
  });
  IMP({
    id: 'imp_blood_altar', name: L('피의 제단', 'Blood Altar'), desc: L('징집력을 생산하며 인접한 농장마다 늘어나고, 전투에서 승리하면 마나 10을 얻습니다.', 'Generates Draft (more per adjacent Farm); winning a battle grants 10 Mana.'),
    kind: 'special', tome: 'tome_blood_rite', cost: { gold: 60, production: 130 }, yields: { draft: 15 }, adjacencyBonus: { farm: 5 },
  });
  TM({
    id: 'tome_blood_rite', name: L('피의 의식의 서', 'Tome of the Blood Rite'), tier: 1, affinity: { chaos: 1, shadow: 1 }, expansion: 'thrones_of_blood', icon: 'tome_chaos_1',
    desc: L('금단의 위험한 의식으로 아군을 강화하고 적을 피 흘리게 합니다.', 'Perform forbidden and dangerous rites on your units to bleed your enemies and strengthen your allies.'),
    passive: { desc: L('출혈 상태의 적에게 아군 공격이 소폭 더 큰 피해를 줍니다.', 'Friendly attacks deal slightly more damage to Bleeding enemies.'), effects: { dmgPct: 2 } },
    contents: [
      { type: 'spell', id: 'sp_rite_of_bloodletting', cost: kc(1, false) },
      { type: 'spell', id: 'sp_rite_of_life_leeching', cost: kc(1, false) },
      { type: 'unit', id: 'oc_blood_cultist', cost: kc(1, true) },
      { type: 'spell', id: 'sp_blood_drinking_blades', cost: kc(1, false) },
      { type: 'spell', id: 'sp_sanguine_focus', cost: kc(1, false) },
      { type: 'improvement', id: 'imp_blood_altar', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Discipline (T1, +1 Materium +1 Order)
  U({
    id: 'oc_monk', name: L('수도승', 'Monk'), desc: L('강력한 연계 공격을 사용하고 스스로 치유할 수 있는 기동성 있는 전사.', 'A mobile Fighter that unleashes devastating combo attacks and heals itself.'),
    tier: 2, role: 'fighter', tags: ['infantry'], ...UCOST[2],
    hp: 80, def: 3, res: 1,
    attacks: [{ id: 'strike', name: L('연타', 'Melee Strike'), type: 'melee', damage: 15, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 90, strikes: 1, effects: [], props: [] }],
    abilities: ['ab_monk_leap', 'ab_monk_meditate', 'defend'], passives: [],
    source: { type: 'tome', id: 'tome_discipline' },
    look: { body: 'form', armor: 'cloth', weapon: 'daggers', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: '#c9a24a' },
  });
  AACT('ab_monk_leap', '도약', 'Leap', '4칸 이내의 적에게 뛰어들어 물리 피해 12를 줍니다.', 'Leaps up to 4 hexes onto an enemy for 12 Physical damage.',
    { ap: 2, range: 4, target: 'enemy', cooldown: 2, icon: 'boots', effect: { type: 'damage', channel: 'physical', amount: 12 } });
  AACT('ab_monk_meditate', '명상', 'Meditate', '체력 20을 회복합니다.', 'Restores 20 Hit Points.',
    { ap: 3, range: 0, target: 'self', cooldown: 2, icon: 'heal', effect: { type: 'heal', amount: 20 } });
  SP({
    id: 'sp_mantra_of_purification', name: L('정화의 진언', 'Mantra of Purification'), tier: 1, affinity: { materium: 1, order: 1 }, kind: 'combat',
    desc: L('대상 아군의 임시 체력을 15 회복시키고 약화 효과 3개를 없앱니다.', 'Heals the target ally for 15 temporary HP and removes 3 debuffs.'),
    cost: { mana: 5, cp: 10 }, target: 'ally_unit', range: 3, effect: { type: 'heal', amount: 15, cleanse: true },
  });
  SP({
    id: 'sp_empowered_strikes', name: L('강화된 일격', 'Empowered Strikes'), tier: 1, affinity: { materium: 1, order: 1 }, kind: 'unit_enchant',
    desc: L('근접 연속 공격에 물리 피해가 추가되고, 세 번째 공격은 60% 확률로 기절을 새깁니다.', 'Repeating melee attacks gain bonus Physical damage; the third strike has a 60% chance to inflict Stunned.'),
    cost: { mana: 70, cp: 70 }, upkeep: { mana: 7 },
    enchant: { appliesTo: ['shield', 'polearm', 'fighter', 'skirmisher', 'mage'], effects: { channelDmg_physical: 2 } },
  });
  SP({
    id: 'sp_focus_aim', name: L('조준 집중', 'Focus Aim'), tier: 1, affinity: { materium: 1, order: 1 }, kind: 'unit_enchant',
    desc: L('원거리·지원·전투 마법사 유닛에게 절대 빗나가지 않는 공격 능력을 부여합니다.', 'Grants Ranged, Support and Battle Mage units an attack that cannot miss.'),
    cost: { mana: 70, cp: 70 }, upkeep: { mana: 7 },
    enchant: { appliesTo: ['ranged', 'support', 'mage'], effects: { accuracy: 15 } },
  });
  TR({
    id: 'tr_inner_mastery', name: L('내면의 숙련', 'Inner Mastery'), desc: L('대상 종족에게 내적 기운을 다스리는 힘을 줍니다: 상태이상 저항 +1, 전투 중 받는 치유량 +20%.', 'Grants the target race mastery over their own internal energies: +1 Status Resistance, +20% healing received in combat.'),
    kind: 'minor', tome: 'tome_discipline', effects: { statusRes: 1 },
  });
  IMP({
    id: 'imp_monastery', name: L('수도원 회당', 'Monastery'), desc: L('도시 안정도와 징집력을 생산하며 인접한 농장마다 늘어납니다.', 'Generates City Stability and Draft, with more per adjacent Farm.'),
    kind: 'special', tome: 'tome_discipline', cost: { gold: 60, production: 130 }, yields: { stability: 10, draft: 10 }, adjacencyBonus: { farm: 3 },
  });
  TM({
    id: 'tome_discipline', name: L('수련의 서', 'Tome of Discipline'), tier: 1, affinity: { materium: 1, order: 1 }, expansion: 'ways_of_war', icon: 'tome_order_1',
    desc: L('내면의 힘을 다스려 공격을 강화하고 몸을 정화합니다.', 'Channel your inner strength to empower your attacks and cleanse your body.'),
    passive: { desc: L('아군 유닛이 매 턴 종료 시 소량의 상태이상을 정화할 확률을 얻습니다.', 'Friendly units have a chance to cleanse a debuff at the end of their turn.'), effects: {} },
    contents: [
      { type: 'spell', id: 'sp_mantra_of_purification', cost: kc(1, false) },
      { type: 'unit', id: 'oc_monk', cost: kc(1, true) },
      { type: 'spell', id: 'sp_empowered_strikes', cost: kc(1, false) },
      { type: 'spell', id: 'sp_focus_aim', cost: kc(1, false) },
      { type: 'transformation', id: 'tr_inner_mastery', cost: kc(1, false) },
      { type: 'improvement', id: 'imp_monastery', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Abjuration (T1, +1 Order +1 Astral)
  U({
    id: 'oc_abjurer_pylon', name: L('방호술사의 기둥', 'Abjurer Pylon'), desc: L('시전 즉시 나타나 아군에게 마법 보호막을 씌우는 소환체.', 'A conjured pylon that casts a magic shield on friendly units.'),
    tier: 2, role: 'support', tags: ['magic_origin', 'construct'], ...SCOST(5),
    hp: 70, def: 2, res: 2,
    attacks: [{ id: 'ward_bolt', name: L('보호의 화살', 'Ward Bolt'), type: 'ranged', damage: 8, channel: 'spirit', range: 3, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['bolster'], passives: ['construct'],
    source: { type: 'tome', id: 'tome_abjuration' },
    look: { body: 'golem', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'small', glow: '#5a7ff0' },
  });
  SP({
    id: 'sp_city_wards', name: L('도시 결계', 'City Wards'), tier: 1, affinity: { order: 1, astral: 1 }, kind: 'city_enchant',
    desc: L('대상 아군 도시(또는 적대적이지 않은 자유 도시)가 도시 안정도 +10과 요새 체력 +10을 얻습니다.', 'The target owned city (or non-hostile Free City) gains +10 City Stability and +10 Fortification Health.'),
    cost: { mana: 45, cp: 45 }, upkeep: { mana: 10 }, target: 'city', enchant: { effects: { stability: 10, wallHp: 10 } },
  });
  SP({
    id: 'sp_curse_reversal', name: L('저주 반전', 'Curse Reversal'), tier: 1, affinity: { order: 1, astral: 1 }, kind: 'combat',
    desc: L('대상 아군의 약화 효과를 없애며, 해당 효과에 상응하는 강화 효과가 있으면 그것을 부여합니다.', "Removes the target ally's debuffs; if a removed debuff has a positive counter, grants that instead."),
    cost: { mana: 10, cp: 15 }, target: 'ally_unit', range: 3, effect: { type: 'heal', amount: 0, cleanse: true },
  });
  SP({
    id: 'sp_abjure_violence', name: L('폭력 억제', 'Abjure Violence'), tier: 1, affinity: { order: 1, astral: 1 }, kind: 'combat',
    desc: L('대상 적을 기본 120% 확률로 1턴간 평정 상태로 만듭니다. 대상이 잃은 체력이 많을수록 확률이 낮아집니다.', "The target enemy has a base 120% chance of becoming Pacified for 1 turn; the chance drops as the target's lost HP increases."),
    cost: { mana: 10, cp: 15 }, target: 'enemy_unit', range: 4, effect: { type: 'status', status: 'st_pacified', duration: 1, chance: 100 },
  });
  SP({
    id: 'sp_abjurer_glyphs', name: L('방호술사의 룬문자', 'Abjurer Glyphs'), tier: 1, affinity: { order: 1, astral: 1 }, kind: 'unit_enchant',
    desc: L('원거리·지원·전투 마법사·척후병 유닛이 체력 60%, 30%에 도달하면 예지를 얻습니다.', 'Ranged, Support, Battle Mage and Skirmisher units gain Precognition when their Hit Points drop to 60% and 30%.'),
    cost: { mana: 70, cp: 70 }, upkeep: { mana: 7 },
    enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: {} },
  });
  SP({
    id: 'sp_conjure_abjurer_pylon', name: L('방호술사의 기둥 강림', 'Conjure Abjurer Pylon'), tier: 1, affinity: { order: 1, astral: 1 }, kind: 'combat',
    desc: L('대상 칸에 방호술사의 기둥을 소환합니다. 3턴간 지속되며 수중 전투에서는 사용할 수 없습니다.', 'Conjures an Abjurer Pylon on the target hex, lasting 3 turns. Cannot be used in Water battles.'),
    cost: { mana: 15, cp: 20 }, target: 'hex', range: 4, effect: { type: 'summon', unit: 'oc_abjurer_pylon', count: 1, temporary: true, duration: 3 },
  });
  SP({
    id: 'sp_mage_armor', name: L('마법사의 갑옷', 'Mage Armor'), tier: 1, affinity: { order: 1, astral: 1 }, kind: 'unit_enchant',
    desc: L('지원·전투 마법사 유닛에게 방어력 +1과 상태이상 저항 +2를 부여합니다.', 'Grants Support and Battle Mage units +1 Defense and +2 Status Resistance.'),
    cost: { mana: 70, cp: 70 }, upkeep: { mana: 7 },
    enchant: { appliesTo: ['support', 'mage'], effects: { def: 1, statusRes: 2 } },
  });
  IMP({
    id: 'imp_glyph_tower', name: L('룬문자 탑', 'Glyph Tower'), desc: L('도시 안정도와 징집력을 생산하며, 인접한 지원 시설이나 연구소마다 안정도와 요새 체력이 늘어납니다.', 'Generates City Stability and Draft; more Stability and Fortification Health per adjacent Conduit or Research Post.'),
    kind: 'special', tome: 'tome_abjuration', cost: { gold: 100, production: 250 }, yields: { stability: 10, draft: 10 },
  });
  TM({
    id: 'tome_abjuration', name: L('방호의 서', 'Tome of Abjuration'), tier: 1, affinity: { order: 1, astral: 1 }, expansion: 'secrets_of_the_archmages', icon: 'tome_order_1',
    desc: L('결계와 보호막을 만들어 아군을 지켜냅니다.', 'Create wards and protections to preserve your units.'),
    passive: { desc: L('아군 유닛이 상태이상 저항을 소폭 얻습니다.', 'Friendly units gain a small amount of Status Resistance.'), effects: { statusRes: 1 } },
    contents: [
      { type: 'spell', id: 'sp_city_wards', cost: kc(1, false) },
      { type: 'spell', id: 'sp_curse_reversal', cost: kc(1, false) },
      { type: 'spell', id: 'sp_abjure_violence', cost: kc(1, false) },
      { type: 'spell', id: 'sp_abjurer_glyphs', cost: kc(1, false) },
      { type: 'spell', id: 'sp_conjure_abjurer_pylon', cost: kc(1, false) },
      { type: 'spell', id: 'sp_mage_armor', cost: kc(1, false) },
      { type: 'improvement', id: 'imp_glyph_tower', cost: kc(1, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Construct (T2, +1 Materium +1 Order)
  U({
    id: 'oc_bronze_golem', name: L('청동 골렘', 'Bronze Golem'), desc: L('약화 효과를 새기는 장병기병 구조물 유닛.', 'A Polearm unit capable of inflicting Weakened.'),
    tier: 3, role: 'polearm', tags: ['construct'], ...UCOST[3],
    hp: 100, def: 5, res: 2, statusRes: { blight: 3 },
    attacks: [{ id: 'weakening_cleave', name: L('약화의 베기', 'Weakening Cleave'), type: 'melee', damage: 18, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [{ status: 'weakened', chance: 60 }], props: [] }],
    abilities: ['defend'], passives: ['pike_brace', 'control_immunity', 'first_strike', 'heartless', 'construct'],
    source: { type: 'tome', id: 'tome_construct' },
    look: { body: 'golem', armor: 'none', weapon: 'halberd', helm: 'none', cape: false, shield: 'none', element: 'stone', size: 'large', tint: '#b47a3a' },
  });
  SP({
    id: 'sp_cascading_command_defend', name: L('연쇄 명령: 방어', 'Cascading Command: Defend'), tier: 2, affinity: { materium: 1, order: 1 }, kind: 'combat',
    desc: L('대상 구조물 아군이 1턴간 방어의 달인 상태와 약화 효과 정화 2회를 얻습니다. 인접한 구조물 아군에게도 연쇄됩니다.', 'The target Construct ally gains Defensive Masters for 1 turn and 2 debuffs cleansed; the effect then cascades to adjacent Construct allies.'),
    cost: { mana: 30, cp: 25 }, target: 'ally_unit', range: 0, area: 1, effect: { type: 'status', status: 'fortified', duration: 1, chance: 100, area: 1, cleanse: true },
  });
  SP({
    id: 'sp_cascading_command_reposition', name: L('연쇄 명령: 재배치', 'Cascading Command: Reposition'), tier: 2, affinity: { materium: 1, order: 1 }, kind: 'combat',
    desc: L('대상 구조물 아군이 가속과 강화를 얻습니다. 인접한 구조물 아군에게도 연쇄됩니다.', 'The target Construct ally gains Hastened and Strengthened; the effect then cascades to adjacent Construct allies.'),
    cost: { mana: 30, cp: 25 }, target: 'ally_unit', range: 0, area: 1, effect: { type: 'status', status: 'hastened', duration: 3, chance: 100, area: 1 },
  });
  SP({
    id: 'sp_compounding_defense', name: L('복합 방어', 'Compounding Defense'), tier: 2, affinity: { materium: 1, order: 1 }, kind: 'unit_enchant',
    desc: L('같은 마법이 걸린 유닛과 인접하면 방어력·저항력이 각 1씩 오릅니다.', 'When adjacent to another unit with this enchantment, gains +1 Defense and +1 Resistance.'),
    cost: { mana: 100, cp: 100 }, upkeep: { mana: 10 },
    enchant: { appliesTo: ['shield', 'polearm', 'fighter', 'mage'], effects: { def: 1, res: 1 } },
  });
  TR({
    id: 'tr_linked_minds', name: L('연결된 정신', 'Linked Minds'), desc: L('대상 종족에게 감각을 공유하는 능력을 부여합니다: 구조물 유닛이나 다른 연결된 정신 소유자 곁에 있으면 초고도 인지를 얻습니다.', 'Grants the target race the ability to share senses: standing next to a Construct or another Linked Minds unit grants Hyper-Awareness.'),
    kind: 'minor', tome: 'tome_construct', effects: {},
  });
  IMP({
    id: 'imp_construct_nexus', name: L('구조물 연결점', 'Construct Nexus'), desc: L('생산력을 생산하며 인접한 채석장·벌목장·정수로·연구소·광산마다 다양한 자원이 추가됩니다.', 'Generates Production, plus a variety of extra resources per adjacent Quarry, Forester, Conduit, Research Post or Mine.'),
    kind: 'special', tome: 'tome_construct', cost: { gold: 100, production: 250 }, yields: { production: 10 },
  });
  TM({
    id: 'tome_construct', name: L('구조물의 서', 'Tome of the Construct'), tier: 2, affinity: { materium: 1, order: 1 }, expansion: 'empires_and_ashes', icon: 'tome_order_2',
    desc: L('일사불란하게 움직이는 구조물 군단을 지휘하여 발밑에 적을 짓밟습니다.', 'Master legions of constructs, fighting in uncannily synchronized formations, crushing your foes beneath the march of their boots.'),
    passive: { desc: L('아군 구조물 유닛이 서로 인접할 때 소량의 방어력을 얻습니다.', 'Friendly Construct units gain a small amount of Defense when adjacent to one another.'), effects: { def: 1 } },
    contents: [
      { type: 'spell', id: 'sp_cascading_command_defend', cost: kc(2, false) },
      { type: 'spell', id: 'sp_cascading_command_reposition', cost: kc(2, false) },
      { type: 'unit', id: 'oc_bronze_golem', cost: kc(2, true) },
      { type: 'spell', id: 'sp_compounding_defense', cost: kc(2, false) },
      { type: 'transformation', id: 'tr_linked_minds', cost: kc(2, false) },
      { type: 'improvement', id: 'imp_construct_nexus', cost: kc(2, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Cleansing Flame (T3, +1 Order +1 Chaos)
  U({
    id: 'oc_pyre_templar', name: L('화톳불 성전사', 'Pyre Templar'), desc: L('휩쓰는 일격으로 화상을 새기는 열의 가득한 장병기병.', 'A zealous Polearm unit whose sweeping strikes inflict Burning.'),
    tier: 4, role: 'polearm', tags: ['infantry'], ...UCOST[4],
    hp: 110, def: 5, res: 3, statusRes: { fire: 7 },
    attacks: [{ id: 'fire_cleave', name: L('화염의 베기', 'Fire Cleave'), type: 'melee', damage: 22, channel: 'fire', range: 1, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [{ status: 'burning', chance: 60 }], props: [] }],
    abilities: ['defend'], passives: ['pike_brace', 'first_strike', 'immune_fire'],
    source: { type: 'tome', id: 'tome_cleansing_flame' },
    look: { body: 'form', armor: 'heavy_plate', weapon: 'halberd', helm: 'full', cape: 'long', shield: 'none', element: 'fire', size: 'medium', tint: '#e8c357' },
  });
  SP({
    id: 'sp_pureflame_staves', name: L('순정 화염의 지팡이', 'Pureflame Staves'), tier: 3, affinity: { order: 1, chaos: 1 }, kind: 'unit_enchant',
    desc: L('지원·전투 마법사 유닛의 마법 공격이 60% 확률로 단죄를 새기고 대상 칸에 정화의 불꽃을 만듭니다.', 'Support and Battle Mage magic attacks have a 60% chance to inflict Condemned and create Cleansing Flames on the target hex.'),
    cost: { mana: 140, cp: 140 }, upkeep: { mana: 14 },
    enchant: { appliesTo: ['support', 'mage'], effects: {}, attackStatus: { id: 'condemned', chance: 60 } },
  });
  SP({
    id: 'sp_zealous_ignition', name: L('열의의 점화', 'Zealous Ignition'), tier: 3, affinity: { order: 1, chaos: 1 }, kind: 'combat',
    desc: L('대상 아군이 전투가 끝날 때까지 열의를 얻고(이미 있다면 강화 2중첩), 주변 2칸의 적들은 전투가 끝날 때까지 단죄됩니다.', "The target ally gains Zeal until the end of battle (or 2 stacks of Strengthened if it already has Zeal); enemies within 2 hexes become Condemned until the end of battle."),
    cost: { mana: 45, cp: 30 }, target: 'ally_unit', range: 3, area: 2, effect: { type: 'status', status: 'strengthened', duration: 0, chance: 100, area: 2 },
  });
  SP({
    id: 'sp_consecrating_firestorm', name: L('축성의 화염폭풍', 'Consecrating Firestorm'), tier: 3, affinity: { order: 1, chaos: 1 }, kind: 'strategic',
    desc: L('대상 지방의 적 유닛에게 영혼 피해 20을 주고 그 지방에 3턴 동안 축성의 화염폭풍이 몰아치며, 적 개선물이 있다면 약탈됩니다.', "Deals 20 Spirit damage to enemy units in the target province, wreathes it in Consecrating Firestorm for 3 turns, and Pillages any enemy improvement there."),
    cost: { mana: 100, cp: 100 }, target: 'province', range: 0, effect: { type: 'damage', channel: 'spirit', amount: 20 },
  });
  SP({
    id: 'sp_flame_blessed_champions', name: L('화염의 축복받은 용사', 'Flame Blessed Champions'), tier: 3, affinity: { order: 1, chaos: 1 }, kind: 'unit_enchant',
    desc: L('방패병·장병기병·돌격병·전사 유닛의 근접 공격이 60% 확률로 화상을 새기고 대상 칸에 정화의 불꽃을 만듭니다.', 'Shield, Polearm, Shock and Fighter melee attacks have a 60% chance to inflict Burning and create Cleansing Flames on the target hex.'),
    cost: { mana: 160, cp: 160 }, upkeep: { mana: 16 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter'], effects: {}, attackStatus: { id: 'burning', chance: 60 } },
  });
  IMP({
    id: 'imp_pyreshrine', name: L('화톳불 성소', 'Pyreshrine'), desc: L('금을 생산하며 인접한 벌목장마다 징집력이 늘어나고, 이 도시에서 생산된 유닛은 신실함을 얻습니다.', 'Generates Gold (more Draft per adjacent Forester); units produced in this city gain Faithful.'),
    kind: 'special', tome: 'tome_cleansing_flame', cost: { gold: 100, production: 250 }, yields: { gold: 15 }, adjacencyBonus: { forester: 5 },
  });
  TM({
    id: 'tome_cleansing_flame', name: L('정화의 화염의 서', 'Tome of the Cleansing Flame'), tier: 3, affinity: { order: 1, chaos: 1 }, expansion: 'eldritch_realms', icon: 'tome_order_3',
    desc: L('병사들의 열의를 이용해 전장을 정화의 불꽃으로 물들여 단죄받은 자를 벌하고 신실한 자를 축복합니다.', 'Utilize the zeal of your troops to bathe the battlefield in cleansing flame that punishes the condemned and blesses the faithful.'),
    passive: { desc: L('아군 유닛이 화염과 영혼 피해에 대한 저항을 소폭 얻습니다.', 'Friendly units gain a small amount of Fire and Spirit protection.'), effects: { statusRes_fire: 1, statusRes_spirit: 1 } },
    contents: [
      { type: 'spell', id: 'sp_pureflame_staves', cost: kc(3, false) },
      { type: 'spell', id: 'sp_zealous_ignition', cost: kc(3, false) },
      { type: 'spell', id: 'sp_consecrating_firestorm', cost: kc(3, false) },
      { type: 'spell', id: 'sp_flame_blessed_champions', cost: kc(3, false) },
      { type: 'unit', id: 'oc_pyre_templar', cost: kc(3, true) },
      { type: 'improvement', id: 'imp_pyreshrine', cost: kc(3, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Prophecies (T3, +1 Order +1 Astral)
  U({
    id: 'oc_oracle', name: L('신탁자', 'Oracle'), desc: L('미래를 내다보고 그 지식으로 아군을 강화하고 보호하는 지원 유닛.', 'A Support unit that can foresee the future and use that knowledge to strengthen and protect other units.'),
    tier: 4, role: 'support', tags: ['infantry'], ...UCOST[4],
    hp: 100, def: 3, res: 5, statusRes: { spirit: 9 },
    attacks: [{ id: 'mystic_blast', name: L('신비한 작렬', 'Mystic Blast'), type: 'ranged', damage: 16, channel: 'spirit', range: 4, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['ab_oracle_healing_portent', 'ab_oracle_striking_portent', 'defend'], passives: ['true_sight'],
    source: { type: 'tome', id: 'tome_prophecies' },
    look: { body: 'form', armor: 'robe', weapon: 'orb', helm: 'circlet', cape: 'long', shield: 'none', element: 'arcane', size: 'medium', glow: '#5a7ff0' },
  });
  AACT('ab_oracle_healing_portent', '치유의 전조', 'Healing Portent', '대상 아군의 체력을 20 회복시키고 다음 피격을 예지합니다.', "Heals the target ally for 20 HP and grants it Precognition against its next hit.",
    { range: 3, target: 'ally', cooldown: 2, icon: 'heal', effect: { type: 'heal', amount: 20, status: 'st_precognition', chance: 100, duration: 1 } });
  AACT('ab_oracle_striking_portent', '타격의 전조', 'Striking Portent', '대상 아군의 다음 공격 명중률과 치명타 확률이 오릅니다.', "Improves the target ally's accuracy and critical chance on its next attack.",
    { range: 3, target: 'ally', cooldown: 2, icon: 'star', effect: { type: 'status', status: 'focused', duration: 1, chance: 100 } });
  SP({
    id: 'sp_battle_divination', name: L('전투 예지', 'Battle Divination'), tier: 3, affinity: { order: 1, astral: 1 }, kind: 'combat',
    desc: L('시전 시와 이후 2턴 동안, 모든 아군이 회피 +25%를 얻고 예지 상태가 되며 피해가 20% 증가합니다.', 'On cast and for the next 2 turns, all friendly units gain +25% Evasion, Precognition, and +20% damage.'),
    cost: { mana: 80, cp: 35 }, target: 'ally_unit', range: 0, area: 5, effect: { type: 'status', status: 'st_precognition', duration: 2, chance: 100, area: 5 },
  });
  SP({
    id: 'sp_fateful_imbuement', name: L('운명의 주입', 'Fateful Imbuement'), tier: 3, affinity: { order: 1, astral: 1 }, kind: 'unit_enchant',
    desc: L('원거리·지원·전투 마법사·척후병 유닛에게 치명타 확률 +20%와 신실함(유지비 감소)을 부여합니다.', 'Grants Ranged, Support, Battle Mage and Skirmisher units +20% critical hit chance and Faithful (reduced upkeep).'),
    cost: { mana: 100, cp: 100 }, upkeep: { mana: 10 },
    enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: { critChance: 20, upkeepPct: -10 } },
  });
  SP({
    id: 'sp_prescient_circlets', name: L('예지의 원환', 'Prescient Circlets'), tier: 3, affinity: { order: 1, astral: 1 }, kind: 'unit_enchant',
    desc: L('방패병·장병기병·돌격병·전사·척후병 유닛이 방어 태세에 들어갈 때 예지를 얻습니다.', 'Shield, Polearm, Shock, Fighter and Skirmisher units gain Precognition when entering Defense Mode.'),
    cost: { mana: 100, cp: 100 }, upkeep: { mana: 10 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher'], effects: {} },
  });
  IMP({
    id: 'imp_temple_of_the_prophet', name: L('예언자의 신전', 'Temple of the Prophet'), desc: L('마나를 생산하며 인접한 정수로마다 지식이 늘어납니다.', 'Generates Mana, with more Knowledge per adjacent Conduit.'),
    kind: 'special', tome: 'tome_prophecies', cost: { gold: 100, production: 250 }, yields: { mana: 15 },
  });
  TM({
    id: 'tome_prophecies', name: L('예언의 서', 'Tome of Prophecies'), tier: 3, affinity: { order: 1, astral: 1 }, expansion: 'archon_prophecy', icon: 'tome_order_3',
    desc: L('적의 공격을 미리 막아내고 그들의 몰락을 내다봅니다.', 'Prevent enemy attacks and foresee the downfall of your enemies.'),
    passive: { desc: L('아군 유닛의 치명타 확률이 소폭 오릅니다.', 'Friendly units gain a small critical hit chance bonus.'), effects: { critChance: 2 } },
    contents: [
      { type: 'spell', id: 'sp_battle_divination', cost: kc(3, false) },
      { type: 'spell', id: 'sp_fateful_imbuement', cost: kc(3, false) },
      { type: 'spell', id: 'sp_prescient_circlets', cost: kc(3, false) },
      { type: 'unit', id: 'oc_oracle', cost: kc(3, true) },
      { type: 'improvement', id: 'imp_temple_of_the_prophet', cost: kc(3, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Revenant (T4, +1 Order +1 Shadow)
  U({
    id: 'oc_fallen_angel', name: L('타락한 천사', 'Fallen Angel'), desc: L('부패와 타락을 퍼뜨리는 전투 마법사 유닛.', 'A Battle Mage unit that causes decay and corruption.'),
    tier: 5, role: 'mage', tags: ['magic_origin', 'mythic', 'angelic', 'undead', 'flying'], move: 'fly', mp: 44, ...SCOST(20),
    hp: 150, def: 6, res: 6,
    attacks: [{ id: 'decay_bolt', name: L('부패의 화살', 'Decay Bolt'), type: 'ranged', damage: 24, channel: 'blight', range: 4, ap: 1, repeat: 1, accuracy: 88, strikes: 1, effects: [{ status: 'blighted', chance: 60 }], props: ['magic'] }],
    abilities: ['defend'], passives: ['flying', 'undying'],
    source: { type: 'tome', id: 'tome_revenant' },
    look: { body: 'angel', armor: 'none', weapon: 'staff', helm: 'none', cape: 'long', shield: 'none', element: 'shadow', size: 'large', tint: '#3a1a52' },
  });
  SP({
    id: 'sp_revenant_whispers', name: L('망자의 속삭임', 'Revenant Whispers'), tier: 4, affinity: { order: 1, shadow: 1 }, kind: 'strategic',
    desc: L('1턴 동안 대상 적 부대에게 사기 저하 2중첩을 걸고, 공격받을 때마다 공격 측에 해골 전사 세 명을 소환합니다.', "For 1 turn, the target enemy army gains 2 stacks of Demoralized; whenever it is attacked, 3 Skeletons are conjured on the attacker's side."),
    cost: { mana: 60, cp: 100 }, target: 'army', range: 0, effect: { type: 'status', status: 'demoralized', duration: 1, chance: 100 },
  });
  SP({
    id: 'sp_undead_resentment', name: L('언데드의 원한', 'Undead Resentment'), tier: 4, affinity: { order: 1, shadow: 1 }, kind: 'unit_enchant',
    desc: L('언데드 유닛에게 화염·영혼 보호 +2와 잔혹한 살해자를 부여합니다.', 'Grants Undead units +2 Fire protection, +2 Spirit protection, and Vicious Killer.'),
    cost: { mana: 140, cp: 140 }, upkeep: { mana: 14 },
    enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher', 'mage', 'support'], effects: { statusRes_fire: 2, statusRes_spirit: 2 } },
  });
  SP({
    id: 'sp_unholy_champion', name: L('불경한 용사', 'Unholy Champion'), tier: 4, affinity: { order: 1, shadow: 1 }, kind: 'combat',
    desc: L('대상 아군이 피해 +50%와 불사, 절망의 갑옷을 얻습니다. 시전 시 주변 2칸의 적들이 사기 10을 잃습니다.', 'The target ally gains +50% damage, Undying and Armor of Despair; on cast, enemies within 2 hexes lose 10 Morale.'),
    cost: { mana: 35, cp: 40 }, target: 'ally_unit', range: 3, area: 2, effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100 },
  });
  SP({
    id: 'sp_summon_fallen_angel', name: L('타락한 천사 소환', 'Summon Fallen Angel'), tier: 4, affinity: { order: 1, shadow: 1 }, kind: 'summon',
    desc: L('대상 칸에 부패와 타락을 퍼뜨리는 타락한 천사를 소환합니다.', 'Summons a Fallen Angel, causing decay and corruption, onto the target hex.'),
    cost: { mana: 150, cp: 300 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_fallen_angel', count: 1 },
  });
  IMP({
    id: 'imp_necropolis', name: L('네크로폴리스', 'Necropolis'), desc: L('영혼을 생산하며 인접한 연구소마다 늘어나고, 해골·타락한 영혼·언데드 타이탄 유닛 소집을 가능하게 합니다.', 'Generates Souls (more per adjacent Research Post) and unlocks drafting Skeletons, Corrupt Souls and Undead Titans.'),
    kind: 'special', tome: 'tome_revenant', cost: { gold: 280, production: 750 }, yields: { knowledge: 4 },
  });
  TM({
    id: 'tome_revenant', name: L('망자의 서', 'Tome of the Revenant'), tier: 4, affinity: { order: 1, shadow: 1 }, expansion: 'archon_prophecy', icon: 'tome_order_4',
    desc: L('타락한 언데드 아르콘의 군대를 일으키고, 그 지식으로 언데드가 몇 번이고 되살아나게 합니다.', 'Raise an army of corrupted and undead Archons and use their knowledge to make your undead come back again and again.'),
    passive: { desc: L('영혼 수확: 전투에서 적이 죽을 때마다 영혼을 얻습니다. 도시 폐허를 되살리고 지하 묘지의 영웅을 언데드 하인으로 되살릴 수 있습니다.', 'Soul Harvest: gain Souls when enemies die in battle. Unlocks animating City Ruins and Heroes in your crypt as undead servants.'), effects: {} },
    contents: [
      { type: 'spell', id: 'sp_revenant_whispers', cost: kc(4, false) },
      { type: 'spell', id: 'sp_undead_resentment', cost: kc(4, false) },
      { type: 'spell', id: 'sp_unholy_champion', cost: kc(4, false) },
      { type: 'spell', id: 'sp_summon_fallen_angel', cost: kc(4, false) },
      { type: 'improvement', id: 'imp_necropolis', cost: kc(4, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of the Crimson Reign (T4, +1 Chaos +1 Shadow)
  U({
    id: 'oc_blood_exarch', name: L('피의 대주교', 'Blood Exarch'), desc: L('하위 등급 유닛을 유린하는 강력한 지원·공격 신화 유닛.', 'A Mythic unit with powerful support and offensive abilities that devastate low tier units.'),
    tier: 5, role: 'mage', tags: ['mythic', 'undead'], ...SCOST(20),
    hp: 160, def: 6, res: 6,
    attacks: [{ id: 'crimson_bolt', name: L('진홍의 화살', 'Crimson Bolt'), type: 'ranged', damage: 26, channel: 'physical', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'st_blood_parasite', chance: 60 }], props: ['magic'] }],
    abilities: ['defend'], passives: ['life_steal', 'undying'],
    source: { type: 'tome', id: 'tome_crimson_reign' },
    look: { body: 'form', armor: 'ceremonial', weapon: 'staff', helm: 'crown', cape: 'long', shield: 'none', element: 'shadow', size: 'large', tint: '#7a1e12' },
  });
  SP({
    id: 'sp_tears_of_the_crimson_sovereign', name: L('진홍 군주의 눈물', 'Tears of the Crimson Sovereign'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'combat',
    desc: L('시전 시와 이후 2턴 동안, 최대 3명의 적이 물리 피해 10을 입고 90% 확률로 혈액 기생체를 얻으며, 최대 3명의 아군이 임시 체력 10을 얻고 행운을 얻습니다.', "On cast and for the next 2 turns, up to 3 enemies take 10 Physical damage with a base 90% chance of Blood Parasite, while up to 3 allies heal 10 temporary HP and gain Fortune."),
    cost: { mana: 80, cp: 35 }, target: 'enemy_unit', range: 4, effect: { type: 'damage', channel: 'physical', amount: 10, status: { id: 'st_blood_parasite', chance: 90, duration: 3 } },
  });
  SP({
    id: 'sp_mantle_of_the_blood_noble', name: L('피의 귀족의 망토', 'Mantle of the Blood Noble'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'unit_enchant',
    desc: L('전투 시작 시, 소환수가 아닌 1·2등급 아군 하나당 체력 +5와 전투 중 받는 치유 +5%를 얻습니다.', 'At the start of combat, gains +5 Hit Points and +5% healing received per friendly non-summon Tier I/II unit.'),
    cost: { mana: 140, cp: 140 }, upkeep: { mana: 14 },
    enchant: { appliesTo: ['shield', 'ranged', 'polearm', 'shock', 'fighter', 'skirmisher', 'mage'], effects: { hp: 10, healPct: 5 } },
  });
  SP({
    id: 'sp_crimson_court', name: L('진홍 궁정', 'Crimson Court'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'city_enchant',
    desc: L('대상 도시의 3·4·5등급 아군 유닛이 세계 지도에서 체력 회복과 경험치 획득이 늘어납니다.', "Tier III, IV and V units owned by the target city gain bonus Hit Point regeneration and Experience on the world map."),
    cost: { mana: 170, cp: 170 }, upkeep: { mana: 0 }, target: 'city', enchant: { effects: { xpPct: 10 } },
  });
  SP({
    id: 'sp_summon_blood_exarch', name: L('피의 대주교 소환', 'Summon Blood Exarch'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'summon',
    desc: L('강력한 지원·공격 신화 유닛인 피의 대주교를 소환합니다.', 'Summons a Blood Exarch, a Mythic unit with powerful support and offensive abilities.'),
    cost: { mana: 300, cp: 300 }, target: 'hex', range: 6, effect: { type: 'summon', unit: 'oc_blood_exarch', count: 1 },
  });
  TR({
    id: 'tr_gift_of_the_old_blood', name: L('옛 피의 선물', 'Gift of the Old Blood'), desc: L('대상 종족이 옛 피를 의식적으로 마셔 언데드가 됩니다: 생명력 흡수와 60% 확률로 혈액 기생체를 새기는 기본 공격을 얻습니다.', 'The target race ritually imbibes the old blood, becoming Undead: gains Lifedrinker, with base attacks having a 60% chance to inflict Blood Parasite.'),
    kind: 'major', tome: 'tome_crimson_reign', effects: {},
  });
  TM({
    id: 'tome_crimson_reign', name: L('진홍 왕조의 서', 'Tome of the Crimson Reign'), tier: 4, affinity: { chaos: 1, shadow: 1 }, expansion: 'thrones_of_blood', icon: 'tome_chaos_4',
    desc: L('잊혀진 타락한 마법을 받아들여 고위 유닛을 강화하고, 고대의 불사를 통해 적에게 혈액 기생체를 퍼뜨립니다.', 'Embrace a forgotten and corrupt magic that empowers your high tier units and spreads Blood Parasites onto your enemies through an ancient form of undeath.'),
    passive: { desc: L('아군 유닛이 처치할 때마다 소량의 체력을 회복합니다.', 'Friendly units recover a small amount of HP whenever they land a kill.'), effects: { healPerTurn: 1 } },
    contents: [
      { type: 'spell', id: 'sp_tears_of_the_crimson_sovereign', cost: kc(4, false) },
      { type: 'transformation', id: 'tr_gift_of_the_old_blood', cost: kc(4, false) },
      { type: 'spell', id: 'sp_mantle_of_the_blood_noble', cost: kc(4, false) },
      { type: 'spell', id: 'sp_crimson_court', cost: kc(4, false) },
      { type: 'spell', id: 'sp_summon_blood_exarch', cost: kc(4, false) },
    ],
  });

  // ---------------------------------------------------------------- Tome of Calamity (T4, +1 Chaos +1 Shadow)
  U({
    id: 'oc_calamity_dragon', name: L('재앙의 용', 'Calamity Dragon'), desc: L('강력한 공격 능력을 지닌 신화 유닛.', 'A Mythic unit with strong offensive capabilities.'),
    tier: 5, role: 'mage', tags: ['mythic', 'dragon', 'flying'], move: 'fly', mp: 48, ...UCOST[5],
    hp: 150, def: 6, res: 7,
    attacks: [{ id: 'ghostfire_spike', name: L('유령불 가시', 'Ghostfire Spike'), type: 'ranged', damage: 26, channel: 'frost', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'st_ghostfire', chance: 60 }], props: ['magic'] }],
    abilities: ['dragon_breath_frost', 'defend'], passives: ['flying', 'immune_frost'],
    source: { type: 'tome', id: 'tome_calamity' },
    look: { body: 'dragon', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'frost', size: 'huge', tint: '#3a1a52' },
  });
  SP({
    id: 'sp_comet_of_calamity', name: L('재앙의 혜성', 'Comet of Calamity'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'combat',
    desc: L('주변 2칸의 유닛들이 화염 피해 15와 냉기 피해 15를 입고 기본 50% 확률로 빙결되며 유령불 2중첩을 얻습니다.', 'Units within 2 hexes take 15 Fire and 15 Frost damage, have a base 50% chance of becoming Frozen, and gain 2 stacks of Ghostfire.'),
    cost: { mana: 100, cp: 40 }, target: 'hex', range: 4, area: 2, effect: { type: 'damage', channel: 'frost', amount: 15, area: 2, status: { id: 'frozen', chance: 50, duration: 1 } },
  });
  SP({
    id: 'sp_desecrate_land', name: L('땅의 모독', 'Desecrate Land'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'transform',
    desc: L('대상 지방의 개선물을 약탈해 그 보상을 얻고 정렬이 낮아지며, 지방이 황무지로 변합니다.', "Pillages the target province's improvement for its rewards (lowering Alignment) and turns the province into Ashlands."),
    cost: { mana: 60, cp: 60 }, target: 'province', range: 0, effect: { type: 'terraform', terrain: 'volcanic', feature: 'ash', radius: 0 },
  });
  SP({
    id: 'sp_accursed_armors', name: L('저주받은 갑옷', 'Accursed Armors'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'unit_enchant',
    desc: L('근접 공격을 받아치면 공격자에게 60% 확률로 불운을 걸고, 방어력 +1을 얻습니다.', 'When hit by a melee attack, has a 60% chance to inflict Misfortune on the attacker; also gains +1 Defense.'),
    cost: { mana: 120, cp: 120 }, upkeep: { mana: 12 },
    enchant: { appliesTo: ['shield', 'polearm', 'shock', 'fighter', 'skirmisher', 'mage'], effects: { def: 1 } },
  });
  SP({
    id: 'sp_accursed_imbuement', name: L('저주받은 주입', 'Accursed Imbuement'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'unit_enchant',
    desc: L('원거리·지원·전투 마법사·척후병 유닛의 공격에 화염·냉기 피해가 추가되고 유령불을 새깁니다.', 'Ranged, Support, Battle Mage and Skirmisher attacks gain bonus Fire and Frost damage and inflict Ghostfire.'),
    cost: { mana: 120, cp: 120 }, upkeep: { mana: 12 },
    enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: { channelDmg_fire: 1, channelDmg_frost: 1 }, attackStatus: { id: 'st_ghostfire', chance: 50 } },
  });
  SP({
    id: 'sp_summon_calamity_dragon', name: L('재앙의 용 소환', 'Summon Calamity Dragon'), tier: 4, affinity: { chaos: 1, shadow: 1 }, kind: 'summon',
    desc: L('대상 아군 지방을 폐허와 황무지로 바꾸고 그 자리에 재앙의 용을 소환합니다.', "Turns the target owned, non-ruined province into Ruins and Desolate terrain, then summons a Calamity Dragon there."),
    cost: { mana: 300, cp: 300 }, target: 'province', range: 6, effect: { type: 'summon', unit: 'oc_calamity_dragon', count: 1 },
  });
  IMP({
    id: 'imp_accursed_shrine', name: L('저주받은 사당', 'Accursed Shrine'), desc: L('설치되면 지형을 황량한 땅으로 바꾸며, 인접한 폐허 지방마다 모든 기본 자원이 3씩 늘어납니다.', 'Alters the terrain into Desolate when placed; +3 to every basic resource per adjacent Ruin province.'),
    kind: 'special', tome: 'tome_calamity', cost: { gold: 280, production: 750 }, yields: { gold: 3, mana: 3, knowledge: 3, food: 3, production: 3, draft: 3 },
  });
  TM({
    id: 'tome_calamity', name: L('재앙의 서', 'Tome of Calamity'), tier: 4, affinity: { chaos: 1, shadow: 1 }, expansion: 'ways_of_war', icon: 'tome_chaos_4',
    desc: L('영토에 재앙을 불러오고 차가운 유령불로 적을 불태웁니다.', 'Bring calamity to the realm and burn your enemies in cold Ghostfire.'),
    passive: { desc: L('아군 유닛이 화염과 냉기 피해에 대한 저항을 소폭 얻습니다.', 'Friendly units gain a small amount of Fire and Frost protection.'), effects: { statusRes_fire: 1, statusRes_frost: 1 } },
    contents: [
      { type: 'spell', id: 'sp_comet_of_calamity', cost: kc(4, false) },
      { type: 'spell', id: 'sp_desecrate_land', cost: kc(4, false) },
      { type: 'spell', id: 'sp_accursed_armors', cost: kc(4, false) },
      { type: 'spell', id: 'sp_accursed_imbuement', cost: kc(4, false) },
      { type: 'spell', id: 'sp_summon_calamity_dragon', cost: kc(4, false) },
      { type: 'improvement', id: 'imp_accursed_shrine', cost: kc(4, false) },
    ],
  });

  // ------------------------------------------------------------------ registration
  for (const t of tomes) Data.define('tomes', t);
  for (const s of spells) Data.define('spells', s);
  for (const u of units) Data.define('units', u);
  for (const i of improvements) Data.define('improvements', i);
  for (const t of transformations) Data.define('transformations', t);
  for (const h of heroSkills) Data.define('heroSkills', h);
})(window.AOW = window.AOW || {});
