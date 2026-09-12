// src/art/vfx.js — AOW.VFX: pooled particle & spell-effect system shared by the world and combat renderers
//
// Public API (world coordinates; the caller has already applied the camera transform before draw):
//   VFX.spawn(kind, x, y, params) → {id, done, cancel()}        params: color, scale, seed, duration, persistent,
//                                                               intensity, dir, w, h (ambient area), radius, size
//   VFX.update(dt)                    advance all effects (dt in seconds, clamped to 0.1)
//   VFX.draw(ctx, layer)              layer 'below' (ground decals) | 'above' (particles, beams, text) | undefined = both
//   VFX.drawScreen(ctx, w, h)         screen-space overlays (flashes, vignette pulses) — call with identity transform
//   VFX.projectile(kind, x0,y0, x1,y1, params) → Promise resolved on impact (params.color, duration, arc, onHit)
//   VFX.text(x, y, str, {color, size, crit, rise})  floating damage/heal numbers
//   VFX.flash(color, duration)        full-screen flash;  VFX.pulse(color, duration) vignette pulse
//   VFX.clear() / VFX.count() / VFX.kinds() / VFX.demo(canvas)
// Additive helpers (documented here per SPEC §0): VFX.effectCount(), VFX.stress(n) (fills the pool for perf tests),
//   VFX.sprite(shape, color, size, variant) (cached particle sprite lookup), VFX.PROJECTILES (list of projectile kinds).
// Ambient kinds (snow, rain, leaves, embers, mist) treat (x, y) as the TOP-LEFT of a params.w × params.h area.
(function (AOW) {
  'use strict';
  const VFX = {};
  const M = AOW.M, C = AOW.Color, Art = AOW.Art;
  const TAU = Math.PI * 2;
  const EMPTY = {};

  // ================================================================ rng
  class MathRng {
    next() { return Math.random(); }
    float(a, b) { return a + (b - a) * Math.random(); }
    int(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    chance(p) { return Math.random() < p; }
  }
  const MRNG = new MathRng();
  function rngFor(params) { return params && params.seed !== undefined ? new AOW.RNG(params.seed) : MRNG; }

  // ================================================================ sprites (cached via Art.sprite)
  const mixW = (c, t) => C.mix(c, '#ffffff', t);
  const mixK = (c, t) => C.mix(c, '#140d1c', t);
  const SIZES = [8, 12, 16, 24, 32, 48, 64, 96, 128, 192];
  function quant(s) { for (let i = 0; i < SIZES.length; i++) if (SIZES[i] >= s) return SIZES[i]; return 192; }
  const sprCache = new Map();
  /** cached sprite entry {cv, kx, ky}: kx/ky = width/height as a fraction of the larger dimension */
  function spr(shape, color, size, variant) {
    const s = quant(size || 16), v = variant | 0;
    const k = shape + '|' + color + '|' + s + '|' + v;
    let e = sprCache.get(k);
    if (!e) {
      const a = Art.get('vfx:' + shape, { c: color, s, i: v });
      const mx = Math.max(a.w, a.h);
      e = { cv: a.cv, w: a.w, h: a.h, kx: a.w / mx, ky: a.h / mx };
      sprCache.set(k, e);
    }
    return e;
  }
  VFX.sprite = spr;
  function reg(name, aspect, fn) {
    Art.sprite('vfx:' + name, 32, 32, fn, { anchor: { x: 0.5, y: 0.5 }, sizeFn: p => ({ w: Math.max(2, Math.round(p.s * aspect)), h: p.s }) });
  }
  function glowStops(c) { return [[0, mixW(c, 0.9)], [0.15, mixW(c, 0.5)], [0.4, C.alpha(c, 0.6)], [0.7, C.alpha(c, 0.14)], [1, C.alpha(c, 0)]]; }

  reg('glow', 1, (ctx, w, h, p) => {
    const r = w / 2;
    ctx.fillStyle = Art.rgrad(ctx, r, r, 0, r, glowStops(p.c));
    ctx.fillRect(0, 0, w, h);
  });
  reg('ember', 0.6, (ctx, w, h, p) => {
    const core = mixW(p.c, 0.85), mid = p.c, edge = C.alpha(mixK(p.c, 0.3), 0);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(w / h, 1);
    ctx.fillStyle = Art.rgrad(ctx, 0, 0, 0, h / 2, [[0, core], [0.25, mixW(mid, 0.3)], [0.55, C.alpha(mid, 0.6)], [1, edge]]);
    ctx.beginPath(); ctx.arc(0, 0, h / 2, 0, TAU); ctx.fill(); ctx.restore();
  });
  reg('streak', 0.25, (ctx, w, h, p) => {
    ctx.fillStyle = Art.grad(ctx, 0, 0, w, 0, [[0, C.alpha(p.c, 0)], [0.3, C.alpha(p.c, 0.5)], [0.5, mixW(p.c, 0.9)], [0.7, C.alpha(p.c, 0.5)], [1, C.alpha(p.c, 0)]]);
    ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = Art.grad(ctx, 0, 0, w, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
    ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.35, h * 0.25, 0, 0, TAU); ctx.fill();
  });
  reg('shard', 0.45, (ctx, w, h, p) => {
    const light = mixW(p.c, 0.75), dark = mixK(p.c, 0.25);
    ctx.shadowColor = C.alpha(p.c, 0.8); ctx.shadowBlur = w * 0.35;
    ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.9, h * 0.32); ctx.lineTo(w * 0.72, h); ctx.lineTo(w * 0.28, h); ctx.lineTo(w * 0.1, h * 0.32); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, 0, 0, w, h, [[0, light], [0.45, p.c], [1, dark]]); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, w * 0.08);
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.02); ctx.lineTo(w * 0.12, h * 0.33); ctx.lineTo(w * 0.3, h * 0.96); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.05); ctx.lineTo(w * 0.5, h * 0.9); ctx.stroke();
  });
  reg('leaf', 1, (ctx, w, h, p) => {
    const base = p.c, light = mixW(base, 0.35), dark = mixK(base, 0.4);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate((p.i % 4) * 0.4 - 0.6); ctx.translate(-w / 2, -h / 2);
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.05); ctx.quadraticCurveTo(w * 0.98, h * 0.38, w * 0.5, h * 0.95); ctx.quadraticCurveTo(w * 0.02, h * 0.38, w * 0.5, h * 0.05); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, w * 0.1, h * 0.1, w * 0.9, h * 0.9, [[0, light], [0.5, base], [1, dark]]); ctx.fill();
    ctx.strokeStyle = 'rgba(20,15,30,0.45)'; ctx.lineWidth = Math.max(1, w * 0.05); ctx.stroke();
    ctx.strokeStyle = C.alpha(dark, 0.7); ctx.lineWidth = Math.max(1, w * 0.045);
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.1); ctx.quadraticCurveTo(w * 0.55, h * 0.5, w * 0.5, h * 0.92); ctx.stroke();
    for (let k = 0; k < 3; k++) { const y = h * (0.3 + k * 0.18); ctx.beginPath(); ctx.moveTo(w * 0.5, y); ctx.lineTo(w * 0.72, y + h * 0.12); ctx.moveTo(w * 0.5, y); ctx.lineTo(w * 0.28, y + h * 0.12); ctx.stroke(); }
    ctx.restore();
  });
  reg('rune', 1, (ctx, w, h, p) => {
    const u = v => v * w;
    const i = p.i % 8;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => {
      ctx.beginPath();
      switch (i) {
        case 0: ctx.moveTo(u(0.5), u(0.14)); ctx.lineTo(u(0.86), u(0.82)); ctx.lineTo(u(0.14), u(0.82)); ctx.closePath(); ctx.moveTo(u(0.5), u(0.38)); ctx.lineTo(u(0.5), u(0.82)); break;
        case 1: ctx.arc(u(0.5), u(0.5), u(0.3), 0, TAU); ctx.moveTo(u(0.5), u(0.08)); ctx.lineTo(u(0.5), u(0.92)); ctx.moveTo(u(0.2), u(0.5)); ctx.lineTo(u(0.8), u(0.5)); break;
        case 2: ctx.moveTo(u(0.25), u(0.15)); ctx.lineTo(u(0.75), u(0.15)); ctx.lineTo(u(0.25), u(0.5)); ctx.lineTo(u(0.75), u(0.5)); ctx.lineTo(u(0.25), u(0.85)); ctx.lineTo(u(0.75), u(0.85)); break;
        case 3: ctx.moveTo(u(0.5), u(0.1)); ctx.lineTo(u(0.88), u(0.5)); ctx.lineTo(u(0.5), u(0.9)); ctx.lineTo(u(0.12), u(0.5)); ctx.closePath(); ctx.moveTo(u(0.58), u(0.5)); ctx.arc(u(0.5), u(0.5), u(0.08), 0, TAU); break;
        case 4: ctx.moveTo(u(0.5), u(0.88)); ctx.lineTo(u(0.5), u(0.45)); ctx.lineTo(u(0.18), u(0.14)); ctx.moveTo(u(0.5), u(0.45)); ctx.lineTo(u(0.82), u(0.14)); ctx.moveTo(u(0.28), u(0.88)); ctx.lineTo(u(0.72), u(0.88)); break;
        case 5: ctx.arc(u(0.5), u(0.5), u(0.34), Math.PI * 1.15, Math.PI * 1.85); ctx.moveTo(u(0.5) + u(0.34) * Math.cos(Math.PI * 0.15), u(0.5) + u(0.34) * Math.sin(Math.PI * 0.15)); ctx.arc(u(0.5), u(0.5), u(0.34), Math.PI * 0.15, Math.PI * 0.85); ctx.moveTo(u(0.5), u(0.25)); ctx.lineTo(u(0.5), u(0.75)); break;
        case 6: ctx.moveTo(u(0.2), u(0.2)); ctx.lineTo(u(0.8), u(0.2)); ctx.lineTo(u(0.8), u(0.8)); ctx.lineTo(u(0.32), u(0.8)); ctx.lineTo(u(0.32), u(0.42)); ctx.lineTo(u(0.6), u(0.42)); ctx.lineTo(u(0.6), u(0.62)); break;
        default: ctx.moveTo(u(0.5), u(0.88)); ctx.lineTo(u(0.5), u(0.12)); ctx.moveTo(u(0.24), u(0.38)); ctx.lineTo(u(0.5), u(0.12)); ctx.lineTo(u(0.76), u(0.38)); ctx.moveTo(u(0.3), u(0.66)); ctx.lineTo(u(0.7), u(0.66));
      }
    };
    ctx.shadowColor = p.c; ctx.shadowBlur = w * 0.3;
    ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(1.5, w * 0.11); path(); ctx.stroke(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = mixW(p.c, 0.8); ctx.lineWidth = Math.max(1, w * 0.05); path(); ctx.stroke();
  });
  reg('feather', 0.42, (ctx, w, h, p) => {
    ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.quadraticCurveTo(w * 1.05, h * 0.45, w * 0.55, h); ctx.quadraticCurveTo(w * 0.15, h * 0.7, w * 0.5, 0); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, 0, 0, w, h, [[0, 'rgba(255,255,255,0.95)'], [0.6, mixW(p.c, 0.75)], [1, C.alpha(mixW(p.c, 0.4), 0.7)]]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(190,175,150,0.8)'; ctx.lineWidth = Math.max(1, w * 0.07);
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.05); ctx.quadraticCurveTo(w * 0.62, h * 0.5, w * 0.55, h); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,190,170,0.35)'; ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) { const y = h * (0.15 + k * 0.13); ctx.beginPath(); ctx.moveTo(w * 0.55, y); ctx.lineTo(w * 0.9, y + h * 0.1); ctx.moveTo(w * 0.55, y); ctx.lineTo(w * 0.22, y + h * 0.1); ctx.stroke(); }
  });
  reg('puff', 1, (ctx, w, h, p) => {
    const r = new AOW.RNG(p.i * 7 + 3);
    const n = 6;
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + r.next() * 1.2, d = w * (0.1 + r.next() * 0.16);
      const cx = w / 2 + Math.cos(a) * d, cy = h / 2 + Math.sin(a) * d, rr = w * (0.24 + r.next() * 0.14);
      ctx.fillStyle = Art.rgrad(ctx, cx, cy, 0, rr, [[0, C.alpha(p.c, 0.42)], [0.5, C.alpha(p.c, 0.2)], [1, C.alpha(p.c, 0)]]);
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = Art.rgrad(ctx, w * 0.42, h * 0.4, 0, w * 0.3, [[0, C.alpha(mixW(p.c, 0.35), 0.35)], [1, C.alpha(p.c, 0)]]);
    ctx.fillRect(0, 0, w, h);
  });
  reg('drop', 0.55, (ctx, w, h, p) => {
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.bezierCurveTo(w, h * 0.55, w, h, w / 2, h); ctx.bezierCurveTo(0, h, 0, h * 0.55, w / 2, 0); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, 0, 0, w, h, [[0, mixW(p.c, 0.6)], [0.5, p.c], [1, mixK(p.c, 0.3)]]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(w * 0.36, h * 0.62, w * 0.12, h * 0.14, -0.3, 0, TAU); ctx.fill();
  });
  reg('flake', 1, (ctx, w, h, p) => {
    const r = w / 2 * 0.9, cx = w / 2, cy = h / 2, i = p.i % 4;
    ctx.strokeStyle = mixW(p.c, 0.85); ctx.lineWidth = Math.max(1, w * 0.06); ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,255,255,0.8)'; ctx.shadowBlur = w * 0.12;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + ca * r, cy + sa * r);
      for (let b = 0; b < 2; b++) {
        const d = r * (0.45 + b * 0.3 + i * 0.03), bl = r * (0.28 - b * 0.08);
        const bx = cx + ca * d, by = cy + sa * d;
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 1.05) * bl, by + Math.sin(a + 1.05) * bl);
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a - 1.05) * bl, by + Math.sin(a - 1.05) * bl);
      }
    }
    ctx.stroke();
  });
  reg('petal', 0.7, (ctx, w, h, p) => {
    ctx.beginPath(); ctx.moveTo(w / 2, h * 0.96); ctx.quadraticCurveTo(-w * 0.15, h * 0.45, w * 0.5, h * 0.04); ctx.quadraticCurveTo(w * 1.15, h * 0.45, w / 2, h * 0.96); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, w / 2, 0, w / 2, h, [[0, mixW(p.c, 0.7)], [0.6, p.c], [1, mixK(p.c, 0.25)]]); ctx.fill();
    ctx.strokeStyle = 'rgba(20,15,30,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  });
  reg('star', 1, (ctx, w, h, p) => {
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = Art.rgrad(ctx, cx, cy, 0, w / 2, [[0, C.alpha(p.c, 0.7)], [0.4, C.alpha(p.c, 0.2)], [1, C.alpha(p.c, 0)]]); ctx.fillRect(0, 0, w, h);
    const arm = (len, wid, rot) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.beginPath(); ctx.moveTo(0, -len); ctx.lineTo(wid, 0); ctx.lineTo(0, len); ctx.lineTo(-wid, 0); ctx.closePath();
      ctx.moveTo(-len, 0); ctx.lineTo(0, wid); ctx.lineTo(len, 0); ctx.lineTo(0, -wid); ctx.closePath(); ctx.fill(); ctx.restore();
    };
    ctx.fillStyle = mixW(p.c, 0.55); arm(w * 0.3, w * 0.06, Math.PI / 4);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; arm(w * 0.48, w * 0.07, 0);
  });
  reg('spore', 1, (ctx, w, h, p) => {
    const cx = w / 2, cy = h / 2, r = new AOW.RNG(p.i + 11);
    ctx.fillStyle = Art.rgrad(ctx, cx, cy, 0, w * 0.38, [[0, mixW(p.c, 0.3)], [0.45, C.alpha(p.c, 0.8)], [1, C.alpha(p.c, 0)]]); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.alpha(mixK(p.c, 0.35), 0.8);
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + r.next(); const d = w * (0.22 + r.next() * 0.16); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, w * 0.06, 0, TAU); ctx.fill(); }
  });
  reg('bubble', 1, (ctx, w, h, p) => {
    const cx = w / 2, cy = h / 2, r = w * 0.4;
    ctx.fillStyle = C.alpha(mixW(p.c, 0.2), 0.18); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.alpha(mixW(p.c, 0.5), 0.85); ctx.lineWidth = Math.max(1, w * 0.07); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1, w * 0.06); ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
  });
  reg('rock', 1, (ctx, w, h, p) => {
    const r = new AOW.RNG(p.i * 13 + 5), cx = w / 2, cy = h / 2;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + r.next() * 0.5, d = w * (0.28 + r.next() * 0.18); const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, 0, 0, w, h, [[0, mixW(p.c, 0.45)], [0.5, p.c], [1, mixK(p.c, 0.5)]]); ctx.fill();
    ctx.strokeStyle = 'rgba(20,15,30,0.55)'; ctx.lineWidth = Math.max(1, w * 0.05); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,15,30,0.25)'; ctx.beginPath(); ctx.moveTo(cx - w * 0.2, cy - h * 0.1); ctx.lineTo(cx + w * 0.05, cy + h * 0.05); ctx.lineTo(cx + w * 0.2, cy - h * 0.15); ctx.stroke();
  });
  reg('chevron', 1, (ctx, w, h, p) => {
    ctx.shadowColor = p.c; ctx.shadowBlur = w * 0.25;
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.12); ctx.lineTo(w * 0.92, h * 0.55); ctx.lineTo(w * 0.74, h * 0.74); ctx.lineTo(w * 0.5, h * 0.48); ctx.lineTo(w * 0.26, h * 0.74); ctx.lineTo(w * 0.08, h * 0.55); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, 0, 0, 0, h, [[0, mixW(p.c, 0.8)], [0.5, p.c], [1, mixK(p.c, 0.3)]]); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.stroke();
  });
  reg('flower', 1, (ctx, w, h, p) => {
    const cx = w / 2, cy = h / 2;
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * TAU - Math.PI / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(w * 0.26, 0, w * 0.24, w * 0.14, 0, 0, TAU);
      ctx.fillStyle = Art.grad(ctx, 0, 0, w * 0.5, 0, [[0, mixW(p.c, 0.1)], [1, mixW(p.c, 0.7)]]); ctx.fill();
      ctx.strokeStyle = 'rgba(20,15,30,0.3)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = Art.rgrad(ctx, cx, cy, 0, w * 0.13, [[0, '#fff6c0'], [1, '#e9b53a']]); ctx.beginPath(); ctx.arc(cx, cy, w * 0.13, 0, TAU); ctx.fill();
  });
  reg('ring', 1, (ctx, w, h, p) => {
    const cx = w / 2, cy = h / 2;
    ctx.shadowColor = p.c; ctx.shadowBlur = w * 0.12;
    ctx.strokeStyle = mixW(p.c, 0.6); ctx.lineWidth = Math.max(1, w * 0.07);
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.42, 0, TAU); ctx.stroke();
  });
  reg('fly', 1, (ctx, w, h, p) => {
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = mixK(p.c, 0.7); ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.18, w * 0.12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(220,230,240,0.5)'; ctx.beginPath(); ctx.ellipse(cx - w * 0.14, cy - w * 0.14, w * 0.2, w * 0.09, -0.6, 0, TAU); ctx.ellipse(cx + w * 0.14, cy - w * 0.14, w * 0.2, w * 0.09, 0.6, 0, TAU); ctx.fill();
  });

  // ================================================================ particle pool
  const parts = [];       // pooled particle objects; the first pn are live
  let pn = 0;
  function newPart() {
    return { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, life: 1, max: 1, s0: 8, s1: 8, sc: 0, a0: 1, a1: 0, fin: 0, flick: 0,
      rot: 0, rv: 0, sp: null, add: false, below: false, wob: 0, wf: 0, ph: 0, mode: 0, ox: 0, oy: 0, orr: 0, orv: 0, orb: 0, ell: 1, str: 0, die: 0 };
  }
  const T = newPart();    // spawn template (reset by P(), copied into the pool by add())
  function P(x, y, sp, life) {
    const p = T;
    p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.ax = 0; p.ay = 0; p.drag = 0; p.life = p.max = life;
    p.s0 = 8; p.s1 = 8; p.sc = 0; p.a0 = 1; p.a1 = 0; p.fin = 0; p.flick = 0; p.rot = 0; p.rv = 0; p.sp = sp; p.add = false; p.below = false;
    p.wob = 0; p.wf = 0; p.ph = 0; p.mode = 0; p.ox = x; p.oy = y; p.orr = 0; p.orv = 0; p.orb = 0; p.ell = 1; p.str = 0; p.die = 0;
    return p;
  }
  function add() {
    let d;
    if (pn < parts.length) d = parts[pn]; else { d = newPart(); parts.push(d); }
    pn++;
    const s = T;
    d.x = s.x; d.y = s.y; d.vx = s.vx; d.vy = s.vy; d.ax = s.ax; d.ay = s.ay; d.drag = s.drag; d.life = s.life; d.max = s.max;
    d.s0 = s.s0; d.s1 = s.s1; d.sc = s.sc; d.a0 = s.a0; d.a1 = s.a1; d.fin = s.fin; d.flick = s.flick; d.rot = s.rot; d.rv = s.rv; d.sp = s.sp;
    d.add = s.add; d.below = s.below; d.wob = s.wob; d.wf = s.wf; d.ph = s.ph; d.mode = s.mode; d.ox = s.ox; d.oy = s.oy; d.orr = s.orr; d.orv = s.orv;
    d.orb = s.orb; d.ell = s.ell; d.str = s.str; d.die = s.die;
    return d;
  }
  /** radial velocity helper */
  function vel(p, ang, spd) { p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd; }

  function onDie(p) {
    const x = p.x, y = p.y, k = p.die;
    if (k === 1) {           // rain splash
      const q = P(x, y, SP.ringRain, 0.3); q.s0 = 2; q.s1 = 10; q.a0 = 0.6; q.a1 = 0; q.sc = 1; add();
      for (let i = 0; i < 2; i++) { const d = P(x, y, SP.dropRain, 0.28); d.vx = (MRNG.next() - 0.5) * 40; d.vy = -40 - MRNG.next() * 40; d.ay = 400; d.s0 = 3; d.s1 = 2; d.a0 = 0.8; add(); }
    } else if (k === 2) {    // bubble pop
      const q = P(x, y, SP.ringPoison, 0.2); q.s0 = 4; q.s1 = 9; q.a0 = 0.7; q.a1 = 0; q.add = true; add();
    }
  }

  function updateParticles(dt) {
    for (let i = 0; i < pn;) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        pn--; parts[i] = parts[pn]; parts[pn] = p;
        if (p.die) onDie(p);
        continue;
      }
      if (p.mode === 0) {
        if (p.ax !== 0) p.vx += p.ax * dt;
        if (p.ay !== 0) p.vy += p.ay * dt;
        if (p.drag !== 0) { const k = 1 - Math.min(1, p.drag * dt); p.vx *= k; p.vy *= k; }
        if (p.wob !== 0) { p.ph += p.wf * dt; p.x += Math.cos(p.ph) * p.wob * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else {
        p.ph += p.orb * dt; p.orr += p.orv * dt; if (p.orr < 0) p.orr = 0;
        p.ox += p.vx * dt; p.oy += p.vy * dt;
        p.x = p.ox + Math.cos(p.ph) * p.orr; p.y = p.oy + Math.sin(p.ph) * p.orr * p.ell;
      }
      if (p.rv !== 0) p.rot += p.rv * dt;
      i++;
    }
  }

  function drawParticles(ctx, below) {
    if (pn === 0) return;
    const m = ctx.getTransform();
    const ma = m.a, mb = m.b, mc = m.c, md = m.d, me = m.e, mf = m.f;
    for (let pass = 0; pass < 2; pass++) {
      const addPass = pass === 1;
      ctx.globalCompositeOperation = addPass ? 'lighter' : 'source-over';
      for (let i = 0; i < pn; i++) {
        const p = parts[i];
        if (p.add !== addPass || p.below !== below) continue;
        const t = 1 - p.life / p.max;
        let a = p.a0 + (p.a1 - p.a0) * t;
        if (p.fin > 0 && t < p.fin) a *= t / p.fin;
        if (p.flick !== 0) a *= 1 - p.flick * (0.5 + 0.5 * Math.sin(p.life * 41 + p.ph));
        if (a <= 0.004) continue;
        let k;
        if (p.sc === 1) k = 1 - (1 - t) * (1 - t); else if (p.sc === 2) k = Math.sin(t * Math.PI); else if (p.sc === 3) k = t * t; else k = t;
        const s = p.s0 + (p.s1 - p.s0) * k;
        if (s <= 0.2) continue;
        ctx.globalAlpha = a > 1 ? 1 : a;
        const sp = p.sp;
        if (p.rot !== 0 || p.str !== 0) {
          let rot = p.rot, len = s * sp.kx;
          if (p.str !== 0) { rot = Math.atan2(p.vy, p.vx); const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy); len *= Math.min(5, 1 + p.str * spd * 0.01); }
          const cs = Math.cos(rot), sn = Math.sin(rot);
          ctx.setTransform(ma * cs + mc * sn, mb * cs + md * sn, mc * cs - ma * sn, md * cs - mb * sn, ma * p.x + mc * p.y + me, mb * p.x + md * p.y + mf);
          ctx.drawImage(sp.cv, -len / 2, -s * sp.ky / 2, len, s * sp.ky);
          ctx.setTransform(ma, mb, mc, md, me, mf);
        } else {
          const dw = s * sp.kx, dh = s * sp.ky;
          ctx.drawImage(sp.cv, p.x - dw / 2, p.y - dh / 2, dw, dh);
        }
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // shared sprites resolved lazily (after Art is ready and on first use)
  let SP = null;
  function initSprites() {
    SP = {
      ringRain: spr('ring', '#cfe6ff', 16), dropRain: spr('drop', '#bcd8ff', 8), ringPoison: spr('ring', '#b6f06a', 16),
      white: spr('glow', '#ffffff', 32), star: spr('star', '#fff6d0', 32),
    };
  }

  // @@PART2@@
})(window.AOW = window.AOW || {});
