#!/usr/bin/env node
// tools/build.js — inline every <script src> and <link rel=stylesheet> of index.html into:
//   dist/index.html     full standalone page (open via file:// or any static host)
//   dist/artifact.html  same content without <!DOCTYPE>/<html>/<head>/<body> wrappers (for claude.ai Artifact publishing)
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

// artifact variant: keep <title>, <style>, body content and scripts; drop document wrappers
let art = out;
const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(art);
const headStyles = [];
art = art.replace(/<head>([\s\S]*?)<\/head>/, (m, head) => {
  const styles = head.match(/<style>[\s\S]*?<\/style>/g) || [];
  headStyles.push(...styles);
  return '';
});
art = art.replace(/<!DOCTYPE[^>]*>/i, '').replace(/<html[^>]*>/i, '').replace(/<\/html>/i, '').replace(/<body[^>]*>/i, '').replace(/<\/body>/i, '');
art = (titleMatch ? '<title>' + titleMatch[1] + '</title>\n' : '') + headStyles.join('\n') + '\n' + art.trim() + '\n';
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), art);

const kb = Math.round(Buffer.byteLength(out) / 1024);
console.log('dist/index.html written (' + kb + ' KB); dist/artifact.html written (' + Math.round(Buffer.byteLength(art) / 1024) + ' KB)');
