'use strict';

/* Fetch with the dog in Lakeside Field, on Tumble's dashboard.
   app.js inlines the kit's close view (/kit/art/kindlemere-field.svg) and puts this lane's dog (/art/field-dog.svg, #dt-dog)
   where the scene's own dog runs. This file moves that dog and one ball of its own; it never edits either file.
   Units are the scene's; the dog's own parts are in its own frame (facing right, paws on y = 64).

     tap the dog            it drops the ball from its mouth and pants
     drag the ball          the dog turns to face it, its head and eyes follow it, and Tumble watches it too
     hold it 2 seconds      the dog sits nicely and waits
     hold it 10 seconds     the dog jumps up and grabs it, then trots home with it
     let go with a flick    the ball flies, bounces and rolls; the dog gallops to it, picks it up and brings it home
     keyboard               the dog is a button: Enter or Space drops the ball, and again throws it

   Reduced motion: the same game without the travel. The ball lands where it would, and the dog has it back at once.
   No network, no storage: it only moves shapes on this page. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const GRAVITY = 1100, MAX_SPEED = 1400, RUN_SPEED = 210;
  const SIT_AFTER = 2, GRAB_AFTER = 10;       // seconds of holding the ball
  const PAWS = 64;                             // the dog's paws, in its own frame
  const BODY = { x0: 10, x1: 150 };            // tail root to nose, in its own frame; the dog turns about the middle
  const PICK_MOUTH_X = 135;                    // where the mouth reaches the water when it dips for the ball
  const SIT = { pitch: -32, sink: 30, px: 30, py: 21 };   // tipped back onto its haunches, about the hip
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nums = (s) => String(s || '').trim().split(/[\s,]+/).map(Number);

  function init(svg, statusEl) {
    const dog = svg.querySelector('#dt-dog');
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

    // Eyes that follow the ball: the dog's own, and Tumble's (each dark pupil with the catchlight after it).
    const pupils = [...dog.querySelectorAll('.dt-pupil')];
    const keeper = svg.querySelector('#km-keeper-dog-training');
    const keeperEyes = keeper ? [...keeper.querySelectorAll('circle')]
      .filter((c) => (c.getAttribute('fill') || '').toUpperCase() === '#1A2433' && +c.getAttribute('r') >= 3 && +c.getAttribute('r') <= 5)
      .map((c) => {
        const g = document.createElementNS(NS, 'g');
        const light = c.nextElementSibling && c.nextElementSibling.tagName === 'circle' ? c.nextElementSibling : null;
        c.parentNode.insertBefore(g, c);
        g.appendChild(c);
        if (light) g.appendChild(light);
        return { g, x: +c.getAttribute('cx'), y: +c.getAttribute('cy') };
      }) : [];

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
    const grain = svg.querySelector('#km-grain');
    if (grain) svg.insertBefore(ball, grain); else svg.appendChild(ball);

    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const say = (text) => { if (statusEl) statusEl.textContent = text; };

    const b = { x: 0, y: 0, vx: 0, vy: 0, angle: 0 };
    // dx and s place and face the dog; pitch, sink and the pivot pose its body; look turns its head.
    const d = { dx: 0, s: 1, look: 0, pitch: 0, sink: 0, px: 94, py: 62, sit: 0 };
    const leap = { from: 0, to: 0, h: 0, sink0: 0, pitch0: 0, got: false };
    let state = 'home';     // home (ball in its mouth), dropping, ready, dragging, flying, out, pick, back, leap
    let paused = false, timer = 0, holdFor = 0, samples = [], sitting = false;   // holdFor: seconds the ball has been held, in real time

    dog.setAttribute('tabindex', '0');
    dog.setAttribute('role', 'button');
    dog.setAttribute('aria-label', 'Play fetch with the dog');

    const flipX = (x) => CX + d.s * (x - CX);
    function drawDog() {
      dog.setAttribute('transform', `translate(${(home[0] + d.dx).toFixed(2)} ${home[1]}) translate(${CX} 0) scale(${d.s} 1) translate(${-CX} 0)`);
      body.setAttribute('transform', `${bodyBase} translate(0 ${d.sink.toFixed(2)}) rotate(${d.pitch.toFixed(1)} ${d.px} ${d.py})`);
      look.setAttribute('transform', `rotate(${d.look.toFixed(1)} ${pivot[0]} ${pivot[1]})`);
    }
    function drawBall() {
      ball.setAttribute('transform', `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)})`);
      spin.setAttribute('transform', `rotate(${b.angle.toFixed(1)})`);
    }
    // Ball in the mouth, or out of it (the dog's drawing swaps its mouth to an open pant when it has the class dt-empty).
    function holding(on) {
      dog.classList.toggle('dt-empty', !on);
      ball.style.display = on ? 'none' : '';
    }
    function sit(on) {
      sitting = on;
      dog.classList.toggle('dt-sit', on);
      if (on) { d.px = SIT.px; d.py = SIT.py; }
      if (reduced.matches) d.sit = on ? 1 : 0;
    }
    // Face the ball, turn the head toward it, and look at it. Tumble looks too.
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
    function setState(next) {
      if (next === 'out') d.s = b.x < home[0] + d.dx + CX ? -1 : 1;
      if (next === 'back') d.s = d.dx > 0 ? -1 : 1;
      if (next !== 'dragging' && sitting) sit(false);
      state = next;
      timer = 0;
      svg.classList.toggle('is-picking', next === 'pick');
      ball.style.cursor = (next === 'ready' || next === 'flying' || next === 'dropping') ? 'grab' : (next === 'dragging' ? 'grabbing' : 'default');
    }

    // Ball physics: gravity, a soft bounce on the water, rolling friction, the edges of the picture.
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
      d.dx = 0; d.s = 1; d.look = 0; d.pitch = 0; d.sink = 0; d.sit = 0;
      holding(true);
      watch(home[0] + 200, home[1], false);
      setState('home');
      say(text);
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
    // Held too long: up it jumps, along an arc whose top is the ball.
    function jumpForIt() {
      if (reduced.matches) { welcomeHome('That was a long wait. The dog jumped up and grabbed the ball. Good catch.'); return; }
      leap.from = d.dx;
      leap.to = clamp(b.x - home[0] - flipX(MOUTH.x), DX_MIN, DX_MAX);
      leap.h = clamp(home[1] + MOUTH.y - b.y, 16, 110);   // no higher than keeps its ears in the picture
      leap.got = false;
      leap.sink0 = d.sink; leap.pitch0 = d.pitch;   // it springs up from wherever it is, the sit included
      d.sit = 0; d.px = SIT.px; d.py = SIT.py;
      setState('leap');
      say('That was a long wait. Up it jumps!');
    }

    // Tap or Enter on the dog.
    function onDog(fromKeyboard) {
      if (state === 'home') {
        drop();
        say(fromKeyboard ? 'The ball is down. Press Enter on the dog again to throw it.' : 'The ball is down. Drag it and let go to throw it.');
      } else if (state === 'ready' && fromKeyboard) {
        const dir = b.x > home[0] + CX ? -1 : (Math.random() < 0.5 ? -1 : 1);
        throwBall(dir * (260 + Math.random() * 260), -(380 + Math.random() * 260));
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

    // The loop: the ball in the air; the dog sitting, jumping, out to the ball, down for it, and home with it.
    let last = performance.now();
    function frame(now) {
      const real = Math.min(0.25, (now - last) / 1000);
      const dt = Math.min(0.05, real);
      last = now;
      if (!paused) {
        timer += real;
        // settle into the sit, or up out of it
        const sitGoal = sitting ? 1 : 0;
        if (d.sit !== sitGoal) {
          d.sit = clamp(d.sit + Math.sign(sitGoal - d.sit) * dt / 0.25, 0, 1);
          d.pitch = SIT.pitch * d.sit; d.sink = SIT.sink * d.sit;
          watch(b.x, b.y, false);
        }
        if (state === 'dragging') {
          holdFor += real;
          if (!sitting && holdFor >= SIT_AFTER) { sit(true); say('Sitting nicely, eyes on the ball. Let go to throw it.'); }
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
          if (going) watch(b.x, b.y, false); else { d.look = 0; drawDog(); }
          if (d.dx === target) {
            if (going) setState('pick');
            else welcomeHome('Back with the ball. Good dog. Tap the dog to drop it again.');
          }
        } else if (state === 'pick') {
          // down to the water and up again; the ball goes into the mouth at the bottom
          const k = Math.min(1, timer / 0.5), dip = Math.sin(Math.PI * k);
          d.px = 94; d.py = 62;
          d.pitch = 22 * dip; d.look = 40 * dip; d.sink = 8 * dip;
          if (k >= 0.5 && dog.classList.contains('dt-empty')) holding(true);
          drawDog();
          if (k >= 1) { d.pitch = 0; d.look = 0; d.sink = 0; drawDog(); setState('back'); }
        } else if (state === 'leap') {
          // up to the ball, snap, and down again
          const t = Math.min(1, timer / 0.8);
          d.dx = leap.from + (leap.to - leap.from) * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
          const e = Math.min(1, t / 0.3);
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
        }
      }
      requestAnimationFrame(frame);
    }
    drawDog();
    requestAnimationFrame((t) => { last = t; frame(t); });

    return { setPaused(on) { paused = !!on; }, state: () => state };
  }

  window.tmFetch = Object.freeze({ init });
}());
