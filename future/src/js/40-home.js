/* ---- Room 1: Home ---- */
const canvasOf = (w, hgt) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(hgt));
  return c;
};
const loadImage = (src) => {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
};
const angDiff = (a, b) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
const smooth = (x) => x * x * (3 - 2 * x);
const rand = (a, b) => a + Math.random() * (b - a);
const toBody = ([x, y]) => [y - RIG.pivot[1], -(x - RIG.pivot[0])];

/* Cuts the photo rig into layers and leg strips, and the fly into body and wings */
async function prepareArt() {
  const [spider, idle, flyImg] = await Promise.all([ASSET.spider, ASSET.head, ASSET.fly].map((s) => loadImage(s).catch(() => null)));
  const iw = spider.naturalWidth, ih = spider.naturalHeight, S = iw / RIG.base;
  const layer = (ells) => {
    const c = canvasOf(iw, ih), g = c.getContext('2d');
    g.drawImage(spider, 0, 0);
    const m = canvasOf(iw, ih), mg = m.getContext('2d');
    mg.filter = `blur(${2 * S}px)`;
    mg.fillStyle = '#000';
    ells.forEach(([x, y, rx, ry]) => { mg.beginPath(); mg.ellipse(x * S, y * S, rx * S, ry * S, 0, 0, TAU); mg.fill(); });
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(m, 0, 0);
    return c;
  };
  const src = canvasOf(iw, ih), sg = src.getContext('2d', { willReadFrequently: true });
  sg.drawImage(spider, 0, 0);
  const px = sg.getImageData(0, 0, iw, ih).data;
  const out = [0, 0, 0, 0];
  const sample = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < 4; j++) {
      const xx = x0 + (j & 1), yy = y0 + (j >> 1);
      if (xx < 0 || yy < 0 || xx >= iw || yy >= ih) continue;
      const w = ((j & 1) ? fx : 1 - fx) * ((j >> 1) ? fy : 1 - fy);
      const i = (yy * iw + xx) * 4, al = px[i + 3] * w;
      r += px[i] * al; g += px[i + 1] * al; b += px[i + 2] * al; a += al;
    }
    out[0] = a ? r / a : 0; out[1] = a ? g / a : 0; out[2] = a ? b / a : 0; out[3] = a;
    return out;
  };
  const makeStrip = (hip, knee, foot) => {
    const lf = Math.hypot(knee[0] - hip[0], knee[1] - hip[1]), lt = Math.hypot(foot[0] - knee[0], foot[1] - knee[1]);
    const lw = Math.ceil((lf + lt) * S), ww = Math.ceil(RIG.legWidth * S), hw = RIG.legWidth / 2;
    const c = canvasOf(lw, ww), g = c.getContext('2d'), im = g.createImageData(lw, ww), d = im.data;
    const df = [(knee[0] - hip[0]) / lf, (knee[1] - hip[1]) / lf], dt = [(foot[0] - knee[0]) / lt, (foot[1] - knee[1]) / lt];
    for (let u = 0; u < lw; u++) {
      const s = (u + .5) / S;
      const [bx, by, dir] = s < lf ? [hip[0] + df[0] * s, hip[1] + df[1] * s, df] : [knee[0] + dt[0] * (s - lf), knee[1] + dt[1] * (s - lf), dt];
      for (let v = 0; v < ww; v++) {
        const off = (v + .5) / S - hw;
        const c4 = sample((bx - dir[1] * off) * S - .5, (by + dir[0] * off) * S - .5);
        const e = Math.abs(off) / hw;
        const fade = e > 1 - RIG.fade ? Math.max(0, (1 - e) / RIG.fade) : 1;
        const i = (v * lw + u) * 4;
        d[i] = c4[0]; d[i + 1] = c4[1]; d[i + 2] = c4[2]; d[i + 3] = c4[3] * fade;
      }
    }
    g.putImageData(im, 0, 0);
    return { c, lw, ww, split: lf / (lf + lt), lf, lt };
  };
  const legs = [];
  RIG.legs.forEach((L, i) => [1, -1].forEach((side) => {
    const pts = side > 0 ? L : L.map(([x, y]) => [RIG.base - x, y]);
    const strip = makeStrip(...pts);
    const hip = toBody(pts[0]), rest = toBody(pts[2]);
    let a = strip.lf, b = strip.lt;
    const need = RIG.reachMin * Math.hypot(rest[0] - hip[0], rest[1] - hip[1]);
    if (a + b < need) { const k = need / (a + b); a *= k; b *= k; }
    legs.push({ i, side, front: i === 0, group: (i + (side > 0 ? 0 : 1)) % 2, hip, rest, a, b, strip });
  }));

  let skin = null;
  if (idle) {
    const c = canvasOf(RIG.idle.size, RIG.idle.size), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(idle, 0, 0, RIG.idle.size, RIG.idle.size);
    skin = RIG.eyes.map(([x, y, r]) => {
      const p = g.getImageData(Math.round(x), Math.round(y - r - 3), 1, 1).data;
      return `rgb(${p[0] * RIG.lid[0]},${p[1] * RIG.lid[1]},${p[2] * RIG.lid[2]})`;
    });
  }

  let fly = null;
  if (flyImg) {
    const fw = flyImg.naturalWidth, fh = flyImg.naturalHeight, fs = fw / FLY.w;
    const poly = (g, mirror) => {
      g.beginPath();
      FLY.wing.forEach(([x, y], i) => { const X = (mirror ? FLY.w - x : x) * fs, Y = y * fs; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
      g.closePath();
    };
    const body = canvasOf(fw, fh), bg = body.getContext('2d');
    bg.drawImage(flyImg, 0, 0);
    bg.globalCompositeOperation = 'destination-out';
    poly(bg, false); bg.fill();
    poly(bg, true); bg.fill();
    const wing = (mirror) => {
      const c = canvasOf(fw, fh), g = c.getContext('2d');
      poly(g, mirror); g.clip();
      g.drawImage(flyImg, 0, 0);
      return c;
    };
    fly = { body, wl: wing(false), wr: wing(true) };
  }

  const D = SILK.dew.sprite, bead = canvasOf(D, D), g = bead.getContext('2d'), c = D / 2, R = c - 1;
  const disc = (x, y, r, stops) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr;
    g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
  };
  disc(c, c, R, [[0, 'rgba(255,255,255,.06)'], [.62, 'rgba(255,255,255,.1)'], [.86, 'rgba(255,255,255,.5)'], [.95, 'rgba(214,226,255,.75)'], [1, 'rgba(255,255,255,0)']]);
  disc(c - R * .2, c - R * .2, R * 1.15, [[.6, 'rgba(10,20,90,0)'], [.86, 'rgba(10,20,90,.22)'], [1, 'rgba(10,20,90,0)']]);
  disc(c + R * .3, c + R * .38, R * .44, [[0, 'rgba(255,210,150,.45)'], [1, 'rgba(255,210,150,0)']]);
  disc(c - R * .34, c - R * .38, R * .28, [[0, 'rgba(255,255,255,1)'], [.5, 'rgba(255,255,255,.85)'], [1, 'rgba(255,255,255,0)']]);

  return { abd: layer([RIG.abdomen]), head: layer(RIG.head), idle, skin, legs, fly, bead };
}

function createHome(root, art) {
  const canvas = $('.web-layer', root);
  const ctx = canvas.getContext('2d');
  const so = canvasOf(1, 1), sctx = so.getContext('2d');
  const fo = canvasOf(1, 1), fctx = fo.getContext('2d');
  const sh = canvasOf(1, 1), shctx = sh.getContext('2d');
  const mask = canvasOf(1, 1), mctx = mask.getContext('2d', { willReadFrequently: true });
  const smask = canvasOf(1, 1), smctx = smask.getContext('2d');
  const tmp = canvasOf(1, 1), tctx = tmp.getContext('2d', { willReadFrequently: true });
  const cuts = $$('.cut', root);
  cuts.forEach((el) => el.append(crop(+el.dataset.slot, 'xMidYMax meet')));
  const flyOK = !!art.fly;
  const hairK = FINE.matches ? 1 : SILK.hair.touch;
  const CELL = SILK.attach.near;

  let W = 0, H = 0, dpr = 1, K = .2, flySize = 1, tScale = 1, R0 = 1, FR = 1;
  let raf = 0, last = 0, B = 0, ac = null, ro = null, holdT = 0, lastTap = 0, tapX = 0, tapY = 0, holdX = 0, holdY = 0;
  const timers = [];
  let cs = 0, sn = 1, kb = .2;

  const sp = { x: 0, y: 0, th: Math.PI / 2, speed: 0, vx: 0, vy: 0, z: 0, lt: 0, qt: 0, restT: 0, sleep: 0, breath: 0, jump: null, jh: 0, faceT: 0, blinkAt: 0, blinkN: 0, blinkS: -1 };
  const intro = { phase: 'done', t: 0, wait: SPIDER.introWait };
  const legs = art.legs.map((l) => ({ ...l, fx: 0, fy: 0, from: [0, 0], to: [0, 0], st: 1, stepping: false, dur: SPIDER.stepMax }));
  const fly = { x: 0, y: 0, ang: 0, landed: 0, alpha: 0, recoil: 0, caught: 0, seen: false };
  const ptr = { x: -999, y: -999, has: false, over: false, moved: -10 };
  let cocoon = null;

  let threads = [], live = null, liveStart = { x: 0, y: 0 }, startAnchor = null, anchors = [], falling = [], splats = [];
  let freeTravel = 0, lastSpin = { x: 0, y: 0 };
  const outline = { xs: [], ys: [], grid: new Map() };
  let staticXs = [], staticYs = [], maskA = null, nudgeMoved = 0, nudgePending = false;
  const q = { x: 0, y: 0, tx: 1, ty: 0 };

  const wobs = [...cuts, $('.bag-icon')].map((el) => ({
    el, cut: el.classList.contains('cut'), stick: el.dataset.stick === 'bottom',
    base: parseFloat(getComputedStyle(el).rotate) || 0, ang: 0, va: 0, ox: 0, oy: 0, vx: 0, vy: 0, box: null,
  }));

  /* ---------- geometry ---------- */
  const wx = (bx, by) => sp.x + (cs * bx - sn * by) * kb;
  const wy = (bx, by) => sp.y + (sn * bx + cs * by) * kb;
  const SPIN = toBody(RIG.spinneret);
  const spin = () => ({ x: wx(SPIN[0], SPIN[1]), y: wy(SPIN[0], SPIN[1]) });
  const mouth = () => ({ x: sp.x + cs * SPIDER.jump.reach * K, y: sp.y + sn * SPIDER.jump.reach * K });

  function size() {
    const r = canvas.getBoundingClientRect();
    const nd = Math.min(2, window.devicePixelRatio || 1);
    if (r.width === W && r.height === H && nd === dpr) return false;
    W = r.width; H = r.height; dpr = nd;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    sh.width = Math.ceil(W * SILK.shadowRes); sh.height = Math.ceil(H * SILK.shadowRes);
    mask.width = smask.width = Math.ceil(W); mask.height = smask.height = Math.ceil(H);
    const t = W <= H ? clamp(W / 480, .78, 1.1) : H < 560 ? Math.max(.68, H / 620) : Math.min(W / 1440, H / 810);
    tScale = clamp(t, .6, 1.25);
    K = 1.63 * tScale * .12;
    flySize = Math.max(.75, 1.05 * tScale);
    R0 = 820 * K;
    so.width = so.height = Math.ceil(2 * R0 * dpr);
    FR = FLY.px * flySize * .9;
    fo.width = fo.height = Math.ceil(2 * FR * dpr);
    if (intro.phase !== 'done') sp.x = W / 2;
    sp.x = clamp(sp.x, SPIDER.edge, Math.max(SPIDER.edge, W - SPIDER.edge));
    if (intro.phase === 'done') sp.y = clamp(sp.y, SPIDER.edge, Math.max(SPIDER.edge, H - SPIDER.edge));
    return true;
  }

  /* ---------- silk ---------- */
  function rope(ax, ay, bx, by, thick, sag) {
    const n = SILK.segs, p = new Float64Array((n + 1) * 4);
    for (let i = 0; i <= n; i++) {
      const t = i / n, k = i * 4;
      p[k] = p[k + 2] = ax + (bx - ax) * t;
      p[k + 1] = p[k + 3] = ay + (by - ay) * t;
    }
    const len = Math.hypot(bx - ax, by - ay);
    return { p, thick, len, rest: len / n * (sag ? rand(SILK.sag[0], SILK.sag[1]) : SILK.sag[0]), born: B, phase: Math.random() * TAU, alpha: 1, fading: false, dew: [], hairs: null, fluff: null };
  }
  function dress(r, dew) {
    const n = Math.round(r.len * SILK.hair.per * hairK);
    const hs = new Float32Array(n * 4);
    for (let j = 0; j < n; j++) {
      hs[j * 4] = Math.random();
      hs[j * 4 + 1] = Math.random() < .5 ? -1 : 1;
      hs[j * 4 + 2] = rand(SILK.hair.len[0], SILK.hair.len[1]) * r.thick;
      hs[j * 4 + 3] = rand(.5, 1.4);
    }
    r.hairs = hs;
    if (Math.random() < SILK.fluff.p) {
      r.fluff = Array.from({ length: Math.random() < .5 ? 1 : 2 }, () => {
        const dust = Math.random() < .5;
        const count = dust ? SILK.fluff.dust : SILK.fluff.fibres;
        return { u: rand(.15, .85), dust, bits: Array.from({ length: count }, () => [rand(-3, 3), rand(-3, 3), rand(0, TAU), rand(2, 6)]) };
      });
    }
    if (dew) {
      const count = Math.floor(r.len / SILK.dew.per * (SILK.dew.base + Math.random()));
      for (let j = 0; j < count; j++) r.dew.push({ u: rand(SILK.dewEdge, 1 - SILK.dewEdge), r: rand(SILK.dew.r[0], SILK.dew.r[1]), slide: false, v: 0 });
    }
  }
  function addAnchor(x, y) {
    const tufts = new Float32Array(SILK.tufts * 2);
    for (let j = 0; j < SILK.tufts; j++) { tufts[j * 2] = Math.random() * TAU; tufts[j * 2 + 1] = rand(1.5, 5); }
    const a = { x, y, tufts };
    anchors.push(a);
    return a;
  }
  function addThread(ax, ay, bx, by, thick) {
    const r = rope(ax, ay, bx, by, thick, true);
    dress(r, false);
    threads.push(r);
  }
  function newLive(x, y) {
    liveStart = { x, y };
    const s = spin();
    live = rope(x, y, s.x, s.y, SILK.liveThick, false);
  }
  const cellKey = (cx, cy) => (cx + 1024) * 4096 + cy + 1024;
  function nearest(x, y, r, ok) {
    const { xs, ys, grid } = outline;
    let best = -1, bd = r * r;
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
      for (let cy = Math.floor((y - r) / CELL); cy <= Math.floor((y + r) / CELL); cy++) {
        const cell = grid.get(cellKey(cx, cy));
        if (!cell) continue;
        for (const i of cell) {
          const dx = xs[i] - x, dy = ys[i] - y, d2 = dx * dx + dy * dy;
          if (d2 < bd && ok(xs[i], ys[i])) { bd = d2; best = i; }
        }
      }
    }
    return best;
  }
  function attach(x, y) {
    const r = live, n = SILK.segs, k = n * 4, A = SILK.attach;
    r.p[k] = r.p[k + 2] = x; r.p[k + 1] = r.p[k + 3] = y;
    r.len = Math.hypot(x - liveStart.x, y - liveStart.y);
    r.rest = r.len / n * rand(SILK.sag[0], SILK.sag[1]);
    r.born = B;
    dress(r, true);
    threads.push(r);
    let best = null, bd = A.radial;
    for (const a of anchors) {
      if (a === startAnchor) continue;
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bd && d > 1) { bd = d; best = a; }
    }
    if (best) addThread(x, y, best.x, best.y, A.radialThick);
    if (Math.random() < A.crossP && outline.xs.length) {
      const j = nearest(x, y, A.cross, (qx, qy) => Math.hypot(qx - x, qy - y) > A.crossMin);
      if (j >= 0) { addThread(x, y, outline.xs[j], outline.ys[j], A.crossThick); addAnchor(outline.xs[j], outline.ys[j]); }
    }
    startAnchor = addAnchor(x, y);
    newLive(x, y);
    vibrate(x, y, A.buzz[0], A.buzz[1]);
    while (threads.length > SILK.max) threads.shift();
  }
  function shake(r, x, y, rad, s) {
    const p = r.p, n = SILK.segs;
    const endNear = Math.hypot(p[0] - x, p[1] - y) < rad || Math.hypot(p[n * 4] - x, p[n * 4 + 1] - y) < rad;
    let hit = false;
    for (let i = 1; i < n; i++) {
      const k = i * 4, d = Math.hypot(p[k] - x, p[k + 1] - y);
      let f = d < rad ? s * (1 - d / rad) : 0;
      if (endNear) f += s * SILK.shakeEnd;
      if (!f) continue;
      p[k] += (Math.random() - .5) * 2 * f;
      p[k + 1] += (Math.random() - .5) * 2 * f;
      hit = true;
    }
    if (hit) r.dew.forEach((d) => { if (!d.slide && Math.random() < SILK.slideP) d.slide = true; });
  }
  function vibrate(x, y, rad, s) {
    threads.forEach((r) => shake(r, x, y, rad, s));
    if (live) shake(live, x, y, rad, s);
  }
  function at(p, u) {
    const n = SILK.segs, f = clamp(u, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(f)), t = f - i, a = i * 4, b = a + 4;
    q.x = p[a] + (p[b] - p[a]) * t; q.y = p[a + 1] + (p[b + 1] - p[a + 1]) * t;
    q.tx = p[b] - p[a]; q.ty = p[b + 1] - p[a + 1];
    return q;
  }
  const maskHit = (x, y) => {
    const xi = x | 0, yi = y | 0;
    return !!maskA && xi >= 0 && yi >= 0 && xi < mask.width && yi < mask.height && maskA[(yi * mask.width + xi) * 4 + 3] > 128;
  };
  function fall(x, y, r, splat) { falling.push({ x, y, y0: y, vy: 0, r, splat }); }
  function clearWeb() {
    if (live) { threads.push(live); live = null; }
    threads.forEach((t) => {
      t.dew.forEach((d) => { at(t.p, d.u); fall(q.x, q.y, d.r, true); });
      t.dew = [];
      t.fading = true;
      for (let i = 1; i < SILK.segs; i++) { t.p[i * 4] += (Math.random() - .5) * 2 * SILK.clearShake; t.p[i * 4 + 1] += (Math.random() - .5) * 2 * SILK.clearShake; }
    });
    splats.forEach((s) => fall(s.x, s.y, s.r, false));
    splats = [];
    anchors = [];
    startAnchor = null;
    const s = spin();
    newLive(s.x, s.y);
    lastSpin = s;
    freeTravel = 0;
  }
  function stepRope(r, dt, wind0, g) {
    const p = r.p, n = SILK.segs, wk = SILK.wind, push = SILK.push;
    for (let i = 1; i < n; i++) {
      const k = i * 4, x = p[k], y = p[k + 1];
      const vx = (x - p[k + 2]) * SILK.damping, vy = (y - p[k + 3]) * SILK.damping;
      p[k + 2] = x; p[k + 3] = y;
      let nx = x + vx + wind0 * (wk[5] + wk[6] * Math.sin(wk[7] * B + wk[8] * y + r.phase)) * wk[9] * dt * dt;
      let ny = y + vy + g;
      if (ptr.has) {
        const dx = nx - ptr.x, dy = ny - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < push * push && d2 > .01) { const f = push / Math.sqrt(d2); nx = ptr.x + dx * f; ny = ptr.y + dy * f; }
      }
      p[k] = nx; p[k + 1] = ny;
    }
    const rest = r.rest;
    for (let pass = 0; pass < SILK.passes; pass++) {
      for (let i = 0; i < n; i++) {
        const a = i * 4, b = a + 4;
        const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        const df = (d - rest) / d;
        if (i === 0) { p[b] -= dx * df; p[b + 1] -= dy * df; } else if (i === n - 1) { p[a] += dx * df; p[a + 1] += dy * df; } else {
          const hx = dx * df * .5, hy = dy * df * .5;
          p[a] += hx; p[a + 1] += hy; p[b] -= hx; p[b + 1] -= hy;
        }
      }
    }
  }
  function updateSilk(dt) {
    const s = spin();
    if (intro.phase === 'done' && live) {
      const dS = Math.hypot(s.x - liveStart.x, s.y - liveStart.y);
      if (outline.xs.length) {
        if (dS > SILK.attach.travel) {
          const i = nearest(s.x, s.y, SILK.attach.near, (x, y) => Math.hypot(x - liveStart.x, y - liveStart.y) >= SILK.attach.fromStart);
          if (i >= 0) attach(outline.xs[i], outline.ys[i]);
        }
      } else {
        freeTravel += Math.hypot(s.x - lastSpin.x, s.y - lastSpin.y);
        if (freeTravel >= SILK.free) { freeTravel = 0; attach(s.x, s.y); }
      }
    }
    lastSpin = s;
    if (live) {
      const n = SILK.segs, k = n * 4, e = spin();
      live.p[k] = live.p[k + 2] = e.x; live.p[k + 1] = live.p[k + 3] = e.y;
      live.len = Math.hypot(e.x - liveStart.x, e.y - liveStart.y);
      live.rest = Math.max(.5, live.len / n * SILK.sag[0]);
    }
    const wk = SILK.wind;
    const wind0 = Math.sin(wk[0] * B) * wk[1] + Math.sin(wk[2] * B + wk[3]) * wk[4];
    const g = SILK.gravity * dt * dt;
    for (let j = threads.length - 1; j >= 0; j--) {
      const r = threads[j];
      if (r.fading) {
        r.alpha -= SILK.clearFade * dt;
        if (r.alpha <= 0) { threads.splice(j, 1); continue; }
      }
      stepRope(r, dt, wind0, g);
    }
    if (live) stepRope(live, dt, wind0, g);
    updateDrops(dt);
  }
  function updateDrops(dt) {
    const D = SILK.drops;
    threads.forEach((t) => {
      const span = t.rest * SILK.segs, pad = SILK.endPad / span;
      for (let j = t.dew.length - 1; j >= 0; j--) {
        const d = t.dew[j];
        at(t.p, d.u);
        const sl = Math.hypot(q.tx, q.ty) || 1, slope = q.ty / sl;
        if (d.slide) {
          d.v = (d.v + slope * D.slope * dt) * D.keep;
          d.u += d.v / span;
        }
        if (Math.abs(slope) > SILK.steep || d.u < pad || d.u > 1 - pad || (d.r > SILK.bigDrop && Math.random() < SILK.bigDropP)) {
          fall(q.x, q.y, d.r, true);
          t.dew.splice(j, 1);
        }
      }
    });
    for (let j = falling.length - 1; j >= 0; j--) {
      const f = falling[j];
      f.vy += D.fall * dt;
      f.y += f.vy * dt;
      if (f.splat && f.y - f.y0 > D.splatAfter && maskHit(f.x, f.y)) {
        splats.push({ x: f.x, y: f.y, r: f.r });
        if (splats.length > D.maxSplats) splats.shift();
        falling.splice(j, 1);
      } else if (f.y > H + 20) falling.splice(j, 1);
    }
  }

  /* ---------- anchors: outline points and silhouettes ---------- */
  function edges(w, hgt, thr, cb) {
    const d = tctx.getImageData(0, 0, w, hgt).data, row = w * 4;
    for (let y = 0; y < hgt; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4 + 3;
        if (d[i] <= thr) continue;
        if (x === 0 || y === 0 || x === w - 1 || y === hgt - 1 || d[i - 4] <= thr || d[i + 4] <= thr || d[i - row] <= thr || d[i + row] <= thr) cb(x, y);
      }
    }
  }
  function useTmp(w, hgt) {
    tmp.width = Math.max(1, Math.ceil(w)); tmp.height = Math.max(1, Math.ceil(hgt));
    tctx.clearRect(0, 0, tmp.width, tmp.height);
  }
  function sampleText(el, add) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node;
    while ((node = walker.nextNode())) {
      const cs0 = getComputedStyle(node.parentElement);
      const font = `${cs0.fontStyle} ${cs0.fontWeight} ${cs0.fontSize} ${cs0.fontFamily}`;
      for (let i = 0; i < node.length; i++) {
        const ch = node.data[i];
        if (/\s/.test(ch)) continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width) continue;
        const pad = Math.ceil(r.height * .5);
        useTmp(r.width + pad * 2, r.height + pad * 2);
        tctx.font = font;
        tctx.fillStyle = '#000';
        const asc = tctx.measureText(ch).fontBoundingBoxAscent;
        tctx.fillText(ch, pad, pad + asc);
        edges(tmp.width, tmp.height, ANCHOR.textAlpha, (x, y) => add(x + r.left - pad, y + r.top - pad));
        smctx.font = font;
        smctx.fillText(ch, r.left, r.top + asc);
      }
    }
  }
  function sampleBox(el, add) {
    const r = el.getBoundingClientRect();
    const rad = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
    const st = SILK.step;
    const sides = [[r.left + rad, r.top, r.right - rad, r.top], [r.right, r.top + rad, r.right, r.bottom - rad], [r.right - rad, r.bottom, r.left + rad, r.bottom], [r.left, r.bottom - rad, r.left, r.top + rad]];
    sides.forEach(([x0, y0, x1, y1]) => {
      const L = Math.hypot(x1 - x0, y1 - y0);
      for (let s = 0; s <= L; s += st) add(x0 + (x1 - x0) * s / L, y0 + (y1 - y0) * s / L);
    });
    if (rad) {
      [[r.right - rad, r.top + rad, -Math.PI / 2], [r.right - rad, r.bottom - rad, 0], [r.left + rad, r.bottom - rad, Math.PI / 2], [r.left + rad, r.top + rad, Math.PI]].forEach(([cx, cy, a0]) => {
        for (let a = 0; a < Math.PI / 2; a += st / rad) add(cx + Math.cos(a0 + a) * rad, cy + Math.sin(a0 + a) * rad);
      });
    }
    smctx.beginPath();
    smctx.roundRect(r.left, r.top, r.width, r.height, rad);
    smctx.fill();
  }
  function sampleCut(o, add) {
    const el = o.el, w = el.offsetWidth, hgt = el.offsetHeight;
    if (!w || !hgt) return;
    const b = Sheet.boxes[+el.dataset.slot], r = b.w / b.h, k = Sheet.img.naturalWidth / SHEET.w;
    let dw, dh;
    if (w / hgt > r) { dh = hgt; dw = hgt * r; } else { dw = w; dh = w / r; }
    useTmp(w, hgt);
    tctx.drawImage(Sheet.img, b.x * k, b.y * k, b.w * k, b.h * k, (w - dw) / 2, hgt - dh, dw, dh);
    const ox = w / 2, oy = o.stick ? hgt : hgt / 2;
    const rot = (o.base + o.ang) * Math.PI / 180, c = Math.cos(rot), s = Math.sin(rot);
    const Ox = el.offsetLeft + ox + o.ox, Oy = el.offsetTop + oy + o.oy;
    edges(tmp.width, tmp.height, ANCHOR.imgAlpha, (x, y) => {
      const lx = x - ox, ly = y - oy;
      add(Ox + c * lx - s * ly, Oy + s * lx + c * ly);
    });
    mctx.save();
    mctx.translate(Ox, Oy); mctx.rotate(rot);
    mctx.drawImage(tmp, -ox, -oy);
    mctx.restore();
  }
  function measureWobs() {
    wobs.forEach((o) => {
      if (!o.el.getClientRects().length) { o.box = null; return; }
      if (o.cut) o.box = { cx: o.el.offsetLeft + o.el.offsetWidth / 2, cy: o.el.offsetTop + o.el.offsetHeight / 2, w: o.el.offsetWidth, h: o.el.offsetHeight };
      else { const r = o.el.getBoundingClientRect(); o.box = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height }; }
    });
  }
  /* full = text and boxes too; otherwise only the cut-outs, which move */
  function sampleAnchors(full) {
    if (!W || !ac) return;
    const xs = [], ys = [], seen = new Set(), st = SILK.step;
    const add = (x, y) => {
      const key = (Math.floor(x / st) + 1024) * 65536 + Math.floor(y / st) + 1024;
      if (seen.has(key)) return;
      seen.add(key); xs.push(x); ys.push(y);
    };
    if (full) {
      smctx.setTransform(1, 0, 0, 1, 0, 0);
      smctx.clearRect(0, 0, smask.width, smask.height);
      smctx.fillStyle = '#000';
      $$('[data-web-anchor]').forEach((el) => {
        if (el.classList.contains('cut') || !el.getClientRects().length) return;
        if (el.tagName === 'BUTTON') sampleBox(el, add); else sampleText(el, add);
      });
      staticXs = xs.slice(); staticYs = ys.slice();
      measureWobs();
    } else {
      staticXs.forEach((x, i) => { xs.push(x); ys.push(staticYs[i]); });
    }
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, mask.width, mask.height);
    mctx.drawImage(smask, 0, 0);
    wobs.forEach((o) => { if (o.cut && o.box) sampleCut(o, add); });
    maskA = mctx.getImageData(0, 0, mask.width, mask.height).data;
    const grid = new Map();
    xs.forEach((x, i) => {
      const key = cellKey(Math.floor(x / CELL), Math.floor(ys[i] / CELL));
      let cell = grid.get(key);
      if (!cell) grid.set(key, (cell = []));
      cell.push(i);
    });
    outline.xs = xs; outline.ys = ys; outline.grid = grid;
  }

  /* ---------- objects react ---------- */
  function updateNudges(dt) {
    const N0 = NUDGE, v = Math.hypot(sp.vx, sp.vy), damp = Math.exp(-N0.damp * dt);
    let moving = false;
    wobs.forEach((o) => {
      if (!o.box) return;
      const dx = sp.x - (o.box.cx + o.ox), dy = sp.y - (o.box.cy + o.oy);
      const ex = Math.max(0, Math.abs(dx) - o.box.w / 2), ey = Math.max(0, Math.abs(dy) - o.box.h / 2);
      if (v > N0.speed && Math.hypot(ex, ey) < N0.near * K) {
        const sz = Math.max(o.box.w, o.box.h);
        o.va += clamp((dx * sp.vy - dy * sp.vx) / (sz * sz), -N0.torqueMax, N0.torqueMax) * N0.torqueK * dt;
        if (o.cut && !o.stick) { o.vx += N0.push * sp.vx * dt; o.vy += N0.push * sp.vy * dt; }
      }
      o.va *= damp; o.vx *= damp; o.vy *= damp;
      const lim = o.stick ? N0.stickAngle : N0.angle, ks = o.stick ? N0.stickSpring : N0.spring;
      if (Math.abs(o.ang) > lim) o.va -= (o.ang - Math.sign(o.ang) * lim) * ks * dt;
      const off = Math.hypot(o.ox, o.oy);
      if (off > N0.offset) { const f = (off - N0.offset) * N0.spring * dt / off; o.vx -= o.ox * f; o.vy -= o.oy * f; }
      if (Math.abs(o.va) < .02 && Math.hypot(o.vx, o.vy) < .02) return;
      moving = true;
      o.ang += o.va * dt; o.ox += o.vx * dt; o.oy += o.vy * dt;
      o.el.style.rotate = `${o.base + o.ang}deg`;
      if (o.cut && !o.stick) o.el.style.translate = `${o.ox}px ${o.oy}px`;
    });
    if (moving) { nudgeMoved = B; nudgePending = true; } else if (nudgePending && B - nudgeMoved > N0.settle) {
      nudgePending = false;
      sampleAnchors(false);
    }
  }
  function spinNearby() {
    const J = SPIDER.jump;
    wobs.forEach((o) => {
      if (!o.box) return;
      const ex = Math.max(0, Math.abs(sp.x - o.box.cx - o.ox) - o.box.w / 2), ey = Math.max(0, Math.abs(sp.y - o.box.cy - o.oy) - o.box.h / 2);
      if (Math.hypot(ex, ey) < NUDGE.near * K) o.va += (Math.random() < .5 ? -1 : 1) * rand(J.spinMin, J.spinMax) * NUDGE.damp;
    });
  }

  /* ---------- spider ---------- */
  function plantFeet() {
    legs.forEach((l) => {
      const tuck = 1 - (1 - SPIDER.sleep.tuck) * smooth(sp.sleep);
      const bx = l.hip[0] + (l.rest[0] - l.hip[0]) * tuck, by = l.hip[1] + (l.rest[1] - l.hip[1]) * tuck;
      l.fx = wx(bx, by); l.fy = wy(bx, by);
      l.stepping = false; l.st = 1;
    });
  }
  function resetSpider(first) {
    Object.assign(sp, { th: Math.PI / 2, speed: 0, vx: 0, vy: 0, z: 0, lt: 0, qt: 0, restT: 0, sleep: 0, jump: null, jh: 0, faceT: 0, blinkN: 0, blinkS: -1, blinkAt: SPIDER.rest.blinkAfter });
    sp.x = W / 2;
    cs = 0; sn = 1; kb = K;
    threads = []; anchors = []; falling = []; splats = []; startAnchor = null; freeTravel = 0;
    if (reduced()) {
      intro.phase = 'done';
      sp.y = H / 2;
      const s = spin();
      newLive(s.x, s.y);
    } else {
      intro.phase = 'wait'; intro.t = 0;
      intro.wait = first ? SPIDER.introWait : SPIDER.introWaitAgain;
      sp.y = SPIDER.introY * K;
      newLive(W / 2, -2);
    }
    lastSpin = spin();
    plantFeet();
  }
  function updateIntro(dt) {
    intro.t += dt;
    const top = SPIDER.introY * K;
    sp.x = W / 2;
    sp.th = Math.PI / 2;
    if (intro.phase === 'wait') {
      sp.y = top;
      if (intro.t >= intro.wait) { intro.phase = 'drop'; intro.t = 0; }
    } else if (intro.phase === 'drop') {
      const v = Math.min(1, intro.t / SPIDER.introDrop);
      sp.y = top + (H / 2 - top) * (1 - Math.pow(1 - v, SPIDER.introPow));
      if (v >= 1) { intro.phase = 'hang'; intro.t = 0; }
    } else {
      const u = intro.t, [ba, bk, bw] = SPIDER.bounce, [sw, sa, sk] = SPIDER.swayX;
      sp.y = H / 2 + ba * Math.exp(-bk * u) * Math.sin(bw * u);
      sp.x = W / 2 + Math.sin(sw * u) * sa * Math.exp(-sk * u);
      sp.th = Math.PI / 2 + Math.sin(bw * u * .5) * SPIDER.wobble * Math.exp(-u);
      if (u >= SPIDER.introLand) {
        intro.phase = 'done';
        sp.lt = 1;
        vibrate(sp.x, sp.y, SILK.landBuzz[0], SILK.landBuzz[1]);
      }
    }
  }
  function follow(dt) {
    const tx = flyOK ? fly.x : ptr.x, ty = flyOK ? fly.y : ptr.y;
    let want = 0;
    if (ptr.has || fly.caught > 0) {
      const dx = tx - sp.x, dy = ty - sp.y, d = Math.hypot(dx, dy);
      const gap = (flyOK ? SPIDER.gap : SPIDER.gapNoFly) * K;
      want = Math.min(SPIDER.vmax, Math.max(0, (d - gap) * SPIDER.vGain));
      if (d > 1) sp.th += angDiff(Math.atan2(dy, dx), sp.th) * (1 - Math.exp(-SPIDER.turn * dt));
    }
    sp.speed += (want - sp.speed) * (1 - Math.exp(-SPIDER.ease * dt));
    sp.vx = Math.cos(sp.th) * sp.speed;
    sp.vy = Math.sin(sp.th) * sp.speed;
    sp.x = clamp(sp.x + sp.vx * dt, SPIDER.edge, W - SPIDER.edge);
    sp.y = clamp(sp.y + sp.vy * dt, SPIDER.edge, H - SPIDER.edge);
  }
  function pounce() {
    if (intro.phase !== 'done' || sp.jump || fly.caught > 0 || (!ptr.has && !flyOK)) return;
    const J = SPIDER.jump, reach = J.reach * K;
    const tx = flyOK ? fly.x : ptr.x, ty = flyOK ? fly.y : ptr.y;
    const dx = tx - sp.x, dy = ty - sp.y, d = Math.hypot(dx, dy) || 1;
    let mx = tx - dx / d * reach - sp.x, my = ty - dy / d * reach - sp.y;
    const m = Math.hypot(mx, my);
    if (m > reach) { mx *= reach / m; my *= reach / m; }
    const dist = Math.min(m, reach);
    sp.jump = {
      t: 0, dur: clamp(dist / J.speed, J.min, J.max), fx: sp.x, fy: sp.y, tx: sp.x + mx, ty: sp.y + my,
      h: Math.max(J.hMin, Math.min(J.hK * dist, J.hMax)), th: Math.atan2(dy, dx), pounce: true,
    };
  }
  function hop() {
    sp.jump = { t: 0, dur: SPIDER.sleep.hop, fx: sp.x, fy: sp.y, tx: sp.x, ty: sp.y, h: SPIDER.sleep.hopH, th: sp.th, pounce: false };
    vibrate(sp.x, sp.y, SILK.landBuzz[0], SILK.landBuzz[1]);
  }
  function updateJump(dt) {
    const j = sp.jump;
    j.t = Math.min(1, j.t + dt / j.dur);
    const e = j.t < .5 ? 2 * j.t * j.t : 1 - Math.pow(-2 * j.t + 2, 2) / 2;
    const nx = lerp(j.fx, j.tx, e), ny = lerp(j.fy, j.ty, e);
    sp.vx = (nx - sp.x) / dt; sp.vy = (ny - sp.y) / dt;
    sp.x = nx; sp.y = ny;
    if (j.pounce) sp.th += angDiff(j.th, sp.th) * (1 - Math.exp(-SPIDER.jumpTurn * dt));
    sp.jh = j.h * Math.sin(Math.PI * j.t);
    if (j.t < 1) return;
    sp.jump = null; sp.jh = 0; sp.speed = 0; sp.vx = 0; sp.vy = 0;
    sp.lt = 1;
    vibrate(sp.x, sp.y, SILK.jumpBuzz[0], SILK.jumpBuzz[1]);
    spinNearby();
    if (!j.pounce || !flyOK || fly.alpha <= 0) return;
    cs = Math.cos(sp.th); sn = Math.sin(sp.th);
    const m = mouth();
    if (Math.hypot(fly.x - m.x, fly.y - m.y) < FLY.catchR * flySize) catchFly();
  }
  function updateFeet(dt) {
    const tuck = 1 - (1 - SPIDER.sleep.tuck) * smooth(sp.sleep);
    const attached = intro.phase !== 'done' || !!sp.jump;
    const speed = Math.hypot(sp.vx, sp.vy);
    const nearly = speed < SPIDER.nearlyStopped;
    const busy = [false, false];
    legs.forEach((l) => { if (l.stepping) busy[l.group] = true; });
    legs.forEach((l) => {
      const bx = l.hip[0] + (l.rest[0] - l.hip[0]) * tuck, by = l.hip[1] + (l.rest[1] - l.hip[1]) * tuck;
      const rx = wx(bx, by), ry = wy(bx, by);
      if (attached) { l.fx = rx; l.fy = ry; l.stepping = false; l.st = 1; return; }
      if (l.stepping) {
        l.st = Math.min(1, l.st + dt / l.dur);
        const e = 1 - Math.pow(1 - l.st, 3);
        l.fx = lerp(l.from[0], l.to[0], e); l.fy = lerp(l.from[1], l.to[1], e);
        if (l.st >= 1) { l.stepping = false; vibrate(l.fx, l.fy, SILK.footBuzz[0], SILK.footBuzz[1]); }
        return;
      }
      if (sp.sleep > 0 && nearly) {
        const k = 1 - Math.exp(-SPIDER.tuckRate * dt);
        l.fx += (rx - l.fx) * k; l.fy += (ry - l.fy) * k;
        return;
      }
      const tx = rx + sp.vx * SPIDER.lead, ty = ry + sp.vy * SPIDER.lead;
      const trig = SPIDER.stride * K * (l.front ? SPIDER.frontStride : 1) * (nearly ? SPIDER.stopStride : 1);
      const d = Math.hypot(l.fx - tx, l.fy - ty);
      const hx = wx(l.hip[0], l.hip[1]), hy = wy(l.hip[0], l.hip[1]);
      const ext = Math.hypot(l.fx - hx, l.fy - hy) > SPIDER.overext * (l.a + l.b) * kb;
      const behind = l.front && (l.fx - hx) * cs + (l.fy - hy) * sn < 0;
      if (!(d > trig || ext || behind)) return;
      if (busy[1 - l.group] && !ext && d <= SPIDER.groupBypass * trig) return;
      l.stepping = true; l.st = 0;
      l.from = [l.fx, l.fy]; l.to = [tx, ty];
      l.dur = clamp(SPIDER.stepBase - speed / SPIDER.stepSpeed, SPIDER.stepMin, SPIDER.stepMax);
      busy[l.group] = true;
    });
  }
  function updateSpider(dt) {
    const prev = sp.th;
    if (intro.phase !== 'done') updateIntro(dt);
    else if (sp.jump) updateJump(dt);
    else follow(dt);
    const av = angDiff(sp.th, prev) / dt;
    sp.z += (clamp(-av * SPIDER.sway, -SPIDER.swayMax, SPIDER.swayMax) - sp.z) * (1 - Math.exp(-SPIDER.swayEase * dt));
    sp.lt = Math.max(0, sp.lt - SPIDER.squash[1] * dt);
    cs = Math.cos(sp.th); sn = Math.sin(sp.th);
    kb = K * (1 - SPIDER.sleep.shrink * smooth(sp.sleep));
    updateFeet(dt);
  }
  function updateRest(dt) {
    const R = SPIDER.rest;
    const planted = legs.every((l) => !l.stepping);
    const rest = intro.phase === 'done' && !sp.jump && B - ptr.moved > R.still && sp.speed < R.speed && planted;
    sp.qt = clamp(sp.qt + (rest ? R.up : -R.down) * dt, 0, 1);
    sp.restT = rest ? sp.restT + dt : 0;
    if (sp.restT > SPIDER.sleep.after) sp.sleep = Math.min(1, sp.sleep + dt / SPIDER.sleep.ramp);
    else sp.sleep = Math.max(0, sp.sleep - SPIDER.wakeRate * dt);
    if (sp.qt > 0) {
      sp.faceT += dt;
      if (sp.faceT >= sp.blinkAt) {
        sp.blinkS = sp.faceT;
        sp.blinkN += 1;
        sp.blinkAt = sp.faceT + (sp.blinkN === 1 ? R.blink + R.blink2 : rand(R.blinkMin, R.blinkMax));
      }
    } else { sp.faceT = 0; sp.blinkN = 0; sp.blinkS = -1; sp.blinkAt = R.blinkAfter; }
    const [b0, b1] = SPIDER.breathe;
    sp.breath += dt * (b0 - b1 * smooth(sp.sleep));
  }

  /* ---------- fly ---------- */
  function catchFly() {
    fly.caught = rand(FLY.caughtMin, FLY.caughtMax);
    const C = FLY.cocoon;
    cocoon = {
      t: 0, x: fly.x, y: fly.y, alpha: 1, fading: false,
      strokes: Array.from({ length: C.strokes }, () => ({ rx: rand(.8, 1.05), ry: rand(.42, .7), rot: rand(0, Math.PI), a0: rand(0, TAU) })),
      fibres: Array.from({ length: C.fibres }, () => [rand(0, TAU), rand(.2, 1.15), rand(3, 9), rand(0, TAU)]),
    };
  }
  function updateFly(dt) {
    if (fly.caught > 0) {
      fly.caught -= dt;
      if (fly.caught <= 0) {
        const a = Math.random() * TAU;
        fly.x += Math.cos(a) * FLY.fling; fly.y += Math.sin(a) * FLY.fling;
        fly.recoil = 1;
        if (cocoon) cocoon.fading = true;
      }
    } else if (ptr.has) {
      const e = 1 - Math.exp(-(FLY.follow - FLY.recoil * fly.recoil) * dt);
      const ox = fly.x, oy = fly.y;
      fly.x += (ptr.x - fly.x) * e; fly.y += (ptr.y - fly.y) * e;
      const vx = (fly.x - ox) / dt, vy = (fly.y - oy) / dt;
      if (Math.hypot(vx, vy) > FLY.turnV) fly.ang += angDiff(Math.atan2(vy, vx) + Math.PI / 2, fly.ang) * (1 - Math.exp(-FLY.turnRate * dt));
    }
    fly.recoil = Math.max(0, fly.recoil - FLY.recoilDecay * dt);
    const still = B - ptr.moved > FLY.landAfter && fly.caught <= 0;
    fly.landed = clamp(fly.landed + (still ? FLY.landUp : -FLY.landDown) * dt, 0, 1);
    const show = flyOK && ((ptr.has && !ptr.over) || fly.caught > 0);
    fly.alpha = clamp(fly.alpha + (show ? 1 : -1) * FLY.fade * dt, 0, 1);
    if (cocoon) {
      cocoon.t += dt;
      if (cocoon.fading && (cocoon.alpha -= FLY.cocoonFade * dt) <= 0) cocoon = null;
    }
  }

  /* ---------- drawing ---------- */
  const ageAlpha = (r) => r.alpha * (1 - (1 - SILK.ageMin) * Math.min(1, (B - r.born) / SILK.ageFade));
  /* Strokes are batched across threads by style; alpha is quantised to 1/12 */
  const bins = new Map();
  const dews = [];
  const QA = 12, GLINT = 7, FILL = 6;
  function bin(layer, colour, width, alpha) {
    const aq = Math.round(alpha * QA);
    if (aq <= 0) return null;
    const key = `${layer}|${colour}|${Math.round(width * 100)}|${aq}`;
    let b = bins.get(key);
    if (!b) { b = { layer, colour, width, alpha: aq / QA, path: new Path2D() }; bins.set(key, b); }
    return b.path;
  }
  function collect(r) {
    const a = ageAlpha(r);
    if (a <= 0) return;
    const p = r.p, n = SILK.segs, th = r.thick;
    const halo = bin(0, '#fff', SILK.halo[1] * th, SILK.halo[0] * a);
    if (halo) {
      halo.moveTo(p[0], p[1]);
      for (let i = 1; i <= n; i++) halo.lineTo(p[i * 4], p[i * 4 + 1]);
    }
    for (let i = 0; i < n; i++) {
      const k = i * 4, w = th * (SILK.strand[0] - SILK.strand[1] * Math.sin(Math.PI * i / n));
      const strand = bin(1, SILK.colour, w, SILK.strand[2] * a);
      if (strand) { strand.moveTo(p[k], p[k + 1]); strand.lineTo(p[k + 4], p[k + 5]); }
      const P = .5 + .5 * Math.sin(2 * Math.atan2(p[k + 5] - p[k + 1], p[k + 4] - p[k]) + SILK.irid[4] * B + r.phase);
      const irid = bin(2, `hsl(${SILK.irid[0] + SILK.irid[1] * Math.round(P * 8) / 8},100%,74%)`, w, (SILK.irid[2] + SILK.irid[3] * P * P * P) * a);
      if (irid) { irid.moveTo(p[k], p[k + 1]); irid.lineTo(p[k + 4], p[k + 5]); }
    }
    const fib = bin(3, '#fff', SILK.fibre[3], SILK.fibre[2] * a);
    if (fib) {
      [[SILK.fibre[0], 0], [-SILK.fibre[1], 2.1]].forEach(([off, ph]) => {
        for (let i = 0; i <= n; i++) {
          const k = i * 4, ka = Math.max(0, i - 1) * 4, kz = Math.min(n, i + 1) * 4;
          const tx = p[kz] - p[ka], ty = p[kz + 1] - p[ka + 1], tl = Math.hypot(tx, ty) || 1;
          const o = off * th * (.6 + .4 * Math.sin(i * 1.7 + r.phase + ph + B));
          const x = p[k] - ty / tl * o, y = p[k + 1] + tx / tl * o;
          if (i) fib.lineTo(x, y); else fib.moveTo(x, y);
        }
      });
    }
    const hs = r.hairs, hair = hs && bin(4, '#fff', SILK.hair.width, SILK.hair.alpha * a);
    if (hair) {
      for (let j = 0; j < hs.length; j += 4) {
        at(p, hs[j]);
        const tl = Math.hypot(q.tx, q.ty) || 1, ux = q.tx / tl, uy = q.ty / tl;
        const c = Math.cos(hs[j + 3]), s = Math.sin(hs[j + 3]) * hs[j + 1], L = hs[j + 2];
        hair.moveTo(q.x, q.y);
        hair.lineTo(q.x + (ux * c - uy * s) * L, q.y + (uy * c + ux * s) * L);
      }
    }
    if (r.fluff) {
      r.fluff.forEach((f) => {
        at(p, f.u);
        const path = f.dust ? bin(FILL, SILK.fluff.dustColour, 0, .7 * a) : bin(5, SILK.fluff.fibreColour, .4, a);
        if (!path) return;
        f.bits.forEach(([dx, dy, ang, len]) => {
          if (f.dust) { path.moveTo(q.x + dx + .7, q.y + dy); path.arc(q.x + dx, q.y + dy, .7, 0, TAU); return; }
          const x = q.x + dx * .4, y = q.y + dy * .4;
          path.moveTo(x, y);
          path.quadraticCurveTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len, x + Math.cos(ang + 1.3) * len * .8, y + Math.sin(ang + 1.3) * len * .8);
        });
      });
    }
    r.dew.forEach((d) => { at(p, d.u); dews.push(q.x, q.y, d.r, a); });
    const glint = bin(GLINT, '#fff', th, .8 * a);
    if (glint) {
      const u0 = (B * SILK.glint + r.phase / TAU) % 1;
      at(p, u0); glint.moveTo(q.x, q.y);
      at(p, Math.min(1, u0 + SILK.glintLen)); glint.lineTo(q.x, q.y);
    }
  }
  function flushBins(below) {
    ctx.lineCap = 'round';
    [...bins.values()].filter((b) => (below ? b.layer < GLINT : b.layer >= GLINT)).sort((a, b) => a.layer - b.layer).forEach((b) => {
      ctx.globalAlpha = b.alpha;
      if (b.layer === FILL) { ctx.fillStyle = b.colour; ctx.fill(b.path); } else { ctx.strokeStyle = b.colour; ctx.lineWidth = b.width; ctx.stroke(b.path); }
    });
  }
  function drawThreads() {
    threads.forEach(collect);
    if (live) collect(live);
    flushBins(true);
    for (let j = 0; j < dews.length; j += 4) {
      const r = dews[j + 2];
      ctx.globalAlpha = dews[j + 3];
      ctx.drawImage(art.bead, dews[j] - r, dews[j + 1] - r, r * 2, r * 2);
    }
    flushBins(false);
    bins.clear();
    dews.length = 0;
  }
  function drawAnchors() {
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = .35;
    ctx.globalAlpha = .5;
    ctx.beginPath();
    anchors.forEach((an) => {
      for (let j = 0; j < an.tufts.length; j += 2) {
        ctx.moveTo(an.x, an.y);
        ctx.lineTo(an.x + Math.cos(an.tufts[j]) * an.tufts[j + 1], an.y + Math.sin(an.tufts[j]) * an.tufts[j + 1]);
      }
    });
    ctx.stroke();
    ctx.globalAlpha = .85;
    anchors.forEach((an) => { ctx.beginPath(); ctx.arc(an.x, an.y, SILK.bead / 2, 0, TAU); ctx.fill(); });
  }
  function drawShadows() {
    const S = SILK.shadow, off = W + 100, k = SILK.shadowRes;
    const g = shctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, sh.width, sh.height);
    g.setTransform(k, 0, 0, k, -off * k, 0);
    g.shadowColor = S.colour;
    g.shadowBlur = S.blur * k;
    g.shadowOffsetX = (off + S.x) * k;
    g.shadowOffsetY = S.y * k;
    g.strokeStyle = '#000';
    g.fillStyle = '#000';
    g.lineCap = 'round';
    const lines = new Map(), dots = new Map();
    const pathFor = (m, key) => { let path = m.get(key); if (!path) m.set(key, (path = new Path2D())); return path; };
    const each = (r) => {
      const aq = Math.round(Math.max(0, ageAlpha(r)) * QA);
      if (!aq) return;
      const line = pathFor(lines, `${r.thick}|${aq}`), p = r.p;
      line.moveTo(p[0], p[1]);
      for (let i = 1; i <= SILK.segs; i++) line.lineTo(p[i * 4], p[i * 4 + 1]);
      if (!r.dew.length) return;
      const dot = pathFor(dots, aq);
      r.dew.forEach((d) => { at(p, d.u); dot.moveTo(q.x + d.r, q.y); dot.arc(q.x, q.y, d.r, 0, TAU); });
    };
    threads.forEach(each);
    if (live) each(live);
    lines.forEach((path, key) => { const [th, aq] = key.split('|'); g.globalAlpha = aq / QA; g.lineWidth = +th; g.stroke(path); });
    dots.forEach((path, aq) => { g.globalAlpha = aq / QA; g.fill(path); });
    g.globalAlpha = 1;
    const fallen = new Path2D();
    falling.forEach((f) => { fallen.moveTo(f.x + f.r, f.y); fallen.arc(f.x, f.y, f.r, 0, TAU); });
    g.fill(fallen);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.shadowColor = 'transparent';
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(mask, 0, 0, sh.width, sh.height);
    g.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(sh, 0, 0, W, H);
  }
  function drawDrops() {
    ctx.globalAlpha = .25;
    ctx.fillStyle = 'rgb(8,14,70)';
    splats.forEach((s) => { ctx.beginPath(); ctx.ellipse(s.x + 1.2, s.y + 2, s.r * 1.3, s.r * .8, 0, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    splats.forEach((s) => ctx.drawImage(art.bead, s.x - s.r * 1.25, s.y - s.r * .8, s.r * 2.5, s.r * 1.6));
    falling.forEach((f) => ctx.drawImage(art.bead, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2));
  }
  function bone(g, st, s0, s1, px, py, qx, qy) {
    const dx = qx - px, dy = qy - py, len = Math.hypot(dx, dy);
    if (len < .5) return;
    const sw = s1 - s0, ov = sw * RIG.overlap;
    const a0 = Math.max(0, s0 - ov), a1 = Math.min(st.lw, s1 + ov), k = len / sw, wpx = RIG.legWidth * kb;
    g.save();
    g.translate(px, py);
    g.rotate(Math.atan2(dy, dx));
    g.drawImage(st.c, a0, 0, a1 - a0, st.ww, (a0 - s0) * k, -wpx / 2, (a1 - a0) * k, wpx);
    g.restore();
  }
  function drawLeg(g, l) {
    const hx = (cs * l.hip[0] - sn * l.hip[1]) * kb, hy = (sn * l.hip[0] + cs * l.hip[1]) * kb;
    let fx = l.fx - sp.x, fy = l.fy - sp.y;
    const s = l.stepping ? Math.sin(Math.PI * l.st) : 0;
    if (s) { const d = Math.hypot(fx, fy) || 1; fx += fx / d * s * SPIDER.footLift * K; fy += fy / d * s * SPIDER.footLift * K; }
    const a = l.a * kb, b = l.b * kb;
    const dx = fx - hx, dy = fy - hy;
    const dc = clamp(Math.hypot(dx, dy), Math.abs(a - b) + .01, a + b - .01);
    const base = Math.atan2(dy, dx), A = Math.acos(clamp((a * a + dc * dc - b * b) / (2 * a * dc), -1, 1));
    const sx = -sn * l.side, sy = cs * l.side;
    const k1x = hx + Math.cos(base + A) * a, k1y = hy + Math.sin(base + A) * a;
    const k2x = hx + Math.cos(base - A) * a, k2y = hy + Math.sin(base - A) * a;
    let kx = k1x, ky = k1y;
    if (k2x * sx + k2y * sy > k1x * sx + k1y * sy) { kx = k2x; ky = k2y; }
    if (s) {
      const d = Math.hypot(kx, ky) || 1, lift = (l.front ? SPIDER.kneeLiftFront : SPIDER.kneeLift) * K * s;
      kx += kx / d * lift; ky += ky / d * lift;
    }
    const split = l.strip.split * l.strip.lw;
    bone(g, l.strip, 0, split, hx, hy, kx, ky);
    bone(g, l.strip, split, l.strip.lw, kx, ky, fx, fy);
  }
  const imageSpace = (g) => { g.rotate(-Math.PI / 2); g.translate(-RIG.pivot[0], -RIG.pivot[1]); };
  function lids(g, amt) {
    if (amt < .01 || !art.skin) return;
    RIG.eyes.forEach(([x, y, r], i) => {
      g.save();
      g.beginPath(); g.arc(x, y, r + .4, 0, TAU); g.clip();
      const top = y - r - 1, edge = top + (2 * r + 2) * amt, bow = r * .45 * (1 - amt * .6);
      g.beginPath();
      g.moveTo(x - r - 1, top); g.lineTo(x + r + 1, top); g.lineTo(x + r + 1, edge - bow);
      g.quadraticCurveTo(x, edge + bow, x - r - 1, edge - bow);
      g.closePath();
      g.fillStyle = art.skin[i];
      g.fill();
      g.beginPath();
      g.moveTo(x + r + 1, edge - bow); g.quadraticCurveTo(x, edge + bow, x - r - 1, edge - bow);
      g.strokeStyle = RIG.lidLine;
      g.lineWidth = Math.max(.8, r * .16);
      g.stroke();
      g.restore();
    });
  }
  function lidAmount() {
    let b = 0;
    if (sp.blinkS >= 0) {
      const e = sp.faceT - sp.blinkS;
      if (e < SPIDER.rest.blink) b = Math.sin(Math.PI * e / SPIDER.rest.blink);
    }
    return Math.max(b, smooth(clamp(sp.sleep * 1.6, 0, 1)));
  }
  function drawSpider() {
    const g = sctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, so.width, so.height);
    g.setTransform(dpr, 0, 0, dpr, R0 * dpr, R0 * dpr);
    for (let i = 3; i >= 0; i--) legs.forEach((l) => { if (l.i === i) drawLeg(g, l); });
    g.save();
    g.rotate(sp.th);
    g.scale(kb, kb);
    const wX = RIG.waist[1] - RIG.pivot[1];
    const br = 1 + Math.sin(sp.breath) * (SPIDER.breathe[2] + SPIDER.breathe[3] * sp.sleep);
    const y = 1 - SPIDER.squash[0] * sp.lt;
    g.save();
    g.translate(wX, 0); g.rotate(sp.z); g.scale(br * (2 - y), br * y); g.translate(-wX, 0);
    imageSpace(g);
    g.drawImage(art.abd, 0, 0, RIG.base, RIG.base);
    g.restore();
    const qe = smooth(sp.qt);
    g.save();
    imageSpace(g);
    g.globalAlpha = 1 - (1 - SPIDER.rest.fade) * qe;
    g.drawImage(art.head, 0, 0, RIG.base, RIG.base);
    if (qe > .001 && art.idle) {
      const I = RIG.idle, sc = I.scale * (.9 + .1 * qe);
      g.globalAlpha = qe;
      g.translate(I.to[0], I.to[1]); g.scale(sc, sc); g.translate(-I.from[0], -I.from[1]);
      g.drawImage(art.idle, 0, 0, I.size, I.size);
      lids(g, lidAmount());
    }
    g.restore();
    g.restore();
    const jh = sp.jh, Sd = SPIDER.shadow;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowColor = `rgba(0,0,0,${Sd[0] - Math.min(Sd[1], jh / Sd[2])})`;
    ctx.shadowBlur = (Sd[3] + Sd[4] * jh) * dpr;
    ctx.shadowOffsetX = (Sd[5] + Sd[6] * jh) * dpr;
    ctx.shadowOffsetY = (Sd[7] + Sd[8] * jh) * dpr;
    const sc = 1 + jh / SPIDER.liftScale;
    ctx.translate(sp.x, sp.y);
    ctx.scale(sc, sc);
    ctx.drawImage(so, -R0, -R0, R0 * 2, R0 * 2);
    ctx.restore();
  }
  function zed(x, y, sz, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `700 ${sz}px system-ui`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = `rgba(0,0,0,${SPIDER.zed.shade})`;
    ctx.shadowBlur = SPIDER.zedBlur * dpr;
    ctx.fillText('z', x, y);
    ctx.restore();
  }
  function drawZeds() {
    if (sp.sleep <= 0) return;
    const Z = SPIDER.zed, a = smooth(sp.sleep);
    const zx = wx(RIG.zPoint[0], RIG.zPoint[1]), zy = wy(RIG.zPoint[0], RIG.zPoint[1]);
    for (let i = 0; i < 3; i++) {
      const c = (B / SPIDER.zedPeriod + i / 3) % 1, al = Math.sin(Math.PI * c) * a;
      zed(zx + c * SPIDER.zedDrift, zy - c * Z.rise, (Z.size[0] + Z.size[1] * c) * tScale, al);
      if (fly.landed > .9 && fly.alpha > 0) zed(fly.x + 8 + c * SPIDER.zedDrift * .5, fly.y - 8 - c * Z.rise * .5, (Z.size[0] + Z.size[1] * c) * tScale * .5, al * fly.alpha);
    }
  }
  function wing(g, img, hx, hy, ang, qq) {
    g.save();
    g.translate(hx, hy); g.rotate(ang); g.scale(1, 1 - FLY.squash * qq); g.translate(-hx, -hy);
    g.drawImage(img, 0, 0, FLY.w, FLY.h);
    g.restore();
  }
  function drawFly() {
    if (!flyOK || fly.alpha <= 0) return;
    const g = fctx, caught = fly.caught > 0, hov = 1 - fly.landed;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, fo.width, fo.height);
    g.setTransform(dpr, 0, 0, dpr, FR * dpr, FR * dpr);
    const s = FLY.px * flySize / FLY.w;
    g.rotate(fly.ang); g.scale(s, s); g.translate(-FLY.w / 2, -FLY.h / 2);
    g.drawImage(art.fly.body, 0, 0, FLY.w, FLY.h);
    const flap = caught ? 1 : hov, hz = caught ? FLY.hzCaught : FLY.hz, hxL = FLY.hinge[0], hxR = FLY.w - FLY.hinge[0], hy = FLY.hinge[1];
    if (flap > .01) {
      for (let i = 0; i < FLY.ghosts; i++) {
        const qq = .5 + .5 * Math.sin(TAU * hz * B + i * TAU / FLY.ghosts);
        g.globalAlpha = FLY.ghostAlpha * flap;
        wing(g, art.fly.wl, hxL, hy, FLY.flap * qq, qq);
        wing(g, art.fly.wr, hxR, hy, -FLY.flap * qq, qq);
      }
    }
    if (flap < .99) {
      g.globalAlpha = 1 - flap;
      wing(g, art.fly.wl, hxL, hy, 0, 0);
      wing(g, art.fly.wr, hxR, hy, 0, 0);
    }
    let jx = 0, jy = 0;
    if (caught) {
      jx = Math.sin(TAU * FLY.tremble[0] * B) * FLY.trembleAmp;
      jy = Math.sin(TAU * FLY.tremble[1] * B) * FLY.trembleAmp;
    } else {
      jx = (Math.sin(23.1 * B) + .6 * Math.sin(37.7 * B + 1.3)) * 2.2 * hov;
      jy = (Math.sin(29.3 * B + .7) + .6 * Math.sin(41.9 * B)) * 2.2 * hov;
    }
    ctx.save();
    ctx.globalAlpha = fly.alpha;
    ctx.shadowColor = `rgba(0,0,0,${.2 + .18 * fly.landed})`;
    ctx.shadowBlur = (3 + 9 * hov) * dpr;
    ctx.shadowOffsetX = (3 + 14 * hov) * dpr;
    ctx.shadowOffsetY = (5 + 26 * hov + Math.sin(6 * B) * 1.2 * hov) * dpr;
    ctx.drawImage(fo, fly.x + jx - FR, fly.y + jy - FR, FR * 2, FR * 2);
    ctx.restore();
  }
  function drawCocoon() {
    if (!cocoon) return;
    const c = cocoon, R = FLY.cocoon.r * flySize;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.lineCap = 'round';
    ctx.strokeStyle = SILK.colour;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = c.alpha;
    c.strokes.forEach((s, i) => {
      const pr = clamp((c.t - i * FLY.strokeDelay) / FLY.strokeDraw, 0, 1);
      if (pr <= 0) return;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * s.rx, R * s.ry, s.rot, s.a0, s.a0 + pr * TAU);
      ctx.stroke();
    });
    ctx.globalAlpha = c.alpha * .55 * clamp((c.t - .3) / 1, 0, 1);
    ctx.lineWidth = .5;
    ctx.beginPath();
    c.fibres.forEach(([a, r, len, rot]) => {
      const x = Math.cos(a) * r * R, y = Math.sin(a) * r * R * .65;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(rot) * len, y + Math.sin(rot) * len);
    });
    ctx.stroke();
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawShadows();
    drawThreads();
    drawAnchors();
    drawDrops();
    drawSpider();
    drawZeds();
    drawFly();
    drawCocoon();
    ctx.globalAlpha = 1;
  }

  /* ---------- loop and input ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.033, Math.max(0, (now - last) / 1000));
    last = now;
    if (!W || !dt) return;
    B += dt;
    updateFly(dt);
    updateNudges(dt);
    updateSpider(dt);
    updateRest(dt);
    updateSilk(dt);
    draw();
  }
  const isControl = (t) => !!(t && t.closest && t.closest('button, a, input, dialog, [data-no-spider]'));
  function onMove(e) {
    const x = e.clientX, y = e.clientY;
    if (!ptr.has || Math.hypot(x - ptr.x, y - ptr.y) > .5) ptr.moved = B;
    ptr.x = x; ptr.y = y; ptr.has = true;
    ptr.over = isControl(e.target);
    if (!fly.seen) { fly.x = x; fly.y = y; fly.seen = true; }
    if (sp.sleep > SPIDER.sleep.wake && !sp.jump && intro.phase === 'done') hop();
    if (holdT && Math.hypot(x - holdX, y - holdY) > SILK.holdSlop) { clearTimeout(holdT); holdT = 0; }
  }
  function onDown(e) {
    onMove(e);
    if (e.pointerType === 'mouse' || ptr.over) return;
    holdX = e.clientX; holdY = e.clientY;
    clearTimeout(holdT);
    holdT = setTimeout(() => {
      holdT = 0;
      clearWeb();
      if (navigator.vibrate) navigator.vibrate(SILK.holdBuzz);
    }, SILK.hold);
    const now = performance.now();
    if (now - lastTap < SILK.tapGap && Math.hypot(holdX - tapX, holdY - tapY) < SILK.tapNear) {
      lastTap = 0;
      fly.x = holdX; fly.y = holdY;
      pounce();
    } else { lastTap = now; tapX = holdX; tapY = holdY; }
  }
  function onUp() { clearTimeout(holdT); holdT = 0; }
  function onClick(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (isControl(e.target)) return;
    pounce();
  }
  function onKey(e) {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    e.preventDefault();
    clearWeb();
  }
  function onOut(e) { if (!e.relatedTarget) ptr.has = false; }
  function onResize() { if (size()) sampleAnchors(true); }

  return {
    el: root,
    start({ first }) {
      ac = new AbortController();
      const o = { signal: ac.signal };
      window.addEventListener('pointermove', onMove, o);
      window.addEventListener('pointerdown', onDown, o);
      window.addEventListener('pointerup', onUp, o);
      window.addEventListener('pointercancel', onUp, o);
      window.addEventListener('click', onClick, o);
      window.addEventListener('keydown', onKey, o);
      document.addEventListener('mouseout', onOut, o);
      W = 0;
      size();
      ro = new ResizeObserver(onResize);
      ro.observe(canvas);
      resetSpider(first);
      sampleAnchors(true);
      timers.push(setTimeout(() => sampleAnchors(true), ANCHOR.resampleMs));
      document.fonts.ready.then(() => sampleAnchors(true));
      if (document.readyState !== 'complete') window.addEventListener('load', () => sampleAnchors(true), o);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    leave() { clearWeb(); },
    stop() {
      cancelAnimationFrame(raf); raf = 0;
      if (ac) ac.abort();
      ac = null;
      if (ro) ro.disconnect();
      timers.forEach(clearTimeout); timers.length = 0;
      clearTimeout(holdT); holdT = 0;
      ptr.has = false; fly.alpha = 0; fly.caught = 0; cocoon = null;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    resize() { onResize(); },
  };
}
