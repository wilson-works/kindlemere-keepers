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
  // The sky is at infinity: its stars and moon never slide with the pointer or the tilt (owner, 2026-10-09: "those
  // stars need to not be moving that way in the night sky"). The camera's own glide and zoom still carry it.
  const DEPTH = { sky: 0, far: 0.35, hill: 0.6, land: 0.85, life: 0.85, actors: 1, grain: 0 };
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
      // its transform's origin is the stack's top left corner (look())
      const o = `${((OVER / (1 + 2 * OVER)) * 100).toFixed(4)}%`;
      s.style.cssText = `position:absolute;left:${-OVER * 100}%;top:${-OVER * 100}%;width:${100 + OVER * 200}%;height:${100 + OVER * 200}%;max-width:none;max-height:none;pointer-events:none;overflow:hidden;transform-origin:${o} ${o};${still ? '' : 'will-change:transform;'}`;
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

  /** Fill the stack's box with the view, as object-fit: cover at the picture's object-position. The view is drawn; or,
   * given a wider box (look()), that is drawn, and moved and scaled to show the view. */
  function crop(scene, wide) {
    const w = scene.root.clientWidth;
    const h = scene.root.clientHeight;
    if (!w || !h) return;
    scene.cw = w;   // the size on the page, kept here so the frame loop never has to measure it (a forced layout)
    scene.ch = h;
    scene.vb = onScreen(scene, scene.box);
    scene.drawn = wide || scene.vb;
    const [x, y, bw, bh] = scene.drawn;
    const v = `${(x - bw * OVER).toFixed(1)} ${(y - bh * OVER).toFixed(1)} ${(bw * (1 + 2 * OVER)).toFixed(1)} ${(bh * (1 + 2 * OVER)).toFixed(1)}`;
    Object.values(scene.layers).forEach((s) => s.setAttribute('viewBox', v));
    seeing(scene);
  }

  /* A camera on the move (a glide, a zoom, a drag) does not draw each frame: a new view box costs a layout and a paint of
     every layer, a tenth of a second a frame on a 4K screen. What is drawn is moved and scaled on the compositor
     instead, and drawn again, sharp, where the camera comes to rest (crop()). A move that runs past what is drawn first
     draws a wider view, round where the camera is and where it is heading, with room to move. */
  function look(scene, toward) {
    const v = onScreen(scene, scene.box);
    const d = scene.drawn;
    // inside what is drawn, not its margin: the margin past each edge is the depth shift's (parallax)
    const inside = d && v[2] * 4 > d[2] && v[0] >= d[0] && v[1] >= d[1] && v[0] + v[2] <= d[0] + d[2] && v[1] + v[3] <= d[1] + d[3];
    if (!inside) {
      const t = toward ? onScreen(scene, toward) : v;
      const [px, py] = [v[2] * 0.25, v[3] * 0.25];
      const x = Math.min(v[0], t[0]) - px;
      const y = Math.min(v[1], t[1]) - py;
      const w = Math.max(v[0] + v[2], t[0] + t[2]) + px - x;
      const h = Math.max(v[1] + v[3], t[1] + t[3]) + py - y;
      const a = scene.cw / scene.ch;
      crop(scene, w / h < a ? [x - (h * a - w) / 2, y, h * a, h] : [x, y - (w / a - h) / 2, w, w / a]);
      return;
    }
    scene.vb = v;
    seeing(scene);
  }
  // What is drawn, moved and scaled to show the view (nothing to do when the view is what is drawn), and what the
  // camera shows and how many pixels a world unit is, for the dog's game (/kit/kindlemere-dog.js).
  function seeing(scene) {
    const v = scene.vb;
    const d = scene.drawn;
    const s = scene.cw / v[2];
    const cam = d === v ? '' : `translate(${((d[0] - v[0]) * s).toFixed(2)}px, ${((d[1] - v[1]) * s).toFixed(2)}px) scale(${(d[2] / v[2]).toFixed(5)}) `;
    if (cam !== (scene.cam || '')) { scene.cam = cam; shift(scene); }
    if (scene.layers.actors) {
      scene.layers.actors.setAttribute('data-km-view', `${v[0].toFixed(1)} ${v[1].toFixed(1)} ${v[2].toFixed(1)} ${v[3].toFixed(1)}`);
      scene.layers.actors.setAttribute('data-km-scale', s.toFixed(4));
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
    // Full daylight is the picture as drawn, so the light's filter comes off then: on a big screen it halves the frame rate
    const plain = r === 1 && g === 1 && b === 1 && sat === 1 && !moonLight;
    if (plain !== scene.plain) {
      scene.plain = plain;
      if (!scene.lit) scene.lit = [...scene.root.querySelectorAll('[filter$="km-light)"]')].map((el) => [el, el.getAttribute('filter')]);
      for (const [el, f] of scene.lit) if (plain) el.removeAttribute('filter'); else el.setAttribute('filter', f);
    }

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
    if (!shift(scene)) return false;
    return Math.abs(scene.target[0] - scene.cur[0]) + Math.abs(scene.target[1] - scene.cur[1]) > 0.002;
  }
  // Each layer's shift for its depth, after the camera's move (look()). False when there is nothing new to write (the
  // cast walking keeps the frames coming).
  function shift(scene) {
    const amp = (scene.cw || 0) * 0.012;
    const key = `${(scene.cur[0] * amp).toFixed(2)} ${(scene.cur[1] * amp).toFixed(2)} ${scene.cam || ''}`;
    if (key === scene.parallaxAt) return false;
    scene.parallaxAt = key;
    for (const [name, s] of Object.entries(scene.layers)) {
      const k = DEPTH[name] === undefined ? 1 : DEPTH[name];
      s.style.transform = `${scene.cam || ''}translate3d(${(-scene.cur[0] * amp * k).toFixed(2)}px, ${(-scene.cur[1] * amp * k * 0.5).toFixed(2)}px, 0)`;
    }
    return true;
  }

  /* ---------------------------------------------------------------- life: everyone about their place */
  // Owner, 2026-10-08: "the characters should have more free movement in general ... upgrade the animations and
  // movement, and create the full scene to be immersive and engaging". Each character potters about its own place on
  // its own clock (a stroll, a look about, a word with whoever is near), and every so often a group walks the stitched
  // paths to visit another place, talks there and walks home. A click stops one to answer. In a room its own keeper
  // keeps to its spot (the room's bubble points at it) and only goes visiting once the page has been left alone a while.
  // window.kindlemere.hold(true) brings everyone home and keeps them there while a room is busy. Nobody wanders at
  // night, Spud only comes up for dinner or when he is woken (spudUp), and the dog has a day of its own (/kit/kindlemere-dog.js). Reduced motion:
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

  // What each one says when clicked, a dozen each and never the same twice running (owner, 2026-10-08: "characters
  // should have quite a few quotes when pressed to keep things fresh and engaging"). The rooms mix their own in
  // (window.kindlemere.lines).
  const LINES = {
    nutrition: [
      'Breakfast and lunch are mine. Shall we plan a week of meals?', 'Soup on Sunday makes lunch on Monday easy.',
      "Bring me your shopping list. I'll make it a menu.", 'Half an avocado on toast. The other half is me, thank you.',
      'A good week starts with a list. Shall we write one together?', "Leftovers are tomorrow's lunch with a plan.",
      'The long table always has room for one more.', "Not sure what's for lunch? That's my favourite question.",
      "I keep the pit. It's where I keep my good ideas.", 'Fresh herbs make a Tuesday taste like a Saturday.',
      'A bowl of fruit on the table gets eaten. One in the drawer does not.', 'Plan the shop and the week plans itself.',
    ],
    'nutrition-summer': [
      'Treats are my thing. Fruit first, then the fun.', "I'm a peach. Sweet is sort of my job.", 'Berries count as a treat. Ask anyone.',
      'Something sweet at four o\'clock keeps the grumbles away.', "A treat tastes better when it's planned.",
      'I hop. Avo walks. We get there together.', 'Frozen grapes. Try them once and thank me later.',
      'Dark chocolate and an apple. A very fine pairing.', 'Yoghurt, honey and a handful of nuts. My kind of pudding.',
      'Fuzzy on the outside, sweet in the middle.', "Ask Avo for a treat that fits the week. She knows the numbers.",
      "Peaches are best in summer. I'm called Summer, so I'm best all year.",
    ],
    'nutrition-spud': [
      'Dinner is on. Pull up a chair.', "Evening. I've been in the ground all day, so I'm starving.",
      "Roast, mash or baked. I don't take it personally.", 'A good dinner is a plate with a bit of everything on it.',
      "Is it dinner time? It's always dinner time when I'm up.", "I'm a spud. Comfort is my whole personality.",
      'Leftover dinner makes a fine lunch. Ask Avo.', "Warm plates, cold butter, early night. That's my evening.",
      "Soup tonight? I'll bring myself.", 'I pop up at dinner and down at bedtime. Good routine.',
      'Greens on the plate first. Then me.', 'Avo plans it. Summer sweetens it. I eat it.',
    ],
    fitness: [
      'One step at a time. Shall we warm up?', "Balance is easy when you're three stones high.", 'Slow is still forward.',
      'A walk counts. A stretch counts. Turning up counts most.', 'In through the nose, slow out through the mouth. There.',
      "The hill isn't going anywhere, and neither am I.", 'Every stone in me was carried here one at a time.',
      'Missed a day? The hill will wait.', 'Warm up first. Your knees will thank you.',
      'The top of the hill has a telescope. Worth the climb.', 'Drink some water. Then drink a little more.',
      'Rest days are training days in disguise.',
    ],
    'fitness-puff': [
      'Home workouts and wet-weather runs. That is me.', "Rain? Lovely. Bring a hat and let's go.",
      'No gym? No problem. A chair and a wall will do.', "I'm a cloud. Floating is my cardio.",
      'Ten minutes on the living room floor is ten minutes well spent.', 'Puddles are just tiny lakes to jump.',
      'Stretch while the kettle boils. Avo taught me that.', "I'm fluffy, not soft. There's a difference.",
      'A drizzle run feels like the whole sky is cheering.', 'Squats by the window, and watch the weather do its thing.',
      'Cold out? Warm up longer, then off we go.', 'Huff likes the heat. I like weather with character.',
    ],
    'fitness-huff': [
      'Gym days and hot runs. Bring water.', 'Sunny out? Early run, shady route, full bottle.',
      "Dumbbells, a bench and a plan. That's a good day.", "I'm a dust cloud. I've been on a lot of runs.",
      'Heavy things, lifted slowly, put down gently.', 'Hot day? Slow the pace and keep the smile.',
      "A few sips every ten minutes. I'm serious about water.", 'Puff loves rain. I love a sunny track.',
      "Rest between sets. The weights aren't going anywhere.", 'A good lift starts with good feet.',
      'Sunscreen is part of the warm-up.', "I kick up a bit of dust when I'm excited. Sorry about that.",
    ],
    'dog-training': [
      'Ready to train? Grab the treats.', "Small steps, lots of wins. That's the whole method.",
      'Every tooth mark on me is a dog who got it right.', 'Patience first, treats second, praise always.',
      'Short sessions. Five minutes beats fifty.', 'Every dog learns at its own pace. So do people.',
      "I roll everywhere. The dogs think it's a game. It is.", 'Sit, stay, good. The good is the important part.',
      'End on a win, then go and play.', 'Louise has the answers my books do not. I ask her often.',
      'The best training happens on walks.', 'A dog that sniffs is a dog that thinks.',
    ],
    'dog-training-barkley': [
      'Out in the woods with your dog? Ask me.', 'Sniff first, walk second.', "I've been a branch, a log and a stick. Stick is my favourite.",
      'The bay smells of heron and adventure.', "I'm a stick. Dogs adore me. It's a lot of pressure.",
      'A slow walk with lots of sniffs tires a dog more than a fast one.', 'Fetch is good. Hide and seek is better.',
      'Take a long lead to the woods and let them explore.', 'Muddy paws mean a good walk.',
      'After the woods, check ears and toes for ticks.', 'Throw me if you like. I always come back. Eventually.',
      'Leaves to sniff, logs to climb. Best playground going.',
    ],
    'dog-training-sizzle': [
      'Treats are my department. Small ones.', 'Sit. Good. Here it comes.', 'One biscuit, not the jar. I keep count.',
      'Treats are training money. Spend them well.', "Small and often. That's the treat rule.",
      'Catch. Lovely. That one goes in the book.', 'I smell like bacon. The dogs never let me forget it.',
      'Eyes on me, and catch.', 'A treat for a sit. A bigger smile for a stay.',
      "Count the treats into the day's food. Little ones add up.", 'Bone biscuits, counted in and counted out.',
      "Who's a good dog? This one. Here you go.",
    ],
    dog: ['Woof.'],
  };
  const lastLine = {};
  /** A line for a character from its pool (and a room's own lines for it), never the one it said last. */
  function line(key, own) {
    const all = [...new Set([...(Array.isArray(own) ? own : []), ...(LINES[key] || [])])];
    if (!all.length) return '';
    let i = Math.floor(Math.random() * all.length);
    if (all.length > 1 && i === lastLine[key]) i = (i + 1) % all.length;
    lastLine[key] = i;
    return all[i];
  }

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
    p.gone = setTimeout(() => p.remove(), 3600);
  }

  /* ---------------------------------------------------------------- Spud, woken in the ground */
  // Owner, 2026-10-09: "when clicking spud while he is sleeping he should pop up for a bit to talk, and then can jump
  // back into the ground." Outside dinner (by day, and at night) Spud sleeps in his mound. A click pops him up: a short
  // rise out of the soil with a puff of earth, his eyes blink awake, a yawn. He stays up to talk; left alone
  // SPUD_STAY_MS (window.kindlemere.spud.stay() keeps him up while a room talks with him) he says goodbye and hops back
  // down. Reduced motion: he just appears and goes. Only Spud does this; at night everyone else sleeps on.
  const SPUD = 'nutrition-spud';
  const SPUD_STAY_MS = 20000;
  const SPUD_UP = [
    "Mm? Oh, hello. I was napping in the soil. Is it dinner already?", "Yaaawn. Hello there. Earth's warm today. What's up?",
    "Who's that? Oh, you. Fine, I'm up. Want to talk dinner?", "Five more minutes... No? All right. What's cooking?",
  ];
  const SPUD_NIGHT = "Yaaawn. It's late, but I'm up now. Want to talk about tomorrow's dinner?";
  const SPUD_TALK = ["Dinner's my department. Shall we talk about tonight's?", 'I keep dinner. Come and ask me what to make.',
    "Hungry already? Let's plan a dinner with Avo."];
  const SPUD_BYE = ["Right, back into the ground for a nap. Wake me at dinner.", "Off I pop. Down I go. See you at dinner.",
    "That's me back to the soil. Night-night, or day-day, whichever it is."];
  const inGround = (scene, a) => a.key === SPUD && !scene.dinner;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  let live = null;
  /** A quiet line for screen readers (a live region the page keeps; the bubbles come and go). */
  function announce(text) {
    if (!live) {
      live = document.createElement('div');
      live.className = 'km-announce';
      live.setAttribute('aria-live', 'polite');
      live.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
      document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 60);
  }
  // His parts in the drawing: the figure (shown at dinner), the mound he sleeps in, his awake and sleeping faces.
  function spudParts(a) {
    if (a.parts) return a.parts;
    const body = a.el.querySelector('.km-dinner-only');
    const mound = a.el.querySelector('.km-mound');
    if (!body || !mound) return null;
    const dayFace = body.querySelector('.km-face-happy') ? body.querySelector('.km-face-happy').parentElement : null;
    const nightFace = dayFace && dayFace.nextElementSibling && dayFace.nextElementSibling.classList.contains('km-night-only') ? dayFace.nextElementSibling : null;
    const holder = body.parentElement && body.parentElement.parentElement; // his own drawing's frame: feet at y 96
    a.parts = { body, mound, dayFace, nightFace, holder };
    return a.parts;
  }
  // Nothing of him shows below the ground line while he rises or sinks (a clip in his drawing's own units).
  let clips = 0;
  function groundClip(scene, p) {
    if (!p.holder || p.holder.hasAttribute('clip-path')) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = scene.layers.actors;
    let defs = svg.querySelector(':scope > defs');
    if (!defs) { defs = document.createElementNS(NS, 'defs'); svg.insertBefore(defs, svg.firstChild); }
    const id = `km-spud-ground-${clips += 1}`;
    const clip = document.createElementNS(NS, 'clipPath');
    clip.setAttribute('id', id);
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const r = document.createElementNS(NS, 'rect');
    [['x', -300], ['y', -400], ['width', 700], ['height', 499]].forEach(([k, v]) => r.setAttribute(k, v));
    clip.appendChild(r);
    defs.appendChild(clip);
    p.holder.setAttribute('clip-path', `url(#${id})`);
  }
  // A little puff of earth round his feet.
  function soil(p) {
    if (still || !p.holder) return;
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    const bits = [[-26, -10], [-14, -18], [0, -22], [14, -18], [26, -10], [-8, -26], [8, -26]];
    bits.forEach(([dx, dy], i) => {
      const c = document.createElementNS(NS, 'ellipse');
      c.setAttribute('cx', 47);
      c.setAttribute('cy', 92);
      c.setAttribute('rx', 4 + (i % 3));
      c.setAttribute('ry', 3 + (i % 2));
      c.setAttribute('fill', i % 2 ? '#8A6438' : '#7A5530');
      g.appendChild(c);
      c.animate([{ transform: 'translate(0, 0)', opacity: 0.95 }, { transform: `translate(${dx * 1.6}px, ${dy * 1.4}px)`, opacity: 0 }],
        { duration: 620 + i * 30, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
    });
    p.holder.appendChild(g);
    setTimeout(() => g.remove(), 900);
  }
  const face = (p, sleeping) => {
    if (p.dayFace) p.dayFace.style.display = sleeping ? 'none' : '';
    if (p.nightFace) p.nightFace.style.display = sleeping ? 'inline' : '';
  };
  /** Up out of the ground. True when he came up. */
  function spudUp(scene, a) {
    const p = spudParts(a);
    if (!p || a.up || a.sinking) return false;
    a.up = true;
    a.el.setAttribute('data-km-awake', '1');   // after dark too: his awake face and his pot held up
    groundClip(scene, p);
    p.mound.style.display = 'none';
    p.body.style.display = 'inline';
    a.el.setAttribute('aria-label', 'Spud, up out of the ground: talk dinner with him');
    announce('Spud pops up out of the ground.');
    const awake = () => {
      face(p, false);
      a.el.setAttribute('data-km-mood', 'oh');   // eyes wide: awake
      clearTimeout(a.wakeTimer);
      a.wakeTimer = setTimeout(() => a.el.removeAttribute('data-km-mood'), 800);
    };
    if (still) awake();
    else {
      face(p, true);   // he comes up still asleep, then blinks awake
      soil(p);
      p.body.animate([{ transform: 'translateY(74px)' }, { transform: 'translateY(-8px)', offset: 0.72 }, { transform: 'translateY(0)' }],
        { duration: 760, easing: 'cubic-bezier(.25,.8,.35,1)' });
      setTimeout(awake, 820);
    }
    spudStay(scene, a);
    return true;
  }
  function spudStay(scene, a) {
    if (!a.up) return;
    clearTimeout(a.stayTimer);
    a.stayTimer = setTimeout(() => spudDown(scene, a), SPUD_STAY_MS);
  }
  /** His goodbye, and back down into the ground. */
  function spudDown(scene, a) {
    const p = spudParts(a);
    if (!p || !a.up || a.sinking) return;
    clearTimeout(a.stayTimer);
    const done = () => {
      a.up = false;
      a.sinking = false;
      p.body.style.display = '';
      p.mound.style.display = '';
      face(p, false);
      a.el.removeAttribute('data-km-awake');
      a.el.removeAttribute('data-km-mood');
      a.el.removeAttribute('data-km-talk');
      a.el.setAttribute('aria-label', 'Spud');
    };
    if (scene.dinner) { done(); return; }   // dinner came round: he stays up anyway
    a.sinking = true;
    const ev = new CustomEvent('kindlemere:spud', { cancelable: true, detail: { up: false, svg: scene.layers.actors, scene: scene.root } });
    const bare = fullScene === scene && stageOf(scene) === scene.root;
    if (bare || window.dispatchEvent(ev)) say(scene, a.el, pick(SPUD_BYE));
    a.el.setAttribute('data-km-talk', '1');
    setTimeout(() => {
      a.el.removeAttribute('data-km-talk');
      announce('Spud hops back down into the ground.');
      if (still) { done(); return; }
      face(p, true);
      soil(p);
      const sink = p.body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.3 }, { transform: 'translateY(78px)' }],
        { duration: 640, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' });
      sink.onfinish = () => { done(); sink.cancel(); };
    }, 1800);
  }

  // The park's way into Avo's room to talk dinner with him: a button in his bubble.
  async function spudTalkAction(scene, a, viaKey) {
    const to = window.kit && typeof window.kit.address === 'function' ? await window.kit.address('nutrition').catch(() => null) : null;
    const b = scene.root.querySelector('.km-say');
    if (!to || !b || !a.up) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Talk dinner with Spud';
    btn.style.cssText = 'display:block;margin:8px auto 0;padding:6px 12px;border-radius:999px;border:1px solid rgba(26,36,51,0.25);background:#F4EFE3;color:#1A2433;font:700 13px/1.2 ui-rounded,Candara,"Gill Sans","Segoe UI",sans-serif;cursor:pointer';
    btn.addEventListener('click', () => go(`${to.split('#')[0].split('?')[0]}?talk=spud`, 'nutrition'));
    b.style.pointerEvents = 'auto';
    b.appendChild(btn);
    clearTimeout(b.gone);
    b.gone = setTimeout(() => b.remove(), 9000);
    spudStay(scene, a);
    if (viaKey) btn.focus();
  }

  function wake(scene, key, viaKey) {
    const a = scene.cast[key];
    if (!a) return;
    if (a.sinking) return;   // on his way down: he has said goodbye
    const name = a.el.getAttribute('data-km-name') || key;
    // Spud asleep in the ground pops up; Spud already up stays up a while longer.
    const popped = inGround(scene, a) && !a.up ? spudUp(scene, a) : false;
    const up = inGround(scene, a) && Boolean(a.up);
    if (up) spudStay(scene, a);
    // a click stops one to answer: it turns to you, says its piece, and goes back to its day a little later
    if (a.mode === 'potter' && a.walk) { a.walk = null; a.moving = false; a.mode = 'idle'; stand(a); }
    a.pauseUntil = performance.now() + 4500;
    a.el.setAttribute('data-km-mood', 'oh');
    a.el.setAttribute('data-km-talk', '1');
    clearTimeout(a.wakeTimer);
    a.wakeTimer = setTimeout(() => { a.el.removeAttribute('data-km-mood'); }, 900);
    setTimeout(() => { a.el.removeAttribute('data-km-talk'); }, 2600);
    // up: Spud is up out of the ground outside dinner; popped: this click brought him up (a room says his yawn)
    const ev = new CustomEvent('kindlemere:character', { cancelable: true, detail: { name, key, svg: scene.layers.actors, scene: scene.root, up, popped } });
    const asleep = (scene.night && !a.el.hasAttribute('data-km-awake')) || (inGround(scene, a) && !a.up);
    // the scene alone full screen (the Kindlemere page) has no room on it to answer: the kit answers
    const bare = fullScene === scene && stageOf(scene) === scene.root;
    if (bare || window.dispatchEvent(ev)) {
      if (popped) say(scene, a.el, scene.night ? SPUD_NIGHT : pick(SPUD_UP));
      else if (up) { say(scene, a.el, pick(SPUD_TALK)); spudTalkAction(scene, a, viaKey); }
      else say(scene, a.el, asleep ? `${name === 'dog' ? 'Asher the Dasher' : name} is asleep.` : line(key) || name);
    }
    if (key === 'dog-training-sizzle' && !asleep) treatFrom(scene, a);
  }

  // Owner, 2026-10-08: "when clicking Sizzle, the dog should run to Sizzle and sit in front of Sizzle waiting for a
  // treat that sizzle tosses". The dog comes to whichever side of him it is on and catches a biscuit from his jar
  // (/kit/kindlemere-dog.js); he stays put until it has.
  function treatFrom(scene, a) {
    const dog = scene.dog || (window.kindlemereDog && window.kindlemereDog.of && window.kindlemereDog.of(scene.layers.actors));
    if (!dog || typeof dog.treat !== 'function') return;
    const svg = scene.layers.actors;
    const jar = a.el.querySelector('.km-treat > g[transform]');
    // the jar's lid in the world, wherever he stands (read twice: as the dog sits, and as he tosses)
    const lid = () => {
      try {
        const bb = jar.getBBox();
        return new DOMPoint(bb.x + bb.width / 2, bb.y).matrixTransform(svg.getScreenCTM().inverse().multiply(jar.getScreenCTM()));
      } catch (_) { return { x: a.x + 50, y: a.y - 130 }; }
    };
    const side = dog.where().x < a.x ? -1 : 1;
    if (dog.treat([a.x + side * 165, a.y + 14], lid)) a.pauseUntil = performance.now() + 9000;
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
      el.setAttribute('aria-label', name === 'dog' ? 'Asher the Dasher, the park\'s dog' : name);
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => wake(scene, key));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wake(scene, key, true); } });
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
    // the signpost's arms, the telescope and the lanterns stand still: looked at again only when the camera moves
    const at = scene.vb.map(Math.round).join();
    if (scene.reachAt === at) return;
    scene.reachAt = at;
    const r = scene.root.getBoundingClientRect();
    scene.root.querySelectorAll('[data-km-part^="sign-"], [data-km-part="telescope"], [data-km-part^="lantern-"][role]').forEach((el) => {
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
        look(scene, to);
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
    const full = fullScene ? 'km-full' : '';   // left from full screen: the next page offers it back
    const base = url.split('#')[0];
    if (!hero || !to || still) { location.assign(full ? `${base}#${full}` : url); return; }
    const mid = lerpBox(hero.box.slice(), to, 0.55);
    await glide(hero, hero.box.slice(), mid, 620, 0, 1);
    location.assign(`${base}#km-from=${mid.map((v) => Math.round(v)).join(',')}${full ? `&${full}` : ''}`);
  }
  /** Arriving from another place: start where that page's camera left off and glide the rest of the way in. */
  async function arrive(scene) {
    const m = /km-from=(-?\d+),(-?\d+),(\d+),(\d+)/.exec(location.hash);
    const full = /km-full/.test(location.hash);
    if (!m && !full) return;
    history.replaceState(null, '', location.pathname + location.search);
    if (full) offerFull(scene);
    if (!m) return;
    const from = m.slice(1, 5).map(Number);
    if (still || from[2] < 100 || from[3] < 60) return;
    const to = scene.box.slice();
    veil(scene).style.opacity = '1';
    document.documentElement.classList.remove('km-arriving');
    await glide(scene, from, to, 760, 1, 0);
    crop(scene);
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
        on(() => say(scene, el, 'Louise is across the lake. Questions go to her as lanterns: press the one waiting at the dock to send one.'));
        return;
      }
      el.setAttribute('role', 'link');
      el.setAttribute('aria-label', `To ${PLACE_NAMES[key]}`);
      on(async () => {
        if (fullScene === scene) { toPlace(scene, key); return; }   // full screen: the camera goes, the page stays
        if (key === roomKey()) { say(scene, el, `You're in ${PLACE_NAMES[key]}.`); return; }
        const url = window.kit && window.kit.address ? await window.kit.address(key) : null;
        if (url) go(url, key); else say(scene, el, `${PLACE_NAMES[key].replace(/^the /, 'The ')} isn't open from here.`);
      });
    });
  }

  /* ---------------------------------------------------------------- full screen: the whole world, your own camera */
  // Owner, 2026-10-08: "Kindlemere needs to have a full screen option as well to complete the immersion, with scroll to
  // zoom in and out of different areas and when switching between the 3 scenes, having wayfinding buttons to switch like
  // the signs to each scene". The scene fills the screen and nothing else shows. The wheel or a pinch zooms toward the
  // pointer, a drag looks around, and + - and the arrow keys do the same. A signpost in the corner glides the camera to
  // each place; arrived at one, its arm offers the way into its keeper's room. Where the browser has no full screen
  // (an iPhone), the scene fills the window instead. Characters, the dog and fetch all go on as before.
  const WORLD_W = 3200;
  const WORLD_H = 1800;
  const MIN_W = 360;   // the closest look, in world units across
  const STEP_IN = { nutrition: 'Step into the Orchard', fitness: 'Climb Stepping Hill', 'dog-training': 'Walk to Lakeside Field' };
  let fullScene = null;
  // What goes full screen: a room's stage, so its keeper's words and its card come too and the room works there as it
  // does on the page (owner, 2026-10-08: "I just wish the agents could work in the full screen mode"), or the scene alone.
  const stageOf = (scene) => scene.root.closest('[data-km-stage]') || scene.root;

  // The visible box for a camera box on this screen (object-fit: cover at the scene's position, as crop() does).
  function onScreen(scene, box) {
    const a = (scene.cw || 16) / (scene.ch || 9);
    let [x, y, w, h] = box;
    if (w / h > a) { const cw = h * a; x += (w - cw) * scene.pos[0]; w = cw; } else { const ch = w / a; y += (h - ch) * scene.pos[1]; h = ch; }
    return [x, y, w, h];
  }
  // A box the camera may take: the screen's shape, no closer than MIN_W, no wider than the whole park, inside the world.
  function allowed(scene, box) {
    const a = (scene.cw || 16) / (scene.ch || 9);
    const most = onScreen(scene, CAMERAS.realm)[2];
    const w = clamp(box[2], Math.min(MIN_W, most), most);
    const h = w / a;
    const x = clamp(box[0] + (box[2] - w) / 2, 0, Math.max(0, WORLD_W - w));
    const y = clamp(box[1] + (box[3] - h) / 2, 0, Math.max(0, WORLD_H - h));
    return [x, y, w, h];
  }
  // The camera eases toward where it is aimed (scene.aim), a little each frame; a drag moves it at once.
  let camRaf = 0;
  function camera() {
    camRaf = 0;
    const s = fullScene;
    if (!s || !s.aim) return;
    const k = still ? 1 : 0.2;
    const next = s.box.map((v, i) => v + (s.aim[i] - v) * k);
    const done = next.every((v, i) => Math.abs(v - s.aim[i]) < 0.5);
    s.box = done ? s.aim.slice() : next;
    if (done && !s.held) crop(s); else look(s, s.aim);   // drawn sharp where it comes to rest, not under a finger
    wayfinding(s);
    if (!done) camRaf = requestAnimationFrame(camera);
  }
  function aim(scene, box, now) {
    scene.aim = allowed(scene, box);
    const said = scene.root.querySelector('.km-say');   // a bubble is pinned to the screen, so it goes when the camera moves
    if (said) said.remove();
    if (now) {
      scene.box = scene.aim.slice();
      if (scene.held) look(scene, scene.aim); else crop(scene);
      wayfinding(scene);
      return;
    }
    // already there and drawn (a wheel turned at the closest look): nothing to do
    if (!scene.cam && !camRaf && scene.aim.every((v, i) => Math.abs(v - scene.box[i]) < 0.5)) return;
    if (!camRaf) camRaf = requestAnimationFrame(camera);
  }
  // Zoom by k (above 1 is out) about a point given as a fraction of the screen.
  function zoomBy(scene, k, fx, fy) {
    const [x, y, w, h] = scene.aim || scene.vb;
    const nw = w * k;
    const nh = h * k;
    aim(scene, [x + fx * (w - nw), y + fy * (h - nh), nw, nh]);
  }
  function panBy(scene, dx, dy, now) {
    const [x, y, w, h] = scene.aim || scene.vb;
    aim(scene, [x + dx, y + dy, w, h], now);
  }
  function toPlace(scene, key) {
    const box = CAMERAS[VIEW_OF[key] || key];
    if (box) aim(scene, onScreen(scene, box));
  }

  // The signpost in the corner: the arms for the whole park and the three places, and the way in to the place the
  // camera has come to.
  function chrome(scene) {
    if (scene.fs) return scene.fs;
    const button = (cls, text, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = text;
      if (label) b.setAttribute('aria-label', label);
      return b;
    };
    const box = document.createElement('div');
    box.className = 'km-fs';
    const post = document.createElement('nav');
    post.className = 'km-fs-post';
    post.setAttribute('aria-label', 'Ways about Kindlemere');
    const step = button('km-fs-sign km-fs-step', '');
    step.hidden = true;
    step.addEventListener('click', async () => {
      const key = step.dataset.place;
      const url = key && window.kit && window.kit.address ? await window.kit.address(key) : null;
      if (url) go(url, key);
    });
    post.append(step);
    const signs = [['realm', 'Kindlemere'], ['nutrition', 'Orchard'], ['fitness', 'Hill'], ['dog-training', 'Field']].map(([key, text]) => {
      const b = button('km-fs-sign', text, key === 'realm' ? 'The whole of Kindlemere' : `To ${PLACE_NAMES[key]}`);
      b.dataset.place = key;
      b.addEventListener('click', () => toPlace(scene, key));
      post.append(b);
      return b;
    });
    const tools = document.createElement('div');
    tools.className = 'km-fs-tools';
    const stage = stageOf(scene);
    // a room's own book (Avo's cookbook, Steady's pack, Tumble's books) opens over the full screen as it does on the page
    const own = stage !== scene.root && document.querySelector('.km-top > :is(button, a)');
    if (own) {
      const b = button('km-fs-tool', own.textContent.trim());
      b.addEventListener('click', () => own.click());
      tools.append(b);
    }
    // on a narrow screen the room's card waits behind its button, so it does not bury the scene
    const card = stage.querySelector('[data-km-card]');
    let cardButton = null;
    if (card) {
      cardButton = button('km-fs-tool km-fs-card', card.getAttribute('data-km-card') || 'Card');
      cardButton.setAttribute('aria-expanded', 'false');
      cardButton.addEventListener('click', () => cardButton.setAttribute('aria-expanded', String(stage.classList.toggle('km-card-open'))));
      tools.append(cardButton);
    }
    const zin = button('km-fs-tool km-fs-zoom', '+', 'Zoom in');
    const zout = button('km-fs-tool km-fs-zoom', '−', 'Zoom out');
    const leave = button('km-fs-tool km-fs-leave', 'Leave', 'Leave full screen');
    const more = document.createElement('span');
    more.className = 'km-fs-wide';
    more.textContent = ' full screen';
    leave.append(more);
    zin.addEventListener('click', () => zoomBy(scene, 1 / 1.4, 0.5, 0.5));
    zout.addEventListener('click', () => zoomBy(scene, 1.4, 0.5, 0.5));
    leave.addEventListener('click', () => leaveFull());
    tools.append(zin, zout, leave);
    const hint = document.createElement('p');
    hint.className = 'km-fs-hint';
    hint.setAttribute('aria-hidden', 'true');
    box.append(tools, post, hint);
    stage.append(box);
    scene.fs = { box, step, signs, hint, cardButton };
    return scene.fs;
  }
  // Arrived from full screen: the browser wants a click before it goes full screen again, so the way back is offered.
  function offerFull(scene) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'km-fs-offer';
    b.textContent = 'Back to full screen';
    b.addEventListener('click', () => { b.remove(); enterFull(scene); });
    stageOf(scene).append(b);
    setTimeout(() => b.remove(), 15000);
  }
  // Which place the camera is at, if any: its sign is lit, and the way in shows (not for the room you are in).
  function wayfinding(scene) {
    const fs = scene.fs;
    if (!fs) return;
    const [x, , w] = scene.box;
    const cx = x + w / 2;
    // the whole park when it is all in view; else the place the middle of the view is in (the Orchard runs to the hill's
    // foot, the hill to the kennel, the Field to the east edge)
    const at = w > onScreen(scene, CAMERAS.realm)[2] * 0.8 ? 'realm' : cx < 1120 ? 'nutrition' : cx < 2150 ? 'fitness' : 'dog-training';
    for (const b of fs.signs) {
      if (b.dataset.place === at) b.setAttribute('aria-current', 'location'); else b.removeAttribute('aria-current');
    }
    const way = at && at !== 'realm' && at !== roomKey() ? at : '';
    if (fs.step.dataset.place !== way) {
      fs.step.dataset.place = way;
      fs.step.textContent = way ? STEP_IN[way] : '';
      fs.step.hidden = !way;
    }
  }

  function enterFull(scene) {
    if (!scene || fullScene) return;
    fullScene = scene;
    scene.homeBox = scene.box.slice();
    const fs = chrome(scene);
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    fs.hint.textContent = touch ? 'Pinch to zoom. Drag to look around.' : 'Scroll to zoom. Drag to look around.';
    fs.hint.classList.remove('km-fs-hint-gone');
    setTimeout(() => fs.hint.classList.add('km-fs-hint-gone'), 5000);
    const stage = stageOf(scene);
    const offer = stage.querySelector('.km-fs-offer');
    if (offer) offer.remove();
    // the scene's frame fills the stage too, whatever shape the room gives it on the page (a narrow room stacks it)
    for (let el = scene.root; el && el !== stage; el = el.parentElement) el.classList.add('km-fill');
    stage.classList.add('km-full');
    document.documentElement.classList.add('km-full-on');
    const real = stage.requestFullscreen ? stage.requestFullscreen({ navigationUI: 'hide' }) : null;
    if (real && real.catch) real.catch(() => { /* not allowed here: the scene still fills the window */ });
    // once the scene has its new size, the camera starts where the page's was
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (fullScene !== scene) return;
      scene.cw = scene.root.clientWidth;
      scene.ch = scene.root.clientHeight;
      aim(scene, onScreen(scene, scene.box), true);
      fs.signs[0].focus({ preventScroll: true });
    }));
  }
  function leaveFull() {
    const scene = fullScene;
    if (!scene) return;
    fullScene = null;
    scene.aim = null;
    stageOf(scene).classList.remove('km-full', 'km-card-open');
    for (const el of [scene.root, ...stageOf(scene).querySelectorAll('.km-fill')]) el.classList.remove('km-fill');
    if (scene.fs.cardButton) scene.fs.cardButton.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('km-full-on');
    if (document.fullscreenElement && document.exitFullscreen) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => { /* already out */ }); }
    requestAnimationFrame(() => { scene.box = scene.homeBox.slice(); crop(scene); draw(scene, herePlaceCache, now()); });
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && fullScene) leaveFull(); });

  // Wheel, drag, pinch and keys, on a scene shown full screen.
  function steering(scene) {
    const at = (e) => {
      const r = scene.root.getBoundingClientRect();
      return { fx: clamp((e.clientX - r.left) / r.width, 0, 1), fy: clamp((e.clientY - r.top) / r.height, 0, 1), r };
    };
    scene.root.addEventListener('wheel', (e) => {
      if (fullScene !== scene) return;
      e.preventDefault();
      const p = at(e);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? p.r.height : 1;
      const dy = clamp(e.deltaY * unit, -240, 240);
      if (dy) zoomBy(scene, Math.exp(dy * 0.0016), p.fx, p.fy);
      if (e.deltaX && !e.ctrlKey) panBy(scene, (e.deltaX * unit * scene.vb[2]) / p.r.width, 0);
    }, { passive: false });
    const down = new Map();
    let pinch = null;
    // The drag takes hold of the pointers only once one has moved a few pixels (or two are down): a press that does not
    // move stays a click on whatever it is on (one of your dogs seated in Tumble's room, a dog house).
    const grab = () => {
      scene.dragged = true;   // a drag is not a click on the scene (kindlemere:outside)
      for (const id of down.keys()) try { scene.root.setPointerCapture(id); } catch (_) { /* a pointer the browser no longer tracks */ }
      scene.root.classList.add('km-dragging');
      scene.held = true;
    };
    scene.root.addEventListener('pointerdown', (e) => {
      scene.dragged = false;
      if (fullScene !== scene || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.target.closest('.km-fs, [role="button"], [role="link"], .km-ball')) return;
      down.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
      if (down.size === 2) {
        grab();
        const [a, b] = [...down.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
      }
    });
    scene.root.addEventListener('pointermove', (e) => {
      const was = down.get(e.pointerId);
      if (fullScene !== scene || !was) return;
      if (!scene.held) {
        if (Math.hypot(e.clientX - was.x0, e.clientY - was.y0) < 4) return;
        grab();
      }
      const now = { x: e.clientX, y: e.clientY, x0: was.x0, y0: was.y0 };
      down.set(e.pointerId, now);
      const r = scene.root.getBoundingClientRect();
      const u = scene.vb[2] / r.width;   // world units to a pixel
      if (down.size === 1) { panBy(scene, -(now.x - was.x) * u, -(now.y - was.y) * u, true); return; }
      if (down.size === 2 && pinch) {
        const [a, b] = [...down.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mid = { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 };
        const p = at(mid);
        panBy(scene, -((now.x - was.x) / 2) * u, -((now.y - was.y) / 2) * u, true);
        zoomBy(scene, pinch.d / d, p.fx, p.fy);
        pinch.d = d;
      }
    });
    const up = (e) => {
      down.delete(e.pointerId);
      if (down.size < 2) pinch = null;
      if (down.size || !scene.held) return;
      scene.root.classList.remove('km-dragging');
      scene.held = false;
      if (scene.cam && !camRaf) crop(scene);   // let go: drawn sharp where it is
    };
    scene.root.addEventListener('pointerup', up);
    scene.root.addEventListener('pointercancel', up);
  }
  // Owner, 2026-10-09: "when in an agent chat section, clicking out into kindlemere should escape from it." A plain
  // click on the open scene (not a drag, not on the room's card, a drawer or the scene's own buttons) fires
  // kindlemere:outside first, in the capture phase: the room closes its open chat or panel, and then whatever was
  // clicked (a character) still does its own thing. With no room to stop it, the card's sheet (full screen on a narrow
  // screen) closes too.
  function outside(scene) {
    scene.root.addEventListener('click', (e) => {
      if (scene.dragged) return;
      const t = e.target instanceof Element ? e.target : null;
      if (!t || t.closest('[data-km-card], dialog, .km-fs, .km-say')) return;
      const ev = new CustomEvent('kindlemere:outside', { cancelable: true, detail: { svg: scene.layers.actors, scene: scene.root } });
      const stage = stageOf(scene);
      if (window.dispatchEvent(ev) && fullScene === scene && stage.classList.contains('km-card-open')) {
        stage.classList.remove('km-card-open');
        if (scene.fs && scene.fs.cardButton) scene.fs.cardButton.setAttribute('aria-expanded', 'false');
      }
    }, { capture: true });
  }
  document.addEventListener('keydown', (e) => {
    const s = fullScene;
    if (!s || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    const t = e.target instanceof Element ? e.target : document.body;
    // Escape closes an open book or the telescope's lens first; what is typed in the room's card is the room's
    if (e.key === 'Escape') { if (!t.closest('dialog, [role="dialog"]')) { e.preventDefault(); leaveFull(); } return; }
    if (t.closest('input, textarea, select, [contenteditable], dialog, [role="dialog"], [data-km-card]')) return;
    const [, , w, h] = s.aim || s.vb;
    const step = { ArrowLeft: [-w * 0.12, 0], ArrowRight: [w * 0.12, 0], ArrowUp: [0, -h * 0.12], ArrowDown: [0, h * 0.12] }[e.key];
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(s, 1 / 1.25, 0.5, 0.5); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(s, 1.25, 0.5, 0.5); }
    else if (step) { e.preventDefault(); panBy(s, step[0], step[1]); }
  });

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
      steering(scene);
      outside(scene);
      // A layer with something to press in it (the signpost's arms, the telescope) is not hidden from assistive tech;
      // its other words (plates, labels) still are.
      for (const s of Object.values(scene.layers)) {
        if (s.getAttribute('aria-hidden') !== 'true' || !s.querySelector('[role]')) continue;
        s.removeAttribute('aria-hidden');
        s.querySelectorAll('text').forEach((t) => { if (!t.closest('[role="button"], [role="link"]')) t.setAttribute('aria-hidden', 'true'); });
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
      const ro = new ResizeObserver(() => scenes.forEach((s) => {
        crop(s);
        if (s === fullScene) aim(s, s.aim || s.vb, true);   // a turned phone: the same look, the screen's new shape
        draw(s, place, now());
        reachable(s);
      }));
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

  if (window.kindlemere) {
    Object.assign(window.kindlemere, {
      go,
      say: (el, text) => { const s = scenes.find((x) => x.root.contains(el)); if (s) say(s, el, text); },
      // full screen (kit.js's button): the scene in view, or the first
      full: () => enterFull(scenes.find((s) => s.seen) || scenes[0]),
      isFull: () => Boolean(fullScene),
      toPlace: (key) => { if (fullScene) toPlace(fullScene, key); },
      // a character's next line: from a room's own lines for it and the kit's, never the last one again
      line,
      // Spud out of the ground outside dinner: up() pops him up, stay() keeps him up while a room talks with him (he
      // goes back down by himself SPUD_STAY_MS after the last stay or click), down() sends him down now
      spud: {
        up: () => scenes.forEach((s) => { const a = s.cast && s.cast[SPUD]; if (a && inGround(s, a)) spudUp(s, a); }),
        stay: () => scenes.forEach((s) => { const a = s.cast && s.cast[SPUD]; if (a) spudStay(s, a); }),
        down: () => scenes.forEach((s) => { const a = s.cast && s.cast[SPUD]; if (a) spudDown(s, a); }),
        isUp: () => scenes.some((s) => Boolean(s.cast && s.cast[SPUD] && s.cast[SPUD].up)),
      },
    });
  }
  start();
}());
