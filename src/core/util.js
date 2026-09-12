// src/core/util.js — RNG, noise, math and color helpers shared by every module
(function (AOW) {
  'use strict';

  const DEBUG = { enabled: false };
  AOW.log = function () { if (DEBUG.enabled) console.log.apply(console, arguments); };
  AOW.warn = function () { console.warn.apply(console, arguments); };
  AOW.DEBUG = DEBUG;

  // ---------------------------------------------------------------- hashing
  function hashString(str) {
    // cyrb53-ish 32-bit hash
    let h1 = 0xdeadbeef ^ 0x9e3779b9, h2 = 0x41c6ce57 ^ 0x85ebca6b;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0) ^ (h1 >>> 0);
  }
  function toSeed(seed) {
    if (typeof seed === 'number') return seed >>> 0;
    if (seed === undefined || seed === null) return 1;
    return hashString(String(seed));
  }

  // ---------------------------------------------------------------- RNG
  class RNG {
    constructor(seed) {
      this.seed = toSeed(seed);
      this.s = this.seed || 0x1234567;
    }
    next() {
      // mulberry32
      let t = (this.s += 0x6D2B79F5) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    float(min, max) { return min + (max - min) * this.next(); }
    int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    chance(p) { return this.next() < p; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    weighted(items, weightFn) {
      let total = 0;
      for (const it of items) total += weightFn(it);
      let r = this.next() * total;
      for (const it of items) { r -= weightFn(it); if (r <= 0) return it; }
      return items[items.length - 1];
    }
    gauss(mean = 0, sd = 1) {
      const u = 1 - this.next(), v = this.next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    fork(label) { return new RNG(hashString(this.seed + ':' + label + ':' + Math.floor(this.next() * 1e9))); }
    state() { return this.s; }
    setState(s) { this.s = s >>> 0; }
  }
  AOW.RNG = RNG;
  AOW.hashString = hashString;

  // ---------------------------------------------------------------- Noise (2D simplex + fbm)
  const permCache = new Map();
  function permFor(seed) {
    const key = toSeed(seed);
    let p = permCache.get(key);
    if (p) return p;
    const rng = new RNG(key);
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); const t = base[i]; base[i] = base[j]; base[j] = t; }
    p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    if (permCache.size > 64) permCache.clear();
    permCache.set(key, p);
    return p;
  }
  const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function simplex2(xin, yin, seed) {
    const p = permFor(seed);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    const gi0 = p[ii + p[jj]] % 12, gi1 = p[ii + i1 + p[jj + j1]] % 12, gi2 = p[ii + 1 + p[jj + 1]] % 12;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * (GRAD[gi0][0] * x0 + GRAD[gi0][1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * (GRAD[gi1][0] * x1 + GRAD[gi1][1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * (GRAD[gi2][0] * x2 + GRAD[gi2][1] * y2); }
    return 70 * (n0 + n1 + n2);
  }
  function fbm2(x, y, seed, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * simplex2(x * freq, y * freq, seed + o * 1013);
      norm += amp; amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }
  // cheap value noise for texture fills
  function value2(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => AOW.M.hash2(a + seed * 131, b + seed * 71);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  AOW.Noise = { simplex2, fbm2, value2 };

  // ---------------------------------------------------------------- Math
  const M = {
    clamp: (v, a, b) => v < a ? a : v > b ? b : v,
    lerp: (a, b, t) => a + (b - a) * t,
    smoothstep: (a, b, x) => { const t = M.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
    mod: (a, n) => ((a % n) + n) % n,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: t => 1 - (1 - t) * (1 - t),
    easeIn: t => t * t,
    hashInt: i => { i = Math.imul(i ^ (i >>> 16), 0x45d9f3b); i = Math.imul(i ^ (i >>> 16), 0x45d9f3b); i ^= i >>> 16; return (i >>> 0) / 4294967296; },
    hash2: (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; },
    round: (v, d = 0) => { const p = Math.pow(10, d); return Math.round(v * p) / p; },
    sign: v => v < 0 ? -1 : v > 0 ? 1 : 0,
    TAU: Math.PI * 2,
  };
  AOW.M = M;

  // ---------------------------------------------------------------- Color
  function parse(c) {
    if (Array.isArray(c)) return c.length === 3 ? [c[0], c[1], c[2], 1] : c.slice();
    if (typeof c !== 'string') return [0, 0, 0, 1];
    c = c.trim();
    if (c[0] === '#') {
      if (c.length === 4) return [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16), 1];
      if (c.length === 7) return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 1];
      if (c.length === 9) return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), parseInt(c.slice(7, 9), 16) / 255];
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(',').map(s => parseFloat(s)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    const h = c.match(/hsla?\(([^)]+)\)/);
    if (h) { const p = h[1].split(',').map(s => parseFloat(s)); return hslToRgb(p[0], p[1] / 100, p[2] / 100, p.length > 3 ? p[3] : 1); }
    return [0, 0, 0, 1];
  }
  function hslToRgb(h, s, l, a = 1) {
    h = M.mod(h, 360) / 360;
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
      r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255, a];
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h *= 60;
    }
    return [h, s, l];
  }
  function toCss(c) {
    const r = Math.round(M.clamp(c[0], 0, 255)), g = Math.round(M.clamp(c[1], 0, 255)), b = Math.round(M.clamp(c[2], 0, 255));
    const a = c.length > 3 ? M.clamp(c[3], 0, 1) : 1;
    return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${M.round(a, 3)})`;
  }
  const Color = {
    parse, toCss, hslToRgb, rgbToHsl,
    hsl: (h, s, l, a = 1) => toCss(hslToRgb(h, s / 100, l / 100, a)),
    mix: (c1, c2, t) => { const a = parse(c1), b = parse(c2); return toCss([M.lerp(a[0], b[0], t), M.lerp(a[1], b[1], t), M.lerp(a[2], b[2], t), M.lerp(a[3], b[3], t)]); },
    shade: (c, amt) => { const p = parse(c); const t = amt < 0 ? 0 : 255; const k = Math.abs(amt); return toCss([M.lerp(p[0], t, k), M.lerp(p[1], t, k), M.lerp(p[2], t, k), p[3]]); },
    saturate: (c, amt) => { const p = parse(c); const [h, s, l] = rgbToHsl(p[0], p[1], p[2]); return toCss(hslToRgb(h, M.clamp(s + amt, 0, 1), l, p[3])); },
    hueShift: (c, deg) => { const p = parse(c); const [h, s, l] = rgbToHsl(p[0], p[1], p[2]); return toCss(hslToRgb(h + deg, s, l, p[3])); },
    lighten: (c, amt) => { const p = parse(c); const [h, s, l] = rgbToHsl(p[0], p[1], p[2]); return toCss(hslToRgb(h, s, M.clamp(l + amt, 0, 1), p[3])); },
    alpha: (c, a) => { const p = parse(c); return toCss([p[0], p[1], p[2], a]); },
    luminance: c => { const p = parse(c); return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255; },
    hex: c => { const p = parse(c); return '#' + [p[0], p[1], p[2]].map(v => Math.round(M.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); },
  };
  AOW.Color = Color;

  // ---------------------------------------------------------------- misc helpers
  AOW.deepClone = obj => JSON.parse(JSON.stringify(obj));
  AOW.assign = Object.assign;
  AOW.sum = (arr, fn) => arr.reduce((s, x) => s + (fn ? fn(x) : x), 0);
  AOW.uniq = arr => Array.from(new Set(arr));
  AOW.range = n => Array.from({ length: n }, (_, i) => i);
  AOW.pad = (n, w = 2) => String(n).padStart(w, '0');
  AOW.fmt = n => (Math.round(n * 10) / 10).toString();
  AOW.signed = n => (n > 0 ? '+' : '') + AOW.fmt(n);
})(window.AOW = window.AOW || {});
