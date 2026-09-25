// src/art/structures.js — AOW.StructArt: painterly procedural cities, outposts, wonders, resource nodes,
// province improvements, free cities, infestations, teleporters and siege wall segments.
//
// Public API (all sprites are generated once through Art.sprite and cached; every drawing is deterministic from `seed`;
// (x, y) is the hex center — city footprints are centred on it, wall/anchor offsets are handled internally):
//   StructArt.drawCity(ctx, x, y, {cultureId, architecture, palette:{primary,secondary,accent,roof,wall}, tier:0..5, walls:0..3|bool, isCapital, playerColor, seed, frame})
//   StructArt.drawOutpost(ctx, x, y, {cultureId, architecture, palette, playerColor, seed, frame})
//   StructArt.drawFreeCity(ctx, x, y, {cultureId, architecture, palette, tier, walls, seed, frame})      neutral grey-brown banners
//   StructArt.drawWonder(ctx, x, y, {look, cleared, seed, frame, variant})
//   StructArt.drawNode(ctx, x, y, {resource, magicMaterial, improved, seed})
//   StructArt.drawImprovement(ctx, x, y, {kind, terrain, seed, level})
//   StructArt.drawInfestation(ctx, x, y, {kind, seed, frame, cleared})
//   StructArt.drawTeleporter(ctx, x, y, {seed, frame, active, color})
//   StructArt.drawWall(ctx, x, y, {hp:0..1, gate, vertical, size, style})                               battle wall segment
//   StructArt.cityLabelOffset(o) → {y, top}      y: label baseline below the city; top: sprite top (negative)
//   StructArt.demo(canvas)                         labelled gallery of everything
// Additive helpers (SPEC §0): StructArt.STYLES (style ids), StructArt.WONDER_LOOKS, StructArt.NODE_RESOURCES,
//   StructArt.MATERIALS, StructArt.IMPROVEMENTS, StructArt.INFESTATIONS, StructArt.styleFor(o), StructArt.stats()
(function (AOW) {
  'use strict';
  const StructArt = {};
  const Art = AOW.Art, C = AOW.Color, M = AOW.M;
  const TAU = Math.PI * 2;
  const INK = 'rgba(20,15,30,0.5)', INK2 = 'rgba(20,15,30,0.28)', INKS = 'rgba(20,15,30,0.7)';
  // 3/4 view projection: +Z (away from the viewer) shifts right (KX) and up (KZ); the key light comes from the top-left.
  const KX = 0.34, KZ = 0.42;

  const lit = (c, t) => C.mix(c, '#fff3d2', t);
  const shd = (c, t) => C.mix(c, '#1b2040', t);
  const warm = (c, t) => C.mix(c, '#ffb054', t);
  const rgbaOf = (c, a) => C.alpha(c, a);
  const genStats = { count: 0, maxMs: 0, totalMs: 0, slowest: '' };

  // ================================================================ low-level painting helpers
  function fillPath(ctx, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function poly(ctx, pts, fill, stroke, lw) { Art.poly(ctx, pts); fillPath(ctx, fill, stroke, lw); }
  function ell(ctx, cx, cy, rx, ry, fill, stroke) { Art.ellipse(ctx, cx, cy, rx, ry); fillPath(ctx, fill, stroke); }
  function circ(ctx, cx, cy, r, fill, stroke) { Art.circle(ctx, cx, cy, r); fillPath(ctx, fill, stroke); }
  function line(ctx, x0, y0, x1, y1, color, lw) { ctx.strokeStyle = color; ctx.lineWidth = lw || 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  function vgrad(ctx, y0, y1, c0, c1) { return Art.grad(ctx, 0, y0, 0, y1, [[0, c0], [1, c1]]); }
  /** left-lit → right-shaded gradient for round bodies spanning x0..x1 */
  function roundGrad(ctx, x0, x1, col, k) {
    k = k === undefined ? 1 : k;
    return Art.grad(ctx, x0, 0, x1, 0, [[0, shd(col, 0.12 * k)], [0.28, lit(col, 0.28 * k)], [0.62, col], [1, shd(col, 0.45 * k)]]);
  }
  /** soft contact shadow under a footprint (screen coords) */
  function contactShadow(ctx, cx, cy, rx, ry, a) {
    ctx.fillStyle = Art.rgrad(ctx, cx, cy, 0, Math.max(rx, ry), [[0, 'rgba(15,12,30,' + (a || 0.35) + ')'], [0.55, 'rgba(15,12,30,' + (a || 0.35) * 0.55 + ')'], [1, 'rgba(15,12,30,0)']]);
    Art.ellipse(ctx, cx + rx * 0.12, cy, rx * 1.15, Math.max(2, ry)); ctx.fill();
  }
  /** glow disc (additive-looking) */
  function glow(ctx, x, y, r, col, a) {
    ctx.fillStyle = Art.rgrad(ctx, x, y, 0, r, [[0, rgbaOf(col, a)], [0.4, rgbaOf(col, a * 0.45)], [1, rgbaOf(col, 0)]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /** painterly grain over the whole sprite, restricted to painted pixels (one shared scratch canvas: no per-sprite allocation) */
  let scratch = null;
  function grain(ctx, w, h, seed, amount) {
    if (!scratch) scratch = Art.canvas(256, 256);
    if (scratch.cv.width < w || scratch.cv.height < h) { scratch.cv.width = Math.max(scratch.cv.width, w); scratch.cv.height = Math.max(scratch.cv.height, h); }
    const cv = scratch.cv, c2 = scratch.ctx;
    c2.clearRect(0, 0, w, h);
    c2.drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    Art.noiseFill(ctx, 0, 0, w, h, { seed: (seed | 0) % 7, scale: 10, colors: ['#5a5a66', '#c8c8d0'], alpha: amount || 0.3, size: 64 });
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(cv, 0, 0);
    ctx.restore();
  }

  /** projector for a building whose front-left-bottom corner sits at screen (ox, oy) */
  function proj(ox, oy) { return (X, Y, Z) => [ox + X + Z * KX, oy - Y - Z * KZ]; }

  // ================================================================ building primitives (3/4 view, top-left key light)
  /** wall block: front face (lit, vertical gradient), right face (cool shade), optional top face */
  function box(ctx, p, w, d, h, col, o) {
    o = o || {};
    poly(ctx, [p(w, 0, 0), p(w, h, 0), p(w, h, d), p(w, 0, d)], shd(col, o.rightShade || 0.4), INK);
    if (o.top !== false) poly(ctx, [p(0, h, 0), p(w, h, 0), p(w, h, d), p(0, h, d)], o.topColor || lit(col, 0.3), INK);
    const a = p(0, h, 0), b = p(0, 0, 0);
    poly(ctx, [b, p(w, 0, 0), p(w, h, 0), a], Art.grad(ctx, 0, a[1], 0, b[1], [[0, lit(col, 0.16)], [1, shd(col, 0.12)]]), INK);
    if (o.courses) courses(ctx, p, w, h, o.courses, 'rgba(20,15,30,0.14)');
    if (o.planks) planks(ctx, p, w, h, o.planks);
  }
  /** horizontal masonry lines on the front face */
  function courses(ctx, p, w, h, step, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = step; y < h - 1; y += step) { const a = p(0.5, y, 0), b = p(w - 0.5, y, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
  }
  function planks(ctx, p, w, h, step) {
    ctx.strokeStyle = 'rgba(40,25,15,0.22)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = step; x < w - 1; x += step) { const a = p(x, 0.5, 0), b = p(x, h - 0.5, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
  }
  /** half-timber beams on the front face */
  function timber(ctx, p, w, h, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath();
    const seg = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
    seg(p(0.5, h * 0.5, 0), p(w - 0.5, h * 0.5, 0));
    seg(p(0.5, h - 0.5, 0), p(w - 0.5, h - 0.5, 0));
    const n = Math.max(1, Math.round(w / 6));
    for (let i = 0; i <= n; i++) { const x = w * i / n; seg(p(x, 0.5, 0), p(x, h - 0.5, 0)); }
    for (let i = 0; i < n; i++) { const x0 = w * i / n, x1 = w * (i + 1) / n; if (i % 2 === 0) seg(p(x0, h * 0.5, 0), p(x1, h - 0.5, 0)); else seg(p(x0, h - 0.5, 0), p(x1, h * 0.5, 0)); }
    ctx.stroke();
  }
  /** rows of tile lines on a roof quad: interpolates between edge (q[a0]→q[a1]) and (q[b0]→q[b1]) */
  function roofRows(ctx, q, a0, a1, b0, b1, n, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < n; i++) {
      const t = i / n;
      ctx.moveTo(M.lerp(q[a0][0], q[a1][0], t), M.lerp(q[a0][1], q[a1][1], t));
      ctx.lineTo(M.lerp(q[b0][0], q[b1][0], t), M.lerp(q[b0][1], q[b1][1], t));
    }
    ctx.stroke();
  }
  /** gable roof, ridge along Z (the triangular gable faces the viewer) */
  function roofGableZ(ctx, p, w, d, h, rh, col, o) {
    o = o || {};
    const ov = o.ov === undefined ? 1.8 : o.ov, wallCol = o.wall || col;
    poly(ctx, [p(0, h, 0), p(w / 2, h + rh, 0), p(w, h, 0)], lit(wallCol, 0.05), INK);               // gable face
    if (o.beams) { ctx.strokeStyle = o.beams; ctx.lineWidth = 1.2; ctx.beginPath(); const a = p(0, h, 0), b = p(w / 2, h + rh, 0), c = p(w, h, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0], a[1]); ctx.stroke(); }
    const R = [p(w / 2, h + rh, -ov), p(w + ov, h - ov * 0.5, -ov), p(w + ov, h - ov * 0.5, d + ov), p(w / 2, h + rh, d + ov)];
    const L = [p(-ov, h - ov * 0.5, -ov), p(w / 2, h + rh, -ov), p(w / 2, h + rh, d + ov), p(-ov, h - ov * 0.5, d + ov)];
    poly(ctx, R, Art.grad(ctx, R[0][0], 0, R[1][0], 0, [[0, shd(col, 0.25)], [1, shd(col, 0.45)]]), INK);
    roofRows(ctx, R, 0, 1, 3, 2, o.rows || 4, 'rgba(20,15,30,0.14)');
    poly(ctx, L, Art.grad(ctx, L[0][0], 0, L[1][0], 0, [[0, lit(col, 0.3)], [1, lit(col, 0.05)]]), INK);
    roofRows(ctx, L, 0, 1, 3, 2, o.rows || 4, 'rgba(20,15,30,0.14)');
    line(ctx, L[1][0], L[1][1], L[2][0], L[2][1], 'rgba(255,240,210,0.55)', 1); // ridge highlight
    return { ridge: [L[1], L[2]], apexFront: p(w / 2, h + rh, 0) };
  }
  /** gable roof, ridge along X (the long eave faces the viewer) */
  function roofGableX(ctx, p, w, d, h, rh, col, o) {
    o = o || {};
    const ov = o.ov === undefined ? 1.8 : o.ov, wallCol = o.wall || col;
    poly(ctx, [p(w, h, 0), p(w, h + rh, d / 2), p(w, h, d)], shd(wallCol, 0.42), INK);              // right gable
    const B = [p(-ov, h + rh, d / 2), p(w + ov, h + rh, d / 2), p(w + ov, h - ov * 0.5, d + ov), p(-ov, h - ov * 0.5, d + ov)];
    const F = [p(-ov, h - ov * 0.5, -ov), p(w + ov, h - ov * 0.5, -ov), p(w + ov, h + rh, d / 2), p(-ov, h + rh, d / 2)];
    poly(ctx, B, shd(col, 0.28), INK);
    poly(ctx, F, Art.grad(ctx, 0, F[2][1], 0, F[0][1], [[0, lit(col, 0.32)], [1, shd(col, 0.08)]]), INK);
    roofRows(ctx, F, 0, 3, 1, 2, o.rows || 4, 'rgba(20,15,30,0.14)');
    line(ctx, F[3][0], F[3][1], F[2][0], F[2][1], 'rgba(255,240,210,0.5)', 1);
    return { ridge: [F[3], F[2]] };
  }
  /** hip / pyramid roof with the apex above the footprint centre */
  function roofHip(ctx, p, w, d, h, rh, col, o) {
    o = o || {};
    const ov = o.ov === undefined ? 1.5 : o.ov;
    const ax = o.ax === undefined ? w / 2 : o.ax, az = o.az === undefined ? d / 2 : o.az;
    const A = p(ax, h + rh, az), fl = p(-ov, h, -ov), fr = p(w + ov, h, -ov), br = p(w + ov, h, d + ov), bl = p(-ov, h, d + ov);
    poly(ctx, [br, bl, A], shd(col, 0.2), INK);
    poly(ctx, [bl, fl, A], lit(col, 0.3), INK);
    poly(ctx, [fr, br, A], shd(col, 0.45), INK);
    const Fq = [fl, fr, A, A];
    poly(ctx, [fl, fr, A], Art.grad(ctx, 0, A[1], 0, fl[1], [[0, lit(col, 0.2)], [1, shd(col, 0.05)]]), INK);
    roofRows(ctx, Fq, 0, 2, 1, 3, o.rows || 3, 'rgba(20,15,30,0.12)');
    return { apex: A };
  }
  /** flat roof with a parapet */
  function roofFlat(ctx, p, w, d, h, col, o) {
    o = o || {};
    const ph = o.parapet || 2;
    poly(ctx, [p(0, h, 0), p(w, h, 0), p(w, h, d), p(0, h, d)], lit(col, 0.32), INK);
    if (ph > 0) {
      poly(ctx, [p(0, h, 0), p(w, h, 0), p(w, h + ph, 0), p(0, h + ph, 0)], lit(col, 0.1), INK);
      poly(ctx, [p(w, h, 0), p(w, h + ph, 0), p(w, h + ph, d), p(w, h, d)], shd(col, 0.4), INK);
    }
  }
  /** round tower body; (cx, oy) = centre of the base ellipse */
  function cylinder(ctx, cx, oy, r, h, col, o) {
    o = o || {};
    const ry = r * KZ;
    ctx.fillStyle = roundGrad(ctx, cx - r, cx + r, col);
    ctx.beginPath(); ctx.moveTo(cx - r, oy - h); ctx.lineTo(cx - r, oy); ctx.ellipse(cx, oy, r, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + r, oy - h); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    if (o.top !== false) ell(ctx, cx, oy - h, r, ry, lit(col, 0.3), INK);
    if (o.courses) { ctx.strokeStyle = 'rgba(20,15,30,0.13)'; ctx.beginPath(); for (let y = o.courses; y < h - 1; y += o.courses) { ctx.moveTo(cx - r + 1, oy - y); ctx.lineTo(cx + r - 1, oy - y); } ctx.stroke(); }
    if (o.crenel) crenels(ctx, cx - r, cx + r, oy - h, 2.2, 2.5, col);
  }
  /** conical roof; base centre (cx, y) */
  function cone(ctx, cx, y, r, h, col, o) {
    o = o || {};
    const ry = r * KZ;
    ctx.fillStyle = roundGrad(ctx, cx - r, cx + r, col, 1.1);
    ctx.beginPath(); ctx.moveTo(cx, y - h); ctx.lineTo(cx + r, y); ctx.ellipse(cx, y, r, ry, 0, 0, Math.PI, false); ctx.closePath();
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    // shingle rows
    ctx.strokeStyle = 'rgba(20,15,30,0.14)'; ctx.beginPath();
    for (let i = 1; i < (o.rows || 4); i++) { const t = i / (o.rows || 4); ctx.moveTo(cx - r * t, y - h * (1 - t)); ctx.lineTo(cx + r * t, y - h * (1 - t)); }
    ctx.stroke();
    line(ctx, cx, y - h, cx - r * 0.5, y - h * 0.5, 'rgba(255,240,210,0.45)', 1);
    if (o.finial) { circ(ctx, cx, y - h - 1.5, 1.6, o.finial, INK); }
  }
  /** dome sitting on a base ellipse centred (cx, y) */
  function dome(ctx, cx, y, r, rh, col, o) {
    o = o || {};
    ctx.beginPath(); ctx.ellipse(cx, y, r, rh, 0, Math.PI, 0, false); ctx.closePath();
    ctx.fillStyle = Art.rgrad(ctx, cx - r * 0.35, y - rh * 0.6, 0, r * 1.3, [[0, lit(col, 0.6)], [0.45, col], [1, shd(col, 0.5)]]);
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    if (o.ribs) { ctx.strokeStyle = 'rgba(20,15,30,0.14)'; ctx.beginPath(); for (let i = 1; i < o.ribs; i++) { const t = -1 + 2 * i / o.ribs; ctx.moveTo(cx + r * t, y); ctx.quadraticCurveTo(cx + r * t * 0.55, y - rh * 0.9, cx, y - rh); } ctx.stroke(); }
    if (o.finial) { line(ctx, cx, y - rh, cx, y - rh - 3, o.finial, 1.5); circ(ctx, cx, y - rh - 3.5, 1.5, o.finial, INK); }
  }
  /** onion dome */
  function onion(ctx, cx, y, r, rh, col, o) {
    ctx.beginPath(); ctx.moveTo(cx - r, y); ctx.bezierCurveTo(cx - r * 1.25, y - rh * 0.55, cx - r * 0.15, y - rh * 0.75, cx, y - rh); ctx.bezierCurveTo(cx + r * 0.15, y - rh * 0.75, cx + r * 1.25, y - rh * 0.55, cx + r, y); ctx.closePath();
    ctx.fillStyle = Art.rgrad(ctx, cx - r * 0.3, y - rh * 0.45, 0, r * 1.4, [[0, lit(col, 0.55)], [0.5, col], [1, shd(col, 0.5)]]); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    if (o && o.finial) { line(ctx, cx, y - rh, cx, y - rh - 3, o.finial, 1.5); circ(ctx, cx, y - rh - 3.5, 1.4, o.finial, INK); }
  }
  /** thin spire (tall cone) */
  function spire(ctx, cx, y, r, h, col, o) {
    cone(ctx, cx, y, r, h, col, Object.assign({ rows: 5 }, o || {}));
  }
  /** battlement merlons along a horizontal edge */
  function crenels(ctx, x0, x1, y, mw, mh, col) {
    const n = Math.max(1, Math.floor((x1 - x0) / (mw * 2)));
    const step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { const x = x0 + i * step + step * 0.25; ctx.fillStyle = lit(col, 0.18); ctx.fillRect(x, y - mh, mw, mh); ctx.strokeStyle = INK2; ctx.strokeRect(x + 0.5, y - mh + 0.5, mw - 1, mh - 1); }
  }
  /** glowing window at (x, y) top-left, size ww×wh */
  function windowAt(ctx, x, y, ww, wh, glowCol, arch) {
    ctx.fillStyle = rgbaOf(glowCol, 0.2); ctx.fillRect(x - 1.5, y - 1.5, ww + 3, wh + 3);
    ctx.fillStyle = '#2a2030'; ctx.fillRect(x - 0.6, y - 0.6, ww + 1.2, wh + 1.2);
    ctx.fillStyle = Art.grad(ctx, x, y, x, y + wh, [[0, lit(glowCol, 0.55)], [1, glowCol]]);
    if (arch) { ctx.beginPath(); ctx.moveTo(x, y + wh); ctx.lineTo(x, y + ww / 2); ctx.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(x + ww, y + wh); ctx.closePath(); ctx.fill(); }
    else ctx.fillRect(x, y, ww, wh);
  }
  /** windows on the front face of a box */
  function windows(ctx, p, w, h, cols, rows, glowCol, o) {
    o = o || {};
    const ww = o.ww || 2.6, wh = o.wh || 3.4;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (o.skipDoor && rows === 1 && cols % 2 === 1 && c === (cols - 1) / 2) continue;
      const X = w * (c + 1) / (cols + 1) - ww / 2;
      const Y = rows === 1 ? h * 0.6 : h * (0.82 - 0.5 * r / (rows - 1));
      const [x, y] = p(X, Y, 0);
      windowAt(ctx, x, y, ww, wh, glowCol, o.arch);
    }
  }
  /** door with bottom-centre at (x, y) */
  function door(ctx, x, y, w, h, col, arch, glowCol) {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y);
    if (arch) { ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); } else { ctx.lineTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y - h); }
    ctx.lineTo(x + w / 2, y); ctx.closePath();
    ctx.fillStyle = glowCol ? Art.grad(ctx, 0, y - h, 0, y, [[0, shd(col, 0.6)], [1, glowCol]]) : shd(col, 0.62); ctx.fill();
    ctx.strokeStyle = lit(col, 0.25); ctx.lineWidth = 1; ctx.stroke();
  }
  /** chimney on a roof at screen (x, y) (its base), with drifting smoke */
  function chimney(ctx, x, y, w, h, col, smoke) {
    ctx.fillStyle = shd(col, 0.1); ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = lit(col, 0.3); ctx.fillRect(x - w / 2 - 0.5, y - h - 1, w + 1, 1.5);
    ctx.strokeStyle = INK2; ctx.strokeRect(x - w / 2 + 0.5, y - h + 0.5, w - 1, h - 1);
    if (smoke) { for (let i = 0; i < 3; i++) circ(ctx, x + i * 1.6 + 0.5, y - h - 2.5 - i * 3.2, 1.6 + i * 0.8, 'rgba(225,225,235,' + (0.35 - i * 0.09) + ')'); }
  }
  /** pole with a fluttering banner; (x, y) = pole base; frame 0..3 waves the cloth */
  function bannerAt(ctx, x, y, h, col, col2, shape, frame, scale) {
    scale = scale || 1;
    const bw = 7 * scale, bh = 9 * scale, f = (frame || 0) % 4, wave = Math.sin(f * Math.PI / 2) * 1.2 * scale;
    line(ctx, x, y, x, y - h, '#5a4532', 1.2); circ(ctx, x, y - h, 1.2 * scale, '#e8c357', INK2);
    ctx.beginPath();
    const top = y - h + 1, right = x + bw;
    if (shape === 'pennant') { ctx.moveTo(x, top); ctx.quadraticCurveTo(x + bw * 0.6, top + wave, right + wave, top + bh * 0.45); ctx.quadraticCurveTo(x + bw * 0.6, top + bh * 0.5 - wave, x, top + bh * 0.9); }
    else if (shape === 'swallow') { ctx.moveTo(x, top); ctx.quadraticCurveTo(x + bw * 0.6, top + wave, right + wave, top); ctx.lineTo(right * 0.85 + x * 0.15, top + bh * 0.5); ctx.lineTo(right + wave, top + bh); ctx.quadraticCurveTo(x + bw * 0.6, top + bh - wave, x, top + bh); }
    else if (shape === 'round') { ctx.moveTo(x, top); ctx.lineTo(x + bw * 0.8, top); ctx.quadraticCurveTo(right + wave, top + bh * 0.5, x + bw * 0.8, top + bh); ctx.lineTo(x, top + bh); }
    else if (shape === 'spear') { ctx.moveTo(x, top); ctx.quadraticCurveTo(x + bw * 0.5, top + wave, right + wave, top + bh * 0.2); ctx.lineTo(x + bw * 0.6, top + bh * 0.55); ctx.lineTo(x, top + bh * 0.7); }
    else { ctx.moveTo(x, top); ctx.quadraticCurveTo(x + bw * 0.5, top + wave, right + wave, top); ctx.lineTo(right + wave * 0.5, top + bh); ctx.quadraticCurveTo(x + bw * 0.5, top + bh - wave, x, top + bh); }
    ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, x, 0, right, 0, [[0, lit(col, 0.2)], [0.5, col], [1, shd(col, 0.3)]]); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    if (col2) { ctx.fillStyle = col2; circ(ctx, x + bw * 0.42, top + bh * 0.45, 1.5 * scale, col2); }
  }
  /** small deciduous tree at (x, y) base */
  function tree(ctx, x, y, r, col, trunk) {
    line(ctx, x, y, x, y - r * 1.2, trunk || '#5a3b23', 1.5);
    const c = col || '#4d8a3a';
    circ(ctx, x, y - r * 1.5, r, Art.rgrad(ctx, x - r * 0.4, y - r * 1.9, 0, r * 1.4, [[0, lit(c, 0.45)], [0.6, c], [1, shd(c, 0.5)]]), INK);
  }
  function pineTree(ctx, x, y, r, col) {
    const c = col || '#2f5a33';
    line(ctx, x, y, x, y - r, '#4a3020', 1.2);
    for (let i = 0; i < 3; i++) { const t = i / 3, yy = y - r * 0.6 - i * r * 0.85, rr = r * (1 - t * 0.35); poly(ctx, [[x - rr, yy], [x, yy - rr * 1.5], [x + rr, yy]], Art.grad(ctx, x - rr, 0, x + rr, 0, [[0, lit(c, 0.35)], [1, shd(c, 0.4)]]), INK); }
  }
  function palm(ctx, x, y, h, col) {
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y - h * 0.5, x + 3, y - h); ctx.stroke();
    const c = col || '#4f9a3f';
    for (let i = 0; i < 6; i++) { const a = -Math.PI + i * Math.PI / 5; ctx.strokeStyle = i < 3 ? lit(c, 0.25) : shd(c, 0.25); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x + 3, y - h); ctx.quadraticCurveTo(x + 3 + Math.cos(a) * 7, y - h + Math.sin(a) * 4 - 2, x + 3 + Math.cos(a) * 9, y - h + Math.sin(a) * 5 + 4); ctx.stroke(); }
  }
  function rock(ctx, x, y, r, col, seed) {
    const rng = Art.rng(seed || 3), c = col || '#7a746c', pts = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; pts.push([x + Math.cos(a) * r * (0.7 + rng.next() * 0.5), y - r * 0.55 + Math.sin(a) * r * (0.45 + rng.next() * 0.3)]); }
    poly(ctx, pts, Art.grad(ctx, x - r, y - r, x + r, y, [[0, lit(c, 0.45)], [0.5, c], [1, shd(c, 0.5)]]), INK);
  }
  function crystal(ctx, x, y, w, h, col, tilt) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt || 0);
    poly(ctx, [[0, -h], [w * 0.5, -h * 0.35], [w * 0.35, 0], [-w * 0.35, 0], [-w * 0.5, -h * 0.35]], Art.grad(ctx, -w / 2, -h, w / 2, 0, [[0, lit(col, 0.7)], [0.45, col], [1, shd(col, 0.35)]]), INK);
    line(ctx, 0, -h + 1, -w * 0.3, -h * 0.4, 'rgba(255,255,255,0.7)', 1);
    ctx.restore();
  }
  function fire(ctx, x, y, r, frame) {
    const f = (frame || 0) % 4, k = 1 + 0.15 * Math.sin(f * 1.7);
    glow(ctx, x, y - r * 0.4, r * 3, '#ff9a3a', 0.45);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; line(ctx, x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.5, x - Math.cos(a) * r * 1.2, y - Math.sin(a) * r * 0.5, '#3a2618', 1.6); }
    poly(ctx, [[x - r * 0.8, y], [x - r * 0.4, y - r * 1.3 * k], [x, y - r * 2.4 * k], [x + r * 0.5, y - r * 1.2 * k], [x + r * 0.8, y]], Art.grad(ctx, 0, y - r * 2.4, 0, y, [[0, '#ffe08a'], [0.5, '#ff8a2a'], [1, '#c8301a']]));
    poly(ctx, [[x - r * 0.35, y], [x, y - r * 1.3 * k], [x + r * 0.3, y]], '#fff2b0');
  }

  // ================================================================ styles
  const S = {};
  function def(id, o) { S[id] = Object.assign({ id, glowCol: '#ffcf6e', banner: 'square', wallKind: 'stone', ground: '#8b7a55', roofRows: 4, houseTypes: ['stone'] }, o); }
  def('feudal', { wall: '#9a9083', plaster: '#d9c9a4', roof: '#8c3a33', roof2: '#3d5a8c', trim: '#5a3b23', accent: '#2d5da8', banner: 'pennant', ground: '#8b7a55', houseTypes: ['timber', 'timber', 'stone'], keepRoof: '#3d5a8c' });
  def('high', { wall: '#efe7dc', plaster: '#f4ede2', roof: '#d8b04a', roof2: '#3fb3b0', trim: '#c9a24a', accent: '#f2e8c9', banner: 'swallow', ground: '#c9c0a2', glowCol: '#bfe8ff', houseTypes: ['marble'], wallKind: 'marble' });
  def('barbarian', { wall: '#6a4a2e', plaster: '#a88356', roof: '#b08a4c', roof2: '#a8322a', trim: '#3a2618', accent: '#a8322a', banner: 'spear', ground: '#7a6a45', houseTypes: ['longhouse', 'tent'], wallKind: 'palisade', glowCol: '#ff9a3a' });
  def('industrious', { wall: '#7f7c78', plaster: '#8e8b86', roof: '#7a2e2a', roof2: '#c89b3c', trim: '#c89b3c', accent: '#8c4b2f', banner: 'square', ground: '#6f6a60', houseTypes: ['dwarf'], glowCol: '#ff9a3a' });
  def('mystic', { wall: '#a9b7d0', plaster: '#c4cfe4', roof: '#6a4fbf', roof2: '#43c2d6', trim: '#d8dcf0', accent: '#243b6b', banner: 'round', ground: '#8890a8', glowCol: '#7fd8ff', houseTypes: ['arcane'] });
  def('dark', { wall: '#3a3542', plaster: '#4a4452', roof: '#2a1f36', roof2: '#5b2a6e', trim: '#8a1f2e', accent: '#3a1f4b', banner: 'swallow', ground: '#4a4652', glowCol: '#b06aff', houseTypes: ['gothic'], wallKind: 'iron' });
  def('reaver', { wall: '#5e3f36', plaster: '#6b5a52', roof: '#6e7078', roof2: '#8a3a26', trim: '#c8c0b0', accent: '#4a2f2a', banner: 'square', ground: '#5c5048', glowCol: '#ff8a2a', houseTypes: ['iron'], wallKind: 'iron' });
  def('primal', { wall: '#8a6a44', plaster: '#a8865a', roof: '#6f4f32', roof2: '#c8a070', trim: '#e6dcc2', accent: '#7b5a36', banner: 'spear', ground: '#7a6a45', glowCol: '#8ad34a', houseTypes: ['hut', 'hut', 'longhouse'], wallKind: 'palisade' });
  def('oathsworn', { wall: '#e8dcc4', plaster: '#eee4cf', roof: '#3f8f6e', roof2: '#9c1f2e', trim: '#9c1f2e', accent: '#4fb08c', banner: 'square', ground: '#a3987c', glowCol: '#ffd27a', houseTypes: ['pagoda'] });
  def('architect', { wall: '#efe9dc', plaster: '#f3eee4', roof: '#c9834a', roof2: '#b47a3a', trim: '#b47a3a', accent: '#d8cdb4', banner: 'square', ground: '#cfc6ae', glowCol: '#ffd98a', houseTypes: ['classic'], wallKind: 'marble' });
  def('nomad', { wall: '#d2b07a', plaster: '#e0c48e', roof: '#3a4e8c', roof2: '#b5502f', trim: '#7a5a34', accent: '#3a4e8c', banner: 'pennant', ground: '#d0b077', glowCol: '#ffcf6e', houseTypes: ['adobe', 'yurt'], wallKind: 'sand' });
  const ARCH_ALIAS = { gothic: 'feudal', elven: 'high', tribal: 'barbarian', industrial: 'industrious', arcane: 'mystic', giant: 'architect', classical: 'architect', desert: 'nomad', eastern: 'oathsworn' };
  StructArt.STYLES = Object.keys(S);
  StructArt.styleFor = function (o) {
    o = o || {};
    const a = o.architecture || o.cultureId || 'feudal';
    if (S[a]) return a;
    if (ARCH_ALIAS[a]) return ARCH_ALIAS[a];
    return 'feudal';
  };
  /** resolved style with per-city palette overrides: the culture palette tints the style (50%) so the
   *  architecture keeps its identity while sub-cultures / custom palettes still shift the look */
  function styleWith(id, pal) {
    const base = S[id] || S.feudal;
    if (!pal) return base;
    const st = Object.assign({}, base);
    if (pal.roof) st.roof = C.mix(base.roof, pal.roof, 0.5);
    if (pal.wall) st.wall = C.mix(base.wall, pal.wall, 0.45);
    if (pal.accent) st.accent = pal.accent;
    if (pal.secondary) st.roof2 = C.mix(base.roof2, pal.secondary, 0.4);
    return st;
  }

  // ================================================================ house archetypes
  // Each draws a building whose ground footprint centre is at screen (sx, sy) with size w×d and wall height h.
  function originFor(sx, sy, w, d) { return proj(sx - w / 2 - d * KX / 2, sy + d * KZ / 2); }
  const HOUSES = {};
  HOUSES.timber = function (ctx, sx, sy, w, d, h, st, rng) {
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.plaster, { top: false });
    timber(ctx, p, w, h, st.trim);
    const roofCol = rng.chance(0.4) ? st.roof2 : st.roof;
    const alongZ = rng.chance(0.5);
    if (alongZ) roofGableZ(ctx, p, w, d, h, h * 0.75, roofCol, { wall: st.plaster, beams: st.trim });
    else roofGableX(ctx, p, w, d, h, h * 0.7, roofCol, { wall: st.plaster });
    windows(ctx, p, w, h, w > 12 ? 2 : 1, 1, st.glowCol, { skipDoor: false });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 2.8, 4, st.trim, true);
    if (rng.chance(0.7)) { const c = p(w * 0.78, h + (alongZ ? h * 0.35 : h * 0.3), d * 0.7); chimney(ctx, c[0], c[1], 2.2, 4, st.wall, rng.chance(0.6)); }
  };
  HOUSES.stone = function (ctx, sx, sy, w, d, h, st, rng) {
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.wall, { top: false, courses: 3 });
    if (rng.chance(0.5)) roofGableX(ctx, p, w, d, h, h * 0.6, st.roof, { wall: st.wall }); else roofHip(ctx, p, w, d, h, h * 0.55, st.roof);
    windows(ctx, p, w, h, 2, 1, st.glowCol, {});
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 2.8, 4, st.trim, true);
    const c = p(w * 0.25, h + h * 0.25, d * 0.6); chimney(ctx, c[0], c[1], 2, 3.5, st.wall, rng.chance(0.5));
  };
  HOUSES.marble = function (ctx, sx, sy, w, d, h, st, rng) {
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.wall, { top: false });
    const kind = rng.int(0, 2);
    if (kind === 0) { roofFlat(ctx, p, w, d, h, st.wall, { parapet: 1.5 }); const c = p(w / 2, h + 1.5, d / 2); dome(ctx, c[0], c[1], Math.min(w, d) * 0.4, Math.min(w, d) * 0.36, st.roof, { finial: '#f5e7a8' }); }
    else if (kind === 1) roofHip(ctx, p, w, d, h, h * 0.42, st.roof2, { rows: 3 });
    else roofGableX(ctx, p, w, d, h, h * 0.45, st.roof2, { wall: st.wall });
    windows(ctx, p, w, h, w > 12 ? 3 : 2, 1, st.glowCol, { arch: true, ww: 2.2, wh: 4 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 3, 5, '#b89a5a', true);
  };
  HOUSES.longhouse = function (ctx, sx, sy, w, d, h, st, rng) {
    w = w * 1.25; d = d * 0.8; h = h * 0.8;
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.wall, { top: false, planks: 3 });
    const r = roofGableX(ctx, p, w, d, h, h * 0.95, st.roof, { wall: st.wall, rows: 5 });
    // crossed beams at the ridge ends
    line(ctx, r.ridge[0][0] - 2, r.ridge[0][1] - 3, r.ridge[0][0] + 2, r.ridge[0][1] + 2, st.trim, 1.2); line(ctx, r.ridge[0][0] + 2, r.ridge[0][1] - 3, r.ridge[0][0] - 2, r.ridge[0][1] + 2, st.trim, 1.2);
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 3.4, 4.5, st.trim, false, warm(st.glowCol, 0.4));
    if (rng.chance(0.5)) { const s = p(w * 0.15, h + 1, d * 0.5); circ(ctx, s[0], s[1] - 2, 1.6, '#e8dcc2', INK2); } // skull on the gable
  };
  HOUSES.tent = function (ctx, sx, sy, w, d, h, st, rng) {
    const r = Math.max(w, d) * 0.55, hh = h * 1.35;
    contactShadow(ctx, sx, sy, r, r * KZ, 0.3);
    cone(ctx, sx, sy, r, hh, rng.chance(0.5) ? st.plaster : st.roof, { rows: 3 });
    // seam and stripe
    line(ctx, sx, sy - hh, sx - r * 0.5, sy, 'rgba(60,40,25,0.4)', 1);
    line(ctx, sx, sy - hh, sx + r * 0.5, sy, 'rgba(60,40,25,0.4)', 1);
    poly(ctx, [[sx - 1.5, sy], [sx, sy - hh * 0.4], [sx + 1.5, sy]], '#2a1c14');
    line(ctx, sx - 1, sy - hh - 1, sx + 1, sy - hh + 3, '#4a3220', 1.2); line(ctx, sx + 1, sy - hh - 1, sx - 1, sy - hh + 3, '#4a3220', 1.2);
  };
  HOUSES.dwarf = function (ctx, sx, sy, w, d, h, st, rng) {
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.wall, { top: false, courses: 3.2 });
    // brass band
    const a = p(0, h - 1.2, 0), b = p(w, h - 1.2, 0); line(ctx, a[0], a[1], b[0], b[1], st.trim, 1.2);
    if (rng.chance(0.6)) roofGableX(ctx, p, w, d, h, h * 0.45, st.roof, { wall: st.wall }); else roofHip(ctx, p, w, d, h, h * 0.4, st.roof);
    windows(ctx, p, w, h, 2, 1, '#ff9a3a', { ww: 2.4, wh: 2.6 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 3.2, 4.2, '#3a3028', true, '#ff8a2a');
    const c = p(w * 0.8, h + h * 0.22, d * 0.5); chimney(ctx, c[0], c[1], 2.4, 5, '#4a4a50', true);
  };
  HOUSES.arcane = function (ctx, sx, sy, w, d, h, st, rng) {
    const r = Math.min(w, d) * 0.5, hh = h * 1.15;
    contactShadow(ctx, sx, sy, r * 1.2, r * KZ * 1.2, 0.3);
    cylinder(ctx, sx, sy, r, hh, st.wall, { top: false });
    windowAt(ctx, sx - 1.2, sy - hh * 0.6, 2.4, 3.2, st.glowCol, true);
    cone(ctx, sx, sy - hh, r + 1.5, hh * 0.9, rng.chance(0.5) ? st.roof : st.roof2, { rows: 4, finial: st.glowCol });
    if (rng.chance(0.5)) { glow(ctx, sx + r + 2, sy - hh - 2, 5, st.glowCol, 0.6); crystal(ctx, sx + r + 2, sy - hh, 2.4, 4, '#8fe6ff', 0.3); }
  };
  HOUSES.gothic = function (ctx, sx, sy, w, d, h, st, rng) {
    h = h * 1.2; w = w * 0.85;
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.wall, { top: false, courses: 3 });
    const r = roofGableZ(ctx, p, w, d, h, h * 1.1, st.roof, { wall: st.wall, rows: 5 });
    // spike finial
    line(ctx, r.apexFront[0], r.apexFront[1], r.apexFront[0], r.apexFront[1] - 4, '#8a8a94', 1.2);
    windows(ctx, p, w, h, 1, 1, st.glowCol, { arch: true, ww: 2.2, wh: 4.2 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 2.8, 4.5, '#1e1a24', true);
  };
  HOUSES.iron = function (ctx, sx, sy, w, d, h, st, rng) {
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.wall, { top: false, courses: 2.6 });
    roofGableX(ctx, p, w, d, h, h * 0.35, st.roof, { wall: st.wall, rows: 3 });
    // rivet line
    const a = p(0, h - 1, 0), b = p(w, h - 1, 0); line(ctx, a[0], a[1], b[0], b[1], st.trim, 1);
    windows(ctx, p, w, h, 2, 1, '#ff9a3a', { ww: 2.2, wh: 2.4 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 3.2, 4.2, '#2a2428', false, '#ff7a2a');
    const c = p(w * 0.82, h + h * 0.15, d * 0.4); ctx.fillStyle = '#3a3a42'; ctx.fillRect(c[0] - 1, c[1] - 7, 2, 7); chimney(ctx, c[0], c[1] - 6, 2.6, 1.5, '#5a5a62', true);
  };
  HOUSES.hut = function (ctx, sx, sy, w, d, h, st, rng) {
    const r = Math.min(w, d) * 0.55, hh = h * 0.6;
    contactShadow(ctx, sx, sy, r * 1.2, r * KZ * 1.2, 0.3);
    cylinder(ctx, sx, sy, r, hh, st.plaster, { top: false, planks: 3 });
    cone(ctx, sx, sy - hh, r + 2, hh * 1.4, st.roof, { rows: 3 });
    door(ctx, sx, sy, 3, hh * 0.9, st.trim, true, warm(st.glowCol, 0.3));
    if (rng.chance(0.6)) { const bx = sx + r + 1.5; line(ctx, bx, sy, bx, sy - hh * 2.2, '#5a4532', 1.2); circ(ctx, bx, sy - hh * 2.2, 1.7, '#e8dcc2', INK2); }
  };
  HOUSES.pagoda = function (ctx, sx, sy, w, d, h, st, rng) {
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.plaster, { top: false });
    timberFrame(ctx, p, w, h, st.trim);
    curvedRoof(ctx, p, w, d, h, h * 0.5, st.roof, 2.5);
    if (w > 11 && rng.chance(0.5)) { const p2 = (X, Y, Z) => p(X + w * 0.2, Y + h + h * 0.5, Z + d * 0.2); box(ctx, p2, w * 0.6, d * 0.6, h * 0.55, st.plaster, { top: false }); curvedRoof(ctx, p2, w * 0.6, d * 0.6, h * 0.55, h * 0.45, st.roof, 2.2); }
    windows(ctx, p, w, h, 2, 1, st.glowCol, { ww: 2.4, wh: 2.8 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 3.2, 4.2, st.trim, false);
    if (rng.chance(0.5)) { const l = p(-2.5, 0, 0); lantern(ctx, l[0], l[1], 4); }
  };
  HOUSES.classic = function (ctx, sx, sy, w, d, h, st, rng) {
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h, st.wall, { top: false });
    // columns on the front
    ctx.strokeStyle = lit(st.wall, 0.5); ctx.lineWidth = 1.4; ctx.beginPath();
    const n = Math.max(2, Math.round(w / 3.5));
    for (let i = 0; i <= n; i++) { const a = p(w * i / n, 0.5, 0), b = p(w * i / n, h - 0.5, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,15,30,0.25)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const a = p(w * i / n + 0.8, 0.5, 0), b = p(w * i / n + 0.8, h - 0.5, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    if (rng.chance(0.5)) roofGableZ(ctx, p, w, d, h, h * 0.4, st.roof, { wall: st.wall, ov: 2, rows: 3 });
    else { roofFlat(ctx, p, w, d, h, st.wall, { parapet: 1.5 }); const c = p(w / 2, h + 1.5, d / 2); dome(ctx, c[0], c[1], Math.min(w, d) * 0.38, Math.min(w, d) * 0.3, '#b47a3a', { finial: '#f5e7a8' }); }
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 3, 4.5, '#8a6a3a', false, st.glowCol);
  };
  HOUSES.adobe = function (ctx, sx, sy, w, d, h, st, rng) {
    const p = originFor(sx, sy, w, d);
    box(ctx, p, w, d, h * 0.85, st.wall, { top: false });
    roofFlat(ctx, p, w, d, h * 0.85, st.wall, { parapet: 1.5 });
    // awning
    const stripes = rng.chance(0.5) ? st.roof : st.roof2;
    const a = p(w * 0.15, h * 0.6, 0), b = p(w * 0.85, h * 0.6, 0);
    poly(ctx, [[a[0] - 1, a[1] - 3], [b[0] + 1, b[1] - 3], [b[0] + 2, b[1] + 2], [a[0] - 2, a[1] + 2]], stripes, INK);
    ctx.strokeStyle = 'rgba(255,245,225,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 4; i++) { const t = i / 4; ctx.moveTo(M.lerp(a[0] - 1, b[0] + 1, t), a[1] - 3); ctx.lineTo(M.lerp(a[0] - 2, b[0] + 2, t), a[1] + 2); } ctx.stroke();
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 2.8, 4, st.trim, true);
    windows(ctx, p, w, h * 0.85, 2, 1, st.glowCol, { ww: 2, wh: 2.2 });
  };
  HOUSES.yurt = function (ctx, sx, sy, w, d, h, st, rng) {
    const r = Math.min(w, d) * 0.55, hh = h * 0.55;
    contactShadow(ctx, sx, sy, r * 1.2, r * KZ * 1.2, 0.3);
    cylinder(ctx, sx, sy, r, hh, st.plaster, { top: false });
    const band = rng.chance(0.5) ? st.roof : st.roof2;
    ctx.fillStyle = band; ctx.fillRect(sx - r + 0.5, sy - hh * 0.45, r * 2 - 1, 1.6);
    cone(ctx, sx, sy - hh, r + 1.5, hh * 1.1, band, { rows: 2, finial: '#e8c357' });
    door(ctx, sx, sy, 3, hh * 0.9, st.trim, true);
  };
  function timberFrame(ctx, p, w, h, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath();
    const seg = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
    seg(p(0.5, 0.5, 0), p(0.5, h - 0.5, 0)); seg(p(w - 0.5, 0.5, 0), p(w - 0.5, h - 0.5, 0)); seg(p(0.5, h - 0.5, 0), p(w - 0.5, h - 0.5, 0));
    ctx.stroke();
  }
  /** curved east-asian roof with upturned eaves, ridge along X */
  function curvedRoof(ctx, p, w, d, h, rh, col, ov) {
    ov = ov || 2.5;
    const fl = p(-ov, h - 1, -ov), fr = p(w + ov, h - 1, -ov), rl = p(0, h + rh, d / 2), rr = p(w, h + rh, d / 2), bl = p(-ov, h - 1, d + ov), br = p(w + ov, h - 1, d + ov);
    // back slope
    ctx.beginPath(); ctx.moveTo(rl[0], rl[1]); ctx.lineTo(rr[0], rr[1]); ctx.quadraticCurveTo(br[0] - 1, br[1] - 3, br[0], br[1] - 2); ctx.lineTo(bl[0], bl[1] - 2); ctx.quadraticCurveTo(bl[0] + 1, bl[1] - 3, rl[0], rl[1]); ctx.closePath();
    fillPath(ctx, shd(col, 0.3), INK);
    // right gable end
    poly(ctx, [p(w, h, 0), rr, p(w, h, d)], shd(col, 0.5), INK);
    // front slope with upturned corners
    ctx.beginPath(); ctx.moveTo(rl[0], rl[1]); ctx.lineTo(rr[0], rr[1]); ctx.quadraticCurveTo(fr[0] - 2, fr[1] + 1, fr[0], fr[1] - 2.5); ctx.quadraticCurveTo(fr[0] - 1, fr[1] + 0.5, fr[0] - 3, fr[1] + 0.5);
    ctx.lineTo(fl[0] + 3, fl[1] + 0.5); ctx.quadraticCurveTo(fl[0] + 1, fl[1] + 0.5, fl[0], fl[1] - 2.5); ctx.quadraticCurveTo(fl[0] + 2, fl[1] + 1, rl[0], rl[1]); ctx.closePath();
    fillPath(ctx, Art.grad(ctx, 0, rl[1], 0, fl[1], [[0, lit(col, 0.35)], [1, shd(col, 0.1)]]), INK);
    ctx.strokeStyle = 'rgba(20,15,30,0.14)'; ctx.beginPath(); for (let i = 1; i < 4; i++) { const t = i / 4; ctx.moveTo(M.lerp(rl[0], fl[0] + 3, t), M.lerp(rl[1], fl[1], t)); ctx.lineTo(M.lerp(rr[0], fr[0] - 3, t), M.lerp(rr[1], fr[1], t)); } ctx.stroke();
    line(ctx, rl[0], rl[1], rr[0], rr[1], '#e8c357', 1.3);
    return { ridge: [rl, rr] };
  }
  function lantern(ctx, x, y, h) {
    line(ctx, x, y, x, y - h, '#7a7a80', 1.2);
    ctx.fillStyle = '#8a8a90'; ctx.fillRect(x - 2, y - h - 3, 4, 3); glow(ctx, x, y - h - 1.5, 4, '#ffd27a', 0.6); ctx.fillStyle = '#ffe8a0'; ctx.fillRect(x - 1, y - h - 2.5, 2, 2);
  }

  // ================================================================ landmarks per style
  // Signature: (ctx, sx, sy, w, d, tier, st, rng) ; footprint centre (sx, sy). Returns {bannerPts:[[x,y,h]…], glowPts:[[x,y,r]…], top}
  const LANDMARK = {};
  function stoneKeep(ctx, sx, sy, w, d, tier, st, rng, opts) {
    opts = opts || {};
    const p = originFor(sx, sy, w, d);
    const h = 14 + tier * 3.5, out = { banners: [], glows: [] };
    const roofCol = opts.roof || st.keepRoof || st.roof;
    // corner towers (back pair first)
    const tr = 3.2 + tier * 0.4, th = h + 5 + tier;
    const tw = (X, Z, hh) => { const c = p(X, 0, Z); cylinder(ctx, c[0], c[1], tr, hh, st.wall, { courses: 3, crenel: !opts.roofTowers }); if (opts.roofTowers !== false) cone(ctx, c[0], c[1] - hh, tr + 1.2, tr * 2.4, roofCol, { rows: 4, finial: '#e8c357' }); return c; };
    tw(w, d, th); tw(0, d, th);
    box(ctx, p, w, d, h, st.wall, { courses: 3.2, topColor: shd(st.wall, 0.1) });
    // battlements along the front and right top edges
    const a = p(0, h, 0), b = p(w, h, 0);
    crenels(ctx, a[0], b[0], a[1], 2.2, 2.4, st.wall);
    // central tower
    if (tier >= 4 || opts.center) {
      const ch = h + 12 + tier * 3;
      const p2 = (X, Y, Z) => p(X + w * 0.3, Y, Z + d * 0.3);
      box(ctx, p2, w * 0.4, d * 0.4, ch, st.wall, { courses: 3.2 });
      const c = p2(w * 0.2, ch, d * 0.2);
      roofHip(ctx, p2, w * 0.4, d * 0.4, ch, 8 + tier * 2, roofCol, { rows: 4 });
      const apex = p2(w * 0.2, ch + 8 + tier * 2, d * 0.2);
      out.banners.push([apex[0], apex[1] + 1, 10]);
      out.glows.push([apex[0], apex[1] - 2, 16]);
      windows(ctx, p2, w * 0.4, ch, 1, 2, st.glowCol, { arch: true });
      out.top = apex[1] - 14;
    } else {
      const c = p(w * 0.5, h, d * 0.5);
      out.banners.push([c[0], c[1], 9]);
      out.top = c[1] - 12;
    }
    tw(w, 0, th); tw(0, 0, th);
    windows(ctx, p, w, h, 3, 1, st.glowCol, { arch: true });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 5, 7, '#4a3320', true);
    // gate portcullis lines
    ctx.strokeStyle = 'rgba(20,15,30,0.35)'; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(dr[0] + i * 1.5, dr[1]); ctx.lineTo(dr[0] + i * 1.5, dr[1] - 6); } ctx.stroke();
    return out;
  }
  LANDMARK.feudal = function (ctx, sx, sy, w, d, tier, st, rng) {
    if (tier <= 2) {
      const p = originFor(sx, sy, w, d), h = 11 + tier * 2;
      box(ctx, p, w, d, h, st.plaster, { top: false });
      timber(ctx, p, w, h, st.trim);
      const r = roofGableX(ctx, p, w, d, h, h * 0.8, st.roof, { wall: st.plaster, rows: 5 });
      windows(ctx, p, w, h, 3, 1, st.glowCol, {});
      const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 4, 6, st.trim, true);
      const c = p(w * 0.8, h + h * 0.4, d * 0.5); chimney(ctx, c[0], c[1], 2.4, 5, st.wall, true);
      return { banners: [[r.ridge[0][0] + 2, r.ridge[0][1], 9]], glows: [], top: r.ridge[0][1] - 12 };
    }
    return stoneKeep(ctx, sx, sy, w, d, tier, st, rng, { center: tier >= 4 });
  };
  LANDMARK.high = function (ctx, sx, sy, w, d, tier, st, rng) {
    const p = originFor(sx, sy, w, d), h = 12 + tier * 2.5, out = { banners: [], glows: [] };
    // side spires (back)
    const sp = (X, Z, hh) => { const c = p(X, 0, Z); cylinder(ctx, c[0], c[1], 2.6, hh, st.wall, { top: false }); dome(ctx, c[0], c[1] - hh, 3.2, 2.6, st.roof2, { finial: '#f5e7a8' }); return c; };
    if (tier >= 3) { sp(w, d, h + 8 + tier * 2); sp(0, d, h + 8 + tier * 2); }
    box(ctx, p, w, d, h, st.wall, { top: false });
    // arcade of arches along the front
    ctx.strokeStyle = 'rgba(20,15,30,0.22)'; ctx.lineWidth = 1; ctx.beginPath();
    const n = Math.round(w / 5);
    for (let i = 0; i <= n; i++) { const a = p(w * i / n, 0.5, 0), b = p(w * i / n, h * 0.55, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    roofFlat(ctx, p, w, d, h, st.wall, { parapet: 2 });
    // gold band
    const a = p(0, h + 2, 0), b = p(w, h + 2, 0); line(ctx, a[0], a[1], b[0], b[1], '#e8c357', 1.4);
    // main dome
    const c = p(w / 2, h + 2, d / 2), dr0 = Math.min(w, d) * (tier >= 5 ? 0.5 : 0.42);
    cylinder(ctx, c[0], c[1], dr0 * 0.9, 5 + tier, st.wall, { top: false });
    windows(ctx, (X, Y, Z) => [c[0] - dr0 * 0.9 + X, c[1] - 5 - tier + (5 + tier) - Y], dr0 * 1.8, 5 + tier, 3, 1, st.glowCol, { arch: true, ww: 1.8, wh: 3 });
    dome(ctx, c[0], c[1] - 5 - tier, dr0, dr0 * 0.9, st.roof, { ribs: 6, finial: '#fff4c8' });
    const top = c[1] - 5 - tier - dr0 * 0.9;
    if (tier >= 4) { // floating golden ring / sun disk
      glow(ctx, c[0], top - 9, 14, '#fff0b0', 0.55);
      ctx.strokeStyle = '#f2d270'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c[0], top - 9, 9, 3.2, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(c[0], top - 9.5, 8, 2.6, 0, Math.PI, TAU); ctx.stroke();
      out.glows.push([c[0], top - 9, 18]);
    }
    if (tier >= 5) { for (let i = 0; i < 3; i++) { const cx = c[0] + (i - 1) * 14, cy = top - 16 - (i === 1 ? 6 : 0); glow(ctx, cx, cy, 6, '#bfe8ff', 0.6); crystal(ctx, cx, cy + 3, 3, 6, '#9fe0ff', (i - 1) * 0.3); } }
    if (tier >= 2) { sp(w, 0, h + 6 + tier * 2); sp(0, 0, h + 6 + tier * 2); }
    windows(ctx, p, w, h, 3, 1, st.glowCol, { arch: true, ww: 2.2, wh: 4.5 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 4.5, 7, '#b89a5a', true, '#ffe9a8');
    out.banners.push([c[0] + dr0 + 2, c[1] - 2, 11]);
    out.top = top - (tier >= 4 ? 22 : 8);
    return out;
  };
  LANDMARK.barbarian = function (ctx, sx, sy, w, d, tier, st, rng) {
    w *= 1.15;
    const p = originFor(sx, sy, w, d), h = 10 + tier * 2.2, out = { banners: [], glows: [] };
    if (tier >= 3) { // mound
      const g = p(w / 2, 0, d / 2); ell(ctx, g[0], g[1] + 2, w * 0.8, d * 0.5, '#6f5a3a', INK2);
    }
    box(ctx, p, w, d, h, st.wall, { top: false, planks: 3 });
    const r = roofGableX(ctx, p, w, d, h, h * 1.05, st.roof, { wall: st.wall, rows: 6 });
    // hide patches and red-ochre paint stripes on the roof
    for (let i = 0; i < 3; i++) { const t = 0.2 + i * 0.3; ell(ctx, M.lerp(r.ridge[0][0], r.ridge[1][0], t) - 1, M.lerp(r.ridge[0][1], r.ridge[1][1], t) + 5, 3.5, 2.2, 'rgba(90,55,30,0.35)', 'rgba(60,35,20,0.3)'); }
    ctx.strokeStyle = rgbaOf(st.roof2, 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 0; i < 4; i++) { const t = 0.12 + i * 0.25, x = M.lerp(r.ridge[0][0], r.ridge[1][0], t), y = M.lerp(r.ridge[0][1], r.ridge[1][1], t); ctx.moveTo(x, y + 1); ctx.lineTo(x - 1.5, y + h * 0.8); } ctx.stroke();
    // crossed beams / horns at the ridge ends
    for (const e of r.ridge) { line(ctx, e[0] - 2.5, e[1] - 4, e[0] + 2, e[1] + 2, st.trim, 1.4); line(ctx, e[0] + 2.5, e[1] - 4, e[0] - 2, e[1] + 2, st.trim, 1.4); }
    // tusk gate
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 5, 7, st.trim, false, warm(st.glowCol, 0.6));
    ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(dr[0] - 4.5, dr[1]); ctx.quadraticCurveTo(dr[0] - 6, dr[1] - 8, dr[0] - 1, dr[1] - 11); ctx.moveTo(dr[0] + 4.5, dr[1]); ctx.quadraticCurveTo(dr[0] + 6, dr[1] - 8, dr[0] + 1, dr[1] - 11); ctx.stroke();
    ctx.strokeStyle = INK2; ctx.lineWidth = 1; ctx.stroke();
    // skull over the door
    circ(ctx, dr[0], dr[1] - 9.5, 2, '#e8dcc2', INK2); ctx.fillStyle = '#2a1c14'; ctx.fillRect(dr[0] - 1.4, dr[1] - 10.2, 1, 1); ctx.fillRect(dr[0] + 0.4, dr[1] - 10.2, 1, 1);
    // totem
    const t = p(w + 4, 0, d * 0.3); totem(ctx, t[0], t[1], 12 + tier * 2, st);
    if (tier >= 5) { const f = p(-5, 0, d * 0.2); fire(ctx, f[0], f[1], 3, 0); out.glows.push([f[0], f[1] - 4, 12]); }
    out.banners.push([r.ridge[0][0] + 3, r.ridge[0][1] + 1, 10]);
    out.top = r.ridge[0][1] - 16;
    return out;
  };
  function totem(ctx, x, y, h, st) {
    ctx.fillStyle = roundGrad(ctx, x - 2, x + 2, '#8a6a44'); ctx.fillRect(x - 2, y - h, 4, h); ctx.strokeStyle = INK; ctx.strokeRect(x - 2 + 0.5, y - h + 0.5, 3, h - 1);
    for (let i = 0; i < 3; i++) { const yy = y - h + 2 + i * (h / 3); ctx.fillStyle = i % 2 ? '#c8402a' : '#e8c357'; ctx.fillRect(x - 2, yy, 4, 1.5); ctx.fillStyle = '#2a1c14'; ctx.fillRect(x - 1.2, yy + 2.2, 0.9, 0.9); ctx.fillRect(x + 0.3, yy + 2.2, 0.9, 0.9); }
    poly(ctx, [[x - 5, y - h - 1], [x - 2, y - h + 1], [x + 2, y - h + 1], [x + 5, y - h - 1], [x + 2, y - h - 2.5], [x - 2, y - h - 2.5]], '#efe6d2', INK2);
  }
  LANDMARK.industrious = function (ctx, sx, sy, w, d, tier, st, rng) {
    const p = originFor(sx, sy, w, d), h = 13 + tier * 3, out = { banners: [], glows: [] };
    // smokestacks (back)
    const stack = (X, Z, hh) => { const c = p(X, 0, Z); ctx.fillStyle = roundGrad(ctx, c[0] - 2.2, c[0] + 2.2, '#4a4a50'); ctx.fillRect(c[0] - 2.2, c[1] - hh, 4.4, hh); ctx.strokeStyle = INK; ctx.strokeRect(c[0] - 2.2 + 0.5, c[1] - hh + 0.5, 3.4, hh - 1); ctx.fillStyle = st.trim; ctx.fillRect(c[0] - 2.8, c[1] - hh, 5.6, 1.5); for (let i = 0; i < 4; i++) circ(ctx, c[0] + i * 2 + 1, c[1] - hh - 3 - i * 3.5, 2 + i * 1.1, 'rgba(210,210,225,' + (0.4 - i * 0.08) + ')'); };
    if (tier >= 3) { stack(w * 0.85, d * 0.9, h + 14 + tier * 2); }
    if (tier >= 5) { stack(w * 0.15, d * 0.9, h + 10 + tier * 2); }
    box(ctx, p, w, d, h, st.wall, { courses: 3.4, topColor: shd(st.wall, 0.05) });
    // brass band + rivets
    const a = p(0, h - 1.5, 0), b = p(w, h - 1.5, 0); line(ctx, a[0], a[1], b[0], b[1], st.trim, 1.5);
    // brass dome on top (tier>=3) else pitched slate roof
    if (tier >= 3) {
      const c = p(w / 2, h, d / 2), rr = Math.min(w, d) * 0.4;
      dome(ctx, c[0], c[1], rr, rr * 0.75, st.roof2, { ribs: 5, finial: '#f5e7a8' });
      // big gear on the front
      gear(ctx, c[0] - w * 0.5 - 1, c[1] - 1, 5, st.trim);
      out.top = c[1] - rr * 0.75 - 10;
      out.banners.push([c[0] + rr + 1, c[1], 9]);
    } else { const r = roofGableX(ctx, p, w, d, h, h * 0.5, st.roof, { wall: st.wall }); out.top = r.ridge[0][1] - 12; out.banners.push([r.ridge[0][0] + 2, r.ridge[0][1], 9]); }
    windows(ctx, p, w, h, 3, tier >= 4 ? 2 : 1, '#ff9a3a', { ww: 2.4, wh: 2.6 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 6, 7, '#3a3028', true, '#ff7a2a');
    glow(ctx, dr[0], dr[1] - 2, 9, '#ff8a2a', 0.5);
    out.glows.push([dr[0], dr[1] - 3, 12]);
    return out;
  };
  function gear(ctx, x, y, r, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a0 = i / 8 * TAU, a1 = a0 + TAU / 16; ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); ctx.lineTo(Math.cos(a0 + TAU / 32) * r * 1.3, Math.sin(a0 + TAU / 32) * r * 1.3); ctx.lineTo(Math.cos(a1) * r * 1.3, Math.sin(a1) * r * 1.3); ctx.lineTo(Math.cos(a1 + TAU / 32) * r, Math.sin(a1 + TAU / 32) * r); } ctx.closePath();
    fillPath(ctx, Art.grad(ctx, -r, -r, r, r, [[0, lit(col, 0.5)], [1, shd(col, 0.4)]]), INK);
    circ(ctx, 0, 0, r * 0.35, shd(col, 0.5), INK);
    ctx.restore();
  }
  LANDMARK.mystic = function (ctx, sx, sy, w, d, tier, st, rng) {
    const out = { banners: [], glows: [] };
    const r = Math.min(w, d) * 0.42, h = 16 + tier * 4;
    contactShadow(ctx, sx, sy, r * 1.5, r * KZ * 1.5, 0.35);
    if (tier >= 3) { // satellite towers
      for (const [dx, dz, hh] of [[-w * 0.45, d * 0.2, h * 0.65], [w * 0.45, d * 0.2, h * 0.7]]) {
        const cx = sx + dx + dz * KX, cy = sy - dz * KZ;
        cylinder(ctx, cx, cy, r * 0.5, hh, st.wall, { top: false, courses: 3 }); windowAt(ctx, cx - 1.2, cy - hh * 0.55, 2.4, 3.4, st.glowCol, true);
        cone(ctx, cx, cy - hh, r * 0.5 + 1.5, hh * 0.6, st.roof, { rows: 4, finial: st.glowCol });
      }
    }
    cylinder(ctx, sx, sy, r, h, st.wall, { top: false, courses: 3.5 });
    // rune band
    ctx.fillStyle = rgbaOf(st.glowCol, 0.35); ctx.fillRect(sx - r + 0.5, sy - h * 0.55, r * 2 - 1, 2);
    ctx.strokeStyle = lit(st.glowCol, 0.5); ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 4; i++) { const x = sx - r + 2 + i * (r * 2 - 4) / 3; ctx.moveTo(x, sy - h * 0.55 - 1); ctx.lineTo(x + 1.5, sy - h * 0.55 + 3); ctx.moveTo(x + 1.5, sy - h * 0.55 - 1); ctx.lineTo(x, sy - h * 0.55 + 3); } ctx.stroke();
    windowAt(ctx, sx - 1.4, sy - h * 0.8, 2.8, 4, st.glowCol, true); windowAt(ctx, sx - 1.4, sy - h * 0.35, 2.8, 4, st.glowCol, true);
    // wider top storey
    const th = 6 + tier;
    cylinder(ctx, sx, sy - h, r * 1.25, th, st.wall, { top: false });
    for (let i = -1; i <= 1; i++) windowAt(ctx, sx + i * r * 0.7 - 1.1, sy - h - th * 0.75, 2.2, 3.2, st.glowCol, true);
    cone(ctx, sx, sy - h - th, r * 1.4, h * 0.55 + tier * 2, st.roof, { rows: 6, finial: '#e8e8ff' });
    const top = sy - h - th - (h * 0.55 + tier * 2);
    // orbiting crystal & rings
    const cy = top - 8;
    glow(ctx, sx, cy, 12 + tier * 2, st.glowCol, 0.5);
    if (tier >= 4) { ctx.strokeStyle = rgbaOf('#c8e8ff', 0.85); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(sx, cy, 11 + tier, 3.5, -0.3, 0, TAU); ctx.stroke(); ctx.strokeStyle = rgbaOf(st.roof2, 0.8); ctx.beginPath(); ctx.ellipse(sx, cy, 8 + tier, 2.6, 0.5, 0, TAU); ctx.stroke(); }
    crystal(ctx, sx, cy + 4, 4, 8, '#b8a4ff', 0);
    if (tier >= 5) { crystal(ctx, sx - 12, cy + 6, 2.4, 5, '#8fe6ff', -0.4); crystal(ctx, sx + 12, cy + 2, 2.4, 5, '#8fe6ff', 0.4); }
    out.glows.push([sx, cy, 18 + tier * 2]);
    out.banners.push([sx + r * 1.25 + 1, sy - h - 1, 8]);
    out.top = cy - 14;
    return out;
  };
  LANDMARK.dark = function (ctx, sx, sy, w, d, tier, st, rng) {
    const p = originFor(sx, sy, w, d), h = 15 + tier * 3.5, out = { banners: [], glows: [] };
    const spk = (X, Z, hh, rr) => { const c = p(X, 0, Z); cylinder(ctx, c[0], c[1], rr, hh, st.wall, { top: false, courses: 3.5 }); windowAt(ctx, c[0] - 1, c[1] - hh * 0.6, 2, 3.4, st.glowCol, true); spire(ctx, c[0], c[1] - hh, rr + 1, hh * 0.9, st.roof, { finial: '#8a8a94' }); return c; };
    if (tier >= 3) { spk(w, d, h + 6 + tier * 2, 2.8); spk(0, d, h + 6 + tier * 2, 2.8); }
    box(ctx, p, w, d, h, st.wall, { top: false, courses: 3.2 });
    // buttress lines
    ctx.strokeStyle = 'rgba(20,15,30,0.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); const n = Math.round(w / 6); for (let i = 1; i < n; i++) { const a = p(w * i / n, 0.5, 0), b = p(w * i / n, h - 0.5, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    const rr = roofGableZ(ctx, p, w, d, h, h * 0.9, st.roof, { wall: st.wall, rows: 6 });
    // central spire
    const ch = tier >= 4 ? h * 0.8 + tier * 3 : 0;
    if (ch) { const c = p(w / 2, h + h * 0.9 * 0.5, d / 2); spire(ctx, c[0], c[1], 3.5, ch + 8, st.roof, { finial: '#8a8a94' }); out.top = c[1] - ch - 16; out.banners.push([c[0] + 5, c[1] - 2, 9]); out.glows.push([c[0], c[1] - ch - 8, 14]); glow(ctx, c[0], c[1] - ch - 8, 8, st.glowCol, 0.6); }
    else { out.top = rr.apexFront[1] - 14; out.banners.push([rr.apexFront[0] + 3, rr.apexFront[1] + 1, 9]); }
    // spikes along the ridge
    ctx.strokeStyle = '#8a8a94'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i <= 3; i++) { const t = i / 3, x = M.lerp(rr.ridge[0][0], rr.ridge[1][0], t), y = M.lerp(rr.ridge[0][1], rr.ridge[1][1], t); ctx.moveTo(x, y); ctx.lineTo(x, y - 3.5); } ctx.stroke();
    // great eye / rose window
    const eye = p(w / 2, h * 0.68, 0); glow(ctx, eye[0], eye[1], 7, st.glowCol, 0.7); circ(ctx, eye[0], eye[1], 3.2, '#1a1020', INK); circ(ctx, eye[0], eye[1], 2, st.glowCol); circ(ctx, eye[0], eye[1], 0.9, '#1a1020');
    windows(ctx, p, w, h * 0.5, 3, 1, st.glowCol, { arch: true, ww: 1.8, wh: 4 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 4.5, 7, '#161220', true, rgbaOf(st.glowCol, 0.6));
    // braziers with purple flame
    for (const X of [-3, w + 3]) { const c = p(X, 0, 0); ctx.fillStyle = '#3a3a44'; ctx.fillRect(c[0] - 1.5, c[1] - 4, 3, 4); glow(ctx, c[0], c[1] - 6, 5, st.glowCol, 0.7); poly(ctx, [[c[0] - 1.5, c[1] - 4], [c[0], c[1] - 8.5], [c[0] + 1.5, c[1] - 4]], lit(st.glowCol, 0.3)); }
    if (tier >= 2) { spk(w, 0, h + 3 + tier, 2.4); spk(0, 0, h + 3 + tier, 2.4); }
    return out;
  };
  LANDMARK.reaver = function (ctx, sx, sy, w, d, tier, st, rng) {
    const p = originFor(sx, sy, w, d), h = 12 + tier * 3, out = { banners: [], glows: [] };
    const stack = (X, Z, hh) => { const c = p(X, 0, Z); ctx.fillStyle = roundGrad(ctx, c[0] - 2, c[0] + 2, '#3a3a42'); ctx.fillRect(c[0] - 2, c[1] - hh, 4, hh); ctx.strokeStyle = INK; ctx.strokeRect(c[0] - 1.5, c[1] - hh + 0.5, 3, hh - 1); ctx.fillStyle = '#8a8a94'; ctx.fillRect(c[0] - 2.6, c[1] - hh, 5.2, 1.4); for (let i = 0; i < 4; i++) circ(ctx, c[0] + i * 1.8 + 1, c[1] - hh - 3 - i * 3.2, 2 + i, 'rgba(70,70,80,' + (0.45 - i * 0.09) + ')'); };
    if (tier >= 2) stack(w * 0.8, d * 0.85, h + 12 + tier * 2);
    if (tier >= 4) stack(w * 0.2, d * 0.85, h + 8 + tier * 2);
    // gun tower (back-left)
    if (tier >= 3) { const c = p(0, 0, d); cylinder(ctx, c[0], c[1], 3.4, h + 6, '#4a4a52', { courses: 3, crenel: true }); cannon(ctx, c[0], c[1] - h - 8, -0.35); }
    box(ctx, p, w, d, h, st.wall, { courses: 2.8, topColor: shd(st.wall, 0.15) });
    // iron plating band and rivets
    const a = p(0, h - 2, 0), b = p(w, h - 2, 0); line(ctx, a[0], a[1], b[0], b[1], '#8a8a94', 2);
    ctx.fillStyle = '#c8c8d0'; for (let i = 1; i < 6; i++) ctx.fillRect(M.lerp(a[0], b[0], i / 6) - 0.5, a[1] - 0.5, 1, 1);
    crenels(ctx, a[0], b[0], a[1] - 1.5, 2.6, 2.6, '#5a5a62');
    // cannons on the wall top
    for (let i = 0; i < Math.min(3, tier); i++) { const c = p(w * (0.25 + i * 0.25), h, 1); cannon(ctx, c[0], c[1] - 1, -0.25); }
    windows(ctx, p, w, h, 3, 1, '#ff9a3a', { ww: 2.2, wh: 2.2 });
    const dr = p(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 5.5, 7, '#2a2428', false, '#ff7a2a');
    // cage
    const cg = p(w + 3, 0, 1); ctx.strokeStyle = '#6a6a72'; ctx.lineWidth = 1; ctx.strokeRect(cg[0] - 2, cg[1] - 6, 4, 6); ctx.beginPath(); ctx.moveTo(cg[0] - 0.7, cg[1] - 6); ctx.lineTo(cg[0] - 0.7, cg[1]); ctx.moveTo(cg[0] + 0.7, cg[1] - 6); ctx.lineTo(cg[0] + 0.7, cg[1]); ctx.stroke();
    const t = p(w / 2, h, d / 2); out.banners.push([t[0], t[1] - 1, 10]); out.glows.push([dr[0], dr[1] - 3, 10]); out.top = t[1] - 18 - (tier >= 2 ? 10 : 0);
    return out;
  };
  function cannon(ctx, x, y, ang) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-2.5, -1, 5, 2.5); circ(ctx, -1.5, 1.6, 1.4, '#3a3028', INK2); circ(ctx, 1.5, 1.6, 1.4, '#3a3028', INK2);
    ctx.rotate(ang); ctx.fillStyle = Art.grad(ctx, 0, -1.5, 0, 1.5, [[0, '#8a8a94'], [1, '#2a2a32']]); ctx.fillRect(-2, -1.4, 8, 2.8); ctx.strokeStyle = INK; ctx.strokeRect(-1.5, -0.9, 7, 1.8);
    ctx.restore();
  }
  LANDMARK.primal = function (ctx, sx, sy, w, d, tier, st, rng) {
    const out = { banners: [], glows: [] };
    const r = Math.min(w, d) * 0.5 + 2, hh = 6 + tier * 1.5;
    contactShadow(ctx, sx, sy, r * 1.3, r * KZ * 1.3, 0.35);
    // beast totem behind
    const tx = sx + w * 0.5 + 4, ty = sy - d * 0.3 * KZ;
    beastTotem(ctx, tx, ty, 16 + tier * 3, st);
    cylinder(ctx, sx, sy, r, hh, st.plaster, { top: false, planks: 3.2 });
    cone(ctx, sx, sy - hh, r + 3, hh * 1.7 + tier, st.roof, { rows: 5 });
    // hide stripes on the roof
    ctx.fillStyle = 'rgba(230,220,195,0.35)'; ctx.beginPath(); ctx.moveTo(sx, sy - hh - hh * 1.7 - tier); ctx.lineTo(sx - 2.5, sy - hh); ctx.lineTo(sx + 2.5, sy - hh); ctx.closePath(); ctx.fill();
    // giant skull gate
    door(ctx, sx, sy, 5, hh * 0.95, st.trim, true, warm(st.glowCol, 0.4));
    const sk = [sx, sy - hh - 1];
    ell(ctx, sk[0], sk[1], 4.5, 3.4, '#efe6d2', INK); ctx.fillStyle = '#2a1c14'; ell(ctx, sk[0] - 1.7, sk[1] - 0.4, 1, 1.1, '#2a1c14'); ell(ctx, sk[0] + 1.7, sk[1] - 0.4, 1, 1.1, '#2a1c14');
    ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sk[0] - 4, sk[1] + 1); ctx.quadraticCurveTo(sk[0] - 7, sk[1] - 4, sk[0] - 5, sk[1] - 8); ctx.moveTo(sk[0] + 4, sk[1] + 1); ctx.quadraticCurveTo(sk[0] + 7, sk[1] - 4, sk[0] + 5, sk[1] - 8); ctx.stroke();
    // feathers and bone poles
    for (const dx of [-r - 2, r + 2]) { line(ctx, sx + dx, sy, sx + dx, sy - hh * 2, '#e6dcc2', 1.3); for (let i = 0; i < 3; i++) line(ctx, sx + dx, sy - hh * 2 + i * 3, sx + dx + (dx < 0 ? -3 : 3), sy - hh * 2 + i * 3 + 2, i % 2 ? '#c8402a' : '#3fb3b0', 1.4); }
    if (tier >= 4) { const f = [sx - r - 6, sy + 2]; fire(ctx, f[0], f[1], 2.5, 0); out.glows.push([f[0], f[1] - 3, 10]); }
    out.banners.push([sx + r + 5, sy - 2, 9]);
    out.top = ty - 16 - tier * 3 - 12;
    return out;
  };
  function beastTotem(ctx, x, y, h, st) {
    ctx.fillStyle = roundGrad(ctx, x - 3, x + 3, '#7a5a3a'); ctx.fillRect(x - 3, y - h, 6, h); ctx.strokeStyle = INK; ctx.strokeRect(x - 2.5, y - h + 0.5, 5, h - 1);
    // stacked faces
    for (let i = 0; i < 2; i++) { const yy = y - h * 0.35 - i * h * 0.35; ell(ctx, x, yy, 3.4, 2.4, i ? '#c8402a' : '#e8c357', INK2); ctx.fillStyle = '#2a1c14'; ctx.fillRect(x - 1.8, yy - 0.8, 1, 1); ctx.fillRect(x + 0.8, yy - 0.8, 1, 1); }
    // beast head with horns
    ell(ctx, x, y - h - 1, 5, 3.6, '#8a6a44', INK); ctx.fillStyle = st.glowCol; ell(ctx, x - 2, y - h - 1.4, 1, 0.9, st.glowCol); ell(ctx, x + 2, y - h - 1.4, 1, 0.9, st.glowCol);
    ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 4, y - h - 2); ctx.quadraticCurveTo(x - 8, y - h - 6, x - 5, y - h - 9); ctx.moveTo(x + 4, y - h - 2); ctx.quadraticCurveTo(x + 8, y - h - 6, x + 5, y - h - 9); ctx.stroke();
    // wings of feathers
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line(ctx, x + s * 3, y - h * 0.6 - i * 2, x + s * (7 + i), y - h * 0.6 - i * 2 - 2, i % 2 ? '#3fb3b0' : '#c8402a', 1.3);
  }
  LANDMARK.oathsworn = function (ctx, sx, sy, w, d, tier, st, rng) {
    const out = { banners: [], glows: [] };
    const tiers = Math.min(5, 2 + Math.floor(tier / 1.5));
    let bw = w, bd = d, y = 0, X = 0, Z = 0;
    const base = originFor(sx, sy, w, d);
    let topPt = null;
    for (let i = 0; i < tiers; i++) {
      const hh = 8 - i * 0.6;
      const p = (x, yy, z) => base(x + X, yy + y, z + Z);
      box(ctx, p, bw, bd, hh, st.plaster, { top: false });
      timberFrame(ctx, p, bw, hh, st.trim);
      // railing band
      const a = p(0, hh * 0.15, 0), b = p(bw, hh * 0.15, 0); line(ctx, a[0], a[1], b[0], b[1], st.trim, 1);
      windows(ctx, p, bw, hh, Math.max(1, Math.round(bw / 6)), 1, st.glowCol, { ww: 2, wh: 2.6 });
      if (i === 0) { const dr = p(bw * 0.5, 0, 0); door(ctx, dr[0], dr[1], 4, 6, st.trim, false, warm(st.glowCol, 0.4)); }
      const r = curvedRoof(ctx, p, bw, bd, hh, 3 + (i === tiers - 1 ? 5 : 0), i % 2 ? st.roof2 : st.roof, 3);
      topPt = [(r.ridge[0][0] + r.ridge[1][0]) / 2, r.ridge[0][1]];
      y += hh + 3; const nw = bw * 0.78, nd = bd * 0.78; X += (bw - nw) / 2; Z += (bd - nd) / 2; bw = nw; bd = nd;
    }
    // finial spire
    line(ctx, topPt[0], topPt[1], topPt[0], topPt[1] - 7, '#e8c357', 1.6); circ(ctx, topPt[0], topPt[1] - 7.5, 1.6, '#f5e7a8', INK2);
    // gate (torii) in front-left and lanterns
    const g = base(-8, 0, -2); gate(ctx, g[0], g[1], 9, 9, st.roof2);
    const l1 = base(w + 3, 0, -1); lantern(ctx, l1[0], l1[1], 5);
    if (tier >= 3) { const b2 = base(w + 6, 0, d * 0.6); bell(ctx, b2[0], b2[1], 7); }
    out.banners.push([topPt[0] + 4, topPt[1] + 2, 9]); out.glows.push([topPt[0], topPt[1] - 8, 10 + tier * 2]);
    out.top = topPt[1] - 18;
    return out;
  };
  function gate(ctx, x, y, w, h, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y - h); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - w / 2 - 2, y - h + 0.5); ctx.quadraticCurveTo(x, y - h - 1.5, x + w / 2 + 2, y - h + 0.5); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - w / 2 - 0.5, y - h + 3); ctx.lineTo(x + w / 2 + 0.5, y - h + 3); ctx.stroke();
    ctx.strokeStyle = INK2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w / 2 - 2, y - h + 1.5); ctx.quadraticCurveTo(x, y - h - 0.5, x + w / 2 + 2, y - h + 1.5); ctx.stroke();
  }
  function bell(ctx, x, y, h) {
    ctx.strokeStyle = '#5a3b23'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 4, y - h); ctx.lineTo(x + 4, y - h); ctx.lineTo(x + 4, y); ctx.stroke();
    poly(ctx, [[x - 6, y - h], [x, y - h - 3], [x + 6, y - h]], '#3f8f6e', INK);
    ctx.beginPath(); ctx.moveTo(x - 2.4, y - 1.5); ctx.quadraticCurveTo(x - 2.6, y - h + 1.5, x, y - h + 1); ctx.quadraticCurveTo(x + 2.6, y - h + 1.5, x + 2.4, y - 1.5); ctx.closePath();
    fillPath(ctx, Art.grad(ctx, x - 3, 0, x + 3, 0, [[0, '#f5d98a'], [0.5, '#c89b3c'], [1, '#7a5a1e']]), INK);
  }
  LANDMARK.architect = function (ctx, sx, sy, w, d, tier, st, rng) {
    const p = originFor(sx, sy, w, d), h = 12 + tier * 2.5, out = { banners: [], glows: [] };
    // stepped plinth
    const pl = (X, Y, Z) => p(X - 3, Y, Z - 3);
    box(ctx, pl, w + 6, d + 6, 2.5, st.wall, { topColor: lit(st.wall, 0.2) });
    const p2 = (X, Y, Z) => p(X, Y + 2.5, Z);
    // obelisks at the back
    if (tier >= 3) for (const X of [-2, w + 2]) { const c = p2(X, 0, d + 2); obelisk(ctx, c[0], c[1], 2.2, h + 8 + tier * 2, st.wall, st.glowCol); }
    box(ctx, p2, w, d, h, st.wall, { top: false });
    // colonnade
    ctx.lineCap = 'butt';
    const n = Math.max(3, Math.round(w / 4));
    for (let i = 0; i <= n; i++) { const a = p2(w * i / n, 0.5, 0), b = p2(w * i / n, h - 0.5, 0); line(ctx, a[0] + 0.7, a[1], b[0] + 0.7, b[1], 'rgba(20,15,30,0.28)', 1.2); line(ctx, a[0] - 0.5, a[1], b[0] - 0.5, b[1], lit(st.wall, 0.6), 1.2); }
    // entablature + pediment
    const a = p2(0, h, 0), b = p2(w, h, 0); line(ctx, a[0], a[1] - 0.5, b[0], b[1] - 0.5, st.trim, 1.2);
    if (tier >= 3) {
      roofFlat(ctx, p2, w, d, h, st.wall, { parapet: 1.5 });
      const c = p2(w / 2, h + 1.5, d / 2), rr = Math.min(w, d) * 0.45;
      cylinder(ctx, c[0], c[1], rr * 0.85, 3 + tier, st.wall, { top: false });
      dome(ctx, c[0], c[1] - 3 - tier, rr, rr * 0.8, st.roof, { ribs: 6, finial: '#f5e7a8' });
      const top = c[1] - 3 - tier - rr * 0.8;
      // brass astrolabe rings
      if (tier >= 4) { astrolabe(ctx, c[0], top - 8, 7 + tier, st.trim); out.glows.push([c[0], top - 8, 16]); glow(ctx, c[0], top - 8, 10, st.glowCol, 0.45); }
      out.top = top - 20; out.banners.push([c[0] + rr + 2, c[1], 9]);
    } else {
      const r = roofGableZ(ctx, p2, w, d, h, h * 0.35, st.roof, { wall: st.wall, ov: 2.5, rows: 3 });
      out.top = r.apexFront[1] - 12; out.banners.push([r.ridge[0][0] + 3, r.ridge[0][1] + 1, 9]);
    }
    const dr = p2(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 4.5, 7, '#8a6a3a', false, st.glowCol);
    return out;
  };
  function obelisk(ctx, x, y, r, h, col, glowCol) {
    poly(ctx, [[x - r, y], [x - r * 0.6, y - h], [x, y - h - r * 1.6], [x + r * 0.6, y - h], [x + r, y]], Art.grad(ctx, x - r, 0, x + r, 0, [[0, lit(col, 0.4)], [0.5, col], [1, shd(col, 0.45)]]), INK);
    line(ctx, x, y - h - r * 1.6, x, y - h * 0.2, 'rgba(20,15,30,0.25)', 1);
    if (glowCol) { glow(ctx, x, y - h - r * 1.6, 4, glowCol, 0.7); circ(ctx, x, y - h - r * 1.6, 1.2, lit(glowCol, 0.6)); }
  }
  function astrolabe(ctx, x, y, r, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = lit(col, 0.4); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r * 0.8, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.95, 0.6, 0, TAU); ctx.stroke();
    circ(ctx, x, y, r * 0.2, '#f5e7a8', INK2);
  }
  LANDMARK.nomad = function (ctx, sx, sy, w, d, tier, st, rng) {
    const out = { banners: [], glows: [] };
    if (tier >= 3) { // wagon palace: big box on wheels with layered awnings
      const p = originFor(sx, sy, w, d), h = 9 + tier * 2;
      const pw = (X, Y, Z) => p(X, Y + 3, Z);
      // wheels
      for (const [X, Z] of [[w * 0.2, 0], [w * 0.8, 0]]) { const c = p(X, 0, Z); circ(ctx, c[0], c[1] - 1, 3.6, '#5a3b23', INK); circ(ctx, c[0], c[1] - 1, 1.4, '#c8a070', INK2); }
      box(ctx, pw, w, d, h, st.wall, { top: false, planks: 3.5 });
      roofFlat(ctx, pw, w, d, h, st.wall, { parapet: 1 });
      // tiered cloth pavilion on top
      const c = pw(w / 2, h + 1, d / 2), r = Math.min(w, d) * 0.45;
      cylinder(ctx, c[0], c[1], r * 0.8, 4 + tier, st.plaster, { top: false });
      cone(ctx, c[0], c[1] - 4 - tier, r + 1, 7 + tier * 2, st.roof, { rows: 3, finial: '#e8c357' });
      // stripes
      ctx.strokeStyle = 'rgba(255,245,225,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(c[0], c[1] - 4 - tier - 7 - tier * 2); ctx.lineTo(c[0] + i * r * 0.45, c[1] - 4 - tier); } ctx.stroke();
      // awnings on the front
      const aw = (X0, X1, col) => { const a = pw(X0, h * 0.55, 0), b = pw(X1, h * 0.55, 0); poly(ctx, [[a[0], a[1] - 2.5], [b[0], b[1] - 2.5], [b[0] + 2.5, b[1] + 2.5], [a[0] - 2.5, a[1] + 2.5]], col, INK); };
      aw(w * 0.05, w * 0.45, st.roof2); aw(w * 0.55, w * 0.95, st.roof);
      windows(ctx, pw, w, h, 3, 1, st.glowCol, { ww: 2.2, wh: 2.4, arch: true });
      const dr = pw(w * 0.5, 0, 0); door(ctx, dr[0], dr[1], 4, 6, st.trim, true, warm(st.glowCol, 0.5));
      const top = c[1] - 4 - tier - 7 - tier * 2;
      out.banners.push([c[0], top + 1, 10]); out.glows.push([c[0], top - 2, 10 + tier]); out.top = top - 16;
      // palms
      const pl = p(w + 6, 0, d * 0.5); palm(ctx, pl[0], pl[1], 14 + tier * 2);
      const pl2 = p(-6, 0, d * 0.7); palm(ctx, pl2[0], pl2[1], 12 + tier);
    } else { // great pavilion
      const r = Math.max(w, d) * 0.55, hh = 12 + tier * 3;
      contactShadow(ctx, sx, sy, r * 1.3, r * KZ * 1.3, 0.35);
      cylinder(ctx, sx, sy, r, 4, st.plaster, { top: false });
      cone(ctx, sx, sy - 4, r + 2, hh, st.roof, { rows: 3, finial: '#e8c357' });
      ctx.strokeStyle = 'rgba(255,245,225,0.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(sx, sy - 4 - hh); ctx.lineTo(sx + i * r * 0.5, sy - 4); } ctx.stroke();
      door(ctx, sx, sy, 4, 5, st.trim, true, warm(st.glowCol, 0.4));
      const pl = [sx + r + 5, sy + 2]; palm(ctx, pl[0], pl[1], 13 + tier * 2);
      out.banners.push([sx, sy - 4 - hh + 1, 9]); out.top = sy - 4 - hh - 14;
    }
    return out;
  };

  // ================================================================ temples per style (tier >= 3)
  const TEMPLE = {};
  TEMPLE.feudal = function (ctx, sx, sy, w, d, st, rng) {
    const p = originFor(sx, sy, w, d), h = 10;
    box(ctx, p, w, d, h, st.wall, { top: false, courses: 3 });
    roofGableZ(ctx, p, w, d, h, 7, st.roof2, { wall: st.wall, rows: 4 });
    windows(ctx, p, w, h, 2, 1, st.glowCol, { arch: true, ww: 2, wh: 4 });
    const dr = p(w / 2, 0, 0); door(ctx, dr[0], dr[1], 3.2, 5, st.trim, true);
    const t = p(w * 0.5, h + 3.5, d * 0.85); cylinder(ctx, t[0], t[1], 2.2, 7, st.wall, { top: false }); spire(ctx, t[0], t[1] - 7, 3, 9, st.roof2, { finial: '#e8c357' });
  };
  TEMPLE.high = function (ctx, sx, sy, w, d, st, rng) {
    const p = originFor(sx, sy, w, d), h = 9;
    box(ctx, p, w, d, h, st.wall, { top: false });
    roofFlat(ctx, p, w, d, h, st.wall, { parapet: 1.5 });
    const c = p(w / 2, h + 1.5, d / 2); dome(ctx, c[0], c[1], w * 0.4, w * 0.36, st.roof, { ribs: 5 });
    // sun disk
    glow(ctx, c[0], c[1] - w * 0.36 - 5, 7, '#fff0b0', 0.6); circ(ctx, c[0], c[1] - w * 0.36 - 5, 2.6, '#f5d76e', INK2);
    windows(ctx, p, w, h, 3, 1, st.glowCol, { arch: true, ww: 1.8, wh: 3.6 });
  };
  TEMPLE.barbarian = function (ctx, sx, sy, w, d, st, rng) {
    // stone circle with totems and a fire
    contactShadow(ctx, sx, sy, w * 0.7, w * 0.3, 0.3);
    for (let i = 0; i < 5; i++) { const a = Math.PI * 0.15 + i * Math.PI * 0.7 / 4; rock(ctx, sx + Math.cos(a) * w * 0.55, sy - Math.sin(a) * w * 0.28, 3, '#8a8078', i + 3); }
    fire(ctx, sx, sy - 1, 2.6, 0);
    totem(ctx, sx - w * 0.55, sy + 2, 12, st); totem(ctx, sx + w * 0.55, sy + 2, 10, st);
  };
  TEMPLE.industrious = function (ctx, sx, sy, w, d, st, rng) {
    const p = originFor(sx, sy, w, d), h = 10;
    box(ctx, p, w, d, h, st.wall, { top: false, courses: 3.2 });
    roofHip(ctx, p, w, d, h, 5, st.roof, { rows: 3 });
    const c = p(w / 2, h + 5, d / 2); gear(ctx, c[0], c[1] - 3, 3.5, st.trim);
    windows(ctx, p, w, h, 2, 1, '#ff9a3a', {});
    const dr = p(w / 2, 0, 0); door(ctx, dr[0], dr[1], 3.5, 5, '#3a3028', true, '#ff7a2a');
  };
  TEMPLE.mystic = function (ctx, sx, sy, w, d, st, rng) {
    const r = w * 0.42;
    contactShadow(ctx, sx, sy, r * 1.3, r * KZ * 1.3, 0.3);
    cylinder(ctx, sx, sy, r, 9, st.wall, { top: false, courses: 3 });
    dome(ctx, sx, sy - 9, r + 1, r * 0.85, st.roof2, { ribs: 4 });
    // observatory slit + orb
    ctx.fillStyle = '#20243a'; ctx.fillRect(sx - 1, sy - 9 - r * 0.85 + 1, 2, r * 0.7);
    glow(ctx, sx, sy - 9 - r * 0.85 - 3, 6, st.glowCol, 0.7); circ(ctx, sx, sy - 9 - r * 0.85 - 3, 2, lit(st.glowCol, 0.4), INK2);
    windowAt(ctx, sx - 1.2, sy - 6.5, 2.4, 3.2, st.glowCol, true);
  };
  TEMPLE.dark = function (ctx, sx, sy, w, d, st, rng) {
    const p = originFor(sx, sy, w * 0.8, d), h = 12;
    box(ctx, p, w * 0.8, d, h, st.wall, { top: false, courses: 3 });
    const r = roofGableZ(ctx, p, w * 0.8, d, h, 11, st.roof, { wall: st.wall, rows: 5 });
    line(ctx, r.apexFront[0], r.apexFront[1], r.apexFront[0], r.apexFront[1] - 5, '#8a8a94', 1.2);
    windows(ctx, p, w * 0.8, h, 1, 1, st.glowCol, { arch: true, ww: 2.4, wh: 5 });
    const dr = p(w * 0.4, 0, 0); door(ctx, dr[0], dr[1], 3.2, 5, '#161220', true);
    // veiled statue
    const s = p(-3, 0, 1); poly(ctx, [[s[0] - 2, s[1]], [s[0] - 1.5, s[1] - 7], [s[0], s[1] - 9], [s[0] + 1.5, s[1] - 7], [s[0] + 2, s[1]]], '#5a5566', INK);
  };
  TEMPLE.reaver = function (ctx, sx, sy, w, d, st, rng) {
    const r = w * 0.35;
    contactShadow(ctx, sx, sy, r * 1.4, r * KZ * 1.4, 0.3);
    cylinder(ctx, sx, sy, r, 13, '#4a4a52', { courses: 3, crenel: true });
    cannon(ctx, sx - 1, sy - 15, -0.3);
    windowAt(ctx, sx - 1.2, sy - 8, 2.4, 2.4, '#ff9a3a');
  };
  TEMPLE.primal = function (ctx, sx, sy, w, d, st, rng) {
    contactShadow(ctx, sx, sy, w * 0.6, w * 0.25, 0.3);
    // ring of bone poles around a great skull
    for (let i = 0; i < 4; i++) { const x = sx - w * 0.5 + i * w / 3; line(ctx, x, sy + 2, x, sy - 9 - (i % 2) * 3, '#e6dcc2', 1.4); line(ctx, x, sy - 9 - (i % 2) * 3, x + 3, sy - 8 - (i % 2) * 3, i % 2 ? '#c8402a' : '#3fb3b0', 1.4); }
    ell(ctx, sx, sy - 4, 6, 4.5, '#efe6d2', INK); ctx.fillStyle = '#2a1c14'; ell(ctx, sx - 2.2, sy - 4.5, 1.3, 1.5, '#2a1c14'); ell(ctx, sx + 2.2, sy - 4.5, 1.3, 1.5, '#2a1c14');
    ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx - 5, sy - 3); ctx.quadraticCurveTo(sx - 9, sy - 8, sx - 6, sy - 13); ctx.moveTo(sx + 5, sy - 3); ctx.quadraticCurveTo(sx + 9, sy - 8, sx + 6, sy - 13); ctx.stroke();
  };
  TEMPLE.oathsworn = function (ctx, sx, sy, w, d, st, rng) {
    const p = originFor(sx, sy, w, d), h = 8;
    box(ctx, p, w, d, h, st.plaster, { top: false }); timberFrame(ctx, p, w, h, st.trim);
    curvedRoof(ctx, p, w, d, h, 6, st.roof2, 3);
    const dr = p(w / 2, 0, 0); door(ctx, dr[0], dr[1], 3.5, 5, st.trim, false, warm(st.glowCol, 0.4));
    const g = p(w / 2, 0, -6); gate(ctx, g[0], g[1], 8, 8, st.roof2);
    const l = p(w + 3, 0, 0); lantern(ctx, l[0], l[1], 4);
  };
  TEMPLE.architect = function (ctx, sx, sy, w, d, st, rng) {
    const r = w * 0.4;
    contactShadow(ctx, sx, sy, r * 1.5, r * KZ * 1.5, 0.3);
    ell(ctx, sx, sy, r + 2, (r + 2) * KZ, lit(st.wall, 0.2), INK);
    // round colonnade
    for (let i = 0; i < 7; i++) { const a = Math.PI * 0.1 + i * Math.PI * 0.8 / 6; const x = sx - Math.cos(a) * r, y = sy + Math.sin(a) * r * KZ; line(ctx, x, y, x, y - 9, lit(st.wall, 0.5), 1.8); line(ctx, x + 0.9, y, x + 0.9, y - 9, 'rgba(20,15,30,0.3)', 1); }
    dome(ctx, sx, sy - 9 - r * KZ * 0.4, r + 1.5, r * 0.8, st.roof, { ribs: 6, finial: '#f5e7a8' });
    astrolabe(ctx, sx, sy - 9 - r * KZ * 0.4 - r * 0.8 - 5, 4, st.trim);
  };
  TEMPLE.nomad = function (ctx, sx, sy, w, d, st, rng) {
    const r = w * 0.45;
    contactShadow(ctx, sx, sy, r * 1.3, r * KZ * 1.3, 0.3);
    cylinder(ctx, sx, sy, r, 3, st.plaster, { top: false });
    cone(ctx, sx, sy - 3, r + 2, 9, st.roof2, { rows: 3, finial: '#e8c357' });
    ctx.strokeStyle = 'rgba(255,245,225,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(sx, sy - 12); ctx.lineTo(sx + i * r * 0.5, sy - 3); } ctx.stroke();
    door(ctx, sx, sy, 3.5, 3.5, st.trim, true, warm(st.glowCol, 0.4));
    palm(ctx, sx + r + 3, sy + 2, 12);
  };

  // ================================================================ decorations
  function decor(ctx, kind, x, y, st, rng, frame) {
    switch (kind) {
      case 'tree': tree(ctx, x, y, 3 + rng.next() * 1.5, st.id === 'dark' ? '#3a3a52' : st.id === 'high' ? '#5aa070' : '#4d8a3a'); break;
      case 'pine': pineTree(ctx, x, y, 3.5); break;
      case 'palm': palm(ctx, x, y, 9); break;
      case 'well': ell(ctx, x, y, 3, 1.4, '#6a625a', INK); cylinder(ctx, x, y, 2.6, 2.5, st.wall, { top: false }); ell(ctx, x, y - 2.5, 2.6, 1.1, '#20242e', INK2); line(ctx, x - 2, y - 2.5, x - 2, y - 7, '#5a3b23', 1); line(ctx, x + 2, y - 2.5, x + 2, y - 7, '#5a3b23', 1); poly(ctx, [[x - 3.5, y - 6.5], [x, y - 9], [x + 3.5, y - 6.5]], st.roof, INK); break;
      case 'hay': ell(ctx, x, y, 2.6, 2.2, Art.rgrad(ctx, x - 1, y - 1, 0, 3, [[0, '#f0d98a'], [1, '#b9963e']]), INK2); break;
      case 'crates': ctx.fillStyle = '#9a7a4a'; ctx.fillRect(x - 2.5, y - 3, 3, 3); ctx.fillRect(x + 0.5, y - 2.5, 2.5, 2.5); ctx.fillRect(x - 1.5, y - 5.5, 2.6, 2.6); ctx.strokeStyle = INK2; ctx.strokeRect(x - 2, y - 2.5, 2, 2); ctx.strokeRect(x - 1, y - 5, 1.6, 1.6); break;
      case 'stall': { const c = rng.chance(0.5) ? st.roof : st.roof2; ctx.fillStyle = '#7a5a34'; ctx.fillRect(x - 3, y - 3, 6, 3); poly(ctx, [[x - 4, y - 3], [x + 4, y - 3], [x + 3, y - 6], [x - 3, y - 6]], c, INK); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 1, y - 6, 1, 3); ctx.fillRect(x + 1.5, y - 6, 1, 3); break; }
      case 'fire': fire(ctx, x, y, 2, frame); break;
      case 'campfire': fire(ctx, x, y, 2.4, frame); break;
      case 'rock': rock(ctx, x, y, 2.5 + rng.next() * 1.5, null, rng.int(1, 99)); break;
      case 'crystal': glow(ctx, x, y - 2, 5, st.glowCol, 0.5); crystal(ctx, x, y, 2.2, 5, '#9fe0ff', (rng.next() - 0.5) * 0.6); break;
      case 'statue': poly(ctx, [[x - 2, y], [x + 2, y], [x + 1.5, y - 2], [x - 1.5, y - 2]], lit(st.wall, 0.2), INK); poly(ctx, [[x - 1.2, y - 2], [x - 0.8, y - 7], [x, y - 8], [x + 0.8, y - 7], [x + 1.2, y - 2]], lit(st.wall, 0.4), INK); circ(ctx, x, y - 8.5, 1.1, lit(st.wall, 0.5), INK2); break;
      case 'lantern': lantern(ctx, x, y, 4); break;
      case 'totem': totem(ctx, x, y, 9, st); break;
      case 'skull': circ(ctx, x, y - 1.5, 1.6, '#e8dcc2', INK2); line(ctx, x, y, x, y - 6, '#e6dcc2', 1); break;
      case 'barrel': ctx.fillStyle = roundGrad(ctx, x - 1.8, x + 1.8, '#8a6a44'); ctx.fillRect(x - 1.8, y - 4, 3.6, 4); ctx.strokeStyle = INK2; ctx.strokeRect(x - 1.3, y - 3.5, 2.6, 3); ctx.fillStyle = '#5a5a62'; ctx.fillRect(x - 1.8, y - 3.2, 3.6, 0.8); break;
      case 'anvil': ctx.fillStyle = '#3a3a42'; ctx.fillRect(x - 1.5, y - 2, 3, 2); ctx.fillRect(x - 3, y - 3.6, 6, 1.6); glow(ctx, x + 2, y - 3, 3, '#ff9a3a', 0.5); break;
      case 'camel': ell(ctx, x, y - 3, 3.2, 1.8, '#c8a070', INK); circ(ctx, x - 0.8, y - 5.2, 1.3, '#c8a070', INK2); circ(ctx, x + 2.6, y - 4.6, 1, '#c8a070', INK2); line(ctx, x - 2, y - 1.5, x - 2, y, '#8a6a44', 1); line(ctx, x + 2, y - 1.5, x + 2, y, '#8a6a44', 1); break;
      case 'bones': line(ctx, x - 3, y - 1, x + 3, y - 2, '#e6dcc2', 1.4); line(ctx, x - 2, y - 3, x + 2, y, '#e6dcc2', 1.2); break;
      case 'pipe': ctx.fillStyle = '#5a5a62'; ctx.fillRect(x - 1.2, y - 6, 2.4, 6); circ(ctx, x, y - 6.5, 1.6, '#6a6a72', INK2); circ(ctx, x + 1, y - 9, 1.6, 'rgba(200,200,210,0.35)'); break;
      default: break;
    }
  }
  const DECOR_SETS = {
    feudal: ['tree', 'tree', 'well', 'hay', 'hay', 'stall', 'crates'], high: ['tree', 'statue', 'statue', 'crystal', 'tree'], barbarian: ['fire', 'totem', 'skull', 'hay', 'pine', 'bones'],
    industrious: ['barrel', 'anvil', 'crates', 'pipe', 'rock'], mystic: ['crystal', 'crystal', 'statue', 'tree'], dark: ['tree', 'statue', 'skull', 'rock'],
    reaver: ['crates', 'barrel', 'pipe', 'pipe'], primal: ['totem', 'skull', 'fire', 'pine', 'bones', 'hay'], oathsworn: ['lantern', 'lantern', 'tree', 'rock', 'stall'],
    architect: ['statue', 'statue', 'tree', 'crates'], nomad: ['camel', 'palm', 'palm', 'crates', 'barrel', 'stall'],
  };

  // ================================================================ city layout & composition
  const TIERS = [
    { rx: 20, rz: 14, n: 0, hw: [9, 11] },
    { rx: 28, rz: 20, n: 3, hw: [9, 12] },
    { rx: 36, rz: 26, n: 5, hw: [9, 13] },
    { rx: 44, rz: 31, n: 7, hw: [9, 13] },
    { rx: 53, rz: 37, n: 10, hw: [10, 14] },
    { rx: 62, rz: 43, n: 13, hw: [10, 14] },
  ];
  const HEAD = [58, 74, 90, 106, 126, 142];   // vertical room above the footprint centre per tier
  function citySize(tier) {
    const T = TIERS[tier];
    const w = Math.ceil(2 * (T.rx + 12) + 2 * T.rz * KX + 8), h = Math.ceil(HEAD[tier] + (T.rz + 12) * KZ + 8);
    return { w, h, cx: w / 2 - T.rz * KX * 0.5, cy: HEAD[tier] };
  }
  /** deterministic layout: returns list of placed items (ground coords) */
  function cityLayout(style, tier, seed) {
    const T = TIERS[tier], rng = new AOW.RNG(seed * 7 + tier * 131);
    const items = [];
    const overlaps = (X, Z, w, d) => items.some(it => Math.abs(it.X - X) < (it.w + w) / 2 + 2.5 && Math.abs(it.Z - Z) < (it.d + d) / 2 + 2.5);
    const inside = (X, Z, w, d) => { const k = 0.86; return ((X - w / 2) / (T.rx * k)) ** 2 + ((Z) / (T.rz * k)) ** 2 < 1 && ((X + w / 2) / (T.rx * k)) ** 2 + ((Z) / (T.rz * k)) ** 2 < 1 && Math.abs(Z + d / 2) < T.rz * k && Math.abs(Z - d / 2) < T.rz * k; };
    let lm = null;
    if (tier >= 1) {
      const lw = 22 + tier * 4, ld = 13 + tier * 2;
      lm = { kind: 'landmark', X: 0, Z: T.rz * 0.32, w: lw, d: ld, seed: rng.int(1, 1e6) };
      items.push(lm);
      if (tier >= 3) items.push({ kind: 'temple', X: -T.rx * 0.5, Z: T.rz * 0.05, w: 15, d: 11, seed: rng.int(1, 1e6) });
    } else {
      items.push({ kind: 'camp', X: 0, Z: T.rz * 0.2, w: 14, d: 11, seed: rng.int(1, 1e6) });
    }
    const plaza = (X, Z, w, d) => lm && Math.abs(X) < 7 + w / 2 && Z < lm.Z - lm.d / 2 && Z > -T.rz * 0.35;
    let placed = 0, tries = 0;
    while (placed < T.n && tries < 400) {
      tries++;
      const w = rng.float(T.hw[0], T.hw[1]), d = rng.float(7.5, 10.5);
      const a = rng.next() * TAU, r = Math.sqrt(rng.next());
      const X = Math.cos(a) * r * T.rx * 0.82, Z = Math.sin(a) * r * T.rz * 0.82;
      if (!inside(X, Z, w, d) || overlaps(X, Z, w, d) || plaza(X, Z, w, d)) continue;
      items.push({ kind: 'house', X, Z, w, d, h: rng.float(7, 9.5), seed: rng.int(1, 1e6), type: null });
      placed++;
    }
    const nd = tier === 0 ? 3 : 2 + tier;
    const set = DECOR_SETS[style] || DECOR_SETS.feudal;
    for (let i = 0, t2 = 0; i < nd && t2 < 120; t2++) {
      const a = rng.next() * TAU, r = Math.sqrt(rng.next());
      const X = Math.cos(a) * r * T.rx * 0.9, Z = Math.sin(a) * r * T.rz * 0.9;
      if (!inside(X, Z, 5, 4) || overlaps(X, Z, 5, 4)) continue;
      items.push({ kind: 'decor', X, Z, w: 5, d: 4, type: set[i % set.length], seed: rng.int(1, 1e6) });
      i++;
    }
    items.sort((a, b) => b.Z - a.Z);
    return items;
  }

  /** wall ring around the footprint. half: 'back' | 'front' */
  function wallRing(ctx, cx, cy, rx, rz, walls, st, half, tier, rng) {
    const kind = st.wallKind === 'palisade' ? 'palisade' : walls >= 2 ? st.wallKind : 'palisade';
    const h = kind === 'palisade' ? 7 + walls * 1.5 : walls >= 3 ? 13 : 10;
    const t0 = half === 'back' ? 0 : Math.PI, t1 = t0 + Math.PI;
    const N = 26, gnd = [], top = [];
    for (let i = 0; i <= N; i++) {
      const t = t0 + (t1 - t0) * i / N;
      const X = rx * Math.cos(t), Z = rz * Math.sin(t);
      gnd.push([cx + X + Z * KX, cy - Z * KZ]); top.push([cx + X + Z * KX, cy - Z * KZ - h]);
    }
    let col = kind === 'palisade' ? '#8a6a44' : kind === 'marble' ? '#e8e0d0' : kind === 'iron' ? '#4a4a54' : kind === 'sand' ? '#d2b07a' : st.wall;
    if (st.id === 'dark' && kind !== 'palisade') col = '#3a3542';
    const isBack = half === 'back';
    const face = gnd.concat(top.slice().reverse());
    // face
    ctx.beginPath(); face.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
    ctx.fillStyle = isBack ? shd(col, 0.35) : Art.grad(ctx, gnd[0][0], 0, gnd[N][0], 0, [[0, lit(col, 0.22)], [0.5, col], [1, shd(col, 0.32)]]);
    ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    if (kind === 'palisade') {
      ctx.strokeStyle = 'rgba(40,25,15,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= N; i++) { if (i % 1 === 0) { ctx.moveTo(gnd[i][0], gnd[i][1]); ctx.lineTo(top[i][0], top[i][1]); } }
      ctx.stroke();
      // pointed tips
      ctx.fillStyle = lit(col, 0.25); for (let i = 0; i <= N; i += 1) { poly(ctx, [[top[i][0] - 1.6, top[i][1] + 0.5], [top[i][0], top[i][1] - 2.2], [top[i][0] + 1.6, top[i][1] + 0.5]], lit(col, isBack ? 0 : 0.3)); }
    } else {
      // masonry courses following the curve
      ctx.strokeStyle = 'rgba(20,15,30,0.14)'; ctx.lineWidth = 1;
      for (let k = 3; k < h - 1.5; k += 3) { ctx.beginPath(); for (let i = 0; i <= N; i++) { const x = gnd[i][0], y = gnd[i][1] - k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      // walkway
      ctx.strokeStyle = lit(col, isBack ? 0.15 : 0.35); ctx.lineWidth = 2; ctx.beginPath(); top.forEach((q, i) => i ? ctx.lineTo(q[0], q[1] - 0.5) : ctx.moveTo(q[0], q[1] - 0.5)); ctx.stroke();
      // merlons
      for (let i = 0; i <= N; i += 2) { const q = top[i]; ctx.fillStyle = lit(col, isBack ? 0.05 : 0.25); ctx.fillRect(q[0] - 1.2, q[1] - 2.6, 2.4, 2.6); ctx.strokeStyle = INK2; ctx.strokeRect(q[0] - 0.7, q[1] - 2.1, 1.4, 1.6); }
      if (kind === 'iron') { ctx.strokeStyle = '#8a8a94'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < N; i += 2) { ctx.moveTo(top[i][0], top[i][1]); ctx.lineTo(top[i][0], top[i][1] - 3.5); } ctx.stroke(); }
    }
    // towers at the ring quarters
    const towerAt = (t, big) => {
      const X = rx * Math.cos(t), Z = rz * Math.sin(t), x = cx + X + Z * KX, y = cy - Z * KZ, r = big ? 4.2 : 3.2, th = h + (big ? 7 : 4);
      if (kind === 'palisade') { cylinder(ctx, x, y, r * 0.8, th, col, { top: false, planks: 2 }); poly(ctx, [[x - r - 1, y - th], [x + r + 1, y - th], [x + r + 1, y - th - 3], [x - r - 1, y - th - 3]], shd(col, 0.1), INK); cone(ctx, x, y - th - 3, r + 1.5, 4, st.roof, { rows: 2 }); }
      else { cylinder(ctx, x, y, r, th, col, { courses: 3, crenel: st.id !== 'high' && st.id !== 'mystic' }); if (st.id === 'high') dome(ctx, x, y - th, r + 0.5, r * 0.8, st.roof2, { finial: '#f5e7a8' }); else if (st.id === 'mystic' || st.id === 'dark') cone(ctx, x, y - th, r + 1, r * 2.4, st.roof, { rows: 3 }); else if (st.id === 'feudal' && walls >= 3) cone(ctx, x, y - th, r + 1, r * 2.2, st.keepRoof || st.roof, { rows: 3 }); }
    };
    if (isBack) { if (tier >= 3 || walls >= 2) { towerAt(Math.PI * 0.5, false); } if (walls >= 3) { towerAt(Math.PI * 0.15, false); towerAt(Math.PI * 0.85, false); } }
    else {
      towerAt(Math.PI * 1.2, walls >= 2); towerAt(Math.PI * 1.8, walls >= 2);
      // gate at the front centre
      const gx = cx, gy = cy + rz * KZ;
      if (kind === 'palisade') { ctx.fillStyle = '#5a3b23'; ctx.fillRect(gx - 4, gy - h + 1, 8, h - 1); ctx.fillStyle = shd('#5a3b23', 0.5); ctx.fillRect(gx - 2.5, gy - h + 3, 5, h - 3); ctx.strokeStyle = INK; ctx.strokeRect(gx - 4, gy - h + 1, 8, h - 1); }
      else { ctx.fillStyle = shd(col, 0.1); ctx.fillRect(gx - 5.5, gy - h - 3, 11, h + 3); ctx.strokeStyle = INK; ctx.strokeRect(gx - 5.5, gy - h - 3, 11, h + 3); crenels(ctx, gx - 5.5, gx + 5.5, gy - h - 3, 2, 2.4, col); door(ctx, gx, gy, 5, h - 2, '#3a2a1a', true); ctx.strokeStyle = 'rgba(20,15,30,0.4)'; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(gx + i * 1.5, gy); ctx.lineTo(gx + i * 1.5, gy - h + 4); } ctx.stroke(); }
    }
  }

  function drawCitySprite(ctx, W, H, q) {
    const t0 = performance.now();
    const st = styleWith(q.s, q.pal), tier = q.t, T = TIERS[tier], sz = citySize(tier);
    const cx = sz.cx, cy = sz.cy, rng = new AOW.RNG(q.seed);
    const items = cityLayout(q.s, tier, q.seed);
    // ground plate
    const gr = st.ground;
    contactShadow(ctx, cx, cy + 2, T.rx + 10, (T.rz + 8) * KZ + 2, 0.3);
    ell(ctx, cx + T.rz * KX * 0.5, cy, T.rx + 8, (T.rz + 7) * KZ, Art.rgrad(ctx, cx, cy, 0, T.rx + 8, [[0, rgbaOf(gr, 0.85)], [0.75, rgbaOf(gr, 0.6)], [1, rgbaOf(gr, 0)]]));
    // roads (tier >= 1)
    if (tier >= 1) {
      ctx.strokeStyle = rgbaOf(lit(gr, 0.35), 0.55); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(cx, cy + T.rz * KZ + 2); ctx.quadraticCurveTo(cx + 2, cy, cx + T.rz * 0.32 * KX, cy - T.rz * 0.32 * KZ + 8);
      if (tier >= 2) { ctx.moveTo(cx - T.rx * 0.8, cy + 2); ctx.quadraticCurveTo(cx, cy + 4, cx + T.rx * 0.8, cy - 4); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(20,15,30,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 6; i++) { const y = cy + T.rz * KZ - i * 3; ctx.moveTo(cx - 1.5, y); ctx.lineTo(cx + 1.5, y); } ctx.stroke();
    }
    const walls = q.w;
    if (walls > 0) wallRing(ctx, cx, cy, T.rx + 5, T.rz + 4, walls, st, 'back', tier, rng);
    let lmInfo = null, top = cy - 30;
    for (const it of items) {
      const sx = cx + it.X + it.Z * KX, sy = cy - it.Z * KZ;
      const irng = new AOW.RNG(it.seed);
      if (it.kind === 'house') {
        contactShadow(ctx, sx + 1, sy + 1, it.w * 0.75, it.d * KZ * 0.9, 0.32);
        const types = st.houseTypes;
        const fn = HOUSES[types[irng.int(0, types.length - 1)]] || HOUSES.stone;
        fn(ctx, sx, sy, it.w, it.d, it.h * (0.9 + tier * 0.04), st, irng);
        top = Math.min(top, sy - it.h - 14);
      } else if (it.kind === 'landmark') {
        contactShadow(ctx, sx + 2, sy + 2, it.w * 0.8, it.d * KZ * 1.1, 0.4);
        lmInfo = (LANDMARK[st.id] || LANDMARK.feudal)(ctx, sx, sy, it.w, it.d, tier, st, irng);
        top = Math.min(top, lmInfo.top || sy - 30);
      } else if (it.kind === 'temple') {
        contactShadow(ctx, sx + 1, sy + 1, it.w * 0.75, it.d * KZ, 0.35);
        (TEMPLE[st.id] || TEMPLE.feudal)(ctx, sx, sy, it.w, it.d, st, irng);
      } else if (it.kind === 'camp') {
        lmInfo = drawCamp(ctx, sx, sy, st, irng, q.f || 0);
        top = Math.min(top, lmInfo.top);
      } else if (it.kind === 'decor') {
        decor(ctx, it.type, sx, sy, st, irng, q.f || 0);
      }
    }
    if (walls > 0) wallRing(ctx, cx, cy, T.rx + 5, T.rz + 4, walls, st, 'front', tier, rng);
    // banners (static part: poles; the cloth is drawn per frame by the caller via bannerAt when frame animates)
    const bannerCol = q.p || '#8a7a66', bannerCol2 = q.p2 || (q.p ? lit(q.p, 0.6) : '#d8ccb4');
    const shape = st.banner;
    const bl = lmInfo ? lmInfo.banners : [];
    const bigScale = q.c ? 1.4 : 1;
    bl.forEach((b, i) => bannerAt(ctx, b[0], b[1], b[2] * (i === 0 ? bigScale : 1), bannerCol, bannerCol2, shape, q.f, i === 0 ? bigScale : 1));
    if (tier >= 3 && walls >= 2) { // extra banners at the gate towers
      const gx = cx, gy = cy + (T.rz + 4) * KZ;
      bannerAt(ctx, gx - 8, gy - 10, 8, bannerCol, bannerCol2, shape, (q.f || 0) + 1, 0.8);
      bannerAt(ctx, gx + 9, gy - 10, 8, bannerCol, bannerCol2, shape, (q.f || 0) + 2, 0.8);
    }
    // capital crown ornament
    if (q.c && lmInfo && lmInfo.banners.length) {
      const b = lmInfo.banners[0], x = b[0], y = b[1] - b[2] * bigScale - 13;
      glow(ctx, x, y, 16, '#ffe58a', 0.8);
      crown(ctx, x, y, 8.5);
      top = Math.min(top, y - 12);
    }
    // metropolis glow
    if ((tier >= 5 || q.c) && lmInfo) for (const g of lmInfo.glows) glow(ctx, g[0], g[1], g[2] * 1.4, st.glowCol, tier >= 5 ? 0.42 : 0.25);
    grain(ctx, W, H, q.seed, 0.28);
    const ms = performance.now() - t0;
    genStats.count++; genStats.totalMs += ms; if (ms > genStats.maxMs) { genStats.maxMs = ms; genStats.slowest = 'city:' + q.s + ':t' + tier; }
  }
  function crown(ctx, x, y, r) {
    const k = r / 6;
    poly(ctx, [[x - r, y + 2.5 * k], [x - r, y - 2.5 * k], [x - r * 0.5, y + 0.5 * k], [x, y - 4 * k], [x + r * 0.5, y + 0.5 * k], [x + r, y - 2.5 * k], [x + r, y + 2.5 * k]], Art.grad(ctx, x - r, y - 4 * k, x + r, y + 2.5 * k, [[0, '#fff4c0'], [0.5, '#e8c357'], [1, '#a8781e']]), INKS);
    ctx.fillStyle = '#b4842a'; ctx.fillRect(x - r, y + 1.2 * k, r * 2, 0.8 * k);
    for (const [dx, dy, c] of [[-r, -2.5 * k, '#fff4c0'], [0, -4 * k, '#fff4c0'], [r, -2.5 * k, '#fff4c0']]) circ(ctx, x + dx, y + dy, 1 * k, c);
    circ(ctx, x, y + 0.6 * k, 1.2 * k, '#d94b3a', INK2); circ(ctx, x - r * 0.6, y + 0.7 * k, 0.9 * k, '#3f7fe0', INK2); circ(ctx, x + r * 0.6, y + 0.7 * k, 0.9 * k, '#3f7fe0', INK2);
  }
  /** tier-0 camp / outpost core: watchtower + tent/hut + campfire */
  function drawCamp(ctx, sx, sy, st, rng, frame) {
    const out = { banners: [], glows: [], top: sy - 30 };
    // watchtower (right-back)
    const tx = sx + 9, ty = sy - 3;
    contactShadow(ctx, tx, ty + 1, 5, 2.5, 0.3);
    const woody = st.wallKind === 'palisade' || st.id === 'nomad' || st.id === 'feudal';
    if (woody) {
      // stilts
      line(ctx, tx - 3, ty, tx - 2.4, ty - 14, '#6a4a2a', 1.6); line(ctx, tx + 3, ty, tx + 2.4, ty - 14, '#6a4a2a', 1.6); line(ctx, tx - 3, ty - 4, tx + 3, ty - 9, '#6a4a2a', 1); line(ctx, tx + 3, ty - 4, tx - 3, ty - 9, '#6a4a2a', 1);
      const p = proj(tx - 4, ty - 13);
      box(ctx, p, 8, 6, 5, st.plaster, { top: false, planks: 2 });
      roofHip(ctx, p, 8, 6, 5, 4, st.roof, { rows: 2 });
      out.banners.push([tx + 3, ty - 18, 7]);
    } else {
      cylinder(ctx, tx, ty, 3.6, 15, st.wall, { courses: 3, crenel: true });
      windowAt(ctx, tx - 1, ty - 9, 2, 2.6, st.glowCol, true);
      out.banners.push([tx + 2.5, ty - 16, 7]);
    }
    // dwelling (left)
    const hx = sx - 8, hy = sy + 2, irng = rng;
    contactShadow(ctx, hx, hy + 1, 7, 3, 0.3);
    const type = st.houseTypes[0];
    (HOUSES[type] || HOUSES.stone)(ctx, hx, hy, 10, 8, 7, st, irng);
    // campfire
    fire(ctx, sx + 1, sy + 6, 2.2, frame);
    out.glows.push([sx + 1, sy + 3, 8]);
    out.top = ty - 30;
    return out;
  }

  function registerCity() {
    Art.sprite('struct:city', 64, 64, drawCitySprite, { anchor: { x: 0.5, y: 1 }, sizeFn: q => { const s = citySize(q.t); return { w: s.w, h: s.h }; } });
  }
  registerCity();

  function cityParams(o, neutral) {
    o = o || {};
    const tier = M.clamp(o.tier | 0, 0, 5);
    let walls = o.walls === true ? 2 : o.walls === false || o.walls === undefined || o.walls === null ? 0 : M.clamp(o.walls | 0, 0, 3);
    if (walls === 0 && tier >= 2 && o.walls === undefined) walls = tier >= 4 ? 3 : tier >= 3 ? 2 : 1;
    const pal = o.palette ? { roof: o.palette.roof, wall: o.palette.wall, accent: o.palette.accent, secondary: o.palette.secondary } : null;
    return { s: StructArt.styleFor(o), t: tier, w: walls, c: o.isCapital ? 1 : 0, p: neutral ? '#8a7a66' : (o.playerColor || null), p2: neutral ? '#d8ccb4' : (o.playerColor2 || null), seed: (o.seed | 0) || 1, f: ((o.frame | 0) % 4 + 4) % 4, pal };
  }
  function drawCityAt(ctx, x, y, q) {
    const sz = citySize(q.t);
    Art.draw(ctx, 'struct:city', x, y + (sz.h - sz.cy), q);
  }
  StructArt.drawCity = function (ctx, x, y, o) { drawCityAt(ctx, x, y, cityParams(o, false)); };
  StructArt.drawFreeCity = function (ctx, x, y, o) { drawCityAt(ctx, x, y, cityParams(o, true)); };
  StructArt.drawOutpost = function (ctx, x, y, o) { const q = cityParams(Object.assign({}, o, { tier: 0, walls: (o && o.walls) || 0 }), false); drawCityAt(ctx, x, y, q); };
  StructArt.cityLabelOffset = function (o) {
    const tier = M.clamp(((o && o.tier) | 0), 0, 5), T = TIERS[tier];
    return { y: Math.round((T.rz + 9) * KZ + 10), top: -HEAD[tier] };
  };
  StructArt.stats = () => Object.assign({ avgMs: genStats.count ? genStats.totalMs / genStats.count : 0 }, genStats);

  // ================================================================ generic sprite registration for the non-city pieces
  function regSprite(key, sizeFn, drawFn, opts) {
    Art.sprite(key, 64, 64, (ctx, w, h, q) => {
      const t0 = performance.now();
      drawFn(ctx, w, h, q);
      if (!(opts && opts.noGrain)) grain(ctx, w, h, q.seed || 1, 0.25);
      const ms = performance.now() - t0;
      genStats.count++; genStats.totalMs += ms; if (ms > genStats.maxMs) { genStats.maxMs = ms; genStats.slowest = key + ':' + (q.look || q.kind || q.resource || ''); }
    }, { anchor: { x: 0.5, y: 1 }, sizeFn });
  }
  const GROUND_COL = { grass: '#7a9a48', forest: '#5c8a3c', hills: '#9aa25a', mountain: '#8a857c', desert: '#d9b070', snow: '#e6edf2', swamp: '#5f7a48', volcanic: '#4a3c3a', coast: '#d2c48a', ocean: '#3b95c0', lake: '#3f95c4' };
  function groundPatch(ctx, cx, cy, rx, ry, col, a) {
    ctx.fillStyle = Art.rgrad(ctx, cx, cy, 0, rx, [[0, rgbaOf(col, a || 0.9)], [0.7, rgbaOf(col, (a || 0.9) * 0.7)], [1, rgbaOf(col, 0)]]);
    Art.ellipse(ctx, cx, cy, rx, ry); ctx.fill();
  }
  /** mood pass for wonders/infestations: uncleared = ominous cool vignette + wisps; cleared = soft warm light */
  function moodPass(ctx, w, h, fx, fy, col, cleared, rng, count) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    if (!cleared) {
      ctx.fillStyle = Art.rgrad(ctx, fx, fy, 10, Math.max(w, h) * 0.75, [[0, 'rgba(20,10,45,0)'], [0.5, 'rgba(20,10,45,0.12)'], [1, 'rgba(20,10,45,0.42)']]);
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = Art.grad(ctx, 0, 0, w, h, [[0, 'rgba(255,236,190,0.16)'], [0.55, 'rgba(255,236,190,0)'], [1, 'rgba(60,70,120,0.12)']]);
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
    if (!cleared) {
      for (let i = 0; i < (count || 7); i++) {
        const a = rng.next() * TAU, d = 10 + rng.next() * 34;
        const x = fx + Math.cos(a) * d, y = fy + Math.sin(a) * d * 0.7 - rng.next() * 12;
        glow(ctx, x, y, 2 + rng.next() * 3, col, 0.8); circ(ctx, x, y, 0.8, lit(col, 0.7));
      }
    } else {
      for (let i = 0; i < 5; i++) { const x = rng.float(w * 0.15, w * 0.85), y = rng.float(h * 0.74, h * 0.9); flower(ctx, x, y, rng.pick(['#fff1c8', '#f6b6d0', '#ffe27a'])); }
    }
  }
  function flower(ctx, x, y, col) { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; circ(ctx, x + Math.cos(a) * 1.1, y + Math.sin(a) * 0.8, 0.9, col); } circ(ctx, x, y, 0.6, '#e8a53a'); }
  function brazier(ctx, x, y, col, big) {
    const s = big ? 1.5 : 1;
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(x - 2 * s, y - 3 * s, 4 * s, 3 * s); ctx.fillStyle = '#5a5a64'; ctx.fillRect(x - 2.6 * s, y - 3.6 * s, 5.2 * s, 1.2 * s);
    line(ctx, x, y, x, y - 3 * s, '#3a3a44', 1.4 * s);
    glow(ctx, x, y - 6 * s, 7 * s, col, 0.75);
    poly(ctx, [[x - 2 * s, y - 3.6 * s], [x - 0.6 * s, y - 7 * s], [x, y - 10 * s], [x + 0.8 * s, y - 6.5 * s], [x + 2 * s, y - 3.6 * s]], Art.grad(ctx, 0, y - 10 * s, 0, y - 3 * s, [[0, lit(col, 0.7)], [1, col]]));
  }
  function skull(ctx, x, y, r) { ell(ctx, x, y, r, r * 0.85, '#efe6d2', INK); ctx.fillStyle = '#2a1c14'; ell(ctx, x - r * 0.4, y - r * 0.1, r * 0.25, r * 0.3, '#2a1c14'); ell(ctx, x + r * 0.4, y - r * 0.1, r * 0.25, r * 0.3, '#2a1c14'); ctx.fillRect(x - r * 0.35, y + r * 0.45, r * 0.7, r * 0.3); }
  function deadTree(ctx, x, y, h) {
    ctx.strokeStyle = '#3a2e28'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y - h * 0.5, x - 1, y - h); ctx.stroke();
    ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x + 0.5, y - h * 0.55); ctx.quadraticCurveTo(x + 4, y - h * 0.7, x + 6, y - h * 0.95); ctx.moveTo(x - 0.5, y - h * 0.7); ctx.quadraticCurveTo(x - 4, y - h * 0.8, x - 6, y - h * 1.05); ctx.moveTo(x - 1, y - h); ctx.lineTo(x + 2, y - h - 4); ctx.stroke();
  }
  function tombstone(ctx, x, y, w, h, col) { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w / 2); ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y); ctx.closePath(); fillPath(ctx, Art.grad(ctx, x - w / 2, 0, x + w / 2, 0, [[0, lit(col, 0.3)], [1, shd(col, 0.4)]]), INK); }
  function ruinedWall(ctx, x, y, w, h, col, rng, d) {
    // a crumbling wall piece: box with a jagged top
    d = d || 6;
    const p = proj(x, y), n = Math.max(2, Math.round(w / 5));
    const top = []; for (let i = 0; i <= n; i++) top.push(h * (0.45 + rng.next() * 0.55));
    poly(ctx, [p(w, 0, 0), p(w, top[n], 0), p(w, top[n] * 0.9, d), p(w, 0, d)], shd(col, 0.4), INK);
    const pts = [p(0, 0, 0), p(w, 0, 0)]; for (let i = n; i >= 0; i--) pts.push(p(w * i / n, top[i], 0));
    poly(ctx, pts, Art.grad(ctx, 0, y - h, 0, y, [[0, lit(col, 0.2)], [1, shd(col, 0.15)]]), INK);
    courses(ctx, p, w, h * 0.5, 3, 'rgba(20,15,30,0.16)');
  }
  function wisp(ctx, x, y, col) { glow(ctx, x, y, 4, col, 0.8); circ(ctx, x, y, 1, lit(col, 0.7)); }
  function water(ctx, cx, cy, rx, ry, col) {
    ell(ctx, cx, cy, rx, ry, Art.rgrad(ctx, cx - rx * 0.3, cy - ry * 0.3, 0, rx, [[0, lit(col, 0.3)], [0.7, col], [1, shd(col, 0.3)]]), INK2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 4; i++) { const y = cy - ry * 0.5 + i * ry * 0.35, x0 = cx - rx * (0.6 - i * 0.1); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 + 4, y - 1, x0 + 9, y); } ctx.stroke();
  }

  // ================================================================ wonders
  const WONDER = {};
  const WONDER_META = {   // focal glow (dx, dy from the ground centre, radius), colour
    golden_ruins: { col: '#ffc65a', f: [0, -62, 22] }, pyramid: { col: '#5fe6c0', f: [0, -20, 18] }, wizard_tower: { col: '#7fd8ff', f: [0, -84, 20] },
    dwelling: { col: '#d23aff', f: [0, -34, 18] }, crypt: { col: '#b48cd6', f: [0, -22, 16] }, grove: { col: '#b8ff7a', f: [0, -40, 22] },
    forge: { col: '#ff8c1a', f: [0, -14, 20] }, monolith: { col: '#ffc65a', f: [0, -52, 16] }, library: { col: '#7fd8ff', f: [0, -46, 14] },
    sunken: { col: '#5fd8d0', f: [0, -6, 22] }, battlefield: { col: '#fff1b8', f: [0, -30, 18] }, roost: { col: '#ff8c1a', f: [0, -70, 16] },
    shrine: { col: '#ff2e2e', f: [4, -6, 16] }, obelisk: { col: '#b69cff', f: [0, -80, 16] },
  };
  StructArt.WONDER_LOOKS = Object.keys(WONDER_META);
  const WSIZE = { w: 168, h: 176, foot: 34 };

  WONDER.golden_ruins = function (ctx, cx, cy, rng, cleared, v) {
    const sand = '#c9a86a', gold = '#e8c357';
    groundPatch(ctx, cx, cy, 70, 26, '#cdb27a');
    contactShadow(ctx, cx, cy + 2, 52, 18, 0.35);
    // broken pillars at the back
    for (const [dx, dz, h] of [[-52, 14, 14], [52, 12, 9], [-40, -12, 7]]) { const x = cx + dx + dz * KX, y = cy - dz * KZ; cylinder(ctx, x, y, 2.6, h, sand, { top: false, courses: 3 }); poly(ctx, [[x - 2.6, y - h], [x - 1, y - h - 2], [x + 1.5, y - h - 1], [x + 2.6, y - h]], lit(sand, 0.2), INK); }
    const tiers = [[60, 40, 11], [46, 30, 10], [32, 20, 9], [18, 11, 8]];
    let Y = 0;
    tiers.forEach((t, i) => {
      const [w, d, h] = t, p = proj(cx - w / 2 - d * KX / 2, cy + d * KZ / 2 - Y);
      box(ctx, p, w, d, h, i === 3 ? gold : sand, { courses: 3.5, topColor: lit(i === 3 ? gold : sand, 0.3) });
      if (i < 3) { const a = p(0, h - 0.5, 0), b = p(w, h - 0.5, 0); line(ctx, a[0], a[1], b[0], b[1], gold, 1.2); }
      if (i === 0) { const dr = p(w / 2, 0, 0); door(ctx, dr[0], dr[1], 7, 8, '#b47a3a', true, cleared ? '#ffe9a8' : '#6a3a10'); ctx.strokeStyle = '#f5d76e'; ctx.lineWidth = 1; ctx.strokeRect(dr[0] - 3, dr[1] - 7, 6, 7); }
      Y += h;
    });
    // gold cap
    const capP = proj(cx - 9 - 5.5 * KX, cy + 5.5 * KZ - Y);
    roofHip(ctx, capP, 18, 11, 0, 11, gold, { rows: 3, ov: 0.5 });
    // stairs up the front
    ctx.strokeStyle = 'rgba(20,15,30,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 9; i++) { ctx.moveTo(cx - 6, cy + 8 - i * 4.5); ctx.lineTo(cx + 6, cy + 8 - i * 4.5); } ctx.stroke();
    // golem statues flanking
    for (const s of [-1, 1]) { const x = cx + s * 40, y = cy + 12; poly(ctx, [[x - 3.5, y], [x + 3.5, y], [x + 3, y - 3], [x - 3, y - 3]], '#a88a5a', INK); poly(ctx, [[x - 3, y - 3], [x - 3.5, y - 11], [x - 1.5, y - 13], [x + 1.5, y - 13], [x + 3.5, y - 11], [x + 3, y - 3]], Art.grad(ctx, x - 3, 0, x + 3, 0, [[0, '#d8a860'], [1, '#8a5a2a']]), INK); ctx.fillStyle = cleared ? '#ffd27a' : '#ff9a2a'; ctx.fillRect(x - 1.8, y - 11.5, 1.2, 1.2); ctx.fillRect(x + 0.6, y - 11.5, 1.2, 1.2); }
    glow(ctx, cx, cy - Y - 11, 22, '#ffe08a', cleared ? 0.45 : 0.7);
  };
  WONDER.pyramid = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 72, 26, '#6a5e58');
    contactShadow(ctx, cx, cy + 2, 56, 18, 0.4);
    const col = '#2f2a3a', w = 74, d = 52;
    const p = proj(cx - w / 2 - d * KX / 2, cy + d * KZ / 2);
    // sunken base step
    box(ctx, (X, Y, Z) => p(X - 5, Y, Z - 5), w + 10, d + 10, 3, '#3f3a48', { courses: 0 });
    const p2 = (X, Y, Z) => p(X, Y + 3, Z);
    roofHip(ctx, p2, w, d, 0, 52, col, { rows: 8, ov: 0 });
    // step lines and cracks
    ctx.strokeStyle = 'rgba(180,170,200,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 8; i++) { const t = i / 8; const a = p2(w / 2 * t, 52 * (1 - t), d / 2 * t), b = p2(w - w / 2 * t, 52 * (1 - t), d / 2 * t); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    ctx.strokeStyle = 'rgba(10,8,16,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 12, cy - 6); ctx.lineTo(cx - 8, cy - 16); ctx.lineTo(cx - 10, cy - 24); ctx.moveTo(cx + 14, cy - 10); ctx.lineTo(cx + 10, cy - 20); ctx.stroke();
    // entrance + skull relief
    door(ctx, cx, cy + 3 + d * KZ / 2 - 2, 8, 10, '#1a1622', false, cleared ? '#5a5a70' : '#1e6e5a');
    skull(ctx, cx, cy - 14, 4.5);
    // soul braziers
    const bc = cleared ? '#8ab0a0' : '#5fe6c0';
    brazier(ctx, cx - 26, cy + 18, bc, true); brazier(ctx, cx + 26, cy + 18, bc, true);
    if (!cleared) { glow(ctx, cx, cy + 6, 16, '#5fe6c0', 0.6); }
    // capstone glint
    const apex = p2(w / 2, 52, d / 2); circ(ctx, apex[0], apex[1], 2, '#e8c357', INK2);
  };
  WONDER.wizard_tower = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 60, 24, '#7f8fa0');
    contactShadow(ctx, cx, cy + 2, 30, 12, 0.4);
    const col = '#8a90aa';
    // annex
    const p = proj(cx + 6, cy + 6); box(ctx, p, 22, 14, 14, col, { courses: 3.2 }); roofGableX(ctx, p, 22, 14, 14, 7, '#4a4f78', { wall: col });
    windows(ctx, p, 22, 14, 2, 1, '#7fd8ff', { arch: true });
    // main tower with jagged broken top
    const r = 11, h = 78;
    cylinder(ctx, cx - 8, cy, r, h, col, { top: false, courses: 4 });
    const tx = cx - 8;
    ctx.fillStyle = shd(col, 0.35); ctx.beginPath(); ctx.moveTo(tx - r, cy - h); for (let i = 0; i <= 6; i++) { const x = tx - r + i * r * 2 / 6, y = cy - h - (i % 2 ? 6 + rng.next() * 6 : 1); ctx.lineTo(x, y); } ctx.lineTo(tx + r, cy - h); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
    for (let i = 0; i < 3; i++) windowAt(ctx, tx - 1.4, cy - 14 - i * 20, 2.8, 4.5, '#7fd8ff', true);
    ctx.strokeStyle = 'rgba(10,8,16,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx + 4, cy - 30); ctx.lineTo(tx + 6, cy - 46); ctx.lineTo(tx + 3, cy - 58); ctx.stroke();
    // rift of blue light at the top + floating masonry
    const ry = cy - h - 10;
    glow(ctx, tx, ry, 24, '#7fd8ff', cleared ? 0.35 : 0.8);
    ctx.strokeStyle = cleared ? 'rgba(150,200,255,0.5)' : '#dff4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 10, ry + 2); ctx.quadraticCurveTo(tx, ry - 12, tx + 10, ry + 1); ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = rng.next() * TAU, d = 12 + rng.next() * 14; rock(ctx, tx + Math.cos(a) * d, ry + Math.sin(a) * d * 0.7 + 6, 2 + rng.next() * 2.5, col, rng.int(1, 50)); }
    // crystal spikes at the base
    for (let i = 0; i < 5; i++) { const x = cx - 40 + i * 20 + rng.next() * 6, y = cy + 10 + rng.next() * 8; glow(ctx, x, y - 3, 5, '#7fd8ff', 0.5); crystal(ctx, x, y, 3, 6 + rng.next() * 5, '#9fd8ff', (rng.next() - 0.5) * 0.7); }
  };
  WONDER.dwelling = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 66, 26, '#4a3a5a');
    contactShadow(ctx, cx, cy + 2, 48, 18, 0.4);
    // hive mound
    const col = '#5a3f78';
    ctx.beginPath(); ctx.moveTo(cx - 50, cy + 8); ctx.quadraticCurveTo(cx - 44, cy - 34, cx - 10, cy - 40); ctx.quadraticCurveTo(cx + 30, cy - 46, cx + 50, cy + 6); ctx.closePath();
    fillPath(ctx, Art.grad(ctx, cx - 40, cy - 40, cx + 30, cy + 10, [[0, lit(col, 0.35)], [0.5, col], [1, shd(col, 0.5)]]), INK);
    // tentacle arcs
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const x = cx - 44 + i * 22 + rng.next() * 6, h = 18 + rng.next() * 18; ctx.strokeStyle = shd(col, 0.25); ctx.lineWidth = 3.5 - i * 0.2; ctx.beginPath(); ctx.moveTo(x, cy - 4); ctx.quadraticCurveTo(x + 8, cy - h, x + 16, cy - h - 6); ctx.stroke(); ctx.strokeStyle = lit(col, 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 1, cy - 6); ctx.quadraticCurveTo(x + 7, cy - h, x + 15, cy - h - 5); ctx.stroke(); }
    // great crystals
    for (const [dx, dy, w, h, t] of [[-26, 2, 8, 30, -0.35], [24, 0, 7, 26, 0.35], [-4, -10, 10, 44, 0.05], [10, 4, 5, 18, 0.5], [-40, 6, 5, 16, -0.6]]) { glow(ctx, cx + dx, cy + dy - h * 0.5, h * 0.5, '#d23aff', cleared ? 0.3 : 0.5); crystal(ctx, cx + dx, cy + dy, w, h, '#c07cff', t); }
    // eye-holes
    for (const [dx, dy] of [[-18, -18], [14, -22], [30, -8]]) { ell(ctx, cx + dx, cy + dy, 3.4, 2.2, '#1a0e26', INK2); if (!cleared) { glow(ctx, cx + dx, cy + dy, 4, '#d23aff', 0.8); circ(ctx, cx + dx, cy + dy, 1, '#ff9aff'); } }
    door(ctx, cx, cy + 6, 10, 12, '#2a1a3a', true, cleared ? '#5a4a7a' : '#7a2aa0');
  };
  WONDER.crypt = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 66, 26, '#4f5a48');
    contactShadow(ctx, cx, cy + 2, 30, 12, 0.4);
    deadTree(ctx, cx - 50, cy + 4, 30); deadTree(ctx, cx + 48, cy - 2, 24);
    const col = '#4a4658', w = 34, d = 24, h = 20;
    const p = proj(cx - w / 2 - d * KX / 2, cy + d * KZ / 2 - 4);
    box(ctx, p, w, d, h, col, { top: false, courses: 3.4 });
    ctx.strokeStyle = 'rgba(20,15,30,0.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 1; i < 4; i++) { const a = p(w * i / 4, 0.5, 0), b = p(w * i / 4, h - 0.5, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    const r = roofGableZ(ctx, p, w, d, h, 16, '#2a2436', { wall: col, rows: 6 });
    line(ctx, r.apexFront[0], r.apexFront[1], r.apexFront[0], r.apexFront[1] - 6, '#8a8a94', 1.3); line(ctx, r.apexFront[0] - 2, r.apexFront[1] - 4, r.apexFront[0] + 2, r.apexFront[1] - 4, '#8a8a94', 1.3);
    const dr = p(w / 2, 0, 0); door(ctx, dr[0], dr[1], 6, 10, '#161220', true, cleared ? '#3a3a50' : '#4a2a7a');
    windowAt(ctx, dr[0] - 1.4, dr[1] - 16, 2.8, 4.5, cleared ? '#8a8aa0' : '#b48cd6', true);
    // iron fence
    ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const x = cx - 42 + i * 6; ctx.moveTo(x, cy + 22); ctx.lineTo(x, cy + 14); } ctx.moveTo(cx - 42, cy + 16); ctx.lineTo(cx + 42, cy + 16); ctx.stroke();
    for (let i = 0; i <= 14; i += 2) { const x = cx - 42 + i * 6; poly(ctx, [[x - 1, cy + 14], [x, cy + 11.5], [x + 1, cy + 14]], '#5a5a64'); }
    // tombstones
    for (const [dx, dy] of [[-34, 8], [-22, 12], [30, 10], [40, 4], [22, 16]]) tombstone(ctx, cx + dx, cy + dy, 5, 7 + rng.next() * 3, '#7a7a86');
    if (!cleared) for (let i = 0; i < 4; i++) wisp(ctx, cx - 30 + i * 20 + rng.next() * 8, cy - 8 - rng.next() * 16, '#b48cd6');
  };
  WONDER.grove = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 72, 28, '#4f8a3a');
    contactShadow(ctx, cx, cy + 4, 56, 20, 0.4);
    const trunk = '#5a3b23', leaf = cleared ? '#4d9a3a' : '#3d7a34';
    // root walls
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) { const a = Math.PI * 0.1 + i * Math.PI * 0.8 / 6, len = 26 + rng.next() * 16; ctx.strokeStyle = shd(trunk, 0.25); ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.6, cy + 4, cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.5 + 2); ctx.stroke(); ctx.strokeStyle = lit(trunk, 0.25); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.6, cy + 1, cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.5); ctx.stroke(); }
    // trunk
    ctx.beginPath(); ctx.moveTo(cx - 14, cy + 2); ctx.quadraticCurveTo(cx - 8, cy - 20, cx - 7, cy - 44); ctx.lineTo(cx + 7, cy - 44); ctx.quadraticCurveTo(cx + 8, cy - 20, cx + 16, cy + 2); ctx.closePath();
    fillPath(ctx, Art.grad(ctx, cx - 14, 0, cx + 16, 0, [[0, lit(trunk, 0.3)], [0.5, trunk], [1, shd(trunk, 0.5)]]), INK);
    // glowing sap
    const sap = cleared ? '#b8ff7a' : '#8ad34a';
    ctx.strokeStyle = sap; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 3, cy - 4); ctx.quadraticCurveTo(cx + 2, cy - 18, cx - 2, cy - 34); ctx.moveTo(cx + 5, cy - 10); ctx.quadraticCurveTo(cx + 3, cy - 22, cx + 5, cy - 32); ctx.stroke();
    glow(ctx, cx, cy - 20, 14, sap, 0.35);
    // door in the trunk
    door(ctx, cx + 1, cy + 1, 6, 9, trunk, true, warm(sap, 0.3));
    // canopy: overlapping blobs
    const blobs = [[-30, -52, 22], [30, -50, 20], [0, -68, 26], [-14, -44, 16], [16, -46, 16], [-46, -40, 12], [46, -38, 12]];
    for (const [dx, dy, r] of blobs) circ(ctx, cx + dx, cy + dy, r, Art.rgrad(ctx, cx + dx - r * 0.4, cy + dy - r * 0.5, 0, r * 1.4, [[0, lit(leaf, 0.45)], [0.6, leaf], [1, shd(leaf, 0.55)]]), INK);
    for (const [dx, dy, r] of blobs.slice(0, 3)) { ctx.fillStyle = lit(leaf, 0.35); for (let i = 0; i < 4; i++) circ(ctx, cx + dx + (rng.next() - 0.5) * r, cy + dy - r * 0.4 + (rng.next() - 0.5) * r * 0.5, 2 + rng.next() * 2, lit(leaf, 0.4)); }
    // vine bridge to a side tree
    tree(ctx, cx + 58, cy + 6, 6, leaf);
    ctx.strokeStyle = '#6a8a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx + 12, cy - 40); ctx.quadraticCurveTo(cx + 36, cy - 22, cx + 58, cy - 16); ctx.moveTo(cx + 12, cy - 36); ctx.quadraticCurveTo(cx + 36, cy - 18, cx + 58, cy - 12); ctx.stroke();
    // glowing mushrooms
    for (let i = 0; i < 4; i++) { const x = cx - 40 + i * 26 + rng.next() * 6, y = cy + 14 + rng.next() * 6; glow(ctx, x, y - 2, 4, sap, 0.5); line(ctx, x, y, x, y - 3, '#e8dcc2', 1.2); ell(ctx, x, y - 3, 2.4, 1.4, '#d9483b', INK2); }
  };
  WONDER.forge = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 70, 26, '#3b3535');
    contactShadow(ctx, cx, cy + 2, 50, 18, 0.4);
    // rock mass behind
    rock(ctx, cx - 30, cy - 10, 22, '#5a4e4a', 7); rock(ctx, cx + 24, cy - 14, 26, '#5a4e4a', 11); rock(ctx, cx - 2, cy - 26, 20, '#5a4e4a', 5);
    const col = '#6e6660', w = 52, d = 26, h = 22;
    const p = proj(cx - w / 2 - d * KX / 2, cy + d * KZ / 2 - 2);
    box(ctx, p, w, d, h, col, { courses: 4, topColor: shd(col, 0.1) });
    const a = p(0, h - 2, 0), b = p(w, h - 2, 0); line(ctx, a[0], a[1], b[0], b[1], '#c89b3c', 1.6);
    crenels(ctx, a[0], b[0], a[1] - 1, 3, 3, col);
    // great arched forge mouth
    const lava = cleared ? '#c86a2a' : '#ff8c1a';
    const dr = p(w / 2, 0, 0); door(ctx, dr[0], dr[1], 18, 16, '#2a2428', true, lava); glow(ctx, dr[0], dr[1] - 6, 16, lava, cleared ? 0.4 : 0.8);
    ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(dr[0] - 9, dr[1] - 8); ctx.arc(dr[0], dr[1] - 8, 9, Math.PI, 0); ctx.stroke();
    // chains hanging from the top
    ctx.strokeStyle = '#8a8a94'; ctx.lineWidth = 1.2; ctx.setLineDash([1.5, 1.5]); ctx.beginPath(); ctx.moveTo(dr[0] - 22, a[1]); ctx.quadraticCurveTo(dr[0] - 16, a[1] + 14, dr[0] - 14, a[1] + 6); ctx.moveTo(dr[0] + 22, a[1]); ctx.quadraticCurveTo(dr[0] + 17, a[1] + 14, dr[0] + 14, a[1] + 8); ctx.stroke(); ctx.setLineDash([]);
    // stacks
    for (const X of [8, 44]) { const c = p(X, h, d * 0.6); ctx.fillStyle = roundGrad(ctx, c[0] - 3, c[0] + 3, '#4a4a50'); ctx.fillRect(c[0] - 3, c[1] - 16, 6, 16); ctx.strokeStyle = INK; ctx.strokeRect(c[0] - 2.5, c[1] - 15.5, 5, 15); for (let i = 0; i < 3; i++) circ(ctx, c[0] + i * 2, c[1] - 19 - i * 4, 2.5 + i, 'rgba(90,80,80,' + (0.4 - i * 0.1) + ')'); }
    // giant anvil and lava pool in front
    const ax = cx + 30, ay = cy + 18; ctx.fillStyle = '#3a3a42'; ctx.fillRect(ax - 4, ay - 5, 8, 5); poly(ctx, [[ax - 10, ay - 5], [ax + 10, ay - 5], [ax + 12, ay - 9], [ax - 8, ay - 9], [ax - 11, ay - 7]], Art.grad(ctx, ax - 10, 0, ax + 12, 0, [[0, '#7a7a84'], [1, '#2a2a32']]), INK);
    const lx = cx - 30, ly = cy + 18; ell(ctx, lx, ly, 14, 5, Art.rgrad(ctx, lx, ly, 0, 14, [[0, '#ffd27a'], [0.5, lava], [1, '#7a2a10']]), INK2); glow(ctx, lx, ly, 14, lava, cleared ? 0.3 : 0.6);
    ctx.strokeStyle = 'rgba(40,20,10,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx - 8, ly + 1); ctx.lineTo(lx - 2, ly - 1); ctx.lineTo(lx + 4, ly + 2); ctx.lineTo(lx + 9, ly - 1); ctx.stroke();
  };
  WONDER.monolith = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 68, 28, '#6f8a48');
    ell(ctx, cx, cy - 2, 44, 16, Art.rgrad(ctx, cx - 10, cy - 8, 0, 44, [[0, '#8aa858'], [1, '#5f7a40']]), INK2);
    contactShadow(ctx, cx, cy + 2, 40, 14, 0.35);
    const col = '#6b6a72', rune = cleared ? '#ffe2a0' : '#ffc65a';
    // ring of standing stones (back ones first)
    const stones = []; for (let i = 0; i < 7; i++) { const a = Math.PI * 0.15 + i * Math.PI * 0.7 / 6 + Math.PI; stones.push([cx + Math.cos(a) * 44, cy + Math.sin(a) * 15, 8 + rng.next() * 8]); } for (let i = 0; i < 7; i++) { const a = Math.PI * 0.15 + i * Math.PI * 0.7 / 6; stones.push([cx + Math.cos(a) * 44, cy + Math.sin(a) * 15, 8 + rng.next() * 8]); }
    const drawStone = (x, y, h, big) => { const w = big ? 16 : 5; poly(ctx, [[x - w / 2, y], [x - w / 2 + 0.8, y - h], [x, y - h - (big ? 8 : 1.5)], [x + w / 2 - 0.8, y - h + 1], [x + w / 2, y]], Art.grad(ctx, x - w / 2, 0, x + w / 2, 0, [[0, lit(col, 0.35)], [0.5, col], [1, shd(col, 0.5)]]), INK); };
    stones.slice(0, 7).forEach(s => drawStone(s[0], s[1], s[2]));
    // the monolith
    const mh = 62; drawStone(cx, cy + 2, mh, true);
    // runes down the face
    ctx.strokeStyle = rune; ctx.lineWidth = 1.2; ctx.shadowColor = rune; ctx.shadowBlur = 4; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const y = cy - 8 - i * 9, x = cx - 2 + (i % 2) * 2; ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y - 3); ctx.moveTo(x - 2, y - 3); ctx.lineTo(x + 2, y); if (i % 3 === 0) { ctx.moveTo(x - 3, y - 1.5); ctx.lineTo(x + 3, y - 1.5); } }
    ctx.stroke(); ctx.shadowBlur = 0;
    glow(ctx, cx, cy - mh - 4, 16, rune, cleared ? 0.3 : 0.6);
    stones.slice(7).forEach(s => drawStone(s[0], s[1], s[2]));
    if (!cleared) for (let i = 0; i < 5; i++) { const x = cx - 20 + i * 10, y = cy - 20 - rng.next() * 40; glow(ctx, x, y, 3, rune, 0.8); circ(ctx, x, y, 0.8, '#fff6d0'); }
  };
  WONDER.library = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 66, 26, '#b8ad92');
    contactShadow(ctx, cx, cy + 2, 50, 18, 0.4);
    const col = '#e6dfd0', w = 40, d = 24, h = 20;
    // wings
    for (const s of [-1, 1]) { const ww = 20, p = proj(cx + s * 26 - ww / 2 - 10 * KX / 2, cy + 10 * KZ / 2 + 2); box(ctx, p, ww, 10, 12, col, { top: false }); roofGableX(ctx, p, ww, 10, 12, 5, '#8a5a3a', { wall: col }); windows(ctx, p, ww, 12, 2, 1, '#ffd27a', { arch: true, ww: 2, wh: 3.4 }); }
    const p = proj(cx - w / 2 - d * KX / 2, cy + d * KZ / 2);
    // steps
    box(ctx, (X, Y, Z) => p(X - 4, Y, Z - 4), w + 8, d + 8, 3, lit(col, 0.1), {});
    const p2 = (X, Y, Z) => p(X, Y + 3, Z);
    box(ctx, p2, w, d, h, col, { top: false });
    const n = 6; for (let i = 0; i <= n; i++) { const a = p2(w * i / n, 0.5, 0), b = p2(w * i / n, h - 0.5, 0); line(ctx, a[0] + 0.8, a[1], b[0] + 0.8, b[1], 'rgba(20,15,30,0.28)', 1.4); line(ctx, a[0] - 0.6, a[1], b[0] - 0.6, b[1], '#ffffff', 1.2); }
    const r = roofGableZ(ctx, p2, w, d, h, 8, '#b47a3a', { wall: col, ov: 3, rows: 3 });
    // pediment relief: open book
    const ped = p2(w / 2, h + 3, 0); ctx.fillStyle = '#f8f2e4'; ctx.fillRect(ped[0] - 4, ped[1] - 1.5, 8, 3); line(ctx, ped[0], ped[1] - 1.5, ped[0], ped[1] + 1.5, INK2, 1);
    // great dome + scrying orb
    const c = p2(w / 2, h, d / 2); cylinder(ctx, c[0], c[1] + 4, 13, 8, col, { top: false }); dome(ctx, c[0], c[1] - 4, 14, 12, '#3fb3b0', { ribs: 6 });
    const orbY = c[1] - 4 - 12 - 8; glow(ctx, c[0], orbY, 12, '#7fd8ff', cleared ? 0.4 : 0.75); circ(ctx, c[0], orbY, 4, Art.rgrad(ctx, c[0] - 1.5, orbY - 1.5, 0, 5, [[0, '#ffffff'], [0.5, '#9fe0ff'], [1, '#3f7fe0']]), INK2);
    line(ctx, c[0], c[1] - 16, c[0], orbY + 4, '#c89b3c', 1.5);
    const dr = p2(w / 2, 0, 0); door(ctx, dr[0], dr[1], 6, 10, '#8a6a3a', true, '#ffe9a8');
    // scattered scrolls
    for (let i = 0; i < 4; i++) { const x = cx - 40 + i * 26 + rng.next() * 8, y = cy + 20 + rng.next() * 4; ctx.fillStyle = '#efe3c6'; ctx.fillRect(x - 3, y - 1.5, 6, 3); ctx.strokeStyle = INK2; ctx.strokeRect(x - 3, y - 1.5, 6, 3); }
  };
  WONDER.sunken = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 72, 28, '#5a8a80');
    // temple behind
    const col = '#8fa8a0', w = 46, d = 22, h = 18;
    const p = proj(cx - w / 2 - d * KX / 2, cy - 4);
    box(ctx, p, w, d, h, col, { top: false, courses: 3.4 });
    const n = 5; for (let i = 0; i <= n; i++) { const a = p(w * i / n, 0.5, 0), b = p(w * i / n, h - 0.5, 0); line(ctx, a[0] + 0.8, a[1], b[0] + 0.8, b[1], 'rgba(20,15,30,0.3)', 1.3); line(ctx, a[0] - 0.6, a[1], b[0] - 0.6, b[1], lit(col, 0.5), 1.2); }
    // cracked dome
    const c = p(w / 2, h, d / 2); dome(ctx, c[0], c[1], 16, 12, '#5f8a80', { ribs: 5 });
    ctx.fillStyle = '#2a3a3a'; ctx.beginPath(); ctx.moveTo(c[0] + 4, c[1] - 12); ctx.lineTo(c[0] + 12, c[1] - 6); ctx.lineTo(c[0] + 9, c[1]); ctx.lineTo(c[0] + 2, c[1] - 6); ctx.closePath(); ctx.fill();
    // water in front
    const wc = '#2f8bb8';
    water(ctx, cx, cy + 12, 66, 16, wc);
    glow(ctx, cx, cy + 10, 26, '#5fd8d0', cleared ? 0.35 : 0.65);
    // broken columns rising from the water
    for (const [dx, hh] of [[-40, 12], [-20, 18], [20, 10], [42, 15]]) { cylinder(ctx, cx + dx, cy + 12, 3, hh, col, { top: false, courses: 3 }); poly(ctx, [[cx + dx - 3, cy + 12 - hh], [cx + dx - 1, cy + 10 - hh], [cx + dx + 2, cy + 11 - hh], [cx + dx + 3, cy + 12 - hh]], lit(col, 0.25), INK); }
    // coral & kelp
    for (let i = 0; i < 5; i++) { const x = cx - 50 + i * 25 + rng.next() * 8, y = cy + 20 + rng.next() * 4; const cc = rng.pick(['#f07d8a', '#ff9a4a', '#e85aa0']); for (let k = 0; k < 3; k++) circ(ctx, x + (k - 1) * 2, y - 1.5 - (k % 2) * 2, 1.8, cc, INK2); }
    ctx.strokeStyle = '#3f8a4a'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { const x = cx - 44 + i * 22 + rng.next() * 6; ctx.beginPath(); ctx.moveTo(x, cy + 24); ctx.quadraticCurveTo(x - 4, cy + 14, x + 2, cy + 4); ctx.stroke(); }
    // dark fish silhouettes
    ctx.fillStyle = 'rgba(20,40,60,0.55)'; for (let i = 0; i < 3; i++) { const x = cx - 20 + i * 18, y = cy + 14 + i * 2; ell(ctx, x, y, 3, 1.2, 'rgba(20,40,60,0.55)'); poly(ctx, [[x + 3, y], [x + 5, y - 1.5], [x + 5, y + 1.5]], 'rgba(20,40,60,0.55)'); }
  };
  WONDER.battlefield = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 72, 28, '#8a8a5a');
    contactShadow(ctx, cx, cy + 2, 56, 18, 0.3);
    const col = '#8f8a80';
    // ruined keep stump and walls
    ruinedWall(ctx, cx - 56, cy - 8, 40, 20, col, rng, 8);
    cylinder(ctx, cx + 18, cy - 12, 10, 26, col, { top: false, courses: 3.5 });
    ctx.fillStyle = shd(col, 0.3); ctx.beginPath(); ctx.moveTo(cx + 8, cy - 38); for (let i = 0; i <= 5; i++) ctx.lineTo(cx + 8 + i * 4, cy - 38 - (i % 2 ? 5 : 0)); ctx.lineTo(cx + 28, cy - 38); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
    windowAt(ctx, cx + 16.6, cy - 30, 2.8, 4.5, cleared ? '#8a8a70' : '#fff1b8', true);
    ruinedWall(ctx, cx + 28, cy + 2, 30, 14, col, rng, 6);
    // rubble
    for (let i = 0; i < 8; i++) rock(ctx, cx - 40 + rng.next() * 80, cy + 4 + rng.next() * 16, 2 + rng.next() * 2.5, col, rng.int(1, 99));
    // spears & tattered banners stuck in the ground
    for (let i = 0; i < 5; i++) { const x = cx - 44 + i * 22 + rng.next() * 8, y = cy + 14 + rng.next() * 8, h = 12 + rng.next() * 8, tilt = (rng.next() - 0.5) * 6; line(ctx, x, y, x + tilt, y - h, '#5a4532', 1.3); poly(ctx, [[x + tilt, y - h], [x + tilt - 1, y - h - 3], [x + tilt + 1, y - h - 3]], '#b9bec8', INK2); if (i % 2) { poly(ctx, [[x + tilt, y - h + 1], [x + tilt + 6, y - h + 3], [x + tilt + 3, y - h + 5], [x + tilt + 5, y - h + 8], [x + tilt, y - h + 8]], rng.pick(['#7a2e2a', '#2d4a7a', '#6a5a3a']), INK); } }
    for (let i = 0; i < 4; i++) skull(ctx, cx - 30 + i * 18 + rng.next() * 6, cy + 20 + rng.next() * 4, 2);
    // crows
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const x = cx - 20 + i * 24, y = cy - 52 - i * 6; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.quadraticCurveTo(x - 1.5, y - 2, x, y); ctx.quadraticCurveTo(x + 1.5, y - 2, x + 3, y); ctx.stroke(); }
    // ghostly gold banner above (uncleared)
    if (!cleared) { glow(ctx, cx, cy - 30, 18, '#fff1b8', 0.45); }
  };
  /** faceted rock pinnacle: lit left facet, shaded right facet, ledges and a snow/lichen cap */
  function pinnacle(ctx, cx, cy, halfW, h, col, rng) {
    const ridge = [[cx - halfW, cy + 6], [cx - halfW * 0.6, cy - h * 0.42], [cx - halfW * 0.35, cy - h * 0.78], [cx - 0.06 * halfW, cy - h], [cx + halfW * 0.3, cy - h * 0.83], [cx + halfW * 0.53, cy - h * 0.47], [cx + halfW, cy + 6]];
    // shaded right mass
    poly(ctx, ridge, Art.grad(ctx, cx - halfW, cy - h, cx + halfW, cy, [[0, lit(col, 0.35)], [0.45, col], [1, shd(col, 0.6)]]), INK);
    // lit left facet
    poly(ctx, [[cx - halfW, cy + 6], [cx - halfW * 0.6, cy - h * 0.42], [cx - halfW * 0.35, cy - h * 0.78], [cx - 0.06 * halfW, cy - h], [cx - halfW * 0.1, cy - h * 0.55], [cx - halfW * 0.3, cy - h * 0.2], [cx - halfW * 0.25, cy + 6]], Art.grad(ctx, cx - halfW, 0, cx, 0, [[0, lit(col, 0.5)], [1, lit(col, 0.12)]]), INK2);
    // secondary facet
    poly(ctx, [[cx - halfW * 0.1, cy - h * 0.55], [cx + halfW * 0.3, cy - h * 0.83], [cx + halfW * 0.25, cy - h * 0.4], [cx + halfW * 0.05, cy - h * 0.2]], shd(col, 0.2), INK2);
    // ledges & cracks
    ctx.strokeStyle = 'rgba(20,15,30,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const t = 0.15 + i * 0.17, y = cy - h * t, x = cx - halfW * (0.6 - t * 0.4) + rng.next() * 6; ctx.moveTo(x, y); ctx.lineTo(x + 8 + rng.next() * 8, y - 2 - rng.next() * 3); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,245,225,0.35)'; ctx.beginPath(); for (let i = 0; i < 3; i++) { const t = 0.3 + i * 0.22, y = cy - h * t, x = cx - halfW * (0.5 - t * 0.35); ctx.moveTo(x, y - 1); ctx.lineTo(x + 6, y - 3); } ctx.stroke();
    // cap
    poly(ctx, [[cx - halfW * 0.22, cy - h * 0.86], [cx - 0.06 * halfW, cy - h], [cx + halfW * 0.18, cy - h * 0.88], [cx + halfW * 0.06, cy - h * 0.8], [cx - halfW * 0.08, cy - h * 0.82]], lit(col, 0.55), INK2);
  }
  WONDER.roost = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 64, 26, '#7a7468');
    contactShadow(ctx, cx, cy + 2, 40, 16, 0.4);
    const col = '#7a746c';
    // pinnacle
    pinnacle(ctx, cx, cy, 34, 72, col, rng);
    // nest on a ledge
    const nx = cx + 2, ny = cy - 58;
    ell(ctx, nx, ny, 13, 5, '#8a6a3a', INK); ctx.strokeStyle = '#5a3b23'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = rng.next() * TAU; ctx.moveTo(nx + Math.cos(a) * 12, ny + Math.sin(a) * 4.5); ctx.lineTo(nx + Math.cos(a) * 13 + 3, ny + Math.sin(a) * 4.5 - 2); } ctx.stroke();
    ell(ctx, nx, ny - 1, 10, 3.2, '#3a2a1a');
    for (let i = 0; i < 3; i++) ell(ctx, nx - 5 + i * 5, ny - 2.5, 2.6, 3.2, Art.rgrad(ctx, nx - 5 + i * 5 - 1, ny - 4, 0, 4, [[0, '#f6ecd0'], [1, '#b8a070']]), INK2);
    const ec = cleared ? '#c8a070' : '#ff8c1a';
    glow(ctx, nx, ny - 6, 16, ec, cleared ? 0.25 : 0.55);
    // bones & feathers at the base
    for (let i = 0; i < 5; i++) { const x = cx - 44 + i * 22 + rng.next() * 8, y = cy + 12 + rng.next() * 8; line(ctx, x - 3, y, x + 3, y - 1.5, '#e6dcc2', 1.4); circ(ctx, x - 3, y, 1, '#e6dcc2'); circ(ctx, x + 3, y - 1.5, 1, '#e6dcc2'); }
    for (let i = 0; i < 4; i++) { const x = cx - 30 + i * 20 + rng.next() * 6, y = cy - 6 - rng.next() * 30; ctx.strokeStyle = i % 2 ? '#e8e0d0' : '#c8402a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - 4, x + 5, y - 7); ctx.stroke(); }
    skull(ctx, cx + 30, cy + 10, 3.5);
  };
  WONDER.shrine = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 70, 28, '#5f7a44');
    contactShadow(ctx, cx, cy + 2, 46, 16, 0.4);
    const col = '#9a9382', w = 44, d = 22, h = 18;
    const p = proj(cx - w / 2 - d * KX / 2, cy + d * KZ / 2 - 12);
    box(ctx, p, w, d, h, col, { top: false, courses: 3.4 });
    const n = 5; for (let i = 0; i <= n; i++) { const a = p(w * i / n, 0.5, 0), b = p(w * i / n, h - 0.5, 0); line(ctx, a[0] + 0.8, a[1], b[0] + 0.8, b[1], 'rgba(20,15,30,0.3)', 1.3); line(ctx, a[0] - 0.6, a[1], b[0] - 0.6, b[1], lit(col, 0.45), 1.2); }
    roofGableZ(ctx, p, w, d, h, 9, shd(col, 0.2), { wall: col, ov: 3, rows: 3 });
    const dr = p(w / 2, 0, 0); door(ctx, dr[0], dr[1], 7, 10, '#3a3028', false, cleared ? '#5a5a60' : '#a01a1a');
    // vines
    ctx.strokeStyle = '#4f8a3a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const x = cx - 24 + i * 16; ctx.beginPath(); ctx.moveTo(x, cy - 2); ctx.quadraticCurveTo(x + 4, cy - 14, x - 2, cy - 30); ctx.stroke(); for (let k = 0; k < 3; k++) circ(ctx, x + 2 - k * 1.5, cy - 8 - k * 8, 1.8, '#5fa34a'); }
    // courtyard with the red rift
    const rift = cleared ? '#7a3a3a' : '#ff2e2e';
    ell(ctx, cx + 4, cy + 10, 30, 10, shd('#8a8a7a', 0.1), INK2);
    glow(ctx, cx + 4, cy + 10, 20, rift, cleared ? 0.2 : 0.75);
    ctx.strokeStyle = cleared ? '#5a3a3a' : '#fff0e0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - 10, cy + 12); ctx.lineTo(cx - 2, cy + 9); ctx.lineTo(cx + 4, cy + 12); ctx.lineTo(cx + 12, cy + 8); ctx.lineTo(cx + 18, cy + 11); ctx.stroke();
    ctx.strokeStyle = rift; ctx.lineWidth = 3; ctx.globalAlpha = cleared ? 0.5 : 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    // cultist braziers and banners
    brazier(ctx, cx - 30, cy + 16, cleared ? '#8a6a5a' : '#ff5a2a'); brazier(ctx, cx + 38, cy + 14, cleared ? '#8a6a5a' : '#ff5a2a');
    if (!cleared) { for (const x of [cx - 40, cx + 46]) { line(ctx, x, cy + 6, x, cy - 18, '#3a2a2a', 1.2); poly(ctx, [[x, cy - 18], [x + 6, cy - 17], [x + 5, cy - 8], [x, cy - 6]], '#8a1a1a', INK); } }
  };
  WONDER.obelisk = function (ctx, cx, cy, rng, cleared, v) {
    groundPatch(ctx, cx, cy, 66, 26, '#8a8aa0');
    // plaza rings
    for (let i = 3; i >= 1; i--) ell(ctx, cx, cy + 2, 14 * i, 5.5 * i, i % 2 ? '#8e91a8' : '#a5a8bd', INK2);
    contactShadow(ctx, cx, cy + 4, 12, 5, 0.4);
    const col = '#8a8fa8', rune = cleared ? '#c8c0ff' : '#b69cff';
    obelisk(ctx, cx, cy, 8, 72, col, null);
    // rune bands
    ctx.strokeStyle = rune; ctx.lineWidth = 1.3; ctx.shadowColor = rune; ctx.shadowBlur = cleared ? 2 : 5; ctx.beginPath();
    for (let i = 0; i < 7; i++) { const y = cy - 10 - i * 9, x = cx - 2 + (i % 2) * 2; ctx.moveTo(x - 2.5, y); ctx.lineTo(x + 2.5, y - 3); ctx.moveTo(x - 2.5, y - 3); ctx.lineTo(x + 2.5, y); if (i % 2) { ctx.moveTo(x - 3, y - 1.5); ctx.lineTo(x + 3, y - 1.5); } }
    ctx.stroke(); ctx.shadowBlur = 0;
    // floating rings around the tip
    const ty = cy - 84;
    glow(ctx, cx, ty, 18, rune, cleared ? 0.35 : 0.7);
    ctx.strokeStyle = rgbaOf('#e8e0ff', 0.9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(cx, ty + 6, 16, 5, -0.25, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgbaOf(rune, 0.9); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(cx, ty + 2, 11, 3.5, 0.4, 0, TAU); ctx.stroke();
    // small satellite obelisks
    for (const [dx, dy] of [[-40, 8], [40, 6], [-28, 18], [30, 18]]) obelisk(ctx, cx + dx, cy + dy, 2.4, 14, col, cleared ? null : rune);
    if (!cleared) for (let i = 0; i < 6; i++) { const x = cx - 30 + rng.next() * 60, y = cy - 20 - rng.next() * 60; glow(ctx, x, y, 3, '#ffffff', 0.8); circ(ctx, x, y, 0.8, '#ffffff'); }
  };

  regSprite('struct:wonder', () => ({ w: WSIZE.w, h: WSIZE.h }), (ctx, w, h, q) => {
    const fn = WONDER[q.look] || WONDER.monolith, meta = WONDER_META[q.look] || WONDER_META.monolith;
    const cx = w / 2, cy = h - WSIZE.foot, rng = new AOW.RNG((q.seed | 0) * 31 + (q.v | 0) * 977 + 5);
    fn(ctx, cx, cy, rng, !!q.cl, q.v | 0);
    moodPass(ctx, w, h, cx + meta.f[0], cy + meta.f[1], meta.col, !!q.cl, rng, 8);
    // medallion (bronze/silver/gold by variant) — small tier badge above the ground
  });
  regSprite('struct:glow', q => ({ w: q.r * 2, h: q.r * 2 }), (ctx, w, h, q) => { glow(ctx, w / 2, h / 2, q.r, q.c, 1); }, { noGrain: true });
  StructArt.drawWonder = function (ctx, x, y, o) {
    o = o || {};
    const look = WONDER_META[o.look] ? o.look : 'monolith', meta = WONDER_META[look];
    Art.draw(ctx, 'struct:wonder', x, y + WSIZE.foot, { look, cl: o.cleared ? 1 : 0, seed: (o.seed | 0) || 1, v: (o.variant | 0) % 4 });
    // pulsing focal glow (frame-animated, cheap cached sprite)
    const f = ((o.frame | 0) % 4 + 4) % 4, a = o.cleared ? 0.18 + 0.06 * Math.sin(f * Math.PI / 2) : 0.42 + 0.16 * Math.sin(f * Math.PI / 2);
    const g = Art.get('struct:glow', { r: meta.f[2], c: meta.col });
    ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(g.cv, Math.round(x + meta.f[0] - meta.f[2]), Math.round(y + meta.f[1] - meta.f[2])); ctx.restore();
  };

  // ================================================================ resource nodes & magic materials
  const MATERIAL = {
    mithril: { col: '#c8d8f0', kind: 'crystal' }, crystal: { col: '#6fd3ff', kind: 'crystal' }, sunstone: { col: '#ffb040', kind: 'crystal' }, nightshade: { col: '#8a3ab0', kind: 'plant' },
    dragon_bone: { col: '#ff6a4a', kind: 'bone' }, moonstone: { col: '#d8e8ff', kind: 'crystal' }, ironwood: { col: '#8ad34a', kind: 'tree' }, frost_crystal: { col: '#a6e4ff', kind: 'crystal' },
    ember_coal: { col: '#ff5a1a', kind: 'coal' }, star_metal: { col: '#c9a0ff', kind: 'metal' },
  };
  StructArt.MATERIALS = Object.keys(MATERIAL);
  StructArt.NODE_RESOURCES = ['gold', 'mana', 'food', 'production', 'knowledge', 'draft'];
  const NSIZE = { w: 84, h: 78, foot: 24 };
  function nodeFeature(ctx, res, cx, cy, rng, improved) {
    switch (res) {
      case 'gold': {
        rock(ctx, cx - 8, cy + 2, 9, '#8a7a68', rng.int(1, 99)); rock(ctx, cx + 8, cy, 11, '#8a7a68', rng.int(1, 99)); rock(ctx, cx, cy + 6, 7, '#8a7a68', rng.int(1, 99));
        ctx.strokeStyle = '#e8c357'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx + 2, cy - 6); ctx.lineTo(cx + 8, cy - 2); ctx.lineTo(cx + 12, cy - 5); ctx.moveTo(cx - 12, cy - 2); ctx.lineTo(cx - 6, cy + 1); ctx.stroke();
        for (let i = 0; i < 6; i++) { const x = cx - 12 + rng.next() * 24, y = cy - 4 + rng.next() * 12; circ(ctx, x, y, 1.4 + rng.next(), '#f2c94c', INK2); circ(ctx, x - 0.4, y - 0.4, 0.5, '#fff6c0'); }
        glow(ctx, cx, cy, 14, '#ffd86a', 0.3); break;
      }
      case 'mana': {
        rock(ctx, cx, cy + 4, 12, '#6a6f88', rng.int(1, 99));
        glow(ctx, cx, cy - 6, 18, '#5a7ff0', 0.5);
        for (const [dx, dy, w, h, t] of [[-8, 4, 4, 12, -0.4], [7, 3, 4, 10, 0.4], [0, -2, 5, 16, 0], [-3, 6, 3, 7, -0.2], [11, 6, 3, 7, 0.6]]) crystal(ctx, cx + dx, cy + dy, w, h, '#7f9fff', t);
        break;
      }
      case 'food': {
        ell(ctx, cx, cy + 2, 22, 9, Art.rgrad(ctx, cx, cy, 0, 22, [[0, '#9bc25a'], [1, '#6f9a3c']]), INK2);
        ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 6; i++) { const x = cx - 20 + i * 8; ctx.moveTo(x, cy + 8); ctx.lineTo(x, cy + 3); } ctx.moveTo(cx - 20, cy + 5); ctx.lineTo(cx + 20, cy + 5); ctx.stroke();
        // wheat
        for (let i = 0; i < 7; i++) { const x = cx - 14 + i * 4.5, y = cy + 2 - (i % 2) * 2; line(ctx, x, y, x + 1, y - 9, '#c8a83a', 1.2); ell(ctx, x + 1.2, y - 9.5, 1.6, 3, '#e8c357', INK2); }
        // sheep
        for (const [dx, dy] of [[-16, -4], [14, -6]]) { ell(ctx, cx + dx, cy + dy, 3.5, 2.4, '#f4f0e4', INK2); circ(ctx, cx + dx + 3, cy + dy - 0.5, 1.3, '#3a2a1a'); }
        break;
      }
      case 'production': {
        rock(ctx, cx - 6, cy + 2, 12, '#5a5a62', rng.int(1, 99)); rock(ctx, cx + 10, cy + 4, 8, '#5a5a62', rng.int(1, 99));
        ctx.strokeStyle = '#b5652c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 14, cy - 2); ctx.lineTo(cx - 6, cy - 5); ctx.lineTo(cx, cy - 1); ctx.moveTo(cx + 6, cy + 1); ctx.lineTo(cx + 14, cy - 1); ctx.stroke();
        for (const dx of [-16, 4]) { line(ctx, cx + dx - 3, cy + 10, cx + dx, cy - 6, '#7a5a34', 1.6); line(ctx, cx + dx + 3, cy + 10, cx + dx, cy - 6, '#7a5a34', 1.6); line(ctx, cx + dx - 2.2, cy + 5, cx + dx + 2.2, cy + 5, '#7a5a34', 1.4); }
        for (let i = 0; i < 4; i++) circ(ctx, cx - 10 + i * 7, cy + 12, 1.8, '#4a4a54', INK2);
        break;
      }
      case 'knowledge': {
        ell(ctx, cx, cy + 4, 18, 7, '#8a8a80', INK2);
        poly(ctx, [[cx - 8, cy + 4], [cx - 7, cy - 18], [cx - 3, cy - 21], [cx + 6, cy - 20], [cx + 8, cy - 14], [cx + 7, cy + 4]], Art.grad(ctx, cx - 8, 0, cx + 8, 0, [[0, '#c8c2b4'], [1, '#7a766c']]), INK);
        ctx.strokeStyle = '#c9a0ff'; ctx.lineWidth = 1.2; ctx.shadowColor = '#c9a0ff'; ctx.shadowBlur = 3; ctx.beginPath(); for (let i = 0; i < 4; i++) { const y = cy - 15 + i * 4.5; ctx.moveTo(cx - 4, y); ctx.lineTo(cx + 3 - (i % 2) * 2, y); } ctx.stroke(); ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(10,8,16,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 5, cy - 8); ctx.lineTo(cx + 2, cy - 2); ctx.stroke();
        for (let i = 0; i < 3; i++) { const x = cx - 16 + i * 16 + rng.next() * 4, y = cy + 8; ctx.fillStyle = i % 2 ? '#efe3c6' : '#7a2e2a'; ctx.fillRect(x - 3, y - 2, 6, 2.5); ctx.strokeStyle = INK2; ctx.strokeRect(x - 3, y - 2, 6, 2.5); }
        glow(ctx, cx, cy - 10, 12, '#c9a0ff', 0.35); break;
      }
      case 'draft': {
        ell(ctx, cx, cy + 3, 22, 9, '#a09060', INK2);
        // weapon rack
        line(ctx, cx - 18, cy + 6, cx - 18, cy - 8, '#7a5a34', 1.6); line(ctx, cx - 6, cy + 6, cx - 6, cy - 8, '#7a5a34', 1.6); line(ctx, cx - 19, cy - 6, cx - 5, cy - 6, '#7a5a34', 1.4);
        for (let i = 0; i < 4; i++) { const x = cx - 16 + i * 3; line(ctx, x, cy + 4, x + 1, cy - 12, '#5a4532', 1); poly(ctx, [[x + 1, cy - 12], [x, cy - 14.5], [x + 2, cy - 14.5]], '#b9bec8', INK2); }
        // dummy
        line(ctx, cx + 8, cy + 6, cx + 8, cy - 10, '#7a5a34', 1.8); ell(ctx, cx + 8, cy - 4, 4, 5, '#c8a83a', INK); circ(ctx, cx + 8, cy - 11, 2.4, '#c8a83a', INK); line(ctx, cx + 2, cy - 5, cx + 14, cy - 5, '#7a5a34', 1.4);
        // shield & banner
        ctx.fillStyle = '#7a2e2a'; ctx.beginPath(); ctx.moveTo(cx + 18, cy - 8); ctx.lineTo(cx + 23, cy - 8); ctx.lineTo(cx + 23, cy - 2); ctx.lineTo(cx + 20.5, cy + 1); ctx.lineTo(cx + 18, cy - 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
        break;
      }
    }
  }
  function materialFeature(ctx, mat, cx, cy, rng) {
    const m = MATERIAL[mat]; if (!m) return;
    glow(ctx, cx, cy - 4, 16, m.col, 0.55);
    if (m.kind === 'crystal' || m.kind === 'metal') { for (const [dx, dy, w, h, t] of [[-5, 2, 3.5, 11, -0.35], [4, 1, 3.5, 9, 0.35], [0, -2, 4, 14, 0], [8, 4, 2.5, 6, 0.6]]) crystal(ctx, cx + dx, cy + dy, w, h, m.kind === 'metal' ? '#e0c8ff' : m.col, t); if (m.kind === 'metal') for (let i = 0; i < 4; i++) { const x = cx - 8 + rng.next() * 16, y = cy - 12 - rng.next() * 8; glow(ctx, x, y, 2, '#ffffff', 0.9); } }
    else if (m.kind === 'plant') { for (let i = 0; i < 3; i++) { const x = cx - 6 + i * 6; line(ctx, x, cy + 2, x, cy - 8 - i * 2, '#3a2a4a', 1.3); for (let k = 0; k < 3; k++) circ(ctx, x + (k - 1) * 2.2, cy - 8 - i * 2 + (k % 2) * 1.5, 1.6, m.col, INK2); } }
    else if (m.kind === 'bone') { ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const x = cx - 9 + i * 6; ctx.beginPath(); ctx.moveTo(x, cy + 2); ctx.quadraticCurveTo(x + 2, cy - 8, x + 6, cy - 14 - (i % 2) * 3); ctx.stroke(); } ctx.strokeStyle = INK2; ctx.lineWidth = 1; skull(ctx, cx + 2, cy + 1, 3); }
    else if (m.kind === 'tree') { line(ctx, cx, cy + 2, cx, cy - 12, '#2a2a22', 2.4); for (const [dx, dy, r] of [[-5, -13, 4], [5, -12, 4], [0, -18, 5]]) circ(ctx, cx + dx, cy + dy, r, Art.rgrad(ctx, cx + dx - 1, cy + dy - 1, 0, r * 1.3, [[0, '#8ad34a'], [1, '#2f5a24']]), INK); }
    else if (m.kind === 'coal') { for (let i = 0; i < 5; i++) { const x = cx - 8 + rng.next() * 16, y = cy - 2 + rng.next() * 6; rock(ctx, x, y, 3 + rng.next() * 2, '#2a2426', rng.int(1, 99)); circ(ctx, x, y - 1.5, 0.9, m.col); } glow(ctx, cx, cy, 10, m.col, 0.45); }
  }
  regSprite('struct:node', () => ({ w: NSIZE.w, h: NSIZE.h }), (ctx, w, h, q) => {
    const cx = w / 2, cy = h - NSIZE.foot, rng = new AOW.RNG((q.seed | 0) * 13 + 3);
    const res = q.resource, mat = q.mat;
    contactShadow(ctx, cx, cy + 3, 26, 9, 0.3);
    if (res && mat) { nodeFeature(ctx, res, cx - 12, cy + 2, rng, q.imp); materialFeature(ctx, mat, cx + 16, cy + 1, rng); }
    else if (res) nodeFeature(ctx, res, cx, cy, rng, q.imp);
    else if (mat) { rock(ctx, cx, cy + 4, 11, '#6a6f78', rng.int(1, 99)); materialFeature(ctx, mat, cx, cy, rng); }
    if (q.imp) { // small extractor rig + lantern to show the node is worked
      const x = cx + 24, y = cy + 8; line(ctx, x - 4, y, x, y - 12, '#7a5a34', 1.6); line(ctx, x + 4, y, x, y - 12, '#7a5a34', 1.6); circ(ctx, x, y - 8, 2.2, '#c89b3c', INK); line(ctx, x, y - 6, x, y, '#5a5a62', 1); ctx.fillStyle = '#8a6a44'; ctx.fillRect(x - 3, y - 2, 6, 2.5);
      lantern(ctx, cx - 26, cy + 8, 4);
    }
  });
  StructArt.drawNode = function (ctx, x, y, o) {
    o = o || {};
    Art.draw(ctx, 'struct:node', x, y + NSIZE.foot, { resource: o.resource || null, mat: o.magicMaterial || null, imp: o.improved ? 1 : 0, seed: (o.seed | 0) || 1 });
  };

  // ================================================================ province improvements
  StructArt.IMPROVEMENTS = ['farm', 'forester', 'quarry', 'mine', 'research_post', 'conduit', 'fishery', 'hunters_lodge', 'vineyard', 'special'];
  const ISIZE = { w: 92, h: 84, foot: 24 };
  const IMPROVE = {};
  IMPROVE.farm = function (ctx, cx, cy, rng, lv) {
    // field strips
    const rows = 3 + lv;
    for (let i = 0; i < rows; i++) { const y = cy + 8 - i * 5, c = i % 2 ? '#c8a83a' : '#8fb54a'; poly(ctx, [[cx - 30 + i * 2, y], [cx + 6 + i * 2, y], [cx + 8 + i * 2, y - 4], [cx - 28 + i * 2, y - 4]], Art.grad(ctx, cx - 30, 0, cx + 8, 0, [[0, lit(c, 0.2)], [1, shd(c, 0.2)]]), INK2); ctx.strokeStyle = 'rgba(80,60,20,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 7; k++) { ctx.moveTo(cx - 27 + i * 2 + k * 5, y - 0.5); ctx.lineTo(cx - 26.5 + i * 2 + k * 5, y - 3.5); } ctx.stroke(); }
    // windmill
    const mx = cx + 22, my = cy + 6;
    contactShadow(ctx, mx, my + 1, 8, 3, 0.3);
    poly(ctx, [[mx - 6, my], [mx + 6, my], [mx + 4, my - 18], [mx - 4, my - 18]], Art.grad(ctx, mx - 6, 0, mx + 6, 0, [[0, '#d9c9a4'], [0.5, '#c9b48c'], [1, '#8a7a5a']]), INK);
    timber(ctx, proj(mx - 5, my), 10, 16, '#5a3b23');
    cone(ctx, mx, my - 18, 6, 6, '#8c3a33', { rows: 2 });
    door(ctx, mx, my, 3, 4.5, '#5a3b23', true);
    ctx.save(); ctx.translate(mx, my - 14); ctx.rotate(0.4); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); poly(ctx, [[0, 0], [2, -4], [2.5, -13], [-1, -13], [-1, -4]], 'rgba(240,230,210,0.9)', INK); line(ctx, 0, 0, 0.5, -13, '#5a3b23', 1); } ctx.restore(); circ(ctx, mx, my - 14, 1.2, '#5a3b23');
    // fence
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 8; i++) { const x = cx - 32 + i * 5; ctx.moveTo(x, cy + 13); ctx.lineTo(x, cy + 9); } ctx.moveTo(cx - 32, cy + 11); ctx.lineTo(cx + 3, cy + 11); ctx.stroke();
    if (lv >= 2) decor(ctx, 'hay', cx + 8, cy + 14, S.feudal, rng, 0);
  };
  IMPROVE.forester = function (ctx, cx, cy, rng, lv) {
    pineTree(ctx, cx - 30, cy - 2, 5); pineTree(ctx, cx + 30, cy - 6, 5.5); if (lv >= 2) pineTree(ctx, cx + 18, cy - 12, 4.5);
    // sawmill hut
    const p = proj(cx - 12, cy + 2); box(ctx, p, 18, 10, 8, '#8a6a44', { top: false, planks: 3 }); roofGableX(ctx, p, 18, 10, 8, 5, '#6f4f32', { wall: '#8a6a44' }); door(ctx, cx - 3, cy + 2, 3, 4.5, '#3a2a1a', false, '#ffd27a');
    // water wheel
    const wx = cx + 9, wy = cy - 3; circ(ctx, wx, wy, 6, 'rgba(0,0,0,0)', '#5a3b23'); ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(wx, wy, 6, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 6, wy + Math.sin(a) * 6); } ctx.stroke();
    // log piles
    for (let i = 0; i < 3 + lv; i++) { const x = cx + 14 + (i % 3) * 5, y = cy + 12 - Math.floor(i / 3) * 4; circ(ctx, x, y, 2.4, Art.rgrad(ctx, x - 0.5, y - 0.5, 0, 2.6, [[0, '#e8c898'], [1, '#8a5a34']]), INK); }
    for (let i = 0; i < 3; i++) { const x = cx - 30 + i * 12, y = cy + 12; ell(ctx, x, y, 2.6, 1.4, '#a07a4a', INK2); circ(ctx, x, y - 1, 1.8, '#c8a070', INK2); }
  };
  IMPROVE.quarry = function (ctx, cx, cy, rng, lv) {
    // pit
    ell(ctx, cx, cy + 4, 30, 12, Art.rgrad(ctx, cx + 6, cy + 6, 0, 30, [[0, '#5a5650'], [0.7, '#7a746c'], [1, '#9a958c']]), INK);
    // stepped blocks
    for (let i = 0; i < 3; i++) { const p = proj(cx - 22 + i * 4, cy + 8 - i * 4); box(ctx, p, 44 - i * 8, 6, 3.5, '#8a857c', { courses: 0 }); }
    for (let i = 0; i < 4 + lv; i++) { const p = proj(cx - 14 + (i % 3) * 9, cy + 12 - Math.floor(i / 3) * 5); box(ctx, p, 6, 4, 4, '#a39e95', {}); }
    // crane
    const kx = cx + 24, ky = cy + 8; line(ctx, kx, ky, kx, ky - 24, '#7a5a34', 2); line(ctx, kx, ky - 24, kx - 16, ky - 14, '#7a5a34', 1.6); line(ctx, kx, ky - 18, kx - 8, ky - 20, '#7a5a34', 1); line(ctx, kx - 14, ky - 15, kx - 14, ky - 4, '#3a3028', 1); ctx.fillStyle = '#a39e95'; ctx.fillRect(kx - 17, ky - 4, 6, 4); ctx.strokeStyle = INK; ctx.strokeRect(kx - 17, ky - 4, 6, 4);
  };
  IMPROVE.mine = function (ctx, cx, cy, rng, lv) {
    rock(ctx, cx - 4, cy - 8, 26, '#7a746c', 4); rock(ctx, cx + 20, cy - 2, 14, '#8a857c', 9);
    // timbered entrance
    door(ctx, cx - 6, cy + 4, 10, 12, '#5a4532', true, '#1a1410');
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 12, cy + 4); ctx.lineTo(cx - 12, cy - 8); ctx.lineTo(cx, cy - 8); ctx.lineTo(cx, cy + 4); ctx.moveTo(cx - 13, cy - 8); ctx.lineTo(cx + 1, cy - 8); ctx.stroke();
    glow(ctx, cx - 6, cy - 2, 5, '#ffb054', 0.5); lantern(ctx, cx + 3, cy - 6, 0);
    // rails & cart
    ctx.strokeStyle = '#5a5a62'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 8, cy + 4); ctx.lineTo(cx + 26, cy + 14); ctx.moveTo(cx - 4, cy + 4); ctx.lineTo(cx + 30, cy + 12); ctx.stroke();
    ctx.strokeStyle = '#7a5a34'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const t = i / 6; ctx.moveTo(M.lerp(cx - 8, cx + 26, t), M.lerp(cy + 4, cy + 14, t)); ctx.lineTo(M.lerp(cx - 4, cx + 30, t), M.lerp(cy + 4, cy + 12, t)); } ctx.stroke();
    const kx = cx + 12, ky = cy + 8; const p = proj(kx - 4, ky); box(ctx, p, 8, 5, 4.5, '#6a4a2a', { planks: 2.5 }); circ(ctx, kx - 2.5, ky + 1, 1.4, '#3a3028', INK2); circ(ctx, kx + 2.5, ky + 1, 1.4, '#3a3028', INK2); for (let i = 0; i < 3; i++) circ(ctx, kx - 2 + i * 2, ky - 5.5, 1.3, lv >= 2 ? '#f2c94c' : '#8a8a94', INK2);
    if (lv >= 3) decor(ctx, 'crates', cx - 22, cy + 12, S.feudal, rng, 0);
  };
  IMPROVE.research_post = function (ctx, cx, cy, rng, lv) {
    contactShadow(ctx, cx, cy + 2, 12, 5, 0.35);
    cylinder(ctx, cx, cy + 2, 7, 18, '#9a9083', { courses: 3.4, crenel: true });
    windowAt(ctx, cx - 1.4, cy - 10, 2.8, 4, '#c9a0ff', true);
    door(ctx, cx, cy + 2, 3.5, 5, '#5a3b23', true);
    // telescope on top
    ctx.save(); ctx.translate(cx + 1, cy - 19); ctx.rotate(-0.7); ctx.fillStyle = Art.grad(ctx, 0, -2, 0, 2, [[0, '#d8b04a'], [1, '#7a5a1e']]); ctx.fillRect(-3, -1.6, 12, 3.2); ctx.strokeStyle = INK; ctx.strokeRect(-3, -1.6, 12, 3.2); ctx.fillStyle = '#e8c357'; ctx.fillRect(7, -2.2, 3, 4.4); ctx.restore();
    line(ctx, cx + 1, cy - 19, cx - 2, cy - 15, '#5a5a62', 1.2); line(ctx, cx + 1, cy - 19, cx + 4, cy - 15, '#5a5a62', 1.2);
    // scroll banner + books
    line(ctx, cx + 12, cy + 4, cx + 12, cy - 10, '#5a4532', 1.2); poly(ctx, [[cx + 12, cy - 10], [cx + 19, cy - 9], [cx + 18, cy - 3], [cx + 12, cy - 2]], '#efe3c6', INK); ctx.strokeStyle = '#7a2e2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + 13.5, cy - 7); ctx.lineTo(cx + 17, cy - 7); ctx.moveTo(cx + 13.5, cy - 5); ctx.lineTo(cx + 17, cy - 5); ctx.stroke();
    for (let i = 0; i < 2 + lv; i++) { const x = cx - 20 + i * 5, y = cy + 6; ctx.fillStyle = ['#7a2e2a', '#2d4a7a', '#4f7a34', '#c9a24a'][i % 4]; ctx.fillRect(x - 2, y - 3, 4, 3); ctx.strokeStyle = INK2; ctx.strokeRect(x - 2, y - 3, 4, 3); }
    tree(ctx, cx - 22, cy + 2, 4);
  };
  IMPROVE.conduit = function (ctx, cx, cy, rng, lv) {
    ell(ctx, cx, cy + 2, 16, 6, '#8890a8', INK2);
    contactShadow(ctx, cx, cy + 3, 10, 4, 0.3);
    obelisk(ctx, cx, cy + 2, 4, 20, '#a9b7d0', null);
    ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = 1.2; ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 3; ctx.beginPath(); for (let i = 0; i < 3; i++) { const y = cy - 5 - i * 5; ctx.moveTo(cx - 1.5, y); ctx.lineTo(cx + 1.5, y - 2.5); ctx.moveTo(cx - 1.5, y - 2.5); ctx.lineTo(cx + 1.5, y); } ctx.stroke(); ctx.shadowBlur = 0;
    const ty = cy - 30;
    glow(ctx, cx, ty, 14, '#6ea8ff', 0.6);
    ctx.strokeStyle = 'rgba(200,225,255,0.9)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(cx, ty + 2, 9, 3, -0.3, 0, TAU); ctx.stroke();
    if (lv >= 2) { ctx.strokeStyle = 'rgba(120,180,255,0.8)'; ctx.beginPath(); ctx.ellipse(cx, ty, 6, 2, 0.5, 0, TAU); ctx.stroke(); }
    crystal(ctx, cx, ty + 5, 4, 9, '#7f9fff', 0);
    for (let i = 0; i < 3 + lv; i++) { const a = i / (3 + lv) * TAU, x = cx + Math.cos(a) * 13, y = cy + 2 + Math.sin(a) * 5; crystal(ctx, x, y, 2, 4 + (i % 2) * 2, '#7f9fff', (rng.next() - 0.5) * 0.6); }
  };
  IMPROVE.fishery = function (ctx, cx, cy, rng, lv) {
    water(ctx, cx + 6, cy + 8, 34, 11, '#3b95c0');
    // dock
    const p = proj(cx - 26, cy + 8); box(ctx, p, 30, 6, 2.5, '#8a6a44', { planks: 3 });
    ctx.strokeStyle = '#5a3b23'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 0; i < 4; i++) { const x = cx - 24 + i * 9; ctx.moveTo(x, cy + 9); ctx.lineTo(x, cy + 13); } ctx.stroke();
    // net rack
    line(ctx, cx - 22, cy + 5, cx - 22, cy - 10, '#5a3b23', 1.4); line(ctx, cx - 6, cy + 5, cx - 6, cy - 10, '#5a3b23', 1.4); line(ctx, cx - 22, cy - 9, cx - 6, cy - 9, '#5a3b23', 1.2);
    ctx.strokeStyle = 'rgba(230,220,200,0.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 6; i++) { ctx.moveTo(cx - 21 + i * 3, cy - 9); ctx.lineTo(cx - 21 + i * 3, cy - 1); } for (let i = 0; i < 4; i++) { ctx.moveTo(cx - 21, cy - 8 + i * 2.4); ctx.lineTo(cx - 6, cy - 8 + i * 2.4); } ctx.stroke();
    // hut
    const p2 = proj(cx + 2, cy); box(ctx, p2, 14, 8, 7, '#a88356', { top: false, planks: 3 }); roofGableX(ctx, p2, 14, 8, 7, 4, '#6f4f32', { wall: '#a88356' }); door(ctx, cx + 9, cy, 3, 4, '#3a2a1a', false, '#ffd27a');
    // boat
    const bx = cx + 22, by = cy + 12; poly(ctx, [[bx - 8, by - 3], [bx + 8, by - 3], [bx + 5, by + 1], [bx - 5, by + 1]], Art.grad(ctx, 0, by - 3, 0, by + 1, [[0, '#a07a4a'], [1, '#5a3b23']]), INK); line(ctx, bx, by - 3, bx, by - 12, '#5a3b23', 1.2); poly(ctx, [[bx, by - 12], [bx + 6, by - 8], [bx, by - 5]], '#efe3c6', INK2);
    if (lv >= 2) for (let i = 0; i < 3; i++) { const x = cx - 2 + i * 6, y = cy + 14; ell(ctx, x, y, 2.2, 1, '#c8d8e8', INK2); }
  };
  IMPROVE.hunters_lodge = function (ctx, cx, cy, rng, lv) {
    pineTree(ctx, cx - 32, cy - 4, 5); pineTree(ctx, cx + 30, cy - 8, 4.5);
    const p = proj(cx - 14, cy + 4); box(ctx, p, 24, 12, 9, '#7a5a3a', { top: false, planks: 3.2 });
    const r = roofGableX(ctx, p, 24, 12, 9, 7, '#5a4028', { wall: '#7a5a3a', rows: 5 });
    door(ctx, cx - 2, cy + 4, 3.5, 5, '#3a2a1a', false, '#ffb054');
    // antlers over the door
    ctx.strokeStyle = '#efe6d2'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 2, cy - 6); ctx.quadraticCurveTo(cx - 6, cy - 9, cx - 7, cy - 13); ctx.moveTo(cx - 5, cy - 8.5); ctx.lineTo(cx - 7, cy - 10); ctx.moveTo(cx - 2, cy - 6); ctx.quadraticCurveTo(cx + 2, cy - 9, cx + 3, cy - 13); ctx.moveTo(cx + 1, cy - 8.5); ctx.lineTo(cx + 3, cy - 10); ctx.stroke();
    // drying rack with pelts
    line(ctx, cx + 14, cy + 8, cx + 14, cy - 6, '#5a3b23', 1.4); line(ctx, cx + 28, cy + 8, cx + 28, cy - 6, '#5a3b23', 1.4); line(ctx, cx + 13, cy - 5, cx + 29, cy - 5, '#5a3b23', 1.2);
    for (let i = 0; i < 2 + Math.min(1, lv - 1); i++) { const x = cx + 16 + i * 5.5; poly(ctx, [[x, cy - 5], [x + 4.5, cy - 5], [x + 4, cy + 3], [x + 2, cy + 5], [x + 0.5, cy + 3]], i % 2 ? '#a07a4a' : '#6f4f32', INK); }
    fire(ctx, cx - 24, cy + 12, 2, 0);
    if (lv >= 3) skull(ctx, cx - 16, cy - 8, 2.2);
  };
  IMPROVE.vineyard = function (ctx, cx, cy, rng, lv) {
    // trellis rows
    for (let i = 0; i < 3 + Math.min(1, lv - 1); i++) {
      const y = cy + 10 - i * 6, x0 = cx - 30 + i * 3, x1 = cx + 4 + i * 3;
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k <= 4; k++) { const x = M.lerp(x0, x1, k / 4); ctx.moveTo(x, y); ctx.lineTo(x, y - 7); } ctx.moveTo(x0, y - 6); ctx.lineTo(x1, y - 6); ctx.moveTo(x0, y - 3); ctx.lineTo(x1, y - 3); ctx.stroke();
      for (let k = 0; k < 9; k++) { const x = M.lerp(x0, x1, (k + 0.5) / 9); circ(ctx, x, y - 4.5 + (k % 2) * 1.5, 2, Art.rgrad(ctx, x - 0.6, y - 5.5, 0, 2.4, [[0, '#8fd16a'], [1, '#3f7a30']]), INK2); if (k % 3 === 1) circ(ctx, x + 1, y - 2.5, 0.9, '#6a2f8c'); }
    }
    // press house
    const p = proj(cx + 12, cy + 6); box(ctx, p, 16, 10, 8, '#d9c9a4', { top: false }); roofGableZ(ctx, p, 16, 10, 8, 5, '#b5502f', { wall: '#d9c9a4' }); door(ctx, cx + 20, cy + 6, 3, 4.5, '#5a3b23', true);
    decor(ctx, 'barrel', cx + 32, cy + 8, S.feudal, rng, 0); decor(ctx, 'barrel', cx + 34, cy + 13, S.feudal, rng, 0);
  };
  IMPROVE.special = function (ctx, cx, cy, rng, lv) {
    ell(ctx, cx, cy + 4, 24, 9, '#7a7468', INK2);
    glow(ctx, cx, cy, 16, '#7fd8ff', 0.5);
    for (const [dx, dy, w, h, t] of [[-8, 4, 4, 9, -0.4], [7, 5, 3.5, 7, 0.4], [0, 2, 5, 12, 0]]) crystal(ctx, cx + dx, cy + dy, w, h, '#8fe0ff', t);
    // brass drill rig
    line(ctx, cx - 14, cy + 8, cx, cy - 22, '#c89b3c', 2); line(ctx, cx + 14, cy + 8, cx, cy - 22, '#c89b3c', 2); line(ctx, cx, cy + 12, cx, cy - 22, '#8a6a2a', 1.6);
    ctx.fillStyle = Art.grad(ctx, cx - 3, 0, cx + 3, 0, [[0, '#f5d76e'], [0.5, '#c89b3c'], [1, '#7a5a1e']]); ctx.fillRect(cx - 3, cy - 14, 6, 10); ctx.strokeStyle = INK; ctx.strokeRect(cx - 3, cy - 14, 6, 10);
    poly(ctx, [[cx - 2.2, cy - 4], [cx + 2.2, cy - 4], [cx, cy + 4]], '#8a8a94', INK);
    gear(ctx, cx - 9, cy - 8, 3, '#c89b3c'); if (lv >= 2) gear(ctx, cx + 9, cy - 4, 2.4, '#c89b3c');
    for (let i = 0; i < 3; i++) circ(ctx, cx + 4 + i * 2, cy - 24 - i * 3, 1.6 + i * 0.7, 'rgba(220,220,235,' + (0.35 - i * 0.08) + ')');
  };
  regSprite('struct:improve', () => ({ w: ISIZE.w, h: ISIZE.h }), (ctx, w, h, q) => {
    const cx = w / 2, cy = h - ISIZE.foot, rng = new AOW.RNG((q.seed | 0) * 17 + 9);
    groundPatch(ctx, cx, cy + 4, 40, 15, GROUND_COL[q.terrain] || GROUND_COL.grass, 0.7);
    contactShadow(ctx, cx, cy + 5, 30, 10, 0.25);
    (IMPROVE[q.kind] || IMPROVE.farm)(ctx, cx, cy, rng, M.clamp(q.lv | 0, 1, 3));
  });
  StructArt.drawImprovement = function (ctx, x, y, o) {
    o = o || {};
    Art.draw(ctx, 'struct:improve', x, y + ISIZE.foot, { kind: IMPROVE[o.kind] ? o.kind : 'farm', terrain: GROUND_COL[o.terrain] ? o.terrain : 'grass', seed: (o.seed | 0) || 1, lv: M.clamp((o.level | 0) || 1, 1, 3) });
  };

  // ================================================================ infestations
  const INFEST = {};
  const INFEST_META = {
    bandit_camp: { col: '#ff9a3a', f: [0, -8, 12] }, spider_nest: { col: '#8ad34a', f: [0, -20, 16] }, undead_barrow: { col: '#5fe6c0', f: [0, -10, 16] },
    elemental_rift: { col: '#ff8c1a', f: [0, -22, 22] }, dragon_lair: { col: '#ff6a1f', f: [0, -10, 20] }, goblin_warren: { col: '#ffb054', f: [0, -6, 12] },
    ogre_den: { col: '#ff9a3a', f: [10, -6, 12] }, harpy_roost: { col: '#ffd27a', f: [0, -40, 12] }, cultist_shrine: { col: '#ff2e2e', f: [0, -10, 16] }, lich_crypt: { col: '#b06aff', f: [0, -24, 16] },
  };
  StructArt.INFESTATIONS = Object.keys(INFEST_META);
  const XSIZE = { w: 116, h: 104, foot: 26 };
  INFEST.bandit_camp = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 50, 20, '#7a6a45');
    // stakes
    for (let i = 0; i < 7; i++) { const x = cx - 44 + i * 6, y = cy - 14 + (i % 2) * 1.5; line(ctx, x, y + 6, x, y - 6, '#6a4a2a', 2); poly(ctx, [[x - 1, y - 6], [x, y - 8.5], [x + 1, y - 6]], '#8a6a44'); }
    const st = { plaster: '#6a5a44', roof: '#4a3a2a', trim: '#3a2618', glowCol: '#ff9a3a' };
    HOUSES.tent(ctx, cx - 18, cy - 4, 14, 12, 8, st, rng); HOUSES.tent(ctx, cx + 20, cy - 2, 12, 10, 7, Object.assign({}, st, { plaster: '#5a4a3a' }), rng);
    fire(ctx, cx, cy + 6, 2.6, 0);
    // loot chest & skull pole & black flag
    ctx.fillStyle = '#7a5a34'; ctx.fillRect(cx + 8, cy + 8, 7, 5); ctx.fillStyle = '#c89b3c'; ctx.fillRect(cx + 8, cy + 8, 7, 1.5); ctx.strokeStyle = INK; ctx.strokeRect(cx + 8, cy + 8, 7, 5); for (let i = 0; i < 3; i++) circ(ctx, cx + 10 + i * 2, cy + 7.5, 1, '#f2c94c', INK2);
    line(ctx, cx - 30, cy + 10, cx - 30, cy - 8, '#5a4532', 1.4); skull(ctx, cx - 30, cy - 9, 2.6);
    line(ctx, cx + 34, cy + 6, cx + 34, cy - 20, '#3a2a1a', 1.4); poly(ctx, [[cx + 34, cy - 20], [cx + 44, cy - 18], [cx + 41, cy - 13], [cx + 44, cy - 9], [cx + 34, cy - 10]], '#1e1a22', INK); skull(ctx, cx + 38, cy - 14, 1.6);
    decor(ctx, 'crates', cx - 8, cy + 14, S.feudal, rng, 0);
  };
  INFEST.spider_nest = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 50, 20, '#3f4a38');
    deadTree(ctx, cx - 30, cy + 6, 36); deadTree(ctx, cx + 30, cy + 4, 32);
    // web between the trees
    const wx = cx, wy = cy - 26;
    ctx.strokeStyle = 'rgba(235,235,245,0.75)'; ctx.lineWidth = 0.9; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 26, wy + Math.sin(a) * 18); }
    for (let r = 1; r <= 4; r++) { for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU, x = wx + Math.cos(a) * 26 * r / 4.5, y = wy + Math.sin(a) * 18 * r / 4.5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }
    ctx.stroke();
    // egg sacs
    for (const [dx, dy, r] of [[-18, 4, 5], [12, 8, 4.5], [-4, 10, 3.5], [22, -4, 3]]) { ell(ctx, cx + dx, cy + dy, r, r * 1.2, Art.rgrad(ctx, cx + dx - r * 0.3, cy + dy - r * 0.5, 0, r * 1.4, [[0, '#f6f2e8'], [0.6, '#d8d2c4'], [1, '#8a8478']]), INK); }
    // spider
    const sx = wx + 6, sy = wy + 2;
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; for (let i = 0; i < 4; i++) { const a = -0.5 + i * 0.35; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + s * 6, sy - 4 + i * 2, sx + s * 9, sy + a * 4 + 2); ctx.stroke(); } }
    ell(ctx, sx, sy + 1, 4.5, 3.4, '#1e1a26', INK); circ(ctx, sx + 4, sy, 2.2, '#1e1a26', INK); if (!cl) { circ(ctx, sx + 5, sy - 0.8, 0.7, '#8ad34a'); circ(ctx, sx + 3.5, sy - 0.8, 0.7, '#8ad34a'); }
    if (!cl) glow(ctx, cx, cy - 2, 20, '#8ad34a', 0.25);
  };
  INFEST.undead_barrow = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 52, 22, '#55663f');
    // mound
    ctx.beginPath(); ctx.moveTo(cx - 44, cy + 6); ctx.quadraticCurveTo(cx - 20, cy - 36, cx + 10, cy - 34); ctx.quadraticCurveTo(cx + 36, cy - 30, cx + 44, cy + 6); ctx.closePath();
    fillPath(ctx, Art.grad(ctx, cx - 30, cy - 30, cx + 30, cy + 6, [[0, '#7a9a4a'], [0.5, '#5f7a3a'], [1, '#3a4a28']]), INK);
    ctx.fillStyle = 'rgba(40,60,30,0.3)'; for (let i = 0; i < 6; i++) ell(ctx, cx - 30 + i * 12, cy - 8 - (i % 2) * 8, 4, 1.6, 'rgba(40,60,30,0.3)');
    // standing stones flanking a dark door
    for (const s of [-1, 1]) poly(ctx, [[cx + s * 12 - 3, cy + 6], [cx + s * 12 - 2.5, cy - 12], [cx + s * 12, cy - 15], [cx + s * 12 + 2.5, cy - 12], [cx + s * 12 + 3, cy + 6]], Art.grad(ctx, cx + s * 12 - 3, 0, cx + s * 12 + 3, 0, [[0, '#8a8a80'], [1, '#4a4a48']]), INK);
    ctx.fillStyle = '#6a6a64'; ctx.fillRect(cx - 15, cy - 15, 30, 4); ctx.strokeStyle = INK; ctx.strokeRect(cx - 15, cy - 15, 30, 4);
    door(ctx, cx, cy + 6, 12, 15, '#1a1a1e', true, cl ? '#2a2a30' : '#1e6e5a');
    if (!cl) glow(ctx, cx, cy - 2, 14, '#5fe6c0', 0.5);
    for (const [dx, dy] of [[-36, 12], [-26, 16], [30, 14], [40, 8]]) tombstone(ctx, cx + dx, cy + dy, 5, 7, '#7a7a86');
    if (!cl) for (let i = 0; i < 4; i++) wisp(ctx, cx - 24 + i * 16 + rng.next() * 6, cy - 16 - rng.next() * 14, '#5fe6c0');
    skull(ctx, cx + 14, cy + 14, 2.2);
  };
  INFEST.elemental_rift = function (ctx, cx, cy, rng, cl) {
    const kinds = [['#ff8c1a', '#5a3020'], ['#7ad8ff', '#2a4a6a'], ['#ffe86a', '#4a4a2a']];
    const [col, gcol] = kinds[rng.int(0, 2)];
    groundPatch(ctx, cx, cy, 52, 22, gcol);
    // cracked ground
    ctx.strokeStyle = cl ? 'rgba(20,15,30,0.4)' : col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx - 30, cy + 8); ctx.lineTo(cx - 14, cy + 2); ctx.lineTo(cx - 4, cy + 6); ctx.lineTo(cx + 10, cy); ctx.lineTo(cx + 26, cy + 6); ctx.moveTo(cx - 6, cy + 6); ctx.lineTo(cx - 10, cy + 14); ctx.stroke();
    // the rift
    const ry = cy - 22;
    if (!cl) { glow(ctx, cx, ry, 30, col, 0.6); ctx.beginPath(); ctx.moveTo(cx - 22, ry); ctx.quadraticCurveTo(cx, ry - 14, cx + 22, ry); ctx.quadraticCurveTo(cx, ry + 14, cx - 22, ry); ctx.closePath(); fillPath(ctx, Art.rgrad(ctx, cx, ry, 0, 22, [[0, '#ffffff'], [0.3, lit(col, 0.5)], [1, rgbaOf(col, 0)]])); ctx.strokeStyle = lit(col, 0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 22, ry); ctx.lineTo(cx - 10, ry - 3); ctx.lineTo(cx - 2, ry + 2); ctx.lineTo(cx + 8, ry - 4); ctx.lineTo(cx + 22, ry); ctx.stroke(); }
    else { ctx.strokeStyle = shd(col, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 18, ry + 6); ctx.lineTo(cx - 6, ry + 3); ctx.lineTo(cx + 6, ry + 7); ctx.lineTo(cx + 18, ry + 4); ctx.stroke(); }
    // floating rocks orbiting
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.4, d = 26 + (i % 2) * 10, x = cx + Math.cos(a) * d, y = ry + Math.sin(a) * d * 0.55 + (cl ? 18 : 0); rock(ctx, x, y, 3 + rng.next() * 3, gcol === '#2a4a6a' ? '#7a8aa0' : '#6a6060', rng.int(1, 99)); if (!cl) { circ(ctx, x, y - 2, 0.9, col); } }
    if (!cl) for (let i = 0; i < 6; i++) { const x = cx - 24 + rng.next() * 48, y = ry - 10 + rng.next() * 24; glow(ctx, x, y, 3, col, 0.9); }
  };
  INFEST.dragon_lair = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 54, 22, '#6a5a50');
    // mountain with cave mouth
    ctx.beginPath(); ctx.moveTo(cx - 52, cy + 8); ctx.lineTo(cx - 30, cy - 26); ctx.lineTo(cx - 14, cy - 40); ctx.lineTo(cx + 4, cy - 30); ctx.lineTo(cx + 20, cy - 44); ctx.lineTo(cx + 36, cy - 20); ctx.lineTo(cx + 52, cy + 8); ctx.closePath();
    fillPath(ctx, Art.grad(ctx, cx - 40, cy - 40, cx + 40, cy + 8, [[0, '#9a8a80'], [0.5, '#6a5e58'], [1, '#3a3030']]), INK);
    ctx.fillStyle = '#eef3f6'; poly(ctx, [[cx - 20, cy - 33], [cx - 14, cy - 40], [cx - 8, cy - 34], [cx - 12, cy - 31]], '#eef3f6'); poly(ctx, [[cx + 14, cy - 36], [cx + 20, cy - 44], [cx + 27, cy - 34], [cx + 20, cy - 33]], '#eef3f6');
    ctx.strokeStyle = 'rgba(20,15,30,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 30, cy - 20); ctx.lineTo(cx - 22, cy - 10); ctx.moveTo(cx + 30, cy - 16); ctx.lineTo(cx + 24, cy - 6); ctx.stroke();
    // cave mouth
    ctx.beginPath(); ctx.moveTo(cx - 16, cy + 8); ctx.quadraticCurveTo(cx - 14, cy - 18, cx + 2, cy - 18); ctx.quadraticCurveTo(cx + 18, cy - 18, cx + 18, cy + 8); ctx.closePath();
    fillPath(ctx, Art.rgrad(ctx, cx + 1, cy + 2, 0, 20, [[0, cl ? '#2a2020' : '#7a2a10'], [0.5, '#1a1214'], [1, '#0e0a0c']]), INK);
    if (!cl) { glow(ctx, cx + 1, cy - 2, 16, '#ff6a1f', 0.6); ell(ctx, cx - 4, cy - 6, 1.6, 1, '#ffe08a'); ell(ctx, cx + 6, cy - 6, 1.6, 1, '#ffe08a'); }
    // claw marks & bones & gold
    ctx.strokeStyle = 'rgba(20,10,10,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(cx - 34 + i * 3, cy - 14); ctx.lineTo(cx - 30 + i * 3, cy - 2); } ctx.stroke();
    for (let i = 0; i < 4; i++) { const x = cx - 40 + i * 24 + rng.next() * 6, y = cy + 12 + rng.next() * 6; line(ctx, x - 3, y, x + 3, y - 1, '#e6dcc2', 1.4); circ(ctx, x - 3, y, 1, '#e6dcc2'); circ(ctx, x + 3, y - 1, 1, '#e6dcc2'); }
    skull(ctx, cx + 30, cy + 10, 3);
    for (let i = 0; i < 7; i++) { const x = cx - 10 + rng.next() * 22, y = cy + 6 + rng.next() * 8; circ(ctx, x, y, 1.2, '#f2c94c', INK2); circ(ctx, x - 0.3, y - 0.3, 0.4, '#fff6c0'); }
    if (!cl) for (let i = 0; i < 3; i++) circ(ctx, cx + 6 + i * 3, cy - 22 - i * 5, 3 + i * 1.5, 'rgba(60,50,50,' + (0.4 - i * 0.1) + ')');
  };
  INFEST.goblin_warren = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 52, 22, '#8a7a55');
    // dirt mound with burrow holes
    ctx.beginPath(); ctx.moveTo(cx - 44, cy + 8); ctx.quadraticCurveTo(cx - 24, cy - 22, cx, cy - 20); ctx.quadraticCurveTo(cx + 28, cy - 22, cx + 44, cy + 8); ctx.closePath();
    fillPath(ctx, Art.grad(ctx, cx - 30, cy - 20, cx + 30, cy + 8, [[0, '#a8905a'], [0.5, '#8a7048'], [1, '#5a4830']]), INK);
    for (const [dx, dy, r] of [[-22, -2, 5], [4, -8, 5.5], [26, -1, 4.5]]) { ell(ctx, cx + dx, cy + dy, r, r * 0.7, Art.rgrad(ctx, cx + dx, cy + dy, 0, r, [[0, '#1a1410'], [1, '#3a2c20']]), INK); if (!cl) { circ(ctx, cx + dx - 1.5, cy + dy - 0.5, 0.7, '#ffe86a'); circ(ctx, cx + dx + 1.5, cy + dy - 0.5, 0.7, '#ffe86a'); } }
    // rickety watchtower
    const tx = cx + 34, ty = cy + 4; line(ctx, tx - 4, ty, tx - 3, ty - 20, '#7a5a34', 1.6); line(ctx, tx + 4, ty, tx + 3, ty - 20, '#7a5a34', 1.6); line(ctx, tx - 4, ty - 8, tx + 4, ty - 12, '#7a5a34', 1); ctx.fillStyle = '#8a6a44'; ctx.fillRect(tx - 6, ty - 22, 12, 3); ctx.strokeStyle = INK; ctx.strokeRect(tx - 6, ty - 22, 12, 3); poly(ctx, [[tx - 7, ty - 22], [tx, ty - 28], [tx + 7, ty - 22]], '#5a4a3a', INK);
    // junk totems (poles with pots and rags)
    for (const dx of [-36, -8, 14]) { const x = cx + dx, y = cy + 10; line(ctx, x, y, x + 1, y - 16, '#5a4532', 1.4); circ(ctx, x + 1, y - 16, 2.4, rng.pick(['#8a3a2a', '#3a5a8a', '#6a6a3a']), INK); poly(ctx, [[x + 1, y - 12], [x + 6, y - 11], [x + 5, y - 6], [x + 1, y - 7]], rng.pick(['#c8402a', '#e8c357']), INK2); }
    // torches
    for (const dx of [-16, 20]) { const x = cx + dx, y = cy + 8; line(ctx, x, y, x, y - 8, '#5a4532', 1.4); if (!cl) { glow(ctx, x, y - 10, 6, '#ffb054', 0.8); poly(ctx, [[x - 1.5, y - 8], [x, y - 12.5], [x + 1.5, y - 8]], '#ffd27a'); } }
    decor(ctx, 'bones', cx - 26, cy + 14, S.feudal, rng, 0);
  };
  INFEST.ogre_den = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 54, 22, '#6f6a48');
    // hill with a big cave
    ctx.beginPath(); ctx.moveTo(cx - 50, cy + 8); ctx.quadraticCurveTo(cx - 34, cy - 30, cx - 4, cy - 32); ctx.quadraticCurveTo(cx + 30, cy - 34, cx + 50, cy + 8); ctx.closePath();
    fillPath(ctx, Art.grad(ctx, cx - 30, cy - 30, cx + 30, cy + 8, [[0, '#8a9a5a'], [0.5, '#6f7a48'], [1, '#3f4a2a']]), INK);
    ctx.beginPath(); ctx.moveTo(cx - 20, cy + 8); ctx.quadraticCurveTo(cx - 18, cy - 18, cx, cy - 18); ctx.quadraticCurveTo(cx + 18, cy - 18, cx + 20, cy + 8); ctx.closePath();
    fillPath(ctx, Art.rgrad(ctx, cx, cy + 4, 0, 22, [[0, '#2a2420'], [1, '#0e0a0c']]), INK);
    // bone pile in front and giant club leaning
    for (let i = 0; i < 8; i++) { const x = cx - 14 + rng.next() * 28, y = cy + 8 + rng.next() * 8; line(ctx, x - 3, y, x + 3, y - 1.5, '#e6dcc2', 1.6); circ(ctx, x - 3, y, 1.1, '#e6dcc2'); circ(ctx, x + 3, y - 1.5, 1.1, '#e6dcc2'); }
    skull(ctx, cx + 4, cy + 10, 3.2); skull(ctx, cx - 10, cy + 14, 2.4);
    ctx.save(); ctx.translate(cx + 30, cy + 8); ctx.rotate(-0.5); poly(ctx, [[-2, 0], [2, 0], [4, -18], [6, -26], [0, -30], [-5, -26], [-3, -18]], Art.grad(ctx, -5, 0, 6, 0, [[0, '#a07a4a'], [1, '#4a3020']]), INK); for (let i = 0; i < 4; i++) circ(ctx, -2 + i * 2.5, -24 + (i % 2) * 3, 1, '#8a8a94', INK2); ctx.restore();
    // cauldron on fire
    const fx = cx - 34, fy = cy + 12; fire(ctx, fx, fy, 2.2, 0); ell(ctx, fx, fy - 8, 5, 3.6, Art.rgrad(ctx, fx - 2, fy - 10, 0, 6, [[0, '#5a5a62'], [1, '#22222a']]), INK); ell(ctx, fx, fy - 11, 5, 1.6, '#4a7a3a', INK2); for (let i = 0; i < 3; i++) circ(ctx, fx + i * 2 - 1, fy - 14 - i * 3, 1.6 + i * 0.6, 'rgba(160,200,120,' + (0.4 - i * 0.1) + ')');
    if (!cl) { glow(ctx, cx, cy, 10, '#ff9a3a', 0.4); circ(ctx, cx - 4, cy - 6, 1, '#ffe86a'); circ(ctx, cx + 4, cy - 6, 1, '#ffe86a'); }
  };
  INFEST.harpy_roost = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 50, 22, '#8a857c');
    const col = '#8a857c';
    pinnacle(ctx, cx, cy, 30, 62, col, rng);
    // nests on ledges
    for (const [dx, dy] of [[-12, -30], [10, -46], [4, -8]]) { ell(ctx, cx + dx, cy + dy, 8, 3, '#8a6a3a', INK); ctx.strokeStyle = '#5a3b23'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = rng.next() * TAU; ctx.moveTo(cx + dx + Math.cos(a) * 7, cy + dy + Math.sin(a) * 2.6); ctx.lineTo(cx + dx + Math.cos(a) * 9 + 1, cy + dy + Math.sin(a) * 2.6 - 2); } ctx.stroke(); ell(ctx, cx + dx, cy + dy - 0.5, 6, 2, '#3a2a1a'); for (let i = 0; i < 2; i++) ell(ctx, cx + dx - 2 + i * 4, cy + dy - 1.5, 1.8, 2.2, '#e8dcc2', INK2); }
    // feathers & bones
    for (let i = 0; i < 6; i++) { const x = cx - 40 + i * 16 + rng.next() * 6, y = cy - 4 - rng.next() * 40; ctx.strokeStyle = i % 2 ? '#e8e0d0' : '#b06a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y - 4, x + 5, y - 7); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { const x = cx - 36 + i * 24 + rng.next() * 6, y = cy + 12 + rng.next() * 6; line(ctx, x - 3, y, x + 3, y - 1, '#e6dcc2', 1.4); circ(ctx, x - 3, y, 1, '#e6dcc2'); circ(ctx, x + 3, y - 1, 1, '#e6dcc2'); }
    // harpy silhouette circling
    if (!cl) { ctx.strokeStyle = '#2a2430'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx + 22, cy - 66); ctx.quadraticCurveTo(cx + 28, cy - 72, cx + 34, cy - 66); ctx.quadraticCurveTo(cx + 40, cy - 72, cx + 46, cy - 66); ctx.stroke(); circ(ctx, cx + 34, cy - 65, 1.6, '#2a2430'); }
    skull(ctx, cx + 26, cy + 8, 2.6);
  };
  INFEST.cultist_shrine = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 50, 22, '#4a3a3a');
    // stone platform
    const p = proj(cx - 26, cy + 8); box(ctx, p, 52, 22, 3, '#5a5058', { courses: 0 });
    // hooded statue at the back
    const sx = cx + 16, sy = cy - 6; poly(ctx, [[sx - 5, sy], [sx - 4, sy - 12], [sx - 2, sy - 20], [sx, sy - 24], [sx + 2, sy - 20], [sx + 4, sy - 12], [sx + 5, sy]], Art.grad(ctx, sx - 5, 0, sx + 5, 0, [[0, '#5a5566'], [1, '#2a2632']]), INK); ell(ctx, sx, sy - 19, 2.2, 2.8, '#0e0a10');
    if (!cl) { circ(ctx, sx - 0.8, sy - 19.5, 0.6, '#ff2e2e'); circ(ctx, sx + 0.8, sy - 19.5, 0.6, '#ff2e2e'); }
    // altar with rift
    const ax = cx - 10, ay = cy + 2; const pa = proj(ax - 8, ay); box(ctx, pa, 16, 8, 6, '#3a3038', { courses: 0 });
    if (!cl) { glow(ctx, ax, ay - 8, 18, '#ff2e2e', 0.7); ctx.strokeStyle = '#fff0e0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax - 8, ay - 7); ctx.lineTo(ax - 3, ay - 10); ctx.lineTo(ax + 1, ay - 7); ctx.lineTo(ax + 5, ay - 11); ctx.lineTo(ax + 9, ay - 8); ctx.stroke(); ctx.strokeStyle = '#ff2e2e'; ctx.lineWidth = 3; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1; }
    // candles
    for (let i = 0; i < 6; i++) { const x = cx - 40 + i * 16 + rng.next() * 4, y = cy + 12 + (i % 2) * 3; ctx.fillStyle = '#efe6d2'; ctx.fillRect(x - 1, y - 5, 2, 5); if (!cl) { glow(ctx, x, y - 6.5, 4, '#ffb054', 0.8); circ(ctx, x, y - 6, 0.9, '#ffe08a'); } }
    // red banners
    for (const dx of [-42, 42]) { line(ctx, cx + dx, cy + 8, cx + dx, cy - 22, '#2a2226', 1.4); poly(ctx, [[cx + dx, cy - 22], [cx + dx + 7, cy - 21], [cx + dx + 6, cy - 6], [cx + dx + 3.5, cy - 3], [cx + dx, cy - 6]], cl ? '#5a3a3a' : '#8a1a1a', INK); ctx.fillStyle = '#e8c357'; circ(ctx, cx + dx + 3.5, cy - 14, 1.2, '#e8c357'); }
  };
  INFEST.lich_crypt = function (ctx, cx, cy, rng, cl) {
    groundPatch(ctx, cx, cy, 52, 22, '#3a3a48');
    deadTree(ctx, cx - 44, cy + 4, 26);
    const col = '#2e2a3a', w = 30, d = 20, h = 20;
    const p = proj(cx - w / 2 - d * KX / 2, cy + d * KZ / 2 - 2);
    box(ctx, p, w, d, h, col, { top: false, courses: 3.4 });
    ctx.strokeStyle = 'rgba(120,100,160,0.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 1; i < 3; i++) { const a = p(w * i / 3, 0.5, 0), b = p(w * i / 3, h - 0.5, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    const r = roofGableZ(ctx, p, w, d, h, 14, '#1e1a28', { wall: col, rows: 5 });
    line(ctx, r.apexFront[0], r.apexFront[1], r.apexFront[0], r.apexFront[1] - 7, '#8a8a94', 1.3);
    const dr = p(w / 2, 0, 0); door(ctx, dr[0], dr[1], 6, 10, '#0e0a14', true, cl ? '#2a2a34' : '#5a2a8a');
    skull(ctx, dr[0], dr[1] - 15, 3);
    // purple flame urns
    for (const dx of [-24, 26]) brazier(ctx, cx + dx, cy + 12, cl ? '#5a5a70' : '#b06aff');
    // phylactery glow above
    if (!cl) { glow(ctx, r.apexFront[0], r.apexFront[1] - 12, 12, '#b06aff', 0.7); crystal(ctx, r.apexFront[0], r.apexFront[1] - 8, 3, 7, '#d8a8ff', 0); for (let i = 0; i < 4; i++) wisp(ctx, cx - 20 + i * 14 + rng.next() * 6, cy - 10 - rng.next() * 20, '#b06aff'); }
    for (const [dx, dy] of [[-34, 14], [36, 12], [-14, 18]]) tombstone(ctx, cx + dx, cy + dy, 5, 7, '#5a5a6a');
  };
  regSprite('struct:infest', () => ({ w: XSIZE.w, h: XSIZE.h }), (ctx, w, h, q) => {
    const fn = INFEST[q.kind] || INFEST.bandit_camp, meta = INFEST_META[q.kind] || INFEST_META.bandit_camp;
    const cx = w / 2, cy = h - XSIZE.foot, rng = new AOW.RNG((q.seed | 0) * 23 + 7);
    contactShadow(ctx, cx, cy + 4, 46, 16, 0.3);
    fn(ctx, cx, cy, rng, !!q.cl);
    moodPass(ctx, w, h, cx + meta.f[0], cy + meta.f[1], meta.col, !!q.cl, rng, 5);
  });
  StructArt.drawInfestation = function (ctx, x, y, o) {
    o = o || {};
    const kind = INFEST[o.kind] ? o.kind : 'bandit_camp', meta = INFEST_META[kind];
    Art.draw(ctx, 'struct:infest', x, y + XSIZE.foot, { kind, cl: o.cleared ? 1 : 0, seed: (o.seed | 0) || 1 });
    if (!o.cleared) {
      const f = ((o.frame | 0) % 4 + 4) % 4, a = 0.3 + 0.14 * Math.sin(f * Math.PI / 2);
      const g = Art.get('struct:glow', { r: meta.f[2], c: meta.col });
      ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(g.cv, Math.round(x + meta.f[0] - meta.f[2]), Math.round(y + meta.f[1] - meta.f[2])); ctx.restore();
    }
  };

  // ================================================================ teleporter
  const TSIZE = { w: 96, h: 100, foot: 24 };
  regSprite('struct:teleporter', () => ({ w: TSIZE.w, h: TSIZE.h }), (ctx, w, h, q) => {
    const cx = w / 2, cy = h - TSIZE.foot, col = q.c || '#5a7ff0', f = q.f | 0, rng = new AOW.RNG((q.seed | 0) * 3 + 1);
    // plaza rings
    ell(ctx, cx, cy + 2, 36, 13, '#6a6f88', INK2); ell(ctx, cx, cy + 2, 26, 9, '#7d829c', INK2); ell(ctx, cx, cy + 2, 14, 5, '#8e93ad', INK2);
    ctx.strokeStyle = rgbaOf(col, q.on ? 0.8 : 0.3); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 30, 11, 0, 0, TAU); ctx.stroke();
    // rune marks on the plaza
    ctx.strokeStyle = rgbaOf(lit(col, 0.5), q.on ? 0.9 : 0.35); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + f * 0.2, x = cx + Math.cos(a) * 30, y = cy + 2 + Math.sin(a) * 11; ctx.beginPath(); ctx.moveTo(x - 1.5, y); ctx.lineTo(x + 1.5, y - 2); ctx.moveTo(x - 1.5, y - 2); ctx.lineTo(x + 1.5, y); ctx.stroke(); }
    contactShadow(ctx, cx, cy + 4, 22, 8, 0.3);
    // portal swirl inside the arch
    const py = cy - 24;
    if (q.on) {
      glow(ctx, cx, py, 30, col, 0.5);
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, py, 15, 21, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = Art.rgrad(ctx, cx, py, 0, 22, [[0, '#ffffff'], [0.25, lit(col, 0.5)], [0.7, col], [1, shd(col, 0.5)]]); ctx.fillRect(cx - 16, py - 22, 32, 44);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.3; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * TAU * 1.5 + k * TAU / 3 + f * Math.PI / 2, r = t * 20; const x = cx + Math.cos(a) * r * 0.7, y = py + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.restore();
    } else { ctx.save(); ctx.beginPath(); ctx.ellipse(cx, py, 15, 21, 0, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(30,30,50,0.5)'; ctx.fillRect(cx - 16, py - 22, 32, 44); ctx.restore(); }
    // stone arch
    const stone = '#6f7590';
    ctx.beginPath(); ctx.ellipse(cx, py, 21, 27, 0, 0, TAU); ctx.ellipse(cx, py, 15, 21, 0, 0, TAU, true);
    ctx.fillStyle = Art.grad(ctx, cx - 21, py - 27, cx + 21, py + 27, [[0, lit(stone, 0.4)], [0.5, stone], [1, shd(stone, 0.5)]]); ctx.fill('evenodd');
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, py, 21, 27, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, py, 15, 21, 0, 0, TAU); ctx.stroke();
    // ring segments
    ctx.strokeStyle = 'rgba(20,15,30,0.3)'; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 15, py + Math.sin(a) * 21); ctx.lineTo(cx + Math.cos(a) * 21, py + Math.sin(a) * 27); ctx.stroke(); }
    // glowing runes on the arch
    ctx.strokeStyle = q.on ? lit(col, 0.6) : rgbaOf(col, 0.4); ctx.lineWidth = 1.2; if (q.on) { ctx.shadowColor = col; ctx.shadowBlur = 4; } for (let i = 0; i < 6; i++) { const a = Math.PI + i / 5 * Math.PI, x = cx + Math.cos(a) * 18, y = py + Math.sin(a) * 24; ctx.beginPath(); ctx.moveTo(x - 1.5, y + 1.5); ctx.lineTo(x + 1.5, y - 1.5); ctx.moveTo(x - 1.5, y - 1.5); ctx.lineTo(x + 1.5, y + 1.5); ctx.stroke(); } ctx.shadowBlur = 0;
    // keystone crystal + base blocks
    crystal(ctx, cx, py - 27, 3.5, 7, lit(col, 0.3), 0);
    for (const s of [-1, 1]) { const p = proj(cx + s * 24 - 5, cy + 4); box(ctx, p, 10, 7, 6, stone, { courses: 3 }); }
    if (q.on) for (let i = 0; i < 7; i++) { const a = rng.next() * TAU + f * 0.7, d = 8 + rng.next() * 30; const x = cx + Math.cos(a) * d, y = py + Math.sin(a) * d * 0.9; glow(ctx, x, y, 2.5, '#ffffff', 0.9); }
  }, { noGrain: true });
  StructArt.drawTeleporter = function (ctx, x, y, o) {
    o = o || {};
    Art.draw(ctx, 'struct:teleporter', x, y + TSIZE.foot, { f: ((o.frame | 0) % 4 + 4) % 4, on: o.active === false ? 0 : 1, c: o.color || '#5a7ff0', seed: (o.seed | 0) || 1 });
  };

  // ================================================================ battle wall segments
  regSprite('struct:wall', q => q.vert ? { w: Math.ceil(q.size * 1.3), h: Math.ceil(q.size * 1.9) } : { w: Math.ceil(q.size * 1.9), h: Math.ceil(q.size * 1.4) }, (ctx, w, h, q) => {
    const st = S[q.style] || S.feudal, hp = q.hp / 4, size = q.size;
    const col = st.wallKind === 'palisade' ? '#8a6a44' : st.wallKind === 'iron' ? '#4a4a54' : st.wallKind === 'marble' ? '#e8e0d0' : st.wallKind === 'sand' ? '#d2b07a' : st.wall;
    const wh = size * 0.55, thick = size * 0.28, rng = new AOW.RNG(q.seed | 0);
    const rubble = (x0, x1, y) => { for (let i = 0; i < 8; i++) rock(ctx, M.lerp(x0, x1, rng.next()), y - rng.next() * 6, 2.5 + rng.next() * 3, col, rng.int(1, 99)); };
    if (!q.vert) {
      const x0 = 2, x1 = w - 2, base = h - 6;
      contactShadow(ctx, w / 2, base, w * 0.5, 8, 0.35);
      if (hp <= 0) { rubble(x0, x1, base); return; }
      const hh = wh * (0.6 + 0.4 * hp);
      const p = proj(x0, base);
      box(ctx, p, x1 - x0, thick, hh, col, { courses: 4, topColor: lit(col, 0.2) });
      const a = p(0, hh, 0), b = p(x1 - x0, hh, 0);
      if (hp > 0.3) crenels(ctx, a[0], b[0], a[1], 3.2, 3.6, col);
      if (q.gate) { const gx = w / 2, gy = base; ctx.fillStyle = shd(col, 0.15); ctx.fillRect(gx - size * 0.3, gy - hh - 5, size * 0.6, hh + 5); ctx.strokeStyle = INK; ctx.strokeRect(gx - size * 0.3, gy - hh - 5, size * 0.6, hh + 5); crenels(ctx, gx - size * 0.3, gx + size * 0.3, gy - hh - 5, 3, 3.4, col); if (hp > 0.35) { door(ctx, gx, gy, size * 0.36, hh - 2, '#4a3320', true); line(ctx, gx, gy, gx, gy - hh + 4, INK, 1); ctx.fillStyle = '#8a8a94'; for (let i = 0; i < 3; i++) { ctx.fillRect(gx - size * 0.15, gy - 4 - i * (hh - 8) / 2, size * 0.3, 1.5); } } else { door(ctx, gx, gy, size * 0.36, hh - 2, '#1a1410', true); rubble(gx - 8, gx + 8, gy); } }
      if (hp < 0.75) { ctx.strokeStyle = 'rgba(10,8,16,0.6)'; ctx.lineWidth = 1.3; ctx.beginPath(); for (let i = 0; i < 3; i++) { const x = x0 + (x1 - x0) * (0.2 + i * 0.3); ctx.moveTo(x, base - 2); ctx.lineTo(x + 3, base - hh * 0.5); ctx.lineTo(x - 1, base - hh * 0.8); } ctx.stroke(); }
      if (hp < 0.5) rubble(x0, x1, base + 2);
    } else {
      // vertical segment: runs away from the viewer (top of the sprite = far end). We see the narrow lit walkway on top
      // and the long shaded east face beside it, plus the near end face at the bottom.
      const base = h - 8, top = 8, len = base - top, tw = thick;
      contactShadow(ctx, w / 2, base, tw * 1.5, 10, 0.3);
      if (hp <= 0) { for (let i = 0; i < 6; i++) rubble(w / 2 - 8, w / 2 + 8, top + i * len / 6 + 4); return; }
      const hh = wh * (0.6 + 0.4 * hp), x0 = w / 2 - tw / 2 - hh * 0.25;
      // east face (parallelogram: bottom-right of the walkway)
      poly(ctx, [[x0 + tw, base - hh], [x0 + tw + hh * 0.5, base - hh * 0.5], [x0 + tw + hh * 0.5, top - hh * 0.5], [x0 + tw, top - hh]], shd(col, 0.38), INK);
      ctx.strokeStyle = 'rgba(20,15,30,0.14)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 4; k < hh * 0.5; k += 4) { ctx.moveTo(x0 + tw + k, top - hh + k); ctx.lineTo(x0 + tw + k, base - hh + k); } ctx.stroke();
      // near end face
      const pe = proj(x0, base); poly(ctx, [pe(0, 0, 0), pe(tw, 0, 0), pe(tw, hh, 0), pe(0, hh, 0)], Art.grad(ctx, 0, base - hh, 0, base, [[0, lit(col, 0.16)], [1, shd(col, 0.12)]]), INK);
      courses(ctx, pe, tw, hh, 4, 'rgba(20,15,30,0.14)');
      // walkway on top
      poly(ctx, [[x0, base - hh], [x0 + tw, base - hh], [x0 + tw, top - hh], [x0, top - hh]], lit(col, 0.22), INK);
      if (hp > 0.3) for (let y = top - hh + 2; y < base - hh - 2; y += 7) { ctx.fillStyle = lit(col, 0.32); ctx.fillRect(x0 - 1.5, y, 3, 3.5); ctx.fillRect(x0 + tw - 1.5, y, 3, 3.5); ctx.strokeStyle = INK2; ctx.strokeRect(x0 - 1, y + 0.5, 2, 2.5); ctx.strokeRect(x0 + tw - 1, y + 0.5, 2, 2.5); }
      if (q.gate) { // gatehouse block straddling the wall, its arch opening on the east face
        const gy = top + len * 0.5 + 10, gw = tw + 6, gd = 20, gh = hh + 5;
        const pg = proj(x0 - 3, gy);
        box(ctx, pg, gw, gd, gh, col, { courses: 4, topColor: lit(col, 0.22) });
        const a = pg(0, gh, 0), b = pg(gw, gh, 0); crenels(ctx, a[0], b[0], a[1], 2.6, 3, col);
        const e = pg(gw, 0, gd * 0.5); door(ctx, e[0] + 1, e[1] + 1, size * 0.2, hh * 0.75, hp > 0.35 ? '#4a3320' : '#1a1410', true);
      }
      if (hp < 0.75) { ctx.strokeStyle = 'rgba(10,8,16,0.6)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x0 + tw + 2, top + 10); ctx.lineTo(x0 + tw + 6, top + 22); ctx.lineTo(x0 + tw + 3, top + 34); ctx.stroke(); }
      if (hp < 0.5) rubble(x0 - 6, x0 + tw + hh * 0.5 + 6, base + 2);
    }
  });
  StructArt.drawWall = function (ctx, x, y, o) {
    o = o || {};
    const size = o.size || 44, hp = M.clamp(Math.round((o.hp === undefined ? 1 : o.hp) * 4), 0, 4);
    const q = { hp, gate: o.gate ? 1 : 0, vert: o.vertical ? 1 : 0, size, style: StructArt.styleFor(o), seed: (o.seed | 0) || 1 };
    // horizontal: the wall's ground line sits just below the hex centre; vertical: the segment is centred on the hex
    Art.draw(ctx, 'struct:wall', x, y + (o.vertical ? size * 0.95 : size * 0.4), q);
  };

  // ================================================================ demo gallery
  function demoBackground(ctx, w, h) {
    ctx.fillStyle = Art.grad(ctx, 0, 0, 0, h, [[0, '#5f8a3a'], [1, '#4f7a34']]); ctx.fillRect(0, 0, w, h);
    Art.noiseFill(ctx, 0, 0, w, h, { seed: 5, scale: 6, colors: ['#5c8a3c', '#7aa64a'], alpha: 0.35, size: 128 });
  }
  function demoHex(ctx, x, y) { Art.hexPath(ctx, x, y, AOW.Hex.SIZE); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke(); }
  function label(ctx, s, x, y, size) { Art.text(ctx, s, x, y, { size: size || 10, color: '#f4ecd6', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3, weight: '600' }); }

  StructArt.demo = function (canvas, q) {
    canvas.width = 1600; canvas.height = 1800;
    const ctx = canvas.getContext('2d');
    demoBackground(ctx, canvas.width, canvas.height);
    const t0 = performance.now();
    const cultures = StructArt.STYLES;
    const players = AOW.Palette.players;
    const frame = q && q.get && +q.get('frame') || 0;
    // ---- cities (left column block)
    Art.text(ctx, 'CITIES — 11 styles × tier 0–5 (T2 palisade, T3 stone, T4+ great walls, T5 capital)', 12, 14, { size: 12, color: '#f4ecd6', align: 'left', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3 });
    cultures.forEach((cid, row) => {
      const y = 78 + row * 156;
      Art.text(ctx, cid, 8, y - 46, { size: 11, color: '#ffe9a8', align: 'left', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 3 });
      for (let tier = 0; tier <= 5; tier++) {
        const x = 76 + tier * 142;
        demoHex(ctx, x, y);
        const o = { cultureId: cid, tier, walls: tier >= 3 ? (tier >= 4 ? 3 : 2) : (tier === 2 ? 1 : 0), isCapital: tier === 5, playerColor: players[row % players.length], seed: 100 + row * 17 + tier, frame };
        StructArt.drawCity(ctx, x, y, o);
        label(ctx, 'T' + tier + (o.walls ? ' w' + o.walls : '') + (o.isCapital ? ' ★' : ''), x, y + StructArt.cityLabelOffset(o).y);
      }
    });
    // ---- right block
    const RX = 900;
    Art.text(ctx, 'ANCIENT WONDERS — uncleared (ominous) / cleared (peaceful)', RX, 14, { size: 12, color: '#f4ecd6', align: 'left', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3 });
    StructArt.WONDER_LOOKS.forEach((look, i) => {
      const col = i % 5, row = Math.floor(i / 5);
      const x = RX + 60 + col * 138, y = 140 + row * 172;
      demoHex(ctx, x, y);
      StructArt.drawWonder(ctx, x, y, { look, cleared: false, seed: 7 + i, frame, variant: i % 4 });
      label(ctx, look, x, y + 34);
    });
    // cleared versions of five of them beside the last row
    ['golden_ruins', 'grove', 'shrine', 'wizard_tower', 'crypt', 'pyramid'].forEach((look, i) => {
      const x = RX + 60 + (i + 4) % 5 * 138 + (i >= 1 ? 0 : 0), y = 140 + (i === 0 ? 2 : 3) * 172;
      demoHex(ctx, x, y);
      StructArt.drawWonder(ctx, x, y, { look, cleared: true, seed: 7 + i, frame, variant: i % 4 });
      label(ctx, look + ' ✓', x, y + 34);
    });
    // ---- nodes
    let y0 = 830;
    Art.text(ctx, 'RESOURCE NODES + MAGIC MATERIALS (improved: rig + lantern)', RX, y0 - 30, { size: 12, color: '#f4ecd6', align: 'left', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3 });
    StructArt.NODE_RESOURCES.forEach((res, i) => { const x = RX + 44 + i * 84; demoHex(ctx, x, y0); StructArt.drawNode(ctx, x, y0, { resource: res, improved: i % 2 === 1, seed: 3 + i }); label(ctx, res, x, y0 + 30); });
    StructArt.MATERIALS.forEach((mat, i) => { const x = RX + 44 + (i % 8) * 84, y = y0 + 84 + Math.floor(i / 8) * 80; demoHex(ctx, x, y); StructArt.drawNode(ctx, x, y, { resource: i < 3 ? ['gold', 'mana', 'production'][i] : null, magicMaterial: mat, improved: i === 9, seed: 11 + i }); label(ctx, mat, x, y + 30); });
    // ---- improvements
    y0 = 1090;
    Art.text(ctx, 'PROVINCE IMPROVEMENTS (level 1–3, terrain tint)', RX, y0 - 30, { size: 12, color: '#f4ecd6', align: 'left', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3 });
    const terr = ['grass', 'forest', 'hills', 'mountain', 'grass', 'snow', 'coast', 'forest', 'grass', 'desert'];
    StructArt.IMPROVEMENTS.forEach((kind, i) => { const x = RX + 46 + (i % 5) * 136, y = y0 + Math.floor(i / 5) * 92; demoHex(ctx, x, y); StructArt.drawImprovement(ctx, x, y, { kind, terrain: terr[i], seed: 5 + i, level: 1 + (i % 3) }); label(ctx, kind + ' L' + (1 + i % 3), x, y + 30); });
    // ---- infestations
    y0 = 1300;
    Art.text(ctx, 'INFESTATIONS (spawner sites)', RX, y0 - 34, { size: 12, color: '#f4ecd6', align: 'left', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3 });
    StructArt.INFESTATIONS.forEach((kind, i) => { const x = RX + 60 + (i % 5) * 138, y = y0 + Math.floor(i / 5) * 118; demoHex(ctx, x, y); StructArt.drawInfestation(ctx, x, y, { kind, seed: 9 + i, frame }); label(ctx, kind, x, y + 32); });
    // ---- free cities, outpost, teleporter, walls
    y0 = 1600;
    Art.text(ctx, 'FREE CITIES (neutral banners) · OUTPOST · TELEPORTER · SIEGE WALL SEGMENTS (hp 1 / 0.5 / 0, gate, vertical)', RX, y0 - 56, { size: 12, color: '#f4ecd6', align: 'left', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 3 });
    [['oathsworn', 2], ['high', 3], ['barbarian', 1]].forEach(([cid, tier], i) => { const x = RX + 60 + i * 130; demoHex(ctx, x, y0); StructArt.drawFreeCity(ctx, x, y0, { cultureId: cid, tier, seed: 40 + i, frame }); label(ctx, 'free ' + cid + ' T' + tier, x, y0 + 30); });
    { const x = RX + 450; demoHex(ctx, x, y0); StructArt.drawOutpost(ctx, x, y0, { cultureId: 'industrious', playerColor: players[3], seed: 77, frame }); label(ctx, 'outpost', x, y0 + 30); }
    { const x = RX + 560; demoHex(ctx, x, y0); StructArt.drawTeleporter(ctx, x, y0, { seed: 1, frame }); label(ctx, 'teleporter', x, y0 + 30); }
    const wy = y0 + 120;
    [[1, false], [0.5, false], [0, false], [1, true], [0.4, true]].forEach(([hp, gate], i) => { const x = RX + 50 + i * 100; StructArt.drawWall(ctx, x, wy, { hp, gate, size: 44, cultureId: 'feudal' }); label(ctx, 'wall ' + hp + (gate ? ' gate' : ''), x, wy + 30); });
    StructArt.drawWall(ctx, RX + 580, wy - 12, { hp: 1, vertical: true, size: 44, cultureId: 'feudal' }); label(ctx, 'vertical', RX + 580, wy + 30);
    StructArt.drawWall(ctx, RX + 650, wy - 12, { hp: 0.6, vertical: true, gate: true, size: 44, cultureId: 'dark' }); label(ctx, 'vert gate', RX + 650, wy + 30);
    const st = StructArt.stats();
    return 'sprites ' + st.count + ' avg ' + st.avgMs.toFixed(2) + 'ms max ' + st.maxMs.toFixed(2) + 'ms (' + st.slowest + ') total ' + (performance.now() - t0).toFixed(0) + 'ms';
  };

  AOW.StructArt = StructArt;
})(window.AOW = window.AOW || {});
