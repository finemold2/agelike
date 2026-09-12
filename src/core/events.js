// src/core/events.js — tiny synchronous event bus
(function (AOW) {
  'use strict';
  const listeners = new Map();
  const Events = {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
      return () => Events.off(name, fn);
    },
    once(name, fn) {
      const off = Events.on(name, (p) => { off(); fn(p); });
      return off;
    },
    off(name, fn) {
      const arr = listeners.get(name);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    emit(name, payload) {
      const arr = listeners.get(name);
      if (arr) {
        for (const fn of arr.slice()) {
          try { fn(payload); } catch (e) { console.error('[Events]', name, e); }
        }
      }
      const any = listeners.get('*');
      if (any) for (const fn of any.slice()) { try { fn(name, payload); } catch (e) { console.error(e); } }
    },
    clear() { listeners.clear(); },
  };
  AOW.Events = Events;
})(window.AOW = window.AOW || {});
