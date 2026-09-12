// src/data/tomes_astral_shadow.js — Astral & Shadow tomes (+ their dual tomes) — SPEC §3, §3.0.1
// Tomes: Evocation, Warding, Scrying, Summoning, Amplification, Teleportation, Astral Convergence,
//   Astral Mirror, Archmage (Astral); Cryomancy, Necromancy, Souls, Doomherald, Cold Dark,
//   Great Transformation, Oblivion, Reaper, Eternal Lord, Torment (Shadow); Tentacle, Corruption
//   (Shadow/Astral dual), Cosmos (all affinities, T5). Numbers adapted from AoW4 game data
//   (docs/research/tomes_spells_affinity.md Part 1/3/5).
// New ids owned by this file: statuses `st_torment`, `st_insanity`, `st_soulbound`, `st_constricted`,
//   `st_static_shield`; abilities `ab_*` (unit signature skills); units `ta_*`; spells `sp_*`;
//   improvements `imp_*`; transformations `tr_*`; hero skills `hs_*`.
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  // ------------------------------------------------------------------ five extra statuses this file needs
  const S = (id, ko, en, dko, den, o) => Object.assign({
    id, name: { ko, en }, desc: { ko: dko, en: den }, kind: 'debuff', icon: id, stack: false, duration: 3, effects: {},
    resistedBy: null, cleansable: true,
  }, o);
  Data.define('statuses', S('st_torment', '고뇌', 'Torment', '고통에 휩싸여 중첩당 받는 피해가 10% 늘어납니다 (최대 3중첩). 전투가 끝날 때까지 지속됩니다.',
    'Wracked with agony: takes 10% more damage per stack (max 3). Lasts until the end of battle.',
    { stack: 3, duration: 0, effects: { damageTakenPct: 10 }, resistedBy: 'spirit', cleansable: false }));
  Data.define('statuses', S('st_insanity', '광기', 'Insanity', '정신이 무너져 명중률과 주는 피해가 크게 떨어지고 상태이상 저항이 낮아집니다. 가끔 엉뚱한 대상을 공격합니다.',
    "The mind unravels: much lower accuracy and damage dealt, reduced Status Resistance, and it may lash out at the wrong target.",
    { duration: 1, effects: { accuracy: -30, dmgPct: -20, statusRes: -3 }, resistedBy: 'spirit' }));
  Data.define('statuses', S('st_soulbound', '영혼 결박', 'Soulbound', '영혼이 결박되어 받는 피해가 10% 늘어나고, 이 상태로 죽으면 시전자에게 더 많은 마나를 남깁니다.',
    'Its soul is bound: takes 10% more damage, and dying like this leaves the caster extra Mana.',
    { duration: 3, effects: { damageTakenPct: 10 }, resistedBy: 'spirit' }));
  Data.define('statuses', S('st_constricted', '옭죄임', 'Constricted', '촉수에 옭죄여 이동할 수 없고 매 턴 시작 시 물리 피해를 입습니다.',
    'Bound by writhing tentacles: cannot move and takes Physical damage at the start of its turn.',
    { duration: 2, effects: { rooted: true, dotChannel: 'physical', dotAmount: 4 }, resistedBy: 'physical' }));
  Data.define('statuses', S('st_static_shield', '정전기 보호막', 'Static Shield', '몸을 감싼 정전기가 번개 피해를 줄이고 반격 시 번개 피해를 추가로 입힙니다.',
    'A crackling field lowers Lightning damage taken and adds Lightning damage to retaliation strikes.',
    { kind: 'buff', duration: 2, effects: { prot_lightning: 2, retaliation: 1 }, resistedBy: null }));

  // ------------------------------------------------------------------ thirteen extra abilities this file needs
  const nm = (ko, en) => ({ ko, en });
  const A = (id, ko, en, dko, den, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), kind: 'active', ap: 1, cooldown: 0, range: 1, target: 'enemy', area: 0, icon: id, effect: {},
  }, o);
  Data.define('abilities', A('ab_raise_undead', '언데드 소환', 'Raise Undead', '빈 인접 칸에 해골 전사를 일으킵니다. 전투가 끝나면 스러집니다.',
    'Raises a Skeleton Warrior in an adjacent empty hex. It crumbles when the battle ends.',
    { ap: 3, range: 1, target: 'hex', cooldown: 4, icon: 'summon', effect: { type: 'summon', unit: 'ta_skeleton', count: 1, temporary: true } }));
  Data.define('abilities', A('ab_mimic_form', '형상 모방', 'Mimic Form', '적 하나의 모습과 기본 공격을 그대로 본떠 전투가 끝날 때까지 사용합니다.',
    "Copies an enemy's shape and base attack, using it until the battle ends.",
    { ap: 1, range: 3, target: 'enemy', cooldown: 0, icon: 'mirror', effect: { type: 'special', special: 'mimic_form' } }));
  Data.define('abilities', A('ab_death_touch', '죽음의 손길', 'Death Touch', '영혼을 움켜쥐어 영혼 피해 26을 주고 체력이 낮은 적은 그 자리에서 소멸시킵니다.',
    'Grips the soul for 26 Spirit damage and instantly destroys targets left at low Hit Points.',
    { ap: 1, range: 1, cooldown: 3, icon: 'skull', effect: { type: 'damage', channel: 'spirit', amount: 26, attackType: 'magic', status: 'condemned', chance: 60, duration: 3, props: ['execute_low_hp'] } }));
  Data.define('abilities', A('ab_reflect_ward', '반사의 결계', 'Reflective Ward', '받는 피해의 일부를 공격자에게 그대로 되돌립니다.',
    'Reflects a portion of damage taken straight back at the attacker.',
    { kind: 'passive', ap: 0, range: 0, target: 'self', effect: { type: 'passive', rule: 'reflect', pct: 20 } }));
  Data.define('abilities', A('ab_void_pull', '공허의 견인', 'Void Pull', '적을 끌어당겨 영혼 피해 10을 주고 50% 확률로 기절시킵니다.',
    'Wrenches an enemy closer for 10 Spirit damage with a 50% chance to Stun.',
    { ap: 1, range: 4, cooldown: 3, icon: 'void', effect: { type: 'damage', channel: 'spirit', amount: 10, attackType: 'magic', status: 'stunned', chance: 50, duration: 1, props: ['pull'] } }));
  Data.define('abilities', A('ab_insanity_gaze', '광기의 시선', 'Gaze of Insanity', '영혼 피해 14를 주고 대상을 광기에 빠뜨립니다.',
    'Deals 14 Spirit damage and plunges the target into Insanity.',
    { ap: 1, range: 4, cooldown: 2, icon: 'eye', effect: { type: 'damage', channel: 'spirit', amount: 14, attackType: 'magic', status: 'st_insanity', chance: 70, duration: 1 } }));
  Data.define('abilities', A('ab_torment_curse', '고뇌의 저주', 'Curse of Torment', '냉기 피해 16을 주고 대상에게 고뇌를 씌웁니다.',
    'Deals 16 Frost damage and lays Torment upon the target.',
    { ap: 1, range: 4, cooldown: 2, icon: 'curse', effect: { channel: 'frost', amount: 16, attackType: 'magic', status: 'st_torment', chance: 80, duration: 0 } }));
  Data.define('abilities', A('ab_soulbound_strike', '영혼 결박 일격', 'Soulbinding Strike', '물리 피해 14를 주고 대상의 영혼을 결박합니다.',
    'Deals 14 Physical damage and binds the target\'s soul.',
    { ap: 1, range: 1, cooldown: 1, icon: 'chain', effect: { amount: 14, channel: 'physical', status: 'st_soulbound', chance: 70, duration: 3 } }));
  Data.define('abilities', A('ab_constrict', '옭죄기', 'Constrict', '촉수로 휘감아 물리 피해 10을 주고 옭죄임 상태로 만듭니다.',
    'Coils a tentacle around the target for 10 Physical damage, leaving it Constricted.',
    { ap: 1, range: 1, cooldown: 2, icon: 'tentacle', effect: { amount: 10, channel: 'physical', status: 'st_constricted', chance: 70, duration: 2 } }));
  Data.define('abilities', A('ab_elemental_beam', '원소 광선', 'Elemental Beam', '뒤섞인 마력의 광선으로 주변 1칸에 번개 피해 18을 줍니다.',
    'A beam of mingled magic dealing 18 Lightning damage to everything within 1 hex.',
    { ap: 1, range: 4, area: 1, cooldown: 2, icon: 'bolt', effect: { channel: 'lightning', amount: 18, attackType: 'magic', area: 1, props: ['multi_element'] } }));
  Data.define('abilities', A('ab_spell_amp_aura', '주문 증폭 결계', 'Amplifying Field', '주변 아군이 시전하는 주문의 피해가 늘어납니다.',
    "Spells cast by nearby allies deal increased damage.",
    { kind: 'passive', ap: 0, range: 0, target: 'self', effect: { type: 'passive', rule: 'spell_amp_aura', pct: 50, radius: 3 } }));
  Data.define('abilities', A('ab_obscuring_mist_aura', '눈가림 안개', 'Obscuring Mist', '주변에 짙은 안개를 드리워 인접한 적을 이따금 실명시킵니다.',
    'Trails a thick fog that occasionally Blinds adjacent enemies.',
    { kind: 'passive', ap: 0, range: 0, target: 'self', effect: { type: 'passive', rule: 'aura', status: 'blinded', radius: 1, chance: 30, side: 'enemy' } }));
  Data.define('abilities', A('ab_deathless_mending', '불멸의 치유', 'Deathless Mending', '아군 하나의 체력을 20 회복시키고 약화 효과 하나를 없앱니다. 쓰러진 직후에도 사용할 수 있습니다.',
    'Restores 20 HP to a friendly unit and removes one debuff, usable even moments after it falls.',
    { ap: 1, range: 3, target: 'ally', cooldown: 2, icon: 'heal', effect: { type: 'heal', amount: 20, cleanse: 1 } }));

  // ------------------------------------------------------------------ helpers (SPEC §3, matching tomes_nature_materium.js)
  const SP = (id, ko, en, dko, den, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), tier: 1, affinity: { astral: 1 }, kind: 'combat',
    cost: { mana: 20, cp: 20 }, upkeep: {}, target: 'enemy_unit', range: 4, area: 0, effect: {},
  }, o);
  const U = (id, ko, en, dko, den, tomeId, o) => Object.assign({
    id, name: nm(ko, en), desc: nm(dko, den), tier: 1, role: 'fighter', tags: [], move: 'walk', mp: 40,
    source: { type: 'tome', id: tomeId }, cost: { gold: 100, mana: 0, draft: 120 }, upkeep: { gold: 12, mana: 0 },
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
    id, name: nm(ko, en), desc: nm(dko, den), tier: 1, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_1',
    passive: { desc: nm('', ''), effects: {} }, contents: [],
  }, o);
  const KCOST = { 1: 120, 2: 220, 3: 380, 4: 600, 5: 900 };
  const kc = (tier, isUnit) => Math.round(KCOST[tier] * (isUnit ? 1.2 : 1));

  //#region ===================================================== TOME OF EVOCATION (T1 Astral)
  Data.define('units', U('ta_storm_spirit', '작은 폭풍 정령', 'Lesser Storm Spirit', '순수한 번개로 빚어진 작은 정령.', 'A small spirit woven from raw lightning.', 'tome_evocation', {
    tier: 1, role: 'shock', tags: ['magic_origin', 'elemental'], mp: 44,
    cost: { gold: 0, mana: 60, draft: 0 }, upkeep: { gold: 0, mana: 6 },
    hp: 50, def: 2, res: 0, morale: 0, statusRes: { lightning: 6 },
    attacks: [{ id: 'static_slam', name: nm('정전기 강타', 'Static Slam'), type: 'melee', damage: 16, channel: 'lightning', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'electrified', chance: 30 }], props: ['charge'] }],
    abilities: ['charge'], passives: ['immune_lightning'],
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'lightning', size: 'medium', tint: '#8fb3ff', glow: '#c8dcff' },
  }));
  Data.define('units', U('ta_evoker', '환기술사', 'Evoker', '연쇄 번개로 적을 태우는 전투 마법사.', 'A Battle Mage who scorches foes with chain lightning.', 'tome_evocation', {
    tier: 2, role: 'mage', tags: ['magic_origin'], mp: 40,
    hp: 55, def: 0, res: 2, morale: 0,
    attacks: [{ id: 'lightning_bolts', name: nm('번개 화살', 'Lightning Bolts'), type: 'ranged', damage: 14, channel: 'lightning', range: 4, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'electrified', chance: 30 }], props: ['magic'] }],
    abilities: ['lightning_bolt', 'defend'], passives: ['spellcaster', 'arcane_focus'],
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'short', shield: 'none', element: 'lightning', size: 'medium', tint: null, glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_fulmination', '전광 작렬', 'Fulmination', '주변 1칸의 적에게 번개 피해 15를 주고 60% 확률로 감전시킵니다.',
    'Enemies within 1 hex sustain 15 Lightning damage with a 60% chance of becoming Electrified.', {
      tier: 1, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 10, cp: 15 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'damage', channel: 'lightning', amount: 15, area: 1, status: { id: 'electrified', chance: 60, duration: 2 } },
    }));
  Data.define('spells', SP('sp_lightning_focus', '전격 집중', 'Lightning Focus', '지원·마법사 유닛의 공격에 번개 피해가 추가되고 감전을 걸 확률을 얻습니다.',
    "Support and Battle Mage units' attacks add Lightning damage and a chance to Electrify.", {
      tier: 1, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['support', 'mage'], effects: { channelDmg_lightning: 2 }, attackChannel: 'lightning', attackStatus: { id: 'electrified', chance: 30 } },
    }));
  Data.define('spells', SP('sp_lightning_blades', '번개 칼날', 'Lightning Blades', '전열 근접 유닛의 무기에 번개가 서려 감전된 적에게 더 강하게 작용합니다.',
    "Front-line melee weapons crackle with Lightning, hitting Electrified targets harder.", {
      tier: 1, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike', 'shock', 'fighter'], effects: { channelDmg_lightning: 2, dmgPctVsStatus: { electrified: 10 } } },
    }));
  Data.define('spells', SP('sp_lightning_torrent', '번개 폭류', 'Lightning Torrent', '지정한 적 군세 전체가 번개 피해를 입고 번개 보호가 낮아집니다.',
    "The entire target enemy army sustains Lightning damage and loses Lightning protection.", {
      tier: 1, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 80, cp: 80 }, target: 'army', range: 0,
      effect: { type: 'damage', channel: 'lightning', amount: 20 },
    }));
  Data.define('spells', SP('sp_thunderclap', '천둥 벽력', 'Thunderclap', '주변 1칸에 순수한 굉음을 터뜨려 번개 피해 10을 주고 실명시킵니다.',
    'Unleashes a peal of thunder dealing 10 Lightning damage and Blinding everything within 1 hex.', {
      tier: 1, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 15, cp: 20 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'damage', channel: 'lightning', amount: 10, area: 1, status: { id: 'blinded', chance: 50, duration: 2 } },
    }));

  Data.define('tomes', TOME('tome_evocation', '환기술의 서', 'Tome of Evocation', '값싸면서도 뛰어난 공격 주문을 익혀 마법사의 첫걸음을 뗍니다. 번개를 다루는 데 특화합니다.',
    'Grants excellent and cheap attack spells to any aspiring wizard, specializing in Lightning Damage.', {
      tier: 1, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_1',
      passive: { desc: nm('마법 도관 지방마다 마나 +3.', '+3 Mana for each Conduit province you own.'), effects: { mana: 3 } },
      contents: [
        { type: 'spell', id: 'sp_fulmination', cost: kc(1) },
        { type: 'spell', id: 'sp_lightning_focus', cost: kc(1) },
        { type: 'unit', id: 'ta_evoker', cost: kc(1, true) },
        { type: 'skill', id: 'hs_arcane_channeler', cost: kc(1) },
        { type: 'spell', id: 'sp_lightning_blades', cost: kc(1) },
        { type: 'unit', id: 'ta_storm_spirit', cost: kc(1, true) },
        { type: 'spell', id: 'sp_lightning_torrent', cost: kc(1) },
        { type: 'spell', id: 'sp_thunderclap', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF WARDING (T1 Astral)
  Data.define('units', U('ta_phantasm_warrior', '환영 전사', 'Phantasm Warrior', '번개를 두른 방패로 적을 후려치는 환영.', 'A conjured phantom that strikes with a Lightning-wreathed shield.', 'tome_warding', {
    tier: 1, role: 'shield', tags: ['magic_origin', 'spirit'], mp: 36,
    cost: { gold: 0, mana: 60, draft: 0 }, upkeep: { gold: 0, mana: 6 },
    hp: 60, def: 3, res: 2, morale: 0,
    attacks: [{ id: 'phantom_slash', name: nm('환영의 일격', 'Phantom Slash'), type: 'melee', damage: 14, channel: 'lightning', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'electrified', chance: 20 }], props: ['magic'] }],
    abilities: ['defend'], passives: ['ethereal'],
    look: { body: 'ghost', armor: 'chain', weapon: 'sword_shield', helm: 'open', cape: false, shield: 'kite', element: 'arcane', size: 'medium', tint: '#9db4ff', glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_staves_of_warding', '수호의 지팡이', 'Staves of Warding', '지원 유닛의 보조 능력이 대상에게 저항 강화를 추가로 부여합니다.',
    "Support abilities from enchanted units also grant Bolstered Resistance to their target.", {
      tier: 1, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 70, cp: 70 }, upkeep: { mana: 3 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['support'], effects: { res: 1 } },
    }));
  Data.define('spells', SP('sp_mark_of_invulnerability', '불멸의 표식', 'Mark of Invulnerability', '아군 하나가 1턴 동안 무적이 되고 모든 약화 효과가 사라집니다. 전투당 대상 하나에 한 번.',
    'A friendly unit becomes Invulnerable for 1 Turn and loses all debuffs. Usable once per unit per battle.', {
      tier: 1, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 15, cp: 20 }, target: 'ally_unit', range: 3,
      effect: { type: 'status', status: 'shielded', duration: 1, chance: 100, cleanse: true },
    }));
  Data.define('spells', SP('sp_static_shield_spell', '정전기 보호막', 'Static Shield', '아군 하나와 그 주변 3칸의 다른 아군 하나가 정전기 보호막을 두릅니다.',
    'A friendly unit and another within 3 hexes are wreathed in a Static Shield.', {
      tier: 1, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 10, cp: 15 }, target: 'ally_unit', range: 3,
      effect: { type: 'status', status: 'st_static_shield', duration: 2, chance: 100 },
    }));
  Data.define('spells', SP('sp_aegis_of_the_mind', '정신의 방벽', 'Aegis of the Mind', '주변 1칸의 아군이 상태이상 저항 강화를 두릅니다.',
    'Allies within 1 hex are shielded with Bolstered Resistance.', {
      tier: 1, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 15, cp: 20 }, target: 'ally_unit', range: 0, area: 1,
      effect: { type: 'status', status: 'warded', duration: 3, chance: 100, area: 1 },
    }));

  Data.define('transformations', TR('tr_magical_wards', '마력 결계', 'Magical Wards', '대상 종족의 살갗에 결계를 새겨 번개·화염·냉기 보호를 각각 2씩 높입니다.',
    'Inscribes wards onto the target race, granting +2 Lightning, +2 Fire and +2 Frost protection.', 'tome_warding',
    { kind: 'minor', effects: { statusRes_lightning: 2, statusRes_fire: 2, statusRes_frost: 2 } }));

  Data.define('tomes', TOME('tome_warding', '결계의 서', 'Tome of Warding', '피해로부터 아군을 지키고 공격자에게 되갚아주는 마법에 특화합니다.',
    'Specialize in magic that protects your units from damage and retaliates against those who attack you.', {
      tier: 1, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_1',
      passive: { desc: nm('아군 마법 기원 유닛의 저항력 +1.', '+1 Resistance for friendly Magic Origin units.'), effects: { res: 1 } },
      contents: [
        { type: 'spell', id: 'sp_staves_of_warding', cost: kc(1) },
        { type: 'unit', id: 'ta_phantasm_warrior', cost: kc(1, true) },
        { type: 'spell', id: 'sp_mark_of_invulnerability', cost: kc(1) },
        { type: 'transformation', id: 'tr_magical_wards', cost: kc(1) },
        { type: 'spell', id: 'sp_static_shield_spell', cost: kc(1) },
        { type: 'spell', id: 'sp_aegis_of_the_mind', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF CRYOMANCY (T1 Shadow)
  Data.define('units', U('ta_white_witch', '백색 마녀', 'White Witch', '냉기 화살로 적을 얼려붙이는 전투 마법사.', 'A Battle Mage who freezes foes solid with shards of ice.', 'tome_cryomancy', {
    tier: 2, role: 'mage', tags: ['magic_origin'], mp: 40,
    hp: 55, def: 0, res: 2, morale: 0,
    attacks: [{ id: 'frost_bolts', name: nm('냉기 화살', 'Frost Bolts'), type: 'ranged', damage: 13, channel: 'frost', range: 4, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'slowed', chance: 40 }], props: ['magic'] }],
    abilities: ['frost_bolt', 'freeze', 'defend'], passives: ['spellcaster'],
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'long', shield: 'none', element: 'frost', size: 'medium', tint: '#e6f3ff', glow: '#9fd7ff' },
  }));

  Data.define('spells', SP('sp_ice_coffin', '얼음 관', 'Ice Coffin', '적 하나에게 냉기 피해 10을 주고 90% 확률로 얼립니다.',
    'Deals 10 Frost damage to an enemy with a 90% chance to Freeze it.', {
      tier: 1, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 15, cp: 20 }, target: 'enemy_unit', range: 4,
      effect: { type: 'damage', channel: 'frost', amount: 10, status: { id: 'frozen', chance: 90, duration: 1 } },
    }));
  Data.define('spells', SP('sp_frost_arrows', '서리 화살', 'Frost Arrows', '원거리 유닛의 화살에 냉기가 서려 둔화를 퍼뜨립니다.',
    "Ranged units' arrows are rimed with frost that spreads Slowed.", {
      tier: 1, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['ranged', 'skirmisher'], effects: { channelDmg_frost: 1 }, attackChannel: 'frost', attackStatus: { id: 'slowed', chance: 60 } },
    }));
  Data.define('spells', SP('sp_frost_blades', '서리 칼날', 'Frost Blades', '전열 근접 유닛의 무기가 얼어붙어 얼거나 둔화된 적에게 더 강하게 작용합니다.',
    'Front-line melee weapons freeze over, hitting Frozen or Slowed targets harder.', {
      tier: 1, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike', 'shock', 'fighter'], effects: { channelDmg_frost: 2, dmgPctVsStatus: { frozen: 10, slowed: 10 } } },
    }));
  Data.define('spells', SP('sp_blizzard', '눈보라', 'Blizzard', '지정한 적 군세 전체가 냉기 피해를 입고 상태이상 저항이 낮아집니다.',
    'The entire target enemy army sustains Frost damage and loses Status Resistance.', {
      tier: 1, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 80, cp: 80 }, target: 'army', range: 0,
      effect: { type: 'damage', channel: 'frost', amount: 20 },
    }));
  Data.define('spells', SP('sp_glacial_armor', '빙하 갑주', 'Glacial Armor', '전열 근접 유닛의 몸에 얼음 갑주가 씌워져 냉기 보호와 방어력이 오릅니다.',
    "Front-line melee units are cased in glacial armor, gaining Frost protection and Defense.", {
      tier: 1, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 70, cp: 70 }, upkeep: { mana: 3 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike'], effects: { def: 1, statusRes_frost: 4 } },
    }));

  Data.define('tomes', TOME('tome_cryomancy', '빙결술의 서', 'Tome of Cryomancy', '냉기 피해를 다루고 빙결을 퍼뜨리는 데 특화합니다.',
    'Specialize in dealing Frost Damage and inflicting Frozen.', {
      tier: 1, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_1',
      passive: { desc: nm('인접한 설원·빙원 지방마다 지식 +3.', '+3 Knowledge for each adjacent Snow or Ice province.'), effects: { knowledge: 3 } },
      contents: [
        { type: 'spell', id: 'sp_ice_coffin', cost: kc(1) },
        { type: 'spell', id: 'sp_frost_arrows', cost: kc(1) },
        { type: 'spell', id: 'sp_frost_blades', cost: kc(1) },
        { type: 'unit', id: 'ta_white_witch', cost: kc(1, true) },
        { type: 'skill', id: 'hs_frostbound_will', cost: kc(1) },
        { type: 'spell', id: 'sp_blizzard', cost: kc(1) },
        { type: 'spell', id: 'sp_glacial_armor', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF NECROMANCY (T1 Shadow)
  Data.define('units', U('ta_skeleton', '해골 전사', 'Skeleton Warrior', '뼈만 남은 채로 다시 일어나 검과 방패를 든 병사.', 'A soldier of bare bone, risen again with sword and shield.', 'tome_necromancy', {
    tier: 1, role: 'shield', tags: ['undead'], mp: 32,
    cost: { gold: 40, mana: 20, draft: 60 }, upkeep: { gold: 2, mana: 1 },
    hp: 55, def: 2, res: 0, morale: 0,
    attacks: [{ id: 'bone_sword', name: nm('뼈 검', 'Bone Sword'), type: 'melee', damage: 12, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [], props: [] }],
    abilities: ['defend'], passives: ['undead'],
    look: { body: 'skeleton', armor: 'none', weapon: 'sword_shield', helm: 'none', cape: false, shield: 'round', element: null, size: 'medium', tint: null, glow: null },
  }));
  Data.define('units', U('ta_zombie', '부패한 시체', 'Decaying Zombie', '되살아난 시체가 역병을 흩뿌리며 달려듭니다.', 'A risen corpse that shambles forward, trailing blight.', 'tome_necromancy', {
    tier: 1, role: 'fighter', tags: ['undead'], mp: 24,
    cost: { gold: 0, mana: 30, draft: 0 }, upkeep: { gold: 0, mana: 2 },
    hp: 65, def: 0, res: 0, morale: 0,
    attacks: [{ id: 'rotting_claw', name: nm('썩은 손톱', 'Rotting Claw'), type: 'melee', damage: 14, channel: 'blight', range: 1, ap: 1, repeat: 1, accuracy: 75, strikes: 1, effects: [{ status: 'poisoned', chance: 30 }], props: [] }],
    abilities: [], passives: ['undead', 'regeneration'],
    look: { body: 'undead', armor: 'none', weapon: 'claws', helm: 'none', cape: false, shield: 'none', element: 'blight', size: 'medium', tint: '#6b7a4e', glow: null },
  }));
  Data.define('units', U('ta_necromancer', '강령술사', 'Necromancer', '시체에서 언데드를 일으키고 강화하는 지원 마법사.', 'A Support caster who raises the dead from corpses and empowers them.', 'tome_necromancy', {
    tier: 2, role: 'support', tags: ['magic_origin'], mp: 40,
    hp: 60, def: 1, res: 3, morale: 0, statusRes: { spirit: 2 },
    attacks: [{ id: 'death_blast', name: nm('죽음의 작렬', 'Death Blast'), type: 'ranged', damage: 10, channel: 'frost', range: 4, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'blighted', chance: 30 }], props: ['magic'] }],
    abilities: ['ab_raise_undead', 'shadow_bolt', 'defend'], passives: ['spellcaster', 'dark_pact'],
    look: { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', cape: 'long', shield: 'none', element: 'shadow', size: 'medium', tint: '#3a3550', glow: '#7b3fa0' },
  }));

  Data.define('spells', SP('sp_necrotize', '괴사', 'Necrotize', '적 하나에게 냉기·역병 피해를 주고 부패시킵니다. 이 상태로 죽으면 잠시 부패한 시체가 되어 아군을 돕습니다.',
    'Deals Frost and Blight damage to an enemy and rots its flesh; if it dies this way it briefly rises as a Decaying Zombie under your control.', {
      tier: 1, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 10, cp: 15 }, target: 'enemy_unit', range: 4,
      effect: { type: 'damage', channel: 'frost', amount: 10, status: { id: 'blighted', chance: 100, duration: 3 } },
    }));
  Data.define('spells', SP('sp_soul_collection', '영혼 수확', 'Soul Collection', '전투에서 죽은 적에게서 마나를 거둬들이지만 금 유지비가 듭니다.',
    'Harvests Mana from enemies slain in battle, at a Gold upkeep.', {
      tier: 1, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 45, cp: 45 }, upkeep: { mana: 0 }, target: 'empire', range: 0,
      effect: { type: 'resource', mana: 10 },
    }));
  Data.define('spells', SP('sp_raise_zombie', '시체 일으키기', 'Raise Zombie', '주변 1칸의 시체를 부패한 시체로 일으켜 세웁니다. 전투가 끝나면 다시 스러집니다.',
    'Raises corpses within 1 hex as Decaying Zombies that crumble again once the battle ends.', {
      tier: 1, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 10, cp: 15 }, target: 'hex', range: 3, area: 1,
      effect: { type: 'summon', unit: 'ta_zombie', count: 2 },
    }));
  Data.define('spells', SP('sp_rotting_explosion', '부패 폭발', 'Rotting Explosion', '아군 좀비나 해골 하나가 폭발해 주변 2칸의 적에게 냉기·역병 피해를 입힙니다.',
    'A friendly Zombie or Skeleton detonates, dealing Frost and Blight damage to enemies within 2 hexes.', {
      tier: 1, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 10, cp: 15 }, target: 'ally_unit', range: 4, area: 2,
      effect: { type: 'damage', channel: 'blight', amount: 10, area: 2, status: { id: 'blighted', chance: 100, duration: 3 } },
    }));
  Data.define('spells', SP('sp_grave_chill', '무덤의 냉기', 'Grave Chill', '주변 1칸의 적에게 냉기 피해 8을 주고 사기를 떨어뜨립니다.',
    'Deals 8 Frost damage to enemies within 1 hex and saps their Morale.', {
      tier: 1, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 10, cp: 15 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'damage', channel: 'frost', amount: 8, area: 1, status: { id: 'demoralized', chance: 60, duration: 2 } },
    }));
  Data.define('spells', SP('sp_bone_shield', '뼈 방패', 'Bone Shield', '언데드 아군의 뼈가 두꺼워져 방어력이 오릅니다.',
    "Undead allies' bones thicken, raising their Defense.", {
      tier: 1, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 70, cp: 70 }, upkeep: { mana: 3 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike'], effects: { def: 2 } },
    }));

  Data.define('tomes', TOME('tome_necromancy', '강령술의 서', 'Tome of Necromancy', '적에게서 영혼을 거둬 언데드를 빚어냅니다. 소모품 유닛과 영혼 경제의 시작에 특화합니다.',
    'Harvest Souls from your enemies and create Undead creatures; specialize in expendable units and a Soul economy.', {
      tier: 1, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_1',
      passive: { desc: nm('전투에서 적을 처치하면 마나를 얻습니다. 폐허와 지하묘지의 영웅을 언데드 하수인으로 되살릴 수 있습니다.', 'Gain Mana when enemies die in battle. Unlocks animating City Ruins and crypt Heroes as Undead servants.'), effects: { mana: 4 } },
      contents: [
        { type: 'spell', id: 'sp_necrotize', cost: kc(1) },
        { type: 'unit', id: 'ta_skeleton', cost: kc(1, true) },
        { type: 'spell', id: 'sp_soul_collection', cost: kc(1) },
        { type: 'unit', id: 'ta_necromancer', cost: kc(1, true) },
        { type: 'spell', id: 'sp_raise_zombie', cost: kc(1) },
        { type: 'spell', id: 'sp_rotting_explosion', cost: kc(1) },
        { type: 'spell', id: 'sp_grave_chill', cost: kc(1) },
        { type: 'spell', id: 'sp_bone_shield', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF SCRYING (T2 Astral)
  Data.define('units', U('ta_watcher', '감시자', 'Watcher', '멀리 내다보는 눈을 지닌 전투 마법사.', 'A Battle Mage with far-seeing eyes and a keen memory for weaknesses.', 'tome_scrying', {
    tier: 3, role: 'mage', tags: ['magic_origin'], mp: 40,
    hp: 75, def: 1, res: 3, morale: 0,
    attacks: [{ id: 'psychic_gaze', name: nm('정신의 응시', 'Psychic Gaze'), type: 'ranged', damage: 16, channel: 'lightning', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'marked', chance: 40 }], props: ['magic'] }],
    abilities: ['lightning_bolt', 'mark_target'], passives: ['true_sight', 'farsight'],
    look: { body: 'wisp', armor: 'none', weapon: 'orb', helm: 'none', cape: 'short', shield: 'none', element: 'arcane', size: 'medium', tint: '#c9d6ff', glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_mental_mark', '정신 표식', 'Mental Mark', '주변 1칸의 적이 표식과 저항 분쇄를 얻습니다.',
    'Enemies within 1 hex gain Marked and Shattered Resistance.', {
      tier: 2, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 15, cp: 20 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'status', status: 'marked', duration: 3, chance: 90, area: 1, extraStatus: 'shattered' },
    }));
  Data.define('spells', SP('sp_scry_enemy', '적 정찰', 'Scry Enemy', '지정한 적 군세의 모든 유닛이 10턴 동안 시야를 제공합니다.',
    'Every unit in the target enemy army provides vision for 10 Turns.', {
      tier: 2, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 30, cp: 30 }, target: 'army', range: 0,
      effect: { type: 'reveal', duration: 10 },
    }));
  Data.define('spells', SP('sp_guided_projectiles', '유도 사격', 'Guided Projectiles', '원거리·지원 유닛의 사거리가 늘어나고 엄폐로 인한 명중 페널티를 무시합니다.',
    "Ranged and Support units' attacks reach further and ignore obstruction accuracy penalties.", {
      tier: 2, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['ranged', 'support', 'mage'], effects: { accuracy: 15 } },
    }));
  Data.define('spells', SP('sp_all_seeing_eye', '모든 것을 보는 눈', 'All-Seeing Eye', '지정한 지방과 그 주변의 안개를 걷어냅니다.',
    'Clears the fog of war from the target province and its neighbors.', {
      tier: 2, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 40, cp: 40 }, target: 'province', range: 0,
      effect: { type: 'reveal', duration: 999 },
    }));

  Data.define('improvements', IMP('imp_tower_of_true_sight', '진실의 눈 탑', 'Tower of True Sight', '도시 안정도와 지식을 늘리고 시야를 크게 넓히며 은신한 적을 발견합니다.',
    "Boosts City Stability and Knowledge, greatly extends vision, and reveals camouflaged enemies nearby.", 'tome_scrying',
    { kind: 'research_post', cost: { gold: 100, imperium: 0 }, yields: { knowledge: 10 }, globalEffects: { vision: 2 } }));

  Data.define('tomes', TOME('tome_scrying', '천리안의 서', 'Tome of Scrying', '적을 항상 주시하여 아무것도 놓치지 않습니다. 시야와 진실의 눈을 넓히고 표식을 남기는 데 특화합니다.',
    'Keep an eye on your enemies and let nothing pass you by; specialize in Vision, True Sight and inflicting Marked.', {
      tier: 2, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_2',
      passive: { desc: nm('아군 유닛과 도시의 시야 +1.', '+1 Vision Range for friendly units and cities.'), effects: { vision: 1 } },
      contents: [
        { type: 'spell', id: 'sp_mental_mark', cost: kc(2) },
        { type: 'spell', id: 'sp_scry_enemy', cost: kc(2) },
        { type: 'unit', id: 'ta_watcher', cost: kc(2, true) },
        { type: 'spell', id: 'sp_guided_projectiles', cost: kc(2) },
        { type: 'improvement', id: 'imp_tower_of_true_sight', cost: kc(2) },
        { type: 'spell', id: 'sp_all_seeing_eye', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF SUMMONING (T2 Astral)
  Data.define('units', U('ta_astral_keeper', '아스트랄 수호자', 'Astral Keeper', '죽음조차 뛰어넘어 아군을 치유하는 정신체.', 'A spirit of pure mind that mends allies, even past the edge of death.', 'tome_summoning', {
    tier: 2, role: 'support', tags: ['magic_origin', 'spirit'], mp: 40,
    hp: 70, def: 1, res: 3, morale: 0,
    attacks: [{ id: 'astral_spark', name: nm('아스트랄 불꽃', 'Astral Spark'), type: 'ranged', damage: 8, channel: 'lightning', range: 3, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['ab_deathless_mending', 'cleanse'], passives: ['spirit_link'],
    look: { body: 'wisp', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'small', tint: '#dce6ff', glow: '#9db4ff' },
  }));
  Data.define('units', U('ta_astral_serpent', '아스트랄 이무기', 'Astral Serpent', '전선 한복판으로 순간이동해 폭발적으로 물어뜯는 뱀.', 'A serpent that blinks into the front line and strikes with explosive force.', 'tome_summoning', {
    tier: 3, role: 'fighter', tags: ['magic_origin'], mp: 44,
    hp: 80, def: 2, res: 4, morale: 0,
    attacks: [{ id: 'astral_bite', name: nm('아스트랄 이빨', 'Astral Bite'), type: 'melee', damage: 20, channel: 'lightning', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'electrified', chance: 30 }], props: ['magic'] }],
    abilities: ['phase_step'], passives: ['elusive'],
    look: { body: 'eldritch', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'large', tint: '#7d9cff', glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_arcane_bond', '비전 결속', 'Arcane Bond', '적 마법 기원 유닛 하나를 90% 확률로 지배하려 시도합니다. 실패하면 대신 번개 피해를 입힙니다.',
    'Attempts to Dominate an enemy Magic Origin unit (base 90%); on failure it instead sustains Lightning damage.', {
      tier: 2, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 45, cp: 30 }, target: 'enemy_unit', range: 4,
      effect: { type: 'status', status: 'charmed', duration: 2, chance: 90 },
    }));
  Data.define('spells', SP('sp_arcane_restoration', '비전 회복', 'Arcane Restoration', '아군 마법 기원 유닛 전원이 임시 체력을 회복합니다.',
    'Heals every friendly Magic Origin unit with temporary Hit Points.', {
      tier: 2, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 30, cp: 25 }, target: 'ally_unit', range: 0, area: 2,
      effect: { type: 'heal', amount: 25, area: 2 },
    }));
  Data.define('spells', SP('sp_arcane_supercharge', '비전 과충전', 'Arcane Supercharge', '아군 마법 기원 유닛 하나가 강화, 방어 강화, 저항 강화, 정전기 보호막을 두릅니다.',
    'A friendly Magic Origin unit gains Strengthened, Bolstered Defense, Bolstered Resistance and a Static Shield.', {
      tier: 2, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 80, cp: 35 }, target: 'ally_unit', range: 3,
      effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100, extraStatus: 'shielded' },
    }));
  Data.define('spells', SP('sp_astral_ward', '아스트랄 보호막', 'Astral Ward', '마법 기원 아군의 저항력이 오르고 상태이상 저항이 늘어납니다.',
    "Friendly Magic Origin units gain Resistance and Status Resistance.", {
      tier: 2, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['mage', 'support'], effects: { res: 2, statusRes: 1 } },
    }));

  Data.define('tomes', TOME('tome_summoning', '소환술의 서', 'Tome of Summoning', '마법 기원 유닛을 불러내고, 다스리고, 강화하는 데 특화합니다.',
    'Call forth, control, and enhance Magic Origin units.', {
      tier: 2, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_2',
      passive: { desc: nm('영역 안에서 전투 소환 주문의 마나 비용 -20%.', "Combat Summon Spells cost -20% Mana within your domain."), effects: { spellCostPct: -5 } },
      contents: [
        { type: 'spell', id: 'sp_arcane_bond', cost: kc(2) },
        { type: 'spell', id: 'sp_arcane_restoration', cost: kc(2) },
        { type: 'spell', id: 'sp_arcane_supercharge', cost: kc(2) },
        { type: 'unit', id: 'ta_astral_keeper', cost: kc(2, true) },
        { type: 'unit', id: 'ta_astral_serpent', cost: kc(2, true) },
        { type: 'spell', id: 'sp_astral_ward', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF SOULS (T2 Shadow)
  Data.define('units', U('ta_wraith', '원한의 유령', 'Wraith', '구슬픈 울음으로 사기를 꺾고 적을 약화시키는 복수심 어린 영혼.', 'A vengeful spirit whose piercing wail breaks morale and weakens foes.', 'tome_souls', {
    tier: 3, role: 'mage', tags: ['undead', 'spirit'], move: 'fly', mp: 44,
    hp: 90, def: 2, res: 4, morale: 0,
    attacks: [{ id: 'grave_wail', name: nm('무덤의 통곡', 'Grave Wail'), type: 'ranged', damage: 16, channel: 'spirit', range: 4, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'weakened', chance: 40 }], props: ['magic'] }],
    abilities: ['howl', 'shadow_bolt'], passives: ['undead', 'flying', 'fearless'],
    look: { body: 'ghost', armor: 'none', weapon: 'none', helm: 'none', cape: 'long', shield: 'none', element: 'shadow', size: 'medium', tint: '#8a7ab0', glow: '#7b3fa0' },
  }));
  Data.define('units', U('ta_bone_horror', '뼈 괴물', 'Bone Horror', '수십 구의 뼈를 짜맞춰 만든 거대한 돌격체.', 'A hulking charger lashed together from dozens of scavenged bones.', 'tome_souls', {
    tier: 3, role: 'shock', tags: ['undead'], mp: 36,
    hp: 100, def: 4, res: 1, morale: 0,
    attacks: [{ id: 'bone_claws', name: nm('뼈 발톱', 'Bone Claws'), type: 'melee', damage: 22, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'bleeding', chance: 30 }], props: ['charge'] }],
    abilities: ['devour', 'charge'], passives: ['undead', 'hardened'],
    look: { body: 'skeleton', armor: 'none', weapon: 'claws', helm: 'none', cape: false, shield: 'none', element: null, size: 'large', tint: '#c9c0a8', glow: null },
  }));

  Data.define('spells', SP('sp_soulbinders', '영혼 결박술', 'Soulbinders', '지원·마법사 유닛의 공격이 영혼 결박을 걸고, 결박된 적에게 더 강하게 작용합니다.',
    "Support and Battle Mage attacks inflict Soulbound and hit Soulbound targets harder.", {
      tier: 2, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['support', 'mage'], effects: { dmgPctVsStatus: { st_soulbound: 10 } }, attackStatus: { id: 'st_soulbound', chance: 90 } },
    }));
  Data.define('spells', SP('sp_feast_of_souls', '영혼의 향연', 'Feast of Souls', '지정한 아군 부대가 체력을 회복하며, 언데드 유닛은 두 배로 회복합니다.',
    'The target friendly army heals Hit Points; Undead units heal twice as much.', {
      tier: 2, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 20, cp: 25 }, target: 'army', range: 0,
      effect: { type: 'heal', amount: 20 },
    }));
  Data.define('spells', SP('sp_soul_overflow', '영혼 범람', 'Soul Overflow', '주변 1칸의 아군이 강화를 얻고 최대 체력이 늘어나며 약화 효과 두 개가 사라집니다.',
    'Allies within 1 hex gain Strengthened, extra maximum Hit Points, and lose two debuffs.', {
      tier: 2, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 15, cp: 20 }, target: 'ally_unit', range: 0, area: 1,
      effect: { type: 'status', status: 'strengthened', duration: 3, chance: 100, area: 1, cleanse: 2 },
    }));
  Data.define('spells', SP('sp_wailing_dead', '통곡하는 사자', 'Wailing Dead', '주변 2칸의 적이 사기를 잃고 겁에 질립니다.',
    'Enemies within 2 hexes lose Morale and grow fearful.', {
      tier: 2, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 20, cp: 20 }, target: 'hex', range: 4, area: 2,
      effect: { type: 'status', status: 'demoralized', duration: 3, chance: 70, area: 2 },
    }));

  Data.define('tomes', TOME('tome_souls', '영혼의 서', 'Tome of Souls', '한층 진보한 언데드를 빚어내고 영혼을 더 많이 거두는 법을 익힙니다. 언데드를 위한 강화와 치유에 특화합니다.',
    'Create advanced Undead creatures and gain ways to collect more Souls; specialize in buffs and healing for Undead units.', {
      tier: 2, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_2',
      passive: { desc: nm('전투에서 적을 처치하면 마나를 얻습니다. 폐허와 지하묘지의 영웅을 언데드 하수인으로 되살릴 수 있습니다.', 'Gain Mana when enemies die in battle. Unlocks animating City Ruins and crypt Heroes as Undead servants.'), effects: { mana: 5 } },
      contents: [
        { type: 'spell', id: 'sp_soulbinders', cost: kc(2) },
        { type: 'spell', id: 'sp_feast_of_souls', cost: kc(2) },
        { type: 'spell', id: 'sp_soul_overflow', cost: kc(2) },
        { type: 'unit', id: 'ta_bone_horror', cost: kc(2, true) },
        { type: 'unit', id: 'ta_wraith', cost: kc(2, true) },
        { type: 'spell', id: 'sp_wailing_dead', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE DOOMHERALD (T2 Shadow)
  Data.define('units', U('ta_lost_soul', '길 잃은 영혼', 'Lost Soul', '사기가 꺾인 적을 파고들어 절망을 퍼뜨리는 부유하는 영혼.', 'A drifting spirit that preys on broken morale, spreading despair.', 'tome_doomherald', {
    tier: 3, role: 'mage', tags: ['undead', 'spirit'], move: 'fly', mp: 40,
    hp: 90, def: 3, res: 3, morale: 0,
    attacks: [{ id: 'despair_bolt', name: nm('절망의 화살', 'Despair Bolt'), type: 'ranged', damage: 16, channel: 'spirit', range: 4, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'demoralized', chance: 60 }], props: ['magic'] }],
    abilities: ['shadow_bolt'], passives: ['undead', 'fearless', 'floating'],
    look: { body: 'spirit', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'shadow', size: 'medium', tint: '#4a4560', glow: '#7b3fa0' },
  }));

  Data.define('spells', SP('sp_cause_despair', '절망 유발', 'Cause Despair', '주변 1칸의 적이 사기를 크게 잃습니다.',
    'Enemies within 1 hex have a high chance of losing a large amount of Morale.', {
      tier: 2, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 30, cp: 25 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'status', status: 'demoralized', duration: 3, chance: 90, area: 1 },
    }));
  Data.define('spells', SP('sp_prelude_of_doom', '파멸의 전조', 'Prelude of Doom', '지정한 적 군세 전체가 사기 저하를 얻습니다.',
    'The entire target enemy army gains Demoralized.', {
      tier: 2, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 80, cp: 80 }, target: 'army', range: 0,
      effect: { type: 'status', status: 'demoralized', duration: 1, chance: 100 },
    }));
  Data.define('spells', SP('sp_cruel_weaponry', '잔혹한 무기', 'Cruel Weaponry', '전열 근접 유닛이 사기가 낮은 적에게 더 큰 피해를 줍니다.',
    'Front-line melee units deal more damage against enemies with low or worse Morale.', {
      tier: 2, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike', 'shock', 'fighter', 'skirmisher'], effects: { dmgPctVsStatus: { demoralized: 30, panicked: 30 } } },
    }));
  Data.define('spells', SP('sp_despair_incarnate', '절망의 화신', 'Despair Incarnate', '주변 2칸의 적이 사기 저하와 공황을 동시에 얻습니다.',
    'Enemies within 2 hexes gain both Demoralized and Panicked.', {
      tier: 2, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 30, cp: 25 }, target: 'hex', range: 4, area: 2,
      effect: { type: 'status', status: 'panicked', duration: 2, chance: 50, area: 2, extraStatus: 'demoralized' },
    }));

  Data.define('improvements', IMP('imp_doomdepth_trench', '파멸의 심연 참호', 'Doomdepth Trench', '마나와 지식을 넉넉히 내주지만 도시 안정도를 갉아먹는 불길한 균열.',
    'An ominous rift that yields ample Mana and Knowledge at the cost of City Stability.', 'tome_doomherald',
    { kind: 'conduit', cost: { gold: 100, imperium: 0 }, yields: { mana: 10, knowledge: 10, stability: -5 } }));

  Data.define('tomes', TOME('tome_doomherald', '파멸의 사도의 서', 'Tome of the Doomherald', '사기를 떨어뜨리는 효과로 적을 괴롭히고, 사기가 낮은 적을 파고드는 데 특화합니다.',
    'Torment your enemies with Morale-reducing effects and by exploiting enemies with Low Morale.', {
      tier: 2, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_2',
      passive: { desc: nm('사기가 낮거나 그 이하인 적에게 주는 피해 +5%.', '+5% damage against enemies with Low Morale or worse.'), effects: { dmgPct: 5 } },
      contents: [
        { type: 'spell', id: 'sp_cause_despair', cost: kc(2) },
        { type: 'spell', id: 'sp_prelude_of_doom', cost: kc(2) },
        { type: 'unit', id: 'ta_lost_soul', cost: kc(2, true) },
        { type: 'spell', id: 'sp_cruel_weaponry', cost: kc(2) },
        { type: 'improvement', id: 'imp_doomdepth_trench', cost: kc(2) },
        { type: 'spell', id: 'sp_despair_incarnate', cost: kc(2) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF AMPLIFICATION (T3 Astral)
  Data.define('units', U('ta_amplification_pylon', '증폭 첨탑', 'Amplification Pylon', '전장에 세워져 아군 주문의 위력을 끌어올리는 부동의 결정체.', 'An immobile crystal spire raised on the battlefield to magnify allied spellcraft.', 'tome_amplification', {
    tier: 3, role: 'support', tags: ['magic_origin', 'construct'], mp: 0,
    hp: 80, def: 2, res: 2, morale: 0,
    attacks: [{ id: 'arcane_discharge', name: nm('비전 방전', 'Arcane Discharge'), type: 'ranged', damage: 12, channel: 'lightning', range: 3, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['ab_spell_amp_aura'], passives: ['construct'],
    look: { body: 'elemental', armor: 'none', weapon: 'orb', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'medium', tint: '#c9a24a', glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_amplifying_imbuement', '증폭의 주입', 'Amplifying Imbuement', '원거리·지원 유닛의 기본 공격이 번개 피해를 추가로 주변 두 대상에 퍼뜨리고 저항 분쇄를 걸 확률을 얻습니다.',
    "Ranged and Support base attacks splash Lightning damage to two extra targets and may inflict Shattered Resistance.", {
      tier: 3, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 100, cp: 100 }, upkeep: { mana: 5 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: { channelDmg_lightning: 3 }, attackChannel: 'lightning', attackStatus: { id: 'shattered', chance: 30 } },
    }));
  Data.define('spells', SP('sp_amplify_minds', '정신 증폭', 'Amplify Minds', '지정한 도시의 지식 수입이 크게 늘어나지만 안정도가 떨어집니다.',
    "Sharply boosts the target city's Knowledge income at the cost of Stability.", {
      tier: 3, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 }, target: 'city', range: 0,
      effect: { type: 'resource', knowledge: 20, stability: -10 },
    }));
  Data.define('spells', SP('sp_chain_lightning', '연쇄 번개', 'Chain Lightning', '적 하나에게 번개 피해와 감전을 입힌 뒤, 근처의 다른 적에게 최대 두 번 튕겨 나갑니다.',
    'Deals Lightning damage and Electrified to an enemy, then arcs to another enemy within 3 hexes, up to twice.', {
      tier: 3, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 45, cp: 30 }, target: 'enemy_unit', range: 4,
      effect: { type: 'damage', channel: 'lightning', amount: 30, status: { id: 'electrified', chance: 100, duration: 2 } },
    }));
  Data.define('spells', SP('sp_spell_surge', '주문 쇄도', 'Spell Surge', '주문 시전 비용이 낮아집니다.',
    'Lowers the Mana and Casting Point cost of every spell you cast.', {
      tier: 3, affinity: { astral: 2 }, kind: 'empire', cost: { mana: 0, cp: 0 }, target: 'empire', range: 0,
      effect: { type: 'special', id: 'spell_surge' },
    }));

  Data.define('improvements', IMP('imp_resonance_fields', '공명의 들판', 'Resonance Fields', '마나와 시전 포인트를 함께 끌어올리는 공명하는 결정 지대.',
    'A resonating crystal field that boosts Mana and Casting Points together.', 'tome_amplification',
    { kind: 'conduit', cost: { gold: 100, imperium: 0 }, yields: { mana: 5 }, globalEffects: { casting: 5, combatCasting: 5 } }));

  Data.define('tomes', TOME('tome_amplification', '증폭의 서', 'Tome of Amplification', '한층 진보한 비전 마법으로 마법사와 주문 시전 자체를 강화합니다.',
    'Enhance your mages and your spellcasting with more advanced arcane magic.', {
      tier: 3, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_3',
      passive: { desc: nm('전투 피해·치유 주문의 위력 +10%.', "+10% power on combat Damage and Healing spells."), effects: { dmgPct: 4 } },
      contents: [
        { type: 'spell', id: 'sp_amplifying_imbuement', cost: kc(3) },
        { type: 'unit', id: 'ta_amplification_pylon', cost: kc(3, true) },
        { type: 'spell', id: 'sp_amplify_minds', cost: kc(3) },
        { type: 'spell', id: 'sp_chain_lightning', cost: kc(3) },
        { type: 'improvement', id: 'imp_resonance_fields', cost: kc(3) },
        { type: 'spell', id: 'sp_spell_surge', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF TELEPORTATION (T3 Astral)
  Data.define('units', U('ta_phase_beast', '위상 짐승', 'Phase Beast', '실체와 환영의 경계를 넘나들며 덮치는 짐승.', 'A predator that slips between substance and illusion to pounce on its prey.', 'tome_teleportation', {
    tier: 4, role: 'shock', tags: ['magic_origin', 'eldritch'], mp: 44,
    hp: 120, def: 4, res: 3, morale: 0,
    attacks: [{ id: 'phase_claw', name: nm('위상 발톱', 'Phase Claw'), type: 'melee', damage: 26, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['charge'] }],
    abilities: ['phase_step', 'charge'], passives: ['elusive'],
    look: { body: 'beast_wolf', armor: 'none', weapon: 'claws', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'large', tint: '#7d9cff', glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_emergency_teleportation', '긴급 순간이동', 'Emergency Teleportation', '가장 가까운 아군을 빈 칸으로 순간이동시켜 임시 체력을 회복시키고 약화 효과를 모두 없앱니다.',
    'Teleports the nearest friendly unit to an empty hex, healing it and removing every debuff.', {
      tier: 3, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 45, cp: 30 }, target: 'ally_unit', range: 4,
      effect: { type: 'teleport', range: 4, cleanse: true },
    }));
  Data.define('spells', SP('sp_mass_recall', '대규모 소환', 'Mass Recall', '지정한 아군 부대를 가장 가까운 아군 도시로 순간이동시킵니다.',
    'Teleports the target friendly army back to the nearest owned city.', {
      tier: 3, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 100, cp: 100 }, target: 'army', range: 0,
      effect: { type: 'teleport', range: 999 },
    }));
  Data.define('spells', SP('sp_phasing_enchantment', '위상 부여', 'Phasing Enchantment', '지원·마법사 유닛이 전투 중 짧게 순간이동하는 능력을 얻습니다.',
    'Support and Battle Mage units gain the ability to blink short distances in battle.', {
      tier: 3, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['support', 'mage'], effects: { mp: 1 } },
    }));
  Data.define('spells', SP('sp_blink_step', '점멸 이동', 'Blink Step', '주문 시전자가 그 자리에서 4칸까지 순간이동합니다.',
    'The caster blinks up to 4 hexes from where they stand.', {
      tier: 3, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 15, cp: 20 }, target: 'hex', range: 4,
      effect: { type: 'teleport', range: 4 },
    }));

  Data.define('improvements', IMP('imp_chrono_gate', '시간의 문', 'Chrono Gate', '지방을 순간이동 지점으로 삼아 방문한 군세에 회피를 부여하고 마나와 지식을 끌어옵니다.',
    'Turns the province into a teleport waypoint, granting Evasion to visiting armies and drawing Mana and Knowledge.', 'tome_teleportation',
    { kind: 'conduit', cost: { gold: 170, imperium: 0 }, yields: { mana: 6, knowledge: 6 } }));

  Data.define('tomes', TOME('tome_teleportation', '순간이동의 서', 'Tome of Teleportation', '공간 마법의 진수를 파헤쳐 전투 중 아군을 순식간에 재배치합니다.',
    'Exploit spatial magic to its full potential; strategically reposition your units in battle in a mere instant.', {
      tier: 3, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_3',
      passive: { desc: nm('순간이동 시설을 이용한 아군 유닛이 이동력 절반을 회복합니다.', 'Friendly units regain half their Move Points after using a Teleporter.'), effects: { armyMove: 2 } },
      contents: [
        { type: 'spell', id: 'sp_emergency_teleportation', cost: kc(3) },
        { type: 'spell', id: 'sp_mass_recall', cost: kc(3) },
        { type: 'unit', id: 'ta_phase_beast', cost: kc(3, true) },
        { type: 'skill', id: 'hs_phase_walker', cost: kc(3) },
        { type: 'spell', id: 'sp_phasing_enchantment', cost: kc(3) },
        { type: 'improvement', id: 'imp_chrono_gate', cost: kc(3) },
        { type: 'spell', id: 'sp_blink_step', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF TORMENT (T3 Shadow)
  Data.define('units', U('ta_pain_bringer', '고통의 사자', 'Pain Bringer', '적의 고통을 먹고 살아가는 신화급 존재.', 'A mythic being that feeds on the pain it inflicts.', 'tome_torment', {
    tier: 4, role: 'skirmisher', tags: ['magic_origin', 'mythic'], mp: 44,
    hp: 140, def: 5, res: 5, morale: 0, statusRes: { spirit: 7 },
    attacks: [{ id: 'draining_strike', name: nm('갈취의 일격', 'Draining Strike'), type: 'melee', damage: 24, channel: 'spirit', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'st_torment', chance: 60 }], props: ['flank_bonus'] }],
    abilities: ['ab_torment_curse', 'phase_step'], passives: ['control_immunity', 'flanker'],
    look: { body: 'fiend', armor: 'none', weapon: 'daggers', helm: 'horned', cape: 'long', shield: 'none', element: 'shadow', size: 'large', tint: '#5a2d5c', glow: '#7b3fa0' },
  }));

  Data.define('spells', SP('sp_agonize', '고통 부여', 'Agonize', '주변 1칸의 적이 냉기 피해를 입고 고뇌 3중첩을 얻습니다.',
    'Enemies within 1 hex sustain Frost damage and gain three stacks of Torment.', {
      tier: 3, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 80, cp: 35 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'damage', channel: 'frost', amount: 40, area: 1, status: { id: 'st_torment', chance: 90, duration: 0 } },
    }));
  Data.define('spells', SP('sp_tormenting_imbuement', '고뇌의 주입', 'Tormenting Imbuement', '원거리·지원 유닛의 공격이 고뇌를 씌웁니다.',
    'Ranged and Support attacks inflict Torment on the target.', {
      tier: 3, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 140, cp: 140 }, upkeep: { mana: 7 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['ranged', 'support', 'mage', 'skirmisher'], effects: {}, attackStatus: { id: 'st_torment', chance: 90 } },
    }));
  Data.define('spells', SP('sp_shared_agony', '공유된 고통', 'Shared Agony', '고뇌에 걸린 적 하나가 폭발해 주변 1칸의 다른 적에게 고뇌를 옮깁니다.',
    "An enemy afflicted with Torment bursts, spreading it to enemies within 1 hex.", {
      tier: 3, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 30, cp: 25 }, target: 'enemy_unit', range: 4, area: 1,
      effect: { type: 'status', status: 'st_torment', duration: 0, chance: 80, area: 1 },
    }));

  Data.define('transformations', TR('tr_painbound', '고통에 묶인 자', 'Painbound', '대상 종족이 고통을 받아들여, 공격받을 때마다 사기가 오르고 무작위 강화 효과를 얻습니다.',
    'The target race embraces pain: whenever struck, it gains Morale and a random positive status effect.', 'tome_torment',
    { kind: 'minor', effects: { morale: 2 } }));

  Data.define('improvements', IMP('imp_lens_of_anguish', '비탄의 렌즈', 'Lens of Anguish', '왕도에만 세울 수 있는 시설로, 마나와 전투 시전 포인트를 늘리고 피해·약화 주문이 사기까지 갉아먹게 합니다.',
    "Throne-City-only structure that boosts Mana and Combat Casting Points and makes Damage/Debuff spells also sap Morale.", 'tome_torment',
    { kind: 'conduit', cost: { gold: 100, imperium: 0 }, yields: { mana: 5 }, globalEffects: { combatCasting: 10 } }));

  Data.define('tomes', TOME('tome_torment', '고뇌의 서', 'Tome of Torment', '적의 행동 그 자체를 무기로 되돌리고, 고통으로 강해지는 아군을 빚어냅니다.',
    'Torment your enemies by turning their very actions against them, and make your units empowered by pain.', {
      tier: 3, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_3',
      passive: { desc: nm('고뇌에 걸린 적에게 주는 피해 +8%.', '+8% damage against enemies afflicted with Torment.'), effects: { dmgPct: 3 } },
      contents: [
        { type: 'spell', id: 'sp_agonize', cost: kc(3) },
        { type: 'spell', id: 'sp_tormenting_imbuement', cost: kc(3) },
        { type: 'unit', id: 'ta_pain_bringer', cost: kc(3, true) },
        { type: 'transformation', id: 'tr_painbound', cost: kc(3) },
        { type: 'improvement', id: 'imp_lens_of_anguish', cost: kc(3) },
        { type: 'spell', id: 'sp_shared_agony', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE COLD DARK (T3 Shadow)
  Data.define('units', U('ta_snow_spirit', '눈보라 정령', 'Snow Spirit', '살을 에는 냉기를 두른 채 얼어붙은 죽음을 퍼뜨리는 정령.', 'A spirit wreathed in bone-deep cold that spreads frozen death.', 'tome_cold_dark', {
    tier: 3, role: 'mage', tags: ['magic_origin', 'elemental'], mp: 40,
    hp: 95, def: 3, res: 4, morale: 0, statusRes: { frost: 8 },
    attacks: [{ id: 'killing_frost', name: nm('살을 에는 서리', 'Killing Frost'), type: 'ranged', damage: 18, channel: 'frost', range: 4, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'frozen', chance: 30 }], props: ['magic'] }],
    abilities: ['frost_bolt', 'freeze'], passives: ['immune_frost'],
    look: { body: 'elemental', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'frost', size: 'medium', tint: '#dff2ff', glow: '#9fd7ff' },
  }));

  Data.define('spells', SP('sp_flash_freeze', '급속 냉동', 'Flash Freeze', '지정한 지방의 적 유닛이 냉기 피해를 입고 상태이상 저항이 떨어지며, 지방에 눈과 얼음이 뒤덮입니다.',
    'Enemy units in the target province sustain Frost damage and lose Status Resistance as the land is blanketed in Snow and Ice.', {
      tier: 3, affinity: { shadow: 2 }, kind: 'transform', cost: { mana: 100, cp: 0 }, target: 'province', range: 4,
      effect: { type: 'terraform', terrain: 'snow', feature: 'ice', radius: 0 },
    }));
  Data.define('spells', SP('sp_veil_of_darkness', '어둠의 장막', 'Veil of Darkness', '지정한 부대를 이끄는 아군 전체가 위장을 두릅니다.',
    "The entire army led by the target gains universal camouflage.", {
      tier: 3, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 100, cp: 100 }, target: 'army', range: 0,
      effect: { type: 'status', status: 'concealed', duration: 3 },
    }));
  Data.define('spells', SP('sp_marching_winter', '진군하는 겨울', 'Marching Winter', '지정한 도시 영역 안팎의 지방이 매 턴 눈과 얼음으로 뒤덮이며 식량과 생산력을 늘립니다.',
    "Provinces within or adjacent to the target city's domain gradually gain Snow and Ice, boosting Food and Production.", {
      tier: 3, affinity: { shadow: 2 }, kind: 'transform', cost: { mana: 120, cp: 0 }, upkeep: { mana: 12 }, target: 'province', range: 0,
      effect: { type: 'terraform', terrain: 'snow', feature: 'ice', radius: 2 },
    }));
  Data.define('spells', SP('sp_permafrost_ward', '영구동토의 가호', 'Permafrost Ward', '전열 근접 유닛의 냉기 보호가 오릅니다.',
    "Front-line melee units gain Frost protection.", {
      tier: 3, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike', 'shock', 'fighter'], effects: { statusRes_frost: 5 } },
    }));

  Data.define('transformations', TR('tr_frostling', '서리 일족화', 'Frostling Transformation', '겨울의 피가 대상 종족의 혈관을 흐르게 해 냉기 보호와 빙결 면역, 추운 지형에서의 사기를 부여합니다.',
    "Makes winter run through the target race's veins: Frost protection, immunity to Frozen, and Morale on cold terrain.", 'tome_cold_dark',
    { kind: 'minor', effects: { statusRes_frost: 3 } }));

  Data.define('tomes', TOME('tome_cold_dark', '냉암의 서', 'Tome of the Cold Dark', '세상에 극지의 기후를 퍼뜨리고 그 힘으로 아군을 감쌉니다.',
    'Spread Arctic terrain throughout the world and envelop your units with its power.', {
      tier: 3, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_3',
      passive: { desc: nm('설원·빙원 지방 도시 안정도 +2. 설원에 농장을 지을 수 있습니다.', '+2 City Stability for provinces with Snow. Farms may now be built on Snow terrain.'), effects: { stability: 2 } },
      contents: [
        { type: 'spell', id: 'sp_flash_freeze', cost: kc(3) },
        { type: 'unit', id: 'ta_snow_spirit', cost: kc(3, true) },
        { type: 'spell', id: 'sp_veil_of_darkness', cost: kc(3) },
        { type: 'transformation', id: 'tr_frostling', cost: kc(3) },
        { type: 'spell', id: 'sp_marching_winter', cost: kc(3) },
        { type: 'spell', id: 'sp_permafrost_ward', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE GREAT TRANSFORMATION (T3 Shadow)
  Data.define('units', U('ta_bone_dragon', '뼈 용', 'Bone Dragon', '살은 썩어 없어졌지만 날개와 숨결은 여전히 죽음을 나릅니다.', 'Flesh long rotted away, yet its wings and breath still carry death.', 'tome_great_transformation', {
    tier: 4, role: 'shock', tags: ['undead', 'dragon'], move: 'fly', mp: 48,
    hp: 130, def: 4, res: 3, morale: 0,
    attacks: [{ id: 'bone_bite', name: nm('뼈 이빨', 'Bone Bite'), type: 'melee', damage: 26, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['charge'] }],
    abilities: ['dragon_breath_blight'], passives: ['undead', 'flying', 'large_target'],
    look: { body: 'dragon', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'blight', size: 'huge', tint: '#c9c0a8', glow: '#6b7a4e' },
  }));

  Data.define('spells', SP('sp_desecrate_structure', '신전 모독', 'Desecrate Structure', '영역 안의 자원 지점을 모독하여 마나 수입을 추가로 얻습니다. 지방을 잃으면 효과가 사라집니다.',
    'Desecrates a resource node in your domain for extra Mana income; the effect ends if you lose the province.', {
      tier: 3, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 80, cp: 80 }, upkeep: { mana: 8 }, target: 'province', range: 0,
      effect: { type: 'resource', mana: 5 },
    }));
  Data.define('spells', SP('sp_domain_of_death', '죽음의 영역', 'Domain of Death', '지정한 아군 도시의 안정도가 크게 오르고, 영역 안의 아군 언데드가 더 강해지며, 적은 영혼 결박됩니다.',
    "Greatly boosts the target friendly city's Stability; friendly Undead in the domain hit harder and enemies there become Soulbound.", {
      tier: 3, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 60, cp: 0 }, upkeep: { mana: 5 }, target: 'city', range: 0,
      effect: { type: 'stability', amount: 20 },
    }));
  Data.define('spells', SP('sp_necrotic_spires', '괴사의 첨탑', 'Necrotic Spires', '공성전에서 첨탑을 세워 방어군을 지원하고, 영역 안의 아군 언데드를 매 턴 치유합니다.',
    'Raises spires that support the defenders in a siege and heal friendly Undead in the domain each turn.', {
      tier: 3, affinity: { shadow: 2 }, kind: 'city_enchant', cost: { mana: 85, cp: 0 }, target: 'city', range: 0,
      enchant: { effects: { wallHp: 20, healPerTurn: 3 } },
    }));
  Data.define('spells', SP('sp_fetid_legion', '악취 나는 군단', 'Fetid Legion', '전열 근접 유닛의 체력이 늘어나고, 턴이 끝날 때 인접한 적을 약화시키는 기운을 두릅니다.',
    "Front-line melee units gain extra Hit Points and an aura that Weakens adjacent enemies at the end of the turn.", {
      tier: 3, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 120, cp: 120 }, upkeep: { mana: 6 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike', 'shock', 'fighter'], effects: { hp: 10 }, attackStatus: { id: 'weakened', chance: 40 } },
    }));
  Data.define('spells', SP('sp_grave_bond', '무덤의 결속', 'Grave Bond', '언데드 아군의 공격이 준 피해의 일부만큼 체력을 회복시킵니다.',
    "Undead allies' attacks heal them for a portion of the damage dealt.", {
      tier: 3, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 90, cp: 90 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike', 'shock', 'fighter'], effects: { healPct: 10 } },
    }));

  Data.define('transformations', TR('tr_wightborn', '위트본화', 'Wightborn', '대상 종족에게 삶 너머의 불멸을 부여해 언데드 유형과 공격 시 생명력 흡수를 얻습니다.',
    'Gives the target race immortality beyond life: the Undead unit type and Life Steal on their attacks.', 'tome_great_transformation',
    { kind: 'major', effects: { dmgPct: 5 } }));

  Data.define('tomes', TOME('tome_great_transformation', '대변화의 서', 'Tome of the Great Transformation', '백성을 언데드로 바꾸고 제국을 그들이 번성할 낙원으로 바꿉니다.',
    'Turn your people into the Undead and transform your empire into a paradise for them to thrive in.', {
      tier: 3, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_3',
      passive: { desc: nm('전투에서 적을 처치하면 마나를 얻습니다. 폐허와 지하묘지의 영웅을 언데드 하수인으로 되살릴 수 있습니다.', 'Gain Mana when enemies die in battle. Unlocks animating City Ruins and crypt Heroes as Undead servants.'), effects: { mana: 5 } },
      contents: [
        { type: 'unit', id: 'ta_bone_dragon', cost: kc(3, true) },
        { type: 'spell', id: 'sp_desecrate_structure', cost: kc(3) },
        { type: 'spell', id: 'sp_domain_of_death', cost: kc(3) },
        { type: 'transformation', id: 'tr_wightborn', cost: kc(3) },
        { type: 'spell', id: 'sp_fetid_legion', cost: kc(3) },
        { type: 'spell', id: 'sp_necrotic_spires', cost: kc(3) },
        { type: 'spell', id: 'sp_grave_bond', cost: kc(3) },
        { type: 'spell', id: 'sp_grasp_of_the_grave', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF ASTRAL CONVERGENCE (T4 Astral)
  Data.define('units', U('ta_arcane_guardian', '비전 수호자', 'Arcane Guardian', '아스트랄 바다에서 태어나 폭발적인 마력을 내뿜는 파수꾼.', 'A sentinel born of the Astral Sea that vents bursts of raw magic.', 'tome_astral_convergence', {
    tier: 3, role: 'fighter', tags: ['magic_origin'], mp: 32,
    hp: 100, def: 4, res: 3, morale: 0,
    attacks: [{ id: 'arcane_slam', name: nm('비전 강타', 'Arcane Slam'), type: 'melee', damage: 20, channel: 'lightning', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['ab_elemental_beam'], passives: ['construct', 'hardened'],
    look: { body: 'golem', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'large', tint: '#7d9cff', glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_astral_shattering', '아스트랄 붕괴', 'Astral Shattering', '지정한 지방이 폐허가 되고, 아스트랄 바다에서 온 약탈자 군세가 나타납니다.',
    'The target province is reduced to ruins and a marauding army of Astral Sea creatures appears.', {
      tier: 4, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 150, cp: 150 }, target: 'province', range: 0,
      effect: { type: 'special', id: 'astral_shattering' },
    }));
  Data.define('spells', SP('sp_explosive_manifestation', '폭발적 현신', 'Explosive Manifestation', '빈 칸에 아스트랄 뱀을 소환하고, 주변의 모든 유닛이 화염·번개·냉기 피해를 입습니다.',
    'Conjures an Astral Serpent on an empty hex; everything adjacent sustains Fire, Lightning and Frost damage.', {
      tier: 4, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 100, cp: 40 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'summon', unit: 'ta_astral_serpent', count: 1 },
    }));
  Data.define('spells', SP('sp_cascading_power', '연쇄하는 힘', 'Cascading Power', '전투 중 주문을 시전할 때마다 이번 전투에 연쇄하는 힘이 한 겹 쌓입니다.',
    'Whenever you cast a spell in this battle, add a stack of Cascading Power to the fight.', {
      tier: 4, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 120, cp: 0 }, upkeep: { mana: 12 }, target: 'empire', range: 0,
      effect: { type: 'special', id: 'cascading_power' },
    }));
  Data.define('spells', SP('sp_arcane_resonance', '비전 공명', 'Arcane Resonance', '제국의 세계 지도 및 전투 시전 포인트가 늘어납니다.',
    "Increases the empire's World Map and Combat Casting Points.", {
      tier: 4, affinity: { astral: 2 }, kind: 'empire', cost: { mana: 0, cp: 0 }, target: 'empire', range: 0,
      effect: { type: 'special', id: 'arcane_resonance' },
    }));

  Data.define('transformations', TR('tr_astral_attunement', '아스트랄 동조', 'Astral Attunement', '대상 종족을 아스트랄 바다와 연결해 반실체화 특성과, 전투 중 주문이 시전될 때마다 무작위 강화 효과를 얻는 조율을 부여합니다.',
    'Links the target race to the Astral Sea, granting the Ethereal trait and a random buff whenever a spell is cast nearby in battle.', 'tome_astral_convergence',
    { kind: 'major', effects: { res: 1 } }));

  Data.define('tomes', TOME('tome_astral_convergence', '아스트랄 수렴의 서', 'Tome of Astral Convergence', '주문을 시전할수록 강해지고, 아스트랄 바다의 존재를 소환합니다.',
    'Become stronger the more spells you cast and summon creatures from the Astral Sea.', {
      tier: 4, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_4',
      passive: { desc: nm('전투에서 주문을 시전할 때마다 저항력 감소 저주가 적 전체에 걸립니다.', 'Every spell you cast in battle saps a little Resistance from all enemies.'), effects: { casting: 5 } },
      contents: [
        { type: 'spell', id: 'sp_astral_shattering', cost: kc(4) },
        { type: 'unit', id: 'ta_arcane_guardian', cost: kc(4, true) },
        { type: 'transformation', id: 'tr_astral_attunement', cost: kc(4) },
        { type: 'spell', id: 'sp_cascading_power', cost: kc(4) },
        { type: 'spell', id: 'sp_explosive_manifestation', cost: kc(4) },
        { type: 'spell', id: 'sp_arcane_resonance', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE ASTRAL MIRROR (T4 Astral)
  Data.define('units', U('ta_mirror_image', '거울 환영', 'Mirror Image', '적의 모습을 훔쳐 그 힘까지 흉내 내는 신화급 존재.', 'A mythic being that steals an enemy\'s shape and mimics their power.', 'tome_astral_mirror', {
    tier: 4, role: 'fighter', tags: ['magic_origin', 'mythic'], mp: 40,
    hp: 110, def: 3, res: 5, morale: 0,
    attacks: [{ id: 'mirrored_strike', name: nm('거울 일격', 'Mirrored Strike'), type: 'melee', damage: 22, channel: 'lightning', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [], props: ['magic'] }],
    abilities: ['ab_mimic_form'], passives: ['ab_reflect_ward', 'elusive'],
    look: { body: 'wisp', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'medium', tint: '#dce6ff', glow: '#c9d6ff' },
  }));

  Data.define('spells', SP('sp_astral_revelation', '아스트랄 계시', 'Astral Revelation', '보유한 모든 유닛과 도시의 시야가 크게 넓어집니다.',
    'Every unit and city you control gains a large boost to Vision Range.', {
      tier: 4, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 150, cp: 150 }, upkeep: { mana: 15 }, target: 'empire', range: 0,
      effect: { type: 'special', id: 'astral_revelation' },
    }));
  Data.define('spells', SP('sp_mirror_veil', '거울의 장막', 'Mirror Veil', '전열 근접 유닛이 받는 마법 피해의 일부를 공격자에게 되돌립니다.',
    "Front-line melee units reflect a portion of non-Physical damage back at their attackers.", {
      tier: 4, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 160, cp: 160 }, upkeep: { mana: 8 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'pike', 'shock', 'fighter', 'skirmisher'], effects: { statusRes: 2 } },
    }));
  Data.define('spells', SP('sp_throne_of_mirrors', '거울의 왕좌', 'Throne of Mirrors', '왕도의 군주가 자리를 비운 사이 전투가 벌어지면 군주의 거울 환영이 대신 나타납니다.',
    "If a battle breaks out in the Throne City's domain while the Ruler is elsewhere, a Mirror Reflection of them fights in their place.", {
      tier: 4, affinity: { astral: 2 }, kind: 'city_enchant', cost: { mana: 170, cp: 0 }, target: 'city', range: 0,
      enchant: { effects: { cityDefense: 10 } },
    }));
  Data.define('spells', SP('sp_summon_astral_reflection', '아스트랄 환영 소환', 'Summon Astral Reflection', '아군 하나의 아스트랄 환영을 인접한 빈 칸에 만들어냅니다.',
    'Conjures an Astral Reflection of a friendly unit onto an unoccupied adjacent hex.', {
      tier: 4, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 150, cp: 50 }, target: 'ally_unit', range: 1,
      effect: { type: 'summon', unit: 'ta_mirror_image', count: 1 },
    }));

  Data.define('tomes', TOME('tome_astral_mirror', '아스트랄 거울의 서', 'Tome of the Astral Mirror', '아군과 군주의 아스트랄 환영을 빚어내고, 받은 피해를 공격자에게 되돌립니다.',
    'Create Astral Reflections of your units and leader, and reflect damage back onto attackers.', {
      tier: 4, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_4',
      passive: { desc: nm('전투에서 죽은 아군 마법 기원 유닛이 15% 확률로 환영으로 되살아납니다.', "A friendly Magic Origin unit slain in battle has a 15% chance to return as a Reflection."), effects: { res: 1 } },
      contents: [
        { type: 'spell', id: 'sp_astral_revelation', cost: kc(4) },
        { type: 'unit', id: 'ta_mirror_image', cost: kc(4, true) },
        { type: 'spell', id: 'sp_astral_bulwark', cost: kc(4) },
        { type: 'spell', id: 'sp_mirror_veil', cost: kc(4) },
        { type: 'spell', id: 'sp_throne_of_mirrors', cost: kc(4) },
        { type: 'spell', id: 'sp_summon_astral_reflection', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF OBLIVION (T4 Shadow)
  Data.define('units', U('ta_living_fog', '살아있는 안개', 'Living Fog', '광기와 침묵을 몰고 다니는 형체 없는 공포.', 'A formless horror that trails madness and silence in its wake.', 'tome_oblivion', {
    tier: 4, role: 'mage', tags: ['eldritch', 'mythic'], move: 'float', mp: 36,
    hp: 130, def: 7, res: 5, morale: 0,
    attacks: [{ id: 'dread_touch', name: nm('공포의 손길', 'Dread Touch'), type: 'melee', damage: 22, channel: 'spirit', range: 1, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'st_insanity', chance: 40 }], props: ['magic'] }],
    abilities: ['ab_insanity_gaze'], passives: ['ab_obscuring_mist_aura', 'floating'],
    look: { body: 'eldritch', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'shadow', size: 'large', tint: '#3a3550', glow: '#7b3fa0' },
  }));

  Data.define('spells', SP('sp_devouring_void', '집어삼키는 공허', 'Devouring Void', '주변 1칸에 공허를 만들어냅니다. 매 턴 반경이 넓어지며 2턴 동안 지속됩니다.',
    'Conjures a Devouring Void within 1 hex; its radius grows each turn and it lasts 2 Turns.', {
      tier: 4, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 100, cp: 40 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'damage', channel: 'blight', amount: 20, area: 1 },
    }));
  Data.define('spells', SP('sp_sleep_of_oblivion', '망각의 잠', 'Sleep of Oblivion', '영웅이 아닌 대상 유닛이 죽었다가 2턴 뒤 체력 75%로 되살아나며 광기에 빠집니다. 그동안 되살리거나 시신을 없앨 수 없습니다.',
    'A non-Hero target dies, then returns after 2 Turns at 75% Hit Points afflicted with Insanity; it cannot be revived or destroyed while dead this way.', {
      tier: 4, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 100, cp: 40 }, target: 'enemy_unit', range: 4,
      effect: { type: 'status', status: 'st_insanity', duration: 1, chance: 90, special: 'sleep_of_oblivion' },
    }));
  Data.define('spells', SP('sp_ritual_of_somnia', '몽마의 의식', 'Ritual of Somnia', '지정한 적 군세가 이번 세계 지도 턴 동안 전투를 시작할 때마다 90% 확률로 기절합니다.',
    'Every battle the target enemy army fights this World Map Turn opens with a 90% chance of Stun.', {
      tier: 4, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 120, cp: 120 }, target: 'army', range: 0,
      effect: { type: 'status', status: 'stunned', duration: 2, chance: 90 },
    }));
  Data.define('spells', SP('sp_fog_of_insanity', '광기의 안개', 'Fog of Insanity', '지정한 아군 도시 영역의 전투마다 적이 매 턴 20% 확률로 광기에 빠지는 안개가 깔립니다.',
    "Every battle in the target city's domain is shrouded in a fog that gives enemies a 20% chance of Insanity each turn.", {
      tier: 4, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 200, cp: 0 }, upkeep: { mana: 20 }, target: 'city', range: 0,
      effect: { type: 'special', id: 'fog_of_insanity' },
    }));
  Data.define('spells', SP('sp_void_step', '공허 도약', 'Void Step', '지정한 지방에 잠시 위험지대를 만들어 그 안의 적 유닛에게 역병 피해를 입힙니다.',
    'Briefly conjures a hazard over the target province, dealing Blight damage to enemy units inside it.', {
      tier: 4, affinity: { shadow: 2 }, kind: 'transform', cost: { mana: 100, cp: 0 }, target: 'province', range: 4,
      effect: { type: 'terraform', terrain: 'swamp', feature: 'ash', radius: 0 },
    }));

  Data.define('tomes', TOME('tome_oblivion', '망각의 서', 'Tome of Oblivion', '적을 공허의 무(無)로 보내버리는 강력한 마법을 다룹니다. 광기를 퍼뜨리고 세상과 전장의 일부를 살 수 없는 땅으로 만드는 데 특화합니다.',
    'Use powerful magic capable of sending your enemies into the nothingness of Oblivion; specialize in inflicting Insanity and blighting the land.', {
      tier: 4, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_4',
      passive: { desc: nm('전투에서 광기에 걸린 적에게 주는 피해 +10%.', '+10% damage against enemies afflicted with Insanity.'), effects: { dmgPct: 4 } },
      contents: [
        { type: 'spell', id: 'sp_devouring_void', cost: kc(4) },
        { type: 'spell', id: 'sp_sleep_of_oblivion', cost: kc(4) },
        { type: 'unit', id: 'ta_living_fog', cost: kc(4, true) },
        { type: 'spell', id: 'sp_ritual_of_somnia', cost: kc(4) },
        { type: 'spell', id: 'sp_fog_of_insanity', cost: kc(4) },
        { type: 'spell', id: 'sp_void_step', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE REAPER (T4 Shadow)
  Data.define('units', U('ta_reaper', '사신', 'Reaper', '적이 죽을 때마다 힘을 얻는, 죽음 그 자체를 형상화한 존재.', 'A mythic incarnation of death itself, growing stronger with every kill.', 'tome_reaper', {
    tier: 5, role: 'fighter', tags: ['undead', 'mythic'], mp: 40,
    hp: 150, def: 6, res: 6, morale: 0, statusRes: { spirit: 10 },
    attacks: [{ id: 'reaping_scythe', name: nm('수확의 낫', 'Reaping Scythe'), type: 'melee', damage: 32, channel: 'spirit', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'condemned', chance: 50 }], props: ['magic'] }],
    abilities: ['ab_death_touch', 'dark_pact'], passives: ['undead', 'fearless', 'life_steal'],
    look: { body: 'skull', armor: 'none', weapon: 'great_sword', helm: 'none', cape: 'long', shield: 'none', element: 'shadow', size: 'large', tint: '#2b2436', glow: '#7b3fa0' },
  }));

  Data.define('spells', SP('sp_marked_for_death', '죽음의 표식', 'Marked for Death', '대상이 막을 수 없는 물리 피해를 입고 사기를 잃으며, 인접한 곳에 부패한 시체가 솟아납니다.',
    'The target sustains unblockable Physical damage and loses Morale as a Decaying Zombie rises beside it.', {
      tier: 4, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 0, cp: 40 }, target: 'enemy_unit', range: 4,
      effect: { type: 'damage', channel: 'physical', amount: 15, status: { id: 'demoralized', chance: 100, duration: 2 } },
    }));
  Data.define('spells', SP('sp_harvest_population', '인구 수확', 'Harvest Population', '지정한 아군 도시가 식량 대신 마나를 대량으로 얻지만 안정도가 떨어집니다.',
    "The target friendly city trades its Food income for a large amount of Mana, at the cost of Stability.", {
      tier: 4, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 45, cp: 45 }, target: 'city', range: 0,
      effect: { type: 'resource', mana: 30, stability: -20 },
    }));
  Data.define('spells', SP('sp_soul_siphon_ritual', '영혼 착취 의식', 'Soul Siphon Ritual', '공성전에서 성벽이 무너지면 마나를 크게 얻고, 전투 시작 시 부패한 시체 부대를 얻으며 적 전체를 영혼 결박합니다.',
    'When the walls fall in a siege you gain a burst of Mana; the battle opens with a squad of Decaying Zombies and every enemy becomes Soulbound.', {
      tier: 4, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 0, cp: 0 }, target: 'city', range: 0,
      effect: { type: 'special', id: 'soul_siphon_ritual' },
    }));
  Data.define('spells', SP('sp_greater_reanimation', '대재생', 'Greater Reanimation', '대상이 언데드가 아니라면 길 잃은 영혼으로, 언데드라면 체력 전부로 되살아납니다.',
    "Resurrects the target: as a Lost Soul if it wasn't Undead, or at full Hit Points if it was.", {
      tier: 4, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 0, cp: 40 }, target: 'ally_unit', range: 3,
      effect: { type: 'summon', unit: 'ta_lost_soul', count: 1 },
    }));

  Data.define('tomes', TOME('tome_reaper', '사신의 서', 'Tome of the Reaper', '잔혹한 방식으로 영혼을 뽑아내 언데드의 공포를 세상에 풀어놓습니다. 즉사 효과와 궁극의 언데드 시너지에 특화합니다.',
    'Extract Souls in brutal fashion and use them to bring Undead terrors into the world; specialize in instant-kill effects and Undead synergy.', {
      tier: 4, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_4',
      passive: { desc: nm('전투에서 적을 처치하면 마나를 얻습니다. 폐허와 지하묘지의 영웅을 언데드 하수인으로 되살릴 수 있습니다.', 'Gain Mana when enemies die in battle. Unlocks animating City Ruins and crypt Heroes as Undead servants.'), effects: { mana: 6 } },
      contents: [
        { type: 'spell', id: 'sp_marked_for_death', cost: kc(4) },
        { type: 'spell', id: 'sp_harvest_population', cost: kc(4) },
        { type: 'unit', id: 'ta_reaper', cost: kc(4, true) },
        { type: 'spell', id: 'sp_soul_flare', cost: kc(4) },
        { type: 'spell', id: 'sp_soul_siphon_ritual', cost: kc(4) },
        { type: 'spell', id: 'sp_greater_reanimation', cost: kc(4) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE ARCHMAGE (T5 Astral)
  Data.define('spells', SP('sp_astral_travel', '아스트랄 여행', 'Astral Travel', '군주가 지정한 세계 지도의 칸으로 순간이동합니다.',
    "Teleports your Ruler to the target hex on the world map.", {
      tier: 5, affinity: { astral: 2 }, kind: 'strategic', cost: { mana: 200, cp: 200 }, target: 'player', range: 0,
      effect: { type: 'teleport', range: 999 },
    }));
  Data.define('spells', SP('sp_cosmic_overdrive', '우주적 과충전', 'Cosmic Overdrive', '전투 소환수와 마법 기원 유닛의 피해가 크게 늘고 이동이 매우 빨라집니다.',
    "Combat Summons and Magic Origin units deal much more damage and move very quickly.", {
      tier: 5, affinity: { astral: 2 }, kind: 'unit_enchant', cost: { mana: 180, cp: 180 }, upkeep: { mana: 9 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['magic_origin'], effects: { dmgPct: 20, mp: 2 } },
    }));
  Data.define('spells', SP('sp_time_stop', '시간 정지', 'Time Stop', '주변 1칸의 적이 기절하고 정신이 흐트러지며 표식을 크게 얻습니다.',
    'Enemies within 1 hex become Stunned and Distracted, and gain a heavy stack of Marked.', {
      tier: 5, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 200, cp: 65 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'status', status: 'stunned', duration: 1, chance: 100, area: 1, extraStatus: 'marked' },
    }));
  Data.define('spells', SP('sp_disruption_wave', '붕괴의 파동', 'Disruption Wave', '적 전체가 붕괴 상태에 걸릴 확률이 높고, 적의 강화 두 개와 아군의 약화 두 개가 사라집니다.',
    'Enemies have a very high chance of becoming Disrupted; dispels two buffs from enemies and two debuffs from allies.', {
      tier: 5, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 300, cp: 80 }, target: 'all_enemies', range: 4,
      effect: { type: 'dispel' },
    }));
  Data.define('spells', SP('sp_arcane_singularity', '비전 특이점', 'Arcane Singularity', '주변 2칸에 순수한 비전력이 붕괴하며 번개 피해를 입힙니다.',
    'Raw arcane force collapses within 2 hexes, dealing Lightning damage to everything caught inside.', {
      tier: 5, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 200, cp: 65 }, target: 'hex', range: 4, area: 2,
      effect: { type: 'damage', channel: 'lightning', amount: 40, area: 2, status: { id: 'electrified', chance: 60, duration: 3 } },
    }));

  Data.define('tomes', TOME('tome_archmage', '대마법사의 서', 'Tome of the Archmage', '공간과 시간을 뜻대로 다루어 비전 마법의 정점에 이릅니다.',
    'Reach the pinnacle of the arcane arts by bending space and time to your will.', {
      tier: 5, affinity: { astral: 2 }, expansion: null, icon: 'tome_astral_5',
      passive: { desc: nm('세계 지도·전투 시전 포인트 +10.', '+10 World Map and Combat Casting Points.'), effects: { casting: 10, combatCasting: 10 } },
      contents: [
        { type: 'spell', id: 'sp_astral_travel', cost: kc(5) },
        { type: 'spell', id: 'sp_cosmic_overdrive', cost: kc(5) },
        { type: 'spell', id: 'sp_time_stop', cost: kc(5) },
        { type: 'spell', id: 'sp_disruption_wave', cost: kc(5) },
        { type: 'spell', id: 'sp_arcane_singularity', cost: kc(5) },
        { type: 'spell', id: 'sp_arcane_finality', cost: kc(5) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE ETERNAL LORD (T5 Shadow)
  Data.define('spells', SP('sp_withering_mist', '쇠약의 안개', 'Withering Mist', '3턴에 걸쳐 매 턴 적 전체가 냉기 피해를 입고 실명과 약화에 걸립니다.',
    'Over 3 Turns, every enemy sustains Frost damage each turn and is likely to become Blind and Weakened.', {
      tier: 5, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 100, cp: 40 }, target: 'all_enemies', range: 4,
      effect: { type: 'damage', channel: 'frost', amount: 15, status: { id: 'weakened', chance: 90, duration: 3 } },
    }));
  Data.define('spells', SP('sp_raise_undead_army', '언데드 군세 일으키기', 'Raise Undead Army', '지정한 세계 지도 칸에 하급 언데드로 이루어진 부대 전체를 소환합니다.',
    'Summons a full army stack of low-Tier Undead units onto the target world hex.', {
      tier: 5, affinity: { shadow: 2 }, kind: 'strategic', cost: { mana: 150, cp: 300 }, target: 'hex', range: 0,
      effect: { type: 'summon', unit: 'ta_skeleton', count: 4 },
    }));
  Data.define('spells', SP('sp_true_death_magic', '진정한 죽음의 마법', 'True Death Magic', '지원·마법사 유닛의 공격이 대상을 즉사시킬 확률을 얻습니다.',
    "Support and Battle Mage attacks gain a chance to instantly slay their target.", {
      tier: 5, affinity: { shadow: 2 }, kind: 'unit_enchant', cost: { mana: 90, cp: 75 }, upkeep: { mana: 5 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['support', 'mage'], effects: {}, attackStatus: { id: 'condemned', chance: 30 } },
    }));
  Data.define('spells', SP('sp_battlefield_reanimation', '전장의 재생', 'Battlefield Reanimation', '아군 언데드가 모두 체력 절반으로 되살아나고, 언데드가 아닌 시신도 부패한 시체로 일어납니다.',
    'Every friendly Undead comes back to life at half Hit Points, and non-Undead corpses rise as Decaying Zombies under your control.', {
      tier: 5, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 0, cp: 65 }, target: 'ally_unit', range: 0, area: 3,
      effect: { type: 'resurrect', hpPct: 50, area: 3 },
    }));
  Data.define('spells', SP('sp_eternal_dominion', '영원한 지배', 'Eternal Dominion', '보유한 모든 언데드 유닛의 체력과 상태이상 저항이 영구히 오릅니다.',
    'Permanently raises the Hit Points and Status Resistance of every Undead unit you control.', {
      tier: 5, affinity: { shadow: 2 }, kind: 'empire', cost: { mana: 0, cp: 0 }, target: 'empire', range: 0,
      effects: { hp: 5 },
    }));

  Data.define('tomes', TOME('tome_eternal_lord', '영원한 군주의 서', 'Tome of the Eternal Lord', '영원한 영토의 지배자가 되어 끝없는 군세를 지휘합니다.',
    'Become the leader of an eternal realm and command unending armies.', {
      tier: 5, affinity: { shadow: 2 }, expansion: null, icon: 'tome_shadow_5',
      passive: { desc: nm('전투에서 적을 처치하면 마나를 얻습니다. 폐허와 지하묘지의 영웅을 언데드 하수인으로 되살릴 수 있습니다.', 'Gain Mana when enemies die in battle. Unlocks animating City Ruins and crypt Heroes as Undead servants.'), effects: { mana: 6 } },
      contents: [
        { type: 'spell', id: 'sp_withering_mist', cost: kc(5) },
        { type: 'spell', id: 'sp_raise_undead_army', cost: kc(5) },
        { type: 'spell', id: 'sp_true_death_magic', cost: kc(5) },
        { type: 'spell', id: 'sp_battlefield_reanimation', cost: kc(5) },
        { type: 'spell', id: 'sp_eternal_dominion', cost: kc(5) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE TENTACLE (T1 Shadow/Astral dual)
  Data.define('units', U('ta_tentacle_horror', '촉수 괴물', 'Tentacle Horror', '심연에서 솟아나 자리를 지키며 붙잡는 촉수 덩어리.', 'A mass of tentacles that erupts from the deep and holds its ground.', 'tome_tentacle', {
    tier: 1, role: 'polearm', tags: ['eldritch'], mp: 0,
    cost: { gold: 0, mana: 30, draft: 0 }, upkeep: { gold: 0, mana: 3 },
    hp: 50, def: 0, res: 0, morale: 0,
    attacks: [{ id: 'grasping_tendril', name: nm('휘감는 덩굴손', 'Grasping Tendril'), type: 'melee', damage: 10, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'rooted', chance: 50 }], props: [] }],
    abilities: ['ab_constrict'], passives: ['true_sight'],
    look: { body: 'eldritch', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'shadow', size: 'large', tint: '#3d2a4a', glow: '#7b3fa0' },
  }));
  Data.define('units', U('ta_constrictor', '결박자', 'Constrictor', '적을 끌어당겨 옭아매는 장병기 유닛.', 'A polearm unit that hauls enemies in and pins them down.', 'tome_tentacle', {
    tier: 2, role: 'polearm', tags: ['magic_origin'], mp: 40,
    hp: 80, def: 4, res: 1, morale: 0,
    attacks: [{ id: 'tendril_lash', name: nm('덩굴손 채찍', 'Tendril Lash'), type: 'melee', damage: 16, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'st_constricted', chance: 50 }], props: [] }],
    abilities: ['ab_constrict', 'pike_brace', 'defend'], passives: ['first_strike'],
    look: { body: 'form', armor: 'leather', weapon: 'spear', helm: 'open', cape: false, shield: 'none', element: 'shadow', size: 'medium', tint: null, glow: null },
  }));

  Data.define('spells', SP('sp_constricting_focus', '옭죄는 집중', 'Constricting Focus', '지원·마법사 유닛의 기본 마법 공격이 물리 피해를 추가로 주고 옭죄임을 걸 확률을 얻으며, 표식이나 둔화된 적에게는 확률이 배로 늘어납니다.',
    "Support and Battle Mage base attacks add Physical damage and a chance to inflict Constricted, doubled against Marked or Slowed targets.", {
      tier: 1, affinity: { shadow: 1, astral: 1 }, kind: 'unit_enchant', cost: { mana: 80, cp: 80 }, upkeep: { mana: 4 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['support', 'mage'], effects: { channelDmg_physical: 2 }, attackStatus: { id: 'st_constricted', chance: 30 } },
    }));
  Data.define('spells', SP('sp_retaliating_growths', '반격의 촉수', 'Retaliating Growths', '아군 하나의 몸에서 촉수가 돋아나 반격 시 추가로 옭죄임을 겁니다.',
    "Tendrils sprout from a friendly unit, adding a chance to Constrict on retaliation.", {
      tier: 1, affinity: { shadow: 1, astral: 1 }, kind: 'combat', cost: { mana: 10, cp: 15 }, target: 'ally_unit', range: 3,
      effect: { type: 'status', status: 'shielded', duration: 2, chance: 100 },
    }));
  Data.define('spells', SP('sp_grasping_shadows', '움켜쥐는 그림자', 'Grasping Shadows', '주변 2칸의 적이 그림자 촉수에 붙들려 속박됩니다.',
    'Enemies within 2 hexes are seized by tentacles of shadow and Rooted.', {
      tier: 1, affinity: { shadow: 1, astral: 1 }, kind: 'combat', cost: { mana: 20, cp: 20 }, target: 'hex', range: 4, area: 2,
      effect: { type: 'status', status: 'rooted', duration: 2, chance: 70, area: 2 },
    }));

  Data.define('improvements', IMP('imp_tendril_labyrinth', '덩굴손 미궁', 'Tendril Labyrinth', '촉수가 뒤엉킨 미궁으로, 금과 도시 안정도를 늘립니다.',
    'A labyrinth of writhing tendrils that boosts Gold income and City Stability.', 'tome_tentacle',
    { kind: 'special', cost: { gold: 60, imperium: 0 }, yields: { gold: 10, stability: 10 } }));

  Data.define('tomes', TOME('tome_tentacle', '촉수의 서', 'Tome of the Tentacle', '심연에서 온 촉수 돌연변이와 생명체를 불러내 적을 옭아매고 원하는 곳에 묶어둡니다.',
    'Conjure tentacled mutations and creatures from the depths to restrain and constrict your enemies, keeping them right where you want them.', {
      tier: 1, affinity: { shadow: 1, astral: 1 }, expansion: null, icon: 'tome_shadow_1',
      passive: { desc: nm('옭죄임에 걸린 적에게 주는 피해 +10%.', '+10% damage against enemies afflicted with Constricted.'), effects: { dmgPct: 3 } },
      contents: [
        { type: 'unit', id: 'ta_tentacle_horror', cost: kc(1, true) },
        { type: 'unit', id: 'ta_constrictor', cost: kc(1, true) },
        { type: 'spell', id: 'sp_constricting_focus', cost: kc(1) },
        { type: 'spell', id: 'sp_retaliating_growths', cost: kc(1) },
        { type: 'improvement', id: 'imp_tendril_labyrinth', cost: kc(1) },
        { type: 'spell', id: 'sp_grasping_shadows', cost: kc(1) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF CORRUPTION (T3 Shadow/Astral dual)
  Data.define('units', U('ta_eldritch_abomination', '이계의 화신', 'Eldritch Abomination', '심연의 여주인으로, 다른 이들의 의지를 굽혀 자신의 뜻대로 부립니다.', 'A mistress of the abyss who bends other minds to her will.', 'tome_corruption', {
    tier: 4, role: 'mage', tags: ['eldritch', 'mythic'], move: 'float', mp: 40,
    hp: 110, def: 3, res: 5, morale: 0,
    attacks: [{ id: 'mind_warp', name: nm('정신 왜곡', 'Mind Warp'), type: 'ranged', damage: 22, channel: 'spirit', range: 4, ap: 1, repeat: 1, accuracy: 80, strikes: 1, effects: [{ status: 'charmed', chance: 30 }], props: ['magic'] }],
    abilities: ['ab_insanity_gaze', 'mind_control'], passives: ['floating', 'fast_movement'],
    look: { body: 'eldritch', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'shadow', size: 'large', tint: '#4a2d5c', glow: '#5a7ff0' },
  }));

  Data.define('spells', SP('sp_corrupted_boon', '타락한 축복', 'Corrupted Boon', '적 하나가 모든 강화 효과를 잃고, 상쇄되는 약화 효과가 있다면 그 약화 효과를 대신 얻습니다.',
    'The target enemy loses every buff; for each buff that has a countering debuff, it gains that debuff instead.', {
      tier: 3, affinity: { shadow: 1, astral: 1 }, kind: 'combat', cost: { mana: 20, cp: 25 }, target: 'enemy_unit', range: 4,
      effect: { type: 'dispel' },
    }));
  Data.define('spells', SP('sp_throne_of_insidious_whispers', '음흉한 속삭임의 왕좌', 'Throne of Insidious Whispers', '왕도에만 세울 수 있는 시설로 마나와 시전 포인트를 늘리고, 이 영역의 전투 시작 시 적 셋에게 광기나 기절을 겁니다.',
    'A Throne-City-only structure boosting Mana and Casting Points; battles in this domain open with three enemies afflicted by Insanity or Stun.', {
      tier: 3, affinity: { shadow: 1, astral: 1 }, kind: 'city_enchant', cost: { mana: 170, cp: 0 }, target: 'city', range: 0,
      enchant: { effects: { casting: 15, combatCasting: 15 } },
    }));
  Data.define('spells', SP('sp_treacherous_reflection', '배신하는 환영', 'Treacherous Reflection', '적 하나의 배신하는 환영을 만들어냅니다. 영웅·전투 소환수·신화급 유닛에게는 쓸 수 없습니다.',
    "Creates a Treacherous Reflection of an enemy unit; cannot target Heroes, Combat Summons or Mythic units.", {
      tier: 3, affinity: { shadow: 1, astral: 1 }, kind: 'combat', cost: { mana: 100, cp: 40 }, target: 'enemy_unit', range: 4,
      effect: { type: 'summon', unit: 'ta_mirror_image', count: 1 },
    }));
  Data.define('spells', SP('sp_umbral_incursion', '음영의 침공', 'Umbral Incursion', '지정한 적 도시가 접경 지방 하나와 그 인구를 잃고, 그 자리에 음영의 둥지가 나타납니다.',
    'The target enemy city loses a border province and its population as an Umbral Nest appears there.', {
      tier: 3, affinity: { shadow: 1, astral: 1 }, kind: 'strategic', cost: { mana: 120, cp: 120 }, target: 'city', range: 0,
      effect: { type: 'damage', channel: 'blight', amount: 20 },
    }));
  Data.define('spells', SP('sp_umbral_pact', '음영의 맹약', 'Umbral Pact', '아스트랄과 그림자 친화의 주문 비용이 낮아집니다.',
    'Lowers the cost of spells from the Astral and Shadow affinities.', {
      tier: 3, affinity: { shadow: 1, astral: 1 }, kind: 'empire', cost: { mana: 0, cp: 0 }, target: 'empire', range: 0,
      effect: { type: 'special', id: 'umbral_pact' },
    }));

  Data.define('transformations', TR('tr_gloom_strider', '음영 보행자화', 'Gloom Strider', '대상 종족을 음영 악마로 바꾸어 부유하고 매우 빠르게 이동하게 합니다. 기마 유닛은 탈것을 잃습니다.',
    'Turns the target race into Umbral Demons: Floating and Fast Movement. Mounted units lose their mounts.', 'tome_corruption',
    { kind: 'major', effects: { armyMove: 2 } }));

  Data.define('tomes', TOME('tome_corruption', '타락의 서', 'Tome of Corruption', '음영의 악마들에게 가까워져, 적이 지닌 힘으로 그들을 벌합니다.',
    'Become closer to the umbral demons, and punish your enemies with their own strengths.', {
      tier: 3, affinity: { shadow: 1, astral: 1 }, expansion: null, icon: 'tome_shadow_3',
      passive: { desc: nm('강화 효과를 지닌 적에게 주는 피해 +8%.', '+8% damage against enemies with an active buff.'), effects: { dmgPct: 3 } },
      contents: [
        { type: 'spell', id: 'sp_corrupted_boon', cost: kc(3) },
        { type: 'transformation', id: 'tr_gloom_strider', cost: kc(3) },
        { type: 'unit', id: 'ta_eldritch_abomination', cost: kc(3, true) },
        { type: 'spell', id: 'sp_throne_of_insidious_whispers', cost: kc(3) },
        { type: 'spell', id: 'sp_treacherous_reflection', cost: kc(3) },
        { type: 'spell', id: 'sp_umbral_incursion', cost: kc(3) },
        { type: 'spell', id: 'sp_umbral_pact', cost: kc(3) },
        { type: 'spell', id: 'sp_umbral_veil', cost: kc(3) },
      ],
    }));
  //#endregion

  //#region ===================================================== TOME OF THE COSMOS (T5 All Affinities)
  Data.define('units', U('ta_avatar_cosmos', '우주의 화신', 'Avatar of the Cosmos', '제국이 지닌 모든 친화의 힘으로 빚어진 신화급 존재.', 'A mythic being empowered by every affinity the empire commands.', 'tome_cosmos', {
    tier: 5, role: 'mage', tags: ['magic_origin', 'mythic'], move: 'fly', mp: 44,
    hp: 150, def: 7, res: 7, morale: 0,
    attacks: [{ id: 'cosmos_bolt', name: nm('우주의 화살', 'Cosmos Bolt'), type: 'ranged', damage: 28, channel: 'lightning', range: 4, ap: 1, repeat: 1, accuracy: 85, strikes: 1, effects: [{ status: 'electrified', chance: 40 }], props: ['magic'] }],
    abilities: ['ab_elemental_beam', 'phase_step'], passives: ['flying', 'arcane_focus'],
    look: { body: 'eldritch', armor: 'none', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: 'arcane', size: 'huge', tint: '#a78bfa', glow: '#c9a24a' },
  }));

  Data.define('spells', SP('sp_cosmos_awakening', '우주의 각성', 'Cosmos Awakening', '전열 유닛의 공격에 모든 원소의 피해가 조금씩 더해지고, 모든 원소에 대한 보호가 오릅니다.',
    'Front-line attacks add a little damage of every channel, and every channel of protection rises a little.', {
      tier: 5, affinity: { astral: 1, chaos: 1, nature: 1, materium: 1, order: 1, shadow: 1 }, kind: 'unit_enchant', cost: { mana: 250, cp: 250 }, upkeep: { mana: 12 }, target: 'empire', range: 0,
      enchant: { appliesTo: ['shield', 'ranged', 'pike', 'support', 'shock', 'mage', 'fighter', 'skirmisher'], effects: { dmg: 1, statusRes: 1 } },
    }));
  Data.define('spells', SP('sp_prismatic_tower', '무지갯빛 첨탑', 'Prismatic Tower', '왕도에만 세울 수 있는 첨탑으로 전 지도를 밝히고, 시전 포인트를 늘리며, 5 이상인 친화마다 그에 걸맞은 자원을 대량으로 안겨줍니다.',
    "A Throne-City-only tower that reveals the map, boosts Casting Points, and grants a burst of the matching resource for every affinity at 5 or above.", {
      tier: 5, affinity: { astral: 1, chaos: 1, nature: 1, materium: 1, order: 1, shadow: 1 }, kind: 'city_enchant', cost: { mana: 0, cp: 0 }, target: 'city', range: 0,
      enchant: { effects: { casting: 25, combatCasting: 25, vision: 3 } },
    }));
  Data.define('spells', SP('sp_cosmic_harmony', '우주의 조화', 'Cosmic Harmony', '제국의 모든 자원 수입이 조금씩 늘어납니다.',
    "Every one of the empire's resource incomes rises a little.", {
      tier: 5, affinity: { astral: 1, chaos: 1, nature: 1, materium: 1, order: 1, shadow: 1 }, kind: 'empire', cost: { mana: 0, cp: 0 }, target: 'empire', range: 0,
      effects: { gold: 6, mana: 6, knowledge: 6, production: 6, food: 6 },
    }));
  Data.define('spells', SP('sp_starfall_cascade', '별똥별 쇄도', 'Starfall Cascade', '주변 2칸에 별의 파편이 쏟아져 화염·번개·냉기 피해를 함께 입힙니다.',
    'A cascade of falling stars pelts everything within 2 hexes with Fire, Lightning and Frost damage together.', {
      tier: 5, affinity: { astral: 1, chaos: 1, nature: 1, materium: 1, order: 1, shadow: 1 }, kind: 'combat', cost: { mana: 200, cp: 65 }, target: 'hex', range: 4, area: 2,
      effect: { type: 'damage', channel: 'lightning', amount: 36, area: 2 },
    }));

  Data.define('tomes', TOME('tome_cosmos', '우주의 서', 'Tome of the Cosmos', '우주 그 자체의 마법으로 아군과 경제를 강화하고, 강대한 우주의 화신을 소환합니다.',
    "Use your mastery over the magic of the universe to empower your units and your economy, and summon a mighty Avatar of the Cosmos.", {
      tier: 5, affinity: { astral: 1, chaos: 1, nature: 1, materium: 1, order: 1, shadow: 1 }, expansion: null, icon: 'tome_astral_5',
      passive: { desc: nm('제국의 6가지 친화 각각 +1.', '+1 to each of the empire\'s six affinities.'), effects: {} },
      contents: [
        { type: 'spell', id: 'sp_cosmos_awakening', cost: kc(5) },
        { type: 'spell', id: 'sp_prismatic_tower', cost: kc(5) },
        { type: 'unit', id: 'ta_avatar_cosmos', cost: kc(5, true) },
        { type: 'spell', id: 'sp_cosmic_harmony', cost: kc(5) },
        { type: 'spell', id: 'sp_starfall_cascade', cost: kc(5) },
        { type: 'spell', id: 'sp_starlit_ward', cost: kc(5) },
      ],
    }));
  //#endregion

  //#region ===================================================== EXTRA SPELLS & HERO SKILLS (grimoire odds and ends)
  Data.define('spells', SP('sp_astral_bulwark', '아스트랄 보루', 'Astral Bulwark', '주변 1칸의 아군이 거울처럼 빛나는 보호막을 둘러 저항력이 오릅니다.',
    'Allies within 1 hex are wrapped in a mirror-bright ward that raises their Resistance.', {
      tier: 4, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 30, cp: 30 }, target: 'ally_unit', range: 0, area: 1,
      effect: { type: 'status', status: 'warded', duration: 3, chance: 100, area: 1 },
    }));
  Data.define('spells', SP('sp_soul_flare', '영혼 섬광', 'Soul Flare', '대상 하나에게 영혼 피해 24를 주고 죽으면 시전자가 마나를 얻습니다.',
    'Deals 24 Spirit damage to the target; if it dies, the caster gains Mana.', {
      tier: 4, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 30, cp: 30 }, target: 'enemy_unit', range: 4,
      effect: { type: 'damage', channel: 'spirit', amount: 24 },
    }));
  Data.define('spells', SP('sp_arcane_finality', '비전의 종언', 'Arcane Finality', '주변 1칸의 적이 침묵하고 표식을 얻어, 남은 전투 동안 주문을 쓸 수 없습니다.',
    'Enemies within 1 hex are Silenced and Marked, unable to cast for the rest of the battle.', {
      tier: 5, affinity: { astral: 2 }, kind: 'combat', cost: { mana: 60, cp: 40 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'status', status: 'silenced', duration: 3, chance: 90, area: 1, extraStatus: 'marked' },
    }));
  Data.define('spells', SP('sp_grasp_of_the_grave', '무덤의 손아귀', 'Grasp of the Grave', '땅에서 뼈 손이 솟아나 주변 1칸의 적을 붙잡아 속박하고 물리 피해를 입힙니다.',
    'Bony hands erupt from the earth, Rooting and dealing Physical damage to enemies within 1 hex.', {
      tier: 3, affinity: { shadow: 2 }, kind: 'combat', cost: { mana: 25, cp: 25 }, target: 'hex', range: 4, area: 1,
      effect: { type: 'damage', channel: 'physical', amount: 10, area: 1, status: { id: 'rooted', chance: 70, duration: 2 } },
    }));
  Data.define('spells', SP('sp_umbral_veil', '음영의 장막', 'Umbral Veil', '아군 하나가 그림자 속으로 숨어 은신 상태가 됩니다.',
    'A friendly unit slips into shadow and becomes Concealed.', {
      tier: 3, affinity: { shadow: 1, astral: 1 }, kind: 'combat', cost: { mana: 15, cp: 15 }, target: 'ally_unit', range: 3,
      effect: { type: 'status', status: 'concealed', duration: 3, chance: 100 },
    }));
  Data.define('spells', SP('sp_starlit_ward', '별빛 결계', 'Starlit Ward', '주변 2칸의 아군이 별빛의 가호를 받아 축복과 상태이상 저항 강화를 얻습니다.',
    'Allies within 2 hexes are touched by starlight, gaining Blessed and Bolstered Resistance.', {
      tier: 5, affinity: { astral: 1, chaos: 1, nature: 1, materium: 1, order: 1, shadow: 1 }, kind: 'combat', cost: { mana: 45, cp: 30 }, target: 'ally_unit', range: 0, area: 2,
      effect: { type: 'status', status: 'blessed', duration: 3, chance: 100, area: 2, extraStatus: 'warded' },
    }));

  Data.define('heroSkills', HS('hs_arcane_channeler', '비전 전도자', 'Arcane Channeler', '군주가 이 기술을 익히면 세계 지도 및 전투 시전 포인트가 늘어납니다.',
    'The Ruler gains extra World Map and Combat Casting Points.', { tier: 1, cost: 1, effects: { casting: 5, combatCasting: 5 } }));
  Data.define('heroSkills', HS('hs_conduit_binder', '도관 결속자', 'Conduit Binder', '이끄는 군세가 마력 도관 지방을 지날 때마다 소량의 마나를 거둬들입니다.',
    "The army this hero leads siphons a little Mana whenever it passes a Conduit province.", { tier: 1, cost: 1, effects: { mana: 5 } }));
  Data.define('heroSkills', HS('hs_frostbound_will', '서리에 묶인 의지', 'Frostbound Will', '군주가 냉기 피해와 빙결에 대한 저항력을 크게 얻습니다.',
    'The Ruler gains strong resistance to Frost damage and Frozen.', { tier: 1, cost: 1, effects: { statusRes_frost: 4 } }));
  Data.define('heroSkills', HS('hs_phase_walker', '위상 보행자', 'Phase Walker', '군주가 짧은 거리를 순간이동하는 능력을 익혀 전장에서 자유로이 움직입니다.',
    'The Ruler learns to blink short distances, moving freely across the battlefield.', { tier: 2, cost: 1, ability: 'phase_step', prereq: ['hs_arcane_channeler'] }));
  Data.define('heroSkills', HS('hs_soul_ledger', '영혼의 장부', 'Soul Ledger', '전투에서 적이 죽을 때마다 군주가 소량의 마나를 거둬들입니다.',
    'Every enemy slain in a battle the Ruler fights yields a small amount of Mana.', { tier: 2, cost: 1, effects: { mana: 8 }, prereq: ['hs_conduit_binder'] }));
  Data.define('heroSkills', HS('hs_grave_whisperer', '무덤의 속삭임', 'Grave Whisperer', '군주 곁의 언데드 아군이 더 굳세게 버팁니다.',
    'Undead allies fighting beside the Ruler hold the line more sturdily.', { tier: 2, cost: 1, effects: { hp: 5 }, prereq: ['hs_frostbound_will'] }));
  Data.define('heroSkills', HS('hs_starborn_focus', '별빛 태생의 집중', 'Starborn Focus', '군주가 시전하는 주문의 위력이 크게 늘어납니다.',
    'Spells cast by the Ruler deal noticeably more damage.', { tier: 3, cost: 1, effects: { dmgPct: 8 }, prereq: ['hs_arcane_channeler'] }));
  Data.define('heroSkills', HS('hs_deathless_will', '불멸의 의지', 'Deathless Will', '군주가 상태이상에 훨씬 강하게 저항하게 됩니다.',
    'The Ruler grows far more resistant to negative status effects.', { tier: 3, cost: 1, effects: { statusRes: 3 }, prereq: ['hs_grave_whisperer'] }));
  //#endregion

})(window.AOW = window.AOW || {});
