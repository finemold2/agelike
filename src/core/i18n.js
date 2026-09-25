// src/core/i18n.js — bilingual (ko default / en) string tables
(function (AOW) {
  'use strict';
  const dict = { ko: {}, en: {} };
  const I18n = {
    lang: 'ko',
    add(tables) {
      for (const lang of Object.keys(tables)) {
        if (!dict[lang]) dict[lang] = {};
        Object.assign(dict[lang], tables[lang]);
      }
    },
    has(key) { return key in dict[I18n.lang] || key in dict.en; },
    setLang(lang) {
      if (!dict[lang]) return;
      I18n.lang = lang;
      try { localStorage.setItem('aow.lang', lang); } catch (e) { /* ignore */ }
      if (AOW.Events) AOW.Events.emit('i18n:changed', { lang });
    },
    dict,
  };
  try { const saved = localStorage.getItem('aow.lang'); if (saved && (saved === 'ko' || saved === 'en')) I18n.lang = saved; } catch (e) { /* ignore */ }

  // ------------------------------------------------------------------ Korean particles (josa)
  // I18n.jongseong(word) → final-consonant index of the word's last readable syllable: 0 = none (open syllable),
  //   8 = ㄹ, other > 0 = some batchim, -1 = unknown. Digits and Latin endings are read the Korean way
  //   (1 일, 3 삼, 6 육, 7 칠, 8 팔, 0 영; …l/…m/…n/…ng/…k/…p).
  // I18n.josa(word, '이/가'|'을/를'|'은/는'|'과/와'|'으로/로'|'아/야'|'이나/나'|'이랑/랑') → word + the right particle
  //   (either order of the pair is accepted; '으로/로' takes 로 after ㄹ). I18n.particle(word, pair) → particle only.
  // Templates may write {name:이/가} to get the value followed by the right particle (AOW.t / AOW.L params).
  const DIGIT_JONG = { 0: 21, 1: 8, 2: 0, 3: 16, 4: 0, 5: 0, 6: 1, 7: 8, 8: 8, 9: 0 };
  const WITH_BATCHIM = { '이': 1, '을': 1, '은': 1, '과': 1, '으로': 1, '아': 1, '이나': 1, '이랑': 1, '이여': 1, '이다': 1 };
  I18n.jongseong = function (word) {
    const s = String(word === null || word === undefined ? '' : word);
    for (let i = s.length - 1; i >= 0; i--) {
      const c = s.charCodeAt(i), ch = s[i];
      if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28;
      if (ch >= '0' && ch <= '9') return DIGIT_JONG[ch];
      if (/[a-zA-Z]/.test(ch)) {
        const tail = s.slice(Math.max(0, i - 1), i + 1).toLowerCase();
        if (tail === 'ng') return 21;
        const l = ch.toLowerCase();
        return l === 'l' ? 8 : l === 'm' ? 16 : l === 'n' ? 4 : l === 'k' ? 1 : l === 'p' ? 17 : 0;
      }
      if (c >= 0x3131 && c <= 0x314E) return 1;       // a bare jamo consonant (ㄱ…ㅎ)
      // closing brackets, quotes, punctuation, spaces: look further left
    }
    return -1;
  };
  I18n.particle = function (word, pair) {
    const parts = String(pair || '').split('/');
    if (parts.length !== 2) return '';
    const withB = WITH_BATCHIM[parts[0]] ? parts[0] : parts[1];
    const without = withB === parts[0] ? parts[1] : parts[0];
    const j = I18n.jongseong(word);
    if (j <= 0) return without;
    if (withB === '으로' && j === 8) return without;   // ㄹ-final takes 로 (서울로, 마을로)
    return withB;
  };
  I18n.josa = function (word, pair) {
    const w = String(word === null || word === undefined ? '' : word);
    return w + I18n.particle(w, pair);
  };
  /** replace {key} and {key:이/가} placeholders */
  function fill(s, params) {
    return s.replace(/\{(\w+)(?::([^{}/]+\/[^{}]+))?\}/g, (m, k, pair) => {
      if (params[k] === undefined) return m;
      return pair ? I18n.josa(params[k], pair) : params[k];
    });
  }
  I18n.fill = fill;

  AOW.t = function (key, params) {
    let s = dict[I18n.lang][key];
    if (s === undefined) s = dict.en[key];
    if (s === undefined) s = key;
    if (params) s = fill(s, params);
    return s;
  };
  AOW.L = function (obj, params) {
    if (obj == null) return '';
    if (typeof obj === 'string') return AOW.t(obj, params);
    let s = obj[I18n.lang] || obj.en || obj.ko || '';
    if (params) s = fill(s, params);
    return s;
  };
  AOW.I18n = I18n;
})(window.AOW = window.AOW || {});
