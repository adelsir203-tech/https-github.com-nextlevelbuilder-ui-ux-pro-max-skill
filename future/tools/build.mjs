// Inlines the stylesheet, scripts, fonts and images into one file: future/index.html.
// Usage: node future/tools/build.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const b64 = (p) => readFileSync(join(ROOT, p)).toString('base64');
const webp = (p) => `data:image/webp;base64,${b64(p)}`;
const fill = (text, map) => Object.entries(map).reduce((t, [key, value]) => t.replace(key, () => value()), text);

const css = fill(read('src/style.css'), {
  '%FONT_LATIN%': () => b64('assets/onest-latin.woff2'),
  '%FONT_CYR%': () => b64('assets/onest-cyrillic.woff2'),
  '%FONT_RUB%': () => b64('assets/onest-rub.woff2'),
});
const js = readdirSync(join(ROOT, 'src/js')).filter((f) => f.endsWith('.js')).sort()
  .map((f) => read(`src/js/${f}`)).join('\n');
const script = fill(`(() => {\n'use strict';\n${js}})();\n`, {
  '%SHEET%': () => webp('assets/objects-sheet.webp'),
  '%SPIDER%': () => webp('assets/spider.webp'),
  '%HEAD%': () => webp('assets/idle-head.webp'),
  '%FLY%': () => webp('assets/fly.webp'),
});
const html = fill(read('src/index.html'), {
  '/*STYLE*/': () => css,
  '/*SCRIPT*/': () => script,
  '%SKY_M%': () => webp('assets/sky-morning.webp'),
  '%SKY_N%': () => webp('assets/sky-night.webp'),
  '%FULL_M%': () => webp('assets/full-morning.webp'),
  '%FULL_N%': () => webp('assets/full-night.webp'),
  '%CUT_M%': () => webp('assets/cut-morning.webp'),
  '%CUT_N%': () => webp('assets/cut-night.webp'),
  '%FULL_M_T%': () => webp('assets/full-morning-tall.webp'),
  '%FULL_N_T%': () => webp('assets/full-night-tall.webp'),
  '%CUT_M_T%': () => webp('assets/cut-morning-tall.webp'),
  '%CUT_N_T%': () => webp('assets/cut-night-tall.webp'),
});
writeFileSync(join(ROOT, 'index.html'), html);
