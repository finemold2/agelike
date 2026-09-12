// src/data/names.js — city name pools per culture, realm/faction/ruler name pools
//
// Data.define('names', {id:'city_names_<cultureId>', list:[{ko,en},...]}) for the 11 culture ids used across the
// project (src/data/cultures.js — feudal, high, barbarian, industrious, mystic, dark, reaver, primal, oathsworn,
// architect, nomad, per docs/research/cultures_forms_rulers.md §2) plus 'city_names_free' (unaffiliated free cities),
// 'realm_names', 'faction_names' and 'ruler_names'.
(function (AOW) {
  'use strict';
  const Data = AOW.Data;

  // NM builds a full-coverage grid of {ko,en} name pairs from parallel prefix/suffix fragment banks —
  // koPre[i]+sepKo+koSuf[j] / enPre[i]+sepEn+enSuf[j] — so every combination is unique by construction.
  const NM = (koPre, koSuf, enPre, enSuf, sepKo, sepEn) => {
    sepKo = sepKo || ''; sepEn = sepEn || '';
    const list = [];
    for (let i = 0; i < koPre.length; i++) for (let j = 0; j < koSuf.length; j++) list.push({ ko: koPre[i] + sepKo + koSuf[j], en: enPre[i] + sepEn + enSuf[j] });
    return list;
  };

  // ================================================================ city names per culture — >=24 each (5x5=25 or 6x5=30)
  const cultureFrags = {
    // Feudal: knightly Western-medieval market towns and keeps
    feudal: [['아렌', '발도', '로렌', '켄트', '하이든'], ['성', '요새', '마을', '언덕', '나루'], ['Aren', 'Bald', 'Loren', 'Kent', 'Hayden'], ['castle', 'keep', 'ton', 'hill', 'ford']],
    // High: elegant, luminous elvish/starlit names
    high: [['실바', '아엘', '엘론', '루멘', '피렌'], ['테라스', '스피어', '가든', '아이리', '홀'], ['Silva', 'Ael', 'Elon', 'Lumen', 'Firen'], ['terrace', 'spire', 'garden', 'iri', 'hall']],
    // Barbarian: harsh, guttural tribal camps
    barbarian: [['그록', '우르크', '바쉬', '드로그', '카른'], ['캠프', '언덕', '요새', '진', '굴'], ['Grok', 'Urk', 'Bash', 'Drog', 'Karn'], ['camp', 'ridge', 'hold', 'gulch', 'den']],
    // Industrious: dwarven/guild industrial towns
    industrious: [['토른', '가르', '스몰트', '브라스', '코글'], ['공방', '광산', '용광로', '공단', '탑'], ['Thorn', 'Gar', 'Smelt', 'Brass', 'Cog'], ['works', 'mine', 'forge', 'mill', 'spire']],
    // Mystic: ethereal, arcane-touched names
    mystic: [['아스텔', '벨루스', '시엔', '노바', '베일'], ['첨탑', '결계', '서고', '성소', '문'], ['Astel', 'Belus', 'Sien', 'Nova', 'Veil'], ['spire', 'ward', 'archive', 'sanctum', 'gate']],
    // Dark: grim, shadow-touched holds
    dark: [['모른', '드레드', '나이트', '블랙', '그림'], ['도시', '탑', '요람', '구렁', '문'], ['Morn', 'Dread', 'Nyght', 'Blak', 'Grim'], ['spire', 'tower', 'cradle', 'pit', 'gate']],
    // Reaver: piratical, coastal raider ports
    reaver: [['블러드', '솔트', '스컬', '와이드', '리퍼'], ['항구', '만', '선착장', '섬', '초소'], ['Blood', 'Salt', 'Skull', 'Wide', 'Reap'], ['port', 'bay', 'dock', 'isle', 'watch']],
    // Primal: wild tribal beast-kin settlements
    primal: [['우드', '팽', '혼', '클로', '문'], ['둥지', '무리터', '숲터', '늪지', '바위'], ['Wood', 'Fang', 'Horn', 'Claw', 'Moon'], ['nest', 'warren', 'glade', 'mire', 'crag']],
    // Oathsworn: noble knightly-holy order strongholds
    oathsworn: [['세라', '발러', '루멘', '아이언', '골든'], ['맹세성', '수도원', '보루', '성소', '탑'], ['Sera', 'Valor', 'Lumen', 'Iron', 'Golden'], ['oathhold', 'abbey', 'bastion', 'sanctum', 'spire']],
    // Architect: ordered, geometric, precise city-states
    architect: [['오르도', '메리디', '아펙스', '리갈', '카논'], ['설계원', '축', '단지', '광장', '탑'], ['Ordo', 'Meridi', 'Apex', 'Regal', 'Canon'], ['plan', 'axis', 'complex', 'plaza', 'spire']],
    // Nomad: wandering desert caravan camps
    nomad: [['자히르', '카심', '두네', '오아', '라스'], ['천막촌', '오아시스', '대상로', '야영지', '우물'], ['Zahir', 'Qasim', 'Dune', 'Oa', 'Ras'], ['camp', 'oasis', 'trail', 'bivouac', 'well']],
  };
  for (const cultureId in cultureFrags) {
    const [koPre, koSuf, enPre, enSuf] = cultureFrags[cultureId];
    Data.define('names', { id: 'city_names_' + cultureId, list: NM(koPre, koSuf, enPre, enSuf) });
  }

  // city_names_free — unaffiliated free cities, 40 (5x8) neutral mixed-flavor names
  Data.define('names', {
    id: 'city_names_free',
    list: NM(['프리', '하벤', '밀', '스톤', '리버'], ['홀드', '마켓', '워치', '크로싱', '게이트', '리치', '데일', '포드'],
      ['Free', 'Haven', 'Mill', 'Stone', 'River'], ['hold', 'market', 'watch', 'crossing', 'gate', 'reach', 'dale', 'ford']),
  });

  // ================================================================ realm names — 30 (5x6)
  Data.define('names', {
    id: 'realm_names',
    list: NM(['아우로', '테네', '벨라', '드라코', '엘드'], ['리아', '스카르', '메어', '노어', '문드', '아스'],
      ['Auro', 'Tene', 'Bela', 'Drako', 'Eld'], ['ria', 'scar', 'mere', 'nor', 'mund', 'as']),
  });

  // ================================================================ faction / dynasty names — 40 (5x8)
  Data.define('names', {
    id: 'faction_names',
    list: NM(['하우스', '클랜', '결사', '군단', '동맹'], ['오브 실버스타', '오브 아이언크라운', '오브 블랙손', '오브 골든베일', '오브 스톰가드', '오브 문웨이크', '오브 레드애쉬', '오브 화이트헐름'],
      ['House', 'Clan', 'Order', 'Legion', 'League'], ['of Silverstar', 'of Ironcrown', 'of Blackthorn', 'of Goldenvale', 'of Stormguard', 'of Moonwake', 'of Redash', 'of Whitehelm'], ' ', ' '),
  });

  // ================================================================ ruler names — 40 (5x8), given name pool for AI/human rulers
  Data.define('names', {
    id: 'ruler_names',
    list: NM(['알라', '이졸', '카데', '브리', '테오'], ['릭', '다르', '윈', '모어', '셀린', '고른', '리안', '아스터'],
      ['Alar', 'Isol', 'Kade', 'Bri', 'Theo'], ['ric', 'dar', 'wyn', 'more', 'selin', 'gorn', 'rian', 'aster']),
  });

  AOW.log && AOW.log('names.js: culture/free/realm/faction/ruler name pools loaded');
})(window.AOW = window.AOW || {});
