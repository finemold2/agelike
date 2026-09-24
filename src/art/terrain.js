// src/art/terrain.js — AOW.TerrainArt: painterly procedural hex terrain (bases, edges, rivers, roads, decor, water, fog)
//
// Public API (see docs/SPEC.md §6):
//   TerrainArt.drawHexBase(ctx, x, y, info)          ground fill (pointy-top hex centred at x,y; radius info.size||Hex.SIZE)
//   TerrainArt.drawHexEdges(ctx, x, y, info)         feathered transitions, coast sand + foam, cliff shadows
//   TerrainArt.drawRivers(ctx, x, y, info)           info.river bitmask (bit d = edge toward dir d)
//   TerrainArt.drawRoads(ctx, x, y, info)            info.road bitmask
//   TerrainArt.drawHexDecor(ctx, x, y, info, zoom)   trees, hills, peaks, ruins, crystals… (call after all bases, row order)
//   TerrainArt.drawWater(ctx, x, y, info, t, batch?) cheap animated shimmer (t seconds); with batch = TerrainArt.waterBatch()
//                                                    the strokes are bucketed and drawn by TerrainArt.flushWaterBatch(ctx, batch)
//   TerrainArt.drawFog(ctx, x, y, kind)              'unexplored' | 'explored' (one hex; prefer fillFog for regions)
//   TerrainArt.fillFog(ctx, x, y, w, h)              seamless unexplored parchment over a whole rect (world-aligned
//                                                    pattern, no hex clip) — the caller masks & feathers it
//   TerrainArt.FOG_VEIL                              flat colour of the explored-but-unseen wash
//   TerrainArt.drawChunk(ctx, getInfo, c0, c1, r0, r1, originX, originY, opts)
//   TerrainArt.demo(canvas)
// Additive helpers (documented here, not in SPEC):
//   TerrainArt.setOrigin(ox, oy)   world-space offset of the current canvas (drawChunk sets it) so ground textures
//                                  stay phase-aligned across chunks — no seams between same-terrain hexes.
//   TerrainArt.isWater(terrainId), TerrainArt.colors(terrainId) → {base, light, dark}
//   TerrainArt.decorItems(info, zoom) → [{key, x, y, params, scale}] (for callers that want to sort/cull themselves)
// info = { terrain, feature, height:0..1, seed:int, river:0..63, road:0..63, neighbors:[6 terrain ids|null],
//          coast:0..63, snow:0..1, owner:null|'#rrggbb', size:36, neighborHeights?:[6 numbers] }
(function (AOW) {
  'use strict';
  const TerrainArt = {};
  const Art = AOW.Art, Hex = AOW.Hex, M = AOW.M, Color = AOW.Color, Noise = AOW.Noise, Palette = AOW.Palette;
  const TAU = Math.PI * 2;
  const SQ3 = Math.sqrt(3);

  // ================================================================ palette
  // base / light / dark per terrain (from docs/research/art_direction.md §2.2 + AOW.Palette.biome)
  const COLORS = {
    grass:    { base: '#6e9b3e', light: '#9cc25a', dark: '#527f30' },
    forest:   { base: '#4f7a34', light: '#7fa84c', dark: '#3a5f2a' },
    hills:    { base: '#8a9a48', light: '#b3b962', dark: '#6b7a36' },
    mountain: { base: '#8a8680', light: '#b3aea4', dark: '#625e58' },
    desert:   { base: '#d9a85c', light: '#f0cb85', dark: '#bf8f4a' },
    snow:     { base: '#dde6ec', light: '#f5f8fa', dark: '#bccbd8' },
    swamp:    { base: '#556b3a', light: '#7c8c4a', dark: '#3f5330' },
    volcanic: { base: '#423a39', light: '#635551', dark: '#2b2424' },
    ocean:    { base: '#164a76', light: '#1f639a', dark: '#0f3557' },
    coast:    { base: '#3597c2', light: '#5cbcd8', dark: '#2a7ca6' },
    lake:     { base: '#2f7aa8', light: '#4aa0cc', dark: '#245f86' },
  };
  const WATER = { ocean: 1, coast: 1, lake: 1 };
  // who paints over whom at a border (higher spills into lower)
  const PRI = { mountain: 10, hills: 9, snow: 8, volcanic: 7, forest: 6, swamp: 5, desert: 4, grass: 3, lake: 2, coast: 1, ocean: 0 };
  const SAND = { desert: '#e2c27a', snow: '#dfe9ef', volcanic: '#5d5048', swamp: '#7a7a48', mountain: '#a49a86', hills: '#d4bd82', grass: '#dcc387', forest: '#cbb47a' };
  const INK = 'rgba(20,15,30,0.5)';

  TerrainArt.colors = t => COLORS[t] || COLORS.grass;
  TerrainArt.isWater = t => !!WATER[t];

  // ================================================================ world alignment for tiled textures
  const origin = { x: 0, y: 0 };
  TerrainArt.setOrigin = function (ox, oy) { origin.x = ox || 0; origin.y = oy || 0; };

  // ================================================================ terrain texture tiles (seamless, cached)
  const TILE = 96;
  const tiles = new Map();
  const patterns = new Map();
  function fbmTorus(x, y, seed, scale, oct, size) {
    // sample fbm on a torus so the tile wraps seamlessly (`size` defaults to the terrain TILE)
    const N = size || TILE;
    const a1 = x / N * TAU, a2 = y / N * TAU;
    const r = scale / TAU;
    return Noise.fbm2(Math.cos(a1) * r + Math.cos(a2) * r * 1.61, Math.sin(a1) * r + Math.sin(a2) * r * 1.27, seed, oct) * 0.5 + 0.5;
  }
  function stripe(x, y, kx, ky, n) { return Math.sin(TAU * (kx * x / TILE + ky * y / TILE) + n) * 0.5 + 0.5; }
  /** builds the seamless colour tile for a terrain */
  function tileFor(t) {
    let cv = tiles.get(t);
    if (cv) return cv;
    const c = TerrainArt.colors(t);
    const base = Color.parse(c.base), light = Color.parse(c.light), dark = Color.parse(c.dark);
    const seed = Art.hash('tile:' + t);
    const o = Art.canvas(TILE, TILE);
    const img = o.ctx.createImageData(TILE, TILE), d = img.data;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const coarse = fbmTorus(x, y, seed, 2.2, 2), fine = fbmTorus(x, y, seed + 7, 7, 3);
      let v; // 0 = dark, 0.5 = base, 1 = light
      switch (t) {
        case 'desert': { const rip = stripe(x, y, 5, 1.5, fine * 5); v = 0.35 + coarse * 0.35 + rip * 0.35 - fine * 0.15; break; }
        case 'snow': v = 0.55 + coarse * 0.3 + (fine - 0.5) * 0.15; break;
        case 'ocean': { const wv = stripe(x, y, 3, 2, coarse * 6); v = 0.25 + coarse * 0.35 + wv * 0.2 + (fine - 0.5) * 0.15; break; }
        case 'coast': { const wv = stripe(x, y, 4, 2, coarse * 6); v = 0.35 + coarse * 0.3 + wv * 0.25 + (fine - 0.5) * 0.2; break; }
        case 'lake': { const wv = stripe(x, y, 2, 3, coarse * 5); v = 0.35 + coarse * 0.3 + wv * 0.2 + (fine - 0.5) * 0.15; break; }
        case 'mountain': v = 0.3 + coarse * 0.35 + (fine - 0.5) * 0.7; break;
        case 'volcanic': v = 0.35 + coarse * 0.3 + (fine - 0.5) * 0.55; break;
        case 'swamp': v = 0.35 + coarse * 0.45 + (fine - 0.5) * 0.3; break;
        case 'hills': v = 0.35 + coarse * 0.45 + (fine - 0.5) * 0.3; break;
        case 'forest': v = 0.3 + coarse * 0.45 + (fine - 0.5) * 0.35; break;
        default: v = 0.35 + coarse * 0.45 + (fine - 0.5) * 0.35; // grass
      }
      v = M.clamp(v, 0, 1);
      const i = (y * TILE + x) * 4;
      const a = v < 0.5 ? dark : base, b = v < 0.5 ? base : light, k = v < 0.5 ? v * 2 : (v - 0.5) * 2;
      d[i] = a[0] + (b[0] - a[0]) * k; d[i + 1] = a[1] + (b[1] - a[1]) * k; d[i + 2] = a[2] + (b[2] - a[2]) * k; d[i + 3] = 255;
    }
    o.ctx.putImageData(img, 0, 0);
    cv = o.cv; tiles.set(t, cv);
    return cv;
  }
  const domMatrix = typeof DOMMatrix === 'function' ? new DOMMatrix() : null;
  /** world-aligned repeating pattern for a terrain */
  function patternFor(ctx, t) {
    let p = patterns.get(t);
    if (!p) { p = ctx.createPattern(tileFor(t), 'repeat'); patterns.set(t, p); }
    if (domMatrix && p.setTransform) {
      domMatrix.e = -M.mod(origin.x, TILE); domMatrix.f = -M.mod(origin.y, TILE);
      p.setTransform(domMatrix);
    }
    return p;
  }

  // ================================================================ geometry helpers
  function hexPath(ctx, x, y, s) { Art.hexPath(ctx, x, y, s); }
  function corner(x, y, s, i) { const a = Math.PI / 180 * (60 * i - 90); return [x + s * Math.cos(a), y + s * Math.sin(a)]; }
  function edgePts(x, y, s, d) { return [corner(x, y, s, (d + 1) % 6), corner(x, y, s, (d + 2) % 6)]; }
  function dirVec(d) { const a = Math.PI / 180 * 60 * d; return [Math.cos(a), Math.sin(a)]; }
  function edgeMid(x, y, s, d) { const v = dirVec(d), r = s * SQ3 / 2; return [x + v[0] * r, y + v[1] * r]; }
  /** is (px,py) (relative to centre) inside a pointy-top hex of radius s shrunk by margin m (0..1) */
  function insideHex(px, py, s, m) { const r = s * m; return Math.abs(px) <= r * SQ3 / 2 && Math.abs(py) <= r - Math.abs(px) / SQ3; }
  function rngFor(info, salt) { return Art.rng((info.seed | 0) * 31 + (salt || 0) * 7919); }
  function nb(info, d) { return info.neighbors ? info.neighbors[d] : null; }

  // ================================================================ base
  /** ground fill. slightly larger than the hex (size+1.5) so neighbours overlap without hairline gaps */
  TerrainArt.drawHexBase = function (ctx, x, y, info) {
    const s = info.size || Hex.SIZE, S = s + 1.5;
    const t = info.terrain || 'grass';
    const c = TerrainArt.colors(t);
    const h = info.height === undefined ? 0.4 : info.height;
    ctx.save();
    hexPath(ctx, x, y, S); ctx.clip();
    // flat ground tinted by elevation (higher = a touch lighter, lower = deeper)
    const tint = WATER[t] ? Color.mix(c.light, c.dark, M.clamp(0.75 - h * 1.2, 0, 1)) : Color.mix(c.dark, c.light, M.clamp(0.3 + h * 0.4, 0, 1));
    ctx.fillStyle = tint;
    ctx.fillRect(x - S, y - S, 2 * S, 2 * S);
    // seamless hand-painted texture (aligned to world so neighbours match phase)
    ctx.globalAlpha = WATER[t] ? 0.8 : 0.72;
    ctx.fillStyle = patternFor(ctx, t);
    ctx.fillRect(x - S, y - S, 2 * S, 2 * S);
    ctx.globalAlpha = 1;
    // per-hex soft mottling: feathered blobs kept fully inside the hex so the clip never leaves a hard edge
    const rng = rngFor(info, 1);
    const n = WATER[t] ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const a0 = rng.next() * TAU, rr = rng.next() * s * 0.38;
      const br = s * (0.28 + rng.next() * 0.2);
      const bx = x + Math.cos(a0) * rr, by = y + Math.sin(a0) * rr;
      const lightBlob = rng.next() < 0.5;
      const col = lightBlob ? c.light : c.dark;
      const a = (t === 'snow' ? (lightBlob ? 0.1 : 0.2) : 0.18) + rng.next() * 0.08;
      ctx.fillStyle = Art.rgrad(ctx, bx, by, 0, br, [[0, Color.alpha(col, a)], [1, Color.alpha(col, 0)]]);
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    // open ocean is uniformly deeper (no per-hex gradient — that reads as a cell grid)
    if (t === 'ocean') {
      let landBits = 0;
      for (let d = 0; d < 6; d++) { const nt = nb(info, d); if (nt && !WATER[nt]) landBits++; }
      if (!landBits) { ctx.fillStyle = 'rgba(8,30,60,0.16)'; ctx.fillRect(x - S, y - S, 2 * S, 2 * S); }
    }
    // rocky ground under mountains picks up snow next to snowfields
    if (t === 'mountain' && info.snow > 0) {
      ctx.globalAlpha = Math.min(0.85, info.snow * 0.8);
      ctx.fillStyle = patternFor(ctx, 'snow'); ctx.fillRect(x - S, y - S, 2 * S, 2 * S);
      ctx.globalAlpha = 1;
    }
    // owner tint: a faint wash of the domain colour
    if (info.owner) {
      ctx.fillStyle = Color.alpha(info.owner, 0.07);
      ctx.fillRect(x - S, y - S, 2 * S, 2 * S);
    }
    ctx.restore();
  };

  // ================================================================ edges
  /** organic blob band along edge d of the hex; k = outward offset scale, rad = radius scale (both × size) */
  function blobBand(ctx, x, y, s, d, rng, count, outward, spread, rad) {
    const [p, q] = edgePts(x, y, s, d);
    const v = dirVec(d);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count + (rng.next() - 0.5) * 0.5 / count;
      const ex = p[0] + (q[0] - p[0]) * t, ey = p[1] + (q[1] - p[1]) * t;
      const off = (outward + (rng.next() - 0.5) * spread) * s;
      const r = (rad * (0.7 + rng.next() * 0.6)) * s;
      ctx.moveTo(ex + v[0] * off + r, ey + v[1] * off);
      ctx.arc(ex + v[0] * off, ey + v[1] * off, r, 0, TAU);
    }
  }
  function fillPatternBand(ctx, x, y, s, d, rng, t, alpha, outward, spread, rad, count, snow) {
    const c = TerrainArt.colors(t);
    ctx.save();
    blobBand(ctx, x, y, s, d, rng, count, outward, spread, rad);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = c.base; ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = patternFor(ctx, t); ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
    if (snow) { ctx.globalAlpha = alpha * Math.min(0.85, snow * 0.8); ctx.fillStyle = patternFor(ctx, 'snow'); ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4); }
    ctx.restore();
  }
  /** snow-only feathered band (used to blend differing snow cover between neighbouring rock hexes) */
  function snowBand(ctx, x, y, s, d, rng, alpha, outward, spread, rad, count) {
    ctx.save();
    blobBand(ctx, x, y, s, d, rng, count, outward, spread, rad); ctx.clip();
    ctx.globalAlpha = alpha; ctx.fillStyle = patternFor(ctx, 'snow'); ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
    ctx.restore();
  }
  function neighborSnow(info, d) {
    if (info.neighborSnow && info.neighborSnow[d] !== undefined) return info.neighborSnow[d];
    const nt = nb(info, d);
    return nt === 'snow' ? 1 : (info.snow || 0);
  }
  function wavyEdgeLine(ctx, x, y, s, d, rng, offset, amp, segs) {
    const [p, q] = edgePts(x, y, s, d);
    const v = dirVec(d);
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const o = (offset + Math.sin(t * Math.PI * (2 + rng.next() * 0.001) + rng.next() * 0.3) * amp * (i === 0 || i === segs ? 0.3 : 1)) * s;
      const px = p[0] + (q[0] - p[0]) * t + v[0] * o, py = p[1] + (q[1] - p[1]) * t + v[1] * o;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  }

  TerrainArt.drawHexEdges = function (ctx, x, y, info) {
    const s = info.size || Hex.SIZE;
    const t = info.terrain || 'grass';
    const water = !!WATER[t];
    const feat = info.feature || 'none';
    const relief = t === 'mountain' || feat === 'mountain' || feat === 'peak' ? 2 : (t === 'hills' || feat === 'hills') ? 1 : 0;
    for (let d = 0; d < 6; d++) {
      const nt = nb(info, d);
      const nWater = nt ? !!WATER[nt] : !!(info.coast & (1 << d));
      const rng = rngFor(info, 10 + d);
      if (!water && nWater) {
        // ---- coastline: sand shelf (land side), wet shallows + foam (water side)
        const sand = SAND[t] || SAND.grass;
        ctx.save();
        blobBand(ctx, x, y, s, d, rng, 7, 0.02, 0.12, 0.13); ctx.clip();
        ctx.fillStyle = Color.alpha(sand, 0.85); ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
        ctx.fillStyle = Color.alpha(Color.shade(sand, -0.25), 0.25);
        // a darker damp line right at the waterline
        const [p, q] = edgePts(x, y, s, d); const v = dirVec(d);
        ctx.beginPath(); ctx.moveTo(p[0] + v[0] * 2, p[1] + v[1] * 2); ctx.lineTo(q[0] + v[0] * 2, q[1] + v[1] * 2);
        ctx.lineWidth = 3; ctx.strokeStyle = Color.alpha(Color.shade(sand, -0.3), 0.35); ctx.stroke();
        ctx.restore();
        // shallows glow into the water
        ctx.save();
        blobBand(ctx, x, y, s, d, rng, 6, 0.12, 0.1, 0.16); ctx.clip();
        ctx.fillStyle = 'rgba(140,220,225,0.32)'; ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
        ctx.restore();
        // foam lines
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        wavyEdgeLine(ctx, x, y, s, d, rng, 0.07, 0.025, 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.62)'; ctx.lineWidth = 1.6; ctx.stroke();
        wavyEdgeLine(ctx, x, y, s, d, rng, 0.16, 0.03, 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.1; ctx.stroke();
        ctx.restore();
        continue;
      }
      if (!nt) continue;
      if (nt === t) {
        // same rock, more snow here than there: let the snow drift over the border
        if (t === 'mountain') { const ds = (info.snow || 0) - neighborSnow(info, d); if (ds > 0.12) { snowBand(ctx, x, y, s, d, rng, Math.min(0.8, ds * 0.5), 0.14, 0.24, 0.2, 6); snowBand(ctx, x, y, s, d, rng, Math.min(0.85, ds * 0.8), 0.03, 0.14, 0.13, 8); } }
        continue;
      }
      const pMe = PRI[t] === undefined ? 3 : PRI[t], pN = PRI[nt] === undefined ? 3 : PRI[nt];
      if (water && nWater) {
        // coast ↔ ocean / lake: wide, very soft spill from the shallower one so no cell edge shows
        if (pMe > pN) {
          fillPatternBand(ctx, x, y, s, d, rng, t, 0.22, 0.22, 0.24, 0.24, 6);
          fillPatternBand(ctx, x, y, s, d, rng, t, 0.4, 0.1, 0.18, 0.18, 7);
          fillPatternBand(ctx, x, y, s, d, rng, t, 0.7, 0.02, 0.12, 0.13, 8);
        }
        continue;
      }
      if (pMe > pN) {
        // land ↔ land: this hex spills irregularly over the neighbour, in two feathered layers
        const sn = t === 'mountain' ? info.snow || 0 : 0;
        fillPatternBand(ctx, x, y, s, d, rng, t, 0.42, 0.12, 0.22, 0.17, 6, sn);
        fillPatternBand(ctx, x, y, s, d, rng, t, 0.85, 0.03, 0.14, 0.12, 8, sn);
      }
      // cliff shading: relief casts a soft shadow onto lower ground toward the lower-right (light from top-left)
      let drop = 0;
      if (info.neighborHeights && info.neighborHeights[d] !== undefined && info.height !== undefined) drop = info.height - info.neighborHeights[d];
      const nRelief = nt === 'mountain' ? 2 : nt === 'hills' ? 1 : 0;
      const shadow = Math.max(drop > 0.25 ? drop : 0, relief > nRelief ? (relief - nRelief) * 0.3 : 0);
      if (shadow > 0 && (d === 0 || d === 1 || d === 2)) {
        ctx.save();
        blobBand(ctx, x, y, s, d, rng, 6, 0.1, 0.1, 0.17); ctx.clip();
        ctx.fillStyle = 'rgba(20,25,50,' + (0.22 * Math.min(1, shadow * 1.6)).toFixed(3) + ')';
        ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
        ctx.restore();
      }
    }
  };

  // ================================================================ rivers & roads
  function bitsOf(mask) { const out = []; for (let d = 0; d < 6; d++) if (mask & (1 << d)) out.push(d); return out; }
  /** traces smooth path(s) for a bitmask through the hex; returns number of segments traced. one path per call. */
  function tracePaths(ctx, x, y, s, bits, rng, wobble) {
    ctx.beginPath();
    if (bits.length === 2) {
      const a = edgeMid(x, y, s, bits[0]), b = edgeMid(x, y, s, bits[1]);
      const va = dirVec(bits[0]), vb = dirVec(bits[1]);
      const k = 0.5 * s, w = wobble * s;
      const cx = x + (rng.next() - 0.5) * w, cy = y + (rng.next() - 0.5) * w;
      ctx.moveTo(a[0], a[1]);
      ctx.bezierCurveTo(a[0] - va[0] * k, a[1] - va[1] * k, cx + (b[0] - vb[0] * k - cx) * 0.4, cy + (b[1] - vb[1] * k - cy) * 0.4, b[0], b[1]);
      // second half so the curve flows through the (wobbled) centre smoothly: draw as one bezier a→b already; fine.
      return 1;
    }
    for (const d of bits) {
      const a = edgeMid(x, y, s, d), v = dirVec(d), k = 0.45 * s;
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(a[0] - v[0] * k + (rng.next() - 0.5) * wobble * s, a[1] - v[1] * k + (rng.next() - 0.5) * wobble * s, x, y);
    }
    return bits.length;
  }

  TerrainArt.drawRivers = function (ctx, x, y, info) {
    const mask = info.river | 0;
    if (!mask) return;
    const s = info.size || Hex.SIZE;
    const t = info.terrain || 'grass';
    if (WATER[t]) return; // rivers vanish into open water (the coast foam sells the mouth)
    const bits = bitsOf(mask);
    const w = s * 0.17;
    const frozen = t === 'snow' && (info.snow === undefined || info.snow > 0.6);
    const lava = t === 'volcanic';
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const stroke = (col, width) => { tracePaths(ctx, x, y, s, bits, rngFor(info, 20), 0.18); ctx.strokeStyle = col; ctx.lineWidth = width; ctx.stroke(); };
    if (lava) {
      stroke('rgba(30,10,5,0.75)', w + 4);
      stroke('#c2401c', w + 1);
      stroke('#ff6a1f', w * 0.7);
      stroke('rgba(255,215,120,0.85)', w * 0.25);
    } else {
      stroke(frozen ? 'rgba(120,150,175,0.45)' : 'rgba(35,60,45,0.42)', w + 3.5);   // banks
      stroke(frozen ? '#a9cfe6' : '#3f8fc4', w + 0.5);                                 // water
      stroke(frozen ? 'rgba(235,248,255,0.8)' : 'rgba(150,215,245,0.85)', w * 0.45);   // lit centre
      stroke('rgba(255,255,255,0.35)', w * 0.15);
    }
    if (bits.length === 1) {
      // spring / source pool at the centre
      ctx.fillStyle = lava ? '#ff6a1f' : frozen ? '#a9cfe6' : '#3f8fc4';
      ctx.beginPath(); ctx.ellipse(x, y, w * 1.4, w * 1.0, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = lava ? 'rgba(255,215,120,0.6)' : 'rgba(200,240,255,0.6)';
      ctx.beginPath(); ctx.ellipse(x - w * 0.3, y - w * 0.2, w * 0.6, w * 0.35, -0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  TerrainArt.drawRoads = function (ctx, x, y, info) {
    const mask = info.road | 0;
    if (!mask) return;
    const s = info.size || Hex.SIZE;
    const bits = bitsOf(mask);
    const w = s * 0.14;
    const cobble = !!info.owner;
    const t = info.terrain || 'grass';
    const water = !!WATER[t];
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const stroke = (col, width, dash) => {
      tracePaths(ctx, x, y, s, bits, rngFor(info, 30), 0.12);
      ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.lineWidth = width; ctx.stroke();
    };
    if (water) {
      // bridge / causeway: timber planks
      stroke('rgba(30,20,10,0.6)', w + 3);
      stroke('#8a6a3c', w + 1);
      stroke('rgba(60,40,20,0.55)', w + 1, [1.5, 3]);
    } else if (cobble) {
      stroke('rgba(45,35,25,0.55)', w + 2.5);
      stroke('#c9b99a', w + 0.5);
      stroke('rgba(90,75,55,0.45)', w * 0.9, [2, 2.5]);
      stroke('rgba(255,250,235,0.35)', w * 0.35, [1.5, 4]);
    } else {
      stroke('rgba(60,40,20,0.35)', w + 2);
      stroke('#a98a5b', w + 0.3);
      stroke('rgba(120,95,60,0.55)', w * 0.9, [3, 2]);
      stroke('rgba(60,40,20,0.45)', w * 0.18, [4, 3]); // wheel rut
    }
    ctx.restore();
  };

  // ================================================================ water shimmer
  // Batched shimmer: pass `batch` (from TerrainArt.waterBatch()) to drawWater and the ripples/foam of every hex
  // are appended to a few Path2D buckets keyed by (quantised) alpha instead of being stroked one by one;
  // TerrainArt.flushWaterBatch(ctx, batch) then strokes each bucket once — a screen of ocean goes from ~700
  // tiny strokes to ~30, which is what made the 15 Hz water redraw cost 50–80 ms under software raster.
  const WATER_Q = 48;                               // alpha quantisation steps per 1.0 (≈0.02)
  TerrainArt.waterBatch = function () { return { ripple: new Map(), foam: new Map() }; };
  function waterBucket(map, alpha) {
    const q = Math.round(alpha * WATER_Q);
    if (q <= 0) return null;
    let p = map.get(q);
    if (!p) { p = new Path2D(); map.set(q, p); }
    return p;
  }
  function pathSink(p) { return { beginPath() {}, moveTo(x, y) { p.moveTo(x, y); }, lineTo(x, y) { p.lineTo(x, y); } }; }
  TerrainArt.flushWaterBatch = function (ctx, batch, keep) {   // keep: stroke but leave the buckets for reuse
    if (!batch) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.9;
    for (const [q, p] of batch.ripple) { ctx.strokeStyle = 'rgba(210,240,255,' + (q / WATER_Q).toFixed(3) + ')'; ctx.stroke(p); }
    ctx.lineWidth = 1.4;
    for (const [q, p] of batch.foam) { ctx.strokeStyle = 'rgba(255,255,255,' + (q / WATER_Q).toFixed(3) + ')'; ctx.stroke(p); }
    ctx.restore();
    if (!keep) { batch.ripple.clear(); batch.foam.clear(); }
  };
  TerrainArt.drawWater = function (ctx, x, y, info, t, batch) {
    const terr = info.terrain || 'ocean';
    if (!WATER[terr]) return;
    const s = info.size || Hex.SIZE;
    const rng = rngFor(info, 40);
    const time = t || 0;
    if (!batch) { ctx.save(); ctx.lineCap = 'round'; }
    const n = terr === 'ocean' ? 4 : 3;
    for (let i = 0; i < n; i++) {
      let px, py;
      do { px = (rng.next() - 0.5) * s * 1.7; py = (rng.next() - 0.5) * s * 1.7; } while (!insideHex(px, py, s, 0.88));
      const ph = rng.next() * TAU, len = s * (0.18 + rng.next() * 0.22), spd = 0.8 + rng.next() * 0.6;
      const a = 0.5 + 0.5 * Math.sin(time * spd + ph);
      if (a < 0.08) continue;
      const drift = Math.sin(time * 0.5 + ph) * 2;
      if (batch) {
        const p = waterBucket(batch.ripple, a * 0.34);
        if (p) { p.moveTo(x + px - len / 2 + drift, y + py); p.quadraticCurveTo(x + px + drift, y + py - 1.6, x + px + len / 2 + drift, y + py); }
        continue;
      }
      ctx.strokeStyle = 'rgba(210,240,255,' + (a * 0.34).toFixed(3) + ')';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + px - len / 2 + drift, y + py);
      ctx.quadraticCurveTo(x + px + drift, y + py - 1.6, x + px + len / 2 + drift, y + py);
      ctx.stroke();
    }
    // foam pulses along coast edges
    for (let d = 0; d < 6; d++) {
      const nt = nb(info, d);
      const land = nt ? !WATER[nt] : !!(info.coast & (1 << d));
      if (!land) continue;
      const ph = rng.next() * TAU;
      const a = 0.5 + 0.5 * Math.sin(time * 1.1 + ph);
      if (a < 0.15) continue;
      if (batch) {
        const p = waterBucket(batch.foam, a * 0.3);
        if (p) wavyEdgeLine(pathSink(p), x, y, s, d, rngFor(info, 50 + d), -0.14 - 0.05 * a, 0.03, 8);
        continue;
      }
      ctx.strokeStyle = 'rgba(255,255,255,' + (a * 0.3).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      wavyEdgeLine(ctx, x, y, s, d, rngFor(info, 50 + d), -0.14 - 0.05 * a, 0.03, 8);
      ctx.stroke();
    }
    if (!batch) ctx.restore();
  };

  // ================================================================ fog
  // The unexplored map is ONE seamless painted-parchment texture (a single wrapping noise tile used as a
  // repeating pattern, phase-locked to world coordinates through setOrigin) — never a per-hex sprite. Callers
  // paint it over a whole region and feather its edge themselves (see world_render's buildFog), so the cloud
  // bank has no hex silhouettes and no tiled bevel.
  const FOG_TILE = 256;
  let fogTile = null, fogPattern = null;
  function fogTileCanvas() {
    if (fogTile) return fogTile;
    const o = Art.canvas(FOG_TILE, FOG_TILE);
    const img = o.ctx.createImageData(FOG_TILE, FOG_TILE), d = img.data;
    const deep = Color.parse('#a9a291'), mid = Color.parse('#c7bfab'), pale = Color.parse('#e0d7c0');
    for (let y = 0; y < FOG_TILE; y++) for (let x = 0; x < FOG_TILE; x++) {
      // two transposed fbm samples cancel the diagonal bias of the torus mapping → no visible streaks
      const cloud = (fbmTorus(x, y, 909, 5.5, 5, FOG_TILE) + fbmTorus(y, x, 313, 4.3, 5, FOG_TILE)) * 0.5;
      const grain = fbmTorus(x, y, 31, 17, 2, FOG_TILE);       // paper grain
      let k = M.clamp(0.5 + (cloud - 0.5) * 1.5 + (grain - 0.5) * 0.3, 0, 1);
      k = k * k * (3 - 2 * k);                                 // smoothstep: low contrast, no hard veins
      const i = (y * FOG_TILE + x) * 4;
      const p = k < 0.5 ? deep : mid, q = k < 0.5 ? mid : pale, kk = k < 0.5 ? k * 2 : (k - 0.5) * 2;
      d[i] = p[0] + (q[0] - p[0]) * kk; d[i + 1] = p[1] + (q[1] - p[1]) * kk; d[i + 2] = p[2] + (q[2] - p[2]) * kk; d[i + 3] = 255;
    }
    o.ctx.putImageData(img, 0, 0);
    fogTile = o.cv;
    return fogTile;
  }
  function fogPatternFor(ctx) {
    fogTileCanvas();
    if (!fogPattern) fogPattern = ctx.createPattern(fogTile, 'repeat');
    if (domMatrix && fogPattern.setTransform) {
      domMatrix.e = -M.mod(origin.x, FOG_TILE); domMatrix.f = -M.mod(origin.y, FOG_TILE);
      fogPattern.setTransform(domMatrix);
    }
    return fogPattern;
  }
  /** the flat wash used for explored-but-currently-unseen ground (callers feather it themselves) */
  TerrainArt.FOG_VEIL = 'rgb(118,122,138)';
  /**
   * Fill a rectangle of the CURRENT user space with the seamless unexplored-fog texture. The pattern is
   * phase-locked to world coordinates (TerrainArt.setOrigin), so neighbouring chunks line up exactly.
   * No clipping and no vignette: mask/feather the region you paint.
   */
  TerrainArt.fillFog = function (ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = fogPatternFor(ctx);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };
  TerrainArt.drawFog = function (ctx, x, y, kind) {
    const S = Hex.SIZE + 1.5;
    ctx.save();
    hexPath(ctx, x, y, S); ctx.clip();
    if (kind === 'unexplored') {
      TerrainArt.fillFog(ctx, x - S, y - S, 2 * S, 2 * S);
    } else {
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(128,128,128,0.55)';
      ctx.fillRect(x - S, y - S, 2 * S, 2 * S);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(18,22,38,0.36)';
      ctx.fillRect(x - S, y - S, 2 * S, 2 * S);
    }
    ctx.restore();
  };

  // ================================================================ decor sprites
  // All sprites are rendered at K× resolution and drawn at 1/K so they stay crisp when chunks are zoomed in.
  const K = 2;
  const TREE = Palette.tree, ROCK = Palette.rock;
  function sp(name, w, h, fn) {
    Art.sprite('terr:' + name, w * K, h * K, (ctx, W, H, p) => { ctx.scale(K, K); fn(ctx, w, h, p || {}, Art.rng(Art.hash(name + ':' + (p && p.v || 0)))); }, { anchor: { x: 0.5, y: 1 } });
  }
  function draw(ctx, name, x, y, p, scale, alpha) { Art.draw(ctx, 'terr:' + name, x, y, p, { scale: (scale || 1) / K, alpha: alpha === undefined ? 1 : alpha }); }
  function ink(ctx, w) { ctx.strokeStyle = INK; ctx.lineWidth = w || 1.1; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  function jag(rng, n, amp) { const a = []; for (let i = 0; i < n; i++) a.push((rng.next() - 0.5) * amp); return a; }

  // ---- broadleaf tree: cluster of shaded round lobes over a short trunk
  sp('oak', 24, 28, (ctx, w, h, p, rng) => {
    const leaf = p.leaf || TREE.leaf, light = p.light || TREE.leafLight, dark = p.dark || TREE.leafDark, trunk = p.trunk || TREE.trunk;
    const cx = w / 2, top = 11 + rng.next() * 2;
    Art.shadow(ctx, cx + 1, h - 1.5, 15, 5, 0.32);
    // trunk
    ctx.beginPath(); ctx.moveTo(cx - 1.6, h - 2); ctx.lineTo(cx + 1.6, h - 2); ctx.lineTo(cx + 1.1, top + 2); ctx.lineTo(cx - 1.1, top + 2); ctx.closePath();
    ctx.fillStyle = trunk; ctx.fill(); ink(ctx, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx + 0.3, top + 3, 1.2, h - top - 5);
    // lobes (bottom → top so upper lobes overlap)
    const lobes = [];
    const n = 4 + rng.int(0, 2);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * TAU + rng.next() * 0.6, rr = 3.2 + rng.next() * 2.4;
      lobes.push({ x: cx + Math.cos(a) * 4.2 + (rng.next() - 0.5), y: top + Math.sin(a) * 3.2 + (rng.next() - 0.5), r: 4.2 + rng.next() * 2 });
    }
    lobes.push({ x: cx, y: top - 0.5, r: 6 + rng.next() * 1.2 });
    lobes.sort((a, b) => (b.y + b.r) - (a.y + a.r));
    // silhouette ink
    ctx.beginPath(); for (const l of lobes) { ctx.moveTo(l.x + l.r, l.y); ctx.arc(l.x, l.y, l.r, 0, TAU); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = dark; ctx.fill();
    for (const l of lobes) {
      ctx.fillStyle = Art.rgrad(ctx, l.x - l.r * 0.4, l.y - l.r * 0.45, 0, l.r * 1.25, [[0, light], [0.45, leaf], [1, dark]]);
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill();
    }
    // under-canopy shade and top highlight dabs
    ctx.fillStyle = 'rgba(10,20,30,0.28)';
    ctx.beginPath(); ctx.ellipse(cx + 1, top + 5.5, 7, 2.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = Color.alpha(light, 0.75);
    for (let i = 0; i < 3; i++) { const l = lobes[lobes.length - 1 - (i % 2)]; ctx.beginPath(); ctx.ellipse(l.x - l.r * 0.35 + rng.next() * 2, l.y - l.r * 0.45 + rng.next() * 1.5, 1.6, 0.9, -0.6, 0, TAU); ctx.fill(); }
  });

  // ---- conifer: tiered jagged triangles, lit left, optional snow caps
  sp('pine', 20, 32, (ctx, w, h, p, rng) => {
    const pine = p.pine || TREE.pine, light = p.light || TREE.pineLight, dark = Color.shade(pine, -0.35);
    const snow = p.snow || 0;
    const cx = w / 2, tiers = 3 + (rng.next() < 0.5 ? 1 : 0);
    Art.shadow(ctx, cx + 1, h - 1.5, 12, 4, 0.3);
    ctx.fillStyle = TREE.trunk; ctx.fillRect(cx - 1.2, h - 8, 2.4, 7); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(cx + 0.2, h - 8, 1, 7);
    const tierShapes = [];
    for (let i = tiers - 1; i >= 0; i--) {
      const yTop = 2 + i * (h - 12) / tiers, yBot = yTop + (h - 10) / tiers + 4, half = 3.5 + (i + 1) * 2.2;
      const j = jag(rng, 5, 2.2);
      const pts = [[cx, yTop], [cx + half * 0.55, yBot - 4 + j[0]], [cx + half * 0.8, yBot - 2 + j[1]], [cx + half, yBot], [cx + half * 0.45, yBot - 1.5 + j[2]], [cx, yBot + 1], [cx - half * 0.45, yBot - 1.5 + j[3]], [cx - half, yBot], [cx - half * 0.8, yBot - 2 + j[4]], [cx - half * 0.55, yBot - 4 + j[0]]];
      tierShapes.push({ pts, yTop, yBot, half });
      Art.poly(ctx, pts); ctx.fillStyle = dark; ctx.fill(); ink(ctx, 1.4);
      ctx.save(); Art.poly(ctx, pts); ctx.clip();
      ctx.fillStyle = Art.grad(ctx, cx - half, yTop, cx + half, yBot, [[0, light], [0.45, pine], [1, dark]]); ctx.fillRect(0, 0, w, h);
      if (snow > 0) {
        ctx.fillStyle = 'rgba(240,247,252,' + (0.9 * snow).toFixed(2) + ')';
        ctx.beginPath(); ctx.moveTo(cx, yTop - 1); ctx.lineTo(cx + half * 0.9, yBot - 1.5); ctx.lineTo(cx + half * 0.5, yBot - 3 - snow * 2); ctx.lineTo(cx, yTop + 2.5 + (1 - snow) * 3); ctx.lineTo(cx - half * 0.5, yBot - 3 - snow * 2); ctx.lineTo(cx - half * 0.9, yBot - 1.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(180,205,225,' + (0.5 * snow).toFixed(2) + ')';
        ctx.beginPath(); ctx.moveTo(cx, yTop + 1); ctx.lineTo(cx + half * 0.9, yBot - 1.5); ctx.lineTo(cx + half * 0.45, yBot - 3); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  });

  // ---- palm: curved trunk with a crown of arched fronds
  sp('palm', 26, 32, (ctx, w, h, p, rng) => {
    const cx = w / 2, lean = (rng.next() - 0.5) * 8;
    Art.shadow(ctx, cx + 1, h - 1.5, 14, 4, 0.3);
    const tx = cx + lean, ty = 8;
    ctx.beginPath(); ctx.moveTo(cx, h - 2); ctx.quadraticCurveTo(cx + lean * 0.3, h * 0.5, tx, ty);
    ctx.strokeStyle = INK; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,160,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.setLineDash([1.2, 2.2]); ctx.strokeStyle = 'rgba(40,25,10,0.45)'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.setLineDash([]);
    const fronds = 6 + rng.int(0, 2);
    for (let i = 0; i < fronds; i++) {
      const a = -Math.PI * 0.95 + (i / (fronds - 1)) * Math.PI * 0.9 + (rng.next() - 0.5) * 0.3;
      const len = 9 + rng.next() * 4;
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.6 + len * 0.55;
      const mx = tx + Math.cos(a) * len * 0.6, my = ty + Math.sin(a) * len * 0.6 - 3;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.stroke();
      ctx.strokeStyle = Math.cos(a) < 0 ? '#7fae4c' : '#4f8a3e'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(200,240,150,0.5)'; ctx.lineWidth = 0.7; ctx.stroke();
    }
    ctx.fillStyle = '#6a4a2a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(tx + (i - 1) * 1.6, ty + 1.5, 1.1, 0, TAU); ctx.fill(); }
  });

  // ---- dead / gnarled tree
  sp('dead', 20, 28, (ctx, w, h, p, rng) => {
    const col = p.col || '#4a3a30', cx = w / 2;
    Art.shadow(ctx, cx + 1, h - 1.5, 10, 3.5, 0.28);
    const branch = (x, y, a, len, wd, depth) => {
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * len * 0.5, y + Math.sin(a + 0.4) * len * 0.5, ex, ey);
      ctx.strokeStyle = INK; ctx.lineWidth = wd + 1.6; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.stroke();
      if (depth > 0) {
        branch(ex, ey, a - 0.5 - rng.next() * 0.5, len * 0.62, wd * 0.6, depth - 1);
        branch(ex, ey, a + 0.4 + rng.next() * 0.5, len * 0.58, wd * 0.6, depth - 1);
      }
    };
    branch(cx, h - 2, -Math.PI / 2 + (rng.next() - 0.5) * 0.3, 10, 3, 2);
    ctx.strokeStyle = 'rgba(255,230,200,0.25)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(cx - 1, h - 3); ctx.lineTo(cx - 0.6, h - 11); ctx.stroke();
  });

  // ---- swamp cypress: narrow dark canopy with hanging moss, flared trunk
  sp('cypress', 18, 34, (ctx, w, h, p, rng) => {
    const cx = w / 2;
    Art.shadow(ctx, cx + 1, h - 1.5, 12, 4, 0.3);
    ctx.beginPath(); ctx.moveTo(cx - 3.2, h - 1.5); ctx.lineTo(cx + 3.2, h - 1.5); ctx.lineTo(cx + 1.2, h - 12); ctx.lineTo(cx - 1.2, h - 12); ctx.closePath();
    ctx.fillStyle = '#4b3a2c'; ctx.fill(); ink(ctx, 1);
    const cy = 14, rx = 5.5 + rng.next() * 1.5, ry = 12;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = Art.grad(ctx, cx - rx, cy - ry, cx + rx, cy + ry, [[0, '#5f8a52'], [0.5, '#3b5a34'], [1, '#22361f']]); ctx.fill();
    ctx.strokeStyle = 'rgba(150,190,110,0.55)'; ctx.lineWidth = 0.9;
    for (let i = 0; i < 5; i++) { const x = cx - rx + 2 + rng.next() * (rx * 2 - 4); ctx.beginPath(); ctx.moveTo(x, cy + 2 + rng.next() * 4); ctx.lineTo(x + (rng.next() - 0.5), cy + ry + 2 + rng.next() * 4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(200,230,160,0.4)'; ctx.beginPath(); ctx.ellipse(cx - 2, cy - 6, 1.6, 3, -0.3, 0, TAU); ctx.fill();
  });

  // ---- rolling hill
  sp('hill', 38, 18, (ctx, w, h, p, rng) => {
    const base = p.base || COLORS.hills.base, light = p.light || COLORS.hills.light, dark = p.dark || COLORS.hills.dark;
    const y0 = h - 1, top = 2 + rng.next() * 2, wl = 2 + rng.next() * 4, wr = w - 2 - rng.next() * 4, px = w * (0.38 + rng.next() * 0.24);
    Art.shadow(ctx, w / 2 + 3, y0, w * 0.9, 6, 0.3);
    ctx.beginPath(); ctx.moveTo(wl, y0); ctx.bezierCurveTo(wl + 4, top + 4, px - 6, top, px, top); ctx.bezierCurveTo(px + 8, top, wr - 6, top + 6, wr, y0); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, wl, top, wr, y0, [[0, light], [0.45, base], [1, Color.shade(dark, -0.2)]]); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = Art.rgrad(ctx, px - 6, top + 2, 0, w * 0.5, [[0, Color.alpha(light, 0.6)], [1, Color.alpha(light, 0)]]); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,30,50,0.3)'; ctx.beginPath(); ctx.ellipse(wr - 6, y0 + 2, w * 0.38, 6, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(20,30,50,0.18)'; ctx.beginPath(); ctx.ellipse(w / 2, y0 + 3, w * 0.5, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = Color.alpha(light, 0.45); ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) { const yy = top + 4 + i * 3.2; ctx.beginPath(); ctx.moveTo(px - 8 - i * 2, yy + 1); ctx.quadraticCurveTo(px - 2, yy - 1.5, px + 5 + i, yy + 0.5); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(20,15,30,0.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wl, y0); ctx.bezierCurveTo(wl + 4, top + 4, px - 6, top, px, top); ctx.bezierCurveTo(px + 8, top, wr - 6, top + 6, wr, y0); ctx.stroke();
  });

  // ---- craggy mountain (params: v, snow 0..1, rock colours)
  function mountainShape(ctx, w, h, p, rng, sharp) {
    const light = p.light || ROCK.light, base = p.base || ROCK.base, dark = p.dark || ROCK.dark;
    const snow = p.snow || 0;
    const y0 = h - 1, top = 2;
    const px = w * (0.42 + rng.next() * 0.16);
    const sx = px + (rng.next() < 0.5 ? -1 : 1) * w * (0.2 + rng.next() * 0.1), sy = top + h * (0.25 + rng.next() * 0.15);
    const left = [], right = [];
    // left flank from base to peak, right flank from peak to base, with a shoulder peak
    const lx0 = 1 + rng.next() * 3, rx0 = w - 1 - rng.next() * 3;
    const flank = (x0, y0_, x1, y1, n, out) => { for (let i = 1; i < n; i++) { const t = i / n; out.push([x0 + (x1 - x0) * t + (rng.next() - 0.5) * 3, y0_ + (y1 - y0_) * (sharp ? t * t * 0.7 + t * 0.3 : t) + (rng.next() - 0.5) * 3]); } };
    const pts = [[lx0, y0]];
    if (sx < px) { flank(lx0, y0, sx, sy, 3, pts); pts.push([sx, sy]); flank(sx, sy, px, top, 3, pts); } else flank(lx0, y0, px, top, 5, pts);
    pts.push([px, top]);
    if (sx > px) { flank(px, top, sx, sy, 3, pts); pts.push([sx, sy]); flank(sx, sy, rx0, y0, 3, pts); } else flank(px, top, rx0, y0, 5, pts);
    pts.push([rx0, y0]);
    Art.shadow(ctx, w / 2 + 3, y0, w * 1.05, 8, 0.35);
    Art.poly(ctx, pts); ctx.fillStyle = base; ctx.fill();
    ctx.save(); Art.poly(ctx, pts); ctx.clip();
    // lit left face / shadowed right face split along the ridge
    ctx.fillStyle = Art.grad(ctx, 0, top, w, y0, [[0, light], [0.5, base], [1, dark]]); ctx.fillRect(0, 0, w, h);
    ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px + 4 + rng.next() * 4, y0 * 0.55); ctx.lineTo(px + 2, y0); ctx.lineTo(w, y0); ctx.lineTo(w, 0); ctx.closePath();
    ctx.fillStyle = 'rgba(25,25,45,0.28)'; ctx.fill();
    // facet lines
    ctx.strokeStyle = 'rgba(30,25,40,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const sx2 = px + (rng.next() - 0.5) * 6, ex = lx0 + rng.next() * (w - 4); ctx.beginPath(); ctx.moveTo(sx2, top + 3 + rng.next() * 6); ctx.lineTo((sx2 + ex) / 2 + (rng.next() - 0.5) * 4, (top + y0) / 2 + (rng.next() - 0.5) * 6); ctx.lineTo(ex, y0 - rng.next() * 3); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(px, top + 1); ctx.lineTo(px - 5, top + 9); ctx.lineTo(px - 9, top + 18); ctx.stroke();
    // snow cap
    if (snow > 0.05) {
      const capH = h * (0.18 + 0.32 * snow);
      ctx.beginPath(); ctx.moveTo(px, top - 2);
      const n = 6; for (let i = 0; i <= n; i++) { const t = i / n; ctx.lineTo(px - 14 + t * 28, top + capH * (0.5 + 0.5 * Math.sin(t * Math.PI * 3 + rng.next())) ); }
      ctx.closePath();
      ctx.fillStyle = 'rgba(245,249,252,0.95)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(px, top - 2); ctx.lineTo(px + 8, top + capH * 0.8); ctx.lineTo(px + 14, top + capH * 0.5); ctx.closePath();
      ctx.fillStyle = 'rgba(170,195,220,0.55)'; ctx.fill();
      if (sx !== px && snow > 0.5) { ctx.beginPath(); ctx.moveTo(sx, sy - 1); ctx.lineTo(sx + 5, sy + 5); ctx.lineTo(sx, sy + 3.5); ctx.lineTo(sx - 5, sy + 5); ctx.closePath(); ctx.fillStyle = 'rgba(245,249,252,0.9)'; ctx.fill(); }
    }
    ctx.restore();
    Art.poly(ctx, pts); ink(ctx, 1.3);
  }
  sp('mountain', 44, 38, (ctx, w, h, p, rng) => mountainShape(ctx, w, h, p, rng, false));
  sp('peak', 44, 50, (ctx, w, h, p, rng) => mountainShape(ctx, w, h, Object.assign({ snow: 1 }, p, { snow: Math.max(0.7, p.snow || 0) }), rng, true));

  // ---- boulder
  sp('rock', 16, 12, (ctx, w, h, p, rng) => {
    const base = p.base || ROCK.base, light = p.light || ROCK.light, dark = p.dark || ROCK.dark;
    const pts = []; const n = 6 + rng.int(0, 2);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pts.push([w / 2 + Math.cos(a) * (6 + rng.next() * 1.5), h / 2 + 1 + Math.sin(a) * (3.6 + rng.next() * 1.2)]); }
    Art.shadow(ctx, w / 2 + 1, h - 1, 14, 4, 0.3);
    Art.poly(ctx, pts); ctx.fillStyle = Art.grad(ctx, 2, 0, w - 2, h, [[0, light], [0.5, base], [1, dark]]); ctx.fill(); ink(ctx, 1);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(w / 2 - 1, h / 2 - 1); ctx.lineTo(pts[Math.floor(n / 2)][0], pts[Math.floor(n / 2)][1]); ctx.strokeStyle = 'rgba(30,25,40,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(w / 2 - 2.5, h / 2 - 1.5, 2, 1, -0.5, 0, TAU); ctx.fill();
  });

  // ---- dune crescent
  sp('dune', 44, 16, (ctx, w, h, p, rng) => {
    const light = '#f3d493', base = '#dcae62', dark = '#b98a48';
    const y0 = h - 2, top = 3 + rng.next() * 2, px = w * (0.35 + rng.next() * 0.3);
    ctx.beginPath(); ctx.moveTo(2, y0); ctx.quadraticCurveTo(px - 8, top, px, top); ctx.quadraticCurveTo(px + 10, top + 4, w - 2, y0); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, 0, top, w, y0, [[0, light], [0.45, base], [1, dark]]); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.beginPath(); ctx.moveTo(px, top); ctx.quadraticCurveTo(px + 10, top + 4, w - 2, y0); ctx.lineTo(px + 2, y0); ctx.closePath();
    ctx.fillStyle = 'rgba(120,70,30,0.22)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,0.45)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) { const yy = top + 4 + i * 2.6; ctx.beginPath(); ctx.moveTo(6 + i * 3, yy + 1); ctx.quadraticCurveTo(px - 4, yy - 1.2, px - 1, yy + 1.5 + i); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,70,30,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 8, top + 2); ctx.quadraticCurveTo(px, top - 0.5, px + 10, top + 4); ctx.stroke();
  });

  // ---- crystal cluster (glowing violet by default)
  sp('crystal', 26, 30, (ctx, w, h, p, rng) => {
    const col = p.col || '#9b5cff', light = p.light || '#e2c8ff', dark = p.dark || '#4a2480';
    const cx = w / 2, y0 = h - 3;
    ctx.fillStyle = Art.rgrad(ctx, cx, y0, 0, 13, [[0, Color.alpha(col, 0.5)], [1, Color.alpha(col, 0)]]); ctx.fillRect(0, 0, w, h);
    const n = 3 + rng.int(0, 2);
    const shards = [];
    for (let i = 0; i < n; i++) shards.push({ x: cx + (i - (n - 1) / 2) * 5 + (rng.next() - 0.5) * 2, ht: 10 + rng.next() * 14, wd: 2.6 + rng.next() * 1.8, tilt: (i - (n - 1) / 2) * 0.22 + (rng.next() - 0.5) * 0.2 });
    shards.sort((a, b) => a.ht - b.ht);
    for (const s of shards) {
      ctx.save(); ctx.translate(s.x, y0); ctx.rotate(s.tilt);
      const pts = [[-s.wd, 0], [-s.wd * 1.05, -s.ht * 0.55], [-s.wd * 0.35, -s.ht], [s.wd * 0.5, -s.ht * 0.85], [s.wd * 1.05, -s.ht * 0.5], [s.wd, 0]];
      Art.poly(ctx, pts); ctx.fillStyle = Art.grad(ctx, -s.wd, -s.ht, s.wd, 0, [[0, light], [0.4, col], [1, dark]]); ctx.fill();
      ctx.strokeStyle = Color.alpha(dark, 0.8); ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.stroke();
      Art.poly(ctx, [[-s.wd * 0.35, -s.ht], [s.wd * 0.5, -s.ht * 0.85], [s.wd * 0.2, -s.ht * 0.3], [-s.wd * 0.3, -s.ht * 0.4]]); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s.wd * 0.6, -s.ht * 0.2); ctx.lineTo(-s.wd * 0.55, -s.ht * 0.8); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = Art.rgrad(ctx, cx, y0 - 8, 0, 10, [[0, Color.alpha(light, 0.22)], [1, Color.alpha(light, 0)]]); ctx.fillRect(0, 0, w, h);
  });

  // ---- ruins: broken columns and a wall stub
  sp('ruin', 40, 30, (ctx, w, h, p, rng) => {
    const stone = '#b9b1a0', stoneD = '#7e7669', stoneL = '#d8d1c2', moss = 'rgba(95,140,70,0.55)';
    const y0 = h - 3;
    Art.shadow(ctx, w / 2, y0 + 1, w * 0.9, 7, 0.3);
    // wall stub with block lines
    const wx = 4, ww = 16, wh = 7 + rng.next() * 4;
    ctx.beginPath(); ctx.moveTo(wx, y0); ctx.lineTo(wx, y0 - wh); ctx.lineTo(wx + 5, y0 - wh - 2); ctx.lineTo(wx + 9, y0 - wh + 1); ctx.lineTo(wx + ww, y0 - wh + 3); ctx.lineTo(wx + ww, y0); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, wx, y0 - wh, wx + ww, y0, [[0, stoneL], [0.5, stone], [1, stoneD]]); ctx.fill(); ink(ctx, 1.1);
    ctx.strokeStyle = 'rgba(40,35,45,0.35)'; ctx.lineWidth = 0.7;
    for (let yy = y0 - 2.5; yy > y0 - wh; yy -= 2.6) { ctx.beginPath(); ctx.moveTo(wx + 0.5, yy); ctx.lineTo(wx + ww - 0.5, yy); ctx.stroke(); }
    ctx.fillStyle = moss; ctx.beginPath(); ctx.ellipse(wx + 4, y0 - 1.5, 4, 1.8, 0, 0, TAU); ctx.fill();
    // columns
    const cols = 2 + rng.int(0, 1);
    for (let i = 0; i < cols; i++) {
      const cx = 24 + i * 7 + rng.next() * 2, ch = 9 + rng.next() * 14, cw = 2.6;
      ctx.beginPath(); ctx.moveTo(cx - cw, y0); ctx.lineTo(cx - cw, y0 - ch); ctx.lineTo(cx - cw * 0.3, y0 - ch - 2); ctx.lineTo(cx + cw * 0.6, y0 - ch + 0.5); ctx.lineTo(cx + cw, y0 - ch + 1.5); ctx.lineTo(cx + cw, y0); ctx.closePath();
      ctx.fillStyle = Art.grad(ctx, cx - cw, 0, cx + cw, 0, [[0, stoneL], [0.55, stone], [1, stoneD]]); ctx.fill(); ink(ctx, 1);
      ctx.fillStyle = 'rgba(40,35,45,0.25)'; ctx.fillRect(cx - cw - 0.8, y0 - 2, cw * 2 + 1.6, 2);
      ctx.strokeStyle = 'rgba(40,35,45,0.28)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(cx - 0.6, y0 - 1); ctx.lineTo(cx - 0.4, y0 - ch + 1); ctx.stroke();
      if (i === 0) { ctx.fillStyle = moss; ctx.beginPath(); ctx.ellipse(cx + 1, y0 - 2, 1.8, 2.6, 0.4, 0, TAU); ctx.fill(); }
    }
    // rubble
    ctx.fillStyle = stone;
    for (let i = 0; i < 5; i++) { const rx = 6 + rng.next() * 30, ry = y0 - rng.next() * 2; ctx.beginPath(); ctx.ellipse(rx, ry, 1.5 + rng.next(), 0.9, rng.next(), 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(20,15,30,0.4)'; ctx.lineWidth = 0.6; ctx.stroke(); }
  });

  // ---- glowing mushroom
  sp('mushroom', 18, 20, (ctx, w, h, p, rng) => {
    const cap = p.cap || '#c85f8f', capL = Color.shade(cap, 0.45), capD = Color.shade(cap, -0.35);
    const cx = w / 2, y0 = h - 2, st = 8 + rng.next() * 4, cw = 5.5 + rng.next() * 2.5;
    ctx.fillStyle = Art.rgrad(ctx, cx, y0 - st + 2, 0, 10, [[0, Color.alpha(capL, 0.4)], [1, Color.alpha(capL, 0)]]); ctx.fillRect(0, 0, w, h);
    ctx.beginPath(); ctx.moveTo(cx - 1.8, y0); ctx.lineTo(cx + 1.8, y0); ctx.lineTo(cx + 1.3, y0 - st); ctx.lineTo(cx - 1.3, y0 - st); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, cx - 2, 0, cx + 2, 0, [[0, '#f4ecd8'], [1, '#b9a98a']]); ctx.fill(); ink(ctx, 0.9);
    ctx.beginPath(); ctx.moveTo(cx - cw, y0 - st + 1); ctx.quadraticCurveTo(cx - cw, y0 - st - cw * 1.1, cx, y0 - st - cw * 1.15); ctx.quadraticCurveTo(cx + cw, y0 - st - cw * 1.1, cx + cw, y0 - st + 1); ctx.quadraticCurveTo(cx, y0 - st + 2.5, cx - cw, y0 - st + 1); ctx.closePath();
    ctx.fillStyle = Art.rgrad(ctx, cx - cw * 0.4, y0 - st - cw * 0.7, 0, cw * 1.6, [[0, capL], [0.5, cap], [1, capD]]); ctx.fill(); ink(ctx, 1.1);
    ctx.fillStyle = 'rgba(255,245,230,0.75)';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx - cw * 0.6 + rng.next() * cw * 1.2, y0 - st - cw * 0.9 + rng.next() * cw * 0.7, 0.7 + rng.next() * 0.6, 0, TAU); ctx.fill(); }
    ctx.fillStyle = Color.alpha(capL, 0.55); ctx.beginPath(); ctx.ellipse(cx, y0 - st + 1.2, cw * 0.8, 1.2, 0, 0, TAU); ctx.fill();
  });

  // ---- ancient tree (huge, faintly luminous)
  sp('ancient', 70, 70, (ctx, w, h, p, rng) => {
    const cx = w / 2, y0 = h - 3;
    Art.shadow(ctx, cx + 3, y0, 50, 13, 0.4);
    ctx.fillStyle = Art.rgrad(ctx, cx, 28, 0, 34, [[0, 'rgba(180,255,190,0.16)'], [1, 'rgba(180,255,190,0)']]); ctx.fillRect(0, 0, w, h);
    // roots + trunk
    ctx.beginPath(); ctx.moveTo(cx - 14, y0); ctx.quadraticCurveTo(cx - 6, y0 - 6, cx - 6, y0 - 22); ctx.lineTo(cx + 6, y0 - 22); ctx.quadraticCurveTo(cx + 6, y0 - 6, cx + 15, y0); ctx.quadraticCurveTo(cx + 4, y0 - 2, cx, y0 - 1); ctx.quadraticCurveTo(cx - 4, y0 - 2, cx - 14, y0); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, cx - 10, 0, cx + 10, 0, [[0, '#7a5a3a'], [0.5, '#5a3b23'], [1, '#3a2416']]); ctx.fill(); ink(ctx, 1.4);
    ctx.strokeStyle = 'rgba(30,20,10,0.45)'; ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 4 + i * 2.5, y0 - 4); ctx.quadraticCurveTo(cx - 5 + i * 2.5, y0 - 12, cx - 3 + i * 2.2, y0 - 20); ctx.stroke(); }
    const lobes = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; lobes.push({ x: cx + Math.cos(a) * (14 + rng.next() * 4), y: 27 + Math.sin(a) * (10 + rng.next() * 3), r: 9 + rng.next() * 4 }); }
    lobes.push({ x: cx, y: 24, r: 15 });
    lobes.sort((a, b) => (b.y + b.r) - (a.y + a.r));
    ctx.beginPath(); for (const l of lobes) { ctx.moveTo(l.x + l.r, l.y); ctx.arc(l.x, l.y, l.r, 0, TAU); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke(); ctx.fillStyle = '#1f4a22'; ctx.fill();
    for (const l of lobes) { ctx.fillStyle = Art.rgrad(ctx, l.x - l.r * 0.4, l.y - l.r * 0.45, 0, l.r * 1.25, [[0, '#8fd06a'], [0.45, '#3f8a3a'], [1, '#1f4a22']]); ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(10,20,30,0.3)'; ctx.beginPath(); ctx.ellipse(cx + 2, 40, 22, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(220,255,200,0.85)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(cx - 22 + rng.next() * 44, 12 + rng.next() * 28, 0.8 + rng.next() * 0.7, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(200,255,180,0.5)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(cx - 12 + rng.next() * 14, 12 + rng.next() * 8, 2.4, 1.2, -0.5, 0, TAU); ctx.fill(); }
  });

  // ---- reeds, grass tuft, flower, pool, ice shard, bush
  sp('reed', 12, 16, (ctx, w, h, p, rng) => {
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 2.6 + rng.next(), top = 2 + rng.next() * 5;
      ctx.beginPath(); ctx.moveTo(x, h - 1); ctx.quadraticCurveTo(x + 1.5, (h + top) / 2, x + (rng.next() - 0.3) * 2, top);
      ctx.strokeStyle = '#6f8a3c'; ctx.lineWidth = 1; ctx.stroke();
      if (i % 2 === 0) { ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(x + 0.6, top + 1.5, 1, 2.2, 0.2, 0, TAU); ctx.fill(); }
    }
  });
  sp('tuft', 12, 8, (ctx, w, h, p, rng) => {
    const col = p.col || '#9cc25a';
    ctx.strokeStyle = col; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const x = 2 + i * 2 + rng.next(); const dx = (i - 2) * 1.2; ctx.beginPath(); ctx.moveTo(x, h - 1); ctx.quadraticCurveTo(x + dx * 0.5, h - 4, x + dx, 1 + rng.next() * 2); ctx.stroke(); }
  });
  sp('flower', 8, 8, (ctx, w, h, p, rng) => {
    const col = p.col || '#d9483b';
    ctx.strokeStyle = '#6f9a3c'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(4, 7.5); ctx.lineTo(4.3, 4); ctx.stroke();
    ctx.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.beginPath(); ctx.arc(4 + Math.cos(a) * 1.3, 3 + Math.sin(a) * 1.3, 1.05, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(4, 3, 0.8, 0, TAU); ctx.fill();
  });
  sp('bush', 16, 12, (ctx, w, h, p, rng) => {
    const leaf = p.leaf || '#4f8a3a', light = p.light || '#86bb55', dark = p.dark || '#2c5a24';
    const lobes = [{ x: 5, y: 7, r: 4 }, { x: 10.5, y: 7.5, r: 3.6 }, { x: 8, y: 5, r: 4.2 }];
    Art.shadow(ctx, 8.5, h - 1, 13, 3.5, 0.28);
    ctx.beginPath(); for (const l of lobes) { ctx.moveTo(l.x + l.r, l.y); ctx.arc(l.x, l.y, l.r, 0, TAU); } ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke(); ctx.fillStyle = dark; ctx.fill();
    for (const l of lobes) { ctx.fillStyle = Art.rgrad(ctx, l.x - l.r * 0.4, l.y - l.r * 0.4, 0, l.r * 1.2, [[0, light], [0.5, leaf], [1, dark]]); ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, TAU); ctx.fill(); }
  });
  sp('pool', 34, 18, (ctx, w, h, p, rng) => {
    const oasis = !!p.oasis;
    const cx = w / 2, cy = h / 2 + 1, rx = 13 + rng.next() * 3, ry = 5 + rng.next() * 1.5, rot = (rng.next() - 0.5) * 0.3;
    if (oasis) { ctx.beginPath(); ctx.ellipse(cx, cy + 0.5, rx + 2.5, ry + 2, rot, 0, TAU); ctx.fillStyle = 'rgba(240,215,150,0.8)'; ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU);
    ctx.fillStyle = oasis ? Art.rgrad(ctx, cx, cy, 0, rx, [[0, '#5fd0d6'], [0.7, '#3aa3b0'], [1, '#2a7f90']]) : Art.rgrad(ctx, cx, cy, 0, rx, [[0, '#2f4a3e'], [1, '#1e3229']]); ctx.fill();
    ctx.strokeStyle = oasis ? 'rgba(120,90,40,0.5)' : 'rgba(40,60,30,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = oasis ? 'rgba(230,255,255,0.5)' : 'rgba(150,200,170,0.28)'; ctx.beginPath(); ctx.ellipse(cx - rx * 0.3, cy - ry * 0.3, rx * 0.45, ry * 0.3, -0.2, 0, TAU); ctx.fill();
    if (oasis) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx + 2, cy + 1.5); ctx.quadraticCurveTo(cx + 5, cy, cx + 8, cy + 1.2); ctx.stroke(); return; }
    ctx.fillStyle = '#4f7a34'; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(cx + (rng.next() - 0.5) * rx, cy + (rng.next() - 0.5) * ry, 2.2, 1.3, 0, 0.3, TAU - 0.4); ctx.lineTo(cx, cy); ctx.fill(); }
    ctx.fillStyle = 'rgba(184,233,134,0.9)'; ctx.beginPath(); ctx.arc(cx + rx * 0.4, cy - 2, 0.9, 0, TAU); ctx.fill();
  });
  sp('shard', 16, 18, (ctx, w, h, p, rng) => {
    const cx = w / 2, y0 = h - 2;
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * 4, ht = 7 + rng.next() * 8, wd = 2 + rng.next();
      Art.poly(ctx, [[x - wd, y0], [x - wd * 0.6, y0 - ht], [x + wd * 0.4, y0 - ht * 0.85], [x + wd, y0]]);
      ctx.fillStyle = Art.grad(ctx, x - wd, y0 - ht, x + wd, y0, [[0, '#eef8ff'], [0.5, '#a6d8f0'], [1, '#6aa8cc']]); ctx.fill();
      ctx.strokeStyle = 'rgba(60,100,140,0.6)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  });
  sp('cactus', 14, 20, (ctx, w, h, p, rng) => {
    const cx = w / 2, y0 = h - 1.5;
    Art.shadow(ctx, cx + 1, y0, 9, 3, 0.28);
    const arm = (x, y, ht, wd) => { Art.rrect(ctx, x - wd, y - ht, wd * 2, ht, wd); ctx.fillStyle = Art.grad(ctx, x - wd, 0, x + wd, 0, [[0, '#8fb85a'], [0.5, '#5f8a3a'], [1, '#3f6a2a']]); ctx.fill(); ink(ctx, 0.9); };
    arm(cx, y0, 12 + rng.next() * 5, 2.2);
    arm(cx - 4, y0 - 7, 5, 1.3); ctx.fillStyle = '#5f8a3a'; ctx.fillRect(cx - 4, y0 - 8.5, 3, 2);
    if (rng.next() < 0.6) { arm(cx + 4, y0 - 5, 4, 1.3); ctx.fillRect(cx + 1.5, y0 - 6.5, 3, 2); }
  });

  // ================================================================ decor placement
  const OAK_VARIANTS = [
    { leaf: '#3f7a2f', light: '#6faa48', dark: '#25501e' }, { leaf: '#4a8a36', light: '#82bd55', dark: '#2a5a22' },
    { leaf: '#35702c', light: '#63a044', dark: '#1e4419' }, { leaf: '#4f8a2f', light: '#8cc05a', dark: '#2f5a1e' },
    { leaf: '#3c7a3a', light: '#6cae5c', dark: '#224a22' }, { leaf: '#c8772a', light: '#efb054', dark: '#7a3f18' },
  ];
  /** returns decor items (positions relative to the hex centre) for a hex, sorted by foot y */
  TerrainArt.decorItems = function (info, zoom) {
    const s = info.size || Hex.SIZE, u = s / 36;
    const t = info.terrain || 'grass', f = info.feature || 'none';
    const rng = rngFor(info, 60);
    const snow = info.snow === undefined ? (t === 'snow' ? 1 : 0) : info.snow;
    const items = [];
    const lod = zoom === undefined ? 1 : zoom;
    const push = (key, x, y, p, scale, imp) => items.push({ key, x, y, p: p || {}, scale: (scale || 1) * u, imp: imp || 0 });
    // scatter points inside the hex with a minimum spacing
    const scatter = (n, margin, minD) => {
      const pts = [];
      let tries = 0;
      while (pts.length < n && tries++ < n * 12) {
        const px = (rng.next() - 0.5) * s * 1.75, py = (rng.next() - 0.5) * s * 1.75;
        if (!insideHex(px, py, s, margin)) continue;
        let ok = true;
        for (const q of pts) if ((q[0] - px) * (q[0] - px) + (q[1] - py) * (q[1] - py) < minD * minD) { ok = false; break; }
        if (ok) pts.push([px, py]);
      }
      return pts;
    };
    const water = !!WATER[t];
    const rockCols = t === 'volcanic' ? { base: '#4a3a3a', light: '#6d5a55', dark: '#2a2020' } : t === 'desert' ? { base: '#b7773c', light: '#d9a06a', dark: '#7a4a24' } : t === 'snow' ? { base: '#7a8590', light: '#c9d4dc', dark: '#4a525c' } : null;
    const tuftCol = t === 'grass' ? '#a9d060' : t === 'hills' ? '#c1c66a' : t === 'forest' ? '#7fa84c' : t === 'swamp' ? '#8c9c4a' : t === 'desert' ? '#c9b26a' : t === 'snow' ? '#c7d3da' : '#6a5a4a';
    const treeKind = t === 'snow' || (t === 'mountain' && f !== 'none') ? 'pine' : t === 'desert' ? 'palm' : t === 'volcanic' ? 'dead' : t === 'swamp' ? 'cypress' : 'oak';
    const tree = (x, y, scale) => {
      if (treeKind === 'oak') { const v = rng.int(0, 4) === 0 && rng.next() < 0.25 ? 5 : rng.int(0, 4); push('oak', x, y, Object.assign({ v: rng.int(0, 5) }, OAK_VARIANTS[v]), scale, 1); }
      else if (treeKind === 'pine') push('pine', x, y, { v: rng.int(0, 5), snow: Math.round(snow * 2) / 2 }, scale, 1);
      else if (treeKind === 'palm') push('palm', x, y, { v: rng.int(0, 5) }, scale, 1);
      else if (treeKind === 'dead') push('dead', x, y, { v: rng.int(0, 5), col: t === 'volcanic' ? '#2a2020' : '#4a3a30' }, scale, 1);
      else { if (rng.next() < 0.3) push('dead', x, y, { v: rng.int(0, 5), col: '#3a3028' }, scale, 1); else push('cypress', x, y, { v: rng.int(0, 5) }, scale, 1); }
    };
    // ---- features
    if (f === 'forest' || f === 'dense_forest') {
      const dense = f === 'dense_forest';
      const n = dense ? 12 + rng.int(0, 3) : 7 + rng.int(0, 3);
      const pts = scatter(n, dense ? 0.92 : 0.82, (dense ? 6 : 7.5) * u);
      for (const p of pts) tree(p[0], p[1] + 6 * u, 0.8 + rng.next() * 0.35 + (dense ? 0.05 : 0));
      if (!dense) for (const p of scatter(2, 0.7, 6 * u)) push('tuft', p[0], p[1], { v: rng.int(0, 5), col: tuftCol }, 1, 0);
    } else if (f === 'hills') {
      const hc = t === 'snow' ? { base: '#dde6ec', light: '#f8fbfd', dark: '#b6c6d4' } : t === 'desert' ? null : t === 'volcanic' ? { base: '#4a3f3d', light: '#6d5f5a', dark: '#2a2222' } : t === 'swamp' ? { base: '#5f7440', light: '#86975a', dark: '#3d4f2b' } : t === 'forest' ? { base: '#5a8a3c', light: '#8ab85a', dark: '#3a5e2a' } : t === 'grass' ? { base: '#7ea846', light: '#a9cf62', dark: '#587c32' } : null;
      const n = 2 + rng.int(0, 1);
      for (let i = 0; i < n; i++) {
        const px = (i - (n - 1) / 2) * 14 * u + (rng.next() - 0.5) * 8 * u, py = (rng.next() - 0.5) * 18 * u + 6 * u;
        if (t === 'desert') push('dune', px, py, { v: rng.int(0, 5) }, 0.9 + rng.next() * 0.3, 1);
        else push('hill', px, py, Object.assign({ v: rng.int(0, 5) }, hc || {}), 0.85 + rng.next() * 0.35, 1);
      }
      if (t !== 'desert') for (const p of scatter(3, 0.75, 7 * u)) push(t === 'snow' && rng.next() < 0.5 ? 'pine' : 'tuft', p[0], p[1], { v: rng.int(0, 5), col: tuftCol, snow: 1 }, 0.8, 0);
      if (t === 'snow' || t === 'hills') push('rock', (rng.next() - 0.5) * 20 * u, 10 * u + rng.next() * 6 * u, Object.assign({ v: rng.int(0, 5) }, rockCols || {}), 0.8, 0);
    } else if (f === 'mountain' || f === 'peak') {
      const mc = t === 'volcanic' ? { base: '#4a3536', light: '#6e5652', dark: '#221a1a' } : t === 'desert' ? { base: '#b7773c', light: '#dda372', dark: '#6e4020' } : t === 'snow' ? { base: '#8a939c', light: '#cbd6de', dark: '#4e565e' } : {};
      const capSnow = f === 'peak' ? 1 : Math.max(snow, (info.height || 0) > 0.6 ? 0.5 : 0);
      const big = f === 'peak' ? 'peak' : 'mountain';
      push(big, (rng.next() - 0.5) * 6 * u, 14 * u, Object.assign({ v: rng.int(0, 5), snow: Math.round(capSnow * 2) / 2 }, mc), 1.05 + rng.next() * 0.15, 2);
      push('mountain', -16 * u + rng.next() * 4 * u, 18 * u + rng.next() * 4 * u, Object.assign({ v: rng.int(0, 5), snow: Math.round(capSnow * 2) / 2 * 0.5 }, mc), 0.6 + rng.next() * 0.15, 1);
      if (rng.next() < 0.7) push('mountain', 15 * u + rng.next() * 4 * u, 20 * u + rng.next() * 3 * u, Object.assign({ v: rng.int(0, 5), snow: Math.round(capSnow * 2) / 2 * 0.5 }, mc), 0.5 + rng.next() * 0.15, 1);
      for (const p of scatter(2, 0.85, 8 * u)) if (p[1] > 8 * u) push('rock', p[0], p[1] + 4 * u, Object.assign({ v: rng.int(0, 5) }, rockCols || mc), 0.75, 0);
      if (t !== 'volcanic' && t !== 'desert' && rng.next() < 0.6) push('pine', -22 * u, 24 * u, { v: rng.int(0, 5), snow: Math.round(capSnow * 2) / 2 }, 0.7, 0);
    } else if (f === 'ruins') {
      push('ruin', 0, 12 * u, { v: rng.int(0, 5) }, 1, 2);
      for (const p of scatter(3, 0.8, 8 * u)) if (p[1] < -4 * u || Math.abs(p[0]) > 18 * u) push(rng.next() < 0.5 ? 'bush' : 'tuft', p[0], p[1], { v: rng.int(0, 5), col: tuftCol }, 0.9, 0);
    } else if (f === 'crystal') {
      push('crystal', -2 * u, 12 * u, { v: rng.int(0, 5) }, 1.05, 2);
      push('crystal', 13 * u, 18 * u, { v: rng.int(0, 5) }, 0.6, 1);
      push('rock', -15 * u, 16 * u, Object.assign({ v: rng.int(0, 5) }, rockCols || {}), 0.8, 0);
    } else if (f === 'ash') {
      for (const p of scatter(3, 0.8, 9 * u)) push('dead', p[0], p[1] + 6 * u, { v: rng.int(0, 5), col: '#2a2222' }, 0.8 + rng.next() * 0.3, 1);
      for (const p of scatter(2, 0.8, 8 * u)) push('rock', p[0], p[1], Object.assign({ v: rng.int(0, 5) }, rockCols || { base: '#4a3a3a', light: '#6d5a55', dark: '#2a2020' }), 0.8, 0);
    } else if (f === 'oasis') {
      push('pool', 0, 10 * u, { v: rng.int(0, 5), oasis: 1 }, 1, 2);
      push('palm', -12 * u, 8 * u, { v: rng.int(0, 5) }, 1, 1); push('palm', 11 * u, 4 * u, { v: rng.int(0, 5) }, 0.9, 1); push('palm', 4 * u, 20 * u, { v: rng.int(0, 5) }, 0.8, 1);
      push('tuft', -14 * u, 18 * u, { v: 1, col: '#8fb85a' }, 1, 0); push('tuft', 16 * u, 14 * u, { v: 2, col: '#8fb85a' }, 1, 0);
    } else if (f === 'ice') {
      for (const p of scatter(2, 0.75, 10 * u)) push('shard', p[0], p[1] + 4 * u, { v: rng.int(0, 5) }, 0.9 + rng.next() * 0.3, 1);
    } else if (f === 'mushroom') {
      const caps = ['#c85f8f', '#7c4fa8', '#e0a040', '#5fb0c8'];
      for (const p of scatter(4 + rng.int(0, 2), 0.8, 8 * u)) push('mushroom', p[0], p[1] + 5 * u, { v: rng.int(0, 5), cap: caps[rng.int(0, 3)] }, 0.75 + rng.next() * 0.45, 1);
      if (t === 'swamp') push('reed', 14 * u, 18 * u, { v: rng.int(0, 5) }, 1, 0);
    } else if (f === 'ancient_tree') {
      push('ancient', 0, 22 * u, { v: rng.int(0, 5) }, 1, 3);
      push('bush', -22 * u, 22 * u, { v: rng.int(0, 5) }, 0.9, 0); push('bush', 20 * u, 26 * u, { v: rng.int(0, 5) }, 0.8, 0);
    }
    // ---- terrain ground dressing (also under sparse features)
    const sparse = f === 'none' || f === 'ice' || f === 'ash' || f === 'crystal';
    if (!water && sparse) {
      if (t === 'grass' || t === 'forest' || t === 'hills') {
        for (const p of scatter(3 + rng.int(0, 3), 0.8, 7 * u)) push('tuft', p[0], p[1], { v: rng.int(0, 5), col: tuftCol }, 0.9 + rng.next() * 0.3, 0);
        if (t === 'grass') for (const p of scatter(rng.int(0, 3), 0.8, 5 * u)) push('flower', p[0], p[1], { v: rng.int(0, 5), col: rng.pick(['#d9483b', '#f2e05a', '#e9a5d0', '#ffffff']) }, 1, 0);
        const r = rng.next();
        if (t === 'forest' || r < 0.35) for (const p of scatter(t === 'forest' ? 2 + rng.int(0, 2) : 1, 0.75, 10 * u)) tree(p[0], p[1] + 6 * u, 0.85 + rng.next() * 0.3);
        else if (r < 0.5) push('bush', (rng.next() - 0.5) * 30 * u, (rng.next() - 0.5) * 20 * u + 8 * u, { v: rng.int(0, 5) }, 1, 0);
        else if (r < 0.6) push('rock', (rng.next() - 0.5) * 30 * u, (rng.next() - 0.5) * 20 * u + 8 * u, { v: rng.int(0, 5) }, 0.7, 0);
      } else if (t === 'desert') {
        if (f === 'none') for (const p of scatter(2, 0.7, 14 * u)) push('dune', p[0], p[1] + 6 * u, { v: rng.int(0, 5) }, 0.7 + rng.next() * 0.35, 0);
        const r = rng.next();
        if (r < 0.3) push('cactus', (rng.next() - 0.5) * 26 * u, (rng.next() - 0.5) * 20 * u + 8 * u, { v: rng.int(0, 5) }, 0.9, 0);
        else if (r < 0.5) push('rock', (rng.next() - 0.5) * 26 * u, (rng.next() - 0.5) * 20 * u + 8 * u, Object.assign({ v: rng.int(0, 5) }, rockCols), 0.75, 0);
      } else if (t === 'snow') {
        if (rng.next() < 0.35) for (const p of scatter(1 + rng.int(0, 1), 0.75, 10 * u)) push('pine', p[0], p[1] + 6 * u, { v: rng.int(0, 5), snow: 1 }, 0.8 + rng.next() * 0.3, 1);
        if (rng.next() < 0.3) push('rock', (rng.next() - 0.5) * 26 * u, (rng.next() - 0.5) * 20 * u + 8 * u, Object.assign({ v: rng.int(0, 5) }, rockCols), 0.7, 0);
      } else if (t === 'swamp') {
        if (f === 'none') push('pool', (rng.next() - 0.5) * 14 * u, (rng.next() - 0.5) * 14 * u + 6 * u, { v: rng.int(0, 5) }, 0.8 + rng.next() * 0.4, 1);
        for (const p of scatter(2 + rng.int(0, 2), 0.8, 8 * u)) push('reed', p[0], p[1] + 4 * u, { v: rng.int(0, 5) }, 0.9 + rng.next() * 0.3, 0);
        if (rng.next() < 0.5) tree((rng.next() - 0.5) * 30 * u, (rng.next() - 0.5) * 16 * u + 8 * u, 0.8 + rng.next() * 0.3);
      } else if (t === 'volcanic') {
        for (const p of scatter(1 + rng.int(0, 2), 0.8, 9 * u)) push('rock', p[0], p[1] + 4 * u, Object.assign({ v: rng.int(0, 5) }, rockCols), 0.7 + rng.next() * 0.4, 0);
        if (rng.next() < 0.35) push('dead', (rng.next() - 0.5) * 26 * u, (rng.next() - 0.5) * 16 * u + 8 * u, { v: rng.int(0, 5), col: '#2a2020' }, 0.8, 1);
      } else if (t === 'mountain') {
        for (const p of scatter(2, 0.8, 9 * u)) push('rock', p[0], p[1] + 4 * u, { v: rng.int(0, 5) }, 0.8 + rng.next() * 0.4, 0);
        push('hill', 0, 10 * u, { v: rng.int(0, 5), base: '#8a8a80', light: '#b3b0a6', dark: '#5f5d58' }, 1, 1);
      }
    }
    if (water && t === 'coast' && rng.next() < 0.12) push('rock', (rng.next() - 0.5) * 20 * u, (rng.next() - 0.5) * 16 * u + 6 * u, { v: rng.int(0, 5) }, 0.6, 0);
    // LOD: when zoomed out drop the small dressing and thin the forest
    if (lod < 0.6) {
      let k = 0;
      return items.filter(it => it.imp >= 2 || (it.imp === 1 && (k++ % 2 === 0))).sort((a, b) => a.y - b.y);
    }
    return items.sort((a, b) => a.y - b.y);
  };

  // ---- inline ground effects that need the hex position (cracks, drifts, mist, ripples)
  function groundEffects(ctx, x, y, info, zoom) {
    const s = info.size || Hex.SIZE, u = s / 36;
    const t = info.terrain || 'grass', f = info.feature || 'none';
    const rng = rngFor(info, 70);
    if (t === 'volcanic') {
      // glowing lava cracks
      const n = f === 'ash' ? 1 : 1 + rng.int(0, 1);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < n; i++) {
        const pts = []; let px = (rng.next() - 0.5) * s * 1.2, py = (rng.next() - 0.5) * s * 1.2;
        const a0 = rng.next() * TAU, len = 4 + rng.int(0, 3);
        for (let j = 0; j < len; j++) { pts.push([x + px, y + py]); const a = a0 + (rng.next() - 0.5) * 1.6; px += Math.cos(a) * 6 * u; py += Math.sin(a) * 6 * u; if (!insideHex(px, py, s, 0.9)) break; }
        if (pts.length < 2) continue;
        Art.curve(ctx, pts); ctx.strokeStyle = 'rgba(20,8,5,0.7)'; ctx.lineWidth = 4 * u; ctx.stroke();
        Art.curve(ctx, pts); ctx.strokeStyle = 'rgba(255,90,20,0.55)'; ctx.lineWidth = 3 * u; ctx.stroke();
        Art.curve(ctx, pts); ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 1.4 * u; ctx.stroke();
        Art.curve(ctx, pts); ctx.strokeStyle = 'rgba(255,225,140,0.9)'; ctx.lineWidth = 0.6 * u; ctx.stroke();
      }
      ctx.restore();
      if (f === 'ash') {
        ctx.fillStyle = 'rgba(160,150,145,0.35)';
        for (let i = 0; i < 14; i++) { const px = (rng.next() - 0.5) * s * 1.6, py = (rng.next() - 0.5) * s * 1.6; if (insideHex(px, py, s, 0.9)) { ctx.beginPath(); ctx.arc(x + px, y + py, 0.6 + rng.next() * 0.9, 0, TAU); ctx.fill(); } }
        ctx.fillStyle = Art.rgrad(ctx, x, y - 4 * u, 0, 16 * u, [[0, 'rgba(120,110,110,0.28)'], [1, 'rgba(120,110,110,0)']]); ctx.fillRect(x - 16 * u, y - 20 * u, 32 * u, 32 * u);
      }
    } else if (t === 'snow') {
      // wind-blown drifts + ice cracks
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const px = (rng.next() - 0.5) * s * 1.2, py = (rng.next() - 0.5) * s * 1.2, len = s * (0.3 + rng.next() * 0.3);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.8 * u; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + px - len / 2, y + py + 1); ctx.quadraticCurveTo(x + px, y + py - 2 * u, x + px + len / 2, y + py); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,175,200,0.35)'; ctx.lineWidth = 1 * u;
        ctx.beginPath(); ctx.moveTo(x + px - len / 2, y + py + 2.2 * u); ctx.quadraticCurveTo(x + px, y + py + 0.5 * u, x + px + len / 2, y + py + 1.4 * u); ctx.stroke();
      }
      if (f === 'ice' || rng.next() < 0.2) {
        ctx.strokeStyle = 'rgba(120,190,230,0.75)'; ctx.lineWidth = 0.9 * u;
        const n = f === 'ice' ? 4 : 2;
        for (let i = 0; i < n; i++) {
          let px = (rng.next() - 0.5) * s, py = (rng.next() - 0.5) * s; const a0 = rng.next() * TAU;
          ctx.beginPath(); ctx.moveTo(x + px, y + py);
          for (let j = 0; j < 4; j++) { const a = a0 + (rng.next() - 0.5) * 1.2; px += Math.cos(a) * 7 * u; py += Math.sin(a) * 7 * u; if (!insideHex(px, py, s, 0.9)) break; ctx.lineTo(x + px, y + py); }
          ctx.stroke();
        }
        if (f === 'ice') { ctx.fillStyle = Art.rgrad(ctx, x, y, 0, s * 0.8, [[0, 'rgba(166,216,240,0.35)'], [1, 'rgba(166,216,240,0)']]); ctx.fillRect(x - s, y - s, 2 * s, 2 * s); }
      }
      ctx.restore();
    } else if (t === 'swamp') {
      // low mist
      const px = (rng.next() - 0.5) * s * 0.8, py = (rng.next() - 0.5) * s * 0.8;
      ctx.fillStyle = Art.rgrad(ctx, x + px, y + py, 0, s * 0.7, [[0, 'rgba(210,230,200,0.16)'], [1, 'rgba(210,230,200,0)']]);
      ctx.fillRect(x - s, y - s, 2 * s, 2 * s);
    } else if (t === 'desert' && f === 'none') {
      ctx.strokeStyle = 'rgba(255,240,200,0.35)'; ctx.lineWidth = 0.9 * u; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const px = (rng.next() - 0.5) * s * 1.3, py = (rng.next() - 0.5) * s * 1.3, len = s * 0.35;
        if (!insideHex(px, py, s, 0.85)) continue;
        ctx.beginPath(); ctx.moveTo(x + px - len / 2, y + py); ctx.quadraticCurveTo(x + px, y + py - 2 * u, x + px + len / 2, y + py + 1); ctx.stroke();
      }
    } else if (t === 'grass' && f === 'none' && zoom >= 0.6) {
      // subtle lighter meadow patch
      const px = (rng.next() - 0.5) * s * 0.8, py = (rng.next() - 0.5) * s * 0.8;
      ctx.fillStyle = Art.rgrad(ctx, x + px, y + py, 0, s * 0.5, [[0, 'rgba(200,230,120,0.14)'], [1, 'rgba(200,230,120,0)']]);
      ctx.fillRect(x - s, y - s, 2 * s, 2 * s);
    }
  }

  TerrainArt.drawHexDecor = function (ctx, x, y, info, zoom) {
    zoom = zoom === undefined ? 1 : zoom;
    groundEffects(ctx, x, y, info, zoom);
    const items = TerrainArt.decorItems(info, zoom);
    for (const it of items) draw(ctx, it.key, x + it.x, y + it.y, it.p, it.scale);
  };

  // ================================================================ chunk pipeline
  /**
   * Draw hexes [c0..c1]×[r0..r1] in the correct order. getInfo(col,row) → info|null.
   * Positions = Hex.toPixel(col,row) − origin. opts.zoom (LOD), opts.time (water shimmer, optional),
   * opts.fog(col,row) → 'unexplored'|'explored'|null (optional). Call with a 1-hex margin around the visible chunk
   * so edge spills from neighbours land on this canvas too.
   */
  TerrainArt.drawChunk = function (ctx, getInfo, c0, c1, r0, r1, originX, originY, opts) {
    opts = opts || {};
    const zoom = opts.zoom === undefined ? 1 : opts.zoom;
    TerrainArt.setOrigin(originX || 0, originY || 0);
    const cells = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const info = getInfo(c, r);
      if (!info) continue;
      const p = Hex.toPixel(c, r);
      cells.push({ c, r, info, x: p.x - (originX || 0), y: p.y - (originY || 0) });
    }
    for (const k of cells) TerrainArt.drawHexBase(ctx, k.x, k.y, k.info);
    for (const k of cells) TerrainArt.drawHexEdges(ctx, k.x, k.y, k.info);
    for (const k of cells) TerrainArt.drawRivers(ctx, k.x, k.y, k.info);
    for (const k of cells) TerrainArt.drawRoads(ctx, k.x, k.y, k.info);
    if (opts.time !== undefined) for (const k of cells) TerrainArt.drawWater(ctx, k.x, k.y, k.info, opts.time);
    for (const k of cells) TerrainArt.drawHexDecor(ctx, k.x, k.y, k.info, zoom);
    if (opts.fog) for (const k of cells) { const f = opts.fog(k.c, k.r); if (f) TerrainArt.drawFog(ctx, k.x, k.y, f); }
    return cells.length;
  };

  // ================================================================ demo
  const T_CODE = { O: 'ocean', C: 'coast', L: 'lake', G: 'grass', F: 'forest', H: 'hills', M: 'mountain', D: 'desert', S: 'snow', W: 'swamp', V: 'volcanic' };
  const F_CODE = { '.': 'none', f: 'forest', F: 'dense_forest', h: 'hills', m: 'mountain', p: 'peak', r: 'ruins', c: 'crystal', a: 'ash', o: 'oasis', i: 'ice', u: 'mushroom', t: 'ancient_tree' };
  const BASE_H = { ocean: 0.02, coast: 0.08, lake: 0.1, grass: 0.3, forest: 0.35, hills: 0.6, mountain: 0.9, desert: 0.3, snow: 0.4, swamp: 0.15, volcanic: 0.5 };
  /** builds the hand-authored sample region used by demo(); returns {W,H,getInfo,fog} */
  TerrainArt.sampleRegion = function () {
    const terr = [
      'OOCGGFFHMMSSSS',
      'OCGGFFHHMMSSSS',
      'CGGGFFHHMMSSLL',
      'CGGGGHHMMMSSSS',
      'GGGLLGHHDDDDSS',
      'GFFGGGHDDDDDVV',
      'WWFGGGHDDDDVVV',
      'WWWWGGGDDDVVVV',
      'WWWWGGGDDVVVVV'];
    const feat = [
      '.....fF.mp....',
      '....fF.hmm.f..',
      '....Ffhhmp.i..',
      '..r..hhmmm.h..',
      '......hh......',
      '.fF...h..o..m.',
      '..f..ch.....a.',
      '.u.........m..',
      '..t...........'];
    const W = 14, H = 9;
    const river = new Uint8Array(W * H), road = new Uint8Array(W * H);
    const owner = new Array(W * H).fill(null);
    const link = (mask, pts) => {
      const cells = [];
      for (let i = 0; i < pts.length - 1; i++) { const l = Hex.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); for (let j = i ? 1 : 0; j < l.length; j++) cells.push(l[j]); }
      for (let i = 0; i < cells.length - 1; i++) {
        const a = cells[i], b = cells[i + 1];
        for (let d = 0; d < 6; d++) { const n = Hex.neighbor(a.col, a.row, d); if (n.col === b.col && n.row === b.row) { mask[a.row * W + a.col] |= 1 << d; mask[b.row * W + b.col] |= 1 << ((d + 3) % 6); break; } }
      }
    };
    link(river, [[9, 2], [7, 3], [6, 4], [5, 4]]);          // mountain spring → lake
    link(river, [[3, 4], [2, 3], [1, 2], [0, 2]]);          // lake → sea
    link(river, [[9, 2], [10, 2], [12, 2]]);                // → frozen lake
    link(river, [[12, 5], [12, 6], [12, 7], [11, 8]]);      // lava flow
    link(road, [[2, 3], [5, 3], [5, 5], [8, 6], [10, 7]]);
    link(road, [[1, 5], [2, 4], [5, 4]]);                    // causeway over the lake
    for (let r = 2; r <= 5; r++) for (let c = 3; c <= 6; c++) owner[r * W + c] = '#3f7fe0';
    const fogMap = { '13,0': 'unexplored', '13,1': 'unexplored', '12,0': 'unexplored', '12,7': 'explored', '13,7': 'explored', '12,8': 'explored', '13,8': 'explored', '11,8': 'explored' };
    const tAt = (c, r) => (c < 0 || r < 0 || c >= W || r >= H) ? null : T_CODE[terr[r][c]];
    const fAt = (c, r) => F_CODE[feat[r][c]];
    const hAt = (c, r) => { const t = tAt(c, r); if (!t) return 0; const f = fAt(c, r); return f === 'peak' ? 1 : f === 'mountain' ? 0.85 : f === 'hills' ? 0.6 : BASE_H[t]; };
    const sAt = (c, r) => { const t = tAt(c, r); return t === 'snow' ? 1 : r <= 3 ? M.clamp((c - 6.5) / 3.5, 0, 1) : 0; };
    const getInfo = (c, r) => {
      const t = tAt(c, r); if (!t) return null;
      const neighbors = [], neighborHeights = [], neighborSnow = []; let coast = 0;
      for (let d = 0; d < 6; d++) { const n = Hex.neighbor(c, r, d); const nt = tAt(n.col, n.row); neighbors.push(nt); neighborHeights.push(nt ? hAt(n.col, n.row) : hAt(c, r)); neighborSnow.push(nt ? sAt(n.col, n.row) : sAt(c, r)); if (nt && WATER[nt]) coast |= 1 << d; }
      return { terrain: t, feature: fAt(c, r), height: hAt(c, r), seed: Art.hash('demo:' + c + ',' + r), river: river[r * W + c], road: road[r * W + c], neighbors, neighborHeights, neighborSnow, coast, snow: sAt(c, r), owner: owner[r * W + c], size: Hex.SIZE };
    };
    return { W, H, getInfo, fog: (c, r) => fogMap[c + ',' + r] || null };
  };

  TerrainArt.demo = function (canvas) {
    const ctx = canvas.getContext('2d');
    const region = TerrainArt.sampleRegion();
    ctx.fillStyle = '#1b1f2a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // ---- the map, 1.5× so brushwork is visible in screenshots
    const scale = 1.5;
    ctx.save(); ctx.translate(16, 16); ctx.scale(scale, scale);
    const t0 = performance.now();
    TerrainArt.drawChunk(ctx, region.getInfo, 0, region.W - 1, 0, region.H - 1, 0, 0, { zoom: 1, time: 1.3, fog: region.fog });
    const tMap = performance.now() - t0;
    ctx.restore();
    // ---- perf: an 8×8 chunk at zoom 1 on an offscreen canvas, cold then warm
    const off = Art.canvas(9 * Hex.W + 40, 8 * Hex.ROW_H + Hex.H + 40);
    const o = Hex.toPixel(3, 0);
    const run = () => { const t = performance.now(); TerrainArt.drawChunk(off.ctx, region.getInfo, 3, 10, 0, 7, o.x - Hex.W, o.y - Hex.SIZE - 20, { zoom: 1 }); return performance.now() - t; };
    const cold = run(); let warm = 0; for (let i = 0; i < 4; i++) warm += run(); warm /= 4;
    const tLod = (() => { const t = performance.now(); TerrainArt.drawChunk(off.ctx, region.getInfo, 3, 10, 0, 7, o.x - Hex.W, o.y - Hex.SIZE - 20, { zoom: 0.5 }); return performance.now() - t; })();
    // ---- fog / water samples on the right
    const sx = 1500, sy0 = 80, gap = 150;
    const samples = [['unexplored', 'fog: unexplored'], ['explored', 'fog: explored'], ['water', 'water shimmer t=2.4']];
    samples.forEach(([kind, label], i) => {
      const yy = sy0 + i * gap;
      ctx.save(); ctx.translate(sx, yy); ctx.scale(scale, scale);
      const info = region.getInfo(4, 2);
      if (kind === 'water') { const w = region.getInfo(12, 2); TerrainArt.drawHexBase(ctx, 0, 0, w); TerrainArt.drawHexEdges(ctx, 0, 0, w); TerrainArt.drawWater(ctx, 0, 0, w, 2.4); }
      else { TerrainArt.drawHexBase(ctx, 0, 0, info); TerrainArt.drawHexDecor(ctx, 0, 0, info, 1); TerrainArt.drawFog(ctx, 0, 0, kind); }
      ctx.restore();
      Art.text(ctx, label, sx, yy + 66, { size: 11, color: '#cfc6ae' });
    });
    // zoom-0.5 LOD sample (fewer decor, same pipeline)
    ctx.save(); ctx.translate(1418, 560); ctx.scale(0.5, 0.5);
    const lo = Hex.toPixel(4, 0);
    TerrainArt.drawChunk(ctx, region.getInfo, 4, 8, 0, 4, lo.x - Hex.W * 0.5, lo.y - Hex.SIZE, { zoom: 0.5 });
    ctx.restore();
    Art.text(ctx, 'zoom 0.5 LOD', 1500, 745, { size: 11, color: '#cfc6ae' });
    // ---- sprite strip: every decor sprite, 2× so the shading can be judged
    const strip = [
      ['oak', OAK_VARIANTS[0]], ['oak', Object.assign({ v: 1 }, OAK_VARIANTS[1])], ['oak', Object.assign({ v: 2 }, OAK_VARIANTS[2])], ['oak', Object.assign({ v: 3 }, OAK_VARIANTS[3])], ['oak', Object.assign({ v: 4 }, OAK_VARIANTS[5])],
      ['pine', { v: 0 }], ['pine', { v: 1, snow: 1 }], ['palm', { v: 0 }], ['dead', { v: 0 }], ['cypress', { v: 0 }], ['bush', { v: 0 }], ['cactus', { v: 0 }], ['reed', { v: 0 }], ['tuft', { v: 0 }], ['flower', { v: 0 }],
      ['hill', { v: 0 }], ['hill', { v: 1, base: '#dde6ec', light: '#f8fbfd', dark: '#b6c6d4' }], ['mountain', { v: 0 }], ['mountain', { v: 1, snow: 1 }], ['mountain', { v: 2, snow: 0.5, base: '#4a3536', light: '#6e5652', dark: '#221a1a' }], ['peak', { v: 0 }], ['rock', { v: 0 }], ['dune', { v: 0 }],
      ['crystal', { v: 0 }], ['ruin', { v: 0 }], ['mushroom', { v: 0 }], ['mushroom', { v: 1, cap: '#7c4fa8' }], ['pool', { v: 0 }], ['shard', { v: 0 }], ['ancient', { v: 0 }],
    ];
    const per = 15, x0 = 40, y1 = 985, y2 = 1150, dx = 93;
    strip.forEach(([key, p], i) => {
      const row = Math.floor(i / per), col = i % per;
      const x = x0 + col * dx + dx / 2, y = row === 0 ? y1 : y2;
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x - dx / 2 + 4, y - 132, dx - 8, 150);
      draw(ctx, key, x, y, p, 2);
      Art.text(ctx, key + (p.snow ? ' ❄' : ''), x, y + 12, { size: 11, color: '#a49c88' });
    });
    Art.text(ctx, 'TerrainArt demo — map 14×9 @1.5×: ' + tMap.toFixed(1) + ' ms   |   8×8 chunk @1: cold ' + cold.toFixed(1) + ' ms, warm ' + warm.toFixed(1) + ' ms, zoom 0.5: ' + tLod.toFixed(1) + ' ms', 16, 836, { size: 13, color: '#f1d98a', align: 'left' });
    return 'chunk8x8 cold=' + cold.toFixed(1) + 'ms warm=' + warm.toFixed(1) + 'ms lod=' + tLod.toFixed(1) + 'ms';
  };

  AOW.TerrainArt = TerrainArt;
})(window.AOW = window.AOW || {});
