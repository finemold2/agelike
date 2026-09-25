// src/render/world_render.js — AOW.WorldRender: world map canvas renderer, camera and map input (SPEC §6)
//
// Public API (SPEC §6):
//   WorldRender.init(canvas, game)            DPR-aware canvas, camera {x,y,zoom 0.35..2.2}, input binding
//   WorldRender.setGame(game)                 swap the game (drops every cache)
//   WorldRender.render(dt)                    draw one frame (dt seconds)
//   WorldRender.invalidate(idx|null)          terrain/owner changed at hex (or everywhere): rebuild chunks lazily
//   WorldRender.invalidateFog(pid)            visibility changed for player pid (fog + minimap)
//   WorldRender.centerOn(idx, animate=true)   move the camera to a hex (eased when animate)
//   WorldRender.screenToHex(x, y) → idx|-1 ; WorldRender.hexToScreen(idx) → {x,y} ; WorldRender.worldToScreen(wx, wy)
//   WorldRender.setSelection({armyId|cityId|null}) ; WorldRender.setPathPreview({path, turnBreaks}|path|null)
//   WorldRender.getPathPreview() → {path, turnBreaks}|null ; WorldRender.isAnimating() → bool (move tweens running)
//   WorldRender.highlight(hexIdxs, style)     style 'move'|'attack'|'annex'|'cast'|'none' (none clears everything)
//   WorldRender.playEffect(kind, idx, params) VFX at a hex (falls back to a ring pulse when AOW.VFX is absent)
//   WorldRender.shakeScreen(intensity)        camera shake (px)
//   WorldRender.setOverlay('none'|'provinces'|'yields')
//   WorldRender.animateMove(armyId, path, done, fromIdx)   0.18 s / hex tween from `fromIdx` (the hex the army
//                                             left; defaults to path[0]) — camera follows when WorldRender.followMoves
//   WorldRender.renderMinimap(ctx, w, h) ; WorldRender.minimapToWorld(mx, my, w, h) → {x, y} world px
//   WorldRender.demo(canvas, query)           standalone showcase: seed 'demo', centred on the capital; returns timing
// Additive helpers (SPEC §0): WorldRender.camera (live), WorldRender.viewerPid, WorldRender.debug (overlay flag),
//   WorldRender.edgeScroll (bool), WorldRender.followMoves (bool), WorldRender.stats() → last frame timings
//   {frameMs, fps, builds, fogBuilds (chunk/fog rebuilds THIS frame, budget-capped), totalChunkBuilds,
//    totalFogBuilds (lifetime), chunkMsMax, lastChunkMs, lastFogMs, chunks, drawn:{chunks,structs,armies},
//    t:{chunks,water,borders,entities,vfx,fog,clouds,labels,vignette} per-section ms (ewma, indicative only —
//    a software/SwiftShader canvas backend can defer rasterization past the section that recorded it; set
//    WorldRender.profileRaster = true to flush the canvas at every section mark so t shows real raster cost)},
//   WorldRender.resize(), WorldRender.setZoom(z, sx, sy), WorldRender.hoverIdx, WorldRender.chunkCount().
// The screen vignette is a CSS overlay div (.world-vignette) inserted after the canvas by init().
// Events emitted: 'hex:hover' {idx}, 'hex:click' {idx, button, shift, ctrl, alt, x, y}, 'hex:dblclick' {idx}.
//
// Info object handed to TerrainArt.drawChunk's getInfo(col,row):
//   { terrain, feature, height, seed, river, road, neighbors[6], neighborHeights[6], neighborSnow[6], coast, snow, owner, size }
(function (AOW) {
  'use strict';
  const WR = {};
  const CHUNK = 6;                       // hexes per chunk side
  const ZOOM_MIN = 0.35, ZOOM_MAX = 2.2;
  const LOD_ZOOM = 0.7;                  // zoom ≥ LOD_ZOOM → detailed chunks, else simplified half-res chunks
  const LOD_SCALE = [0.5, 1];            // canvas scale per LOD
  const VIEW_BG = '#0b1320';             // colour beyond the map edge (view clear + opaque chunk backing)
  const MAX_CHUNK_BUILDS = 2;            // terrain chunk rebuilds per frame
  const MAX_FOG_BUILDS = 3;              // fog chunk rebuilds per frame
  const MAX_CHUNKS = 90;                 // LRU cap of cached chunk canvases (all LODs)
  const DRAG_PX = 4;
  const TAU = Math.PI * 2;

  const Hex = () => AOW.Hex, State = () => AOW.State, M = () => AOW.M, Art = () => AOW.Art, Color = () => AOW.Color;
  const TerrainArt = () => AOW.TerrainArt, StructArt = () => AOW.StructArt, Icons = () => AOW.Icons;
  const hasFn = (ns, fn) => AOW[ns] && typeof AOW[ns][fn] === 'function';

  // ================================================================ state
  let canvas = null, ctx = null, game = null;
  let dpr = 1, viewW = 1, viewH = 1;
  let time = 0, frameNo = 0;
  const cam = { x: 0, y: 0, zoom: 1, tz: 1, vx: 0, vy: 0 };   // tz = target zoom, vx/vy = inertia (world px/s)
  // device-pixel-snapped camera position used only for the big image layers (terrain/fog/water/clouds): keeps the
  // world→screen transform's translation an integer number of device px so drawImage never falls into the
  // (much slower, software-rasterizer) resampling path for an effectively 1:1 blit. Hit-testing / worldToScreen
  // keep using the exact `cam` so clicks stay pixel-accurate; the < 0.5px/zoom draw offset this introduces is
  // imperceptible and never accumulates (recomputed fresh every frame).
  const camSnap = { x: 0, y: 0 };
  function updateCamSnap() { camSnap.x = Math.round(cam.x * cam.zoom) / cam.zoom; camSnap.y = Math.round(cam.y * cam.zoom) / cam.zoom; }
  const zoomAnchor = { active: false, sx: 0, sy: 0, wx: 0, wy: 0 };
  const camTween = { active: false, t: 0, dur: 0.45, x0: 0, y0: 0, x1: 0, y1: 0 };
  const shake = { t: 0, dur: 0, amp: 0, x: 0, y: 0 };
  const keys = new Set();
  const pointer = { down: false, button: 0, sx: 0, sy: 0, lx: 0, ly: 0, dragging: false, x: -1, y: -1, inside: false, lastT: 0, vx: 0, vy: 0 };
  // builds/fogBuilds: chunk (re)builds THIS frame (the ≤MAX_CHUNK_BUILDS/MAX_FOG_BUILDS budget); totalChunkBuilds/
  // totalFogBuilds: lifetime counters for diagnostics. t: last frame's per-section ms (ewma) — see WR.render.
  const stats = { frameMs: 0, fps: 60, builds: 0, fogBuilds: 0, totalChunkBuilds: 0, totalFogBuilds: 0, chunkMsMax: 0, lastChunkMs: 0, drawn: { chunks: 0, structs: 0, armies: 0 }, t: {} };
  const chunkMaps = [new Map(), new Map()];   // per LOD: key → chunk
  let chunkSerial = 0;
  let hoverIdx = -1;
  let selection = { armyId: null, cityId: null };
  let pathPreview = null;
  const highlights = new Map();   // style → {idxs:[…], path:Path2D}
  let overlay = 'none';
  let viewerPid = 0;
  const moveAnims = new Map();    // armyId → {path:[idx], i, t, done, x, y}
  const ringFx = [];              // fallback effects when VFX is missing
  const armyBuckets = { head: null, next: null, n: 0 };   // per-hex linked lists of army indices (rebuilt per frame, no allocation)
  const leadCache = new Map();    // armyId → {sig, unit, type}
  const labelCache = new Map();   // key → {cv, w, h}
  let seedArr = null, coastArr = null, snowArr = null;   // per-hex derived data
  const scratchInfo = { terrain: 'grass', feature: 'none', height: 0.4, seed: 1, river: 0, road: 0, neighbors: null, neighborHeights: null, neighborSnow: null, coast: 0, snow: 0, owner: null, size: 36 };
  let minimapCache = { cv: null, w: 0, h: 0, dirty: true, fogDirty: true, lastFog: 0 };
  let vignette = { cv: null, w: 0, h: 0 };
  let vignetteEl = null;           // CSS overlay used instead of drawVignette() once init() has run
  let waterLayer = { key: null, batch: null };     // cached shimmer strokes (see drawWaterLayer)
  let cloudSprites = null;
  let bound = false;

  WR.camera = cam;
  WR.debug = false;
  WR.edgeScroll = false;
  WR.followMoves = true;
  WR.viewerPid = 0;
  WR.hoverIdx = -1;

  // ================================================================ init / resize
  /** Create layers, bind input. `game` may be null (menu); call setGame later. */
  WR.init = function (cv, g) {
    canvas = cv;
    ctx = cv.getContext('2d');
    // the screen vignette is a CSS overlay (composited by the browser) instead of a full-screen canvas blit every
    // frame — that blit alone cost ~4 ms/frame under software rasterization
    if (!vignetteEl && cv.parentNode) {
      vignetteEl = document.createElement('div');
      vignetteEl.className = 'world-vignette';
      vignetteEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
      cv.parentNode.insertBefore(vignetteEl, cv.nextSibling);
    }
    bindInput();
    WR.resize();
    if (g) WR.setGame(g);
    if (!WR._resizeBound) {
      WR._resizeBound = true;
      window.addEventListener('resize', () => WR.resize());
    }
  };

  WR.resize = function () {
    if (!canvas) return;
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cw = canvas.clientWidth || canvas.width, ch = canvas.clientHeight || canvas.height;
    viewW = Math.max(1, cw); viewH = Math.max(1, ch);
    const pw = Math.round(viewW * dpr), ph = Math.round(viewH * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    vignette.cv = null;
    if (vignetteEl) {
      // same geometry as the old canvas gradient: circle, clear to 0.45·min(w,h), 0.42 dark at 0.72·max(w,h)
      const r0 = Math.round(Math.min(viewW, viewH) * 0.45), r1 = Math.round(Math.max(viewW, viewH) * 0.72);
      vignetteEl.style.background = 'radial-gradient(circle at 50% 50%, rgba(8,10,24,0) ' + r0 + 'px, rgba(8,10,24,0.42) ' + r1 + 'px)';
    }
  };

  WR.setGame = function (g) {
    game = g;
    chunkMaps[0].clear(); chunkMaps[1].clear();
    leadCache.clear(); labelCache.clear(); moveAnims.clear();
    highlights.clear(); pathPreview = null; selection = { armyId: null, cityId: null };
    minimapCache.dirty = true; minimapCache.fogDirty = true;
    waterLayer.key = null; waterLayer.batch = null;
    if (!g) return;
    viewerPid = 0;
    for (let i = 0; i < g.players.length; i++) if (g.players[i].isHuman) { viewerPid = i; break; }
    WR.viewerPid = viewerPid;
    buildDerived();
    const cap = State().capital(g, viewerPid) || g.cities[0];
    if (cap) WR.centerOn(cap.hex, false);
    else { const p = Hex().toPixel(g.W >> 1, g.H >> 1); cam.x = p.x; cam.y = p.y; }
  };

  /** per-hex seeds, coast masks and snow fraction (cheap, done once per game / invalidate(null)) */
  function buildDerived() {
    const g = game, N = g.W * g.H, T = State().TERRAINS, Hx = Hex();
    const seedBase = AOW.hashString(String(g.seed));
    seedArr = new Int32Array(N); coastArr = new Uint8Array(N); snowArr = new Float32Array(N);
    const ST = State().T;
    for (let i = 0; i < N; i++) {
      const col = i % g.W, row = (i / g.W) | 0;
      seedArr[i] = (M().hash2(col * 7 + seedBase, row * 13 + (seedBase >>> 3)) * 2147483647) | 0;
      let coast = 0, snowN = 0, landN = 0;
      for (let d = 0; d < 6; d++) {
        const n = Hx.neighborIdx(i, d, g.W, g.H);
        if (n < 0) continue;
        if (g.terrain[n] <= State().WATER_MAX) coast |= 1 << d; else landN++;
        if (g.terrain[n] === ST.snow) snowN++;
      }
      coastArr[i] = coast;
      const t = g.terrain[i];
      let snow = 0;
      if (t === ST.snow) snow = 1;
      else if (t === ST.mountain || t === ST.hills || t === ST.forest || t === ST.grass) {
        snow = snowN / 6;
        const lat = State().latitude(g, i);
        if (t === ST.mountain) snow += Math.max(0, g.height[i] - 0.82) * 2.5 + Math.max(0, lat - 0.85) * 3;
        else if (lat > 0.9) snow += (lat - 0.9) * 4;
      }
      snowArr[i] = M().clamp(snow, 0, 1);
    }
  }

  // ================================================================ camera helpers
  /** world rect covered by the union of all chunk cut rectangles (see getChunk) */
  function chunkCover() {
    if (!chunkCover.c || chunkCover.g !== game) {
      const Hx = Hex();
      chunkCover.g = game;
      chunkCover.c = { x0: Hx.toPixel(0, 0).x - Hx.W * 0.25, x1: Hx.toPixel(game.W - 1, 0).x + Hx.W * 0.75, y0: Hx.toPixel(0, 0).y - Hx.SIZE * 0.75, y1: Hx.toPixel(0, game.H - 1).y + Hx.SIZE * 0.75 };
    }
    return chunkCover.c;
  }
  function mapBounds() {
    const Hx = Hex();
    return { x0: 0, y0: 0, x1: (game.W + 0.5) * Hx.W, y1: game.H * Hx.ROW_H + Hx.SIZE * 0.5 };
  }
  function clampCamera() {
    if (!game) return;
    const b = mapBounds();
    const halfW = viewW / 2 / cam.zoom, halfH = viewH / 2 / cam.zoom;
    const marginX = Math.min(halfW, Hex().W * 2), marginY = Math.min(halfH, Hex().H * 2);
    const minX = b.x0 - marginX + halfW, maxX = b.x1 + marginX - halfW;
    const minY = b.y0 - marginY + halfH, maxY = b.y1 + marginY - halfH;
    cam.x = minX > maxX ? (b.x0 + b.x1) / 2 : M().clamp(cam.x, minX, maxX);
    cam.y = minY > maxY ? (b.y0 + b.y1) / 2 : M().clamp(cam.y, minY, maxY);
  }
  WR.worldToScreen = function (wx, wy) {
    return { x: (wx - cam.x) * cam.zoom + viewW / 2 + shake.x, y: (wy - cam.y) * cam.zoom + viewH / 2 + shake.y };
  };
  WR.screenToWorld = function (sx, sy) {
    return { x: (sx - viewW / 2 - shake.x) / cam.zoom + cam.x, y: (sy - viewH / 2 - shake.y) / cam.zoom + cam.y };
  };
  WR.screenToHex = function (sx, sy) {
    if (!game) return -1;
    const w = WR.screenToWorld(sx, sy);
    const h = Hex().fromPixel(w.x, w.y);
    return Hex().inBounds(h.col, h.row, game.W, game.H) ? h.row * game.W + h.col : -1;
  };
  WR.hexToScreen = function (idx) {
    if (!game || idx < 0) return null;
    const p = Hex().toPixel(idx % game.W, (idx / game.W) | 0);
    return WR.worldToScreen(p.x, p.y);
  };
  WR.centerOn = function (idx, animate) {
    if (!game || idx === null || idx === undefined || idx < 0) return;
    const p = Hex().toPixel(idx % game.W, (idx / game.W) | 0);
    cam.vx = cam.vy = 0;
    if (animate === false) { cam.x = p.x; cam.y = p.y; camTween.active = false; clampCamera(); return; }
    camTween.active = true; camTween.t = 0; camTween.x0 = cam.x; camTween.y0 = cam.y; camTween.x1 = p.x; camTween.y1 = p.y;
    camTween.dur = M().clamp(Math.hypot(p.x - cam.x, p.y - cam.y) / 2500, 0.25, 0.7);
  };
  /** set the zoom target; (sx, sy) screen anchor (defaults to the view centre) */
  WR.setZoom = function (z, sx, sy) {
    cam.tz = M().clamp(z, ZOOM_MIN, ZOOM_MAX);
    if (sx === undefined) { sx = viewW / 2; sy = viewH / 2; }
    const w = WR.screenToWorld(sx, sy);
    zoomAnchor.active = true; zoomAnchor.sx = sx; zoomAnchor.sy = sy; zoomAnchor.wx = w.x; zoomAnchor.wy = w.y;
  };
  WR.shakeScreen = function (intensity) {
    shake.amp = Math.max(shake.amp, intensity || 6); shake.dur = 0.45; shake.t = 0.45;
  };
  WR.setOverlay = function (name) { overlay = name || 'none'; };
  WR.setSelection = function (sel) { selection = Object.assign({ armyId: null, cityId: null }, sel || {}); };
  WR.setPathPreview = function (p) {
    if (!p) { pathPreview = null; return; }
    if (Array.isArray(p)) pathPreview = { path: p, turnBreaks: null };
    else pathPreview = { path: p.path || [], turnBreaks: p.turnBreaks || null };
  };
  /** the live path preview ({path, turnBreaks} | null) — read-only, for the HUD and tests */
  WR.getPathPreview = function () { return pathPreview; };
  /** true while at least one army move tween is still running (animateMove) */
  WR.isAnimating = function () { return moveAnims.size > 0; };
  WR.highlight = function (idxs, style) {
    if (!style || style === 'none') { highlights.clear(); return; }
    if (!idxs || !idxs.length) { highlights.delete(style); return; }
    const path = new Path2D(), Hx = Hex();
    for (const idx of idxs) {
      const p = Hx.toPixel(idx % game.W, (idx / game.W) | 0);
      hexPath2D(path, p.x, p.y, Hx.SIZE - 1.5);
    }
    highlights.set(style, { idxs: idxs.slice(), path });
  };
  function hexPath2D(path, cx, cy, size) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      const x = cx + size * Math.cos(a), y = cy + size * Math.sin(a);
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.closePath();
  }

  // ================================================================ chunk cache
  function chunkKey(cx, cy) { return cy * 4096 + cx; }
  function getChunk(lod, cx, cy, create) {
    const map = chunkMaps[lod];
    const k = chunkKey(cx, cy);
    let ch = map.get(k);
    if (!ch && create) {
      const Hx = Hex();
      const c0 = cx * CHUNK, r0 = cy * CHUNK, c1 = Math.min(game.W - 1, c0 + CHUNK - 1), r1 = Math.min(game.H - 1, r0 + CHUNK - 1);
      // cut rectangle (world): what this chunk is responsible for on screen (halfway through the margin hexes)
      const pl = Hx.toPixel(c0, 0), pr = Hx.toPixel(c1, 0);
      const cutX0 = pl.x - Hx.W * 0.25, cutX1 = pr.x + Hx.W * 0.75;
      const cutY0 = Hx.toPixel(0, r0).y - Hx.SIZE * 0.75, cutY1 = Hx.toPixel(0, r1).y + Hx.SIZE * 0.75;
      const padX = Hx.W * 1.25, padTop = Hx.SIZE * 3.2, padBot = Hx.SIZE * 1.6;
      const scale = LOD_SCALE[lod];
      // whole-unit canvas origin: at zoom 1 the per-frame blit is then a pixel-aligned copy (see blitCut)
      const ox = Math.floor(cutX0 - padX), oy = Math.floor(cutY0 - padTop);
      const w = Math.ceil((cutX1 + padX - ox) * scale), h = Math.ceil((cutY1 + padBot - oy) * scale);
      ch = { lod, cx, cy, c0, c1, r0, r1, cutX0, cutY0, cutW: cutX1 - cutX0, cutH: cutY1 - cutY0, ox, oy, w, h, scale,
        border: c0 === 0 || r0 === 0 || c1 >= game.W - 1 || r1 >= game.H - 1,
        cv: null, ctx: null, built: false, dirty: true, fogDim: null, fogCloud: null, fogBuilt: false, fogDirty: true, fogHasCloud: false, fogHasDim: false,
        borders: null, provPath: null, lastUse: 0, serial: 0, buildMs: 0 };
      map.set(k, ch);
    }
    return ch;
  }
  WR.chunkCount = () => chunkMaps[0].size + chunkMaps[1].size;

  function evictChunks() {
    const total = chunkMaps[0].size + chunkMaps[1].size;
    if (total <= MAX_CHUNKS) return;
    const all = [];
    for (let lod = 0; lod < 2; lod++) for (const [k, ch] of chunkMaps[lod]) all.push({ k, ch, lod });
    all.sort((a, b) => a.ch.lastUse - b.ch.lastUse);
    for (let i = 0; i < total - MAX_CHUNKS; i++) chunkMaps[all[i].lod].delete(all[i].k);
  }

  /** info for TerrainArt (allocates: only used while building a chunk) */
  function hexInfo(col, row) {
    const g = game, Hx = Hex();
    if (!Hx.inBounds(col, row, g.W, g.H)) return null;
    const idx = row * g.W + col, T = State().TERRAINS, F = State().FEATURES;
    const neighbors = new Array(6), neighborHeights = new Array(6), neighborSnow = new Array(6);
    for (let d = 0; d < 6; d++) {
      const n = Hx.neighborIdx(idx, d, g.W, g.H);
      if (n < 0) { neighbors[d] = null; neighborHeights[d] = g.height[idx]; neighborSnow[d] = snowArr[idx]; }
      else { neighbors[d] = T[g.terrain[n]]; neighborHeights[d] = g.height[n]; neighborSnow[d] = snowArr[n]; }
    }
    const owner = g.owner[idx];
    return {
      terrain: T[g.terrain[idx]], feature: F[g.feature[idx]], height: g.height[idx], seed: seedArr[idx],
      river: g.river[idx], road: g.road[idx], neighbors, neighborHeights, neighborSnow, coast: coastArr[idx], snow: snowArr[idx],
      owner: owner >= 0 && g.players[owner] ? g.players[owner].color : null, size: Hx.SIZE,
    };
  }

  function buildChunk(ch) {
    const t0 = performance.now();
    if (!ch.cv) {
      // opaque backing store: every frame blits ~20 of these, and an opaque source lets the rasterizer copy
      // instead of alpha-blend (≈1.5 ms/frame in software). Off-map corners get the view background colour.
      const cv = document.createElement('canvas'); cv.width = Math.max(1, ch.w); cv.height = Math.max(1, ch.h);
      ch.cv = cv; ch.ctx = cv.getContext('2d', { alpha: false });
    }
    const c = ch.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = VIEW_BG; c.fillRect(0, 0, ch.w, ch.h);
    c.save();
    c.scale(ch.scale, ch.scale);
    TerrainArt().drawChunk(c, hexInfo, ch.c0 - 1, ch.c1 + 1, ch.r0 - 1, ch.r1 + 1, ch.ox, ch.oy, { zoom: ch.lod ? 1 : 0.5 });
    c.restore();
    ch.built = true; ch.dirty = false; ch.serial = ++chunkSerial;
    ch.buildMs = performance.now() - t0;
    stats.lastChunkMs = ch.buildMs; stats.chunkMsMax = Math.max(stats.chunkMsMax, ch.buildMs); stats.totalChunkBuilds++;
  }

  WR.invalidate = function (idx) {
    if (!game) return;
    if (idx === null || idx === undefined) {
      buildDerived();
      for (let lod = 0; lod < 2; lod++) for (const ch of chunkMaps[lod].values()) { ch.dirty = true; ch.borders = null; ch.provPath = null; ch.fogDirty = true; }
      labelCache.clear(); minimapCache.dirty = true;
      return;
    }
    const col = idx % game.W, row = (idx / game.W) | 0;
    const N = game.W * game.H;
    // derived data of the hex and its ring
    const ring = [idx].concat(Hex().neighborsIdx(idx, game.W, game.H));
    for (const i of ring) {
      let coast = 0; for (let d = 0; d < 6; d++) { const n = Hex().neighborIdx(i, d, game.W, game.H); if (n >= 0 && game.terrain[n] <= State().WATER_MAX) coast |= 1 << d; }
      coastArr[i] = coast;
    }
    const cx0 = Math.floor((col - 2) / CHUNK), cx1 = Math.floor((col + 2) / CHUNK), cy0 = Math.floor((row - 2) / CHUNK), cy1 = Math.floor((row + 2) / CHUNK);
    for (let lod = 0; lod < 2; lod++) for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const ch = chunkMaps[lod].get(chunkKey(cx, cy));
      if (ch) { ch.dirty = true; ch.borders = null; ch.provPath = null; }
    }
    if (N) minimapCache.dirty = true;
    labelCache.clear();
  };
  WR.invalidateFog = function (pid) {
    if (pid !== undefined && pid !== null && pid !== viewerPid) return;
    for (let lod = 0; lod < 2; lod++) for (const ch of chunkMaps[lod].values()) ch.fogDirty = true;
    minimapCache.fogDirty = true;
  };

  // ================================================================ frame
  function updateCamera(dt) {
    // tween
    if (camTween.active) {
      camTween.t += dt;
      const k = M().easeInOut(M().clamp(camTween.t / camTween.dur, 0, 1));
      cam.x = M().lerp(camTween.x0, camTween.x1, k); cam.y = M().lerp(camTween.y0, camTween.y1, k);
      if (camTween.t >= camTween.dur) camTween.active = false;
    }
    // keyboard pan
    let kx = 0, ky = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) kx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) kx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) ky -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) ky += 1;
    if (WR.edgeScroll && pointer.inside && !pointer.down) {
      const e = 14;
      if (pointer.x < e) kx -= 1; else if (pointer.x > viewW - e) kx += 1;
      if (pointer.y < e) ky -= 1; else if (pointer.y > viewH - e) ky += 1;
    }
    if (kx || ky) {
      const sp = 900 / cam.zoom * dt;
      cam.x += kx * sp; cam.y += ky * sp; camTween.active = false; cam.vx = cam.vy = 0;
    }
    // inertia after a drag
    if (!pointer.dragging && (cam.vx || cam.vy)) {
      cam.x += cam.vx * dt; cam.y += cam.vy * dt;
      const damp = Math.exp(-dt * 6);
      cam.vx *= damp; cam.vy *= damp;
      if (Math.abs(cam.vx) + Math.abs(cam.vy) < 2) cam.vx = cam.vy = 0;
    }
    // eased zoom toward the anchor
    if (Math.abs(cam.zoom - cam.tz) > 1e-4) {
      const k = 1 - Math.exp(-dt * 14);
      cam.zoom = M().lerp(cam.zoom, cam.tz, k);
      if (Math.abs(cam.zoom - cam.tz) < 1e-3) cam.zoom = cam.tz;
      if (zoomAnchor.active) {
        cam.x = zoomAnchor.wx - (zoomAnchor.sx - viewW / 2) / cam.zoom;
        cam.y = zoomAnchor.wy - (zoomAnchor.sy - viewH / 2) / cam.zoom;
      }
    } else zoomAnchor.active = false;
    // shake
    if (shake.t > 0) {
      shake.t -= dt;
      const k = Math.max(0, shake.t / shake.dur) * shake.amp;
      shake.x = (Math.random() * 2 - 1) * k; shake.y = (Math.random() * 2 - 1) * k;
      if (shake.t <= 0) { shake.x = shake.y = 0; shake.amp = 0; }
    }
    clampCamera();
  }

  /** visible world rect (no shake) */
  const view = { x0: 0, y0: 0, x1: 0, y1: 0, c0: 0, c1: 0, r0: 0, r1: 0 };
  function computeView() {
    const Hx = Hex();
    view.x0 = cam.x - viewW / 2 / cam.zoom; view.x1 = cam.x + viewW / 2 / cam.zoom;
    view.y0 = cam.y - viewH / 2 / cam.zoom; view.y1 = cam.y + viewH / 2 / cam.zoom;
    view.c0 = M().clamp(Math.floor(view.x0 / Hx.W) - 1, 0, game.W - 1);
    view.c1 = M().clamp(Math.ceil(view.x1 / Hx.W) + 1, 0, game.W - 1);
    view.r0 = M().clamp(Math.floor((view.y0 - Hx.SIZE) / Hx.ROW_H) - 1, 0, game.H - 1);
    view.r1 = M().clamp(Math.ceil(view.y1 / Hx.ROW_H) + 1, 0, game.H - 1);
  }

  WR.render = function (dt, opts) {
    if (!ctx) return;
    dt = Math.min(0.1, dt || 0.016);
    const t0 = performance.now();
    time += dt; frameNo++;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!game) { ctx.fillStyle = VIEW_BG; ctx.fillRect(0, 0, viewW, viewH); drawVignette(); return; }
    updateCamera(dt);
    updateMoveAnims(dt);
    if (hasFn('VFX', 'update')) { try { AOW.VFX.update(dt); } catch (e) { /* ignore */ } }
    computeView();
    updateCamSnap();
    // the chunk cuts tile the whole map opaquely (placeholders too), so the clear is only needed where the
    // view reaches past the map — one full-screen fill saved per frame in the common case
    const cover = chunkCover();
    if (shake.x || shake.y || view.x0 < cover.x0 || view.x1 > cover.x1 || view.y0 < cover.y0 || view.y1 > cover.y1) { ctx.fillStyle = VIEW_BG; ctx.fillRect(0, 0, viewW, viewH); }
    const lod = cam.zoom >= LOD_ZOOM ? 1 : 0;
    // ---- terrain chunks
    const cx0 = Math.floor(view.c0 / CHUNK), cx1 = Math.floor(view.c1 / CHUNK), cy0 = Math.floor(view.r0 / CHUNK), cy1 = Math.floor(view.r1 / CHUNK);
    let builds = 0, fogBuilds = 0;
    const buildAll = opts && opts.buildAll;
    // order: centre-out so the middle of the screen is never the last to appear
    const order = chunkOrder(cx0, cx1, cy0, cy1);
    ctx.save();
    ctx.translate(Math.round(viewW / 2 + shake.x), Math.round(viewH / 2 + shake.y));
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-camSnap.x, -camSnap.y);
    ctx.imageSmoothingEnabled = true;
    stats.drawn.chunks = 0;
    for (let i = 0; i < order.length; i += 2) {
      const cx = order[i], cy = order[i + 1];
      const ch = getChunk(lod, cx, cy, true);
      ch.lastUse = frameNo;
      // a chunk that is unexplored all over would only be painted over by its (opaque) fog canvas: skip the
      // terrain blit and build here; the fog pass fills its cut with the world-aligned parchment pattern instead
      // (one opaque fill instead of terrain blit + alpha fog blit). The pattern is phase-locked to world space
      // exactly like buildFog's, so it meets the neighbours' feathered fog seamlessly.
      // (map-border chunks keep the blurred fog canvas: it fades the parchment out at the edge of the world)
      if (ch.fogBuilt && !ch.fogDirty && ch.fogAllCloud && !ch.border && TerrainArt() && TerrainArt().fillFog) {
        ch.patternFrame = frameNo;
        stats.drawn.chunks++;
        continue;
      }
      if (ch.dirty && (builds < MAX_CHUNK_BUILDS || buildAll)) { buildChunk(ch); builds++; }
      let src = ch.built ? ch : null;
      if (!src) { const alt = getChunk(1 - lod, cx, cy, false); if (alt && alt.built) src = alt; }
      if (src) {
        drawChunkCut(src);
        stats.drawn.chunks++;
      } else {
        // not yet rendered: flat opaque placeholder (the view is not cleared under the map, see chunkCover)
        ctx.fillStyle = '#1a2d2e';
        ctx.fillRect(ch.cutX0, ch.cutY0, ch.cutW, ch.cutH);
      }
    }
    ctx.restore();
    if (builds) evictChunks();
    const __t = stats.t;
    let __p = mark('chunks', t0);
    // ---- water shimmer (cached layer, ≤ 15 Hz)
    if (cam.zoom >= 0.6) drawWaterLayer();
    __p = mark('water', __p);
    // ---- world-space overlays (borders, structures, armies, highlights, fog …)
    ctx.save();
    ctx.translate(Math.round(viewW / 2 + shake.x), Math.round(viewH / 2 + shake.y));
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-camSnap.x, -camSnap.y);
    drawBorders(lod, cx0, cx1, cy0, cy1);
    __p = mark('borders', __p);
    if (hasFn('VFX', 'draw')) { try { AOW.VFX.draw(ctx, 'below'); } catch (e) { /* ignore */ } }
    drawHighlights();
    drawEntities();
    __p = mark('entities', __p);
    drawPathPreview();
    if (hasFn('VFX', 'draw')) { try { AOW.VFX.draw(ctx, 'above'); } catch (e) { /* ignore */ } }
    drawRingFx(dt);
    __p = mark('vfx', __p);
    // fog (needs the chunk fog canvases)
    for (let i = 0; i < order.length; i += 2) {
      const ch = getChunk(lod, order[i], order[i + 1], false);
      if (!ch) continue;
      if (ch.fogDirty && (fogBuilds < MAX_FOG_BUILDS || buildAll)) { buildFog(ch); fogBuilds++; }
      if (ch.patternFrame === frameNo) {
        // fully unexplored (see the chunk pass): opaque parchment over whatever borders/armies lie beneath
        const e = 1 / cam.zoom;                        // 1 screen px of overlap: no anti-aliased seam between cuts
        TerrainArt().setOrigin(0, 0);
        TerrainArt().fillFog(ctx, ch.cutX0 - e, ch.cutY0 - e, ch.cutW + 2 * e, ch.cutH + 2 * e);
      } else if (ch.fogBuilt && ch.fogAllDim && !ch.border) {
        // explored-but-unseen all over: the pre-built veil canvas is one flat colour here — a solid translucent
        // fill of the same cut rect is identical and far cheaper to rasterize than an image blit
        ctx.fillStyle = veilFill();
        if (ch.scale === 1 && cam.zoom === 1) {                 // same whole-pixel edges as blitCut's neighbours
          const x0 = Math.round(ch.cutX0), y0 = Math.round(ch.cutY0);
          ctx.fillRect(x0, y0, Math.round(ch.cutX0 + ch.cutW) - x0, Math.round(ch.cutY0 + ch.cutH) - y0);
        } else ctx.fillRect(ch.cutX0, ch.cutY0, ch.cutW, ch.cutH);
      } else if (ch.fogBuilt) drawFogChunk(ch);
    }
    __p = mark('fog', __p);
    if (cam.zoom >= 0.8) drawCloudShadows();
    __p = mark('clouds', __p);
    ctx.restore();
    // ---- screen space
    drawLabels();
    __p = mark('labels', __p);
    drawVignette();
    __p = mark('vignette', __p);
    if (hasFn('VFX', 'drawScreen')) { try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); AOW.VFX.drawScreen(ctx, viewW, viewH); } catch (e) { /* ignore */ } }
    if (WR.debug) drawDebug();
    // WR.profileRaster: force the canvas to rasterize at every mark so stats.t shows real per-layer raster cost
    function mark(name, prev) { if (WR.profileRaster) ctx.getImageData(0, 0, 1, 1); const now = performance.now(); __t[name] = (__t[name] || 0) * 0.9 + (now - prev) * 0.1; return now; }
    const ms = performance.now() - t0;
    stats.frameMs = stats.frameMs * 0.9 + ms * 0.1;
    stats.fps = stats.fps * 0.95 + (1 / Math.max(1e-3, dt)) * 0.05;
    stats.builds = builds; stats.fogBuilds = fogBuilds;
  };
  WR.stats = () => Object.assign({ chunks: WR.chunkCount(), zoom: cam.zoom }, stats);

  const orderBuf = [];
  function chunkOrder(cx0, cx1, cy0, cy1) {
    orderBuf.length = 0;
    const mx = (cx0 + cx1) / 2, my = (cy0 + cy1) / 2;
    const tmp = [];
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) tmp.push([cx, cy, (cx - mx) * (cx - mx) + (cy - my) * (cy - my)]);
    tmp.sort((a, b) => a[2] - b[2]);
    for (const t of tmp) orderBuf.push(t[0], t[1]);
    return orderBuf;
  }

  function drawChunkCut(ch) { blitCut(ch.cv, ch); }
  /**
   * Draw a chunk-aligned canvas (terrain or fog) over its cut rectangle. At a 1:1 scale (detail chunks at zoom 1,
   * the common case) the cut is snapped to whole pixels — neighbours share the same rounded edge, so there is
   * no gap — which turns the blit into a plain copy instead of a filtered, sub-pixel resample.
   */
  function blitCut(cv, ch) {
    const s = ch.scale;
    if (s === 1 && cam.zoom === 1) {
      const x0 = Math.round(ch.cutX0), y0 = Math.round(ch.cutY0), x1 = Math.round(ch.cutX0 + ch.cutW), y1 = Math.round(ch.cutY0 + ch.cutH);
      ctx.drawImage(cv, x0 - ch.ox, y0 - ch.oy, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      return;
    }
    const sx = (ch.cutX0 - ch.ox) * s, sy = (ch.cutY0 - ch.oy) * s;
    ctx.drawImage(cv, sx, sy, ch.cutW * s, ch.cutH * s, ch.cutX0, ch.cutY0, ch.cutW, ch.cutH);
  }

  // ================================================================ water shimmer layer
  function drawWaterLayer() {
    // The shimmer animates at 15 Hz. Its ripples/foam are collected (TerrainArt.waterBatch) into a few Path2D
    // buckets in WORLD space, rebuilt only when the 15 Hz stamp or the visible hex range changes, and stroked
    // straight onto the frame every frame (~30 strokes). No offscreen layer: blitting a viewport-sized layer
    // canvas forced a 50–80 ms raster flush every few frames under software/SwiftShader rendering.
    const TA = TerrainArt();
    if (!TA || !TA.waterBatch) return;
    const stamp = Math.floor(time * 15);
    const key = stamp + '|' + view.c0 + ',' + view.c1 + ',' + view.r0 + ',' + view.r1 + '|' + viewerPid;
    if (waterLayer.key !== key) {
      waterLayer.key = key;
      const g = game, Hx = Hex(), T = State().TERRAINS, WM = State().WATER_MAX;
      const batch = waterLayer.batch = TA.waterBatch();
      const info = scratchInfo; info.size = Hx.SIZE; info.neighbors = null;
      const tt = stamp / 15;
      const vis = g.visible[viewerPid], ex = g.explored[viewerPid];
      for (let r = view.r0; r <= view.r1; r++) for (let col = view.c0; col <= view.c1; col++) {
        const i = r * g.W + col;
        if (g.terrain[i] > WM) continue;
        if (ex && !ex[i]) continue;
        if (vis && !vis[i]) continue;
        const p = Hx.toPixel(col, r);
        info.terrain = T[g.terrain[i]]; info.seed = seedArr[i]; info.coast = coastArr[i];
        TA.drawWater(null, p.x, p.y, info, tt, batch);
      }
    }
    const batch = waterLayer.batch;
    if (!batch || (!batch.ripple.size && !batch.foam.size)) return;
    ctx.save();
    ctx.translate(Math.round(viewW / 2 + shake.x), Math.round(viewH / 2 + shake.y));
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-camSnap.x, -camSnap.y);
    TA.flushWaterBatch(ctx, batch, true);
    ctx.restore();
  }

  // ================================================================ domain & province borders
  const HL_STYLE = { move: ['rgba(90,220,120,0.28)', 'rgba(150,255,170,0.75)'], attack: ['rgba(230,60,50,0.3)', 'rgba(255,120,100,0.8)'], annex: ['rgba(240,200,80,0.3)', 'rgba(255,230,140,0.85)'], cast: ['rgba(150,110,255,0.3)', 'rgba(200,180,255,0.85)'] };
  function buildBorders(ch) {
    const g = game, Hx = Hex();
    const byOwner = new Map();
    const provPath = new Path2D();
    let provAny = false;
    const c0 = Math.max(0, ch.c0 - 1), c1 = Math.min(g.W - 1, ch.c1 + 1), r0 = Math.max(0, ch.r0 - 1), r1 = Math.min(g.H - 1, ch.r1 + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const i = r * g.W + c, o = g.owner[i], pv = g.province[i];
      const p = Hx.toPixel(c, r);
      for (let d = 0; d < 6; d++) {
        const n = Hx.neighborIdx(i, d, g.W, g.H);
        const no = n < 0 ? -1 : g.owner[n];
        if (o >= 0 && no !== o) {
          let e = byOwner.get(o);
          if (!e) { e = { owner: o, outer: new Path2D(), inner: new Path2D() }; byOwner.set(o, e); }
          const cc = Hx.edgeCorners(p.x, p.y, d, Hx.SIZE);
          e.outer.moveTo(cc[0].x, cc[0].y); e.outer.lineTo(cc[1].x, cc[1].y);
          const k = 0.86;
          e.inner.moveTo(p.x + (cc[0].x - p.x) * k, p.y + (cc[0].y - p.y) * k); e.inner.lineTo(p.x + (cc[1].x - p.x) * k, p.y + (cc[1].y - p.y) * k);
        }
        if (pv >= 0 && n >= 0 && g.province[n] !== pv && g.province[n] >= 0 && (d < 3)) {
          const cc = Hx.edgeCorners(p.x, p.y, d, Hx.SIZE);
          provPath.moveTo(cc[0].x, cc[0].y); provPath.lineTo(cc[1].x, cc[1].y); provAny = true;
        }
      }
    }
    ch.borders = Array.from(byOwner.values());
    ch.provPath = provAny ? provPath : false;
  }
  function drawBorders(lod, cx0, cx1, cy0, cy1) {
    const g = game;
    const showProv = overlay === 'provinces' || cam.zoom >= 1.4;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // clip to the visible rect so long paths of other chunks are cheap
    ctx.beginPath(); ctx.rect(view.x0 - 40, view.y0 - 40, view.x1 - view.x0 + 80, view.y1 - view.y0 + 80); ctx.clip();
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const ch = getChunk(lod, cx, cy, false);
      if (!ch) continue;
      if (!ch.borders) buildBorders(ch);
      ctx.save();
      ctx.beginPath(); ctx.rect(ch.cutX0, ch.cutY0, ch.cutW, ch.cutH); ctx.clip();
      if (showProv && ch.provPath) {
        ctx.strokeStyle = overlay === 'provinces' ? 'rgba(255,245,220,0.35)' : 'rgba(255,245,220,0.16)'; ctx.lineWidth = overlay === 'provinces' ? 1.4 : 1;
        ctx.setLineDash([3, 4]); ctx.stroke(ch.provPath); ctx.setLineDash([]);
      }
      for (const e of ch.borders) {
        const pl = g.players[e.owner]; if (!pl) continue;
        const col = pl.color;
        // soft glow ribbon
        ctx.strokeStyle = Color().alpha(col, 0.22); ctx.lineWidth = 9; ctx.stroke(e.outer);
        ctx.strokeStyle = Color().alpha(col, 0.45); ctx.lineWidth = 4.5; ctx.stroke(e.outer);
        ctx.strokeStyle = Color().mix(col, '#fff6dc', 0.35); ctx.lineWidth = 1.6; ctx.stroke(e.outer);
        ctx.strokeStyle = 'rgba(20,15,30,0.35)'; ctx.lineWidth = 0.7; ctx.stroke(e.outer);
        // dashed inner line
        ctx.setLineDash([4, 5]); ctx.lineDashOffset = -time * 6;
        ctx.strokeStyle = Color().alpha(Color().mix(col, '#ffffff', 0.5), 0.75); ctx.lineWidth = 1.2; ctx.stroke(e.inner);
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawHighlights() {
    if (!highlights.size) return;
    ctx.save();
    ctx.lineJoin = 'round';
    for (const [style, h] of highlights) {
      const st = HL_STYLE[style] || HL_STYLE.move;
      ctx.fillStyle = st[0]; ctx.fill(h.path);
      ctx.strokeStyle = st[1]; ctx.lineWidth = 1.4; ctx.stroke(h.path);
    }
    ctx.restore();
  }

  // ================================================================ entities (structures, armies) — row sorted
  function ensureArmyBuckets() {
    const g = game, N = g.W * g.H;
    if (!armyBuckets.head || armyBuckets.head.length !== N) armyBuckets.head = new Int32Array(N);
    if (!armyBuckets.next || armyBuckets.next.length < g.armies.length) armyBuckets.next = new Int32Array(Math.max(16, g.armies.length * 2));
    armyBuckets.head.fill(-1);
    for (let i = g.armies.length - 1; i >= 0; i--) {
      const a = g.armies[i];
      if (a.hex < 0 || a.hex >= N) continue;
      armyBuckets.next[i] = armyBuckets.head[a.hex];
      armyBuckets.head[a.hex] = i;
    }
  }

  function playerOf(pid) { return pid >= 0 ? game.players[pid] : null; }
  function cultureOf(pl) { const D = AOW.Data; return pl && D && D.has('cultures', pl.cultureId) ? D.get('cultures', pl.cultureId) : null; }
  function cultureById(id) { const D = AOW.Data; return D && id && D.has('cultures', id) ? D.get('cultures', id) : null; }

  function drawEntities() {
    const g = game, Hx = Hex(), S = State();
    ensureArmyBuckets();
    const vis = g.visible[viewerPid], ex = g.explored[viewerPid];
    const r0 = Math.max(0, view.r0 - 1), r1 = Math.min(g.H - 1, view.r1 + 3), c0 = Math.max(0, view.c0 - 2), c1 = Math.min(g.W - 1, view.c1 + 2);
    const frame = Math.floor(time * 3) & 3;
    const animFrames = cam.zoom >= 0.9;
    stats.drawn.structs = 0; stats.drawn.armies = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * g.W + c;
        if (ex && !ex[i]) continue;
        const p = Hx.toPixel(c, r);
        const sid = g.structure[i];
        if (sid >= 0) {
          const s = g.structures[sid];
          if (s && s.kind !== 'removed') { drawStructure(s, p.x, p.y, animFrames ? frame : 0, i); stats.drawn.structs++; }
        } else {
          const pv = g.province[i] >= 0 ? g.provinces[g.province[i]] : null;
          if (pv && pv.center === i && pv.improvement) { drawImprovementAt(pv, p.x, p.y, i); stats.drawn.structs++; }
        }
        if (vis && !vis[i]) continue;
        let ai = armyBuckets.head[i], k = 0;
        while (ai >= 0) {
          const a = g.armies[ai];
          if (!moveAnims.has(a.id)) { drawArmy(a, p.x + k * 7, p.y - k * 5, k); stats.drawn.armies++; }
          k++; ai = armyBuckets.next[ai];
        }
      }
      // armies in motion whose interpolated position lies on this row
      if (moveAnims.size) for (const [aid, an] of moveAnims) {
        const a = S.army(g, aid); if (!a) continue;
        const row = Math.round((an.y - Hx.SIZE) / Hx.ROW_H);
        if (row === r) { drawArmy(a, an.x, an.y, 0); stats.drawn.armies++; }
      }
    }
  }

  function drawStructure(s, x, y, frame, idx) {
    const SA = StructArt(), g = game, S = State();
    const seed = seedArr[idx] & 0x7fffffff;
    switch (s.kind) {
      case 'city': case 'outpost': case 'free_city': {
        const city = S.city(g, s.refId); if (!city) return;
        const pl = playerOf(city.owner);
        if (city.freeCity || city.owner < 0) {
          const cu = cultureById(city.freeCity && city.freeCity.culture);
          SA.drawFreeCity(ctx, x, y, { cultureId: cu ? cu.id : 'feudal', architecture: cu && cu.architecture, palette: cu && cu.palette, tier: city.tier, walls: city.walls, seed, frame });
        } else if (city.tier === 0 || s.kind === 'outpost') {
          const cu = cultureOf(pl);
          SA.drawOutpost(ctx, x, y, { cultureId: pl.cultureId, architecture: cu && cu.architecture, palette: cu && cu.palette, playerColor: pl.color, playerColor2: pl.color2, seed, frame });
        } else {
          const cu = cultureOf(pl);
          SA.drawCity(ctx, x, y, { cultureId: pl.cultureId, architecture: cu && cu.architecture, palette: cu && cu.palette, tier: city.tier, walls: city.walls, isCapital: city.isCapital, playerColor: pl.color, playerColor2: pl.color2, seed, frame });
        }
        break;
      }
      case 'wonder': SA.drawWonder(ctx, x, y, { look: s.look || 'monolith', cleared: !!s.cleared, seed, frame, variant: s.tier | 0 }); break;
      case 'node': {
        const pv = s.refId >= 0 ? g.provinces[s.refId] : null;
        SA.drawNode(ctx, x, y, { resource: s.resource || (pv && pv.resource) || null, magicMaterial: s.magicMaterial || (pv && pv.magicMaterial) || null, improved: !!(pv && pv.improvement), seed });
        break;
      }
      case 'infestation': SA.drawInfestation(ctx, x, y, { kind: s.refId, seed, frame, cleared: !!s.cleared }); break;
      case 'teleporter': SA.drawTeleporter(ctx, x, y, { seed, frame, active: true, color: '#5a7ff0' }); break;
      default: break;
    }
  }
  const IMPROVE_KIND = { farm: 'farm', forester: 'forester', quarry: 'quarry', mine: 'mine', research_post: 'research_post', conduit: 'conduit', fishery: 'fishery', hunters_lodge: 'hunters_lodge', vineyard: 'vineyard',
    gold_mine: 'mine', mana_spring: 'conduit', granary_estate: 'farm', lumber_mill: 'forester', scholar_post: 'research_post', mustering_grounds: 'special' };
  function drawImprovementAt(pv, x, y, idx) {
    const id = pv.improvement;
    const kind = IMPROVE_KIND[id] || 'special';
    StructArt().drawImprovement(ctx, x, y, { kind, terrain: State().TERRAINS[game.terrain[idx]], seed: seedArr[idx] & 0x7fffffff, level: 1 });
  }

  // ---------------------------------------------------------------- armies
  function leadUnit(army) {
    const g = game, S = State();
    let e = leadCache.get(army.id);
    let same = !!e && e.n === army.units.length;
    if (same) for (let i = 0; i < army.units.length; i++) if (e.ids[i] !== army.units[i]) { same = false; break; }
    if (same) return e;
    let best = null, bestScore = -1, hero = false, count = 0;
    for (const uid of army.units) {
      const u = S.unit(g, uid); if (!u) continue;
      count++;
      const t = S.unitType(u);
      const isHero = u.heroId !== null && u.heroId !== undefined && u.heroId >= 0;
      const score = (isHero ? 100 : 0) + (t.tier || 1) * 10 + (u.hp / Math.max(1, u.maxHp));
      if (score > bestScore) { bestScore = score; best = u; }
      if (isHero) hero = true;
    }
    e = { n: army.units.length, ids: army.units.slice(), unit: best, type: best ? S.unitType(best) : null, hero, count };
    leadCache.set(army.id, e);
    return e;
  }
  function relationColor(owner) {
    const g = game;
    if (owner < 0) return '#8c8f96';
    if (owner === viewerPid) return g.players[owner].color;
    const me = g.players[viewerPid];
    const rel = me && me.diplomacy && me.diplomacy[owner];
    if (rel && rel.state === 'war') return '#d8402f';
    return g.players[owner] ? g.players[owner].color : '#8c8f96';
  }
  function drawArmy(army, x, y, stackIndex) {
    const g = game, pl = playerOf(army.owner);
    const lead = leadUnit(army);
    const col = pl ? pl.color : '#8c8f96', col2 = pl ? pl.color2 : '#d8d4c8';
    const ring = relationColor(army.owner);
    const selected = selection.armyId === army.id;
    const bob = Math.sin(time * 2.6 + army.id * 1.7) * 1.1;
    // ground ring
    ctx.save();
    const pulse = selected ? 0.75 + 0.25 * Math.sin(time * 5) : 1;
    ctx.fillStyle = Art().rgrad(ctx, x, y + 4, 0, 20, [[0, 'rgba(10,8,20,0.32)'], [0.7, 'rgba(10,8,20,0.16)'], [1, 'rgba(10,8,20,0)']]);
    ctx.beginPath(); ctx.ellipse(x, y + 5, 20, 8, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = selected ? 2.6 : 1.8;
    ctx.strokeStyle = Color().alpha(ring, 0.9 * pulse);
    ctx.beginPath(); ctx.ellipse(x, y + 5, 15, 6.5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = Color().alpha(Color().mix(ring, '#fff', 0.5), 0.5 * pulse);
    ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(x, y + 5, 12.5, 5.2, 0, 0, TAU); ctx.stroke();
    if (selected) {
      ctx.strokeStyle = Color().alpha('#fff2b0', 0.35 + 0.3 * Math.sin(time * 5));
      ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 5, 19 + Math.sin(time * 5) * 1.5, 8.2, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    // unit sprite
    const frame = Math.floor(time * 4 + army.id) & 3;
    let drewUnit = false;
    if (hasFn('UnitArt', 'draw') && lead.type) {
      try {
        const D = AOW.Data;
        const formId = (lead.unit && lead.unit.formId) || (pl && pl.formId);
        const formLook = D && formId && D.has('forms', formId) ? D.get('forms', formId).look : null;
        const look = hasFn('UnitArt', 'resolveLook') ? AOW.UnitArt.resolveLook(lead.type, formLook, pl) : (lead.type.look || {});
        AOW.UnitArt.draw(ctx, x, y + 4 + bob * 0.5, { unitType: lead.type, look, playerColor: col, playerColor2: col2, facing: army.owner === viewerPid ? 'right' : 'left', frame, anim: 'idle', scale: 1, rank: lead.unit ? lead.unit.rank : 0, hero: lead.hero });
        drewUnit = true;
      } catch (e) { drewUnit = false; }
    }
    if (!drewUnit) drawUnitToken(x, y + 4 + bob * 0.5, col, col2, lead, army.owner === viewerPid ? 'right' : 'left');
    // banner
    const cu = cultureOf(pl);
    const shape = cu ? cu.bannerShape : 'square';
    if (hasFn('UnitArt', 'armyBanner')) {
      try { AOW.UnitArt.armyBanner(ctx, x + 12, y - 30 + bob, { playerColor: col, playerColor2: col2, bannerShape: shape, count: lead.count, hero: lead.hero }); return; } catch (e) { /* fallback */ }
    }
    drawBanner(x + 13, y - 28 + bob, col, col2, shape, lead.count, lead.hero, army.owner < 0);
  }

  // ---- placeholder unit token (used until AOW.UnitArt.draw exists): kite shield with crest, helmet and spear
  function registerTokens() {
    const A = Art();
    if (A.has('wr:token')) return;
    A.sprite('wr:token', 40, 46, (c, w, h, p) => {
      const col = p.c || '#3f7fe0', col2 = p.c2 || '#c9d9ff', C = Color();
      const cx = 20, ground = h - 3;
      // spear behind
      c.strokeStyle = '#5a3b23'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx + 8, ground - 2); c.lineTo(cx + 14, ground - 40); c.stroke();
      c.fillStyle = '#c8ccd6'; c.beginPath(); c.moveTo(cx + 14, ground - 46); c.lineTo(cx + 11.5, ground - 39); c.lineTo(cx + 16.5, ground - 39); c.closePath(); c.fill(); c.strokeStyle = 'rgba(20,15,30,0.6)'; c.lineWidth = 0.8; c.stroke();
      // cloak / body
      c.fillStyle = C.shade(col, -0.35); c.beginPath(); c.moveTo(cx - 9, ground); c.quadraticCurveTo(cx - 12, ground - 18, cx - 6, ground - 26); c.lineTo(cx + 7, ground - 26); c.quadraticCurveTo(cx + 12, ground - 16, cx + 9, ground); c.closePath(); c.fill();
      // helmet
      c.fillStyle = A.grad(c, cx - 7, ground - 40, cx + 7, ground - 28, [[0, '#dfe3ea'], [0.6, '#9aa0ac'], [1, '#5c6068']]);
      c.beginPath(); c.arc(cx, ground - 32, 7, Math.PI, 0); c.lineTo(cx + 7, ground - 27); c.lineTo(cx - 7, ground - 27); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(20,15,30,0.6)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#1a1420'; c.fillRect(cx - 5, ground - 31, 10, 2.5);
      // plume
      c.fillStyle = col2; c.beginPath(); c.moveTo(cx - 1, ground - 39); c.quadraticCurveTo(cx - 8, ground - 46, cx - 12, ground - 40); c.quadraticCurveTo(cx - 6, ground - 41, cx + 1, ground - 37); c.closePath(); c.fill();
      // kite shield
      const sx = cx - 3, sy = ground - 26;
      c.beginPath(); c.moveTo(sx - 9, sy); c.quadraticCurveTo(sx - 9, sy + 14, sx, sy + 24); c.quadraticCurveTo(sx + 9, sy + 14, sx + 9, sy); c.quadraticCurveTo(sx, sy - 3, sx - 9, sy); c.closePath();
      c.fillStyle = A.grad(c, sx - 9, sy, sx + 9, sy + 24, [[0, C.mix(col, '#ffffff', 0.35)], [0.5, col], [1, C.shade(col, -0.4)]]); c.fill();
      c.strokeStyle = '#d9c47a'; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = 'rgba(20,15,30,0.7)'; c.lineWidth = 0.9; c.stroke();
      // crest: chevron in color2
      c.fillStyle = col2; c.beginPath(); c.moveTo(sx - 6, sy + 6); c.lineTo(sx, sy + 12); c.lineTo(sx + 6, sy + 6); c.lineTo(sx + 6, sy + 9.5); c.lineTo(sx, sy + 15.5); c.lineTo(sx - 6, sy + 9.5); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.moveTo(sx - 8, sy + 1); c.quadraticCurveTo(sx - 8, sy + 10, sx - 2, sy + 18); c.lineTo(sx - 4, sy + 2); c.closePath(); c.fill();
      if (p.hero) { A.star(c, sx, sy - 4, 5, 2.2); c.fillStyle = '#ffe58a'; c.fill(); c.strokeStyle = 'rgba(90,60,10,0.8)'; c.lineWidth = 0.8; c.stroke(); }
    }, { anchor: { x: 0.5, y: 1 } });
    A.sprite('wr:banner', 34, 60, (c, w, h, p) => {
      const col = p.c || '#3f7fe0', col2 = p.c2 || '#c9d9ff', C = Color(), shape = p.s || 'square';
      const px = 8, top = 6, bottom = h - 2;
      // pole
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(px, top); c.lineTo(px, bottom); c.stroke();
      c.strokeStyle = '#8a6a44'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(px - 0.5, top + 2); c.lineTo(px - 0.5, bottom - 2); c.stroke();
      // finial
      c.fillStyle = '#e8c357'; c.beginPath(); c.arc(px, top - 1, 2.4, 0, TAU); c.fill(); c.strokeStyle = 'rgba(60,40,10,0.7)'; c.lineWidth = 0.7; c.stroke();
      // cloth
      const y0 = top + 3, cw = 21, chh = 22;
      c.beginPath();
      if (shape === 'pennant') { c.moveTo(px, y0); c.lineTo(px + cw + 3, y0 + chh * 0.4); c.lineTo(px, y0 + chh * 0.8); }
      else if (shape === 'swallow') { c.moveTo(px, y0); c.lineTo(px + cw, y0); c.lineTo(px + cw - 6, y0 + chh / 2); c.lineTo(px + cw, y0 + chh); c.lineTo(px, y0 + chh); }
      else if (shape === 'round') { c.moveTo(px, y0); c.lineTo(px + cw - 6, y0); c.quadraticCurveTo(px + cw + 4, y0 + chh / 2, px + cw - 6, y0 + chh); c.lineTo(px, y0 + chh); }
      else if (shape === 'spear') { c.moveTo(px, y0); c.lineTo(px + cw - 4, y0 + 2); c.lineTo(px + cw + 2, y0 + chh * 0.5); c.lineTo(px + cw - 4, y0 + chh - 2); c.lineTo(px, y0 + chh); }
      else { c.moveTo(px, y0); c.lineTo(px + cw, y0); c.lineTo(px + cw, y0 + chh); c.lineTo(px, y0 + chh); }
      c.closePath();
      c.fillStyle = A.grad(c, px, y0, px + cw, y0 + chh, [[0, C.mix(col, '#ffffff', 0.25)], [0.55, col], [1, C.shade(col, -0.35)]]); c.fill();
      c.strokeStyle = 'rgba(20,15,30,0.65)'; c.lineWidth = 1; c.stroke();
      // emblem stripe
      c.save(); c.clip();
      c.fillStyle = C.alpha(col2, 0.85); c.fillRect(px, y0 + chh * 0.42, cw + 4, 3);
      c.fillStyle = C.alpha(col2, 0.9); c.beginPath(); c.arc(px + 8, y0 + chh * 0.5, 3.2, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(px, y0, cw + 4, 4);
      c.restore();
      // count pips (2 rows × 3)
      const n = Math.max(0, Math.min(6, p.n | 0));
      for (let i = 0; i < 6; i++) {
        const gx = px + 3 + (i % 3) * 5.5, gy = y0 + chh + 5 + Math.floor(i / 3) * 5.5;
        c.beginPath(); c.arc(gx, gy, 2.1, 0, TAU);
        c.fillStyle = i < n ? '#f3e2a0' : 'rgba(30,25,40,0.55)'; c.fill();
        c.strokeStyle = 'rgba(20,15,30,0.7)'; c.lineWidth = 0.7; c.stroke();
      }
      if (p.hero) { A.star(c, px + 20, top + 2, 5.5, 2.4); c.fillStyle = '#ffe58a'; c.fill(); c.strokeStyle = 'rgba(90,60,10,0.85)'; c.lineWidth = 0.9; c.stroke(); }
    }, { anchor: { x: 8 / 34, y: 1 } });
  }
  function drawUnitToken(x, y, col, col2, lead, facing) {
    registerTokens();
    Art().draw(ctx, 'wr:token', x, y, { c: col, c2: col2, hero: lead.hero ? 1 : 0 }, { flip: facing === 'left' });
  }
  function drawBanner(x, y, col, col2, shape, count, hero, neutral) {
    registerTokens();
    const wave = Math.sin(time * 3 + x * 0.05) * 0.06;
    ctx.save(); ctx.translate(x, y + 28); ctx.transform(1, 0, wave, 1, 0, 0);
    Art().draw(ctx, 'wr:banner', 0, 0, { c: neutral ? '#8a7a66' : col, c2: neutral ? '#d8ccb4' : col2, s: shape, n: count, hero: hero ? 1 : 0 });
    ctx.restore();
  }

  // ================================================================ path preview
  function drawPathPreview() {
    if (!pathPreview || !pathPreview.path || !pathPreview.path.length) return;
    const Hx = Hex(), g = game, path = pathPreview.path;
    const tb = pathPreview.turnBreaks;
    const breaks = new Map();
    if (Array.isArray(tb)) tb.forEach((pi, k) => breaks.set(pi, k + 1));
    else if (tb && typeof tb === 'object') for (const k of Object.keys(tb)) breaks.set(+k, tb[k]);
    ctx.save();
    ctx.lineCap = 'round';
    // start from the selected army's hex when known
    let prev = null;
    const a = selection.armyId !== null ? State().army(g, selection.armyId) : null;
    if (a) prev = Hx.toPixel(a.hex % g.W, (a.hex / g.W) | 0);
    for (let i = 0; i < path.length; i++) {
      const idx = path[i];
      const p = Hx.toPixel(idx % g.W, (idx / g.W) | 0);
      if (prev) {
        // dots between hexes
        for (let k = 1; k <= 3; k++) {
          const t = k / 4, dx = M().lerp(prev.x, p.x, t), dy = M().lerp(prev.y, p.y, t);
          ctx.fillStyle = 'rgba(20,15,30,0.45)'; ctx.beginPath(); ctx.arc(dx + 0.6, dy + 1.2, 2.6, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,246,214,0.95)'; ctx.beginPath(); ctx.arc(dx, dy, 2.2, 0, TAU); ctx.fill();
        }
      }
      const turn = breaks.get(i) || (i === path.length - 1 ? (breaks.size ? null : 1) : null);
      if (turn) {
        ctx.fillStyle = 'rgba(20,15,30,0.5)'; ctx.beginPath(); ctx.arc(x1(p.x), p.y + 1, 9.5, 0, TAU); ctx.fill();
        ctx.fillStyle = Art().rgrad(ctx, p.x - 2, p.y - 3, 0, 10, [[0, '#fff1c0'], [1, '#d8a83a']]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 8.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(70,45,10,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
        Art().text(ctx, String(turn), p.x, p.y + 0.5, { size: 10, color: '#3a2a10', weight: '800', font: 'Georgia, serif' });
      } else {
        ctx.fillStyle = 'rgba(20,15,30,0.45)'; ctx.beginPath(); ctx.arc(p.x + 0.6, p.y + 1.2, 4.2, 0, TAU); ctx.fill();
        ctx.fillStyle = i === path.length - 1 ? '#ffe58a' : 'rgba(255,246,214,0.95)'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.6, 0, TAU); ctx.fill();
      }
      prev = p;
    }
    ctx.restore();
    function x1(v) { return v + 0.6; }
  }

  // ================================================================ move animation
  WR.animateMove = function (armyId, path, done, fromIdx) {
    const g = game, a = State().army(g, armyId);
    if (!a || !path || !path.length) { if (done) done(); return; }
    const Hx = Hex();
    // the army's hex is ALREADY the end of `path` when Rules.moveArmy has run, so the tween must start from
    // the hex the army left (the caller passes it); fall back to the current hex only when it is adjacent to
    // path[0] (i.e. the move has not been applied yet), else start on path[0] itself — never at the far end,
    // which would make the stack slide backwards before walking its route.
    let startIdx = path[0];
    if (fromIdx !== undefined && fromIdx !== null && fromIdx >= 0) startIdx = fromIdx;
    else if (Hx.distIdx(a.hex, path[0], g.W) === 1) startIdx = a.hex;
    const from = Hx.toPixel(startIdx % g.W, (startIdx / g.W) | 0);
    const sx = from.x, sy = from.y;
    moveAnims.set(armyId, { path: path.slice(), i: 0, t: 0, done, x: sx, y: sy, sx, sy, follow: WR.followMoves });
    leadCache.delete(armyId);
  };
  function updateMoveAnims(dt) {
    if (!moveAnims.size) return;
    const g = game, Hx = Hex();
    for (const [aid, an] of Array.from(moveAnims)) {
      an.t += dt / 0.18;
      while (an.t >= 1 && an.i < an.path.length) { an.t -= 1; an.i++; const idx = an.path[an.i - 1]; const p = Hx.toPixel(idx % g.W, (idx / g.W) | 0); an.sx = p.x; an.sy = p.y; }
      if (an.i >= an.path.length) {
        moveAnims.delete(aid);
        if (an.done) { try { an.done(); } catch (e) { console.error(e); } }
        continue;
      }
      const idx = an.path[an.i];
      const p = Hx.toPixel(idx % g.W, (idx / g.W) | 0);
      const k = M().smoothstep(0, 1, an.t);
      an.x = M().lerp(an.sx, p.x, k); an.y = M().lerp(an.sy, p.y, k);
      if (an.follow) {
        const s = WR.worldToScreen(an.x, an.y);
        const mx = viewW * 0.18, my = viewH * 0.18;
        if (s.x < mx || s.x > viewW - mx || s.y < my || s.y > viewH - my) {
          camTween.active = true; camTween.t = 0; camTween.dur = 0.35; camTween.x0 = cam.x; camTween.y0 = cam.y; camTween.x1 = an.x; camTween.y1 = an.y;
        }
      }
    }
  }

  // ================================================================ effects
  WR.playEffect = function (kind, idx, params) {
    if (!game || idx < 0) return null;
    const p = Hex().toPixel(idx % game.W, (idx / game.W) | 0);
    if (hasFn('VFX', 'spawn')) { try { return AOW.VFX.spawn(kind, p.x, p.y, params || {}); } catch (e) { /* fallback */ } }
    const colors = { fire_burst: '#ff7a2a', frost_burst: '#7ad8ff', lightning_strike: '#ffe86a', heal_glow: '#9bd35a', arcane_swirl: '#7fa0ff', shadow_wisp: '#9b5fd0', nature_bloom: '#5fb043', holy_light: '#fff0b8', blood_hit: '#d33b3b', city_founded: '#f1d98a', level_up: '#ffe58a', summon_circle: '#b06aff' };
    ringFx.push({ x: p.x, y: p.y, t: 0, dur: (params && params.duration) || 0.9, color: (params && params.color) || colors[kind] || '#ffffff' });
    return null;
  };
  function drawRingFx(dt) {
    if (!ringFx.length) return;
    ctx.save();
    for (let i = ringFx.length - 1; i >= 0; i--) {
      const f = ringFx[i];
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) { ringFx.splice(i, 1); continue; }
      const r = 6 + k * 34;
      ctx.strokeStyle = Color().alpha(f.color, (1 - k) * 0.9); ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.6, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = Color().alpha(f.color, (1 - k) * 0.25);
      ctx.beginPath(); ctx.ellipse(f.x, f.y, r * 0.6, r * 0.36, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ================================================================ fog of war (per chunk, feathered)
  // Both layers are painted as ONE continuous wash over the whole chunk and then masked by the (blurred)
  // union of the hexes they cover, so nothing in the fog follows a hex silhouette. The blur radii below are
  // world px: ~1.5 hexes of feather for the unexplored cloud bank, ~1 hex for the "explored but unseen" veil.
  let veilCss = null;
  function veilFill() {             // the veil layer's colour at the alpha buildFog composites it with
    if (!veilCss) { const TA = TerrainArt(); veilCss = Color().alpha((TA && TA.FOG_VEIL) || 'rgb(118,122,138)', FOG_VEIL_ALPHA); }
    return veilCss;
  }
  const FOG_VEIL_ALPHA = 0.55;
  const FOG_MASK_GROW = 7;       // world px the mask extends past the hex edge before blurring
  const FOG_BLUR_CLOUD = 26;     // world px gaussian radius on the unexplored edge (Hex.SIZE is 36)
  const FOG_BLUR_VEIL = 16;      // world px gaussian radius on the explored-but-unseen edge
  const fogScratch = { cv: null, ctx: null };
  function buildFog(ch) {
    const g = game, Hx = Hex(), TA = TerrainArt();
    const t0 = performance.now();
    const ex = g.explored[viewerPid], vis = g.visible[viewerPid];
    ch.fogDirty = false; ch.fogBuilt = true;
    if (!ex) { ch.fogHasDim = false; ch.fogHasCloud = false; ch.fogAllCloud = false; ch.fogAllDim = false; return; }
    const c0 = Math.max(0, ch.c0 - 1), c1 = Math.min(g.W - 1, ch.c1 + 1), r0 = Math.max(0, ch.r0 - 1), r1 = Math.min(g.H - 1, ch.r1 + 1);
    let anyDim = false, anyCloud = false, allCloud = true, allDim = true;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const i = r * g.W + c;
      if (!ex[i]) { anyCloud = true; allDim = false; }
      else { allCloud = false; if (vis && !vis[i]) anyDim = true; else allDim = false; }
    }
    ch.fogHasDim = anyDim; ch.fogHasCloud = anyCloud; ch.fogAllCloud = anyCloud && allCloud; ch.fogAllDim = anyDim && allDim;
    if (!anyDim && !anyCloud) return;
    if (!fogScratch.cv) { const o = Art().canvas(ch.w, ch.h); fogScratch.cv = o.cv; fogScratch.ctx = o.ctx; }
    if (fogScratch.cv.width < ch.w || fogScratch.cv.height < ch.h) { fogScratch.cv.width = Math.max(fogScratch.cv.width, ch.w); fogScratch.cv.height = Math.max(fogScratch.cv.height, ch.h); }
    const s = ch.scale;
    const mask = fogScratch.ctx;
    const buildMask = (test, grow) => {
      mask.setTransform(1, 0, 0, 1, 0, 0); mask.clearRect(0, 0, ch.w, ch.h);
      mask.save(); mask.scale(s, s); mask.translate(-ch.ox, -ch.oy);
      mask.fillStyle = '#fff';
      mask.beginPath();
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * g.W + c; if (!test(i)) continue;
        const p = Hx.toPixel(c, r);
        for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90); const x = p.x + (Hx.SIZE + grow) * Math.cos(a), y = p.y + (Hx.SIZE + grow) * Math.sin(a); if (k === 0) mask.moveTo(x, y); else mask.lineTo(x, y); }
        mask.closePath();
      }
      mask.fill();
      mask.restore();
    };
    const applyMask = (target, blurWorld) => {
      const blur = Math.max(1, Math.round(blurWorld * s));
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.globalCompositeOperation = 'destination-in';
      if ('filter' in target) target.filter = 'blur(' + blur + 'px)';
      target.drawImage(fogScratch.cv, 0, 0, ch.w, ch.h, 0, 0, ch.w, ch.h);
      if ('filter' in target) target.filter = 'none';
      target.globalCompositeOperation = 'source-over';
    };
    // both layers are pre-composited into one canvas (ch.fogOut) so the hot per-frame draw path is a single
    // drawImage per chunk instead of two — halves the fog draw-call count (draw calls, not pixel fill, are the
    // dominant per-frame cost measured under software rendering). Purely additive alpha-over compositing, so
    // building them in this order into an intermediate canvas is visually identical to drawing them in sequence
    // straight onto the main canvas.
    if (!ch.fogOut) ch.fogOut = Art().canvas(ch.w, ch.h);
    const out = ch.fogOut.ctx;
    out.setTransform(1, 0, 0, 1, 0, 0); out.clearRect(0, 0, ch.w, ch.h);
    // ---- veil layer: cool grey wash over explored-but-unseen ground, feathered at its edge
    if (anyDim) {
      if (!ch.fogDim) ch.fogDim = Art().canvas(ch.w, ch.h);
      const d = ch.fogDim.ctx;
      d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, ch.w, ch.h);
      d.fillStyle = (TA && TA.FOG_VEIL) || 'rgb(118,122,138)'; d.fillRect(0, 0, ch.w, ch.h);
      buildMask(i => ex[i] && vis && !vis[i], FOG_MASK_GROW);
      applyMask(d, FOG_BLUR_VEIL);
      out.globalAlpha = FOG_VEIL_ALPHA;
      out.drawImage(ch.fogDim.cv, 0, 0, ch.w, ch.h);
      out.globalAlpha = 1;
    }
    // ---- cloud layer: one seamless parchment wash over the whole chunk, cut to the unexplored hexes with a
    // soft (≈1.5 hex) edge — a single world-aligned repeating texture, never per-hex sprites.
    if (anyCloud) {
      if (!ch.fogCloud) ch.fogCloud = Art().canvas(ch.w, ch.h);
      const k = ch.fogCloud.ctx;
      k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, ch.w, ch.h);
      k.save(); k.scale(s, s); k.translate(-ch.ox, -ch.oy);
      TA.setOrigin(0, 0);                       // phase-lock the pattern to world coordinates
      if (typeof TA.fillFog === 'function') TA.fillFog(k, ch.ox, ch.oy, ch.w / s, ch.h / s);
      else { k.fillStyle = 'rgb(150,150,150)'; k.fillRect(ch.ox, ch.oy, ch.w / s, ch.h / s); }
      k.restore();
      buildMask(i => !ex[i], FOG_MASK_GROW);
      applyMask(k, FOG_BLUR_CLOUD);
      out.drawImage(ch.fogCloud.cv, 0, 0, ch.w, ch.h);
    }
    stats.totalFogBuilds++;
    stats.lastFogMs = performance.now() - t0;
  }
  function drawFogChunk(ch) {
    if ((!ch.fogHasDim && !ch.fogHasCloud) || !ch.fogOut) return;
    blitCut(ch.fogOut.cv, ch);
  }

  // ================================================================ cloud shadows, vignette, labels, debug
  function drawCloudShadows() {
    if (!cloudSprites) {
      cloudSprites = [];
      for (let i = 0; i < 3; i++) {
        const o = Art().canvas(320, 220);
        const c = o.ctx, rng = new AOW.RNG(77 + i);
        for (let k = 0; k < 7; k++) {
          const x = 60 + rng.next() * 200, y = 50 + rng.next() * 120, r = 40 + rng.next() * 55;
          c.fillStyle = Art().rgrad(c, x, y, 0, r, [[0, 'rgba(12,18,40,0.22)'], [0.6, 'rgba(12,18,40,0.1)'], [1, 'rgba(12,18,40,0)']]);
          c.fillRect(x - r, y - r, r * 2, r * 2);
        }
        cloudSprites.push(o.cv);
      }
    }
    const b = mapBounds();
    const span = b.x1 + 800;
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const spr = cloudSprites[i % 3];
      const sp = 14 + (i % 3) * 5;
      const x = M().mod(i * 517 + time * sp, span) - 400, y = M().mod(i * 331 + time * sp * 0.35, b.y1 + 500) - 250;
      const sc = 1.6 + (i % 4) * 0.4;
      const w = 320 * sc, h = 220 * sc;
      if (x + w < view.x0 || x > view.x1 || y + h < view.y0 || y > view.y1) continue;
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.restore();
  }
  function drawVignette() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (vignetteEl) { const want = canvas && canvas.hidden ? 'none' : ''; if (vignetteEl.style.display !== want) vignetteEl.style.display = want; return; }
    if (!vignette.cv || vignette.w !== viewW || vignette.h !== viewH) {
      const o = Art().canvas(Math.max(2, viewW / 4), Math.max(2, viewH / 4));
      const w = o.cv.width, h = o.cv.height;
      const g = o.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(8,10,24,0)'); g.addColorStop(1, 'rgba(8,10,24,0.42)');
      o.ctx.fillStyle = g; o.ctx.fillRect(0, 0, w, h);
      vignette = { cv: o.cv, w: viewW, h: viewH };
    }
    ctx.drawImage(vignette.cv, 0, 0, viewW, viewH);
  }

  // ---- city name plates (cached canvases; screen-space, hidden below zoom 0.5)
  function labelFor(city) {
    const pl = playerOf(city.owner);
    const col = city.freeCity || city.owner < 0 ? '#8a7a66' : pl.color;
    const key = city.id + '|' + city.name + '|' + city.tier + '|' + col + '|' + (city.isCapital ? 1 : 0) + '|' + (city.freeCity ? 1 : 0);
    let e = labelCache.get(key);
    if (e) return e;
    const A = Art(), C = Color();
    const font = '600 13px "Cinzel", "Noto Serif KR", Georgia, serif';
    const meas = A.canvas(2, 2).ctx; meas.font = font;
    const tw = Math.ceil(meas.measureText(city.name).width);
    const pips = city.freeCity ? 0 : Math.max(0, city.tier);
    const w = tw + 30 + (city.isCapital ? 16 : 0), h = 30;
    const o = A.canvas(w + 8, h + 6), c = o.ctx;
    const x = 4, y = 3, bh = 20;
    // plate
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 4; c.shadowOffsetY = 1.5;
    A.rrect(c, x, y, w, bh, 5); c.fillStyle = A.grad(c, 0, y, 0, y + bh, [[0, 'rgba(38,44,64,0.94)'], [1, 'rgba(18,22,36,0.94)']]); c.fill();
    c.restore();
    A.rrect(c, x, y, w, bh, 5); c.strokeStyle = 'rgba(201,162,74,0.85)'; c.lineWidth = 1.2; c.stroke();
    A.rrect(c, x + 1.5, y + 1.5, w - 3, bh - 3, 4); c.strokeStyle = 'rgba(241,217,138,0.25)'; c.lineWidth = 0.8; c.stroke();
    // owner colour stripe
    c.save(); A.rrect(c, x, y, w, bh, 5); c.clip();
    c.fillStyle = col; c.fillRect(x, y, 5, bh);
    c.fillStyle = C.alpha(col, 0.18); c.fillRect(x + 5, y, w - 5, bh);
    c.restore();
    let tx = x + 12;
    if (city.isCapital && Icons() && Icons().draw) { try { Icons().draw(c, 'crown', tx + 6, y + bh / 2, 14); tx += 16; } catch (e) { /* ignore */ } }
    A.text(c, city.name, tx + tw / 2, y + bh / 2 + 0.5, { size: 13, color: '#f4ead2', weight: '600', font: '"Cinzel", "Noto Serif KR", Georgia, serif', shadow: 2 });
    // tier pips under the plate
    if (pips) {
      const px0 = x + w / 2 - (pips - 1) * 4.5;
      for (let i = 0; i < pips; i++) {
        c.beginPath(); c.arc(px0 + i * 9, y + bh + 5, 2.6, 0, TAU);
        c.fillStyle = '#e8c357'; c.fill(); c.strokeStyle = 'rgba(60,40,10,0.8)'; c.lineWidth = 0.8; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(px0 + i * 9 - 0.8, y + bh + 4.2, 0.9, 0, TAU); c.fill();
      }
    }
    e = { cv: o.cv, w: o.cv.width, h: o.cv.height, ax: x + w / 2 };
    labelCache.set(key, e);
    return e;
  }
  function drawLabels() {
    if (cam.zoom < 0.5 || !game) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = game, Hx = Hex(), ex = g.explored[viewerPid];
    const k = M().clamp(cam.zoom, 0.8, 1.15);
    for (const city of g.cities) {
      const idx = city.hex;
      if (ex && !ex[idx]) continue;
      const col = idx % g.W, row = (idx / g.W) | 0;
      if (row < view.r0 || row > view.r1 || col < view.c0 || col > view.c1) continue;
      const p = Hx.toPixel(col, row);
      const off = StructArt().cityLabelOffset({ tier: city.tier });
      const s = WR.worldToScreen(p.x, p.y + off.y);
      const e = labelFor(city);
      ctx.save();
      ctx.translate(Math.round(s.x), Math.round(s.y));
      ctx.scale(k, k);
      ctx.drawImage(e.cv, -e.ax, 0);
      ctx.restore();
    }
    // hover plate for wonders / infestations / nodes
    if (hoverIdx >= 0 && cam.zoom >= 0.7) {
      const sid = g.structure[hoverIdx];
      const s = sid >= 0 ? g.structures[sid] : null;
      if (s && (s.kind === 'wonder' || s.kind === 'infestation' || s.kind === 'node' || s.kind === 'teleporter') && (!ex || ex[hoverIdx])) {
        const name = structureName(s);
        if (name) {
          const p = Hx.toPixel(hoverIdx % g.W, (hoverIdx / g.W) | 0);
          const sc = WR.worldToScreen(p.x, p.y + 30);
          Art().text(ctx, name, sc.x, sc.y, { size: 12, color: '#f4ead2', weight: '600', font: '"Cinzel", "Noto Serif KR", Georgia, serif', stroke: 'rgba(10,8,20,0.85)', strokeWidth: 3 });
        }
      }
    }
  }
  function structureName(s) {
    const D = AOW.Data, L = AOW.L || (o => o && (o.en || o));
    try {
      if (s.kind === 'wonder') { if (s.refId && D.has('wonders', s.refId)) return L(D.get('wonders', s.refId).name); return L({ ko: '고대 불가사의', en: 'Ancient Wonder' }); }
      if (s.kind === 'infestation') { const e = D.has('names', 'infestation_kinds') ? D.get('names', 'infestation_kinds').list.find(k => k.id === s.refId) : null; return e ? L(e.name) : s.refId; }
      if (s.kind === 'node') { const pv = s.refId >= 0 ? game.provinces[s.refId] : null; const res = (pv && (pv.magicMaterial || pv.resource)) || s.magicMaterial || s.resource; return res ? String(res).replace(/_/g, ' ') : null; }
      if (s.kind === 'teleporter') return L({ ko: '순간이동문', en: 'Teleporter' });
    } catch (e) { return null; }
    return null;
  }

  function drawDebug() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lines = ['fps ' + stats.fps.toFixed(0) + '  frame ' + stats.frameMs.toFixed(2) + ' ms', 'zoom ' + cam.zoom.toFixed(2) + '  cam ' + cam.x.toFixed(0) + ',' + cam.y.toFixed(0),
      'chunks ' + WR.chunkCount() + ' (drawn ' + stats.drawn.chunks + ')  last build ' + stats.lastChunkMs.toFixed(1) + ' ms  max ' + stats.chunkMsMax.toFixed(1),
      'structs ' + stats.drawn.structs + '  armies ' + stats.drawn.armies + '  fog ' + (stats.lastFogMs || 0).toFixed(1) + ' ms'];
    if (hoverIdx >= 0 && game) {
      const i = hoverIdx;
      lines.push('hex ' + i + ' (' + (i % game.W) + ',' + ((i / game.W) | 0) + ') ' + State().TERRAINS[game.terrain[i]] + '/' + State().FEATURES[game.feature[i]] + ' h=' + game.height[i].toFixed(2) + ' prov ' + game.province[i] + ' owner ' + game.owner[i] + ' struct ' + game.structure[i]);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(8, 8, 420, 14 * lines.length + 10);
    ctx.font = '12px monospace'; ctx.fillStyle = '#e8e2d0'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, k) => ctx.fillText(l, 14, 13 + k * 14));
  }

  // ================================================================ minimap
  WR.renderMinimap = function (mctx, w, h) {
    if (!game || !mctx) return;
    const g = game, Hx = Hex();
    const mm = minimapMetrics(w, h);
    if (!minimapCache.cv || minimapCache.w !== w || minimapCache.h !== h) { minimapCache.cv = Art().canvas(w, h); minimapCache.w = w; minimapCache.h = h; minimapCache.dirty = true; }
    const now = performance.now();
    if (minimapCache.dirty || (minimapCache.fogDirty && now - minimapCache.lastFog > 200)) {
      const c = minimapCache.cv.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#0b1320'; c.fillRect(0, 0, w, h);
      const T = State().TERRAINS, TA = TerrainArt(), ex = g.explored[viewerPid], vis = g.visible[viewerPid];
      const r = Math.max(1.2, Hx.SIZE * mm.s * 1.08);
      for (let row = 0; row < g.H; row++) for (let col = 0; col < g.W; col++) {
        const i = row * g.W + col;
        if (ex && !ex[i]) continue;
        const p = Hx.toPixel(col, row);
        const cc = TA.colors(T[g.terrain[i]]);
        let colr = g.height[i] > 0.7 ? cc.light : cc.base;
        const o = g.owner[i];
        if (o >= 0 && g.players[o]) colr = Color().mix(colr, g.players[o].color, 0.45);
        if (vis && !vis[i]) colr = Color().mix(colr, '#2a2e3c', 0.5);
        c.fillStyle = colr;
        c.fillRect(mm.ox + p.x * mm.s - r / 2, mm.oy + p.y * mm.s - r / 2, r, r);
      }
      minimapCache.dirty = false; minimapCache.fogDirty = false; minimapCache.lastFog = now;
    }
    mctx.drawImage(minimapCache.cv.cv, 0, 0);
    // cities & armies
    const ex = g.explored[viewerPid], vis = g.visible[viewerPid];
    for (const city of g.cities) {
      if (ex && !ex[city.hex]) continue;
      const p = Hx.toPixel(city.hex % g.W, (city.hex / g.W) | 0);
      const pl = playerOf(city.owner);
      mctx.fillStyle = pl ? pl.color : '#c9c0a8';
      mctx.beginPath(); mctx.arc(mm.ox + p.x * mm.s, mm.oy + p.y * mm.s, city.isCapital ? 3.2 : 2.4, 0, TAU); mctx.fill();
      mctx.strokeStyle = 'rgba(0,0,0,0.7)'; mctx.lineWidth = 0.8; mctx.stroke();
    }
    for (const a of g.armies) {
      if (vis && !vis[a.hex]) continue;
      const p = Hx.toPixel(a.hex % g.W, (a.hex / g.W) | 0);
      mctx.fillStyle = relationColor(a.owner);
      mctx.fillRect(mm.ox + p.x * mm.s - 1.2, mm.oy + p.y * mm.s - 1.2, 2.4, 2.4);
    }
    // viewport
    mctx.strokeStyle = 'rgba(255,240,200,0.9)'; mctx.lineWidth = 1;
    mctx.strokeRect(mm.ox + view.x0 * mm.s, mm.oy + view.y0 * mm.s, (view.x1 - view.x0) * mm.s, (view.y1 - view.y0) * mm.s);
  };
  function minimapMetrics(w, h) {
    const b = mapBounds();
    const s = Math.min(w / b.x1, h / b.y1);
    return { s, ox: (w - b.x1 * s) / 2, oy: (h - b.y1 * s) / 2 };
  }
  WR.minimapToWorld = function (mx, my, w, h) {
    if (!game) return { x: 0, y: 0 };
    const mm = minimapMetrics(w, h);
    return { x: (mx - mm.ox) / mm.s, y: (my - mm.oy) / mm.s };
  };

  // ================================================================ input
  function isTyping() { const el = document.activeElement; return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); }
  function emit(name, payload) { if (AOW.Events) AOW.Events.emit(name, payload); }
  function canvasPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function bindInput() {
    if (bound || !canvas) return;
    bound = true;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      const p = canvasPos(e);
      pointer.down = true; pointer.button = e.button; pointer.sx = p.x; pointer.sy = p.y; pointer.lx = p.x; pointer.ly = p.y; pointer.dragging = false;
      pointer.lastT = performance.now(); pointer.vx = pointer.vy = 0;
      cam.vx = cam.vy = 0; camTween.active = false;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', e => {
      const p = canvasPos(e);
      pointer.x = p.x; pointer.y = p.y; pointer.inside = true;
      if (pointer.down) {
        if (!pointer.dragging && Math.hypot(p.x - pointer.sx, p.y - pointer.sy) > DRAG_PX) pointer.dragging = true;
        if (pointer.dragging) {
          const dx = (p.x - pointer.lx) / cam.zoom, dy = (p.y - pointer.ly) / cam.zoom;
          cam.x -= dx; cam.y -= dy;
          const now = performance.now(), dt = Math.max(1, now - pointer.lastT) / 1000;
          pointer.vx = pointer.vx * 0.5 + (-dx / dt) * 0.5; pointer.vy = pointer.vy * 0.5 + (-dy / dt) * 0.5;
          pointer.lastT = now;
          clampCamera();
        }
        pointer.lx = p.x; pointer.ly = p.y;
      }
      const idx = WR.screenToHex(p.x, p.y);
      if (idx !== hoverIdx) { hoverIdx = idx; WR.hoverIdx = idx; emit('hex:hover', { idx }); }
    });
    const up = e => {
      if (!pointer.down) return;
      const p = canvasPos(e);
      pointer.down = false;
      if (pointer.dragging) {
        pointer.dragging = false;
        if (performance.now() - pointer.lastT < 80) { cam.vx = M().clamp(pointer.vx, -3000, 3000); cam.vy = M().clamp(pointer.vy, -3000, 3000); }
      } else {
        const idx = WR.screenToHex(p.x, p.y);
        emit('hex:click', { idx, button: e.button, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, x: p.x, y: p.y });
      }
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { pointer.inside = false; if (hoverIdx !== -1) { hoverIdx = -1; WR.hoverIdx = -1; emit('hex:hover', { idx: -1 }); } });
    canvas.addEventListener('dblclick', e => {
      const p = canvasPos(e);
      const idx = WR.screenToHex(p.x, p.y);
      if (idx >= 0) emit('hex:dblclick', { idx, button: e.button, x: p.x, y: p.y });
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const p = canvasPos(e);
      const k = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016));
      WR.setZoom(cam.tz * k, p.x, p.y);
    }, { passive: false });
    window.addEventListener('keydown', e => { if (isTyping()) return; keys.add(e.code); if (e.code === 'Home' && game) { const cap = State().capital(game, viewerPid); if (cap) WR.centerOn(cap.hex, true); } });
    window.addEventListener('keyup', e => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
  }

  // ================================================================ demo
  /** demo.html?module=world[&zoom=1&reveal=partial|all|none&debug=1&seed=demo] */
  WR.demo = function (cv, query) {
    const q = query || new URLSearchParams('');
    const get = (k, d) => (q && q.get && q.get(k) !== null) ? q.get(k) : d;
    const zoom = parseFloat(get('zoom', '1')) || 1;
    const reveal = get('reveal', 'partial');
    const seed = get('seed', 'demo');
    cv.width = parseInt(get('w', '0'), 10) || window.innerWidth || 1600;
    cv.height = parseInt(get('h', '0'), 10) || Math.max(300, (window.innerHeight || 900) - 34);
    cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
    const t0 = performance.now();
    const g = State().create(State().quickSettings({ seed }));
    const tGen = performance.now() - t0;
    const pid = 0, N = g.W * g.H;
    const cap = State().capital(g, pid) || g.cities[0];
    if (reveal === 'all') { g.explored[pid].fill(1); g.visible[pid].fill(1); }
    else if (reveal === 'partial' && cap) {
      const Hx = Hex();
      for (let i = 0; i < N; i++) {
        const d = Hx.distIdx(i, cap.hex, g.W);
        g.explored[pid][i] = d <= 19 ? 1 : 0;
        g.visible[pid][i] = d <= 8 ? 1 : 0;
      }
      for (const a of g.armies) if (a.owner === pid) for (const h of Hx.spiralIdx(a.hex, 3, g.W, g.H)) { g.explored[pid][h] = 1; g.visible[pid][h] = 1; }
      for (const c of g.cities) if (c.owner === pid) for (const h of Hx.spiralIdx(c.hex, 4, g.W, g.H)) { g.explored[pid][h] = 1; g.visible[pid][h] = 1; }
    }
    WR.init(cv, g);
    dpr = 1; viewW = cv.width; viewH = cv.height;
    WR.debug = get('debug', '0') === '1';
    if (cap) WR.centerOn(cap.hex, false);
    cam.zoom = cam.tz = M().clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    clampCamera();
    // showcase: select the first own army and preview a short path, highlight reachable ring
    const own = g.armies.find(a => a.owner === pid);
    if (own && get('sel', '1') === '1') {
      WR.setSelection({ armyId: own.id });
      const Hx = Hex();
      const ring = Hx.ringIdx(own.hex, 1, g.W, g.H).concat(Hx.ringIdx(own.hex, 2, g.W, g.H)).filter(i => g.terrain[i] > State().WATER_MAX);
      WR.highlight(ring, 'move');
      const target = Hx.ringIdx(own.hex, 4, g.W, g.H).find(i => g.terrain[i] > State().WATER_MAX && g.feature[i] !== State().F.peak);
      if (target) {
        const path = Hx.astar(own.hex, target, g.W, g.H, (a, b) => State().hexMoveCost(g, b, 'walk'));
        if (path) WR.setPathPreview({ path: path.path, turnBreaks: path.path.length > 2 ? [Math.floor(path.path.length / 2) - 1, path.path.length - 1] : null });
      }
    }
    // build every visible chunk now, then time steady-state frames
    const t1 = performance.now();
    WR.render(0.016, { buildAll: true });
    const tBuild = performance.now() - t1;
    let frames = 0, tSum = 0;
    for (let i = 0; i < 8; i++) { const a = performance.now(); WR.render(0.016); tSum += performance.now() - a; frames++; }
    drawDemoMinimap();
    const info = { gen: tGen.toFixed(0), build: tBuild.toFixed(0), frame: (tSum / frames).toFixed(2), chunks: WR.chunkCount(), lastChunk: stats.lastChunkMs.toFixed(1), maxChunk: stats.chunkMsMax.toFixed(1), fog: (stats.lastFogMs || 0).toFixed(1) };
    WR._demoInfo = info;
    // keep animating (banners, water, clouds) so screenshots capture the live look
    if (get('anim', '1') === '1') {
      let last = performance.now();
      const loop = (t) => { const dt = Math.min(0.1, (t - last) / 1000); last = t; try { WR.render(dt); drawDemoMinimap(); } catch (e) { console.error(e); return; } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    return 'gen ' + info.gen + 'ms, chunks ' + info.chunks + ' built in ' + info.build + 'ms (last ' + info.lastChunk + ', max ' + info.maxChunk + '), fog ' + info.fog + 'ms, frame ' + info.frame + 'ms @zoom ' + cam.zoom.toFixed(2);
  };

  // ---- demo-only minimap inset (verifies WR.renderMinimap/minimapToWorld visually; SPEC's real HUD minimap lives
  // in src/ui/hud.js — this is not drawn during normal gameplay, only from WR.demo's own loop).
  let demoMM = null;
  function drawDemoMinimap() {
    if (!ctx || !game) return;
    const w = 240, h = 160, pad = 10;
    if (!demoMM) demoMM = Art().canvas(w, h);
    try { WR.renderMinimap(demoMM.ctx, w, h); } catch (e) { AOW.warn('WR.demo: renderMinimap failed', e); return; }
    const x = viewW - w - pad, y = viewH - h - pad;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
    Art().rrect(ctx, x - 4, y - 4, w + 8, h + 8, 6);
    ctx.fillStyle = 'rgba(16,18,28,0.92)'; ctx.fill();
    ctx.restore();
    ctx.save();
    Art().rrect(ctx, x - 1, y - 1, w + 2, h + 2, 3); ctx.clip();
    ctx.drawImage(demoMM.cv, x, y);
    ctx.restore();
    Art().rrect(ctx, x - 2, y - 2, w + 4, h + 4, 4);
    ctx.strokeStyle = 'rgba(201,162,74,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
  }

  AOW.WorldRender = WR;
})(window.AOW = window.AOW || {});
