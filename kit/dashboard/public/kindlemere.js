'use strict';

/**
 * /kit/kindlemere.js: the live sky over Kindlemere (kit/REALM.md). /kit/kit.js loads it when a page shows the scene.
 *
 * Every <img> of /kit/art/kindlemere*.svg on the page becomes the same picture drawn inline, and once a minute:
 *   - the sun and the moon go where they are in the real sky now, for this computer's clock and place, and rise and
 *     set behind the hills (east on the left, west on the right);
 *   - the sky takes the colours of the hour, the land takes its light, and the moon shows its real phase;
 *   - after dark the stars, the fireflies and the lights come out, the dog sleeps in its house and the keepers doze.
 * The place: kit/realm.config.json ({ "lat": 35.5, "lon": -97.5 }) through /api/realm on an agent's page, else this
 * computer's time zone. Add ?km-time=2026-10-07T21:30 to the page's address to see another hour.
 * Each scene, once drawn, fires 'kindlemere:ready' on window with { svg, part }: part('dog') finds the parts marked
 * data-km-part (dog, dog-head, dog-pupils, dog-ball), and svg carries data-km-night="1" after dark.
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
    return { lit: (1 + Math.cos(inc)) / 2, waxing: angle < 0 };
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

  /* ---------------------------------------------------------------- one scene */
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
    svg.querySelectorAll('script, foreignObject, title, desc').forEach((n) => n.remove());
    // An inline svg has no object-fit: keep the picture's fit and position, and crop the view to match (crop()).
    const cs = getComputedStyle(img);
    const pos = cs.objectPosition.split(/\s+/).map((v) => (/%$/.test(v) ? parseFloat(v) / 100 : 0.5));
    const node = document.importNode(svg, true);
    node.removeAttribute('aria-labelledby');
    for (const a of ['class', 'id', 'width', 'height']) if (img.hasAttribute(a)) node.setAttribute(a, img.getAttribute(a));
    const alt = img.getAttribute('alt');
    if (alt) node.setAttribute('aria-label', alt); else node.setAttribute('aria-hidden', 'true');
    img.replaceWith(node);
    return {
      svg: node, $: (id) => node.querySelector(`#${pre}km-${id}`),
      box: node.getAttribute('viewBox').split(/\s+/).map(Number), cover: cs.objectFit === 'cover', pos: [pos[0], pos[1] === undefined ? 0.5 : pos[1]],
    };
  }

  /** For a picture set to object-fit: cover, show the part of the view that fills the box, at its object-position. */
  function crop(scene) {
    if (!scene.cover) return;
    const w = scene.svg.clientWidth;
    const h = scene.svg.clientHeight;
    if (!w || !h) return;
    let [x, y, bw, bh] = scene.box;
    if (w / h < bw / bh) { const cw = bh * (w / h); x += (bw - cw) * scene.pos[0]; bw = cw; } else { const ch = bw / (w / h); y += (bh - ch) * scene.pos[1]; bh = ch; }
    scene.svg.setAttribute('viewBox', `${x.toFixed(1)} ${y.toFixed(1)} ${bw.toFixed(1)} ${bh.toFixed(1)}`);
  }

  function draw(scene, place, t) {
    const { svg, $ } = scene;
    const [vx, , vw] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const [top, horizon] = (svg.getAttribute('data-km-sky') || '60 900').split(/\s+/).map(Number);
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
    if (h < -4) svg.setAttribute('data-km-night', '1'); else svg.removeAttribute('data-km-night');
    // Evening: from late afternoon (the sun low in the west) through the night. Spud comes round for dinner.
    if ((h < 12 && sun.az > 0) || h < -4) svg.setAttribute('data-km-evening', '1'); else svg.removeAttribute('data-km-evening');

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

  async function start() {
    const imgs = Array.from(document.querySelectorAll('img[src^="/kit/art/kindlemere"]')).filter((i) => /\/kindlemere(-[a-z]+)?\.svg$/.test(i.getAttribute('src')));
    if (!imgs.length) return;
    const place = await herePlace();
    const scenes = [];
    for (const img of imgs) {
      let scene = null;
      try { scene = await inline(img); } catch (_) { scene = null; }
      if (!scene) continue; // the picture stays as it was
      crop(scene);
      draw(scene, place, now());
      scenes.push(scene);
      const part = (name) => scene.svg.querySelector(`[data-km-part="${name}"]`);
      window.dispatchEvent(new CustomEvent('kindlemere:ready', { detail: { svg: scene.svg, part } }));
    }
    const tick = () => scenes.forEach((s) => draw(s, place, now()));
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => scenes.forEach((s) => { crop(s); draw(s, place, now()); }));
      scenes.forEach((s) => ro.observe(s.svg));
    }
    setInterval(tick, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  }

  start();
}());
