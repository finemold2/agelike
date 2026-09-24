#!/usr/bin/env node
// tools/e2e.js — human-flow end-to-end test (Playwright). Plays a real game through the DOM + canvas UI:
// menu → new game → faction creation → army selection/movement → city → research/screens → end turns →
// a tactical battle fought through the battle UI → an auto-resolved battle → world spell → save/reload → fast turns,
// then a second pass over the secondary flows: notifications/toasts, settings, English UI (every screen, persisted
// over a reload), music, hero progression, wonder clearing, city growth + tier-2 recruits, outposts, free cities,
// empire skills + tome gating, a 1280×720 layout check, world-render timing and the victory screen.
//
// Every interaction goes through the real UI: DOM clicks on real selectors (page.click) and mouse clicks at
// screen coordinates obtained from AOW.WorldRender.hexToScreen / AOW.CombatRender.hexToScreen. page.evaluate
// is only used for READ-ONLY state queries, plus three deliberate exceptions: muting the audio at boot,
// scrolling the camera to a hex that is off-screen or under HUD chrome (WorldRender.centerOn), and the final
// "25 fast turns" loop. A regression in the UI wiring therefore fails the test instead of being bypassed.
// The secondary pass additionally uses AOW.Debug / direct state writes for SETUP ONLY (teleport a stack next to a
// wonder, weaken its guards, top up resources/xp, finish a queue item, knock the rivals out) — the action under
// test itself (attack, learn, gift, buy, build, recruit, found, upgrade, end turn, continue) is always a UI click.
//
// usage: node tools/e2e.js [--seed NAME] [--headed] [--slowmo MS] [--timeout MS] [--no-shots] [--only secondary]
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
const ONLY = opt('only', null);          // 'secondary' → boot + the secondary pass only (faster iteration)

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
  await bootFlow();
  if (ONLY !== 'secondary') await mainFlow();
  await secondaryFlow();
  step('Summary');
  assert(errors.length === 0, 'no page errors during the whole run');
}

async function bootFlow() {
  // ---------------------------------------------------------------- 1. boot + menu + faction
  step('Load index.html and reach the main menu');
  await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'load' });
  await waitFn(() => !!(window.AOW && AOW.UI && AOW.UI.currentScreen() === 'menu'));
  await ev(() => { try { AOW.Audio.setMuted(true); } catch (e) { /* audio optional */ } });
  assert(await exists('.aow-screen[data-screen="menu"] .mm-title'), 'main menu is visible');
  await shot('menu');

  step('새 게임 → new game setup → 세력 생성 → faction creator');
  const musicBefore = await ev(() => AOW.Music.isPlaying());
  await click('.aow-screen[data-screen="menu"] button:has-text("새 게임")');
  await waitFn(() => AOW.UI.currentScreen() === 'newgame');
  // the first click unlocks audio and starts the mood playlist
  await waitFn(() => AOW.Music.isPlaying() && !!(AOW.Music.nowPlaying() || {}).title, null, 2000);
  const np = await ev(() => ({ title: AOW.L(AOW.Music.nowPlaying().title), mood: AOW.Music.getMood() }));
  assert(!musicBefore, 'no music before the first user gesture');
  assert(!!np.title, 'music started on the first click: "' + np.title + '" (mood ' + np.mood + ')');
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
}

async function mainFlow() {
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
  let camPost = await ev(() => ({ x: Math.round(AOW.WorldRender.camera.x), y: Math.round(AOW.WorldRender.camera.y) }));
  if (camPre.x === camPost.x && camPre.y === camPost.y) {
    // the spot may already be where the (map-clamped) camera sits — try the opposite corner once
    await page.locator('.hud-minimap canvas').click({ position: { x: 40, y: 30 } });
    await page.waitForTimeout(200);
    camPost = await ev(() => ({ x: Math.round(AOW.WorldRender.camera.x), y: Math.round(AOW.WorldRender.camera.y) }));
  }
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
    // a notification may open its screen (research, hero, empire…) — back to the map
    if (await ev(() => AOW.UI.currentScreen() !== 'hud')) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
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
}

// ================================================================== secondary flows
/**
 * In-page scan of the visible UI (and every tooltip's content) for raw i18n keys ("hud.endTurn") and — in
 * English mode — Korean text that is UI chrome rather than a proper name (realm/ruler/city/hero/unit names are
 * whitelisted: they are player data, not translations). Runs inside the page.
 */
function SCAN_UI(o) {
  const g = AOW.game;
  const names = ['검증 왕국', '검증관 아리스', '한국어', '신들의 시대'];
  if (g) {
    for (const p of g.players) names.push(p.name, p.rulerName);
    for (const c of g.cities) names.push(c.name);
    for (const h of g.heroes || []) names.push(h.name);
    for (const u of g.units) if (u.name) names.push(u.name);
  }
  const nm = names.filter(Boolean).sort((a, b) => b.length - a.length);
  const RAW = /^[a-z]+\.[a-zA-Z_][a-zA-Z_.0-9]*$/;
  const RAW_IN = /(?:^|[\s(\[:·])([a-z]+\.[a-z][a-zA-Z_]*(?:\.[a-zA-Z_0-9]+)*)(?=$|[\s),:·\]])/g;
  const HANGUL = /[가-힣]/;
  const strip = s => { let r = s; for (const x of nm) r = r.split(x).join(''); return r; };
  const raw = [], korean = [];
  const root = document.getElementById('ui');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode, s = n.nodeValue.trim();
    if (!s) continue;
    const el = n.parentElement; if (!el || el.closest('#toast-layer')) continue;
    const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (RAW.test(s)) raw.push(s);
    if (s.length <= 2 && nm.some(x => x.startsWith(s))) continue;      // a realm banner's initial
    if (o && o.en && HANGUL.test(strip(s))) korean.push(s.slice(0, 70) + ' <' + (el.className || el.tagName) + '>');
  }
  for (const e of root.querySelectorAll('*')) {
    if (!e._aowTip) continue;
    let c = e._aowTip;
    try { if (typeof c === 'function') c = c(); } catch (err) { raw.push('tooltip threw: ' + err.message); continue; }
    if (!c) continue;
    const d = document.createElement('div');
    if (c instanceof Node) d.appendChild(c.cloneNode(true)); else d.innerHTML = String(c);
    const txt = d.textContent;
    let m; RAW_IN.lastIndex = 0;
    while ((m = RAW_IN.exec(txt))) raw.push('tooltip: ' + m[1]);
    if (o && o.en && HANGUL.test(strip(txt))) korean.push('tooltip: ' + txt.slice(0, 70));
  }
  return { raw: Array.from(new Set(raw)).slice(0, 12), korean: Array.from(new Set(korean)).slice(0, 12) };
}
async function assertCleanUi(label, en) {
  const r = await ev(SCAN_UI, { en: !!en });
  assert(!r.raw.length, label + ': no raw i18n keys' + (r.raw.length ? ' — found ' + JSON.stringify(r.raw) : ''));
  if (en) assert(!r.korean.length, label + ': no Korean UI text in English mode' + (r.korean.length ? ' — found ' + JSON.stringify(r.korean) : ''));
}
/** close modals and screens until only the HUD is up */
async function ensureHud() {
  await dismissModals('ensure HUD');
  for (let i = 0; i < 6 && (await ev(() => AOW.UI.currentScreen())) !== 'hud'; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(120); }
  await dismissModals('ensure HUD');
  if ((await ev(() => AOW.UI.currentScreen())) !== 'hud') fail('could not get back to the HUD (screen ' + (await ev(() => AOW.UI.currentScreen())) + ')');
}
async function openNav(idx, screen) {
  await click('.hud-nav .aow-btn--nav >> nth=' + idx);
  await waitFn(s => AOW.UI.isOpen(s), screen);
  await page.waitForTimeout(120);
  // mid-way through the open animation the panel must already have its real width (it used to collapse to a
  // couple of pixels while the pop animation's transform made the empty wrapper its containing block)
  const w = await ev(s => Math.max(0, ...Array.from(document.querySelectorAll('.aow-screen[data-screen="' + s + '"] .aow-panel')).map(e => e.getBoundingClientRect().width)), screen);
  if (w < 300) fail(screen + ' panel collapsed to ' + Math.round(w) + 'px while opening');
}
async function closeScreenEsc(screen) {
  await page.keyboard.press('Escape');
  await waitFn(s => !AOW.UI.isOpen(s), screen);
}
/** the ruler's army, respawning the ruler first (end turns) when it has fallen */
async function rulerArmy() {
  for (let i = 0; i < 6; i++) {
    const r = await ev(() => {
      const g = AOW.game, hp = g.players.find(p => p.isHuman).id;
      const h = g.heroes.find(x => x.owner === hp && x.isRuler);
      if (!h || h.dead) return { dead: true };
      const u = AOW.State.unit(g, h.unitId), a = u ? AOW.State.army(g, u.armyId) : null;
      return a ? { heroId: h.id, unitId: u.id, armyId: a.id, hex: a.hex } : { dead: true };
    });
    if (!r.dead) return r;
    info('the ruler has fallen — ending a turn for the respawn');
    await endTurnViaHud();
  }
  fail('the ruler never came back');
}
/** free passable land hex next to `hex` (no army, no structure), nearest to `near` */
function freeNeighbourJs(q) {
  const g = AOW.game;
  let best = -1, bd = 1e9;
  for (const n of AOW.Hex.neighborsIdx(q.hex, g.W, g.H)) {
    if (n < 0 || AOW.State.isWater(g, n) || g.structure[n] >= 0 || AOW.State.armiesAt(g, n).length) continue;
    if (!isFinite(AOW.State.hexMoveCost(g, n, 'walk'))) continue;
    // not next to some other hostile stack (the move/attack must target exactly our goal)
    if (AOW.Hex.neighborsIdx(n, g.W, g.H).some(m => m >= 0 && m !== q.hex && AOW.State.armiesAt(g, m).some(a => a.owner !== q.pid && a.units.length))) continue;
    const d = q.near >= 0 ? AOW.Hex.distIdx(n, q.near, g.W) : 0;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
async function teleportNextTo(armyId, hex) {
  const to = await ev(q => {
    const g = AOW.game, a = AOW.State.army(g, q.armyId);
    const f = new Function('q', 'return (' + q.src + ')(q)');
    const n = f({ hex: q.hex, near: a.hex, pid: a.owner });
    if (n < 0) return -1;
    AOW.Debug.teleportArmy(a.id, n);
    a.mp = AOW.Rules.armyMaxMp(g, a); a.defending = false; a.sleeping = false;
    AOW.WorldRender.centerOn(n, false);
    return n;
  }, { armyId, hex, src: freeNeighbourJs.toString() });
  if (to < 0) fail('no free hex next to ' + hex);
  await page.waitForTimeout(120);
  return to;
}

async function secondaryFlow() {
  await ensureHud();
  const HP = await ev(() => AOW.game.players.find(p => p.isHuman).id);

  // ---------------------------------------------------------------- A. notifications & toasts
  step('Notifications: only our realm’s news, natural Korean particles, at most 3 centre toasts');
  const josa = await ev(() => {
    const J = AOW.I18n.josa;
    return [J('오크 전사', '이/가'), J('도적 두목', '이/가'), J('조약', '을/를'), J('평화 협정', '을/를'), J('병사', '으로/로'), J('고참병', '으로/로'), J('마을', '으로/로'), J('하늘성', '과/와'), J('별의 회의', '과/와'), J(7, '으로/로')].join(' ');
  });
  assert(josa === '오크 전사가 도적 두목이 조약을 평화 협정을 병사로 고참병으로 마을로 하늘성과 별의 회의와 7로', 'I18n.josa picks the particle from the last syllable: ' + josa);
  const tpl = await ev(() => AOW.t('dip.msg.peace', { a: '검증 왕국', b: '별의 회의' }));
  assert(tpl === '검증 왕국과 별의 회의가 평화를 맺었습니다.', '{name:과/와} template placeholders resolve: ' + tpl);
  await ev(() => {
    window.__toasts = { max: 0, texts: [] };
    const layer = document.getElementById('toast-layer');
    const live = () => layer.querySelectorAll('.aow-toast:not(.aow-toast--out)').length;
    if (window.__toastObs) window.__toastObs.disconnect();
    window.__toastObs = new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) if (n.classList && n.classList.contains('aow-toast')) window.__toasts.texts.push(n.textContent.replace('×', '').trim());
      window.__toasts.max = Math.max(window.__toasts.max, live());
    });
    window.__toastObs.observe(layer, { childList: true });
  });
  for (let i = 0; i < 3; i++) await endTurnViaHud();
  const nt = await ev(hp => {
    const g = AOW.game;
    const txt = n => (typeof n.text === 'object' ? (n.text.ko || '') : String(n.text || ''));
    const foreign = g.notifications.filter(n => n.pid !== hp && n.pid !== -1);
    const hedged = g.notifications.filter(n => /이\(가\)|을\(를\)|은\(는\)|\(으\)로|과\(와\)/.test(txt(n))).map(txt);
    const ranks = g.notifications.filter(n => /승급했습니다/.test(txt(n)));
    const listTexts = Array.from(document.querySelectorAll('.hud-notif__text')).map(e => e.textContent);
    return {
      total: g.notifications.length, foreign: foreign.length, hedged, ranks: ranks.length, ranksLowOwn: ranks.every(n => n.low && n.pid === hp),
      list: listTexts.length, listHedged: listTexts.filter(s => /\((가|를|는|으)\)|\(와\)/.test(s)),
      toasts: window.__toasts, live: document.querySelectorAll('#toast-layer .aow-toast:not(.aow-toast--out)').length,
    };
  }, HP);
  info(nt.total + ' notifications stored, ' + nt.list + ' in the HUD list, ' + nt.toasts.texts.length + ' toasts shown: ' + JSON.stringify(nt.toasts.texts.slice(-6)));
  assert(nt.foreign === 0, 'every stored notification is ours or a world event (' + nt.foreign + ' foreign)');
  assert(!nt.hedged.length && !nt.listHedged.length, 'no hedged "이(가)/을(를)" particles in the feed' + (nt.hedged.length ? ': ' + nt.hedged[0] : ''));
  assert(nt.ranksLowOwn, nt.ranks + ' rank-up notice(s), all our own units and all list-only (low priority)');
  assert(nt.toasts.max <= 3, 'at most 3 centre toasts at once (peak ' + nt.toasts.max + ')');
  assert(!nt.toasts.texts.some(s => /승급했습니다|완공|모집 완료|늘었습니다/.test(s)), 'rank-ups / production / growth stay out of the centre toasts');
  await page.waitForTimeout(5300);
  assert(await ev(() => document.querySelectorAll('#toast-layer .aow-toast:not(.aow-toast--out)').length) === 0, 'centre toasts auto-dismiss within 5 s');
  await ev(() => { if (window.__toastObs) window.__toastObs.disconnect(); });
  assertNoErrors(0, 'notifications');

  // ---------------------------------------------------------------- B. settings
  step('Settings: sliders, mute and game toggles drive AOW.Audio / UI.settings');
  await openNav(6, 'settings');
  const SS = '.aow-screen[data-screen="settings"] ';
  const music = page.locator(SS + '.aow-slider').nth(1);
  await music.focus();
  await page.keyboard.press('Home');
  assert(await ev(() => AOW.Audio.getVolume().music) === 0, 'music slider → Home: music volume 0');
  await page.keyboard.press('End');
  assert(await ev(() => AOW.Audio.getVolume().music) === 1, 'music slider → End: music volume 1');
  for (let i = 0; i < 25; i++) await page.keyboard.press('ArrowLeft');
  const vol = await ev(() => ({ v: AOW.Audio.getVolume(), label: document.querySelectorAll('.aow-screen[data-screen="settings"] .settings-val')[1].textContent, stored: JSON.parse(localStorage.getItem('aow.audio') || '{}').music }));
  assert(Math.abs(vol.v.music - 0.75) < 0.011 && vol.label === '75%', 'arrow keys step the music volume to ' + vol.v.music + ' (label ' + vol.label + ')');
  assert(Math.abs(vol.stored - 0.75) < 0.011, 'volume persisted to localStorage (aow.audio.music = ' + vol.stored + ')');
  await page.locator(SS + '.aow-slider').nth(2).focus();
  await page.keyboard.press('Home');
  assert(await ev(() => AOW.Audio.getVolume().sfx) === 0, 'sfx slider drives the sfx volume');
  await page.keyboard.press('End');
  const muted0 = await ev(() => AOW.Audio.isMuted());
  await click(SS + 'label.aow-check:has-text("음소거")');
  assert(await ev(() => AOW.Audio.isMuted()) === !muted0, 'mute checkbox toggles AOW.Audio mute (' + muted0 + ' → ' + !muted0 + ')');
  await click(SS + 'label.aow-check:has-text("음소거")');
  assert(await ev(() => AOW.Audio.isMuted()) === muted0, 'and back');
  const es0 = await ev(() => AOW.UI.settings.edgeScroll);
  await click(SS + 'label.aow-check:has-text("가장자리")');
  const es1 = await ev(() => ({ v: AOW.UI.settings.edgeScroll, stored: JSON.parse(localStorage.getItem('aow.ui') || '{}').edgeScroll }));
  assert(es1.v === !es0 && es1.stored === !es0, 'edge-scroll toggle updates UI.settings and localStorage (' + es0 + ' → ' + es1.v + ')');
  await click(SS + 'label.aow-check:has-text("가장자리")');
  await click(SS + '.aow-segment button:has-text("2×")');
  assert(await ev(() => AOW.UI.settings.animSpeed) === 2, 'animation speed segment → 2×');
  await click(SS + '.aow-segment button:has-text("1×")');
  await shot('settings');

  // ---------------------------------------------------------------- C. English UI
  step('English: switch in settings → HUD and every screen without raw keys or Korean chrome');
  await click(SS + '.aow-segment button:has-text("English")');
  await waitFn(() => AOW.I18n.lang === 'en' && /Settings/.test((document.querySelector('.aow-screen[data-screen="settings"] .aow-panel__title') || {}).textContent || ''));
  ok('language switched; the settings panel re-rendered in English');
  await ev(() => AOW.UI.clearToasts());
  await assertCleanUi('settings (en)', true);
  await closeScreenEsc('settings');
  await assertCleanUi('HUD (en)', true);
  assert((await textOf('.hud-endturn')).indexOf('End Turn') >= 0, 'end-turn button reads "End Turn"');
  const EN_NAV = [{ idx: 0, s: 'cities' }, { idx: 1, s: 'research' }, { idx: 2, s: 'spellbook' }, { idx: 3, s: 'empire' }, { idx: 4, s: 'hero' }, { idx: 5, s: 'diplomacy' }];
  for (const n of EN_NAV) {
    await openNav(n.idx, n.s);
    await assertCleanUi(n.s + ' (en)', true);
    if (n.s === 'research' && await exists('.aow-screen[data-screen="research"] .sc-book.locked')) {
      await click('.aow-screen[data-screen="research"] .sc-book.locked >> nth=0');
      await page.waitForTimeout(120);
      await assertCleanUi('research, locked tome (en)', true);
    }
    if (n.s === 'hero') await shot('hero_en');
    await closeScreenEsc(n.s);
  }
  const capE = await ev(() => { const c = AOW.State.capital(AOW.game, AOW.game.players.find(p => p.isHuman).id); return { hex: c.hex, id: c.id }; });
  assert(await selectCityByClick(capE.hex, capE.id), 'capital selected');
  await assertCleanUi('HUD city panel (en)', true);
  await click('.hud-selection button:has-text("Open city")');
  await waitFn(() => AOW.UI.isOpen('city'));
  const tabsN = await page.locator('.aow-screen[data-screen="city"] .sc-tab').count();
  for (let i = 0; i < tabsN; i++) {
    await click('.aow-screen[data-screen="city"] .sc-tab >> nth=' + i);
    await page.waitForTimeout(100);
    await assertCleanUi('city tab ' + (i + 1) + '/' + tabsN + ' (en)', true);
  }
  await shot('city_en');
  await closeScreenEsc('city');
  assertNoErrors(0, 'English UI');

  // ---------------------------------------------------------------- D. persistence over a reload + menu screens
  step('English persists over a reload: menu / new game / faction in English, music restarts, Continue');
  await page.keyboard.press('F5');
  await waitFn(() => AOW.Main.hasSave('quick'));
  const savedTurn = await ev(() => AOW.game.turn);
  await page.reload({ waitUntil: 'load' });
  await waitFn(() => !!(window.AOW && AOW.UI && AOW.UI.currentScreen() === 'menu'));
  await ev(() => { try { AOW.Audio.setMuted(true); } catch (e) { /* optional */ } });
  assert(await ev(() => AOW.I18n.lang) === 'en', 'language restored from localStorage after the reload');
  await assertCleanUi('main menu (en)', true);
  assert(!(await ev(() => AOW.Music.isPlaying())), 'music waits for a gesture after the reload');
  await click('.aow-screen[data-screen="menu"] button:has-text("New Game")');
  await waitFn(() => AOW.UI.currentScreen() === 'newgame');
  await waitFn(() => AOW.Music.isPlaying() && !!(AOW.Music.nowPlaying() || {}).title, null, 2000);
  ok('music playing within 2 s of the first click: "' + (await ev(() => AOW.L(AOW.Music.nowPlaying().title))) + '"');
  await assertCleanUi('new game (en)', true);
  await click('.aow-screen[data-screen="newgame"] button:has-text("Create Faction")');
  await waitFn(() => AOW.UI.currentScreen() === 'faction');
  const fTabs = await page.locator('.aow-screen[data-screen="faction"] .fw-tab').count();
  for (let i = 0; i < fTabs; i++) {
    await click('.aow-screen[data-screen="faction"] .fw-tab >> nth=' + i);
    await page.waitForTimeout(100);
    await assertCleanUi('faction tab ' + (i + 1) + '/' + fTabs + ' (en)', true);
  }
  await shot('faction_en');
  await page.keyboard.press('Escape');
  await waitFn(() => AOW.UI.currentScreen() === 'newgame');
  await page.keyboard.press('Escape');
  await waitFn(() => AOW.UI.currentScreen() === 'menu');
  await click('.aow-screen[data-screen="menu"] button:has-text("Continue")');
  await waitFn(() => !!window.AOW.game && AOW.UI.currentScreen() === 'hud');
  assert(await ev(() => AOW.game.turn) === savedTurn, 'Continue restored turn ' + savedTurn);
  await dismissModals('after continue');

  step('Back to Korean through the settings screen');
  await openNav(6, 'settings');
  await click(SS + '.aow-segment button:has-text("한국어")');
  await waitFn(() => AOW.I18n.lang === 'ko');
  await closeScreenEsc('settings');
  assert((await textOf('.hud-endturn')).indexOf('턴 종료') >= 0, 'HUD back in Korean ("턴 종료")');
  await assertCleanUi('HUD (ko)', false);

  // ---------------------------------------------------------------- E. wonder clearing (+ battle music, hero xp)
  step('Wonder: bring the ruler’s army to a guarded wonder and clear it through the battle UI');
  let ra = await rulerArmy();
  const wonder = await ev(q => {
    const g = AOW.game, a = AOW.State.army(g, q.armyId);
    let best = null;
    for (const st of g.structures) {
      if (!st || st.kind !== 'wonder' || st.cleared) continue;
      const guard = AOW.State.army(g, st.guardArmyId);
      if (!guard || !guard.units.length) continue;
      const d = AOW.Hex.distIdx(a.hex, st.hex, g.W);
      if (!best || d < best.d) best = { id: st.id, hex: st.hex, guard: guard.id, d, name: AOW.L(AOW.Data.get('wonders', st.refId).name) };
    }
    return best;
  }, ra);
  assert(!!wonder, 'found an uncleared, guarded wonder: ' + (wonder && wonder.name) + ' (' + (wonder && wonder.d) + ' hexes away)');
  const from = await teleportNextTo(ra.armyId, wonder.hex);
  await ev(q => AOW.Debug.weakenArmy(q.guard, 1), wonder);   // (the teleport's vision update reveals the wonder)
  const before = await ev(q => {
    const g = AOW.game, p = g.players.find(x => x.isHuman), h = AOW.State.hero(g, q.heroId);
    let xpTotal = h.xp; for (let l = 1; l < h.level; l++) xpTotal += AOW.Rules.heroXpForLevel(l);
    return { gold: p.resources.gold, mana: p.resources.mana, imperium: p.resources.imperium, knowledge: p.resources.knowledge, items: (p.items || []).slice(), xpTotal, level: h.level };
  }, ra);
  info('setup: army #' + ra.armyId + ' placed at ' + from + ', guards weakened to 1 hp');
  assert(await selectArmyByClick(from, ra.armyId), 'ruler’s army selected by clicking its hex');
  await clickHex(wonder.hex);
  await page.waitForTimeout(120);
  if (!(await exists('.aow-modal-backdrop'))) await clickHex(wonder.hex, { wait: 250 });
  assert(await exists('.aow-modal-backdrop button:has-text("공격")'), 'encounter modal offers 공격');
  await click('.aow-modal-backdrop button:has-text("공격")');
  await waitFn(() => AOW.UI.isOpen('battle') && !!AOW.battle);
  await page.waitForTimeout(300);
  const mood1 = await ev(() => ({ mood: AOW.Music.getMood(), playing: AOW.Music.isPlaying(), fits: AOW.Music.fitsMood('battle'), song: AOW.Music.nowPlaying() && AOW.L(AOW.Music.nowPlaying().title) }));
  assert(mood1.mood === 'battle', 'music mood switched to battle when the battle opened');
  assert(!mood1.playing || mood1.fits, 'the playing piece suits the battle mood ("' + mood1.song + '")');
  const wb = await playBattle(0);          // the main flow fights by hand; here the battle bar’s 자동 전투 finishes it
  info(JSON.stringify(wb));
  assert(wb.finished, 'wonder battle finished (' + wb.how + ')');
  await shot('wonder_battle');
  await click('.aow-modal-backdrop button:has-text("확인")');
  await waitFn(() => !AOW.UI.isOpen('battle') && !AOW.battle);
  const mood2 = await ev(() => ({ mood: AOW.Music.getMood(), playing: AOW.Music.isPlaying(), fits: AOW.Music.fitsMood('peace') }));
  assert(mood2.mood === 'peace' && (!mood2.playing || mood2.fits), 'music mood back to peace after the battle');
  const after = await ev(q => {
    const g = AOW.game, p = g.players.find(x => x.isHuman), st = g.structures[q.w.id], h = AOW.State.hero(g, q.r.heroId);
    let xpTotal = h.xp; for (let l = 1; l < h.level; l++) xpTotal += AOW.Rules.heroXpForLevel(l);
    return { cleared: !!st.cleared, gold: p.resources.gold, mana: p.resources.mana, imperium: p.resources.imperium, knowledge: p.resources.knowledge, items: (p.items || []).slice(), xpTotal, level: h.level, dead: h.dead,
      note: (g.notifications.filter(n => n.ref && n.ref.structureId === q.w.id).pop() || {}).text };
  }, { w: wonder, r: ra });
  assert(after.cleared, 'the wonder is marked cleared');
  assert(after.gold > before.gold && after.imperium > before.imperium, 'rewards paid: gold ' + before.gold + ' → ' + after.gold + ', imperium ' + before.imperium + ' → ' + after.imperium);
  assert(after.note && /정복했습니다/.test(after.note.ko), 'clearing notice lists the spoils: "' + (after.note && after.note.ko) + '"');
  if (!after.dead) assert(after.xpTotal > before.xpTotal, 'the ruler gained xp from the battle (' + before.xpTotal + ' → ' + after.xpTotal + ')');
  info('loot: ' + (after.items.length - before.items.length) + ' new item(s) ' + JSON.stringify(after.items.slice(before.items.length)));
  assertNoErrors(0, 'wonder clearing');

  // ---------------------------------------------------------------- F. hero progression + equipment
  step('Hero: level up, learn a skill in the hero screen, equip loot');
  ra = await rulerArmy();
  const lvl = await ev(q => {
    const g = AOW.game, h = AOW.State.hero(g, q.heroId), u = AOW.State.unit(g, h.unitId);
    const level0 = h.level;
    AOW.Rules.grantXp(g, u, AOW.Rules.heroXpToNext(g, h) + 1);    // setup: enough xp for the next level
    return { level0, level: h.level, sp: h.skillPoints };
  }, ra);
  assert(lvl.level > lvl.level0 && lvl.sp > 0, 'forced xp: level ' + lvl.level0 + ' → ' + lvl.level + ', ' + lvl.sp + ' skill point(s)');
  await openNav(4, 'hero');
  const HS = '.aow-screen[data-screen="hero"] ';
  const pick = await ev(q => {
    const g = AOW.game, h = AOW.State.hero(g, q.heroId);
    const statKeys = ['hp', 'def', 'res', 'damage', 'dmg', 'mp', 'hpPct', 'defense', 'resistance', 'meleeDmg', 'rangedDmg'];
    const ids = Array.from(document.querySelectorAll('.aow-screen[data-screen="hero"] .sc-skill.available[data-skill]')).map(e => e.dataset.skill).filter(id => !(h.skills || []).includes(id));
    const withStats = ids.find(id => { const sk = AOW.Data.get('heroSkills', id); return sk && sk.effects && Object.keys(sk.effects).some(k => statKeys.includes(k)); });
    const st = AOW.Rules.heroStats(g, h);
    return { id: withStats || ids[0] || null, n: ids.length, stats: JSON.stringify({ hp: st.maxHp, def: st.def, res: st.res, mp: st.mp, atk: (st.attacks || []).map(a => a.damage), ab: (st.abilities || []).length, pa: (st.passives || []).length }), skills: (h.skills || []).length, sp: h.skillPoints };
  }, ra);
  assert(!!pick.id, pick.n + ' skill(s) can be learned — picking ' + pick.id);
  await click(HS + '.sc-skill[data-skill="' + pick.id + '"] button');
  await page.waitForTimeout(200);
  const learned = await ev(q => {
    const g = AOW.game, h = AOW.State.hero(g, q.heroId), st = AOW.Rules.heroStats(g, h);
    return { skills: (h.skills || []).length, has: (h.skills || []).includes(q.id), sp: h.skillPoints, stats: JSON.stringify({ hp: st.maxHp, def: st.def, res: st.res, mp: st.mp, atk: (st.attacks || []).map(a => a.damage), ab: (st.abilities || []).length, pa: (st.passives || []).length }),
      badge: !!document.querySelector('.aow-screen[data-screen="hero"] .sc-skill[data-skill="' + q.id + '"].learned') };
  }, { heroId: ra.heroId, id: pick.id });
  assert(learned.has && learned.skills === pick.skills + 1 && learned.sp === pick.sp - 1, 'skill learned through the UI (skills ' + pick.skills + ' → ' + learned.skills + ', points ' + pick.sp + ' → ' + learned.sp + ')');
  assert(learned.badge, 'its card now shows as learned');
  assert(learned.stats !== pick.stats, 'Rules.heroStats changed: ' + pick.stats + ' → ' + learned.stats);
  await shot('hero');
  const loot = await ev(q => {
    const g = AOW.game, p = g.players.find(x => x.isHuman), h = AOW.State.hero(g, q.heroId);
    const cls = AOW.Data.has('heroClasses', h.classId) ? AOW.Data.get('heroClasses', h.classId) : null;
    for (const id of p.items || []) {
      const it = AOW.Data.get('items', id); if (!it) continue;
      if (it.weaponType && cls && cls.allowedWeapons && cls.allowedWeapons.length && !cls.allowedWeapons.includes(it.weaponType)) continue;
      return { id, slot: it.slot, name: AOW.L(it.name) };
    }
    return null;
  }, ra);
  if (!loot) info('no equippable item in the vault — equip skipped');
  else {
    await click(HS + '.sc-row[data-item="' + loot.id + '"] button:has-text("장착")');
    await page.waitForTimeout(150);
    const eq = await ev(q => { const h = AOW.State.hero(AOW.game, q.heroId); return h.items && h.items[q.slot]; }, { heroId: ra.heroId, slot: loot.slot });
    assert(eq === loot.id, 'equipped ' + loot.name + ' in the ' + loot.slot + ' slot through the hero screen');
  }
  await closeScreenEsc('hero');
  assertNoErrors(0, 'hero progression');

  // ---------------------------------------------------------------- G. city growth
  step('City growth: the capital reaches the next tier and the tier label follows');
  const grow = await ev(() => {
    const g = AOW.game, hp = g.players.find(p => p.isHuman).id, c = AOW.State.capital(g, hp), C = AOW.Rules.C;
    if (c.tier >= C.MAX_TIER) return { skip: true };
    const tier0 = c.tier;
    c.pop = C.CITY_TIERS[tier0] - 1;                          // setup: one pop short of the next tier
    c.growth = AOW.Rules.growthNeeded(g, c) + 200;            // … with a full granary
    return { id: c.id, hex: c.hex, tier0, pop: c.pop };
  });
  if (grow.skip) info('capital already at the top tier');
  else {
    await endTurnViaHud();
    const g1 = await ev(id => { const c = AOW.State.city(AOW.game, id); return { tier: c.tier, pop: c.pop, name: AOW.Screens.tierName(c.tier) }; }, grow.id);
    assert(g1.tier === grow.tier0 + 1, 'capital grew to pop ' + g1.pop + ' → tier ' + grow.tier0 + ' → ' + g1.tier + ' (' + g1.name + ')');
    assert(await selectCityByClick(grow.hex, grow.id), 'capital selected');
    assert(((await textOf('.hud-selection .hud-cityhead__tier')) || '').indexOf(g1.name) >= 0, 'HUD city panel shows the new tier "' + g1.name + '"');
    await click('.hud-selection button:has-text("도시")');
    await waitFn(() => AOW.UI.isOpen('city'));
    assert(((await textOf('.aow-screen[data-screen="city"] .sc-city-head .sc-badge')) || '').indexOf(g1.name) >= 0, 'city screen tier badge updated to "' + g1.name + '"');
    await closeScreenEsc('city');
  }

  // ---------------------------------------------------------------- H. barracks → tier-2 recruit
  step('Barracks: build them from the city screen, then recruit a tier-2 unit into the garrison');
  const CS2 = '.aow-screen[data-screen="city"] ';
  const cap = await ev(() => { const g = AOW.game, c = AOW.State.capital(g, g.players.find(p => p.isHuman).id); return { hex: c.hex, id: c.id }; });
  for (const bid of ['militia_post', 'barracks_1']) {
    if (await ev(q => AOW.State.city(AOW.game, q.id).buildings.includes(q.bid), { id: cap.id, bid })) { info(bid + ' already built'); continue; }
    await ensureHud();
    assert(await selectCityByClick(cap.hex, cap.id), 'capital selected');
    await click('.hud-selection button:has-text("도시")');
    await waitFn(() => AOW.UI.isOpen('city'));
    await click(CS2 + '.sc-tab >> nth=0');
    await click(CS2 + '.sc-row[data-building="' + bid + '"] button:has-text("건설")');
    await page.waitForTimeout(120);
    const q = await ev(q => {
      const c = AOW.State.city(AOW.game, q.id);
      const i = c.queue.findIndex(x => x.type === 'building' && x.id === q.bid);
      if (i < 0) return null;
      const it = c.queue.splice(i, 1)[0]; c.queue.unshift(it);   // setup: to the front of the lane…
      it.progress = Math.max(0, it.need - 1);                    // … and one hammer from done
      return c.queue.map(x => x.type + ':' + x.id);
    }, { id: cap.id, bid });
    assert(!!q, bid + ' queued through the 건설 button (' + JSON.stringify(q) + ')');
    await closeScreenEsc('city');
    await endTurnViaHud();
    assert(await ev(q => AOW.State.city(AOW.game, q.id).buildings.includes(q.bid), { id: cap.id, bid }), bid + ' completed');
  }
  await ev(() => AOW.Debug.giveResources(400));
  assert(await selectCityByClick(cap.hex, cap.id), 'capital selected');
  await click('.hud-selection button:has-text("도시")');
  await waitFn(() => AOW.UI.isOpen('city'));
  await click(CS2 + '.sc-tab:has-text("모집")');
  await page.waitForTimeout(120);
  const t2 = await ev(id => {
    const g = AOW.game, c = AOW.State.city(g, id);
    const rows = Array.from(document.querySelectorAll('.aow-screen[data-screen="city"] .sc-row[data-unit]')).map(e => e.dataset.unit);
    const ok = rows.find(u => { const d = AOW.Data.get('units', u); return d && d.tier === 2 && AOW.Rules.canRecruit(g, c, u).ok; });
    return { rows: rows.length, id: ok || null, name: ok ? AOW.L(AOW.Data.get('units', ok).name) : null };
  }, cap.id);
  assert(!!t2.id, 'a tier-2 unit is recruitable after the barracks: ' + t2.name);
  await click(CS2 + '.sc-row[data-unit="' + t2.id + '"] button');
  await page.waitForTimeout(120);
  assert(await ev(q => AOW.State.city(AOW.game, q.id).queue.some(x => x.type === 'unit' && x.id === q.u), { id: cap.id, u: t2.id }), t2.name + ' queued through the 모집 button');
  await ev(q => { const c = AOW.State.city(AOW.game, q.id); const it = c.queue.find(x => x.type === 'unit' && x.id === q.u); c.draft = Math.max(c.draft, it.need); }, { id: cap.id, u: t2.id });   // setup: draft in stock
  await closeScreenEsc('city');
  let got = 0;
  for (let i = 0; i < 4 && !got; i++) {
    await endTurnViaHud();
    got = await ev(q => { const g = AOW.game, c = AOW.State.city(g, q.id); let n = 0; for (const a of AOW.State.armiesAt(g, c.hex)) if (a.owner === c.owner) for (const uid of a.units) { const u = AOW.State.unit(g, uid); if (u && u.typeId === q.u) n++; } return n; }, { id: cap.id, u: t2.id });
  }
  assert(got > 0, 'the tier-2 ' + t2.name + ' joined the capital garrison');
  assertNoErrors(0, 'city growth & production');

  // ---------------------------------------------------------------- I. outpost
  step('Outpost: found one with the HUD button, then raise it to a city from the city screen');
  ra = await rulerArmy();
  await ev(() => AOW.Debug.giveResources(600));
  const site = await ev(q => {
    const g = AOW.game, p = g.players.find(x => x.isHuman), a = AOW.State.army(g, q.armyId);
    let best = -1, bd = 1e9;
    for (let i = 0; i < g.W * g.H; i++) {
      if (!AOW.Rules.canFoundOutpost(g, p, i, null).ok || AOW.State.armiesAt(g, i).length) continue;
      if (!isFinite(AOW.State.hexMoveCost(g, i, 'walk'))) continue;
      if (AOW.Hex.neighborsIdx(i, g.W, g.H).some(m => m >= 0 && AOW.State.armiesAt(g, m).some(x => x.owner !== p.id && x.units.length))) continue;
      const d = AOW.Hex.distIdx(a.hex, i, g.W);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return null;
    AOW.Debug.teleportArmy(a.id, best);                           // setup: the stack stands on a free site
    a.mp = AOW.Rules.armyMaxMp(g, a);
    AOW.WorldRender.centerOn(best, false);
    return { hex: best, cities: g.cities.filter(c => c.owner === p.id).length };
  }, ra);
  assert(!!site, 'found a free outpost site (hex ' + (site && site.hex) + ')');
  await page.waitForTimeout(120);
  assert(await selectArmyByClick(site.hex, ra.armyId), 'army selected on the site');
  assert(await exists('.hud-actions button:has-text("전초기지 건설"):not([disabled])'), '전초기지 건설 is enabled');
  await click('.hud-actions button:has-text("전초기지 건설")');
  await page.waitForTimeout(200);
  const op = await ev(hex => { const c = AOW.State.cityAt(AOW.game, hex); return c ? { id: c.id, tier: c.tier, owner: c.owner, name: c.name } : null; }, site.hex);
  assert(op && op.tier === 0 && op.owner === HP, 'outpost ' + (op && op.name) + ' founded (tier 0)');
  assert(await selectCityByClick(site.hex, op.id), 'outpost selected');
  await click('.hud-selection button:has-text("도시")');
  await waitFn(() => AOW.UI.isOpen('city'));
  assert(await exists(CS2 + '.sc-outpost .sc-upgrade'), 'city screen offers 도시로 승격 for the outpost');
  let capInfo = await ev(() => { const g = AOW.game, p = g.players.find(x => x.isHuman); return { n: AOW.Rules.cityCount(g, p.id), cap: AOW.Rules.cityCap(g, p) }; });
  if (capInfo.n >= capInfo.cap) {
    assert(await exists(CS2 + '.sc-outpost .sc-upgrade[disabled]'), 'at the city cap (' + capInfo.n + '/' + capInfo.cap + ') the upgrade is disabled');
    await ev(() => { const g = AOW.game, p = g.players.find(x => x.isHuman); p.cityCapBonus = (p.cityCapBonus || 0) + 1; AOW.Rules.invalidate(p.id); AOW.UI.refresh(); });   // setup: one more slot
    await page.waitForTimeout(120);
  }
  await click(CS2 + '.sc-outpost .sc-upgrade');
  await page.waitForTimeout(200);
  const up = await ev(id => { const c = AOW.State.city(AOW.game, id); return { tier: c.tier, badge: (document.querySelector('.aow-screen[data-screen="city"] .sc-city-head .sc-badge') || {}).textContent || '', banner: !!document.querySelector('.aow-screen[data-screen="city"] .sc-outpost') }; }, op.id);
  assert(up.tier === 1 && !up.banner, 'outpost upgraded to a tier-1 city');
  assert(up.badge.indexOf(await ev(() => AOW.Screens.tierName(1))) >= 0, 'tier badge now reads "' + up.badge + '"');
  await shot('outpost_upgraded');
  await closeScreenEsc('city');
  assertNoErrors(0, 'outposts');

  // ---------------------------------------------------------------- J. free city
  step('Free city: select it with an army alongside → 선물 raises its opinion');
  ra = await rulerArmy();
  const fc = await ev(q => {
    const g = AOW.game, hp = g.players.find(x => x.isHuman).id, a = AOW.State.army(g, q.armyId);
    let best = null;
    for (const c of g.cities) {
      if (!c.freeCity || c.owner >= 0 || (c.freeCity.warWith || []).includes(hp)) continue;
      const d = AOW.Hex.distIdx(a.hex, c.hex, g.W);
      if (!best || d < best.d) best = { id: c.id, hex: c.hex, d, name: c.name };
    }
    return best;
  }, ra);
  if (!fc) info('no free city left on the map — skipped');
  else {
    await teleportNextTo(ra.armyId, fc.hex);
    await ev(() => AOW.Debug.giveResources(200));
    const op0 = await ev(q => { const g = AOW.game, p = g.players.find(x => x.isHuman); return { op: AOW.Rules.freeCityOpinion(g, AOW.State.city(g, q.id), p.id), gold: p.resources.gold }; }, fc);
    await clickHex(fc.hex);
    if ((await ev(() => AOW.UI.selected.cityId)) !== fc.id) await clickHex(fc.hex);
    assert((await ev(() => AOW.UI.selected.cityId)) === fc.id, 'free city ' + fc.name + ' selected by clicking its hex');
    assert(((await textOf('.hud-selection .aow-panel__title')) || '').indexOf('자유 도시') >= 0, 'panel titled 자유 도시');
    await click('.hud-selection button:has-text("선물")');
    await page.waitForTimeout(150);
    const op1 = await ev(q => { const g = AOW.game, p = g.players.find(x => x.isHuman); return { op: AOW.Rules.freeCityOpinion(g, AOW.State.city(g, q.id), p.id), gold: p.resources.gold, text: (document.querySelector('.hud-selection') || {}).textContent || '' }; }, fc);
    assert(op1.op > op0.op, 'opinion ' + op0.op + ' → ' + op1.op);
    assert(op1.gold < op0.gold, 'the gift cost gold (' + op0.gold + ' → ' + op1.gold + ')');
    assert(op1.text.indexOf(String(op1.op)) >= 0, 'panel shows the new opinion');
    await shot('free_city');
  }
  assertNoErrors(0, 'free city');

  // ---------------------------------------------------------------- K. empire skill + tome gating
  step('Empire: buy a skill with imperium through the empire screen');
  await ev(() => AOW.Debug.giveResources(500));
  await openNav(3, 'empire');
  const emp0 = await ev(() => { const p = AOW.game.players.find(x => x.isHuman); return { n: (p.empireSkills || []).length, imp: p.resources.imperium }; });
  const node = await ev(() => { const e = document.querySelector('.aow-screen[data-screen="empire"] .sc-node.available[data-empire] button:not([disabled])'); return e ? e.closest('.sc-node').dataset.empire : null; });
  assert(!!node, 'an empire skill is purchasable: ' + node);
  await click('.aow-screen[data-screen="empire"] .sc-node[data-empire="' + node + '"] button');
  await page.waitForTimeout(150);
  const emp1 = await ev(id => { const p = AOW.game.players.find(x => x.isHuman); return { n: (p.empireSkills || []).length, has: (p.empireSkills || []).includes(id), imp: p.resources.imperium, owned: !!document.querySelector('.aow-screen[data-screen="empire"] .sc-node.owned[data-empire="' + id + '"]') }; }, node);
  assert(emp1.has && emp1.n === emp0.n + 1, 'player.empireSkills ' + emp0.n + ' → ' + emp1.n);
  assert(emp1.imp < emp0.imp && emp1.owned, 'imperium spent (' + emp0.imp + ' → ' + emp1.imp + ') and the node shows as owned');
  await closeScreenEsc('empire');

  step('Research: tome gating messages match the rules');
  await openNav(1, 'research');
  const RS = '.aow-screen[data-screen="research"] ';
  const lockedId = await ev(() => { const e = document.querySelector('.aow-screen[data-screen="research"] .sc-book.locked[data-tome]'); return e ? e.dataset.tome : null; });
  if (!lockedId) info('no locked tome left');
  else {
    await click(RS + '.sc-book[data-tome="' + lockedId + '"]');
    await page.waitForTimeout(120);
    const lk = await ev(id => ({ shown: (document.querySelector('.aow-screen[data-screen="research"] .sc-lockreason') || {}).textContent || '', rule: AOW.Rules.tomeLockReason(AOW.game, AOW.game.players.find(x => x.isHuman), id) }), lockedId);
    assert(lk.shown.trim() === lk.rule, 'locked tome explains itself: "' + lk.shown.trim() + '"');
    assert(await exists(RS + 'button:has-text("마법서 선택")[disabled]'), 'its 마법서 선택 button is disabled');
  }
  const freeId = await ev(() => { const e = document.querySelector('.aow-screen[data-screen="research"] .sc-book:not(.locked):not(.owned)[data-tome]'); return e ? e.dataset.tome : null; });
  if (!freeId) info('no selectable tome');
  else {
    const n0 = await ev(() => AOW.game.players.find(x => x.isHuman).tomes.length);
    await click(RS + '.sc-book[data-tome="' + freeId + '"]');
    await page.waitForTimeout(120);
    await click(RS + 'button:has-text("마법서 선택"):not([disabled])');
    await page.waitForTimeout(150);
    const n1 = await ev(id => { const p = AOW.game.players.find(x => x.isHuman); return { n: p.tomes.length, has: p.tomes.includes(id) }; }, freeId);
    assert(n1.has && n1.n === n0 + 1, 'an unlocked tome was added through 마법서 선택 (' + n0 + ' → ' + n1.n + ')');
  }
  await closeScreenEsc('research');
  assertNoErrors(0, 'empire & research');

  // ---------------------------------------------------------------- L. 1280×720
  step('1280×720: HUD and screens fit without overflow');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(400);
  const cap3 = await ev(() => { const g = AOW.game, c = AOW.State.capital(g, g.players.find(p => p.isHuman).id); AOW.WorldRender.centerOn(c.hex, false); return { hex: c.hex, id: c.id }; });
  await selectCityByClick(cap3.hex, cap3.id);
  const fit = await ev(() => {
    const W = window.innerWidth, H = window.innerHeight, out = { W, H, bad: [], overlaps: [] };
    const de = document.documentElement;
    if (de.scrollWidth > W || de.scrollHeight > H) out.bad.push('page scrolls ' + de.scrollWidth + '×' + de.scrollHeight);
    const rect = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? r : null; };
    const parts = ['.hud-topbar', '.hud-nav', '.hud-selection', '.hud-minimap', '.hud-endturn-wrap', '.hud-bottombar', '.hud-notifications'];
    const R = {};
    for (const s of parts) { const r = rect(s); R[s] = r; if (r && (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1)) out.bad.push(s + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + '–' + Math.round(r.right) + ',' + Math.round(r.bottom)); }
    const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const pairs = [['.hud-selection', '.hud-bottombar'], ['.hud-selection', '.hud-minimap'], ['.hud-bottombar', '.hud-minimap'], ['.hud-bottombar', '.hud-endturn-wrap'], ['.hud-notifications', '.hud-minimap']];
    for (const [a, b] of pairs) if (hit(R[a], R[b])) out.overlaps.push(a + ' × ' + b);
    // the resource row must not hide the nav buttons
    const nav = R['.hud-nav']; if (nav && nav.right > W) out.bad.push('nav cut off');
    return out;
  });
  assert(!fit.bad.length, 'HUD fits 1280×720' + (fit.bad.length ? ': ' + fit.bad.join('; ') : ''));
  assert(!fit.overlaps.length, 'HUD panels do not overlap' + (fit.overlaps.length ? ': ' + fit.overlaps.join('; ') : ''));
  await shot('hud_1280x720');
  for (const s of ['city', 'hero', 'research', 'empire']) {
    if (s === 'city') { await click('.hud-selection button:has-text("도시")'); await waitFn(() => AOW.UI.isOpen('city')); await page.waitForTimeout(150); }
    else await openNav({ hero: 4, research: 1, empire: 3 }[s], s);
    // the panel lays out once the screen's CSS has applied — wait for a real width before measuring
    await waitFn(s => Array.from(document.querySelectorAll('.aow-screen[data-screen="' + s + '"] .aow-panel')).some(e => e.getBoundingClientRect().width > 300), s, 5000);
    const r = await ev(s => {
      const W = window.innerWidth, H = window.innerHeight;
      // the screen's main panel = its largest .aow-panel
      let b = null;
      for (const e of document.querySelectorAll('.aow-screen[data-screen="' + s + '"] .aow-panel')) { const r = e.getBoundingClientRect(); if (!b || r.width * r.height > b.width * b.height) b = r; }
      if (!b) b = document.querySelector('.aow-screen[data-screen="' + s + '"]').getBoundingClientRect();
      const de = document.documentElement;
      return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), W, H, sw: de.scrollWidth, sh: de.scrollHeight };
    }, s);
    assert(r.l >= 0 && r.t >= 0 && r.r <= r.W && r.b <= r.H && r.sw <= r.W && r.sh <= r.H, s + ' screen fits 1280×720 (panel ' + r.l + ',' + r.t + '–' + r.r + ',' + r.b + ')');
    if (s === 'city' || s === 'hero') await shot(s + '_1280x720');
    await closeScreenEsc(s);
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(300);
  assertNoErrors(0, '1280×720 layout');

  // ---------------------------------------------------------------- M. world render timing
  step('World render timing at zoom 1 (warm cache)');
  const perf = await ev(async () => {
    const WR = AOW.WorldRender, g = AOW.game;
    const z0 = WR.camera.zoom;
    WR.setZoom(1);
    WR.camera.zoom = 1; if ('tz' in WR.camera) WR.camera.tz = 1;
    const c = AOW.State.capital(g, g.players.find(p => p.isHuman).id);
    WR.centerOn(c.hex, false);
    // a frame = WR.render + rasterizing what it recorded: the 1-px readback forces the canvas to flush, otherwise
    // the raster work would pile up and land on an arbitrary later call instead of the frame that caused it
    const cv = document.getElementById('world').getContext('2d');
    const frame = () => { const t0 = performance.now(); WR.render(1 / 60); cv.getImageData(0, 0, 1, 1); return performance.now() - t0; };
    for (let i = 0; i < 30; i++) { WR.render(1 / 60, { buildAll: i < 3 }); cv.getImageData(0, 0, 1, 1); }   // warm the chunk + fog caches
    const times = [];
    for (let i = 0; i < 90; i++) times.push(frame());
    // pan across the map (chunks come and go)
    const pan = [];
    for (let i = 0; i < 60; i++) { WR.camera.x += 24; pan.push(frame()); }
    // per-layer raster cost (WR.profileRaster flushes the canvas at every phase mark) — diagnostics only
    WR.centerOn(c.hex, false);
    for (let i = 0; i < 10; i++) WR.render(1 / 60);
    WR.profileRaster = true;
    const st = WR.stats().t; for (const k of Object.keys(st)) st[k] = 0;
    for (let i = 0; i < 40; i++) WR.render(1 / 60);
    WR.profileRaster = false;
    const phases = {}; for (const k of Object.keys(st)) if (st[k] > 0.2) phases[k] = +st[k].toFixed(1);
    const drawn = WR.stats().drawn;
    WR.setZoom(z0);
    WR.centerOn(c.hex, false);
    times.sort((a, b) => a - b); pan.sort((a, b) => a - b);
    const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
    return { avg: +avg(times).toFixed(2), p95: +times[Math.floor(times.length * 0.95)].toFixed(2), panAvg: +avg(pan).toFixed(2), panP95: +pan[Math.floor(pan.length * 0.95)].toFixed(2), turn: g.turn, lastTurnMs: g.turnStats && g.turnStats.ms, phases, drawn };
  });
  info(JSON.stringify(perf));
  assert(perf.avg < 12, 'warm frame at zoom 1: avg ' + perf.avg + ' ms, p95 ' + perf.p95 + ' ms (turn ' + perf.turn + ')');
  assert(perf.panAvg < 30, 'while panning (chunk builds included): avg ' + perf.panAvg + ' ms, p95 ' + perf.panP95 + ' ms');

  // ---------------------------------------------------------------- N. victory (last: it ends the game)
  step('Victory: knock out every rival → end turn → victory screen → 계속하기 → play on');
  await ensureHud();
  const rivals = await ev(() => { const g = AOW.game, out = []; for (const p of g.players) if (!p.isHuman && p.alive) { AOW.Debug.eliminate(p.id); out.push(p.name); } return out; });
  info('setup: eliminated ' + rivals.join(', '));
  await endTurnViaHud();
  if (!(await ev(() => AOW.UI.isOpen('victory')))) info('state: ' + JSON.stringify(await ev(() => ({ v: AOW.game.victory, alive: AOW.game.players.map(p => p.alive), screen: AOW.UI.currentScreen() }))));
  await waitFn(() => AOW.UI.isOpen('victory'), null, 5000);
  const h1w = await ev(() => { const h = document.querySelector('.sc-victory h1'); return h ? Math.round(h.getBoundingClientRect().width) : 0; });
  assert(h1w > 100, 'victory title laid out at full width from the first frame (' + h1w + 'px)');
  const vic = await ev(() => ({ v: AOW.game.victory, h1: (document.querySelector('.sc-victory h1') || {}).textContent, h2: (document.querySelector('.sc-victory h2') || {}).textContent, mood: AOW.Music.getMood(), alive: AOW.game.players.filter(p => p.alive).length }));
  assert(vic.v && vic.v.type === 'military' && vic.v.winner === HP, 'military victory recorded for us (' + vic.alive + ' realm left)');
  assert(vic.h1 === '승리' && vic.h2 === '군사 승리', 'victory screen: "' + vic.h1 + ' — ' + vic.h2 + '"');
  assert(vic.mood === 'victory', 'music mood → victory');
  await shot('victory');
  await click('.aow-screen[data-screen="victory"] button:has-text("계속하기")');
  await waitFn(() => !AOW.UI.isOpen('victory'));
  assert(await ev(() => AOW.UI.currentScreen() === 'hud' && AOW.game.victory.continued === true), '계속하기 closed the screen and marked the result acknowledged');
  const tv = await ev(() => AOW.game.turn);
  await endTurnViaHud();
  assert(await ev(t => AOW.game.turn === t + 1 && !AOW.UI.isOpen('victory'), tv), 'turns go on after the victory (turn ' + tv + ' → ' + (tv + 1) + ')');
  assertNoErrors(0, 'victory');
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
  // like tools/shot.js: let the AudioContext start without a user gesture so the music checks are meaningful
  browser = await chromium.launch({ headless: !flag('headed'), slowMo: +opt('slowmo', 0) || 0, args: ['--autoplay-policy=no-user-gesture-required'] });
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
