#!/usr/bin/env node
// tools/build.js — inline every <script src> and <link rel=stylesheet> of index.html into dist/index.html
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let out = src.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g, (m, href) => {
  const css = fs.readFileSync(path.join(root, href), 'utf8');
  return '<style>\n' + css + '\n</style>';
});
out = out.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/g, (m, href) => {
  const js = fs.readFileSync(path.join(root, href), 'utf8').replace(/<\/script>/gi, '<\\/script>');
  return '<script>\n// ==== ' + href + '\n' + js + '\n</script>';
});
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), out);
const kb = Math.round(Buffer.byteLength(out) / 1024);
console.log('dist/index.html written (' + kb + ' KB)');
