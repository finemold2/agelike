// src/ui/hud.js — screen 'hud': top resource bar, turn/end-turn, selected army/city panel, minimap,
// notification stack, spell quick bar, next-unit, hotkeys (SPEC §10 "hud.js").
//
// This file owns all *map interaction* (hex:click / hex:dblclick / hex:hover) once a game is running —
// selecting armies/cities, previewing & confirming moves, resolving encounters, and world-spell targeting.
// Every call into AOW.Rules / AOW.Turn / AOW.Combat / AOW.WorldRender is guarded with `hasFn`/`safe` because
// those modules are being completed in parallel (SPEC §5/§6); when a function is missing the HUD still
// renders and degrades gracefully (buttons disable themselves with a tooltip instead of throwing).
//
// Additive API (beyond SPEC §10), reachable via `AOW.UI.hudApi()` once a game is running:
//   hud.endTurn() / hud.nextUnit() / hud.centerCapital() / hud.onEscape()   — used by UI's global hotkeys
//   hud.selectArmy(armyId) / hud.selectCity(cityId) / hud.clearSelection()
//   hud.enterCastMode(spellId) / hud.clearCastMode() / hud.castMode()      — world-spell targeting state
//   hud.clearPathPreview()
// Bridging notes (documented per Ground Rule 0 — SPEC's WorldRender.centerOn takes a hex index, not a
// world-px point, so the minimap's "click → centerOn(minimapToWorld)" is implemented as
// minimapToWorld → Hex.fromPixel → idx → centerOn(idx)).
(function (AOW) {
  'use strict';
  const UI = AOW.UI || (AOW.UI = {});
  const hasFn = (ns, fn) => !!(AOW[ns] && typeof AOW[ns][fn] === 'function');
  const safe = (fn, dflt) => { try { const r = fn(); return r === undefined ? dflt : r; } catch (e) { AOW.log && AOW.log('[hud] safe', e); return dflt; } };
  const t = (k, p) => AOW.t(k, p);
  const L = (o, p) => AOW.L(o, p);
  const esc = s => UI.esc ? UI.esc(s) : String(s === null || s === undefined ? '' : s);
  const el = (...a) => UI.el(...a);
  const S = () => AOW.State;
  const game = () => AOW.game;
  const human = () => { const g = game(); if (!g) return null; return g.players.find(p => p.isHuman) || g.players[0] || null; };
  let sfxOk = true;
  function sfx(name, o) { if (!sfxOk || !hasFn('SFX', 'play')) return; try { AOW.SFX.play(name, o); } catch (e) { sfxOk = false; } }

  // ------------------------------------------------------------------ i18n
  AOW.I18n.add({
    ko: {
      'hud.turn': '{n}턴', 'hud.endTurn': '턴 종료', 'hud.endTurnConfirmTitle': '정말 턴을 종료할까요?', 'hud.endTurnConfirm': '그래도 종료', 'hud.otherTurn': '다른 세력의 턴…',
      'hud.warn.army_mp': '아직 이동할 수 있는 부대가 있습니다.', 'hud.warn.idle_city': '생산이 비어 있는 도시가 있습니다.', 'hud.warn.no_research': '연구할 마도서를 선택하지 않았습니다.', 'hud.warn.pending_battles': '아직 해결하지 않은 전투가 있습니다.', 'hud.warn.generic': '확인할 사항이 있습니다.',
      'hud.hint.none': '지도에서 부대나 도시를 선택하세요.', 'hud.selection.army': '선택한 부대', 'hud.selection.city': '선택한 도시', 'hud.selection.freeCity': '자유 도시',
      'hud.mp': '이동력', 'hud.defend': '방어', 'hud.sleep': '대기', 'hud.disband': '해산', 'hud.disbandConfirm': '선택한 유닛을 해산할까요? 되돌릴 수 없습니다.',
      'hud.split': '분할', 'hud.splitHint': '분리할 유닛을 먼저 클릭하세요.', 'hud.merge': '합치기', 'hud.foundOutpost': '전초기지 건설', 'hud.viewHero': '영웅 보기', 'hud.openCity': '도시 열기',
      'hud.notifications': '알림', 'hud.noNotifications': '새 알림이 없습니다.', 'hud.nextUnit': '다음 부대', 'hud.noMoreUnits': '더 이상 이동할 부대가 없습니다.',
      'hud.nav.research': '연구', 'hud.nav.spellbook': '주문서', 'hud.nav.empire': '제국', 'hud.nav.heroes': '영웅', 'hud.nav.diplomacy': '외교', 'hud.nav.cities': '도시', 'hud.nav.settings': '설정',
      'hud.casting': '시전 포인트', 'hud.researching': '연구 중: {name}', 'hud.noResearchQueued': '연구를 선택하세요', 'hud.overlay.provinces': '지방 경계 표시', 'hud.overlay.yields': '산출량 표시',
      'hud.castHint': '{name} — 지도에서 대상을 선택하세요. (우클릭으로 취소)', 'hud.castCancelled': '주문 시전을 취소했습니다.', 'hud.castDone': '{name} 시전 완료.',
      'hud.encounter.title': '교전', 'hud.encounter.ours': '아군 전력', 'hud.encounter.theirs': '적 전력', 'hud.attack': '공격', 'hud.autoResolve': '자동 전투',
      'hud.autoWin': '승리했습니다!', 'hud.autoLose': '패배했습니다…', 'hud.freeCity.title': '자유 도시', 'hud.freeCity.gift': '선물', 'hud.freeCity.vassalize': '봉신화 요청', 'hud.freeCity.declareWar': '전쟁 선포',
      'hud.unclaimed': '미개척 지방', 'hud.queueEmpty': '생산 대기열이 비어 있습니다', 'hud.provinceYields': '지방 산출', 'hud.improvement': '개선물', 'hud.resource': '자원', 'hud.units': '유닛',
      'hud.endTurnUnavailable': '아직 턴 종료 규칙이 준비되지 않았습니다.', 'hud.moveUnavailable': '아직 이동 규칙이 준비되지 않았습니다.', 'hud.base': '기본', 'hud.vassalTribute': '봉신 조공', 'hud.opinion': '호감도',
    },
    en: {
      'hud.turn': 'Turn {n}', 'hud.endTurn': 'End Turn', 'hud.endTurnConfirmTitle': 'End the turn now?', 'hud.endTurnConfirm': 'End anyway', 'hud.otherTurn': 'Other realms are taking their turn…',
      'hud.warn.army_mp': 'Some armies can still move.', 'hud.warn.idle_city': 'Some cities have nothing queued.', 'hud.warn.no_research': 'No tome selected for research.', 'hud.warn.pending_battles': 'There are unresolved battles.', 'hud.warn.generic': 'There are things to check.',
      'hud.hint.none': 'Select an army or city on the map.', 'hud.selection.army': 'Selected army', 'hud.selection.city': 'Selected city', 'hud.selection.freeCity': 'Free city',
      'hud.mp': 'Movement', 'hud.defend': 'Defend', 'hud.sleep': 'Sleep', 'hud.disband': 'Disband', 'hud.disbandConfirm': 'Disband the selected unit(s)? This cannot be undone.',
      'hud.split': 'Split', 'hud.splitHint': 'Click units to split off first.', 'hud.merge': 'Merge', 'hud.foundOutpost': 'Found outpost', 'hud.viewHero': 'View hero', 'hud.openCity': 'Open city',
      'hud.notifications': 'Notifications', 'hud.noNotifications': 'No new notifications.', 'hud.nextUnit': 'Next unit', 'hud.noMoreUnits': 'No more units to move.',
      'hud.nav.research': 'Research', 'hud.nav.spellbook': 'Spellbook', 'hud.nav.empire': 'Empire', 'hud.nav.heroes': 'Heroes', 'hud.nav.diplomacy': 'Diplomacy', 'hud.nav.cities': 'Cities', 'hud.nav.settings': 'Settings',
      'hud.casting': 'Casting points', 'hud.researching': 'Researching: {name}', 'hud.noResearchQueued': 'Choose a tome to research', 'hud.overlay.provinces': 'Show province borders', 'hud.overlay.yields': 'Show yields',
      'hud.castHint': '{name} — choose a target on the map. (right-click to cancel)', 'hud.castCancelled': 'Cast cancelled.', 'hud.castDone': '{name} cast.',
      'hud.encounter.title': 'Encounter', 'hud.encounter.ours': 'Our strength', 'hud.encounter.theirs': 'Their strength', 'hud.attack': 'Attack', 'hud.autoResolve': 'Auto-resolve',
      'hud.autoWin': 'Victory!', 'hud.autoLose': 'Defeat…', 'hud.freeCity.title': 'Free city', 'hud.freeCity.gift': 'Gift', 'hud.freeCity.vassalize': 'Demand vassalage', 'hud.freeCity.declareWar': 'Declare war',
      'hud.unclaimed': 'Unclaimed province', 'hud.queueEmpty': 'Production queue is empty', 'hud.provinceYields': 'Province yields', 'hud.improvement': 'Improvement', 'hud.resource': 'Resource', 'hud.units': 'units',
      'hud.endTurnUnavailable': 'Turn rules are not ready yet.', 'hud.moveUnavailable': 'Movement rules are not ready yet.', 'hud.base': 'Base', 'hud.vassalTribute': 'Vassal tribute', 'hud.opinion': 'Opinion',
    },
  });

  // ------------------------------------------------------------------ CSS
  const CSS = `
.hud-root { position: absolute; inset: 0; pointer-events: none; font-variant-numeric: tabular-nums; }
.hud-topbar { position: absolute; left: 0; right: 0; top: 0; pointer-events: auto; display: flex; align-items: stretch; gap: 0;
  background: linear-gradient(180deg, rgba(21,26,38,0.97) 0%, rgba(21,26,38,0.9) 70%, rgba(21,26,38,0) 100%);
  border-bottom: 2px solid var(--gold); box-shadow: 0 2px 10px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.6); padding: 6px 10px 10px; }
.hud-banner { display: flex; align-items: center; gap: 8px; padding-right: 12px; margin-right: 8px; border-right: 1px solid var(--border-soft); flex: 0 0 auto; }
.hud-banner__flag { position: relative; width: 30px; height: 38px; clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%); box-shadow: 0 2px 5px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.5); flex: 0 0 auto; }
.hud-banner__names { display: flex; flex-direction: column; gap: 0; min-width: 0; }
.hud-banner__ruler { font-family: var(--font-title); font-size: 13px; color: var(--gold-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.hud-banner__faction { font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.hud-res-row { display: flex; align-items: center; gap: 2px; flex: 1 1 auto; min-width: 0; overflow: hidden; }
.hud-res { display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 4px; cursor: default; }
.hud-res:hover { background: rgba(201,162,74,0.1); }
.hud-res .icon { width: 20px; height: 20px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.7)); }
.hud-res__val { font-weight: 700; font-size: 14px; color: var(--text); }
.hud-res__delta { font-size: 10.5px; margin-top: -1px; }
.hud-res__delta.aow-pos { color: var(--good-light); } .hud-res__delta.aow-neg { color: var(--danger-light); } .hud-res__delta.aow-zero { color: var(--text-faint); }
.hud-turnbox { display: flex; align-items: center; gap: 6px; padding: 2px 14px; margin: 0 6px; border-left: 1px solid var(--border-soft); border-right: 1px solid var(--border-soft); flex: 0 0 auto; }
.hud-turnbox__n { font-family: var(--font-title); font-size: 16px; color: var(--gold-light); text-shadow: 0 1px 0 #000; }
.hud-nav { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; margin-left: 6px; }
.hud-topbar .aow-btn--nav.aow-btn--active { box-shadow: 0 0 0 1px #2a2010, inset 0 0 0 1px var(--gold-light), var(--glow-gold); }
.hud-endturn-wrap { position: absolute; right: 16px; bottom: 16px; pointer-events: auto; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; z-index: 3; }
.hud-endturn { height: 56px; padding: 0 26px 0 20px; font-size: 16px; letter-spacing: 0.04em; border-radius: 8px; position: relative; }
.hud-endturn .icon { width: 26px; height: 26px; }
.hud-minimap { position: absolute; right: 16px; bottom: 84px; width: 240px; pointer-events: auto; z-index: 2; }
.hud-minimap__frame { position: relative; width: 240px; height: 160px; border-radius: 6px; overflow: hidden; border: 2px solid var(--gold); box-shadow: var(--shadow-panel), 0 0 0 1px rgba(0,0,0,0.7); background: #0b1320; }
.hud-minimap__frame canvas { display: block; width: 240px; height: 160px; cursor: pointer; }
.hud-minimap__overlays { position: absolute; left: 4px; top: 4px; display: flex; gap: 3px; z-index: 2; }
.hud-minimap__overlays .aow-btn--icon { width: 22px; height: 22px; opacity: 0.85; }
.hud-notifications { position: absolute; right: 16px; top: 66px; width: 260px; max-height: 34vh; pointer-events: auto; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; z-index: 2; }
.hud-notif { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 4px; cursor: pointer; background: linear-gradient(180deg, rgba(38,47,69,0.92), rgba(21,26,38,0.92)); border: 1px solid var(--border-soft); border-left: 3px solid var(--kind, var(--gold)); box-shadow: 0 2px 6px rgba(0,0,0,0.5); }
.hud-notif:hover { border-color: var(--gold); filter: brightness(1.1); }
.hud-notif .icon { width: 17px; height: 17px; margin-top: 1px; flex: 0 0 auto; }
.hud-notif__text { font-size: 12px; line-height: 1.3; color: var(--text); }
.hud-selection { position: absolute; left: 16px; bottom: 16px; width: 420px; max-width: calc(100vw - 500px); pointer-events: auto; z-index: 2; }
.hud-selection .aow-panel__body { max-height: 40vh; overflow-y: auto; }
.hud-unitrow { display: flex; gap: 6px; flex-wrap: wrap; padding: 2px 0 8px; }
.hud-actions { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 6px; border-top: 1px solid var(--line); }
.hud-cityhead { display: flex; align-items: center; gap: 8px; }
.hud-cityhead__name { font-family: var(--font-title); font-size: 16px; color: var(--gold-light); }
.hud-city-yields { display: flex; gap: 10px; flex-wrap: wrap; padding: 6px 0; }
.hud-bottombar { position: absolute; left: 452px; right: 272px; bottom: 16px; pointer-events: none; display: flex; align-items: flex-end; gap: 10px; z-index: 1; }
.hud-bottombar > * { pointer-events: auto; }
.hud-spellbar { display: flex; align-items: center; gap: 5px; padding: 6px; }
.hud-spellbar__btn { position: relative; width: 44px; height: 44px; border-radius: 6px; padding: 0; }
.hud-spellbar__btn .icon { width: 26px; height: 26px; }
.hud-ministatus { display: flex; flex-direction: column; gap: 5px; min-width: 190px; padding: 8px 10px; }
.hud-ministatus__row { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.hud-ministatus__row .icon { width: 18px; height: 18px; flex: 0 0 auto; }
.hud-ministatus__label { font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; }
.hud-ministatus .aow-progress { flex: 1 1 auto; height: 8px; }
.hud-turnoverlay { position: absolute; inset: 0; pointer-events: auto; z-index: 90; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 14px;
  background: radial-gradient(ellipse at 50% 45%, rgba(15,12,24,0.75), rgba(5,6,12,0.92)); animation: aow-fade 0.15s ease; }
.hud-turnoverlay__icon { animation: aow-spin 1.6s linear infinite; filter: drop-shadow(0 0 12px rgba(241,217,138,0.5)); }
.hud-turnoverlay__text { font-family: var(--font-title); font-size: 22px; letter-spacing: 0.08em; color: var(--gold-light); text-shadow: 0 2px 0 #000, 0 0 20px rgba(241,217,138,0.4); }
.hud-castbanner { position: absolute; left: 50%; top: 62px; transform: translateX(-50%); pointer-events: auto; display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-radius: 20px; z-index: 4;
  background: linear-gradient(180deg, rgba(122,90,220,0.92), rgba(50,30,90,0.92)); border: 1px solid #b69cff; box-shadow: 0 4px 14px rgba(0,0,0,0.5), 0 0 18px rgba(150,110,255,0.4); color: #f0eaff; font-size: 13px; }
.hud-empty-hint { padding: 10px 4px; text-align: center; color: var(--text-dim); font-style: italic; font-size: 12.5px; }
@media (max-width: 1280px) { .hud-selection { width: 340px; } .hud-bottombar { left: 372px; right: 272px; } }
@media (max-width: 1100px) { .hud-bottombar { display: none; } }
`;

  // ==================================================================== module state
  const off = [];
  let root = null, mmCanvas = null, mmCtx = null, mmAccum = 0, mmDpr = 1;
  let overlayMode = 'none';
  let splitSel = new Set();
  let cast = null;              // {spell} while in world-spell target mode
  let hoverTimer = 0, hoverIdxShown = -1;
  let previewTarget = -1;       // hex idx the current path preview targets
  let turnOverlayEl = null;
  const MM_W = 240, MM_H = 160;

  const RES_KEYS = ['gold', 'mana', 'knowledge', 'imperium'];

  // ==================================================================== small data helpers
  function ownArmyAt(g, idx) { const p = human(); if (!p) return null; return S().armiesAt(g, idx).find(a => a.owner === p.id) || null; }
  function selectedArmy() { const g = game(); if (!g || UI.selected.armyId === null) return null; return S().army(g, UI.selected.armyId); }
  function selectedCity() { const g = game(); if (!g || UI.selected.cityId === null) return null; return S().city(g, UI.selected.cityId); }
  function heroOfArmy(g, army) { if (!army) return null; for (const uid of army.units) { const u = S().unit(g, uid); if (u && u.heroId !== null && u.heroId !== undefined && u.heroId >= 0) return u.heroId; } return null; }

  // ==================================================================== top bar
  function resBreakdownHtml(kind, income) {
    let h = '<div class="tip-title">' + esc(UI.resourceName(kind)) + '</div>';
    const d = income && income.detail;
    if (!d) return h;
    h += '<div class="tip-kv">';
    const row = (label, v) => { if (v) h += '<span>' + esc(label) + '</span><span>' + UI.fmtSigned(Math.round(v)) + '</span>'; };
    if (kind === 'gold') { row(t('hud.base'), d.base.gold); row(t('hud.nav.cities'), d.cities && d.cities.gold); row(t('ui.upkeep'), -((d.unitUpkeep && d.unitUpkeep.gold) || 0)); row(t('hud.vassalTribute'), d.vassals); }
    else if (kind === 'mana') { row(t('ui.cat_economy'), d.cities && d.cities.mana); row(t('ui.upkeep'), -((d.unitUpkeep && d.unitUpkeep.mana) || 0)); row(t('ui.upkeep') + ' (' + t('ui.kind_unit_enchant') + ')', -(d.enchantUpkeep || 0)); }
    else if (kind === 'knowledge') { row(t('ui.cat_economy'), d.cities && d.cities.knowledge); }
    else if (kind === 'imperium') { row(t('ui.res_imperium'), d.base && d.base.imperium); row(t('hud.nav.cities'), d.cityImperium); }
    h += '</div>';
    return h;
  }
  function renderTopbar() {
    const g = game(), p = human();
    const bar = el('div', { class: 'hud-topbar' });
    if (!g || !p) return bar;
    const income = hasFn('Rules', 'playerIncome') ? safe(() => AOW.Rules.playerIncome(g, p), null) : null;

    // faction banner
    const cul = AOW.Data && AOW.Data.has('cultures', p.cultureId) ? AOW.Data.get('cultures', p.cultureId) : null;
    const flag = el('div', { class: 'hud-banner__flag', style: { background: 'linear-gradient(160deg,' + (p.color2 || '#fff') + ',' + p.color + ' 60%)' } });
    bar.appendChild(el('div', { class: 'hud-banner', tooltip: () => '<div class="tip-title">' + esc(p.name) + '</div><div class="tip-sub">' + esc((p.rulerName || '') + (cul ? ' · ' + L(cul.name) : '')) + '</div>' },
      flag,
      el('div', { class: 'hud-banner__names' },
        el('div', { class: 'hud-banner__ruler' }, p.rulerName || p.name),
        el('div', { class: 'hud-banner__faction' }, p.name))));

    // resources
    const resRow = el('div', { class: 'hud-res-row' });
    for (const k of RES_KEYS) {
      const val = (p.resources && p.resources[k]) || 0;
      const delta = income ? income[k] : null;
      resRow.appendChild(el('div', { class: 'hud-res', tooltip: () => resBreakdownHtml(k, income) },
        UI.icon(k, 20),
        el('div', null,
          el('div', { class: 'hud-res__val' }, UI.fmt(val)),
          delta !== null && delta !== undefined ? el('div', { class: 'hud-res__delta ' + (UI.signClass(delta) || 'aow-zero') }, UI.fmtSigned(delta)) : null)));
    }
    // casting points
    if (p.casting) resRow.appendChild(el('div', { class: 'hud-res', tooltip: () => '<div class="tip-title">' + esc(t('hud.casting')) + '</div>' },
      UI.icon('casting', 20), el('div', null, el('div', { class: 'hud-res__val' }, UI.fmt(p.casting.cp) + ' / ' + UI.fmt(p.casting.cpMax)))));
    bar.appendChild(resRow);

    // turn box
    const realmName = p.name || '';
    bar.appendChild(el('div', { class: 'hud-turnbox' }, UI.icon('turn', 22), el('div', null,
      el('div', { class: 'hud-turnbox__n' }, t('hud.turn', { n: g.turn })),
      el('div', { class: 'aow-dim aow-xs' }, realmName))));

    // nav
    const nav = el('div', { class: 'hud-nav' });
    const navBtn = (name, icon, tipKey) => nav.appendChild(UI.button('', () => UI.showScreen(name), { icon, kind: 'ghost', cls: 'aow-btn--nav', active: UI.isOpen(name), tooltip: t(tipKey) }));
    navBtn('cities', UI.iconName('cities') || 'cities', 'hud.nav.cities');
    navBtn('research', 'research', 'hud.nav.research');
    navBtn('spellbook', 'spellbook', 'hud.nav.spellbook');
    navBtn('empire', UI.iconName('empire', 'crown'), 'hud.nav.empire');
    navBtn('heroes', 'heroes', 'hud.nav.heroes');
    navBtn('diplomacy', 'diplomacy', 'hud.nav.diplomacy');
    nav.appendChild(el('div', { style: { width: '6px' } }));
    navBtn('settings', 'settings', 'hud.nav.settings');
    bar.appendChild(el('div', { class: 'aow-grow' }));
    bar.appendChild(nav);
    return bar;
  }

  // ==================================================================== minimap
  function buildMinimap() {
    const wrap = el('div', { class: 'hud-minimap' });
    const frame = el('div', { class: 'hud-minimap__frame' });
    mmCanvas = el('canvas');
    mmDpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    mmCanvas.width = MM_W * mmDpr; mmCanvas.height = MM_H * mmDpr;
    mmCtx = mmCanvas.getContext('2d');
    mmCtx.setTransform(mmDpr, 0, 0, mmDpr, 0, 0);
    frame.appendChild(mmCanvas);
    const overlays = el('div', { class: 'hud-minimap__overlays' });
    const ovBtn = (mode, icon, tipKey) => overlays.appendChild(UI.button('', () => {
      overlayMode = overlayMode === mode ? 'none' : mode;
      if (hasFn('WorldRender', 'setOverlay')) safe(() => AOW.WorldRender.setOverlay(overlayMode));
      renderMinimapOverlayButtons(overlays);
    }, { icon, kind: 'ghost', small: true, tooltip: t(tipKey) }));
    ovBtn('provinces', UI.iconName('annex', 'eye'), 'hud.overlay.provinces');
    ovBtn('yields', UI.iconName('gold'), 'hud.overlay.yields');
    frame.appendChild(overlays);
    wrap.appendChild(frame);
    bindMinimapInput(mmCanvas);
    return wrap;
  }
  function renderMinimapOverlayButtons(overlays) {
    const btns = overlays.querySelectorAll('button');
    if (btns[0]) btns[0].classList.toggle('aow-btn--active', overlayMode === 'provinces');
    if (btns[1]) btns[1].classList.toggle('aow-btn--active', overlayMode === 'yields');
  }
  function minimapGoTo(clientX, clientY, animate) {
    const g = game(); if (!g || !mmCanvas || !hasFn('WorldRender', 'minimapToWorld')) return;
    const r = mmCanvas.getBoundingClientRect();
    const mx = clientX - r.left, my = clientY - r.top;
    const w = safe(() => AOW.WorldRender.minimapToWorld(mx, my, MM_W, MM_H), null);
    if (!w || !AOW.Hex) return;
    const h = AOW.Hex.fromPixel(w.x, w.y);
    if (!AOW.Hex.inBounds(h.col, h.row, g.W, g.H)) return;
    if (hasFn('WorldRender', 'centerOn')) safe(() => AOW.WorldRender.centerOn(h.row * g.W + h.col, !!animate));
  }
  function bindMinimapInput(cv) {
    let dragging = false;
    cv.addEventListener('pointerdown', e => { dragging = true; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } minimapGoTo(e.clientX, e.clientY, false); });
    cv.addEventListener('pointermove', e => { if (dragging) minimapGoTo(e.clientX, e.clientY, false); });
    const stop = e => { if (dragging) { dragging = false; try { cv.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ } } };
    cv.addEventListener('pointerup', stop); cv.addEventListener('pointercancel', stop);
  }
  function drawMinimap() {
    if (!mmCanvas || !mmCtx || !hasFn('WorldRender', 'renderMinimap')) return;
    mmCtx.clearRect(0, 0, MM_W, MM_H);
    safe(() => AOW.WorldRender.renderMinimap(mmCtx, MM_W, MM_H));
  }

  // ==================================================================== notifications
  function notifKindClass(kind) { return { info: 'var(--accent)', good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--danger)' }[kind] || 'var(--gold)'; }
  function onNotifClick(n) {
    const g = game(); if (!g) return;
    const ref = n.ref || {};
    if (ref.cityId !== undefined && ref.cityId !== null) { const c = S().city(g, ref.cityId); if (c) { if (hasFn('WorldRender', 'centerOn')) safe(() => AOW.WorldRender.centerOn(c.hex, true)); UI.select({ cityId: c.id }); } }
    else if (ref.armyId !== undefined && ref.armyId !== null) { const a = S().army(g, ref.armyId); if (a) { if (hasFn('WorldRender', 'centerOn')) safe(() => AOW.WorldRender.centerOn(a.hex, true)); UI.select({ armyId: a.id }); } }
    else if (ref.hex !== undefined && ref.hex !== null && hasFn('WorldRender', 'centerOn')) safe(() => AOW.WorldRender.centerOn(ref.hex, true));
  }
  function renderNotifications() {
    const wrap = el('div', { class: 'hud-notifications' });
    const g = game(), p = human();
    if (!g || !p) return wrap;
    const list = (g.notifications || []).filter(n => n.turn === g.turn && (n.pid === p.id || n.pid === -1 || n.pid === undefined)).slice(-10).reverse();
    for (const n of list) {
      wrap.appendChild(el('div', { class: 'hud-notif', style: { '--kind': notifKindClass(n.kind) }, onclick: () => onNotifClick(n) },
        UI.icon(n.icon || (n.kind === 'bad' ? 'cross' : n.kind === 'warn' ? 'warning' : n.kind === 'good' ? 'check' : 'info'), 17),
        el('div', { class: 'hud-notif__text' }, typeof n.text === 'object' ? L(n.text) : n.text)));
    }
    return wrap;
  }

  // ==================================================================== selection panel — army
  function readyWarnKind(w) {
    if (typeof w === 'string') return w;
    return (w && (w.type || w.kind)) || 'generic';
  }
  function warnText(w) {
    if (typeof w === 'string') return AOW.I18n.has('hud.warn.' + w) ? t('hud.warn.' + w) : w;
    if (w && w.text) return typeof w.text === 'object' ? L(w.text) : w.text;
    const kind = readyWarnKind(w);
    return AOW.I18n.has('hud.warn.' + kind) ? t('hud.warn.' + kind) : t('hud.warn.generic');
  }

  function armyActionButtons(g, p, army) {
    const wrap = el('div', { class: 'hud-actions' });
    const selUnits = () => Array.from(splitSel);
    wrap.appendChild(UI.button(t('hud.defend'), () => afterAction(call('Rules', 'defendArmy', g, army)), { icon: 'defend', small: true, disabled: !hasFn('Rules', 'defendArmy') }));
    wrap.appendChild(UI.button(t('hud.sleep'), () => afterAction(call('Rules', 'sleepArmy', g, army)), { icon: 'sleep', small: true, disabled: !hasFn('Rules', 'sleepArmy') }));
    wrap.appendChild(UI.button(t('hud.split'), () => {
      const ids = selUnits();
      if (!ids.length) { UI.toast('info', t('hud.splitHint')); return; }
      const r = call('Rules', 'splitArmy', g, army, ids);
      splitSel.clear(); afterAction(r);
    }, { icon: 'split', small: true, disabled: !hasFn('Rules', 'splitArmy') || army.units.length < 2, tooltip: t('hud.splitHint') }));
    const stackMate = S().armiesAt(g, army.hex).find(a => a.id !== army.id && a.owner === army.owner);
    wrap.appendChild(UI.button(t('hud.merge'), () => { const r = call('Rules', 'mergeArmies', g, army, stackMate); afterAction(r); }, { icon: 'merge', small: true, disabled: !hasFn('Rules', 'mergeArmies') || !stackMate }));
    const canFound = hasFn('Rules', 'canFoundOutpost') ? safe(() => AOW.Rules.canFoundOutpost(g, p, army.hex, army.id), null) : null;
    wrap.appendChild(UI.button(t('hud.foundOutpost'), () => { const r = call('Rules', 'foundOutpost', g, p, army.hex, army.id); afterAction(r); }, { icon: UI.iconName('outpost', 'flag'), small: true, disabled: !hasFn('Rules', 'foundOutpost') || (canFound && canFound.ok === false), tooltip: canFound && canFound.ok === false ? (canFound.text || AOW.t('rules.reason.' + canFound.reason)) : null }));
    const heroId = heroOfArmy(g, army);
    if (heroId !== null) wrap.appendChild(UI.button(t('hud.viewHero'), () => UI.showScreen('hero', { heroId }), { icon: 'heroes', small: true, kind: 'gold' }));
    wrap.appendChild(UI.button(t('hud.disband'), () => {
      UI.confirm(t('hud.disbandConfirm'), () => {
        const ids = selUnits().length ? selUnits() : army.units.slice();
        let r = null;
        for (const uid of ids) r = call('Rules', 'disband', g, uid);
        splitSel.clear(); afterAction(r);
      }, { danger: true });
    }, { icon: 'disband', small: true, kind: 'danger', disabled: !hasFn('Rules', 'disband') }));
    return wrap;
  }
  function renderArmyPanel(g, p, army) {
    const cards = el('div', { class: 'hud-unitrow' });
    for (const uid of army.units) {
      const on = splitSel.has(uid);
      cards.appendChild(UI.unitCard(uid, { small: true, selected: on, onClick: () => { if (splitSel.has(uid)) splitSel.delete(uid); else splitSel.add(uid); refreshSelection(); } }));
    }
    const maxMp = hasFn('State', 'armyMaxMp') ? safe(() => AOW.State.armyMaxMp(g, army), army.mp) : army.mp;
    return [
      cards,
      UI.progressBar(army.mp, Math.max(1, maxMp), { label: UI.fmt(army.mp) + ' / ' + UI.fmt(maxMp) + ' ' + t('hud.mp'), color: 'var(--c-draft)' }),
      armyActionButtons(g, p, army),
    ];
  }

  // ------------------------------------------------------------ selection panel — city
  function renderCityPanel(g, p, city) {
    const isFree = city.owner < 0 && city.freeCity;
    const isOwn = city.owner === (p && p.id);
    const box = [];
    box.push(el('div', { class: 'hud-cityhead' },
      UI.icon(city.tier === 0 ? 'outpost' : 'cities', 30),
      el('div', { class: 'aow-grow' },
        el('div', { class: 'hud-cityhead__name' }, city.name, city.isCapital ? UI.icon('crown', 15) : null),
        el('div', { class: 'aow-dim aow-small' }, isFree ? t('hud.selection.freeCity') : (UI.roman(city.tier) + ' · ' + t('ui.res_pop') + ' ' + UI.fmt(city.pop))))));
    if (!isFree) {
      const y = hasFn('Rules', 'cityYields') ? safe(() => AOW.Rules.cityYields(g, city), null) : null;
      if (y) {
        const row = el('div', { class: 'hud-city-yields' });
        for (const k of ['food', 'production', 'gold', 'mana', 'knowledge']) if (y[k]) row.appendChild(UI.resource(k, y[k], { size: 15, signed: k === 'food' }));
        box.push(row);
      }
      const q = (city.queue || [])[0];
      box.push(el('div', { class: 'aow-small' }, q ? (t('ui.production') + ': ' + (q.type === 'unit' && AOW.Data.has('units', q.id) ? L(AOW.Data.get('units', q.id).name) : q.id)) : el('span', { class: 'aow-warn' }, t('hud.queueEmpty'))));
    } else {
      box.push(el('div', { class: 'aow-small aow-dim' }, city.freeCity.culture || ''));
      box.push(renderFreeCityOptions(g, p, city));
    }
    if (isOwn) box.push(el('div', { class: 'hud-actions' }, UI.button(t('hud.openCity'), () => UI.showScreen('city', { cityId: city.id }), { icon: 'cities', kind: 'gold' })));
    return box;
  }
  function renderFreeCityOptions(g, p, city) {
    const wrap = el('div', { class: 'hud-actions' });
    const has = hasFn('Rules', 'freeCityAction');
    const opinion = hasFn('Rules', 'freeCityOpinion') ? safe(() => AOW.Rules.freeCityOpinion(g, city, p.id), null) : null;
    if (opinion !== null) wrap.appendChild(el('div', { class: 'aow-small aow-dim', style: { width: '100%' } }, t('hud.opinion') + ': ', el('b', null, UI.fmtSigned(opinion))));
    wrap.appendChild(UI.button(t('hud.freeCity.gift'), () => afterAction(call('Rules', 'freeCityAction', g, p, city, 'gift')), { icon: 'gold', small: true, disabled: !has }));
    wrap.appendChild(UI.button(t('hud.freeCity.vassalize'), () => afterAction(call('Rules', 'freeCityAction', g, p, city, 'vassalize')), { icon: UI.iconName('alliance', 'flag'), small: true, disabled: !has }));
    wrap.appendChild(UI.button(t('hud.freeCity.declareWar'), () => afterAction(call('Rules', 'freeCityAction', g, p, city, 'declare')), { icon: 'sword', small: true, kind: 'danger', disabled: !has }));
    return wrap;
  }

  function renderSelection() {
    const g = game(), p = human();
    if (!g || !p) return UI.panel({ cls: 'hud-selection aow-panel--hud', body: el('div', { class: 'hud-empty-hint' }, t('hud.hint.none')) });
    const army = selectedArmy(), city = selectedCity();
    let title = null, icon = null, body;
    if (army) { title = t('hud.selection.army'); icon = 'recruit'; body = renderArmyPanel(g, p, army); }
    else if (city) { title = city.freeCity ? t('hud.selection.freeCity') : t('hud.selection.city'); icon = city.tier === 0 ? 'outpost' : 'cities'; body = renderCityPanel(g, p, city); }
    else body = el('div', { class: 'hud-empty-hint' }, t('hud.hint.none'));
    return UI.panel({ cls: 'hud-selection aow-panel--hud', title, icon, body });
  }

  // ==================================================================== bottom bar (next-unit + spells + research/casting)
  function renderBottomBar() {
    const wrap = el('div', { class: 'hud-bottombar' });
    const g = game(), p = human();
    if (!g || !p) return wrap;
    wrap.appendChild(UI.button('', () => hudDefinition.nextUnit(), { icon: 'next_unit', kind: 'ghost', tooltip: t('hud.nextUnit') + ' (N)' }));
    wrap.appendChild(renderSpellbar(g, p));
    wrap.appendChild(renderMiniStatus(g, p));
    return wrap;
  }
  function renderSpellbar(g, p) {
    const knownIds = hasFn('Rules', 'knownSpells') ? safe(() => AOW.Rules.knownSpells(g, p), null) : (p.spells && p.spells.known || []);
    const known = (knownIds || []).map(id => AOW.Data && AOW.Data.has('spells', id) ? AOW.Data.get('spells', id) : null).filter(s => s && s.kind !== 'combat');
    const box = UI.panel({ cls: 'hud-spellbar aow-panel--compact aow-panel--hud', title: null, divider: false });
    if (!known.length) { box.setBody(el('div', { class: 'hud-empty-hint' }, t('ui.none'))); return box; }
    const row = el('div', { class: 'aow-row' });
    for (const sp of known) {
      const active = !!(cast && cast.spell.id === sp.id);
      row.appendChild(UI.button('', () => onSpellClick(sp), {
        icon: UI.iconName(sp.icon, sp.affinity && Object.keys(sp.affinity)[0], 'spellbook') || 'spellbook',
        cls: 'hud-spellbar__btn', kind: active ? 'gold' : 'default', active,
        tooltip: () => L(sp.name) + (sp.cost && sp.cost.mana ? ' — ' + sp.cost.mana + ' ' + t('ui.res_mana') : ''),
      }));
    }
    box.setBody(row);
    return box;
  }
  const RESEARCH_KIND_TO_DATA = { spell: 'spells', unit: 'units', improvement: 'improvements', skill: 'heroSkills', transformation: 'transformations', empire: 'empireSkills', building: 'buildings' };
  function researchContentName(cur) {
    const dataKind = RESEARCH_KIND_TO_DATA[cur.type];
    if (dataKind && AOW.Data && AOW.Data.has(dataKind, cur.contentId)) return L(AOW.Data.get(dataKind, cur.contentId).name);
    return String(cur.contentId);
  }
  function renderMiniStatus(g, p) {
    const box = UI.panel({ cls: 'hud-ministatus aow-panel--compact aow-panel--hud', title: null, divider: false });
    const rows = [];
    const cur = p.research && p.research.current;
    const curName = cur ? researchContentName(cur) : null;
    const cost = cur ? (cur.cost || (hasFn('Rules', 'researchCost') ? safe(() => AOW.Rules.researchCost(g, p, cur), null) : null)) : null;
    rows.push(el('div', { class: 'hud-ministatus__row', onclick: () => UI.showScreen('research') },
      UI.icon('research', 18),
      cur ? [el('span', { class: 'hud-ministatus__label' }, curName), UI.progressBar(p.research.progress || 0, cost || Math.max(1, (p.research.progress || 0) + 40), { height: 8 })]
        : el('span', { class: 'hud-ministatus__label aow-warn' }, t('hud.noResearchQueued'))));
    if (p.casting) rows.push(el('div', { class: 'hud-ministatus__row', onclick: () => UI.showScreen('spellbook') },
      UI.icon('casting', 18), el('span', { class: 'hud-ministatus__label' }, t('hud.casting')),
      UI.progressBar(p.casting.cp, Math.max(1, p.casting.cpMax), { height: 8, color: 'var(--c-casting)' })));
    box.setBody(rows);
    return box;
  }

  // ==================================================================== world-spell targeting
  function targetKindOf(spell) { return spell.target || 'hex'; }
  function computeCastTargets(g, p, spell) {
    const kind = targetKindOf(spell);
    const out = [];
    if (kind === 'city') { for (const c of g.cities) if (c.owner === p.id) out.push(c.hex); }
    else if (kind === 'army') { for (const a of g.armies) if (a.owner === p.id) out.push(a.hex); }
    else if (kind === 'province' || kind === 'hex') { for (let i = 0; i < g.W * g.H; i++) if (g.owner[i] === p.id) out.push(i); }
    return out;
  }
  function onSpellClick(spell) {
    const g = game(), p = human(); if (!g || !p) return;
    if (hasFn('Rules', 'canCast')) { const c = safe(() => AOW.Rules.canCast(g, p, spell.id, null), null); if (c && c.ok === false) { UI.toast('warn', c.text ? L(c.text) : AOW.t('rules.reason.' + c.reason)); return; } }
    if (spell.kind === 'empire' || spell.target === 'empire' || spell.target === 'player') {
      const r = hasFn('Rules', 'castSpell') ? safe(() => AOW.Rules.castSpell(g, p, spell.id, null), null) : null;
      if (r && r.ok === false) UI.toast('warn', r.text ? L(r.text) : t('ui.notAvailable'));
      else { sfx('spell_cast_' + (Object.keys(spell.affinity || {})[0] || 'astral')); UI.toast('good', t('hud.castDone', { name: L(spell.name) })); }
      refreshAll();
      return;
    }
    hudDefinition.enterCastMode(spell);
  }
  const hud = {
    enterCastMode(spell) {
      const g = game(), p = human(); if (!g || !p) return;
      cast = { spell };
      if (hasFn('WorldRender', 'highlight')) safe(() => AOW.WorldRender.highlight(computeCastTargets(g, p, spell), 'cast'));
      UI.toast('info', t('hud.castHint', { name: L(spell.name) }), { timeout: 3500 });
      refreshAll();
    },
    clearCastMode() {
      if (!cast) return;
      cast = null;
      if (hasFn('WorldRender', 'highlight')) safe(() => AOW.WorldRender.highlight([], 'cast'));
      refreshAll();
    },
    castMode: () => cast,
  };
  function resolveCastTarget(g, spell, idx) {
    const kind = targetKindOf(spell);
    if (kind === 'city') { const c = S().cityAt(g, idx); return c ? { cityId: c.id } : null; }
    if (kind === 'army') { const a = S().armiesAt(g, idx)[0]; return a ? { armyId: a.id } : null; }
    return { hex: idx };
  }
  function tryCastAt(idx) {
    const g = game(), p = human();
    if (!g || !p || !cast) return;
    const spell = cast.spell;
    const target = resolveCastTarget(g, spell, idx);
    if (!target) { UI.toast('warn', t('ui.notAvailable')); return; }
    const r = hasFn('Rules', 'castSpell') ? safe(() => AOW.Rules.castSpell(g, p, spell.id, target), null) : null;
    if (r && r.ok === false) { UI.toast('warn', r.text ? L(r.text) : t('ui.notAvailable')); return; }
    if (hasFn('WorldRender', 'playEffect')) safe(() => AOW.WorldRender.playEffect(spellVfxKind(spell), idx, {}));
    sfx('spell_cast_' + (Object.keys(spell.affinity || {})[0] || 'astral'));
    UI.toast('good', t('hud.castDone', { name: L(spell.name) }));
    hud.clearCastMode();
    UI.refresh();
  }
  function spellVfxKind(spell) {
    const aff = Object.keys(spell.affinity || {})[0];
    return { order: 'holy_light', chaos: 'fire_burst', nature: 'nature_bloom', materium: 'dust', astral: 'arcane_swirl', shadow: 'shadow_wisp' }[aff] || 'arcane_swirl';
  }

  // ==================================================================== movement / encounters
  function call(ns, fn, ...args) { return hasFn(ns, fn) ? safe(() => AOW[ns][fn](...args), null) : undefined; }
  function afterAction(result) {
    if (result && result.ok === false) UI.toast('warn', result.text ? L(result.text) : AOW.t('rules.reason.' + (result.reason || 'unavailable')));
    UI.refresh();
  }
  function clearPathPreview() { previewTarget = -1; if (hasFn('WorldRender', 'setPathPreview')) safe(() => AOW.WorldRender.setPathPreview(null)); }

  function attemptMove(army, idx) {
    const g = game();
    if (!hasFn('Rules', 'pathfind') || !hasFn('Rules', 'moveArmy')) { UI.toast('warn', t('hud.moveUnavailable')); return; }
    const pf = safe(() => AOW.Rules.pathfind(g, army, idx), null);
    if (!pf || !pf.path || !pf.path.length) return;
    const armyId = army.id;
    const result = safe(() => AOW.Rules.moveArmy(g, army, pf.path), null);
    clearPathPreview();
    if (!result) { UI.refresh(); return; }
    const finalId = result.armyId !== undefined && result.armyId !== null ? result.armyId : armyId;
    const moved = result.moved || [];
    const after = () => {
      if (UI.selected.armyId === armyId && finalId !== armyId) UI.select({ armyId: finalId });
      UI.refresh();
      if (result.encounter) { const a2 = S().army(g, finalId) || army; showEncounter(a2, result.encounter); }
    };
    if (hasFn('WorldRender', 'animateMove')) AOW.WorldRender.animateMove(finalId, moved, after);
    else after();
  }

  function showEncounter(army, enc) {
    const g = game();
    if (!enc || enc.kind === 'blocked') return;
    if (enc.kind === 'free_city') {
      const city = enc.cityId !== undefined && enc.cityId !== null ? S().city(g, enc.cityId) : null;
      if (city) UI.select({ cityId: city.id });
      return;
    }
    // enemy army / hostile city / wonder / infestation guard: Rules.attackTarget builds the full Combat.create descriptor
    const atk = hasFn('Rules', 'attackTarget') ? safe(() => AOW.Rules.attackTarget(g, army, enc.idx), null) : null;
    const canFight = atk && atk.ok !== false && hasFn('Combat', 'create');
    const theirArmyIds = (atk && atk.defenderArmyIds) || enc.armyIds || [];
    const ours = hasFn('Combat', 'threat') ? safe(() => AOW.Combat.threat(g, [army.id]), null) : null;
    const theirs = hasFn('Combat', 'threat') ? safe(() => AOW.Combat.threat(g, theirArmyIds), null) : null;
    const maxT = Math.max(1, ours || 0, theirs || 0);
    const body = el('div', { class: 'aow-col' },
      el('div', { class: 'aow-row aow-between' }, el('span', null, t('hud.encounter.ours')), el('b', null, UI.fmt(ours))),
      UI.progressBar(ours || 0, maxT, { color: 'var(--good)' }),
      el('div', { class: 'aow-row aow-between', style: { marginTop: '6px' } }, el('span', null, t('hud.encounter.theirs')), el('b', null, UI.fmt(theirs))),
      UI.progressBar(theirs || 0, maxT, { color: 'var(--danger)' }),
      atk && atk.ok === false ? el('div', { class: 'aow-bad', style: { marginTop: '6px' } }, atk.text ? L(atk.text) : AOW.t('rules.reason.' + atk.reason)) : null);
    UI.modal({
      title: t('hud.encounter.title'), icon: 'sword', width: 420, body,
      buttons: [
        { label: t('ui.cancel'), kind: 'ghost' },
        { label: t('hud.autoResolve'), onClick: () => {
          if (!canFight || !hasFn('Combat', 'autoResolve')) { UI.toast('warn', t('ui.notAvailable')); return; }
          const battle = safe(() => AOW.Combat.create(g, atk), null);
          const result = battle ? safe(() => AOW.Combat.autoResolve(g, battle), null) : null;
          if (!result) { UI.toast('warn', t('ui.notAvailable')); return; }
          UI.toast(result.winner === 0 ? 'good' : 'bad', result.winner === 0 ? t('hud.autoWin') : t('hud.autoLose'));
          UI.refresh();
        }, disabled: !canFight || !hasFn('Combat', 'autoResolve') },
        { label: t('hud.attack'), kind: 'danger', onClick: () => {
          if (!canFight) { UI.toast('warn', t('ui.notAvailable')); return; }
          const battle = safe(() => AOW.Combat.create(g, atk), null);
          if (battle && AOW.Events) AOW.Events.emit('battle:start', { battle });
          else UI.toast('warn', t('ui.notAvailable'));
        }, disabled: !canFight },
      ],
    });
  }

  // ==================================================================== map interaction
  function onHexClick(payload) {
    const g = game(), p = human();
    if (!g || !p) return;
    const idx = payload.idx;
    if (payload.button === 2) { hud.clearCastMode(); UI.select({ armyId: null, cityId: null }); clearPathPreview(); return; }
    if (idx < 0) return;
    if (cast) { tryCastAt(idx); return; }
    const army = selectedArmy();
    if (army && army.owner === p.id) {
      if (idx === army.hex) { UI.select({ armyId: null, cityId: null }); return; }
      if (idx === previewTarget) { attemptMove(army, idx); return; }
      if (hasFn('Rules', 'pathfind')) {
        const pf = safe(() => AOW.Rules.pathfind(g, army, idx), null);
        previewTarget = idx;
        if (hasFn('WorldRender', 'setPathPreview')) safe(() => AOW.WorldRender.setPathPreview(pf && pf.path ? pf : null));
        return;
      }
      // no pathfinding available yet: fall through to reselection below
    }
    const own = ownArmyAt(g, idx);
    if (own) { splitSel.clear(); UI.select({ armyId: own.id }); return; }
    const city = S().cityAt(g, idx);
    if (city && (city.owner === p.id || city.freeCity)) { UI.select({ cityId: city.id }); return; }
    UI.select({ armyId: null, cityId: null }); clearPathPreview();
  }
  function onHexDblClick(payload) {
    const army = selectedArmy();
    if (!army || army.owner !== (human() && human().id)) return;
    if (payload.idx < 0 || payload.idx === army.hex) return;
    attemptMove(army, payload.idx);
  }
  function hexTooltipHtml(idx) {
    const g = game(); if (!g) return '';
    const Sx = S();
    const terrainDef = Sx.terrainDef ? Sx.terrainDef(g, idx) : null;
    const featureDef = Sx.featureDef ? Sx.featureDef(g, idx) : null;
    const feat = Sx.featureName ? Sx.featureName(g, idx) : null;
    let h = '<div class="tip-title">' + esc(terrainDef ? L(terrainDef.name) : Sx.terrainName(g, idx)) + (feat && feat !== 'none' ? ' · ' + esc(featureDef ? L(featureDef.name) : feat) : '') + '</div>';
    const prov = Sx.provinceOf(g, idx);
    if (prov) {
      const owner = prov.owner >= 0 ? g.players[prov.owner] : null;
      h += '<div class="tip-sub">' + esc(owner ? owner.name : t('hud.unclaimed')) + '</div>';
      if (prov.resource) h += '<div class="tip-row">' + UI.icon(prov.resource, 14).outerHTML + esc(UI.resourceName(prov.resource)) + '</div>';
      if (prov.improvement && AOW.Data && AOW.Data.has('improvements', prov.improvement)) h += '<div class="tip-row">' + UI.icon('build', 14).outerHTML + esc(L(AOW.Data.get('improvements', prov.improvement).name)) + '</div>';
      const py = hasFn('Rules', 'provinceYields') ? safe(() => AOW.Rules.provinceYields(g, prov, null), null) : null;
      if (py) {
        const parts = Object.keys(py).filter(k => py[k]).map(k => UI.fmtSigned(Math.round(py[k])) + ' ' + UI.resourceName(k));
        if (parts.length) h += '<div class="tip-sep"></div><div class="tip-dim">' + parts.map(esc).join(' · ') + '</div>';
      }
    }
    const structure = Sx.structureAt ? Sx.structureAt(g, idx) : null;
    if (structure) {
      let name = null;
      if (structure.kind === 'city' || structure.kind === 'outpost' || structure.kind === 'free_city') { const c = Sx.city(g, structure.refId); if (c) name = c.name; }
      else if (structure.kind === 'wonder' && AOW.Data && AOW.Data.has('wonders', structure.refId)) name = L(AOW.Data.get('wonders', structure.refId).name);
      if (name) h += '<div class="tip-sep"></div><div class="tip-row">' + UI.icon('cities', 14).outerHTML + '<b>' + esc(name) + '</b></div>';
    }
    const armies = Sx.armiesAt(g, idx);
    if (armies.length) {
      h += '<div class="tip-sep"></div>';
      for (const a of armies.slice(0, 4)) {
        const owner = a.owner >= 0 ? g.players[a.owner] : null;
        h += '<div class="tip-row"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + (owner ? owner.color : '#8c8f96') + '"></span>' + esc(owner ? owner.name : t('ui.unknown')) + ' · ' + a.units.length + ' ' + esc(t('hud.units')) + '</div>';
      }
    }
    return h;
  }
  function onHexHover(payload) {
    clearTimeout(hoverTimer);
    const idx = payload.idx;
    if (idx < 0) { UI.hideTooltip(); hoverIdxShown = -1; return; }
    hoverTimer = setTimeout(() => {
      hoverIdxShown = idx;
      const g = game(); if (!g) return;
      const sp = hasFn('WorldRender', 'hexToScreen') ? safe(() => AOW.WorldRender.hexToScreen(idx), null) : null;
      if (!sp) return;
      UI.tooltipAt(sp.x, sp.y, () => (hoverIdxShown === idx ? hexTooltipHtml(idx) : ''));
    }, 400);
  }

  // ==================================================================== end turn
  function buildTurnOverlay() {
    const ov = el('div', { class: 'hud-turnoverlay' }, UI.icon('turn', 64, null), el('div', { class: 'hud-turnoverlay__text' }, t('hud.otherTurn')));
    ov.querySelector('.icon') && ov.querySelector('.icon').classList.add('hud-turnoverlay__icon');
    return ov;
  }
  function doEndTurn() {
    const g = game(); if (!g) return;
    if (!hasFn('Turn', 'endTurn')) { UI.toast('warn', t('hud.endTurnUnavailable')); return; }
    hud.clearCastMode(); clearPathPreview();
    sfx('end_turn');
    turnOverlayEl = buildTurnOverlay();
    root.appendChild(turnOverlayEl);
    setTimeout(() => {
      try { AOW.Turn.endTurn(g); } catch (e) { console.error('[hud] Turn.endTurn', e); }
      if (turnOverlayEl) { turnOverlayEl.remove(); turnOverlayEl = null; }
      splitSel.clear();
      sfx('turn_start');
      UI.refresh();
    }, 30);
  }
  function collectWarnings() {
    const g = game(), p = human(); if (!g || !p || !hasFn('Turn', 'readyToEnd')) return [];
    const r = safe(() => AOW.Turn.readyToEnd(g, p.id), null);
    if (!r || r.ok) return [];
    const out = [];
    for (const armyId of r.idle || []) out.push({ kind: 'army_mp', armyId });
    if (r.pendingBattles) out.push({ kind: 'pending_battles' });
    return out;
  }
  function endTurnClicked() {
    const warnings = collectWarnings();
    if (!warnings.length) { doEndTurn(); return; }
    const body = el('div', { class: 'aow-list' }, warnings.slice(0, 8).map(w => el('div', { class: 'aow-item-row', style: { cursor: 'pointer' }, onclick: () => { warnJump(w); m.close(); } },
      UI.icon('warning', 22), el('div', { class: 'aow-item-row__main' }, el('div', { class: 'aow-item-row__title' }, warnText(w))))));
    const m = UI.modal({
      title: t('hud.endTurnConfirmTitle'), icon: 'warning', width: 460, body,
      buttons: [{ label: t('ui.cancel'), kind: 'ghost' }, { label: t('hud.endTurnConfirm'), kind: 'gold', onClick: () => doEndTurn() }],
    });
  }
  function warnJump(w) {
    const g = game(); if (!g) return;
    const armyId = w.armyId !== undefined ? w.armyId : null, cityId = w.cityId !== undefined ? w.cityId : null;
    if (armyId !== null) { const a = S().army(g, armyId); if (a) { UI.select({ armyId: a.id }); if (hasFn('WorldRender', 'centerOn')) safe(() => AOW.WorldRender.centerOn(a.hex, true)); } }
    else if (cityId !== null) { const c = S().city(g, cityId); if (c) { UI.select({ cityId: c.id }); if (hasFn('WorldRender', 'centerOn')) safe(() => AOW.WorldRender.centerOn(c.hex, true)); } }
    else if (readyWarnKind(w) === 'no_research') UI.showScreen('research');
    else if (readyWarnKind(w) === 'pending_battles' && (g.pendingBattles || []).length && AOW.Events) AOW.Events.emit('battle:start', { battle: g.pendingBattles[0] });
  }
  function buildEndTurn() {
    const wrap = el('div', { class: 'hud-endturn-wrap' });
    const warnings = collectWarnings();
    const btn = UI.button(t('hud.endTurn'), () => endTurnClicked(), { icon: 'end_turn', kind: 'gold', large: true, cls: 'hud-endturn', badge: warnings.length ? String(warnings.length) : null });
    wrap.appendChild(btn);
    return wrap;
  }

  // ==================================================================== assembly / lifecycle
  let els = null;
  function build() {
    root = el('div', { class: 'hud-root' });
    els = { topbar: renderTopbar(), minimap: buildMinimap(), notif: renderNotifications(), selection: renderSelection(), bottom: renderBottomBar(), endturn: buildEndTurn() };
    root.appendChild(els.topbar); root.appendChild(els.minimap); root.appendChild(els.notif); root.appendChild(els.selection); root.appendChild(els.bottom); root.appendChild(els.endturn);
    drawMinimap(); mmAccum = 0;
    return root;
  }
  function refreshSelection() { if (!els) return; const fresh = renderSelection(); els.selection.replaceWith(fresh); els.selection = fresh; }
  function refreshAll() {
    if (!root) return;
    const fresh = { topbar: renderTopbar(), minimap: els.minimap, notif: renderNotifications(), selection: renderSelection(), bottom: renderBottomBar(), endturn: buildEndTurn() };
    els.topbar.replaceWith(fresh.topbar); els.topbar = fresh.topbar;
    els.notif.replaceWith(fresh.notif); els.notif = fresh.notif;
    els.selection.replaceWith(fresh.selection); els.selection = fresh.selection;
    els.bottom.replaceWith(fresh.bottom); els.bottom = fresh.bottom;
    els.endturn.replaceWith(fresh.endturn); els.endturn = fresh.endturn;
  }

  const hudDefinition = Object.assign(hud, {
    open() {
      UI.css(CSS);
      splitSel = new Set(); cast = null; previewTarget = -1;
      off.push(AOW.Events.on('hex:click', onHexClick));
      off.push(AOW.Events.on('hex:dblclick', onHexDblClick));
      off.push(AOW.Events.on('hex:hover', onHexHover));
      for (const name of ['turn:begin', 'city:changed', 'army:moved', 'research:complete', 'spell:cast', 'select:army', 'select:city', 'select:none', 'battle:end', 'game:new']) {
        off.push(AOW.Events.on(name, () => refreshAll()));
      }
      return build();
    },
    close() {
      while (off.length) { const f = off.pop(); try { f(); } catch (e) { /* ignore */ } }
      clearTimeout(hoverTimer);
      if (hasFn('WorldRender', 'highlight')) safe(() => AOW.WorldRender.highlight(null, 'none'));
      root = null; els = null; mmCanvas = null; mmCtx = null; turnOverlayEl = null;
    },
    refresh() { refreshAll(); },
    relang() { refreshAll(); },
    tick(dt) {
      mmAccum += dt;
      if (mmAccum >= 1) { mmAccum = 0; drawMinimap(); }
    },
    endTurn() { endTurnClicked(); return true; },
    nextUnit() {
      const g = game(), p = human(); if (!g || !p) return false;
      if (!hasFn('Turn', 'nextUnit')) return false;
      const res = safe(() => AOW.Turn.nextUnit(g, p.id, UI.selected.armyId), null);
      let armyId = null;
      if (res && typeof res === 'object') armyId = res.id !== undefined ? res.id : (res.armyId !== undefined ? res.armyId : null);
      else if (typeof res === 'number') armyId = res;
      if (armyId === null || armyId === undefined || armyId < 0) { UI.toast('info', t('hud.noMoreUnits'), { timeout: 2200 }); return true; }
      const army = S().army(g, armyId); if (!army) return false;
      splitSel.clear(); UI.select({ armyId });
      if (hasFn('WorldRender', 'centerOn')) safe(() => AOW.WorldRender.centerOn(army.hex, true));
      return true;
    },
    centerCapital() {
      const g = game(), p = human(); if (!g || !p) return false;
      const cap = S().capital(g, p.id);
      if (cap && hasFn('WorldRender', 'centerOn')) { safe(() => AOW.WorldRender.centerOn(cap.hex, true)); return true; }
      return false;
    },
    onEscape() {
      if (cast) { hud.clearCastMode(); return true; }
      if (UI.selected.armyId !== null || UI.selected.cityId !== null) { UI.select({ armyId: null, cityId: null }); clearPathPreview(); return true; }
      return false;
    },
    selectArmy(armyId) { splitSel.clear(); UI.select({ armyId }); },
    selectCity(cityId) { UI.select({ cityId }); },
    clearSelection() { UI.select({ armyId: null, cityId: null }); clearPathPreview(); },
    clearPathPreview,
  });

  UI.registerScreen('hud', hudDefinition);
})(window.AOW = window.AOW || {});
