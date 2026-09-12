#!/usr/bin/env node
// tools/check.js — load index.html headlessly, run Data.validate() and smoke tests, print problems
// usage: node tools/check.js [--eval "extra js returning string|object"]
const path = require('path');
process.env.NODE_PATH = '/opt/node22/lib/node_modules';
require('module').Module._initPaths();
const { chromium } = require('playwright');

(async () => {
  const args = process.argv.slice(2);
  const i = args.indexOf('--eval');
  const extra = i >= 0 ? args[i + 1] : null;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const res = await page.evaluate(() => {
    const out = { dataErrors: [], counts: {} };
    try { out.dataErrors = AOW.Data.validate(); } catch (e) { out.dataErrors = ['validate threw: ' + e.message]; }
    for (const k of AOW.Data.KINDS) out.counts[k] = AOW.Data.list(k).length;
    return out;
  });
  console.log('content counts:', JSON.stringify(res.counts));
  if (res.dataErrors.length) { console.log('DATA ERRORS (' + res.dataErrors.length + '):'); res.dataErrors.slice(0, 200).forEach(e => console.log('  - ' + e)); }
  if (extra) {
    try { const r = await page.evaluate(extra); console.log('[eval]', typeof r === 'object' ? JSON.stringify(r, null, 1).slice(0, 6000) : r); }
    catch (e) { errors.push('eval: ' + e.message); }
  }
  await page.waitForTimeout(200);
  if (errors.length) { console.log('PAGE ERRORS:'); errors.forEach(e => console.log('  - ' + e)); }
  await browser.close();
  process.exit(res.dataErrors.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
