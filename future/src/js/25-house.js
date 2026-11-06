/* ---- Room: the house in fog, morning / evening ---- */
function createHouse(root) {
  const hs = $('.hs', root);
  const cv = $('.hs-fog', root);
  const btns = $$('.hs-toggle button', root);
  const sets = $$('.hs-set', root);
  const docStyle = document.documentElement.style;
  const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  const U = {};
  if (gl) {
    const vs = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;
    const fs = `#version 300 es
precision highp float;
uniform vec2 R,P;uniform float T,S,K;out vec4 O;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);p=mat2(.8,.6,-.6,.8)*p+5.3;for(int i=0;i<5;i++){s+=a*n(p);p=m*p;a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/R;uv.y=1.-uv.y;
  vec2 p=vec2(uv.x*R.x/R.y,uv.y);
  float t=T*.05;
  vec2 w=vec2(fbm(p*1.3+vec2(t,-t*.6)),fbm(p*1.3+vec2(-t*.8,t)+7.));
  float d=fbm(p*1.9+w*1.7+vec2(t*1.6,-t*1.1+S*.5));
  float e=fbm(p*.9-w+vec2(-t,t*.5)+3.);
  float low=smoothstep(.70,1.04,uv.y+(d-.5)*.34);
  float side=(smoothstep(.2,.0,uv.x+(e-.5)*.28)+smoothstep(.8,1.,uv.x+(e-.5)*.28))*smoothstep(.25,.6,uv.y)*.2;
  float wisps=smoothstep(.5,.78,d)*smoothstep(.22,.5,uv.y)*smoothstep(.86,.6,uv.y)*.18;
  float rest=clamp(low+side+wisps,0.,1.);
  float front=1.02-S*.68;
  float rise=smoothstep(front-.02,front+.26,uv.y+(d-.5)*.5);
  float haze=S*(.3+.46*d);
  float a=clamp(max(rest,max(rise*.97,haze)),0.,1.);
  vec3 c=mix(mix(vec3(.79,.78,.71),vec3(.97,.93,.84),d*1.15),mix(vec3(.15,.19,.29),vec3(.40,.45,.57),d*1.1),K);
  vec2 q=(uv-P)*vec2(1.7,2.6);
  c=mix(c,vec3(.86,.55,.27),K*exp(-dot(q,q)*3.2)*.42*(1.-S));
  O=vec4(c*a,a);
}`;
    const shader = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    ['R', 'P', 'T', 'S', 'K'].forEach((u) => { U[u] = gl.getUniformLocation(prog, u); });
  }

  const { SINK, RISE, DEPTH } = HOUSE;
  const smoothR = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let target = 1, from = 1, start = -1e9, queued = null, swapped = true, k = 1, k2 = 1, animating = false;
  const TALL = window.matchMedia(HOUSE.tallQ);
  let raf = 0, ac = null, porch = HOUSE.wide.porch, W = 0, Hh = 0;

  function size() {
    W = innerWidth; Hh = root.clientHeight;
    const img = TALL.matches ? HOUSE.tall : HOUSE.wide, pos = HOUSE.pos;
    const rw = W / Hh > img.aspect ? W : Hh * img.aspect, rh = rw / img.aspect;
    porch = [((W - rw) * pos[0] + img.porch[0] * rw) / W, ((Hh - rh) * pos[1] + img.porch[1] * rh) / Hh];
    if (!gl) return;
    const w = Math.round(Math.min(W, HOUSE.fogMaxW)), hh = Math.round(w * Hh / W);
    if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; gl.viewport(0, 0, w, hh); }
  }
  const show = (n) => { sets[0].classList.toggle('is-on', !n); sets[1].classList.toggle('is-on', !!n); };
  function begin(n, now) { target = n; from = k; start = now; swapped = false; animating = true; }
  function pick(n) {
    if (n === target && queued === null) return;
    btns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === n)));
    if (reduced()) { target = n; k = k2 = n; show(n); draw(performance.now(), 0, 0, 0); return; }
    if (animating) queued = n; else begin(n, performance.now());
  }
  function draw(now, y, s, dip) {
    hs.style.setProperty('--sink', `${(y * Hh).toFixed(1)}px`);
    hs.style.setProperty('--k', k.toFixed(3));
    hs.style.setProperty('--k2', k2.toFixed(3));
    hs.style.setProperty('--dip', dip.toFixed(3));
    docStyle.setProperty('--hk', k.toFixed(3));
    if (!gl) return;
    gl.uniform2f(U.R, cv.width, cv.height);
    gl.uniform2f(U.P, porch[0], porch[1]);
    gl.uniform1f(U.T, reduced() ? 0 : now / 1000);
    gl.uniform1f(U.S, s);
    gl.uniform1f(U.K, k);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const d = now - start;
    let y = 0, s = 0, dip = 0;
    if (animating) {
      if (d < SINK) { const x = d / SINK; y = x * x * (3 - 2 * x) * DEPTH; } else {
        if (!swapped) { swapped = true; show(target); }
        y = Math.pow(1 - clamp((d - SINK) / RISE, 0, 1), 3.4) * DEPTH;
      }
      s = smoothR(0, SINK * .92, d) * (1 - smoothR(SINK + 70, SINK + RISE * .92, d));
      dip = smoothR(30, 190, d) * (1 - smoothR(330, 720, d));
      k = from + (target - from) * smoothR(120, 520, d);
      k2 = from + (target - from) * smoothR(340, 760, d);
      if (d >= SINK + RISE) {
        animating = false; k = k2 = target; y = s = dip = 0;
        const q = queued;
        queued = null;
        if (q !== null && q !== target) begin(q, now);
      }
    }
    draw(now, y, s, dip);
  }

  return {
    el: root,
    start() {
      ac = new AbortController();
      btns.forEach((b, i) => b.addEventListener('click', () => pick(i), { signal: ac.signal }));
      size();
      if (reduced()) draw(performance.now(), 0, 0, 0); else raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf); raf = 0;
      if (ac) ac.abort();
      ac = null;
      if (animating) { animating = false; k = k2 = target; show(target); queued = null; }
      docStyle.removeProperty('--hk');
    },
    resize() { size(); if (reduced()) draw(performance.now(), 0, 0, 0); },
  };
}
