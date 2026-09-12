// src/audio/sfx.js — AOW.SFX: procedural sound effects (oscillators, noise, filters, envelopes, feedback delays)
//
// Additive helpers beyond SPEC §8 (documented here):
//   SFX.play(name, {volume, pitch, pan, delay})  delay = seconds from now (default 0) — lets callers sequence effects
//   SFX.list() → all names ; SFX.demo(name) = play ; SFX.has(name)
//   SFX.MIN_GAP_MS (40) — identical effects closer than this are dropped
(function (AOW) {
  'use strict';
  const SFX = {};
  const DEFS = {};
  const lastPlayed = new Map();
  SFX.MIN_GAP_MS = 40;

  // ------------------------------------------------------------------ toolkit
  // A "job" bundles the nodes of one effect: j.t = start time, j.out = output gain (volume applied), j.p = pitch multiplier.
  function job(def, opts) {
    const A = AOW.Audio, c = A.ctx;
    const j = { c, t: c.currentTime + 0.01 + (opts.delay || 0), p: opts.pitch || 1, nodes: [], sources: [], end: 0 };
    j.out = c.createGain();
    j.out.gain.value = (def.level || 1) * (opts.volume === undefined ? 1 : opts.volume);
    j.nodes.push(j.out);
    let tail = j.out;
    if (opts.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, opts.pan)); j.out.connect(pn); tail = pn; j.nodes.push(pn); }
    tail.connect(A.sfxBus);
    return j;
  }
  function finish(j, tailSec) {
    const wait = Math.max(0.05, j.end - j.c.currentTime + (tailSec || 0.3));
    for (const s of j.sources) { try { s.stop(j.end + 0.05); } catch (e) { /* explicit stop already set */ } }
    setTimeout(() => { for (const n of j.nodes) { try { n.disconnect(); } catch (e) { /* ignore */ } } }, wait * 1000 + 200);
  }
  const mark = (j, end) => { if (end > j.end) j.end = end; return end; };
  function gain(j, v, dest) { const g = j.c.createGain(); g.gain.value = v === undefined ? 1 : v; g.connect(dest || j.out); j.nodes.push(g); return g; }
  function filt(j, type, freq, q, dest) { const f = j.c.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q !== undefined) f.Q.value = q; f.connect(dest || j.out); j.nodes.push(f); return f; }
  function osc(j, type, freq, detune) { const o = j.c.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq; if (detune) o.detune.value = detune; j.nodes.push(o); j.sources.push(o); return o; }
  function noise(j) { const s = j.c.createBufferSource(); s.buffer = AOW.Audio.noiseBuffer(); s.loop = true; j.nodes.push(s); j.sources.push(s); return s; }
  /** attack → hold → release ; returns end time */
  function env(param, t0, peak, a, hold, r) {
    param.setValueAtTime(0.0001, t0);
    param.linearRampToValueAtTime(peak, t0 + a);
    const tr = t0 + a + (hold || 0);
    param.setValueAtTime(peak, tr);
    param.setTargetAtTime(0.0001, tr, Math.max(0.005, (r || 0.05) / 4));
    return tr + (r || 0.05) + 0.03;
  }
  /** percussive: attack then exponential decay ; returns end time */
  function denv(param, t0, peak, a, d) {
    param.setValueAtTime(0.0001, t0);
    param.linearRampToValueAtTime(peak, t0 + a);
    param.setTargetAtTime(0.0001, t0 + a, Math.max(0.004, d / 5));
    return t0 + a + d + 0.03;
  }
  function glide(param, t0, f1, f2, secs) {
    param.setValueAtTime(Math.max(1, f1), t0);
    param.exponentialRampToValueAtTime(Math.max(1, f2), t0 + secs);
  }
  /**
   * tone: {type, f, f2, glide, a, d, hold, r, peak, at, dest, detune, wave}
   * f2/glide → pitch slide; hold>0 → sustained envelope (a/hold/r), else percussive (a/d)
   */
  function tone(j, o) {
    const t0 = j.t + (o.at || 0);
    const s = osc(j, o.type, (o.f || 440) * j.p, o.detune);
    if (o.wave) s.setPeriodicWave(o.wave);
    if (o.f2) glide(s.frequency, t0, o.f * j.p, o.f2 * j.p, o.glide || 0.1);
    const g = gain(j, 0, o.dest);
    s.connect(g);
    const end = o.hold ? env(g.gain, t0, o.peak || 0.2, o.a || 0.005, o.hold, o.r || 0.08) : denv(g.gain, t0, o.peak || 0.2, o.a || 0.005, o.d || 0.3);
    s.start(t0); s.stop(end + 0.05);
    return mark(j, end);
  }
  /** noise burst through a filter: {ftype, f, f2, glide, q, a, d, hold, r, peak, at, dest} */
  function burst(j, o) {
    const t0 = j.t + (o.at || 0);
    const n = noise(j);
    const f = filt(j, o.ftype || 'bandpass', (o.f || 1000) * (o.pitchTrack === false ? 1 : j.p), o.q === undefined ? 1 : o.q, null);
    if (o.f2) glide(f.frequency, t0, o.f * j.p, o.f2 * j.p, o.glide || 0.1);
    const g = gain(j, 0, o.dest);
    f.disconnect(); f.connect(g);
    n.connect(f);
    const end = o.hold ? env(g.gain, t0, o.peak || 0.2, o.a || 0.003, o.hold, o.r || 0.08) : denv(g.gain, t0, o.peak || 0.2, o.a || 0.003, o.d || 0.1);
    n.start(t0); n.stop(end + 0.05);
    return mark(j, end);
  }
  /** feedback delay; returns the input node to use as `dest` */
  function echo(j, time, fb, wet, dest) {
    const input = gain(j, 1, dest);
    const d = j.c.createDelay(1); d.delayTime.value = time; j.nodes.push(d);
    const fbg = gain(j, fb, d); const wg = gain(j, wet, dest);
    const lp = filt(j, 'lowpass', 4000, 0.5, fbg);
    input.connect(d); d.connect(lp); d.connect(wg);
    return input;
  }
  const curveCache = new Map();
  /** soft-clip waveshaper; returns node to use as `dest` */
  function drive(j, amount, dest) {
    const ws = j.c.createWaveShaper();
    let curve = curveCache.get(amount);
    if (!curve) {
      curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = (i / 511.5) - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
      curveCache.set(amount, curve);
    }
    ws.curve = curve; ws.connect(dest || j.out); j.nodes.push(ws);
    return ws;
  }
  function lfo(j, rate, depth, param, t0, t1) { const l = osc(j, 'sine', rate); const g = gain(j, depth, null); g.disconnect(); g.connect(param); l.connect(g); l.start(t0); l.stop(t1 + 0.05); return l; }
  /** brass-like note: saw+square through a swelling lowpass */
  function brass(j, f, at, len, peak, dest) {
    const t0 = j.t + at;
    const lp = filt(j, 'lowpass', 600, 1, dest);
    lp.frequency.setValueAtTime(400 + f, t0); lp.frequency.linearRampToValueAtTime(1800 + f * 2, t0 + Math.min(0.12, len * 0.5));
    let end = 0;
    end = tone(j, { type: 'sawtooth', f, detune: -4, a: 0.03, hold: len, r: 0.12, peak: peak * 0.7, at, dest: lp });
    tone(j, { type: 'square', f, detune: 4, a: 0.03, hold: len, r: 0.12, peak: peak * 0.35, at, dest: lp });
    tone(j, { type: 'sine', f, a: 0.03, hold: len, r: 0.12, peak: peak * 0.5, at, dest });
    return end;
  }
  /** bell: inharmonic partials */
  function bell(j, f, at, peak, decay, dest) {
    let end = 0;
    for (const [r, a, d] of [[1, 1, 1], [2.4, 0.45, 0.55], [3.9, 0.22, 0.32], [5.3, 0.1, 0.2]]) end = Math.max(end, tone(j, { f: f * r, peak: peak * a, a: 0.003, d: decay * d, at, dest }));
    return end;
  }
  /** timpani/drum: pitch-dropping sine + short low noise */
  function drum(j, f, at, peak, len) {
    burst(j, { ftype: 'lowpass', f: 380, q: 0.7, a: 0.002, d: 0.08, peak: peak * 0.5, at });
    return tone(j, { f: f * 1.8, f2: f, glide: 0.06, a: 0.003, d: len || 0.35, peak, at });
  }
  function chime(j, f, at, peak, d, dest) { tone(j, { f: f * 2, peak: peak * 0.3, a: 0.003, d: d * 0.5, at, dest }); return tone(j, { f, peak, a: 0.004, d, at, dest }); }
  function steps(j, fn, n, gap) { for (let i = 0; i < (n || 4); i++) fn(i * (gap || 0.22), i); }
  function stringsChord(j, freqs, at, len, peak, cut, dest) {
    const lp = filt(j, 'lowpass', cut || 1200, 0.8, dest);
    let end = 0;
    for (const f of freqs) for (const dt of [-6, 6]) end = Math.max(end, tone(j, { type: 'sawtooth', f, detune: dt, a: 0.35, hold: len, r: 0.6, peak: peak / freqs.length, at, dest: lp }));
    return end;
  }

  // ------------------------------------------------------------------ UI
  DEFS.ui_click = { level: 0.8, fn(j) {
    tone(j, { f: 1900, f2: 950, glide: 0.03, a: 0.002, d: 0.05, peak: 0.22 });
    burst(j, { ftype: 'highpass', f: 3000, q: 0.5, d: 0.012, peak: 0.12 });
  } };
  DEFS.ui_hover = { level: 0.5, fn(j) { tone(j, { f: 2400, a: 0.003, d: 0.035, peak: 0.06 }); } };
  DEFS.ui_open = { level: 0.8, fn(j) {
    burst(j, { f: 400, f2: 2600, glide: 0.18, q: 1.2, a: 0.02, d: 0.18, peak: 0.2 });
    tone(j, { f: 180, f2: 90, glide: 0.06, a: 0.002, d: 0.07, peak: 0.25 });
  } };
  DEFS.ui_close = { level: 0.8, fn(j) {
    burst(j, { f: 2600, f2: 400, glide: 0.16, q: 1.2, a: 0.02, d: 0.16, peak: 0.2 });
    tone(j, { f: 160, f2: 80, glide: 0.06, a: 0.002, d: 0.08, peak: 0.28, at: 0.12 });
  } };
  DEFS.end_turn = { level: 0.9, fn(j) { brass(j, 392, 0, 0.16, 0.22); brass(j, 523.25, 0.2, 0.32, 0.25); } };
  DEFS.turn_start = { level: 0.8, fn(j) { chime(j, 1318.5, 0, 0.18, 0.7); chime(j, 1760, 0.12, 0.16, 0.9); } };
  DEFS.coin = { level: 0.8, fn(j) {
    [[1, 0], [1.47, 0.025], [2.1, 0.055], [1.22, 0.09]].forEach(([r, at]) => tone(j, { type: 'triangle', f: 2500 * r, a: 0.002, d: 0.22, peak: 0.13, at }));
    burst(j, { ftype: 'highpass', f: 5000, q: 0.5, d: 0.02, peak: 0.08 });
  } };
  DEFS.build_complete = { level: 0.9, fn(j) {
    [0, 0.16, 0.32].forEach(at => { burst(j, { ftype: 'lowpass', f: 900, q: 0.8, d: 0.05, peak: 0.3, at }); tone(j, { f: 130, f2: 70, glide: 0.04, d: 0.08, peak: 0.25, at }); tone(j, { type: 'triangle', f: 1900, d: 0.06, peak: 0.08, at }); });
    [261.6, 329.6, 392, 523.25].forEach((f, i) => tone(j, { type: 'triangle', f, a: 0.01, d: 1.1, peak: 0.12, at: 0.48 + i * 0.03 }));
  } };
  DEFS.recruit = { level: 0.9, fn(j) { drum(j, 70, 0, 0.45, 0.35); brass(j, 261.6, 0.15, 0.14, 0.2); brass(j, 392, 0.33, 0.35, 0.24); } };
  DEFS.research_complete = { level: 0.8, fn(j) {
    const d = echo(j, 0.19, 0.35, 0.4);
    [1046.5, 1318.5, 1568, 1975.5, 2349.3].forEach((f, i) => tone(j, { f, a: 0.004, d: 0.7, peak: 0.14, at: i * 0.09, dest: d }));
    burst(j, { f: 6000, q: 2, a: 0.1, d: 0.5, peak: 0.05, at: 0.2 });
  } };

  // ------------------------------------------------------------------ spells
  DEFS.spell_cast_order = { level: 0.9, fn(j) {
    const mixg = gain(j, 1);
    for (const [fc, q, a] of [[700, 6, 1], [1200, 8, 0.5], [2500, 10, 0.2]]) { const bp = filt(j, 'bandpass', fc, q, mixg); bp.disconnect(); const g = gain(j, a); bp.connect(g); [440, 554.4, 659.3].forEach(f => [-7, 7].forEach(dt => tone(j, { type: 'sawtooth', f, detune: dt, a: 0.35, hold: 0.5, r: 0.5, peak: 0.08, dest: bp }))); }
    [440, 659.3].forEach(f => tone(j, { f, a: 0.3, hold: 0.5, r: 0.5, peak: 0.08 }));
    tone(j, { f: 2637, a: 0.02, d: 0.6, peak: 0.08, at: 0.55 });
    tone(j, { f: 3520, a: 0.02, d: 0.5, peak: 0.05, at: 0.62 });
  } };
  DEFS.spell_cast_chaos = { level: 0.9, fn(j) {
    const ws = drive(j, 2.5);
    const t0 = j.t;
    const b = burst(j, { ftype: 'lowpass', f: 500, f2: 1600, glide: 0.5, q: 1.5, a: 0.08, hold: 0.45, r: 0.35, peak: 0.35, dest: ws });
    tone(j, { type: 'sawtooth', f: 55, f2: 40, glide: 0.8, a: 0.05, hold: 0.5, r: 0.3, peak: 0.18, dest: filt(j, 'lowpass', 200, 1) });
    for (let i = 0; i < 7; i++) burst(j, { ftype: 'bandpass', f: 2500 + i * 300, q: 3, d: 0.02, peak: 0.12, at: 0.1 + i * 0.09 + (i % 2) * 0.03 });
    lfo(j, 11, 0.5, j.out.gain, t0, b);
  } };
  DEFS.spell_cast_nature = { level: 0.8, fn(j) {
    [0, 0.07, 0.15].forEach(at => burst(j, { ftype: 'highpass', f: 4000, q: 0.6, a: 0.004, d: 0.045, peak: 0.1, at }));
    tone(j, { f: 500, f2: 1400, glide: 0.4, a: 0.05, hold: 0.25, r: 0.2, peak: 0.07 });
    [659.3, 784, 987.8, 1318.5].forEach((f, i) => chime(j, f, 0.18 + i * 0.1, 0.13, 0.9));
  } };
  DEFS.spell_cast_materium = { level: 1, fn(j) {
    burst(j, { ftype: 'lowpass', f: 180, q: 1, a: 0.05, hold: 0.55, r: 0.4, peak: 0.55 });
    tone(j, { f: 46, a: 0.05, hold: 0.6, r: 0.3, peak: 0.3 });
    burst(j, { f: 1200, q: 1.5, d: 0.04, peak: 0.3, at: 0.35 });
    burst(j, { f: 700, q: 2, d: 0.06, peak: 0.22, at: 0.42 });
    tone(j, { f: 90, f2: 50, glide: 0.1, d: 0.2, peak: 0.3, at: 0.35 });
  } };
  DEFS.spell_cast_astral = { level: 0.8, fn(j) {
    const d = echo(j, 0.14, 0.4, 0.45);
    [1046.5, 1567.98, 1318.5, 2093, 1760, 2637, 3136].forEach((f, i) => tone(j, { f, a: 0.003, d: 0.45, peak: 0.1, at: 0.05 + i * 0.045, dest: d }));
    tone(j, { type: 'triangle', f: 400, f2: 2400, glide: 0.5, a: 0.05, hold: 0.2, r: 0.3, peak: 0.06 });
    burst(j, { f: 7000, q: 1.5, a: 0.15, d: 0.45, peak: 0.04, at: 0.15 });
  } };
  DEFS.spell_cast_shadow = { level: 0.9, fn(j) {
    const t0 = j.t;
    const b = burst(j, { f: 900, f2: 280, glide: 0.8, q: 3, a: 0.3, hold: 0.35, r: 0.4, peak: 0.4 });
    lfo(j, 9, 0.6, j.out.gain, t0, b);
    tone(j, { f: 82, a: 0.35, hold: 0.4, r: 0.4, peak: 0.22 });
    tone(j, { type: 'sawtooth', f: 41, a: 0.3, hold: 0.3, r: 0.4, peak: 0.1, dest: filt(j, 'lowpass', 150, 1) });
    tone(j, { f: 1600, f2: 400, glide: 0.4, a: 0.02, d: 0.35, peak: 0.05, at: 0.55 });
  } };
  DEFS.spell_hit_physical = { level: 1, fn(j) { burst(j, { ftype: 'lowpass', f: 450, q: 0.7, d: 0.09, peak: 0.45 }); tone(j, { f: 95, f2: 40, glide: 0.08, d: 0.14, peak: 0.4 }); } };
  DEFS.spell_hit_fire = { level: 0.9, fn(j) {
    burst(j, { f: 1400, f2: 300, glide: 0.35, q: 0.8, a: 0.005, d: 0.35, peak: 0.4, dest: drive(j, 2) });
    tone(j, { f: 80, f2: 45, glide: 0.1, d: 0.2, peak: 0.3 });
    for (let i = 0; i < 5; i++) burst(j, { f: 3000 + i * 400, q: 4, d: 0.015, peak: 0.1, at: 0.05 + i * 0.06 });
  } };
  DEFS.spell_hit_frost = { level: 0.8, fn(j) {
    burst(j, { ftype: 'highpass', f: 5000, q: 0.7, d: 0.12, peak: 0.25 });
    [3000, 4200, 5300, 6600].forEach((f, i) => tone(j, { f, a: 0.002, d: 0.35 - i * 0.05, peak: 0.1, at: i * 0.02 }));
    tone(j, { type: 'triangle', f: 2200, f2: 500, glide: 0.25, a: 0.01, d: 0.25, peak: 0.08, at: 0.05 });
  } };
  DEFS.spell_hit_lightning = { level: 0.9, fn(j) {
    burst(j, { ftype: 'highpass', f: 2000, q: 0.6, a: 0.001, d: 0.02, peak: 0.55 });
    tone(j, { type: 'sawtooth', f: 3200, f2: 180, glide: 0.06, a: 0.001, d: 0.06, peak: 0.25 });
    burst(j, { ftype: 'lowpass', f: 300, q: 1, a: 0.01, d: 0.5, peak: 0.35, at: 0.03 });
    tone(j, { f: 60, f2: 35, glide: 0.3, d: 0.4, peak: 0.25, at: 0.03 });
  } };
  DEFS.spell_hit_blight = { level: 0.8, fn(j) {
    [0, 0.09, 0.16, 0.27, 0.33].forEach((at, i) => tone(j, { f: 320 + i * 40, f2: 140, glide: 0.07, a: 0.004, d: 0.09, peak: 0.16, at }));
    const b = burst(j, { ftype: 'lowpass', f: 500, q: 1.5, a: 0.02, hold: 0.25, r: 0.25, peak: 0.25 });
    lfo(j, 14, 0.5, j.out.gain, j.t, b);
  } };
  DEFS.spell_hit_spirit = { level: 0.8, fn(j) {
    const g = gain(j, 1);
    const end = Math.max(tone(j, { f: 880, a: 0.04, d: 0.9, peak: 0.15, dest: g }), tone(j, { f: 1318.5, a: 0.04, d: 0.8, peak: 0.12, at: 0.03, dest: g }), tone(j, { f: 1760, a: 0.04, d: 0.6, peak: 0.07, at: 0.06, dest: g }));
    lfo(j, 7, 0.5, g.gain, j.t, end);
    burst(j, { f: 3000, q: 2, a: 0.25, d: 0.35, peak: 0.06 });
  } };

  // ------------------------------------------------------------------ combat
  DEFS.sword_hit = { level: 0.9, fn(j) {
    burst(j, { f: 3200, q: 2, d: 0.06, peak: 0.35 });
    [2200, 3400, 5100].forEach((f, i) => tone(j, { type: 'triangle', f, a: 0.002, d: 0.25 - i * 0.05, peak: 0.1 }));
    tone(j, { f: 120, f2: 50, glide: 0.05, d: 0.08, peak: 0.3 });
  } };
  DEFS.axe_hit = { level: 1, fn(j) {
    burst(j, { ftype: 'lowpass', f: 1200, q: 0.8, d: 0.08, peak: 0.4 });
    tone(j, { f: 100, f2: 40, glide: 0.08, d: 0.12, peak: 0.4 });
    tone(j, { type: 'triangle', f: 1800, a: 0.002, d: 0.1, peak: 0.1 });
    burst(j, { f: 2500, q: 3, d: 0.03, peak: 0.15 });
  } };
  DEFS.blunt_hit = { level: 1, fn(j) { tone(j, { f: 90, f2: 35, glide: 0.1, d: 0.16, peak: 0.5 }); burst(j, { ftype: 'lowpass', f: 500, q: 0.8, d: 0.06, peak: 0.35 }); } };
  DEFS.arrow_shoot = { level: 0.8, fn(j) { burst(j, { f: 1200, f2: 3500, glide: 0.12, q: 1.5, a: 0.01, d: 0.14, peak: 0.25 }); tone(j, { type: 'triangle', f: 180, f2: 150, glide: 0.06, d: 0.06, peak: 0.12 }); } };
  DEFS.arrow_hit = { level: 0.9, fn(j) { burst(j, { ftype: 'lowpass', f: 900, q: 0.8, d: 0.04, peak: 0.35 }); tone(j, { f: 200, f2: 80, glide: 0.03, d: 0.05, peak: 0.3 }); tone(j, { f: 600, d: 0.02, peak: 0.12 }); } };
  DEFS.bow_draw = { level: 0.7, fn(j) { const b = burst(j, { f: 300, f2: 750, glide: 0.3, q: 8, a: 0.05, hold: 0.2, r: 0.08, peak: 0.25 }); lfo(j, 28, 0.4, j.out.gain, j.t, b); } };
  DEFS.shield_block = { level: 0.9, fn(j) { burst(j, { f: 700, q: 1.5, d: 0.04, peak: 0.35 }); tone(j, { type: 'triangle', f: 240, d: 0.15, peak: 0.25 }); tone(j, { type: 'triangle', f: 1200, a: 0.002, d: 0.08, peak: 0.1 }); } };
  DEFS.crit = { level: 1, fn(j) {
    burst(j, { f: 3000, q: 1.5, d: 0.08, peak: 0.45 });
    tone(j, { f: 60, f2: 30, glide: 0.2, d: 0.3, peak: 0.5 });
    burst(j, { ftype: 'lowpass', f: 600, q: 0.7, d: 0.12, peak: 0.4 });
    [2000, 2900, 4300].forEach((f, i) => tone(j, { type: 'triangle', f, a: 0.002, d: 0.7 - i * 0.15, peak: 0.12, at: 0.01 }));
  } };
  DEFS.death_human = { level: 0.9, fn(j) {
    const lp = filt(j, 'lowpass', 500, 1);
    const end = tone(j, { type: 'sawtooth', f: 150, f2: 85, glide: 0.4, a: 0.03, hold: 0.25, r: 0.15, peak: 0.25, dest: lp });
    lfo(j, 18, 0.35, lp.frequency, j.t, end);
    burst(j, { ftype: 'lowpass', f: 300, q: 0.8, d: 0.12, peak: 0.35, at: 0.28 });
    tone(j, { f: 80, f2: 40, glide: 0.06, d: 0.12, peak: 0.3, at: 0.28 });
  } };
  DEFS.death_beast = { level: 0.9, fn(j) {
    const ws = drive(j, 3);
    const end = tone(j, { type: 'sawtooth', f: 110, f2: 65, glide: 0.55, a: 0.04, hold: 0.35, r: 0.2, peak: 0.25, dest: filt(j, 'lowpass', 700, 1.5, ws) });
    burst(j, { f: 260, q: 2, a: 0.03, hold: 0.35, r: 0.2, peak: 0.3, dest: ws });
    lfo(j, 22, 0.5, j.out.gain, j.t, end);
  } };
  DEFS.death_undead = { level: 0.9, fn(j) {
    for (let i = 0; i < 12; i++) burst(j, { f: 1800 - i * 40, q: 2.5, d: 0.02, peak: 0.25, at: i * 0.028 * (1 + i * 0.03) });
    burst(j, { f: 800, f2: 200, glide: 0.6, q: 1.2, a: 0.05, hold: 0.3, r: 0.3, peak: 0.2 });
    tone(j, { type: 'sawtooth', f: 70, f2: 45, glide: 0.5, a: 0.05, hold: 0.3, r: 0.2, peak: 0.1, dest: filt(j, 'lowpass', 250, 1) });
  } };
  DEFS.death_monster = { level: 1, fn(j) {
    const ws = drive(j, 4);
    const end = tone(j, { type: 'sawtooth', f: 75, f2: 42, glide: 0.9, a: 0.05, hold: 0.55, r: 0.3, peak: 0.3, dest: filt(j, 'lowpass', 500, 1.5, ws) });
    burst(j, { f: 420, f2: 140, glide: 0.8, q: 1.5, a: 0.05, hold: 0.5, r: 0.3, peak: 0.3, dest: ws });
    lfo(j, 15, 0.4, j.out.gain, j.t, end);
    tone(j, { f: 40, a: 0.05, hold: 0.6, r: 0.3, peak: 0.25 });
  } };
  DEFS.footsteps_grass = { level: 0.7, fn(j) { steps(j, at => { burst(j, { f: 1500, q: 0.8, a: 0.004, d: 0.045, peak: 0.14, at }); tone(j, { f: 110, d: 0.03, peak: 0.08, at }); }); } };
  DEFS.footsteps_stone = { level: 0.7, fn(j) { steps(j, at => { burst(j, { ftype: 'highpass', f: 900, q: 0.6, a: 0.002, d: 0.03, peak: 0.18, at }); tone(j, { f: 160, f2: 100, glide: 0.02, d: 0.035, peak: 0.16, at }); }); } };
  DEFS.footsteps_snow = { level: 0.7, fn(j) { steps(j, at => { burst(j, { ftype: 'lowpass', f: 1000, q: 0.7, a: 0.01, d: 0.07, peak: 0.16, at }); burst(j, { f: 2500, q: 1, a: 0.02, d: 0.04, peak: 0.06, at: at + 0.02 }); }, 4, 0.26); } };
  DEFS.footsteps_water = { level: 0.7, fn(j) { steps(j, at => { burst(j, { f: 2500, q: 0.7, a: 0.005, d: 0.08, peak: 0.16, at }); tone(j, { f: 500, f2: 950, glide: 0.04, d: 0.045, peak: 0.07, at: at + 0.01 }); }, 4, 0.24); } };
  DEFS.cavalry_charge = { level: 0.9, fn(j) {
    const pat = [0, 0.09, 0.18, 0.36, 0.45, 0.54, 0.72, 0.81, 0.9, 1.08, 1.17, 1.26];
    pat.forEach((at, i) => { tone(j, { f: 130, f2: 70, glide: 0.03, d: 0.05, peak: 0.22 + (i % 3 === 0 ? 0.08 : 0), at }); burst(j, { ftype: 'lowpass', f: 700, q: 0.8, d: 0.03, peak: 0.15, at }); });
    burst(j, { ftype: 'lowpass', f: 200, f2: 450, glide: 1.2, q: 1, a: 0.3, hold: 0.8, r: 0.3, peak: 0.25 });
  } };
  DEFS.battle_start = { level: 1, fn(j) {
    [0, 0.25, 0.5].forEach((at, i) => drum(j, 60, at, 0.4 + i * 0.08, 0.4));
    [146.8, 220, 293.7].forEach(f => brass(j, f, 0.62, 0.9, 0.16));
    burst(j, { ftype: 'highpass', f: 3000, q: 0.5, a: 0.01, d: 0.5, peak: 0.12, at: 0.62 });
  } };
  DEFS.battle_win = { level: 0.9, fn(j) {
    [523.25, 659.3, 784].forEach((f, i) => brass(j, f, i * 0.16, 0.13, 0.2));
    [523.25, 659.3, 784, 1046.5].forEach(f => brass(j, f, 0.5, 0.9, 0.12));
    burst(j, { ftype: 'highpass', f: 2500, q: 0.6, a: 0.005, d: 0.25, peak: 0.15, at: 0.5 });
    drum(j, 65, 0.5, 0.35, 0.4);
  } };
  DEFS.battle_lose = { level: 0.9, fn(j) {
    stringsChord(j, [146.8, 174.6, 220, 293.7], 0, 1.4, 0.35, 900);
    tone(j, { f: 73.4, a: 0.4, hold: 1.2, r: 0.6, peak: 0.2 });
    drum(j, 50, 0.9, 0.3, 0.6);
  } };
  DEFS.level_up = { level: 0.85, fn(j) {
    const d = echo(j, 0.16, 0.3, 0.35);
    [523.25, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => { tone(j, { f, a: 0.004, d: 0.6, peak: 0.13, at: i * 0.07, dest: d }); tone(j, { type: 'triangle', f, a: 0.004, d: 0.3, peak: 0.05, at: i * 0.07, dest: d }); });
    tone(j, { f: 2093, a: 0.01, d: 1.2, peak: 0.1, at: 0.36, dest: d });
    burst(j, { f: 6000, q: 2, a: 0.2, d: 0.6, peak: 0.04, at: 0.3 });
  } };
  DEFS.city_founded = { level: 0.9, fn(j) { [392, 523.25, 659.3].forEach((f, i) => bell(j, f, i * 0.22, 0.2, 1.6)); bell(j, 261.6, 0.7, 0.22, 2.2); } };
  DEFS.city_captured = { level: 0.9, fn(j) {
    bell(j, 196, 0, 0.28, 2.2);
    drum(j, 55, 0.35, 0.45, 0.5);
    [174.6, 207.7, 261.6].forEach(f => brass(j, f, 0.7, 0.9, 0.13));
    burst(j, { ftype: 'highpass', f: 2500, q: 0.6, a: 0.005, d: 0.3, peak: 0.1, at: 0.35 });
  } };
  DEFS.alert = { level: 0.8, fn(j) { const lp = filt(j, 'lowpass', 3000, 0.7); [880, 660, 880, 660, 880, 660].forEach((f, i) => tone(j, { type: 'triangle', f, a: 0.005, hold: 0.07, r: 0.04, peak: 0.2, at: i * 0.1, dest: lp })); } };
  DEFS.notification = { level: 0.8, fn(j) { chime(j, 1318.5, 0, 0.15, 0.5); chime(j, 1760, 0.12, 0.15, 0.6); } };
  DEFS.victory_fanfare = { level: 1, fn(j) {
    [0, 0.12, 0.24, 0.36, 0.48, 0.6, 1.5, 2.3].forEach((at, i) => drum(j, 58, at, i < 6 ? 0.22 + i * 0.03 : 0.5, 0.45));
    const mel = [[261.6, 0, 0.16], [329.6, 0.2, 0.16], [392, 0.4, 0.16], [523.25, 0.6, 0.5], [392, 1.15, 0.28], [523.25, 1.5, 1.6]];
    mel.forEach(([f, at, len]) => brass(j, f, at, len, 0.2));
    [261.6, 329.6, 392].forEach(f => brass(j, f, 1.5, 1.6, 0.09));
    [523.25, 659.3, 784].forEach(f => brass(j, f, 2.3, 0.9, 0.06));
    burst(j, { ftype: 'highpass', f: 4000, q: 0.5, a: 0.01, d: 1.4, peak: 0.14, at: 1.5 });
    burst(j, { ftype: 'highpass', f: 4000, q: 0.5, a: 0.01, d: 1.6, peak: 0.12, at: 2.3 });
  } };
  DEFS.defeat = { level: 0.9, fn(j) {
    stringsChord(j, [130.8, 155.6, 196, 261.6], 0, 2.0, 0.35, 800);
    tone(j, { type: 'triangle', f: 392, f2: 196, glide: 2.2, a: 0.3, hold: 1.6, r: 0.6, peak: 0.08 });
    drum(j, 48, 0.8, 0.4, 0.8);
    tone(j, { f: 65.4, a: 0.5, hold: 1.8, r: 0.8, peak: 0.2 });
  } };
  DEFS.dragon_roar = { level: 1, fn(j) {
    const ws = drive(j, 4);
    const end = tone(j, { type: 'sawtooth', f: 62, f2: 40, glide: 1.2, a: 0.08, hold: 0.9, r: 0.35, peak: 0.3, dest: filt(j, 'lowpass', 450, 2, ws) });
    burst(j, { f: 520, f2: 190, glide: 1.1, q: 1.5, a: 0.08, hold: 0.85, r: 0.35, peak: 0.32, dest: ws });
    tone(j, { type: 'sawtooth', f: 950, f2: 480, glide: 0.5, a: 0.05, hold: 0.35, r: 0.2, peak: 0.08, dest: filt(j, 'bandpass', 1500, 2.5) });
    lfo(j, 13, 0.4, j.out.gain, j.t, end);
    tone(j, { f: 38, a: 0.1, hold: 0.9, r: 0.4, peak: 0.25 });
  } };
  DEFS.giant_stomp = { level: 1, fn(j) {
    tone(j, { f: 58, f2: 24, glide: 0.4, a: 0.004, d: 0.55, peak: 0.55 });
    burst(j, { ftype: 'lowpass', f: 220, q: 0.8, a: 0.004, d: 0.3, peak: 0.4 });
    [0.15, 0.22, 0.31, 0.38].forEach(at => burst(j, { f: 1500, q: 2, d: 0.02, peak: 0.1, at }));
  } };
  DEFS.magic_summon = { level: 0.85, fn(j) {
    const lp = filt(j, 'lowpass', 200, 4);
    glide(lp.frequency, j.t, 200, 4200, 0.9);
    [-8, 8].forEach(dt => tone(j, { type: 'sawtooth', f: 110, detune: dt, a: 0.1, hold: 0.7, r: 0.3, peak: 0.12, dest: lp }));
    tone(j, { f: 55, a: 0.1, hold: 0.8, r: 0.3, peak: 0.2 });
    const d = echo(j, 0.15, 0.35, 0.4);
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(j, { f, a: 0.004, d: 0.6, peak: 0.1, at: 0.85 + i * 0.06, dest: d }));
  } };
  DEFS.heal = { level: 0.8, fn(j) {
    const d = echo(j, 0.22, 0.3, 0.4);
    [659.3, 830.6, 987.8, 1318.5].forEach((f, i) => tone(j, { f, a: 0.08, d: 1.2, peak: 0.11, at: i * 0.1, dest: d }));
    burst(j, { f: 2000, q: 1.5, a: 0.3, d: 0.6, peak: 0.05 });
  } };
  DEFS.morale_break = { level: 0.9, fn(j) {
    const lp = filt(j, 'lowpass', 900, 2);
    const end = tone(j, { type: 'sawtooth', f: 420, f2: 140, glide: 0.55, a: 0.02, hold: 0.4, r: 0.2, peak: 0.22, dest: lp });
    lfo(j, 7, 300, lp.frequency, j.t, end);
    drum(j, 60, 0, 0.35, 0.4);
    burst(j, { ftype: 'highpass', f: 2000, q: 0.5, a: 0.005, d: 0.3, peak: 0.12 });
  } };

  // ------------------------------------------------------------------ API
  /** play a named effect. opts: {volume 0..1, pitch (multiplier), pan -1..1, delay (s)} */
  SFX.play = function (name, opts) {
    const def = DEFS[name];
    if (!def) { AOW.log && AOW.log('[SFX] unknown', name); return false; }
    const now = Date.now();
    const last = lastPlayed.get(name);
    if (last !== undefined && now - last < SFX.MIN_GAP_MS) return false;
    lastPlayed.set(name, now);
    const A = AOW.Audio;
    if (!A.ctx) A.init();
    if (!A.ctx) return false;
    if (A.ctx.state === 'suspended') A.resume();
    opts = opts || {};
    const j = job(def, opts);
    try { def.fn(j, opts); } catch (e) { console.error('[SFX]', name, e); }
    finish(j, def.tail);
    return true;
  };
  SFX.demo = SFX.play;
  SFX.list = function () { return Object.keys(DEFS); };
  SFX.has = function (name) { return !!DEFS[name]; };

  AOW.SFX = SFX;
})(window.AOW = window.AOW || {});
