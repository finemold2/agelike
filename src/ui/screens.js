// src/ui/screens.js — in-game screens: city, research, spellbook, hero, empire, diplomacy, victory, encyclopedia, cities
//
// Every screen renders from AOW.game through Rules/Diplomacy queries and mutates only through Rules/Diplomacy
// functions, then calls UI.refresh(). All engine calls are defensive (`fn('Rules','x')` returns the function or null)
// so the screens never throw while rules.js / diplomacy.js / ui.js are still stubs; where a query is missing a small
// read-only fallback derived from Data keeps the screen informative.
//
// Additive helpers exposed as AOW.Screens (documented per SPEC §0):
//   Screens.registerAll()                      re-attempts UI.registerScreen for screens defined before ui.js was ready
//   Screens.effectsText(effects) → string      "식량 +10, 안정도 +5" style summary of a §3.1 effects object
//   Screens.effectsList(effects) → Node        the same as a <ul>-like element (used in tooltips)
//   Screens.unitPortrait(typeOrUnit, size, o) → <img>|<canvas>   cached UnitArt.portrait with role-icon fallback
//   Screens.tierName(tier) → string            city tier label (0 outpost … 5 metropolis)
//   Screens.showProposal(proposal)             opens the accept/decline modal used for 'diplomacy:proposal'
//                                              (one at a time — further proposals queue behind it)
//   Screens.clearProposals()                   drops the queue (called on 'game:new')
// Engine functions this file calls when present (all optional): Rules.cityYields, Rules.cityYieldBreakdown,
//   Rules.stabilityBreakdown, Rules.growthNeeded, Rules.renameCity, Rules.buildableBuildings, Rules.recruitableUnits,
//   Rules.canRecruit, Rules.enqueue, Rules.dequeue, Rules.moveQueueItem, Rules.queueItemCost, Rules.annexableProvinces,
//   Rules.annexCost, Rules.annexProvince, Rules.buildableImprovements, Rules.buildImprovement, Rules.dispel,
//   Rules.availableTomes, Rules.tomeLockReason, Rules.selectTome, Rules.researchOptions, Rules.startResearch,
//   Rules.playerIncome, Rules.canCast, Rules.castSpell, Rules.heroStats, Rules.unitStats, Rules.heroAvailableSkills,
//   Rules.heroLevelUp, Rules.heroXpToNext, Rules.equipItem, Rules.unequipItem, Rules.buyEmpireSkill,
//   Rules.unlockEmpireSkill, Rules.C; Diplomacy.summary, Diplomacy.propose, Diplomacy.declareWar, Diplomacy.resolve,
//   Diplomacy.warScore; WorldRender.centerOn; SFX.play.
(function (AOW) {
  'use strict';
  const Screens = {};
  AOW.Screens = Screens;

  // ================================================================ i18n
  AOW.I18n.add({
    ko: {
      'sc.close': '닫기', 'sc.noGame': '진행 중인 게임이 없습니다.', 'sc.notFound': '대상을 찾을 수 없습니다.', 'sc.turns': '{n}턴', 'sc.turn': '턴',
      'sc.none': '없음', 'sc.unavailable': '이 기능은 아직 준비되지 않았습니다.', 'sc.locked': '잠김', 'sc.owned': '보유', 'sc.free': '무료',
      'sc.cost': '비용', 'sc.upkeep': '유지비', 'sc.effects': '효과', 'sc.prereq': '선행 조건', 'sc.requires': '필요', 'sc.tier': '등급',
      'sc.search': '검색…', 'sc.ok': '확인', 'sc.cancel': '취소', 'sc.yes': '예', 'sc.no': '아니오', 'sc.level': '레벨', 'sc.xp': '경험치',
      'sc.perTurn': '/턴', 'sc.total': '합계', 'sc.base': '기본', 'sc.pop': '인구', 'sc.reason': '사유', 'sc.done': '완료', 'sc.viewOnMap': '지도에서 보기',
      // city
      'city.title': '도시', 'city.rename': '이름 바꾸기 (클릭)', 'city.owner': '소유', 'city.capital': '왕도', 'city.freeCity': '자유 도시', 'city.growth': '성장',
      'city.stability': '안정도', 'city.stabilityTip': '안정도가 높을수록 수입이 늘고, 낮으면 반란 위험이 생깁니다.',
      'city.tier.0': '전초기지', 'city.tier.1': '촌락', 'city.tier.2': '마을', 'city.tier.3': '도시', 'city.tier.4': '대도시', 'city.tier.5': '수도급 대도시',
      'city.queue': '생산 대기열', 'city.queueEmpty': '대기열이 비어 있습니다. 건설 또는 모집 탭에서 항목을 추가하세요.', 'city.current': '현재 생산',
      'city.remove': '제거', 'city.up': '위로', 'city.down': '아래로', 'city.progress': '진행',
      'city.tab.build': '건설', 'city.tab.recruit': '모집', 'city.tab.provinces': '지방', 'city.tab.garrison': '주둔군', 'city.tab.magic': '마법',
      'city.noBuildings': '지을 수 있는 건물이 없습니다.', 'city.noUnits': '모집할 수 있는 유닛이 없습니다.', 'city.build': '건설', 'city.recruit': '모집',
      'city.queued': '대기 중', 'city.built': '건설됨', 'city.cat.economy': '경제', 'city.cat.military': '군사', 'city.cat.defense': '방어', 'city.cat.stability': '안정',
      'city.cat.growth': '성장', 'city.cat.special': '특수', 'city.cat.culture': '문화',
      'city.ownedProvinces': '보유 지방', 'city.annexable': '병합 가능한 지방', 'city.annex': '병합', 'city.annexCost': '병합 비용', 'city.noAnnex': '병합할 수 있는 인접 지방이 없습니다.',
      'city.improvement': '개선물', 'city.buildImprovement': '개선물 건설…', 'city.noImprovement': '개선물 없음', 'city.resourceNode': '자원', 'city.material': '마법 재료',
      'city.homeProvince': '중심 지방', 'city.garrisonEmpty': '주둔한 유닛이 없습니다.', 'city.enchantEmpty': '적용된 도시 마법이 없습니다.', 'city.dispel': '해제',
      'city.buildings': '건물', 'city.walls': '성벽', 'city.yields': '산출', 'city.cannotAfford': '자원이 부족합니다.', 'city.notOwner': '내 도시가 아닙니다.',
      // research
      'research.title': '연구', 'research.tomes': '마법서 서가', 'research.selected': '선택한 마법서', 'research.options': '연구 가능', 'research.current': '현재 연구',
      'research.none': '진행 중인 연구가 없습니다. 오른쪽 목록에서 연구를 시작하세요.', 'research.start': '시작', 'research.researched': '연구 완료',
      'research.select': '마법서 선택', 'research.selectTip': '이 마법서를 선택하면 친화도가 오르고 내용물을 연구할 수 있습니다.', 'research.knowledge': '지식 수입',
      'research.lock.tier': '{n}권의 마법서를 먼저 선택해야 합니다.', 'research.lock.affinity': '{aff} 친화 {n} 필요', 'research.lock.expansion': '확장팩 콘텐츠',
      'research.lock.generic': '아직 선택할 수 없습니다.', 'research.tierRow': '{n}단계', 'research.contents': '내용물', 'research.type.spell': '주문', 'research.type.unit': '유닛',
      'research.type.improvement': '개선물', 'research.type.skill': '영웅 기술', 'research.type.transformation': '변이', 'research.type.empire': '제국 기술', 'research.type.building': '건물',
      'research.passive': '마법서 효과', 'research.affinity': '친화', 'research.noOptions': '선택한 마법서의 연구를 모두 마쳤습니다. 새 마법서를 선택하세요.',
      'research.selectedTome': '연구 중인 마법서', 'research.pickTome': '왼쪽 서가에서 마법서를 고르세요.',
      // spellbook
      'spell.title': '주문서', 'spell.known': '알고 있는 주문', 'spell.active': '유지 중인 마법', 'spell.cast': '시전', 'spell.dispel': '해제', 'spell.noneKnown': '아는 주문이 없습니다. 연구로 주문을 배우세요.',
      'spell.noneActive': '유지 중인 마법이 없습니다.', 'spell.kind.combat': '전투 주문', 'spell.kind.world': '세계 주문', 'spell.kind.unit_enchant': '유닛 인챈트', 'spell.kind.city_enchant': '도시 인챈트',
      'spell.kind.summon': '소환', 'spell.kind.transform': '지형 변화', 'spell.kind.empire': '제국 주문', 'spell.kind.strategic': '전략 주문', 'spell.cp': '시전 점수', 'spell.target': '대상',
      'spell.castMode': '{name} — 지도에서 대상을 선택하세요.', 'spell.combatOnly': '전투 중에만 시전할 수 있습니다.', 'spell.casting': '시전 점수 {cp}/{max}',
      'spell.target.unit': '유닛', 'spell.target.army': '군세', 'spell.target.city': '도시', 'spell.target.province': '지방', 'spell.target.hex': '칸', 'spell.target.enemy_unit': '적 유닛',
      'spell.target.ally_unit': '아군 유닛', 'spell.target.empire': '제국', 'spell.target.player': '세력', 'spell.target.all_enemies': '모든 적', 'spell.target.all_allies': '모든 아군', 'spell.tier': '{n}단계',
      // hero
      'hero.title': '영웅', 'hero.none': '영웅이 없습니다.', 'hero.skills': '기술', 'hero.skillPoints': '기술 점수', 'hero.learn': '배우기', 'hero.learned': '습득', 'hero.equipment': '장비',
      'hero.inventory': '보관함', 'hero.inventoryEmpty': '보관 중인 아이템이 없습니다.', 'hero.equip': '장착', 'hero.unequip': '해제', 'hero.ruler': '군주', 'hero.dead': '전사',
      'hero.slot.weapon': '무기', 'hero.slot.offhand': '보조', 'hero.slot.armor': '갑옷', 'hero.slot.helm': '투구', 'hero.slot.trinket': '장신구', 'hero.slot.mount': '탈것',
      'hero.signature': '전용 기술', 'hero.tier': '{n}단계', 'hero.minLevel': '레벨 {n} 필요', 'hero.needPrereq': '선행 기술 필요', 'hero.noPoints': '기술 점수가 없습니다',
      'hero.stats': '능력치', 'hero.general': '일반 기술', 'hero.class': '직업', 'hero.grants': '능력 부여', 'hero.needTome': '{name:을/를} 먼저 선택해야 합니다',
      'rarity.common': '일반', 'rarity.uncommon': '고급', 'rarity.rare': '희귀', 'rarity.epic': '영웅', 'rarity.legendary': '전설',
      // empire
      'empire.title': '제국 개발', 'empire.affinity': '친화도', 'empire.tree.general': '일반', 'empire.buy': '구매', 'empire.rite': '의식', 'empire.affinityReq': '{aff} 친화 {n} 필요',
      'empire.noBuy': '제국 기술 구매 규칙이 아직 없습니다.', 'empire.imperium': '임페리움', 'empire.owned': '보유한 기술', 'empire.needPrereq': '선행 기술 필요',
      // diplomacy
      'dip.title': '외교', 'dip.state.peace': '평화', 'dip.state.war': '전쟁', 'dip.state.alliance': '동맹', 'dip.state.defensive_pact': '방어 동맹', 'dip.state.non_aggression': '불가침',
      'dip.opinion': '호감도', 'dip.treaties': '조약', 'dip.warScore': '전쟁 점수', 'dip.propose.peace': '평화 제안', 'dip.propose.non_aggression': '불가침', 'dip.propose.defensive_pact': '방어 동맹',
      'dip.propose.alliance': '동맹', 'dip.declareWar': '선전포고', 'dip.gift': '선물', 'dip.trade': '교역', 'dip.confirmWar': '{name}에게 선전포고하시겠습니까?',
      'dip.accepted': '{name:이/가} 제안을 받아들였습니다.', 'dip.rejected': '{name:이/가} 제안을 거절했습니다.', 'dip.sent': '제안을 보냈습니다.', 'dip.noOthers': '다른 세력이 없습니다.',
      'dip.giftAmount': '선물할 금', 'dip.give': '주는 것', 'dip.receive': '받는 것', 'dip.terms': '조건', 'dip.incoming': '{name}의 제안', 'dip.accept': '수락', 'dip.decline': '거절',
      'dip.grievances': '불만', 'dip.truce': '휴전 {n}턴', 'dip.dead': '멸망', 'dip.ruler': '군주', 'dip.personality.expansionist': '확장주의', 'dip.personality.militarist': '군국주의',
      'dip.personality.scholar': '학자', 'dip.personality.diplomat': '외교관', 'dip.turns': '{n}턴', 'dip.kind.gift': '선물', 'dip.kind.trade': '교역', 'dip.kind.peace': '평화',
      'dip.kind.non_aggression': '불가침 조약', 'dip.kind.defensive_pact': '방어 동맹', 'dip.kind.alliance': '동맹', 'dip.kind.war': '선전포고', 'dip.breakdown': '호감도 내역', 'dip.failed': '제안할 수 없습니다.',
      // victory
      'vic.victory': '승리', 'vic.defeat': '패배', 'vic.type.expansion': '확장 승리', 'vic.type.magic': '마법 승리', 'vic.type.military': '군사 승리', 'vic.type.score': '점수 승리',
      'vic.type.elimination': '정복 승리', 'vic.winner': '승자', 'vic.continue': '계속하기', 'vic.menu': '메인 메뉴', 'vic.stats': '통계', 'vic.turns': '턴', 'vic.cities': '도시', 'vic.units': '유닛',
      'vic.territory': '영토', 'vic.score': '점수', 'vic.player': '세력', 'vic.subtitle.win': '{name}의 시대가 열렸습니다.', 'vic.subtitle.lose': '{name:이/가} 이 세계의 주인이 되었습니다.',
      // encyclopedia
      'enc.title': '백과사전', 'enc.cat.cultures': '문화', 'enc.cat.forms': '종족', 'enc.cat.units': '유닛', 'enc.cat.tomes': '마법서', 'enc.cat.spells': '주문', 'enc.cat.buildings': '건물',
      'enc.cat.heroClasses': '영웅 직업', 'enc.cat.improvements': '개선물', 'enc.cat.wonders': '고대 유적', 'enc.cat.items': '아이템', 'enc.cat.abilities': '능력', 'enc.cat.statuses': '상태 효과',
      'enc.cat.empireSkills': '제국 기술', 'enc.cat.traits': '특성', 'enc.cat.rulerTypes': '군주 유형', 'enc.pick': '왼쪽에서 항목을 선택하세요.', 'enc.count': '{n}개', 'enc.attacks': '공격', 'enc.abilities': '능력',
      'enc.passives': '지속 효과', 'enc.tags': '태그', 'enc.move': '이동', 'enc.source': '출처', 'enc.units': '유닛', 'enc.subChoices': '하위 선택', 'enc.traits': '특성', 'enc.roster': '유닛 로스터',
      'enc.guard': '수호자', 'enc.rewards': '보상', 'enc.kind': '종류', 'enc.duration': '지속', 'enc.range': '사거리', 'enc.ap': '행동력', 'enc.cooldown': '재사용', 'enc.signature': '전용 기술',
      // cities
      'cities.title': '도시 목록', 'cities.goto': '이동', 'cities.open': '열기', 'cities.production': '생산', 'cities.idle': '유휴', 'cities.none': '도시가 없습니다.',
      // shared resource labels missing from the base vocabulary (production/draft/stability, used in yield/upkeep tooltips)
      'resource.production': '생산력', 'resource.draft': '징집력', 'resource.stability': '안정도',
    },
    en: {
      'sc.close': 'Close', 'sc.noGame': 'No game in progress.', 'sc.notFound': 'Target not found.', 'sc.turns': '{n} turns', 'sc.turn': 'turn',
      'sc.none': 'None', 'sc.unavailable': 'This feature is not available yet.', 'sc.locked': 'Locked', 'sc.owned': 'Owned', 'sc.free': 'Free',
      'sc.cost': 'Cost', 'sc.upkeep': 'Upkeep', 'sc.effects': 'Effects', 'sc.prereq': 'Requires', 'sc.requires': 'Requires', 'sc.tier': 'Tier',
      'sc.search': 'Search…', 'sc.ok': 'OK', 'sc.cancel': 'Cancel', 'sc.yes': 'Yes', 'sc.no': 'No', 'sc.level': 'Level', 'sc.xp': 'XP',
      'sc.perTurn': '/turn', 'sc.total': 'Total', 'sc.base': 'Base', 'sc.pop': 'Population', 'sc.reason': 'Reason', 'sc.done': 'Done', 'sc.viewOnMap': 'View on map',
      'city.title': 'City', 'city.rename': 'Rename (click)', 'city.owner': 'Owner', 'city.capital': 'Throne City', 'city.freeCity': 'Free City', 'city.growth': 'Growth',
      'city.stability': 'Stability', 'city.stabilityTip': 'High stability boosts income; low stability risks unrest.',
      'city.tier.0': 'Outpost', 'city.tier.1': 'Hamlet', 'city.tier.2': 'Village', 'city.tier.3': 'Town', 'city.tier.4': 'City', 'city.tier.5': 'Metropolis',
      'city.queue': 'Production Queue', 'city.queueEmpty': 'The queue is empty. Add items from the Build or Recruit tabs.', 'city.current': 'Producing',
      'city.remove': 'Remove', 'city.up': 'Move up', 'city.down': 'Move down', 'city.progress': 'Progress',
      'city.tab.build': 'Build', 'city.tab.recruit': 'Recruit', 'city.tab.provinces': 'Provinces', 'city.tab.garrison': 'Garrison', 'city.tab.magic': 'Magic',
      'city.noBuildings': 'Nothing can be built right now.', 'city.noUnits': 'No units can be recruited.', 'city.build': 'Build', 'city.recruit': 'Recruit',
      'city.queued': 'Queued', 'city.built': 'Built', 'city.cat.economy': 'Economy', 'city.cat.military': 'Military', 'city.cat.defense': 'Defense', 'city.cat.stability': 'Stability',
      'city.cat.growth': 'Growth', 'city.cat.special': 'Special', 'city.cat.culture': 'Culture',
      'city.ownedProvinces': 'Owned Provinces', 'city.annexable': 'Annexable Provinces', 'city.annex': 'Annex', 'city.annexCost': 'Annex cost', 'city.noAnnex': 'No adjacent province can be annexed.',
      'city.improvement': 'Improvement', 'city.buildImprovement': 'Build improvement…', 'city.noImprovement': 'No improvement', 'city.resourceNode': 'Resource', 'city.material': 'Magic material',
      'city.homeProvince': 'Home province', 'city.garrisonEmpty': 'No units garrisoned.', 'city.enchantEmpty': 'No city enchantments active.', 'city.dispel': 'Dispel',
      'city.buildings': 'Buildings', 'city.walls': 'Walls', 'city.yields': 'Yields', 'city.cannotAfford': 'Not enough resources.', 'city.notOwner': 'Not your city.',
      'research.title': 'Research', 'research.tomes': 'Tome Shelf', 'research.selected': 'Selected Tomes', 'research.options': 'Available Research', 'research.current': 'Current Research',
      'research.none': 'No research in progress. Start one from the list on the right.', 'research.start': 'Start', 'research.researched': 'Researched',
      'research.select': 'Select tome', 'research.selectTip': 'Selecting this tome raises your affinity and lets you research its contents.', 'research.knowledge': 'Knowledge income',
      'research.lock.tier': 'Select {n} tomes first.', 'research.lock.affinity': 'Needs {aff} affinity {n}', 'research.lock.expansion': 'Expansion content',
      'research.lock.generic': 'Cannot be selected yet.', 'research.tierRow': 'Tier {n}', 'research.contents': 'Contents', 'research.type.spell': 'Spell', 'research.type.unit': 'Unit',
      'research.type.improvement': 'Improvement', 'research.type.skill': 'Hero skill', 'research.type.transformation': 'Transformation', 'research.type.empire': 'Empire skill', 'research.type.building': 'Building',
      'research.passive': 'Tome passive', 'research.affinity': 'Affinity', 'research.noOptions': 'Everything in the selected tomes is researched. Select a new tome.',
      'research.selectedTome': 'Researching from', 'research.pickTome': 'Pick a tome from the shelf on the left.',
      'spell.title': 'Spellbook', 'spell.known': 'Known Spells', 'spell.active': 'Active Enchantments', 'spell.cast': 'Cast', 'spell.dispel': 'Dispel', 'spell.noneKnown': 'No spells known yet. Research spells to learn them.',
      'spell.noneActive': 'No enchantments active.', 'spell.kind.combat': 'Combat Spells', 'spell.kind.world': 'World Spells', 'spell.kind.unit_enchant': 'Unit Enchantments', 'spell.kind.city_enchant': 'City Enchantments',
      'spell.kind.summon': 'Summons', 'spell.kind.transform': 'Terraforming', 'spell.kind.empire': 'Empire Spells', 'spell.kind.strategic': 'Strategic Spells', 'spell.cp': 'Casting points', 'spell.target': 'Target',
      'spell.castMode': '{name} — pick a target on the map.', 'spell.combatOnly': 'Can only be cast in battle.', 'spell.casting': 'Casting points {cp}/{max}',
      'spell.target.unit': 'Unit', 'spell.target.army': 'Army', 'spell.target.city': 'City', 'spell.target.province': 'Province', 'spell.target.hex': 'Hex', 'spell.target.enemy_unit': 'Enemy unit',
      'spell.target.ally_unit': 'Friendly unit', 'spell.target.empire': 'Empire', 'spell.target.player': 'Player', 'spell.target.all_enemies': 'All enemies', 'spell.target.all_allies': 'All allies', 'spell.tier': 'Tier {n}',
      'hero.title': 'Hero', 'hero.none': 'No heroes.', 'hero.skills': 'Skills', 'hero.skillPoints': 'Skill points', 'hero.learn': 'Learn', 'hero.learned': 'Learned', 'hero.equipment': 'Equipment',
      'hero.inventory': 'Inventory', 'hero.inventoryEmpty': 'No items in the vault.', 'hero.equip': 'Equip', 'hero.unequip': 'Unequip', 'hero.ruler': 'Ruler', 'hero.dead': 'Fallen',
      'hero.slot.weapon': 'Weapon', 'hero.slot.offhand': 'Off-hand', 'hero.slot.armor': 'Armor', 'hero.slot.helm': 'Helm', 'hero.slot.trinket': 'Trinket', 'hero.slot.mount': 'Mount',
      'hero.signature': 'Signature skill', 'hero.tier': 'Tier {n}', 'hero.minLevel': 'Needs level {n}', 'hero.needPrereq': 'Needs prerequisite skill', 'hero.noPoints': 'No skill points',
      'hero.stats': 'Stats', 'hero.general': 'General skills', 'hero.class': 'Class', 'hero.grants': 'Grants ability', 'hero.needTome': 'Needs the {name} tome',
      'rarity.common': 'Common', 'rarity.uncommon': 'Uncommon', 'rarity.rare': 'Rare', 'rarity.epic': 'Epic', 'rarity.legendary': 'Legendary',
      'empire.title': 'Empire Development', 'empire.affinity': 'Affinity', 'empire.tree.general': 'General', 'empire.buy': 'Purchase', 'empire.rite': 'Rite', 'empire.affinityReq': 'Needs {aff} affinity {n}',
      'empire.noBuy': 'Empire skill purchase rules are not available yet.', 'empire.imperium': 'Imperium', 'empire.owned': 'Owned skills', 'empire.needPrereq': 'Needs prerequisite',
      'dip.title': 'Diplomacy', 'dip.state.peace': 'Peace', 'dip.state.war': 'War', 'dip.state.alliance': 'Alliance', 'dip.state.defensive_pact': 'Defensive Pact', 'dip.state.non_aggression': 'Non-aggression',
      'dip.opinion': 'Opinion', 'dip.treaties': 'Treaties', 'dip.warScore': 'War score', 'dip.propose.peace': 'Propose Peace', 'dip.propose.non_aggression': 'Non-aggression', 'dip.propose.defensive_pact': 'Defensive Pact',
      'dip.propose.alliance': 'Alliance', 'dip.declareWar': 'Declare War', 'dip.gift': 'Gift', 'dip.trade': 'Trade', 'dip.confirmWar': 'Declare war on {name}?',
      'dip.accepted': '{name} accepted the proposal.', 'dip.rejected': '{name} rejected the proposal.', 'dip.sent': 'Proposal sent.', 'dip.noOthers': 'There are no other rulers.',
      'dip.giftAmount': 'Gold to gift', 'dip.give': 'You give', 'dip.receive': 'You receive', 'dip.terms': 'Terms', 'dip.incoming': 'Proposal from {name}', 'dip.accept': 'Accept', 'dip.decline': 'Decline',
      'dip.grievances': 'Grievances', 'dip.truce': 'Truce {n} turns', 'dip.dead': 'Eliminated', 'dip.ruler': 'Ruler', 'dip.personality.expansionist': 'Expansionist', 'dip.personality.militarist': 'Militarist',
      'dip.personality.scholar': 'Scholar', 'dip.personality.diplomat': 'Diplomat', 'dip.turns': '{n} turns', 'dip.kind.gift': 'Gift', 'dip.kind.trade': 'Trade', 'dip.kind.peace': 'Peace',
      'dip.kind.non_aggression': 'Non-aggression pact', 'dip.kind.defensive_pact': 'Defensive pact', 'dip.kind.alliance': 'Alliance', 'dip.kind.war': 'Declaration of war', 'dip.breakdown': 'Opinion breakdown', 'dip.failed': 'Cannot propose.',
      'vic.victory': 'Victory', 'vic.defeat': 'Defeat', 'vic.type.expansion': 'Expansion Victory', 'vic.type.magic': 'Magic Victory', 'vic.type.military': 'Military Victory', 'vic.type.score': 'Score Victory',
      'vic.type.elimination': 'Conquest Victory', 'vic.winner': 'Winner', 'vic.continue': 'Continue', 'vic.menu': 'Main Menu', 'vic.stats': 'Statistics', 'vic.turns': 'Turns', 'vic.cities': 'Cities', 'vic.units': 'Units',
      'vic.territory': 'Territory', 'vic.score': 'Score', 'vic.player': 'Realm', 'vic.subtitle.win': 'The age of {name} has begun.', 'vic.subtitle.lose': '{name} has become master of this world.',
      'enc.title': 'Encyclopedia', 'enc.cat.cultures': 'Cultures', 'enc.cat.forms': 'Forms', 'enc.cat.units': 'Units', 'enc.cat.tomes': 'Tomes', 'enc.cat.spells': 'Spells', 'enc.cat.buildings': 'Buildings',
      'enc.cat.heroClasses': 'Hero Classes', 'enc.cat.improvements': 'Improvements', 'enc.cat.wonders': 'Ancient Wonders', 'enc.cat.items': 'Items', 'enc.cat.abilities': 'Abilities', 'enc.cat.statuses': 'Status Effects',
      'enc.cat.empireSkills': 'Empire Skills', 'enc.cat.traits': 'Traits', 'enc.cat.rulerTypes': 'Ruler Types', 'enc.pick': 'Select an entry on the left.', 'enc.count': '{n} entries', 'enc.attacks': 'Attacks', 'enc.abilities': 'Abilities',
      'enc.passives': 'Passives', 'enc.tags': 'Tags', 'enc.move': 'Movement', 'enc.source': 'Source', 'enc.units': 'Units', 'enc.subChoices': 'Sub-choices', 'enc.traits': 'Traits', 'enc.roster': 'Unit roster',
      'enc.guard': 'Guardians', 'enc.rewards': 'Rewards', 'enc.kind': 'Kind', 'enc.duration': 'Duration', 'enc.range': 'Range', 'enc.ap': 'AP', 'enc.cooldown': 'Cooldown', 'enc.signature': 'Signature skills',
      'cities.title': 'Cities', 'cities.goto': 'Go to', 'cities.open': 'Open', 'cities.production': 'Production', 'cities.idle': 'Idle', 'cities.none': 'No cities.',
      'resource.production': 'Production', 'resource.draft': 'Draft', 'resource.stability': 'Stability',
    },
  });

  // ================================================================ accessors & safe wrappers
  const D = () => AOW.Data;
  const S = () => AOW.State;
  const L = (o, p) => (AOW.L ? AOW.L(o, p) : (o && (o.en || o.ko)) || String(o || ''));
  const t = (k, p) => (AOW.t ? AOW.t(k, p) : k);
  /** returns AOW[ns][name] when it is a function, else null */
  const fn = (ns, name) => (AOW[ns] && typeof AOW[ns][name] === 'function') ? AOW[ns][name].bind(AOW[ns]) : null;
  const game = () => AOW.game;
  const humanPid = g => { const p = (g && g.players || []).find(x => x.isHuman); return p ? p.id : 0; };
  const human = g => (g && g.players && (g.players.find(x => x.isHuman) || g.players[0])) || null;
  const has = (kind, id) => !!(D() && D().has(kind, id));
  const get = (kind, id) => (has(kind, id) ? D().get(kind, id) : null);
  const sfx = (name) => { const f = fn('SFX', 'play'); if (f) { try { f(name); } catch (e) { /* ignore */ } } };
  const rulesC = () => (AOW.Rules && AOW.Rules.C) || {};
  const AFFS = ['order', 'chaos', 'nature', 'materium', 'astral', 'shadow'];
  const RES_KEYS = ['food', 'production', 'gold', 'mana', 'knowledge', 'draft'];
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : (d || 0));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------------------------------------------------------------- DOM helpers (UI.* with local fallbacks)
  function mkLocal(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === undefined || v === null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') { if (typeof v === 'string') el.style.cssText = v; else Object.assign(el.style, v); }
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'disabled') { if (v) el.setAttribute('disabled', ''); }
      else el.setAttribute(k, v);
    }
    append(el, children);
    return el;
  }
  function append(el, ch) {
    if (ch === null || ch === undefined || ch === false) return;
    if (Array.isArray(ch)) { for (const c of ch) append(el, c); return; }
    if (ch instanceof Node) el.appendChild(ch);
    else el.appendChild(document.createTextNode(String(ch)));
  }
  const mk = (tag, attrs, ...children) => (fn('UI', 'el') ? AOW.UI.el(tag, attrs, ...children) : mkLocal(tag, attrs, ...children));
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function icon(name, size, params) {
    size = size || 20;
    const f = fn('UI', 'icon');
    if (f) { try { const e = f(name, size, params); if (e) return e; } catch (e) { /* fall through */ } }
    const url = fn('Icons', 'dataURL') && AOW.Icons.has && AOW.Icons.has(name) ? AOW.Icons.dataURL(name, size, params) : '';
    if (url) return mkLocal('img', { class: 'icon', src: url, width: size, height: size, alt: name, style: { width: size + 'px', height: size + 'px', verticalAlign: 'middle' } });
    return mkLocal('span', { class: 'icon icon-missing', style: { display: 'inline-block', width: size + 'px', height: size + 'px' } });
  }
  function btn(label, onClick, o) {
    o = o || {};
    const f = fn('UI', 'button');
    const click = (e) => { sfx('ui_click'); if (onClick) onClick(e); };
    if (f) { try { const b = f(label, click, o); if (b) return b; } catch (e) { /* fall through */ } }
    const b = mkLocal('button', { class: 'aow-btn aow-btn-' + (o.kind || 'default') + (o.small ? ' small' : ''), disabled: !!o.disabled, onclick: click }, o.icon ? icon(o.icon, 16) : null, label);
    if (o.tooltip) tip(b, o.tooltip);
    return b;
  }
  function panel(o) {
    const f = fn('UI', 'panel');
    if (f) { try { const p = f(o); if (p) return p; } catch (e) { /* fall through */ } }
    const p = mkLocal('div', { class: 'aow-panel ' + (o.cls || ''), style: o.width ? { width: typeof o.width === 'number' ? o.width + 'px' : o.width } : null },
      mkLocal('div', { class: 'aow-panel-title' }, mkLocal('span', { class: 'aow-panel-title-text' }, o.title || ''), o.subtitle ? mkLocal('span', { class: 'aow-panel-subtitle' }, o.subtitle) : null,
        o.closable ? mkLocal('button', { class: 'aow-panel-close', onclick: () => o.onClose && o.onClose() }, '✕') : null),
      mkLocal('div', { class: 'aow-panel-body' }, o.body));
    return p;
  }
  function tip(el, content) {
    if (!el) return el;
    const f = fn('UI', 'tooltip');
    if (f) { try { f(el, content); return el; } catch (e) { /* fall through */ } }
    try { const c = typeof content === 'function' ? content() : content; if (typeof c === 'string') el.title = c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); else if (c && c.textContent) el.title = c.textContent; } catch (e) { /* ignore */ }
    return el;
  }
  function modal(o) {
    const f = fn('UI', 'modal');
    if (f) { try { const m = f(o); if (m) return m; } catch (e) { /* fall through */ } }
    const layer = document.getElementById('screen-layer') || document.getElementById('ui') || document.body;
    const box = mkLocal('div', { class: 'sc-modal-fallback' });
    const buttons = mkLocal('div', { class: 'sc-modal-buttons' });
    const m = { el: box, close() { if (box.parentNode) box.parentNode.removeChild(box); } };
    box.appendChild(panel({ title: o.title, body: mkLocal('div', null, o.body, buttons), closable: o.closable !== false, onClose: () => m.close(), width: o.width || 480 }));
    for (const b of o.buttons || []) buttons.appendChild(btn(b.label, () => { const r = b.onClick && b.onClick(); if (r !== false) m.close(); }, { kind: b.kind }));
    layer.appendChild(box);
    return m;
  }
  function confirm(text, onYes) {
    const f = fn('UI', 'confirm');
    if (f) { try { f(text, onYes); return; } catch (e) { /* fall through */ } }
    modal({ title: t('sc.ok'), body: mkLocal('div', null, text), buttons: [{ label: t('sc.yes'), kind: 'primary', onClick: onYes }, { label: t('sc.no') }] });
  }
  function toast(kind, text) {
    const f = fn('UI', 'toast');
    if (f) { try { f(kind, text); return; } catch (e) { /* fall through */ } }
    if (AOW.Events) AOW.Events.emit('notify', { kind, text });
  }
  function progress(value, max, o) {
    o = o || {};
    const f = fn('UI', 'progressBar');
    if (f) { try { const p = f(value, max, o); if (p) return p; } catch (e) { /* fall through */ } }
    const pct = max > 0 ? clamp(value / max, 0, 1) * 100 : 0;
    return mkLocal('div', { class: 'sc-bar', style: { height: (o.height || 14) + 'px' } },
      mkLocal('div', { class: 'sc-bar-fill', style: { width: pct.toFixed(1) + '%', background: o.color || 'var(--gold)' } }),
      o.label !== undefined ? mkLocal('span', { class: 'sc-bar-label' }, o.label) : null);
  }
  function fmt(n) { const f = fn('UI', 'fmt'); if (f) { try { return f(n); } catch (e) { /* ignore */ } } n = num(n); return Math.abs(n) >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n * 10) / 10); }
  function fmtSigned(n) { const f = fn('UI', 'fmtSigned'); if (f) { try { return f(n); } catch (e) { /* ignore */ } } n = num(n); return (n > 0 ? '+' : '') + fmt(n); }
  function res(kind, value, o) {
    o = o || {};
    const f = fn('UI', 'resource');
    if (f) { try { const e = f(kind, value, o); if (e) return e; } catch (e) { /* fall through */ } }
    return mkLocal('span', { class: 'sc-res sc-res-' + kind }, icon(kind, o.size || 16), mkLocal('span', { class: 'sc-res-n' }, o.signed ? fmtSigned(value) : fmt(value)));
  }
  function costRow(cost, o) {
    const row = mk('span', { class: 'sc-cost' });
    let any = false;
    for (const k of ['production', 'gold', 'mana', 'draft', 'imperium', 'knowledge', 'food']) if (cost && cost[k]) { row.appendChild(res(k, cost[k], o)); any = true; }
    if (!any) row.appendChild(mk('span', { class: 'dim' }, t('sc.free')));
    return row;
  }
  const closeScreen = () => { const f = fn('UI', 'closeScreen'); if (f) f(); };
  const refreshUI = () => { const f = fn('UI', 'refresh'); if (f) f(); };
  const showScreen = (name, params) => { const f = fn('UI', 'showScreen'); if (f) f(name, params); };
  const centerOn = (idx) => { const f = fn('WorldRender', 'centerOn'); if (f && idx >= 0) f(idx, true); };
  const emptyNote = (text) => mk('div', { class: 'sc-empty' }, text);
  const ATTR = (v) => (v === undefined || v === null ? '' : String(v));

  // ---------------------------------------------------------------- CSS
  const CSS = `
  .sc-root{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,9,16,.62);z-index:20;font-family:var(--font-body);color:var(--text)}
  .sc-root .aow-panel{display:flex;flex-direction:column;max-height:94vh}
  .sc-panel{width:min(1280px,96vw)}
  .sc-panel-narrow{width:min(760px,94vw)}
  .sc-body{flex:1;overflow:auto;padding:12px 14px;min-height:200px;max-height:calc(94vh - 56px)}
  .aow-panel{background:linear-gradient(180deg,#1e2536,#151a26);border:1px solid var(--border);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.6),inset 0 0 0 1px rgba(201,162,74,.15)}
  .aow-panel-title{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);font-family:var(--font-title);font-size:18px;letter-spacing:.5px;color:var(--gold-light);background:rgba(0,0,0,.25)}
  .aow-panel-title-text{flex:1}.aow-panel-subtitle{font-size:13px;color:var(--text-dim);font-family:var(--font-body)}
  .aow-panel-close{background:none;border:1px solid var(--border);color:var(--gold);border-radius:4px;cursor:pointer;padding:2px 8px}
  .aow-panel-body{padding:0}
  .aow-btn{background:linear-gradient(180deg,#2e3850,#1c2334);color:var(--text);border:1px solid var(--border);border-radius:5px;padding:5px 12px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:6px}
  .aow-btn:hover:not([disabled]){border-color:var(--gold-light);color:#fff}.aow-btn[disabled]{opacity:.45;cursor:not-allowed}
  .aow-btn-primary,.aow-btn-gold{background:linear-gradient(180deg,#8a6a24,#5a4416);color:#fff4d0;border-color:var(--gold-light)}
  .aow-btn-danger{background:linear-gradient(180deg,#8a2e22,#5a1c14);border-color:#e0705a;color:#ffe0d8}
  .aow-btn-ghost{background:transparent}.aow-btn.small{padding:2px 8px;font-size:12px}
  .sc-empty{padding:18px;text-align:center;color:var(--text-dim);font-style:italic}
  .dim{color:var(--text-dim)}.gold{color:var(--gold-light)}.good{color:var(--good)}.bad{color:var(--danger)}.warn{color:var(--warn)}
  .sc-h{font-family:var(--font-title);color:var(--gold-light);font-size:15px;margin:10px 0 6px;letter-spacing:.4px;border-bottom:1px solid rgba(201,162,74,.25);padding-bottom:3px}
  .sc-h:first-child{margin-top:0}
  .sc-tabs{display:flex;gap:4px;margin:8px 0 10px;border-bottom:1px solid var(--border)}
  .sc-tab{background:rgba(255,255,255,.03);border:1px solid transparent;border-bottom:none;color:var(--text-dim);padding:6px 16px;cursor:pointer;border-radius:6px 6px 0 0;font-family:var(--font-title);font-size:14px}
  .sc-tab:hover{color:var(--text)}.sc-tab.active{background:rgba(201,162,74,.15);border-color:var(--border);color:var(--gold-light)}
  .sc-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border:1px solid rgba(201,162,74,.22);background:rgba(30,37,54,.65);border-radius:6px;margin-bottom:6px;min-height:40px}
  .sc-row:hover{border-color:rgba(201,162,74,.6);background:rgba(38,47,69,.8)}.sc-row.disabled{opacity:.55}.sc-row.selected{border-color:var(--gold-light);box-shadow:0 0 0 1px var(--gold-dark) inset}
  .sc-row .name{font-weight:600;color:#f2ead6}.sc-row .sub{font-size:12px;color:var(--text-dim)}.sc-row .grow{flex:1;min-width:0}
  .sc-cost{display:inline-flex;gap:8px;align-items:center;white-space:nowrap}.sc-res{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}.sc-res-n{font-variant-numeric:tabular-nums}
  .sc-bar{position:relative;background:rgba(0,0,0,.45);border:1px solid rgba(201,162,74,.35);border-radius:4px;overflow:hidden;min-width:60px}
  .sc-bar-fill{height:100%;transition:width .3s}.sc-bar-label{position:absolute;inset:0;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;color:#fff;text-shadow:0 1px 2px #000}
  .sc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sc-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
  .sc-cols{display:flex;gap:14px;align-items:flex-start}.sc-col{flex:1;min-width:0}.sc-col-side{flex:0 0 300px}
  .sc-stat{display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-variant-numeric:tabular-nums}
  .sc-badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;background:rgba(201,162,74,.2);border:1px solid rgba(201,162,74,.4);color:var(--gold-light)}
  .sc-badge.war{background:rgba(217,75,58,.25);border-color:#d94b3a;color:#ffb3a0}.sc-badge.good{background:rgba(95,176,67,.2);border-color:var(--good);color:#c5f0a8}
  .sc-portrait{width:64px;height:64px;border-radius:6px;border:1px solid var(--border);background:#0d111a;object-fit:cover;flex:none}
  .sc-portrait.lg{width:112px;height:112px}
  .sc-tipbox{max-width:360px}.sc-tipbox h4{margin:0 0 4px;font-family:var(--font-title)}.sc-tipbox p{margin:4px 0}.sc-tipbox ul{margin:4px 0;padding-left:18px}
  .sc-input{background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:4px;font:inherit}
  select.sc-input{max-width:200px}
  .sc-city-head{display:flex;gap:16px;align-items:center;padding:8px 10px;background:rgba(0,0,0,.25);border:1px solid var(--border);border-radius:8px;margin-bottom:10px}
  .sc-city-name{font-family:var(--font-title);font-size:24px;color:var(--gold-light);cursor:text}
  .sc-city-name input{font-size:20px;width:220px}
  .sc-yields{display:flex;gap:14px;flex-wrap:wrap;padding:8px 10px;background:rgba(0,0,0,.2);border-radius:6px;margin-bottom:10px}
  .sc-yield{display:inline-flex;align-items:center;gap:5px;cursor:help;font-size:15px}
  .sc-queue{margin-bottom:10px}.sc-queue .sc-row{padding:5px 8px;min-height:36px}
  .sc-catname{font-family:var(--font-title);color:var(--gold);margin:8px 0 4px;font-size:13px;letter-spacing:.5px;text-transform:uppercase}
  .sc-shelf{display:flex;flex-direction:column;gap:8px}
  .sc-shelf-row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;padding:8px 8px 6px;background:linear-gradient(180deg,rgba(60,40,20,.25),rgba(30,20,10,.5));border-bottom:4px solid #4a3218;border-radius:4px}
  .sc-shelf-tier{flex:0 0 100%;font-family:var(--font-title);color:var(--gold);font-size:12px;letter-spacing:.5px}
  .sc-book{width:72px;text-align:center;cursor:pointer;position:relative;padding:2px;border-radius:5px;transition:transform .1s}
  .sc-book:hover{transform:translateY(-3px)}.sc-book.locked{opacity:.45;filter:grayscale(.5)}.sc-book.owned{background:rgba(201,162,74,.18);box-shadow:0 0 8px rgba(201,162,74,.5)}
  .sc-book .bname{font-size:10px;line-height:1.15;margin-top:2px;color:var(--text);height:24px;overflow:hidden}
  .sc-book .lock{position:absolute;top:2px;right:2px}.sc-book .affs{position:absolute;top:2px;left:2px;display:flex;gap:1px}
  .sc-tree{position:relative;overflow:auto;padding:8px;background:rgba(0,0,0,.2);border-radius:6px}
  .sc-tree svg{position:absolute;left:0;top:0;pointer-events:none}
  .sc-node{position:absolute;width:156px;min-height:60px;border:1px solid rgba(201,162,74,.35);border-radius:6px;background:linear-gradient(180deg,#242c40,#161b28);padding:5px 7px;font-size:12px;cursor:pointer}
  .sc-node .nname{font-weight:600;color:#f2ead6;font-size:12px;line-height:1.2}.sc-node .nsub{color:var(--text-dim);font-size:11px;margin-top:2px;display:flex;gap:6px;align-items:center}
  .sc-node.owned{border-color:var(--gold-light);background:linear-gradient(180deg,#4a3a18,#2a2010);box-shadow:0 0 8px rgba(201,162,74,.4)}
  .sc-node.available{border-color:#8fd16a}.sc-node.locked{opacity:.5}.sc-node.signature{border-color:#e8c357;box-shadow:inset 0 0 0 1px #8a6a24}
  .sc-node.rite{border-style:double;border-width:3px}
  /* the six affinities always share one row: a fixed 6-column grid (a flex-wrap row dropped 그림자 onto a second line) */
  .sc-affbars{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px 10px;margin-bottom:10px;flex:1 1 420px;min-width:0}
  .sc-affbar{display:flex;align-items:center;gap:5px;min-width:0}
  .sc-affbar .aname{color:var(--text-dim);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto}
  .sc-affbar .abar{flex:1 1 auto;min-width:28px}
  .sc-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .sc-slot{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px;border:2px solid #4a4a52;border-radius:6px;background:rgba(0,0,0,.3);cursor:pointer;min-height:84px;font-size:11px;text-align:center}
  .sc-slot .sname{color:var(--text-dim)}.sc-slot .iname{color:var(--text);line-height:1.15}
  .rar-common{border-color:#9aa0a8!important}.rar-uncommon{border-color:#5fb043!important}.rar-rare{border-color:#3f7fe0!important}.rar-epic{border-color:#a050e0!important}.rar-legendary{border-color:#ffa030!important;box-shadow:0 0 8px rgba(255,160,48,.5)}
  .c-common{color:#c8ccd4}.c-uncommon{color:#8fd16a}.c-rare{color:#7fa8ff}.c-epic{color:#c890ff}.c-legendary{color:#ffc070}
  .sc-herotabs{display:flex;flex-direction:column;gap:6px}.sc-herotab{display:flex;gap:8px;align-items:center;padding:4px;border:1px solid transparent;border-radius:6px;cursor:pointer}
  .sc-herotab:hover{background:rgba(255,255,255,.04)}.sc-herotab.active{border-color:var(--gold);background:rgba(201,162,74,.12)}
  .sc-skillcols{display:flex;gap:10px;position:relative}.sc-skillcol{flex:1;display:flex;flex-direction:column;gap:6px}
  .sc-skill{border:1px solid rgba(201,162,74,.3);border-radius:6px;padding:5px 7px;background:rgba(30,37,54,.7);font-size:12px;position:relative}
  .sc-skill.learned{border-color:var(--gold-light);background:rgba(90,70,30,.45)}.sc-skill.available{border-color:#8fd16a}.sc-skill.locked{opacity:.55}.sc-skill.signature{box-shadow:inset 0 0 0 1px #e8c357}
  .sc-skill .sname{font-weight:600;color:#f2ead6}.sc-skill .sdesc{color:var(--text-dim);font-size:11px;margin-top:2px}
  .sc-dip-row{align-items:flex-start}.sc-banner{width:44px;height:52px;border-radius:4px 4px 22px 22px;border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-family:var(--font-title);font-weight:700;color:#fff;text-shadow:0 1px 2px #000;flex:none}
  .sc-dip-btns{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
  .sc-victory{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(60,45,15,.85),rgba(5,7,12,.97));z-index:30;color:var(--text)}
  .sc-victory.lose{background:radial-gradient(ellipse at center,rgba(60,15,15,.85),rgba(5,7,12,.97))}
  .sc-victory h1{font-family:var(--font-title);font-size:72px;margin:0;color:var(--gold-light);letter-spacing:6px;text-shadow:0 0 30px rgba(241,217,138,.6),0 4px 0 #5a4416}
  .sc-victory.lose h1{color:#ff9a8a;text-shadow:0 0 30px rgba(255,80,60,.5),0 4px 0 #5a1c14}
  .sc-victory h2{font-family:var(--font-title);font-weight:400;color:var(--gold);margin:6px 0 20px;font-size:22px}
  .sc-victory .orn{width:420px;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:10px 0}
  .sc-victory table{border-collapse:collapse;margin:10px 0 20px;min-width:520px}.sc-victory td,.sc-victory th{padding:5px 14px;border-bottom:1px solid rgba(201,162,74,.25);text-align:right}
  .sc-victory th{color:var(--gold);font-family:var(--font-title);font-weight:400}.sc-victory td:first-child,.sc-victory th:first-child{text-align:left}
  .sc-enc{display:grid;grid-template-columns:180px 300px 1fr;gap:12px;min-height:520px}
  .sc-enc-cats{display:flex;flex-direction:column;gap:3px}.sc-enc-cat{padding:5px 10px;cursor:pointer;border-radius:4px;border:1px solid transparent}
  .sc-enc-cat:hover{background:rgba(255,255,255,.04)}.sc-enc-cat.active{border-color:var(--gold);background:rgba(201,162,74,.12);color:var(--gold-light)}
  .sc-enc-list{max-height:560px;overflow:auto;border:1px solid rgba(201,162,74,.2);border-radius:6px;padding:4px}
  .sc-enc-item{padding:4px 8px;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:6px;font-size:13px}.sc-enc-item:hover{background:rgba(255,255,255,.05)}.sc-enc-item.active{background:rgba(201,162,74,.18);color:var(--gold-light)}
  .sc-enc-detail{padding:6px 10px;max-height:560px;overflow:auto}.sc-enc-detail h3{font-family:var(--font-title);color:var(--gold-light);margin:0 0 4px}.sc-enc-detail p{margin:4px 0;line-height:1.5}
  .sc-kv{display:grid;grid-template-columns:140px 1fr;gap:3px 10px;font-size:13px;margin:6px 0}.sc-kv .k{color:var(--text-dim)}
  .sc-modal-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);z-index:40}
  .sc-modal-buttons{display:flex;gap:8px;justify-content:flex-end;padding:10px 12px}
  .sc-units{display:flex;flex-wrap:wrap;gap:8px}
  .sc-ucard{width:120px;border:1px solid var(--border);border-radius:6px;background:rgba(0,0,0,.3);padding:4px;text-align:center;font-size:12px}
  .sc-ucard img,.sc-ucard canvas{width:64px;height:64px;border-radius:4px}
  .sc-chip{display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:4px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);font-size:11px;margin:1px}
  `;
  function installCss() {
    const f = fn('UI', 'css');
    if (f) { try { f(CSS); return; } catch (e) { /* fall through */ } }
    if (document.getElementById('sc-style')) return;
    const st = document.createElement('style'); st.id = 'sc-style'; st.textContent = CSS; document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- shared formatting
  const EFFECT_LABELS = {
    ko: { food: '식량', production: '생산력', gold: '금', mana: '마나', knowledge: '지식', draft: '징집력', imperium: '임페리움', stability: '안정도', growthPct: '성장률', foodPct: '식량',
      productionPct: '생산력', goldPct: '금', manaPct: '마나', knowledgePct: '지식', hp: '체력', hpPct: '체력', def: '방어', res: '저항', dmg: '피해', dmgPct: '피해', accuracy: '명중', mp: '이동력',
      morale: '사기', critChance: '치명타', healPerTurn: '턴당 회복', unitTier: '모집 등급', upkeepPct: '유지비', recruitCostPct: '모집 비용', casting: '시전 점수', combatCasting: '전투 시전 점수',
      cityCap: '도시 상한', provinceCostPct: '지방 비용', vision: '시야', spellCostPct: '주문 비용', researchPct: '연구 속도', armyMove: '군세 이동', wallHp: '성벽 내구', cityDefense: '도시 방어',
      xpPct: '경험치', rankUp: '시작 계급', diplomacyOpinion: '외교 호감', warScore: '전쟁 점수', walls: '성벽 등급', heroSlots: '영웅 슬롯', statusRes: '상태이상 저항', evasion: '회피', retaliation: '반격',
      damageTakenPct: '받는 피해', healPct: '받는 치유', fumbleChance: '실수 확률' },
    en: { food: 'Food', production: 'Production', gold: 'Gold', mana: 'Mana', knowledge: 'Knowledge', draft: 'Draft', imperium: 'Imperium', stability: 'Stability', growthPct: 'Growth', foodPct: 'Food',
      productionPct: 'Production', goldPct: 'Gold', manaPct: 'Mana', knowledgePct: 'Knowledge', hp: 'HP', hpPct: 'HP', def: 'Defense', res: 'Resistance', dmg: 'Damage', dmgPct: 'Damage', accuracy: 'Accuracy', mp: 'Movement',
      morale: 'Morale', critChance: 'Critical', healPerTurn: 'Heal/turn', unitTier: 'Recruit tier', upkeepPct: 'Upkeep', recruitCostPct: 'Recruit cost', casting: 'Casting points', combatCasting: 'Combat casting',
      cityCap: 'City cap', provinceCostPct: 'Province cost', vision: 'Vision', spellCostPct: 'Spell cost', researchPct: 'Research', armyMove: 'Army movement', wallHp: 'Wall HP', cityDefense: 'City defense',
      xpPct: 'XP', rankUp: 'Starting rank', diplomacyOpinion: 'Opinion', warScore: 'War score', walls: 'Wall tier', heroSlots: 'Hero slots', statusRes: 'Status resistance', evasion: 'Evasion', retaliation: 'Retaliation',
      damageTakenPct: 'Damage taken', healPct: 'Healing received', fumbleChance: 'Fumble chance' },
  };
  function effectLabel(key) {
    const lang = (AOW.I18n && AOW.I18n.lang) || 'ko';
    const tbl = EFFECT_LABELS[lang] || EFFECT_LABELS.en;
    if (tbl[key]) return tbl[key];
    let m = /^statusRes_(\w+)$/.exec(key); if (m) return t('channel.' + m[1]) + ' ' + tbl.statusRes;
    m = /^channelDmg_(\w+)$/.exec(key); if (m) return t('channel.' + m[1]) + ' ' + tbl.dmg;
    m = /^prot_(\w+)$/.exec(key); if (m) return t('channel.' + m[1]) + ' ' + tbl.def;
    return key;
  }
  function effectEntries(effects) {
    const out = [];
    if (!effects) return out;
    for (const k of Object.keys(effects)) {
      const v = effects[k];
      if (v === 0 || v === null || v === undefined || v === false) continue;
      const pct = /Pct$/.test(k);
      const text = typeof v === 'number' ? ((v > 0 ? '+' : '') + v + (pct ? '%' : '')) : (v === true ? '' : String(v));
      out.push({ key: k, label: effectLabel(k), text });
    }
    return out;
  }
  Screens.effectsText = (effects) => effectEntries(effects).map(e => e.label + (e.text ? ' ' + e.text : '')).join(', ');
  Screens.effectsList = (effects) => {
    const ul = mk('ul', { class: 'sc-effects' });
    for (const e of effectEntries(effects)) ul.appendChild(mk('li', null, e.label + (e.text ? ' ' + e.text : '')));
    return ul;
  };
  function effectChips(effects) {
    const box = mk('span');
    for (const e of effectEntries(effects)) box.appendChild(mk('span', { class: 'sc-chip' }, RES_KEYS.concat(['imperium', 'stability']).includes(e.key) ? icon(e.key, 12) : null, e.label + ' ' + e.text));
    return box;
  }
  Screens.tierName = (tier) => t('city.tier.' + clamp(tier | 0, 0, 5));
  const tierRoman = (n) => ['-', 'I', 'II', 'III', 'IV', 'V'][clamp(n | 0, 0, 5)];
  const affIcons = (aff, size) => { const box = mk('span', { class: 'sc-affs' }); for (const a of AFFS) if (aff && aff[a]) { for (let i = 0; i < Math.min(3, aff[a]); i++) box.appendChild(icon(a, size || 14)); } return box; };
  const affText = (aff) => AFFS.filter(a => aff && aff[a]).map(a => t('affinity.' + a) + ' +' + aff[a]).join(', ');

  // ---------------------------------------------------------------- portraits
  const portraitCache = new Map();
  /** unit portrait image (UnitArt.portrait when available; role-icon fallback). */
  Screens.unitPortrait = function (typeOrUnit, size, o) {
    o = o || {}; size = size || 64;
    const g = game();
    let type = typeOrUnit, unit = null;
    if (typeOrUnit && typeOrUnit.typeId !== undefined) { unit = typeOrUnit; type = S() && S().unitType ? S().unitType(unit) : get('units', unit.typeId); }
    else if (typeof typeOrUnit === 'string') type = get('units', typeOrUnit) || { id: typeOrUnit, role: 'fighter', look: {} };
    type = type || {};
    const pid = o.pid !== undefined ? o.pid : (unit ? unit.owner : (g ? humanPid(g) : 0));
    const player = g && g.players ? g.players[pid] : null;
    const hero = !!(o.hero || (unit && unit.heroId !== null && unit.heroId !== undefined) || type.role === 'hero');
    const key = (type.id || '?') + '|' + pid + '|' + size + '|' + (hero ? 1 : 0) + '|' + (unit && unit.formId || '');
    let url = portraitCache.get(key);
    if (url === undefined) {
      url = '';
      const UA = AOW.UnitArt;
      if (UA && typeof UA.portrait === 'function') {
        try {
          const formId = (unit && unit.formId) || (player && player.formId);
          const form = formId && has('forms', formId) ? get('forms', formId) : null;
          const look = typeof UA.resolveLook === 'function' ? UA.resolveLook(type, form && form.look, player) : Object.assign({}, type.look || {});
          const cv = UA.portrait(look, { size, playerColor: player && player.color, playerColor2: player && player.color2, hero, frame: true, unitType: type });
          if (cv && cv.toDataURL) url = cv.toDataURL('image/png');
        } catch (e) { url = ''; }
      }
      portraitCache.set(key, url);
    }
    if (url) return mk('img', { class: 'sc-portrait' + (o.cls ? ' ' + o.cls : ''), src: url, width: size, height: size, style: { width: size + 'px', height: size + 'px' } });
    const box = mk('div', { class: 'sc-portrait' + (o.cls ? ' ' + o.cls : ''), style: { width: size + 'px', height: size + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 40% 35%,#2e3850,#0d111a)' } });
    box.appendChild(icon(hero ? 'role_hero' : 'role_' + (type.role || 'fighter'), Math.round(size * 0.62)));
    return box;
  };
  function heroPortrait(hero, size) {
    const f = fn('UI', 'heroPortrait');
    if (f) { try { const e = f(hero.id, size); if (e) return e; } catch (e) { /* fall through */ } }
    const unit = S() && S().unit ? S().unit(game(), hero.unitId) : null;
    return Screens.unitPortrait(unit || { typeId: 'hero', owner: hero.owner, heroId: hero.id }, size, { hero: true, pid: hero.owner, cls: size >= 96 ? 'lg' : '' });
  }
  function tomeIcon(tomeId, size) {
    const f = fn('UI', 'tomeIcon');
    if (f) { try { const e = f(tomeId, size); if (e) return e; } catch (e) { /* fall through */ } }
    const tome = get('tomes', tomeId);
    const aff = tome ? (AFFS.find(a => tome.affinity && tome.affinity[a]) || 'astral') : 'astral';
    const name = tome && tome.icon && AOW.Icons && AOW.Icons.has && AOW.Icons.has(tome.icon) ? tome.icon : 'tome_' + aff + '_' + (tome ? tome.tier : 1);
    return icon(name, size || 48);
  }

  // ---------------------------------------------------------------- screen factory
  const pending = [];
  function register(name, screen) {
    const f = fn('UI', 'registerScreen');
    if (f) { try { f(name, screen); return true; } catch (e) { console.warn('[screens] register failed', name, e); } }
    pending.push([name, screen]);
    return false;
  }
  Screens.registerAll = function () {
    const f = fn('UI', 'registerScreen');
    if (!f) return false;
    installCss();
    while (pending.length) { const [n, s] = pending.shift(); try { f(n, s); } catch (e) { console.warn('[screens] register failed', n, e); } }
    return true;
  };
  Screens.defs = {};
  /**
   * defineScreen(name, def): def = { title(ctx)→string, subtitle?(ctx), width?, cls?, fullscreen?, build(ctx)→Node|Node[], onOpen?(ctx), onClose?(ctx) }
   * ctx = { params, state (per open), root, body }
   */
  function defineScreen(name, def) {
    const ctx = { name, params: {}, state: {}, root: null, body: null };
    function render() {
      if (!ctx.body) return;
      clear(ctx.body);
      try { append(ctx.body, def.build(ctx)); }
      catch (e) { console.warn('[screens] ' + name + ' render failed', e); ctx.body.appendChild(emptyNote(String(e && e.message || e))); }
    }
    const screen = {
      open(params) {
        installCss();
        ctx.params = params || {}; ctx.state = {};
        sfx('ui_open');
        ctx.body = mk('div', { class: 'sc-body sc-body-' + name });
        if (def.fullscreen) { ctx.root = mk('div', { class: 'sc-root sc-root-' + name + ' ' + (def.cls || '') }, ctx.body); }
        else {
          const p = panel({ title: def.title ? def.title(ctx) : name, subtitle: def.subtitle ? def.subtitle(ctx) : undefined, cls: 'sc-panel sc-screen-' + name + ' ' + (def.cls || ''), body: ctx.body, closable: true, onClose: () => closeScreen(), width: def.width });
          ctx.panel = p;
          ctx.root = mk('div', { class: 'sc-root sc-root-' + name }, p);
        }
        if (def.onOpen) { try { def.onOpen(ctx); } catch (e) { console.warn(e); } }
        render();
        return ctx.root;
      },
      close() { if (def.onClose) { try { def.onClose(ctx); } catch (e) { console.warn(e); } } sfx('ui_close'); ctx.root = null; ctx.body = null; },
      refresh() { render(); },
      ctx,
    };
    Screens.defs[name] = screen;
    register(name, screen);
    return screen;
  }
  const refreshScreen = (name) => { const s = Screens.defs[name]; if (s && s.ctx.root) s.refresh(); };
  /** mutate → refresh both this screen and the HUD */
  function after(name) { refreshUI(); refreshScreen(name); }

  function tabs(list, active, onChange) {
    const bar = mk('div', { class: 'sc-tabs' });
    for (const tb of list) bar.appendChild(mk('button', { class: 'sc-tab' + (tb.id === active ? ' active' : ''), onclick: () => { sfx('ui_click'); onChange(tb.id); } }, tb.icon ? icon(tb.icon, 14) : null, ' ' + tb.label + (tb.count !== undefined ? ' (' + tb.count + ')' : '')));
    return bar;
  }
  function tipBox(title, lines) {
    const box = mk('div', { class: 'sc-tipbox' }, title ? mk('h4', null, title) : null);
    for (const l of lines || []) { if (l === null || l === undefined || l === '') continue; box.appendChild(typeof l === 'string' ? mk('p', null, l) : l); }
    return box;
  }
  /** Human-readable reason text for a Rules/Diplomacy `{ok:false,...}` result: prefers `.text` (Rules' own
   *  already-localized message), falls back to translating a short `.reason` key ('rules.reason.<k>' then
   *  the raw key), or localizing a `{ko,en}` reason object (Diplomacy's shape). Never returns a raw i18n key. */
  function reasonText(r) {
    if (!r) return '';
    if (r.text) return typeof r.text === 'object' ? L(r.text) : String(r.text);
    if (r.reason !== undefined && r.reason !== null) {
      if (typeof r.reason === 'object') return L(r.reason);
      const key = String(r.reason);
      if (AOW.I18n && AOW.I18n.has && AOW.I18n.has('rules.reason.' + key)) return t('rules.reason.' + key);
      if (AOW.I18n && AOW.I18n.has && AOW.I18n.has(key)) return t(key);
      return key;
    }
    return '';
  }
  function result(r, okText) {
    if (r && typeof r === 'object' && r.ok === false) { toast('warn', reasonText(r) || t('sc.unavailable')); return false; }
    if (r === false) { toast('warn', t('sc.unavailable')); return false; }
    if (okText) toast('good', okText);
    return true;
  }

  // ================================================================ CITY
  const CATS = ['economy', 'military', 'defense', 'stability', 'growth', 'special', 'culture'];
  const CAT_ICON = { economy: 'gold', military: 'draft', defense: 'def', stability: 'stability', growth: 'pop', special: 'star', culture: 'flag' };

  function cityYields(g, city) {
    const f = fn('Rules', 'cityYields');
    if (f) { try { const y = f(g, city); if (y) return y; } catch (e) { /* fall through */ } }
    const y = { food: 10 + num(city.pop) * 2, production: 10 + num(city.pop), gold: 10 + num(city.pop) * 2, mana: 5, knowledge: 5, draft: 5, stability: num(city.stability, 50) };
    for (const b of city.buildings || []) { const bd = get('buildings', b); if (bd && bd.effects) for (const k of Object.keys(y)) y[k] += num(bd.effects[k]); }
    for (const pid of city.provinces || []) { const p = g.provinces[pid]; const imp = p && p.improvement ? get('improvements', p.improvement) : null; if (imp && imp.yields) for (const k of Object.keys(y)) y[k] += num(imp.yields[k]); }
    return y;
  }
  function yieldBreakdown(g, city, key) {
    const f = fn('Rules', 'cityYieldBreakdown');
    if (f) { try { const b = f(g, city); const list = b && (b[key] || (Array.isArray(b) ? b.filter(x => x.key === key) : null)); if (list && list.length) return list; } catch (e) { /* fall through */ } }
    const out = [{ label: t('sc.base') + ' (' + t('sc.pop') + ' ' + num(city.pop) + ')', value: null }];
    for (const b of city.buildings || []) { const bd = get('buildings', b); if (bd && bd.effects && bd.effects[key]) out.push({ label: L(bd.name), value: bd.effects[key] }); }
    for (const pid of city.provinces || []) { const p = g.provinces[pid]; const imp = p && p.improvement ? get('improvements', p.improvement) : null; if (imp && imp.yields && imp.yields[key]) out.push({ label: L(imp.name), value: imp.yields[key] }); }
    return out;
  }
  function growthNeeded(g, city) {
    const f = fn('Rules', 'growthNeeded'); if (f) { try { const n = f(g, city); if (n > 0) return n; } catch (e) { /* ignore */ } }
    const C = rulesC(); if (typeof C.GROWTH_BASE === 'number') return C.GROWTH_BASE + num(city.pop) * num(C.GROWTH_PER_POP, 10);
    return 60 + num(city.pop) * 15;
  }
  function itemCost(g, city, item) {
    const f = fn('Rules', 'queueItemCost'); if (f) { try { const c = f(g, city, item); if (typeof c === 'number') return c; if (c && typeof c.production === 'number') return c.production; } catch (e) { /* ignore */ } }
    if (item.type === 'building') { const b = get('buildings', item.id); return b && b.cost ? num(b.cost.production, 60) : 60; }
    if (item.type === 'unit') { const u = get('units', item.id); if (u && u.cost && u.cost.production) return u.cost.production; const C = rulesC(); return (C.RECRUIT_PRODUCTION_PER_TIER || 40) * (u ? u.tier : 1); }
    if (item.type === 'improvement') { const i = get('improvements', item.id); return i && i.cost ? num(i.cost.production, 40) : 40; }
    return num(item.cost, 50);
  }
  function itemName(item) {
    const kind = { building: 'buildings', unit: 'units', improvement: 'improvements' }[item.type];
    const d = kind ? get(kind, item.id) : null;
    return d ? L(d.name) : item.id;
  }
  function itemIcon(item, size) {
    if (item.type === 'unit') return Screens.unitPortrait(item.id, size || 36);
    if (item.type === 'building') { const b = get('buildings', item.id); return icon(CAT_ICON[b && b.category] || 'city', size || 28); }
    if (item.type === 'improvement') return icon('node', size || 28);
    return icon('production', size || 28);
  }
  function turnsFor(remaining, perTurn) { return perTurn > 0 ? Math.max(1, Math.ceil(remaining / perTurn)) : Infinity; }
  const turnsText = (n) => (isFinite(n) ? t('sc.turns', { n }) : '∞');

  function cityHeader(ctx, g, city, player, isOwn) {
    const head = mk('div', { class: 'sc-city-head' });
    const nameBox = mk('div', { class: 'sc-city-name', title: isOwn ? t('city.rename') : '' }, city.name);
    if (isOwn) nameBox.onclick = () => {
      if (ctx.state.renaming) return; ctx.state.renaming = true;
      const inp = mk('input', { class: 'sc-input', value: city.name });
      const commit = () => { const v = inp.value.trim(); ctx.state.renaming = false; if (v && v !== city.name) { const f = fn('Rules', 'renameCity'); if (f) f(g, city, v); else city.name = v; if (AOW.Events) AOW.Events.emit('city:changed', { cityId: city.id }); } after('city'); };
      inp.onkeydown = (e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { ctx.state.renaming = false; refreshScreen('city'); } e.stopPropagation(); };
      inp.onblur = commit;
      clear(nameBox); nameBox.appendChild(inp); inp.focus(); inp.select();
    };
    const growthMax = growthNeeded(g, city);
    const tierLine = mk('div', { class: 'sub' }, mk('span', { class: 'sc-badge' }, tierRoman(city.tier) + ' ' + Screens.tierName(city.tier)), ' ',
      city.isCapital ? mk('span', { class: 'sc-badge' }, icon('crown', 12), ' ' + t('city.capital')) : null, ' ',
      city.freeCity ? mk('span', { class: 'sc-badge' }, t('city.freeCity')) : null);
    const left = mk('div', { class: 'grow' }, nameBox, tierLine);
    const popBox = mk('div', { style: 'min-width:220px' }, mk('div', { class: 'sub' }, icon('pop', 14), ' ' + t('sc.pop') + ' ', mk('b', null, String(num(city.pop))), '  ·  ' + t('city.growth')),
      progress(num(city.growth), growthMax, { color: '#9bd35a', label: fmt(num(city.growth)) + ' / ' + fmt(growthMax), height: 14 }));
    const stab = num(city.stability, 50);
    const stabColor = stab >= 70 ? 'good' : stab >= 40 ? '' : 'bad';
    const stabBox = mk('div', { class: 'sc-stat', style: 'font-size:16px;cursor:help' }, icon('stability', 20), mk('span', { class: stabColor }, t('city.stability') + ' ' + fmt(stab)));
    tip(stabBox, () => {
      const f = fn('Rules', 'stabilityBreakdown'); let lines = [t('city.stabilityTip')];
      if (f) { try { const b = f(g, city); if (Array.isArray(b)) lines = lines.concat(b.map(x => (x.label || x.name || '') + ': ' + fmtSigned(x.value))); } catch (e) { /* ignore */ } }
      return tipBox(t('city.stability'), lines);
    });
    const ownerBox = mk('div', { class: 'sub' }, t('city.owner') + ': ', mk('span', { style: { color: player ? player.color : '#aaa', fontWeight: 600 } }, player ? player.name : t('city.freeCity')));
    head.append(left, popBox, stabBox, ownerBox);
    return head;
  }
  function cityYieldRow(g, city) {
    const y = cityYields(g, city);
    const row = mk('div', { class: 'sc-yields' });
    for (const k of RES_KEYS) {
      const e = mk('span', { class: 'sc-yield' }, icon(k, 20), mk('b', null, fmtSigned(num(y[k]))));
      tip(e, () => { const list = yieldBreakdown(g, city, k); return tipBox(t('resource.' + k), list.map(x => x.value === null ? x.label : x.label + ': ' + fmtSigned(x.value)).concat([t('sc.total') + ': ' + fmtSigned(num(y[k]))])); });
      row.appendChild(e);
    }
    return row;
  }
  function cityQueue(g, city, isOwn, perTurn) {
    const box = mk('div', { class: 'sc-queue' }, mk('div', { class: 'sc-h' }, t('city.queue')));
    const q = city.queue || [];
    if (!q.length) { box.appendChild(emptyNote(t('city.queueEmpty'))); return box; }
    q.forEach((item, i) => {
      const cost = itemCost(g, city, item);
      const prog = num(item.progress);
      const row = mk('div', { class: 'sc-row' + (i === 0 ? ' selected' : '') }, itemIcon(item, 32),
        mk('div', { class: 'grow' }, mk('div', { class: 'name' }, (i === 0 ? t('city.current') + ': ' : '') + itemName(item)),
          i === 0 ? progress(prog, cost, { color: '#e08a3c', label: fmt(prog) + ' / ' + fmt(cost) + '  ·  ' + turnsText(turnsFor(cost - prog, perTurn)), height: 14 }) : mk('div', { class: 'sub' }, fmt(cost) + ' ' + t('resource.production') + ' · ' + turnsText(turnsFor(cost - prog, perTurn)))));
      if (isOwn) {
        const mv = fn('Rules', 'moveQueueItem');
        const swap = (a, b) => { if (mv) mv(g, city, a, b); else { const tmp = q[a]; q[a] = q[b]; q[b] = tmp; } after('city'); };
        row.appendChild(btn('▲', () => swap(i, i - 1), { small: true, kind: 'ghost', disabled: i === 0, tooltip: t('city.up') }));
        row.appendChild(btn('▼', () => swap(i, i + 1), { small: true, kind: 'ghost', disabled: i >= q.length - 1, tooltip: t('city.down') }));
        row.appendChild(btn('✕', () => { const f = fn('Rules', 'dequeue'); if (f) f(g, city, i); else q.splice(i, 1); after('city'); }, { small: true, kind: 'danger', tooltip: t('city.remove') }));
      }
      box.appendChild(row);
    });
    return box;
  }
  function buildableBuildings(g, city, player) {
    const f = fn('Rules', 'buildableBuildings');
    if (f) { try { const r = f(g, city); if (Array.isArray(r)) return r.map(x => (typeof x === 'string' ? x : x.id)); } catch (e) { /* fall through */ } }
    const built = new Set(city.buildings || []);
    return D().list('buildings').filter(b => !built.has(b.id) && b.tier <= Math.max(1, city.tier) && (!b.culture || (player && b.culture === player.cultureId)) && (b.prereq || []).every(p => built.has(p))).map(b => b.id);
  }
  function buildTab(ctx, g, city, player, isOwn, perTurn) {
    const ids = buildableBuildings(g, city, player);
    const queued = new Set((city.queue || []).filter(q => q.type === 'building').map(q => q.id));
    const box = mk('div');
    if (!ids.length) { box.appendChild(emptyNote(t('city.noBuildings'))); return box; }
    const byCat = {};
    for (const id of ids) { const b = get('buildings', id); if (!b) continue; (byCat[b.category || 'economy'] = byCat[b.category || 'economy'] || []).push(b); }
    for (const cat of CATS) {
      const list = byCat[cat]; if (!list || !list.length) continue;
      box.appendChild(mk('div', { class: 'sc-catname' }, icon(CAT_ICON[cat], 14), ' ' + t('city.cat.' + cat)));
      for (const b of list.sort((a, c) => a.tier - c.tier)) {
        const isQ = queued.has(b.id);
        const cost = num(b.cost && b.cost.production, 0);
        const row = mk('div', { class: 'sc-row' + (isQ ? ' disabled' : '') }, icon(CAT_ICON[cat], 30),
          mk('div', { class: 'grow' }, mk('div', { class: 'name' }, L(b.name), ' ', mk('span', { class: 'sc-badge' }, 'T' + b.tier)), mk('div', { class: 'sub' }, effectChips(b.effects))),
          mk('div', null, costRow(b.cost), mk('div', { class: 'sub', style: 'text-align:right' }, turnsText(turnsFor(cost, perTurn)))),
          isOwn ? btn(isQ ? t('city.queued') : t('city.build'), () => { const f = fn('Rules', 'enqueue'); if (!f) { toast('warn', t('sc.unavailable')); return; } if (result(f(g, city, { type: 'building', id: b.id }))) sfx('ui_click'); after('city'); }, { kind: 'primary', small: true, disabled: isQ }) : null);
        tip(row, () => tipBox(L(b.name), [L(b.desc), mk('p', null, mk('b', null, t('sc.effects') + ': '), Screens.effectsText(b.effects) || t('sc.none')),
          b.upkeep && b.upkeep.gold ? mk('p', null, t('sc.upkeep') + ': ' + b.upkeep.gold + ' ' + t('resource.gold') + t('sc.perTurn')) : null,
          b.prereq && b.prereq.length ? mk('p', null, t('sc.prereq') + ': ' + b.prereq.map(p => { const d = get('buildings', p); return d ? L(d.name) : p; }).join(', ')) : null]));
        box.appendChild(row);
      }
    }
    return box;
  }
  function recruitableUnits(g, city, player) {
    const f = fn('Rules', 'recruitableUnits');
    if (f) { try { const r = f(g, city); if (Array.isArray(r)) return r.map(x => (typeof x === 'string' ? x : x.id)); } catch (e) { /* fall through */ } }
    const culture = player && get('cultures', player.cultureId);
    let maxTier = 1;
    for (const b of city.buildings || []) { const bd = get('buildings', b); if (bd && bd.effects && bd.effects.unitTier) maxTier = Math.max(maxTier, bd.effects.unitTier); }
    const ids = culture ? (culture.units || []).filter(id => { const u = get('units', id); return u && u.tier <= maxTier; }) : [];
    return ids;
  }
  function unitStatsLine(u) {
    const atk = (u.attacks || [])[0];
    return mk('div', { class: 'sub' }, mk('span', { class: 'sc-stat' }, icon('hp', 13), String(num(u.hp))), mk('span', { class: 'sc-stat' }, icon('def', 13), String(num(u.def))),
      mk('span', { class: 'sc-stat' }, icon('res', 13), String(num(u.res))), atk ? mk('span', { class: 'sc-stat' }, icon(atk.channel || 'physical', 13), String(num(atk.damage)) + (atk.range > 1 ? ' (' + atk.range + ')' : '')) : null,
      mk('span', { class: 'sc-stat' }, icon('move', 13), String(num(u.mp, 32))));
  }
  function unitTip(u) {
    return tipBox(L(u.name) + ' — ' + t('tier.' + u.tier) + ' ' + t('role.' + u.role), [L(u.desc),
      mk('p', null, (u.attacks || []).map(a => L(a.name) + ': ' + a.damage + ' ' + t('channel.' + (a.channel || 'physical')) + (a.type === 'ranged' ? ' / ' + t('stat.range') + ' ' + a.range : '') + ' / ' + t('stat.accuracy') + ' ' + num(a.accuracy, 85) + '%').join(' · ')),
      (u.abilities || []).concat(u.passives || []).length ? mk('p', null, mk('b', null, t('enc.abilities') + ': '), (u.abilities || []).concat(u.passives || []).map(a => { const d = get('abilities', a); return d ? L(d.name) : a; }).join(', ')) : null,
      u.upkeep ? mk('p', null, t('sc.upkeep') + ': ' + Object.keys(u.upkeep).filter(k => u.upkeep[k]).map(k => u.upkeep[k] + ' ' + t('resource.' + k)).join(', ')) : null]);
  }
  function recruitTab(ctx, g, city, player, isOwn, perTurn) {
    const ids = recruitableUnits(g, city, player);
    const box = mk('div');
    if (!ids.length) { box.appendChild(emptyNote(t('city.noUnits'))); return box; }
    const can = fn('Rules', 'canRecruit');
    for (const id of ids.map(i => get('units', i)).filter(Boolean).sort((a, b) => a.tier - b.tier)) {
      let ok = { ok: true };
      if (can) { try { ok = can(g, city, id.id) || ok; } catch (e) { ok = { ok: true }; } }
      const row = mk('div', { class: 'sc-row' + (ok.ok === false ? ' disabled' : '') }, Screens.unitPortrait(id, 52, { pid: city.owner }),
        mk('div', { class: 'grow' }, mk('div', { class: 'name' }, L(id.name), ' ', mk('span', { class: 'sc-badge' }, 'T' + id.tier), ' ', icon('role_' + id.role, 16), mk('span', { class: 'sub' }, ' ' + t('role.' + id.role))), unitStatsLine(id)),
        mk('div', null, costRow(id.cost), mk('div', { class: 'sub', style: 'text-align:right' }, turnsText(turnsFor(itemCost(g, city, { type: 'unit', id: id.id }), perTurn)))),
        isOwn ? btn(t('city.recruit'), () => { const f = fn('Rules', 'enqueue'); if (!f) { toast('warn', t('sc.unavailable')); return; } result(f(g, city, { type: 'unit', id: id.id })); sfx('recruit'); after('city'); }, { kind: 'primary', small: true, disabled: ok.ok === false, tooltip: ok.ok === false ? reasonText(ok) : '' }) : null);
      tip(row, () => { const b = unitTip(id); if (ok.ok === false) b.appendChild(mk('p', { class: 'bad' }, t('sc.reason') + ': ' + reasonText(ok))); return b; });
      box.appendChild(row);
    }
    return box;
  }
  function provinceLabel(g, p) {
    const terr = S() ? S().TERRAINS[p.terrain] : String(p.terrain);
    const feat = S() ? S().FEATURES[p.feature] : null;
    const featDef = feat && feat !== 'none' && has('features', feat) ? get('features', feat) : null;
    return t('terrain.' + terr) + (featDef ? ' · ' + L(featDef.name) : (feat && feat !== 'none' ? ' · ' + feat : ''));
  }
  function buildableImprovements(g, city, p, player) {
    const f = fn('Rules', 'buildableImprovements');
    if (f) { try { const r = f(g, city, p.id); if (Array.isArray(r)) return r.map(x => (typeof x === 'string' ? x : x.id)); } catch (e) { /* fall through */ } }
    const terr = S() ? S().TERRAINS[p.terrain] : null, feat = S() ? S().FEATURES[p.feature] : 'none';
    const known = new Set(player ? player.tomes || [] : []);
    return D().list('improvements').filter(i => {
      if (i.tome && !known.has(i.tome)) return false;
      if (i.resource) return i.resource === p.resource;
      if (i.material) return i.material === p.magicMaterial;
      if (i.terrain && !i.terrain.includes(terr)) return false;
      if (i.feature && !i.feature.includes(feat === 'none' ? null : feat)) return false;
      return true;
    }).map(i => i.id);
  }
  function annexableProvinces(g, city) {
    const f = fn('Rules', 'annexableProvinces');
    if (f) { try { const r = f(g, city); if (Array.isArray(r)) return r.map(x => (typeof x === 'number' ? x : x.id)); } catch (e) { /* fall through */ } }
    const owned = new Set(city.provinces || []);
    const out = new Set();
    for (const pid of owned) { const p = g.provinces[pid]; if (!p) continue; for (const h of p.hexes) for (const n of (S() ? S().neighbors(g, h) : [])) { const q = g.province[n]; if (q >= 0 && !owned.has(q) && g.provinces[q] && g.provinces[q].owner < 0 && g.provinces[q].cityId < 0) out.add(q); } }
    return Array.from(out);
  }
  function annexCost(g, city) {
    const f = fn('Rules', 'annexCost');
    if (f) { try { const c = f(g, city); if (typeof c === 'number') return { imperium: c }; if (c && typeof c === 'object') return c; } catch (e) { /* ignore */ } }
    const C = rulesC(); return { imperium: num(C.ANNEX_BASE, 40) + (city.provinces ? city.provinces.length : 0) * 10 };
  }
  function provincesTab(ctx, g, city, player, isOwn) {
    const box = mk('div', { class: 'sc-grid2' });
    const left = mk('div', null, mk('div', { class: 'sc-h' }, t('city.ownedProvinces') + ' (' + (city.provinces || []).length + ')'));
    for (const pid of city.provinces || []) {
      const p = g.provinces[pid]; if (!p) continue;
      const imp = p.improvement ? get('improvements', p.improvement) : null;
      const isHome = g.province[city.hex] === pid;
      const row = mk('div', { class: 'sc-row' }, icon(imp ? 'node' : (p.resource || 'grass'), 26),
        mk('div', { class: 'grow' }, mk('div', { class: 'name' }, provinceLabel(g, p), isHome ? mk('span', { class: 'sc-badge' }, t('city.homeProvince')) : null),
          mk('div', { class: 'sub' }, p.resource ? mk('span', { class: 'sc-chip' }, icon(p.resource, 12), t('resource.' + p.resource)) : null, p.magicMaterial ? mk('span', { class: 'sc-chip' }, icon('mana', 12), t('city.material') + ': ' + p.magicMaterial) : null,
            imp ? mk('span', { class: 'sc-chip gold' }, L(imp.name) + (imp.yields ? ' (' + Screens.effectsText(imp.yields) + ')' : '')) : mk('span', { class: 'dim' }, t('city.noImprovement')))));
      if (isOwn && !imp) {
        const opts = buildableImprovements(g, city, p, player);
        if (opts.length) {
          const sel = mk('select', { class: 'sc-input' }, mk('option', { value: '' }, t('city.buildImprovement')));
          for (const id of opts) { const d = get('improvements', id); if (d) sel.appendChild(mk('option', { value: id }, L(d.name) + ' — ' + Object.keys(d.cost || {}).filter(k => d.cost[k]).map(k => d.cost[k] + ' ' + t('resource.' + k)).join(', '))); }
          sel.onchange = () => { if (!sel.value) return; const f = fn('Rules', 'buildImprovement'); if (!f) { toast('warn', t('sc.unavailable')); sel.value = ''; return; } result(f(g, city, pid, sel.value)); after('city'); };
          row.appendChild(sel);
        }
      }
      row.appendChild(btn(t('sc.viewOnMap'), () => centerOn(p.center), { small: true, kind: 'ghost' }));
      left.appendChild(row);
    }
    const right = mk('div', null, mk('div', { class: 'sc-h' }, t('city.annexable')));
    const ann = annexableProvinces(g, city);
    const cost = annexCost(g, city);
    if (!ann.length) right.appendChild(emptyNote(t('city.noAnnex')));
    else {
      right.appendChild(mk('div', { class: 'sub', style: 'margin-bottom:6px' }, t('city.annexCost') + ': ', costRow(cost)));
      for (const pid of ann) {
        const p = g.provinces[pid]; if (!p) continue;
        const afford = !player || RES_KEYS.concat(['imperium']).every(k => !cost[k] || num(player.resources[k]) >= cost[k]);
        const row = mk('div', { class: 'sc-row' }, icon(p.resource || 'grass', 26),
          mk('div', { class: 'grow' }, mk('div', { class: 'name' }, provinceLabel(g, p)), mk('div', { class: 'sub' }, p.resource ? mk('span', { class: 'sc-chip' }, icon(p.resource, 12), t('resource.' + p.resource)) : null, p.magicMaterial ? mk('span', { class: 'sc-chip' }, t('city.material') + ': ' + p.magicMaterial) : null, ' ' + p.hexes.length + ' hex')),
          btn(t('sc.viewOnMap'), () => centerOn(p.center), { small: true, kind: 'ghost' }),
          isOwn ? btn(t('city.annex'), () => { const f = fn('Rules', 'annexProvince'); if (!f) { toast('warn', t('sc.unavailable')); return; } if (result(f(g, city, pid))) sfx('coin'); after('city'); }, { kind: 'primary', small: true, disabled: !afford, tooltip: afford ? '' : t('city.cannotAfford') }) : null);
        right.appendChild(row);
      }
    }
    box.append(left, right);
    return box;
  }
  function garrisonUnits(g, city) {
    const seen = new Set(); const out = [];
    const add = (army) => { if (!army) return; for (const u of S().unitsOf(g, army)) if (!seen.has(u.id)) { seen.add(u.id); out.push(u); } };
    if (city.garrisonArmyId >= 0) add(S().army(g, city.garrisonArmyId));
    for (const a of S().armiesAt(g, city.hex)) if (a.owner === city.owner) add(a);
    return out;
  }
  function unitCard(u, o) {
    const f = fn('UI', 'unitCard');
    if (f) { try { const e = f(u.id !== undefined ? u.id : u, o || {}); if (e) return e; } catch (e) { /* fall through */ } }
    const type = S().unitType(u);
    const c = mk('div', { class: 'sc-ucard', onclick: o && o.onClick }, Screens.unitPortrait(u, 64), mk('div', { class: 'name' }, u.name || L(type.name)), mk('div', { class: 'sub' }, 'T' + type.tier + ' ' + t('role.' + type.role) + (u.rank ? ' ★' + u.rank : '')),
      progress(num(u.hp), num(u.maxHp, 1), { color: '#d8342c', label: num(u.hp) + '/' + num(u.maxHp), height: 12 }));
    tip(c, () => unitTip(type));
    return c;
  }
  function garrisonTab(ctx, g, city) {
    const units = garrisonUnits(g, city);
    if (!units.length) return emptyNote(t('city.garrisonEmpty'));
    const box = mk('div', { class: 'sc-units' });
    for (const u of units) box.appendChild(unitCard(u, { small: true, showStats: true }));
    return box;
  }
  function spellRow(spellId, o) {
    o = o || {};
    const sp = get('spells', spellId);
    const f = fn('UI', 'spellRow');
    if (f && !o.custom) { try { const e = f(spellId, o); if (e) return e; } catch (e) { /* fall through */ } }
    const aff = sp ? AFFS.find(a => sp.affinity && sp.affinity[a]) : null;
    const row = mk('div', { class: 'sc-row' + (o.disabled ? ' disabled' : '') }, icon(aff || 'mana', 26),
      mk('div', { class: 'grow' }, mk('div', { class: 'name' }, sp ? L(sp.name) : spellId, sp ? mk('span', { class: 'sc-badge' }, t('spell.tier', { n: sp.tier })) : null, sp && sp.kind ? mk('span', { class: 'sub' }, ' ' + t('spell.kind.' + sp.kind)) : null),
        mk('div', { class: 'sub' }, sp ? L(sp.desc) : '')),
      sp ? mk('div', null, mk('div', { class: 'sc-cost' }, sp.cost && sp.cost.mana ? res('mana', sp.cost.mana) : null, sp.cost && sp.cost.cp ? mk('span', { class: 'sc-res' }, icon('casting', 14), fmt(sp.cost.cp)) : null),
        sp.upkeep && sp.upkeep.mana ? mk('div', { class: 'sub', style: 'text-align:right' }, t('sc.upkeep') + ' ', res('mana', sp.upkeep.mana), t('sc.perTurn')) : null) : null,
      o.onCast ? btn(t('spell.cast'), () => o.onCast(spellId), { kind: 'primary', small: true, disabled: !!o.disabled, tooltip: o.reason || '' }) : null,
      o.onDispel ? btn(t('spell.dispel'), () => o.onDispel(spellId), { kind: 'danger', small: true }) : null);
    if (sp) tip(row, () => tipBox(L(sp.name), [L(sp.desc), sp.target ? mk('p', null, t('spell.target') + ': ' + t('spell.target.' + sp.target)) : null, sp.enchant && sp.enchant.effects ? mk('p', null, t('sc.effects') + ': ' + Screens.effectsText(sp.enchant.effects)) : null, sp.effect && sp.effect.type ? mk('p', { class: 'dim' }, sp.effect.type + (sp.effect.amount ? ' ' + sp.effect.amount : '') + (sp.effect.channel ? ' ' + t('channel.' + sp.effect.channel) : '')) : null, o.reason ? mk('p', { class: 'bad' }, o.reason) : null]));
    return row;
  }
  function magicTab(ctx, g, city, player, isOwn) {
    const box = mk('div');
    const ench = city.enchantments || [];
    if (!ench.length) { box.appendChild(emptyNote(t('city.enchantEmpty'))); return box; }
    for (const id of ench) box.appendChild(spellRow(id, { custom: true, onDispel: isOwn ? () => { const f = fn('Rules', 'dispel'); if (!f) { toast('warn', t('sc.unavailable')); return; } result(f(g, player, id, { cityId: city.id })); after('city'); } : null }));
    return box;
  }

  defineScreen('city', {
    title: () => t('city.title'),
    build(ctx) {
      const g = game(); if (!g) return emptyNote(t('sc.noGame'));
      const city = S().city(g, ctx.params.cityId) || (ctx.params.hex !== undefined ? S().cityAt(g, ctx.params.hex) : null);
      if (!city) return emptyNote(t('sc.notFound'));
      const player = city.owner >= 0 ? g.players[city.owner] : null;
      const isOwn = !!(player && player.isHuman);
      const y = cityYields(g, city);
      const perTurn = num(y.production);
      const tab = ctx.state.tab || 'build';
      const setTab = (id) => { ctx.state.tab = id; refreshScreen('city'); };
      const garrisonCount = garrisonUnits(g, city).length;
      const body = [cityHeader(ctx, g, city, player, isOwn), cityYieldRow(g, city), cityQueue(g, city, isOwn, perTurn),
        tabs([{ id: 'build', label: t('city.tab.build'), icon: 'city' }, { id: 'recruit', label: t('city.tab.recruit'), icon: 'draft' }, { id: 'provinces', label: t('city.tab.provinces'), icon: 'node', count: (city.provinces || []).length },
          { id: 'garrison', label: t('city.tab.garrison'), icon: 'army', count: garrisonCount }, { id: 'magic', label: t('city.tab.magic'), icon: 'mana', count: (city.enchantments || []).length }], tab, setTab)];
      if (tab === 'build') body.push(buildTab(ctx, g, city, player, isOwn, perTurn));
      else if (tab === 'recruit') body.push(recruitTab(ctx, g, city, player, isOwn, perTurn));
      else if (tab === 'provinces') body.push(provincesTab(ctx, g, city, player, isOwn));
      else if (tab === 'garrison') body.push(garrisonTab(ctx, g, city));
      else if (tab === 'magic') body.push(magicTab(ctx, g, city, player, isOwn));
      return body;
    },
  });

  // ================================================================ RESEARCH
  const AFF_SCALE = 24;
  function itemTypeIcon(type) { return { spell: 'spellbook', unit: 'draft', improvement: 'node', skill: 'star', empire: 'empire', building: 'city', transformation: 'star' }[type] || 'scroll'; }
  function contentDef(c) {
    const kindMap = { spell: 'spells', unit: 'units', improvement: 'improvements', skill: 'heroSkills', empire: 'empireSkills', building: 'buildings', transformation: 'transformations' };
    const kind = kindMap[c.type];
    return kind && has(kind, c.id) ? get(kind, c.id) : null;
  }
  function researchAffinityBars(g, player) {
    const box = mk('div', { class: 'sc-affbars' });
    for (const a of AFFS) {
      const v = num(player.affinity && player.affinity[a]);
      box.appendChild(mk('div', { class: 'sc-affbar' }, icon(a, 18), mk('span', { class: 'aname' }, t('affinity.' + a)), mk('div', { class: 'abar' }, progress(Math.min(v, AFF_SCALE), AFF_SCALE, { color: null, label: String(v), height: 12 }))));
    }
    return box;
  }
  function tomesByTier() {
    const byTier = {};
    for (const tm of D().list('tomes')) (byTier[tm.tier] = byTier[tm.tier] || []).push(tm);
    for (const k of Object.keys(byTier)) byTier[k].sort((a, b) => L(a.name).localeCompare(L(b.name)));
    return byTier;
  }
  function tomeState(g, player, tome) {
    const owned = (player.tomes || []).includes(tome.id);
    let locked = false, reason = '';
    const f = fn('Rules', 'tomeLockReason');
    if (!owned && f) {
      try { const r = f(g, player, tome.id); if (r) { locked = true; reason = typeof r === 'object' ? L(r) : (AOW.I18n && AOW.I18n.has && AOW.I18n.has(r) ? t(r) : r); } }
      catch (e) { /* ignore */ }
    }
    return { owned, locked, reason };
  }
  function tomeShelf(ctx, g, player) {
    const byTier = tomesByTier();
    const box = mk('div', { class: 'sc-shelf' });
    for (let tier = 1; tier <= 5; tier++) {
      const list = byTier[tier]; if (!list || !list.length) continue;
      const row = mk('div', { class: 'sc-shelf-row' }, mk('div', { class: 'sc-shelf-tier' }, t('research.tierRow', { n: tier })));
      for (const tm of list) {
        const st = tomeState(g, player, tm);
        const b = mk('div', { class: 'sc-book' + (st.owned ? ' owned' : '') + (st.locked ? ' locked' : ''), onclick: () => { ctx.state.viewTome = tm.id; refreshScreen('research'); } },
          tomeIcon(tm.id, 44), mk('div', { class: 'affs' }, affIcons(tm.affinity, 9)),
          st.locked ? mk('span', { class: 'lock' }, icon('lock', 12)) : null,
          mk('div', { class: 'bname' }, L(tm.name)));
        tip(b, () => tipBox(L(tm.name), [L(tm.desc), tm.passive && tm.passive.desc ? mk('p', null, mk('b', null, t('research.passive') + ': '), L(tm.passive.desc)) : null,
          st.locked && st.reason ? mk('p', { class: 'bad' }, st.reason) : null]));
        row.appendChild(b);
      }
      box.appendChild(row);
    }
    return box;
  }
  function tomeContentsPanel(ctx, g, player) {
    const tomeId = ctx.state.viewTome || (player.research && player.research.current && player.research.current.tomeId) || (player.tomes || [])[0];
    const tome = tomeId ? get('tomes', tomeId) : null;
    const box = mk('div');
    if (!tome) { box.appendChild(emptyNote(t('research.pickTome'))); return box; }
    box.appendChild(mk('div', { class: 'sc-h' }, L(tome.name), ' ', mk('span', { class: 'sc-badge' }, t('research.tierRow', { n: tome.tier }))));
    box.appendChild(mk('div', { class: 'sub' }, L(tome.desc)));
    if (tome.passive && tome.passive.desc) box.appendChild(mk('div', { class: 'sub gold', style: 'margin-top:4px' }, t('research.passive') + ': ' + L(tome.passive.desc)));
    const owned = (player.tomes || []).includes(tome.id);
    if (!owned) {
      const st = tomeState(g, player, tome);
      box.appendChild(btn(t('research.select'), () => {
        const f = fn('Rules', 'selectTome');
        if (!f) { toast('warn', t('sc.unavailable')); return; }
        if (result(f(g, player, tome.id))) sfx('coin');
        after('research');
      }, { kind: 'primary', disabled: st.locked, tooltip: st.locked ? st.reason : t('research.selectTip'), style: 'margin-top:8px' }));
    }
    box.appendChild(mk('div', { class: 'sc-h', style: 'margin-top:12px' }, t('research.contents')));
    const done = new Set((player.research && player.research.done) || []);
    const current = player.research && player.research.current;
    if (!(tome.contents || []).length) box.appendChild(emptyNote(t('sc.none')));
    for (const c of tome.contents || []) {
      const d = contentDef(c);
      const isDone = done.has(c.id);
      const isCurrent = !!(current && current.tomeId === tome.id && current.contentId === c.id);
      const row = mk('div', { class: 'sc-row' + (isDone ? ' disabled' : '') }, icon(itemTypeIcon(c.type), 28),
        mk('div', { class: 'grow' }, mk('div', { class: 'name' }, d ? L(d.name) : c.id, ' ', mk('span', { class: 'sc-badge' }, t('research.type.' + c.type))),
          isCurrent ? progress(num(player.research.progress), c.cost, { color: '#e08a3c', label: fmt(num(player.research.progress)) + ' / ' + fmt(c.cost), height: 14 })
            : mk('div', { class: 'sub' }, res('knowledge', c.cost, { size: 14 }))),
        isDone ? mk('span', { class: 'sc-badge good' }, t('research.researched'))
          : (owned ? btn(isCurrent ? t('research.current') : t('research.start'), () => {
              const f = fn('Rules', 'startResearch'); if (!f) { toast('warn', t('sc.unavailable')); return; }
              if (result(f(g, player, tome.id, c.id))) sfx('ui_click'); after('research');
            }, { kind: 'primary', small: true, disabled: isCurrent }) : null));
      if (d) tip(row, () => tipBox(L(d.name), [L(d.desc), d.effects ? mk('p', null, Screens.effectsText(d.effects)) : null]));
      box.appendChild(row);
    }
    return box;
  }
  defineScreen('research', {
    title: () => t('research.title'), width: 1180,
    build(ctx) {
      const g = game(); if (!g) return emptyNote(t('sc.noGame'));
      const player = human(g); if (!player) return emptyNote(t('sc.notFound'));
      return mk('div', { class: 'sc-cols' },
        mk('div', { class: 'sc-col' }, researchAffinityBars(g, player), mk('div', { class: 'sc-h' }, t('research.tomes')), tomeShelf(ctx, g, player)),
        mk('div', { class: 'sc-col sc-col-side' }, tomeContentsPanel(ctx, g, player)));
    },
  });

  // ================================================================ SPELLBOOK
  const SPELL_KIND_ORDER = ['combat', 'world', 'unit_enchant', 'city_enchant', 'summon', 'transform', 'empire', 'strategic'];
  defineScreen('spellbook', {
    title: () => t('spell.title'), width: 1000,
    build(ctx) {
      const g = game(); if (!g) return emptyNote(t('sc.noGame'));
      const player = human(g); if (!player) return emptyNote(t('sc.notFound'));
      const known = (player.spells && player.spells.known) || [];
      const active = (player.spells && player.spells.active) || [];
      const body = [mk('div', { class: 'sc-h' }, t('spell.known') + ' (' + known.length + ')')];
      if (!known.length) body.push(emptyNote(t('spell.noneKnown')));
      else {
        const byKind = {};
        for (const id of known) { const sp = get('spells', id); if (sp) (byKind[sp.kind] = byKind[sp.kind] || []).push(sp); }
        for (const k of SPELL_KIND_ORDER) {
          const list = byKind[k]; if (!list || !list.length) continue;
          body.push(mk('div', { class: 'sc-catname' }, t('spell.kind.' + k)));
          for (const sp of list.sort((a, b) => a.tier - b.tier)) {
            const isActive = active.some(a => a.spellId === sp.id);
            const combatOnly = sp.kind === 'combat';
            const reason = combatOnly ? t('spell.combatOnly') : (isActive ? t('rules.reason.alreadyActive') : '');
            body.push(spellRow(sp.id, {
              custom: true, disabled: isActive || combatOnly, reason,
              onCast: () => {
                const castFn = fn('Rules', 'castSpell'); if (!castFn) { toast('warn', t('sc.unavailable')); return; }
                if (combatOnly) { toast('warn', t('spell.combatOnly')); return; }
                const canFn = fn('Rules', 'canCast');
                const target = { playerId: player.id };
                if (canFn) { const c = canFn(g, player, sp.id, target); if (c && c.ok === false) { toast('warn', reasonText(c)); return; } }
                if (result(castFn(g, player, sp.id, target))) sfx('spell_cast_' + (AFFS.find(a => sp.affinity && sp.affinity[a]) || 'astral'));
                after('spellbook');
              },
            }));
          }
        }
      }
      body.push(mk('div', { class: 'sc-h', style: 'margin-top:12px' }, t('spell.active') + ' (' + active.length + ')'));
      if (!active.length) body.push(emptyNote(t('spell.noneActive')));
      else for (const a of active) body.push(spellRow(a.spellId, { custom: true, onDispel: () => { const f = fn('Rules', 'dispel'); if (!f) { toast('warn', t('sc.unavailable')); return; } result(f(g, player, a.spellId, a.target)); after('spellbook'); } }));
      return body;
    },
  });

  // ================================================================ HERO
  const HERO_SLOTS = ['weapon', 'offhand', 'armor', 'helm', 'trinket', 'mount'];
  function heroList(g, player) { return S() && S().playerHeroes ? S().playerHeroes(g, player.id) : g.heroes.filter(h => h.owner === player.id); }
  function heroXpNeed(g, hero) {
    // Rules.heroXpForLevel(level) takes the level number (the xp needed to leave it)
    const f = fn('Rules', 'heroXpForLevel');
    if (f) { try { const n = f(hero.level || 1); if (n > 0) return n; } catch (e) { /* ignore */ } }
    const C = rulesC();
    return Math.round(num(C.HERO_XP_PER_LEVEL, 60) * Math.pow(1.15, Math.max(0, (hero.level || 1) - 1)));
  }
  const tomeOfSkill = (id) => { const f = fn('Rules', 'tomeOfSkill'); return f ? f(id) : null; };
  function heroSkillsFor(hero, player) {
    const all = D().list('heroSkills');
    const unlocked = (player && player.unlocked && player.unlocked.skills) || [];
    return {
      classList: all.filter(s => s.class === hero.classId),
      // tome-taught skills join the list once researched (before that they are research rewards, not choices)
      generalList: all.filter(s => !s.class && !s.rulerType && (!tomeOfSkill(s.id) || unlocked.includes(s.id) || (hero.skills || []).includes(s.id))),
      rulerList: hero.isRuler ? all.filter(s => s.rulerType && s.rulerType === hero.rulerType) : [],
    };
  }
  function heroAvailable(game, hero, skillId) {
    const f = fn('Rules', 'heroAvailableSkills');
    if (f) {
      try { const list = f(game, hero); if (Array.isArray(list)) return list.map(x => (typeof x === 'string' ? x : x.id)).includes(skillId); }
      catch (e) { /* ignore */ }
    }
    const sk = get('heroSkills', skillId); if (!sk) return false;
    if ((hero.skills || []).includes(skillId)) return false;
    if (num(hero.skillPoints) <= 0) return false;
    if ((hero.level || 1) < (sk.minLevel || 1)) return false;
    return (sk.prereq || []).every(p => (hero.skills || []).includes(p));
  }
  function heroStatsRow(g, hero, unit) {
    let s = null;
    const f1 = fn('Rules', 'heroStats'); if (f1) { try { s = f1(g, hero); } catch (e) { s = null; } }
    if (!s && unit) { const f2 = fn('Rules', 'unitStats'); if (f2) { try { s = f2(g, unit); } catch (e) { s = null; } } }
    const type = unit ? S().unitType(unit) : null;
    const maxHp = (s && (s.maxHp || s.hp)) || (unit && unit.maxHp) || (type && type.hp) || 0;
    const cur = unit ? unit.hp : maxHp;
    const def = (s && s.def !== undefined) ? s.def : (type ? type.def : 0);
    const resV = (s && s.res !== undefined) ? s.res : (type ? type.res : 0);
    const mp = (s && s.mp !== undefined) ? s.mp : (type ? type.mp : 0);
    const atk = (s && s.attacks && s.attacks[0]) || (type && type.attacks && type.attacks[0]) || null;
    const chip = (iconName, value) => mk('span', { class: 'sc-yield' }, icon(iconName, 20), mk('b', null, String(value)));
    return mk('div', { class: 'sc-yields' }, chip('hp', fmt(cur) + '/' + fmt(maxHp)), chip('def', def), chip('res', resV), chip('move', mp), atk ? chip(atk.channel || 'physical', atk.damage) : null);
  }
  function skillCard(game, hero, sk) {
    const learned = (hero.skills || []).includes(sk.id);
    // Rules.heroAvailableSkills lists what is unlocked, not what is affordable: a point is needed too
    const avail = !learned && heroAvailable(game, hero, sk.id) && num(hero.skillPoints) > 0 && !hero.dead;
    const cls = 'sc-skill' + (learned ? ' learned' : '') + (avail ? ' available' : (!learned ? ' locked' : '')) + (sk.signature ? ' signature' : '');
    const abilDef = sk.ability ? get('abilities', sk.ability) : null;
    let lockReason = '';
    if (!learned && !avail) {
      if ((hero.level || 1) < (sk.minLevel || 1)) lockReason = t('hero.minLevel', { n: sk.minLevel || 1 });
      else if ((sk.prereq || []).some(p => !(hero.skills || []).includes(p))) lockReason = t('hero.needPrereq');
      else if (num(hero.skillPoints) <= 0) lockReason = t('hero.noPoints');
      else if (hero.dead) lockReason = t('hero.dead');
      else if (sk.tome || tomeOfSkill(sk.id)) { const tid = sk.tome || tomeOfSkill(sk.id), tm = get('tomes', tid); lockReason = t('hero.needTome', { name: tm ? L(tm.name) : tid }); }
    }
    const card = mk('div', { class: cls },
      mk('div', { class: 'sname' }, sk.signature ? icon('star', 12) : null, ' ', L(sk.name)),
      mk('div', { class: 'sdesc' }, L(sk.desc)),
      learned ? mk('span', { class: 'sc-badge good' }, t('hero.learned'))
        : btn(t('hero.learn'), () => { const f = fn('Rules', 'heroLevelUp'); if (!f) { toast('warn', t('sc.unavailable')); return; } if (result(f(game, hero, sk.id))) sfx('level_up'); after('hero'); },
          { kind: 'primary', small: true, disabled: !avail, tooltip: lockReason }));
    tip(card, () => tipBox(L(sk.name), [L(sk.desc), abilDef ? mk('p', null, mk('b', null, t('hero.grants') + ': '), L(abilDef.name)) : (sk.effects && Object.keys(sk.effects).length ? mk('p', null, Screens.effectsText(sk.effects)) : null),
      mk('p', { class: 'dim' }, t('hero.minLevel', { n: sk.minLevel || 1})), lockReason ? mk('p', { class: 'bad' }, lockReason) : null]));
    return card;
  }
  function skillColumns(game, hero, list) {
    const cols = mk('div', { class: 'sc-skillcols' });
    for (let tier = 1; tier <= 3; tier++) {
      const col = mk('div', { class: 'sc-skillcol' });
      for (const sk of list.filter(s => (s.tier || 1) === tier && !s.signature)) col.appendChild(skillCard(game, hero, sk));
      cols.appendChild(col);
    }
    return cols;
  }
  function signatureRow(game, hero, list) {
    const sigs = list.filter(s => s.signature);
    if (!sigs.length) return null;
    return mk('div', null, mk('div', { class: 'sc-h' }, t('hero.signature')), mk('div', { class: 'sc-skillcols' }, mk('div', { class: 'sc-skillcol' }, sigs.map(sk => skillCard(game, hero, sk)))));
  }
  function equipmentPanel(ctx, game, player, hero) {
    const box = mk('div', { class: 'sc-slots' });
    for (const slot of HERO_SLOTS) {
      const itemId = hero.items && hero.items[slot];
      const item = itemId ? get('items', itemId) : null;
      const cell = mk('div', { class: 'sc-slot' + (item ? ' rar-' + item.rarity : ''), onclick: () => { ctx.state.slotPick = ctx.state.slotPick === slot ? null : slot; refreshScreen('hero'); } },
        icon(item ? (item.icon || ('item_' + slot)) : ('item_' + slot), 26),
        mk('div', { class: 'sname' }, t('hero.slot.' + slot)),
        mk('div', { class: 'iname' + (item ? ' c-' + item.rarity : '') }, item ? L(item.name) : t('sc.none')));
      if (item) tip(cell, () => tipBox(L(item.name), [t('rarity.' + item.rarity), L(item.desc), Object.keys(item.effects || {}).length ? mk('p', null, Screens.effectsText(item.effects)) : null]));
      box.appendChild(cell);
    }
    return box;
  }
  function inventoryPanel(ctx, game, player, hero) {
    const items = (player.items || []).map(id => get('items', id)).filter(Boolean);
    const slot = ctx.state.slotPick;
    const list = slot ? items.filter(it => it.slot === slot) : items;
    const box = mk('div', null, mk('div', { class: 'sc-h' }, t('hero.inventory') + (slot ? ' — ' + t('hero.slot.' + slot) : '')));
    if (!list.length) { box.appendChild(emptyNote(t('hero.inventoryEmpty'))); return box; }
    for (const it of list) {
      const equippedHere = hero.items && hero.items[it.slot] === it.id;
      const row = mk('div', { class: 'sc-row' }, icon(it.icon || ('item_' + it.slot), 30),
        mk('div', { class: 'grow' }, mk('div', { class: 'name c-' + it.rarity }, L(it.name), ' ', mk('span', { class: 'sc-badge' }, t('rarity.' + it.rarity))), mk('div', { class: 'sub' }, Screens.effectsText(it.effects) || L(it.desc))),
        equippedHere
          ? btn(t('hero.unequip'), () => { const f = fn('Rules', 'unequipItem'); if (!f) { toast('warn', t('sc.unavailable')); return; } result(f(game, hero, it.slot)); after('hero'); }, { small: true, kind: 'danger' })
          : btn(t('hero.equip'), () => { const f = fn('Rules', 'equipItem'); if (!f) { toast('warn', t('sc.unavailable')); return; } if (result(f(game, hero, it.id, it.slot))) sfx('ui_click'); after('hero'); }, { small: true, kind: 'primary' }));
      box.appendChild(row);
    }
    return box;
  }
  function heroTabs(ctx, game, heroes, activeId) {
    const box = mk('div', { class: 'sc-herotabs' });
    for (const h of heroes) {
      box.appendChild(mk('div', { class: 'sc-herotab' + (h.id === activeId ? ' active' : ''), onclick: () => { ctx.state.heroId = h.id; ctx.state.slotPick = null; refreshScreen('hero'); } },
        heroPortrait(h, 40), mk('div', { class: 'grow' }, mk('div', { class: 'name' }, h.name, h.isRuler ? icon('crown', 12) : null),
          mk('div', { class: 'sub' }, t('sc.level') + ' ' + h.level, h.dead ? mk('span', { class: 'bad' }, ' · ' + t('hero.dead')) : null))));
    }
    return box;
  }
  defineScreen('hero', {
    title: () => t('hero.title'), width: 1200,
    build(ctx) {
      const g = game(); if (!g) return emptyNote(t('sc.noGame'));
      const player = human(g); if (!player) return emptyNote(t('sc.notFound'));
      const heroes = heroList(g, player);
      if (!heroes.length) return emptyNote(t('hero.none'));
      if (ctx.params.heroId !== undefined && ctx.state.heroId === undefined) ctx.state.heroId = ctx.params.heroId;
      let hero = (ctx.state.heroId !== undefined ? S().hero(g, ctx.state.heroId) : null) || heroes.find(h => h.isRuler) || heroes[0];
      if (!hero || hero.owner !== player.id) return emptyNote(t('sc.notFound'));
      const unit = hero.unitId >= 0 ? S().unit(g, hero.unitId) : null;
      const { classList, generalList, rulerList } = heroSkillsFor(hero, player);
      const cls = get('heroClasses', hero.classId);
      const left = mk('div', { class: 'sc-col-side' }, heroTabs(ctx, g, heroes, hero.id));
      const midParts = [
        mk('div', { class: 'sc-city-head' }, heroPortrait(hero, 72),
          mk('div', { class: 'grow' }, mk('div', { class: 'sc-city-name' }, hero.name, hero.isRuler ? mk('span', { class: 'sc-badge' }, icon('crown', 12), ' ' + t('hero.ruler')) : null),
            mk('div', { class: 'sub' }, (cls ? L(cls.name) : hero.classId) + ' · ' + t('sc.level') + ' ' + hero.level, hero.dead ? mk('span', { class: 'bad' }, ' · ' + t('hero.dead')) : null)),
          !hero.dead ? mk('div', { style: 'flex:1;min-width:160px' }, progress(hero.xp, heroXpNeed(g, hero), { color: '#5a7ff0', label: fmt(hero.xp) + ' / ' + fmt(heroXpNeed(g, hero)), height: 14 })) : null),
        heroStatsRow(g, hero, unit),
        mk('div', { class: 'sc-h' }, t('hero.skillPoints') + ': ' + num(hero.skillPoints)),
        mk('div', { class: 'sc-h' }, t('hero.class') + ': ' + (cls ? L(cls.name) : hero.classId)), skillColumns(g, hero, classList), signatureRow(g, hero, classList),
      ];
      if (generalList.length) midParts.push(mk('div', { class: 'sc-h' }, t('hero.general')), skillColumns(g, hero, generalList));
      if (rulerList.length) midParts.push(mk('div', { class: 'sc-h' }, t('hero.ruler')), skillColumns(g, hero, rulerList));
      const mid = mk('div', { class: 'sc-col' }, midParts);
      const right = mk('div', { class: 'sc-col-side' }, mk('div', { class: 'sc-h' }, t('hero.equipment')), equipmentPanel(ctx, g, player, hero), inventoryPanel(ctx, g, player, hero));
      return mk('div', { class: 'sc-cols' }, left, mid, right);
    },
  });

  // ================================================================ EMPIRE
  const EMPIRE_TREES = ['general'].concat(AFFS);
  function empireAffinityMeets(player, n) {
    if (!n.affinityReq) return true;
    if (n.tree === 'general') { let sum = 0; for (const a of AFFS) sum += num(player.affinity && player.affinity[a]); return sum >= n.affinityReq; }
    return num(player.affinity && player.affinity[n.tree]) >= n.affinityReq;
  }
  function empireTreeGrid(ctx, g, player, tree) {
    const nodes = D().list('empireSkills').filter(n => n.tree === tree);
    if (!nodes.length) return emptyNote(t('sc.unavailable'));
    let maxCol = 0, maxRow = 0;
    for (const n of nodes) { maxCol = Math.max(maxCol, n.col || 0); maxRow = Math.max(maxRow, n.row || 0); }
    const CW = 168, RH = 96, PAD = 16, NODE_W = 156;
    const width = PAD * 2 + (maxCol + 1) * CW, height = PAD * 2 + (maxRow + 1) * RH;
    const owned = new Set(player.empireSkills || []);
    const pos = {}; for (const n of nodes) pos[n.id] = { x: PAD + (n.col || 0) * CW, y: PAD + (n.row || 0) * RH };
    // real SVG nodes (createElementNS) — a plain document.createElement('svg')/innerHTML would create HTML
    // "unknown elements" instead of actual shapes, so the connector lines must be built this way to render.
    const SVGNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', width); svg.setAttribute('height', height);
    const links = [];        // {el, from, to} — geometry is filled in from the real DOM boxes below
    for (const n of nodes) for (const p of n.prereq || []) if (pos[p]) {
      const a = pos[p], b = pos[n.id], on = owned.has(p) && owned.has(n.id);
      const line = document.createElementNS(SVGNS, 'path');
      line.setAttribute('d', 'M ' + (a.x + NODE_W / 2) + ' ' + (a.y + 58) + ' L ' + (b.x + NODE_W / 2) + ' ' + b.y);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', on ? '#c9a24a' : 'rgba(201,162,74,.35)'); line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
      links.push({ el: line, from: p, to: n.id });
    }
    const wrap = mk('div', { class: 'sc-tree', style: { width: width + 'px', height: (height + 8) + 'px' } });
    wrap.appendChild(svg);
    const cellOf = {};
    for (const n of nodes) {
      const isOwned = owned.has(n.id);
      const prereqOk = (n.prereq || []).every(p => owned.has(p));
      const affOk = empireAffinityMeets(player, n);
      const canBuy = !isOwned && prereqOk && affOk;
      const cell = mk('div', { class: 'sc-node' + (isOwned ? ' owned' : (canBuy ? ' available' : ' locked')) + (n.rite ? ' rite' : ''), style: { left: pos[n.id].x + 'px', top: pos[n.id].y + 'px' } },
        mk('div', { class: 'nname' }, n.rite ? icon('star', 12) : null, L(n.name)),
        mk('div', { class: 'nsub' }, res('imperium', n.cost && n.cost.imperium, { size: 12 })),
        isOwned ? mk('span', { class: 'sc-badge good' }, t('sc.owned'))
          : btn(t('empire.buy'), () => { const f = fn('Rules', 'buyEmpireSkill'); if (!f) { toast('warn', t('empire.noBuy')); return; } if (result(f(g, player, n.id))) sfx('coin'); after('empire'); },
            { small: true, kind: 'primary', disabled: !canBuy }));
      const reason = !isOwned && !prereqOk ? t('empire.needPrereq') : (!isOwned && !affOk ? t('empire.affinityReq', { aff: tree === 'general' ? t('empire.tree.general') : t('affinity.' + tree), n: n.affinityReq }) : '');
      tip(cell, () => tipBox(L(n.name), [L(n.desc), Object.keys(n.effects || {}).length ? mk('p', null, Screens.effectsText(n.effects)) : null, reason ? mk('p', { class: 'bad' }, reason) : null]));
      wrap.appendChild(cell);
      cellOf[n.id] = cell;
    }
    // Node boxes grow with their content and a few nodes prereq a sibling on their own row, so the grid
    // constants above are only a first guess: once the tree is laid out, re-anchor every connector to the
    // measured boxes — prereq bottom centre → node top centre for a node one row down, and a short detour
    // through the gap below the row for a sibling prereq (a straight sideways line would disappear behind the
    // nodes in between and look like it joined the wrong pair). The nodes and the <svg> share the same offset
    // parent (.sc-tree), so offsetLeft/offsetTop are directly comparable with SVG user units.
    const relink = () => {
      if (!wrap.isConnected) return;
      let maxBottom = height;
      for (const l of links) {
        const a = cellOf[l.from], b = cellOf[l.to];
        if (!a || !b) continue;
        const A = { l: a.offsetLeft, t: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
        const B = { l: b.offsetLeft, t: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
        const ax = A.l + A.w / 2, bx = B.l + B.w / 2;
        let d;
        if (B.t >= A.t + A.h - 4) {                    // node one row down → bottom centre → top centre
          d = 'M ' + ax + ' ' + (A.t + A.h) + ' L ' + bx + ' ' + B.t;
        } else {                                       // sibling on the same row → dip into the gap below it
          const y = Math.max(A.t + A.h, B.t + B.h) + 10;
          d = 'M ' + ax + ' ' + (A.t + A.h) + ' L ' + ax + ' ' + y + ' L ' + bx + ' ' + y + ' L ' + bx + ' ' + (B.t + B.h);
        }
        l.el.setAttribute('d', d);
        maxBottom = Math.max(maxBottom, A.t + A.h + 12, B.t + B.h + 12);
      }
      if (maxBottom > height) { svg.setAttribute('height', maxBottom); wrap.style.height = (maxBottom + 8) + 'px'; }
    };
    requestAnimationFrame(() => { relink(); requestAnimationFrame(relink); });
    return wrap;
  }
  defineScreen('empire', {
    title: () => t('empire.title'), width: 1220,
    build(ctx) {
      const g = game(); if (!g) return emptyNote(t('sc.noGame'));
      const player = human(g); if (!player) return emptyNote(t('sc.notFound'));
      const tree = ctx.state.tree || 'general';
      const setTree = (id) => { ctx.state.tree = id; refreshScreen('empire'); };
      const tabList = EMPIRE_TREES.map(id => ({ id, label: id === 'general' ? t('empire.tree.general') : t('affinity.' + id), icon: id === 'general' ? 'gear' : id }));
      const header = mk('div', { class: 'sc-yields' }, res('imperium', num(player.resources && player.resources.imperium), { size: 20 }), researchAffinityBars(g, player));
      return [header, tabs(tabList, tree, setTree), empireTreeGrid(ctx, g, player, tree)];
    },
  });

  // ================================================================ DIPLOMACY
  function stateBadgeClass(state) { return state === 'war' ? 'war' : (state === 'alliance' || state === 'defensive_pact') ? 'good' : ''; }
  function dipProposeTerms(kind) { return kind === 'gift' ? { gold: 50 } : kind === 'trade' ? { give: { gold: 30 }, get: { mana: 25 }, turns: 10 } : {}; }
  function dipButtons(g, player, other, s) {
    const bar = mk('div', { class: 'sc-dip-btns' });
    const propose = (kind) => () => {
      const f = fn('Diplomacy', 'propose'); if (!f) { toast('warn', t('sc.unavailable')); return; }
      const r = f(g, player.id, other.id, kind, dipProposeTerms(kind));
      if (!r || r.ok === false) { toast('warn', (r && (r.reason || r.text)) ? reasonText(r) : t('dip.failed')); return; }
      toast(r.accepted ? 'good' : 'info', r.accepted ? t('dip.accepted', { name: other.name }) : (r.pending ? t('dip.sent') : t('dip.rejected', { name: other.name })));
      after('diplomacy');
    };
    const can = k => !s || s.canPropose[k] !== false;
    if (s && s.state === 'war') {
      bar.appendChild(btn(t('dip.propose.peace'), propose('peace'), { small: true, kind: 'gold', disabled: !can('peace') }));
    } else {
      bar.appendChild(btn(t('dip.propose.non_aggression'), propose('non_aggression'), { small: true, disabled: !can('non_aggression') }));
      bar.appendChild(btn(t('dip.propose.defensive_pact'), propose('defensive_pact'), { small: true, disabled: !can('defensive_pact') }));
      bar.appendChild(btn(t('dip.propose.alliance'), propose('alliance'), { small: true, disabled: !can('alliance') }));
      bar.appendChild(btn(t('dip.declareWar'), () => confirm(t('dip.confirmWar', { name: other.name }), () => {
        const f = fn('Diplomacy', 'declareWar'); if (!f) { toast('warn', t('sc.unavailable')); return; }
        result(f(g, player.id, other.id, {})); after('diplomacy');
      }), { small: true, kind: 'danger', disabled: !can('declare_war') }));
    }
    bar.appendChild(btn(t('dip.gift'), () => giftModal(g, player, other), { small: true, kind: 'ghost' }));
    return bar;
  }
  function giftModal(g, player, other) {
    const maxGold = Math.max(0, num(player.resources && player.resources.gold));
    const input = mk('input', { class: 'sc-input', type: 'number', min: 0, max: maxGold, value: Math.min(50, maxGold) });
    modal({
      title: t('dip.gift') + ' — ' + other.name,
      body: mk('div', null, mk('div', { class: 'sub' }, t('dip.giftAmount')), input),
      buttons: [{ label: t('sc.cancel') }, {
        label: t('sc.ok'), kind: 'primary', onClick: () => {
          const v = Math.max(0, Math.round(+input.value || 0));
          const f = fn('Diplomacy', 'propose'); if (!f) { toast('warn', t('sc.unavailable')); return; }
          const r = f(g, player.id, other.id, 'gift', { gold: v });
          if (result(r)) toast('good', t('dip.sent'));
          after('diplomacy');
        },
      }],
    });
  }
  function diploRow(ctx, g, player, other) {
    const sumFn = fn('Diplomacy', 'summary');
    const s = sumFn ? sumFn(g, player.id, other.id) : null;
    const opinion = s ? s.opinion : 0;
    const state = s ? s.state : 'peace';
    const row = mk('div', { class: 'sc-row sc-dip-row' },
      mk('div', { class: 'sc-banner', style: { background: other.color || '#3a4460', borderColor: other.color2 || 'rgba(255,255,255,.35)' } }, (other.name || '?').slice(0, 1)),
      mk('div', { class: 'grow' },
        mk('div', { class: 'name' }, other.name, ' ', mk('span', { class: 'sc-badge ' + stateBadgeClass(state) }, s ? L(s.stateName) : t('dip.state.peace')), other.alive === false ? mk('span', { class: 'sc-badge' }, t('dip.dead')) : null),
        mk('div', { class: 'sub' }, t('dip.personality.' + (other.personality || 'expansionist')), ' · ', t('dip.ruler') + ': ' + (other.rulerName || ''), ' · ', t('dip.opinion') + ': ', mk('b', null, String(opinion)), s ? ' (' + L(s.opinionLabel) + ')' : ''),
        s && s.treaties.length ? mk('div', { class: 'sub' }, t('dip.treaties') + ': ' + s.treaties.map(tr => L(tr.name)).join(', ')) : null,
        state === 'war' ? mk('div', { class: 'sub warn' }, t('dip.warScore') + ': ' + (s ? s.warScore : 0)) : null,
        other.alive === false ? null : dipButtons(g, player, other, s)));
    if (s) tip(row, () => tipBox(t('dip.breakdown'), s.factors.map(f => mk('div', null, L(f.label) + ': ' + fmtSigned(f.value)))));
    return row;
  }
  function pendingProposalsPanel(g, player) {
    const pendFn = fn('Diplomacy', 'pending');
    const list = pendFn ? pendFn(g, player.id) : [];
    if (!list.length) return null;
    const kindNameFn = fn('Diplomacy', 'kindName');
    const wrap = mk('div', null, mk('div', { class: 'sc-h' }, t('dip.incoming', { name: '' })));
    for (const p of list) {
      const from = g.players[p.from];
      const row = mk('div', { class: 'sc-row' },
        mk('div', { class: 'grow' }, mk('div', { class: 'name' }, from ? from.name : '?'), mk('div', { class: 'sub' }, kindNameFn ? L(kindNameFn(p.kind)) : p.kind)),
        btn(t('dip.accept'), () => { const f = fn('Diplomacy', 'resolve'); if (f) f(g, p, true); after('diplomacy'); }, { small: true, kind: 'primary' }),
        btn(t('dip.decline'), () => { const f = fn('Diplomacy', 'resolve'); if (f) f(g, p, false); after('diplomacy'); }, { small: true, kind: 'ghost' }));
      wrap.appendChild(row);
    }
    return wrap;
  }
  /** opens the accept/decline modal for an incoming proposal (used by Events 'diplomacy:proposal' and the pending list). */
  // several realms can propose in the same turn: show ONE modal at a time and queue the rest, so the
  // proposals never pile up as a stack of backdrops the player has to dig through.
  let proposalModal = null;
  const proposalQueue = [];
  Screens.showProposal = function (proposal) {
    const g = game(); if (!g || !proposal) return;
    if (proposalModal && proposalModal.closed === false) {   // (=== false: the fallback modal has no such flag)
      if (!proposalQueue.some(p => p === proposal || (p.id !== undefined && p.id === proposal.id))) proposalQueue.push(proposal);
      return;
    }
    const from = g.players[proposal.from];
    const kindNameFn = fn('Diplomacy', 'kindName');
    const answer = (accept) => { const f = fn('Diplomacy', 'resolve'); if (f) f(g, proposal, accept); refreshUI(); refreshScreen('diplomacy'); };
    proposalModal = modal({
      title: t('dip.incoming', { name: from ? from.name : '?' }), icon: 'diplomacy', width: 420,
      body: mk('div', null, mk('div', { class: 'sc-h' }, kindNameFn ? L(kindNameFn(proposal.kind)) : proposal.kind),
        proposalQueue.length ? mk('div', { class: 'sub' }, '+' + proposalQueue.length) : null),
      buttons: [
        { label: t('dip.decline'), kind: 'ghost', onClick: () => answer(false) },
        { label: t('dip.accept'), kind: 'primary', onClick: () => answer(true) },
      ],
      onClose: () => { proposalModal = null; const next = proposalQueue.shift(); if (next) setTimeout(() => Screens.showProposal(next), 60); },
    });
  };
  /** drop any queued proposal modal (a new/loaded game invalidates them) */
  Screens.clearProposals = function () { proposalQueue.length = 0; proposalModal = null; };
  defineScreen('diplomacy', {
    title: () => t('dip.title'), width: 1040,
    build(ctx) {
      const g = game(); if (!g) return emptyNote(t('sc.noGame'));
      const player = human(g); if (!player) return emptyNote(t('sc.notFound'));
      const others = g.players.filter(p => p.id !== player.id);
      if (!others.length) return emptyNote(t('dip.noOthers'));
      const pend = pendingProposalsPanel(g, player);
      const rows = others.map(o => diploRow(ctx, g, player, o));
      return pend ? [pend, mk('div', { class: 'aow-divider' }), ...rows] : rows;
    },
  });

  // ================================================================ VICTORY
  defineScreen('victory', {
    title: () => t('vic.victory'), fullscreen: true,
    build(ctx) {
      const g = game();
      const p = ctx.params || {};
      const winner = g && p.winner !== undefined && p.winner !== null ? g.players[p.winner] : null;
      const humanP = g ? human(g) : null;
      const won = !!(humanP && winner && humanP.id === winner.id);
      const box = mk('div', { class: 'sc-victory' + (won ? '' : ' lose') });
      box.appendChild(mk('h1', null, won ? t('vic.victory') : t('vic.defeat')));
      box.appendChild(mk('h2', null, t('vic.type.' + (p.type || 'score'))));
      box.appendChild(mk('div', { class: 'orn' }));
      box.appendChild(mk('div', { class: 'sub', style: 'font-size:16px;margin-bottom:10px;max-width:520px;text-align:center' }, t(won ? 'vic.subtitle.win' : 'vic.subtitle.lose', { name: winner ? winner.name : '?' })));
      if (g) {
        const rows = [mk('tr', null, mk('th', null, t('vic.player')), mk('th', null, t('vic.cities')), mk('th', null, t('vic.units')), mk('th', null, t('vic.territory')), mk('th', null, t('vic.score')))];
        for (const pl of g.players) {
          const isWinner = winner && pl.id === winner.id;
          rows.push(mk('tr', null,
            mk('td', { style: isWinner ? 'color:var(--gold-light);font-weight:700' : '' }, pl.name + (isWinner ? ' ★' : '')),
            mk('td', null, String(num(pl.stats && pl.stats.cities))), mk('td', null, String(num(pl.stats && pl.stats.units))),
            mk('td', null, String(num(pl.stats && pl.stats.territory))), mk('td', null, String(num(pl.stats && pl.stats.score)))));
        }
        box.appendChild(mk('div', { class: 'sub' }, t('vic.turns') + ': ' + g.turn));
        box.appendChild(mk('table', null, rows));
      }
      box.appendChild(mk('div', { class: 'aow-row', style: 'display:flex;gap:12px;margin-top:6px' },
        btn(t('vic.continue'), () => {
          // keep playing after the result: Turn.endTurn only stops for a victory nobody has acknowledged yet
          if (g && g.victory) g.victory.continued = true;
          const mood = fn('Music', 'setMood'); if (mood) { try { mood('peace'); } catch (e) { /* audio optional */ } }
          closeScreen();
        }, { kind: 'gold', large: true }),
        btn(t('vic.menu'), () => { const f = fn('UI', 'quitToMenu'); if (f) f(); else closeScreen(); }, { large: true })));
      return box;
    },
  });

  // ================================================================ ENCYCLOPEDIA
  const ENC_CATS = ['cultures', 'forms', 'units', 'tomes', 'spells', 'buildings', 'heroClasses', 'improvements', 'wonders', 'items', 'abilities', 'statuses', 'empireSkills', 'traits', 'rulerTypes'];
  function encEntryIcon(cat, d) {
    if (cat === 'units') return Screens.unitPortrait(d, 28);
    if (cat === 'tomes') return tomeIcon(d.id, 26);
    if (cat === 'items') return icon(d.icon || 'item_trinket', 22);
    if (cat === 'spells') return icon(AFFS.find(a => d.affinity && d.affinity[a]) || 'spellbook', 20);
    if (cat === 'buildings') return icon(CAT_ICON[d.category] || 'city', 20);
    if (cat === 'heroClasses') return icon('hero_star', 20);
    if (cat === 'wonders') return icon('wonder', 20);
    if (cat === 'cultures') return icon('flag', 20);
    return icon('scroll', 18);
  }
  function encDetail(cat, d) {
    if (!d) return emptyNote(t('enc.pick'));
    const box = mk('div', { class: 'sc-enc-detail' });
    box.appendChild(mk('h3', null, L(d.name)));
    if (d.desc) box.appendChild(mk('p', null, L(d.desc)));
    const kv = mk('div', { class: 'sc-kv' });
    const addKv = (k, v) => { if (v === null || v === undefined || v === '') return; kv.appendChild(mk('div', { class: 'k' }, k)); kv.appendChild(mk('div', null, String(v))); };
    if (cat === 'units') {
      addKv(t('sc.tier'), tierRoman(d.tier)); addKv(t('ui.role'), t('role.' + d.role)); addKv(t('enc.move'), (d.move || '') + ' (' + num(d.mp) + ')');
      addKv(t('ui.hp'), d.hp); addKv(t('ui.def'), d.def); addKv(t('ui.res'), d.res);
      if (d.tags && d.tags.length) addKv(t('enc.tags'), d.tags.join(', '));
      box.appendChild(kv);
      if (d.attacks && d.attacks.length) {
        box.appendChild(mk('div', { class: 'sc-h' }, t('enc.attacks')));
        for (const a of d.attacks) box.appendChild(mk('p', null, L(a.name) + ': ' + a.damage + ' ' + t('channel.' + (a.channel || 'physical')) + (a.range > 1 ? ' / ' + t('stat.range') + ' ' + a.range : '')));
      }
      const abil = (d.abilities || []).concat(d.passives || []);
      if (abil.length) { box.appendChild(mk('div', { class: 'sc-h' }, t('enc.abilities'))); box.appendChild(mk('p', null, abil.map(a => { const ad = get('abilities', a); return ad ? L(ad.name) : a; }).join(', '))); }
    } else if (cat === 'tomes') {
      addKv(t('sc.tier'), tierRoman(d.tier)); addKv(t('research.affinity'), affText(d.affinity)); box.appendChild(kv);
      if (d.passive) box.appendChild(mk('p', null, mk('b', null, t('research.passive') + ': '), L(d.passive.desc)));
      if (d.contents && d.contents.length) {
        box.appendChild(mk('div', { class: 'sc-h' }, t('research.contents')));
        for (const c of d.contents) { const cd = contentDef(c); box.appendChild(mk('p', null, (cd ? L(cd.name) : c.id) + ' — ' + t('research.type.' + c.type))); }
      }
    } else if (cat === 'spells') {
      addKv(t('sc.tier'), tierRoman(d.tier)); addKv(t('research.affinity'), affText(d.affinity)); box.appendChild(kv);
      box.appendChild(mk('p', null, t('spell.kind.' + d.kind)));
      if (d.cost) box.appendChild(mk('p', null, t('sc.cost') + ': ' + Object.keys(d.cost).filter(k => d.cost[k]).map(k => d.cost[k] + ' ' + (k === 'cp' ? t('spell.cp') : t('resource.' + k))).join(', ')));
      if (d.enchant && d.enchant.effects) box.appendChild(mk('p', null, Screens.effectsText(d.enchant.effects)));
    } else if (cat === 'buildings') {
      addKv(t('sc.tier'), d.tier); addKv(t('sc.cost'), d.cost && d.cost.production); box.appendChild(kv);
      if (d.effects) box.appendChild(mk('p', null, Screens.effectsText(d.effects)));
    } else if (cat === 'improvements') {
      if (d.yields) box.appendChild(mk('p', null, Screens.effectsText(d.yields)));
    } else if (cat === 'heroClasses') {
      if (d.signature && d.signature.length) { box.appendChild(mk('div', { class: 'sc-h' }, t('enc.signature'))); box.appendChild(mk('p', null, d.signature.map(id => { const s = get('heroSkills', id); return s ? L(s.name) : id; }).join(', '))); }
    } else if (cat === 'wonders') {
      addKv(t('sc.tier'), tierRoman(d.tier)); box.appendChild(kv);
      if (d.rewards) box.appendChild(mk('p', null, mk('b', null, t('enc.rewards') + ': '), Screens.effectsText(d.rewards)));
    } else if (cat === 'items') {
      box.appendChild(mk('p', { class: 'c-' + d.rarity }, t('rarity.' + d.rarity) + ' · ' + t('hero.slot.' + d.slot)));
      if (d.effects) box.appendChild(mk('p', null, Screens.effectsText(d.effects)));
    } else if (cat === 'empireSkills') {
      addKv(t('sc.tier'), d.tier); addKv(t('sc.cost'), d.cost && d.cost.imperium); box.appendChild(kv);
      if (d.effects) box.appendChild(mk('p', null, Screens.effectsText(d.effects)));
    } else if (cat === 'cultures') {
      if (d.units && d.units.length) { box.appendChild(mk('div', { class: 'sc-h' }, t('enc.roster'))); box.appendChild(mk('p', null, d.units.map(id => { const u = get('units', id); return u ? L(u.name) : id; }).join(', '))); }
      if (d.subChoices && d.subChoices.length) { box.appendChild(mk('div', { class: 'sc-h' }, t('enc.subChoices'))); box.appendChild(mk('p', null, d.subChoices.map(s => L(s.name)).join(', '))); }
    } else if (cat === 'traits' || cat === 'abilities' || cat === 'statuses' || cat === 'forms' || cat === 'rulerTypes') {
      if (d.kind) box.appendChild(mk('p', null, t('enc.kind') + ': ' + d.kind));
      if (d.effects && Object.keys(d.effects).length) box.appendChild(mk('p', null, Screens.effectsText(d.effects)));
    }
    return box;
  }
  defineScreen('encyclopedia', {
    title: () => t('enc.title'), width: 1220,
    build(ctx) {
      const cat = ctx.state.cat && D().list(ctx.state.cat) ? ctx.state.cat : (ENC_CATS.find(c => D().list(c).length) || ENC_CATS[0]);
      ctx.state.cat = cat;
      const catsCol = mk('div', { class: 'sc-enc-cats' });
      for (const c of ENC_CATS) {
        catsCol.appendChild(mk('div', { class: 'sc-enc-cat' + (c === cat ? ' active' : ''), onclick: () => { ctx.state.cat = c; ctx.state.sel = null; refreshScreen('encyclopedia'); } },
          t('enc.cat.' + c) + ' (' + D().list(c).length + ')'));
      }
      const list = D().list(cat).slice().sort((a, b) => L(a.name).localeCompare(L(b.name)));
      const search = mk('input', { class: 'sc-input', placeholder: t('sc.search'), style: 'width:100%;margin-bottom:6px' });
      const listBox = mk('div', { class: 'sc-enc-list' });
      const sel = (ctx.state.sel && list.find(d => d.id === ctx.state.sel)) || list[0] || null;
      for (const d of list) {
        const item = mk('div', { class: 'sc-enc-item' + (sel && d.id === sel.id ? ' active' : ''), dataset: { name: L(d.name).toLowerCase() }, onclick: () => { ctx.state.sel = d.id; refreshScreen('encyclopedia'); } }, encEntryIcon(cat, d), mk('span', null, L(d.name)));
        listBox.appendChild(item);
      }
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        for (const item of listBox.children) item.style.display = (!q || (item.dataset.name || '').includes(q)) ? '' : 'none';
      });
      const listCol = mk('div', null, search, listBox);
      const detailCol = encDetail(cat, sel);
      return mk('div', { class: 'sc-enc' }, catsCol, listCol, detailCol);
    },
  });

  // ================================================================ CITIES LIST
  defineScreen('cities', {
    title: () => t('cities.title'), cls: 'sc-panel-narrow',
    build() {
      const g = game(); if (!g) return emptyNote(t('sc.noGame'));
      const pid = humanPid(g);
      const cities = g.cities.filter(c => c.owner === pid);
      if (!cities.length) return emptyNote(t('cities.none'));
      return cities.map(c => {
        const q = (c.queue || [])[0];
        const y = cityYields(g, c);
        const row = mk('div', { class: 'sc-row' }, icon(c.tier === 0 ? 'outpost' : 'city', 30),
          mk('div', { class: 'grow' }, mk('div', { class: 'name' }, c.name, ' ', mk('span', { class: 'sc-badge' }, tierRoman(c.tier) + ' ' + Screens.tierName(c.tier)), c.isCapital ? icon('crown', 14) : null),
            mk('div', { class: 'sub' }, icon('pop', 12), ' ' + num(c.pop) + '  ', t('cities.production') + ': ', q ? mk('b', null, itemName(q) + ' (' + turnsText(turnsFor(itemCost(g, c, q) - num(q.progress), num(y.production))) + ')') : mk('span', { class: 'warn' }, t('cities.idle')))),
          mk('div', { class: 'sc-cost' }, RES_KEYS.slice(0, 3).map(k => res(k, num(y[k]), { signed: true }))),
          btn(t('cities.goto'), () => { centerOn(c.hex); const f = fn('UI', 'select'); if (f) f({ cityId: c.id }); closeScreen(); }, { small: true }),
          btn(t('cities.open'), () => { closeScreen(); showScreen('city', { cityId: c.id }); }, { small: true, kind: 'primary' }));
        return row;
      });
    },
  });

  // ================================================================ registration retry + global listeners
  if (AOW.Events) {
    AOW.Events.on('game:new', () => { Screens.clearProposals(); Screens.registerAll(); });
    AOW.Events.on('ui:screen', () => Screens.registerAll());
    // incoming diplomatic proposal → show the accept/decline modal for the human recipient
    AOW.Events.on('diplomacy:proposal', (p) => {
      const g = game(); if (!g || !p) return;
      const me = human(g); if (!me || p.to !== me.id) return;
      Screens.showProposal(p.proposal || p);
    });
    // someone won (Turn → Events 'victory' {type, winner}): show the victory / defeat screen once the turn has
    // finished processing (the event fires in the middle of Turn.endTurn)
    AOW.Events.on('victory', (v) => {
      if (!v) return;
      setTimeout(() => {
        const g = game(); if (!g || !g.victory || g.victory.continued) return;
        const me = human(g), won = !!(me && me.id === v.winner);
        const show = fn('UI', 'showScreen'); if (show) show('victory', { type: v.type, winner: v.winner });
        const mood = fn('Music', 'setMood'); if (mood) { try { mood(won ? 'victory' : 'defeat'); } catch (e) { /* audio optional */ } }
        sfx(won ? 'victory_fanfare' : 'defeat');
      }, 0);
    });
  }
  Screens.registerAll();
})(window.AOW = window.AOW || {});
