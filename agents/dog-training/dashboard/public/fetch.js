'use strict';

/* The dog in Lakeside Field, on Tumble's dashboard: fetch, the commands Tumble shows, and a person's own dog's colours.
   The kit's live Field view (/kit/art/kindlemere-field.svg, drawn by /kit/kindlemere.js) holds this lane's dog
   (/art/field-dog.svg): app.js puts it where the scene's dog runs and hands it here. This file moves that dog and one
   ball of its own; it never edits either file. Units are the scene's; the dog's own parts are in its own frame
   (facing right, paws on y = 64).

     tap the dog            it drops the ball from its mouth and pants
     drag the ball          the dog turns to face it, its head and eyes follow it, and Tumble watches it too
     hold it 2 seconds      the dog sits nicely and waits
     hold it 10 seconds     the dog jumps up and grabs it, then trots home with it
     let go with a flick    the ball flies, bounces and rolls; the dog gallops to it, picks it up and brings it home
     show(command)          sit, down, stay, paw, spin, come (to Tumble), drop it, fetch
     keyboard               the dog is a button: Enter or Space drops the ball, and again throws it
     after dark             the dog sleeps in its house (the scene's own night); wake() brings it out for a while

   Reduced motion: the same game without the travel. Poses change at once, and a fetched ball is back at once.
   No network, no storage: it only moves shapes on this page. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const GRAVITY = 1100, MAX_SPEED = 1400, RUN_SPEED = 210;
  const SIT_AFTER = 2, GRAB_AFTER = 10;       // seconds of holding the ball
  const AWAKE_FOR = 120;                       // seconds a woken dog stays up at night once it is home and idle
  const PAWS = 64;                             // the dog's paws, in its own frame
  const BODY = { x0: 10, x1: 150 };            // tail root to nose, in its own frame; the dog turns about the middle
  const PICK_MOUTH_X = 135;                    // where the mouth reaches the water when it dips for the ball
  const HIP = { x: 30, y: 21 };                // poses tip the body about the hip
  const POSES = {
    stand: { pitch: 0, sink: 0, cls: [] },
    sit: { pitch: -32, sink: 30, cls: ['dt-sit'] },
    paw: { pitch: -32, sink: 30, cls: ['dt-sit', 'dt-paw'] },
    down: { pitch: 0, sink: 24, cls: ['dt-down'] },
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nums = (s) => String(s || '').trim().split(/[\s,]+/).map(Number);

  /* ---------- a person's own dog: colours, ears, markings, bandana ---------- */
  const COLOURS = { white: '#FFFFFF', cream: '#F1E3C6', tan: '#D9A066', ginger: '#C97C3D', brown: '#7A4A2A', black: '#2E2B2B', grey: '#9EA3A8' };
  const BANDS = { green: '#4E7F3A', red: '#B5452F', blue: '#2F6B8A', yellow: '#E0B43A' };
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  const SHADE = '#6E5A3C';
  function paints(look) {
    const coat = COLOURS[look.coat], head = COLOURS[look.head], face = COLOURS[look.face], band = BANDS[look.band] || BANDS.green;
    const ear = mix(head, '#2A1A10', 0.32);
    return {
      coat, 'coat-shade': mix(coat, SHADE, 0.14), 'coat-far': mix(coat, SHADE, 0.2), 'coat-far-paw': mix(coat, SHADE, 0.28),
      head, 'head-dark': mix(head, '#2A1A10', 0.25), 'head-light': mix(head, '#FFFFFF', 0.3),
      face, 'face-shade': mix(face, SHADE, 0.14),
      ear, 'ear-dark': mix(ear, '#1A0F08', 0.3), 'ear-light': mix(ear, '#FFFFFF', 0.2),
      band, 'band-dark': mix(band, '#10180C', 0.25), 'band-light': mix(band, '#FFFFFF', 0.4),
    };
  }
  // Paint one dog. No look (or the drawing's own) puts back the colours it was drawn with.
  function paint(el, look) {
    const ok = look && COLOURS[look.coat] && COLOURS[look.head] && COLOURS[look.face];
    const p = ok ? paints(look) : null;
    for (const s of el.querySelectorAll('[data-p]')) {
      const prop = s.hasAttribute('data-ps') ? 'stroke' : 'fill';
      s.style[prop] = p && p[s.getAttribute('data-p')] ? p[s.getAttribute('data-p')] : '';
    }
    el.classList.toggle('dt-ears-up', Boolean(ok && look.ears === 'both-up'));
    el.classList.toggle('dt-ears-down', Boolean(ok && look.ears === 'both-down'));
    el.classList.toggle('dt-mark-hip', Boolean(ok && look.marks === 'hip'));
    el.classList.toggle('dt-mark-plain', Boolean(ok && look.marks === 'plain'));
    el.classList.toggle('dt-no-band', Boolean(ok && look.band === 'none'));
  }

  function init(svg, sayFn, dogEl) {
    const dog = dogEl || svg.querySelector('#dt-dog');
    const body = dog && dog.querySelector('.dt-body');
    const look = dog && dog.querySelector('.dt-look');
    const held = dog && dog.querySelector('.dt-held');
    const heldBall = held && held.querySelector('circle');
    const home = dog && nums(dog.getAttribute('data-home'));
    const pivot = look && nums(look.getAttribute('data-pivot'));
    if (!dog || !body || !look || !heldBall || !home || home.length !== 2 || !pivot || pivot.length !== 2
      || home.some(isNaN) || pivot.some(isNaN)) return null;

    const bodyBase = body.getAttribute('transform') || '';
    const R = +heldBall.getAttribute('r') || 7.5;
    const MOUTH = { x: +heldBall.getAttribute('cx'), y: +heldBall.getAttribute('cy') };
    const REST = Math.atan2(MOUTH.y - pivot[1], MOUTH.x - pivot[0]) * 180 / Math.PI;
    const CX = (BODY.x0 + BODY.x1) / 2;
    const vb = svg.viewBox.baseVal;
    const LEFT = vb.x + R + 2, RIGHT = vb.x + vb.width - R - 2, TOP = vb.y + R;
    const GROUND = home[1] + PAWS - R;
    const DX_MIN = vb.x - (home[0] + BODY.x0), DX_MAX = vb.x + vb.width - (home[0] + BODY.x1);
    const toWorld = (el, x, y) => new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse().multiply(el.getScreenCTM()));
    const say = (text) => { if (sayFn) sayFn(text); };

    // Eyes that follow the ball: the dog's own, and Tumble's (each dark pupil with the catchlight after it).
    const pupils = [...dog.querySelectorAll('.dt-pupil')];
    const keeper = svg.querySelector('[id$="km-keeper-dog-training"]');
    const keeperEyes = keeper ? [...keeper.querySelectorAll('circle')]
      .filter((c) => (c.getAttribute('fill') || '').toUpperCase() === '#1A2433' && +c.getAttribute('r') >= 3 && +c.getAttribute('r') <= 5
        && !c.closest('.km-night-only'))
      .map((c) => {
        const g = document.createElementNS(NS, 'g');
        const light = c.nextElementSibling && c.nextElementSibling.tagName === 'circle' ? c.nextElementSibling : null;
        c.parentNode.insertBefore(g, c);
        g.appendChild(c);
        if (light) g.appendChild(light);
        return { g, x: +c.getAttribute('cx'), y: +c.getAttribute('cy') };
      }) : [];
    const keeperAt = keeper ? toWorld(keeper, 58, 110) : null;   // Tumble's feet, for "come"

    // The ball the person throws: the held ball's twin. Under the scene's paper grain, over everything else.
    const ball = document.createElementNS(NS, 'g');
    ball.setAttribute('class', 'tm-ball');
    const hit = document.createElementNS(NS, 'circle');   // a bigger target for a finger
    hit.setAttribute('r', String(R * 2.6));
    hit.setAttribute('fill', 'transparent');
    const spin = document.createElementNS(NS, 'g');
    const twin = held.cloneNode(true);
    twin.removeAttribute('class');
    twin.setAttribute('transform', `translate(${-MOUTH.x} ${-MOUTH.y})`);
    spin.appendChild(twin);
    ball.append(hit, spin);
    ball.style.display = 'none';
    ball.style.touchAction = 'none';
    const grain = svg.querySelector('[id$="km-grain"]');
    if (grain) svg.insertBefore(ball, grain); else svg.appendChild(ball);

    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    const b = { x: 0, y: 0, vx: 0, vy: 0, angle: 0 };
    // dx and s place and face the dog; pitch, sink and the pivot pose its body; look turns its head; turn spins it.
    const d = { dx: 0, s: 1, turn: 1, look: 0, pitch: 0, sink: 0, px: HIP.x, py: HIP.y };
    const leap = { from: 0, to: 0, h: 0, sink0: 0, pitch0: 0, got: false };
    const tween = { pitch: 0, sink: 0, t: 1 };
    const act = { then: 'home', hold: 0, target: 0 };
    let state = 'home';   // home, dropping, ready, dragging, flying, out, pick, back, leap, pose, spin, come
    let pose = 'stand';
    let paused = false, timer = 0, holdFor = 0, samples = [], awakeUntil = 0, holding_ = false;

    dog.setAttribute('tabindex', '0');
    dog.setAttribute('role', 'button');
    dog.setAttribute('aria-label', 'Play fetch with the dog');

    const flipX = (x) => CX + d.s * (x - CX);
    function drawDog() {
      dog.setAttribute('transform', `translate(${(home[0] + d.dx).toFixed(2)} ${home[1]}) translate(${CX} 0) scale(${(d.s * d.turn).toFixed(3)} 1) translate(${-CX} 0)`);
      body.setAttribute('transform', `${bodyBase} translate(0 ${d.sink.toFixed(2)}) rotate(${d.pitch.toFixed(1)} ${d.px} ${d.py})`);
      look.setAttribute('transform', `rotate(${d.look.toFixed(1)} ${pivot[0]} ${pivot[1]})`);
    }
    function drawBall() {
      ball.setAttribute('transform', `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)})`);
      spin.setAttribute('transform', `rotate(${b.angle.toFixed(1)})`);
    }
    // Ball in the mouth, or out of it (the drawing swaps its mouth to an open pant when it has the class dt-empty).
    function holding(on) {
      dog.classList.toggle('dt-empty', !on);
      ball.style.display = on ? 'none' : '';
    }
    function setPose(name) {
      if (pose === name) return;
      pose = name;
      dog.classList.remove('dt-sit', 'dt-paw', 'dt-down');
      for (const c of POSES[name].cls) dog.classList.add(c);
      tween.pitch = d.pitch; tween.sink = d.sink; tween.t = reduced.matches ? 1 : 0;
      d.px = HIP.x; d.py = HIP.y;
      if (reduced.matches) { d.pitch = POSES[name].pitch; d.sink = POSES[name].sink; drawDog(); }
    }
    // Face a point, turn the head toward it, and look at it. Tumble looks too.
    function watch(x, y, turn) {
      const neck = toWorld(body, pivot[0], pivot[1]);
      if (turn && Math.abs(x - neck.x) > 30) d.s = x < neck.x ? -1 : 1;
      const ang = Math.atan2(y - neck.y, (x - neck.x) * d.s) * 180 / Math.PI;
      d.look = clamp(ang - REST - d.pitch, -40, 40);
      const ux = clamp((x - neck.x) * d.s / 40, -1, 1), uy = clamp((y - neck.y) / 40, -1, 1);
      for (const p of pupils) p.setAttribute('transform', `translate(${(ux * 1.1).toFixed(2)} ${(uy * 1.1).toFixed(2)})`);
      for (const e of keeperEyes) {
        const c = toWorld(e.g, e.x, e.y);
        const kx = clamp((x - c.x) / 50, -1, 1), ky = clamp((y - c.y) / 50, -1, 1);
        e.g.setAttribute('transform', `translate(${(kx * 1.8).toFixed(2)} ${(ky * 2).toFixed(2)})`);
      }
      drawDog();
    }
    const lookAhead = () => { d.look = 0; for (const p of pupils) p.setAttribute('transform', ''); drawDog(); };
    function setState(next) {
      if (next === 'out') d.s = b.x < home[0] + d.dx + CX ? -1 : 1;
      if (next === 'back') d.s = d.dx > 0 ? -1 : 1;
      if (!['dragging', 'pose', 'come'].includes(next) && pose !== 'stand') setPose('stand');
      if (next !== 'pose') dog.classList.remove('dt-beg');
      state = next;
      timer = 0;
      // while the dog is busy, the kit's characters stay home (window.kindlemere.hold, lane A's mingle plan)
      const busy = next !== 'home';
      if (busy !== holding_) {
        holding_ = busy;
        try { if (window.kindlemere && typeof window.kindlemere.hold === 'function') window.kindlemere.hold(busy); } catch (_) { /* the kit's own business */ }
      }
      svg.classList.toggle('is-picking', next === 'pick');
      ball.style.cursor = (next === 'ready' || next === 'flying' || next === 'dropping') ? 'grab' : (next === 'dragging' ? 'grabbing' : 'default');
    }

    // Night: the scene puts the dog to bed. A woken dog stays up while it plays, and goes back to bed when idle.
    const night = () => svg.getAttribute('data-km-night') === '1';
    const awake = () => !night() || svg.classList.contains('tm-awake');
    function wake() {
      awakeUntil = performance.now() + AWAKE_FOR * 1000;
      if (!night() || svg.classList.contains('tm-awake')) return false;
      svg.classList.add('tm-awake');
      return true;
    }

    // Ball physics: gravity, a soft bounce, rolling friction, the edges of the picture.
    function physics(dt) {
      b.vy += GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < LEFT) { b.x = LEFT; b.vx = -b.vx * 0.6; }
      if (b.x > RIGHT) { b.x = RIGHT; b.vx = -b.vx * 0.6; }
      if (b.y < TOP) { b.y = TOP; b.vy = -b.vy * 0.5; }
      let grounded = false;
      if (b.y >= GROUND) {
        b.y = GROUND;
        grounded = true;
        b.vy = b.vy > 90 ? -b.vy * 0.42 : 0;
        b.vx *= Math.exp(-2.4 * dt);
      }
      b.angle += (b.vx * dt) / R * (180 / Math.PI);
      return grounded && b.vy === 0 && Math.abs(b.vx) < 6;
    }
    // Where a throw would come to rest, for reduced motion.
    function settle() {
      for (let i = 0; i < 2000; i += 1) if (physics(1 / 120)) break;
      b.vx = 0; b.vy = 0;
    }
    // Close enough that the dog only has to lower its head.
    const atPaws = () => Math.abs(b.x - (home[0] + d.dx + flipX(PICK_MOUTH_X))) < 22;

    function drop() {
      const m = toWorld(heldBall, MOUTH.x, MOUTH.y);
      b.x = m.x; b.y = m.y; b.vx = 50 * d.s; b.vy = -60; b.angle = 0;
      holding(false);
      drawBall();
      if (reduced.matches) { settle(); drawBall(); watch(b.x, b.y, false); setState('ready'); return; }
      setState('dropping');
    }
    function welcomeHome(text) {
      d.dx = 0; d.s = 1; d.turn = 1; d.pitch = 0; d.sink = 0;
      holding(true);
      lookAhead();
      setState('home');
      if (text) say(text);
    }
    function throwBall(vx, vy) {
      const speed = Math.hypot(vx, vy);
      const k = speed > MAX_SPEED ? MAX_SPEED / speed : 1;
      b.vx = vx * k; b.vy = vy * k;
      if (reduced.matches) {
        settle();
        if (atPaws()) { drawBall(); setState('ready'); return; }
        welcomeHome('Fetched it. The dog has the ball back. Tap the dog to drop it again.');
        return;
      }
      setState('flying');
    }
    const throwSomewhere = () => {
      const dir = b.x > home[0] + CX ? -1 : (Math.random() < 0.5 ? -1 : 1);
      throwBall(dir * (260 + Math.random() * 260), -(380 + Math.random() * 260));
    };
    // Held too long: up it jumps, along an arc whose top is the ball.
    function jumpForIt() {
      if (reduced.matches) { welcomeHome('That was a long wait. The dog jumped up and grabbed the ball. Good catch.'); return; }
      leap.from = d.dx;
      leap.to = clamp(b.x - home[0] - flipX(MOUTH.x), DX_MIN, DX_MAX);
      leap.h = clamp(home[1] + MOUTH.y - b.y, 16, 110);   // no higher than keeps its ears in the picture
      leap.got = false;
      leap.sink0 = d.sink; leap.pitch0 = d.pitch;   // it springs up from wherever it is, the sit included
      pose = 'stand';
      dog.classList.remove('dt-sit', 'dt-paw', 'dt-down');
      tween.t = 1;
      setState('leap');
      say('That was a long wait. Up it jumps!');
    }

    // Commands Tumble shows. Each returns false when the dog is busy (out on a fetch, mid-jump).
    function show(cmd) {
      if (!['home', 'ready', 'pose'].includes(state)) return false;
      wake();
      const back = dog.classList.contains('dt-empty') ? 'ready' : 'home';
      if (cmd === 'drop it') {
        if (back !== 'home') return true;   // nothing in its mouth: it already dropped it
        drop();
        return true;
      }
      if (cmd === 'fetch') {
        if (back === 'home') drop();
        throwSomewhere();
        return true;
      }
      lookAhead();
      act.then = back;
      if (cmd === 'spin') { if (pose !== 'stand') setPose('stand'); setState('spin'); return true; }
      if (cmd === 'come') {
        if (!keeperAt) return false;
        act.target = clamp(keeperAt.x + 30 - home[0] - BODY.x0, DX_MIN, DX_MAX);
        d.s = act.target < d.dx ? -1 : 1;
        setState('come');
        if (reduced.matches) { d.dx = act.target; setPose('sit'); }
        return true;
      }
      const name = cmd === 'stay' ? 'sit' : cmd;
      if (!POSES[name]) return false;
      setPose(name);
      act.hold = cmd === 'stay' ? 5 : 3;
      setState('pose');
      return true;
    }

    // The look a dog gives you when it wants something (owner, 00:3x CDT: "the eyes the owner gets when the dog wants
    // something"): it sits, tips its head up to you, its eyes go big and its brows lift. Shown when the treats come out.
    function beg() {
      if (!['home', 'ready', 'pose'].includes(state)) return false;
      wake();
      act.then = dog.classList.contains('dt-empty') ? 'ready' : 'home';
      for (const p of pupils) p.setAttribute('transform', '');
      setPose('sit');
      act.hold = 4;
      setState('pose');
      dog.classList.add('dt-beg');
      d.look = -16;
      drawDog();
      return true;
    }

    // Tap or Enter on the dog.
    function onDog(fromKeyboard) {
      if (!awake()) return;
      wake();
      if (state === 'pose') { setState(act.then); return; }   // a tap releases a sit or a down
      if (state === 'home') {
        drop();
        say(fromKeyboard ? 'The ball is down. Press Enter on the dog again to throw it.' : 'The ball is down. Drag it and let go to throw it.');
      } else if (state === 'ready' && fromKeyboard) {
        throwSomewhere();
      } else if (state === 'ready') {
        say('Drag the ball and let go to throw it.');
      }
    }
    dog.addEventListener('click', (e) => { if (e.detail !== 0) onDog(false); });
    dog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDog(true); }
    });

    // Dragging the ball.
    function toScene(e) {
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: b.x, y: b.y };
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      return { x: clamp(p.x, LEFT, RIGHT), y: clamp(p.y, TOP, GROUND) };
    }
    ball.addEventListener('pointerdown', (e) => {
      if (!(state === 'ready' || state === 'flying' || state === 'dropping')) return;
      e.preventDefault();
      try { ball.setPointerCapture(e.pointerId); } catch (_) { /* a pointer the browser no longer tracks */ }
      wake();
      setState('dragging');
      const p = toScene(e);
      b.x = p.x; b.y = p.y; b.vx = 0; b.vy = 0;
      samples = [{ x: p.x, y: p.y, t: performance.now() }];
      holdFor = 0;
      drawBall(); watch(b.x, b.y, true);
    });
    ball.addEventListener('pointermove', (e) => {
      if (state !== 'dragging') return;
      const p = toScene(e);
      const now = performance.now();
      b.angle += (p.x - b.x) / R * (180 / Math.PI);
      b.x = p.x; b.y = p.y;
      samples.push({ x: p.x, y: p.y, t: now });
      samples = samples.filter((s) => now - s.t < 100);
      drawBall(); watch(b.x, b.y, true);
    });
    function release() {
      if (state !== 'dragging') return;
      const now = performance.now();
      const recent = samples.filter((s) => now - s.t < 100);
      let vx = 0, vy = 0;
      if (recent.length > 1) {
        const a = recent[0], z = recent[recent.length - 1];
        const dt = Math.max(16, z.t - a.t) / 1000;
        vx = (z.x - a.x) / dt; vy = (z.y - a.y) / dt;
      }
      throwBall(vx, vy);
    }
    ball.addEventListener('pointerup', release);
    ball.addEventListener('pointercancel', release);

    // The dog looks at you: at home, its eyes (and Tumble's) follow a pointer that comes near, and its head turns to
    // it when the pointer is in front of it. Once a frame at most.
    let gaze = 0, looking = false;
    const stage = svg.parentNode || svg;
    const unlook = () => { if (!looking) return; looking = false; lookAhead(); for (const k of keeperEyes) k.g.setAttribute('transform', ''); };
    stage.addEventListener('pointermove', (e) => {
      if (state !== 'home' || paused || !awake() || gaze) return;
      gaze = requestAnimationFrame(() => {
        gaze = 0;
        if (state !== 'home') return;
        const p = toScene(e);
        const neck = toWorld(body, pivot[0], pivot[1]);
        if (Math.hypot(p.x - neck.x, p.y - neck.y) > 320) { unlook(); return; }
        looking = true;
        watch(p.x, p.y, false);
        if ((p.x - neck.x) * d.s < 0) { d.look = 0; drawDog(); }   // behind it: the eyes only
      });
    });
    stage.addEventListener('pointerleave', () => { if (state === 'home') unlook(); });

    // The loop: the ball in the air; the dog posing, jumping, out to the ball, down for it, and home with it.
    let last = performance.now();
    function frame(now) {
      const real = Math.min(0.25, (now - last) / 1000);
      const dt = Math.min(0.05, real);
      last = now;
      if (!paused) {
        timer += real;
        // the kit's walk home takes dt-sit off the dog (its mingle); a pose of ours keeps its classes
        for (const c of POSES[pose].cls) if (!dog.classList.contains(c)) dog.classList.add(c);
        // settle into a pose, or up out of one
        if (tween.t < 1 && !['pick', 'leap'].includes(state)) {
          tween.t = Math.min(1, tween.t + real / 0.25);
          const P = POSES[pose];
          d.pitch = tween.pitch + (P.pitch - tween.pitch) * tween.t;
          d.sink = tween.sink + (P.sink - tween.sink) * tween.t;
          if (state === 'dragging') watch(b.x, b.y, false); else drawDog();
        }
        // at night, a woken dog that is home and idle goes back to bed
        if (!night()) svg.classList.remove('tm-awake');
        else if (svg.classList.contains('tm-awake') && state === 'home' && now > awakeUntil) {
          svg.classList.remove('tm-awake');
          say('Back to bed in its house. Goodnight.');
        }
        if (state === 'dragging') {
          holdFor += real;
          if (pose === 'stand' && holdFor >= SIT_AFTER && holdFor < GRAB_AFTER) { setPose('sit'); say('Sitting nicely, eyes on the ball. Let go to throw it.'); }
          if (holdFor >= GRAB_AFTER) jumpForIt();
        } else if (state === 'dropping' || state === 'flying') {
          const rested = physics(dt);
          drawBall(); watch(b.x, b.y, state === 'flying');
          if (rested) {
            if (atPaws() && state === 'dropping') setState('ready');
            else if (timer > 0.2) { setState('out'); say('Off the dog goes.'); }
          }
        } else if (state === 'out' || state === 'back') {
          const going = state === 'out';
          const target = going ? clamp(b.x - home[0] - flipX(PICK_MOUTH_X), DX_MIN, DX_MAX) : 0;
          const step = RUN_SPEED * dt, gap = target - d.dx;
          d.dx = Math.abs(gap) <= step ? target : d.dx + Math.sign(gap) * step;
          if (going) watch(b.x, b.y, false); else lookAhead();
          if (d.dx === target) {
            if (going) setState('pick');
            else welcomeHome(dog.classList.contains('dt-empty') ? '' : 'Back with the ball. Good dog. Tap the dog to drop it again.');
          }
        } else if (state === 'pick') {
          // down to the water and up again; the ball goes into the mouth at the bottom
          const k = Math.min(1, timer / 0.5), dip = Math.sin(Math.PI * k);
          d.px = 94; d.py = 62;
          d.pitch = 22 * dip; d.look = 40 * dip; d.sink = 8 * dip;
          if (k >= 0.5 && dog.classList.contains('dt-empty')) holding(true);
          drawDog();
          if (k >= 1) { d.pitch = 0; d.look = 0; d.sink = 0; d.px = HIP.x; d.py = HIP.y; drawDog(); setState('back'); }
        } else if (state === 'leap') {
          // up to the ball, snap, and down again
          const t = Math.min(1, timer / 0.8);
          const e = Math.min(1, t / 0.3);
          d.dx = leap.from + (leap.to - leap.from) * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
          d.sink = leap.sink0 * (1 - e) - leap.h * 4 * t * (1 - t);
          d.pitch = leap.pitch0 * (1 - e) - 20 * (1 - 2 * t) * e;
          d.look = t < 0.5 ? -10 : 0;
          if (t >= 0.5 && !leap.got) { leap.got = true; holding(true); say('Up it jumps, and it has the ball. Good catch.'); }
          drawDog();
          if (t >= 1) {
            d.sink = 0; d.pitch = 0;
            if (Math.abs(d.dx) < 1) welcomeHome('Good catch. Tap the dog to drop it again.');
            else setState('back');
          }
        } else if (state === 'pose') {
          if (timer >= act.hold) setState(act.then);
        } else if (state === 'spin') {
          // a full turn on the spot: its side squashes through edge-on and back, with a little hop
          const t = Math.min(1, timer / 0.9);
          d.turn = Math.cos(2 * Math.PI * t);
          d.sink = -8 * Math.sin(Math.PI * t);
          drawDog();
          if (t >= 1) { d.turn = 1; d.sink = 0; drawDog(); setState(act.then); }
        } else if (state === 'come') {
          // to Tumble, a sit there, then home
          const going = act.target !== null;
          const target = going ? act.target : 0;
          const step = RUN_SPEED * dt, gap = target - d.dx;
          d.dx = Math.abs(gap) <= step ? target : d.dx + Math.sign(gap) * step;
          d.s = gap < 0 ? -1 : gap > 0 ? 1 : d.s;
          drawDog();
          if (d.dx === target && going && pose === 'stand') { setPose('sit'); timer = 0; }
          if (going && pose === 'sit' && timer > 2.2) { act.target = null; setPose('stand'); }
          if (!going && d.dx === 0) { d.s = 1; drawDog(); setState(act.then); }
        }
      }
      requestAnimationFrame(frame);
    }
    drawDog();
    requestAnimationFrame((t) => { last = t; frame(t); });

    return {
      setPaused(on) { paused = !!on; },
      state: () => state,
      show,
      beg,
      wake,
      asleep: () => !awake(),
    };
  }

  window.tmFetch = Object.freeze({ init, paint, COLOURS, BANDS });
}());
