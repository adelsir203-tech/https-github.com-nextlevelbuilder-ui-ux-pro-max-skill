// Inlines the stylesheet, scripts, font and images into one file: future/index.html.
// Usage: node future/tools/build.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const b64 = (p) => readFileSync(join(ROOT, p)).toString('base64');

const css = read('src/style.css').replace('%FONT%', () => b64('assets/bricolage-grotesque-latin-wght.woff2'));
const js = readdirSync(join(ROOT, 'src/js')).filter((f) => f.endsWith('.js')).sort()
  .map((f) => read(`src/js/${f}`)).join('\n');
const assets = {
  '%SHEET%': 'assets/objects-sheet.webp',
  '%SPIDER%': 'assets/spider.webp',
  '%HEAD%': 'assets/idle-head.webp',
  '%FLY%': 'assets/fly.webp',
};
let script = `(() => {\n'use strict';\n${js}})();\n`;
for (const [key, file] of Object.entries(assets)) script = script.replace(key, () => `data:image/webp;base64,${b64(file)}`);

const html = read('src/index.html')
  .replace('/*STYLE*/', () => css)
  .replace('/*SCRIPT*/', () => script);
writeFileSync(join(ROOT, 'index.html'), html);
