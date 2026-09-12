// src/art/art.js — sprite cache and shared procedural drawing helpers
(function (AOW) {
  'use strict';
  const Art = {};
  const generators = new Map();
  const cache = new Map();
  let cacheCount = 0;
  const MAX_CACHE = 6000;

  Art.canvas = function (w, h) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
    const ctx = cv.getContext('2d');
    return { cv, ctx };
  };

  /** register a sprite generator */
  Art.sprite = function (key, w, h, drawFn, opts = {}) {
    generators.set(key, { w, h, drawFn, anchor: opts.anchor || { x: 0.5, y: 1 }, sizeFn: opts.sizeFn || null });
  };
  Art.has = key => generators.has(key);

  function paramKey(params) {
    if (!params) return '';
    if (typeof params === 'string' || typeof params === 'number') return String(params);
    try { return JSON.stringify(params); } catch (e) { return String(params); }
  }

  /** get (and cache) a rendered sprite canvas. returns {cv, w, h, ax, ay} */
  Art.get = function (key, params) {
    const g = generators.get(key);
    if (!g) throw new Error('Art.get: unknown sprite ' + key);
    const ck = key + '|' + paramKey(params);
    let e = cache.get(ck);
    if (e) return e;
    let w = g.w, h = g.h;
    if (g.sizeFn) { const s = g.sizeFn(params || {}); w = s.w; h = s.h; }
    const { cv, ctx } = Art.canvas(w, h);
    ctx.save();
    try { g.drawFn(ctx, w, h, params || {}); } catch (err) { console.error('Art sprite failed: ' + key, err); }
    ctx.restore();
    e = { cv, w, h, ax: g.anchor.x * w, ay: g.anchor.y * h };
    if (cacheCount > MAX_CACHE) { cache.clear(); cacheCount = 0; }
    cache.set(ck, e); cacheCount++;
    return e;
  };
  Art.clearCache = function (prefix) {
    if (!prefix) { cache.clear(); cacheCount = 0; return; }
    for (const k of Array.from(cache.keys())) if (k.startsWith(prefix)) cache.delete(k);
  };

  /** draw a sprite with its anchor at (x,y) */
  Art.draw = function (ctx, key, x, y, params, o) {
    const s = Art.get(key, params);
    const scale = (o && o.scale) || 1, alpha = o && o.alpha !== undefined ? o.alpha : 1;
    const flip = o && o.flip, rot = (o && o.rotation) || 0;
    if (scale === 1 && alpha === 1 && !flip && !rot) {
      ctx.drawImage(s.cv, Math.round(x - s.ax), Math.round(y - s.ay));
      return;
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(flip ? -scale : scale, scale);
    ctx.drawImage(s.cv, -s.ax, -s.ay);
    ctx.restore();
  };

  // ------------------------------------------------------------- path helpers
  Art.hexPath = function (ctx, cx, cy, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      const x = cx + size * Math.cos(a), y = cy + size * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  Art.rrect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  Art.ellipse = function (ctx, cx, cy, rx, ry, rot = 0) {
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2); ctx.closePath();
  };
  Art.circle = function (ctx, cx, cy, r) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.01, r), 0, Math.PI * 2); ctx.closePath(); };
  Art.poly = function (ctx, pts, close = true) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    if (close) ctx.closePath();
  };
  /** smooth closed/open curve through points using quadratic midpoints */
  Art.curve = function (ctx, pts, close = false) {
    if (pts.length < 2) return;
    ctx.beginPath();
    if (close) {
      const n = pts.length;
      let mx = (pts[0][0] + pts[n - 1][0]) / 2, my = (pts[0][1] + pts[n - 1][1]) / 2;
      ctx.moveTo(mx, my);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      const l = pts[pts.length - 1];
      ctx.lineTo(l[0], l[1]);
    }
  };
  Art.star = function (ctx, cx, cy, rOuter, rInner, points = 5, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? rInner : rOuter;
      const a = rot + i * Math.PI / points;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // ------------------------------------------------------------- gradients
  Art.grad = function (ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [t, c] of stops) g.addColorStop(AOW.M.clamp(t, 0, 1), c);
    return g;
  };
  Art.rgrad = function (ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1));
    for (const [t, c] of stops) g.addColorStop(AOW.M.clamp(t, 0, 1), c);
    return g;
  };

  // ------------------------------------------------------------- textures
  const noiseTex = new Map();
  /** cached grayscale noise tile (alpha varies) used for texture overlays */
  Art.noiseTile = function (seed = 0, size = 64, scale = 8, octaves = 3) {
    const k = seed + ':' + size + ':' + scale + ':' + octaves;
    let t = noiseTex.get(k);
    if (t) return t;
    const { cv, ctx } = Art.canvas(size, size);
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // tileable-ish by sampling on a torus
      const ang1 = x / size * Math.PI * 2, ang2 = y / size * Math.PI * 2;
      const nx = Math.cos(ang1) * scale / 4, ny = Math.sin(ang1) * scale / 4, nz = Math.cos(ang2) * scale / 4, nw = Math.sin(ang2) * scale / 4;
      const v = AOW.Noise.fbm2(nx + nz * 1.7, ny + nw * 1.3, seed, octaves) * 0.5 + 0.5;
      const i = (y * size + x) * 4;
      const g = Math.round(v * 255);
      d[i] = g; d[i + 1] = g; d[i + 2] = g; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    t = cv; noiseTex.set(k, t);
    return t;
  };
  /**
   * fill current clip/rect with a two-color noise blend. o={seed,scale,colors:[c1,c2],alpha,size}
   * Draws c1 then overlays noise-modulated c2 using 'source-over' with the noise tile as alpha via a temp canvas.
   */
  Art.noiseFill = function (ctx, x, y, w, h, o = {}) {
    const seed = o.seed || 0, size = o.size || 64, scale = o.scale || 8;
    const c1 = (o.colors && o.colors[0]) || '#000', c2 = (o.colors && o.colors[1]) || '#fff';
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    const tile = Art.noiseTile(seed, size, scale, o.octaves || 3);
    const k = 'nf:' + seed + ':' + size + ':' + scale + ':' + c1 + ':' + c2 + ':' + (o.octaves || 3);
    let e = cache.get(k);
    if (!e) {
      const { cv, ctx: c } = Art.canvas(size, size);
      c.fillStyle = c1; c.fillRect(0, 0, size, size);
      // use noise luminance as mask for c2
      const { cv: m, ctx: mc } = Art.canvas(size, size);
      mc.drawImage(tile, 0, 0);
      mc.globalCompositeOperation = 'source-in';
      mc.fillStyle = c2; mc.fillRect(0, 0, size, size);
      // luminance→alpha: approximate by drawing tile with 'destination-in'
      const { cv: m2, ctx: m2c } = Art.canvas(size, size);
      m2c.fillStyle = c2; m2c.fillRect(0, 0, size, size);
      m2c.globalCompositeOperation = 'destination-in';
      // convert grayscale to alpha
      const img = tile.getContext('2d').getImageData(0, 0, size, size);
      const out = m2c.createImageData(size, size);
      const p = AOW.Color.parse(c2);
      for (let i = 0; i < img.data.length; i += 4) { out.data[i] = p[0]; out.data[i + 1] = p[1]; out.data[i + 2] = p[2]; out.data[i + 3] = img.data[i]; }
      m2c.globalCompositeOperation = 'source-over';
      m2c.putImageData(out, 0, 0);
      c.drawImage(m2, 0, 0);
      e = { cv }; cache.set(k, e);
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    const pat = ctx.createPattern(e.cv, 'repeat');
    ctx.fillStyle = pat;
    ctx.translate(x, y);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
  /** soft elliptical ground shadow centered at (x,y) */
  Art.shadow = function (ctx, x, y, w, h, alpha = 0.35) {
    ctx.save();
    ctx.fillStyle = Art.rgrad(ctx, x, y, 0, Math.max(w, h) / 2, [[0, 'rgba(10,8,20,' + alpha + ')'], [0.6, 'rgba(10,8,20,' + alpha * 0.5 + ')'], [1, 'rgba(10,8,20,0)']]);
    ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  Art.outline = function (ctx, pathFn, color, width) {
    ctx.save(); pathFn(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  };
  Art.text = function (ctx, str, x, y, o = {}) {
    ctx.save();
    const size = o.size || 12;
    ctx.font = (o.weight || '600') + ' ' + size + 'px ' + (o.font || '"Noto Sans KR", "Segoe UI", system-ui, sans-serif');
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = o.shadow === true ? 3 : o.shadow; ctx.shadowOffsetY = 1; }
    if (o.stroke) { ctx.lineWidth = o.strokeWidth || 3; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(str, x, y);
    ctx.restore();
  };
  Art.hash = AOW.hashString;

  /** shading helpers: draw a sphere-like highlight/shade over a shape already filled (call inside clip) */
  Art.sphereShade = function (ctx, cx, cy, r, light = 0.35, dark = 0.35) {
    ctx.save();
    ctx.fillStyle = Art.rgrad(ctx, cx - r * 0.35, cy - r * 0.4, 0, r * 1.2, [[0, 'rgba(255,255,255,' + light + ')'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,30,' + dark + ')']]);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  /** vertical gradient shade for tall shapes (clip first) */
  Art.rimLight = function (ctx, x, y, w, h, color = 'rgba(255,255,255,0.35)') {
    ctx.save();
    ctx.fillStyle = Art.grad(ctx, x, y, x + w, y + h, [[0, color], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,40,0.3)']]);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  };

  /** deterministic per-sprite rng from seed */
  Art.rng = seed => new AOW.RNG(seed === undefined ? 1 : seed);

  AOW.Art = Art;
})(window.AOW = window.AOW || {});
