// src/data/units_wild.js — wild / neutral / marauder unit data (SPEC §3 `units`)
//
// Covers every non-culture, non-tome roster in the game: roaming wildlife, marauder camps,
// undead crypts, elementals, dragons, giants, fiends, constructs, eldritch horrors, fey,
// celestials and Free City militia. These are the units that populate infestations, Ancient
// Wonder guards, roaming monster stacks and Free City garrisons (see docs/research/unit_catalog.md
// §4-5 and systems_world_combat.md §1.8-1.9).
//
// Id prefixes (mandatory, so other systems can pattern-match a unit's origin from its id alone):
//   wild_<name>      animals & monstrous wildlife           tags include 'animal'
//   marauder_<name>  bandit-camp humanoids (mixed forms)    tags include 'marauder'
//   undead_<name>    crypt/graveyard undead                 tags include 'undead'
//   elemental_<name> elemental spirits                      tags include 'elemental'
//   dragon_<name>    true dragons (incl. wyverns via 'wild_wyvern')  tags include 'dragon'
//   giant_<name>     giant-kin                              tags include 'giant'
//   fiend_<name>     demons/fiends                          tags include 'fiend'
//   construct_<name> golems/constructs                      tags include 'construct'
//   eldritch_<name>  Eldritch Realms horrors                tags include 'eldritch'
//   fey_<name>       fey spirits                            tags include 'fey' (additive tag, see below)
//   celestial_<name> angelic beings                         tags include 'angelic'
//   free_<name>      Free City militia                      tags include 'racial' (renders via the Free City's own form)
//
// Additive notes (documented per SPEC §0 "add a small additive helper... document it"):
//   - Tags 'fey' and 'marauder' are used in addition to SPEC §3's listed tag vocabulary, to mark
//     those two independent-army families distinctly (harmless to Data.validate, which does not
//     enforce a tag enum).
//   - `look.formLook` is an additive per-unit override object ({skin, ears, horns, ...}, same keys
//     as a Form's `look`) used only when `look.body === 'form'` and the unit is NOT tagged 'racial'
//     (marauder humanoids: goblins, orcs, cultists). It tells UnitArt which fixed body to render
//     instead of looking up a player's chosen Form. Units tagged 'racial' (Free City militia) omit
//     `formLook` — they resolve dynamically against the Free City's own `formId` at render time,
//     exactly like culture units.
//   - A few dragon breath weapons reuse the four canonical `dragon_breath_*` abilities
//     (fire/frost/lightning/blight already cover four of the seven canonical dragon colors —
//     obsidian dragons reuse the blight breath). One new attack-ability, `ab_wild_dragon_breath_spirit`,
//     is added below (owning-content-prefixed per SPEC §3.0) to cover the spirit/gold breath.
//
// Also defines `Data.define('names', {id:'guard_pools', pools:{...}})` — curated id lists that
// worldgen/turn code can draw from when stocking infestations, Ancient Wonder guards and roaming
// marauder stacks by tier and family.
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  // ------------------------------------------------------------------ tier norms (docs/research/unit_catalog.md "Tier norms")
  const HP = { 1: 55, 2: 72, 3: 98, 4: 128, 5: 195 };
  const DEF = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  const RES = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
  const DMG = { 1: 11, 2: 15, 3: 20, 4: 26, 5: 34 };
  const GOLD = { 1: 50, 2: 80, 3: 130, 4: 210, 5: 340 };
  const DRAFT = { 1: 12, 2: 18, 3: 26, 4: 36, 5: 50 };
  const UPGOLD = { 1: 4, 2: 7, 3: 11, 4: 16, 5: 24 };
  const MANA_T = { 1: 8, 2: 14, 3: 22, 4: 34, 5: 50 };
  const UPMANA = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 8 };

  /** A magic-origin unit trades half its gold cost/upkeep for a mana cost/upkeep. */
  const magic = (tier) => ({
    cost: { gold: Math.round(GOLD[tier] * 0.5), mana: MANA_T[tier], draft: DRAFT[tier] },
    upkeep: { gold: Math.round(UPGOLD[tier] * 0.5), mana: UPMANA[tier] },
  });

  /** Inline attack entry (SPEC §3 units.attacks[]). */
  const A = (id, ko, en, dmg, o) => Object.assign({
    id, name: { ko, en }, type: 'melee', damage: dmg, channel: 'physical', range: 1, ap: 1,
    repeat: 1, accuracy: 78, strikes: 1, effects: [], props: [],
  }, o);

  /** Unit factory: fills tier-appropriate defaults, merges overrides, and registers with Data. */
  const U = (id, ko, en, dko, den, tier, role, tags, attacks, o) => {
    o = o || {};
    const unit = Object.assign({
      id, name: { ko, en }, desc: { ko: dko, en: den }, tier, role, tags,
      move: 'walk', mp: 32,
      source: { type: 'wild' },
      cost: { gold: GOLD[tier], mana: 0, draft: DRAFT[tier] },
      upkeep: { gold: UPGOLD[tier], mana: 0 },
      hp: HP[tier], def: DEF[tier], res: RES[tier], morale: 0,
      attacks, abilities: [], passives: [], statusRes: {}, look: {},
    }, o);
    return Data.define('units', unit);
  };

  // ================================================================ new attack-ability (spirit dragon breath)
  Data.define('abilities', {
    id: 'ab_wild_dragon_breath_spirit', name: { ko: '영광의 브레스', en: 'Radiant Breath' },
    desc: { ko: '정면 부채꼴에 영혼 피해 24를 뿜어 단죄를 남깁니다 (기본 80%).', en: 'A cone of radiant force for 24 Spirit damage with an 80% chance to inflict Condemned.' },
    kind: 'attack', ap: 3, cooldown: 2, range: 3, target: 'enemy', area: 'cone', icon: 'holy',
    effect: { type: 'damage', channel: 'spirit', amount: 24, attackType: 'magic', area: 'cone', status: 'condemned', chance: 80, duration: 3, props: ['cone'] },
  });

  // ================================================================ WILD ANIMALS (24) — tags:['animal'] (+'flying'/'plant' where relevant)
  U('wild_wolf', '늑대', 'Wolf', '무리를 지어 사냥하는 회색 늑대. 빠르게 움직이며 약한 사냥감을 노린다.',
    'A grey wolf that hunts in packs, fast and quick to single out the weak.', 1, 'skirmisher', ['animal'],
    [A('bite', '물어뜯기', 'Bite', DMG[1], { effects: [{ status: 'bleeding', chance: 20, duration: 3 }] })],
    { mp: 40, passives: ['fast_movement'], look: { body: 'beast_wolf', size: 'small' } });

  U('wild_dire_wolf', '다이어울프', 'Dire Wolf', '보통 늑대보다 훨씬 크고 사나운 종. 물어뜯긴 상처는 쉽게 낫지 않는다.',
    'Far larger and fiercer than a common wolf; its bite leaves wounds that are slow to heal.', 2, 'skirmisher', ['animal'],
    [A('savage_bite', '흉포한 물어뜯기', 'Savage Bite', DMG[2], { effects: [{ status: 'bleeding', chance: 30, duration: 3 }] })],
    { mp: 44, passives: ['fast_movement', 'ferocious'], look: { body: 'beast_wolf', size: 'medium' } });

  U('wild_bear', '곰', 'Bear', '두터운 가죽과 억센 앞발을 가진 숲의 포식자. 한 방이면 갑옷도 우그러뜨린다.',
    'A forest predator with thick hide and crushing forepaws that can dent armor in a single blow.', 2, 'fighter', ['animal'],
    [A('maul', '앞발 후려치기', 'Maul', DMG[2] + 2, { effects: [{ status: 'stunned', chance: 15, duration: 1 }] })],
    { mp: 32, passives: ['hardened'], look: { body: 'beast_bear', size: 'large' } });

  U('wild_boar', '멧돼지', 'Boar', '짧은 다리로도 놀라운 속도를 내는 엄니 짐승. 한번 돌진하면 멈추지 않는다.',
    'A tusked beast that reaches surprising speed on short legs and never stops once it charges.', 1, 'shock', ['animal'],
    [A('gore', '엄니 찌르기', 'Gore', DMG[1] + 1)],
    { mp: 40, passives: ['charge'], look: { body: 'beast_boar', size: 'small' } });

  U('wild_giant_spider', '거대 거미', 'Giant Spider', '끈적한 거미줄로 사냥감을 옭아맨 뒤 독니로 마무리한다.',
    'Binds prey in sticky webbing before finishing it off with venomous fangs.', 2, 'skirmisher', ['animal'],
    [A('venom_bite', '독니', 'Venom Bite', DMG[2] - 2, { channel: 'blight', effects: [{ status: 'poisoned', chance: 40, duration: 3 }] })],
    { mp: 36, abilities: ['web_shot'], look: { body: 'beast_spider', size: 'medium' } });

  U('wild_serpent', '독사', 'Serpent', '풀숲에 숨어 있다 순식간에 물어 독을 주입하는 뱀.',
    'A snake that lies hidden in the undergrowth and strikes in an instant, injecting venom.', 1, 'skirmisher', ['animal'],
    [A('venom_strike', '독니 일격', 'Venom Strike', DMG[1] - 1, { channel: 'blight', effects: [{ status: 'poisoned', chance: 30, duration: 3 }] })],
    { mp: 32, passives: ['amphibious'], look: { body: 'beast_serpent', size: 'small' } });

  U('wild_lion', '사자', 'Lion', '무리의 우두머리다운 포효로 적의 사기를 꺾은 뒤 발톱으로 찢는다.',
    'A pride leader whose roar breaks enemy morale before its claws tear in.', 2, 'shock', ['animal'],
    [A('rend', '발톱 찢기', 'Rend', DMG[2] + 1)],
    { mp: 44, passives: ['ferocious'], abilities: ['roar'], look: { body: 'beast_lion', size: 'medium' } });

  U('wild_elk', '엘크', 'Elk', '거대한 뿔가지를 가진 초식 동물. 온순하지만 궁지에 몰리면 뿔로 들이받는다.',
    'A great antlered grazer, placid until cornered, when it rams with its antlers.', 1, 'skirmisher', ['animal'],
    [A('antlers', '뿔 들이받기', 'Antler Ram', DMG[1] - 1)],
    { mp: 48, passives: ['fast_movement'], look: { body: 'beast_elk', size: 'medium' } });

  U('wild_eagle', '독수리', 'Eagle', '높은 하늘에서 지상을 내려다보다 날카로운 발톱으로 급강하한다.',
    'Watches the ground from high above, then stoops down with razor talons.', 1, 'skirmisher', ['animal', 'flying'],
    [A('talons', '발톱', 'Talons', DMG[1])],
    { move: 'fly', mp: 48, passives: ['flying', 'farsight'], look: { body: 'bird', size: 'small' } });

  U('wild_roc', '로크', 'Roc', '산등성이를 가릴 만큼 거대한 맹금. 발톱 한 번으로 기사와 말을 함께 채간다.',
    'A raptor vast enough to shadow a mountainside, able to snatch a knight and steed together.', 3, 'shock', ['animal', 'flying'],
    [A('crushing_talons', '짓누르는 발톱', 'Crushing Talons', DMG[3])],
    { move: 'fly', mp: 48, passives: ['flying'], abilities: ['leap_strike'], look: { body: 'bird', size: 'huge' } });

  U('wild_mammoth', '매머드', 'Mammoth', '긴 엄니와 육중한 발걸음으로 대열을 통째로 짓밟는 설원의 거수.',
    'A tundra colossus with long tusks and a tread heavy enough to crush a formation whole.', 3, 'shock', ['animal'],
    [A('tusk_toss', '엄니로 들어올리기', 'Tusk Toss', DMG[3] + 2, { effects: [{ status: 'stunned', chance: 25, duration: 1 }] })],
    { mp: 28, passives: ['trample', 'large_target'], look: { body: 'beast_mammoth', size: 'huge' } });

  U('wild_crocodile', '악어', 'Crocodile', '물속에 몸을 숨기고 기다리다 순식간에 튀어나와 물어뜯는다.',
    'Lurks submerged and unseen, then explodes from the water in a single crushing bite.', 1, 'fighter', ['animal', 'amphibious'],
    [A('death_roll', '데스 롤', 'Death Roll', DMG[1] + 1, { effects: [{ status: 'bleeding', chance: 30, duration: 3 }] })],
    { mp: 28, passives: ['amphibious'], look: { body: 'beast_crocodile', size: 'medium' } });

  U('wild_sabertooth', '검치호', 'Sabertooth', '긴 송곳니로 급소를 노리는 매복의 명수. 덮치기 전까지는 기척조차 없다.',
    'A master ambusher whose long fangs seek the killing spot, utterly silent until it pounces.', 3, 'shock', ['animal'],
    [A('pounce_bite', '덮치는 송곳니', 'Pounce Bite', DMG[3] + 2)],
    { mp: 44, passives: ['charge', 'ferocious'], look: { body: 'beast_sabertooth', size: 'medium' } });

  U('wild_storm_crow', '폭풍 까마귀', 'Storm Crow', '날개깃마다 번개가 튀는 거대한 까마귀. 폭풍과 함께 몰려온다.',
    'A giant crow crackling with lightning along every feather, arriving on the storm front.', 3, 'skirmisher', ['animal', 'flying'],
    [A('lightning_talons', '전기 발톱', 'Lightning Talons', DMG[3] - 2, { channel: 'lightning', effects: [{ status: 'electrified', chance: 35, duration: 2 }] })],
    { move: 'fly', mp: 48, passives: ['flying'], look: { body: 'bird', size: 'large', tint: '#3a5ac0', glow: '#8ab0ff' } });

  U('wild_troll', '트롤', 'Troll', '찢긴 살이 눈앞에서 아무는 재생력의 화신. 불꽃만이 그 상처를 영원히 남긴다.',
    'A living embodiment of regeneration whose torn flesh knits shut before your eyes — only fire leaves a lasting scar.', 3, 'fighter', ['animal'],
    [A('claw', '손톱', 'Claw', DMG[3])],
    { mp: 28, passives: ['regeneration'], statusRes: { fire: -3 }, look: { body: 'giant', size: 'large', tint: '#7a9a6a' } });

  U('wild_ogre', '오우거', 'Ogre', '우직하고 미련하지만 통나무 같은 팔로 휘두르는 몽둥이는 무엇이든 짓이긴다.',
    'Dim-witted but brutish, swinging a club with log-thick arms that pulps whatever it hits.', 3, 'fighter', ['animal'],
    [A('club_smash', '몽둥이 강타', 'Club Smash', DMG[3] + 2, { effects: [{ status: 'stunned', chance: 20, duration: 1 }] })],
    { mp: 32, abilities: ['giant_stomp'], look: { body: 'giant', size: 'large', tint: '#c8a080' } });

  U('wild_harpy', '하피', 'Harpy', '여자의 얼굴에 맹금의 날개와 발톱을 가진 하늘의 약탈자. 날카로운 비명으로 적을 흩트린다.',
    'A sky-borne raider with a woman\'s face and a raptor\'s wings and claws, scattering foes with its shriek.', 2, 'skirmisher', ['animal', 'flying'],
    [A('talon_rake', '발톱 할퀴기', 'Talon Rake', DMG[2] - 1, { effects: [{ status: 'blinded', chance: 25, duration: 2 }] })],
    { move: 'fly', mp: 44, passives: ['flying'], abilities: ['howl'], look: { body: 'harpy', size: 'medium' } });

  U('wild_wyvern', '와이번', 'Wyvern', '용의 피가 옅게 섞인 두 다리 짐승. 꼬리 끝 독침으로 상대를 마비시킨다.',
    'A two-legged beast with thin dragon blood in its veins, its tail-spike venom leaving foes paralyzed.', 4, 'shock', ['dragon', 'flying'],
    [A('bite', '물어뜯기', 'Bite', DMG[4] - 4), A('tail_sting', '꼬리 독침', 'Tail Sting', DMG[4] - 10, { channel: 'blight', effects: [{ status: 'poisoned', chance: 50, duration: 3 }] })],
    { move: 'fly', mp: 48, passives: ['flying'], look: { body: 'dragon', size: 'medium' } });

  U('wild_griffon', '그리폰', 'Griffon', '독수리의 머리와 사자의 몸을 가진 고귀한 맹수. 산악 절벽에 둥지를 튼다.',
    'A noble beast with an eagle\'s head and a lion\'s body, nesting on high mountain cliffs.', 2, 'shock', ['animal', 'flying'],
    [A('talon_dive', '발톱 급강하', 'Talon Dive', DMG[2] + 1)],
    { move: 'fly', mp: 44, passives: ['flying'], look: { body: 'griffon', size: 'medium' } });

  U('wild_basilisk', '바실리스크', 'Basilisk', '마주친 자를 얼어붙게 하는 눈빛을 지닌 독룡. 그 시선을 견디는 자는 드물다.',
    'A venomous serpent-lizard whose gaze can freeze a foe in place; few can hold its stare.', 4, 'fighter', ['animal'],
    [A('venom_bite', '독니', 'Venom Bite', DMG[4] - 4, { channel: 'blight', effects: [{ status: 'poisoned', chance: 50, duration: 3 }] }),
      A('petrifying_gaze', '석화의 시선', 'Petrifying Gaze', DMG[4] - 14, { type: 'ranged', range: 3, channel: 'spirit', effects: [{ status: 'stunned', chance: 30, duration: 1 }] })],
    { mp: 28, passives: ['sturdy'], look: { body: 'beast_basilisk', size: 'large' } });

  U('wild_hydra', '히드라', 'Hydra', '머리를 자르면 새 머리가 돋아나는 늪의 재앙. 여러 개의 아가리가 동시에 물어뜯는다.',
    'A swamp-born horror that grows a new head for every one severed, its many jaws biting all at once.', 5, 'fighter', ['animal', 'mythic'],
    [A('triple_bite', '세 갈래 물어뜯기', 'Triple Bite', DMG[5] - 16, { repeat: 3, effects: [{ status: 'poisoned', chance: 20, duration: 3 }] })],
    { mp: 24, abilities: ['poison_spit'], passives: ['regeneration', 'hardened'], statusRes: { blight: 5 }, look: { body: 'beast_hydra', size: 'huge' } });

  U('wild_treant', '트리앤트', 'Treant', '수백 년을 산 나무가 스스로 뿌리를 뽑아 걸어 다니게 된 숲의 수호자.',
    'A centuries-old tree that tore its own roots free to walk the forest as its guardian.', 3, 'shield', ['plant'],
    [A('branch_slam', '가지 강타', 'Branch Slam', DMG[3] + 2, { effects: [{ status: 'rooted', chance: 30, duration: 2 }] })],
    { mp: 20, passives: ['sturdy', 'regeneration'], statusRes: { fire: -4 }, look: { body: 'treant', size: 'large' } });

  U('wild_unicorn', '유니콘', 'Unicorn', '순수한 자만이 다가갈 수 있다는 신성한 뿔말. 그 뿔에 닿으면 저주도 씻겨나간다.',
    'A sacred horned steed said to allow only the pure to approach; its horn\'s touch washes away curses.', 3, 'shock', ['animal'],
    [A('horn_charge', '뿔 돌진', 'Horn Charge', DMG[3] + 2)],
    { mp: 48, passives: ['charge'], abilities: ['cleanse'], look: { body: 'unicorn', size: 'medium', tint: '#f4f0ff', glow: '#ffe9ff' } });

  U('wild_phoenix', '불사조', 'Phoenix', '황금빛 불꽃에 휩싸인 새. 재가 되어 스러져도 불꽃 속에서 다시 태어난다.',
    'A bird wreathed in golden flame that is reborn from its own ashes when it falls.', 4, 'mage', ['animal', 'flying', 'mythic'],
    [A('flame_talons', '화염 발톱', 'Flame Talons', DMG[4] - 4, { channel: 'fire', effects: [{ status: 'burning', chance: 40, duration: 3 }] })],
    { move: 'fly', mp: 48, abilities: ['ignite'], passives: ['flying', 'resurgence', 'immune_fire'], look: { body: 'phoenix', size: 'medium', tint: '#ff5a2a', glow: '#ff9a2a' } });

  // ================================================================ MARAUDERS (9) — humanoid bandit-camp units, tags:['marauder']
  // Humanoid marauders use look.body:'form' + look.formLook (see file header) to fix their race
  // without depending on any player's chosen Form.
  U('marauder_bandit', '도적', 'Bandit', '가난에 내몰려 칼을 든 떠돌이 무법자. 무리를 지어 상인과 여행자를 덮친다.',
    'An outlaw driven to the blade by poverty, raiding merchants and travelers in packs.', 1, 'fighter', ['marauder'],
    [A('slash', '베기', 'Slash', DMG[1])],
    { look: { body: 'form', armor: 'leather', weapon: 'sword', helm: 'cap' } });

  U('marauder_bandit_archer', '도적 궁수', 'Bandit Archer', '숲 그늘에 몸을 숨기고 화살을 날리는 산적. 근접전은 피한다.',
    'A raider who looses arrows from the shadow of the trees, avoiding melee whenever it can.', 1, 'ranged', ['marauder'],
    [A('shortbow_shot', '단궁 사격', 'Shortbow Shot', DMG[1] - 2, { type: 'ranged', range: 4 })],
    { look: { body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood' } });

  U('marauder_goblin_raider', '고블린 약탈자', 'Goblin Raider', '무리 지어 몰려다니며 등 뒤를 노리는 작고 교활한 습격자.',
    'A small, cunning raider that swarms in numbers and strikes from behind.', 1, 'skirmisher', ['marauder'],
    [A('shiv', '단검 찌르기', 'Shiv', DMG[1] - 1, { effects: [{ status: 'bleeding', chance: 20, duration: 2 }] })],
    { mp: 40, abilities: ['sneak_attack'], look: { body: 'form', formLook: { skin: '#8fa84a', ears: 'long' }, armor: 'leather', weapon: 'daggers' } });

  U('marauder_cultist', '광신도', 'Cultist', '이름 모를 존재를 섬기며 제 몸을 아끼지 않고 칼을 휘두르는 광신자.',
    'A zealot in service to some nameless power, throwing itself at the blade without hesitation.', 1, 'fighter', ['marauder'],
    [A('ritual_dagger', '의식용 단검', 'Ritual Dagger', DMG[1])],
    { passives: ['dark_pact'], look: { body: 'form', armor: 'cloth', weapon: 'daggers', tint: '#5a3a6a' } });

  U('marauder_goblin_shaman', '고블린 주술사', 'Goblin Shaman', '뼈 지팡이로 저주를 걸고 동족의 상처를 봉합하는 부족의 주술사.',
    'A tribal spellcaster who curses foes with a bone staff and stitches its kin\'s wounds shut.', 2, 'support', ['marauder'],
    [A('bone_staff', '뼈 지팡이', 'Bone Staff', DMG[2] - 6, { type: 'ranged', range: 3, channel: 'blight' })],
    { abilities: ['curse_of_weakness', 'heal_wounds'], look: { body: 'form', formLook: { skin: '#8fa84a', ears: 'long' }, armor: 'cloth', weapon: 'staff' } });

  U('marauder_orc_warrior', '오크 전사', 'Orc Warrior', '굵은 팔뚝으로 도끼를 휘두르며 전장의 광기에 몸을 맡기는 전사.',
    'A warrior who swings an axe with thick arms and gives itself over to battle-fury.', 2, 'fighter', ['marauder'],
    [A('cleave', '베어 넘기기', 'Cleave', DMG[2] + 2)],
    { passives: ['ferocious'], look: { body: 'form', formLook: { skin: '#6d9a4e', ears: 'pointed' }, armor: 'leather', weapon: 'great_axe' } });

  U('marauder_cult_priest', '광신 사제', 'Cult Priest', '어둠의 축복을 내리며 약자를 저주로 짓누르는 사이비 사제.',
    'A false priest who bestows dark blessings and crushes the weak with curses.', 2, 'support', ['marauder'],
    [A('sacrificial_blade', '제물의 칼날', 'Sacrificial Blade', DMG[2] - 6)],
    { abilities: ['curse_of_weakness'], passives: ['dark_pact'], look: { body: 'form', armor: 'robe', weapon: 'daggers', tint: '#5a3a6a' } });

  U('marauder_bandit_leader', '도적 두목', 'Bandit Leader', '무리를 하나로 묶는 카리스마와 칼솜씨를 겸비한 산적의 우두머리.',
    'The chief of the outlaws, carrying both the charisma to hold the gang together and the blade-skill to lead its charge.', 3, 'shock', ['marauder'],
    [A('warblade', '전투도', 'Warblade', DMG[3])],
    { passives: ['inspiring_presence'], abilities: ['rally'], look: { body: 'form', armor: 'chain', weapon: 'sword_shield', shield: 'round', cape: 'short' } });

  U('marauder_mercenary_knight', '용병 기사', 'Mercenary Knight', '금화를 위해 어느 편에도 서는 떠돌이 기사. 창을 꼬나쥔 돌격은 여느 정규군 못지않다.',
    'A wandering knight who fights for whoever pays; its couched-lance charge rivals any standing army\'s.', 3, 'shock', ['marauder'],
    [A('lance_strike', '창 돌격', 'Lance Strike', DMG[3] + 2)],
    { move: 'mounted', mp: 48, passives: ['charge'], look: { body: 'form', armor: 'plate', weapon: 'lance', shield: 'kite', helm: 'full' } });

  // ================================================================ UNDEAD (10) — crypt/graveyard, tags:['undead']
  U('undead_skeleton', '해골 병사', 'Skeleton', '죽은 자의 뼈에 사령술이 깃들어 다시 일어난 병사. 고통도 두려움도 없다.',
    'Necromancy given to dead bones: a soldier that rises again, feeling neither pain nor fear.', 1, 'shield', ['undead'],
    [A('rusted_blade', '녹슨 검', 'Rusted Blade', DMG[1])],
    { passives: ['undead'], look: { body: 'skeleton', weapon: 'sword_shield', shield: 'round' } });

  U('undead_skeleton_archer', '해골 궁수', 'Skeleton Archer', '삭은 활을 든 채 줄지어 화살을 날리는 뼈의 병사.',
    'A bony soldier that looses arrows in ranks with a rotted bow.', 1, 'ranged', ['undead'],
    [A('bone_bow', '뼈 활', 'Bone Bow', DMG[1] - 2, { type: 'ranged', range: 4 })],
    { passives: ['undead'], look: { body: 'skeleton', weapon: 'bow' } });

  U('undead_zombie', '좀비', 'Zombie', '썩어가는 몸을 이끌고 느리게 다가와 살아있는 것을 움켜쥐는 시체.',
    'A rotting corpse that shambles slowly forward to seize anything living.', 1, 'fighter', ['undead'],
    [A('rotting_grasp', '썩은 손아귀', 'Rotting Grasp', DMG[1] + 1, { effects: [{ status: 'poisoned', chance: 20, duration: 3 }] })],
    { mp: 20, passives: ['undead'], look: { body: 'undead' } });

  U('undead_ghoul', '구울', 'Ghoul', '네 발로 재빠르게 기어다니며 날카로운 손톱으로 살을 찢는 식시귀.',
    'A carrion-eater that scuttles fast on all fours and tears flesh with razor claws.', 2, 'skirmisher', ['undead'],
    [A('rending_claws', '찢는 발톱', 'Rending Claws', DMG[2], { effects: [{ status: 'bleeding', chance: 30, duration: 3 }] })],
    { mp: 36, passives: ['undead', 'fast_movement'], look: { body: 'undead' } });

  U('undead_wraith', '레이스', 'Wraith', '실체 없이 떠도는 원한의 그림자. 스치기만 해도 뼛속까지 얼어붙는다.',
    'A drifting shade of pure grudge whose touch freezes a foe to the bone.', 2, 'skirmisher', ['undead', 'floating'],
    [A('chilling_touch', '서늘한 손길', 'Chilling Touch', DMG[2] - 3, { channel: 'frost', effects: [{ status: 'slowed', chance: 40, duration: 2 }] })],
    { move: 'float', mp: 40, passives: ['undead', 'floating', 'ethereal'], look: { body: 'ghost' } });

  U('undead_banshee', '밴시', 'Banshee', '듣는 이의 정신을 뒤흔드는 곡소리로 산 자를 공포에 떨게 하는 원혼.',
    'A tormented spirit whose wail shatters the mind and drives the living to panic.', 2, 'support', ['undead', 'floating'],
    [A('wail', '곡소리', 'Wail', DMG[2] - 4, { type: 'ranged', range: 3, channel: 'spirit', effects: [{ status: 'panicked', chance: 35, duration: 2 }] })],
    { move: 'float', mp: 40, passives: ['undead', 'floating'], look: { body: 'ghost' } });

  U('undead_bone_horror', '본 호러', 'Bone Horror', '여러 시체의 뼈를 짜맞춘 다리 많은 흉물. 사방으로 팔다리를 휘둘러 쓸어버린다.',
    'A many-limbed horror pieced together from several corpses\' bones, sweeping every limb at once.', 3, 'fighter', ['undead'],
    [A('limb_sweep', '팔다리 후려치기', 'Limb Sweep', DMG[3] + 2)],
    { abilities: ['whirlwind'], passives: ['undead', 'fearless'], look: { body: 'undead', size: 'large' } });

  U('undead_vampire', '뱀파이어', 'Vampire', '밤에만 사냥하는 창백한 흡혈 포식자. 목덜미를 물어 생명을 앗아 스스로를 채운다.',
    'A pale predator that hunts only by night, biting the throat to steal life and refill its own.', 3, 'shock', ['undead'],
    [A('vampiric_claw', '흡혈 손톱', 'Vampiric Claw', DMG[3] + 1)],
    { abilities: ['blood_drain'], passives: ['undead', 'life_steal', 'night_vision'], look: { body: 'undead', tint: '#e8e0e0' } });

  U('undead_lich', '리치', 'Lich', '스스로 영혼을 봉인해 불사를 얻은 대마법사. 뼈만 남은 손끝에서 저주가 흘러나온다.',
    'An archmage who sealed away its own soul to become undying; curses pour from its bony fingertips.', 4, 'mage', ['undead', 'magic_origin'],
    [A('bone_touch', '뼈의 손길', 'Bone Touch', DMG[4] - 10, { channel: 'spirit' })],
    Object.assign({ abilities: ['shadow_bolt', 'curse_of_weakness', 'dispel'], passives: ['undead', 'spellcaster'], look: { body: 'skeleton', armor: 'robe', weapon: 'staff', helm: 'hood' } }, magic(4)));

  U('undead_death_knight', '죽음의 기사', 'Death Knight', '생전의 서약을 저버린 대가로 갑주째 되살아난 기사. 유령마를 몰아 전장을 가른다.',
    'A knight raised armor and all as payment for breaking its living oath, riding a spectral steed across the field.', 4, 'shock', ['undead'],
    [A('doom_blade', '파멸의 검', 'Doom Blade', DMG[4] + 2, { effects: [{ status: 'cursed', chance: 25, duration: 3 }] })],
    { move: 'mounted', mp: 48, passives: ['undead', 'charge'], look: { body: 'undead', armor: 'heavy_plate', weapon: 'great_sword', helm: 'full' } });

  // ================================================================ ELEMENTALS (14) — tags:['elemental']
  U('elemental_fire', '화염 정령', 'Fire Elemental', '살아 숨쉬는 불꽃 그 자체. 스치는 모든 것을 태운다.',
    'Living flame given form, scorching everything it brushes against.', 2, 'fighter', ['elemental'],
    [A('scorching_touch', '불타는 손길', 'Scorching Touch', DMG[2] - 2, { channel: 'fire', effects: [{ status: 'burning', chance: 40, duration: 3 }] })],
    Object.assign({ passives: ['immune_fire'], look: { body: 'elemental', element: 'fire', size: 'medium', glow: '#ff8a2a' } }, magic(2)));

  U('elemental_frost', '서리 정령', 'Frost Elemental', '얼음 파편이 맴도는 차가운 존재. 닿는 순간 뼈까지 얼려버린다.',
    'A cold being wreathed in drifting ice shards that freezes to the bone on contact.', 2, 'fighter', ['elemental'],
    [A('frost_touch', '서리 손길', 'Frost Touch', DMG[2] - 2, { channel: 'frost', effects: [{ status: 'slowed', chance: 45, duration: 2 }] })],
    Object.assign({ passives: ['immune_frost'], look: { body: 'elemental', element: 'frost', size: 'medium', glow: '#a0e0ff' } }, magic(2)));

  U('elemental_lightning', '번개 정령', 'Lightning Elemental', '허공을 가르는 전기 방전 덩어리. 스치기만 해도 몸이 마비된다.',
    'A crackling mass of discharge that numbs a body with a single touch.', 2, 'skirmisher', ['elemental', 'floating'],
    [A('shock_touch', '전격 손길', 'Shock Touch', DMG[2] - 2, { channel: 'lightning', effects: [{ status: 'electrified', chance: 40, duration: 2 }] })],
    Object.assign({ move: 'float', mp: 36, passives: ['immune_lightning', 'floating'], look: { body: 'elemental', element: 'lightning', size: 'medium', glow: '#d0c0ff' } }, magic(2)));

  U('elemental_earth', '대지 정령', 'Earth Elemental', '바위와 흙이 뭉쳐 일어선 우직한 파수꾼. 느리지만 밀어낼 수 없다.',
    'A patient guardian of packed stone and soil — slow, but impossible to push aside.', 2, 'fighter', ['elemental'],
    [A('stone_fist', '돌주먹', 'Stone Fist', DMG[2] + 2)],
    Object.assign({ mp: 24, passives: ['hardened', 'sturdy'], look: { body: 'elemental', element: 'stone', size: 'medium' } }, magic(2)));

  U('elemental_water', '물의 정령', 'Water Elemental', '스스로 형태를 바꾸는 물의 덩어리. 밀려드는 파도로 대상을 흠뻑 적신다.',
    'A shifting mass of water that soaks a target through with a surging wave.', 2, 'fighter', ['elemental', 'amphibious'],
    [A('crashing_wave', '밀려드는 파도', 'Crashing Wave', DMG[2] - 1, { effects: [{ status: 'wet', chance: 70, duration: 3 }] })],
    Object.assign({ move: 'swim', mp: 36, passives: ['amphibious', 'swimming'], look: { body: 'elemental', element: 'water', size: 'medium' } }, magic(2)));

  U('elemental_shadow', '그림자 정령', 'Shadow Elemental', '빛이 닿지 않는 틈에서 스며 나오는 어둠의 응집체. 닿으면 정신을 좀먹는다.',
    'A condensation of darkness that seeps from every lightless crack, gnawing at the mind on contact.', 2, 'skirmisher', ['elemental'],
    [A('umbral_touch', '그림자 손길', 'Umbral Touch', DMG[2] - 3, { channel: 'spirit', effects: [{ status: 'cursed', chance: 35, duration: 3 }] })],
    Object.assign({ passives: ['concealment', 'immune_spirit'], look: { body: 'elemental', element: 'shadow', size: 'medium', tint: '#3a2a4a' } }, magic(2)));

  U('elemental_storm', '폭풍 정령', 'Storm Elemental', '먹구름과 번개를 두른 채 하늘을 가르는 정령. 지나간 자리마다 뇌우가 몰아친다.',
    'A spirit wrapped in thundercloud and lightning that tears across the sky, leaving storms in its wake.', 3, 'mage', ['elemental', 'flying'],
    [A('gale_lash', '돌풍 채찍', 'Gale Lash', DMG[3] - 2, { channel: 'lightning', effects: [{ status: 'electrified', chance: 45, duration: 2 }] })],
    Object.assign({ move: 'fly', mp: 40, abilities: ['lightning_bolt'], passives: ['immune_lightning', 'flying'], look: { body: 'elemental', element: 'lightning', size: 'large', glow: '#c0a8ff' } }, magic(3)));

  U('elemental_magma', '마그마 정령', 'Magma Elemental', '식지 않는 용암으로 이루어진 정령. 지나간 자리마다 땅이 눌어붙는다.',
    'A spirit of molten rock that never cools, scorching the ground wherever it walks.', 3, 'fighter', ['elemental'],
    [A('molten_slam', '용암 강타', 'Molten Slam', DMG[3] + 2, { channel: 'fire', effects: [{ status: 'burning', chance: 50, duration: 3 }] })],
    Object.assign({ mp: 24, abilities: ['fire_bolt'], passives: ['immune_fire'], look: { body: 'elemental', element: 'fire', size: 'large', tint: '#7a2a1a', glow: '#ff6a2a' } }, magic(3)));

  U('elemental_greater_fire', '대화염 정령', 'Greater Fire Elemental', '작은 불티 하나 없이도 주변을 통째로 불태우는 화염의 군주.',
    'A lord of flame that sets everything nearby ablaze without so much as a spark to start it.', 4, 'mage', ['elemental'],
    [A('inferno_touch', '지옥불 손길', 'Inferno Touch', DMG[4] - 4, { channel: 'fire', effects: [{ status: 'burning', chance: 55, duration: 3 }] })],
    Object.assign({ abilities: ['fire_bolt', 'ignite'], passives: ['immune_fire'], look: { body: 'elemental', element: 'fire', size: 'large', glow: '#ff5a1a' } }, magic(4)));

  U('elemental_greater_frost', '대서리 정령', 'Greater Frost Elemental', '숨결만으로 대기를 얼려버리는 겨울의 화신.',
    'An avatar of winter that freezes the very air with its breath.', 4, 'mage', ['elemental'],
    [A('killing_frost', '살을 에는 서리', 'Killing Frost', DMG[4] - 4, { channel: 'frost', effects: [{ status: 'frozen', chance: 25, duration: 1 }] })],
    Object.assign({ abilities: ['frost_bolt', 'freeze'], passives: ['immune_frost'], look: { body: 'elemental', element: 'frost', size: 'large', glow: '#c0f0ff' } }, magic(4)));

  U('elemental_greater_lightning', '대번개 정령', 'Greater Lightning Elemental', '몸 전체가 뇌운으로 이루어진 폭풍의 심장. 다가서는 순간 번개가 내리친다.',
    'A storm\'s heart made wholly of thundercloud — lightning strikes the instant anything draws near.', 4, 'mage', ['elemental', 'flying'],
    [A('storm_touch', '폭풍의 손길', 'Storm Touch', DMG[4] - 4, { channel: 'lightning', effects: [{ status: 'electrified', chance: 55, duration: 2 }] })],
    Object.assign({ move: 'fly', mp: 40, abilities: ['lightning_bolt', 'shock'], passives: ['immune_lightning', 'flying'], look: { body: 'elemental', element: 'lightning', size: 'large', glow: '#e0d0ff' } }, magic(4)));

  U('elemental_greater_earth', '대지의 군주', 'Greater Earth Elemental', '산 하나가 통째로 걸어 다니는 듯한 거대한 바위 정령.',
    'A colossal stone spirit that moves as though an entire mountain had learned to walk.', 4, 'fighter', ['elemental'],
    [A('boulder_fist', '거석 주먹', 'Boulder Fist', DMG[4] + 2)],
    Object.assign({ mp: 20, abilities: ['stone_throw', 'seismic_slam'], passives: ['hardened', 'sturdy'], look: { body: 'elemental', element: 'stone', size: 'huge' } }, magic(4)));

  U('elemental_greater_water', '대해류 정령', 'Greater Water Elemental', '해일을 통째로 끌고 다니는 심해의 화신. 지나간 자리마다 땅이 잠긴다.',
    'An avatar of the deep sea that drags a tidal wave in its wake, flooding the ground it crosses.', 4, 'fighter', ['elemental', 'amphibious'],
    [A('tidal_slam', '해일 강타', 'Tidal Slam', DMG[4] - 2, { effects: [{ status: 'wet', chance: 80, duration: 3 }] })],
    Object.assign({ move: 'swim', mp: 36, abilities: ['seismic_slam'], passives: ['amphibious', 'swimming'], look: { body: 'elemental', element: 'water', size: 'huge' } }, magic(4)));

  U('elemental_greater_shadow', '대그림자 정령', 'Greater Shadow Elemental', '빛이 존재조차 하지 않는 심연에서 걸어 나온 어둠의 화신.',
    'An avatar of the void that walks out of a darkness where light has never once existed.', 4, 'mage', ['elemental'],
    [A('void_touch', '공허의 손길', 'Void Touch', DMG[4] - 4, { channel: 'spirit', effects: [{ status: 'cursed', chance: 50, duration: 3 }] })],
    Object.assign({ abilities: ['shadow_bolt', 'dispel'], passives: ['concealment', 'immune_spirit'], look: { body: 'elemental', element: 'shadow', size: 'large', tint: '#241a30' } }, magic(4)));

  // ================================================================ DRAGONS (15) — tags:['dragon','flying']
  const DRAGON_ELEMENTS = [
    { key: 'fire', ko: '화염', en: 'Fire', channel: 'fire', breath: 'dragon_breath_fire', tint: '#c8402a' },
    { key: 'frost', ko: '서리', en: 'Frost', channel: 'frost', breath: 'dragon_breath_frost', tint: '#6fb0e0' },
    { key: 'lightning', ko: '번개', en: 'Lightning', channel: 'lightning', breath: 'dragon_breath_lightning', tint: '#b8a0e0' },
    { key: 'blight', ko: '역병', en: 'Blight', channel: 'blight', breath: 'dragon_breath_blight', tint: '#7a9a4a' },
    { key: 'spirit', ko: '영혼', en: 'Spirit', channel: 'spirit', breath: 'ab_wild_dragon_breath_spirit', tint: '#e8d090' },
    { key: 'gold', ko: '황금', en: 'Gold', channel: 'spirit', breath: 'ab_wild_dragon_breath_spirit', tint: '#e8c357' },
    { key: 'obsidian', ko: '흑요석', en: 'Obsidian', channel: 'blight', breath: 'dragon_breath_blight', tint: '#241f2a' },
  ];
  for (const e of DRAGON_ELEMENTS) {
    U('dragon_young_' + e.key, '어린 ' + e.ko + ' 용', 'Young ' + e.en + ' Dragon',
      '아직 브레스를 다루는 법을 익히는 어린 ' + e.ko + ' 용. 그래도 발톱과 이빨은 이미 위협적이다.',
      'A young ' + e.en + ' dragon still learning to master its breath — its claws and teeth are already dangerous enough.',
      3, 'shock', ['dragon', 'flying'],
      [A('claw_and_bite', '발톱과 이빨', 'Claw and Bite', DMG[3])],
      { move: 'fly', mp: 48, abilities: [e.breath], passives: ['flying', 'fearless'], look: { body: 'dragon', element: e.channel, size: 'medium', tint: e.tint } });

    U('dragon_adult_' + e.key, '성체 ' + e.ko + ' 용', 'Adult ' + e.en + ' Dragon',
      '수백 년을 살아남아 브레스를 완전히 다스리게 된 성체 ' + e.ko + ' 용. 그림자만으로도 군대를 흩어놓는다.',
      'An adult ' + e.en + ' dragon that has lived centuries and mastered its breath completely — its shadow alone scatters armies.',
      5, 'shock', ['dragon', 'flying'],
      [A('crushing_bite', '짓누르는 이빨', 'Crushing Bite', DMG[5])],
      { move: 'fly', mp: 48, abilities: [e.breath], passives: ['flying', 'fearless', 'large_target', 'sturdy'], look: { body: 'dragon', element: e.channel, size: 'huge', tint: e.tint } });
  }

  U('dragon_ancient', '고대룡', 'Ancient Dragon', '세상이 젊었을 때부터 살아온 태초의 용. 화염과 서리를 번갈아 내뿜으며 그 존재만으로 전설이 된다.',
    'A primeval dragon that has lived since the world was young, breathing fire and frost by turns — a legend simply by existing.', 5, 'shock', ['dragon', 'flying', 'mythic'],
    [A('ancient_maw', '태초의 아가리', 'Ancient Maw', DMG[5] + 8, { effects: [{ status: 'sundered', chance: 30, duration: 3 }] })],
    { move: 'fly', mp: 48, hp: 260, abilities: ['dragon_breath_fire', 'dragon_breath_frost'], passives: ['flying', 'fearless', 'large_target', 'sturdy', 'resurgence'],
      statusRes: { fire: 5, frost: 5, lightning: 5, blight: 5, spirit: 5 }, look: { body: 'dragon', element: null, size: 'huge', tint: '#3a2a3a', glow: '#ffb040' } });

  // ================================================================ GIANTS (6) — tags:['giant']
  U('giant_hill', '언덕 거인', 'Hill Giant', '완만한 언덕 지대를 어슬렁거리며 지나가는 여행자에게 통나무 몽둥이를 휘두르는 거한.',
    'A hulking wanderer of the rolling hills that swings a tree-trunk club at any traveler who strays too close.', 3, 'fighter', ['giant'],
    [A('club', '몽둥이', 'Club', DMG[3] + 4)],
    { mp: 28, abilities: ['giant_stomp'], passives: ['large_target'], look: { body: 'giant', size: 'huge', weapon: 'club', tint: '#a89a7a' } });

  U('giant_stone', '바위 거인', 'Stone Giant', '온몸이 산자락의 바위처럼 굳은 거인. 던지는 돌덩이는 성벽조차 무너뜨린다.',
    'A giant whose whole body has hardened like mountain rock; the boulders it hurls can bring down a city wall.', 3, 'shield', ['giant'],
    [A('boulder_fist', '바위 주먹', 'Boulder Fist', DMG[3] + 2)],
    { mp: 24, abilities: ['stone_throw'], passives: ['sturdy', 'hardened', 'large_target'], look: { body: 'giant', size: 'huge', tint: '#8a8a80' } });

  U('giant_frost', '서리 거인', 'Frost Giant', '얼음 봉우리에서 내려온 거한. 얼음을 두른 철퇴 한 방에 뼛속까지 얼어붙는다.',
    'A giant descended from the ice peaks whose frost-wrapped maul freezes a victim to the bone in a single blow.', 4, 'fighter', ['giant'],
    [A('ice_maul', '얼음 철퇴', 'Ice Maul', DMG[4] + 2, { channel: 'frost', effects: [{ status: 'slowed', chance: 40, duration: 2 }] })],
    { mp: 24, abilities: ['hurl_boulder'], passives: ['immune_frost', 'large_target'], look: { body: 'giant', size: 'huge', tint: '#a8d0e8', element: 'frost' } });

  U('giant_fire', '불꽃 거인', 'Fire Giant', '몸속에서 마그마가 흐르는 화산의 거인. 걸음마다 땅이 눌어붙는다.',
    'A giant of the volcano with magma running beneath its skin, scorching the ground with every step.', 4, 'fighter', ['giant'],
    [A('flame_club', '화염 몽둥이', 'Flame Club', DMG[4] + 2, { channel: 'fire', effects: [{ status: 'burning', chance: 40, duration: 3 }] })],
    { mp: 24, abilities: ['hurl_boulder'], passives: ['immune_fire', 'large_target'], look: { body: 'giant', size: 'huge', tint: '#8a4a2a', element: 'fire', glow: '#ff7a2a' } });

  U('giant_storm', '폭풍 거인', 'Storm Giant', '먹구름 위를 걷는 거인. 내리치는 철퇴마다 벼락이 함께 떨어진다.',
    'A giant that strides above the thunderheads; lightning falls with every swing of its hammer.', 4, 'shock', ['giant'],
    [A('thunder_hammer', '천둥 망치', 'Thunder Hammer', DMG[4] + 2, { channel: 'lightning', effects: [{ status: 'electrified', chance: 40, duration: 2 }] })],
    { mp: 28, abilities: ['hurl_boulder'], passives: ['immune_lightning', 'large_target'], look: { body: 'giant', size: 'huge', tint: '#6a7090', element: 'lightning', glow: '#c0a8ff' } });

  U('giant_elder_king', '거인 왕', 'Giant Elder King', '네 씨족 모두의 존경을 받는 가장 나이 많은 거인. 그 한마디에 산맥의 거인들이 모여든다.',
    'The eldest giant, honored by all four clans; giants of every mountain range answer its call.', 5, 'fighter', ['giant', 'mythic'],
    [A('sovereign_maul', '군주의 철퇴', 'Sovereign Maul', DMG[5] + 6, { effects: [{ status: 'stunned', chance: 30, duration: 1 }] })],
    { mp: 28, abilities: ['hurl_boulder', 'giant_stomp', 'rally'], passives: ['large_target', 'sturdy', 'inspiring_presence'], look: { body: 'giant', size: 'huge', helm: 'crown', tint: '#9a8a70' } });

  // ================================================================ FIENDS (4) — tags:['fiend']
  U('fiend_imp', '임프', 'Imp', '하급 마계의 심부름꾼. 짧은 발톱보다 던지는 불덩이가 훨씬 위험하다.',
    'A lesser demon errand-runner whose thrown firebolt is far more dangerous than its stubby claws.', 2, 'skirmisher', ['fiend', 'flying'],
    [A('claw', '발톱', 'Claw', DMG[2] - 3)],
    { move: 'fly', mp: 44, abilities: ['fire_bolt'], passives: ['flying', 'immune_fire'], look: { body: 'demon', size: 'small', tint: '#c8402a' } });

  U('fiend_hellhound', '지옥 사냥개', 'Hellhound', '숨결마다 불씨를 뿜는 마계의 사냥개. 무리 지어 달려들면 피할 곳이 없다.',
    'A hound of the lower planes that breathes embers with every snarl; there is no outrunning its pack.', 2, 'shock', ['fiend'],
    [A('fiery_bite', '불타는 물어뜯기', 'Fiery Bite', DMG[2] + 1, { channel: 'fire', effects: [{ status: 'burning', chance: 35, duration: 3 }] })],
    { mp: 44, passives: ['immune_fire', 'fast_movement'], look: { body: 'demon', size: 'medium', tint: '#8a2a1a', glow: '#ff6a2a' } });

  U('fiend_succubus', '서큐버스', 'Succubus', '달콤한 속삭임으로 마음을 흔들어 적의 의지를 제 것으로 삼는 유혹자.',
    'A temptress whose sweet whispers unravel the mind and bend an enemy\'s will to her own.', 3, 'support', ['fiend', 'flying'],
    [A('claw', '발톱', 'Claw', DMG[3] - 4)],
    { move: 'fly', mp: 44, abilities: ['mind_control'], passives: ['flying', 'concealment'], look: { body: 'demon', size: 'medium', tint: '#8a3a5a' } });

  U('fiend_balor', '발로르', 'Balor', '불꽃 채찍과 거대한 칼날을 함께 휘두르는 마계의 군주. 지나간 자리마다 공포가 남는다.',
    'A lord of the lower planes wielding a flame-whip and a colossal blade together, leaving only terror in its wake.', 4, 'shock', ['fiend', 'flying', 'mythic'],
    [A('whip_and_blade', '채찍과 칼날', 'Whip and Blade', DMG[4] + 6, { channel: 'fire', effects: [{ status: 'burning', chance: 50, duration: 3 }] })],
    { move: 'fly', mp: 48, abilities: ['dragon_breath_fire'], passives: ['flying', 'immune_fire', 'large_target', 'fear_aura'], look: { body: 'demon', size: 'huge', tint: '#1a1418', glow: '#ff3a1a', element: 'fire' } });

  // ================================================================ CONSTRUCTS (5) — tags:['construct']
  U('construct_clay_soldier', '점토 병사', 'Clay Soldier', '구운 진흙으로 빚어 낸 병사. 명령받은 자리를 벗어나지 않고 버틴다.',
    'A soldier molded from fired clay that holds its assigned position without question.', 2, 'shield', ['construct'],
    [A('clay_fist', '점토 주먹', 'Clay Fist', DMG[2])],
    { passives: ['construct'], look: { body: 'golem', size: 'medium', tint: '#b8703a' } });

  U('construct_stone_guardian', '돌 수호병', 'Stone Guardian', '조각된 돌덩이에 생명을 불어넣은 파수병. 명령이 없는 한 그 자리를 지킨다.',
    'A carved slab of stone given life to guard a single spot until ordered otherwise.', 2, 'shield', ['construct'],
    [A('stone_slam', '돌 강타', 'Stone Slam', DMG[2] + 1)],
    { passives: ['construct', 'hardened'], look: { body: 'golem', size: 'medium', tint: '#8a8a80' } });

  U('construct_iron_golem', '철 골렘', 'Iron Golem', '리벳으로 이어붙인 강철 거인. 무기를 든 팔을 휘두를 때마다 땅이 울린다.',
    'A rivet-seamed steel giant whose swinging arm makes the ground shake.', 3, 'shield', ['construct'],
    [A('iron_fist', '강철 주먹', 'Iron Fist', DMG[3] + 2, { effects: [{ status: 'stunned', chance: 20, duration: 1 }] })],
    { mp: 28, passives: ['construct', 'sturdy'], look: { body: 'golem', size: 'large', tint: '#7a7a80' } });

  U('construct_crystal_sentinel', '수정 파수병', 'Crystal Sentinel', '몸속 마력 결정에서 번개를 쏘아내는 파수병. 침입자를 정확히 겨눈다.',
    'A sentinel that fires lightning from the mana-crystal in its chest, unerringly targeting intruders.', 3, 'mage', ['construct'],
    [A('crystal_shard', '수정 파편', 'Crystal Shard', DMG[3] - 4, { type: 'ranged', range: 3, channel: 'lightning' })],
    { passives: ['construct', 'arcane_focus'], look: { body: 'golem', size: 'medium', tint: '#7ab0e0', glow: '#a0e0ff' } });

  U('construct_bronze_colossus', '청동 거상', 'Bronze Colossus', '청동판을 겹겹이 두른 고대의 거상. 성문을 부수기 위해 만들어졌다.',
    'An ancient colossus layered in bronze plate, built for the sole purpose of breaking down city gates.', 4, 'shield', ['construct'],
    [A('bronze_maul', '청동 철퇴', 'Bronze Maul', DMG[4] + 2)],
    { mp: 24, passives: ['construct', 'large_target', 'siege_breaker'], look: { body: 'golem', size: 'huge', tint: '#c08a3a' } });

  // ================================================================ ELDRITCH (4) — tags:['eldritch']
  U('eldritch_tentacle', '촉수', 'Tentacle', '다른 세계의 틈에서 뻗어 나온 촉수. 뿌리내린 자리에서 움직이지 않고 휘감아 조른다.',
    'A tendril reaching through a rift to another world, rooted in place, coiling and crushing anything within reach.', 2, 'fighter', ['eldritch'],
    [A('crushing_tendril', '조르는 촉수', 'Crushing Tendril', DMG[2] + 3, { effects: [{ status: 'rooted', chance: 50, duration: 2 }] })],
    { mp: 8, passives: ['sturdy'], look: { body: 'eldritch', size: 'medium' } });

  U('eldritch_watcher', '워처', 'Watcher', '허공에 뜬 거대한 눈. 응시당한 자는 그 자리에서 얼어붙는다.',
    'A vast eye that hangs in midair; whoever it stares at freezes in place.', 3, 'mage', ['eldritch', 'floating'],
    [A('gaze', '응시', 'Gaze', DMG[3] - 4, { type: 'ranged', range: 3, channel: 'spirit', effects: [{ status: 'stunned', chance: 20, duration: 1 }] })],
    { move: 'float', mp: 32, passives: ['floating', 'true_sight'], look: { body: 'eldritch', size: 'medium' } });

  U('eldritch_horror', '엘드리치 호러', 'Eldritch Horror', '인간의 눈으로는 형체를 온전히 담을 수 없는 존재. 그 모습을 본 것만으로 사기가 무너진다.',
    'A being whose shape the human eye cannot fully hold; a single glimpse is enough to break morale.', 3, 'fighter', ['eldritch'],
    [A('many_maws', '수많은 아가리', 'Many Maws', DMG[3] + 1, { effects: [{ status: 'demoralized', chance: 30, duration: 2 }] })],
    { passives: ['fearless', 'fear_aura'], look: { body: 'eldritch', size: 'large' } });

  U('eldritch_abomination', '어보미네이션', 'Abomination', '닿는 모든 것의 형태를 일그러뜨리는 공허의 화신. 그 손아귀에 붙잡히면 육신마저 뒤틀린다.',
    'An avatar of the void that warps the shape of anything it touches, twisting even flesh in its grip.', 4, 'fighter', ['eldritch', 'mythic'],
    [A('warping_claw', '뒤틀린 발톱', 'Warping Claw', DMG[4] + 2, { effects: [{ status: 'corrupted', chance: 35, duration: 3 }] })],
    { passives: ['ferocious', 'sturdy'], look: { body: 'eldritch', size: 'huge' } });

  // ================================================================ FEY (3) — tags:['fey'] (additive tag, see header)
  U('fey_sprite', '스프라이트', 'Sprite', '손바닥만 한 몸에 반짝이는 날개를 단 작은 요정. 놀리듯 번개 불티를 던진다.',
    'A palm-sized fey with glittering wings that flings sparks of lightning as if it were a game.', 1, 'skirmisher', ['fey', 'flying'],
    [A('spark_bolt', '불꽃 튀김', 'Spark Bolt', DMG[1] - 3, { type: 'ranged', range: 3, channel: 'lightning' })],
    { move: 'fly', mp: 48, passives: ['flying', 'concealment'], look: { body: 'wisp', size: 'small', glow: '#e0f0ff' } });

  U('fey_nymph', '님프', 'Nymph', '숲과 샘에 깃든 아름다운 정령. 매혹적인 손길로 아군을 북돋고 적의 마음을 어지럽힌다.',
    'A beautiful spirit of wood and spring whose beguiling touch lifts allies and unravels an enemy\'s resolve.', 2, 'support', ['fey'],
    [A('enchanting_touch', '매혹의 손길', 'Enchanting Touch', DMG[2] - 6)],
    { abilities: ['heal_wounds', 'bless'], passives: ['concealment'], look: { body: 'form', formLook: { skin: '#bde8c0', hair: '#e8f4c0', ears: 'pointed' }, glow: '#c0ffcf' } });

  U('fey_dryad', '드라이어드', 'Dryad', '자신이 지키는 나무와 생명을 나눈 숲의 정령. 뿌리로 적을 옭아매고 아군의 상처를 아물게 한다.',
    'A forest spirit that shares its life with the tree it wards, binding foes in roots while it mends its allies\' wounds.', 3, 'support', ['fey', 'plant'],
    [A('thorn_touch', '가시 손길', 'Thorn Touch', DMG[3] - 6, { effects: [{ status: 'rooted', chance: 30, duration: 2 }] })],
    { abilities: ['entangle', 'mass_heal'], passives: ['regeneration'], look: { body: 'form', formLook: { skin: '#7aa860', hair: '#3a6a30', ears: 'pointed' } } });

  // ================================================================ CELESTIALS (4) — tags:['angelic']
  U('celestial_guardian_angel', '수호천사', 'Guardian Angel', '빛나는 검을 든 채 성역을 지키는 천상의 전사. 그 날개는 어떤 화살도 튕겨낸다.',
    'A heavenly warrior guarding a sacred place with a shining blade; its wings turn aside any arrow.', 3, 'shield', ['angelic', 'flying'],
    [A('smiting_blade', '심판의 검', 'Smiting Blade', DMG[3])],
    { move: 'fly', mp: 44, abilities: ['smite'], passives: ['flying', 'guard'], look: { body: 'angel', size: 'medium', glow: '#fff0c0' } });

  U('celestial_light_spirit', '빛의 정령', 'Light Spirit', '순수한 빛으로 이루어진 하급 천상의 존재. 스치는 손길만으로 상처를 어루만진다.',
    'A lesser celestial made of pure light whose passing touch mends wounds.', 3, 'support', ['angelic', 'floating'],
    [A('radiant_touch', '광휘의 손길', 'Radiant Touch', DMG[3] - 6, { channel: 'spirit', effects: [{ status: 'condemned', chance: 30, duration: 3 }] })],
    { move: 'float', mp: 36, abilities: ['heal_wounds', 'bless'], passives: ['floating', 'fearless'], look: { body: 'angel', size: 'small', glow: '#ffffe0' } });

  U('celestial_seraph', '세라핌', 'Seraph', '여섯 날개를 펼친 채 신성한 빛줄기를 쏟아내는 천상의 사자.',
    'A herald of heaven that unfurls six wings and pours down beams of holy light.', 4, 'mage', ['angelic', 'flying'],
    [A('holy_bolt_strike', '성광 일격', 'Holy Bolt Strike', DMG[4] - 2, { channel: 'spirit' })],
    { move: 'fly', mp: 44, abilities: ['holy_bolt', 'mass_heal'], passives: ['flying', 'arcane_focus'], look: { body: 'angel', size: 'large', glow: '#fff5c0' } });

  U('celestial_archon_avatar', '아콘 화신', 'Archon Avatar', '신성의 힘을 온전히 두른 채 강림한 천상의 화신. 그 일격은 전장 전체의 운명을 가른다.',
    'A celestial avatar descended fully clad in divine power, its single strike deciding the fate of a whole battlefield.', 5, 'shock', ['angelic', 'flying', 'mythic'],
    [A('avatar_strike', '화신의 일격', 'Avatar Strike', DMG[5] + 4, { channel: 'spirit', effects: [{ status: 'condemned', chance: 40, duration: 3 }] })],
    { move: 'fly', mp: 48, abilities: ['smite', 'mass_heal', 'twin_awakening'], passives: ['flying', 'fearless', 'inspiring_presence', 'large_target'], look: { body: 'angel', size: 'huge', glow: '#ffe9a0' } });

  // ================================================================ FREE CITY MILITIA (4) — tags:['racial'] (renders via the Free City's own Form, like culture units)
  U('free_militia', '민병', 'Militia', '자유도시가 위급할 때 창을 들고 일어서는 평범한 주민.',
    'Ordinary townsfolk who take up a spear when their Free City is threatened.', 1, 'fighter', ['racial'],
    [A('spear_jab', '창 찌르기', 'Spear Jab', DMG[1])],
    { source: { type: 'free_city' }, look: { body: 'form', armor: 'cloth', weapon: 'spear' } });

  U('free_archer', '민병 궁수', 'Militia Archer', '성벽 위에서 활을 겨누는 자유도시의 사수.',
    'A Free City marksman who takes aim from atop the walls.', 1, 'ranged', ['racial'],
    [A('shortbow', '단궁', 'Shortbow', DMG[1] - 2, { type: 'ranged', range: 4 })],
    { source: { type: 'free_city' }, look: { body: 'form', armor: 'cloth', weapon: 'bow' } });

  U('free_guard', '도시 경비대', 'City Guard', '정식 갑주를 갖춘 자유도시의 상비병. 성문을 굳건히 지킨다.',
    'A properly armored standing soldier of the Free City, holding its gate fast.', 2, 'shield', ['racial'],
    [A('guard_strike', '경비대의 일격', 'Guard Strike', DMG[2])],
    { source: { type: 'free_city' }, passives: ['shield_wall'], look: { body: 'form', armor: 'chain', weapon: 'sword_shield', shield: 'kite' } });

  U('free_captain', '자유도시 대장', 'Free City Captain', '도시 수비대를 이끄는 노련한 지휘관. 그 함성 한 번에 병사들의 사기가 치솟는다.',
    'A seasoned officer leading the city watch, whose single battle-cry sends the defenders\' morale soaring.', 3, 'shock', ['racial'],
    [A('captains_blade', '대장의 검', 'Captain\'s Blade', DMG[3])],
    { source: { type: 'free_city' }, abilities: ['rally'], passives: ['inspiring_presence'], look: { body: 'form', armor: 'plate', weapon: 'sword_shield', shield: 'kite', cape: 'short' } });

  // ================================================================ guard pools — curated id lists for
  // worldgen/turn code to draw from when stocking infestations, Ancient Wonder guards and roaming
  // marauder stacks by tier and family (docs/research/unit_catalog.md §4-5, systems_world_combat.md §1.8-1.9).
  Data.define('names', {
    id: 'guard_pools',
    pools: {
      animals_t1: ['wild_wolf', 'wild_boar', 'wild_elk', 'wild_eagle', 'wild_crocodile', 'wild_serpent'],
      animals_t2: ['wild_lion', 'wild_giant_spider', 'wild_dire_wolf', 'wild_bear', 'wild_harpy', 'wild_griffon'],
      undead_t1: ['undead_skeleton', 'undead_skeleton_archer', 'undead_zombie'],
      undead_t2: ['undead_ghoul', 'undead_wraith', 'undead_banshee'],
      undead_t3: ['undead_bone_horror', 'undead_vampire'],
      bandits_t1: ['marauder_bandit', 'marauder_bandit_archer', 'marauder_goblin_raider', 'marauder_cultist'],
      bandits_t2: ['marauder_goblin_shaman', 'marauder_orc_warrior', 'marauder_cult_priest'],
      bandits_t3: ['marauder_bandit_leader', 'marauder_mercenary_knight'],
      elementals_t2: ['elemental_fire', 'elemental_frost', 'elemental_lightning', 'elemental_earth', 'elemental_water', 'elemental_shadow'],
      elementals_t3: ['elemental_storm', 'elemental_magma'],
      elementals_t4: ['elemental_greater_fire', 'elemental_greater_frost', 'elemental_greater_lightning', 'elemental_greater_earth', 'elemental_greater_water', 'elemental_greater_shadow'],
      dragons_t3: ['dragon_young_fire', 'dragon_young_frost', 'dragon_young_lightning', 'dragon_young_blight', 'dragon_young_spirit', 'dragon_young_gold', 'dragon_young_obsidian'],
      dragons_t4: ['wild_wyvern'],
      dragons_t5: ['dragon_adult_fire', 'dragon_adult_frost', 'dragon_adult_lightning', 'dragon_adult_blight', 'dragon_adult_spirit', 'dragon_adult_gold', 'dragon_adult_obsidian', 'dragon_ancient'],
      giants_t3: ['giant_hill', 'giant_stone'],
      giants_t4: ['giant_frost', 'giant_fire', 'giant_storm'],
      giants_t5: ['giant_elder_king'],
      fiends_t2: ['fiend_imp', 'fiend_hellhound'],
      fiends_t3: ['fiend_succubus'],
      fiends_t4: ['fiend_balor'],
      constructs_t2: ['construct_clay_soldier', 'construct_stone_guardian'],
      constructs_t3: ['construct_iron_golem', 'construct_crystal_sentinel'],
      constructs_t4: ['construct_bronze_colossus'],
      eldritch_t2: ['eldritch_tentacle'],
      eldritch_t3: ['eldritch_watcher', 'eldritch_horror'],
      eldritch_t4: ['eldritch_abomination'],
      fey_t1: ['fey_sprite'],
      fey_t2: ['fey_nymph'],
      fey_t3: ['fey_dryad'],
      celestial_t3: ['celestial_guardian_angel', 'celestial_light_spirit'],
      celestial_t4: ['celestial_seraph'],
      celestial_t5: ['celestial_archon_avatar'],
      free_city: ['free_militia', 'free_archer', 'free_guard', 'free_captain'],
    },
  });

})(window.AOW = window.AOW || {});
