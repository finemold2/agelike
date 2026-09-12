// src/game/state.js — game state: creation, (de)serialization and accessors (SPEC §4)
//
// Additive helpers beyond the SPEC contract (documented here for other modules):
//   State.T / State.F               name → index maps for TERRAINS / FEATURES; State.WATER_MAX = 2 (terrain index ≤ 2 is water)
//   State.MAP_SIZES                 {small:{W,H}, medium:{W,H}, large:{W,H}}
//   State.RESOURCES, State.MAGIC_MATERIALS   id lists used by worldgen/province nodes
//   State.quickSettings(overrides)  sensible 1 human + 3 AI medium settings using whatever content exists
//   State.normalizeSettings(s)      fills defaults (players, colors, victory…)
//   State.hexInfo(game, idx)        {idx,col,row,terrain,feature,t,f,height,river,road,province,owner,structure}
//   State.terrainDef(game, idx) / State.featureDef(game, idx)   Data.terrains / Data.features entries (or null)
//   State.hexMoveCost(game, idx, moveClass)  terrain + feature cost for a class ('walk' default), Infinity if impassable
//   State.edgeHasRiver(game, a, b) / State.edgeHasRoad(game, a, b)   for adjacent hexes a→b
//   State.dirTo(game, a, b)          direction 0..5 from a to adjacent b, or -1
//   State.latitude(game, idx)        0 (equator) .. 1 (pole)
//   State.landmassAt(game, idx)      0/1 land test (terrain index ≥ 3)
//   State.army(game,id), State.city(game,id), State.structure(game,id), State.unitType(unit) (Data type or unit.custom or fallback)
//   State.unitsOf(game, armyId), State.playerCities/playerArmies/allUnitsOfPlayer(game, pid), State.heroOfUnit(game, unitId)
//   State.createUnit/createArmy/createCity/createStructure/createHero, State.addUnitToArmy, State.removeUnit/removeArmy/removeStructure
//   State.reveal(game, pid, idx, radius)   marks explored+visible in a radius
//   State.rng(game)                  the persistent gameplay RNG (state saved as game.rngState on serialize)
//   State.clone(game)                deep copy via serialize/deserialize
//   State.cityName(game, playerOrCultureId, rng), State.rulerName(rng, cultureId)
//   Structure entries never move: structure.id === index into game.structures; removeStructure leaves a tombstone {kind:'removed'}.
//   Node structures use refId = province id; infestation structures use refId = infestation kind string; wonders use refId = wonder id (or null).
//   Free-city cities have owner -1 and city.freeCity = {culture, form, opinion:{}, vassalOf:-1, integrated:false}; their province has cityId set but owner -1.
//   game.starts = [hexIdx per player] chosen by WorldGen; game.rngState = persistent RNG state.
(function (AOW) {
  'use strict';
  const State = {};

  State.TERRAINS = ['ocean', 'coast', 'lake', 'grass', 'forest', 'hills', 'mountain', 'desert', 'snow', 'swamp', 'volcanic'];
  State.FEATURES = ['none', 'forest', 'dense_forest', 'hills', 'mountain', 'peak', 'ruins', 'crystal', 'ash', 'oasis', 'ice', 'mushroom', 'ancient_tree'];
  State.T = {}; State.TERRAINS.forEach((n, i) => { State.T[n] = i; });
  State.F = {}; State.FEATURES.forEach((n, i) => { State.F[n] = i; });
  State.WATER_MAX = 2;
  State.MAP_SIZES = { small: { W: 40, H: 28 }, medium: { W: 56, H: 40 }, large: { W: 72, H: 52 } };
  State.RESOURCES = ['food', 'production', 'gold', 'mana', 'knowledge', 'draft'];
  State.MAGIC_MATERIALS = ['mithril', 'crystal', 'sunstone', 'nightshade', 'dragon_bone', 'moonstone', 'ironwood', 'frost_crystal', 'ember_coal', 'star_metal'];
  State.AFFINITIES = ['order', 'chaos', 'nature', 'materium', 'astral', 'shadow'];
  State.PERSONALITIES = ['expansionist', 'militarist', 'scholar', 'diplomat'];
  State.ID_KINDS = ['city', 'army', 'unit', 'hero', 'structure', 'province', 'battle', 'notification', 'log'];
  const FALLBACK_COLORS = ['#3f7fe0', '#d8402f', '#2fa85a', '#e0b83a', '#8f4fd0', '#f07d2c', '#2ab7c8', '#d94fa3'];
  const FALLBACK_COLORS2 = ['#c9d9ff', '#ffd0c8', '#c9f5d3', '#fff2b8', '#e6cdff', '#ffd9bd', '#c6f0f5', '#ffd0ee'];
  const START = { gold: 200, mana: 50, knowledge: 0, imperium: 0, cp: 20, capitalPop: 5, capitalTier: 2, visionRadius: 4, cityCap: 3 };
  const DIFFICULTY_BONUS = { easy: { gold: -50, mana: 0 }, normal: { gold: 0, mana: 0 }, hard: { gold: 100, mana: 30 }, brutal: { gold: 250, mana: 80 } };
  State.START = START;

  const Data = () => AOW.Data;
  const Hex = () => AOW.Hex;

  // ------------------------------------------------------------------ settings
  /** Default settings for a 1 human + 3 AI medium game; `overrides` are shallow-merged (players array replaces). */
  State.quickSettings = function (overrides) {
    overrides = overrides || {};
    const forms = Data().list('forms'), cultures = Data().list('cultures');
    const formIds = forms.length ? forms.map(f => f.id) : ['human'];
    const cultureIds = cultures.length ? cultures.map(c => c.id) : ['feudal'];
    const tomes = Data().list('tomes').filter(t => t.tier === 1);
    const classes = Data().list('heroClasses');
    const rulerTypes = Data().list('rulerTypes');
    const nameLists = ['Aurelia', 'Karagh', 'Sylvane', 'Morgrim', 'Elowen', 'Draven', 'Isolde', 'Torvak'];
    const factionNames = [{ ko: '새벽의 왕국', en: 'Dawn Kingdom' }, { ko: '잿빛 군단', en: 'Ashen Legion' }, { ko: '숲의 맹약', en: 'Verdant Pact' }, { ko: '별의 회의', en: 'Star Council' },
      { ko: '용암 왕좌', en: 'Ember Throne' }, { ko: '서리 씨족', en: 'Frost Clans' }, { ko: '황금 연맹', en: 'Gilded League' }, { ko: '그림자 궁정', en: 'Shadow Court' }];
    const n = overrides.playerCount || 4;
    const players = [];
    for (let i = 0; i < n; i++) {
      players.push({
        name: AOW.L ? AOW.L(factionNames[i % factionNames.length]) : factionNames[i % factionNames.length].en,
        isHuman: i === 0,
        formId: formIds[i % formIds.length],
        cultureId: cultureIds[i % cultureIds.length],
        subChoice: null,
        rulerType: rulerTypes.length ? rulerTypes[0].id : 'champion',
        rulerName: nameLists[i % nameLists.length],
        heroClass: classes.length ? classes[i % classes.length].id : 'warrior',
        traits: [],
        tomes: tomes.length ? [tomes[i % tomes.length].id] : [],
        color: State.playerColor(i), color2: State.playerColor2(i),
        personality: State.PERSONALITIES[i % State.PERSONALITIES.length],
      });
    }
    const s = {
      seed: 'realm-' + Math.floor(Math.random() * 1e9),
      mapSize: 'medium',
      players,
      difficulty: 'normal',
      realmTraits: [],
      victory: { expansion: true, magic: true, military: true, score: true, turnLimit: 150 },
    };
    for (const k of Object.keys(overrides)) if (k !== 'playerCount') s[k] = overrides[k];
    return State.normalizeSettings(s);
  };
  State.playerColor = i => (AOW.Palette && AOW.Palette.playerColor) ? AOW.Palette.playerColor(i) : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
  State.playerColor2 = i => (AOW.Palette && AOW.Palette.playerColor2) ? AOW.Palette.playerColor2(i) : FALLBACK_COLORS2[i % FALLBACK_COLORS2.length];

  State.normalizeSettings = function (s) {
    s = Object.assign({}, s || {});
    if (s.seed === undefined || s.seed === null || s.seed === '') s.seed = 'realm-' + Math.floor(Math.random() * 1e9);
    if (!State.MAP_SIZES[s.mapSize]) s.mapSize = 'medium';
    if (!['easy', 'normal', 'hard', 'brutal'].includes(s.difficulty)) s.difficulty = 'normal';
    s.realmTraits = (s.realmTraits || []).filter(id => Data().has('realmTraits', id) || !Data().list('realmTraits').length);
    s.victory = Object.assign({ expansion: true, magic: true, military: true, score: true, turnLimit: 150 }, s.victory || {});
    const formList = Data().list('forms'), cultList = Data().list('cultures');
    const players = (s.players && s.players.length ? s.players : [{ isHuman: true }, {}]).slice(0, 8).map((p, i) => Object.assign({
      name: 'Player ' + (i + 1), isHuman: false, formId: formList.length ? formList[0].id : 'human', cultureId: cultList.length ? cultList[0].id : 'feudal',
      subChoice: null, rulerType: 'champion', rulerName: null, heroClass: 'warrior', traits: [], tomes: [],
      color: State.playerColor(i), color2: State.playerColor2(i), personality: State.PERSONALITIES[i % 4],
    }, p));
    if (players.length < 2) players.push({ name: 'Player 2', isHuman: false, formId: players[0].formId, cultureId: players[0].cultureId, subChoice: null, rulerType: 'champion', rulerName: null, heroClass: 'warrior', traits: [], tomes: [], color: State.playerColor(1), color2: State.playerColor2(1), personality: 'militarist' });
    s.players = players;
    return s;
  };

  // ------------------------------------------------------------------ internals (non-serialized caches)
  function attachInternals(game) {
    if (!Object.prototype.hasOwnProperty.call(game, '_maps')) Object.defineProperty(game, '_maps', { value: {}, enumerable: false, writable: true, configurable: true });
    if (!Object.prototype.hasOwnProperty.call(game, '_rng')) Object.defineProperty(game, '_rng', { value: null, enumerable: false, writable: true, configurable: true });
    return game;
  }
  function lookup(game, key, id) {
    if (id === null || id === undefined || id < 0) return null;
    const arr = game[key];
    if (!arr) return null;
    let map = game._maps && game._maps[key];
    if (map) {
      const e = map.get(id);
      if (e && arr[e.pos] === e.obj) return e.obj;
    }
    // rebuild
    if (!game._maps) attachInternals(game);
    map = new Map();
    for (let i = 0; i < arr.length; i++) map.set(arr[i].id, { obj: arr[i], pos: i });
    game._maps[key] = map;
    const e = map.get(id);
    return e ? e.obj : null;
  }
  /** append to the id cache when an entity is pushed (avoids a rebuild on the next lookup) */
  function indexNew(game, key, obj) {
    const map = game._maps && game._maps[key];
    if (map) map.set(obj.id, { obj, pos: game[key].length - 1 });
  }

  // ------------------------------------------------------------------ creation
  /**
   * Build a complete game from settings (see quickSettings for the shape). Calls WorldGen.generate, creates
   * players, capitals, ruler heroes and starting armies.
   */
  State.create = function (settings) {
    settings = State.normalizeSettings(settings);
    const size = State.MAP_SIZES[settings.mapSize];
    const W = size.W, H = size.H, N = W * H;
    const game = {
      version: 1, seed: settings.seed, turn: 1, W, H, settings,
      terrain: new Uint8Array(N), feature: new Uint8Array(N), height: new Float32Array(N),
      river: new Uint8Array(N), road: new Uint8Array(N), province: new Int16Array(N).fill(-1), owner: new Int8Array(N).fill(-1), structure: new Int16Array(N).fill(-1),
      explored: [], visible: [],
      provinces: [], structures: [], cities: [], armies: [], units: [], heroes: [], players: [],
      battles: [], log: [], notifications: [], victory: null,
      nextId: {}, starts: [], rngState: 0,
    };
    for (const k of State.ID_KINDS) game.nextId[k] = 1;
    game.nextId.structure = 0; game.nextId.province = 0;
    attachInternals(game);
    const master = new AOW.RNG(settings.seed);
    const worldRng = master.fork('world');
    const gameRng = master.fork('game');
    game._rng = gameRng;
    game.rngState = gameRng.state();

    if (!AOW.WorldGen || typeof AOW.WorldGen.generate !== 'function') throw new Error('State.create: AOW.WorldGen.generate missing');
    AOW.WorldGen.generate(game, worldRng);

    const setupRng = master.fork('setup');
    for (let i = 0; i < settings.players.length; i++) createPlayer(game, i, settings.players[i], setupRng);
    for (let i = 0; i < game.players.length; i++) foundStart(game, game.players[i], setupRng);
    game.rngState = game._rng.state();
    if (AOW.Events) AOW.Events.emit('game:new', { game });
    return game;
  };

  function sumAffinity(acc, aff) { if (aff) for (const k of Object.keys(aff)) acc[k] = (acc[k] || 0) + (aff[k] || 0); }

  function createPlayer(game, pid, ps, rng) {
    const N = game.W * game.H;
    const affinity = {}; for (const a of State.AFFINITIES) affinity[a] = 0;
    if (Data().has('cultures', ps.cultureId)) sumAffinity(affinity, Data().get('cultures', ps.cultureId).affinity);
    for (const t of ps.traits || []) if (Data().has('traits', t)) sumAffinity(affinity, Data().get('traits', t).affinity);
    for (const t of ps.tomes || []) if (Data().has('tomes', t)) sumAffinity(affinity, Data().get('tomes', t).affinity);
    const diff = DIFFICULTY_BONUS[game.settings.difficulty] || DIFFICULTY_BONUS.normal;
    const aiBonus = ps.isHuman ? { gold: 0, mana: 0 } : diff;
    const diplomacy = {};
    for (let o = 0; o < game.settings.players.length; o++) if (o !== pid) diplomacy[o] = { state: 'peace', opinion: 0, grievances: [], treaties: [], truce: 0 };
    const player = {
      id: pid, name: ps.name, isHuman: !!ps.isHuman, color: ps.color, color2: ps.color2, alive: true,
      rulerType: ps.rulerType || 'champion', rulerName: ps.rulerName || State.rulerName(rng, ps.cultureId), heroClass: ps.heroClass || 'warrior',
      formId: ps.formId, cultureId: ps.cultureId, subChoice: ps.subChoice || null, traits: (ps.traits || []).slice(), tomes: (ps.tomes || []).slice(),
      research: { tomeQueue: [], current: null, progress: 0 },
      affinity,
      resources: { gold: START.gold + aiBonus.gold, mana: START.mana + aiBonus.mana, knowledge: START.knowledge, imperium: START.imperium },
      income: { gold: 0, mana: 0, knowledge: 0, imperium: 0 },
      spells: { known: [], active: [] },
      casting: { cp: START.cp, cpMax: START.cp }, combatCasting: { cp: START.cp, cpMax: START.cp },
      empireSkills: [], cityCap: START.cityCap,
      diplomacy,
      stats: { score: 0, cities: 0, units: 0, territory: 0 },
      personality: ps.personality || State.PERSONALITIES[pid % 4],
      capitalId: -1, rulerHeroId: -1,
    };
    game.players.push(player);
    game.explored[pid] = new Uint8Array(N);
    game.visible[pid] = new Uint8Array(N);
    return player;
  }

  function foundStart(game, player, rng) {
    const pid = player.id;
    let hex = game.starts[pid];
    if (hex === undefined || hex < 0) {
      AOW.warn('State: no start for player ' + pid + ', picking a land hex');
      hex = fallbackStart(game, rng);
      game.starts[pid] = hex;
    }
    const city = State.createCity(game, pid, hex, { name: State.cityName(game, player, rng), tier: START.capitalTier, isCapital: true, pop: START.capitalPop });
    player.capitalId = city.id;

    // ruler hero + unit
    const heroUnit = createHeroUnit(game, player, rng);
    const hero = State.createHero(game, { unitId: heroUnit.id, owner: pid, name: player.rulerName, classId: player.heroClass, isRuler: true, rulerType: player.rulerType });
    heroUnit.heroId = hero.id; heroUnit.name = hero.name;
    player.rulerHeroId = hero.id;

    // starting roster
    const unitIds = [heroUnit.id];
    for (const typeId of startingRoster(game, player)) unitIds.push(State.createUnit(game, typeId, pid, null).id);
    if (unitIds.length === 1) AOW.warn('State: no unit content — player ' + pid + ' starts with only the ruler');
    State.createArmy(game, pid, hex, unitIds);
    State.reveal(game, pid, hex, START.visionRadius);
    player.stats.cities = 1; player.stats.units = unitIds.length; player.stats.territory = city.provinces.length;
  }

  function fallbackStart(game, rng) {
    const N = game.W * game.H;
    const cands = [];
    for (let i = 0; i < N; i++) if (game.terrain[i] > State.WATER_MAX && game.structure[i] < 0 && game.feature[i] !== State.F.peak) cands.push(i);
    if (!cands.length) return 0;
    let best = cands[0], bestD = -1;
    for (let k = 0; k < 200; k++) {
      const c = rng.pick(cands);
      let d = Infinity;
      for (const s of game.starts) if (s >= 0) d = Math.min(d, Hex().distIdx(c, s, game.W));
      if (d > bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function heroTypeId() {
    if (Data().has('units', 'hero')) return 'hero';
    const h = Data().list('units').find(u => u.role === 'hero');
    return h ? h.id : null;
  }
  function createHeroUnit(game, player, rng) {
    const typeId = heroTypeId();
    const unit = State.createUnit(game, typeId || 'hero', player.id, null);
    if (!typeId) {
      unit.custom = { name: { ko: '영웅', en: 'Hero' }, tier: 3, role: 'hero', tags: ['hero', 'racial'], move: 'walk', mp: 32, hp: 90, def: 3, res: 3,
        attacks: [{ id: 'hero_strike', name: { ko: '일격', en: 'Strike' }, type: 'melee', damage: 22, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 90, strikes: 1, effects: [], props: [] }],
        abilities: [], passives: [], look: { body: 'form', armor: 'plate', weapon: 'sword_shield', helm: 'open', cape: 'long', shield: 'kite', element: null, size: 'medium', tint: null, glow: null } };
      unit.hp = unit.maxHp = unit.custom.hp;
    }
    unit.formId = player.formId;
    return unit;
  }
  function startingRoster(game, player) {
    const units = Data().units || {};
    const out = [];
    const culture = Data().has('cultures', player.cultureId) ? Data().get('cultures', player.cultureId) : null;
    const roster = culture ? (culture.units || []).filter(id => units[id] && units[id].tier === 1 && units[id].role !== 'hero') : [];
    if (roster.length) {
      const order = ['shield', 'pike', 'polearm', 'fighter', 'shock', 'support', 'mage', 'cavalry', 'ranged', 'skirmisher'];
      const sorted = roster.slice().sort((a, b) => order.indexOf(units[a].role) - order.indexOf(units[b].role));
      for (let i = 0; i < 3; i++) out.push(sorted[i % sorted.length]);
      const scout = roster.find(id => units[id].role === 'skirmisher') || roster.find(id => units[id].role === 'ranged');
      if (scout) out.push(scout);
    } else {
      const any = Object.values(units).filter(u => u.tier === 1 && u.role !== 'hero');
      for (let i = 0; i < Math.min(2, any.length); i++) out.push(any[i].id);
    }
    return out;
  }

  // ------------------------------------------------------------------ ids & entities
  State.newId = function (game, kind) {
    if (game.nextId[kind] === undefined) game.nextId[kind] = 1;
    return game.nextId[kind]++;
  };

  /** Resolve the unit type definition: Data.units[typeId] → unit.custom → generic fallback. */
  State.unitType = function (unit) {
    if (unit && Data().units && Data().units[unit.typeId]) return Data().units[unit.typeId];
    if (unit && unit.custom) return unit.custom;
    return State.FALLBACK_UNIT;
  };
  State.FALLBACK_UNIT = { id: 'placeholder', name: { ko: '민병대', en: 'Militia' }, tier: 1, role: 'fighter', tags: ['infantry'], move: 'walk', mp: 32, hp: 50, def: 1, res: 1,
    attacks: [{ id: 'strike', name: { ko: '타격', en: 'Strike' }, type: 'melee', damage: 12, channel: 'physical', range: 1, ap: 1, repeat: 1, accuracy: 90, strikes: 1, effects: [], props: [] }],
    abilities: [], passives: [], look: { body: 'form', armor: 'leather', weapon: 'spear', helm: 'cap', cape: false, shield: 'none', element: null, size: 'medium', tint: null, glow: null } };

  State.createUnit = function (game, typeId, pid, armyId) {
    const id = State.newId(game, 'unit');
    const unit = { id, typeId, owner: pid, armyId: armyId === undefined ? null : armyId, hp: 0, maxHp: 0, xp: 0, rank: 0, statuses: [], enchantments: [], heroId: null, name: null, formId: null, transformations: [] };
    const type = State.unitType(unit);
    unit.hp = unit.maxHp = type.hp || 50;
    if (pid >= 0 && game.players[pid]) unit.formId = game.players[pid].formId;
    game.units.push(unit); indexNew(game, 'units', unit);
    if (armyId !== null && armyId !== undefined && armyId >= 0) {
      const army = State.army(game, armyId);
      if (army && !army.units.includes(id)) army.units.push(id);
    }
    return unit;
  };

  State.createArmy = function (game, pid, hexIdx, unitIds) {
    const id = State.newId(game, 'army');
    const army = { id, owner: pid, hex: hexIdx, units: [], mp: 0, path: null };
    game.armies.push(army); indexNew(game, 'armies', army);
    for (const uid of unitIds || []) State.addUnitToArmy(game, uid, id);
    army.mp = State.armyMaxMp(game, army);
    return army;
  };
  State.armyMaxMp = function (game, army) {
    let mp = Infinity;
    for (const uid of army.units) { const u = State.unit(game, uid); if (u) mp = Math.min(mp, State.unitType(u).mp || 32); }
    return isFinite(mp) ? mp : 32;
  };
  State.addUnitToArmy = function (game, unitId, armyId) {
    const unit = State.unit(game, unitId), army = State.army(game, armyId);
    if (!unit || !army) return false;
    if (unit.armyId !== null && unit.armyId !== armyId) {
      const old = State.army(game, unit.armyId);
      if (old) { const i = old.units.indexOf(unitId); if (i >= 0) old.units.splice(i, 1); }
    }
    unit.armyId = armyId;
    if (!army.units.includes(unitId)) army.units.push(unitId);
    return true;
  };

  State.createHero = function (game, opts) {
    const id = State.newId(game, 'hero');
    const hero = { id, unitId: opts.unitId, owner: opts.owner, name: opts.name || 'Hero', classId: opts.classId || 'warrior', level: 1, xp: 0, skillPoints: 0, skills: [],
      items: { weapon: null, offhand: null, armor: null, helm: null, trinket: null, mount: null }, isRuler: !!opts.isRuler, rulerType: opts.rulerType || null, dead: false, respawnTurns: 0 };
    game.heroes.push(hero); indexNew(game, 'heroes', hero);
    const unit = State.unit(game, opts.unitId);
    if (unit) { unit.heroId = id; if (!unit.name) unit.name = hero.name; }
    return hero;
  };

  State.createStructure = function (game, fields) {
    const id = game.structures.length;
    game.nextId.structure = id + 1;
    const s = Object.assign({ id, kind: 'node', hex: -1, owner: -1, refId: null, cleared: true, guardArmyId: -1 }, fields, { id });
    game.structures.push(s);
    if (s.hex >= 0) game.structure[s.hex] = id;
    return s;
  };

  /**
   * Found a city (or outpost tier 0, or free city when opts.freeCity is given) at hexIdx for player pid (-1 = neutral).
   * Claims the home province unless it already belongs to a city.
   */
  State.createCity = function (game, pid, hexIdx, opts) {
    opts = opts || {};
    const id = State.newId(game, 'city');
    const tier = opts.tier === undefined ? 1 : opts.tier;
    const city = { id, name: opts.name || ('City ' + id), owner: pid, hex: hexIdx, tier, pop: opts.pop === undefined ? 1 : opts.pop, growth: 0, provinces: [], buildings: [], queue: [],
      stability: 50, enchantments: [], isCapital: !!opts.isCapital, founded: game.turn, walls: opts.walls || 0, garrisonArmyId: -1, freeCity: opts.freeCity || null };
    game.cities.push(city); indexNew(game, 'cities', city);
    const kind = city.freeCity ? 'free_city' : (tier === 0 ? 'outpost' : 'city');
    State.createStructure(game, { kind, hex: hexIdx, owner: pid, refId: id, cleared: true, guardArmyId: -1 });
    const pidx = game.province[hexIdx];
    const prov = pidx >= 0 ? game.provinces[pidx] : null;
    if (prov && prov.cityId < 0) {
      prov.cityId = id; prov.owner = pid; prov.annexTurn = game.turn;
      city.provinces.push(prov.id);
      if (pid >= 0) for (const h of prov.hexes) game.owner[h] = pid;
    }
    return city;
  };

  // ------------------------------------------------------------------ removal
  State.removeUnit = function (game, unitId) {
    const unit = State.unit(game, unitId);
    if (!unit) return false;
    if (unit.armyId !== null && unit.armyId >= 0) {
      const army = State.army(game, unit.armyId);
      if (army) {
        const i = army.units.indexOf(unitId);
        if (i >= 0) army.units.splice(i, 1);
        if (!army.units.length) State.removeArmy(game, army.id);
      }
    }
    if (unit.heroId !== null && unit.heroId >= 0) {
      const hero = State.hero(game, unit.heroId);
      if (hero) { hero.dead = true; hero.unitId = -1; }
    }
    const pos = game.units.indexOf(unit);
    if (pos >= 0) game.units.splice(pos, 1);
    return true;
  };
  /** Removes an army and all of its units. Clears structure guard / city garrison references. */
  State.removeArmy = function (game, armyId) {
    const army = State.army(game, armyId);
    if (!army) return false;
    for (const uid of army.units.slice()) {
      const u = State.unit(game, uid);
      if (!u) continue;
      u.armyId = null;
      if (u.heroId !== null && u.heroId >= 0) { const h = State.hero(game, u.heroId); if (h) { h.dead = true; h.unitId = -1; } }
      const p = game.units.indexOf(u); if (p >= 0) game.units.splice(p, 1);
    }
    army.units.length = 0;
    const pos = game.armies.indexOf(army);
    if (pos >= 0) game.armies.splice(pos, 1);
    for (const s of game.structures) if (s.guardArmyId === armyId) s.guardArmyId = -1;
    for (const c of game.cities) if (c.garrisonArmyId === armyId) c.garrisonArmyId = -1;
    return true;
  };
  /** Structures keep their index; removal leaves a tombstone so game.structure indices stay valid. */
  State.removeStructure = function (game, structureId) {
    const s = game.structures[structureId];
    if (!s || s.kind === 'removed') return false;
    if (s.hex >= 0 && game.structure[s.hex] === structureId) game.structure[s.hex] = -1;
    if (s.guardArmyId >= 0) State.removeArmy(game, s.guardArmyId);
    game.structures[structureId] = { id: structureId, kind: 'removed', hex: -1, owner: -1, refId: null, cleared: true, guardArmyId: -1 };
    return true;
  };

  // ------------------------------------------------------------------ accessors
  State.player = (game, pid) => game.players[pid] || null;
  State.unit = (game, id) => lookup(game, 'units', id);
  State.hero = (game, id) => lookup(game, 'heroes', id);
  State.army = (game, id) => lookup(game, 'armies', id);
  State.city = (game, id) => lookup(game, 'cities', id);
  State.structure = (game, id) => (id >= 0 && game.structures[id] && game.structures[id].kind !== 'removed') ? game.structures[id] : null;
  State.heroOfUnit = function (game, unitId) { const u = State.unit(game, unitId); return u && u.heroId !== null ? State.hero(game, u.heroId) : null; };

  State.cityAt = function (game, idx) {
    const sid = game.structure[idx];
    if (sid < 0) return null;
    const s = game.structures[sid];
    if (!s || (s.kind !== 'city' && s.kind !== 'free_city' && s.kind !== 'outpost')) return null;
    return State.city(game, s.refId);
  };
  State.structureAt = function (game, idx) { const sid = game.structure[idx]; return sid >= 0 ? State.structure(game, sid) : null; };
  State.armiesAt = function (game, idx) { const out = []; for (const a of game.armies) if (a.hex === idx) out.push(a); return out; };
  State.unitsOf = function (game, armyId) {
    const army = typeof armyId === 'object' ? armyId : State.army(game, armyId);
    if (!army) return [];
    const out = [];
    for (const uid of army.units) { const u = State.unit(game, uid); if (u) out.push(u); }
    return out;
  };
  State.playerCities = (game, pid) => game.cities.filter(c => c.owner === pid);
  State.playerArmies = (game, pid) => game.armies.filter(a => a.owner === pid);
  State.allUnitsOfPlayer = (game, pid) => game.units.filter(u => u.owner === pid);
  State.playerHeroes = (game, pid) => game.heroes.filter(h => h.owner === pid);
  State.capital = function (game, pid) { const p = game.players[pid]; return p ? State.city(game, p.capitalId) : null; };

  State.provinceOf = function (game, idx) { const p = game.province[idx]; return p >= 0 ? game.provinces[p] : null; };
  State.terrainName = (game, idx) => State.TERRAINS[game.terrain[idx]];
  State.featureName = (game, idx) => State.FEATURES[game.feature[idx]];
  State.isWater = (game, idx) => game.terrain[idx] <= State.WATER_MAX;
  State.isLand = (game, idx) => game.terrain[idx] > State.WATER_MAX;
  State.landmassAt = (game, idx) => game.terrain[idx] > State.WATER_MAX ? 1 : 0;
  State.terrainDef = function (game, idx) { const n = State.TERRAINS[game.terrain[idx]]; return Data().has('terrains', n) ? Data().get('terrains', n) : null; };
  State.featureDef = function (game, idx) { const n = State.FEATURES[game.feature[idx]]; return Data().has('features', n) ? Data().get('features', n) : null; };
  State.hexInfo = function (game, idx) {
    return { idx, col: idx % game.W, row: Math.floor(idx / game.W), terrain: State.TERRAINS[game.terrain[idx]], feature: State.FEATURES[game.feature[idx]],
      t: game.terrain[idx], f: game.feature[idx], height: game.height[idx], river: game.river[idx], road: game.road[idx], province: game.province[idx], owner: game.owner[idx], structure: game.structure[idx] };
  };
  State.hexIdx = (game, col, row) => row * game.W + col;
  State.inBounds = (game, col, row) => col >= 0 && row >= 0 && col < game.W && row < game.H;
  State.neighbors = (game, idx) => Hex().neighborsIdx(idx, game.W, game.H);
  State.dirTo = function (game, a, b) { for (let d = 0; d < 6; d++) if (Hex().neighborIdx(a, d, game.W, game.H) === b) return d; return -1; };
  State.edgeHasRiver = function (game, a, b) { const d = State.dirTo(game, a, b); return d >= 0 && (game.river[a] & (1 << d)) !== 0; };
  State.edgeHasRoad = function (game, a, b) { const d = State.dirTo(game, a, b); return d >= 0 && (game.road[a] & (1 << d)) !== 0; };
  State.latitude = function (game, idx) { const row = Math.floor(idx / game.W); const half = (game.H - 1) / 2; return Math.abs(row - half) / half; };
  /** terrain + feature move cost for a movement class; Infinity when impassable. */
  State.hexMoveCost = function (game, idx, moveClass) {
    moveClass = moveClass || 'walk';
    const t = State.terrainDef(game, idx), f = State.featureDef(game, idx);
    const tc = t ? t.moveCost[moveClass] : (State.isWater(game, idx) ? (moveClass === 'walk' || moveClass === 'mounted' ? Infinity : 4) : 4);
    const fc = f ? (f.moveCost[moveClass] || 0) : 0;
    if (tc === undefined) return Infinity;
    return tc + fc;
  };

  State.reveal = function (game, pid, idx, radius) {
    const ex = game.explored[pid], vis = game.visible[pid];
    if (!ex) return;
    for (const h of Hex().spiralIdx(idx, radius, game.W, game.H)) { ex[h] = 1; if (vis) vis[h] = 1; }
  };

  // ------------------------------------------------------------------ rng
  State.rng = function (game) {
    if (!game._maps) attachInternals(game);
    if (!game._rng) { game._rng = new AOW.RNG(game.seed); if (game.rngState) game._rng.setState(game.rngState); }
    return game._rng;
  };

  // ------------------------------------------------------------------ names
  const SYL_A = ['Ar', 'Bel', 'Cal', 'Dor', 'El', 'Fen', 'Gal', 'Hal', 'Ir', 'Kar', 'Lor', 'Mor', 'Nar', 'Or', 'Per', 'Ran', 'Sil', 'Tor', 'Ul', 'Val', 'Wen', 'Yl', 'Zar'];
  const SYL_B = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'io', 'ou'];
  const SYL_C = ['dun', 'gard', 'heim', 'holm', 'mere', 'moor', 'stead', 'thorn', 'vale', 'wick', 'ford', 'burg', 'haven', 'reach', 'fell', 'watch', 'crest', 'march'];
  const SYL_KO = ['아르', '벨', '칼', '도르', '엘', '펜', '갈', '할', '이르', '카르', '로르', '모르', '나르', '오르', '페르', '란', '실', '토르', '울', '발', '웬', '일', '자르'];
  const SYL_KO_END = ['둔', '가르드', '하임', '홀름', '미어', '무어', '스테드', '손', '베일', '윅', '포드', '부르그', '헤이븐', '리치', '펠', '워치', '크레스트', '마치'];
  State.generateName = function (rng, kind) {
    const a = rng.int(0, SYL_A.length - 1), c = rng.int(0, SYL_C.length - 1);
    const mid = rng.chance(0.4) ? rng.pick(SYL_B) : '';
    if (kind === 'ruler') return SYL_A[a] + rng.pick(SYL_B) + rng.pick(['n', 'th', 'r', 'l', 'd', 'wyn', 'ric', 'mir']);
    return SYL_A[a] + mid + SYL_C[c];
  };
  State.cityName = function (game, playerOrCulture, rng) {
    const cultureId = typeof playerOrCulture === 'string' ? playerOrCulture : (playerOrCulture && playerOrCulture.cultureId);
    rng = rng || State.rng(game);
    const used = new Set(game.cities.map(c => c.name));
    const listId = 'city_names_' + cultureId;
    const entry = Data().has('names', listId) ? Data().get('names', listId) : (Data().has('names', 'city_names') ? Data().get('names', 'city_names') : null);
    if (entry && entry.list && entry.list.length) {
      const free = entry.list.filter(n => !used.has(typeof n === 'string' ? n : AOW.L(n)));
      if (free.length) { const n = rng.pick(free); return typeof n === 'string' ? n : AOW.L(n); }
    }
    for (let i = 0; i < 50; i++) { const n = State.generateName(rng, 'city'); if (!used.has(n)) return n; }
    return State.generateName(rng, 'city') + ' ' + game.cities.length;
  };
  State.rulerName = function (rng, cultureId) {
    const listId = 'ruler_names_' + cultureId;
    const entry = Data().has('names', listId) ? Data().get('names', listId) : (Data().has('names', 'ruler_names') ? Data().get('names', 'ruler_names') : null);
    if (entry && entry.list && entry.list.length) { const n = rng.pick(entry.list); return typeof n === 'string' ? n : AOW.L(n); }
    return State.generateName(rng, 'ruler');
  };

  // ------------------------------------------------------------------ serialization
  const TA_NAMES = { Uint8Array: 'u8', Int8Array: 'i8', Int16Array: 'i16', Uint16Array: 'u16', Int32Array: 'i32', Float32Array: 'f32', Float64Array: 'f64' };
  const TA_CTORS = { u8: Uint8Array, i8: Int8Array, i16: Int16Array, u16: Uint16Array, i32: Int32Array, f32: Float32Array, f64: Float64Array };
  function bytesToB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    const s = atob(b64), out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function encodeTA(ta) {
    const tag = TA_NAMES[ta.constructor.name];
    const bpe = ta.BYTES_PER_ELEMENT;
    const bytes = new Uint8Array(ta.length * bpe);
    if (bpe === 1) bytes.set(ta);
    else {
      const dv = new DataView(bytes.buffer);
      for (let i = 0; i < ta.length; i++) {
        if (tag === 'i16') dv.setInt16(i * 2, ta[i], true); else if (tag === 'u16') dv.setUint16(i * 2, ta[i], true);
        else if (tag === 'i32') dv.setInt32(i * 4, ta[i], true); else if (tag === 'f32') dv.setFloat32(i * 4, ta[i], true); else dv.setFloat64(i * 8, ta[i], true);
      }
    }
    return { $ta: tag, n: ta.length, d: bytesToB64(bytes) };
  }
  function decodeTA(obj) {
    const C = TA_CTORS[obj.$ta];
    const bytes = b64ToBytes(obj.d);
    const out = new C(obj.n);
    if (out.BYTES_PER_ELEMENT === 1) out.set(bytes.subarray(0, obj.n));
    else {
      const dv = new DataView(bytes.buffer);
      for (let i = 0; i < obj.n; i++) {
        if (obj.$ta === 'i16') out[i] = dv.getInt16(i * 2, true); else if (obj.$ta === 'u16') out[i] = dv.getUint16(i * 2, true);
        else if (obj.$ta === 'i32') out[i] = dv.getInt32(i * 4, true); else if (obj.$ta === 'f32') out[i] = dv.getFloat32(i * 4, true); else out[i] = dv.getFloat64(i * 8, true);
      }
    }
    return out;
  }
  State.serialize = function (game) {
    if (game._rng) game.rngState = game._rng.state();
    return JSON.stringify(game, function (key, value) {
      if (value && ArrayBuffer.isView(value) && !(value instanceof DataView)) return encodeTA(value);
      return value;
    });
  };
  State.deserialize = function (str) {
    const game = JSON.parse(str, function (key, value) {
      if (value && typeof value === 'object' && typeof value.$ta === 'string' && typeof value.d === 'string') return decodeTA(value);
      return value;
    });
    attachInternals(game);
    game._rng = new AOW.RNG(game.seed);
    if (game.rngState) game._rng.setState(game.rngState);
    return game;
  };
  State.clone = game => State.deserialize(State.serialize(game));

  AOW.State = State;
})(window.AOW = window.AOW || {});
