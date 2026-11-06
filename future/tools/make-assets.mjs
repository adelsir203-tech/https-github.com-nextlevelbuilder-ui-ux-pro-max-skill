// Renders the four images the page embeds: the objects sheet, the spider,
// the idle head and the fly. Each is drawn as SVG, rasterised in Chromium
// with a transparent background and encoded to WebP.
// Usage: node future/tools/make-assets.mjs
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(OUT, { recursive: true });

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Objects sheet, logical 960 x 540                                    */
/* ------------------------------------------------------------------ */
function sheetSVG() {
  const R = rng(7);
  const defs = `
  <linearGradient id="graphite" x1="0" x2="1"><stop offset="0" stop-color="#5d6168"/><stop offset=".35" stop-color="#4a4e55"/><stop offset="1" stop-color="#25282d"/></linearGradient>
  <linearGradient id="graphiteTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6c7078"/><stop offset="1" stop-color="#3c4046"/></linearGradient>
  <linearGradient id="opal" x1="0" x2="1"><stop offset="0" stop-color="#ecebe6"/><stop offset=".26" stop-color="#fdfdfb"/><stop offset=".6" stop-color="#ece9e2"/><stop offset="1" stop-color="#c9c5bc"/></linearGradient>
  <linearGradient id="opalTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2dfd8"/></linearGradient>
  <linearGradient id="amber" x1="0" x2="1"><stop offset="0" stop-color="#e8a04a"/><stop offset=".4" stop-color="#d98a2b"/><stop offset="1" stop-color="#9c5a16"/></linearGradient>
  <linearGradient id="bone" x1="0" x2="1"><stop offset="0" stop-color="#ebe5d9"/><stop offset=".3" stop-color="#f3eee5"/><stop offset=".7" stop-color="#ddd5c6"/><stop offset="1" stop-color="#bdb3a2"/></linearGradient>
  <linearGradient id="boneV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5a4f3e" stop-opacity=".12"/></linearGradient>
  <pattern id="perf" width="5.4" height="5.4" patternUnits="userSpaceOnUse"><circle cx="2.7" cy="2.7" r="1.05" fill="#857b6a" fill-opacity=".62"/></pattern>
  <radialGradient id="orange" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#ff9a5a"/><stop offset="1" stop-color="#d9551a"/></radialGradient>
  <radialGradient id="sphere" cx=".5" cy=".5" r=".55" fx=".34" fy=".3"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f4f2ed"/><stop offset=".85" stop-color="#d9d5cc"/><stop offset="1" stop-color="#c3beb4"/></radialGradient>
  <linearGradient id="brass" x1="0" x2="1"><stop offset="0" stop-color="#e7c37a"/><stop offset=".4" stop-color="#c79a4b"/><stop offset="1" stop-color="#7f5d26"/></linearGradient>
  <linearGradient id="cobalt" x1="0" x2="1"><stop offset="0" stop-color="#3355c4"/><stop offset=".22" stop-color="#2b4bb8"/><stop offset=".55" stop-color="#1d3a9e"/><stop offset="1" stop-color="#0f2266"/></linearGradient>
  <linearGradient id="cobaltRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a6bd6"/><stop offset="1" stop-color="#1a2f82"/></linearGradient>
  <radialGradient id="soil" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#4a3627"/><stop offset="1" stop-color="#241911"/></radialGradient>
  <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fae55"/><stop offset="1" stop-color="#3f6a28"/></linearGradient>
  <linearGradient id="sage" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6c7b0"/><stop offset=".5" stop-color="#a1b49b"/><stop offset="1" stop-color="#859880"/></linearGradient>
  <linearGradient id="sageSide" x1="0" x2="1"><stop offset="0" stop-color="#7c8e77"/><stop offset="1" stop-color="#65765f"/></linearGradient>
  <linearGradient id="recess" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5f705a"/><stop offset=".55" stop-color="#7f9279"/><stop offset="1" stop-color="#a9bca3"/></linearGradient>
  <radialGradient id="disc" cx=".5" cy=".5" r=".55" fx=".36" fy=".32"><stop offset="0" stop-color="#5a5f66"/><stop offset="1" stop-color="#2a2d32"/></radialGradient>
  <linearGradient id="glass" x1="0" x2="1"><stop offset="0" stop-color="#e9f3f8" stop-opacity=".55"/><stop offset=".3" stop-color="#ffffff" stop-opacity=".22"/><stop offset=".75" stop-color="#d7e6ee" stop-opacity=".18"/><stop offset="1" stop-color="#a9bfcc" stop-opacity=".5"/></linearGradient>
  <linearGradient id="water" x1="0" x2="1"><stop offset="0" stop-color="#7fb6d8" stop-opacity=".62"/><stop offset=".35" stop-color="#5fa0cc" stop-opacity=".5"/><stop offset="1" stop-color="#2f6f9e" stop-opacity=".68"/></linearGradient>
  <linearGradient id="black" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3c41"/><stop offset=".45" stop-color="#232428"/><stop offset="1" stop-color="#121315"/></linearGradient>
  <linearGradient id="leather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a8754a"/><stop offset="1" stop-color="#6e4526"/></linearGradient>
  <radialGradient id="chalk" cx=".5" cy=".5" r=".62" fx=".36" fy=".28"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f0eee8"/><stop offset="1" stop-color="#c8c4ba"/></radialGradient>
  <radialGradient id="dimple" cx=".5" cy=".5" r=".6" fx=".66" fy=".7"><stop offset="0" stop-color="#fbfaf7"/><stop offset=".7" stop-color="#e2dfd7"/><stop offset="1" stop-color="#c3bfb4"/></radialGradient>`;

  const parts = [];

  // 1. Dusk Lamp, slot centre 80
  {
    const cx = 80;
    parts.push(`<g>
      <path d="M${cx - 56},378 L${cx - 56},388 A56,9 0 0 0 ${cx + 56},388 L${cx + 56},378 Z" fill="url(#graphite)"/>
      <ellipse cx="${cx}" cy="378" rx="56" ry="9" fill="url(#graphiteTop)"/>
      <ellipse cx="${cx - 8}" cy="376.5" rx="34" ry="4" fill="#fff" fill-opacity=".07"/>
      <rect x="${cx - 2.6}" y="176" width="5.2" height="202" fill="url(#graphite)"/>
      <ellipse cx="${cx}" cy="378" rx="7" ry="2.4" fill="#2b2e33"/>
      <path d="M${cx - 7},166 L${cx - 7},180 A7,2.2 0 0 0 ${cx + 7},180 L${cx + 7},166 Z" fill="url(#graphite)"/>
      <path d="M${cx - 33},26 L${cx - 33},170 A33,7 0 0 0 ${cx + 33},170 L${cx + 33},26 Z" fill="url(#opal)"/>
      <ellipse cx="${cx}" cy="26" rx="33" ry="7" fill="url(#opalTop)"/>
      <ellipse cx="${cx}" cy="26" rx="27" ry="4.6" fill="#e6e2da" fill-opacity=".55"/>
      <path d="M${cx - 33},46 A33,7 0 0 0 ${cx + 33},46" fill="none" stroke="url(#amber)" stroke-width="3.6"/>
      <rect x="${cx - 19}" y="34" width="5" height="128" fill="#fff" fill-opacity=".28"/>
    </g>`);
  }

  // 2. Hush Tower, slot centre 240
  {
    const cx = 240;
    const mods = [
      { w: 124, y: 57, h: 109 },
      { w: 130, y: 170, h: 111 },
      { w: 136, y: 285, h: 112 },
    ];
    let g = `<g>`;
    g += `<rect x="${cx - 40}" y="160" width="80" height="14" fill="#a39886"/>`;
    g += `<rect x="${cx - 42}" y="275" width="84" height="14" fill="#a39886"/>`;
    mods.forEach((m, i) => {
      const x = cx - m.w / 2;
      g += `<rect x="${x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="26" fill="url(#bone)"/>`;
      g += `<rect x="${x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="26" fill="url(#boneV)"/>`;
      g += `<rect x="${x + 13}" y="${m.y + (i === 0 ? 26 : 14)}" width="${m.w - 26}" height="${m.h - (i === 0 ? 40 : 28)}" rx="16" fill="url(#perf)"/>`;
      g += `<path d="M${x + 26},${m.y + 1.2} H${x + m.w - 26}" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>`;
    });
    g += `<circle cx="${cx}" cy="70" r="4.6" fill="url(#orange)"/><circle cx="${cx - 1.4}" cy="68.6" r="1.4" fill="#fff" fill-opacity=".55"/>`;
    g += `</g>`;
    parts.push(g);
  }

  // 3. Noon, slot centre 400
  {
    const cx = 400, cy = 208, r = 62;
    parts.push(`<g>
      <path d="M${cx - 2},266 L${cx - 2},386 L${cx + 2},386 L${cx + 2},266 Z" fill="#8e6a2e"/>
      <circle cx="${cx}" cy="387" r="3" fill="#7f5d26"/>
      <path d="M${cx - 20},262 L${cx - 66},394 L${cx - 61.5},395.5 L${cx - 15},263 Z" fill="url(#brass)"/>
      <path d="M${cx + 20},262 L${cx + 66},394 L${cx + 61.5},395.5 L${cx + 15},263 Z" fill="url(#brass)"/>
      <circle cx="${cx - 64}" cy="394.5" r="2.8" fill="#9c7536"/>
      <circle cx="${cx + 64}" cy="394.5" r="2.8" fill="#7f5d26"/>
      <ellipse cx="${cx}" cy="264" rx="23" ry="6" fill="url(#brass)"/>
      <ellipse cx="${cx}" cy="262.6" rx="19" ry="3.6" fill="#e9c98a" fill-opacity=".5"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sphere)"/>
      <ellipse cx="${cx - 22}" cy="${cy - 26}" rx="16" ry="11" fill="#fff" fill-opacity=".55" transform="rotate(-35 ${cx - 22} ${cy - 26})"/>
    </g>`);
  }

  // 4. Stack, slot centre 560
  {
    const pots = [
      { cx: 556, y: 317, h: 80, tw: 130, bw: 108 },
      { cx: 567, y: 251, h: 66, tw: 108, bw: 90 },
      { cx: 550, y: 195, h: 56, tw: 88, bw: 74 },
    ];
    let g = `<g>`;
    pots.forEach((p, i) => {
      const t = p.tw / 2, b = p.bw / 2, ry = t * 0.16;
      g += `<path d="M${p.cx - t},${p.y} L${p.cx - b},${p.y + p.h - ry * 0.7} A${b},${ry * 0.7} 0 0 0 ${p.cx + b},${p.y + p.h - ry * 0.7} L${p.cx + t},${p.y} Z" fill="url(#cobalt)"/>`;
      g += `<path d="M${p.cx - t * 0.62},${p.y + 6} L${p.cx - b * 0.6},${p.y + p.h - 8}" stroke="#fff" stroke-opacity=".2" stroke-width="${f(4 - i * 0.6)}" stroke-linecap="round"/>`;
      g += `<ellipse cx="${p.cx}" cy="${p.y}" rx="${t}" ry="${f(ry)}" fill="url(#cobaltRim)"/>`;
      g += `<ellipse cx="${p.cx}" cy="${p.y + 0.6}" rx="${t - 5}" ry="${f(ry - 2.4)}" fill="url(#soil)"/>`;
    });
    const leaves = [
      [536, 196, -38, 30], [548, 194, -8, 34], [562, 196, 26, 30], [575, 197, 52, 24], [528, 197, -66, 22],
      [590, 252, 40, 18], [548, 252, -50, 16],
    ];
    leaves.forEach(([x, y, a, len]) => {
      const w = len * 0.42;
      g += `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0,0 C${f(-w)},${f(-len * 0.35)} ${f(-w * 0.7)},${f(-len * 0.85)} 0,${-len} C${f(w * 0.7)},${f(-len * 0.85)} ${f(w)},${f(-len * 0.35)} 0,0 Z" fill="url(#leaf)"/><path d="M0,-1 L0,${f(-len * 0.92)}" stroke="#335a1f" stroke-width="1" stroke-opacity=".7"/></g>`;
    });
    g += `</g>`;
    parts.push(g);
  }

  // 5. Slow Clock, slot centre 720
  {
    const x = 652, w = 126, y = 73, h = 324, ccx = 715, ccy = 165;
    const ang = 38 * Math.PI / 180;
    parts.push(`<g>
      <path d="M${x + w - 6},${y + 1} L${x + w + 8},${y + 5} L${x + w + 8},${y + h - 2} L${x + w - 6},${y + h} Z" fill="url(#sageSide)"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="url(#sage)"/>
      <path d="M${x + 7},${y + 0.8} H${x + w - 7}" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>
      <circle cx="${ccx}" cy="${ccy}" r="46" fill="url(#recess)"/>
      <circle cx="${ccx}" cy="${ccy}" r="36" fill="url(#disc)"/>
      <path d="M${ccx},${ccy} L${f(ccx + Math.sin(ang) * 29)},${f(ccy - Math.cos(ang) * 29)}" stroke="#ebe6dc" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="${ccx}" cy="${ccy}" r="3.2" fill="#ebe6dc"/>
    </g>`);
  }

  // 6. Rain Column, slot centre 880
  {
    const cx = 880;
    let g = `<g>`;
    g += `<path d="M${cx - 48},33 L${cx - 48},369 L${cx + 48},369 L${cx + 48},33 Z" fill="url(#glass)"/>`;
    g += `<path d="M${cx - 45},145 L${cx - 45},369 L${cx + 45},369 L${cx + 45},145 Z" fill="url(#water)"/>`;
    g += `<ellipse cx="${cx}" cy="145" rx="45" ry="6" fill="#a9d2ea" fill-opacity=".6"/>`;
    [[-22, 0.9], [4, 1.1], [26, 0.8]].forEach(([dx, s], k) => {
      let yy = 360;
      while (yy > 156) {
        const rr = (0.9 + R() * 1.7) * s;
        const wob = Math.sin(yy * 0.08 + k) * 2.2;
        g += `<circle cx="${f(cx + dx + wob)}" cy="${f(yy)}" r="${f(rr)}" fill="#fff" fill-opacity=".28" stroke="#fff" stroke-opacity=".75" stroke-width=".6"/>`;
        yy -= 7 + R() * 9;
      }
    });
    g += `<rect x="${cx - 46}" y="36" width="3" height="330" fill="#fff" fill-opacity=".72"/>`;
    g += `<rect x="${cx - 31}" y="40" width="7" height="322" fill="#fff" fill-opacity=".34"/>`;
    g += `<rect x="${cx + 33}" y="40" width="2" height="322" fill="#fff" fill-opacity=".4"/>`;
    g += `<rect x="${cx + 45.5}" y="36" width="2.5" height="330" fill="#6f8796" fill-opacity=".55"/>`;
    g += `<path d="M${cx - 56},373 L${cx - 56},389 A56,8 0 0 0 ${cx + 56},389 L${cx + 56},373 Z" fill="url(#graphite)"/>`;
    g += `<ellipse cx="${cx}" cy="373" rx="56" ry="8" fill="url(#graphiteTop)"/>`;
    g += `<ellipse cx="${cx}" cy="371" rx="48" ry="5.5" fill="#33363b"/>`;
    g += `<path d="M${cx - 52},24 L${cx - 52},38 A52,7 0 0 0 ${cx + 52},38 L${cx + 52},24 Z" fill="url(#graphite)"/>`;
    g += `<ellipse cx="${cx}" cy="24" rx="52" ry="7" fill="url(#graphiteTop)"/>`;
    g += `</g>`;
    parts.push(g);
  }

  // 7. Latch, row B slot at x 0, centre 120
  {
    parts.push(`<g>
      <path d="M100,436 C70,430 46,446 50,470 C54,494 80,506 104,500" fill="none" stroke="url(#leather)" stroke-width="11" stroke-linecap="round"/>
      <path d="M99,437.5 C72,432 51,447 54.5,469.5 C58,492 81,503 103,498" fill="none" stroke="#e0b98f" stroke-width="1.1" stroke-dasharray="3 3" stroke-opacity=".7"/>
      <rect x="84" y="422" width="86" height="110" rx="24" fill="url(#black)"/>
      <rect x="86" y="424" width="82" height="106" rx="22" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/>
      <rect x="80" y="430" width="12" height="18" rx="4" fill="#2a2b2f"/>
      <circle cx="127" cy="458" r="11" fill="none" stroke="#3a3c41" stroke-width="2"/>
    </g>`);
  }

  // 8. Pebble, row B slot at x 240, centre 360
  {
    parts.push(`<g>
      <path d="M296,500 C296,462 330,436 368,434 C404,432 426,452 425,482 C424,512 400,532 360,532 C318,532 296,522 296,500 Z" fill="url(#chalk)"/>
      <ellipse cx="352" cy="472" rx="15" ry="10" fill="url(#dimple)"/>
      <path d="M338,468 A15,10 0 0 1 366,467" fill="none" stroke="#b9b4aa" stroke-width="1.4" stroke-opacity=".7"/>
    </g>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="2880" height="1620" viewBox="0 0 960 540"><defs>${defs}</defs>${parts.join('')}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Spider, 560 px, sprite space 1254                                    */
/* ------------------------------------------------------------------ */
const RIGHT_LEGS = [
  [[470, 760], [370, 830], [400, 1160]],
  [[460, 665], [300, 690], [100, 955]],
  [[480, 605], [370, 580], [55, 475]],
  [[490, 560], [360, 420], [410, 52]],
];
const mirror = (p) => [1254 - p[0], p[1]];

function taper(a, b, w0, w1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L;
  return `M${f(a[0] + nx * w0 / 2)},${f(a[1] + ny * w0 / 2)} L${f(b[0] + nx * w1 / 2)},${f(b[1] + ny * w1 / 2)} L${f(b[0] - nx * w1 / 2)},${f(b[1] - ny * w1 / 2)} L${f(a[0] - nx * w0 / 2)},${f(a[1] - ny * w0 / 2)} Z`;
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function legSVG(leg, idx, R) {
  const [hip, knee, foot] = leg;
  const front = idx === 0;
  const wf0 = front ? 46 : 36, wf1 = front ? 38 : 30, wt0 = front ? 36 : 28, wt1 = front ? 15 : 11;
  const C = { dark: '#2b1a10', brown: '#5b3a22', warm: '#7d5433', cream: '#e2cfae', pale: '#f0e4cc' };
  let g = '';
  const band = (a, b, t0, t1, w0, w1, col) => {
    const p0 = lerp2(a, b, t0), p1 = lerp2(a, b, t1);
    g += `<path d="${taper(p0, p1, w0 + (w1 - w0) * t0, w0 + (w1 - w0) * t1)}" fill="${col}"/>`;
  };
  // femur
  band(hip, knee, 0, 1, wf0, wf1, C.dark);
  band(hip, knee, 0.12, 0.22, wf0, wf1, C.cream);
  band(hip, knee, 0.22, 0.86, wf0 * 0.42, wf1 * 0.42, C.brown);
  band(hip, knee, 0.86, 1, wf0, wf1, C.cream);
  // tibia to tarsus
  const seq = [[0, 0.07, C.pale], [0.07, 0.4, C.brown], [0.4, 0.5, C.cream], [0.5, 0.76, C.dark], [0.76, 0.83, C.cream], [0.83, 0.97, C.warm], [0.97, 1, C.dark]];
  seq.forEach(([a, b, c]) => band(knee, foot, a, b, wt0, wt1, c));
  g += `<circle cx="${knee[0]}" cy="${knee[1]}" r="${f(wf1 / 2)}" fill="${C.cream}"/>`;
  g += `<circle cx="${knee[0]}" cy="${knee[1]}" r="${f(wf1 / 2 - 5)}" fill="${C.warm}"/>`;
  // hairs
  const hairs = (a, b, w0, w1, n) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    let d = '';
    let dd = '';
    for (let i = 0; i < n; i++) {
      const t = R();
      const side = R() < 0.5 ? -1 : 1;
      const w = (w0 + (w1 - w0) * t) / 2;
      const off = side * w * (0.55 + R() * 0.45);
      const px = a[0] + dx * t + nx * off, py = a[1] + dy * t + ny * off;
      const len = 7 + R() * 13;
      const ax = ux * 0.75 + nx * side * 0.65, ay = uy * 0.75 + ny * side * 0.65;
      const seg = `M${f(px)},${f(py)} l${f(ax * len)},${f(ay * len)}`;
      if (R() < 0.55) d += seg; else dd += seg;
    }
    g += `<path d="${d}" stroke="#ead9bb" stroke-width="1.7" stroke-opacity=".8" stroke-linecap="round" fill="none"/>`;
    g += `<path d="${dd}" stroke="#2a190f" stroke-width="1.8" stroke-opacity=".8" stroke-linecap="round" fill="none"/>`;
  };
  hairs(hip, knee, wf0, wf1, 70);
  hairs(knee, foot, wt0, wt1, 110);
  // a few long spines
  let s = '';
  for (let i = 0; i < 7; i++) {
    const t = 0.15 + R() * 0.7;
    const p = lerp2(knee, foot, t);
    const dx = foot[0] - knee[0], dy = foot[1] - knee[1], L = Math.hypot(dx, dy);
    const side = i % 2 ? 1 : -1;
    const nx = -dy / L * side, ny = dx / L * side;
    s += `M${f(p[0])},${f(p[1])} l${f((dx / L * 0.6 + nx * 0.8) * 26)},${f((dy / L * 0.6 + ny * 0.8) * 26)}`;
  }
  g += `<path d="${s}" stroke="#1d110a" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  return g;
}

function furEllipse(R, cx, cy, rx, ry, n, cols, len, width, radial = 1) {
  let out = '';
  const paths = cols.map(() => '');
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R());
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    const dir = a + (R() - 0.5) * 0.9;
    const l = len * (0.5 + R() * 0.8) * (radial ? 0.4 + r * 0.6 : 1);
    const k = Math.floor(R() * cols.length);
    paths[k] += `M${f(x)},${f(y)} l${f(Math.cos(dir) * l)},${f(Math.sin(dir) * l)}`;
  }
  cols.forEach((c, k) => { out += `<path d="${paths[k]}" stroke="${c}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`; });
  return out;
}

function spiderSVG() {
  const R = rng(31);
  let legs = '';
  for (let i = 3; i >= 0; i--) {
    legs += legSVG(RIGHT_LEGS[i], i, R);
    legs += legSVG(RIGHT_LEGS[i].map(mirror), i, R);
  }
  const defs = `
    <radialGradient id="abd" cx=".5" cy=".5" r=".55" fx=".4" fy=".38"><stop offset="0" stop-color="#7a5333"/><stop offset=".7" stop-color="#4e321d"/><stop offset="1" stop-color="#2c1b10"/></radialGradient>
    <radialGradient id="abdShade" cx=".5" cy=".5" r=".5" fx=".38" fy=".34"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    <radialGradient id="ceph" cx=".5" cy=".5" r=".55" fx=".42" fy=".36"><stop offset="0" stop-color="#6e4a2d"/><stop offset=".75" stop-color="#3f2716"/><stop offset="1" stop-color="#26170d"/></radialGradient>
    <radialGradient id="eye" cx=".5" cy=".5" r=".5" fx=".36" fy=".32"><stop offset="0" stop-color="#4b4440"/><stop offset=".55" stop-color="#14100e"/><stop offset="1" stop-color="#050404"/></radialGradient>
    <radialGradient id="palp" cx=".5" cy=".5" r=".55" fx=".4" fy=".35"><stop offset="0" stop-color="#f6eedf"/><stop offset=".8" stop-color="#d9c6a4"/><stop offset="1" stop-color="#b59b74"/></radialGradient>
    <filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>`;

  // abdomen: cream U band toward the front, central stripe with chevrons
  let abd = `<ellipse cx="628" cy="350" rx="198" ry="190" fill="url(#abd)"/>`;
  abd += `<path d="M444,372 C452,474 540,536 628,538 C716,536 804,474 812,372 C790,452 718,500 628,502 C538,500 466,452 444,372 Z" fill="#e3d0ae" filter="url(#soft)"/>`;
  abd += `<path d="M600,190 C604,260 606,350 610,470 L646,470 C650,350 652,260 656,190 C646,176 610,176 600,190 Z" fill="#d9c39d" filter="url(#soft)"/>`;
  for (let i = 0; i < 5; i++) {
    const y = 220 + i * 52, w = 64 - i * 5;
    abd += `<path d="M${628 - w},${y + 22} L628,${y} L${628 + w},${y + 22}" fill="none" stroke="#2c1b10" stroke-width="10" stroke-linejoin="round" stroke-opacity=".75"/>`;
  }
  [[540, 260], [716, 260], [520, 340], [736, 340], [548, 420], [708, 420]].forEach(([x, y]) => {
    abd += `<ellipse cx="${x}" cy="${y}" rx="17" ry="13" fill="#ead9ba" filter="url(#soft)"/>`;
  });
  abd += furEllipse(R, 628, 350, 196, 188, 2600, ['#2a1a0f', '#6a4628', '#e8d6b6', '#9a7148'], 15, 2.1);
  abd += `<ellipse cx="628" cy="350" rx="198" ry="190" fill="url(#abdShade)"/>`;
  abd += `<ellipse cx="627" cy="163" rx="20" ry="15" fill="#2a190f"/><ellipse cx="616" cy="156" rx="7" ry="9" fill="#3d2616"/><ellipse cx="638" cy="156" rx="7" ry="9" fill="#3d2616"/>`;

  // cephalothorax
  let ceph = `<path d="M627,540 L640,540 L640,566 L614,566 L614,540 Z" fill="#2a190f"/>`;
  ceph += `<path d="M512,600 C520,560 580,548 630,548 C680,548 740,560 748,600 C770,660 784,740 770,792 C756,826 700,836 630,836 C560,836 504,826 490,792 C476,740 490,660 512,600 Z" fill="url(#ceph)"/>`;
  ceph += `<path d="M498,700 C504,650 520,612 540,590 C530,640 528,700 536,780 C516,770 498,744 498,700 Z" fill="#e1cda9" filter="url(#soft)"/>`;
  ceph += `<path d="M762,700 C756,650 740,612 720,590 C730,640 732,700 724,780 C744,770 762,744 762,700 Z" fill="#e1cda9" filter="url(#soft)"/>`;
  ceph += `<path d="M560,640 C580,620 680,620 700,640 C716,700 712,770 700,810 C660,824 600,824 560,810 C548,770 544,700 560,640 Z" fill="#1c120b" fill-opacity=".72" filter="url(#soft)"/>`;
  ceph += `<ellipse cx="630" cy="600" rx="34" ry="22" fill="#d8c19c" fill-opacity=".85" filter="url(#soft)"/>`;
  ceph += furEllipse(R, 630, 690, 140, 130, 1500, ['#1f140c', '#5e3d24', '#d9c4a0'], 12, 2);
  const eyes = [[524, 642, 16], [736, 642, 16], [548, 706, 6], [712, 706, 6], [526, 788, 22], [734, 788, 22], [590, 806, 34], [670, 806, 34]];
  eyes.forEach(([x, y, r]) => {
    ceph += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#eye)"/>`;
    ceph += `<ellipse cx="${f(x - r * 0.32)}" cy="${f(y - r * 0.34)}" rx="${f(r * 0.28)}" ry="${f(r * 0.2)}" fill="#fff" fill-opacity=".6"/>`;
  });
  ceph += `<path d="M560,780 C590,760 670,760 700,780" fill="none" stroke="#e6a35a" stroke-width="6" stroke-opacity=".7" filter="url(#soft)"/>`;
  // palps
  let palps = `<path d="M600,836 L660,836 L652,900 L608,900 Z" fill="#3a2414"/>`;
  [[545, 880], [712, 880]].forEach(([x, y]) => {
    palps += `<ellipse cx="${x}" cy="${y}" rx="60" ry="56" fill="url(#palp)"/>`;
    palps += furEllipse(R, x, y, 58, 54, 420, ['#fbf6ec', '#cdb58e', '#8f7454'], 13, 1.8);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="560" viewBox="0 0 1254 1254"><defs>${defs}</defs>${legs}${abd}${palps}${ceph}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Idle head, 308 px, sprite space 308                                 */
/* ------------------------------------------------------------------ */
function idleHeadSVG() {
  const R = rng(55);
  const defs = `
    <radialGradient id="h" cx=".5" cy=".5" r=".55" fx=".42" fy=".36"><stop offset="0" stop-color="#8a5f3b"/><stop offset=".75" stop-color="#6b4529"/><stop offset="1" stop-color="#4a2e1a"/></radialGradient>
    <radialGradient id="e" cx=".5" cy=".5" r=".5" fx=".42" fy=".4"><stop offset="0" stop-color="#2b2421"/><stop offset=".8" stop-color="#0c0908"/><stop offset="1" stop-color="#000"/></radialGradient>
    <radialGradient id="p" cx=".5" cy=".5" r=".55" fx=".4" fy=".35"><stop offset="0" stop-color="#fbf5ea"/><stop offset="1" stop-color="#d6c19c"/></radialGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>`;
  let g = '';
  [[128, 206], [179, 206]].forEach(([x, y]) => {
    g += `<ellipse cx="${x}" cy="${y}" rx="19" ry="17" fill="url(#p)"/>`;
    g += furEllipse(R, x, y, 18, 16, 140, ['#fffaf0', '#cbb38c'], 4.5, 0.9);
  });
  g += `<path d="M104,128 C108,104 130,96 154,96 C178,96 200,104 204,128 C212,152 212,176 204,190 C196,200 176,204 154,204 C132,204 112,200 104,190 C96,176 96,152 104,128 Z" fill="url(#h)"/>`;
  g += `<path d="M100,150 C100,130 106,116 114,108 C110,130 110,160 114,186 C104,178 100,166 100,150 Z" fill="#e3cfab" filter="url(#s)"/>`;
  g += `<path d="M208,150 C208,130 202,116 194,108 C198,130 198,160 194,186 C204,178 208,166 208,150 Z" fill="#e3cfab" filter="url(#s)"/>`;
  g += furEllipse(R, 154, 150, 50, 50, 700, ['#4a2e1a', '#9a6e45', '#e1cba6'], 5, 1);
  g += `<path d="M126,144 C134,138 146,138 152,143 M156,143 C162,138 174,138 182,144" fill="none" stroke="#f0b26a" stroke-width="3.2" stroke-linecap="round" stroke-opacity=".85"/>`;
  g += `<ellipse cx="111" cy="172" rx="9" ry="5" fill="#e98f8a" fill-opacity=".35" filter="url(#s)"/>`;
  g += `<ellipse cx="197" cy="172" rx="9" ry="5" fill="#e98f8a" fill-opacity=".35" filter="url(#s)"/>`;
  const eyes = [[139, 158, 12.5], [170, 158, 12.5], [117, 150, 7.5], [192, 150, 7.5], [112, 136, 4], [197, 136, 4]];
  eyes.forEach(([x, y, r]) => {
    g += `<circle cx="${x}" cy="${y}" r="${r + 0.8}" fill="#3a2414"/>`;
    g += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#e)"/>`;
    g += `<circle cx="${f(x - r * 0.34)}" cy="${f(y - r * 0.36)}" r="${f(r * 0.3)}" fill="#fff"/>`;
    g += `<circle cx="${f(x + r * 0.36)}" cy="${f(y + r * 0.34)}" r="${f(r * 0.13)}" fill="#fff" fill-opacity=".8"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="308" height="308" viewBox="0 0 308 308"><defs>${defs}</defs>${g}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Fly, 240 x 246 px, sprite space 920 x 945                           */
/* ------------------------------------------------------------------ */
const WING = [[398, 380], [330, 415], [250, 515], [180, 615], [132, 720], [148, 795], [212, 805], [305, 742], [385, 652], [410, 560], [414, 455]];

function flySVG() {
  const R = rng(91);
  const defs = `
    <radialGradient id="thx" cx=".5" cy=".5" r=".55" fx=".4" fy=".35"><stop offset="0" stop-color="#6d6c6a"/><stop offset="1" stop-color="#2a2928"/></radialGradient>
    <radialGradient id="abd" cx=".5" cy=".5" r=".55" fx=".4" fy=".3"><stop offset="0" stop-color="#77746e"/><stop offset=".7" stop-color="#3e3c39"/><stop offset="1" stop-color="#1f1e1c"/></radialGradient>
    <radialGradient id="eye" cx=".5" cy=".5" r=".55" fx=".38" fy=".32"><stop offset="0" stop-color="#c2543a"/><stop offset=".7" stop-color="#7e2414"/><stop offset="1" stop-color="#4a120a"/></radialGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8eef2" stop-opacity=".62"/><stop offset="1" stop-color="#b9c4cc" stop-opacity=".38"/></linearGradient>`;
  let g = '';
  // legs (outside the wing polygons)
  const legs = [
    [[428, 330], [340, 262], [300, 150]],
    [[420, 420], [270, 400], [170, 470]],
    [[438, 520], [396, 690], [372, 860]],
  ];
  const legPath = (pts) => `M${pts.map((p) => p.join(',')).join(' L')}`;
  legs.forEach((l) => {
    const m = l.map(([x, y]) => [920 - x, y]);
    [l, m].forEach((pts) => {
      g += `<path d="${legPath(pts)}" fill="none" stroke="#1d1c1b" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>`;
      let h = '';
      for (let i = 0; i < 18; i++) {
        const s = R() < 0.5 ? 0 : 1;
        const t = R();
        const a = pts[s], b = pts[s + 1];
        const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        h += `M${f(x)},${f(y)} l${f((R() - 0.5) * 22)},${f((R() - 0.5) * 22)}`;
      }
      g += `<path d="${h}" stroke="#121110" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
    });
  });
  // wings, drawn inside the cut polygon, inset
  const wingPath = (pts) => {
    const cx = 300, cy = 610;
    const inset = pts.map(([x, y]) => [cx + (x - cx) * 0.96, cy + (y - cy) * 0.96]);
    return `M${inset.map((p) => p.map(f).join(',')).join(' L')} Z`;
  };
  const veins = (m) => {
    const tx = (x) => (m ? 920 - x : x);
    return `<path d="M${tx(392)},398 C${tx(330)},480 ${tx(240)},600 ${tx(150)},740 M${tx(396)},420 C${tx(350)},520 ${tx(280)},640 ${tx(196)},790 M${tx(398)},450 C${tx(380)},560 ${tx(330)},660 ${tx(270)},770 M${tx(330)},520 C${tx(300)},560 ${tx(290)},600 ${tx(300)},650" fill="none" stroke="#3b3a38" stroke-width="2.6" stroke-opacity=".55"/>`;
  };
  g += `<path d="${wingPath(WING)}" fill="url(#wing)" stroke="#6e7378" stroke-width="2" stroke-opacity=".45"/>${veins(false)}`;
  g += `<path d="${wingPath(WING.map(([x, y]) => [920 - x, y]))}" fill="url(#wing)" stroke="#6e7378" stroke-width="2" stroke-opacity=".45"/>${veins(true)}`;
  // abdomen
  g += `<ellipse cx="460" cy="650" rx="62" ry="138" fill="url(#abd)"/>`;
  for (let i = 0; i < 4; i++) {
    const y = 560 + i * 48;
    g += `<path d="M${410 + i * 3},${y} C440,${y + 12} 480,${y + 12} ${510 - i * 3},${y}" fill="none" stroke="#151413" stroke-width="5" stroke-opacity=".55"/>`;
    g += `<rect x="${430}" y="${y + 6}" width="18" height="20" fill="#9a968e" fill-opacity=".45"/><rect x="${472}" y="${y + 6}" width="18" height="20" fill="#9a968e" fill-opacity=".45"/>`;
  }
  // thorax
  g += `<ellipse cx="460" cy="402" rx="54" ry="86" fill="url(#thx)"/>`;
  [-24, -9, 9, 24].forEach((dx) => { g += `<path d="M${460 + dx},330 L${460 + dx * 0.9},470" stroke="#111" stroke-width="7" stroke-opacity=".7" stroke-linecap="round"/>`; });
  g += `<ellipse cx="460" cy="488" rx="26" ry="16" fill="#3a3937"/>`;
  // bristles on the body
  let br = '';
  for (let i = 0; i < 160; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R());
    const x = 460 + Math.cos(a) * 50 * r, y = 402 + Math.sin(a) * 84 * r;
    br += `M${f(x)},${f(y)} l${f(Math.cos(a) * 9)},${f(Math.sin(a) * 9)}`;
  }
  g += `<path d="${br}" stroke="#0c0c0b" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  // head
  g += `<ellipse cx="460" cy="248" rx="98" ry="64" fill="#2c2a28"/>`;
  g += `<ellipse cx="396" cy="236" rx="56" ry="66" fill="url(#eye)"/><ellipse cx="524" cy="236" rx="56" ry="66" fill="url(#eye)"/>`;
  let fac = '';
  [[396, 236], [524, 236]].forEach(([cx, cy]) => {
    for (let i = 0; i < 160; i++) {
      const a = R() * Math.PI * 2, r = Math.sqrt(R());
      fac += `M${f(cx + Math.cos(a) * 50 * r)},${f(cy + Math.sin(a) * 60 * r)} h1.6`;
    }
  });
  g += `<path d="${fac}" stroke="#e07a5a" stroke-width="2.2" stroke-opacity=".35" stroke-linecap="round"/>`;
  g += `<ellipse cx="380" cy="212" rx="16" ry="11" fill="#fff" fill-opacity=".35"/><ellipse cx="508" cy="212" rx="16" ry="11" fill="#fff" fill-opacity=".35"/>`;
  g += `<path d="M440,196 C450,190 470,190 480,196 L474,300 L446,300 Z" fill="#8f8a80"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="246" viewBox="0 0 920 945" preserveAspectRatio="none"><defs>${defs}</defs>${g}</svg>`;
}

/* ------------------------------------------------------------------ */
const jobs = [
  ['objects-sheet.webp', sheetSVG(), 2880, 1620, 0.9],
  ['spider.webp', spiderSVG(), 560, 560, 0.9],
  ['idle-head.webp', idleHeadSVG(), 308, 308, 0.92],
  ['fly.webp', flySVG(), 240, 246, 0.92],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, svg, w, h, q] of jobs) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const png = await page.locator('svg').screenshot({ omitBackground: true, type: 'png' });
  const b64 = await page.evaluate(async ({ data, q }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + data;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', q).split(',')[1];
  }, { data: png.toString('base64'), q });
  writeFileSync(join(OUT, name), Buffer.from(b64, 'base64'));
  if (process.env.PREVIEW) writeFileSync(join(process.env.PREVIEW, name.replace('.webp', '.png')), png);
}
await browser.close();
