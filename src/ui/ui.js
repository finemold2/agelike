// src/ui/ui.js — AOW.UI core: DOM helpers, theme frames, panels, buttons, tooltips, modals, toasts, screens,
// shared components (unit cards, rows), the 'settings' screen, global hotkeys and a fallback 'menu' (SPEC §10).
//
// Additive API beyond SPEC §10 (documented here for other UI files):
//   UI.tooltipAt(x, y, content) / UI.hideTooltip()      show/hide the shared parchment tooltip at a screen position (HUD hex tooltips)
//   UI.closeAll()                                        close every open screen (not the HUD) and modal
//   UI.closeModals()                                     close every modal
//   UI.settings {animSpeed, edgeScroll, yieldsOverlay, autoBattle}  persisted in localStorage 'aow.ui'; UI.setSetting(k, v) emits 'ui:setting' {key, value}
//   UI.toggleMute()                                      proxies AOW.Audio.toggleMute + toast
//   UI.hudApi()                                          the registered 'hud' screen definition (hotkeys call hud.endTurn/nextUnit/centerCapital/onEscape)
//   UI.portraitURL(unitType, unit, size)                 cached data URL of a unit portrait (UnitArt.portrait or a painted placeholder)
//   UI.statusIcon(statusId, size) / UI.roleName(role) / UI.affinityName(id) / UI.resourceName(kind) / UI.mainAffinity(affObj)
//   UI.roman(n), UI.ROMAN                                'I'..'V'
//   UI.iconName(candidates…)                             first candidate AOW.Icons knows (or '')
//   UI.layers {screen, hud, toast, tooltip}              the four layer elements
//   UI.TOAST_MAX / UI.TOAST_TIMEOUT                      centre-toast cap (3) and auto-dismiss (5000 ms); 'notify' {low:true} → HUD list only
//   Screen definitions may also carry: full:true (opaque full-screen), dim:false (no backdrop), tick(dt), relang() (called on language change instead of re-open)
//   UI.button(...) marks the element with el._aowSetDisabled(bool) and el._aowSetLabel(str) helpers; UI.panel returns el with el.body / el.setTitle(str).
//   Modal api: {el, body, close(), setButtons([...])}; button onClick(ev, api) returning false keeps the modal open.
(function (AOW) {
  'use strict';
  const UI = AOW.UI || {};
  const hasFn = (ns, fn) => !!(AOW[ns] && typeof AOW[ns][fn] === 'function');
  const t = (k, p) => AOW.t(k, p);
  const L = (o, p) => AOW.L(o, p);
  const safe = (fn, dflt) => { try { const r = fn(); return r === undefined ? dflt : r; } catch (e) { AOW.log && AOW.log('[UI] safe', e); return dflt; } };
  const Data = () => AOW.Data;
  const State = () => AOW.State;
  const game = () => AOW.game;
  const human = () => { const g = game(); return g ? (g.players.find(p => p.isHuman) || g.players[0]) : null; };

  // ------------------------------------------------------------------ i18n
  AOW.I18n.add({
    ko: {
      'ui.close': '닫기', 'ui.ok': '확인', 'ui.cancel': '취소', 'ui.yes': '예', 'ui.no': '아니오', 'ui.confirmTitle': '확인',
      'ui.settings': '설정', 'ui.language': '언어', 'ui.korean': '한국어', 'ui.english': 'English',
      'ui.audio': '소리', 'ui.master': '전체 음량', 'ui.music': '음악', 'ui.sfx': '효과음', 'ui.mute': '음소거', 'ui.muted': '음소거되었습니다.', 'ui.unmuted': '소리를 켰습니다.',
      'ui.nowPlaying': '재생 중', 'ui.noMusic': '재생 중인 곡이 없습니다', 'ui.prevSong': '이전 곡', 'ui.nextSong': '다음 곡', 'ui.play': '재생', 'ui.pause': '일시정지',
      'ui.gameOptions': '게임', 'ui.animSpeed': '애니메이션 속도', 'ui.instant': '즉시', 'ui.edgeScroll': '화면 가장자리 스크롤', 'ui.yieldsOverlay': '산출량 오버레이 표시', 'ui.autoBattle': '전투 자동 해결을 기본으로',
      'ui.manage': '게임 관리', 'ui.save': '저장', 'ui.load': '불러오기', 'ui.quitToMenu': '메인 메뉴로', 'ui.quitConfirm': '진행 중인 게임을 종료하고 메인 메뉴로 돌아갈까요?\n저장하지 않은 진행 상황은 사라집니다.',
      'ui.newGame': '새 게임', 'ui.continue': '이어하기', 'ui.noSave': '저장된 게임이 없습니다.', 'ui.menuTitle': 'AGELIKE', 'ui.menuSub': '신들의 시대 — 4X 판타지 전략',
      'ui.tier': '등급', 'ui.rank': '계급', 'ui.role': '병과', 'ui.hp': '체력', 'ui.def': '방어', 'ui.res': '저항', 'ui.mp': '이동력', 'ui.xp': '경험치', 'ui.level': '레벨', 'ui.lv': 'Lv',
      'ui.attacks': '공격', 'ui.abilities': '능력', 'ui.passives': '특성', 'ui.statuses': '상태 효과', 'ui.turnsN': '{n}턴', 'ui.cost': '비용', 'ui.upkeep': '유지비', 'ui.effects': '효과',
      'ui.cast': '시전', 'ui.build': '건설', 'ui.recruit': '모집', 'ui.notEnoughMana': '마나가 부족합니다', 'ui.notEnoughGold': '금이 부족합니다', 'ui.notAvailable': '지금은 할 수 없습니다',
      'ui.hero': '영웅', 'ui.ruler': '통치자', 'ui.spell': '주문', 'ui.tome': '마도서', 'ui.passive': '패시브', 'ui.contents': '내용', 'ui.unknown': '알 수 없음', 'ui.none': '없음', 'ui.screenError': '화면 오류',
      'ui.range': '사거리', 'ui.damage': '피해', 'ui.melee': '근접', 'ui.ranged': '원거리', 'ui.dead': '사망', 'ui.class': '직업', 'ui.target': '대상', 'ui.production': '생산력',
      'ui.role_shield': '방패병', 'ui.role_pike': '창병', 'ui.role_shock': '돌격병', 'ui.role_ranged': '원거리', 'ui.role_support': '지원', 'ui.role_skirmisher': '척후병', 'ui.role_mage': '마법사',
      'ui.role_polearm': '장창병', 'ui.role_fighter': '전사', 'ui.role_cavalry': '기병', 'ui.role_siege': '공성', 'ui.role_hero': '영웅',
      'ui.aff_order': '질서', 'ui.aff_chaos': '혼돈', 'ui.aff_nature': '자연', 'ui.aff_materium': '물질', 'ui.aff_astral': '아스트랄', 'ui.aff_shadow': '그림자',
      'ui.res_gold': '금', 'ui.res_mana': '마나', 'ui.res_knowledge': '지식', 'ui.res_imperium': '제국력', 'ui.res_food': '식량', 'ui.res_production': '생산력', 'ui.res_draft': '징집력',
      'ui.res_stability': '안정도', 'ui.res_pop': '인구', 'ui.res_casting': '시전 포인트', 'ui.res_cp': '시전 포인트',
      'ui.kind_world': '세계 주문', 'ui.kind_combat': '전투 주문', 'ui.kind_unit_enchant': '유닛 강화', 'ui.kind_city_enchant': '도시 강화', 'ui.kind_summon': '소환', 'ui.kind_transform': '변형', 'ui.kind_empire': '제국 주문', 'ui.kind_strategic': '전략 주문',
      'ui.cat_economy': '경제', 'ui.cat_military': '군사', 'ui.cat_defense': '방어', 'ui.cat_stability': '안정', 'ui.cat_growth': '성장', 'ui.cat_special': '특수', 'ui.cat_culture': '문화',
      'ui.tierN': '{n}등급', 'ui.tomeTierN': '제{n}단계 마도서', 'ui.sliderPct': '{n}%', 'ui.settingsHint': 'Esc: 닫기 · F5/F9: 빠른 저장/불러오기 · M: 음소거',
    },
    en: {
      'ui.close': 'Close', 'ui.ok': 'OK', 'ui.cancel': 'Cancel', 'ui.yes': 'Yes', 'ui.no': 'No', 'ui.confirmTitle': 'Confirm',
      'ui.settings': 'Settings', 'ui.language': 'Language', 'ui.korean': '한국어', 'ui.english': 'English',
      'ui.audio': 'Audio', 'ui.master': 'Master volume', 'ui.music': 'Music', 'ui.sfx': 'Sound effects', 'ui.mute': 'Mute', 'ui.muted': 'Audio muted.', 'ui.unmuted': 'Audio on.',
      'ui.nowPlaying': 'Now playing', 'ui.noMusic': 'Nothing is playing', 'ui.prevSong': 'Previous', 'ui.nextSong': 'Next', 'ui.play': 'Play', 'ui.pause': 'Pause',
      'ui.gameOptions': 'Game', 'ui.animSpeed': 'Animation speed', 'ui.instant': 'Instant', 'ui.edgeScroll': 'Edge scrolling', 'ui.yieldsOverlay': 'Show yields overlay', 'ui.autoBattle': 'Auto-resolve battles by default',
      'ui.manage': 'Game', 'ui.save': 'Save', 'ui.load': 'Load', 'ui.quitToMenu': 'Quit to menu', 'ui.quitConfirm': 'Leave the current game and return to the main menu?\nUnsaved progress will be lost.',
      'ui.newGame': 'New Game', 'ui.continue': 'Continue', 'ui.noSave': 'No saved game found.', 'ui.menuTitle': 'AGELIKE', 'ui.menuSub': 'Age of Godir — 4X fantasy strategy',
      'ui.tier': 'Tier', 'ui.rank': 'Rank', 'ui.role': 'Role', 'ui.hp': 'HP', 'ui.def': 'Defense', 'ui.res': 'Resistance', 'ui.mp': 'Movement', 'ui.xp': 'XP', 'ui.level': 'Level', 'ui.lv': 'Lv',
      'ui.attacks': 'Attacks', 'ui.abilities': 'Abilities', 'ui.passives': 'Passives', 'ui.statuses': 'Status effects', 'ui.turnsN': '{n} turns', 'ui.cost': 'Cost', 'ui.upkeep': 'Upkeep', 'ui.effects': 'Effects',
      'ui.cast': 'Cast', 'ui.build': 'Build', 'ui.recruit': 'Recruit', 'ui.notEnoughMana': 'Not enough mana', 'ui.notEnoughGold': 'Not enough gold', 'ui.notAvailable': 'Not available right now',
      'ui.hero': 'Hero', 'ui.ruler': 'Ruler', 'ui.spell': 'Spell', 'ui.tome': 'Tome', 'ui.passive': 'Passive', 'ui.contents': 'Contents', 'ui.unknown': 'Unknown', 'ui.none': 'None', 'ui.screenError': 'Screen error',
      'ui.range': 'Range', 'ui.damage': 'Damage', 'ui.melee': 'Melee', 'ui.ranged': 'Ranged', 'ui.dead': 'Dead', 'ui.class': 'Class', 'ui.target': 'Target', 'ui.production': 'Production',
      'ui.role_shield': 'Shield', 'ui.role_pike': 'Pike', 'ui.role_shock': 'Shock', 'ui.role_ranged': 'Ranged', 'ui.role_support': 'Support', 'ui.role_skirmisher': 'Skirmisher', 'ui.role_mage': 'Mage',
      'ui.role_polearm': 'Polearm', 'ui.role_fighter': 'Fighter', 'ui.role_cavalry': 'Cavalry', 'ui.role_siege': 'Siege', 'ui.role_hero': 'Hero',
      'ui.aff_order': 'Order', 'ui.aff_chaos': 'Chaos', 'ui.aff_nature': 'Nature', 'ui.aff_materium': 'Materium', 'ui.aff_astral': 'Astral', 'ui.aff_shadow': 'Shadow',
      'ui.res_gold': 'Gold', 'ui.res_mana': 'Mana', 'ui.res_knowledge': 'Knowledge', 'ui.res_imperium': 'Imperium', 'ui.res_food': 'Food', 'ui.res_production': 'Production', 'ui.res_draft': 'Draft',
      'ui.res_stability': 'Stability', 'ui.res_pop': 'Population', 'ui.res_casting': 'Casting points', 'ui.res_cp': 'Casting points',
      'ui.kind_world': 'World spell', 'ui.kind_combat': 'Combat spell', 'ui.kind_unit_enchant': 'Unit enchantment', 'ui.kind_city_enchant': 'City enchantment', 'ui.kind_summon': 'Summon', 'ui.kind_transform': 'Transformation', 'ui.kind_empire': 'Empire spell', 'ui.kind_strategic': 'Strategic spell',
      'ui.cat_economy': 'Economy', 'ui.cat_military': 'Military', 'ui.cat_defense': 'Defense', 'ui.cat_stability': 'Stability', 'ui.cat_growth': 'Growth', 'ui.cat_special': 'Special', 'ui.cat_culture': 'Culture',
      'ui.tierN': 'Tier {n}', 'ui.tomeTierN': 'Tier {n} tome', 'ui.sliderPct': '{n}%', 'ui.settingsHint': 'Esc: close · F5/F9: quick save/load · M: mute',
    },
  });

  // ------------------------------------------------------------------ constants & small helpers
  UI.ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
  UI.roman = n => UI.ROMAN[Math.max(0, Math.min(6, n | 0))] || String(n);
  const KIND_ICON = { info: 'info', good: 'check', warn: 'warning', bad: 'cross' };
  const RES_ICON = { gold: 'gold', mana: 'mana', knowledge: 'knowledge', imperium: 'imperium', food: 'food', production: 'production', draft: 'draft', stability: 'stability', pop: 'pop', casting: 'casting', cp: 'casting' };
  const CAT_ICON = { economy: 'gold', military: 'recruit', defense: 'wall', stability: 'stability', growth: 'pop', special: 'star', culture: 'castle' };
  const UNITLESS = new Set(['opacity', 'zIndex', 'flex', 'flexGrow', 'flexShrink', 'fontWeight', 'lineHeight', 'order', 'zoom']);
  const portraitCache = new Map();
  let sfxOk = true;
  function sfx(name, opts) { if (!sfxOk || !hasFn('SFX', 'play')) return; try { AOW.SFX.play(name, opts); } catch (e) { sfxOk = false; } }

  UI.iconName = function () { const I = AOW.Icons; if (!I || typeof I.has !== 'function') return ''; for (const n of arguments) if (n && I.has(n)) return n; return ''; };
  UI.roleName = role => (AOW.I18n.has('ui.role_' + role) ? t('ui.role_' + role) : (role || ''));
  UI.affinityName = id => (AOW.I18n.has('ui.aff_' + id) ? t('ui.aff_' + id) : (id || ''));
  UI.resourceName = kind => (AOW.I18n.has('ui.res_' + kind) ? t('ui.res_' + kind) : (kind || ''));
  UI.mainAffinity = function (aff) {
    if (!aff) return null;
    if (typeof aff === 'string') return aff;
    let best = null, bv = -Infinity;
    for (const k of Object.keys(aff)) if (aff[k] > bv) { bv = aff[k]; best = k; }
    return best;
  };
  UI.fmt = function (n) {
    if (n === null || n === undefined || (typeof n === 'number' && isNaN(n))) return '–';
    if (typeof n !== 'number') return String(n);
    if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Number.isInteger(n)) return n.toLocaleString('en-US');
    return (Math.round(n * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
  };
  UI.fmtSigned = function (n) {
    if (typeof n !== 'number' || isNaN(n)) return '–';
    if (n > 0) return '+' + UI.fmt(n);
    if (n < 0) return '−' + UI.fmt(-n);
    return '0';
  };
  UI.signClass = n => (n > 0 ? 'aow-pos' : n < 0 ? 'aow-neg' : '');

  // ------------------------------------------------------------------ DOM helpers
  function append(e, c) {
    if (c === null || c === undefined || c === false || c === true) return;
    if (Array.isArray(c)) { for (const x of c) append(e, x); return; }
    if (c instanceof Node) e.appendChild(c);
    else e.appendChild(document.createTextNode(String(c)));
  }
  /** UI.el(tag, attrs, ...children) — see SPEC §10; extra attrs: 'tooltip' (content|fn), on<event> handlers, dataset:{}. */
  UI.el = function (tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class' || k === 'className') e.className = v;
      else if (k === 'style') {
        if (typeof v === 'string') e.style.cssText = v;
        else for (const s of Object.keys(v)) { const sv = v[s]; if (sv === null || sv === undefined) continue; if (s.startsWith('--')) e.style.setProperty(s, sv); else e.style[s] = (typeof sv === 'number' && !UNITLESS.has(s)) ? sv + 'px' : sv; }
      } else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'dataset') { for (const d of Object.keys(v)) if (v[d] !== undefined && v[d] !== null) e.dataset[d] = v[d]; }
      else if (k === 'tooltip') UI.tooltip(e, v);
      else if (k.length > 2 && k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'disabled' || k === 'checked' || k === 'hidden' || k === 'selected' || k === 'readOnly') e[k] = !!v;
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) append(e, arguments[i]);
    return e;
  };
  const el = UI.el;
  const cssSeen = new Set();
  UI.css = function (str) {
    if (!str || cssSeen.has(str)) return;
    cssSeen.add(str);
    const s = document.createElement('style');
    s.setAttribute('data-aow', '1');
    s.textContent = str;
    document.head.appendChild(s);
  };
  UI.icon = function (name, size, params) {
    size = size || 20;
    const I = AOW.Icons;
    if (I && typeof I.dataURL === 'function' && name && (typeof I.has !== 'function' || I.has(name))) {
      const url = safe(() => I.dataURL(name, size, params), '');
      if (url) return el('img', { class: 'icon icon--' + name, src: url, width: size, height: size, alt: '', draggable: 'false', style: { width: size, height: size } });
    }
    return el('span', { class: 'icon icon--missing', style: { width: size, height: size }, dataset: { icon: name || '' } });
  };
  UI.statusIcon = function (statusId, size) {
    const def = Data().has('statuses', statusId) ? Data().get('statuses', statusId) : null;
    return UI.icon(UI.iconName(def && def.icon, statusId, def && def.kind === 'buff' ? 'bless' : 'curse') || 'star', size || 14);
  };

  // ------------------------------------------------------------------ settings (persisted)
  UI.settings = { animSpeed: 1, edgeScroll: true, yieldsOverlay: false, autoBattle: false };
  try { Object.assign(UI.settings, JSON.parse(localStorage.getItem('aow.ui') || '{}')); } catch (e) { /* ignore */ }
  function applySetting(key, value) {
    if (key === 'animSpeed') document.documentElement.style.setProperty('--anim', value === 0 ? 100 : value);
    const WR = AOW.WorldRender;
    if (WR) {
      try {
        if (typeof WR.setOption === 'function') WR.setOption(key, value);
        else if (typeof WR.setOptions === 'function') WR.setOptions({ [key]: value });
        if (key === 'yieldsOverlay' && typeof WR.setOverlay === 'function') WR.setOverlay('yields', !!value);
      } catch (e) { /* renderer may not support it yet */ }
    }
  }
  UI.setSetting = function (key, value) {
    UI.settings[key] = value;
    try { localStorage.setItem('aow.ui', JSON.stringify(UI.settings)); } catch (e) { /* ignore */ }
    applySetting(key, value);
    AOW.Events.emit('ui:setting', { key, value, settings: UI.settings });
  };

  // ------------------------------------------------------------------ init
  UI.layers = { screen: null, hud: null, toast: null, tooltip: null };
  const screens = new Map();
  const stack = [];           // open screens (not hud): {name, el, inner, def, params}
  const modals = [];          // {el, close, closable}
  let hudDef = null, hudEl = null, hudParams = null;
  let inited = false;

  function injectFrames() {
    const I = AOW.Icons, root = document.documentElement.style;
    const set = (k, v) => { if (v) root.setProperty(k, 'url("' + v + '")'); };
    if (I && typeof I.frameDataURL === 'function') {
      safe(() => set('--frame-panel', I.frameDataURL(120, 120, 'panel')));
      safe(() => set('--frame-parchment', I.frameDataURL(160, 160, 'parchment')));
      safe(() => set('--frame-tooltip', I.frameDataURL(160, 160, 'tooltip')));
      safe(() => set('--frame-slot', I.frameDataURL(48, 48, 'slot')));
      safe(() => set('--frame-portrait', I.frameDataURL(96, 96, 'portrait')));
      safe(() => set('--frame-tab', I.frameDataURL(96, 36, 'tab')));
      safe(() => set('--frame-btn', I.frameDataURL(64, 36, 'button')));
      safe(() => set('--frame-btn-hover', I.frameDataURL(64, 36, 'button_hover')));
      safe(() => set('--frame-btn-active', I.frameDataURL(64, 36, 'button_active')));
    }
    if (I && typeof I.dividerDataURL === 'function') safe(() => set('--divider-url', I.dividerDataURL(240)));
    if (AOW.Art && typeof AOW.Art.canvas === 'function' && typeof AOW.Art.noiseFill === 'function') {
      safe(() => { const c = AOW.Art.canvas(96, 96); AOW.Art.noiseFill(c.ctx, 0, 0, 96, 96, { seed: 5, scale: 5, colors: ['#000000', '#ffffff'], alpha: 0.05 }); set('--noise-url', c.cv.toDataURL('image/png')); });
    }
  }
  function isTyping(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }
  function hudCall(fn) {
    if (hudDef && typeof hudDef[fn] === 'function') { try { return hudDef[fn](); } catch (e) { console.error('[UI] hud.' + fn, e); return false; } }
    if (fn === 'endTurn' && game() && hasFn('Turn', 'endTurn')) { AOW.Turn.endTurn(game()); UI.refresh(); return true; }
    if (fn === 'centerCapital' && game() && hasFn('WorldRender', 'centerOn')) { const cap = State().capital(game(), human().id); if (cap) AOW.WorldRender.centerOn(cap.hex, true); return true; }
    return false;
  }
  UI.hudApi = () => hudDef;
  UI.toggleMute = function () {
    if (!hasFn('Audio', 'toggleMute')) return false;
    const m = AOW.Audio.toggleMute();
    UI.toast('info', t(m ? 'ui.muted' : 'ui.unmuted'), { icon: m ? 'sound_off' : 'sound_on', timeout: 1800, sound: false });
    return m;
  };
  function onKeyDown(e) {
    if (isTyping(e.target)) return;
    const key = e.key;
    if (key === 'Escape') {
      if (modals.length) { const m = modals[modals.length - 1]; if (m.closable) m.close(); e.preventDefault(); return; }
      const top = stack[stack.length - 1];
      if (!top && hudEl && hudDef && typeof hudDef.onEscape === 'function' && safe(() => hudDef.onEscape(), false)) { e.preventDefault(); return; }
      if (top && top.name !== 'menu' && top.name !== 'battle') { UI.closeScreen(); e.preventDefault(); return; }
      if (!top && hudEl && game()) { UI.showScreen('settings'); e.preventDefault(); }
      return;
    }
    if (modals.length || stack.length) return;
    if (!hudEl || !game()) return;
    if (key === 'Enter' || key === ' ') { e.preventDefault(); hudCall('endTurn'); }
    else if (key === 'n' || key === 'N') { e.preventDefault(); hudCall('nextUnit'); }
    else if (key === 'c' || key === 'C') { e.preventDefault(); hudCall('centerCapital'); }
    else if (key === 'm' || key === 'M') { e.preventDefault(); UI.toggleMute(); }
  }

  UI.init = function () {
    if (inited) return;
    inited = true;
    let root = document.getElementById('ui');
    if (!root) { root = el('div', { id: 'ui' }); (document.getElementById('app') || document.body).appendChild(root); }
    root.innerHTML = '';
    UI.layers.hud = el('div', { id: 'hud-layer', class: 'aow-layer' });
    UI.layers.screen = el('div', { id: 'screen-layer', class: 'aow-layer' });
    UI.layers.toast = el('div', { id: 'toast-layer', class: 'aow-layer' });
    UI.layers.tooltip = el('div', { id: 'tooltip-layer', class: 'aow-layer' });
    root.appendChild(UI.layers.hud); root.appendChild(UI.layers.screen); root.appendChild(UI.layers.toast); root.appendChild(UI.layers.tooltip);
    injectFrames();
    for (const k of Object.keys(UI.settings)) applySetting(k, UI.settings[k]);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', e => { tipPos.x = e.clientX; tipPos.y = e.clientY; }, { passive: true });
    window.addEventListener('blur', () => UI.hideTooltip());
    // routine news (rank-ups, production finished, own-action confirmations: notify {low:true}) only goes to the
    // HUD notification list; everything else also gets a centre toast
    AOW.Events.on('notify', p => {
      if (!p || p.low || (p.notification && p.notification.low)) return;
      UI.toast(p.kind || 'info', typeof p.text === 'object' ? L(p.text) : (p.text || ''), { icon: p.icon, onClick: p.onClick, timeout: p.timeout, title: p.title });
    });
    AOW.Events.on('i18n:changed', () => relangAll());
    AOW.Events.on('game:new', () => { UI.closeModals(); UI.hideTooltip(); UI.selected = { armyId: null, cityId: null, unitId: null }; });
    UI.css(SETTINGS_CSS);
  };

  // ------------------------------------------------------------------ buttons & panels
  UI.button = function (label, onClick, o) {
    o = o || {};
    const kind = o.kind || 'default';
    const cls = ['aow-btn'];
    if (kind !== 'default') cls.push('aow-btn--' + kind);
    if (o.small) cls.push('aow-btn--small');
    if (o.large) cls.push('aow-btn--large');
    if (o.wide) cls.push('aow-btn--wide');
    if (o.active) cls.push('aow-btn--active');
    if (o.nav) cls.push('aow-btn--nav');
    if (!label && o.icon) cls.push('aow-btn--icon');
    if (o.cls) cls.push(o.cls);
    const b = el('button', { class: cls.join(' '), type: 'button', disabled: !!o.disabled, dataset: o.dataset, title: o.title, style: o.style });
    if (o.icon) b.appendChild(typeof o.icon === 'string' ? UI.icon(o.icon, o.iconSize || (o.small ? 15 : 18)) : o.icon);
    const lab = el('span', { class: 'aow-btn__label' });
    append(lab, label);
    if (label !== undefined && label !== null && label !== '') b.appendChild(lab);
    if (o.badge) b.appendChild(el('span', { class: 'aow-badge aow-btn__badge' }, o.badge));
    b.addEventListener('click', e => { if (b.disabled) return; if (o.sound !== false) sfx('ui_click'); if (onClick) onClick(e, b); });
    b.addEventListener('mouseenter', () => { if (!b.disabled && o.sound !== false) sfx('ui_hover', { volume: 0.4 }); });
    if (o.tooltip) UI.tooltip(b, o.tooltip);
    b._aowSetDisabled = v => { b.disabled = !!v; };
    b._aowSetLabel = s => { lab.textContent = s; };
    return b;
  };
  UI.panel = function (o) {
    o = o || {};
    const cls = ['aow-panel'];
    if (o.cls) cls.push(o.cls);
    if (o.compact) cls.push('aow-panel--compact');
    if (o.parchment) cls.push('aow-panel--parchment');
    const p = el('div', { class: cls.join(' '), style: o.width ? { width: typeof o.width === 'number' ? o.width + 'px' : o.width } : null, dataset: o.dataset });
    if (o.style) Object.assign(p.style, o.style);
    let titleEl = null;
    if (o.title || o.closable || o.subtitle) {
      titleEl = el('div', { class: 'aow-panel__title' }, o.icon ? (typeof o.icon === 'string' ? UI.icon(o.icon, 22) : o.icon) : null, el('span', { class: 'aow-ellipsis' }, o.title || ''));
      const head = el('div', { class: 'aow-panel__head' }, titleEl, o.subtitle ? el('span', { class: 'aow-panel__sub' }, o.subtitle) : null, o.headExtra || null);
      if (o.closable) head.appendChild(UI.button('', () => { if (o.onClose) o.onClose(p); }, { icon: 'close', kind: 'ghost', small: true, cls: 'aow-panel__close', tooltip: t('ui.close') }));
      p.appendChild(head);
      if (o.divider !== false) p.appendChild(el('div', { class: 'aow-divider' }));
    }
    const body = el('div', { class: 'aow-panel__body' + (o.scroll === false ? '' : ' aow-scroll') });
    if (typeof o.body === 'string') body.innerHTML = o.body; else append(body, o.body);
    p.appendChild(body);
    p.body = body;
    p.setTitle = s => { if (titleEl) titleEl.lastChild.textContent = s; };
    p.setBody = c => { body.innerHTML = ''; if (typeof c === 'string') body.innerHTML = c; else append(body, c); };
    return p;
  };
  UI.progressBar = function (value, max, o) {
    o = o || {};
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    const bar = el('div', { class: 'aow-progress' + (o.cls ? ' ' + o.cls : '') + (o.tall ? ' aow-progress--tall' : ''), style: o.height ? { height: o.height } : null },
      el('div', { class: 'aow-progress__fill', style: { width: pct + '%', '--fill': o.color || null } }),
      o.label !== undefined && o.label !== null && o.label !== false ? el('span', { class: 'aow-progress__label' }, o.label === true ? UI.fmt(value) + ' / ' + UI.fmt(max) : o.label) : null);
    if (o.tooltip) UI.tooltip(bar, o.tooltip);
    return bar;
  };
  UI.hpColor = function (ratio) { return ratio > 0.66 ? '#5fb043' : ratio > 0.33 ? '#e0a72b' : '#d94b3a'; };
  UI.resource = function (kind, value, o) {
    o = o || {};
    const signed = !!o.signed;
    const s = el('span', { class: 'aow-res aow-res--' + kind + (signed ? ' aow-res--signed ' + UI.signClass(value) : '') + (o.cls ? ' ' + o.cls : '') },
      o.icon === false ? null : UI.icon(RES_ICON[kind] || kind, o.size || 18),
      el('b', null, signed ? UI.fmtSigned(value) : UI.fmt(value)),
      o.label ? el('span', { class: 'aow-dim aow-small' }, o.label) : null);
    if (o.tooltip !== false) UI.tooltip(s, o.tooltip || (() => '<div class="tip-title">' + esc(UI.resourceName(kind)) + '</div>'));
    return s;
  };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  UI.esc = esc;

  // ------------------------------------------------------------------ tooltip
  const tipPos = { x: 0, y: 0 };
  let tipEl = null, tipTarget = null, tipTimer = 0, tipShown = false, tipAnchor = null;
  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = el('div', { class: 'aow-tooltip', role: 'tooltip' });
    (UI.layers.tooltip || document.body).appendChild(tipEl);
    return tipEl;
  }
  function renderTip(content, target) {
    const e = ensureTip();
    let c = content;
    if (typeof c === 'function') c = safe(() => c(target), '');
    if (c === null || c === undefined || c === '' || c === false) return false;
    e.innerHTML = '';
    if (c instanceof Node) e.appendChild(c); else e.innerHTML = String(c);
    // exact parchment frame for this size (rounded up to 16px so the frame cache stays small)
    e.classList.remove('aow-tooltip--framed');
    e.style.width = ''; e.style.height = ''; e.style.backgroundImage = '';
    const I = AOW.Icons;
    if (I && typeof I.frameDataURL === 'function') {
      const w = Math.ceil(e.offsetWidth / 16) * 16, h = Math.ceil(e.offsetHeight / 16) * 16;
      const url = safe(() => I.frameDataURL(w, h, 'tooltip'), '');
      if (url) { e.style.width = w + 'px'; e.style.height = h + 'px'; e.style.backgroundImage = 'url("' + url + '")'; e.classList.add('aow-tooltip--framed'); }
    }
    return true;
  }
  function positionTip(x, y) {
    const e = ensureTip();
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = e.offsetWidth, h = e.offsetHeight;
    let px = x + 16, py = y + 20;
    if (px + w > vw - 8) px = x - w - 12;
    if (py + h > vh - 8) py = y - h - 12;
    if (px < 8) px = 8;
    if (py < 8) py = 8;
    e.style.left = Math.round(px) + 'px';
    e.style.top = Math.round(py) + 'px';
  }
  function showTipFor(target) {
    if (!target || !target._aowTip) return;
    if (!renderTip(target._aowTip, target)) return;
    tipTarget = target; tipShown = true; tipAnchor = null;
    positionTip(tipPos.x, tipPos.y);
    tipEl.classList.add('aow-tooltip--show');
  }
  UI.hideTooltip = function () {
    clearTimeout(tipTimer); tipTimer = 0;
    tipTarget = null; tipAnchor = null;
    if (tipEl && tipShown) { tipEl.classList.remove('aow-tooltip--show'); tipShown = false; }
  };
  /** show the shared tooltip at a screen position (HUD hex tooltips). */
  UI.tooltipAt = function (x, y, content) {
    clearTimeout(tipTimer); tipTimer = 0;
    if (!renderTip(content, null)) { UI.hideTooltip(); return; }
    tipTarget = null; tipShown = true; tipAnchor = { x, y };
    positionTip(x, y);
    tipEl.classList.add('aow-tooltip--show');
  };
  UI.tooltip = function (target, content) {
    if (!target) return target;
    target._aowTip = content;
    if (target._aowTipBound) return target;
    target._aowTipBound = true;
    target.addEventListener('mouseenter', e => {
      tipPos.x = e.clientX; tipPos.y = e.clientY;
      clearTimeout(tipTimer);
      const delay = tipShown ? 60 : 350;
      tipTimer = setTimeout(() => { tipTimer = 0; showTipFor(target); }, delay);
    });
    target.addEventListener('mousemove', e => { if (tipTarget === target && tipShown) positionTip(e.clientX, e.clientY); });
    const off = () => { if (tipTarget === target || !tipShown) { clearTimeout(tipTimer); tipTimer = 0; if (tipTarget === target) UI.hideTooltip(); } };
    target.addEventListener('mouseleave', off);
    target.addEventListener('mousedown', off);
    return target;
  };

  // ------------------------------------------------------------------ modal / confirm
  UI.modal = function (o) {
    o = o || {};
    const closable = o.closable !== false;
    const backdrop = el('div', { class: 'aow-modal-backdrop' + (o.cls ? ' ' + o.cls + '-backdrop' : '') });
    const api = { el: null, body: null, backdrop, closable, closed: false, close() {
      if (api.closed) return; api.closed = true;
      const i = modals.indexOf(api); if (i >= 0) modals.splice(i, 1);
      backdrop.remove(); UI.hideTooltip(); sfx('ui_close');
      if (o.onClose) safe(() => o.onClose(api));
    } };
    const panel = UI.panel({ title: o.title, subtitle: o.subtitle, icon: o.icon, cls: 'aow-modal' + (o.cls ? ' ' + o.cls : ''), body: o.body, closable, onClose: () => api.close(), width: o.width, parchment: o.parchment, compact: o.compact });
    api.el = panel; api.body = panel.body;
    const bar = el('div', { class: 'aow-modal__buttons' });
    api.setButtons = function (buttons) {
      bar.innerHTML = '';
      for (const b of buttons || []) {
        bar.appendChild(UI.button(b.label, ev => { let r; if (b.onClick) r = b.onClick(ev, api); if (r !== false && b.close !== false) api.close(); }, { kind: b.kind, icon: b.icon, disabled: b.disabled, tooltip: b.tooltip, small: b.small }));
      }
      bar.hidden = !(buttons && buttons.length);
    };
    api.setButtons(o.buttons);
    panel.appendChild(bar);
    backdrop.appendChild(panel);
    backdrop.addEventListener('mousedown', e => { if (e.target === backdrop && closable && o.backdropClose !== false) api.close(); });
    (UI.layers.screen || document.body).appendChild(backdrop);
    modals.push(api);
    sfx('ui_open');
    return api;
  };
  UI.confirm = function (text, onYes, o) {
    o = o || {};
    return UI.modal({
      title: o.title || t('ui.confirmTitle'), icon: o.icon || 'warning', width: o.width || 420,
      body: el('div', { class: 'aow-modal__text' }, typeof text === 'string' ? text : L(text)),
      buttons: [
        { label: o.noLabel || t('ui.cancel'), kind: 'ghost', onClick: () => { if (o.onNo) o.onNo(); } },
        { label: o.yesLabel || t('ui.ok'), kind: o.danger ? 'danger' : 'gold', onClick: () => { if (onYes) onYes(); } },
      ],
    });
  };
  UI.closeModals = function () { while (modals.length) modals[modals.length - 1].close(); };

  // ------------------------------------------------------------------ toasts
  UI.TOAST_MAX = 3;           // centre toasts visible at once (older ones are dismissed)
  UI.TOAST_TIMEOUT = 5000;    // every toast auto-dismisses after at most 5 s (o.sticky keeps one up)
  UI.toast = function (kind, text, o) {
    if (kind && typeof kind === 'object') { o = kind; kind = o.kind; text = o.text; }
    o = o || {};
    kind = KIND_ICON[kind] ? kind : 'info';
    const layer = UI.layers.toast || document.body;
    let removed = false;
    const item = el('div', { class: 'aow-toast aow-toast--' + kind + (o.onClick ? ' aow-toast--clickable' : ''), role: 'status' },
      UI.icon(o.icon || KIND_ICON[kind], 22),
      el('div', { class: 'aow-toast__text' }, o.title ? el('div', { class: 'aow-gold aow-bold' }, o.title) : null, o.html ? el('div', { html: text }) : el('div', null, text)),
      el('button', { class: 'aow-toast__close', type: 'button', onclick: e => { e.stopPropagation(); remove(); } }, '×'));
    const remove = () => { if (removed) return; removed = true; item.classList.add('aow-toast--out'); setTimeout(() => item.remove(), 240); };
    if (o.onClick) item.addEventListener('click', () => { safe(() => o.onClick()); remove(); });
    // the same message already on screen (e.g. several "battle won" in one AI phase): refresh it instead of stacking
    const live = () => Array.from(layer.children).filter(c => c.classList && c.classList.contains('aow-toast') && !c.classList.contains('aow-toast--out'));
    for (const c of live()) if (c._aowText === kind + '|' + text && typeof c.close === 'function') c.close();
    item._aowText = kind + '|' + text;
    layer.appendChild(item);
    // at most UI.TOAST_MAX toasts on screen: the oldest make room (the HUD notification list keeps the history)
    const shown = live();
    for (let i = 0; i < shown.length - UI.TOAST_MAX; i++) shown[i].close ? shown[i].close() : shown[i].remove();
    const timeout = o.sticky ? 0 : Math.min(UI.TOAST_TIMEOUT, o.timeout > 0 ? o.timeout : UI.TOAST_TIMEOUT);
    if (timeout > 0) setTimeout(remove, timeout);
    if (o.sound !== false) { if (kind === 'warn' || kind === 'bad') sfx('alert', { volume: 0.6 }); else if (kind === 'good') sfx('notification', { volume: 0.5 }); }
    item.close = remove;
    return item;
  };
  UI.clearToasts = function () { if (UI.layers.toast) UI.layers.toast.innerHTML = ''; };

  // ------------------------------------------------------------------ screens
  UI.registerScreen = function (name, def) { screens.set(name, def); return def; };
  UI.hasScreen = name => screens.has(name);
  function popScreen() {
    const s = stack.pop();
    if (!s) return null;
    safe(() => s.def.close && s.def.close(s.el));
    s.el.remove();
    return s;
  }
  function mountScreen(s) {
    let content;
    try { content = s.def.open(s.params || {}); }
    catch (e) { console.error('[UI] screen ' + s.name + ' failed to open', e); content = UI.panel({ title: t('ui.screenError'), body: el('div', { class: 'aow-bad' }, s.name + ': ' + e.message), closable: true, onClose: () => UI.closeScreen(s.name) }); }
    s.inner.innerHTML = '';
    append(s.inner, content);
  }
  UI.showScreen = function (name, params) {
    if (name === 'menu' && !screens.has('menu')) registerFallbackMenu();
    const def = screens.get(name);
    if (!def) { AOW.warn('UI.showScreen: unknown screen ' + name); return null; }
    UI.hideTooltip();
    if (name === 'hud') {
      UI.closeAll();
      if (hudEl) { safe(() => hudDef && hudDef.close && hudDef.close(hudEl)); hudEl.remove(); }
      hudDef = def; hudParams = params || {};
      hudEl = safe(() => def.open(hudParams), null) || el('div', { class: 'aow-empty' }, 'HUD');
      UI.layers.hud.innerHTML = '';
      UI.layers.hud.appendChild(hudEl);
      AOW.Events.emit('ui:screen', { name: 'hud' });
      return hudEl;
    }
    const i = stack.findIndex(s => s.name === name);
    if (i >= 0) {
      while (stack.length - 1 > i) popScreen();
      const s = stack[i]; s.params = params || s.params;
      if (def.refresh) safe(() => def.refresh(s.params)); else mountScreen(s);
      AOW.Events.emit('ui:screen', { name });
      return s.el;
    }
    const full = def.full || name === 'menu' || name === 'battle' || name === 'newgame' || name === 'faction';
    const wrap = el('div', { class: 'aow-screen aow-screen--' + name + (full ? ' aow-screen--full' : '') + (def.dim === false ? ' aow-screen--nodim' : ''), dataset: { screen: name } });
    const inner = el('div', { class: 'aow-screen__inner' });
    wrap.appendChild(inner);
    const s = { name, el: wrap, inner, def, params: params || {} };
    mountScreen(s);
    UI.layers.screen.appendChild(wrap);
    // keep modals above screens
    for (const m of modals) UI.layers.screen.appendChild(m.backdrop);
    stack.push(s);
    sfx(name === 'battle' ? 'battle_start' : 'ui_open');
    AOW.Events.emit('ui:screen', { name });
    return wrap;
  };
  UI.closeScreen = function (name) {
    UI.hideTooltip();
    if (name === 'hud') {
      if (hudEl) { safe(() => hudDef && hudDef.close && hudDef.close(hudEl)); hudEl.remove(); }
      hudEl = null; hudDef = null;
      return;
    }
    if (name) {
      const i = stack.findIndex(s => s.name === name);
      if (i < 0) return;
      while (stack.length > i) popScreen();
    } else if (!popScreen()) return;
    sfx('ui_close');
    AOW.Events.emit('ui:screen', { name: UI.currentScreen() });
  };
  UI.closeAll = function () { UI.closeModals(); while (stack.length) popScreen(); UI.hideTooltip(); };
  UI.currentScreen = function () { return stack.length ? stack[stack.length - 1].name : (hudEl ? 'hud' : null); };
  UI.isOpen = function (name) { return name === 'hud' ? !!hudEl : stack.some(s => s.name === name); };
  UI.openScreens = () => stack.map(s => s.name);
  UI.refresh = function () {
    if (hudDef && hudDef.refresh) safe(() => hudDef.refresh(hudParams));
    for (const s of stack.slice()) if (s.def.refresh) safe(() => s.def.refresh(s.params));
  };
  UI.tick = function (dt) {
    if (hudDef && hudDef.tick) safe(() => hudDef.tick(dt));
    const top = stack[stack.length - 1];
    if (top && top.def.tick) safe(() => top.def.tick(dt));
    if (tipShown && tipTarget && !document.body.contains(tipTarget)) UI.hideTooltip();
  };
  function relangAll() {
    if (hudEl && hudDef) {
      if (hudDef.relang) safe(() => hudDef.relang()); else UI.showScreen('hud', hudParams);
    }
    for (const s of stack) {
      if (s.def.relang) safe(() => s.def.relang(s.params));
      else if (s.name === 'battle' && s.def.refresh) safe(() => s.def.refresh(s.params));
      else { safe(() => s.def.close && s.def.close(s.el)); mountScreen(s); }
    }
  }
  UI.lang = () => AOW.I18n.lang;
  UI.setLang = function (lang) { if (lang !== AOW.I18n.lang) AOW.I18n.setLang(lang); };

  // ------------------------------------------------------------------ selection
  UI.selected = { armyId: null, cityId: null, unitId: null };
  UI.select = function (sel) {
    sel = sel || {};
    const armyId = sel.armyId === undefined ? null : sel.armyId;
    const cityId = sel.cityId === undefined ? null : sel.cityId;
    const unitId = sel.unitId === undefined ? null : sel.unitId;
    const changed = armyId !== UI.selected.armyId || cityId !== UI.selected.cityId || unitId !== UI.selected.unitId;
    UI.selected = { armyId, cityId, unitId };
    if (hasFn('WorldRender', 'setSelection')) safe(() => AOW.WorldRender.setSelection({ armyId, cityId }));
    if (changed || sel.force) {
      if (armyId !== null) AOW.Events.emit('select:army', { armyId, unitId });
      else if (cityId !== null) AOW.Events.emit('select:city', { cityId });
      else AOW.Events.emit('select:none', {});
    }
    return UI.selected;
  };

  // ------------------------------------------------------------------ portraits & unit cards
  function placeholderPortrait(type, player, size) {
    const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    const P = AOW.Palette || {};
    const aff = UI.mainAffinity(type.source && type.source.type === 'tome' && Data().has('tomes', type.source.id) ? Data().get('tomes', type.source.id).affinity : null);
    const base = (aff && P.affinityDark && P.affinityDark[aff]) || (player ? player.color : '#3a4460');
    const g = c.createRadialGradient(size * 0.5, size * 0.4, size * 0.05, size * 0.5, size * 0.55, size * 0.75);
    g.addColorStop(0, AOW.Color ? AOW.Color.mix(base, '#ffffff', 0.25) : base); g.addColorStop(0.7, base); g.addColorStop(1, '#0d1118');
    c.fillStyle = g; c.fillRect(0, 0, size, size);
    if (AOW.Icons && typeof AOW.Icons.draw === 'function') {
      const role = type.role === 'hero' ? 'role_hero' : 'role_' + (type.role || 'fighter');
      if (!safe(() => AOW.Icons.draw(c, role, size * 0.5, size * 0.52, size * 0.62), false)) safe(() => AOW.Icons.draw(c, 'sword', size * 0.5, size * 0.52, size * 0.6));
    }
    const v = c.createRadialGradient(size * 0.5, size * 0.5, size * 0.3, size * 0.5, size * 0.5, size * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = v; c.fillRect(0, 0, size, size);
    return cv;
  }
  UI.portraitURL = function (type, unit, size) {
    size = size || 78;
    const g = game();
    const player = g && unit && unit.owner >= 0 ? g.players[unit.owner] : null;
    const key = (type && type.id) + '|' + (unit && unit.formId || '') + '|' + (player ? player.color : '') + '|' + size;
    let url = portraitCache.get(key);
    if (url) return url;
    let cv = null;
    if (hasFn('UnitArt', 'portrait')) {
      cv = safe(() => {
        const form = unit && unit.formId && Data().has('forms', unit.formId) ? Data().get('forms', unit.formId) : (player && Data().has('forms', player.formId) ? Data().get('forms', player.formId) : null);
        const look = hasFn('UnitArt', 'resolveLook') ? AOW.UnitArt.resolveLook(type, form ? form.look : null, player) : type.look;
        return AOW.UnitArt.portrait(type, look, player ? player.color : '#888888', size);
      }, null);
      if (cv && !(cv instanceof HTMLCanvasElement) && !(cv instanceof HTMLImageElement)) cv = null;
    }
    if (!cv) cv = placeholderPortrait(type || {}, player, size);
    url = safe(() => (cv.toDataURL ? cv.toDataURL('image/png') : cv.src), '');
    if (portraitCache.size > 600) portraitCache.clear();
    portraitCache.set(key, url);
    return url;
  };
  function rankEl(rank, small) {
    rank = rank | 0;
    if (rank <= 0) return null;
    const name = UI.iconName('rank_' + rank);
    if (name) return el('span', { class: 'unit-card__rank' }, UI.icon(name, small ? 11 : 14));
    const chevs = []; for (let i = 0; i < rank; i++) chevs.push(el('i', { class: 'unit-card__chev' }));
    return el('span', { class: 'unit-card__rank' }, chevs);
  }
  function attackLine(a) {
    const nm = a.name ? L(a.name) : a.id;
    const ch = a.channel && a.channel !== 'physical' ? ' <span class="tip-dim">' + esc(AOW.I18n.has('ui.ch_' + a.channel) ? t('ui.ch_' + a.channel) : a.channel) + '</span>' : '';
    return '<div class="tip-row">' + (UI.iconName(a.channel === 'physical' ? (a.type === 'ranged' ? 'shoot' : 'strike') : a.channel) ? UI.icon(UI.iconName(a.channel === 'physical' ? (a.type === 'ranged' ? 'shoot' : 'strike') : a.channel), 14).outerHTML : '') +
      '<b>' + esc(nm) + '</b> ' + esc(UI.fmt(a.damage)) + (a.repeat > 1 ? '×' + a.repeat : '') + ch + (a.range > 1 ? ' <span class="tip-dim">(' + esc(t('ui.range')) + ' ' + a.range + ')</span>' : '') + '</div>';
  }
  UI.unitTooltip = function (unit, type, stats, hero) {
    type = type || State().unitType(unit);
    const g = game();
    if (stats === undefined) stats = g && hasFn('Rules', 'unitStats') ? safe(() => AOW.Rules.unitStats(g, unit), null) : null;
    if (hero === undefined) hero = g && unit.heroId !== null && unit.heroId !== undefined ? State().hero(g, unit.heroId) : null;
    const s = stats || {};
    const maxHp = s.maxHp || unit.maxHp || type.hp || 0;
    const name = unit.name || L(type.name);
    const roleIcon = UI.iconName('role_' + type.role);
    let h = '<div class="tip-title">' + (roleIcon ? UI.icon(roleIcon, 16).outerHTML : '') + esc(name) + '</div>';
    h += '<div class="tip-sub">' + (hero ? esc(t('ui.hero') + ' · ' + (Data().has('heroClasses', hero.classId) ? L(Data().get('heroClasses', hero.classId).name) : hero.classId) + ' · ' + t('ui.lv') + ' ' + hero.level + ' · ') : '') + esc(t('ui.tierN', { n: UI.roman(type.tier) }) + ' · ' + UI.roleName(type.role)) + (unit.name && unit.name !== L(type.name) ? ' · ' + esc(L(type.name)) : '') + '</div>';
    h += '<div class="tip-kv">';
    h += '<span>' + esc(t('ui.hp')) + '</span><span>' + UI.fmt(unit.hp) + ' / ' + UI.fmt(maxHp) + '</span>';
    h += '<span>' + esc(t('ui.def')) + '</span><span>' + UI.fmt(s.def !== undefined ? s.def : type.def) + '</span>';
    h += '<span>' + esc(t('ui.res')) + '</span><span>' + UI.fmt(s.res !== undefined ? s.res : type.res) + '</span>';
    h += '<span>' + esc(t('ui.mp')) + '</span><span>' + UI.fmt(s.mp !== undefined ? s.mp : type.mp) + '</span>';
    h += '<span>' + esc(t('ui.rank')) + '</span><span>' + (unit.rank | 0) + ' <span class="tip-dim">(' + esc(t('ui.xp')) + ' ' + UI.fmt(unit.xp | 0) + ')</span></span>';
    h += '</div>';
    const attacks = (s.attacks && s.attacks.length ? s.attacks : type.attacks) || [];
    if (attacks.length) { h += '<div class="tip-sep"></div>'; for (const a of attacks) h += attackLine(a); }
    const abil = [].concat(type.abilities || [], type.passives || [], s.abilities || []).filter((x, i, arr) => arr.indexOf(x) === i && x !== 'defend');
    if (abil.length) {
      h += '<div class="tip-sep"></div><div class="tip-row">';
      for (const id of abil.slice(0, 10)) { const a = typeof id === 'string' && Data().has('abilities', id) ? Data().get('abilities', id) : (typeof id === 'object' ? id : null); h += '<span class="aow-chip" style="border-color:rgba(43,33,22,.35);background:rgba(43,33,22,.08);color:#2b2116">' + esc(a ? L(a.name) : id) + '</span>'; }
      h += '</div>';
    }
    const statuses = (unit.statuses || []).concat(unit.enchantments ? unit.enchantments.map(e => ({ id: e, ench: true })) : []);
    if (statuses.length) {
      h += '<div class="tip-sep"></div>';
      for (const st of statuses) {
        const def = st.ench ? (Data().has('spells', st.id) ? Data().get('spells', st.id) : null) : (Data().has('statuses', st.id) ? Data().get('statuses', st.id) : null);
        h += '<div class="tip-row">' + (st.ench ? UI.icon('spellbook', 14).outerHTML : UI.statusIcon(st.id, 14).outerHTML) + esc(def ? L(def.name) : st.id) + (st.turns ? ' <span class="tip-dim">' + esc(t('ui.turnsN', { n: st.turns })) + '</span>' : '') + '</div>';
      }
    }
    return h;
  };
  UI.unitCard = function (u, o) {
    o = o || {};
    const g = game();
    const unit = (u && typeof u === 'object') ? u : (g ? State().unit(g, u) : null);
    if (!unit) return el('div', { class: 'unit-card unit-card--missing' + (o.small ? ' unit-card--small' : '') }, el('div', { class: 'unit-card__portrait' }, el('div', { class: 'unit-card__frame' }), el('div', { class: 'unit-card__img' })), el('div', { class: 'unit-card__name aow-dim' }, '?'));
    const type = State().unitType(unit);
    const stats = g && hasFn('Rules', 'unitStats') ? safe(() => AOW.Rules.unitStats(g, unit), null) : null;
    const maxHp = (stats && stats.maxHp) || unit.maxHp || type.hp || 1;
    const hero = g && unit.heroId !== null && unit.heroId !== undefined ? State().hero(g, unit.heroId) : null;
    const tier = Math.max(1, Math.min(5, type.tier | 0 || 1));
    const name = unit.name || L(type.name);
    const cls = ['unit-card', 'unit-card--tier' + tier];
    if (o.small) cls.push('unit-card--small');
    if (o.selected) cls.push('unit-card--selected');
    if (hero) cls.push('unit-card--hero');
    if (o.onClick) cls.push('unit-card--clickable');
    if (unit.hp <= 0 || (hero && hero.dead)) cls.push('unit-card--dead');
    if (o.cls) cls.push(o.cls);
    const size = o.small ? 48 : 78;
    const card = el('div', { class: cls.join(' '), dataset: { unitId: unit.id }, onclick: o.onClick ? e => o.onClick(unit, e, card) : null });
    const img = el('img', { src: UI.portraitURL(type, unit, size), alt: '', draggable: 'false' });
    card.appendChild(el('div', { class: 'unit-card__portrait' },
      el('div', { class: 'unit-card__frame' }),
      el('div', { class: 'unit-card__img' }, img),
      hero ? UI.icon(UI.iconName('hero_star', 'star') || 'star', o.small ? 14 : 18) : null,
      el('span', { class: 'unit-card__tier' }, UI.roman(tier)),
      rankEl(unit.rank, o.small)));
    if (hero) { const hs = card.querySelector('.icon'); if (hs) hs.classList.add('unit-card__hero'); }
    if (o.showName !== false) card.appendChild(el('div', { class: 'unit-card__name', title: name }, name));
    const ratio = maxHp > 0 ? unit.hp / maxHp : 0;
    card.appendChild(UI.progressBar(unit.hp, maxHp, { cls: 'unit-card__hp', color: UI.hpColor(ratio), label: o.small ? false : UI.fmt(unit.hp) + '/' + UI.fmt(maxHp) }));
    const statuses = unit.statuses || [];
    if (statuses.length) card.appendChild(el('div', { class: 'unit-card__status' }, statuses.slice(0, 6).map(st => UI.statusIcon(st.id, o.small ? 11 : 14))));
    if (o.showStats) {
      const s = stats || {};
      card.appendChild(el('div', { class: 'unit-card__stats' },
        el('span', null, UI.icon('def', 12), el('b', null, UI.fmt(s.def !== undefined ? s.def : type.def))),
        el('span', null, UI.icon('res', 12), el('b', null, UI.fmt(s.res !== undefined ? s.res : type.res))),
        el('span', null, UI.icon('move', 12), el('b', null, UI.fmt(s.mp !== undefined ? s.mp : type.mp)))));
    }
    if (o.tooltip !== false) UI.tooltip(card, () => UI.unitTooltip(unit, type, undefined, hero));
    card.unit = unit;
    return card;
  };
  UI.heroPortrait = function (heroId, size) {
    size = size || 64;
    const g = game();
    const hero = g ? (typeof heroId === 'object' ? heroId : State().hero(g, heroId)) : null;
    const unit = hero && g ? State().unit(g, hero.unitId) : null;
    const type = unit ? State().unitType(unit) : (Data().has('units', 'hero') ? Data().get('units', 'hero') : State().FALLBACK_UNIT);
    const wrap = el('div', { class: 'hero-portrait' + (AOW.Icons && AOW.Icons.frameDataURL ? ' hero-portrait--framed' : ''), style: { width: size, height: size } },
      el('img', { src: UI.portraitURL(type, unit || { owner: hero ? hero.owner : -1, formId: null }, Math.round(size * 0.82)), alt: '', draggable: 'false' }),
      hero ? el('span', { class: 'aow-badge aow-badge--gold hero-portrait__level' }, hero.level) : null);
    if (hero) UI.tooltip(wrap, () => {
      const cls = Data().has('heroClasses', hero.classId) ? L(Data().get('heroClasses', hero.classId).name) : hero.classId;
      let h = '<div class="tip-title">' + esc(hero.name) + '</div><div class="tip-sub">' + esc((hero.isRuler ? t('ui.ruler') + ' · ' : '') + cls + ' · ' + t('ui.lv') + ' ' + hero.level) + '</div>';
      if (hero.dead) h += '<div class="tip-bad">' + esc(t('ui.dead')) + '</div>';
      else if (unit) h += '<div class="tip-kv"><span>' + esc(t('ui.hp')) + '</span><span>' + UI.fmt(unit.hp) + ' / ' + UI.fmt(unit.maxHp) + '</span><span>' + esc(t('ui.xp')) + '</span><span>' + UI.fmt(hero.xp) + '</span></div>';
      return h;
    });
    return wrap;
  };
  UI.tomeIcon = function (tomeId, size) {
    size = size || 48;
    const tome = Data().has('tomes', tomeId) ? Data().get('tomes', tomeId) : null;
    const aff = tome ? UI.mainAffinity(tome.affinity) : null;
    const name = UI.iconName(tome && tome.icon, tome ? 'tome_' + aff + '_' + tome.tier : '', 'tome_astral_1', 'book');
    const wrap = el('span', { class: 'tome-icon', dataset: { tome: tomeId } }, UI.icon(name || 'book', size));
    if (tome) UI.tooltip(wrap, () => {
      let h = '<div class="tip-title">' + esc(L(tome.name)) + '</div><div class="tip-sub">' + esc(t('ui.tomeTierN', { n: tome.tier })) + ' · ' + Object.keys(tome.affinity || {}).map(a => esc(UI.affinityName(a)) + ' ' + tome.affinity[a]).join(', ') + '</div>';
      if (tome.desc) h += '<div class="tip-desc">' + esc(L(tome.desc)) + '</div>';
      if (tome.passive && tome.passive.desc) h += '<div class="tip-sep"></div><div><b>' + esc(t('ui.passive')) + ':</b> ' + esc(L(tome.passive.desc)) + '</div>';
      if (tome.contents && tome.contents.length) h += '<div class="tip-sep"></div><div class="tip-dim">' + esc(t('ui.contents')) + ': ' + tome.contents.map(c => { const kind = { spell: 'spells', unit: 'units', improvement: 'improvements', skill: 'heroSkills', empire: 'empireSkills', building: 'buildings', transformation: 'transformations' }[c.type]; const d = kind && Data().has(kind, c.id) ? Data().get(kind, c.id) : null; return esc(d ? L(d.name) : c.id); }).join(', ') + '</div>';
      return h;
    });
    return wrap;
  };
  function spellTooltip(spell) {
    let h = '<div class="tip-title">' + esc(L(spell.name)) + '</div>';
    h += '<div class="tip-sub">' + esc((AOW.I18n.has('ui.kind_' + spell.kind) ? t('ui.kind_' + spell.kind) : spell.kind) + (spell.target ? ' · ' + t('ui.target') + ': ' + spell.target : '') + (spell.tier ? ' · ' + t('ui.tierN', { n: spell.tier }) : '')) + '</div>';
    if (spell.desc) h += '<div class="tip-desc">' + esc(L(spell.desc)) + '</div>';
    const cost = spell.cost || {};
    h += '<div class="tip-sep"></div><div class="tip-row"><span class="tip-dim">' + esc(t('ui.cost')) + ':</span>' + (cost.mana ? UI.icon('mana', 14).outerHTML + ' ' + UI.fmt(cost.mana) : '') + (cost.cp ? ' ' + UI.icon('casting', 14).outerHTML + ' ' + UI.fmt(cost.cp) : '') + (spell.upkeep && spell.upkeep.mana ? ' <span class="tip-dim">' + esc(t('ui.upkeep')) + ' ' + UI.fmt(spell.upkeep.mana) + '/' + esc(t('ui.turnsN', { n: 1 })) + '</span>' : '') + '</div>';
    return h;
  }
  UI.spellRow = function (spellId, o) {
    o = o || {};
    const spell = Data().has('spells', spellId) ? Data().get('spells', spellId) : null;
    if (!spell) return el('div', { class: 'aow-item-row aow-item-row--disabled' }, el('div', { class: 'aow-item-row__main' }, el('div', { class: 'aow-item-row__title' }, spellId)));
    const aff = UI.mainAffinity(spell.affinity);
    const iconName = UI.iconName(spell.icon, aff, 'spellbook');
    const cost = spell.cost || {};
    const p = human();
    let disabled = o.disabled, reason = o.reason;
    if (disabled === undefined && p && cost.mana && p.resources.mana < cost.mana) { disabled = true; reason = t('ui.notEnoughMana'); }
    const row = el('div', { class: 'aow-item-row spell-row' + (disabled ? ' aow-item-row--disabled' : '') + (o.selected ? ' aow-item-row--selected' : '') + (o.cls ? ' ' + o.cls : ''), dataset: { spell: spellId }, onclick: o.onClick ? e => o.onClick(spell, e) : null },
      el('div', { class: 'aow-item-row__icon' }, UI.icon(iconName || 'spellbook', 32)),
      el('div', { class: 'aow-item-row__main' },
        el('div', { class: 'aow-item-row__title' }, L(spell.name), el('span', { class: 'aow-tag aow-affinity-' + aff }, AOW.I18n.has('ui.kind_' + spell.kind) ? t('ui.kind_' + spell.kind) : spell.kind)),
        o.compact ? null : el('div', { class: 'aow-item-row__desc' }, L(spell.desc))),
      el('div', { class: 'aow-item-row__cost' }, cost.mana ? UI.resource('mana', cost.mana, { size: 14 }) : null, cost.cp ? UI.resource('casting', cost.cp, { size: 14 }) : null),
      o.onCast ? el('div', { class: 'aow-item-row__action' }, UI.button(o.castLabel || t('ui.cast'), e => { e.stopPropagation(); o.onCast(spell, e); }, { kind: 'gold', small: true, disabled: !!disabled, tooltip: disabled && reason ? reason : null })) : null);
    UI.tooltip(row, () => spellTooltip(spell) + (disabled && reason ? '<div class="tip-bad">' + esc(reason) + '</div>' : ''));
    return row;
  };
  function effectsSummary(effects) {
    const parts = [];
    for (const k of Object.keys(effects || {})) {
      const v = effects[k]; if (typeof v !== 'number' || !v) continue;
      const base = k.replace(/Pct$/, '');
      const nm = AOW.I18n.has('ui.res_' + base) ? UI.resourceName(base) : (AOW.I18n.has('ui.' + base) ? t('ui.' + base) : k);
      parts.push(UI.fmtSigned(v) + (k.endsWith('Pct') ? '%' : '') + ' ' + nm);
    }
    return parts;
  }
  UI.buildingRow = function (buildingId, o) {
    o = o || {};
    const b = Data().has('buildings', buildingId) ? Data().get('buildings', buildingId) : null;
    if (!b) return el('div', { class: 'aow-item-row aow-item-row--disabled' }, el('div', { class: 'aow-item-row__main' }, el('div', { class: 'aow-item-row__title' }, buildingId)));
    const iconName = UI.iconName(b.icon, CAT_ICON[b.category], 'build');
    const eff = effectsSummary(b.effects);
    const disabled = !!o.disabled;
    const row = el('div', { class: 'aow-item-row building-row' + (disabled ? ' aow-item-row--disabled' : '') + (o.selected ? ' aow-item-row--selected' : '') + (o.cls ? ' ' + o.cls : ''), dataset: { building: buildingId }, onclick: o.onClick ? e => o.onClick(b, e) : null },
      el('div', { class: 'aow-item-row__icon' }, UI.icon(iconName || 'build', 32)),
      el('div', { class: 'aow-item-row__main' },
        el('div', { class: 'aow-item-row__title' }, L(b.name), el('span', { class: 'aow-tag' }, 'T' + b.tier), b.category && AOW.I18n.has('ui.cat_' + b.category) ? el('span', { class: 'aow-tag' }, t('ui.cat_' + b.category)) : null),
        el('div', { class: 'aow-item-row__desc' }, eff.length ? eff.join(' · ') : L(b.desc))),
      el('div', { class: 'aow-item-row__cost' }, UI.resource('production', (b.cost && b.cost.production) || 0, { size: 14 }), b.upkeep && b.upkeep.gold ? UI.resource('gold', -b.upkeep.gold, { size: 14, signed: true, tooltip: () => '<div class="tip-title">' + esc(t('ui.upkeep')) + '</div>' }) : null),
      o.onBuild ? el('div', { class: 'aow-item-row__action' }, UI.button(o.buildLabel || t('ui.build'), e => { e.stopPropagation(); o.onBuild(b, e); }, { kind: 'gold', small: true, disabled, tooltip: disabled && o.reason ? o.reason : null })) : null);
    UI.tooltip(row, () => {
      let h = '<div class="tip-title">' + esc(L(b.name)) + '</div><div class="tip-sub">' + esc(t('ui.tierN', { n: b.tier })) + (b.prereq && b.prereq.length ? ' · ' + b.prereq.map(id => esc(Data().has('buildings', id) ? L(Data().get('buildings', id).name) : id)).join(', ') : '') + '</div>';
      h += '<div class="tip-desc">' + esc(L(b.desc)) + '</div>';
      if (eff.length) h += '<div class="tip-sep"></div><div>' + eff.map(esc).join('<br>') + '</div>';
      if (disabled && o.reason) h += '<div class="tip-bad">' + esc(o.reason) + '</div>';
      return h;
    });
    return row;
  };
  UI.unitTypeRow = function (unitTypeId, o) {
    o = o || {};
    const type = Data().has('units', unitTypeId) ? Data().get('units', unitTypeId) : null;
    if (!type) return el('div', { class: 'aow-item-row aow-item-row--disabled' }, el('div', { class: 'aow-item-row__main' }, el('div', { class: 'aow-item-row__title' }, unitTypeId)));
    const g = game(), p = human();
    let disabled = o.disabled, reason = o.reason;
    if (disabled === undefined && o.city && g && hasFn('Rules', 'canRecruit')) { const r = safe(() => AOW.Rules.canRecruit(g, o.city, unitTypeId), null); if (r && r.ok === false) { disabled = true; reason = r.reason ? (typeof r.reason === 'object' ? L(r.reason) : (AOW.I18n.has(r.reason) ? t(r.reason) : r.reason)) : t('ui.notAvailable'); } }
    if (disabled === undefined && p && type.cost && type.cost.gold > p.resources.gold) { disabled = true; reason = t('ui.notEnoughGold'); }
    const fakeUnit = { id: -1, typeId: type.id, owner: p ? p.id : -1, formId: p ? p.formId : null, hp: type.hp, maxHp: type.hp, rank: 0, statuses: [], enchantments: [], heroId: null };
    const cost = type.cost || {}, up = type.upkeep || {};
    const row = el('div', { class: 'aow-item-row unittype-row' + (disabled ? ' aow-item-row--disabled' : '') + (o.selected ? ' aow-item-row--selected' : '') + (o.cls ? ' ' + o.cls : ''), dataset: { unitType: unitTypeId }, onclick: o.onClick ? e => o.onClick(type, e) : null },
      el('div', { class: 'aow-item-row__icon' }, el('div', { class: 'unit-card unit-card--small unit-card--tier' + (type.tier || 1) }, el('div', { class: 'unit-card__portrait' }, el('div', { class: 'unit-card__frame' }), el('div', { class: 'unit-card__img' }, el('img', { src: UI.portraitURL(type, fakeUnit, 48), alt: '', draggable: 'false' })), el('span', { class: 'unit-card__tier' }, UI.roman(type.tier || 1))))),
      el('div', { class: 'aow-item-row__main' },
        el('div', { class: 'aow-item-row__title' }, L(type.name), UI.iconName('role_' + type.role) ? UI.icon('role_' + type.role, 16) : null, el('span', { class: 'aow-dim aow-small' }, UI.roleName(type.role))),
        el('div', { class: 'aow-item-row__desc aow-row aow-gap-s' },
          el('span', null, UI.icon('hp', 12), ' ', type.hp), el('span', null, UI.icon('def', 12), ' ', type.def), el('span', null, UI.icon('res', 12), ' ', type.res), el('span', null, UI.icon('move', 12), ' ', type.mp),
          up.gold ? el('span', { class: 'aow-faint' }, t('ui.upkeep') + ' ' + up.gold + (up.mana ? '/' + up.mana : '')) : null)),
      el('div', { class: 'aow-item-row__cost' }, cost.gold ? UI.resource('gold', cost.gold, { size: 14 }) : null, cost.draft ? UI.resource('draft', cost.draft, { size: 14 }) : null, cost.mana ? UI.resource('mana', cost.mana, { size: 14 }) : null),
      o.onRecruit ? el('div', { class: 'aow-item-row__action' }, UI.button(o.recruitLabel || t('ui.recruit'), e => { e.stopPropagation(); o.onRecruit(type, e); }, { kind: 'gold', small: true, disabled: !!disabled, tooltip: disabled && reason ? reason : null })) : null);
    UI.tooltip(row, () => UI.unitTooltip(fakeUnit, type, null, null) + (type.desc ? '<div class="tip-sep"></div><div class="tip-desc">' + esc(L(type.desc)) + '</div>' : '') + (disabled && reason ? '<div class="tip-bad">' + esc(reason) + '</div>' : ''));
    return row;
  };

  // ------------------------------------------------------------------ settings screen
  const SETTINGS_CSS = `
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 26px; min-width: 560px; }
.settings-section { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px 12px; background: rgba(0,0,0,0.22); border: 1px solid var(--line); border-radius: 5px; }
.settings-section > .aow-h3 { margin-bottom: 2px; padding-bottom: 4px; border-bottom: 1px solid var(--border-soft); }
.settings-row { display: flex; align-items: center; gap: 10px; min-height: 28px; }
.settings-row > label:first-child, .settings-row > span:first-child { flex: 0 0 132px; color: var(--text-dim); font-size: 12.5px; }
.settings-row > label.aow-check:first-child { flex: 1 1 auto; }            /* checkbox rows: the label is the whole row */
.settings-row .aow-segment { flex: 0 0 auto; }
.settings-row .aow-segment button { white-space: nowrap; }
.settings-row .aow-slider { flex: 1 1 auto; }
.settings-row .settings-val { flex: 0 0 40px; text-align: right; font-variant-numeric: tabular-nums; font-size: 12px; color: var(--gold-light); }
.settings-np { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; background: rgba(0,0,0,0.3); border-radius: 4px; border: 1px solid var(--border-soft); }
.settings-np__title { font-family: var(--font-title); color: var(--gold-light); font-size: 14px; }
.settings-np__composer { font-size: 11.5px; color: var(--text-dim); }
.settings-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.settings-foot .aow-xs { color: var(--text-faint); }
@media (max-width: 1300px) { .settings-grid { min-width: 0; } }
.menu-fallback { width: 420px; text-align: center; }
.menu-fallback .aow-panel__body { display: flex; flex-direction: column; gap: 10px; padding: 14px 32px 26px; }
.menu-fallback__title { font-family: var(--font-title); font-size: 40px; letter-spacing: 0.18em; color: var(--gold-light); text-shadow: 0 2px 0 #3a2c10, 0 0 24px rgba(241,217,138,0.45); margin: 10px 0 0; }
.menu-fallback__sub { color: var(--text-dim); margin-bottom: 8px; }
`;
  function volumeRow(labelKey, key) {
    const A = AOW.Audio;
    const vol = hasFn('Audio', 'getVolume') ? safe(() => A.getVolume(), {}) : {};
    const v = typeof vol[key] === 'number' ? vol[key] : 0.8;
    const val = el('span', { class: 'settings-val' }, t('ui.sliderPct', { n: Math.round(v * 100) }));
    const slider = el('input', { class: 'aow-slider', type: 'range', min: 0, max: 100, step: 1, value: Math.round(v * 100), style: { '--pct': Math.round(v * 100) + '%' } });
    slider.addEventListener('input', () => {
      const nv = slider.value / 100;
      slider.style.setProperty('--pct', slider.value + '%');
      val.textContent = t('ui.sliderPct', { n: slider.value });
      if (hasFn('Audio', 'setVolume')) safe(() => A.setVolume({ [key]: nv }));
    });
    slider.addEventListener('change', () => { if (key === 'sfx' || key === 'master') sfx('ui_click'); });
    return el('div', { class: 'settings-row' }, el('label', null, t(labelKey)), slider, val);
  }
  function segment(options, current, onPick) {
    const seg = el('div', { class: 'aow-segment' });
    for (const o of options) {
      const b = el('button', { type: 'button', class: o.value === current ? 'aow-active' : '' }, o.label);
      b.addEventListener('click', () => { for (const c of seg.children) c.classList.remove('aow-active'); b.classList.add('aow-active'); sfx('ui_click'); onPick(o.value); });
      seg.appendChild(b);
    }
    return seg;
  }
  function checkRow(labelKey, checked, onChange) {
    const input = el('input', { type: 'checkbox', checked: !!checked });
    input.addEventListener('change', () => { sfx('ui_click'); onChange(input.checked); });
    return el('div', { class: 'settings-row' }, el('label', { class: 'aow-check' }, input, el('span', null, t(labelKey))));
  }
  let npEl = null, npOff = null;
  function nowPlayingBox() {
    const box = el('div', { class: 'settings-np' });
    const title = el('div', { class: 'settings-np__title' }), comp = el('div', { class: 'settings-np__composer' });
    const update = () => {
      const np = hasFn('Music', 'nowPlaying') ? safe(() => AOW.Music.nowPlaying(), null) : null;
      title.textContent = np ? L(np.title) : t('ui.noMusic');
      comp.textContent = np ? L(np.composer || '') : '';
    };
    update();
    box.appendChild(title); box.appendChild(comp);
    npEl = box; box.update = update;
    return box;
  }
  function settingsContent() {
    const A = AOW.Audio, M = AOW.Music;
    const muted = hasFn('Audio', 'isMuted') ? !!safe(() => A.isMuted(), false) : false;
    const grid = el('div', { class: 'settings-grid' });
    // language + game options
    grid.appendChild(el('div', { class: 'settings-section' },
      el('h3', { class: 'aow-h3' }, t('ui.language')),
      el('div', { class: 'settings-row' }, el('span', null, t('ui.language')), segment([{ value: 'ko', label: t('ui.korean') }, { value: 'en', label: t('ui.english') }], UI.lang(), v => UI.setLang(v))),
      el('h3', { class: 'aow-h3', style: { marginTop: 8 } }, t('ui.gameOptions')),
      el('div', { class: 'settings-row' }, el('span', null, t('ui.animSpeed')), segment([{ value: 0.5, label: '0.5×' }, { value: 1, label: '1×' }, { value: 2, label: '2×' }, { value: 0, label: t('ui.instant') }], UI.settings.animSpeed, v => UI.setSetting('animSpeed', v))),
      checkRow('ui.edgeScroll', UI.settings.edgeScroll, v => UI.setSetting('edgeScroll', v)),
      checkRow('ui.yieldsOverlay', UI.settings.yieldsOverlay, v => UI.setSetting('yieldsOverlay', v)),
      checkRow('ui.autoBattle', UI.settings.autoBattle, v => UI.setSetting('autoBattle', v))));
    // audio
    const np = nowPlayingBox();
    grid.appendChild(el('div', { class: 'settings-section' },
      el('h3', { class: 'aow-h3' }, t('ui.audio')),
      volumeRow('ui.master', 'master'), volumeRow('ui.music', 'music'), volumeRow('ui.sfx', 'sfx'),
      checkRow('ui.mute', muted, v => { if (hasFn('Audio', 'setMuted')) safe(() => A.setMuted(v)); }),
      el('h3', { class: 'aow-h3', style: { marginTop: 8 } }, t('ui.nowPlaying')),
      np,
      el('div', { class: 'aow-row' },
        UI.button('', () => { if (hasFn('Music', 'prev')) safe(() => M.prev()); setTimeout(np.update, 50); }, { icon: 'down', small: true, tooltip: t('ui.prevSong'), style: { transform: 'rotate(90deg)' } }),
        UI.button('', () => { if (!M) return; const playing = hasFn('Music', 'isPlaying') ? safe(() => M.isPlaying(), false) : false; if (playing && hasFn('Music', 'pause')) safe(() => M.pause()); else if (hasFn('Music', 'isPaused') && safe(() => M.isPaused(), false) && hasFn('Music', 'resume')) safe(() => M.resume()); else if (hasFn('Music', 'play')) safe(() => M.play(null)); setTimeout(np.update, 50); }, { icon: 'music', small: true, tooltip: t('ui.play') + ' / ' + t('ui.pause') }),
        UI.button('', () => { if (hasFn('Music', 'next')) safe(() => M.next()); setTimeout(np.update, 50); }, { icon: 'down', small: true, tooltip: t('ui.nextSong'), style: { transform: 'rotate(-90deg)' } }))));
    const foot = el('div', { class: 'settings-foot' });
    const left = el('div', { class: 'aow-row' });
    if (game() && AOW.Main) {
      left.appendChild(UI.button(t('ui.save'), () => { if (hasFn('Main', 'save')) AOW.Main.save('quick'); }, { icon: 'save' }));
      left.appendChild(UI.button(t('ui.load'), () => { if (hasFn('Main', 'load')) { if (!AOW.Main.load('quick')) UI.toast('warn', t('ui.noSave')); } }, { icon: 'load', disabled: !(hasFn('Main', 'hasSave') && AOW.Main.hasSave('quick')) }));
      left.appendChild(UI.button(t('ui.quitToMenu'), () => UI.confirm(t('ui.quitConfirm'), () => UI.quitToMenu(), { danger: true }), { icon: 'menu', kind: 'danger' }));
    }
    foot.appendChild(left);
    foot.appendChild(el('span', { class: 'aow-xs' }, t('ui.settingsHint')));
    return [grid, foot];
  }
  UI.quitToMenu = function () {
    UI.closeAll();
    UI.closeScreen('hud');
    AOW.game = null; AOW.battle = null;
    if (hasFn('WorldRender', 'setGame')) safe(() => AOW.WorldRender.setGame(null));
    if (hasFn('Music', 'setMood')) safe(() => AOW.Music.setMood('menu'));
    UI.showScreen('menu');
  };
  UI.registerScreen('settings', {
    open() {
      const p = UI.panel({ title: t('ui.settings'), icon: 'settings', closable: true, onClose: () => UI.closeScreen('settings'), body: settingsContent(), width: 720 });
      if (hasFn('Music', 'onChange')) { if (npOff) npOff(); npOff = AOW.Music.onChange(() => { if (npEl && npEl.update) npEl.update(); }); }
      return p;
    },
    close() { if (npOff) { npOff(); npOff = null; } npEl = null; },
    refresh() { if (npEl && npEl.update) npEl.update(); },
  });

  // ------------------------------------------------------------------ fallback menu (only if menu.js has not registered one)
  function registerFallbackMenu() {
    UI.registerScreen('menu', {
      full: true,
      open() {
        const p = UI.panel({ cls: 'menu-fallback', body: [
          el('h1', { class: 'menu-fallback__title' }, t('ui.menuTitle')),
          el('div', { class: 'menu-fallback__sub' }, t('ui.menuSub')),
          el('div', { class: 'aow-divider' }),
          UI.button(t('ui.newGame'), () => { if (AOW.Debug && typeof AOW.Debug.newGameAndSkipMenu === 'function') AOW.Debug.newGameAndSkipMenu(); }, { kind: 'gold', large: true, wide: true, icon: 'flag' }),
          UI.button(t('ui.load'), () => { if (!(hasFn('Main', 'load') && AOW.Main.load('quick'))) UI.toast('warn', t('ui.noSave')); }, { large: true, wide: true, icon: 'load', disabled: !(hasFn('Main', 'hasSave') && AOW.Main.hasSave('quick')) }),
          UI.button(t('ui.settings'), () => UI.showScreen('settings'), { large: true, wide: true, icon: 'settings' }),
        ] });
        return p;
      },
    });
  }

  AOW.UI = UI;
})(window.AOW = window.AOW || {});
