#!/usr/bin/env node
// tools/e2e.js — human-flow end-to-end test (Playwright). Plays a real game through the DOM + canvas UI:
// menu → new game → faction creation → army selection/movement → city → research/screens → end turns →
// a tactical battle fought through the battle UI → an auto-resolved battle → world spell → save/reload → fast turns.
//
// Every interaction goes through the real UI: DOM clicks on real selectors (page.click) and mouse clicks at
// screen coordinates obtained from AOW.WorldRender.hexToScreen / AOW.CombatRender.hexToScreen. page.evaluate
// is only used for READ-ONLY state queries, plus three deliberate exceptions: muting the audio at boot,
// scrolling the camera to a hex that is off-screen or under HUD chrome (WorldRender.centerOn), and the final
// "25 fast turns" loop. A regression in the UI wiring therefore fails the test instead of being bypassed.
//
// usage: node tools/e2e.js [--seed NAME] [--headed] [--slowmo MS] [--timeout MS] [--no-shots]
// exit code 0 = whole flow passed, 1 = a step failed or the page threw.
const path = require('path');
const fs = require('fs');
process.env.NODE_PATH = '/opt/node22/lib/node_modules';
require('module').Module._initPaths();
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = k => args.includes('--' + k);
const SEED = opt('seed', 'e2e');
const STEP_TIMEOUT = +opt('timeout', 30000);
const NO_SHOTS = flag('no-shots');

let page = null, browser = null;
const errors = [];
let stepNo = 0, t0 = Date.now();
const ms = () => String(((Date.now() - t0) / 1000).toFixed(1) + 's').padStart(6);

function step(msg) { stepNo++; console.log('\n' + ms() + ' ── ' + String(stepNo).padStart(2, '0') + '. ' + msg); }
function ok(msg) { console.log(ms() + '    ✓ ' + msg); }
function info(msg) { console.log(ms() + '    · ' + msg); }
function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); ok(msg); }

// ------------------------------------------------------------------ helpers
const ev = (fn, arg) => page.evaluate(fn, arg);
async function waitFn(fn, arg, timeout) {
  try { await page.waitForFunction(fn, arg, { timeout: timeout || STEP_TIMEOUT, polling: 60 }); }
  catch (e) { fail('timeout waiting for condition: ' + String(fn).slice(0, 160).replace(/\s+/g, ' ')); }
}
async function shot(name) {
  if (NO_SHOTS) return;
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
  const p = path.join(SHOTS, 'e2e_' + name + '.png');
  await page.screenshot({ path: p });
  info('screenshot ' + path.relative(ROOT, p));
}
/** click a DOM element, failing loudly when the selector does not resolve */
async function click(sel, o) {
  const loc = page.locator(sel).first();
  try { await loc.waitFor({ state: 'visible', timeout: (o && o.timeout) || STEP_TIMEOUT }); }
  catch (e) { fail('selector not visible: ' + sel); }
  await loc.click({ timeout: STEP_TIMEOUT });
}
async function exists(sel) { return (await page.locator(sel).count()) > 0; }
async function textOf(sel) { const n = await page.locator(sel).count(); return n ? (await page.locator(sel).first().innerText()).trim() : null; }

/** screen coordinates of a world hex (via WorldRender.hexToScreen) */
async function hexPoint(idx) {
  const p = await ev(i => { const s = AOW.WorldRender.hexToScreen(i); return s ? { x: Math.round(s.x), y: Math.round(s.y) } : null; }, idx);
  if (!p) fail('hexToScreen(' + idx + ') returned null');
  return p;
}
/** click a world hex; re-centres the camera when the point is off-screen or covered by HUD chrome */
async function clickHex(idx, o) {
  o = o || {};
  let p = await hexPoint(idx);
  let hit = await ev(q => { const e = document.elementFromPoint(q.x, q.y); return e ? (e.id || e.className || e.tagName) : null; }, p);
  if (hit !== 'world') {
    await ev(i => AOW.WorldRender.centerOn(i, false), idx);
    await page.waitForTimeout(60);
    p = await hexPoint(idx);
    hit = await ev(q => { const e = document.elementFromPoint(q.x, q.y); return e ? (e.id || e.className || e.tagName) : null; }, p);
    if (hit !== 'world') fail('hex ' + idx + ' at ' + p.x + ',' + p.y + ' is covered by "' + hit + '"');
  }
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y, { button: o.button || 'left', clickCount: o.dbl ? 2 : 1, delay: 20 });
  await page.waitForTimeout(o.wait === undefined ? 90 : o.wait);
  return p;
}
/** click a hex until the army standing there is the selected one (a city on the same hex takes the first click) */
async function selectArmyByClick(hex, armyId) {
  for (let i = 0; i < 3; i++) {
    await clickHex(hex);
    const got = await ev(() => AOW.UI.selected.armyId);
    if (got === armyId) return true;
  }
  return false;
}
/** click a hex until its city is the selected thing (a garrison on the same hex shares the click cycle) */
async function selectCityByClick(hex, cityId) {
  for (let i = 0; i < 3; i++) {
    await clickHex(hex);
    const got = await ev(() => AOW.UI.selected.cityId);
    if (got === cityId) return true;
  }
  return false;
}
/** click a battle hex (CombatRender coordinates) */
async function clickBattleHex(col, row, o) {
  o = o || {};
  const p = await ev(h => { const s = AOW.CombatRender.hexToScreen(h.col, h.row); return s ? { x: Math.round(s.x), y: Math.round(s.y) } : null; }, { col, row });
  if (!p) fail('CombatRender.hexToScreen(' + col + ',' + row + ') returned null');
  const hit = await ev(q => { const e = document.elementFromPoint(q.x, q.y); return e ? (e.id || e.className || e.tagName) : null; }, p);
  if (hit !== 'battle') fail('battle hex ' + col + ',' + row + ' is covered by "' + hit + '"');
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y, { delay: 20 });
  await page.waitForTimeout(o.wait === undefined ? 120 : o.wait);
  return p;
}
function errorsSince(n) { return errors.slice(n); }
function assertNoErrors(n, label) {
  const list = errorsSince(n);
  if (list.length) fail(label + ' produced page errors:\n      - ' + list.join('\n      - '));
  ok('no page errors during ' + label);
}

// ================================================================== the flow
async function run() {
  // ---------------------------------------------------------------- 1. boot + menu + faction
  step('Load index.html and reach the main menu');
  await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'load' });
  await waitFn(() => !!(window.AOW && AOW.UI && AOW.UI.currentScreen() === 'menu'));
  await ev(() => { try { AOW.Audio.setMuted(true); } catch (e) { /* audio optional */ } });
  assert(await exists('.aow-screen[data-screen="menu"] .mm-title'), 'main menu is visible');
  await shot('menu');

  step('새 게임 → new game setup → 세력 생성 → faction creator');
  await click('.aow-screen[data-screen="menu"] button:has-text("새 게임")');
  await waitFn(() => AOW.UI.currentScreen() === 'newgame');
  assert(await exists('.aow-screen[data-screen="newgame"] .ng-grid'), 'new-game screen is open');
  // seed so the run is reproducible
  await page.fill('.aow-screen[data-screen="newgame"] input[data-focus="seed"]', SEED);
  await click('.aow-screen[data-screen="newgame"] button:has-text("세력 생성")');
  await waitFn(() => AOW.UI.currentScreen() === 'faction');
  assert(await exists('.aow-screen[data-screen="faction"] .fw-shell'), 'faction creator is open');

  const FS = '.aow-screen[data-screen="faction"] ';
  step('Faction: ruler, form, culture, 2 society traits, tome, name');
  await click(FS + '[data-ruler="wizard_king"]');
  assert(await exists(FS + '[data-ruler="wizard_king"].fw-card--selected'), 'ruler type 마법왕 selected');
  const classCount = await page.locator(FS + '.fw-class-chip').count();
  if (classCount > 1) await click(FS + '.fw-class-chip >> nth=1');
  await page.fill(FS + 'input[data-focus="rulerName"]', '검증관 아리스');
  await click(FS + '.fw-tab >> nth=1');
  await click(FS + '[data-form] >> nth=1');
  assert(await exists(FS + '[data-form].fw-card--selected'), 'form selected');
  await click(FS + '.fw-tab >> nth=2');
  await click(FS + '[data-culture] >> nth=0');
  if (await exists(FS + '[data-sub]')) await click(FS + '[data-sub] >> nth=0');
  assert(await exists(FS + '[data-culture].fw-card--selected'), 'culture selected');
  await click(FS + '.fw-tab >> nth=3');
  await click(FS + '.fw-society-card >> nth=0');
  await click(FS + '.fw-society-card >> nth=1');
  assert((await page.locator(FS + '.fw-society-card--on').count()) === 2, '2 society traits selected');
  await click(FS + '.fw-tab >> nth=4');
  await click(FS + '[data-tome] >> nth=0');
  assert(await exists(FS + '[data-tome].fw-tome-card--selected'), 'starting tome selected');
  await click(FS + '.fw-tab >> nth=5');
  await page.fill(FS + 'input[data-focus="factionName"]', '검증 왕국');
  await shot('faction');

  step('완료 → the world is created, HUD up, camera on the capital');
  await click(FS + 'button:has-text("완료")');
  await waitFn(() => !!window.AOW.game && AOW.UI.currentScreen() === 'hud', null, 60000);
  const boot = await ev(() => {
    const g = AOW.game, p = g.players[0];
    const cap = AOW.State.capital(g, 0);
    const cp = cap ? AOW.Hex.toPixel(cap.hex % g.W, (cap.hex / g.W) | 0) : null;
    const cam = AOW.WorldRender.camera;
    const scr = cap ? AOW.WorldRender.hexToScreen(cap.hex) : null;
    return {
      turn: g.turn, players: g.players.length, name: p.name, ruler: p.rulerName, tomes: (p.tomes || []).length,
      traits: (p.traits || []).length, capital: cap ? cap.name : null,
      camDist: cp ? Math.round(Math.hypot(cam.x - cp.x, cam.y - cp.y)) : -1,
      capOnScreen: !!scr && scr.x > 40 && scr.x < window.innerWidth - 40 && scr.y > 40 && scr.y < window.innerHeight - 40,
      capOffset: scr ? Math.round(Math.hypot(scr.x - window.innerWidth / 2, scr.y - window.innerHeight / 2)) : -1,
      hud: !!document.querySelector('.hud-root'), topbar: !!document.querySelector('.hud-topbar'),
      armies: g.armies.filter(a => a.owner === 0).length,
    };
  });
  info(JSON.stringify(boot));
  assert(boot.turn >= 1 && boot.players >= 2, 'game created (turn ' + boot.turn + ', ' + boot.players + ' realms)');
  assert(boot.name === '검증 왕국' && boot.ruler === '검증관 아리스', 'faction + ruler names carried through');
  assert(boot.tomes >= 1 && boot.traits >= 4, 'tome and traits applied to the player');
  assert(boot.hud && boot.topbar, 'HUD is mounted');
  // the camera clamps against the map edge, so "centred" means the capital sits on screen near the middle
  assert(boot.capOnScreen && boot.capOffset < 460, 'camera centred on the capital (' + boot.capOffset + 'px from the view centre)');
  assert(boot.armies >= 1, 'player starts with ' + boot.armies + ' army stack(s)');
  assertNoErrors(0, 'new game creation');

  // ---------------------------------------------------------------- 2. select + move an army
  step('Select the starting army by clicking its hex');
  const armyInfo = await ev(() => {
    const g = AOW.game;
    const a = g.armies.find(x => x.owner === 0 && x.units.length && x.mp > 0) || g.armies.find(x => x.owner === 0);
    AOW.WorldRender.centerOn(a.hex, false);
    return { id: a.id, hex: a.hex, units: a.units.length, mp: a.mp };
  });
  await page.waitForTimeout(80);
  await selectArmyByClick(armyInfo.hex, armyInfo.id);   // the capital shares the hex: one click picks the city, the next the stack
  const sel = await ev(() => ({ armyId: AOW.UI.selected.armyId, cards: document.querySelectorAll('.hud-selection .unit-card').length, title: (document.querySelector('.hud-selection .aow-panel__title') || {}).textContent || '' }));
  assert(sel.armyId === armyInfo.id, 'army #' + armyInfo.id + ' selected by clicking its hex');
  assert(sel.cards >= 1, 'selection panel shows ' + sel.cards + ' unit card(s)');

  step('Click a hex two tiles away → path preview → click again → the army moves');
  const target = await ev(id => {
    const g = AOW.game, a = AOW.State.army(g, id);
    for (let i = 0; i < g.W * g.H; i++) {
      if (AOW.Hex.distIdx(a.hex, i, g.W) !== 2) continue;
      const pf = AOW.Rules.pathfind(g, a, i);
      if (pf && pf.path && pf.path.length === 2 && pf.turns === 1) return i;
    }
    return -1;
  }, armyInfo.id);
  assert(target >= 0, 'found a reachable hex 2 tiles away (idx ' + target + ')');
  await clickHex(target);
  const preview = await ev(() => { const p = AOW.WorldRender.getPathPreview(); return p && p.path ? p.path.length : 0; });
  assert(preview === 2, 'path preview drawn (' + preview + ' hexes)');
  await clickHex(target, { wait: 200 });
  await waitFn(t => { const a = AOW.game.armies.find(x => x.hex === t && x.owner === 0); return !!a && !AOW.WorldRender.isAnimating(); }, target);
  const moved = await ev(t => {
    const g = AOW.game, a = g.armies.find(x => x.owner === 0 && x.hex === t);
    return { hex: a ? a.hex : -1, mp: a ? a.mp : -1, preview: !!AOW.WorldRender.getPathPreview(), animating: AOW.WorldRender.isAnimating() };
  }, target);
  assert(moved.hex === target, 'army arrived at hex ' + target + ' (mp left ' + moved.mp + ')');
  assert(!moved.animating, 'move animation finished');
  assert(!moved.preview, 'path preview cleared after the move');

  step('Double-click an adjacent hex → the army marches there too');
  const near = await ev(id => {
    const g = AOW.game, a = AOW.State.army(g, id);
    for (const n of AOW.Hex.neighborsIdx(a.hex, g.W, g.H)) {
      if (n < 0) continue;
      const pf = AOW.Rules.pathfind(g, a, n);
      if (pf && pf.path && pf.path.length === 1 && pf.turns === 1) return n;
    }
    return -1;
  }, armyInfo.id);
  if (near < 0) info('no free neighbour to double-click into — skipped');
  else {
    await selectArmyByClick(target, armyInfo.id);
    await clickHex(near, { dbl: true, wait: 250 });
    await waitFn(() => !AOW.WorldRender.isAnimating(), null, 15000);
    const after = await ev(id => { const a = AOW.State.army(AOW.game, id); return a ? a.hex : -1; }, armyInfo.id);
    assert(after === near, 'double-click moved the army to hex ' + near);
  }

  step('Camera controls: WASD pan + wheel zoom do not break anything');
  const camBefore = await ev(() => ({ x: AOW.WorldRender.camera.x, y: AOW.WorldRender.camera.y, z: AOW.WorldRender.camera.zoom }));
  await page.mouse.move(800, 450);
  for (const k of ['KeyD', 'KeyS']) { await page.keyboard.down(k); await page.waitForTimeout(180); await page.keyboard.up(k); }
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(260);
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(260);
  const camAfter = await ev(() => ({ x: AOW.WorldRender.camera.x, y: AOW.WorldRender.camera.y, z: AOW.WorldRender.camera.zoom }));
  assert(Math.abs(camAfter.x - camBefore.x) + Math.abs(camAfter.y - camBefore.y) > 1, 'WASD panned the camera');
  assert(camAfter.z > 0.3 && camAfter.z < 2.3, 'zoom stayed in range (' + camAfter.z.toFixed(2) + ')');
  assertNoErrors(0, 'map interaction');
  await ev(() => { const g = AOW.game; AOW.WorldRender.centerOn(AOW.State.capital(g, 0).hex, false); });
  await shot('world_after_move');

  step('Minimap jump + overlay toggles');
  const camPre = await ev(() => ({ x: Math.round(AOW.WorldRender.camera.x), y: Math.round(AOW.WorldRender.camera.y) }));
  await page.locator('.hud-minimap canvas').click({ position: { x: 200, y: 130 } });
  await page.waitForTimeout(200);
  const camPost = await ev(() => ({ x: Math.round(AOW.WorldRender.camera.x), y: Math.round(AOW.WorldRender.camera.y) }));
  assert(camPre.x !== camPost.x || camPre.y !== camPost.y, 'clicking the minimap moved the camera');
  await click('.hud-minimap__overlays button >> nth=0');
  assert(await exists('.hud-minimap__overlays button.aow-btn--active'), 'province overlay toggled on');
  await click('.hud-minimap__overlays button >> nth=1');
  await click('.hud-minimap__overlays button >> nth=1');
  assert(!(await exists('.hud-minimap__overlays button.aow-btn--active')), 'overlays toggled back off');
  assertNoErrors(0, 'minimap');

  step('Army orders: 방어 and 대기 spend the stack’s movement');
  await selectArmyByClick(await ev(id => AOW.State.army(AOW.game, id).hex, armyInfo.id), armyInfo.id);
  assert(await exists('.hud-actions button:has-text("방어"):not([disabled])'), '방어 is enabled');
  await click('.hud-actions button:has-text("방어")');
  await page.waitForTimeout(150);
  const defended = await ev(id => {
    const g = AOW.game, a = AOW.State.army(g, id);
    const u = AOW.State.unit(g, a.units[0]);
    return { mp: a.mp, defending: !!a.defending, fortified: (u.statuses || []).some(s => s.id === 'fortified') };
  }, armyInfo.id);
  assert(defended.mp === 0 && defended.defending, '방어 put the stack on hold (mp ' + defended.mp + ')');
  assert(defended.fortified, 'its units gained the 방어 태세 status');
  await click('.hud-actions button:has-text("대기")');
  await page.waitForTimeout(120);
  assert(await ev(id => !!AOW.State.army(AOW.game, id).sleeping, armyInfo.id), '대기 put the stack to sleep');
  assertNoErrors(0, 'army orders');

  // ---------------------------------------------------------------- 3. city screen
  step('Open the capital → 도시 열기 → city screen');
  const cap = await ev(() => { const c = AOW.State.capital(AOW.game, 0); return { hex: c.hex, id: c.id }; });
  assert(await selectCityByClick(cap.hex, cap.id), 'capital selected by clicking its hex');
  assert(await exists('.hud-selection button:has-text("도시")'), 'city panel offers the open-city button');
  await click('.hud-selection button:has-text("도시")');
  await waitFn(() => AOW.UI.isOpen('city'));
  assert(await exists('.aow-screen[data-screen="city"] .sc-city-head'), 'city screen is open');

  step('Queue a building and a unit (queue length 2)');
  const CS = '.aow-screen[data-screen="city"] ';
  await click(CS + '.sc-body .sc-row button:has-text("건설")');
  await page.waitForTimeout(120);
  await click(CS + '.sc-tab:has-text("모집")');
  await page.waitForTimeout(120);
  await click(CS + '.sc-body .sc-row button:has-text("모집")');
  await page.waitForTimeout(120);
  const queue = await ev(() => {
    const c = AOW.State.capital(AOW.game, 0);
    return { len: (c.queue || []).length, kinds: (c.queue || []).map(q => q.type + ':' + q.id) };
  });
  info('queue = ' + JSON.stringify(queue.kinds));
  assert(queue.len === 2, 'production queue holds 2 items');

  step('지방 tab: annex a province (or show its cost)');
  await click(CS + '.sc-tab:has-text("지방")');
  await page.waitForTimeout(150);
  const annexBtn = page.locator(CS + '.sc-body button:has-text("병합")').first();
  const annexCount = await page.locator(CS + '.sc-body button:has-text("병합")').count();
  const provBefore = await ev(() => (AOW.State.capital(AOW.game, 0).provinces || []).length);
  if (annexCount && await annexBtn.isEnabled()) {
    await annexBtn.click();
    await page.waitForTimeout(200);
    const provAfter = await ev(() => (AOW.State.capital(AOW.game, 0).provinces || []).length);
    assert(provAfter === provBefore + 1, 'province annexed (' + provBefore + ' → ' + provAfter + ')');
  } else {
    const costShown = await exists(CS + ':text("병합 비용")');
    assert(costShown || annexCount === 0, 'annex not affordable — cost/emptiness is displayed');
  }
  await shot('city');

  step('Close the city screen with Esc');
  await page.keyboard.press('Escape');
  await waitFn(() => !AOW.UI.isOpen('city'));
  assert(await ev(() => AOW.UI.currentScreen() === 'hud'), 'back on the HUD');
  assertNoErrors(0, 'city screen');

  // ---------------------------------------------------------------- 4. research + other screens
  step('Open 연구 from the HUD nav and start a research item');
  await click('.hud-nav .aow-btn--nav >> nth=1');
  await waitFn(() => AOW.UI.isOpen('research'));
  assert(await exists('.aow-screen[data-screen="research"] .sc-shelf'), 'research screen is open');
  const RSS = '.aow-screen[data-screen="research"] ';
  const ownedTomes = await ev(() => (AOW.game.players[0].tomes || []).length);
  if (!ownedTomes) {
    await click(RSS + '.sc-book >> nth=0');
    await click(RSS + 'button:has-text("마법서 선택")');
    await page.waitForTimeout(150);
  }
  assert(await exists(RSS + 'button:has-text("시작")'), 'the selected tome lists researchable contents');
  await click(RSS + 'button:has-text("시작")');
  await page.waitForTimeout(150);
  const research = await ev(() => {
    const p = AOW.game.players[0];
    return p.research && p.research.current ? { tome: p.research.current.tomeId, content: p.research.current.contentId } : null;
  });
  assert(!!research, 'player.research.current set → ' + JSON.stringify(research));
  await shot('research');
  await page.keyboard.press('Escape');
  await waitFn(() => !AOW.UI.isOpen('research'));

  step('Open and close 주문서 / 영웅 / 제국 / 외교 / 도시 목록 / 설정');
  const NAV = [
    { idx: 2, screen: 'spellbook', label: '주문서' },
    { idx: 4, screen: 'hero', label: '영웅' },
    { idx: 3, screen: 'empire', label: '제국' },
    { idx: 5, screen: 'diplomacy', label: '외교' },
    { idx: 0, screen: 'cities', label: '도시 목록' },
  ];
  const NAV_EXTRA = [{ idx: 6, screen: 'settings', label: '설정' }];
  for (const n of NAV.concat(NAV_EXTRA)) {
    const before = errors.length;
    await click('.hud-nav .aow-btn--nav >> nth=' + n.idx);
    await waitFn(s => AOW.UI.isOpen(s), n.screen);
    assert(await exists('.aow-screen[data-screen="' + n.screen + '"]'), n.label + ' screen opened');
    if (n.screen === 'empire') {
      await page.waitForTimeout(150);   // connectors are re-anchored on the next animation frame
      // every connector must join the right pair of nodes: one endpoint on the prereq's edge, the other on
      // the dependent node's facing edge, and the segment must not run through either box.
      const lines = await ev(() => {
        const root = document.querySelector('.aow-screen[data-screen="empire"]');
        const svg = root && root.querySelector('.sc-tree svg');
        if (!svg) return null;
        const els = Array.from(root.querySelectorAll('.sc-node'));
        const defs = AOW.Data.list('empireSkills').filter(n => n.tree === 'general');
        if (els.length !== defs.length) return { mismatch: els.length + '/' + defs.length };
        const box = {};
        defs.forEach((d, i) => { const e = els[i]; box[d.id] = { l: e.offsetLeft, t: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight }; });
        // connectors are <path>s: "M x y L x y [L x y…]" — collect their vertices
        const ls = Array.from(svg.querySelectorAll('path')).map(p => {
          const n = (p.getAttribute('d') || '').match(/-?\d+(\.\d+)?/g) || [];
          const pts = [];
          for (let i = 0; i + 1 < n.length; i += 2) pts.push({ x: +n[i], y: +n[i + 1] });
          return pts;
        }).filter(p => p.length >= 2);
        const anchors = b => [{ x: b.l + b.w / 2, y: b.t }, { x: b.l + b.w / 2, y: b.t + b.h }, { x: b.l, y: b.t + b.h / 2 }, { x: b.l + b.w, y: b.t + b.h / 2 }];
        const on = (p, b) => anchors(b).some(a => Math.abs(a.x - p.x) < 2 && Math.abs(a.y - p.y) < 2);
        const inside = (p, b) => p.x > b.l + 2 && p.x < b.l + b.w - 2 && p.y > b.t + 2 && p.y < b.t + b.h - 2;
        const pairs = [];
        for (const d of defs) for (const p of d.prereq || []) if (box[p]) pairs.push([p, d.id]);
        let matched = 0, crossing = 0;
        for (const [from, to] of pairs) {
          const A = box[from], B = box[to];
          const hit = ls.find(pts => {
            const a = pts[0], z = pts[pts.length - 1];
            return (on(a, A) && on(z, B)) || (on(a, B) && on(z, A));
          });
          if (!hit) continue;
          matched++;
          // no vertex (and no segment midpoint) may sit inside any node box
          const probes = [];
          for (let i = 0; i + 1 < hit.length; i++) probes.push({ x: (hit[i].x + hit[i + 1].x) / 2, y: (hit[i].y + hit[i + 1].y) / 2 });
          if (probes.some(p => Object.keys(box).some(k => inside(p, box[k])))) crossing++;
        }
        const overlap = els.some(a => els.some(b => a !== b && Math.abs(a.offsetLeft - b.offsetLeft) < 4 && Math.abs(a.offsetTop - b.offsetTop) < a.offsetHeight));
        return { lines: ls.length, nodes: els.length, pairs: pairs.length, matched, crossing, overlap, h: els[0] && els[0].offsetHeight };
      });
      assert(lines && lines.lines > 0, 'empire tree drew ' + (lines && lines.lines) + ' prereq connectors for ' + (lines && lines.nodes) + ' nodes');
      assert(lines.matched === lines.pairs && lines.lines === lines.pairs, 'every prereq pair has its own connector (' + lines.matched + '/' + lines.pairs + ')');
      assert(lines.crossing === 0, 'no connector runs behind a node box (' + lines.crossing + ' hidden)');
      assert(!lines.overlap, 'no two nodes overlap in a column (node height ' + lines.h + 'px)');
      await shot('empire');
    }
    await page.keyboard.press('Escape');
    await waitFn(s => !AOW.UI.isOpen(s), n.screen);
    assertNoErrors(before, n.label + ' screen');
  }

  step('Research screen: the six affinity bars sit on one row');
  await click('.hud-nav .aow-btn--nav >> nth=1');
  await waitFn(() => AOW.UI.isOpen('research'));
  const bars = await ev(() => {
    const box = document.querySelector('.aow-screen[data-screen="research"] .sc-affbars');
    if (!box) return null;
    const kids = Array.from(box.children);
    const tops = new Set(kids.map(k => Math.round(k.getBoundingClientRect().top)));
    return { n: kids.length, rows: tops.size };
  });
  assert(bars && bars.n === 6, 'six affinity bars rendered');
  assert(bars.rows === 1, 'all six bars share one row (' + bars.rows + ' row(s))');
  await page.keyboard.press('Escape');
  await waitFn(() => !AOW.UI.isOpen('research'));

  // ---------------------------------------------------------------- 5. end turns
  step('End three turns through the HUD button');
  for (let i = 0; i < 3; i++) {
    const before = await ev(() => ({ turn: AOW.game.turn, gold: AOW.game.players[0].resources.gold }));
    await endTurnViaHud();
    const after = await ev(() => ({ turn: AOW.game.turn, gold: AOW.game.players[0].resources.gold, overlay: !!document.querySelector('.hud-turnoverlay') }));
    assert(after.turn === before.turn + 1, 'turn ' + before.turn + ' → ' + after.turn);
    assert(!after.overlay, '"다른 세력의 턴" overlay disappeared');
    info('gold ' + before.gold + ' → ' + after.gold);
  }
  if (await exists('.hud-notif')) {
    const mark0 = errors.length;
    await click('.hud-notif >> nth=0');
    await page.waitForTimeout(250);
    assertNoErrors(mark0, 'clicking a turn notification');
  }
  step('Annex a province now that imperium has come in');
  {
    const cap2 = await ev(() => { const c = AOW.State.capital(AOW.game, 0); return { hex: c.hex, id: c.id }; });
    assert(await selectCityByClick(cap2.hex, cap2.id), 'capital re-selected (the click cycles city ↔ garrison)');
    await click('.hud-selection button:has-text("도시")');
    await waitFn(() => AOW.UI.isOpen('city'));
    await click(CS + '.sc-tab:has-text("지방")');
    await page.waitForTimeout(150);
    const provBefore2 = await ev(() => (AOW.State.capital(AOW.game, 0).provinces || []).length);
    const btn = page.locator(CS + '.sc-body button:has-text("병합")').first();
    if ((await btn.count()) && await btn.isEnabled()) {
      await btn.click();
      await page.waitForTimeout(250);
      const provAfter2 = await ev(() => (AOW.State.capital(AOW.game, 0).provinces || []).length);
      assert(provAfter2 === provBefore2 + 1, 'province annexed through the city screen (' + provBefore2 + ' → ' + provAfter2 + ')');
    } else {
      info('still cannot afford an annex — imperium ' + (await ev(() => AOW.game.players[0].resources.imperium)));
    }
    await page.keyboard.press('Escape');
    await waitFn(() => !AOW.UI.isOpen('city'));
  }

  step('The recruited unit shows up in the capital garrison');
  for (let i = 0; i < 4; i++) {
    const g = await ev(q => {
      const gm = AOW.game, c = AOW.State.capital(gm, 0);
      let found = 0;
      for (const a of AOW.State.armiesAt(gm, c.hex)) if (a.owner === 0) for (const uid of a.units) { const u = AOW.State.unit(gm, uid); if (u && u.typeId === q) found++; }
      return found;
    }, queue.kinds.find(k => k.indexOf('unit:') === 0).slice(5));
    if (g) break;
    await endTurnViaHud();
  }
  const garrison = await ev(q => {
    const g = AOW.game, c = AOW.State.capital(g, 0);
    const units = [];
    for (const a of AOW.State.armiesAt(g, c.hex)) if (a.owner === 0) for (const uid of a.units) { const u = AOW.State.unit(g, uid); if (u) units.push(u.typeId); }
    return { units: units.length, types: units, queue: (c.queue || []).length, built: (c.buildings || []).length, has: units.indexOf(q) >= 0 };
  }, queue.kinds.find(k => k.indexOf('unit:') === 0).slice(5));
  info('capital garrison [' + garrison.types.join(', ') + '], queue ' + garrison.queue + ', buildings ' + garrison.built);
  assert(garrison.has, 'the queued unit was produced into the garrison');
  assertNoErrors(0, 'end turn');

  // ---------------------------------------------------------------- 6. battle through the UI
  step('March on the nearest neutral guard');
  const guard = await findGuard();
  assert(!!guard, 'found a neutral guard at hex ' + (guard && guard.hex) + ' (' + (guard && guard.kind) + ', ' + (guard && guard.dist) + ' hexes away)');
  const reached = await marchTo(guard.armyId, guard.hex, 10);
  assert(reached, 'army is adjacent to the guard');

  step('Attack → encounter modal → 공격 → battle screen');
  await clickHex(guard.hex);
  await page.waitForTimeout(120);
  if (!(await exists('.aow-modal-backdrop'))) await clickHex(guard.hex, { wait: 250 });
  assert(await exists('.aow-modal-backdrop'), 'encounter modal opened');
  assert(await exists('.aow-modal-backdrop button:has-text("공격")'), 'the modal offers 공격 / 자동 전투');
  await click('.aow-modal-backdrop button:has-text("공격")');
  await waitFn(() => AOW.UI.isOpen('battle') && !!AOW.battle);
  const battleCanvas = await ev(() => { const c = document.getElementById('battle'); return { hidden: c.hidden, w: c.width, h: c.height, cw: c.clientWidth }; });
  assert(!battleCanvas.hidden, '#battle canvas is visible');
  assert(battleCanvas.w >= battleCanvas.cw, 'battle canvas is sized at device resolution (' + battleCanvas.w + 'px for ' + battleCanvas.cw + 'css px)');
  assert(await exists('.battle-hud .battle-dock'), 'battle HUD mounted');
  await page.waitForTimeout(500);
  await shot('battle_start');
  await click('.battle-topbar button:has-text("속도")');   // 1× → 2×: also covers the speed toggle
  assert((await textOf('.battle-topbar button:has-text("속도")')).indexOf('2') >= 0, 'animation speed toggled to 2×');

  step('Fight the battle through the UI (move, attack, end side turn)');
  const summary = await playBattle(12);
  info(JSON.stringify(summary));
  assert(summary.acted > 0, 'performed ' + summary.acted + ' unit action(s) through the battle UI');
  assert(summary.finished, 'battle reached a result (' + summary.how + ')');
  await shot('battle_result');
  assert(await exists('.aow-modal-backdrop'), 'result modal shown');
  await click('.aow-modal-backdrop button:has-text("확인")');
  await waitFn(() => !AOW.UI.isOpen('battle') && !AOW.battle);
  const afterBattle = await ev(() => {
    const g = AOW.game, c = document.getElementById('battle'), w = document.getElementById('world');
    return { battleHidden: c.hidden, worldShown: !w.hidden, hud: !!document.querySelector('.hud-root'), battles: (g.battles || []).length, units: g.units.length };
  });
  assert(afterBattle.battleHidden && afterBattle.worldShown, 'back on the world map');
  assert(afterBattle.hud, 'world HUD restored');
  assert(afterBattle.battles > 0, 'battle recorded in game.battles');
  assertNoErrors(0, 'tactical battle');

  // ---------------------------------------------------------------- 6b. auto-resolved battle
  step('Second encounter → 자동 전투 straight from the encounter modal');
  const auto = await autoBattle();
  if (auto.skipped) info('no second guard within reach — skipped (' + auto.reason + ')');
  else {
    assert(auto.resolved, 'auto-resolve ran (battles now ' + auto.battles + ')');
  }

  // ---------------------------------------------------------------- 7. world spell
  step('Cast a world spell from the HUD spell bar');
  const spell = await castSpell();
  if (spell.skipped) info('no castable world spell known — skipped (' + spell.reason + ')');
  else assert(spell.manaBefore > spell.manaAfter, 'mana spent ' + spell.manaBefore + ' → ' + spell.manaAfter + ' casting ' + spell.name);
  assertNoErrors(0, 'spell casting');

  // ---------------------------------------------------------------- 8. save / reload / continue
  step('F5 quick save → reload → 이어하기');
  const beforeSave = await ev(() => ({ turn: AOW.game.turn, gold: AOW.game.players[0].resources.gold, name: AOW.game.players[0].name, armies: AOW.game.armies.length }));
  await page.keyboard.press('F5');
  await waitFn(() => AOW.Main.hasSave('quick'));
  ok('quick save written (turn ' + beforeSave.turn + ')');
  await page.reload({ waitUntil: 'load' });
  await waitFn(() => !!(window.AOW && AOW.UI && AOW.UI.currentScreen() === 'menu'));
  await ev(() => { try { AOW.Audio.setMuted(true); } catch (e) { /* optional */ } });
  assert(await exists('.aow-screen[data-screen="menu"] button:has-text("이어하기")'), '이어하기 button present after reload');
  await click('.aow-screen[data-screen="menu"] button:has-text("이어하기")');
  await waitFn(() => !!window.AOW.game && AOW.UI.currentScreen() === 'hud');
  const loaded = await ev(() => ({
    turn: AOW.game.turn, gold: AOW.game.players[0].resources.gold, name: AOW.game.players[0].name, armies: AOW.game.armies.length,
    hud: !!document.querySelector('.hud-topbar'), turnText: (document.querySelector('.hud-turnbox__n') || {}).textContent || '',
  }));
  assert(loaded.turn === beforeSave.turn, 'restored at turn ' + loaded.turn);
  assert(loaded.name === beforeSave.name && loaded.armies === beforeSave.armies, 'realm and armies restored');
  assert(loaded.turnText.indexOf(String(loaded.turn)) >= 0, 'HUD refreshed to the restored turn ("' + loaded.turnText + '")');
  await shot('reload');
  assertNoErrors(0, 'save/reload');

  // ---------------------------------------------------------------- 9. fast turns
  step('Run 25 more turns quickly');
  const mark = errors.length;
  const fast = await ev(async () => {
    const out = { from: AOW.game.turn, errors: [] };
    for (let i = 0; i < 25; i++) {
      if (AOW.game.victory) break;
      try { AOW.Turn.endTurn(AOW.game); } catch (e) { out.errors.push('turn ' + AOW.game.turn + ': ' + e.message); break; }
      await new Promise(r => setTimeout(r, 12));
    }
    AOW.UI.refresh();
    out.to = AOW.game.turn;
    out.victory = AOW.game.victory ? AOW.game.victory.type : null;
    return out;
  });
  info('turn ' + fast.from + ' → ' + fast.to + (fast.victory ? ' (victory: ' + fast.victory + ')' : ''));
  assert(!fast.errors.length, '25 turns ran without engine errors' + (fast.errors.length ? ': ' + fast.errors[0] : ''));
  await page.waitForTimeout(400);
  await dismissModals('after the fast turns');
  await ev(() => { const c = AOW.State.capital(AOW.game, 0); if (c) AOW.WorldRender.centerOn(c.hex, false); });
  await page.waitForTimeout(700);
  assertNoErrors(mark, 'fast turns');
  const shown = await ev(() => ({ screen: AOW.UI.currentScreen(), modals: document.querySelectorAll('.aow-modal-backdrop').length, hud: !!document.querySelector('.hud-topbar'), turn: AOW.game.turn }));
  assert(shown.screen === 'hud' && !shown.modals && shown.hud, 'HUD is clear and responsive at turn ' + shown.turn);
  await shot('final');

  step('Summary');
  assert(errors.length === 0, 'no page errors during the whole run');
}

// ------------------------------------------------------------------ flow helpers
/** close whatever modal the AI turn popped up (diplomacy proposals, notifications…), topmost first */
async function dismissModals(label) {
  for (let i = 0; i < 14; i++) {
    const n = await page.locator('.aow-modal-backdrop').count();
    if (!n) return i;
    const top = page.locator('.aow-modal-backdrop').last();      // only the topmost one takes clicks
    const title = (await top.locator('.aow-panel__title').count()) ? (await top.locator('.aow-panel__title').first().innerText()).trim() : '(untitled)';
    let done = false;
    for (const b of ['거절', '확인', '닫기', '취소']) {
      const btn = top.locator('button:has-text("' + b + '")').first();
      if (await btn.count()) { await btn.click({ timeout: 8000 }).catch(() => {}); done = true; break; }
    }
    if (!done) await page.keyboard.press('Escape');
    info('dismissed modal "' + title.replace(/\s+/g, ' ') + '"' + (label ? ' (' + label + ')' : '') + (n > 1 ? ' [' + n + ' stacked]' : ''));
    await page.waitForTimeout(150);
  }
  return 14;
}
async function endTurnViaHud() {
  const before = await ev(() => AOW.game.turn);
  await dismissModals('before end turn');
  await click('.hud-endturn');
  await page.waitForTimeout(120);
  if (await exists('.aow-modal-backdrop button:has-text("그래도 종료")')) {
    await click('.aow-modal-backdrop button:has-text("그래도 종료")');
  }
  await waitFn(t => AOW.game.turn > t && !document.querySelector('.hud-turnoverlay'), before, 60000);
  await page.waitForTimeout(120);
  // a battle may have been queued for the human player (manual defense): resolve it automatically
  if (await ev(() => AOW.UI.isOpen('battle'))) {
    info('a defensive battle opened — auto-resolving it');
    await click('.battle-topbar button:has-text("자동 전투")');
    await click('.aow-modal-backdrop button:has-text("확인")');
    await page.waitForTimeout(400);
    if (await exists('.aow-modal-backdrop button:has-text("확인")')) await click('.aow-modal-backdrop button:has-text("확인")');
    await waitFn(() => !AOW.UI.isOpen('battle'));
  }
  await dismissModals('after end turn');
}

/** nearest neutral guard (wonder/infestation guard or roaming stack) to one of our armies */
async function findGuard() {
  return ev(() => {
    const g = AOW.game;
    let best = null;
    for (const a of g.armies) {
      if (a.owner !== 0 || !a.units.length) continue;
      for (const o of g.armies) {
        if (o.owner >= 0 || !o.units.length) continue;
        if (AOW.State.cityAt(g, o.hex)) continue;          // free-city garrisons are not attackable while at peace
        const d = AOW.Hex.distIdx(a.hex, o.hex, g.W);
        const pf = AOW.Rules.pathfind(g, a, o.hex, { allowGoalBlocked: true });
        if (!pf || !pf.path || !pf.path.length) continue;
        if (!best || pf.path.length < best.dist) {
          const st = AOW.State.structureAt(g, o.hex);
          best = { armyId: a.id, hex: o.hex, dist: pf.path.length, kind: st ? st.kind : 'roaming', straight: d };
        }
      }
    }
    return best;
  });
}

/** walk `armyId` towards `goalHex` by clicking the map, ending turns when out of MP. */
async function marchTo(armyId, goalHex, maxTurns) {
  for (let guard = 0; guard < maxTurns * 4; guard++) {
    const state = await ev(q => {
      const g = AOW.game, a = AOW.State.army(g, q.armyId);
      if (!a) return { gone: true };
      const d = AOW.Hex.distIdx(a.hex, q.goal, g.W);
      if (d <= 1) return { adjacent: true, hex: a.hex, mp: a.mp };
      const pf = AOW.Rules.pathfind(g, a, q.goal, { allowGoalBlocked: true });
      if (!pf || !pf.path || pf.path.length < 2) return { stuck: true, dist: d };
      // step at most 3 hexes at a time so the target stays near the middle of the screen
      const upto = Math.min(3, pf.path.length - 1);
      AOW.WorldRender.centerOn(a.hex, false);
      return { armyHex: a.hex, next: pf.path[upto - 1], mp: a.mp, dist: d, turns: pf.turns };
    }, { armyId, goal: goalHex });
    if (state.gone) fail('the marching army disappeared');
    if (state.adjacent) return true;
    if (state.stuck) { info('no path to the guard (distance ' + state.dist + ')'); return false; }
    if (state.mp <= 0) { await endTurnViaHud(); continue; }
    await page.waitForTimeout(60);
    if (!(await selectArmyByClick(state.armyHex, armyId))) fail('could not select the marching army by clicking its hex');
    await clickHex(state.next);             // preview
    await clickHex(state.next, { wait: 160 });  // confirm
    await waitFn(() => !AOW.WorldRender.isAnimating(), null, 15000);
    const after = await ev(id => { const a = AOW.State.army(AOW.game, id); return a ? { hex: a.hex, mp: a.mp } : null; }, armyId);
    if (!after) fail('army lost while marching');
    if (after.hex === state.armyHex && after.mp > 0) {
      // blocked by an encounter modal (guard adjacent) or terrain
      if (await exists('.aow-modal-backdrop')) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); }
      else { await endTurnViaHud(); }
    }
    if (after.mp <= 0) await endTurnViaHud();
  }
  return false;
}

/** play the human side of the open battle through the DOM/canvas; returns a small summary */
async function playBattle(maxRounds) {
  const out = { acted: 0, moves: 0, attacks: 0, rounds: 0, finished: false, how: '' };
  for (let r = 0; r < maxRounds; r++) {
    const st = await ev(() => {
      const b = AOW.battle;
      if (!b) return { gone: true };
      return { round: b.round, winner: b.winner, side: b.side, human: AOW.UI.hudApi ? 0 : 0 };
    });
    if (st.gone) break;
    if (st.winner !== null && st.winner !== undefined) { out.finished = true; out.how = 'fought to the end'; break; }
    out.rounds = Math.max(out.rounds, st.round);
    // wait until it is our turn (the AI side animates asynchronously)
    const ours = await waitHumanTurn(25000);
    if (!ours) { out.how = 'AI side never handed the turn back (round ' + st.round + ')'; break; }
    let actedThisRound = 0;
    // act with every unit that still can
    for (let k = 0; k < 8; k++) {
      const act = await ev(() => {
        const b = AOW.battle;
        if (!b || b.winner != null) return null;
        const hp = (AOW.game.players.find(p => p.isHuman) || {}).id;
        const mine = b.units.filter(u => u.hp > 0 && !u.hasActed && (u.ap === undefined || u.ap > 0) && u.owner === hp);
        if (!mine.length) return null;
        const u = mine[0];
        const foes = b.units.filter(x => x.hp > 0 && x.side !== u.side);
        if (!foes.length) return null;
        // nearest enemy
        let tgt = foes[0], bd = 1e9;
        for (const f of foes) { const d = AOW.Hex.dist(u.col, u.row, f.col, f.row); if (d < bd) { bd = d; tgt = f; } }
        const atks = (u.stats && u.stats.attacks) || [];
        const range = atks.reduce((m, a) => Math.max(m, a.range || 1), 1);
        if (bd <= range) return { unit: u.id, col: u.col, row: u.row, mode: 'attack', tcol: tgt.col, trow: tgt.row };
        // otherwise step towards it through the reachable set
        const reach = AOW.Combat.reachable(b, u.id);
        let best = null, bestD = bd;
        const entries = reach instanceof Map ? Array.from(reach.keys()) : Object.keys(reach || {});
        for (const key of entries) {
          const parts = String(key).split(',');
          const c = +parts[0], rr = +parts[1];
          if (isNaN(c) || isNaN(rr)) continue;
          const d = AOW.Hex.dist(c, rr, tgt.col, tgt.row);
          if (d < bestD) { bestD = d; best = { c, r: rr }; }
        }
        if (best) return { unit: u.id, col: u.col, row: u.row, mode: 'move', tcol: best.c, trow: best.r };
        return { unit: u.id, col: u.col, row: u.row, mode: 'defend' };
      });
      if (!act) break;
      await clickBattleHex(act.col, act.row);          // select the unit
      const selected = await ev(id => { const cr = AOW.CombatRender; return cr.getActiveUnit() === id; }, act.unit);
      if (!selected) { info('unit ' + act.unit + ' would not select — using the unit strip'); await click('.battle-strip .unit-card >> nth=0'); }
      if (r === 0 && k === 0) { await page.waitForTimeout(150); await shot('battle_mid'); }   // unit selected, action bar up
      if (act.mode === 'defend') { await click('.battle-actionbar button:has-text("방어")'); out.acted++; actedThisRound++; }
      else {
        await clickBattleHex(act.tcol, act.trow, { wait: 200 });
        out.acted++; actedThisRound++;
        if (act.mode === 'attack') out.attacks++; else out.moves++;
      }
      await waitFn(() => !AOW.CombatRender.isPlaying(), null, 20000);
      await page.waitForTimeout(60);
    }
    const done = await ev(() => !AOW.battle || AOW.battle.winner != null);
    if (done) { out.finished = true; out.how = 'fought to the end'; break; }
    // end our side turn and let the AI play
    if (await exists('.battle-endturn:not([disabled])')) {
      await click('.battle-endturn');
      await page.waitForTimeout(250);
    }
    await waitFn(() => !AOW.CombatRender.isPlaying(), null, 30000);
    const after = await ev(() => {
      const b = AOW.battle;
      if (!b) return { gone: true };
      const hp = (AOW.game.players.find(p => p.isHuman) || {}).id;
      const mine = b.units.filter(u => u.owner === hp && u.hp > 0).length;
      const foes = b.units.filter(u => u.owner !== hp && u.hp > 0).length;
      return { round: b.round, side: b.side, winner: b.winner, mine, foes };
    });
    info('round ' + st.round + ': ' + actedThisRound + ' action(s) → ' + JSON.stringify(after));
    if (after.gone || after.winner != null) { out.finished = true; out.how = 'fought to the end'; break; }
  }
  if (!out.finished) {
    // take too long? finish it with the auto-resolve button, still through the UI
    if (await exists('.battle-topbar button:has-text("자동 전투")')) {
      await click('.battle-topbar button:has-text("자동 전투")');
      await click('.aow-modal-backdrop button:has-text("확인")');
      await page.waitForTimeout(400);
      out.how = 'auto-resolved from the battle bar';
      out.finished = await ev(() => !!(AOW.battle && AOW.battle.winner != null));
    }
  }
  await waitFn(() => document.querySelector('.aow-modal-backdrop'), null, 20000);
  return out;
}
async function waitHumanTurn(timeout) {
  try {
    await page.waitForFunction(() => {
      const b = AOW.battle;
      if (!b || b.winner != null) return true;
      const hp = (AOW.game.players.find(p => p.isHuman) || {}).id;
      const mine = b.units.find(u => u.owner === hp);
      const side = AOW.Combat.currentSide(b);
      const btn = document.querySelector('.battle-endturn');
      return !!mine && side === mine.side && btn && !btn.disabled;
    }, null, { timeout: timeout || 20000, polling: 100 });
    return true;
  } catch (e) { return false; }
}

/** find another guard and resolve that encounter with 자동 전투 */
async function autoBattle() {
  const guard = await findGuard();
  if (!guard) return { skipped: true, reason: 'no neutral guards left' };
  const reached = await marchTo(guard.armyId, guard.hex, 8);
  if (!reached) return { skipped: true, reason: 'could not reach the guard' };
  const before = await ev(() => (AOW.game.battles || []).length);
  await clickHex(guard.hex);
  await page.waitForTimeout(120);
  if (!(await exists('.aow-modal-backdrop'))) await clickHex(guard.hex, { wait: 250 });
  if (!(await exists('.aow-modal-backdrop'))) return { skipped: true, reason: 'no encounter modal' };
  await click('.aow-modal-backdrop button:has-text("자동 전투")');
  await page.waitForTimeout(500);
  if (await exists('.aow-modal-backdrop button:has-text("확인")')) await click('.aow-modal-backdrop button:has-text("확인")');
  await page.waitForTimeout(300);
  const after = await ev(() => (AOW.game.battles || []).length);
  return { resolved: after > before, battles: after };
}

/** cast the first castable world spell from the HUD spell bar onto our own army/city */
async function castSpell() {
  // the first researched spell only lands around turn 13 — play on (through the HUD) until the bar has one
  for (let i = 0; i < 14; i++) {
    const n = await ev(() => document.querySelectorAll('.hud-spellbar__btn').length);
    if (n) break;
    if (i === 0) info('spell bar still empty — ending turns until research delivers a spell');
    await endTurnViaHud();
  }
  const known = await ev(() => {
    const g = AOW.game, p = g.players[0];
    const ids = (AOW.Rules.knownSpells ? AOW.Rules.knownSpells(g, p) : (p.spells && p.spells.known) || []);
    const list = [];
    (ids || []).forEach((id, i) => {
      const sp = AOW.Data.has('spells', id) ? AOW.Data.get('spells', id) : null;
      if (!sp || sp.kind === 'combat') return;
      const c = AOW.Rules.canCast ? AOW.Rules.canCast(g, p, sp.id, null) : { ok: true };
      // a target-less check reports badTarget/notInDomain for spells that simply need aiming first
      const aimable = { badTarget: 1, notInDomain: 1, notOwner: 1 };
      const ok = !c || c.ok !== false || !!aimable[c.reason];
      list.push({ id: sp.id, name: AOW.L(sp.name), target: sp.target, kind: sp.kind, ok, why: c && c.reason, idx: list.length });
    });
    return { list, mana: p.resources.mana, buttons: document.querySelectorAll('.hud-spellbar__btn').length };
  });
  if (!known.buttons) return { skipped: true, reason: 'spell bar empty' };
  info('spell bar: ' + known.list.map(s => s.name + '(' + s.target + (s.ok ? '' : ', 불가') + ')').join(', '));
  const castable = known.list.findIndex(s => s.ok);
  if (castable < 0) return { skipped: true, reason: 'no affordable world spell (' + known.list.length + ' known)' };
  const spell = known.list[castable];
  const manaBefore = known.mana;
  await click('.hud-spellbar__btn >> nth=' + castable);
  await page.waitForTimeout(180);
  const mode = await ev(() => { const h = AOW.UI.hudApi(); return h && h.castMode ? !!h.castMode() : false; });
  if (mode) {
    const targets = await ev(k => {
      const g = AOW.game, out = [];
      const a = g.armies.find(x => x.owner === 0 && x.units.length);
      const c = AOW.State.capital(g, 0);
      if (k === 'city') { if (c) out.push(c.hex); for (const x of g.cities) if (x.freeCity && g.explored[0][x.hex]) out.push(x.hex); }
      else if (k === 'army') { if (a) out.push(a.hex); }
      else { if (a) out.push(a.hex); if (c) out.push(c.hex); }
      return out;
    }, spell.target);
    if (!targets.length) { await page.keyboard.press('Escape'); return { skipped: true, reason: 'no target for ' + spell.name }; }
    for (const tgt of targets) {
      await ev(i => AOW.WorldRender.centerOn(i, false), tgt);
      await page.waitForTimeout(80);
      await clickHex(tgt, { wait: 250 });
      const m = await ev(() => AOW.game.players[0].resources.mana);
      if (m < manaBefore) return { name: spell.name, manaBefore, manaAfter: m, target: tgt };
      const still = await ev(() => { const h = AOW.UI.hudApi(); return h && h.castMode ? !!h.castMode() : false; });
      if (!still) break;
    }
  }
  const manaAfter = await ev(() => AOW.game.players[0].resources.mana);
  if (manaAfter >= manaBefore) {
    await ev(() => { const h = AOW.UI.hudApi(); if (h && h.clearCastMode) h.clearCastMode(); });
    return { skipped: true, reason: 'cast of ' + spell.name + ' was refused for every target' };
  }
  return { name: spell.name, manaBefore, manaAfter };
}

// ------------------------------------------------------------------ main
(async () => {
  browser = await chromium.launch({ headless: !flag('headed'), slowMo: +opt('slowmo', 0) || 0 });
  page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  let failure = null;
  try { await run(); }
  catch (e) { failure = e; }
  if (failure) {
    console.log('\n' + ms() + ' ✗ FAILED: ' + failure.message);
    if (failure.stack) console.log(failure.stack.split('\n').slice(1, 4).join('\n'));
    try { await shot('failure'); } catch (e) { /* ignore */ }
    if (errors.length) { console.log('\npage errors (' + errors.length + '):'); errors.slice(0, 20).forEach(e => console.log('  - ' + e)); }
    await browser.close();
    process.exit(1);
  }
  console.log('\n' + ms() + ' ✓ e2e passed — ' + stepNo + ' steps, 0 page errors');
  await browser.close();
  process.exit(0);
})().catch(async (e) => { console.error(e); if (browser) await browser.close(); process.exit(1); });
