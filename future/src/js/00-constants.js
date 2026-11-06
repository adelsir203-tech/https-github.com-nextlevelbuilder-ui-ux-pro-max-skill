/* ---- Constants: every number, table and string of the site lives here ---- */
const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

const COPY = {
  bundleTitle: 'Участок целиком',
  bundleNote: 'Все три постройки — на 10% дешевле',
  cta: 'Добавить участок в подборку',
  ctaPhone: (price) => `Участок — ${price}`,
  ctaDone: 'Участок в подборке',
  kicker: (n) => `Участок 0${n}`,
  choose: (names) => `Выберите вариант: ${names}`,
  error: 'Не получилось добавить. Попробуйте ещё раз.',
  toastOne: 'Добавлено в подборку',
  toastKit: 'Участок в подборке',
  bagEmpty: 'Подборка пуста. Выберите вариант у постройки, чтобы добавить её.',
  subtotal: (amount) => `Ориентировочно ${amount}`,
  shortlistHead: 'future company — подборка',
  shortlistNote: 'Цены ориентировочные; заказ и оплата не оформлены.',
  bagLine: (option, qty, price) => `${option} · ${qty} шт. · ${price}`,
  shortLine: (name, option, qty) => `${name} · ${option} · ${qty} шт.`,
  remove: (name) => `Убрать: ${name}`,
  addTo: (name) => `Добавить в подборку: ${name}`,
  added: (name) => `В подборке: ${name}`,
  confirm: 'В подборку',
  kitLabel: (n, name) => `Участок ${n}: ${name}`,
  pinLabel: (n, name) => `${n}: ${name}`,
  drag: 'Тяни',
  view: 'Вид',
  pickFirst: 'Сначала выберите вариант.',
  lotLive: (n, name) => `Проект ${n}: ${name}`,
  like: (name) => `В избранное: ${name}`,
  prev: 'Предыдущий участок',
  next: 'Следующий участок',
  autoplay: 'Автопрокрутка',
};

const PRODUCTS = [
  { id: 'barn-124', name: 'Барн 124', type: 'Барнхаус · 124 м²', price: 8400000, legend: 'Стены', values: ['Каркас', 'Газобетон', 'Клеёный брус'], slot: 0 },
  { id: 'nord-96', name: 'Норд 96', type: 'Одноэтажный · 96 м²', price: 6300000, legend: 'Фасад', values: ['Планкен', 'Фиброцемент', 'Штукатурка'], slot: 1 },
  { id: 'sosny-148', name: 'Сосны 148', type: 'Два этажа · 148 м²', price: 10200000, legend: 'Отделка', values: ['Черновая', 'Предчистовая', 'Чистовая'], slot: 2 },
  { id: 'shalash-82', name: 'Шалаш 82', type: 'А-фрейм · 82 м²', price: 5600000, legend: 'Стеклопакеты', values: ['Однокамерные', 'Двухкамерные', 'Энергосберегающие'], slot: 3 },
  { id: 'kub-110', name: 'Куб 110', type: 'Плоская кровля · 110 м²', price: 7700000, legend: 'Терраса', values: ['Без террасы', '18 м²', '32 м²'], slot: 4 },
  { id: 'tihiy-176', name: 'Тихий 176', type: 'Длинный дом · 176 м²', price: 11900000, legend: 'Отопление', values: ['Газ', 'Электричество', 'Тепловой насос'], slot: 5 },
  { id: 'banya-24', name: 'Баня 24', type: 'Баня · 24 м²', price: 1450000, legend: 'Печь', values: ['Дровяная', 'Электрическая'], slot: 6 },
  { id: 'besedka-16', name: 'Беседка 16', type: 'Беседка · 16 м²', price: 690000, legend: 'Кровля', values: ['Ламели', 'Поликарбонат', 'Металл'], slot: 7 },
];
const PRODUCT = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const BAG = { key: 'future-company-bag-v1', maxQty: 20, maxEntries: 50, toastMs: 2500 };

/* Sheet: logical 1440 x 960, rendered at 2x; slots [x, y, w, h] */
const SHEET = {
  w: 1440, h: 960, alpha: 8,
  slots: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [(i % 3) * 480, Math.floor(i / 3) * 320, 480, 320]),
};

/* Shell */
const ROOMS = ['home', 'house', 'line', 'kits', 'faq'];
const WIPE = { ms: 900, easing: 'cubic-bezier(.65,0,.35,1)', r: '150vmax' };

/* The line: a street of six houses. Houses are wide, so each height factor is
   capped by width: HS = min(hsMax, hsWidth / aspect). */
const LINE = {
  n: 6,
  KX: [1.2, .744, .496, .346, .235, .15, .085],
  KF: [1.14, .89, .777, .704, .651, .616, .59],
  KH: [1.18, .832, .574, .436, .334, .258, .19],
  KB: [0, 0, 1.5, 4, 8, 12, 17],
  KO: [1, 1, 1, 1, .86, .5, 0],
  hsMax: .52, hsWidth: .64, frontW: .78,
  layout: 1.2, ease: .0072, snap: .0004, dtMax: 50,
  dragMin: 150, dragFrac: .2, clickPx: 6,
  wheelClamp: 120, wheelDiv: 420, wheelIdle: 150,
  blurMin: .2, ringLerp: .32, phoneCard: 160,
};
const RAIL = [
  ['barn-124', 'banya-24'], ['nord-96', 'besedka-16'], ['sosny-148', 'banya-24'],
  ['shalash-82', 'besedka-16'], ['kub-110', 'banya-24'], ['tihiy-176', 'besedka-16'],
];

/* Plots: a gazebo, a house and a banya on one lawn */
const KITS = [
  { name: 'Семейный', house: 'sosny-148' },
  { name: 'У воды', house: 'shalash-82' },
  { name: 'Для двоих', house: 'nord-96' },
  { name: 'Тихий', house: 'tihiy-176' },
  { name: 'Северный', house: 'barn-124' },
  { name: 'Выходные', house: 'kub-110' },
].map((k) => ({ ...k, pieces: ['besedka-16', k.house, 'banya-24'] }));
const FIG = { aspect: .75, cx: [17, 50, 84], heights: [25, 46, 29], floor: [96, 85, 96], z: [1, 0, 2], discount: .9, phoneFit: .9 };
const RING = {
  speed: 5000, K: 95, C: 2 * Math.sqrt(95), lag: .04, entrance: -1.15, fs: 1.08,
  subSteps: 3, dtMax: .034, settle: .0005, minBodies: 8,
  R: .62, Rm: .72, P: 1.65, Pm: 1.9, floorPad: 34, headPad: 18, horizon: .36,
  unitFrac: .3, unitMin: 120, unitMinM: 90,
  blur1: 1.8, blurStep: 2, blurMax: 6.5, opBase: .55, opSpan: .3,
  dragStart: 8, dragRatio: 1.2, abandonY: 10, samples: 6, swipePx: 30, flingV: .3, fling: 160, clampSteps: 2, clickMute: 60,
  wheelAcc: 45, wheelLock: 520, cursorLerp: .18, cursorDone: .2,
  frameMin: 380, phoneFrame: .84, phoneRelatch: 160, modelMin: 200, resizeMs: 120, lbMs: 950, lbMin: 160,
  revealMargin: '0px 0px -22% 0px',
  addMs: 420,
};

/* The house in fog: morning / evening */
const HOUSE = {
  SINK: 240, RISE: 820, DEPTH: .27,
  fogMaxW: 960, wide: { aspect: 16 / 9, porch: [.6504, .6294] }, tall: { aspect: 9 / 16, porch: [.6998, .6305] },
  pos: [.5, .62], tallQ: '(max-aspect-ratio: 3/4)',
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
  shadow: { colour: 'rgba(52,40,18,.36)', blur: 3.5, x: 7, y: 11 },
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
