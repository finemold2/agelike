// src/art/units.js — AOW.UnitArt: compositional painterly unit sprites, portraits and army banners
//
// Public API (SPEC §6, extended additively):
//   UnitArt.resolveLook(unitType, formLook, player) → look     merged look for a unit instance (racial units adopt the form,
//                                                              player colors tint cloth/banner/trim, culture palette tints accents)
//   UnitArt.draw(ctx, x, y, o)     o = {look, unitType?, playerColor, playerColor2, facing:'left'|'right', frame, anim, scale, hero, alpha}
//                                  anchor = feet center; a soft ground shadow is part of the sprite
//   UnitArt.portrait(look, o) → canvas   o = {size:96, playerColor, playerColor2, affinity, frame:true, hero}
//                                  (legacy signature portrait(unitType, look, playerColor, size) is also accepted)
//   UnitArt.armyBanner(ctx, x, y, o)     o = {playerColor, playerColor2, bannerShape, count, hero, sigil:0..15, frame, scale}
//   UnitArt.spriteKey(look, anim, frame, facing) → string     stable cache key
//   UnitArt.demo(canvas, query)          gallery (query.get('zoom') scales the whole sheet)
// Additive helpers: UnitArt.FRAMES (frames per anim), UnitArt.BODIES / ARMORS / WEAPONS / HELMS (supported values),
//   UnitArt.metrics(look) → {H, w, h} sprite metrics, UnitArt.elementColor(el), UnitArt.sigil(ctx, i, x, y, r, color)
//
// Rig: every sprite is rendered once per (look, anim, frame) into an offscreen canvas at RS×(world px) via Art.sprite and
// then drawn scaled; facing left is a horizontal flip. Coordinates inside generators are world px with the feet at (0,0),
// +x = forward (facing right), −y = up. Key light top-left (warm), shadows cool bottom-right, 1px ink outline.
(function (AOW) {
  'use strict';
  const UnitArt = {};
  const M = AOW.M, C = AOW.Color, Art = AOW.Art;
  const TAU = Math.PI * 2;
  const RS = 2;                       // internal render scale (device px per world px)
  const BASE_H = 34;                  // medium humanoid height in world px at scale 1
  const OUT = 'rgba(20,15,30,0.62)';  // ink outline
  const OUT_SOFT = 'rgba(20,15,30,0.35)';
  const SIZE_MULT = { small: 0.8, medium: 1, large: 1.3, huge: 1.7 };
  const FRAMES = { idle: 4, walk: 4, attack: 6, hit: 1, death: 4, cast: 4 };
  UnitArt.FRAMES = FRAMES;
  UnitArt.BODIES = ['form', 'undead', 'skeleton', 'ghost', 'spirit', 'wisp', 'angel', 'archon', 'demon', 'fiend', 'giant', 'golem', 'treant', 'vampire',
    'horse_rider', 'wolf_rider', 'boar_rider', 'drake', 'beast_wolf', 'beast_bear', 'beast_boar', 'beast_spider', 'beast_serpent', 'beast_lion', 'beast_elk',
    'dragon', 'phoenix', 'bird', 'kraken', 'elemental', 'skull', 'eldritch', 'plant', 'insect', 'slime'];
  UnitArt.ARMORS = ['none', 'cloth', 'leather', 'chain', 'plate', 'robe', 'heavy_plate', 'ceremonial'];
  UnitArt.WEAPONS = ['none', 'sword', 'sword_shield', 'spear', 'spear_shield', 'pike', 'axe', 'great_axe', 'great_sword', 'mace', 'hammer', 'bow', 'crossbow',
    'sling', 'javelin', 'staff', 'orb', 'wand', 'claws', 'daggers', 'halberd', 'lance', 'torch', 'banner', 'instrument', 'tome'];
  UnitArt.HELMS = ['none', 'cap', 'hood', 'open', 'full', 'crown', 'horned', 'hat', 'circlet'];
  UnitArt.SHIELDS = ['none', 'round', 'kite', 'tower', 'buckler'];

  // ================================================================ color helpers
  const colorMemo = new Map();
  function memo(k, fn) { let v = colorMemo.get(k); if (v === undefined) { v = fn(); if (colorMemo.size > 4000) colorMemo.clear(); colorMemo.set(k, v); } return v; }
  const lt = (c, t) => memo('l' + c + t, () => C.mix(c, '#fff4dc', t));   // warm light
  const dk = (c, t) => memo('d' + c + t, () => C.mix(c, '#161430', t));   // cool shadow
  const al = (c, a) => memo('a' + c + a, () => C.alpha(c, a));
  const mix = (a, b, t) => memo('m' + a + b + t, () => C.mix(a, b, t));
  const ELEMENT = { fire: '#ff8a2a', frost: '#8ae0ff', lightning: '#ffe86a', shadow: '#a45ae0', nature: '#8ee060', holy: '#fff0b0', arcane: '#8fa0ff',
    blight: '#9ad63a', stone: '#e0b060', water: '#4fb0e8', spirit: '#d9c4ff', physical: '#cfc8ba' };
  UnitArt.elementColor = el => ELEMENT[el] || null;
  const METAL = { steel: '#b9bec8', dark: '#4a4d58', gold: '#e6c25a', bronze: '#c08a48', bone: '#e8e0c8', silver: '#e6e9f0', iron: '#7a7e88' };

  // ================================================================ shape helpers (current path → painted shape)
  /** fill the current path with a key-lit gradient over bbox (x,y,w,h) and ink outline. o={metal,light,dark,lw,noOut,alpha,glow} */
  function paint(ctx, base, x, y, w, h, o) {
    o = o || {};
    const light = o.light === undefined ? 0.35 : o.light, dark = o.dark === undefined ? 0.4 : o.dark;
    let fs;
    if (o.metal) {
      fs = Art.grad(ctx, x, y, x + w, y + h, [[0, lt(base, 0.6)], [0.3, base], [0.48, lt(base, 0.35)], [0.7, dk(base, 0.3)], [1, dk(base, 0.6)]]);
    } else if (o.flat) fs = base;
    else fs = Art.grad(ctx, x, y, x + w, y + h, [[0, lt(base, light)], [0.5, base], [1, dk(base, dark)]]);
    if (o.alpha !== undefined) { ctx.save(); ctx.globalAlpha *= o.alpha; }
    ctx.fillStyle = fs; ctx.fill();
    if (!o.noOut) { ctx.strokeStyle = o.out || OUT; ctx.lineWidth = o.lw || 0.8; ctx.lineJoin = 'round'; ctx.stroke(); }
    if (o.alpha !== undefined) ctx.restore();
  }
  function ell(ctx, cx, cy, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.05, rx), Math.max(0.05, ry), rot || 0, 0, TAU); ctx.closePath(); }
  function circ(ctx, cx, cy, r) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.05, r), 0, TAU); ctx.closePath(); }
  function poly(ctx, pts) { ctx.beginPath(); for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  /** smooth closed blob through points */
  function blob(ctx, pts) { Art.curve(ctx, pts, true); }
  function line(ctx, pts, color, w, cap) {
    ctx.beginPath(); for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = cap || 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  /** soft radial glow (additive-ish) */
  function glow(ctx, x, y, r, color, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = Art.rgrad(ctx, x, y, 0, r, [[0, al(color, a)], [0.5, al(color, a * 0.35)], [1, al(color, 0)]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  /** limb: 2-segment tube (shoulder→joint→hand) with outline + top-left highlight. */
  function limb(ctx, pts, w, color, o) {
    o = o || {};
    line(ctx, pts, o.out || OUT, w + 1.3);
    line(ctx, pts, color, w);
    if (!o.noHi) { ctx.save(); ctx.globalAlpha *= 0.55; line(ctx, pts.map(p => [p[0] - w * 0.18, p[1] - w * 0.22]), lt(color, 0.45), w * 0.32); ctx.restore(); }
    if (o.shadeEnd) { ctx.save(); ctx.globalAlpha *= 0.35; line(ctx, pts.slice(-2), dk(color, 0.5), w * 0.5); ctx.restore(); }
  }
  /** 2-bone IK: joint position for a limb from (sx,sy) to (hx,hy), bend = +1|-1 */
  function ik(sx, sy, hx, hy, l1, l2, bend) {
    let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy);
    const maxD = (l1 + l2) * 0.985;
    if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }
    if (d < 0.01) return [sx + l1 * bend, sy];
    const a = Math.acos(M.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const ang = Math.atan2(dy, dx) + a * bend;
    return [sx + Math.cos(ang) * l1, sy + Math.sin(ang) * l1, sx + dx, sy + dy];
  }
  const sinF = (frame, n, phase) => Math.sin(((frame % n) / n + (phase || 0)) * TAU);

  // ================================================================ look resolution
  const DEFAULT_LOOK = {
    body: 'form', armor: 'cloth', weapon: 'none', helm: 'none', cape: false, shield: 'none', element: null, size: 'medium', tint: null, glow: null,
    skin: '#e0b090', skin2: '#c48a63', hair: '#4a2f1a', ears: 'round', horns: false, tail: false, snout: false, fur: null, height: 1, build: 'normal',
    feet: 'boots', eyes: '#3a2a1a', head: 'humanoid', feathers: false, scales: false,
    cloth: '#3f7fe0', cloth2: '#c9d9ff', accent: null, metal: null, rider: false, wings: false, crown: null, seed: 0, tier: 1,
  };
  const FORM_FIELDS = ['skin', 'skin2', 'hair', 'ears', 'horns', 'tail', 'snout', 'fur', 'height', 'build', 'feet', 'eyes', 'head', 'feathers', 'scales', 'glow'];
  const KEY_FIELDS = ['body', 'armor', 'weapon', 'helm', 'cape', 'shield', 'element', 'size', 'tint', 'glow', 'skin', 'skin2', 'hair', 'ears', 'horns', 'tail',
    'snout', 'fur', 'height', 'build', 'feet', 'eyes', 'head', 'feathers', 'scales', 'cloth', 'cloth2', 'accent', 'metal', 'rider', 'wings', 'crown', 'seed', 'tier'];

  /**
   * Merge a unit type's look with the player's form look and colors.
   * racial units (tags include 'racial' or look.body === 'form') take the form's body fields; unitType.formLook overrides them (marauders).
   */
  UnitArt.resolveLook = function (unitType, formLook, player) {
    const ut = unitType || {};
    const look = Object.assign({}, DEFAULT_LOOK, ut.look || {});
    const racial = (ut.tags && ut.tags.indexOf('racial') >= 0) || !ut.look || !ut.look.body || ut.look.body === 'form' ||
      /_rider$/.test(ut.look.body) || ut.look.body === 'vampire';
    if (racial && formLook) {
      for (const f of FORM_FIELDS) if (formLook[f] !== undefined && formLook[f] !== null && !(f === 'glow' && look.glow)) look[f] = formLook[f];
      if (formLook.hair === null) look.hair = null;
      if (formLook.fur === null && look.fur && !formLook.fur) look.fur = null;
    }
    if (ut.formLook) Object.assign(look, ut.formLook);
    if (player) {
      if (player.color) look.cloth = player.color;
      if (player.color2) look.cloth2 = player.color2;
      else if (player.color) look.cloth2 = C.hex(lt(player.color, 0.6));
      const cultures = AOW.Data && AOW.Data.cultures;
      const cul = cultures && player.cultureId && cultures[player.cultureId];
      if (cul && cul.palette) { look.accent = cul.palette.accent || look.accent; if (cul.palette.primary && !look.metal) look.metal = cul.palette.secondary || null; }
    }
    if (ut.tier) look.tier = ut.tier;
    if (ut.id) look.seed = Art.hash(ut.id) % 1000;
    if (look.hero === undefined && ut.tags && ut.tags.indexOf('hero') >= 0) look.hero = true;
    return look;
  };
  function normLook(look) {
    if (!look) return Object.assign({}, DEFAULT_LOOK);
    if (look.__norm) return look;
    const l = Object.assign({}, DEFAULT_LOOK, look);
    if (l.body === 'undead' && look.skin === undefined) { l.skin = '#8a9a7a'; l.skin2 = '#5a6a50'; l.eyes = '#c8f060'; }
    if (l.body === 'vampire' && look.skin === undefined) { l.skin = '#e8e0e0'; l.skin2 = '#b8a8b0'; l.eyes = '#d02020'; }
    if (l.body === 'demon' && look.skin === undefined) { l.skin = '#b8342a'; l.skin2 = '#7a1c18'; l.eyes = '#ffd040'; l.hair = null; l.horns = l.horns || 'curled'; l.tail = l.tail || 'thin'; l.wings = true; }
    if (l.body === 'fiend' && look.skin === undefined) { l.skin = '#4a2a60'; l.skin2 = '#2a1438'; l.eyes = '#ff5a30'; l.hair = null; l.horns = l.horns || 'straight'; l.tail = l.tail || 'thin'; }
    if (l.body === 'angel' && look.skin === undefined) { l.skin = '#f4e8d8'; l.skin2 = '#e0c8a8'; l.hair = '#f0e0b0'; l.eyes = '#f8e8a0'; l.wings = true; }
    if (l.body === 'archon' && look.skin === undefined) { l.skin = '#f0e8ff'; l.skin2 = '#c8b8e0'; l.hair = null; l.eyes = '#ffffff'; l.wings = true; }
    if (l.body === 'giant' && look.height === undefined) { l.height = 1.15; l.build = 'huge'; if (l.size === 'medium') l.size = 'huge'; }
    if (l.body === 'golem' && look.skin === undefined) { l.skin = l.element === 'stone' || !l.element ? '#9a917f' : '#b9bec8'; l.skin2 = '#5a5450'; l.eyes = l.glow || '#ffc65a'; l.hair = null; l.build = 'huge'; }
    if (l.body === 'treant' && look.skin === undefined) { l.skin = '#6a4a2e'; l.skin2 = '#3e2a18'; l.eyes = '#c8f060'; l.hair = null; l.build = 'huge'; }
    if (l.body === 'skeleton' && look.skin === undefined) { l.skin = '#e8e0c8'; l.skin2 = '#a89c80'; l.hair = null; l.eyes = '#a0f0ff'; }
    if (l.body === 'ghost' && look.skin === undefined) { l.skin = '#a8d8f0'; l.skin2 = '#6a9ab8'; l.eyes = '#ffffff'; l.hair = null; }
    if (l.body === 'dragon' || l.body === 'drake' || l.body === 'phoenix' || l.body === 'kraken' || l.body === 'eldritch') { if (l.size === 'medium' && l.body !== 'drake') l.size = 'huge'; }
    l.__norm = true;
    return l;
  }
  function compact(look) { return KEY_FIELDS.map(k => { const v = look[k]; return v === undefined || v === null || v === false ? 0 : v === true ? 1 : v; }); }
  UnitArt.spriteKey = function (look, anim, frame, facing) {
    const l = normLook(look);
    return 'unit|' + JSON.stringify(compact(l)) + '|' + (anim || 'idle') + '|' + (frame | 0) + '|' + (facing || 'right');
  };

  // ================================================================ metrics
  const MOUNTED = { horse_rider: 1, wolf_rider: 1, boar_rider: 1 };
  const BEASTS = { beast_wolf: 1, beast_bear: 1, beast_boar: 1, beast_spider: 1, beast_serpent: 1, beast_lion: 1, beast_elk: 1 };
  const HUMANOID = { form: 1, undead: 1, skeleton: 1, ghost: 1, angel: 1, archon: 1, demon: 1, fiend: 1, giant: 1, golem: 1, treant: 1, vampire: 1 };
  UnitArt.metrics = function (look, hero) {
    const l = normLook(look);
    const sm = SIZE_MULT[l.size] || 1;
    let H = BASE_H * (l.height || 1) * sm * (hero ? 1.1 : 1);
    if (HUMANOID[l.body] === undefined) H = BASE_H * sm * (hero ? 1.1 : 1);
    let wf = 2.2, hf = 1.55;
    if (l.wings || l.body === 'angel' || l.body === 'archon' || l.body === 'demon') { wf = 2.8; hf = 1.75; }
    if (MOUNTED[l.body] || l.body === 'drake') { wf = 2.6; hf = 1.9; }
    if (l.body === 'dragon' || l.body === 'phoenix') { wf = 2.8; hf = 1.9; }
    if (l.body === 'kraken' || l.body === 'eldritch') { wf = 2.6; hf = 1.7; }
    if (BEASTS[l.body]) { wf = 2.6; hf = 1.4; }
    if (l.weapon === 'pike' || l.weapon === 'banner' || l.weapon === 'halberd' || l.weapon === 'spear' || l.weapon === 'spear_shield' || l.weapon === 'staff' || l.weapon === 'lance') hf = Math.max(hf, 1.9);
    const w = Math.ceil((H * wf + 16) * RS), h = Math.ceil((H * hf + 14) * RS);
    return { H, w, h, sm, feetY: 0.86 };
  };

  // ================================================================ sprite registration
  Art.sprite('unit', 64, 64, function (ctx, w, h, p) {
    const look = p.look, hero = !!p.hero;
    const mt = UnitArt.metrics(look, hero);
    ctx.translate(w / 2, h * mt.feetY);
    ctx.scale(RS, RS);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    drawUnit(ctx, normLook(look), p.anim || 'idle', p.frame | 0, hero, mt);
  }, { anchor: { x: 0.5, y: 0.86 }, sizeFn: p => { const m = UnitArt.metrics(p.look, !!p.hero); return { w: m.w, h: m.h }; } });

  function paramsFor(look, anim, frame, hero) {
    const l = normLook(look);
    const n = FRAMES[anim] || 1;
    return { look: KEY_FIELDS.reduce((o, k) => { if (l[k] !== undefined && l[k] !== null && l[k] !== false) o[k] = l[k]; return o; }, {}), anim, frame: ((frame | 0) % n + n) % n, hero: hero ? 1 : 0 };
  }

  /** draw a unit with its feet at (x,y). */
  UnitArt.draw = function (ctx, x, y, o) {
    o = o || {};
    let look = o.look;
    if (!look && o.unitType) look = UnitArt.resolveLook(o.unitType, o.formLook, o.player);
    look = normLook(look);
    if (o.playerColor && look.cloth !== o.playerColor) { look = Object.assign({}, look, { cloth: o.playerColor, cloth2: o.playerColor2 || C.hex(lt(o.playerColor, 0.6)), __norm: true }); }
    const hero = !!(o.hero || look.hero);
    const p = paramsFor(look, o.anim || 'idle', o.frame || 0, hero);
    const scale = (o.scale || 1) / RS;
    Art.draw(ctx, 'unit', x, y, p, { scale, flip: o.facing === 'left', alpha: o.alpha === undefined ? 1 : o.alpha });
  };

  // ================================================================ dispatcher
  function drawUnit(ctx, l, anim, frame, hero, mt) {
    const H = mt.H;
    const pose = makePose(l, anim, frame, H);
    // ground shadow (skipped for floaters, lighter for ghosts)
    const floating = l.body === 'ghost' || l.body === 'wisp' || l.body === 'spirit' || l.body === 'skull' || l.body === 'eldritch' || l.body === 'phoenix' || l.body === 'bird';
    const shW = H * (BEASTS[l.body] || MOUNTED[l.body] || l.body === 'dragon' ? 1.5 : 0.75), shH = shW * 0.32;
    if (pose.deathT < 1) Art.shadow(ctx, 0, 0, shW * (1 + pose.deathT * 0.6), shH, floating ? 0.18 : 0.38 * (1 - pose.deathT * 0.5));
    if (hero) glow(ctx, 0, -H * 0.05, H * 0.5, '#ffd870', 0.28);
    ctx.save();
    // death: fall backwards around the feet and fade
    if (pose.deathT > 0) { ctx.globalAlpha *= 1 - pose.deathT * 0.75; ctx.rotate(-pose.deathT * Math.PI * 0.46); }
    const body = l.body;
    if (HUMANOID[body]) drawHumanoid(ctx, l, pose, H, hero, 0, 0, 1);
    else if (MOUNTED[body]) drawMounted(ctx, l, pose, H, hero);
    else if (body === 'drake') drawDrake(ctx, l, pose, H, hero);
    else if (BEASTS[body]) drawBeast(ctx, l, pose, H);
    else if (body === 'dragon') drawDragon(ctx, l, pose, H);
    else if (body === 'phoenix' || body === 'bird') drawBird(ctx, l, pose, H, body === 'phoenix');
    else if (body === 'kraken') drawKraken(ctx, l, pose, H);
    else if (body === 'elemental') drawElemental(ctx, l, pose, H);
    else if (body === 'wisp' || body === 'spirit') drawWisp(ctx, l, pose, H);
    else if (body === 'skull') drawSkull(ctx, l, pose, H);
    else if (body === 'eldritch') drawEldritch(ctx, l, pose, H);
    else if (body === 'plant') drawPlant(ctx, l, pose, H);
    else if (body === 'insect') drawInsect(ctx, l, pose, H);
    else if (body === 'slime') drawSlime(ctx, l, pose, H);
    else drawHumanoid(ctx, l, pose, H, hero, 0, 0, 1);
    ctx.restore();
    // hit flash: white overlay on the drawn pixels
    if (pose.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * pose.flash) + ')'; ctx.fillRect(-999, -999, 1998, 1998); ctx.restore(); }
    if (hero && pose.deathT === 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18; ctx.fillStyle = '#ffd870'; ctx.fillRect(-H, -H * 1.6, H * 2, H * 1.7); ctx.restore(); }
  }

  /** animation pose parameters shared by all rigs (t in 0..1 where useful) */
  function makePose(l, anim, frame, H) {
    const n = FRAMES[anim] || 1, f = ((frame | 0) % n + n) % n, t = n > 1 ? f / (n - 1) : 0;
    const p = { anim, f, t, bob: 0, lean: 0, swing: 0, stride: 0, capeSway: 0, flash: 0, deathT: 0, cast: 0, lunge: 0, draw: 0, breath: 0, wingT: sinF(f, n) };
    if (anim === 'idle') { p.bob = sinF(f, n) * 0.5; p.capeSway = sinF(f, n, 0.25); p.breath = sinF(f, n); }
    else if (anim === 'walk') { p.stride = sinF(f, n); p.bob = Math.abs(sinF(f, n)) * 0.9; p.capeSway = sinF(f, n, 0.5) * 1.5; p.lean = 0.06; }
    else if (anim === 'attack') {
      // windup (0,1) → strike (2,3) → recover (4,5)
      const k = [-0.6, -1, 0.9, 1, 0.4, 0][f];
      p.swing = k; p.lunge = [0, -0.05, 0.2, 0.28, 0.12, 0][f] * H; p.lean = [-0.08, -0.12, 0.16, 0.2, 0.08, 0][f];
      p.draw = [0.3, 0.8, 1, 0, 0, 0][f]; p.release = f === 3 ? 1 : 0; p.capeSway = -k;
    }
    else if (anim === 'hit') { p.flash = 1; p.lean = -0.18; p.lunge = -H * 0.08; }
    else if (anim === 'death') { p.deathT = t; p.lean = -0.1 * t; }
    else if (anim === 'cast') { p.cast = f === 0 ? 0.3 : f === 1 ? 0.7 : 1; p.swing = -0.3 - 0.2 * p.cast; p.capeSway = sinF(f, n) * 1.5 + 1; }
    return p;
  }

  // (part 2: humanoid rig follows)
  // ================================================================ HUMANOID RIG
  const BUILD_W = { normal: 1, stocky: 1.32, slim: 0.86, huge: 1.3, small: 1.05 };
  const HEAD_R = { normal: 0.1, stocky: 0.115, slim: 0.095, huge: 0.088, small: 0.125 };
  function humanMetrics(l, H) {
    const b = l.build || 'normal';
    const BW = BUILD_W[b] || 1;
    const headR = H * (HEAD_R[b] || 0.1);
    const shoulderY = -H * (b === 'stocky' ? 0.66 : b === 'small' ? 0.64 : 0.71);
    const hipY = -H * (b === 'stocky' ? 0.4 : 0.43);
    const sw = H * 0.15 * BW, hw = sw * 0.7;
    return { BW, headR, shoulderY, hipY, sw, hw, headCY: shoulderY - headR * 1.12 - H * 0.012,
      armL: H * 0.165 * (b === 'huge' ? 1.1 : 1), armW: H * 0.07 * Math.sqrt(BW), legL: H * 0.23, legW: H * 0.085 * Math.sqrt(BW) };
  }
  const ARMOR_METAL = { plate: 1, heavy_plate: 1, ceremonial: 1, chain: 1 };
  function skinTone(l) { return l.fur || l.skin; }
  function clothColor(l) { return l.tint || l.cloth; }
  function metalColor(l, hero) {
    if (l.armor === 'ceremonial' || hero) return METAL.gold;
    if (l.body === 'skeleton' || l.body === 'undead') return METAL.iron;
    if (l.metal) return mix(METAL.steel, l.metal, 0.35);
    return METAL.steel;
  }
  function sleeveColor(l, hero) {
    const a = l.armor;
    if (a === 'cloth' || a === 'robe') return clothColor(l);
    if (a === 'leather') return '#7a5230';
    if (ARMOR_METAL[a]) return a === 'chain' ? METAL.iron : metalColor(l, hero);
    return skinTone(l);
  }
  function bootColor(l, hero) {
    const a = l.armor;
    if (ARMOR_METAL[a] && a !== 'chain') return metalColor(l, hero);
    if (a === 'none') return '#5a3a24';
    return '#4a3020';
  }

  /** main humanoid drawer. opts={rider:true (no legs, sits), scale} */
  function drawHumanoid(ctx, l, pose, H, hero, opts) {
    opts = opts || {};
    const m = humanMetrics(l, H);
    const body = l.body;
    const isGhost = body === 'ghost', isSkel = body === 'skeleton', isGolem = body === 'golem', isTreant = body === 'treant', isUndead = body === 'undead';
    const skin = skinTone(l);
    let floatY = 0;
    if (isGhost) floatY = -H * 0.12 + pose.bob * 2;
    ctx.save();
    if (isGhost) ctx.globalAlpha *= 0.82;
    ctx.translate(pose.lunge * 0.4, -pose.bob + floatY);
    const grip = gripFor(l);
    const hands = handTargets(l, m, H, pose, grip);
    const lean = pose.lean + (isUndead ? 0.22 : 0) + (l.head === 'ape' || l.head === 'rat' || l.head === 'goblin' ? 0.08 : 0) + (l.head === 'ghoul' ? 0.14 : 0);

    // ---- behind everything: wings, cape, halo
    if (l.wings || body === 'angel' || body === 'archon' || body === 'demon') drawWings(ctx, l, m, H, pose, body === 'demon' || body === 'fiend' ? 'bat' : body === 'archon' ? 'light' : 'feather');
    if (body === 'angel' || body === 'archon' || l.head === 'elysian') drawHalo(ctx, m, H, pose);
    ctx.save(); ctx.translate(0, m.hipY); ctx.rotate(lean); ctx.translate(0, -m.hipY);
    if (l.cape) drawCape(ctx, l, m, H, pose, hero);
    ctx.restore();
    // ---- far arm (behind torso)
    ctx.save(); ctx.translate(0, m.hipY); ctx.rotate(lean); ctx.translate(0, -m.hipY);
    drawArm(ctx, l, m, H, pose, hero, false, hands.far, grip, isSkel, isGolem, isTreant);
    ctx.restore();
    // ---- tail (behind)
    if (l.tail) drawTail(ctx, l, m, H, pose);
    // ---- legs
    if (!opts.rider) {
      if (isGhost) drawGhostTail(ctx, l, m, H, pose);
      else drawLegs(ctx, l, m, H, pose, hero, isSkel, isGolem, isTreant);
    }
    // ---- torso + head + near arm (leaning)
    ctx.save(); ctx.translate(0, m.hipY); ctx.rotate(lean); ctx.translate(0, -m.hipY);
    if (isSkel) drawRibcage(ctx, l, m, H, hero);
    else if (isGolem) drawGolemTorso(ctx, l, m, H);
    else if (isTreant) drawTreantTorso(ctx, l, m, H, pose);
    else drawTorso(ctx, l, m, H, hero, pose);
    if (ARMOR_METAL[l.armor] && l.armor !== 'chain' && !isGolem && !isTreant) drawPauldron(ctx, l, m, H, hero, false);
    drawHead(ctx, l, 0, m.headCY, m.headR, false, pose, hero);
    drawArm(ctx, l, m, H, pose, hero, true, hands.near, grip, isSkel, isGolem, isTreant);
    if (ARMOR_METAL[l.armor] && l.armor !== 'chain' && !isGolem && !isTreant) drawPauldron(ctx, l, m, H, hero, true);
    ctx.restore();
    // ---- element aura
    if (l.element && (l.weapon === 'none' || l.weapon === 'claws')) { const c = ELEMENT[l.element]; glow(ctx, hands.near.x, hands.near.y, H * 0.14, c, 0.7); }
    if (l.glow && !l.element) glow(ctx, 0, m.headCY, m.headR * 2.2, l.glow, 0.32);
    if (isGhost) glow(ctx, 0, m.hipY, H * 0.5, '#8ad0ff', 0.28);
    ctx.restore();
  }

  // ---------------------------------------------------------------- torso & armor
  function torsoPath(ctx, m, H, o) {
    const sY = m.shoulderY, hY = m.hipY, sw = m.sw * (o && o.w || 1), hw = m.hw * (o && o.w || 1);
    ctx.beginPath();
    ctx.moveTo(-sw, sY + H * 0.01);
    ctx.quadraticCurveTo(0, sY - H * 0.03, sw, sY + H * 0.01);
    ctx.quadraticCurveTo(sw * 1.02, (sY + hY) / 2, hw, hY + H * 0.03);
    ctx.quadraticCurveTo(0, hY + H * 0.05, -hw, hY + H * 0.03);
    ctx.quadraticCurveTo(-sw * 1.02, (sY + hY) / 2, -sw, sY + H * 0.01);
    ctx.closePath();
  }
  function drawTorso(ctx, l, m, H, hero, pose) {
    const a = l.armor, sw = m.sw, hw = m.hw, sY = m.shoulderY, hY = m.hipY;
    const cloth = clothColor(l), trim = l.cloth2 || lt(cloth, 0.6), metal = metalColor(l, hero), skin = skinTone(l);
    const isUndead = l.body === 'undead';
    // robe: long skirt first (covers legs), drawn from waist down to the ground with a flare
    if (a === 'robe') {
      const flare = sw * 1.5, sway = pose.capeSway * 0.6;
      ctx.beginPath(); ctx.moveTo(-hw, hY); ctx.lineTo(hw, hY);
      ctx.quadraticCurveTo(hw * 1.5, -H * 0.16, flare + sway, -H * 0.005);
      ctx.quadraticCurveTo(0, H * 0.02, -flare + sway, -H * 0.005);
      ctx.quadraticCurveTo(-hw * 1.5, -H * 0.16, -hw, hY); ctx.closePath();
      paint(ctx, dk(cloth, 0.12), -flare, hY, flare * 2, -hY, { light: 0.25, dark: 0.5 });
      ctx.save(); ctx.clip();
      ctx.strokeStyle = dk(cloth, 0.45); ctx.lineWidth = 0.7; ctx.globalAlpha = 0.55;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * hw * 0.45, hY + H * 0.04); ctx.quadraticCurveTo(i * hw * 0.6 + sway * 0.3, -H * 0.2, i * flare * 0.42 + sway, -H * 0.01); ctx.stroke(); }
      ctx.restore();
      // hem trim
      ctx.beginPath(); ctx.moveTo(-flare + sway, -H * 0.01); ctx.quadraticCurveTo(0, H * 0.025, flare + sway, -H * 0.01);
      ctx.strokeStyle = trim; ctx.lineWidth = H * 0.02; ctx.stroke();
    }
    torsoPath(ctx, m, H);
    const bbox = [-sw, sY, sw * 2, hY - sY];
    if (a === 'none') paint(ctx, skin, ...bbox, { light: 0.3, dark: 0.45 });
    else if (a === 'cloth' || a === 'robe') paint(ctx, cloth, ...bbox, { light: 0.32, dark: 0.45 });
    else if (a === 'leather') paint(ctx, '#7a5230', ...bbox, { light: 0.35, dark: 0.45 });
    else if (a === 'chain') paint(ctx, METAL.iron, ...bbox, { metal: true });
    else paint(ctx, metal, ...bbox, { metal: true });
    ctx.save(); torsoPath(ctx, m, H); ctx.clip();
    const midY = (sY + hY) / 2;
    if (a === 'none') {
      // pectoral / abdomen lines
      ctx.strokeStyle = al(dk(skin, 0.5), 0.5); ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-sw * 0.6, sY + H * 0.1); ctx.quadraticCurveTo(0, sY + H * 0.14, sw * 0.6, sY + H * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, sY + H * 0.12); ctx.lineTo(0, hY - H * 0.02); ctx.stroke();
      if (isUndead) { ctx.fillStyle = al('#3a5a30', 0.5); ell(ctx, sw * 0.3, midY, sw * 0.35, H * 0.05, 0.4); ctx.fill(); }
    } else if (a === 'cloth') {
      // tunic folds + collar
      ctx.strokeStyle = al(dk(cloth, 0.5), 0.55); ctx.lineWidth = 0.6;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * sw * 0.45, sY + H * 0.06); ctx.quadraticCurveTo(i * sw * 0.35, midY, i * hw * 0.5, hY); ctx.stroke(); }
      ctx.fillStyle = al(lt(cloth, 0.3), 0.5); ctx.beginPath(); ctx.moveTo(-sw * 0.5, sY); ctx.lineTo(sw * 0.5, sY); ctx.lineTo(0, sY + H * 0.07); ctx.closePath(); ctx.fill();
      if (isUndead) { ctx.fillStyle = al('#2a2a24', 0.55); ell(ctx, -sw * 0.3, midY + H * 0.02, sw * 0.3, H * 0.04, -0.5); ctx.fill(); }
    } else if (a === 'leather') {
      // diagonal strap + studs
      ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = H * 0.03; ctx.beginPath(); ctx.moveTo(-sw * 0.8, sY + H * 0.02); ctx.lineTo(sw * 0.6, hY); ctx.stroke();
      ctx.fillStyle = METAL.bronze; for (let i = 0; i < 4; i++) { circ(ctx, -sw * 0.6 + i * sw * 0.4, sY + H * 0.03 + i * (hY - sY) * 0.27, H * 0.012); ctx.fill(); }
      ctx.strokeStyle = al('#3a2010', 0.6); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-sw * 0.5, sY + H * 0.12); ctx.lineTo(sw * 0.5, sY + H * 0.12); ctx.stroke();
    } else if (a === 'chain') {
      // mail dots
      ctx.fillStyle = al(lt(METAL.iron, 0.6), 0.45);
      const st = Math.max(1.2, H * 0.035);
      for (let y = sY + st; y < hY; y += st) for (let x = -sw + ((y / st) | 0) % 2 * st * 0.5; x < sw; x += st) { circ(ctx, x, y, st * 0.22); ctx.fill(); }
      // tabard in player color over the chest
      ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-sw * 0.42, sY - 1); ctx.lineTo(sw * 0.42, sY - 1); ctx.lineTo(hw * 0.45, hY + 2); ctx.lineTo(-hw * 0.45, hY + 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = trim; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = al(dk(cloth, 0.4), 0.45); ctx.beginPath(); ctx.moveTo(sw * 0.1, sY); ctx.lineTo(sw * 0.42, sY); ctx.lineTo(hw * 0.45, hY + 2); ctx.lineTo(hw * 0.1, hY + 2); ctx.closePath(); ctx.fill();
    } else {
      // plate family: breastplate ridge, gorget, waist plates, tabard band
      ctx.strokeStyle = al(dk(metal, 0.55), 0.7); ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, sY + H * 0.05); ctx.lineTo(0, hY - H * 0.02); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-sw * 0.8, midY + H * 0.02); ctx.quadraticCurveTo(0, midY + H * 0.06, sw * 0.8, midY + H * 0.02); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-sw * 0.7, sY + H * 0.05); ctx.quadraticCurveTo(0, sY + H * 0.09, sw * 0.7, sY + H * 0.05); ctx.stroke();
      ctx.strokeStyle = al(lt(metal, 0.7), 0.6); ctx.beginPath(); ctx.moveTo(-sw * 0.55, sY + H * 0.04); ctx.quadraticCurveTo(-sw * 0.3, midY - H * 0.02, -sw * 0.15, hY - H * 0.03); ctx.stroke();
      if (a === 'heavy_plate' || a === 'ceremonial') {
        // rivets and a second plate layer
        ctx.fillStyle = a === 'ceremonial' ? '#fff0c0' : lt(metal, 0.5);
        for (let i = -2; i <= 2; i++) { circ(ctx, i * sw * 0.38, sY + H * 0.045, H * 0.011); ctx.fill(); }
        ctx.strokeStyle = al(dk(metal, 0.6), 0.6); ctx.beginPath(); ctx.moveTo(-sw * 0.9, hY - H * 0.06); ctx.quadraticCurveTo(0, hY - H * 0.02, sw * 0.9, hY - H * 0.06); ctx.stroke();
      }
      if (a === 'plate' || a === 'ceremonial' || a === 'heavy_plate') {
        // tabard/sash band in player color
        const bw = a === 'ceremonial' ? 0.3 : 0.24;
        ctx.fillStyle = al(cloth, 0.92); ctx.beginPath(); ctx.moveTo(-sw * bw, sY + H * 0.03); ctx.lineTo(sw * bw, sY + H * 0.03); ctx.lineTo(hw * bw * 1.1, hY + 2); ctx.lineTo(-hw * bw * 1.1, hY + 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = a === 'ceremonial' ? METAL.gold : trim; ctx.lineWidth = 0.6; ctx.stroke();
        if (a === 'ceremonial') { ctx.fillStyle = l.element ? ELEMENT[l.element] : '#ff6a4a'; circ(ctx, 0, midY, H * 0.022); ctx.fill(); glow(ctx, 0, midY, H * 0.06, l.element ? ELEMENT[l.element] : '#ff8a6a', 0.5); }
      }
    }
    // cool shadow on the back side + warm rim on the front
    ctx.fillStyle = Art.grad(ctx, -sw, 0, sw, 0, [[0, 'rgba(20,20,60,0.28)'], [0.45, 'rgba(20,20,60,0)'], [0.85, 'rgba(255,255,255,0)'], [1, 'rgba(255,240,200,0.18)']]);
    ctx.fillRect(-sw - 1, sY - 3, sw * 2 + 2, hY - sY + 6);
    ctx.restore();
    // belt
    if (a !== 'none' || l.body === 'giant') {
      const by = hY - H * 0.035;
      ctx.strokeStyle = a === 'robe' ? trim : '#3a2414'; ctx.lineWidth = H * 0.032; ctx.beginPath(); ctx.moveTo(-hw - 0.5, by); ctx.lineTo(hw + 0.5, by); ctx.stroke();
      ctx.fillStyle = a === 'robe' ? lt(trim, 0.3) : (hero || a === 'ceremonial') ? METAL.gold : METAL.bronze;
      ctx.fillRect(hw * 0.15, by - H * 0.02, H * 0.035, H * 0.04);
    }
    if (l.body === 'giant' || (a === 'none' && l.body === 'form' && l.head !== 'humanoid')) {
      // loincloth / fur wrap
      ctx.fillStyle = l.body === 'giant' ? '#6a4a30' : cloth; ctx.beginPath(); ctx.moveTo(-hw, hY - H * 0.02); ctx.lineTo(hw, hY - H * 0.02); ctx.lineTo(hw * 0.9, hY + H * 0.14); ctx.lineTo(-hw * 0.9, hY + H * 0.14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
    }
    if (hero) { torsoPath(ctx, m, H); ctx.strokeStyle = al(METAL.gold, 0.85); ctx.lineWidth = 0.9; ctx.stroke(); }
  }
  function drawPauldron(ctx, l, m, H, hero, near) {
    const metal = metalColor(l, hero), x = near ? m.sw * 0.72 : -m.sw * 0.72, y = m.shoulderY + H * 0.03;
    const r = H * (l.armor === 'heavy_plate' ? 0.075 : l.armor === 'ceremonial' ? 0.07 : 0.06) * Math.sqrt(m.BW);
    if (l.armor === 'heavy_plate') { // layered spiked pauldron
      ell(ctx, x, y + r * 0.35, r * 1.15, r * 0.75); paint(ctx, dk(metal, 0.2), x - r, y - r * 0.4, r * 2, r * 1.5, { metal: true });
      poly(ctx, [[x - r * 0.3, y - r * 0.6], [x + (near ? 1 : -1) * r * 0.5, y - r * 1.5], [x + r * 0.5, y - r * 0.5]]); paint(ctx, metal, x - r, y - r * 1.5, r * 2, r, { metal: true });
    }
    ell(ctx, x, y, r, r * 0.8); paint(ctx, metal, x - r, y - r, r * 2, r * 1.8, { metal: true });
    ctx.strokeStyle = al(dk(metal, 0.6), 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x - r * 0.8, y + r * 0.2); ctx.quadraticCurveTo(x, y + r * 0.5, x + r * 0.8, y + r * 0.2); ctx.stroke();
    if (hero || l.armor === 'ceremonial') { ctx.strokeStyle = al(METAL.gold, 0.9); ctx.lineWidth = 0.7; ell(ctx, x, y, r, r * 0.8); ctx.stroke(); }
    if (l.armor === 'ceremonial') { ctx.fillStyle = '#fff4d0'; circ(ctx, x, y - r * 0.1, r * 0.22); ctx.fill(); }
  }

  // ---------------------------------------------------------------- arms
  function gripFor(l) {
    const w = l.weapon, sh = l.shield !== 'none' && l.shield;
    const shieldy = sh || w === 'sword_shield' || w === 'spear_shield';
    const two = ['pike', 'great_axe', 'great_sword', 'halberd', 'lance', 'banner', 'crossbow', 'bow'].indexOf(w) >= 0;
    const g = { two, shield: shieldy ? (sh || 'round') : null, weapon: w === 'sword_shield' ? 'sword' : w === 'spear_shield' ? 'spear' : w };
    if (w === 'none') g.weapon = null;
    if (w === 'claws') g.weapon = 'claws';
    // where the weapon hand is: near (front) or far (back)
    g.weaponHand = (g.shield || w === 'javelin' || w === 'spear' || w === 'spear_shield') ? 'far' : 'near';
    if (w === 'tome' || w === 'orb' || w === 'wand' || w === 'torch' || w === 'instrument' || w === 'sling') g.weaponHand = 'near';
    if (g.shield && (w === 'sword' || w === 'axe' || w === 'mace' || w === 'hammer' || w === 'torch' || w === 'wand' || w === 'orb' || w === 'tome' || w === 'daggers' || w === 'none')) g.weaponHand = 'far';
    return g;
  }
  /** hand targets for near and far arms, plus weapon angle, for the current pose */
  function handTargets(l, m, H, pose, g) {
    const sY = m.shoulderY, hY = m.hipY, sw = m.sw;
    const w = g.weapon, a = pose.anim, sw_ = pose.swing, cast = pose.cast;
    const near = { x: sw * 0.85, y: hY + H * 0.02, ang: -1.2 }, far = { x: -sw * 0.75, y: hY + H * 0.02, ang: -1.2 };
    const relax = pose.breath * H * 0.004;
    near.y += relax; far.y += relax;
    if (g.two) {
      if (w === 'bow') {
        near.x = sw + H * 0.16; near.y = sY + H * 0.1; near.ang = -Math.PI / 2;
        far.x = sw * 0.3 + H * 0.06 * (1 - pose.draw); far.y = sY + H * 0.1;
        if (a === 'attack') { far.x = sw * 0.3 - pose.draw * H * 0.16; }
      } else if (w === 'crossbow') {
        near.x = sw + H * 0.14; near.y = sY + H * 0.14; far.x = sw * 0.2; far.y = sY + H * 0.16; near.ang = 0;
      } else if (w === 'pike' || w === 'halberd' || w === 'banner' || w === 'lance') {
        const thrust = a === 'attack' ? Math.max(0, sw_) : 0;
        near.x = sw * 0.95 + thrust * H * 0.12; near.y = hY - H * 0.02 - thrust * H * 0.1; near.ang = -Math.PI / 2 + 0.12 + thrust * 1.15;
        far.x = sw * 0.35 + thrust * H * 0.08; far.y = sY + H * 0.02 - thrust * H * 0.02;
        if (w === 'banner') { near.ang = -Math.PI / 2 + 0.05; near.x = sw * 0.9; far.x = sw * 0.5; far.y = sY + H * 0.05; }
        if (a === 'cast' || (a === 'attack' && sw_ < 0)) { near.ang = -Math.PI / 2 - 0.25 * Math.abs(sw_); }
      } else { // great weapons: rest on shoulder, overhead swing
        if (a === 'attack') {
          if (sw_ < 0) { near.x = -sw * 0.2; near.y = sY - H * 0.16; far.x = -sw * 0.6; far.y = sY - H * 0.08; near.ang = -Math.PI / 2 - 0.9 * Math.abs(sw_); }
          else { near.x = sw + H * 0.22 * sw_; near.y = sY + H * 0.16 * sw_; far.x = sw * 0.4 + H * 0.1 * sw_; far.y = sY + H * 0.12 * sw_; near.ang = -0.2 + 0.7 * sw_; }
        } else { near.x = sw * 0.7; near.y = hY - H * 0.04; far.x = sw * 0.1; far.y = hY - H * 0.12; near.ang = -1.15; }
      }
      far.ang = near.ang;
      return { near, far };
    }
    // shield arm (near) held in front of the chest
    if (g.shield) { near.x = sw * 0.9; near.y = sY + H * 0.16; near.ang = 0; if (a === 'attack' && sw_ > 0) near.x += H * 0.05 * sw_; }
    // weapon arm
    const wh = g.weaponHand === 'far' ? far : near;
    const other = wh === far ? near : far;
    if (w === 'spear' || w === 'javelin') {
      // held overhead pointing forward-down (hoplite), thrust forward on attack
      wh.x = -sw * 0.15; wh.y = sY - H * 0.1; wh.ang = 0.35;
      if (a === 'attack') { if (sw_ < 0) { wh.x = -sw * 0.6; wh.y = sY - H * 0.14; wh.ang = 0.25; } else { wh.x = sw * 0.5 + H * 0.28 * sw_; wh.y = sY + H * 0.02; wh.ang = 0.05; } }
      if (w === 'javelin' && a === 'attack' && sw_ > 0.95) wh.thrown = true;
      if (!g.shield && wh === far) { other.x = sw * 0.9; other.y = hY + H * 0.02; }
    } else if (w === 'staff') {
      wh.x = sw * 0.95; wh.y = hY - H * 0.06; wh.ang = -Math.PI / 2 + 0.06;
      if (a === 'cast') { wh.x = sw * 0.6 + H * 0.06 * cast; wh.y = sY + H * 0.02 - H * 0.12 * cast; wh.ang = -Math.PI / 2 - 0.35 * cast; other.x = -sw * 0.3 + H * 0.02; other.y = sY - H * 0.12 * cast; }
      if (a === 'attack') { wh.x = sw * 0.9 + H * 0.12 * Math.max(0, sw_); wh.y = hY - H * 0.06; wh.ang = -Math.PI / 2 + 0.06 + 1.0 * sw_; }
    } else if (w === 'orb' || w === 'wand' || w === 'tome') {
      wh.x = sw + H * 0.06; wh.y = sY + H * 0.14; wh.ang = -0.2;
      if (a === 'cast' || a === 'attack') { const k = a === 'cast' ? cast : Math.max(0, sw_); wh.x = sw + H * 0.12 * k; wh.y = sY + H * 0.14 - H * 0.16 * k; other.x = -sw * 0.2; other.y = sY - H * 0.1 * k; wh.ang = -0.35 * k; }
    } else if (w === 'torch') { wh.x = sw * 0.9; wh.y = sY + H * 0.1; wh.ang = -Math.PI / 2 + 0.2; }
    else if (w === 'instrument') { wh.x = sw * 0.6; wh.y = sY - H * 0.02; wh.ang = -0.5; other.x = sw * 0.2; other.y = sY + H * 0.12; }
    else if (w === 'sling') { wh.x = sw * 0.9; wh.y = hY + H * 0.05; wh.ang = 1.2; if (a === 'attack') { wh.x = sw * 0.3; wh.y = sY - H * 0.14; wh.ang = sw_ * 2; } }
    else if (w === 'claws' || !w) {
      near.x = sw * 0.95; near.y = hY - H * 0.02; far.x = -sw * 0.8; far.y = hY;
      if (l.body === 'undead') { near.x = sw + H * 0.14; near.y = sY + H * 0.12; far.x = sw * 0.6 + H * 0.06; far.y = sY + H * 0.16; }
      if (a === 'attack') { near.x = sw * 0.6 + H * 0.28 * Math.max(0, sw_); near.y = sY + H * 0.05 + (sw_ < 0 ? -H * 0.15 * -sw_ : H * 0.1 * sw_); far.x = -sw * 0.4 + H * 0.12 * sw_; far.y = sY + H * 0.1; }
      if (a === 'cast') { near.x = sw * 0.9; near.y = sY - H * 0.08 * cast; far.x = -sw * 0.5; far.y = sY - H * 0.1 * cast; }
    } else if (w === 'daggers') {
      near.x = sw * 0.9; near.y = hY - H * 0.02; near.ang = -0.9; far.x = -sw * 0.7; far.y = hY; far.ang = -2.2;
      if (a === 'attack') { near.x = sw * 0.5 + H * 0.26 * Math.max(0, sw_); near.y = sY + H * 0.1; near.ang = -0.2 + 0.4 * sw_; }
    } else {
      // one-handed melee (sword/axe/mace/hammer): hang at hip, wind up over the shoulder, chop forward
      wh.x = sw * 0.9; wh.y = hY + H * 0.03; wh.ang = -1.1;
      if (wh === far) { wh.x = -sw * 0.2; wh.y = sY - H * 0.08; wh.ang = -0.9; }
      if (a === 'attack') {
        if (sw_ < 0) { wh.x = -sw * 0.3; wh.y = sY - H * 0.18; wh.ang = -Math.PI / 2 - 0.9 * -sw_; }
        else { wh.x = sw + H * 0.2 * sw_; wh.y = sY + H * 0.14 * sw_; wh.ang = -1.1 + 1.5 * sw_; }
      }
      if (a === 'cast') { wh.y -= H * 0.1 * cast; other.x = sw * 0.8; other.y = sY - H * 0.06 * cast; }
    }
    if (a === 'hit') { near.x -= H * 0.03; far.x -= H * 0.04; }
    return { near, far };
  }
  function drawArm(ctx, l, m, H, pose, hero, near, hand, g, isSkel, isGolem, isTreant) {
    const sx = near ? m.sw * 0.62 : -m.sw * 0.62, sy = m.shoulderY + H * 0.035;
    const armL = m.armL, w = m.armW * (isGolem ? 1.6 : isTreant ? 1.3 : isSkel ? 0.5 : 1);
    const skin = skinTone(l), sleeve = isSkel ? skin : isGolem || isTreant ? skin : sleeveColor(l, hero);
    let e = ik(sx, sy, hand.x, hand.y, armL, armL, 1), e2 = ik(sx, sy, hand.x, hand.y, armL, armL, -1);
    // elbow points back (behind) unless the hand is raised high, then it points out
    const raised = hand.y < m.shoulderY - H * 0.05;
    const el = raised ? (e[0] > e2[0] ? e : e2) : (e[0] < e2[0] ? e : e2);
    const hx = el[2], hy = el[3];
    // items held in the far hand are drawn behind the arm... but big weapons read better in front of it
    const holdsWeapon = g.weapon && ((g.weaponHand === 'far') !== near) && !hand.thrown;
    const holdsShield = g.shield && near;
    if (g.two && !near && g.weapon) drawWeapon(ctx, l, g.weapon, hx, hy, hand.ang, H, pose, hero, true);
    // upper arm in sleeve color, forearm bare for cloth/leather/none
    const bare = (l.armor === 'cloth' || l.armor === 'leather' || l.armor === 'none') && !isGolem && !isTreant && !isSkel;
    if (isSkel) { limb(ctx, [[sx, sy], [el[0], el[1]], [hx, hy]], w, skin, { noHi: true }); ctx.fillStyle = lt(skin, 0.4); circ(ctx, el[0], el[1], w * 0.7); ctx.fill(); }
    else {
      limb(ctx, [[sx, sy], [el[0], el[1]]], w, sleeve);
      limb(ctx, [[el[0], el[1]], [hx, hy]], w * 0.9, bare ? skin : sleeve, { shadeEnd: !bare });
      if (isTreant) { ctx.strokeStyle = al('#2a1a0c', 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(sx, sy + w * 0.2); ctx.lineTo(el[0], el[1] + w * 0.2); ctx.stroke(); }
      if (l.armor === 'leather' && bare) { ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = w * 0.5; ctx.beginPath(); ctx.moveTo(M.lerp(el[0], hx, 0.55), M.lerp(el[1], hy, 0.55)); ctx.lineTo(M.lerp(el[0], hx, 0.85), M.lerp(el[1], hy, 0.85)); ctx.stroke(); }
      if (ARMOR_METAL[l.armor] && l.armor !== 'chain') { ctx.strokeStyle = al(dk(sleeve, 0.6), 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(el[0] - w * 0.4, el[1]); ctx.lineTo(el[0] + w * 0.4, el[1]); ctx.stroke(); }
    }
    // hand / gauntlet / fist
    const gaunt = ARMOR_METAL[l.armor] && l.armor !== 'chain';
    const hc = isSkel ? skin : gaunt ? sleeve : isGolem ? dk(skin, 0.15) : (l.fur && l.fur !== l.skin && l.feet === 'claws' ? l.skin : skin);
    circ(ctx, hx, hy, w * (isGolem ? 0.85 : 0.62)); paint(ctx, hc, hx - w, hy - w, w * 2, w * 2, { light: 0.3, dark: 0.4, lw: 0.6 });
    if (g.weapon === 'claws' || l.feet === 'claws' && !g.weapon) drawClaws(ctx, hx, hy, w, hand.ang === undefined ? 0 : 0, l);
    if (holdsShield) drawShield(ctx, l, g.shield, hx + H * 0.03, hy, H, hero);
    if (holdsWeapon && !(g.two && !near)) drawWeapon(ctx, l, g.weapon, hx, hy, hand.ang, H, pose, hero, false);
    if (hand.thrown) { /* javelin already left the hand */ }
    // casting glow on an open hand
    if (pose.anim === 'cast' && !holdsWeapon && !holdsShield) { const c = l.element ? ELEMENT[l.element] : (l.glow || '#9ab0ff'); glow(ctx, hx, hy, H * 0.12 * (0.5 + pose.cast), c, 0.9); }
  }
  function drawClaws(ctx, hx, hy, w, ang, l) {
    ctx.fillStyle = '#f0ead8'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.4;
    for (let i = -1; i <= 1; i++) { poly(ctx, [[hx + w * 0.3, hy + i * w * 0.35], [hx + w * 1.3, hy + i * w * 0.55 + w * 0.15], [hx + w * 0.35, hy + i * w * 0.35 + w * 0.25]]); ctx.fill(); ctx.stroke(); }
  }

  // ---------------------------------------------------------------- legs & feet
  function drawLegs(ctx, l, m, H, pose, hero, isSkel, isGolem, isTreant) {
    const hipY = m.hipY, hw = m.hw, legL = m.legL, w = m.legW * (isGolem ? 1.5 : isTreant ? 1.2 : isSkel ? 0.5 : 1);
    const stride = pose.stride, lunge = pose.lunge;
    const skin = skinTone(l);
    const legColor = isSkel || isGolem || isTreant ? skin : (l.armor === 'robe' ? clothColor(l) : l.armor === 'none' ? skin : (ARMOR_METAL[l.armor] ? (l.armor === 'chain' ? METAL.iron : metalColor(l, hero)) : l.armor === 'leather' ? '#6a4a30' : dk(clothColor(l), 0.35)));
    const digit = l.feet === 'paws' || l.feet === 'hooves' || l.feet === 'talons' || l.feet === 'claws';
    const legs = [
      { hx: -hw * 0.45, fx: -hw * 0.5 - stride * H * 0.13 - lunge * 0.4, lift: Math.max(0, -stride) * H * 0.07, near: false },
      { hx: hw * 0.45, fx: hw * 0.55 + stride * H * 0.13 + lunge * 0.6, lift: Math.max(0, stride) * H * 0.07, near: true },
    ];
    for (const lg of legs) {
      const fy = -lg.lift, fx = lg.fx;
      const kneeBend = digit ? -1 : 1;
      const k = ik(lg.hx, hipY, fx, fy - w * 0.4, legL, legL, kneeBend);
      const k2 = ik(lg.hx, hipY, fx, fy - w * 0.4, legL, legL, -kneeBend);
      const knee = digit ? (k[0] < k2[0] ? k : k2) : (k[0] > k2[0] ? k : k2);
      const col = lg.near ? legColor : dk(legColor, 0.25);
      if (isSkel) { limb(ctx, [[lg.hx, hipY], [knee[0], knee[1]], [fx, fy - w * 0.4]], w, col, { noHi: true }); ctx.fillStyle = lt(skin, 0.4); circ(ctx, knee[0], knee[1], w * 0.7); ctx.fill(); }
      else limb(ctx, [[lg.hx, hipY], [knee[0], knee[1]], [fx, fy - w * 0.4]], w, col, { shadeEnd: true });
      drawFoot(ctx, l, fx, fy, w, lg.near, hero, isSkel, isGolem, isTreant);
    }
  }
  function drawFoot(ctx, l, fx, fy, w, near, hero, isSkel, isGolem, isTreant) {
    const f = l.feet, skin = skinTone(l);
    const bc = bootColor(l, hero);
    const sh = near ? 0 : 0.25;
    if (isTreant) { // roots
      ctx.strokeStyle = dk(skin, 0.3); ctx.lineWidth = w * 0.5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(fx, fy - w * 0.5); ctx.quadraticCurveTo(fx + i * w * 0.8, fy - w * 0.2, fx + i * w * 1.3 + w * 0.3, fy + 0.3); ctx.stroke(); }
      return;
    }
    if (isGolem) { Art.rrect(ctx, fx - w * 0.8, fy - w * 0.9, w * 2, w * 0.95, w * 0.3); paint(ctx, dk(skin, sh + 0.1), fx - w, fy - w, w * 2, w, { light: 0.25, dark: 0.45 }); return; }
    if (isSkel) { ctx.strokeStyle = skin; ctx.lineWidth = w * 0.7; ctx.beginPath(); ctx.moveTo(fx - w * 0.2, fy - w * 0.3); ctx.lineTo(fx + w * 1.2, fy - w * 0.1); ctx.stroke(); return; }
    if (f === 'paws') { ell(ctx, fx + w * 0.3, fy - w * 0.35, w * 0.95, w * 0.5); paint(ctx, dk(skin, sh), fx - w, fy - w, w * 2, w, { light: 0.3, dark: 0.4, lw: 0.6 }); ctx.fillStyle = al(dk(skin, 0.5), 0.6); for (let i = 0; i < 3; i++) { circ(ctx, fx + w * 0.7 + i * w * 0.28 - w * 0.28, fy - w * 0.22, w * 0.13); ctx.fill(); } return; }
    if (f === 'claws' || f === 'talons') { const c = f === 'talons' ? '#d8b860' : (l.fur && l.fur !== l.skin ? l.skin : dk(skin, 0.1)); ell(ctx, fx + w * 0.25, fy - w * 0.35, w * 0.8, w * 0.42); paint(ctx, dk(c, sh), fx - w, fy - w, w * 2, w, { light: 0.3, dark: 0.4, lw: 0.6 }); ctx.fillStyle = '#efe6d0'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.4; for (let i = -1; i <= 1; i++) { poly(ctx, [[fx + w * 0.7, fy - w * 0.35 + i * w * 0.22], [fx + w * 1.45, fy - w * 0.1 + i * w * 0.25], [fx + w * 0.75, fy - w * 0.1 + i * w * 0.22]]); ctx.fill(); ctx.stroke(); } return; }
    if (f === 'hooves') { poly(ctx, [[fx - w * 0.45, fy - w * 0.7], [fx + w * 0.55, fy - w * 0.7], [fx + w * 0.7, fy], [fx - w * 0.5, fy]]); paint(ctx, dk('#3a2a20', sh), fx - w, fy - w, w * 2, w, { light: 0.35, dark: 0.3, lw: 0.6 }); return; }
    if (f === 'bare' || f === 'webbed') { const ww = f === 'webbed' ? 1.5 : 1.15; ell(ctx, fx + w * 0.35, fy - w * 0.3, w * ww * 0.7, w * 0.36); paint(ctx, dk(l.skin, sh), fx - w, fy - w, w * 2, w, { light: 0.3, dark: 0.4, lw: 0.6 }); if (l.head === 'halfling') { ctx.strokeStyle = al(l.hair || '#5a3a20', 0.8); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(fx + w * 0.2, fy - w * 0.6); ctx.lineTo(fx + w * 0.5, fy - w * 0.9); ctx.stroke(); } return; }
    // boots (default)
    ctx.beginPath(); ctx.moveTo(fx - w * 0.55, fy - w * 1.1); ctx.lineTo(fx + w * 0.55, fy - w * 1.1); ctx.lineTo(fx + w * 0.6, fy - w * 0.5); ctx.quadraticCurveTo(fx + w * 1.35, fy - w * 0.35, fx + w * 1.25, fy); ctx.lineTo(fx - w * 0.55, fy); ctx.closePath();
    paint(ctx, dk(bc, sh), fx - w, fy - w * 1.2, w * 2.2, w * 1.2, { light: 0.3, dark: 0.45, lw: 0.6, metal: ARMOR_METAL[l.armor] && l.armor !== 'chain' });
    ctx.strokeStyle = al(dk(bc, 0.6), 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(fx - w * 0.5, fy - w * 0.95); ctx.lineTo(fx + w * 0.5, fy - w * 0.95); ctx.stroke();
  }
  function drawGhostTail(ctx, l, m, H, pose) {
    const hw = m.hw, hipY = m.hipY, sway = pose.capeSway;
    ctx.beginPath(); ctx.moveTo(-hw * 1.1, hipY); ctx.lineTo(hw * 1.1, hipY);
    ctx.quadraticCurveTo(hw * 1.3 + sway, -H * 0.2, hw * 0.2 + sway * 2, -H * 0.02);
    ctx.quadraticCurveTo(-hw * 0.4 + sway, -H * 0.12, -hw * 1.6 - sway, -H * 0.08);
    ctx.quadraticCurveTo(-hw * 1.4, -H * 0.3, -hw * 1.1, hipY); ctx.closePath();
    ctx.fillStyle = Art.grad(ctx, 0, hipY, 0, 0, [[0, al(l.skin, 0.9)], [1, al(l.skin, 0)]]); ctx.fill();
    ctx.strokeStyle = al('#e8f8ff', 0.35); ctx.lineWidth = 0.6; ctx.stroke();
  }

  // ---------------------------------------------------------------- cape, tail, wings, halo
  function drawCape(ctx, l, m, H, pose, hero) {
    const cloth = l.cloth, trim = l.cloth2 || lt(cloth, 0.6), sw = m.sw, sY = m.shoulderY;
    const long = l.cape === 'long';
    const hemY = long ? -H * 0.03 : m.hipY + H * 0.12;
    const sway = pose.capeSway * H * 0.03 + (pose.lunge ? -pose.lunge * 0.3 : 0);
    const backX = -sw * 1.1 - H * 0.12 - sway, backX2 = -sw * 0.2 - sway * 0.5;
    ctx.beginPath(); ctx.moveTo(-sw * 0.85, sY + H * 0.02); ctx.lineTo(sw * 0.5, sY + H * 0.01);
    ctx.quadraticCurveTo(sw * 0.3, (sY + hemY) / 2, backX2 + sw * 0.5, hemY);
    ctx.quadraticCurveTo(backX2 - sw * 0.4, hemY + H * 0.02, backX, hemY - H * 0.02);
    ctx.quadraticCurveTo(-sw * 1.3, (sY + hemY) / 2, -sw * 0.85, sY + H * 0.02); ctx.closePath();
    paint(ctx, cloth, backX, sY, sw * 2, hemY - sY, { light: 0.2, dark: 0.55 });
    ctx.save(); ctx.clip();
    ctx.strokeStyle = al(dk(cloth, 0.5), 0.55); ctx.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) { const x0 = -sw * 0.7 + i * sw * 0.45; ctx.beginPath(); ctx.moveTo(x0, sY + H * 0.05); ctx.quadraticCurveTo(x0 - sw * 0.3 - sway * 0.4, (sY + hemY) / 2, x0 - sw * 0.6 - sway, hemY); ctx.stroke(); }
    ctx.strokeStyle = hero ? METAL.gold : trim; ctx.lineWidth = H * 0.018; ctx.beginPath(); ctx.moveTo(backX - 2, hemY - H * 0.02); ctx.quadraticCurveTo(backX2 - sw * 0.4, hemY + H * 0.02, backX2 + sw * 0.6, hemY); ctx.stroke();
    ctx.restore();
    // clasp
    ctx.fillStyle = hero ? METAL.gold : METAL.bronze; circ(ctx, sw * 0.3, sY + H * 0.03, H * 0.018); ctx.fill();
  }
  function drawTail(ctx, l, m, H, pose) {
    const kind = l.tail, base = skinTone(l), x0 = -m.hw * 0.7, y0 = m.hipY + H * 0.02, sway = pose.capeSway * H * 0.02;
    if (kind === 'thick' || kind === 'scaled') {
      ctx.beginPath(); ctx.moveTo(x0, y0 - H * 0.05); ctx.quadraticCurveTo(x0 - H * 0.2, y0 + H * 0.05, x0 - H * 0.4 - sway, -H * 0.01);
      ctx.quadraticCurveTo(x0 - H * 0.15, y0 + H * 0.15, x0 + m.hw * 0.4, y0 + H * 0.06); ctx.closePath();
      paint(ctx, kind === 'scaled' && l.scales ? l.scales : base, x0 - H * 0.4, y0 - H * 0.05, H * 0.5, H * 0.2, { light: 0.3, dark: 0.45 });
      if (kind === 'scaled') { ctx.strokeStyle = al(dk(base, 0.5), 0.5); ctx.lineWidth = 0.5; for (let i = 1; i < 5; i++) { const t = i / 5; ctx.beginPath(); ctx.moveTo(M.lerp(x0, x0 - H * 0.4 - sway, t), y0 - H * 0.04 + t * H * 0.02); ctx.lineTo(M.lerp(x0, x0 - H * 0.4 - sway, t) + H * 0.02, y0 + H * 0.08 - t * H * 0.06); ctx.stroke(); } }
    } else {
      const w = kind === 'furry' ? H * 0.06 : H * 0.022;
      const pts = [[x0, y0], [x0 - H * 0.15, y0 + H * 0.06 + sway], [x0 - H * 0.3 - sway, y0 - H * 0.1 + sway * 0.5]];
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
      ctx.strokeStyle = OUT; ctx.lineWidth = w + 1.2; ctx.stroke(); ctx.strokeStyle = kind === 'thin' && l.head === 'rat' ? '#e0a8a0' : base; ctx.lineWidth = w; ctx.stroke();
      if (kind === 'furry') { ctx.fillStyle = lt(base, 0.35); circ(ctx, pts[2][0], pts[2][1], w * 0.6); ctx.fill(); }
      if (l.body === 'demon' || l.body === 'fiend') { ctx.fillStyle = dk(base, 0.3); poly(ctx, [[pts[2][0] + w, pts[2][1] + w], [pts[2][0] - w * 2, pts[2][1] - w * 2], [pts[2][0] - w * 2.5, pts[2][1] + w]]); ctx.fill(); }
    }
  }
  function drawWings(ctx, l, m, H, pose, kind) {
    const flap = pose.wingT * 0.18 + (pose.anim === 'attack' ? 0.15 : 0);
    const x0 = -m.sw * 0.3, y0 = m.shoulderY + H * 0.06;
    for (const side of [1, -1]) {
      ctx.save(); ctx.translate(x0, y0);
      const span = H * (kind === 'bat' ? 0.55 : 0.6) * (side > 0 ? 1 : 0.8);
      ctx.rotate(-0.9 + flap * (side > 0 ? 1 : -0.8) + (side > 0 ? 0 : 0.35));
      if (kind === 'bat') {
        const fingers = [[span * 1.0, -span * 0.15], [span * 0.95, span * 0.35], [span * 0.6, span * 0.7]];
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(span * 0.35, -span * 0.55);
        for (const f of fingers) { ctx.lineTo(f[0], f[1]); ctx.quadraticCurveTo(f[0] * 0.55 + span * 0.1, f[1] * 0.75 + span * 0.15, f[0] * 0.4, f[1] * 0.9 + span * 0.05); }
        ctx.lineTo(0, span * 0.15); ctx.closePath();
        paint(ctx, side > 0 ? '#4a1a2a' : '#2e0f1c', -span * 0.1, -span * 0.6, span * 1.2, span * 1.4, { light: 0.2, dark: 0.5 });
        ctx.strokeStyle = OUT; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(span * 0.35, -span * 0.55); for (const f of fingers) { ctx.moveTo(span * 0.35, -span * 0.55); ctx.lineTo(f[0], f[1]); } ctx.stroke();
      } else if (kind === 'light') {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) { const a = -0.5 + i * 0.32, len = span * (1 - i * 0.14); ctx.strokeStyle = al('#ffe9a8', 0.5 - i * 0.08); ctx.lineWidth = H * 0.05; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a - 0.4) * len * 0.5, Math.sin(a - 0.4) * len * 0.5, Math.cos(a) * len, Math.sin(a) * len); ctx.stroke(); }
        glow(ctx, span * 0.3, -span * 0.2, span * 0.6, '#ffe9a8', 0.35);
      } else {
        // feathered wing: 4 layered lobes
        const base = side > 0 ? '#f6f0e4' : '#d8d0c4';
        for (let i = 3; i >= 0; i--) {
          const a = -0.55 + i * 0.3, len = span * (1.05 - i * 0.16);
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(Math.cos(a - 0.5) * len * 0.6, Math.sin(a - 0.5) * len * 0.6, Math.cos(a) * len, Math.sin(a) * len);
          ctx.quadraticCurveTo(Math.cos(a + 0.35) * len * 0.55, Math.sin(a + 0.35) * len * 0.55, span * 0.05, span * 0.12); ctx.closePath();
          paint(ctx, i % 2 ? dk(base, 0.08) : base, -span * 0.2, -span * 0.6, span * 1.2, span * 1.2, { light: 0.25, dark: 0.35, lw: 0.6 });
        }
        ctx.strokeStyle = al('#e8c060', 0.7); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(span * 0.3, -span * 0.45, span * 0.9, -span * 0.5); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawHalo(ctx, m, H, pose) {
    const y = m.headCY - m.headR * 1.35 + pose.bob * 0.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, y, m.headR * 1.4, '#ffe9a8', 0.5);
    ctx.strokeStyle = '#fff2c0'; ctx.lineWidth = H * 0.02; ell(ctx, 0, y, m.headR * 1.1, m.headR * 0.32); ctx.stroke();
    ctx.restore();
  }
  // (part 2b: head, helms; part 2c: weapons & shields follow)
  // ---------------------------------------------------------------- head
  const TOP_EARS = { cat: 1, wolf: 1, hare: 1, rat: 1, mole: 1, ape: 0, goat: 1 };
  const GLOW_EYES = { undead: 1, skeleton: 1, ghost: 1, golem: 1, demon: 1, fiend: 1, treant: 1, archon: 1 };
  function skullPath(ctx, l, cx, cy, r) {
    const h = l.head;
    if (l.body === 'golem') { Art.rrect(ctx, cx - r * 0.85, cy - r * 0.8, r * 1.8, r * 1.7, r * 0.35); return; }
    if (h === 'toad') { ell(ctx, cx + r * 0.1, cy + r * 0.15, r * 1.2, r * 0.85); return; }
    if (h === 'elf' || h === 'syron' || h === 'elysian' || h === 'ghoul') { blob(ctx, [[cx - r * 0.2, cy - r], [cx + r * 0.55, cy - r * 0.8], [cx + r * 0.85, cy - r * 0.1], [cx + r * 0.6, cy + r * 0.6], [cx + r * 0.25, cy + r * 1.05], [cx - r * 0.45, cy + r * 0.8], [cx - r * 0.85, cy + r * 0.1], [cx - r * 0.75, cy - r * 0.6]]); return; }
    if (h === 'orc' || h === 'ogre') { blob(ctx, [[cx - r * 0.2, cy - r], [cx + r * 0.6, cy - r * 0.85], [cx + r * 0.95, cy - r * 0.1], [cx + r * 0.85, cy + r * 0.65], [cx + r * 0.4, cy + r], [cx - r * 0.55, cy + r * 0.95], [cx - r * 0.95, cy + r * 0.3], [cx - r * 0.85, cy - r * 0.5]]); return; }
    if (h === 'goblin') { blob(ctx, [[cx - r * 0.2, cy - r * 0.95], [cx + r * 0.6, cy - r * 0.8], [cx + r * 0.9, cy - r * 0.15], [cx + r * 0.55, cy + r * 0.55], [cx + r * 0.3, cy + r * 1.05], [cx - r * 0.35, cy + r * 0.75], [cx - r * 0.9, cy + r * 0.15], [cx - r * 0.8, cy - r * 0.55]]); return; }
    if (h === 'dwarf' || h === 'halfling') { ell(ctx, cx, cy, r * 0.98, r * 0.98); return; }
    if (l.snout || h === 'bird' || h === 'insect') { ell(ctx, cx - r * 0.05, cy - r * 0.05, r * 0.92, r * 0.92); return; }
    blob(ctx, [[cx - r * 0.15, cy - r], [cx + r * 0.6, cy - r * 0.8], [cx + r * 0.88, cy - r * 0.05], [cx + r * 0.65, cy + r * 0.65], [cx + r * 0.25, cy + r], [cx - r * 0.5, cy + r * 0.85], [cx - r * 0.9, cy + r * 0.2], [cx - r * 0.8, cy - r * 0.55]]);
  }
  function drawHead(ctx, l, cx, cy, r, big, pose, hero) {
    const h = l.head || 'humanoid', body = l.body;
    const isSkel = body === 'skeleton', isGolem = body === 'golem', isTreant = body === 'treant', isGhost = body === 'ghost';
    const base = isSkel ? l.skin : skinTone(l);
    const snoutC = l.fur && l.fur !== l.skin ? l.skin : lt(base, 0.28);
    const helm = l.helm || 'none';
    const hairVisible = l.hair && helm !== 'hood' && helm !== 'full' && !isSkel && !isGolem;
    const lw = big ? 1.6 : 0.8;
    // ---- behind the skull: back ear, horns, long hair, feathers/crest
    if (l.horns && !isTreant) drawHorns(ctx, l, cx, cy, r, false, lw);
    drawEar(ctx, l, cx, cy, r, false, lw);
    if (hairVisible && (h === 'elf' || h === 'syron' || h === 'elysian' || h === 'ghoul' || (l.seed % 4 === 1 && h === 'humanoid'))) {
      // long hair falling down the back
      ctx.beginPath(); ctx.moveTo(cx - r * 0.2, cy - r * 0.9); ctx.quadraticCurveTo(cx - r * 1.4, cy - r * 0.2, cx - r * 1.1, cy + r * 1.7); ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 1.5, cx - r * 0.1, cy + r * 1.1); ctx.lineTo(cx + r * 0.4, cy - r * 0.6); ctx.closePath();
      paint(ctx, l.hair, cx - r * 1.4, cy - r, r * 1.8, r * 2.7, { light: 0.25, dark: 0.5, lw });
    }
    if (l.feathers) { ctx.fillStyle = l.feathers; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.6; for (let i = 0; i < 4; i++) { const a = -2.4 + i * 0.35; poly(ctx, [[cx - r * 0.2, cy - r * 0.5], [cx + Math.cos(a) * r * 1.7, cy + Math.sin(a) * r * 1.7 - r * 0.2], [cx + Math.cos(a + 0.25) * r * 1.1, cy + Math.sin(a + 0.25) * r * 1.1]]); ctx.fill(); ctx.stroke(); } }
    if (h === 'lizard' && helm === 'none') { ctx.fillStyle = l.scales || dk(base, 0.2); ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.6; poly(ctx, [[cx - r * 0.6, cy - r * 0.6], [cx - r * 0.9, cy - r * 1.5], [cx - r * 0.2, cy - r * 1.05], [cx + r * 0.2, cy - r * 1.6], [cx + r * 0.5, cy - r * 0.85]]); ctx.fill(); ctx.stroke(); }
    // ---- skull
    skullPath(ctx, l, cx, cy, r);
    paint(ctx, base, cx - r, cy - r, r * 2, r * 2, { light: isGolem ? 0.25 : 0.38, dark: 0.42, lw, alpha: isGhost ? 0.85 : undefined });
    if (isTreant) { ctx.strokeStyle = al('#2a1a0c', 0.5); ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.5); ctx.lineTo(cx - r * 0.3, cy + r * 0.6); ctx.moveTo(cx + r * 0.3, cy - r * 0.7); ctx.lineTo(cx + r * 0.4, cy + r * 0.2); ctx.stroke(); }
    // cheek shadow / cool side
    ctx.save(); skullPath(ctx, l, cx, cy, r); ctx.clip();
    ctx.fillStyle = Art.grad(ctx, cx - r, cy, cx + r, cy, [[0, 'rgba(20,20,70,0.25)'], [0.5, 'rgba(20,20,70,0)']]); ctx.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
    if (l.scales && h !== 'insect') { ctx.fillStyle = al(dk(base, 0.4), 0.35); for (let i = 0; i < 6; i++) { circ(ctx, cx - r * 0.6 + (i % 3) * r * 0.45, cy - r * 0.4 + ((i / 3) | 0) * r * 0.5, r * 0.14); ctx.fill(); } }
    ctx.restore();
    // ---- muzzle / beak / snout
    if (l.snout === 'short' || l.snout === 'long') {
      const len = l.snout === 'long' ? 0.9 : 0.6, mx = cx + r * (0.55 + len * 0.35), my = cy + r * 0.3;
      ell(ctx, mx, my, r * len * 0.75, r * (l.snout === 'long' ? 0.38 : 0.46));
      paint(ctx, h === 'lizard' ? base : snoutC, mx - r * len, my - r * 0.5, r * len * 2, r, { light: 0.3, dark: 0.4, lw });
      // nose + mouth
      ctx.fillStyle = h === 'mole' || h === 'rat' ? '#e08890' : '#2a1c1c'; ell(ctx, mx + r * len * 0.62, my - r * 0.12, r * 0.14, r * 0.11); ctx.fill();
      ctx.strokeStyle = al('#2a1c1c', 0.7); ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(mx + r * len * 0.55, my + r * 0.05); ctx.quadraticCurveTo(mx + r * 0.1, my + r * 0.25, mx - r * len * 0.4, my + r * 0.15); ctx.stroke();
      if (h === 'wolf' || h === 'cat' || h === 'lizard') { ctx.fillStyle = '#f4f0e0'; for (let i = 0; i < 2; i++) { poly(ctx, [[mx + r * 0.15 - i * r * 0.3, my + r * 0.12], [mx + r * 0.22 - i * r * 0.3, my + r * 0.4], [mx + r * 0.3 - i * r * 0.3, my + r * 0.12]]); ctx.fill(); } }
      if (h === 'rat' || h === 'hare') { ctx.strokeStyle = al('#f0f0f0', 0.6); ctx.lineWidth = lw * 0.4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(mx + r * len * 0.4, my); ctx.lineTo(mx + r * len * 0.4 + r * 0.7, my + i * r * 0.28); ctx.stroke(); } }
    } else if (l.snout === 'beak') {
      ctx.beginPath(); ctx.moveTo(cx + r * 0.45, cy - r * 0.25); ctx.quadraticCurveTo(cx + r * 1.5, cy - r * 0.15, cx + r * 1.45, cy + r * 0.45); ctx.quadraticCurveTo(cx + r * 1.1, cy + r * 0.35, cx + r * 0.5, cy + r * 0.4); ctx.closePath();
      paint(ctx, '#e0b040', cx + r * 0.4, cy - r * 0.3, r * 1.1, r * 0.8, { light: 0.4, dark: 0.4, lw });
      ctx.strokeStyle = al('#5a3a10', 0.7); ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(cx + r * 0.55, cy + r * 0.2); ctx.quadraticCurveTo(cx + r * 1.1, cy + r * 0.2, cx + r * 1.35, cy + r * 0.3); ctx.stroke();
    } else if (l.snout === 'mandibles') {
      ctx.fillStyle = dk(base, 0.3); ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.6;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy + r * 0.45 + s * r * 0.15); ctx.quadraticCurveTo(cx + r * 1.2, cy + r * 0.5 + s * r * 0.35, cx + r * 1.25, cy + r * 0.85 + s * r * 0.1); ctx.quadraticCurveTo(cx + r * 0.9, cy + r * 0.6 + s * r * 0.2, cx + r * 0.45, cy + r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    } else if (h === 'toad') {
      ctx.strokeStyle = al('#1c2a18', 0.75); ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy + r * 0.55); ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.85, cx + r * 1.2, cy + r * 0.35); ctx.stroke();
      ctx.fillStyle = al(lt(base, 0.45), 0.8); ell(ctx, cx + r * 0.1, cy + r * 0.75, r * 0.7, r * 0.3); ctx.fill(); // throat sac
      ctx.fillStyle = al(dk(base, 0.4), 0.4); for (let i = 0; i < 4; i++) { circ(ctx, cx - r * 0.5 + i * r * 0.4, cy - r * 0.2 + (i % 2) * r * 0.3, r * 0.12); ctx.fill(); }
    }
    // ---- face
    if (helm !== 'full' || big) drawFace(ctx, l, cx, cy, r, big, lw, hero);
    // ---- near ear, near horn, hair, beard, tusks
    drawEar(ctx, l, cx, cy, r, true, lw);
    if (l.horns && !isTreant) drawHorns(ctx, l, cx, cy, r, true, lw);
    if (hairVisible) drawHair(ctx, l, cx, cy, r, lw);
    if (isTreant) { ctx.fillStyle = '#4f8a30'; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.7; for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.5; ell(ctx, cx + Math.cos(a) * r * 0.9, cy - r * 0.3 + Math.sin(a) * r * 0.9, r * 0.55, r * 0.4, a); ctx.fill(); ctx.stroke(); } }
    // ---- helm
    if (helm !== 'none') drawHelm(ctx, l, cx, cy, r, helm, lw, hero);
  }
  function drawFace(ctx, l, cx, cy, r, big, lw, hero) {
    const h = l.head || 'humanoid', body = l.body;
    const base = skinTone(l);
    const glowing = GLOW_EYES[body] || (l.glow && (h === 'syron' || h === 'elysian' || h === 'ghoul'));
    const eyeC = l.eyes || '#3a2a1a';
    let eyes;
    if (h === 'toad') eyes = [[cx - r * 0.15, cy - r * 0.55, 0.3], [cx + r * 0.55, cy - r * 0.6, 0.3]];
    else if (h === 'bird') eyes = [[cx + r * 0.35, cy - r * 0.18, 0.2]];
    else if (h === 'insect') eyes = [[cx + r * 0.45, cy - r * 0.1, 0.36], [cx - r * 0.25, cy - r * 0.2, 0.22]];
    else if (l.snout) eyes = [[cx + r * 0.1, cy - r * 0.2, 0.15], [cx + r * 0.55, cy - r * 0.25, 0.15]];
    else if (h === 'ogre' || h === 'dwarf') eyes = [[cx + r * 0.15, cy - r * 0.1, 0.13], [cx + r * 0.55, cy - r * 0.12, 0.13]];
    else eyes = [[cx + r * 0.15, cy - r * 0.08, 0.17], [cx + r * 0.58, cy - r * 0.1, 0.17]];
    if (body === 'skeleton' || h === 'ghoul' || body === 'undead') {
      // dark sockets with a glowing pinpoint
      for (const e of eyes) { ctx.fillStyle = '#100c14'; ell(ctx, e[0], e[1], r * e[2] * 1.4, r * e[2] * 1.2); ctx.fill(); glow(ctx, e[0], e[1], r * 0.35, eyeC, 0.9); ctx.fillStyle = lt(eyeC, 0.6); circ(ctx, e[0], e[1], r * 0.07); ctx.fill(); }
      if (body === 'skeleton') { // nose hole + teeth
        ctx.fillStyle = '#100c14'; poly(ctx, [[cx + r * 0.6, cy + r * 0.15], [cx + r * 0.75, cy + r * 0.4], [cx + r * 0.5, cy + r * 0.4]]); ctx.fill();
        ctx.strokeStyle = '#100c14'; ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(cx - r * 0.1, cy + r * 0.62); ctx.lineTo(cx + r * 0.7, cy + r * 0.58); for (let i = 0; i < 4; i++) { ctx.moveTo(cx + i * r * 0.2, cy + r * 0.5); ctx.lineTo(cx + i * r * 0.2, cy + r * 0.72); } ctx.stroke();
      }
      return;
    }
    if (h === 'insect') {
      for (const e of eyes) { ell(ctx, e[0], e[1], r * e[2], r * e[2] * 0.85); paint(ctx, eyeC, e[0] - r * e[2], e[1] - r * e[2], r * e[2] * 2, r * e[2] * 2, { light: 0.5, dark: 0.5, lw: lw * 0.5 }); ctx.strokeStyle = al(dk(eyeC, 0.5), 0.4); ctx.lineWidth = lw * 0.3; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(e[0] - r * e[2], e[1] + i * r * e[2] * 0.4); ctx.lineTo(e[0] + r * e[2], e[1] + i * r * e[2] * 0.4); } ctx.stroke(); }
      return;
    }
    for (const e of eyes) {
      const er = r * e[2];
      if (glowing) { glow(ctx, e[0], e[1], er * 2.6, eyeC, 1); ctx.fillStyle = lt(eyeC, 0.7); ell(ctx, e[0], e[1], er * 0.9, er * 0.7); ctx.fill(); continue; }
      if (h === 'toad' || h === 'bird') { circ(ctx, e[0], e[1], er); paint(ctx, h === 'toad' ? base : '#f0e8c0', e[0] - er, e[1] - er, er * 2, er * 2, { light: 0.4, dark: 0.3, lw: lw * 0.5 }); ctx.fillStyle = eyeC; circ(ctx, e[0] + er * 0.25, e[1], er * 0.55); ctx.fill(); ctx.fillStyle = '#100c14'; ell(ctx, e[0] + er * 0.3, e[1], er * 0.22, er * 0.4); ctx.fill(); continue; }
      ctx.fillStyle = '#f6f0e6'; ell(ctx, e[0], e[1], er, er * 0.72); ctx.fill();
      ctx.fillStyle = eyeC; circ(ctx, e[0] + er * 0.15, e[1] + er * 0.05, er * 0.55); ctx.fill();
      ctx.fillStyle = '#100c14'; circ(ctx, e[0] + er * 0.2, e[1] + er * 0.05, er * 0.28); ctx.fill();
      if (big) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; circ(ctx, e[0] - er * 0.1, e[1] - er * 0.2, er * 0.14); ctx.fill(); ctx.strokeStyle = al(dk(base, 0.55), 0.7); ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(e[0] - er, e[1] - er * 0.4); ctx.quadraticCurveTo(e[0], e[1] - er * 1.1, e[0] + er, e[1] - er * 0.5); ctx.stroke(); }
      else { ctx.strokeStyle = al(dk(base, 0.55), 0.55); ctx.lineWidth = lw * 0.45; ctx.beginPath(); ctx.moveTo(e[0] - er * 0.9, e[1] - er * 0.55); ctx.quadraticCurveTo(e[0], e[1] - er * 1.0, e[0] + er * 0.9, e[1] - er * 0.6); ctx.stroke(); }
    }
    if (l.snout || h === 'toad' || h === 'bird') return;
    // brows for the big face
    if (big) { ctx.strokeStyle = al(l.hair || dk(base, 0.5), 0.8); ctx.lineWidth = lw * 0.8; for (const e of eyes) { ctx.beginPath(); ctx.moveTo(e[0] - r * 0.22, e[1] - r * 0.28); ctx.quadraticCurveTo(e[0], e[1] - r * 0.4, e[0] + r * 0.2, e[1] - r * 0.3); ctx.stroke(); } }
    // nose
    ctx.strokeStyle = al(dk(base, 0.5), 0.65); ctx.lineWidth = lw * 0.55; ctx.beginPath();
    if (h === 'goblin') { ctx.moveTo(cx + r * 0.6, cy - r * 0.05); ctx.quadraticCurveTo(cx + r * 1.15, cy + r * 0.2, cx + r * 0.75, cy + r * 0.4); }
    else if (h === 'dwarf' || h === 'ogre') { ctx.moveTo(cx + r * 0.6, cy); ctx.quadraticCurveTo(cx + r * 0.95, cy + r * 0.25, cx + r * 0.65, cy + r * 0.38); }
    else { ctx.moveTo(cx + r * 0.62, cy + r * 0.05); ctx.lineTo(cx + r * 0.74, cy + r * 0.3); ctx.lineTo(cx + r * 0.6, cy + r * 0.34); }
    ctx.stroke();
    // mouth
    ctx.strokeStyle = al(dk(base, 0.6), 0.7); ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(cx + r * 0.3, cy + r * 0.58); ctx.quadraticCurveTo(cx + r * 0.5, cy + r * (h === 'orc' ? 0.55 : 0.66), cx + r * 0.7, cy + r * 0.55); ctx.stroke();
    if (big) { ctx.strokeStyle = al(lt(base, 0.5), 0.5); ctx.beginPath(); ctx.moveTo(cx + r * 0.35, cy + r * 0.7); ctx.quadraticCurveTo(cx + r * 0.52, cy + r * 0.78, cx + r * 0.68, cy + r * 0.66); ctx.stroke(); }
    if (h === 'orc' || h === 'ogre') { ctx.fillStyle = '#f4f0e0'; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.4; for (const x of [0.32, 0.68]) { poly(ctx, [[cx + r * x - r * 0.08, cy + r * 0.6], [cx + r * x + r * 0.08, cy + r * 0.6], [cx + r * x, cy + r * 0.3]]); ctx.fill(); ctx.stroke(); } }
    if (h === 'goblin') { ctx.fillStyle = '#f4f0e0'; for (let i = 0; i < 3; i++) { poly(ctx, [[cx + r * 0.32 + i * r * 0.14, cy + r * 0.6], [cx + r * 0.42 + i * r * 0.14, cy + r * 0.6], [cx + r * 0.37 + i * r * 0.14, cy + r * 0.74]]); ctx.fill(); } }
    if (body === 'vampire') { ctx.fillStyle = '#ffffff'; for (const x of [0.42, 0.6]) { poly(ctx, [[cx + r * x - r * 0.05, cy + r * 0.58], [cx + r * x + r * 0.05, cy + r * 0.58], [cx + r * x, cy + r * 0.78]]); ctx.fill(); } }
    if (h === 'syron') { ctx.fillStyle = al('#ffffff', 0.7); for (let i = 0; i < 3; i++) { circ(ctx, cx - r * 0.5 + i * r * 0.2, cy + r * 0.2 + i * r * 0.15, r * 0.05); ctx.fill(); } }
    if (l.seed % 5 === 2 && (h === 'humanoid' || h === 'orc')) { ctx.strokeStyle = al('#8a2a2a', 0.7); ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.45); ctx.lineTo(cx + r * 0.6, cy + r * 0.1); ctx.stroke(); }
  }
  function drawEar(ctx, l, cx, cy, r, near, lw) {
    const ears = l.ears || 'round', h = l.head, base = skinTone(l);
    if (ears === 'none') return;
    const inner = h === 'rat' || h === 'mole' ? '#e0a0a0' : lt(base, 0.35);
    if (ears === 'antenna') { if (!near) return; ctx.strokeStyle = dk(base, 0.2); ctx.lineWidth = lw * 0.6; for (const s of [-0.35, 0.25]) { ctx.beginPath(); ctx.moveTo(cx + s * r, cy - r * 0.8); ctx.quadraticCurveTo(cx + s * r - r * 0.6, cy - r * 1.8, cx + s * r - r * 1.2, cy - r * 1.9); ctx.stroke(); ctx.fillStyle = dk(base, 0.2); circ(ctx, cx + s * r - r * 1.2, cy - r * 1.9, r * 0.12); ctx.fill(); } return; }
    if (ears === 'feather') { if (!near) return; ctx.fillStyle = l.feathers || base; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.5; for (const s of [-1, 1]) { poly(ctx, [[cx - r * 0.35 + s * r * 0.35, cy - r * 0.7], [cx - r * 0.5 + s * r * 0.55, cy - r * 1.55], [cx - r * 0.1 + s * r * 0.35, cy - r * 0.85]]); ctx.fill(); ctx.stroke(); } return; }
    if (TOP_EARS[h]) {
      // ears on top of the head (animal heads)
      const ex = near ? cx + r * 0.3 : cx - r * 0.45, ey = cy - r * 0.75;
      if (ears === 'round') { circ(ctx, ex, ey - r * 0.15, r * 0.32); paint(ctx, base, ex - r * 0.3, ey - r * 0.5, r * 0.6, r * 0.6, { light: 0.3, dark: 0.4, lw: lw * 0.7 }); ctx.fillStyle = al(inner, 0.85); circ(ctx, ex, ey - r * 0.15, r * 0.17); ctx.fill(); }
      else if (ears === 'long' && h === 'hare') { ell(ctx, ex - r * 0.1, ey - r * 0.9, r * 0.2, r * 0.95, near ? 0.15 : -0.1); paint(ctx, base, ex - r * 0.3, ey - r * 1.8, r * 0.6, r * 1.8, { light: 0.3, dark: 0.4, lw: lw * 0.7 }); ctx.fillStyle = al(inner, 0.85); ell(ctx, ex - r * 0.1, ey - r * 0.85, r * 0.09, r * 0.6, near ? 0.15 : -0.1); ctx.fill(); }
      else if (ears === 'long') { ell(ctx, ex - (near ? -r * 0.35 : r * 0.4), ey + r * 0.4, r * 0.5, r * 0.2, near ? 0.5 : -0.5); paint(ctx, base, ex - r, ey, r * 2, r, { light: 0.3, dark: 0.4, lw: lw * 0.7 }); }
      else { poly(ctx, [[ex - r * 0.3, ey + r * 0.05], [ex + r * 0.05, ey - r * 0.75], [ex + r * 0.35, ey + r * 0.1]]); paint(ctx, base, ex - r * 0.3, ey - r * 0.8, r * 0.7, r * 0.9, { light: 0.3, dark: 0.4, lw: lw * 0.7 }); ctx.fillStyle = al(inner, 0.8); poly(ctx, [[ex - r * 0.15, ey + r * 0.02], [ex + r * 0.05, ey - r * 0.5], [ex + r * 0.22, ey + r * 0.05]]); ctx.fill(); }
      return;
    }
    if (!near) return; // side ears: only the near one is visible
    const ex = cx - r * 0.72, ey = cy + r * 0.02;
    if (ears === 'round') { ell(ctx, ex, ey, r * 0.2, r * 0.26); paint(ctx, base, ex - r * 0.2, ey - r * 0.3, r * 0.4, r * 0.6, { light: 0.3, dark: 0.4, lw: lw * 0.6 }); }
    else if (ears === 'pointed') { poly(ctx, [[ex + r * 0.15, ey - r * 0.25], [ex - r * 0.65, ey - r * 0.55], [ex + r * 0.1, ey + r * 0.2]]); paint(ctx, base, ex - r * 0.7, ey - r * 0.6, r, r, { light: 0.3, dark: 0.4, lw: lw * 0.6 }); }
    else if (ears === 'long') { poly(ctx, [[ex + r * 0.15, ey - r * 0.25], [ex - r * 1.0, ey - r * 0.95], [ex - r * 0.5, ey - r * 0.25], [ex + r * 0.1, ey + r * 0.2]]); paint(ctx, base, ex - r, ey - r, r * 1.2, r * 1.2, { light: 0.3, dark: 0.4, lw: lw * 0.6 }); }
  }
  function drawHorns(ctx, l, cx, cy, r, near, lw) {
    const kind = l.horns, col = l.body === 'demon' || l.body === 'fiend' ? '#2a1a20' : '#d8c8a0';
    const hx = near ? cx + r * 0.35 : cx - r * 0.35, hy = cy - r * 0.75;
    ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.6;
    if (kind === 'curled') { ctx.beginPath(); ctx.arc(hx - r * 0.25, hy, r * 0.42, -0.3, Math.PI * 1.4); ctx.lineWidth = lw * 2.4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = lw * 1.6; ctx.strokeStyle = col; ctx.stroke(); ctx.lineWidth = lw * 0.5; ctx.strokeStyle = al(dk(col, 0.5), 0.6); ctx.stroke(); }
    else if (kind === 'short') { poly(ctx, [[hx - r * 0.15, hy + r * 0.1], [hx + r * 0.05, hy - r * 0.45], [hx + r * 0.25, hy + r * 0.12]]); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(hx - r * 0.2, hy + r * 0.1); ctx.quadraticCurveTo(hx - r * 0.35, hy - r * 0.9, hx - r * 0.85, hy - r * 1.2); ctx.quadraticCurveTo(hx - r * 0.2, hy - r * 0.7, hx + r * 0.2, hy + r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  function drawHair(ctx, l, cx, cy, r, lw) {
    const h = l.head, hair = l.hair;
    const beardy = h === 'dwarf' || l.body === 'giant' || (h === 'humanoid' && l.seed % 3 === 0) || h === 'goat';
    // top cap
    ctx.beginPath(); ctx.moveTo(cx - r * 0.95, cy + r * 0.05); ctx.quadraticCurveTo(cx - r * 1.0, cy - r * 1.05, cx, cy - r * 1.08); ctx.quadraticCurveTo(cx + r * 0.85, cy - r * 1.05, cx + r * 0.8, cy - r * 0.45);
    if (h === 'halfling') { for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(cx + r * 0.6 - i * r * 0.4, cy - r * 0.25, cx + r * 0.4 - i * r * 0.4, cy - r * 0.5); }
    else { ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.35, cx - r * 0.1, cy - r * 0.6); ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 0.3, cx - r * 0.75, cy - r * 0.2); }
    ctx.closePath();
    paint(ctx, hair, cx - r, cy - r * 1.1, r * 2, r * 1.2, { light: 0.3, dark: 0.45, lw });
    ctx.strokeStyle = al(dk(hair, 0.5), 0.5); ctx.lineWidth = lw * 0.4; ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.95); ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 0.8, cx + r * 0.1, cy - r * 0.9); ctx.moveTo(cx + r * 0.2, cy - r * 1.0); ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 0.85, cx + r * 0.6, cy - r * 0.6); ctx.stroke();
    if (beardy) {
      const len = h === 'dwarf' ? 1.9 : h === 'goat' ? 1.2 : 1.35;
      ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy + r * 0.45); ctx.quadraticCurveTo(cx - r * 0.5, cy + r * len, cx + r * 0.2, cy + r * len * 1.05); ctx.quadraticCurveTo(cx + r * 0.75, cy + r * len * 0.8, cx + r * 0.8, cy + r * 0.45); ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.75, cx + r * 0.2, cy + r * 0.7); ctx.closePath();
      paint(ctx, hair, cx - r * 0.6, cy + r * 0.4, r * 1.4, r * len, { light: 0.3, dark: 0.45, lw });
      if (h === 'dwarf') { ctx.strokeStyle = al(dk(hair, 0.5), 0.6); ctx.lineWidth = lw * 0.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - r * 0.3 + i * r * 0.35, cy + r * 0.8); ctx.lineTo(cx - r * 0.2 + i * r * 0.3, cy + r * 1.7); ctx.stroke(); } ctx.fillStyle = METAL.gold; ctx.fillRect(cx - r * 0.1, cy + r * 1.35, r * 0.4, r * 0.18); }
    }
  }
  function drawHelm(ctx, l, cx, cy, r, helm, lw, hero) {
    const metal = metalColor(l, hero), cloth = clothColor(l), trim = hero || l.armor === 'ceremonial' ? METAL.gold : (l.cloth2 || METAL.bronze);
    const dome = () => { ctx.beginPath(); ctx.moveTo(cx - r * 1.02, cy - r * 0.1); ctx.quadraticCurveTo(cx - r * 1.0, cy - r * 1.25, cx, cy - r * 1.22); ctx.quadraticCurveTo(cx + r * 1.0, cy - r * 1.25, cx + r * 1.0, cy - r * 0.1); ctx.closePath(); };
    if (helm === 'cap') { dome(); paint(ctx, l.armor === 'leather' || l.armor === 'cloth' ? '#6a4628' : metal, cx - r, cy - r * 1.3, r * 2, r * 1.3, { metal: l.armor !== 'leather' && l.armor !== 'cloth', lw }); ctx.strokeStyle = trim; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(cx - r * 1.02, cy - r * 0.12); ctx.lineTo(cx + r * 1.0, cy - r * 0.12); ctx.stroke(); }
    else if (helm === 'hood') {
      ctx.beginPath(); ctx.moveTo(cx - r * 1.2, cy + r * 1.2); ctx.quadraticCurveTo(cx - r * 1.35, cy - r * 0.6, cx - r * 0.5, cy - r * 1.3); ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 1.6, cx + r * 0.95, cy - r * 0.9); ctx.quadraticCurveTo(cx + r * 1.1, cy - r * 0.4, cx + r * 0.75, cy - r * 0.15); ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.55, cx - r * 0.2, cy - r * 0.35); ctx.quadraticCurveTo(cx - r * 0.6, cy + r * 0.1, cx - r * 0.35, cy + r * 0.9); ctx.quadraticCurveTo(cx - r * 0.6, cy + r * 1.2, cx - r * 1.2, cy + r * 1.2); ctx.closePath();
      paint(ctx, dk(cloth, 0.2), cx - r * 1.3, cy - r * 1.6, r * 2.4, r * 2.8, { light: 0.25, dark: 0.55, lw });
      ctx.fillStyle = 'rgba(10,8,20,0.35)'; ell(ctx, cx + r * 0.2, cy, r * 0.65, r * 0.55); ctx.fill();
    }
    else if (helm === 'open' || helm === 'horned') {
      dome(); paint(ctx, metal, cx - r, cy - r * 1.3, r * 2, r * 1.3, { metal: true, lw });
      ctx.strokeStyle = dk(metal, 0.45); ctx.lineWidth = lw * 0.9; ctx.beginPath(); ctx.moveTo(cx - r * 1.02, cy - r * 0.1); ctx.lineTo(cx + r * 1.0, cy - r * 0.1); ctx.stroke();
      ctx.strokeStyle = metal; ctx.lineWidth = lw * 1.1; ctx.beginPath(); ctx.moveTo(cx + r * 0.62, cy - r * 0.15); ctx.lineTo(cx + r * 0.72, cy + r * 0.35); ctx.stroke(); // nasal
      ctx.beginPath(); ctx.moveTo(cx - r * 0.95, cy - r * 0.1); ctx.lineTo(cx - r * 0.85, cy + r * 0.55); ctx.lineTo(cx - r * 0.45, cy + r * 0.65); ctx.lineTo(cx - r * 0.3, cy - r * 0.1); ctx.closePath(); paint(ctx, metal, cx - r, cy - r * 0.1, r, r * 0.8, { metal: true, lw: lw * 0.7 }); // cheek guard
      if (helm === 'horned') { ctx.fillStyle = '#e8dcc0'; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.6; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * r * 0.55 - r * 0.15, cy - r * 0.85); ctx.quadraticCurveTo(cx + s * r * 1.3, cy - r * 1.3, cx + s * r * 1.2, cy - r * 2.05); ctx.quadraticCurveTo(cx + s * r * 0.9, cy - r * 1.3, cx + s * r * 0.45 + r * 0.1, cy - r * 1.0); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
      if (hero) { ctx.strokeStyle = METAL.gold; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.moveTo(cx - r * 1.02, cy - r * 0.12); ctx.lineTo(cx + r * 1.0, cy - r * 0.12); ctx.stroke(); }
      if (l.tier >= 3 || hero) { ctx.fillStyle = cloth; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 1.05); ctx.quadraticCurveTo(cx - r * 0.1, cy - r * 1.9, cx + r * 0.5, cy - r * 1.35); ctx.quadraticCurveTo(cx, cy - r * 1.4, cx - r * 0.5, cy - r * 1.05); ctx.closePath(); ctx.fill(); ctx.stroke(); } // plume
    }
    else if (helm === 'full') {
      ctx.beginPath(); ctx.moveTo(cx - r * 1.0, cy - r * 0.35); ctx.quadraticCurveTo(cx - r * 1.0, cy - r * 1.3, cx, cy - r * 1.28); ctx.quadraticCurveTo(cx + r * 1.0, cy - r * 1.3, cx + r * 1.02, cy - r * 0.35); ctx.lineTo(cx + r * 0.95, cy + r * 0.9); ctx.quadraticCurveTo(cx + r * 0.3, cy + r * 1.05, cx - r * 0.55, cy + r * 0.95); ctx.lineTo(cx - r * 1.0, cy + r * 0.6); ctx.closePath();
      paint(ctx, metal, cx - r, cy - r * 1.3, r * 2, r * 2.3, { metal: true, lw });
      ctx.fillStyle = '#100c14'; ctx.fillRect(cx - r * 0.2, cy - r * 0.25, r * 1.15, r * 0.22); ctx.fillRect(cx + r * 0.55, cy - r * 0.25, r * 0.16, r * 0.9);
      ctx.fillStyle = al('#100c14', 0.6); for (let i = 0; i < 3; i++) { circ(ctx, cx + r * 0.25 + i * r * 0.2, cy + r * 0.45, r * 0.05); ctx.fill(); }
      ctx.strokeStyle = trim; ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(cx - r * 1.0, cy - r * 0.35); ctx.lineTo(cx + r * 1.02, cy - r * 0.35); ctx.stroke();
      if (l.tier >= 3 || hero) { ctx.fillStyle = cloth; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.5; ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy - r * 1.2); ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 2.0, cx + r * 0.5, cy - r * 1.35); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }
    else if (helm === 'crown' || helm === 'circlet') {
      const y = cy - r * 0.75;
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.6;
      if (helm === 'crown') { ctx.beginPath(); ctx.moveTo(cx - r * 0.95, y + r * 0.3); ctx.lineTo(cx - r * 0.95, y - r * 0.35); ctx.lineTo(cx - r * 0.55, y); ctx.lineTo(cx - r * 0.2, y - r * 0.55); ctx.lineTo(cx + r * 0.2, y); ctx.lineTo(cx + r * 0.55, y - r * 0.5); ctx.lineTo(cx + r * 0.9, y - r * 0.15); ctx.lineTo(cx + r * 0.9, y + r * 0.3); ctx.closePath(); paint(ctx, METAL.gold, cx - r, y - r * 0.6, r * 2, r, { metal: true, lw: lw * 0.6 }); ctx.fillStyle = '#e03050'; circ(ctx, cx, y + r * 0.08, r * 0.14); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(cx - r * 0.95, y + r * 0.2); ctx.quadraticCurveTo(cx, y - r * 0.05, cx + r * 0.9, y + r * 0.05); ctx.lineWidth = lw * 1.6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = lw * 0.9; ctx.strokeStyle = METAL.gold; ctx.stroke(); ctx.fillStyle = l.glow || '#6ab0ff'; circ(ctx, cx + r * 0.3, y + r * 0.02, r * 0.12); ctx.fill(); }
    }
    else if (helm === 'hat') {
      const tipX = cx - r * 0.9, tipY = cy - r * 2.9;
      ell(ctx, cx - r * 0.05, cy - r * 0.7, r * 1.65, r * 0.42); paint(ctx, dk(cloth, 0.25), cx - r * 1.7, cy - r * 1.1, r * 3.4, r * 0.8, { light: 0.25, dark: 0.5, lw });
      ctx.beginPath(); ctx.moveTo(cx - r * 0.9, cy - r * 0.75); ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 1.9, tipX, tipY); ctx.quadraticCurveTo(cx + r * 0.2, cy - r * 2.0, cx + r * 0.85, cy - r * 0.75); ctx.closePath();
      paint(ctx, dk(cloth, 0.2), cx - r, tipY, r * 2, r * 2.3, { light: 0.3, dark: 0.5, lw });
      ctx.strokeStyle = trim; ctx.lineWidth = lw * 0.9; ctx.beginPath(); ctx.moveTo(cx - r * 0.85, cy - r * 0.9); ctx.quadraticCurveTo(cx, cy - r * 1.15, cx + r * 0.8, cy - r * 0.9); ctx.stroke();
    }
  }
  // (part 2c: weapons & shields follow)
