/* ---- Room 3: Kits ---- */
function createKits(root) {
  const kt = $('.kt', root);
  const left = $('.kt-left', root);
  const stage = $('[data-stage]', root);
  const actors = $('.kt-actors', stage);
  const controls = $('.kt-controls', root);
  const live = $('.kt-left > [data-live]', root);
  const lb = $('.lb', root);
  const lbStage = $('.lb-stage', lb);
  const lbKicker = $('.lb-kicker', lb);
  const lbName = $('.lb-name', lb);
  const lbClose = $('.lb-close', lb);
  const panel = $('.kt-panel', root);
  const panelIn = $('.kt-panel-in', root);
  const counts = $$('.kt-count', root);
  const mname = $('.kt-mname', root);
  const n = KITS.length;
  const N = n * Math.ceil(RING.minBodies / n);
  const step = TAU / N;

  /* Figures: three crops on one floor line */
  function figure(k) {
    const kit = KITS[k];
    const fig = h('div', { class: 'fig' });
    kit.pieces.forEach((id, j) => {
      const p = PRODUCT[id];
      const hp = FIG.heights[j];
      const wp = hp * aspect(p.slot) / FIG.aspect;
      fig.append(h('div', { class: 'piece', style: `left:${FIG.cx[j] - wp / 2}%;bottom:${100 - FIG.floor[j]}%;width:${wp}%;height:${hp}%;z-index:${FIG.z[j]};--sh:calc(var(--model-h) * ${hp / 100})` },
        h('span', { class: 'pshadow' }), crop(p.slot, 'xMidYMax meet')));
    });
    return fig;
  }
  const bodies = [];
  for (let a = 0; a < N; a++) {
    const k = a % n;
    let el;
    if (a < n) {
      el = h('div', { class: 'body', 'data-index': a, 'aria-hidden': 'true' }, h('span', { class: 'body-shadow' }), figure(k),
        h('button', { type: 'button', class: 'hit', tabindex: '-1', 'aria-label': COPY.kitLabel(k + 1, KITS[k].name) }));
    } else {
      el = bodies[k].el.cloneNode(true);
      el.dataset.index = a;
      el.dataset.clone = '';
    }
    actors.append(el);
    bodies.push({ el, hit: $('.hit', el), fig: $('.fig', el), o: -1, b: -1, z: null, vis: null, pe: null });
  }

  /* Cursor (fine pointers only) */
  const cursor = FINE.matches
    ? h('div', { class: 'cursor', 'aria-hidden': 'true' }, h('div', { class: 'cursor-ring' }, h('span', { class: 'c-drag' }, COPY.drag), h('span', { class: 'c-view' }, COPY.view)))
    : null;
  if (cursor) stage.append(cursor);

  /* Controls */
  const arrow = (d) => icon(26, 14, '0 0 26 14', d, 1.3);
  const prevBtn = h('button', { type: 'button', class: 'ibtn kt-prev', 'aria-label': COPY.prev }, arrow('M25 7H1M7 1L1 7l6 6'));
  const nextBtn = h('button', { type: 'button', class: 'ibtn kt-next', 'aria-label': COPY.next }, arrow('M1 7h24M19 1l6 6-6 6'));
  const ticks = KITS.map((kit, i) => h('button', { type: 'button', class: 'tick', 'aria-current': 'false', 'aria-label': COPY.kitLabel(i + 1, kit.name) },
    h('span', { class: 'bar' }, h('i')),
    h('span', { class: 'lbl' }, `0${i + 1}`, h('span', { class: 'nm' }, `  ${kit.name}`))));
  let playing = !reduced();
  const toggle = h('button', { type: 'button', class: 'ibtn kt-toggle', 'aria-label': COPY.autoplay, 'aria-pressed': String(playing) },
    icon(14, 14, '0 0 24 24', 'M7 4.5v15l12.5-7.5z', 1.6, 'ib-play'),
    icon(14, 14, '0 0 24 24', 'M6.5 4.5h3.5v15H6.5zM14 4.5h3.5v15H14z', 1.6, 'ib-pause'));
  controls.append(prevBtn, ...ticks, toggle, nextBtn);

  /* Panels */
  const spinner = (s) => icon(s, s, '0 0 24 24', 'M12 3a9 9 0 1 1-9 9', 1.5, 'spin');
  function buildCard(k, id, j) {
    const p = PRODUCT[id];
    const pid = `pick-k${k + 1}-${p.id}`;
    const plus = icon(20, 20, '0 0 24 24', 'M12 4v16M4 12h16', 1.3, 'i-plus');
    const check = icon(20, 20, '0 0 24 24', 'M4.5 12.5l5 5L19.5 7', 1.5, 'i-check');
    const spin = icon(18, 18, '0 0 24 24', 'M12 3a9 9 0 1 1-9 9', 1.5, 'i-spin');
    const add = h('button', { type: 'button', class: 'add', 'aria-expanded': 'false', 'aria-controls': pid, 'aria-label': COPY.addTo(p.name) }, plus, check, spin);
    const pills = p.values.map((v, vi) => h('label', { class: 'pill' },
      h('input', { type: 'radio', name: `opt-k${k + 1}-${p.id}`, value: v, checked: vi === 0 }), h('span', null, v)));
    const picker = h('div', { class: 'picker', id: pid, hidden: true },
      h('fieldset', null, h('legend', null, p.legend), h('div', { class: 'pills' }, ...pills)),
      h('button', { type: 'button', class: 'confirm' }, COPY.confirm, h('span', { class: 'sr-only' }, ` ${p.name}`)));
    const row = h('li', { class: 'row', 'data-card': j + 1, style: `--i:${j + 1}` },
      h('a', { class: 'media', href: '#line', 'aria-hidden': 'true', tabindex: '-1' }, h('span', { class: 'mi' }, crop(p.slot)), h('span', { class: 'num' }, String(j + 1))),
      h('div', { class: 'info' }, h('span', { class: 'type' }, p.type), h('a', { class: 'name', href: '#line' }, p.name), h('span', { class: 'price' }, `от ${money(p.price)}`)),
      add, picker);
    return { k, j, p, row, add, picker, touched: false, added: false, loading: false, option: () => $('input:checked', picker).value };
  }
  const panels = KITS.map((kit, k) => {
    const cards = kit.pieces.map((id, j) => buildCard(k, id, j));
    const list = h('ul', { class: 'kp-list', role: 'list' }, ...cards.map((c) => c.row));
    const msg = h('p', { class: 'kt-msg', role: 'status', hidden: true });
    const sum = kit.pieces.reduce((a, id) => a + PRODUCT[id].price, 0);
    const bundle = Math.round(sum * FIG.discount * 100) / 100;
    const cta = h('button', { type: 'button', class: 'cta' },
      h('span', { class: 'cta-desk' }, COPY.cta), h('span', { class: 'cta-phone' }, COPY.ctaPhone(money(bundle))), h('span', { class: 'cta-done' }, COPY.ctaDone),
      icon(22, 12, '0 0 26 14', 'M1 7h24M19 1l6 6-6 6', 1.3, 'arr'), spinner(16));
    const el = h('div', { class: `kp${k === 0 ? ' is-active is-in' : ''}`, 'data-kit': k }, list,
      h('div', { class: 'kt-bundle' }, msg,
        h('div', { class: 'kt-brow' },
          h('div', null, h('strong', null, COPY.bundleTitle), h('span', { class: 'kt-note' }, COPY.bundleNote)),
          h('div', { class: 'kt-sum' }, h('s', null, money(sum)), h('strong', null, money(bundle)))),
        cta));
    panelIn.append(el);
    return { el, list, msg, cta, cards, complete: false, loading: false };
  });
  const cardOf = (node) => {
    const row = node.closest('.row');
    return row ? panels[+row.closest('.kp').dataset.kit].cards[+row.dataset.card - 1] : sheetCard;
  };

  /* Phone bottom sheet, one at a time */
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'sheet-grab' }));
  const host = h('div', { class: 'sheet-host', hidden: true }, h('div', { class: 'sheet-scrim' }), sheet);
  document.body.append(host);
  let sheetCard = null;

  /* State */
  let index = 0, target = 0, cur = 0, vel = 0;
  let raf = 0, craf = 0, lastT = 0, firstFrame = true, moveAt = 0, firstStart = true;
  let W = 0, H = 0, bodyW = 0, unit = 1, mobile = false, G = null, stageRect = null;
  let frameW = 0, frameLatchH = 0, frameH = 0;
  let engaged = false, panelHover = false, popupOpen = false, dragging = false, visible = false, revealed = false;
  let timer = 0, lbTimer = 0, resizeT = 0, wheelAcc = 0, wheelLock = 0, muteUntil = 0, lbRect = null;
  let ac = null, ro = null, io = null, ioRev = null, ptr = null, hovered = 0;
  const hist = [];
  const adds = new Set();
  const cx = { x: 0, y: 0, tx: 0, ty: 0 };

  function measure() {
    mobile = MOBILE.matches;
    if (mobile) {
      if (innerWidth !== frameW || Math.abs(innerHeight - frameLatchH) >= RING.phoneRelatch || !frameH) {
        frameW = innerWidth; frameLatchH = innerHeight;
        frameH = RING.phoneFrame * innerHeight;
      }
    } else {
      frameW = innerWidth;
      frameH = Math.max(RING.frameMin, innerHeight - $('.hd').offsetHeight);
    }
    kt.style.setProperty('--frame-h', `${frameH}px`);
    W = stage.clientWidth; H = stage.clientHeight;
    let modelH = Math.max(RING.modelMin, Math.round((H - RING.floorPad - RING.headPad) / RING.fs));
    if (mobile) modelH = Math.min(modelH, Math.round(W * FIG.phoneFit / FIG.aspect));
    stage.style.setProperty('--model-h', `${modelH}px`);
    bodyW = modelH * FIG.aspect;
    unit = Math.max(mobile ? RING.unitMinM : RING.unitMin, RING.unitFrac * W);
    G = {
      cx: .5 * W, R: (mobile ? RING.Rm : RING.R) * W, P: (mobile ? RING.Pm : RING.P) * W,
      floor: H - RING.floorPad, horizon: RING.horizon * H,
    };
    stageRect = stage.getBoundingClientRect();
    bodies.forEach((b) => { b.o = -1; b.b = -1; b.z = null; b.vis = null; b.pe = null; });
    renderAll(performance.now());
  }

  /* Follow lag: each body reads cur as it was lag seconds per place in line ago */
  function lagged(now, places) {
    const t = now - RING.lag * 1000 * places;
    if (!hist.length || t >= hist[hist.length - 1][0]) return cur;
    if (t <= hist[0][0]) return hist[0][1];
    for (let i = hist.length - 1; i > 0; i--) {
      const [t0, c0] = hist[i - 1], [t1, c1] = hist[i];
      if (t >= t0) return c0 + (c1 - c0) * ((t - t0) / (t1 - t0 || 1));
    }
    return cur;
  }
  const angle = (a, c) => {
    let phi = wrap((a - c) * step, TAU);
    if (phi > Math.PI) phi -= TAU;
    return phi;
  };
  function put(b, x, bottom, scale, op, blur, z) {
    if (x + bodyW * scale / 2 < -4 || x - bodyW * scale / 2 > W + 4) op = 0;
    b.el.style.transform = `translate3d(${x}px, ${-bottom}px, 0) translateX(-50%) scale(${scale})`;
    const o = Math.round(op * 1000) / 1000;
    if (o !== b.o) {
      b.o = o;
      b.el.style.opacity = o;
      const vis = o < .01 ? 'hidden' : '';
      if (vis !== b.vis) { b.vis = vis; b.el.style.visibility = vis; }
      const pe = o < .5 ? 'none' : '';
      if (pe !== b.pe) { b.pe = pe; b.el.style.pointerEvents = pe; }
    }
    const bl = Math.round(blur * 10) / 10;
    if (bl !== b.b) { b.b = bl; b.el.style.filter = bl > .05 ? `blur(${bl}px)` : ''; }
    if (z !== b.z) { b.z = z; b.el.style.zIndex = z; }
  }
  function renderAll(now) {
    if (!G) return;
    for (let a = 0; a < N; a++) {
      const phi = angle(a, lagged(now, Math.abs(angle(a, cur)) / step));
      const z = G.R * (1 - Math.cos(phi));
      const persp = G.P / (G.P + z);
      const sl = Math.abs(phi) / step;
      const scale = persp * (1 + (RING.fs - 1) * clamp(1 - sl, 0, 1));
      const x = G.cx + G.R * Math.sin(phi) * persp;
      const feet = G.horizon + (G.floor - G.horizon) * persp;
      const blur = sl <= 1 ? RING.blur1 * sl : Math.min(RING.blur1 + (sl - 1) * RING.blurStep, RING.blurMax);
      const op = clamp((Math.cos(phi) + RING.opBase) / RING.opSpan, 0, 1);
      put(bodies[a], x, H - feet, scale, op, blur, Math.round(scale * 1000));
    }
  }

  /* Spring loop */
  function frame(now) {
    raf = 0;
    const dt = firstFrame ? 1 / 60 : Math.min(RING.dtMax, (now - lastT) / 1000);
    firstFrame = false;
    lastT = now;
    if (reduced()) { cur = target; vel = 0; } else {
      const hs = dt / RING.subSteps;
      for (let i = 0; i < RING.subSteps; i++) {
        const acc = -RING.K * (cur - target) - RING.C * vel;
        vel += acc * hs;
        cur += vel * hs;
      }
    }
    const settled = Math.abs(cur - target) <= RING.settle && Math.abs(vel) <= RING.settle;
    if (settled) { cur = target; vel = 0; } else moveAt = now;
    hist.push([now, cur]);
    while (hist.length > 2 && hist[1][0] < now - RING.lag * 1000 * N) hist.shift();
    renderAll(now);
    const lagging = now - moveAt < RING.lag * 1000 * N / 2 + 20;
    if (visible && !document.hidden && (!settled || lagging)) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (raf || !ac || !revealed) return;
    firstFrame = true;
    raf = requestAnimationFrame(frame);
  }

  /* Navigation */
  const rank = (a) => {
    let k = wrap(a - Math.round(target), N);
    if (k > N / 2) k -= N;
    return k;
  };
  function moveTo(T) {
    target = T;
    setIndex(wrap(T, n), false);
    kick();
  }
  const next = () => moveTo(Math.round(target) + 1);
  const prev = () => moveTo(Math.round(target) - 1);
  function go(i) {
    let d = wrap(i - index, n);
    if (d > n / 2) d -= n;
    moveTo(Math.round(target) + d);
  }
  function updateHits() {
    bodies.forEach((b, a) => {
      const k = rank(a);
      const on = k !== 0 && Math.abs(k) <= 2;
      if (on) b.el.removeAttribute('aria-hidden'); else b.el.setAttribute('aria-hidden', 'true');
      b.hit.tabIndex = on ? 0 : -1;
    });
  }
  function setIndex(i, silent) {
    if (i === index && !silent) { updateHits(); return; }
    closePopup();
    closeSheet();
    index = i;
    kt.style.setProperty('--progress', (i + 1) / n);
    if (!silent) {
      if (!reduced()) restart(stage, 'is-sweep');
      live.textContent = COPY.kitLabel(i + 1, KITS[i].name);
    }
    ticks.forEach((t, j) => {
      t.setAttribute('aria-current', String(j === i));
      t.classList.toggle('is-past', j < i);
    });
    panels.forEach((p, j) => p.el.classList.toggle('is-active', j === i));
    if (!silent) {
      restart(panels[i].el, 'is-in');
      counts.forEach((c) => restart(c, 'is-replay'));
    }
    mname.textContent = KITS[i].name;
    hot(0);
    updateHits();
    schedule();
  }

  /* Autoplay */
  function bar() {
    ticks.forEach((t) => t.classList.remove('is-run'));
    void controls.offsetWidth;
    if (playing) ticks[index].classList.add('is-run');
  }
  function schedule() {
    clearTimeout(timer);
    bar();
    if (!playing || !ac) return;
    timer = setTimeout(() => {
      if (playing && visible && !dragging && !document.hidden && !panelHover && !popupOpen && !engaged) next();
      else schedule();
    }, RING.speed);
  }
  function setPlaying(v) {
    playing = v;
    toggle.setAttribute('aria-pressed', String(v));
    schedule();
  }
  function engage() {
    if (engaged) return;
    engaged = true;
    setPlaying(false);
  }

  /* Hot linking between pins and rows */
  function hot(nn, reveal) {
    $$('.is-hot', root).forEach((x) => x.classList.remove('is-hot'));
    if (!nn) return;
    if (popupOpen) $(`.pin[data-n="${nn}"]`, lbStage)?.classList.add('is-hot');
    const p = panels[index];
    const row = p.cards[nn - 1].row;
    row.classList.add('is-hot');
    if (reveal) {
      const behavior = reduced() ? 'auto' : 'smooth';
      if (mobile) p.list.scrollTo({ left: row.offsetLeft - p.list.offsetLeft - 20, behavior });
      else p.list.scrollTo({ top: row.offsetTop - p.list.offsetTop - 12, behavior });
    }
  }

  /* Popup with FLIP grow */
  const at = (a, b) => `translate3d(${a.left - b.left}px, ${a.bottom - b.bottom}px, 0) scale(${a.height / b.height})`;
  const frontBody = () => bodies.find((_, a) => rank(a) === 0);
  function openPopup() {
    if (popupOpen) return;
    engage();
    popupOpen = true;
    clearTimeout(lbTimer);
    const src = frontBody().fig;
    const fig = src.cloneNode(true);
    KITS[index].pieces.forEach((id, j) => {
      const p = PRODUCT[id];
      fig.append(h('button', {
        type: 'button', class: 'pin', 'data-n': j + 1, 'data-tip': p.name, 'aria-label': COPY.pinLabel(j + 1, p.name),
        style: `left:${FIG.cx[j]}%;top:${FIG.floor[j] - FIG.heights[j] * .5}%;--pi:${j + 1}`,
      }, h('span', { class: 'dot', 'aria-hidden': 'true' }, String(j + 1))));
    });
    const model = h('div', { class: 'lb-model' }, fig);
    lbStage.replaceChildren(model);
    const hh = Math.max(RING.lbMin, Math.min(lbStage.clientHeight, lbStage.clientWidth / FIG.aspect));
    model.style.setProperty('--model-h', `${hh}px`);
    lbKicker.textContent = COPY.kicker(index + 1);
    lbName.textContent = KITS[index].name;
    kt.classList.add('rw--zoom');
    lb.setAttribute('aria-hidden', 'false');
    lbRect = fig.getBoundingClientRect();
    if (!reduced()) {
      model.style.transform = at(src.getBoundingClientRect(), lbRect);
      void model.offsetWidth;
      model.classList.add('is-flip');
      model.style.transform = '';
    }
    lbClose.focus({ preventScroll: true });
  }
  function closePopup() {
    if (!popupOpen) return;
    popupOpen = false;
    const model = $('.lb-model', lbStage);
    if (model && !reduced()) model.style.transform = at(frontBody().fig.getBoundingClientRect(), lbRect);
    if (lb.contains(document.activeElement)) stage.focus({ preventScroll: true });
    kt.classList.remove('rw--zoom');
    lb.setAttribute('aria-hidden', 'true');
    clearTimeout(lbTimer);
    lbTimer = setTimeout(() => lbStage.replaceChildren(), RING.lbMs);
    hot(0);
  }

  /* Pickers and adding */
  function openPicker(c, focus) {
    c.picker.hidden = false;
    c.row.classList.add('is-picking');
    c.add.setAttribute('aria-expanded', 'true');
    if (focus) $('input:checked', c.picker).focus({ preventScroll: true });
  }
  function closePicker(c) {
    c.picker.hidden = true;
    c.row.classList.remove('is-picking');
    c.add.setAttribute('aria-expanded', 'false');
  }
  function openSheet(c) {
    closeSheet();
    sheetCard = c;
    sheet.setAttribute('aria-label', c.p.name);
    sheet.append(c.picker);
    host.hidden = false;
    openPicker(c, true);
  }
  function closeSheet() {
    if (!sheetCard) return;
    const c = sheetCard;
    sheetCard = null;
    closePicker(c);
    c.row.append(c.picker);
    host.hidden = true;
  }
  function togglePicker(c) {
    if (c.added || c.loading) return;
    if (mobile) { if (sheetCard === c) closeSheet(); else openSheet(c); return; }
    if (c.picker.hidden) openPicker(c, true); else closePicker(c);
  }
  function showMsg(p, text) {
    p.msg.textContent = text;
    p.msg.hidden = !text;
    if (text) restart(p.msg, 'is-replay');
  }
  function markAdded(c) {
    c.added = true;
    c.row.classList.add('is-added');
    closePicker(c);
    c.add.setAttribute('aria-label', COPY.added(c.p.name));
    c.add.setAttribute('aria-disabled', 'true');
    if (mobile && !reduced() && navigator.vibrate) navigator.vibrate(12);
  }
  function addCards(p, list, viaKit) {
    p.loading = true;
    list.forEach((c) => { c.loading = true; c.row.classList.add('is-loading'); });
    if (viaKit) p.cta.classList.add('is-loading');
    closeSheet();
    const job = () => {
      adds.delete(entry);
      p.loading = false;
      p.cta.classList.remove('is-loading');
      list.forEach((c) => { c.loading = false; c.row.classList.remove('is-loading'); });
      try {
        Bag.add(list.map((c) => ({ id: c.p.id, option: c.option() })));
      } catch {
        showMsg(p, COPY.error);
        return;
      }
      list.forEach(markAdded);
      if (p.cards.length >= 2 && p.cards.every((c) => c.added)) {
        p.complete = true;
        p.el.classList.add('is-complete');
        p.cta.setAttribute('aria-disabled', 'true');
      }
    };
    const entry = { job, t: setTimeout(job, reduced() ? 0 : RING.addMs) };
    adds.add(entry);
  }
  function confirmCard(c) {
    if (c.added || c.loading) return;
    c.touched = true;
    const p = panels[c.k];
    showMsg(p, '');
    addCards(p, [c], false);
  }
  function addKit(p) {
    if (p.complete || p.loading) return;
    showMsg(p, '');
    const ready = p.cards.filter((c) => c.touched && !c.added && !c.loading);
    const pending = p.cards.filter((c) => !c.touched && !c.added);
    if (ready.length) addCards(p, ready, true);
    if (!pending.length) return;
    if (mobile) openSheet(pending[0]);
    else {
      pending.forEach((c, i) => openPicker(c, i === 0));
      p.list.scrollTo({ top: pending[0].row.offsetTop - p.list.offsetTop - 12, behavior: reduced() ? 'auto' : 'smooth' });
    }
    showMsg(p, COPY.choose(pending.map((c) => c.p.name).join(', ')));
  }

  /* Pointer drag / swipe */
  function onDown(e) {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || popupOpen) return;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: target, samples: [{ x: e.clientX, time: e.timeStamp }], drag: false, dead: false };
  }
  function onMove(e) {
    if (!ptr || e.pointerId !== ptr.id || ptr.dead) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    ptr.samples.push({ x: e.clientX, time: e.timeStamp });
    if (ptr.samples.length > RING.samples) ptr.samples.shift();
    if (!ptr.drag) {
      if (Math.abs(dx) > RING.dragStart && Math.abs(dx) > RING.dragRatio * Math.abs(dy)) {
        ptr.drag = true;
        dragging = true;
        stage.classList.add('is-dragging');
        if (cursor) cursor.classList.add('is-drag');
        stage.setPointerCapture(e.pointerId);
      } else {
        if (Math.abs(dy) > RING.abandonY) ptr.dead = true;
        return;
      }
    }
    target = ptr.t - dx / unit;
    kick();
  }
  function onUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p0 = ptr;
    ptr = null;
    if (!p0.drag) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    if (cursor) cursor.classList.remove('is-drag');
    muteUntil = performance.now() + RING.clickMute;
    const s = p0.samples, f = s[0], l = s[s.length - 1];
    const vx = l.time > f.time ? (l.x - f.x) / (l.time - f.time) : 0;
    const from = Math.round(p0.t);
    const dx = e.clientX - p0.x;
    let i;
    if (mobile) {
      const dir = dx ? -Math.sign(dx) : -Math.sign(vx);
      i = Math.abs(dx) > RING.swipePx || Math.abs(vx) > RING.flingV ? from + dir : from;
    } else {
      i = Math.round(target - vx * RING.fling / unit);
      if (i === from && Math.abs(vx) > RING.flingV) i = from - Math.sign(vx);
      i = clamp(i, from - RING.clampSteps, from + RING.clampSteps);
    }
    moveTo(i);
  }
  function onWheel(e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelAcc += e.deltaX;
    if (Math.abs(wheelAcc) > RING.wheelAcc) {
      if (wheelAcc > 0) next(); else prev();
      wheelAcc = 0;
      wheelLock = now + RING.wheelLock;
    }
  }
  function onStageKey(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  }
  function onDocKey(e) {
    if (e.key !== 'Escape') return;
    if (sheetCard) closeSheet(); else closePopup();
  }

  /* Delegated clicks, in priority order */
  function onClick(e) {
    const t = e.target;
    if (performance.now() < muteUntil && stage.contains(t)) { e.preventDefault(); e.stopPropagation(); return; }
    if (t.closest('.lb-close')) { closePopup(); return; }
    if (popupOpen && t.closest('.lb-stage') && !t.closest('.lb-model .fig')) { closePopup(); return; }
    const hit = t.closest('.hit');
    if (hit) {
      const k = rank(+hit.closest('.body').dataset.index);
      if (k === 0) openPopup();
      else if (Math.abs(k) < N / 2) moveTo(Math.round(target) + k);
      return;
    }
    if (t.closest('.kt-next')) { next(); return; }
    if (t.closest('.kt-prev')) { prev(); return; }
    const tick = t.closest('.tick');
    if (tick) { go(ticks.indexOf(tick)); return; }
    if (t.closest('.kt-toggle')) { engaged = false; setPlaying(!playing); return; }
    const pin = t.closest('.pin');
    if (pin) { engage(); hot(+pin.dataset.n, true); return; }
    if (t.closest('.add')) { togglePicker(cardOf(t)); return; }
    if (t.closest('.confirm')) { confirmCard(cardOf(t)); return; }
    if (t.closest('.cta')) addKit(panels[index]);
  }
  function onPanelClick(e) {
    if (e.target.closest('button, a, input, select, label')) engage();
  }
  function onChange(e) {
    engage();
    const c = cardOf(e.target);
    if (c) c.touched = true;
  }
  function onHostClick(e) {
    if (e.target.closest('.sheet-scrim')) { closeSheet(); return; }
    if (!sheetCard) return;
    engage();
    if (e.target.closest('.confirm')) confirmCard(sheetCard);
  }

  /* Drag / View cursor */
  function cursorFrame() {
    craf = 0;
    const k = reduced() ? 1 : RING.cursorLerp;
    cx.x += (cx.tx - cx.x) * k;
    cx.y += (cx.ty - cx.y) * k;
    cursor.style.transform = `translate3d(${cx.x}px, ${cx.y}px, 0)`;
    if (Math.hypot(cx.tx - cx.x, cx.ty - cx.y) >= RING.cursorDone) craf = requestAnimationFrame(cursorFrame);
  }
  function onCursorMove(e) {
    if (e.pointerType !== 'mouse') return;
    cx.tx = e.clientX - stageRect.left;
    cx.ty = e.clientY - stageRect.top;
    if (!cursor.classList.contains('is-on')) {
      cx.x = cx.tx; cx.y = cx.ty;
      cursor.classList.add('is-on');
    }
    const t = e.target;
    const hit = t.closest('.hit');
    const front = !!hit && rank(+hit.closest('.body').dataset.index) === 0;
    cursor.classList.toggle('is-view', front && !dragging);
    cursor.classList.toggle('is-link', !!t.closest('.pin') || (!!hit && !front));
    if (!craf) craf = requestAnimationFrame(cursorFrame);
  }
  function onCursorLeave() {
    cursor.classList.remove('is-on', 'is-link', 'is-view');
  }

  /* Panel hover holds the kit; row hover links to pins */
  function onPanelOver(e) {
    if (e.pointerType !== 'mouse') return;
    panelHover = true;
    const row = e.target.closest('.row');
    const nn = row ? +row.dataset.card : 0;
    if (nn !== hovered) { hovered = nn; hot(nn); }
  }
  function onPanelLeave(e) {
    if (e.pointerType !== 'mouse') return;
    panelHover = false;
    if (hovered) { hovered = 0; hot(0); }
  }

  return {
    el: root,
    start() {
      ac = new AbortController();
      const o = { signal: ac.signal };
      root.addEventListener('click', onClick, o);
      stage.addEventListener('pointerdown', onDown, o);
      stage.addEventListener('pointermove', onMove, o);
      stage.addEventListener('pointerup', onUp, o);
      stage.addEventListener('pointercancel', onUp, o);
      stage.addEventListener('wheel', onWheel, { passive: false, signal: ac.signal });
      stage.addEventListener('keydown', onStageKey, o);
      document.addEventListener('keydown', onDocKey, o);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); }, o);
      panel.addEventListener('click', onPanelClick, o);
      panel.addEventListener('change', onChange, o);
      panel.addEventListener('pointerover', onPanelOver, o);
      panel.addEventListener('pointerleave', onPanelLeave, o);
      host.addEventListener('click', onHostClick, o);
      host.addEventListener('change', onChange, o);
      if (cursor) {
        left.addEventListener('pointermove', onCursorMove, o);
        left.addEventListener('pointerleave', onCursorLeave, o);
      }
      kt.classList.remove('is-revealed');
      revealed = false;
      vel = 0;
      cur = Math.round(target) + (reduced() ? 0 : RING.entrance);
      hist.length = 0;
      measure();
      ro = new ResizeObserver(() => { clearTimeout(resizeT); resizeT = setTimeout(measure, RING.resizeMs); });
      ro.observe(stage);
      io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }, { threshold: 0 });
      io.observe(stage);
      ioRev = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        ioRev.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!ac) return;
          kt.classList.add('is-revealed');
          revealed = true;
          kick();
        }));
      }, { threshold: 0, rootMargin: RING.revealMargin });
      ioRev.observe(kt);
      if (firstStart) { firstStart = false; setIndex(0, true); } else schedule();
    },
    stop() {
      closeSheet();
      closePopup();
      adds.forEach((en) => { clearTimeout(en.t); en.job(); });
      if (ac) ac.abort();
      ac = null;
      cancelAnimationFrame(raf); raf = 0;
      cancelAnimationFrame(craf); craf = 0;
      clearTimeout(timer); clearTimeout(resizeT); clearTimeout(lbTimer);
      lbStage.replaceChildren();
      ro.disconnect(); io.disconnect(); ioRev.disconnect();
      ptr = null; dragging = false; visible = false; panelHover = false; hovered = 0;
      stage.classList.remove('is-dragging');
      if (cursor) cursor.classList.remove('is-on', 'is-link', 'is-view', 'is-drag');
      cur = target; vel = 0;
    },
    resize() { measure(); },
  };
}
