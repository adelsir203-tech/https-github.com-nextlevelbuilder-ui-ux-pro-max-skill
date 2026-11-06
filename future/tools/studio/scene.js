// Browser-side studio: builds every asset as a 3D model with three.js and
// renders it on a transparent background. Loaded by make-assets.mjs.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
const lathe = (pts, mat, seg = 128) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), seg), mat);
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
/* Planar UVs from world x/z, for top-view albedo maps */
function planarUV(geo, matrix, x0, z0, w, h) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(matrix);
    uv[i * 2] = (v.x - x0) / w;
    uv[i * 2 + 1] = 1 - (v.z - z0) / h;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
function ellipsoid(c, r, mat, seg = 96) {
  const geo = new THREE.SphereGeometry(1, seg, seg / 2);
  geo.scale(r[0], r[1], r[2]);
  geo.translate(c[0], c[1], c[2]);
  return mesh(geo, mat);
}
/* Hairs as instanced thin cones; sample() returns { p, d, len, color } */
function hairs(count, radius, sample, rough = .85) {
  const geo = new THREE.ConeGeometry(radius, 1, 5, 1, true);
  geo.translate(0, .5, 0);
  const im = new THREE.InstancedMesh(geo, std(0xffffff, rough), count);
  im.castShadow = true; im.receiveShadow = true;
  const up = V3(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4(), s = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const h = sample(i);
    q.setFromUnitVectors(up, h.d.normalize());
    s.set(h.w || 1, h.len, h.w || 1);
    m.compose(h.p, q, s);
    im.setMatrixAt(i, m);
    im.setColorAt(i, h.color);
  }
  return im;
}
function pixelColor(ctx, x, y) {
  const d = ctx.getImageData(Math.max(0, Math.min(ctx.canvas.width - 1, Math.round(x))), Math.max(0, Math.min(ctx.canvas.height - 1, Math.round(y))), 1, 1).data;
  return new THREE.Color().setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
}

/* Renders an object. view: { w, h, elev, azim, fov } (perspective, fitted) or { ortho: [l, r, t, b], top: true } */
function render(object, view) {
  const scene = new THREE.Scene();
  scene.environment = ENV;
  scene.environmentIntensity = view.env ?? .75;
  scene.add(object);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(V3()), center = box.getCenter(V3());
  let camera;
  if (view.ortho) {
    const [l, r, t, b] = view.ortho, hw = (r - l) / 2, hh = (t - b) / 2;
    camera = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 1, 5000);
    camera.position.set((l + r) / 2, 2000, -(t + b) / 2);
    camera.up.set(0, 0, -1);
    camera.lookAt((l + r) / 2, 0, -(t + b) / 2);
  } else {
    camera = new THREE.PerspectiveCamera(view.fov ?? 22, view.w / view.h, .1, 5000);
    const e = THREE.MathUtils.degToRad(view.elev ?? 8), a = THREE.MathUtils.degToRad(view.azim ?? 0);
    const radius = size.length() / 2;
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.02;
    camera.position.set(center.x + Math.sin(a) * Math.cos(e) * dist, center.y + Math.sin(e) * dist, center.z + Math.cos(a) * Math.cos(e) * dist);
    camera.lookAt(center);
  }
  const ext = Math.max(size.x, size.y, size.z) || 1;
  const key = new THREE.DirectionalLight(0xfff8f0, view.key ?? 2.4);
  const kd = view.ortho ? V3(-.75, 1.2, -.75) : V3(-1.1, 1.5, 1.2);
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
  rim.position.copy(center).addScaledVector(V3(1.2, .8, view.ortho ? 1 : -1.4).normalize(), ext * 3);
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

/* ---------------- materials ---------------- */
const M = {
  graphite: std(0x3b3e44, .42, .7),
  opal: phys({ color: 0xf6f3ec, roughness: .5, sheen: .4, sheenColor: 0xffffff, emissive: 0xfff2dc, emissiveIntensity: .12 }),
  amber: std(0xd98a2b, .32, .6),
  bone: std(0xe6ded0, .86, 0),
  boneDark: std(0xa69c8a, .9, 0),
  orange: std(0xf06a26, .4, 0),
  brass: std(0xc9a15a, .3, 1),
  sphere: phys({ color: 0xf7f5f0, roughness: .28, clearcoat: .7, clearcoatRoughness: .2, emissive: 0xfff6ea, emissiveIntensity: .06 }),
  glaze: phys({ color: 0x1f3fae, roughness: .34, clearcoat: .6, clearcoatRoughness: .3 }),
  soil: std(0x3a2a1f, 1, 0),
  leaf: std(0x5d8f3a, .6, 0, { side: THREE.DoubleSide }),
  sage: std(0x7b9276, .92, 0),
  disc: std(0x3a3e44, .55, .3),
  hand: std(0xebe6dc, .6, 0),
  glass: phys({ color: 0xffffff, roughness: .04, transparent: true, opacity: .2, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.6 }),
  water: phys({ color: 0x5ea6d6, roughness: .08, transparent: true, opacity: .55, depthWrite: false }),
  bubble: phys({ color: 0xffffff, roughness: .1, transparent: true, opacity: .6, depthWrite: false }),
  black: std(0x1c1d20, .62, .1),
  leather: std(0x8a5a34, .72, 0),
  chalk: std(0xe8e5dc, .78, 0),
};

/* ---------------- the eight objects ---------------- */
function duskLamp() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [19.3, 0], [20, .7], [20, 2.3], [19.3, 3], [0, 3]], M.graphite));
  g.add(cyl(1.7, 1.2, M.graphite, 3));
  g.add(cyl(.75, 80, M.graphite, 3));
  g.add(cyl(1.9, 3, M.graphite, 82.5));
  g.add(lathe([[0, 0], [10.4, 0], [11, .6], [11, 45.4], [10.5, 46], [0, 46]], M.opal).translateY(85));
  const ring = mesh(new THREE.TorusGeometry(11.02, .34, 16, 128), M.amber);
  ring.rotation.x = Math.PI / 2; ring.position.y = 125;
  g.add(ring);
  return g;
}
function grilleTexture(w, h) {
  return tex(canvas(w * 20, h * 20, (g, W, H) => {
    g.fillStyle = 'rgba(0,0,0,0)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(92,84,70,.75)';
    for (let y = 14; y < H - 8; y += 22) for (let x = 14 + ((y / 22) % 2) * 11; x < W - 8; x += 22) { g.beginPath(); g.arc(x, y, 4.4, 0, Math.PI * 2); g.fill(); }
  }));
}
function hushTower() {
  const g = new THREE.Group();
  const mods = [[28, 25, 23], [27, 24.5, 22], [26, 24, 21]];
  let y = 1;
  g.add(cyl(9, 1, M.boneDark, 0));
  mods.forEach(([w, h, d], i) => {
    const box = mesh(new RoundedBoxGeometry(w, h, d, 8, 3.6), M.bone);
    box.position.y = y + h / 2;
    g.add(box);
    const gw = w - 9, gh = h - (i === 2 ? 12 : 9);
    const grille = mesh(new THREE.PlaneGeometry(gw, gh), std(0xffffff, .9, 0, { map: grilleTexture(gw, gh), transparent: true }));
    grille.position.set(0, y + h / 2 - (i === 2 ? 2 : 0), d / 2 + .03);
    grille.castShadow = false;
    g.add(grille);
    if (i === 2) {
      const btn = cyl(.95, .7, M.orange, 0, 32);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, y + h - 4.2, d / 2 - .1);
      g.add(btn);
    }
    y += h;
    if (i < 2) { g.add(cyl(7, 1.1, M.boneDark, y)); y += 1.1; }
  });
  g.rotation.y = -.42;
  return g;
}
function noon() {
  const g = new THREE.Group();
  const s = mesh(new THREE.SphereGeometry(16, 128, 96), M.sphere);
  s.position.y = 44.5;
  g.add(s);
  g.add(lathe([[0, 0], [4.6, 0], [5, .5], [5, 1.8], [3.2, 3.2], [0, 3.2]], M.brass).translateY(27.6));
  [Math.PI / 2, Math.PI / 2 + 2.094, Math.PI / 2 + 4.189].forEach((a) => {
    const top = V3(Math.cos(a) * 3.6, 28.2, Math.sin(a) * 3.6), foot = V3(Math.cos(a) * 17, .8, Math.sin(a) * 17);
    const dir = foot.clone().sub(top), len = dir.length();
    const leg = mesh(new THREE.CylinderGeometry(.55, .55, len, 24), M.brass);
    leg.position.copy(top).add(foot).multiplyScalar(.5);
    leg.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
    g.add(leg);
    const tip = mesh(new THREE.SphereGeometry(.75, 24, 16), M.brass);
    tip.position.copy(foot);
    g.add(tip);
  });
  g.rotation.y = .5;
  return g;
}
function leafGeometry(len, wid) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-wid, len * .3, -wid * .7, len * .8, 0, len);
  s.bezierCurveTo(wid * .7, len * .8, wid, len * .3, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 24);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, (x * x) * .18 / wid + (y / len) * (y / len) * len * .22);
  }
  geo.computeVertexNormals();
  return geo;
}
function stack() {
  const g = new THREE.Group();
  const pots = [[0, 0, 9.6, 12.2, 14], [1.6, 12.5, 8, 10.1, 12], [-1, 23, 6.6, 8.2, 10]];
  pots.forEach(([x, y, rb, rt, h]) => {
    const pot = lathe([[0, 0], [rb - .7, 0], [rb, .7], [rt, h - 1.1], [rt + .35, h - .45], [rt + .2, h], [rt - .9, h], [rt - 1.1, h - 2.2]], M.glaze);
    pot.position.set(x, y, 0);
    g.add(pot);
    const soil = mesh(new THREE.CircleGeometry(rt - 1.05, 64), M.soil);
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(x, y + h - 1.5, 0);
    g.add(soil);
  });
  const R = rng(4);
  const leaf = (x, y, z, len, tilt, turn) => {
    const l = mesh(leafGeometry(len, len * .42), M.leaf);
    l.position.set(x, y, z);
    l.rotation.set(tilt, turn, 0, 'YXZ');
    g.add(l);
  };
  for (let i = 0; i < 9; i++) {
    const turn = i * .7 + R() * .3, r = 1 + R() * 2.2;
    leaf(-1 + Math.sin(turn) * r, 31.2, Math.cos(turn) * r, 5.5 + R() * 3.5, .28 + R() * .42, turn);
  }
  leaf(4, 23.4, 5, 3.6, 1.1, .4);
  leaf(-2, 23.4, 6, 3.2, 1.2, -.3);
  g.rotation.y = .2;
  return g;
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, 0);
  s.lineTo(w / 2 - r, 0); s.quadraticCurveTo(w / 2, 0, w / 2, r);
  s.lineTo(w / 2, h - r); s.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  s.lineTo(-w / 2 + r, h); s.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  s.lineTo(-w / 2, r); s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
  return s;
}
function slowClock() {
  const g = new THREE.Group();
  const W = 26, H = 64, cy = 42, hr = 9;
  const back = mesh(new THREE.ExtrudeGeometry(roundedRect(W, H, 1.2), { depth: 3.6, bevelEnabled: true, bevelSize: .35, bevelThickness: .35, bevelSegments: 4, curveSegments: 16 }), M.sage);
  back.position.z = -3.6;
  const front = roundedRect(W, H, 1.2);
  const hole = new THREE.Path();
  hole.absarc(0, cy, hr, 0, Math.PI * 2, true);
  front.holes.push(hole);
  const face = mesh(new THREE.ExtrudeGeometry(front, { depth: 2.2, bevelEnabled: true, bevelSize: .35, bevelThickness: .35, bevelSegments: 4, curveSegments: 64 }), M.sage);
  g.add(back, face);
  const disc = mesh(new THREE.CylinderGeometry(7.3, 7.3, 1, 96), M.disc);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, cy, .55);
  g.add(disc);
  const hand = mesh(new THREE.BoxGeometry(.5, 6.2, .3), M.hand);
  hand.geometry.translate(0, 3.1, 0);
  hand.position.set(0, cy, 1.2);
  hand.rotation.z = -.66;
  g.add(hand);
  const pin = mesh(new THREE.CylinderGeometry(.7, .7, .6, 32), M.hand);
  pin.rotation.x = Math.PI / 2;
  pin.position.set(0, cy, 1.3);
  g.add(pin);
  g.rotation.y = -.38;
  return g;
}
function rainColumn() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [10, 0], [10.5, .6], [10.5, 4.8], [10, 5.4], [9.2, 5.4], [0, 5.4]], M.graphite));
  const water = mesh(new THREE.CylinderGeometry(8.5, 8.5, 38, 96, 1), M.water);
  water.position.y = 5.4 + 19;
  water.renderOrder = 1;
  g.add(water);
  const R = rng(9);
  const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), M.bubble, 150);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 150; i++) {
    const stream = i % 3, a = [.6, 2.4, 4.3][stream], r = [3, 5.2, 4][stream];
    const y = 6.5 + R() * 36, s = .14 + R() * .3;
    m.compose(V3(Math.cos(a) * r + Math.sin(y * .4) * .5, y, Math.sin(a) * r), new THREE.Quaternion(), V3(s, s, s));
    bub.setMatrixAt(i, m);
  }
  bub.renderOrder = 2;
  g.add(bub);
  const glass = mesh(new THREE.CylinderGeometry(9, 9, 58, 128, 1, true), M.glass);
  glass.position.y = 5.4 + 29;
  glass.renderOrder = 3;
  glass.castShadow = false;
  g.add(glass);
  g.add(lathe([[0, 0], [9.4, 0], [10, .5], [10, 2.8], [9.5, 3.3], [0, 3.3]], M.graphite).translateY(63));
  return g;
}
function latch() {
  const g = new THREE.Group();
  const body = mesh(new RoundedBoxGeometry(9, 11, 3.2, 10, 2.6), M.black);
  body.position.y = 5.5;
  g.add(body);
  const ring = mesh(new THREE.TorusGeometry(1.9, .12, 12, 64), std(0x2c2e32, .5, .3));
  ring.position.set(.6, 7.2, 1.62);
  g.add(ring);
  const loop = new THREE.CatmullRomCurve3([V3(-3.6, 9.6, 0), V3(-6.6, 10.2, 0), V3(-9, 7.2, 0), V3(-8.4, 3.4, 0), V3(-5.4, 2.2, 0), V3(-3.8, 3.2, 0)]);
  const strap = mesh(new THREE.TubeGeometry(loop, 96, .85, 16, false), M.leather);
  strap.scale.z = .38;
  g.add(strap);
  const lug = mesh(new RoundedBoxGeometry(1.4, 8, 1.8, 4, .5), std(0x2a2b2f, .5, .4));
  lug.position.set(-4.3, 6, 0);
  g.add(lug);
  g.rotation.y = .42;
  return g;
}
function pebble() {
  const geo = new THREE.SphereGeometry(1, 192, 128);
  const p = geo.attributes.position, v = V3(0, 0, 0);
  const dim = V3(-.2, 1, .25).normalize();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + .045 * Math.sin(v.x * 2.1 + 1) * Math.cos(v.z * 1.7) + .03 * Math.sin(v.y * 3 + v.x);
    v.multiplyScalar(n);
    const dd = v.clone().normalize().distanceTo(dim);
    const x = v.x * 8, z = v.z * 6.2;
    let y = v.y * 3.7;
    if (y < -1.8) y = -1.8 + (y + 1.8) * .35;
    if (dd < .36) y -= 1.6 * Math.pow(1 - dd / .36, 1.6);
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, M.chalk);
  m.rotation.y = -.5;
  return m;
}

const OBJECTS = [
  [duskLamp, { elev: 6, azim: 0 }],
  [hushTower, { elev: 7 }],
  [noon, { elev: 8 }],
  [stack, { elev: 12 }],
  [slowClock, { elev: 6 }],
  [rainColumn, { elev: 8 }],
  [latch, { elev: 10 }],
  [pebble, { elev: 26 }],
];
const SLOTS = [[0, 0, 160, 405], [160, 0, 160, 405], [320, 0, 160, 405], [480, 0, 160, 405], [640, 0, 160, 405], [800, 0, 160, 405], [0, 405, 240, 135], [240, 405, 240, 135]];

function sheet() {
  const K = 3;
  return canvas(960 * K, 540 * K, (g) => {
    OBJECTS.forEach(([build, view], i) => {
      const [sx, sy, sw, sh] = SLOTS[i];
      const maxW = (sw - 24) * K, maxH = (sh - 22) * K;
      const shot = render(build(), { w: 1400, h: 1400, fov: 20, ...view });
      const b = trim(shot);
      const s = Math.min(maxW / b.w, maxH / b.h);
      const w = Math.round(b.w * s), h = Math.round(b.h * s);
      const cut = canvas(b.w, b.h, (c) => c.drawImage(shot, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h));
      g.drawImage(down(cut, w, h), Math.round((sx + sw / 2) * K - w / 2), Math.round((sy + sh - 8) * K - h));
    });
  });
}

/* ---------------- spider (sprite space 1254, top view, head toward +z) ---------------- */
const RIGHT_LEGS = [
  [[470, 760], [370, 830], [400, 1160]],
  [[460, 665], [300, 690], [100, 955]],
  [[480, 605], [370, 580], [55, 475]],
  [[490, 560], [360, 420], [410, 52]],
];
const COL = { dark: '#2a190f', brown: '#5b3a22', warm: '#7d5433', cream: '#e2cfae', pale: '#f0e4cc' };

function spiderAlbedo() {
  return canvas(1254, 1254, (g) => {
    g.fillStyle = '#4c3019';
    g.fillRect(0, 0, 1254, 1254);
    g.filter = 'blur(6px)';
    g.fillStyle = '#e3d0ae';
    g.fill(new Path2D('M444,372 C452,474 540,536 628,538 C716,536 804,474 812,372 C790,452 718,500 628,502 C538,500 466,452 444,372 Z'));
    g.fillStyle = '#d9c39d';
    g.fill(new Path2D('M600,190 C604,260 606,350 610,470 L646,470 C650,350 652,260 656,190 C646,176 610,176 600,190 Z'));
    g.strokeStyle = 'rgba(30,18,10,.85)'; g.lineWidth = 12; g.lineJoin = 'round';
    for (let i = 0; i < 5; i++) { const y = 220 + i * 52, w = 64 - i * 5; g.beginPath(); g.moveTo(628 - w, y + 22); g.lineTo(628, y); g.lineTo(628 + w, y + 22); g.stroke(); }
    g.fillStyle = '#ead9ba';
    [[540, 260], [716, 260], [520, 340], [736, 340], [548, 420], [708, 420]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 18, 14, 0, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#3a2414';
    g.fillRect(480, 548, 300, 300);
    g.fillStyle = '#e1cda9';
    g.fill(new Path2D('M498,700 C504,650 520,612 540,590 C530,640 528,700 536,780 C516,770 498,744 498,700 Z'));
    g.fill(new Path2D('M762,700 C756,650 740,612 720,590 C730,640 732,700 724,780 C744,770 762,744 762,700 Z'));
    g.fillStyle = 'rgba(22,14,8,.9)';
    g.fill(new Path2D('M560,640 C580,620 680,620 700,640 C716,700 712,770 700,810 C660,824 600,824 560,810 C548,770 544,700 560,640 Z'));
    g.fillStyle = '#d8c19c';
    g.beginPath(); g.ellipse(630, 600, 36, 24, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(230,160,85,.8)';
    g.beginPath(); g.ellipse(630, 772, 70, 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#efe3cc';
    [[545, 880], [712, 880]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 62, 58, 0, 0, Math.PI * 2); g.fill(); });
    g.filter = 'none';
  });
}
function bodyPart(c, r, albedo, roughness = .85) {
  const m = ellipsoid(c, r, std(0xffffff, roughness, 0, { map: albedo }));
  planarUV(m.geometry, m.matrixWorld, 0, 0, 1254, 1254);
  return m;
}
function furOn(R, ctx, c, r, count, len, rad, back, ybias = 0) {
  return hairs(count, rad, () => {
    let nx, ny, nz;
    do { nx = R() * 2 - 1; ny = R() * 2 - 1; nz = R() * 2 - 1; } while (nx * nx + ny * ny + nz * nz > 1 || ny < ybias);
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const p = V3(c[0] + nx * r[0], c[1] + ny * r[1], c[2] + nz * r[2]);
    const n = V3(nx / r[0], ny / r[1], nz / r[2]).normalize();
    const d = n.clone().addScaledVector(back, .9).add(V3((R() - .5) * .5, 0, (R() - .5) * .5));
    const col = pixelColor(ctx, p.x, p.z).offsetHSL(0, 0, (R() - .5) * .14);
    if (R() < .12) col.lerp(new THREE.Color(0xf3e8d2), .6);
    return { p: p.addScaledVector(n, -1), d, len: len * (.55 + R() * .7), color: col };
  });
}
function legs(group, R, mirrorFn, scaleY = 1) {
  const bandsF = [[0, .12, COL.dark], [.12, .22, COL.cream], [.22, .86, COL.brown], [.86, 1, COL.cream]];
  const bandsT = [[0, .07, COL.pale], [.07, .4, COL.brown], [.4, .5, COL.cream], [.5, .76, COL.dark], [.76, .83, COL.cream], [.83, .97, COL.warm], [.97, 1, COL.dark]];
  const mats = {};
  const mat = (c) => (mats[c] ||= std(c, .8));
  const bone = (a, b, r0, r1, bands, hairN) => {
    const dir = b.clone().sub(a), len = dir.length(), u = dir.clone().normalize();
    bands.forEach(([t0, t1, c]) => {
      const pa = a.clone().addScaledVector(dir, t0), pb = a.clone().addScaledVector(dir, t1);
      const seg = mesh(new THREE.CylinderGeometry(r0 + (r1 - r0) * t1, r0 + (r1 - r0) * t0, len * (t1 - t0) + .6, 20), mat(c));
      seg.position.copy(pa).add(pb).multiplyScalar(.5);
      seg.quaternion.setFromUnitVectors(V3(0, 1, 0), u);
      group.add(seg);
    });
    const side = V3(0, 1, 0).cross(u).normalize(), up = u.clone().cross(side).normalize();
    group.add(hairs(hairN, 1.3, () => {
      const t = R(), ang = R() * Math.PI * 2, rr = r0 + (r1 - r0) * t;
      const radial = side.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang));
      const p = a.clone().addScaledVector(dir, t).addScaledVector(radial, rr * .9);
      const light = R() < .5;
      return { p, d: radial.clone().addScaledVector(u, .9), len: 8 + R() * 13, color: new THREE.Color(light ? 0xe8d6b6 : 0x2a190f) };
    }));
    for (let i = 0; i < 6; i++) {
      const t = .15 + R() * .7, ang = R() * Math.PI * 2;
      const radial = side.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.abs(Math.sin(ang)));
      group.add(hairs(1, 1.6, () => ({ p: a.clone().addScaledVector(dir, t).addScaledVector(radial, r0 * .8), d: radial.clone().addScaledVector(u, .7), len: 24, color: new THREE.Color(0x1b100a) })));
    }
  };
  RIGHT_LEGS.forEach((L, i) => [false, true].forEach((m) => {
    const pts = L.map(([x, z]) => (m ? mirrorFn(x) : x)).map((x, j) => [x, L[j][1]]);
    const front = i === 0;
    const H = V3(pts[0][0], 70 * scaleY, pts[0][1]), Kn = V3(pts[1][0], 150 * scaleY, pts[1][1]), F = V3(pts[2][0], 14, pts[2][1]);
    bone(H, Kn, front ? 23 : 18, front ? 19 : 15, bandsF, 120);
    bone(Kn, F, front ? 17 : 14, front ? 7.5 : 6, bandsT, 200);
    const joint = mesh(new THREE.SphereGeometry(front ? 18 : 15, 24, 16), mat(COL.cream));
    joint.position.copy(Kn);
    group.add(joint);
  }));
}
function spider() {
  const R = rng(31);
  const g = new THREE.Group();
  const alb = spiderAlbedo(), at = tex(alb), actx = alb.getContext('2d', { willReadFrequently: true });
  legs(g, R, (x) => 1254 - x);
  const abd = [628, 120, 350], abdR = [200, 118, 188];
  g.add(bodyPart(abd, abdR, at));
  g.add(furOn(R, actx, abd, abdR, 9000, 20, 1.5, V3(0, 0, -1), -.15));
  g.add(ellipsoid([627, 70, 168], [22, 18, 20], std(0x2a190f, .7)));
  g.add(ellipsoid([627, 80, 545], [26, 22, 30], std(0x2a190f, .8)));
  const ceph = [630, 96, 688], cephR = [152, 92, 134];
  g.add(bodyPart(ceph, cephR, at));
  g.add(furOn(R, actx, ceph, cephR, 5200, 13, 1.25, V3(0, 0, -.6), .05));
  g.add(ellipsoid([627, 52, 862], [44, 30, 46], std(0x3a2414, .75)));
  [[545, 880], [712, 880]].forEach(([x, z]) => {
    const c = [x, 56, z], r = [54, 44, 50];
    g.add(bodyPart(c, r, at, .95));
    g.add(furOn(R, actx, c, r, 1800, 13, 1.1, V3(0, .2, .6), -.3));
  });
  const eyeM = phys({ color: 0x0b0908, roughness: .06, clearcoat: 1, clearcoatRoughness: .04 });
  [[524, 150, 642, 15], [736, 150, 642, 15], [548, 166, 706, 6], [712, 166, 706, 6], [526, 128, 788, 21], [734, 128, 788, 21], [590, 120, 800, 32], [670, 120, 800, 32]].forEach(([x, y, z, r]) => {
    g.add(ellipsoid([x, y, z], [r, r * .85, r], eyeM, 48));
  });
  return render(g, { w: 1120, h: 1120, ortho: [0, 1254, 0, -1254], env: .8, key: 2.6, rim: .5 });
}

/* ---------------- idle head (sprite space 308, top view) ---------------- */
function idleHead() {
  const R = rng(55);
  const g = new THREE.Group();
  const alb = canvas(308, 308, (c) => {
    c.fillStyle = '#7a5232'; c.fillRect(0, 0, 308, 308);
    c.filter = 'blur(2px)';
    c.fillStyle = '#e3cfab';
    c.fill(new Path2D('M100,150 C100,130 106,116 114,108 C110,130 110,160 114,186 C104,178 100,166 100,150 Z'));
    c.fill(new Path2D('M208,150 C208,130 202,116 194,108 C198,130 198,160 194,186 C204,178 208,166 208,150 Z'));
    c.fillStyle = '#f0b26a';
    c.beginPath(); c.ellipse(139, 140, 14, 4, -.15, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(170, 140, 14, 4, .15, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(233,143,138,.55)';
    c.beginPath(); c.ellipse(111, 172, 9, 6, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(197, 172, 9, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f6eedf';
    [[128, 206], [179, 206]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 20, 18, 0, 0, Math.PI * 2); c.fill(); });
    c.filter = 'none';
  });
  const at = tex(alb), actx = alb.getContext('2d', { willReadFrequently: true });
  const part = (cc, r, count, len, rad, back) => {
    const m = ellipsoid(cc, r, std(0xffffff, .9, 0, { map: at }));
    planarUV(m.geometry, m.matrixWorld, 0, 0, 308, 308);
    g.add(m);
    g.add(furOn(R, actx, cc, r, count, len, rad, back, -.1));
  };
  [[128, 206], [179, 206]].forEach(([x, z]) => part([x, 14, z], [19, 14, 17], 900, 4.5, .38, V3(0, .2, .6)));
  part([154, 26, 150], [56, 30, 54], 4200, 4.2, .34, V3(0, 0, -.4));
  const eyeM = phys({ color: 0x0b0908, roughness: .05, clearcoat: 1, clearcoatRoughness: .03 });
  const glint = std(0xffffff, .3, 0, { emissive: 0xffffff, emissiveIntensity: 1.2 });
  [[139, 158, 12.5], [170, 158, 12.5], [117, 150, 7.5], [192, 150, 7.5], [112, 136, 4], [197, 136, 4]].forEach(([x, z, r]) => {
    g.add(ellipsoid([x, 46, z], [r + .9, r * .7, r + .9], std(0x3a2414, .8), 32));
    g.add(ellipsoid([x, 47.5, z], [r, r * .75, r], eyeM, 48));
    g.add(ellipsoid([x - r * .34, 47.5 + r * .72, z - r * .36], [r * .28, r * .1, r * .28], glint, 16));
    g.add(ellipsoid([x + r * .36, 47.5 + r * .66, z + r * .34], [r * .12, r * .06, r * .12], glint, 12));
  });
  return render(g, { w: 616, h: 616, ortho: [0, 308, 0, -308], env: .85, key: 2.4, rim: .4 });
}

/* ---------------- fly (sprite space 920 x 945, top view, head toward -z) ---------------- */
const WING = [[398, 380], [330, 415], [250, 515], [180, 615], [132, 720], [148, 795], [212, 805], [305, 742], [385, 652], [410, 560], [414, 455]];
function fly() {
  const R = rng(91);
  const g = new THREE.Group();
  const alb = canvas(920, 945, (c) => {
    c.fillStyle = '#5c5a56'; c.fillRect(0, 0, 920, 945);
    c.filter = 'blur(3px)';
    c.fillStyle = '#1a1918';
    [-24, -9, 9, 24].forEach((dx) => c.fillRect(460 + dx - 4, 330, 8, 140));
    for (let i = 0; i < 4; i++) {
      const y = 560 + i * 48;
      c.fillStyle = '#242322'; c.fillRect(398, y, 124, 10);
      c.fillStyle = '#9a968e'; c.fillRect(430, y + 12, 18, 22); c.fillRect(472, y + 12, 18, 22);
    }
    c.filter = 'none';
  });
  const at = tex(alb), actx = alb.getContext('2d', { willReadFrequently: true });
  const part = (cc, r, mat) => {
    const m = ellipsoid(cc, r, mat);
    planarUV(m.geometry, m.matrixWorld, 0, 0, 920, 945);
    g.add(m);
  };
  const skin = std(0xffffff, .55, 0, { map: at });
  part([460, 40, 650], [62, 38, 138], skin);
  part([460, 60, 405], [56, 48, 86], skin);
  part([460, 55, 250], [92, 40, 58], std(0x2c2a28, .6));
  const eye = phys({ color: 0x8c2616, roughness: .32, clearcoat: .6, clearcoatRoughness: .3 });
  g.add(ellipsoid([397, 68, 236], [56, 46, 64], eye, 64), ellipsoid([523, 68, 236], [56, 46, 64], eye, 64));
  part([460, 82, 225], [16, 10, 46], std(0x8f8a80, .7));
  const bristle = (cc, r, n) => g.add(hairs(n, 2, () => {
    let nx, ny, nz;
    do { nx = R() * 2 - 1; ny = R() * 2 - 1; nz = R() * 2 - 1; } while (nx * nx + ny * ny + nz * nz > 1 || ny < 0);
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    return { p: V3(cc[0] + nx * r[0], cc[1] + ny * r[1], cc[2] + nz * r[2]), d: V3(nx, ny, nz + .4), len: 10 + R() * 12, color: new THREE.Color(0x0e0e0d) };
  }));
  bristle([460, 60, 405], [56, 48, 86], 260);
  bristle([460, 40, 650], [62, 38, 138], 220);
  const legM = std(0x1b1a19, .55, .1);
  [[[428, 330], [340, 262], [300, 150]], [[420, 420], [270, 400], [170, 470]], [[438, 520], [396, 690], [372, 860]]].forEach((L) => {
    [L, L.map(([x, z]) => [920 - x, z])].forEach((pts) => {
      const P = [V3(pts[0][0], 30, pts[0][1]), V3(pts[1][0], 60, pts[1][1]), V3(pts[2][0], 6, pts[2][1])];
      for (let s = 0; s < 2; s++) {
        const dir = P[s + 1].clone().sub(P[s]);
        const seg = mesh(new THREE.CylinderGeometry(s ? 4.5 : 7, s ? 7 : 7.5, dir.length(), 16), legM);
        seg.position.copy(P[s]).add(P[s + 1]).multiplyScalar(.5);
        seg.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
        g.add(seg);
      }
      const j = mesh(new THREE.SphereGeometry(7, 16, 12), legM); j.position.copy(P[1]); g.add(j);
    });
  });
  const veins = (mx) => canvas(920, 945, (c) => {
    c.fillStyle = 'rgba(226,233,239,.42)';
    c.beginPath();
    WING.forEach(([x, z], i) => { const X = mx ? 920 - x : x; const cx = mx ? 620 : 300; const px = cx + (X - cx) * .96, pz = 610 + (z - 610) * .96; if (i) c.lineTo(px, pz); else c.moveTo(px, pz); });
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(40,40,38,.7)'; c.lineWidth = 3;
    const tx = (x) => (mx ? 920 - x : x);
    c.stroke(new Path2D(`M${tx(392)},398 C${tx(330)},480 ${tx(240)},600 ${tx(150)},740 M${tx(396)},420 C${tx(350)},520 ${tx(280)},640 ${tx(196)},790 M${tx(398)},450 C${tx(380)},560 ${tx(330)},660 ${tx(270)},770 M${tx(330)},520 C${tx(300)},560 ${tx(290)},600 ${tx(300)},650`));
  });
  [false, true].forEach((mx) => {
    const geo = new THREE.PlaneGeometry(920, 945);
    geo.rotateX(-Math.PI / 2);
    geo.translate(460, 0, 472.5);
    const w = new THREE.Mesh(geo, phys({ map: tex(veins(mx)), transparent: true, roughness: .25, iridescence: .7, iridescenceIOR: 1.4, side: THREE.DoubleSide, depthWrite: false }));
    w.position.y = 96;
    w.renderOrder = 5;
    g.add(w);
  });
  return render(g, { w: 920, h: 945, ortho: [0, 920, 0, -945], env: .9, key: 2.2, rim: .5 });
}

window.renderAll = async () => {
  const out = {};
  const enc = (c, w, h, q) => down(c, w, h).toDataURL('image/webp', q).split(',')[1];
  out['objects-sheet.webp'] = sheet().toDataURL('image/webp', .9).split(',')[1];
  out['spider.webp'] = enc(spider(), 560, 560, .92);
  out['idle-head.webp'] = enc(idleHead(), 308, 308, .94);
  out['fly.webp'] = enc(fly(), 240, 246, .94);
  return out;
};
