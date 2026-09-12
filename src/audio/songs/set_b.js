// src/audio/songs/set_b.js — classical transcriptions (Baroque)
// Notation: see src/audio/notation.js. Every bar ('|') sums to the time signature; verified with Notation.barLengths.
// Contents: Bach Prelude BWV 846 (complete), Pachelbel Canon (lines 1-6), Handel Sarabande HWV 437
// (theme + 2 variations), Bach Jesu BWV 147 (ritornello + chorale). Not included (melodies could not be
// reproduced from memory accurately enough): Air BWV 1068/2, Goldberg Aria BWV 988, Siciliano BWV 1031.
(function () {
  'use strict';
  const N = (typeof AOW !== 'undefined' ? AOW : globalThis.AOW).Notation;

  // ---------------------------------------------------------------------------------------------
  // 1. J. S. Bach — Prelude in C major, BWV 846 (Well-Tempered Clavier I). 35 bars, complete.
  //    Bars 1-32: each half-bar = bass, tenor, then the three upper notes twice (sixteenths);
  //    the bass is held as a half note and the tenor from the 2nd sixteenth to the end of the half-bar.
  //    Bars 33-34: through-composed sixteenths over a C2 pedal; bar 35: final C major chord.
  N.song({
    id: 'bach_prelude_c',
    title: { ko: '평균율 1권 전주곡 C장조', en: 'Prelude in C major, BWV 846' },
    composer: { ko: '요한 제바스티안 바흐', en: 'J. S. Bach' },
    bpm: 66, timeSig: [4, 4], moods: ['peace', 'menu'],
    tracks: [
      { name: 'arpeggio', instrument: 'harp', gain: 0.8, seq: [
        'L/16 v0.6',
        'C4 E4 G4 C5 E5 G4 C5 E5 C4 E4 G4 C5 E5 G4 C5 E5 |',
        'C4 D4 A4 D5 F5 A4 D5 F5 C4 D4 A4 D5 F5 A4 D5 F5 |',
        'B3 D4 G4 D5 F5 G4 D5 F5 B3 D4 G4 D5 F5 G4 D5 F5 |',
        'C4 E4 G4 C5 E5 G4 C5 E5 C4 E4 G4 C5 E5 G4 C5 E5 |',
        'C4 E4 A4 E5 A5 A4 E5 A5 C4 E4 A4 E5 A5 A4 E5 A5 |',
        'C4 D4 F#4 A4 D5 F#4 A4 D5 C4 D4 F#4 A4 D5 F#4 A4 D5 |',
        'B3 D4 G4 D5 G5 G4 D5 G5 B3 D4 G4 D5 G5 G4 D5 G5 |',
        'B3 C4 E4 G4 C5 E4 G4 C5 B3 C4 E4 G4 C5 E4 G4 C5 |',
        'A3 C4 E4 G4 C5 E4 G4 C5 A3 C4 E4 G4 C5 E4 G4 C5 |',
        'D3 A3 D4 F#4 C5 D4 F#4 C5 D3 A3 D4 F#4 C5 D4 F#4 C5 |',
        'G3 B3 D4 G4 B4 D4 G4 B4 G3 B3 D4 G4 B4 D4 G4 B4 |',
        'G3 Bb3 E4 G4 C#5 E4 G4 C#5 G3 Bb3 E4 G4 C#5 E4 G4 C#5 |',
        'F3 A3 D4 A4 D5 D4 A4 D5 F3 A3 D4 A4 D5 D4 A4 D5 |',
        'F3 Ab3 D4 F4 B4 D4 F4 B4 F3 Ab3 D4 F4 B4 D4 F4 B4 |',
        'E3 G3 C4 G4 C5 C4 G4 C5 E3 G3 C4 G4 C5 C4 G4 C5 |',
        'E3 F3 A3 C4 F4 A3 C4 F4 E3 F3 A3 C4 F4 A3 C4 F4 |',
        'D3 F3 A3 C4 F4 A3 C4 F4 D3 F3 A3 C4 F4 A3 C4 F4 |',
        'G2 D3 G3 B3 F4 G3 B3 F4 G2 D3 G3 B3 F4 G3 B3 F4 |',
        'C3 E3 G3 C4 E4 G3 C4 E4 C3 E3 G3 C4 E4 G3 C4 E4 |',
        'C3 G3 Bb3 C4 E4 Bb3 C4 E4 C3 G3 Bb3 C4 E4 Bb3 C4 E4 |',
        'F2 F3 A3 C4 E4 A3 C4 E4 F2 F3 A3 C4 E4 A3 C4 E4 |',
        'F#2 C3 A3 C4 Eb4 A3 C4 Eb4 F#2 C3 A3 C4 Eb4 A3 C4 Eb4 |',
        'Ab2 F3 B3 C4 D4 B3 C4 D4 Ab2 F3 B3 C4 D4 B3 C4 D4 |',
        'G2 F3 G3 B3 D4 G3 B3 D4 G2 F3 G3 B3 D4 G3 B3 D4 |',
        'G2 E3 G3 C4 E4 G3 C4 E4 G2 E3 G3 C4 E4 G3 C4 E4 |',
        'G2 D3 G3 C4 F4 G3 C4 F4 G2 D3 G3 C4 F4 G3 C4 F4 |',
        'G2 D3 G3 B3 F4 G3 B3 F4 G2 D3 G3 B3 F4 G3 B3 F4 |',
        'G2 Eb3 A3 C4 F#4 A3 C4 F#4 G2 Eb3 A3 C4 F#4 A3 C4 F#4 |',
        'G2 E3 G3 C4 G4 G3 C4 G4 G2 E3 G3 C4 G4 G3 C4 G4 |',
        'G2 D3 G3 C4 F4 G3 C4 F4 G2 D3 G3 C4 F4 G3 C4 F4 |',
        'G2 D3 G3 B3 F4 G3 B3 F4 G2 D3 G3 B3 F4 G3 B3 F4 |',
        'C2 C3 G3 Bb3 E4 G3 Bb3 E4 C2 C3 G3 Bb3 E4 G3 Bb3 E4 |',
        'C2 C3 F3 A3 C4 F4 C4 A3 C4 A3 F3 A3 F3 D3 F3 D3 |',
        'C2 B2 G3 B3 D4 F4 D4 B3 D4 B3 G3 B3 D3 F3 E3 D3 |',
        '[C2 C3 E4 G4 C5]/1 |',
      ] },
      { name: 'bass', instrument: 'piano', gain: 0.55, seq: [
        'L/2 v0.5',
        'C4 C4 |',
        'C4 C4 |',
        'B3 B3 |',
        'C4 C4 |',
        'C4 C4 |',
        'C4 C4 |',
        'B3 B3 |',
        'B3 B3 |',
        'A3 A3 |',
        'D3 D3 |',
        'G3 G3 |',
        'G3 G3 |',
        'F3 F3 |',
        'F3 F3 |',
        'E3 E3 |',
        'E3 E3 |',
        'D3 D3 |',
        'G2 G2 |',
        'C3 C3 |',
        'C3 C3 |',
        'F2 F2 |',
        'F#2 F#2 |',
        'Ab2 Ab2 |',
        'G2 G2 |',
        'G2 G2 |',
        'G2 G2 |',
        'G2 G2 |',
        'G2 G2 |',
        'G2 G2 |',
        'G2 G2 |',
        'G2 G2 |',
        'C2 C2 |',
        'C2/1 |',
        'C2/1 |',
        'C2/1 |',
      ] },
      { name: 'tenor', instrument: 'piano', gain: 0.45, seq: [
        'v0.42',
        'R/16 E4/8.~ E4/4 R/16 E4/8.~ E4/4 |',
        'R/16 D4/8.~ D4/4 R/16 D4/8.~ D4/4 |',
        'R/16 D4/8.~ D4/4 R/16 D4/8.~ D4/4 |',
        'R/16 E4/8.~ E4/4 R/16 E4/8.~ E4/4 |',
        'R/16 E4/8.~ E4/4 R/16 E4/8.~ E4/4 |',
        'R/16 D4/8.~ D4/4 R/16 D4/8.~ D4/4 |',
        'R/16 D4/8.~ D4/4 R/16 D4/8.~ D4/4 |',
        'R/16 C4/8.~ C4/4 R/16 C4/8.~ C4/4 |',
        'R/16 C4/8.~ C4/4 R/16 C4/8.~ C4/4 |',
        'R/16 A3/8.~ A3/4 R/16 A3/8.~ A3/4 |',
        'R/16 B3/8.~ B3/4 R/16 B3/8.~ B3/4 |',
        'R/16 Bb3/8.~ Bb3/4 R/16 Bb3/8.~ Bb3/4 |',
        'R/16 A3/8.~ A3/4 R/16 A3/8.~ A3/4 |',
        'R/16 Ab3/8.~ Ab3/4 R/16 Ab3/8.~ Ab3/4 |',
        'R/16 G3/8.~ G3/4 R/16 G3/8.~ G3/4 |',
        'R/16 F3/8.~ F3/4 R/16 F3/8.~ F3/4 |',
        'R/16 F3/8.~ F3/4 R/16 F3/8.~ F3/4 |',
        'R/16 D3/8.~ D3/4 R/16 D3/8.~ D3/4 |',
        'R/16 E3/8.~ E3/4 R/16 E3/8.~ E3/4 |',
        'R/16 G3/8.~ G3/4 R/16 G3/8.~ G3/4 |',
        'R/16 F3/8.~ F3/4 R/16 F3/8.~ F3/4 |',
        'R/16 C3/8.~ C3/4 R/16 C3/8.~ C3/4 |',
        'R/16 F3/8.~ F3/4 R/16 F3/8.~ F3/4 |',
        'R/16 F3/8.~ F3/4 R/16 F3/8.~ F3/4 |',
        'R/16 E3/8.~ E3/4 R/16 E3/8.~ E3/4 |',
        'R/16 D3/8.~ D3/4 R/16 D3/8.~ D3/4 |',
        'R/16 D3/8.~ D3/4 R/16 D3/8.~ D3/4 |',
        'R/16 Eb3/8.~ Eb3/4 R/16 Eb3/8.~ Eb3/4 |',
        'R/16 E3/8.~ E3/4 R/16 E3/8.~ E3/4 |',
        'R/16 D3/8.~ D3/4 R/16 D3/8.~ D3/4 |',
        'R/16 D3/8.~ D3/4 R/16 D3/8.~ D3/4 |',
        'R/16 C3/8.~ C3/4 R/16 C3/8.~ C3/4 |',
        'R/1 |',
        'R/1 |',
        'R/1 |',
      ] },
    ],
  });

  // ---------------------------------------------------------------------------------------------
  // 3. Johann Pachelbel — Canon in D. Ground bass in quarter notes (2-bar cycle, as in the standard
  //    common-time edition; the three violins enter 2 bars apart). Canon lines 1-6 (the half-note and
  //    quarter-note variations) are transcribed; the later eighth/sixteenth-note variations are not,
  //    so after line 6 each voice returns to line 1 (the whole canon sequence is played twice).
  //    The harp is a plain continuo realization (one chord per bass note).
  const CANON = [
    'F#5/2 E5/2 | D5/2 C#5/2 |',
    'B4/2 A4/2 | B4/2 C#5/2 |',
    'D5/4 C#5 B4 A4 | G4 F#4 G4 E4 |',
    'D4 F#4 A4 G4 | F#4 D4 F#4 E4 |',
    'D4 B3 D4 A4 | G4 B4 A4 G4 |',
    'F#4 D4 E4 C#5 | D5 F#5 A5 A4 |',
  ];
  const GROUND = 'D3/4 A2 B2 F#2 | G2 D2 G2 A2 |';
  const CONTINUO = '[D4 F#4 A4]/4 [C#4 E4 A4] [B3 D4 F#4] [A3 C#4 F#4] | [B3 D4 G4] [A3 D4 F#4] [B3 D4 G4] [A3 C#4 E4] |';
  const rep = (s, n) => Array(n).fill(s);
  N.song({
    id: 'pachelbel_canon',
    title: { ko: '파헬벨 카논 D장조', en: 'Canon in D' },
    composer: { ko: '요한 파헬벨', en: 'Johann Pachelbel' },
    bpm: 60, timeSig: [4, 4], moods: ['peace', 'menu', 'victory'],
    tracks: [
      // violin 1: 2 bars rest, lines 1-6 twice, lines 1-2 again (bars 27-30), final chord bar 31
      { name: 'violin1', instrument: 'strings', gain: 0.85, seq: ['v0.7', 'R/1 | R/1 |', ...CANON, ...CANON, CANON[0], CANON[1], 'D5/1 |'] },
      // violin 2: enters 2 bars later
      { name: 'violin2', instrument: 'strings', gain: 0.75, seq: ['v0.6', ...rep('R/1 | R/1 |', 2), ...CANON, ...CANON, CANON[0], 'A4/1 |'] },
      // violin 3: enters 4 bars later
      { name: 'violin3', instrument: 'strings', gain: 0.7, seq: ['v0.55', ...rep('R/1 | R/1 |', 3), ...CANON, ...CANON, 'F#4/1 |'] },
      { name: 'ground', instrument: 'cello', gain: 0.7, seq: ['v0.6', ...rep(GROUND, 15), 'D3/1 |'] },
      { name: 'continuo', instrument: 'harp', gain: 0.5, seq: ['v0.35', ...rep(CONTINUO, 15), '[D3 A3 D4 F#4]/1 |'] },
    ],
  });

  // ---------------------------------------------------------------------------------------------
  // 6. G. F. Handel — Sarabande from Suite in D minor, HWV 437. 3/2 (bar = 6 beats). The 16-bar theme is
  //    built on the Folia progression (Dm A Dm C | F C Dm A || Dm A Dm C | F C Dm-A Dm) with the sarabande
  //    rhythm (half, quarter-quarter, half | dotted whole). CAVEAT: the harmony, bass and rhythm follow the
  //    score; the top voice is a chord-tone reconstruction from memory and may differ from Handel's in places.
  //    The two variations are figurations of the same 16 bars (var. 1: piano broken chords in eighths,
  //    var. 2: full strings with eighth-note bass octaves), in the manner of Handel's own variations.
  //    Each row: [bass, chord (inner voices), top voice bar, motion?]
  const SAR = [
    ['D3', 'D4 F4 A4', 'D5/2 D5/4 D5/4 D5/2', 1], ['A2', 'C#4 E4 A4', 'C#5/1.', 0],
    ['D3', 'D4 F4 A4', 'D5/2 D5/4 E5/4 F5/2', 1], ['C3', 'C4 E4 G4', 'E5/1.', 0],
    ['F3', 'C4 F4 A4', 'F5/2 F5/4 F5/4 F5/2', 1], ['C3', 'C4 E4 G4', 'E5/1.', 0],
    ['D3', 'D4 F4 A4', 'D5/2 F5/4 E5/4 D5/2', 1], ['A2', 'C#4 E4 A4', 'C#5/1.', 0],
    ['D3', 'D4 F4 A4', 'F5/2 F5/4 E5/4 D5/2', 1], ['A2', 'C#4 E4 A4', 'C#5/1.', 0],
    ['D3', 'D4 F4 A4', 'D5/2 D5/4 E5/4 F5/2', 1], ['C3', 'C4 E4 G4', 'E5/1.', 0],
    ['F3', 'C4 F4 A4', 'F5/2 F5/4 F5/4 F5/2', 1], ['C3', 'C4 E4 G4', 'E5/1.', 0],
    ['D3', 'D4 F4 A4', 'D5/2 D5/4 D5/4 C#5/2', 2], ['D3', 'D4 F4 A4', 'D5/1.', 0],
  ];
  const sarMelody = SAR.map(r => r[2] + ' |');
  const sarChords = SAR.map(r => {
    const c = '[' + r[1] + ']';
    if (r[3] === 2) return `${c}/2 ${c}/4 ${c}/4 [C#4 E4 A4]/2 |`;
    return r[3] ? `${c}/2 ${c}/4 ${c}/4 ${c}/2 |` : `${c}/1. |`;
  });
  const sarPad = SAR.map(r => (r[3] === 2 ? `[${r[1]}]/1 [C#4 E4 A4]/2 |` : `[${r[1]}]/1. |`));
  const sarBass = SAR.map(r => (r[3] === 2 ? `${r[0]}/2 ${r[0]}/4 ${r[0]}/4 A2/2 |` : r[3] ? `${r[0]}/2 ${r[0]}/4 ${r[0]}/4 ${r[0]}/2 |` : `${r[0]}/1. |`));
  // variation 1: broken chords in eighths (up and down through the chord, 12 per bar)
  const oct = (p, k) => p.replace(/\d/, d => String(+d + k));
  const sarArp = SAR.map(r => {
    const n = r[1].split(' ');
    const half = [n[0], n[1], n[2], oct(n[0], 1), n[2], n[1]];
    const bar = [...half, ...half];
    if (r[3] === 2) bar.splice(8, 4, 'C#4', 'E4', 'A4', 'E4');
    return bar.join(' ') + ' |';
  });
  // variation 2: bass in eighth-note octaves (pair stays within C2..D3)
  const sarOct = SAR.map(r => {
    const pair = /[3-9]$/.test(r[0]) ? `${r[0]} ${oct(r[0], -1)}` : `${r[0]} ${oct(r[0], 1)}`;
    if (r[3] === 2) return `${pair} ${pair} ${pair} ${pair} A2 A3 A2 A3 |`;
    return `${pair} ${pair} ${pair} ${pair} ${pair} ${pair} |`;
  });
  N.song({
    id: 'handel_sarabande',
    title: { ko: '헨델 사라방드 D단조', en: 'Sarabande (Suite in D minor, HWV 437)' },
    composer: { ko: '게오르크 프리드리히 헨델', en: 'G. F. Handel' },
    bpm: 60, timeSig: [3, 2], moods: ['tension', 'peace'],
    tracks: [
      // theme: strings melody; var 1: melody quieter; var 2: melody in full
      { name: 'melody', instrument: 'strings', gain: 0.9, seq: ['v0.7', ...sarMelody, 'v0.55', ...sarMelody, 'v0.8', ...sarMelody] },
      { name: 'inner', instrument: 'strings', gain: 0.6, seq: ['v0.4', ...sarPad, 'v0.35', ...sarPad, 'v0.5', ...sarPad] },
      { name: 'bass', instrument: 'cello', gain: 0.8, seq: ['v0.6', ...sarBass, 'v0.5', ...sarBass, 'v0.65', ...sarBass] },
      { name: 'piano', instrument: 'piano', gain: 0.7, seq: ['v0.5', ...sarChords, 'L/8 v0.55', ...sarArp, 'v0.6', ...sarOct] },
    ],
  });

  // ---------------------------------------------------------------------------------------------
  // 4. J. S. Bach — Jesu, Joy of Man's Desiring (BWV 147). G major, 3/4, triplet eighths (/8t).
  //    The 4-bar triplet ritornello runs continuously (as in the original). CAVEAT: ritornello bars 1-2 are
  //    exact; bars 3-4 and the two chorale phrases ("Werde munter") are written from memory and may differ
  //    in places; the B section of the chorale is not transcribed. The chorale enters on choir + strings in
  //    the Myra Hess layout: phrase (3 bars), ritornello bar, phrase, ritornello bar ... The bass is a
  //    continuo realization in quarters. Layout: rit | ph1 | ph2 | ph1 | ph2 | rit | ph1 | ph2 | rit | final.
  const RIT = [
    'G4 A4 B4 D5 C5 C5 E5 D5 D5 |',
    'G5 F#5 G5 D5 B4 G4 A4 B4 C5 |',
    'B4 A4 G4 D4 G4 F#4 G4 A4 B4 |',
    'C5 B4 C5 G4 E4 G4 C5 B4 A4 |',
  ];
  const RIT_BASS = ['G3/2. |', 'G3/4 G3 D3 |', 'G3 D3 G3 |', 'C3 E3 D3 |'];
  const RIT_HARP = ['[G3 B3 D4]/2. |', '[G3 B3 D4]/2 [F#3 A3 C4]/4 |', '[G3 B3 D4]/4 [F#3 A3 D4] [G3 B3 D4] |', '[E3 G3 C4]/2 [F#3 A3 D4]/4 |'];
  // chorale phrases (quarter notes; 3 bars each, the last beat of bar 3 is a rest)
  const PH1 = ['[G3 B3 D4 G4]/4 [F#3 A3 D4 A4] [E3 G3 B3 B4] |', '[C4 E4 G4 C5] [B3 D4 G4 D5] [A3 D4 F#4 D5] |', '[C4 E4 G4 E5] [B3 D4 G4 D5] R |'];
  const PH2 = ['[A3 D4 F#4 D5]/4 [A3 C4 F#4 C5] [G3 B3 D4 B4] |', '[F#3 A3 D4 A4] [E3 G3 B3 G4] [D3 F#3 A3 F#4] |', '[G3 B3 D4 G4]/2 R/4 |'];
  const R3 = ['R/2. |', 'R/2. |', 'R/2. |'];
  const R1 = ['R/2. |'];
  const chorale = [...R3, ...R1, ...PH1, ...R1, ...PH2, ...R1, ...PH1, ...R1, ...PH2, ...R1, ...R3, ...R1, ...PH1, ...R1, ...PH2, ...R1, ...R3, ...R1, '[G3 B3 D4 G4]/2. |'];
  N.song({
    id: 'bach_jesu',
    title: { ko: '예수, 인류 소망의 기쁨', en: 'Jesu, Joy of Man\'s Desiring' },
    composer: { ko: '요한 제바스티안 바흐', en: 'J. S. Bach' },
    bpm: 72, timeSig: [3, 4], moods: ['peace', 'victory'],
    tracks: [
      { name: 'ritornello', instrument: 'flute', gain: 0.85, seq: ['L/8t v0.7', ...RIT, 'v0.6', ...RIT, ...RIT, ...RIT, ...RIT, 'v0.72', ...RIT, 'v0.6', ...RIT, ...RIT, 'v0.72', ...RIT, 'G5/2. |'] },
      { name: 'chorale', instrument: 'choir', gain: 0.75, seq: ['v0.6', ...chorale] },
      { name: 'chorale_strings', instrument: 'strings', gain: 0.5, seq: ['v0.4', ...chorale] },
      { name: 'bass', instrument: 'cello', gain: 0.7, seq: ['L/4 v0.55', ...rep(RIT_BASS, 9).flat(), 'G3/2. |'] },
      { name: 'continuo', instrument: 'harp', gain: 0.45, seq: ['v0.35', ...rep(RIT_HARP, 9).flat(), '[G3 B3 D4]/2. |'] },
    ],
  });
})();
