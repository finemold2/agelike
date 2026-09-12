// src/core/data.js — content registry with cross-reference validation
(function (AOW) {
  'use strict';
  const KINDS = ['forms', 'cultures', 'traits', 'buildings', 'improvements', 'abilities', 'statuses', 'units', 'tomes', 'spells',
    'heroSkills', 'heroClasses', 'items', 'wonders', 'names', 'empireSkills', 'rulerTypes', 'terrains', 'features', 'realmTraits', 'transformations'];
  const Data = {};
  for (const k of KINDS) Data[k] = {};

  Data.define = function (kind, obj) {
    if (!Data[kind]) Data[kind] = obj && obj.id ? {} : {};
    if (!obj || !obj.id) throw new Error('Data.define(' + kind + '): object needs an id');
    if (Data[kind][obj.id] && !obj.__override) AOW.warn('Data.define: duplicate id ' + kind + '/' + obj.id + ' (overriding)');
    obj.kind = kind;
    Data[kind][obj.id] = obj;
    return obj;
  };
  Data.defineAll = function (kind, list) { for (const o of list) Data.define(kind, o); };
  Data.list = function (kind) { return Object.values(Data[kind] || {}); };
  Data.has = function (kind, id) { return !!(Data[kind] && Data[kind][id]); };
  Data.get = function (kind, id) {
    const o = Data[kind] && Data[kind][id];
    if (!o) throw new Error('Data.get: missing ' + kind + '/' + id);
    return o;
  };
  Data.find = function (kind, pred) { return Data.list(kind).filter(pred); };
  Data.KINDS = KINDS;

  const LANG_OBJ = o => o && typeof o === 'object' && (o.ko || o.en);

  Data.validate = function () {
    const errors = [];
    const err = (s) => errors.push(s);
    const ref = (kind, id, ctx) => { if (id && !Data.has(kind, id)) err(ctx + ': missing ' + kind + '/' + id); };
    for (const kind of KINDS) {
      for (const o of Data.list(kind)) {
        if (kind !== 'names' && o.name !== undefined && !LANG_OBJ(o.name)) err(kind + '/' + o.id + ': name must be {ko,en}');
      }
    }
    for (const c of Data.list('cultures')) {
      for (const u of c.units || []) ref('units', u, 'cultures/' + c.id + '.units');
      for (const b of c.buildings || []) ref('buildings', b, 'cultures/' + c.id + '.buildings');
    }
    for (const u of Data.list('units')) {
      for (const a of u.abilities || []) ref('abilities', a, 'units/' + u.id + '.abilities');
      for (const a of u.passives || []) ref('abilities', a, 'units/' + u.id + '.passives');
      if (!u.attacks || !u.attacks.length) if (!(u.tags || []).includes('noncombat')) err('units/' + u.id + ': needs at least one attack');
      for (const at of u.attacks || []) for (const e of at.effects || []) ref('statuses', e.status, 'units/' + u.id + '.attacks');
      if (!u.look) err('units/' + u.id + ': missing look');
      if (!(u.tier >= 1 && u.tier <= 5)) err('units/' + u.id + ': bad tier');
    }
    for (const t of Data.list('tomes')) {
      for (const c of t.contents || []) {
        const kindMap = { spell: 'spells', unit: 'units', improvement: 'improvements', skill: 'heroSkills', transformation: 'transformations', empire: 'empireSkills', building: 'buildings' };
        const k = kindMap[c.type];
        if (!k) err('tomes/' + t.id + ': bad content type ' + c.type);
        else ref(k, c.id, 'tomes/' + t.id + '.contents');
      }
    }
    for (const s of Data.list('spells')) {
      if (!s.kind) err('spells/' + s.id + ': missing kind');
      if (!s.cost) err('spells/' + s.id + ': missing cost');
    }
    for (const a of Data.list('abilities')) {
      if (a.effect && a.effect.status) ref('statuses', a.effect.status, 'abilities/' + a.id);
    }
    for (const h of Data.list('heroSkills')) {
      if (h.ability) ref('abilities', h.ability, 'heroSkills/' + h.id);
      for (const p of h.prereq || []) ref('heroSkills', p, 'heroSkills/' + h.id + '.prereq');
    }
    for (const w of Data.list('wonders')) {
      for (const u of (w.guard && w.guard.pool) || []) ref('units', u, 'wonders/' + w.id + '.guard');
    }
    for (const b of Data.list('buildings')) for (const p of b.prereq || []) ref('buildings', p, 'buildings/' + b.id + '.prereq');
    for (const e of Data.list('empireSkills')) for (const p of e.prereq || []) ref('empireSkills', p, 'empireSkills/' + e.id + '.prereq');
    return errors;
  };

  AOW.Data = Data;
})(window.AOW = window.AOW || {});
