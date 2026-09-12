// src/audio/notation.js — compact text notation for song transcription (works in browser and node)
//
// AOW.Notation.parse(seq, opts) → notes [[beat, midi, durBeats, velocity], ...]
// AOW.Notation.song(def) → registers AOW.Songs[def.id] with parsed tracks
//
// Sequence grammar (tokens separated by whitespace; '|' bar lines are ignored; ';' comments to end of line):
//   pitch      : [A-G](#|b)?<octave>          C4 = middle C = midi 60.  A4 = 69.
//   duration   : suffix /N with N in 1,2,4,8,16,32,64 ; optional '.' (dotted, x1.5) or '..' ; optional 't' (triplet, x2/3)
//                e.g. C4/8  D4/4.  E4/8t   — if omitted, the previous duration is reused (initial default: /4)
//   rest       : R/8  (advances the cursor)
//   chord      : [C4 E4 G4]/2   — all notes start at the same beat; an inner note may carry its own duration [C3/1 E4/4 G4/4];
//                the chord advances the cursor by the outer duration (or by the LONGEST inner duration when no outer duration is given)
//   tie        : trailing '~' (C4/4~ C4/4) merges the next same-pitch note into the previous one
//   velocity   : v0.65  sets velocity (0..1) for following notes
//   default dur: L/8 sets the default duration without emitting anything
//   cursor     : @12 sets the cursor to absolute beat 12 (for writing a second voice inside the same track); @+2 / @-1 move relatively
//   glue       : an inner '_' after a token is ignored (formatting only)
// Beats are in quarter notes regardless of time signature (a /4 is one beat, /8 half a beat).
//
// Example (Satie-ish):
//   tracks:[{instrument:'piano', gain:0.9, seq:'L/4 v0.6 G3 [D4 F#4 A4]/2 | R [B3 D4 F#4]/2 | @0 v0.8 L/2 R F#5 A5 G5 F#5 C#5 B4 C#5 D5 A4'}]
(function (root) {
  'use strict';
  const AOW = root.AOW = root.AOW || {};
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const Notation = {};

  function pitchToMidi(tok) {
    const m = /^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)$/.exec(tok);
    if (!m) return null;
    let semi = NOTE[m[1].toUpperCase()];
    if (m[2]) semi += m[2][0] === '#' ? m[2].length : -m[2].length;
    return 12 * (parseInt(m[3], 10) + 1) + semi;
  }
  Notation.pitchToMidi = pitchToMidi;
  Notation.midiToName = function (midi) {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[midi % 12] + (Math.floor(midi / 12) - 1);
  };

  function parseDur(s, fallback) {
    if (!s) return fallback;
    const m = /^\/(\d+)(\.{0,2})(t?)$/.exec(s);
    if (!m) throw new Error('bad duration ' + s);
    let d = 4 / parseInt(m[1], 10);
    if (m[2] === '.') d *= 1.5; else if (m[2] === '..') d *= 1.75;
    if (m[3]) d *= 2 / 3;
    return d;
  }

  /** parse a sequence string into [[beat, midi, dur, vel], ...] */
  Notation.parse = function (seq, opts = {}) {
    const notes = [];
    let cursor = opts.start || 0;
    let dur = opts.dur || 1;
    let vel = opts.vel || 0.8;
    let lastNote = null; // [beat, midi, dur, vel]
    let pendingTie = false;
    const clean = seq.replace(/;[^\n]*/g, ' ').replace(/\|/g, ' ').replace(/_/g, '');
    // tokenize with chord groups
    const tokens = [];
    const re = /\[[^\]]*\](?:\/[\d.]+t?)?~?|\S+/g;
    let m;
    while ((m = re.exec(clean))) tokens.push(m[0]);

    function emit(midi, d, v) {
      if (pendingTie && lastNote && lastNote[1] === midi) {
        lastNote[2] += d;
        pendingTie = false;
        return lastNote;
      }
      const n = [round(cursor), midi, round(d), v];
      notes.push(n);
      lastNote = n;
      return n;
    }
    function round(x) { return Math.round(x * 1000) / 1000; }

    for (let tok of tokens) {
      if (!tok) continue;
      if (tok[0] === '[') {
        const tie = tok.endsWith('~'); if (tie) tok = tok.slice(0, -1);
        const close = tok.lastIndexOf(']');
        const inner = tok.slice(1, close).trim();
        const outerDurStr = tok.slice(close + 1);
        const outerDur = outerDurStr ? parseDur(outerDurStr, dur) : null;
        let maxInner = 0;
        const parts = inner.split(/\s+/).filter(Boolean);
        const startCursor = cursor;
        const chordNotes = [];
        for (const p of parts) {
          const mm = /^([A-Ga-g](?:#{1,2}|b{1,2})?-?\d)(\/[\d.]+t?)?$/.exec(p);
          if (!mm) throw new Error('bad chord note ' + p + ' in ' + tok);
          const midi = pitchToMidi(mm[1]);
          const d = mm[2] ? parseDur(mm[2], dur) : (outerDur || dur);
          maxInner = Math.max(maxInner, d);
          chordNotes.push([round(startCursor), midi, round(d), vel]);
        }
        for (const n of chordNotes) notes.push(n);
        lastNote = chordNotes[chordNotes.length - 1] || lastNote;
        const adv = outerDur || maxInner || dur;
        if (outerDur) dur = outerDur;
        cursor += adv;
        pendingTie = tie;
        continue;
      }
      if (tok[0] === 'v' && /^v[\d.]+$/.test(tok)) { vel = Math.max(0, Math.min(1, parseFloat(tok.slice(1)))); continue; }
      if (tok[0] === 'L' && tok[1] === '/') { dur = parseDur(tok.slice(1), dur); continue; }
      if (tok[0] === '@') {
        const s = tok.slice(1);
        if (s[0] === '+') cursor += parseFloat(s.slice(1));
        else if (s[0] === '-') cursor -= parseFloat(s.slice(1));
        else cursor = parseFloat(s);
        continue;
      }
      const tie = tok.endsWith('~'); if (tie) tok = tok.slice(0, -1);
      const mm = /^(R|r|[A-Ga-g](?:#{1,2}|b{1,2})?-?\d)(\/[\d.]+t?)?$/.exec(tok);
      if (!mm) throw new Error('Notation: bad token "' + tok + '"');
      const d = mm[2] ? parseDur(mm[2], dur) : dur;
      if (mm[2]) dur = d;
      if (mm[1] === 'R' || mm[1] === 'r') { cursor += d; pendingTie = false; continue; }
      const midi = pitchToMidi(mm[1]);
      emit(midi, d, vel);
      cursor += d;
      pendingTie = tie;
    }
    notes.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return notes;
  };

  /** register a song. def.tracks[i] may have `seq` (string or array of strings joined with spaces) or `notes` */
  Notation.song = function (def) {
    if (!def || !def.id) throw new Error('Notation.song: id required');
    const song = Object.assign({}, def);
    song.tracks = (def.tracks || []).map((t, i) => {
      const tr = Object.assign({}, t);
      if (tr.seq !== undefined) {
        const s = Array.isArray(tr.seq) ? tr.seq.join(' ') : tr.seq;
        tr.notes = Notation.parse(s, { dur: tr.dur, vel: tr.vel, start: tr.start });
        delete tr.seq;
      }
      if (!tr.notes) tr.notes = [];
      if (!tr.instrument) tr.instrument = 'piano';
      if (tr.gain === undefined) tr.gain = 0.8;
      tr.name = tr.name || ('track' + i);
      return tr;
    });
    let end = 0;
    for (const t of song.tracks) for (const n of t.notes) end = Math.max(end, n[0] + n[2]);
    song.lengthBeats = end;
    song.lengthSec = end * 60 / (song.bpm || 90);
    AOW.Songs = AOW.Songs || {};
    AOW.Songs[song.id] = song;
    return song;
  };

  /** quick statistics for validating a transcription */
  Notation.stats = function (song) {
    const out = { id: song.id, bpm: song.bpm, lengthBeats: song.lengthBeats, lengthSec: Math.round(song.lengthSec), tracks: [] };
    for (const t of song.tracks) {
      let lo = 127, hi = 0;
      for (const n of t.notes) { lo = Math.min(lo, n[1]); hi = Math.max(hi, n[1]); }
      out.tracks.push({ name: t.name, instrument: t.instrument, notes: t.notes.length, range: t.notes.length ? Notation.midiToName(lo) + '-' + Notation.midiToName(hi) : '-' });
    }
    return out;
  };

  /**
   * bar-length checker for a single sequential voice (ignores '@' jumps, chords advance by their duration).
   * returns array of beat-lengths per '|'-separated bar; use to verify every bar sums to the time signature.
   */
  Notation.barLengths = function (seq, opts = {}) {
    const bars = seq.replace(/;[^\n]*/g, ' ').split('|');
    let dur = opts.dur || 1;
    const out = [];
    for (const bar of bars) {
      const trimmed = bar.trim();
      if (!trimmed) continue;
      const before = dur;
      const notes = Notation.parse(trimmed + ' ', { dur });
      // recompute cursor length by re-parsing; parse() does not expose dur, so derive from tokens
      let len = 0;
      const re = /\[[^\]]*\](?:\/[\d.]+t?)?~?|\S+/g; let m; let d = before;
      while ((m = re.exec(trimmed.replace(/_/g, '')))) {
        let tok = m[0];
        if (tok.endsWith('~')) tok = tok.slice(0, -1);
        if (/^v[\d.]+$/.test(tok) || tok[0] === '@') continue;
        if (tok[0] === 'L') { d = parseDur(tok.slice(1), d); continue; }
        if (tok[0] === '[') {
          const close = tok.lastIndexOf(']'); const od = tok.slice(close + 1);
          if (od) { d = parseDur(od, d); len += d; }
          else { let mx = 0; for (const p of tok.slice(1, close).trim().split(/\s+/)) { const mm = /(\/[\d.]+t?)$/.exec(p); mx = Math.max(mx, mm ? parseDur(mm[1], d) : d); } len += mx; }
          continue;
        }
        const mm = /^(R|r|[A-Ga-g](?:#{1,2}|b{1,2})?-?\d)(\/[\d.]+t?)?$/.exec(tok);
        if (!mm) continue;
        if (mm[2]) d = parseDur(mm[2], d);
        len += d;
      }
      dur = d;
      out.push(Math.round(len * 1000) / 1000);
      void notes;
    }
    return out;
  };

  AOW.Notation = Notation;
  if (typeof module !== 'undefined' && module.exports) module.exports = Notation;
})(typeof window !== 'undefined' ? window : globalThis);
