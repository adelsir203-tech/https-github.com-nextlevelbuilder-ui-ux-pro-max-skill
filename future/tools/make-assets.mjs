// Renders the four embedded images from 3D models (studio/scene.js) in headless
// Chromium with three.js, on transparent backgrounds, and writes them as WebP.
// Usage: (cd future/tools && npm install) && node future/tools/make-assets.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets');
const THREE = join(HERE, 'node_modules', 'three');
const { chromium } = createRequire(import.meta.url)('playwright');
mkdirSync(OUT, { recursive: true });

const files = {
  '/three.module.js': join(THREE, 'build', 'three.module.js'),
  '/scene.js': join(HERE, 'studio', 'scene.js'),
};
const page = `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/three.module.js","three/addons/":"/addons/"}}</script><script type="module" src="/scene.js"></script>`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tab = await browser.newPage();
tab.on('pageerror', (e) => { throw e; });
await tab.route('http://studio.local/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/') return route.fulfill({ body: page, contentType: 'text/html' });
  const file = path.startsWith('/addons/') ? join(THREE, 'examples', 'jsm', path.slice(8)) : files[path];
  return route.fulfill({ body: readFileSync(file), contentType: 'text/javascript' });
});
await tab.goto('http://studio.local/');
await tab.waitForFunction(() => typeof window.renderAll === 'function');
const out = await tab.evaluate(() => window.renderAll());
for (const [name, b64] of Object.entries(out)) writeFileSync(join(OUT, name), Buffer.from(b64, 'base64'));
await browser.close();
