// src/audio/music.js — AOW.Music: lookahead sequencer + mood playlist with crossfades
//
// Additive helpers beyond SPEC §8 (documented here):
//   Music.prev(), Music.stop(), Music.isPlaying(), Music.nowPlaying() → {id,title,composer,moods} | null
//   Music.setVolume(v), Music.onChange(cb) → off(), Music.list() → [{id,title,composer,moods,lengthSec}]
//   Music.playlist(mood?) → ids for a mood (or {mood:[ids]} for all moods)
//   Music.getMood(), Music.previewNotes(notes, instrumentName, bpm) (raw [[beat,midi,dur,vel]] test playback)
//   Music.position() → seconds into the current song
//   Music.renderOffline(songId, seconds, ctx) → Promise<AudioBuffer>  binds AOW.Audio to `ctx` (an
//     OfflineAudioContext; rebinds with {force:true} if AOW.Audio already points elsewhere), schedules
//     the notes of `songId` that start within [0, seconds) through the same event-building/scheduling
//     code Music.play() uses, then returns ctx.startRendering(). For tests only — does not touch the
//     live playlist (current/mood/history are untouched).
//   Listens to Events 'audio:mood' {mood} as an alternative to calling setMood directly.
(function (AOW) {
  'use strict';
  const Music = {};
  const LOOKAHEAD = 0.4;    // seconds scheduled ahead of the audio clock
  const TICK_MS = 25;
  const GAP = 2.5;          // silence between songs
  const XFADE_OUT = 2.0;    // fade-out of the replaced song
  const XFADE_IN = 1.0;     // fade-in of the replacing song
  const IMMEDIATE_MOODS = { battle: 1, victory: 1, defeat: 1 };

  let mood = 'menu';
  let current = null;       // active entry
  let retiring = [];        // entries fading out / waiting for disposal
  let timer = null;
  let paused = false;
  let pausedAt = 0;
  let stopped = true;       // user stopped (or never started) → no auto-advance
  let hiddenPause = false;
  let lastTick = 0;
  const history = [];       // ids of songs played before the current one (for prev())
  const changeCbs = [];

  // ------------------------------------------------------------------ song access
  function songs() { return AOW.Songs || {}; }
  function songById(id) { return id ? songs()[id] || null : null; }
  function allIds() { return Object.keys(songs()); }
  function idsForMood(m) { return allIds().filter(id => (songs()[id].moods || []).indexOf(m) >= 0); }
  function lengthSec(song) {
    if (song.lengthSec) return song.lengthSec;
    let end = song.lengthBeats || 0;
    if (!end) for (const t of song.tracks || []) for (const n of t.notes || []) end = Math.max(end, n[0] + n[2]);
    return end * 60 / (song.bpm || 90);
  }
  function info(song) {
    return song ? { id: song.id, title: song.title, composer: song.composer, moods: song.moods || [], lengthSec: Math.round(lengthSec(song)) } : null;
  }

  /** random song for the mood, avoiding the current and recent ones when possible */
  function pickNext(m, excludeId) {
    let pool = idsForMood(m);
    if (!pool.length) pool = allIds();
    if (!pool.length) return null;
    const recent = history.slice(-2);
    let cand = pool.filter(id => id !== excludeId && recent.indexOf(id) < 0);
    if (!cand.length) cand = pool.filter(id => id !== excludeId);
    if (!cand.length) cand = pool;
    return cand[Math.floor(Math.random() * cand.length)];
  }

  // ------------------------------------------------------------------ entries (one per song playback)
  function buildEvents(song) {
    const spb = 60 / (song.bpm || 90);
    const ev = [];
    const baseT = song.transpose || 0;
    for (const tr of song.tracks || []) {
      const g = tr.gain === undefined ? 0.8 : tr.gain;
      const tp = baseT + (tr.transpose || 0);
      const instName = tr.instrument || 'piano';
      for (const n of tr.notes || []) {
        ev.push({ t: n[0] * spb, midi: n[1] + tp, dur: Math.max(0.05, n[2] * spb), vel: Math.min(1, Math.max(0.02, (n[3] === undefined ? 0.8 : n[3]) * g)), inst: instName });
      }
    }
    ev.sort((a, b) => a.t - b.t);
    return ev;
  }

  function createEntry(song, startTime, fadeIn) {
    const A = AOW.Audio, ctx = A.ctx;
    const gain = ctx.createGain();
    const reverbGain = ctx.createGain();
    gain.connect(A.musicBus);
    reverbGain.connect(A.reverbIn);
    const t0 = Math.max(ctx.currentTime, startTime - 0.05);
    for (const g of [gain, reverbGain]) {
      g.gain.setValueAtTime(0.0001, t0);
      if (fadeIn > 0.05) g.gain.linearRampToValueAtTime(1, t0 + fadeIn); else g.gain.linearRampToValueAtTime(1, t0 + 0.02);
    }
    const entry = { id: song.id, song, gain, reverbGain, instruments: new Map(), events: buildEvents(song), cursor: 0, startTime, endTime: startTime + lengthSec(song), fading: false, disposeAt: 0, disposed: false };
    for (const e of entry.events) {
      if (!entry.instruments.has(e.inst)) entry.instruments.set(e.inst, AOW.Synth.instrument(e.inst, { dest: gain, reverbDest: reverbGain }));
    }
    return entry;
  }

  function scheduleEntry(entry, now, horizon) {
    const ev = entry.events;
    while (entry.cursor < ev.length) {
      const e = ev[entry.cursor];
      const at = entry.startTime + e.t;
      if (at >= horizon) break;
      entry.cursor++;
      if (at < now - 0.05) continue;          // missed (after a stall) — skip rather than pile up
      const inst = entry.instruments.get(e.inst);
      if (inst) inst.noteOn(e.midi, at, e.vel, e.dur);
    }
  }

  function fadeOutEntry(entry, when, secs) {
    if (entry.fading) return;
    entry.fading = true;
    for (const g of [entry.gain, entry.reverbGain]) {
      const p = g.gain;
      if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(when); else { p.cancelScheduledValues(when); p.setValueAtTime(p.value, when); }
      p.linearRampToValueAtTime(0.0001, when + secs);
    }
    entry.instruments.forEach(inst => inst.stop(when + secs));
    entry.disposeAt = when + secs + 0.4;
    retiring.push(entry);
  }

  function disposeEntry(entry) {
    if (entry.disposed) return;
    entry.disposed = true;
    entry.instruments.forEach(inst => inst.dispose());
    try { entry.gain.disconnect(); entry.reverbGain.disconnect(); } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ scheduler loop
  function tick() {
    const A = AOW.Audio;
    if (!A.ctx) return;
    try {
      const now = A.ctx.currentTime;
      const wall = Date.now();
      const stall = lastTick ? (wall - lastTick) / 1000 : 0;   // throttled timers → widen the horizon
      lastTick = wall;
      const horizon = A.offline ? Infinity : now + Math.max(LOOKAHEAD, stall * 1.5 + 0.1);
      if (current && !paused) {
        scheduleEntry(current, now, horizon);
        if (!stopped && now >= current.endTime && current.cursor >= current.events.length && !A.offline) {
          // song finished: let the tail ring, then start the next one after GAP seconds of silence
          const old = current;
          old.disposeAt = old.endTime + 4;
          old.fading = true;
          retiring.push(old);
          history.push(old.id);
          if (history.length > 50) history.shift();
          const nextId = pickNext(mood, old.id);
          current = nextId ? createEntry(songById(nextId), old.endTime + GAP, 0) : null;
          fireChange();
        }
      }
      if (retiring.length) {
        for (let i = retiring.length - 1; i >= 0; i--) {
          const r = retiring[i];
          if (now >= r.disposeAt) { disposeEntry(r); retiring.splice(i, 1); }
        }
      }
      if (!current && !retiring.length && timer) { clearInterval(timer); timer = null; }
    } catch (e) { console.error('[Music]', e); }
  }
  function ensureTimer() { if (!timer) timer = setInterval(tick, TICK_MS); }

  function fireChange() {
    const np = Music.nowPlaying();
    for (const cb of changeCbs.slice()) { try { cb(np); } catch (e) { console.error('[Music.onChange]', e); } }
    if (AOW.Events) AOW.Events.emit('music:change', np);
  }

  // ------------------------------------------------------------------ public API
  /** play a song by id, or (null) a random song for the current mood. Crossfades if something is playing. */
  Music.play = function (songId) {
    const A = AOW.Audio;
    if (!A.ctx) A.init();
    if (!A.ctx) return false;
    A.resume();
    let song = songById(songId);
    if (!song) { const id = pickNext(mood, current ? current.id : null); song = songById(id); }
    if (!song) return false;
    const now = A.ctx.currentTime;
    let fadeIn = 0;
    if (current) {
      if (!current.fading) { fadeOutEntry(current, now, XFADE_OUT); fadeIn = XFADE_IN; }
      history.push(current.id);
      if (history.length > 50) history.shift();
    }
    paused = false; stopped = false;
    current = createEntry(song, now + 0.06, fadeIn);
    ensureTimer();
    tick();
    fireChange();
    return true;
  };
  Music.next = function () { return Music.play(pickNext(mood, current ? current.id : null)); };
  Music.prev = function () {
    let id = null;
    while (history.length && !id) { const h = history.pop(); if (h !== (current && current.id)) id = h; }
    if (id && history.length && history[history.length - 1] === id) history.pop();
    return Music.play(id || (current ? current.id : null));
  };
  Music.pause = function () {
    if (!current || paused) return;
    const ctx = AOW.Audio.ctx;
    paused = true;
    pausedAt = ctx.currentTime;
    const p = current.gain.gain;
    if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(pausedAt); else { p.cancelScheduledValues(pausedAt); p.setValueAtTime(p.value, pausedAt); }
    p.linearRampToValueAtTime(0.0001, pausedAt + 0.25);
    current.instruments.forEach(inst => inst.stop(pausedAt + 0.25));
  };
  Music.resume = function () {
    AOW.Audio.resume();
    if (!current || !paused) return;
    const ctx = AOW.Audio.ctx, now = ctx.currentTime;
    const shift = now - pausedAt + 0.1;
    current.startTime += shift; current.endTime += shift;
    // re-schedule the notes that were cut by the pause
    const ev = current.events;
    let c = current.cursor;
    while (c > 0 && current.startTime + ev[c - 1].t >= now) c--;
    current.cursor = c;
    const p = current.gain.gain;
    p.cancelScheduledValues(now); p.setValueAtTime(0.0001, now); p.linearRampToValueAtTime(1, now + 0.3);
    paused = false;
    ensureTimer();
    tick();
  };
  Music.stop = function () {
    stopped = true; paused = false;
    if (current) { fadeOutEntry(current, AOW.Audio.ctx.currentTime, 0.6); current = null; }
    fireChange();
  };
  /** 'menu'|'peace'|'tension'|'battle'|'victory'|'defeat' — battle/victory/defeat switch immediately, others at the next song */
  Music.setMood = function (m) {
    if (!m || m === mood) return;
    mood = m;
    if (stopped || !current) return;
    if (IMMEDIATE_MOODS[m] && (current.song.moods || []).indexOf(m) < 0) {
      const pool = idsForMood(m);
      if (pool.length) Music.play(pickNext(m, current.id));
    }
  };
  Music.getMood = function () { return mood; };
  Music.isPlaying = function () { return !!current && !paused && !stopped; };
  Music.isPaused = function () { return paused; };
  Music.nowPlaying = function () { return current ? info(current.song) : null; };
  Music.position = function () { return current && AOW.Audio.ctx ? Math.max(0, AOW.Audio.ctx.currentTime - current.startTime) : 0; };
  Music.setVolume = function (v) { AOW.Audio.setVolume({ music: v }); };
  Music.onChange = function (cb) { changeCbs.push(cb); return () => { const i = changeCbs.indexOf(cb); if (i >= 0) changeCbs.splice(i, 1); }; };
  Music.list = function () { return allIds().map(id => info(songs()[id])); };
  Music.playlist = function (m) {
    if (m) return idsForMood(m);
    const out = {};
    for (const id of allIds()) for (const mm of songs()[id].moods || []) (out[mm] = out[mm] || []).push(id);
    return out;
  };
  /** play a raw note array [[beat, midi, durBeats, vel], ...] on an instrument; returns the length in seconds */
  Music.previewNotes = function (notes, instrumentName, bpm) {
    const A = AOW.Audio;
    if (!A.ctx) A.init();
    if (!A.ctx) return 0;
    A.resume();
    const inst = AOW.Synth.instrument(instrumentName || 'piano');
    const spb = 60 / (bpm || 100), t0 = A.ctx.currentTime + 0.05;
    let end = 0;
    for (const n of notes) { inst.noteOn(n[1], t0 + n[0] * spb, n[3] === undefined ? 0.8 : n[3], Math.max(0.05, n[2] * spb)); end = Math.max(end, (n[0] + n[2]) * spb); }
    return end;
  };
  Music.demo = Music.previewNotes;
  /** schedule the first `seconds` of `songId` and render it offline (for tests — see header). */
  Music.renderOffline = function (songId, seconds, ctx) {
    const A = AOW.Audio;
    if (A.ctx !== ctx) A.init({ ctx: ctx, force: true });
    const song = songById(songId);
    if (!song) return Promise.reject(new Error('Music.renderOffline: unknown song "' + songId + '"'));
    const entry = createEntry(song, ctx.currentTime + 0.02, 0);
    const cutoff = ctx.currentTime + Math.max(0, seconds || 0);
    for (const e of entry.events) {
      const at = entry.startTime + e.t;
      if (at >= cutoff) break;
      const inst = entry.instruments.get(e.inst);
      if (inst) inst.noteOn(e.midi, at, e.vel, e.dur);
    }
    return ctx.startRendering();
  };

  // ------------------------------------------------------------------ environment hooks
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (Music.isPlaying()) { hiddenPause = true; Music.pause(); } }
      else if (hiddenPause) { hiddenPause = false; Music.resume(); }
    });
  }
  if (AOW.Events) AOW.Events.on('audio:mood', p => { if (p && p.mood) Music.setMood(p.mood); });

  AOW.Music = Music;
})(window.AOW = window.AOW || {});
