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
//   UnitArt.demo(canvas, query)          gallery (query.get('zoom') scales the whole sheet, 1..4)
// Additive helpers (documented here per SPEC §0):
//   UnitArt.FRAMES              {idle:4, walk:4, attack:6, hit:1, death:4, cast:4}
//   UnitArt.BODIES / ARMORS / WEAPONS / HELMS / SHIELDS / BANNER_SHAPES   supported values (unknown values never throw)
//   UnitArt.metrics(look, hero) → {H, w, h, sm, feetY}         sprite metrics in world px / device px
//   UnitArt.bounds(look, {anim, frame, hero}) → {x0,y0,x1,y1,w,h,pixels,empty}   tight pixel bounds relative to the
//                                                              feet anchor; used for gallery framing and smoke tests
//   UnitArt.drawDirect(ctx, x, y, o)     same options as draw() but renders straight into ctx (no sprite cache),
//                                        so it stays crisp at any scale — used by the demo and portraits
//   UnitArt.portraitURL(look, o) → dataURL
//   UnitArt.elementColor(el) → css|null ; UnitArt.sigil(ctx, i, x, y, r, color, ink)   16 heraldic sigils
//
// Supported look values
//   body    form, undead, skeleton, ghost, spirit, wisp, angel, archon, demon, fiend, giant, golem, treant, vampire,
//           harpy, horse_rider, wolf_rider, boar_rider, drake, beast_wolf/bear/boar/spider/serpent/lion/elk,
//           beast_sabertooth/mammoth/crocodile/basilisk/hydra, unicorn, griffon, dragon, phoenix, bird, kraken,
//           elemental, skull, eldritch, plant, insect, slime            (anything else → humanoid silhouette)
//   armor   none cloth leather chain plate robe heavy_plate ceremonial
//   weapon  none sword sword_shield spear spear_shield pike axe great_axe great_sword mace hammer bow crossbow sling
//           javelin staff orb wand claws daggers halberd lance torch banner instrument tome whip rifle club
//   helm    none cap hood open full crown horned hat circlet   · shield none round kite tower buckler
//   size    small 0.8 · medium 1 · large 1.3 · huge 1.7        · element fire frost lightning shadow nature holy
//                                                                arcane blight stone water spirit physical
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
    if (ut.id) look.seed = Math.abs(Art.hash(ut.id)) % 1000;
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
    if (l.body === 'harpy') { l.wings = true; l.feet = 'talons'; l.snout = 'beak'; l.head = 'bird'; l.ears = 'feather'; l.build = l.build === 'normal' ? 'slim' : l.build;
      if (look.skin === undefined) { l.skin = '#d8b88a'; l.skin2 = '#a8845a'; } if (!l.feathers) l.feathers = l.tint || '#7a5a44'; l.hair = null; if (l.armor === 'cloth') l.armor = 'none'; }
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
  const BEASTS = { beast_wolf: 1, beast_bear: 1, beast_boar: 1, beast_spider: 1, beast_serpent: 1, beast_lion: 1, beast_elk: 1,
    beast_sabertooth: 1, beast_mammoth: 1, beast_crocodile: 1, beast_basilisk: 1, beast_hydra: 1, unicorn: 1, griffon: 1 };
  const HUMANOID = { form: 1, undead: 1, skeleton: 1, ghost: 1, angel: 1, archon: 1, demon: 1, fiend: 1, giant: 1, golem: 1, treant: 1, vampire: 1, harpy: 1 };
  UnitArt.metrics = function (look, hero) {
    const l = normLook(look);
    const sm = SIZE_MULT[l.size] || 1;
    let H = BASE_H * (l.height || 1) * sm * (hero ? 1.1 : 1);
    if (HUMANOID[l.body] === undefined) H = BASE_H * sm * (hero ? 1.1 : 1);
    let wf = 2.2, hf = 1.55;
    if (l.wings || l.body === 'angel' || l.body === 'archon' || l.body === 'demon') { wf = 2.8; hf = 1.75; }
    if (MOUNTED[l.body] || l.body === 'drake') { wf = 2.6; hf = 1.9; }
    if (l.body === 'dragon') { wf = 3.0; hf = 2.8; }
    if (l.body === 'phoenix') { wf = 2.8; hf = 1.9; }
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
    // hero: warm gold wash over the drawn pixels only (never a rectangle over empty space)
    if (hero && pose.deathT === 0) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,216,112,0.15)'; ctx.fillRect(-999, -999, 1998, 1998); ctx.restore(); }
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
  const HEAD_R = { normal: 0.094, stocky: 0.108, slim: 0.09, huge: 0.084, small: 0.118 };
  function humanMetrics(l, H) {
    const b = l.build || 'normal';
    const BW = BUILD_W[b] || 1;
    const headR = H * (HEAD_R[b] || 0.094);
    const shoulderY = -H * (b === 'stocky' ? 0.665 : b === 'small' ? 0.645 : 0.715);
    const hipY = -H * (b === 'stocky' ? 0.4 : 0.43);
    const sw = H * 0.175 * BW, hw = sw * 0.62;
    return { BW, headR, shoulderY, hipY, sw, hw, neckY: shoulderY - H * 0.018,
      headCY: shoulderY - headR * 1.04 - H * 0.034,
      armL: H * 0.165 * (b === 'huge' ? 1.1 : 1), armW: H * 0.07 * Math.sqrt(BW), legL: H * 0.235, legW: H * 0.082 * Math.sqrt(BW) };
  }
  /** short tapered neck so the head does not sit straight on the shoulders */
  function drawNeck(ctx, l, m, H) {
    const skin = skinTone(l), nw = m.headR * 0.66, top = m.headCY + m.headR * 0.62;
    ctx.beginPath();
    ctx.moveTo(-nw, top); ctx.lineTo(nw * 0.95, top);
    ctx.quadraticCurveTo(nw * 1.25, m.shoulderY + H * 0.012, nw * 1.5, m.shoulderY + H * 0.028);
    ctx.lineTo(-nw * 1.5, m.shoulderY + H * 0.028);
    ctx.quadraticCurveTo(-nw * 1.25, m.shoulderY + H * 0.012, -nw, top); ctx.closePath();
    paint(ctx, dk(skin, 0.18), -nw * 1.5, top, nw * 3, m.shoulderY - top + H * 0.03, { light: 0.25, dark: 0.35, lw: 0.7 });
    ctx.fillStyle = al('#1a1830', 0.28); ell(ctx, 0, top + H * 0.004, nw * 1.1, H * 0.012); ctx.fill();
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
    if (l.weapon === 'bow' || l.weapon === 'crossbow' || l.weapon === 'javelin' || l.weapon === 'sling') drawQuiver(ctx, l, m, H, pose);
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
    if (!isGolem && !isTreant && !isGhost && l.head !== 'toad') drawNeck(ctx, l, m, H);
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
    const skin0 = skinTone(l);
    let sleeve = isSkel ? skin0 : isGolem || isTreant ? skin0 : sleeveColor(l, hero);
    let skin = skin0;
    if (!near) { sleeve = dk(sleeve, 0.26); skin = dk(skin0, 0.24); }   // far arm reads behind the torso
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
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
    for (let i = -1; i <= 1; i++) {
      const dy = i * w * 0.42, cur = w * 0.35;
      ctx.beginPath();
      ctx.moveTo(hx + w * 0.25, hy + dy - w * 0.16);
      ctx.quadraticCurveTo(hx + w * 1.3, hy + dy - cur * 0.3, hx + w * 2.0, hy + dy + cur * 0.55);
      ctx.quadraticCurveTo(hx + w * 1.15, hy + dy + w * 0.2, hx + w * 0.28, hy + dy + w * 0.2);
      ctx.closePath();
      ctx.fillStyle = Art.grad(ctx, hx, hy + dy - w * 0.3, hx, hy + dy + w * 0.3, [[0, '#fffaf0'], [0.5, '#e3dac4'], [1, '#9a907c']]);
      ctx.fill(); ctx.stroke();
    }
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
      const span = H * (kind === 'bat' ? 0.74 : 0.8) * (side > 0 ? 1 : 0.82);
      ctx.rotate(-2.02 + flap * (side > 0 ? 1 : -0.8) + (side > 0 ? 0.34 : -0.36));
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
        const wb = l.body === 'harpy' || l.body === 'bird' ? (l.feathers || l.tint || '#a8865a') : '#f6f0e4';
        const base = side > 0 ? wb : dk(wb, 0.16);
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
  // ================================================================ (part 2c) SIGILS, SHIELDS, SPECIAL TORSOS
  const WOOD = '#6e4a2a', DARKWOOD = '#432c16';
  const FAKE_POSE = { anim: 'idle', f: 0, t: 0, bob: 0, lean: 0, swing: 0, stride: 0, capeSway: 0, flash: 0, deathT: 0, cast: 0, lunge: 0, draw: 0, breath: 0, wingT: 0 };

  /** heraldic sigil #i (0..15) centred at (x,y) with radius r — used on shields, banners and portraits */
  function drawSigil(ctx, i, x, y, r, color, ink) {
    i = ((i | 0) % 16 + 16) % 16;
    const S = r;
    ctx.save();
    ctx.fillStyle = color || '#f4ecd6'; ctx.strokeStyle = ink || al('#12101c', 0.55); ctx.lineWidth = Math.max(0.4, r * 0.09); ctx.lineJoin = 'round';
    const fs = () => { ctx.fill(); ctx.stroke(); };
    switch (i) {
      case 0: // cross pattée
        poly(ctx, [[x - S * .24, y - S], [x + S * .24, y - S], [x + S * .3, y - S * .34], [x + S, y - S * .28], [x + S, y + S * .2], [x + S * .3, y + S * .26], [x + S * .24, y + S], [x - S * .24, y + S], [x - S * .3, y + S * .26], [x - S, y + S * .2], [x - S, y - S * .28], [x - S * .3, y - S * .34]]); fs(); break;
      case 1: Art.star(ctx, x, y, S, S * .42, 5); fs(); break;
      case 2: // sun
        Art.star(ctx, x, y, S, S * .62, 8); fs(); ctx.beginPath(); ctx.arc(x, y, S * .42, 0, TAU); ctx.fillStyle = ink || al('#12101c', 0.5); ctx.fill(); break;
      case 3: // crescent
        ctx.beginPath(); ctx.arc(x, y, S * .95, 0.5, TAU - 0.5); ctx.arc(x + S * .42, y, S * .78, TAU - 0.7, 0.7, true); ctx.closePath(); fs(); break;
      case 4: // eagle displayed
        poly(ctx, [[x, y - S * .9], [x + S * .3, y - S * .45], [x + S, y - S * .6], [x + S * .55, y + S * .05], [x + S * .85, y + S * .5], [x + S * .25, y + S * .3], [x, y + S * .95], [x - S * .25, y + S * .3], [x - S * .85, y + S * .5], [x - S * .55, y + S * .05], [x - S, y - S * .6], [x - S * .3, y - S * .45]]); fs(); break;
      case 5: // wolf head
        poly(ctx, [[x - S * .75, y - S * .95], [x - S * .3, y - S * .4], [x + S * .3, y - S * .4], [x + S * .75, y - S * .95], [x + S * .7, y - S * .1], [x + S * .25, y + S * .55], [x, y + S * .95], [x - S * .25, y + S * .55], [x - S * .7, y - S * .1]]); fs(); break;
      case 6: // tree
        ctx.beginPath(); ctx.moveTo(x - S * .14, y + S); ctx.lineTo(x + S * .14, y + S); ctx.lineTo(x + S * .1, y - S * .1); ctx.lineTo(x - S * .1, y - S * .1); ctx.closePath(); fs();
        ctx.beginPath(); ctx.arc(x, y - S * .42, S * .62, 0, TAU); fs(); break;
      case 7: // flame
        ctx.beginPath(); ctx.moveTo(x, y + S * .9); ctx.quadraticCurveTo(x - S * .9, y + S * .2, x - S * .3, y - S * .35); ctx.quadraticCurveTo(x - S * .3, y - S * .9, x + S * .15, y - S); ctx.quadraticCurveTo(x + S * .05, y - S * .35, x + S * .5, y - S * .5); ctx.quadraticCurveTo(x + S * .9, y + S * .3, x, y + S * .9); ctx.closePath(); fs(); break;
      case 8: // droplet
        ctx.beginPath(); ctx.moveTo(x, y - S); ctx.quadraticCurveTo(x + S * .85, y - S * .05, x + S * .6, y + S * .45); ctx.quadraticCurveTo(x + S * .3, y + S, x - S * .3, y + S * .8); ctx.quadraticCurveTo(x - S * .8, y + S * .35, x, y - S); ctx.closePath(); fs(); break;
      case 9: // tower
        poly(ctx, [[x - S * .7, y + S], [x - S * .7, y - S * .35], [x - S * .5, y - S * .35], [x - S * .5, y - S * .75], [x - S * .2, y - S * .75], [x - S * .2, y - S * .35], [x + S * .2, y - S * .35], [x + S * .2, y - S * .75], [x + S * .5, y - S * .75], [x + S * .5, y - S * .35], [x + S * .7, y - S * .35], [x + S * .7, y + S]]); fs(); break;
      case 10: // sword upright
        poly(ctx, [[x, y - S], [x + S * .16, y - S * .7], [x + S * .16, y - S * .1], [x + S * .55, y - S * .1], [x + S * .55, y + S * .12], [x + S * .16, y + S * .12], [x + S * .16, y + S], [x - S * .16, y + S], [x - S * .16, y + S * .12], [x - S * .55, y + S * .12], [x - S * .55, y - S * .1], [x - S * .16, y - S * .1], [x - S * .16, y - S * .7]]); fs(); break;
      case 11: // skull
        ctx.beginPath(); ctx.arc(x, y - S * .2, S * .72, Math.PI, 0); ctx.lineTo(x + S * .5, y + S * .35); ctx.lineTo(x + S * .3, y + S * .35); ctx.lineTo(x + S * .3, y + S * .72); ctx.lineTo(x - S * .3, y + S * .72); ctx.lineTo(x - S * .3, y + S * .35); ctx.lineTo(x - S * .5, y + S * .35); ctx.closePath(); fs();
        ctx.fillStyle = ink || al('#12101c', 0.7); circ(ctx, x - S * .3, y - S * .22, S * .19); ctx.fill(); circ(ctx, x + S * .3, y - S * .22, S * .19); ctx.fill(); break;
      case 12: // eye
        ctx.beginPath(); ctx.moveTo(x - S, y); ctx.quadraticCurveTo(x, y - S * .85, x + S, y); ctx.quadraticCurveTo(x, y + S * .85, x - S, y); ctx.closePath(); fs();
        ctx.fillStyle = ink || al('#12101c', 0.75); circ(ctx, x, y, S * .34); ctx.fill(); break;
      case 13: // spiral
        ctx.beginPath(); for (let k = 0; k <= 34; k++) { const a = k / 34 * TAU * 1.85, rr = S * (0.1 + k / 34 * 0.9); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.strokeStyle = color || '#f4ecd6'; ctx.lineWidth = S * 0.26; ctx.lineCap = 'round'; ctx.stroke(); break;
      case 14: // chevrons
        for (let k = 0; k < 2; k++) { poly(ctx, [[x - S, y + S * (.2 + k * .55)], [x, y - S * (.55 - k * .55)], [x + S, y + S * (.2 + k * .55)], [x + S, y + S * (.55 + k * .5)], [x, y - S * (.2 - k * .55)], [x - S, y + S * (.55 + k * .5)]]); fs(); } break;
      default: // mountain + star
        poly(ctx, [[x - S, y + S * .8], [x - S * .3, y - S * .35], [x, y + S * .1], [x + S * .35, y - S * .7], [x + S, y + S * .8]]); fs();
        Art.star(ctx, x + S * .35, y - S * .75, S * .28, S * .12, 4, -Math.PI / 2); ctx.fill(); break;
    }
    ctx.restore();
  }
  UnitArt.sigil = function (ctx, i, x, y, r, color, ink) { drawSigil(ctx, i, x, y, r, color, ink); };

  // ---------------------------------------------------------------- shields
  function shieldPath(ctx, kind, x, y, R) {
    if (kind === 'kite') {
      ctx.beginPath(); ctx.moveTo(x - R * 0.82, y - R * 0.75); ctx.quadraticCurveTo(x, y - R * 1.12, x + R * 0.82, y - R * 0.75);
      ctx.quadraticCurveTo(x + R * 0.9, y + R * 0.25, x, y + R * 1.5); ctx.quadraticCurveTo(x - R * 0.9, y + R * 0.25, x - R * 0.82, y - R * 0.75); ctx.closePath();
    } else if (kind === 'tower') {
      ctx.beginPath(); ctx.moveTo(x - R * 0.85, y - R * 1.25); ctx.quadraticCurveTo(x, y - R * 1.5, x + R * 0.85, y - R * 1.25);
      ctx.lineTo(x + R * 0.9, y + R * 1.2); ctx.quadraticCurveTo(x, y + R * 1.5, x - R * 0.9, y + R * 1.2); ctx.closePath();
    } else { ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.closePath(); }
  }
  /** shield held by the near hand at (x,y). kind: round|kite|tower|buckler */
  function drawShield(ctx, l, kind, x, y, H, hero) {
    if (!kind || kind === 'none') return;
    const buckler = kind === 'buckler';
    const R = H * (kind === 'tower' ? 0.155 : kind === 'kite' ? 0.155 : buckler ? 0.085 : 0.17);
    const cloth = clothColor(l), trim = l.cloth2 || lt(cloth, 0.55);
    const rim = hero ? METAL.gold : l.body === 'skeleton' || l.body === 'undead' ? METAL.iron : l.armor === 'leather' || l.armor === 'none' ? WOOD : METAL.steel;
    const face = buckler ? metalColor(l, hero) : (l.body === 'skeleton' || l.body === 'undead' ? dk(cloth, 0.45) : cloth);
    // body
    shieldPath(ctx, kind, x, y, R);
    paint(ctx, face, x - R, y - R * 1.3, R * 2, R * 2.6, { light: 0.3, dark: 0.45, lw: 0.9, metal: buckler });
    ctx.save(); shieldPath(ctx, kind, x, y, R); ctx.clip();
    if (!buckler) {
      // planked wood grain hint + heraldic quartering in the second colour
      ctx.fillStyle = al(trim, 0.85);
      if ((l.seed | 0) % 3 === 0) { ctx.fillRect(x - R * 1.2, y - R * 1.6, R * 2.4, R * 0.55); ctx.fillRect(x - R * 1.2, y + R * 0.35, R * 2.4, R * 0.5); }
      else if ((l.seed | 0) % 3 === 1) { poly(ctx, [[x - R * 1.3, y + R * 1.6], [x - R * 1.3, y - R * 1.6], [x + R * 1.3, y + R * 1.6]]); ctx.fill(); }
      else { ctx.fillRect(x - R * 1.3, y - R * 1.6, R * 0.6, R * 3.2); ctx.fillRect(x + R * 0.7, y - R * 1.6, R * 0.6, R * 3.2); }
      drawSigil(ctx, (l.seed | 0) + (l.tier | 0), x, y - (kind === 'kite' ? R * 0.15 : 0), R * (kind === 'tower' ? 0.55 : 0.5), lt(cloth, 0.72), al('#12101c', 0.5));
      if (kind === 'tower') { ctx.strokeStyle = al('#2a1c12', 0.35); ctx.lineWidth = 0.6; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * R * 0.6, y - R * 1.6); ctx.lineTo(x + i * R * 0.6, y + R * 1.6); ctx.stroke(); } }
    }
    // curvature: warm rim top-left, cool shade bottom-right
    ctx.fillStyle = Art.rgrad(ctx, x - R * 0.4, y - R * 0.5, 0, R * 1.7, [[0, 'rgba(255,246,220,0.35)'], [0.45, 'rgba(255,246,220,0)'], [1, 'rgba(18,16,48,0.45)']]);
    ctx.fillRect(x - R * 1.4, y - R * 1.7, R * 2.8, R * 3.4);
    ctx.restore();
    // rim
    shieldPath(ctx, kind, x, y, R);
    ctx.strokeStyle = dk(rim, 0.25); ctx.lineWidth = R * 0.2; ctx.stroke();
    ctx.strokeStyle = al(lt(rim, 0.55), 0.8); ctx.lineWidth = R * 0.07; ctx.stroke();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
    // boss
    const bx = x, by = kind === 'kite' ? y - R * 0.2 : y;
    circ(ctx, bx, by, R * (buckler ? 0.45 : 0.24)); paint(ctx, hero ? METAL.gold : METAL.steel, bx - R * 0.3, by - R * 0.3, R * 0.6, R * 0.6, { metal: true, lw: 0.6 });
    ctx.fillStyle = 'rgba(255,250,230,0.7)'; circ(ctx, bx - R * 0.08, by - R * 0.09, R * (buckler ? 0.16 : 0.08)); ctx.fill();
    if (l.element && (l.tier | 0) >= 3) glow(ctx, bx, by, R * 1.5, ELEMENT[l.element], 0.35);
  }

  // ---------------------------------------------------------------- quiver (bows & thrown weapons)
  function drawQuiver(ctx, l, m, H, pose) {
    const x = -m.sw * 0.55, y = m.shoulderY + H * 0.05;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.42);
    Art.rrect(ctx, -H * 0.035, -H * 0.02, H * 0.07, H * 0.19, H * 0.02);
    paint(ctx, '#6a4526', -H * 0.035, -H * 0.02, H * 0.07, H * 0.19, { light: 0.3, dark: 0.5, lw: 0.7 });
    ctx.strokeStyle = al('#3a2410', 0.7); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-H * 0.035, H * 0.09); ctx.lineTo(H * 0.035, H * 0.09); ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      const ax = i * H * 0.02;
      line(ctx, [[ax, -H * 0.02], [ax + i * H * 0.012, -H * 0.1]], '#c8ab84', H * 0.012);
      ctx.fillStyle = i ? '#d8d0c0' : '#c04a3a'; poly(ctx, [[ax + i * H * 0.012, -H * 0.1], [ax + i * H * 0.012 - H * 0.02, -H * 0.075], [ax + i * H * 0.012 + H * 0.004, -H * 0.062]]); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- skeleton / golem / treant torsos
  function drawRibcage(ctx, l, m, H, hero) {
    const bone = l.skin || '#e8e0c8', sY = m.shoulderY, hY = m.hipY, sw = m.sw, hw = m.hw, a = l.armor;
    // pelvis
    ctx.beginPath(); ctx.moveTo(-hw * 1.05, hY - H * 0.04); ctx.quadraticCurveTo(0, hY - H * 0.01, hw * 1.05, hY - H * 0.04);
    ctx.quadraticCurveTo(hw * 0.8, hY + H * 0.05, hw * 0.3, hY + H * 0.03); ctx.quadraticCurveTo(0, hY + H * 0.07, -hw * 0.3, hY + H * 0.03);
    ctx.quadraticCurveTo(-hw * 0.8, hY + H * 0.05, -hw * 1.05, hY - H * 0.04); ctx.closePath();
    paint(ctx, bone, -hw, hY - H * 0.05, hw * 2, H * 0.12, { light: 0.35, dark: 0.45, lw: 0.7 });
    // spine
    line(ctx, [[0, sY + H * 0.02], [0, hY]], dk(bone, 0.3), H * 0.026);
    // ribs (3 pairs) + collar bones
    ctx.strokeStyle = OUT; ctx.lineWidth = H * 0.028;
    for (let i = 0; i < 3; i++) {
      const ry = sY + H * (0.06 + i * 0.055), rw = sw * (0.95 - i * 0.11);
      ctx.beginPath(); ctx.moveTo(0, ry - H * 0.008); ctx.quadraticCurveTo(rw * 1.05, ry - H * 0.004, rw * 0.72, ry + H * 0.045); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, ry - H * 0.008); ctx.quadraticCurveTo(-rw * 1.05, ry - H * 0.004, -rw * 0.72, ry + H * 0.045); ctx.stroke();
    }
    ctx.strokeStyle = bone; ctx.lineWidth = H * 0.016;
    for (let i = 0; i < 3; i++) {
      const ry = sY + H * (0.06 + i * 0.055), rw = sw * (0.95 - i * 0.11);
      ctx.beginPath(); ctx.moveTo(0, ry - H * 0.008); ctx.quadraticCurveTo(rw * 1.05, ry - H * 0.004, rw * 0.72, ry + H * 0.045); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, ry - H * 0.008); ctx.quadraticCurveTo(-rw * 1.05, ry - H * 0.004, -rw * 0.72, ry + H * 0.045); ctx.stroke();
    }
    ctx.strokeStyle = lt(bone, 0.3); ctx.lineWidth = H * 0.018;
    ctx.beginPath(); ctx.moveTo(-sw * 0.85, sY + H * 0.025); ctx.quadraticCurveTo(0, sY - H * 0.005, sw * 0.85, sY + H * 0.025); ctx.stroke();
    // sunken chest shadow
    ctx.fillStyle = al('#0e0c16', 0.4); ell(ctx, 0, sY + H * 0.12, sw * 0.55, H * 0.075); ctx.fill();
    if (a === 'cloth' || a === 'none') {
      // tattered shroud hanging off one shoulder
      ctx.beginPath(); ctx.moveTo(-sw * 0.95, sY + H * 0.01); ctx.lineTo(-sw * 0.1, sY + H * 0.03);
      ctx.lineTo(-hw * 0.2, hY + H * 0.1); ctx.lineTo(-hw * 0.6, hY + H * 0.03); ctx.lineTo(-hw * 0.95, hY + H * 0.12); ctx.lineTo(-sw * 1.05, hY - H * 0.02); ctx.closePath();
      paint(ctx, dk(clothColor(l), 0.45), -sw, sY, sw, hY - sY, { light: 0.18, dark: 0.5, lw: 0.6, alpha: 0.9 });
    } else if (a !== 'none') drawTorso(ctx, l, m, H, hero, FAKE_POSE);
  }
  function drawGolemTorso(ctx, l, m, H) {
    const base = l.skin || '#9a917f', sY = m.shoulderY, hY = m.hipY, sw = m.sw * 1.12, hw = m.hw * 1.05;
    const core = l.glow || (l.element ? ELEMENT[l.element] : '#ffc65a');
    // big chest block
    poly(ctx, [[-sw, sY + H * 0.03], [-sw * 0.85, sY - H * 0.02], [sw * 0.85, sY - H * 0.02], [sw, sY + H * 0.03], [sw * 0.82, hY - H * 0.01], [hw, hY + H * 0.03], [-hw, hY + H * 0.03], [-sw * 0.82, hY - H * 0.01]]);
    paint(ctx, base, -sw, sY, sw * 2, hY - sY, { light: 0.3, dark: 0.5, lw: 0.9 });
    ctx.save(); ctx.clip();
    // stone seams
    ctx.strokeStyle = al(dk(base, 0.55), 0.55); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-sw, sY + H * 0.1); ctx.lineTo(sw, sY + H * 0.08); ctx.moveTo(-sw * 0.3, sY + H * 0.1); ctx.lineTo(-sw * 0.45, hY);
    ctx.moveTo(sw * 0.35, sY + H * 0.08); ctx.lineTo(sw * 0.5, hY); ctx.moveTo(-sw, (sY + hY) / 2 + H * 0.04); ctx.lineTo(sw, (sY + hY) / 2 + H * 0.02); ctx.stroke();
    // chips of lighter stone
    ctx.fillStyle = al(lt(base, 0.4), 0.5);
    for (let i = 0; i < 5; i++) { const a = (l.seed + i * 37) % 100 / 100; ell(ctx, -sw * 0.8 + a * sw * 1.6, sY + H * 0.05 + ((i * 29) % 100) / 100 * (hY - sY), sw * 0.16, H * 0.016, 0.3); ctx.fill(); }
    // glowing core
    const cy = (sY + hY) / 2;
    glow(ctx, 0, cy, sw * 1.1, core, 0.55);
    ctx.fillStyle = lt(core, 0.55); circ(ctx, 0, cy, H * 0.03); ctx.fill();
    ctx.strokeStyle = al(core, 0.65); ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(Math.cos(i * 2.1 + 0.4) * sw * 0.8, cy + Math.sin(i * 2.1 + 0.4) * H * 0.12); ctx.stroke(); }
    ctx.fillStyle = Art.grad(ctx, -sw, sY, sw, hY, [[0, 'rgba(255,246,214,0.22)'], [0.5, 'rgba(255,246,214,0)'], [1, 'rgba(18,18,60,0.35)']]); ctx.fillRect(-sw, sY, sw * 2, hY - sY);
    ctx.restore();
  }
  function drawTreantTorso(ctx, l, m, H, pose) {
    const bark = l.skin || '#6a4a2e', sY = m.shoulderY, hY = m.hipY, sw = m.sw * 1.15, hw = m.hw * 1.3;
    ctx.beginPath(); ctx.moveTo(-sw, sY + H * 0.04); ctx.quadraticCurveTo(0, sY - H * 0.04, sw, sY + H * 0.04);
    ctx.quadraticCurveTo(sw * 1.1, (sY + hY) / 2, hw * 1.2, hY + H * 0.06); ctx.quadraticCurveTo(0, hY + H * 0.1, -hw * 1.2, hY + H * 0.06);
    ctx.quadraticCurveTo(-sw * 1.1, (sY + hY) / 2, -sw, sY + H * 0.04); ctx.closePath();
    paint(ctx, bark, -sw, sY, sw * 2, hY - sY, { light: 0.28, dark: 0.5, lw: 0.9 });
    ctx.save(); ctx.clip();
    // bark grooves
    ctx.strokeStyle = al('#2a1a0c', 0.55); ctx.lineWidth = 0.8;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * sw * 0.3, sY); ctx.quadraticCurveTo(i * sw * 0.36 + sw * 0.05, (sY + hY) / 2, i * sw * 0.33, hY + H * 0.06); ctx.stroke(); }
    // moss patches + a hollow
    ctx.fillStyle = al('#4f8a30', 0.55);
    for (let i = 0; i < 4; i++) { const a = (l.seed + i * 53) % 100 / 100; ell(ctx, -sw * 0.7 + a * sw * 1.4, sY + H * 0.05 + ((i * 41) % 100) / 100 * (hY - sY), sw * 0.3, H * 0.03, -0.2); ctx.fill(); }
    ctx.fillStyle = al('#1c1208', 0.7); ell(ctx, -sw * 0.25, (sY + hY) / 2 + H * 0.02, sw * 0.22, H * 0.045, 0.2); ctx.fill();
    ctx.fillStyle = Art.grad(ctx, -sw, sY, sw, hY, [[0, 'rgba(255,240,200,0.2)'], [0.5, 'rgba(255,240,200,0)'], [1, 'rgba(12,20,40,0.4)']]); ctx.fillRect(-sw, sY, sw * 2, hY - sY);
    ctx.restore();
    // small branches with leaves off the shoulders
    const sway = pose.capeSway * H * 0.01;
    ctx.strokeStyle = dk(bark, 0.25); ctx.lineWidth = H * 0.018;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * sw * 0.7, sY + H * 0.05); ctx.quadraticCurveTo(s * sw * 1.5, sY - H * 0.03, s * sw * 1.7 + sway, sY - H * 0.12); ctx.stroke(); }
    ctx.fillStyle = '#4f8a30'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ell(ctx, s * sw * (1.5 + i * 0.1) + sway, sY - H * (0.1 + i * 0.03), sw * 0.2, H * 0.016, -0.6 * s); ctx.fill(); ctx.stroke(); }
  }

  // ================================================================ (part 2d) WEAPONS
  const TWO_HAND = { pike: 1, great_axe: 1, great_sword: 1, halberd: 1, lance: 1, banner: 1, crossbow: 1, bow: 1 };
  const MELEE_GLOW = { sword: 1, great_sword: 1, axe: 1, great_axe: 1, mace: 1, hammer: 1, spear: 1, spear_shield: 1, pike: 1, halberd: 1, lance: 1, daggers: 1, club: 1, javelin: 1, whip: 1 };
  function weaponMetal(l, hero) {
    if (hero || l.armor === 'ceremonial') return '#f0d78a';
    if (l.body === 'skeleton' || l.body === 'undead' || l.body === 'ghost') return '#9aa2ac';
    if (l.body === 'demon' || l.body === 'fiend') return '#7a5a68';
    if ((l.tier | 0) >= 4) return METAL.silver;
    if (l.metal) return mix(METAL.steel, l.metal, 0.3);
    return METAL.steel;
  }
  /** fill the current path as metal, lit perpendicular to the weapon axis (hw = half width in local y) */
  function metalFill(ctx, base, hw, o) {
    o = o || {};
    ctx.fillStyle = Art.grad(ctx, 0, -hw, 0, hw, [[0, lt(base, 0.7)], [0.26, lt(base, 0.2)], [0.5, base], [0.68, dk(base, 0.3)], [1, dk(base, 0.55)]]);
    ctx.fill();
    if (!o.noOut) { ctx.strokeStyle = o.out || OUT; ctx.lineWidth = o.lw || 0.7; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  /** wooden (or wrapped) shaft along the local x axis */
  function haft(ctx, x0, x1, w, col) {
    col = col || WOOD;
    Art.rrect(ctx, x0, -w / 2, x1 - x0, w, w * 0.45);
    ctx.fillStyle = Art.grad(ctx, 0, -w / 2, 0, w / 2, [[0, lt(col, 0.45)], [0.42, col], [1, dk(col, 0.5)]]);
    ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.6; ctx.stroke();
  }
  function grip(ctx, x0, x1, w) {
    haft(ctx, x0, x1, w, '#3d2416');
    ctx.strokeStyle = al('#1c1008', 0.55); ctx.lineWidth = 0.45;
    for (let x = x0 + w * 0.4; x < x1; x += w * 0.55) { ctx.beginPath(); ctx.moveTo(x, -w / 2); ctx.lineTo(x + w * 0.25, w / 2); ctx.stroke(); }
  }

  /**
   * Draw weapon `w` gripped at (hx,hy), rotated by `ang` (0 = pointing forward, -PI/2 = straight up).
   * Two-handed weapons are drawn once, at the near (front) hand.
   */
  function drawWeapon(ctx, l, w, hx, hy, ang, H, pose, hero, isFar) {
    if (!w || w === 'none' || w === 'claws') return;
    if (isFar && TWO_HAND[w]) return;
    const metal = weaponMetal(l, hero), el = l.element ? ELEMENT[l.element] : null;
    const trim = hero ? METAL.gold : (l.cloth2 || METAL.bronze), cloth = clothColor(l);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang === undefined ? -1.1 : ang);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    switch (w) {
      case 'sword': case 'great_sword': case 'daggers': {
        const big = w === 'great_sword', dag = w === 'daggers';
        const bl = H * (dag ? 0.2 : big ? 0.62 : 0.4), bw = H * (dag ? 0.015 : big ? 0.031 : 0.023);
        const gl = H * (dag ? 0.05 : big ? 0.13 : 0.08), gx = H * (dag ? 0.03 : big ? 0.05 : 0.038);
        grip(ctx, -gl, H * 0.012, H * (big ? 0.028 : 0.022));
        circ(ctx, -gl - H * 0.012, 0, H * (big ? 0.022 : 0.017)); metalFill(ctx, trim, H * 0.02, { lw: 0.6 });
        // cross guard
        Art.rrect(ctx, H * 0.008, -gx, H * (big ? 0.035 : 0.026), gx * 2, H * 0.01); metalFill(ctx, trim, gx, { lw: 0.6 });
        if (big) { ctx.strokeStyle = trim; ctx.lineWidth = H * 0.012; ctx.beginPath(); ctx.moveTo(H * 0.02, -gx); ctx.quadraticCurveTo(H * 0.1, -gx * 0.6, H * 0.06, 0); ctx.stroke(); }
        // blade
        const b0 = H * (big ? 0.05 : 0.036);
        poly(ctx, [[b0, -bw], [b0 + bl * 0.82, -bw * 0.86], [b0 + bl, 0], [b0 + bl * 0.82, bw * 0.86], [b0, bw]]);
        metalFill(ctx, metal, bw);
        ctx.strokeStyle = al(lt(metal, 0.85), 0.75); ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(b0 + bl * 0.05, -bw * 0.35); ctx.lineTo(b0 + bl * 0.8, -bw * 0.3); ctx.stroke();
        ctx.strokeStyle = al(dk(metal, 0.5), 0.5); ctx.beginPath(); ctx.moveTo(b0 + bl * 0.05, bw * 0.15); ctx.lineTo(b0 + bl * 0.82, bw * 0.2); ctx.stroke();
        if (hero) { ctx.fillStyle = '#ff5a6a'; circ(ctx, H * 0.022, 0, H * 0.011); ctx.fill(); }
        break;
      }
      case 'axe': case 'great_axe': {
        const big = w === 'great_axe';
        const hx1 = H * (big ? 0.56 : 0.33), bx = H * (big ? 0.4 : 0.22), L = H * (big ? 0.18 : 0.13), hw2 = H * (big ? 0.028 : 0.02);
        haft(ctx, -H * (big ? 0.14 : 0.1), hx1 + H * 0.02, H * (big ? 0.026 : 0.021), big ? DARKWOOD : WOOD);
        ctx.strokeStyle = al('#2a1a0c', 0.6); ctx.lineWidth = H * 0.008;
        for (let i = 0; i < 3; i++) { const x = -H * 0.06 + i * H * 0.05; ctx.beginPath(); ctx.moveTo(x, -hw2 * 0.5); ctx.lineTo(x + H * 0.014, hw2 * 0.5); ctx.stroke(); }
        // head: big forward crescent + small rear spike
        ctx.beginPath(); ctx.moveTo(bx, -hw2 * 0.6); ctx.quadraticCurveTo(bx + L * 0.55, -L * 1.25, bx + L * 1.05, -L * 0.8);
        ctx.quadraticCurveTo(bx + L * 1.35, 0, bx + L * 1.05, L * 0.8); ctx.quadraticCurveTo(bx + L * 0.55, L * 1.25, bx, hw2 * 0.6);
        ctx.quadraticCurveTo(bx + L * 0.3, 0, bx, -hw2 * 0.6); ctx.closePath();
        metalFill(ctx, metal, L, { lw: 0.8 });
        ctx.strokeStyle = al(lt(metal, 0.8), 0.6); ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(bx + L * 0.85, -L * 0.75); ctx.quadraticCurveTo(bx + L * 1.1, 0, bx + L * 0.85, L * 0.75); ctx.stroke();
        if (!big) { poly(ctx, [[bx - H * 0.005, -hw2 * 0.6], [bx - L * 0.55, -L * 0.2], [bx - H * 0.005, hw2 * 0.6]]); metalFill(ctx, dk(metal, 0.2), L * 0.4, { lw: 0.6 }); }
        else { ctx.beginPath(); ctx.moveTo(bx, -hw2 * 0.6); ctx.quadraticCurveTo(bx - L * 0.5, -L * 1.1, bx - L * 0.9, -L * 0.6); ctx.quadraticCurveTo(bx - L * 1.15, 0, bx - L * 0.9, L * 0.6); ctx.quadraticCurveTo(bx - L * 0.5, L * 1.1, bx, hw2 * 0.6); ctx.closePath(); metalFill(ctx, dk(metal, 0.12), L, { lw: 0.8 }); }
        // socket band
        Art.rrect(ctx, bx - H * 0.02, -hw2 * 1.1, H * 0.05, hw2 * 2.2, H * 0.008); metalFill(ctx, trim, hw2 * 1.1, { lw: 0.5 });
        break;
      }
      case 'mace': case 'hammer': case 'club': {
        if (w === 'club') {
          poly(ctx, [[-H * 0.09, -H * 0.02], [H * 0.3, -H * 0.06], [H * 0.36, -H * 0.03], [H * 0.36, H * 0.03], [H * 0.3, H * 0.06], [-H * 0.09, H * 0.02]]);
          ctx.fillStyle = Art.grad(ctx, 0, -H * 0.06, 0, H * 0.06, [[0, lt(WOOD, 0.45)], [0.45, WOOD], [1, dk(WOOD, 0.5)]]); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
          ctx.fillStyle = dk(METAL.iron, 0.1); ctx.strokeStyle = OUT; ctx.lineWidth = 0.4;
          for (let i = 0; i < 4; i++) { poly(ctx, [[H * (0.16 + i * 0.05), -H * 0.045 + (i % 2) * H * 0.06], [H * (0.2 + i * 0.05), -H * 0.075 + (i % 2) * H * 0.1], [H * (0.22 + i * 0.05), -H * 0.04 + (i % 2) * H * 0.06]]); ctx.fill(); ctx.stroke(); }
          break;
        }
        const isH = w === 'hammer', hl = H * (isH ? 0.3 : 0.26);
        grip(ctx, -H * 0.09, H * 0.02, H * 0.023);
        haft(ctx, H * 0.01, hl, H * 0.021, DARKWOOD);
        if (isH) {
          Art.rrect(ctx, hl - H * 0.02, -H * 0.055, H * 0.085, H * 0.11, H * 0.015); metalFill(ctx, metal, H * 0.055, { lw: 0.8 });
          poly(ctx, [[hl - H * 0.02, -H * 0.03], [hl - H * 0.09, -H * 0.012], [hl - H * 0.09, H * 0.012], [hl - H * 0.02, H * 0.03]]); metalFill(ctx, dk(metal, 0.2), H * 0.03, { lw: 0.6 });
          ctx.fillStyle = al(lt(metal, 0.7), 0.55); ctx.fillRect(hl + H * 0.04, -H * 0.05, H * 0.02, H * 0.1);
          ctx.strokeStyle = al(dk(metal, 0.55), 0.5); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(hl - H * 0.01, -H * 0.05); ctx.lineTo(hl - H * 0.01, H * 0.05); ctx.stroke();
        } else {
          circ(ctx, hl + H * 0.02, 0, H * 0.045); metalFill(ctx, metal, H * 0.045, { lw: 0.8 });
          ctx.fillStyle = dk(metal, 0.15); ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
          for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; poly(ctx, [[hl + H * 0.02 + Math.cos(a) * H * 0.03, Math.sin(a) * H * 0.03], [hl + H * 0.02 + Math.cos(a + 0.28) * H * 0.072, Math.sin(a + 0.28) * H * 0.072], [hl + H * 0.02 + Math.cos(a - 0.28) * H * 0.072, Math.sin(a - 0.28) * H * 0.072]]); ctx.fill(); ctx.stroke(); }
          ctx.fillStyle = 'rgba(255,250,230,0.5)'; circ(ctx, hl + H * 0.005, -H * 0.015, H * 0.014); ctx.fill();
        }
        break;
      }
      case 'spear': case 'javelin': case 'pike': {
        const long = w === 'pike', jav = w === 'javelin';
        const x0 = H * (long ? -0.62 : jav ? -0.2 : -0.32), x1 = H * (long ? 0.8 : jav ? 0.3 : 0.44);
        const sw2 = H * (long ? 0.018 : jav ? 0.013 : 0.017), tl = H * (jav ? 0.07 : 0.11), tw = H * (jav ? 0.018 : 0.026);
        haft(ctx, x0, x1, sw2, jav ? '#8a6a44' : WOOD);
        // butt cap
        Art.rrect(ctx, x0 - H * 0.012, -sw2 * 0.8, H * 0.025, sw2 * 1.6, sw2 * 0.4); metalFill(ctx, dk(metal, 0.2), sw2, { lw: 0.5 });
        // leaf head
        poly(ctx, [[x1 - H * 0.01, -sw2 * 0.6], [x1 + tl * 0.35, -tw], [x1 + tl, 0], [x1 + tl * 0.35, tw], [x1 - H * 0.01, sw2 * 0.6]]);
        metalFill(ctx, metal, tw);
        ctx.strokeStyle = al(lt(metal, 0.8), 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1 + tl * 0.85, 0); ctx.stroke();
        // collar + pennon
        Art.rrect(ctx, x1 - H * 0.03, -sw2 * 0.9, H * 0.03, sw2 * 1.8, sw2 * 0.4); metalFill(ctx, trim, sw2, { lw: 0.5 });
        if (!jav && (l.tier | 0) >= 2) {
          const flut = Math.sin((pose.f || 0) * 1.4) * H * 0.012;
          ctx.beginPath(); ctx.moveTo(x1 - H * 0.04, -sw2 * 0.4); ctx.quadraticCurveTo(x1 - H * 0.11, -H * 0.05 + flut, x1 - H * 0.16, -H * 0.02 + flut);
          ctx.quadraticCurveTo(x1 - H * 0.1, -H * 0.012, x1 - H * 0.04, sw2 * 0.4); ctx.closePath();
          paint(ctx, cloth, x1 - H * 0.16, -H * 0.05, H * 0.14, H * 0.06, { light: 0.35, dark: 0.4, lw: 0.5 });
        }
        break;
      }
      case 'lance': {
        const x0 = -H * 0.18, x1 = H * 0.8;
        ctx.beginPath(); ctx.moveTo(x0, -H * 0.018); ctx.lineTo(x1 * 0.92, -H * 0.009); ctx.lineTo(x1, 0); ctx.lineTo(x1 * 0.92, H * 0.009); ctx.lineTo(x0, H * 0.018); ctx.closePath();
        ctx.fillStyle = Art.grad(ctx, 0, -H * 0.018, 0, H * 0.018, [[0, lt(cloth, 0.6)], [0.45, cloth], [1, dk(cloth, 0.5)]]); ctx.fill();
        ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
        // spiral banding
        ctx.save(); ctx.beginPath(); ctx.moveTo(x0, -H * 0.018); ctx.lineTo(x1, 0); ctx.lineTo(x0, H * 0.018); ctx.closePath(); ctx.clip();
        ctx.strokeStyle = al(l.cloth2 || '#f4ecd6', 0.9); ctx.lineWidth = H * 0.014;
        for (let i = 0; i < 7; i++) { const x = x0 + H * 0.08 + i * H * 0.12; ctx.beginPath(); ctx.moveTo(x, -H * 0.03); ctx.lineTo(x + H * 0.05, H * 0.03); ctx.stroke(); }
        ctx.restore();
        // vamplate cone
        ctx.beginPath(); ctx.moveTo(H * 0.02, -H * 0.02); ctx.lineTo(H * 0.1, -H * 0.06); ctx.lineTo(H * 0.1, H * 0.06); ctx.lineTo(H * 0.02, H * 0.02); ctx.closePath();
        metalFill(ctx, metal, H * 0.06, { lw: 0.7 });
        poly(ctx, [[x1 - H * 0.08, -H * 0.014], [x1 + H * 0.04, 0], [x1 - H * 0.08, H * 0.014]]); metalFill(ctx, metal, H * 0.014, { lw: 0.6 });
        break;
      }
      case 'halberd': {
        const x0 = -H * 0.52, x1 = H * 0.72, bx = H * 0.5;
        haft(ctx, x0, x1, H * 0.02, DARKWOOD);
        // top spike
        poly(ctx, [[x1 - H * 0.02, -H * 0.014], [x1 + H * 0.1, 0], [x1 - H * 0.02, H * 0.014]]); metalFill(ctx, metal, H * 0.016, { lw: 0.6 });
        // axe blade (forward) + rear hook
        ctx.beginPath(); ctx.moveTo(bx, -H * 0.012); ctx.quadraticCurveTo(bx + H * 0.08, -H * 0.13, bx + H * 0.18, -H * 0.1);
        ctx.quadraticCurveTo(bx + H * 0.19, -H * 0.02, bx + H * 0.06, H * 0.012); ctx.closePath();
        metalFill(ctx, metal, H * 0.1, { lw: 0.8 });
        ctx.beginPath(); ctx.moveTo(bx, H * 0.012); ctx.quadraticCurveTo(bx - H * 0.05, H * 0.1, bx - H * 0.14, H * 0.09);
        ctx.quadraticCurveTo(bx - H * 0.06, H * 0.05, bx - H * 0.01, -H * 0.012); ctx.closePath();
        metalFill(ctx, dk(metal, 0.18), H * 0.09, { lw: 0.7 });
        Art.rrect(ctx, bx - H * 0.03, -H * 0.022, H * 0.11, H * 0.044, H * 0.008); metalFill(ctx, trim, H * 0.022, { lw: 0.5 });
        ctx.strokeStyle = al(lt(metal, 0.8), 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(bx + H * 0.16, -H * 0.095); ctx.quadraticCurveTo(bx + H * 0.175, -H * 0.05, bx + H * 0.07, H * 0.005); ctx.stroke();
        break;
      }
      case 'bow': {
        const L = H * 0.33, pull = (pose.draw || 0) * L * 0.42, back = -L * 0.26;
        // string
        ctx.strokeStyle = 'rgba(245,240,225,0.9)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(-L, back); ctx.lineTo(0, back - pull); ctx.lineTo(L, back); ctx.stroke();
        // limbs
        ctx.beginPath(); ctx.moveTo(-L, back); ctx.quadraticCurveTo(0, L * 0.3, L, back);
        ctx.strokeStyle = OUT; ctx.lineWidth = H * 0.028; ctx.stroke();
        ctx.strokeStyle = Art.grad(ctx, 0, back, 0, L * 0.2, [[0, lt(WOOD, 0.5)], [0.6, WOOD], [1, dk(WOOD, 0.45)]]); ctx.lineWidth = H * 0.019; ctx.stroke();
        ctx.strokeStyle = al(lt(WOOD, 0.7), 0.5); ctx.lineWidth = H * 0.005; ctx.stroke();
        // tips + grip wrap
        ctx.fillStyle = trim; for (const s of [-1, 1]) { circ(ctx, s * L, back, H * 0.012); ctx.fill(); }
        Art.rrect(ctx, -H * 0.022, -H * 0.012, H * 0.044, H * 0.03, H * 0.008); paint(ctx, '#3d2416', -H * 0.022, -H * 0.012, H * 0.044, H * 0.03, { light: 0.3, dark: 0.4, lw: 0.5 });
        // nocked arrow
        if (pose.anim !== 'death') {
          line(ctx, [[0, back - pull], [0, L * 0.52]], '#caa97e', H * 0.011);
          poly(ctx, [[0, L * 0.52], [-H * 0.014, L * 0.44], [H * 0.014, L * 0.44]]); ctx.fillStyle = metal; ctx.fill();
          ctx.fillStyle = '#d8d2c2'; poly(ctx, [[0, back - pull], [-H * 0.026, back - pull + L * 0.12], [0, back - pull + L * 0.1]]); ctx.fill();
          poly(ctx, [[0, back - pull], [H * 0.026, back - pull + L * 0.12], [0, back - pull + L * 0.1]]); ctx.fill();
        }
        break;
      }
      case 'crossbow': {
        const sx0 = -H * 0.12, sx1 = H * 0.3, arm = H * 0.17;
        // stock
        poly(ctx, [[sx0, -H * 0.02], [sx1, -H * 0.016], [sx1, H * 0.012], [sx0 + H * 0.06, H * 0.022], [sx0, H * 0.05]]);
        paint(ctx, DARKWOOD, sx0, -H * 0.05, sx1 - sx0, H * 0.1, { light: 0.32, dark: 0.45, lw: 0.7 });
        // prod
        ctx.beginPath(); ctx.moveTo(H * 0.2, -arm); ctx.quadraticCurveTo(H * 0.26, 0, H * 0.2, arm);
        ctx.strokeStyle = OUT; ctx.lineWidth = H * 0.026; ctx.stroke();
        ctx.strokeStyle = Art.grad(ctx, 0, -arm, 0, arm, [[0, lt(metal, 0.55)], [0.5, metal], [1, dk(metal, 0.45)]]); ctx.lineWidth = H * 0.017; ctx.stroke();
        // string + bolt
        const dr = (pose.draw || 0) * H * 0.05;
        ctx.strokeStyle = 'rgba(245,240,225,0.9)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(H * 0.2, -arm); ctx.lineTo(H * 0.1 - dr, 0); ctx.lineTo(H * 0.2, arm); ctx.stroke();
        line(ctx, [[H * 0.1 - dr, -H * 0.006], [H * 0.34, -H * 0.006]], '#caa97e', H * 0.01);
        poly(ctx, [[H * 0.34, -H * 0.006], [H * 0.3, -H * 0.024], [H * 0.3, H * 0.012]]); ctx.fillStyle = metal; ctx.fill();
        // trigger + lath binding
        ctx.fillStyle = dk(metal, 0.2); ctx.fillRect(H * 0.04, H * 0.012, H * 0.012, H * 0.03);
        Art.rrect(ctx, H * 0.17, -H * 0.026, H * 0.05, H * 0.052, H * 0.01); metalFill(ctx, trim, H * 0.026, { lw: 0.5 });
        break;
      }
      case 'rifle': {
        ctx.rotate((ang === undefined ? -1.1 : ang) * -0.72);  // keep the barrel close to level
        poly(ctx, [[-H * 0.16, -H * 0.012], [-H * 0.06, -H * 0.03], [H * 0.06, -H * 0.028], [H * 0.06, H * 0.016], [-H * 0.05, H * 0.028], [-H * 0.14, H * 0.05]]);
        paint(ctx, '#5a3a20', -H * 0.16, -H * 0.05, H * 0.24, H * 0.1, { light: 0.32, dark: 0.45, lw: 0.7 });
        Art.rrect(ctx, H * 0.02, -H * 0.018, H * 0.44, H * 0.026, H * 0.008); metalFill(ctx, dk(metal, 0.35), H * 0.018, { lw: 0.6 });
        ctx.fillStyle = trim; ctx.fillRect(H * 0.0, -H * 0.03, H * 0.05, H * 0.04);
        ctx.fillStyle = dk(metal, 0.5); ctx.fillRect(-H * 0.02, H * 0.008, H * 0.012, H * 0.03);
        if (pose.anim === 'attack' && (pose.f === 2 || pose.f === 3)) {
          glow(ctx, H * 0.48, -H * 0.005, H * 0.13, '#ffd070', 0.95);
          ctx.fillStyle = '#fff0b0'; poly(ctx, [[H * 0.46, -H * 0.005], [H * 0.6, -H * 0.05], [H * 0.56, 0], [H * 0.6, H * 0.045]]); ctx.fill();
        }
        break;
      }
      case 'sling': {
        const px = H * 0.22, spin = pose.anim === 'attack' ? (pose.f % 3) * 0.5 : 0;
        ctx.rotate(spin);
        ctx.strokeStyle = '#c8b090'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(px * 0.6, -H * 0.03, px, -H * 0.012); ctx.moveTo(0, 0); ctx.quadraticCurveTo(px * 0.6, H * 0.03, px, H * 0.012); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, -H * 0.015); ctx.quadraticCurveTo(px + H * 0.05, 0, px, H * 0.015); ctx.quadraticCurveTo(px - H * 0.02, 0, px, -H * 0.015); ctx.closePath();
        paint(ctx, '#7a5230', px - H * 0.02, -H * 0.02, H * 0.07, H * 0.04, { light: 0.3, dark: 0.45, lw: 0.6 });
        circ(ctx, px + H * 0.012, 0, H * 0.014); paint(ctx, '#8a8a84', px - H * 0.002, -H * 0.014, H * 0.028, H * 0.028, { light: 0.4, dark: 0.4, lw: 0.5 });
        break;
      }
      case 'staff': {
        const x0 = -H * 0.46, x1 = H * 0.52, sw2 = H * 0.026;
        haft(ctx, x0, x1, sw2, l.body === 'treant' ? '#4a3a22' : WOOD);
        ctx.strokeStyle = al('#2c1c0e', 0.5); ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x0 + H * 0.05, -sw2 * 0.3); ctx.quadraticCurveTo(0, sw2 * 0.2, x1 - H * 0.1, -sw2 * 0.2); ctx.stroke();
        // leather wrap at the grip
        haft(ctx, -H * 0.05, H * 0.05, sw2 * 1.25, '#4a3018');
        // head: claw setting holding a glowing orb
        const oc = el || l.glow || '#8fa0ff', ox = x1 + H * 0.05, orr = H * 0.045;
        ctx.strokeStyle = dk(metal, 0.1); ctx.lineWidth = H * 0.013;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x1 - H * 0.02, s * sw2 * 0.4); ctx.quadraticCurveTo(x1 + H * 0.03, s * orr * 1.5, ox + orr * 0.4, s * orr * 0.8); ctx.stroke(); }
        glow(ctx, ox, 0, orr * 3.2, oc, 0.75);
        circ(ctx, ox, 0, orr);
        ctx.fillStyle = Art.rgrad(ctx, ox - orr * 0.3, -orr * 0.35, 0, orr * 1.25, [[0, '#ffffff'], [0.35, lt(oc, 0.5)], [1, dk(oc, 0.35)]]);
        ctx.fill(); ctx.strokeStyle = al(lt(oc, 0.6), 0.8); ctx.lineWidth = 0.6; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; circ(ctx, ox - orr * 0.32, -orr * 0.36, orr * 0.2); ctx.fill();
        break;
      }
      case 'wand': {
        haft(ctx, -H * 0.04, H * 0.19, H * 0.016, DARKWOOD);
        ctx.fillStyle = trim; ctx.fillRect(H * 0.02, -H * 0.012, H * 0.016, H * 0.024);
        const oc = el || l.glow || '#b8a0ff';
        glow(ctx, H * 0.21, 0, H * 0.09, oc, 0.9);
        circ(ctx, H * 0.21, 0, H * 0.019); ctx.fillStyle = lt(oc, 0.55); ctx.fill(); ctx.strokeStyle = al(dk(oc, 0.3), 0.7); ctx.lineWidth = 0.5; ctx.stroke();
        break;
      }
      case 'orb': {
        const oc = el || l.glow || '#9ab0ff', r = H * 0.055, ox = H * 0.02, oy = -H * 0.05 - (pose.cast || 0) * H * 0.02;
        glow(ctx, ox, oy, r * 3.4, oc, 0.7);
        circ(ctx, ox, oy, r);
        ctx.fillStyle = Art.rgrad(ctx, ox - r * 0.32, oy - r * 0.36, 0, r * 1.3, [[0, 'rgba(255,255,255,0.95)'], [0.3, lt(oc, 0.45)], [0.8, oc], [1, dk(oc, 0.4)]]);
        ctx.fill(); ctx.strokeStyle = al(lt(oc, 0.5), 0.7); ctx.lineWidth = 0.6; ctx.stroke();
        // inner swirl + orbiting motes
        ctx.save(); circ(ctx, ox, oy, r); ctx.clip(); ctx.strokeStyle = al('#ffffff', 0.5); ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(ox - r, oy + r * 0.3); ctx.quadraticCurveTo(ox, oy - r * 0.6, ox + r, oy + r * 0.45); ctx.stroke(); ctx.restore();
        ctx.fillStyle = al(lt(oc, 0.7), 0.9);
        for (let i = 0; i < 3; i++) { const a = (pose.f || 0) * 0.5 + i * 2.1; circ(ctx, ox + Math.cos(a) * r * 1.7, oy + Math.sin(a) * r * 0.9, r * 0.13); ctx.fill(); }
        break;
      }
      case 'tome': {
        const bw2 = H * 0.11, bh = H * 0.085, oc = el || l.glow || '#ffe0a0';
        ctx.rotate(0.25);
        // covers
        poly(ctx, [[-bw2, -bh * 0.5], [0, -bh * 0.75], [bw2, -bh * 0.5], [bw2, bh * 0.6], [0, bh * 0.35], [-bw2, bh * 0.6]]);
        paint(ctx, dk(cloth, 0.35), -bw2, -bh, bw2 * 2, bh * 1.8, { light: 0.25, dark: 0.5, lw: 0.7 });
        // pages
        poly(ctx, [[-bw2 * 0.9, -bh * 0.45], [0, -bh * 0.66], [bw2 * 0.9, -bh * 0.45], [bw2 * 0.85, bh * 0.45], [0, bh * 0.25], [-bw2 * 0.85, bh * 0.45]]);
        paint(ctx, '#f0e6cc', -bw2, -bh * 0.7, bw2 * 2, bh * 1.2, { light: 0.3, dark: 0.3, lw: 0.5 });
        ctx.strokeStyle = al('#6a5a48', 0.5); ctx.lineWidth = 0.4;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-bw2 * 0.7, -bh * 0.3 + i * bh * 0.22); ctx.lineTo(-bw2 * 0.15, -bh * 0.38 + i * bh * 0.22); ctx.moveTo(bw2 * 0.15, -bh * 0.38 + i * bh * 0.22); ctx.lineTo(bw2 * 0.7, -bh * 0.3 + i * bh * 0.22); ctx.stroke(); }
        line(ctx, [[0, -bh * 0.68], [0, bh * 0.28]], dk(cloth, 0.5), H * 0.008);
        glow(ctx, 0, -bh * 0.2, bh * 1.5, oc, 0.45 + (pose.cast || 0) * 0.35);
        ctx.fillStyle = trim; circ(ctx, 0, bh * 0.05, H * 0.012); ctx.fill();
        break;
      }
      case 'torch': {
        haft(ctx, -H * 0.06, H * 0.19, H * 0.018, DARKWOOD);
        ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = H * 0.026; ctx.beginPath(); ctx.moveTo(H * 0.16, 0); ctx.lineTo(H * 0.21, 0); ctx.stroke();
        const fc = el || '#ff9a2a', fl = 1 + Math.sin((pose.f || 0) * 1.7) * 0.12;
        glow(ctx, H * 0.27, 0, H * 0.16 * fl, fc, 0.85);
        ctx.beginPath(); ctx.moveTo(H * 0.2, -H * 0.03); ctx.quadraticCurveTo(H * 0.3, -H * 0.055 * fl, H * 0.38 * fl, 0);
        ctx.quadraticCurveTo(H * 0.3, H * 0.055 * fl, H * 0.2, H * 0.03); ctx.closePath();
        ctx.fillStyle = Art.grad(ctx, H * 0.2, 0, H * 0.38, 0, [[0, lt(fc, 0.2)], [0.5, fc], [1, 'rgba(255,240,180,0.9)']]); ctx.fill();
        ctx.fillStyle = 'rgba(255,248,210,0.85)'; ell(ctx, H * 0.25, 0, H * 0.035, H * 0.02); ctx.fill();
        break;
      }
      case 'banner': {
        const x0 = -H * 0.5, x1 = H * 0.78, wv = Math.sin((pose.f || 0) * 1.3) * H * 0.02;
        haft(ctx, x0, x1, H * 0.018, DARKWOOD);
        // finial
        poly(ctx, [[x1 - H * 0.01, -H * 0.014], [x1 + H * 0.07, 0], [x1 - H * 0.01, H * 0.014]]); metalFill(ctx, METAL.gold, H * 0.016, { lw: 0.5 });
        // flag hanging forward of the pole
        const fy0 = H * 0.012, fy1 = H * 0.3, fx0 = x1 - H * 0.06, fx1 = x1 - H * 0.44;
        ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.quadraticCurveTo((fx0 + fx1) / 2 + wv, fy1 * 0.45, fx0 - H * 0.02, fy1);
        ctx.quadraticCurveTo((fx0 + fx1) / 2 - wv, fy1 * 0.82, fx1, fy1 * 0.86);
        ctx.quadraticCurveTo(fx1 + H * 0.04 + wv, fy1 * 0.45, fx1, fy0); ctx.closePath();
        paint(ctx, cloth, fx1, fy0, fx0 - fx1, fy1 - fy0, { light: 0.34, dark: 0.45, lw: 0.7 });
        ctx.save(); ctx.clip();
        ctx.strokeStyle = al(dk(cloth, 0.5), 0.45); ctx.lineWidth = 0.6;
        for (let i = 1; i < 4; i++) { const t = i / 4; ctx.beginPath(); ctx.moveTo(M.lerp(fx0, fx1, t) + wv * 0.5, fy0); ctx.lineTo(M.lerp(fx0 - H * 0.02, fx1, t) - wv * 0.5, fy1 * (0.86 + 0.14 * (1 - t))); ctx.stroke(); }
        ctx.restore();
        drawSigil(ctx, (l.seed | 0) + 3, (fx0 + fx1) / 2 + wv * 0.4, fy1 * 0.5, H * 0.075, l.cloth2 || '#f4ecd6', al('#12101c', 0.45));
        ctx.strokeStyle = trim; ctx.lineWidth = H * 0.012;
        ctx.beginPath(); ctx.moveTo(fx1, fy1 * 0.86); ctx.quadraticCurveTo((fx0 + fx1) / 2 - wv, fy1 * 0.82, fx0 - H * 0.02, fy1); ctx.stroke();
        break;
      }
      case 'instrument': {
        ctx.rotate(0.3);
        // lute body + neck
        ell(ctx, 0, 0, H * 0.075, H * 0.055, 0.1);
        paint(ctx, '#8a5a2e', -H * 0.08, -H * 0.06, H * 0.16, H * 0.12, { light: 0.35, dark: 0.45, lw: 0.7 });
        ctx.fillStyle = al('#2a1a0c', 0.75); circ(ctx, H * 0.01, -H * 0.005, H * 0.02); ctx.fill();
        Art.rrect(ctx, H * 0.06, -H * 0.012, H * 0.19, H * 0.022, H * 0.006); paint(ctx, DARKWOOD, H * 0.06, -H * 0.012, H * 0.19, H * 0.022, { light: 0.3, dark: 0.45, lw: 0.6 });
        poly(ctx, [[H * 0.24, -H * 0.016], [H * 0.31, -H * 0.04], [H * 0.31, H * 0.008], [H * 0.24, H * 0.01]]); paint(ctx, '#5a3a20', H * 0.24, -H * 0.04, H * 0.07, H * 0.05, { light: 0.3, dark: 0.4, lw: 0.6 });
        ctx.strokeStyle = al('#f0e8d0', 0.75); ctx.lineWidth = 0.4;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-H * 0.05, i * H * 0.008); ctx.lineTo(H * 0.26, i * H * 0.006 - H * 0.008); ctx.stroke(); }
        if (pose.anim === 'attack' || pose.anim === 'cast') { ctx.fillStyle = al('#ffe9a8', 0.9); for (let i = 0; i < 3; i++) { const a = -1 - i * 0.5; circ(ctx, Math.cos(a) * H * 0.14, Math.sin(a) * H * 0.14 - H * 0.05, H * 0.012); ctx.fill(); } }
        break;
      }
      case 'whip': {
        const wob = Math.sin((pose.f || 0) * 1.6) * 0.3 + (pose.swing || 0) * 0.6;
        haft(ctx, -H * 0.04, H * 0.09, H * 0.018, '#3d2416');
        ctx.strokeStyle = OUT; ctx.lineWidth = H * 0.022;
        ctx.beginPath(); ctx.moveTo(H * 0.09, 0); ctx.quadraticCurveTo(H * 0.3, H * 0.12 * wob, H * 0.42, -H * 0.05 * wob); ctx.quadraticCurveTo(H * 0.55, -H * 0.2 * wob, H * 0.66, H * 0.04 * wob); ctx.stroke();
        ctx.strokeStyle = '#4a2a1a'; ctx.lineWidth = H * 0.014; ctx.stroke();
        ctx.strokeStyle = al(lt('#4a2a1a', 0.5), 0.6); ctx.lineWidth = H * 0.004; ctx.stroke();
        if (el) { glow(ctx, H * 0.45, 0, H * 0.18, el, 0.5); }
        break;
      }
      default: { // unknown weapon → a plain blade so nothing is ever missing
        grip(ctx, -H * 0.07, H * 0.012, H * 0.022);
        poly(ctx, [[H * 0.03, -H * 0.02], [H * 0.34, -H * 0.016], [H * 0.4, 0], [H * 0.34, H * 0.016], [H * 0.03, H * 0.02]]);
        metalFill(ctx, metal, H * 0.02);
        break;
      }
    }
    // elemental enchantment on the business end
    if (el && MELEE_GLOW[w]) {
      const gx = H * (w === 'great_sword' ? 0.4 : w === 'pike' ? 0.7 : w === 'lance' ? 0.6 : w === 'halberd' ? 0.55 : w === 'daggers' ? 0.14 : 0.3);
      glow(ctx, gx, 0, H * 0.13, el, 0.55);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      ctx.strokeStyle = el; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(H * 0.05, 0); ctx.lineTo(gx + H * 0.06, 0); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  // ================================================================ (part 3) QUADRUPEDS, MOUNTS & BEASTS
  // proportions are fractions of H: len = nose-to-tail body length, sh = belly height, bt = body depth
  const QUAD = {
    beast_wolf: { len: 1.3, sh: 0.44, bt: 0.26, lw: 0.064, hx: 0.17, hy: 0.15, hr: 0.16, head: 'canine', ears: 'pointed', tail: 'bush', fur: '#8f8f8f', hump: 0.3 },
    beast_lion: { len: 1.26, sh: 0.46, bt: 0.28, lw: 0.07, hx: 0.15, hy: 0.16, hr: 0.165, head: 'feline', ears: 'round', tail: 'tuft', fur: '#d8a24a', mane: 1, hump: 0.35 },
    beast_sabertooth: { len: 1.24, sh: 0.46, bt: 0.3, lw: 0.074, hx: 0.14, hy: 0.14, hr: 0.17, head: 'feline', ears: 'round', tail: 'tuft', fur: '#c8a070', fangs: 1, hump: 0.55, stripes: 1 },
    beast_bear: { len: 1.12, sh: 0.44, bt: 0.36, lw: 0.09, hx: 0.13, hy: 0.07, hr: 0.165, head: 'ursine', ears: 'round', tail: 'stub', fur: '#6a4a32', hump: 0.7, plantigrade: 1 },
    beast_boar: { len: 1.08, sh: 0.38, bt: 0.32, lw: 0.066, hx: 0.15, hy: 0.01, hr: 0.16, head: 'boar', ears: 'pointed', tail: 'thin', fur: '#5a4436', hump: 0.8, bristles: 1 },
    beast_elk: { len: 1.2, sh: 0.6, bt: 0.22, lw: 0.052, hx: 0.17, hy: 0.31, hr: 0.13, head: 'cervine', ears: 'long', tail: 'stub', fur: '#a07a4e', antlers: 1, hump: 0.35, hooves: 1 },
    beast_mammoth: { len: 1.18, sh: 0.54, bt: 0.44, lw: 0.108, hx: 0.11, hy: 0.09, hr: 0.2, head: 'mammoth', ears: 'round', tail: 'thin', fur: '#8a6a4a', hump: 0.95, shaggy: 1 },
    beast_crocodile: { len: 1.46, sh: 0.3, bt: 0.24, lw: 0.058, hx: 0.22, hy: 0.0, hr: 0.145, head: 'croc', ears: 'none', tail: 'croc', fur: '#5a6a42', hump: 0.1, scutes: 1, sprawl: 1 },
    beast_basilisk: { len: 1.4, sh: 0.34, bt: 0.26, lw: 0.062, hx: 0.2, hy: 0.12, hr: 0.15, head: 'croc', ears: 'none', tail: 'croc', fur: '#6a7a3a', hump: 0.15, crest: 1, scutes: 1, sprawl: 1 },
    unicorn: { len: 1.24, sh: 0.58, bt: 0.23, lw: 0.056, hx: 0.18, hy: 0.32, hr: 0.13, head: 'equine', ears: 'long', tail: 'flow', fur: '#f2eef8', mane: 1, horn: 1, hump: 0.3, hooves: 1 },
    griffon: { len: 1.14, sh: 0.48, bt: 0.28, lw: 0.064, hx: 0.17, hy: 0.24, hr: 0.15, head: 'avian', ears: 'none', tail: 'tuft', fur: '#c89a50', wings: 1, hump: 0.4, talons: 1 },
    horse: { len: 1.3, sh: 0.58, bt: 0.25, lw: 0.06, hx: 0.19, hy: 0.32, hr: 0.13, head: 'equine', ears: 'long', tail: 'flow', fur: '#6a4a32', mane: 1, hump: 0.3, hooves: 1 },
    dire_wolf: { len: 1.36, sh: 0.46, bt: 0.28, lw: 0.068, hx: 0.18, hy: 0.16, hr: 0.17, head: 'canine', ears: 'pointed', tail: 'bush', fur: '#77777e', hump: 0.4 },
    war_boar: { len: 1.16, sh: 0.4, bt: 0.35, lw: 0.072, hx: 0.16, hy: 0.01, hr: 0.17, head: 'boar', ears: 'pointed', tail: 'thin', fur: '#4a3a2e', hump: 0.8, bristles: 1 },
  };

  function quadLeg(ctx, hx, hy, fx, fy, w, col, bend, foot, haunch) {
    const d = Math.hypot(fx - hx, fy - hy), seg = Math.max(d * 0.55, w * 1.2);
    const k = ik(hx, hy, fx, fy - w * 0.5, seg, seg, bend);
    // muscled upper limb, slim lower limb, joint cap — reads as an animal leg rather than a stick
    if (haunch !== false) {
      ell(ctx, hx - (fx - hx) * 0.12, hy + Math.abs(fy - hy) * 0.14, w * 1.5, w * 1.8, bend * 0.16);
      paint(ctx, col, hx - w * 1.5, hy - w * 1.7, w * 3, w * 3.5, { light: 0.32, dark: 0.45, lw: 0.7 });
    }
    limb(ctx, [[hx, hy], [k[0], k[1]]], w * 1.18, col, { shadeEnd: true });
    limb(ctx, [[k[0], k[1]], [fx, fy - w * 0.5]], w * 0.72, dk(col, 0.05), { shadeEnd: true });
    ctx.fillStyle = al(lt(col, 0.22), 0.7); circ(ctx, k[0], k[1], w * 0.52); ctx.fill();
    if (foot === 'hoof') { poly(ctx, [[fx - w * 0.6, fy - w * 1.15], [fx + w * 0.62, fy - w * 1.15], [fx + w * 0.75, fy], [fx - w * 0.65, fy]]); paint(ctx, '#3a2a22', fx - w, fy - w, w * 2, w, { light: 0.45, dark: 0.3, lw: 0.5 }); }
    else if (foot === 'talon') {
      ell(ctx, fx + w * 0.2, fy - w * 0.35, w * 0.85, w * 0.45); paint(ctx, '#d8ae52', fx - w, fy - w, w * 2, w, { light: 0.4, dark: 0.4, lw: 0.5 });
      ctx.fillStyle = '#efe6d0'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.4;
      for (let i = -1; i <= 1; i++) { poly(ctx, [[fx + w * 0.6, fy - w * 0.45 + i * w * 0.2], [fx + w * 1.45, fy - w * 0.08 + i * w * 0.24], [fx + w * 0.65, fy - w * 0.12 + i * w * 0.2]]); ctx.fill(); ctx.stroke(); }
    } else {
      ell(ctx, fx + w * 0.2, fy - w * 0.34, w * 0.9, w * 0.46); paint(ctx, dk(col, 0.22), fx - w, fy - w, w * 2, w, { light: 0.3, dark: 0.4, lw: 0.5 });
      ctx.fillStyle = al(dk(col, 0.6), 0.65); for (let i = 0; i < 3; i++) { circ(ctx, fx + w * 0.42 + i * w * 0.28, fy - w * 0.24, w * 0.11); ctx.fill(); }
    }
  }

  /** animal head. kind: canine|feline|ursine|boar|cervine|equine|mammoth|croc|avian */
  function beastHead(ctx, l, c, cx, cy, r, base, pose, hero) {
    const kind = c.head, eye = l.eyes || (l.glow && c.horn ? l.glow : '#e8b428'), dark = dk(base, 0.3), lit = lt(base, 0.3);
    const open = pose.anim === 'attack' && pose.swing > 0.5;
    const lw = 0.8;
    // ---- ears / antlers / horn behind the skull
    if (c.antlers) {
      ctx.strokeStyle = '#d8c49a'; ctx.lineCap = 'round';
      for (const s of [0.55, 1]) {
        ctx.save(); ctx.globalAlpha *= s === 1 ? 1 : 0.75;
        const ox = cx - r * (s === 1 ? 0.1 : 0.45), oy = cy - r * 0.75;
        ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.28; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox - r * 0.7, oy - r * 1.5, ox + r * 0.35, oy - r * 2.1); ctx.stroke();
        ctx.strokeStyle = '#d8c49a'; ctx.lineWidth = r * 0.17; ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const t = 0.3 + i * 0.25, px = M.lerp(ox, ox + r * 0.35, t) - r * 0.35 * Math.sin(t * 3), py = M.lerp(oy, oy - r * 2.1, t);
          ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - r * (0.5 + i * 0.12), py - r * (0.45 + i * 0.1)); ctx.stroke();
          ctx.strokeStyle = '#e4d2ac'; ctx.lineWidth = r * 0.11; ctx.stroke();
        }
        ctx.restore();
      }
    }
    if (c.ears === 'pointed' || c.ears === 'round' || c.ears === 'long') {
      for (const s of [-1, 1]) {
        const ex = cx - r * (s < 0 ? 0.65 : 0.3), ey = cy - r * 0.68, sc = s < 0 ? 0.85 : 1;
        if (c.ears === 'round') { circ(ctx, ex, ey - r * 0.16, r * 0.34 * sc); paint(ctx, s < 0 ? dk(base, 0.2) : base, ex - r * 0.35, ey - r * 0.5, r * 0.7, r * 0.7, { light: 0.3, dark: 0.4, lw: 0.6 }); ctx.fillStyle = al('#d8a0a0', 0.55); circ(ctx, ex, ey - r * 0.14, r * 0.16 * sc); ctx.fill(); }
        else if (c.ears === 'long') { ell(ctx, ex, ey - r * 0.4, r * 0.16 * sc, r * 0.46 * sc, s * 0.25); paint(ctx, s < 0 ? dk(base, 0.2) : base, ex - r * 0.3, ey - r, r * 0.6, r * 1.1, { light: 0.3, dark: 0.4, lw: 0.6 }); }
        else { poly(ctx, [[ex - r * 0.3 * sc, ey + r * 0.1], [ex + r * 0.05, ey - r * 0.78 * sc], [ex + r * 0.34 * sc, ey + r * 0.12]]); paint(ctx, s < 0 ? dk(base, 0.2) : base, ex - r * 0.3, ey - r * 0.8, r * 0.7, r * 0.95, { light: 0.3, dark: 0.4, lw: 0.6 }); ctx.fillStyle = al('#d8a0a0', 0.5); poly(ctx, [[ex - r * 0.13, ey + r * 0.05], [ex + r * 0.04, ey - r * 0.5], [ex + r * 0.2, ey + r * 0.07]]); ctx.fill(); }
      }
    }
    if (c.mane) {
      // ruff / mane ring behind the head
      const mr = r * (c.head === 'feline' ? 1.55 : 1.05);
      if (c.head === 'feline') { circ(ctx, cx - r * 0.2, cy + r * 0.05, mr); paint(ctx, dk(base, 0.35), cx - mr, cy - mr, mr * 2, mr * 2, { light: 0.25, dark: 0.45, lw: 0.8 });
        ctx.strokeStyle = al(dk(base, 0.55), 0.5); ctx.lineWidth = 0.6; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ctx.beginPath(); ctx.moveTo(cx - r * 0.2 + Math.cos(a) * mr * 0.55, cy + r * 0.05 + Math.sin(a) * mr * 0.55); ctx.lineTo(cx - r * 0.2 + Math.cos(a) * mr * 0.97, cy + r * 0.05 + Math.sin(a) * mr * 0.97); ctx.stroke(); } }
    }
    // ---- skull + muzzle by kind
    const nose = { x: cx + r * 1.15, y: cy + r * 0.28 };
    if (kind === 'canine' || kind === 'feline' || kind === 'ursine') {
      const ml = kind === 'canine' ? 1.0 : kind === 'feline' ? 0.55 : 0.7, mw = kind === 'ursine' ? 0.52 : kind === 'feline' ? 0.5 : 0.42;
      ell(ctx, cx, cy, r * (kind === 'feline' ? 0.95 : 0.92), r * (kind === 'ursine' ? 0.9 : 0.82), 0.08);
      paint(ctx, base, cx - r, cy - r, r * 2, r * 2, { light: 0.35, dark: 0.42, lw });
      ell(ctx, cx + r * (0.55 + ml * 0.34), cy + r * 0.26, r * ml * 0.74, r * mw, 0.06);
      paint(ctx, lit, cx + r * 0.4, cy - r * 0.2, r * ml * 1.5, r * mw * 2, { light: 0.3, dark: 0.4, lw });
      nose.x = cx + r * (0.55 + ml * 1.02); nose.y = cy + r * 0.1;
      ctx.fillStyle = '#26191c'; ell(ctx, nose.x, nose.y, r * 0.15, r * 0.12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; circ(ctx, nose.x - r * 0.05, nose.y - r * 0.05, r * 0.04); ctx.fill();
      // mouth + teeth
      ctx.strokeStyle = al('#2a1c1c', 0.75); ctx.lineWidth = lw * 0.7;
      if (open) {
        ctx.beginPath(); ctx.moveTo(nose.x - r * 0.05, nose.y + r * 0.12); ctx.quadraticCurveTo(cx + r * 0.7, cy + r * 0.95, cx + r * 0.15, cy + r * 0.55); ctx.closePath();
        ctx.fillStyle = '#5a1f28'; ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f6f2e4'; for (let i = 0; i < 3; i++) { poly(ctx, [[nose.x - r * (0.12 + i * 0.22), nose.y + r * 0.16], [nose.x - r * (0.2 + i * 0.22), nose.y + r * 0.5], [nose.x - r * (0.26 + i * 0.22), nose.y + r * 0.16]]); ctx.fill(); }
      } else {
        ctx.beginPath(); ctx.moveTo(nose.x - r * 0.06, nose.y + r * 0.14); ctx.quadraticCurveTo(cx + r * 0.75, cy + r * 0.62, cx + r * 0.2, cy + r * 0.5); ctx.stroke();
      }
      if (c.fangs) { ctx.fillStyle = '#f8f4e6'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.4; for (const s of [0, 1]) { poly(ctx, [[nose.x - r * (0.18 + s * 0.26), nose.y + r * 0.16], [nose.x - r * (0.3 + s * 0.26), nose.y + r * 1.25], [nose.x - r * (0.38 + s * 0.26), nose.y + r * 0.14]]); ctx.fill(); ctx.stroke(); } }
      if (kind === 'feline') { ctx.strokeStyle = al('#f4f0e0', 0.55); ctx.lineWidth = 0.4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(nose.x - r * 0.15, nose.y + r * 0.05); ctx.lineTo(nose.x + r * 0.75, nose.y + i * r * 0.3 - r * 0.05); ctx.stroke(); } }
    } else if (kind === 'boar') {
      poly(ctx, [[cx - r * 0.9, cy - r * 0.85], [cx + r * 0.5, cy - r * 0.6], [cx + r * 1.35, cy + r * 0.1], [cx + r * 1.25, cy + r * 0.62], [cx - r * 0.5, cy + r * 0.95], [cx - r * 1.05, cy + r * 0.1]]);
      paint(ctx, base, cx - r, cy - r, r * 2.4, r * 2, { light: 0.32, dark: 0.45, lw });
      nose.x = cx + r * 1.25; nose.y = cy + r * 0.3;
      ell(ctx, nose.x, nose.y, r * 0.2, r * 0.26); paint(ctx, '#c08a80', nose.x - r * 0.2, nose.y - r * 0.26, r * 0.4, r * 0.52, { light: 0.3, dark: 0.4, lw: 0.6 });
      ctx.fillStyle = '#3a2024'; circ(ctx, nose.x - r * 0.02, nose.y - r * 0.08, r * 0.055); ctx.fill(); circ(ctx, nose.x - r * 0.02, nose.y + r * 0.1, r * 0.055); ctx.fill();
      ctx.fillStyle = '#efe8d2'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
      for (const s of [0, 1]) { ctx.beginPath(); ctx.moveTo(cx + r * (0.95 - s * 0.2), cy + r * (0.6 - s * 0.05)); ctx.quadraticCurveTo(cx + r * (1.5 - s * 0.2), cy + r * 0.3, cx + r * (1.3 - s * 0.2), cy - r * (0.55 + s * 0.15)); ctx.quadraticCurveTo(cx + r * (1.15 - s * 0.2), cy + r * 0.1, cx + r * (0.8 - s * 0.2), cy + r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    } else if (kind === 'cervine' || kind === 'equine') {
      ctx.beginPath(); ctx.moveTo(cx - r * 0.85, cy - r * 0.7); ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.95, cx + r * 1.25, cy + r * 0.05);
      ctx.quadraticCurveTo(cx + r * 1.5, cy + r * 0.45, cx + r * 1.0, cy + r * 0.62); ctx.quadraticCurveTo(cx - r * 0.2, cy + r * 0.85, cx - r * 0.9, cy + r * 0.35); ctx.closePath();
      paint(ctx, base, cx - r, cy - r, r * 2.4, r * 1.8, { light: 0.35, dark: 0.42, lw });
      nose.x = cx + r * 1.15; nose.y = cy + r * 0.32;
      ctx.fillStyle = al(dk(base, 0.6), 0.85); ell(ctx, nose.x, nose.y - r * 0.08, r * 0.1, r * 0.08, 0.3); ctx.fill();
      ctx.strokeStyle = al('#2a1c1c', 0.7); ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(cx + r * 1.1, cy + r * 0.5); ctx.quadraticCurveTo(cx + r * 0.75, cy + r * 0.62, cx + r * 0.5, cy + r * 0.55); ctx.stroke();
      if (c.horn) {
        const hx2 = cx + r * 0.45, hy2 = cy - r * 0.75;
        ctx.beginPath(); ctx.moveTo(hx2 - r * 0.16, hy2 + r * 0.12); ctx.quadraticCurveTo(hx2 + r * 0.45, hy2 - r * 0.9, hx2 + r * 1.25, hy2 - r * 2.1); ctx.quadraticCurveTo(hx2 + r * 0.25, hy2 - r * 0.75, hx2 + r * 0.2, hy2 + r * 0.16); ctx.closePath();
        paint(ctx, '#f4eede', hx2 - r * 0.2, hy2 - r * 2.1, r * 1.5, r * 2.3, { light: 0.5, dark: 0.35, lw: 0.6 });
        ctx.strokeStyle = al('#b8a890', 0.7); ctx.lineWidth = 0.5;
        for (let i = 1; i < 5; i++) { const t = i / 5; ctx.beginPath(); ctx.moveTo(M.lerp(hx2 - r * 0.16, hx2 + r * 1.25, t), M.lerp(hy2 + r * 0.12, hy2 - r * 2.1, t)); ctx.lineTo(M.lerp(hx2 + r * 0.2, hx2 + r * 1.25, t) + r * 0.1, M.lerp(hy2 + r * 0.16, hy2 - r * 2.1, t) + r * 0.1); ctx.stroke(); }
        glow(ctx, hx2 + r * 1.0, hy2 - r * 1.8, r * 0.9, l.glow || '#ffe9ff', 0.6);
      }
    } else if (kind === 'mammoth') {
      ell(ctx, cx, cy - r * 0.1, r * 1.0, r * 0.95);
      paint(ctx, base, cx - r, cy - r, r * 2, r * 2, { light: 0.32, dark: 0.45, lw });
      // trunk
      ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.52; ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy + r * 0.35); ctx.quadraticCurveTo(cx + r * 1.5, cy + r * 0.9, cx + r * 1.1, cy + r * 1.9); ctx.stroke();
      ctx.strokeStyle = base; ctx.lineWidth = r * 0.4; ctx.stroke();
      ctx.strokeStyle = al(dk(base, 0.5), 0.5); ctx.lineWidth = 0.6;
      for (let i = 1; i < 5; i++) { const t = i / 5; ctx.beginPath(); ctx.moveTo(cx + r * (0.5 + t * 0.75), cy + r * (0.35 + t * 1.2)); ctx.lineTo(cx + r * (0.72 + t * 0.6), cy + r * (0.2 + t * 1.3)); ctx.stroke(); }
      // tusks
      ctx.fillStyle = '#f2ecda'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
      for (const s of [0, 1]) { ctx.beginPath(); ctx.moveTo(cx + r * (0.5 - s * 0.25), cy + r * (0.6 + s * 0.1)); ctx.quadraticCurveTo(cx + r * (1.9 - s * 0.2), cy + r * (1.2 - s * 0.1), cx + r * (1.75 - s * 0.2), cy - r * (0.35 + s * 0.1)); ctx.quadraticCurveTo(cx + r * (1.5 - s * 0.2), cy + r * 0.85, cx + r * (0.35 - s * 0.25), cy + r * (0.95 + s * 0.05)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      nose.x = cx + r * 0.6; nose.y = cy - r * 0.15;
    } else if (kind === 'croc') {
      ctx.beginPath(); ctx.moveTo(cx - r * 0.85, cy - r * 0.6); ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 0.72, cx + r * 2.1, cy - r * 0.2);
      ctx.quadraticCurveTo(cx + r * 2.35, cy + r * 0.12, cx + r * 2.0, cy + r * 0.34); ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.75, cx - r * 0.85, cy + r * 0.5); ctx.closePath();
      paint(ctx, base, cx - r, cy - r * 0.8, r * 3.2, r * 1.6, { light: 0.32, dark: 0.45, lw });
      ctx.strokeStyle = al('#1c1a12', 0.7); ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(cx + r * 2.05, cy + r * 0.16); ctx.quadraticCurveTo(cx + r * 0.6, cy + r * 0.42, cx - r * 0.6, cy + r * 0.2); ctx.stroke();
      ctx.fillStyle = '#f2ecd8'; for (let i = 0; i < 6; i++) { const x = cx + r * (0.2 + i * 0.32); poly(ctx, [[x, cy + r * 0.22], [x + r * 0.11, cy + r * 0.22], [x + r * 0.05, cy + r * (0.52 - i * 0.02)]]); ctx.fill(); }
      ctx.fillStyle = al(dk(base, 0.4), 0.6); for (let i = 0; i < 5; i++) { poly(ctx, [[cx + r * (0.1 + i * 0.35), cy - r * 0.45], [cx + r * (0.25 + i * 0.35), cy - r * 0.78], [cx + r * (0.4 + i * 0.35), cy - r * 0.42]]); ctx.fill(); }
      if (c.crest) { ctx.fillStyle = l.glow || '#e8c84a'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.5; for (let i = 0; i < 3; i++) { poly(ctx, [[cx - r * (0.2 + i * 0.35), cy - r * 0.5], [cx - r * (0.35 + i * 0.35), cy - r * (1.2 + i * 0.1)], [cx - r * (0.55 + i * 0.35), cy - r * 0.45]]); ctx.fill(); ctx.stroke(); } }
      nose.x = cx + r * 1.9; nose.y = cy - r * 0.1;
    } else { // avian (eagle / raptor)
      ell(ctx, cx, cy, r * 0.95, r * 0.88);
      paint(ctx, lt(base, 0.45), cx - r, cy - r, r * 2, r * 2, { light: 0.35, dark: 0.4, lw });
      ctx.fillStyle = al(dk(base, 0.25), 0.4); for (let i = 0; i < 5; i++) { ell(ctx, cx - r * 0.5 + (i % 3) * r * 0.42, cy - r * 0.35 + ((i / 3) | 0) * r * 0.45, r * 0.22, r * 0.1, -0.3); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(cx + r * 0.42, cy - r * 0.3); ctx.quadraticCurveTo(cx + r * 1.55, cy - r * 0.18, cx + r * 1.5, cy + r * 0.5);
      ctx.quadraticCurveTo(cx + r * 1.05, cy + r * 0.32, cx + r * 0.45, cy + r * 0.38); ctx.closePath();
      paint(ctx, '#e8b43c', cx + r * 0.4, cy - r * 0.35, r * 1.2, r * 0.9, { light: 0.4, dark: 0.4, lw });
      ctx.strokeStyle = al('#5a3a10', 0.7); ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy + r * 0.18); ctx.quadraticCurveTo(cx + r * 1.1, cy + r * 0.18, cx + r * 1.4, cy + r * 0.3); ctx.stroke();
      nose.x = cx + r * 0.8; nose.y = cy - r * 0.1;
    }
    // ---- eye
    const ex2 = cx + r * (kind === 'croc' ? 0.35 : kind === 'boar' ? 0.35 : kind === 'mammoth' ? 0.45 : 0.42), ey2 = cy - r * (kind === 'croc' ? 0.42 : 0.24);
    const er = r * (kind === 'avian' ? 0.2 : kind === 'mammoth' || kind === 'boar' ? 0.12 : 0.16);
    if (l.glow || (l.body === 'undead')) { glow(ctx, ex2, ey2, er * 3, eye, 0.9); ctx.fillStyle = lt(eye, 0.6); circ(ctx, ex2, ey2, er * 0.8); ctx.fill(); }
    else {
      ctx.fillStyle = kind === 'avian' ? '#f6e9c8' : lt(eye, 0.35); ell(ctx, ex2, ey2, er, er * 0.85); ctx.fill();
      ctx.fillStyle = '#12101a'; ell(ctx, ex2 + er * 0.18, ey2, er * (kind === 'feline' || kind === 'croc' ? 0.3 : 0.45), er * 0.62); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; circ(ctx, ex2 - er * 0.2, ey2 - er * 0.25, er * 0.2); ctx.fill();
      ctx.strokeStyle = al(dk(base, 0.6), 0.6); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(ex2 - er * 1.1, ey2 - er * 0.7); ctx.quadraticCurveTo(ex2, ey2 - er * 1.4, ex2 + er * 1.1, ey2 - er * 0.6); ctx.stroke();
    }
    if (hero) { ctx.strokeStyle = al(METAL.gold, 0.7); ctx.lineWidth = 0.7; ell(ctx, cx + r * 0.1, cy - r * 0.55, r * 0.75, r * 0.2, -0.12); ctx.stroke(); }
    return nose;
  }

  /** shared four-legged body used by beasts and mounts. returns saddle point {x,y} */
  function drawQuadruped(ctx, l, pose, H, c, o) {
    o = o || {};
    const base = o.color || l.tint || c.fur, BL = H * c.len;
    const belly = -H * c.sh, back = belly - H * c.bt;
    const lw2 = H * c.lw, stride = pose.stride, hop = pose.bob * 0.35;
    const frontX = BL * 0.3, rearX = -BL * 0.32;
    const sprawl = c.sprawl ? 0.55 : 1;
    const fFoot = c.hooves ? 'hoof' : c.talons ? 'talon' : 'paw';
    const sw2 = H * 0.13 * stride;
    ctx.save();
    ctx.translate(pose.lunge * 0.5, -hop);
    // ---- tail (behind)
    const tx = -BL * 0.5, ty = back + H * c.bt * 0.25, sway = pose.capeSway * H * 0.02;
    if (c.tail === 'flow') {
      ctx.beginPath(); ctx.moveTo(tx + H * 0.02, ty - H * 0.02); ctx.quadraticCurveTo(tx - H * 0.14, ty + H * 0.1, tx - H * 0.1 + sway, ty + H * 0.42);
      ctx.quadraticCurveTo(tx + H * 0.03, ty + H * 0.18, tx + H * 0.05, ty + H * 0.02); ctx.closePath();
      paint(ctx, o.mane || dk(base, 0.25), tx - H * 0.16, ty - H * 0.05, H * 0.24, H * 0.5, { light: 0.35, dark: 0.45, lw: 0.7 });
    } else if (c.tail === 'bush' || c.tail === 'tuft') {
      const tipX = tx - H * 0.24 + sway, tipY = ty - H * (c.tail === 'bush' ? 0.1 : 0.02) + sway * 0.5;
      ctx.strokeStyle = OUT; ctx.lineWidth = H * (c.tail === 'bush' ? 0.095 : 0.04);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - H * 0.16, ty + H * 0.02, tipX, tipY); ctx.stroke();
      ctx.strokeStyle = base; ctx.lineWidth = H * (c.tail === 'bush' ? 0.075 : 0.026); ctx.stroke();
      if (c.tail === 'tuft') { ell(ctx, tipX - H * 0.01, tipY, H * 0.045, H * 0.03, -0.4); paint(ctx, dk(base, 0.3), tipX - H * 0.05, tipY - H * 0.04, H * 0.1, H * 0.08, { light: 0.3, dark: 0.4, lw: 0.6 }); }
    } else if (c.tail === 'croc') {
      ctx.beginPath(); ctx.moveTo(tx + H * 0.06, back + H * 0.02); ctx.quadraticCurveTo(tx - H * 0.3, back + H * 0.02 + sway, tx - H * 0.62 + sway, belly - H * 0.02);
      ctx.quadraticCurveTo(tx - H * 0.28, belly + H * 0.04, tx + H * 0.06, belly); ctx.closePath();
      paint(ctx, base, tx - H * 0.62, back, H * 0.7, H * c.bt, { light: 0.3, dark: 0.45, lw: 0.8 });
      ctx.fillStyle = al(dk(base, 0.45), 0.6); for (let i = 0; i < 5; i++) { const t = i / 5; poly(ctx, [[M.lerp(tx, tx - H * 0.6, t), M.lerp(back + H * 0.02, belly - H * 0.02, t * 0.7)], [M.lerp(tx, tx - H * 0.6, t) + H * 0.02, M.lerp(back - H * 0.05, belly - H * 0.05, t * 0.7)], [M.lerp(tx, tx - H * 0.6, t) + H * 0.05, M.lerp(back + H * 0.02, belly - H * 0.02, t * 0.7)]]); ctx.fill(); }
    } else if (c.tail === 'thin') { limb(ctx, [[tx, ty], [tx - H * 0.1, ty + H * 0.06 + sway], [tx - H * 0.14 + sway, ty + H * 0.16]], H * 0.018, base, { noHi: true }); }
    else { ell(ctx, tx - H * 0.02, ty - H * 0.01, H * 0.04, H * 0.035); paint(ctx, base, tx - H * 0.06, ty - H * 0.05, H * 0.12, H * 0.1, { light: 0.3, dark: 0.4, lw: 0.6 }); }
    // ---- far legs
    const farC = dk(base, 0.3);
    quadLeg(ctx, rearX - H * 0.02, belly + H * 0.01, rearX - H * 0.02 + sw2 * sprawl - H * 0.04, 0, lw2 * 0.92, farC, -1, fFoot);
    quadLeg(ctx, frontX - H * 0.02, belly, frontX - H * 0.02 - sw2 * sprawl - H * 0.03, 0, lw2 * 0.92, farC, 1, fFoot);
    // ---- body
    const humpY = back - H * c.bt * 0.28 * (c.hump || 0);
    blob(ctx, [[rearX - BL * 0.2, back + H * 0.03], [rearX, back - H * 0.01], [0, back + H * 0.01], [frontX, humpY], [frontX + BL * 0.18, back + H * 0.05],
      [frontX + BL * 0.16, belly - H * 0.02], [frontX * 0.4, belly + H * 0.01], [rearX * 0.5, belly + H * 0.005], [rearX - BL * 0.15, belly - H * 0.03]]);
    paint(ctx, base, rearX - BL * 0.2, humpY, BL, belly - humpY, { light: 0.34, dark: 0.45, lw: 0.9 });
    ctx.save();
    blob(ctx, [[rearX - BL * 0.2, back + H * 0.03], [rearX, back - H * 0.01], [0, back + H * 0.01], [frontX, humpY], [frontX + BL * 0.18, back + H * 0.05],
      [frontX + BL * 0.16, belly - H * 0.02], [frontX * 0.4, belly + H * 0.01], [rearX * 0.5, belly + H * 0.005], [rearX - BL * 0.15, belly - H * 0.03]]);
    ctx.clip();
    // belly shade + back rim light
    ctx.fillStyle = Art.grad(ctx, 0, humpY, 0, belly + H * 0.02, [[0, 'rgba(255,246,214,0.28)'], [0.45, 'rgba(255,246,214,0)'], [1, 'rgba(16,18,54,0.42)']]);
    ctx.fillRect(rearX - BL, humpY - H * 0.1, BL * 2.2, belly - humpY + H * 0.2);
    if (c.stripes) { ctx.strokeStyle = al(dk(base, 0.6), 0.5); ctx.lineWidth = H * 0.022; for (let i = 0; i < 6; i++) { const x = rearX + i * BL * 0.16; ctx.beginPath(); ctx.moveTo(x, back); ctx.quadraticCurveTo(x - H * 0.03, (back + belly) / 2, x - H * 0.01, belly - H * 0.05); ctx.stroke(); } }
    if (c.scutes) { ctx.fillStyle = al(dk(base, 0.4), 0.55); for (let i = 0; i < 7; i++) { const x = rearX + i * BL * 0.13; poly(ctx, [[x, back + H * 0.04], [x + H * 0.03, back - H * 0.03], [x + H * 0.06, back + H * 0.04]]); ctx.fill(); } }
    if (c.shaggy) { ctx.strokeStyle = al(dk(base, 0.45), 0.5); ctx.lineWidth = 0.7; for (let i = 0; i < 12; i++) { const x = rearX - BL * 0.15 + i * BL * 0.11; ctx.beginPath(); ctx.moveTo(x, belly - H * 0.12); ctx.lineTo(x - H * 0.02, belly + H * 0.04); ctx.stroke(); } }
    if (c.bristles) { ctx.strokeStyle = dk(base, 0.5); ctx.lineWidth = 0.7; for (let i = 0; i < 9; i++) { const x = rearX + i * BL * 0.1; ctx.beginPath(); ctx.moveTo(x, back + H * 0.02); ctx.lineTo(x - H * 0.015, back - H * 0.07); ctx.stroke(); } }
    // shoulder + haunch muscle masses and a belly highlight
    ctx.fillStyle = al(lt(base, 0.2), 0.45); ell(ctx, rearX + BL * 0.04, belly - H * c.bt * 0.5, BL * 0.19, H * c.bt * 0.52, -0.1); ctx.fill();
    ctx.fillStyle = al(lt(base, 0.14), 0.4); ell(ctx, frontX - BL * 0.02, belly - H * c.bt * 0.52, BL * 0.15, H * c.bt * 0.46, 0.1); ctx.fill();
    ctx.fillStyle = al(dk(base, 0.4), 0.3); ell(ctx, 0, belly - H * 0.01, BL * 0.3, H * c.bt * 0.28, 0); ctx.fill();
    ctx.fillStyle = al(lt(base, 0.5), 0.3); ell(ctx, frontX * 0.2, back + H * 0.035, BL * 0.3, H * 0.035, -0.04); ctx.fill();
    ctx.restore();
    if (c.shaggy) { // shaggy fringe outside the silhouette
      ctx.strokeStyle = dk(base, 0.2); ctx.lineWidth = H * 0.018;
      for (let i = 0; i < 9; i++) { const x = rearX - BL * 0.12 + i * BL * 0.11; ctx.beginPath(); ctx.moveTo(x, belly - H * 0.03); ctx.lineTo(x - H * 0.02, belly + H * 0.07); ctx.stroke(); }
    }
    // ---- near legs
    quadLeg(ctx, rearX + H * 0.02, belly + H * 0.01, rearX + H * 0.02 - sw2 * sprawl + H * 0.04, 0, lw2, base, -1, fFoot);
    quadLeg(ctx, frontX + H * 0.02, belly, frontX + H * 0.02 + sw2 * sprawl + H * 0.04, 0, lw2, base, 1, fFoot);
    // ---- neck + head
    const hxp = BL * 0.5 + H * c.hx, hyp = back - H * c.hy, hr2 = H * c.hr;
    const nx0 = frontX + BL * 0.08, ny0 = humpY + H * 0.02;
    const nw = H * (c.head === 'croc' ? 0.1 : c.head === 'mammoth' ? 0.2 : 0.11);
    ctx.beginPath();
    ctx.moveTo(nx0 - nw * 0.4, ny0);
    ctx.quadraticCurveTo(M.lerp(nx0, hxp, 0.55) - nw * 0.5, M.lerp(ny0, hyp, 0.6), hxp - hr2 * 0.5, hyp + hr2 * 0.25);
    ctx.lineTo(hxp - hr2 * 0.1, hyp + hr2 * 0.85);
    ctx.quadraticCurveTo(M.lerp(nx0, hxp, 0.45) + nw * 0.35, M.lerp(ny0, hyp, 0.35) + nw * 0.6, nx0 + nw * 0.7, ny0 + nw * 0.9);
    ctx.closePath();
    paint(ctx, base, nx0 - nw, hyp, hxp - nx0 + nw, ny0 - hyp + nw, { light: 0.34, dark: 0.45, lw: 0.9 });
    if (c.mane && c.head !== 'feline') {
      ctx.beginPath(); ctx.moveTo(nx0 - nw * 0.5, ny0 - H * 0.01);
      ctx.quadraticCurveTo(M.lerp(nx0, hxp, 0.5) - nw * 1.2 - sway, M.lerp(ny0, hyp, 0.5) - H * 0.04, hxp - hr2 * 0.55, hyp - hr2 * 0.45);
      ctx.quadraticCurveTo(M.lerp(nx0, hxp, 0.55) - nw * 0.3, M.lerp(ny0, hyp, 0.55), nx0 + nw * 0.6, ny0 + H * 0.01); ctx.closePath();
      paint(ctx, o.mane || dk(base, 0.3), nx0 - nw, hyp - hr2, hxp - nx0, ny0 - hyp, { light: 0.35, dark: 0.45, lw: 0.7 });
    }
    beastHead(ctx, l, c, hxp, hyp, hr2, base, pose, o.hero);
    if (c.wings) drawBeastWings(ctx, l, H, frontX - BL * 0.05, humpY - H * 0.01, pose, o.wingColor || lt(base, 0.35));
    if (l.glow && !c.horn) glow(ctx, 0, (back + belly) / 2, BL * 0.55, l.glow, 0.3);
    if (l.element && !c.horn) { const ec = ELEMENT[l.element]; glow(ctx, hxp + hr2, hyp + hr2 * 0.3, H * 0.16, ec, 0.4); }
    ctx.restore();
    return { x: frontX * 0.1 + pose.lunge * 0.5, y: humpY + H * 0.015 - hop };
  }

  /** feathered wings for griffons / winged mounts, anchored at (ax,ay) */
  function drawBeastWings(ctx, l, H, ax, ay, pose, col) {
    const flap = (pose.wingT || 0) * 0.22 + (pose.anim === 'walk' ? 0.1 : 0);
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(ax, ay);
      const span = H * (side > 0 ? 0.78 : 0.62);
      ctx.rotate(-1.05 + flap * side * 0.8 + (side > 0 ? 0 : 0.28));
      const base = side > 0 ? col : dk(col, 0.22);
      for (let i = 3; i >= 0; i--) {
        const a = -0.5 + i * 0.3, len = span * (1.05 - i * 0.17);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a - 0.5) * len * 0.6, Math.sin(a - 0.5) * len * 0.6, Math.cos(a) * len, Math.sin(a) * len);
        ctx.quadraticCurveTo(Math.cos(a + 0.35) * len * 0.55, Math.sin(a + 0.35) * len * 0.55, span * 0.05, span * 0.1); ctx.closePath();
        paint(ctx, i % 2 ? dk(base, 0.12) : base, -span * 0.2, -span * 0.6, span * 1.2, span * 1.2, { light: 0.28, dark: 0.38, lw: 0.6 });
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- spiders, serpents, hydras
  function drawSpider(ctx, l, pose, H) {
    const base = l.tint || '#3a2c38', dark = dk(base, 0.35), eye = l.eyes || '#d84a4a';
    const bodyY = -H * 0.32, abX = -H * 0.34, cX = H * 0.16;
    const step = pose.stride * 0.35, bob = pose.bob * 0.3;
    ctx.save(); ctx.translate(pose.lunge * 0.4, -bob);
    // legs: 4 per side, far side darker
    for (const side of [0, 1]) {
      const col = side ? base : dark, lwid = H * (side ? 0.032 : 0.028), yoff = side ? 0 : -H * 0.015;
      for (let i = 0; i < 4; i++) {
        const dir = i < 2 ? 1 : -1, t = i % 2;
        const kx = cX + dir * H * (0.3 + t * 0.2) + step * H * (side ? 0.06 : -0.06) * dir;
        const ky = bodyY - H * (0.34 - t * 0.06) - (side ? 0 : H * 0.02);
        const fx = cX + dir * H * (0.55 + t * 0.34) + step * H * (side ? 0.1 : -0.1) * dir;
        ctx.strokeStyle = OUT; ctx.lineWidth = lwid + 1.2;
        ctx.beginPath(); ctx.moveTo(cX + dir * H * 0.06, bodyY + yoff); ctx.lineTo(kx, ky); ctx.lineTo(fx, -H * 0.005); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = lwid; ctx.stroke();
        ctx.strokeStyle = al(lt(col, 0.4), 0.5); ctx.lineWidth = lwid * 0.3; ctx.beginPath(); ctx.moveTo(cX + dir * H * 0.06, bodyY + yoff - lwid * 0.3); ctx.lineTo(kx, ky - lwid * 0.3); ctx.stroke();
        ctx.fillStyle = dk(col, 0.3); circ(ctx, kx, ky, lwid * 0.62); ctx.fill();
      }
      if (!side) { // abdomen + thorax between leg passes
        ell(ctx, abX, bodyY + H * 0.03, H * 0.3, H * 0.24, -0.16);
        paint(ctx, base, abX - H * 0.3, bodyY - H * 0.22, H * 0.6, H * 0.5, { light: 0.3, dark: 0.5, lw: 0.9 });
        ctx.save(); ell(ctx, abX, bodyY + H * 0.03, H * 0.3, H * 0.24, -0.16); ctx.clip();
        ctx.fillStyle = al(l.glow || '#e8d84a', 0.6);
        for (let i = 0; i < 3; i++) { poly(ctx, [[abX - H * 0.12 + i * H * 0.1, bodyY - H * 0.1], [abX - H * 0.05 + i * H * 0.1, bodyY + H * 0.04], [abX - H * 0.19 + i * H * 0.1, bodyY + H * 0.04]]); ctx.fill(); }
        ctx.fillStyle = Art.rgrad(ctx, abX - H * 0.1, bodyY - H * 0.1, 0, H * 0.4, [[0, 'rgba(255,246,214,0.3)'], [0.5, 'rgba(255,246,214,0)'], [1, 'rgba(12,10,40,0.5)']]); ctx.fillRect(abX - H * 0.4, bodyY - H * 0.3, H * 0.8, H * 0.6); ctx.restore();
        ell(ctx, cX - H * 0.06, bodyY + H * 0.02, H * 0.18, H * 0.15, 0.1);
        paint(ctx, dk(base, 0.1), cX - H * 0.24, bodyY - H * 0.13, H * 0.36, H * 0.3, { light: 0.3, dark: 0.45, lw: 0.8 });
      }
    }
    // head + fangs + eyes
    ell(ctx, cX + H * 0.12, bodyY + H * 0.05, H * 0.13, H * 0.11, 0.1);
    paint(ctx, lt(base, 0.1), cX, bodyY - H * 0.06, H * 0.26, H * 0.22, { light: 0.3, dark: 0.45, lw: 0.8 });
    ctx.fillStyle = dk(base, 0.5); ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
    for (const s of [-1, 1]) { poly(ctx, [[cX + H * 0.16, bodyY + H * 0.1 + s * H * 0.02], [cX + H * 0.28, bodyY + H * (pose.anim === 'attack' ? 0.2 : 0.16) + s * H * 0.04], [cX + H * 0.17, bodyY + H * 0.14 + s * H * 0.02]]); ctx.fill(); ctx.stroke(); }
    for (let i = 0; i < 4; i++) {
      const ex2 = cX + H * (0.14 + (i % 2) * 0.07), ey2 = bodyY - H * (0.0 + ((i / 2) | 0) * 0.05), er = H * (i < 2 ? 0.024 : 0.016);
      glow(ctx, ex2, ey2, er * 3, eye, 0.7); ctx.fillStyle = lt(eye, 0.4); circ(ctx, ex2, ey2, er); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circ(ctx, ex2 - er * 0.25, ey2 - er * 0.3, er * 0.3); ctx.fill();
    }
    ctx.restore();
  }
  function drawSerpent(ctx, l, pose, H, heads) {
    const base = l.tint || '#4e8a5a', belly2 = lt(base, 0.5), eye = l.eyes || '#e8c020';
    const sway = (pose.capeSway || 0) * H * 0.03 + (pose.stride || 0) * H * 0.04;
    ctx.save(); ctx.translate(pose.lunge * 0.3, -pose.bob * 0.3);
    // coiled base
    ell(ctx, -H * 0.1, -H * 0.1, H * 0.5, H * 0.13, -0.05);
    paint(ctx, dk(base, 0.2), -H * 0.6, -H * 0.24, H * 1.0, H * 0.26, { light: 0.3, dark: 0.45, lw: 0.9 });
    ell(ctx, -H * 0.02, -H * 0.24, H * 0.38, H * 0.11, 0.04);
    paint(ctx, base, -H * 0.4, -H * 0.36, H * 0.78, H * 0.24, { light: 0.34, dark: 0.45, lw: 0.9 });
    ctx.fillStyle = al(belly2, 0.5); ell(ctx, -H * 0.02, -H * 0.2, H * 0.3, H * 0.045); ctx.fill();
    const n = heads || 1;
    for (let hIdx = 0; hIdx < n; hIdx++) {
      const spread = n > 1 ? (hIdx - (n - 1) / 2) : 0;
      const hxp = H * (0.2 + Math.abs(spread) * -0.05) + spread * H * 0.02, hyp = -H * (0.75 + (n > 1 ? 0.1 * (1 - Math.abs(spread) * 0.4) : 0)) - Math.abs(spread) * H * 0.02;
      const nw = H * (n > 1 ? 0.07 : 0.1);
      const bx = -H * 0.04 + spread * H * 0.16, by = -H * 0.3;
      ctx.beginPath();
      ctx.moveTo(bx - nw, by);
      ctx.quadraticCurveTo(bx - nw * 1.4 + sway, (by + hyp) / 2, hxp - nw * 0.9, hyp + nw * 0.4);
      ctx.lineTo(hxp - nw * 0.2, hyp + nw * 1.2);
      ctx.quadraticCurveTo(bx + nw * 1.6 + sway, (by + hyp) / 2 + nw, bx + nw, by); ctx.closePath();
      paint(ctx, hIdx === (n - 1) / 2 || n === 1 ? base : dk(base, 0.15), bx - nw * 1.5, hyp, H * 0.4, by - hyp, { light: 0.34, dark: 0.45, lw: 0.9 });
      // head
      const hr2 = H * (n > 1 ? 0.1 : 0.14);
      ctx.beginPath(); ctx.moveTo(hxp - hr2 * 0.9, hyp - hr2 * 0.45); ctx.quadraticCurveTo(hxp + hr2 * 0.4, hyp - hr2 * 0.8, hxp + hr2 * 1.5, hyp - hr2 * 0.05);
      ctx.quadraticCurveTo(hxp + hr2 * 1.7, hyp + hr2 * 0.35, hxp + hr2 * 1.2, hyp + hr2 * 0.55);
      ctx.quadraticCurveTo(hxp, hyp + hr2 * 0.9, hxp - hr2 * 0.95, hyp + hr2 * 0.5); ctx.closePath();
      paint(ctx, base, hxp - hr2, hyp - hr2, hr2 * 2.8, hr2 * 1.8, { light: 0.35, dark: 0.42, lw: 0.9 });
      // hood (single-headed) / frill
      if (n === 1) {
        ctx.save(); ctx.globalAlpha *= 0.92;
        ctx.beginPath(); ctx.moveTo(hxp - hr2 * 0.6, hyp + hr2 * 0.3); ctx.quadraticCurveTo(hxp - hr2 * 2.4, hyp + hr2 * 0.1, hxp - hr2 * 1.6, hyp + hr2 * 1.9);
        ctx.quadraticCurveTo(hxp - hr2 * 0.3, hyp + hr2 * 1.5, hxp + hr2 * 0.5, hyp + hr2 * 0.8); ctx.closePath();
        paint(ctx, dk(base, 0.18), hxp - hr2 * 2.4, hyp, hr2 * 3, hr2 * 2, { light: 0.3, dark: 0.45, lw: 0.8 }); ctx.restore();
      }
      // eye + tongue/fangs
      glow(ctx, hxp + hr2 * 0.55, hyp - hr2 * 0.15, hr2 * 0.6, eye, 0.5);
      ctx.fillStyle = lt(eye, 0.3); ell(ctx, hxp + hr2 * 0.55, hyp - hr2 * 0.15, hr2 * 0.26, hr2 * 0.2); ctx.fill();
      ctx.fillStyle = '#12101a'; ell(ctx, hxp + hr2 * 0.58, hyp - hr2 * 0.15, hr2 * 0.07, hr2 * 0.17); ctx.fill();
      if (pose.anim === 'attack') {
        ctx.fillStyle = '#f6f2e4'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.4;
        for (const s of [0, 1]) { poly(ctx, [[hxp + hr2 * (1.05 - s * 0.3), hyp + hr2 * 0.4], [hxp + hr2 * (0.95 - s * 0.3), hyp + hr2 * 1.15], [hxp + hr2 * (0.82 - s * 0.3), hyp + hr2 * 0.4]]); ctx.fill(); ctx.stroke(); }
      } else { ctx.strokeStyle = '#d8365a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(hxp + hr2 * 1.3, hyp + hr2 * 0.3); ctx.lineTo(hxp + hr2 * 2.0, hyp + hr2 * 0.5); ctx.moveTo(hxp + hr2 * 1.75, hyp + hr2 * 0.42); ctx.lineTo(hxp + hr2 * 2.1, hyp + hr2 * 0.2); ctx.stroke(); }
      ctx.fillStyle = al(dk(base, 0.5), 0.45); for (let i = 0; i < 3; i++) { circ(ctx, hxp - hr2 * (0.2 + i * 0.3), hyp - hr2 * 0.45, hr2 * 0.1); ctx.fill(); }
    }
    if (l.glow) glow(ctx, 0, -H * 0.3, H * 0.5, l.glow, 0.3);
    ctx.restore();
  }

  function drawBeast(ctx, l, pose, H) {
    const b = l.body;
    if (b === 'beast_spider') return drawSpider(ctx, l, pose, H);
    if (b === 'beast_serpent') return drawSerpent(ctx, l, pose, H, 1);
    if (b === 'beast_hydra') return drawSerpent(ctx, l, pose, H, 3);
    const c = QUAD[b] || QUAD.beast_wolf;
    drawQuadruped(ctx, l, pose, H, c, { mane: c.mane ? dk(l.tint || c.fur, 0.3) : null });
  }

  // ---------------------------------------------------------------- mounted rigs
  const MOUNT_OF = { horse_rider: 'horse', wolf_rider: 'dire_wolf', boar_rider: 'war_boar' };
  function drawMounted(ctx, l, pose, H, hero) {
    const kind = MOUNT_OF[l.body] || 'horse';
    const c = QUAD[kind];
    const mountLook = { tint: l.mountColor || null, eyes: kind === 'horse' ? '#3a2a1a' : '#e8b428', glow: null, body: l.body, seed: l.seed };
    const mPose = Object.assign({}, pose, { lunge: pose.lunge * 0.6 });
    const saddle = drawQuadruped(ctx, mountLook, mPose, H * 1.02, c, { mane: kind === 'horse' ? '#2e2018' : dk(c.fur, 0.35), hero: hero });
    // saddle blanket in player colours
    const cloth = clothColor(l), trim = l.cloth2 || lt(cloth, 0.55);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(saddle.x - H * 0.19, saddle.y + H * 0.02); ctx.lineTo(saddle.x + H * 0.17, saddle.y + H * 0.01);
    ctx.lineTo(saddle.x + H * 0.15, saddle.y + H * 0.2); ctx.lineTo(saddle.x - H * 0.04, saddle.y + H * 0.26); ctx.lineTo(saddle.x - H * 0.22, saddle.y + H * 0.17); ctx.closePath();
    paint(ctx, cloth, saddle.x - H * 0.22, saddle.y, H * 0.4, H * 0.26, { light: 0.32, dark: 0.45, lw: 0.7 });
    ctx.strokeStyle = trim; ctx.lineWidth = H * 0.014; ctx.beginPath(); ctx.moveTo(saddle.x - H * 0.2, saddle.y + H * 0.15); ctx.lineTo(saddle.x - H * 0.03, saddle.y + H * 0.24); ctx.stroke();
    Art.rrect(ctx, saddle.x - H * 0.1, saddle.y - H * 0.035, H * 0.22, H * 0.055, H * 0.02);
    paint(ctx, '#5a3a20', saddle.x - H * 0.1, saddle.y - H * 0.035, H * 0.22, H * 0.055, { light: 0.32, dark: 0.45, lw: 0.6 });
    ctx.restore();
    // rider — translated so the hips land on the saddle
    const rH = H * 0.8, rm = humanMetrics(l, rH);
    ctx.save();
    ctx.translate(saddle.x + H * 0.03, saddle.y - rm.hipY - H * 0.02);
    // near thigh + stirrup foot over the flank (rider:true skips the walking legs)
    const legCol = l.armor === 'robe' ? clothColor(l) : (ARMOR_METAL[l.armor] && l.armor !== 'chain') ? metalColor(l, hero) : l.armor === 'leather' ? '#6a4a30' : dk(clothColor(l), 0.35);
    limb(ctx, [[rm.hw * 0.3, rm.hipY - rH * 0.02], [H * 0.13, rm.hipY + H * 0.06], [H * 0.09, rm.hipY + H * 0.2]], rH * 0.105, legCol, { shadeEnd: true });
    drawFoot(ctx, l, H * 0.09, rm.hipY + H * 0.22, rH * 0.085, true, hero, false, false, false);
    drawHumanoid(ctx, l, pose, rH, hero, { rider: true });
    ctx.restore();
  }

  /** a drake: small wyvern-like dragon, optionally ridden */
  function drawDrake(ctx, l, pose, H, hero) {
    const base = l.tint || (l.element ? dk(ELEMENT[l.element], 0.25) : '#6a8a4a');
    const belly2 = lt(base, 0.55), spine = dk(base, 0.4);
    const belly = -H * 0.5, back = belly - H * 0.26, BL = H * 1.15;
    ctx.save(); ctx.translate(pose.lunge * 0.4, -pose.bob * 0.4);
    // far wing
    drawDragonWing(ctx, l, H, -H * 0.14, back + H * 0.03, pose, dk(base, 0.3), 0.6, -1);
    // tail
    const tx = -BL * 0.46, sway = (pose.capeSway || 0) * H * 0.025;
    ctx.beginPath(); ctx.moveTo(tx + H * 0.08, back + H * 0.05); ctx.quadraticCurveTo(tx - H * 0.3 + sway, back, tx - H * 0.6 + sway * 2, back - H * 0.14);
    ctx.quadraticCurveTo(tx - H * 0.28, belly - H * 0.02, tx + H * 0.08, belly - H * 0.02); ctx.closePath();
    paint(ctx, base, tx - H * 0.6, back - H * 0.16, H * 0.7, H * 0.3, { light: 0.3, dark: 0.48, lw: 0.9 });
    poly(ctx, [[tx - H * 0.56 + sway * 2, back - H * 0.12], [tx - H * 0.78 + sway * 2.2, back - H * 0.3], [tx - H * 0.68 + sway * 2, back - H * 0.02], [tx - H * 0.8 + sway * 2.2, back + H * 0.08]]);
    paint(ctx, spine, tx - H * 0.8, back - H * 0.3, H * 0.25, H * 0.4, { light: 0.3, dark: 0.4, lw: 0.7 });
    // rear legs
    quadLeg(ctx, -BL * 0.18, belly + H * 0.02, -BL * 0.22 - pose.stride * H * 0.06, 0, H * 0.06, dk(base, 0.25), -1, 'talon');
    quadLeg(ctx, -BL * 0.14, belly + H * 0.02, -BL * 0.1 + pose.stride * H * 0.08, 0, H * 0.065, base, -1, 'talon');
    // body
    blob(ctx, [[-BL * 0.45, back + H * 0.06], [-BL * 0.1, back - H * 0.03], [BL * 0.22, back - H * 0.05], [BL * 0.42, back + H * 0.06],
      [BL * 0.36, belly - H * 0.02], [0, belly + H * 0.01], [-BL * 0.38, belly - H * 0.02]]);
    paint(ctx, base, -BL * 0.45, back - H * 0.05, BL * 0.9, belly - back + H * 0.06, { light: 0.34, dark: 0.48, lw: 0.9 });
    ctx.save();
    blob(ctx, [[-BL * 0.45, back + H * 0.06], [-BL * 0.1, back - H * 0.03], [BL * 0.22, back - H * 0.05], [BL * 0.42, back + H * 0.06],
      [BL * 0.36, belly - H * 0.02], [0, belly + H * 0.01], [-BL * 0.38, belly - H * 0.02]]); ctx.clip();
    ctx.fillStyle = al(belly2, 0.75); ell(ctx, 0, belly - H * 0.03, BL * 0.34, H * 0.08); ctx.fill();
    ctx.strokeStyle = al(dk(base, 0.5), 0.4); ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-BL * 0.3 + i * BL * 0.15, belly - H * 0.1); ctx.quadraticCurveTo(-BL * 0.28 + i * BL * 0.15, belly - H * 0.02, -BL * 0.34 + i * BL * 0.15, belly + H * 0.01); ctx.stroke(); }
    ctx.fillStyle = Art.grad(ctx, 0, back, 0, belly, [[0, 'rgba(255,246,214,0.28)'], [0.5, 'rgba(255,246,214,0)'], [1, 'rgba(14,16,50,0.45)']]); ctx.fillRect(-BL, back - H * 0.1, BL * 2, H * 0.6);
    ctx.restore();
    // dorsal spines
    ctx.fillStyle = spine; ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) { const x = -BL * 0.3 + i * BL * 0.16; poly(ctx, [[x, back + H * 0.01], [x + H * 0.03, back - H * 0.09], [x + H * 0.07, back + H * 0.01]]); ctx.fill(); ctx.stroke(); }
    // front legs
    quadLeg(ctx, BL * 0.28, belly, BL * 0.3 + pose.stride * H * 0.06, 0, H * 0.055, base, 1, 'talon');
    // neck + head
    const hxp = BL * 0.56, hyp = back - H * 0.3, hr2 = H * 0.15;
    ctx.beginPath(); ctx.moveTo(BL * 0.3, back); ctx.quadraticCurveTo(BL * 0.42, M.lerp(back, hyp, 0.5), hxp - hr2 * 0.6, hyp + hr2 * 0.2);
    ctx.lineTo(hxp - hr2 * 0.2, hyp + hr2 * 1.1); ctx.quadraticCurveTo(BL * 0.48, M.lerp(back, hyp, 0.35) + H * 0.06, BL * 0.38, back + H * 0.05); ctx.closePath();
    paint(ctx, base, BL * 0.3, hyp, BL * 0.3, back - hyp, { light: 0.34, dark: 0.46, lw: 0.9 });
    drawDragonHead(ctx, l, hxp, hyp, hr2, base, pose, hero, 0.35);
    // near wing
    drawDragonWing(ctx, l, H, -H * 0.04, back + H * 0.02, pose, base, 0.72, 1);
    if (l.rider) {
      const rH = H * 0.72, rm = humanMetrics(l, rH);
      ctx.save(); ctx.translate(-BL * 0.02, back - H * 0.02 - rm.hipY);
      limb(ctx, [[rm.hw * 0.3, rm.hipY], [H * 0.11, rm.hipY + H * 0.07], [H * 0.09, rm.hipY + H * 0.18]], rH * 0.1, dk(clothColor(l), 0.35), { shadeEnd: true });
      drawHumanoid(ctx, l, pose, rH, hero, { rider: true });
      ctx.restore();
    }
    ctx.restore();
  }

  // ================================================================ (part 4) DRAGONS & MONSTERS
  /** membranous wing anchored at (ax,ay); side +1 = near, -1 = far */
  function drawDragonWing(ctx, l, H, ax, ay, pose, col, sc, side) {
    const flap = (pose.wingT || 0) * 0.2 + (pose.anim === 'attack' ? 0.16 : 0) + (pose.anim === 'walk' ? 0.08 : 0);
    ctx.save(); ctx.translate(ax, ay);
    // arm sweeps up and back so the body, neck and head stay legible in front of it
    ctx.rotate(-2.0 + flap * side * 0.8 + (side < 0 ? -0.2 : 0.16));
    const S = H * 0.92 * sc;
    const wx = S * 0.58, wy = -S * 0.3;                         // wrist
    const tips = [[S * 1.34, -S * 0.34], [S * 1.3, S * 0.2], [S * 1.0, S * 0.62], [S * 0.56, S * 0.86]];
    const mem = side > 0 ? mix(col, '#c8707e', 0.34) : dk(mix(col, '#c8707e', 0.34), 0.3);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wx * 0.5, wy * 1.25, wx, wy);
    ctx.lineTo(tips[0][0], tips[0][1]);
    for (let i = 1; i < tips.length; i++) {
      const p = tips[i - 1], q = tips[i];
      ctx.quadraticCurveTo(M.lerp(p[0], q[0], 0.5) - S * 0.33, M.lerp(p[1], q[1], 0.5) - S * 0.06, q[0], q[1]);
    }
    ctx.quadraticCurveTo(S * 0.3, S * 0.58, 0, S * 0.12); ctx.closePath();
    paint(ctx, mem, 0, -S * 0.5, S * 1.3, S * 1.4, { light: 0.22, dark: 0.52, lw: 0.9 });
    ctx.save(); ctx.clip();
    // translucency towards the trailing edge + veins
    ctx.fillStyle = Art.rgrad(ctx, wx * 0.9, wy + S * 0.3, 0, S * 1.5, [[0, al(lt(mem, 0.55), 0.4)], [0.55, al(lt(mem, 0.3), 0.14)], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(-S, -S, S * 2.6, S * 2.6);
    ctx.strokeStyle = al(dk(mem, 0.45), 0.3); ctx.lineWidth = S * 0.018;
    for (const t of tips) { for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(M.lerp(t[0], 0, k * 0.16) + S * 0.1 * k, M.lerp(t[1], S * 0.2, k * 0.16)); ctx.stroke(); } }
    ctx.fillStyle = Art.grad(ctx, 0, -S * 0.4, S * 0.4, S * 0.9, [[0, 'rgba(255,240,206,0.2)'], [1, 'rgba(10,10,40,0.35)']]); ctx.fillRect(-S, -S, S * 2.6, S * 2.6);
    ctx.restore();
    // bones: humerus, then the finger struts
    ctx.strokeStyle = al(dk(col, 0.45), 0.95); ctx.lineWidth = S * 0.075; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(wx * 0.5, wy * 1.25, wx, wy); ctx.stroke();
    ctx.strokeStyle = al(lt(col, 0.3), 0.5); ctx.lineWidth = S * 0.022;
    ctx.beginPath(); ctx.moveTo(0, -S * 0.02); ctx.quadraticCurveTo(wx * 0.5, wy * 1.25 - S * 0.03, wx, wy - S * 0.02); ctx.stroke();
    ctx.strokeStyle = al(dk(col, 0.4), 0.9); ctx.lineWidth = S * 0.045;
    for (const t of tips) { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(t[0], t[1]); ctx.stroke(); }
    ctx.strokeStyle = al(lt(col, 0.35), 0.45); ctx.lineWidth = S * 0.014;
    for (const t of tips) { ctx.beginPath(); ctx.moveTo(wx, wy - S * 0.02); ctx.lineTo(t[0], t[1] - S * 0.02); ctx.stroke(); }
    // wrist claw
    ctx.fillStyle = dk(col, 0.55); ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
    poly(ctx, [[wx - S * 0.03, wy - S * 0.03], [wx + S * 0.15, wy - S * 0.15], [wx + S * 0.05, wy + S * 0.04]]); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /** reptilian head pointing +x, centred at (cx,cy) with skull radius r */
  function drawDragonHead(ctx, l, cx, cy, r, base, pose, hero, tilt) {
    const el = l.element, ec = el ? ELEMENT[el] : null, eye = l.eyes || (ec ? lt(ec, 0.4) : '#ffc23a');
    const open = pose.anim === 'attack' ? pose.swing > 0 : pose.anim === 'cast';
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt || 0);
    // swept horns + frill (behind)
    ctx.fillStyle = '#d8c8a8'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.7;
    for (const s of [0, 1]) {
      const oy = -r * (0.55 + s * 0.2), ox = -r * (0.15 + s * 0.2), sc = 1 - s * 0.22;
      ctx.beginPath(); ctx.moveTo(ox - r * 0.12, oy - r * 0.12); ctx.quadraticCurveTo(-r * 0.95 * sc, oy - r * 0.95 * sc, -r * 1.6 * sc, oy - r * 0.82 * sc);
      ctx.quadraticCurveTo(-r * 0.85 * sc, oy - r * 0.12 * sc, ox + r * 0.52, oy + r * 0.34); ctx.closePath();
      ctx.fillStyle = s ? '#bfae8c' : '#d8c8a8'; ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = dk(base, 0.4);
    for (let i = 0; i < 3; i++) { poly(ctx, [[-r * (0.5 + i * 0.1), r * (0.1 + i * 0.28)], [-r * (1.25 + i * 0.16), r * (0.15 + i * 0.3)], [-r * (0.55 + i * 0.1), r * (0.42 + i * 0.28)]]); ctx.fill(); ctx.stroke(); }
    // skull
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.0, r * 0.85, -r * 0.48);
    ctx.quadraticCurveTo(r * 1.62, -r * 0.34, r * 1.82, r * 0.0);
    ctx.quadraticCurveTo(r * 1.5, r * 0.22, r * 0.8, r * 0.28);
    ctx.quadraticCurveTo(r * 0.1, r * 0.42, -r * 0.88, r * 0.55);
    ctx.closePath();
    paint(ctx, base, -r, -r, r * 2.8, r * 1.6, { light: 0.34, dark: 0.46, lw: 0.9 });
    ctx.save(); ctx.clip();
    ctx.fillStyle = al(dk(base, 0.5), 0.45);
    for (let i = 0; i < 5; i++) { ell(ctx, -r * 0.6 + i * r * 0.42, -r * 0.5 + (i % 2) * r * 0.25, r * 0.17, r * 0.1, -0.25); ctx.fill(); }
    ctx.fillStyle = Art.grad(ctx, 0, -r, 0, r * 0.6, [[0, 'rgba(255,246,214,0.3)'], [0.55, 'rgba(255,246,214,0)'], [1, 'rgba(14,14,50,0.4)']]); ctx.fillRect(-r * 1.2, -r * 1.2, r * 3.2, r * 2.2);
    ctx.restore();
    // brow ridge + nostril
    ctx.strokeStyle = al(dk(base, 0.55), 0.7); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.62); ctx.quadraticCurveTo(r * 0.5, -r * 0.72, r * 0.95, -r * 0.4); ctx.stroke();
    ctx.fillStyle = al('#1c1420', 0.8); ell(ctx, r * 1.48, -r * 0.13, r * 0.1, r * 0.07, 0.4); ctx.fill();
    // jaw
    const jd = open ? r * 0.5 : 0;
    ctx.save(); ctx.translate(r * 0.55, r * 0.2); ctx.rotate(open ? 0.55 : 0.04);
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.1); ctx.quadraticCurveTo(r * 0.5, r * 0.1, r * 1.2, r * 0.05);
    ctx.quadraticCurveTo(r * 0.7, r * 0.42, -r * 0.45, r * 0.38); ctx.closePath();
    paint(ctx, dk(base, 0.14), -r * 0.5, -r * 0.1, r * 1.7, r * 0.5, { light: 0.3, dark: 0.45, lw: 0.8 });
    ctx.fillStyle = '#f6f2e4'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.35;
    for (let i = 0; i < 4; i++) { poly(ctx, [[r * (0.9 - i * 0.28), r * 0.02], [r * (0.84 - i * 0.28), -r * 0.28], [r * (0.77 - i * 0.28), r * 0.03]]); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    if (open) { ctx.fillStyle = '#4a1420'; ctx.beginPath(); ctx.moveTo(r * 0.7, r * 0.2); ctx.quadraticCurveTo(r * 1.4, r * 0.3, r * 1.6, r * 0.5); ctx.quadraticCurveTo(r * 1.0, r * 0.62, r * 0.65, r * 0.52); ctx.closePath(); ctx.fill(); }
    // upper teeth
    ctx.fillStyle = '#f6f2e4'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.35;
    for (let i = 0; i < 4; i++) { poly(ctx, [[r * (1.42 - i * 0.28), r * 0.1], [r * (1.36 - i * 0.28), r * (0.45 + (i === 0 ? 0.18 : 0))], [r * (1.28 - i * 0.28), r * 0.09]]); ctx.fill(); ctx.stroke(); }
    // eye
    const ex2 = r * 0.6, ey2 = -r * 0.4;
    glow(ctx, ex2, ey2, r * 0.7, eye, 0.75);
    ctx.fillStyle = lt(eye, 0.45); ell(ctx, ex2, ey2, r * 0.26, r * 0.19, -0.15); ctx.fill();
    ctx.fillStyle = '#12101a'; ell(ctx, ex2 + r * 0.04, ey2, r * 0.06, r * 0.16); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; circ(ctx, ex2 - r * 0.08, ey2 - r * 0.06, r * 0.05); ctx.fill();
    ctx.strokeStyle = al(dk(base, 0.6), 0.85); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(ex2 - r * 0.32, ey2 - r * 0.18); ctx.quadraticCurveTo(ex2, ey2 - r * 0.42, ex2 + r * 0.3, ey2 - r * 0.14); ctx.stroke();
    if (hero) { ctx.strokeStyle = al(METAL.gold, 0.8); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.42); ctx.quadraticCurveTo(r * 0.1, -r * 0.9, r * 0.8, -r * 0.42); ctx.stroke(); }
    // breath charge
    if (ec && (pose.anim === 'cast' || (pose.anim === 'attack' && open))) {
      const k = pose.anim === 'cast' ? 0.5 + pose.cast * 0.6 : 1;
      glow(ctx, r * 1.7, r * 0.3, r * 1.5 * k, ec, 0.95);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = al(lt(ec, 0.5), 0.75);
      ctx.beginPath(); ctx.moveTo(r * 1.5, r * 0.0); ctx.quadraticCurveTo(r * (2.4 + k), r * 0.1, r * (3.2 + k * 1.2), r * 0.55);
      ctx.quadraticCurveTo(r * (2.3 + k), r * 0.9, r * 1.5, r * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = al('#fffbe8', 0.8); ell(ctx, r * 1.95, r * 0.3, r * 0.5, r * 0.2, 0.1); ctx.fill();
      ctx.restore();
    } else if (ec) glow(ctx, r * 1.65, r * 0.25, r * 0.6, ec, 0.5);
    ctx.restore();
  }

  function drawDragon(ctx, l, pose, H) {
    const el = l.element, ec = el ? ELEMENT[el] : null;
    const base = l.tint || (ec ? mix(ec, '#2d2538', 0.42) : '#6d4a80');
    const bellyC = l.scales || mix(lt(base, 0.42), '#d9c391', 0.35), spineC = dk(base, 0.5);
    const BL = H * 1.42, belly = -H * 0.56, back = belly - H * 0.42;
    ctx.save(); ctx.translate(pose.lunge * 0.4, -pose.bob * 0.5);
    // ---- far wing
    drawDragonWing(ctx, l, H, -BL * 0.1, back + H * 0.08, pose, base, 0.86, -1);
    // ---- tail sweeping back and up
    const tx = -BL * 0.46, sway = (pose.capeSway || 0) * H * 0.03;
    ctx.beginPath();
    ctx.moveTo(tx + H * 0.16, back + H * 0.14);
    ctx.quadraticCurveTo(tx - H * 0.5 + sway, back - H * 0.04, tx - H * 1.0 + sway * 2, back - H * 0.46);
    ctx.quadraticCurveTo(tx - H * 0.62 + sway * 1.6, back + H * 0.14, tx - H * 0.4, belly + H * 0.02);
    ctx.quadraticCurveTo(tx - H * 0.08, belly + H * 0.05, tx + H * 0.16, belly - H * 0.02);
    ctx.closePath();
    paint(ctx, base, tx - H * 1.0, back - H * 0.46, H * 1.16, H * 0.6, { light: 0.3, dark: 0.52, lw: 0.9 });
    poly(ctx, [[tx - H * 0.92 + sway * 2, back - H * 0.4], [tx - H * 1.24 + sway * 2.3, back - H * 0.74], [tx - H * 1.04 + sway * 2, back - H * 0.3], [tx - H * 1.26 + sway * 2.3, back - H * 0.16]]);
    paint(ctx, spineC, tx - H * 1.26, back - H * 0.74, H * 0.36, H * 0.6, { light: 0.3, dark: 0.4, lw: 0.7 });
    ctx.fillStyle = spineC; ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) { const t = i / 6, px = M.lerp(tx + H * 0.1, tx - H * 0.94 + sway * 2, t), py = M.lerp(back + H * 0.08, back - H * 0.4, t); poly(ctx, [[px, py], [px - H * 0.02, py - H * 0.1], [px - H * 0.08, py + H * 0.01]]); ctx.fill(); ctx.stroke(); }
    // ---- far legs (heavy haunch behind, foreleg in front)
    quadLeg(ctx, -BL * 0.22, belly - H * 0.02, -BL * 0.3 - pose.stride * H * 0.06, 0, H * 0.085, dk(base, 0.32), -1, 'talon', false);
    quadLeg(ctx, BL * 0.26, belly - H * 0.02, BL * 0.2 - pose.stride * H * 0.06, 0, H * 0.07, dk(base, 0.32), 1, 'talon', false);
    // ---- body
    const bodyPts = [[-BL * 0.46, back + H * 0.16], [-BL * 0.22, back + H * 0.01], [BL * 0.04, back - H * 0.04], [BL * 0.3, back + H * 0.01], [BL * 0.46, back + H * 0.2],
      [BL * 0.36, belly - H * 0.04], [0, belly + H * 0.03], [-BL * 0.36, belly - H * 0.03]];
    blob(ctx, bodyPts);
    paint(ctx, base, -BL * 0.46, back - H * 0.05, BL * 0.92, belly - back + H * 0.1, { light: 0.32, dark: 0.52, lw: 1 });
    ctx.save(); blob(ctx, bodyPts); ctx.clip();
    // haunch mass + shoulder mass
    ctx.fillStyle = al(lt(base, 0.22), 0.5); ell(ctx, -BL * 0.26, belly - H * 0.16, BL * 0.2, H * 0.17, -0.12); ctx.fill();
    ctx.fillStyle = al(lt(base, 0.14), 0.4); ell(ctx, BL * 0.22, belly - H * 0.2, BL * 0.14, H * 0.14, 0.1); ctx.fill();
    // belly plates (warm bone, kept low and narrow)
    ctx.fillStyle = al(bellyC, 0.42); ell(ctx, BL * 0.02, belly - H * 0.005, BL * 0.24, H * 0.062); ctx.fill();
    ctx.strokeStyle = al(dk(bellyC, 0.45), 0.55); ctx.lineWidth = 0.7;
    for (let i = 0; i < 7; i++) { const x = -BL * 0.22 + i * BL * 0.075; ctx.beginPath(); ctx.moveTo(x, belly - H * 0.1); ctx.quadraticCurveTo(x - H * 0.02, belly - H * 0.04, x - H * 0.05, belly + H * 0.02); ctx.stroke(); }
    // scales
    ctx.fillStyle = al(dk(base, 0.5), 0.42);
    for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) {
      const x = -BL * 0.42 + i * BL * 0.1 + (row % 2) * BL * 0.05, y = back + H * 0.03 + row * H * 0.075;
      ell(ctx, x, y, H * 0.042, H * 0.022, -0.2); ctx.fill();
    }
    ctx.fillStyle = al(lt(base, 0.6), 0.22);
    for (let i = 0; i < 9; i++) { ell(ctx, -BL * 0.4 + i * BL * 0.1, back + H * 0.045, H * 0.036, H * 0.012, -0.2); ctx.fill(); }
    ctx.fillStyle = Art.grad(ctx, -BL * 0.3, back - H * 0.05, BL * 0.2, belly + H * 0.05, [[0, 'rgba(255,246,214,0.32)'], [0.45, 'rgba(255,246,214,0)'], [1, 'rgba(12,14,52,0.55)']]);
    ctx.fillRect(-BL, back - H * 0.2, BL * 2, H * 0.9);
    ctx.restore();
    // dorsal spines
    ctx.fillStyle = spineC; ctx.strokeStyle = OUT; ctx.lineWidth = 0.6;
    for (let i = 0; i < 7; i++) { const x = -BL * 0.36 + i * BL * 0.11, sc2 = 1 - Math.abs(i - 2.5) * 0.12; poly(ctx, [[x, back + H * 0.04], [x + H * 0.04, back - H * 0.17 * sc2], [x + H * 0.1, back + H * 0.04]]); ctx.fill(); ctx.stroke(); }
    // ---- near legs
    quadLeg(ctx, -BL * 0.17, belly - H * 0.01, -BL * 0.22 + pose.stride * H * 0.08, 0, H * 0.098, base, -1, 'talon');
    quadLeg(ctx, BL * 0.31, belly - H * 0.01, BL * 0.35 + pose.stride * H * 0.08, 0, H * 0.08, base, 1, 'talon');
    // ---- neck + head
    const hxp = BL * 0.64, hyp = back - H * 0.78, hr2 = H * 0.245;
    const n0x = BL * 0.3, n0y = back + H * 0.04, nw = H * 0.19;
    ctx.beginPath();
    ctx.moveTo(n0x - nw * 0.7, n0y);
    ctx.quadraticCurveTo(BL * 0.3 - nw * 0.6, M.lerp(n0y, hyp, 0.62), hxp - hr2 * 0.85, hyp + hr2 * 0.05);
    ctx.lineTo(hxp - hr2 * 0.5, hyp + hr2 * 1.1);
    ctx.quadraticCurveTo(BL * 0.56 + nw * 0.25, M.lerp(n0y, hyp, 0.32), n0x + nw * 0.95, n0y + H * 0.06);
    ctx.closePath();
    paint(ctx, base, n0x - nw, hyp, hxp - n0x + nw, n0y - hyp, { light: 0.34, dark: 0.48, lw: 0.95 });
    ctx.save(); ctx.clip();
    ctx.fillStyle = al(bellyC, 0.6);
    for (let i = 0; i < 6; i++) { const t = i / 6; ell(ctx, M.lerp(n0x + nw * 0.4, hxp - hr2 * 0.45, t), M.lerp(n0y, hyp + hr2, t), nw * 0.3, H * 0.022, -0.9); ctx.fill(); }
    ctx.fillStyle = Art.grad(ctx, n0x - nw, 0, hxp, 0, [[0, 'rgba(12,14,52,0.3)'], [1, 'rgba(255,246,214,0.12)']]); ctx.fillRect(n0x - nw * 2, hyp - H * 0.1, H * 2, H * 2);
    ctx.restore();
    // neck spines
    ctx.fillStyle = spineC; ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) { const t = 0.15 + i * 0.24, px = M.lerp(n0x - nw * 0.5, hxp - hr2 * 0.8, t), py = M.lerp(n0y, hyp + hr2 * 0.1, t); poly(ctx, [[px, py], [px - H * 0.08, py - H * 0.06], [px + H * 0.01, py + H * 0.06]]); ctx.fill(); ctx.stroke(); }
    drawDragonHead(ctx, l, hxp, hyp, hr2, base, pose, l.hero, 0.3);
    // ---- near wing
    drawDragonWing(ctx, l, H, -BL * 0.02, back + H * 0.06, pose, base, 1.0, 1);
    if (ec) glow(ctx, 0, (back + belly) / 2, BL * 0.7, ec, 0.22);
    if (l.glow) glow(ctx, 0, (back + belly) / 2, BL * 0.6, l.glow, 0.25);
    ctx.restore();
  }

  // ---------------------------------------------------------------- birds & phoenix
  function drawBird(ctx, l, pose, H, phoenix) {
    const base = l.tint || (phoenix ? '#ff6a2a' : '#6a5a48');
    const wingC = phoenix ? lt(base, 0.25) : mix(base, '#3a3028', 0.25);
    const bodyY = -H * 0.62 + (pose.wingT || 0) * H * 0.04, bodyX = 0;
    const flap = (pose.wingT || 0) * 0.55 + (pose.anim === 'attack' ? 0.3 : 0);
    ctx.save(); ctx.translate(pose.lunge * 0.4, -pose.bob * 0.6);
    if (phoenix) glow(ctx, bodyX, bodyY, H * 0.8, l.glow || '#ff9a2a', 0.32);
    // far wing
    for (const side of [-1, 1]) {
      if (side > 0) { // body drawn between the wings
        // tail feathers
        ctx.save();
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(bodyX - H * 0.1, bodyY + H * 0.05);
          ctx.quadraticCurveTo(bodyX - H * 0.4, bodyY + H * (0.16 + i * 0.1), bodyX - H * (0.62 + Math.abs(i) * 0.06), bodyY + H * (0.3 + i * 0.22));
          ctx.quadraticCurveTo(bodyX - H * 0.35, bodyY + H * (0.24 + i * 0.1), bodyX - H * 0.08, bodyY + H * 0.12); ctx.closePath();
          paint(ctx, i === 0 ? base : dk(base, 0.18), bodyX - H * 0.6, bodyY, H * 0.6, H * 0.4, { light: 0.32, dark: 0.45, lw: 0.7 });
        }
        ctx.restore();
        // body + neck + head
        ell(ctx, bodyX, bodyY + H * 0.03, H * 0.26, H * 0.2, -0.18);
        paint(ctx, base, bodyX - H * 0.26, bodyY - H * 0.18, H * 0.52, H * 0.42, { light: 0.34, dark: 0.45, lw: 0.9 });
        ctx.save(); ell(ctx, bodyX, bodyY + H * 0.03, H * 0.26, H * 0.2, -0.18); ctx.clip();
        ctx.fillStyle = al(lt(base, 0.4), 0.5); for (let i = 0; i < 6; i++) { ell(ctx, bodyX - H * 0.14 + (i % 3) * H * 0.13, bodyY - H * 0.04 + ((i / 3) | 0) * H * 0.11, H * 0.06, H * 0.03, -0.3); ctx.fill(); }
        ctx.fillStyle = Art.grad(ctx, 0, bodyY - H * 0.18, 0, bodyY + H * 0.24, [[0, 'rgba(255,246,214,0.3)'], [0.5, 'rgba(255,246,214,0)'], [1, 'rgba(14,14,50,0.42)']]); ctx.fillRect(bodyX - H * 0.4, bodyY - H * 0.3, H * 0.8, H * 0.6); ctx.restore();
        const hxp = bodyX + H * 0.24, hyp = bodyY - H * 0.2, hr2 = H * 0.11;
        line(ctx, [[bodyX + H * 0.1, bodyY - H * 0.06], [hxp - H * 0.02, hyp + hr2 * 0.6]], base, H * 0.11);
        circ(ctx, hxp, hyp, hr2); paint(ctx, lt(base, 0.15), hxp - hr2, hyp - hr2, hr2 * 2, hr2 * 2, { light: 0.35, dark: 0.4, lw: 0.8 });
        // crest
        ctx.fillStyle = phoenix ? '#ffd24a' : dk(base, 0.2); ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) { poly(ctx, [[hxp - hr2 * 0.3, hyp - hr2 * 0.6], [hxp - hr2 * (0.9 + i * 0.5), hyp - hr2 * (1.5 + i * 0.35)], [hxp - hr2 * (0.2 + i * 0.4), hyp - hr2 * 0.9]]); ctx.fill(); ctx.stroke(); }
        // beak + eye
        ctx.beginPath(); ctx.moveTo(hxp + hr2 * 0.35, hyp - hr2 * 0.25); ctx.quadraticCurveTo(hxp + hr2 * 1.7, hyp - hr2 * 0.1, hxp + hr2 * 1.5, hyp + hr2 * 0.6);
        ctx.quadraticCurveTo(hxp + hr2 * 0.9, hyp + hr2 * 0.3, hxp + hr2 * 0.4, hyp + hr2 * 0.42); ctx.closePath();
        paint(ctx, '#e8b43c', hxp, hyp - hr2 * 0.4, hr2 * 1.8, hr2, { light: 0.4, dark: 0.4, lw: 0.8 });
        const eye = l.eyes || (phoenix ? '#fff0a0' : '#f0a020');
        glow(ctx, hxp + hr2 * 0.35, hyp - hr2 * 0.2, hr2 * 0.7, eye, phoenix ? 0.8 : 0.35);
        ctx.fillStyle = '#f6e9c8'; circ(ctx, hxp + hr2 * 0.35, hyp - hr2 * 0.2, hr2 * 0.3); ctx.fill();
        ctx.fillStyle = '#12101a'; circ(ctx, hxp + hr2 * 0.4, hyp - hr2 * 0.2, hr2 * 0.15); ctx.fill();
        // talons tucked
        ctx.strokeStyle = '#d8ae52'; ctx.lineWidth = H * 0.022;
        for (const s of [0, 1]) { ctx.beginPath(); ctx.moveTo(bodyX + H * (0.02 - s * 0.1), bodyY + H * 0.18); ctx.lineTo(bodyX + H * (0.1 - s * 0.1), bodyY + H * 0.3); ctx.stroke(); }
      }
      ctx.save(); ctx.translate(bodyX - H * 0.04, bodyY - H * 0.06);
      ctx.rotate(-0.85 + flap * (side > 0 ? 1 : -0.85) + (side > 0 ? 0 : 0.4));
      const span = H * (side > 0 ? 0.86 : 0.72);
      for (let i = 3; i >= 0; i--) {
        const a = -0.55 + i * 0.32, len = span * (1.05 - i * 0.16);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a - 0.5) * len * 0.6, Math.sin(a - 0.5) * len * 0.6, Math.cos(a) * len, Math.sin(a) * len);
        ctx.quadraticCurveTo(Math.cos(a + 0.35) * len * 0.55, Math.sin(a + 0.35) * len * 0.55, span * 0.05, span * 0.1); ctx.closePath();
        const c = side > 0 ? wingC : dk(wingC, 0.2);
        paint(ctx, i % 2 ? dk(c, 0.14) : c, -span * 0.2, -span * 0.6, span * 1.2, span * 1.2, { light: 0.3, dark: 0.4, lw: 0.7 });
      }
      if (phoenix) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.strokeStyle = al('#ffd24a', 0.4); ctx.lineWidth = H * 0.012; for (let i = 0; i < 3; i++) { const a = -0.5 + i * 0.32; ctx.beginPath(); ctx.moveTo(span * 0.2, 0); ctx.lineTo(Math.cos(a) * span * 0.92, Math.sin(a) * span * 0.92); ctx.stroke(); } ctx.restore(); }
      ctx.restore();
    }
    if (phoenix) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const a = (pose.f || 0) * 0.6 + i * 1.26; ctx.fillStyle = al(i % 2 ? '#ffd24a' : '#ff7a2a', 0.38); circ(ctx, bodyX - H * 0.34 + Math.cos(a) * H * 0.26, bodyY + H * 0.28 + Math.sin(a) * H * 0.14, H * 0.028); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- kraken
  function drawKraken(ctx, l, pose, H) {
    const base = l.tint || '#5a3a6a', suck = lt(base, 0.55), eye = l.eyes || '#e8d24a';
    const cy = -H * 0.82, wob = Math.sin((pose.f || 0) * 1.3) * H * 0.035;
    ctx.save(); ctx.translate(pose.lunge * 0.3, -pose.bob * 0.4);
    // back tentacles
    for (let i = 0; i < 6; i++) {
      const near = i % 2 === 0, dir = i < 3 ? -1 : 1, k = i % 3;
      const col = near ? base : dk(base, 0.3);
      const x0 = dir * H * 0.14 * (k + 0.5), y0 = cy + H * 0.32;
      const x1 = dir * H * (0.58 + k * 0.3), y1 = cy + H * (0.6 + k * 0.12) + wob * (k + 1) * 0.4;
      const x2 = dir * H * (1.0 + k * 0.3) + wob * dir, y2 = -H * 0.02;
      const w2 = H * (0.105 - k * 0.013);
      ctx.strokeStyle = OUT; ctx.lineWidth = w2 * 2 + 1.4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke();
      ctx.strokeStyle = Art.grad(ctx, x0, y0, x2, y2, [[0, lt(col, 0.25)], [1, dk(col, 0.35)]]); ctx.lineWidth = w2 * 2; ctx.stroke();
      ctx.fillStyle = al(suck, 0.75);
      for (let s = 1; s < 5; s++) { const t = s / 5, px = M.lerp(M.lerp(x0, x1, t), M.lerp(x1, x2, t), t), py = M.lerp(M.lerp(y0, y1, t), M.lerp(y1, y2, t), t); circ(ctx, px + dir * w2 * 0.35, py, w2 * (0.3 - t * 0.12)); ctx.fill(); }
      if (i === 1) { // mantle drawn between tentacle layers
        ctx.beginPath(); ctx.moveTo(-H * 0.42, cy + H * 0.28); ctx.quadraticCurveTo(-H * 0.5, cy - H * 0.6, 0, cy - H * 0.72);
        ctx.quadraticCurveTo(H * 0.5, cy - H * 0.6, H * 0.42, cy + H * 0.28); ctx.quadraticCurveTo(0, cy + H * 0.46, -H * 0.42, cy + H * 0.28); ctx.closePath();
        paint(ctx, base, -H * 0.5, cy - H * 0.72, H * 1.0, H * 1.18, { light: 0.32, dark: 0.5, lw: 1 });
        ctx.save(); ctx.clip();
        ctx.fillStyle = al(dk(base, 0.5), 0.4); for (let s = 0; s < 8; s++) { ell(ctx, -H * 0.26 + (s % 4) * H * 0.17, cy - H * 0.36 + ((s / 4) | 0) * H * 0.2, H * 0.07, H * 0.04, -0.3); ctx.fill(); }
        ctx.fillStyle = Art.grad(ctx, -H * 0.3, cy - H * 0.5, H * 0.3, cy + H * 0.3, [[0, 'rgba(255,246,214,0.3)'], [0.5, 'rgba(255,246,214,0)'], [1, 'rgba(10,14,52,0.5)']]); ctx.fillRect(-H * 0.5, cy - H * 0.7, H, H * 1.2); ctx.restore();
        // eye
        const ex2 = H * 0.1, ey2 = cy - H * 0.04, er = H * 0.175;
        glow(ctx, ex2, ey2, er * 2.4, eye, 0.6);
        ell(ctx, ex2, ey2, er, er * 0.82); paint(ctx, lt(eye, 0.35), ex2 - er, ey2 - er, er * 2, er * 2, { light: 0.45, dark: 0.35, lw: 0.8 });
        ctx.fillStyle = '#12101a'; ell(ctx, ex2 + er * 0.1, ey2, er * 0.62, er * 0.22); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; circ(ctx, ex2 - er * 0.3, ey2 - er * 0.3, er * 0.16); ctx.fill();
        // beak
        ctx.fillStyle = '#2a1c26'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
        poly(ctx, [[-H * 0.08, cy + H * 0.3], [H * 0.08, cy + H * 0.3], [0, cy + H * 0.48]]); ctx.fill(); ctx.stroke();
      }
    }
    if (l.glow) glow(ctx, 0, cy, H * 0.7, l.glow, 0.3);
    ctx.restore();
  }

  // ---------------------------------------------------------------- elementals
  function drawElemental(ctx, l, pose, H) {
    const el = l.element || 'stone', ec = ELEMENT[el] || '#c0a060';
    const base = l.tint || mix(ec, '#2c2438', el === 'stone' ? 0.45 : 0.55);
    const core = l.glow || lt(ec, 0.35);
    const solid = el === 'stone';
    const top = -H * 1.02, mid = -H * 0.5, bot = -H * 0.02;
    const wob = Math.sin((pose.f || 0) * 1.5 + (l.seed || 0)) * H * 0.03;
    ctx.save(); ctx.translate(pose.lunge * 0.4, -pose.bob * 0.6);
    glow(ctx, 0, mid, H * 0.7, ec, solid ? 0.2 : 0.4);
    // ---- base / legs
    if (solid) {
      for (const s of [-1, 1]) { Art.rrect(ctx, s * H * 0.055 - H * 0.085, mid + H * 0.06, H * 0.17, H * 0.46, H * 0.045); paint(ctx, s > 0 ? base : dk(base, 0.25), s * H * 0.055 - H * 0.085, mid, H * 0.17, H * 0.52, { light: 0.3, dark: 0.5, lw: 0.9 }); }
    } else {
      ctx.beginPath(); ctx.moveTo(-H * 0.2, mid); ctx.quadraticCurveTo(-H * 0.34 + wob, bot - H * 0.14, -H * 0.16 + wob, bot);
      ctx.quadraticCurveTo(0, bot + H * 0.06, H * 0.18 + wob, bot); ctx.quadraticCurveTo(H * 0.34 + wob, bot - H * 0.16, H * 0.2, mid); ctx.closePath();
      paint(ctx, dk(base, 0.15), -H * 0.34, mid, H * 0.68, bot - mid, { light: 0.3, dark: 0.5, lw: 0.9 });
    }
    // ---- torso mass
    blob(ctx, [[-H * 0.21, mid + H * 0.12], [-H * 0.23, top + H * 0.26], [-H * 0.05, top + H * 0.1], [H * 0.16, top + H * 0.2], [H * 0.26, mid - H * 0.08], [H * 0.2, mid + H * 0.16], [0, mid + H * 0.22], [-H * 0.17, mid + H * 0.18]]);
    paint(ctx, base, -H * 0.26, top, H * 0.52, mid - top + H * 0.2, { light: 0.32, dark: 0.5, lw: 1 });
    ctx.save();
    blob(ctx, [[-H * 0.21, mid + H * 0.12], [-H * 0.23, top + H * 0.26], [-H * 0.05, top + H * 0.1], [H * 0.16, top + H * 0.2], [H * 0.26, mid - H * 0.08], [H * 0.2, mid + H * 0.16], [0, mid + H * 0.22], [-H * 0.17, mid + H * 0.18]]);
    ctx.clip();
    if (el === 'stone') { ctx.strokeStyle = al('#3a3228', 0.55); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-H * 0.3, mid - H * 0.12); ctx.lineTo(H * 0.1, mid - H * 0.2); ctx.moveTo(-H * 0.1, top); ctx.lineTo(-H * 0.02, mid); ctx.moveTo(H * 0.12, top + H * 0.1); ctx.lineTo(H * 0.2, mid); ctx.stroke(); ctx.fillStyle = al('#6a8a4a', 0.4); ell(ctx, -H * 0.12, top + H * 0.16, H * 0.14, H * 0.04); ctx.fill(); }
    else if (el === 'frost' || el === 'water') { ctx.fillStyle = al(lt(ec, 0.6), 0.4); for (let i = 0; i < 5; i++) { poly(ctx, [[-H * 0.22 + i * H * 0.1, mid + H * 0.1], [-H * 0.16 + i * H * 0.1, top + H * 0.1], [-H * 0.1 + i * H * 0.1, mid + H * 0.1]]); ctx.fill(); } }
    else if (el === 'lightning') { ctx.strokeStyle = al('#ffffff', 0.7); ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { const o2 = i * 0.7 + (pose.f || 0) * 0.9; ctx.beginPath(); ctx.moveTo(-H * 0.2 + Math.sin(o2) * H * 0.1, top + H * 0.1); for (let s = 1; s <= 4; s++) ctx.lineTo(-H * 0.2 + Math.sin(o2 + s) * H * 0.18, top + H * 0.1 + s * (mid - top) * 0.28); ctx.stroke(); } }
    else { // fire / shadow / other: rising tongues
      ctx.fillStyle = al(lt(ec, 0.5), 0.55);
      for (let i = 0; i < 5; i++) { const x = -H * 0.22 + i * H * 0.11, hgt = H * (0.2 + ((i * 37 + (pose.f || 0) * 11) % 10) / 40); ctx.beginPath(); ctx.moveTo(x - H * 0.05, mid); ctx.quadraticCurveTo(x, mid - hgt * 1.3, x + H * 0.04, mid - hgt); ctx.quadraticCurveTo(x + H * 0.03, mid - hgt * 0.4, x + H * 0.07, mid); ctx.closePath(); ctx.fill(); }
    }
    ctx.fillStyle = Art.grad(ctx, -H * 0.3, top, H * 0.3, mid, [[0, 'rgba(255,246,214,0.25)'], [0.5, 'rgba(255,246,214,0)'], [1, 'rgba(10,12,50,0.45)']]); ctx.fillRect(-H * 0.4, top - H * 0.1, H * 0.8, H); ctx.restore();
    // ---- arms
    const swing = pose.swing || 0;
    for (const s of [-1, 1]) {
      const hx2 = s * H * (0.4 + (s > 0 ? Math.max(0, swing) * 0.24 : 0)), hy2 = mid - H * 0.04 + (s > 0 ? -swing * H * 0.12 : 0);
      limb(ctx, [[s * H * 0.17, top + H * 0.3], [s * H * 0.33, mid - H * 0.24], [hx2, hy2]], H * 0.072 * (s > 0 ? 1 : 0.88), s > 0 ? base : dk(base, 0.25), { shadeEnd: true });
      circ(ctx, hx2, hy2, H * 0.06); paint(ctx, s > 0 ? lt(base, 0.1) : dk(base, 0.25), hx2 - H * 0.06, hy2 - H * 0.06, H * 0.12, H * 0.12, { light: 0.3, dark: 0.45, lw: 0.7 });
      glow(ctx, hx2, hy2, H * 0.16, ec, 0.6);
    }
    // ---- head / core
    const hy3 = top + H * 0.06;
    if (solid) { Art.rrect(ctx, -H * 0.13, hy3 - H * 0.12, H * 0.26, H * 0.24, H * 0.05); paint(ctx, lt(base, 0.1), -H * 0.13, hy3 - H * 0.12, H * 0.26, H * 0.24, { light: 0.3, dark: 0.45, lw: 0.9 }); }
    else { blob(ctx, [[-H * 0.14, hy3], [-H * 0.08, hy3 - H * 0.14], [H * 0.06, hy3 - H * 0.16], [H * 0.15, hy3 - H * 0.02], [H * 0.08, hy3 + H * 0.12], [-H * 0.07, hy3 + H * 0.1]]); paint(ctx, lt(base, 0.12), -H * 0.16, hy3 - H * 0.18, H * 0.34, H * 0.34, { light: 0.32, dark: 0.45, lw: 0.9 }); }
    for (const s of [-1, 1]) { glow(ctx, s * H * 0.05 + H * 0.02, hy3 - H * 0.02, H * 0.08, core, 1); ctx.fillStyle = lt(core, 0.6); ell(ctx, s * H * 0.05 + H * 0.02, hy3 - H * 0.02, H * 0.022, H * 0.016); ctx.fill(); }
    glow(ctx, 0, mid - H * 0.12, H * 0.2, core, 0.85);
    ctx.fillStyle = al(lt(core, 0.5), 0.9); circ(ctx, 0, mid - H * 0.12, H * 0.035); ctx.fill();
    // ---- element-specific silhouette breaks so each elemental reads at a glance
    ctx.save();
    if (el === 'frost' || el === 'water') {
      ctx.strokeStyle = al(dk(ec, 0.35), 0.7); ctx.lineWidth = 0.7;
      for (const sp of [[-0.25, -0.1, 0.42], [0.27, -0.16, 0.5], [-0.09, -0.34, 0.3], [0.32, 0.06, 0.26], [-0.3, 0.04, 0.22]]) {
        poly(ctx, [[H * sp[0] - H * 0.042, mid + H * sp[1]], [H * sp[0] + H * 0.02, mid + H * sp[1] - H * sp[2]], [H * sp[0] + H * 0.062, mid + H * sp[1]]]);
        ctx.fillStyle = al(lt(ec, 0.55), el === 'water' ? 0.5 : 0.78); ctx.fill(); ctx.stroke();
      }
    } else if (el === 'lightning') {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = -2.35 + i * 1.15 + (pose.f || 0) * 0.35;
        ctx.strokeStyle = al(lt(ec, 0.55), 0.85); ctx.lineWidth = H * 0.02;
        ctx.beginPath(); let px = 0, py = mid - H * 0.26; ctx.moveTo(px, py);
        for (let k = 1; k <= 3; k++) { px += Math.cos(a + k * 0.75) * H * 0.16; py += Math.sin(a + k * 0.75) * H * 0.16; ctx.lineTo(px, py); }
        ctx.stroke();
      }
    } else if (solid) {
      for (const sp of [[-0.27, -0.42, 0.1], [0.28, -0.48, 0.115], [-0.05, -0.66, 0.07]]) {
        circ(ctx, H * sp[0], mid + H * sp[1], H * sp[2]);
        paint(ctx, lt(base, 0.08), H * sp[0] - H * sp[2], mid + H * sp[1] - H * sp[2], H * sp[2] * 2, H * sp[2] * 2, { light: 0.32, dark: 0.5, lw: 0.8 });
      }
    } else {
      // fire / shadow / everything else: tongues licking up past the shoulders
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * H * 0.13, hgt = H * (0.26 + ((i * 53 + (pose.f || 0) * 17) % 11) / 32);
        ctx.beginPath(); ctx.moveTo(x - H * 0.065, hy3 + H * 0.1);
        ctx.quadraticCurveTo(x + H * 0.02, hy3 - hgt * 0.7, x + H * 0.045, hy3 - hgt);
        ctx.quadraticCurveTo(x + H * 0.025, hy3 - hgt * 0.3, x + H * 0.085, hy3 + H * 0.08); ctx.closePath();
        ctx.fillStyle = al(lt(ec, i % 2 ? 0.45 : 0.15), 0.55); ctx.fill();
      }
    }
    ctx.restore();
    // floating motes
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const a = (pose.f || 0) * 0.5 + i * 1.3; ctx.fillStyle = al(ec, 0.5); circ(ctx, Math.cos(a) * H * 0.42, mid + Math.sin(a * 1.3) * H * 0.3, H * 0.022); ctx.fill(); }
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- wisps, spirits, floating skulls
  function drawWisp(ctx, l, pose, H) {
    const c = l.glow || (l.element ? ELEMENT[l.element] : '#bfe6ff'), base = l.tint || c;
    const cy = -H * 0.6 + Math.sin((pose.f || 0) * 1.4) * H * 0.05;
    const spirit = l.body === 'spirit';
    ctx.save(); ctx.translate(pose.lunge * 0.4, 0);
    glow(ctx, 0, cy, H * 0.75, c, 0.75);
    // trailing ribbons
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const a = (pose.f || 0) * 0.5 + i * 1.6;
      ctx.strokeStyle = al(c, 0.3 - i * 0.05); ctx.lineWidth = H * (0.04 - i * 0.007);
      ctx.beginPath(); ctx.moveTo(0, cy + H * 0.08);
      ctx.quadraticCurveTo(Math.cos(a) * H * 0.18, cy + H * 0.24, Math.cos(a + 1) * H * 0.1, cy + H * 0.38);
      ctx.stroke();
    }
    ctx.restore();
    if (spirit) {
      // hooded spectral figure fading into mist
      ctx.beginPath(); ctx.moveTo(-H * 0.2, cy + H * 0.02); ctx.quadraticCurveTo(-H * 0.24, cy - H * 0.3, 0, cy - H * 0.34);
      ctx.quadraticCurveTo(H * 0.24, cy - H * 0.3, H * 0.2, cy + H * 0.04);
      ctx.quadraticCurveTo(H * 0.3, cy + H * 0.4, 0, cy + H * 0.56); ctx.quadraticCurveTo(-H * 0.3, cy + H * 0.4, -H * 0.2, cy + H * 0.02); ctx.closePath();
      ctx.fillStyle = Art.grad(ctx, 0, cy - H * 0.34, 0, cy + H * 0.56, [[0, al(lt(base, 0.4), 0.85)], [0.6, al(base, 0.55)], [1, al(base, 0)]]); ctx.fill();
      ctx.strokeStyle = al(lt(c, 0.5), 0.5); ctx.lineWidth = 0.7; ctx.stroke();
      ctx.fillStyle = 'rgba(10,10,24,0.55)'; ell(ctx, 0, cy - H * 0.14, H * 0.13, H * 0.14); ctx.fill();
      for (const s of [-1, 1]) { glow(ctx, s * H * 0.055, cy - H * 0.15, H * 0.07, lt(c, 0.5), 1); ctx.fillStyle = '#ffffff'; ell(ctx, s * H * 0.055, cy - H * 0.15, H * 0.02, H * 0.016); ctx.fill(); }
      // wispy arms
      ctx.strokeStyle = al(base, 0.6); ctx.lineWidth = H * 0.04;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * H * 0.14, cy + H * 0.04); ctx.quadraticCurveTo(s * H * 0.3, cy + H * 0.16, s * H * 0.24, cy + H * 0.3); ctx.stroke(); }
    } else {
      const r = H * 0.16;
      ctx.fillStyle = Art.rgrad(ctx, 0, cy, 0, r * 1.6, [[0, '#ffffff'], [0.3, lt(c, 0.6)], [0.75, c], [1, al(c, 0)]]);
      circ(ctx, 0, cy, r * 1.6); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const a = (pose.f || 0) * 0.7 + i * 1.25; ctx.fillStyle = al(lt(c, 0.4), 0.6); circ(ctx, Math.cos(a) * r * 2.1, cy + Math.sin(a * 1.4) * r * 1.3, r * 0.14); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSkull(ctx, l, pose, H, opts) {
    const bone = l.tint || '#e4dcc4', c = l.glow || (l.element ? ELEMENT[l.element] : '#8ad0ff');
    const cy = -H * 0.72 + Math.sin((pose.f || 0) * 1.2) * H * 0.03, r = H * 0.22;
    ctx.save(); ctx.translate(pose.lunge * 0.4, 0);
    glow(ctx, 0, cy + H * 0.1, H * 0.7, c, 0.4);
    // tattered spectral robe below the skull
    if (l.cape !== false || l.armor !== 'none') {
      const sway = (pose.capeSway || 0) * H * 0.03;
      ctx.beginPath(); ctx.moveTo(-r * 1.1, cy + r * 0.55); ctx.quadraticCurveTo(-H * 0.34 + sway, -H * 0.4, -H * 0.26 + sway, -H * 0.02);
      ctx.quadraticCurveTo(-H * 0.12, -H * 0.12, -H * 0.04 + sway, -H * 0.01);
      ctx.quadraticCurveTo(H * 0.08, -H * 0.1, H * 0.2 + sway, -H * 0.03);
      ctx.quadraticCurveTo(H * 0.32 + sway, -H * 0.38, r * 1.1, cy + r * 0.55); ctx.closePath();
      ctx.fillStyle = Art.grad(ctx, 0, cy, 0, 0, [[0, al(dk(clothColor(l), 0.5), 0.92)], [0.65, al(dk(clothColor(l), 0.6), 0.75)], [1, al(dk(clothColor(l), 0.7), 0.25)]]); ctx.fill();
      ctx.strokeStyle = al(c, 0.35); ctx.lineWidth = 0.7; ctx.stroke();
    }
    // skull
    ctx.beginPath(); ctx.moveTo(-r * 0.95, cy - r * 0.1); ctx.quadraticCurveTo(-r * 0.95, cy - r * 1.05, 0, cy - r * 1.02);
    ctx.quadraticCurveTo(r * 0.95, cy - r * 1.05, r * 0.95, cy - r * 0.1);
    ctx.quadraticCurveTo(r * 0.9, cy + r * 0.42, r * 0.5, cy + r * 0.5);
    ctx.quadraticCurveTo(r * 0.45, cy + r * 1.0, 0, cy + r * 1.02); ctx.quadraticCurveTo(-r * 0.45, cy + r * 1.0, -r * 0.5, cy + r * 0.5);
    ctx.quadraticCurveTo(-r * 0.9, cy + r * 0.42, -r * 0.95, cy - r * 0.1); ctx.closePath();
    paint(ctx, bone, -r, cy - r, r * 2, r * 2, { light: 0.4, dark: 0.42, lw: 1 });
    // sockets, nose, teeth
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#0e0c16'; ell(ctx, s * r * 0.42, cy - r * 0.24, r * 0.3, r * 0.26, s * 0.12); ctx.fill();
      glow(ctx, s * r * 0.42, cy - r * 0.24, r * 0.55, c, 1);
      ctx.fillStyle = lt(c, 0.55); circ(ctx, s * r * 0.42, cy - r * 0.22, r * 0.1); ctx.fill();
    }
    ctx.fillStyle = '#0e0c16'; poly(ctx, [[0, cy + r * 0.05], [r * 0.16, cy + r * 0.38], [-r * 0.16, cy + r * 0.38]]); ctx.fill();
    ctx.strokeStyle = '#0e0c16'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-r * 0.42, cy + r * 0.62); ctx.lineTo(r * 0.42, cy + r * 0.62);
    for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * 0.19, cy + r * 0.5); ctx.lineTo(i * r * 0.19, cy + r * 0.92); } ctx.stroke();
    ctx.strokeStyle = al(dk(bone, 0.45), 0.55); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-r * 0.5, cy - r * 0.75); ctx.quadraticCurveTo(0, cy - r * 0.55, r * 0.5, cy - r * 0.78); ctx.stroke();
    // spectral hands + weapon
    if (l.weapon && l.weapon !== 'none') {
      const hx2 = H * 0.3, hy2 = -H * 0.5;
      ctx.strokeStyle = al(lt(c, 0.3), 0.6); ctx.lineWidth = H * 0.05;
      ctx.beginPath(); ctx.moveTo(r * 0.5, cy + r * 0.7); ctx.quadraticCurveTo(H * 0.24, -H * 0.62, hx2, hy2); ctx.stroke();
      ctx.fillStyle = al(lt(bone, 0.2), 0.9); circ(ctx, hx2, hy2, H * 0.05); ctx.fill();
      drawWeapon(ctx, l, l.weapon, hx2, hy2, -1.0 + (pose.swing || 0) * 1.3, H, pose, !!l.hero, false);
    }
    if (l.helm === 'crown' || l.helm === 'circlet' || (l.tier | 0) >= 4) { drawHelm(ctx, l, 0, cy, r, l.helm === 'circlet' ? 'circlet' : 'crown', 1, !!l.hero); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- eldritch horrors
  function drawEldritch(ctx, l, pose, H) {
    const base = l.tint || '#3f4a6a', c = l.glow || '#3fd0c0', accent = l.accent || '#d040a0';
    const cy = -H * 0.62 + Math.sin((pose.f || 0) * 1.1) * H * 0.04;
    const wob = Math.sin((pose.f || 0) * 1.6) * H * 0.04;
    ctx.save(); ctx.translate(pose.lunge * 0.35, 0);
    glow(ctx, 0, cy + H * 0.1, H * 0.85, c, 0.35);
    // writhing tentacles below & behind
    for (let i = 0; i < 7; i++) {
      const dir = i % 2 ? 1 : -1, k = (i / 2) | 0, near = i > 3;
      const col = near ? base : dk(base, 0.3);
      const x0 = dir * H * 0.06 * (k + 1), y0 = cy + H * 0.22;
      const x1 = dir * H * (0.28 + k * 0.16) + wob, y1 = cy + H * (0.46 + k * 0.05);
      const x2 = dir * H * (0.42 + k * 0.26) + wob * 1.6, y2 = -H * 0.01;
      const w2 = H * (0.062 - k * 0.011);
      ctx.strokeStyle = OUT; ctx.lineWidth = w2 * 2 + 1.2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke();
      ctx.strokeStyle = Art.grad(ctx, x0, y0, x2, y2, [[0, lt(col, 0.2)], [1, dk(col, 0.3)]]); ctx.lineWidth = w2 * 2; ctx.stroke();
      ctx.fillStyle = al(accent, 0.55);
      for (let s = 1; s < 4; s++) { const t = s / 4, px = M.lerp(M.lerp(x0, x1, t), M.lerp(x1, x2, t), t), py = M.lerp(M.lerp(y0, y1, t), M.lerp(y1, y2, t), t); circ(ctx, px, py, w2 * (0.3 - t * 0.1)); ctx.fill(); }
      if (i === 3) {
        // central amorphous mass
        blob(ctx, [[-H * 0.3, cy + H * 0.2], [-H * 0.34, cy - H * 0.18], [-H * 0.14, cy - H * 0.42], [H * 0.12, cy - H * 0.46],
          [H * 0.34, cy - H * 0.16], [H * 0.32, cy + H * 0.16], [H * 0.1, cy + H * 0.34], [-H * 0.12, cy + H * 0.32]]);
        paint(ctx, base, -H * 0.34, cy - H * 0.46, H * 0.68, H * 0.8, { light: 0.3, dark: 0.5, lw: 1 });
        ctx.save(); blob(ctx, [[-H * 0.3, cy + H * 0.2], [-H * 0.34, cy - H * 0.18], [-H * 0.14, cy - H * 0.42], [H * 0.12, cy - H * 0.46],
          [H * 0.34, cy - H * 0.16], [H * 0.32, cy + H * 0.16], [H * 0.1, cy + H * 0.34], [-H * 0.12, cy + H * 0.32]]); ctx.clip();
        ctx.fillStyle = al(accent, 0.3); for (let s = 0; s < 5; s++) { ell(ctx, -H * 0.2 + s * H * 0.11, cy - H * 0.2 + (s % 2) * H * 0.22, H * 0.09, H * 0.05, -0.4); ctx.fill(); }
        ctx.fillStyle = Art.grad(ctx, -H * 0.3, cy - H * 0.4, H * 0.3, cy + H * 0.3, [[0, 'rgba(210,255,246,0.26)'], [0.5, 'rgba(210,255,246,0)'], [1, 'rgba(8,10,44,0.5)']]); ctx.fillRect(-H * 0.5, cy - H * 0.6, H, H * 1.1); ctx.restore();
        // eyes, several, of different sizes
        const eyes = [[0.06, -0.2, 0.09], [-0.15, -0.04, 0.06], [0.2, 0.02, 0.055], [-0.04, 0.12, 0.045], [0.12, -0.34, 0.04]];
        for (const e of eyes) {
          const ex2 = H * e[0], ey2 = cy + H * e[1], er = H * e[2];
          glow(ctx, ex2, ey2, er * 2.4, c, 0.7);
          ell(ctx, ex2, ey2, er, er * 0.88); paint(ctx, '#f2f6ee', ex2 - er, ey2 - er, er * 2, er * 2, { light: 0.4, dark: 0.35, lw: 0.6 });
          ctx.fillStyle = '#12101a'; ell(ctx, ex2 + er * 0.1, ey2, er * 0.3, er * 0.6); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.8)'; circ(ctx, ex2 - er * 0.3, ey2 - er * 0.32, er * 0.2); ctx.fill();
        }
        // maw
        ctx.fillStyle = '#1a0e1e'; ell(ctx, H * 0.02, cy + H * 0.24, H * 0.13, H * 0.06, 0.05); ctx.fill();
        ctx.fillStyle = '#f2ecd8'; for (let s = 0; s < 5; s++) { poly(ctx, [[H * (-0.09 + s * 0.045), cy + H * 0.2], [H * (-0.07 + s * 0.045), cy + H * 0.28], [H * (-0.05 + s * 0.045), cy + H * 0.2]]); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- plants, insects, slimes
  function drawPlant(ctx, l, pose, H) {
    const base = l.tint || '#4c7a3a', leaf = lt(base, 0.25), maw = mix(base, '#a83a5a', 0.65);
    const sway = Math.sin((pose.f || 0) * 1.2) * H * 0.04 + (pose.swing || 0) * H * 0.05;
    const topY = -H * 0.82;
    ctx.save(); ctx.translate(pose.lunge * 0.4, 0);
    // root bulb + leaves
    ell(ctx, 0, -H * 0.06, H * 0.3, H * 0.1);
    paint(ctx, dk(base, 0.3), -H * 0.3, -H * 0.16, H * 0.6, H * 0.2, { light: 0.3, dark: 0.45, lw: 0.8 });
    for (let i = 0; i < 5; i++) {
      const a = -2.9 + i * 0.62, len = H * (0.34 + (i % 2) * 0.1);
      ctx.beginPath(); ctx.moveTo(0, -H * 0.1);
      ctx.quadraticCurveTo(Math.cos(a) * len * 0.5 - H * 0.04, -H * 0.1 + Math.sin(a) * len * 0.5, Math.cos(a) * len, -H * 0.06 + Math.sin(a) * len * 0.55);
      ctx.quadraticCurveTo(Math.cos(a) * len * 0.55 + H * 0.06, -H * 0.1 + Math.sin(a) * len * 0.42, 0, -H * 0.02); ctx.closePath();
      paint(ctx, i % 2 ? leaf : base, -len, -H * 0.4, len * 2, H * 0.4, { light: 0.35, dark: 0.45, lw: 0.7 });
      ctx.strokeStyle = al(dk(base, 0.5), 0.5); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, -H * 0.08); ctx.lineTo(Math.cos(a) * len * 0.9, -H * 0.07 + Math.sin(a) * len * 0.5); ctx.stroke();
    }
    // stalk
    ctx.beginPath(); ctx.moveTo(-H * 0.07, -H * 0.08); ctx.quadraticCurveTo(-H * 0.1 + sway, topY * 0.55, -H * 0.05 + sway, topY + H * 0.1);
    ctx.lineTo(H * 0.07 + sway, topY + H * 0.1); ctx.quadraticCurveTo(H * 0.1 + sway, topY * 0.55, H * 0.07, -H * 0.08); ctx.closePath();
    paint(ctx, base, -H * 0.12, topY, H * 0.26, -topY, { light: 0.32, dark: 0.48, lw: 0.9 });
    ctx.strokeStyle = al(dk(base, 0.5), 0.45); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-H * 0.02, -H * 0.1); ctx.quadraticCurveTo(-H * 0.04 + sway, topY * 0.5, -H * 0.01 + sway, topY + H * 0.12); ctx.stroke();
    // maw head
    const hx2 = sway, hy2 = topY, open = pose.anim === 'attack' ? 0.45 + (pose.swing || 0) * 0.35 : 0.2;
    ctx.save(); ctx.translate(hx2, hy2);
    for (const s of [1, -1]) {
      ctx.save(); ctx.rotate(s * open);
      ctx.beginPath(); ctx.moveTo(-H * 0.1, 0); ctx.quadraticCurveTo(H * 0.05, -s * H * 0.2, H * 0.24, -s * H * 0.06);
      ctx.quadraticCurveTo(H * 0.08, -s * H * 0.02, -H * 0.1, 0); ctx.closePath();
      paint(ctx, s > 0 ? mix(base, maw, 0.35) : base, -H * 0.1, -H * 0.2, H * 0.34, H * 0.2, { light: 0.32, dark: 0.45, lw: 0.8 });
      ctx.fillStyle = '#f2ecd8'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.4;
      for (let i = 0; i < 4; i++) { poly(ctx, [[H * (0.16 - i * 0.06), -s * H * 0.035], [H * (0.14 - i * 0.06), s * H * 0.035], [H * (0.11 - i * 0.06), -s * H * 0.03]]); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = al(maw, 0.9); ell(ctx, H * 0.02, 0, H * 0.1, H * 0.06); ctx.fill();
    if (l.glow || l.element) glow(ctx, H * 0.02, 0, H * 0.22, l.glow || ELEMENT[l.element], 0.5);
    ctx.restore();
    // vines with buds
    ctx.strokeStyle = dk(base, 0.2); ctx.lineWidth = H * 0.022;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * H * 0.06, -H * 0.2); ctx.quadraticCurveTo(s * H * 0.3, -H * 0.4, s * H * 0.26 + sway * 0.5, -H * 0.6); ctx.stroke(); ctx.fillStyle = mix(base, '#e0c04a', 0.5); circ(ctx, s * H * 0.26 + sway * 0.5, -H * 0.62, H * 0.035); ctx.fill(); }
    ctx.restore();
  }

  function drawInsect(ctx, l, pose, H) {
    const base = l.tint || '#8a6a2a', chit = lt(base, 0.2), eye = l.eyes || '#2a2018';
    const bodyY = -H * 0.42, step = (pose.stride || 0) * H * 0.06;
    ctx.save(); ctx.translate(pose.lunge * 0.4, -pose.bob * 0.4);
    // legs (3 per side)
    for (const side of [0, 1]) {
      const col = side ? base : dk(base, 0.32), w2 = H * (side ? 0.028 : 0.024);
      for (let i = 0; i < 3; i++) {
        const dir = i === 0 ? 1 : i === 1 ? 0.1 : -1;
        const ax = dir * H * 0.2, kx = ax + dir * H * 0.26 + (side ? step : -step), ky = bodyY - H * 0.12;
        const fx = ax + dir * H * 0.44 + (side ? step * 1.6 : -step * 1.6);
        ctx.strokeStyle = OUT; ctx.lineWidth = w2 + 1.2; ctx.beginPath(); ctx.moveTo(ax, bodyY + (side ? H * 0.04 : 0)); ctx.lineTo(kx, ky); ctx.lineTo(fx, -H * 0.005); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = w2; ctx.stroke();
      }
      if (!side) {
        // abdomen + thorax
        ell(ctx, -H * 0.3, bodyY - H * 0.02, H * 0.27, H * 0.17, -0.12);
        paint(ctx, base, -H * 0.58, bodyY - H * 0.2, H * 0.56, H * 0.36, { light: 0.32, dark: 0.48, lw: 0.9 });
        ctx.strokeStyle = al(dk(base, 0.55), 0.6); ctx.lineWidth = 0.7;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-H * 0.3, bodyY - H * 0.02, H * (0.16 - i * 0.035), -1.1, 1.1); ctx.stroke(); }
        ell(ctx, H * 0.02, bodyY, H * 0.2, H * 0.15, 0.06);
        paint(ctx, chit, -H * 0.18, bodyY - H * 0.16, H * 0.4, H * 0.32, { light: 0.34, dark: 0.45, lw: 0.9 });
        // wing cases
        ctx.save(); ctx.globalAlpha *= 0.85;
        ell(ctx, -H * 0.16, bodyY - H * 0.12, H * 0.26, H * 0.1, -0.2);
        paint(ctx, dk(base, 0.12), -H * 0.42, bodyY - H * 0.26, H * 0.52, H * 0.2, { light: 0.4, dark: 0.4, lw: 0.7 }); ctx.restore();
      }
    }
    // head
    const hxp = H * 0.24, hyp = bodyY - H * 0.02, hr2 = H * 0.12;
    ell(ctx, hxp, hyp, hr2, hr2 * 0.9, 0.1);
    paint(ctx, chit, hxp - hr2, hyp - hr2, hr2 * 2, hr2 * 2, { light: 0.34, dark: 0.45, lw: 0.9 });
    // compound eyes
    for (const s of [0, 1]) {
      const ex2 = hxp + hr2 * (0.45 - s * 0.55), ey2 = hyp - hr2 * (0.2 + s * 0.05), er = hr2 * (0.42 - s * 0.1);
      ell(ctx, ex2, ey2, er, er * 0.86); paint(ctx, l.eyes || '#3a2a18', ex2 - er, ey2 - er, er * 2, er * 2, { light: 0.55, dark: 0.4, lw: 0.5 });
      ctx.strokeStyle = al('#ffffff', 0.25); ctx.lineWidth = 0.35; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(ex2 - er, ey2 + i * er * 0.45); ctx.lineTo(ex2 + er, ey2 + i * er * 0.45); ctx.stroke(); }
    }
    // antennae + mandibles
    ctx.strokeStyle = dk(base, 0.3); ctx.lineWidth = H * 0.014;
    for (const s of [-0.2, 0.3]) { ctx.beginPath(); ctx.moveTo(hxp + hr2 * s, hyp - hr2 * 0.7); ctx.quadraticCurveTo(hxp + hr2 * (s + 1.2), hyp - hr2 * 1.8, hxp + hr2 * (s + 2.4), hyp - hr2 * 1.5); ctx.stroke(); }
    ctx.fillStyle = dk(base, 0.4); ctx.strokeStyle = OUT; ctx.lineWidth = 0.5;
    const mo = pose.anim === 'attack' ? hr2 * 0.4 : 0;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hxp + hr2 * 0.6, hyp + hr2 * (0.3 + s * 0.1)); ctx.quadraticCurveTo(hxp + hr2 * 1.6, hyp + hr2 * (0.5 + s * 0.4) + mo * s, hxp + hr2 * 1.5, hyp + hr2 * (1.0 + s * 0.2) + mo * s); ctx.quadraticCurveTo(hxp + hr2 * 1.1, hyp + hr2 * (0.6 + s * 0.2), hxp + hr2 * 0.55, hyp + hr2 * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (l.glow) glow(ctx, -H * 0.3, bodyY, H * 0.3, l.glow, 0.5);
    ctx.restore();
  }

  function drawSlime(ctx, l, pose, H) {
    const base = l.tint || (l.element ? ELEMENT[l.element] : '#5ac06a');
    const wob = Math.sin((pose.f || 0) * 1.5) * 0.08 + (pose.anim === 'attack' ? (pose.swing || 0) * 0.1 : 0);
    const R = H * 0.42, h2 = H * (0.5 + wob * 0.5);
    ctx.save(); ctx.translate(pose.lunge * 0.4, 0);
    ctx.beginPath();
    ctx.moveTo(-R * (1 + wob), -H * 0.02);
    ctx.quadraticCurveTo(-R * (1.05 + wob), -h2 * 0.85, 0, -h2);
    ctx.quadraticCurveTo(R * (1.05 - wob), -h2 * 0.8, R * (1 - wob), -H * 0.02);
    ctx.quadraticCurveTo(0, H * 0.04, -R * (1 + wob), -H * 0.02);
    ctx.closePath();
    ctx.save(); ctx.globalAlpha *= 0.86;
    ctx.fillStyle = Art.grad(ctx, -R, -h2, R * 0.6, 0, [[0, al(lt(base, 0.55), 0.95)], [0.45, al(base, 0.85)], [1, al(dk(base, 0.4), 0.95)]]);
    ctx.fill(); ctx.strokeStyle = al(dk(base, 0.5), 0.7); ctx.lineWidth = 0.9; ctx.stroke();
    ctx.restore();
    ctx.save(); ctx.beginPath();
    ctx.moveTo(-R * (1 + wob), -H * 0.02); ctx.quadraticCurveTo(-R * (1.05 + wob), -h2 * 0.85, 0, -h2);
    ctx.quadraticCurveTo(R * (1.05 - wob), -h2 * 0.8, R * (1 - wob), -H * 0.02); ctx.quadraticCurveTo(0, H * 0.04, -R * (1 + wob), -H * 0.02); ctx.closePath(); ctx.clip();
    // inner bubbles + swallowed bones
    ctx.fillStyle = al(lt(base, 0.65), 0.5);
    for (let i = 0; i < 5; i++) { const a = (l.seed || 0) + i * 41; circ(ctx, -R * 0.5 + (a % 100) / 100 * R, -h2 * 0.2 - ((a * 7) % 100) / 100 * h2 * 0.6, R * (0.06 + (a % 5) * 0.02)); ctx.fill(); }
    ctx.fillStyle = al('#efe8d0', 0.65); ell(ctx, R * 0.22, -h2 * 0.28, R * 0.2, R * 0.07, -0.4); ctx.fill(); ell(ctx, -R * 0.3, -h2 * 0.5, R * 0.14, R * 0.05, 0.5); ctx.fill();
    ctx.fillStyle = Art.rgrad(ctx, -R * 0.35, -h2 * 0.75, 0, R * 1.6, [[0, 'rgba(255,255,255,0.55)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(10,16,44,0.35)']]); ctx.fillRect(-R * 1.4, -h2 * 1.2, R * 2.8, h2 * 1.4);
    ctx.restore();
    // eyes
    for (const s of [-1, 1]) {
      const ex2 = s * R * 0.26 + R * 0.06, ey2 = -h2 * 0.58, er = R * 0.14;
      ctx.fillStyle = '#f6f4ec'; ell(ctx, ex2, ey2, er, er * 0.9); ctx.fill(); ctx.strokeStyle = al(dk(base, 0.5), 0.5); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.fillStyle = '#16121e'; circ(ctx, ex2 + er * 0.2, ey2 + er * 0.05, er * 0.45); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; circ(ctx, ex2 - er * 0.15, ey2 - er * 0.25, er * 0.2); ctx.fill();
    }
    ctx.strokeStyle = al(dk(base, 0.6), 0.6); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-R * 0.12, -h2 * 0.32); ctx.quadraticCurveTo(R * 0.1, -h2 * (pose.anim === 'attack' ? 0.14 : 0.24), R * 0.32, -h2 * 0.34); ctx.stroke();
    // drip
    ctx.fillStyle = al(base, 0.8); ell(ctx, R * 0.6, -H * 0.02, R * 0.12, R * 0.07); ctx.fill();
    if (l.glow) glow(ctx, 0, -h2 * 0.45, R * 1.5, l.glow, 0.35);
    ctx.restore();
  }

  // ================================================================ (part 5) DIRECT DRAW, PORTRAITS, BANNERS, DEMO
  /** draw a unit straight into ctx without the sprite cache — crisp at any scale (demo / portraits) */
  UnitArt.drawDirect = function (ctx, x, y, o) {
    o = o || {};
    let look = o.look;
    if (!look && o.unitType) look = UnitArt.resolveLook(o.unitType, o.formLook, o.player);
    look = normLook(look);
    if (o.playerColor && look.cloth !== o.playerColor) look = Object.assign({}, look, { cloth: o.playerColor, cloth2: o.playerColor2 || C.hex(lt(o.playerColor, 0.6)), __norm: true });
    const hero = !!(o.hero || look.hero), s = o.scale || 1;
    const mt = UnitArt.metrics(look, hero), anim = o.anim || 'idle', n = FRAMES[anim] || 1;
    const frame = (((o.frame | 0) % n) + n) % n;
    // hero gold wash and hit flash composite with 'source-atop', which would tint whatever is already on the
    // target canvas — render those through an own-scale layer so they only ever touch the unit's own pixels.
    if (hero || anim === 'hit') {
      const lw2 = Math.ceil(mt.w / RS * s) + 4, lh = Math.ceil(mt.h / RS * s) + 4;
      const lay = Art.canvas(lw2, lh);
      lay.ctx.translate(lw2 / 2, lh * mt.feetY);
      lay.ctx.scale(s, s);
      lay.ctx.lineJoin = 'round'; lay.ctx.lineCap = 'round';
      drawUnit(lay.ctx, look, anim, frame, hero, mt);
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      ctx.translate(x, y);
      if (o.facing === 'left') ctx.scale(-1, 1);
      ctx.drawImage(lay.cv, -lw2 / 2, -lh * mt.feetY);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.facing === 'left' ? -s : s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    drawUnit(ctx, look, anim, frame, hero, mt);
    ctx.restore();
  };

  // ---------------------------------------------------------------- pixel bounds (framing + smoke tests)
  const boundsCache = new Map();
  /**
   * Tight pixel bounds of a rendered sprite in world px relative to the feet anchor (x=0 centre, y=0 feet).
   * → {x0,y0,x1,y1,w,h,pixels,empty}. Used for gallery framing, portrait cropping and the headless smoke test.
   */
  UnitArt.bounds = function (look, o) {
    o = o || {};
    const p = paramsFor(normLook(look), o.anim || 'idle', o.frame || 0, !!o.hero);
    const key = JSON.stringify(p);
    let b = boundsCache.get(key);
    if (b) return b;
    const s = Art.get('unit', p);
    let x0 = s.w, y0 = s.h, x1 = -1, y1 = -1, n = 0;
    try {
      const d = s.cv.getContext('2d').getImageData(0, 0, s.w, s.h).data;
      for (let y = 0; y < s.h; y++) {
        const row = y * s.w;
        for (let x = 0; x < s.w; x++) {
          if (d[(row + x) * 4 + 3] > 8) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
      }
    } catch (e) { x0 = 0; y0 = 0; x1 = s.w - 1; y1 = s.h - 1; n = -1; }
    b = x1 < 0
      ? { empty: true, pixels: 0, x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 }
      : { empty: false, pixels: n, x0: (x0 - s.ax) / RS, y0: (y0 - s.ay) / RS, x1: (x1 + 1 - s.ax) / RS, y1: (y1 + 1 - s.ay) / RS, w: (x1 + 1 - x0) / RS, h: (y1 + 1 - y0) / RS };
    if (boundsCache.size > 3000) boundsCache.clear();
    boundsCache.set(key, b);
    return b;
  };

  // ---------------------------------------------------------------- portrait
  const AFF_COLORS = { order: ['#e8c357', '#8a6a1c'], chaos: ['#e0452b', '#7a1e12'], nature: ['#5fb043', '#2c5e1c'],
    materium: ['#c07a2a', '#6a3f12'], astral: ['#5a7ff0', '#27357a'], shadow: ['#7b3fa0', '#3a1a52'] };
  function portraitBg(ctx, size, aff, pc, seed) {
    const pair = AFF_COLORS[aff] || [pc || '#6a7488', dk(pc || '#3a4050', 0.55)];
    const c2 = pair[0], c1 = pair[1];
    ctx.fillStyle = Art.rgrad(ctx, size * 0.42, size * 0.3, size * 0.05, size * 0.95,
      [[0, lt(c2, 0.45)], [0.35, mix(c2, c1, 0.45)], [0.75, c1], [1, dk(c1, 0.55)]]);
    ctx.fillRect(0, 0, size, size);
    // painterly diagonal brush strokes
    ctx.save(); ctx.globalAlpha = 0.16;
    for (let i = 0; i < 14; i++) {
      const t = ((seed || 0) * 7 + i * 53) % 100 / 100;
      ctx.strokeStyle = i % 2 ? lt(c2, 0.5) : dk(c1, 0.4);
      ctx.lineWidth = size * (0.02 + t * 0.06); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-size * 0.1 + t * size * 1.2, size * 1.15); ctx.lineTo(size * 0.25 + t * size * 1.1, -size * 0.15); ctx.stroke();
    }
    ctx.restore();
    // light rays behind the subject
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.2;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.26;
      ctx.fillStyle = Art.grad(ctx, size * 0.5, size * 0.55, size * 0.5 + Math.cos(a) * size, size * 0.55 + Math.sin(a) * size, [[0, al(lt(c2, 0.6), 0.5)], [1, al(c2, 0)]]);
      poly(ctx, [[size * 0.5, size * 0.62], [size * 0.5 + Math.cos(a - 0.07) * size * 1.3, size * 0.55 + Math.sin(a - 0.07) * size * 1.3], [size * 0.5 + Math.cos(a + 0.07) * size * 1.3, size * 0.55 + Math.sin(a + 0.07) * size * 1.3]]);
      ctx.fill();
    }
    ctx.restore();
    // ground haze
    ctx.fillStyle = Art.grad(ctx, 0, size * 0.55, 0, size, [[0, 'rgba(12,10,26,0)'], [1, 'rgba(12,10,26,0.72)']]);
    ctx.fillRect(0, size * 0.5, size, size * 0.5);
  }
  function paintPortrait(ctx, w, h, p) {
    const size = w, look = normLook(p.look || {}), hero = !!p.hero;
    const pc = p.playerColor || look.cloth || '#6a7488';
    const framed = p.frame !== false && p.frame !== 0;
    const pad = framed ? Math.max(2, size * 0.035) : 0, rr = size * 0.07;
    ctx.save();
    Art.rrect(ctx, pad, pad, size - pad * 2, size - pad * 2, rr); ctx.clip();
    portraitBg(ctx, size, p.affinity, pc, look.seed);
    // subject
    const mt = UnitArt.metrics(look, hero), H = mt.H;
    let scale, feetY;
    if (HUMANOID[look.body] || MOUNTED[look.body] || look.body === 'drake') {
      const hm = humanMetrics(look, H);
      const hy = MOUNTED[look.body] ? -H * 1.2 : look.body === 'drake' ? -H * 1.06 : hm.headCY;
      const hr2 = MOUNTED[look.body] || look.body === 'drake' ? H * 0.085 : hm.headR;
      scale = size * 0.17 / hr2;
      feetY = size * 0.44 - hy * scale;
    } else {
      const full = mt.h / RS;
      scale = size * 0.9 / full;
      feetY = size * 0.06 + 0.86 * full * scale;
    }
    ctx.save();
    ctx.translate(size * 0.5, 0);
    // contact shadow under a full-body subject
    if (!(HUMANOID[look.body] || MOUNTED[look.body])) Art.shadow(ctx, 0, feetY, size * 0.5, size * 0.1, 0.4);
    UnitArt.drawDirect(ctx, 0, feetY, { look: look, anim: p.anim || 'idle', frame: p.pframe || 0, hero: hero, scale: scale, playerColor: p.playerColor, playerColor2: p.playerColor2 });
    ctx.restore();
    // painterly vignette + colour grade
    ctx.fillStyle = Art.rgrad(ctx, size * 0.45, size * 0.4, size * 0.3, size * 0.78, [[0, 'rgba(0,0,0,0)'], [0.7, 'rgba(10,8,22,0.25)'], [1, 'rgba(8,6,18,0.72)']]);
    ctx.fillRect(0, 0, size, size);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.14;
    ctx.fillStyle = Art.grad(ctx, 0, 0, size * 0.8, size * 0.8, [[0, '#ffe9c0'], [0.6, 'rgba(255,233,192,0)']]); ctx.fillRect(0, 0, size, size);
    ctx.restore();
    if (hero) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, size * 0.5, size * 0.42, size * 0.55, '#ffd870', 0.2); ctx.restore(); }
    ctx.restore();
    // frame
    if (framed) {
      const g = AOW.Palette ? AOW.Palette.ui.gold : '#c9a24a', gl = AOW.Palette ? AOW.Palette.ui.goldLight : '#f1d98a';
      Art.rrect(ctx, pad, pad, size - pad * 2, size - pad * 2, rr);
      ctx.strokeStyle = Art.grad(ctx, 0, 0, size, size, [[0, gl], [0.45, hero ? gl : g], [1, dk(g, 0.45)]]);
      ctx.lineWidth = Math.max(1.5, size * 0.028); ctx.stroke();
      ctx.strokeStyle = 'rgba(12,10,24,0.65)'; ctx.lineWidth = Math.max(0.8, size * 0.008);
      Art.rrect(ctx, pad * 0.45, pad * 0.45, size - pad * 0.9, size - pad * 0.9, rr * 1.1); ctx.stroke();
      Art.rrect(ctx, pad + size * 0.024, pad + size * 0.024, size - pad * 2 - size * 0.048, size - pad * 2 - size * 0.048, rr * 0.7);
      ctx.strokeStyle = al(gl, 0.35); ctx.lineWidth = Math.max(0.6, size * 0.006); ctx.stroke();
      // corner studs
      ctx.fillStyle = gl;
      for (const cx2 of [pad + size * 0.035, size - pad - size * 0.035]) for (const cy2 of [pad + size * 0.035, size - pad - size * 0.035]) { circ(ctx, cx2, cy2, size * 0.016); ctx.fill(); }
      if (hero) { ctx.fillStyle = gl; Art.star(ctx, size * 0.5, pad + size * 0.03, size * 0.045, size * 0.018, 5); ctx.fill(); ctx.strokeStyle = 'rgba(40,28,8,0.6)'; ctx.lineWidth = 0.8; ctx.stroke(); }
    }
  }
  Art.sprite('unit_portrait', 96, 96, function (ctx, w, h, p) { paintPortrait(ctx, w, h, p); },
    { anchor: { x: 0.5, y: 0.5 }, sizeFn: p => ({ w: p.size || 96, h: p.size || 96 }) });

  /**
   * Bust portrait canvas.
   *   portrait(look, {size=96, playerColor, playerColor2, affinity, frame=true, hero, anim, pframe})
   *   portrait(unitType, look, playerColor, size)      ← legacy SPEC §6 signature (still supported)
   */
  UnitArt.portrait = function (a0, a1, a2, a3) {
    const isLook = x => !!x && typeof x === 'object' && (x.body !== undefined || x.skin !== undefined || x.armor !== undefined || x.weapon !== undefined || x.__norm);
    let look, o;
    if (isLook(a1) || typeof a2 === 'string' || typeof a3 === 'number') {
      look = isLook(a1) ? a1 : (a0 && a0.look) || {};
      o = { size: a3 || 96, playerColor: typeof a2 === 'string' ? a2 : null, hero: !!(a0 && ((a0.role === 'hero') || (a0.tags && a0.tags.indexOf('hero') >= 0))) };
      if (a0 && a0.affinity) o.affinity = Object.keys(a0.affinity)[0];
    } else {
      look = isLook(a0) ? a0 : (a0 && a0.look) || {};
      o = a1 || {};
    }
    const l = normLook(look);
    const size = Math.max(16, Math.round(o.size || 96));
    const pc = o.playerColor || l.cloth;
    const params = {
      look: KEY_FIELDS.reduce((acc, k) => { if (l[k] !== undefined && l[k] !== null && l[k] !== false) acc[k] = l[k]; return acc; }, {}),
      size: size, playerColor: pc || null, playerColor2: o.playerColor2 || null, affinity: o.affinity || null,
      frame: o.frame === false ? 0 : 1, hero: (o.hero || l.hero) ? 1 : 0, anim: o.anim || 'idle', pframe: o.pframe | 0,
    };
    if (pc) { params.look.cloth = pc; params.look.cloth2 = o.playerColor2 || C.hex(lt(pc, 0.6)); }
    return Art.get('unit_portrait', params).cv;
  };
  UnitArt.portraitURL = function (look, o) { try { return UnitArt.portrait(look, o).toDataURL('image/png'); } catch (e) { return ''; } };

  // ---------------------------------------------------------------- army banner
  const BANNER_SHAPES = ['pennant', 'square', 'swallow', 'round', 'spear'];
  UnitArt.BANNER_SHAPES = BANNER_SHAPES;
  function bannerFlag(ctx, shape, x, y, w, h, wave) {
    ctx.beginPath();
    const wv = t => Math.sin(t * 3.1 + wave) * h * 0.09;
    if (shape === 'pennant') {
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * 0.5, y + wv(0.5) - h * 0.04, x + w, y + h * 0.42 + wv(1));
      ctx.quadraticCurveTo(x + w * 0.45, y + h * 0.62 + wv(0.6), x, y + h * 0.8); ctx.closePath();
    } else if (shape === 'swallow') {
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * 0.5, y + wv(0.5) - h * 0.03, x + w, y + wv(1));
      ctx.lineTo(x + w * 0.66, y + h * 0.42 + wv(0.66)); ctx.lineTo(x + w, y + h * 0.82 + wv(1));
      ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.9 + wv(0.5), x, y + h); ctx.closePath();
    } else if (shape === 'round') {
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * 0.55, y + wv(0.5) - h * 0.05, x + w * 0.95, y + h * 0.5 + wv(1));
      ctx.quadraticCurveTo(x + w * 0.55, y + h * 1.05 + wv(0.5), x, y + h); ctx.closePath();
    } else if (shape === 'spear') {
      ctx.moveTo(x, y + h * 0.08); ctx.quadraticCurveTo(x + w * 0.6, y + wv(0.6), x + w * 1.12, y + h * 0.5 + wv(1));
      ctx.quadraticCurveTo(x + w * 0.6, y + h * 0.95 + wv(0.6), x, y + h * 0.9); ctx.closePath();
    } else {
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * 0.5, y + wv(0.5) - h * 0.05, x + w, y + wv(1));
      ctx.lineTo(x + w, y + h + wv(1)); ctx.quadraticCurveTo(x + w * 0.5, y + h * 1.05 + wv(0.5), x, y + h); ctx.closePath();
    }
  }
  /** army stack banner: pole + flag in the player's colours, unit-count badge, hero star */
  UnitArt.armyBanner = function (ctx, x, y, o) {
    o = o || {};
    const pc = o.playerColor || '#3f7fe0', pc2 = o.playerColor2 || C.hex(lt(pc, 0.6));
    const shape = BANNER_SHAPES.indexOf(o.bannerShape) >= 0 ? o.bannerShape : 'pennant';
    const s = o.scale || 1, wave = (o.frame || 0) * 0.9;
    const gold = AOW.Palette ? AOW.Palette.ui.gold : '#c9a24a', goldL = AOW.Palette ? AOW.Palette.ui.goldLight : '#f1d98a';
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineJoin = 'round';
    const poleTop = -30, poleBot = 4, fw = 21, fh = 15;
    // pole
    Art.rrect(ctx, -1.3, poleTop, 2.6, poleBot - poleTop, 1.2);
    ctx.fillStyle = Art.grad(ctx, -1.3, 0, 1.3, 0, [[0, '#8a6a46'], [0.45, '#5a4028'], [1, '#2e2014']]); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.7; ctx.stroke();
    // finial
    poly(ctx, [[0, poleTop - 6], [2.2, poleTop - 1.5], [0, poleTop + 1.5], [-2.2, poleTop - 1.5]]);
    ctx.fillStyle = Art.grad(ctx, -2, poleTop - 6, 2, poleTop + 1, [[0, goldL], [0.5, gold], [1, dk(gold, 0.5)]]); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.6; ctx.stroke();
    // flag
    bannerFlag(ctx, shape, 1, poleTop + 2, fw, fh, wave);
    ctx.fillStyle = Art.grad(ctx, 1, poleTop + 2, 1 + fw, poleTop + 2 + fh, [[0, lt(pc, 0.35)], [0.45, pc], [1, dk(pc, 0.45)]]);
    ctx.fill();
    ctx.save(); ctx.clip();
    // heraldic band + folds
    ctx.fillStyle = al(pc2, 0.85); ctx.fillRect(1, poleTop + 2 + fh * 0.62, fw + 4, fh * 0.2);
    ctx.strokeStyle = al(dk(pc, 0.5), 0.45); ctx.lineWidth = 0.7;
    for (let i = 1; i < 4; i++) { const fx = 1 + i * fw * 0.26; ctx.beginPath(); ctx.moveTo(fx, poleTop); ctx.lineTo(fx + Math.sin(i + wave) * 1.6, poleTop + 2 + fh * 1.2); ctx.stroke(); }
    ctx.fillStyle = Art.grad(ctx, 1, poleTop, 1, poleTop + fh + 4, [[0, 'rgba(255,246,214,0.22)'], [0.5, 'rgba(255,246,214,0)'], [1, 'rgba(12,12,44,0.3)']]); ctx.fillRect(0, poleTop, fw + 6, fh + 8);
    ctx.restore();
    drawSigil(ctx, o.sigil === undefined ? 1 : o.sigil, 1 + fw * 0.44, poleTop + 2 + fh * 0.4, fh * 0.3, pc2, al('#12101c', 0.5));
    bannerFlag(ctx, shape, 1, poleTop + 2, fw, fh, wave);
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
    // hero star
    if (o.hero) { ctx.fillStyle = goldL; Art.star(ctx, 0, poleTop - 10.5, 4.4, 1.9, 5); ctx.fill(); ctx.strokeStyle = 'rgba(40,28,8,0.7)'; ctx.lineWidth = 0.7; ctx.stroke(); glow(ctx, 0, poleTop - 10.5, 8, '#ffd870', 0.5); }
    // unit-count badge
    if (o.count !== undefined && o.count !== null) {
      const bx = -1, by = poleBot + 3.5, r = 7;
      circ(ctx, bx, by, r);
      ctx.fillStyle = Art.rgrad(ctx, bx - r * 0.3, by - r * 0.4, 0, r * 1.4, [[0, '#333c52'], [1, '#141a28']]); ctx.fill();
      ctx.strokeStyle = gold; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.strokeStyle = 'rgba(10,8,18,0.8)'; ctx.lineWidth = 0.5; circ(ctx, bx, by, r + 0.9); ctx.stroke();
      Art.text(ctx, String(o.count), bx, by + 0.4, { size: 9, color: '#f4ecd6', stroke: 'rgba(0,0,0,0.85)', strokeWidth: 2.4, weight: '700' });
    }
    if (o.frameRing) { ctx.strokeStyle = al(goldL, 0.5); ctx.lineWidth = 0.8; Art.rrect(ctx, -14, poleTop - 12, 40, 52, 4); ctx.stroke(); }
    ctx.restore();
  };

  // ================================================================ demo gallery
  const DEMO_FORMS = ['human', 'elf', 'dwarf', 'orc', 'goblin', 'halfling', 'toadkin', 'molekin', 'ratkin', 'tigran', 'lizardfolk',
    'avian', 'lupine', 'goatkin', 'syron', 'insectoid', 'ogrekin', 'simian', 'elysian', 'ancient', 'harefolk'];
  function formLookOf(id) {
    const D = AOW.Data;
    if (D && D.forms && D.forms[id]) return D.forms[id].look;
    return null;
  }
  UnitArt.demo = function (canvas, q) {
    const getq = k => (q && q.get ? q.get(k) : null);
    const zoom = M.clamp(+(getq('zoom') || 1) || 1, 1, 4);
    const VW = 1600, VH = 1572;   // demo.html has a 28px toolbar, so 1572 is what a 1600px-tall shot shows
    canvas.width = Math.round(VW * zoom); canvas.height = Math.round(VH * zoom);
    const ctx = canvas.getContext('2d');
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const P = AOW.Palette, players = (P && P.players) || ['#3f7fe0', '#d8402f', '#2fa85a', '#e0b83a', '#8f4fd0', '#f07d2c', '#2ab7c8', '#d94fa3'];
    const players2 = (P && P.players2) || ['#c9d9ff', '#ffd0c8', '#c9f5d3', '#fff2b8', '#e6cdff', '#ffd9bd', '#c6f0f5', '#ffd0ee'];
    let drawn = 0;
    ctx.save(); ctx.scale(zoom, zoom);
    // ---- backdrop
    ctx.fillStyle = Art.grad(ctx, 0, 0, 0, VH, [[0, '#1c2132'], [0.5, '#151a28'], [1, '#101321']]);
    ctx.fillRect(0, 0, VW, VH);

    const label = (txt, x, y, col) => Art.text(ctx, txt, x, y, { size: 9, color: col || '#aeb8cd', align: 'center', stroke: 'rgba(0,0,0,0.85)', strokeWidth: 2.6, weight: '600' });
    const heading = (txt, y) => {
      ctx.save(); ctx.fillStyle = 'rgba(255,233,168,0.10)'; ctx.fillRect(0, y - 11, VW, 16); ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(201,162,74,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y + 5.5); ctx.lineTo(VW, y + 5.5); ctx.stroke(); ctx.restore();
      Art.text(ctx, txt, 10, y - 2, { size: 11, color: '#f1d98a', align: 'left', stroke: 'rgba(0,0,0,0.85)', strokeWidth: 3, weight: '700' });
    };
    const ground = (x, y, w) => { ctx.save(); ctx.fillStyle = Art.rgrad(ctx, x, y, 0, w, [[0, 'rgba(150,170,210,0.14)'], [1, 'rgba(150,170,210,0)']]); ell(ctx, x, y, w, w * 0.22); ctx.fill(); ctx.restore(); };
    /** draw `look` scaled by its true pixel bounds to fill a (cw × ch) cell standing on the line (x,y) */
    const fit = (look, x, y, cw, ch, o) => {
      o = o || {};
      const l = normLook(look);
      let s = 1, dy = 0, dx = 0;
      try {
        const b = UnitArt.bounds(l, { anim: o.anim, frame: o.frame, hero: o.hero });
        if (!b.empty) {
          s = Math.min(o.max === undefined ? 2.6 : o.max, ch / Math.max(1, b.y1 - b.y0), cw / Math.max(1, b.w));
          dy = -b.y1 * s;                       // sit the lowest drawn pixel on the baseline
          dx = -((b.x0 + b.x1) / 2) * s;        // centre horizontally
        }
      } catch (e) { /* fall back to scale 1 */ }
      ground(x, y, cw * 0.34);
      try { UnitArt.drawDirect(ctx, x + dx, y + dy, Object.assign({}, o, { look: l, scale: s })); drawn++; }
      catch (e) { Art.text(ctx, '!', x, y - 10, { size: 14, color: '#f66' }); console.error(e); }
      return s;
    };
    const base = over => Object.assign({ body: 'form', armor: 'chain', weapon: 'sword_shield', shield: 'round', helm: 'open',
      size: 'medium', cape: false, tier: 2, seed: 5, cloth: players[0], cloth2: players2[0] }, over);

    Art.text(ctx, 'AOW.UnitArt — procedural unit sprites · 1px ink outline · key light top-left · cool shadows · player-coloured cloth',
      10, 16, { size: 13, color: '#f4ecd6', align: 'left', stroke: 'rgba(0,0,0,0.85)', strokeWidth: 3, weight: '700' });

    // ================= A. 21 forms as racial soldiers
    heading('RACIAL SOLDIERS — all 21 forms (chain + sword & shield, player colours)', 44);
    DEMO_FORMS.forEach((fid, i) => {
      const x = 44 + i * 74, y = 136;
      const fl = formLookOf(fid);
      const ut = { id: 'demo_' + fid, tier: 2, tags: ['racial'], look: { body: 'form', armor: 'chain', weapon: 'sword_shield', shield: 'round', helm: i % 3 === 0 ? 'open' : i % 3 === 1 ? 'cap' : 'none', cape: i % 4 === 0 ? 'short' : false } };
      const look = UnitArt.resolveLook(ut, fl, { color: players[i % 8], color2: players2[i % 8] });
      fit(look, x, y, 70, 82);
      label(fid, x, y + 12, '#d8dcea');
    });

    // ================= B. weapons
    heading('WEAPONS — held, gripped and swung by the same human body (attack frame 3 where marked ▸)', 162);
    const weaponList = ['none', 'sword', 'sword_shield', 'spear', 'spear_shield', 'pike', 'axe', 'great_axe', 'great_sword', 'mace', 'hammer', 'bow', 'crossbow',
      'sling', 'javelin', 'staff', 'orb', 'wand', 'claws', 'daggers', 'halberd', 'lance', 'torch', 'banner', 'instrument', 'tome', 'whip', 'rifle', 'club'];
    weaponList.forEach((wp, i) => {
      const col = i % 15, row = (i / 15) | 0;
      const x = 56 + col * 104, y = 248 + row * 96;
      const atk = i % 3 === 1;
      const look = base({ weapon: wp, shield: wp === 'sword_shield' || wp === 'spear_shield' ? 'kite' : 'none', armor: wp === 'staff' || wp === 'orb' || wp === 'tome' || wp === 'wand' ? 'robe' : 'chain', helm: wp === 'staff' || wp === 'orb' || wp === 'tome' || wp === 'wand' ? 'hood' : 'open', element: i % 5 === 0 ? 'fire' : null, cloth: players[i % 8], cloth2: players2[i % 8] });
      fit(look, x, y, 100, 78, { anim: atk ? 'attack' : 'idle', frame: 3 });
      label(wp + (atk ? ' ▸' : ''), x, y + 12);
    });

    // ================= C. armour & helms
    heading('ARMOUR (8) — cloth folds, mail dots, leather straps, plate ridges, gold ceremonial          HELMS (9) — cap, hood, open, full, crown, horned, wizard hat, circlet', 376);
    UnitArt.ARMORS.forEach((ar, i) => {
      const x = 62 + i * 96, y = 460;
      fit(base({ armor: ar, weapon: 'sword', shield: 'none', helm: ar === 'robe' ? 'hood' : 'open', cape: ar === 'ceremonial' ? 'long' : false, cloth: players[2], cloth2: players2[2] }), x, y, 92, 74);
      label(ar, x, y + 12);
    });
    UnitArt.HELMS.forEach((hm, i) => {
      const x = 856 + i * 82, y = 460;
      fit(base({ helm: hm, armor: hm === 'hood' || hm === 'hat' ? 'robe' : 'plate', weapon: hm === 'hat' ? 'staff' : 'sword', shield: 'none', tier: 3, cloth: players[4], cloth2: players2[4] }), x, y, 78, 74);
      label(hm, x, y + 12);
    });

    // ================= D. shields, capes, hero & element
    heading('SHIELDS (sigils, bosses, rims) · CAPES · HERO GOLD TRIM · ELEMENTAL ENCHANTS · SIZE SCALING', 492);
    const shieldRow = [['none', 'no shield'], ['round', 'round'], ['kite', 'kite'], ['tower', 'tower'], ['buckler', 'buckler']];
    shieldRow.forEach((sh, i) => {
      const x = 56 + i * 84, y = 578;
      fit(base({ shield: sh[0], weapon: 'sword', armor: 'plate', seed: 3 + i * 5, cloth: players[i % 8], cloth2: players2[i % 8] }), x, y, 80, 76);
      label(sh[1], x, y + 12);
    });
    [['short', 'cape short'], ['long', 'cape long']].forEach((cp, i) => {
      const x = 500 + i * 84, y = 578;
      fit(base({ cape: cp[0], weapon: 'great_sword', armor: 'heavy_plate', helm: 'full', tier: 4, cloth: players[1], cloth2: players2[1] }), x, y, 80, 76);
      label(cp[1], x, y + 12);
    });
    [[false, 'soldier'], [true, 'HERO']].forEach((hr, i) => {
      const x = 680 + i * 84, y = 578;
      fit(base({ weapon: 'sword_shield', shield: 'kite', armor: 'ceremonial', helm: 'open', cape: 'long', tier: 5, cloth: players[3], cloth2: players2[3] }), x, y, 80, 76, { hero: hr[0] });
      label(hr[1], x, y + 12, hr[0] ? '#ffe9a8' : null);
    });
    ['fire', 'frost', 'lightning', 'shadow', 'nature', 'holy', 'arcane', 'blight'].forEach((el, i) => {
      const x = 856 + i * 62, y = 578;
      fit(base({ weapon: 'great_sword', armor: 'plate', helm: 'full', element: el, glow: null, cloth: players[5], cloth2: players2[5] }), x, y, 58, 76);
      label(el, x, y + 12, ELEMENT[el]);
    });
    // true relative scaling (no fit) so 0.8 / 1 / 1.3 / 1.7 can be compared
    ['small', 'medium', 'large', 'huge'].forEach((sz, i) => {
      const x = 1382 + i * 54, y = 582;
      ground(x, y, 17);
      UnitArt.drawDirect(ctx, x, y, { look: normLook(base({ size: sz, weapon: 'axe', armor: 'leather', helm: 'cap', shield: 'none' })), scale: 0.95 }); drawn++;
      label(sz, x, y + 12);
    });

    // ================= E. mounts & beasts
    heading('MOUNTS (horse / dire wolf / war boar / drake) · BEASTS', 610);
    const mountRow = [
      [{ body: 'horse_rider', armor: 'plate', weapon: 'lance', shield: 'kite', helm: 'full', cape: 'short', tier: 3 }, 'horse_rider'],
      [{ body: 'wolf_rider', armor: 'leather', weapon: 'spear', helm: 'cap', shield: 'none' }, 'wolf_rider'],
      [{ body: 'boar_rider', armor: 'chain', weapon: 'axe', shield: 'round', helm: 'horned' }, 'boar_rider'],
      [{ body: 'drake', armor: 'none', weapon: 'none', shield: 'none', helm: 'none', element: 'fire', tint: '#c25b2e' }, 'drake'],
      [{ body: 'drake', armor: 'leather', weapon: 'spear', shield: 'none', helm: 'cap', rider: true, element: 'frost', tint: '#5a8ab0' }, 'drake + rider'],
    ];
    mountRow.forEach((mr, i) => {
      const x = 68 + i * 116, y = 712;
      fit(base(mr[0]), x, y, 112, 94);
      label(mr[1], x, y + 12);
    });
    const beastRow = ['beast_wolf', 'beast_bear', 'beast_boar', 'beast_lion', 'beast_elk', 'beast_sabertooth', 'beast_mammoth', 'beast_crocodile',
      'beast_basilisk', 'beast_spider', 'beast_serpent', 'beast_hydra', 'unicorn', 'griffon'];
    beastRow.forEach((b, i) => {
      const x = 660 + i * 67, y = 712;
      const look = base({ body: b, armor: 'none', weapon: 'none', shield: 'none', helm: 'none', size: b === 'beast_mammoth' ? 'huge' : b === 'beast_bear' ? 'large' : 'medium',
        tint: b === 'unicorn' ? '#f4f0ff' : null, glow: b === 'unicorn' ? '#ffe9ff' : null });
      fit(look, x, y, 66, 92);
      label(b.replace('beast_', ''), x, y + 12);
    });

    // ================= F. dragons
    heading('DRAGONS — scales and breath by element (cast frame: breath charging) · GIANT · KRAKEN · TREANT · GOLEM', 744);
    const dragonEls = ['fire', 'frost', 'lightning', 'blight', 'shadow', 'holy', null];
    dragonEls.forEach((el, i) => {
      const x = 106 + i * 158, y = 902;
      fit(base({ body: 'dragon', size: 'huge', element: el, weapon: 'none', armor: 'none', shield: 'none', helm: 'none', tint: el ? null : '#3a2a3a', glow: el ? null : '#ffb040' }),
        x, y, 156, 136, { anim: i % 2 ? 'cast' : 'idle', frame: 3, hero: i === 6 });
      label('dragon ' + (el || 'obsidian') + (i % 2 ? ' ▸breath' : ''), x, y + 14, el ? ELEMENT[el] : '#ffb040');
    });
    [['giant', 'giant', { size: 'huge', weapon: 'hammer', armor: 'none', helm: 'none' }], ['kraken', 'kraken', { size: 'huge' }],
      ['treant', 'treant', { size: 'large', weapon: 'none', armor: 'none', helm: 'none' }], ['golem', 'golem', { size: 'large', weapon: 'none', armor: 'none', helm: 'none', element: 'stone' }]].forEach((g, i) => {
      const x = 1240 + i * 92, y = 902;
      fit(base(Object.assign({ body: g[0], shield: 'none' }, g[2])), x, y, 90, 136);
      label(g[1], x, y + 14);
    });

    // ================= G. monsters
    heading('MONSTERS & SPIRITS — elementals, undead, celestials, fiends, eldritch, flora & fauna', 936);
    const m1 = [
      ['elemental', { element: 'fire', glow: '#ff8a2a' }, 'fire elem'], ['elemental', { element: 'frost', glow: '#a0e0ff' }, 'frost elem'],
      ['elemental', { element: 'lightning', glow: '#d0c0ff' }, 'storm elem'], ['elemental', { element: 'stone' }, 'stone elem'],
      ['elemental', { element: 'water' }, 'water elem'], ['elemental', { element: 'shadow', tint: '#3a2a4a' }, 'shadow elem'],
      ['wisp', { glow: '#e0f0ff', size: 'small' }, 'wisp'], ['spirit', { glow: '#bfe6ff' }, 'spirit'],
      ['skull', { element: 'shadow', weapon: 'great_sword', cape: 'long', size: 'large', tint: '#2b2436', glow: '#7b3fa0' }, 'skull lord'],
      ['eldritch', { size: 'large', glow: '#3fd0c0', accent: '#d040a0' }, 'eldritch'],
      ['plant', { element: 'nature', tint: '#4c7a3a' }, 'plant'], ['insect', { size: 'large', tint: '#c9a24a' }, 'insect'],
      ['slime', { tint: '#5ac06a' }, 'slime'], ['ghost', {}, 'ghost'], ['skeleton', { weapon: 'sword_shield', shield: 'round', armor: 'cloth' }, 'skeleton'],
      ['undead', { armor: 'cloth', weapon: 'none' }, 'zombie'],
    ];
    m1.forEach((mm, i) => {
      const x = 56 + i * 97, y = 1046;
      fit(base(Object.assign({ body: mm[0], armor: 'none', weapon: 'none', shield: 'none', helm: 'none' }, mm[1])), x, y, 94, 92);
      label(mm[2], x, y + 12);
    });
    const m2 = [
      ['angel', { size: 'medium', weapon: 'sword', armor: 'ceremonial', glow: '#fff0c0' }, 'angel'],
      ['archon', { size: 'large', weapon: 'staff', armor: 'ceremonial', element: 'holy' }, 'archon'],
      ['demon', { size: 'large', weapon: 'whip', helm: 'horned', element: 'fire', tint: '#8a2a1a' }, 'demon'],
      ['fiend', { weapon: 'daggers', cape: 'long', helm: 'horned', element: 'shadow', tint: '#5a2d5c' }, 'fiend'],
      ['vampire', { armor: 'ceremonial', weapon: 'claws', cape: 'long', helm: 'crown' }, 'vampire'],
      ['phoenix', { tint: '#ff5a2a', glow: '#ff9a2a' }, 'phoenix'], ['bird', { size: 'large', tint: '#3a5ac0', glow: '#8ab0ff' }, 'roc'],
      ['harpy', { size: 'medium', weapon: 'claws' }, 'harpy'],
      ['golem', { size: 'medium', tint: '#7ab0e0', glow: '#a0e0ff', element: 'frost' }, 'ice golem'],
      ['giant', { size: 'large', tint: '#a8d0e8', element: 'frost', weapon: 'club', armor: 'none', helm: 'none' }, 'frost giant'],
      ['form', { armor: 'robe', weapon: 'staff', helm: 'hat', cape: 'long', element: 'arcane', tier: 4 }, 'archmage'],
      ['form', { armor: 'heavy_plate', weapon: 'halberd', helm: 'full', cape: 'long', tier: 5 }, 'knight T5'],
      ['form', { armor: 'leather', weapon: 'bow', helm: 'hood', cape: 'short' }, 'ranger'],
      ['form', { armor: 'cloth', weapon: 'instrument', helm: 'hat' }, 'bard'],
      ['form', { armor: 'none', weapon: 'claws', helm: 'none' }, 'brawler'],
      ['form', { armor: 'plate', weapon: 'banner', helm: 'open', cape: 'long', tier: 3 }, 'standard'],
    ];
    m2.forEach((mm, i) => {
      const x = 56 + i * 97, y = 1152;
      fit(base(Object.assign({ body: mm[0], shield: 'none', weapon: 'none', armor: 'none', helm: 'none', cloth: players[i % 8], cloth2: players2[i % 8] }, mm[1])), x, y, 94, 92, { hero: mm[2] === 'knight T5' });
      label(mm[2], x, y + 12);
    });

    // ================= H. animations (through the cached UnitArt.draw path, incl. left-facing)
    heading('ANIMATIONS — idle ×4 · walk ×4 · attack ×6 · cast ×4 · hit · death ×4   (cached UnitArt.draw; last row flipped left)', 1188);
    const animLook = base({ armor: 'plate', weapon: 'sword_shield', shield: 'kite', helm: 'open', cape: 'short', tier: 3, cloth: players[1], cloth2: players2[1] });
    const anims = [['idle', 4], ['walk', 4], ['attack', 6], ['cast', 4], ['hit', 1], ['death', 4]];
    let ax = 46;
    anims.forEach(([an, n], ai) => {
      for (let f = 0; f < n; f++) {
        const x = ax, y = 1288;
        ground(x, y, 20);
        try { UnitArt.draw(ctx, x, y, { look: animLook, anim: an, frame: f, facing: 'right', scale: 1.4 }); drawn++; } catch (e) { console.error(e); }
        label(an + f, x, y + 12, ai % 2 ? '#aeb8cd' : '#d8dcea');
        ax += 52;
      }
      ax += 10;
    });
    const mageLook = base({ body: 'form', armor: 'robe', weapon: 'staff', helm: 'hood', shield: 'none', element: 'arcane', cloth: players[4], cloth2: players2[4] });
    ax += 12;
    [['cast', 4], ['walk', 4]].forEach(([an, n]) => {
      for (let f = 0; f < n; f++) {
        const x = ax, y = 1288;
        ground(x, y, 20);
        try { UnitArt.draw(ctx, x, y, { look: mageLook, anim: an, frame: f, facing: 'left', scale: 1.4 }); drawn++; } catch (e) { console.error(e); }
        label('◂' + an + f, x, y + 12, '#c5b6e8');
        ax += 52;
      }
      ax += 10;
    });

    // ================= I. portraits
    heading('PORTRAITS — UnitArt.portrait(look, {size, playerColor, affinity, frame}) · painterly vignette + gold frame', 1322);
    const portraits = [
      [{ body: 'form', armor: 'heavy_plate', weapon: 'great_sword', helm: 'open', cape: 'long', tier: 5 }, 'order', 'human knight', 'human', true],
      [{ body: 'form', armor: 'robe', weapon: 'staff', helm: 'hat', element: 'arcane' }, 'astral', 'elf archmage', 'elf', false],
      [{ body: 'form', armor: 'leather', weapon: 'great_axe', helm: 'horned' }, 'chaos', 'orc reaver', 'orc', false],
      [{ body: 'form', armor: 'chain', weapon: 'hammer', helm: 'full' }, 'materium', 'dwarf', 'dwarf', false],
      [{ body: 'form', armor: 'leather', weapon: 'bow', helm: 'hood' }, 'nature', 'tigran scout', 'tigran', false],
      [{ body: 'dragon', size: 'huge', element: 'fire' }, 'chaos', 'fire dragon', null, true],
      [{ body: 'angel', weapon: 'sword', armor: 'ceremonial', glow: '#fff0c0' }, 'order', 'angel', null, false],
      [{ body: 'undead', armor: 'heavy_plate', weapon: 'great_sword', helm: 'full' }, 'shadow', 'death knight', null, true],
      [{ body: 'beast_wolf', size: 'large' }, 'nature', 'dire wolf', null, false],
      [{ body: 'elemental', element: 'frost', glow: '#a0e0ff' }, 'astral', 'frost elemental', null, false],
      [{ body: 'horse_rider', armor: 'plate', weapon: 'lance', shield: 'kite', helm: 'full', cape: 'short' }, 'order', 'knight lancer', 'human', false],
      [{ body: 'eldritch', size: 'large', glow: '#3fd0c0' }, 'shadow', 'eldritch horror', null, false],
    ];
    portraits.forEach((pp, i) => {
      const x = 26 + i * 131, y = 1330, sz = 108;
      let look = pp[0];
      if (pp[3]) look = UnitArt.resolveLook({ id: 'p' + i, tier: 4, tags: ['racial'], look: pp[0] }, formLookOf(pp[3]), { color: players[i % 8], color2: players2[i % 8] });
      try {
        const cv = UnitArt.portrait(look, { size: sz, playerColor: players[i % 8], playerColor2: players2[i % 8], affinity: pp[1], frame: true, hero: pp[4] });
        ctx.drawImage(cv, x, y); drawn++;
      } catch (e) { console.error(e); }
      label(pp[2], x + sz / 2, y + sz + 10, pp[4] ? '#ffe9a8' : null);
    });

    // ================= J. army banners
    heading('ARMY BANNERS — UnitArt.armyBanner(ctx,x,y,{playerColor, bannerShape, count, hero, sigil})', 1474);
    BANNER_SHAPES.forEach((shape, i) => {
      const x = 48 + i * 86, y = 1536;
      try { UnitArt.armyBanner(ctx, x, y, { playerColor: players[i % 8], playerColor2: players2[i % 8], bannerShape: shape, count: i + 2, hero: i === 0, sigil: i * 3, frame: 1 }); drawn++; } catch (e) { console.error(e); }
      label(shape, x + 38, y + 11);
    });
    for (let i = 0; i < 8; i++) {
      const x = 500 + i * 62, y = 1536;
      try { UnitArt.armyBanner(ctx, x, y, { playerColor: players[i], playerColor2: players2[i], bannerShape: BANNER_SHAPES[i % 5], count: 6, hero: i % 3 === 0, sigil: i + 5, frame: 2 }); drawn++; } catch (e) { console.error(e); }
    }
    Art.text(ctx, 'player 1–8 banners · the 16 heraldic sigils', 1196, 1492, { size: 10, color: '#aeb8cd', align: 'left', stroke: 'rgba(0,0,0,0.8)', strokeWidth: 2.5 });
    for (let i = 0; i < 16; i++) {
      const x = 1212 + (i % 8) * 32, y = 1546 + ((i / 8) | 0) * -0 + (i < 8 ? 0 : -32);
      ctx.save(); ctx.fillStyle = 'rgba(20,24,38,0.75)'; circ(ctx, x, y, 12); ctx.fill(); ctx.strokeStyle = 'rgba(201,162,74,0.5)'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
      drawSigil(ctx, i, x, y, 8, '#f1d98a', 'rgba(12,10,24,0.6)');
    }
    // legend
    Art.text(ctx, UnitArt.BODIES.length + ' bodies · ' + UnitArt.WEAPONS.length + ' weapons · ' + UnitArt.ARMORS.length + ' armours · ' +
      UnitArt.HELMS.length + ' helms · ' + UnitArt.SHIELDS.length + ' shields · 6 animations · sizes ×0.8/1/1.3/1.7',
      10, 1566, { size: 10, color: '#8f9ab3', align: 'left', stroke: 'rgba(0,0,0,0.8)', strokeWidth: 2.5 });
    ctx.restore();
    const ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    return drawn + ' sprites in ' + ms + 'ms (zoom ' + zoom + ')';
  };

  AOW.UnitArt = UnitArt;
})(window.AOW = window.AOW || {});
