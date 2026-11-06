/* ---- Constants: every number and string from the brief lives here ---- */
const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

const COPY = {
  bundleTitle: 'Complete the kit',
  bundleNote: 'Bundle all 3 and save 10%',
  cta: 'Add full kit to bag',
  ctaPhone: (price) => `Add full kit — €${price}`,
  ctaDone: 'Full kit in your bag',
  kicker: (n) => `Kit 0${n}`,
  choose: (names) => `Pick an option for: ${names}`,
  error: 'Couldn’t add to bag. Try again.',
  toastOne: 'Saved to your bag',
  toastKit: 'Kit saved to your bag',
  bagEmpty: 'Your bag is empty. Pick an option beside a piece to save it.',
  subtotal: (amount) => `Reference subtotal €${amount}`,
  shortlistHead: 'future — shortlist',
  shortlistNote: 'Reference prices; no order or payment has been placed.',
  bagLine: (option, qty, price) => `Option ${option} · Quantity ${qty} · €${price}`,
  shortLine: (name, option, qty) => `${name} · Option ${option} · Quantity ${qty}`,
  remove: (name) => `Remove ${name}`,
  addTo: (name) => `Add to bag: ${name}`,
  added: (name) => `Added to bag: ${name}`,
  confirm: 'Add to bag',
  kitLabel: (n, name) => `Kit ${n}: ${name}`,
  pinLabel: (n, name) => `${n}: ${name}`,
  drag: 'Drag',
  view: 'View',
  pickFirst: 'Pick an option first.',
  // Not given in the brief; named here after the original pages' labels.
  lotLive: (n, name) => `Lot ${n}: ${name}`,
  like: (name) => `Like ${name}`,
  prev: 'Previous kit',
  next: 'Next kit',
  autoplay: 'Autoplay',
};

const PRODUCTS = [
  { id: 'dusk-lamp', name: 'Dusk Lamp', type: 'Light', price: 240, legend: 'Finish', values: ['Opal', 'Smoke', 'Amber'], slot: 0 },
  { id: 'hush-tower', name: 'Hush Tower', type: 'Sound', price: 410, legend: 'Grille', values: ['Bone', 'Sage', 'Graphite'], slot: 1 },
  { id: 'noon', name: 'Noon', type: 'Light', price: 180, legend: 'Legs', values: ['Brass', 'Steel', 'Black'], slot: 2 },
  { id: 'stack', name: 'Stack', type: 'Plants', price: 95, legend: 'Glaze', values: ['Cobalt', 'Moss', 'Ash'], slot: 3 },
  { id: 'slow-clock', name: 'Slow Clock', type: 'Time', price: 220, legend: 'Face', values: ['Sage', 'Graphite', 'Bone'], slot: 4 },
  { id: 'rain-column', name: 'Rain Column', type: 'Water', price: 360, legend: 'Height', values: ['S', 'M', 'L'], slot: 5 },
  { id: 'latch', name: 'Latch', type: 'Carry', price: 58, legend: 'Strap', values: ['Black', 'Tan', 'Signal'], slot: 6 },
  { id: 'pebble', name: 'Pebble', type: 'Control', price: 72, legend: 'Colour', values: ['Chalk', 'Slate', 'Moss'], slot: 7 },
];
const PRODUCT = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const BAG = { key: 'future-bag-v1', maxQty: 20, maxEntries: 50, toastMs: 2500 };

/* Sheet: logical 960 x 540 at 3x; slots [x, y, w, h] */
const SHEET = {
  w: 960, h: 540, alpha: 8,
  slots: [
    [0, 0, 160, 405], [160, 0, 160, 405], [320, 0, 160, 405], [480, 0, 160, 405], [640, 0, 160, 405], [800, 0, 160, 405],
    [0, 405, 240, 135], [240, 405, 240, 135],
  ],
};
const HS = [1, .86, .9, .82, .95, .92];

/* Shell */
const ROOMS = ['home', 'line', 'kits'];
const WIPE = { ms: 900, easing: 'cubic-bezier(.65,0,.35,1)', r: '150vmax' };

/* The line */
const LINE = {
  n: 6, FIRST: 41,
  KX: [1.2, .744, .496, .346, .235, .15, .085],
  KF: [1.14, .89, .777, .704, .651, .616, .59],
  KH: [1.18, .832, .574, .436, .334, .258, .19],
  KB: [0, 0, 1.5, 4, 8, 12, 17],
  KO: [1, 1, 1, 1, .86, .5, 0],
  layout: 1.2, ease: .0072, snap: .0004, dtMax: 50,
  dragMin: 150, dragFrac: .2, clickPx: 6,
  wheelClamp: 120, wheelDiv: 420, wheelIdle: 150,
  blurMin: .2, ringLerp: .32, phoneCard: 160,
};
const RAIL = [
  ['dusk-lamp', 'pebble'], ['hush-tower', 'latch'], ['noon', 'pebble'],
  ['stack', 'latch'], ['slow-clock', 'pebble'], ['rain-column', 'latch'],
];

/* Kits */
const KITS = [
  { name: 'Reading Corner', pieces: ['dusk-lamp', 'stack', 'pebble'], heights: [70, 44, 12] },
  { name: 'Slow Morning', pieces: ['slow-clock', 'rain-column', 'latch'], heights: [52, 56, 14] },
  { name: 'Night Desk', pieces: ['noon', 'hush-tower', 'pebble'], heights: [54, 48, 12] },
  { name: 'Hallway', pieces: ['dusk-lamp', 'hush-tower', 'latch'], heights: [70, 46, 14] },
  { name: 'Window Seat', pieces: ['stack', 'noon', 'pebble'], heights: [42, 56, 12] },
  { name: 'Weekend', pieces: ['rain-column', 'slow-clock', 'pebble'], heights: [58, 50, 12] },
];
const FIG = { aspect: .5625, cx: [24, 55, 84], floor: 92, discount: .9 };
const RING = {
  speed: 5000, K: 95, C: 2 * Math.sqrt(95), lag: .04, entrance: -1.15, fs: 1.08,
  subSteps: 3, dtMax: .034, settle: .0005, minBodies: 8,
  R: .62, Rm: .72, P: 1.65, Pm: 1.9, floorPad: 34, headPad: 18, horizon: .36,
  unitFrac: .3, unitMin: 120, unitMinM: 90,
  blur1: 1.8, blurStep: 2, blurMax: 6.5, opBase: .55, opSpan: .3,
  dragStart: 8, dragRatio: 1.2, abandonY: 10, samples: 6, swipePx: 30, flingV: .3, fling: 160, clampSteps: 2, clickMute: 60,
  wheelAcc: 45, wheelLock: 520, cursorLerp: .18, cursorDone: .2,
  frameMin: 380, phoneFrame: 1.09, phoneRelatch: 160, modelMin: 200, resizeMs: 120, lbMs: 950, lbMin: 160,
  revealMargin: '0px 0px -22% 0px',
  // Not given in the brief; values follow the original mechanic.
  addMs: 420,
};
const MOBILE_Q = '(max-width: 820px)';
const FINE_Q = '(hover: hover) and (pointer: fine)';
const RM_Q = '(prefers-reduced-motion: reduce)';

/* Home: spider rig in sprite units (base 1254) */
const RIG = {
  base: 1254,
  pivot: [627, 600], waist: [627, 548], spinneret: [627, 150],
  abdomen: [628, 345, 220, 205],
  head: [[630, 680, 172, 148], [545, 880, 74, 70], [712, 880, 74, 70]],
  legs: [
    [[470, 760], [370, 830], [400, 1160]],
    [[460, 665], [300, 690], [100, 955]],
    [[480, 605], [370, 580], [55, 475]],
    [[490, 560], [360, 420], [410, 52]],
  ],
  legWidth: 92, fade: .28, reachMin: 1.15, overlap: .12,
  idle: { size: 308, scale: 3.3, from: [154, 150], to: [630, 690] },
  eyes: [[139, 158, 12.5], [170, 158, 12.5], [117, 150, 7.5], [192, 150, 7.5], [112, 136, 4], [197, 136, 4]],
  lid: [.82, .78, .75], lidLine: 'rgba(40,22,12,.7)',
  zPoint: [260, -170],
};
const FLY = {
  w: 920, h: 945, px: 79,
  wing: [[398, 380], [330, 415], [250, 515], [180, 615], [132, 720], [148, 795], [212, 805], [305, 742], [385, 652], [410, 560], [414, 455]],
  hinge: [388, 405],
  follow: 28, recoil: 20, turnV: 60, landAfter: 1.2, landUp: 3, landDown: 10,
  hz: 34, hzCaught: 46, ghosts: 4, flap: .9, squash: .25,
  catchR: 55, caughtMin: 3, caughtMax: 4.2, tremble: [47, 31], fling: 150,
  cocoon: { strokes: 7, r: 30, fibres: 70 },
  // Not given in the brief; values follow the original mechanic.
  ghostAlpha: .32, recoilDecay: 1.4, turnRate: 12, trembleAmp: 1.3, cocoonFade: 2, fade: 6, strokeDelay: .14, strokeDraw: .45,
};
const SPIDER = {
  gap: 560, gapNoFly: 330, vmax: 760, vGain: 4, ease: 10, turn: 8, edge: 10,
  sway: .08, swayMax: .35, swayEase: 6,
  introWait: 3, introWaitAgain: .8, introDrop: 2.3, introPow: 2.4, introLand: 1.3, introY: -760,
  bounce: [14, 3.2, 6.5], swayX: [1.8, 8, .5],
  stride: 130, frontStride: .7, stopStride: .3, overext: .98, groupBypass: 1.6, lead: .09,
  stepBase: .15, stepSpeed: 3200, stepMin: .055, stepMax: .15,
  kneeLift: 26, kneeLiftFront: 12, footLift: 20,
  breathe: [3.2, 1.8, .025, .03], squash: [.1, 4],
  shadow: [.42, .24, 500, 7, .14, 5, .35, 9, .6], liftScale: 260,
  rest: { still: .25, speed: 25, up: 3.2, down: 6, fade: .15, blinkAfter: 1.5, blink: .2, blink2: .33, blinkMin: 3, blinkMax: 5 },
  sleep: { after: 8, ramp: 1.6, tuck: .62, shrink: .03, wake: .6, hop: .3, hopH: 26 },
  zed: { rise: 70, size: [12, 14], shade: .25 },
  jump: { reach: 360, speed: 1100, min: .28, max: .6, hMin: 22, hK: .3, hMax: 130, spinMin: 16, spinMax: 28 },
  // Not given in the brief; values follow the original mechanic.
  nearlyStopped: 12, zedPeriod: 2.6, zedDrift: 26, zedBlur: 4, wakeRate: 2.5, tuckRate: 3, wobble: .05, jumpTurn: 14,
};
const SILK = {
  segs: 12, damping: .975, gravity: 110, wind: [.45, .6, 1.3, 1.7, .4, .6, .4, 1.1, .012, 22], passes: 4,
  sag: [1.01, 1.015], push: 36, liveThick: 1.25, step: 7,
  attach: { near: 70, fromStart: 30, travel: 54, radial: 288, radialThick: .7, cross: 204, crossMin: 45, crossP: .75, crossThick: .85, buzz: [60, 1.2] },
  free: 120, slideP: .35, max: 160,
  halo: [.06, 4], strand: [.9, .35, .8], colour: 'rgba(255,255,255,0.75)',
  irid: [190, 150, .12, .3, .3], fibre: [1.1, .9, .38, .45],
  hair: { per: 3 / 1.1, touch: .4, len: [.5, 2.7], alpha: .55, width: .35 },
  fluff: { p: .4, dust: 5, dustColour: '#8a7a6a', fibres: 10, fibreColour: 'rgba(240,232,220,.8)' },
  dew: { per: 55, base: .4, r: [1.6, 6.2], sprite: 64 },
  glint: .6, ageFade: 90, ageMin: .5, tufts: 30, bead: 3,
  shadow: { colour: 'rgba(8,14,70,.42)', blur: 3.5, x: 7, y: 11 },
  drops: { slope: 9, keep: .95, fall: 1100, splatAfter: 10, maxSplats: 400 },
  clearFade: 2.6, footBuzz: [30, .6], landBuzz: [140, 2], jumpBuzz: [140, 3],
  // Not given in the brief; values follow the original mechanic.
  steep: .9, bigDrop: 5.2, bigDropP: .004, endPad: 2, shakeEnd: .25, clearShake: 7, glintLen: .07, tapGap: 300, tapNear: 40, dewEdge: .08,
  hold: 650, holdBuzz: 30, holdSlop: 10, shadowRes: .5,
};
const NUDGE = { near: 260, speed: 40, torqueMax: 2.5, torqueK: 120, push: .85, damp: 2.8, angle: 24, offset: 50, spring: 8, stickAngle: 8, stickSpring: 20, settle: .3 };
const ANCHOR = { textAlpha: 128, imgAlpha: 140, resampleMs: 600 };

/* Embedded images (base64 WebP), inlined at build time */
const ASSET = { sheet: '%SHEET%', spider: '%SPIDER%', head: '%HEAD%', fly: '%FLY%' };
