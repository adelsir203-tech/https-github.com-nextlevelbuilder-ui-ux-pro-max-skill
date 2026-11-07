// Browser-side studio: the houses, the banya, the gazebo and the fog-house hero,
// built as 3D models with three.js and rendered. Loaded by make-assets.mjs.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1;
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* ---------------- helpers ---------------- */
const std = (color, roughness = .8, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(r, h, mat, y = 0, seg = 64, rb = r) {
  const m = mesh(new THREE.CylinderGeometry(r, rb, h, seg), mat);
  m.position.y = y + h / 2;
  return m;
}
function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* Renders an object fitted to view: { w, h, elev, azim, fov } */
function render(object, view) {
  const scene = new THREE.Scene();
  scene.environment = ENV;
  scene.environmentIntensity = view.env ?? .75;
  scene.add(object);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(V3()), center = box.getCenter(V3());
  const camera = new THREE.PerspectiveCamera(view.fov ?? 22, view.w / view.h, .1, 5000);
  const e = THREE.MathUtils.degToRad(view.elev ?? 8), a = THREE.MathUtils.degToRad(view.azim ?? 0);
  const dist = size.length() / 2 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.02;
  camera.position.set(center.x + Math.sin(a) * Math.cos(e) * dist, center.y + Math.sin(e) * dist, center.z + Math.cos(a) * Math.cos(e) * dist);
  camera.lookAt(center);
  const ext = Math.max(size.x, size.y, size.z) || 1;
  const key = new THREE.DirectionalLight(0xfff8f0, view.key ?? 2.4);
  const kd = V3(-1.1, 1.5, 1.2);
  key.position.copy(center).addScaledVector(kd.normalize(), ext * 3);
  key.target.position.copy(center);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = ext * .002;
  const sc = key.shadow.camera;
  sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = .1; sc.far = ext * 8;
  const rim = new THREE.DirectionalLight(0xe4ecff, view.rim ?? .7);
  rim.position.copy(center).addScaledVector(V3(1.2, .8, -1.4).normalize(), ext * 3);
  scene.add(key, key.target, rim, new THREE.HemisphereLight(0xffffff, 0x8a8680, .35));
  renderer.setSize(view.w, view.h, false);
  renderer.render(scene, camera);
  const out = canvas(view.w, view.h, (g) => g.drawImage(renderer.domElement, 0, 0));
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  return out;
}
function trim(c) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const down = (src, w, h) => {
  let c = src;
  while (c.width / 2 > w) c = canvas(Math.round(c.width / 2), Math.round(c.height / 2), (g) => { g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, Math.round(c.width / 2), Math.round(c.height / 2)); });
  return canvas(w, h, (g) => { g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, w, h); });
};

/* ---------------- textures (1 UV unit = 1 metre) ---------------- */
function meterUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = x; uv[i * 2 + 1] = z; } else if (nx >= nz) { uv[i * 2] = z; uv[i * 2 + 1] = y; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
function repeatTex(c, tile) {
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  return t;
}
function shade(hex, k) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return `#${c.getHexString()}`;
}
function boardsTex(base, seam, boards, tile, horizontal, seed) {
  const R = rng(seed);
  return repeatTex(canvas(512, 512, (g, W) => {
    const bw = W / boards;
    for (let i = 0; i < boards; i++) {
      g.fillStyle = shade(base, (R() - .5) * .05);
      if (horizontal) g.fillRect(0, i * bw, W, bw); else g.fillRect(i * bw, 0, bw, W);
      g.fillStyle = 'rgba(255,255,255,.035)';
      for (let k = 0; k < 40; k++) { const o = R() * bw; if (horizontal) g.fillRect(0, i * bw + o, W, 1); else g.fillRect(i * bw + o, 0, 1, W); }
      g.fillStyle = seam;
      if (horizontal) g.fillRect(0, i * bw, W, 3); else g.fillRect(i * bw, 0, 3, W);
    }
  }), tile);
}
function seamTex(base, seam, seams, tile) {
  return repeatTex(canvas(512, 512, (g, W) => {
    g.fillStyle = base; g.fillRect(0, 0, W, W);
    for (let i = 0; i < seams; i++) {
      const x = i * W / seams;
      g.fillStyle = seam; g.fillRect(x, 0, 5, W);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 5, 0, 3, W);
    }
  }), tile);
}
function logsTex(base, logs, tile) {
  return repeatTex(canvas(512, 512, (g, W) => {
    const lh = W / logs;
    for (let i = 0; i < logs; i++) {
      const gr = g.createLinearGradient(0, i * lh, 0, (i + 1) * lh);
      gr.addColorStop(0, shade(base, -.16)); gr.addColorStop(.3, shade(base, .05)); gr.addColorStop(.75, base); gr.addColorStop(1, shade(base, -.22));
      g.fillStyle = gr; g.fillRect(0, i * lh, W, lh);
    }
  }), tile);
}
function noiseTex(base, amp, tile, seed, blades) {
  const R = rng(seed);
  return repeatTex(canvas(512, 512, (g, W) => {
    g.fillStyle = base; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = shade(base, (R() - .5) * amp);
      const x = R() * W, y = R() * W;
      if (blades) { g.save(); g.translate(x, y); g.rotate((R() - .5) * .8); g.fillRect(0, 0, 1.6, 6 + R() * 8); g.restore(); } else g.fillRect(x, y, 2, 2);
    }
  }), tile);
}
function panelTex(base, seam, tile) {
  return repeatTex(canvas(512, 512, (g, W) => {
    g.fillStyle = base; g.fillRect(0, 0, W, W);
    g.fillStyle = seam; g.fillRect(0, 0, W, 4); g.fillRect(0, W / 2, W, 4); g.fillRect(0, 0, 4, W);
  }), tile);
}

/* ---------------- materials ---------------- */
const TX = {
  charcoal: boardsTex('#34373a', '#1c1e20', 8, 1.2, false, 1),
  wood: boardsTex('#9a6a43', '#5c3d24', 8, 1.2, false, 2),
  woodLight: boardsTex('#c8a274', '#8d6a46', 7, 1.2, false, 3),
  deck: boardsTex('#8b6345', '#4f3622', 7, 1, true, 4),
  seam: seamTex('#2b2d30', '#3c3f43', 2, 1),
  shingle: noiseTex('#2a2b2d', .1, 1, 5),
  logs: logsTex('#ad7f50', 5, 1),
  plaster: noiseTex('#ebe7df', .03, 1, 6),
  fiber: panelTex('#5a5d61', '#3b3d40', 2.4),
  stone: noiseTex('#8f8c86', .18, 1, 7),
  grass: noiseTex('#6a7546', .16, 2, 8, true),
  gravel: noiseTex('#b5ab99', .25, 1, 9),
};
const H = {
  charcoal: std(0xffffff, .84, 0, { map: TX.charcoal }),
  wood: std(0xffffff, .8, 0, { map: TX.wood }),
  woodLight: std(0xffffff, .8, 0, { map: TX.woodLight }),
  deck: std(0xffffff, .85, 0, { map: TX.deck }),
  roof: std(0xffffff, .42, .55, { map: TX.seam }),
  shingle: std(0xffffff, .9, 0, { map: TX.shingle }),
  logs: std(0xffffff, .82, 0, { map: TX.logs }),
  plaster: std(0xffffff, .92, 0, { map: TX.plaster }),
  fiber: std(0xffffff, .7, .1, { map: TX.fiber }),
  stone: std(0xffffff, .95, 0, { map: TX.stone }),
  frame: std(0x18191b, .45, .5),
  white: std(0xf2efe8, .6, 0),
  metal: std(0x2c2e31, .4, .7),
  glass: phys({ color: 0x1a2129, roughness: .04, metalness: .15, clearcoat: 1, envMapIntensity: 1.9 }),
  lit: std(0x2a2119, .3, 0, { emissive: 0xffb062, emissiveIntensity: 1.7 }),
};
let GLASS = H.glass;

/* ---------------- house builders (metres, y up, front = +z) ---------------- */
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = mesh(meterUV(new THREE.BoxGeometry(w, h, d)), mat);
  m.position.set(x, y + h / 2, z);
  return m;
}
function prism(w, d, hw, hr, mat) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hw); s.lineTo(0, hr); s.lineTo(-w / 2, hw); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return mesh(meterUV(geo), mat);
}
function gableRoof(g, w, d, hw, hr, over, thick, mat, y0 = 0) {
  const run = w / 2, rise = hr - hw, ang = Math.atan2(rise, run), L = Math.hypot(run, rise) + over;
  [-1, 1].forEach((sgn) => {
    const slab = mesh(meterUV(new THREE.BoxGeometry(L, thick, d + over * 2)), mat);
    const dx = sgn * Math.cos(ang) * L / 2, dy = -Math.sin(ang) * L / 2;
    slab.position.set(dx + sgn * Math.sin(ang) * thick / 2, y0 + hr + dy + Math.cos(ang) * thick / 2, 0);
    slab.rotation.z = -sgn * ang;
    g.add(slab);
  });
  const ridge = mesh(new THREE.BoxGeometry(.22, .12, d + over * 2), H.metal);
  ridge.position.set(0, y0 + hr + thick * .9, 0);
  g.add(ridge);
}
/* A glazed opening on a wall: outline points in wall space, mullions as [x0,y0,x1,y1] */
function glazing(pts, mullions, frameMat = H.frame) {
  const g = new THREE.Group();
  const s = new THREE.Shape(pts.map(([x, y]) => V2(x, y)));
  g.add(mesh(new THREE.ShapeGeometry(s), GLASS));
  const bar = (x0, y0, x1, y1, t = .07) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const b = mesh(new THREE.BoxGeometry(len + t, t, .09), frameMat);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, .03);
    b.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    g.add(b);
  };
  pts.forEach(([x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; bar(x, y, x2, y2, .09); });
  mullions.forEach((m) => bar(...m));
  return g;
}
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function place(o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; return o; }

function barn124() {
  const g = new THREE.Group(), W = 7.6, D = 14, hw = 3, hr = 7.1, base = .35;
  g.add(box(W + .2, base, D + .2, H.stone));
  const body = prism(W, D, hw, hr, H.charcoal); body.position.y = base; g.add(body);
  gableRoof(g, W, D, hw, hr, .22, .16, H.roof, base);
  g.add(place(glazing([[-3.1, .25], [3.1, .25], [3.1, 2.75], [0, 6.1], [-3.1, 2.75]], [[-1.05, .25, -1.05, 4.9], [1.05, .25, 1.05, 4.9], [-3.1, 2.75, 3.1, 2.75]]), 0, base, D / 2 + .02));
  g.add(box(.12, 2.9, 3.6, H.wood, W / 2 + .06, base, D / 2 - 2.2));
  g.add(place(glazing(rect(-1.4, .2, 2.8, 2.4), [[0, .2, 0, 2.6]]), W / 2 + .02, base, -2.6, Math.PI / 2));
  g.add(place(glazing(rect(-.6, .2, 1.2, 2.4), []), W / 2 + .02, base, -6, Math.PI / 2));
  g.add(place(glazing(rect(-1.6, .9, 3.2, 1.4), [[0, .9, 0, 2.3]]), -W / 2 - .02, base, 1, -Math.PI / 2));
  g.add(box(W + .6, .16, 3.2, H.deck, 0, .12, D / 2 + 1.6));
  g.add(box(2, .16, .5, H.deck, 0, 0, D / 2 + 3.3));
  return g;
}
function nord96() {
  const g = new THREE.Group(), W = 9, D = 10.5, hw = 2.9, hr = 5.1, base = .4;
  g.add(box(W + .2, base, D + .2, H.stone));
  const body = prism(W, D, hw, hr, H.woodLight); body.position.y = base; g.add(body);
  gableRoof(g, W, D, hw, hr, .55, .18, H.roof, base);
  [-3.2, -1.2, 2.2].forEach((z) => g.add(place(glazing(rect(-.6, .9, 1.2, 1.4), [[0, .9, 0, 2.3]], H.white), W / 2 + .02, base, z, Math.PI / 2)));
  g.add(place(glazing(rect(-.5, 0, 1, 2.2), [], H.white), W / 2 + .02, base, .4, Math.PI / 2));
  g.add(place(glazing(rect(-1.2, .9, 2.4, 1.5), [[0, .9, 0, 2.4]], H.white), 0, base, D / 2 + .02));
  g.add(place(glazing([[-.6, 3.2], [.6, 3.2], [0, 4.1]], [], H.white), 0, base, D / 2 + .02));
  g.add(box(.7, 2.2, .7, H.plaster, -1.8, base + 3.6, -1.5));
  g.add(box(2.2, .14, 1.6, H.deck, W / 2 + .9, .2, .4));
  const canopy = box(2, .12, 1.4, H.roof, W / 2 + .7, base + 2.5, .4); canopy.rotation.z = -.12; g.add(canopy);
  g.rotation.y = -Math.PI / 2;
  const w = new THREE.Group(); w.add(g); return w;
}
function sosny148() {
  const g = new THREE.Group();
  g.add(box(11, .3, 8.4, H.stone));
  g.add(box(10.6, 3, 8, H.plaster, 0, .3, 0));
  g.add(box(8.4, 3, 7.2, H.wood, 1.7, 3.3, -.4));
  g.add(box(11, .22, 8.4, H.frame, 0, 3.3, 0));
  g.add(box(8.8, .24, 7.6, H.frame, 1.7, 6.3, -.4));
  g.add(place(glazing(rect(-3.6, .1, 7.2, 2.5), [[-1.2, .1, -1.2, 2.6], [1.2, .1, 1.2, 2.6]]), -.8, .3, 4.02));
  g.add(place(glazing(rect(-2.4, .3, 4.8, 2.2), [[0, .3, 0, 2.5]]), 2.9, 3.3, 3.22));
  g.add(place(glazing(rect(-1.4, .6, 2.8, 1.6), []), 5.32, .3, -1.2, Math.PI / 2));
  g.add(place(glazing(rect(-1.2, .6, 2.4, 1.6), []), 5.92, 3.3, -1.6, Math.PI / 2));
  g.add(box(3.4, .1, 1.4, H.frame, 2.9, 3.3, 3.95));
  const rail = mesh(new THREE.BoxGeometry(3.4, 1, .04), phys({ color: 0x9fb1bd, roughness: .05, transparent: true, opacity: .35 }));
  rail.position.set(2.9, 3.9, 4.6); g.add(rail);
  g.add(box(4, .14, 2.4, H.deck, -2.6, .12, 5.2));
  return g;
}
function shalash82() {
  const g = new THREE.Group(), W = 8.4, D = 9, hr = 7.6, base = .3;
  g.add(box(W - 1, base, D + .2, H.stone));
  const body = prism(W - .4, D, .01, hr - .2, H.wood); body.position.y = base; g.add(body);
  gableRoof(g, W, D, 0, hr, .5, .2, H.shingle, base - .2);
  g.add(place(glazing([[-2.9, .25], [2.9, .25], [0, 5.6]], [[0, .25, 0, 5.6], [-2.1, 1.7, 2.1, 1.7], [-1.2, 3.4, 1.2, 3.4]], H.wood), 0, base, D / 2 + .02));
  g.add(box(6.4, .16, 2.6, H.deck, 0, .14, D / 2 + 1.3));
  return g;
}
function kub110() {
  const g = new THREE.Group();
  g.add(box(11.4, .3, 9.2, H.stone));
  g.add(box(11, 3.4, 9, H.fiber, 0, .3, 0));
  g.add(box(11.5, .28, 9.5, H.frame, 0, 3.7, 0));
  g.add(place(glazing(rect(-3.8, 1, 7.6, 1.5), [[-1.3, 1, -1.3, 2.5], [1.3, 1, 1.3, 2.5]]), -1.2, .3, 4.52));
  g.add(place(glazing(rect(-.55, .05, 1.1, 2.4), []), 3.6, .3, 4.52));
  for (let i = 0; i < 12; i++) g.add(box(.06, 3.2, .12, H.wood, 4.5 + i * .09, .4, 4.62));
  g.add(place(glazing(rect(-2.4, .3, 4.8, 2.6), [[0, .3, 0, 2.9]]), 5.52, .3, -.5, Math.PI / 2));
  g.add(box(5, .14, 2.2, H.deck, -3, .12, 5.6));
  return g;
}
function tihiy176() {
  const g = new THREE.Group(), W = 8, D = 18, hw = 3, hr = 4.3, base = .3;
  const inner = new THREE.Group();
  inner.add(box(W + .2, base, D + .2, H.stone));
  inner.add(box(W, .8, D, H.stone, 0, base, 0));
  const body = prism(W, D, hw, hr, H.wood); body.position.y = base; inner.add(body);
  gableRoof(inner, W, D, hw, hr, 1.1, .18, H.roof, base);
  [-6, -2.5, 1, 4.5].forEach((z) => inner.add(place(glazing(rect(-1.3, .9, 2.6, 1.9), [[0, .9, 0, 2.8]]), W / 2 + .02, base, z, Math.PI / 2)));
  inner.add(place(glazing(rect(-.55, .1, 1.1, 2.6), []), W / 2 + .02, base, 7.3, Math.PI / 2));
  for (let z = -8; z <= 8; z += 4) inner.add(box(.16, 3, .16, H.frame, W / 2 + .95, base, z));
  inner.add(box(1.2, .14, D, H.deck, W / 2 + .6, .14, 0));
  inner.rotation.y = -Math.PI / 2;
  g.add(inner);
  return g;
}
function banya24() {
  const g = new THREE.Group(), W = 4.6, D = 5.2, hw = 2.3, hr = 3.8, base = .3;
  g.add(box(W + .2, base, D + .2, H.stone));
  const body = prism(W, D, hw, hr, H.logs); body.position.y = base; g.add(body);
  gableRoof(g, W, D, hw, hr, .45, .14, H.roof, base);
  g.add(place(glazing(rect(-.45, .05, .9, 2), [], H.wood), .9, base, D / 2 + .02));
  g.add(place(glazing(rect(-.4, 1.1, .8, .6), [], H.wood), -1.2, base, D / 2 + .02));
  const pipe = mesh(new THREE.CylinderGeometry(.14, .14, 1.6, 24), std(0x9da1a6, .3, .9));
  pipe.position.set(-1, base + 3.7, -1); g.add(pipe);
  g.add(box(W + .4, .12, 1.4, H.deck, 0, .18, D / 2 + .7));
  return g;
}
function besedka16() {
  const g = new THREE.Group();
  g.add(box(4.4, .2, 4.4, H.deck));
  [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([x, z]) => g.add(box(.14, 2.5, .14, H.frame, x, .2, z)));
  g.add(box(4.6, .14, 4.6, H.frame, 0, 2.7, 0));
  for (let i = 0; i < 15; i++) g.add(box(.08, .16, 4.4, H.wood, -2.1 + i * .3, 2.84, 0));
  g.add(box(2, .08, .9, H.wood, 0, .9, 0));
  [[-.42], [.42]].forEach(([z]) => g.add(box(1.8, .06, .32, H.wood, 0, .48, z * 2)));
  [[-.8, -.3], [.8, -.3], [-.8, .3], [.8, .3]].forEach(([x, z]) => g.add(box(.06, .7, .06, H.frame, x, .2, z)));
  return g;
}

const OBJECTS = [
  [barn124, { elev: 13, azim: 38 }],
  [nord96, { elev: 13, azim: 32 }],
  [sosny148, { elev: 12, azim: 28 }],
  [shalash82, { elev: 12, azim: 30 }],
  [kub110, { elev: 13, azim: 30 }],
  [tihiy176, { elev: 13, azim: 26 }],
  [banya24, { elev: 13, azim: 34 }],
  [besedka16, { elev: 16, azim: 30 }],
];
const SHEET_K = 2;
const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [(i % 3) * 480, Math.floor(i / 3) * 320, 480, 320]);

function sheet() {
  const K = SHEET_K;
  return canvas(1440 * K, 960 * K, (g) => {
    OBJECTS.forEach(([build, view], i) => {
      const [sx, sy, sw, sh] = SLOTS[i];
      const maxW = (sw - 24) * K, maxH = (sh - 22) * K;
      const shot = render(build(), { w: 1800, h: 1200, fov: 20, ...view });
      const b = trim(shot);
      const s = Math.min(maxW / b.w, maxH / b.h);
      const w = Math.round(b.w * s), h = Math.round(b.h * s);
      const cut = canvas(b.w, b.h, (c) => c.drawImage(shot, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h));
      g.drawImage(down(cut, w, h), Math.round((sx + sw / 2) * K - w / 2), Math.round((sy + sh - 8) * K - h));
    });
  });
}

/* ---------------- hero: the barn on a lawn, morning and evening ---------------- */
function skyCanvas(night, w = 1600, h = 900) {
  const R = rng(night ? 12 : 11);
  return canvas(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (night) { gr.addColorStop(0, '#0b1220'); gr.addColorStop(.55, '#18233a'); gr.addColorStop(1, '#3a4258'); } else { gr.addColorStop(0, '#b9c6cf'); gr.addColorStop(.55, '#dcdcd2'); gr.addColorStop(1, '#efe3cc'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (night) {
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${.2 + R() * .6})`; g.fillRect(R() * w, R() * h * .6, 1.4, 1.4); }
      const m = g.createRadialGradient(w * .78, h * .2, 0, w * .78, h * .2, h * .35);
      m.addColorStop(0, 'rgba(220,226,255,.35)'); m.addColorStop(1, 'rgba(220,226,255,0)');
      g.fillStyle = m; g.fillRect(0, 0, w, h);
    } else {
      const sun = g.createRadialGradient(w * .2, h * .55, 0, w * .2, h * .55, h * .7);
      sun.addColorStop(0, 'rgba(255,236,196,.8)'); sun.addColorStop(1, 'rgba(255,236,196,0)');
      g.fillStyle = sun; g.fillRect(0, 0, w, h);
    }
    g.filter = 'blur(28px)';
    for (let i = 0; i < 16; i++) {
      g.fillStyle = night ? `rgba(120,135,170,${.06 + R() * .08})` : `rgba(255,255,255,${.25 + R() * .3})`;
      g.beginPath(); g.ellipse(R() * w, h * (.12 + R() * .4), 120 + R() * 260, 26 + R() * 40, 0, 0, Math.PI * 2); g.fill();
    }
    g.filter = 'none';
  });
}
function heroScene(night, portrait) {
  GLASS = night ? H.lit : H.glass;
  const scene = new THREE.Scene();
  scene.environment = ENV;
  scene.environmentIntensity = night ? .1 : .65;
  const world = new THREE.Group(), cutout = new THREE.Group();
  const groundM = std(night ? 0x7a8670 : 0xf0f0e6, .95, 0, { map: TX.grass });
  const ground = mesh(meterUV(new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI / 2)), groundM);
  world.add(ground);
  const path = mesh(meterUV(new THREE.PlaneGeometry(2.2, 30).rotateX(-Math.PI / 2)), std(0xffffff, .95, 0, { map: TX.gravel }));
  path.position.set(0, .01, 23); world.add(path);
  const house = barn124();
  cutout.add(house);
  const R = rng(21);
  const leafMats = [0x4a5a32, 0x56683a, 0x3f4f2c, 0x617140, 0x4f5f36].map((c) => std(c, .95));
  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  const foliage = (cx, cy, cz, rx, ry, rz, n, s0, s1) => {
    for (let i = 0; i < n; i++) {
      let x, y, z;
      do { x = R() * 2 - 1; y = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + y * y + z * z > 1);
      const b = mesh(leafGeo, leafMats[Math.floor(R() * leafMats.length)]);
      const sc = s0 + R() * (s1 - s0);
      b.scale.set(sc, sc * .85, sc);
      b.rotation.set(R() * 3, R() * 3, R() * 3);
      b.position.set(cx + x * rx, Math.max(sc * .6, cy + y * ry), cz + z * rz);
      cutout.add(b);
    }
  };
  for (let x = -5; x <= 5.2; x += 1.6) if (Math.abs(x) > 1.6) foliage(x, .55, 11.1 + R() * .3, .8, .45, .5, 26, .16, .3);
  [[-5.6, 4], [-5.8, -1.5], [5.8, 1.5], [5.6, -4.5]].forEach(([x, z]) => foliage(x, .8, z, 1, .7, .9, 40, .18, .34));
  const tree = (x, z, hgt, w) => {
    cutout.add(cyl(.2, hgt * .45, std(0x4a3a2c, .9), 0, 12).translateX(x).translateZ(z));
    foliage(x, hgt * .62, z, w, hgt * .3, w, 160, .45, .85);
  };
  tree(-13, -9, 11, 3.2); tree(-18, 0, 9, 2.8); tree(13, -11, 12, 3.4); tree(18, -2, 9, 2.6); tree(-6, -22, 14, 4); tree(6, -24, 13, 3.8);
  world.add(cutout);
  scene.add(world);
  const porch = V3(4.6, 2.6, 7.4);
  if (night) {
    const moon = new THREE.DirectionalLight(0x8fa4dc, .55); moon.position.set(30, 40, -20); scene.add(moon);
    scene.add(new THREE.HemisphereLight(0x2a3a5c, 0x0c1008, .35));
    const lamp = new THREE.PointLight(0xffa24a, 60, 18, 1.6); lamp.position.copy(porch); lamp.castShadow = true; scene.add(lamp);
    const spill = new THREE.PointLight(0xffb062, 50, 14, 1.6); spill.position.set(0, 2.2, 9); scene.add(spill);
    const bulb = mesh(new THREE.SphereGeometry(.14, 16, 12), std(0xfff1d6, .3, 0, { emissive: 0xffc27a, emissiveIntensity: 4 }));
    bulb.position.copy(porch); cutout.add(bulb);
  } else {
    const sun = new THREE.DirectionalLight(0xffe0b4, 2.8);
    sun.position.set(-30, 22, 26);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.radius = 4;
    sun.shadow.bias = -.0003;
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
    scene.add(sun, new THREE.HemisphereLight(0xd8e4ee, 0x5a6a3a, .55));
  }
  const camera = new THREE.PerspectiveCamera(portrait ? 50 : 30, portrait ? 9 / 16 : 16 / 9, .1, 500);
  if (portrait) { camera.position.set(12, 1.9, 35); camera.lookAt(-1.4, 7.4, 0); } else { camera.position.set(11, 2.1, 32); camera.lookAt(-2.4, 5.2, 0); }
  return { scene, camera, ground, path, porch };
}
function shoot(scene, camera, w, h, background) {
  scene.background = background;
  renderer.setSize(w, h, false);
  renderer.render(scene, camera);
  return canvas(w, h, (g) => g.drawImage(renderer.domElement, 0, 0));
}
function hero(night, portrait) {
  const { scene, camera, ground, path, porch } = heroScene(night, portrait);
  const sky = skyCanvas(night);
  const W = portrait ? 1080 : 1920, Hh = portrait ? 1920 : 1080;
  const full = shoot(scene, camera, W, Hh, tex(sky));
  ground.visible = false; path.visible = false;
  const cut = shoot(scene, camera, W, Hh, null);
  const p = porch.clone().project(camera);
  GLASS = H.glass;
  return { sky, full, cut, porch: [(p.x + 1) / 2, (1 - p.y) / 2] };
}

window.renderAll = async () => {
  const out = {};
  const enc = (c, w, h, q) => down(c, w, h).toDataURL('image/webp', q).split(',')[1];
  out['objects-sheet.webp'] = sheet().toDataURL('image/webp', .9).split(',')[1];
  for (const night of [false, true]) {
    for (const portrait of [false, true]) {
      const k = (night ? 'night' : 'morning') + (portrait ? '-tall' : ''), hr = hero(night, portrait);
      if (!portrait) out[`sky-${k}.webp`] = hr.sky.toDataURL('image/webp', .8).split(',')[1];
      out[`full-${k}.webp`] = hr.full.toDataURL('image/webp', .84).split(',')[1];
      out[`cut-${k}.webp`] = hr.cut.toDataURL('image/webp', .86).split(',')[1];
      if (night) out[`porch${portrait ? '-tall' : ''}.json`] = btoa(JSON.stringify(hr.porch));
    }
  }
  return out;
};
