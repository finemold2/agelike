// src/art/icons.js — AOW.Icons: procedural painterly UI icons, ornate frames and ornaments (no image files)
//
// Public API (SPEC §6):
//   Icons.draw(ctx, name, x, y, size, params)  draw icon CENTERED at (x,y), fitted to size×size; cached per name|size|params
//   Icons.dataURL(name, size, params)          cached PNG data URL for DOM <img>
//   Icons.has(name) / Icons.list()             names (list() is in registration order, grouped)
//   Icons.frame(w, h, style) → canvas          'panel' | 'parchment' | 'button' | 'button_hover' | 'button_active' | 'slot' | 'portrait' | 'tab' | 'tooltip'
//   Icons.frameDataURL(w, h, style)            cached PNG data URL of a frame
//   Icons.divider(w) → canvas                  ornamental gold divider (w × 16)
//   Icons.demo(canvas, query)                  gallery of every icon at 32 & 64 px + every frame style
// Additive helpers (documented per SPEC §0): Icons.canvas(name, size, params) → cached canvas; Icons.groups() → [{id, names}];
//   Icons.dividerDataURL(w); Icons.drawTL(ctx, name, x, y, size, params) (top-left anchored); demo query ?group=<id>&scale=<n>.
// Parametric icons: 'banner' {color, color2}; 'affinity_<id>_bg' badges; tome covers 'tome_<affinity>_<tier>'.
// Style: painterly AoW4-like — key light top-left, 1.5px dark outline at 32px, soft inner bevel, glow for magic, drop shadow.
(function (AOW) {
  'use strict';
  const Icons = {};
  const Art = AOW.Art, Col = AOW.Color, PAL = AOW.Palette;
  const TAU = Math.PI * 2, PI = Math.PI;
  const REG = new Map();      // name → {fn, group}
  const GROUPS = [];          // [{id, names:[]}]
  const cache = new Map();    // name|size|params → canvas
  const urlCache = new Map();
  const frameCache = new Map();

  // ------------------------------------------------------------------ painter state (unit space 64×64, center 32,32)
  let X = null;     // current 2d context
  let K = 1;        // device px per unit
  let NB = false;   // "append" mode for tracers (no beginPath)
  let OLW = 3;      // outline half-width in units (→ 1.5 px at 32 px)
  const OUT = 'rgba(16,10,24,0.92)';
  const AFF = PAL.affinity, AFFD = PAL.affinityDark, AFFL = PAL.affinityLight, CH = PAL.channel, RES = PAL.resource, UI = PAL.ui;
  const mixW = (c, t) => Col.mix(c, '#fffaf0', t), mixK = (c, t) => Col.mix(c, '#100a18', t), al = (c, a) => Col.alpha(c, a);
  const GOLD = '#e8c357', STEEL = '#b9bec8', BONE = '#efe6d0', WOOD = '#7a4a26', LEATHER = '#5a3a24', INK = '#1a1020';

  function begin() { if (!NB) X.beginPath(); }
  function smooth(pts, close) {
    const n = pts.length;
    if (close) {
      X.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
      for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; X.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
      X.closePath();
    } else {
      X.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) { const p = pts[i], q = pts[i + 1]; X.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
      X.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }
  // ---- tracers: functions that build a path (respect NB append mode)
  const circ = (cx, cy, r) => () => { begin(); X.moveTo(cx + r, cy); X.arc(cx, cy, r, 0, TAU); X.closePath(); };
  const ell = (cx, cy, rx, ry, rot = 0) => () => { begin(); X.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot)); X.ellipse(cx, cy, rx, ry, rot, 0, TAU); X.closePath(); };
  const rr = (x, y, w, h, r) => () => { begin(); r = Math.min(r, w / 2, h / 2); X.moveTo(x + r, y); X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r); X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r); X.closePath(); };
  const poly = pts => () => { begin(); pts.forEach((p, i) => i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])); X.closePath(); };
  const star = (cx, cy, ro, ri, n = 5, rot = -PI / 2) => () => { begin(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = rot + i * PI / n; const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); i ? X.lineTo(px, py) : X.moveTo(px, py); } X.closePath(); };
  const curve = (pts, close = true) => () => { begin(); smooth(pts, close); };
  const path = fn => () => { begin(); fn(); X.closePath(); };
  const open = fn => () => { begin(); fn(); };
  const union = (...ts) => () => { begin(); const o = NB; NB = true; ts.forEach(t => t()); NB = o; };
  const hexT = (cx, cy, r, rot = -PI / 2) => () => { begin(); for (let i = 0; i < 6; i++) { const a = rot + i * PI / 3, px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); i ? X.lineTo(px, py) : X.moveTo(px, py); } X.closePath(); };
  const seg = (x0, y0, x1, y1) => open(() => { X.moveTo(x0, y0); X.lineTo(x1, y1); });
  const arcT = (cx, cy, r, a0, a1, ccw) => open(() => { X.arc(cx, cy, r, a0, a1, !!ccw); });

  // ---- gradients
  const lg = (x0, y0, x1, y1, st) => Art.grad(X, x0, y0, x1, y1, st);
  const rg = (x, y, r0, r1, st) => Art.rgrad(X, x, y, r0, r1, st);
  const mat = (c, x0, y0, x1, y1, lt = 0.5, dk = 0.45) => lg(x0, y0, x1, y1, [[0, mixW(c, lt)], [0.5, c], [1, mixK(c, dk)]]);
  const METAL = {
    gold: ['#fff6c8', '#f2cf62', '#c08b2c', '#6a4a12'], steel: ['#f6f8fb', '#c9cfd8', '#7e8592', '#3b4049'],
    silver: ['#ffffff', '#e2e6ec', '#9aa2ae', '#4c535e'], bronze: ['#ffe0b0', '#d29a52', '#94602a', '#4e3012'],
    iron: ['#c8ccd2', '#8a9098', '#565b64', '#2a2d33'], wood: ['#c98f5a', '#8e5a32', '#5c3a1e', '#2e1c0e'],
    leather: ['#9a6a48', '#6a4630', '#472e1e', '#241610'], bone: ['#fffaf0', '#efe6d0', '#c9b896', '#8a7a58'],
    copper: ['#ffd6b0', '#d9834a', '#9a5228', '#4a2812'], obsidian: ['#6a5a78', '#3a3044', '#221c2c', '#0e0a14'],
    violet: ['#e8d0ff', '#a070e0', '#6a3aa8', '#2e1450'], ruby: ['#ffc0b8', '#e0453a', '#961e1a', '#4a0c0a'],
  };
  const metal = (k, x0, y0, x1, y1) => { const m = METAL[k] || METAL.steel; return lg(x0, y0, x1, y1, [[0, m[0]], [0.35, m[1]], [0.7, m[2]], [1, m[3]]]); };
  const sphere = (c, cx, cy, r) => rg(cx - r * 0.35, cy - r * 0.35, 0, r * 1.3, [[0, mixW(c, 0.65)], [0.4, c], [1, mixK(c, 0.55)]]);
  const gem = (c, cx, cy, r) => rg(cx - r * 0.3, cy - r * 0.3, 0, r * 1.2, [[0, mixW(c, 0.85)], [0.3, mixW(c, 0.2)], [0.75, c], [1, mixK(c, 0.6)]]);

  // ---- scratch canvas for bevels
  let SCR = null, SCX = null;
  function scratch(w, h) {
    if (!SCR) { const c = Art.canvas(w, h); SCR = c.cv; SCX = c.ctx; }
    if (SCR.width !== w || SCR.height !== h) { SCR.width = w; SCR.height = h; } else SCX.clearRect(0, 0, w, h);
    return SCX;
  }
  /** soft rim: light band along top-left inner edge, dark band along bottom-right (union-safe) */
  function bevel(trace, light, dark, d, blur) {
    const W = X.canvas.width, H = X.canvas.height;
    const tf = X.getTransform();
    const passes = [[light, 'rgba(255,250,235,1)', d], [dark, 'rgba(8,4,20,1)', -d]];
    for (const [a, col, dd] of passes) {
      if (a <= 0) continue;
      const S = scratch(W, H);
      S.save(); S.setTransform(tf);
      const XX = X; X = S;
      S.fillStyle = col; trace(); S.fill();
      S.globalCompositeOperation = 'destination-out';
      S.translate(dd, dd); S.shadowColor = '#000'; S.shadowBlur = blur * K; S.fillStyle = '#000'; trace(); S.fill();
      X = XX; S.restore();
      X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha *= a; X.drawImage(SCR, 0, 0); X.restore();
    }
  }
  function outline(trace, w = OLW, c = OUT) { trace(); X.lineWidth = w * 2; X.strokeStyle = c; X.lineJoin = 'round'; X.lineCap = 'round'; X.stroke(); }
  function fill(trace, f) { trace(); X.fillStyle = f; X.fill(); }
  /** outlined, filled, bevelled shape. o: {ol, olc, bevel, light, dark, d, blur} */
  function shape(trace, f, o) {
    o = o || {};
    if (o.ol !== 0) outline(trace, o.ol || OLW, o.olc);
    fill(trace, f);
    if (o.bevel !== false) bevel(trace, o.light === undefined ? 0.55 : o.light, o.dark === undefined ? 0.45 : o.dark, o.d || 1.7, o.blur || 1.2);
  }
  /** outlined line art. o: {ol, olc, cap, hi} */
  function line(trace, color, w, o) {
    o = o || {};
    X.lineCap = o.cap || 'round'; X.lineJoin = 'round';
    if (o.ol !== 0) { trace(); X.lineWidth = w + (o.ol || OLW) * 2; X.strokeStyle = o.olc || OUT; X.stroke(); }
    trace(); X.lineWidth = w; X.strokeStyle = color; X.stroke();
    if (o.hi) { X.save(); X.translate(-w * 0.18, -w * 0.18); trace(); X.lineWidth = Math.max(0.6, w * 0.3); X.strokeStyle = o.hi === true ? 'rgba(255,250,235,0.5)' : o.hi; X.stroke(); X.restore(); }
  }
  function glow(cx, cy, r, c, a = 0.7) {
    X.save(); X.fillStyle = rg(cx, cy, 0, r, [[0, al(c, a)], [0.4, al(c, a * 0.45)], [1, al(c, 0)]]); X.fillRect(cx - r, cy - r, r * 2, r * 2); X.restore();
  }
  /** specular dot */
  function spec(cx, cy, r, a = 0.8) { fill(ell(cx, cy, r, r * 0.7, -0.6), rg(cx, cy, 0, r, [[0, 'rgba(255,255,255,' + a + ')'], [1, 'rgba(255,255,255,0)']])); }
  /** draw a sub-symbol: fn drawn in its own 64-unit space scaled by s, centered at (cx,cy) */
  function sub(cx, cy, s, fn, rot = 0) {
    X.save(); X.translate(cx, cy); if (rot) X.rotate(rot); X.scale(s, s); X.translate(-32, -32);
    const o = OLW; OLW = o / Math.sqrt(s); const k = K; K *= s;
    fn(); OLW = o; K = k; X.restore();
  }
  function text(str, cx, cy, size, color, o) {
    o = o || {};
    X.save(); X.font = (o.weight || 'bold') + ' ' + size + 'px ' + (o.font || 'Georgia, "Times New Roman", serif');
    X.textAlign = 'center'; X.textBaseline = 'middle';
    if (o.ol !== 0) { X.lineWidth = (o.ol || OLW) * 2; X.strokeStyle = o.olc || OUT; X.lineJoin = 'round'; X.strokeText(str, cx, cy); }
    X.fillStyle = color; X.fillText(str, cx, cy); X.restore();
  }

  // ================================================================ reusable parts
  /** sword centered (cx,cy), total length L, ang 0 = pointing up. o: {blade, guard, grip, w, tint, glowC} */
  function sword(cx, cy, L, ang, o) {
    o = o || {};
    X.save(); X.translate(cx, cy); X.rotate(ang || 0);
    const bw = o.w || L * 0.15, gl = L * 0.2, gh = L * 0.055, gy = L / 2 - gl - gh;
    if (o.glowC) glow(0, -L * 0.15, L * 0.3, o.glowC, 0.7);
    const bladeT = poly([[0, -L / 2], [bw / 2, -L / 2 + bw * 1.4], [bw / 2, gy], [-bw / 2, gy], [-bw / 2, -L / 2 + bw * 1.4]]);
    shape(bladeT, metal(o.blade || 'steel', -bw / 2, -L / 4, bw / 2, L / 4), { light: 0.7 });
    line(seg(0, -L / 2 + bw * 1.7, 0, gy - 1.5), 'rgba(20,20,40,0.35)', bw * 0.16, { ol: 0 });
    if (o.tint) fill(bladeT, al(o.tint, 0.4));
    shape(rr(-bw * 1.6, gy, bw * 3.2, gh, gh / 2), metal(o.guard || 'gold', -bw * 1.6, gy, bw * 1.6, gy + gh));
    shape(rr(-bw * 0.42, gy + gh, bw * 0.84, gl, bw * 0.2), metal(o.grip || 'leather', -bw / 2, gy, bw / 2, gy + gl));
    shape(circ(0, L / 2 - bw * 0.3, bw * 0.45), metal(o.guard || 'gold', -bw / 2, L / 2 - bw, bw / 2, L / 2));
    X.restore();
  }
  /** dagger: shorter, curved guard */
  function dagger(cx, cy, L, ang, o) { sword(cx, cy, L, ang, Object.assign({ w: L * 0.2, grip: 'wood', guard: 'steel' }, o || {})); }
  const shieldT = (cx, cy, w, h) => path(() => {
    const t = cy - h / 2, b = cy + h / 2, l = cx - w / 2, r = cx + w / 2;
    X.moveTo(l, t + h * 0.07); X.quadraticCurveTo(cx, t - h * 0.05, r, t + h * 0.07);
    X.lineTo(r, cy - h * 0.08); X.quadraticCurveTo(r, b - h * 0.22, cx, b);
    X.quadraticCurveTo(l, b - h * 0.22, l, cy - h * 0.08);
  });
  /** heater shield. o: {fill, rim, boss, bossMetal, emblem(fn)} */
  function shield(cx, cy, w, h, c, o) {
    o = o || {};
    const t = shieldT(cx, cy, w, h);
    shape(t, o.fill || mat(c, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), o);
    if (o.rim !== false) { X.save(); t(); X.clip(); line(t, o.rim || metal('gold', cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), w * 0.12, { ol: 0 }); X.restore(); }
    if (o.emblem) { X.save(); t(); X.clip(); o.emblem(); X.restore(); }
    if (o.boss) shape(circ(cx, cy - h * 0.02, w * 0.15), metal(o.bossMetal || 'gold', cx - w * 0.15, cy - w * 0.15, cx + w * 0.15, cy + w * 0.15));
  }
  const roundShieldT = (cx, cy, r) => circ(cx, cy, r);
  /** flame silhouette: box (cx,cy,w,h) */
  const flameT = (cx, cy, w, h) => path(() => {
    const fx = px => cx + w * px, fy = py => cy - h / 2 + h * py;
    X.moveTo(fx(0.05), fy(0));
    X.bezierCurveTo(fx(0.15), fy(0.2), fx(0.55), fy(0.4), fx(0.48), fy(0.7));
    X.bezierCurveTo(fx(0.45), fy(0.9), fx(0.25), fy(1), fx(0), fy(1));
    X.bezierCurveTo(fx(-0.28), fy(1), fx(-0.5), fy(0.9), fx(-0.5), fy(0.68));
    X.bezierCurveTo(fx(-0.5), fy(0.55), fx(-0.38), fy(0.5), fx(-0.36), fy(0.4));
    X.bezierCurveTo(fx(-0.36), fy(0.32), fx(-0.44), fy(0.27), fx(-0.46), fy(0.18));
    X.bezierCurveTo(fx(-0.3), fy(0.24), fx(-0.17), fy(0.4), fx(-0.12), fy(0.5));
    X.bezierCurveTo(fx(-0.06), fy(0.35), fx(0), fy(0.15), fx(0.05), fy(0));
  });
  /** painted flame with inner tongue. c1 outer (red), c2 mid (orange), c3 core (yellow) */
  function flame(cx, cy, w, h, c1, c2, c3, o) {
    o = o || {};
    c1 = c1 || '#c8321a'; c2 = c2 || '#ff7a1a'; c3 = c3 || '#ffe680';
    if (o.glow !== false) glow(cx, cy + h * 0.1, w * 0.9, c2, 0.55);
    shape(flameT(cx, cy, w, h), rg(cx, cy + h * 0.28, 0, h * 0.7, [[0, c3], [0.35, c2], [1, c1]]), { light: 0.35, dark: 0.3 });
    fill(flameT(cx + w * 0.02, cy + h * 0.2, w * 0.5, h * 0.52), rg(cx, cy + h * 0.4, 0, h * 0.35, [[0, '#fffbe0'], [0.5, c3], [1, al(c2, 0.2)]]));
  }
  const dropT = (cx, cy, w, h) => path(() => {
    const t = cy - h / 2, r = w / 2, yc = cy + h / 2 - r;
    X.moveTo(cx, t); X.bezierCurveTo(cx + r * 0.2, t + h * 0.3, cx + r, yc - r * 0.7, cx + r, yc);
    X.arc(cx, yc, r, 0, PI); X.bezierCurveTo(cx - r, yc - r * 0.7, cx - r * 0.2, t + h * 0.3, cx, t);
  });
  function drop(cx, cy, w, h, c, o) {
    o = o || {};
    shape(dropT(cx, cy, w, h), rg(cx - w * 0.15, cy + h * 0.15, 0, h * 0.6, [[0, mixW(c, 0.55)], [0.5, c], [1, mixK(c, 0.5)]]), o);
    spec(cx - w * 0.15, cy + h * 0.1, w * 0.16, 0.85);
  }
  const heartT = (cx, cy, s) => path(() => {
    const t = cy - s * 0.42;
    X.moveTo(cx, t + s * 0.18);
    X.bezierCurveTo(cx - s * 0.02, t - s * 0.1, cx - s * 0.58, t - s * 0.12, cx - s * 0.5, t + s * 0.25);
    X.bezierCurveTo(cx - s * 0.44, t + s * 0.55, cx - s * 0.1, t + s * 0.72, cx, cy + s * 0.5);
    X.bezierCurveTo(cx + s * 0.1, t + s * 0.72, cx + s * 0.44, t + s * 0.55, cx + s * 0.5, t + s * 0.25);
    X.bezierCurveTo(cx + s * 0.58, t - s * 0.12, cx + s * 0.02, t - s * 0.1, cx, t + s * 0.18);
  });
  function heart(cx, cy, s, c, o) {
    shape(heartT(cx, cy, s), rg(cx - s * 0.2, cy - s * 0.2, 0, s * 0.75, [[0, mixW(c, 0.5)], [0.5, c], [1, mixK(c, 0.5)]]), o);
    spec(cx - s * 0.24, cy - s * 0.2, s * 0.13, 0.8);
  }
  /** skull, r = cranium radius; total height ≈ 2.3r */
  function skull(cx, cy, r, c, o) {
    o = o || {}; c = c || BONE;
    shape(union(circ(cx, cy - r * 0.15, r), rr(cx - r * 0.62, cy + r * 0.2, r * 1.24, r * 0.95, r * 0.28)), sphere(c, cx, cy - r * 0.2, r * 1.15), o);
    const ec = o.eyes || INK;
    fill(ell(cx - r * 0.4, cy - r * 0.05, r * 0.3, r * 0.34, -0.25), ec); fill(ell(cx + r * 0.4, cy - r * 0.05, r * 0.3, r * 0.34, 0.25), ec);
    if (o.glow) { glow(cx - r * 0.4, cy - r * 0.05, r * 0.35, o.glow, 0.9); glow(cx + r * 0.4, cy - r * 0.05, r * 0.35, o.glow, 0.9); fill(circ(cx - r * 0.4, cy - r * 0.05, r * 0.12), o.glow); fill(circ(cx + r * 0.4, cy - r * 0.05, r * 0.12), o.glow); }
    fill(poly([[cx, cy + r * 0.2], [cx - r * 0.14, cy + r * 0.48], [cx + r * 0.14, cy + r * 0.48]]), ec);
    line(open(() => { for (let i = -1; i <= 1; i++) { X.moveTo(cx + i * r * 0.28, cy + r * 0.74); X.lineTo(cx + i * r * 0.28, cy + r * 1.08); } }), 'rgba(30,20,40,0.55)', r * 0.1, { ol: 0 });
  }
  const gearT = (cx, cy, ro, ri, n, rot = 0) => path(() => {
    for (let i = 0; i < n; i++) {
      const a0 = rot + i * TAU / n, s = TAU / n;
      [[a0 - s * 0.24, ri], [a0 - s * 0.14, ro], [a0 + s * 0.14, ro], [a0 + s * 0.24, ri]].forEach(([a, r], j) => {
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); (i === 0 && j === 0) ? X.moveTo(px, py) : X.lineTo(px, py);
      });
    }
  });
  function gear(cx, cy, ro, n, c, o) {
    o = o || {};
    const ri = ro * 0.78;
    shape(gearT(cx, cy, ro, ri, n, o.rot || 0), o.fill || mat(c, cx - ro, cy - ro, cx + ro, cy + ro));
    shape(circ(cx, cy, ro * (o.hole || 0.32)), o.holeFill || lg(cx - ro, cy - ro, cx + ro, cy + ro, [[0, '#1a1424'], [1, '#3a3040']]), { ol: OLW * 0.7, light: 0.15, dark: 0.2 });
  }
  /** crown: box (cx,cy,w,h) */
  function crown(cx, cy, w, h, o) {
    o = o || {};
    const l = cx - w / 2, r = cx + w / 2, b = cy + h / 2, t = cy - h / 2, bh = h * 0.3;
    const m = o.metal || 'gold';
    shape(path(() => { X.moveTo(l, b - bh); X.lineTo(l, t + h * 0.22); X.lineTo(cx - w * 0.26, b - bh - h * 0.12); X.lineTo(cx, t); X.lineTo(cx + w * 0.26, b - bh - h * 0.12); X.lineTo(r, t + h * 0.22); X.lineTo(r, b - bh); }), metal(m, l, t, r, b));
    shape(rr(l - 1, b - bh, w + 2, bh, 2), metal(m, l, b - bh, r, b));
    const gems = o.gems || ['#d8342c', '#3a7fe0', '#d8342c'];
    [[l, t + h * 0.22], [cx, t], [r, t + h * 0.22]].forEach(([px, py], i) => shape(circ(px, py + h * 0.02, h * 0.09), metal(m, px - 3, py - 3, px + 3, py + 3), { ol: OLW * 0.6 }));
    [[cx - w * 0.28, b - bh / 2], [cx, b - bh / 2], [cx + w * 0.28, b - bh / 2]].forEach(([px, py], i) => shape(circ(px, py, h * 0.1), gem(gems[i], px, py, h * 0.1), { ol: OLW * 0.6, light: 0.3 }));
  }
  /** closed book (front cover) — c cover color. o: {corners (metal), emblem(fn), gems (n), gemColor, bookmark} */
  function book(cx, cy, w, h, c, o) {
    o = o || {};
    const l = cx - w / 2, t = cy - h / 2;
    shape(rr(l + w * 0.08, t + h * 0.05, w * 0.94, h * 0.97, 2), metal('bone', l, t, l + w, t + h), { light: 0.3 });
    line(open(() => { for (let i = 1; i <= 3; i++) { X.moveTo(l + w * 0.98, t + h * 0.15 + i * h * 0.2); X.lineTo(l + w * 1.0, t + h * 0.15 + i * h * 0.2); } }), 'rgba(90,70,40,0.5)', 1, { ol: 0 });
    shape(rr(l, t, w * 0.92, h * 0.94, w * 0.06), mat(c, l, t, l + w, t + h, 0.35, 0.5));
    fill(rr(l, t, w * 0.17, h * 0.94, w * 0.05), lg(l, t, l + w * 0.17, t, [[0, mixK(c, 0.45)], [0.6, mixK(c, 0.2)], [1, mixK(c, 0.5)]]));
    line(rr(l + w * 0.27, t + h * 0.1, w * 0.55, h * 0.74, 2), o.border || 'rgba(255,225,150,0.55)', 1.3, { ol: 0 });
    if (o.corners) {
      const cm = o.corners;
      [[l + w * 0.2, t], [l + w * 0.92, t], [l + w * 0.2, t + h * 0.94], [l + w * 0.92, t + h * 0.94]].forEach(([px, py], i) => {
        const sx = i % 2 ? -1 : 1, sy = i < 2 ? 1 : -1;
        shape(poly([[px, py], [px + sx * w * 0.16, py], [px, py + sy * h * 0.16]]), metal(cm, px, py, px + sx * 8, py + sy * 8), { ol: OLW * 0.6, light: 0.5 });
      });
    }
    if (o.emblem) o.emblem(cx + w * 0.05, cy - h * 0.02);
    if (o.gems) {
      const n = o.gems, gc = o.gemColor || '#ffd27a', gr = Math.min(h * 0.07, w * 0.065);
      for (let i = 0; i < n; i++) { const py = cy - h * 0.02 + (i - (n - 1) / 2) * gr * 2.3; if (n >= 4) glow(l + w * 0.085, py, gr * 2.2, gc, 0.6); shape(circ(l + w * 0.085, py, gr), gem(gc, l + w * 0.085, py, gr), { ol: OLW * 0.5, light: 0.3 }); }
    }
  }
  /** open book: two pages */
  function openBook(cx, cy, w, h, c, o) {
    o = o || {};
    const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
    shape(path(() => { X.moveTo(l, t + h * 0.15); X.quadraticCurveTo(cx - w * 0.2, t + h * 0.3, cx, t + h * 0.22); X.quadraticCurveTo(cx + w * 0.2, t + h * 0.3, r, t + h * 0.15); X.lineTo(r, b - h * 0.08); X.quadraticCurveTo(cx + w * 0.2, b - h * 0.14, cx, b); X.quadraticCurveTo(cx - w * 0.2, b - h * 0.14, l, b - h * 0.08); }), mat(c, l, t, r, b, 0.3, 0.5));
    const pageL = path(() => { X.moveTo(l + w * 0.06, t + h * 0.2); X.quadraticCurveTo(cx - w * 0.2, t + h * 0.34, cx - w * 0.02, t + h * 0.28); X.lineTo(cx - w * 0.02, b - h * 0.12); X.quadraticCurveTo(cx - w * 0.2, b - h * 0.24, l + w * 0.06, b - h * 0.18); });
    const pageR = path(() => { X.moveTo(r - w * 0.06, t + h * 0.2); X.quadraticCurveTo(cx + w * 0.2, t + h * 0.34, cx + w * 0.02, t + h * 0.28); X.lineTo(cx + w * 0.02, b - h * 0.12); X.quadraticCurveTo(cx + w * 0.2, b - h * 0.24, r - w * 0.06, b - h * 0.18); });
    shape(pageL, lg(l, t, cx, b, [[0, '#fff9e8'], [1, '#d9c9a0']]), { ol: OLW * 0.6, light: 0.3, dark: 0.35 });
    shape(pageR, lg(cx, t, r, b, [[0, '#f6ecd4'], [1, '#cdbb92']]), { ol: OLW * 0.6, light: 0.3, dark: 0.35 });
    // text lines
    line(open(() => { for (let i = 0; i < 3; i++) { const py = t + h * 0.42 + i * h * 0.12; X.moveTo(l + w * 0.14, py + i * 0.5); X.lineTo(cx - w * 0.1, py + 2); X.moveTo(cx + w * 0.1, py + 2); X.lineTo(r - w * 0.14, py + i * 0.5); } }), 'rgba(70,50,30,0.45)', 1.2, { ol: 0 });
    if (o.rune) o.rune(cx + w * 0.24, cy + h * 0.05);
  }
  /** boot: box centered (cx,cy), size s */
  function boot(cx, cy, s, c, o) {
    o = o || {}; c = c || WOOD;
    const t = union(rr(cx - s * 0.3, cy - s * 0.5, s * 0.36, s * 0.78, s * 0.06), rr(cx - s * 0.3, cy + s * 0.04, s * 0.8, s * 0.42, s * 0.14));
    shape(t, mat(c, cx - s * 0.3, cy - s * 0.5, cx + s * 0.5, cy + s * 0.5));
    shape(rr(cx - s * 0.32, cy + s * 0.34, s * 0.84, s * 0.15, s * 0.06), mat('#2e1c12', cx - s * 0.3, cy + s * 0.3, cx + s * 0.5, cy + s * 0.5), { light: 0.35 });
    shape(rr(cx - s * 0.34, cy - s * 0.54, s * 0.44, s * 0.15, s * 0.05), mat(mixW(c, 0.25), cx - s * 0.3, cy - s * 0.55, cx + s * 0.1, cy - s * 0.4));
    line(open(() => { for (let i = 0; i < 3; i++) { const py = cy - s * 0.3 + i * s * 0.11; X.moveTo(cx - s * 0.2, py); X.lineTo(cx - s * 0.04, py + s * 0.05); } }), 'rgba(255,230,180,0.5)', s * 0.035, { ol: 0 });
  }
  /** eye: almond (cx,cy,w,h) */
  function eye(cx, cy, w, h, iris, o) {
    o = o || {};
    const t = path(() => { X.moveTo(cx - w / 2, cy); X.quadraticCurveTo(cx, cy - h, cx + w / 2, cy); X.quadraticCurveTo(cx, cy + h, cx - w / 2, cy); });
    shape(t, lg(cx, cy - h, cx, cy + h, [[0, '#fffaf0'], [1, '#bfb6a4']]), { light: 0.3 });
    X.save(); t(); X.clip();
    shape(circ(cx, cy, h * 0.62), sphere(iris || '#3a7fe0', cx, cy, h * 0.62), { ol: OLW * 0.6, light: 0.4 });
    fill(circ(cx, cy, h * 0.3), INK); spec(cx - h * 0.2, cy - h * 0.24, h * 0.14, 0.95);
    X.restore();
  }
  /** wing (right-facing), shoulder at (x,y), span w, height h. mirror with sx=-1 */
  const wingT = (x, y, w, h, sx = 1) => path(() => {
    const fx = px => x + sx * w * px, fy = py => y + h * py;
    X.moveTo(fx(0), fy(0.1)); X.quadraticCurveTo(fx(0.25), fy(-0.55), fx(1), fy(-0.5));
    X.quadraticCurveTo(fx(0.95), fy(-0.2), fx(0.82), fy(0.05)); X.quadraticCurveTo(fx(0.9), fy(0.2), fx(0.72), fy(0.3));
    X.quadraticCurveTo(fx(0.72), fy(0.45), fx(0.52), fy(0.48)); X.quadraticCurveTo(fx(0.5), fy(0.62), fx(0.3), fy(0.6));
    X.quadraticCurveTo(fx(0.2), fy(0.7), fx(0.05), fy(0.5)); X.quadraticCurveTo(fx(0.02), fy(0.4), fx(0), fy(0.1));
  });
  function wing(x, y, w, h, sx, c, o) {
    o = o || {};
    shape(wingT(x, y, w, h, sx), lg(x, y - h * 0.5, x + sx * w * 0.6, y + h * 0.5, [[0, mixW(c, 0.6)], [0.5, c], [1, mixK(c, 0.35)]]), o);
    line(open(() => { [[0.82, 0.05, 0.3, -0.2], [0.72, 0.3, 0.25, -0.05], [0.52, 0.48, 0.18, 0.1]].forEach(([ax, ay, bx, by]) => { X.moveTo(x + sx * w * ax, y + h * ay); X.quadraticCurveTo(x + sx * w * (ax + bx) / 2, y + h * (ay + by) / 2 - h * 0.05, x + sx * w * bx, y + h * by); }); }), 'rgba(30,20,50,0.35)', 1.2, { ol: 0 });
  }
  /** projectile arrow from (x0,y0) to (x1,y1) (tip) */
  function arrow(x0, y0, x1, y1, o) {
    o = o || {};
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), sw = o.w || 2.6;
    X.save(); X.translate(x0, y0); X.rotate(a);
    line(seg(L * 0.12, 0, L - sw * 2.2, 0), metal(o.shaft || 'wood', 0, -2, 0, 2), sw, { hi: true });
    const fc = o.fletch || '#d9d0c0';
    shape(poly([[0, 0], [sw * 3.2, -sw * 1.6], [sw * 4.2, -sw * 1.6], [sw * 2, 0], [sw * 4.2, sw * 1.6], [sw * 3.2, sw * 1.6]]), mat(fc, 0, -4, 10, 4), { ol: OLW * 0.7 });
    shape(poly([[L, 0], [L - sw * 3.4, -sw * 1.5], [L - sw * 2.6, 0], [L - sw * 3.4, sw * 1.5]]), metal(o.head || 'steel', L - sw * 3, -3, L, 3), { light: 0.7 });
    X.restore();
  }
  /** fat UI arrow (chevron-arrow) centered (cx,cy), pointing along ang (0 = right) */
  function fatArrow(cx, cy, L, w, ang, f, o) {
    X.save(); X.translate(cx, cy); X.rotate(ang);
    const hw = w * 1.7, hl = L * 0.45;
    shape(poly([[L / 2, 0], [L / 2 - hl, -hw / 2], [L / 2 - hl, -w / 2], [-L / 2, -w / 2], [-L / 2, w / 2], [L / 2 - hl, w / 2], [L / 2 - hl, hw / 2]]), f || metal('gold', -L / 2, -hw / 2, L / 2, hw / 2), o);
    X.restore();
  }
  /** chevron (V) pointing along ang, centered */
  function chevron(cx, cy, s, ang, f, o) {
    X.save(); X.translate(cx, cy); X.rotate(ang);
    shape(poly([[s * 0.45, 0], [-s * 0.1, -s * 0.5], [-s * 0.45, -s * 0.5], [s * 0.05, 0], [-s * 0.45, s * 0.5], [-s * 0.1, s * 0.5]]), f || metal('gold', -s / 2, -s / 2, s / 2, s / 2), o);
    X.restore();
  }
  /** elongated crystal, tip up, box (cx,cy,w,h), ang rotation */
  function crystal(cx, cy, w, h, c, ang, o) {
    o = o || {};
    X.save(); X.translate(cx, cy); X.rotate(ang || 0);
    if (o.glow !== false) glow(0, 0, Math.max(w, h) * 0.75, c, 0.55);
    const t = poly([[0, -h / 2], [w / 2, -h / 2 + h * 0.24], [w * 0.38, h / 2], [-w * 0.38, h / 2], [-w / 2, -h / 2 + h * 0.24]]);
    shape(t, lg(-w / 2, -h / 2, w / 2, h / 2, [[0, mixW(c, 0.7)], [0.4, mixW(c, 0.15)], [0.75, c], [1, mixK(c, 0.55)]]), { light: 0.6, dark: 0.35 });
    fill(poly([[0, -h / 2], [-w / 2, -h / 2 + h * 0.24], [-w * 0.38, h / 2], [-w * 0.05, h * 0.42], [-w * 0.12, -h / 2 + h * 0.3]]), al(mixK(c, 0.35), 0.5));
    fill(poly([[0, -h / 2], [w / 2, -h / 2 + h * 0.24], [w * 0.16, -h / 2 + h * 0.3]]), 'rgba(255,255,255,0.55)');
    line(seg(-w * 0.1, -h * 0.25, -w * 0.1, h * 0.3), 'rgba(255,255,255,0.45)', w * 0.1, { ol: 0 });
    X.restore();
  }
  /** coin: ellipse cylinder at (cx,cy) top-center, rx,ry, thickness t */
  function coin(cx, cy, rx, ry, t, o) {
    o = o || {};
    const m = o.metal || 'gold';
    shape(path(() => { X.moveTo(cx + rx, cy); X.lineTo(cx + rx, cy + t); X.ellipse(cx, cy + t, rx, ry, 0, 0, PI); X.lineTo(cx - rx, cy); X.ellipse(cx, cy, rx, ry, 0, PI, 0, true); }), metal(m, cx - rx, cy, cx + rx, cy + t), { light: 0.3 });
    shape(ell(cx, cy, rx, ry), lg(cx - rx, cy - ry, cx + rx, cy + ry, [[0, METAL[m][0]], [0.5, METAL[m][1]], [1, METAL[m][2]]]), { light: 0.6 });
    line(ell(cx, cy, rx * 0.68, ry * 0.68), al(METAL[m][2], 0.7), Math.max(0.8, rx * 0.06), { ol: 0 });
    if (o.emblem) o.emblem(cx, cy);
  }
  /** wooden/metal staff along angle with optional orb. */
  function staff(cx, cy, L, ang, o) {
    o = o || {};
    X.save(); X.translate(cx, cy); X.rotate(ang || 0);
    line(seg(0, -L / 2 + (o.orb ? L * 0.12 : 0), 0, L / 2), metal(o.wood || 'wood', -3, 0, 3, 0), o.w || L * 0.09, { hi: true });
    if (o.orb) { const r = L * 0.13; glow(0, -L / 2 + r, r * 2.4, o.orb, 0.8); shape(circ(0, -L / 2 + r, r), sphere(o.orb, 0, -L / 2 + r, r), { light: 0.7 }); spec(-r * 0.3, -L / 2 + r * 0.65, r * 0.3, 0.9); }
    if (o.bands) for (let i = 0; i < 2; i++) shape(rr(-L * 0.06, -L * 0.1 + i * L * 0.3, L * 0.12, L * 0.05, 1), metal('gold', -3, 0, 3, 0), { ol: OLW * 0.6 });
    X.restore();
  }
  /** bow (right-facing curve), center (cx,cy), height h. o.arrow draws nocked arrow */
  function bow(cx, cy, h, o) {
    o = o || {};
    const bx = cx - h * 0.1, w = h * 0.42;
    line(open(() => { X.moveTo(bx, cy - h / 2); X.quadraticCurveTo(bx + w * 1.8, cy, bx, cy + h / 2); }), metal(o.wood || 'wood', bx, cy - h / 2, bx + w, cy + h / 2), h * 0.075, { hi: true });
    line(open(() => { X.moveTo(bx, cy - h / 2); X.lineTo(o.drawn ? bx - h * 0.28 : bx - h * 0.03, cy); X.lineTo(bx, cy + h / 2); }), '#e8e0cc', h * 0.03, { ol: OLW * 0.5 });
    shape(rr(bx + w * 0.32, cy - h * 0.1, h * 0.09, h * 0.2, 2), metal('leather', bx, cy, bx + 4, cy), { ol: OLW * 0.6 });
    if (o.arrow) arrow(bx - h * 0.28, cy, bx + w * 1.15, cy, { w: h * 0.045 });
  }
  /** axe head at (cx,cy) attached to handle along ang (handle points down) */
  function axe(cx, cy, L, ang, o) {
    o = o || {};
    X.save(); X.translate(cx, cy); X.rotate(ang || 0);
    line(seg(0, -L * 0.42, 0, L / 2), metal('wood', -3, 0, 3, 0), L * 0.085, { hi: true });
    const hy = -L * 0.3, hw = L * 0.34, hh = L * 0.3;
    const headT = path(() => { X.moveTo(-L * 0.02, hy - hh * 0.35); X.quadraticCurveTo(hw * 0.5, hy - hh * 0.9, hw, hy - hh * 0.55); X.quadraticCurveTo(hw * 0.75, hy, hw, hy + hh * 0.55); X.quadraticCurveTo(hw * 0.5, hy + hh * 0.9, -L * 0.02, hy + hh * 0.35); });
    shape(headT, metal(o.metal || 'steel', -hw * 0.2, hy - hh, hw, hy + hh), { light: 0.7 });
    if (o.double) { X.save(); X.scale(-1, 1); shape(headT, metal(o.metal || 'steel', -hw * 0.2, hy - hh, hw, hy + hh), { light: 0.7 }); X.restore(); }
    shape(rr(-L * 0.07, hy - hh * 0.45, L * 0.14, hh * 0.9, 2), metal('iron', -3, hy - hh, 3, hy + hh));
    X.restore();
  }
  /** war hammer / smith hammer: handle along ang (down), head at top */
  function hammer(cx, cy, L, ang, o) {
    o = o || {};
    X.save(); X.translate(cx, cy); X.rotate(ang || 0);
    line(seg(0, -L * 0.3, 0, L / 2), metal('wood', -3, 0, 3, 0), L * 0.09, { hi: true });
    const hw = L * 0.5, hh = L * 0.22, hy = -L * 0.36;
    shape(rr(-hw / 2, hy - hh / 2, hw, hh, L * 0.04), metal(o.metal || 'steel', -hw / 2, hy - hh / 2, hw / 2, hy + hh / 2), { light: 0.7 });
    fill(rr(-hw / 2 + 1, hy - hh / 2 + 1, hw * 0.25, hh - 2, 2), 'rgba(255,255,255,0.18)');
    shape(rr(-L * 0.05, hy - hh / 2 - 1, L * 0.1, hh + 2, 1), metal('iron', -3, hy - hh, 3, hy + hh), { ol: OLW * 0.6 });
    X.restore();
  }
  function anvil(cx, cy, w, h, o) {
    o = o || {};
    const l = cx - w / 2, t = cy - h / 2, b = cy + h / 2;
    const m = o.metal || 'iron';
    shape(path(() => { X.moveTo(l + w * 0.2, b); X.lineTo(l + w * 0.8, b); X.lineTo(l + w * 0.8, b - h * 0.18); X.lineTo(l + w * 0.62, b - h * 0.3); X.lineTo(l + w * 0.38, b - h * 0.3); X.lineTo(l + w * 0.2, b - h * 0.18); }), metal(m, l, t, l + w, b));
    shape(path(() => { X.moveTo(l, t + h * 0.22); X.quadraticCurveTo(l + w * 0.1, t, l + w * 0.3, t); X.lineTo(l + w, t); X.lineTo(l + w, t + h * 0.38); X.lineTo(l + w * 0.68, t + h * 0.5); X.lineTo(l + w * 0.3, t + h * 0.5); X.lineTo(l + w * 0.3, t + h * 0.38); X.lineTo(l + w * 0.1, t + h * 0.36); }), metal(m, l, t, l + w * 0.6, t + h * 0.5), { light: 0.7 });
    fill(rr(l + w * 0.3, t + 1, w * 0.68, h * 0.06, 1), 'rgba(255,255,255,0.35)');
  }
  /** horse head (right facing) box (cx,cy,s) */
  function horseHead(cx, cy, s, c, o) {
    o = o || {}; c = c || '#8a5a34';
    const fx = px => cx + s * px, fy = py => cy + s * py;
    const t = path(() => {
      X.moveTo(fx(-0.35), fy(0.5)); X.lineTo(fx(-0.35), fy(0.1)); X.quadraticCurveTo(fx(-0.4), fy(-0.35), fx(-0.1), fy(-0.45));
      X.lineTo(fx(-0.02), fy(-0.5)); X.lineTo(fx(0.1), fy(-0.35)); X.quadraticCurveTo(fx(0.3), fy(-0.3), fx(0.5), fy(0.02));
      X.quadraticCurveTo(fx(0.52), fy(0.15), fx(0.42), fy(0.16)); X.quadraticCurveTo(fx(0.25), fy(0.18), fx(0.1), fy(0.05));
      X.quadraticCurveTo(fx(0.05), fy(0.25), fx(0.12), fy(0.5));
    });
    shape(t, mat(c, fx(-0.4), fy(-0.5), fx(0.5), fy(0.5)));
    // mane
    shape(path(() => { X.moveTo(fx(-0.12), fy(-0.42)); X.quadraticCurveTo(fx(-0.3), fy(-0.3), fx(-0.28), fy(0)); X.quadraticCurveTo(fx(-0.36), fy(0.25), fx(-0.35), fy(0.5)); X.lineTo(fx(-0.2), fy(0.5)); X.quadraticCurveTo(fx(-0.16), fy(0.2), fx(-0.12), fy(0)); X.quadraticCurveTo(fx(-0.05), fy(-0.2), fx(-0.02), fy(-0.5)); }), mat(o.mane || mixK(c, 0.45), fx(-0.4), fy(-0.5), fx(0), fy(0.5)), { ol: OLW * 0.7 });
    fill(ell(fx(0.08), fy(-0.2), s * 0.045, s * 0.06, 0.3), INK); // eye
    fill(ell(fx(0.43), fy(0.07), s * 0.03, s * 0.025), 'rgba(30,20,30,0.7)'); // nostril
  }
  /** helmet (front view) box (cx,cy,s). o: {metal, plume, visor, horns} */
  function helmet(cx, cy, s, o) {
    o = o || {};
    const m = o.metal || 'steel';
    const fx = px => cx + s * px, fy = py => cy + s * py;
    if (o.plume) shape(path(() => { X.moveTo(fx(-0.02), fy(-0.42)); X.quadraticCurveTo(fx(0.05), fy(-0.75), fx(0.35), fy(-0.62)); X.quadraticCurveTo(fx(0.3), fy(-0.5), fx(0.2), fy(-0.4)); }), mat(o.plume, fx(0), fy(-0.75), fx(0.35), fy(-0.4)));
    const dome = path(() => { X.moveTo(fx(-0.42), fy(0.05)); X.quadraticCurveTo(fx(-0.42), fy(-0.5), fx(0), fy(-0.5)); X.quadraticCurveTo(fx(0.42), fy(-0.5), fx(0.42), fy(0.05)); X.lineTo(fx(0.42), fy(0.38)); X.quadraticCurveTo(fx(0.3), fy(0.5), fx(0.15), fy(0.5)); X.lineTo(fx(-0.15), fy(0.5)); X.quadraticCurveTo(fx(-0.3), fy(0.5), fx(-0.42), fy(0.38)); });
    shape(dome, metal(m, fx(-0.42), fy(-0.5), fx(0.42), fy(0.5)), { light: 0.7 });
    // visor slit / face opening
    if (o.visor !== false) {
      fill(rr(fx(-0.3), fy(-0.02), s * 0.6, s * 0.1, s * 0.05), INK);
      fill(poly([[fx(-0.12), fy(0.12)], [fx(0.12), fy(0.12)], [fx(0.16), fy(0.5)], [fx(-0.16), fy(0.5)]]), 'rgba(20,14,30,0.85)');
      line(seg(fx(-0.05), fy(0.14), fx(0.05), fy(0.14)), 'rgba(255,255,255,0.2)', 1, { ol: 0 });
    }
    line(open(() => { X.moveTo(fx(0), fy(-0.5)); X.lineTo(fx(0), fy(-0.05)); }), metal('gold', fx(-0.05), 0, fx(0.05), 0), s * 0.07, { ol: OLW * 0.6 });
    line(open(() => { X.moveTo(fx(-0.42), fy(0.05)); X.lineTo(fx(0.42), fy(0.05)); }), 'rgba(255,255,255,0.25)', 1, { ol: 0 });
    if (o.star) sub(cx, fy(-0.2), 0.3, () => shape(star(32, 32, 16, 7), metal('gold', 20, 20, 44, 44), { ol: OLW * 0.7 }));
  }
  const leafT = (cx, cy, w, h, ang = 0) => path(() => {
    X.save(); const c = Math.cos(ang), s = Math.sin(ang);
    const p = (px, py) => [cx + px * c - py * s, cy + px * s + py * c];
    const a = p(0, -h / 2), b = p(w / 2, -h * 0.1), d = p(0, h / 2), e = p(-w / 2, -h * 0.1);
    X.moveTo(a[0], a[1]); X.quadraticCurveTo(b[0], b[1], d[0], d[1]); X.quadraticCurveTo(e[0], e[1], a[0], a[1]); X.restore();
  });
  function leaf(cx, cy, w, h, c, ang, o) {
    o = o || {}; ang = ang || 0;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const p = (px, py) => [cx + px * cs - py * sn, cy + px * sn + py * cs];
    shape(leafT(cx, cy, w, h, ang), lg(...p(-w / 2, -h / 2), ...p(w / 2, h / 2), [[0, mixW(c, 0.5)], [0.5, c], [1, mixK(c, 0.45)]]), o);
    const t0 = p(0, -h * 0.4), t1 = p(0, h * 0.5);
    line(seg(t0[0], t0[1], t1[0], t1[1]), 'rgba(255,255,220,0.55)', w * 0.06, { ol: 0 });
    line(open(() => { for (let i = 0; i < 3; i++) { const y0 = -h * 0.22 + i * h * 0.2; const a = p(0, y0), b = p(w * 0.3, y0 - h * 0.12), d = p(-w * 0.3, y0 - h * 0.12); X.moveTo(a[0], a[1]); X.lineTo(b[0], b[1]); X.moveTo(a[0], a[1]); X.lineTo(d[0], d[1]); } }), 'rgba(255,255,220,0.35)', w * 0.04, { ol: 0 });
  }
  function snowflake(cx, cy, r, c, o) {
    o = o || {};
    const t = open(() => { for (let i = 0; i < 6; i++) { const a = i * PI / 3; const ex = cx + r * Math.cos(a), ey = cy + r * Math.sin(a); X.moveTo(cx, cy); X.lineTo(ex, ey);
      for (const k of [0.45, 0.72]) { const bx = cx + r * k * Math.cos(a), by = cy + r * k * Math.sin(a); for (const s of [-1, 1]) { const b = a + s * PI / 3; X.moveTo(bx, by); X.lineTo(bx + r * 0.22 * Math.cos(b), by + r * 0.22 * Math.sin(b)); } } } });
    if (o.glow !== false) glow(cx, cy, r * 1.3, c, 0.5);
    line(t, lg(cx - r, cy - r, cx + r, cy + r, [[0, '#ffffff'], [0.5, c], [1, mixK(c, 0.3)]]), r * 0.13, { hi: true });
    shape(hexT(cx, cy, r * 0.2), mixW(c, 0.6), { ol: OLW * 0.6 });
  }
  const boltT = (cx, cy, w, h) => poly([[cx + w * 0.25, cy - h / 2], [cx - w * 0.3, cy + h * 0.08], [cx + w * 0.02, cy + h * 0.08], [cx - w * 0.22, cy + h / 2], [cx + w * 0.38, cy - h * 0.12], [cx + w * 0.05, cy - h * 0.12]]);
  function bolt(cx, cy, w, h, c, o) {
    o = o || {};
    if (o.glow !== false) glow(cx, cy, h * 0.55, c, 0.6);
    shape(boltT(cx, cy, w, h), lg(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, [[0, '#ffffff'], [0.3, mixW(c, 0.4)], [0.7, c], [1, mixK(c, 0.35)]]), { light: 0.6 });
  }
  /** sun disc with rays */
  function sun(cx, cy, r, c, o) {
    o = o || {}; c = c || GOLD;
    const n = o.rays || 8, rl = o.rayLen || r * 0.9;
    glow(cx, cy, r * 2.2, c, 0.55);
    shape(path(() => { for (let i = 0; i < n * 2; i++) { const a = -PI / 2 + i * PI / n; const rad = i % 2 ? r * 1.05 : r + (i % 4 === 0 ? rl : rl * 0.62); const px = cx + rad * Math.cos(a), py = cy + rad * Math.sin(a); i ? X.lineTo(px, py) : X.moveTo(px, py); } }), lg(cx - r * 2, cy - r * 2, cx + r * 2, cy + r * 2, [[0, mixW(c, 0.6)], [0.5, c], [1, mixK(c, 0.3)]]), { light: 0.5, dark: 0.3 });
    shape(circ(cx, cy, r), sphere(mixW(c, 0.2), cx, cy, r), { light: 0.7 });
    if (o.face !== false) fill(circ(cx, cy, r * 0.55), rg(cx, cy, 0, r * 0.55, [[0, '#fffbe6'], [1, al('#fffbe6', 0)]]));
  }
  function crescent(cx, cy, r, c, ang, o) {
    o = o || {};
    X.save(); X.translate(cx, cy); X.rotate(ang || 0);
    const t = path(() => { X.arc(0, 0, r, PI * 0.5, PI * 1.5, false); X.arc(-r * 0.32, 0, r * 0.82, PI * 1.5, PI * 0.5, true); });
    shape(t, lg(-r, -r, r * 0.3, r, [[0, mixW(c, 0.6)], [0.5, c], [1, mixK(c, 0.5)]]), o);
    X.restore();
  }
  /** rune circle */
  function runeRing(cx, cy, r, c, o) {
    o = o || {};
    glow(cx, cy, r * 1.4, c, 0.7);
    line(circ(cx, cy, r), lg(cx - r, cy - r, cx + r, cy + r, [[0, mixW(c, 0.7)], [1, c]]), r * 0.16, { hi: true });
    line(circ(cx, cy, r * 0.62), al(mixW(c, 0.5), 0.9), r * 0.07, { ol: OLW * 0.5 });
    const n = o.ticks || 8;
    line(open(() => { for (let i = 0; i < n; i++) { const a = i * TAU / n; X.moveTo(cx + r * 0.68 * Math.cos(a), cy + r * 0.68 * Math.sin(a)); X.lineTo(cx + r * 0.9 * Math.cos(a), cy + r * 0.9 * Math.sin(a)); } }), mixW(c, 0.8), r * 0.07, { ol: 0 });
  }
  /** tower / castle keep: box (x,y = bottom-left, w,h) */
  function tower(x, y, w, h, c, o) {
    o = o || {}; c = c || '#8a8a92';
    const n = o.merlons || 3, mw = w / (n * 2 - 1), mh = h * 0.14;
    shape(union(rr(x, y - h + mh, w, h - mh, 1), poly((() => { const pts = [[x, y - h + mh]]; for (let i = 0; i < n; i++) { const mx = x + i * mw * 2; pts.push([mx, y - h + mh], [mx, y - h], [mx + mw, y - h], [mx + mw, y - h + mh]); } pts.push([x + w, y - h + mh]); return pts; })())), mat(c, x, y - h, x + w, y, 0.4, 0.5));
    if (o.door !== false) fill(path(() => { X.moveTo(x + w * 0.35, y); X.lineTo(x + w * 0.35, y - h * 0.22); X.arc(x + w / 2, y - h * 0.22, w * 0.15, PI, 0); X.lineTo(x + w * 0.65, y); }), lg(x, y - h * 0.4, x, y, [[0, '#3a2a1c'], [1, '#150c08']]));
    if (o.windows !== false) fill(rr(x + w * 0.42, y - h * 0.62, w * 0.16, h * 0.18, w * 0.08), INK);
    line(open(() => { for (let i = 1; i < 3; i++) { X.moveTo(x + 1, y - h * 0.3 * i - 2); X.lineTo(x + w - 1, y - h * 0.3 * i - 2); } }), 'rgba(0,0,20,0.18)', 1, { ol: 0 });
  }
  /** flag on a pole: pole from (x, y0) to (x, y1); flag to the right, width w */
  function flag(x, y0, y1, w, c, c2, o) {
    o = o || {};
    const fh = (y1 - y0) * (o.fh || 0.52), t = y0 + (y1 - y0) * 0.02;
    const ft = o.pennant
      ? path(() => { X.moveTo(x, t); X.quadraticCurveTo(x + w * 0.5, t - fh * 0.12, x + w, t + fh * 0.35); X.quadraticCurveTo(x + w * 0.5, t + fh * 0.55, x, t + fh); })
      : path(() => { X.moveTo(x, t); X.quadraticCurveTo(x + w * 0.5, t - fh * 0.15, x + w, t + fh * 0.05); X.lineTo(x + w * 0.78, t + fh * 0.5); X.lineTo(x + w, t + fh * 0.95); X.quadraticCurveTo(x + w * 0.5, t + fh * 0.8, x, t + fh); });
    shape(ft, lg(x, t, x + w, t + fh, [[0, mixW(c, 0.4)], [0.5, c], [1, mixK(c, 0.4)]]));
    if (c2) { X.save(); ft(); X.clip(); fill(rr(x + w * 0.16, t + fh * 0.28, w * 0.5, fh * 0.44, 2), al(c2, 0.9)); X.restore(); }
    line(seg(x, y0, x, y1), metal('wood', x - 2, 0, x + 2, 0), o.pw || 3, { hi: true });
    shape(circ(x, y0, o.pw ? o.pw * 0.8 : 2.4), metal('gold', x - 3, y0 - 3, x + 3, y0 + 3), { ol: OLW * 0.6 });
  }
  /** scroll (rolled parchment) box */
  function scroll(cx, cy, w, h, o) {
    o = o || {};
    const l = cx - w / 2, t = cy - h / 2, rh = h * 0.16;
    shape(rr(l + w * 0.1, t + rh * 0.5, w * 0.8, h - rh, 2), lg(l, t, l + w, t + h, [[0, '#fbf3de'], [0.6, '#eadcb8'], [1, '#c9b58a']]), { light: 0.3 });
    line(open(() => { for (let i = 0; i < 3; i++) { const py = t + h * 0.32 + i * h * 0.15; X.moveTo(l + w * 0.24, py); X.lineTo(l + w * 0.76 - (i === 2 ? w * 0.2 : 0), py); } }), 'rgba(70,50,30,0.5)', h * 0.04, { ol: 0 });
    for (const py of [t, t + h - rh]) { shape(rr(l, py, w, rh, rh / 2), lg(l, py, l, py + rh, [[0, '#fff8e6'], [0.4, '#e6d7ae'], [1, '#a8935f']]), { light: 0.5 }); fill(circ(l + rh / 2, py + rh / 2, rh * 0.28), '#b8a070'); fill(circ(l + w - rh / 2, py + rh / 2, rh * 0.28), '#b8a070'); }
    if (o.seal) shape(circ(cx + w * 0.22, cy + h * 0.2, h * 0.13), sphere(o.seal, cx + w * 0.22, cy + h * 0.2, h * 0.13), { ol: OLW * 0.6 });
  }
  function potion(cx, cy, s, c, o) {
    o = o || {};
    const t = path(() => { X.moveTo(cx - s * 0.12, cy - s * 0.5); X.lineTo(cx + s * 0.12, cy - s * 0.5); X.lineTo(cx + s * 0.12, cy - s * 0.18); X.quadraticCurveTo(cx + s * 0.5, cy - s * 0.05, cx + s * 0.4, cy + s * 0.3); X.quadraticCurveTo(cx + s * 0.32, cy + s * 0.5, cx, cy + s * 0.5); X.quadraticCurveTo(cx - s * 0.32, cy + s * 0.5, cx - s * 0.4, cy + s * 0.3); X.quadraticCurveTo(cx - s * 0.5, cy - s * 0.05, cx - s * 0.12, cy - s * 0.18); });
    glow(cx, cy + s * 0.15, s * 0.5, c, 0.5);
    shape(t, lg(cx - s * 0.4, cy - s * 0.5, cx + s * 0.4, cy + s * 0.5, [[0, 'rgba(230,240,255,0.75)'], [1, 'rgba(120,140,170,0.55)']]), { light: 0.6 });
    X.save(); t(); X.clip();
    fill(path(() => { X.moveTo(cx - s * 0.5, cy + s * 0.02); X.quadraticCurveTo(cx - s * 0.2, cy - s * 0.06, cx, cy + s * 0.02); X.quadraticCurveTo(cx + s * 0.2, cy + s * 0.1, cx + s * 0.5, cy + s * 0.02); X.lineTo(cx + s * 0.5, cy + s * 0.6); X.lineTo(cx - s * 0.5, cy + s * 0.6); }), rg(cx - s * 0.1, cy + s * 0.25, 0, s * 0.45, [[0, mixW(c, 0.4)], [0.6, c], [1, mixK(c, 0.4)]]));
    fill(circ(cx + s * 0.12, cy + s * 0.22, s * 0.05), 'rgba(255,255,255,0.5)'); fill(circ(cx - s * 0.05, cy + s * 0.32, s * 0.035), 'rgba(255,255,255,0.4)');
    X.restore();
    line(seg(cx - s * 0.32, cy - s * 0.42, cx - s * 0.32, cy + s * 0.2), 'rgba(255,255,255,0.45)', s * 0.06, { ol: 0 });
    shape(rr(cx - s * 0.16, cy - s * 0.62, s * 0.32, s * 0.16, 2), metal('wood', cx - 4, cy - s * 0.62, cx + 4, cy - s * 0.46));
  }
  function hourglass(cx, cy, s, o) {
    o = o || {};
    const sc = o.sand || '#f0d070';
    const t = path(() => { X.moveTo(cx - s * 0.3, cy - s * 0.42); X.lineTo(cx + s * 0.3, cy - s * 0.42); X.quadraticCurveTo(cx + s * 0.3, cy - s * 0.05, cx + s * 0.06, cy); X.quadraticCurveTo(cx + s * 0.3, cy + s * 0.05, cx + s * 0.3, cy + s * 0.42); X.lineTo(cx - s * 0.3, cy + s * 0.42); X.quadraticCurveTo(cx - s * 0.3, cy + s * 0.05, cx - s * 0.06, cy); X.quadraticCurveTo(cx - s * 0.3, cy - s * 0.05, cx - s * 0.3, cy - s * 0.42); });
    shape(t, lg(cx - s * 0.3, cy - s * 0.4, cx + s * 0.3, cy + s * 0.4, [[0, 'rgba(235,245,255,0.7)'], [1, 'rgba(130,150,180,0.5)']]), { light: 0.5 });
    X.save(); t(); X.clip();
    fill(poly([[cx - s * 0.26, cy - s * 0.2], [cx + s * 0.26, cy - s * 0.2], [cx + s * 0.02, cy - s * 0.02], [cx - s * 0.02, cy - s * 0.02]]), mat(sc, cx - s * 0.3, cy - s * 0.3, cx + s * 0.3, cy));
    fill(poly([[cx - s * 0.3, cy + s * 0.45], [cx + s * 0.3, cy + s * 0.45], [cx + s * 0.3, cy + s * 0.3], [cx, cy + s * 0.14], [cx - s * 0.3, cy + s * 0.3]]), mat(sc, cx - s * 0.3, cy + s * 0.1, cx + s * 0.3, cy + s * 0.45));
    line(seg(cx, cy - s * 0.02, cx, cy + s * 0.2), sc, s * 0.04, { ol: 0 });
    X.restore();
    for (const py of [cy - s * 0.5, cy + s * 0.36]) shape(rr(cx - s * 0.38, py, s * 0.76, s * 0.14, 2), metal(o.metal || 'wood', cx - s * 0.38, py, cx + s * 0.38, py + s * 0.14));
    line(open(() => { X.moveTo(cx - s * 0.34, cy - s * 0.36); X.lineTo(cx - s * 0.34, cy + s * 0.36); X.moveTo(cx + s * 0.34, cy - s * 0.36); X.lineTo(cx + s * 0.34, cy + s * 0.36); }), metal(o.metal || 'wood', 0, cy - s * 0.4, 0, cy + s * 0.4), s * 0.06, { ol: OLW * 0.6 });
  }
  /** cloud: union of puffs, box (cx,cy,w,h) */
  function cloud(cx, cy, w, h, c, o) {
    o = o || {}; c = c || '#e8ecf2';
    const t = union(ell(cx, cy + h * 0.15, w * 0.5, h * 0.32), circ(cx - w * 0.2, cy - h * 0.05, h * 0.36), circ(cx + w * 0.12, cy - h * 0.18, h * 0.42), circ(cx + w * 0.32, cy + h * 0.05, h * 0.3));
    shape(t, lg(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, [[0, mixW(c, 0.6)], [0.5, c], [1, mixK(c, 0.4)]]), o);
  }
  /** motion slash arc from angle a0 to a1 */
  function slash(cx, cy, r, a0, a1, c, w, o) {
    o = o || {};
    line(arcT(cx, cy, r, a0, a1), lg(cx - r, cy - r, cx + r, cy + r, [[0, al(c, 0)], [0.5, c], [1, mixW(c, 0.7)]]), w, { ol: o.ol === undefined ? OLW * 0.6 : o.ol, cap: 'round' });
  }
  /** sparkle: 4-point star */
  function sparkle(cx, cy, r, c, o) {
    o = o || {};
    if (o.glow !== false) glow(cx, cy, r * 1.6, c, 0.7);
    shape(star(cx, cy, r, r * 0.28, 4), lg(cx - r, cy - r, cx + r, cy + r, [[0, '#ffffff'], [0.5, mixW(c, 0.5)], [1, c]]), { ol: o.ol === undefined ? OLW * 0.7 : o.ol, light: 0.5 });
  }
  /** figure (pop): head + shoulders */
  function figure(cx, cy, s, c, o) {
    o = o || {};
    const t = union(circ(cx, cy - s * 0.25, s * 0.2), path(() => { X.moveTo(cx - s * 0.42, cy + s * 0.5); X.lineTo(cx - s * 0.42, cy + s * 0.2); X.quadraticCurveTo(cx - s * 0.42, cy - s * 0.02, cx - s * 0.15, cy - s * 0.02); X.lineTo(cx + s * 0.15, cy - s * 0.02); X.quadraticCurveTo(cx + s * 0.42, cy - s * 0.02, cx + s * 0.42, cy + s * 0.2); X.lineTo(cx + s * 0.42, cy + s * 0.5); }));
    shape(t, mat(c, cx - s * 0.4, cy - s * 0.5, cx + s * 0.4, cy + s * 0.5), o);
  }
  /** simple hand (palm up-ish, open) — used for casting/support */
  function hand(cx, cy, s, c, o) {
    o = o || {}; c = c || '#e0b090';
    const fx = px => cx + s * px, fy = py => cy + s * py;
    const t = union(
      rr(fx(-0.3), fy(-0.05), s * 0.6, s * 0.5, s * 0.1),
      rr(fx(-0.3), fy(-0.45), s * 0.12, s * 0.5, s * 0.06), rr(fx(-0.14), fy(-0.52), s * 0.12, s * 0.55, s * 0.06),
      rr(fx(0.02), fy(-0.5), s * 0.12, s * 0.55, s * 0.06), rr(fx(0.18), fy(-0.4), s * 0.12, s * 0.45, s * 0.06),
      path(() => { X.moveTo(fx(-0.3), fy(0.1)); X.quadraticCurveTo(fx(-0.55), fy(-0.05), fx(-0.5), fy(-0.22)); X.quadraticCurveTo(fx(-0.42), fy(-0.28), fx(-0.36), fy(-0.15)); X.lineTo(fx(-0.28), fy(0.05)); }));
    shape(t, mat(c, fx(-0.5), fy(-0.5), fx(0.4), fy(0.5)), o);
  }
  function chainLink(cx, cy, w, h, ang, c) {
    X.save(); X.translate(cx, cy); X.rotate(ang);
    line(rr(-w / 2, -h / 2, w, h, Math.min(w, h) / 2), metal(c || 'iron', -w / 2, -h / 2, w / 2, h / 2), Math.min(w, h) * 0.32, { hi: true });
    X.restore();
  }
  /** speech bubble */
  function bubble(cx, cy, w, h, c, o) {
    shape(union(rr(cx - w / 2, cy - h / 2, w, h * 0.8, h * 0.3), poly([[cx - w * 0.2, cy + h * 0.2], [cx - w * 0.3, cy + h / 2], [cx + w * 0.05, cy + h * 0.25]])), mat(c || '#f4efe4', cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), o);
  }
  function magnifier(cx, cy, s, o) {
    o = o || {};
    X.save(); X.translate(cx, cy);
    const r = s * 0.3;
    line(seg(r * 0.6, r * 0.6, s * 0.48, s * 0.48), metal('wood', 0, 0, s * 0.5, s * 0.5), s * 0.13, { hi: true });
    shape(circ(-s * 0.05, -s * 0.05, r), rg(-s * 0.12, -s * 0.12, 0, r, [[0, 'rgba(220,240,255,0.85)'], [0.7, 'rgba(120,170,220,0.45)'], [1, 'rgba(60,90,140,0.6)']]), { light: 0.6 });
    line(circ(-s * 0.05, -s * 0.05, r), metal('gold', -r, -r, r, r), s * 0.07, { ol: OLW * 0.6 });
    line(arcT(-s * 0.05, -s * 0.05, r * 0.68, PI * 1.1, PI * 1.5), 'rgba(255,255,255,0.8)', s * 0.045, { ol: 0 });
    if (o.inner) o.inner(-s * 0.05, -s * 0.05, r);
    X.restore();
  }
  /** vine: wavy line with leaves along it, from (x0,y0) to (x1,y1) */
  function vine(x0, y0, x1, y1, c, o) {
    o = o || {};
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, n = o.n || 3;
    const pts = []; for (let i = 0; i <= n * 2; i++) { const t = i / (n * 2), s = (i % 2 ? 1 : -1) * L * 0.08; pts.push([x0 + dx * t + nx * s, y0 + dy * t + ny * s]); }
    line(curve(pts, false), mat(c, x0, y0, x1, y1), o.w || 3, { hi: true });
    for (let i = 1; i < n * 2; i += 2) { const p = pts[i]; const a = Math.atan2(dy, dx) + (i % 4 === 1 ? -1 : 1) * 1.2; leaf(p[0] + Math.cos(a) * 4, p[1] + Math.sin(a) * 4, 6, 10, mixW(c, 0.15), a + PI / 2, { ol: OLW * 0.7 }); }
  }
  /** dragon head (right-facing) box (cx,cy,s) */
  function dragonHead(cx, cy, s, c, o) {
    o = o || {}; c = c || '#8a3a2a';
    const fx = px => cx + s * px, fy = py => cy + s * py;
    const t = path(() => {
      X.moveTo(fx(-0.5), fy(0.1)); X.quadraticCurveTo(fx(-0.45), fy(-0.35), fx(-0.1), fy(-0.4)); X.lineTo(fx(-0.2), fy(-0.62)); X.lineTo(fx(0.05), fy(-0.42));
      X.quadraticCurveTo(fx(0.35), fy(-0.4), fx(0.5), fy(-0.1)); X.lineTo(fx(0.5), fy(0.02)); X.lineTo(fx(0.15), fy(0.08)); X.lineTo(fx(0.5), fy(0.3));
      X.quadraticCurveTo(fx(0.2), fy(0.4), fx(0.05), fy(0.28)); X.quadraticCurveTo(fx(-0.2), fy(0.4), fx(-0.5), fy(0.35));
    });
    shape(t, mat(c, fx(-0.5), fy(-0.6), fx(0.5), fy(0.4)));
    fill(ell(fx(-0.05), fy(-0.15), s * 0.08, s * 0.06, 0), '#ffd24a'); fill(ell(fx(-0.04), fy(-0.15), s * 0.025, s * 0.055), INK);
    fill(poly([[fx(0.42), fy(-0.05)], [fx(0.36), fy(0.08)], [fx(0.3), fy(-0.02)]]), BONE);
    fill(poly([[fx(0.3), fy(0.12)], [fx(0.24), fy(0.02)], [fx(0.18), fy(0.12)]]), BONE);
  }

  // ================================================================ registry
  let curGroup = null;
  function group(id) { curGroup = { id, names: [] }; GROUPS.push(curGroup); }
  function reg(name, fn) { REG.set(name, { fn, group: curGroup ? curGroup.id : 'misc' }); if (curGroup) curGroup.names.push(name); }
  function alias(name, target) { const e = REG.get(target); if (e) REG.set(name, e); }

  // ================================================================ RESOURCES
  group('resources');
  reg('gold', () => {
    // stack of coins + one standing coin
    for (let i = 0; i < 3; i++) coin(26, 46 - i * 7, 17, 6.5, 6);
    X.save(); X.translate(46, 40); X.rotate(0.35);
    shape(ell(0, 0, 8, 14), metal('gold', -8, -14, 8, 14), { light: 0.6 });
    line(ell(0, 0, 5.4, 10), 'rgba(120,80,20,0.6)', 1.2, { ol: 0 });
    X.restore();
    sparkle(12, 18, 5, '#fff2b0', { ol: 0 });
  });
  reg('mana', () => {
    crystal(38, 38, 12, 22, '#4a90ff', 0.45, { glow: false });
    crystal(25, 38, 12, 22, '#4a90ff', -0.45, { glow: false });
    crystal(32, 30, 18, 42, '#5aa9ff', 0);
    sparkle(46, 12, 4.5, '#cfe4ff', { ol: 0 });
  });
  reg('knowledge', () => {
    openBook(32, 34, 56, 40, '#5a3a8a', { rune: (rx, ry) => { glow(rx, ry, 10, '#c9a0ff', 0.9); shape(star(rx, ry, 5.5, 2.2, 4), '#f0e0ff', { ol: OLW * 0.5 }); } });
    glow(20, 34, 8, '#c9a0ff', 0.4);
  });
  reg('imperium', () => {
    glow(32, 34, 26, '#8a4fd0', 0.5);
    crown(32, 34, 46, 34);
  });
  reg('food', () => {
    // wheat sheaf: three stalks
    const stalk = (x0, y0, x1, y1) => {
      line(seg(x0, y0, x1, y1), mat('#c9a040', x0, y0, x1, y1), 2.4, { hi: true });
      const a = Math.atan2(y1 - y0, x1 - x0);
      for (let i = 0; i < 4; i++) {
        const t = 0.25 + i * 0.2, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
        for (const s of [-1, 1]) shape(ell(px + Math.cos(a + s * 1.1) * 4, py + Math.sin(a + s * 1.1) * 4, 2.6, 4.6, a + s * 0.8), lg(px - 4, py - 4, px + 4, py + 4, [[0, '#ffe89a'], [1, '#c8902a']]), { ol: OLW * 0.7, light: 0.4 });
      }
      shape(ell(x1, y1, 2.4, 4.4, a + PI / 2), lg(x1 - 3, y1 - 3, x1 + 3, y1 + 3, [[0, '#ffe89a'], [1, '#c8902a']]), { ol: OLW * 0.7 });
    };
    stalk(30, 58, 14, 14); stalk(34, 58, 50, 14); stalk(32, 58, 32, 8);
    shape(rr(24, 44, 16, 7, 3), metal('leather', 24, 44, 40, 51), { ol: OLW * 0.8 });
  });
  reg('production', () => {
    anvil(32, 44, 44, 26);
    hammer(38, 24, 40, 0.75);
  });
  reg('draft', () => {
    helmet(32, 33, 50, { plume: '#c0342a' });
  });
  reg('stability', () => {
    const c = '#7fd4b6';
    line(seg(32, 12, 32, 54), metal('gold', 30, 0, 34, 0), 3.2, { hi: true });
    shape(rr(20, 52, 24, 5, 2), metal('gold', 20, 52, 44, 57));
    line(seg(10, 18, 54, 18), metal('gold', 0, 16, 0, 20), 3, { hi: true });
    shape(circ(32, 12, 3.6), metal('gold', 28, 8, 36, 16));
    for (const px of [12, 52]) {
      line(open(() => { X.moveTo(px, 18); X.lineTo(px - 7, 36); X.moveTo(px, 18); X.lineTo(px + 7, 36); }), 'rgba(230,220,200,0.85)', 1.1, { ol: OLW * 0.4 });
      shape(path(() => { X.moveTo(px - 9, 36); X.quadraticCurveTo(px, 46, px + 9, 36); }), mat(c, px - 9, 34, px + 9, 44), { light: 0.6 });
    }
  });
  reg('pop', () => {
    figure(20, 36, 30, '#c9b28a', { ol: OLW * 0.9 });
    figure(44, 36, 30, '#c9b28a', { ol: OLW * 0.9 });
    figure(32, 32, 36, '#f4e2c2');
  });
  reg('casting', () => {
    hand(30, 40, 34, '#e0b090');
    glow(38, 20, 16, '#8a6cff', 0.9);
    shape(circ(38, 20, 7), sphere('#a88cff', 38, 20, 7), { light: 0.7 }); spec(35.5, 17.5, 2.2);
    sparkle(52, 12, 4, '#e8d8ff', { ol: 0 }); sparkle(24, 12, 3, '#e8d8ff', { ol: 0 }); sparkle(50, 30, 3, '#e8d8ff', { ol: 0 });
  });
  reg('upkeep', () => {
    coin(26, 30, 15, 5.8, 5); coin(26, 37, 15, 5.8, 5, { emblem: null });
    fatArrow(48, 34, 30, 9, PI / 2, lg(40, 18, 56, 50, [[0, '#ff9a7a'], [0.5, '#e0452b'], [1, '#7a1e12']]));
  });

  // ================================================================ AFFINITIES
  group('affinities');
  const affinitySym = {
    order: () => sun(32, 32, 12, '#f2cf62', { rays: 8, rayLen: 13 }),
    chaos: () => flame(32, 33, 40, 54, '#b8261a', '#f05a22', '#ffd86a'),
    nature: () => { glow(32, 32, 24, '#8cd46b', 0.35); leaf(32, 32, 32, 52, '#4f9e3a', 0.55); },
    materium: () => { gear(32, 32, 27, 9, '#c98b2c', { hole: 0.55, holeFill: lg(14, 14, 50, 50, [[0, '#4a2c12'], [1, '#2a1808']]) }); shape(poly([[20, 40], [28, 26], [32, 32], [36, 24], [44, 40]]), lg(20, 24, 44, 40, [[0, '#ffe0a8'], [0.5, '#c07a2a'], [1, '#6a3f12']]), { ol: OLW * 0.7 }); fill(poly([[28, 26], [30.5, 30], [26, 30]]), '#fff4e0'); fill(poly([[36, 24], [38.5, 29], [33.5, 29]]), '#fff4e0'); },
    astral: () => { glow(32, 32, 30, '#5a7ff0', 0.7); line(circ(32, 32, 22), al('#c0ceff', 0.7), 1.6, { ol: OLW * 0.5 }); shape(star(32, 32, 27, 6, 4), lg(10, 10, 54, 54, [[0, '#ffffff'], [0.4, '#a8bcff'], [1, '#3a5fe0']]), { light: 0.6 }); shape(star(32, 32, 11, 4, 4, -PI / 4), '#eef2ff', { ol: OLW * 0.6 }); },
    shadow: () => { glow(32, 32, 28, '#5fe6c0', 0.35); crescent(30, 33, 22, '#7b3fa0', 0.5, { light: 0.5 }); sparkle(46, 18, 5, '#d6b3f0', { ol: 0 }); sparkle(50, 30, 3, '#5fe6c0', { ol: 0 }); },
  };
  for (const id of Object.keys(AFF)) reg(id, affinitySym[id]);
  for (const id of Object.keys(AFF)) reg('affinity_' + id + '_bg', () => {
    shape(circ(32, 32, 29), rg(24, 24, 0, 34, [[0, mixK(AFF[id], 0.2)], [0.7, AFFD[id]], [1, mixK(AFFD[id], 0.5)]]), { light: 0.35, dark: 0.5 });
    line(circ(32, 32, 26), lg(8, 8, 56, 56, [[0, AFFL[id]], [0.5, AFF[id]], [1, AFFD[id]]]), 2.2, { ol: OLW * 0.4 });
    sub(32, 32, 0.66, affinitySym[id]);
  });

  // ================================================================ ROLES
  group('roles');
  reg('role_shield', () => shield(32, 33, 40, 50, '#3a63b0', { boss: true }));
  reg('role_pike', () => {
    line(seg(12, 56, 46, 14), metal('wood', 12, 56, 46, 14), 3.4, { hi: true });
    shape(poly([[46, 14], [56, 6], [52, 18], [50, 12]]), metal('steel', 46, 6, 56, 18), { light: 0.7 });
    shape(poly([[52, 8], [56, 6], [50, 12]]), '#f6f8fb', { ol: 0, bevel: false });
    shape(rr(43.5, 15, 6, 4, 1), metal('iron', 43, 15, 49, 19), { ol: OLW * 0.6 });
    shape(path(() => { X.moveTo(45, 18); X.quadraticCurveTo(40, 30, 30, 30); X.quadraticCurveTo(36, 24, 41, 15); }), mat('#c0342a', 30, 15, 45, 30));
  });
  reg('role_shock', () => { axe(30, 32, 52, 0.55, { double: true }); slash(36, 30, 26, -1.8, -0.4, '#ffffff', 2.2); });
  reg('role_ranged', () => bow(34, 32, 52, { arrow: true, drawn: true }));
  reg('role_support', () => {
    glow(32, 18, 16, '#ffe9a0', 0.8);
    shape(path(() => { X.moveTo(16, 18); X.quadraticCurveTo(18, 38, 32, 40); X.quadraticCurveTo(46, 38, 48, 18); }), metal('gold', 16, 18, 48, 40), { light: 0.6 });
    shape(rr(29, 39, 6, 10, 2), metal('gold', 28, 38, 36, 50)); shape(rr(20, 48, 24, 6, 3), metal('gold', 20, 48, 44, 54));
    fill(ell(32, 18, 16, 4), '#fff7d8'); line(ell(32, 18, 16, 4), 'rgba(120,80,20,0.6)', 1.2, { ol: 0 });
    sparkle(32, 10, 6, '#fff6d0', { ol: 0 }); sparkle(22, 8, 3, '#fff6d0', { ol: 0 }); sparkle(42, 9, 3, '#fff6d0', { ol: 0 });
  });
  reg('role_skirmisher', () => {
    for (let i = 0; i < 3; i++) line(seg(8, 20 + i * 8, 18 + i * 3, 20 + i * 8), 'rgba(255,255,255,0.5)', 1.6, { ol: OLW * 0.4 });
    arrow(16, 52, 56, 10, { w: 3, head: 'steel', fletch: '#c8a060' });
    shape(circ(20, 40, 9), metal('bronze', 12, 32, 28, 48), { light: 0.6 }); shape(circ(20, 40, 3), metal('iron', 17, 37, 23, 43), { ol: OLW * 0.6 });
  });
  reg('role_mage', () => { runeRing(32, 34, 22, '#7b6cff', { ticks: 6 }); shape(circ(32, 34, 10), sphere('#9a86ff', 32, 34, 10), { light: 0.7 }); spec(28, 30, 3); });
  reg('role_polearm', () => {
    line(seg(14, 58, 44, 10), metal('wood', 14, 58, 44, 10), 3.4, { hi: true });
    shape(poly([[44, 10], [52, 2], [50, 14]]), metal('steel', 44, 2, 52, 14), { light: 0.7 });
    shape(path(() => { X.moveTo(41, 15); X.quadraticCurveTo(58, 10, 60, 30); X.quadraticCurveTo(52, 26, 47, 24); }), metal('steel', 41, 10, 60, 30), { light: 0.7 });
    shape(poly([[40, 16], [30, 20], [38, 24]]), metal('steel', 30, 16, 40, 24), { light: 0.6 });
  });
  reg('role_fighter', () => { axe(22, 34, 46, -0.7); sword(40, 32, 50, 0.7); });
  reg('role_cavalry', () => horseHead(32, 32, 56, '#8a5a34'));
  reg('role_siege', () => {
    // catapult
    shape(circ(20, 50, 8), metal('wood', 12, 42, 28, 58)); shape(circ(20, 50, 2.5), metal('iron', 18, 48, 22, 52), { ol: OLW * 0.6 });
    shape(circ(46, 50, 8), metal('wood', 38, 42, 54, 58)); shape(circ(46, 50, 2.5), metal('iron', 44, 48, 48, 52), { ol: OLW * 0.6 });
    shape(poly([[12, 46], [26, 22], [32, 22], [54, 46]]), metal('wood', 12, 22, 54, 46));
    fill(poly([[20, 42], [28, 28], [32, 28], [46, 42]]), 'rgba(20,14,30,0.5)');
    line(seg(30, 44, 14, 12), metal('wood', 14, 12, 30, 44), 3.4, { hi: true });
    shape(path(() => { X.moveTo(9, 14); X.quadraticCurveTo(12, 6, 19, 10); X.lineTo(15, 16); }), metal('leather', 9, 6, 19, 16));
    shape(circ(13, 8, 5), mat('#7a746c', 8, 3, 18, 13));
  });
  reg('role_hero', () => { helmet(32, 35, 46, { plume: '#3a63b0', metal: 'gold' }); glow(32, 12, 12, '#fff2b0', 0.8); shape(star(32, 12, 9, 4), metal('gold', 24, 4, 40, 20), { ol: OLW * 0.7 }); });

  // ================================================================ STATS
  group('stats');
  reg('hp', () => heart(32, 33, 50, '#d8342c'));
  reg('def', () => shield(32, 33, 42, 52, '#8a8f9a', { fill: metal('steel', 12, 8, 52, 58), rim: metal('gold', 12, 8, 52, 58), emblem: () => { line(open(() => { X.moveTo(22, 30); X.lineTo(32, 22); X.lineTo(42, 30); }), 'rgba(40,40,60,0.5)', 3.5, { ol: 0 }); } }));
  reg('res', () => { glow(32, 32, 26, '#8a6cff', 0.5); shield(32, 33, 42, 52, '#5a3a9a', { rim: metal('violet', 12, 8, 52, 58), emblem: () => { glow(32, 30, 12, '#d0c0ff', 0.9); line(open(() => { X.moveTo(32, 18); X.lineTo(32, 44); X.moveTo(24, 26); X.lineTo(40, 26); X.moveTo(26, 38); X.lineTo(32, 32); X.lineTo(38, 38); }), '#ecdfff', 2.6, { ol: OLW * 0.5 }); } }); });
  reg('move', () => { for (let i = 0; i < 3; i++) line(seg(6, 30 + i * 7, 14 + i * 2, 30 + i * 7), 'rgba(255,255,255,0.55)', 1.8, { ol: OLW * 0.4 }); boot(36, 32, 50, '#8a5a34'); });
  reg('ap', () => {
    shape(circ(32, 32, 27), rg(24, 24, 0, 32, [[0, '#3a3450'], [1, '#161226']]), { light: 0.3, dark: 0.5 });
    line(circ(32, 32, 23.5), metal('gold', 8, 8, 56, 56), 1.8, { ol: OLW * 0.4 });
    [[32, 20], [21, 39], [43, 39]].forEach(([px, py]) => { glow(px, py, 9, '#ffd86a', 0.8); shape(circ(px, py, 6), sphere('#ffcc4a', px, py, 6), { light: 0.7 }); spec(px - 2, py - 2, 1.8); });
  });
  reg('morale', () => flag(16, 8, 58, 40, '#c0342a', '#f6e6c8', { pw: 3.4 }));
  reg('xp', () => { glow(32, 32, 30, '#5a7ff0', 0.5); shape(circ(32, 32, 26), rg(26, 26, 0, 30, [[0, '#3a5fb0'], [1, '#1a2a60']]), { light: 0.4 }); line(circ(32, 32, 22.5), metal('gold', 10, 10, 54, 54), 1.6, { ol: OLW * 0.4 }); shape(star(32, 33, 17, 7.5), metal('gold', 15, 16, 49, 50), { light: 0.6 }); spec(27, 27, 3); });
  for (let r = 0; r <= 4; r++) reg('rank_' + r, () => {
    if (r === 0) { shape(circ(32, 36, 14), metal('iron', 18, 22, 46, 50), { light: 0.5 }); shape(circ(32, 36, 7), lg(25, 29, 39, 43, [[0, '#3a3f48'], [1, '#1a1c22']]), { ol: OLW * 0.6, light: 0.2 }); return; }
    const n = Math.min(r, 3);
    for (let i = 0; i < n; i++) { const y = 46 - i * 11 - (n - 1) * 2 + (r === 4 ? 4 : 0); shape(path(() => { X.moveTo(12, y); X.lineTo(32, y - 12); X.lineTo(52, y); X.lineTo(52, y - 6); X.lineTo(32, y - 18); X.lineTo(12, y - 6); }), metal(r === 4 ? 'gold' : r === 1 ? 'bronze' : 'gold', 12, y - 18, 52, y), { light: 0.6 }); }
    if (r === 4) { glow(32, 12, 10, '#fff2b0', 0.8); shape(star(32, 12, 8, 3.5), metal('gold', 24, 4, 40, 20), { ol: OLW * 0.7 }); }
  });
  const TIER = { 1: ['bronze', 'I'], 2: ['silver', 'II'], 3: ['gold', 'III'], 4: ['violet', 'IV'], 5: ['ruby', 'V'] };
  for (let t = 1; t <= 5; t++) reg('tier_' + t, () => {
    const [m, num] = TIER[t];
    if (t >= 4) glow(32, 32, 30, METAL[m][1], 0.5);
    shape(hexT(32, 32, 28), metal(m, 8, 6, 56, 58), { light: 0.6, dark: 0.5 });
    shape(hexT(32, 32, 21), lg(16, 14, 48, 50, [[0, '#2c3448'], [1, '#12161f']]), { ol: OLW * 0.5, light: 0.2, dark: 0.4 });
    text(num, 32, 33, 22, METAL[m][0], { ol: OLW * 0.6 });
  });

  // ================================================================ CHANNELS
  group('channels');
  reg('physical', () => { shape(star(32, 32, 27, 15, 9, -PI / 2), metal('steel', 6, 6, 58, 58), { light: 0.7 }); shape(circ(32, 32, 8), metal('iron', 24, 24, 40, 40)); });
  reg('fire', () => flame(32, 33, 40, 54, '#d0381c', '#ff8c1a', '#ffe680'));
  reg('frost', () => snowflake(32, 32, 26, '#7ad8ff'));
  reg('lightning', () => bolt(32, 32, 34, 54, '#ffe86a'));
  reg('blight', () => { glow(32, 34, 26, '#8ad34a', 0.5); drop(32, 34, 34, 50, '#6fb832'); skull(32, 40, 6.5, '#e8f0d0', { ol: OLW * 0.6 }); fill(circ(22, 20, 3), '#c8f090'); fill(circ(44, 24, 2.2), '#c8f090'); });
  reg('spirit', () => {
    glow(32, 34, 28, '#d9c4ff', 0.75);
    const t = path(() => { X.moveTo(32, 8); X.bezierCurveTo(48, 12, 50, 34, 44, 44); X.bezierCurveTo(40, 52, 46, 54, 40, 58); X.bezierCurveTo(36, 52, 30, 56, 26, 58); X.bezierCurveTo(22, 52, 26, 48, 20, 44); X.bezierCurveTo(14, 34, 18, 12, 32, 8); });
    shape(t, rg(30, 30, 0, 26, [[0, '#ffffff'], [0.5, '#e6dcff'], [1, '#9a80d8']]), { light: 0.6, dark: 0.3 });
    fill(ell(27, 30, 3, 4.5, 0.1), '#3a2a6a'); fill(ell(37, 30, 3, 4.5, -0.1), '#3a2a6a');
  });
  for (const id of Object.keys(CH)) alias('channel_' + id, id);

  // ================================================================ STATUSES (round badges: crimson rim = debuff, green-gold rim = buff)
  group('statuses');
  function statusBadge(kind, fn, s) {
    const rim = kind === 'buff' ? ['#b8e07a', '#4f9a2a', '#2c5e1c'] : ['#ff8a6a', '#c8452a', '#6e1a10'];
    shape(circ(32, 32, 29), rg(24, 22, 0, 34, [[0, '#2f3852'], [1, '#12161f']]), { light: 0.3, dark: 0.5 });
    line(circ(32, 32, 26.6), lg(8, 8, 56, 56, [[0, rim[0]], [0.5, rim[1]], [1, rim[2]]]), 2.8, { ol: OLW * 0.45 });
    sub(32, 32, s || 0.72, fn);
  }
  const crack = (pts, c, w) => line(open(() => pts.forEach((p, i) => i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))), c || INK, w || 2.4, { ol: 0, cap: 'butt' });
  const swordSym = o => sword(32, 32, 54, 0.6, o);
  const exclaim = (cx, cy, s, c) => { shape(rr(cx - s * 0.11, cy - s * 0.5, s * 0.22, s * 0.62, s * 0.1), mat(c, cx - s * 0.1, cy - s * 0.5, cx + s * 0.1, cy + s * 0.1)); shape(circ(cx, cy + s * 0.34, s * 0.13), mat(c, cx - 3, cy + s * 0.25, cx + 3, cy + s * 0.45)); };
  const DEBUFF = {
    burning: () => flame(32, 33, 44, 58, '#c8321a', '#ff7a1a', '#ffe680'),
    frozen: () => { crystal(20, 40, 12, 24, '#8ad8ff', -0.4); crystal(44, 40, 12, 24, '#8ad8ff', 0.4); crystal(32, 32, 20, 50, '#9ae0ff', 0); },
    poisoned: () => { drop(32, 34, 34, 50, '#5fc03a'); fill(circ(22, 16, 3.2), '#c8f090'); fill(circ(46, 22, 2.4), '#c8f090'); fill(circ(14, 28, 2), '#c8f090'); },
    blighted: () => { skull(32, 28, 15, '#b8e070', { eyes: '#2a4a10' }); for (const [px, py, h] of [[20, 46, 12], [32, 50, 9], [44, 46, 12]]) drop(px, py, 6, h, '#6fb832', { ol: OLW * 0.7 }); },
    weakened: () => { sword(26, 32, 50, -0.5, { blade: 'iron' }); crack([[24, 12], [30, 20], [26, 26], [32, 34]], INK, 2.2); fatArrow(50, 34, 26, 8, PI / 2, lg(44, 20, 56, 48, [[0, '#ff9a7a'], [0.5, '#e0452b'], [1, '#7a1e12']])); },
    sundered: () => { shield(32, 33, 42, 52, '#8a8f9a', { fill: metal('steel', 12, 8, 52, 58) }); crack([[30, 8], [36, 20], [28, 30], [36, 42], [31, 56]], INK, 2.6); fill(poly([[44, 10], [52, 10], [52, 20]]), '#1b1f2a'); },
    shattered: () => { shield(32, 33, 42, 52, '#5a3a9a', { rim: metal('violet', 12, 8, 52, 58) }); crack([[32, 10], [26, 22], [34, 30], [28, 42], [34, 56]], INK, 2.4); crack([[26, 22], [16, 26]], INK, 2); crack([[34, 30], [46, 34]], INK, 2); for (const [px, py] of [[52, 12], [56, 24], [10, 16]]) shape(poly([[px, py - 3], [px + 3, py], [px, py + 3], [px - 3, py]]), '#c9a8ff', { ol: OLW * 0.6 }); },
    marked: () => { glow(32, 32, 26, '#ff4a3a', 0.5); line(circ(32, 32, 20), lg(12, 12, 52, 52, [[0, '#ffb0a0'], [1, '#c8301a']]), 4, { hi: true }); line(open(() => { X.moveTo(32, 4); X.lineTo(32, 18); X.moveTo(32, 46); X.lineTo(32, 60); X.moveTo(4, 32); X.lineTo(18, 32); X.moveTo(46, 32); X.lineTo(60, 32); }), '#ff8a70', 3.5); shape(circ(32, 32, 5), sphere('#ff5a3a', 32, 32, 5)); },
    stunned: () => { line(open(() => { X.arc(32, 36, 16, PI * 0.8, PI * 2.2); }), '#ffe08a', 3, { hi: true }); [[16, 26, 6], [32, 12, 8], [48, 26, 6]].forEach(([px, py, r]) => { glow(px, py, r * 1.8, '#ffe08a', 0.6); shape(star(px, py, r, r * 0.45), metal('gold', px - r, py - r, px + r, py + r), { ol: OLW * 0.7 }); }); },
    blinded: () => { eye(32, 32, 52, 18, '#3a7fe0'); line(seg(12, 52, 52, 12), '#e0452b', 5, { cap: 'round' }); },
    bleeding: () => { drop(24, 26, 22, 34, '#c8202a'); drop(42, 40, 18, 28, '#e03a3a'); },
    condemned: () => { glow(32, 16, 14, '#fff2b0', 0.8); line(ell(32, 14, 15, 4.5), metal('gold', 17, 10, 47, 18), 3, { hi: true }); skull(32, 36, 14, '#e8e0d0'); },
    cursed: () => { glow(32, 32, 28, '#7b3fa0', 0.7); skull(32, 34, 14, '#c9a8e8', { glow: '#d23aff' }); line(open(() => { X.moveTo(10, 50); X.quadraticCurveTo(6, 30, 18, 20); X.moveTo(54, 50); X.quadraticCurveTo(58, 30, 46, 20); }), '#9a5cc8', 2.6, { hi: true }); },
    slowed: () => { boot(24, 30, 40, '#7a4a26'); chainLink(40, 44, 9, 5, 0.3, 'iron'); chainLink(47, 47, 9, 5, 0.3, 'iron'); shape(circ(54, 50, 8), sphere('#4a4e58', 54, 50, 8)); },
    rooted: () => { boot(32, 28, 42, '#7a4a26'); vine(10, 60, 30, 36, '#3f9a3c', { n: 2, w: 3.2 }); vine(56, 58, 36, 40, '#3f9a3c', { n: 2, w: 3.2 }); },
    demoralized: () => { line(seg(16, 6, 16, 58), metal('wood', 14, 0, 18, 0), 3.4, { hi: true }); shape(path(() => { X.moveTo(16, 8); X.quadraticCurveTo(36, 6, 50, 14); X.quadraticCurveTo(54, 24, 46, 30); X.quadraticCurveTo(42, 40, 44, 52); X.lineTo(38, 44); X.lineTo(36, 54); X.lineTo(32, 42); X.quadraticCurveTo(24, 36, 16, 30); }), lg(16, 8, 50, 52, [[0, '#a8aab8'], [0.5, '#7a7c8c'], [1, '#3e404c']])); fill(path(() => { X.moveTo(22, 14); X.quadraticCurveTo(34, 12, 42, 18); X.lineTo(40, 24); X.quadraticCurveTo(32, 20, 22, 22); }), 'rgba(200,60,50,0.35)'); },
    panicked: () => { shape(star(32, 32, 30, 20, 10), lg(6, 6, 58, 58, [[0, '#ff9a6a'], [0.5, '#e0452b'], [1, '#7a1e12']]), { light: 0.4 }); exclaim(26, 32, 34, '#fff2d8'); exclaim(40, 32, 34, '#fff2d8'); },
    charmed: () => { glow(32, 32, 26, '#ff8ac8', 0.6); heart(32, 33, 46, '#e8508a'); sparkle(50, 14, 6, '#ffd8ee', { ol: 0 }); sparkle(14, 20, 4, '#ffd8ee', { ol: 0 }); },
    silenced: () => { bubble(32, 30, 48, 40, '#f4efe4'); line(open(() => { X.moveTo(20, 16); X.lineTo(44, 36); X.moveTo(44, 16); X.lineTo(20, 36); }), '#d8342c', 5); },
    wet: () => { line(open(() => { X.moveTo(8, 50); X.quadraticCurveTo(16, 42, 24, 50); X.quadraticCurveTo(32, 58, 40, 50); X.quadraticCurveTo(48, 42, 56, 50); }), '#5aa9ff', 4, { hi: true }); drop(22, 24, 16, 26, '#4a90ff'); drop(42, 20, 14, 22, '#6ab8ff'); },
    electrified: () => { bolt(32, 32, 30, 50, '#ffe86a'); [[10, 18], [54, 14], [8, 44], [56, 46]].forEach(([px, py]) => sparkle(px, py, 5, '#fff6b0', { ol: 0 })); },
    distracted: () => { line(open(() => { X.moveTo(8, 34); X.quadraticCurveTo(10, 10, 30, 12); X.quadraticCurveTo(52, 14, 54, 34); X.quadraticCurveTo(52, 52, 34, 50); X.quadraticCurveTo(22, 48, 22, 38); X.quadraticCurveTo(24, 30, 32, 32); }), '#ffd86a', 3.2, { hi: true }); text('?', 34, 32, 30, '#fff2c0', { ol: OLW * 0.8 }); },
    corrupted: () => { glow(32, 32, 28, '#d23aff', 0.5); shape(union(circ(32, 34, 18), path(() => { X.moveTo(20, 44); X.quadraticCurveTo(6, 52, 10, 60); X.quadraticCurveTo(16, 54, 24, 50); }), path(() => { X.moveTo(44, 44); X.quadraticCurveTo(58, 50, 56, 60); X.quadraticCurveTo(50, 54, 40, 50); }), path(() => { X.moveTo(30, 18); X.quadraticCurveTo(28, 6, 40, 4); X.quadraticCurveTo(34, 10, 40, 18); })), mat('#5b2e8c', 10, 6, 56, 60, 0.35, 0.5)); eye(32, 34, 24, 8, '#d23aff'); },
    misfortune: () => { X.save(); X.translate(32, 32); X.rotate(-0.35); shape(rr(-20, -20, 40, 40, 6), lg(-20, -20, 20, 20, [[0, '#7a6a90'], [0.5, '#3a3050'], [1, '#1a1428']])); fill(circ(0, 0, 5), '#e0452b'); crack([[-20, -6], [-8, 4], [-12, 14], [2, 20]], INK, 2.2); X.restore(); },
  };
  const BUFF = {
    strengthened: () => {
      // flexing arm: thick stroked arm + bicep and fist lumps, unified outline
      const c = '#e0b090', arm = open(() => { X.moveTo(8, 48); X.lineTo(28, 48); X.lineTo(40, 22); }), lumps = union(circ(24, 40, 10), circ(41, 18, 9.5));
      line(arm, OUT, 15 + OLW * 2, { ol: 0 }); outline(lumps);
      line(arm, mat(c, 8, 20, 44, 50), 15, { ol: 0 }); fill(lumps, mat(c, 8, 10, 50, 50));
      bevel(lumps, 0.4, 0.3, 1.7, 1.2);
      line(open(() => { for (let i = 0; i < 3; i++) { X.moveTo(36 + i * 3.5, 12 + i * 1.5); X.lineTo(37 + i * 3.5, 16 + i * 1.5); } }), 'rgba(90,40,20,0.35)', 1.6, { ol: 0 });
      fatArrow(54, 34, 24, 7, -PI / 2, lg(48, 22, 60, 46, [[0, '#ffb09a'], [0.5, '#e0452b'], [1, '#7a1e12']]));
    },
    hastened: () => { for (let i = 0; i < 3; i++) line(seg(4, 28 + i * 8, 14 + i * 2, 28 + i * 8), '#ffe08a', 2.4, { ol: OLW * 0.5 }); boot(36, 34, 46, '#8a5a34'); wing(34, 22, 26, 16, 1, '#fff2c0', { ol: OLW * 0.7 }); },
    shielded: () => { glow(32, 32, 30, '#5aa9ff', 0.8); shield(32, 33, 40, 50, '#3a7fe0', { rim: metal('silver', 12, 8, 52, 58) }); line(shieldT(32, 33, 52, 62), al('#bfe9ff', 0.8), 2, { ol: 0 }); },
    blessed: () => { sun(32, 34, 10, '#ffd86a', { rays: 12, rayLen: 16, face: false }); line(ell(32, 14, 16, 5), metal('gold', 16, 10, 48, 18), 3.2, { hi: true }); },
    regenerating: () => { heart(32, 36, 44, '#3fa040'); leaf(42, 16, 12, 20, '#8cd46b', 0.8, { ol: OLW * 0.7 }); leaf(24, 16, 10, 18, '#8cd46b', -0.9, { ol: OLW * 0.7 }); line(seg(32, 28, 32, 12), '#5fb043', 2.6); },
    fortified: () => { tower(14, 60, 36, 50, '#8a8a92', { merlons: 3 }); tower(44, 60, 16, 36, '#7a7a84', { merlons: 2, door: false, windows: false }); },
    inspired: () => { line(seg(32, 60, 32, 30), metal('wood', 30, 0, 34, 0), 6, { hi: true }); shape(rr(26, 28, 12, 7, 2), metal('gold', 26, 28, 38, 35)); flame(32, 18, 26, 34, '#c8321a', '#ff8a2a', '#ffe680'); sparkle(50, 14, 5, '#fff6d0', { ol: 0 }); sparkle(14, 18, 4, '#fff6d0', { ol: 0 }); },
    enraged: () => { flame(32, 33, 46, 58, '#8a1210', '#e0301a', '#ff9a4a'); fill(poly([[20, 34], [30, 40], [28, 44], [18, 40]]), INK); fill(poly([[44, 34], [34, 40], [36, 44], [46, 40]]), INK); },
    concealed: () => { shape(path(() => { X.moveTo(32, 6); X.quadraticCurveTo(52, 10, 54, 40); X.quadraticCurveTo(56, 58, 32, 58); X.quadraticCurveTo(8, 58, 10, 40); X.quadraticCurveTo(12, 10, 32, 6); }), mat('#3a3a52', 10, 6, 54, 58, 0.35, 0.5)); fill(path(() => { X.moveTo(32, 20); X.quadraticCurveTo(44, 22, 44, 44); X.quadraticCurveTo(32, 52, 20, 44); X.quadraticCurveTo(20, 22, 32, 20); }), '#0c0a14'); fill(ell(27, 34, 2.4, 1.6), '#8ad0ff'); fill(ell(37, 34, 2.4, 1.6), '#8ad0ff'); },
    spirited: () => { glow(32, 34, 26, '#d9c4ff', 0.7); sub(32, 34, 0.9, () => REG.get('spirit').fn({})); sparkle(50, 12, 6, '#ffffff', { ol: 0 }); },
    zeal: () => { sun(32, 30, 9, '#ffd86a', { rays: 10, rayLen: 18, face: false }); sword(32, 34, 52, 0, { blade: 'silver', glowC: '#fff2b0' }); },
    warded: () => runeRing(32, 32, 24, '#5aa9ff', { ticks: 8 }),
    stone_skin: () => { shape(curve([[14, 20], [30, 8], [50, 14], [58, 34], [48, 56], [22, 58], [8, 42]]), mat('#7a746c', 8, 8, 58, 58, 0.45, 0.5)); crack([[24, 22], [30, 30], [26, 40]], 'rgba(20,14,30,0.5)', 1.8); crack([[40, 26], [46, 36]], 'rgba(20,14,30,0.5)', 1.8); fill(ell(24, 18, 8, 4, -0.5), 'rgba(255,255,255,0.25)'); },
    flame_weapons: () => { swordSym({ tint: '#ff7a1a', glowC: '#ff8c1a' }); flame(22, 18, 18, 26, '#c8321a', '#ff7a1a', '#ffe680'); flame(32, 10, 12, 18, '#c8321a', '#ff7a1a', '#ffe680', { glow: false }); },
    frost_weapons: () => { swordSym({ tint: '#7ad8ff', glowC: '#bfe9ff' }); crystal(20, 20, 8, 16, '#bfe9ff', -0.6, { glow: false }); crystal(30, 12, 7, 14, '#bfe9ff', 0.3, { glow: false }); snowflake(50, 44, 7, '#bfe9ff', { glow: false }); },
    lightning_weapons: () => { swordSym({ tint: '#ffe86a', glowC: '#ffe86a' }); bolt(22, 20, 16, 30, '#ffe86a', { glow: false }); sparkle(48, 44, 5, '#fff6b0', { ol: 0 }); },
    blight_weapons: () => { swordSym({ tint: '#8ad34a', glowC: '#8ad34a' }); drop(22, 30, 8, 14, '#6fb832', { ol: OLW * 0.7 }); drop(30, 40, 7, 12, '#6fb832', { ol: OLW * 0.7 }); fill(circ(18, 16, 2.5), '#c8f090'); },
    spirit_weapons: () => { swordSym({ tint: '#d9c4ff', glowC: '#d9c4ff' }); sparkle(20, 16, 7, '#ffffff', { ol: 0 }); sparkle(48, 46, 5, '#e6dcff', { ol: 0 }); },
    awakened: () => { glow(32, 32, 30, '#ffd86a', 0.6); line(open(() => { for (let i = 0; i < 8; i++) { const a = -PI / 2 + i * PI / 4 + PI / 8; X.moveTo(32 + 24 * Math.cos(a), 32 + 24 * Math.sin(a)); X.lineTo(32 + 30 * Math.cos(a), 32 + 30 * Math.sin(a)); } }), '#ffe08a', 3); eye(32, 32, 44, 15, '#e0a020'); },
    empowered: () => { glow(32, 36, 24, '#a070e0', 0.8); shape(circ(32, 38, 14), sphere('#a070e0', 32, 38, 14), { light: 0.7 }); spec(26, 32, 4); chevron(32, 14, 22, -PI / 2, metal('violet', 22, 4, 42, 24)); chevron(32, 4, 18, -PI / 2, metal('violet', 22, 0, 42, 12), { ol: OLW * 0.8 }); },
    focused: () => { line(circ(32, 32, 24), '#8ad46a', 3, { hi: true }); line(circ(32, 32, 14), '#8ad46a', 2.4, { hi: true }); shape(circ(32, 32, 5), sphere('#c5f0a8', 32, 32, 5)); arrow(58, 6, 36, 28, { w: 2.4 }); },
    broken: () => { X.save(); X.translate(26, 40); X.rotate(-0.55); const L = 44, bw = 7, gl = L * 0.2, gh = L * 0.06, gy = L / 2 - gl - gh; shape(poly([[-bw / 2, -6], [bw / 2, -3], [bw / 2, gy], [-bw / 2, gy]]), metal('iron', -bw / 2, -10, bw / 2, 10), { light: 0.6 }); shape(rr(-bw * 1.6, gy, bw * 3.2, gh, gh / 2), metal('gold', -bw * 1.6, gy, bw * 1.6, gy + gh)); shape(rr(-bw * 0.42, gy + gh, bw * 0.84, gl, 1.5), metal('leather', -bw / 2, gy, bw / 2, gy + gl)); shape(circ(0, L / 2 - bw * 0.3, bw * 0.45), metal('gold', -bw / 2, L / 2 - bw, bw / 2, L / 2)); X.restore(); X.save(); X.translate(46, 14); X.rotate(-0.95); shape(poly([[0, -12], [3.5, -7], [3.5, 6], [-3.5, 9], [-3.5, -7]]), metal('iron', -4, -12, 4, 12), { light: 0.6 }); X.restore(); sparkle(36, 26, 5, '#ffffff', { ol: 0 }); },
  };
  for (const id of Object.keys(DEBUFF)) reg(id, () => statusBadge('debuff', DEBUFF[id]));
  for (const id of Object.keys(BUFF)) reg(id, () => statusBadge('buff', BUFF[id]));

  // ================================================================ ABILITIES (free-form symbols; the UI supplies the slot frame)
  group('abilities');
  const speedLines = (x, y, n, c) => { for (let i = 0; i < n; i++) line(seg(x, y + i * 7, x + 10 + i * 2, y + i * 7), c || 'rgba(255,255,255,0.55)', 1.8, { ol: OLW * 0.4 }); };
  reg('strike', () => { slash(30, 34, 24, PI * 1.05, PI * 1.75, '#ffffff', 2.4); sword(32, 32, 56, 0.75); });
  reg('cleave', () => { slash(26, 30, 28, PI * 0.9, PI * 1.95, '#ffd0a0', 3); axe(36, 34, 52, 0.6); });
  reg('charge', () => { speedLines(4, 24, 3); horseHead(34, 32, 52, '#8a5a34'); chevron(56, 40, 12, 0, metal('gold', 50, 34, 62, 46), { ol: OLW * 0.7 }); });
  reg('shield_wall', () => { shield(22, 34, 32, 42, '#8a8f9a', { fill: metal('steel', 6, 12, 38, 56), rim: metal('gold', 6, 12, 38, 56) }); shield(42, 32, 32, 42, '#3a63b0', { boss: true }); });
  reg('defend', () => { glow(32, 32, 30, '#ffe9a0', 0.5); shield(32, 33, 42, 52, '#3a63b0', { emblem: () => { chevron(32, 30, 18, -PI / 2, metal('gold', 22, 20, 42, 40), { ol: OLW * 0.7 }); } }); });
  reg('first_strike', () => { sword(30, 34, 54, 0.7); sparkle(48, 14, 10, '#ffffff'); sparkle(56, 28, 5, '#ffffff', { ol: 0 }); });
  reg('pike_brace', () => { shape(rr(4, 52, 56, 6, 2), mat('#6a5a48', 4, 52, 60, 58)); for (const [x0, x1] of [[20, 50], [44, 14]]) { line(seg(x0, 54, x1, 12), metal('wood', x0, 54, x1, 12), 3.2, { hi: true }); const dx = x1 - x0, L = Math.hypot(dx, -42); const ux = dx / L, uy = -42 / L; shape(poly([[x1 + ux * 8, 12 + uy * 8], [x1 + uy * 3.5, 12 - ux * 3.5], [x1 - ux * 3, 12 - uy * 3], [x1 - uy * 3.5, 12 + ux * 3.5]]), metal('steel', x1 - 5, 5, x1 + 5, 15), { light: 0.7 }); } });
  reg('shoot', () => bow(34, 32, 54, { arrow: true, drawn: true }));
  reg('volley', () => { arrow(14, 58, 22, 6, { w: 2.4 }); arrow(32, 60, 32, 4, { w: 2.4 }); arrow(50, 58, 42, 6, { w: 2.4 }); });
  reg('snipe', () => { line(circ(32, 32, 22), '#ff8a70', 2.6, { hi: true }); line(open(() => { X.moveTo(32, 4); X.lineTo(32, 16); X.moveTo(32, 48); X.lineTo(32, 60); X.moveTo(4, 32); X.lineTo(16, 32); X.moveTo(48, 32); X.lineTo(60, 32); }), '#ff8a70', 2.6); arrow(10, 54, 38, 26, { w: 2.6 }); });
  reg('heal', () => { glow(32, 32, 30, '#b8ff7a', 0.7); shape(union(rr(24, 8, 16, 48, 4), rr(8, 24, 48, 16, 4)), lg(8, 8, 56, 56, [[0, '#ffffff'], [0.5, '#c5f0a8'], [1, '#5fb043']]), { light: 0.6 }); leaf(50, 14, 9, 15, '#5fb043', 0.9, { ol: OLW * 0.7 }); leaf(14, 50, 9, 15, '#5fb043', 0.9 + PI, { ol: OLW * 0.7 }); });
  reg('bless', () => { sun(32, 36, 10, '#ffe08a', { rays: 12, rayLen: 18, face: false }); line(ell(32, 12, 15, 5), metal('gold', 17, 8, 47, 16), 3, { hi: true }); sparkle(52, 50, 5, '#fff6d0', { ol: 0 }); sparkle(12, 50, 5, '#fff6d0', { ol: 0 }); });
  reg('curse', () => { glow(32, 34, 30, '#7b3fa0', 0.8); line(open(() => { X.moveTo(8, 56); X.quadraticCurveTo(4, 30, 16, 14); X.moveTo(56, 56); X.quadraticCurveTo(60, 30, 48, 14); }), '#8a4fc0', 3, { hi: true }); skull(32, 34, 15, '#c9a8e8', { glow: '#d23aff' }); });
  reg('fireball', () => { X.save(); X.translate(32, 32); X.rotate(-0.8); flame(0, 6, 34, 50, '#c8321a', '#ff7a1a', '#ffe680'); X.restore(); glow(40, 42, 18, '#ffb060', 0.9); shape(circ(40, 42, 13), rg(36, 38, 0, 15, [[0, '#fffbe0'], [0.4, '#ffd050'], [1, '#e04a1a']]), { light: 0.5 }); });
  reg('frostbolt', () => { glow(32, 32, 30, '#7ad8ff', 0.6); crystal(30, 34, 20, 54, '#9ae0ff', -0.75); snowflake(50, 14, 8, '#bfe9ff', { glow: false }); snowflake(12, 50, 6, '#bfe9ff', { glow: false }); });
  reg('lightning_bolt', () => { bolt(32, 32, 36, 58, '#ffe86a'); sparkle(52, 12, 5, '#fff6b0', { ol: 0 }); });
  reg('poison_cloud', () => { glow(32, 36, 30, '#8ad34a', 0.5); cloud(32, 36, 56, 34, '#6fb832', { light: 0.5 }); skull(32, 36, 8, '#e8f0d0', { ol: OLW * 0.7 }); fill(circ(14, 24, 3), '#c8f090'); fill(circ(50, 20, 2.5), '#c8f090'); fill(circ(44, 50, 2), '#c8f090'); });
  reg('summon', () => { glow(32, 40, 28, '#a070e0', 0.7); fill(path(() => { X.moveTo(20, 48); X.lineTo(26, 4); X.lineTo(38, 4); X.lineTo(44, 48); }), lg(32, 4, 32, 48, [[0, al('#e8d0ff', 0)], [1, al('#c0a0ff', 0.6)]])); line(ell(32, 48, 24, 8), metal('violet', 8, 40, 56, 56), 3, { hi: true }); line(star(32, 48, 20, 8, 5), '#e8d0ff', 1.6, { ol: OLW * 0.5 }); sparkle(32, 20, 8, '#ffffff'); });
  reg('teleport', () => { glow(32, 32, 30, '#5a7ff0', 0.7); for (const [cx, r] of [[32, 24], [32, 15]]) line(ell(cx, 32, r, r * 0.55), lg(cx - r, 20, cx + r, 44, [[0, '#c0ceff'], [1, '#3e6fe0']]), 3, { hi: true }); line(open(() => { X.moveTo(32, 32); for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * 8, rr2 = t * 22; X.lineTo(32 + rr2 * Math.cos(a), 32 + rr2 * Math.sin(a) * 0.55); } }), 'rgba(200,220,255,0.75)', 1.8, { ol: OLW * 0.4 }); sparkle(32, 30, 6, '#ffffff'); });
  reg('flight', () => { wing(34, 34, 28, 26, 1, '#f4f0e8'); wing(30, 34, 28, 26, -1, '#f4f0e8'); shape(circ(32, 34, 5), metal('gold', 27, 29, 37, 39)); });
  reg('taunt', () => { X.save(); X.translate(28, 34); X.rotate(-0.5); shape(path(() => { X.moveTo(-22, -4); X.quadraticCurveTo(-4, -8, 16, -16); X.lineTo(20, 4); X.quadraticCurveTo(0, 8, -22, 6); }), metal('bronze', -22, -16, 20, 8), { light: 0.6 }); shape(ell(18, -6, 5, 11, -0.3), lg(13, -17, 23, 5, [[0, '#3a2a1a'], [1, '#150c08']]), { ol: OLW * 0.7, light: 0.2 }); shape(rr(-6, -8, 5, 14, 2), metal('gold', -6, -8, -1, 6), { ol: OLW * 0.6 }); X.restore(); for (let i = 0; i < 3; i++) line(arcT(46, 22, 8 + i * 6, -0.9, 0.9), '#ffd86a', 2.4, { ol: OLW * 0.5 }); });
  reg('rally', () => { line(open(() => { for (let i = 0; i < 5; i++) { const a = -PI * 0.9 + i * PI * 0.2; X.moveTo(36 + 20 * Math.cos(a), 26 + 20 * Math.sin(a)); X.lineTo(36 + 30 * Math.cos(a), 26 + 30 * Math.sin(a)); } }), '#ffe08a', 3); flag(18, 6, 58, 34, '#c0342a', '#f6e6c8', { pw: 3.4 }); });
  reg('inspire', () => { glow(32, 30, 30, '#ffd86a', 0.6); shape(star(32, 30, 22, 9.5), metal('gold', 12, 10, 52, 50), { light: 0.6 }); spec(26, 24, 3.5); line(open(() => { X.moveTo(18, 50); X.quadraticCurveTo(24, 56, 14, 62); X.moveTo(46, 50); X.quadraticCurveTo(40, 56, 50, 62); }), '#e0452b', 4, { hi: true }); });
  reg('stealth', () => { shape(path(() => { X.moveTo(32, 8); X.quadraticCurveTo(54, 10, 54, 40); X.quadraticCurveTo(54, 58, 32, 58); X.quadraticCurveTo(10, 58, 10, 40); X.quadraticCurveTo(10, 10, 32, 8); }), mat('#2e2e44', 10, 8, 54, 58, 0.35, 0.5)); fill(path(() => { X.moveTo(32, 20); X.quadraticCurveTo(46, 22, 46, 44); X.quadraticCurveTo(32, 54, 18, 44); X.quadraticCurveTo(18, 22, 32, 20); }), '#08060e'); fill(ell(26, 34, 3, 1.8, 0.3), '#8ad0ff'); fill(ell(38, 34, 3, 1.8, -0.3), '#8ad0ff'); dagger(52, 44, 26, 0.5); });
  reg('backstab', () => { shape(path(() => { X.moveTo(8, 60); X.quadraticCurveTo(10, 26, 30, 22); X.quadraticCurveTo(50, 26, 54, 60); }), mat('#3a3a52', 8, 22, 54, 60, 0.35, 0.5)); shape(circ(31, 16), '#c9a080'); shape(circ(31, 14, 9), mat('#4a3a5a', 22, 5, 40, 23)); dagger(44, 28, 34, 2.5, { glowC: '#ff4a3a' }); drop(50, 44, 6, 10, '#c8202a', { ol: OLW * 0.6 }); });
  reg('drain', () => { glow(32, 32, 30, '#7b3fa0', 0.7); line(open(() => { for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * 9, r = 4 + t * 24; i ? X.lineTo(32 + r * Math.cos(a), 32 + r * Math.sin(a)) : X.moveTo(32, 32); } }), lg(4, 4, 60, 60, [[0, '#d6b3f0'], [1, '#6b2f8c']]), 3.4, { hi: true }); drop(48, 14, 10, 16, '#c8202a', { ol: OLW * 0.7 }); drop(16, 50, 9, 14, '#c8202a', { ol: OLW * 0.7 }); drop(14, 16, 7, 11, '#c8202a', { ol: OLW * 0.6 }); });
  reg('smite', () => { glow(32, 14, 22, '#fff2b0', 0.9); line(open(() => { for (let i = -2; i <= 2; i++) { X.moveTo(32 + i * 6, 4); X.lineTo(32 + i * 12, 26); } }), '#ffe9a0', 2.4, { ol: OLW * 0.4 }); hammer(34, 36, 48, 0.65, { metal: 'gold' }); slash(20, 50, 14, PI * 0.9, PI * 1.9, '#ffffff', 2.2); });
  reg('holy_light', () => { glow(32, 32, 32, '#fff2b0', 0.8); fill(path(() => { X.moveTo(22, 60); X.lineTo(26, 2); X.lineTo(38, 2); X.lineTo(42, 60); }), lg(32, 2, 32, 60, [[0, '#fff8e0'], [0.6, al('#ffe9a0', 0.8)], [1, al('#ffe9a0', 0.1)]])); line(open(() => { X.moveTo(8, 20); X.lineTo(18, 30); X.moveTo(56, 20); X.lineTo(46, 30); X.moveTo(6, 40); X.lineTo(16, 40); X.moveTo(58, 40); X.lineTo(48, 40); }), '#ffe9a0', 2.6); sparkle(32, 12, 10, '#ffffff'); sparkle(32, 44, 6, '#ffffff', { ol: 0 }); });
  reg('entangle', () => { vine(6, 56, 58, 8, '#3f9a3c', { n: 3, w: 3.6 }); vine(58, 56, 6, 8, '#3f9a3c', { n: 3, w: 3.6 }); });
  reg('regrowth', () => { glow(32, 34, 28, '#b8ff7a', 0.6); line(open(() => { X.moveTo(32, 58); X.quadraticCurveTo(30, 40, 32, 22); }), '#4f9e3a', 4, { hi: true }); leaf(20, 34, 16, 26, '#6fb832', 0.9); leaf(44, 26, 16, 26, '#8cd46b', -0.9); leaf(32, 14, 12, 20, '#a8e070', 0); sparkle(50, 50, 5, '#e8ffb0', { ol: 0 }); });
  reg('earthquake', () => { shape(poly([[4, 30], [60, 30], [60, 58], [4, 58]]), mat('#7a5a3a', 4, 30, 60, 58, 0.35, 0.5)); crack([[6, 40], [18, 44], [26, 36], [34, 46], [44, 38], [58, 44]], INK, 3); crack([[26, 36], [24, 58]], INK, 2.2); crack([[44, 38], [48, 58]], INK, 2.2); shape(curve([[14, 28], [22, 16], [34, 20], [38, 28]]), mat('#8a8078', 14, 16, 38, 28)); shape(curve([[40, 28], [44, 22], [54, 22], [56, 28]]), mat('#8a8078', 40, 22, 56, 28)); });
  reg('stone_skin_ab', () => { shape(union(rr(10, 26, 36, 26, 8), rr(14, 14, 10, 20, 5), rr(25, 10, 10, 22, 5), rr(36, 12, 10, 20, 5), rr(44, 30, 12, 16, 6)), mat('#7a746c', 10, 10, 56, 52, 0.45, 0.5)); crack([[18, 36], [24, 42], [20, 48]], 'rgba(20,14,30,0.5)', 1.8); crack([[36, 34], [40, 44]], 'rgba(20,14,30,0.5)', 1.8); line(open(() => { X.moveTo(24, 30); X.lineTo(24, 38); X.moveTo(35, 30); X.lineTo(35, 38); }), 'rgba(20,14,30,0.35)', 2, { ol: 0 }); });
  reg('mind_control', () => { glow(32, 30, 30, '#d23aff', 0.6); shape(union(circ(24, 30, 15), circ(40, 30, 15), circ(32, 22, 14), rr(22, 40, 20, 10, 4)), mat('#9a6ac8', 10, 8, 54, 52, 0.4, 0.5)); line(open(() => { X.moveTo(32, 10); X.lineTo(32, 46); X.moveTo(18, 24); X.quadraticCurveTo(26, 28, 24, 40); X.moveTo(46, 24); X.quadraticCurveTo(38, 28, 40, 40); }), 'rgba(40,10,60,0.45)', 2, { ol: 0 }); eye(32, 30, 22, 8, '#d23aff'); });
  reg('phase', () => { glow(32, 32, 30, '#7fd8ff', 0.5); line(ell(32, 32, 26, 12, -0.5), '#7fd8ff', 2.6, { hi: true }); shape(poly([[32, 8], [46, 32], [32, 56], [18, 32]]), lg(18, 8, 46, 56, [[0, 'rgba(230,245,255,0.9)'], [0.5, 'rgba(127,216,255,0.6)'], [1, 'rgba(62,111,224,0.7)']]), { light: 0.6 }); X.setLineDash([3, 3]); line(poly([[32, 2], [52, 32], [32, 62], [12, 32]]), '#bfe9ff', 1.8, { ol: 0 }); X.setLineDash([]); });
  reg('fear', () => { glow(32, 32, 30, '#6b2f8c', 0.8); skull(32, 30, 15, '#d8c8f0', { glow: '#5fe6c0' }); fill(ell(32, 44, 4, 6), INK); line(open(() => { for (const s of [-1, 1]) { X.moveTo(32 + s * 18, 14); X.quadraticCurveTo(32 + s * 30, 26, 32 + s * 22, 40); X.quadraticCurveTo(32 + s * 32, 48, 32 + s * 26, 58); } }), '#b48cd6', 2.4, { hi: true }); });
  reg('roar', () => { shape(path(() => { X.moveTo(6, 22); X.quadraticCurveTo(20, 8, 40, 14); X.lineTo(40, 26); X.lineTo(6, 30); }), mat('#8a3a2a', 6, 8, 40, 30)); shape(path(() => { X.moveTo(6, 40); X.lineTo(40, 36); X.lineTo(40, 48); X.quadraticCurveTo(20, 56, 6, 46); }), mat('#7a3020', 6, 36, 40, 56)); fill(poly([[8, 30], [40, 26], [40, 36], [8, 40]]), '#2a0808'); for (const [px, py, d] of [[14, 29, 1], [24, 28, 1], [34, 27, 1], [14, 41, -1], [24, 40, -1], [34, 39, -1]]) shape(poly([[px - 3, py], [px + 3, py], [px, py + d * 7]]), BONE, { ol: OLW * 0.5 }); for (let i = 0; i < 3; i++) line(arcT(44, 34, 8 + i * 6, -0.9, 0.9), '#ffd86a', 2.4, { ol: OLW * 0.5 }); });
  reg('trample', () => { shape(star(32, 32, 30, 22, 12), lg(4, 4, 60, 60, [[0, '#c8b89a'], [1, '#6a5a48']]), { light: 0.4 }); shape(path(() => { X.moveTo(20, 46); X.quadraticCurveTo(14, 26, 32, 18); X.quadraticCurveTo(50, 26, 44, 46); X.lineTo(38, 46); X.quadraticCurveTo(40, 30, 32, 28); X.quadraticCurveTo(24, 30, 26, 46); }), metal('iron', 14, 18, 50, 46)); });
  reg('breath_fire', () => { X.save(); X.translate(56, 42); X.rotate(1.9); flame(0, 0, 26, 36, '#c8321a', '#ff7a1a', '#ffe680'); X.restore(); dragonHead(26, 30, 46, '#8a3a2a'); });
  reg('breath_frost', () => { glow(52, 44, 16, '#7ad8ff', 0.8); fill(poly([[42, 30], [62, 34], [62, 56], [42, 42]]), lg(42, 36, 62, 46, [[0, al('#bfe9ff', 0.9)], [1, al('#7ad8ff', 0.1)]])); snowflake(54, 44, 7, '#bfe9ff', { glow: false }); dragonHead(26, 30, 46, '#3a6fa8'); });
  reg('web', () => { const t = open(() => { for (let i = 0; i < 8; i++) { const a = i * PI / 4; X.moveTo(32, 32); X.lineTo(32 + 30 * Math.cos(a), 32 + 30 * Math.sin(a)); } for (let r = 8; r <= 28; r += 7) { for (let i = 0; i <= 8; i++) { const a0 = i * PI / 4, a1 = (i + 1) * PI / 4; const p0 = [32 + r * Math.cos(a0), 32 + r * Math.sin(a0)], p1 = [32 + r * Math.cos(a1), 32 + r * Math.sin(a1)]; if (i === 0) X.moveTo(p0[0], p0[1]); const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; X.quadraticCurveTo(32 + (mx - 32) * 0.86, 32 + (my - 32) * 0.86, p1[0], p1[1]); } } }); line(t, '#e8e4dc', 1.6, { ol: OLW * 0.45 }); shape(union(circ(40, 40, 5), ell(46, 46, 5.5, 4.5, 0.6)), mat('#2a2030', 34, 34, 52, 52), { ol: OLW * 0.7 }); line(open(() => { for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { X.moveTo(41, 41); X.lineTo(41 + dx * 7, 41 + dy * 5); X.lineTo(41 + dx * 10, 41 + dy * 9); } }), '#2a2030', 1.6, { ol: 0 }); });
  reg('plague', () => { glow(32, 32, 28, '#8ad34a', 0.5); skull(32, 32, 15, '#b8d070', { eyes: '#2a4a10' }); for (const [px, py] of [[12, 16], [52, 14], [50, 50], [12, 48]]) { fill(ell(px, py, 3, 2), '#2a2a1a'); line(open(() => { X.moveTo(px - 2, py - 2); X.lineTo(px - 5, py - 5); X.moveTo(px + 2, py - 2); X.lineTo(px + 5, py - 5); }), 'rgba(200,220,200,0.6)', 1, { ol: 0 }); } fill(circ(46, 26, 2.5), '#c8f090'); fill(circ(18, 30, 2), '#c8f090'); });
  reg('resurrect', () => { glow(32, 24, 26, '#fff2b0', 0.8); shape(path(() => { X.moveTo(20, 60); X.lineTo(20, 40); X.arc(32, 40, 12, PI, 0); X.lineTo(44, 60); }), mat('#7a746c', 20, 28, 44, 60, 0.4, 0.5)); shape(union(rr(29, 8, 6, 34, 2), rr(20, 18, 24, 6, 2)), metal('gold', 20, 8, 44, 42), { light: 0.6 }); line(open(() => { X.moveTo(12, 14); X.lineTo(18, 22); X.moveTo(52, 14); X.lineTo(46, 22); X.moveTo(32, 2); X.lineTo(32, 6); }), '#ffe9a0', 2.4); sparkle(52, 36, 5, '#fff6d0', { ol: 0 }); });
  reg('banner', p => { const c = (p && p.color) || '#3f7fe0', c2 = (p && p.color2) || '#c9d9ff'; shape(rr(12, 4, 40, 6, 2), metal('gold', 12, 4, 52, 10)); shape(path(() => { X.moveTo(15, 10); X.lineTo(49, 10); X.lineTo(49, 48); X.lineTo(32, 58); X.lineTo(15, 48); }), lg(15, 10, 49, 58, [[0, mixW(c, 0.35)], [0.5, c], [1, mixK(c, 0.45)]])); X.save(); poly([[15, 10], [49, 10], [49, 48], [32, 58], [15, 48]])(); X.clip(); fill(rr(21, 18, 22, 22, 3), al(c2, 0.9)); shape(star(32, 29, 8, 3.5), c, { ol: OLW * 0.5, bevel: false }); X.restore(); line(seg(32, 10, 32, 58), 'rgba(0,0,20,0.12)', 1, { ol: 0 }); });
  reg('sword', () => sword(32, 32, 58, 0.6));
  reg('shield', () => shield(32, 33, 42, 52, '#8a8f9a', { fill: metal('steel', 12, 8, 52, 58), boss: true }));
  reg('bow', () => bow(34, 32, 54, { arrow: false }));
  reg('staff', () => staff(32, 32, 58, 0.3, { orb: '#5a7ff0', bands: true }));

  // ================================================================ TOMES (6 affinities × 5 tiers)
  group('tomes');
  const TOME_METAL = { 1: 'bronze', 2: 'iron', 3: 'silver', 4: 'gold', 5: 'gold' };
  for (const aid of Object.keys(AFF)) for (let t = 1; t <= 5; t++) reg('tome_' + aid + '_' + t, () => {
    const c = mixK(AFF[aid], 0.25);
    if (t >= 4) glow(32, 32, 32, AFFL[aid], t === 5 ? 0.9 : 0.5);
    book(32, 32, 48, 58, c, {
      corners: TOME_METAL[t], gems: t, gemColor: AFFL[aid], border: al(AFFL[aid], 0.6),
      emblem: (ex, ey) => {
        shape(circ(ex, ey, 14.5), rg(ex - 3, ey - 3, 0, 16, [[0, mixK(AFFD[aid], 0.1)], [1, mixK(AFFD[aid], 0.55)]]), { ol: OLW * 0.6, light: 0.25, dark: 0.35 });
        line(circ(ex, ey, 14.2), metal(TOME_METAL[t], ex - 14, ey - 14, ex + 14, ey + 14), 2, { ol: 0 });
        if (t >= 3) glow(ex, ey, 12, AFFL[aid], 0.5);
        sub(ex, ey, 0.44, affinitySym[aid]);
      },
    });
    if (t === 5) { sparkle(52, 10, 6, '#ffffff', { ol: 0 }); sparkle(12, 54, 4, '#ffffff', { ol: 0 }); }
  });

  // ================================================================ MAP / UI
  group('map');
  const pine = (cx, by, h, c) => { line(seg(cx, by, cx, by - h * 0.3), metal('wood', cx - 2, 0, cx + 2, 0), h * 0.12, { ol: OLW * 0.6 }); for (let i = 0; i < 3; i++) { const yy = by - h * 0.15 - i * h * 0.26, w = h * (0.7 - i * 0.16); shape(poly([[cx, yy - h * 0.38], [cx + w / 2, yy], [cx - w / 2, yy]]), lg(cx - w / 2, yy - h * 0.4, cx + w / 2, yy, [[0, mixW(c, 0.4)], [0.5, c], [1, mixK(c, 0.45)]]), { ol: OLW * 0.7, light: 0.4 }); } };
  const roundTree = (cx, by, h, c) => { line(seg(cx, by, cx, by - h * 0.4), metal('wood', cx - 2, 0, cx + 2, 0), h * 0.12, { ol: OLW * 0.6 }); shape(union(circ(cx, by - h * 0.62, h * 0.32), circ(cx - h * 0.22, by - h * 0.48, h * 0.24), circ(cx + h * 0.22, by - h * 0.5, h * 0.24)), rg(cx - h * 0.15, by - h * 0.75, 0, h * 0.5, [[0, mixW(c, 0.45)], [0.6, c], [1, mixK(c, 0.45)]]), { ol: OLW * 0.7 }); };
  const mountain = (cx, by, w, h, c, snow) => { shape(poly([[cx - w / 2, by], [cx - w * 0.1, by - h], [cx + w * 0.12, by - h * 0.7], [cx + w / 2, by]]), lg(cx - w / 2, by - h, cx + w / 2, by, [[0, mixW(c, 0.4)], [0.5, c], [1, mixK(c, 0.5)]]), { light: 0.4 }); fill(poly([[cx - w * 0.1, by - h + 1], [cx - w * 0.3, by - h * 0.5], [cx - w * 0.2, by - h * 0.55], [cx - w * 0.12, by - h * 0.62], [cx - w * 0.02, by - h * 0.55], [cx + w * 0.06, by - h * 0.62]]), snow || 'rgba(255,255,255,0.85)'); fill(poly([[cx - w * 0.1, by - h + 1], [cx + w * 0.12, by - h * 0.7], [cx + w / 2, by], [cx + w * 0.1, by]]), 'rgba(10,6,20,0.22)'); };
  const roofHouse = (x, by, w, h, wallC, roofC) => { shape(rr(x, by - h * 0.55, w, h * 0.55, 1), mat(wallC, x, by - h * 0.55, x + w, by, 0.35, 0.5)); shape(poly([[x - w * 0.12, by - h * 0.52], [x + w / 2, by - h], [x + w * 1.12, by - h * 0.52]]), mat(roofC, x, by - h, x + w, by - h * 0.5, 0.4, 0.5), { light: 0.5 }); fill(rr(x + w * 0.38, by - h * 0.3, w * 0.24, h * 0.3, 1), '#2a1a12'); };
  const hexTile = (top, bot, fn) => { const t = hexT(32, 32, 29, 0); shape(t, lg(8, 6, 56, 58, [[0, mixW(top, 0.25)], [0.5, top], [1, bot]]), { light: 0.35, dark: 0.45 }); if (fn) { X.save(); t(); X.clip(); fn(); X.restore(); } line(hexT(32, 32, 29, 0), 'rgba(255,240,200,0.25)', 1.2, { ol: 0 }); };
  const waves = (y, c, n) => line(open(() => { for (let r = 0; r < (n || 2); r++) { const yy = y + r * 9; X.moveTo(6, yy); for (let i = 0; i < 4; i++) X.quadraticCurveTo(12 + i * 14, yy - 5, 19 + i * 14, yy); } }), c, 2, { ol: OLW * 0.4, cap: 'round' });

  reg('city', () => {
    shape(rr(6, 40, 52, 16, 2), mat('#8a8a92', 6, 40, 58, 56, 0.35, 0.5));
    line(open(() => { for (let i = 0; i < 6; i++) { X.moveTo(8 + i * 9, 44); X.lineTo(14 + i * 9, 44); } X.moveTo(6, 49); X.lineTo(58, 49); }), 'rgba(0,0,20,0.25)', 1, { ol: 0 });
    fill(path(() => { X.moveTo(27, 56); X.lineTo(27, 47); X.arc(32, 47, 5, PI, 0); X.lineTo(37, 56); }), '#1a120c');
    tower(8, 42, 12, 26, '#8a8a92', { merlons: 2, door: false }); tower(44, 42, 12, 26, '#8a8a92', { merlons: 2, door: false });
    roofHouse(22, 42, 20, 34, '#b8b0a0', '#a03a2a');
    tower(26, 30, 12, 24, '#9a9aa2', { merlons: 2, door: false, windows: false });
    shape(poly([[24, 8], [32, -2], [40, 8]]), mat('#a03a2a', 24, -2, 40, 8), { light: 0.5 });
    flag(32, -4, 8, 8, '#e0b83a', null, { pw: 1.8 });
  });
  reg('outpost', () => {
    line(open(() => { for (let i = 0; i < 7; i++) { X.moveTo(8 + i * 8, 58); X.lineTo(8 + i * 8, 36 - (i % 2) * 3); } X.moveTo(6, 44); X.lineTo(58, 44); }), metal('wood', 0, 30, 0, 58), 4, { hi: true });
    fill(open(() => { for (let i = 0; i < 7; i++) { X.moveTo(8 + i * 8, 32 - (i % 2) * 3); X.lineTo(5 + i * 8, 38 - (i % 2) * 3); X.lineTo(11 + i * 8, 38 - (i % 2) * 3); } }), '#c9a070');
    shape(poly([[14, 40], [32, 14], [50, 40]]), mat('#b89a6a', 14, 14, 50, 40, 0.4, 0.5));
    fill(poly([[26, 40], [32, 26], [38, 40]]), '#2a1a12');
    flag(46, 2, 30, 14, '#3f7fe0', null, { pw: 2.4, pennant: true });
  });
  reg('wonder', () => {
    glow(32, 30, 30, '#ffe9a0', 0.6);
    shape(rr(8, 50, 48, 8, 1), metal('bone', 8, 50, 56, 58)); shape(rr(6, 56, 52, 5, 1), metal('bone', 6, 56, 58, 61));
    for (let i = 0; i < 4; i++) { const x = 13 + i * 12; line(seg(x, 50, x, 22), metal('bone', x - 3, 0, x + 3, 0), 5, { hi: true }); shape(rr(x - 4, 19, 8, 4, 1), metal('bone', x - 4, 19, x + 4, 23), { ol: OLW * 0.6 }); }
    shape(poly([[4, 20], [32, 4], [60, 20]]), metal('gold', 4, 4, 60, 20), { light: 0.6 });
    shape(poly([[10, 20], [32, 8], [54, 20]]), lg(10, 8, 54, 20, [[0, '#f6e6c0'], [1, '#c8b088']]), { ol: OLW * 0.6, light: 0.3 });
    sparkle(52, 8, 6, '#ffffff', { ol: 0 });
  });
  reg('node', () => {
    shape(curve([[8, 50], [20, 42], [44, 42], [58, 52], [50, 60], [14, 60]]), mat('#6a6a72', 8, 42, 58, 60, 0.4, 0.5));
    crystal(20, 34, 12, 26, '#6ea8ff', -0.45); crystal(46, 36, 11, 22, '#6ea8ff', 0.5); crystal(32, 28, 16, 38, '#8ac0ff', 0.05);
  });
  reg('free_city', () => {
    shape(rr(6, 42, 52, 14, 2), mat('#a89a80', 6, 42, 58, 56, 0.35, 0.5));
    fill(path(() => { X.moveTo(27, 56); X.lineTo(27, 48); X.arc(32, 48, 5, PI, 0); X.lineTo(37, 56); }), '#1a120c');
    roofHouse(9, 44, 14, 24, '#c8b898', '#4f8a3a'); roofHouse(41, 44, 14, 24, '#c8b898', '#4f8a3a');
    roofHouse(23, 44, 18, 32, '#d8c8a8', '#3a7a4a');
    flag(48, 4, 26, 14, '#f4efe4', '#5fb043', { pw: 2.2 });
  });
  reg('infestation', () => {
    glow(32, 36, 26, '#d23aff', 0.35);
    shape(curve([[6, 58], [10, 30], [24, 14], [42, 12], [56, 28], [58, 58]]), mat('#3a2a3a', 6, 12, 58, 58, 0.3, 0.55));
    fill(curve([[16, 58], [18, 38], [32, 28], [46, 38], [48, 58]]), '#08060c');
    for (const [px] of [[26], [38]]) { glow(px, 44, 6, '#ff3a2a', 0.9); fill(ell(px, 44, 3, 2.2), '#ff5a3a'); }
    line(open(() => { X.moveTo(8, 24); X.lineTo(20, 26); X.lineTo(14, 36); X.moveTo(8, 24); X.lineTo(14, 36); X.moveTo(56, 22); X.lineTo(46, 26); X.lineTo(52, 36); X.moveTo(56, 22); X.lineTo(52, 36); }), 'rgba(230,225,240,0.6)', 1, { ol: 0 });
    skull(48, 54, 5, '#d8d0c0', { ol: OLW * 0.5 });
  });
  reg('army', () => {
    line(seg(44, 60, 44, 6), metal('wood', 42, 0, 46, 0), 3.2, { hi: true }); shape(poly([[44, 6], [49, 14], [39, 14]]), metal('steel', 39, 6, 49, 14), { light: 0.7 });
    shield(22, 36, 30, 40, '#8a8f9a', { fill: metal('steel', 7, 16, 37, 56), rim: metal('gold', 7, 16, 37, 56) });
    shield(38, 34, 30, 40, '#3a63b0', { boss: true });
    helmet(24, 14, 22, { plume: '#c0342a' });
  });
  reg('hero_star', () => {
    shape(circ(32, 32, 27), rg(26, 26, 0, 32, [[0, '#2c3448'], [1, '#12161f']]), { light: 0.3, dark: 0.5 });
    line(circ(32, 32, 23.5), metal('gold', 8, 8, 56, 56), 2, { ol: OLW * 0.4 });
    wing(36, 32, 22, 14, 1, '#f4f0e8', { ol: OLW * 0.7 }); wing(28, 32, 22, 14, -1, '#f4f0e8', { ol: OLW * 0.7 });
    glow(32, 32, 16, '#fff2b0', 0.7); shape(star(32, 33, 14, 6), metal('gold', 18, 19, 46, 47), { light: 0.6 }); spec(28, 28, 2.5);
  });
  reg('sword_crossed', () => { sword(32, 32, 56, 0.7); sword(32, 32, 56, -0.7); });
  reg('flag', () => flag(16, 6, 58, 42, '#3a63b0', '#f1d98a', { pw: 3.4 }));
  reg('scroll', () => scroll(32, 32, 48, 52, { seal: '#c0342a' }));
  reg('gear', () => gear(32, 32, 27, 8, '#8a9098', { fill: metal('steel', 6, 6, 58, 58) }));
  const speaker = () => { shape(union(rr(8, 24, 12, 16, 2), poly([[18, 26], [34, 12], [34, 52], [18, 38]])), metal('steel', 8, 12, 34, 52)); };
  reg('sound_on', () => { speaker(); for (let i = 0; i < 3; i++) line(arcT(36, 32, 8 + i * 7, -0.8, 0.8), '#ffd86a', 3, { ol: OLW * 0.5 }); });
  reg('sound_off', () => { speaker(); line(open(() => { X.moveTo(40, 22); X.lineTo(58, 42); X.moveTo(58, 22); X.lineTo(40, 42); }), '#e0452b', 4.5); });
  reg('music', () => { line(open(() => { X.moveTo(24, 46); X.lineTo(24, 12); X.lineTo(50, 6); X.lineTo(50, 40); }), metal('gold', 20, 6, 52, 46), 4.5, { hi: true }); line(seg(24, 20, 50, 14), metal('gold', 20, 6, 52, 46), 4.5, { ol: OLW * 0.5 }); shape(ell(17, 48, 9, 6.5, -0.35), metal('gold', 8, 40, 26, 56)); shape(ell(43, 42, 9, 6.5, -0.35), metal('gold', 34, 34, 52, 50)); });
  const disc = (c1, c2) => { shape(circ(32, 32, 27), rg(26, 26, 0, 32, [[0, c1], [1, c2]]), { light: 0.45, dark: 0.5 }); line(circ(32, 32, 23.5), 'rgba(255,255,255,0.22)', 1.5, { ol: 0 }); };
  reg('close', () => { disc('#5a3a3a', '#2a1414'); line(open(() => { X.moveTo(20, 20); X.lineTo(44, 44); X.moveTo(44, 20); X.lineTo(20, 44); }), lg(20, 20, 44, 44, [[0, '#ffd0c0'], [1, '#e0452b']]), 6); });
  const ARROWS = { arrow_right: 0, arrow_down: PI / 2, arrow_left: PI, arrow_up: -PI / 2 };
  for (const id of Object.keys(ARROWS)) reg(id, () => fatArrow(32, 32, 50, 16, ARROWS[id]));
  reg('check', () => line(open(() => { X.moveTo(10, 34); X.lineTo(26, 50); X.lineTo(54, 16); }), lg(10, 16, 54, 50, [[0, '#c5f0a8'], [0.5, '#5fb043'], [1, '#2c5e1c']]), 8, { hi: true }));
  reg('cross', () => line(open(() => { X.moveTo(14, 14); X.lineTo(50, 50); X.moveTo(50, 14); X.lineTo(14, 50); }), lg(14, 14, 50, 50, [[0, '#ffb3a0'], [0.5, '#e0452b'], [1, '#7a1e12']]), 8, { hi: true }));
  reg('plus', () => shape(union(rr(26, 8, 12, 48, 3), rr(8, 26, 48, 12, 3)), metal('gold', 8, 8, 56, 56), { light: 0.6 }));
  reg('minus', () => shape(rr(8, 26, 48, 12, 3), metal('gold', 8, 26, 56, 38), { light: 0.6 }));
  reg('info', () => { disc('#3a5fb0', '#1a2a60'); text('i', 32, 33, 34, '#ffffff', { ol: OLW * 0.6, font: 'Georgia, serif' }); });
  reg('warning', () => { shape(poly([[32, 6], [60, 56], [4, 56]]), lg(4, 6, 60, 56, [[0, '#ffe9a0'], [0.5, '#e0a72b'], [1, '#8a5a10']]), { light: 0.5 }); exclaim(32, 36, 30, '#2a1a08'); });
  reg('lock', () => { line(open(() => { X.moveTo(20, 30); X.lineTo(20, 20); X.arc(32, 20, 12, PI, 0); X.lineTo(44, 30); }), metal('steel', 20, 8, 44, 30), 6, { hi: true }); shape(rr(12, 28, 40, 30, 5), metal('gold', 12, 28, 52, 58), { light: 0.6 }); fill(union(circ(32, 40, 4.5), rr(30, 40, 4, 10, 1.5)), INK); });
  reg('hourglass', () => hourglass(32, 32, 52));
  reg('eye', () => eye(32, 32, 54, 18, '#3a7fe0'));
  reg('eye_closed', () => { line(open(() => { X.moveTo(6, 28); X.quadraticCurveTo(32, 50, 58, 28); }), '#e8e0d0', 4, { hi: true }); line(open(() => { for (let i = 0; i < 5; i++) { const t = 0.15 + i * 0.175; const px = 6 + 52 * t, py = 28 + 44 * t * (1 - t); X.moveTo(px, py); X.lineTo(px + (t - 0.5) * 16, py + 9); } }), '#e8e0d0', 3, { ol: OLW * 0.6 }); });
  reg('peace', () => { shape(path(() => { X.moveTo(12, 38); X.quadraticCurveTo(24, 26, 40, 30); X.quadraticCurveTo(46, 22, 52, 24); X.lineTo(58, 26); X.lineTo(50, 28); X.quadraticCurveTo(52, 40, 40, 46); X.quadraticCurveTo(30, 50, 22, 44); X.lineTo(10, 46); }), lg(10, 22, 58, 50, [[0, '#ffffff'], [0.5, '#eeeae0'], [1, '#b8b0a0']]), { light: 0.4 }); shape(path(() => { X.moveTo(26, 34); X.quadraticCurveTo(18, 16, 36, 12); X.quadraticCurveTo(34, 24, 38, 32); }), lg(18, 12, 38, 34, [[0, '#ffffff'], [1, '#c8c0b0']]), { ol: OLW * 0.7, light: 0.4 }); fill(circ(48, 26, 1.5), INK); vine(20, 58, 48, 50, '#5fb043', { n: 2, w: 2.4 }); });
  reg('war', () => { glow(32, 32, 30, '#ff5a2a', 0.5); shape(star(32, 32, 28, 18, 10), lg(4, 4, 60, 60, [[0, '#ff9a6a'], [0.5, '#c8301a'], [1, '#5a1008']]), { light: 0.4 }); sword(32, 32, 50, 0.7, { w: 6 }); sword(32, 32, 50, -0.7, { w: 6 }); });
  reg('alliance', () => { line(circ(24, 32, 15), metal('gold', 9, 17, 39, 47), 6, { hi: true }); line(circ(40, 32, 15), metal('silver', 25, 17, 55, 47), 6, { hi: true }); X.save(); X.beginPath(); X.rect(24, 10, 16, 22); X.clip(); line(circ(24, 32, 15), metal('gold', 9, 17, 39, 47), 6, { hi: true }); X.restore(); });
  reg('trade', () => { coin(20, 40, 12, 4.5, 5); coin(44, 24, 12, 4.5, 5); line(open(() => { X.moveTo(16, 24); X.quadraticCurveTo(18, 8, 34, 8); X.moveTo(48, 40); X.quadraticCurveTo(46, 56, 30, 56); }), '#8fd16a', 3.4, { hi: true }); shape(poly([[34, 3], [42, 8], [34, 13]]), '#8fd16a'); shape(poly([[30, 51], [22, 56], [30, 61]]), '#8fd16a'); });
  reg('vassal', () => { crown(32, 18, 34, 24, { metal: 'silver' }); for (let i = 0; i < 3; i++) chainLink(32, 36 + i * 9, 6, 11, 0, 'iron'); });
  reg('skull', () => skull(32, 32, 20));
  reg('star', () => { glow(32, 32, 30, '#ffe9a0', 0.5); shape(star(32, 33, 27, 11.5), metal('gold', 6, 6, 58, 58), { light: 0.6 }); spec(24, 24, 4); });
  reg('crown', () => crown(32, 34, 50, 36));
  reg('castle', () => { shape(rr(14, 34, 36, 24, 1), mat('#8a8a92', 14, 34, 50, 58, 0.35, 0.5)); fill(open(() => { for (let i = 0; i < 4; i++) X.rect(16 + i * 9, 30, 5, 5); }), '#8a8a92'); fill(path(() => { X.moveTo(26, 58); X.lineTo(26, 46); X.arc(32, 46, 6, PI, 0); X.lineTo(38, 58); }), '#1a120c'); tower(6, 60, 14, 40, '#9a9aa2', { merlons: 2, door: false }); tower(44, 60, 14, 40, '#9a9aa2', { merlons: 2, door: false }); tower(26, 32, 12, 26, '#9a9aa2', { merlons: 2, door: false, windows: false }); });
  reg('wall', () => { shape(union(rr(4, 26, 56, 30, 1), poly([[4, 26], [4, 16], [14, 16], [14, 26], [24, 26], [24, 16], [34, 16], [34, 26], [44, 26], [44, 16], [54, 16], [54, 26], [60, 26]])), mat('#8a8a92', 4, 16, 60, 56, 0.35, 0.5)); line(open(() => { for (let r = 0; r < 3; r++) { X.moveTo(4, 34 + r * 8); X.lineTo(60, 34 + r * 8); for (let i = 0; i < 5; i++) { const px = 8 + i * 12 + (r % 2) * 6; X.moveTo(px, 34 + r * 8); X.lineTo(px, 42 + r * 8); } } }), 'rgba(0,0,20,0.25)', 1.2, { ol: 0 }); });
  reg('gate', () => { shape(rr(6, 20, 52, 38, 1), mat('#8a8a92', 6, 20, 58, 58, 0.35, 0.5)); fill(open(() => { for (let i = 0; i < 5; i++) X.rect(8 + i * 11, 15, 6, 6); }), '#8a8a92'); fill(path(() => { X.moveTo(18, 58); X.lineTo(18, 38); X.arc(32, 38, 14, PI, 0); X.lineTo(46, 58); }), '#1a120c'); line(open(() => { for (let i = 0; i < 4; i++) { X.moveTo(21 + i * 7.3, 30); X.lineTo(21 + i * 7.3, 58); } for (let i = 0; i < 3; i++) { X.moveTo(18, 38 + i * 8); X.lineTo(46, 38 + i * 8); } }), metal('iron', 18, 24, 46, 58), 2.2, { ol: OLW * 0.4 }); });
  reg('hammer', () => hammer(32, 34, 52, 0.7));
  reg('anvil', () => anvil(32, 34, 52, 32));
  reg('book', () => book(32, 32, 44, 54, '#7a2e2a', { corners: 'gold' }));
  reg('potion', () => potion(32, 34, 50, '#d23aff'));
  reg('item_weapon', () => { line(seg(14, 54, 38, 24), metal('wood', 14, 54, 38, 24), 4, { hi: true }); shape(star(42, 20, 15, 10, 8), metal('iron', 27, 5, 57, 35), { light: 0.6 }); shape(circ(42, 20, 8), metal('steel', 34, 12, 50, 28)); });
  reg('item_armor', () => { shape(path(() => { X.moveTo(12, 10); X.lineTo(24, 6); X.quadraticCurveTo(32, 12, 40, 6); X.lineTo(52, 10); X.lineTo(56, 26); X.lineTo(50, 30); X.lineTo(50, 52); X.quadraticCurveTo(32, 62, 14, 52); X.lineTo(14, 30); X.lineTo(8, 26); }), metal('steel', 8, 6, 56, 62), { light: 0.7 }); line(open(() => { X.moveTo(32, 14); X.lineTo(32, 54); X.moveTo(18, 30); X.quadraticCurveTo(32, 40, 46, 30); }), 'rgba(20,20,40,0.35)', 2, { ol: 0 }); shape(circ(32, 30, 4), metal('gold', 28, 26, 36, 34), { ol: OLW * 0.6 }); });
  reg('item_helm', () => helmet(32, 33, 50, { metal: 'steel' }));
  reg('item_trinket', () => { line(open(() => { X.moveTo(14, 8); X.quadraticCurveTo(12, 34, 32, 40); X.quadraticCurveTo(52, 34, 50, 8); }), metal('gold', 12, 8, 52, 40), 3, { hi: true }); glow(32, 46, 14, '#5fe6c0', 0.8); shape(poly([[32, 34], [42, 46], [32, 60], [22, 46]]), gem('#3fd0b0', 32, 46, 12), { light: 0.6 }); fill(poly([[32, 34], [42, 46], [32, 46]]), 'rgba(255,255,255,0.35)'); shape(rr(29, 30, 6, 6, 2), metal('gold', 29, 30, 35, 36), { ol: OLW * 0.6 }); });
  reg('item_mount', () => { horseHead(30, 32, 54, '#5a3a2a', { mane: '#2a1a12' }); line(open(() => { X.moveTo(38, 10); X.lineTo(48, 34); X.moveTo(30, 36); X.lineTo(52, 34); }), metal('gold', 30, 10, 52, 36), 2, { ol: OLW * 0.5 }); });
  reg('item_offhand', () => { shape(circ(32, 32, 26), metal('bronze', 6, 6, 58, 58), { light: 0.6 }); line(circ(32, 32, 19), 'rgba(40,20,10,0.4)', 2.5, { ol: 0 }); shape(circ(32, 32, 8), metal('iron', 24, 24, 40, 40)); for (let i = 0; i < 6; i++) { const a = i * PI / 3; fill(circ(32 + 22.5 * Math.cos(a), 32 + 22.5 * Math.sin(a), 1.8), '#3a2410'); } });
  const RARITY = { common: '#9aa0a8', uncommon: '#5fb043', rare: '#3f7fe0', epic: '#a050e0', legendary: '#ffa030' };
  for (const id of Object.keys(RARITY)) reg('rarity_' + id, () => { const c = RARITY[id]; if (id !== 'common') glow(32, 32, 30, c, id === 'legendary' ? 0.9 : 0.55); const t = poly([[32, 6], [52, 20], [56, 36], [32, 58], [8, 36], [12, 20]]); shape(t, gem(c, 32, 30, 26), { light: 0.6 }); fill(poly([[32, 6], [52, 20], [32, 26], [12, 20]]), 'rgba(255,255,255,0.35)'); fill(poly([[32, 26], [56, 36], [32, 58]]), 'rgba(10,6,30,0.25)'); line(open(() => { X.moveTo(12, 20); X.lineTo(32, 26); X.lineTo(52, 20); X.moveTo(32, 26); X.lineTo(32, 58); }), 'rgba(255,255,255,0.3)', 1.2, { ol: 0 }); if (id === 'legendary') { sparkle(52, 10, 7, '#ffffff', { ol: 0 }); sparkle(10, 46, 5, '#ffffff', { ol: 0 }); } });
  const B = PAL.biome;
  const TERRAIN = {
    ocean: () => hexTile(B.ocean[1], B.ocean[0], () => waves(26, 'rgba(200,230,255,0.7)', 3)),
    coast: () => hexTile(B.coast[1], B.coast[0], () => { fill(curve([[2, 62], [8, 44], [30, 40], [50, 46], [62, 62]]), mat('#e8cf8f', 2, 40, 62, 62)); waves(24, 'rgba(220,240,255,0.75)', 2); }),
    lake: () => hexTile(B.grass[1], B.grass[0], () => { shape(ell(32, 34, 20, 13, 0), lg(12, 21, 52, 47, [[0, '#5ab0d8'], [1, '#2b6f9c']]), { ol: OLW * 0.6, light: 0.4 }); line(open(() => { X.moveTo(20, 34); X.quadraticCurveTo(26, 30, 32, 34); X.quadraticCurveTo(38, 38, 44, 34); }), 'rgba(220,240,255,0.7)', 1.6, { ol: 0 }); }),
    grass: () => hexTile(B.grass[1], B.grass[0], () => line(open(() => { for (let i = 0; i < 7; i++) { const px = 12 + i * 7, py = 30 + (i % 3) * 8; X.moveTo(px, py + 6); X.quadraticCurveTo(px + 1, py, px + 3, py - 4); X.moveTo(px, py + 6); X.quadraticCurveTo(px - 2, py + 1, px - 3, py - 2); } }), 'rgba(220,255,160,0.7)', 1.6, { ol: 0 })),
    forest: () => hexTile(B.forest[1], B.forest[0], () => { pine(20, 52, 30, '#2f5a33'); pine(44, 50, 32, '#3a6a3a'); pine(32, 44, 26, '#2f5a33'); }),
    hills: () => hexTile(B.hills[1], B.hills[0], () => { shape(curve([[2, 62], [14, 36], [34, 44], [50, 30], [64, 62]]), mat('#8c9a4a', 2, 30, 64, 62), { ol: OLW * 0.6 }); shape(curve([[16, 62], [30, 40], [48, 62]]), mat('#a9b25e', 16, 40, 48, 62), { ol: OLW * 0.6 }); }),
    mountain: () => hexTile(B.mountain[1], B.mountain[0], () => { mountain(18, 60, 34, 32, '#7d7a74'); mountain(38, 60, 40, 44, '#8a8680'); }),
    desert: () => hexTile(B.desert[1], B.desert[0], () => { shape(curve([[2, 62], [12, 42], [34, 48], [50, 38], [64, 62]]), mat('#d6b16a', 2, 38, 64, 62), { ol: OLW * 0.5 }); sun(46, 20, 5, '#ffe08a', { rays: 8, rayLen: 5 }); }),
    snow: () => hexTile(B.snow[1], B.snow[0], () => { pine(20, 52, 26, '#8fa8a0'); fill(ell(20, 40, 6, 3), 'rgba(255,255,255,0.9)'); snowflake(42, 30, 8, '#bfe9ff', { glow: false }); snowflake(50, 46, 5, '#bfe9ff', { glow: false }); }),
    swamp: () => hexTile(B.swamp[1], B.swamp[0], () => { fill(ell(34, 44, 20, 8), '#2b4a3a'); line(open(() => { for (let i = 0; i < 5; i++) { const px = 16 + i * 8; X.moveTo(px, 50); X.lineTo(px + 2, 24 + (i % 2) * 6); } }), '#6a8a3a', 2, { ol: OLW * 0.4 }); for (let i = 0; i < 5; i++) fill(ell(18 + i * 8, 24 + (i % 2) * 6, 1.6, 4), '#4a3020'); }),
    volcanic: () => hexTile(B.volcanic[1], B.volcanic[0], () => { mountain(32, 60, 44, 42, '#4a3030', 'rgba(0,0,0,0)'); glow(28, 20, 10, '#ff7a1a', 0.9); crack([[28, 20], [24, 34], [28, 46], [22, 58]], '#ff8a2a', 2.6); crack([[30, 22], [36, 36], [34, 50]], '#ffb040', 2); fill(circ(28, 19, 3), '#ffd060'); }),
  };
  for (const id of Object.keys(TERRAIN)) reg('terrain_' + id, TERRAIN[id]);
  reg('feature_forest', () => { pine(18, 58, 34, '#2f5a33'); roundTree(46, 56, 34, '#4f8a3a'); pine(32, 52, 30, '#3a6a3a'); });
  reg('feature_hills', () => { shape(curve([[2, 60], [14, 30], [34, 40], [50, 22], [64, 60]]), mat('#8c9a4a', 2, 22, 64, 60)); shape(curve([[14, 60], [30, 34], [50, 60]]), mat('#a9b25e', 14, 34, 50, 60)); });
  reg('feature_mountain', () => { mountain(20, 58, 36, 34, '#7d7a74'); mountain(40, 58, 42, 48, '#8a8680'); });
  reg('feature_ruins', () => { shape(rr(6, 50, 52, 8, 1), metal('bone', 6, 50, 58, 58)); for (const [x, h] of [[14, 30], [30, 18], [46, 36]]) { line(seg(x, 50, x, 50 - h), metal('bone', x - 3, 0, x + 3, 0), 6, { hi: true }); shape(rr(x - 4, 47 - h, 8, 4, 1), metal('bone', x - 4, 47 - h, x + 4, 51 - h), { ol: OLW * 0.6 }); } crack([[46, 14], [50, 24], [44, 30]], 'rgba(60,40,20,0.5)', 1.6); vine(6, 60, 24, 32, '#5fb043', { n: 2, w: 2 }); });
  reg('feature_crystal', () => { shape(curve([[8, 52], [20, 44], [44, 44], [58, 54], [50, 60], [14, 60]]), mat('#6a6a72', 8, 44, 58, 60, 0.4, 0.5)); crystal(18, 36, 12, 26, '#d23aff', -0.5); crystal(46, 38, 11, 22, '#d23aff', 0.5); crystal(32, 30, 16, 40, '#e070ff', 0.05); });
  reg('weather_sun', () => sun(32, 32, 12, '#ffd86a', { rays: 12, rayLen: 14 }));
  reg('weather_rain', () => { cloud(32, 24, 52, 30, '#9aa4b8'); for (let i = 0; i < 4; i++) drop(16 + i * 11, 48 + (i % 2) * 6, 7, 12, '#5aa9ff', { ol: OLW * 0.6 }); });
  reg('weather_snow', () => { cloud(32, 24, 52, 30, '#dfe7ee'); for (let i = 0; i < 3; i++) snowflake(18 + i * 14, 50 + (i % 2) * 5, 6, '#bfe9ff', { glow: false }); });
  reg('turn', () => { line(arcT(32, 32, 24, -1.2, 4.2), metal('gold', 8, 8, 56, 56), 5, { hi: true }); shape(poly([[40, 4], [50, 14], [36, 18]]), metal('gold', 36, 4, 50, 18)); hourglass(32, 33, 30, { metal: 'gold' }); });
  reg('end_turn', () => { glow(32, 32, 30, '#ffe9a0', 0.4); line(arcT(32, 32, 25, -1.2, 4.2), metal('gold', 8, 8, 56, 56), 6, { hi: true }); shape(poly([[40, 2], [52, 13], [36, 18]]), metal('gold', 36, 2, 52, 18)); line(open(() => { X.moveTo(20, 34); X.lineTo(29, 43); X.lineTo(46, 22); }), lg(20, 22, 46, 43, [[0, '#c5f0a8'], [1, '#5fb043']]), 6, { hi: true }); });
  reg('zoom_in', () => magnifier(32, 32, 60, { inner: (cx, cy, r) => line(open(() => { X.moveTo(cx - r * 0.5, cy); X.lineTo(cx + r * 0.5, cy); X.moveTo(cx, cy - r * 0.5); X.lineTo(cx, cy + r * 0.5); }), '#2a3a5a', 3.5, { ol: 0 }) }));
  reg('zoom_out', () => magnifier(32, 32, 60, { inner: (cx, cy, r) => line(seg(cx - r * 0.5, cy, cx + r * 0.5, cy), '#2a3a5a', 3.5, { ol: 0 }) }));
  reg('save', () => { scroll(26, 32, 40, 50, { seal: '#c0342a' }); fatArrow(52, 34, 26, 8, PI / 2, lg(44, 20, 60, 48, [[0, '#c5f0a8'], [0.5, '#5fb043'], [1, '#2c5e1c']])); });
  reg('load', () => { scroll(26, 32, 40, 50, { seal: '#3f7fe0' }); fatArrow(52, 34, 26, 8, -PI / 2, lg(44, 20, 60, 48, [[0, '#c0ceff'], [0.5, '#5a7ff0'], [1, '#27357a']])); });
  reg('settings', () => { gear(32, 32, 27, 8, '#8a9098', { fill: metal('steel', 6, 6, 58, 58) }); gear(32, 32, 14, 6, '#c9a24a', { fill: metal('gold', 18, 18, 46, 46), hole: 0.5, rot: 0.3 }); });
  reg('language', () => { bubble(24, 24, 36, 30, '#f4efe4'); text('A', 24, 22, 20, '#2b2116', { ol: 0 }); bubble(42, 40, 36, 30, '#5a7ff0', { light: 0.5 }); text('가', 42, 38, 18, '#ffffff', { ol: 0, font: '"Noto Sans KR", sans-serif' }); });
  reg('help', () => { disc('#3a5fb0', '#1a2a60'); text('?', 32, 33, 36, '#ffffff', { ol: OLW * 0.6 }); });
  reg('menu', () => { for (let i = 0; i < 3; i++) shape(rr(8, 12 + i * 15, 48, 10, 3), metal('gold', 8, 12 + i * 15, 56, 22 + i * 15), { light: 0.6 }); });
  reg('victory', () => { glow(32, 32, 30, '#ffe9a0', 0.6); for (const s of [-1, 1]) { line(open(() => { X.moveTo(32 + s * 6, 58); X.quadraticCurveTo(32 + s * 32, 50, 32 + s * 24, 16); }), '#5fb043', 3, { hi: true }); for (let i = 0; i < 5; i++) { const t = 0.15 + i * 0.18; const px = 32 + s * (6 + 26 * Math.sin(t * PI)) , py = 58 - 42 * t; leaf(px + s * 3, py, 6, 11, '#6fb832', s * (1.2 - t * 0.8), { ol: OLW * 0.6 }); } } crown(32, 30, 32, 24); });
  reg('defeat', () => { X.save(); X.translate(32, 36); X.rotate(0.35); crown(0, 0, 40, 30, { metal: 'iron', gems: ['#3a3040', '#3a3040', '#3a3040'] }); X.restore(); crack([[20, 20], [26, 30], [22, 40], [30, 50]], INK, 2.6); crack([[44, 22], [40, 34], [46, 44]], INK, 2.2); drop(52, 12, 8, 13, '#c8202a', { ol: OLW * 0.6 }); });
  reg('research', () => { openBook(30, 38, 54, 36, '#5a3a8a'); magnifier(44, 26, 40); });
  reg('spellbook', () => { glow(32, 32, 30, '#a070e0', 0.6); book(32, 32, 44, 54, '#3a2a6a', { corners: 'gold', emblem: (ex, ey) => { glow(ex, ey, 12, '#d0b0ff', 0.9); runeRing(ex, ey, 9, '#c0a0ff', { ticks: 6 }); } }); shape(rr(46, 26, 10, 12, 2), metal('gold', 46, 26, 56, 38), { ol: OLW * 0.6 }); });
  reg('empire', () => { shape(circ(32, 38, 20), sphere('#3a7fe0', 32, 38, 20), { light: 0.6 }); X.save(); circ(32, 38, 20)(); X.clip(); line(open(() => { X.moveTo(12, 38); X.lineTo(52, 38); X.moveTo(32, 18); X.lineTo(32, 58); }), 'rgba(255,255,255,0.35)', 1.6, { ol: 0 }); line(ell(32, 38, 9, 20), 'rgba(255,255,255,0.35)', 1.6, { ol: 0 }); fill(curve([[16, 34], [24, 26], [34, 30], [30, 40], [20, 42]]), 'rgba(120,200,90,0.7)'); fill(curve([[38, 44], [48, 40], [50, 48], [42, 54]]), 'rgba(120,200,90,0.7)'); X.restore(); crown(32, 14, 30, 22); });
  reg('diplomacy', () => { scroll(28, 36, 40, 44, { seal: '#c0342a' }); shape(path(() => { X.moveTo(40, 58); X.quadraticCurveTo(44, 30, 58, 8); X.quadraticCurveTo(56, 26, 48, 40); X.quadraticCurveTo(46, 50, 40, 58); }), lg(40, 8, 58, 58, [[0, '#ffffff'], [0.5, '#e8e0d0'], [1, '#a89880']]), { light: 0.4 }); line(open(() => { X.moveTo(42, 54); X.quadraticCurveTo(48, 30, 57, 10); }), 'rgba(60,40,20,0.35)', 1.2, { ol: 0 }); });
  reg('heroes', () => { helmet(32, 35, 46, { plume: '#c0342a', metal: 'steel' }); glow(32, 12, 12, '#fff2b0', 0.8); shape(star(32, 12, 9, 4), metal('gold', 24, 4, 40, 20), { ol: OLW * 0.7 }); });
  reg('cities', () => { roofHouse(6, 56, 16, 28, '#c8b898', '#a03a2a'); roofHouse(42, 56, 16, 28, '#c8b898', '#a03a2a'); roofHouse(22, 58, 20, 40, '#d8c8a8', '#7a3a2a'); tower(28, 32, 8, 18, '#9a9aa2', { merlons: 2, door: false, windows: false }); });
  reg('next_unit', () => { figure(20, 34, 40, '#c9b28a'); fatArrow(46, 34, 26, 9, 0, metal('gold', 34, 26, 58, 42)); });
  reg('center', () => { line(hexT(32, 32, 26), '#ffd86a', 2.4, { hi: true }); line(open(() => { X.moveTo(32, 6); X.lineTo(32, 20); X.moveTo(32, 44); X.lineTo(32, 58); X.moveTo(8, 32); X.lineTo(20, 32); X.moveTo(44, 32); X.lineTo(56, 32); }), '#ffd86a', 3); shape(circ(32, 32, 5), sphere('#ffe08a', 32, 32, 5)); });
  reg('sleep', () => { crescent(26, 36, 20, '#c0ceff', 0.6, { light: 0.6 }); text('z', 42, 20, 16, '#ffffff', { ol: OLW * 0.7 }); text('z', 52, 10, 12, '#ffffff', { ol: OLW * 0.6 }); text('z', 36, 34, 11, '#ffffff', { ol: OLW * 0.6 }); });
  reg('disband', () => { figure(26, 34, 44, '#9aa0a8'); line(open(() => { X.moveTo(38, 36); X.lineTo(56, 54); X.moveTo(56, 36); X.lineTo(38, 54); }), '#e0452b', 5); });
  reg('merge', () => { const f = metal('gold', 6, 6, 58, 58); line(open(() => { X.moveTo(8, 12); X.quadraticCurveTo(28, 14, 32, 32); X.moveTo(8, 52); X.quadraticCurveTo(28, 50, 32, 32); }), f, 5, { hi: true }); fatArrow(44, 32, 26, 9, 0, f); });
  reg('split', () => { const f = metal('gold', 6, 6, 58, 58); line(seg(6, 32, 24, 32), f, 5, { hi: true }); line(open(() => { X.moveTo(24, 32); X.quadraticCurveTo(30, 32, 38, 16); X.moveTo(24, 32); X.quadraticCurveTo(30, 32, 38, 48); }), f, 5, { hi: true }); shape(poly([[34, 8], [50, 8], [42, 24]]), f); shape(poly([[34, 56], [50, 56], [42, 40]]), f); });
  reg('annex', () => { shape(hexT(32, 42, 20, 0), lg(12, 30, 52, 58, [[0, '#8fb54a'], [1, '#4f8a3a']]), { light: 0.4 }); flag(24, 6, 46, 26, '#3f7fe0', '#c9d9ff', { pw: 3 }); });
  reg('found_outpost', () => { shape(poly([[8, 54], [32, 24], [56, 54]]), mat('#b89a6a', 8, 24, 56, 54, 0.4, 0.5)); fill(poly([[24, 54], [32, 36], [40, 54]]), '#2a1a12'); flag(46, 4, 30, 14, '#3f7fe0', null, { pw: 2.4, pennant: true }); shape(rr(6, 54, 52, 5, 2), mat('#5a7a3a', 6, 54, 58, 59), { ol: OLW * 0.6 }); });
  reg('build', () => { for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) shape(rr(8 + i * 16 + (r % 2) * 8, 44 - r * 9, 14, 8, 1), mat('#a86a4a', 8, 30, 58, 54, 0.35, 0.5), { ol: OLW * 0.7 }); hammer(36, 24, 44, 0.75); });
  reg('recruit', () => { figure(26, 36, 44, '#c9b28a'); glow(48, 20, 12, '#8fd16a', 0.6); shape(union(rr(45, 8, 6, 24, 2), rr(36, 17, 24, 6, 2)), lg(36, 8, 60, 32, [[0, '#c5f0a8'], [1, '#3f8a2a']]), { light: 0.5 }); });
  reg('queue', () => { for (let i = 0; i < 3; i++) { shape(rr(8, 10 + i * 16, 8, 8, 2), metal('gold', 8, 10 + i * 16, 16, 18 + i * 16), { ol: OLW * 0.7 }); shape(rr(20, 11 + i * 16, 36 - i * 8, 6, 2), lg(20, 0, 56, 0, [[0, '#e8e2d0'], [1, '#a49c88']]), { ol: OLW * 0.7, light: 0.3 }); } hourglass(50, 46, 24, { metal: 'gold' }); });
  reg('up', () => chevron(32, 32, 44, -PI / 2));
  reg('down', () => chevron(32, 32, 44, PI / 2));

  // ================================================================ EXTRA (names referenced by content data: abilities/items icons)
  group('extra');
  reg('axe', () => axe(32, 32, 54, 0.5));
  reg('bolt', () => { glow(32, 32, 28, '#7b6cff', 0.8); X.save(); X.translate(32, 32); X.rotate(-0.8); shape(ell(0, 0, 22, 9), lg(-22, 0, 22, 0, [[0, al('#9a86ff', 0)], [0.5, '#b0a0ff'], [1, '#ffffff']]), { ol: 0, bevel: false }); shape(circ(14, 0, 8), sphere('#a88cff', 14, 0, 8), { light: 0.7 }); spec(11, -3, 2.5); X.restore(); sparkle(50, 10, 5, '#e8d8ff', { ol: 0 }); });
  reg('boots', () => boot(32, 32, 52, '#8a5a34'));
  reg('cannon', () => { shape(circ(24, 48, 9), metal('wood', 15, 39, 33, 57)); shape(circ(24, 48, 3), metal('iron', 21, 45, 27, 51), { ol: OLW * 0.6 }); X.save(); X.translate(32, 34); X.rotate(-0.5); shape(path(() => { X.moveTo(-20, -7); X.lineTo(26, -5); X.lineTo(26, 5); X.lineTo(-20, 7); X.lineTo(-24, 0); }), metal('iron', -20, -7, 26, 7), { light: 0.6 }); shape(rr(20, -7, 6, 14, 2), metal('iron', 20, -7, 26, 7), { ol: OLW * 0.6 }); line(seg(-4, -7, -4, 7), 'rgba(0,0,0,0.3)', 2, { ol: 0 }); X.restore(); flame(58, 14, 12, 16, '#c8321a', '#ff7a1a', '#ffe680', { glow: false }); });
  reg('chain', () => { for (let i = 0; i < 4; i++) chainLink(14 + i * 12, 44 - i * 8, 13, 8, -0.6, 'iron'); });
  reg('cleanse', () => { glow(32, 32, 28, '#7fd8ff', 0.7); drop(32, 32, 32, 48, '#7ad8ff'); sparkle(30, 34, 9, '#ffffff', { ol: 0 }); sparkle(50, 14, 5, '#ffffff', { ol: 0 }); sparkle(12, 46, 4, '#ffffff', { ol: 0 }); });
  reg('dagger', () => dagger(32, 32, 50, 0.6, { glowC: null }));
  reg('dispel', () => { glow(32, 32, 28, '#c0ceff', 0.5); runeRing(32, 32, 20, '#8a9ac8', { ticks: 6 }); line(open(() => { X.moveTo(14, 14); X.lineTo(50, 50); X.moveTo(50, 14); X.lineTo(14, 50); }), '#ffffff', 4.5); });
  reg('fang', () => { for (const [px, s] of [[24, 1], [40, -1]]) shape(path(() => { X.moveTo(px - 8 * s, 10); X.quadraticCurveTo(px + 6 * s, 14, px + 4 * s, 54); X.quadraticCurveTo(px - 2 * s, 30, px - 10 * s, 12); }), metal('bone', px - 10, 10, px + 6, 54), { light: 0.6 }); drop(46, 48, 6, 10, '#c8202a', { ol: OLW * 0.6 }); });
  reg('holy', () => { sun(32, 32, 11, '#ffe08a', { rays: 12, rayLen: 17, face: false }); sparkle(32, 32, 8, '#ffffff', { ol: 0 }); });
  reg('lance', () => { line(seg(10, 56, 44, 14), metal('wood', 10, 56, 44, 14), 4.2, { hi: true }); shape(poly([[44, 14], [56, 2], [50, 18]]), metal('steel', 44, 2, 56, 18), { light: 0.7 }); shape(circ(20, 44, 8), metal('gold', 12, 36, 28, 52), { light: 0.6 }); shape(circ(20, 44, 3), metal('iron', 17, 41, 23, 47), { ol: OLW * 0.6 }); });
  reg('mark', () => { glow(32, 32, 28, '#ff4a3a', 0.4); DEBUFF.marked(); });
  reg('mirror', () => { shape(ell(32, 30, 18, 24), metal('gold', 14, 6, 50, 54), { light: 0.6 }); shape(ell(32, 30, 13.5, 19), lg(18, 10, 46, 50, [[0, '#f0f8ff'], [0.4, '#b8d0e8'], [1, '#5a7898']]), { ol: OLW * 0.6, light: 0.5 }); line(seg(24, 20, 30, 12), 'rgba(255,255,255,0.8)', 3, { ol: 0 }); shape(rr(29, 52, 6, 10, 2), metal('gold', 29, 52, 35, 62), { ol: OLW * 0.7 }); });
  reg('pick', () => { line(seg(20, 58, 44, 20), metal('wood', 20, 58, 44, 20), 4, { hi: true }); shape(path(() => { X.moveTo(10, 26); X.quadraticCurveTo(30, 6, 58, 20); X.quadraticCurveTo(46, 18, 40, 24); X.quadraticCurveTo(30, 16, 12, 30); }), metal('iron', 10, 6, 58, 30), { light: 0.6 }); });
  reg('poison', () => { glow(32, 34, 26, '#8ad34a', 0.5); drop(32, 34, 34, 50, '#5fc03a'); fill(circ(22, 20, 3.2), '#c8f090'); fill(circ(46, 26, 2.4), '#c8f090'); fill(circ(30, 44, 3), 'rgba(255,255,255,0.35)'); });
  reg('rifle', () => { X.save(); X.translate(32, 32); X.rotate(-0.55); shape(path(() => { X.moveTo(-30, 2); X.lineTo(-12, -2); X.lineTo(6, -2); X.lineTo(6, 2); X.lineTo(-14, 6); X.lineTo(-24, 14); X.lineTo(-30, 12); }), metal('wood', -30, -2, 6, 14)); line(seg(0, -1, 32, -3), metal('iron', 0, -4, 32, 0), 4, { hi: true }); shape(rr(-8, 2, 6, 8, 2), metal('iron', -8, 2, -2, 10), { ol: OLW * 0.6 }); X.restore(); });
  reg('rock', () => { shape(curve([[10, 24], [26, 8], [50, 14], [58, 36], [46, 56], [18, 56], [6, 40]]), mat('#7a746c', 6, 8, 58, 56, 0.45, 0.55)); fill(curve([[16, 26], [28, 14], [44, 18], [38, 30], [24, 34]]), 'rgba(255,255,255,0.18)'); crack([[40, 30], [46, 40], [42, 50]], 'rgba(20,14,30,0.45)', 1.8); });
  reg('root', () => { for (const [x0, x1] of [[10, 28], [56, 36], [32, 30]]) line(open(() => { X.moveTo(x0, 60); X.quadraticCurveTo(x0 + (x1 - x0) * 0.3, 40, x1, 26); X.quadraticCurveTo(x1 + 4, 16, x1 - 2, 6); }), mat('#6a4a2a', 6, 6, 58, 60), 4.5, { hi: true }); line(open(() => { X.moveTo(20, 46); X.lineTo(10, 40); X.moveTo(46, 44); X.lineTo(56, 36); X.moveTo(30, 20); X.lineTo(22, 14); }), '#6a4a2a', 3, { hi: true }); leaf(46, 12, 8, 14, '#5fb043', -0.6, { ol: OLW * 0.7 }); });
  reg('spear', () => { line(seg(12, 58, 46, 16), metal('wood', 12, 58, 46, 16), 3.6, { hi: true }); shape(poly([[46, 16], [58, 4], [54, 20], [50, 12]]), metal('steel', 46, 4, 58, 20), { light: 0.7 }); shape(rr(43, 17, 6, 4, 1), metal('iron', 43, 17, 49, 21), { ol: OLW * 0.6 }); });
  reg('stomp', () => { shape(star(32, 44, 28, 20, 12), lg(4, 20, 60, 64, [[0, '#c8b89a'], [1, '#6a5a48']]), { light: 0.4 }); boot(32, 28, 44, '#5a3a2a'); });
  reg('tentacle', () => { glow(32, 32, 26, '#d23aff', 0.4); line(open(() => { X.moveTo(10, 60); X.quadraticCurveTo(6, 30, 26, 22); X.quadraticCurveTo(46, 14, 40, 6); }), mat('#5b2e8c', 6, 6, 46, 60), 9, { hi: true }); for (let i = 0; i < 5; i++) { const t = i / 5; const px = 10 + (26 - 10) * t + Math.sin(t * 3) * 4, py = 58 - 34 * t; fill(circ(px + 4, py, 2.2 - t * 0.8), '#e8a0ff'); } line(open(() => { X.moveTo(58, 56); X.quadraticCurveTo(60, 36, 46, 32); }), mat('#5b2e8c', 40, 30, 60, 56), 6, { hi: true }); });
  reg('void', () => { glow(32, 32, 32, '#7b3fa0', 0.9); shape(circ(32, 32, 20), rg(32, 32, 0, 22, [[0, '#04020a'], [0.7, '#1a0c2a'], [1, '#5b2e8c']]), { light: 0.2, dark: 0.2 }); line(open(() => { for (let i = 0; i <= 50; i++) { const t = i / 50, a = t * 7, r = 2 + t * 18; i ? X.lineTo(32 + r * Math.cos(a), 32 + r * Math.sin(a)) : X.moveTo(32, 32); } }), 'rgba(214,179,240,0.6)', 1.6, { ol: 0 }); sparkle(48, 14, 5, '#d6b3f0', { ol: 0 }); sparkle(14, 48, 4, '#5fe6c0', { ol: 0 }); });
  reg('whip', () => { shape(rr(6, 44, 18, 8, 3), metal('leather', 6, 44, 24, 52)); line(open(() => { X.moveTo(22, 48); X.quadraticCurveTo(40, 44, 44, 26); X.quadraticCurveTo(46, 10, 34, 8); X.quadraticCurveTo(24, 8, 26, 18); X.quadraticCurveTo(28, 26, 40, 24); X.quadraticCurveTo(52, 22, 58, 12); }), mat('#8a5a34', 22, 8, 58, 48), 3.2, { hi: true }); });
  reg('wind', () => { const f = lg(4, 10, 60, 54, [[0, '#ffffff'], [0.5, '#c8e8ff'], [1, '#7fb8e0']]); line(open(() => { X.moveTo(6, 22); X.quadraticCurveTo(30, 18, 42, 20); X.quadraticCurveTo(52, 22, 50, 12); X.quadraticCurveTo(48, 6, 42, 8); X.moveTo(6, 34); X.quadraticCurveTo(36, 30, 54, 34); X.quadraticCurveTo(62, 36, 58, 44); X.quadraticCurveTo(56, 50, 50, 46); X.moveTo(6, 46); X.quadraticCurveTo(24, 44, 36, 48); X.quadraticCurveTo(44, 52, 40, 58); }), f, 4, { hi: true }); });

  // @@GROUPS_END

  // ================================================================ rendering / cache
  function paramKey(p) { if (!p) return ''; try { return JSON.stringify(p); } catch (e) { return String(p); } }
  function render(name, size, params) {
    const e = REG.get(name);
    if (!e) return null;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d');
    const tmp = Art.canvas(size, size);
    const prevX = X, prevK = K;
    X = tmp.ctx; K = size / 64; NB = false; OLW = 3;
    X.save(); X.scale(K, K); X.lineJoin = 'round'; X.lineCap = 'round';
    try { e.fn(params || {}, size); } catch (err) { console.error('Icons: failed to draw ' + name, err); }
    X.restore(); X = prevX; K = prevK;
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = size * 0.06; c.shadowOffsetX = size * 0.015; c.shadowOffsetY = size * 0.03;
    c.drawImage(tmp.cv, 0, 0);
    return cv;
  }
  Icons.canvas = function (name, size, params) {
    size = Math.max(4, Math.round(size || 32));
    const k = name + '|' + size + '|' + paramKey(params);
    let cv = cache.get(k);
    if (!cv) { cv = render(name, size, params); if (!cv) return null; if (cache.size > 4000) cache.clear(); cache.set(k, cv); }
    return cv;
  };
  Icons.draw = function (ctx, name, x, y, size, params) {
    const cv = Icons.canvas(name, size, params);
    if (!cv) return false;
    ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2));
    return true;
  };
  Icons.drawTL = function (ctx, name, x, y, size, params) { const cv = Icons.canvas(name, size, params); if (cv) ctx.drawImage(cv, Math.round(x), Math.round(y)); return !!cv; };
  Icons.dataURL = function (name, size, params) {
    size = Math.max(4, Math.round(size || 32));
    const k = name + '|' + size + '|' + paramKey(params);
    let u = urlCache.get(k);
    if (!u) { const cv = Icons.canvas(name, size, params); if (!cv) return ''; u = cv.toDataURL('image/png'); urlCache.set(k, u); }
    return u;
  };
  Icons.has = name => REG.has(name);
  Icons.list = () => Array.from(REG.keys());
  Icons.groups = () => GROUPS.map(g => ({ id: g.id, names: g.names.slice() }));

  // ================================================================ FRAMES & ORNAMENTS (screen px, plain ctx)
  const FR = {};
  function frameCtx(w, h) { const { cv, ctx } = Art.canvas(w, h); return { cv, c: ctx }; }
  function rrP(c, x, y, w, h, r) { Art.rrect(c, x, y, w, h, r); }
  /** gold filigree corner at (x,y), extending sx,sy (±1) along the edges; s = size */
  function filigree(c, x, y, sx, sy, s, gold, dark) {
    c.save(); c.translate(x, y); c.scale(sx, sy);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const curl = (len, flip) => {
      c.beginPath();
      for (let i = 0; i <= 24; i++) { const t = i / 24; const r = s * 0.42 * (1 - t) * (1 - t) + 0.6; const a = t * 3.6; const px = len + Math.cos(a - PI) * r * (flip ? 1 : 1) + len * 0.0; const py = (flip ? 1 : -1) * Math.sin(a) * r + s * 0.5; i ? c.lineTo(px, py) : c.moveTo(px, py); }
    };
    const strokes = (col, w) => {
      c.strokeStyle = col; c.lineWidth = w;
      // arms along the two edges
      c.beginPath(); c.moveTo(s * 0.3, s * 0.3); c.quadraticCurveTo(s * 0.8, s * 0.2, s * 1.9, s * 0.42); c.stroke();
      c.beginPath(); c.moveTo(s * 0.3, s * 0.3); c.quadraticCurveTo(s * 0.2, s * 0.8, s * 0.42, s * 1.9); c.stroke();
      // curls at arm ends
      c.beginPath(); c.arc(s * 1.9, s * 0.62, s * 0.2, -PI / 2, PI * 1.1); c.stroke();
      c.beginPath(); c.arc(s * 0.62, s * 1.9, s * 0.2, PI, PI * 2.6); c.stroke();
      // inner small curls
      c.beginPath(); c.arc(s * 1.05, s * 0.62, s * 0.16, PI * 1.5, PI * 3.1); c.stroke();
      c.beginPath(); c.arc(s * 0.62, s * 1.05, s * 0.16, PI, PI * 2.6); c.stroke();
    };
    strokes(dark, 3.2); strokes(gold, 1.5);
    // corner diamond + dots
    c.fillStyle = dark; c.beginPath(); c.moveTo(s * 0.3, s * 0.02); c.lineTo(s * 0.58, s * 0.3); c.lineTo(s * 0.3, s * 0.58); c.lineTo(s * 0.02, s * 0.3); c.closePath(); c.fill();
    const g = c.createLinearGradient(0, 0, s * 0.6, s * 0.6); g.addColorStop(0, '#fff2b8'); g.addColorStop(0.5, gold); g.addColorStop(1, '#8a6a24');
    c.fillStyle = g; c.beginPath(); c.moveTo(s * 0.3, s * 0.08); c.lineTo(s * 0.52, s * 0.3); c.lineTo(s * 0.3, s * 0.52); c.lineTo(s * 0.08, s * 0.3); c.closePath(); c.fill();
    c.fillStyle = gold; for (const [px, py] of [[s * 1.35, s * 0.28], [s * 0.28, s * 1.35]]) { c.beginPath(); c.arc(px, py, 1.6, 0, TAU); c.fill(); }
    c.restore();
  }
  function goldBorder(c, x, y, w, h, r, gold, dark, light, lw) {
    c.lineJoin = 'round';
    rrP(c, x, y, w, h, r); c.strokeStyle = dark; c.lineWidth = lw + 2; c.stroke();
    const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, light); g.addColorStop(0.35, gold); g.addColorStop(0.7, gold); g.addColorStop(1, '#8a6a24');
    rrP(c, x, y, w, h, r); c.strokeStyle = g; c.lineWidth = lw; c.stroke();
  }
  function innerBevel(c, x, y, w, h, r, a = 0.14) {
    c.save(); rrP(c, x, y, w, h, r); c.clip();
    c.lineWidth = 2;
    rrP(c, x + 1, y + 1, w, h, r); c.strokeStyle = 'rgba(255,240,200,' + a + ')'; c.stroke();
    rrP(c, x - 1, y - 1, w, h, r); c.strokeStyle = 'rgba(0,0,10,' + a * 2.2 + ')'; c.stroke();
    c.restore();
  }
  function texture(c, x, y, w, h, alpha, seed) { try { Art.noiseFill(c, x, y, w, h, { seed: seed || 11, scale: 5, colors: ['#000000', '#ffffff'], alpha }); } catch (e) { /* noise optional */ } }

  FR.panel = (c, w, h) => {
    const r = 5;
    rrP(c, 1, 1, w - 2, h - 2, r); c.fillStyle = c.createLinearGradient(0, 0, 0, h); c.fillStyle.addColorStop(0, '#232b3d'); c.fillStyle.addColorStop(1, '#151a26'); c.fill();
    c.save(); rrP(c, 1, 1, w - 2, h - 2, r); c.clip(); texture(c, 0, 0, w, h, 0.06, 5);
    // vignette
    const vg = c.createRadialGradient(w * 0.5, h * 0.35, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(255,230,180,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
    c.restore();
    innerBevel(c, 5, 5, w - 10, h - 10, 3, 0.12);
    // inner thin line
    rrP(c, 6.5, 6.5, w - 13, h - 13, 3); c.strokeStyle = 'rgba(122,94,35,0.75)'; c.lineWidth = 1; c.stroke();
    goldBorder(c, 2, 2, w - 4, h - 4, r, '#c9a24a', '#3a2c10', '#f1d98a', 2);
    const s = Math.max(8, Math.min(14, Math.min(w, h) / 12));
    filigree(c, 3, 3, 1, 1, s, '#e2c46a', '#3a2c10'); filigree(c, w - 3, 3, -1, 1, s, '#e2c46a', '#3a2c10');
    filigree(c, 3, h - 3, 1, -1, s, '#e2c46a', '#3a2c10'); filigree(c, w - 3, h - 3, -1, -1, s, '#e2c46a', '#3a2c10');
    // top center ornament
    if (w > 120) { c.save(); c.translate(w / 2, 3); c.fillStyle = '#3a2c10'; c.beginPath(); c.moveTo(-9, 0); c.lineTo(0, 7); c.lineTo(9, 0); c.closePath(); c.fill(); c.fillStyle = '#e2c46a'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(0, 5); c.lineTo(6, 0); c.closePath(); c.fill(); c.restore(); }
  };
  function parchmentPath(c, w, h, inset, seed, amp, append) {
    const rng = new AOW.RNG(seed || 3);
    const pts = [];
    const step = 7;
    const n = Math.max(3, Math.floor(w / step)), m = Math.max(3, Math.floor(h / step));
    const jit = () => (rng.next() - 0.5) * amp + (rng.chance(0.06) ? amp * 1.5 : 0);
    for (let i = 0; i <= n; i++) pts.push([inset + (w - inset * 2) * i / n, inset + jit()]);
    for (let j = 1; j <= m; j++) pts.push([w - inset + jit(), inset + (h - inset * 2) * j / m]);
    for (let i = n - 1; i >= 0; i--) pts.push([inset + (w - inset * 2) * i / n, h - inset + jit()]);
    for (let j = m - 1; j >= 1; j--) pts.push([inset + jit(), inset + (h - inset * 2) * j / m]);
    if (!append) c.beginPath();
    const N = pts.length;
    c.moveTo((pts[0][0] + pts[N - 1][0]) / 2, (pts[0][1] + pts[N - 1][1]) / 2);
    for (let i = 0; i < N; i++) { const p = pts[i], q = pts[(i + 1) % N]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    c.closePath();
  }
  function parchment(c, w, h, o) {
    o = o || {};
    const inset = o.inset || 3, amp = o.amp || 3;
    parchmentPath(c, w, h, inset, o.seed || 3, amp);
    const g = c.createRadialGradient(w * 0.4, h * 0.35, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#f6ecd2'); g.addColorStop(0.6, '#eadcb8'); g.addColorStop(1, '#cdb98e');
    c.fillStyle = g; c.fill();
    c.save(); parchmentPath(c, w, h, inset, o.seed || 3, amp); c.clip();
    texture(c, 0, 0, w, h, 0.09, 21);
    // stains
    const rng = new AOW.RNG((o.seed || 3) * 7 + 1);
    for (let i = 0; i < 4; i++) { const sx = rng.next() * w, sy = rng.next() * h, sr = 8 + rng.next() * Math.min(w, h) * 0.3; const sg = c.createRadialGradient(sx, sy, 0, sx, sy, sr); sg.addColorStop(0, 'rgba(120,80,30,0.10)'); sg.addColorStop(1, 'rgba(120,80,30,0)'); c.fillStyle = sg; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2); }
    // burnt / darkened edge (inner shadow)
    c.shadowColor = 'rgba(70,35,8,0.75)'; c.shadowBlur = o.burn || 8; c.shadowOffsetX = 0; c.shadowOffsetY = 0;
    c.beginPath(); c.rect(-40, -40, w + 80, h + 80); parchmentPath(c, w, h, inset, o.seed || 3, amp, true); c.fillStyle = '#3a1e08'; c.fill('evenodd');
    c.restore();
    // ink border
    const bi = inset + (o.border || 6);
    c.strokeStyle = 'rgba(43,33,22,0.55)'; c.lineWidth = 1.4; rrP(c, bi, bi, w - bi * 2, h - bi * 2, 2); c.stroke();
    c.strokeStyle = 'rgba(43,33,22,0.35)'; c.lineWidth = 0.8; rrP(c, bi + 3, bi + 3, w - bi * 2 - 6, h - bi * 2 - 6, 1); c.stroke();
    // corner flourish marks
    const s = Math.min(10, Math.min(w, h) / 10);
    for (const [px, py, sx, sy] of [[bi + 2, bi + 2, 1, 1], [w - bi - 2, bi + 2, -1, 1], [bi + 2, h - bi - 2, 1, -1], [w - bi - 2, h - bi - 2, -1, -1]]) {
      c.save(); c.translate(px, py); c.scale(sx, sy); c.strokeStyle = 'rgba(43,33,22,0.6)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(0, s); c.quadraticCurveTo(s * 0.2, s * 0.2, s, 0); c.stroke(); c.beginPath(); c.arc(s * 0.5, s * 0.5, s * 0.16, 0, TAU); c.stroke(); c.restore();
    }
  }
  FR.parchment = (c, w, h) => parchment(c, w, h, { inset: 3, amp: 3.5, burn: 9, border: 6, seed: 3 });
  FR.tooltip = (c, w, h) => parchment(c, w, h, { inset: 2, amp: 2.2, burn: 6, border: 4, seed: 9 });
  function button(c, w, h, state) {
    const r = 5;
    const top = state === 'active' ? '#1c2130' : state === 'hover' ? '#4a5570' : '#3a4358';
    const bot = state === 'active' ? '#262d3f' : state === 'hover' ? '#2f374b' : '#232a3a';
    rrP(c, 1.5, 1.5, w - 3, h - 3, r); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fill();
    c.save(); rrP(c, 1.5, 1.5, w - 3, h - 3, r); c.clip(); texture(c, 0, 0, w, h, 0.05, 8);
    if (state !== 'active') { const sh = c.createLinearGradient(0, 0, 0, h * 0.5); sh.addColorStop(0, 'rgba(255,240,200,0.14)'); sh.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = sh; c.fillRect(0, 0, w, h * 0.5); }
    else { c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 6; c.shadowOffsetY = 2; c.beginPath(); c.rect(-20, -20, w + 40, h + 40); rrP(c, 1.5, 1.5, w - 3, h - 3, r); c.fillStyle = '#000'; c.fill('evenodd'); }
    c.restore();
    if (state !== 'active') innerBevel(c, 3.5, 3.5, w - 7, h - 7, 3, 0.16);
    const gold = state === 'hover' ? '#f1d98a' : state === 'active' ? '#a8873a' : '#c9a24a';
    if (state === 'hover') { c.save(); c.shadowColor = 'rgba(241,217,138,0.7)'; c.shadowBlur = 8; rrP(c, 2, 2, w - 4, h - 4, r); c.strokeStyle = 'rgba(241,217,138,0.5)'; c.lineWidth = 1.5; c.stroke(); c.restore(); }
    goldBorder(c, 2, 2, w - 4, h - 4, r, gold, '#2a2010', state === 'hover' ? '#fff6d0' : '#e6cf86', 1.5);
    // corner notches
    c.fillStyle = gold;
    for (const [px, py] of [[6, 6], [w - 6, 6], [6, h - 6], [w - 6, h - 6]]) { c.beginPath(); c.moveTo(px - 2.2, py); c.lineTo(px, py - 2.2); c.lineTo(px + 2.2, py); c.lineTo(px, py + 2.2); c.closePath(); c.fill(); }
  }
  FR.button = (c, w, h) => button(c, w, h, 'normal');
  FR.button_hover = (c, w, h) => button(c, w, h, 'hover');
  FR.button_active = (c, w, h) => button(c, w, h, 'active');
  FR.slot = (c, w, h) => {
    const r = 4;
    rrP(c, 1, 1, w - 2, h - 2, r); c.fillStyle = '#0d1118'; c.fill();
    c.save(); rrP(c, 2, 2, w - 4, h - 4, r); c.clip();
    c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = Math.min(10, w * 0.2); c.shadowOffsetX = 2; c.shadowOffsetY = 2;
    c.beginPath(); c.rect(-20, -20, w + 40, h + 40); rrP(c, 2, 2, w - 4, h - 4, r); c.fillStyle = '#000'; c.fill('evenodd');
    c.restore();
    rrP(c, 1.5, 1.5, w - 3, h - 3, r); c.strokeStyle = '#5c4a22'; c.lineWidth = 1.5; c.stroke();
    rrP(c, 0.5, 0.5, w - 1, h - 1, r + 1); c.strokeStyle = 'rgba(201,162,74,0.45)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#c9a24a'; for (const [px, py] of [[3, 3], [w - 3, 3], [3, h - 3], [w - 3, h - 3]]) { c.beginPath(); c.arc(px, py, 1.2, 0, TAU); c.fill(); }
  };
  FR.portrait = (c, w, h) => {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 2, t = Math.max(4, R * 0.13);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 4; c.shadowOffsetY = 1.5;
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.arc(cx, cy, R - t, 0, TAU, true); c.fillStyle = '#3a2c10'; c.fill('evenodd'); c.restore();
    const g = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R); g.addColorStop(0, '#fff2b8'); g.addColorStop(0.3, '#e8c357'); g.addColorStop(0.65, '#b8862a'); g.addColorStop(1, '#6e4d14');
    c.beginPath(); c.arc(cx, cy, R - 1, 0, TAU); c.arc(cx, cy, R - t + 1, 0, TAU, true); c.fillStyle = g; c.fill('evenodd');
    c.strokeStyle = 'rgba(58,44,16,0.9)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R - t + 1, 0, TAU); c.stroke(); c.beginPath(); c.arc(cx, cy, R - 1, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(255,245,210,0.5)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R - t / 2, PI * 0.9, PI * 1.6); c.stroke();
    // 4 small gems / rivets
    for (let i = 0; i < 4; i++) { const a = -PI / 2 + i * PI / 2; const px = cx + (R - t / 2) * Math.cos(a), py = cy + (R - t / 2) * Math.sin(a); c.fillStyle = '#3a2c10'; c.beginPath(); c.arc(px, py, t * 0.32 + 1, 0, TAU); c.fill(); const gg = c.createRadialGradient(px - 1, py - 1, 0, px, py, t * 0.32); gg.addColorStop(0, '#ffe6a0'); gg.addColorStop(1, '#b8862a'); c.fillStyle = gg; c.beginPath(); c.arc(px, py, t * 0.32, 0, TAU); c.fill(); }
  };
  FR.tab = (c, w, h) => {
    const r = 6;
    const p = () => { c.beginPath(); c.moveTo(1, h); c.lineTo(1, r + 1); c.arcTo(1, 1, r + 1, 1, r); c.lineTo(w - r - 1, 1); c.arcTo(w - 1, 1, w - 1, r + 1, r); c.lineTo(w - 1, h); c.closePath(); };
    p(); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2f384d'); g.addColorStop(1, '#1e2536'); c.fillStyle = g; c.fill();
    c.save(); p(); c.clip(); texture(c, 0, 0, w, h, 0.05, 13);
    const sh = c.createLinearGradient(0, 0, 0, h * 0.4); sh.addColorStop(0, 'rgba(255,240,200,0.12)'); sh.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = sh; c.fillRect(0, 0, w, h * 0.4);
    c.restore();
    p(); c.strokeStyle = '#2a2010'; c.lineWidth = 3; c.stroke();
    const gg = c.createLinearGradient(0, 0, w, h); gg.addColorStop(0, '#f1d98a'); gg.addColorStop(0.5, '#c9a24a'); gg.addColorStop(1, '#8a6a24');
    p(); c.strokeStyle = gg; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#c9a24a'; c.beginPath(); c.moveTo(w / 2 - 4, 1); c.lineTo(w / 2, 4.5); c.lineTo(w / 2 + 4, 1); c.closePath(); c.fill();
  };
  Icons.frame = function (w, h, style) {
    w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h)); style = style || 'panel';
    const k = style + '|' + w + '|' + h;
    let cv = frameCache.get(k);
    if (cv) return cv;
    const f = frameCtx(w, h);
    const fn = FR[style] || FR.panel;
    try { fn(f.c, w, h); } catch (e) { console.error('Icons.frame failed: ' + style, e); }
    if (frameCache.size > 400) frameCache.clear();
    frameCache.set(k, f.cv);
    return f.cv;
  };
  Icons.frameStyles = () => Object.keys(FR);
  Icons.frameDataURL = function (w, h, style) {
    const k = 'frame|' + style + '|' + w + '|' + h;
    let u = urlCache.get(k);
    if (!u) { u = Icons.frame(w, h, style).toDataURL('image/png'); urlCache.set(k, u); }
    return u;
  };
  Icons.divider = function (w) {
    w = Math.max(20, Math.round(w));
    const k = 'divider|' + w;
    let cv = frameCache.get(k);
    if (cv) return cv;
    const H = 16, f = frameCtx(w, H), c = f.c, cy = H / 2;
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(201,162,74,0)'); g.addColorStop(0.15, '#c9a24a'); g.addColorStop(0.5, '#f1d98a'); g.addColorStop(0.85, '#c9a24a'); g.addColorStop(1, 'rgba(201,162,74,0)');
    c.strokeStyle = 'rgba(30,22,8,0.8)'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, cy); c.lineTo(w - 4, cy); c.stroke();
    c.strokeStyle = g; c.lineWidth = 1.4; c.beginPath(); c.moveTo(4, cy); c.lineTo(w - 4, cy); c.stroke();
    const cx = w / 2;
    c.save(); c.translate(cx, cy);
    const d = (r, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, -r); c.lineTo(r, 0); c.lineTo(0, r); c.lineTo(-r, 0); c.closePath(); c.fill(); };
    d(7.5, 'rgba(30,22,8,0.9)'); const dg = c.createLinearGradient(-6, -6, 6, 6); dg.addColorStop(0, '#fff2b8'); dg.addColorStop(0.5, '#e8c357'); dg.addColorStop(1, '#8a6a24'); d(6, dg); d(2.2, '#3a2c10');
    for (const s of [-1, 1]) { c.fillStyle = 'rgba(30,22,8,0.9)'; c.beginPath(); c.arc(s * 14, 0, 3.2, 0, TAU); c.fill(); c.fillStyle = dg; c.beginPath(); c.arc(s * 14, 0, 2.2, 0, TAU); c.fill();
      c.strokeStyle = '#c9a24a'; c.lineWidth = 1.2; c.beginPath(); c.arc(s * 22, -2.5, 3, PI * (s > 0 ? 0.5 : 0.5), PI * (s > 0 ? 2.2 : -1.2), s < 0); c.stroke(); }
    c.restore();
    frameCache.set(k, f.cv);
    return f.cv;
  };
  Icons.dividerDataURL = w => { const k = 'divider|url|' + w; let u = urlCache.get(k); if (!u) { u = Icons.divider(w).toDataURL('image/png'); urlCache.set(k, u); } return u; };

  // ================================================================ DEMO
  Icons.demo = function (cv, q) {
    const onlyGroup = q && q.get && q.get('group');
    const scale = (q && q.get && +q.get('scale')) || 1;
    const c = cv.getContext('2d');
    const W = cv.width;
    const groups = onlyGroup ? GROUPS.filter(g => g.id === onlyGroup || onlyGroup === 'all') : GROUPS;
    const big = Math.round(64 * scale), small = Math.round(32 * scale);
    const cellW = big + small + 8, cellH = big + 16;
    const perRow = Math.max(1, Math.floor((W - 20) / cellW));
    // measure
    let y = 12;
    const framesH = onlyGroup ? 0 : 230;
    y += framesH;
    for (const g of groups) { y += 22; y += Math.ceil(g.names.length / perRow) * cellH + 6; }
    if (cv.height < y) cv.height = y;
    c.fillStyle = '#1b1f2a'; c.fillRect(0, 0, cv.width, cv.height);
    c.font = '600 11px system-ui, sans-serif'; c.textBaseline = 'top';
    y = 12;
    if (!onlyGroup) {
      // frames gallery
      c.fillStyle = '#f1d98a'; c.font = '700 14px Georgia, serif'; c.fillText('Frames: panel · parchment · tooltip · button / hover / active · slot · portrait · tab · divider', 12, y); y += 22;
      c.drawImage(Icons.frame(300, 150, 'panel'), 12, y);
      c.fillStyle = '#e8e2d0'; c.font = '700 15px Georgia, serif'; c.fillText('City of Thornwall', 36, y + 18); c.font = '12px system-ui, sans-serif'; c.fillStyle = '#a49c88'; c.fillText('Tier III · Feudal · Stability 62', 36, y + 40);
      c.drawImage(Icons.divider(250), 37, y + 58);
      Icons.draw(c, 'gold', 44, y + 92, 20); Icons.draw(c, 'mana', 100, y + 92, 20); Icons.draw(c, 'knowledge', 156, y + 92, 20); Icons.draw(c, 'food', 212, y + 92, 20); Icons.draw(c, 'production', 268, y + 92, 20);
      c.fillStyle = '#e8e2d0'; c.font = '12px system-ui, sans-serif'; c.fillText('+14', 56, y + 86); c.fillText('+6', 112, y + 86); c.fillText('+9', 168, y + 86); c.fillText('+21', 224, y + 86); c.fillText('+17', 280, y + 86);
      c.drawImage(Icons.frame(300, 150, 'parchment'), 324, y);
      c.fillStyle = '#7a2e2a'; c.font = '700 14px Georgia, serif'; c.fillText('Tome of Pyromancy', 344, y + 16); c.fillStyle = '#2b2116'; c.font = '12px Georgia, serif'; c.fillText('Unlocks Fireball, Searing Blades and the', 344, y + 40); c.fillText('Fire Elemental summon. +2 Chaos affinity.', 344, y + 56);
      Icons.draw(c, 'chaos', 590, y + 24, 28);
      c.drawImage(Icons.frame(220, 90, 'tooltip'), 636, y);
      c.fillStyle = '#2b2116'; c.font = '700 12px Georgia, serif'; c.fillText('Fireball', 652, y + 14); c.font = '11px Georgia, serif'; c.fillText('20 fire damage, area 1.', 652, y + 32); c.fillText('40% Burning (3 turns).', 652, y + 48); Icons.draw(c, 'fireball', 812, y + 22, 26);
      c.drawImage(Icons.frame(150, 36, 'button'), 636, y + 100); c.drawImage(Icons.frame(150, 36, 'button_hover'), 792, y + 100); c.drawImage(Icons.frame(150, 36, 'button_active'), 948, y + 100);
      c.fillStyle = '#e8e2d0'; c.font = '700 13px Georgia, serif'; c.textAlign = 'center'; c.fillText('End Turn', 711, y + 111); c.fillText('End Turn', 867, y + 111); c.fillText('End Turn', 1023, y + 111); c.textAlign = 'left';
      for (let i = 0; i < 4; i++) { c.drawImage(Icons.frame(44, 44, 'slot'), 872 + i * 50, y + 2); Icons.draw(c, ['strike', 'heal', 'fireball', 'defend'][i], 894 + i * 50, y + 24, 34); }
      c.drawImage(Icons.frame(96, 96, 'portrait'), 1080, y);
      c.drawImage(Icons.frame(110, 30, 'tab'), 1190, y + 2); c.drawImage(Icons.frame(110, 30, 'tab'), 1306, y + 2);
      c.fillStyle = '#e8e2d0'; c.font = '700 12px Georgia, serif'; c.textAlign = 'center'; c.fillText('Research', 1245, y + 10); c.fillText('Spells', 1361, y + 10); c.textAlign = 'left';
      c.drawImage(Icons.divider(260), 1190, y + 44);
      c.drawImage(Icons.frame(160, 84, 'panel'), 1190, y + 66);
      c.drawImage(Icons.frame(140, 60, 'tooltip'), 1360, y + 66);
      y += framesH - 22;
    }
    let count = 0;
    for (const g of groups) {
      c.fillStyle = '#f1d98a'; c.font = '700 13px Georgia, serif'; c.fillText(g.id + '  (' + g.names.length + ')', 12, y); y += 22;
      g.names.forEach((name, i) => {
        const col = i % perRow, row = Math.floor(i / perRow);
        const x = 12 + col * cellW, yy = y + row * cellH;
        const params = name === 'banner' ? { color: '#3f7fe0', color2: '#c9d9ff' } : undefined;
        Icons.draw(c, name, x + big / 2, yy + big / 2, big, params);
        Icons.draw(c, name, x + big + 4 + small / 2, yy + small / 2, small, params);
        c.fillStyle = '#a49c88'; c.font = '10px system-ui, sans-serif'; c.fillText(name.length > 15 ? name.slice(0, 14) + '…' : name, x, yy + big + 2);
        count++;
      });
      y += Math.ceil(g.names.length / perRow) * cellH + 6;
    }
    return count + ' icons, ' + Object.keys(FR).length + ' frames';
  };

  AOW.Icons = Icons;
})(window.AOW = window.AOW || {});
