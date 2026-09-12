// src/data/items.js — hero equipment (weapon/offhand/armor/helm/trinket/mount) + loot tables
//
// Additive schema notes (SPEC §3 items + additive fields):
//   items: { id, name, desc, slot:'weapon'|'offhand'|'armor'|'helm'|'trinket'|'mount', rarity:'common'|'uncommon'|'rare'|'epic'|'legendary',
//            effects:{...§3.1}, weaponType:null|'sword'|'axe'|'mace'|'greatsword'|'greataxe'|'polearm'|'bow'|'crossbow'|'javelin'|'sling'|'dagger'|'orb'|'staff'|'relic'|'shield'|'fist'
//              (matches heroClasses.allowedWeapons in src/data/heroes.js; weapon/offhand items only),
//            attackBonus:{dmg, channel, status:{id, chance}} (adds to the hero's base/current attack) | attack:{...unit-attack shape} (full override, legendary only),
//            ability:null|abilityId (grants an ability while equipped), look:{kind, color, glow}, icon }
// Data.define('names', {id:'loot_tables', tiers:{1:[itemId,...], 2:[...], 3:[...], 4:[...]}}) — tier 1 ~ common/uncommon,
//   tier 2 ~ uncommon/rare, tier 3 ~ rare/epic, tier 4 ~ epic/legendary, for wonder/loot-drop rolls.
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const RADJ = {
    common: { ko: '낡은', en: 'Worn' },
    uncommon: { ko: '정교한', en: 'Fine' },
    rare: { ko: '용맹한', en: 'Valiant' },
    epic: { ko: '영웅의', en: 'Heroic' },
    legendary: { ko: '전설의', en: 'Legendary' },
  };
  // scaling bands: [dmg/stat bonus, secondary stat, status chance %]
  const RBAND = {
    common: { dmg: 3, stat: 1, chance: 0 },
    uncommon: { dmg: 5, stat: 2, chance: 15 },
    rare: { dmg: 8, stat: 3, chance: 25 },
    epic: { dmg: 12, stat: 5, chance: 35 },
    legendary: { dmg: 18, stat: 8, chance: 45 },
  };
  const CH_KO = { physical: '물리', fire: '화염', frost: '냉기', lightning: '번개', blight: '역병', spirit: '영혼' };
  const CH_EN = { physical: 'Physical', fire: 'Fire', frost: 'Frost', lightning: 'Lightning', blight: 'Blight', spirit: 'Spirit' };
  const ST_KO = { burning: '화상', frozen: '빙결', poisoned: '중독', bleeding: '출혈', stunned: '기절', sundered: '방어 분쇄', marked: '표식', slowed: '둔화', weakened: '약화', condemned: '단죄', rooted: '속박', shattered: '저항 분쇄' };
  const ST_EN = { burning: 'Burning', frozen: 'Frozen', poisoned: 'Poisoned', bleeding: 'Bleeding', stunned: 'Stunned', sundered: 'Sundered Defense', marked: 'Marked', slowed: 'Slowed', weakened: 'Weakened', condemned: 'Condemned', rooted: 'Rooted', shattered: 'Shattered Resistance' };

  const items = [];
  const IT = (o) => { items.push(Object.assign({ effects: {}, look: {}, icon: 'item_trinket' }, o)); };

  /** a weapon concept across all 5 rarities */
  function weaponLine(baseId, baseKo, baseEn, weaponType, channel, statusId, iconColor, glow) {
    for (const r of RARITIES) {
      const b = RBAND[r], adj = RADJ[r];
      const statusPart = statusId ? { id: statusId, chance: b.chance } : null;
      const dko = `${adj.ko} ${baseKo}. 공격 시 ${CH_KO[channel]} 피해 +${b.dmg}` + (statusPart ? `, ${b.chance}% 확률로 ${ST_KO[statusId]}을(를) 입힙니다.` : '를 더합니다.');
      const den = `${adj.en} ${baseEn}. Attacks deal +${b.dmg} ${CH_EN[channel]} damage` + (statusPart ? `, with a ${b.chance}% chance to inflict ${ST_EN[statusId]}.` : '.');
      IT({
        id: `${baseId}_${r}`, name: { ko: `${adj.ko} ${baseKo}`, en: `${adj.en} ${baseEn}` }, desc: { ko: dko, en: den },
        slot: 'weapon', rarity: r, weaponType, effects: {},
        attackBonus: Object.assign({ dmg: b.dmg, channel }, statusPart ? { status: statusPart } : {}),
        look: { kind: weaponType, color: iconColor, glow: r === 'legendary' || r === 'epic' ? glow : null }, icon: 'item_weapon',
      });
    }
  }
  /** an offhand concept across all 5 rarities (flat def/res-leaning stats) */
  function offhandLine(baseId, baseKo, baseEn, weaponType, statKey, statKey2, iconColor, glow) {
    for (const r of RARITIES) {
      const b = RBAND[r], adj = RADJ[r];
      const eff = {}; eff[statKey] = b.stat; if (statKey2) eff[statKey2] = Math.ceil(b.stat / 2);
      const dko = `${adj.ko} ${baseKo}. 착용 시 ${statLabelKo(statKey)} +${b.stat}${statKey2 ? `, ${statLabelKo(statKey2)} +${eff[statKey2]}` : ''}.`;
      const den = `${adj.en} ${baseEn}. Grants +${b.stat} ${statLabelEn(statKey)}${statKey2 ? ` and +${eff[statKey2]} ${statLabelEn(statKey2)}` : ''} while worn.`;
      IT({
        id: `${baseId}_${r}`, name: { ko: `${adj.ko} ${baseKo}`, en: `${adj.en} ${baseEn}` }, desc: { ko: dko, en: den },
        slot: 'offhand', rarity: r, weaponType, effects: eff,
        look: { kind: weaponType, color: iconColor, glow: r === 'legendary' ? glow : null }, icon: 'item_offhand',
      });
    }
  }
  /** an armor/helm concept across all 5 rarities */
  function gearLine(baseId, baseKo, baseEn, slot, statKey, statKey2, iconKind, iconColor, glow) {
    for (const r of RARITIES) {
      const b = RBAND[r], adj = RADJ[r];
      const eff = {}; eff[statKey] = b.stat; if (statKey2) eff[statKey2] = Math.ceil(b.stat / 2);
      const dko = `${adj.ko} ${baseKo}. 착용 시 ${statLabelKo(statKey)} +${b.stat}${statKey2 ? `, ${statLabelKo(statKey2)} +${eff[statKey2]}` : ''}.`;
      const den = `${adj.en} ${baseEn}. Grants +${b.stat} ${statLabelEn(statKey)}${statKey2 ? ` and +${eff[statKey2]} ${statLabelEn(statKey2)}` : ''} while worn.`;
      IT({
        id: `${baseId}_${r}`, name: { ko: `${adj.ko} ${baseKo}`, en: `${adj.en} ${baseEn}` }, desc: { ko: dko, en: den },
        slot, rarity: r, effects: eff,
        look: { kind: iconKind, color: iconColor, glow: r === 'legendary' ? glow : null }, icon: slot === 'armor' ? 'item_armor' : slot === 'helm' ? 'item_helm' : 'item_trinket',
      });
    }
  }
  /** a trinket concept across all 5 rarities */
  function trinketLine(baseId, baseKo, baseEn, statKey, iconKind, iconColor, glow, abilityByRarity) {
    for (const r of RARITIES) {
      const b = RBAND[r], adj = RADJ[r];
      const eff = {}; eff[statKey] = b.stat;
      const grant = abilityByRarity && abilityByRarity[r];
      const dko = `${adj.ko} ${baseKo}. 착용 시 ${statLabelKo(statKey)} +${b.stat}${grant ? `, ${grant.ko}을(를) 얻습니다.` : '.'}`;
      const den = `${adj.en} ${baseEn}. Grants +${b.stat} ${statLabelEn(statKey)}${grant ? ` and the ${grant.en} ability.` : '.'}`;
      IT({
        id: `${baseId}_${r}`, name: { ko: `${adj.ko} ${baseKo}`, en: `${adj.en} ${baseEn}` }, desc: { ko: dko, en: den },
        slot: 'trinket', rarity: r, effects: eff, ability: grant ? grant.id : null,
        look: { kind: iconKind, color: iconColor, glow: r === 'legendary' ? glow : null }, icon: 'item_trinket',
      });
    }
  }
  /** a mount concept across all 5 rarities */
  function mountLine(baseId, baseKo, baseEn, iconKind, iconColor, glow, ability, hpBase) {
    for (const r of RARITIES) {
      const b = RBAND[r], adj = RADJ[r];
      const eff = { mp: 1 + Math.floor(b.stat / 3), hp: hpBase + b.stat * 2 };
      const dko = `${adj.ko} ${baseKo}. 이동력 +${eff.mp}, 체력 +${eff.hp}${ability ? `, ${ability.ko}을(를) 얻습니다.` : '.'}`;
      const den = `${adj.en} ${baseEn}. +${eff.mp} Movement and +${eff.hp} HP${ability ? `, granting ${ability.en}.` : '.'}`;
      IT({
        id: `${baseId}_${r}`, name: { ko: `${adj.ko} ${baseKo}`, en: `${adj.en} ${baseEn}` }, desc: { ko: dko, en: den },
        slot: 'mount', rarity: r, effects: eff, ability: ability ? ability.id : null,
        look: { kind: iconKind, color: iconColor, glow: r === 'legendary' ? glow : null }, icon: 'item_mount',
      });
    }
  }
  function statLabelKo(k) {
    return { def: '방어력', res: '저항력', hp: '체력', dmg: '공격력', accuracy: '명중률', mp: '이동력', critChance: '치명타 확률', morale: '사기', evasion: '회피' }[k] || k;
  }
  function statLabelEn(k) {
    return { def: 'Defense', res: 'Resistance', hp: 'HP', dmg: 'Damage', accuracy: 'Accuracy', mp: 'Move', critChance: 'Critical Chance', morale: 'Morale', evasion: 'Evasion' }[k] || k;
  }

  // ================================================================ weapons (6 concepts x5 rarities = 30)
  weaponLine('w_steel_sword', '강철검', 'Steel Sword', 'sword', 'physical', 'bleeding', '#c8ccd4', '#e8f0ff');
  weaponLine('w_war_axe', '전투 도끼', 'War Axe', 'axe', 'physical', 'sundered', '#a89060', '#ffb060');
  weaponLine('w_battle_mace', '전투 철퇴', 'Battle Mace', 'mace', 'physical', 'stunned', '#8a8a90', '#ffe080');
  weaponLine('w_hunting_bow', '사냥용 활', 'Hunting Bow', 'bow', 'physical', 'marked', '#7a5a3a', '#ffe0a0');
  weaponLine('w_frost_staff', '서리 지팡이', 'Frost Staff', 'staff', 'frost', 'slowed', '#a0d8f0', '#a0e0ff');
  weaponLine('w_shadow_dagger', '그림자 단검', 'Shadow Dagger', 'dagger', 'blight', 'poisoned', '#4a3a5a', '#a060d0');

  // ================================================================ offhands (3 concepts x5 = 15)
  offhandLine('o_round_shield', '원형 방패', 'Round Shield', 'shield', 'def', null, '#8a7a5a', '#ffd080');
  offhandLine('o_tome_wards', '수호의 서', 'Tome of Wards', 'orb', 'res', 'statusRes_spirit', '#5a4a8a', '#c0a0ff');
  offhandLine('o_parrying_dagger', '막이 단검', 'Parrying Dagger', 'dagger', 'evasion', 'accuracy', '#909090', '#e0e0e0');

  // ================================================================ armor (4 concepts x5 = 20)
  gearLine('a_leather_armor', '가죽 갑옷', 'Leather Armor', 'armor', 'def', 'mp', 'leather', '#7a5a3a', null);
  gearLine('a_chainmail', '사슬 갑옷', 'Chainmail', 'armor', 'def', 'hp', 'chain', '#909aa0', null);
  gearLine('a_plate_armor', '판금 갑옷', 'Plate Armor', 'armor', 'def', 'res', 'plate', '#c0c8d0', '#dfe8ff');
  gearLine('a_arcane_robe', '비전 로브', 'Arcane Robe', 'armor', 'res', 'hp', 'robe', '#5a3a8a', '#b090ff');

  // ================================================================ helms (3 concepts x5 = 15)
  gearLine('h_leather_cap', '가죽 모자', 'Leather Cap', 'helm', 'accuracy', null, 'cap', '#6a4a30', null);
  gearLine('h_steel_helm', '강철 투구', 'Steel Helm', 'helm', 'def', 'statusRes_physical', 'full', '#b0b8c0', null);
  gearLine('h_wizard_hood', '마법사의 두건', 'Wizard\'s Hood', 'helm', 'res', 'critChance', 'hood', '#4a3a70', '#a080ff');

  // ================================================================ trinkets (5 concepts x5 = 25)
  trinketLine('t_ring_vigor', '활력의 반지', 'Ring of Vigor', 'hp', 'ring', '#c8302a', '#ff6050', { rare: { id: 'regeneration', ko: '재생', en: 'Regeneration' }, epic: { id: 'regeneration', ko: '재생', en: 'Regeneration' }, legendary: { id: 'regeneration', ko: '재생', en: 'Regeneration' } });
  trinketLine('t_amulet_wards', '수호의 부적', 'Amulet of Wards', 'res', 'amulet', '#5a7ff0', '#a0c0ff', { epic: { id: 'bulwark', ko: '보루', en: 'Bulwark' }, legendary: { id: 'bulwark', ko: '보루', en: 'Bulwark' } });
  trinketLine('t_charm_swiftness', '신속의 부적', 'Charm of Swiftness', 'mp', 'charm', '#5fb043', '#a0ffb0', { rare: { id: 'fast_movement', ko: '빠른 이동', en: 'Fast Movement' }, epic: { id: 'fast_movement', ko: '빠른 이동', en: 'Fast Movement' }, legendary: { id: 'fast_movement', ko: '빠른 이동', en: 'Fast Movement' } });
  trinketLine('t_talisman_flame', '화염의 부적', 'Talisman of Flame', 'dmg', 'talisman', '#e0452b', '#ff8050', { legendary: { id: 'ignite', ko: '점화', en: 'Ignite' } });
  trinketLine('t_orb_insight', '통찰의 구슬', 'Orb of Insight', 'critChance', 'orb', '#c9a24a', '#ffe090', { epic: { id: 'true_sight', ko: '진실의 눈', en: 'True Sight' }, legendary: { id: 'true_sight', ko: '진실의 눈', en: 'True Sight' } });

  // ================================================================ mounts (3 concepts x5 = 15)
  mountLine('m_riding_horse', '승용마', 'Riding Horse', 'horse', '#7a5a3a', null, { id: 'fast_movement', ko: '빠른 이동', en: 'Fast Movement' }, 10);
  mountLine('m_dire_wolf', '거대 늑대', 'Dire Wolf', 'wolf', '#5a5a5a', '#c0c0ff', { id: 'ferocious', ko: '흉포', en: 'Ferocious' }, 15);
  mountLine('m_griffon', '그리폰', 'Griffon', 'griffon', '#c0a060', '#ffe8a0', { id: 'flying', ko: '비행', en: 'Flying' }, 12);

  // ================================================================ legendary-only unique items (8, lore names, no rarity progression)
  IT({
    id: 'w_leg_dawnspear', name: { ko: '여명의 창', en: 'Dawnspear' }, desc: {
      ko: '태초의 빛으로 벼려진 창. 찌를 때마다 영혼 피해가 추가되고 언데드와 악마에게는 피해가 두 배가 됩니다.',
      en: 'A spear forged from primordial light. Every thrust adds Spirit damage, doubled against Undead and Fiends.',
    }, slot: 'weapon', rarity: 'legendary', weaponType: 'polearm',
    attack: { id: 'dawnspear_thrust', name: { ko: '여명의 찌르기', en: 'Dawnspear Thrust' }, type: 'melee', damage: 26, channel: 'spirit', range: 1, ap: 1, repeat: 1, accuracy: 92, strikes: 1, effects: [{ status: 'condemned', chance: 50 }] },
    effects: { res: 3 }, ability: 'holy_bolt', look: { kind: 'polearm', color: '#f0e0a0', glow: '#ffe9a8' }, icon: 'item_weapon',
  });
  IT({
    id: 'w_leg_doomcaller', name: { ko: '종말의 부름', en: 'Doomcaller' }, desc: {
      ko: '휘두를 때마다 대지가 갈라지는 대검. 화염 피해를 크게 더하고 주변의 적까지 불태웁니다.',
      en: 'A greatsword that cracks the earth with every swing, adding heavy Fire damage that scorches nearby foes too.',
    }, slot: 'weapon', rarity: 'legendary', weaponType: 'greatsword',
    attackBonus: { dmg: 22, channel: 'fire', status: { id: 'burning', chance: 55 } }, effects: { dmg: 4 },
    ability: 'cleaving_charge', look: { kind: 'greatsword', color: '#5a1810', glow: '#ff5020' }, icon: 'item_weapon',
  });
  IT({
    id: 'w_leg_stormcaller_bow', name: { ko: '폭풍 부름의 활', en: 'Stormcaller Bow' }, desc: {
      ko: '시위를 당기면 번개가 응축되는 활. 화살마다 번개 피해가 추가되고 감전을 남깁니다.',
      en: 'A bow that gathers lightning as the string is drawn, adding Lightning damage and a chance to Electrify.',
    }, slot: 'weapon', rarity: 'legendary', weaponType: 'bow',
    attack: { id: 'stormcaller_shot', name: { ko: '폭풍 화살', en: 'Storm Shot' }, type: 'ranged', damage: 20, channel: 'lightning', range: 6, ap: 1, repeat: 1, accuracy: 95, strikes: 1, effects: [{ status: 'electrified', chance: 60 }] },
    effects: { accuracy: 10 }, look: { kind: 'bow', color: '#3a3a6a', glow: '#a0c0ff' }, icon: 'item_weapon',
  });
  IT({
    id: 'o_leg_abyssal_aegis', name: { ko: '심연의 방패', en: 'Abyssal Aegis' }, desc: {
      ko: '심연에서 건져 올린 방패. 방어력과 저항력을 크게 높이고 밀쳐내기와 기절에 면역이 되게 합니다.',
      en: 'A shield dredged from the abyss, greatly boosting Defense and Resistance and granting immunity to displacement and stun.',
    }, slot: 'offhand', rarity: 'legendary', weaponType: 'shield', effects: { def: 8, res: 5 }, ability: 'sturdy',
    look: { kind: 'shield', color: '#1a1a2a', glow: '#7b3fa0' }, icon: 'item_offhand',
  });
  IT({
    id: 'a_leg_kings_plate', name: { ko: '왕의 판금 갑옷', en: 'King\'s Plate' }, desc: {
      ko: '옛 왕들이 물려준 갑옷. 방어력과 체력을 크게 늘리고 주변 아군의 사기를 북돋습니다.',
      en: 'Armor handed down through generations of kings, greatly boosting Defense and HP while inspiring nearby allies.',
    }, slot: 'armor', rarity: 'legendary', effects: { def: 10, hp: 30, morale: 5 }, ability: 'inspiring_presence',
    look: { kind: 'plate', color: '#e8c357', glow: '#fff0b0' }, icon: 'item_armor',
  });
  IT({
    id: 'a_leg_starlight_robe', name: { ko: '별빛 로브', en: 'Starlight Robe' }, desc: {
      ko: '별의 파편을 엮어 만든 로브. 저항력이 크게 오르고 세계·전투 시전 점수를 더해줍니다.',
      en: 'A robe woven from shards of starlight, greatly boosting Resistance and adding World and Combat Casting Points.',
    }, slot: 'armor', rarity: 'legendary', effects: { res: 8, casting: 5, combatCasting: 5 }, ability: 'arcane_focus',
    look: { kind: 'robe', color: '#7a8fd8', glow: '#9ab0ff' }, icon: 'item_armor',
  });
  IT({
    id: 'h_leg_farseer_helm', name: { ko: '천리안의 투구', en: 'Farseer\'s Helm' }, desc: {
      ko: '먼 곳까지 꿰뚫어 보는 투구. 시야와 명중률, 치명타 확률을 모두 높입니다.',
      en: 'A helm that sees far beyond the horizon, boosting Vision, Accuracy and Critical chance all at once.',
    }, slot: 'helm', rarity: 'legendary', effects: { vision: 3, accuracy: 15, critChance: 10 }, ability: 'true_sight',
    look: { kind: 'circlet', color: '#e8c357', glow: '#fff0c0' }, icon: 'item_helm',
  });
  IT({
    id: 't_leg_heart_eternal', name: { ko: '영원한 심장', en: 'Heart Eternal' }, desc: {
      ko: '박동을 멈추지 않는 신비한 심장. 체력을 크게 늘리고 매 턴 회복시키며, 쓰러져도 다시 일어나게 합니다.',
      en: 'A mysterious heart that never stops beating, greatly boosting HP, healing every turn, and letting its bearer rise again after falling.',
    }, slot: 'trinket', rarity: 'legendary', effects: { hp: 40, healPerTurn: 10 }, ability: 'undying',
    look: { kind: 'heart', color: '#d02020', glow: '#ff6060' }, icon: 'item_trinket',
  });
  IT({
    id: 'm_leg_dawn_griffon', name: { ko: '여명의 그리폰', en: 'Dawn Griffon' }, desc: {
      ko: '여명의 빛을 두른 그리폰. 하늘을 날며 체력과 이동력을 크게 늘려줍니다.',
      en: 'A griffon wreathed in dawn-light, flying free while greatly boosting HP and Movement.',
    }, slot: 'mount', rarity: 'legendary', effects: { hp: 30, mp: 4 }, ability: 'flying',
    look: { kind: 'griffon', color: '#f0e0a0', glow: '#ffe9a8' }, icon: 'item_mount',
  });

  Data.defineAll('items', items);

  // ================================================================ loot tables — tier 1-4 rolls into the item list above
  const byRarity = { common: [], uncommon: [], rare: [], epic: [], legendary: [] };
  for (const it of items) byRarity[it.rarity].push(it.id);
  Data.define('names', {
    id: 'loot_tables',
    tiers: {
      1: [...byRarity.common, ...byRarity.uncommon.slice(0, 6)],
      2: [...byRarity.uncommon, ...byRarity.rare.slice(0, 6)],
      3: [...byRarity.rare, ...byRarity.epic.slice(0, 6)],
      4: [...byRarity.epic, ...byRarity.legendary],
    },
  });

  AOW.log && AOW.log('items.js: ' + items.length + ' items loaded');
})(window.AOW = window.AOW || {});
