'use strict';

/* /kit/kindlemere-fetch.js: fetch with Asher on the Kindlemere page's meadow. Owner, 2026-10-09: "place Asher in at
   scale and allow the user to play fetch on the page with asher, and the ball bounces off the cards if thrown their way.
   and Asher half the time will come right back to the bottom right of the page and drop the ball, but a quarter of the
   time he runs off somewhere else, and you have to press the call button to get him back, and another quarter of the
   [time], he will come back drop the ball and then immediately pick it back up and spin around with it."
   The meadow (kit/art/kindlemere-meadow.svg) is fixed to the window, so the window is the world: the higher up it a thing
   stands the further off it is, and its size goes with (y / height + E), the rule the meadow is drawn by. Asher
   (kit/art/kindlemere-asher.svg, the park's one dog) waits on the beach in the window's bottom right corner. A click on
   open meadow throws his ball there; the cards, links, buttons, words and the scene keep their clicks. The frame loop
   runs only while something moves. With reduced motion he just sits at home and there is no game.
   ?km-fetch=back|away|spin makes his choice, for checking the page by eye. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const E = 0.04;                     // as MEADOW in kit/art/make-kindlemere.js
  const HOME_T = 0.935;               // his home, on the sand, as a share of the window's height
  const BEACH_T = 0.95;               // nothing goes past the wet sand into the water
  const PAWS = 64, CX = 80, TALL = 112, TAIL = 108, MOUTH = 55, R = 7.5;   // his own frame (kit/art/parts/field-dog.svg)
  const HIP = { x: 30, y: 21 };       // a sit tips his body about the hip, as in the scene (kindlemere-dog.js)
  const POSES = { stand: [0, 0, []], sit: [-32, 30, ['dt-sit']], down: [0, 24, ['dt-down']] };
  const GALLOP = 340;                 // frame units a second: one stride a cycle of the drawing, so his paws never slide
  const GRAVITY = 2400;
  const SAND_T = 0.86;                // on the beach, the nearest ground, he and the ball stand in front of the cards
  const OBSTACLES = '.km-realm, .km-card, .km-foot';
  // what keeps its own clicks: the scene, the cards, the foot's sign, the game's buttons, and every word and control
  const SHUT = '.km-realm, .km-live, .km-card, .km-foot, .km-fetch-tools, .km-fs, a, button, input, select, textarea, label, ' +
    'summary, dialog, [role="button"], h1, h2, h3, p, figcaption, li, nav, .km-name, .km-role';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forced = new URLSearchParams(location.search).get('km-fetch');

  // two layers: the meadow's, under the cards, and the beach's, in front of them
  const layer = document.createElement('div');
  layer.className = 'km-fetch';
  layer.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  layer.appendChild(svg);
  const front = layer.cloneNode(false);
  front.className = 'km-fetch km-fetch-front';
  const frontSvg = document.createElementNS(NS, 'svg');
  front.appendChild(frontSvg);
  document.body.append(layer, front);

  fetch('/kit/art/kindlemere-asher.svg', { credentials: 'same-origin' })
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
    .then(start)
    .catch(() => { layer.remove(); front.remove(); });

  function start(text) {
    const src = new DOMParser().parseFromString(text, 'image/svg+xml');
    const defs = src.querySelector('defs');
    const dogSrc = src.getElementById('ka-dog');
    const ballSrc = src.getElementById('ka-ball');
    if (!defs || !dogSrc || !ballSrc || src.querySelector('parsererror')) { layer.remove(); front.remove(); return; }
    const make = (name, attrs) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    const dogShadow = make('ellipse', { fill: '#1A2433', opacity: '0.16' });
    const ballShadow = make('ellipse', { fill: '#1A2433', opacity: '0.18' });
    const dogEl = document.importNode(dogSrc, true);
    const ballEl = make('g', {});
    ballEl.appendChild(document.importNode(ballSrc, true));
    const dogG = make('g', {}), ballG = make('g', {});
    dogG.append(dogShadow, dogEl);
    ballG.append(ballShadow, ballEl);
    svg.append(document.importNode(defs, true), dogG, ballG);
    const place = (g, y) => { const to = y >= SAND_T * H ? frontSvg : svg; if (g.parentNode !== to) to.appendChild(g); };
    const body = dogEl.querySelector('.dt-body');
    const look = dogEl.querySelector('.dt-look');
    const held = dogEl.querySelector('.dt-held circle');
    const pivot = (look && look.getAttribute('data-pivot')) || '100 6';
    const bodyBase = (body && body.getAttribute('transform')) || '';

    /* ------------------------------------------------------------ the window as the world */
    let W = 0, H = 0, F = 0, home = { x: 0, y: 0 };
    let rects = [], top = 0, dirty = true;
    function measure() {
      W = document.documentElement.clientWidth || window.innerWidth; H = window.innerHeight;
      F = clamp(Math.min(H * 0.12, W * 0.18), 48, 110);          // his height in px at home
      const y = Math.min(HOME_T * H, H - 58);                     // on the sand, above his two buttons
      home = { x: W - 16 - TAIL * k(y), y };                     // facing the meadow, his tail to the corner
      dirty = true;
    }
    const k = (y) => (F / TALL) * (clamp(y / H, 0, 1) + E) / (HOME_T + E);   // px to one unit of his frame, at y
    function readRects() {
      rects = [...document.querySelectorAll(OBSTACLES)].map((el) => el.getBoundingClientRect())
        .filter((r) => r.width && r.height && r.bottom > 0 && r.top < H);
      const bar = document.querySelector('.km-top');
      top = Math.max(0, bar ? bar.getBoundingClientRect().bottom : 0) + 6;
      dirty = false;
    }
    const inside = (x, y, pad) => rects.findIndex((r) => x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad);

    /* ------------------------------------------------------------ Asher and his ball */
    const d = { x: 0, y: 0, face: -1, s: -1, pitch: 0, sink: 0, look: 0, lookTo: 0, hop: 0, pose: 'stand', gait: '' };
    const tween = { t: 1, pitch: 0, sink: 0 };
    const b = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, mode: 'mouth', skip: new Set(), fly: null };
    let state = 'home';     // home, chase, pick, back, drop, regrab, spin, off, away
    let timer = 0, then = 'back', calling = false, offSpot = null;

    function setGait(g) {
      if (d.gait === g) return;
      d.gait = g;
      dogEl.classList.toggle('dt-stand', g === 'stand');
    }
    function setPose(name) {
      if (d.pose === name) return;
      d.pose = name;
      dogEl.classList.remove('dt-sit', 'dt-down');
      for (const c of POSES[name][2]) dogEl.classList.add(c);
      tween.pitch = d.pitch; tween.sink = d.sink; tween.t = reduced ? 1 : 0;
      if (reduced) { d.pitch = POSES[name][0]; d.sink = POSES[name][1]; }
      if (name !== 'stand') setGait('stand');
    }
    function holding(on) {
      b.mode = on ? 'mouth' : b.mode;
      dogEl.classList.toggle('dt-empty', !on);
      ballEl.style.display = on ? 'none' : '';
      ballShadow.style.display = on ? 'none' : '';
    }
    function drop() {
      holding(false);
      const kk = k(d.y);
      b.mode = 'rest'; b.x = d.x + d.s * 66 * kk; b.y = d.y + 2 * kk; b.z = 0; b.vx = b.vy = b.vz = 0;
    }
    function draw() {
      const kk = k(d.y);
      const face = Math.abs(d.face) < 0.08 ? 0.08 * (d.face < 0 ? -1 : 1) : d.face;
      dogEl.setAttribute('transform', `translate(${d.x.toFixed(1)} ${(d.y - d.hop * kk).toFixed(1)}) scale(${(kk * face).toFixed(3)} ${kk.toFixed(3)}) translate(${-CX} ${-PAWS})`);
      if (body) body.setAttribute('transform', `${bodyBase} translate(0 ${d.sink.toFixed(2)}) rotate(${d.pitch.toFixed(1)} ${HIP.x} ${HIP.y})`);
      if (look) look.setAttribute('transform', `rotate(${d.look.toFixed(1)} ${pivot})`);
      dogShadow.setAttribute('cx', d.x.toFixed(1)); dogShadow.setAttribute('cy', d.y.toFixed(1));
      dogShadow.setAttribute('rx', (48 * kk).toFixed(1)); dogShadow.setAttribute('ry', (5 * kk).toFixed(1));
      place(dogG, d.y);
      if (b.mode === 'mouth') return;
      place(ballG, b.y);
      const kb = k(b.y);
      ballEl.setAttribute('transform', `translate(${b.x.toFixed(1)} ${(b.y - (R + b.z) * kb).toFixed(1)}) scale(${kb.toFixed(3)}) rotate(${b.spin.toFixed(0)})`);
      ballShadow.setAttribute('cx', b.x.toFixed(1)); ballShadow.setAttribute('cy', b.y.toFixed(1));
      ballShadow.setAttribute('rx', (R * 0.9 * kb).toFixed(1)); ballShadow.setAttribute('ry', (R * 0.3 * kb).toFixed(1));
    }

    /* ------------------------------------------------------------ the throw */
    // A throw always leaves from his home on the beach: from his mouth or the sand at his paws when he is there, and
    // otherwise from where he would sit; wherever he is, he turns for the new ball. Only when he has run off with it
    // does it take Call Asher first.
    function throwTo(tx, ty) {
      if (state === 'away') return false;
      readRects();
      const atHome = Math.hypot(d.x - home.x, d.y - home.y) < 2;
      let x0 = home.x - 57 * k(home.y), y0 = home.y, z0 = 46;
      if (b.mode === 'mouth' && atHome) {
        const r = held.getBoundingClientRect();
        x0 = r.left + r.width / 2; y0 = d.y; z0 = Math.max(0, (d.y - (r.top + r.height / 2)) / k(d.y) - R);
      } else if (b.mode === 'rest' && Math.hypot(b.x - home.x, b.y - home.y) < 160) { x0 = b.x; y0 = b.y; z0 = 0; }
      ty = clamp(ty, top + 4, BEACH_T * H); tx = clamp(tx, 10, W - 10);
      holding(false);
      const dist = Math.hypot(tx - x0, ty - y0);
      // across the ground in perspective: depth (1 / size) and the sideways distance at size 1 go evenly
      const P0 = y0 / H + E, P1 = ty / H + E;
      b.fly = { Z0: 1 / P0, Z1: 1 / P1, X0: (x0 - W / 2) / P0, X1: (tx - W / 2) / P1, z0, u: 0, dur: clamp(0.45 + dist / 1500, 0.5, 1.25), peak: clamp(dist * 0.32, 40, 240) / (F / TALL) };
      b.mode = 'air'; b.x = x0; b.y = y0; b.z = z0;
      b.skip = new Set(rects.map((r, i) => i).filter((i) => inside(x0, y0 - (R + z0) * k(y0), 0) === i));
      then = forced && ['back', 'away', 'spin'].includes(forced) ? forced : pickWay();
      calling = false;
      d.hop = 0; d.lookTo = 0;
      setPose('stand'); setGait('gallop'); state = 'chase';
      say('');
      wait(false);
      kick();
      return true;
    }
    function pickWay() { const r = Math.random(); return r < 0.5 ? 'back' : r < 0.75 ? 'away' : 'spin'; }

    // The ball, a step: up and over in an arc, then a roll; off a card or the window's edge it bounces, losing speed.
    function ballStep(dt) {
      if (b.mode === 'air') {
        const fl = b.fly;
        const px = b.x, py = b.y - (R + b.z) * k(b.y);
        fl.u = Math.min(1, fl.u + dt / fl.dur);
        const P = 1 / (fl.Z0 + (fl.Z1 - fl.Z0) * fl.u);
        b.x = W / 2 + (fl.X0 + (fl.X1 - fl.X0) * fl.u) * P;
        b.y = (P - E) * H;
        b.z = fl.z0 * (1 - fl.u) + fl.peak * 4 * fl.u * (1 - fl.u);
        b.spin += dt * 540;
        const hit = meet(px, py, b.x, b.y - (R + b.z) * k(b.y), dt);
        if (hit) {
          // off the card, from where it met it, falling now
          b.x = px; b.y = py + R * k(py); b.z = 0;
          b.vx = hit.vx * 0.45; b.vy = hit.vy * 0.45; b.vz = 260;
          b.mode = 'roll';
        } else if (fl.u >= 1) {
          const v = Math.hypot(b.x - px, b.y - py) / Math.max(dt, 1e-3);
          const ang = Math.atan2(b.y - py, b.x - px);
          b.vx = Math.cos(ang) * Math.min(v, 900) * 0.32; b.vy = Math.sin(ang) * Math.min(v, 900) * 0.32;
          b.vz = Math.sqrt(2 * GRAVITY * fl.peak) * 0.3; b.z = 0;
          b.mode = 'roll';
        }
        return true;
      }
      if (b.mode !== 'roll') return false;
      const px = b.x, py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const hit = meet(px, py - R * k(py), b.x, b.y - R * k(b.y), dt);
      if (hit) { b.x = px; b.y = py; b.vx = hit.vx * 0.5; b.vy = hit.vy * 0.5; }
      if (b.x < 10 || b.x > W - 10) { b.x = clamp(b.x, 10, W - 10); b.vx = -b.vx * 0.5; }
      if (b.y < top || b.y > BEACH_T * H) { b.y = clamp(b.y, top, BEACH_T * H); b.vy = -b.vy * 0.5; }
      b.vz -= GRAVITY * dt; b.z += b.vz * dt;
      if (b.z <= 0) { b.z = 0; b.vz = b.vz < -90 ? -b.vz * 0.4 : 0; }
      const fr = Math.exp(-2.6 * dt);
      b.vx *= fr; b.vy *= fr;
      b.spin += (Math.hypot(b.x - px, b.y - py) / (R * k(b.y))) * 57.3 * Math.sign(b.vx || 1);
      if (Math.hypot(b.vx, b.vy) < 8 * k(b.y) && !b.z && !b.vz) { b.mode = 'rest'; return false; }
      return true;
    }
    // Where a step of the ball meets a card it was not already over: its velocity turned back off that face.
    function meet(x0, y0, x1, y1, dt) {
      const pad = R * k(y1);
      // on the beach the ball is in front of the cards: it meets none there, and leaves any it is over before it can
      if (b.y >= SAND_T * H) { const i = inside(x1, y1, pad); if (i >= 0) b.skip.add(i); return null; }
      for (const i of [...b.skip]) if (inside(x1, y1, pad) !== i) b.skip.delete(i);
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (b.skip.has(i) || !(x1 > r.left - pad && x1 < r.right + pad && y1 > r.top - pad && y1 < r.bottom + pad)) continue;
        let vx = (x1 - x0) / Math.max(dt, 1e-3), vy = (y1 - y0) / Math.max(dt, 1e-3);
        if (b.mode === 'roll') { vx = b.vx; vy = b.vy; }
        const across = x0 <= r.left - pad || x0 >= r.right + pad;
        const down = y0 <= r.top - pad || y0 >= r.bottom + pad;
        if (across || !down) vx = -vx;
        if (down || !across) vy = -vy;
        return { vx, vy };
      }
      return null;
    }

    /* ------------------------------------------------------------ Asher, a step */
    function runTo(x, y, dt) {
      const dx = x - d.x, dy = y - d.y;
      const dist = Math.hypot(dx, dy);
      const step = GALLOP * k(d.y) * dt;
      if (Math.abs(dx) > 3) d.s = dx < 0 ? -1 : 1;
      if (dist <= step) { d.x = x; d.y = y; return true; }
      d.x += (dx / dist) * step; d.y += (dy / dist) * step;
      d.hop = 0;
      return false;
    }
    function dogStep(dt) {
      timer += dt;
      if (state === 'chase') {
        // after the ball where it will land, then where it is
        const tx = b.mode === 'air' ? W / 2 + b.fly.X1 / b.fly.Z1 : b.x;
        const ty = b.mode === 'air' ? (1 / b.fly.Z1 - E) * H : b.y;
        setGait('gallop');
        const side = tx >= d.x ? 1 : -1;
        const there = runTo(clamp(tx - side * MOUTH * k(ty), 10, W - 10), ty, dt);
        if (there && b.mode === 'rest') { d.s = side; state = 'pick'; timer = 0; setGait('stand'); }
      } else if (state === 'pick') {
        d.lookTo = 30;
        if (timer > 0.28 && b.mode !== 'mouth') holding(true);
        if (timer > 0.5) { d.lookTo = 0; afterPick(); }
      } else if (state === 'back' || state === 'off') {
        const to = state === 'back' ? home : offSpot;
        setGait('gallop');
        if (runTo(to.x, to.y, dt)) {
          setGait('stand');
          if (state === 'off') { d.s = Math.random() < 0.5 ? -1 : 1; setPose('down'); state = 'away'; say('Asher ran off with the ball. Press Call Asher to bring him back.'); wait(true); }
          else { d.s = -1; setPose('sit'); state = 'drop'; timer = 0; }
        }
      } else if (state === 'drop') {
        if (timer > 0.45 && b.mode === 'mouth') {
          drop();
          if (then !== 'spin' || calling) { state = 'home'; say('Asher brought the ball back.'); } else { state = 'regrab'; timer = 0; }
        }
      } else if (state === 'regrab') {
        // straight back up off the sand, and round he goes with it
        if (timer > 0.5) { setPose('stand'); d.lookTo = 30; }
        if (timer > 0.75) { holding(true); d.lookTo = 0; state = 'spin'; timer = 0; }
      } else if (state === 'spin') {
        const tt = Math.min(1, timer / 1.3);
        d.face = Math.cos(4 * Math.PI * tt) * -1;
        d.hop = 10 * Math.abs(Math.sin(2 * Math.PI * tt));
        if (tt >= 1) { d.face = -1; d.s = -1; d.hop = 0; setPose('sit'); state = 'home'; say('Asher brought the ball back, grabbed it again and spun round with it.'); }
      }
      // a quick turn on the spot, never a run backwards
      if (state !== 'spin') {
        const turn = 7 * dt;
        d.face = Math.abs(d.s - d.face) <= turn ? d.s : d.face + Math.sign(d.s - d.face) * turn;
      }
      if (tween.t < 1) {
        tween.t = Math.min(1, tween.t + dt / 0.28);
        d.pitch = tween.pitch + (POSES[d.pose][0] - tween.pitch) * tween.t;
        d.sink = tween.sink + (POSES[d.pose][1] - tween.sink) * tween.t;
      }
      d.look += (d.lookTo - d.look) * Math.min(1, dt * 12);
      const settled = tween.t >= 1 && Math.abs(d.look - d.lookTo) < 0.5 && d.face === d.s;
      return !((state === 'home' || state === 'away') && settled);
    }
    function afterPick() {
      const way = calling ? 'back' : then;
      if (way === 'away') {
        // somewhere far off on open meadow, where he is no more than a dot or two, best by a way the cards don't hide
        const clear = (x, y) => { for (let i = 1; i <= 12; i += 1) if (inside(d.x + ((x - d.x) * i) / 12, d.y + ((y - d.y) * i) / 12, 0) >= 0) return false; return true; };
        let spot = null, open = null;
        for (let i = 0; i < 60 && !spot; i += 1) {
          const y = rand(Math.max(top + 12, 0.1 * H), Math.max(top + 24, 0.45 * H));
          const x = rand(0.04 * W, 0.96 * W);
          if (inside(x, y, 16) >= 0) continue;
          if (clear(x, y)) spot = { x, y }; else open = open || { x, y };
        }
        offSpot = spot || open || { x: rand(0.1 * W, 0.9 * W), y: Math.max(top + 16, 0.25 * H) };
        state = 'off';
      } else state = 'back';
    }

    /* ------------------------------------------------------------ the loop, only while something moves */
    let raf = 0, last = 0;
    function kick() { if (!raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (dirty) readRects();
      const moving = ballStep(dt) | dogStep(dt);
      draw();
      raf = moving ? requestAnimationFrame(frame) : 0;
    }

    /* ------------------------------------------------------------ the page's side */
    measure();
    d.x = home.x; d.y = home.y;
    setPose('sit'); d.pitch = POSES.sit[0]; d.sink = POSES.sit[1]; tween.t = 1;
    holding(true);
    draw();
    if (reduced) return;

    const tools = document.createElement('div');
    tools.className = 'km-fetch-tools';
    const [throwBtn, callBtn] = ['Throw the ball', 'Call Asher'].map((label) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = label;
      tools.appendChild(el);
      return el;
    });
    const sayEl = document.createElement('p');
    sayEl.className = 'km-fetch-say';
    sayEl.setAttribute('role', 'status');
    tools.appendChild(sayEl);
    document.body.appendChild(tools);
    function say(t) { sayEl.textContent = t; }
    function wait(on) {
      callBtn.classList.toggle('km-fetch-wait', on);
      throwBtn.setAttribute('aria-disabled', String(on));
    }

    // Off with the ball: a throw waits for Call Asher, and the button says so with a hop.
    function nudge() {
      say('Asher has the ball. Press Call Asher to bring him back.');
      callBtn.classList.remove('km-fetch-nudge');
      void callBtn.offsetWidth;
      callBtn.classList.add('km-fetch-nudge');
    }
    throwBtn.addEventListener('click', () => {
      if (state === 'away') { nudge(); return; }
      readRects();
      // a random open spot on the meadow, clear of the cards
      for (let i = 0; i < 30; i += 1) {
        const x = rand(0.05 * W, 0.95 * W), y = rand(Math.max(top + 20, 0.2 * H), 0.8 * H);
        if (inside(x, y, 24) < 0) { throwTo(x, y); return; }
      }
      throwTo(rand(0.1 * W, 0.6 * W), rand(Math.max(top + 20, 0.3 * H), 0.8 * H));
    });
    callBtn.addEventListener('click', () => {
      calling = true;
      wait(false);
      if (state === 'away' || state === 'off') { setPose('stand'); state = 'back'; say('Here he comes.'); }
      kick();
    });
    // A press and release on open meadow, in one spot, throws: a mouse click, a trackpad tap or a finger's tap. A drag,
    // a scroll or a long press does not. Over open meadow the pointer is a hand, so you can see where a throw goes.
    const root = document.documentElement;
    const full = () => root.classList.contains('km-full-on');
    const open = (el) => el instanceof Element && !el.closest(SHUT) && !full();
    let press = null;
    document.addEventListener('pointerdown', (e) => {
      press = e.isPrimary && e.button === 0 && open(e.target) ? { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId } : null;
    });
    document.addEventListener('pointercancel', () => { press = null; });
    document.addEventListener('pointerup', (e) => {
      const p = press;
      press = null;
      if (!p || e.pointerId !== p.id || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 14 || e.timeStamp - p.t > 1200) return;
      if (state === 'away') { nudge(); return; }
      throwTo(e.clientX, e.clientY);
    });
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const aim = open(e.target);
      if (aim !== root.classList.contains('km-fetch-aim')) root.classList.toggle('km-fetch-aim', aim);
    }, { passive: true });
    window.addEventListener('scroll', () => { dirty = true; }, { passive: true });
    window.addEventListener('resize', () => {
      const wasHome = state === 'home' && Math.abs(d.x - home.x) < 1 && Math.abs(d.y - home.y) < 1;
      const off = { x: b.x - d.x, y: b.y - d.y };
      measure();
      if (wasHome) { d.x = home.x; d.y = home.y; if (b.mode === 'rest') { b.x = d.x + off.x; b.y = d.y + off.y; } }
      else { d.x = clamp(d.x, 10, W - 10); d.y = clamp(d.y, 0, BEACH_T * H); b.x = clamp(b.x, 10, W - 10); b.y = clamp(b.y, 0, BEACH_T * H); }
      draw();
    });
  }
}());
