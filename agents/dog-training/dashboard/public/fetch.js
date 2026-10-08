'use strict';

/* Fetch with the meadow dog, on Tumble's dashboard.
   The figure (art.svg) is inlined by app.js; this file moves two of its parts: #tm-dog (the whole dog, shadow included) and
   #tm-ball (the tennis ball, its centre at the group's origin). Everything is in the figure's own units (viewBox 0 54 320 246).

     tap the dog            a ball drops from its mouth and bounces to rest
     drag the ball          the dog's head and eyes follow it
     let go with a flick    the ball flies, bounces and rolls; the dog runs to it, picks it up, brings it back and drops it
     keyboard               the dog is a button: Enter or Space drops the ball, and again throws it

   Reduced motion: the same game without the travel. The ball lands where it would, and the dog has it back at once.
   No network, no storage: it only moves shapes on this page. */
(function () {
  const GROUND = 266;                 // the ball's centre when it rests on the grass
  const LEFT = 10, RIGHT = 312, TOP = 64;
  const GRAVITY = 1100, MAX_SPEED = 1400, RUN_SPEED = 230;
  const HOME_BALL = { x: 236, y: GROUND };
  const MOUTH = { x: 267, y: 210 };   // where the dog holds the ball, in the dog's own frame
  const PIVOT = { x: 268, y: 270 };   // where the dog sits on the grass
  const DX_MIN = -224, DX_MAX = 10;   // the dog stays inside the picture

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function init(svg, statusEl) {
    const dog = svg.querySelector('#tm-dog');
    const ball = svg.querySelector('#tm-ball');
    const spin = svg.querySelector('.tm-ball-spin');
    const tilt = svg.querySelector('.tm-tilt');
    const pupils = svg.querySelector('.tm-pupils');
    if (!dog || !ball || !spin || !tilt || !pupils) return null;

    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const say = (text) => { if (statusEl) statusEl.textContent = text; };

    const b = { x: HOME_BALL.x, y: HOME_BALL.y, vx: 0, vy: 0, angle: 0 };
    const d = { dx: 0, s: 1, bob: 0, lean: 0, phase: 0 };
    let state = 'idle';               // idle, dropping, ready, dragging, flying, out, pick, back, dropoff
    let paused = false;
    let timer = 0;                    // seconds spent in the current state
    let samples = [];
    let happyUntil = 0;

    dog.setAttribute('tabindex', '0');
    dog.setAttribute('role', 'button');
    dog.setAttribute('aria-label', 'Play fetch with the meadow dog');
    ball.style.touchAction = 'none';
    ball.style.display = 'none';

    function dogMatrix() {
      return new DOMMatrix()
        .translate(d.dx, d.bob)
        .translate(PIVOT.x, PIVOT.y).rotate(d.lean).translate(-PIVOT.x, -PIVOT.y)
        .translate(PIVOT.x, 0).scale(d.s, 1).translate(-PIVOT.x, 0);
    }
    function mouth() { return dogMatrix().transformPoint(new DOMPoint(MOUTH.x, MOUTH.y)); }
    function drawDog() {
      const m = dogMatrix();
      dog.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
    }
    function drawBall() {
      ball.setAttribute('transform', `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)})`);
      spin.setAttribute('transform', `rotate(${b.angle.toFixed(1)})`);
    }
    function look(x, y) {
      const home = Math.abs(d.dx) < 1 && d.s === 1;
      const t = home ? clamp((x - 266) / 7, -18, 14) : 0;
      tilt.style.transform = `rotate(${t.toFixed(1)}deg)`;
      const px = clamp(((x - (268 + d.dx)) / 50) * d.s, -1.4, 1.4);
      const py = clamp((y - 190) / 50, -1.3, 1.3);
      pupils.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)`;
    }
    function setState(next) {
      if (next === 'out') d.s = b.x < mouth().x ? 1 : -1;   // pick the running direction once, as it sets off
      if (next === 'back') d.s = d.dx < 0 ? -1 : 1;
      state = next;
      timer = 0;
      svg.classList.toggle('is-running', next === 'out' || next === 'back');
      svg.classList.toggle('is-dragging', next === 'dragging');
      ball.style.cursor = (next === 'ready' || next === 'flying' || next === 'dropping') ? '' : 'default';
    }
    function happy(seconds) {
      happyUntil = performance.now() + seconds * 1000;
      svg.classList.add('is-happy');
    }

    // Ball physics: gravity, a soft bounce on the grass, rolling friction, and the edges of the picture.
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
      b.angle += (b.vx * dt) / 7 * (180 / Math.PI);
      return grounded && b.vy === 0 && Math.abs(b.vx) < 6;
    }
    // Where a throw would come to rest, for reduced motion.
    function settle() {
      for (let i = 0; i < 2000; i += 1) if (physics(1 / 120)) break;
      b.vx = 0; b.vy = 0;
    }

    function dropFromMouth(vx) {
      const p = mouth();
      b.x = p.x; b.y = p.y; b.vx = vx; b.vy = 0;
      ball.style.display = '';
      if (reduced.matches) { settle(); drawBall(); look(b.x, b.y); setState('ready'); return; }
      setState('dropping');
    }
    function nearHome() { return Math.abs(b.x - HOME_BALL.x) < 40 && Math.abs(d.dx) < 1; }

    function throwBall(vx, vy) {
      const speed = Math.hypot(vx, vy);
      const k = speed > MAX_SPEED ? MAX_SPEED / speed : 1;
      b.vx = vx * k; b.vy = vy * k;
      if (reduced.matches) {
        settle();
        if (nearHome()) { drawBall(); setState('ready'); return; }
        // the dog has it back at once
        b.x = HOME_BALL.x; b.y = HOME_BALL.y; drawBall(); happy(1.6); setState('ready');
        say('Fetched it. The ball is back at the dog\'s paws.');
        return;
      }
      setState('flying');
    }

    // Tap or Enter on the dog.
    function onDog(fromKeyboard) {
      svg.classList.add('is-playing');
      if (state === 'idle') {
        dropFromMouth(-40);
        say(fromKeyboard ? 'The ball is down. Press Enter on the dog again to throw it.' : 'The ball is down. Drag it and let go to throw it.');
      } else if (state === 'ready') {
        if (fromKeyboard) {
          const dir = Math.random() < 0.7 ? -1 : 1;
          throwBall(dir * (260 + Math.random() * 260), -(380 + Math.random() * 260));
        } else {
          happy(1.2);
          say('Drag the ball and let go to throw it.');
        }
      }
    }
    dog.addEventListener('click', (e) => { if (e.detail !== 0) onDog(false); });
    dog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDog(true); }
    });

    // Dragging the ball.
    function toSvg(e) {
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
      const p = toSvg(e);
      b.x = p.x; b.y = p.y; b.vx = 0; b.vy = 0;
      samples = [{ x: p.x, y: p.y, t: performance.now() }];
      drawBall(); look(b.x, b.y);
    });
    ball.addEventListener('pointermove', (e) => {
      if (state !== 'dragging') return;
      const p = toSvg(e);
      const now = performance.now();
      b.angle += (p.x - b.x) / 7 * (180 / Math.PI);
      b.x = p.x; b.y = p.y;
      samples.push({ x: p.x, y: p.y, t: now });
      samples = samples.filter((s) => now - s.t < 100);
      drawBall(); look(b.x, b.y);
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

    // The loop: the ball in the air, the dog running there and back.
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!paused) {
        timer += dt;
        if (happyUntil && now > happyUntil) { happyUntil = 0; svg.classList.remove('is-happy'); }

        if (state === 'dropping' || state === 'flying' || state === 'dropoff') {
          const rested = physics(dt);
          drawBall(); look(b.x, b.y);
          if (rested) {
            if (state === 'dropoff' || nearHome()) {
              if (state === 'dropoff') { happy(1.6); say('Back with the ball. Good dog.'); }
              setState('ready');
            } else if (timer > 0.25) {
              setState('out');
              say('Off the dog goes.');
            }
          }
        } else if (state === 'out' || state === 'back') {
          const going = state === 'out';
          const s = d.s;
          const target = going ? clamp(b.x - PIVOT.x + s, DX_MIN, DX_MAX) : 0;
          const step = RUN_SPEED * dt;
          const gap = target - d.dx;
          d.dx = Math.abs(gap) <= step ? target : d.dx + Math.sign(gap) * step;
          d.phase += dt;
          d.bob = -Math.abs(Math.sin(d.phase * Math.PI * 3.2)) * 7;
          d.lean = (s === 1 ? -7 : 7) + Math.sin(d.phase * Math.PI * 6.4) * 2;
          if (!going) { const p = mouth(); b.x = p.x; b.y = p.y; drawBall(); }
          look(b.x, b.y);
          if (d.dx === target) {
            if (going) setState('pick');
            else { d.s = 1; d.bob = 0; d.lean = 0; drawDog(); dropFromMouth(-60); setState('dropoff'); }
          }
          drawDog();
        } else if (state === 'pick') {
          // a dip to the grass: the ball goes into the mouth halfway through
          const k = Math.min(1, timer / 0.36);
          d.bob = 0;
          d.lean = (d.s === 1 ? -1 : 1) * 20 * Math.sin(Math.PI * k);
          if (k >= 0.5) { const p = mouth(); b.x = p.x; b.y = p.y; b.vx = 0; b.vy = 0; drawBall(); }
          drawDog();
          if (k >= 1) setState('back');
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame((t) => { last = t; frame(t); });

    return {
      setPaused(on) { paused = !!on; },
      state: () => state,
    };
  }

  window.tmFetch = Object.freeze({ init });
}());
