// src/render/combat_render.js — AOW.CombatRender: tactical battle canvas renderer (ground, units, overlays, animation playback, input)
//
// Public API (SPEC §6):
//   CombatRender.init(canvas, battle, game)      bind canvas + battle; paints the ground layer, fits the camera, binds input
//   CombatRender.setBattle(battle)               swap battle (repaints ground)
//   CombatRender.render(dt)                      draw one frame (dt seconds; main loop calls it while AOW.battle is set)
//   CombatRender.playEvents(events, done)        sequentially animate Combat.perform / aiStep events, then call done()
//   CombatRender.destroy()                       unbind input, drop caches
// Additive helpers (documented here per SPEC §0):
//   focusUnit(unitId, animate=true)             eased camera pan to a unit
//   setActiveUnit(unitId|null)                  shows reachable hexes (tinted by AP cost) + attackable targets for the unit
//   setTargetMode(mode, data)                   'move'|'attack'|'ability'|'spell'|null; data {unitId, range, area, attackId, abilityId, spellId, origin, los, color}
//   setPathPreview(path|null)                   path = [{col,row}|idx…]
//   setSelection(unitId|null)                   white ring
//   getHoverInfo() → {col,row,unitId,unit,hex,preview,area}
//   screenToHex(x,y), hexToScreen(col,row), fromPixel/toPixel (local SIZE-44 hex geometry), camera {x,y,zoom}
//   skipAnimations (bool), speed (number), isPlaying(), showBanner(text, sub, dur), shake(intensity), playEffect(kind, col,row, params)
//   stats() → {frames, avgMs, maxMs, groundMs} ; showPerf (bool) draws ms/frame in the corner
//   demo(canvas, query)                          demo.html?module=combat[&siege=1][&play=1][&synthetic=1][&perf=1]
// Events emitted (AOW.Events): 'battle:hover' {col,row,unitId}, 'battle:click' {col,row,unitId,button}
// Battle contract (SPEC §5) is read defensively: hexes as [{terrain,obstacle,feature}] or {terrain:[],obstacle:[]}, terrain as id or index,
// walls as [{col,row|idx|hex, hp, maxHp, gate, vertical}], unit facing as 0..5 or 'left'|'right'.
(function (AOW) {
  'use strict';
  const CR = {};
  const M = AOW.M, Color = AOW.Color, Art = AOW.Art, Hex = AOW.Hex, Palette = AOW.Palette;
  const TAU = Math.PI * 2, SQ3 = Math.sqrt(3);
  const SIZE = 44, HEX_W = SQ3 * SIZE, ROW_H = 1.5 * SIZE;
  const UNIT_SCALE = 1.35, HERO_SCALE = 1.5;
  const MOVE_SEC = 0.16;
  const GROUND_RES = 1.5;               // ground layer oversampling (crisp at zoom 2)
  const TERRAINS = ['ocean', 'coast', 'lake', 'grass', 'forest', 'hills', 'mountain', 'desert', 'snow', 'swamp', 'volcanic'];
  const FEATURES = ['none', 'forest', 'dense_forest', 'hills', 'mountain', 'peak', 'ruins', 'crystal', 'ash', 'oasis', 'ice', 'mushroom', 'ancient_tree'];
  const WATER = { ocean: 1, coast: 1, lake: 1 };
  const SIDE_DEFAULT = [{ main: '#3f7fe0', light: '#c9d9ff' }, { main: '#d8402f', light: '#ffd0c8' }];
  const CHANNEL_VFX = { physical: 'blood_hit', fire: 'fire_burst', frost: 'frost_burst', lightning: 'lightning_strike', blight: 'smoke', spirit: 'holy_light' };
  const AFFINITY_VFX = { order: 'holy_light', chaos: 'fire_burst', nature: 'nature_bloom', materium: 'dust', astral: 'arcane_swirl', shadow: 'shadow_wisp' };
  const BODY_H = { small: 26, medium: 34, large: 44, huge: 56 };
  const FONT_UI = '"Noto Sans KR", "Segoe UI", system-ui, sans-serif';
  const FONT_TITLE = '"Cinzel", "Noto Serif KR", Georgia, serif';

  // ================================================================ local hex geometry (pointy-top, odd-r, radius 44)
  function toPixel(col, row) { return { x: HEX_W * (col + 0.5 * (row & 1)) + HEX_W * 0.5, y: ROW_H * row + SIZE }; }
  function fromPixel(px, py) {
    const x = px - HEX_W * 0.5, y = py - SIZE;
    const q = (SQ3 / 3 * x - y / 3) / SIZE, r = (2 / 3 * y) / SIZE;
    let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
    const dx = Math.abs(rx - q), dy = Math.abs(ry - (-q - r)), dz = Math.abs(rz - r);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
    return { col: rx + (rz - (rz & 1)) / 2, row: rz };
  }
  function hexPath(ctx, x, y, s) { Art.hexPath(ctx, x, y, s); }
  function hexKey(col, row) { return col + ',' + row; }
  CR.toPixel = toPixel; CR.fromPixel = fromPixel;

  // ================================================================ state
  let canvas = null, ctx = null, battle = null, game = null;
  let W = 20, H = 12;
  let cells = [];                 // normalized hex info per idx
  let walls = [];                 // normalized wall segments
  let decor = [];                 // dynamic (depth-sorted) obstacle decor items
  let ground = null;              // {cv, ox, oy, w, h}
  let groundMs = 0;
  const ustates = new Map();      // unitId → render state
  const cam = { x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tz: 1, minZoom: 0.8, maxZoom: 2, fit: 1, shake: 0, shakeT: 0 };
  const hover = { col: -1, row: -1, unitId: null, sx: 0, sy: 0, inside: false };
  const active = { unitId: null, reach: null, targets: null };
  let selection = null;
  let targetMode = null;          // {mode, data}
  let pathPreview = null;
  let banner = null;
  const texts = [];               // fallback floating texts (world space)
  const projectiles = [];         // fallback projectiles
  let time = 0, dprScale = 1;
  const perf = { frames: 0, total: 0, max: 0, last: 0, hist: [] };
  const listeners = [];
  let sideColors = SIDE_DEFAULT;
  let unitArtFailed = false, demoRaf = 0, demoRunning = false;
  CR.skipAnimations = false;
  CR.speed = 1;
  CR.showPerf = false;
  CR.camera = cam;

  // ================================================================ small helpers
  const has = (ns, fn) => AOW[ns] && typeof AOW[ns][fn] === 'function';
  function sfx(name, opts) {
    try { if (has('SFX', 'play') && AOW.Audio && AOW.Audio.ctx) AOW.SFX.play(name, opts); } catch (e) { /* audio optional */ }
  }
  function vfx(kind, x, y, params) {
    if (!has('VFX', 'spawn')) return null;
    try { return AOW.VFX.spawn(kind, x, y, params || {}); } catch (e) { return null; }
  }
  function vfxText(x, y, str, o) {
    o = o || {};
    if (has('VFX', 'text')) { try { AOW.VFX.text(x, y, str, o); return; } catch (e) { /* fall through */ } }
    texts.push({ x, y, str, color: o.color || '#fff', size: o.size || 14, crit: !!o.crit, t: 0, dur: o.rise === false ? 0.8 : 1.1, rise: 34 });
  }
  function L(obj, fallback) { if (!obj) return fallback || ''; if (typeof obj === 'string') return obj; return AOW.L ? AOW.L(obj) : (obj.en || obj.ko || fallback || ''); }
  function t(key, fallback, params) {
    if (AOW.t && AOW.I18n && AOW.I18n.lang) { const s = AOW.t(key, params); if (s && s !== key) return s; }
    return (fallback || key).replace(/\{(\w+)\}/g, (m, k) => params && params[k] !== undefined ? params[k] : m);
  }
  const unitById = id => (battle && battle.units || []).find(u => u.id === id) || null;
  function idOf(v) { return v && typeof v === 'object' ? v.id : v; }
  function pick(ev, keys) { for (const k of keys) if (ev[k] !== undefined && ev[k] !== null) return ev[k]; return undefined; }
  function unitOf(ev, keys) { const v = pick(ev, keys); return v === undefined ? null : (typeof v === 'object' && v.id !== undefined ? (unitById(v.id) || v) : unitById(v)); }
  function hexOf(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'number') return { col: v % W, row: Math.floor(v / W) };
    if (typeof v === 'object') {
      if (v.col !== undefined && v.row !== undefined) return { col: v.col, row: v.row };
      if (v.hex !== undefined) return hexOf(v.hex);
      if (v.idx !== undefined) return hexOf(v.idx);
      if (v.x !== undefined && v.y !== undefined) return { col: v.x, row: v.y };
      if (Array.isArray(v) && v.length >= 2) return { col: v[0], row: v[1] };
    }
    return null;
  }
  const inBounds = (c, r) => c >= 0 && r >= 0 && c < W && r < H;
  const cellAt = (c, r) => inBounds(c, r) ? cells[r * W + c] : null;
  function isDead(u) { return !!(u.dead || u.hp <= 0 || u.removed); }
  function unitAt(col, row) {
    if (has('Combat', 'unitAt')) { try { const u = AOW.Combat.unitAt(battle, col, row); if (u !== undefined) return u || null; } catch (e) { /* fall through */ } }
    return (battle.units || []).find(u => !isDead(u) && u.col === col && u.row === row) || null;
  }
  function unitDef(u) {
    const id = u.typeId || u.unitType || u.type || (u.stats && u.stats.typeId);
    if (u.def && typeof u.def === 'object') return u.def;
    if (id && typeof id === 'object') return id;
    if (id && AOW.Data && AOW.Data.has && AOW.Data.has('units', id)) return AOW.Data.get('units', id);
    return u.stats && u.stats.def || { id: id || 'unit', name: u.name || id || 'Unit', tier: u.tier || 1, role: u.role || 'fighter', tags: u.tags || [], look: u.look || {} };
  }
  function unitName(u) { const d = unitDef(u); return u.name || L(d.name, d.id || 'Unit'); }
  function sideColor(side) { return sideColors[side] || sideColors[side % 2] || SIDE_DEFAULT[0]; }
  function facingOf(u, us) {
    const f = u.facing;
    if (f === 'left' || f === 'right') return f;
    if (typeof f === 'number') return (f === 2 || f === 3 || f === 4) ? 'left' : 'right';
    return us && us.facing ? us.facing : (u.side === 0 ? 'right' : 'left');
  }
  function footstepFor(cell) {
    if (!cell) return 'footsteps_grass';
    const tr = cell.terrain;
    if (tr === 'snow') return 'footsteps_snow';
    if (WATER[tr] || tr === 'swamp') return 'footsteps_water';
    if (tr === 'mountain' || tr === 'hills' || tr === 'volcanic') return 'footsteps_stone';
    return 'footsteps_grass';
  }
  function deathSfxFor(u) {
    const d = unitDef(u), tags = d.tags || [];
    if (tags.includes('undead')) return 'death_undead';
    if (tags.includes('animal')) return 'death_beast';
    if (tags.includes('dragon') || tags.includes('giant') || tags.includes('mythic') || tags.includes('eldritch') || tags.includes('fiend')) return 'death_monster';
    return 'death_human';
  }
  function weaponSfx(u, ev) {
    const w = (ev && (ev.weapon || ev.kind === 'ranged' && 'bow')) || (unitDef(u).look || {}).weapon || 'sword';
    if (/bow|crossbow|sling|javelin/.test(w)) return 'arrow_hit';
    if (/axe|claws|daggers/.test(w)) return 'axe_hit';
    if (/mace|hammer|club|staff|stomp/.test(w)) return 'blunt_hit';
    return 'sword_hit';
  }

  // ================================================================ battle normalization
  function termName(v) { if (typeof v === 'number') return (AOW.State && AOW.State.TERRAINS || TERRAINS)[v] || 'grass'; return v || 'grass'; }
  function featName(v) { if (typeof v === 'number') return (AOW.State && AOW.State.FEATURES || FEATURES)[v] || 'none'; return v || 'none'; }
  function obstacleKind(raw, terrain, feature) {
    if (!raw) return null;
    if (raw === true || raw === 1) {
      if (feature === 'forest' || feature === 'dense_forest' || terrain === 'forest') return 'tree';
      if (feature === 'ruins') return 'ruins';
      if (WATER[terrain]) return 'water';
      return 'rock';
    }
    const s = String(typeof raw === 'object' ? (raw.kind || raw.type || 'rock') : raw).toLowerCase();
    if (/tree|forest|wood/.test(s)) return 'tree';
    if (/ruin/.test(s)) return 'ruins';
    if (/water|pool|lake|river/.test(s)) return 'water';
    if (/hill/.test(s)) return 'hills';
    if (/wall|gate/.test(s)) return 'wall';
    if (/rock|boulder|stone|rubble/.test(s)) return 'rock';
    return 'rock';
  }
  function normalizeCells() {
    W = battle.W || 20; H = battle.H || 12;
    cells = new Array(W * H);
    const hx = battle.hexes;
    const seedBase = (battle.seed !== undefined ? AOW.hashString(String(battle.seed)) : (battle.id !== undefined ? AOW.hashString('b' + battle.id) : 1234)) >>> 0;
    const baseTerrain = termName(battle.terrain !== undefined && typeof battle.terrain !== 'object' ? battle.terrain : 'grass');
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const i = r * W + c;
      let terrain = baseTerrain, feature = 'none', obstacle = null, height = 0.4;
      let raw = null;
      if (Array.isArray(hx)) raw = hx[i];
      else if (hx && typeof hx === 'object') {
        raw = { terrain: hx.terrain && hx.terrain[i], obstacle: hx.obstacle && hx.obstacle[i], feature: hx.feature && hx.feature[i], height: hx.height && hx.height[i] };
      }
      if (raw !== null && raw !== undefined) {
        if (typeof raw === 'object') {
          if (raw.terrain !== undefined) terrain = termName(raw.terrain);
          if (raw.feature !== undefined) feature = featName(raw.feature);
          if (raw.height !== undefined) height = raw.height;
          obstacle = obstacleKind(raw.obstacle !== undefined ? raw.obstacle : (raw.blocked || raw.block), terrain, feature);
          if (!obstacle && raw.water) obstacle = 'water';
        } else if (typeof raw === 'string' || typeof raw === 'number') terrain = termName(raw);
      }
      if (obstacle === 'water' && !WATER[terrain]) terrain = 'lake';
      if (WATER[terrain] && !obstacle) obstacle = 'water';
      if (obstacle === 'tree' && feature === 'none') feature = 'forest';
      if (obstacle === 'hills' && feature === 'none') feature = 'hills';
      if (obstacle === 'ruins') feature = 'ruins';
      if (obstacle === 'wall') obstacle = null;
      const p = toPixel(c, r);
      cells[i] = { idx: i, col: c, row: r, terrain, feature, obstacle, height, seed: (seedBase + i * 7919) >>> 0, x: p.x, y: p.y, water: !!WATER[terrain] };
    }
    for (const k of cells) k.neighbors = AOW.range(6).map(d => { const n = Hex.neighbor(k.col, k.row, d); const nc = cellAt(n.col, n.row); return nc ? nc.terrain : null; });
  }
  function normalizeWalls() {
    walls = [];
    const src = Array.isArray(battle.walls) ? battle.walls : (battle.walls && Array.isArray(battle.walls.segments) ? battle.walls.segments : []);
    const seen = new Set();
    const add = (w, gate) => {
      const h = hexOf(w); if (!h || !inBounds(h.col, h.row)) return;
      const key = hexKey(h.col, h.row); if (seen.has(key)) return; seen.add(key);
      const maxHp = w.maxHp || w.hpMax || (w.hp > 1 ? w.hp : 1);
      const hp = w.hp === undefined ? 1 : M.clamp(maxHp > 1 ? w.hp / maxHp : w.hp, 0, 1);
      const p = toPixel(h.col, h.row);
      walls.push({ col: h.col, row: h.row, hp, maxHp, gate: !!(gate || w.gate || w.isGate), vertical: w.vertical, x: p.x, y: p.y, seed: h.col * 31 + h.row * 7 + 1, ref: w });
    };
    for (const w of src) add(w, false);
    if (battle.gate && typeof battle.gate === 'object') add(battle.gate, true);
    // infer orientation from neighbouring segments (N/S chain → vertical)
    for (const w of walls) {
      if (w.vertical !== undefined) continue;
      let ns = 0, ew = 0;
      for (let d = 0; d < 6; d++) {
        const n = Hex.neighbor(w.col, w.row, d);
        if (!walls.some(o => o.col === n.col && o.row === n.row)) continue;
        if (d === 0 || d === 3) ew++; else ns++;
      }
      w.vertical = ns > ew;
    }
    for (const w of walls) { w.vertical = !!w.vertical; w.footY = w.y + (w.vertical ? SIZE * 0.95 : SIZE * 0.4); }
  }
  function wallAt(col, row) { return walls.find(w => w.col === col && w.row === row) || null; }
  function isBlocked(col, row) {
    const k = cellAt(col, row); if (!k) return true;
    if (k.obstacle) return true;
    const w = wallAt(col, row); if (w && w.hp > 0) return true;
    return false;
  }
  function resolveSideColors() {
    const out = [null, null];
    const pids = battle.sidePlayers || battle.players || battle.sides;
    for (let s = 0; s < 2; s++) {
      let color = null, light = null;
      const pid = Array.isArray(pids) ? (typeof pids[s] === 'object' ? (pids[s].owner !== undefined ? pids[s].owner : pids[s].id) : pids[s]) : (s === 0 ? battle.attacker : battle.defender);
      if (game && game.players && pid !== undefined && game.players[pid]) { color = game.players[pid].color; light = game.players[pid].color2; }
      if (!color && battle.colors && battle.colors[s]) color = battle.colors[s];
      if (!color && typeof pid === 'number' && Palette.playerColor) { color = Palette.playerColor(pid); light = Palette.playerColor2(pid); }
      out[s] = color ? { main: color, light: light || Color.mix(color, '#ffffff', 0.6) } : SIDE_DEFAULT[s];
    }
    if (out[0].main === out[1].main) out[1] = SIDE_DEFAULT[1];
    sideColors = out;
  }

  // ================================================================ camera
  function fieldBounds() { return { x0: 0, y0: 0, x1: HEX_W * (W + 0.5), y1: ROW_H * (H - 1) + 2 * SIZE }; }
  function fitCamera(animate) {
    if (!canvas) return;
    const b = fieldBounds(), pad = 36;
    const cw = canvas.width / dprScale, ch = canvas.height / dprScale;
    const z = Math.min(cw / (b.x1 - b.x0 + pad * 2), ch / (b.y1 - b.y0 + pad * 2));
    cam.fit = z;
    cam.minZoom = Math.min(0.8, z * 0.98);
    cam.tz = M.clamp(z, cam.minZoom, cam.maxZoom);
    cam.tx = (b.x0 + b.x1) / 2; cam.ty = (b.y0 + b.y1) / 2 + 6;
    if (!animate) { cam.x = cam.tx; cam.y = cam.ty; cam.zoom = cam.tz; }
  }
  function clampCamera() {
    const b = fieldBounds();
    const cw = canvas.width / dprScale, ch = canvas.height / dprScale;
    const hw = cw / 2 / cam.tz, hh = ch / 2 / cam.tz;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const rx = Math.max(0, (b.x1 - b.x0) / 2 - hw + SIZE * 2), ry = Math.max(0, (b.y1 - b.y0) / 2 - hh + SIZE * 2);
    cam.tx = M.clamp(cam.tx, cx - rx, cx + rx); cam.ty = M.clamp(cam.ty, cy - ry, cy + ry);
  }
  function updateCamera(dt) {
    const k = 1 - Math.pow(0.0005, dt);           // exponential ease (frame-rate independent)
    cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.zoom += (cam.tz - cam.zoom) * k;
    if (Math.abs(cam.tx - cam.x) < 0.05) cam.x = cam.tx;
    if (Math.abs(cam.ty - cam.y) < 0.05) cam.y = cam.ty;
    if (Math.abs(cam.tz - cam.zoom) < 0.0005) cam.zoom = cam.tz;
    if (cam.shake > 0) { cam.shakeT += dt; cam.shake = Math.max(0, cam.shake - dt * 14); }
  }
  function screenToWorld(sx, sy) {
    const cw = canvas.width / dprScale, ch = canvas.height / dprScale;
    return { x: (sx - cw / 2) / cam.zoom + cam.x, y: (sy - ch / 2) / cam.zoom + cam.y };
  }
  function worldToScreen(x, y) {
    const cw = canvas.width / dprScale, ch = canvas.height / dprScale;
    return { x: (x - cam.x) * cam.zoom + cw / 2, y: (y - cam.y) * cam.zoom + ch / 2 };
  }
  CR.screenToHex = function (sx, sy) { const w = screenToWorld(sx, sy); const h = fromPixel(w.x, w.y); return inBounds(h.col, h.row) ? h : null; };
  CR.hexToScreen = function (col, row) { const p = toPixel(col, row); return worldToScreen(p.x, p.y); };
  CR.focusUnit = function (unitId, animate) {
    const u = unitById(unitId); if (!u) return false;
    const us = ustates.get(u.id);
    const p = us && us.x !== undefined ? { x: us.x, y: us.y } : toPixel(u.col, u.row);
    cam.tx = p.x; cam.ty = p.y; clampCamera();
    if (animate === false) { cam.x = cam.tx; cam.y = cam.ty; }
    return true;
  };
  CR.centerOn = function (col, row, animate) { const p = toPixel(col, row); cam.tx = p.x; cam.ty = p.y; clampCamera(); if (animate === false) { cam.x = cam.tx; cam.y = cam.ty; } };
  CR.fit = fitCamera;
  CR.shake = function (intensity) { cam.shake = Math.max(cam.shake, intensity || 6); cam.shakeT = 0; };

  // ================================================================ ground layer (painted once)
  function cornerJitter(x, y) {
    const hx = M.hash2(Math.round(x * 2), Math.round(y * 2)), hy = M.hash2(Math.round(y * 2) + 77, Math.round(x * 2) + 31);
    return [(hx - 0.5) * 3.2, (hy - 0.5) * 3.2];
  }
  function jitteredHex(c, x, y, s) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      const px = x + s * Math.cos(a), py = y + s * Math.sin(a);
      const j = cornerJitter(px, py);
      if (i === 0) c.moveTo(px + j[0], py + j[1]); else c.lineTo(px + j[0], py + j[1]);
    }
    c.closePath();
  }
  function paintGround() {
    const t0 = performance.now();
    const b = fieldBounds(), margin = 70;
    const gw = Math.ceil((b.x1 - b.x0 + margin * 2) * GROUND_RES), gh = Math.ceil((b.y1 - b.y0 + margin * 2) * GROUND_RES);
    const { cv, ctx: g } = Art.canvas(gw, gh);
    ground = { cv, ox: b.x0 - margin, oy: b.y0 - margin, w: gw / GROUND_RES, h: gh / GROUND_RES };
    g.save();
    g.scale(GROUND_RES, GROUND_RES);
    g.translate(-ground.ox, -ground.oy);
    const TA = AOW.TerrainArt;
    // dark table rim under the field so the edge reads as a board, not a cut-out
    g.save();
    g.shadowColor = 'rgba(5,8,18,0.9)'; g.shadowBlur = 26; g.shadowOffsetY = 8;
    g.fillStyle = '#2a2d3a';
    for (const k of cells) { hexPath(g, k.x, k.y, SIZE + 3); g.fill(); }
    g.restore();
    const info = k => ({ terrain: k.terrain, feature: 'none', height: k.height, seed: k.seed, size: SIZE, neighbors: k.neighbors, snow: k.terrain === 'snow' ? 1 : 0 });
    if (TA && typeof TA.drawHexBase === 'function') {
      if (TA.setOrigin) TA.setOrigin(0, 0);
      for (const k of cells) TA.drawHexBase(g, k.x, k.y, info(k));
      if (typeof TA.drawHexEdges === 'function') for (const k of cells) { try { TA.drawHexEdges(g, k.x, k.y, info(k)); } catch (e) { /* optional */ } }
    } else {
      for (const k of cells) {
        const c = (Palette.biome[k.terrain] || Palette.biome.grass);
        hexPath(g, k.x, k.y, SIZE + 1.5); g.fillStyle = Color.mix(c[0], c[1], 0.3 + M.hashInt(k.seed) * 0.5); g.fill();
      }
    }
    // faint irregular grid (hand-drawn feel: shared jittered corners)
    g.save();
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const k of cells) {
      jitteredHex(g, k.x, k.y, SIZE - 0.5);
      g.strokeStyle = k.water ? 'rgba(220,240,255,0.10)' : 'rgba(20,15,30,0.17)'; g.lineWidth = 1.4; g.stroke();
      jitteredHex(g, k.x, k.y, SIZE - 2.2);
      g.strokeStyle = k.water ? 'rgba(255,255,255,0.05)' : 'rgba(255,245,220,0.07)'; g.lineWidth = 0.8; g.stroke();
    }
    g.restore();
    // obstacle ground: darker trampled ring under rocks/ruins, ground-level dressing baked in
    decor = [];
    for (const k of cells) {
      if (!TA || typeof TA.decorItems !== 'function') { if (k.obstacle && k.obstacle !== 'water') paintFallbackObstacle(g, k); continue; }
      const feat = k.obstacle === 'tree' ? (k.feature === 'dense_forest' ? 'dense_forest' : 'forest') : k.obstacle === 'ruins' ? 'ruins' : k.obstacle === 'hills' ? 'hills' : k.obstacle === 'rock' ? 'none' : 'none';
      let items;
      try { items = TA.decorItems({ terrain: k.terrain, feature: feat, height: k.height, seed: k.seed, size: SIZE }, 1); } catch (e) { items = []; }
      if (k.obstacle === 'rock') {
        // boulder cluster: keep rocks from the dressing and add our own painted boulders
        items = items.filter(it => it.key === 'tuft' || it.key === 'rock');
        const rng = new AOW.RNG(k.seed);
        const n = 2 + rng.int(0, 2);
        for (let i = 0; i < n; i++) items.push({ key: 'rock', x: (rng.next() - 0.5) * 26, y: (rng.next() - 0.5) * 18 + 10, p: { v: rng.int(0, 5) }, scale: (1.15 + rng.next() * 0.6) * SIZE / 36, imp: 2 });
        items.sort((a, b) => a.y - b.y);
      } else if (!k.obstacle) {
        items = items.filter(it => it.key === 'tuft' || it.key === 'flower' || (it.key === 'bush' && it.imp === 0));
      }
      for (const it of items) {
        if (it.imp >= 1 || it.key === 'rock' || it.key === 'bush') decor.push({ key: it.key, x: k.x + it.x, y: k.y + it.y, p: it.p, scale: it.scale, footY: k.y + it.y });
        else drawTerr(g, it.key, k.x + it.x, k.y + it.y, it.p, it.scale);
      }
      if (k.obstacle && k.obstacle !== 'water') {
        g.fillStyle = Art.rgrad(g, k.x, k.y + 6, 0, SIZE * 0.7, [[0, 'rgba(20,15,30,0.22)'], [1, 'rgba(20,15,30,0)']]);
        g.fillRect(k.x - SIZE, k.y - SIZE, SIZE * 2, SIZE * 2);
      }
    }
    decor.sort((a, b) => a.footY - b.footY);
    g.restore();
    groundMs = performance.now() - t0;
  }
  function drawTerr(c, key, x, y, p, scale) {
    try { Art.draw(c, 'terr:' + key, x, y, p, { scale: (scale || 1) / 2 }); } catch (e) { /* unknown sprite */ }
  }
  function paintFallbackObstacle(g, k) {
    const rng = new AOW.RNG(k.seed);
    if (k.obstacle === 'tree') {
      for (let i = 0; i < 5; i++) {
        const x = k.x + (rng.next() - 0.5) * 40, y = k.y + (rng.next() - 0.5) * 30 + 8, r = 8 + rng.next() * 5;
        g.fillStyle = '#4a3320'; g.fillRect(x - 1.5, y - 4, 3, 8);
        g.fillStyle = Art.rgrad(g, x - r * 0.3, y - r * 1.2, 0, r * 1.3, [[0, '#8cc45a'], [0.6, '#3f7a2f'], [1, '#25501e']]);
        g.beginPath(); g.arc(x, y - r * 0.9, r, 0, TAU); g.fill();
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const x = k.x + (rng.next() - 0.5) * 30, y = k.y + (rng.next() - 0.5) * 20 + 8, r = 7 + rng.next() * 6;
        g.fillStyle = Art.rgrad(g, x - r * 0.3, y - r * 0.4, 0, r * 1.4, [[0, '#a8a196'], [0.6, '#7a746c'], [1, '#4c4742']]);
        g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(20,15,30,0.5)'; g.lineWidth = 1; g.stroke();
      }
    }
  }

  // ================================================================ unit render state
  function US(u) {
    let s = ustates.get(u.id);
    if (!s) {
      const p = toPixel(u.col, u.row);
      s = { id: u.id, x: p.x, y: p.y, col: u.col, row: u.row, anim: 'idle', animT: 0, frame: 0, facing: facingOf(u, null), alpha: 1, flash: 0, tint: null,
        hpShown: u.hp, hpFrom: u.hp, hpFlashT: 0, lock: false, dying: false, deathT: 0, deathPlayed: isDead(u), lungeX: 0, lungeY: 0, bob: Math.random() * TAU,
        look: null, scale: (u.hero || (unitDef(u).role === 'hero')) ? HERO_SCALE : UNIT_SCALE, hidden: false, statusPop: null, castGlow: 0, defendPop: 0, popIcon: null, popT: 0 };
      ustates.set(u.id, s);
    }
    return s;
  }
  function syncUnits(dt) {
    const playing = seq.playing;
    for (const u of battle.units || []) {
      const us = US(u);
      if (!us.lock) {
        const p = toPixel(u.col, u.row);
        us.x = p.x; us.y = p.y; us.col = u.col; us.row = u.row;
        us.facing = facingOf(u, us);
        if (!playing) {
          if (us.hpShown > u.hp) { us.hpFrom = us.hpShown; us.hpFlashT = 0.7; }
          us.hpShown = u.hp;
        }
      }
      if (!playing && !us.dying && isDead(u)) us.deathPlayed = true;
      if (!playing && !isDead(u) && us.deathPlayed && !us.dying) { us.deathPlayed = false; us.alpha = 1; us.dying = false; }
      us.animT += dt;
      if (us.anim === 'idle') us.frame = Math.floor((time * 2.2 + us.bob) % 4);
      if (us.flash > 0) us.flash = Math.max(0, us.flash - dt * 4);
      if (us.hpFlashT > 0) us.hpFlashT = Math.max(0, us.hpFlashT - dt);
      if (us.castGlow > 0) us.castGlow = Math.max(0, us.castGlow - dt * 1.5);
      if (us.popT > 0) us.popT = Math.max(0, us.popT - dt);
      if (us.popT === 0) us.popIcon = null;
      if (us.defendPop > 0) us.defendPop = Math.max(0, us.defendPop - dt);
    }
  }
  function visibleUnit(u, us) {
    if (us.hidden) return false;
    if (us.dying) return true;
    if (isDead(u)) return !us.deathPlayed;
    return true;
  }
  function resolveLook(u) {
    const us = US(u);
    if (us.look) return us.look;
    const def = unitDef(u);
    let look = def.look || {};
    if (has('UnitArt', 'resolveLook')) {
      try {
        let formLook = null, player = null;
        if (game && game.players) {
          const pid = u.owner !== undefined ? u.owner : (game.units && game.units.find(x => x.id === u.gameUnitId) || {}).owner;
          player = pid !== undefined ? game.players[pid] : null;
          if (player && AOW.Data && AOW.Data.has && player.formId && AOW.Data.has('forms', player.formId)) formLook = AOW.Data.get('forms', player.formId).look;
        }
        if (!formLook && u.formLook) formLook = u.formLook;
        look = AOW.UnitArt.resolveLook(def, formLook, player) || look;
      } catch (e) { /* keep raw look */ }
    }
    us.look = look;
    return look;
  }

  // ================================================================ placeholder unit art (used only until UnitArt.draw exists)
  function drawPlaceholder(c, x, y, o) {
    const sc = o.scale || 1, def = o.unitType || {}, look = def.look || o.look || {}, tags = def.tags || [];
    const body = look.body || 'form';
    const Hb = BODY_H[look.size || 'medium'] || 34;
    const col = o.playerColor || '#888', col2 = o.playerColor2 || '#ddd';
    const flip = o.facing === 'left';
    const walk = o.anim === 'walk' ? Math.sin((o.frame || 0) * Math.PI / 2) : 0;
    const atk = o.anim === 'attack' ? Math.sin(Math.min(1, (o.frame || 0) / 5) * Math.PI) : 0;
    const ink = 'rgba(20,15,30,0.55)';
    const dragon = body === 'dragon' || body === 'drake' || body === 'wyvern' || tags.includes('dragon');
    const beast = !dragon && (/^beast|^bird|wolf|boar|elk|lion|spider|serpent|insect|treant/.test(body) || tags.includes('animal'));
    const armorCol = /plate/.test(look.armor || '') ? '#b9bec8' : /chain/.test(look.armor || '') ? '#8d94a0' : /leather/.test(look.armor || '') ? '#7a5a3a' : /robe/.test(look.armor || '') ? Color.mix(col, '#2b2140', 0.4) : col;
    const skin = look.skin || (tags.includes('undead') ? '#9aa0a8' : '#e0b090');
    const tint = look.tint || (dragon ? col : null);
    c.save(); c.translate(x, y); c.scale(flip ? -sc : sc, sc);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (dragon) {
      const s = Hb / 56;
      c.save(); c.scale(s, s);
      const bc = tint || '#b0402a', bl = Color.mix(bc, '#fff', 0.35), bd = Color.mix(bc, '#1a0c10', 0.45);
      // wings
      c.fillStyle = Art.grad(c, -30, -60, 20, -10, [[0, bd], [1, Color.mix(bc, '#000', 0.2)]]);
      c.beginPath(); c.moveTo(-6, -26); c.lineTo(-40, -58 - atk * 8); c.lineTo(-28, -30); c.lineTo(-44, -36); c.lineTo(-18, -18); c.closePath(); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.moveTo(4, -28); c.lineTo(22, -62 - atk * 8); c.lineTo(26, -32); c.lineTo(40, -40); c.lineTo(14, -18); c.closePath(); c.fill(); c.stroke();
      // tail
      c.strokeStyle = bd; c.lineWidth = 7; c.beginPath(); c.moveTo(-14, -12); c.quadraticCurveTo(-40, -6, -46, -20); c.stroke();
      // body
      c.fillStyle = Art.rgrad(c, -6, -26, 0, 30, [[0, bl], [0.5, bc], [1, bd]]);
      c.beginPath(); c.ellipse(0, -18, 24, 15, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke();
      // neck + head
      c.strokeStyle = bc; c.lineWidth = 11; c.beginPath(); c.moveTo(14, -24); c.quadraticCurveTo(26, -40, 30, -50); c.stroke();
      c.fillStyle = Art.rgrad(c, 30, -54, 0, 14, [[0, bl], [1, bd]]); c.beginPath(); c.ellipse(34, -52, 13, 8, 0.3, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(36, -55, 2, 0, TAU); c.fill();
      c.fillStyle = bd; c.beginPath(); c.moveTo(24, -58); c.lineTo(20, -70); c.lineTo(28, -60); c.closePath(); c.fill();
      // legs
      c.fillStyle = bd; for (const lx of [-10, 10]) { c.beginPath(); c.ellipse(lx, -3, 6, 5, 0, 0, TAU); c.fill(); }
      c.restore();
    } else if (beast) {
      const s = Hb / 34;
      c.save(); c.scale(s, s);
      const bc = tint || look.fur || (tags.includes('undead') ? '#8a8c92' : '#7a6248'), bl = Color.mix(bc, '#fff', 0.3), bd = Color.mix(bc, '#1a1010', 0.45);
      const lift = walk * 2;
      c.strokeStyle = bd; c.lineWidth = 3.5;
      for (const [lx, ph] of [[-9, 0], [-4, 1], [5, 1], [10, 0]]) { const k = walk * (ph ? 1 : -1) * 3; c.beginPath(); c.moveTo(lx, -10); c.lineTo(lx + k, 0); c.stroke(); }
      c.strokeStyle = bc; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, -14); c.quadraticCurveTo(-22, -16, -24, -22); c.stroke();
      c.fillStyle = Art.rgrad(c, -2, -16, 0, 18, [[0, bl], [0.55, bc], [1, bd]]);
      c.beginPath(); c.ellipse(0, -13 - lift, 15, 8, 0, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = Art.rgrad(c, 15, -20, 0, 9, [[0, bl], [1, bd]]); c.beginPath(); c.ellipse(16, -18 - lift, 8, 6, 0.2, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = bd; c.beginPath(); c.moveTo(12, -23 - lift); c.lineTo(11, -29 - lift); c.lineTo(16, -24 - lift); c.closePath(); c.fill();
      c.fillStyle = '#ffd35a'; c.beginPath(); c.arc(19, -20 - lift, 1.4, 0, TAU); c.fill();
      c.restore();
    } else {
      const s = Hb / 34;
      c.save(); c.scale(s, s);
      const bd = Color.mix(armorCol, '#1a1020', 0.45), bl = Color.mix(armorCol, '#fff', 0.35);
      // legs
      c.strokeStyle = '#3a2a22'; c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(-4, -14); c.lineTo(-5 - walk * 3, 0); c.moveTo(4, -14); c.lineTo(5 + walk * 3, 0); c.stroke();
      // cape
      if (look.cape) { c.fillStyle = Color.mix(col, '#20142a', 0.35); c.beginPath(); c.moveTo(-4, -28); c.lineTo(-13, -4); c.lineTo(2, -8); c.closePath(); c.fill(); }
      // torso
      c.fillStyle = Art.grad(c, -8, -30, 8, -8, [[0, bl], [0.5, armorCol], [1, bd]]);
      Art.rrect(c, -8, -30, 16, 20, 5); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = col; c.fillRect(-8, -18, 16, 3);
      // arms
      c.strokeStyle = skin; c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(-7, -26); c.lineTo(-11, -16); c.stroke();
      const ax = 9 + atk * 6, ay = -18 - atk * 8;
      c.beginPath(); c.moveTo(7, -26); c.lineTo(ax, ay); c.stroke();
      // weapon
      const wpn = look.weapon || 'sword';
      c.save(); c.translate(ax, ay);
      if (/bow|crossbow/.test(wpn)) { c.strokeStyle = '#6a4a26'; c.lineWidth = 2; c.beginPath(); c.arc(2, 0, 11, -1.3, 1.3); c.stroke(); c.strokeStyle = '#ddd'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(2 + 11 * Math.cos(-1.3), 11 * Math.sin(-1.3)); c.lineTo(2 + 11 * Math.cos(1.3), 11 * Math.sin(1.3)); c.stroke(); }
      else if (/staff|wand|orb|tome/.test(wpn)) { c.rotate(-0.2 - atk * 0.6); c.strokeStyle = '#6a4a26'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -18); c.stroke(); const gc = Palette.channel[look.element] || '#9a86ff'; c.fillStyle = Art.rgrad(c, 0, -20, 0, 6, [[0, '#fff'], [0.4, gc], [1, Color.alpha(gc, 0)]]); c.beginPath(); c.arc(0, -20, 6, 0, TAU); c.fill(); }
      else if (/axe/.test(wpn)) { c.rotate(-0.6 - atk * 1.4); c.strokeStyle = '#6a4a26'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -16); c.stroke(); c.fillStyle = '#b9bec8'; c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(10, -14, 8, -4); c.lineTo(0, -8); c.closePath(); c.fill(); c.strokeStyle = ink; c.lineWidth = 1; c.stroke(); }
      else if (/pike|spear|halberd|lance|polearm/.test(wpn)) { c.rotate(-0.3 - atk * 0.3); c.strokeStyle = '#6a4a26'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -24); c.stroke(); c.fillStyle = '#d8dce4'; c.beginPath(); c.moveTo(0, -30); c.lineTo(3, -22); c.lineTo(-3, -22); c.closePath(); c.fill(); }
      else if (/mace|hammer/.test(wpn)) { c.rotate(-0.5 - atk * 1.4); c.strokeStyle = '#6a4a26'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -14); c.stroke(); c.fillStyle = '#8f949c'; Art.rrect(c, -4, -20, 8, 8, 2); c.fill(); c.strokeStyle = ink; c.stroke(); }
      else if (wpn !== 'none' && wpn !== 'claws') { c.rotate(-0.5 - atk * 1.5); c.strokeStyle = '#e4e7ee'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -18); c.stroke(); c.strokeStyle = '#c9a24a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.stroke(); }
      c.restore();
      // shield
      if (look.shield && look.shield !== 'none') { c.fillStyle = Art.grad(c, -16, -26, -8, -10, [[0, Color.mix(col, '#fff', 0.3)], [1, Color.mix(col, '#000', 0.4)]]); c.beginPath(); c.ellipse(-12, -17, 5.5, 8, 0, 0, TAU); c.fill(); c.strokeStyle = '#c9a24a'; c.lineWidth = 1.2; c.stroke(); }
      // head + helm
      c.fillStyle = Art.rgrad(c, -1.5, -37, 0, 6, [[0, Color.mix(skin, '#fff', 0.3)], [1, Color.mix(skin, '#000', 0.35)]]);
      c.beginPath(); c.arc(0, -36, 5.5, 0, TAU); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.1; c.stroke();
      const helm = look.helm || 'none';
      if (helm !== 'none') { c.fillStyle = helm === 'hood' ? Color.mix(armorCol, '#000', 0.3) : helm === 'crown' ? '#e8c357' : '#b9bec8'; c.beginPath(); c.arc(0, -37, 6, Math.PI, TAU); c.lineTo(6, -35); c.lineTo(-6, -35); c.closePath(); c.fill(); c.strokeStyle = ink; c.stroke(); if (helm === 'full') { c.fillRect(-5, -36, 10, 4); } }
      else { c.fillStyle = look.hair || '#4a2f1a'; c.beginPath(); c.arc(0, -37, 5.6, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fill(); }
      c.restore();
    }
    // rank pips & hero star handled by the caller (HUD pass)
    c.restore();
  }

  // ================================================================ drawing: units
  function unitHeight(u, us) { const look = resolveLook(u); return (BODY_H[look.size || 'medium'] || 34) * us.scale; }
  function drawUnitSprite(u, us) {
    const def = unitDef(u), look = resolveLook(u);
    const sc = sideColor(u.side);
    const x = us.x + us.lungeX, y = us.y + us.lungeY;
    const bobY = us.anim === 'idle' ? Math.sin(time * 2.4 + us.bob) * 0.8 : 0;
    ctx.save();
    ctx.globalAlpha = us.alpha;
    if (us.dying) {
      const k = M.clamp(us.deathT / 0.75, 0, 1);
      ctx.translate(x, y); ctx.rotate((us.facing === 'left' ? 1 : -1) * M.easeIn(k) * 1.35); ctx.translate(-x, -y + M.easeIn(k) * 6);
    }
    Art.shadow(ctx, x, y + 2, 38 * us.scale, 13 * us.scale, 0.38);
    const params = { unitType: def, look, playerColor: sc.main, playerColor2: sc.light, facing: us.facing, frame: us.frame, anim: us.anim, scale: us.scale, rank: u.rank || 0, hero: !!u.hero, seed: u.id };
    let drawn = false;
    if (!unitArtFailed && has('UnitArt', 'draw')) {
      try { AOW.UnitArt.draw(ctx, x, y + bobY, params); drawn = true; } catch (e) { unitArtFailed = true; console.error('[CombatRender] UnitArt.draw failed, using placeholders', e); }
    }
    if (!drawn) drawPlaceholder(ctx, x, y + bobY, params);
    // hit flash / cast glow
    const hh = unitHeight(u, us);
    if (us.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = Art.rgrad(ctx, x, y - hh * 0.5, 0, hh * 0.7, [[0, 'rgba(255,240,220,' + (0.55 * us.flash) + ')'], [0.5, 'rgba(255,120,80,' + (0.3 * us.flash) + ')'], [1, 'rgba(255,80,60,0)']]);
      ctx.beginPath(); ctx.ellipse(x, y - hh * 0.5, hh * 0.55, hh * 0.72, 0, 0, TAU); ctx.fill();
    }
    if (us.castGlow > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const gc = us.castColor || '#9a86ff';
      ctx.fillStyle = Art.rgrad(ctx, x, y - hh * 0.55, 0, hh * 0.8, [[0, Color.alpha(gc, 0.5 * us.castGlow)], [1, Color.alpha(gc, 0)]]);
      ctx.beginPath(); ctx.arc(x, y - hh * 0.55, hh * 0.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawRing(x, y, rx, ry, color, width, glow, dash) {
    ctx.save();
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    if (dash) ctx.setLineDash(dash);
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function drawUnitRings(u, us) {
    const x = us.x, y = us.y + 2;
    const r = 24 * (us.scale / UNIT_SCALE);
    const acting = battle.activeUnitId === u.id || active.unitId === u.id;
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    if (acting) {
      ctx.save(); ctx.fillStyle = 'rgba(232,195,87,' + (0.12 + pulse * 0.08) + ')'; ctx.beginPath(); ctx.ellipse(x, y, r + 4, (r + 4) * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore();
      drawRing(x, y, r + 3, (r + 3) * 0.5, '#f1d98a', 2.6, 8);
      drawRing(x, y, r + 3, (r + 3) * 0.5, 'rgba(120,80,10,0.6)', 0.8, 0);
    }
    if (selection === u.id && !acting) drawRing(x, y, r + 2, (r + 2) * 0.5, 'rgba(255,255,255,0.9)', 2, 6);
    if (hover.unitId === u.id) {
      const enemy = active.unitId !== null && (unitById(active.unitId) || {}).side !== u.side;
      const targetable = active.targets && active.targets.has(u.id);
      const col = enemy || targetable ? 'rgba(255,80,60,' + (0.7 + pulse * 0.3) + ')' : 'rgba(255,255,255,0.7)';
      drawRing(x, y, r + 6, (r + 6) * 0.5, col, 2.2, enemy ? 10 : 0);
    } else if (active.targets && active.targets.has(u.id)) {
      drawRing(x, y, r + 5, (r + 5) * 0.5, 'rgba(255,90,60,' + (0.45 + pulse * 0.25) + ')', 1.8, 0, [6, 4]);
    }
  }
  function moraleState(u) {
    if (u.moraleState) return u.moraleState;
    const m = u.morale !== undefined ? u.morale : (u.stats && u.stats.morale);
    if (typeof m !== 'number') return null;
    if (m <= -5) return 'fleeing'; if (m <= -3) return 'breaking'; if (m < 0) return 'shaken'; if (m >= 3) return 'inspired'; return 'steady';
  }
  function drawUnitHud(u, us) {
    const def = unitDef(u);
    const hh = unitHeight(u, us);
    const x = us.x + us.lungeX, top = us.y + us.lungeY - hh - 12;
    const sc = sideColor(u.side);
    const bw = 46, bh = 6;
    const maxHp = u.maxHp || (u.stats && u.stats.maxHp) || Math.max(1, u.hp);
    const frac = M.clamp(us.hpShown / maxHp, 0, 1), fracFrom = M.clamp(us.hpFrom / maxHp, 0, 1);
    ctx.save();
    ctx.globalAlpha = us.dying ? Math.max(0, 1 - us.deathT * 2) : us.alpha;
    // bar
    ctx.fillStyle = 'rgba(12,10,20,0.78)'; Art.rrect(ctx, x - bw / 2 - 1, top - 1, bw + 2, bh + 2, 2.5); ctx.fill();
    if (us.hpFlashT > 0 && fracFrom > frac) { ctx.fillStyle = 'rgba(255,235,140,' + M.clamp(us.hpFlashT * 1.6, 0, 1) + ')'; ctx.fillRect(x - bw / 2 + bw * frac, top, bw * (fracFrom - frac), bh); }
    const hpCol = frac > 0.5 ? sc.main : frac > 0.25 ? Color.mix(sc.main, '#e0a72b', 0.55) : Color.mix(sc.main, '#d94b3a', 0.7);
    ctx.fillStyle = Art.grad(ctx, 0, top, 0, top + bh, [[0, Color.mix(hpCol, '#fff', 0.35)], [0.5, hpCol], [1, Color.mix(hpCol, '#000', 0.35)]]);
    ctx.fillRect(x - bw / 2, top, bw * frac, bh);
    // ticks every 25%
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 1; i < 4; i++) ctx.fillRect(x - bw / 2 + bw * i / 4 - 0.5, top, 1, bh);
    ctx.strokeStyle = 'rgba(255,240,210,0.35)'; ctx.lineWidth = 0.8; ctx.strokeRect(x - bw / 2 - 0.5, top - 0.5, bw + 1, bh + 1);
    // tier badge (left)
    const tier = def.tier || u.tier || 1;
    const bx = x - bw / 2 - 8, by = top + bh / 2;
    ctx.fillStyle = u.hero ? '#e8c357' : sc.main; ctx.strokeStyle = 'rgba(12,10,20,0.85)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(bx, by, 6.5, 0, TAU); ctx.fill(); ctx.stroke();
    Art.text(ctx, u.hero ? '★' : String(tier), bx, by + 0.5, { size: u.hero ? 9 : 8.5, color: '#fff', weight: '700', font: FONT_UI });
    // rank chevrons under the bar
    const rank = u.rank || 0;
    if (rank > 0) {
      ctx.strokeStyle = '#f1d98a'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (let i = 0; i < rank; i++) { const cx = x - (rank - 1) * 3 + i * 6, cy = top + bh + 4; ctx.beginPath(); ctx.moveTo(cx - 2.5, cy); ctx.lineTo(cx, cy + 2.2); ctx.lineTo(cx + 2.5, cy); ctx.stroke(); }
    }
    // right side: morale + defending
    let rx = x + bw / 2 + 7;
    const ms = moraleState(u);
    if (ms && ms !== 'steady') {
      const mc = ms === 'fleeing' || ms === 'breaking' ? '#e0452b' : ms === 'shaken' ? '#e0a72b' : '#5fb043';
      ctx.fillStyle = mc; ctx.strokeStyle = 'rgba(12,10,20,0.85)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rx - 3, by - 6); ctx.lineTo(rx - 3, by + 6); ctx.moveTo(rx - 3, by - 6); ctx.lineTo(rx + 5, by - 3.5); ctx.lineTo(rx - 3, by - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      rx += 11;
    }
    if (u.defending || u.defend || us.defendPop > 0) {
      if (AOW.Icons && AOW.Icons.has && AOW.Icons.has('defend')) AOW.Icons.draw(ctx, 'defend', rx + 1, by, 13);
      else { ctx.fillStyle = '#8fa0c0'; ctx.beginPath(); ctx.moveTo(rx - 4, by - 5); ctx.lineTo(rx + 4, by - 5); ctx.lineTo(rx + 4, by + 1); ctx.lineTo(rx, by + 5); ctx.lineTo(rx - 4, by + 1); ctx.closePath(); ctx.fill(); }
      rx += 12;
    }
    // status icons row (below rank)
    const sts = (u.statuses || []).map(s => typeof s === 'string' ? s : s.id).filter(Boolean);
    if (sts.length) {
      const n = Math.min(6, sts.length), size = 12, sy = top + bh + (rank > 0 ? 12 : 8);
      for (let i = 0; i < n; i++) {
        const sx = x - (n - 1) * 6.5 + i * 13;
        if (AOW.Icons && AOW.Icons.has && AOW.Icons.has(sts[i])) AOW.Icons.draw(ctx, sts[i], sx, sy, size);
        else { ctx.fillStyle = Palette.channel[sts[i]] || '#c9a0ff'; ctx.strokeStyle = 'rgba(12,10,20,0.85)'; ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, TAU); ctx.fill(); ctx.stroke(); }
      }
    }
    // popped icon (status applied / defend / morale)
    if (us.popIcon && us.popT > 0) {
      const k = 1 - us.popT / 0.9, py = top - 14 - k * 16;
      ctx.globalAlpha *= k < 0.7 ? 1 : (1 - k) / 0.3;
      if (AOW.Icons && AOW.Icons.has && AOW.Icons.has(us.popIcon)) AOW.Icons.draw(ctx, us.popIcon, x, py, 20);
    }
    ctx.restore();
  }
  function drawHoverLabel(u, us) {
    const hh = unitHeight(u, us);
    const x = us.x, top = us.y - hh - 12;
    const name = unitName(u);
    const maxHp = u.maxHp || (u.stats && u.stats.maxHp) || Math.max(1, u.hp);
    const line2 = Math.max(0, Math.round(us.hpShown)) + ' / ' + Math.round(maxHp) + '  ·  AP ' + (u.ap !== undefined ? u.ap : '-');
    ctx.save();
    ctx.font = '700 12px ' + FONT_UI;
    const w = Math.max(ctx.measureText(name).width, ctx.measureText(line2).width * 0.85) + 18, h = 30;
    const px = x - w / 2, py = top - 12 - h;
    ctx.fillStyle = '#efe3c6'; ctx.strokeStyle = '#8a6a24'; ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    Art.rrect(ctx, px, py, w, h, 4); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.stroke();
    ctx.fillStyle = sideColor(u.side).main; ctx.fillRect(px + 3, py + 3, 3, h - 6);
    Art.text(ctx, name, x + 2, py + 10, { size: 12, color: '#2b2116', weight: '700', font: FONT_UI });
    Art.text(ctx, line2, x + 2, py + 22, { size: 10, color: '#5a4a30', weight: '600', font: FONT_UI });
    ctx.restore();
  }

  // ================================================================ drawing: overlays (reachable, path, target preview, hover)
  function fillHex(col, row, color, inset) { const p = toPixel(col, row); hexPath(ctx, p.x, p.y, SIZE - (inset || 2)); ctx.fillStyle = color; ctx.fill(); }
  function strokeHex(col, row, color, width, inset, dash) {
    const p = toPixel(col, row); ctx.save(); if (dash) ctx.setLineDash(dash);
    hexPath(ctx, p.x, p.y, SIZE - (inset || 2)); ctx.strokeStyle = color; ctx.lineWidth = width || 1.5; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  }
  function showDeployment() {
    if (!battle || battle.round > 1) return false;
    if (battle.phase !== undefined) return battle.phase === 'deploy' || battle.phase === 'deployment';
    if (battle.deploying !== undefined) return !!battle.deploying;
    return !(battle.units || []).some(u => u.hasActed) && !seq.playing && (battle.log || []).length === 0;
  }
  function drawGroundOverlays() {
    // water shimmer
    if (AOW.TerrainArt && typeof AOW.TerrainArt.drawWater === 'function') {
      for (const k of cells) if (k.water) { try { AOW.TerrainArt.drawWater(ctx, k.x, k.y, { terrain: k.terrain, seed: k.seed, size: SIZE }, time); } catch (e) { /* optional */ } }
    }
    // deployment zones (round 1)
    if (showDeployment()) {
      const zones = battle.deployZones || [{ side: 0, cols: [0, 3] }, { side: 1, cols: [W - 4, W - 1] }];
      for (const z of zones) {
        const c = sideColor(z.side).main;
        for (const k of cells) {
          const inZone = z.hexes ? z.hexes.some(h => { const q = hexOf(h); return q && q.col === k.col && q.row === k.row; }) : (k.col >= z.cols[0] && k.col <= z.cols[1]);
          if (!inZone || k.obstacle) continue;
          fillHex(k.col, k.row, Color.alpha(c, 0.13), 1);
          strokeHex(k.col, k.row, Color.alpha(c, 0.25), 1, 1.5);
        }
      }
    }
    // reachable hexes tinted by AP cost
    if (active.reach) {
      for (const [key, r] of active.reach) {
        if (key === hexKey(r.col, r.row) && r.cost === 0 && active.unitId !== null) { const au = unitById(active.unitId); if (au && au.col === r.col && au.row === r.row) continue; }
        const ap = r.ap;
        const col = ap <= 1 ? [120, 230, 150] : ap === 2 ? [245, 210, 90] : [245, 140, 70];
        const hovered = hover.col === r.col && hover.row === r.row;
        fillHex(r.col, r.row, 'rgba(' + col.join(',') + ',' + (hovered ? 0.42 : 0.22) + ')', 2.5);
        strokeHex(r.col, r.row, 'rgba(' + col.join(',') + ',0.55)', 1, 3);
      }
    }
    // attackable targets outline
    if (active.targets) {
      for (const id of active.targets) { const u = unitById(id); if (u && !isDead(u)) strokeHex(u.col, u.row, 'rgba(255,90,60,0.75)', 2, 2.5, [7, 4]); }
    }
    // target mode range / area
    if (targetMode) drawTargetMode();
    // path preview
    if (pathPreview && pathPreview.length) drawPath(pathPreview);
    // hover hex
    if (hover.inside && inBounds(hover.col, hover.row)) {
      const k = cellAt(hover.col, hover.row);
      strokeHex(hover.col, hover.row, k && k.obstacle ? 'rgba(255,120,90,0.7)' : 'rgba(255,255,255,0.8)', 2, 2);
    }
  }
  function drawPath(path) {
    const pts = [];
    const au = active.unitId !== null ? unitById(active.unitId) : null;
    const start = pathStart(path, au);
    if (start) pts.push(toPixel(start.col, start.row));
    for (const h of path) { const q = hexOf(h); if (q) pts.push(toPixel(q.col, q.row)); }
    if (pts.length < 2) { if (pts.length === 1) strokeHex(start.col, start.row, 'rgba(255,255,255,0.8)', 2); return; }
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20,15,30,0.55)'; ctx.lineWidth = 7; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,245,215,0.95)'; ctx.lineWidth = 3; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -time * 40; ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 1; i < pts.length; i++) { ctx.fillStyle = 'rgba(255,245,215,0.9)'; ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, i === pts.length - 1 ? 0 : 3.5, 0, TAU); ctx.fill(); }
    const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.translate(b.x, b.y); ctx.rotate(ang);
    ctx.fillStyle = '#fff5d7'; ctx.strokeStyle = 'rgba(20,15,30,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    const last = hexOf(path[path.length - 1]);
    if (last) strokeHex(last.col, last.row, 'rgba(255,245,215,0.9)', 2, 2);
  }
  function pathStart(path, au) {
    const first = hexOf(path[0]);
    if (au && first && (au.col !== first.col || au.row !== first.row)) return { col: au.col, row: au.row };
    return au ? { col: au.col, row: au.row } : null;
  }
  function drawTargetMode() {
    const tm = targetMode, d = tm.data || {};
    const origin = hexOf(d.origin) || (d.unitId !== undefined && unitById(d.unitId) ? { col: unitById(d.unitId).col, row: unitById(d.unitId).row } : (active.unitId !== null && unitById(active.unitId) ? { col: unitById(active.unitId).col, row: unitById(active.unitId).row } : null));
    const affinity = d.affinity || 'astral';
    const color = d.color || (tm.mode === 'attack' ? '#ff5a3c' : tm.mode === 'spell' ? (Palette.affinity[affinity] || '#5a7ff0') : '#c9a0ff');
    const range = d.range !== undefined ? d.range : (tm.mode === 'attack' ? 1 : 6);
    const area = d.area || 0;
    if (tm.mode !== 'move' && origin && range > 0 && range < 40) {
      for (const k of cells) {
        const dist = Hex.dist(origin.col, origin.row, k.col, k.row);
        if (dist === 0 || dist > range) continue;
        fillHex(k.col, k.row, Color.alpha(color, 0.10), 2.5);
      }
      // range boundary
      for (const k of cells) {
        const dist = Hex.dist(origin.col, origin.row, k.col, k.row);
        if (dist !== range) continue;
        strokeHex(k.col, k.row, Color.alpha(color, 0.45), 1, 3);
      }
    }
    if (!hover.inside || !inBounds(hover.col, hover.row)) return;
    const inRange = !origin || Hex.dist(origin.col, origin.row, hover.col, hover.row) <= range;
    if (tm.mode === 'move') return;                    // move path is drawn by drawPath (auto or via setPathPreview)
    // area preview around hover
    if (area > 0) {
      const ring = Hex.spiral(hover.col, hover.row, area);
      for (const h of ring) if (inBounds(h.col, h.row)) { fillHex(h.col, h.row, Color.alpha(color, inRange ? 0.28 : 0.12), 2.5); strokeHex(h.col, h.row, Color.alpha(color, 0.7), 1.2, 2.5); }
    }
    // line of sight / trajectory
    if (origin && range > 1) {
      const p0 = toPixel(origin.col, origin.row), p1 = toPixel(hover.col, hover.row);
      let blocked = false;
      if (has('Combat', 'lineOfSight')) { try { const r = AOW.Combat.lineOfSight(battle, origin, { col: hover.col, row: hover.row }); blocked = r === false || (r && r.blocked === true) || (r && r.clear === false); } catch (e) { /* optional */ } }
      else if (d.los !== false) { const line = Hex.line(origin.col, origin.row, hover.col, hover.row); for (let i = 1; i < line.length - 1; i++) if (isBlocked(line[i].col, line[i].row)) { blocked = true; break; } }
      ctx.save(); ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 30; ctx.lineWidth = 2;
      ctx.strokeStyle = blocked ? 'rgba(255,80,60,0.85)' : inRange ? Color.alpha(color, 0.9) : 'rgba(200,200,200,0.5)';
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y - 10); ctx.lineTo(p1.x, p1.y - 4); ctx.stroke(); ctx.restore();
      tm.blocked = blocked;
    }
    strokeHex(hover.col, hover.row, inRange ? Color.alpha(color, 0.95) : 'rgba(200,200,200,0.6)', 2.2, 1.5);
  }
  function attackPreview() {
    if (!targetMode || (targetMode.mode !== 'attack' && targetMode.mode !== 'ability')) return null;
    const d = targetMode.data || {};
    const attackerId = d.unitId !== undefined ? d.unitId : active.unitId;
    if (attackerId === null || attackerId === undefined || !hover.unitId) return null;
    if (!has('Combat', 'previewAttack')) return null;
    try { return AOW.Combat.previewAttack(battle, attackerId, hover.unitId, d.attackId || d.abilityId) || null; } catch (e) { return null; }
  }
  function drawPreviewTooltip() {
    const pv = attackPreview(); if (!pv) return;
    const u = unitById(hover.unitId); if (!u) return;
    const us = US(u);
    const parts = [];
    const lo = pick(pv, ['min', 'minDamage', 'dmgMin', 'low']), hi = pick(pv, ['max', 'maxDamage', 'dmgMax', 'high']), avg = pick(pv, ['avg', 'damage', 'dmg', 'expected']);
    if (lo !== undefined && hi !== undefined) parts.push(Math.round(lo) + '–' + Math.round(hi)); else if (avg !== undefined) parts.push('~' + Math.round(avg));
    const hit = pick(pv, ['hit', 'accuracy', 'hitChance', 'chance']);
    if (hit !== undefined) parts.push(Math.round(hit <= 1 ? hit * 100 : hit) + '%');
    if (pv.kill || pv.lethal) parts.push('☠');
    if (pv.flank || pv.flanking) parts.push(t('battle.flank', 'flank'));
    if (pv.rear) parts.push(t('battle.rear', 'rear'));
    if (!parts.length) return;
    const s = parts.join('  ');
    const p = worldToScreen(us.x, us.y - unitHeight(u, us) - 40);
    ctx.save(); ctx.font = '700 12px ' + FONT_UI;
    const w = ctx.measureText(s).width + 16;
    ctx.fillStyle = 'rgba(40,10,10,0.85)'; ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 1.2;
    Art.rrect(ctx, p.x - w / 2, p.y - 12, w, 20, 4); ctx.fill(); ctx.stroke();
    Art.text(ctx, s, p.x, p.y - 2, { size: 12, color: '#ffd9c8', weight: '700', font: FONT_UI });
    ctx.restore();
  }

  // ================================================================ drawing: walls & decor
  function drawWall(w) {
    if (!AOW.StructArt || typeof AOW.StructArt.drawWall !== 'function') {
      ctx.fillStyle = '#8a7a66'; ctx.fillRect(w.x - 30, w.y - 10, 60, 20); return;
    }
    const arch = battle.architecture || (battle.city && battle.city.architecture) || battle.cultureId || 'feudal';
    try { AOW.StructArt.drawWall(ctx, w.x, w.y, { hp: w.hp, gate: w.gate, vertical: w.vertical, size: SIZE, architecture: arch, cultureId: battle.cultureId, seed: w.seed }); }
    catch (e) { ctx.fillStyle = '#8a7a66'; ctx.fillRect(w.x - 30, w.y - 10, 60, 20); }
    if (w.hp < 1 && w.hp > 0) {
      // small hp pip on damaged walls
      const bw = 26, top = w.y - (w.vertical ? SIZE * 0.6 : SIZE * 0.4);
      ctx.fillStyle = 'rgba(12,10,20,0.7)'; Art.rrect(ctx, w.x - bw / 2 - 1, top - 1, bw + 2, 5, 2); ctx.fill();
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(w.x - bw / 2, top, bw * w.hp, 3);
    }
  }

  // ================================================================ floating text / projectile fallbacks
  function updateFallbacks(dt) {
    for (let i = texts.length - 1; i >= 0; i--) { const f = texts[i]; f.t += dt; if (f.t >= f.dur) texts.splice(i, 1); }
    for (let i = projectiles.length - 1; i >= 0; i--) { const p = projectiles[i]; p.t += dt; if (p.t >= p.dur) projectiles.splice(i, 1); }
  }
  function drawFallbacks() {
    for (const p of projectiles) {
      const k = M.clamp(p.t / p.dur, 0, 1), x = M.lerp(p.x0, p.x1, k), y = M.lerp(p.y0, p.y1, k) - Math.sin(k * Math.PI) * p.arc;
      const ang = Math.atan2((p.y1 - p.y0) / p.dur - Math.cos(k * Math.PI) * Math.PI * p.arc / p.dur, (p.x1 - p.x0) / p.dur);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      if (p.kind === 'arrow') { ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(5, -2.5); ctx.lineTo(5, 2.5); ctx.closePath(); ctx.fill(); }
      else { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = Art.rgrad(ctx, 0, 0, 0, 9, [[0, '#fff'], [0.4, p.color], [1, Color.alpha(p.color, 0)]]); ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    for (const f of texts) {
      const k = f.t / f.dur, y = f.y - M.easeOut(k) * f.rise, a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      const size = f.size * (f.crit ? 1 + 0.25 * Math.max(0, 1 - k * 4) : 1);
      ctx.save(); ctx.globalAlpha = a;
      Art.text(ctx, f.str, f.x, y, { size, color: f.color, weight: '800', stroke: 'rgba(10,8,16,0.9)', strokeWidth: 3.5, font: FONT_UI });
      ctx.restore();
    }
  }
  function projectile(kind, x0, y0, x1, y1, params) {
    params = params || {};
    const dist = M.dist(x0, y0, x1, y1);
    const dur = params.duration || (0.28 + dist * 0.0009);
    let spawned = false;
    if (has('VFX', 'projectile')) {
      try { AOW.VFX.projectile(kind, x0, y0, x1, y1, Object.assign({ duration: dur }, params)); spawned = true; } catch (e) { /* fallback */ }
    }
    if (!spawned) projectiles.push({ kind, x0, y0, x1, y1, t: 0, dur, arc: params.arc !== undefined ? params.arc : (kind === 'arrow' ? Math.min(60, dist * 0.18) : 10), color: params.color || '#9a86ff' });
    return dur;
  }

  // ================================================================ banner
  CR.showBanner = function (text, sub, dur, color) { banner = { text, sub: sub || '', t: 0, dur: dur || 2.2, color: color || '#f1d98a' }; };
  function drawBanner(dt) {
    if (!banner) return;
    banner.t += dt;
    const cw = canvas.width / dprScale, ch = canvas.height / dprScale;
    const k = banner.t / banner.dur;
    if (k >= 1) { banner = null; return; }
    const a = k < 0.12 ? k / 0.12 : k > 0.8 ? (1 - k) / 0.2 : 1;
    const sc = k < 0.12 ? 0.9 + 0.1 * M.easeOut(k / 0.12) : 1;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(cw / 2, ch * 0.38); ctx.scale(sc, sc);
    ctx.font = '700 34px ' + FONT_TITLE;
    const w = Math.max(320, ctx.measureText(banner.text).width + 120);
    ctx.fillStyle = Art.grad(ctx, -w / 2, 0, w / 2, 0, [[0, 'rgba(21,26,38,0)'], [0.15, 'rgba(21,26,38,0.88)'], [0.85, 'rgba(21,26,38,0.88)'], [1, 'rgba(21,26,38,0)']]);
    ctx.fillRect(-w / 2, -40, w, 84);
    ctx.strokeStyle = Art.grad(ctx, -w / 2, 0, w / 2, 0, [[0, 'rgba(201,162,74,0)'], [0.2, '#c9a24a'], [0.8, '#c9a24a'], [1, 'rgba(201,162,74,0)']]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-w / 2, -40); ctx.lineTo(w / 2, -40); ctx.moveTo(-w / 2, 44); ctx.lineTo(w / 2, 44); ctx.stroke();
    Art.text(ctx, banner.text, 0, -4, { size: 34, color: banner.color, weight: '700', font: FONT_TITLE, shadow: 8 });
    if (banner.sub) Art.text(ctx, banner.sub, 0, 26, { size: 14, color: '#e8e2d0', weight: '600', font: FONT_UI, shadow: 4 });
    ctx.restore();
  }

  // ================================================================ render
  CR.render = function (dt) {
    if (!canvas || !battle) return;
    const t0 = performance.now();
    dt = Math.min(0.1, Math.max(0, dt || 0.016));
    time += dt;
    updateCamera(dt);
    seqUpdate(dt);
    syncUnits(dt);
    updateFallbacks(dt);
    const cw = canvas.width / dprScale, ch = canvas.height / dprScale;
    ctx.setTransform(dprScale, 0, 0, dprScale, 0, 0);
    // backdrop
    ctx.fillStyle = Art.grad(ctx, 0, 0, 0, ch, [[0, '#1b2130'], [1, '#0f1219']]);
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = Art.rgrad(ctx, cw / 2, ch / 2, ch * 0.2, ch * 0.9, [[0, 'rgba(60,70,95,0.35)'], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(0, 0, cw, ch);
    // camera
    let shx = 0, shy = 0;
    if (cam.shake > 0) { shx = Math.sin(cam.shakeT * 55) * cam.shake; shy = Math.cos(cam.shakeT * 47) * cam.shake * 0.6; }
    ctx.translate(cw / 2 + shx, ch / 2 + shy); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    ctx.imageSmoothingEnabled = true;
    if (ground) ctx.drawImage(ground.cv, ground.ox, ground.oy, ground.w, ground.h);
    drawGroundOverlays();
    if (has('VFX', 'draw')) { try { AOW.VFX.draw(ctx, 'below'); } catch (e) { /* optional */ } }
    // rings under units
    for (const u of battle.units || []) { const us = US(u); if (visibleUnit(u, us) && !us.dying && !isDead(u)) drawUnitRings(u, us); }
    // depth-sorted sprites: units, walls, decor
    const items = [];
    for (const u of battle.units || []) { const us = US(u); if (!visibleUnit(u, us)) continue; items.push({ y: us.y + us.lungeY + 1, kind: 0, u, us }); }
    for (const w of walls) items.push({ y: w.footY, kind: 1, w });
    for (const d of decor) items.push({ y: d.footY, kind: 2, d });
    items.sort((a, b) => a.y - b.y || a.kind - b.kind);
    for (const it of items) {
      if (it.kind === 0) drawUnitSprite(it.u, it.us);
      else if (it.kind === 1) drawWall(it.w);
      else drawTerr(ctx, it.d.key, it.d.x, it.d.y, it.d.p, it.d.scale);
    }
    // HUD above units
    for (const u of battle.units || []) { const us = US(u); if (visibleUnit(u, us) && !(isDead(u) && !us.dying)) drawUnitHud(u, us); }
    if (has('VFX', 'draw')) { try { AOW.VFX.draw(ctx, 'above'); } catch (e) { /* optional */ } }
    drawFallbacks();
    if (hover.unitId) { const hu = unitById(hover.unitId); if (hu && !isDead(hu)) drawHoverLabel(hu, US(hu)); }
    // screen space
    ctx.setTransform(dprScale, 0, 0, dprScale, 0, 0);
    if (has('VFX', 'drawScreen')) { try { AOW.VFX.drawScreen(ctx, cw, ch); } catch (e) { /* optional */ } }
    drawPreviewTooltip();
    drawBanner(dt);
    // vignette
    ctx.fillStyle = Art.rgrad(ctx, cw / 2, ch / 2, ch * 0.45, Math.max(cw, ch) * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(5,6,12,0.55)']]);
    ctx.fillRect(0, 0, cw, ch);
    const ms = performance.now() - t0;
    perf.frames++; perf.total += ms; perf.last = ms; if (ms > perf.max) perf.max = ms;
    perf.hist.push(ms); if (perf.hist.length > 120) perf.hist.shift();
    if (CR.showPerf) {
      const avg = perf.hist.reduce((s, v) => s + v, 0) / Math.max(1, perf.hist.length);
      Art.text(ctx, 'frame ' + ms.toFixed(2) + ' ms  avg ' + avg.toFixed(2) + ' ms  ground ' + groundMs.toFixed(0) + ' ms  zoom ' + cam.zoom.toFixed(2), 10, ch - 12, { size: 11, color: '#e8e2d0', align: 'left', stroke: 'rgba(0,0,0,0.8)', strokeWidth: 3, font: FONT_UI });
    }
  };
  CR.stats = function () {
    const avg = perf.hist.reduce((s, v) => s + v, 0) / Math.max(1, perf.hist.length);
    return { frames: perf.frames, avgMs: +avg.toFixed(2), maxMs: +perf.max.toFixed(2), lastMs: +perf.last.toFixed(2), groundMs: +groundMs.toFixed(1), units: battle ? battle.units.length : 0, walls: walls.length, decor: decor.length };
  };

  // ================================================================ event sequencer
  const seq = { steps: [], cur: null, t: 0, playing: false, done: [], pending: [] };
  function step(dur, fns) { return Object.assign({ dur: Math.max(0.0001, dur), started: false }, fns); }
  function seqUpdate(dt) {
    if (!seq.playing) return;
    let budget = dt * (CR.speed || 1);
    let guard = 0;
    while (budget > 0 && guard++ < 50) {
      if (!seq.cur) {
        seq.cur = seq.steps.shift() || null; seq.t = 0;
        if (!seq.cur) { finishSequence(); return; }
        try { if (seq.cur.start) seq.cur.start(); } catch (e) { console.error('[CombatRender] step start', e); }
      }
      const need = seq.cur.dur - seq.t, use = Math.min(need, budget);
      seq.t += use; budget -= use;
      try { if (seq.cur.update) seq.cur.update(M.clamp(seq.t / seq.cur.dur, 0, 1)); } catch (e) { console.error('[CombatRender] step update', e); }
      if (seq.t >= seq.cur.dur - 1e-9) { try { if (seq.cur.end) seq.cur.end(); } catch (e) { console.error('[CombatRender] step end', e); } seq.cur = null; }
    }
  }
  function finishSequence() {
    seq.playing = false; seq.cur = null; seq.steps = [];
    for (const u of battle.units || []) { const us = US(u); us.lock = false; us.lungeX = us.lungeY = 0; if (us.anim !== 'idle' && !us.dying) us.anim = 'idle'; if (isDead(u) && !us.dying) us.deathPlayed = true; us.hpShown = u.hp; }
    const dones = seq.done; seq.done = [];
    for (const fn of dones) { try { fn(); } catch (e) { console.error('[CombatRender] done', e); } }
    if (seq.pending.length) { const p = seq.pending.shift(); CR.playEvents(p.events, p.done); }
  }
  CR.isPlaying = () => seq.playing;
  CR.playEvents = function (events, done) {
    events = Array.isArray(events) ? events : (events ? [events] : []);
    if (seq.playing) { seq.pending.push({ events, done }); return; }
    const steps = [];
    for (const ev of events) {
      if (!ev || typeof ev !== 'object') continue;
      try { buildSteps(ev, steps); } catch (e) { console.error('[CombatRender] event', ev, e); }
    }
    if (typeof done === 'function') seq.done.push(done);
    if (CR.skipAnimations || !steps.length) {
      for (const s of steps) { try { if (s.start) s.start(); if (s.update) s.update(1); if (s.end) s.end(); } catch (e) { console.error(e); } }
      seq.playing = true; finishSequence();
      return;
    }
    seq.steps = steps; seq.cur = null; seq.playing = true;
  };
  function evType(ev) { return String(ev.type || ev.kind || ev.event || '').toLowerCase(); }
  function buildSteps(ev, out) {
    const type = evType(ev);
    switch (type) {
      case 'move': case 'walk': case 'flee': case 'retreat': case 'charge_move': return stepsMove(ev, out, type === 'flee' || type === 'retreat');
      case 'attack': case 'retaliate': case 'retaliation': case 'strike': case 'counter': return stepsAttack(ev, out, type !== 'attack' && type !== 'strike');
      case 'ranged': case 'shoot': return stepsAttack(Object.assign({ kind: 'ranged' }, ev), out, false);
      case 'ability': case 'cast': case 'spell': case 'breath': return stepsSpell(ev, out, type === 'spell' || type === 'cast');
      case 'death': case 'die': case 'kill': case 'killed': return stepsDeath(ev, out);
      case 'status': case 'status_applied': case 'status_removed': case 'status_resisted': case 'status_expired': return stepsStatus(ev, out);
      case 'heal': case 'healed': case 'regen': return stepsHeal(ev, out);
      case 'morale': case 'morale_change': case 'panic': case 'rally': return stepsMorale(ev, out);
      case 'defend': case 'guard': return stepsDefend(ev, out);
      case 'wall': case 'wall_damage': case 'wall_hit': case 'gate': case 'breach': case 'wall_destroyed': return stepsWall(ev, out);
      case 'summon': case 'spawn': return stepsSummon(ev, out);
      case 'teleport': case 'phase': case 'blink': return stepsTeleport(ev, out);
      case 'push': case 'knockback': return stepsMove(Object.assign({}, ev, { path: ev.path || [ev.to || ev.hex] }), out, false, true);
      case 'round': case 'round_start': case 'new_round': return out.push(step(1.0, { start() { CR.showBanner(t('battle.round', 'Round {n}', { n: ev.round || ev.n || (battle && battle.round) }), '', 1.4, '#e8e2d0'); sfx('turn_start'); } }));
      case 'end': case 'battle_end': case 'victory': case 'defeat': case 'finish': return stepsEnd(ev, out);
      case 'levelup': case 'level_up': case 'rank': case 'rank_up': { const u = unitOf(ev, ['unitId', 'unit', 'id']); if (u) out.push(step(0.5, { start() { const us = US(u); vfx('level_up', us.x, us.y, {}); vfxText(us.x, us.y - unitHeight(u, us) - 10, t('battle.rankUp', 'Rank up!'), { color: '#f1d98a', size: 13 }); sfx('level_up'); } })); return; }
      case 'wait': case 'skip': case 'end_turn': case 'turn': case 'side': case 'log': case 'ap': case 'cooldown': case 'select': case 'flank': return;
      case 'miss': case 'dodge': { const u = unitOf(ev, ['target', 'targetId', 'unitId', 'unit']); if (u) out.push(step(0.3, { start() { const us = US(u); vfxText(us.x, us.y - unitHeight(u, us) - 6, t('battle.miss', 'MISS'), { color: '#c9c4bc', size: 13 }); } })); return; }
      case 'damage': case 'dot': case 'hit': return stepsDamage(ev, out);
      case 'shake': return out.push(step(0.05, { start() { CR.shake(ev.intensity || 6); } }));
      default: { if (ev.hits && (ev.target !== undefined || ev.targetId !== undefined)) return stepsAttack(ev, out, false); AOW.log && AOW.log('[CombatRender] unhandled event', type); }
    }
  }
  function applyHitVisual(u, hit, i, ev) {
    const us = US(u);
    const dmg = typeof hit === 'number' ? hit : (hit.dmg !== undefined ? hit.dmg : (hit.damage !== undefined ? hit.damage : hit.amount)) || 0;
    const miss = hit.miss || hit.missed || hit.hit === false || hit.result === 'miss';
    const crit = !!hit.crit; const graze = !!(hit.graze || hit.fumble || hit.glance); const blocked = !!(hit.blocked || hit.block);
    const heal = dmg < 0 || hit.heal;
    const top = us.y - unitHeight(u, us) - 4 + (i % 2) * 6;
    const jx = (i - 1) * 9;
    if (miss) { vfxText(us.x + jx, top, t('battle.miss', 'MISS'), { color: '#c9c4bc', size: 13 }); return; }
    if (heal) { const n = Math.abs(dmg); vfxText(us.x + jx, top, '+' + Math.round(n), { color: '#8fe07a', size: 15 }); us.hpShown = Math.min(u.maxHp || Infinity, us.hpShown + n); return; }
    if (blocked || dmg <= 0) { vfxText(us.x + jx, top, t('battle.block', 'BLOCK'), { color: '#bfc8d8', size: 12 }); vfx('sparks', us.x, us.y - 14, { color: '#dfe3ea', scale: 0.7 }); sfx('shield_block'); return; }
    const channel = hit.channel || ev.channel || 'physical';
    const color = crit ? '#ffd35a' : graze ? '#a8a29a' : (Palette.channel[channel] && channel !== 'physical' ? Palette.channel[channel] : '#ffffff');
    vfxText(us.x + jx, top, (crit ? '' : '') + Math.round(dmg) + (crit ? '!' : ''), { color, size: crit ? 20 : graze ? 12 : 15, crit });
    us.hpFrom = us.hpShown; us.hpShown = Math.max(0, us.hpShown - dmg); us.hpFlashT = 0.7;
    us.flash = 1; us.anim = 'hit'; us.animT = 0; us.frame = 0;
    const vk = CHANNEL_VFX[channel] || 'blood_hit';
    vfx(vk, us.x, us.y - unitHeight(u, us) * 0.5, { color: Palette.channel[channel], scale: crit ? 1.3 : 1 });
    if (channel === 'physical' && crit) vfx('sparks', us.x, us.y - 16, { scale: 1.1 });
    if (hit.status) { const sid = typeof hit.status === 'string' ? hit.status : hit.status.id; if (sid) { us.popIcon = sid; us.popT = 0.9; } }
  }
  function hitsOf(ev) {
    let hits = ev.hits || ev.results || ev.strikes;
    if (!hits) { if (ev.dmg !== undefined || ev.damage !== undefined || ev.miss) hits = [{ dmg: ev.dmg !== undefined ? ev.dmg : ev.damage, crit: ev.crit, miss: ev.miss, graze: ev.graze, status: ev.status, blocked: ev.blocked }]; else hits = []; }
    return hits;
  }
  function stepsMove(ev, out, fleeing, pushed) {
    const u = unitOf(ev, ['unitId', 'unit', 'id', 'attacker', 'mover']); if (!u) return;
    const us = US(u);
    let path = (ev.path || []).map(hexOf).filter(Boolean);
    if (!path.length && ev.to) path = [hexOf(ev.to)].filter(Boolean);
    if (!path.length) return;
    const from = hexOf(ev.from) || { col: us.col, row: us.row };
    if (path[0].col === from.col && path[0].row === from.row) path = path.slice(1);
    if (!path.length) return;
    const secPerHex = pushed ? 0.12 : (fleeing ? 0.12 : MOVE_SEC);
    let prev = from;
    const p0 = toPixel(from.col, from.row);
    out.push(step(0.0001, { start() { us.lock = true; us.x = p0.x; us.y = p0.y; us.anim = 'walk'; us.animT = 0; if (fleeing) { us.popIcon = 'panicked'; us.popT = 0.9; } if (ev.charge || (path.length >= 3 && (unitDef(u).tags || []).includes('cavalry'))) sfx('cavalry_charge'); } }));
    path.forEach((h, i) => {
      const a = toPixel(prev.col, prev.row), b = toPixel(h.col, h.row);
      const cell = cellAt(h.col, h.row);
      const dir = b.x > a.x + 1 ? 'right' : b.x < a.x - 1 ? 'left' : null;
      out.push(step(secPerHex, {
        start() { if (dir) us.facing = dir; sfx(footstepFor(cell), { volume: 0.6 }); if (cell && cell.terrain === 'snow') vfx('dust', b.x, b.y, { color: '#eef3f6', scale: 0.5 }); },
        update(k) { const e = k; us.x = M.lerp(a.x, b.x, e); us.y = M.lerp(a.y, b.y, e) - Math.sin(e * Math.PI) * 3; us.frame = Math.floor(k * 4 + i * 2) % 4; us.col = h.col; us.row = h.row; },
        end() { if (i === path.length - 1) { us.x = b.x; us.y = b.y; us.anim = 'idle'; us.lock = false; if (!pushed && !fleeing) vfx('dust', b.x, b.y + 2, { scale: 0.5 }); } },
      }));
      prev = h;
    });
  }
  function stepsAttack(ev, out, retaliation) {
    const a = unitOf(ev, ['attacker', 'attackerId', 'unitId', 'unit', 'source', 'from']);
    const tgt = unitOf(ev, ['target', 'targetId', 'defender', 'defenderId', 'to']);
    if (!a && !tgt) return;
    const hits = hitsOf(ev);
    const ranged = ev.kind === 'ranged' || ev.attackType === 'ranged' || (ev.attack && ev.attack.type === 'ranged') || ev.ranged === true || (a && tgt && Hex.dist(a.col, a.row, tgt.col, tgt.row) > 1 && !ev.melee);
    const us = a ? US(a) : null, ts = tgt ? US(tgt) : null;
    const tHex = tgt ? { x: ts.x, y: ts.y } : (hexOf(ev.hex || ev.at) ? toPixel(hexOf(ev.hex || ev.at).col, hexOf(ev.hex || ev.at).row) : null);
    const channel = ev.channel || (ev.attack && ev.attack.channel) || (hits[0] && hits[0].channel) || 'physical';
    const dirX = us && tHex ? (tHex.x >= us.x ? 1 : -1) : 1;
    const dirY = us && tHex ? Math.sign(tHex.y - us.y) : 0;
    const anyCrit = hits.some(h => h && h.crit);
    if (a && tHex) out.push(step(0.0001, { start() { us.facing = dirX > 0 ? 'right' : 'left'; us.lock = true; if (retaliation && tgt) { ts.facing = dirX > 0 ? 'left' : 'right'; } } }));
    if (ranged) {
      const magic = channel !== 'physical' || /staff|wand|orb|tome/.test((a && (unitDef(a).look || {}).weapon) || '');
      out.push(step(0.22, {
        start() { if (a) { us.anim = 'attack'; us.animT = 0; sfx(magic ? 'spell_cast_astral' : 'bow_draw', { volume: 0.7 }); if (magic) { us.castGlow = 1; us.castColor = Palette.channel[channel]; } } },
        update(k) { if (a) { us.frame = Math.floor(k * 3); us.lungeX = -dirX * 3 * Math.sin(k * Math.PI); } },
      }));
      let flight = 0.35;
      out.push(step(0.0001, { start() { if (a && tHex) { const hy = unitHeight(a, us) * 0.55; flight = projectile(magic ? 'magic_bolt' : 'arrow', us.x + dirX * 8, us.y - hy, tHex.x, tHex.y - (tgt ? unitHeight(tgt, ts) * 0.5 : 10), { color: Palette.channel[channel] || '#fff', duration: magic ? 0.28 : undefined }); sfx(magic ? 'spell_cast_' + (ev.affinity || 'astral') : 'arrow_shoot'); if (a) { us.frame = 4; } } } }));
      out.push(step(0.34, { update() { /* projectile in flight */ } }));
      hits.forEach((h, i) => out.push(step(i === hits.length - 1 ? 0.2 : 0.14, { start() { if (tgt) { applyHitVisual(tgt, h, i, Object.assign({ channel }, ev)); if (!(h.miss || h.missed)) sfx(magic ? 'spell_hit_' + channel : 'arrow_hit'); if (h.crit) sfx('crit'); } } })));
      out.push(step(0.16, { update(k) { if (a) { us.lungeX = 0; us.frame = 5; } }, end() { if (a) { us.anim = 'idle'; us.lock = false; us.lungeX = 0; } } }));
    } else {
      out.push(step(0.18, {
        start() { if (a) { us.anim = 'attack'; us.animT = 0; } },
        update(k) { if (a && tHex) { const e = M.easeIn(k); us.lungeX = dirX * 16 * e; us.lungeY = dirY * 8 * e; us.frame = Math.floor(k * 3); } },
      }));
      hits.forEach((h, i) => out.push(step(i === hits.length - 1 ? 0.2 : 0.14, {
        start() {
          if (a) us.frame = 3 + Math.min(2, i);
          if (tgt) {
            applyHitVisual(tgt, h, i, Object.assign({ channel }, ev));
            if (!(h.miss || h.missed) && (h.dmg || h.damage) > 0) { sfx(weaponSfx(a || tgt, ev)); if (h.crit) { sfx('crit'); CR.shake(4); } ts.lungeX = dirX * 5; ts.lungeY = dirY * 2; }
          } else if (tHex) { vfx(CHANNEL_VFX[channel] || 'dust', tHex.x, tHex.y - 10, {}); sfx(weaponSfx(a, ev)); }
        },
        update(k) { if (tgt) { ts.lungeX *= (1 - k); ts.lungeY *= (1 - k); } if (a) { us.lungeX = dirX * 16 * (1 - 0.3 * k); } },
        end() { if (tgt) { ts.lungeX = 0; ts.lungeY = 0; } },
      })));
      out.push(step(0.2, {
        update(k) { if (a) { const e = 1 - M.easeOut(k); us.lungeX = dirX * 11 * e; us.lungeY = dirY * 6 * e; us.frame = 5; } },
        end() { if (a) { us.anim = 'idle'; us.lock = false; us.lungeX = 0; us.lungeY = 0; } if (tgt && ts.anim === 'hit') ts.anim = 'idle'; },
      }));
    }
    if (ev.killed || ev.kill) {
      const killed = Array.isArray(ev.killed) ? ev.killed : [ev.killed === true ? (tgt && tgt.id) : ev.killed];
      for (const k of killed) { const ku = k && typeof k === 'object' ? unitById(k.id) || k : unitById(k); if (ku) stepsDeath({ unit: ku }, out); }
    } else if (tgt && ts && anyCrit === anyCrit) { /* death (if any) arrives as its own event */ }
  }
  function stepsDamage(ev, out) {
    const tgt = unitOf(ev, ['target', 'targetId', 'unitId', 'unit', 'id']); if (!tgt) return;
    const hits = hitsOf(ev);
    const channel = ev.channel || 'physical';
    hits.forEach((h, i) => out.push(step(0.22, { start() { applyHitVisual(tgt, h, i, Object.assign({ channel }, ev)); if (channel !== 'physical') sfx('spell_hit_' + channel, { volume: 0.6 }); } })));
    if (ev.source === 'status' || ev.status) out[out.length - 1].end = () => { const ts = US(tgt); if (ts.anim === 'hit') ts.anim = 'idle'; };
  }
  function stepsSpell(ev, out, isSpell) {
    const caster = unitOf(ev, ['caster', 'casterId', 'unitId', 'unit', 'attacker', 'source']);
    const targetUnit = unitOf(ev, ['target', 'targetId']);
    const targetHex = hexOf(ev.hex || ev.at || ev.targetHex || (targetUnit ? null : ev.target)) || (targetUnit ? { col: targetUnit.col, row: targetUnit.row } : null);
    const id = ev.spellId || ev.abilityId || ev.id;
    let def = null;
    try { if (AOW.Data && id) { if (isSpell && AOW.Data.has('spells', id)) def = AOW.Data.get('spells', id); else if (AOW.Data.has('abilities', id)) def = AOW.Data.get('abilities', id); } } catch (e) { /* optional */ }
    const affinity = ev.affinity || (def && def.affinity && (typeof def.affinity === 'string' ? def.affinity : Object.keys(def.affinity)[0])) || 'astral';
    const channel = ev.channel || (def && def.effect && def.effect.channel) || (ev.hits && ev.hits[0] && ev.hits[0].channel) || null;
    const area = ev.area !== undefined ? ev.area : (def && (def.area || (def.effect && def.effect.area))) || 0;
    const name = ev.name || (def ? L(def.name, id) : (id || ''));
    const color = Palette.affinity[affinity] || '#5a7ff0';
    const cs = caster ? US(caster) : null;
    const tp = targetHex ? toPixel(targetHex.col, targetHex.row) : (cs ? { x: cs.x, y: cs.y } : null);
    const targets = [];
    const results = ev.hits || ev.results || ev.effects || ev.targets || [];
    for (const r of results) {
      if (!r) continue;
      const ru = unitOf(r, ['unitId', 'unit', 'target', 'targetId', 'id']) || (targetUnit && !(r.unitId || r.target || r.targetId) ? targetUnit : null);
      if (!ru) continue;
      targets.push({ u: ru, r });
    }
    if (!targets.length && targetUnit && (ev.dmg !== undefined || ev.damage !== undefined || ev.heal !== undefined || ev.status)) targets.push({ u: targetUnit, r: ev });
    // cast
    out.push(step(0.45, {
      start() {
        if (cs) { cs.lock = true; cs.anim = 'cast'; cs.animT = 0; cs.castGlow = 1.2; cs.castColor = color; if (tp) cs.facing = tp.x >= cs.x ? 'right' : 'left'; vfx(AFFINITY_VFX[affinity] || 'arcane_swirl', cs.x, cs.y - unitHeight(caster, cs) * 0.5, { color, scale: 0.8 }); vfx('summon_circle', cs.x, cs.y, { color, scale: 0.6, duration: 0.6 }); }
        else if (tp) vfx('summon_circle', tp.x, tp.y, { color, scale: 0.9 });
        if (name) vfxText(cs ? cs.x : tp.x, (cs ? cs.y - unitHeight(caster, cs) : tp.y) - 16, name, { color: Color.mix(color, '#fff', 0.5), size: 12, rise: true });
        sfx('spell_cast_' + affinity);
        if ((unitDef(caster || {}).tags || []).includes('dragon') && /breath/.test(String(id))) sfx('dragon_roar');
      },
      update(k) { if (cs) cs.frame = Math.floor(k * 4) % 4; },
    }));
    // travel (bolt) for ranged single-target spells
    if (cs && tp && M.dist(cs.x, cs.y, tp.x, tp.y) > SIZE * 1.2 && area === 0 && channel && channel !== 'spirit') {
      let dur = 0.3;
      out.push(step(0.0001, { start() { dur = projectile('magic_bolt', cs.x, cs.y - unitHeight(caster, cs) * 0.5, tp.x, tp.y - 14, { color: Palette.channel[channel] || color, duration: 0.3 }); } }));
      out.push(step(0.3, {}));
    }
    // impact
    out.push(step(0.32, {
      start() {
        if (tp) {
          const kind = channel ? (CHANNEL_VFX[channel] || 'arcane_swirl') : (AFFINITY_VFX[affinity] || 'arcane_swirl');
          const isHeal = (def && def.effect && def.effect.type === 'heal') || ev.heal || targets.some(x => (x.r.heal || (x.r.dmg < 0)));
          vfx(isHeal ? 'heal_glow' : kind, tp.x, tp.y - 8, { color: channel ? Palette.channel[channel] : color, scale: 1 + area * 0.5, radius: (area + 0.6) * SIZE });
          if (area > 0) for (const h of Hex.spiral(targetHex.col, targetHex.row, area)) { if (!inBounds(h.col, h.row) || (h.col === targetHex.col && h.row === targetHex.row)) continue; const q = toPixel(h.col, h.row); vfx(isHeal ? 'heal_glow' : kind, q.x, q.y - 6, { color: channel ? Palette.channel[channel] : color, scale: 0.7 }); }
          if (channel) sfx('spell_hit_' + channel); else if (isHeal) sfx('heal');
          if (channel === 'lightning' || channel === 'fire' && area > 0) CR.shake(5);
        }
      },
    }));
    targets.forEach((x, i) => out.push(step(0.16, {
      start() {
        const r = x.r, u = x.u, us2 = US(u);
        const hits = r.hits || (r.dmg !== undefined || r.damage !== undefined || r.miss ? [r] : []);
        hits.forEach((h, j) => applyHitVisual(u, h, j, Object.assign({ channel: channel || 'spirit' }, r)));
        const healAmt = r.heal !== undefined ? r.heal : (r.healed !== undefined ? r.healed : (r.amount && (r.type === 'heal') ? r.amount : 0));
        if (healAmt > 0) { vfxText(us2.x, us2.y - unitHeight(u, us2) - 6, '+' + Math.round(healAmt), { color: '#8fe07a', size: 15 }); us2.hpShown = Math.min(u.maxHp || Infinity, us2.hpShown + healAmt); vfx('heal_glow', us2.x, us2.y - 10, { scale: 0.8 }); }
        const st = r.status || r.applied; if (st) { const sid = typeof st === 'string' ? st : st.id; if (sid) { us2.popIcon = sid; us2.popT = 0.9; vfxText(us2.x, us2.y - unitHeight(u, us2) - 22, statusLabel(sid), { color: '#d9c4ff', size: 11 }); } }
        if (r.resisted) vfxText(us2.x, us2.y - unitHeight(u, us2) - 22, t('battle.resisted', 'Resisted'), { color: '#c9c4bc', size: 11 });
        if (r.killed || r.dead) stepsDeath({ unit: u }, seq.steps);
      },
    })));
    out.push(step(0.18, { end() { if (cs) { cs.anim = 'idle'; cs.lock = false; } for (const x of targets) { const s = US(x.u); if (s.anim === 'hit') s.anim = 'idle'; } } }));
    if (ev.killed) { const killed = Array.isArray(ev.killed) ? ev.killed : [ev.killed]; for (const k of killed) { const ku = k && typeof k === 'object' ? unitById(k.id) || k : unitById(k); if (ku) stepsDeath({ unit: ku }, out); } }
  }
  function statusLabel(sid) {
    try { if (AOW.Data && AOW.Data.has('statuses', sid)) return L(AOW.Data.get('statuses', sid).name, sid); } catch (e) { /* optional */ }
    return sid.replace(/_/g, ' ');
  }
  function stepsDeath(ev, out) {
    const u = unitOf(ev, ['unitId', 'unit', 'id', 'target', 'targetId']); if (!u) return;
    const us = US(u);
    if (us.deathPlayed || us.dying) return;
    out.push(step(0.75, {
      start() { us.dying = true; us.deathT = 0; us.anim = 'death'; us.animT = 0; us.lock = true; us.hpShown = 0; sfx(deathSfxFor(u)); vfx('blood_hit', us.x, us.y - 10, { scale: 0.9 }); vfx('dust', us.x, us.y + 2, { scale: 0.9 }); },
      update(k) { us.deathT = k * 0.75; us.frame = Math.floor(k * 4); us.alpha = 1 - M.easeIn(k) * 0.9; },
      end() { us.dying = false; us.deathPlayed = true; us.alpha = 0; us.lock = false; if (hover.unitId === u.id) hover.unitId = null; },
    }));
  }
  function stepsStatus(ev, out) {
    const u = unitOf(ev, ['unitId', 'unit', 'target', 'targetId', 'id']); if (!u) return;
    const sid = typeof ev.status === 'string' ? ev.status : (ev.status && ev.status.id) || ev.statusId || ev.id;
    const removed = ev.removed || ev.expired || evType(ev) === 'status_removed' || evType(ev) === 'status_expired' || ev.applied === false && !ev.resisted;
    const resisted = ev.resisted || evType(ev) === 'status_resisted';
    out.push(step(0.42, {
      start() {
        const us = US(u);
        const top = us.y - unitHeight(u, us) - 8;
        if (resisted) { vfxText(us.x, top, t('battle.resisted', 'Resisted'), { color: '#c9c4bc', size: 12 }); return; }
        const label = sid ? statusLabel(sid) : '';
        if (removed) { vfxText(us.x, top, '− ' + label, { color: '#bfc8d8', size: 12 }); return; }
        us.popIcon = sid; us.popT = 0.9;
        let kind = 'buff';
        try { if (AOW.Data && sid && AOW.Data.has('statuses', sid)) kind = AOW.Data.get('statuses', sid).kind || 'buff'; } catch (e) { /* optional */ }
        const debuff = kind === 'debuff';
        vfxText(us.x, top, '+ ' + label, { color: debuff ? '#ff9a7a' : '#a8e0ff', size: 12 });
        vfx(debuff ? 'shadow_wisp' : 'holy_light', us.x, us.y - unitHeight(u, us) * 0.5, { scale: 0.6, color: debuff ? '#a04060' : '#a8e0ff' });
      },
    }));
  }
  function stepsHeal(ev, out) {
    const u = unitOf(ev, ['unitId', 'unit', 'target', 'targetId', 'id']); if (!u) return;
    const amt = pick(ev, ['amount', 'heal', 'healed', 'hp', 'value']) || 0;
    out.push(step(0.5, { start() { const us = US(u); vfx('heal_glow', us.x, us.y - 10, { scale: 1 }); vfxText(us.x, us.y - unitHeight(u, us) - 6, '+' + Math.round(amt), { color: '#8fe07a', size: 16 }); us.hpShown = Math.min(u.maxHp || Infinity, us.hpShown + amt); sfx('heal'); } }));
  }
  function stepsMorale(ev, out) {
    const u = unitOf(ev, ['unitId', 'unit', 'target', 'targetId', 'id']); if (!u) return;
    const state = ev.state || ev.moraleState || (ev.delta < 0 || ev.amount < 0 ? 'shaken' : 'inspired');
    out.push(step(0.5, {
      start() {
        const us = US(u); const top = us.y - unitHeight(u, us) - 8;
        const bad = state === 'breaking' || state === 'fleeing' || state === 'shaken' || state === 'panicked' || state === 'demoralized';
        const label = state === 'fleeing' ? t('battle.fleeing', 'Fleeing!') : state === 'breaking' ? t('battle.breaking', 'Breaking!') : bad ? t('battle.shaken', 'Shaken') : state === 'rallied' ? t('battle.rallied', 'Rallied') : t('battle.inspired', 'Inspired');
        vfxText(us.x, top, label, { color: bad ? '#ff7a5a' : '#f1d98a', size: 13, crit: state === 'fleeing' });
        us.popIcon = bad ? 'morale' : 'inspired'; us.popT = 0.9;
        if (bad) { sfx('morale_break'); vfx('shadow_wisp', us.x, us.y - 20, { scale: 0.6, color: '#503050' }); } else vfx('holy_light', us.x, us.y - 18, { scale: 0.6 });
      },
    }));
  }
  function stepsDefend(ev, out) {
    const u = unitOf(ev, ['unitId', 'unit', 'id']); if (!u) return;
    out.push(step(0.35, { start() { const us = US(u); us.defendPop = 1.2; us.popIcon = 'defend'; us.popT = 0.9; sfx('shield_block', { volume: 0.5 }); vfx('sparks', us.x, us.y - 16, { scale: 0.5, color: '#bfd0ff' }); } }));
  }
  function stepsWall(ev, out) {
    const h = hexOf(ev.hex || ev.at || ev.wall || ev.target || ev); if (!h) return;
    const w = wallAt(h.col, h.row);
    const dmg = pick(ev, ['dmg', 'damage', 'amount']);
    const destroyed = ev.destroyed || ev.breached || ev.hp === 0 || evType(ev) === 'breach' || evType(ev) === 'wall_destroyed';
    out.push(step(0.45, {
      start() {
        const p = toPixel(h.col, h.row);
        if (w) {
          if (ev.hp !== undefined) { const mx = ev.maxHp || w.maxHp || 1; w.hp = M.clamp(mx > 1 ? ev.hp / mx : ev.hp, 0, 1); }
          else if (dmg !== undefined && w.maxHp > 1) w.hp = M.clamp(w.hp - dmg / w.maxHp, 0, 1);
          else if (w.ref && w.ref.hp !== undefined) { const mx = w.ref.maxHp || w.maxHp || 1; w.hp = M.clamp(mx > 1 ? w.ref.hp / mx : w.ref.hp, 0, 1); }
          if (destroyed) w.hp = 0;
        }
        vfx('dust', p.x, p.y, { scale: destroyed ? 1.6 : 1, color: '#a89a80' });
        vfx('smoke', p.x, p.y - 10, { scale: destroyed ? 1.2 : 0.7, color: '#6a6058' });
        for (let i = 0; i < (destroyed ? 8 : 3); i++) vfx('sparks', p.x + (Math.random() - 0.5) * 30, p.y - 8, { scale: 0.6, color: '#c8bca4' });
        if (dmg !== undefined) vfxText(p.x, p.y - 30, String(Math.round(dmg)), { color: '#e8d8b0', size: 14 });
        sfx(destroyed ? 'giant_stomp' : 'blunt_hit'); CR.shake(destroyed ? 8 : 3);
        if (destroyed) vfxText(p.x, p.y - 44, t('battle.breach', 'Breach!'), { color: '#ffb070', size: 15, crit: true });
      },
    }));
  }
  function stepsSummon(ev, out) {
    const u = unitOf(ev, ['unitId', 'unit', 'id', 'summoned']); if (!u) return;
    const h = hexOf(ev.hex || ev.at) || { col: u.col, row: u.row };
    out.push(step(0.7, {
      start() { const us = US(u); const p = toPixel(h.col, h.row); us.x = p.x; us.y = p.y; us.lock = true; us.alpha = 0; us.deathPlayed = false; vfx('summon_circle', p.x, p.y, { color: Palette.affinity[ev.affinity] || '#9a86ff', scale: 1 }); sfx('magic_summon'); },
      update(k) { US(u).alpha = M.easeOut(k); },
      end() { const us = US(u); us.alpha = 1; us.lock = false; },
    }));
  }
  function stepsTeleport(ev, out) {
    const u = unitOf(ev, ['unitId', 'unit', 'id']); if (!u) return;
    const to = hexOf(ev.to || ev.hex || ev.at) || { col: u.col, row: u.row };
    const us = US(u);
    out.push(step(0.25, { start() { us.lock = true; vfx('arcane_swirl', us.x, us.y - 16, { scale: 0.8 }); sfx('spell_cast_astral'); }, update(k) { us.alpha = 1 - k; } }));
    out.push(step(0.25, { start() { const p = toPixel(to.col, to.row); us.x = p.x; us.y = p.y; us.col = to.col; us.row = to.row; vfx('arcane_swirl', p.x, p.y - 16, { scale: 0.8 }); }, update(k) { us.alpha = k; }, end() { us.alpha = 1; us.lock = false; } }));
  }
  function stepsEnd(ev, out) {
    const winner = ev.winner !== undefined ? ev.winner : (battle && battle.winner);
    const viewer = battle.viewerSide !== undefined ? battle.viewerSide : 0;
    let text, color;
    if (winner === null || winner === undefined || winner === -1) { text = t('battle.draw', 'Battle over'); color = '#e8e2d0'; }
    else if (winner === viewer) { text = t('battle.victory', 'Victory'); color = '#f1d98a'; }
    else { text = t('battle.defeat', 'Defeat'); color = '#ff8a6a'; }
    out.push(step(0.4, {}));
    out.push(step(2.6, { start() { CR.showBanner(text, ev.sub || '', 2.8, color); sfx(winner === viewer ? 'battle_win' : 'battle_lose'); if (winner === viewer) vfx('holy_light', cam.x, cam.y, { scale: 2 }); } }));
  }
  CR.playEffect = function (kind, col, row, params) { const p = toPixel(col, row); return vfx(kind, p.x, p.y - 8, params); };

  // ================================================================ interaction
  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    const sx = (e.clientX - r.left) * (canvas.width / dprScale) / r.width, sy = (e.clientY - r.top) * (canvas.height / dprScale) / r.height;
    return { sx, sy };
  }
  let drag = null;
  function setHover(sx, sy, inside) {
    const w = screenToWorld(sx, sy), h = fromPixel(w.x, w.y);
    hover.sx = sx; hover.sy = sy; hover.inside = inside && inBounds(h.col, h.row);
    const col = hover.inside ? h.col : -1, row = hover.inside ? h.row : -1;
    let uid = null;
    if (hover.inside) {
      // prefer the unit whose sprite is under the cursor (sprites extend above the hex)
      let best = null, bestD = 1e9;
      for (const u of battle.units || []) {
        const us = US(u); if (!visibleUnit(u, us) || isDead(u)) continue;
        const hh = unitHeight(u, us);
        if (Math.abs(w.x - us.x) <= 20 && w.y <= us.y + 8 && w.y >= us.y - hh - 4) { const d = Math.abs(w.x - us.x) + Math.abs(w.y - (us.y - hh / 2)); if (d < bestD) { bestD = d; best = u; } }
      }
      if (!best) best = unitAt(col, row);
      uid = best ? best.id : null;
    }
    if (col !== hover.col || row !== hover.row || uid !== hover.unitId) {
      hover.col = col; hover.row = row; hover.unitId = uid;
      if (targetMode && targetMode.mode === 'move') autoPath();
      if (AOW.Events) AOW.Events.emit('battle:hover', { col, row, unitId: uid });
    }
  }
  function autoPath() {
    const au = active.unitId !== null ? unitById(active.unitId) : null;
    if (!au || !hover.inside) { pathPreview = null; return; }
    if (active.reach && !active.reach.has(hexKey(hover.col, hover.row))) { pathPreview = null; return; }
    let path = null;
    if (has('Combat', 'path')) { try { const r = AOW.Combat.path(battle, au.id, { col: hover.col, row: hover.row }); path = r && (r.path || r); } catch (e) { path = null; } }
    if (!path) {
      const start = au.row * W + au.col, goal = hover.row * W + hover.col;
      const r = Hex.astar(start, goal, W, H, (from, to) => { const c = to % W, rr = Math.floor(to / W); if (isBlocked(c, rr)) return Infinity; const o = unitAt(c, rr); if (o && o.id !== au.id) return Infinity; return 1; }, { maxCost: 30 });
      path = r ? r.path.map(i => ({ col: i % W, row: Math.floor(i / W) })) : null;
    }
    pathPreview = Array.isArray(path) && path.length ? path : null;
  }
  function bindInput() {
    const on = (name, fn, opts) => { canvas.addEventListener(name, fn, opts); listeners.push([name, fn, opts]); };
    on('pointermove', e => {
      const { sx, sy } = pointerPos(e);
      if (drag) {
        const dx = sx - drag.sx, dy = sy - drag.sy;
        if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true;
        if (drag.moved) { cam.tx = drag.cx - dx / cam.zoom; cam.ty = drag.cy - dy / cam.zoom; clampCamera(); cam.x = cam.tx; cam.y = cam.ty; }
      }
      setHover(sx, sy, true);
    });
    on('pointerdown', e => {
      const { sx, sy } = pointerPos(e);
      drag = { sx, sy, cx: cam.tx, cy: cam.ty, moved: false, button: e.button };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
    });
    on('pointerup', e => {
      const { sx, sy } = pointerPos(e);
      const d = drag; drag = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* optional */ }
      if (d && !d.moved) {
        setHover(sx, sy, true);
        if (hover.inside && AOW.Events) AOW.Events.emit('battle:click', { col: hover.col, row: hover.row, unitId: hover.unitId, button: e.button, shift: e.shiftKey, ctrl: e.ctrlKey });
      }
    });
    on('pointerleave', () => { hover.inside = false; if (hover.col !== -1 || hover.unitId) { hover.col = hover.row = -1; hover.unitId = null; if (AOW.Events) AOW.Events.emit('battle:hover', { col: -1, row: -1, unitId: null }); } });
    on('wheel', e => {
      e.preventDefault();
      const { sx, sy } = pointerPos(e);
      const before = screenToWorld(sx, sy);
      const f = Math.exp(-e.deltaY * 0.0012);
      cam.tz = M.clamp(cam.tz * f, cam.minZoom, cam.maxZoom);
      cam.zoom = cam.tz;
      const after = screenToWorld(sx, sy);
      cam.tx += before.x - after.x; cam.ty += before.y - after.y; clampCamera(); cam.x = cam.tx; cam.y = cam.ty;
    }, { passive: false });
    on('contextmenu', e => e.preventDefault());
  }
  function unbindInput() { for (const [n, f, o] of listeners) canvas.removeEventListener(n, f, o); listeners.length = 0; }

  // ================================================================ selection / modes
  CR.setSelection = function (unitId) { selection = unitId === undefined ? null : unitId; };
  CR.setActiveUnit = function (unitId) {
    active.unitId = unitId === undefined ? null : unitId;
    active.reach = null; active.targets = null;
    const u = unitId !== null && unitId !== undefined ? unitById(unitId) : null;
    if (!u) return;
    // reachable
    let reach = null;
    if (has('Combat', 'reachable')) { try { reach = AOW.Combat.reachable(battle, u.id); } catch (e) { reach = null; } }
    const map = new Map();
    const mpPerAp = Math.max(1, (u.mp || (u.stats && u.stats.mp) || 3) / Math.max(1, u.apMax || 3));
    const apAvail = u.ap !== undefined ? u.ap : 3;
    const addR = (col, row, cost, ap) => { if (!inBounds(col, row)) return; if (ap === undefined) ap = Math.max(1, Math.ceil(cost / mpPerAp)); if (ap > apAvail && apAvail > 0) return; map.set(hexKey(col, row), { col, row, cost, ap }); };
    if (reach instanceof Map) { for (const [k, v] of reach) { const h = typeof k === 'number' ? hexOf(k) : (typeof k === 'string' ? { col: +k.split(',')[0], row: +k.split(',')[1] } : hexOf(k)); if (!h) continue; const cost = typeof v === 'number' ? v : (v.cost !== undefined ? v.cost : v.mp || 0); addR(h.col, h.row, cost, typeof v === 'object' ? v.ap : undefined); } }
    else if (Array.isArray(reach)) { for (const r of reach) { const h = hexOf(r); if (!h) continue; addR(h.col, h.row, r.cost !== undefined ? r.cost : (r.mp !== undefined ? r.mp : 1), r.ap); } }
    else if (reach && typeof reach === 'object') { for (const k of Object.keys(reach)) { const h = /,/.test(k) ? { col: +k.split(',')[0], row: +k.split(',')[1] } : hexOf(+k); const v = reach[k]; if (h) addR(h.col, h.row, typeof v === 'number' ? v : v.cost || 0, v && v.ap); } }
    else {
      const budget = Math.max(1, Math.round((u.mp || 4) * apAvail / Math.max(1, u.apMax || 3))) ;
      const dist = Hex.reachable(u.row * W + u.col, W, H, budget, (from, to) => { const c = to % W, r = Math.floor(to / W); if (isBlocked(c, r)) return Infinity; const o = unitAt(c, r); if (o && o.id !== u.id) return Infinity; return 1; });
      for (const [i, cost] of dist) if (cost > 0) addR(i % W, Math.floor(i / W), cost, Math.max(1, Math.ceil(cost / Math.max(1, budget / Math.max(1, apAvail)))));
    }
    active.reach = map;
    // attackable targets
    const targets = new Set();
    let acts = null;
    if (has('Combat', 'actions')) { try { acts = AOW.Combat.actions(battle, u.id); } catch (e) { acts = null; } }
    if (Array.isArray(acts)) { for (const a of acts) if (a && (a.type === 'attack' || a.type === 'ability' && a.hostile) && a.target !== undefined) { const tid = idOf(a.target); const tu = typeof a.target === 'object' && a.target.col !== undefined ? unitAt(a.target.col, a.target.row) : unitById(tid); if (tu && tu.side !== u.side) targets.add(tu.id); } }
    else {
      const range = Math.max(1, ...((u.stats && u.stats.attacks || unitDef(u).attacks || []).map(a => a.range || 1)));
      for (const o of battle.units || []) if (!isDead(o) && o.side !== u.side && Hex.dist(u.col, u.row, o.col, o.row) <= range) targets.add(o.id);
    }
    active.targets = targets;
  };
  CR.setTargetMode = function (mode, data) {
    targetMode = mode ? { mode, data: data || {} } : null;
    if (!targetMode || targetMode.mode !== 'move') pathPreview = pathPreview && targetMode ? pathPreview : null;
    if (targetMode && targetMode.mode === 'move') autoPath();
  };
  CR.getTargetMode = () => targetMode;
  CR.setPathPreview = function (path) { pathPreview = Array.isArray(path) && path.length ? path : null; };
  CR.getHoverInfo = function () {
    const k = hover.inside ? cellAt(hover.col, hover.row) : null;
    const u = hover.unitId ? unitById(hover.unitId) : null;
    const d = targetMode && targetMode.data || {};
    const area = targetMode && d.area && hover.inside ? Hex.spiral(hover.col, hover.row, d.area).filter(h => inBounds(h.col, h.row)) : null;
    return { col: hover.col, row: hover.row, unitId: hover.unitId, unit: u, hex: k ? { terrain: k.terrain, feature: k.feature, obstacle: k.obstacle, wall: wallAt(k.col, k.row) } : null,
      reach: active.reach && hover.inside ? active.reach.get(hexKey(hover.col, hover.row)) || null : null, path: pathPreview, preview: attackPreview(), area, blocked: targetMode ? !!targetMode.blocked : false, mode: targetMode ? targetMode.mode : null };
  };
  CR.getActiveUnit = () => active.unitId;
  CR.hover = hover;

  // ================================================================ lifecycle
  CR.init = function (cv, b, g) {
    if (canvas && canvas !== cv) unbindInput();
    canvas = cv; ctx = cv.getContext('2d'); game = g || (AOW.game || null);
    dprScale = 1;
    bindInput();
    CR.setBattle(b);
    return CR;
  };
  CR.setBattle = function (b) {
    battle = b || null;
    ustates.clear(); texts.length = 0; projectiles.length = 0; banner = null;
    seq.playing = false; seq.steps = []; seq.cur = null; seq.done = []; seq.pending = [];
    active.unitId = null; active.reach = null; active.targets = null; selection = null; targetMode = null; pathPreview = null;
    hover.col = hover.row = -1; hover.unitId = null;
    unitArtFailed = false;
    if (!battle) { ground = null; cells = []; walls = []; decor = []; return; }
    resolveSideColors();
    normalizeCells();
    normalizeWalls();
    paintGround();
    for (const u of battle.units || []) US(u);
    if (canvas) fitCamera(false);
  };
  CR.getBattle = () => battle;
  CR.refreshWalls = function () { normalizeWalls(); };
  CR.resize = function () { if (canvas) fitCamera(true); };
  CR.destroy = function () {
    if (canvas) unbindInput();
    if (demoRaf) cancelAnimationFrame(demoRaf);
    demoRaf = 0; demoRunning = false;
    canvas = null; ctx = null; battle = null; ground = null; cells = []; walls = []; decor = []; ustates.clear(); texts.length = 0; projectiles.length = 0;
    seq.playing = false; seq.steps = []; seq.cur = null; seq.done = []; seq.pending = [];
  };

  // ================================================================ synthetic battle + demo
  function syntheticUnitDefs() {
    const D = AOW.Data;
    const find = (pred, fallback) => { try { if (D && D.list) { const l = D.list('units').filter(pred); if (l.length) return l[0]; } } catch (e) { /* optional */ } return fallback; };
    const mk = (id, en, ko, tier, role, tags, look, hp) => ({ id, name: { en, ko }, tier, role, tags, look, hp: hp || 60, attacks: [{ id: 'strike', type: role === 'ranged' ? 'ranged' : 'melee', range: role === 'ranged' ? 5 : (role === 'mage' ? 4 : 1), damage: 12, channel: role === 'mage' ? 'fire' : 'physical' }] });
    return {
      knight: find(u => u.role === 'shock' && (u.tags || []).includes('cavalry') && u.tier <= 3, mk('knight', 'Knight', '기사', 3, 'shock', ['racial', 'cavalry'], { body: 'horse_rider', armor: 'plate', weapon: 'lance', helm: 'full', cape: 'short', shield: 'kite', size: 'large' }, 90)),
      shield: find(u => u.role === 'shield' && u.tier <= 2, mk('defender', 'Defender', '수호병', 2, 'shield', ['racial', 'infantry'], { body: 'form', armor: 'chain', weapon: 'sword_shield', helm: 'open', shield: 'tower', size: 'medium' }, 70)),
      archer: find(u => u.role === 'ranged' && u.tier <= 2 && !(u.tags || []).includes('cavalry'), mk('archer', 'Archer', '궁수', 1, 'ranged', ['racial', 'ranged'], { body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood', size: 'medium' }, 50)),
      mage: find(u => u.role === 'mage' && u.tier <= 3, mk('mage', 'Battle Mage', '전투 마법사', 3, 'mage', ['racial', 'magic_origin'], { body: 'form', armor: 'robe', weapon: 'staff', helm: 'hat', cape: 'long', element: 'fire', size: 'medium' }, 55)),
      wolf: find(u => (u.tags || []).includes('animal') && /wolf/.test(u.id), mk('wolf', 'Dire Wolf', '다이어 울프', 2, 'skirmisher', ['animal'], { body: 'beast_wolf', armor: 'none', weapon: 'claws', size: 'medium' }, 55)),
      dragon: find(u => (u.tags || []).includes('dragon') && u.tier >= 4, mk('dragon', 'Fire Dragon', '화염 드래곤', 5, 'shock', ['dragon', 'flying', 'mythic'], { body: 'dragon', armor: 'none', weapon: 'claws', element: 'fire', size: 'huge', tint: '#c8402a' }, 220)),
      hero: mk('hero', 'Champion', '용사', 4, 'hero', ['racial', 'hero'], { body: 'form', armor: 'heavy_plate', weapon: 'great_sword', helm: 'crown', cape: 'long', size: 'medium' }, 120),
      pike: find(u => u.role === 'pike' && u.tier <= 2, mk('pike', 'Pikemen', '창병', 1, 'pike', ['racial', 'infantry'], { body: 'form', armor: 'cloth', weapon: 'pike', helm: 'cap', size: 'medium' }, 60)),
    };
  }
  function syntheticBattle(o) {
    o = o || {};
    const rng = new AOW.RNG(o.seed || 'combat-demo');
    const Wd = 20, Hd = 12;
    const hexes = [];
    const base = o.terrain || 'grass';
    for (let r = 0; r < Hd; r++) for (let c = 0; c < Wd; c++) {
      const n = AOW.Noise.fbm2(c * 0.23, r * 0.31, 77, 3);
      let terrain = base, feature = 'none', obstacle = null;
      if (n > 0.28) terrain = 'forest'; else if (n < -0.3) terrain = 'hills';
      hexes.push({ terrain, feature, obstacle, height: 0.35 + n * 0.3 });
    }
    const set = (c, r, ob, terrain) => { const k = hexes[r * Wd + c]; k.obstacle = ob; if (terrain) k.terrain = terrain; if (ob === 'tree') k.feature = 'forest'; };
    const trees = [[6, 2], [7, 3], [6, 4], [13, 8], [14, 9], [12, 9], [9, 10], [10, 1], [15, 3]];
    const rocks = [[9, 5], [10, 6], [5, 8], [14, 5], [8, 8]];
    const ruins = [[11, 3], [4, 6]];
    const water = [[9, 7], [10, 8], [9, 8]];
    for (const [c, r] of trees) set(c, r, 'tree', 'forest');
    for (const [c, r] of rocks) set(c, r, 'rock', 'hills');
    for (const [c, r] of ruins) set(c, r, 'ruins');
    for (const [c, r] of water) set(c, r, 'water', 'lake');
    const defs = syntheticUnitDefs();
    const units = [];
    let id = 1;
    const add = (key, side, col, row, extra) => {
      const d = defs[key]; const hp = d.hp || 60;
      const u = Object.assign({ id: id++, gameUnitId: null, side, col, row, hp, maxHp: hp, ap: 3, mp: d.mp || 32, facing: side === 0 ? 0 : 3, statuses: [], hasRetaliation: true, hasActed: false, hero: key === 'hero', typeId: d.id, def: d, rank: rng.int(0, 3), morale: 0, stats: { maxHp: hp, attacks: d.attacks || [] } }, extra || {});
      units.push(u); return u;
    };
    const L0 = [['hero', 2, 5], ['knight', 3, 3], ['knight', 3, 7], ['shield', 3, 4], ['shield', 3, 6], ['pike', 2, 8], ['archer', 1, 4], ['archer', 1, 6], ['mage', 1, 7], ['wolf', 4, 2], ['wolf', 4, 9]];
    const L1 = [['dragon', 17, 5], ['knight', 16, 4], ['shield', 16, 6], ['shield', 16, 7], ['pike', 16, 8], ['archer', 18, 3], ['archer', 18, 8], ['mage', 18, 6], ['wolf', 15, 2], ['wolf', 15, 10]];
    for (const [k, c, r] of L0) add(k, 0, c, r);
    for (const [k, c, r] of L1) add(k, 1, c, r);
    units[3].statuses = [{ id: 'blessed', turns: 2 }, { id: 'strengthened', turns: 1 }];
    units[7].hp = 22;
    units[12].statuses = [{ id: 'burning', turns: 2 }]; units[12].hp = 40;
    units[14].morale = -3; units[14].hp = 30;
    units[5].defending = true;
    const battleObj = { id: 1, W: Wd, H: Hd, hexes, units, side: 0, round: o.round || 2, log: [{ t: 'start' }], winner: null, cp: { 0: 10, 1: 10 }, spellsCast: {}, seed: o.seed || 'combat-demo', activeUnitId: units[0].id, viewerSide: 0 };
    if (o.siege) {
      const wcol = 14, gateRow = 6;
      battleObj.walls = [];
      for (let r = 1; r <= 10; r++) { const c = wcol + ((r & 1) ? 0 : 0); battleObj.walls.push({ col: c, row: r, hp: r === 3 ? 0 : r === 8 ? 40 : 100, maxHp: 100, gate: r === gateRow, vertical: true }); hexes[r * Wd + c].obstacle = null; hexes[r * Wd + c].feature = 'none'; if (hexes[r * Wd + c].terrain === 'lake') hexes[r * Wd + c].terrain = 'grass'; }
      battleObj.siege = true; battleObj.architecture = 'feudal';
      for (const u of units) if (u.side === 1 && u.col <= wcol) u.col = wcol + 1 + rng.int(0, 1);
      // keep defenders from stacking on the same hex
      const used = new Set(); for (const u of units) { let k = hexKey(u.col, u.row); while (used.has(k)) { u.row = (u.row + 1) % Hd; k = hexKey(u.col, u.row); } used.add(k); }
    }
    return battleObj;
  }
  function scriptedEvents(b) {
    const s0 = b.units.filter(u => u.side === 0 && !isDead(u)), s1 = b.units.filter(u => u.side === 1 && !isDead(u));
    const byRole = (list, role) => list.find(u => unitDef(u).role === role) || list[0];
    const knight = byRole(s0, 'shock'), archer = byRole(s0, 'ranged'), mage = byRole(s0, 'mage'), wolf0 = s0.find(u => (unitDef(u).tags || []).includes('animal')) || s0[s0.length - 1];
    const eShield = byRole(s1, 'shield'), eArcher = byRole(s1, 'ranged'), eWolf = s1.find(u => (unitDef(u).tags || []).includes('animal')) || s1[1], dragon = s1.find(u => (unitDef(u).tags || []).includes('dragon')) || s1[0];
    const walk = [];
    let c = knight.col, r = knight.row;
    const target = { col: eShield.col - 1, row: eShield.row };
    for (let i = 0; i < 12 && (c !== target.col || r !== target.row); i++) {
      const d = Hex.dirTo(c, r, target.col, target.row); let n = Hex.neighbor(c, r, d);
      if (isBlocked(n.col, n.row) || unitAt(n.col, n.row)) { n = Hex.neighbor(c, r, (d + 1) % 6); if (isBlocked(n.col, n.row) || unitAt(n.col, n.row)) n = Hex.neighbor(c, r, (d + 5) % 6); }
      if (!inBounds(n.col, n.row) || isBlocked(n.col, n.row) || unitAt(n.col, n.row)) break;
      c = n.col; r = n.row; walk.push({ col: c, row: r });
    }
    const evs = [
      { type: 'move', unitId: knight.id, from: { col: knight.col, row: knight.row }, path: walk },
      { type: 'attack', attacker: knight.id, target: eShield.id, kind: 'melee', hits: [{ dmg: 14 }, { dmg: 21, crit: true }], charge: true },
      { type: 'retaliate', attacker: eShield.id, target: knight.id, hits: [{ dmg: 6, graze: true }] },
      { type: 'attack', attacker: eArcher.id, target: knight.id, kind: 'ranged', hits: [{ dmg: 0, miss: true }] },
      { type: 'attack', attacker: archer.id, target: eWolf.id, kind: 'ranged', hits: [{ dmg: 12 }] },
      { type: 'spell', caster: mage.id, spellId: 'fireball', name: 'Fireball', affinity: 'chaos', channel: 'fire', area: 1, hex: { col: eWolf.col, row: eWolf.row }, hits: [{ unitId: eWolf.id, dmg: 18, status: 'burning' }, { unitId: eShield.id, dmg: 9, resisted: true }] },
      { type: 'status', unitId: eWolf.id, status: 'burning', applied: true },
      { type: 'morale', unitId: eWolf.id, state: 'breaking' },
      { type: 'heal', unitId: knight.id, amount: 12 },
      { type: 'defend', unitId: archer.id },
      { type: 'ability', unitId: dragon.id, abilityId: 'dragon_breath_fire', name: 'Fire Breath', affinity: 'chaos', channel: 'fire', area: 1, hex: { col: wolf0.col, row: wolf0.row }, hits: [{ unitId: wolf0.id, dmg: 34, crit: true }] },
      { type: 'death', unitId: wolf0.id },
    ];
    if (b.walls && b.walls.length) { const w = b.walls.find(x => x.hp > 0 && x.hp < 100) || b.walls[0]; evs.push({ type: 'wall', col: w.col, row: w.row, dmg: 35, hp: Math.max(0, (w.hp || 100) - 35), maxHp: 100 }); }
    evs.push({ type: 'round', round: 3 });
    return evs;
  }
  CR.syntheticBattle = syntheticBattle;
  CR.scriptedEvents = scriptedEvents;
  CR.demo = function (cv, q) {
    const get = k => { if (!q) return null; if (typeof q.get === 'function') return q.get(k); return q[k] === undefined ? null : q[k]; };
    const w = +get('w') || 1600, h = +get('h') || 900;
    cv.width = w; cv.height = h;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const siege = get('siege') === '1' || get('siege') === 'true';
    let b = null;
    if (has('Combat', 'demo') && get('synthetic') !== '1') { try { b = AOW.Combat.demo({ siege }); } catch (e) { console.warn('[CombatRender] Combat.demo failed, using synthetic battle', e); b = null; } }
    if (!b || !b.units) b = syntheticBattle({ siege, seed: get('seed') || 'combat-demo' });
    if (demoRaf) cancelAnimationFrame(demoRaf);
    CR.init(cv, b, AOW.game || null);
    CR.showPerf = get('perf') !== '0';
    CR.speed = +get('speed') || 1;
    const first = (b.units || []).find(u => u.side === 0 && !isDead(u));
    if (first) { CR.setActiveUnit(first.id); }
    if (get('zoom')) { cam.tz = cam.zoom = M.clamp(+get('zoom'), cam.minZoom, cam.maxZoom); }
    const mode = get('mode');
    if (mode) { const enemy = (b.units || []).find(u => u.side === 1 && !isDead(u)); CR.setTargetMode(mode, { unitId: first && first.id, range: +get('range') || (mode === 'attack' ? 1 : 5), area: +get('area') || (mode === 'spell' ? 1 : 0), affinity: get('affinity') || 'chaos' }); if (enemy) { const p = worldToScreen(toPixel(enemy.col, enemy.row).x, toPixel(enemy.col, enemy.row).y); setHover(p.x, p.y - 20, true); } }
    else if (get('hover') !== '0') { const enemy = (b.units || []).find(u => u.side === 1 && !isDead(u) && unitDef(u).role !== 'shock'); if (enemy) { const p = worldToScreen(toPixel(enemy.col, enemy.row).x, toPixel(enemy.col, enemy.row).y); setHover(p.x, p.y - 20, true); } }
    const play = get('play') === '1' || get('play') === 'true';
    let last = performance.now();
    demoRunning = true;
    const loop = now => {
      if (!demoRunning) return;
      demoRaf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now;
      if (has('VFX', 'update')) { try { AOW.VFX.update(dt); } catch (e) { /* optional */ } }
      CR.render(dt);
    };
    demoRaf = requestAnimationFrame(loop);
    if (play) setTimeout(() => { CR.playEvents(scriptedEvents(b), () => { CR._demoDone = true; }); }, +get('delay') || 120);
    const info = document.getElementById('info');
    if (info) setTimeout(() => { const s = CR.stats(); info.textContent += ' | ' + s.units + ' units, ground ' + s.groundMs + ' ms, frame avg ' + s.avgMs + ' ms (max ' + s.maxMs + ')'; }, 1500);
    return 'ground ' + groundMs.toFixed(0) + 'ms, ' + b.units.length + ' units' + (siege ? ', ' + walls.length + ' wall segments' : '') + (play ? ', playing ' + scriptedEvents(b).length + ' events' : '');
  };

  AOW.CombatRender = CR;
})(window.AOW = window.AOW || {});
