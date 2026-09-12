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

  AOW.t = function (key, params) {
    let s = dict[I18n.lang][key];
    if (s === undefined) s = dict.en[key];
    if (s === undefined) s = key;
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
    return s;
  };
  AOW.L = function (obj, params) {
    if (obj == null) return '';
    if (typeof obj === 'string') return AOW.t(obj, params);
    let s = obj[I18n.lang] || obj.en || obj.ko || '';
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
    return s;
  };
  AOW.I18n = I18n;
})(window.AOW = window.AOW || {});
