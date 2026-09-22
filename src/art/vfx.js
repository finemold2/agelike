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
      rot: 0, rv: 0, sp: null, add: false, below: false, wob: 0, wf: 0, ph: 0, mode: 0, ox: 0, oy: 0, orr: 0, orv: 0, orb: 0, ell: 1, str: 0, die: 0, sy: 1 };
  }
  // particle fields: s0/s1 size start→end with curve sc (0 linear, 1 ease-out, 2 grow-then-shrink, 3 ease-in); a0/a1 alpha, fin = fade-in
  // fraction, flick = flicker amount; rot/rv rotation; add = additive; below = ground layer; wob/wf sideways wobble amplitude/frequency;
  // mode 1 = orbit around (ox,oy) with radius orr (Δ orv/s), angular speed orb, vertical squash ell; str = stretch along velocity;
  // die = spawn something on death (1 rain splash, 2 bubble pop); sy = draw-height squash (ground-plane rings/decals).
  const T = newPart();    // spawn template (reset by P(), copied into the pool by add())
  function P(x, y, sp, life) {
    const p = T;
    p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.ax = 0; p.ay = 0; p.drag = 0; p.life = p.max = life;
    p.s0 = 8; p.s1 = 8; p.sc = 0; p.a0 = 1; p.a1 = 0; p.fin = 0; p.flick = 0; p.rot = 0; p.rv = 0; p.sp = sp; p.add = false; p.below = false;
    p.wob = 0; p.wf = 0; p.ph = 0; p.mode = 0; p.ox = x; p.oy = y; p.orr = 0; p.orv = 0; p.orb = 0; p.ell = 1; p.str = 0; p.die = 0; p.sy = 1;
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

  // ================================================================ jagged lightning bolts (drawn as raw polylines, not sprites)
  const bolts = [];
  function makeZigzag(x0, y0, x1, y1, rng, segs, jitter) {
    const pts = [[x0, y0]];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const bx = M.lerp(x0, x1, t), by = M.lerp(y0, y1, t);
      const dx = x1 - x0, dy = y1 - y0, nl = Math.hypot(dx, dy) || 1;
      const off = (rng.next() - 0.5) * jitter;
      pts.push([bx + (-dy / nl) * off, by + (dx / nl) * off]);
    }
    pts.push([x1, y1]);
    return pts;
  }
  function makeBranches(pts, rng) {
    const br = [];
    for (let i = 1; i < pts.length - 1; i++) {
      if (rng.next() < 0.55) continue;
      const p0 = pts[i - 1], p1 = pts[i + 1], p = pts[i];
      const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + (rng.chance(0.5) ? 1 : -1) * (0.7 + rng.next() * 0.7);
      const len = 12 + rng.next() * 20;
      br.push([[p[0], p[1]], [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len]]);
    }
    return br;
  }
  function spawnBolt(x0, y0, x1, y1, color, dur, opts) {
    opts = opts || {};
    const rng = opts.rng || MRNG;
    const pts = makeZigzag(x0, y0, x1, y1, rng, opts.segs || 6, opts.jitter !== undefined ? opts.jitter : 18);
    bolts.push({ pts, branch: opts.branch !== false ? makeBranches(pts, rng) : null, t: 0, dur: dur || 0.25, color: color || '#ffe86a', width: opts.width || 3 });
  }
  function updateBolts(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i]; b.t += dt; if (b.t >= b.dur) bolts.splice(i, 1); }
  }
  function drawPolyline(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function drawBolts(ctx) {
    if (!bolts.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of bolts) {
      const k = b.t / b.dur;
      const a = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
      if (a <= 0.01) continue;
      ctx.shadowColor = b.color; ctx.shadowBlur = 16;
      ctx.globalAlpha = a * 0.9; ctx.strokeStyle = C.alpha('#ffffff', 0.85); ctx.lineWidth = b.width * 0.4; drawPolyline(ctx, b.pts);
      ctx.globalAlpha = a; ctx.strokeStyle = b.color; ctx.lineWidth = b.width; drawPolyline(ctx, b.pts);
      if (b.branch && b.branch.length) {
        ctx.globalAlpha = a * 0.55; ctx.lineWidth = b.width * 0.45;
        for (const s of b.branch) drawPolyline(ctx, s);
      }
    }
    ctx.shadowBlur = 0; ctx.restore();
  }

  // ================================================================ floating damage/heal text
  const texts = [];
  function drawTextBurst(x, y, color, rng) {
    for (let i = 0; i < 6; i++) {
      const ang = rng.next() * TAU, spd = rng.float(30, 90);
      const q = P(x, y, spr('star', color, 8), rng.float(0.28, 0.4));
      vel(q, ang, spd); q.ay = 40; q.drag = 1.2; q.s0 = 6; q.s1 = 2; q.sc = 3; q.a0 = 0.9; q.a1 = 0; q.add = true;
      add();
    }
  }
  VFX.text = function (x, y, str, o) {
    o = o || {};
    if (o.crit) { try { drawTextBurst(x, y, o.color || '#ffe86a', MRNG); } catch (e) { /* ignore */ } }
    texts.push({
      x, y: y - 4, str: String(str), color: o.color || '#ffffff', size: o.size || 15, crit: !!o.crit,
      t: 0, dur: o.dur || (o.crit ? 1.25 : 1.0), rise: o.rise === false ? 8 : (o.rise === undefined ? 30 : o.rise),
    });
  };
  function updateTexts(dt) { for (let i = texts.length - 1; i >= 0; i--) { const f = texts[i]; f.t += dt; if (f.t >= f.dur) texts.splice(i, 1); } }
  const TEXT_FONT = '"Cinzel", "Noto Serif KR", Georgia, serif';
  function drawTexts(ctx) {
    for (const f of texts) {
      const k = f.t / f.dur;
      const pop = k < 0.16 ? M.easeOut(k / 0.16) : 1;
      const scale = f.crit ? (0.5 + 0.75 * pop) - (k > 0.16 ? Math.min(1, (k - 0.16) / 0.4) * 0.2 : 0) : (0.75 + 0.25 * pop);
      const a = k < 0.65 ? 1 : M.clamp(1 - (k - 0.65) / 0.35, 0, 1);
      const y = f.y - M.easeOut(Math.min(1, k * 1.15)) * f.rise;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, y); ctx.scale(scale, scale);
      Art.text(ctx, f.str, 0, 0, { size: f.size, color: f.color, weight: f.crit ? '800' : '700', stroke: 'rgba(10,8,16,0.85)', strokeWidth: f.crit ? 4 : 3, font: TEXT_FONT });
      ctx.restore();
    }
  }

  // ================================================================ screen-space flash / vignette pulse
  const screenFx = [];
  VFX.flash = function (color, duration) { screenFx.push({ kind: 'flash', color: color || '#ffffff', t: 0, dur: duration || 0.25 }); };
  VFX.pulse = function (color, duration) { screenFx.push({ kind: 'pulse', color: color || '#ffffff', t: 0, dur: duration || 0.6 }); };
  function updateScreenFx(dt) { for (let i = screenFx.length - 1; i >= 0; i--) { const f = screenFx[i]; f.t += dt; if (f.t >= f.dur) screenFx.splice(i, 1); } }
  VFX.drawScreen = function (ctx, w, h) {
    for (const f of screenFx) {
      const k = f.t / f.dur;
      ctx.save();
      if (f.kind === 'flash') {
        const a = (1 - k) * (1 - k) * 0.55;
        if (a > 0.003) { ctx.globalAlpha = a; ctx.fillStyle = f.color; ctx.fillRect(0, 0, w, h); }
      } else {
        const a = Math.sin(M.clamp(k, 0, 1) * Math.PI) * 0.4;
        if (a > 0.003) {
          ctx.globalAlpha = a;
          ctx.fillStyle = Art.rgrad(ctx, w / 2, h / 2, Math.min(w, h) * 0.25, Math.max(w, h) * 0.72, [[0, 'rgba(0,0,0,0)'], [1, C.alpha(f.color, 1)]]);
          ctx.fillRect(0, 0, w, h);
        }
      }
      ctx.restore();
    }
  };

  // ================================================================ particle emission primitives (shared by kind builders)
  function core(x, y, color, size, life, opts) {
    opts = opts || {};
    const q = P(x, y, spr('glow', color, size), life);
    q.s0 = opts.s0 !== undefined ? opts.s0 : size * 0.25; q.s1 = opts.s1 !== undefined ? opts.s1 : size;
    q.sc = 1; q.a0 = opts.a0 !== undefined ? opts.a0 : 0.95; q.a1 = 0;
    q.add = opts.add !== false; q.below = !!opts.below; q.fin = opts.fin || 0;
    add();
  }
  function ring(x, y, color, size, life, opts) {
    opts = opts || {};
    const q = P(x, y, spr('ring', color, 48), life);
    q.s0 = opts.s0 !== undefined ? opts.s0 : size * 0.2; q.s1 = opts.s1 !== undefined ? opts.s1 : size;
    q.sc = 1; q.a0 = opts.a0 !== undefined ? opts.a0 : 0.8; q.a1 = 0;
    q.add = opts.add !== false; q.below = !!opts.below;
    add();
  }
  function burst(x, y, n, shape, color, rng, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      const ang = opts.dir !== undefined ? opts.dir + (rng.next() - 0.5) * (opts.spread !== undefined ? opts.spread : TAU) : rng.next() * TAU;
      const spd = rng.float(opts.spdMin !== undefined ? opts.spdMin : 30, opts.spdMax !== undefined ? opts.spdMax : 120);
      const life = opts.life !== undefined ? opts.life : rng.float(0.45, 0.9);
      const size = opts.size !== undefined ? opts.size : 14;
      const q = P(x, y, spr(shape, color, size, i), life);
      vel(q, ang, spd);
      q.ay = opts.gravity !== undefined ? opts.gravity : 0;
      q.drag = opts.drag !== undefined ? opts.drag : 1.6;
      q.s0 = opts.s0 !== undefined ? opts.s0 : size; q.s1 = opts.s1 !== undefined ? opts.s1 : size * (opts.grow !== undefined ? opts.grow : 0.4);
      q.sc = opts.sc !== undefined ? opts.sc : 3; q.a0 = opts.a0 !== undefined ? opts.a0 : 0.9; q.a1 = 0;
      q.add = opts.add !== false; q.below = !!opts.below;
      q.rv = opts.spin ? (rng.next() - 0.5) * opts.spin : 0; q.flick = opts.flick || 0;
      add();
    }
  }
  function rise(x, y, n, shape, color, rng, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      const life = opts.life !== undefined ? opts.life : rng.float(0.7, 1.3);
      const size = opts.size !== undefined ? opts.size : 10;
      const spreadX = opts.spreadX !== undefined ? opts.spreadX : 20;
      const q = P(x + (rng.next() - 0.5) * spreadX, y + (rng.next() - 0.5) * (opts.spreadY || 6), spr(shape, color, size, i), life);
      q.vy = -(opts.speed !== undefined ? opts.speed : 30) - rng.next() * (opts.speedVar !== undefined ? opts.speedVar : 20);
      q.vx = (rng.next() - 0.5) * (opts.driftX !== undefined ? opts.driftX : 10);
      q.ay = opts.gravity !== undefined ? opts.gravity : -6;
      q.wob = opts.wob || 0; q.wf = opts.wf || 2; q.ph = rng.next() * TAU;
      q.s0 = size * (opts.s0k !== undefined ? opts.s0k : 0.5); q.s1 = size; q.sc = 2;
      q.a0 = opts.a0 !== undefined ? opts.a0 : 0.85; q.a1 = 0; q.fin = 0.15;
      q.add = opts.add !== false; q.below = !!opts.below; q.rv = opts.spin ? (rng.next() - 0.5) * opts.spin : 0;
      add();
    }
  }
  function orbit(x, y, n, shape, color, rng, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      const life = opts.life !== undefined ? opts.life : rng.float(0.8, 1.4);
      const size = opts.size !== undefined ? opts.size : 9;
      const q = P(x, y, spr(shape, color, size, i), life);
      q.mode = 1; q.ox = x; q.oy = y; q.ph = (i / n) * TAU + rng.next() * 0.6;
      q.orr = opts.r !== undefined ? opts.r : 22; q.orv = opts.rv !== undefined ? opts.rv : -10;
      q.orb = (opts.spin !== undefined ? opts.spin : 5) * (rng.chance(0.5) ? 1 : -1);
      q.ell = opts.ell !== undefined ? opts.ell : 0.55;
      q.x = x + Math.cos(q.ph) * q.orr; q.y = y + Math.sin(q.ph) * q.orr * q.ell;
      q.s0 = size; q.s1 = size * (opts.grow !== undefined ? opts.grow : 0.6); q.sc = 2;
      q.a0 = opts.a0 !== undefined ? opts.a0 : 0.9; q.a1 = 0;
      q.add = opts.add !== false; q.below = !!opts.below; q.rv = opts.rot ? (rng.next() - 0.5) * opts.rot : 0;
      add();
    }
  }

  // ================================================================ continuous emitter tick helpers (for ambient / persistent kinds)
  function ambientTick(rate, spawnFn) {
    return function (dt, e) {
      const p = e.params;
      e.data.acc = (e.data.acc || 0) + dt * (p.intensity !== undefined ? p.intensity : 1);
      const iv = 1 / rate;
      let guard = 0;
      while (e.data.acc > iv && guard < 40) { e.data.acc -= iv; spawnFn(e.x, e.y, p.w || 500, p.h || 350, e.rng, p); guard++; }
    };
  }
  function ambientAt(rate, spawnFn) {
    return function (dt, e) {
      const p = e.params;
      e.data.acc = (e.data.acc || 0) + dt;
      const iv = 1 / rate;
      let guard = 0;
      while (e.data.acc > iv && guard < 20) { e.data.acc -= iv; spawnFn(e.x, e.y, e.rng, p); guard++; }
    };
  }

  // ---- ambient weather spawn functions: (x,y) is the TOP-LEFT of a w×h area ----
  function spawnSnow(x, y, w, h, rng, p) {
    const color = p.color || '#eef5fb';
    const vy = rng.float(16, 30), life = h / vy + rng.float(0, 0.4);
    const q = P(x + rng.next() * w, y, spr('flake', color, 12, rng.int(0, 3)), life);
    q.vy = vy; q.vx = rng.float(-5, 5); q.wob = rng.float(10, 22); q.wf = rng.float(0.5, 1.3); q.ph = rng.next() * TAU;
    q.s0 = rng.float(3, 7); q.s1 = q.s0 * 0.9; q.a0 = rng.float(0.55, 0.9); q.a1 = q.a0 * 0.6; q.fin = 0.08; q.rv = rng.float(-1, 1);
    add();
  }
  function spawnRain(x, y, w, h, rng, p) {
    const color = p.color || '#bcd8ff';
    const vy = rng.float(360, 480), life = h / vy;
    const q = P(x + rng.next() * w, y, spr('drop', color, 10), life);
    q.vy = vy; q.vx = rng.float(-24, -8);
    q.s0 = rng.float(7, 12); q.s1 = q.s0; q.a0 = 0.65; q.a1 = 0.5; q.rot = Math.atan2(vy, -16) - Math.PI / 2; q.die = 1;
    add();
  }
  function spawnLeaf(x, y, w, h, rng, p) {
    const color = p.color || (rng.chance(0.5) ? '#c8772a' : '#a9762c');
    const vy = rng.float(14, 26), life = h / vy + rng.float(0, 0.6);
    const q = P(x + rng.next() * w, y, spr('leaf', color, 12, rng.int(0, 4)), life);
    q.vy = vy; q.vx = rng.float(-6, 6); q.wob = rng.float(16, 30); q.wf = rng.float(0.7, 1.6); q.ph = rng.next() * TAU;
    q.s0 = rng.float(8, 14); q.s1 = q.s0; q.a0 = 0.9; q.a1 = 0.6; q.rv = rng.float(-2.2, 2.2); q.fin = 0.06;
    add();
  }
  function spawnEmber(x, y, w, h, rng, p) {
    const color = p.color || '#ff8a3a';
    const vy = -rng.float(20, 46), life = h / -vy + rng.float(0, 0.5);
    const q = P(x + rng.next() * w, y + h, spr('ember', color, 10), life);
    q.vy = vy; q.vx = rng.float(-10, 10); q.wob = rng.float(6, 16); q.wf = rng.float(1, 2.4); q.ph = rng.next() * TAU;
    q.s0 = rng.float(4, 9); q.s1 = q.s0 * 0.3; q.sc = 3; q.a0 = rng.float(0.7, 1); q.a1 = 0; q.flick = 0.4; q.add = true;
    add();
  }
  function spawnMist(x, y, w, h, rng, p) {
    const color = p.color || '#c8d4dc';
    const q = P(x + rng.next() * w, y + h * (0.6 + rng.next() * 0.4), spr('puff', color, 64, rng.int(0, 3)), rng.float(3, 5));
    q.vx = rng.float(6, 16); q.s0 = rng.float(40, 70); q.s1 = q.s0 * 1.3; q.sc = 2; q.a0 = rng.float(0.12, 0.22); q.a1 = 0; q.below = true; q.fin = 0.3;
    add();
  }
  function spawnBlessingMote(x, y, rng, p) {
    const color = p.color || '#f1d98a';
    const q = P(x, y, spr('star', color, 14), rng.float(1.2, 1.8));
    q.mode = 1; q.ox = x + rng.float(-4, 4); q.oy = y + rng.float(-4, 4); q.ph = rng.next() * TAU;
    q.orr = rng.float(14, 28); q.orv = rng.float(-3, 3); q.orb = rng.float(1.6, 2.6) * (rng.chance(0.5) ? 1 : -1); q.ell = 0.5;
    q.x = q.ox + Math.cos(q.ph) * q.orr; q.y = q.oy + Math.sin(q.ph) * q.orr * q.ell;
    q.s0 = rng.float(5, 9); q.s1 = q.s0 * 1.3; q.sc = 2; q.a0 = 0.95; q.a1 = 0; q.add = true; q.flick = 0.25;
    add();
  }
  function spawnCurseMote(x, y, rng, p) {
    const color = p.color || '#8a3fd0';
    const q = P(x, y, spr('spore', color, 16), rng.float(1.1, 1.7));
    q.mode = 1; q.ox = x; q.oy = y; q.ph = rng.next() * TAU;
    q.orr = rng.float(10, 22); q.orv = rng.float(-2, 1); q.orb = rng.float(-2.2, -1.2); q.ell = 0.4;
    q.x = q.ox + Math.cos(q.ph) * q.orr; q.y = q.oy + Math.sin(q.ph) * q.orr * q.ell;
    q.s0 = rng.float(7, 12); q.s1 = q.s0 * 0.6; q.sc = 3; q.a0 = 0.85; q.a1 = 0; q.add = true;
    add();
  }
  function spawnSelectionPulse(x, y, rng, p) {
    const color = p.color || '#f1d98a';
    const q = P(x, y, spr('ring', color, 64), 1.1);
    q.s0 = (p.radius || 26) * 0.5; q.s1 = (p.radius || 26) * 1.15; q.sc = 1; q.a0 = 0.55; q.a1 = 0; q.below = true; q.add = true;
    add();
  }

  // ================================================================ effect handle system
  const effects = [];
  let nextId = 1;
  const KINDS = {};

  function spawnEffect(kind, x, y, params) {
    const spec = KINDS[kind];
    const id = nextId++;
    const handle = { id, done: false, cancel() { if (eff) { eff.cancelled = true; eff.done = true; } handle.done = true; } };
    if (!spec) { handle.done = true; return handle; }
    if (!SP) initSprites();
    const p = params || EMPTY;
    const rng = rngFor(p);
    var eff = { id, kind, x, y, params: p, rng, t: 0, dur: 1, persistent: false, tick: null, data: {}, cancelled: false, done: false, handle };
    let result;
    try { result = spec(x, y, p, rng, eff); } catch (e) { console.error('VFX kind failed: ' + kind, e); result = 0.5; }
    if (typeof result === 'number') { eff.dur = result; }
    else if (result && typeof result === 'object') {
      if (result.dur !== undefined) eff.dur = result.dur;
      eff.persistent = !!result.persistent;
      eff.tick = result.tick || null;
    }
    if (p.duration !== undefined) { eff.dur = p.duration; eff.persistent = false; }
    if (p.persistent) eff.persistent = true;
    effects.push(eff);
    return handle;
  }
  VFX.spawn = spawnEffect;

  VFX.update = function (dt) {
    dt = M.clamp(dt || 0, 0, 0.1);
    if (!SP) initSprites();
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      if (e.cancelled) { e.done = true; if (e.handle) e.handle.done = true; effects.splice(i, 1); continue; }
      e.t += dt;
      if (e.tick) { try { e.tick(dt, e); } catch (err) { console.error('VFX tick failed: ' + e.kind, err); } }
      if (!e.persistent && e.t >= e.dur) { e.done = true; if (e.handle) e.handle.done = true; effects.splice(i, 1); }
    }
    updateParticles(dt);
    updateProjectiles(dt);
    updateBolts(dt);
    updateTexts(dt);
    updateScreenFx(dt);
  };

  VFX.draw = function (ctx, layer) {
    if (!SP) initSprites();
    if (layer !== 'above') drawParticles(ctx, true);
    if (layer !== 'below') {
      drawParticles(ctx, false);
      drawProjectiles(ctx);
      drawBolts(ctx);
      drawTexts(ctx);
    }
  };

  VFX.clear = function () {
    pn = 0; effects.length = 0; bolts.length = 0; texts.length = 0; screenFx.length = 0;
    for (const pr of projectiles) { try { pr.resolve(); } catch (e) { /* ignore */ } }
    projectiles.length = 0;
  };
  VFX.count = function () { return pn; };
  VFX.effectCount = function () { return effects.length; };
  VFX.kinds = function () { return Object.keys(KINDS); };
  VFX.stress = function (n) {
    n = n || 500;
    for (let i = 0; i < n; i++) {
      const ang = MRNG.next() * TAU, spd = MRNG.float(10, 80);
      const q = P(MRNG.float(0, 900), MRNG.float(0, 600), spr('glow', '#ffaa55', 16), MRNG.float(1, 3));
      vel(q, ang, spd); q.s0 = 8; q.s1 = 16; q.sc = 2; q.a0 = 0.8; q.a1 = 0; q.add = true; q.drag = 1;
      add();
    }
  };

  // ================================================================ kind builders — combat & spell impacts
  KINDS.fire_burst = function (x, y, p, rng) {
    const color = p.color || '#ff7a2a';
    core(x, y, color, 56, 0.45);
    burst(x, y, 12, 'ember', color, rng, { size: 10, spdMin: 40, spdMax: 150, life: 0.6, gravity: -20, drag: 1.4, flick: 0.35 });
    rise(x, y, 4, 'puff', '#3a2a20', rng, { size: 18, speed: 30, speedVar: 20, life: 0.9, spreadX: 10, add: false, a0: 0.3 });
    return 0.7;
  };
  KINDS.frost_burst = function (x, y, p, rng) {
    const color = p.color || '#7ad8ff';
    core(x, y, color, 50, 0.45);
    burst(x, y, 9, 'shard', color, rng, { size: 12, spdMin: 40, spdMax: 150, life: 0.55, gravity: 60, drag: 1, spin: 3 });
    ring(x, y, color, 60, 0.6, { s0: 6, a0: 0.5 });
    return 0.65;
  };
  KINDS.lightning_strike = function (x, y, p, rng) {
    const color = p.color || '#ffe86a';
    const dur = p.duration !== undefined ? p.duration : 0.4;
    const sy = y - (p.height !== undefined ? p.height : 220);
    spawnBolt(x, sy, x, y, color, dur, { rng, segs: 8, jitter: 20, width: 4 });
    core(x, y, color, 70, dur + 0.25);
    burst(x, y, 10, 'star', color, rng, { size: 8, spdMin: 40, spdMax: 160, life: 0.55, gravity: 80 });
    return dur + 0.3;
  };
  KINDS.heal_glow = function (x, y, p, rng) {
    const color = p.color || '#9bd35a';
    core(x, y, color, 44, 0.5);
    ring(x, y, color, 50, 0.6, { s0: 4, a0: 0.5 });
    rise(x, y, 8, 'glow', color, rng, { size: 6, speed: 26, speedVar: 16, life: 0.9, spreadX: 18, wob: 6, wf: 1.4 });
    return 0.9;
  };
  KINDS.arcane_swirl = function (x, y, p, rng) {
    const color = p.color || '#7fa0ff';
    core(x, y, color, 40, 0.5);
    orbit(x, y, 6, 'rune', color, rng, { r: 26, rv: -6, spin: 3.2, size: 12, life: 0.9 });
    orbit(x, y, 5, 'star', color, rng, { r: 14, rv: 4, spin: 4.6, size: 6, life: 0.8 });
    return 0.9;
  };
  KINDS.shadow_wisp = function (x, y, p, rng) {
    const color = p.color || '#8a4fc0';
    rise(x, y, 7, 'puff', color, rng, { size: 26, speed: 18, speedVar: 14, life: 1.1, spreadX: 16, gravity: -4, wob: 12, wf: 1, add: false, a0: 0.6 });
    core(x, y, color, 34, 0.5, { add: false, a0: 0.6 });
    core(x, y, '#d9b8ff', 14, 0.35, { add: true, a0: 0.5 });
    return 1.2;
  };
  KINDS.nature_bloom = function (x, y, p, rng) {
    const color = p.color || '#5fb043';
    ring(x, y, color, 40, 0.5, { below: true, s0: 4 });
    burst(x, y, 8, 'petal', color, rng, { size: 12, spdMin: 20, spdMax: 80, life: 0.7, gravity: -10, drag: 1.6, spin: 3 });
    burst(x, y, 8, 'star', '#d7f0a8', rng, { size: 5, spdMin: 20, spdMax: 90, life: 0.55, gravity: 0, drag: 1.4 });
    return 0.75;
  };
  KINDS.holy_light = function (x, y, p, rng) {
    const color = p.color || '#fff0b8';
    core(x, y, color, 60, 0.6);
    for (let i = 0; i < 6; i++) { const q = P(x, y, spr('streak', color, 70), 0.6); q.rot = i / 6 * TAU - Math.PI / 2; q.s0 = 14; q.s1 = 60; q.sc = 1; q.a0 = 0.45; q.a1 = 0; q.add = true; add(); }
    rise(x, y, 6, 'glow', color, rng, { size: 6, speed: 22, speedVar: 14, life: 0.9, spreadX: 14 });
    return 0.9;
  };
  KINDS.blood_hit = function (x, y, p, rng) {
    const color = p.color || '#a12a24';
    burst(x, y, 8, 'drop', color, rng, { size: 7, spdMin: 40, spdMax: 140, life: 0.55, gravity: 260, drag: 0.6, add: false });
    const q = P(x, y + 3, spr('ring', color, 20), 0.5); q.s0 = 4; q.s1 = 14; q.sc = 1; q.a0 = 0.4; q.a1 = 0; q.below = true; q.add = false; add();
    return 0.62;
  };
  KINDS.dust = function (x, y, p, rng) {
    const color = p.color || '#c9bd9a';
    const q = P(x, y, spr('puff', color, 24), 0.6); q.s0 = 6; q.s1 = 24; q.sc = 1; q.a0 = 0.35; q.a1 = 0; q.below = true; q.add = false; add();
    burst(x, y, 3, 'puff', color, rng, { size: 12, spdMin: 6, spdMax: 20, life: 0.55, gravity: 0, drag: 2, below: true, add: false, a0: 0.25 });
    return 0.62;
  };
  KINDS.level_up = function (x, y, p, rng) {
    const color = p.color || '#ffe58a';
    core(x, y, color, 60, 0.5);
    ring(x, y, color, 60, 0.6, { s0: 6 });
    rise(x, y, 10, 'star', color, rng, { size: 8, speed: 50, speedVar: 30, life: 1, spreadX: 22 });
    return 1.05;
  };

  // ================================================================ kind builders — hit reactions & ground bursts
  KINDS.summon_circle = function (x, y, p, rng) {
    const color = p.color || '#b06aff';
    const dur = p.duration !== undefined ? p.duration : 1.8;
    ring(x, y, color, 70, dur * 0.9, { below: true, a0: 0.5, s0: 10 });
    for (let i = 0; i < 6; i++) {
      const q = P(x, y, spr('rune', color, 20, i), dur * 0.85);
      q.mode = 1; q.ox = x; q.oy = y; q.ph = i / 6 * TAU; q.orr = 34; q.orb = 1.4; q.ell = 0.42;
      q.x = x + Math.cos(q.ph) * q.orr; q.y = y + Math.sin(q.ph) * q.orr * q.ell;
      q.s0 = 16; q.s1 = 16; q.a0 = 0.8; q.a1 = 0.3; q.below = true; q.add = true; q.fin = 0.15;
      add();
    }
    return {
      dur, persistent: false, tick: function (dt, e) {
        if (!e.data.burst && e.t >= dur * 0.82) {
          e.data.burst = true;
          core(e.x, e.y, color, 60, 0.5);
          rise(e.x, e.y, 10, 'glow', color, e.rng, { size: 8, speed: 60, life: 0.5, spreadX: 20 });
        }
      },
    };
  };
  KINDS.city_founded = function (x, y, p, rng) {
    const color = p.color || '#f1d98a';
    core(x, y, color, 90, 0.6);
    ring(x, y, color, 140, 1.1, { s0: 8 });
    ring(x, y, '#ffffff', 90, 0.7, { s0: 4, a0: 0.6 });
    burst(x, y, 22, 'star', color, rng, { size: 10, spdMin: 60, spdMax: 220, life: 0.9, gravity: 140, drag: 0.6, spin: 4 });
    rise(x, y - 10, 14, 'glow', color, rng, { size: 8, speed: 50, speedVar: 40, life: 1.3, spreadX: 60, wob: 12, wf: 1.2 });
    return 1.4;
  };
  KINDS.arrow_hit = function (x, y, p, rng) {
    burst(x, y, 5, 'shard', p.color || '#cfc6ae', rng, { size: 6, spdMin: 30, spdMax: 90, life: 0.5, gravity: 220, drag: 1, add: false });
    const q = P(x, y + 2, spr('puff', '#b8ac90', 20), 0.55); q.s0 = 6; q.s1 = 18; q.sc = 1; q.a0 = 0.4; q.a1 = 0; q.below = true; q.add = false; add();
    return 0.62;
  };
  KINDS.magic_bolt_hit = function (x, y, p, rng) {
    const color = p.color || '#7fa0ff';
    core(x, y, color, 46, 0.55);
    ring(x, y, color, 60, 0.65, { s0: 4 });
    burst(x, y, 10, 'shard', color, rng, { size: 8, spdMin: 40, spdMax: 130, life: 0.55, gravity: 40, drag: 1.4 });
    return 0.68;
  };
  KINDS.smoke = function (x, y, p, rng) {
    rise(x, y, 6, 'puff', p.color || '#8a8a8a', rng, { size: 26, speed: 18, speedVar: 14, life: 1.5, spreadX: 14, gravity: -4, wob: 8, wf: 0.8, add: false, a0: 0.35 });
    return 1.6;
  };
  KINDS.sparks = function (x, y, p, rng) {
    const color = p.color || '#ffe9b0';
    burst(x, y, 14, 'ember', color, rng, { size: 6, spdMin: 60, spdMax: 220, life: 0.6, gravity: 300, drag: 0.6, flick: 0.4 });
    core(x, y, color, 24, 0.3);
    return 0.65;
  };
  KINDS.snow = function () { return { dur: 1, persistent: true, tick: ambientTick(16, spawnSnow) }; };
  KINDS.rain = function () { return { dur: 1, persistent: true, tick: ambientTick(30, spawnRain) }; };
  KINDS.leaves = function () { return { dur: 1, persistent: true, tick: ambientTick(7, spawnLeaf) }; };
  KINDS.embers = function () { return { dur: 1, persistent: true, tick: ambientTick(10, spawnEmber) }; };
  KINDS.mist = function () { return { dur: 1, persistent: true, tick: ambientTick(4, spawnMist) }; };
  KINDS.ripple = function (x, y, p) {
    const color = p.color || '#bfe6f5';
    ring(x, y, color, 46, 0.9, { below: true, s0: 4, a0: 0.5, add: false });
    ring(x, y, color, 34, 0.7, { below: true, s0: 2, a0: 0.35, add: false });
    return 0.9;
  };
  KINDS.scorch = function (x, y, p, rng) {
    const dur = p.duration !== undefined ? p.duration : 6;
    // the mark itself blooms to full size almost instantly, then just sits and slowly fades — it should
    // read as "already burned" at any sampled moment, not as something still growing.
    const q = P(x, y, spr('glow', p.color || '#1c1512', 64), dur);
    q.s0 = 40; q.s1 = 46; q.sc = 1; q.a0 = 0.6; q.a1 = 0.35; q.below = true; q.fin = 0.02; q.add = false; add();
    const rim = P(x, y, spr('ring', '#8a3a18', 60), dur * 0.6);
    rim.s0 = 32; rim.s1 = 36; rim.sc = 1; rim.a0 = 0.4; rim.a1 = 0.15; rim.below = true; rim.fin = 0.02; rim.add = true; add();
    burst(x, y, 7, 'ember', '#ff8a3a', rng, { size: 6, spdMin: 4, spdMax: 14, life: 1.5, gravity: -2, drag: 1, a0: 0.6, sc: 3, add: true, flick: 0.5 });
    return dur;
  };
  KINDS.shield_block = function (x, y, p, rng) {
    const color = p.color || '#dfe3ea';
    core(x, y, color, 40, 0.45);
    burst(x, y, 8, 'streak', color, rng, { size: 12, spdMin: 60, spdMax: 160, life: 0.45, gravity: 0, drag: 3, spread: Math.PI * 1.4, dir: p.dir || 0 });
    return 0.62;
  };
  KINDS.poison_cloud = function (x, y, p, rng) {
    const color = p.color || '#8ad34a';
    rise(x, y, 7, 'puff', color, rng, { size: 24, speed: 10, speedVar: 8, life: 1.2, spreadX: 18, gravity: -3, add: false, a0: 0.35 });
    for (let i = 0; i < 4; i++) {
      const q = P(x + rng.float(-10, 10), y + rng.float(-6, 6), spr('bubble', color, 10), rng.float(0.5, 0.9));
      q.vy = -rng.float(6, 16); q.s0 = rng.float(4, 8); q.s1 = q.s0; q.a0 = 0.7; q.a1 = 0.5; q.die = 2;
      add();
    }
    return 1.3;
  };
  KINDS.teleport = function (x, y, p, rng) {
    const color = p.color || '#7fa0ff';
    const dur = p.duration !== undefined ? p.duration : 0.9;
    const inT = dur * 0.45;
    for (let i = 0; i < 12; i++) {
      const ang = rng.next() * TAU, r0 = rng.float(30, 60);
      const q = P(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0, spr('star', color, 8), inT);
      q.vx = -Math.cos(ang) * r0 / inT; q.vy = -Math.sin(ang) * r0 / inT;
      q.s0 = 6; q.s1 = 2; q.sc = 3; q.a0 = 0.85; q.a1 = 0.2; q.add = true;
      add();
    }
    return {
      dur, persistent: false, tick: function (dt, e) {
        if (!e.data.burst && e.t >= inT) {
          e.data.burst = true;
          core(e.x, e.y, color, 60, 0.45);
          burst(e.x, e.y, 12, 'star', color, e.rng, { size: 8, spdMin: 60, spdMax: 180, life: 0.45, gravity: 0, drag: 1.2 });
        }
      },
    };
  };
  KINDS.fear = function (x, y, p, rng) {
    const color = p.color || '#4a2a6a';
    rise(x, y, 4, 'puff', color, rng, { size: 20, speed: 22, speedVar: 10, life: 0.8, spreadX: 10, add: false, a0: 0.4 });
    ring(x, y, color, 30, 0.6, { s0: 4, a0: 0.35, add: false });
    return 0.85;
  };
  KINDS.roar = function (x, y, p, rng) {
    const color = p.color || '#e0452b';
    ring(x, y, color, 130, 0.6, { s0: 10, a0: 0.55, add: false, below: true });
    ring(x, y, '#ffffff', 90, 0.4, { s0: 6, a0: 0.4, add: false, below: true });
    burst(x, y, 8, 'puff', '#a89a78', rng, { size: 18, spdMin: 20, spdMax: 60, life: 0.5, gravity: 0, drag: 2, below: true, add: false, a0: 0.3 });
    return 0.7;
  };
  KINDS.stone_shatter = function (x, y, p, rng) {
    burst(x, y, 10, 'rock', p.color || '#8c857a', rng, { size: 12, spdMin: 50, spdMax: 180, life: 0.6, gravity: 280, drag: 0.8, spin: 6 });
    const q = P(x, y + 2, spr('puff', '#9a8f78', 20), 0.5); q.s0 = 6; q.s1 = 20; q.sc = 1; q.a0 = 0.35; q.a1 = 0; q.below = true; q.add = false; add();
    return 0.65;
  };
  KINDS.web = function (x, y, p, rng) {
    const color = p.color || '#eef0e6', n = 8;
    for (let i = 0; i < n; i++) {
      const ang = i / n * TAU + rng.float(-0.05, 0.05);
      const q = P(x, y, spr('streak', color, 22), 0.6);
      q.rot = ang - Math.PI / 2; q.s0 = 4; q.s1 = 26; q.sc = 1; q.a0 = 0.75; q.a1 = 0.15; q.add = false;
      add();
    }
    core(x, y, color, 26, 0.4, { add: false, a0: 0.5 });
    return 0.65;
  };
  KINDS.plague = function (x, y, p, rng) {
    const color = p.color || '#6a7a3a';
    rise(x, y, 6, 'spore', color, rng, { size: 14, speed: 14, speedVar: 10, life: 1.2, spreadX: 16, gravity: -3, add: false, a0: 0.6 });
    for (let i = 0; i < 3; i++) {
      const fx = x + rng.float(-14, 14), fy = y + rng.float(-10, 4);
      const q = P(fx, fy, spr('fly', '#2a2a1a', 8), rng.float(0.8, 1.3));
      q.mode = 1; q.ox = fx; q.oy = fy; q.ph = rng.next() * TAU; q.orr = 8; q.orv = 1; q.orb = rng.float(6, 10) * (rng.chance(0.5) ? 1 : -1); q.ell = 0.6;
      q.s0 = 6; q.s1 = 6; q.a0 = 0.85; q.a1 = 0.6;
      add();
    }
    return 1.3;
  };
  KINDS.resurrect = function (x, y, p, rng) {
    const color = p.color || '#fff0b8';
    core(x, y, color, 80, 0.9);
    ring(x, y, color, 110, 1.2, { s0: 6, a0: 0.55 });
    for (let i = 0; i < 5; i++) { const q = P(x, y, spr('streak', color, 90), 0.8); q.rot = -Math.PI + (i - 2) * 0.12; q.s0 = 20; q.s1 = 90; q.sc = 1; q.a0 = 0.5; q.a1 = 0; q.add = true; add(); }
    rise(x, y, 12, 'glow', color, rng, { size: 8, speed: 50, speedVar: 40, life: 1.3, spreadX: 40 });
    return 1.5;
  };
  KINDS.lava_burst = function (x, y, p, rng) {
    const color = p.color || '#ff5a1a';
    core(x, y, color, 70, 0.5);
    burst(x, y, 12, 'rock', '#c0301a', rng, { size: 12, spdMin: 60, spdMax: 220, life: 0.7, gravity: 320, drag: 0.6, spin: 5 });
    burst(x, y, 10, 'ember', color, rng, { size: 8, spdMin: 40, spdMax: 160, life: 0.8, gravity: 140, drag: 0.8, flick: 0.4 });
    rise(x, y, 5, 'puff', '#3a2a20', rng, { size: 26, speed: 20, speedVar: 14, life: 1.2, spreadX: 16, add: false, a0: 0.4 });
    return 1.1;
  };
  KINDS.tidal_wave = function (x, y, p, rng) {
    const color = p.color || '#3b95c0', dir = p.dir !== undefined ? p.dir : 0;
    burst(x, y, 16, 'drop', color, rng, { size: 12, spdMin: 60, spdMax: 160, life: 0.7, gravity: 200, drag: 0.5, dir, spread: 0.9 });
    ring(x, y, '#eaf6ff', 90, 0.7, { s0: 8, a0: 0.5, below: true, add: false });
    for (let i = 0; i < 6; i++) { const q = P(x, y, spr('streak', '#eaf6ff', 60), 0.5); q.rot = dir + (rng.next() - 0.5) * 0.5 - Math.PI / 2; q.s0 = 10; q.s1 = 70; q.sc = 1; q.a0 = 0.6; q.a1 = 0; q.add = false; add(); }
    return 0.9;
  };
  KINDS.meteor = function (x, y, p, rng) {
    const color = p.color || '#ff7a2a';
    const dur = p.duration !== undefined ? p.duration : 1.6;
    const fallT = dur * 0.5, sy = y - (p.fallHeight !== undefined ? p.fallHeight : 260);
    const q = P(x, sy, spr('ember', color, 26), fallT); q.vy = (y - sy) / fallT; q.s0 = 24; q.s1 = 20; q.sc = 0; q.a0 = 1; q.a1 = 1; q.add = true; q.str = 2.4; add();
    return {
      dur, persistent: false, tick: function (dt, e) {
        e.data.acc = (e.data.acc || 0) + dt;
        if (e.t < fallT) {
          const k = e.t / fallT, cy = sy + (y - sy) * k;
          while (e.data.acc > 0.012) {
            e.data.acc -= 0.012;
            const qq = P(x, cy, spr('ember', color, 8), 0.35); qq.vy = 20; qq.s0 = 6; qq.s1 = 1; qq.sc = 3; qq.a0 = 0.7; qq.a1 = 0; qq.add = true; add();
          }
        } else if (!e.data.hit) {
          e.data.hit = true;
          core(x, y, color, 100, 0.6);
          ring(x, y, color, 150, 1, { s0: 10, below: true });
          ring(x, y, '#fff2b0', 90, 0.5, { s0: 6, a0: 0.7 });
          burst(x, y, 16, 'rock', '#5a4a3a', e.rng, { size: 12, spdMin: 70, spdMax: 240, life: 0.8, gravity: 320, drag: 0.6, spin: 6 });
          burst(x, y, 12, 'ember', color, e.rng, { size: 8, spdMin: 50, spdMax: 180, life: 0.7, gravity: 160, drag: 0.8 });
          try { VFX.flash(color, 0.18); } catch (err) { /* ignore */ }
        }
      },
    };
  };
  KINDS.earthquake = function (x, y, p, rng) {
    const color = p.color || '#8c7a52';
    ring(x, y, color, 160, 1, { below: true, s0: 12, a0: 0.4, add: false });
    burst(x, y, 14, 'puff', color, rng, { size: 22, spdMin: 20, spdMax: 90, life: 0.9, gravity: 40, drag: 1.2, add: false, a0: 0.4 });
    return 1.1;
  };
  KINDS.blessing_aura = function () { return { dur: 1, persistent: true, tick: ambientAt(6, spawnBlessingMote) }; };
  KINDS.curse_aura = function () { return { dur: 1, persistent: true, tick: ambientAt(5.5, spawnCurseMote) }; };
  KINDS.selection_glow = function () { return { dur: 1, persistent: true, tick: ambientAt(0.9, spawnSelectionPulse) }; };

  // ================================================================ projectiles
  const projectiles = [];
  VFX.PROJECTILES = ['arrow', 'bolt', 'magic_bolt', 'fireball', 'frost_shard', 'rock', 'javelin', 'lightning'];
  function projImpactColor(kind) {
    switch (kind) {
      case 'arrow': return '#e8dcc0'; case 'bolt': return '#7ad8ff'; case 'magic_bolt': return '#7fa0ff';
      case 'fireball': return '#ff7a2a'; case 'frost_shard': return '#8fe0ff'; case 'rock': return '#a39e95';
      case 'javelin': return '#c8c2b4'; case 'lightning': return '#ffe86a'; default: return '#ffffff';
    }
  }
  function projSpec(kind) {
    switch (kind) {
      case 'arrow': return { shape: 'streak', size: 14, glow: false, trail: null };
      case 'javelin': return { shape: 'streak', size: 18, glow: false, trail: null };
      case 'rock': return { shape: 'rock', size: 14, glow: false, trail: null };
      case 'bolt': return { shape: 'shard', size: 14, glow: true, trail: 'streak', trailRate: 70 };
      case 'magic_bolt': return { shape: 'glow', size: 16, glow: true, trail: 'star', trailRate: 60 };
      case 'fireball': return { shape: 'ember', size: 24, glow: true, trail: 'ember', trailRate: 90 };
      case 'frost_shard': return { shape: 'shard', size: 16, glow: true, trail: 'flake', trailRate: 60 };
      default: return { shape: 'glow', size: 14, glow: true, trail: 'star', trailRate: 50 };
    }
  }
  function impactFx(kind, x, y, color, rng) {
    switch (kind) {
      case 'arrow': KINDS.arrow_hit(x, y, { color }, rng); break;
      case 'javelin': KINDS.arrow_hit(x, y, { color: color || '#c8c2b4' }, rng); burst(x, y, 4, 'rock', '#a39e95', rng, { size: 8, life: 0.4, gravity: 260, add: false }); break;
      case 'rock': KINDS.stone_shatter(x, y, { color }, rng); break;
      case 'bolt': case 'magic_bolt': KINDS.magic_bolt_hit(x, y, { color }, rng); break;
      case 'fireball': KINDS.fire_burst(x, y, { color }, rng); break;
      case 'frost_shard': KINDS.frost_burst(x, y, { color }, rng); break;
      default: KINDS.magic_bolt_hit(x, y, { color }, rng);
    }
  }
  VFX.projectile = function (kind, x0, y0, x1, y1, params) {
    params = params || {};
    const dist = M.dist(x0, y0, x1, y1);
    const color = params.color || projImpactColor(kind);
    const rng = rngFor(params);
    if (!SP) initSprites();
    if (kind === 'lightning') {
      const dur = params.duration || 0.28;
      spawnBolt(x0, y0, x1, y1, color, dur, { rng, segs: 7, jitter: Math.max(10, dist * 0.05), width: params.width || 3.4 });
      burst(x1, y1, 10, 'star', color, rng, { size: 10, spdMin: 40, spdMax: 160, life: 0.4, gravity: 60 });
      core(x1, y1, color, 34, 0.35);
      if (params.onHit) { try { params.onHit(); } catch (e) { /* ignore */ } }
      return Promise.resolve();
    }
    const spec = projSpec(kind);
    const dur = Math.max(0.08, params.duration !== undefined ? params.duration : (0.24 + dist * 0.0009));
    const arc = params.arc !== undefined ? params.arc : (kind === 'arrow' || kind === 'javelin' ? Math.min(70, dist * 0.2) : Math.min(30, dist * 0.06));
    return new Promise(function (resolve) {
      projectiles.push({ kind, x0, y0, x1, y1, px: x0, py: y0, t: 0, dur, arc, color, spec, rng, trailAcc: 0, onHit: params.onHit, resolve });
    });
  };
  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.t += dt;
      const k = M.clamp(pr.t / pr.dur, 0, 1);
      const x = M.lerp(pr.x0, pr.x1, k), y = M.lerp(pr.y0, pr.y1, k) - Math.sin(k * Math.PI) * pr.arc;
      if (pr.spec.trail) {
        pr.trailAcc += dt;
        const iv = 1 / (pr.spec.trailRate || 60);
        while (pr.trailAcc > iv) {
          pr.trailAcc -= iv;
          const q = P(x, y, spr(pr.spec.trail, pr.color, 8), 0.3);
          q.s0 = 6; q.s1 = 1; q.sc = 3; q.a0 = 0.6; q.a1 = 0; q.add = true; q.vx = (pr.rng.next() - 0.5) * 10; q.vy = (pr.rng.next() - 0.5) * 10;
          add();
        }
      }
      pr.px = x; pr.py = y;
      if (k >= 1) {
        projectiles.splice(i, 1);
        impactFx(pr.kind, x, y, pr.color, pr.rng);
        if (pr.onHit) { try { pr.onHit(); } catch (e) { /* ignore */ } }
        pr.resolve();
      }
    }
  }
  function drawProjectiles(ctx) {
    for (const pr of projectiles) {
      const k = M.clamp(pr.t / pr.dur, 0, 1);
      const x = pr.px, y = pr.py;
      const vx = pr.x1 - pr.x0, vy = (pr.y1 - pr.y0) - Math.cos(k * Math.PI) * Math.PI * pr.arc;
      const ang = Math.atan2(vy, vx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.globalCompositeOperation = pr.spec.glow ? 'lighter' : 'source-over';
      if (pr.kind === 'arrow' || pr.kind === 'javelin') {
        const len = pr.kind === 'javelin' ? 22 : 16;
        ctx.strokeStyle = '#c9a876'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-len * 0.6, 0); ctx.lineTo(len * 0.35, 0); ctx.stroke();
        ctx.fillStyle = '#d8d2c4'; ctx.beginPath(); ctx.moveTo(len * 0.5, 0); ctx.lineTo(len * 0.28, -3); ctx.lineTo(len * 0.28, 3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8a7a5a'; ctx.beginPath(); ctx.moveTo(-len * 0.6, 0); ctx.lineTo(-len * 0.8, -4); ctx.moveTo(-len * 0.6, 0); ctx.lineTo(-len * 0.8, 4); ctx.stroke();
      } else if (pr.kind === 'rock') {
        ctx.rotate(pr.t * 8 - ang);
        const s = spr('rock', pr.color, 16); ctx.drawImage(s.cv, -8, -8, 16, 16);
      } else {
        ctx.rotate(-ang);
        const s = spr(pr.spec.shape, pr.color, pr.spec.size);
        ctx.drawImage(s.cv, -pr.spec.size / 2, -pr.spec.size / 2, pr.spec.size, pr.spec.size);
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ================================================================ demo (grid gallery + projectiles + text + perf)
  VFX.demo = function (canvas, q) {
    VFX.clear();
    const ctx = canvas.getContext('2d');
    const kinds = VFX.kinds();
    const cols = 8, cellW = 168, cellH = 160;
    const rows = Math.ceil(kinds.length / cols);
    const originY = 40;
    const gridH = originY + rows * cellH + 10;
    const projH = 130;
    const textH = 90;
    const W = Math.max(canvas.width, cols * cellW + 28);
    const H = Math.max(canvas.height, gridH + projH + textH + 30);
    canvas.width = W; canvas.height = H;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#12151e'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f1d98a'; ctx.font = '700 16px Georgia, serif'; ctx.textBaseline = 'top';
    ctx.fillText('AOW.VFX — ' + kinds.length + ' kinds (representative moment, fixed-step advance)', 14, 8);

    const cellPos = kinds.map((k, i) => ({
      k,
      cx: 14 + (i % cols) * cellW + cellW / 2,
      cy: originY + Math.floor(i / cols) * cellH + cellH / 2 - 12,
    }));
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    cellPos.forEach((c, i) => {
      const gx = 14 + (i % cols) * cellW, gy = originY + Math.floor(i / cols) * cellH;
      ctx.strokeRect(gx + 4, gy + 4, cellW - 8, cellH - 8);
    });

    // ambient/persistent kinds need many steps to fill an area with particles before they look
    // representative; short bursts need to be sampled soon after spawn, near their visual peak.
    // Spawning the two groups at different times (and cancelling the ambient ones before drawing
    // the once-only burst kinds) lets one fixed-step advance serve both well.
    const AMBIENT = { snow: 1, rain: 1, leaves: 1, embers: 1, mist: 1, blessing_aura: 1, curse_aura: 1, selection_glow: 1 };
    // kinds whose natural spatial reach (fall height, burst speed) is much larger than one grid
    // cell get a smaller reach just for this gallery so they don't streak through neighboring cells.
    const REACH = { meteor: { fallHeight: 56 }, lightning_strike: { height: 56 } };
    const STEP = 1 / 60;
    const ambientHandles = [];
    cellPos.forEach(c => {
      if (!AMBIENT[c.k]) return;
      const params = {};
      let sx = c.cx, sy = c.cy;
      if (c.k === 'snow' || c.k === 'rain' || c.k === 'leaves' || c.k === 'embers' || c.k === 'mist') {
        params.w = cellW - 34; params.h = cellH - 56;
        sx = c.cx - params.w / 2; sy = c.cy - params.h / 2;
      }
      ambientHandles.push(VFX.spawn(c.k, sx, sy, params));
    });
    for (let i = 0; i < 70; i++) VFX.update(STEP); // let ambient emitters fill their area
    const burstHandles = [];
    cellPos.forEach(c => {
      if (AMBIENT[c.k]) return;
      burstHandles.push(VFX.spawn(c.k, c.cx, c.cy, REACH[c.k] || {}));
    });
    for (let i = 0; i < 15; i++) VFX.update(STEP); // sample bursts near their visual peak, not their tail
    VFX.draw(ctx, 'below');
    VFX.draw(ctx, 'above');
    ambientHandles.concat(burstHandles).forEach(function (h) { try { h.cancel(); } catch (e) { /* ignore */ } });

    ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    cellPos.forEach((c, i) => {
      const ly = originY + Math.floor(i / cols) * cellH + cellH - 14;
      ctx.fillStyle = 'rgba(10,12,18,0.68)'; ctx.fillRect(c.cx - cellW / 2 + 6, ly - 2, cellW - 12, 14);
      ctx.fillStyle = '#e8e2d0'; ctx.fillText(c.k, c.cx, ly);
    });
    ctx.textAlign = 'left';

    // ---- projectiles mid-flight ----
    const py = gridH + 6;
    ctx.fillStyle = '#f1d98a'; ctx.font = '700 14px Georgia, serif'; ctx.fillText('Projectiles (mid-flight)', 14, py);
    const projKinds = VFX.PROJECTILES;
    const py0 = py + 30, py1 = py + 90, seg = (W - 40) / projKinds.length;
    projKinds.forEach((k, i) => { const x0 = 20 + i * seg, x1 = x0 + seg * 0.72; VFX.projectile(k, x0, py0, x1, py1, {}); });
    for (let i = 0; i < 9; i++) VFX.update(STEP);
    VFX.draw(ctx, 'below');
    VFX.draw(ctx, 'above');
    ctx.font = '600 10px system-ui, sans-serif'; ctx.fillStyle = '#a49c88';
    projKinds.forEach((k, i) => ctx.fillText(k, 20 + i * seg, py1 + 16));

    // ---- floating text ----
    const ty = py1 + 40;
    ctx.fillStyle = '#f1d98a'; ctx.font = '700 14px Georgia, serif'; ctx.fillText('Floating text', 14, ty);
    VFX.text(90, ty + 34, '-24', { color: '#ffffff' });
    VFX.text(220, ty + 34, '-58', { color: '#ffe86a', crit: true });
    VFX.text(350, ty + 34, '+32', { color: '#9bd35a' });
    VFX.text(480, ty + 34, 'Miss', { color: '#a49c88' });
    VFX.text(610, ty + 34, 'Resisted', { color: '#7fa0ff' });
    for (let i = 0; i < 7; i++) VFX.update(STEP);
    VFX.draw(ctx, 'above');
    VFX.clear();

    // ---- perf: 2000 particles (measured off-screen so it never touches the visible gallery) ----
    const perfCv = Art.canvas(800, 600), perfCtx = perfCv.ctx;
    VFX.stress(2000);
    const N = 30;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) VFX.update(STEP);
    const tUpdate = (performance.now() - t0) / N;
    const t1 = performance.now();
    for (let i = 0; i < N; i++) { VFX.draw(perfCtx, 'below'); VFX.draw(perfCtx, 'above'); }
    const tDraw = (performance.now() - t1) / N;
    VFX.clear();

    const info = 'kinds=' + kinds.length + ' particles=2000 update=' + tUpdate.toFixed(3) + 'ms draw=' + tDraw.toFixed(3) + 'ms';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(10,12,18,0.85)'; ctx.fillRect(0, H - 22, W, 22);
    ctx.fillStyle = '#9bd35a'; ctx.font = '600 12px monospace'; ctx.fillText(info, 10, H - 17);
    return info;
  };

  initSprites();
  AOW.VFX = VFX;
})(window.AOW = window.AOW || {});
