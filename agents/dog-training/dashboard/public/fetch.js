'use strict';

/* The dog in Lakeside Field, on Tumble's dashboard: a person's own dog's colours, and the game.
   The kit's live Field view (/kit/art/kindlemere-field.svg, drawn by /kit/kindlemere.js) holds this lane's dog
   (/art/field-dog.svg): app.js puts it where the scene's dog runs and hands it here. The dog's day, fetch and the
   commands Tumble shows are the kit's (/kit/kindlemere-dog.js, the same dog as in the whole of Kindlemere), so this
   room tells the kit it brings its own dog and attaches it once it is in place.

     tap the dog            it drops the ball at its feet and waits, panting
     drag the ball          the dog watches it, and Tumble watches it too; held 2 s it sits, held 10 s it jumps for it
     let go with a flick    the ball flies, bounces and rolls (or floats back in); the dog runs for it and brings it back
     show(command)          sit, down, stay, paw, spin, come (to Tumble), drop it, fetch
     beg()                  the look it gives you when the treats come out
     keyboard               the dog is a button: Enter or Space drops the ball, and again throws it
     after dark             the dog sleeps in its house (the scene's own night); wake() brings it out for a while

   Reduced motion: the same game without the travel. No network, no storage: it only moves shapes on this page. */
(function () {
  // This room seats its own dog in the Field (app.js), so the kit does not start one of its own.
  window.kindlemereDogManual = true;

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

  // The game on this room's dog: { setPaused, state, show, beg, wake, asleep, ... } (kit/CONTRACT.md), or null.
  function init(svg, sayFn, dogEl) {
    const dog = dogEl || (svg && svg.querySelector('#dt-dog'));
    if (!svg || !dog || !window.kindlemereDog) return null;
    return window.kindlemereDog.attach(svg, dog, { say: sayFn, chatty: true });
  }

  window.tmFetch = Object.freeze({ init, paint, COLOURS, BANDS });
}());
