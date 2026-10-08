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
 * The layers shift a little with the pointer or the phone's tilt, far ones least. After 20 s at rest the keepers and
 * their sidekicks visit each other along the paths and talk; any touch, key or wheel sends them home, and
 * window.kindlemere.hold(true) (from /kit/kit.js) keeps them home while a room is busy. Reduced motion: all still.
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
    if (alt) { root.setAttribute('role', 'img'); root.setAttribute('aria-label', alt); } else root.setAttribute('aria-hidden', 'true');
    root.style.overflow = 'hidden';
    // No ratio from the page (an img's own is "auto <w> / <h>"): the stack takes the picture's.
    if (!cs.aspectRatio || /^auto/.test(cs.aspectRatio)) root.style.aspectRatio = `${box[2]} / ${box[3]}`;

    const layers = {};
    groups.forEach((gEl, i) => {
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('aria-hidden', 'true');
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
      root, layers, box, pos, vb: box.slice(), sky: (svg.getAttribute('data-km-sky') || '60 900').split(/\s+/).map(Number),
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
    const v = `${(x - bw * OVER).toFixed(1)} ${(y - bh * OVER).toFixed(1)} ${(bw * (1 + 2 * OVER)).toFixed(1)} ${(bh * (1 + 2 * OVER)).toFixed(1)}`;
    Object.values(scene.layers).forEach((s) => s.setAttribute('viewBox', v));
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
    const amp = scene.root.clientWidth * 0.012;
    for (const [name, s] of Object.entries(scene.layers)) {
      const k = DEPTH[name] === undefined ? 1 : DEPTH[name];
      s.style.transform = `translate3d(${(-scene.cur[0] * amp * k).toFixed(2)}px, ${(-scene.cur[1] * amp * k * 0.5).toFixed(2)}px, 0)`;
    }
    return Math.abs(scene.target[0] - scene.cur[0]) + Math.abs(scene.target[1] - scene.cur[1]) > 0.002;
  }

  /* ---------------------------------------------------------------- the keepers mingle at rest */
  // Owner, 2026-10-08: "All the agents and characters should mix and mingle when the scene is at rest". After REST_MS
  // with no touch, key or wheel, one group walks the stitched paths to visit another, they talk (a bubble, faces that
  // change), and they walk home. Any input sends everyone home; window.kindlemere.hold(true) keeps everyone home.
  const REST_MS = 20000;
  const SPEED = 170; // world units a second
  const TALK_MS = 9000;
  // Each visit: who goes, where each one stops (feet, world units), and the path there.
  const VISITS = [
    { who: ['nutrition', 'nutrition-summer'], to: [[1404, 1018], [1474, 1032]], via: [[1010, 1188], [1200, 1214], [1296, 1104]] },
    { who: ['dog-training', 'dog', 'dog-training-barkley', 'dog-training-sizzle'], to: [[1690, 1250], [1770, 1288], [1626, 1262], [1752, 1236]], via: [[2300, 1208], [1900, 1236]] },
    { who: ['fitness', 'fitness-puff', 'fitness-huff'], to: [[1064, 1226], [990, 1242], [1136, 1242]], via: [[1296, 1104], [1180, 1218]] },
    { who: ['nutrition', 'nutrition-summer'], to: [[2230, 1222], [2166, 1232]], via: [[1010, 1188], [1600, 1248], [2080, 1216]] },
    { who: ['fitness', 'fitness-puff', 'fitness-huff'], to: [[2200, 1240], [2130, 1252], [2280, 1252]], via: [[1296, 1104], [1450, 1232], [1900, 1236]] },
    { who: ['dog-training', 'dog', 'dog-training-barkley', 'dog-training-sizzle'], to: [[1130, 1226], [1200, 1262], [1064, 1234], [1262, 1238]], via: [[2080, 1216], [1600, 1250], [1350, 1232]] },
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
    a.el.setAttribute('data-km-mood', 'oh');
    a.el.setAttribute('data-km-talk', '1');
    clearTimeout(a.wakeTimer);
    a.wakeTimer = setTimeout(() => { a.el.removeAttribute('data-km-mood'); }, 900);
    setTimeout(() => { a.el.removeAttribute('data-km-talk'); }, 2600);
    const ev = new CustomEvent('kindlemere:character', { cancelable: true, detail: { name, key, svg: scene.layers.actors, scene: scene.root } });
    const asleep = (scene.night && !a.el.hasAttribute('data-km-awake')) || (key === 'nutrition-spud' && !scene.dinner);
    if (window.dispatchEvent(ev)) say(scene, a.el, asleep ? `${name === 'dog' ? 'The dog' : name} is asleep${key === 'nutrition-spud' ? ' in the ground. He pops up at dinner time' : ''}.` : LINES[key] || name);
  }

  function makeCast(scene) {
    const cast = {};
    scene.layers.actors && scene.layers.actors.querySelectorAll('[data-km-actor]').forEach((el) => {
      const [hx, hy] = el.getAttribute('data-km-home').split(/\s+/).map(Number);
      const key = el.getAttribute('data-km-actor');
      cast[key] = { el, hx, hy, x: hx, y: hy, walk: null };
      const name = el.getAttribute('data-km-name') || key;
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
    scene.state = 'home';
    scene.visit = 0;
  }

  function stand(a, x, y, t, walking) {
    a.x = x;
    a.y = y;
    if (!walking && Math.abs(x - a.hx) < 0.5 && Math.abs(y - a.hy) < 0.5) { a.el.removeAttribute('transform'); return; }
    const k = clamp(1 + (y - a.hy) * 0.0016, 0.7, 1.2); // nearer the front is bigger
    const hop = walking ? -Math.abs(Math.sin(t / 95)) * 5 : 0;
    const tilt = walking ? Math.sin(t / 190) * 2.5 : 0;
    a.el.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + hop).toFixed(1)}) rotate(${tilt.toFixed(2)}) scale(${k.toFixed(3)}) translate(${-a.hx} ${-a.hy})`);
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

  function dogPart(scene) { return scene.root.querySelector('[data-km-part="dog"]'); }

  function quiet(scene) {
    Object.values(scene.cast).forEach((a) => { a.el.removeAttribute('data-km-talk'); a.el.removeAttribute('data-km-mood'); });
  }

  function setOut(scene) {
    const v = VISITS[scene.visit % VISITS.length];
    scene.visit += 1;
    const going = v.who.map((key, i) => [scene.cast[key], v.to[i]]).filter(([a]) => a && a.el.getBoundingClientRect().width > 0);
    if (!going.length) return;
    going.forEach(([a, to]) => { a.walk = route([[a.x, a.y], ...v.via, to], SPEED); });
    const dog = dogPart(scene);
    if (going.some(([a]) => a === scene.cast.dog) && dog) scene.cast.dog.el.classList.add('km-ashore');
    if (dog) dog.classList.remove('dt-sit');
    scene.guests = going.map(([a]) => a);
    scene.via = v.via;
    scene.meet = v.to[0];
    scene.state = 'out';
  }

  function goHome(scene, fast) {
    quiet(scene);
    const dog = dogPart(scene);
    if (dog) dog.classList.remove('dt-sit');
    Object.entries(scene.cast).forEach(([key, a]) => {
      if (a.el.hasAttribute('data-km-awake')) return;
      if (Math.abs(a.x - a.hx) < 0.5 && Math.abs(a.y - a.hy) < 0.5) { a.walk = null; return; }
      if (fast && key === 'dog') { a.walk = null; stand(a, a.hx, a.hy, 0, false); a.el.classList.remove('km-ashore'); return; }
      const back = !fast && scene.via ? [[a.x, a.y], ...scene.via.slice().reverse(), [a.hx, a.hy]] : [[a.x, a.y], [a.hx, a.hy]];
      a.walk = route(back, fast ? Math.max(SPEED * 4, Math.hypot(a.x - a.hx, a.y - a.hy) / 0.45) : SPEED);
    });
    scene.state = 'back';
    kick();
  }

  function talk(scene, t) {
    if (t < scene.nextLine) return;
    scene.nextLine = t + 2200;
    const hosts = Object.values(scene.cast).filter((a) => !scene.guests.includes(a) && Math.hypot(a.hx - scene.meet[0], a.hy - scene.meet[1]) < NEAR);
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

  /** One frame of the cast: walkers advance; arrivals start the talk; the talk ends in the walk home. */
  function cast(scene, t, dt) {
    let moving = false;
    for (const a of Object.values(scene.cast)) {
      if (!a.walk) continue;
      a.walk.d = Math.min(a.walk.len, a.walk.d + a.walk.speed * dt);
      const [x, y] = along(a.walk);
      const done = a.walk.d >= a.walk.len;
      stand(a, x, y, t, !done);
      if (done) {
        a.walk = null;
        if (scene.state === 'back' && Math.abs(x - a.hx) < 0.5 && Math.abs(y - a.hy) < 0.5) { stand(a, a.hx, a.hy, t, false); a.el.classList.remove('km-ashore'); }
      } else moving = true;
    }
    if (scene.state === 'out' && !moving) {
      scene.state = 'talk';
      scene.talkUntil = t + TALK_MS;
      scene.nextLine = t;
      const dog = dogPart(scene);
      if (dog && scene.guests.includes(scene.cast.dog)) dog.classList.add('dt-sit');
    }
    if (scene.state === 'talk') {
      if (t > scene.talkUntil) goHome(scene, false);
      else talk(scene, t);
      return true;
    }
    if (scene.state === 'back' && !moving) { scene.state = 'home'; scene.guests = null; lastInput = t - REST_MS + 12000; }
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
      if (parallax(s)) again = true;
      if (s.cast && cast(s, t, dt)) again = true;
    }
    if (again) kick(); else last = 0;
  }
  function kick() { if (!raf && !still) raf = requestAnimationFrame(frame); }

  function resting() {
    if (still || document.hidden || (window.kindlemere && window.kindlemere.held)) return;
    const t = performance.now();
    if (t - lastInput < REST_MS) return;
    for (const s of scenes) if (s.cast && s.state === 'home' && !s.night) { setOut(s); kick(); }
    lastInput = t; // the next visit waits its turn
  }

  function stir() {
    lastInput = performance.now();
    for (const s of scenes) if (s.cast && s.state !== 'home') goHome(s, true);
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
      `<p style="margin:0;color:#CFE6EA;font:600 14px/1.3 ui-rounded,Candara,'Gill Sans','Segoe UI',sans-serif;text-align:center">${m.lit < 0.03 ? `New moon tonight (${Math.round(m.lit * 100)}% lit), so you see the stars. ` : `${m.lit > 0.97 ? 'Full moon' : phaseName(m.phase)}, ${Math.round(m.lit * 100)}% lit. `}${t.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.</p>` +
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
        a.x = LOOKOUT[0];
        a.y = LOOKOUT[1];
        a.el.setAttribute('transform', `translate(${LOOKOUT[0]} ${LOOKOUT[1]}) scale(0.34) translate(${-a.hx} ${-a.hy})`);
      } else if (!on && a.el.hasAttribute('data-km-awake')) {
        a.el.removeAttribute('data-km-awake');
        a.el.removeAttribute('data-km-mood');
        stand(a, a.hx, a.hy, 0, false);
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
    if (!imgs.length) return;
    const place = await herePlace();
    herePlaceCache = place;
    for (const img of imgs) {
      let scene = null;
      try { scene = await inline(img); } catch (_) { scene = null; }
      if (!scene) continue; // the picture stays as it was
      crop(scene);
      draw(scene, place, now());
      makeCast(scene);
      watch(scene, now());
      scenes.push(scene);
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
    const tick = () => scenes.forEach((s) => { draw(s, place, now()); watch(s, now()); });
    window.addEventListener('kindlemere:dogs', (e) => {
      const d = e.detail || {};
      const names = Array.isArray(d.names) ? d.names.filter((n) => typeof n === 'string') : [];
      scenes.filter((s) => !d.svg || s.root === d.svg || s.root.contains(d.svg)).forEach((s) => houses(s, names));
    });
    setInterval(tick, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => scenes.forEach((s) => { crop(s); draw(s, place, now()); }));
      scenes.forEach((s) => ro.observe(s.root));
    }
    if (still) return;
    for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(type, stir, { capture: true, passive: true });
    window.addEventListener('kindlemere:hold', () => { if (window.kindlemere && window.kindlemere.held) stir(); });
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma === null || e.beta === null) return;
      scenes.forEach((s) => { s.target = [clamp(e.gamma / 30, -1, 1), clamp((e.beta - 40) / 30, -1, 1)]; });
      kick();
    });
    setInterval(resting, 1000);
  }

  start();
}());
