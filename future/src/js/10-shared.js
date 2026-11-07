/* ---- Shared helpers ---- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (x, n) => ((x % n) + n) % n;
const RM = window.matchMedia(RM_Q);
const FINE = window.matchMedia(FINE_Q);
const MOBILE = window.matchMedia(MOBILE_Q);
const reduced = () => RM.matches;

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
  el.append(...kids);
  return el;
}
function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}
function icon(w, hgt, vb, d, sw, cls) {
  const svg = svgEl('svg', { viewBox: vb, width: w, height: hgt, 'aria-hidden': 'true', focusable: 'false' });
  if (cls) svg.setAttribute('class', cls);
  svg.append(svgEl('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  return svg;
}
const NUM = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const MLN = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const money = (n) => (n >= 1e6 ? `${MLN.format(n / 1e6)}\u00a0млн\u00a0₽` : `${NUM.format(n)}\u00a0₽`);
const pad2 = (n) => String(n).padStart(2, '0');
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

/* ---- The objects sheet: decoded once, trimmed by alpha, shared by every crop ---- */
const Sheet = { url: '', boxes: [] };

async function loadSheet() {
  const img = new Image();
  img.src = ASSET.sheet;
  await img.decode();
  const k = img.naturalWidth / SHEET.w;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const W = c.width;
  Sheet.boxes = SHEET.slots.map(([sx, sy, sw, sh]) => {
    const x0 = Math.round(sx * k), y0 = Math.round(sy * k), x1 = Math.round((sx + sw) * k), y1 = Math.round((sy + sh) * k);
    let minX = x1, minY = y1, maxX = x0, maxY = y0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (data[(y * W + x) * 4 + 3] > SHEET.alpha) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { x: minX / k, y: minY / k, w: (maxX + 1 - minX) / k, h: (maxY + 1 - minY) / k };
  });
  const bin = atob(ASSET.sheet.slice(ASSET.sheet.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  Sheet.url = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
}

/* Nested-SVG crop: nothing outside the trimmed box can ever show */
function crop(slot, par = 'xMidYMid meet') {
  const b = Sheet.boxes[slot];
  const vb = `${b.x} ${b.y} ${b.w} ${b.h}`;
  const outer = svgEl('svg', { viewBox: vb, preserveAspectRatio: par, 'aria-hidden': 'true', focusable: 'false' });
  const inner = svgEl('svg', { x: b.x, y: b.y, width: b.w, height: b.h, viewBox: vb });
  inner.append(svgEl('image', { href: Sheet.url, x: 0, y: 0, width: SHEET.w, height: SHEET.h }));
  outer.append(inner);
  return outer;
}
const aspect = (slot) => Sheet.boxes[slot].w / Sheet.boxes[slot].h;

/* ---- Toast ---- */
const toast = (() => {
  const el = $('#toast');
  let timer = 0;
  return (msg) => {
    const dialog = $('#bag-dialog');
    const host = dialog.open ? dialog : document.body;
    if (el.parentNode !== host) host.append(el);
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('is-on'), BAG.toastMs);
  };
})();

/* ---- Bag: a local shortlist ---- */
const Bag = (() => {
  let items = [];
  const dialog = $('#bag-dialog');
  const list = $('.bd-list', dialog);
  const total = $('.bd-total', dialog);
  const copyBtn = $('.bd-copy', dialog);
  const valid = (e) => e && PRODUCT[e.id] && PRODUCT[e.id].values.includes(e.option)
    && Number.isInteger(e.quantity) && e.quantity >= 1 && e.quantity <= BAG.maxQty;

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(BAG.key) || '[]');
      if (Array.isArray(raw)) items = raw.filter(valid).slice(0, BAG.maxEntries).map(({ id, option, quantity }) => ({ id, option, quantity }));
    } catch {
      items = [];
    }
  }
  function save() {
    try { localStorage.setItem(BAG.key, JSON.stringify(items)); } catch { /* the page works without storage */ }
  }
  function count() {
    const n = items.reduce((a, e) => a + e.quantity, 0);
    $$('[data-bag-count]').forEach((el) => { el.textContent = `(${n})`; });
  }
  function render() {
    list.replaceChildren();
    if (!items.length) list.append(h('p', { class: 'bd-empty' }, COPY.bagEmpty));
    let sum = 0;
    items.forEach((e, i) => {
      const p = PRODUCT[e.id];
      sum += p.price * e.quantity;
      const rm = h('button', { type: 'button', class: 'bd-remove', 'aria-label': COPY.remove(p.name) }, '×');
      rm.addEventListener('click', () => { items.splice(i, 1); save(); render(); count(); });
      list.append(h('div', { class: 'bd-row' }, crop(p.slot),
        h('div', null, h('h3', null, p.name), h('p', null, COPY.bagLine(e.option, e.quantity, money(p.price * e.quantity)))), rm));
    });
    total.textContent = COPY.subtotal(money(sum));
    copyBtn.disabled = !items.length;
  }
  function add(picks) {
    for (const it of picks) {
      const p = PRODUCT[it.id];
      if (!p || !p.values.includes(it.option)) throw new Error(COPY.pickFirst);
    }
    for (const it of picks) {
      const e = items.find((x) => x.id === it.id && x.option === it.option);
      if (e) e.quantity = Math.min(BAG.maxQty, e.quantity + 1);
      else if (items.length < BAG.maxEntries) items.push({ id: it.id, option: it.option, quantity: 1 });
    }
    save(); render(); count();
    toast(picks.length > 1 ? COPY.toastKit : COPY.toastOne);
  }

  const open = () => { render(); dialog.showModal(); };
  $('.bag-btn').addEventListener('click', open);
  $('.bd-close', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const t = $('#toast');
    if (t.parentNode === dialog) document.body.append(t);
  });
  copyBtn.addEventListener('click', () => {
    const text = [COPY.shortlistHead, '', COPY.shortlistNote, '',
      ...items.map((e) => COPY.shortLine(PRODUCT[e.id].name, e.option, e.quantity))].join('\n');
    try {
      navigator.clipboard.writeText(text).catch(() => toast(COPY.error));
    } catch {
      toast(COPY.error);
    }
  });

  load(); count();
  return { add, open };
})();

/* ---- Rooms, routing and the wipe ---- */
const Router = (() => {
  const rooms = {};
  let current = null, outgoing = null, anim = null, origin = null;

  const idFromHash = () => {
    const id = location.hash.slice(1);
    return ROOMS.includes(id) ? id : 'home';
  };
  function setNav(id) {
    document.body.dataset.room = id;
    $$('.hd nav a').forEach((a) => {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }
  function hide(id) {
    const el = rooms[id].el;
    el.classList.remove('is-shown');
    el.inert = true;
    el.style.zIndex = '';
  }
  function finish() {
    if (anim) { anim.onfinish = null; anim.cancel(); anim = null; }
    if (outgoing) { hide(outgoing); rooms[outgoing].stop(); outgoing = null; }
  }
  function go(id, first) {
    if (id === current) return;
    finish();
    const prev = current;
    current = id;
    setNav(id);
    const el = rooms[id].el;
    el.classList.add('is-shown');
    el.inert = false;
    el.style.zIndex = 2;
    if (prev) {
      rooms[prev].el.style.zIndex = 1;
      rooms[prev].leave?.();
    }
    rooms[id].start({ first });
    if (!prev) return;
    outgoing = prev;
    const [x, y] = origin || [innerWidth / 2, innerHeight / 2];
    origin = null;
    if (reduced()) { finish(); return; }
    anim = el.animate(
      [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${WIPE.r} at ${x}px ${y}px)` }],
      { duration: WIPE.ms, easing: WIPE.easing },
    );
    anim.onfinish = () => { anim = null; finish(); };
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    if (e.detail > 0) {
      const r = a.getBoundingClientRect();
      origin = [r.left + r.width / 2, r.top + r.height / 2];
    } else origin = null;
  }, true);
  window.addEventListener('hashchange', () => go(idFromHash(), false));
  window.addEventListener('resize', () => { if (current) rooms[current].resize(); });

  return {
    register(id, mod) { rooms[id] = mod; mod.el.inert = true; mod.el.classList.remove('is-shown'); },
    start() { go(idFromHash(), true); },
  };
})();
