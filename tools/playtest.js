#!/usr/bin/env node
// tools/playtest.js — headless smoke playtest: start a game, let AI play N turns, report errors & timings
// usage: node tools/playtest.js [--turns 20] [--seed test] [--size medium] [--players 4] [--shot out.png] [--dist]
const path = require('path');
process.env.NODE_PATH = '/opt/node22/lib/node_modules';
require('module').Module._initPaths();
const { chromium } = require('playwright');

(async () => {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const turns = +opt('turns', 20), seed = opt('seed', 'playtest'), size = opt('size', 'medium'), players = +opt('players', 4);
  const shot = opt('shot', null);
  const useDist = args.includes('--dist');
  const file = useDist ? 'dist/index.html' : 'index.html';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', file), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const res = await page.evaluate(async ({ turns, seed, size, players }) => {
    const out = { turnsPlayed: 0, timings: [], errors: [] };
    try {
      const t0 = performance.now();
      const settings = AOW.State.quickSettings({ seed, mapSize: size, playerCount: players });
      AOW.Main.startGame(settings);
      out.createMs = Math.round(performance.now() - t0);
      const g = AOW.game;
      out.map = { W: g.W, H: g.H, provinces: g.provinces.length, cities: g.cities.length, armies: g.armies.length, units: g.units.length, structures: g.structures.length };
      for (let i = 0; i < turns; i++) {
        const t1 = performance.now();
        try { AOW.Turn.endTurn(g); } catch (e) { out.errors.push('turn ' + g.turn + ': ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); break; }
        out.timings.push(Math.round(performance.now() - t1));
        out.turnsPlayed++;
        await new Promise(r => setTimeout(r, 30));
      }
      out.final = AOW.Debug.stats();
      out.notifications = (g.notifications || []).length;
      out.battles = (g.battles || []).length;
      out.log = (g.log || []).slice(-15);
    } catch (e) { out.errors.push('fatal: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); }
    return out;
  }, { turns, seed, size, players });
  console.log(JSON.stringify(res, null, 1).slice(0, 8000));
  if (shot) { await page.waitForTimeout(500); await page.screenshot({ path: shot }); console.log('saved ' + shot); }
  if (errors.length) { console.log('PAGE ERRORS (' + errors.length + '):'); errors.slice(0, 30).forEach(e => console.log('  - ' + e)); }
  await browser.close();
  process.exit(errors.length || (res.errors && res.errors.length) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
