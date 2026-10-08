'use strict';

/**
 * /kit/kindlemere.js: the live sky over Kindlemere (kit/REALM.md). /kit/kit.js loads it when a page shows the scene.
 *
 * Every <img> of /kit/art/kindlemere*.svg on the page becomes the same picture as a stack of depth layers (sky, far
 * hills, the hill, the land, the characters), and once a minute:
 *   - the sun and the moon go where they are in the real sky now, for this computer's clock and place, and rise and
 *     set behind the hills (east on the left, west on the right);
 *   - the sky takes the colours of the hour, the land takes its light, and the moon shows its real phase;
 *   - after dark the stars, the fireflies and the lights come out, the dog sleeps in its house and the keepers doze.
 * The layers shift a little with the pointer or the phone's tilt, far ones least. Everyone potters about their own
 * place, neighbours have a word, and every so often a group walks the paths to visit another place (the cast, below);
 * the dog has a day of its own and plays fetch anywhere in the realm (/kit/kindlemere-dog.js). window.kindlemere.hold(true)
 * (from /kit/kit.js) keeps everyone home while a room is busy. The signpost's arms lead to their places, and going there
 * is a camera move through the one world (window.kindlemere.go). Reduced motion: all still.
 * The place: kit/realm.config.json ({ "lat": 35.5, "lon": -97.5 }) through /api/realm on an agent's page, else this
 * computer's time zone. Add ?km-time=2026-10-07T21:30 to the page's address to see another hour.
 * Each scene, once drawn, fires 'kindlemere:ready' on window with { svg, scene, part }: svg is the characters' layer,
 * scene the stack, part('dog') finds the parts marked data-km-part (dog, dog-head, dog-pupils, dog-ball). The stack
 * and every layer carry data-km-night="1" after dark and data-km-evening="1" from late afternoon.
 */
(function () {
  /* ---------------------------------------------------------------- where the sun and the moon are */
  // The usual low-precision formulas for the sun's and the moon's place in the sky (good to a fraction of a degree).
  const RAD = Math.PI / 180;
  const OBLIQ = RAD * 23.4397;
  const days = (date) => date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
  const rightAscension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBLIQ) - Math.tan(b) * Math.sin(OBLIQ), Math.cos(l));
  const declination = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBLIQ) + Math.cos(b) * Math.sin(OBLIQ) * Math.sin(l));
  const sidereal = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw;

  function sunCoords(d) {
    const m = RAD * (357.5291 + 0.98560028 * d);
    const c = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
    const l = m + c + RAD * 102.9372 + Math.PI;
    return { ra: rightAscension(l, 0), dec: declination(l, 0) };
  }

  function moonCoords(d) {
    const l0 = RAD * (218.316 + 13.176396 * d);
    const m = RAD * (134.963 + 13.064993 * d);
    const f = RAD * (93.272 + 13.22935 * d);
    const l = l0 + RAD * 6.289 * Math.sin(m);
    const b = RAD * 5.128 * Math.sin(f);
    return { ra: rightAscension(l, b), dec: declination(l, b), dist: 385001 - 20905 * Math.cos(m) };
  }

  /** Altitude and azimuth in degrees; azimuth from the south, west positive. */
  function skyPlace(coords, d, lat, lon) {
    const phi = RAD * lat;
    const h = sidereal(d, RAD * -lon) - coords.ra;
    const alt = Math.asin(Math.sin(phi) * Math.sin(coords.dec) + Math.cos(phi) * Math.cos(coords.dec) * Math.cos(h));
    const az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(coords.dec) * Math.cos(phi));
    return { alt: alt / RAD, az: az / RAD };
  }

  /** How much of the moon is lit (0..1) and whether it is waxing. */
  function moonPhase(d) {
    const s = sunCoords(d);
    const m = moonCoords(d);
    const sdist = 149598000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
    const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { lit: (1 + Math.cos(inc)) / 2, waxing: angle < 0, phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI };
  }

  /* ---------------------------------------------------------------- where this computer is */
  const ZONES = {
    'America/New_York': [40.7, -74], 'America/Detroit': [42.3, -83], 'America/Chicago': [41.9, -87.6], 'America/Denver': [39.7, -105],
    'America/Phoenix': [33.4, -112.1], 'America/Los_Angeles': [34.1, -118.2], 'America/Anchorage': [61.2, -149.9], 'Pacific/Honolulu': [21.3, -157.9],
    'America/Toronto': [43.7, -79.4], 'America/Vancouver': [49.3, -123.1], 'America/Edmonton': [53.5, -113.5], 'America/Winnipeg': [49.9, -97.1],
    'America/Halifax': [44.6, -63.6], 'America/Mexico_City': [19.4, -99.1], 'America/Sao_Paulo': [-23.5, -46.6], 'Europe/London': [51.5, -0.1],
    'Europe/Dublin': [53.3, -6.3], 'Europe/Paris': [48.9, 2.4], 'Europe/Berlin': [52.5, 13.4], 'Europe/Madrid': [40.4, -3.7], 'Europe/Rome': [41.9, 12.5],
    'Europe/Amsterdam': [52.4, 4.9], 'Africa/Johannesburg': [-26.2, 28], 'Asia/Dubai': [25.2, 55.3], 'Asia/Kolkata': [28.6, 77.2],
    'Asia/Singapore': [1.35, 103.8], 'Asia/Shanghai': [31.2, 121.5], 'Asia/Tokyo': [35.7, 139.7], 'Australia/Sydney': [-33.9, 151.2],
    'Australia/Melbourne': [-37.8, 145], 'Australia/Perth': [-31.95, 115.9], 'Pacific/Auckland': [-36.8, 174.8],
  };

  function zonePlace() {
    let zone = '';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) { zone = ''; }
    if (ZONES[zone]) return { lat: ZONES[zone][0], lon: ZONES[zone][1] };
    // Not a zone we know: the standard-time offset gives the longitude, near enough for sunrise and sunset.
    const y = new Date().getFullYear();
    const std = Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset());
    return { lat: 40, lon: (-std / 60) * 15 };
  }

  async function herePlace() {
    if (window.kit && document.querySelector('meta[name="kit-token"]')) {
      try {
        const p = await window.kit.api('/api/realm');
        if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) return { lat: p.lat, lon: p.lon };
      } catch (_) { /* no setting: use the time zone */ }
    }
    return zonePlace();
  }

  function now() {
    const asked = new URLSearchParams(location.search).get('km-time');
    const t = asked ? new Date(asked) : null;
    return t && !Number.isNaN(t.valueOf()) ? t : new Date();
  }

  /* ---------------------------------------------------------------- colours of the hour */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');

  /** Interpolate a table of [altitude, ...values] rows at the sun's altitude. */
  function at(table, alt) {
    if (alt <= table[0][0]) return table[0].slice(1);
    for (let i = 1; i < table.length; i += 1) {
      if (alt <= table[i][0]) {
        const t = (alt - table[i - 1][0]) / (table[i][0] - table[i - 1][0]);
        return table[i].slice(1).map((v, j) => (typeof v === 'string' ? mix(table[i - 1][j + 1], v, t) : table[i - 1][j + 1] + (v - table[i - 1][j + 1]) * t));
      }
    }
    return table[table.length - 1].slice(1);
  }

  // The sky by the sun's altitude: top, middle, horizon. Night blues, an orange dawn and dusk, a clear teal day.
  const SKY = [
    [-18, '#08131F', '#0E1F33', '#16304A'],
    [-12, '#0F2036', '#1A3553', '#2B4864'],
    [-7, '#1C3352', '#38577A', '#A9714C'],
    [-3, '#31547C', '#8797A5', '#EC955A'],
    [1, '#5A8BB5', '#C5B9A4', '#FFAE6C'],
    [6, '#71A5CB', '#B8D2DB', '#FAD6A6'],
    [14, '#7CB3D5', '#B1D5E4', '#E9F0E4'],
    [30, '#76B0D6', '#AED6E8', '#E6F2EF'],
  ];
  // The light on the land: red, green, blue, saturation.
  const LIGHT = [
    [-14, 0.24, 0.31, 0.42, 0.5],
    [-8, 0.34, 0.4, 0.5, 0.6],
    [-3, 0.62, 0.62, 0.66, 0.78],
    [1, 0.93, 0.8, 0.7, 0.95],
    [6, 1.02, 0.94, 0.84, 1.05],
    [14, 1, 0.99, 0.96, 1],
    [25, 1, 1, 1, 1],
  ];

  function lightMatrix(r, g, b, s) {
    const m = [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
    const row = (k, i) => `${(k * m[i]).toFixed(3)} ${(k * m[i + 1]).toFixed(3)} ${(k * m[i + 2]).toFixed(3)} 0 0`;
    return `${row(r, 0)}  ${row(g, 3)}  ${row(b, 6)}  0 0 0 1 0`;
  }

  /* ---------------------------------------------------------------- one scene, in depth layers */
  const NS = 'http://www.w3.org/2000/svg';
  const OVER = 0.015; // each layer is drawn this far past every edge, so a parallax shift never shows an edge
  const DEPTH = { sky: 0.15, far: 0.35, hill: 0.6, land: 0.85, life: 0.85, actors: 1, grain: 0 };
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let count = 0;

  async function inline(img) {
    const res = await fetch(img.getAttribute('src'), { credentials: 'same-origin' });
    if (!res.ok) return null;
    const pre = `kmi${(count += 1)}-`;
    // Every id gets this scene's own prefix, so two scenes on one page never share a gradient or a filter.
    const text = (await res.text())
      .replace(/\bid="([^"]+)"/g, (m, id) => `id="${pre}${id}"`)
      .replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${pre}${id})`)
      .replace(/href="#([^"]+)"/g, (m, id) => `href="#${pre}${id}"`);
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    if (!svg || svg.nodeName !== 'svg' || doc.querySelector('parsererror')) return null;
    const groups = Array.from(svg.children).filter((n) => n.getAttribute('data-km-layer'));
    if (!groups.length) return null;
    svg.querySelectorAll('script, foreignObject, title, desc').forEach((n) => n.remove());

    // The stack takes the picture's place: its class, id, label and box. An inline svg has no object-fit, so the stack
    // keeps the picture's fit and position by cropping the view (crop()).
    const cs = getComputedStyle(img);
    const pos = cs.objectPosition.split(/\s+/).map((v) => (/%$/.test(v) ? parseFloat(v) / 100 : 0.5));
    const box = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const root = document.createElement('div');
    for (const a of ['class', 'id']) if (img.hasAttribute(a)) root.setAttribute(a, img.getAttribute(a));
    const alt = img.getAttribute('alt');
    // A group, not an image: the characters inside it are buttons, and the signpost's arms are links.
    if (alt) { root.setAttribute('role', 'group'); root.setAttribute('aria-label', alt); } else root.setAttribute('aria-hidden', 'true');
    root.classList.add('km-live');
    root.style.overflow = 'hidden';
    // No ratio from the page (an img's own is "auto <w> / <h>"): the stack takes the picture's.
    if (!cs.aspectRatio || /^auto/.test(cs.aspectRatio)) root.style.aspectRatio = `${box[2]} / ${box[3]}`;

    const layers = {};
    groups.forEach((gEl, i) => {
      const s = document.createElementNS(NS, 'svg');
      if (gEl.getAttribute('data-km-layer') !== 'actors') s.setAttribute('aria-hidden', 'true');
      s.setAttribute('focusable', 'false');
      s.setAttribute('preserveAspectRatio', 'none');
      s.style.cssText = `position:absolute;left:${-OVER * 100}%;top:${-OVER * 100}%;width:${100 + OVER * 200}%;height:${100 + OVER * 200}%;max-width:none;max-height:none;pointer-events:none;overflow:hidden;${still ? '' : 'will-change:transform;'}`;
      if (i === 0) for (const n of Array.from(svg.children)) if (n.nodeName === 'style' || n.nodeName === 'defs') s.appendChild(document.importNode(n, true));
      s.appendChild(document.importNode(gEl, true));
      root.appendChild(s);
      layers[gEl.getAttribute('data-km-layer')] = s;
    });
    img.replaceWith(root);
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    return {
      root, layers, box, pos, vb: box.slice(), view: svg.getAttribute('data-km-view') || '', sky: (svg.getAttribute('data-km-sky') || '60 900').split(/\s+/).map(Number),
      $: (id) => document.getElementById(`${pre}km-${id}`), cur: [0, 0], target: [0, 0],
    };
  }

  /** Fill the stack's box with the view, as object-fit: cover at the picture's object-position. */
  function crop(scene) {
    const w = scene.root.clientWidth;
    const h = scene.root.clientHeight;
    if (!w || !h) return;
    let [x, y, bw, bh] = scene.box;
    if (w / h < bw / bh) { const cw = bh * (w / h); x += (bw - cw) * scene.pos[0]; bw = cw; } else { const ch = bw / (w / h); y += (bh - ch) * scene.pos[1]; bh = ch; }
    scene.vb = [x, y, bw, bh];
    scene.cw = w;   // the width on the page, kept here so the frame loop never has to measure it (a forced layout)
    const v = `${(x - bw * OVER).toFixed(1)} ${(y - bh * OVER).toFixed(1)} ${(bw * (1 + 2 * OVER)).toFixed(1)} ${(bh * (1 + 2 * OVER)).toFixed(1)}`;
    Object.values(scene.layers).forEach((s) => s.setAttribute('viewBox', v));
    // What the camera shows and how many pixels a world unit is, for the dog's game (/kit/kindlemere-dog.js)
    if (scene.layers.actors) {
      scene.layers.actors.setAttribute('data-km-view', `${x.toFixed(1)} ${y.toFixed(1)} ${bw.toFixed(1)} ${bh.toFixed(1)}`);
      scene.layers.actors.setAttribute('data-km-scale', (w / bw).toFixed(4));
    }
  }

  function mark(scene, name, on) {
    for (const el of [scene.root, ...Object.values(scene.layers)]) if (on) el.setAttribute(name, '1'); else el.removeAttribute(name);
  }

  function draw(scene, place, t) {
    const { $ } = scene;
    const [vx, , vw] = scene.vb;
    const [top, horizon] = scene.sky;
    const d = days(t);
    const sun = skyPlace(sunCoords(d), d, place.lat, place.lon);
    const moon = skyPlace(moonCoords(d), d, place.lat, place.lon);
    // East on the left, west on the right: facing south north of the equator, north south of it.
    const across = (az) => {
      const bearing = az + 180;
      const off = place.lat >= 0 ? az : (bearing > 180 ? bearing - 360 : bearing);
      return vx + vw * (0.5 + off / 270);
    };
    const up = (alt) => horizon - (horizon - top) * clamp(alt / 62, -0.4, 1.05);
    const h = sun.alt;

    const sky = at(SKY, h);
    ['sky-0', 'sky-1', 'sky-2'].forEach((id, i) => { const s = $(id); if (s) s.setAttribute('stop-color', sky[i]); });
    const [r, g, b, sat] = at(LIGHT, h);
    const moonLight = h < -6 && moon.alt > 0 ? moonPhase(d).lit * Math.sin(moon.alt * RAD) * 0.14 : 0;
    const m = $('light-m');
    if (m) m.setAttribute('values', lightMatrix(r + moonLight * 0.8, g + moonLight * 0.9, b + moonLight, sat));

    const sunEl = $('sun');
    if (sunEl) {
      const k = sunEl.dataset.k || (sunEl.dataset.k = (/scale\(([\d.]+)\)/.exec(sunEl.getAttribute('transform')) || [0, '1'])[1]);
      const sx = across(sun.az);
      sunEl.setAttribute('transform', `translate(${sx.toFixed(1)} ${up(h).toFixed(1)}) scale(${k})`);
      sunEl.setAttribute('display', h < -8 ? 'none' : 'inline');
      const warm = clamp(h / 20, 0, 1);
      $('sun-core').setAttribute('fill', mix('#FFB25E', '#FFF3C4', warm));
      $('sun-rim').setAttribute('fill', mix('#FF9046', '#FFE2A0', warm));
      $('sun-rays').setAttribute('opacity', clamp((h - 2) / 8, 0, 1).toFixed(2));
      const glow = $('sunglow');
      glow.setAttribute('cx', sx.toFixed(1));
      glow.setAttribute('opacity', (clamp(1 - Math.abs(h + 1) / 9, 0, 1) * 0.9).toFixed(2));
    }

    const moonEl = $('moon');
    const phase = moonPhase(d);
    if (moonEl) {
      const k = moonEl.dataset.k || (moonEl.dataset.k = (/scale\(([\d.]+)\)/.exec(moonEl.getAttribute('transform')) || [0, '1'])[1]);
      moonEl.setAttribute('transform', `translate(${across(moon.az).toFixed(1)} ${up(moon.alt).toFixed(1)}) scale(${k})`);
      moonEl.setAttribute('display', moon.alt < -6 || phase.lit < 0.02 ? 'none' : 'inline');
      moonEl.setAttribute('opacity', h > 0 ? '0.75' : '1');
      $('moon-dark').setAttribute('opacity', (clamp((-h - 2) / 8, 0, 1) * 0.7).toFixed(2));
      // The lit part: the bright limb on the right while waxing (left south of the equator), the terminator an ellipse.
      const ex = (Math.abs(1 - 2 * phase.lit) * 40).toFixed(2);
      const lit = $('moon-lit');
      lit.setAttribute('d', `M0 -40 A40 40 0 0 1 0 40 A${ex} 40 0 0 ${phase.lit < 0.5 ? 0 : 1} 0 -40 Z`);
      lit.setAttribute('transform', phase.waxing === (place.lat >= 0) ? '' : 'scale(-1 1)');
    }

    const dark = clamp((-h - 1) / 8, 0, 1);
    const stars = $('stars');
    if (stars) stars.setAttribute('opacity', clamp((-h - 4) / 8, 0, 1).toFixed(2));
    const glowLayer = $('glow');
    if (glowLayer) glowLayer.setAttribute('opacity', dark.toFixed(2));
    scene.night = h < -4;
    mark(scene, 'data-km-night', scene.night);
    // Evening: from late afternoon (the sun low in the west) through the night. Spud comes round for dinner.
    scene.dinner = h < 12 && sun.az > 0 && !scene.night;
    mark(scene, 'data-km-evening', (h < 12 && sun.az > 0) || h < -4);

    // The path of light on the water: under the low sun by day, under the moon by night.
    const glitter = $('glitter');
    if (glitter) {
      let gx = across(sun.az);
      let op = h > -1 ? clamp((40 - h) / 40, 0.2, 0.85) : 0;
      let col = h < 8 ? '#FFC98A' : '#FFF1C8';
      if (h <= -1 && moon.alt > 0) { gx = across(moon.az); op = clamp(moon.alt / 15, 0, 1) * phase.lit * 0.9; col = '#F4EFD8'; }
      glitter.setAttribute('transform', `translate(${gx.toFixed(1)} 0)`);
      glitter.setAttribute('opacity', op.toFixed(2));
      glitter.setAttribute('stroke', col);
    }
  }

  /* ---------------------------------------------------------------- depth: the layers follow the pointer or the tilt */
  function parallax(scene) {
    scene.cur[0] += (scene.target[0] - scene.cur[0]) * 0.08;
    scene.cur[1] += (scene.target[1] - scene.cur[1]) * 0.08;
    const amp = (scene.cw || 0) * 0.012;
    // nothing to write while the layers are where they were (the cast walking keeps the frames coming)
    const key = `${(scene.cur[0] * amp).toFixed(2)} ${(scene.cur[1] * amp).toFixed(2)}`;
    if (key === scene.parallaxAt) return false;
    scene.parallaxAt = key;
    for (const [name, s] of Object.entries(scene.layers)) {
      const k = DEPTH[name] === undefined ? 1 : DEPTH[name];
      s.style.transform = `translate3d(${(-scene.cur[0] * amp * k).toFixed(2)}px, ${(-scene.cur[1] * amp * k * 0.5).toFixed(2)}px, 0)`;
    }
    return Math.abs(scene.target[0] - scene.cur[0]) + Math.abs(scene.target[1] - scene.cur[1]) > 0.002;
  }

  /* ---------------------------------------------------------------- life: everyone about their place */
  // Owner, 2026-10-08: "the characters should have more free movement in general ... upgrade the animations and
  // movement, and create the full scene to be immersive and engaging". Each character potters about its own place on
  // its own clock (a stroll, a look about, a word with whoever is near), and every so often a group walks the stitched
  // paths to visit another place, talks there and walks home. A click stops one to answer. In a room its own keeper
  // keeps to its spot (the room's bubble points at it) and only goes visiting once the page has been left alone a while.
  // window.kindlemere.hold(true) brings everyone home and keeps them there while a room is busy. Nobody wanders at
  // night, Spud only comes up for dinner, and the dog has a day of its own (/kit/kindlemere-dog.js). Reduced motion:
  // all still.
  const WAYS = { // how each one goes about: its gait, its speed (world units a second) and how far it potters from home
    nutrition: { gait: 'walk', speed: 64, zone: [96, 20] },
    'nutrition-summer': { gait: 'hop', speed: 86, zone: [84, 18] },
    'nutrition-spud': { gait: 'walk', speed: 52, zone: [70, 12] },
    fitness: { gait: 'step', speed: 46, zone: [70, 46] },
    'fitness-puff': { gait: 'float', speed: 58, zone: [110, 50] },
    'fitness-huff': { gait: 'float', speed: 58, zone: [110, 50] },
    'dog-training': { gait: 'roll', speed: 74, zone: [120, 20] },
    'dog-training-barkley': { gait: 'walk', speed: 66, zone: [110, 20] },
    'dog-training-sizzle': { gait: 'wiggle', speed: 66, zone: [110, 20] },
  };
  const SPEED = 170;      // world units a second along the paths, on a visit
  const TALK_MS = 9000;   // how long a visit's talk lasts
  const REST_MS = 25000;  // a room's own keeper goes visiting only after the page has been left alone this long
  const rand = (a, b) => a + Math.random() * (b - a);
  // Nearer the front is bigger: the keepers' scale by where they stand (the dog uses the same, kindlemere-dog.js).
  const depthAt = (y) => clamp(1 - (1180 - y) * 0.00078, 0.3, 1.3);
  // Each visit: who goes, where each one stops (feet, world units), the path there, and where the dog sits.
  const VISITS = [
    { who: ['nutrition', 'nutrition-summer'], to: [[1404, 1018], [1474, 1032]], via: [[1010, 1188], [1200, 1214], [1296, 1104]] },
    { who: ['dog-training', 'dog-training-barkley', 'dog-training-sizzle'], to: [[1690, 1250], [1626, 1262], [1752, 1236]], via: [[2300, 1208], [1900, 1236]], dog: [1770, 1288] },
    { who: ['fitness', 'fitness-puff', 'fitness-huff'], to: [[1064, 1226], [990, 1242], [1136, 1242]], via: [[1296, 1104], [1180, 1218]] },
    { who: ['nutrition', 'nutrition-summer'], to: [[2230, 1222], [2166, 1232]], via: [[1010, 1188], [1600, 1248], [2080, 1216]] },
    { who: ['fitness', 'fitness-puff', 'fitness-huff'], to: [[2200, 1240], [2130, 1252], [2280, 1252]], via: [[1296, 1104], [1450, 1232], [1900, 1236]] },
    { who: ['dog-training', 'dog-training-barkley', 'dog-training-sizzle'], to: [[1130, 1226], [1064, 1234], [1262, 1238]], via: [[2080, 1216], [1600, 1250], [1350, 1232]], dog: [1200, 1262] },
  ];
  const NEAR = 300;
  let lastInput = performance.now();
  let herePlaceCache = { lat: 40, lon: 0 };
  const scenes = [];

  const LINES = {
    nutrition: 'Breakfast and lunch are mine. Shall we plan a week of meals?',
    'nutrition-summer': 'Treats are my thing. Fruit first, then the fun.',
    'nutrition-spud': 'Dinner is on. Pull up a chair.',
    fitness: 'One step at a time. Shall we warm up?',
    'fitness-puff': 'Home workouts and wet-weather runs. That is me.',
    'fitness-huff': 'Gym days and hot runs. Bring water.',
    'dog-training': 'Ready to train? Grab the treats.',
    'dog-training-barkley': 'Out in the woods with your dog? Ask me.',
    'dog-training-sizzle': 'Treats are my department. Small ones.',
    dog: 'Woof.',
  };

  /** A short line in a paper bubble over a point of the stack (the kit's own answer when no room answers). */
  function say(scene, el, text) {
    const old = scene.root.querySelector('.km-say');
    if (old) old.remove();
    const r = scene.root.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const p = document.createElement('div');
    p.className = 'km-say';
    p.setAttribute('role', 'status');
    p.textContent = text;
    const left = clamp(b.left + b.width / 2 - r.left, 90, r.width - 90);
    p.style.cssText = `position:absolute;z-index:4;left:${left}px;top:${Math.max(6, b.top - r.top - 8)}px;transform:translate(-50%,-100%);max-width:220px;` +
      'background:#FFFFFF;color:#1A2433;border-radius:14px;padding:8px 12px;font:600 14px/1.3 ui-rounded,Candara,"Gill Sans","Segoe UI",sans-serif;box-shadow:0 3px 0 rgba(26,36,51,0.18);pointer-events:none';
    scene.root.appendChild(p);
    setTimeout(() => p.remove(), 3600);
  }

  function wake(scene, key) {
    const a = scene.cast[key];
    if (!a) return;
    const name = a.el.getAttribute('data-km-name') || key;
    // a click stops one to answer: it turns to you, says its piece, and goes back to its day a little later
    if (a.mode === 'potter' && a.walk) { a.walk = null; a.moving = false; a.mode = 'idle'; stand(a); }
    a.pauseUntil = performance.now() + 4500;
    a.el.setAttribute('data-km-mood', 'oh');
    a.el.setAttribute('data-km-talk', '1');
    clearTimeout(a.wakeTimer);
    a.wakeTimer = setTimeout(() => { a.el.removeAttribute('data-km-mood'); }, 900);
    setTimeout(() => { a.el.removeAttribute('data-km-talk'); }, 2600);
    const ev = new CustomEvent('kindlemere:character', { cancelable: true, detail: { name, key, svg: scene.layers.actors, scene: scene.root } });
    const asleep = (scene.night && !a.el.hasAttribute('data-km-awake')) || (key === 'nutrition-spud' && !scene.dinner);
    if (window.dispatchEvent(ev)) say(scene, a.el, asleep ? `${name === 'dog' ? 'The dog' : name} is asleep${key === 'nutrition-spud' ? ' in the ground. He pops up at dinner time' : ''}.` : LINES[key] || name);
  }

  // The scene's own room (a room page), whose keeper keeps to its spot.
  const roomKey = () => (document.body && document.body.getAttribute('data-agent')) || '';

  function makeCast(scene) {
    const cast = {};
    const ground = window.kindlemereDog && window.kindlemereDog.ground ? window.kindlemereDog.ground(scene.layers.actors) : null;
    scene.ground = ground;
    scene.layers.actors && scene.layers.actors.querySelectorAll('[data-km-actor]').forEach((el) => {
      const [hx, hy] = el.getAttribute('data-km-home').split(/\s+/).map(Number);
      const key = el.getAttribute('data-km-actor');
      const name = el.getAttribute('data-km-name') || key;
      // The dog is its own button (fetch, /kit/kindlemere-dog.js), so its wrapper is not one. The wrapper still takes
      // clicks for what a room puts in it (Tumble's room seats the person's other dogs there).
      if (key === 'dog') return;
      cast[key] = {
        key, el, hx, hy, x: hx, y: hy, walk: null, moving: false, mode: 'home', phase: 0, dir: 1,
        way: WAYS[key] || WAYS.nutrition, nextAt: performance.now() + rand(1500, 9000), pauseUntil: 0,
        locked: key === roomKey(),
      };
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', name === 'dog' ? 'The dog' : name);
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => wake(scene, key));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wake(scene, key); } });
    });
    // The telescope on the lookout: at night it opens a lens on tonight's moon.
    const scope = scene.root.querySelector('[data-km-part="telescope"]');
    if (scope) {
      scope.setAttribute('role', 'button');
      scope.setAttribute('tabindex', '0');
      scope.setAttribute('aria-label', 'The telescope on the lookout');
      const use = () => { if (scene.night) lens(scene, scope); else say(scene, scope, 'Come back after dark to look at the moon.'); };
      scope.addEventListener('click', use);
      scope.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); use(); } });
    }
    scene.cast = cast;
    scene.state = 'free';
    scene.visit = Math.floor(Math.random() * VISITS.length);
    scene.nextVisit = performance.now() + rand(16000, 30000);
    scene.nextChat = performance.now() + rand(6000, 14000);
  }

  /** Draw a character where it is: a step, a hop, a float, a wobble or a wiggle when it moves; at home, as drawn. */
  function stand(a) {
    if (!a.moving && Math.abs(a.x - a.hx) < 0.5 && Math.abs(a.y - a.hy) < 0.5) { a.el.removeAttribute('transform'); return; }
    const k = depthAt(a.y) / depthAt(a.hy);
    let lift = 0;
    let tilt = 0;
    let sx = 1;
    let sy = 1;
    if (a.moving) {
      const p = a.phase;
      const g = a.walk && a.walk.visit ? (a.way.gait === 'float' ? 'float' : 'walk') : a.way.gait;
      if (g === 'walk') { lift = Math.abs(Math.sin(p / 18)) * 5; tilt = Math.sin(p / 36) * 3; }
      else if (g === 'hop') { const h = Math.abs(Math.sin(p / 24)); lift = h * 13; sy = 0.94 + h * 0.08; sx = 1.05 - h * 0.06; }
      else if (g === 'step') { lift = Math.abs(Math.sin(p / 22)) * 4; tilt = Math.sin(p / 44) * 1.6; }
      else if (g === 'float') { tilt = a.dir * 5; }
      else if (g === 'roll') { lift = Math.abs(Math.sin(p / 28)) * 4; tilt = Math.sin(p / 28) * 10; }
      else if (g === 'wiggle') { lift = Math.abs(Math.sin(p / 15)) * 3; tilt = Math.sin(p / 11) * 7; }
    }
    a.el.setAttribute('transform', `translate(${a.x.toFixed(1)} ${(a.y - lift * k).toFixed(1)}) rotate(${tilt.toFixed(2)}) scale(${(k * sx).toFixed(3)} ${(k * sy).toFixed(3)}) translate(${-a.hx} ${-a.hy})`);
  }

  function route(points, speed) {
    const segs = [];
    let len = 0;
    for (let i = 1; i < points.length; i += 1) {
      const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      segs.push([points[i - 1], points[i], l]);
      len += l;
    }
    return { segs, len, d: 0, speed };
  }

  function along(w) {
    let d = w.d;
    for (const [p, q, l] of w.segs) {
      if (d <= l) { const k = l ? d / l : 1; return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; }
      d -= l;
    }
    const last = w.segs[w.segs.length - 1];
    return last ? last[1] : [0, 0];
  }

  const free = (scene, a, t) => a.mode !== 'visit' && !a.locked && !scene.night && !(window.kindlemere && window.kindlemere.held)
    && !(a.key === 'nutrition-spud' && !scene.dinner) && !a.el.hasAttribute('data-km-awake') && t > a.pauseUntil;
  const onGround = (scene, x, y) => !scene.ground || scene.ground.where(x, y) === 'ground';

  /** A stroll about its own place: somewhere in its patch, or home again. */
  function potter(scene, a, t) {
    const away = Math.hypot(a.x - a.hx, a.y - a.hy) > 6;
    let to = null;
    if (away && Math.random() < 0.38) to = [a.hx, a.hy];
    for (let i = 0; !to && i < 12; i += 1) {
      const x = a.hx + rand(-1, 1) * a.way.zone[0];
      const y = a.hy + rand(-1, 1) * a.way.zone[1];
      if (Math.hypot(x - a.x, y - a.y) > 24 && onGround(scene, x, y)) to = [x, y];
    }
    a.nextAt = t + rand(3500, 11000);
    if (!to) return false;
    a.walk = route([[a.x, a.y], to], a.way.speed);
    a.mode = 'potter';
    a.moving = true;
    return true;
  }

  /** Two neighbours have a word: their bubbles take turns and their faces change, nobody walks. */
  function chat(scene, t) {
    scene.nextChat = t + rand(11000, 20000);
    if (scene.state !== 'free' || scene.night) return;
    const idle = Object.values(scene.cast).filter((a) => !a.walk && a.mode !== 'visit' && !(a.key === 'nutrition-spud' && !scene.dinner) && t > a.pauseUntil);
    for (let i = 0; i < 8; i += 1) {
      const a = idle[Math.floor(Math.random() * idle.length)];
      const b = idle.filter((x) => x !== a && Math.hypot(x.x - a.x, x.y - a.y) < 260)[0];
      if (!a || !b) continue;
      const pair = [a, b];
      const moods = ['happy', 'thinking', 'oh'];
      for (let turn = 0; turn < 4; turn += 1) {
        setTimeout(() => {
          pair.forEach((p, j) => {
            if (j === turn % 2) p.el.setAttribute('data-km-talk', '1'); else p.el.removeAttribute('data-km-talk');
            const m = moods[Math.floor(Math.random() * moods.length)];
            if (m === 'happy') p.el.removeAttribute('data-km-mood'); else p.el.setAttribute('data-km-mood', m);
          });
        }, turn * 1500);
      }
      setTimeout(() => pair.forEach((p) => { p.el.removeAttribute('data-km-talk'); p.el.removeAttribute('data-km-mood'); }), 6000);
      return;
    }
  }

  function quiet(scene) {
    Object.values(scene.cast).forEach((a) => { a.el.removeAttribute('data-km-talk'); a.el.removeAttribute('data-km-mood'); });
  }

  /** A group sets out along the paths to visit another place (the dog comes too when it is free). */
  function setOut(scene, t) {
    scene.nextVisit = t + rand(32000, 58000);
    const quietPage = t - lastInput > REST_MS;
    for (let tries = 0; tries < VISITS.length; tries += 1) {
      const v = VISITS[scene.visit % VISITS.length];
      scene.visit += 1;
      const going = v.who.map((key, i) => [scene.cast[key], v.to[i]])
        .filter(([a]) => a && a.el.getBoundingClientRect().width > 0 && (!a.locked || quietPage) && !(a.key === 'nutrition-spud' && !scene.dinner));
      if (!going.length) continue;
      going.forEach(([a, to]) => {
        a.walk = route([[a.x, a.y], ...v.via, to], SPEED);
        a.walk.visit = true;
        a.mode = 'visit';
        a.moving = true;
      });
      const dog = scene.dog || (window.kindlemereDog && window.kindlemereDog.of && window.kindlemereDog.of(scene.layers.actors));
      if (v.dog && dog && dog.visit) dog.visit([...v.via, v.dog]);
      scene.guests = going.map(([a]) => a);
      scene.via = v.via;
      scene.meet = v.to[0];
      scene.state = 'out';
      return true;
    }
    return false;
  }

  function goHome(scene, fast) {
    quiet(scene);
    const dog = scene.dog || (window.kindlemereDog && window.kindlemereDog.of && window.kindlemereDog.of(scene.layers.actors));
    if (dog && dog.home) dog.home();
    Object.values(scene.cast).forEach((a) => {
      if (a.el.hasAttribute('data-km-awake')) return;
      const guest = scene.guests && scene.guests.includes(a);
      if (!fast && !guest) return;
      if (Math.abs(a.x - a.hx) < 0.5 && Math.abs(a.y - a.hy) < 0.5) { a.walk = null; a.moving = false; a.mode = 'home'; stand(a); return; }
      const back = !fast && guest && scene.via ? [[a.x, a.y], ...scene.via.slice().reverse(), [a.hx, a.hy]] : [[a.x, a.y], [a.hx, a.hy]];
      a.walk = route(back, fast ? Math.max(SPEED * 4, Math.hypot(a.x - a.hx, a.y - a.hy) / 0.45) : SPEED);
      a.walk.visit = true;
      a.mode = 'back';
      a.moving = true;
    });
    scene.state = 'back';
    kick();
  }

  function talk(scene, t) {
    if (t < scene.nextLine) return;
    scene.nextLine = t + 2200;
    const hosts = Object.values(scene.cast).filter((a) => !scene.guests.includes(a) && !a.walk && Math.hypot(a.x - scene.meet[0], a.y - scene.meet[1]) < NEAR);
    const all = scene.guests.concat(hosts);
    const turn = (scene.turn = (scene.turn || 0) + 1);
    const speaker = turn % 2 && hosts.length ? hosts[turn % hosts.length] : scene.guests[turn % scene.guests.length];
    const moods = ['happy', 'thinking', 'oh'];
    all.forEach((a) => {
      if (a === speaker) a.el.setAttribute('data-km-talk', '1'); else a.el.removeAttribute('data-km-talk');
      const mood = moods[Math.floor(Math.random() * moods.length)];
      if (mood === 'happy') a.el.removeAttribute('data-km-mood'); else a.el.setAttribute('data-km-mood', mood);
    });
  }

  /** One frame of the cast: walkers advance (easing in and out); a visit's arrivals start the talk; the talk ends in
   * the walk home. */
  function cast(scene, t, dt) {
    let moving = false;
    for (const a of Object.values(scene.cast)) {
      if (!a.walk) continue;
      const w = a.walk;
      const k = depthAt(a.y) / depthAt(a.hy);
      const ease = clamp(Math.min(w.d, w.len - w.d) / 34, 0.35, 1);
      const step = w.speed * (w.visit ? 1 : k) * ease * dt;
      w.d = Math.min(w.len, w.d + step);
      const [x, y] = along(w);
      if (Math.abs(x - a.x) > 0.01) a.dir = x > a.x ? 1 : -1;
      a.x = x;
      a.y = y;
      a.phase += step;
      a.moving = w.d < w.len;
      stand(a);
      if (a.moving) { moving = true; continue; }
      a.walk = null;
      if (a.mode === 'back' && Math.abs(x - a.hx) < 0.5 && Math.abs(y - a.hy) < 0.5) { a.mode = 'home'; stand(a); }
      else if (a.mode === 'potter') {
        a.mode = Math.abs(x - a.hx) < 0.5 && Math.abs(y - a.hy) < 0.5 ? 'home' : 'idle';
        // a look about on arrival, now and then
        if (Math.random() < 0.35) { a.el.setAttribute('data-km-mood', 'thinking'); setTimeout(() => { if (!a.el.hasAttribute('data-km-talk')) a.el.removeAttribute('data-km-mood'); }, 1300); }
      }
    }
    if (scene.state === 'out' && !scene.guests.some((a) => a.moving)) {
      scene.state = 'talk';
      scene.talkUntil = t + TALK_MS;
      scene.nextLine = t;
    }
    if (scene.state === 'talk') {
      if (t > scene.talkUntil) goHome(scene, false);
      else talk(scene, t);
      return true;
    }
    if (scene.state === 'back' && !Object.values(scene.cast).some((a) => a.mode === 'back')) { scene.state = 'free'; scene.guests = null; }
    return moving;
  }

  let raf = 0;
  let last = 0;
  function frame(t) {
    raf = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    let again = false;
    for (const s of scenes) {
      if (s.seen === false || !s.cast) continue;
      if (parallax(s)) again = true;
      if (cast(s, t, dt)) again = true;
    }
    if (again) kick(); else last = 0;
  }
  function kick() { if (!raf && !still) raf = requestAnimationFrame(frame); }

  /** Whoever stands nearer the front is drawn over whoever is behind, the dog included. The one with the focus (the
   * last one clicked keeps it) is never moved itself, as moving it would drop the focus; the others go round it. */
  function layerByDepth(scene) {
    const host = scene.layers.actors && scene.layers.actors.querySelector('[data-km-layer="actors"]');
    if (!host) return;
    const dog = scene.dog || (window.kindlemereDog && window.kindlemereDog.of && window.kindlemereDog.of(scene.layers.actors));
    const items = [...host.children].filter((n) => n.hasAttribute('data-km-actor')).map((el) => {
      const key = el.getAttribute('data-km-actor');
      const a = scene.cast[key];
      const y = a ? a.y : key === 'dog' && dog && dog.where ? dog.where().y : Number((el.getAttribute('data-km-home') || '0 0').split(/\s+/)[1]);
      return { el, y };
    });
    // In order give or take a hair: two standing level never swap back and forth.
    let fine = true;
    for (let i = 1; i < items.length && fine; i += 1) if (items[i - 1].y > items[i].y + 3) fine = false;
    if (fine) return;
    const sorted = items.slice().sort((p, q) => p.y - q.y);
    // The fewest moves (a moved character's own animations start over): keep the longest run already in depth order,
    // through the focused one when there is one, and put only the others in their places.
    const rank = new Map(sorted.map((it, i) => [it.el, i]));
    const seq = items.map((it) => rank.get(it.el));
    const n = seq.length;
    const upTo = seq.map(() => 1);      // the longest run in order ending here
    const before = seq.map(() => -1);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < i; j += 1) if (seq[j] < seq[i] && upTo[j] + 1 > upTo[i]) { upTo[i] = upTo[j] + 1; before[i] = j; }
    }
    const from = seq.map(() => 1);      // and starting here
    const after = seq.map(() => -1);
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = i + 1; j < n; j += 1) if (seq[j] > seq[i] && from[j] + 1 > from[i]) { from[i] = from[j] + 1; after[i] = j; }
    }
    let best = items.findIndex((it) => it.el.contains(document.activeElement));
    if (best < 0) { best = 0; for (let i = 1; i < n; i += 1) if (upTo[i] + from[i] > upTo[best] + from[best]) best = i; }
    const keep = new Set();
    for (let i = best; i >= 0; i = before[i]) keep.add(items[i].el);
    for (let i = after[best]; i >= 0; i = after[i]) keep.add(items[i].el);
    let next = items[items.length - 1].el.nextSibling;   // whatever follows the characters stays after them
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      const el = sorted[i].el;
      if (!keep.has(el)) host.insertBefore(el, next);
      next = el;
    }
  }

  /** Only what is in the picture is a stop for the keyboard or read out: in a place's view most of the world is off
   * camera. A scene shown as a plain picture (role img, the Kindlemere page's cards) has nothing to reach. */
  function reach(el, on) {
    if (on !== el.hasAttribute('data-km-off')) return;
    if (on) { el.removeAttribute('data-km-off'); el.removeAttribute('aria-hidden'); el.setAttribute('tabindex', '0'); return; }
    if (el.contains(document.activeElement)) return;   // never pull the focus out from under someone
    el.setAttribute('data-km-off', '');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('tabindex', '-1');
  }
  function reachable(scene) {
    if (scene.root.getAttribute('role') === 'img') return;
    const [vx, vy, vw, vh] = scene.vb;
    const seen = (x, y) => x > vx - 30 && x < vx + vw + 30 && y > vy + 20 && y < vy + vh + 80;
    for (const a of Object.values(scene.cast)) reach(a.el, seen(a.x, a.y));
    const dog = scene.dog || (window.kindlemereDog && window.kindlemereDog.of && window.kindlemereDog.of(scene.layers.actors));
    const dogEl = scene.layers.actors && scene.layers.actors.querySelector('[data-km-part="dog"][role="button"]');
    if (dog && dog.where && dogEl) { const w = dog.where(); reach(dogEl, seen(w.x, w.y)); }
    // the signpost's arms and the telescope stand still: looked at again only when the camera moves
    const at = scene.vb.map(Math.round).join();
    if (scene.reachAt === at) return;
    scene.reachAt = at;
    const r = scene.root.getBoundingClientRect();
    scene.root.querySelectorAll('[data-km-part^="sign-"], [data-km-part="telescope"]').forEach((el) => {
      const b = el.getBoundingClientRect();
      reach(el, b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom);
    });
  }

  /** The cast's clock, a few times a second: strolls, chats and visits start here. */
  function tick() {
    if (still || document.hidden) return;
    const t = performance.now();
    const held = window.kindlemere && window.kindlemere.held;
    let started = false;
    for (const s of scenes) {
      if (!s.cast || s.seen === false) continue;
      reachable(s);
      if (held || s.night) {
        if (Object.values(s.cast).some((a) => !['home', 'back', 'watch'].includes(a.mode) && !a.el.hasAttribute('data-km-awake'))) { goHome(s, true); started = true; }
        continue;
      }
      for (const a of Object.values(s.cast)) if (!a.walk && free(s, a, t) && t > a.nextAt && potter(s, a, t)) started = true;
      if (s.state === 'free' && t > s.nextVisit && setOut(s, t)) started = true;
      if (t > s.nextChat) chat(s, t);
    }
    if (started) kick();
  }

  function stir() { lastInput = performance.now(); }

  /* ---------------------------------------------------------------- one world, four cameras: walking between places */
  // Owner, 2026-10-08: "Need to be able to navigate between the 3 scenes or return to the main full view screen while
  // inside a scene ... flow inside each scene". The places are one world seen through four cameras (VIEWS in
  // kit/art/make-kindlemere.js), so going from one place to another is a camera move: the view glides toward the next
  // place and dips to the page's colour, and the next page starts where it left off and glides the rest of the way in.
  // The ways: the signpost's arms in the scene, a keeper on the Kindlemere page, and the bar on every page (/kit/kit.js).
  // Reduced motion: a plain page change.
  const CAMERAS = { realm: [48, 27, 3104, 1746], orchard: [260, 700, 1024, 576], hill: [820, 610, 1088, 612], field: [1976, 760, 1200, 675] };
  const VIEW_OF = { realm: 'realm', nutrition: 'orchard', fitness: 'hill', 'dog-training': 'field' };
  const PLACE_NAMES = { nutrition: 'the Orchard', fitness: 'Stepping Hill', 'dog-training': 'Lakeside Field' };
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerpBox = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

  function veil(scene) {
    let v = scene.root.querySelector('.km-veil');
    if (!v) {
      v = document.createElement('div');
      v.className = 'km-veil';
      v.style.cssText = `position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;background:${getComputedStyle(document.body).backgroundColor}`;
      scene.root.appendChild(v);
    }
    return v;
  }
  /** Glide a scene's camera from one box to another, its veil going from v0 to v1 on the way. */
  function glide(scene, from, to, ms, v0, v1) {
    return new Promise((resolve) => {
      const veilEl = veil(scene);
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        scene.box = lerpBox(from, to, easeInOut(k));
        crop(scene);
        veilEl.style.opacity = String(v0 + (v1 - v0) * k);
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  let leaving = false;
  /** Go to another place (a room's address, or the Kindlemere page), gliding toward it on the way out. */
  async function go(url, place) {
    if (!url || leaving) return;
    leaving = true;
    setTimeout(() => { leaving = false; }, 2500);
    // the scene in view glides (the realm, or a place's picture further down the Kindlemere page)
    const hero = scenes.find((s) => s.seen) || scenes[0];
    const to = CAMERAS[VIEW_OF[place] || place];
    if (!hero || !to || still) { location.assign(url); return; }
    const mid = lerpBox(hero.box.slice(), to, 0.55);
    await glide(hero, hero.box.slice(), mid, 620, 0, 1);
    location.assign(`${url.split('#')[0]}#km-from=${mid.map((v) => Math.round(v)).join(',')}`);
  }
  /** Arriving from another place: start where that page's camera left off and glide the rest of the way in. */
  async function arrive(scene) {
    const m = /km-from=(-?\d+),(-?\d+),(\d+),(\d+)/.exec(location.hash);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    const from = m.slice(1, 5).map(Number);
    if (still || from[2] < 100 || from[3] < 60) return;
    const to = scene.box.slice();
    veil(scene).style.opacity = '1';
    document.documentElement.classList.remove('km-arriving');
    await glide(scene, from, to, 760, 1, 0);
    draw(scene, herePlaceCache, now());
  }

  /** The signpost's arms are ways to their places (Louise's points across the lake). */
  function signposts(scene) {
    scene.root.querySelectorAll('[data-km-part^="sign-"]').forEach((el) => {
      const key = el.getAttribute('data-km-part').slice(5);
      el.setAttribute('tabindex', '0');
      el.style.cursor = 'pointer';
      const on = (fn) => {
        el.addEventListener('click', fn);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
      };
      if (!PLACE_NAMES[key]) {
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', 'Louise, the librarian, across the lake');
        on(() => say(scene, el, 'Louise is across the lake. Questions go to her as lanterns from the dock.'));
        return;
      }
      el.setAttribute('role', 'link');
      el.setAttribute('aria-label', `To ${PLACE_NAMES[key]}`);
      on(async () => {
        if (key === roomKey()) { say(scene, el, `You're in ${PLACE_NAMES[key]}.`); return; }
        const url = window.kit && window.kit.address ? await window.kit.address(key) : null;
        if (url) go(url, key); else say(scene, el, `${PLACE_NAMES[key].replace(/^the /, 'The ')} isn't open from here.`);
      });
    });
  }

  /* ---------------------------------------------------------------- the telescope, the watcher, the dog houses */
  // Owner, 2026-10-08: "if clicking the telescope at night, it will open a circle port like view ... the moon in its
  // current state of the cycle ... on full moons it would show the full bright moon with craters, and on new moon, it
  // would just show a random conselation of stars". The phase is computed here from the date; nothing is looked up.
  function phaseName(p) {
    if (p < 0.03 || p > 0.97) return 'New moon';
    if (p < 0.22) return 'Waxing crescent';
    if (p < 0.28) return 'First quarter';
    if (p < 0.47) return 'Waxing gibbous';
    if (p < 0.53) return 'Full moon';
    if (p < 0.72) return 'Waning gibbous';
    if (p < 0.78) return 'Last quarter';
    return 'Waning crescent';
  }

  function lens(scene, back) {
    const t = now();
    const m = moonPhase(days(t));
    const size = Math.min(scene.root.clientWidth, scene.root.clientHeight) * 0.78;
    const wrap = document.createElement('div');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', "The telescope: tonight's moon");
    wrap.tabIndex = -1;
    wrap.style.cssText = 'position:absolute;inset:0;z-index:6;background:#020407;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer';
    let stars = '';
    for (let i = 0; i < 70; i += 1) { const a = Math.random() * Math.PI * 2; const d = Math.sqrt(Math.random()) * 92; stars += `<circle cx="${(Math.cos(a) * d).toFixed(1)}" cy="${(Math.sin(a) * d).toFixed(1)}" r="${(0.3 + Math.random() * 0.9).toFixed(2)}" fill="#FFFFFF" opacity="${(0.4 + Math.random() * 0.6).toFixed(2)}"/>`; }
    let body = '';
    if (m.lit < 0.03) {
      // New moon: no moon to see, so a constellation instead, drawn fresh each look.
      const pts = Array.from({ length: 7 }, (_, i) => [(-60 + i * 20 + (Math.random() * 16 - 8)).toFixed(1), (Math.random() * 90 - 45).toFixed(1)]);
      body = `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#CFE6EA" stroke-width="0.6" opacity="0.55"/>` + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#FFFFFF"/><circle cx="${x}" cy="${y}" r="5" fill="#FFFFFF" opacity="0.15"/>`).join('');
    } else {
      const ex = (Math.abs(1 - 2 * m.lit) * 62).toFixed(2);
      const flip = m.waxing === (herePlaceCache.lat >= 0) ? '' : ' transform="scale(-1 1)"';
      const lit = `M0 -62 A62 62 0 0 1 0 62 A${ex} 62 0 0 ${m.lit < 0.5 ? 0 : 1} 0 -62 Z`;
      const id = `km-lens-${Date.now()}`;
      body = `<defs><clipPath id="${id}"><path d="${lit}"${flip}/></clipPath></defs><circle r="62" fill="#1B2A3C"/><path d="${lit}"${flip} fill="#F2EEDC"/>` +
        `<g clip-path="url(#${id})"><ellipse cx="-18" cy="-14" rx="20" ry="15" fill="#D8D2BC"/><ellipse cx="16" cy="10" rx="16" ry="12" fill="#D8D2BC"/><ellipse cx="-6" cy="28" rx="12" ry="8" fill="#DDD7C2"/>` +
        `<circle cx="22" cy="-26" r="7" fill="#CFC8B0"/><circle cx="22" cy="-26" r="4.4" fill="#E6E1CF"/><circle cx="-30" cy="18" r="5" fill="#CFC8B0"/><circle cx="-30" cy="18" r="3" fill="#E6E1CF"/>` +
        `<circle cx="4" cy="-40" r="4" fill="#CFC8B0"/><circle cx="36" cy="22" r="4.6" fill="#CFC8B0"/><circle cx="-40" cy="-30" r="3.4" fill="#CFC8B0"/><circle cx="10" cy="44" r="3.6" fill="#CFC8B0"/></g>`;
    }
    wrap.innerHTML = `<svg viewBox="-100 -100 200 200" width="${size.toFixed(0)}" height="${size.toFixed(0)}" aria-hidden="true" style="max-width:none"><circle r="96" fill="#060C16"/>${stars}${body}<circle r="96" fill="none" stroke="#1A2433" stroke-width="8"/></svg>` +
      `<p style="margin:0;color:#CFE6EA;font:600 14px/1.3 ui-rounded,Candara,'Gill Sans','Segoe UI',sans-serif;text-align:center">${m.lit < 0.03 ? (m.lit < 0.005 ? 'New moon tonight, so you see the stars. ' : `Almost new tonight, a thin ${m.waxing ? 'waxing' : 'waning'} crescent (${Math.round(m.lit * 100)}% lit), so you see the stars. `) :`${m.lit > 0.97 ? 'Full moon' : phaseName(m.phase)}, ${Math.round(m.lit * 100)}% lit. `}${t.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.</p>` +
      `<p style="margin:0;color:#8797A5;font:400 12px/1.3 system-ui,sans-serif">Tap or press Escape to step back.</p>`;
    const close = () => { wrap.remove(); document.removeEventListener('keydown', esc); if (back && back.focus) back.focus(); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    wrap.addEventListener('click', close);
    document.addEventListener('keydown', esc);
    scene.root.appendChild(wrap);
    wrap.focus();
  }

  // Owner: "at night, any random character might be spot at the telescope". One character, the same one all night,
  // stands awake on the lookout platform by the telescope (world units of its feet), small with the distance.
  const LOOKOUT = [1622, 322];
  function watch(scene, t) {
    if (!scene.cast) return;
    const keys = Object.keys(scene.cast).filter((k) => k !== 'dog' && k !== 'nutrition-spud'); // Spud sleeps in the ground
    const pickKey = keys[Math.floor(days(t)) % keys.length];
    for (const k of keys) {
      const a = scene.cast[k];
      const on = scene.night && k === pickKey;
      if (on && !a.el.hasAttribute('data-km-awake')) {
        a.el.setAttribute('data-km-awake', '1');
        a.el.setAttribute('data-km-mood', 'oh');
        a.walk = null;
        a.moving = false;
        a.mode = 'watch';
        a.x = LOOKOUT[0];
        a.y = LOOKOUT[1];
        a.el.setAttribute('transform', `translate(${LOOKOUT[0]} ${LOOKOUT[1]}) scale(0.34) translate(${-a.hx} ${-a.hy})`);
      } else if (!on && a.el.hasAttribute('data-km-awake')) {
        a.el.removeAttribute('data-km-awake');
        a.el.removeAttribute('data-km-mood');
        a.x = a.hx;
        a.y = a.hy;
        a.mode = 'home';
        stand(a);
      }
    }
  }

  // Owner: "if multiple dogs are created, then multiple houses should appear". Tumble's page fires 'kindlemere:dogs'
  // { svg, names }; house n shows when there are n dogs (one house always), with the dog's name on its board.
  function houses(scene, names) {
    const count = Math.max(1, Math.min(6, names.length));
    for (let n = 1; n <= 6; n += 1) {
      const h = scene.root.querySelector(`[data-km-part="dog-house-${n}"]`);
      if (h) h.setAttribute('display', n <= count ? 'inline' : 'none');
      const plate = scene.root.querySelector(`[data-km-part="dog-house-name-${n}"]`);
      if (plate) {
        const name = String(names[n - 1] || '').slice(0, 24);
        plate.textContent = name;
        if (name.length > 9) { plate.setAttribute('textLength', '34'); plate.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } else plate.removeAttribute('textLength');
      }
    }
  }

  /* ---------------------------------------------------------------- start */
  async function start() {
    const imgs = Array.from(document.querySelectorAll('img[src^="/kit/art/kindlemere"]')).filter((i) => /\/kindlemere(-[a-z]+)?\.svg$/.test(i.getAttribute('src')));
    if (!imgs.length) { document.documentElement.classList.remove('km-arriving'); return; }
    // The page's own scripts first (they listen for kindlemere:ready, and a room may bring its own dog).
    if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
    const place = await herePlace();
    herePlaceCache = place;
    for (const img of imgs) {
      let scene = null;
      try { scene = await inline(img); } catch (_) { scene = null; }
      if (!scene) continue; // the picture stays as it was
      crop(scene);
      draw(scene, place, now());
      makeCast(scene);
      signposts(scene);
      // A layer with something to press in it (the signpost's arms, the telescope) is not hidden from assistive tech;
      // its other words (plates, labels) still are.
      for (const s of Object.values(scene.layers)) {
        if (s.getAttribute('aria-hidden') !== 'true' || !s.querySelector('[role]')) continue;
        s.removeAttribute('aria-hidden');
        s.querySelectorAll('text').forEach((t) => { if (!t.closest('[role]')) t.setAttribute('aria-hidden', 'true'); });
      }
      watch(scene, now());
      scenes.push(scene);
      if (scenes.length === 1) arrive(scene);
      // The dog: a day of its own, and fetch (/kit/kindlemere-dog.js). A room that brings its own dog attaches it itself.
      const dogEl = scene.layers.actors && scene.layers.actors.querySelector('[data-km-part="dog"]');
      if (dogEl && window.kindlemereDog && !window.kindlemereDogManual) {
        scene.dog = window.kindlemereDog.attach(scene.layers.actors, dogEl, { say: (text) => say(scene, dogEl, text) });
      }
      reachable(scene);
      // Only what is on screen moves.
      if (window.IntersectionObserver) new IntersectionObserver((es) => { scene.seen = es.some((x) => x.isIntersecting); if (scene.seen) kick(); }).observe(scene.root);
      if (!still) {
        scene.root.addEventListener('pointermove', (e) => {
          const r = scene.root.getBoundingClientRect();
          scene.target = [clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1), clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)];
          kick();
        });
        scene.root.addEventListener('pointerleave', () => { scene.target = [0, 0]; kick(); });
      }
      const part = (name) => scene.root.querySelector(`[data-km-part="${name}"]`);
      window.dispatchEvent(new CustomEvent('kindlemere:ready', { detail: { svg: scene.layers.actors || scene.root, scene: scene.root, part } }));
    }
    document.documentElement.classList.remove('km-arriving');
    const hourly = () => scenes.forEach((s) => { draw(s, place, now()); watch(s, now()); });
    window.addEventListener('kindlemere:dogs', (e) => {
      const d = e.detail || {};
      const names = Array.isArray(d.names) ? d.names.filter((n) => typeof n === 'string') : [];
      scenes.filter((s) => !d.svg || s.root === d.svg || s.root.contains(d.svg)).forEach((s) => houses(s, names));
    });
    setInterval(hourly, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) hourly(); });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => scenes.forEach((s) => { crop(s); draw(s, place, now()); reachable(s); }));
      scenes.forEach((s) => ro.observe(s.root));
    }
    if (still) return;
    for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(type, stir, { capture: true, passive: true });
    window.addEventListener('kindlemere:hold', tick);
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma === null || e.beta === null) return;
      scenes.forEach((s) => { s.target = [clamp(e.gamma / 30, -1, 1), clamp((e.beta - 40) / 30, -1, 1)]; });
      kick();
    });
    setInterval(tick, 400);
    // Whoever is nearer the front is drawn in front, looked at every frame so two crossing never show the wrong way
    // round (owner, 2026-10-08: "there are still some layering issues when characters cross over each other").
    const depths = () => {
      if (!document.hidden) scenes.forEach((s) => { if (s.cast && s.seen !== false) layerByDepth(s); });
      requestAnimationFrame(depths);
    };
    requestAnimationFrame(depths);
  }

  if (window.kindlemere) Object.assign(window.kindlemere, { go, say: (el, text) => { const s = scenes.find((x) => x.root.contains(el)); if (s) say(s, el, text); } });
  start();
}());
