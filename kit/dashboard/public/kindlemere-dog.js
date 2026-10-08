'use strict';

/**
 * /kit/kindlemere-dog.js: the dog of Kindlemere, alive in every view of the realm (kit/REALM.md). /kit/kit.js loads it
 * before the live scene; the scene hands it its own dog, and Tumble's room hands it the person's dog (its fetch.js).
 *
 * Owner, 2026-10-08: "I was hoping the fetch game would work in the full kindlemere view, not just in the lakeside
 * fieldview. So I press the dog in the full view, ball drops and I could throw it up the hill or to the orchard and the
 * dog would go fetch it. Also the dog runs in place a lot. Needs more natural rhythm of movement." And: "dog running
 * backwards is another fix".
 *
 * The dog lives in world units on the scene's characters layer, on the ground the art marks out (data-km-walk: the
 * Orchard's meadow, the hill's face to its top, the Field and the shallows; data-km-shore: the water's edge). Nearer the
 * front is bigger. It always faces the way it goes and turns on the spot to change direction, and its legs keep pace
 * with its feet: a gallop, a trot, a walk, or standing still.
 *
 *   on its own     it splashes along the shallows and shakes off, trots about the Field, sniffs, sits and looks about,
 *                  lies down, drinks at its bowl, has a mad minute now and then, and goes to sit by Tumble
 *   tap the dog    it drops the ball at its feet and waits, panting
 *   drag the ball  it watches; held 2 s it sits; held 10 s within its reach it jumps up and takes it
 *   throw it       a flick sends it across the scene: up the hill, into the Orchard, out on the lake; it lands, bounces
 *                  and rolls (or floats back in to the shallows); the dog runs for it, picks it up, brings it back to
 *                  where you threw from, drops it and waits for the next throw
 *   keyboard       the dog is a button: Enter or Space drops the ball, and again throws it
 *
 * Reduced motion: the same game without the travel. No network, no storage: it only moves shapes on this page.
 *
 *   window.kindlemereDog.attach(svg, dogEl, { say, chatty }) -> the game, or null when the dog or the ground is missing
 *     svg     the scene's characters layer (world units; its viewBox is the camera)
 *     dogEl   the dog: the field dog's drawing (.dt-body, .dt-look[data-pivot], .dt-held circle, .dt-pupil)
 *   game: setPaused(on), state(), show(cmd), beg(), wake(), asleep(), visit(points), home(), busy()
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const PAWS = 64;               // the dog's paws, in its own frame
  const CX = 80;                 // the middle of its body, in its own frame (tail root 10, nose 150)
  const MOUTH = 55;              // from its middle to its mouth when it dips to the ground, in its frame
  const HIP = { x: 30, y: 21 };  // poses tip the body about the hip
  const POSES = {
    stand: { pitch: 0, sink: 0, cls: [] },
    sit: { pitch: -32, sink: 30, cls: ['dt-sit'] },
    paw: { pitch: -32, sink: 30, cls: ['dt-sit', 'dt-paw'] },
    down: { pitch: 0, sink: 24, cls: ['dt-down'] },
    bow: { pitch: 16, sink: 6, cls: ['dt-bow'] },
  };
  const SPEED = { gallop: 340, trot: 150, walk: 72 };   // world units a second at the front of the scene: about a stride a cycle
  const GRAVITY = 1500;
  const SIT_AFTER = 2, LEAP_AFTER = 10, OFFER_FOR = 25, AWAKE_FOR = 120;
  const BANK = 88;               // the cut face of the bank, from the grass lip down to the water (world units)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const chance = (p) => Math.random() < p;
  const nums = (s) => String(s || '').trim().split(/[\s,]+/).map(Number);
  const pairs = (s) => { const n = nums(s); const out = []; for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]); return out.filter((p) => p.every(Number.isFinite)); };
  // Nearer the front is bigger: the keepers' own scale by where they stand (1 at y 1180, a third on the hill's top).
  const depth = (y) => clamp(1 - (1180 - y) * 0.00078, 0.3, 1.3);
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ---------------------------------------------------------------- the ground */
  function groundOf(svg) {
    const host = svg.querySelector('[data-km-walk]');
    if (!host) return null;
    const poly = pairs(host.getAttribute('data-km-walk'));
    const shore = pairs(host.getAttribute('data-km-shore'));
    if (poly.length < 3 || shore.length < 2) return null;
    function inside(x, y) {
      let on = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) on = !on;
      }
      return on;
    }
    // The outline's top and bottom at x (its back edge and the far side of the shallows).
    function span(x) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
        const [x1, y1] = poly[j];
        const [x2, y2] = poly[i];
        if (x < Math.min(x1, x2) || x > Math.max(x1, x2)) continue;
        const y = x1 === x2 ? Math.min(y1, y2) : y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
        const y2b = x1 === x2 ? Math.max(y1, y2) : y;
        lo = Math.min(lo, y);
        hi = Math.max(hi, y2b);
      }
      return [lo, hi];
    }
    function water(x) {
      for (let i = 1; i < shore.length; i += 1) {
        const [x0, y0] = shore[i - 1];
        const [x1, y1] = shore[i];
        if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-6, x1 - x0);
      }
      return shore[shore.length - 1][1];
    }
    // ground: on the grass; bank: on the cut face (nothing rests there); shallow: in the water by the bank; lake: out
    // on the water; off: behind the back of the land, or off the world.
    function where(x, y) {
      const w = water(x);
      if (inside(x, y)) {
        if (y > w + 1) return 'shallow';
        if (y > w - BANK + 4) return 'bank';
        return 'ground';
      }
      if (y > w) return 'lake';
      return 'off';
    }
    // A point on the ground near p: in the same column when it can be.
    function snap(x, y) {
      const [lo, hi] = span(x);
      if (!Number.isFinite(lo)) return [x, y];
      let yy = clamp(y, lo + 6, hi - 6);
      const w = water(x);
      if (yy > w - BANK + 4 && yy < w + 4) yy = yy < w - BANK / 2 ? w - BANK + 2 : w + 8; // never on the cut face
      return inside(x, yy) ? [x, yy] : [x, lo + 10];
    }
    return { inside, span, water, where, snap };
  }

  /* ---------------------------------------------------------------- ways across it */
  // Turning points on the paths and the open ground, world units; the ones not on this scene's ground drop out.
  const NODES = [[300, 1240], [640, 1222], [1010, 1190], [1200, 1214], [1450, 1232], [1600, 1236], [1900, 1236], [2080, 1216],
    [2330, 1196], [2600, 1214], [2900, 1188], [3080, 1196], [1296, 1104], [1420, 980], [1520, 800], [1600, 560], [1650, 440],
    [1800, 700], [1960, 920], [2060, 1080], [2700, 1408], [2400, 1416], [2100, 1430], [1800, 1404], [1300, 1408], [800, 1412], [400, 1412]];

  function router(ground) {
    const nodes = NODES.filter(([x, y]) => ground.inside(x, y));
    const memo = new Map();
    function clear(a, b) {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(d / 16));
      for (let i = 1; i < n; i += 1) {
        const t = i / n;
        if (!ground.inside(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
      }
      return true;
    }
    const nodeClear = (i, j) => {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!memo.has(k)) memo.set(k, clear(nodes[i], nodes[j]));
      return memo.get(k);
    };
    // The way from a to b: straight when the ground allows, else the shortest way through the turning points.
    return function route(a, b) {
      if (clear(a, b)) return [b];
      const pts = [a, ...nodes, b];
      const n = pts.length;
      const dist = new Array(n).fill(Infinity);
      const prev = new Array(n).fill(-1);
      const done = new Array(n).fill(false);
      dist[0] = 0;
      for (;;) {
        let u = -1;
        for (let i = 0; i < n; i += 1) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0 || dist[u] === Infinity || u === n - 1) break;
        done[u] = true;
        for (let v = 1; v < n; v += 1) {
          if (done[v] || v === u) continue;
          const ok = u === 0 || v === n - 1 ? clear(pts[u], pts[v]) : nodeClear(u - 1, v - 1);
          if (!ok) continue;
          const alt = dist[u] + Math.hypot(pts[v][0] - pts[u][0], pts[v][1] - pts[u][1]);
          if (alt < dist[v]) { dist[v] = alt; prev[v] = u; }
        }
      }
      if (dist[n - 1] === Infinity) return [b];
      const way = [];
      for (let v = n - 1; v > 0; v = prev[v]) way.unshift(pts[v]);
      return way;
    };
  }

  /* ---------------------------------------------------------------- one dog */
  function attach(svg, dogEl, opts) {
    const o = opts || {};
    const ground = svg && groundOf(svg);
    const body = dogEl && dogEl.querySelector('.dt-body');
    const look = dogEl && dogEl.querySelector('.dt-look');
    const held = dogEl && dogEl.querySelector('.dt-held');
    const heldBall = held && held.querySelector('circle');
    const pivot = look && nums(look.getAttribute('data-pivot'));
    if (!ground || !body || !look || !heldBall || !pivot || pivot.length !== 2 || pivot.some(Number.isNaN)) return null;
    const at = nums(dogEl.getAttribute('data-home')).length === 2 ? nums(dogEl.getAttribute('data-home'))
      : (/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/.exec(dogEl.getAttribute('transform') || '') || []).slice(1).map(Number);
    if (at.length !== 2 || at.some(Number.isNaN)) return null;
    const home = { x: at[0] + CX, y: at[1] + PAWS };
    const route = router(ground);
    const bodyBase = body.getAttribute('transform') || '';
    const R = +heldBall.getAttribute('r') || 7.5;
    const MOUTH_AT = { x: +heldBall.getAttribute('cx'), y: +heldBall.getAttribute('cy') };
    const REST = (Math.atan2(MOUTH_AT.y - pivot[1], MOUTH_AT.x - pivot[0]) * 180) / Math.PI;
    const scene = svg.parentNode || svg;
    const say = (text, always) => { if (text && (o.chatty || always) && typeof o.say === 'function') o.say(text); };
    const sc = (y) => depth(y) / depth(home.y);
    // The game stays in what the camera shows (the whole realm, or a place's view as cropped to the page), a finger's
    // width in from its edges. The scene keeps the camera's box and its pixels to a world unit on the layer
    // (data-km-view, data-km-scale), so nothing here measures the page while it moves.
    const unitPx = () => +svg.getAttribute('data-km-scale') || 1;
    let viewKey = null;
    let view = { x0: 30, x1: 3170, y0: 40, y1: 1760 };
    const bounds = () => {
      const key = svg.getAttribute('data-km-view');
      if (key === viewKey) return view;
      viewKey = key;
      const v = nums(key);
      if (v.length !== 4 || !(v[2] > 0)) return view;
      const edge = Math.max(30, 26 / unitPx());
      view = { x0: v[0] + edge, x1: v[0] + v[2] - edge, y0: v[1] + edge, y1: v[1] + v[3] - Math.max(20, edge) };
      return view;
    };

    // The keeper, for "come" and for sitting by it, and its eyes, which follow the ball (Tumble watches too).
    const keeperActor = svg.querySelector('[data-km-actor="dog-training"]');
    const keeperAt = keeperActor ? nums(keeperActor.getAttribute('data-km-home')) : null;
    const keeper = svg.querySelector('[id$="km-keeper-dog-training"]');
    const keeperEyes = keeper ? [...keeper.querySelectorAll('circle')]
      .filter((c) => (c.getAttribute('fill') || '').toUpperCase() === '#1A2433' && +c.getAttribute('r') >= 3 && +c.getAttribute('r') <= 5 && !c.closest('.km-night-only'))
      .map((c) => {
        const gEl = document.createElementNS(NS, 'g');
        const light = c.nextElementSibling && c.nextElementSibling.tagName === 'circle' ? c.nextElementSibling : null;
        c.parentNode.insertBefore(gEl, c);
        gEl.appendChild(c);
        if (light) gEl.appendChild(light);
        // its place in the keeper's drawing, measured once; the frame loop adds the keeper's own transform
        let local = null;
        try { local = keeperActor ? keeperActor.getCTM().inverse().multiply(gEl.getCTM()) : null; } catch (_) { local = null; }
        return { g: gEl, x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), local };
      }) : [];
    const toWorld = (el, x, y) => { try { return new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse().multiply(el.getScreenCTM())); } catch (_) { return { x, y }; } };
    // A keeper's eye in the world, from the keeper's transform attribute (as kindlemere.js walks it): no layout read.
    function eyeAt(e) {
      if (!e.local) return toWorld(e.g, e.x, e.y);
      let m = new DOMMatrix();
      for (const t of keeperActor.transform.baseVal) m = m.multiply(t.matrix);
      return new DOMPoint(e.x, e.y).matrixTransform(m.multiply(e.local));
    }

    /* ---------- the dog's body ---------- */
    const pupils = [...dogEl.querySelectorAll('.dt-pupil')];
    const d = {
      x: home.x, y: home.y, s: 1, face: 1, v: 0, gait: '', pose: 'stand', pitch: 0, sink: 0, px: HIP.x, py: HIP.y,
      look: 0, lookTo: 0, hop: 0, way: [], rush: 1, shake: 0, spin: 0, pace: 0.3,
    };
    const tween = { pitch: 0, sink: 0, t: 1 };
    let legs = [];        // the running legs' animations, for the gait in legsFor (legPace)
    let legsFor = '';
    let pace = 1;
    dogEl.setAttribute('tabindex', '0');
    dogEl.setAttribute('role', 'button');
    if (!dogEl.getAttribute('aria-label')) dogEl.setAttribute('aria-label', 'Play fetch with the dog');
    dogEl.setAttribute('pointer-events', 'visiblePainted');
    dogEl.style.cursor = 'pointer';
    // A finger-sized target round the dog and the ball, however small the scene is drawn (44 px across at least).
    const pad = document.createElementNS(NS, 'rect');
    pad.setAttribute('fill', 'transparent');
    dogEl.insertBefore(pad, dogEl.firstChild);
    const finger = (k) => 44 / (unitPx() * k);   // 44 px, in the units of something drawn at depth scale k
    // Write an attribute only when it changes: a dog at rest touches nothing, so the page has nothing to redraw.
    const put = (el, name, v) => { if (el.getAttribute(name) !== v) el.setAttribute(name, v); };

    function drawDog() {
      const k = sc(d.y);
      const f44 = finger(k);
      const pw = Math.max(170, f44);
      const ph = Math.max(84, f44);
      put(pad, 'x', (CX - pw / 2).toFixed(0));
      put(pad, 'y', (PAWS + 6 - ph).toFixed(0));
      put(pad, 'width', pw.toFixed(0));
      put(pad, 'height', ph.toFixed(0));
      const f = Math.abs(d.face) < 0.08 ? 0.08 * (d.face < 0 ? -1 : 1) : d.face;
      const jiggle = d.shake > 0 ? Math.sin(d.shake * 70) * 7 * Math.min(1, d.shake * 2) : 0;
      put(dogEl, 'transform', `translate(${d.x.toFixed(1)} ${(d.y - d.hop * k).toFixed(1)}) scale(${(k * f).toFixed(3)} ${k.toFixed(3)}) translate(${-CX} ${-PAWS})`);
      put(body, 'transform', `${bodyBase} translate(0 ${d.sink.toFixed(2)}) rotate(${(d.pitch + jiggle).toFixed(1)} ${d.px} ${d.py})`);
      put(look, 'transform', `rotate(${d.look.toFixed(1)} ${pivot[0]} ${pivot[1]})`);
    }
    function setGait(g) {
      if (d.gait === g) return;
      d.gait = g;
      legsFor = '';   // a new gait is new animations
      dogEl.classList.remove('dt-trot', 'dt-walk', 'dt-stand');
      if (g !== 'gallop') dogEl.classList.add(`dt-${g}`);
    }
    function setPose(name) {
      if (d.pose === name) return;
      d.pose = name;
      dogEl.classList.remove('dt-sit', 'dt-paw', 'dt-down', 'dt-bow');
      for (const c of POSES[name].cls) dogEl.classList.add(c);
      tween.pitch = d.pitch; tween.sink = d.sink; tween.t = reduced.matches ? 1 : 0;
      d.px = HIP.x; d.py = HIP.y;
      if (name !== 'stand') setGait('stand');
      if (reduced.matches) { d.pitch = POSES[name].pitch; d.sink = POSES[name].sink; }
    }
    // The neck in the world, for where it looks.
    const neck = () => { const k = sc(d.y); return { x: d.x + (pivot[0] - CX) * k * (d.face < 0 ? -1 : 1), y: d.y - d.hop * k + (pivot[1] - PAWS) * k }; };
    // Look at a point: the head turns (within its reach), the eyes follow, and Tumble's eyes follow too.
    function watch(x, y, turn) {
      const n = neck();
      const side = d.face < 0 ? -1 : 1;
      if (turn && Math.abs(x - n.x) > 40 * sc(d.y)) d.s = x < n.x ? -1 : 1;
      const ang = (Math.atan2(y - n.y, (x - n.x) * side) * 180) / Math.PI;
      d.lookTo = (x - n.x) * side < 0 ? 0 : clamp(ang - REST - d.pitch, -40, 40);
      eyesOn = true;
      const ux = clamp(((x - n.x) * side) / 40, -1, 1);
      const uy = clamp((y - n.y) / 40, -1, 1);
      for (const p of pupils) p.setAttribute('transform', `translate(${(ux * 1.1).toFixed(2)} ${(uy * 1.1).toFixed(2)})`);
      for (const e of keeperEyes) {
        const c = eyeAt(e);
        e.g.setAttribute('transform', `translate(${(clamp((x - c.x) / 50, -1, 1) * 1.8).toFixed(2)} ${(clamp((y - c.y) / 50, -1, 1) * 2).toFixed(2)})`);
      }
    }
    let eyesOn = true;
    function ahead() {
      d.lookTo = 0;
      if (!eyesOn) return;
      eyesOn = false;
      for (const p of pupils) p.setAttribute('transform', '');
      for (const e of keeperEyes) e.g.setAttribute('transform', '');
    }

    // Walk a way (a list of points) in a gait: it speeds up and slows down, faces where it goes, and turns on the spot
    // when it has to go back the way it came. Returns true on arrival.
    function goTo(x, y, gait, rush) {
      const [tx, ty] = ground.snap(x, y);
      d.way = route([d.x, d.y], [tx, ty]);
      d.rush = rush || 1;
      setPose('stand');
      setGait(gait);
    }
    function stride(dt) {
      const p = d.way[0];
      if (!p) { d.v = 0; setGait('stand'); return true; }
      const k = sc(d.y);
      const vmax = SPEED[d.gait === 'stand' ? 'walk' : d.gait] * k * d.rush;
      let left = Math.hypot(p[0] - d.x, p[1] - d.y);
      for (let i = 1; i < d.way.length; i += 1) left += Math.hypot(d.way[i][0] - d.way[i - 1][0], d.way[i][1] - d.way[i - 1][1]);
      const acc = vmax / 0.4;
      d.v = Math.min(vmax, d.v + acc * dt, Math.sqrt(2 * acc * left) + 10 * k);
      const dx = p[0] - d.x;
      const dy = p[1] - d.y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) > 3) d.s = dx > 0 ? 1 : -1;
      const turning = Math.abs(d.face - d.s) > 0.6;
      const step = (turning ? 0.15 : 1) * d.v * dt;
      if (step >= dist) { d.x = p[0]; d.y = p[1]; d.way.shift(); } else { d.x += (dx / dist) * step; d.y += (dy / dist) * step; }
      // the bank: a bound between the grass and the water
      const w = ground.water(d.x);
      d.hop = d.y > w - BANK && d.y < w ? 30 * Math.sin((Math.PI * (d.y - (w - BANK))) / BANK) : 0;
      if (!d.way.length) { d.v = 0; d.hop = 0; setGait('stand'); return true; }
      return false;
    }
    // Its legs keep pace with its feet: the stride slows as it slows and turns, so it never runs on the spot.
    function legPace(rate) {
      // a new gait, or the dog was moved in the page (drawn by depth), which starts its animations over
      if (legsFor !== d.gait || (legs.length && legs[0].playState === 'idle')) {
        legsFor = d.gait;
        legs = typeof dogEl.getAnimations === 'function'
          ? dogEl.getAnimations({ subtree: true }).filter((a) => /^dt-(fu|fl|hu|hl|rock|flop|steady)/.test(a.animationName || ''))
          : [];
        pace = 0;
      }
      if (Math.abs(rate - pace) < 0.06) return;
      pace = rate;
      for (const a of legs) a.playbackRate = rate;
    }
    const wet = () => d.y > ground.water(d.x) + 1;

    /* ---------- the ball ---------- */
    const shade = document.createElementNS(NS, 'ellipse');
    shade.setAttribute('fill', '#1A2433');
    shade.setAttribute('pointer-events', 'none');
    shade.style.display = 'none';
    const ballEl = document.createElementNS(NS, 'g');
    ballEl.setAttribute('class', 'km-ball');
    ballEl.setAttribute('pointer-events', 'visiblePainted');
    const hit = document.createElementNS(NS, 'circle');
    hit.setAttribute('r', String(R * 2.8));
    hit.setAttribute('fill', 'transparent');
    const spin = document.createElementNS(NS, 'g');
    const twin = held.cloneNode(true);
    twin.removeAttribute('class');
    twin.removeAttribute('data-km-part');
    twin.setAttribute('transform', `translate(${-MOUTH_AT.x} ${-MOUTH_AT.y})`);
    spin.appendChild(twin);
    ballEl.append(hit, spin);
    ballEl.style.display = 'none';
    ballEl.style.touchAction = 'none';
    ballEl.setAttribute('aria-hidden', 'true');
    svg.append(shade, ballEl);

    // Where the ball is: its spot on the ground (gx, gy), its height above it (h), its speeds over the ground (ux, uy)
    // and up (w). Its mode: mouth, drag, air, roll, rest, float.
    const b = { mode: 'mouth', gx: 0, gy: 0, h: 0, ux: 0, uy: 0, w: 0, angle: 0, sx: 0, sy: 0, bounces: 0 };
    function drawBall(t) {
      if (b.mode === 'mouth') { ballEl.style.display = 'none'; shade.style.display = 'none'; return; }
      ballEl.style.display = '';
      const k = sc(b.gy);
      let x = b.gx;
      let y = b.gy - (b.h + R) * k;
      if (b.mode === 'drag') { x = b.sx; y = b.sy; }
      if (b.mode === 'float' || (b.mode === 'rest' && ground.where(b.gx, b.gy) === 'shallow')) y += Math.sin((t || 0) / 320) * 1.6 * k;
      ballEl.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})`);
      put(hit, 'r', Math.max(R * 2.8, finger(k) / 2).toFixed(0));
      spin.setAttribute('transform', `rotate(${b.angle.toFixed(1)})`);
      const below = ground.where(b.gx, b.gy);
      shade.style.display = (['lake', 'shallow'].includes(below) && b.h < 1) || below === 'off' ? 'none' : '';
      const lift = b.mode === 'drag' ? Math.max(0, (b.gy - b.sy) / k - R) : b.h;
      shade.setAttribute('cx', b.gx.toFixed(1));
      shade.setAttribute('cy', b.gy.toFixed(1));
      shade.setAttribute('rx', (R * 1.15 * k).toFixed(1));
      shade.setAttribute('ry', (R * 0.38 * k).toFixed(1));
      shade.setAttribute('opacity', (0.22 * clamp(1 - lift / 320, 0.3, 1)).toFixed(2));
    }
    let simulating = false;
    function ring(x, y, big) {
      if (reduced.matches || simulating) return;
      for (let i = 0; i < (big ? 2 : 1); i += 1) {
        const e = document.createElementNS(NS, 'ellipse');
        const k = sc(y);
        e.setAttribute('cx', x.toFixed(1));
        e.setAttribute('cy', y.toFixed(1));
        e.setAttribute('rx', (14 * k).toFixed(1));
        e.setAttribute('ry', (4 * k).toFixed(1));
        e.setAttribute('fill', 'none');
        e.setAttribute('stroke', '#CFE6EA');
        e.setAttribute('stroke-width', (2.2 * k).toFixed(1));
        e.setAttribute('class', 'km-ring');
        e.setAttribute('pointer-events', 'none');
        e.style.animationDelay = `${i * 0.25}s`;
        svg.insertBefore(e, shade);
        setTimeout(() => e.remove(), 1600);
      }
    }
    // The mouth, in the world, as the drawing holds it.
    const mouth = () => toWorld(heldBall, MOUTH_AT.x, MOUTH_AT.y);
    // Where the mouth meets the ground in front of it.
    const reach = () => ({ x: d.x + MOUTH * sc(d.y) * (d.face < 0 ? -1 : 1), y: d.y });

    // One step of the ball: flight, bounces, rolling, and the water bringing it back in.
    function ballStep(dt) {
      const B = bounds();
      if (b.mode === 'air') {
        b.gx += b.ux * dt; b.gy += b.uy * dt;
        b.w -= GRAVITY * dt; b.h += b.w * dt;
        b.angle += ((b.ux + b.uy * 0.4) * dt) / R * (180 / Math.PI) * 0.6;
        if (b.gx < B.x0 || b.gx > B.x1) { b.gx = clamp(b.gx, B.x0, B.x1); b.ux = -b.ux * 0.4; }
        // A throw is aimed at the ground (aimAt). A bounce cannot carry it further in than the back of the land.
        const [lo] = ground.span(b.gx);
        if (b.bounces > 0 && b.gy < lo + 4) { b.gy = lo + 4; b.uy = Math.abs(b.uy) * 0.12; b.ux *= 0.7; }
        if (b.gy > B.y1) { b.gy = B.y1; b.uy = -Math.abs(b.uy) * 0.3; }
        if (b.h <= 0) land();
      } else if (b.mode === 'roll') {
        const f = Math.exp(-3.2 * dt);
        b.ux *= f; b.uy *= f;
        b.gx = clamp(b.gx + b.ux * dt, B.x0, B.x1); b.gy += b.uy * dt;
        b.angle += (b.ux * dt) / R * (180 / Math.PI);
        const here = ground.where(b.gx, b.gy);
        if (here === 'off') { [b.gx, b.gy] = ground.snap(b.gx, b.gy); b.ux *= 0.5; b.uy = 0; }
        if (here === 'lake' || here === 'bank') { b.mode = 'air'; b.h = 0.5; b.w = -10; return; }
        if (here === 'shallow') { ring(b.gx, b.gy, false); b.mode = 'rest'; b.ux = 0; b.uy = 0; return; }
        if (Math.hypot(b.ux, b.uy) < 10) { b.mode = 'rest'; b.ux = 0; b.uy = 0; }
      } else if (b.mode === 'float') {
        // Out on the lake it bobs and drifts back in to the shallows, where the dog can reach it.
        const shoreY = ground.water(b.gx) + 12;
        b.ux *= Math.exp(-1.2 * dt);
        b.gx = clamp(b.gx + b.ux * dt, B.x0, B.x1);
        b.gy = Math.max(shoreY, b.gy - 55 * dt);
        if (b.gy <= shoreY + 0.5) b.mode = 'rest';
      }
    }
    function land() {
      b.h = 0;
      let here = ground.where(b.gx, b.gy);
      if (here === 'bank') { b.gy = ground.water(b.gx) + 10; here = 'shallow'; }
      if (here === 'off') { [b.gx, b.gy] = ground.snap(b.gx, b.gy); here = ground.where(b.gx, b.gy); }
      if (here === 'lake') {
        ring(b.gx, b.gy, true);
        b.mode = 'float'; b.w = 0; b.ux *= 0.25; b.uy = 0;
        return;
      }
      if (here === 'shallow') {
        ring(b.gx, b.gy, b.w < -300);
        b.mode = 'rest'; b.w = 0; b.ux = 0; b.uy = 0;
        return;
      }
      if (b.w < -260 && b.bounces < 4) {
        b.bounces += 1;
        b.w = -b.w * 0.36; b.ux *= 0.62; b.uy *= 0.62; b.h = 0.01;
        return;
      }
      b.w = 0;
      b.mode = 'roll';
    }
    // Where a throw would come to rest (the dog runs for that spot while the ball is still in the air).
    function predict() {
      const save = { ...b };
      simulating = true;
      for (let i = 0; i < 1200 && ['air', 'roll'].includes(b.mode); i += 1) ballStep(1 / 60);
      simulating = false;
      const spot = { x: b.gx, y: b.gy, mode: b.mode };
      Object.assign(b, save);
      return spot;
    }

    /* ---------- the game ---------- */
    let state = 'free';     // free, offer, drag, air, chase, pick, back, leap, pose, spin, come, visit
    let paused = false;
    let timer = 0;
    let holdFor = 0;
    let samples = [];
    let throwSpot = null;   // where the person threw from: the dog brings the ball back there
    let awakeUntil = 0;
    const act = { then: 'free', hold: 0, plan: [], step: null, stepT: 0 };
    const leap = { from: null, to: null, h: 0, got: false, sink0: 0, pitch0: 0 };
    let hinted = false;

    const night = () => svg.getAttribute('data-km-night') === '1';
    const awake = () => !night() || svg.classList.contains('tm-awake');
    function wake() {
      awakeUntil = performance.now() + AWAKE_FOR * 1000;
      if (!night() || svg.classList.contains('tm-awake')) return false;
      svg.classList.add('tm-awake');
      return true;
    }
    function setState(next) {
      state = next;
      timer = 0;
      if (next !== 'pose') dogEl.classList.remove('dt-beg');
      ballEl.style.cursor = ['offer', 'air', 'free', 'chase'].includes(next) && b.mode !== 'mouth' ? 'grab' : next === 'drag' ? 'grabbing' : 'default';
    }
    function holding(on) {
      dogEl.classList.toggle('dt-empty', !on);
      if (on) { b.mode = 'mouth'; drawBall(); }
    }
    // Drop the ball from its mouth, just in front of its paws.
    function drop() {
      const m = mouth();
      b.gx = m.x; b.gy = d.y + 2; b.h = Math.max(0, (d.y - m.y) / sc(d.y) - R);
      b.ux = 50 * (d.face < 0 ? -1 : 1); b.uy = 6; b.w = 80; b.angle = 0; b.bounces = 2;
      b.mode = 'air';
      holding(false);
      if (reduced.matches) { const s = predict(); b.gx = s.x; b.gy = s.y; b.mode = 'rest'; b.h = 0; }
      drawBall();
    }
    function offer(text) {
      d.way = [];
      setGait('stand');
      setState('offer');
      if (text) say(text, !hinted);
      hinted = true;
    }
    // Where a flick sends the ball: on along the flick for a moment from where it was let go, and down on the ground
    // there (up the hill, into the Orchard, out on the lake). Aimed at the sky or past the fence, it comes down on the
    // back of the land in that column: the hill's top, or by the fence.
    function aimAt(vx, vy) {
      const B = bounds();
      let ax = clamp(b.sx + vx * 0.35, B.x0 + 20, B.x1 - 20);
      let ay = clamp(b.sy + vy * 0.35, B.y0, B.y1 - 10);
      const here = ground.where(ax, ay);
      if (here === 'off') [ax, ay] = ground.snap(ax, ay);
      else if (here === 'bank') ay = ground.water(ax) + 12;
      return [ax, ay];
    }
    function throwBall(vx, vy, from) {
      const speed = Math.hypot(vx, vy);
      throwSpot = from;
      b.mode = 'air'; b.bounces = 0;
      if (speed < 120) { b.ux = vx * 0.3; b.uy = 0; b.w = 0; }   // let go without a flick: it drops
      else {
        const k = speed > 4000 ? 4000 / speed : 1;
        const [tx, ty] = aimAt(vx * k, vy * k);
        const T = clamp(0.45 + Math.hypot(tx - b.gx, ty - b.gy) / 2400, 0.5, 1.4);
        b.ux = (tx - b.gx) / T; b.uy = (ty - b.gy) / T;
        b.w = (GRAVITY * T) / 2 - b.h / T;
      }
      if (reduced.matches) {
        // the same game without the travel: the ball is fetched and back at once
        holding(true);
        if (throwSpot) [d.x, d.y] = throwSpot;
        drawDog();
        drop();
        offer('Fetched it. The dog has brought the ball back. Throw it again.');
        return;
      }
      setState('air');
    }
    // A throw of its own, somewhere on the ground nearby (the "fetch" command, and Enter on the dog).
    function throwSomewhere() {
      const B = bounds();
      let tx = 0; let ty = 0;
      for (let i = 0; i < 30; i += 1) {
        tx = clamp(d.x + rand(-1, 1) * rand(220, 520), B.x0 + 40, B.x1 - 40);
        ty = clamp(d.y + rand(-260, 60), B.y0 + 80, B.y1 - 30);
        if (ground.where(tx, ty) === 'ground') break;
      }
      const T = 0.95;
      b.ux = (tx - b.gx) / T; b.uy = (ty - b.gy) / T; b.w = (GRAVITY * T) / 2 - b.h / T;
      b.mode = 'air'; b.bounces = 0;
      throwSpot = [d.x, d.y];
      if (reduced.matches) { throwBall(0, 0, throwSpot); return; }
      setState('air');
    }

    /* ---------- the dog's own day ---------- */
    // A plan is a list of steps: { go: [x, y], gait }, { pose, for }, { sniff }, { shake }, { look }, { wait }, { drink }.
    const FIELD = { x0: 2120, x1: 3120 };
    function grassPoint() {
      const B = bounds();
      for (let i = 0; i < 40; i += 1) {
        const x = rand(Math.max(FIELD.x0, B.x0 + 60), Math.min(FIELD.x1, B.x1 - 60));
        const [lo] = ground.span(x);
        const y = rand(lo + 30, ground.water(x) - BANK - 8);
        if (ground.where(x, y) === 'ground') return [x, y];
      }
      return [home.x, ground.water(home.x) - BANK - 20];
    }
    // A spot in the shallows near x, where the water is in the picture (in a room's view the shore can run below its
    // edge); null when there is none.
    function shallowPoint(nearX) {
      const B = bounds();
      for (let i = 0; i < 24; i += 1) {
        const x = clamp(nearX + rand(-1, 1) * rand(160, 420), Math.max(FIELD.x0, B.x0 + 60), Math.min(FIELD.x1 + 40, B.x1 - 60));
        const y = ground.water(x) + rand(8, 26);
        if (y < B.y1) return [x, y];
      }
      return null;
    }
    function plan() {
      const r = Math.random();
      const steps = [];
      // woken after dark it stays sleepy: a sit, a lie down, a look about, and no running off
      if (night()) {
        steps.push(r < 0.5 ? { pose: 'down', for: rand(5, 9), looks: true } : { pose: 'sit', for: rand(3, 6), looks: true }, { wait: rand(1, 2), looks: true });
        return steps;
      }
      const start = r < 0.28 ? (wet() ? [d.x, d.y] : shallowPoint(d.x)) : null;
      if (start) {
        // splashing along the shallows, a pass or two, then a shake on the bank
        if (!wet()) steps.push({ go: start, gait: 'trot' });
        let x = start[0];
        for (let i = 0; i < (chance(0.5) ? 2 : 1); i += 1) {
          const p = shallowPoint(x);
          if (!p) break;
          x = p[0];
          steps.push({ go: p, gait: 'gallop' });
        }
        if (chance(0.6)) steps.push({ wait: rand(0.3, 0.8) }, { shake: 0.8 });
      } else if (r < 0.5) {
        steps.push({ go: grassPoint(), gait: chance(0.6) ? 'trot' : 'walk' });
        if (chance(0.55)) steps.push({ sniff: rand(1.8, 3.6) });
        if (chance(0.3)) steps.push({ go: grassPoint(), gait: 'walk' }, { sniff: rand(1.2, 2.4) });
      } else if (r < 0.6) {
        steps.push({ sniff: rand(2, 4) });
      } else if (r < 0.72) {
        steps.push({ pose: 'sit', for: rand(3, 6), looks: true });
      } else if (r < 0.8) {
        if (wet()) steps.push({ go: grassPoint(), gait: 'trot' });
        steps.push({ pose: 'down', for: rand(5, 9), looks: true });
      } else if (r < 0.86) {
        steps.push({ go: [2356, 1124], gait: 'trot' }, { face: -1 }, { drink: rand(2.2, 3.4) });
      } else if (r < 0.93) {
        steps.push({ pose: 'bow', for: 0.9 });
        for (let i = 0; i < 4; i += 1) steps.push({ go: grassPoint(), gait: 'gallop', rush: 1.15 });
        steps.push({ wait: 0.6 });
      } else if (keeperAt) {
        steps.push({ go: [keeperAt[0] + 74, keeperAt[1] + 10], gait: 'trot' }, { face: -1 }, { pose: 'sit', for: rand(3, 5), up: true });
      }
      steps.push({ wait: rand(0.7, 2.2), looks: true });
      return steps;
    }
    // One step of the plan; true when it is done.
    function doStep(st, dt, t) {
      act.stepT += dt;
      if (st.go) {
        if (!st.started) { st.started = true; goTo(st.go[0], st.go[1], st.gait, st.rush); }
        ahead();
        return stride(dt);
      }
      if (st.pose) {
        if (!st.started) { st.started = true; setPose(st.pose); d.lookTo = st.up ? -14 : 0; }
        if (st.looks && act.stepT > 1 && Math.floor(t / 1400) % 3 === 0) d.lookTo = Math.sin(t / 900) * 14;
        if (act.stepT >= st.for) { setPose('stand'); return true; }
        return false;
      }
      if (st.sniff !== undefined) {
        if (!st.started) { st.started = true; setPose('stand'); setGait('stand'); }
        d.lookTo = 30 + Math.sin(t / 110) * 4;
        if (act.stepT >= st.sniff) { d.lookTo = 0; return true; }
        return false;
      }
      if (st.drink !== undefined) {
        if (!st.started) { st.started = true; setPose('stand'); setGait('stand'); }
        d.lookTo = 34 + Math.sin(t / 160) * 3;
        if (act.stepT >= st.drink) { d.lookTo = 0; return true; }
        return false;
      }
      if (st.shake !== undefined) {
        if (!st.started) { st.started = true; setPose('stand'); setGait('stand'); d.shake = st.shake; }
        return d.shake <= 0;
      }
      if (st.face !== undefined) { d.s = st.face; return Math.abs(d.face - d.s) < 0.05; }
      if (st.wait !== undefined) {
        if (!st.started) { st.started = true; setPose('stand'); setGait('stand'); }
        if (st.looks && act.stepT > 0.4) d.lookTo = Math.sin(t / 700) * 10;
        return act.stepT >= st.wait;
      }
      return true;
    }
    function freeDay(dt, t) {
      if (reduced.matches) return;
      if (!act.step) {
        if (!act.plan.length) act.plan = plan();
        act.step = act.plan.shift();
        act.stepT = 0;
      }
      if (doStep(act.step, dt, t)) act.step = null;
    }
    function stopPlan() { act.plan = []; act.step = null; d.way = []; d.v = 0; }

    /* ---------- the person: tapping, dragging, throwing ---------- */
    function onDog(fromKeyboard) {
      if (!awake() || paused) return;
      wake();
      if (state === 'pose') { setPose('stand'); setState(act.then); return; }
      if (['free', 'visit', 'come'].includes(state)) {
        if (b.mode !== 'mouth') { offer(); return; }
        stopPlan();
        setPose('stand');
        drop();
        offer(fromKeyboard ? 'The ball is down. Press Enter on the dog again to throw it.' : 'The ball is down. Drag it and let go to throw it.');
      } else if (state === 'offer' && fromKeyboard && b.mode !== 'mouth') {
        throwSomewhere();
      } else if (state === 'offer') {
        say('Drag the ball and let go to throw it.', !hinted);
      }
    }
    dogEl.addEventListener('click', (e) => { if (e.detail !== 0) onDog(false); });
    dogEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDog(true); } });

    function toScene(e) {
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: b.sx, y: b.sy };
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const B = bounds();
      return { x: clamp(p.x, B.x0, B.x1), y: clamp(p.y, B.y0, B.y1) };
    }
    // The ground under a point the person holds the ball at: just below it on the grass, or the back of the land
    // beneath it when it is up in the sky.
    function under(p) {
      const here = ground.where(p.x, p.y);
      if (here === 'ground' || here === 'shallow') {
        const below = ground.snap(p.x, p.y + 36 * sc(p.y));
        return ground.where(below[0], below[1]) === 'off' ? [p.x, p.y] : below;
      }
      if (here === 'lake') return [p.x, p.y];
      return ground.snap(p.x, p.y);
    }
    ballEl.addEventListener('pointerdown', (e) => {
      if (b.mode === 'mouth' || ['pick', 'leap'].includes(state) || paused || !awake()) return;
      e.preventDefault();
      e.stopPropagation();
      try { ballEl.setPointerCapture(e.pointerId); } catch (_) { /* a pointer the browser no longer tracks */ }
      wake();
      stopPlan();
      setPose('stand');
      setGait('stand');
      const p = toScene(e);
      b.mode = 'drag'; b.sx = p.x; b.sy = p.y; b.ux = 0; b.uy = 0; b.w = 0; b.h = 0;
      [b.gx, b.gy] = under(p);
      samples = [{ x: p.x, y: p.y, t: performance.now() }];
      holdFor = 0;
      setState('drag');
      watch(b.sx, b.sy, true);
      drawBall();
    });
    ballEl.addEventListener('pointermove', (e) => {
      if (state !== 'drag') return;
      const p = toScene(e);
      const now = performance.now();
      b.angle += ((p.x - b.sx) / R) * (180 / Math.PI) * 0.5;
      b.sx = p.x; b.sy = p.y;
      [b.gx, b.gy] = under(p);
      samples.push({ x: p.x, y: p.y, t: now });
      samples = samples.filter((s) => now - s.t < 110);
      watch(b.sx, b.sy, true);
      drawBall();
    });
    function release() {
      if (state !== 'drag') return;
      const now = performance.now();
      const recent = samples.filter((s) => now - s.t < 110);
      let vx = 0; let vy = 0;
      if (recent.length > 1) {
        const a = recent[0];
        const z = recent[recent.length - 1];
        const dt = Math.max(16, z.t - a.t) / 1000;
        vx = (z.x - a.x) / dt; vy = (z.y - a.y) / dt;
      }
      // the ball starts where it was let go: its height is how far it was held above the ground under it
      b.h = Math.max(0, (b.gy - b.sy) / sc(b.gy) - R);
      // the dog brings it back to where the throw began, not to where the flick let go of it
      throwBall(vx, vy, under(recent.length ? recent[0] : { x: b.sx, y: b.sy }));
    }
    ballEl.addEventListener('pointerup', release);
    ballEl.addEventListener('pointercancel', release);

    // Its eyes, and Tumble's, follow a pointer that comes near while it rests (owner: "the eyes the owner gets when the
    // dog wants something").
    let gazeAt = null;
    scene.addEventListener('pointermove', (e) => {
      if (!['free', 'offer'].includes(state) || d.way.length) { gazeAt = null; return; }
      const p = toScene(e);
      const n = neck();
      gazeAt = Math.hypot(p.x - n.x, p.y - n.y) < 320 * sc(d.y) ? p : null;
    });
    scene.addEventListener('pointerleave', () => { gazeAt = null; });

    /* ---------- commands Tumble shows (Tumble's room) ---------- */
    function show(cmd) {
      if (!['free', 'offer', 'pose', 'visit'].includes(state)) return false;
      wake();
      const back = b.mode === 'mouth' ? 'free' : 'offer';
      if (cmd === 'drop it') {
        if (b.mode !== 'mouth') return true;
        stopPlan(); drop(); offer();
        return true;
      }
      if (cmd === 'fetch') {
        stopPlan();
        if (b.mode === 'mouth') drop();
        if (b.mode === 'air') { const s = predict(); b.gx = s.x; b.gy = s.y; b.h = 0; b.mode = 'rest'; }
        throwSomewhere();
        return true;
      }
      stopPlan();
      ahead();
      act.then = back;
      if (cmd === 'spin') { setPose('stand'); d.spin = 0; setState('spin'); return true; }
      if (cmd === 'come') {
        if (!keeperAt) return false;
        goTo(keeperAt[0] + 74, keeperAt[1] + 10, 'trot');
        setState('come');
        if (reduced.matches) { [d.x, d.y] = ground.snap(keeperAt[0] + 74, keeperAt[1] + 10); d.way = []; setPose('sit'); }
        return true;
      }
      const name = cmd === 'stay' ? 'sit' : cmd;
      if (!POSES[name] || name === 'stand') return false;
      setPose(name);
      act.hold = cmd === 'stay' ? 5 : 3;
      setState('pose');
      return true;
    }
    // The look a dog gives you when it wants something: it sits, looks up, eyes big, brows lifted (the treats).
    function beg() {
      if (!['free', 'offer', 'pose'].includes(state)) return false;
      wake();
      stopPlan();
      act.then = b.mode === 'mouth' ? 'free' : 'offer';
      setPose('sit');
      act.hold = 4;
      setState('pose');
      dogEl.classList.add('dt-beg');
      d.lookTo = -16;
      for (const p of pupils) p.setAttribute('transform', '');
      return true;
    }
    // Off with Tumble's group to visit another place, and home again (the cast in kindlemere.js).
    function visit(points) {
      if (!['free'].includes(state) || !Array.isArray(points) || !points.length) return false;
      stopPlan();
      const last = points[points.length - 1];
      act.plan = [{ go: last, gait: 'trot' }, { pose: 'sit', for: 600, looks: true }];
      setState('visit');
      return true;
    }
    function goHome() {
      if (state !== 'visit') return;
      stopPlan();
      act.plan = [{ go: [home.x - 120, ground.water(home.x) - BANK - 30], gait: 'trot' }];
      setState('free');
    }

    /* ---------- the loop ---------- */
    let seen = true;
    if (window.IntersectionObserver) new IntersectionObserver((es) => { seen = es.some((x) => x.isIntersecting); }).observe(scene);
    let last = performance.now();
    function frame(t) {
      requestAnimationFrame(frame);
      const real = Math.min(0.25, (t - last) / 1000);
      const dt = Math.min(0.05, real);
      last = t;
      if (paused || (!seen && state === 'free') || document.hidden) return;
      if (night() && !awake()) {
        if (d.x !== home.x || d.y !== home.y || b.mode !== 'mouth') { stopPlan(); d.x = home.x; d.y = home.y; d.s = 1; d.face = 1; setPose('stand'); holding(true); setState('free'); drawDog(); }
        return;
      }
      timer += real;
      if (night() && svg.classList.contains('tm-awake') && state === 'free' && t > awakeUntil) {
        svg.classList.remove('tm-awake');
        say('Back to bed in its house. Goodnight.', true);
      }
      if (!night()) svg.classList.remove('tm-awake');

      // the ball
      if (['air', 'roll', 'float'].includes(b.mode)) ballStep(dt);

      // the dog
      const x0 = d.x;
      const y0 = d.y;
      if (state === 'free' || state === 'visit') {
        freeDay(dt, t);
        if (gazeAt && !d.way.length) watch(gazeAt.x, gazeAt.y, false);
      } else if (state === 'offer') {
        const ball = { x: b.gx, y: b.gy - (b.h + R) * sc(b.gy) };
        watch(gazeAt ? gazeAt.x : ball.x, gazeAt ? gazeAt.y : ball.y, !gazeAt);
        if (b.mode === 'rest' && timer > 0.7 && d.pose === 'stand') setPose('sit');
        if (timer > OFFER_FOR && b.mode === 'rest') { throwSpot = null; setState('chase'); }
      } else if (state === 'drag') {
        holdFor += real;
        watch(b.sx, b.sy, true);
        if (d.pose === 'stand' && holdFor >= SIT_AFTER && holdFor < LEAP_AFTER) { setPose('sit'); say('Sitting nicely, eyes on the ball. Let go to throw it.'); }
        if (holdFor >= LEAP_AFTER) {
          const k = sc(d.y);
          const near = Math.abs(b.sx - d.x) < 240 * k && d.y - b.sy < 230 * k && b.sy < d.y;
          if (near) startLeap(); else holdFor = SIT_AFTER;
        }
      } else if (state === 'air') {
        if (timer > 0.18) {
          const s = predict();
          goTo(s.mode === 'float' ? s.x : s.x - MOUTH * sc(s.y) * Math.sign(s.x - d.x || 1), s.mode === 'float' ? ground.water(s.x) + 16 : s.y, 'gallop');
          setState('chase');
        } else watch(b.gx, b.gy - b.h * sc(b.gy), true);
      } else if (state === 'chase') {
        const live = ['air', 'roll', 'float'].includes(b.mode);
        if (!live && timer > 0.1 && !d.chased) {
          // the ball has stopped: run to the spot beside it, coming at it from the side it is on
          const side = b.gx >= d.x ? 1 : -1;
          d.chased = true;
          goTo(b.gx - side * MOUTH * sc(b.gy), b.gy, 'gallop');
        }
        if (live) d.chased = false;
        const arrived = stride(dt);
        if (!d.way.length || arrived) watch(b.gx, b.gy, true); else ahead();
        const r = reach();
        const close = Math.hypot(r.x - b.gx, r.y - b.gy) < 26 * sc(d.y) || (Math.abs(d.x - b.gx) < 70 * sc(d.y) && Math.abs(d.y - b.gy) < 22 * sc(d.y));
        if (!live && close) { d.chased = false; d.way = []; d.s = b.gx >= d.x ? 1 : -1; setState('pick'); }
        else if (!live && arrived && timer > 0.3) { d.chased = false; timer = 0; }
      } else if (state === 'pick') {
        if (Math.abs(d.face - d.s) > 0.05) { /* turning to it first */ } else {
          const k = Math.min(1, timer / 0.5);
          const dip = Math.sin(Math.PI * k);
          setGait('stand');
          d.px = 94; d.py = 62;
          d.pitch = 22 * dip; d.lookTo = 40 * dip; d.look = d.lookTo; d.sink = 8 * dip;
          if (k >= 0.5 && b.mode !== 'mouth') holding(true);
          if (k >= 1) {
            d.pitch = 0; d.sink = 0; d.px = HIP.x; d.py = HIP.y; d.lookTo = 0;
            if (throwSpot) { goTo(throwSpot[0], throwSpot[1], Math.hypot(throwSpot[0] - d.x, throwSpot[1] - d.y) > 700 ? 'gallop' : 'trot'); setState('back'); }
            else { setState('free'); }
          }
        }
        if (Math.abs(d.face - d.s) > 0.05) timer = 0;
      } else if (state === 'back') {
        ahead();
        if (stride(dt)) {
          throwSpot = null;
          drop();
          offer('Back with the ball. Good dog. Throw it again.');
        }
      } else if (state === 'leap') {
        const tt = Math.min(1, timer / 0.8);
        const e = Math.min(1, tt / 0.3);
        const ease = tt < 0.5 ? 2 * tt * tt : 1 - 2 * (1 - tt) * (1 - tt);
        d.x = leap.from[0] + (leap.to[0] - leap.from[0]) * ease;
        d.hop = leap.h * 4 * tt * (1 - tt);
        d.sink = leap.sink0 * (1 - e);
        d.pitch = leap.pitch0 * (1 - e) - 20 * (1 - 2 * tt) * e;
        d.lookTo = tt < 0.5 ? -10 : 0;
        if (tt >= 0.5 && !leap.got) { leap.got = true; holding(true); say('Up it jumps, and it has the ball. Good catch.', true); }
        if (tt >= 1) { d.hop = 0; d.sink = 0; d.pitch = 0; setState('free'); }
      } else if (state === 'pose') {
        if (timer >= act.hold) { dogEl.classList.remove('dt-beg'); setPose('stand'); setState(act.then); }
      } else if (state === 'spin') {
        const tt = Math.min(1, timer / 0.9);
        d.face = Math.cos(2 * Math.PI * tt) * d.s;
        d.hop = 8 * Math.sin(Math.PI * tt);
        if (tt >= 1) { d.face = d.s; d.hop = 0; setState(act.then); }
      } else if (state === 'come') {
        // to Tumble, a sit there looking up at it, then back to its day
        if (d.way.length) { stride(dt); ahead(); act.sat = 0; } else if (d.pose !== 'sit') { d.s = -1; setPose('sit'); d.lookTo = -10; act.sat = 0; }
        else { act.sat += real; if (act.sat > 2.2) { setPose('stand'); setState(act.then); } }
      }

      // the legs at the pace the feet are going
      if (d.gait && d.gait !== 'stand' && state !== 'leap') {
        const going = Math.hypot(d.x - x0, d.y - y0) / Math.max(dt, 1e-3) / (SPEED[d.gait] * sc(d.y) * d.rush);
        d.pace += (clamp(going, 0.3, 1.2) - d.pace) * Math.min(1, dt * 8);
        legPace(Math.round(d.pace * 20) / 20);
      } else d.pace = 0.3;
      // a quick turn on the spot, never a run backwards
      if (state !== 'spin') {
        const turn = 7 * dt;
        if (Math.abs(d.s - d.face) <= turn) d.face = d.s; else d.face += Math.sign(d.s - d.face) * turn;
      }
      // settle into a pose, or up out of one
      if (tween.t < 1 && !['pick', 'leap'].includes(state)) {
        tween.t = Math.min(1, tween.t + real / 0.28);
        const P = POSES[d.pose];
        d.pitch = tween.pitch + (P.pitch - tween.pitch) * tween.t;
        d.sink = tween.sink + (P.sink - tween.sink) * tween.t;
      }
      if (d.shake > 0) d.shake = Math.max(0, d.shake - real);
      d.look += (d.lookTo - d.look) * Math.min(1, dt * 10);
      // a pose of ours keeps its classes (a room's code or the kit may have taken them off)
      for (const c of POSES[d.pose].cls) if (!dogEl.classList.contains(c)) dogEl.classList.add(c);
      const dry = !wet();
      if (dry !== dogEl.classList.contains('dt-dry')) dogEl.classList.toggle('dt-dry', dry);
      drawDog();
      if (b.mode !== 'mouth') drawBall(t);
    }

    function startLeap() {
      if (reduced.matches) { holding(true); setPose('stand'); setState('free'); say('That was a long wait. The dog jumped up and took the ball. Good catch.', true); return; }
      const k = sc(d.y);
      leap.from = [d.x, d.y];
      leap.to = [clamp(b.sx - MOUTH * k * (b.sx >= d.x ? 1 : -1), bounds().x0, bounds().x1), d.y];
      leap.h = clamp((d.y - b.sy) / k - 40, 16, 120);
      leap.got = false;
      leap.sink0 = d.sink; leap.pitch0 = d.pitch;
      d.pose = 'stand';
      dogEl.classList.remove('dt-sit', 'dt-paw', 'dt-down', 'dt-bow');
      tween.t = 1;
      d.s = b.sx >= d.x ? 1 : -1;
      setGait('gallop');
      setState('leap');
      say('That was a long wait. Up it jumps.', true);
    }

    holding(true);
    setGait('stand');
    drawDog();
    requestAnimationFrame((t) => { last = t; frame(t); });

    return {
      setPaused(on) { paused = !!on; },
      state: () => state,
      show,
      beg,
      wake,
      asleep: () => !awake(),
      visit,
      home: goHome,
      busy: () => !['free', 'visit'].includes(state),
      where: () => ({ x: d.x, y: d.y }),
    };
  }

  // The game on a scene, once attached (the cast in kindlemere.js takes the dog along on its visits).
  const games = new WeakMap();
  function attachOnce(svg, dogEl, opts) {
    const game = attach(svg, dogEl, opts);
    if (game && svg) games.set(svg, game);
    return game;
  }
  window.kindlemereDog = Object.freeze({ attach: attachOnce, of: (svg) => games.get(svg) || null, ground: (svg) => (svg ? groundOf(svg) : null) });
}());
