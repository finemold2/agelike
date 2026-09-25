// src/ui/menu.js — main menu, new game setup, faction creation (SPEC §10)
//
// Registers screens 'menu', 'newgame', 'faction', 'load'. This file is loaded right after src/ui/ui.js
// (index.html order), so by the time anything ever calls UI.showScreen('menu') the real screen below is
// already registered and ui.js's `if (name === 'menu' && !screens.has('menu')) registerFallbackMenu();`
// guard finds ours — the built-in fallback is never installed.
//
// Internal-only helpers (not exported): every screen below rebuilds its own DOM subtree on every change
// (card pick, trait toggle, keystroke…) through a small `rebuildPreservingFocus` helper that restores
// focus + text-selection on the element tagged `data-focus="…"` so typing in the seed/name fields does
// not stutter. No engine/game state is touched here — the whole flow only produces a `settings` object
// (see src/game/state.js State.quickSettings for the shape) and hands it to AOW.Main.startGame.
(function (AOW) {
  'use strict';
  const UI = AOW.UI, Data = AOW.Data, State = AOW.State, Palette = AOW.Palette;
  const el = UI.el;
  const t = (k, p) => AOW.t(k, p);
  const L = (o, p) => AOW.L(o, p);
  const AFFS = ['order', 'chaos', 'nature', 'materium', 'astral', 'shadow'];
  const safe = (fn, dflt) => { try { const r = fn(); return r === undefined ? dflt : r; } catch (e) { return dflt; } };
  function sfx(name, opts) { if (AOW.SFX && typeof AOW.SFX.play === 'function') { try { AOW.SFX.play(name, opts); } catch (e) { /* ignore */ } } }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ================================================================ i18n
  AOW.I18n.add({
    ko: {
      'mm.encyclopedia': '백과사전', 'mm.continueTurn': '이어하기 ({n}턴)', 'mm.credits': '손으로 그려낸 판타지 4X — 이미지·음원 파일 없이 코드로만 빚은 세계.',
      'ng.title': '새 게임 설정', 'ng.subtitle': '세계의 크기와 규칙을 정하세요.', 'ng.seed': '세계의 씨앗', 'ng.seedRandom': '무작위',
      'ng.mapSize': '지도 크기', 'ng.size.small': '소형', 'ng.size.medium': '중형', 'ng.size.large': '대형',
      'ng.aiCount': 'AI 상대 수', 'ng.totalPlayers': '총 {n}개 세력', 'ng.difficulty': '난이도',
      'ng.diff.easy': '쉬움', 'ng.diff.normal': '보통', 'ng.diff.hard': '어려움', 'ng.diff.brutal': '지옥',
      'ng.realmTraits': '영지 특성', 'ng.realmTraitsHint': '최대 3개까지 선택할 수 있습니다 ({n}/3).',
      'ng.victory': '승리 조건', 'ng.victory.expansion': '확장 승리', 'ng.victory.magic': '마법 승리', 'ng.victory.military': '군사 승리', 'ng.victory.score': '점수 승리',
      'ng.turnLimit': '턴 제한', 'ng.turnLimitNone': '무제한', 'ng.manualDefense': '수동 방어',
      'ng.manualDefenseHint': '적이 침공하면 자동으로 전투를 해결하는 대신, 직접 전투를 지휘합니다.',
      'ng.back': '뒤로', 'ng.next': '세력 생성 →',
      'fw.title': '세력 창조',
      'fw.step.1': '지배자', 'fw.step.2': '종족', 'fw.step.3': '문화', 'fw.step.4': '사회 특성', 'fw.step.5': '시작 마도서', 'fw.step.6': '색상 · 이름',
      'fw.back': '뒤로', 'fw.next': '다음', 'fw.finish': '완료', 'fw.creating': '세계를 창조하는 중…',
      'fw.rulerName': '군주의 이름', 'fw.random': '무작위', 'fw.heroClass': '영웅 직업',
      'fw.raceTraitsBudget': '특성 예산 {used} / {max}', 'fw.bodyTraits': '신체 특성', 'fw.mindTraits': '정신 특성',
      'fw.subChoice': '하위 선택', 'fw.noSubChoice': '이 문화에는 하위 선택이 없습니다.',
      'fw.societyPick': '사회 특성 선택 ({n}/2)', 'fw.tomeContents': '수록 내용', 'fw.tomePassive': '마도서 효과',
      'fw.factionName': '세력 이름', 'fw.primaryColor': '주 색상', 'fw.secondaryColor': '보조 색상', 'fw.customColor': '직접 선택',
      'fw.bannerShape': '깃발 모양', 'fw.shape.pennant': '삼각기', 'fw.shape.square': '사각기', 'fw.shape.swallow': '제비꼬리기', 'fw.shape.round': '둥근기', 'fw.shape.spear': '창기',
      'fw.preview': '미리보기', 'fw.affinity': '친화도',
      'fw.errNeedRuler': '지배자 유형을 선택하세요.', 'fw.errNeedName': '군주의 이름을 입력하세요.',
      'fw.errNeedForm': '종족을 선택하세요.', 'fw.errBudget': '특성 예산을 초과했습니다.',
      'fw.errNeedCulture': '문화를 선택하세요.', 'fw.errNeedSub': '하위 선택을 하나 골라야 합니다.',
      'fw.errNeedSociety': '사회 특성을 정확히 2개 선택하세요.', 'fw.errNeedTome': '시작 마도서를 선택하세요.',
      'fw.errNeedFactionName': '세력 이름을 입력하세요.', 'fw.cost': '비용 {n}',
      'ld.title': '게임 불러오기', 'ld.empty': '저장된 게임이 없습니다.', 'ld.turn': '{n}턴', 'ld.load': '불러오기', 'ld.delete': '삭제', 'ld.back': '뒤로',
      'ld.deleteConfirm': '이 저장 파일을 삭제할까요?', 'ld.unknown': '이름 없는 군주',
    },
    en: {
      'mm.encyclopedia': 'Encyclopedia', 'mm.continueTurn': 'Continue (turn {n})', 'mm.credits': 'A hand-painted fantasy 4X — built entirely from code, no image or audio files.',
      'ng.title': 'New Game Setup', 'ng.subtitle': 'Set the size and rules of your world.', 'ng.seed': 'World seed', 'ng.seedRandom': 'Random',
      'ng.mapSize': 'Map size', 'ng.size.small': 'Small', 'ng.size.medium': 'Medium', 'ng.size.large': 'Large',
      'ng.aiCount': 'AI opponents', 'ng.totalPlayers': '{n} realms total', 'ng.difficulty': 'Difficulty',
      'ng.diff.easy': 'Easy', 'ng.diff.normal': 'Normal', 'ng.diff.hard': 'Hard', 'ng.diff.brutal': 'Brutal',
      'ng.realmTraits': 'Realm Traits', 'ng.realmTraitsHint': 'Pick up to 3 ({n}/3).',
      'ng.victory': 'Victory Conditions', 'ng.victory.expansion': 'Expansion Victory', 'ng.victory.magic': 'Magic Victory', 'ng.victory.military': 'Military Victory', 'ng.victory.score': 'Score Victory',
      'ng.turnLimit': 'Turn limit', 'ng.turnLimitNone': 'No limit', 'ng.manualDefense': 'Manual Defense',
      'ng.manualDefenseHint': 'Fight invasions yourself instead of letting them auto-resolve.',
      'ng.back': 'Back', 'ng.next': 'Create Faction →',
      'fw.title': 'Faction Creation',
      'fw.step.1': 'Ruler', 'fw.step.2': 'Form', 'fw.step.3': 'Culture', 'fw.step.4': 'Society', 'fw.step.5': 'Starting Tome', 'fw.step.6': 'Colors & Name',
      'fw.back': 'Back', 'fw.next': 'Next', 'fw.finish': 'Finish', 'fw.creating': 'Creating the world…',
      'fw.rulerName': 'Ruler name', 'fw.random': 'Random', 'fw.heroClass': 'Hero class',
      'fw.raceTraitsBudget': 'Trait budget {used} / {max}', 'fw.bodyTraits': 'Body Traits', 'fw.mindTraits': 'Mind Traits',
      'fw.subChoice': 'Sub-choice', 'fw.noSubChoice': 'This culture has no sub-choice.',
      'fw.societyPick': 'Pick Society Traits ({n}/2)', 'fw.tomeContents': 'Contents', 'fw.tomePassive': 'Tome passive',
      'fw.factionName': 'Faction name', 'fw.primaryColor': 'Primary color', 'fw.secondaryColor': 'Secondary color', 'fw.customColor': 'Custom',
      'fw.bannerShape': 'Banner shape', 'fw.shape.pennant': 'Pennant', 'fw.shape.square': 'Square', 'fw.shape.swallow': 'Swallowtail', 'fw.shape.round': 'Round', 'fw.shape.spear': 'Spear',
      'fw.preview': 'Preview', 'fw.affinity': 'Affinity',
      'fw.errNeedRuler': 'Choose a ruler type.', 'fw.errNeedName': 'Enter a name for your ruler.',
      'fw.errNeedForm': 'Choose a form.', 'fw.errBudget': 'Trait budget exceeded.',
      'fw.errNeedCulture': 'Choose a culture.', 'fw.errNeedSub': 'Pick one sub-choice.',
      'fw.errNeedSociety': 'Pick exactly 2 society traits.', 'fw.errNeedTome': 'Choose a starting tome.',
      'fw.errNeedFactionName': 'Enter a faction name.', 'fw.cost': 'Cost {n}',
      'ld.title': 'Load Game', 'ld.empty': 'No saved games found.', 'ld.turn': 'Turn {n}', 'ld.load': 'Load', 'ld.delete': 'Delete', 'ld.back': 'Back',
      'ld.deleteConfirm': 'Delete this save?', 'ld.unknown': 'Unnamed ruler',
    },
  });

  // ================================================================ shared css
  UI.css(`
.aow-screen--menu .aow-screen__inner { max-width: 100vw; width: 100%; height: 100%; max-height: 100vh; }
.aow-screen--newgame .aow-screen__inner { max-width: min(1080px, 96vw); }
.aow-screen--faction .aow-screen__inner { max-width: min(1460px, 97vw); }
.aow-screen--load .aow-screen__inner { max-width: min(720px, 94vw); }
/* explicit stacking order: our screens are always pushed in this sequence (menu -> newgame -> faction, or
   menu -> load), but a plain <canvas> in 'menu' can end up GPU-layer-promoted and paint out of DOM order in
   some Chromium builds unless every screen in the stack gets its own unambiguous z-index. */
.aow-screen[data-screen="menu"] { z-index: 1; }
.aow-screen[data-screen="newgame"] { z-index: 2; }
.aow-screen[data-screen="load"] { z-index: 2; }
.aow-screen[data-screen="faction"] { z-index: 3; }

/* ---- main menu ---- */
.mm-root { position: relative; width: 100%; height: 100%; overflow: hidden; }
.mm-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.mm-overlay { position: relative; z-index: 1; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 30px 20px 20px; pointer-events: none; }
.mm-overlay > * { pointer-events: auto; }
.mm-lang { position: absolute; top: 18px; right: 20px; }
.mm-titleblock { margin-top: 6vh; text-align: center; }
.mm-title { font-family: var(--font-title); font-size: clamp(38px, 7vw, 78px); font-weight: 700; letter-spacing: 0.12em; margin: 0; line-height: 1;
  background: linear-gradient(180deg, #fff8e0 0%, #f1d98a 32%, #c9a24a 62%, #8a6a24 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: var(--gold-light);
  filter: drop-shadow(0 3px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 26px rgba(241,217,138,0.4)); }
.mm-titleKo { font-family: "Noto Serif KR", "Nanum Myeongjo", serif; font-size: clamp(15px, 2.4vw, 24px); letter-spacing: 0.62em; text-indent: 0.62em; color: #d8cba0; margin: 10px 0 0; text-shadow: 0 2px 6px rgba(0,0,0,0.8); }
.mm-tagline { margin-top: 12px; color: var(--text-dim); font-size: 12.5px; letter-spacing: 0.06em; }
.mm-buttons { display: flex; flex-direction: column; gap: 10px; width: min(360px, 84vw); margin: 3.5vh 0; }
.mm-footer { display: flex; flex-direction: column; align-items: center; gap: 3px; color: var(--text-faint); font-size: 11px; text-align: center; max-width: 90vw; }
.mm-nowplaying { color: var(--text-dim); font-style: italic; }
.mm-nowplaying[hidden] { display: none; }

/* ---- new game ---- */
.ng-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 28px; }
@media (max-width: 820px) { .ng-grid { grid-template-columns: 1fr; } }
.ng-section { display: flex; flex-direction: column; gap: 9px; padding: 11px 13px 13px; background: rgba(0,0,0,0.22); border: 1px solid var(--line); border-radius: 5px; }
.ng-section > .aow-h3 { margin-bottom: 1px; padding-bottom: 4px; border-bottom: 1px solid var(--border-soft); }
.ng-row { display: flex; align-items: center; gap: 8px; min-height: 28px; flex-wrap: wrap; }
.ng-row > label { flex: 0 0 108px; color: var(--text-dim); font-size: 12.5px; }
.ng-hint { color: var(--text-faint); font-size: 11.5px; }
.ng-checklist { display: flex; flex-direction: column; gap: 6px; }
.ng-stepper { display: inline-flex; align-items: center; gap: 8px; }
.ng-stepper__val { min-width: 22px; text-align: center; font-weight: 700; color: var(--gold-light); font-variant-numeric: tabular-nums; }
.ng-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ng-chip { padding: 4px 10px; border-radius: 12px; background: rgba(0,0,0,0.32); border: 1px solid var(--border-soft); color: var(--text-dim); font-size: 12px; cursor: pointer; user-select: none; transition: border-color .12s, color .12s, background .12s; }
.ng-chip:hover { border-color: var(--border); color: var(--text); }
.ng-chip--on { border-color: var(--gold); color: var(--gold-light); background: rgba(201,162,74,0.16); box-shadow: var(--glow-gold); }
.ng-chip--disabled { opacity: 0.4; cursor: not-allowed; }
.ng-footer { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 14px; }

/* ---- faction wizard ---- */
.fw-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.fw-tab { position: relative; }
.fw-tab-dot { position: absolute; top: 3px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: var(--danger); box-shadow: 0 0 4px rgba(217,75,58,0.8); }
.fw-shell { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; padding-top: 12px; }
@media (max-width: 1080px) { .fw-shell { grid-template-columns: 1fr; } }
.fw-main { min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.fw-section-title { font-family: var(--font-title); color: var(--gold); font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; margin: 2px 0 -2px; }
.fw-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.fw-cards-grid--wide { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
.fw-card { display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; padding: 9px 8px 8px; border-radius: 6px; cursor: pointer; user-select: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.28)); border: 1px solid var(--border-soft); transition: border-color .12s, box-shadow .12s, background .12s, transform .08s; }
.fw-card:hover { border-color: var(--border); background: linear-gradient(180deg, rgba(201,162,74,0.08), rgba(0,0,0,0.3)); }
.fw-card:active { transform: translateY(1px); }
.fw-card--selected { border-color: var(--gold); box-shadow: var(--glow-gold), inset 0 0 14px rgba(241,217,138,0.12); background: linear-gradient(180deg, rgba(201,162,74,0.15), rgba(0,0,0,0.3)); }
.fw-card__portrait { width: 60px; height: 60px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 2px var(--gold-dark), 0 2px 6px rgba(0,0,0,0.6); flex: 0 0 auto; }
.fw-card__portrait img { width: 100%; height: 100%; display: block; object-fit: cover; }
.fw-card__name { font-weight: 700; font-size: 12.5px; color: var(--text); line-height: 1.2; }
.fw-card--selected .fw-card__name { color: var(--gold-light); }
.fw-card__sub { font-size: 10.5px; color: var(--text-dim); }
.fw-card__desc { font-size: 10.5px; color: var(--text-faint); line-height: 1.3; max-height: 2.6em; overflow: hidden; }
.fw-card__swatch { width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.6); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25); }
.fw-card__chips { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; }
.fw-affchip { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; padding: 1px 5px; border-radius: 8px; background: rgba(0,0,0,0.35); }
.fw-row-inline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.fw-row-inline > label { flex: 0 0 auto; color: var(--text-dim); font-size: 12.5px; min-width: 96px; }
.fw-row-inline .aow-input { flex: 1 1 200px; min-width: 140px; }
.fw-class-row { display: flex; flex-wrap: wrap; gap: 6px; }
.fw-class-chip { display: flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-soft); cursor: pointer; font-size: 12.5px; color: var(--text-dim); }
.fw-class-chip:hover { border-color: var(--border); color: var(--text); }
.fw-class-chip--on { border-color: var(--gold); color: var(--gold-light); background: rgba(201,162,74,0.16); box-shadow: var(--glow-gold); }
.fw-budget-row { display: flex; align-items: center; gap: 10px; }
.fw-budget-row .aow-progress { flex: 1 1 auto; }
.fw-traits-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 700px) { .fw-traits-cols { grid-template-columns: 1fr; } }
.fw-trait-list { display: flex; flex-direction: column; gap: 5px; }
.fw-trait-chip { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 9px; border-radius: 5px; cursor: pointer; user-select: none;
  background: rgba(0,0,0,0.26); border: 1px solid var(--border-soft); font-size: 12px; }
.fw-trait-chip:hover { border-color: var(--border); }
.fw-trait-chip--on { border-color: var(--gold); color: var(--gold-light); background: rgba(201,162,74,0.15); box-shadow: var(--glow-gold); }
.fw-trait-chip--disabled { opacity: 0.4; cursor: not-allowed; }
.fw-trait-chip__cost { flex: 0 0 auto; color: var(--text-faint); font-size: 10.5px; }
.fw-society-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; }
.fw-society-card { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border-radius: 6px; cursor: pointer; user-select: none;
  background: rgba(0,0,0,0.26); border: 1px solid var(--border-soft); }
.fw-society-card:hover { border-color: var(--border); }
.fw-society-card--on { border-color: var(--gold); background: rgba(201,162,74,0.15); box-shadow: var(--glow-gold); }
.fw-society-card--blocked { opacity: 0.42; cursor: not-allowed; }
.fw-society-card__title { display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 12.5px; color: var(--text); }
.fw-society-card--on .fw-society-card__title { color: var(--gold-light); }
.fw-society-card__desc { font-size: 11px; color: var(--text-dim); line-height: 1.3; }
.fw-tome-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
.fw-tome-card { display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; padding: 10px 8px; border-radius: 6px; cursor: pointer;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.28)); border: 1px solid var(--border-soft); }
.fw-tome-card:hover { border-color: var(--border); }
.fw-tome-card--selected { border-color: var(--gold); box-shadow: var(--glow-gold); background: rgba(201,162,74,0.14); }
.fw-tome-card__name { font-weight: 700; font-size: 12.5px; color: var(--text); }
.fw-tome-card--selected .fw-tome-card__name { color: var(--gold-light); }
.fw-tome-card__aff { font-size: 10.5px; color: var(--text-dim); }
.fw-tome-card__contents { list-style: none; margin: 2px 0 0; padding: 0; font-size: 10px; color: var(--text-faint); text-align: left; width: 100%; }
.fw-tome-card__contents li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 1px 0; }
.fw-colorrow { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.fw-swatch { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid rgba(0,0,0,0.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); transition: transform .08s, box-shadow .12s; }
.fw-swatch:hover { transform: translateY(-2px); }
.fw-swatch--selected { border-color: var(--gold-light); box-shadow: 0 0 0 2px var(--gold), var(--glow-gold); }
.fw-customcolor { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-dim); }
.fw-customcolor input[type=color] { width: 30px; height: 30px; padding: 0; border: 2px solid var(--border-soft); border-radius: 50%; background: none; cursor: pointer; overflow: hidden; }
.fw-bannerrow { display: flex; flex-wrap: wrap; gap: 10px; }
.fw-banneropt { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; border-radius: 5px; cursor: pointer; border: 1px solid var(--border-soft); background: rgba(0,0,0,0.24); font-size: 10.5px; color: var(--text-dim); }
.fw-banneropt:hover { border-color: var(--border); }
.fw-banneropt--selected { border-color: var(--gold); color: var(--gold-light); box-shadow: var(--glow-gold); background: rgba(201,162,74,0.14); }
.fw-shape { width: 30px; height: 38px; box-shadow: 0 1px 3px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.4); }
.fw-shape--square { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
.fw-shape--pennant { clip-path: polygon(0 0, 100% 0, 100% 68%, 50% 100%, 0 68%); }
.fw-shape--swallow { clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%); }
.fw-shape--round { border-radius: 0 0 50% 50% / 0 0 42% 42%; }
.fw-shape--spear { clip-path: polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%); }
.fw-preview { position: sticky; top: 0; display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 8px; background: linear-gradient(180deg, rgba(35,43,61,0.8), rgba(15,18,28,0.88)); border: 1px solid var(--border); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4); }
.fw-preview__head { display: flex; gap: 10px; align-items: center; }
.fw-preview__portrait { width: 76px; height: 76px; border-radius: 50%; overflow: hidden; flex: 0 0 auto; box-shadow: 0 0 0 3px var(--gold), 0 3px 10px rgba(0,0,0,0.6); }
.fw-preview__portrait img { width: 100%; height: 100%; display: block; object-fit: cover; }
.fw-preview__name { font-family: var(--font-title); font-size: 17px; color: var(--gold-light); line-height: 1.2; text-shadow: 0 1px 0 #000; }
.fw-preview__sub { font-size: 11.5px; color: var(--text-dim); line-height: 1.4; }
.fw-preview__banner { flex: 0 0 auto; }
.fw-affbars { display: flex; flex-direction: column; gap: 4px; }
.fw-affbar { display: grid; grid-template-columns: 18px 60px 1fr 18px; align-items: center; gap: 6px; font-size: 11px; color: var(--text-dim); }
.fw-affbar .aow-progress { height: 7px; }
.fw-preview__tome { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-dim); }
.fw-preview__traits { display: flex; flex-wrap: wrap; gap: 4px; }
.fw-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--border-soft); }
.fw-msg { color: var(--warn); font-size: 12px; flex: 1 1 auto; text-align: center; }
.fw-msg--ok { color: var(--good-light); }
.fw-creating { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  background: radial-gradient(ellipse at 50% 42%, rgba(40,34,58,0.96), rgba(6,7,12,0.98)); animation: aow-fade 0.2s ease; }
.fw-creating__spinner { width: 56px; height: 56px; border-radius: 50%; border: 4px solid rgba(201,162,74,0.25); border-top-color: var(--gold-light); animation: aow-spin 1s linear infinite; }
.fw-creating__text { font-family: var(--font-title); font-size: 18px; letter-spacing: 0.08em; color: var(--gold-light); text-shadow: 0 0 16px rgba(241,217,138,0.5); }

/* ---- load screen ---- */
.ld-list { display: flex; flex-direction: column; gap: 8px; }
.ld-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 6px; background: rgba(0,0,0,0.26); border: 1px solid var(--border-soft); }
.ld-row__name { font-weight: 700; color: var(--gold-light); flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ld-row__meta { font-size: 11.5px; color: var(--text-dim); flex: 0 0 auto; }
`);

  // ================================================================ small shared helpers
  function randPick(list, rng) {
    if (!list || !list.length) return null;
    const i = rng ? Math.floor(rng.next() * list.length) : Math.floor(Math.random() * list.length);
    return list[i];
  }
  function freshRng() { return new AOW.RNG(Date.now() ^ Math.floor(Math.random() * 1e9)); }
  function namesList(id) { return Data.has('names', id) ? Data.get('names', id).list : []; }
  function randomFactionName(rng) { const e = randPick(namesList('faction_names'), rng); return e ? L(e) : 'New Realm'; }
  function randomRulerName(rng) { const e = randPick(namesList('ruler_names'), rng); return e ? L(e) : State.generateName(rng || freshRng(), 'ruler'); }
  function randomSeedWord() {
    const rng = freshRng();
    const e = randPick(namesList('realm_names'), rng);
    const base = (e ? L(e) : 'Realm').replace(/\s+/g, '');
    return base + '-' + rng.int(100, 999);
  }
  function sumAff(acc, aff) { if (aff) for (const k of Object.keys(aff)) acc[k] = (acc[k] || 0) + (aff[k] || 0); }
  function traitCost(id) { return Data.has('traits', id) ? (Data.get('traits', id).cost || 1) : 0; }

  /** rebuild `root`'s children from buildFn(), restoring focus+selection on the element tagged data-focus. */
  function rebuildPreservingFocus(root, buildFn) {
    let tag = null, selStart = null, selEnd = null;
    try {
      const active = document.activeElement;
      if (active && root.contains(active) && active.getAttribute) {
        tag = active.getAttribute('data-focus');
        if (tag && typeof active.selectionStart === 'number') { selStart = active.selectionStart; selEnd = active.selectionEnd; }
      }
    } catch (e) { /* ignore */ }
    root.innerHTML = '';
    const content = buildFn();
    if (Array.isArray(content)) content.forEach(c => { if (c) root.appendChild(c); }); else if (content) root.appendChild(content);
    if (tag) {
      const again = root.querySelector('[data-focus="' + tag + '"]');
      if (again) { safe(() => again.focus()); if (selStart !== null && again.setSelectionRange) safe(() => again.setSelectionRange(selStart, selEnd)); }
    }
  }

  // ---------------------------------------------------------------- portrait bust painter (placeholder art;
  // used whenever AOW.UnitArt.portrait is unavailable, and always for forms/rulers which have no unit type)
  const bustCache = new Map();
  function mixC(a, b, k) { return AOW.Color && AOW.Color.mix ? AOW.Color.mix(a, b, k) : a; }
  function alphaC(a, k) { return AOW.Color && AOW.Color.alpha ? AOW.Color.alpha(a, k) : a; }
  function paintBust(size, look, cloth, cloth2) {
    look = look || {};
    const skin = look.skin || '#dcb88f', hair = look.hair, eyes = look.eyes || '#241c14', glow = look.glow;
    const c1 = cloth || '#3a4460', c2 = cloth2 || mixC(c1, '#ffffff', 0.55);
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const bgBase = glow ? mixC(glow, '#0b0e15', 0.72) : mixC(c1, '#0b0e15', 0.62);
    const bg = c.createRadialGradient(size * 0.5, size * 0.34, size * 0.02, size * 0.5, size * 0.6, size * 0.76);
    bg.addColorStop(0, mixC(bgBase, '#ffffff', 0.22)); bg.addColorStop(0.6, bgBase); bg.addColorStop(1, '#070910');
    c.fillStyle = bg; c.fillRect(0, 0, size, size);
    if (glow) { const gg = c.createRadialGradient(size * 0.5, size * 0.42, 0, size * 0.5, size * 0.42, size * 0.55); gg.addColorStop(0, alphaC(glow, 0.32)); gg.addColorStop(1, alphaC(glow, 0)); c.fillStyle = gg; c.fillRect(0, 0, size, size); }
    // shoulders / cloak
    const shg = c.createLinearGradient(0, size * 0.62, 0, size);
    shg.addColorStop(0, c1); shg.addColorStop(1, mixC(c1, '#000000', 0.35));
    c.fillStyle = shg; c.beginPath(); c.moveTo(size * 0.02, size * 1.08); c.quadraticCurveTo(size * 0.5, size * 0.56, size * 0.98, size * 1.08); c.closePath(); c.fill();
    c.strokeStyle = mixC(c2, '#000', 0.1); c.lineWidth = Math.max(1, size * 0.018); c.beginPath(); c.moveTo(size * 0.02, size * 1.06); c.quadraticCurveTo(size * 0.5, size * 0.55, size * 0.98, size * 1.06); c.stroke();
    // neck
    c.fillStyle = mixC(skin, '#000', 0.22); c.fillRect(size * 0.42, size * 0.56, size * 0.16, size * 0.2);
    // head
    const hg = c.createLinearGradient(size * 0.28, size * 0.2, size * 0.72, size * 0.72);
    hg.addColorStop(0, mixC(skin, '#fff', 0.15)); hg.addColorStop(1, mixC(skin, '#000', 0.16));
    c.fillStyle = hg; c.beginPath(); c.ellipse(size * 0.5, size * 0.42, size * 0.185, size * 0.225, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(10,8,16,0.45)'; c.lineWidth = Math.max(1, size * 0.01); c.stroke();
    // hair / ears hint
    if (hair) {
      c.fillStyle = hair;
      c.beginPath(); c.ellipse(size * 0.5, size * 0.29, size * 0.20, size * 0.13, 0, Math.PI, 0); c.fill();
      c.beginPath(); c.ellipse(size * 0.335, size * 0.40, size * 0.045, size * 0.13, 0.25, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(size * 0.665, size * 0.40, size * 0.045, size * 0.13, -0.25, 0, Math.PI * 2); c.fill();
    }
    // eyes
    c.fillStyle = eyes;
    c.beginPath(); c.ellipse(size * 0.435, size * 0.435, size * 0.017, size * 0.023, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(size * 0.565, size * 0.435, size * 0.017, size * 0.023, 0, 0, Math.PI * 2); c.fill();
    // crown hint
    if (look.crown) {
      c.strokeStyle = '#e8c357'; c.lineWidth = Math.max(1, size * 0.022); c.lineCap = 'round';
      c.beginPath(); c.arc(size * 0.5, size * 0.285, size * 0.20, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      for (const dx of [-0.14, 0, 0.14]) { c.beginPath(); c.moveTo(size * (0.5 + dx), size * 0.19); c.lineTo(size * (0.5 + dx), size * 0.15); c.stroke(); }
    }
    // vignette
    const v = c.createRadialGradient(size * 0.5, size * 0.5, size * 0.3, size * 0.5, size * 0.5, size * 0.74);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = v; c.fillRect(0, 0, size, size);
    return cv;
  }
  function bustURL(look, cloth, cloth2, size) {
    const key = JSON.stringify([look.skin, look.hair, look.eyes, look.glow, look.crown, cloth, cloth2, size]);
    let u = bustCache.get(key);
    if (u) return u;
    let cv = null;
    if (AOW.UnitArt && typeof AOW.UnitArt.portrait === 'function') {
      cv = safe(() => AOW.UnitArt.portrait(Object.assign({ body: 'form', armor: 'cloth', weapon: 'none', helm: 'none', shield: 'none' }, look), { size, playerColor: cloth, playerColor2: cloth2, frame: false }), null);
      if (cv && !(cv instanceof HTMLCanvasElement) && !(cv instanceof HTMLImageElement)) cv = null;
    }
    if (!cv) cv = paintBust(size, look, cloth, cloth2);
    u = safe(() => cv.toDataURL('image/png'), '');
    if (bustCache.size > 400) bustCache.clear();
    bustCache.set(key, u);
    return u;
  }
  function bustImg(look, cloth, cloth2, size) { return el('img', { src: bustURL(look, cloth, cloth2, size), alt: '', draggable: 'false' }); }

  // ---------------------------------------------------------------- affinity bars
  function computeAffinity(fd) {
    const aff = {}; for (const a of AFFS) aff[a] = 0;
    if (fd.cultureId && Data.has('cultures', fd.cultureId)) sumAff(aff, Data.get('cultures', fd.cultureId).affinity);
    for (const id of fd.societyTraits) if (Data.has('traits', id)) sumAff(aff, Data.get('traits', id).affinity);
    if (fd.tomeId && Data.has('tomes', fd.tomeId)) sumAff(aff, Data.get('tomes', fd.tomeId).affinity);
    return aff;
  }
  function affinityBarsEl(aff) {
    const max = Math.max(4, ...AFFS.map(a => aff[a] || 0));
    const box = el('div', { class: 'fw-affbars' });
    for (const a of AFFS) {
      const v = aff[a] || 0;
      box.appendChild(el('div', { class: 'fw-affbar' },
        UI.icon('affinity_' + a + '_bg', 16),
        el('span', null, UI.affinityName(a)),
        UI.progressBar(v, max, { color: (Palette && Palette.affinity && Palette.affinity[a]) || null, label: false }),
        el('b', { class: 'aow-num' }, v)));
    }
    return box;
  }

  // ---------------------------------------------------------------- effect summary (small local formatter;
  // kept independent from src/ui/screens.js so this file has no load-order dependency on it)
  const EFF_LABEL = {
    ko: { food: '식량', production: '생산력', gold: '금', mana: '마나', knowledge: '지식', draft: '징집력', imperium: '임페리움', stability: '안정도',
      hp: '체력', def: '방어', res: '저항', dmg: '피해', accuracy: '명중', mp: '이동력', morale: '사기', critChance: '치명타', healPerTurn: '턴당 회복',
      growthPct: '성장률', foodPct: '식량', productionPct: '생산력', goldPct: '금', manaPct: '마나', knowledgePct: '지식', dmgPct: '피해',
      upkeepPct: '유지비', recruitCostPct: '모집 비용', casting: '세계 시전', combatCasting: '전투 시전', cityCap: '도시 상한', provinceCostPct: '지방 비용',
      vision: '시야', spellCostPct: '주문 비용', armyMove: '군세 이동', xpPct: '경험치', rankUp: '시작 계급', diplomacyOpinion: '외교 호감', warScore: '전쟁 점수' },
    en: { food: 'Food', production: 'Production', gold: 'Gold', mana: 'Mana', knowledge: 'Knowledge', draft: 'Draft', imperium: 'Imperium', stability: 'Stability',
      hp: 'HP', def: 'Defense', res: 'Resistance', dmg: 'Damage', accuracy: 'Accuracy', mp: 'Movement', morale: 'Morale', critChance: 'Crit', healPerTurn: 'Heal/turn',
      growthPct: 'Growth', foodPct: 'Food', productionPct: 'Production', goldPct: 'Gold', manaPct: 'Mana', knowledgePct: 'Knowledge', dmgPct: 'Damage',
      upkeepPct: 'Upkeep', recruitCostPct: 'Recruit cost', casting: 'World casting', combatCasting: 'Combat casting', cityCap: 'City cap', provinceCostPct: 'Province cost',
      vision: 'Vision', spellCostPct: 'Spell cost', armyMove: 'Army move', xpPct: 'XP', rankUp: 'Start rank', diplomacyOpinion: 'Opinion', warScore: 'War score' },
  };
  function effLabel(k) {
    const tbl = EFF_LABEL[AOW.I18n.lang] || EFF_LABEL.en;
    if (tbl[k]) return tbl[k];
    const m = /^statusRes_(\w+)$/.exec(k); if (m) return m[1];
    return k;
  }
  function effText(effects) {
    const out = [];
    for (const k of Object.keys(effects || {})) { const v = effects[k]; if (!v || typeof v !== 'number') continue; out.push((v > 0 ? '+' : '') + v + (/Pct$/.test(k) ? '%' : '') + ' ' + effLabel(k)); }
    return out.join(', ');
  }

  // ================================================================================================
  // MENU screen — procedurally painted title scene
  // ================================================================================================
  (function registerMenu() {
    let canvas = null, ctx = null, sceneTime = 0, scene = null, npLineEl = null, npCounter = 0;
    function initScene() {
      scene = { stars: [], towers: [], windows: [] };
      for (let i = 0; i < 150; i++) scene.stars.push({ x: Math.random(), y: Math.random() * 0.6, r: 0.5 + Math.random() * 1.5, phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.1 });
      const n = 9;
      for (let i = 0; i < n; i++) {
        const dx = (i - (n - 1) / 2) * (0.017 + Math.random() * 0.009);
        scene.towers.push({ dx, w: 0.007 + Math.random() * 0.012, h: 0.03 + Math.random() * 0.075, spire: Math.random() < 0.4 });
        const wc = 2 + Math.floor(Math.random() * 3), ws = [];
        for (let k = 0; k < wc; k++) ws.push({ dx: (Math.random() - 0.5) * 0.6, dy: 0.15 + Math.random() * 0.75, phase: Math.random() * Math.PI * 2 });
        scene.windows.push(ws);
      }
    }
    function mountainLayer(c, W, H, o) {
      const step = 16;
      c.beginPath(); c.moveTo(-2, H + 2);
      for (let x = -step; x <= W + step; x += step) {
        const n = AOW.Noise ? AOW.Noise.fbm2((x + o.offset) * o.scale, o.seedY, o.seed, 3, 2, 0.55) : 0;
        const y = o.baseY - (n * 0.5 + 0.5) * o.amp - o.amp * 0.12;
        c.lineTo(x, y);
      }
      c.lineTo(W + 2, H + 2); c.closePath();
      const g = c.createLinearGradient(0, o.baseY - o.amp, 0, H);
      g.addColorStop(0, o.top); g.addColorStop(1, o.bottom);
      c.fillStyle = g; c.fill();
    }
    function drawCity(c, W, H, time) {
      const baseY = H * 0.735, cx = W * 0.5;
      const g = c.createRadialGradient(cx, baseY - H * 0.02, 4, cx, baseY, W * 0.15);
      g.addColorStop(0, 'rgba(255,196,110,0.30)'); g.addColorStop(1, 'rgba(255,196,110,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let i = 0; i < scene.towers.length; i++) {
        const tw = scene.towers[i], x = cx + tw.dx * W, w = tw.w * W, h = tw.h * H;
        c.fillStyle = '#12101f'; c.fillRect(x - w / 2, baseY - h, w, h);
        if (tw.spire) { c.beginPath(); c.moveTo(x - w / 2, baseY - h); c.lineTo(x, baseY - h - h * 0.6); c.lineTo(x + w / 2, baseY - h); c.closePath(); c.fill(); }
        for (const win of scene.windows[i]) {
          const a = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(time * 1.3 + win.phase));
          c.globalAlpha = a; c.fillStyle = '#ffd27a'; c.fillRect(x + win.dx * w - 1, baseY - h * win.dy - 1, 2, 2);
        }
      }
      c.globalAlpha = 1;
    }
    function drawMist(c, W, H, time) {
      for (let i = 0; i < 3; i++) {
        const y = H * (0.74 + i * 0.065), off = Math.sin(time * 0.14 + i * 2) * W * 0.05;
        const g = c.createLinearGradient(0, y - H * 0.045, 0, y + H * 0.045);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(214,222,240,' + (0.045 + i * 0.018) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(off - W * 0.12, y - H * 0.045, W * 1.24, H * 0.09);
      }
    }
    function draw() {
      if (!canvas || !ctx || !scene) return;
      const W = canvas._cssW || canvas.clientWidth || 1, H = canvas._cssH || canvas.clientHeight || 1;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#090c18'); sky.addColorStop(0.42, '#141a32'); sky.addColorStop(0.72, '#2b2444'); sky.addColorStop(1, '#3c2a3a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (const s of scene.stars) {
        const a = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(sceneTime * s.speed + s.phase))) * (1 - s.y * 0.4);
        ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = '#fff6df';
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const mx = W * 0.81, my = H * 0.15, mr = Math.max(10, Math.min(W, H) * 0.042);
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.4);
      mg.addColorStop(0, 'rgba(255,244,214,0.5)'); mg.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 3.4, 0, Math.PI * 2); ctx.fill();
      const moon = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      moon.addColorStop(0, '#fffdf2'); moon.addColorStop(1, '#e6d6a0');
      ctx.fillStyle = moon; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      mountainLayer(ctx, W, H, { seed: 11, seedY: 3, offset: sceneTime * 3.5, scale: 0.0021, baseY: H * 0.60, amp: H * 0.14, top: '#241f3c', bottom: '#171332' });
      mountainLayer(ctx, W, H, { seed: 37, seedY: 9, offset: sceneTime * 8, scale: 0.0032, baseY: H * 0.68, amp: H * 0.15, top: '#1c2b3c', bottom: '#0e1421' });
      drawCity(ctx, W, H, sceneTime);
      mountainLayer(ctx, W, H, { seed: 71, seedY: 21, offset: sceneTime * 15, scale: 0.0047, baseY: H * 0.87, amp: H * 0.21, top: '#0f1523', bottom: '#080a12' });
      drawMist(ctx, W, H, sceneTime);
      const vg = ctx.createRadialGradient(W * 0.5, H * 0.55, H * 0.18, W * 0.5, H * 0.55, H * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    function resize() {
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, canvas.clientWidth || window.innerWidth), h = Math.max(1, canvas.clientHeight || window.innerHeight);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas._cssW = w; canvas._cssH = h;
      ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function updateNowPlaying() {
      if (!npLineEl) return;
      if (!(AOW.Music && typeof AOW.Music.nowPlaying === 'function')) { npLineEl.hidden = true; return; }
      const np = safe(() => AOW.Music.nowPlaying(), null);
      if (!np) { npLineEl.hidden = true; return; }
      npLineEl.hidden = false;
      npLineEl.textContent = t('ui.nowPlaying') + ': ' + L(np.title) + (np.composer ? ' — ' + L(np.composer) : '');
    }
    function langSeg() {
      const wrap = el('div', { class: 'mm-lang aow-segment' });
      for (const lg of ['ko', 'en']) {
        const b = el('button', { type: 'button' }, t('ui.' + (lg === 'ko' ? 'korean' : 'english')));
        if (UI.lang() === lg) b.classList.add('aow-active');
        b.addEventListener('click', () => { sfx('ui_click'); UI.setLang(lg); });
        wrap.appendChild(b);
      }
      return wrap;
    }
    function buildOverlay() {
      npLineEl = el('div', { class: 'mm-nowplaying' }, '');
      updateNowPlaying();
      const hasSave = AOW.Main && typeof AOW.Main.hasSave === 'function' && AOW.Main.hasSave('quick');
      const meta = hasSave && AOW.Main.saveMeta ? safe(() => AOW.Main.saveMeta('quick'), null) : null;
      const buttons = el('div', { class: 'mm-buttons' },
        UI.button(t('ui.newGame'), () => UI.showScreen('newgame'), { kind: 'gold', large: true, wide: true, icon: 'flag' }),
        hasSave ? UI.button(meta ? t('mm.continueTurn', { n: meta.turn }) : t('ui.continue'), () => { if (!(AOW.Main.load && AOW.Main.load('quick'))) UI.toast('warn', t('ui.noSave')); }, { large: true, wide: true, icon: 'load' }) : null,
        UI.button(t('ui.load'), () => UI.showScreen('load'), { large: true, wide: true, icon: 'load' }),
        UI.button(t('ui.settings'), () => UI.showScreen('settings'), { large: true, wide: true, icon: 'settings' }),
        UI.hasScreen('encyclopedia') ? UI.button(t('mm.encyclopedia'), () => UI.showScreen('encyclopedia'), { large: true, wide: true, icon: 'scroll' }) : null);
      return el('div', { class: 'mm-overlay' },
        langSeg(),
        el('div', { class: 'mm-titleblock' },
          el('h1', { class: 'mm-title' }, 'Age of Godir'),
          el('div', { class: 'mm-titleKo' }, '신들의 시대'),
          el('div', { class: 'mm-tagline' }, t('ui.menuSub'))),
        buttons,
        el('div', { class: 'mm-footer' }, el('div', null, t('mm.credits')), npLineEl));
    }
    UI.registerScreen('menu', {
      open() {
        sceneTime = Math.random() * 20;
        npCounter = 0;
        initScene();
        canvas = el('canvas', { class: 'mm-canvas' });
        const root = el('div', { class: 'mm-root' }, canvas, buildOverlay());
        window.addEventListener('resize', resize);
        requestAnimationFrame(resize);
        if (AOW.Music && typeof AOW.Music.setMood === 'function') safe(() => AOW.Music.setMood('menu'));
        return root;
      },
      close() { window.removeEventListener('resize', resize); canvas = null; ctx = null; scene = null; npLineEl = null; },
      tick(dt) {
        sceneTime += dt; draw();
        npCounter += dt; if (npCounter > 1) { npCounter = 0; updateNowPlaying(); }
      },
    });
  })();

  // ================================================================================================
  // NEW GAME screen
  // ================================================================================================
  function NG_DEFAULT() {
    return { seed: '', mapSize: 'medium', aiCount: 3, difficulty: 'normal', realmTraits: [],
      victory: { expansion: true, magic: true, military: true, score: true }, turnLimit: 150, noLimit: false, manualDefense: false };
  }
  let NG = NG_DEFAULT();
  (function registerNewGame() {
    let root = null;
    function paint() { rebuildPreservingFocus(root, buildNewGameBody); }
    function segmentRow(labelKey, options, get, set) {
      const seg = el('div', { class: 'aow-segment' });
      for (const o of options) {
        const b = el('button', { type: 'button' }, o.label);
        if (get() === o.value) b.classList.add('aow-active');
        b.addEventListener('click', () => { sfx('ui_click'); set(o.value); paint(); });
        seg.appendChild(b);
      }
      return el('div', { class: 'ng-row' }, el('label', null, t(labelKey)), seg);
    }
    function buildNewGameBody() {
      const sizeOpts = ['small', 'medium', 'large'].map(id => ({ value: id, label: t('ng.size.' + id) + ' (' + State.MAP_SIZES[id].W + '×' + State.MAP_SIZES[id].H + ')' }));
      const diffOpts = ['easy', 'normal', 'hard', 'brutal'].map(id => ({ value: id, label: t('ng.diff.' + id) }));
      const seedRow = el('div', { class: 'ng-row' },
        el('label', null, t('ng.seed')),
        el('input', { class: 'aow-input', style: { flex: '1 1 200px' }, value: NG.seed, dataset: { focus: 'seed' }, placeholder: t('ng.seedRandom'), oninput: e => { NG.seed = e.target.value; } }),
        UI.button(t('ng.seedRandom'), () => { NG.seed = randomSeedWord(); paint(); }, { small: true }));
      const aiRow = el('div', { class: 'ng-row' },
        el('label', null, t('ng.aiCount')),
        el('div', { class: 'ng-stepper' },
          UI.button('−', () => { NG.aiCount = Math.max(1, NG.aiCount - 1); paint(); }, { small: true, cls: 'aow-btn--icon' }),
          el('span', { class: 'ng-stepper__val' }, NG.aiCount),
          UI.button('+', () => { NG.aiCount = Math.min(7, NG.aiCount + 1); paint(); }, { small: true, cls: 'aow-btn--icon' })),
        el('span', { class: 'ng-hint' }, t('ng.totalPlayers', { n: NG.aiCount + 1 })));
      const traitDefs = Data.list('realmTraits');
      const traitChips = el('div', { class: 'ng-chips' });
      for (const rt of traitDefs) {
        const on = NG.realmTraits.includes(rt.id);
        const blocked = !on && NG.realmTraits.length >= 3;
        const chip = el('span', { class: 'ng-chip' + (on ? ' ng-chip--on' : '') + (blocked ? ' ng-chip--disabled' : ''), tooltip: () => '<div class="tip-title">' + esc(L(rt.name)) + '</div><div class="tip-desc">' + esc(L(rt.desc)) + '</div>' }, L(rt.name));
        chip.addEventListener('click', () => {
          if (on) NG.realmTraits = NG.realmTraits.filter(x => x !== rt.id);
          else { if (NG.realmTraits.length >= 3) return; NG.realmTraits.push(rt.id); }
          sfx('ui_click'); paint();
        });
        traitChips.appendChild(chip);
      }
      const victoryChecks = el('div', { class: 'ng-checklist' },
        ...['expansion', 'magic', 'military', 'score'].map(k => {
          const input = el('input', { type: 'checkbox', checked: !!NG.victory[k] });
          input.addEventListener('change', () => { NG.victory[k] = input.checked; sfx('ui_click'); });
          return el('label', { class: 'aow-check' }, input, el('span', null, t('ng.victory.' + k)));
        }));
      const turnLimitRow = el('div', { class: 'ng-row' },
        el('label', null, t('ng.turnLimit')),
        el('input', { class: 'aow-input', type: 'number', min: 20, max: 999, style: { width: 90 }, value: NG.turnLimit, disabled: NG.noLimit, dataset: { focus: 'turnLimit' }, oninput: e => { NG.turnLimit = Math.max(20, +e.target.value || 150); } }),
        el('label', { class: 'aow-check' }, (() => { const i = el('input', { type: 'checkbox', checked: NG.noLimit }); i.addEventListener('change', () => { NG.noLimit = i.checked; sfx('ui_click'); paint(); }); return i; })(), el('span', null, t('ng.turnLimitNone'))));
      const manualDefRow = el('label', { class: 'aow-check' },
        (() => { const i = el('input', { type: 'checkbox', checked: NG.manualDefense }); i.addEventListener('change', () => { NG.manualDefense = i.checked; sfx('ui_click'); }); return i; })(),
        el('span', null, t('ng.manualDefense')));

      const grid = el('div', { class: 'ng-grid' },
        el('div', { class: 'ng-section' },
          el('h3', { class: 'aow-h3' }, t('ng.title')),
          seedRow,
          segmentRow('ng.mapSize', sizeOpts, () => NG.mapSize, v => { NG.mapSize = v; }),
          aiRow,
          segmentRow('ng.difficulty', diffOpts, () => NG.difficulty, v => { NG.difficulty = v; })),
        el('div', { class: 'ng-section' },
          el('h3', { class: 'aow-h3' }, t('ng.realmTraits')),
          el('div', { class: 'ng-hint' }, t('ng.realmTraitsHint', { n: NG.realmTraits.length })),
          traitChips,
          el('div', { class: 'aow-divider' }),
          el('h3', { class: 'aow-h3' }, t('ng.victory')),
          victoryChecks,
          turnLimitRow,
          el('div', { class: 'aow-divider' }),
          manualDefRow,
          el('div', { class: 'ng-hint' }, t('ng.manualDefenseHint'))));

      const footer = el('div', { class: 'ng-footer' },
        UI.button(t('ng.back'), () => UI.closeScreen(), { kind: 'ghost', icon: 'menu' }),
        UI.button(t('ng.next'), () => UI.showScreen('faction', { ng: NG }), { kind: 'gold', large: true }));
      return [grid, footer];
    }
    UI.registerScreen('newgame', {
      full: true,
      open() {
        root = el('div', { class: 'ng-root' });
        const p = UI.panel({ title: t('ng.title'), subtitle: t('ng.subtitle'), body: root, width: '100%' });
        paint();
        return p;
      },
      close() { root = null; },
    });
  })();

  // ================================================================================================
  // FACTION CREATION screen
  // ================================================================================================
  function defaultRaceTraits(form) {
    const out = []; let used = 0;
    for (const id of (form && form.bodyTraits) || []) {
      const c = traitCost(id); if (!c) continue;
      if (used + c <= 5) { out.push(id); used += c; }
    }
    return out;
  }
  function FD_DEFAULT() {
    const forms = Data.list('forms'), cultures = Data.list('cultures'), rulerTypes = Data.list('rulerTypes');
    const tomes1 = Data.list('tomes').filter(x => x.tier === 1);
    const form = forms[0] || { id: 'human', bodyTraits: [] };
    const culture = cultures[0] || { id: 'feudal', subChoices: [], bannerShape: 'square' };
    const ruler = rulerTypes[0] || { id: 'champion', allowedClasses: ['warrior'] };
    const heroClasses = Data.list('heroClasses');
    const heroClass = (ruler.allowedClasses && ruler.allowedClasses[0]) || (heroClasses[0] && heroClasses[0].id) || 'warrior';
    return {
      rulerType: ruler.id, rulerName: randomRulerName(), heroClass,
      formId: form.id, raceTraits: defaultRaceTraits(form),
      cultureId: culture.id, subChoice: (culture.subChoices && culture.subChoices.length) ? culture.subChoices[0].id : null,
      societyTraits: [], tomeId: tomes1.length ? tomes1[0].id : null,
      factionName: randomFactionName(), color: State.playerColor(0), color2: State.playerColor2(0),
      bannerShape: culture.bannerShape || 'square',
    };
  }
  const RULER_ICON = { champion: 'crown', wizard_king: 'staff', dragon_lord: 'breath_fire', eldritch_sovereign: 'tentacle', giant_king: 'stomp', elder_vampire: 'fang' };
  // small fallback tints for ruler-type busts whose rulerTypes.look omits skin/eyes (dragon_lord, giant_king) —
  // keeps the ruler cards visually distinct even before AOW.UnitArt.portrait can render their true bodies.
  const RULER_TINT = { dragon_lord: { skin: '#9a3a2a', eyes: '#ffd040', hair: null }, giant_king: { skin: '#8a9282', eyes: '#dfe3ea', hair: null } };
  function rulerBustLook(formLook, ruler) { return Object.assign({}, formLook, RULER_TINT[ruler && ruler.id], ruler && ruler.look); }
  const CLASS_ICON = { warrior: 'sword', defender: 'shield', ranger: 'bow', mage: 'staff', ritualist: 'heal', death_knight: 'skull', spellblade: 'sword_crossed', warlock: 'curse', battlesaint: 'holy_light' };
  const CULTURE_ICON = { feudal: 'castle', high: 'holy_light', barbarian: 'axe', industrious: 'gear', mystic: 'star', dark: 'skull', reaver: 'rifle', primal: 'root', oathsworn: 'sword_crossed', architect: 'wonder', nomad: 'wind' };
  const CONTENT_KIND = { spell: 'spells', unit: 'units', improvement: 'improvements', skill: 'heroSkills', transformation: 'transformations', empire: 'empireSkills', building: 'buildings' };

  function pickRandomRaceTraits(rng, budget) {
    const pool = Data.list('traits').filter(x => x.kind === 'body' || x.kind === 'mind');
    const shuffled = rng.shuffle(pool.slice());
    const out = []; let used = 0;
    for (const tr of shuffled) { const c = tr.cost || 1; if (used + c <= budget) { out.push(tr.id); used += c; } }
    return out;
  }
  function pickRandomSociety(rng, n) {
    const pool = Data.list('traits').filter(x => x.kind === 'society');
    return rng.shuffle(pool.slice()).slice(0, n).map(x => x.id);
  }
  function distinctColor(idx, used) {
    const n = (Palette && Palette.players && Palette.players.length) || 8;
    for (let k = 0; k < n; k++) { const j = (idx + k) % n; const c = State.playerColor(j); if (!used.has(c)) return { color: c, color2: State.playerColor2(j) }; }
    const base = State.playerColor(idx % n);
    const shifted = AOW.Color.hex(AOW.Color.hueShift(base, ((idx + 1) * 47) % 360));
    return { color: shifted, color2: AOW.Color.hex(AOW.Color.mix(shifted, '#ffffff', 0.55)) };
  }
  function buildSettings(ng, fd) {
    const rng = freshRng();
    const human = {
      name: (fd.factionName || '').trim() || randomFactionName(rng), isHuman: true,
      formId: fd.formId, cultureId: fd.cultureId, subChoice: fd.subChoice || null,
      rulerType: fd.rulerType, rulerName: (fd.rulerName || '').trim() || randomRulerName(rng), heroClass: fd.heroClass,
      traits: fd.raceTraits.concat(fd.societyTraits), tomes: fd.tomeId ? [fd.tomeId] : [],
      color: fd.color, color2: fd.color2, personality: 'expansionist',
    };
    const used = new Set([human.color]);
    const players = [human];
    const forms = Data.list('forms'), cultures = Data.list('cultures'), rulerTypes = Data.list('rulerTypes'), tomes1 = Data.list('tomes').filter(x => x.tier === 1);
    const heroClassesAll = Data.list('heroClasses').map(c => c.id);
    for (let i = 0; i < ng.aiCount; i++) {
      const form = randPick(forms, rng), culture = randPick(cultures, rng), ruler = randPick(rulerTypes, rng);
      const classes = (ruler.allowedClasses && ruler.allowedClasses.length) ? ruler.allowedClasses : heroClassesAll;
      const heroClass = randPick(classes, rng) || 'warrior';
      const sub = (culture.subChoices && culture.subChoices.length) ? randPick(culture.subChoices, rng).id : null;
      const race = pickRandomRaceTraits(rng, 5), soc = pickRandomSociety(rng, 2);
      const tome = tomes1.length ? randPick(tomes1, rng).id : null;
      const col = distinctColor(i + 1, used); used.add(col.color);
      players.push({
        name: randomFactionName(rng), isHuman: false, formId: form.id, cultureId: culture.id, subChoice: sub,
        rulerType: ruler.id, rulerName: randomRulerName(rng), heroClass,
        traits: race.concat(soc), tomes: tome ? [tome] : [],
        color: col.color, color2: col.color2, personality: State.PERSONALITIES[i % State.PERSONALITIES.length],
      });
    }
    return State.normalizeSettings({
      seed: ng.seed && ng.seed.trim() ? ng.seed.trim() : undefined,
      mapSize: ng.mapSize, players, difficulty: ng.difficulty, realmTraits: ng.realmTraits.slice(),
      victory: Object.assign({}, ng.victory, { turnLimit: ng.noLimit ? Infinity : (ng.turnLimit || 150) }),
      manualDefense: !!ng.manualDefense,
    });
  }

  (function registerFaction() {
    let root = null, FD = null, STEP = 1, NG_REF = null;
    function paint() { rebuildPreservingFocus(root, buildShell); }

    function raceBudgetUsed() { return FD.raceTraits.reduce((s, id) => s + traitCost(id), 0); }
    function cultureOf() { return Data.has('cultures', FD.cultureId) ? Data.get('cultures', FD.cultureId) : { subChoices: [] }; }
    function stepValid(n) {
      switch (n) {
        case 1: return !!FD.rulerType && !!FD.rulerName.trim() && !!FD.heroClass;
        case 2: return !!FD.formId && raceBudgetUsed() <= 5;
        case 3: { const cul = cultureOf(); return !!FD.cultureId && (!(cul.subChoices || []).length || !!FD.subChoice); }
        case 4: return FD.societyTraits.length === 2;
        case 5: return !!FD.tomeId;
        case 6: return !!FD.factionName.trim() && !!FD.color && !!FD.color2;
        default: return true;
      }
    }
    function stepMessage(n) {
      if (stepValid(n)) return '';
      switch (n) {
        case 1: return !FD.rulerType ? t('fw.errNeedRuler') : (!FD.rulerName.trim() ? t('fw.errNeedName') : t('fw.errNeedRuler'));
        case 2: return raceBudgetUsed() > 5 ? t('fw.errBudget') : t('fw.errNeedForm');
        case 3: return !FD.cultureId ? t('fw.errNeedCulture') : t('fw.errNeedSub');
        case 4: return t('fw.errNeedSociety');
        case 5: return t('fw.errNeedTome');
        case 6: return t('fw.errNeedFactionName');
      }
      return '';
    }
    function allValid() { for (let i = 1; i <= 6; i++) if (!stepValid(i)) return false; return true; }

    function currentLook() {
      const form = Data.has('forms', FD.formId) ? Data.get('forms', FD.formId) : null;
      const ruler = Data.has('rulerTypes', FD.rulerType) ? Data.get('rulerTypes', FD.rulerType) : null;
      return rulerBustLook(form ? form.look : {}, ruler);
    }

    // ---------------------------------------------------------------- preview panel
    function buildPreview() {
      const ruler = Data.has('rulerTypes', FD.rulerType) ? Data.get('rulerTypes', FD.rulerType) : null;
      const form = Data.has('forms', FD.formId) ? Data.get('forms', FD.formId) : null;
      const culture = Data.has('cultures', FD.cultureId) ? Data.get('cultures', FD.cultureId) : null;
      const cls = Data.has('heroClasses', FD.heroClass) ? Data.get('heroClasses', FD.heroClass) : null;
      const tome = FD.tomeId && Data.has('tomes', FD.tomeId) ? Data.get('tomes', FD.tomeId) : null;
      const aff = computeAffinity(FD);
      const cultureSub = culture && FD.subChoice ? (culture.subChoices || []).find(s => s.id === FD.subChoice) : null;
      return el('div', { class: 'fw-preview' },
        el('div', { class: 'fw-preview__head' },
          el('div', { class: 'fw-preview__portrait' }, bustImg(currentLook(), FD.color, FD.color2, 96)),
          el('div', { style: { minWidth: 0, flex: '1 1 auto' } },
            el('div', { class: 'fw-preview__name', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, FD.factionName || t('fw.factionName')),
            el('div', { class: 'fw-preview__sub' },
              (ruler ? L(ruler.name) : '') + (cls ? ' · ' + L(cls.name) : '') + (form ? ' · ' + L(form.name) : '')))),
        el('div', { class: 'fw-preview__sub' }, FD.rulerName || ''),
        el('div', { class: 'aow-divider' }),
        el('div', { class: 'fw-preview__sub' },
          (culture ? L(culture.name) : '') + (cultureSub ? ' — ' + L(cultureSub.name) : '')),
        el('div', { class: 'fw-preview__banner' }, UI.icon('banner', 46, { color: FD.color, color2: FD.color2 })),
        el('div', { class: 'aow-divider' }),
        el('div', { class: 'fw-section-title' }, t('fw.affinity')),
        affinityBarsEl(aff),
        el('div', { class: 'aow-divider' }),
        tome ? el('div', { class: 'fw-preview__tome' }, UI.tomeIcon ? UI.tomeIcon(tome.id, 36) : UI.icon('tome_' + Object.keys(tome.affinity || { astral: 1 })[0] + '_1', 36), el('span', null, L(tome.name))) : el('div', { class: 'aow-dim aow-small' }, '—'),
        FD.societyTraits.length ? el('div', { class: 'fw-preview__traits' }, FD.societyTraits.map(id => el('span', { class: 'aow-chip aow-chip--gold' }, Data.has('traits', id) ? L(Data.get('traits', id).name) : id))) : null);
    }

    // ---------------------------------------------------------------- step 1: ruler
    function stepRuler() {
      const rulers = Data.list('rulerTypes');
      const grid = el('div', { class: 'fw-cards-grid fw-cards-grid--wide' });
      for (const r of rulers) {
        const selected = FD.rulerType === r.id;
        const look = rulerBustLook(Data.has('forms', FD.formId) ? Data.get('forms', FD.formId).look : {}, r);
        const card = el('div', { class: 'fw-card' + (selected ? ' fw-card--selected' : ''), dataset: { ruler: r.id } },
          el('div', { class: 'fw-card__portrait' }, bustImg(look, '#3a4460', '#7a86b0', 60)),
          el('div', { class: 'fw-card__name' }, UI.icon(RULER_ICON[r.id] || 'crown', 14), ' ', L(r.name)),
          el('div', { class: 'fw-card__desc' }, effText(r.bonuses) || L(r.desc)));
        UI.tooltip(card, () => '<div class="tip-title">' + esc(L(r.name)) + '</div><div class="tip-desc">' + esc(L(r.desc)) + '</div>' + (effText(r.bonuses) ? '<div class="tip-sep"></div><div>' + esc(effText(r.bonuses)) + '</div>' : ''));
        card.addEventListener('click', () => {
          FD.rulerType = r.id;
          if (!(r.allowedClasses || []).includes(FD.heroClass)) FD.heroClass = (r.allowedClasses && r.allowedClasses[0]) || FD.heroClass;
          sfx('ui_click'); paint();
        });
        grid.appendChild(card);
      }
      const ruler = Data.has('rulerTypes', FD.rulerType) ? Data.get('rulerTypes', FD.rulerType) : { allowedClasses: [] };
      const classRow = el('div', { class: 'fw-class-row' });
      for (const cid of ruler.allowedClasses || []) {
        if (!Data.has('heroClasses', cid)) continue;
        const hc = Data.get('heroClasses', cid);
        const chip = el('span', { class: 'fw-class-chip' + (FD.heroClass === cid ? ' fw-class-chip--on' : ''), dataset: { heroClass: cid } }, UI.icon(CLASS_ICON[cid] || 'sword', 15), L(hc.name));
        UI.tooltip(chip, () => '<div class="tip-title">' + esc(L(hc.name)) + '</div><div class="tip-desc">' + esc(L(hc.desc)) + '</div>');
        chip.addEventListener('click', () => { FD.heroClass = cid; sfx('ui_click'); paint(); });
        classRow.appendChild(chip);
      }
      return [
        el('div', { class: 'fw-section-title' }, t('fw.step.1')),
        grid,
        el('div', { class: 'fw-row-inline' },
          el('label', null, t('fw.rulerName')),
          el('input', { class: 'aow-input', value: FD.rulerName, dataset: { focus: 'rulerName' }, oninput: e => { FD.rulerName = e.target.value; const nameEl = root.querySelector('.fw-preview__sub'); if (nameEl) nameEl.textContent = FD.rulerName; const btn = root.querySelector('.fw-footer .aow-btn--gold, .fw-footer .aow-btn--primary'); if (btn) btn._aowSetDisabled && btn._aowSetDisabled(!stepValid(1) && STEP === 1); } }),
          UI.button(t('fw.random'), () => { FD.rulerName = randomRulerName(); paint(); }, { small: true })),
        el('div', { class: 'fw-section-title' }, t('fw.heroClass')),
        classRow,
      ];
    }

    // ---------------------------------------------------------------- step 2: form + body/mind traits
    function stepForm() {
      const forms = Data.list('forms');
      const grid = el('div', { class: 'fw-cards-grid' });
      for (const f of forms) {
        const selected = FD.formId === f.id;
        const card = el('div', { class: 'fw-card' + (selected ? ' fw-card--selected' : ''), dataset: { form: f.id } },
          el('div', { class: 'fw-card__portrait' }, bustImg(f.look, '#4a5570', '#8894b8', 56)),
          el('div', { class: 'fw-card__name' }, L(f.name)));
        UI.tooltip(card, () => '<div class="tip-title">' + esc(L(f.name)) + '</div><div class="tip-desc">' + esc(L(f.desc)) + '</div>');
        card.addEventListener('click', () => { FD.formId = f.id; FD.raceTraits = defaultRaceTraits(f); sfx('ui_click'); paint(); });
        grid.appendChild(card);
      }
      const used = raceBudgetUsed();
      const budgetRow = el('div', { class: 'fw-budget-row' }, UI.progressBar(used, 5, { color: used > 5 ? 'var(--danger)' : null, label: false }), el('b', { class: used > 5 ? 'aow-bad' : 'aow-gold' }, t('fw.raceTraitsBudget', { used, max: 5 })));
      function traitChip(tr) {
        const on = FD.raceTraits.includes(tr.id);
        const wouldExceed = !on && used + (tr.cost || 1) > 5;
        const chip = el('div', { class: 'fw-trait-chip' + (on ? ' fw-trait-chip--on' : '') + (wouldExceed ? ' fw-trait-chip--disabled' : ''), dataset: { trait: tr.id } },
          el('span', null, L(tr.name)), el('span', { class: 'fw-trait-chip__cost' }, t('fw.cost', { n: tr.cost || 1 })));
        UI.tooltip(chip, () => '<div class="tip-title">' + esc(L(tr.name)) + '</div><div class="tip-desc">' + esc(L(tr.desc)) + '</div>');
        chip.addEventListener('click', () => {
          if (on) FD.raceTraits = FD.raceTraits.filter(x => x !== tr.id);
          else { if (used + (tr.cost || 1) > 5) return; FD.raceTraits.push(tr.id); }
          sfx('ui_click'); paint();
        });
        return chip;
      }
      const bodyList = el('div', { class: 'fw-trait-list' }, Data.list('traits').filter(x => x.kind === 'body').map(traitChip));
      const mindList = el('div', { class: 'fw-trait-list' }, Data.list('traits').filter(x => x.kind === 'mind').map(traitChip));
      return [
        el('div', { class: 'fw-section-title' }, t('fw.step.2')),
        grid,
        budgetRow,
        el('div', { class: 'fw-traits-cols' },
          el('div', null, el('div', { class: 'fw-section-title' }, t('fw.bodyTraits')), bodyList),
          el('div', null, el('div', { class: 'fw-section-title' }, t('fw.mindTraits')), mindList)),
      ];
    }

    // ---------------------------------------------------------------- step 3: culture
    function stepCulture() {
      const cultures = Data.list('cultures');
      const grid = el('div', { class: 'fw-cards-grid' });
      for (const c of cultures) {
        const selected = FD.cultureId === c.id;
        const affTxt = AFFS.filter(a => c.affinity && c.affinity[a]).map(a => UI.affinityName(a) + ' +' + c.affinity[a]).join(', ');
        const card = el('div', { class: 'fw-card' + (selected ? ' fw-card--selected' : ''), dataset: { culture: c.id } },
          el('div', { class: 'fw-card__swatch', style: { background: 'linear-gradient(135deg,' + (c.palette.primary || '#888') + ',' + (c.palette.secondary || '#666') + ')' } }),
          el('div', { class: 'fw-card__name' }, UI.icon(CULTURE_ICON[c.id] || 'castle', 14), ' ', L(c.name)),
          el('div', { class: 'fw-card__sub' }, affTxt || '—'),
          el('div', { class: 'fw-card__desc' }, L(c.desc)));
        UI.tooltip(card, () => '<div class="tip-title">' + esc(L(c.name)) + '</div><div class="tip-desc">' + esc(L(c.desc)) + '</div>' + (affTxt ? '<div class="tip-sep"></div><div>' + esc(affTxt) + '</div>' : ''));
        card.addEventListener('click', () => {
          FD.cultureId = c.id; FD.subChoice = (c.subChoices && c.subChoices.length) ? c.subChoices[0].id : null; FD.bannerShape = c.bannerShape || FD.bannerShape;
          sfx('ui_click'); paint();
        });
        grid.appendChild(card);
      }
      const culture = cultureOf();
      let subRow;
      if (culture.subChoices && culture.subChoices.length) {
        subRow = el('div', { class: 'fw-cards-grid' });
        for (const s of culture.subChoices) {
          const on = FD.subChoice === s.id;
          const card = el('div', { class: 'fw-card' + (on ? ' fw-card--selected' : ''), dataset: { sub: s.id } },
            el('div', { class: 'fw-card__name' }, L(s.name)),
            el('div', { class: 'fw-card__desc' }, L(s.desc)));
          UI.tooltip(card, () => '<div class="tip-title">' + esc(L(s.name)) + '</div><div class="tip-desc">' + esc(L(s.desc)) + '</div>');
          card.addEventListener('click', () => { FD.subChoice = s.id; sfx('ui_click'); paint(); });
          subRow.appendChild(card);
        }
      } else subRow = el('div', { class: 'aow-dim aow-small' }, t('fw.noSubChoice'));
      const traitsBlock = culture.traits && culture.traits.length ? el('div', { class: 'aow-kv' }, ...culture.traits.reduce((arr, ct) => arr.concat([el('span', null, L(ct.name)), el('span', null, L(ct.desc))]), [])) : null;
      return [
        el('div', { class: 'fw-section-title' }, t('fw.step.3')),
        grid,
        el('div', { class: 'fw-section-title' }, t('fw.subChoice')),
        subRow,
        traitsBlock ? el('div', { class: 'aow-divider' }) : null,
        traitsBlock,
      ];
    }

    // ---------------------------------------------------------------- step 4: society traits
    function stepSociety() {
      const soc = Data.list('traits').filter(x => x.kind === 'society');
      const grid = el('div', { class: 'fw-society-grid' });
      for (const tr of soc) {
        const on = FD.societyTraits.includes(tr.id);
        const blocked = !on && FD.societyTraits.length >= 2;
        const aff = AFFS.filter(a => tr.affinity && tr.affinity[a]);
        const card = el('div', { class: 'fw-society-card' + (on ? ' fw-society-card--on' : '') + (blocked ? ' fw-society-card--blocked' : ''), dataset: { trait: tr.id } },
          el('div', { class: 'fw-society-card__title' }, el('span', null, L(tr.name)), aff.length ? UI.icon('affinity_' + aff[0] + '_bg', 15) : null),
          el('div', { class: 'fw-society-card__desc' }, effText(tr.effects) || L(tr.desc)));
        UI.tooltip(card, () => '<div class="tip-title">' + esc(L(tr.name)) + '</div><div class="tip-desc">' + esc(L(tr.desc)) + '</div>');
        card.addEventListener('click', () => {
          if (on) FD.societyTraits = FD.societyTraits.filter(x => x !== tr.id);
          else { if (FD.societyTraits.length >= 2) return; FD.societyTraits.push(tr.id); }
          sfx('ui_click'); paint();
        });
        grid.appendChild(card);
      }
      return [el('div', { class: 'fw-section-title' }, t('fw.societyPick', { n: FD.societyTraits.length })), grid];
    }

    // ---------------------------------------------------------------- step 5: starting tome
    function stepTome() {
      const tomes = Data.list('tomes').filter(x => x.tier === 1);
      const grid = el('div', { class: 'fw-tome-grid' });
      for (const tm of tomes) {
        const selected = FD.tomeId === tm.id;
        const aff = Object.keys(tm.affinity || {})[0] || 'order';
        const iconName = UI.iconName ? UI.iconName(tm.icon, 'tome_' + aff + '_' + tm.tier) : (tm.icon || 'tome_' + aff + '_' + tm.tier);
        const contents = (tm.contents || []).slice(0, 5).map(c => { const kind = CONTENT_KIND[c.type]; const d = kind && Data.has(kind, c.id) ? Data.get(kind, c.id) : null; return el('li', null, d ? L(d.name) : c.id); });
        const card = el('div', { class: 'fw-tome-card' + (selected ? ' fw-tome-card--selected' : ''), dataset: { tome: tm.id } },
          UI.icon(iconName, 52),
          el('div', { class: 'fw-tome-card__name' }, L(tm.name)),
          el('div', { class: 'fw-tome-card__aff' }, AFFS.filter(a => tm.affinity && tm.affinity[a]).map(a => UI.affinityName(a) + ' +' + tm.affinity[a]).join(', ')),
          el('ul', { class: 'fw-tome-card__contents' }, contents));
        UI.tooltip(card, () => {
          let h = '<div class="tip-title">' + esc(L(tm.name)) + '</div><div class="tip-desc">' + esc(L(tm.desc)) + '</div>';
          if (tm.passive && tm.passive.desc) h += '<div class="tip-sep"></div><div><b>' + esc(t('fw.tomePassive')) + ':</b> ' + esc(L(tm.passive.desc)) + '</div>';
          return h;
        });
        card.addEventListener('click', () => { FD.tomeId = tm.id; sfx('ui_click'); paint(); });
        grid.appendChild(card);
      }
      return [el('div', { class: 'fw-section-title' }, t('fw.step.5')), grid];
    }

    // ---------------------------------------------------------------- step 6: colors & name
    function stepColors() {
      const nameRow = el('div', { class: 'fw-row-inline' },
        el('label', null, t('fw.factionName')),
        el('input', { class: 'aow-input', value: FD.factionName, dataset: { focus: 'factionName' }, oninput: e => { FD.factionName = e.target.value; const nm = root.querySelector('.fw-preview__name'); if (nm) nm.textContent = FD.factionName || t('fw.factionName'); } }),
        UI.button(t('fw.random'), () => { FD.factionName = randomFactionName(); paint(); }, { small: true }));
      function swatchRow(label, get, setPair, customKey) {
        const row = el('div', { class: 'fw-colorrow' });
        for (let i = 0; i < (Palette.players || []).length; i++) {
          const c1 = State.playerColor(i), c2 = State.playerColor2(i);
          const sw = el('span', { class: 'fw-swatch' + (get() === c1 ? ' fw-swatch--selected' : ''), style: { background: 'linear-gradient(135deg,' + c1 + ' 50%,' + c2 + ' 50%)' }, dataset: { color: i } });
          sw.addEventListener('click', () => { setPair(c1, c2); sfx('ui_click'); paint(); });
          row.appendChild(sw);
        }
        const custom = el('label', { class: 'fw-customcolor' }, t('fw.customColor'),
          el('input', { type: 'color', value: get(), dataset: { focus: customKey }, oninput: e => { setPair(e.target.value, FD.color2 === get() ? e.target.value : FD.color2); } }));
        return el('div', null, el('div', { class: 'fw-section-title' }, t(label)), row, custom);
      }
      const primaryRow = el('div', { class: 'fw-section-title' }, t('fw.primaryColor'));
      const colorRow = el('div', { class: 'fw-colorrow' });
      for (let i = 0; i < (Palette.players || []).length; i++) {
        const c1 = State.playerColor(i), c2 = State.playerColor2(i);
        const sw = el('span', { class: 'fw-swatch' + (FD.color === c1 && FD.color2 === c2 ? ' fw-swatch--selected' : ''), style: { background: 'linear-gradient(135deg,' + c1 + ' 50%,' + c2 + ' 50%)' } });
        sw.addEventListener('click', () => { FD.color = c1; FD.color2 = c2; sfx('ui_click'); paint(); });
        colorRow.appendChild(sw);
      }
      const customPrimary = el('label', { class: 'fw-customcolor' }, t('fw.customColor') + ' (' + t('fw.primaryColor') + ')',
        el('input', { type: 'color', value: FD.color, dataset: { focus: 'colorPrimary' }, oninput: e => { FD.color = e.target.value; const p = root.querySelector('.fw-preview__portrait img'); if (p) p.src = bustURL(currentLook(), FD.color, FD.color2, 96); } }));
      const customSecondary = el('label', { class: 'fw-customcolor' }, t('fw.customColor') + ' (' + t('fw.secondaryColor') + ')',
        el('input', { type: 'color', value: FD.color2, dataset: { focus: 'colorSecondary' }, oninput: e => { FD.color2 = e.target.value; const p = root.querySelector('.fw-preview__portrait img'); if (p) p.src = bustURL(currentLook(), FD.color, FD.color2, 96); } }));
      const shapeRow = el('div', { class: 'fw-bannerrow' });
      for (const shape of ['pennant', 'square', 'swallow', 'round', 'spear']) {
        const on = FD.bannerShape === shape;
        const opt = el('div', { class: 'fw-banneropt' + (on ? ' fw-banneropt--selected' : ''), dataset: { shape } },
          el('div', { class: 'fw-shape fw-shape--' + shape, style: { background: 'linear-gradient(180deg,' + FD.color + ',' + FD.color2 + ')' } }),
          el('span', null, t('fw.shape.' + shape)));
        opt.addEventListener('click', () => { FD.bannerShape = shape; sfx('ui_click'); paint(); });
        shapeRow.appendChild(opt);
      }
      return [
        el('div', { class: 'fw-section-title' }, t('fw.step.6')),
        nameRow,
        primaryRow, colorRow, customPrimary, customSecondary,
        el('div', { class: 'fw-section-title' }, t('fw.bannerShape')),
        shapeRow,
      ];
    }

    const STEP_BUILDERS = { 1: stepRuler, 2: stepForm, 3: stepCulture, 4: stepSociety, 5: stepTome, 6: stepColors };

    function showCreatingOverlay() {
      const ov = el('div', { class: 'fw-creating' }, el('div', { class: 'fw-creating__spinner' }), el('div', { class: 'fw-creating__text' }, t('fw.creating')));
      document.body.appendChild(ov);
      return ov;
    }
    function finishFaction() {
      if (!allValid()) { paint(); return; }
      sfx('ui_click');
      const overlay = showCreatingOverlay();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try {
          const settings = buildSettings(NG_REF || NG_DEFAULT(), FD);
          AOW.Main.startGame(settings);
        } catch (e) {
          console.error('[faction] startGame failed', e);
          UI.toast('bad', String((e && e.message) || e));
        } finally {
          overlay.remove();
        }
      }));
    }

    function buildShell() {
      const tabs = el('div', { class: 'aow-tabs fw-tabs' });
      for (let i = 1; i <= 6; i++) {
        const b = el('button', { class: 'aow-tab fw-tab' + (STEP === i ? ' aow-tab--active' : ''), type: 'button', dataset: { step: i } }, t('fw.step.' + i));
        if (!stepValid(i)) b.appendChild(el('span', { class: 'fw-tab-dot' }));
        b.addEventListener('click', () => { STEP = i; sfx('ui_click'); paint(); });
        tabs.appendChild(b);
      }
      const main = el('div', { class: 'fw-main' }, STEP_BUILDERS[STEP]());
      const shell = el('div', { class: 'fw-shell' }, main, buildPreview());
      const msg = stepMessage(STEP) || (STEP === 6 && !allValid() ? t('fw.errNeedSociety') : '');
      const isLast = STEP === 6;
      const footer = el('div', { class: 'fw-footer' },
        UI.button(t('fw.back'), () => { if (STEP > 1) { STEP--; sfx('ui_click'); paint(); } else UI.closeScreen(); }, { kind: 'ghost' }),
        el('div', { class: 'fw-msg' + (msg ? '' : ' fw-msg--ok') }, msg),
        isLast
          ? UI.button(t('fw.finish'), finishFaction, { kind: 'gold', large: true, disabled: !allValid() })
          : UI.button(t('fw.next'), () => { STEP = Math.min(6, STEP + 1); sfx('ui_click'); paint(); }, { kind: 'gold', large: true, disabled: !stepValid(STEP) }));
      return [tabs, shell, footer];
    }

    UI.registerScreen('faction', {
      full: true,
      open(params) {
        NG_REF = (params && params.ng) || NG;
        FD = FD_DEFAULT(); STEP = 1;
        root = el('div', { class: 'fw-root' });
        const p = UI.panel({ title: t('fw.title'), body: root, width: '100%' });
        paint();
        return p;
      },
      close() { root = null; },
    });
  })();

  // ================================================================================================
  // LOAD screen
  // ================================================================================================
  (function registerLoad() {
    function listSlots() {
      const slots = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf('aow.save.') === 0 && k.slice(-5) !== '.meta') slots.push(k.slice('aow.save.'.length));
        }
      } catch (e) { /* ignore */ }
      return slots;
    }
    UI.registerScreen('load', {
      open() {
        function render() {
          const slots = listSlots();
          const body = slots.length
            ? el('div', { class: 'ld-list' }, slots.map(slot => {
              const meta = safe(() => AOW.Main.saveMeta(slot), null);
              return el('div', { class: 'ld-row' },
                el('span', { class: 'ld-row__name' }, (meta && meta.name) || t('ld.unknown')),
                el('span', { class: 'ld-row__meta' }, meta ? t('ld.turn', { n: meta.turn }) : ''),
                el('span', { class: 'ld-row__meta' }, meta && meta.date ? new Date(meta.date).toLocaleString() : ''),
                UI.button(t('ld.load'), () => { if (!AOW.Main.load(slot)) UI.toast('warn', t('ui.noSave')); }, { kind: 'gold', small: true }),
                UI.button('', () => UI.confirm(t('ld.deleteConfirm'), () => {
                  try { localStorage.removeItem('aow.save.' + slot); localStorage.removeItem('aow.save.' + slot + '.meta'); } catch (e) { /* ignore */ }
                  UI.showScreen('load');
                }, { danger: true }), { kind: 'danger', small: true, icon: 'close' }));
            }))
            : el('div', { class: 'aow-empty' }, t('ld.empty'));
          return [body, el('div', { class: 'ng-footer' }, UI.button(t('ld.back'), () => UI.closeScreen(), { kind: 'ghost' }), el('span'))];
        }
        return UI.panel({ title: t('ld.title'), closable: true, onClose: () => UI.closeScreen(), body: render(), width: '100%' });
      },
    });
  })();

  AOW.log && AOW.log('menu.js: menu/newgame/faction/load screens registered');
})(window.AOW = window.AOW || {});
