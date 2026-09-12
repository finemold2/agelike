// src/game/worldgen.js — procedural realm generation (continents, biomes, rivers, provinces, structures, starts)
//
// Public API (additive to SPEC):
//   WorldGen.generate(game, rng)          fills the hex layers, provinces, neutral structures/armies and game.starts
//   WorldGen.baseParams(W, H, nPlayers)   default generation parameters; WorldGen.params(game) = base + realm trait tweaks
//   WorldGen.pickStarts(game, rng, n)     start hexes maximizing pairwise distance (called inside generate)
//   WorldGen.ascii(game)                  debug map (~ water . grass T forest ^ hills M mountain d desert * snow s swamp v volcanic
//                                         C city W wonder F free city N node X infestation O teleporter)
//   WorldGen.validate(game)               consistency checks → array of problem strings (rivers, roads, provinces, starts, structures)
//   WorldGen.lastStats                    {ms, counts…} of the last generate() call
// Layer semantics:
//   river[idx] bit d  = a river flows ALONG the edge toward direction d (mirrored: bit opposite(d) on the neighbor)
//   road[idx]  bit d  = a road segment crosses edge d from this hex's center to the neighbor's (mirrored likewise)
//   height: water hexes 0..0.3 (depth shading), land 0.3..1.0
//   terrain = climate/ground, feature = relief/decoration (see src/data/terrains.js header)
(function (AOW) {
  'use strict';
  const WorldGen = {};
  const S = () => AOW.State;
  const Hex = () => AOW.Hex;
  const Data = () => AOW.Data;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  const T = { ocean: 0, coast: 1, lake: 2, grass: 3, forest: 4, hills: 5, mountain: 6, desert: 7, snow: 8, swamp: 9, volcanic: 10 };
  const F = { none: 0, forest: 1, dense_forest: 2, hills: 3, mountain: 4, peak: 5, ruins: 6, crystal: 7, ash: 8, oasis: 9, ice: 10, mushroom: 11, ancient_tree: 12 };
  const WONDER_LOOKS = ['golden_ruins', 'pyramid', 'wizard_tower', 'dwelling', 'crypt', 'grove', 'forge', 'monolith', 'library'];
  const INFEST_KINDS = ['bandit_camp', 'spider_nest', 'undead_barrow', 'elemental_rift', 'dragon_lair'];

  // ------------------------------------------------------------------ parameters
  WorldGen.baseParams = function (W, H, nPlayers) {
    const area = W * H;
    return {
      landRatio: 0.55, continentScale: 1.0, falloff: 1.0, octaves: 5,
      hillFrac: 0.18, mountainFrac: 0.07, peakFrac: 0.3,
      forestFrac: 0.36, denseFrac: 0.12, forestBias: 0, denseBias: 0, moistureBias: 0,
      snowLine: 0.35, desertLine: 0.78, desertBias: 0, swampBias: 0,
      volcanicClusters: Math.max(1, Math.round(area / 750)),
      ruinsChance: 0.05, crystalChance: 0.02, oasisChance: 0.08, iceChance: 0.3, mushroomChance: 0.15, ashChance: 0.35, ancientTreeChance: 0.05,
      riverCount: Math.max(6, Math.min(24, Math.round(area / 170))),
      resourceChance: 0.35, magicMaterialChance: 0.06, knowledgeBias: 0, manaBias: 0,
      wonderCount: Math.round(area / 180), freeCities: nPlayers + 2, infestations: Math.round(nPlayers * 1.5),
      dragonLairs: area >= 3500 ? 2 : (area >= 2000 ? 1 : 0), teleporterPairs: area >= 2000 ? 1 : 0,
      minStartDist: area >= 3500 ? 18 : (area >= 2000 ? 14 : 10),
      lakeMaxSize: 12, minIsland: 6, guardStrength: 0, infestationBias: null,
    };
  };
  WorldGen.params = function (game) {
    const P = WorldGen.baseParams(game.W, game.H, game.settings.players.length);
    for (const id of game.settings.realmTraits || []) {
      const tr = Data().has('realmTraits', id) ? Data().get('realmTraits', id) : null;
      if (!tr || !tr.gen) continue;
      for (const k of Object.keys(tr.gen)) {
        const v = tr.gen[k];
        if (typeof v === 'number' && typeof P[k] === 'number') P[k] += v; else P[k] = v;
      }
    }
    P.landRatio = clamp(P.landRatio, 0.25, 0.85);
    P.continentScale = clamp(P.continentScale, 0.4, 2.5);
    P.falloff = clamp(P.falloff, 0.3, 2);
    P.lakeMaxSize = Math.max(3, P.lakeMaxSize);
    return P;
  };

  // ------------------------------------------------------------------ context
  function makeCtx(game, rng) {
    const W = game.W, H = game.H, N = W * H;
    const nbr = new Int32Array(N * 6);
    for (let i = 0; i < N; i++) for (let d = 0; d < 6; d++) nbr[i * 6 + d] = Hex().neighborIdx(i, d, W, H);
    return { game, rng, W, H, N, nbr, P: WorldGen.params(game), stats: {} };
  }
  function quantile(arr, q) {
    if (!arr.length) return 0;
    const s = Float32Array.from(arr).sort();
    return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))];
  }
  function distIdx(ctx, a, b) { return Hex().distIdx(a, b, ctx.W); }
  function isLand(ctx, i) { return ctx.game.terrain[i] > 2; }
  function landCount(ctx, idx, radius) {
    let n = 0;
    for (const h of Hex().spiralIdx(idx, radius, ctx.W, ctx.H)) if (isLand(ctx, h)) n++;
    return n;
  }
  function waterWithin(ctx, idx, radius) {
    for (const h of Hex().spiralIdx(idx, radius, ctx.W, ctx.H)) if (!isLand(ctx, h)) return true;
    return false;
  }
  /** BFS connected components over hexes where pred(i) holds. returns {comp:Int32Array(-1 = none), sizes:[]} */
  function components(ctx, pred) {
    const N = ctx.N, nbr = ctx.nbr;
    const comp = new Int32Array(N).fill(-1);
    const sizes = [];
    const stack = new Int32Array(N);
    for (let i = 0; i < N; i++) {
      if (comp[i] >= 0 || !pred(i)) continue;
      const id = sizes.length; let size = 0, sp = 0;
      stack[sp++] = i; comp[i] = id;
      while (sp) {
        const h = stack[--sp]; size++;
        for (let d = 0; d < 6; d++) { const n = nbr[h * 6 + d]; if (n >= 0 && comp[n] < 0 && pred(n)) { comp[n] = id; stack[sp++] = n; } }
      }
      sizes.push(size);
    }
    return { comp, sizes };
  }

  // ------------------------------------------------------------------ 1. elevation & water
  function genElevation(ctx) {
    const { W, H, N, P, rng, game } = ctx;
    const seedE = rng.int(1, 1e9), seedR = rng.int(1, 1e9);
    const scale = P.continentScale / (Math.max(W, H * 1.15) * 0.36);
    const elev = new Float32Array(N);
    const cx = (W - 1) / 2, cy = (H - 1) / 2;
    let lo = Infinity, hi = -Infinity;
    for (let row = 0; row < H; row++) {
      for (let col = 0; col < W; col++) {
        const i = row * W + col;
        const x = col + 0.5 * (row & 1), y = row * 0.866;
        const nx = x * scale, ny = y * scale;
        let e = AOW.Noise.fbm2(nx, ny, seedE, P.octaves, 2.0, 0.5) * 0.5 + 0.5;
        const rg = 1 - Math.abs(AOW.Noise.simplex2(nx * 2.3 + 11.7, ny * 2.3 + 5.1, seedR));
        e += 0.32 * rg * rg * smooth(0.42, 0.75, e);
        const dx = (x - cx) / (W / 2), dy = (row - cy) / (H / 2);
        const r = Math.pow(Math.pow(Math.abs(dx), 4) + Math.pow(Math.abs(dy), 4), 0.25);
        e -= smooth(0.72, 1.0, r) * 0.9 * P.falloff;
        if (col === 0 || row === 0 || col === W - 1 || row === H - 1) e = -5;
        elev[i] = e;
        if (e > -5) { if (e < lo) lo = e; if (e > hi) hi = e; }
      }
    }
    for (let i = 0; i < N; i++) if (elev[i] === -5) elev[i] = lo - 0.01;
    ctx.elev = elev;
    // sea level by quantile so the land ratio is honoured
    const sea = quantile(elev, 1 - P.landRatio);
    ctx.sea = sea;
    const land = new Uint8Array(N);
    for (let i = 0; i < N; i++) land[i] = elev[i] >= sea ? 1 : 0;
    ctx.land = land;
    // drown tiny islands
    let comps = components(ctx, i => land[i] === 1);
    for (let i = 0; i < N; i++) if (land[i] && comps.sizes[comps.comp[i]] < P.minIsland) { land[i] = 0; elev[i] = sea - 0.005; }
    // water bodies: ocean (touches border) vs lakes (small enclosed)
    const wc = components(ctx, i => land[i] === 0);
    const touchesBorder = new Uint8Array(wc.sizes.length);
    for (let i = 0; i < N; i++) { const c = i % W, r = (i / W) | 0; if (!land[i] && (c === 0 || r === 0 || c === W - 1 || r === H - 1)) touchesBorder[wc.comp[i]] = 1; }
    const terrain = game.terrain;
    for (let i = 0; i < N; i++) {
      if (land[i]) continue;
      const c = wc.comp[i];
      terrain[i] = (!touchesBorder[c] && wc.sizes[c] <= P.lakeMaxSize) ? T.lake : T.ocean;
    }
    for (let i = 0; i < N; i++) {
      if (terrain[i] !== T.ocean) continue;
      for (let d = 0; d < 6; d++) { const n = ctx.nbr[i * 6 + d]; if (n >= 0 && land[n]) { terrain[i] = T.coast; break; } }
    }
    // rescaled height: water 0..0.3, land 0.3..1
    let lmax = -Infinity, wmin = Infinity;
    for (let i = 0; i < N; i++) { if (land[i]) { if (elev[i] > lmax) lmax = elev[i]; } else if (elev[i] < wmin) wmin = elev[i]; }
    const height = game.height;
    for (let i = 0; i < N; i++) {
      if (land[i]) height[i] = 0.3 + 0.7 * ((elev[i] - sea) / Math.max(1e-6, lmax - sea));
      else height[i] = 0.3 * ((elev[i] - wmin) / Math.max(1e-6, sea - wmin));
    }
    comps = components(ctx, i => land[i] === 1);
    ctx.landComp = comps;
    ctx.stats.land = land.reduce((a, b) => a + b, 0);
  }

  // ------------------------------------------------------------------ 2. climate & biomes
  function genClimate(ctx) {
    const { W, H, N, P, rng, game, land, nbr } = ctx;
    const height = game.height, terrain = game.terrain, feature = game.feature;
    const seedT = rng.int(1, 1e9), seedM = rng.int(1, 1e9), seedX = rng.int(1, 1e9);
    const cy = (H - 1) / 2;
    const scaleM = 1 / 9, scaleT = 1 / 14;
    const temp = new Float32Array(N), moist = new Float32Array(N), magic = new Float32Array(N);
    const landH = [], landM = [];
    for (let i = 0; i < N; i++) {
      const col = i % W, row = (i / W) | 0;
      const x = col + 0.5 * (row & 1), y = row * 0.866;
      const lat = Math.abs(row - cy) / cy;
      temp[i] = 1 - Math.pow(lat, 1.2) + 0.1 * AOW.Noise.fbm2(x * scaleT, y * scaleT, seedT, 3) - 0.45 * Math.max(0, height[i] - 0.62);
      let m = AOW.Noise.fbm2(x * scaleM + 3.3, y * scaleM + 9.9, seedM, 4) * 0.5 + 0.5 + P.moistureBias;
      if (land[i] && waterWithin(ctx, i, 2)) m += 0.1;
      moist[i] = m;
      magic[i] = AOW.Noise.fbm2(x * scaleT * 0.8 + 50, y * scaleT * 0.8 + 50, seedX, 3) * 0.5 + 0.5;
      if (land[i]) { landH.push(height[i]); landM.push(m); }
    }
    ctx.temp = temp; ctx.moist = moist; ctx.magic = magic;
    const mountainT = quantile(landH, 1 - P.mountainFrac);
    const hillT = quantile(landH, 1 - P.mountainFrac - P.hillFrac);
    const forestT = quantile(landM, 1 - clamp(P.forestFrac + P.forestBias, 0.05, 0.9));
    const denseT = quantile(landM, 1 - clamp(P.denseFrac + P.denseBias, 0.02, 0.6));
    const swampT = quantile(landM, 1 - clamp(0.3 + P.swampBias, 0.05, 0.9));
    ctx.hillT = hillT; ctx.mountainT = mountainT;

    // relief class
    const relief = new Uint8Array(N); // 0 flat, 1 hills, 2 mountain
    for (let i = 0; i < N; i++) if (land[i]) relief[i] = height[i] >= mountainT ? 2 : (height[i] >= hillT ? 1 : 0);
    // volcanic clusters around some mountains
    const volcanic = new Uint8Array(N);
    const mountains = [];
    for (let i = 0; i < N; i++) if (relief[i] === 2) mountains.push(i);
    rng.shuffle(mountains);
    const vSeeds = [];
    for (const m of mountains) {
      if (vSeeds.length >= P.volcanicClusters) break;
      if (vSeeds.every(s => distIdx(ctx, s, m) >= 9) && temp[m] > P.snowLine + 0.05) vSeeds.push(m);
    }
    for (const s of vSeeds) {
      for (const h of Hex().spiralIdx(s, 3, W, H)) {
        if (!land[h]) continue;
        const d = distIdx(ctx, s, h);
        if (d <= 2 || rng.chance(0.4)) volcanic[h] = 1;
      }
    }
    ctx.volcanicSeeds = vSeeds;
    // biome per land hex
    for (let i = 0; i < N; i++) {
      if (!land[i]) continue;
      const rl = relief[i], t = temp[i], m = moist[i];
      if (rl === 2) { terrain[i] = T.mountain; feature[i] = F.mountain; continue; }
      if (t < P.snowLine) {
        terrain[i] = T.snow;
        feature[i] = rl === 1 ? F.hills : (m > forestT + 0.08 ? F.forest : F.none);
        continue;
      }
      if (volcanic[i]) { terrain[i] = T.volcanic; feature[i] = rl === 1 ? F.hills : F.none; continue; }
      if (t > P.desertLine && m < 0.45 + P.desertBias) { terrain[i] = T.desert; feature[i] = rl === 1 ? F.hills : F.none; continue; }
      if (rl === 0 && height[i] < 0.42 && m >= swampT && t > 0.4 && waterWithin(ctx, i, 2)) {
        terrain[i] = T.swamp; feature[i] = m >= denseT ? F.forest : F.none; continue;
      }
      if (rl === 1) { terrain[i] = T.hills; feature[i] = F.hills; continue; }
      if (m >= forestT) { terrain[i] = T.forest; feature[i] = m >= denseT ? F.dense_forest : F.forest; continue; }
      terrain[i] = T.grass; feature[i] = F.none;
    }
    // peaks: mountain cores
    const peakCands = [];
    for (const m of mountains) {
      let mn = 0;
      for (let d = 0; d < 6; d++) { const n = nbr[m * 6 + d]; if (n >= 0 && relief[n] === 2) mn++; }
      if (mn >= 4 || (mn >= 3 && height[m] > mountainT + (1 - mountainT) * 0.4)) peakCands.push(m);
    }
    peakCands.sort((a, b) => height[b] - height[a]);
    const maxPeaks = Math.round(mountains.length * P.peakFrac);
    for (let k = 0; k < Math.min(maxPeaks, peakCands.length); k++) feature[peakCands[k]] = F.peak;
    ctx.relief = relief;
  }

  // ------------------------------------------------------------------ 3. rivers along hex edges
  // vertex v = hexIdx*2 + t ; t=0 top corner (shared with NW, NE neighbours), t=1 bottom corner (shared with SW, SE)
  function vertexHexes(ctx, v, out) {
    const idx = v >> 1, nb = ctx.nbr;
    out[0] = idx;
    if ((v & 1) === 0) { out[1] = nb[idx * 6 + 4]; out[2] = nb[idx * 6 + 5]; } else { out[1] = nb[idx * 6 + 2]; out[2] = nb[idx * 6 + 1]; }
  }
  /** edges leaving vertex v: fills out with {v, hex, dir} (edge = (hex,dir) mirrored on the neighbour). returns count */
  function vertexEdges(ctx, v, out) {
    const idx = v >> 1, nb = ctx.nbr;
    let n = 0;
    if ((v & 1) === 0) {
      const nw = nb[idx * 6 + 4], ne = nb[idx * 6 + 5];
      if (nw >= 0) { out[n].v = nw * 2 + 1; out[n].hex = idx; out[n].dir = 4; n++; }
      if (ne >= 0) { out[n].v = ne * 2 + 1; out[n].hex = idx; out[n].dir = 5; n++; }
      if (nw >= 0 && ne >= 0) { const n2 = nb[nw * 6 + 5]; if (n2 >= 0) { out[n].v = n2 * 2 + 1; out[n].hex = nw; out[n].dir = 0; n++; } }
    } else {
      const sw = nb[idx * 6 + 2], se = nb[idx * 6 + 1];
      if (sw >= 0) { out[n].v = sw * 2; out[n].hex = idx; out[n].dir = 2; n++; }
      if (se >= 0) { out[n].v = se * 2; out[n].hex = idx; out[n].dir = 1; n++; }
      if (sw >= 0 && se >= 0) { const s2 = nb[sw * 6 + 1]; if (s2 >= 0) { out[n].v = s2 * 2; out[n].hex = sw; out[n].dir = 0; n++; } }
    }
    return n;
  }
  function setEdgeBit(layer, ctx, hex, dir) {
    layer[hex] |= (1 << dir);
    const n = ctx.nbr[hex * 6 + dir];
    if (n >= 0) layer[n] |= (1 << ((dir + 3) % 6));
  }
  function genRivers(ctx) {
    const { N, P, rng, game, land } = ctx;
    const V = N * 2;
    const height = game.height;
    const valid = new Uint8Array(V), sink = new Uint8Array(V), vh = new Float32Array(V);
    const hx = [0, 0, 0];
    for (let v = 0; v < V; v++) {
      vertexHexes(ctx, v, hx);
      if (hx[1] < 0 || hx[2] < 0) continue;
      valid[v] = 1;
      let water = 0, h = 0;
      for (let k = 0; k < 3; k++) { if (!land[hx[k]]) water = 1; h += height[hx[k]]; }
      sink[v] = water; vh[v] = h / 3;
    }
    // Dijkstra from all water-touching vertices: cost-to-water favouring low ground
    const cost = new Float32Array(V).fill(Infinity);
    const heap = new (Hex().Heap)();
    for (let v = 0; v < V; v++) if (valid[v] && sink[v]) { cost[v] = 0; heap.push(v, 0); }
    const edges = [{ v: 0, hex: 0, dir: 0 }, { v: 0, hex: 0, dir: 0 }, { v: 0, hex: 0, dir: 0 }];
    const hashV = v => AOW.M.hashInt(v * 7919 + 13);
    while (heap.size) {
      const u = heap.pop();
      const cu = cost[u];
      const n = vertexEdges(ctx, u, edges);
      for (let k = 0; k < n; k++) {
        const w = edges[k].v;
        if (!valid[w] || sink[w]) continue;
        const c = cu + 1 + 2.5 * (vh[w] - 0.3) + 0.8 * hashV(w);
        if (c < cost[w]) { cost[w] = c; heap.push(w, c); }
      }
    }
    ctx.riverCost = cost;
    // sources: high, far from water, spaced apart
    const cands = [];
    for (let v = 0; v < V; v++) if (valid[v] && !sink[v] && cost[v] >= 5 && vh[v] >= ctx.hillT - 0.05 && isFinite(cost[v])) cands.push(v);
    cands.sort((a, b) => (vh[b] + hashV(b) * 0.25) - (vh[a] + hashV(a) * 0.25));
    const sources = [];
    for (const v of cands) {
      if (sources.length >= P.riverCount) break;
      const h = v >> 1;
      if (sources.every(s => distIdx(ctx, s >> 1, h) >= 5)) sources.push(v);
    }
    const river = game.river;
    const onRiver = new Uint8Array(V);
    let riverEdges = 0;
    for (const src of sources) {
      let v = src, guard = 0;
      onRiver[v] = 1;
      while (cost[v] > 0 && guard++ < 400) {
        const n = vertexEdges(ctx, v, edges);
        let best = -1, bestC = Infinity, second = -1, secondC = Infinity;
        for (let k = 0; k < n; k++) {
          const w = edges[k].v;
          if (!valid[w] || cost[w] >= cost[v]) continue;
          if (cost[w] < bestC) { second = best; secondC = bestC; best = k; bestC = cost[w]; }
          else if (cost[w] < secondC) { second = k; secondC = cost[w]; }
        }
        if (best < 0) break;
        const pick = (second >= 0 && rng.chance(0.3)) ? second : best;
        const e = edges[pick];
        const already = (river[e.hex] & (1 << e.dir)) !== 0;
        setEdgeBit(river, ctx, e.hex, e.dir);
        riverEdges++;
        const joined = already || onRiver[e.v];
        onRiver[e.v] = 1;
        v = e.v;
        if (joined) break;
      }
    }
    ctx.stats.rivers = sources.length; ctx.stats.riverEdges = riverEdges;
  }

  // ------------------------------------------------------------------ 4. special features
  function genSpecialFeatures(ctx) {
    const { N, P, rng, game, land, nbr, magic } = ctx;
    const terrain = game.terrain, feature = game.feature;
    const magicT = quantile(magic.filter((m, i) => land[i]), 0.8);
    let ruins = 0, crystals = 0;
    for (let i = 0; i < N; i++) {
      if (!land[i]) continue;
      const t = terrain[i], f = feature[i];
      if (t === T.mountain) continue;
      if (f === F.none && rng.chance(P.ruinsChance)) { feature[i] = F.ruins; ruins++; continue; }
      if (f === F.none && magic[i] >= magicT && rng.chance(P.crystalChance * 5)) { feature[i] = F.crystal; crystals++; continue; }
      if (t === T.volcanic && f === F.none && rng.chance(P.ashChance)) { feature[i] = F.ash; continue; }
      if (t === T.desert && f === F.none) {
        let nearWater = false;
        for (let d = 0; d < 6; d++) { const n = nbr[i * 6 + d]; if (n >= 0 && !land[n]) { nearWater = true; break; } }
        if (rng.chance(nearWater ? P.oasisChance * 2 : P.oasisChance)) { feature[i] = F.oasis; continue; }
      }
      if (t === T.snow && f === F.none) {
        let nearWater = false;
        for (let d = 0; d < 6; d++) { const n = nbr[i * 6 + d]; if (n >= 0 && !land[n]) { nearWater = true; break; } }
        if (nearWater && rng.chance(P.iceChance)) { feature[i] = F.ice; continue; }
      }
      if (t === T.swamp && f === F.none && rng.chance(P.mushroomChance)) { feature[i] = F.mushroom; continue; }
      if (f === F.dense_forest && rng.chance(P.ancientTreeChance)) { feature[i] = F.ancient_tree; continue; }
    }
    ctx.stats.ruins = ruins; ctx.stats.crystals = crystals;
  }

  // ------------------------------------------------------------------ 5. provinces
  function buildProvinces(ctx) {
    const { W, H, N, rng, game, land, nbr } = ctx;
    const terrain = game.terrain;
    // landish = land + lake hexes touching land
    const landish = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (land[i]) { landish[i] = 1; continue; }
      if (terrain[i] !== T.lake) continue;
      for (let d = 0; d < 6; d++) { const n = nbr[i * 6 + d]; if (n >= 0 && land[n]) { landish[i] = 1; break; } }
    }
    ctx.landish = landish;
    // lattice of 7-hex flower centers (axial basis (2,1),(-1,3)) with random offset + jitter
    const q0 = rng.int(0, 6), r0 = rng.int(0, 6);
    let centers = [];
    for (let a = -H; a <= W + H; a++) {
      for (let b = -H; b <= H; b++) {
        const q = 2 * a - b + q0, r = a + 3 * b + r0;
        if (r < 0 || r >= H) continue;
        const col = q + (r - (r & 1)) / 2;
        if (col < 0 || col >= W) continue;
        let idx = r * W + col;
        if (rng.chance(0.35)) { const n = nbr[idx * 6 + rng.int(0, 5)]; if (n >= 0) idx = n; }
        if (!landish[idx]) {
          let moved = -1;
          for (let d = 0; d < 6 && moved < 0; d++) { const n = nbr[idx * 6 + ((d + rng.int(0, 5)) % 6)]; if (n >= 0 && landish[n]) moved = n; }
          if (moved < 0) continue;
          idx = moved;
        }
        centers.push(idx);
      }
    }
    let assign = grow(ctx, centers, landish);
    for (let iter = 0; iter < 2; iter++) {
      centers = recenter(ctx, assign, landish);
      assign = grow(ctx, centers, landish);
    }
    // sizes & fix-ups
    let lists = toLists(assign, N);
    for (let pass = 0; pass < 2; pass++) {
      lists = splitBig(ctx, lists, assign, landish);
      lists = mergeSmall(ctx, lists, assign);
    }
    lists = splitBig(ctx, lists, assign, landish);
    lists = lists.filter(l => l.length);
    // finalize province objects
    const province = game.province;
    province.fill(-1);
    const provinces = [];
    for (let p = 0; p < lists.length; p++) {
      const hexes = lists[p].slice().sort((a, b) => a - b);
      for (const h of hexes) province[h] = p;
      const tc = new Int32Array(11), fc = new Int32Array(13);
      let river = false, coastal = false;
      for (const h of hexes) {
        tc[terrain[h]]++; fc[game.feature[h]]++;
        if (game.river[h]) river = true;
        if (!coastal) for (let d = 0; d < 6; d++) { const n = nbr[h * 6 + d]; if (n >= 0 && terrain[n] <= 1) { coastal = true; break; } }
      }
      let bt = 3, bf = 0;
      for (let t = 3; t < 11; t++) if (tc[t] > tc[bt]) bt = t;
      for (let f = 0; f < 13; f++) if (fc[f] > fc[bf]) bf = f;
      provinces.push({ id: p, hexes, center: medoid(ctx, hexes, landish, true), terrain: bt, feature: bf, resource: null, magicMaterial: null, owner: -1, cityId: -1, improvement: null, annexTurn: -1, river, coastal });
    }
    game.provinces = provinces;
    game.nextId.province = provinces.length;
    ctx.stats.provinces = provinces.length;
  }
  function grow(ctx, centers, landish) {
    const { N, nbr, rng } = ctx;
    const assign = new Int16Array(N).fill(-1);
    let frontier = [];
    for (let i = 0; i < centers.length; i++) { const c = centers[i]; if (c >= 0 && landish[c] && assign[c] < 0) { assign[c] = i; frontier.push(c); } }
    while (frontier.length) {
      rng.shuffle(frontier);
      const next = [];
      for (const h of frontier) {
        const p = assign[h];
        for (let d = 0; d < 6; d++) { const n = nbr[h * 6 + d]; if (n >= 0 && landish[n] && assign[n] < 0) { assign[n] = p; next.push(n); } }
      }
      frontier = next;
    }
    // unreached landish components become their own provinces
    let nextP = centers.length;
    const stack = [];
    for (let i = 0; i < N; i++) {
      if (!landish[i] || assign[i] >= 0) continue;
      const p = nextP++;
      assign[i] = p; stack.push(i);
      while (stack.length) {
        const h = stack.pop();
        for (let d = 0; d < 6; d++) { const n = nbr[h * 6 + d]; if (n >= 0 && landish[n] && assign[n] < 0) { assign[n] = p; stack.push(n); } }
      }
    }
    return assign;
  }
  function toLists(assign, N) {
    const lists = [];
    for (let i = 0; i < N; i++) { const p = assign[i]; if (p < 0) continue; (lists[p] || (lists[p] = [])).push(i); }
    for (let p = 0; p < lists.length; p++) if (!lists[p]) lists[p] = [];
    return lists;
  }
  function medoid(ctx, hexes, landish, preferLand) {
    const W = ctx.W, Hx = Hex();
    let sx = 0, sz = 0;
    for (const h of hexes) { const c = Hx.toCube(h % W, (h / W) | 0); sx += c.x; sz += c.z; }
    sx /= hexes.length; sz /= hexes.length;
    let best = hexes[0], bestD = Infinity;
    for (const h of hexes) {
      if (preferLand && (!isLand(ctx, h) || ctx.game.feature[h] === F.peak)) continue;
      const c = Hx.toCube(h % W, (h / W) | 0);
      const d = Math.max(Math.abs(c.x - sx), Math.abs(c.z - sz), Math.abs((-c.x - c.z) - (-sx - sz)));
      if (d < bestD) { bestD = d; best = h; }
    }
    if (bestD === Infinity && preferLand) return medoid(ctx, hexes, landish, false);
    return best;
  }
  function recenter(ctx, assign, landish) {
    const lists = toLists(assign, ctx.N);
    return lists.map(l => l.length ? medoid(ctx, l, landish, false) : -1);
  }
  function neighborsOfProvince(ctx, list, assign, self) {
    const counts = new Map();
    for (const h of list) for (let d = 0; d < 6; d++) {
      const n = ctx.nbr[h * 6 + d];
      if (n < 0) continue;
      const p = assign[n];
      if (p >= 0 && p !== self) counts.set(p, (counts.get(p) || 0) + 1);
    }
    return counts;
  }
  function mergeSmall(ctx, lists, assign) {
    let changed = true, guard = 0;
    while (changed && guard++ < 50) {
      changed = false;
      for (let p = 0; p < lists.length; p++) {
        const l = lists[p];
        if (!l.length || l.length >= 5) continue;
        const nb = neighborsOfProvince(ctx, l, assign, p);
        if (!nb.size) continue;
        let target = -1, tScore = Infinity;
        for (const [q, shared] of nb) { const sc = lists[q].length - shared * 0.25; if (sc < tScore) { tScore = sc; target = q; } }
        for (const h of l) { assign[h] = target; lists[target].push(h); }
        lists[p] = [];
        changed = true;
      }
    }
    return lists;
  }
  function bfsFarthest(ctx, list, assign, self, from) {
    const dist = new Map([[from, 0]]);
    let frontier = [from], far = from;
    while (frontier.length) {
      const next = [];
      for (const h of frontier) for (let d = 0; d < 6; d++) {
        const n = ctx.nbr[h * 6 + d];
        if (n >= 0 && assign[n] === self && !dist.has(n)) { dist.set(n, dist.get(h) + 1); next.push(n); far = n; }
      }
      frontier = next;
    }
    return far;
  }
  function splitBig(ctx, lists, assign, landish) {
    const rng = ctx.rng;
    for (let p = 0; p < lists.length; p++) {
      let guard = 0;
      while (lists[p].length > 10 && guard++ < 4) {
        const l = lists[p];
        const a0 = rng.pick(l);
        const a = bfsFarthest(ctx, l, assign, p, a0);
        const b = bfsFarthest(ctx, l, assign, p, a);
        // two-source BFS partition
        const side = new Map([[a, 0], [b, 1]]);
        let frontier = [a, b];
        while (frontier.length) {
          const next = [];
          rng.shuffle(frontier);
          for (const h of frontier) for (let d = 0; d < 6; d++) {
            const n = ctx.nbr[h * 6 + d];
            if (n >= 0 && assign[n] === p && !side.has(n)) { side.set(n, side.get(h)); next.push(n); }
          }
          frontier = next;
        }
        const A = [], B = [];
        for (const h of l) (side.get(h) === 1 ? B : A).push(h);
        if (A.length < 4 || B.length < 4) break;
        const q = lists.length;
        lists.push(B);
        for (const h of B) assign[h] = q;
        lists[p] = A;
      }
    }
    return lists;
  }

  // ------------------------------------------------------------------ 6. resources & magic materials
  function provinceProfile(ctx, p) {
    const g = ctx.game;
    const c = { grass: 0, forest: 0, hills: 0, mountain: 0, desert: 0, snow: 0, swamp: 0, volcanic: 0, water: 0, ruins: 0, crystal: 0, oasis: 0, ancient: 0, river: 0 };
    for (const h of p.hexes) {
      const t = g.terrain[h], f = g.feature[h];
      if (t <= 2) c.water++; else c[S().TERRAINS[t]]++;
      if (f === F.ruins) c.ruins++; else if (f === F.crystal) c.crystal++; else if (f === F.oasis) c.oasis++; else if (f === F.ancient_tree) c.ancient++;
      if (g.river[h]) c.river++;
    }
    return c;
  }
  function resourceWeights(ctx, p) {
    const c = provinceProfile(ctx, p), P = ctx.P;
    return {
      food: c.grass * 2 + c.river * 2.5 + c.oasis * 4 + (p.coastal ? 1.5 : 0) + c.swamp * 0.5,
      production: c.forest * 2 + c.hills * 2 + c.volcanic * 1.5 + c.mountain,
      gold: c.hills * 1.5 + c.mountain * 2 + c.desert * 2 + c.ruins,
      mana: c.crystal * 4 + c.swamp * 1.5 + c.volcanic * 1.5 + c.snow * 1.5 + c.ruins + (P.manaBias || 0) * 3,
      knowledge: c.ruins * 4 + c.ancient * 3 + c.crystal + (P.knowledgeBias || 0) * 3,
      draft: c.grass + c.forest + c.hills * 0.5,
    };
  }
  function addNode(ctx, p) {
    const g = ctx.game;
    if (g.structure[p.center] >= 0) {
      const s = g.structures[g.structure[p.center]];
      if (s.kind === 'node') { s.resource = p.resource; s.magicMaterial = p.magicMaterial; return s; }
      return null;
    }
    return S().createStructure(g, { kind: 'node', hex: p.center, owner: -1, refId: p.id, cleared: true, guardArmyId: -1, resource: p.resource, magicMaterial: p.magicMaterial });
  }
  function materialFor(ctx, p, rng) {
    const c = provinceProfile(ctx, p);
    const opts = [];
    if (c.mountain || c.hills) opts.push('mithril', 'ember_coal');
    if (c.crystal) opts.push('crystal', 'star_metal');
    if (c.desert) opts.push('sunstone');
    if (c.swamp || c.forest) opts.push('nightshade');
    if (c.volcanic || c.mountain) opts.push('dragon_bone');
    if (c.snow) opts.push('frost_crystal', 'moonstone');
    if (p.coastal) opts.push('moonstone');
    if (c.forest) opts.push('ironwood');
    if (c.ruins) opts.push('star_metal');
    if (!opts.length) opts.push('crystal', 'star_metal', 'mithril');
    return rng.pick(opts);
  }
  function assignResources(ctx) {
    const { rng, game, P } = ctx;
    let nodes = 0, materials = 0;
    const order = game.provinces.slice();
    rng.shuffle(order);
    for (const p of order) {
      if (!isLand(ctx, p.center)) continue;
      if (rng.chance(P.resourceChance)) {
        const w = resourceWeights(ctx, p);
        const keys = Object.keys(w).filter(k => w[k] > 0);
        if (keys.length) { p.resource = rng.weighted(keys, k => w[k]); }
      }
      if (rng.chance(P.magicMaterialChance)) { p.magicMaterial = materialFor(ctx, p, rng); materials++; }
      if (p.resource || p.magicMaterial) { if (addNode(ctx, p)) nodes++; }
    }
    ctx.stats.nodes = nodes; ctx.stats.materials = materials;
  }

  // ------------------------------------------------------------------ 7. player starts
  WorldGen.pickStarts = function (game, rng, n) {
    const ctx = game.__ctx || makeCtx(game, rng);
    if (!ctx.land) { ctx.land = new Uint8Array(ctx.N); for (let i = 0; i < ctx.N; i++) ctx.land[i] = game.terrain[i] > 2 ? 1 : 0; ctx.landComp = components(ctx, i => ctx.land[i] === 1); }
    const { W, H, N, P } = ctx;
    const terrain = game.terrain, feature = game.feature;
    const comp = ctx.landComp;
    const scored = [];
    for (let i = 0; i < N; i++) {
      if (!ctx.land[i]) continue;
      const t = terrain[i], f = feature[i];
      if (t !== T.grass && t !== T.forest) continue;
      if (f !== F.none && f !== F.forest) continue;
      if (game.structure[i] >= 0 || game.province[i] < 0) continue;
      const col = i % W, row = (i / W) | 0;
      if (col < 4 || row < 4 || col >= W - 4 || row >= H - 4) continue;
      if (comp.sizes[comp.comp[i]] < 40) continue;
      if (waterWithin(ctx, i, 1)) continue;
      const lc = landCount(ctx, i, 3);
      if (lc < 12) continue;
      let good = 0, bad = 0;
      for (const h of Hex().spiralIdx(i, 3, W, H)) {
        const th = terrain[h], fh = feature[h];
        if (th === T.grass || th === T.forest || th === T.hills) good++;
        if (th === T.snow || th === T.desert || th === T.swamp || th === T.volcanic || fh === F.peak) bad++;
      }
      scored.push({ idx: i, score: lc + good * 1.5 - bad * 2 + (game.river[i] ? 2 : 0), comp: comp.comp[i] });
    }
    if (!scored.length) return [];
    scored.sort((a, b) => b.score - a.score);
    // prefer the landmass holding most good candidates
    const byComp = new Map();
    for (const s of scored) byComp.set(s.comp, (byComp.get(s.comp) || 0) + 1);
    let mainComp = -1, mainCount = -1;
    for (const [c, k] of byComp) if (k > mainCount) { mainCount = k; mainComp = c; }
    const tryPool = pool => {
      let best = null, bestMin = -1, bestSum = -1;
      const tries = Math.min(12, pool.length);
      for (let k = 0; k < tries; k++) {
        const chosen = [pool[k === 0 ? 0 : rng.int(0, pool.length - 1)].idx];
        while (chosen.length < n) {
          let cand = -1, cMin = -1, cSum = -1;
          for (const s of pool) {
            if (chosen.includes(s.idx)) continue;
            let mn = Infinity, sum = 0;
            for (const c of chosen) { const d = distIdx(ctx, c, s.idx); if (d < mn) mn = d; sum += d; }
            if (mn > cMin || (mn === cMin && sum > cSum)) { cMin = mn; cSum = sum; cand = s.idx; }
          }
          if (cand < 0) break;
          chosen.push(cand);
        }
        if (chosen.length < n) continue;
        let mn = Infinity, sum = 0;
        for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const d = distIdx(ctx, chosen[a], chosen[b]); if (d < mn) mn = d; sum += d; }
        if (mn > bestMin || (mn === bestMin && sum > bestSum)) { bestMin = mn; bestSum = sum; best = chosen; }
      }
      return { best, bestMin };
    };
    const topN = Math.max(30, Math.floor(scored.length * 0.5));
    let res = tryPool(scored.filter(s => s.comp === mainComp).slice(0, topN));
    if (!res.best || res.bestMin < P.minStartDist * 0.75) {
      const alt = tryPool(scored.slice(0, Math.max(topN, 60)));
      if (alt.best && alt.bestMin > (res.bestMin || -1)) res = alt;
    }
    if (!res.best) { res = tryPool(scored); }
    if (!res.best) return scored.slice(0, n).map(s => s.idx);
    if (res.bestMin < P.minStartDist) AOW.log('WorldGen: start spacing ' + res.bestMin + ' < ' + P.minStartDist);
    ctx.stats.startMinDist = res.bestMin;
    return res.best;
  };
  function guaranteeStartResources(ctx) {
    const { game, rng } = ctx;
    for (const start of game.starts) {
      const near = new Set();
      for (const h of Hex().spiralIdx(start, 4, ctx.W, ctx.H)) { const p = game.province[h]; if (p >= 0) near.add(p); }
      const provs = Array.from(near).map(p => game.provinces[p]);
      const homeP = game.province[start];
      for (const need of ['food', 'production']) {
        if (provs.some(p => p.resource === need)) continue;
        const free = provs.filter(p => !p.resource && p.id !== homeP && isLand(ctx, p.center) && (game.structure[p.center] < 0 || game.structures[game.structure[p.center]].kind === 'node'));
        const pool = free.length ? free : provs.filter(p => !p.resource && isLand(ctx, p.center));
        if (!pool.length) continue;
        const p = rng.weighted(pool, q => Math.max(0.1, resourceWeights(ctx, q)[need]));
        p.resource = need;
        addNode(ctx, p);
      }
    }
  }

  // ------------------------------------------------------------------ 8. neutral armies
  function unitList() { return Data().list('units').filter(u => u.role !== 'hero' && (u.tier || 1) >= 1); }
  function poolFor(kind, maxTier) {
    const all = unitList().filter(u => (u.tier || 1) <= maxTier);
    const hasTag = (u, tags) => (u.tags || []).some(t => tags.includes(t));
    const idHas = (u, words) => words.some(w => u.id.includes(w));
    let pool = [];
    if (kind === 'spider_nest') pool = all.filter(u => idHas(u, ['spider', 'arachn']) || (u.look && u.look.body === 'beast_spider'));
    else if (kind === 'undead_barrow') pool = all.filter(u => hasTag(u, ['undead']));
    else if (kind === 'elemental_rift') pool = all.filter(u => hasTag(u, ['elemental']));
    else if (kind === 'dragon_lair') pool = all.filter(u => hasTag(u, ['dragon']) || idHas(u, ['drake', 'wyvern']));
    else if (kind === 'bandit_camp') pool = all.filter(u => hasTag(u, ['marauder', 'bandit']) || idHas(u, ['bandit', 'marauder', 'brigand', 'raider']));
    else if (kind === 'animal') pool = all.filter(u => hasTag(u, ['animal']));
    if (!pool.length && (kind === 'spider_nest' || kind === 'animal')) pool = all.filter(u => hasTag(u, ['animal']));
    if (!pool.length && kind === 'bandit_camp') {
      const rosters = new Set(); for (const c of Data().list('cultures')) for (const id of c.units || []) rosters.add(id);
      pool = all.filter(u => rosters.has(u.id) && (u.tier || 1) <= 2);
    }
    if (!pool.length) pool = all.filter(u => u.source && u.source.type === 'wild');
    if (!pool.length) pool = all.filter(u => (u.tier || 1) <= 2);
    if (!pool.length) pool = all;
    return pool;
  }
  function makeGuardArmy(ctx, hex, spec) {
    const { game, rng, P } = ctx;
    let pool = [];
    if (spec.pool && spec.pool.length) pool = spec.pool.filter(id => Data().has('units', id)).map(id => Data().get('units', id));
    if (!pool.length) pool = poolFor(spec.kind, spec.maxTier || 2);
    const count = clamp(rng.int(spec.count[0], spec.count[1]) + (P.guardStrength || 0), 1, 6);
    const ids = [];
    if (pool.length) {
      for (let k = 0; k < count; k++) {
        const u = rng.weighted(pool, x => 1 / Math.max(1, x.tier || 1));
        ids.push(S().createUnit(game, u.id, -1, null).id);
      }
    }
    const army = S().createArmy(game, -1, hex, ids);
    return army;
  }

  // ------------------------------------------------------------------ 9. structures
  function otherStructuresNear(ctx, idx, radius, kinds) {
    const g = ctx.game;
    for (const s of g.structures) {
      if (s.hex < 0 || s.kind === 'node' || s.kind === 'removed') continue;
      if (kinds && !kinds.includes(s.kind)) continue;
      if (distIdx(ctx, s.hex, idx) < radius) return true;
    }
    return false;
  }
  function minDistToStarts(ctx, idx) {
    let m = Infinity;
    for (const s of ctx.game.starts) m = Math.min(m, distIdx(ctx, s, idx));
    return m;
  }
  /** pick `count` hexes satisfying opts: {allowT:[t], allowF:[f], minStart, minAny, minSame:{kind, d}, centersOnly} */
  function pickSpots(ctx, count, opts) {
    const { game, rng, N } = ctx;
    const out = [];
    const batchDist = Math.max(opts.minAny || 3, opts.minSame ? opts.minSame.d : 0);
    const ok = idx => {
      if (game.structure[idx] >= 0 || !isLand(ctx, idx) || game.province[idx] < 0) return false;
      const t = game.terrain[idx], f = game.feature[idx];
      if (f === F.peak) return false;
      if (opts.allowT && !opts.allowT.includes(t)) return false;
      if (opts.allowF && !opts.allowF.includes(f)) return false;
      if (minDistToStarts(ctx, idx) < opts.minStart) return false;
      if (otherStructuresNear(ctx, idx, opts.minAny || 3, null)) return false;
      if (opts.minSame && otherStructuresNear(ctx, idx, opts.minSame.d, opts.minSame.kinds)) return false;
      for (const o of out) if (distIdx(ctx, o, idx) < batchDist) return false;
      return true;
    };
    const centers = game.provinces.map(p => p.center).filter(c => game.structure[c] < 0);
    rng.shuffle(centers);
    for (const c of centers) { if (out.length >= count) break; if (ok(c)) out.push(c); }
    if (out.length < count && !opts.centersOnly) {
      const all = []; for (let i = 0; i < N; i++) if (isLand(ctx, i) && game.structure[i] < 0) all.push(i);
      rng.shuffle(all);
      for (const c of all) { if (out.length >= count) break; if (ok(c)) out.push(c); }
    }
    return out;
  }
  function wonderLook(ctx, idx, rng) {
    const t = ctx.game.terrain[idx], f = ctx.game.feature[idx];
    const opts = [];
    if (t === T.desert) opts.push('pyramid', 'golden_ruins', 'monolith');
    if (t === T.grass) opts.push('golden_ruins', 'wizard_tower', 'library');
    if (t === T.forest) opts.push('grove', 'dwelling', 'library');
    if (t === T.hills) opts.push('wizard_tower', 'dwelling', 'forge');
    if (t === T.mountain || t === T.volcanic) opts.push('forge', 'monolith', 'crypt');
    if (t === T.snow) opts.push('monolith', 'crypt');
    if (t === T.swamp) opts.push('crypt', 'grove');
    if (f === F.ruins) opts.push('golden_ruins', 'library');
    if (!opts.length) opts.push(...WONDER_LOOKS);
    return rng.pick(opts);
  }
  function placeWonders(ctx) {
    const { game, rng, P } = ctx;
    const spots = pickSpots(ctx, Math.max(0, P.wonderCount), { minStart: 6, minAny: 3, minSame: { kinds: ['wonder'], d: 4 } });
    const wonders = Data().list('wonders');
    const usedIds = new Map();
    for (const hex of spots) {
      const dStart = minDistToStarts(ctx, hex);
      let tier = dStart <= 9 ? 1 : dStart <= 14 ? 2 : dStart <= 20 ? 3 : 4;
      if (rng.chance(0.25)) tier = clamp(tier + (rng.chance(0.5) ? 1 : -1), 1, 4);
      let def = null;
      if (wonders.length) {
        const t = game.terrain[hex];
        let cands = wonders.filter(w => (w.tier || 1) === tier);
        if (!cands.length) cands = wonders.filter(w => Math.abs((w.tier || 1) - tier) <= 1);
        if (!cands.length) cands = wonders;
        const byTerrain = cands.filter(w => !w.terrain || (Array.isArray(w.terrain) ? w.terrain.includes(S().TERRAINS[t]) : w.terrain === S().TERRAINS[t]));
        if (byTerrain.length) cands = byTerrain;
        def = rng.weighted(cands, w => 1 / (1 + (usedIds.get(w.id) || 0) * 2));
        usedIds.set(def.id, (usedIds.get(def.id) || 0) + 1);
        tier = def.tier || tier;
      }
      const look = def && def.look ? def.look : wonderLook(ctx, hex, rng);
      const st = S().createStructure(game, { kind: 'wonder', hex, owner: -1, refId: def ? def.id : null, cleared: false, guardArmyId: -1, look, tier });
      const guardSpec = def && def.guard ? { pool: def.guard.pool || [], count: def.guard.count || [tier + 1, tier + 2], maxTier: tier + 1, kind: 'animal' }
        : { pool: null, count: [Math.min(6, tier + 1), Math.min(6, tier + 2)], maxTier: Math.min(5, tier + 1), kind: rng.pick(['animal', 'undead_barrow', 'elemental_rift', 'bandit_camp']) };
      st.guardArmyId = makeGuardArmy(ctx, hex, guardSpec).id;
    }
    ctx.stats.wonders = spots.length;
  }
  function placeFreeCities(ctx) {
    const { game, rng, P } = ctx;
    const spots = pickSpots(ctx, Math.max(0, P.freeCities), { allowT: [T.grass, T.forest, T.hills, T.desert, T.snow, T.swamp], minStart: 7, minAny: 3, minSame: { kinds: ['free_city', 'wonder'], d: 5 }, centersOnly: false });
    const cultures = Data().list('cultures'), forms = Data().list('forms');
    for (const hex of spots) {
      const culture = cultures.length ? rng.pick(cultures).id : 'feudal';
      const form = forms.length ? rng.pick(forms).id : 'human';
      const name = S().cityName(game, culture, rng);
      const city = S().createCity(game, -1, hex, { name, tier: 2, pop: 4, freeCity: { culture, form, opinion: {}, vassalOf: -1, integrated: false } });
      const roster = Data().has('cultures', culture) ? (Data().get('cultures', culture).units || []).filter(id => Data().has('units', id) && (Data().get('units', id).tier || 1) <= 2 && Data().get('units', id).role !== 'hero') : [];
      const army = makeGuardArmy(ctx, hex, { pool: roster, count: [3, 4], maxTier: 2, kind: 'bandit_camp' });
      city.garrisonArmyId = army.id;
      const st = game.structures[game.structure[hex]];
      if (st) st.guardArmyId = army.id;
    }
    ctx.stats.freeCities = spots.length;
  }
  function infestationKindFor(ctx, idx, rng) {
    const t = ctx.game.terrain[idx], f = ctx.game.feature[idx], P = ctx.P;
    const w = { bandit_camp: 1, spider_nest: 0.4, undead_barrow: 0.4, elemental_rift: 0.3 };
    if (t === T.forest || f === F.forest || f === F.dense_forest) w.spider_nest += 2;
    if (t === T.swamp) { w.spider_nest += 1; w.undead_barrow += 1.5; }
    if (t === T.snow || f === F.ruins) w.undead_barrow += 2;
    if (t === T.volcanic || f === F.crystal || t === T.mountain) w.elemental_rift += 2.5;
    if (t === T.grass || t === T.hills || t === T.desert) w.bandit_camp += 1.5;
    if (P.infestationBias === 'undead') w.undead_barrow += 2; else if (P.infestationBias === 'animal') w.spider_nest += 2; else if (P.infestationBias === 'elemental') w.elemental_rift += 2;
    const keys = Object.keys(w);
    return rng.weighted(keys, k => w[k]);
  }
  function placeInfestations(ctx) {
    const { game, rng, P } = ctx;
    const spots = pickSpots(ctx, Math.max(0, P.infestations), { minStart: 8, minAny: 3, minSame: { kinds: ['infestation'], d: 5 } });
    const lairs = pickSpots(ctx, Math.max(0, P.dragonLairs), { allowT: [T.mountain, T.volcanic], minStart: 9, minAny: 3, minSame: { kinds: ['infestation'], d: 5 } });
    const all = spots.map(h => ({ hex: h, kind: infestationKindFor(ctx, h, rng) })).concat(lairs.map(h => ({ hex: h, kind: 'dragon_lair' })));
    for (const it of all) {
      const st = S().createStructure(game, { kind: 'infestation', hex: it.hex, owner: -1, refId: it.kind, cleared: false, guardArmyId: -1, spawnTimer: 8 });
      const count = it.kind === 'dragon_lair' ? [3, 4] : [3, 5];
      const maxTier = it.kind === 'dragon_lair' ? 4 : 3;
      st.guardArmyId = makeGuardArmy(ctx, it.hex, { pool: null, count, maxTier, kind: it.kind }).id;
    }
    ctx.stats.infestations = all.length;
  }
  function placeTeleporters(ctx) {
    const { game, P } = ctx;
    for (let k = 0; k < (P.teleporterPairs || 0); k++) {
      const a = pickSpots(ctx, 1, { minStart: 6, minAny: 3 });
      if (!a.length) break;
      const sa = S().createStructure(game, { kind: 'teleporter', hex: a[0], owner: -1, refId: null, cleared: true, guardArmyId: -1 });
      const far = [];
      for (let i = 0; i < ctx.N; i++) if (isLand(ctx, i) && game.structure[i] < 0 && distIdx(ctx, i, a[0]) >= Math.floor(ctx.W * 0.45)) far.push(i);
      let b = -1;
      ctx.rng.shuffle(far);
      for (const c of far) { if (game.feature[c] !== F.peak && minDistToStarts(ctx, c) >= 6 && !otherStructuresNear(ctx, c, 3, null)) { b = c; break; } }
      if (b < 0) { S().removeStructure(game, sa.id); break; }
      const sb = S().createStructure(game, { kind: 'teleporter', hex: b, owner: -1, refId: sa.id, cleared: true, guardArmyId: -1 });
      sa.refId = sb.id;
    }
  }

  // ------------------------------------------------------------------ 10. roads
  function genRoads(ctx) {
    const { game, rng, nbr } = ctx;
    const road = game.road;
    const passable = i => i >= 0 && isLand(ctx, i) && game.feature[i] !== F.peak && game.terrain[i] !== T.mountain;
    for (const start of game.starts) {
      const dirs = rng.shuffle([0, 1, 2, 3, 4, 5]).slice(0, rng.int(2, 3));
      for (const d0 of dirs) {
        let cur = start;
        const len = rng.int(2, 3);
        for (let k = 0; k < len; k++) {
          let d = d0, n = nbr[cur * 6 + d];
          if (!passable(n)) { d = (d0 + 1) % 6; n = nbr[cur * 6 + d]; }
          if (!passable(n)) { d = (d0 + 5) % 6; n = nbr[cur * 6 + d]; }
          if (!passable(n)) break;
          setEdgeBit(road, ctx, cur, d);
          cur = n;
        }
      }
    }
  }

  // ------------------------------------------------------------------ generate
  WorldGen.generate = function (game, rng) {
    const t0 = now();
    const ctx = makeCtx(game, rng);
    Object.defineProperty(game, '__ctx', { value: ctx, enumerable: false, configurable: true, writable: true });
    genElevation(ctx);
    genClimate(ctx);
    genRivers(ctx);
    genSpecialFeatures(ctx);
    buildProvinces(ctx);
    assignResources(ctx);
    game.starts = WorldGen.pickStarts(game, rng, game.settings.players.length);
    guaranteeStartResources(ctx);
    placeWonders(ctx);
    placeFreeCities(ctx);
    placeInfestations(ctx);
    placeTeleporters(ctx);
    genRoads(ctx);
    delete game.__ctx;
    ctx.stats.ms = Math.round((now() - t0) * 10) / 10;
    ctx.stats.structures = game.structures.length; ctx.stats.armies = game.armies.length; ctx.stats.units = game.units.length;
    WorldGen.lastStats = ctx.stats;
    AOW.log('WorldGen', ctx.stats);
    return game;
  };

  // ------------------------------------------------------------------ debug: ascii & validate
  WorldGen.ascii = function (game) {
    const W = game.W, H = game.H;
    const tch = ['~', '~', '~', '.', 'T', '^', 'M', 'd', '*', 's', 'v'];
    const rows = [];
    for (let r = 0; r < H; r++) {
      let line = (r & 1) ? ' ' : '';
      for (let c = 0; c < W; c++) {
        const i = r * W + c;
        let ch = tch[game.terrain[i]] || '?';
        const f = game.feature[i];
        if (f === F.peak) ch = 'A'; else if (f === F.forest || f === F.dense_forest) ch = game.terrain[i] === T.snow ? 't' : 'T';
        if (game.terrain[i] === T.lake) ch = 'o';
        const sid = game.structure[i];
        if (sid >= 0) {
          const k = game.structures[sid].kind;
          ch = k === 'city' || k === 'outpost' ? 'C' : k === 'free_city' ? 'F' : k === 'wonder' ? 'W' : k === 'node' ? 'N' : k === 'infestation' ? 'X' : k === 'teleporter' ? 'O' : ch;
        }
        line += ch + ' ';
      }
      rows.push(line);
    }
    return rows.join('\n');
  };

  WorldGen.validate = function (game) {
    const W = game.W, H = game.H, N = W * H, Hx = Hex();
    const issues = [];
    const water = i => game.terrain[i] <= 2;
    // river & road bit symmetry
    for (const layer of ['river', 'road']) {
      const L = game[layer];
      for (let i = 0; i < N; i++) {
        if (!L[i]) continue;
        for (let d = 0; d < 6; d++) {
          if (!(L[i] & (1 << d))) continue;
          const n = Hx.neighborIdx(i, d, W, H);
          if (n < 0) { issues.push(layer + ' bit on map edge at ' + i); continue; }
          if (!(L[n] & (1 << ((d + 3) % 6)))) issues.push(layer + ' bit not mirrored: ' + i + ' dir ' + d);
          if (layer === 'river' && water(i) && water(n)) issues.push('river between two water hexes at ' + i);
        }
      }
    }
    // every river component must touch water (via a vertex). Build edge set → vertex graph.
    const edgeKey = (i, d) => { const n = Hx.neighborIdx(i, d, W, H); return d < 3 ? i + ':' + d : n + ':' + ((d + 3) % 6); };
    const seen = new Set();
    const ctx = { W, H, N, nbr: null, game };
    ctx.nbr = new Int32Array(N * 6); for (let i = 0; i < N; i++) for (let d = 0; d < 6; d++) ctx.nbr[i * 6 + d] = Hx.neighborIdx(i, d, W, H);
    const edgeVerts = (i, d) => { // the two vertices of edge (i,d): corners (d+1)%6 and (d+2)%6 of hex i
      const corner = k => { const nb = ctx.nbr; switch (k) { case 0: return i * 2; case 1: return nb[i * 6 + 5] * 2 + 1; case 2: return nb[i * 6 + 1] * 2; case 3: return i * 2 + 1; case 4: return nb[i * 6 + 2] * 2; default: return nb[i * 6 + 4] * 2 + 1; } };
      return [corner((d + 1) % 6), corner((d + 2) % 6)];
    };
    const vTouchesWater = v => { const hx = [0, 0, 0]; vertexHexes(ctx, v, hx); return hx.some(h => h >= 0 && water(h)); };
    const adj = new Map();
    let riverEdgeCount = 0;
    for (let i = 0; i < N; i++) for (let d = 0; d < 6; d++) {
      if (!(game.river[i] & (1 << d))) continue;
      const k = edgeKey(i, d);
      if (seen.has(k)) continue;
      seen.add(k); riverEdgeCount++;
      const [a, b] = edgeVerts(i, d);
      if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push(b); adj.get(b).push(a);
    }
    const visited = new Set();
    let comps = 0, dry = 0;
    for (const v0 of adj.keys()) {
      if (visited.has(v0)) continue;
      comps++;
      let touches = false; const stack = [v0]; visited.add(v0);
      while (stack.length) { const v = stack.pop(); if (vTouchesWater(v)) touches = true; for (const w of adj.get(v)) if (!visited.has(w)) { visited.add(w); stack.push(w); } }
      if (!touches) { dry++; issues.push('river component not reaching water (vertex ' + v0 + ')'); }
    }
    // provinces
    const sizes = game.provinces.map(p => p.hexes.length);
    let orphan = 0, small = 0, big = 0;
    for (let i = 0; i < N; i++) if (!water(i) && game.province[i] < 0) orphan++;
    if (orphan) issues.push(orphan + ' land hexes without province');
    for (const p of game.provinces) {
      if (p.hexes.length < 5) small++;
      if (p.hexes.length > 10) big++;
      for (const h of p.hexes) if (game.province[h] !== p.id) issues.push('province layer mismatch at ' + h);
      if (!p.hexes.includes(p.center)) issues.push('province ' + p.id + ' center outside province');
      if (water(p.center)) issues.push('province ' + p.id + ' center on water');
    }
    if (game.provinces.some((p, i) => p.id !== i)) issues.push('province ids not indices');
    // structures
    game.structures.forEach((s, i) => {
      if (s.id !== i) issues.push('structure id mismatch ' + i);
      if (s.kind === 'removed') return;
      if (s.hex < 0 || game.structure[s.hex] !== i) issues.push('structure ' + i + ' (' + s.kind + ') not on layer');
      else if (water(s.hex)) issues.push('structure ' + i + ' on water');
      if (s.guardArmyId >= 0) { const a = S().army(game, s.guardArmyId); if (!a) issues.push('structure ' + i + ' guard army missing'); else if (a.hex !== s.hex) issues.push('structure ' + i + ' guard army elsewhere'); }
    });
    for (const a of game.armies) for (const uid of a.units) { const u = S().unit(game, uid); if (!u) issues.push('army ' + a.id + ' has missing unit ' + uid); else if (u.armyId !== a.id) issues.push('unit ' + uid + ' armyId mismatch'); }
    // starts
    let minStart = Infinity;
    for (let a = 0; a < game.starts.length; a++) for (let b = a + 1; b < game.starts.length; b++) minStart = Math.min(minStart, Hx.distIdx(game.starts[a], game.starts[b], W));
    for (const s of game.starts) { const t = game.terrain[s]; if (t !== T.grass && t !== T.forest) issues.push('start on ' + S().TERRAINS[t]); }
    return { issues, riverComponents: comps, dryRivers: dry, riverEdges: riverEdgeCount, provinces: sizes.length, small, big, orphan, minSize: Math.min(...sizes), maxSize: Math.max(...sizes), minStartDist: minStart };
  };

  AOW.WorldGen = WorldGen;
})(window.AOW = window.AOW || {});
