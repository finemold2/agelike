// src/audio/synth.js — AOW.Audio (context, buses, reverb, volumes) + AOW.Synth (Web Audio instruments)
//
// Additive helpers beyond SPEC §8 (documented here):
//   Audio.init({ctx, force})     optional context (tests pass an OfflineAudioContext); force:true tears down
//                                and rebinds an already-initialised graph to a new ctx (tests only — lets one
//                                page render several OfflineAudioContexts in sequence)
//   Audio.getVolume()            → {master, music, sfx}
//   Audio.setMuted(b)/toggleMute()/isMuted()
//   Audio.resume()/suspend()     page-visibility helpers; Audio.ready → bool; Audio.onReady(cb)
//   Audio.reverbSend(node, amt)  → GainNode routed into the hall reverb
//   Audio.noiseBuffer()          → shared 2 s white-noise AudioBuffer (SFX reuse it)
//   Audio.demo()                 plays a short scale on every instrument
//   Synth.instrument(name, {dest, reverbDest}) → private instance routed into a custom bus (music player uses this
//                                for per-song crossfade gains); without opts a shared per-name instance is returned
//   instrument: { name, gain, noteOn(midi, when, vel, dur), stop(when), dispose(), voiceCount() }
//   Synth.list() → instrument names ; Synth.midiToFreq(midi)
(function (AOW) {
  'use strict';
  const Audio = {};
  const Synth = {};
  const STORE_KEY = 'aow.audio';
  const DEFAULT_VOL = { master: 0.8, music: 0.7, sfx: 0.8 };

  // ------------------------------------------------------------------ Audio: context + buses
  let vol = loadVolumes();
  let muted = false;
  const readyCbs = [];
  Audio.ready = false;
  Audio.ctx = null;

  function loadVolumes() {
    const v = Object.assign({}, DEFAULT_VOL);
    try {
      const s = localStorage.getItem(STORE_KEY);
      if (s) { const o = JSON.parse(s); for (const k in DEFAULT_VOL) if (typeof o[k] === 'number') v[k] = clamp01(o[k]); if (o.muted) muted = true; }
    } catch (e) { /* storage unavailable */ }
    return v;
  }
  function saveVolumes() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ master: vol.master, music: vol.music, sfx: vol.sfx, muted })); } catch (e) { /* ignore */ }
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : (isFinite(x) ? x : 0); }

  /** create the audio graph. Idempotent. opts.ctx lets tests inject an OfflineAudioContext.
   *  opts.force + a different opts.ctx tears down the current graph and rebinds it to the new
   *  context (tests only: lets one page render through several OfflineAudioContexts in turn). */
  Audio.init = function (opts) {
    const wantCtx = opts && opts.ctx;
    if (Audio.ctx) {
      if (!(opts && opts.force) || Audio.ctx === wantCtx) return Audio.ctx;
      try {
        for (const n of [Audio.master, Audio.mix, Audio.musicBus, Audio.sfxBus, Audio.compressor,
          Audio.reverbIn, Audio.preDelay, Audio.reverb, Audio.reverbLP, Audio.reverbReturn]) {
          if (n && n.disconnect) n.disconnect();
        }
      } catch (e) { /* ignore */ }
      for (const v of voices) killVoice(v, 0);
      voices.clear();
      shared.clear();
      waveCache.clear(); // defensive: periodic waves are cached per-key, harmless to rebuild on a fresh ctx
      Audio.ctx = null; Audio.ready = false;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = wantCtx || (AC ? new AC({ latencyHint: 'interactive' }) : null);
    if (!ctx) return null;
    Audio.ctx = ctx;
    Audio.offline = !!wantCtx;
    // buses: music/sfx → mix → compressor → master(user volume) → destination
    Audio.master = ctx.createGain();
    Audio.mix = ctx.createGain();
    Audio.musicBus = ctx.createGain();
    Audio.sfxBus = ctx.createGain();
    Audio.compressor = ctx.createDynamicsCompressor();
    const c = Audio.compressor;
    c.threshold.value = -14; c.knee.value = 18; c.ratio.value = 5; c.attack.value = 0.004; c.release.value = 0.22;
    Audio.musicBus.connect(Audio.mix);
    Audio.sfxBus.connect(Audio.mix);
    Audio.mix.connect(c);
    c.connect(Audio.master);
    Audio.master.connect(ctx.destination);
    // hall reverb: reverbIn → preDelay → convolver → lowpass → return → mix
    Audio.reverbIn = ctx.createGain();
    Audio.preDelay = ctx.createDelay(0.1);
    Audio.preDelay.delayTime.value = 0.024;
    Audio.reverb = ctx.createConvolver();
    Audio.reverb.buffer = makeImpulse(ctx, 2.2);
    Audio.reverbLP = ctx.createBiquadFilter();
    Audio.reverbLP.type = 'lowpass'; Audio.reverbLP.frequency.value = 5200; Audio.reverbLP.Q.value = 0.4;
    Audio.reverbReturn = ctx.createGain();
    Audio.reverbReturn.gain.value = 0.55;
    Audio.reverbIn.connect(Audio.preDelay);
    Audio.preDelay.connect(Audio.reverb);
    Audio.reverb.connect(Audio.reverbLP);
    Audio.reverbLP.connect(Audio.reverbReturn);
    Audio.reverbReturn.connect(Audio.mix);
    applyVolumes(true);
    Audio.ready = true;
    if (!Audio.offline && ctx.state === 'suspended' && ctx.resume) { try { ctx.resume().catch(() => {}); } catch (e) { /* needs gesture */ } }
    installVisibility();
    const cbs = readyCbs.splice(0);
    for (const cb of cbs) { try { cb(ctx); } catch (e) { console.error('[Audio]', e); } }
    if (AOW.Events) AOW.Events.emit('audio:ready', { ctx });
    return ctx;
  };

  /** run cb once the context exists (immediately if already initialised) */
  Audio.onReady = function (cb) { if (Audio.ctx) cb(Audio.ctx); else readyCbs.push(cb); };
  Audio.now = function () { return Audio.ctx ? Audio.ctx.currentTime : 0; };

  function applyVolumes(immediate) {
    if (!Audio.ctx) return;
    const t = Audio.ctx.currentTime;
    const set = (g, v) => {
      if (immediate) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(v, t); }
      else { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + 0.05); }
    };
    set(Audio.master, muted ? 0 : vol.master * vol.master); // squared: perceptual-ish curve
    set(Audio.musicBus, vol.music * vol.music);
    set(Audio.sfxBus, vol.sfx * vol.sfx);
  }
  /** set any of {master, music, sfx} in 0..1 */
  Audio.setVolume = function (v) {
    if (!v) return;
    for (const k in DEFAULT_VOL) if (typeof v[k] === 'number') vol[k] = clamp01(v[k]);
    applyVolumes(false);
    saveVolumes();
  };
  Audio.getVolume = function () { return { master: vol.master, music: vol.music, sfx: vol.sfx }; };
  Audio.setMuted = function (b) { muted = !!b; applyVolumes(false); saveVolumes(); return muted; };
  Audio.toggleMute = function () { return Audio.setMuted(!muted); };
  Audio.isMuted = function () { return muted; };
  Audio.resume = function () {
    const ctx = Audio.ctx;
    // OfflineAudioContext has no user-gesture suspend/resume cycle — resuming it before
    // startRendering() throws (rejects), so tests (Audio.offline) skip this entirely.
    if (ctx && !Audio.offline && ctx.state !== 'running' && ctx.resume) {
      try { return ctx.resume().catch(() => {}); } catch (e) { return Promise.resolve(); }
    }
    return Promise.resolve();
  };
  Audio.suspend = function () {
    const ctx = Audio.ctx;
    if (ctx && ctx.state === 'running' && ctx.suspend && !Audio.offline) { try { return ctx.suspend(); } catch (e) { /* ignore */ } }
    return Promise.resolve();
  };
  /** connect `node` into the hall reverb with the given send amount; returns the send GainNode */
  Audio.reverbSend = function (node, amount) {
    const g = Audio.ctx.createGain();
    g.gain.value = amount === undefined ? 0.3 : amount;
    node.connect(g);
    g.connect(Audio.reverbIn);
    return g;
  };

  let visInstalled = false;
  function installVisibility() {
    if (visInstalled || typeof document === 'undefined' || Audio.offline) return;
    visInstalled = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) Audio.suspend(); else Audio.resume();
    });
  }
  // first-gesture unlock: create/resume the context as soon as the user interacts (harmless if main.js also calls init)
  if (typeof window !== 'undefined' && window.addEventListener) {
    const unlock = () => { if (!Audio.ctx) Audio.init(); else Audio.resume(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  }

  /** synthesized stereo hall impulse: exponential decay with increasing high-frequency damping + sparse early reflections */
  function makeImpulse(ctx, seconds) {
    const sr = ctx.sampleRate, n = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, n, sr);
    const taps = [[0.011, 0.5], [0.019, 0.38], [0.029, 0.3], [0.037, 0.22], [0.053, 0.16]];
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0, seed = 0x9e3779b9 + ch * 7919;
      for (let i = 0; i < n; i++) {
        seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x1b873593) >>> 0;
        const white = (seed / 4294967296) * 2 - 1;
        const t = i / n;
        const a = 0.85 - 0.72 * t;               // one-pole lowpass coefficient: darker as the tail decays
        lp += a * (white - lp);
        d[i] = lp * Math.exp(-6.9 * t) * (i < 0.004 * sr ? i / (0.004 * sr) : 1);
      }
      for (const [tt, amp] of taps) { const k = Math.floor(tt * sr + ch * 37); if (k < n) d[k] += amp * (ch ? -1 : 1) * 0.6; }
    }
    return buf;
  }

  let noiseBuf = null;
  /** shared 2 s white noise buffer */
  Audio.noiseBuffer = function () {
    const ctx = Audio.ctx;
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    const n = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let s = 22222;
    for (let i = 0; i < n; i++) { s = (Math.imul(s ^ (s >>> 13), 0x5bd1e995) + 0x27d4eb2f) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
    return noiseBuf;
  };

  // ------------------------------------------------------------------ Synth: voices
  const MAX_VOICES = 48;
  const voices = new Set();
  const midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);
  Synth.midiToFreq = midiToFreq;
  Synth.MAX_VOICES = MAX_VOICES;

  function hasParamHold(p) { return typeof p.cancelAndHoldAtTime === 'function'; }
  function killVoice(v, t) {
    if (v.dead) return;
    v.dead = true;
    const g = v.env.gain;
    try {
      if (hasParamHold(g)) g.cancelAndHoldAtTime(t); else g.cancelScheduledValues(t);
      g.setTargetAtTime(0, t, 0.012);
    } catch (e) { /* ignore */ }
    for (const s of v.sources) { try { s.stop(t + 0.08); } catch (e) { /* already stopped */ } }
  }
  function cleanupVoice(v) {
    voices.delete(v);
    if (v.inst) v.inst._voices.delete(v);
    for (const n of v.nodes) { try { n.disconnect(); } catch (e) { /* ignore */ } }
    v.nodes.length = 0; v.sources.length = 0;
  }
  /** register a voice; enforces the polyphony cap by fading the oldest voice overlapping the new start */
  function registerVoice(v) {
    let overlapping = 0, oldest = null;
    for (const o of voices) {
      if (o.dead || o.stopAt <= v.start || o.start > v.start) continue;
      overlapping++;
      if (!oldest || o.start < oldest.start) oldest = o;
    }
    if (overlapping >= MAX_VOICES && oldest) killVoice(oldest, Math.max(v.start - 0.02, Audio.ctx.currentTime));
    voices.add(v);
    v.inst._voices.add(v);
    const primary = v.sources[0];
    primary.onended = () => cleanupVoice(v);
  }
  Synth.voiceCount = function () { let n = 0; const t = Audio.now(); for (const v of voices) if (!v.dead && v.stopAt > t) n++; return n; };

  // ------------------------------------------------------------------ building blocks
  const V = {
    osc(v, type, freq, detune) {
      const o = Audio.ctx.createOscillator();
      if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
      o.frequency.value = freq;
      if (detune) o.detune.value = detune;
      v.sources.push(o); v.nodes.push(o);
      return o;
    },
    gain(v, value) { const g = Audio.ctx.createGain(); g.gain.value = value === undefined ? 1 : value; v.nodes.push(g); return g; },
    filter(v, type, freq, q) { const f = Audio.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q !== undefined) f.Q.value = q; v.nodes.push(f); return f; },
    noise(v) { const s = Audio.ctx.createBufferSource(); s.buffer = Audio.noiseBuffer(); s.loop = true; v.sources.push(s); v.nodes.push(s); return s; },
    pan(v, p) {
      const ctx = Audio.ctx;
      if (!ctx.createStereoPanner) return null;
      const n = ctx.createStereoPanner(); n.pan.value = Math.max(-1, Math.min(1, p)); v.nodes.push(n); return n;
    },
    /** attack → (optional decay to sustain) → hold until end → release. Returns stop time. */
    adsr(param, when, peak, a, d, s, end, r) {
      param.setValueAtTime(0.0001, when);
      param.linearRampToValueAtTime(peak, when + a);
      if (d > 0 && s < 1) param.setTargetAtTime(peak * s, when + a, d / 3);
      const rel = Math.max(end, when + a + 0.01);
      param.setTargetAtTime(0, rel, r / 5);
      return rel + r + 0.05;
    },
    /** percussive: fast attack then exponential decay (tc), with an extra release at note end */
    pluck(param, when, peak, a, tau, end, r) {
      param.setValueAtTime(0.0001, when);
      param.linearRampToValueAtTime(peak, when + a);
      param.setTargetAtTime(0, when + a, tau / 6.9);
      const rel = Math.max(end, when + a + 0.01);
      param.setTargetAtTime(0, rel, r / 5);
      return Math.min(rel + r + 0.05, when + tau + 0.4);
    },
    /** vibrato LFO → gain(depth in Hz) → each oscillator's frequency; depth fades in after `delay` */
    vibrato(v, oscs, rate, depthHz, when, delay, fadeIn) {
      const lfo = V.osc(v, 'sine', rate);
      const g = V.gain(v, 0);
      g.gain.setValueAtTime(0, when);
      g.gain.setValueAtTime(0, when + delay);
      g.gain.linearRampToValueAtTime(depthHz, when + delay + (fadeIn || 0.5));
      lfo.connect(g);
      for (const o of oscs) g.connect(o.frequency);
      lfo.start(when);
      return lfo;
    },
    panFor(midi, spread) { return Math.max(-0.8, Math.min(0.8, (midi - 62) / 30 * (spread === undefined ? 1 : spread))); },
  };

  const waveCache = new Map();
  function periodicWave(key, real, imag) {
    let w = waveCache.get(key);
    if (!w) { w = Audio.ctx.createPeriodicWave(real, imag, { disableNormalization: false }); waveCache.set(key, w); }
    return w;
  }
  function pulseWave(duty) {
    const key = 'pulse' + duty;
    if (waveCache.has(key)) return waveCache.get(key);
    const N = 32, real = new Float32Array(N), imag = new Float32Array(N);
    for (let n = 1; n < N; n++) { real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty); }
    return periodicWave(key, real, imag);
  }
  function drawbarWave() {
    const key = 'organ';
    if (waveCache.has(key)) return waveCache.get(key);
    const amps = [0, 1, 0.75, 0.55, 0.6, 0, 0.32, 0, 0.28, 0, 0.12, 0, 0.1];   // 16' 8' 5⅓' 4' - 2⅔' - 2' ...
    const real = new Float32Array(amps.length), imag = new Float32Array(amps.length);
    for (let i = 0; i < amps.length; i++) imag[i] = amps[i];
    return periodicWave(key, real, imag);
  }

  // ------------------------------------------------------------------ instrument definitions
  // each: build(v, inst, midi, when, vel, dur) → must connect into v.out (GainNode), start sources, return stopAt
  const DEFS = {};

  DEFS.piano = { level: 0.55, reverb: 0.22, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi), end = when + dur;
    const bright = 0.35 + vel * 0.8;
    const tau = Math.max(0.5, 6.5 * Math.pow(2, -(midi - 48) / 14));   // ring time falls with pitch
    const lp = V.filter(v, 'lowpass', Math.min(12000, 700 + Math.pow(vel, 1.4) * 6500 + f * 2.2), 0.6);
    lp.frequency.setTargetAtTime(Math.min(12000, 400 + f * 1.8 + vel * 1500), when + 0.01, tau / 5);
    lp.connect(v.out);
    const partials = [[1.0, 'sine', 1.0, 1.0, 0], [1.0, 'triangle', 0.32, 1.0, 4], [2.0016, 'sine', 0.5 * bright, 0.55, -3], [3.006, 'sine', 0.22 * bright, 0.38, 5], [4.012, 'sine', 0.09 * bright, 0.28, 0]];
    for (const [ratio, type, amp, decayMul, cents] of partials) {
      if (f * ratio > 16000) continue;
      const o = V.osc(v, type, f * ratio, cents);
      const g = V.gain(v, 0);
      V.pluck(g.gain, when, amp, 0.004, tau * decayMul, end, 0.3);
      o.connect(g); g.connect(lp);
      o.start(when);
    }
    // hammer: 8 ms filtered noise burst
    const nz = V.noise(v), nf = V.filter(v, 'bandpass', Math.min(6000, 900 + f * 1.5), 0.8), ng = V.gain(v, 0);
    ng.gain.setValueAtTime(0, when);
    ng.gain.linearRampToValueAtTime(0.12 * vel * vel, when + 0.002);
    ng.gain.exponentialRampToValueAtTime(0.0005, when + 0.012);
    nz.connect(nf); nf.connect(ng); ng.connect(v.out);
    nz.start(when); nz.stop(when + 0.03);
    const stopAt = Math.min(Math.max(end, when + 0.05) + 0.4, when + tau + 0.5);
    v.pan = V.panFor(midi, 1);
    return stopAt;
  } };

  function stringsLike(v, inst, midi, when, vel, dur, o) {
    const f = midiToFreq(midi), end = when + dur;
    const att = Math.min(dur * 0.6, o.attMin + (1 - vel) * (o.attMax - o.attMin));
    const lp = V.filter(v, 'lowpass', o.cutLo + vel * (o.cutHi - o.cutLo) + f * 0.6, 0.9);
    lp.frequency.setValueAtTime(o.cutLo * 0.5 + f, when);
    lp.frequency.linearRampToValueAtTime(o.cutLo + vel * (o.cutHi - o.cutLo) + f * 0.6, when + att + 0.1);
    const env = V.gain(v, 0);
    lp.connect(env); env.connect(v.out);
    const oscs = [];
    for (const c of o.detunes) { const s = V.osc(v, 'sawtooth', f, c); const g = V.gain(v, 1 / o.detunes.length); s.connect(g); g.connect(lp); oscs.push(s); s.start(when); }
    if (o.body) { const s = V.osc(v, 'sine', f); const g = V.gain(v, o.body); s.connect(g); g.connect(env); s.start(when); oscs.push(s); }
    V.vibrato(v, oscs, o.vibRate, f * o.vibDepth, when, 0.3, 0.5);
    const stopAt = V.adsr(env.gain, when, 0.6 + vel * 0.4, att, 0.4, 0.85, end, o.rel);
    v.pan = V.panFor(midi, o.spread);
    return stopAt;
  }
  DEFS.strings = { level: 0.3, reverb: 0.38, build: (v, i, m, w, vel, d) => stringsLike(v, i, m, w, vel, d, { attMin: 0.25, attMax: 0.6, cutLo: 1800, cutHi: 3000, detunes: [-7, 0, 8], vibRate: 5, vibDepth: 0.006, rel: 0.5, spread: 0.6, body: 0 }) };
  DEFS.cello = { level: 0.32, reverb: 0.32, build: (v, i, m, w, vel, d) => stringsLike(v, i, m, w, vel, d, { attMin: 0.16, attMax: 0.4, cutLo: 1100, cutHi: 2000, detunes: [-5, 0, 6], vibRate: 4.6, vibDepth: 0.007, rel: 0.45, spread: 0.4, body: 0.3 }) };
  DEFS.pad = { level: 0.2, reverb: 0.45, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi), end = when + dur;
    const lp = V.filter(v, 'lowpass', 900 + vel * 1200, 0.7);
    lp.frequency.setValueAtTime(300 + f, when);
    lp.frequency.linearRampToValueAtTime(900 + vel * 1400 + f, when + 1.2);
    const env = V.gain(v, 0); lp.connect(env); env.connect(v.out);
    const oscs = [];
    for (const c of [-11, -4, 5, 12]) { const s = V.osc(v, 'sawtooth', f, c); const g = V.gain(v, 0.22); s.connect(g); g.connect(lp); s.start(when); oscs.push(s); }
    const sub = V.osc(v, 'sine', f / 2); const sg = V.gain(v, 0.35); sub.connect(sg); sg.connect(env); sub.start(when);
    V.vibrato(v, oscs, 0.35, f * 0.003, when, 0, 2);
    v.pan = V.panFor(midi, 0.5);
    return V.adsr(env.gain, when, 0.7 + vel * 0.3, Math.min(dur * 0.7, 0.6), 0.5, 0.9, end, 0.9);
  } };

  DEFS.harp = { level: 0.45, reverb: 0.32, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi);
    const lp = V.filter(v, 'lowpass', 2500 + vel * 5000, 0.5); lp.connect(v.out);
    const tau = Math.max(0.6, 1.8 * Math.pow(2, -(midi - 60) / 20));
    const oscs = [['triangle', 0.7, 1], ['sine', 0.5, 1], ['sine', 0.12 * vel, 2.003]];
    let stopAt = when;
    for (const [type, amp, ratio] of oscs) {
      const o = V.osc(v, type, f * ratio);
      o.frequency.setValueAtTime(f * ratio * 1.035, when);
      o.frequency.exponentialRampToValueAtTime(f * ratio, when + 0.018);
      const g = V.gain(v, 0);
      stopAt = Math.max(stopAt, V.pluck(g.gain, when, amp, 0.003, tau * (ratio > 1 ? 0.4 : 1), Math.max(when + dur, when + 0.9), 0.25));
      o.connect(g); g.connect(lp); o.start(when);
    }
    v.pan = V.panFor(midi, 1);
    return stopAt;
  } };

  DEFS.celesta = { level: 0.42, reverb: 0.4, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi);
    const env = V.gain(v, 1); env.connect(v.out);
    let stopAt = when;
    for (const [ratio, amp, tau] of [[1, 1, 1.4], [2.76, 0.28 * (0.5 + vel), 0.45], [5.4, 0.1 * vel, 0.2], [0.5, 0.15, 0.8]]) {
      if (f * ratio > 15000) continue;
      const o = V.osc(v, 'sine', f * ratio); const g = V.gain(v, 0);
      stopAt = Math.max(stopAt, V.pluck(g.gain, when, amp, 0.002, tau, Math.max(when + dur, when + 0.8), 0.2));
      o.connect(g); g.connect(env); o.start(when);
    }
    v.pan = V.panFor(midi, 1);
    return stopAt;
  } };

  DEFS.flute = { level: 0.5, reverb: 0.32, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi), end = when + dur;
    const env = V.gain(v, 0); env.connect(v.out);
    const o1 = V.osc(v, 'sine', f), g1 = V.gain(v, 1); o1.connect(g1); g1.connect(env); o1.start(when);
    const o2 = V.osc(v, 'sine', f * 2), g2 = V.gain(v, 0.12 + vel * 0.12); o2.connect(g2); g2.connect(env); o2.start(when);
    const o3 = V.osc(v, 'triangle', f, 3), g3 = V.gain(v, 0.18); o3.connect(g3); g3.connect(env); o3.start(when);
    const nz = V.noise(v), nf = V.filter(v, 'bandpass', f * 2, 6), ng = V.gain(v, 0.035 + vel * 0.03);
    nz.connect(nf); nf.connect(ng); ng.connect(env); nz.start(when);
    V.vibrato(v, [o1, o2, o3], 5.3, f * 0.0045, when, 0.25, 0.4);
    v.pan = V.panFor(midi, 0.5);
    return V.adsr(env.gain, when, 0.6 + vel * 0.4, 0.08, 0.2, 0.9, end, 0.14);
  } };

  DEFS.oboe = { level: 0.3, reverb: 0.28, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi), end = when + dur;
    const env = V.gain(v, 0); env.connect(v.out);
    const o = V.osc(v, pulseWave(0.3), f);
    const dry = V.filter(v, 'lowpass', 2400 + vel * 800, 0.7), dg = V.gain(v, 0.5);
    o.connect(dry); dry.connect(dg); dg.connect(env);
    for (const [fc, q, amp] of [[1400, 5, 0.9], [3000, 7, 0.45]]) { const bp = V.filter(v, 'bandpass', fc, q); const g = V.gain(v, amp); o.connect(bp); bp.connect(g); g.connect(env); }
    o.start(when);
    V.vibrato(v, [o], 5.6, f * 0.005, when, 0.3, 0.4);
    v.pan = V.panFor(midi, 0.4);
    return V.adsr(env.gain, when, 0.6 + vel * 0.4, 0.06, 0.15, 0.9, end, 0.12);
  } };

  DEFS.horn = { level: 0.34, reverb: 0.4, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi), end = when + dur;
    const att = Math.min(dur * 0.5, 0.1 + (1 - vel) * 0.12);
    const lp = V.filter(v, 'lowpass', 500, 1.1);
    lp.frequency.setValueAtTime(350 + f, when);
    lp.frequency.linearRampToValueAtTime(600 + vel * 1500 + f, when + att + 0.15);
    const env = V.gain(v, 0); lp.connect(env); env.connect(v.out);
    const a = V.osc(v, 'sawtooth', f, -3), ga = V.gain(v, 0.55); a.connect(ga); ga.connect(lp); a.start(when);
    const b = V.osc(v, 'square', f, 3), gb = V.gain(v, 0.3); b.connect(gb); gb.connect(lp); b.start(when);
    const s = V.osc(v, 'sine', f), gs = V.gain(v, 0.35); s.connect(gs); gs.connect(env); s.start(when);
    V.vibrato(v, [a, b, s], 4.8, f * 0.003, when, 0.4, 0.6);
    v.pan = V.panFor(midi, 0.4);
    return V.adsr(env.gain, when, 0.6 + vel * 0.4, att, 0.25, 0.85, end, 0.22);
  } };

  DEFS.choir = { level: 0.3, reverb: 0.5, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi), end = when + dur;
    const att = Math.min(dur * 0.6, 0.3 + (1 - vel) * 0.25);
    const env = V.gain(v, 0); env.connect(v.out);
    const sum = V.gain(v, 1);
    const oscs = [];
    for (const c of [-6, 7]) { const o = V.osc(v, 'sawtooth', f, c); const g = V.gain(v, 0.5); o.connect(g); g.connect(sum); o.start(when); oscs.push(o); }
    for (const [fc, q, amp] of [[700, 7, 1], [1200, 9, 0.55], [2500, 11, 0.22]]) { const bp = V.filter(v, 'bandpass', fc, q); const g = V.gain(v, amp); sum.connect(bp); bp.connect(g); g.connect(env); }
    const body = V.osc(v, 'sine', f), gb = V.gain(v, 0.4); body.connect(gb); gb.connect(env); body.start(when); oscs.push(body);
    V.vibrato(v, oscs, 4.4, f * 0.004, when, 0.5, 0.8);
    v.pan = V.panFor(midi, 0.5);
    return V.adsr(env.gain, when, 0.6 + vel * 0.4, att, 0.3, 0.9, end, 0.5);
  } };

  DEFS.bass = { level: 0.5, reverb: 0.06, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi), end = when + dur;
    const lp = V.filter(v, 'lowpass', 380 + vel * 300, 0.8);
    const env = V.gain(v, 0); lp.connect(env); env.connect(v.out);
    const s = V.osc(v, 'sine', f), gs = V.gain(v, 0.6); s.connect(gs); gs.connect(env); s.start(when);
    const t = V.osc(v, 'triangle', f, 2), gt = V.gain(v, 0.45); t.connect(gt); gt.connect(lp); t.start(when);
    v.pan = 0;
    return V.adsr(env.gain, when, 0.7 + vel * 0.3, 0.012, 0.35, 0.7, end, 0.15);
  } };

  DEFS.organ = { level: 0.28, reverb: 0.35, build(v, inst, midi, when, vel, dur) {
    const f = midiToFreq(midi), end = when + dur;
    const env = V.gain(v, 0); env.connect(v.out);
    const o = V.osc(v, drawbarWave(), f);
    const tremStage = V.gain(v, 1); o.connect(tremStage); tremStage.connect(env); o.start(when);
    const trem = V.osc(v, 'sine', 5.6), tg = V.gain(v, 0.06); trem.connect(tg); tg.connect(tremStage.gain); trem.start(when);
    v.pan = V.panFor(midi, 0.5);
    return V.adsr(env.gain, when, 0.7 + vel * 0.3, 0.02, 0, 1, end, 0.08);
  } };

  Synth.list = function () { return Object.keys(DEFS); };

  // ------------------------------------------------------------------ instrument objects
  function Instrument(name, opts) {
    const def = DEFS[name] || DEFS.piano;
    const ctx = Audio.ctx;
    this.name = DEFS[name] ? name : 'piano';
    this.def = def;
    this._voices = new Set();
    this.gain = ctx.createGain();            // track/instrument volume (set by the player)
    this.gain.gain.value = 1;
    this.out = ctx.createGain();             // instrument level trim
    this.out.gain.value = def.level;
    this.out.connect(this.gain);
    this.gain.connect((opts && opts.dest) || Audio.musicBus);
    this.send = ctx.createGain();
    this.send.gain.value = def.reverb;
    this.gain.connect(this.send);
    this.send.connect((opts && opts.reverbDest) || Audio.reverbIn);
    this.disposed = false;
  }
  /** schedule a full note (attack…release). when = AudioContext time; vel 0..1; dur seconds. */
  Instrument.prototype.noteOn = function (midi, when, vel, dur) {
    if (this.disposed || !Audio.ctx) return null;
    const ctx = Audio.ctx;
    if (when === undefined || when < ctx.currentTime) when = ctx.currentTime + 0.005;
    vel = vel === undefined ? 0.8 : Math.max(0.02, Math.min(1, vel));
    dur = Math.max(0.03, dur || 0.5);
    const v = { start: when, stopAt: 0, dead: false, inst: this, sources: [], nodes: [], pan: 0, env: null, out: null };
    v.out = ctx.createGain(); v.nodes.push(v.out);
    v.env = v.out;
    const stopAt = this.def.build(v, this, midi, when, vel, dur);
    v.stopAt = stopAt;
    const panner = V.pan(v, v.pan);
    if (panner) { v.out.connect(panner); panner.connect(this.out); } else v.out.connect(this.out);
    for (const s of v.sources) { try { s.stop(stopAt); } catch (e) { /* noise sources with explicit stop */ } }
    registerVoice(v);
    return v;
  };
  /** fade out every sounding voice of this instrument */
  Instrument.prototype.stop = function (when) {
    const t = when === undefined ? Audio.ctx.currentTime : when;
    for (const v of this._voices) killVoice(v, t);
  };
  Instrument.prototype.voiceCount = function () { return this._voices.size; };
  /** stop and disconnect from the graph (private instances created by the music player) */
  Instrument.prototype.dispose = function (when) {
    if (this.disposed) return;
    this.stop(when);
    this.disposed = true;
    const done = () => { try { this.gain.disconnect(); this.send.disconnect(); this.out.disconnect(); } catch (e) { /* ignore */ } };
    if (Audio.offline || when === undefined) setTimeout(done, 300); else setTimeout(done, Math.max(0, (when - Audio.ctx.currentTime) * 1000) + 300);
  };

  const shared = new Map();
  /**
   * get an instrument. Without opts → shared instance per name (routed into the music bus).
   * With opts {dest, reverbDest} → a private instance routed into the given nodes (used for per-song crossfades).
   */
  Synth.instrument = function (name, opts) {
    if (!Audio.ctx) Audio.init();
    if (!Audio.ctx) return null;
    if (opts) return new Instrument(name, opts);
    let inst = shared.get(name);
    if (!inst || inst.disposed) { inst = new Instrument(name); shared.set(name, inst); }
    return inst;
  };
  Synth.create = function (name, opts) { return Synth.instrument(name, opts || {}); };
  Synth.stopAll = function (when) { const t = when === undefined ? Audio.now() : when; for (const v of voices) killVoice(v, t); };

  /** manual test: a short scale on each instrument in sequence; returns total seconds */
  Audio.demo = function (names) {
    if (!Audio.ctx) Audio.init();
    if (!Audio.ctx) return 0;
    Audio.resume();
    const list = names || Synth.list();
    let t = Audio.now() + 0.1;
    const scale = [60, 62, 64, 65, 67, 69, 71, 72];
    for (const name of list) {
      const inst = Synth.instrument(name);
      scale.forEach((m, i) => inst.noteOn(m, t + i * 0.28, 0.5 + 0.05 * i, 0.26));
      inst.noteOn(48, t + 2.3, 0.7, 1.2); inst.noteOn(64, t + 2.3, 0.6, 1.2); inst.noteOn(67, t + 2.3, 0.6, 1.2);
      t += 3.9;
    }
    return t - Audio.now();
  };

  AOW.Audio = Audio;
  AOW.Synth = Synth;
})(window.AOW = window.AOW || {});
