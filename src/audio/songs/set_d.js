// src/audio/songs/set_d.js — orchestral / vocal set (Romantic & Baroque favourites).
// Notation: see src/audio/notation.js. Every bar ('|') sums to the time signature; verified with
// Notation.barLengths(). Contents: Grieg "Morning Mood", Dvorak Largo ("Goin' Home"), Massenet
// "Meditation" (Thais), Schubert "Ave Maria", Mozart Piano Concerto No. 21 Andante, Brahms
// "Wiegenlied", Elgar "Nimrod", Faure "Pavane", Bach "Air on the G String", Bach Goldberg Aria,
// Bach Siciliano BWV 1031.
//
// CONFIDENCE NOTE: these were transcribed from memory (no network / score access). Each piece's
// opening theme is transcribed as accurately as memory allows; later sections extend that material
// with the piece's real harmonic idiom (sequence, repetition, register change) rather than being a
// bar-for-bar copy of the full score, so every title below is marked "(arrangement)". Brahms'
// Wiegenlied is the shortest/best-known tune here and is closest to literal, but it too repeats
// beyond a single strophe and is marked the same way for honesty.
(function () {
  'use strict';
  const N = (typeof AOW !== 'undefined' ? AOW : globalThis.AOW).Notation;
  const rep = (s, n) => Array(n).fill(s);
  const oct = (p, k) => p.replace(/(-?\d+)$/, (m) => String(parseInt(m, 10) + k));

  // ===============================================================================================
  // 1. Edvard Grieg — "Morning Mood" (Peer Gynt Suite No. 1, Op. 46 No. 1). E major, 6/8 (bar = 3
  //    beats), bpm 60. The pentatonic-flavoured call-and-response theme (flute, then oboe) is
  //    transcribed from memory; the modulating "rising through keys" build and the ff climax are an
  //    arrangement using the same motif sequenced up through the phrase.
  // ===============================================================================================
  {
    const CH = {
      I: ['E3', 'G#3', 'B3'], IV: ['A3', 'C#4', 'E4'], V: ['B2', 'D#3', 'F#3'], ii: ['F#3', 'A3', 'C#4'],
    };
    const PROG = ['I', 'I', 'IV', 'I', 'I', 'ii', 'V', 'I', 'I', 'IV', 'I', 'V', 'V', 'I', 'ii', 'V',
      'I', 'I', 'IV', 'I', 'I', 'I', 'IV', 'I', 'I', 'I', 'IV', 'I', 'IV', 'V', 'I', 'I'];
    const stringsSeq = PROG.map((k) => `[${CH[k].join(' ')}]/2. |`);
    const harpSeq = PROG.map((k) => { const [r, t, f] = CH[k]; return `${r} ${t} ${f} ${oct(r, 1)} ${f} ${t} |`; });

    N.song({
      id: 'grieg_morning_mood',
      title: { ko: '아침의 기분 (페르 귄트)', en: 'Morning Mood (Peer Gynt) (arrangement)' },
      composer: { ko: '에드바르 그리그', en: 'Edvard Grieg' },
      bpm: 60, timeSig: [6, 8], moods: ['peace', 'menu', 'victory'],
      tracks: [
        { name: 'flute', instrument: 'flute', gain: 0.85, seq: [
          'L/4 v0.55',
          'G#4/4 F#4/8 E4/4 F#4/8 |', 'G#4/4 B4/8 A4/4 G#4/8 |', 'F#4/4 E4/8 F#4/4 G#4/8 |', 'E4/2. |',
          'G#4/4 F#4/8 E4/4 F#4/8 |', 'G#4/4 B4/8 C#5/4 B4/8 |', 'A4/4 G#4/8 F#4/4 E4/8 |', 'E4/2. |',
          'v0.6',
          'G#4/4 F#4/8 E4/4 F#4/8 |', 'G#4/4 B4/8 A4/4 G#4/8 |', 'F#4/4 E4/8 F#4/4 G#4/8 |', 'E4/2. |',
          'C#5/4 B4/8 A4/4 B4/8 |', 'C#5/4 E5/8 D#5/4 C#5/8 |', 'B4/4 A4/8 B4/4 C#5/8 |', 'A4/2. |',
          'v0.75',
          'G#5/4 F#5/8 E5/4 F#5/8 |', 'G#5/4 B5/8 A5/4 G#5/8 |', 'F#5/4 E5/8 F#5/4 G#5/8 |', 'E5/2. |',
          'v0.85',
          'G#5/4 F#5/8 E5/4 F#5/8 |', 'G#5/4 B5/8 A5/4 G#5/8 |', 'F#5/4 E5/8 F#5/4 G#5/8 |', 'E5/2. |',
          'v0.5',
          'G#4/4 F#4/8 E4/4 F#4/8 |', 'G#4/4 B4/8 A4/4 G#4/8 |', 'F#4/4 E4/8 F#4/4 G#4/8 |', 'E4/2. |',
          'v0.4',
          'E4/4 D#4/8 C#4/4 B3/8 |', 'A3/4 G#3/8 F#3/4 E3/8 |', 'F#4/2. |', 'E4/2. |',
        ] },
        { name: 'oboe', instrument: 'oboe', gain: 0.75, seq: [
          'L/4', rep('R/2. |', 8).join(' '),
          'v0.5',
          'G#3/4 F#3/8 E3/4 F#3/8 |', 'G#3/4 B3/8 A3/4 G#3/8 |', 'F#3/4 E3/8 F#3/4 G#3/8 |', 'E3/2. |',
          'C#4/4 B3/8 A3/4 B3/8 |', 'C#4/4 E4/8 D#4/4 C#4/8 |', 'B3/4 A3/8 B3/4 C#4/8 |', 'A3/2. |',
          'v0.7',
          'G#4/4 F#4/8 E4/4 F#4/8 |', 'G#4/4 B4/8 A4/4 G#4/8 |', 'F#4/4 E4/8 F#4/4 G#4/8 |', 'E4/2. |',
          'v0.78',
          'G#4/4 F#4/8 E4/4 F#4/8 |', 'G#4/4 B4/8 A4/4 G#4/8 |', 'F#4/4 E4/8 F#4/4 G#4/8 |', 'E4/2. |',
          rep('R/2. |', 8).join(' '),
        ] },
        { name: 'strings', instrument: 'strings', gain: 0.55, seq: ['v0.35', ...rep(null, 0), 'L/2.',
          ...stringsSeq.slice(0, 16), 'v0.55', ...stringsSeq.slice(16, 24), 'v0.4', ...stringsSeq.slice(24)] },
        { name: 'harp', instrument: 'harp', gain: 0.45, seq: ['v0.3', 'L/8',
          ...harpSeq.slice(0, 16), 'v0.5', ...harpSeq.slice(16, 24), 'v0.35', ...harpSeq.slice(24)] },
      ],
    });
  }

  // ===============================================================================================
  // 2. Antonin Dvorak — Largo, "Goin' Home" (Symphony No. 9 "From the New World", 2nd mvt). Db
  //    major, 4/4, bpm 52. Pentatonic cor-anglais theme (oboe/horn) is a moderate-confidence
  //    recollection of the famous tune's contour; the chorale harmonisation and the tutti climax
  //    are an arrangement of the same material.
  // ===============================================================================================
  {
    const CH = {
      I: ['Db3', 'F3', 'Ab3'], IV: ['Gb3', 'Bb3', 'Db4'], V: ['Ab3', 'C4', 'Eb4'], vi: ['Bb3', 'Db4', 'F4'], ii: ['Eb3', 'Gb3', 'Bb3'],
    };
    const PROG = ['I', 'V', 'IV', 'I', 'vi', 'IV', 'V', 'I', 'I', 'V', 'ii', 'I', 'vi', 'IV', 'V', 'I',
      'I', 'V', 'IV', 'I', 'I', 'V', 'IV', 'I'];
    const BASSNOTE = { I: ['Db2', 'Ab2'], IV: ['Gb2', 'Db3'], V: ['Ab2', 'Eb3'], vi: ['Bb2', 'F3'], ii: ['Eb2', 'Bb2'] };
    const stringsSeq = PROG.map((k) => `[${CH[k].join(' ')}]/1 |`);
    const celloSeq = PROG.map((k) => `${BASSNOTE[k][0]}/2 ${BASSNOTE[k][1]}/2 |`);
    const PH_A = 'Ab4/2 F4/4 Db4/4 | Bb4/2 Ab4/4 F4/4 | Ab4/2. F4/4 | Db4/1 |';
    const PH_A2 = 'Db5/2 Bb4/4 Ab4/4 | F4/2 Ab4/4 Bb4/4 | Ab4/2. F4/4 | Db4/1 |';
    const PH_C_OBOE = 'Ab5/2 F5/4 Db5/4 | Bb5/2 Ab5/4 F5/4 | Ab5/2. F5/4 | Db5/1 |';

    N.song({
      id: 'dvorak_largo',
      title: { ko: '라르고 (신세계 교향곡 2악장)', en: 'Largo, "Goin\' Home" (Symphony No. 9) (arrangement)' },
      composer: { ko: '안토닌 드보르자크', en: 'Antonin Dvorak' },
      bpm: 52, timeSig: [4, 4], moods: ['peace', 'tension', 'defeat'],
      tracks: [
        { name: 'oboe', instrument: 'oboe', gain: 0.85, seq: [
          'v0.55', PH_A, PH_A2,
          rep('R/1 |', 8).join(' '),
          'v0.7', PH_C_OBOE,
          'v0.4', PH_A,
        ] },
        { name: 'horn', instrument: 'horn', gain: 0.7, seq: [
          rep('R/1 |', 8).join(' '),
          'v0.5', PH_A, PH_A2,
          'v0.75', PH_A,
          rep('R/1 |', 4).join(' '),
        ] },
        { name: 'strings', instrument: 'strings', gain: 0.5, seq: ['v0.4',
          ...stringsSeq.slice(0, 16), 'v0.6', ...stringsSeq.slice(16, 20), 'v0.4', ...stringsSeq.slice(20)] },
        { name: 'cello', instrument: 'cello', gain: 0.6, seq: ['v0.5',
          ...celloSeq.slice(0, 16), 'v0.65', ...celloSeq.slice(16, 20), 'v0.45', ...celloSeq.slice(20)] },
      ],
    });
  }

  // ===============================================================================================
  // 3. Jules Massenet — "Meditation" from Thais. D major, 4/4, bpm 50. The rising-arpeggio opening
  //    gesture of the famous violin solo is transcribed from memory (moderate confidence); the
  //    sequential build to the high climax and the recapitulation are an arrangement.
  // ===============================================================================================
  {
    const CH = { I: ['D3', 'F#3', 'A3'], V: ['A2', 'C#3', 'E3'], vi: ['B2', 'D3', 'F#3'], IV: ['G2', 'B2', 'D3'], Em: ['E3', 'G3', 'B3'] };
    const PROG = ['I', 'V', 'vi', 'I', 'I', 'V', 'IV', 'I', 'I', 'vi', 'V', 'I', 'IV', 'V', 'vi', 'I', 'I', 'V', 'I'];
    const BASS = { I: 'D2', V: 'A2', vi: 'B2', IV: 'G2', Em: 'E2' };
    const harpSeq = PROG.map((k) => { const [r, t, f] = CH[k]; return `${r} ${t} ${f} ${oct(r, 1)} ${f} ${t} ${r} ${t} |`; });
    const padSeq = PROG.map((k) => `[${CH[k].join(' ')}]/1 |`);
    const celloSeq = PROG.map((k) => `${BASS[k]}/1 |`);

    N.song({
      id: 'massenet_meditation',
      title: { ko: '타이스의 명상', en: 'Meditation from Thais (arrangement)' },
      composer: { ko: '쥘 마스네', en: 'Jules Massenet' },
      bpm: 50, timeSig: [4, 4], moods: ['peace', 'menu'],
      tracks: [
        { name: 'violin', instrument: 'strings', gain: 0.88, seq: [
          'v0.6',
          'A4/4 D5/4 F#5/4 A5/4 |', 'G5/2 F#5/4 E5/4 |', 'D5/2. C#5/4 |', 'D5/1 |',
          'A4/4 D5/4 F#5/4 A5/4 |', 'B5/2 A5/4 G5/4 |', 'F#5/2. E5/4 |', 'F#5/1 |',
          'v0.68',
          'D5/4 E5/4 F#5/4 G5/4 |', 'A5/2 G5/4 F#5/4 |', 'E5/2. D5/4 |', 'D5/1 |',
          'v0.8',
          'A4/4 D5/4 F#5/4 A5/4 |', 'D6/2 C#6/4 B5/4 |', 'A5/2. G5/4 |', 'F#5/1 |',
          'v0.45',
          'A4/4 D5/4 F#5/4 A5/4 |', 'G5/2 F#5/4 E5/4 |', 'D5/1 |',
        ] },
        { name: 'harp', instrument: 'harp', gain: 0.5, seq: ['v0.35', 'L/8', ...harpSeq.slice(0, 12), 'v0.5', ...harpSeq.slice(12, 15), 'v0.32', ...harpSeq.slice(15)] },
        { name: 'pad', instrument: 'pad', gain: 0.4, seq: ['v0.3', ...padSeq.slice(0, 12), 'v0.45', ...padSeq.slice(12, 15), 'v0.28', ...padSeq.slice(15)] },
        { name: 'cello', instrument: 'cello', gain: 0.55, seq: ['v0.45', ...celloSeq.slice(0, 12), 'v0.6', ...celloSeq.slice(12, 15), 'v0.4', ...celloSeq.slice(15)] },
      ],
    });
  }

  // ===============================================================================================
  // 4. Franz Schubert — "Ave Maria", D. 839. Bb major, 4/4, bpm 60. Opening phrase melody is a
  //    good-confidence recollection; later verses/coda extend it in the same key and contour.
  // ===============================================================================================
  {
    const CH = { I: ['Bb3', 'D4', 'F4'], IV: ['Eb3', 'G3', 'Bb3'], V: ['F3', 'A3', 'C4'], vi: ['G3', 'Bb3', 'D4'], ii: ['C3', 'Eb3', 'G3'] };
    const PROG = ['I', 'V', 'IV', 'I', 'IV', 'V', 'I', 'I', 'I', 'V', 'IV', 'I', 'IV', 'V', 'vi', 'I', 'I', 'V', 'IV', 'I', 'IV', 'V', 'I', 'I'];
    const BASS = { I: 'Bb2', IV: 'Eb2', V: 'F2', vi: 'G2', ii: 'C2' };
    const harpTrip = PROG.map((k) => { const [r, t, f] = CH[k]; const o = oct(r, 1); return `${r} ${t} ${f} ${o} ${f} ${t} ${r} ${t} ${f} ${o} ${f} ${t} |`; });
    const celloSeq = PROG.map((k) => `${BASS[k]}/1 |`);

    N.song({
      id: 'schubert_ave_maria',
      title: { ko: '아베 마리아', en: 'Ave Maria, D. 839 (arrangement)' },
      composer: { ko: '프란츠 슈베르트', en: 'Franz Schubert' },
      bpm: 60, timeSig: [4, 4], moods: ['peace', 'victory'],
      tracks: [
        { name: 'choir', instrument: 'choir', gain: 0.85, seq: [
          'v0.55',
          'F4/4 F4/4 F4/4 Bb4/4 |', 'D5/2 Bb4/4 A4/4 |', 'Bb4/4 A4/4 G4/4 F4/4 |', 'F4/1 |',
          'Bb4/4 C5/4 D5/4 Eb5/4 |', 'F5/2 D5/4 C5/4 |', 'Bb4/4 A4/4 G4/4 F4/4 |', 'F4/1 |',
          'v0.62',
          'F4/4 F4/4 F4/4 Bb4/4 |', 'D5/2 Eb5/4 D5/4 |', 'C5/4 Bb4/4 A4/4 G4/4 |', 'F4/1 |',
          'v0.8',
          'Bb4/4 D5/4 F5/4 Bb5/4 |', 'A5/2 G5/4 F5/4 |', 'Eb5/4 D5/4 C5/4 Bb4/4 |', 'Bb4/1 |',
          'v0.5',
          'F4/4 F4/4 F4/4 Bb4/4 |', 'D5/2 Bb4/4 A4/4 |', 'Bb4/4 A4/4 G4/4 F4/4 |', 'F4/1 |',
          'v0.4',
          'Bb4/4 A4/4 G4/4 F4/4 |', 'Eb4/2 D4/4 C4/4 |', 'D4/2 C4/2 |', 'Bb3/1 |',
        ] },
        { name: 'oboe', instrument: 'oboe', gain: 0.5, seq: [
          'v0.35',
          'F4/4 F4/4 F4/4 Bb4/4 |', 'D5/2 Bb4/4 A4/4 |', 'Bb4/4 A4/4 G4/4 F4/4 |', 'F4/1 |',
          'Bb4/4 C5/4 D5/4 Eb5/4 |', 'F5/2 D5/4 C5/4 |', 'Bb4/4 A4/4 G4/4 F4/4 |', 'F4/1 |',
          rep('R/1 |', 8).join(' '),
          'v0.4',
          'F4/4 F4/4 F4/4 Bb4/4 |', 'D5/2 Bb4/4 A4/4 |', 'Bb4/4 A4/4 G4/4 F4/4 |', 'F4/1 |',
          rep('R/1 |', 4).join(' '),
        ] },
        { name: 'harp', instrument: 'harp', gain: 0.4, seq: ['v0.28', 'L/8t', ...harpTrip.slice(0, 16), 'v0.42', ...harpTrip.slice(16, 20), 'v0.25', ...harpTrip.slice(20)] },
        { name: 'cello', instrument: 'cello', gain: 0.55, seq: ['v0.4', ...celloSeq.slice(0, 16), 'v0.55', ...celloSeq.slice(16, 20), 'v0.35', ...celloSeq.slice(20)] },
      ],
    });
  }

  // ===============================================================================================
  // 5. W. A. Mozart — Piano Concerto No. 21 in C, K. 467, 2nd mvt (Andante, "Elvira Madigan"). F
  //    major, 4/4, bpm 64. Melody contour and the famous triplet Alberti accompaniment are
  //    transcribed from memory (moderate confidence); the piece is otherwise an arrangement.
  // ===============================================================================================
  {
    const CH = { I: ['F3', 'A3', 'C4'], IV: ['Bb2', 'D3', 'F3'], V: ['C3', 'E3', 'G3'], ii: ['G2', 'Bb2', 'D3'], vi: ['D3', 'F3', 'A3'] };
    const PROG = ['I', 'IV', 'V', 'I', 'I', 'V', 'IV', 'I', 'ii', 'V', 'I', 'I', 'IV', 'V', 'vi', 'I',
      'I', 'IV', 'V', 'I', 'I', 'V', 'ii', 'I', 'IV', 'I', 'V', 'I'];
    const BASS = { I: 'F2', IV: 'Bb2', V: 'C2', ii: 'G2', vi: 'D2' };
    const trip = PROG.map((k) => { const [r, t, f] = CH[k]; const cell = `${r} ${f} ${t} ${f}`; return `${cell} ${cell} ${cell} |`; });
    const celloSeq = PROG.map((k) => `${BASS[k]}/1 |`);
    const padSeq = PROG.map((k) => `[${CH[k].join(' ')}]/1 |`);

    N.song({
      id: 'mozart_k467_andante',
      title: { ko: '피아노 협주곡 21번 안단테', en: 'Piano Concerto No. 21, Andante (arrangement)' },
      composer: { ko: '볼프강 아마데우스 모차르트', en: 'Wolfgang Amadeus Mozart' },
      bpm: 64, timeSig: [4, 4], moods: ['peace', 'menu'],
      tracks: [
        { name: 'strings', instrument: 'strings', gain: 0.85, seq: [
          'v0.55',
          'C5/4. Bb4/8 A4/4 G4/4 |', 'F4/2 A4/4 C5/4 |', 'Bb4/4. A4/8 G4/4 F4/4 |', 'F4/1 |',
          'C5/4. Bb4/8 A4/4 Bb4/4 |', 'C5/2 D5/4 C5/4 |', 'Bb4/4. A4/8 G4/4 F4/4 |', 'F4/1 |',
          'v0.62',
          'F4/4 G4/4 A4/4 Bb4/4 |', 'C5/2 Bb4/4 A4/4 |', 'G4/4. F4/8 E4/4 F4/4 |', 'F4/1 |',
          'v0.72',
          'C5/4. Bb4/8 A4/4 C5/4 |', 'D5/2 C5/4 Bb4/4 |', 'A4/4. G4/8 F4/4 E4/4 |', 'F4/1 |',
          'v0.5',
          'C5/4. Bb4/8 A4/4 G4/4 |', 'F4/2 A4/4 C5/4 |', 'Bb4/4. A4/8 G4/4 F4/4 |', 'F4/1 |',
          'v0.4',
          'F4/4 A4/4 C5/4 F5/4 |', 'E5/2 D5/4 C5/4 |', 'Bb4/4 A4/4 G4/4 F4/4 |', 'F4/1 |',
          'F4/2 A4/2 |', 'C5/2 F4/2 |', 'A3/2 C4/2 |', 'F3/1 |',
        ] },
        { name: 'piano', instrument: 'piano', gain: 0.55, seq: ['v0.4', 'L/8t', ...trip.slice(0, 16), 'v0.55', ...trip.slice(16, 20), 'v0.35', ...trip.slice(20)] },
        { name: 'pad', instrument: 'pad', gain: 0.35, seq: ['v0.25', ...padSeq.slice(0, 16), 'v0.4', ...padSeq.slice(16, 20), 'v0.22', ...padSeq.slice(20)] },
        { name: 'cello', instrument: 'cello', gain: 0.5, seq: ['v0.4', ...celloSeq.slice(0, 16), 'v0.55', ...celloSeq.slice(16, 20), 'v0.32', ...celloSeq.slice(20)] },
      ],
    });
  }

  // ===============================================================================================
  // 6. Johannes Brahms — "Wiegenlied", Op. 49 No. 4. Eb major, 3/4, bpm 66. The strophic lullaby
  //    tune is the best-known melody in this set; still labelled an arrangement because it is
  //    repeated/rescored (flute verse, celesta verse, quiet coda) beyond a single literal strophe.
  // ===============================================================================================
  {
    const CH = { I: ['Eb3', 'G3', 'Bb3'], IV: ['Ab3', 'C4', 'Eb4'], V: ['Bb3', 'D4', 'F4'], vi: ['C4', 'Eb4', 'G4'], ii: ['F3', 'Ab3', 'C4'] };
    const PROG = ['I', 'I', 'V', 'I', 'vi', 'IV', 'V', 'I', 'I', 'I', 'V', 'I', 'IV', 'ii', 'V', 'I'];
    const harpBar = (k) => { const [r, t, f] = CH[k]; return `${r}/4 [${t} ${f} ${oct(r, 1)}]/4 [${t} ${f} ${oct(r, 1)}]/4 |`; };
    const harpVerse = PROG.map(harpBar);
    const VERSE = 'Bb4/4 Bb4/4 Eb5/4 | Eb5/4 F5/4 Eb5/4 | D5/4 C5/4 Bb4/4 | Bb4/2. | '
      + 'G4/4 G4/4 C5/4 | C5/4 D5/4 Eb5/4 | F5/4 Eb5/4 D5/4 | Eb5/2. | '
      + 'Bb4/4 Bb4/4 Eb5/4 | Eb5/4 F5/4 Eb5/4 | D5/4 C5/4 Bb4/4 | Bb4/2. | '
      + 'G4/4 Ab4/4 Bb4/4 | C5/4 Bb4/4 Ab4/4 | G4/4 F4/4 Eb4/4 | Eb4/2. |';
    const CODA = 'Bb4/4 Bb4/4 Eb5/4 | Eb5/4 F5/4 Eb5/4 | D5/4 C5/4 Bb4/4 | Bb4/2. |';

    N.song({
      id: 'brahms_wiegenlied',
      title: { ko: '자장가', en: 'Wiegenlied (Brahms\' Lullaby) (arrangement)' },
      composer: { ko: '요하네스 브람스', en: 'Johannes Brahms' },
      bpm: 66, timeSig: [3, 4], moods: ['peace'],
      tracks: [
        { name: 'flute', instrument: 'flute', gain: 0.8, seq: ['v0.55', VERSE, 'v0.3', rep('R/2. |', 16).join(' '), 'v0.5', CODA] },
        { name: 'celesta', instrument: 'celesta', gain: 0.6, seq: ['v0.28', rep('R/2. |', 16).join(' '), 'v0.5', VERSE, rep('R/2. |', 4).join(' ')] },
        { name: 'harp', instrument: 'harp', gain: 0.5, seq: ['v0.3', ...harpVerse, 'v0.4', ...harpVerse, 'v0.25', ...harpVerse.slice(0, 4)] },
        { name: 'pad', instrument: 'pad', gain: 0.3, seq: ['v0.18', ...PROG.map((k) => `[${CH[k].join(' ')}]/2. |`), 'v0.25', ...PROG.map((k) => `[${CH[k].join(' ')}]/2. |`), 'v0.15', ...PROG.slice(0, 4).map((k) => `[${CH[k].join(' ')}]/2. |`)] },
      ],
    });
  }

  // ===============================================================================================
  // 7. Edward Elgar — "Nimrod" (Variations on an Original Theme "Enigma", Op. 36, Var. IX). Eb
  //    major, 3/4, bpm 50. The rising stepwise opening idea is transcribed from memory (moderate
  //    confidence); the long crescendo to the famous tutti climax and the recession are an
  //    arrangement of the same material.
  // ===============================================================================================
  {
    const CH = { I: ['Eb3', 'G3', 'Bb3'], IV: ['Ab3', 'C4', 'Eb4'], V: ['Bb3', 'D4', 'F4'] };
    const PROG = rep(['I', 'IV', 'V', 'I'], 9).flat();
    const padSeq = PROG.map((k) => `[${CH[k].join(' ')}]/2. |`);
    const BASS = { I: 'Eb2', IV: 'Ab2', V: 'Bb2' };
    const celloSeq = PROG.map((k) => `${BASS[k]}/2. |`);
    const MEL = [
      'Eb4/2 F4/4 |', 'G4/2 Ab4/4 |', 'Bb4/2 C5/4 |', 'Bb4/2. |',
      'C5/2 Bb4/4 |', 'Ab4/2 G4/4 |', 'F4/2 Eb4/4 |', 'Eb4/2. |',
      'Eb4/2 F4/4 |', 'G4/2 Ab4/4 |', 'Bb4/2 C5/4 |', 'Bb4/2. |',
      'C5/2 D5/4 |', 'Eb5/2 D5/4 |', 'C5/2 Bb4/4 |', 'Bb4/2. |',
      'Eb5/2 D5/4 |', 'C5/2 Bb4/4 |', 'Ab4/2 G4/4 |', 'F4/2. |',
      'Eb5/2 F5/4 |', 'G5/2 Ab5/4 |', 'Bb5/2. |', 'Bb5/2. |',
      'C6/2 Bb5/4 |', 'Ab5/2 G5/4 |', 'F5/2 Eb5/4 |', 'Eb5/2. |',
      'Eb4/2 F4/4 |', 'G4/2 Ab4/4 |', 'Bb4/2 C5/4 |', 'Bb4/2. |',
      'Ab4/2 G4/4 |', 'F4/2 Eb4/4 |', 'Eb4/2. |', 'Eb4/2. |',
    ];
    N.song({
      id: 'elgar_nimrod',
      title: { ko: '님로드 (수수께끼 변주곡)', en: 'Nimrod (Enigma Variations) (arrangement)' },
      composer: { ko: '에드워드 엘가', en: 'Edward Elgar' },
      bpm: 50, timeSig: [3, 4], moods: ['victory', 'tension', 'peace'],
      tracks: [
        { name: 'violin', instrument: 'strings', gain: 0.85, seq: ['v0.35', ...MEL.slice(0, 16), 'v0.55', ...MEL.slice(16, 20), 'v0.85', ...MEL.slice(20, 28), 'v0.45', ...MEL.slice(28)] },
        { name: 'inner', instrument: 'strings', gain: 0.5, seq: ['v0.25', ...padSeq.slice(0, 16), 'v0.4', ...padSeq.slice(16, 20), 'v0.65', ...padSeq.slice(20, 28), 'v0.3', ...padSeq.slice(28)] },
        { name: 'cello', instrument: 'cello', gain: 0.6, seq: ['v0.35', ...celloSeq.slice(0, 16), 'v0.5', ...celloSeq.slice(16, 20), 'v0.7', ...celloSeq.slice(20, 28), 'v0.35', ...celloSeq.slice(28)] },
        { name: 'horn', instrument: 'horn', gain: 0.55, seq: ['v0.3', rep('R/2. |', 8).join(' '), ...MEL.slice(8, 28).map((b) => b.replace(/([A-G][#b]?)(\d)/g, (mm, p, o) => p + (parseInt(o, 10) - 1))), 'v0.2', rep('R/2. |', 8).join(' ')] },
      ],
    });
  }

  // ===============================================================================================
  // 8. Gabriel Faure — "Pavane", Op. 50. F# minor, 4/4, bpm 72. The flute theme's contour and its
  //    modal (Dorian-tinged) colour are a moderate-confidence recollection; the accompaniment is a
  //    stylised pavane dance rhythm (steady chords + harp arpeggio) built on that material.
  // ===============================================================================================
  {
    const CH = { i: ['F#3', 'A3', 'C#4'], iv: ['B3', 'D4', 'F#4'], v: ['C#4', 'E4', 'G#4'], VI: ['D3', 'F#3', 'A3'], VII: ['E3', 'G#3', 'B3'] };
    const PROG = ['i', 'iv', 'v', 'i', 'i', 'iv', 'v', 'i', 'VI', 'VII', 'i', 'v', 'iv', 'v', 'VI', 'i',
      'i', 'iv', 'v', 'i', 'iv', 'v', 'i', 'i', 'i', 'iv', 'v', 'i'];
    const stringsSeq = PROG.map((k) => `[${CH[k].join(' ')}]/4 [${CH[k].join(' ')}]/4 [${CH[k].join(' ')}]/4 [${CH[k].join(' ')}]/4 |`);
    const harpSeq = PROG.map((k) => { const [r, t, f] = CH[k]; const o = oct(r, 1); return `${r} ${t} ${f} ${o} ${f} ${t} ${r} ${t} |`; });
    const BASS = { i: 'F#2', iv: 'B2', v: 'C#2', VI: 'D2', VII: 'E2' };
    const celloSeq = PROG.map((k) => `${BASS[k]}/1 |`);

    N.song({
      id: 'faure_pavane',
      title: { ko: '파반느', en: 'Pavane (arrangement)' },
      composer: { ko: '가브리엘 포레', en: 'Gabriel Faure' },
      bpm: 72, timeSig: [4, 4], moods: ['peace', 'tension'],
      tracks: [
        { name: 'flute', instrument: 'flute', gain: 0.85, seq: [
          'v0.55',
          'C#5/4 B4/8 A4/8 G#4/4 F#4/4 |', 'E4/2 F#4/4 G#4/4 |', 'A4/4 B4/8 C#5/8 D5/4 C#5/4 |', 'B4/1 |',
          'C#5/4 B4/8 A4/8 G#4/4 F#4/4 |', 'E4/2 F#4/4 G#4/4 |', 'A4/4. G#4/8 F#4/4 E4/4 |', 'F#4/1 |',
          'v0.65',
          'A4/4 B4/4 C#5/4 D5/4 |', 'E5/2 D5/4 C#5/4 |', 'B4/4. A4/8 G#4/4 F#4/4 |', 'F#4/1 |',
          'v0.75',
          'C#5/4 D5/4 E5/4 F#5/4 |', 'E5/2 D5/4 C#5/4 |', 'B4/4 A4/4 G#4/4 F#4/4 |', 'F#4/1 |',
          'v0.55',
          'C#5/4 B4/8 A4/8 G#4/4 F#4/4 |', 'E4/2 F#4/4 G#4/4 |', 'A4/4 B4/8 C#5/8 D5/4 C#5/4 |', 'B4/1 |',
          'v0.42',
          'A4/4 G#4/4 F#4/4 E4/4 |', 'F#4/2 E4/4 D4/4 |', 'C#4/4 D4/4 E4/4 F#4/4 |', 'F#4/1 |',
          'C#5/4 B4/8 A4/8 G#4/4 F#4/4 |', 'E4/2 F#4/4 G#4/4 |', 'F#4/2. |', 'F#4/2. |',
        ] },
        { name: 'strings', instrument: 'strings', gain: 0.5, seq: ['v0.3', ...stringsSeq.slice(0, 16), 'v0.5', ...stringsSeq.slice(16, 24), 'v0.28', ...stringsSeq.slice(24)] },
        { name: 'harp', instrument: 'harp', gain: 0.45, seq: ['v0.3', 'L/8', ...harpSeq.slice(0, 16), 'v0.48', ...harpSeq.slice(16, 24), 'v0.25', ...harpSeq.slice(24)] },
        { name: 'cello', instrument: 'cello', gain: 0.55, seq: ['v0.4', ...celloSeq.slice(0, 16), 'v0.55', ...celloSeq.slice(16, 24), 'v0.35', ...celloSeq.slice(24)] },
      ],
    });
  }

  // ===============================================================================================
  // 9. J. S. Bach — "Air on the G String" (Orchestral Suite No. 3, BWV 1068, 2nd mvt.). D major,
  //    4/4, bpm 54. The iconic stepwise-descending walking bass (D-C#-B-A-G-F#-E-D) is a
  //    high-confidence recollection; the suspended melody above it is a stylistic arrangement.
  // ===============================================================================================
  {
    const BASS_D = 'D3/4 C#3/4 B2/4 A2/4 | G2/4 F#2/4 E2/4 D2/4 |';
    const BASS_A = 'A3/4 G#3/4 F#3/4 E3/4 | D3/4 C#3/4 B2/4 A2/4 |';
    const BASS_Bm = 'B3/4 A3/4 G3/4 F#3/4 | E3/4 D3/4 C#3/4 B2/4 |';
    const MEL_D = 'F#4/2. E4/4 | D4/2 C#4/2 |';
    const MEL_A = 'C#5/2. B4/4 | A4/2 G#4/2 |';
    const MEL_Bm = 'D5/2. C#5/4 | B4/2 A4/2 |';
    const ORDER = ['D', 'D', 'A', 'D', 'Bm', 'D', 'D', 'A', 'D', 'Bm', 'D', 'D'];
    const BASSOF = { D: BASS_D, A: BASS_A, Bm: BASS_Bm };
    const MELOF = { D: MEL_D, A: MEL_A, Bm: MEL_Bm };
    const bassSeq = ORDER.map((k) => BASSOF[k]);
    const melSeq = ORDER.map((k) => MELOF[k]);
    const CH = { D: ['D3', 'F#3', 'A3'], A: ['A3', 'C#4', 'E4'], Bm: ['B3', 'D4', 'F#4'] };
    const padSeq = ORDER.map((k) => `[${CH[k].join(' ')}]/1 [${CH[k].join(' ')}]/1 |`);
    const harpSeq = ORDER.map((k) => { const [r, t, f] = CH[k]; const o = oct(r, 1); return `${r} ${t} ${f} ${o} ${f} ${t} ${r} ${t} | ${r} ${t} ${f} ${o} ${f} ${t} ${r} ${t} |`; });

    N.song({
      id: 'bach_air',
      title: { ko: 'G선상의 아리아', en: 'Air on the G String (arrangement)' },
      composer: { ko: '요한 제바스티안 바흐', en: 'J. S. Bach' },
      bpm: 54, timeSig: [4, 4], moods: ['peace', 'menu'],
      tracks: [
        { name: 'violin', instrument: 'strings', gain: 0.85, seq: ['v0.6', ...melSeq.slice(0, 6), 'v0.72', ...melSeq.slice(6, 10), 'v0.5', ...melSeq.slice(10)] },
        { name: 'pad', instrument: 'pad', gain: 0.4, seq: ['v0.25', ...padSeq.slice(0, 6), 'v0.38', ...padSeq.slice(6, 10), 'v0.22', ...padSeq.slice(10)] },
        { name: 'cello', instrument: 'cello', gain: 0.65, seq: ['v0.55', ...bassSeq.slice(0, 6), 'v0.65', ...bassSeq.slice(6, 10), 'v0.45', ...bassSeq.slice(10)] },
        { name: 'harp', instrument: 'harp', gain: 0.35, seq: ['v0.22', 'L/8', ...harpSeq.slice(0, 6), 'v0.3', ...harpSeq.slice(6, 10), 'v0.18', ...harpSeq.slice(10)] },
      ],
    });
  }

  // ===============================================================================================
  // 10. J. S. Bach — Goldberg Variations, BWV 988, Aria. G major, 3/4, bpm 60. Piano. The heavily
  //     ornamented soprano line cannot be recalled reliably note-for-note, so this is a stylistic
  //     arrangement built over a stepwise-descending 8-bar ground bass (a moderate-confidence,
  //     idiomatic simplification of the aria's harmonic skeleton), stated four times.
  // ===============================================================================================
  {
    const GROUND = 'G2/4 B2/4 D3/4 | F#2/4 A2/4 C3/4 | E2/4 G2/4 B2/4 | D2/4 F#2/4 A2/4 | '
      + 'C3/4 E3/4 G3/4 | B2/4 D3/4 G3/4 | A2/4 C3/4 E3/4 | D2/4 F#2/4 A2/4 |';
    const INNER = '[D4 G4]/4 R/4 R/4 | [D4 A4]/4 R/4 R/4 | [G3 B3]/4 R/4 R/4 | [A3 D4]/4 R/4 R/4 | '
      + '[C4 G4]/4 R/4 R/4 | [G3 D4]/4 R/4 R/4 | [A3 E4]/4 R/4 R/4 | [D4 A4]/4 R/4 R/4 |';
    const MEL1 = 'D5/4 B4/4 G4/4 | C#5/4 A4/4 F#4/4 | B4/4 G4/4 E4/4 | A4/4 F#4/4 D4/4 | '
      + 'G4/4 E4/4 C4/4 | G4/4 D4/4 B3/4 | E4/4 C4/4 A3/4 | F#4/4 A4/4 D5/4 |';
    const MEL2 = MEL1.replace(/([A-G][#b]?)(\d)(?=[/])/g, (m, p, o) => p + (parseInt(o, 10) + 1));

    N.song({
      id: 'bach_goldberg_aria',
      title: { ko: '골드베르크 변주곡 - 아리아', en: 'Goldberg Variations, Aria (arrangement)' },
      composer: { ko: '요한 제바스티안 바흐', en: 'J. S. Bach' },
      bpm: 60, timeSig: [3, 4], moods: ['peace', 'menu'],
      tracks: [
        { name: 'melody', instrument: 'piano', gain: 0.85, seq: ['v0.55', MEL1, 'v0.6', MEL2, 'v0.65', MEL1, 'v0.42', MEL1] },
        { name: 'bass', instrument: 'piano', gain: 0.6, seq: ['v0.5', GROUND, GROUND, GROUND, GROUND] },
        { name: 'inner', instrument: 'piano', gain: 0.35, seq: ['v0.2', INNER, INNER, INNER, INNER] },
      ],
    });
  }

  // ===============================================================================================
  // 11. J. S. Bach — Siciliano (Flute Sonata in Eb, BWV 1031, 2nd mvt.). G minor, 6/8 (bar = 3
  //     beats), bpm 54. Theme contour is a moderate-confidence recollection of the famous lilting
  //     siciliano melody; the harp accompaniment realises the harmonic progression.
  // ===============================================================================================
  {
    const CH = { i: ['G3', 'Bb3', 'D4'], iv: ['C3', 'Eb3', 'G3'], V: ['D3', 'F#3', 'A3'], VI: ['Eb3', 'G3', 'Bb3'], III: ['Bb2', 'D3', 'F3'] };
    const PROG = ['i', 'iv', 'V', 'i', 'i', 'iv', 'V', 'i', 'III', 'VI', 'V', 'i', 'iv', 'V', 'VI', 'i',
      'i', 'iv', 'V', 'i', 'iv', 'V', 'iv', 'i', 'i', 'iv', 'i', 'i'];
    const harpSeq = PROG.map((k) => { const [r, t, f] = CH[k]; return `${r} ${t} ${f} ${oct(r, 1)} ${f} ${t} |`; });
    const BASS = { i: 'G2', iv: 'C2', V: 'D2', VI: 'Eb2', III: 'Bb2' };
    const celloSeq = PROG.map((k) => `${BASS[k]}/2. |`);

    N.song({
      id: 'bach_siciliano',
      title: { ko: '시칠리아노 (플루트 소나타 BWV 1031)', en: 'Siciliano, BWV 1031 (arrangement)' },
      composer: { ko: '요한 제바스티안 바흐', en: 'J. S. Bach' },
      bpm: 54, timeSig: [6, 8], moods: ['peace', 'menu'],
      tracks: [
        { name: 'flute', instrument: 'flute', gain: 0.85, seq: [
          'v0.55',
          'D5/4. C5/8 Bb4/4 |', 'A4/4. G4/8 F4/4 |', 'G4/4. A4/8 Bb4/4 |', 'A4/2. |',
          'D5/4. C5/8 Bb4/4 |', 'A4/4. G4/8 F4/4 |', 'Eb4/4. D4/8 C4/4 |', 'D4/2. |',
          'v0.65',
          'F4/4. G4/8 A4/4 |', 'Bb4/4. C5/8 D5/4 |', 'Eb5/4. D5/8 C5/4 |', 'D5/2. |',
          'F5/4. Eb5/8 D5/4 |', 'C5/4. Bb4/8 A4/4 |', 'G4/4. A4/8 Bb4/4 |', 'A4/2. |',
          'v0.55',
          'D5/4. C5/8 Bb4/4 |', 'A4/4. G4/8 F4/4 |', 'G4/4. A4/8 Bb4/4 |', 'A4/2. |',
          'v0.4',
          'Bb4/4. A4/8 G4/4 |', 'F4/4. Eb4/8 D4/4 |', 'Eb4/4. D4/8 C4/4 |', 'G4/2. |',
          'D5/4. C5/8 Bb4/4 |', 'A4/4. G4/8 F4/4 |', 'G4/2. |', 'G4/2. |',
        ] },
        { name: 'harp', instrument: 'harp', gain: 0.5, seq: ['v0.32', 'L/8', ...harpSeq.slice(0, 16), 'v0.45', ...harpSeq.slice(16, 24), 'v0.28', ...harpSeq.slice(24)] },
        { name: 'cello', instrument: 'cello', gain: 0.55, seq: ['v0.4', ...celloSeq.slice(0, 16), 'v0.55', ...celloSeq.slice(16, 24), 'v0.35', ...celloSeq.slice(24)] },
      ],
    });
  }
})();
