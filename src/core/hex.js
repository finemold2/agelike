// src/core/hex.js — pointy-top hex geometry, odd-r offset storage, neighbors, A* pathfinding
(function (AOW) {
  'use strict';
  const SIZE = 36;
  const SQRT3 = Math.sqrt(3);
  const Hex = {
    SIZE,
    W: SQRT3 * SIZE,
    H: 2 * SIZE,
    ROW_H: 1.5 * SIZE,
    // direction order: 0=E,1=SE,2=SW,3=W,4=NW,5=NE (clockwise from east)
    DIRS: 6,
  };

  // odd-r offset: odd rows are shifted right by half a hex
  Hex.toPixel = function (col, row) {
    const x = SQRT3 * SIZE * (col + 0.5 * (row & 1)) + Hex.W * 0.5;
    const y = 1.5 * SIZE * row + SIZE;
    return { x, y };
  };
  Hex.toCube = function (col, row) {
    const x = col - (row - (row & 1)) / 2;
    const z = row;
    return { x, y: -x - z, z };
  };
  Hex.fromCube = function (x, y, z) {
    const row = z;
    const col = x + (z - (z & 1)) / 2;
    return { col, row };
  };
  function cubeRound(x, y, z) {
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;
    return { x: rx, y: ry, z: rz };
  }
  Hex.fromPixel = function (px, py) {
    const x = px - Hex.W * 0.5, y = py - SIZE;
    const q = (SQRT3 / 3 * x - 1 / 3 * y) / SIZE;
    const r = (2 / 3 * y) / SIZE;
    const c = cubeRound(q, -q - r, r);
    return Hex.fromCube(c.x, c.y, c.z);
  };
  Hex.corners = function (cx, cy, size = SIZE) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      pts.push({ x: cx + size * Math.cos(a), y: cy + size * Math.sin(a) });
    }
    return pts;
  };
  // edge toward direction d is between corners (d+1)%6 and (d+2)%6 (top corner is index 0, clockwise)
  Hex.edgeCorners = function (cx, cy, d, size = SIZE) {
    const c = Hex.corners(cx, cy, size);
    return [c[(d + 1) % 6], c[(d + 2) % 6]];
  };
  Hex.edgeMid = function (cx, cy, d, size = SIZE) {
    const a = Math.PI / 180 * (60 * d);
    const r = size * SQRT3 / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const ODD = [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]];   // E,SE,SW,W,NW,NE for odd rows
  const EVEN = [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]]; // for even rows
  Hex.neighbor = function (col, row, d) {
    const o = (row & 1) ? ODD[d] : EVEN[d];
    return { col: col + o[0], row: row + o[1] };
  };
  Hex.neighbors = function (col, row) {
    const out = [];
    for (let d = 0; d < 6; d++) out.push(Hex.neighbor(col, row, d));
    return out;
  };
  Hex.opposite = d => (d + 3) % 6;
  Hex.idx = (col, row, W) => row * W + col;
  Hex.col = (idx, W) => idx % W;
  Hex.row = (idx, W) => Math.floor(idx / W);
  Hex.inBounds = (col, row, W, H) => col >= 0 && row >= 0 && col < W && row < H;
  Hex.neighborIdx = function (idx, d, W, H) {
    const n = Hex.neighbor(idx % W, Math.floor(idx / W), d);
    return Hex.inBounds(n.col, n.row, W, H) ? n.row * W + n.col : -1;
  };
  Hex.neighborsIdx = function (idx, W, H) {
    const out = [];
    for (let d = 0; d < 6; d++) { const n = Hex.neighborIdx(idx, d, W, H); if (n >= 0) out.push(n); }
    return out;
  };
  Hex.dist = function (c1, r1, c2, r2) {
    const a = Hex.toCube(c1, r1), b = Hex.toCube(c2, r2);
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
  };
  Hex.distIdx = function (i, j, W) {
    return Hex.dist(i % W, Math.floor(i / W), j % W, Math.floor(j / W));
  };
  Hex.dirTo = function (c1, r1, c2, r2) {
    // direction (0-5) from hex1 toward hex2 (approximate for non-adjacent)
    const a = Hex.toPixel(c1, r1), b = Hex.toPixel(c2, r2);
    let ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    ang = ((ang % 360) + 360) % 360;
    return Math.round(ang / 60) % 6;
  };
  Hex.ring = function (col, row, radius) {
    if (radius === 0) return [{ col, row }];
    const out = [];
    let c = Hex.toCube(col, row);
    // move to the start: radius steps in direction 4 (NW)
    let cur = { col, row };
    for (let i = 0; i < radius; i++) cur = Hex.neighbor(cur.col, cur.row, 4);
    for (let d = 0; d < 6; d++) {
      for (let i = 0; i < radius; i++) {
        out.push({ col: cur.col, row: cur.row });
        cur = Hex.neighbor(cur.col, cur.row, d);
      }
    }
    return out;
  };
  Hex.spiral = function (col, row, radius) {
    let out = [{ col, row }];
    for (let r = 1; r <= radius; r++) out = out.concat(Hex.ring(col, row, r));
    return out;
  };
  Hex.spiralIdx = function (idx, radius, W, H) {
    return Hex.spiral(idx % W, Math.floor(idx / W), radius).filter(h => Hex.inBounds(h.col, h.row, W, H)).map(h => h.row * W + h.col);
  };
  Hex.ringIdx = function (idx, radius, W, H) {
    return Hex.ring(idx % W, Math.floor(idx / W), radius).filter(h => Hex.inBounds(h.col, h.row, W, H)).map(h => h.row * W + h.col);
  };
  Hex.line = function (c1, r1, c2, r2) {
    const a = Hex.toCube(c1, r1), b = Hex.toCube(c2, r2);
    const n = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : i / n;
      const c = cubeRound(a.x + (b.x - a.x) * t + 1e-6, a.y + (b.y - a.y) * t + 1e-6, a.z + (b.z - a.z) * t - 2e-6);
      out.push(Hex.fromCube(c.x, c.y, c.z));
    }
    return out;
  };
  Hex.lineIdx = function (i, j, W) {
    return Hex.line(i % W, Math.floor(i / W), j % W, Math.floor(j / W)).map(h => h.row * W + h.col);
  };

  // ------------------------------------------------------------ binary heap
  class Heap {
    constructor() { this.a = []; }
    push(item, pri) {
      const a = this.a; a.push({ item, pri });
      let i = a.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (a[p].pri <= a[i].pri) break; const t = a[p]; a[p] = a[i]; a[i] = t; i = p; }
    }
    pop() {
      const a = this.a; if (!a.length) return undefined;
      const top = a[0]; const last = a.pop();
      if (a.length) {
        a[0] = last; let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < a.length && a[l].pri < a[m].pri) m = l;
          if (r < a.length && a[r].pri < a[m].pri) m = r;
          if (m === i) break;
          const t = a[m]; a[m] = a[i]; a[i] = t; i = m;
        }
      }
      return top.item;
    }
    get size() { return this.a.length; }
  }
  Hex.Heap = Heap;

  /**
   * A* over hex indices. costFn(fromIdx, toIdx) returns move cost or Infinity.
   * opts.maxCost: abort if best path exceeds; opts.heuristicWeight (default 1) ; opts.allowGoalBlocked: treat goal as enterable even if costFn is Infinity (for attacking)
   * returns {path:[idx...], cost} or null
   */
  Hex.astar = function (start, goal, W, H, costFn, opts = {}) {
    if (start === goal) return { path: [], cost: 0 };
    const hw = opts.heuristicWeight || 1;
    const maxCost = opts.maxCost || Infinity;
    const gScore = new Map(); gScore.set(start, 0);
    const came = new Map();
    const open = new Heap();
    open.push(start, 0);
    const closed = new Set();
    const gc = goal % W, gr = Math.floor(goal / W);
    let guard = 0;
    while (open.size) {
      const cur = open.pop();
      if (cur === goal) {
        const path = []; let n = goal;
        while (n !== start) { path.push(n); n = came.get(n); }
        path.reverse();
        return { path, cost: gScore.get(goal) };
      }
      if (closed.has(cur)) continue;
      closed.add(cur);
      if (++guard > 200000) break;
      const gcur = gScore.get(cur);
      for (let d = 0; d < 6; d++) {
        const n = Hex.neighborIdx(cur, d, W, H);
        if (n < 0 || closed.has(n)) continue;
        let c = costFn(cur, n);
        if (!isFinite(c)) { if (opts.allowGoalBlocked && n === goal) c = 1; else continue; }
        const g = gcur + c;
        if (g > maxCost) continue;
        if (g < (gScore.has(n) ? gScore.get(n) : Infinity)) {
          gScore.set(n, g); came.set(n, cur);
          const h = Hex.dist(n % W, Math.floor(n / W), gc, gr) * hw;
          open.push(n, g + h);
        }
      }
    }
    return null;
  };

  /** Dijkstra flood within budget. returns Map(idx -> cost) including start (0) */
  Hex.reachable = function (start, W, H, budget, costFn) {
    const dist = new Map(); dist.set(start, 0);
    const open = new Heap(); open.push(start, 0);
    while (open.size) {
      const cur = open.pop();
      const dc = dist.get(cur);
      for (let d = 0; d < 6; d++) {
        const n = Hex.neighborIdx(cur, d, W, H);
        if (n < 0) continue;
        const c = costFn(cur, n);
        if (!isFinite(c)) continue;
        const g = dc + c;
        if (g > budget) continue;
        if (g < (dist.has(n) ? dist.get(n) : Infinity)) { dist.set(n, g); open.push(n, g); }
      }
    }
    return dist;
  };

  AOW.Hex = Hex;
})(window.AOW = window.AOW || {});
