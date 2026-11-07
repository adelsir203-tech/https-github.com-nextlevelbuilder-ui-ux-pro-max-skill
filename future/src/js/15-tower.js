/* ---- Room 1: the tower. Pick a level, fly in, walk room to room ---- */
function createTower(root) {
  const hero = $('.tw', root);
  const zoom = $('.tw-zoom', root);
  const loopV = $('.tw-loop', root);
  const tagText = $('.tw-tag span', root);
  const towerHit = $('.tw-tower', root);
  const panel = $('.tw-panel', root);
  const numBox = $('.tw-num', root);
  const typeEl = $('.tw-type', root);
  const descEl = $('.tw-desc', root);
  const range = $('.tw-slider input', root);
  const knob = $('.tw-knob', root);
  const enterBtn = $('.tw-enter', root);
  const inside = $('.tw-inside', root);
  const still = $('.tw-still', root);
  const shade = $('.tw-shade', root);
  const spotsEl = $('.tw-spots', root);
  const ui = $('.tw-uiwrap', root);
  const backBtn = $('.tw-back', root);
  const backLabel = $('.tw-back span', root);
  const skipBtn = $('.tw-skip', root);
  const kick = $('.tw-kick', root), title = $('.tw-copy h2', root), text = $('.tw-text', root), facts = $('.tw-facts', root);
  const copyEl = $('.tw-copy', root);
  const roomBtns = $$('.tw-rooms button', root);
  const C = TOWER.copy, F0 = TOWER.first, F1 = TOWER.last;
  const floorTop = (L) => TOWER.base - (L - 3) * TOWER.slab;

  let level = 0, typeIdx = -1, keyboard = false, mode = 'tower', room = 'hall', busy = false, skipped = false, entered = false;
  let ac = null, playing = null, panelAnim = null, pushAnim = null;

  /* ---------- level ---------- */
  const typeOf = (L) => TOWER.types.findIndex((t) => L >= t.from && L <= t.to);
  const rise = (el, delay = 0) => { if (!reduced()) el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay, easing: 'ease-out', fill: 'backwards' }); };
  function setLevel(L) {
    L = clamp(L, F0, F1);
    zoom.style.setProperty('--fy', floorTop(L));
    tagText.textContent = C.level(L);
    knob.style.left = `${(L - F0) / (F1 - F0) * 100}%`;
    range.value = L;
    if (L !== level) {
      const b = $('b', numBox);
      b.textContent = L;
      if (level && !reduced()) b.animate([{ transform: 'translateY(18%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    const ti = typeOf(L);
    if (ti !== typeIdx) {
      const changed = typeIdx >= 0;
      typeIdx = ti;
      typeEl.textContent = TOWER.types[ti].type;
      descEl.textContent = TOWER.types[ti].desc;
      if (changed) { rise(typeEl); rise(descEl, 50); }
    }
    level = L;
  }
  function levelAt(clientY) {
    const r = towerHit.getBoundingClientRect();
    const y = TOWER.hitTop + (clientY - r.top) / r.height * TOWER.hitH;
    return clamp(Math.floor((TOWER.base - y) / TOWER.slab) + 4, F0, F1);
  }

  /* ---------- media ---------- */
  const url = (key) => TOWER.media[key];
  const images = {};
  function image(key) {
    if (!images[key]) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url(key);
      images[key] = { img, ready: img.decode().catch(() => {}) };
    }
    return images[key];
  }
  const Q = (() => {
    const clips = {}, order = [];
    let active = 0;
    function pump() {
      while (active < 2 && order.length) {
        const c = clips[order.shift()];
        c.state = 'loading';
        active += 1;
        // the whole clip in memory, so playback never waits on the network; the direct URL if that fails
        const load = fetch(url(c.key), { mode: 'cors' })
          .then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
          .then((b) => URL.createObjectURL(b))
          .catch(() => url(c.key));
        load.then((src) => {
            const v = h('video', { class: 'tw-film', muted: true, playsinline: true, preload: 'auto', 'aria-hidden': 'true' });
            v.muted = true;
            v.src = src;
            inside.insertBefore(v, shade);
            c.v = v;
            c.state = 'done';
            active -= 1;
            pump();
          });
      }
    }
    function want(key, urgent) {
      if (!clips[key]) clips[key] = { key, state: 'idle', v: null };
      const c = clips[key];
      if (c.state !== 'idle') return;
      const i = order.indexOf(key);
      if (i >= 0) order.splice(i, 1);
      if (urgent) order.unshift(key); else order.push(key);
      pump();
    }
    function ready(key, ms) {
      want(key, true);
      const t0 = performance.now();
      return new Promise((res) => {
        const check = () => {
          const c = clips[key];
          if (c.v && c.v.readyState >= 4) { res(c.v); return; }
          if (performance.now() - t0 > ms) { res(null); return; }
          setTimeout(check, 50);
        };
        check();
      });
    }
    const all = () => Object.values(clips).filter((c) => c.v).map((c) => c.v);
    return { want, ready, all };
  })();
  const queueRooms = () => {
    TOWER.rooms.forEach((r) => Q.want(`${r}-in`, false));
    TOWER.rooms.forEach((r) => Q.want(`${r}-out`, false));
  };

  /* ---------- playback with a speed curve ---------- */
  const s = (x) => x * x * (3 - 2 * x);
  const rateAt = (p, [a, b, c]) => (p < .25 ? a + (b - a) * s(p / .25) : p > .62 ? b + (c - b) * s((p - .62) / .38) : b);
  const profile = (name) => TOWER.profiles[name];
  function fade(el, to, ms, delay = 0) {
    el.style.transition = ms ? `opacity ${ms}ms ease ${delay}ms` : 'none';
    el.style.opacity = to;
  }
  function play(v, prof, fadeIn) {
    return new Promise((resolve) => {
      let raf = 0, timer = 0, done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        clearTimeout(timer);
        v.removeEventListener('ended', finish);
        playing = null;
        resolve();
      };
      v.currentTime = 0;
      v.playbackRate = prof[0];
      v.addEventListener('ended', finish);
      fade(v, 1, fadeIn || 0);
      const tick = () => {
        const p = v.duration ? v.currentTime / v.duration : 0;
        v.playbackRate = rateAt(p, prof);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      timer = setTimeout(finish, ((v.duration || 2.5) / Math.min(prof[0], prof[2]) + 1.5) * 1000);
      playing = { v, finish };
      v.play().catch(finish);
    });
  }
  function showSkip() {
    skipBtn.hidden = false;
    skipBtn.style.opacity = 0;
    requestAnimationFrame(() => fade(skipBtn, 1, 200, 250));
  }
  const hideSkip = () => { skipBtn.hidden = true; };
  const frames = (n) => new Promise((res) => { const step = (k) => (k ? requestAnimationFrame(() => step(k - 1)) : res()); step(n); });
  const timeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
  async function settle(key) {
    const im = image(key);
    await timeout(im.ready, 5000);
    still.style.backgroundImage = `url("${url(key)}")`;
    still.dataset.view = key;
    fade(still, 1, 0);
    await frames(2);
    Q.all().forEach((v) => { fade(v, 0, 0); v.pause(); });
    hideSkip();
  }

  /* ---------- inside copy, hotspots, bar ---------- */
  function fill() {
    const t = TOWER.types[typeIdx];
    const view = room === 'hall' ? { kicker: C.level(level), title: C.hallTitle(level, t.type), text: t.desc, facts: t.facts } : { kicker: `${C.level(level)} · ${t.type}`, ...C.views[room] };
    kick.textContent = view.kicker;
    title.textContent = view.title;
    text.textContent = view.text;
    facts.replaceChildren(...view.facts.map((f) => h('li', null, f)));
    backLabel.textContent = room === 'hall' ? C.backOut : C.backHall;
    roomBtns.forEach((b) => b.setAttribute('aria-current', String(b.dataset.room === room)));
    spotsEl.hidden = room !== 'hall';
    placeSpots();
  }
  const spots = TOWER.rooms.map((r) => {
    const b = h('button', { type: 'button', class: 'tw-spot', 'data-room': r, 'aria-label': C.spot[r] }, h('i', { class: 'tw-dot', 'aria-hidden': 'true' }), h('span', null, C.views[r].label));
    spotsEl.append(b);
    return b;
  });
  function placeSpots() {
    const W = inside.clientWidth, Hh = inside.clientHeight, [iw, ih] = TOWER.still;
    const sc = Math.max(W / iw, Hh / ih), dw = iw * sc, dh = ih * sc;
    const pos = MOBILE.matches ? TOWER.phonePos.hall : .5;
    const ox = (W - dw) * pos, oy = (Hh - dh) / 2;
    spots.forEach((b) => {
      const [fx, fy] = TOWER.spots[b.dataset.room];
      const x = ox + fx * dw, y = oy + fy * dh;
      b.style.left = `${x}px`;
      b.style.top = `${y}px`;
      b.hidden = x < 20 || x > W - 20;
    });
  }
  function showUI() {
    fill();
    [shade, ui].forEach((el) => fade(el, 1, reduced() ? 0 : 300));
    fade(spotsEl, 1, reduced() ? 0 : 300, 80);
    ui.classList.add('is-on'); spotsEl.classList.add('is-on');
    if (!reduced()) copyEl.animate([{ transform: 'translateY(20px)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
    if (keyboard) backBtn.focus({ preventScroll: true });
  }
  function hideUI(ms = 140) {
    [ui, spotsEl, shade].forEach((el) => fade(el, 0, reduced() ? 0 : ms));
    ui.classList.remove('is-on'); spotsEl.classList.remove('is-on');
  }

  /* ---------- enter, rooms, back ---------- */
  async function enter() {
    if (mode !== 'tower' || busy) return;
    busy = true; mode = 'inside'; room = 'hall'; skipped = false;
    document.body.classList.add('is-inside');
    image('hall');
    if (reduced()) {
      fade(panel, 0, 0);
      inside.classList.add('live', 'solid');
      await settle('hall');
      loopV.pause();
      showUI();
      busy = false;
      return;
    }
    Q.want('in', true); Q.want('fly', true); queueRooms();
    if (panelAnim) panelAnim.cancel();
    panelAnim = panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
    inside.classList.add('live');
    fade(still, 0, 0);
    zoom.style.transformOrigin = `${TOWER.originX}% ${(floorTop(level) + 11) / 900 * 100}%`;
    pushAnim = zoom.animate([{ transform: 'scale(1)' }, { transform: `scale(${TOWER.push})` }], { duration: 320, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
    const fly = await Q.ready('fly', 2500);
    if (fly) {
      showSkip();
      setTimeout(() => inside.classList.add('solid'), 240);
      await play(fly, profile('fly'), 220);
      const inV = !skipped && await Q.ready('in', 2500);
      if (inV) { fade(inV, 1, 0); fade(fly, 0, 0); await play(inV, profile('in')); }
      await settle('hall');
    } else {
      inside.classList.add('solid');
      await settle('hall');
      still.animate([{ transform: `scale(${TOWER.push})`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    pushAnim.cancel();
    zoom.classList.remove('on');
    loopV.pause();
    showUI();
    busy = false;
  }
  async function walk(r, dir) {
    const key = `${r}-${dir}`;
    const v = await Q.ready(key, 15000);
    if (v && !skipped) { showSkip(); fade(v, 1, 0); await play(v, profile('walk')); }
    await settle(dir === 'in' ? r : 'hall');
  }
  async function goRoom(target) {
    if (busy || mode !== 'inside' || target === room) return;
    busy = true; skipped = false;
    hideUI();
    image(target === 'hall' ? 'hall' : target);
    if (reduced()) { room = target; await settle(target); showUI(); busy = false; return; }
    if (room !== 'hall') { await walk(room, 'out'); room = 'hall'; }
    if (target !== 'hall') {
      skipped = false;
      await walk(target, 'in');
      room = target;
      Q.want(`${target}-out`, true);
    }
    showUI();
    busy = false;
  }
  function stepOutside() {
    if (busy || mode !== 'inside') return;
    hideUI();
    mode = 'tower';
    document.body.classList.remove('is-inside');
    inside.classList.remove('solid');
    if (panelAnim) { panelAnim.cancel(); panelAnim = null; }
    if (reduced()) {
      inside.classList.remove('live');
      fade(still, 0, 0);
      fade(panel, 1, 0);
      if (keyboard) enterBtn.focus({ preventScroll: true });
      return;
    }
    playLoop();
    zoom.style.transformOrigin = `${TOWER.originX}% ${(floorTop(level) + 11) / 900 * 100}%`;
    zoom.animate([{ transform: `scale(${TOWER.back})` }, { transform: 'none' }], { duration: 950, easing: 'cubic-bezier(.2,.7,.2,1)' });
    panel.animate([{ opacity: 0 }, { opacity: 0, offset: .35 }, { opacity: 1 }], { duration: 750, easing: 'ease-out' });
    fade(still, 0, 450);
    setTimeout(() => { if (mode === 'tower') inside.classList.remove('live'); }, 450);
    if (keyboard) enterBtn.focus({ preventScroll: true });
  }
  const back = () => (room === 'hall' ? stepOutside() : goRoom('hall'));
  function skip() {
    skipped = true;
    if (playing) { playing.v.pause(); playing.finish(); }
  }

  /* ---------- scene loop and the opening ---------- */
  function playLoop() {
    if (reduced()) return;
    if (!loopV.src) loopV.src = url('loop');
    loopV.play().catch(() => {});
  }
  loopV.addEventListener('playing', () => loopV.classList.add('on'), { once: true });
  function opening() {
    if (entered) return;
    entered = true;
    hero.classList.remove('pre');
    if (reduced()) return;
    zoom.animate([{ transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 2200, easing: 'cubic-bezier(.2,.7,.2,1)' });
    panel.animate([{ opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 900, delay: 250, easing: 'ease-out', fill: 'backwards' });
    [...panel.children].forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 450 + i * 80, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
  }

  setLevel(TOWER.start);
  const lightOn = () => zoom.classList.add('on');
  const lightOff = () => { if (document.activeElement !== range) zoom.classList.remove('on'); };

  return {
    el: root,
    start() {
      ac = new AbortController();
      const o = { signal: ac.signal };
      towerHit.addEventListener('pointermove', (e) => { lightOn(); setLevel(levelAt(e.clientY)); }, o);
      towerHit.addEventListener('pointerleave', lightOff, o);
      towerHit.addEventListener('click', (e) => { setLevel(levelAt(e.clientY)); enter(); }, o);
      range.addEventListener('input', () => setLevel(+range.value), o);
      range.addEventListener('focus', lightOn, o);
      range.addEventListener('blur', () => zoom.classList.remove('on'), o);
      range.addEventListener('keydown', (e) => { if (e.key === 'Enter') enter(); }, o);
      enterBtn.addEventListener('click', enter, o);
      backBtn.addEventListener('click', back, o);
      skipBtn.addEventListener('click', skip, o);
      spotsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-room]'); if (b) goRoom(b.dataset.room); }, o);
      roomBtns.forEach((b) => b.addEventListener('click', () => goRoom(b.dataset.room), o));
      document.addEventListener('keydown', (e) => { keyboard = true; if (e.key === 'Escape' && mode === 'inside') back(); }, o);
      document.addEventListener('pointerdown', () => { keyboard = false; }, o);
      if (mode === 'inside') document.body.classList.add('is-inside'); else playLoop();
      document.fonts.ready.then(opening);
      setTimeout(opening, 2500);
      // fetch the fly-in once the page is idle, so it never competes with the plate
      const idle = window.requestIdleCallback || ((f) => setTimeout(f, 0));
      if (!reduced()) setTimeout(() => idle(() => { Q.want('fly', false); Q.want('in', false); }, { timeout: 700 }), 1500);
      placeSpots();
    },
    stop() {
      if (ac) ac.abort();
      ac = null;
      loopV.pause();
      if (playing) skip();
      document.body.classList.remove('is-inside');
    },
    resize() { placeSpots(); },
  };
}
