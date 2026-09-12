#!/usr/bin/env node
// tools/shot.js — headless screenshot helper (Playwright + preinstalled Chromium)
// usage: node tools/shot.js <file-or-url> <out.png> [--w 1600] [--h 900] [--eval "js"] [--wait 800] [--clip x,y,w,h] [--scale 1]
// prints console errors from the page. Exit code 1 if page threw an uncaught error.
const path = require('path');
const fs = require('fs');
process.env.NODE_PATH = '/opt/node22/lib/node_modules';
require('module').Module._initPaths();
const { chromium } = require('playwright');

(async () => {
  const args = process.argv.slice(2);
  const target = args[0], out = args[1] || 'shot.png';
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const W = +opt('w', 1600), H = +opt('h', 900), evalJs = opt('eval', null), wait = +opt('wait', 800);
  const clip = opt('clip', null), scale = +opt('scale', 1);
  const url = /^https?:/.test(target) ? target : 'file://' + path.resolve(target);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  let failed = false;
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page ' + m.type() + ']', m.text()); });
  page.on('pageerror', e => { failed = true; console.log('[pageerror]', e.message); });
  await page.goto(url, { waitUntil: 'load' });
  if (evalJs) {
    try { const r = await page.evaluate(evalJs); if (r !== undefined) console.log('[eval]', typeof r === 'object' ? JSON.stringify(r).slice(0, 4000) : r); }
    catch (e) { failed = true; console.log('[eval error]', e.message); }
  }
  await page.waitForTimeout(wait);
  const shotOpts = { path: out };
  if (clip) { const [x, y, w, h] = clip.split(',').map(Number); shotOpts.clip = { x, y, width: w, height: h }; }
  await page.screenshot(shotOpts);
  await browser.close();
  console.log('saved ' + out);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
