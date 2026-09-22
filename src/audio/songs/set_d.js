// src/audio/songs/set_d.js — orchestral / vocal set: NOT TRANSCRIBED.
//
// Intended contents (requested): Grieg "Morning Mood" (Peer Gynt), Dvorak Largo / "Goin' Home"
// (Symphony No. 9), Massenet "Meditation" (Thais), Schubert "Ave Maria" D. 839, Mozart Piano
// Concerto No. 21 Andante, Brahms "Wiegenlied", Elgar "Nimrod" (Enigma Variations), Faure "Pavane",
// plus the three pieces set_b.js had already deferred: Bach Air on the G String (BWV 1068/2),
// Bach Goldberg Aria (BWV 988) and Bach Siciliano (BWV 1031).
//
// NONE of them are transcribed here, on purpose. This file registers no songs.
//
// Why: this set had to be written from memory (no network, and the repo carries no score sources —
// no .ly, .mid, .musicxml or .abc anywhere). For every piece above I can recall the key, metre,
// tempo, scoring, phrase structure, harmonic plan and melodic contour — but NOT the actual pitch
// sequence with enough certainty to write it down. Each attempt produced several competing
// candidates for the same bar (e.g. Morning Mood bar 2, or whether Schubert's "A-ve" rises a fourth
// or repeats), which is the signature of reconstructing a tune rather than remembering it.
//
// That is a real limit, not caution: melodies that ARE solidly in memory snap into place
// unambiguously and were transcribed without trouble in the other sets (the BWV 846 Prelude, the
// Canon ground and canon lines, the BWV 147 ritornello). The pieces in this set are ones known
// aurally but not at pitch level. Note that set_b.js independently reached the same conclusion
// about the same three Bach pieces ("melodies could not be reproduced from memory accurately
// enough") — retrying them from memory alone reproduced that result rather than overturning it.
//
// Writing them anyway would have meant inventing notes and shipping them under a composer's name,
// which the brief explicitly rules out ("Accuracy over length: never invent notes"). A plausible
// pentatonic tune in E major 6/8 is not Grieg, and would be worse than an empty set: it would be
// wrong in a way nobody could spot from the code.
//
// To unblock: these are all public domain and all available as LilyPond / MIDI sources (Mutopia,
// IMSLP, the Open Goldberg Variations for BWV 988). set_a.js was produced that way — "Generated
// from public-domain LilyPond sources / LilyPond-rendered MIDI". Fetching one source per piece and
// converting to the notation in src/audio/notation.js is a mechanical job and would give accurate
// results for the whole set. Suggested mood tags for when that happens:
//   morning_mood ['peace','menu','victory']   dvorak_largo ['peace','tension','defeat']
//   faure_pavane ['peace','tension']          massenet_meditation ['peace','menu']
//   schubert_ave_maria ['peace','victory']    mozart_k467_andante ['peace','menu']
//   brahms_wiegenlied ['peace']               elgar_nimrod ['victory','tension','peace']
//   bach_air / bach_goldberg_aria / bach_siciliano ['peace','menu']
//
// The file stays a valid no-op so index.html keeps loading and AOW.Songs is unaffected.
(function () {
  'use strict';
  // no songs registered — see header.
})();
