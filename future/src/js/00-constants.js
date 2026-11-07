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

/* The tower: floor geometry measured on the rendered plate, in pixels of the 1440 x 900 frame
   (floors: [top, bottom] for levels 4..32; x: tower edges; spots: doorways on the hall still) */
/* Tower media: stills through the Higgsfield image proxy, videos straight from the CDN */
const TW_BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';
const twImg = (f) => `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(TW_BASE + f)}&w=2400&q=85`;
const twVid = (f) => TW_BASE + f;
const TOWER = {
  first: 4, last: 32, start: 9,
  // floor L's top edge in frame pixels is base − (L − 3) × slab; the hit box spans the 29 slabs
  base: 670.2, slab: 21.58, hitTop: 44.4, hitH: 625.8, originX: 47.8,
  push: 1.12, back: 2.2, still: [2688, 1520],
  profiles: { fly: [2.2, 3.6, 3.0], in: [3.0, 3.4, 1.7], walk: [2.4, 3.6, 1.7] },
  rooms: ['kitchen', 'bath', 'bedroom'],
  spots: { kitchen: [.22, .36], bath: [.505, .36], bedroom: [.745, .36] },
  phonePos: { hall: .5, kitchen: .38, bath: .45, bedroom: .55 },
  media: {
    loop: twVid('hf_20261107_152829_a8127cb8-e6b4-4267-98d7-e54c6cabfd94.mp4'),
    fly: twVid('hf_20261107_012400_0461ff8c-bb51-4afe-ad75-1bbd674dd3b1.mp4'),
    in: twVid('hf_20261107_014258_61746a5d-b98d-49f7-a84a-c8f1b333cf6c.mp4'),
    hall: twImg('hf_20261107_014046_1db8be00-cb7e-4643-bb1f-ae530ddae2f0.png'),
    kitchen: twImg('hf_20261107_014151_6f33c13e-6e41-4f4c-86f0-07885871cc46.png'),
    bath: twImg('hf_20261107_014152_8b6873d7-3836-4e9b-8173-7663da456a71.png'),
    bedroom: twImg('hf_20261107_014151_2450b5e6-3faf-474c-87be-cd61957d0c93.png'),
    'kitchen-in': twVid('hf_20261107_014300_cf88f6e8-0957-444f-a562-13615f468409.mp4'),
    'bath-in': twVid('hf_20261107_014253_7a8dd00c-7726-474f-8cdf-5d8e17232ff0.mp4'),
    'bedroom-in': twVid('hf_20261107_014301_688c9564-7cbc-4637-83a7-bbf841dcb7f5.mp4'),
    'kitchen-out': twVid('hf_20261107_014303_727ca462-f73b-4552-95f9-172a8ea681f3.mp4'),
    'bath-out': twVid('hf_20261107_014303_d32b6ebf-a232-4e44-b75c-67a346a0c560.mp4'),
    'bedroom-out': twVid('hf_20261107_014259_e9a58c74-71b9-4873-924c-2414f0e81c34.mp4'),
  },
  types: [
    { from: 4, to: 11, type: 'Одна спальня', desc: 'Спокойная современная квартира с видом на озеро и собственным балконом.', facts: ['72 м²', '1 санузел', 'Восточный свет'] },
    { from: 12, to: 19, type: 'Две спальни', desc: 'Гостиная выходит на террасу, обе спальни смотрят на озеро.', facts: ['118 м²', '2 санузла', 'Угловая терраса'] },
    { from: 20, to: 27, type: 'Три спальни', desc: 'Широкая угловая квартира: изогнутое стекло с трёх сторон и тихий кабинет.', facts: ['164 м²', '3 санузла', 'Озеро и холмы'] },
    { from: 28, to: 32, type: 'Пентхаус', desc: 'Целый этаж, открытый небу, и собственный бассейн над туманом.', facts: ['290 м²', '4 санузла', 'Бассейн на крыше'] },
  ],
  copy: {
    level: (n) => `Этаж ${n}`,
    hallTitle: (n, type) => `Этаж ${n}, ${type.toLowerCase()}`,
    backOut: 'Выйти на улицу',
    backHall: 'Назад в гостиную',
    spot: { kitchen: 'Пройти на кухню', bath: 'Пройти в ванную', bedroom: 'Пройти в спальню' },
    views: {
      kitchen: { label: 'Кухня', title: 'Кухня', text: 'Три мягких светильника над длинным островом из травертина, дубовые шкафы и окно на озеро.', facts: ['Каменный остров', 'Три стула', 'Окно на озеро'] },
      bath: { label: 'Ванная', title: 'Каменная ванная', text: 'Отдельностоящая ванна из травертина у самого стекла, тёплый свет и неспешные утра.', facts: ['Травертин', 'Глубокая ванна', 'Вид на озеро'] },
      bedroom: { label: 'Спальня', title: 'Главная спальня', text: 'Просыпайтесь над туманом: всё озеро в окне прямо у кровати.', facts: ['Большая кровать', 'Лёгкие шторы', 'Сторона рассвета'] },
    },
  },
};

/* Embedded image (base64 WebP), inlined at build time */
const ASSET = { sheet: '%SHEET%' };
