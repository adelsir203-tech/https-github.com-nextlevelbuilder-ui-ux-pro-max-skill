/* ---- Room 2: The line ---- */
function createLine(root) {
  const stage = $('.ln-stage', root);
  const objsEl = $('.ln-objs', stage);
  const rail = $('.ln-rail', root);
  const roll = $('.ln-roll', root);
  const track = $('.ln-roll-track', root);
  const live = $('[data-live]', stage);
  const wait = $('.wait', root);
  const N = LINE.n;

  const items = PRODUCTS.slice(0, N).map((p, i) => {
    const el = h('div', { class: 'ln-obj', 'data-i': i }, h('span', { class: 'ln-shadow' }), crop(p.slot, 'xMidYMax meet'));
    objsEl.append(el);
    const r = aspect(p.slot);
    return { el, r, hs: 1, f: -1, o: -1, z: null };
  });
  for (let i = 0; i <= N; i++) track.append(h('span', null, pad2((i % N) + 1)));

  const heart = () => icon(20, 20, '0 0 24 24', 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z', 1.4);
  const cards = RAIL.flat().map((id) => {
    const p = PRODUCT[id];
    const card = h('article', { class: 'ln-card' },
      h('button', { type: 'button', class: 'ln-heart', 'aria-pressed': 'false', 'aria-label': COPY.like(p.name) }, heart()),
      h('div', { class: 'ln-media' }, crop(p.slot)),
      h('div', { class: 'ln-meta' },
        h('div', null, h('h3', { class: 'ln-name' }, p.name), h('p', { class: 'ln-type' }, p.type), h('p', { class: 'ln-price' }, `от ${money(p.price)}`)),
        h('button', { type: 'button', class: 'ln-plus', 'data-id': p.id, 'aria-label': COPY.addTo(p.name) }, h('i'), h('i'))));
    rail.append(card);
    return card;
  });

  const ring = FINE.matches ? h('div', { class: 'ln-ring', 'aria-hidden': 'true' }) : null;
  if (ring) root.append(ring);

  let p = 0, target = 0, W = 0, H = 0, base = 0, card = 0, rollH = 0, horiz = false;
  let raf = 0, last = 0, ac = null, wheelT = 0, drag = null, lot = 0, roomRect = null;
  const cur = { x: 0, y: 0, tx: 0, ty: 0, on: false };

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    base = LINE.layout * H;
    stage.style.setProperty('--sh', `${base}px`);
    items.forEach((it) => {
      it.hs = Math.min(LINE.hsMax, LINE.hsWidth / it.r, LINE.frontW * W / (LINE.KH[1] * H * it.r));
      it.el.style.width = `${base * it.r}px`;
      it.el.style.height = `${base}px`;
      it.f = -1; it.o = -1; it.z = null;
    });
    horiz = MOBILE.matches;
    card = horiz ? LINE.phoneCard : rail.clientHeight / 3;
    rail.style.setProperty('--card', `${card}px`);
    rollH = roll.clientHeight;
    roomRect = root.getBoundingClientRect();
    render();
  }

  function render() {
    for (let i = 0; i < N; i++) {
      const it = items[i];
      let d = wrap(i - p, N);
      if (d > N - 1) d -= N;
      const k = clamp(d + 1, 0, 6), a = Math.floor(k), b = Math.min(6, a + 1), t = k - a;
      const mix = (A) => A[a] + (A[b] - A[a]) * t;
      const hgt = mix(LINE.KH) * H * it.hs;
      const s = hgt / base, w = hgt * it.r;
      const x = mix(LINE.KX) * W - w / 2, y = mix(LINE.KF) * H - hgt;
      it.el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
      const fr = mix(LINE.KB) / s;
      const f = fr < LINE.blurMin ? 0 : Math.round(fr * 10) / 10;
      if (f !== it.f) { it.f = f; it.el.style.filter = f ? `blur(${f}px)` : 'none'; }
      const o = Math.round(mix(LINE.KO) * 1000) / 1000;
      if (o !== it.o) { it.o = o; it.el.style.opacity = o; }
      const z = 100 - Math.round(d * 10);
      if (z !== it.z) { it.z = z; it.el.style.zIndex = z; }
    }
    const span = 12 * card;
    cards.forEach((c, i) => {
      let v = wrap(i * card - p * 2 * card, span);
      if (v > 11 * card) v -= span;
      c.style.transform = horiz ? `translate3d(${v}px, 0, 0)` : `translate3d(0, ${v}px, 0)`;
    });
    track.style.transform = `translate3d(0, ${-wrap(p, N) * rollH}px, 0)`;
  }

  function ringStep() {
    const k = reduced() ? 1 : LINE.ringLerp;
    cur.x += (cur.tx - cur.x) * k;
    cur.y += (cur.ty - cur.y) * k;
    ring.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
    return Math.hypot(cur.tx - cur.x, cur.ty - cur.y) > .2;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(LINE.dtMax, now - last);
    last = now;
    if (p !== target) {
      if (reduced()) p = target;
      else {
        p += (target - p) * (1 - Math.exp(-dt * LINE.ease));
        if (Math.abs(target - p) < LINE.snap) p = target;
      }
      render();
    }
    const ringMoving = ring ? ringStep() : false;
    if (p !== target || ringMoving) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (raf || !ac) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function setTarget(v) {
    target = v;
    const i = wrap(Math.round(target), N);
    if (i !== lot) {
      lot = i;
      live.textContent = COPY.lotLive(pad2(i + 1), PRODUCTS[i].name);
    }
    kick();
  }

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('a, button')) return;
    drag = { id: e.pointerId, x: e.clientX, start: target, moved: false, obj: e.target.closest('.ln-obj') };
    stage.setPointerCapture(e.pointerId);
    if (ring) ring.classList.add('is-drag');
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) >= LINE.clickPx) drag.moved = true;
    if (!drag.moved) return;
    target = drag.start + dx / Math.max(LINE.dragMin, W * LINE.dragFrac);
    kick();
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d0 = drag;
    drag = null;
    if (ring) ring.classList.remove('is-drag');
    if (!d0.moved && d0.obj && e.type === 'pointerup') {
      const d = Math.round(wrap(+d0.obj.dataset.i - target, N));
      if (d > 0 && d < N) { setTarget(Math.round(target) + d); return; }
    }
    setTarget(Math.round(target));
  }
  function onWheel(e) {
    e.preventDefault();
    target += clamp(e.deltaY + e.deltaX, -LINE.wheelClamp, LINE.wheelClamp) / LINE.wheelDiv;
    kick();
    clearTimeout(wheelT);
    wheelT = setTimeout(() => setTarget(Math.round(target)), LINE.wheelIdle);
  }
  function onKey(e) {
    const s = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!s) return;
    e.preventDefault();
    setTarget(Math.round(target) + s);
  }
  function onRail(e) {
    const hb = e.target.closest('.ln-heart');
    if (hb) { hb.setAttribute('aria-pressed', String(hb.getAttribute('aria-pressed') !== 'true')); return; }
    const plus = e.target.closest('.ln-plus');
    if (!plus) return;
    const prod = PRODUCT[plus.dataset.id];
    try { Bag.add([{ id: prod.id, option: prod.values[0] }]); } catch { toast(COPY.error); }
  }
  function onRoomMove(e) {
    if (e.pointerType !== 'mouse') return;
    cur.tx = e.clientX - roomRect.left;
    cur.ty = e.clientY - roomRect.top;
    // The ring steps aside over links and buttons, as the fly does on Home.
    const on = !e.target.closest('a, button');
    if (on && !cur.on) { cur.x = cur.tx; cur.y = cur.ty; }
    cur.on = on;
    ring.classList.toggle('is-on', on);
    kick();
  }
  function onRoomLeave() {
    cur.on = false;
    ring.classList.remove('is-on');
  }

  return {
    el: root,
    start() {
      ac = new AbortController();
      const o = { signal: ac.signal };
      stage.addEventListener('pointerdown', onDown, o);
      stage.addEventListener('pointermove', onMove, o);
      stage.addEventListener('pointerup', onUp, o);
      stage.addEventListener('pointercancel', onUp, o);
      stage.addEventListener('wheel', onWheel, { passive: false, signal: ac.signal });
      stage.addEventListener('keydown', onKey, o);
      rail.addEventListener('click', onRail, o);
      if (ring) {
        root.addEventListener('pointermove', onRoomMove, o);
        root.addEventListener('pointerleave', onRoomLeave, o);
      }
      lot = wrap(Math.round(target), N);
      layout();
      if (!wait.classList.contains('is-done')) document.fonts.ready.then(() => wait.classList.add('is-done'));
      kick();
    },
    stop() {
      if (ac) ac.abort();
      ac = null;
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(wheelT);
      drag = null;
      if (ring) { onRoomLeave(); ring.classList.remove('is-drag'); }
    },
    resize() { layout(); },
  };
}
