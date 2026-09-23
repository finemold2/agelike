// src/ui/combat_ui.js — AOW.UI screen 'battle': tactical battle HUD (SPEC §10)
//
// Opens on Events 'battle:start' {battle} (and drains game.pendingBattles one at a time as each
// battle finishes). Unhides #battle, hides #world, calls CombatRender.init(canvas, battle, AOW.game),
// sets AOW.battle = battle; on close does the reverse and emits 'battle:end' {battle, result}.
//
// Depends on (all called defensively — `typeof fn === 'function'` — since src/game/combat.js may
// still be a stub while this is developed/tested):
//   AOW.Combat.create/actions/perform/aiStep/endSideTurn/currentSide/autoResolve/finish/previewAttack/reachable
//   AOW.CombatRender.init/setBattle/render/playEvents/setActiveUnit/setSelection/setTargetMode/
//     getTargetMode/getHoverInfo/focusUnit/destroy/speed/skipAnimations (all real, verified)
// Until Combat.js is real this screen still works against AOW.CombatRender.syntheticBattle +
// CR.scriptedEvents (see demo()/tests) — actions/perform/aiStep etc. simply no-op or fall back.
//
// AI-vs-AI battles (no unit belonging to the human player) are resolved silently via
// Combat.autoResolve and never shown.
(function (AOW) {
  'use strict';
  const UI = AOW.UI, Events = AOW.Events;
  const t = (k, p) => AOW.t(k, p);
  const L = (o, p) => AOW.L(o, p);
  const el = UI.el;
  const esc = UI.esc || (s => String(s == null ? '' : s));
  const has = (ns, fn) => !!(AOW[ns] && typeof AOW[ns][fn] === 'function');
  const hasFn = has;
  const safe = (fn, dflt) => { try { const r = fn(); return r === undefined ? dflt : r; } catch (e) { AOW.log && AOW.log('[combat_ui] safe', e); return dflt; } };
  const CR = () => AOW.CombatRender;

  // ------------------------------------------------------------------ i18n
  AOW.I18n.add({
    ko: {
      'battle.round': '{n}라운드', 'battle.you': '아군', 'battle.enemy': '적군', 'battle.sideN': '{n}번 진영',
      'battle.autoResolve': '자동 전투', 'battle.autoResolveTip': '전투를 자동으로 해결합니다', 'battle.autoResolveConfirm': '전투를 자동으로 해결할까요?\n직접 지휘할 수 없게 됩니다.',
      'battle.retreat': '후퇴', 'battle.retreatTip': '전장에서 후퇴합니다', 'battle.retreatLocked': '3라운드부터 후퇴할 수 있습니다',
      'battle.retreatConfirm': '후퇴하시겠습니까?\n부대가 전장을 이탈합니다.',
      'battle.speed1x': '속도 1×', 'battle.speed2x': '속도 2×', 'battle.speedInstant': '즉시', 'battle.animSpeedTip': '애니메이션 속도',
      'battle.defend': '방어', 'battle.wait': '대기', 'battle.endSideTurn': '진영 턴 종료',
      'battle.selectUnit': '유닛을 선택하세요', 'battle.notAvailable': '아직 사용할 수 없습니다', 'battle.actionFailed': '행동을 수행할 수 없습니다',
      'battle.victory': '승리!', 'battle.defeat': '패배', 'battle.draw': '전투 종료', 'battle.resultTitle': '전투 결과',
      'battle.losses': '피해: {n}', 'battle.xpGained': '경험치 +{n}', 'battle.cityCaptured': '{name} 점령', 'battle.noDetails': '세부 정보가 없습니다',
      'battle.cooldown': '재사용 대기시간', 'battle.onCooldown': '재사용 대기 중 ({n}턴)', 'battle.accuracy': '명중률', 'battle.hitPct': '명중 {n}%',
      'battle.flank': '측면', 'battle.rear': '후방', 'battle.miss': '빗나감', 'battle.block': '막음', 'battle.resisted': '저항함',
      'battle.rankUp': '진급!', 'battle.fleeing': '도주 중!', 'battle.breaking': '동요함!', 'battle.shaken': '흔들림', 'battle.rallied': '재정비',
      'battle.inspired': '사기 충천', 'battle.breach': '성벽 붕괴!', 'battle.notYourTurn': '지금은 행동할 수 없습니다', 'battle.spellCast': '{name} 시전',
    },
    en: {
      'battle.round': 'Round {n}', 'battle.you': 'Your forces', 'battle.enemy': 'Enemy', 'battle.sideN': 'Side {n}',
      'battle.autoResolve': 'Auto-resolve', 'battle.autoResolveTip': 'Resolve this battle automatically', 'battle.autoResolveConfirm': 'Auto-resolve this battle?\nYou will no longer command it directly.',
      'battle.retreat': 'Retreat', 'battle.retreatTip': 'Withdraw from the battlefield', 'battle.retreatLocked': 'Available from round 3',
      'battle.retreatConfirm': 'Retreat from battle?\nYour army will leave the field.',
      'battle.speed1x': 'Speed 1×', 'battle.speed2x': 'Speed 2×', 'battle.speedInstant': 'Instant', 'battle.animSpeedTip': 'Animation speed',
      'battle.defend': 'Defend', 'battle.wait': 'Wait', 'battle.endSideTurn': 'End army turn',
      'battle.selectUnit': 'Select a unit', 'battle.notAvailable': 'Not available yet', 'battle.actionFailed': "Couldn't perform that action",
      'battle.victory': 'Victory!', 'battle.defeat': 'Defeat', 'battle.draw': 'Battle over', 'battle.resultTitle': 'Battle results',
      'battle.losses': 'Losses: {n}', 'battle.xpGained': '+{n} XP', 'battle.cityCaptured': '{name} captured', 'battle.noDetails': 'No details available',
      'battle.cooldown': 'Cooldown', 'battle.onCooldown': 'On cooldown ({n} turns)', 'battle.accuracy': 'Accuracy', 'battle.hitPct': '{n}% hit',
      'battle.flank': 'flank', 'battle.rear': 'rear', 'battle.miss': 'Miss', 'battle.block': 'Block', 'battle.resisted': 'Resisted',
      'battle.rankUp': 'Rank up!', 'battle.fleeing': 'Fleeing!', 'battle.breaking': 'Breaking!', 'battle.shaken': 'Shaken', 'battle.rallied': 'Rallied',
      'battle.inspired': 'Inspired', 'battle.breach': 'Breach!', 'battle.notYourTurn': "It isn't your turn", 'battle.spellCast': 'Cast {name}',
    },
  });

  // ------------------------------------------------------------------ CSS
  UI.css(`
/* the screen wrapper (.aow-screen) centers .aow-screen__inner at its intrinsic size, which — since
   .battle-hud is the only child and is itself full-bleed — would otherwise collapse to 0x0; force
   both to fill the viewport and make the dim/full-screen backdrop transparent so the battle canvas
   (a sibling of #ui entirely outside this DOM tree) shows through. */
.aow-screen--battle.aow-screen--full { background: transparent; }
/* the full-bleed inner box would otherwise eat every click (.aow-screen--nodim > * turns pointer events on),
   leaving the battle canvas — a sibling of #ui — unreachable: only the HUD chrome inside takes input. */
.aow-screen--battle .aow-screen__inner { width: 100%; height: 100%; max-width: 100%; max-height: 100%; pointer-events: none; }
.battle-hud { width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; font: 13px var(--font-body); color: var(--text); }
.battle-topbar { pointer-events: auto; display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: linear-gradient(180deg, rgba(8,10,17,0.9), rgba(8,10,17,0.55) 75%, transparent); }
.battle-side { display: flex; align-items: center; gap: 7px; padding: 5px 12px; border-radius: 5px; background: rgba(10,12,20,0.55); border: 1px solid var(--border-soft); transition: box-shadow 0.2s; }
.battle-side--active { border-color: var(--side-color, var(--gold)); box-shadow: 0 0 0 1px var(--side-color, var(--gold)), 0 0 10px rgba(241,217,138,0.35); }
.battle-side__dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 6px currentColor; flex: 0 0 auto; }
.battle-side__name { font-family: var(--font-title); color: var(--text); font-size: 13px; }
.battle-side--1 { flex-direction: row-reverse; }
.battle-round { font-family: var(--font-title); color: var(--gold-light); font-size: 15px; text-align: center; min-width: 88px; text-shadow: 0 1px 0 #000; }
.battle-topbar__actions { margin-left: auto; display: flex; gap: 8px; }
.battle-bottom { pointer-events: none; display: flex; flex-direction: column; gap: 6px; align-items: center; padding: 0 14px 12px; }
.battle-strips { pointer-events: none; display: flex; justify-content: space-between; width: 100%; gap: 10px; }
.battle-strip { pointer-events: auto; display: flex; gap: 4px; padding: 6px; background: rgba(10,12,20,0.5); border: 1px solid var(--border-soft); border-radius: 6px; max-width: 44vw; flex-wrap: wrap; align-content: flex-start; }
.battle-strip--1 { justify-content: flex-end; }
.battle-spellbar { pointer-events: auto; display: flex; gap: 6px; flex-wrap: wrap; max-width: 900px; justify-content: center; }
.battle-spellbar[hidden] { display: none; }
.battle-spellbar .spell-row { width: 190px; padding: 5px 8px; }
.battle-spellbar .aow-item-row__desc { display: none; }
.battle-dock { pointer-events: auto; display: flex; align-items: center; gap: 16px; background: linear-gradient(0deg, rgba(8,10,17,0.94), rgba(8,10,17,0.6) 85%, transparent); padding: 10px 18px 4px; border-radius: 8px 8px 0 0; max-width: 96vw; }
.battle-unitcard { display: flex; gap: 10px; align-items: center; min-width: 230px; }
.battle-unitcard--empty { min-height: 60px; align-items: center; justify-content: center; padding: 0 20px; }
.battle-unitcard__portrait { width: 58px; height: 58px; border-radius: 6px; overflow: hidden; border: 2px solid var(--gold); box-shadow: 0 2px 6px rgba(0,0,0,0.6); flex: 0 0 auto; background: #222; }
.battle-unitcard__portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }
.battle-unitcard__info { min-width: 190px; }
.battle-ap { display: flex; gap: 3px; }
.battle-ap__pip { width: 10px; height: 10px; border-radius: 2px; background: rgba(0,0,0,0.5); border: 1px solid var(--border-soft); }
.battle-ap__pip--on { background: linear-gradient(#f1d98a, #b8862a); border-color: var(--gold-light); box-shadow: 0 0 4px rgba(241,217,138,0.6); }
.battle-actionbar { display: flex; flex-wrap: wrap; gap: 6px; max-width: 480px; align-items: center; }
.battle-actionbtn { position: relative; }
.battle-actionbtn .aow-badge { position: absolute; top: -6px; right: -6px; min-width: 16px; height: 16px; font-size: 10px; pointer-events: none; }
.battle-sep { width: 1px; align-self: stretch; background: var(--border-soft); margin: 0 2px; }
.battle-endturn { align-self: center; }
@media (max-width: 1100px) { .battle-dock { flex-wrap: wrap; justify-content: center; } .battle-strip { max-width: 96vw; } }
`);

  // ------------------------------------------------------------------ module state
  const S = {
    battle: null, canvas: null, active: null, armedAttackId: null, explicitMode: null,
    aiPlaying: false, lastResult: null, _ended: false, _closing: false,
    root: null, topbar: null, dock: null, spellbar: null, stripLeft: null, stripRight: null,
  };
  const SPEED_STATES = [
    { mult: 1, skip: false, key: 'battle.speed1x' },
    { mult: 2, skip: false, key: 'battle.speed2x' },
    { mult: 1, skip: true, key: 'battle.speedInstant' },
  ];
  let speedIdx = 0;

  // ------------------------------------------------------------------ small helpers
  function idOf(v) { return v && typeof v === 'object' ? v.id : v; }
  function unitById(battle, id) { return (battle && battle.units || []).find(u => u.id === id) || null; }
  function activeBattleUnit() { return S.active !== null ? unitById(S.battle, S.active) : null; }
  function battleUnitDef(bu) {
    const id = bu.typeId || bu.unitType || bu.type || (bu.stats && bu.stats.typeId);
    if (bu.def && typeof bu.def === 'object') return bu.def;
    if (id && typeof id === 'object') return id;
    if (id && AOW.Data && AOW.Data.has && AOW.Data.has('units', id)) return AOW.Data.get('units', id);
    return (bu.stats && bu.stats.def) || { id: id || 'unit', name: bu.name || id || 'Unit', tier: bu.tier || 1, role: bu.role || 'fighter', tags: bu.tags || [], look: bu.look || {}, hp: bu.maxHp || bu.hp, attacks: (bu.stats && bu.stats.attacks) || [] };
  }
  function battleUnitOwner(bu) {
    if (!bu) return null;
    if (bu.owner !== undefined && bu.owner !== null) return bu.owner;
    const g = AOW.game;
    if (g && bu.gameUnitId !== undefined && bu.gameUnitId !== null && AOW.State && AOW.State.unit) {
      const gu = safe(() => AOW.State.unit(g, bu.gameUnitId), null);
      if (gu) return gu.owner;
    }
    return null;
  }
  function humanPid() { const g = AOW.game; if (!g || !g.players) return 0; const p = g.players.find(p => p.isHuman); return p ? p.id : 0; }
  function battleHasHuman(battle) {
    const g = AOW.game; if (!g) return true;
    const hp = humanPid();
    return (battle.units || []).some(u => battleUnitOwner(u) === hp);
  }
  function sidePlayerId(battle, s) {
    const pids = battle.sidePlayers || battle.players || battle.sides;
    if (Array.isArray(pids) && pids[s] !== undefined) { const v = pids[s]; return typeof v === 'object' ? (v.owner !== undefined ? v.owner : v.id) : v; }
    const counts = {};
    for (const u of (battle.units || [])) if (u.side === s) { const o = battleUnitOwner(u); if (o !== null && o !== undefined) counts[o] = (counts[o] || 0) + 1; }
    let best = null, bv = -1;
    for (const k of Object.keys(counts)) if (counts[k] > bv) { bv = counts[k]; best = +k; }
    return best;
  }
  function humanSideOf(battle) {
    if (battle.viewerSide !== undefined) return battle.viewerSide;
    const hp = humanPid();
    const u = (battle.units || []).find(u => battleUnitOwner(u) === hp);
    if (u) return u.side;
    return sidePlayerId(battle, 0) === hp ? 0 : (sidePlayerId(battle, 1) === hp ? 1 : 0);
  }
  function sideColorFor(battle, s) {
    const g = AOW.game, pid = sidePlayerId(battle, s);
    if (g && pid !== null && pid !== undefined && g.players[pid]) return g.players[pid].color || (s === 0 ? '#3f7fe0' : '#d8402f');
    return s === 0 ? '#3f7fe0' : '#d8402f';
  }
  function sideName(battle, s) {
    const g = AOW.game, pid = sidePlayerId(battle, s);
    const p = g && pid !== null && pid !== undefined ? g.players[pid] : null;
    if (p) return p.name || (p.isHuman ? t('battle.you') : t('battle.enemy'));
    return t('battle.sideN', { n: s + 1 });
  }
  function currentSide() {
    if (!S.battle) return 0;
    if (has('Combat', 'currentSide')) { const v = safe(() => AOW.Combat.currentSide(S.battle), undefined); if (v !== undefined && v !== null) return v; }
    return S.battle.side || 0;
  }
  function isHumanTurn() { return !!S.battle && S.battle.winner == null && currentSide() === humanSideOf(S.battle); }
  function canAct(bu) { return !!bu && bu.hp > 0 && !bu.hasActed && isHumanTurn() && !S.aiPlaying && (bu.ap === undefined || bu.ap > 0) && battleUnitOwner(bu) === humanPid(); }
  function hexDist(c1, r1, c2, r2) { return AOW.Hex && AOW.Hex.dist ? AOW.Hex.dist(c1, r1, c2, r2) : Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2)); }
  function unitAttacksOf(bu) {
    if (bu.stats && Array.isArray(bu.stats.attacks) && bu.stats.attacks.length) return bu.stats.attacks;
    const g = AOW.game;
    if (g && bu.gameUnitId != null && has('Rules', 'unitStats')) {
      const gu = safe(() => AOW.State.unit(g, bu.gameUnitId), null);
      if (gu) { const s = safe(() => AOW.Rules.unitStats(g, gu), null); if (s && s.attacks && s.attacks.length) return s.attacks; }
    }
    const def = battleUnitDef(bu);
    return (def && def.attacks) || [];
  }
  function abilityIdsOf(bu) {
    const def = battleUnitDef(bu);
    const list = (bu.stats && bu.stats.abilities) || def.abilities || [];
    const seen = new Set();
    return list.filter(id => {
      if (!id || id === 'defend' || seen.has(id)) return false;
      seen.add(id);
      if (AOW.Data && AOW.Data.has && AOW.Data.has('abilities', id)) { const a = AOW.Data.get('abilities', id); if (a.kind && a.kind !== 'active' && a.kind !== 'attack') return false; }
      return true;
    });
  }
  function cooldownOf(bu, id) {
    if (bu.cooldowns && bu.cooldowns[id]) return bu.cooldowns[id];
    if (bu.abilityCooldowns && bu.abilityCooldowns[id]) return bu.abilityCooldowns[id];
    return 0;
  }
  function actionsFor(unitId) {
    if (!S.battle || !has('Combat', 'actions')) return [];
    return safe(() => AOW.Combat.actions(S.battle, unitId), []) || [];
  }
  function hexMatches(h, col, row) {
    if (h === null || h === undefined) return false;
    if (typeof h === 'number') { const W = S.battle.W || 20; return (h % W) === col && Math.floor(h / W) === row; }
    if (typeof h === 'object') {
      if (h.col !== undefined) return h.col === col && h.row === row;
      if (h.x !== undefined) return h.x === col && h.y === row;
    }
    return false;
  }
  function matchesTarget(target, col, row, clickedUnit) {
    if (target === null || target === undefined) return true; // whole-side / untargeted effects: any confirm click lands it
    if (clickedUnit && idOf(target) === clickedUnit.id) return true;
    if (target && typeof target === 'object' && target.col === col && target.row === row) return true;
    return false;
  }
  function pickAttack(bu, target) {
    const atks = unitAttacksOf(bu); if (!atks.length) return null;
    const dist = hexDist(bu.col, bu.row, target.col, target.row);
    return atks.find(a => (a.range || 1) >= dist) || atks[0];
  }

  // ------------------------------------------------------------------ unit portraits / mini cards
  function battleUnitPortraitUrl(bu, size) {
    const def = battleUnitDef(bu);
    const g = AOW.game;
    let gu = null;
    if (g && bu.gameUnitId != null && AOW.State && AOW.State.unit) gu = safe(() => AOW.State.unit(g, bu.gameUnitId), null);
    return safe(() => UI.portraitURL(def, gu || { owner: battleUnitOwner(bu), formId: null }, size), '');
  }
  function battleUnitTooltip(bu) {
    const def = battleUnitDef(bu);
    const name = bu.name || L(def.name, def.id || 'Unit');
    const maxHp = bu.maxHp || def.hp || 1;
    let h = '<div class="tip-title">' + esc(name) + '</div>';
    h += '<div class="tip-sub">' + esc((AOW.I18n.has('ui.role_' + def.role) ? t('ui.role_' + def.role) : def.role || '') + ' · ' + t('ui.tierN', { n: UI.roman(def.tier || 1) })) + '</div>';
    h += '<div class="tip-kv"><span>' + esc(t('ui.hp')) + '</span><span>' + UI.fmt(bu.hp) + ' / ' + UI.fmt(maxHp) + '</span>';
    h += '<span>AP</span><span>' + (bu.ap !== undefined ? bu.ap : '–') + ' / ' + (bu.apMax || 3) + '</span></div>';
    const sts = (bu.statuses || []).map(s => typeof s === 'string' ? s : s.id).filter(Boolean);
    if (sts.length) { h += '<div class="tip-sep"></div>'; for (const id of sts) h += '<div class="tip-row">' + UI.statusIcon(id, 14).outerHTML + esc(statusLabel(id)) + '</div>'; }
    return h;
  }
  function statusLabel(id) {
    try { if (AOW.Data && AOW.Data.has('statuses', id)) return L(AOW.Data.get('statuses', id).name, id); } catch (e) { /* optional */ }
    return String(id).replace(/_/g, ' ');
  }
  function battleUnitCard(bu, o) {
    o = o || {};
    const def = battleUnitDef(bu);
    const g = AOW.game;
    let gu = null;
    if (g && bu.gameUnitId != null && AOW.State && AOW.State.unit) gu = safe(() => AOW.State.unit(g, bu.gameUnitId), null);
    if (gu) {
      const merged = Object.assign({}, gu, { hp: bu.hp, maxHp: bu.maxHp || gu.maxHp, statuses: bu.statuses || gu.statuses, rank: gu.rank });
      const card = UI.unitCard(merged, Object.assign({}, o, { onClick: o.onClick ? () => o.onClick(bu) : null }));
      card.dataset.battleUnitId = bu.id;
      if (bu.hasActed) card.style.opacity = 0.55;
      return card;
    }
    const size = o.small ? 48 : 78;
    const tier = Math.max(1, Math.min(5, def.tier | 0 || 1));
    const cls = ['unit-card', 'unit-card--tier' + tier];
    if (o.small) cls.push('unit-card--small');
    if (o.selected) cls.push('unit-card--selected');
    if (bu.hero) cls.push('unit-card--hero');
    if (o.onClick) cls.push('unit-card--clickable');
    if (bu.hp <= 0) cls.push('unit-card--dead');
    const card = el('div', { class: cls.join(' '), style: bu.hasActed && bu.hp > 0 ? { opacity: 0.55 } : null, onclick: o.onClick ? () => o.onClick(bu) : null });
    const name = bu.name || L(def.name, def.id || 'Unit');
    card.appendChild(el('div', { class: 'unit-card__portrait' },
      el('div', { class: 'unit-card__frame' }),
      el('div', { class: 'unit-card__img' }, el('img', { src: battleUnitPortraitUrl(bu, size), alt: '', draggable: 'false' })),
      bu.hero ? UI.icon(UI.iconName('hero_star', 'star') || 'star', o.small ? 14 : 18) : null,
      el('span', { class: 'unit-card__tier' }, UI.roman(tier))));
    if (o.showName !== false) card.appendChild(el('div', { class: 'unit-card__name', title: name }, name));
    const maxHp = bu.maxHp || def.hp || 1, ratio = maxHp > 0 ? bu.hp / maxHp : 0;
    card.appendChild(UI.progressBar(bu.hp, maxHp, { cls: 'unit-card__hp', color: UI.hpColor(ratio), label: o.small ? false : Math.round(bu.hp) + '/' + Math.round(maxHp) }));
    const sts = (bu.statuses || []).map(s => typeof s === 'string' ? s : s.id).filter(Boolean);
    if (sts.length) card.appendChild(el('div', { class: 'unit-card__status' }, sts.slice(0, 6).map(id => UI.statusIcon(id, o.small ? 11 : 14))));
    UI.tooltip(card, () => battleUnitTooltip(bu));
    return card;
  }

  // ------------------------------------------------------------------ top bar
  function sideBanner(s) {
    const battle = S.battle;
    const units = (battle.units || []).filter(u => u.side === s);
    const alive = units.filter(u => u.hp > 0).length;
    const color = sideColorFor(battle, s);
    const active = currentSide() === s && battle.winner == null;
    return el('div', { class: 'battle-side battle-side--' + s + (active ? ' battle-side--active' : ''), style: { '--side-color': color } },
      el('span', { class: 'battle-side__dot', style: { background: color } }),
      el('span', { class: 'battle-side__name' }, sideName(battle, s)),
      el('span', { class: 'aow-dim aow-small aow-num' }, alive + '/' + units.length));
  }
  function speedLabel() { return t(SPEED_STATES[speedIdx].key); }
  function applySpeedState() { const st = SPEED_STATES[speedIdx]; if (CR()) { CR().speed = st.mult; CR().skipAnimations = st.skip; } }
  function onToggleSpeed() { speedIdx = (speedIdx + 1) % SPEED_STATES.length; applySpeedState(); renderTopBar(); }
  function renderTopBar() {
    if (!S.topbar || !S.battle) return;
    S.topbar.innerHTML = '';
    const battle = S.battle;
    S.topbar.appendChild(sideBanner(0));
    S.topbar.appendChild(el('div', { class: 'battle-round' }, t('battle.round', { n: battle.round || 1 })));
    S.topbar.appendChild(sideBanner(1));
    const actions = el('div', { class: 'battle-topbar__actions' });
    actions.appendChild(UI.button(t('battle.autoResolve'), onAutoResolve, {
      icon: UI.iconName('flag', 'sword') || 'sword', kind: 'gold', small: true,
      disabled: S.aiPlaying || battle.winner != null, tooltip: t('battle.autoResolveTip'),
    }));
    const retreatOk = canRetreatNow();
    actions.appendChild(UI.button(t('battle.retreat'), onRetreat, {
      icon: UI.iconName('retreat', 'flee', 'sword') || 'sword', kind: 'danger', small: true,
      disabled: !retreatOk, tooltip: (battle.round || 1) < (battle.retreatAllowedFromRound || 3) ? t('battle.retreatLocked') : t('battle.retreatTip'),
    }));
    actions.appendChild(UI.button(speedLabel(), onToggleSpeed, { icon: UI.iconName('speed', 'move') || null, small: true, tooltip: t('battle.animSpeedTip') }));
    S.topbar.appendChild(actions);
  }

  // ------------------------------------------------------------------ active unit card + action bar
  function activeUnitCardEl(bu) {
    if (!bu) return el('div', { class: 'battle-unitcard battle-unitcard--empty' }, el('span', { class: 'aow-dim aow-small' }, t('battle.selectUnit')));
    const def = battleUnitDef(bu);
    const name = bu.name || L(def.name, def.id || 'Unit');
    const maxHp = bu.maxHp || def.hp || 1;
    const apMax = bu.apMax || 3, ap = bu.ap !== undefined ? bu.ap : apMax;
    const pips = el('div', { class: 'battle-ap' });
    for (let i = 0; i < apMax; i++) pips.appendChild(el('span', { class: 'battle-ap__pip' + (i < ap ? ' battle-ap__pip--on' : '') }));
    const sts = (bu.statuses || []).map(s => typeof s === 'string' ? s : s.id).filter(Boolean);
    return el('div', { class: 'battle-unitcard' },
      el('div', { class: 'battle-unitcard__portrait' }, el('img', { src: battleUnitPortraitUrl(bu, 72), alt: '', draggable: 'false' })),
      el('div', { class: 'battle-unitcard__info aow-col aow-gap-s' },
        el('div', { class: 'aow-row aow-between' }, el('span', { class: 'aow-bold aow-ellipsis' }, name), pips),
        UI.progressBar(bu.hp, maxHp, { color: UI.hpColor(maxHp > 0 ? bu.hp / maxHp : 0), label: Math.round(bu.hp) + ' / ' + Math.round(maxHp) }),
        sts.length ? el('div', { class: 'aow-row aow-gap-s' }, sts.map(id => UI.statusIcon(id, 15))) : null));
  }
  function attackTooltip(bu, atk) {
    return function () {
      let live = null;
      if (has('Combat', 'previewAttack') && CR() && CR().getHoverInfo) {
        const hi = safe(() => CR().getHoverInfo(), null);
        if (hi && hi.unitId != null) {
          const hu = unitById(S.battle, hi.unitId);
          if (hu && battleUnitOwner(hu) !== battleUnitOwner(bu)) live = safe(() => AOW.Combat.previewAttack(S.battle, bu.id, hi.unitId, atk.id), null);
        }
      }
      const nm = atk.name ? L(atk.name) : (atk.id || '');
      let h = '<div class="tip-title">' + esc(nm) + '</div>';
      h += '<div class="tip-kv">';
      h += '<span>' + esc(t('ui.damage')) + '</span><span>' + UI.fmt(atk.damage) + (atk.repeat > 1 ? '×' + atk.repeat : '') + '</span>';
      h += '<span>' + esc(t('ui.range')) + '</span><span>' + UI.fmt(atk.range || 1) + '</span>';
      if (atk.accuracy != null) h += '<span>' + esc(t('battle.accuracy')) + '</span><span>' + UI.fmt(atk.accuracy) + '%</span>';
      h += '</div>';
      if (live) {
        const lo = live.min !== undefined ? live.min : live.minDamage, hi2 = live.max !== undefined ? live.max : live.maxDamage;
        const hitP = live.hit !== undefined ? live.hit : live.accuracy;
        h += '<div class="tip-sep"></div><div class="tip-row aow-gold">';
        if (lo !== undefined && hi2 !== undefined) h += Math.round(lo) + '–' + Math.round(hi2); else if (live.avg !== undefined || live.damage !== undefined) h += '~' + Math.round(live.avg !== undefined ? live.avg : live.damage);
        if (hitP !== undefined) h += '  ' + Math.round(hitP <= 1 ? hitP * 100 : hitP) + '%';
        if (live.kill || live.lethal) h += ' ☠';
        h += '</div>';
      }
      return h;
    };
  }
  function abilityTooltip(def, cd) {
    let h = '<div class="tip-title">' + esc(L(def.name, def.id)) + '</div>';
    if (def.desc) h += '<div class="tip-desc">' + esc(L(def.desc)) + '</div>';
    h += '<div class="tip-kv"><span>' + esc(t('ui.cost')) + '</span><span>' + (def.ap || 1) + ' AP</span>';
    if (def.range > 1) h += '<span>' + esc(t('ui.range')) + '</span><span>' + def.range + '</span>';
    if (def.cooldown) h += '<span>' + esc(t('battle.cooldown')) + '</span><span>' + def.cooldown + '</span>';
    h += '</div>';
    if (cd > 0) h += '<div class="tip-bad">' + esc(t('battle.onCooldown', { n: cd })) + '</div>';
    return h;
  }
  function attackButton(bu, atk) {
    const armed = S.explicitMode && S.explicitMode.kind === 'attack' && S.explicitMode.attackId === atk.id;
    const iconName = UI.iconName(atk.channel && atk.channel !== 'physical' ? atk.channel : (atk.type === 'ranged' ? 'shoot' : 'strike'), 'sword');
    return UI.button('', () => armAttack(bu, atk), { icon: iconName || 'sword', small: true, active: armed, disabled: !canAct(bu), tooltip: attackTooltip(bu, atk), cls: 'battle-actionbtn' });
  }
  function abilityButton(bu, abilId) {
    const def = (AOW.Data && AOW.Data.has && AOW.Data.has('abilities', abilId)) ? AOW.Data.get('abilities', abilId) : { id: abilId, name: abilId, ap: 1, range: 1, target: 'enemy' };
    const cd = cooldownOf(bu, abilId);
    const armed = S.explicitMode && S.explicitMode.kind === 'ability' && S.explicitMode.abilityId === abilId;
    const btn = UI.button('', () => armAbility(bu, def), { icon: UI.iconName(def.icon, 'star') || 'star', small: true, active: armed, disabled: !canAct(bu) || cd > 0, tooltip: abilityTooltip(def, cd), cls: 'battle-actionbtn' });
    if (cd > 0) btn.appendChild(el('span', { class: 'aow-badge' }, cd));
    return btn;
  }
  function renderDock() {
    if (!S.dock || !S.battle) return;
    S.dock.innerHTML = '';
    const bu = activeBattleUnit();
    S.dock.appendChild(activeUnitCardEl(bu));
    S.dock.appendChild(el('div', { class: 'battle-sep' }));
    const bar = el('div', { class: 'battle-actionbar' });
    if (bu) {
      for (const atk of unitAttacksOf(bu)) bar.appendChild(attackButton(bu, atk));
      for (const abilId of abilityIdsOf(bu)) bar.appendChild(abilityButton(bu, abilId));
      bar.appendChild(UI.button(t('battle.defend'), () => doSimpleAction('defend'), { icon: UI.iconName('defend', 'shield') || 'shield', small: true, disabled: !canAct(bu), cls: 'battle-actionbtn' }));
      bar.appendChild(UI.button(t('battle.wait'), () => doSimpleAction('wait'), { icon: UI.iconName('wait', 'move') || null, small: true, disabled: !canAct(bu), cls: 'battle-actionbtn' }));
    }
    S.dock.appendChild(bar);
    S.dock.appendChild(el('div', { class: 'battle-sep' }));
    S.dock.appendChild(UI.button(t('battle.endSideTurn'), onEndSideTurn, { icon: UI.iconName('endturn', 'flag') || null, kind: 'primary', cls: 'battle-endturn', disabled: !isHumanTurn() || S.aiPlaying || S.battle.winner != null }));
  }

  // ------------------------------------------------------------------ spell bar
  function renderSpellbar() {
    if (!S.spellbar || !S.battle) return;
    S.spellbar.innerHTML = '';
    const g = AOW.game, pid = humanPid();
    const p = g && g.players ? g.players[pid] : null;
    const known = (p && p.spells && p.spells.known) || [];
    const spells = known.map(id => (AOW.Data && AOW.Data.has && AOW.Data.has('spells', id)) ? AOW.Data.get('spells', id) : null).filter(sp => sp && sp.kind === 'combat');
    if (!spells.length) { S.spellbar.hidden = true; return; }
    S.spellbar.hidden = false;
    const bu = activeBattleUnit();
    const cp = (S.battle.cp && S.battle.cp[humanSideOf(S.battle)]) || 0;
    for (const sp of spells) {
      const cost = sp.cost || {};
      let disabled = !bu || !canAct(bu), reason = !bu ? t('battle.selectUnit') : null;
      if (!disabled && cost.cp && cost.cp > cp) { disabled = true; reason = t('ui.notAvailable'); }
      if (!disabled && cost.mana && p && cost.mana > p.resources.mana) { disabled = true; reason = t('ui.notEnoughMana'); }
      const armed = S.explicitMode && S.explicitMode.kind === 'spell' && S.explicitMode.spellId === sp.id;
      const row = UI.spellRow(sp.id, { compact: true, disabled, reason, selected: armed, onCast: () => armSpell(bu, sp) });
      S.spellbar.appendChild(row);
    }
  }

  // ------------------------------------------------------------------ unit strips
  function renderStrips() {
    if (!S.stripLeft || !S.stripRight || !S.battle) return;
    S.stripLeft.innerHTML = ''; S.stripRight.innerHTML = '';
    for (const bu of (S.battle.units || [])) {
      const card = battleUnitCard(bu, { small: true, selected: S.active === bu.id, onClick: onUnitStripClick });
      (bu.side === 0 ? S.stripLeft : S.stripRight).appendChild(card);
    }
  }
  function onUnitStripClick(bu) {
    if (CR() && CR().focusUnit) safe(() => CR().focusUnit(bu.id, true));
    if (bu.hp > 0 && battleUnitOwner(bu) === humanPid() && isHumanTurn() && !bu.hasActed) selectUnit(bu.id);
    else if (CR()) safe(() => CR().setSelection(bu.id));
  }

  // ------------------------------------------------------------------ selection / target modes
  function selectUnit(id) {
    const bu = unitById(S.battle, id); if (!bu) return;
    S.active = id; S.armedAttackId = null; S.explicitMode = null;
    if (CR()) { safe(() => CR().setSelection(id)); safe(() => CR().setActiveUnit(id)); safe(() => CR().setTargetMode('move', { unitId: id })); }
    renderDock(); renderSpellbar(); renderStrips();
  }
  function clearSelection() {
    S.active = null; S.armedAttackId = null; S.explicitMode = null;
    if (CR()) { safe(() => CR().setSelection(null)); safe(() => CR().setActiveUnit(null)); safe(() => CR().setTargetMode(null)); }
    renderDock(); renderSpellbar(); renderStrips();
  }
  function armAttack(bu, atk) {
    if (!canAct(bu)) return;
    S.armedAttackId = atk.id; S.explicitMode = { kind: 'attack', attackId: atk.id, range: atk.range || 1 };
    if (CR()) safe(() => CR().setTargetMode('attack', { unitId: bu.id, attackId: atk.id, range: atk.range || 1, affinity: 'chaos' }));
    renderDock();
  }
  function armAbility(bu, def) {
    if (!canAct(bu)) return;
    if (def.target === 'self') { doSimpleAction('ability', { abilityId: def.id }); return; }
    S.explicitMode = { kind: 'ability', abilityId: def.id, range: def.range || 1, area: def.area || 0 };
    if (CR()) safe(() => CR().setTargetMode('ability', { unitId: bu.id, abilityId: def.id, range: def.range || 1, area: def.area || 0, affinity: 'astral' }));
    renderDock();
  }
  function armSpell(bu, sp) {
    if (!bu || !canAct(bu)) return;
    const range = sp.range || (sp.effect && sp.effect.range) || 6, area = sp.area || (sp.effect && sp.effect.area) || 0;
    S.explicitMode = { kind: 'spell', spellId: sp.id, range, area };
    if (CR()) safe(() => CR().setTargetMode('spell', { unitId: bu.id, spellId: sp.id, range, area, affinity: UI.mainAffinity(sp.affinity) || 'astral' }));
    renderDock(); renderSpellbar();
  }

  // ------------------------------------------------------------------ hover → live attack/move toggling
  function onBattleHover(p) {
    if (!S.battle || S.active === null || S.explicitMode || !isHumanTurn() || S.aiPlaying) return;
    const bu = activeBattleUnit(); if (!bu) return;
    const hovered = p && p.unitId != null ? unitById(S.battle, p.unitId) : null;
    if (hovered && hovered.id !== bu.id && hovered.hp > 0 && battleUnitOwner(hovered) !== battleUnitOwner(bu)) {
      const atk = pickAttack(bu, hovered);
      if (atk && CR()) { safe(() => CR().setTargetMode('attack', { unitId: bu.id, attackId: atk.id, range: atk.range || 1, affinity: 'chaos' })); return; }
    }
    if (CR()) safe(() => CR().setTargetMode('move', { unitId: bu.id }));
  }

  // ------------------------------------------------------------------ click → act
  function onBattleClick(p) {
    if (!S.battle || !p) return;
    if (p.button !== undefined && p.button !== 0) {
      if (S.explicitMode) { S.explicitMode = null; S.armedAttackId = null; if (S.active !== null && CR()) safe(() => CR().setTargetMode('move', { unitId: S.active })); renderDock(); }
      return;
    }
    if (S.battle.winner != null) return;
    const clickedUnit = p.unitId != null ? unitById(S.battle, p.unitId) : null;
    if (!isHumanTurn() || S.aiPlaying) { if (clickedUnit && CR()) safe(() => CR().setSelection(clickedUnit.id)); return; }

    if (S.explicitMode && (S.explicitMode.kind === 'ability' || S.explicitMode.kind === 'spell')) {
      confirmExplicitTarget(p.col, p.row, clickedUnit);
      return;
    }
    if (clickedUnit && clickedUnit.hp > 0 && battleUnitOwner(clickedUnit) === humanPid()) {
      selectUnit(clickedUnit.id);
      return;
    }
    if (S.active !== null) {
      const bu = activeBattleUnit(); if (!bu) return;
      if (clickedUnit && clickedUnit.hp > 0) {
        const cm = CR() && CR().getTargetMode ? safe(() => CR().getTargetMode(), null) : null;
        if (cm && cm.mode === 'attack') tryAttack(bu, clickedUnit, cm.data && cm.data.attackId);
        return;
      }
      // no unit under the cursor: a wall/gate while an attack is armed, otherwise a move
      const cm2 = CR() && CR().getTargetMode ? safe(() => CR().getTargetMode(), null) : null;
      if (cm2 && cm2.mode === 'attack') {
        const hi = CR() && CR().getHoverInfo ? safe(() => CR().getHoverInfo(), null) : null;
        if (hi && hi.hex && hi.hex.wall && hi.hex.wall.hp > 0) { tryAttackWall(bu, p.col, p.row, cm2.data && cm2.data.attackId); return; }
      }
      tryMove(bu, p.col, p.row);
    }
  }
  function tryMove(bu, col, row) {
    const list = actionsFor(bu.id);
    let action = list.find(a => a.type === 'move' && hexMatches(a.hex, col, row));
    if (!action) action = { type: 'move', unitId: bu.id, hex: { col, row } };
    performAction(bu, action);
  }
  function tryAttack(bu, target, attackId) {
    const list = actionsFor(bu.id);
    let action = list.find(a => a.type === 'attack' && idOf(a.target) === target.id && (!attackId || a.attackId === attackId));
    if (!action) { const atk = attackId ? { id: attackId } : pickAttack(bu, target); action = { type: 'attack', unitId: bu.id, attackId: atk && atk.id, target: target.id }; }
    performAction(bu, action);
  }
  function tryAttackWall(bu, col, row, attackId) {
    const list = actionsFor(bu.id);
    let action = list.find(a => a.type === 'attack' && a.wall && a.wall.col === col && a.wall.row === row && (!attackId || a.attackId === attackId));
    if (!action) { const atk = attackId ? { id: attackId } : (unitAttacksOf(bu)[0] || {}); action = { type: 'attack', unitId: bu.id, attackId: atk.id, target: null, wall: { col, row }, hex: { col, row } }; }
    performAction(bu, action);
  }
  function confirmExplicitTarget(col, row, clickedUnit) {
    const bu = activeBattleUnit(); if (!bu) return;
    const mode = S.explicitMode, list = actionsFor(bu.id);
    let action = null;
    const targetVal = clickedUnit ? clickedUnit.id : null;
    const hexVal = { col, row };
    if (mode.kind === 'ability') {
      action = list.find(a => a.type === 'ability' && a.abilityId === mode.abilityId && matchesTarget(a.target, col, row, clickedUnit));
      if (!action) action = { type: 'ability', unitId: bu.id, abilityId: mode.abilityId, target: targetVal, hex: hexVal };
    } else if (mode.kind === 'spell') {
      action = list.find(a => (a.type === 'cast' || a.type === 'spell') && a.spellId === mode.spellId && matchesTarget(a.target, col, row, clickedUnit));
      if (!action) action = { type: 'cast', unitId: bu.id, casterId: bu.id, side: bu.side, spellId: mode.spellId, target: targetVal, hex: hexVal };
    }
    if (action) performAction(bu, action);
  }
  function doSimpleAction(kind, extra) {
    const bu = activeBattleUnit(); if (!bu || !canAct(bu)) return;
    const list = actionsFor(bu.id);
    let action = list.find(a => a.type === kind && (!extra || !extra.abilityId || a.abilityId === extra.abilityId));
    if (!action) action = Object.assign({ type: kind, unitId: bu.id }, extra || {});
    performAction(bu, action);
  }
  function performAction(bu, action) {
    if (!has('Combat', 'perform')) { UI.toast('warn', t('battle.notAvailable')); return; }
    let events = null;
    try { events = AOW.Combat.perform(S.battle, action); }
    catch (e) { console.error('[combat_ui] Combat.perform', e); UI.toast('bad', t('battle.actionFailed')); return; }
    events = Array.isArray(events) ? events : (events ? [events] : []);
    S.armedAttackId = null; S.explicitMode = null;
    const unitId = bu.id;
    if (CR() && CR().playEvents) CR().playEvents(events, () => afterAction(unitId));
    else afterAction(unitId);
  }
  function afterAction(unitId) {
    if (!S.battle) return;
    if (S.battle.winner != null) { endBattleFlow(); return; }
    const fresh = unitById(S.battle, unitId);
    if (fresh && fresh.hp > 0 && !fresh.hasActed && (fresh.ap === undefined || fresh.ap > 0) && battleUnitOwner(fresh) === humanPid()) {
      S.active = fresh.id;
      if (CR()) { safe(() => CR().setActiveUnit(fresh.id)); safe(() => CR().setTargetMode('move', { unitId: fresh.id })); }
    } else {
      S.active = null;
      if (CR()) { safe(() => CR().setActiveUnit(null)); safe(() => CR().setTargetMode(null)); }
    }
    renderAll();
    // Combat.perform ends the side turn on its own once the last of our units has activated (endUnitTurn →
    // endSideTurn), so the initiative can flip without us pressing 진영 턴 종료. Start the AI loop in that
    // case or the battle sits there with every control disabled.
    if (S.battle.winner == null && !isHumanTurn() && !S.aiPlaying) { S.aiPlaying = true; renderAll(); runAiLoop(); }
  }

  // ------------------------------------------------------------------ side turn / AI loop
  // Combat.aiStep is side-agnostic: it acts for whichever side `battle.side` currently is, and once
  // that side runs out of actors it calls Combat.endSideTurn ITSELF and returns the resulting
  // transition events (never a clean null just because "the AI is done" — only once battle.winner is
  // actually set). So the human/AI boundary has to be enforced by us: end the human side once
  // (Combat.endSideTurn), then loop Combat.aiStep only for as long as it is NOT the human's turn —
  // checked *before* each call — and stop as soon as it flips back (aiStep's own endSideTurn already
  // handed the turn back; we must not call endSideTurn a second time or advance past the human).
  function onEndSideTurn() {
    if (!S.battle || !isHumanTurn() || S.aiPlaying) return;
    clearSelection();
    let events = [];
    if (has('Combat', 'endSideTurn')) { try { events = AOW.Combat.endSideTurn(S.battle) || []; } catch (e) { console.error('[combat_ui] endSideTurn', e); } }
    events = Array.isArray(events) ? events : [events];
    const after = () => {
      renderAll();
      if (!S.battle) return;
      if (S.battle.winner != null) { endBattleFlow(); return; }
      if (!isHumanTurn()) { S.aiPlaying = true; renderAll(); runAiLoop(); }
    };
    if (CR() && CR().playEvents) CR().playEvents(events, after); else after();
  }
  function runAiLoop() {
    const battle = S.battle;
    if (!battle || battle.winner != null) { S.aiPlaying = false; if (battle && battle.winner != null) endBattleFlow(); return; }
    if (isHumanTurn()) { S.aiPlaying = false; S.aiSteps = 0; renderAll(); return; }
    let events = null;
    try { events = has('Combat', 'aiStep') ? AOW.Combat.aiStep(battle) : (has('Combat', 'aiTakeTurn') ? AOW.Combat.aiTakeTurn(battle) : null); }
    catch (e) { console.error('[combat_ui] aiStep', e); events = null; }
    if (!events || (Array.isArray(events) && !events.length)) {
      // aiStep returns null/empty only once the battle has actually ended (or there's truly nothing left).
      // Belt and braces: while the battle is still live and it is still not our turn, keep stepping (bounded)
      // rather than freezing the screen with a disabled end-turn button.
      S.aiSteps = (S.aiSteps || 0) + 1;
      if (battle.winner == null && !isHumanTurn() && S.aiSteps < 400) { runAiLoop(); return; }
      S.aiPlaying = false; S.aiSteps = 0;
      if (battle.winner != null) endBattleFlow(); else renderAll();
      return;
    }
    S.aiSteps = 0;
    events = Array.isArray(events) ? events : [events];
    if (CR() && CR().playEvents) {
      CR().playEvents(events, () => {
        renderTopBar(); renderStrips();
        if (battle.winner != null) { S.aiPlaying = false; endBattleFlow(); return; }
        runAiLoop();
      });
    } else { runAiLoop(); }
  }

  // ------------------------------------------------------------------ auto-resolve / retreat / result
  function onAutoResolve() {
    if (!S.battle || S.aiPlaying || S.battle.winner != null) return;
    UI.confirm(t('battle.autoResolveConfirm'), () => {
      if (!has('Combat', 'autoResolve')) { UI.toast('warn', t('battle.notAvailable')); return; }
      let result = null;
      try { result = AOW.Combat.autoResolve(AOW.game, S.battle); } catch (e) { console.error('[combat_ui] autoResolve', e); UI.toast('bad', t('battle.actionFailed')); return; }
      showResultModal(result);
    });
  }
  function canRetreatNow() {
    if (!S.battle || S.aiPlaying || !isHumanTurn()) return false;
    const side = humanSideOf(S.battle);
    if (has('Combat', 'canRetreat')) return !!safe(() => AOW.Combat.canRetreat(S.battle, side), false);
    return (S.battle.round || 1) >= (S.battle.retreatAllowedFromRound || 3);
  }
  function onRetreat() {
    if (!canRetreatNow()) return;
    UI.confirm(t('battle.retreatConfirm'), () => {
      const side = humanSideOf(S.battle);
      // Combat.retreat(battle, side) → [events] (a whole-side withdrawal); the actual result with
      // losses/xp/capture comes from Combat.finish once battle.winner is set, same as any other action.
      let events = null;
      if (has('Combat', 'retreat')) { try { events = AOW.Combat.retreat(S.battle, side); } catch (e) { console.error('[combat_ui] retreat', e); } }
      if (!events) { UI.toast('warn', t('battle.notAvailable')); return; }
      events = Array.isArray(events) ? events : [events];
      clearSelection();
      const after = () => { if (S.battle && S.battle.winner != null) endBattleFlow(); else renderAll(); };
      if (CR() && CR().playEvents) CR().playEvents(events, after); else after();
    }, { danger: true });
  }
  function endBattleFlow() {
    if (S._ended) return; S._ended = true;
    let result = null;
    try { if (has('Combat', 'finish')) result = AOW.Combat.finish(AOW.game, S.battle); } catch (e) { console.error('[combat_ui] finish', e); }
    showResultModal(result);
  }
  function showResultModal(result) {
    const battle = S.battle; if (!battle) return;
    S.lastResult = result;
    const hSide = humanSideOf(battle);
    const winner = result && result.winner !== undefined ? result.winner : battle.winner;
    const draw = winner === null || winner === undefined || winner === -1;
    const won = !draw && winner === hSide;
    const title = draw ? t('battle.draw') : (won ? t('battle.victory') : t('battle.defeat'));
    const body = el('div', { class: 'aow-col aow-gap-s' },
      el('div', { class: draw ? 'aow-dim' : (won ? 'aow-good' : 'aow-bad'), style: { fontFamily: 'var(--font-title)', fontSize: '20px' } }, title));
    if (result) {
      const losses = result.losses || {};
      for (const s of [0, 1]) {
        const arr = losses[s] !== undefined ? losses[s] : losses['side' + s];
        if (arr !== undefined) body.appendChild(el('div', { class: 'aow-small' }, sideName(battle, s) + ' — ' + t('battle.losses', { n: Array.isArray(arr) ? arr.length : arr })));
      }
      // Combat.finish()'s result.xp is [xp0, xp1] (per side); show the human side's share
      const xpMine = Array.isArray(result.xp) ? result.xp[hSide] : (typeof result.xp === 'number' ? result.xp : null);
      if (xpMine) body.appendChild(el('div', { class: 'aow-small aow-gold' }, t('battle.xpGained', { n: UI.fmt(xpMine) })));
      if (result.loot && typeof result.loot === 'object') {
        const row = el('div', { class: 'aow-row aow-wrap aow-gap-s' });
        for (const k of Object.keys(result.loot)) if (typeof result.loot[k] === 'number' && result.loot[k]) row.appendChild(UI.resource(k, result.loot[k]));
        if (row.children.length) body.appendChild(row);
      }
      const cityId = result.capturedCityId !== undefined ? result.capturedCityId : null;
      const cityName = cityId != null && AOW.game && AOW.State && AOW.State.city
        ? safe(() => { const c = AOW.State.city(AOW.game, cityId); return c ? L(c.name) : null; }, null)
        : null;
      if (cityName || result.capturedCity) body.appendChild(el('div', { class: 'aow-gold aow-small' }, t('battle.cityCaptured', { name: cityName || (typeof result.capturedCity === 'string' ? result.capturedCity : L(result.capturedCity.name || result.capturedCity)) })));
    } else {
      body.appendChild(el('div', { class: 'aow-dim aow-small' }, t('battle.noDetails')));
    }
    // closable so Esc/backdrop/× still dismiss it, but any dismissal path must also close the battle screen
    UI.modal({ title: t('battle.resultTitle'), icon: won ? 'star' : (draw ? 'info' : 'skull'), width: 440, closable: true, body, buttons: [{ label: t('ui.ok'), kind: 'gold', onClick: () => closeBattle() }], onClose: () => closeBattle() });
  }

  // ------------------------------------------------------------------ lifecycle
  let offClick = null, offHover = null;
  function bindEvents() { offClick = Events.on('battle:click', onBattleClick); offHover = Events.on('battle:hover', onBattleHover); }
  function unbindEvents() { if (offClick) offClick(); if (offHover) offHover(); offClick = offHover = null; }
  function buildDom() {
    const root = el('div', { class: 'battle-hud' });
    S.topbar = el('div', { class: 'battle-topbar' });
    const spacer = el('div', { style: { flex: '1 1 auto' } });
    S.stripLeft = el('div', { class: 'battle-strip battle-strip--0' });
    S.stripRight = el('div', { class: 'battle-strip battle-strip--1' });
    const strips = el('div', { class: 'battle-strips' }, S.stripLeft, S.stripRight);
    S.spellbar = el('div', { class: 'battle-spellbar' });
    S.dock = el('div', { class: 'battle-dock' });
    const bottom = el('div', { class: 'battle-bottom' }, strips, S.spellbar, S.dock);
    root.appendChild(S.topbar); root.appendChild(spacer); root.appendChild(bottom);
    S.root = root;
  }
  function renderAll() { renderTopBar(); renderStrips(); renderSpellbar(); renderDock(); }
  function beginBattleUI(battle) {
    S.battle = battle; S.active = null; S.armedAttackId = null; S.explicitMode = null;
    S.aiPlaying = false; S._ended = false; S._closing = false; S.lastResult = null;
    const worldCv = document.getElementById('world'); if (worldCv) worldCv.hidden = true;
    const cv = document.getElementById('battle'); S.canvas = cv;
    if (cv) cv.hidden = false;
    // 'hud' lives in its own persistent #hud-layer and normally stays visible behind every screen
    // (SPEC §10) — but the battle scene is a different canvas entirely, so hide the world HUD chrome
    // (resource bar, minimap, army panel, spell quick-bar) while it's up and restore it on close.
    if (UI.layers && UI.layers.hud) UI.layers.hud.style.display = 'none';
    AOW.battle = battle;
    if (cv && has('CombatRender', 'init')) safe(() => AOW.CombatRender.init(cv, battle, AOW.game));
    applySpeedState();
    if (hasFn('Music', 'setMood')) safe(() => AOW.Music.setMood('battle'));
    buildDom();
    bindEvents();
    renderAll();
    if (battle.winner != null) setTimeout(() => endBattleFlow(), 30);
  }
  function teardownBattleUI() {
    unbindEvents();
    const cv = document.getElementById('battle'); if (cv) cv.hidden = true;
    const worldCv = document.getElementById('world'); if (worldCv) worldCv.hidden = false;
    if (UI.layers && UI.layers.hud) UI.layers.hud.style.display = '';
    if (has('CombatRender', 'destroy')) safe(() => AOW.CombatRender.destroy());
    AOW.battle = null;
    S.root = null; S.topbar = null; S.dock = null; S.spellbar = null; S.stripLeft = null; S.stripRight = null; S.canvas = null;
  }
  function closeBattle() {
    if (S._closing || !S.battle) return; S._closing = true;
    const battle = S.battle, result = S.lastResult;
    UI.closeScreen('battle');
    if (hasFn('Music', 'setMood')) safe(() => AOW.Music.setMood(AOW.game ? 'peace' : 'menu'));
    AOW.Events.emit('battle:end', { battle, result });
    S.battle = null; S.lastResult = null; S._ended = false; S._closing = false;
    if (hasFn('UI', 'refresh')) safe(() => UI.refresh());
    processPendingQueue();
  }
  function processPendingQueue() {
    const g = AOW.game;
    if (g && Array.isArray(g.pendingBattles) && g.pendingBattles.length) tryOpenBattle(g.pendingBattles.shift());
  }
  function tryOpenBattle(battle) {
    if (!battle) return;
    if (UI.isOpen('battle')) {
      const g = AOW.game;
      if (g) { g.pendingBattles = g.pendingBattles || []; g.pendingBattles.unshift(battle); }
      return;
    }
    if (!battleHasHuman(battle)) {
      // AI-vs-AI: never shown — resolve silently and move on
      let result = null;
      try { if (has('Combat', 'autoResolve')) result = AOW.Combat.autoResolve(AOW.game, battle); } catch (e) { console.error('[combat_ui] silent autoResolve', e); }
      AOW.Events.emit('battle:end', { battle, result, silent: true });
      processPendingQueue();
      return;
    }
    UI.showScreen('battle', { battle });
  }

  UI.registerScreen('battle', {
    full: true, dim: false,
    open(params) { const battle = params && params.battle; if (!battle) return el('div', { class: 'aow-empty' }, '—'); beginBattleUI(battle); return S.root; },
    close() { teardownBattleUI(); },
    refresh() { renderAll(); },
  });

  Events.on('battle:start', p => tryOpenBattle(p && p.battle));

  // ------------------------------------------------------------------ hotkeys: Space/Enter end turn, D defend, Esc cancel target mode
  function isTyping(target) { return !!(target && target.tagName && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)); }
  window.addEventListener('keydown', e => {
    if (UI.currentScreen() !== 'battle' || isTyping(e.target)) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onEndSideTurn(); }
    else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); doSimpleAction('defend'); }
    else if (e.key === 'Escape') {
      e.preventDefault();
      if (S.explicitMode) { S.explicitMode = null; S.armedAttackId = null; if (S.active !== null && CR()) safe(() => CR().setTargetMode('move', { unitId: S.active })); renderDock(); }
      else if (S.active !== null) clearSelection();
    }
  });
})(window.AOW = window.AOW || {});
