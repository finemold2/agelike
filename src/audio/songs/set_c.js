// src/audio/songs/set_c.js — classical transcriptions, set C (Chopin, Beethoven, Schumann, Liszt)
//
// ─── HOW THIS FILE WAS MADE — PLEASE READ ────────────────────────────────────────────────────
// Network access was blocked while writing this file, so every note here was transcribed from
// memory of the scores rather than from an edition or a MIDI render.  That puts a hard ceiling on
// fidelity, so the following rules were applied:
//
//   * MELODY lines follow the printed melody as far as it could be recalled with confidence.
//   * ACCOMPANIMENT reproduces the original texture (repeated eighth-note chords, triplet
//     arpeggios, bass–chord–chord patterns, octave bass) and the original harmonic progression.
//     Exact inner-voice spacing of the urtext is a REALISATION, not a note-for-note copy.
//   * Where recall ran out, the transcription STOPS AT A CLEAN PHRASE END instead of inventing
//     material.  Every omitted section is named in the per-song comment below.
//   * Repeats marked "[editorial loop]" are not in the score — they exist only so the track loops
//     at a usable length in game.
//   * Every bar of every track was verified with AOW.Notation.barLengths() to sum to the time
//     signature (anacrusis bars excepted, and marked).
//
// CONFIDENCE SUMMARY — what is actually in each song, and how far to trust it.
// Please spot-check anything below marked ⚠ against a score before shipping it in the game.
//
//   chopin_prelude_e_minor   all 25 bars.  Melody: good.  ⚠ The left-hand chord VOICINGS are a
//                            realisation of the piece's chromatic bass descent, not Chopin's
//                            exact spacing.
//   beethoven_moonlight_1    score bars 1–8 only (arpeggios, octave bass, dotted G# melody).
//                            Bars 9–17 of this track are editorial repeats of that material.
//                            ⚠ NOT TRANSCRIBED: score bars 9–42 (E-major episode, development,
//                            recapitulation) and the 60–69 coda — recall was not good enough.
//   beethoven_fur_elise      score bars 1–20 (the whole A section) with its repeat, then a return
//                            of bars 1–8.  Highest-confidence transcription in this file.
//                            ⚠ NOT TRANSCRIBED: the F-major B episode (bars 23–34) and the
//                            D-minor C episode.
//   schumann_traumerei       opening eight-bar period, stated twice.  ⚠ LOWEST CONFIDENCE HERE —
//                            the rising C–F–A–C–F gesture and the harmony are right, the exact
//                            note values and inner voices are a realisation.
//                            ⚠ NOT TRANSCRIBED: bars 9–24.
//   chopin_nocturne_op9_2    eight-bar theme, stated twice.  ⚠ Melody is a medium-confidence
//                            recollection; the left-hand pattern and harmony are solid.
//                            ⚠ NOT TRANSCRIBED: bars 9–24 (the answering phrase and the written-
//                            out ornamented returns).
//   chopin_raindrop          eight-bar A-section phrase, stated twice.  A♭ pedal, key, tempo and
//                            harmony are solid.  ⚠ Melody is a LOW-confidence recollection.
//                            ⚠ NOT TRANSCRIBED: score bars 9–27, the C#-minor middle section and
//                            the 76–89 return.
//   liszt_consolation_3      bars 1–12 (two-bar accompaniment intro + ten-bar melody), plus an
//                            editorial soft restatement and close.  ⚠ Melody is a medium-
//                            confidence recollection.  ⚠ NOT TRANSCRIBED: everything after b12.
// ─────────────────────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  const N = (typeof AOW !== 'undefined' ? AOW : globalThis.AOW).Notation;

  // ── 1. Chopin — Prelude in E minor, Op. 28 No. 4 ─────────────────────────────────────────────
  // Largo, 4/4, complete 25-bar form.  Melody (held/sighing top voice) over the left hand's
  // pulsing eighth-note chords whose bass creeps down chromatically B–A#–A–G#–G–F#–F–E–D#–D–C–B
  // to the dominant at bar 12, repeats the descent, climbs to the climax at bars 18–20, then the
  // fermata rest (bar 23) and the quiet iv–V–i close.
  // NOTE: the left-hand voicings are a realisation of that descent, not Chopin's exact spacing.
  N.song({ id: 'chopin_prelude_e_minor',
    title: { ko: '전주곡 마단조', en: 'Prelude in E minor, Op. 28 No. 4' },
    composer: { ko: '프레데리크 쇼팽', en: 'Frédéric Chopin' },
    bpm: 60, timeSig: [4, 4], moods: ['tension', 'defeat'],
    tracks: [
      { name: 'melody', instrument: 'piano', gain: 0.95, seq: [
        /* b1  */ "v0.62 B4/1 | B4/1 | B4/1 | C5/4 B4/2. |",
        /* b5  */ "B4/1 | B4/1 | C5/4 A4/2. | B4/2 A4/2 |",
        /* b9  */ "B4/1 | C5/4 B4/4 A4/4 G4/4 | G4/2 E4/2 | F#4/1 |",
        /* b13 */ "v0.6 B4/1 | B4/1 | B4/1 | C5/4 B4/2. |",
        /* b17 */ "v0.68 B4/2 C5/4 D5/4 | v0.74 E5/2 F#5/4 G5/4 | v0.85 A5/2 G5/4 F#5/4 | v0.76 E5/2 D5/4 C5/4 |",
        /* b21 */ "v0.66 B4/2 A4/4 G4/4 | v0.56 F#4/2 B4/2 | R/1 | v0.48 C5/2 D#5/2 |",
        /* b25 */ "v0.44 [E4 G4 B4]/1 |",
      ] },
      { name: 'accomp', instrument: 'piano', gain: 0.62, seq: [
        /* b1  */ "L/8 v0.4 [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] |",
        /* b2  */ "[A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] |",
        /* b3  */ "[A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] |",
        /* b4  */ "[G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] |",
        /* b5  */ "[G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] |",
        /* b6  */ "[F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] |",
        /* b7  */ "[F3 C4 E4] [F3 C4 E4] [F3 C4 E4] [F3 C4 E4] [F3 C4 E4] [F3 C4 E4] [F3 C4 E4] [F3 C4 E4] |",
        /* b8  */ "[E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] |",
        /* b9  */ "[D#3 A3 C4] [D#3 A3 C4] [D#3 A3 C4] [D#3 A3 C4] [D#3 A3 C4] [D#3 A3 C4] [D#3 A3 C4] [D#3 A3 C4] |",
        /* b10 */ "[D3 A3 C4] [D3 A3 C4] [D3 A3 C4] [D3 A3 C4] [D3 A3 C4] [D3 A3 C4] [D3 A3 C4] [D3 A3 C4] |",
        /* b11 */ "[C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] |",
        /* b12 */ "[B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] |",
        /* b13 */ "v0.38 [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] [B3 E4 G4] |",
        /* b14 */ "[A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] [A#3 E4 G4] |",
        /* b15 */ "[A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] [A3 E4 G4] |",
        /* b16 */ "[G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] [G#3 D4 F4] |",
        /* b17 */ "v0.46 [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] [G3 D4 F4] |",
        /* b18 */ "v0.52 [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] [F#3 C4 E4] |",
        /* b19 */ "v0.6 [G3 D4 F#4] [G3 D4 F#4] [G3 D4 F#4] [G3 D4 F#4] [G3 D4 F#4] [G3 D4 F#4] [G3 D4 F#4] [G3 D4 F#4] |",
        /* b20 */ "v0.54 [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] [E3 B3 D4] |",
        /* b21 */ "v0.46 [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] [C3 G3 B3] |",
        /* b22 */ "v0.4 [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] [B2 D#3 F#3 A3] |",
        /* b23 */ "R/1 |",
        /* b24 */ "v0.42 [A2 C3 E3]/2 [B2 D#3 F#3]/2 |",
        /* b25 */ "v0.38 [E2 B2 E3 G3]/1 |",
      ] },
    ] });

  // ── 2. Beethoven — Sonata quasi una fantasia Op. 27 No. 2 ("Moonlight"), 1st mvt ─────────────
  // Adagio sostenuto, C# minor.  Written here in 4/4 (the score's alla breve at the same speed).
  // Bars 1–4  : the triplet arpeggio figure alone over the octave bass, i – i – (A/B → D/B) – i/V7
  // Bars 5–8  : the same four-bar progression with the dotted G# melody on top
  // Bars 9–12 : bars 5–8 again  [editorial loop]
  // Bars 13–16: bars 1–4 again, thinning out  [editorial loop]
  // Bar 17    : sustained C# minor close  [editorial]
  // OMITTED: bars 9–42 of the score (the E-major episode, the development and the
  // recapitulation) and the 60–69 coda — could not be recalled reliably, so they are not here.
  N.song({ id: 'beethoven_moonlight_1',
    title: { ko: '월광 소나타 1악장', en: 'Moonlight Sonata, 1st movement' },
    composer: { ko: '루트비히 판 베토벤', en: 'Ludwig van Beethoven' },
    bpm: 54, timeSig: [4, 4], moods: ['tension', 'menu', 'peace'],
    tracks: [
      { name: 'triplets', instrument: 'piano', gain: 0.72, seq: [
        /* b1  */ "L/8t v0.4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 |",
        /* b2  */ "G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 |",
        /* b3  */ "A3 C#4 E4 A3 C#4 E4 A3 D4 F#4 A3 D4 F#4 |",
        /* b4  */ "G#3 C#4 E4 G#3 C#4 E4 F#3 B#3 D#4 F#3 B#3 D#4 |",
        /* b5  */ "v0.42 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 |",
        /* b6  */ "G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 |",
        /* b7  */ "A3 C#4 E4 A3 C#4 E4 A3 D4 F#4 A3 D4 F#4 |",
        /* b8  */ "G#3 C#4 E4 G#3 C#4 E4 F#3 B#3 D#4 F#3 B#3 D#4 |",
        /* b9  */ "v0.44 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 |",
        /* b10 */ "G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 |",
        /* b11 */ "A3 C#4 E4 A3 C#4 E4 A3 D4 F#4 A3 D4 F#4 |",
        /* b12 */ "G#3 C#4 E4 G#3 C#4 E4 F#3 B#3 D#4 F#3 B#3 D#4 |",
        /* b13 */ "v0.4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 |",
        /* b14 */ "v0.38 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 |",
        /* b15 */ "v0.36 A3 C#4 E4 A3 C#4 E4 A3 D4 F#4 A3 D4 F#4 |",
        /* b16 */ "v0.35 G#3 C#4 E4 G#3 C#4 E4 F#3 B#3 D#4 F#3 B#3 D#4 |",
        /* b17 */ "v0.35 [C#4 E4 G#4]/1 |",
      ] },
      { name: 'melody', instrument: 'piano', gain: 0.95, seq: [
        /* b1  */ "R/1 | R/1 | R/1 | R/1 |",
        /* b5  */ "v0.68 G#4/4. G#4/8 G#4/2 | G#4/4. G#4/8 G#4/2 | A4/4. A4/8 A4/2 | G#4/4. G#4/8 G#4/2 |",
        /* b9  */ "v0.7 G#4/4. G#4/8 G#4/2 | G#4/4. G#4/8 G#4/2 | A4/4. A4/8 A4/2 | v0.6 G#4/4. G#4/8 G#4/2 |",
        /* b13 */ "R/1 | R/1 | R/1 | R/1 |",
        /* b17 */ "R/1 |",
      ] },
      { name: 'bass', instrument: 'piano', gain: 0.8, seq: [
        /* b1  */ "v0.5 [C#2 C#3]/1 | [C#2 C#3]/1 | [B1 B2]/1 | [C#2 C#3]/2 [B#1 B#2]/2 |",
        /* b5  */ "v0.52 [C#2 C#3]/1 | [C#2 C#3]/1 | [B1 B2]/1 | [C#2 C#3]/2 [B#1 B#2]/2 |",
        /* b9  */ "v0.52 [C#2 C#3]/1 | [C#2 C#3]/1 | [B1 B2]/1 | [C#2 C#3]/2 [B#1 B#2]/2 |",
        /* b13 */ "v0.46 [C#2 C#3]/1 | [C#2 C#3]/1 | [B1 B2]/1 | [C#2 C#3]/2 [B#1 B#2]/2 |",
        /* b17 */ "v0.42 [C#2 C#3]/1 |",
      ] },
      { name: 'pad', instrument: 'strings', gain: 0.22, seq: [
        /* b1  */ "v0.35 C#3/1 | C#3/1 | B2/1 | C#3/2 B#2/2 |",
        /* b5  */ "C#3/1 | C#3/1 | B2/1 | C#3/2 B#2/2 |",
        /* b9  */ "C#3/1 | C#3/1 | B2/1 | C#3/2 B#2/2 |",
        /* b13 */ "C#3/1 | C#3/1 | B2/1 | C#3/2 B#2/2 |",
        /* b17 */ "C#3/1 |",
      ] },
    ] });

  // ── 3. Beethoven — Bagatelle in A minor WoO 59, "Für Elise" ───────────────────────────────────
  // Poco moto, 3/8 (one bar = 1.5 quarter-note beats).  Two-sixteenth anacrusis (E5 D#5).
  // Form here:  A (bars 1–20) ‖ A repeated ‖ return of bars 1–8 and a cadence on A minor.
  // Bar 20 carries the written first-ending shape (A + rest + the E5 D#5 pickup back to bar 1).
  // OMITTED: the F-major B episode (bars 23–34) and the D-minor C episode — not recalled
  // reliably enough to transcribe, so the track loops the A section instead of faking them.
  N.song({ id: 'beethoven_fur_elise',
    title: { ko: '엘리제를 위하여', en: 'Für Elise' },
    composer: { ko: '루트비히 판 베토벤', en: 'Ludwig van Beethoven' },
    bpm: 72, timeSig: [3, 8], moods: ['peace'],
    tracks: [
      { name: 'melody', instrument: 'piano', gain: 0.95, seq: [
        /* pickup */ "v0.7 E5/16 D#5/16 |",
        /* b1  */ "E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b2  */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b3  */ "B4/8 R/16 E4/16 G#4/16 B4/16 |",
        /* b4  */ "C5/8 R/16 E4/16 E5/16 D#5/16 |",
        /* b5  */ "E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b6  */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b7  */ "B4/8 R/16 E4/16 C5/16 B4/16 |",
        /* b8  */ "A4/8 R/16 B4/16 C5/16 D5/16 |",
        /* b9  */ "v0.76 E5/8 R/16 G4/16 F5/16 E5/16 |",
        /* b10 */ "D5/8 R/16 F4/16 E5/16 D5/16 |",
        /* b11 */ "C5/8 R/16 E4/16 D5/16 C5/16 |",
        /* b12 */ "v0.7 B4/8 R/16 E4/16 E5/16 D#5/16 |",
        /* b13 */ "E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b14 */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b15 */ "B4/8 R/16 E4/16 G#4/16 B4/16 |",
        /* b16 */ "C5/8 R/16 E4/16 E5/16 D#5/16 |",
        /* b17 */ "E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b18 */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b19 */ "B4/8 R/16 E4/16 C5/16 B4/16 |",
        /* b20 */ "A4/8 R/8 E5/16 D#5/16 |",
        /* repeat b1  */ "v0.62 E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b2  */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b3  */ "B4/8 R/16 E4/16 G#4/16 B4/16 |",
        /* b4  */ "C5/8 R/16 E4/16 E5/16 D#5/16 |",
        /* b5  */ "E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b6  */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b7  */ "B4/8 R/16 E4/16 C5/16 B4/16 |",
        /* b8  */ "A4/8 R/16 B4/16 C5/16 D5/16 |",
        /* b9  */ "v0.72 E5/8 R/16 G4/16 F5/16 E5/16 |",
        /* b10 */ "D5/8 R/16 F4/16 E5/16 D5/16 |",
        /* b11 */ "C5/8 R/16 E4/16 D5/16 C5/16 |",
        /* b12 */ "v0.66 B4/8 R/16 E4/16 E5/16 D#5/16 |",
        /* b13 */ "E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b14 */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b15 */ "B4/8 R/16 E4/16 G#4/16 B4/16 |",
        /* b16 */ "C5/8 R/16 E4/16 E5/16 D#5/16 |",
        /* b17 */ "E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b18 */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b19 */ "B4/8 R/16 E4/16 C5/16 B4/16 |",
        /* b20 */ "A4/8 R/8 E5/16 D#5/16 |",
        /* return b1 */ "v0.58 E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b2  */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b3  */ "B4/8 R/16 E4/16 G#4/16 B4/16 |",
        /* b4  */ "C5/8 R/16 E4/16 E5/16 D#5/16 |",
        /* b5  */ "v0.52 E5/16 D#5/16 E5/16 B4/16 D5/16 C5/16 |",
        /* b6  */ "A4/8 R/16 C4/16 E4/16 A4/16 |",
        /* b7  */ "B4/8 R/16 E4/16 C5/16 B4/16 |",
        /* b8  */ "v0.46 A4/4. |",
      ] },
      { name: 'accomp', instrument: 'piano', gain: 0.75, seq: [
        /* pickup */ "R/8 |",
        /* b1  */ "R/4. |",
        /* b2  */ "v0.45 A2/8 E3/8 A3/8 |",
        /* b3  */ "E2/8 E3/8 G#3/8 |",
        /* b4  */ "A2/8 E3/8 A3/8 |",
        /* b5  */ "R/4. |",
        /* b6  */ "A2/8 E3/8 A3/8 |",
        /* b7  */ "E2/8 E3/8 G#3/8 |",
        /* b8  */ "A2/8 E3/8 A3/8 |",
        /* b9  */ "v0.5 C3/8 E3/8 G3/8 |",
        /* b10 */ "G2/8 B2/8 D3/8 |",
        /* b11 */ "C3/8 E3/8 G3/8 |",
        /* b12 */ "v0.45 E2/8 E3/8 G#3/8 |",
        /* b13 */ "R/4. |",
        /* b14 */ "A2/8 E3/8 A3/8 |",
        /* b15 */ "E2/8 E3/8 G#3/8 |",
        /* b16 */ "A2/8 E3/8 A3/8 |",
        /* b17 */ "R/4. |",
        /* b18 */ "A2/8 E3/8 A3/8 |",
        /* b19 */ "E2/8 E3/8 G#3/8 |",
        /* b20 */ "A2/8 E3/8 A3/8 |",
        /* repeat b1  */ "R/4. |",
        /* b2  */ "v0.42 A2/8 E3/8 A3/8 |",
        /* b3  */ "E2/8 E3/8 G#3/8 |",
        /* b4  */ "A2/8 E3/8 A3/8 |",
        /* b5  */ "R/4. |",
        /* b6  */ "A2/8 E3/8 A3/8 |",
        /* b7  */ "E2/8 E3/8 G#3/8 |",
        /* b8  */ "A2/8 E3/8 A3/8 |",
        /* b9  */ "v0.47 C3/8 E3/8 G3/8 |",
        /* b10 */ "G2/8 B2/8 D3/8 |",
        /* b11 */ "C3/8 E3/8 G3/8 |",
        /* b12 */ "v0.42 E2/8 E3/8 G#3/8 |",
        /* b13 */ "R/4. |",
        /* b14 */ "A2/8 E3/8 A3/8 |",
        /* b15 */ "E2/8 E3/8 G#3/8 |",
        /* b16 */ "A2/8 E3/8 A3/8 |",
        /* b17 */ "R/4. |",
        /* b18 */ "A2/8 E3/8 A3/8 |",
        /* b19 */ "E2/8 E3/8 G#3/8 |",
        /* b20 */ "A2/8 E3/8 A3/8 |",
        /* return b1 */ "R/4. |",
        /* b2  */ "v0.4 A2/8 E3/8 A3/8 |",
        /* b3  */ "E2/8 E3/8 G#3/8 |",
        /* b4  */ "A2/8 E3/8 A3/8 |",
        /* b5  */ "R/4. |",
        /* b6  */ "v0.38 A2/8 E3/8 A3/8 |",
        /* b7  */ "E2/8 E3/8 G#3/8 |",
        /* b8  */ "v0.36 [A2 E3 A3]/4. |",
      ] },
    ] });

  // ── 4. Schumann — Kinderszenen Op. 15 No. 7, "Träumerei" ─────────────────────────────────────
  // F major, 4/4, eighth-note anacrusis, four voices (melody / alto / tenor / bass).
  // Opening eight-bar period only, stated twice.
  // ⚠ LOWEST CONFIDENCE IN THIS FILE.  The rising F-major arpeggio of the opening gesture
  //   (C5 → F5 → A5 → C6 → F6) and the harmonic frame I 5 IV 5 I–V 5 V are recalled with
  //   confidence; the exact note values and the inner-voice writing are a realisation.
  //   Bars 9–24 (the B♭/G-minor continuation and the return) are NOT transcribed.
  N.song({ id: 'schumann_traumerei',
    title: { ko: '트로이메라이 (꿈)', en: 'Träumerei' },
    composer: { ko: '로베르트 슈만', en: 'Robert Schumann' },
    bpm: 60, timeSig: [4, 4], moods: ['peace', 'menu'],
    tracks: [
      { name: 'melody', instrument: 'piano', gain: 0.95, seq: [
        /* pickup */ "v0.6 C5/8 |",
        /* b1 */ "F5/2. A5/8 C6/8 |",
        /* b2 */ "v0.66 F6/2. E6/8 D6/8 |",
        /* b3 */ "v0.62 C6/2. Bb5/8 A5/8 |",
        /* b4 */ "v0.58 G5/2 A5/4. C5/8 |",
        /* b5 */ "v0.62 F5/2. A5/8 C6/8 |",
        /* b6 */ "v0.7 F6/2. E6/8 D6/8 |",
        /* b7 */ "v0.62 C6/2. Bb5/8 A5/8 |",
        /* b8 */ "v0.55 G5/4 F5/2. |",
        /* pickup */ "v0.5 C5/8 |",
        /* b1 */ "F5/2. A5/8 C6/8 |",
        /* b2 */ "v0.56 F6/2. E6/8 D6/8 |",
        /* b3 */ "v0.52 C6/2. Bb5/8 A5/8 |",
        /* b4 */ "v0.48 G5/2 A5/4. C5/8 |",
        /* b5 */ "v0.52 F5/2. A5/8 C6/8 |",
        /* b6 */ "v0.58 F6/2. E6/8 D6/8 |",
        /* b7 */ "v0.5 C6/2. Bb5/8 A5/8 |",
        /* b8 */ "v0.42 G5/4 F5/2. |",
      ] },
      { name: 'alto', instrument: 'piano', gain: 0.6, seq: [
        /* pickup */ "R/8 |",
        /* b1 */ "v0.4 A4/1 | Bb4/1 | A4/2 G4/2 | G4/1 |",
        /* b5 */ "A4/1 | Bb4/1 | A4/2 G4/2 | G4/2 A4/2 |",
        /* pickup */ "R/8 |",
        /* b1 */ "v0.36 A4/1 | Bb4/1 | A4/2 G4/2 | G4/1 |",
        /* b5 */ "A4/1 | Bb4/1 | A4/2 G4/2 | G4/2 A4/2 |",
      ] },
      { name: 'tenor', instrument: 'piano', gain: 0.55, seq: [
        /* pickup */ "R/8 |",
        /* b1 */ "v0.38 C4/1 | D4/1 | C4/2 E4/2 | E4/1 |",
        /* b5 */ "C4/1 | D4/1 | C4/2 E4/2 | E4/2 C4/2 |",
        /* pickup */ "R/8 |",
        /* b1 */ "v0.34 C4/1 | D4/1 | C4/2 E4/2 | E4/1 |",
        /* b5 */ "C4/1 | D4/1 | C4/2 E4/2 | E4/2 C4/2 |",
      ] },
      { name: 'bass', instrument: 'piano', gain: 0.75, seq: [
        /* pickup */ "R/8 |",
        /* b1 */ "v0.45 F2/1 | Bb2/1 | F2/2 C3/2 | C3/1 |",
        /* b5 */ "F2/1 | Bb2/1 | F2/2 C3/2 | C3/2 F2/2 |",
        /* pickup */ "R/8 |",
        /* b1 */ "v0.4 F2/1 | Bb2/1 | F2/2 C3/2 | C3/1 |",
        /* b5 */ "F2/1 | Bb2/1 | F2/2 C3/2 | C3/2 F2/2 |",
      ] },
    ] });

  // ── 5. Chopin — Nocturne in E♭ major, Op. 9 No. 2 ────────────────────────────────────────────
  // Andante, 12/8 (one bar = 6 quarter-note beats = 12 eighths), eighth-note anacrusis.
  // Left hand: the nocturne bass–chord–chord pattern, four groups of three eighths per bar.
  // Eight-bar theme, stated twice (second time softer)  [the restatement is an editorial loop].
  // Harmony: E♭ | B♭7 | E♭ | B♭7 | A♭ | E♭ | B♭7 | E♭.
  // OMITTED: bars 9–24 (the answering phrase and the ornamented returns) are NOT transcribed —
  // the written-out fioritura could not be recalled note for note.
  N.song({ id: 'chopin_nocturne_op9_2',
    title: { ko: '녹턴 내림마장조', en: 'Nocturne in E-flat major, Op. 9 No. 2' },
    composer: { ko: '프레데리크 쇼팽', en: 'Frédéric Chopin' },
    bpm: 66, timeSig: [12, 8], moods: ['peace', 'menu'],
    tracks: [
      { name: 'melody', instrument: 'piano', gain: 0.95, seq: [
        /* pickup */ "v0.68 Bb4/8 |",
        /* b1 */ "G4/2.~ G4/4. Bb4/4. |",
        /* b2 */ "Ab4/4. G4/8 F4/8 G4/8 F4/4. Eb4/4. |",
        /* b3 */ "v0.72 Bb4/2.~ Bb4/4. G4/4. |",
        /* b4 */ "Ab4/4. G4/8 F4/8 G4/8 F4/2. |",
        /* b5 */ "v0.78 Eb5/2. C5/4. Bb4/4. |",
        /* b6 */ "Ab4/4. G4/4. F4/4. Eb4/4. |",
        /* b7 */ "v0.7 Ab4/2. G4/4. F4/4. |",
        /* b8 */ "v0.62 Eb4/1. |",
        /* pickup */ "v0.55 Bb4/8 |",
        /* b1 */ "G4/2.~ G4/4. Bb4/4. |",
        /* b2 */ "Ab4/4. G4/8 F4/8 G4/8 F4/4. Eb4/4. |",
        /* b3 */ "v0.6 Bb4/2.~ Bb4/4. G4/4. |",
        /* b4 */ "Ab4/4. G4/8 F4/8 G4/8 F4/2. |",
        /* b5 */ "v0.66 Eb5/2. C5/4. Bb4/4. |",
        /* b6 */ "Ab4/4. G4/4. F4/4. Eb4/4. |",
        /* b7 */ "v0.58 Ab4/2. G4/4. F4/4. |",
        /* b8 */ "v0.5 Eb4/1. |",
      ] },
      { name: 'accomp', instrument: 'piano', gain: 0.7, seq: [
        /* pickup */ "R/8 |",
        /* b1 */ "v0.42 Eb2/8 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] |",
        /* b2 */ "Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] |",
        /* b3 */ "Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] |",
        /* b4 */ "Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] |",
        /* b5 */ "v0.46 Ab2 [C3 Eb3 Ab3] [C3 Eb3 Ab3] Eb3 [C3 Eb3 Ab3] [C3 Eb3 Ab3] Ab2 [C3 Eb3 Ab3] [C3 Eb3 Ab3] Eb3 [C3 Eb3 Ab3] [C3 Eb3 Ab3] |",
        /* b6 */ "Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] |",
        /* b7 */ "Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] |",
        /* b8 */ "v0.42 Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] |",
        /* pickup */ "R/8 |",
        /* b1 */ "v0.38 Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] |",
        /* b2 */ "Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] |",
        /* b3 */ "Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] |",
        /* b4 */ "Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] |",
        /* b5 */ "v0.4 Ab2 [C3 Eb3 Ab3] [C3 Eb3 Ab3] Eb3 [C3 Eb3 Ab3] [C3 Eb3 Ab3] Ab2 [C3 Eb3 Ab3] [C3 Eb3 Ab3] Eb3 [C3 Eb3 Ab3] [C3 Eb3 Ab3] |",
        /* b6 */ "Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] |",
        /* b7 */ "Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] Bb2 [D3 F3 Ab3] [D3 F3 Ab3] F2 [D3 F3 Ab3] [D3 F3 Ab3] |",
        /* b8 */ "v0.36 Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Eb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] Bb2 [Eb3 G3 Bb3] [Eb3 G3 Bb3] |",
      ] },
    ] });

  // ── 6. Chopin — Prelude in D♭ major, Op. 28 No. 15, "Raindrop" ───────────────────────────────
  // Sostenuto, 4/4.  The A-section texture: an unbroken A♭ eighth-note pedal (the "raindrop") under
  // a quiet D♭-major melody, with the left hand's bass moving underneath.
  // Eight-bar phrase, stated twice (second time softer)  [the restatement is an editorial loop].
  // ⚠ The A♭ pedal, the key, the tempo and the harmonic frame are certain; the MELODY LINE is a
  //   low-confidence recollection — check it against a score before shipping.
  // OMITTED: bars 13–27 of the A section, the whole C#-minor middle section, and the 76–89 return.
  N.song({ id: 'chopin_raindrop',
    title: { ko: '빗방울 전주곡', en: 'Prelude in D-flat major, Op. 28 No. 15 ("Raindrop")' },
    composer: { ko: '프레데리크 쇼팽', en: 'Frédéric Chopin' },
    bpm: 66, timeSig: [4, 4], moods: ['peace', 'tension'],
    tracks: [
      { name: 'melody', instrument: 'piano', gain: 0.95, seq: [
        /* b1 */ "v0.6 F4/4. F4/8 F4/4 Gb4/4 |",
        /* b2 */ "F4/2 Eb4/4 Db4/4 |",
        /* b3 */ "v0.64 Eb4/4. F4/8 Gb4/4 F4/4 |",
        /* b4 */ "Eb4/2 Db4/2 |",
        /* b5 */ "v0.7 Ab4/4. Ab4/8 Bb4/4 Ab4/4 |",
        /* b6 */ "Gb4/2 F4/2 |",
        /* b7 */ "v0.64 Eb4/4. F4/8 Gb4/4 F4/4 |",
        /* b8 */ "v0.56 Db4/1 |",
        /* b9  */ "v0.5 F4/4. F4/8 F4/4 Gb4/4 |",
        /* b10 */ "F4/2 Eb4/4 Db4/4 |",
        /* b11 */ "v0.54 Eb4/4. F4/8 Gb4/4 F4/4 |",
        /* b12 */ "Eb4/2 Db4/2 |",
        /* b13 */ "v0.6 Ab4/4. Ab4/8 Bb4/4 Ab4/4 |",
        /* b14 */ "Gb4/2 F4/2 |",
        /* b15 */ "v0.52 Eb4/4. F4/8 Gb4/4 F4/4 |",
        /* b16 */ "v0.44 Db4/1 |",
      ] },
      { name: 'raindrop', instrument: 'piano', gain: 0.45, seq: [
        /* b1 */ "L/8 v0.35 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b2 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b3 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b4 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b5 */ "v0.38 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b6 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b7 */ "v0.35 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b8 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b9  */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b10 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b11 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b12 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b13 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b14 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b15 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
        /* b16 */ "Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 Ab3 |",
      ] },
      { name: 'bass', instrument: 'piano', gain: 0.75, seq: [
        /* b1 */ "v0.45 [Db2 Db3 F3]/1 |",
        /* b2 */ "[Db2 Db3 F3]/2 [Ab2 C3 Gb3]/2 |",
        /* b3 */ "[Ab2 C3 Gb3]/1 |",
        /* b4 */ "[Db2 Db3 F3]/1 |",
        /* b5 */ "v0.5 [Db2 Db3 F3]/1 |",
        /* b6 */ "[Gb2 Bb2 Db3]/2 [Db2 Ab2 F3]/2 |",
        /* b7 */ "v0.45 [Ab2 C3 Gb3]/1 |",
        /* b8 */ "[Db2 Ab2 Db3 F3]/1 |",
        /* b9  */ "v0.4 [Db2 Db3 F3]/1 |",
        /* b10 */ "[Db2 Db3 F3]/2 [Ab2 C3 Gb3]/2 |",
        /* b11 */ "[Ab2 C3 Gb3]/1 |",
        /* b12 */ "[Db2 Db3 F3]/1 |",
        /* b13 */ "v0.44 [Db2 Db3 F3]/1 |",
        /* b14 */ "[Gb2 Bb2 Db3]/2 [Db2 Ab2 F3]/2 |",
        /* b15 */ "v0.38 [Ab2 C3 Gb3]/1 |",
        /* b16 */ "v0.35 [Db2 Ab2 Db3 F3]/1 |",
      ] },
    ] });

  // ── 7. Liszt — Consolation No. 3 in D♭ major, S. 172 ─────────────────────────────────────────
  // Lento placido, 4/4.  Left hand: the barcarolle-like broken chord in continuous triplet eighths
  // (simplified to a six-note figure twice per bar, as asked).  Bars 1–2 are the accompaniment
  // alone; the melody enters at bar 3.  Bars 13–16 restate bars 9–12 more softly and bar 17 is a
  // sustained D♭ close  [both editorial].
  // ⚠ Key, tempo, texture and the D♭ / G♭ / A♭7 harmonic frame are solid; the MELODY LINE is a
  //   medium-confidence recollection.  The rest of the piece (the modulating middle and the
  //   cadenza-like close) is NOT transcribed.
  N.song({ id: 'liszt_consolation_3',
    title: { ko: '위로 3번', en: 'Consolation No. 3' },
    composer: { ko: '프란츠 리스트', en: 'Franz Liszt' },
    bpm: 60, timeSig: [4, 4], moods: ['peace', 'menu'],
    tracks: [
      { name: 'melody', instrument: 'piano', gain: 0.95, seq: [
        /* b1 */ "R/1 | R/1 |",
        /* b3 */ "v0.62 F4/2 Ab4/4 Gb4/4 |",
        /* b4 */ "F4/2. Eb4/8 F4/8 |",
        /* b5 */ "v0.66 Gb4/2 F4/4 Eb4/4 |",
        /* b6 */ "F4/1 |",
        /* b7 */ "v0.72 Ab4/2 C5/4 Bb4/4 |",
        /* b8 */ "Ab4/2. Gb4/8 F4/8 |",
        /* b9  */ "v0.8 Db5/2 C5/4 Bb4/4 |",
        /* b10 */ "Ab4/2 Gb4/2 |",
        /* b11 */ "v0.68 F4/2 Eb4/4 F4/4 |",
        /* b12 */ "v0.6 Db4/1 |",
        /* b13 */ "v0.56 Db5/2 C5/4 Bb4/4 |",
        /* b14 */ "Ab4/2 Gb4/2 |",
        /* b15 */ "v0.48 F4/2 Eb4/4 F4/4 |",
        /* b16 */ "v0.42 Db4/1 |",
        /* b17 */ "v0.38 [Db4 F4 Ab4]/1 |",
      ] },
      { name: 'accomp', instrument: 'piano', gain: 0.65, seq: [
        /* b1 */ "L/8t v0.38 Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b2 */ "Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b3 */ "v0.4 Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b4 */ "Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b5 */ "Gb2 Bb2 Db3 Gb3 Db3 Bb2 Gb2 Bb2 Db3 Gb3 Db3 Bb2 |",
        /* b6 */ "Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b7 */ "v0.44 Ab2 C3 Eb3 Gb3 Eb3 C3 Ab2 C3 Eb3 Gb3 Eb3 C3 |",
        /* b8 */ "Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b9  */ "v0.48 Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b10 */ "Gb2 Bb2 Db3 Gb3 Db3 Bb2 Gb2 Bb2 Db3 Gb3 Db3 Bb2 |",
        /* b11 */ "Ab2 C3 Eb3 Gb3 Eb3 C3 Ab2 C3 Eb3 Gb3 Eb3 C3 |",
        /* b12 */ "v0.4 Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b13 */ "v0.37 Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b14 */ "Gb2 Bb2 Db3 Gb3 Db3 Bb2 Gb2 Bb2 Db3 Gb3 Db3 Bb2 |",
        /* b15 */ "Ab2 C3 Eb3 Gb3 Eb3 C3 Ab2 C3 Eb3 Gb3 Eb3 C3 |",
        /* b16 */ "v0.35 Db2 Ab2 Db3 F3 Db3 Ab2 Db2 Ab2 Db3 F3 Db3 Ab2 |",
        /* b17 */ "v0.35 [Db2 Ab2 Db3]/1 |",
      ] },
      { name: 'pad', instrument: 'strings', gain: 0.2, seq: [
        /* b1 */ "v0.35 Db3/1 | Db3/1 | Db3/1 | Db3/1 |",
        /* b5 */ "Gb3/1 | Db3/1 | Ab3/1 | Db3/1 |",
        /* b9 */ "Db3/1 | Gb3/1 | Ab3/1 | Db3/1 |",
        /* b13 */ "Db3/1 | Gb3/1 | Ab3/1 | Db3/1 |",
        /* b17 */ "Db3/1 |",
      ] },
    ] });

})();
