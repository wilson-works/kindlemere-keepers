'use strict';

/**
 * kit/art/make-kindlemere.js: draws the ONE scene of the realm (kit/REALM.md) and the keepers' moods.
 *   node kit/art/make-kindlemere.js
 * Writes kit/art/kindlemere.svg (the whole realm), three close views of the same world (kindlemere-orchard.svg,
 * kindlemere-hill.svg, kindlemere-field.svg) and one file per keeper and mood, kit/art/keepers/<agent>-<mood>.svg.
 *
 * Plain Node. Cut paper: flat paper shapes in layers, each on a short hard shadow, paper grain over all of it.
 * One big world drawn to scale (owner, 2026-10-07: "Scale is still off, we can make the world as big and detailed as
 * we want"): the land is drawn at twice the keepers' size and the hill bigger still, so a tree stands well over a
 * keeper, the hill is a real hill and the dog fits its house. Fine detail (grass, flowers, pebbles) stays at the
 * keepers' size, so the bigger world is also the more detailed one. Repeated detail comes from a seeded random, so
 * every run draws the same scene.
 *
 * The sky is live (owner, 2026-10-07). The files carry a clear mid-morning sky; /kit/kindlemere.js moves the sun and
 * the moon by this computer's clock and place, colours the sky, lights the land by the hour and, after dark, brings out
 * the stars, the fireflies and the string lights, puts the dog to bed in its house and the keepers to sleep.
 * What it drives (ids): km-sky-0, km-sky-1, km-sky-2 (the sky's colours), km-sunglow, km-sun, km-sun-rays, km-sun-rim,
 * km-sun-core, km-moon, km-moon-lit, km-stars, km-light-m (the land's light), km-glow, km-glitter. Night-only parts
 * carry class km-night-only and day-only parts km-day-only; the script sets data-km-night="1" on the svg.
 * The dog, for a fetch game: km-dog (moved by its transform), km-dog-head, km-dog-pupils, km-dog-ball (centred on 0 0).
 */

const fs = require('fs');
const path = require('path');

const W = 3200;
const H = 1800;
const KS = 1.1; // the keepers' size in the world

/* ------------------------------------------------------------------ palette (kit/design/tokens.css) */
const C = {
  ink: '#1A2433', inkSoft: '#4A5568', paper: '#FFFFFF', cream: '#F4EFE3', creamDeep: '#E9E4D4', stitch: '#C9C2AE',
  mere: '#1F5C6E', mereDeep: '#163F4C', mereMid: '#1B5263', mereLight: '#CFE6EA', mereShine: '#2A6E80',
  kindle: '#FF7A45', kindleDeep: '#C24E1C',
  nSky: '#FFE1C2', nLand: '#525C12', nGlow: '#FFB36B', nGlowDeep: '#E5944A', nLeaf: '#6E7D1C', nLeafLight: '#7D8A26', nLeafPale: '#9AA73A', nDark: '#3B420C',
  clay1: '#D49A68', clay2: '#C98A5A', clay3: '#A86A3E', clay4: '#8A5530', bark: '#6B4A2A',
  fBg: '#F1F4F6', fSky: '#DCE5EC', fLand: '#4B5D6E', fShade: '#3B4B59', fLight: '#7E909F', fLightShade: '#66798A', fPale: '#E4EAEF', fGlow: '#A9B8C4', fGlowDeep: '#8C9DAB', fDeep: '#34424F', fDeeper: '#2A3640', fStone: '#EEF1F3',
  pine: '#2F4A3A', pineMid: '#3E5E46', pineLight: '#4F7356', moss: '#8BA348', sand: '#D9C9A8',
  dSky: '#DDEBA6', dLand: '#6E3A12', dGlow: '#E5B07A', dGrass: '#A9C24A', dGrassDeep: '#7E9A2E', dGrassDark: '#62801F', dPlume: '#9DB83A', dSeed: '#C3D66B', dRusset: '#8E5126', dTan: '#A8622E', dDark: '#4F2A0D',
  bulb: '#FFF1C9', bulbGlow: '#FFD58A', firefly: '#F4FFB0',
};

/* ------------------------------------------------------------------ helpers */
let seed = 20261007;
function rnd() { // mulberry32: the same scene every run
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const r = (a, b) => a + (b - a) * rnd();
const f = (n) => Math.round(n * 10) / 10;
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const g = (attrs, body) => `<g ${attrs}>${body}</g>`;
const shadow = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.ink}" opacity="0.16"/>`;

/*
 * The land is drawn in its own units and scaled up into the world (scale 2, the hill 2.6). DETAIL shrinks the fine
 * detail by the same amount, so a blade of grass is the same size next to a keeper wherever it grows, and DENS adds
 * more of it to fill the bigger ground.
 */
let DETAIL = 1;
let DENS = 1;
const N = (n) => Math.round(n * DENS);

/** A ridge line through points [[x,y],...], smoothed, filled down to `bottom`. */
function ridge(pts, bottom, fill, extra) {
  let d = `M${pts[0][0]} ${bottom} L${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    d += ` C${f(x0 + (x1 - x0) / 2)} ${y0} ${f(x0 + (x1 - x0) / 2)} ${y1} ${x1} ${y1}`;
  }
  return `<path d="${d} L${pts[pts.length - 1][0]} ${bottom} Z" fill="${fill}" ${extra || ''}/>`;
}

/** A wavy band: top edge from x0 to x1 at y, filled down to `bottom`. */
function band(x0, x1, y, amp, step, bottom, fill, extra) {
  let d = `M${x0} ${bottom} V${y}`;
  for (let x = x0; x < x1; x += step) {
    const nx = Math.min(x + step, x1);
    d += ` Q${f((x + nx) / 2)} ${f(y - amp * (0.6 + rnd() * 0.8))} ${nx} ${f(y + r(-amp, amp) * 0.4)}`;
  }
  return `<path d="${d} V${bottom} Z" fill="${fill}" ${extra || ''}/>`;
}

function grassBlades(x0, x1, y0, y1, count, cols, hMin, hMax) {
  let out = '';
  const k = DETAIL;
  for (let i = 0; i < N(count); i += 1) {
    const x = r(x0, x1);
    const y = r(y0, y1);
    const h = r(hMin, hMax) * k * (0.7 + ((y - y0) / Math.max(1, y1 - y0)) * 0.6);
    const lean = r(-5, 5) * k;
    out += `<path d="M${f(x - 2.4 * k)} ${f(y)} Q${f(x + lean * 0.5)} ${f(y - h * 0.6)} ${f(x + lean)} ${f(y - h)} Q${f(x + lean * 0.3 + k)} ${f(y - h * 0.5)} ${f(x + 2.4 * k)} ${f(y)} Z" fill="${pick(cols)}"/>`;
  }
  return out;
}

function flower(x, y, petal, centre, s) {
  const k = (s || 1) * DETAIL;
  let p = '';
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    p += `<circle cx="${f(x + Math.cos(a) * 3.2 * k)}" cy="${f(y + Math.sin(a) * 3.2 * k)}" r="${f(2.4 * k)}" fill="${petal}"/>`;
  }
  return `${p}<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.8 * k)}" fill="${centre}"/>`;
}

function flowers(n, x0, x1, y0, y1, petals, centre, s) {
  let o = '';
  for (let i = 0; i < N(n); i += 1) o += flower(r(x0, x1), r(y0, y1), pick(petals), centre, s);
  return o;
}

/** Pebbles in a row along y. */
function stones(x0, x1, y, h, cols) {
  let o = '';
  const k = DETAIL;
  for (let x = x0; x < x1; x += r(12, 18) * k) o += `<ellipse cx="${f(x)}" cy="${f(y + r(-1, 1) * k)}" rx="${f(r(7, 10) * k)}" ry="${f(h * k)}" fill="${pick(cols)}"/>`;
  return o;
}

/** A sprinkle of mushrooms, ferns and fallen leaves at the foot of trees. */
function undergrowth(x0, x1, y0, y1, n) {
  let o = '';
  const k = DETAIL;
  for (let i = 0; i < N(n); i += 1) {
    const x = r(x0, x1);
    const y = r(y0, y1);
    const kind = rnd();
    if (kind < 0.3) o += `<rect x="${f(x - 1.2 * k)}" y="${f(y - 6 * k)}" width="${f(2.4 * k)}" height="${f(6 * k)}" rx="${f(k)}" fill="${C.cream}"/><path d="M${f(x - 5 * k)} ${f(y - 5 * k)} a${f(5 * k)} ${f(4 * k)} 0 0 1 ${f(10 * k)} 0 Z" fill="${pick([C.clay2, C.kindleDeep, C.clay3])}"/><circle cx="${f(x - 1.5 * k)}" cy="${f(y - 7 * k)}" r="${f(0.9 * k)}" fill="${C.cream}"/>`;
    else if (kind < 0.7) for (let j = -2; j <= 2; j += 1) o += `<path d="M${f(x)} ${f(y)} q${f(j * 3 * k)} ${f(-6 * k)} ${f(j * 6 * k)} ${f(-10 * k + Math.abs(j) * 2 * k)}" stroke="${pick([C.pineLight, C.nLeaf, '#5F7A3A'])}" stroke-width="${f(1.6 * k)}" stroke-linecap="round" fill="none"/>`;
    else o += `<path d="M0 0 C2 -3 7 -4 11 -3 C8 0 3 1 0 0 Z" fill="${pick([C.nGlowDeep, C.clay1, C.nLeafPale])}" transform="translate(${f(x)} ${f(y)}) rotate(${f(r(-40, 40))}) scale(${f(k)})"/>`;
  }
  return o;
}

/* The lake's edge, left to right: level along the Orchard and the Hill, then rising into a bay beside the Field. */
const SHORE = [[0, 684], [560, 684], [1040, 686], [1180, 676], [1320, 658], [1460, 644], [1600, 636]];
const DOCK_DY = 56; // the dock and the things on the water sit lower with the shore
const WATER_DY = 46;
function shoreY(x) {
  for (let i = 1; i < SHORE.length; i += 1) {
    const [x0, y0] = SHORE[i - 1];
    const [x1, y1] = SHORE[i];
    if (x <= x1) { const k = (x - x0) / (x1 - x0); const s = k * k * (3 - 2 * k); return y0 + (y1 - y0) * s; }
  }
  return SHORE[SHORE.length - 1][1];
}
/** A band that follows the shoreline, `dy` below it, filled down to `bottom`. */
function shoreBand(dy, bottom, fill, wobble) {
  let d = `M0 ${bottom} L0 ${f(shoreY(0) + dy)}`;
  for (let x = 20; x <= 1600; x += 20) d += ` L${x} ${f(shoreY(x) + dy + (wobble ? r(-wobble, wobble) : 0))}`;
  return `<path d="${d} L1600 ${bottom} Z" fill="${fill}"/>`;
}

function lanternBody() {
  return `<rect x="-6" y="-46" width="12" height="9" rx="3" fill="${C.ink}"/><path d="M0 -46 V-54" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M-16 -36 H16 C21 -24 21 6 14 16 H-14 C-21 6 -21 -24 -16 -36 Z" fill="${C.kindle}"/>` +
    `<path d="M-16 -36 H-2 C-6 -24 -6 6 -3 16 H-14 C-21 6 -21 -24 -16 -36 Z" fill="${C.kindleDeep}" opacity="0.35"/>` +
    `<path d="M-14 -24 H14 M-16 -10 H16 M-15 4 H15" stroke="${C.kindleDeep}" stroke-width="1.6" opacity="0.55"/>` +
    `<path d="M6 -30 C9 -18 9 0 6 10" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.75"/>` +
    `<rect x="-10" y="15" width="20" height="7" rx="3.5" fill="${C.ink}"/>`;
}

const LANTERNS = [[900, 790, 0.86], [1040, 800, 0.8], [1180, 808, 0.74], [1320, 814, 0.68], [1460, 820, 0.62], [1580, 826, 0.56]];
function lantern(x, y, s, delay) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="km-bob" style="animation-delay:-${delay}s">` +
    `<ellipse cx="0" cy="34" rx="34" ry="6" fill="none" stroke="${C.mereLight}" stroke-width="2" opacity="0.5"/>` +
    `<ellipse cx="0" cy="34" rx="22" ry="4" fill="none" stroke="${C.mereLight}" stroke-width="2" opacity="0.7"/>` +
    `<rect x="-5" y="34" width="10" height="34" rx="5" fill="${C.kindle}" opacity="0.28"/>` +
    `<circle cx="0" cy="-4" r="34" fill="${C.kindle}" opacity="0.14"/><circle cx="0" cy="-4" r="24" fill="${C.kindle}" opacity="0.18"/>` +
    lanternBody() + `</g></g>`;
}

/* ------------------------------------------------------------------ the sky (world units) */
const DEFAULT_SUN = { fx: 0.3, alt: 0.62 }; // where the files draw the sun: mid-morning, east of south

function sky(view) {
  const [top, horizon] = view.sky;
  const [vx, , vw] = view.box.split(' ').map(Number);
  let o = `<rect width="${W}" height="1400" fill="url(#km-sky-g)"/>`;
  // The stars, out after dark. They sit behind the land, so the hills hide them.
  let s = '';
  for (let i = 0; i < 170; i += 1) {
    const x = r(0, W);
    const y = r(0, 1060);
    if (i % 9 === 0) s += `<use href="#star" x="${f(x - 8)}" y="${f(y - 8)}" width="16" height="16" class="km-twinkle" style="animation-delay:-${f(r(0, 3))}s"/>`;
    else s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r(1.1, 3))}" fill="${C.paper}" opacity="${f(r(0.45, 1))}"${i % 4 === 0 ? ` class="km-twinkle" style="animation-delay:-${f(r(0, 3))}s"` : ''}/>`;
  }
  o += `<g id="km-stars" opacity="0">${s}</g>`;
  // The glow on the horizon around the sun at dawn and dusk.
  o += `<circle id="km-sunglow" cx="${f(vx + vw * DEFAULT_SUN.fx)}" cy="${horizon}" r="${f(vw * 0.42)}" fill="url(#km-glow-g)" opacity="0"/>`;
  // The moon: a dark disc, the lit part (the live script draws the phase), craters inside the lit part.
  const sr = f(26 + 30 * (vw / W));
  const sunX = f(vx + vw * DEFAULT_SUN.fx);
  const sunY = f(horizon - (horizon - top) * DEFAULT_SUN.alt);
  o += `<g id="km-moon" display="none" transform="translate(${sunX} ${sunY}) scale(${f(sr / 40)})">` +
    `<circle r="96" fill="#F4EFD8" opacity="0.07"/><circle r="64" fill="#F4EFD8" opacity="0.1"/>` +
    `<circle id="km-moon-dark" r="40" fill="#1E2F45" opacity="0"/>` +
    `<path id="km-moon-lit" d="M0 -40 A40 40 0 0 1 0 40 A40 40 0 0 1 0 -40 Z" fill="#F4EFD8"/>` +
    `<g clip-path="url(#km-moon-clip)" fill="#D9D2B8"><circle cx="-12" cy="-10" r="8"/><circle cx="10" cy="12" r="6"/><circle cx="14" cy="-16" r="4.5"/><circle cx="-6" cy="20" r="4"/><circle cx="-22" cy="8" r="3.5"/></g></g>`;
  // The sun: cut-paper rays, a rim and a core. The live script recolours it low in the sky.
  let rays = '';
  for (let i = 0; i < 16; i += 1) rays += `<rect x="-5" y="-108" width="10" height="${i % 2 ? 26 : 36}" rx="5" transform="rotate(${f((i / 16) * 360)})"/>`;
  o += `<g id="km-sun" transform="translate(${sunX} ${sunY}) scale(${f(sr / 60)})">` +
    `<circle r="118" fill="#FFF0C2" opacity="0.22"/>` +
    `<g id="km-sun-rays" fill="#FFD98F"><g class="km-turn">${rays}</g></g>` +
    `<circle id="km-sun-rim" r="66" fill="#FFE2A0"/><circle id="km-sun-core" r="54" fill="#FFF3C4" filter="url(#layer)"/>` +
    `<circle cx="-18" cy="-18" r="14" fill="${C.paper}" opacity="0.5"/></g>`;
  // Paper clouds and birds, lit with the land.
  const cloud = (x, y, s2, under) => `<g transform="translate(${x} ${y}) scale(${s2})"><g class="km-drift" style="animation-delay:-${f(r(0, 30))}s">` +
    `<path d="M-6 30 a26 26 0 0 1 30 -30 a36 36 0 0 1 66 -6 a30 30 0 0 1 52 14 a22 22 0 0 1 14 34 Z" fill="${under}" transform="translate(4 8)"/>` +
    `<path d="M-6 30 a26 26 0 0 1 30 -30 a36 36 0 0 1 66 -6 a30 30 0 0 1 52 14 a22 22 0 0 1 14 34 Z" fill="${C.paper}"/>` +
    `<path d="M10 30 a14 14 0 0 1 22 -12 a20 20 0 0 1 36 2" stroke="${under}" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>`;
  let c = '';
  [[260, 170, 1.6], [820, 90, 1.2], [1380, 220, 1.9], [2060, 120, 1.4], [2620, 230, 1.7], [3000, 80, 1.1], [560, 420, 0.9], [1880, 470, 0.8], [2380, 520, 0.7], [1180, 560, 0.6], [180, 600, 0.65]].forEach(([x, y, s2]) => { c += cloud(x, y, s2, '#D8E4EA'); });
  const bird = (x, y, s2) => `<path d="M${x} ${y} q${6 * s2} ${-7 * s2} ${12 * s2} 0 q${6 * s2} ${-7 * s2} ${12 * s2} 0" stroke="${C.inkSoft}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.55"/>`;
  c += `<g class="km-day-only">${bird(700, 300, 1.3) + bird(740, 318, 1) + bird(780, 296, 0.8) + bird(2240, 330, 1.2) + bird(2280, 312, 0.9) + bird(1500, 160, 0.9)}</g>`;
  o += `<g id="km-clouds" filter="url(#km-light)">${c}</g>`;
  return g('id="km-sky"', o);
}

/* ------------------------------------------------------------------ the far country (land units, scale 2) */
function far() {
  // One park, one distance: soft blue-green ranges toward the horizon, the same under every keeper.
  let o = '';
  o += ridge([[0, 404], [160, 384], [360, 402], [560, 378], [760, 398], [960, 372], [1160, 396], [1380, 374], [1600, 392]], 560, '#C3D5D2');
  o += ridge([[0, 430], [220, 412], [440, 428], [660, 406], [900, 424], [1140, 404], [1380, 420], [1600, 408]], 560, '#AFC7BE');
  o += ridge([[0, 452], [260, 436], [520, 450], [780, 432], [1040, 448], [1300, 430], [1600, 444]], 560, '#9DBBA8');
  for (let i = 0; i < 90; i += 1) {
    const x = r(4, 1596);
    const y = 438 + r(-6, 12);
    const col = pick(['#8DAE98', '#86A891', '#97B6A2']);
    const s = r(0.35, 0.7);
    o += `<rect x="${f(x - 1.5 * s)}" y="${f(y - 12 * s)}" width="${f(3 * s)}" height="${f(12 * s)}" fill="${col}"/><circle cx="${f(x)}" cy="${f(y - 14 * s)}" r="${f(r(5, 8) * s)}" fill="${col}"/>`;
  }
  o += ridge([[1040, 476], [1180, 462], [1320, 472], [1460, 456], [1600, 466]], 560, '#93B48F');
  o += ridge([[1060, 492], [1200, 482], [1340, 490], [1480, 476], [1600, 484]], 560, '#86AA80');
  for (let i = 0; i < 7; i += 1) { const y = 470 + i * 6; o += `<path d="M${f(1050 + i * 9)} ${y + 6} C${f(1200 + r(-20, 20))} ${y} ${f(1380 + r(-20, 20))} ${y + 8} 1600 ${y + r(-2, 4)}" stroke="#6F9468" stroke-width="${f(1.2 + i * 0.25)}" stroke-dasharray="${f(3 + i)} ${f(2 + i * 0.6)}" fill="none" opacity="0.7"/>`; }
  for (let i = 0; i < 46; i += 1) { const x = r(1050, 1596); const y = r(468, 500); const s = 0.3 + (y - 468) / 80; const col = pick(['#5E8A58', '#6C9662', '#79A06B', '#557F50']); o += `<circle cx="${f(x)}" cy="${f(y - 6 * s)}" r="${f(r(4, 7) * s)}" fill="${col}"/><circle cx="${f(x + 5 * s)}" cy="${f(y - 4 * s)}" r="${f(r(3, 5) * s)}" fill="${col}"/>`; }
  o += `<path d="M1080 500 C1200 494 1300 488 1420 480 C1500 474 1560 472 1600 470" stroke="#D9C9A8" stroke-width="2" fill="none" opacity="0.8"/>`;
  return g('id="km-far"', o);
}

/* ------------------------------------------------------------------ the wood behind the Orchard (land units) */
function forest() {
  let o = '';
  const row = (y0, n, cols, s, x0, x1) => {
    let out = '';
    for (let i = 0; i < n; i += 1) {
      const x = x0 + i * ((x1 - x0) / n) + r(-8, 8);
      const y = y0 + r(-6, 6) + Math.max(0, (x - 260) * 0.12);
      const kind = pick(['round', 'round', 'poplar', 'pine', 'pine']);
      const col = pick(cols);
      if (kind === 'round') out += `<rect x="${f(x - 2.5 * s)}" y="${f(y - 22 * s)}" width="${f(5 * s)}" height="${f(22 * s)}" fill="${C.bark}"/><circle cx="${f(x)}" cy="${f(y - 34 * s)}" r="${f(20 * s)}" fill="${col}"/><circle cx="${f(x - 9 * s)}" cy="${f(y - 26 * s)}" r="${f(12 * s)}" fill="${col}"/><circle cx="${f(x + 10 * s)}" cy="${f(y - 28 * s)}" r="${f(13 * s)}" fill="${col}"/>`;
      else if (kind === 'poplar') out += `<rect x="${f(x - 2 * s)}" y="${f(y - 16 * s)}" width="${f(4 * s)}" height="${f(16 * s)}" fill="${C.bark}"/><ellipse cx="${f(x)}" cy="${f(y - 46 * s)}" rx="${f(11 * s)}" ry="${f(34 * s)}" fill="${col}"/>`;
      else out += roundTree(x, y, 1.3 * s, [C.pine, C.pineMid, C.pineLight]);
    }
    return out;
  };
  o += row(420, 30, ['#9FB27A', '#A8BA84', '#94A872'], 0.55, 0, 640);
  o += row(436, 20, ['#8FA05A', '#9AAE64', '#86985A'], 0.8, 0, 600);
  o += row(452, 15, ['#6E8A42', '#5F7A3A', '#748F48'], 1.0, 10, 580);
  return g('id="km-forest"', o);
}

/* ------------------------------------------------------------------ Stepping Hill (fitness), at the centre */
function roundTree(x, base, s, cols) {
  let o = shadow(x, base, f(16 * s), f(3 * s)) + `<rect x="${f(x - 2 * s)}" y="${f(base - 14 * s)}" width="${f(4 * s)}" height="${f(14 * s)}" rx="${f(2 * s)}" fill="${C.fDeep}"/>`;
  [[0, 26, 0], [1, 18, -14], [2, 11, -26]].forEach(([i, w, dy]) => {
    o += `<path d="M${f(x - w * s)} ${f(base - 10 * s + dy * s)} Q${x} ${f(base - (34 - i * 4) * s + dy * s)} ${f(x + w * s)} ${f(base - 10 * s + dy * s)} Z" fill="${cols[i % cols.length]}"/>`;
  });
  return o;
}

function boulder(x, y, w, h) {
  return `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="${C.fLand}"/>` +
    `<path d="M${f(x - w * 0.42)} ${f(y - h * 0.08)} C${f(x - w * 0.3)} ${f(y - h * 0.5)} ${f(x + w * 0.2)} ${f(y - h * 0.55)} ${f(x + w * 0.38)} ${f(y - h * 0.22)}" stroke="${C.fLight}" stroke-width="${f(h * 0.22)}" stroke-linecap="round" fill="none"/>` +
    `<path d="M${f(x - w * 0.2)} ${f(y - h * 0.36)} q${f(w * 0.12)} ${f(-h * 0.12)} ${f(w * 0.24)} ${f(-h * 0.04)}" stroke="${C.fPale}" stroke-width="${f(h * 0.1)}" stroke-linecap="round" fill="none"/>` +
    `<path d="M${f(x - w * 0.3)} ${f(y - h * 0.3)} C${f(x - w * 0.1)} ${f(y - h * 0.62)} ${f(x + w * 0.16)} ${f(y - h * 0.6)} ${f(x + w * 0.26)} ${f(y - h * 0.4)} C${f(x + w * 0.1)} ${f(y - h * 0.46)} ${f(x - w * 0.1)} ${f(y - h * 0.44)} ${f(x - w * 0.3)} ${f(y - h * 0.3)} Z" fill="${C.moss}"/>` +
    `<path d="M${f(x + w * 0.05)} ${f(y + h * 0.05)} l${f(w * 0.08)} ${f(h * 0.2)}" stroke="${C.fDeeper}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>`;
}

function hillBody() {
  // Stepping Hill: one big grassy hill (owner, 2026-10-07: "the stones can still be like a large hill, but proportions
  // matter"), granite outcrops, stone steps up its face, a switchback trail, a quiet pool on its shoulder with a spring
  // running down to the lake, and a lookout on the top with a spyglass pointed at the horizon. Hill units, scale 2.6.
  const base = 556;
  let o = '';
  o += `<g filter="url(#layer)"><path d="M520 ${base} C590 470 690 300 820 278 C950 300 1050 470 1110 ${base} Z" fill="#6F8A34"/>`;
  o += `<path d="M520 ${base} C590 470 690 300 820 278 C836 380 800 480 772 ${base} Z" fill="#8BA348"/></g>`;
  // Bands of meadow across its face, then grass and flowers.
  o += `<path d="M560 500 C640 470 720 468 800 476 C880 484 980 470 1080 500" stroke="#7E9A3A" stroke-width="10" fill="none" opacity="0.55"/>`;
  o += `<path d="M620 420 C690 392 760 392 830 400 C900 408 960 400 1030 420" stroke="#97AE52" stroke-width="8" fill="none" opacity="0.5"/>`;
  o += grassBlades(560, 1080, 430, 552, 90, ['#6F8A34', '#5E7A2A', '#7E9A3A'], 5, 10);
  o += grassBlades(660, 980, 320, 430, 40, ['#7E9A3A', '#8BA348', '#6F8A34'], 4, 8);
  o += flowers(26, 600, 1040, 420, 548, [C.paper, C.sand, C.dGlow], C.fLand, 0.6);
  // Granite outcrops.
  o += `<g filter="url(#layer-sm)">${boulder(764, 474, 60, 32)}${boulder(812, 506, 36, 20)}${boulder(876, 340, 46, 26)}${boulder(990, 506, 54, 28)}${boulder(640, 518, 42, 22)}</g>`;
  // Pines on its sides.
  o += `<g filter="url(#layer-sm)">${roundTree(600, 548, 1.2, [C.pine, C.pineMid, C.pineLight])}${roundTree(628, 552, 0.85, [C.pineMid, C.pine, C.pineLight])}${roundTree(1048, 548, 1.1, [C.pine, C.pineMid, C.pineLight])}${roundTree(1076, 554, 0.8, [C.pineMid, C.pineLight])}${roundTree(812, 436, 0.6, [C.pine, C.pineMid])}${roundTree(898, 470, 0.65, [C.pine, C.pineLight])}${roundTree(1010, 440, 0.5, [C.pine, C.pineMid])}</g>`;
  // Stone steps up the hill's face on a worn dirt trail, each a granite slab on its riser, with pebbles beside.
  o += `<path d="M668 552 C700 470 740 380 800 290" stroke="#C9A77A" stroke-width="30" stroke-linecap="round" fill="none" opacity="0.85"/><path d="M668 552 C700 470 740 380 800 290" stroke="#B8925F" stroke-width="30" stroke-dasharray="2 18" fill="none" opacity="0.5"/>`;
  for (let i = 0; i < 16; i += 1) {
    const k = i / 15;
    const x = 652 + 140 * k - 18 * Math.sin(k * Math.PI);
    const y = 546 - 250 * k + 20 * Math.sin(k * Math.PI);
    const w = 32 - i * 1.0;
    o += `<rect x="${f(x)}" y="${f(y + 3)}" width="${f(w)}" height="5" rx="2" fill="${C.fLand}"/><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="5" rx="2.5" fill="${C.fStone}"/><circle cx="${f(x - 3)}" cy="${f(y + 5)}" r="1.6" fill="${C.fGlow}"/><circle cx="${f(x + w + 3)}" cy="${f(y + 6)}" r="1.4" fill="${C.fLight}"/>`;
  }
  // The switchback trail with its little stacked stones and flags.
  o += `<path d="M900 552 C960 530 1000 506 960 486 C920 468 860 470 872 440 C884 410 950 400 940 372 C930 346 870 344 856 316 C848 300 836 290 826 284" fill="none" stroke="${C.paper}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 9"/>`;
  [[960, 482], [872, 436], [938, 368]].forEach(([x, y]) => { o += `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.4" fill="${C.fStone}"/><ellipse cx="${x}" cy="${y - 4}" rx="4.4" ry="2.6" fill="${C.fGlow}"/><ellipse cx="${x}" cy="${y - 7.4}" rx="2.8" ry="2" fill="${C.fStone}"/>`; });
  [[970, 470], [862, 424], [946, 356]].forEach(([x, y], i) => { o += `<path d="M${x} ${y} v-16" stroke="${C.bark}" stroke-width="2"/><path d="M${x} ${y - 16} h11 a4 4 0 0 1 0 8 h-11 Z" fill="${i % 2 ? C.paper : C.sand}" class="km-flag"/>`; });
  // The quiet pool on the shoulder, set into the slope inside the hill's edge: a lotus, a mat, a bell on a curved
  // post; the spring runs from it down the hill's face.
  o += `<g transform="translate(-70 30)">`;
  o += `<path d="M956 404 C962 396 1040 396 1046 404 L1042 410 C1020 416 980 416 960 410 Z" fill="#5E7A2A"/>`;
  o += `<g filter="url(#layer-sm)"><ellipse cx="1000" cy="402" rx="42" ry="9" fill="${C.fLand}"/><ellipse cx="998" cy="398" rx="36" ry="7" fill="${C.mereLight}"/></g><path d="M980 398 h18 M1004 400 h10" stroke="${C.paper}" stroke-width="2" stroke-linecap="round"/>`;
  o += `<path d="M990 396 c-3 -6 0 -9 3 -10 c3 1 6 4 3 10 Z M984 397 c-5 -3 -6 -7 -4 -9 c4 0 6 3 6 8 Z M1002 397 c5 -3 6 -7 4 -9 c-4 0 -6 3 -6 8 Z" fill="${C.paper}"/>`;
  o += `<rect x="950" y="398" width="22" height="6" rx="3" fill="${C.sand}"/>`;
  o += `<path d="M1034 402 V376 q0 -9 9 -9 h7" stroke="${C.bark}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M1044 378 a5.5 6 0 0 1 11 0 Z" fill="${C.dGlow}"/>`;
  o += `</g>`;
  o += `<path d="M962 434 C990 454 1024 470 1036 492 C1048 514 1052 534 1058 552" stroke="${C.mereLight}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M962 434 C990 454 1024 470 1036 492 C1048 514 1052 534 1058 552" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 14" fill="none" class="km-fall"/>`;
  // The lookout on the top: a railed platform on a granite ledge, a flag, and a spyglass at the horizon.
  o += `<g filter="url(#layer-sm)">${boulder(820, 288, 92, 24)}</g>`;
  o += `<g transform="translate(820 252)" filter="url(#layer-sm)">`;
  o += `<rect x="-26" y="0" width="52" height="7" rx="3.5" fill="${C.clay3}"/><rect x="-22" y="7" width="5" height="22" fill="${C.clay4}"/><rect x="17" y="7" width="5" height="22" fill="${C.clay4}"/><path d="M-22 20 L22 10" stroke="${C.clay4}" stroke-width="3"/>`;
  o += `<path d="M-24 0 V-16 H24 V0" stroke="${C.clay3}" stroke-width="3" fill="none"/><path d="M-12 -16 V0 M0 -16 V0 M12 -16 V0" stroke="${C.clay3}" stroke-width="2"/>`;
  o += `<path d="M-24 -16 V-56" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/><path d="M-24 -56 h22 l-6 7 l6 7 h-22 Z" fill="${C.fGlow}" class="km-flag"/>`;
  o += `<path d="M8 0 L14 -14 L20 0" stroke="${C.ink}" stroke-width="2" fill="none"/><g transform="rotate(-16 14 -16)"><rect x="4" y="-21" width="30" height="9" rx="4.5" fill="${C.clay2}"/><rect x="28" y="-23" width="9" height="13" rx="3" fill="${C.clay4}"/><rect x="0" y="-19" width="6" height="5" rx="2" fill="${C.clay4}"/></g>`;
  o += `</g>`;
  return g('id="km-hill"', o);
}

function hillFoot() {
  // The foot of the hill (land units, scale 2): grass, flowers, a running track, a sundial, a stretching post, and the
  // keeper's kit: a log bench with a coiled rope, a basket of river stones, a stone kettlebell, a water flask, a towel.
  let o = '';
  o += ridge([[420, 552], [520, 556], [640, 540], [760, 548], [880, 536], [1000, 546], [1110, 556], [1220, 548]], 760, 'url(#km-ground-1)');
  o += ridge([[420, 560], [520, 562], [660, 548], [800, 556], [940, 546], [1110, 562], [1220, 556]], 760, 'url(#km-ground-2)');
  o += grassBlades(540, 1060, 552, 628, 110, ['#6F8A34', '#5E7A2A', C.nLeafLight], 6, 14);
  o += flowers(20, 560, 1040, 556, 626, [C.paper, C.sand, C.fPale], C.fLand, 0.7);
  o += grassBlades(560, 1080, 626, 686, 80, ['#6F8A34', '#5E7A2A', C.nLeafLight], 6, 13);
  o += flowers(12, 570, 1060, 632, 684, [C.paper, C.sand, C.fPale], C.fLand, 0.7);
  o += `<ellipse cx="840" cy="566" rx="110" ry="11" fill="none" stroke="${C.paper}" stroke-width="2" stroke-dasharray="8 7" opacity="0.75"/>`;
  o += `<g transform="translate(900 572)" filter="url(#layer-sm)"><rect x="-8" y="-6" width="16" height="10" rx="2" fill="${C.fStone}"/><ellipse cx="0" cy="-8" rx="15" ry="5" fill="${C.paper}"/><path d="M0 -8 l9 -10 v10 Z" fill="${C.fDeep}"/><path d="M-12 -8 h4 M8 -8 h4" stroke="${C.inkSoft}" stroke-width="1.4"/></g>`;
  o += `<g transform="translate(960 566)"><path d="M0 0 V-46" stroke="${C.bark}" stroke-width="3.5" stroke-linecap="round"/><circle cx="0" cy="-48" r="3.5" fill="${C.fGlow}"/><path d="M0 -44 c10 4 16 12 24 10 c-6 -4 -8 -8 -12 -12" fill="${C.fGlow}" class="km-flag"/><path d="M0 -38 c8 6 12 14 20 14 c-6 -4 -6 -10 -10 -14" fill="${C.paper}" class="km-flag" style="animation-delay:-1s"/></g>`;
  o += `<g filter="url(#layer-sm)">${shadow(790, 556, 34, 3)}<rect x="758" y="536" width="64" height="9" rx="4.5" fill="${C.clay2}"/><path d="M762 540 h56" stroke="${C.clay3}" stroke-width="1.5"/><circle cx="760" cy="540.5" r="3.5" fill="${C.clay1}"/><circle cx="820" cy="540.5" r="3.5" fill="${C.clay1}"/><rect x="764" y="544" width="8" height="12" rx="3" fill="${C.clay3}"/><rect x="808" y="544" width="8" height="12" rx="3" fill="${C.clay3}"/>` +
    `<ellipse cx="782" cy="532" rx="9" ry="4" fill="none" stroke="${C.sand}" stroke-width="3"/><ellipse cx="782" cy="530" rx="5" ry="2.4" fill="none" stroke="${C.sand}" stroke-width="2.5"/><path d="M791 532 c6 0 8 4 4 8" stroke="${C.sand}" stroke-width="2.5" fill="none"/>` +
    `<path d="M832 554 h22 l-3 -14 h-16 Z" fill="${C.clay2}"/><path d="M834 548 h18" stroke="${C.clay3}" stroke-width="1.5"/><ellipse cx="838" cy="538" rx="5" ry="3.6" fill="${C.fGlow}"/><ellipse cx="847" cy="537" rx="5" ry="3.6" fill="${C.fLight}"/><ellipse cx="842" cy="534" rx="4" ry="3" fill="${C.fStone}"/></g>`;
  o += `<g filter="url(#layer-sm)">${shadow(734, 572, 16, 3)}<path d="M726 554 a8 8 0 0 1 16 0" stroke="${C.sand}" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="734" cy="564" rx="13" ry="10" fill="${C.fLand}"/><path d="M724 560 c4 -5 12 -6 18 -3" stroke="${C.fLight}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  o += `${shadow(866, 558, 8, 2)}<rect x="860" y="536" width="12" height="22" rx="5" fill="${C.fGlow}"/><rect x="862" y="530" width="8" height="7" rx="2" fill="${C.clay2}"/><rect x="860" y="544" width="12" height="4" fill="${C.paper}"/>`;
  o += `<path d="M786 536 h22 l-2 -5 h-18 Z" fill="${C.paper}"/><path d="M788 533 h18" stroke="${C.fGlow}" stroke-width="2"/></g>`;
  return g('id="km-hill-foot"', o);
}

/* ------------------------------------------------------------------ the Orchard (nutrition), to the left (land units) */
function tree(x, base, h, rad, leaves, fruit, fruitShape) {
  let o = shadow(x, base + 2, f(rad * 0.7), 5);
  o += `<path d="M${x - 8} ${base} c3 -2 4 -6 2 -10 M${x + 8} ${base} c-3 -2 -4 -6 -2 -10" stroke="${C.bark}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M${x - 6} ${base} C${x - 5} ${base - h * 0.5} ${x - 3} ${base - h * 0.8} ${x - 1} ${base - h} H${x + 2} C${x + 4} ${base - h * 0.8} ${x + 6} ${base - h * 0.5} ${x + 7} ${base} Z" fill="${C.bark}"/>`;
  o += `<path d="M${x - 2} ${base - h * 0.3} q-2 -6 1 -12 M${x + 3} ${base - h * 0.5} q2 -5 0 -10" stroke="#57391F" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  o += `<path d="M${x} ${base - h * 0.55} c-10 -8 -18 -10 -24 -20 M${x + 1} ${base - h * 0.7} c10 -6 16 -10 22 -18" stroke="${C.bark}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  const cy = base - h - rad * 0.4;
  const blobs = [];
  for (let i = 0; i < 9; i += 1) blobs.push([x + r(-rad * 0.75, rad * 0.75), cy + r(-rad * 0.6, rad * 0.5), r(rad * 0.38, rad * 0.6)]);
  blobs.sort((a, b) => a[1] - b[1]);
  o += `<circle cx="${x}" cy="${f(cy + 6)}" r="${f(rad * 0.95)}" fill="${leaves[0]}"/>`;
  blobs.forEach(([bx, by, br], i) => { o += `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(br)}" fill="${leaves[1 + (i % (leaves.length - 1))]}"/>`; });
  for (let i = 0; i < 4; i += 1) o += `<path d="M${f(x + r(-rad * 0.6, rad * 0.6))} ${f(cy + r(-rad * 0.5, rad * 0.3))} q4 -6 9 -2" stroke="${leaves[0]}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 16; i += 1) {
    const fx = x + r(-rad * 0.8, rad * 0.8);
    const fy = cy + r(-rad * 0.55, rad * 0.65);
    const k = 0.8;
    if (fruitShape === 'avocado') o += `<g transform="translate(${f(fx)} ${f(fy)}) scale(${k})"><path d="M0 -12 v5" stroke="${C.bark}" stroke-width="1.4"/><path d="M0 -8 c4 0 4 5 3 7 c5 3 6 10 0 11 c-2 0.7 -4 0.7 -6 0 c-6 -1 -5 -8 0 -11 c-1 -2 -1 -7 3 -7 Z" fill="#3E4A14"/><path d="M-3 -1 c-2 3 -2 6 0 8" stroke="${C.nLeafLight}" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`;
    else o += `<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(r(5, 7))}" fill="${fruit}"/><circle cx="${f(fx - 2)}" cy="${f(fy - 2)}" r="1.8" fill="${C.paper}" opacity="0.7"/>`;
  }
  for (let i = 0; i < 16; i += 1) { const lx = x + r(-rad * 0.95, rad * 0.95); const ly = cy + r(-rad * 0.8, rad * 0.6); const a = r(-60, 60); o += `<path d="M0 0 C4 -6 14 -8 22 -6 C16 0 6 2 0 0 Z" fill="${pick(leaves)}" transform="translate(${f(lx)} ${f(ly)}) rotate(${f(a)}) scale(0.7)"/>`; }
  return o;
}

const STRING = { x0: 150, y0: 404, cx: 330, cy: 476, x1: 505, y1: 444, n: 15 };
function stringPoint(t) {
  const { x0, y0, cx, cy, x1, y1 } = STRING;
  return [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
}

function orchard() {
  let o = '';
  // The hill: three terraces held by stone walls, rising to the left.
  o += `<g filter="url(#layer)">`;
  o += ridge([[0, 420], [120, 404], [240, 430], [330, 470], [460, 506], [600, 530], [700, 540]], 760, 'url(#km-fade-orchard-1)');
  o += ridge([[0, 430], [120, 416], [230, 440], [330, 478], [460, 512], [600, 536], [700, 546]], 760, 'url(#km-fade-orchard-2)');
  o += `</g>`;
  o += grassBlades(0, 330, 430, 466, 40, [C.nLand, C.nLeaf, '#5F6C18'], 4, 9);
  o += undergrowth(10, 300, 436, 466, 18);
  o += `<path d="M0 470 C80 466 180 470 250 478" stroke="${C.nLand}" stroke-width="10" fill="none"/>${stones(0, 250, 474, 5, [C.cream, C.creamDeep, '#D8D1BC'])}`;
  o += `<path d="M0 470 C80 466 180 470 250 478 L250 488 C180 482 80 478 0 482 Z" fill="${C.nLeaf}"/>`;
  o += `<path d="M0 512 C120 508 260 512 360 520" stroke="${C.nLand}" stroke-width="10" fill="none"/>${stones(0, 360, 516, 5.5, [C.cream, C.creamDeep, '#D8D1BC'])}`;
  o += `<path d="M0 512 C120 508 260 512 360 520 L360 530 C260 524 120 520 0 524 Z" fill="${C.nLeaf}"/>`;
  // Top terrace: the big avocado tree, a young avocado on a stake, the straw beehive with bees.
  o += `<g filter="url(#layer-sm)">${tree(120, 462, 66, 58, ['#3E4A14', C.nLand, C.nLeaf, '#5F6C18'], C.nGlow, 'avocado')}</g>`;
  o += `<g filter="url(#layer-sm)"><rect x="34" y="420" width="4" height="46" rx="2" fill="${C.clay3}"/>${tree(44, 466, 30, 22, [C.nLand, C.nLeaf, C.nLeafLight], C.nGlow, 'avocado')}<path d="M36 446 l8 2" stroke="${C.cream}" stroke-width="2"/></g>`;
  o += `<g filter="url(#layer-sm)" transform="translate(212 452)">${shadow(0, 18, 18, 3)}<path d="M-16 18 C-18 0 -8 -14 0 -14 C8 -14 18 0 16 18 Z" fill="${C.dGlow}"/>`;
  for (let i = 0; i < 4; i += 1) o += `<path d="M${-16 + i * 1.5} ${f(14 - i * 7)} H${16 - i * 1.5}" stroke="${C.nGlowDeep}" stroke-width="2"/>`;
  o += `<path d="M-4 18 a4 5 0 0 1 8 0" fill="${C.clay4}"/><rect x="-20" y="18" width="40" height="5" rx="2.5" fill="${C.clay3}"/></g>`;
  [[236, 424], [248, 436], [226, 414]].forEach(([x, y], i) => { o += `<g class="km-buzz km-day-only" style="animation-delay:-${i}s"><ellipse cx="${x}" cy="${y}" rx="2.4" ry="1.8" fill="#E9C24A"/><path d="M${x - 0.6} ${y - 1.8} v3.6 M${x + 0.9} ${y - 1.8} v3.6" stroke="${C.ink}" stroke-width="0.8"/><ellipse cx="${x}" cy="${y - 2.4}" rx="1.8" ry="1.2" fill="${C.paper}" opacity="0.85"/></g>`; });
  // Middle terrace: the larder door dug into the hill, with a lamp over it and jars on a shelf beside it.
  o += `<g filter="url(#layer-sm)"><path d="M262 506 V478 a20 20 0 0 1 40 0 V506 Z" fill="${C.clay3}"/><path d="M272 506 V474 M282 506 V460 M292 506 V474" stroke="${C.clay4}" stroke-width="2"/>`;
  o += `<path d="M264 484 h16 M264 498 h16" stroke="${C.bark}" stroke-width="3" stroke-linecap="round"/><circle cx="294" cy="492" r="2.6" fill="${C.nGlow}"/><circle cx="282" cy="452" r="4" fill="#FFE9B0" stroke="${C.clay4}" stroke-width="1.2"/><path d="M282 448 v-6" stroke="${C.ink}" stroke-width="1.2"/>`;
  o += `<path d="M258 508 a26 30 0 0 1 48 0" stroke="${C.cream}" stroke-width="6" fill="none"/>${stones(258, 308, 508, 3.5, [C.cream, C.creamDeep])}`;
  o += `<rect x="312" y="490" width="40" height="4" rx="2" fill="${C.clay4}"/>`;
  [[318, '#D9CF62'], [330, C.nGlow], [342, '#B7C46A']].forEach(([x, col]) => { o += `<rect x="${x - 4}" y="478" width="9" height="12" rx="2.5" fill="${col}"/><rect x="${x - 4}" y="476" width="9" height="3" rx="1.5" fill="${C.cream}"/>`; });
  o += `</g>`;
  // The second avocado tree and its ladder, with a basket of avocados at the foot.
  o += `<g filter="url(#layer-sm)">${tree(520, 528, 86, 50, ['#3E4A14', '#5F6C18', C.nLand, C.nLeaf], '#3E4A14', 'avocado')}</g>`;
  o += `<g filter="url(#layer-sm)"><path d="M482 540 L516 446 M496 544 L530 450" stroke="${C.clay2}" stroke-width="4" stroke-linecap="round"/>`;
  for (let i = 0; i < 7; i += 1) { const t = 0.1 + i * 0.13; o += `<path d="M${f(482 + 34 * t)} ${f(540 - 94 * t)} L${f(496 + 34 * t)} ${f(544 - 94 * t)}" stroke="${C.clay3}" stroke-width="3" stroke-linecap="round"/>`; }
  o += `${shadow(474, 556, 18, 2.5)}<path d="M460 538 h28 l-3 16 h-22 Z" fill="${C.clay2}"/><path d="M462 543 h24 M463 548 h22" stroke="${C.clay3}" stroke-width="1.5"/><path d="M463 538 a11 9 0 0 1 22 0" stroke="${C.clay3}" stroke-width="2.4" fill="none"/>`;
  o += `<ellipse cx="468" cy="535" rx="4" ry="5.4" fill="#3E4A14" transform="rotate(-20 468 535)"/><ellipse cx="476" cy="533" rx="4" ry="5.4" fill="#3E4A14"/><ellipse cx="483" cy="535" rx="4" ry="5.4" fill="#525C12" transform="rotate(20 483 535)"/></g>`;
  // The string of paper lights from the big tree to the second, over the long table.
  const { x0, y0, cx, cy, x1, y1, n } = STRING;
  o += `<path d="M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}" stroke="${C.ink}" stroke-width="0.9" fill="none" opacity="0.7"/>`;
  for (let i = 1; i < n; i += 1) {
    const [bx, by] = stringPoint(i / n);
    o += `<rect x="${f(bx - 0.9)}" y="${f(by)}" width="1.8" height="2" fill="${C.ink}"/><path d="M${f(bx)} ${f(by + 1.6)} c2.6 0 3 3 2.2 5 c-0.6 1.4 -3.8 1.4 -4.4 0 c-0.8 -2 -0.4 -5 2.2 -5 Z" fill="${C.bulb}"/>`;
  }
  // Front: the vegetable patch, the herb spiral, a watering can and a rabbit at the lettuces.
  for (let i = 0; i < 7; i += 1) { const x = 30 + i * 16; o += `<circle cx="${x}" cy="566" r="5.6" fill="#8FAF4A"/><circle cx="${x}" cy="566" r="3.5" fill="#B5CC6A"/><circle cx="${x}" cy="566" r="1.4" fill="#D6E39A"/>`; }
  for (let i = 0; i < 9; i += 1) { const x = 36 + i * 12; o += `<path d="M${x} 584 l-3.5 -7 M${x} 584 l0 -8.5 M${x} 584 l3.5 -7" stroke="${C.nLeaf}" stroke-width="1.6" stroke-linecap="round"/><path d="M${x - 2} 585 h4 l-2 3.5 Z" fill="${C.nGlowDeep}"/>`; }
  o += `<path d="M24 592 h130" stroke="${C.clay3}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`;
  o += `<g class="km-day-only" transform="translate(150 562)">${shadow(0, 8, 7, 1.4)}<ellipse cx="0" cy="3" rx="6" ry="4.4" fill="${C.creamDeep}"/><circle cx="5" cy="-1" r="3.2" fill="${C.creamDeep}"/><ellipse cx="4.4" cy="-6" rx="1" ry="3.4" fill="${C.creamDeep}" transform="rotate(-12 4.4 -6)"/><ellipse cx="6.6" cy="-6" rx="1" ry="3.4" fill="${C.creamDeep}" transform="rotate(14 6.6 -6)"/><circle cx="6.4" cy="-1.4" r="0.7" fill="${C.ink}"/><circle cx="-5.6" cy="3" r="1.6" fill="${C.paper}"/></g>`;
  for (let i = 0; i < 16; i += 1) { const a = i * 0.7; const rr = 2 + i * 0.9; o += `<ellipse cx="${f(196 + Math.cos(a) * rr)}" cy="${f(578 + Math.sin(a) * rr * 0.4)}" rx="2.4" ry="1.8" fill="${C.cream}"/>`; }
  for (let i = 0; i < 12; i += 1) { const a = i * 1.3; const rr = 3 + i * 1.3; o += `<path d="M${f(196 + Math.cos(a) * rr)} ${f(576 + Math.sin(a) * rr * 0.4)} v-5 m0 2 l-2 -2 m2 1 l2 -2" stroke="${pick([C.nLand, C.nLeaf, '#8FAF4A'])}" stroke-width="1.2" stroke-linecap="round" fill="none"/>`; }
  o += `<g transform="translate(166 552) scale(0.7)">${shadow(8, 18, 14, 2.5)}<path d="M0 6 h18 v12 h-18 Z" fill="${C.mere}"/><path d="M18 9 l12 -8" stroke="${C.mere}" stroke-width="3" stroke-linecap="round"/><path d="M2 6 a7 7 0 0 1 14 0" stroke="${C.mere}" stroke-width="2.5" fill="none"/></g>`;
  // The long kitchen table: gingham cloth, bench, bread, salad, blueberries, honey, a board, plates.
  o += `<g filter="url(#layer-sm)">${shadow(424, 578, 80, 5)}`;
  o += `<rect x="352" y="562" width="124" height="7" rx="3.5" fill="${C.clay3}"/><rect x="358" y="568" width="6" height="12" rx="3" fill="${C.clay4}"/><rect x="464" y="568" width="6" height="12" rx="3" fill="${C.clay4}"/>`;
  o += `<rect x="350" y="534" width="148" height="10" rx="5" fill="${C.paper}"/>`;
  let cloth = `<path d="M350 538 H498 V554 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -12 0 q-6 6 -4 0 Z" fill="${C.paper}"/>`;
  for (let x = 350; x < 498; x += 12) cloth += `<rect x="${x}" y="538" width="6" height="16" fill="${C.nSky}"/>`;
  for (let y = 540; y < 554; y += 8) cloth += `<rect x="350" y="${y}" width="148" height="4" fill="${C.nGlow}" opacity="0.35"/>`;
  o += cloth;
  o += `<rect x="356" y="554" width="5" height="22" rx="2.5" fill="${C.clay4}"/><rect x="488" y="554" width="5" height="22" rx="2.5" fill="${C.clay4}"/>`;
  o += `<ellipse cx="422" cy="534" rx="14" ry="3" fill="${C.creamDeep}"/><ellipse cx="462" cy="534" rx="12" ry="3" fill="${C.creamDeep}"/>`;
  o += `<rect x="404" y="522" width="34" height="11" rx="4" fill="${C.clay2}"/><rect x="406" y="520" width="30" height="7" rx="3.5" fill="#E9C08A"/><path d="M407 521 c4 -4 8 2 12 -2 c4 -3 8 2 12 -1 c3 -2 5 1 5 2 v3 h-29 Z" fill="#B9CC5A"/><circle cx="414" cy="521" r="1.2" fill="${C.paper}"/><circle cx="424" cy="520" r="1.2" fill="${C.fLand}" opacity="0.6"/><circle cx="431" cy="521" r="1" fill="${C.nDark}"/>`;
  o += `<ellipse cx="460" cy="533" rx="16" ry="3.4" fill="${C.creamDeep}"/><g transform="rotate(-14 452 526)"><path d="M452 516 c5 0 6 5 5 8 c6 3 7 10 0 12 c-3 1 -7 1 -10 0 c-7 -2 -6 -9 0 -12 c-1 -3 0 -8 5 -8 Z" fill="#3E4A14"/><path d="M452 519 c3 0 4 4 3 6 c4 2 5 7 0 8 c-2 0.6 -5 0.6 -7 0 c-5 -1 -4 -6 0 -8 c-1 -2 0 -6 4 -6 Z" fill="#D7E08A"/><circle cx="452" cy="529" r="4" fill="${C.clay4}"/></g><g transform="rotate(16 468 526)"><path d="M468 516 c5 0 6 5 5 8 c6 3 7 10 0 12 c-3 1 -7 1 -10 0 c-7 -2 -6 -9 0 -12 c-1 -3 0 -8 5 -8 Z" fill="#3E4A14"/><path d="M468 519 c3 0 4 4 3 6 c4 2 5 7 0 8 c-2 0.6 -5 0.6 -7 0 c-5 -1 -4 -6 0 -8 c-1 -2 0 -6 4 -6 Z" fill="#D7E08A"/><ellipse cx="468" cy="529" rx="3" ry="3.6" fill="#C7D27A"/></g>`;
  o += `<path d="M478 532 a8 6 0 0 0 16 0 Z" fill="${C.paper}"/><circle cx="482" cy="529" r="2.4" fill="#4A5FA0"/><circle cx="487" cy="528" r="2.4" fill="#4A5FA0"/><circle cx="491" cy="530" r="2.2" fill="#4A5FA0"/>`;
  o += `<rect x="382" y="520" width="12" height="14" rx="3" fill="${C.dGlow}"/><rect x="381" y="517" width="14" height="4" rx="2" fill="${C.creamDeep}"/><path d="M384 526 h8" stroke="${C.nGlowDeep}" stroke-width="1.5"/>`;
  o += `</g>`;
  // The nutrition keeper's kettle on the table: apricot, a curled spout, steam. No flame.
  o += `<g transform="translate(366 516) scale(0.6)" filter="url(#layer-sm)"><path d="M-16 28 C-26 26 -30 18 -26 12 C-24 18 -20 22 -12 22 Z" fill="${C.nGlow}"/><ellipse cx="4" cy="28" rx="20" ry="16" fill="${C.nGlow}"/><path d="M-10 36 a20 10 0 0 0 28 0" fill="${C.nGlowDeep}" opacity="0.45"/><rect x="-4" y="9" width="16" height="6" rx="3" fill="${C.nGlowDeep}"/><circle cx="4" cy="8" r="3.5" fill="${C.nGlowDeep}"/><path d="M22 20 C32 20 32 36 22 36" stroke="${C.nGlowDeep}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="-4" cy="22" r="3" fill="${C.paper}" opacity="0.6"/></g>`;
  o += `<g class="km-steam"><path d="M352 524 c-4 -5 4 -8 0 -13 c-4 -5 4 -8 0 -13" stroke="${C.paper}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M357 521 c-3 -4 3 -6 0 -10" stroke="${C.paper}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/></g>`;
  // A picnic blanket in the grass with a basket, a jug and a bowl of fruit.
  o += `<g transform="translate(230 600)" filter="url(#layer-sm)"><path d="M-44 -8 L40 -12 L50 10 L-36 14 Z" fill="${C.paper}"/>`;
  for (let i = 0; i < 7; i += 1) o += `<path d="M${-40 + i * 13} -9 L${-33 + i * 13} 13" stroke="${C.kindle}" stroke-width="4" opacity="0.5"/>`;
  o += `<path d="M-42 -2 L44 -6 M-39 6 L47 3" stroke="${C.kindle}" stroke-width="4" opacity="0.4"/>`;
  o += `<path d="M-24 -4 h20 l-2 -10 h-16 Z" fill="${C.clay2}"/><path d="M-22 -14 a8 7 0 0 1 16 0" stroke="${C.clay3}" stroke-width="2" fill="none"/><path d="M-22 -9 h16" stroke="${C.clay3}" stroke-width="1.2"/>`;
  o += `<rect x="8" y="-14" width="8" height="11" rx="3" fill="${C.mereLight}"/><path d="M16 -11 c3 0 3 5 0 5" stroke="${C.mereLight}" stroke-width="1.6" fill="none"/>`;
  o += `<path d="M22 -2 a7 4 0 0 0 14 0 Z" fill="${C.cream}"/><circle cx="26" cy="-4" r="2.4" fill="${C.kindle}"/><circle cx="31" cy="-4.4" r="2.2" fill="#D9CF62"/><circle cx="28.4" cy="-6.2" r="2" fill="${C.nLeafPale}"/></g>`;
  o += grassBlades(0, 600, 590, 630, 80, [C.nLand, C.nLeaf, '#5F6C18'], 6, 12);
  o += grassBlades(0, 240, 482, 500, 30, [C.nLand, C.nLeaf], 5, 9);
  o += grassBlades(250, 560, 540, 590, 50, [C.nLeaf, '#5F6C18', C.nLeafLight], 5, 10);
  o += flowers(20, 10, 560, 590, 624, [C.paper, C.nGlow, '#F2D27A'], C.nGlowDeep, 0.8);
  o += grassBlades(0, 600, 626, 684, 90, [C.nLand, C.nLeaf, '#5F6C18', C.nLeafLight], 6, 13);
  o += flowers(16, 10, 580, 632, 682, [C.paper, C.nGlow, '#F2D27A'], C.nGlowDeep, 0.8);
  o += undergrowth(20, 580, 640, 680, 10);
  o += flowers(10, 10, 330, 484, 520, [C.paper, C.nGlow], C.nGlowDeep, 0.7);
  return g('id="km-orchard"', o);
}

/* ------------------------------------------------------------------ Lakeside Field (dog-training), to the right */
const KENNEL = [1076, 496]; // land units; the door is at local 18..42 x 44..60

function field() {
  // Lakeside Field: open grass running down to the lake bay, a split-rail fence, the dog house, weave poles, a willow
  // hoop, flags with paw prints, toys, and paw prints running into the water.
  let o = '';
  o += `<g filter="url(#layer)">`;
  o += ridge([[920, 552], [1020, 540], [1140, 524], [1280, 530], [1440, 512], [1600, 520]], 760, 'url(#km-fade-field-1)');
  o += ridge([[920, 558], [1020, 546], [1140, 532], [1280, 536], [1440, 520], [1600, 528]], 760, 'url(#km-fade-field-2)');
  o += `</g>`;
  // A row of trees along the far side of the field.
  for (let i = 0; i < 9; i += 1) { const x = 1150 + i * 52 + r(-10, 10); o += `<g filter="url(#layer-sm)">${roundTree(x, 522 - (i % 2) * 4, 0.7 + r(0, 0.2), [C.pineMid, C.pineLight, '#5E8A52'])}</g>`; }
  for (let i = 0; i < 9; i += 1) o += `<rect x="${1060 + i * 60}" y="${f(500 - (i % 3) * 3)}" width="5" height="34" rx="2.5" fill="${C.dRusset}"/>`;
  o += `<path d="M1058 508 C1200 500 1360 492 1590 498 M1058 520 C1200 512 1360 504 1590 510" stroke="${C.dTan}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  // The dog house: a pitched roof of shingles, a name board, a round door, a water bowl.
  o += `<g filter="url(#layer-sm)" transform="translate(${KENNEL[0]} ${KENNEL[1]})">${shadow(30, 62, 44, 4)}<path d="M0 60 V24 L30 4 L60 24 V60 Z" fill="${C.dSky}"/><path d="M4 30 h52 M4 40 h52 M4 50 h52" stroke="#C8D98C" stroke-width="1.4"/><path d="M-6 26 L30 0 L66 26" stroke="${C.dLand}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  for (let i = 0; i < 4; i += 1) o += `<path d="M${4 + i * 8} ${20 - i * 5} l8 6 M${56 - i * 8} ${20 - i * 5} l-8 6" stroke="${C.dRusset}" stroke-width="2"/>`;
  o += `<path d="M18 60 V44 a12 12 0 0 1 24 0 V60 Z" fill="${C.dDark}"/><rect x="22" y="28" width="16" height="6" rx="3" fill="${C.paper}"/><path d="M26 31 h8" stroke="${C.dTan}" stroke-width="1.5"/>`;
  o += `<ellipse cx="76" cy="60" rx="8" ry="3.2" fill="${C.fGlow}"/><ellipse cx="76" cy="58.6" rx="5.6" ry="2" fill="${C.mereLight}"/><path d="M-4 60 h8 l-1 -3 h-6 Z" fill="${C.dTan}"/></g>`;
  for (let i = 0; i < 6; i += 1) {
    const x = 1392 + i * 14;
    o += `<g filter="url(#layer-sm)"><rect x="${x}" y="${500 + (i % 2) * 2}" width="4" height="46" rx="2" fill="${C.paper}"/>`;
    for (let k = 0; k < 3; k += 1) o += `<rect x="${x}" y="${506 + k * 13 + (i % 2) * 2}" width="4" height="5" fill="${C.dLand}"/>`;
    o += `</g>`;
  }
  o += `${shadow(1516, 552, 36, 3)}<path d="M1484 550 V516 a32 32 0 0 1 64 0 V550" stroke="${C.dRusset}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M1484 550 V516 a32 32 0 0 1 64 0 V550" stroke="${C.dGlow}" stroke-width="7" stroke-dasharray="4 7" fill="none"/>`;
  [[1100, 612, C.paper], [1160, 610, C.dGlow], [1230, 606, C.paper]].forEach(([x, y, col], i) => {
    o += `<path d="M${x} ${y} v-20" stroke="${C.dLand}" stroke-width="1.6"/><path d="M${x} ${y - 20} h12 a4.5 4.5 0 0 1 0 9 h-12 Z" fill="${col}" class="km-flag" style="animation-delay:-${i * 0.6}s"/>`;
    o += `<g fill="${C.dLand}"><ellipse cx="${x + 6}" cy="${y - 14.6}" rx="1.6" ry="1.3"/><circle cx="${x + 4.2}" cy="${y - 17.2}" r="0.8"/><circle cx="${x + 6}" cy="${y - 17.8}" r="0.8"/><circle cx="${x + 7.8}" cy="${y - 17.2}" r="0.8"/></g>`;
  });
  for (let i = 0; i < 10; i += 1) { const x = 1250 + i * 12; const y = shoreY(x) - 6 - (i % 2) * 3; o += `<g fill="${C.dGrassDark}" opacity="0.75"><ellipse cx="${f(x)}" cy="${f(y)}" rx="1.8" ry="1.4"/><circle cx="${f(x - 1.8)}" cy="${f(y - 2.1)}" r="0.8"/><circle cx="${f(x)}" cy="${f(y - 2.7)}" r="0.8"/><circle cx="${f(x + 1.8)}" cy="${f(y - 2.1)}" r="0.8"/></g>`; }
  o += `<g filter="url(#layer-sm)"><ellipse cx="1316" cy="578" rx="9" ry="3.2" fill="${C.fGlow}"/><ellipse cx="1316" cy="577.4" rx="6" ry="2" fill="none" stroke="${C.paper}" stroke-width="1"/>` +
    `<path d="M1170 588 c6 -4 12 2 18 -1 c5 -2 9 1 11 0" stroke="${C.dGlow}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M1170 588 c6 -4 12 2 18 -1 c5 -2 9 1 11 0" stroke="${C.dLand}" stroke-width="3" stroke-dasharray="2 3" fill="none"/><circle cx="1167" cy="588.6" r="3" fill="${C.dLand}"/><circle cx="1202" cy="587" r="3" fill="${C.dLand}"/>` +
    `<circle cx="1372" cy="566" r="3.4" fill="#D8E04A"/><path d="M1369.6 564.8 q2.4 1.8 4.8 0" stroke="${C.paper}" stroke-width="0.8" fill="none"/></g>`;
  o += grassBlades(1030, 1600, 540, 600, 150, [C.dGrassDeep, C.dGrassDark, '#8FAE3A'], 8, 18);
  o += flowers(30, 1040, 1590, 540, 596, [C.paper, C.dGlow, C.paper, '#F2D27A'], C.dGlow, 0.8);
  o += grassBlades(1030, 1600, 598, 660, 90, [C.dGrassDeep, C.dGrassDark, '#8FAE3A'], 8, 16);
  o += flowers(16, 1040, 1590, 600, 656, [C.paper, C.dGlow, '#F2D27A'], C.dGlow, 0.8);
  return g('id="km-field"', o);
}

/* ------------------------------------------------------------------ the bank, the paths and the signpost */
function bank() {
  // The land's edge, cut like a slice of earth that follows the shore: a grass lip, soil in layers, roots, stones.
  let o = '';
  o += shoreBand(-4, 740, '#5E7A2A', 2);
  o += shoreBand(4, 740, '#7E6A3A');
  o += shoreBand(14, 740, C.clay3, 1.5);
  o += shoreBand(26, 740, C.clay4, 1.5);
  o += shoreBand(36, 740, C.bark, 1);
  for (let i = 0; i < 90; i += 1) { const x = r(0, 1600); o += `<ellipse cx="${f(x)}" cy="${f(shoreY(x) + r(12, 38))}" rx="${f(r(2, 5))}" ry="${f(r(1.4, 2.4))}" fill="${pick([C.creamDeep, '#D8D1BC', C.clay1])}" opacity="0.9"/>`; }
  for (let i = 0; i < 60; i += 1) { const x = r(0, 1600); const y = shoreY(x) + 6; const len = r(6, 18); o += `<path d="M${f(x)} ${f(y)} c${f(r(-3, 3))} ${f(len * 0.4)} ${f(r(-5, 5))} ${f(len * 0.7)} ${f(r(-3, 3))} ${f(len)}" stroke="${C.dDark}" stroke-width="${f(r(0.8, 1.5))}" stroke-linecap="round" fill="none" opacity="0.8"/>`; }
  return g('id="km-bank"', o);
}

function paths() {
  // Paths of light stitched into the ground: from each place to the signpost, and from the signpost down to the shore.
  const stitch = (d, delay) => `<path d="${d}" stroke="#E8D7B4" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.9"/>` +
    `<path d="${d}" stroke="${C.paper}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="0.1 10" fill="none"/>` +
    `<path d="${d}" stroke="#FFF7D6" stroke-width="6" stroke-linecap="round" stroke-dasharray="0.1 140" fill="none" class="km-light" style="animation-delay:-${delay}s"/>`;
  let o = '';
  o += stitch('M500 582 C600 590 700 600 782 608', 0);
  o += stitch('M690 572 C720 588 760 600 790 606', 1.5);
  o += stitch('M1180 590 C1060 598 920 604 818 608', 3);
  o += stitch('M800 612 C800 640 798 668 796 696', 4.5);
  // The spring from the hill's pool runs down to the lake, under a little bridge on the Field path.
  const spring = 'M1131 551 C1134 571 1126 588 1130 604 C1134 628 1128 664 1134 718';
  o += `<path d="${spring}" stroke="${C.mere}" stroke-width="10" stroke-linecap="round" fill="none"/>`;
  o += `<path d="${spring}" stroke="${C.mereLight}" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 10" fill="none" class="km-fall"/>`;
  o += `<g transform="translate(1130 594) scale(0.8)" filter="url(#layer-sm)"><path d="M-26 6 C-14 -8 14 -8 26 6" stroke="${C.clay3}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M-22 4 V-8 M-8 -2 V-14 M8 -2 V-14 M22 4 V-8" stroke="${C.clay4}" stroke-width="3" stroke-linecap="round"/><path d="M-22 -8 C-10 -18 10 -18 22 -8" stroke="${C.clay4}" stroke-width="3" fill="none"/></g>`;
  return g('id="km-paths"', o);
}

function signpost() {
  // The signpost at the crossroads: an arrow to each place, and one across the water to Louise.
  const arm = (y, dir, w, fill, text, tcol) => {
    const tip = dir > 0 ? `M0 ${y} h${w} l10 9 l-10 9 h-${w} Z` : `M0 ${y} h-${w} l-10 9 l10 9 h${w} Z`;
    const tx = dir > 0 ? w / 2 + 2 : -w / 2 - 2;
    return `<path d="${tip}" fill="${fill}"/><text x="${tx}" y="${y + 12.5}" text-anchor="middle" font-family="Candara, 'Gill Sans', 'Trebuchet MS', sans-serif" font-size="11" font-weight="700" fill="${tcol}">${text}</text>`;
  };
  let o = `<ellipse cx="800" cy="614" rx="40" ry="9" fill="#E8D7B4"/>` + stones(764, 836, 616, 2.5, [C.creamDeep, '#D8D1BC', C.cream]) + `<g transform="translate(800 540) scale(0.7)" filter="url(#layer-sm)">${shadow(0, 108, 18, 4)}`;
  o += `<rect x="-4" y="0" width="8" height="108" rx="4" fill="${C.clay3}"/><rect x="-6" y="-6" width="12" height="8" rx="4" fill="${C.clay4}"/>`;
  o += `<g transform="rotate(-3)">${arm(6, -1, 62, C.nLand, 'Orchard', C.paper)}</g>`;
  o += `<g transform="rotate(-8)">${arm(26, -1, 52, C.fLand, 'Hill', C.paper)}</g>`;
  o += `<g transform="rotate(-2)">${arm(46, 1, 60, C.dLand, 'Field', C.paper)}</g>`;
  o += `<g transform="rotate(3)">${arm(66, 1, 58, C.mere, 'Louise', C.paper)}</g>`;
  o += `<path d="M-14 108 c4 -8 10 -8 14 0 c4 -8 10 -8 14 0" fill="${C.dGrassDeep}"/>`;
  o += `</g>`;
  return g('id="km-signpost"', o);
}

/* ------------------------------------------------------------------ the lake and the shore */
function lake() {
  let o = shoreBand(40, 900, C.mere);
  o += `<path d="M640 728 C700 790 780 880 820 900 C860 880 940 790 1000 728 Z" fill="#6F8A34" opacity="0.2" mask="url(#km-ripples)"/>`;
  o += `<path d="M0 728 C120 756 260 746 560 728 Z" fill="${C.nLand}" opacity="0.2" mask="url(#km-ripples)"/>`;
  o += band(0, 1600, 770, 5, 80, 900, C.mereMid);
  o += band(0, 1600, 816, 6, 90, 900, '#19495A');
  o += band(0, 1600, 862, 6, 100, 900, C.mereDeep);
  for (let i = 0; i < 110; i += 1) {
    const x = r(0, 1580);
    const y = r(shoreY(x) + 50, 894);
    const w = r(8, 34) * (0.5 + (y - 700) / 200);
    o += `<path d="M${f(x)} ${f(y)} h${f(w)}" stroke="${C.mereLight}" stroke-width="${f(r(1.2, 2.2))}" stroke-linecap="round" opacity="${f(r(0.25, 0.6))}"/>`;
  }
  [[220, 846, 0.7], [250, 862, 0.55], [1040, 862, 0.6], [1076, 880, 0.5], [560, 882, 0.6], [1540, 724, 0.5], [120, 800, 0.45]].forEach(([x, y, s]) => {
    o += `<path d="M${x} ${y} m${-22 * s} 0 a${22 * s} ${9 * s} 0 1 0 ${44 * s} 0 a${22 * s} ${9 * s} 0 0 0 ${-18 * s} ${-8 * s} l${-4 * s} ${8 * s} Z" fill="#4E7F3A"/>`;
    o += `<path d="M${x - 14 * s} ${y + 2 * s} a${14 * s} ${5 * s} 0 0 0 ${26 * s} 0" stroke="#6E9A4E" stroke-width="1.4" fill="none"/>`;
  });
  o += flower(232, 842, C.paper, C.nGlow, 2.2) + flower(1052, 858, C.paper, C.dGlow, 2);
  // A frog on a lily pad, and a paper duck keeping an eye on the dog.
  o += `<g transform="translate(1046 870) scale(0.55)" class="km-day-only"><ellipse cx="0" cy="0" rx="9" ry="6" fill="#5E8A3A"/><circle cx="-5" cy="-6" r="3.4" fill="#5E8A3A"/><circle cx="5" cy="-6" r="3.4" fill="#5E8A3A"/><circle cx="-5" cy="-6.4" r="1.6" fill="${C.ink}"/><circle cx="5" cy="-6.4" r="1.6" fill="${C.ink}"/><path d="M-4 1 q4 3 8 0" stroke="${C.ink}" stroke-width="1.2" fill="none"/></g>`;
  for (let i = 0; i < 12; i += 1) { const x = 1556 + i * 3.6; const y = shoreY(x) + 44; const h = r(18, 32); o += `<path d="M${f(x)} ${f(y)} q${f(r(-2, 2))} ${f(-h / 2)} ${f(r(-3, 3))} ${f(-h)}" stroke="${C.dGrassDark}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`; if (i % 2) o += `<rect x="${f(x - 1.6)}" y="${f(y - h - 1)}" width="3.2" height="8" rx="1.6" fill="${C.dLand}"/>`; }
  o += `<g transform="translate(1504 716) scale(0.7)" class="km-bob" style="animation-delay:-2s"><path d="M0 8 c-6 0 -8 -8 -2 -10 c4 -1 6 2 10 2 c6 0 10 -2 12 0 c0 6 -6 9 -14 9 Z" fill="${C.paper}"/><circle cx="-1" cy="-4" r="5" fill="${C.paper}"/><path d="M-6 -4 l-5 1 l5 2 Z" fill="${C.dGlow}"/><circle cx="-2" cy="-5" r="1.2" fill="${C.ink}"/><path d="M-10 12 a14 3 0 0 0 26 0" stroke="${C.mereLight}" stroke-width="2" fill="none" opacity="0.7"/></g>`;
  o += `<g class="km-fish"><path d="M1180 836 c6 -6 16 -6 21 0 c-5 6 -15 6 -21 0 Z M1201 836 l6 -5 v10 Z" fill="${C.nGlow}"/><circle cx="1186" cy="835" r="1.2" fill="${C.ink}"/></g>`;
  o += `<path d="M1176 854 a14 3.5 0 0 0 28 0" stroke="${C.mereLight}" stroke-width="1.5" fill="none" opacity="0.6"/>`;
  return g('id="km-lake"', o);
}

function shore() {
  // The Lantern Shore: a dock from the crossroads out into the lake, a basket of folded lanterns, a stool with a
  // notebook and pen where questions are written, and one lantern ready to go on a post.
  let o = '';
  o += `<g transform="translate(0 ${DOCK_DY})"><g filter="url(#layer)">`;
  for (let i = 0; i < 3; i += 1) o += `<rect x="${738 + i * 52}" y="680" width="9" height="230" rx="4" fill="${C.clay4}"/><path d="M${739 + i * 52} 700 h7 M${739 + i * 52} 705 h7" stroke="${C.dGlow}" stroke-width="2.4"/>`;
  o += `<path d="M764 640 H836 L860 780 H740 Z" fill="${C.clay3}"/>`;
  for (let i = 0; i < 10; i += 1) {
    const y0 = 640 + i * 14;
    const t0 = i / 10;
    const t1 = (i + 1) / 10;
    const xl0 = 764 - 24 * t0; const xr0 = 836 + 24 * t0; const xl1 = 764 - 24 * t1; const xr1 = 836 + 24 * t1;
    o += `<path d="M${f(xl0)} ${f(y0)} H${f(xr0)} L${f(xr1)} ${f(y0 + 13)} H${f(xl1)} Z" fill="${i % 2 ? C.clay2 : '#B97A4C'}"/>`;
    o += `<path d="M${f(xl0 + 8)} ${f(y0 + 5)} q24 2.4 48 0 M${f(xl0 + 30)} ${f(y0 + 9)} q16 -1.6 32 0" stroke="${C.clay4}" stroke-width="1" fill="none" opacity="0.7"/>`;
    o += `<circle cx="${f(xl0 + 5)}" cy="${f(y0 + 3.4)}" r="1.1" fill="${C.ink}" opacity="0.5"/><circle cx="${f(xr0 - 5)}" cy="${f(y0 + 3.4)}" r="1.1" fill="${C.ink}" opacity="0.5"/>`;
  }
  o += `<path d="M740 780 H860 V786 H740 Z" fill="${C.clay4}"/>`;
  o += `</g>`;
  o += `<g filter="url(#layer-sm)">${shadow(772, 700, 15, 2)}<path d="M758 700 h28 l-3 -18 h-22 Z" fill="${C.dGlow}"/><path d="M760 694 h24 M761 688 h22" stroke="${C.nGlowDeep}" stroke-width="1.5"/>`;
  for (let i = 0; i < 3; i += 1) o += `<path d="M${764 + i * 7} 682 c-1.4 -7 5.6 -7 4.2 0 Z" fill="${C.paper}"/>`;
  o += `${shadow(826, 712, 16, 2)}<rect x="812" y="694" width="30" height="5" rx="2.5" fill="${C.clay2}"/><rect x="816" y="698" width="3.6" height="14" fill="${C.clay4}"/><rect x="834" y="698" width="3.6" height="14" fill="${C.clay4}"/>`;
  o += `<path d="M815 693 l12 -4 l12 4 l-12 2 Z" fill="${C.paper}"/><path d="M827 689 v6" stroke="${C.stitch}" stroke-width="1"/>`;
  o += `<path d="M841 686 l-10 8" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round"/></g>`;
  // The lantern post at the end of the dock.
  o += `<g filter="url(#layer-sm)"><rect x="852" y="716" width="4" height="64" rx="2" fill="${C.clay4}"/><path d="M854 718 h12 v4" stroke="${C.clay4}" stroke-width="2.4" fill="none"/></g>`;
  o += `<g transform="translate(866 736) scale(0.38)">${lanternBody()}</g>`;
  o += `<g transform="translate(800 760) scale(0.6)"><g class="km-bob">${lanternBody()}<circle cx="0" cy="-4" r="30" fill="${C.kindle}" opacity="0.15"/></g></g></g>`;
  const reeds = (x0, n, h0) => { let s = ''; for (let i = 0; i < n; i += 1) { const x = x0 + i * r(4, 7); const h = h0 + r(-16, 20); s += `<path d="M${f(x)} 900 q${f(r(-4, 4))} ${f(-h / 2)} ${f(r(-7, 7))} ${f(-h)}" stroke="${pick([C.mereDeep, '#12333E', '#245868'])}" stroke-width="${f(r(2, 3.2))}" stroke-linecap="round" fill="none"/>`; if (rnd() > 0.55) s += `<rect x="${f(x - 2)}" y="${f(900 - h * 0.92)}" width="4.4" height="14" rx="2.2" fill="${C.clay4}"/>`; } return s; };
  o += `<g class="km-sway">${reeds(0, 16, 90)}</g><g class="km-sway" style="animation-delay:-2s">${reeds(1500, 14, 80)}</g>`;
  return g('id="km-shore"', o);
}

function lanterns() {
  let o = `<g transform="translate(0 ${WATER_DY})">`;
  LANTERNS.forEach(([x, y, s], i) => { o += lantern(x, y, f(s * 0.6), f(i * 0.9)); });
  o += `<path d="M860 806 C1060 812 1300 822 1600 832" stroke="${C.mereLight}" stroke-width="1.4" stroke-dasharray="1.6 9" stroke-linecap="round" fill="none" opacity="0.5"/>`;
  // The paper boat bringing a book back from Louise, with its wake.
  o += `<g transform="translate(580 800) scale(0.6)"><g class="km-bob" style="animation-delay:-1.5s"><path d="M70 30 h30 M76 36 h22" stroke="${C.mereLight}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`;
  o += `<path d="M0 18 H64 C58 30 48 34 32 34 C16 34 6 30 0 18 Z" fill="${C.paper}"/><path d="M0 18 H64 L60 24 H4 Z" fill="${C.creamDeep}"/><path d="M30 -14 V18 H8 Z" fill="${C.creamDeep}"/><path d="M30 -14 V18 H44 Z" fill="${C.paper}"/>`;
  o += `<rect x="34" y="6" width="22" height="12" rx="2" fill="${C.nLand}"/><rect x="34" y="6" width="22" height="3" fill="${C.cream}"/><rect x="38" y="11" width="14" height="2" rx="1" fill="${C.nGlow}"/></g></g></g>`;
  return g('id="km-lanterns"', o);
}

/* ------------------------------------------------------------------ faces and moods */
const MOODS = ['happy', 'thinking', 'oh', 'worried', 'sleepy'];

/** A keeper's face in a mood: eyes with highlights, brows, a mouth, cheeks. */
function face(p, mood, lookUp) {
  const { x1, x2, y, rx, ry, mx, my, k } = p;
  const line = (d, col, w) => `<path d="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const eye = (x, erx, ery, dx, dy, pr) => `<ellipse cx="${x}" cy="${y}" rx="${f(erx)}" ry="${f(ery)}" fill="${C.paper}"/>` +
    `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(pr)}" fill="${C.ink}"/>` +
    `<circle cx="${f(x + dx + pr * 0.43)}" cy="${f(y + dy - pr * 0.5)}" r="${f(pr * 0.38)}" fill="${C.paper}"/>`;
  const cheeks = (op) => `<ellipse cx="${x1 - p.cheekDx}" cy="${p.cheekY}" rx="5.6" ry="3.4" fill="${p.cheek}" opacity="${op}"/><ellipse cx="${x2 + p.cheekDx}" cy="${p.cheekY}" rx="5.6" ry="3.4" fill="${p.cheek}" opacity="${op}"/>`;
  let o = '';
  if (mood === 'sleepy') {
    o += line(`M${x1 - rx} ${y} q${rx} ${f(ry * 0.75)} ${2 * rx} 0 M${x2 - rx} ${y} q${rx} ${f(ry * 0.75)} ${2 * rx} 0`, C.ink, 2.4);
    o += line(`M${x1 - 5} ${y - 9} q5 -2 10 0 M${x2 - 5} ${y - 9} q5 -2 10 0`, p.brow, 2);
    o += line(`M${f(mx - 4 * k)} ${f(my + 2 * k)} q${f(4 * k)} ${f(3 * k)} ${f(8 * k)} 0`, p.mouth, 2.2);
    return o + cheeks(0.85);
  }
  if (mood === 'thinking') {
    o += eye(x1, rx, ry, rx * 0.36, -ry * 0.42, rx * 0.56) + eye(x2, rx, ry, rx * 0.36, -ry * 0.42, rx * 0.56);
    o += line(`M${x1 - 5} ${y - 9} l10 -1 M${x2 - 5} ${y - 12} q5 -4 10 0`, p.brow, 2);
    o += line(`M${f(mx - 5 * k)} ${f(my + 3 * k)} q${f(3 * k)} ${f(-2 * k)} ${f(6 * k)} 0 q${f(2 * k)} ${f(1.2 * k)} ${f(4 * k)} ${f(-1 * k)}`, p.mouth, 2.2);
    return o + cheeks(0.5);
  }
  if (mood === 'oh') {
    const dy = lookUp ? -ry * 0.5 : 0;
    o += eye(x1, rx * 1.16, ry * 1.18, 0, dy, rx * 0.44) + eye(x2, rx * 1.16, ry * 1.18, 0, dy, rx * 0.44);
    o += line(`M${x1 - 5} ${y - 13} q5 -4 10 -1 M${x2 - 5} ${y - 14} q5 -3 10 1`, p.brow, 2);
    o += `<ellipse cx="${mx}" cy="${f(my + 3 * k)}" rx="${f(3.6 * k)}" ry="${f(4.8 * k)}" fill="${p.mouth}"/><ellipse cx="${mx}" cy="${f(my + 5.6 * k)}" rx="${f(2.2 * k)}" ry="${f(1.6 * k)}" fill="${p.tongue}"/>`;
    return o + cheeks(0.6);
  }
  if (mood === 'worried') {
    o += eye(x1, rx, ry, -rx * 0.3, ry * 0.3, rx * 0.56) + eye(x2, rx, ry, -rx * 0.3, ry * 0.3, rx * 0.56);
    o += line(`M${x1 - 6} ${y - 9} L${x1 + 5} ${y - 13} M${x2 - 5} ${y - 13} L${x2 + 6} ${y - 9}`, p.brow, 2.2);
    o += line(`M${f(mx - 7 * k)} ${f(my + 3 * k)} q${f(1.75 * k)} ${f(-2.5 * k)} ${f(3.5 * k)} 0 q${f(1.75 * k)} ${f(2.5 * k)} ${f(3.5 * k)} 0 q${f(1.75 * k)} ${f(-2.5 * k)} ${f(3.5 * k)} 0 q${f(1.75 * k)} ${f(2.5 * k)} ${f(3.5 * k)} 0`, p.mouth, 2.2);
    return o + cheeks(0.4);
  }
  // happy: bright eyes, raised brows, an open smile with a tongue.
  o += eye(x1, rx, ry, p.dx, p.dy, rx * 0.58) + eye(x2, rx, ry, p.dx, p.dy, rx * 0.58);
  o += line(`M${x1 - 5} ${y - 8} q5 -4 10 -1 M${x2 - 5} ${y - 9} q5 -3 10 1`, p.brow, 2);
  o += `<path d="M${f(mx - 8 * k)} ${f(my - k)} Q${mx} ${f(my + 10 * k)} ${f(mx + 8 * k)} ${f(my - k)} Q${mx} ${f(my + 2 * k)} ${f(mx - 8 * k)} ${f(my - k)} Z" fill="${p.mouth}"/>`;
  o += `<path d="M${f(mx - 4 * k)} ${f(my + 4 * k)} q${f(4 * k)} ${f(3 * k)} ${f(8 * k)} 0 q${f(-4 * k)} ${f(-2 * k)} ${f(-8 * k)} 0 Z" fill="${p.tongue}"/>`;
  return o + cheeks(0.75);
}

/** What floats near a keeper's head in a mood: thought pebbles, a start, a sweat drop, a sleepy z. */
function moodMarks(mood, hx, hy) {
  if (mood === 'thinking') return `<g fill="${C.paper}" stroke="${C.stitch}" stroke-width="1"><circle cx="${hx}" cy="${hy}" r="3"/><circle cx="${hx + 8}" cy="${hy - 10}" r="4.5"/><circle cx="${hx + 19}" cy="${hy - 23}" r="6.5"/></g>`;
  if (mood === 'oh') return `<path d="M${hx - 8} ${hy + 2} l-5 -8 M${hx} ${hy - 2} l0 -10 M${hx + 8} ${hy + 2} l5 -8" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (mood === 'worried') return `<path d="M${hx} ${hy} c3 5 5 8 5 11 a5 5 0 0 1 -10 0 c0 -3 2 -6 5 -11 Z" fill="${C.mereLight}" stroke="${C.mere}" stroke-width="1.2"/>`;
  if (mood === 'sleepy') return zees(hx, hy, C.inkSoft);
  return '';
}

function zees(x, y, col) {
  const z = (zx, zy, s) => `<path d="M${zx} ${zy} h${7 * s} l${-7 * s} ${8 * s} h${7 * s}" stroke="${col}" stroke-width="${f(2 * s)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  return `<g class="km-zz">${z(x, y, 1)}${z(x + 10, y - 16, 1.35)}</g>`;
}

/** The keeper's body in a mood: a lean, a hop, a slump. */
function pose(mood, cx, fy, body) {
  if (mood === 'thinking') return `<g transform="rotate(-5 ${cx} ${fy})">${body}</g>`;
  if (mood === 'oh') return `<g transform="translate(0 -10)">${body}</g>`;
  if (mood === 'worried') return `<g transform="rotate(5 ${cx} ${fy}) translate(2 0)">${body}</g>`;
  if (mood === 'sleepy') return `<g transform="translate(${cx} ${fy}) scale(1.03 0.96) translate(${-cx} ${-fy})">${body}</g>`;
  return body;
}

/** In the scene a keeper carries a day face and a night face; on its own, one mood. */
function faces(p, mood, night) {
  if (mood !== 'scene') return face(p, mood);
  return `<g class="km-day-only">${face(p, 'happy')}</g><g class="km-night-only">${face(p, night.mood, night.lookUp)}</g>`;
}

/* ------------------------------------------------------------------ the keepers (their own units, feet at 0 0) */
function avocadoKeeper(mood) {
  // The nutrition keeper, an avocado through and through (owner, 2026-10-07): dark pebbled skin, pale flesh down the
  // front going green at the edge, the round pit for a belly, a stem and one leaf on top, two long avocado-leaf ears,
  // a satchel of seed-packet cards on a strap; she holds one card up. Asleep after dark.
  const skin = '#3E4A14';
  const fleshEdge = '#B9CC5A';
  const body = 'M60 18 C82 18 88 38 84 54 C106 66 114 90 106 108 C98 124 22 124 14 108 C6 90 14 66 36 54 C32 38 38 18 60 18 Z';
  const inset = (k, fill) => `<path d="${body}" fill="${fill}" transform="translate(60 76) scale(${k} ${k * 1.02}) translate(-60 -74)"/>`;
  let o = `<path d="M58 20 C58 10 60 4 63 -4" stroke="${C.bark}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M62 0 C72 -12 90 -12 98 -6 C88 4 74 6 62 0 Z" fill="${C.nLeafLight}"/><path d="M64 -1 C74 -5 86 -7 96 -6 M74 -4 l4 -4 M84 -5 l4 -4" stroke="${C.nLand}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  const leafEar = (d, rib, veins) => `<path d="${d}" fill="${C.nLeaf}"/><path d="${rib}" stroke="${C.nLand}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="${veins}" stroke="${C.nLand}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  o += `<g class="km-ear-l">${leafEar('M42 32 C24 16 22 -10 30 -28 C46 -14 52 10 50 32 Z', 'M46 30 C40 12 36 -6 31 -24', 'M41 12 l-7 -2 M43 20 l-7 0 M38 2 l-6 -3 M36 -8 l-5 -4')}</g>`;
  o += `<g class="km-ear-r">${leafEar('M72 32 C78 8 94 -8 110 -12 C108 10 96 26 80 36 Z', 'M76 32 C86 14 98 0 108 -9', 'M86 20 l2 -8 M93 12 l3 -7 M81 27 l1 -8')}</g>`;
  o += `<path d="${body}" fill="${skin}"/>`;
  o += `<path d="M40 30 C34 44 34 54 30 62 C18 72 12 88 16 104" stroke="${C.nLand}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  for (let i = 0; i < 26; i += 1) {
    const a = r(0, Math.PI * 2);
    const y = r(24, 116);
    const half = y < 56 ? 22 : 44;
    o += `<circle cx="${f(60 + Math.cos(a) * half * r(0.8, 1))}" cy="${f(y)}" r="${f(r(0.9, 1.7))}" fill="#2B340C" opacity="0.7"/>`;
  }
  o += inset(0.84, fleshEdge) + inset(0.76, '#D7E08A') + inset(0.56, '#ECEFB2');
  o += `<circle cx="60" cy="92" r="20" fill="${C.clay4}"/><path d="M44 86 C46 76 56 72 64 73" stroke="${C.clay3}" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="52" cy="82" rx="4" ry="2.6" fill="#FFFFFF" opacity="0.55" transform="rotate(-30 52 82)"/>`;
  o += `<path d="M48 104 C54 110 68 110 74 102" stroke="#6E4222" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  o += faces({ x1: 50, x2: 70, y: 50, rx: 6, ry: 7, dx: 1.6, dy: -1.4, mx: 60, my: 62, k: 1, mouth: '#3A2A12', tongue: C.nGlowDeep, cheek: C.nGlow, cheekY: 62, cheekDx: 10, brow: C.nLand }, mood, { mood: 'sleepy' });
  // The satchel of seed-packet cards on a strap across her.
  o += `<path d="M88 62 C70 80 40 96 20 104" stroke="${C.clay2}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<rect x="4" y="96" width="26" height="20" rx="5" fill="${C.clay3}"/><path d="M4 102 h26" stroke="${C.clay4}" stroke-width="2"/><rect x="4" y="96" width="26" height="9" rx="4" fill="${C.clay2}"/>`;
  o += `<rect x="8" y="88" width="7" height="12" rx="1.5" fill="${C.paper}" stroke="${C.stitch}"/><path d="M11.5 91 c-2 2 -2 5 0 6 c2 -1 2 -4 0 -6 Z" fill="${C.nLeaf}"/>`;
  o += `<rect x="17" y="86" width="7" height="13" rx="1.5" fill="${C.paper}" stroke="${C.stitch}"/><circle cx="20.5" cy="91" r="2" fill="${C.nGlow}"/>`;
  o += `<circle cx="17" cy="110" r="2" fill="${C.nGlow}"/>`;
  // Arms: one at her side, one holding a card up ("Let me find the card"), or resting when she is worried or asleep.
  o += `<ellipse cx="14" cy="80" rx="8" ry="7" fill="${skin}"/>`;
  const cardArm = `<g class="km-card-wave"><ellipse cx="108" cy="72" rx="8" ry="10" fill="${skin}" transform="rotate(-30 108 72)"/>` +
    `<g transform="rotate(8 120 52)"><rect x="106" y="34" width="30" height="22" rx="3" fill="${C.paper}"/><path d="M110 40 h20 M110 45 h22 M110 50 h14" stroke="${C.stitch}" stroke-width="1.6" stroke-linecap="round"/><circle cx="131" cy="50" r="2" fill="${C.nGlowDeep}"/></g></g>`;
  const restArm = `<ellipse cx="104" cy="88" rx="8" ry="7" fill="${skin}"/>`;
  if (mood === 'scene') o += `<g class="km-day-only">${cardArm}</g><g class="km-night-only">${restArm}</g>`;
  else o += (mood === 'worried' || mood === 'sleepy') ? restArm : cardArm;
  o += `<ellipse cx="42" cy="122" rx="10" ry="6" fill="#2B340C"/><ellipse cx="78" cy="122" rx="10" ry="6" fill="#2B340C"/>`;
  return { body: o, cx: 60, feet: 126, head: [98, 14], w: 136, top: -32 };
}

function stonesKeeper(mood) {
  // The fitness keeper: three stacked granite river stones, a pebble sash, a white paper star in the seam. After dark
  // it stays up looking at the stars.
  const speck = (cx, cy, rx, ry, col, n) => { let s = ''; for (let i = 0; i < n; i += 1) { const a = r(0, Math.PI * 2); const k = Math.sqrt(rnd()) * 0.8; s += `<circle cx="${f(cx + Math.cos(a) * rx * k)}" cy="${f(cy + Math.sin(a) * ry * k)}" r="${f(r(0.9, 1.8))}" fill="${col}" opacity="0.55"/>`; } return s; };
  let o = `<ellipse cx="44" cy="130" rx="11" ry="6" fill="${C.fDeep}"/><ellipse cx="84" cy="130" rx="11" ry="6" fill="${C.fDeep}"/>`;
  o += `<ellipse cx="64" cy="102" rx="48" ry="30" fill="${C.fLand}"/><path d="M24 92 C34 78 60 72 84 76" stroke="${C.fLight}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M28 116 C44 130 86 130 104 114" stroke="${C.fShade}" stroke-width="6" stroke-linecap="round" fill="none"/>${speck(64, 104, 44, 26, C.fDeeper, 18)}`;
  o += `<ellipse cx="64" cy="62" rx="38" ry="23" fill="${C.fGlow}"/><path d="M34 54 C44 44 70 42 88 46" stroke="#C4D0DA" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M34 72 C48 82 82 82 96 70" stroke="${C.fGlowDeep}" stroke-width="5" stroke-linecap="round" fill="none"/>${speck(64, 62, 34, 20, '#6E808F', 12)}`;
  o += `<path d="M28 52 C46 70 80 74 100 62" stroke="${C.paper}" stroke-width="2" fill="none" opacity="0.7"/>`;
  [[34, 56, C.paper], [45, 63, C.sand], [57, 67, C.moss], [70, 68, C.paper], [82, 66, C.sand], [93, 61, C.moss]].forEach(([x, y, col]) => { o += `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="4.6" fill="${col}"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="1.2" fill="${C.paper}" opacity="0.8"/>`; });
  o += `<ellipse cx="64" cy="24" rx="28" ry="20" fill="${C.fLight}"/><path d="M42 18 C48 8 66 4 78 8" stroke="${C.fPale}" stroke-width="5" stroke-linecap="round" fill="none"/>${speck(64, 28, 24, 14, C.fDeeper, 7)}`;
  o += faces({ x1: 54, x2: 74, y: 22, rx: 5.5, ry: 6.5, dx: 1.8, dy: -1.6, mx: 64, my: 32, k: 0.75, mouth: C.fDeeper, tongue: '#E07A5F', cheek: C.dGlow, cheekY: 33, cheekDx: 8, brow: C.fDeeper }, mood, { mood: 'oh', lookUp: true });
  o += `<use href="#star" x="94" y="36" width="15" height="15" class="km-twinkle"/>`;
  return { body: o, cx: 64, feet: 134, head: [94, 2], w: 132, top: 0 };
}

function ballKeeper(mood) {
  // The dog-training keeper: a large herding ball, the kind dogs push and herd, with a moulded handle on top, seams, a
  // highlight, tooth marks and grass stains, a treat pouch clipped to its side, and a stub arm waving the dog on. No
  // whistle (owner, 2026-10-07). Asleep beside the dog house after dark.
  const ball = C.dTan;
  let o = `<path d="M36 22 C36 -12 80 -12 80 22" stroke="${C.dLand}" stroke-width="12" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M40 20 C40 -6 76 -6 76 20" stroke="${C.dRusset}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<circle cx="58" cy="64" r="50" fill="${ball}"/>`;
  o += `<path d="M14 84 C26 112 92 116 106 82 C100 104 80 116 58 116 C36 116 18 102 14 84 Z" fill="${C.dRusset}"/>`;
  o += `<path d="M10 62 C26 74 90 74 106 62" stroke="${C.dLand}" stroke-width="3" fill="none" opacity="0.8"/>`;
  o += `<path d="M58 14 C50 40 50 90 58 114" stroke="${C.dLand}" stroke-width="2.4" fill="none" opacity="0.55"/>`;
  o += `<path d="M26 34 C34 22 48 16 60 16" stroke="#C98A5A" stroke-width="9" stroke-linecap="round" fill="none"/>`;
  o += `<ellipse cx="34" cy="34" rx="5" ry="3" fill="${C.paper}" opacity="0.6" transform="rotate(-35 34 34)"/>`;
  o += `<path d="M88 96 l4 -3 M93 92 l4 -3 M84 100 l3 -2" stroke="${C.dLand}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
  o += `<path d="M24 98 c4 2 8 2 12 0 M76 104 c3 1 6 1 9 -1" stroke="${C.dGrassDeep}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`;
  o += faces({ x1: 46, x2: 70, y: 50, rx: 6.4, ry: 7.4, dx: -1.8, dy: 1, mx: 58, my: 63.4, k: 1.35, mouth: '#3A1A08', tongue: '#E07A5F', cheek: C.dGlow, cheekY: 64, cheekDx: 10, brow: C.dLand }, mood, { mood: 'sleepy' });
  // The treat pouch clipped to its side.
  o += `<path d="M92 72 h16 a4 4 0 0 1 4 4 v12 a6 6 0 0 1 -6 6 h-10 a6 6 0 0 1 -6 -6 v-12 a4 4 0 0 1 2 -4 Z" fill="${C.dSky}"/><path d="M90 76 h22 l-4 8 h-14 Z" fill="${C.dPlume}"/><circle cx="101" cy="82" r="2" fill="${C.dLand}"/><path d="M98 72 v-4 h6 v4" stroke="${C.inkSoft}" stroke-width="1.6" fill="none"/>`;
  // Stub arms; one waves the dog on, or rests when it is worried or asleep.
  o += `<ellipse cx="110" cy="94" rx="8" ry="7" fill="${ball}"/>`;
  const wave = `<g class="km-treat"><path d="M12 86 C0 84 -10 76 -14 66" stroke="${ball}" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="-15" cy="62" r="8" fill="${ball}"/><path d="M-28 52 q-4 -6 0 -12 M-34 60 q-6 -4 -6 -10" stroke="${C.paper}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.9"/></g>`;
  const rest = `<ellipse cx="8" cy="94" rx="8" ry="7" fill="${ball}"/>`;
  if (mood === 'scene') o += `<g class="km-day-only">${wave}</g><g class="km-night-only">${rest}</g>`;
  else o += (mood === 'worried' || mood === 'sleepy') ? rest : wave;
  return { body: o, cx: 58, feet: 116, head: [96, 6], w: 150, top: -12 };
}

function placeKeeper(id, k, x, feetY) {
  // In the world: feet on the ground at (x, feetY), at the keepers' size.
  return `<g id="${id}" transform="translate(${f(x - k.cx * KS)} ${f(feetY - k.feet * KS)}) scale(${KS})" filter="url(#layer-sm)">${shadow(k.cx, k.feet, f(k.w * 0.36), 6)}${k.body}</g>`;
}

/* ------------------------------------------------------------------ the dog */
const DOG = { ginger: '#C97C3D', gingerLight: '#E3A86A', earDark: '#8A5A3A', white: '#FFFFFF', shade: '#E9E4D4' };

function heroDog(x, y) {
  // The Field's own dog, drawn from the owner's dog: lean and long-legged, white, a ginger head with a white blaze down
  // to a white muzzle, one ear up with its tip folded and one ear down, soft brown eyes, a ginger heart on the back, a
  // curled white tail, a green bandana and a bone-shaped tag. Active in its own state (owner, 2026-10-07): a full
  // gallop through the shallows, ears flying, the tennis ball in its mouth. Parts for a fetch game: km-dog (moved by
  // its transform), km-dog-head, km-dog-pupils, km-dog-ball (centred on 0 0).
  const { ginger, gingerLight, earDark, white, shade } = DOG;
  let o = `<g id="km-dog" data-km-part="dog" transform="translate(${x} ${y})"><g class="km-gallop">`;
  o += `<path d="M-30 26 h22 M-36 36 h26 M-26 46 h16" stroke="${white}" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>`;
  o += `<g filter="url(#layer-sm)">`;
  o += `<g class="km-wag"><path d="M18 28 C8 22 4 10 12 4 C18 0 22 8 16 12" stroke="${white}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M18 28 C14 26 11 22 10 18" stroke="${ginger}" stroke-width="8" stroke-linecap="round" fill="none"/></g>`;
  o += `<path d="M30 40 C20 48 8 52 -2 50" stroke="${shade}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M36 42 C28 54 18 60 6 62" stroke="${white}" stroke-width="9" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M84 40 C96 46 106 46 118 42" stroke="${shade}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M80 42 C90 52 100 56 114 58" stroke="${white}" stroke-width="9" stroke-linecap="round" fill="none"/>`;
  o += `<ellipse cx="-3" cy="50" rx="5" ry="3.5" fill="${shade}"/><ellipse cx="5" cy="62" rx="6" ry="4" fill="${white}"/><ellipse cx="119" cy="42" rx="5" ry="3.5" fill="${shade}"/><ellipse cx="115" cy="58" rx="6" ry="4" fill="${white}"/>`;
  o += `<path d="M18 30 C28 16 78 14 94 24 C102 32 98 44 86 46 C68 50 40 50 24 46 C12 42 10 36 18 30 Z" fill="${white}"/>`;
  o += `<path d="M30 42 C44 46 70 46 86 42" stroke="${shade}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M52 22 c-5 -7 -16 -4 -13 5 c2 5 8 9 13 12 c4 -3 11 -7 13 -12 c3 -9 -8 -12 -13 -5 Z" fill="${ginger}"/>`;
  o += `<ellipse cx="24" cy="34" rx="9" ry="8" fill="${ginger}"/>`;
  o += `<path d="M84 18 C90 24 96 28 100 30 L82 40 C78 32 74 28 68 26 Z" fill="#4E7F3A"/><path d="M84 18 C76 24 70 26 64 24 L68 30 Z" fill="#3B6230"/>`;
  for (const [cx, cy] of [[80, 28], [86, 32], [76, 32], [90, 28]]) o += `<circle cx="${cx}" cy="${cy}" r="1.2" fill="${white}" opacity="0.9"/>`;
  o += `<path d="M86 40 a2 2 0 1 1 2 -2 h4 a2 2 0 1 1 2 2 a2 2 0 1 1 -2 2 h-4 a2 2 0 1 1 -2 -2 Z" fill="#E5B07A"/>`;
  o += `<g id="km-dog-head" data-km-part="dog-head" transform="rotate(8 104 14)">`;
  o += `<path d="M96 6 C86 -2 74 -4 66 2 C76 4 86 8 94 12 Z" fill="${earDark}"/>`;
  o += `<path d="M104 2 C100 -10 104 -20 112 -22 C116 -16 114 -8 110 0 Z" fill="${earDark}"/><path d="M112 -22 C116 -24 120 -20 118 -16 C116 -18 114 -20 112 -22 Z" fill="${ginger}"/>`;
  o += `<ellipse cx="106" cy="12" rx="15" ry="14" fill="${ginger}"/>`;
  o += `<path d="M108 -1 C111 -1 112 6 113 12 L110 14 L107 12 C107 6 106 -1 108 -1 Z" fill="${white}"/>`;
  o += `<path d="M106 14 C112 12 122 14 130 16 C134 18 134 24 130 26 C122 28 112 26 106 22 Z" fill="${white}"/>`;
  o += `<ellipse cx="98" cy="16" rx="5" ry="3.4" fill="${gingerLight}" opacity="0.8"/>`;
  o += `<ellipse cx="131" cy="17" rx="3.8" ry="3" fill="#1A2433"/><circle cx="132" cy="16.2" r="1" fill="${white}" opacity="0.8"/>`;
  o += `<ellipse cx="114" cy="8" rx="3.6" ry="4" fill="#5A3A22"/><g id="km-dog-pupils" data-km-part="dog-pupils"><circle cx="115" cy="7" r="2" fill="#1A2433"/><circle cx="115.8" cy="6.2" r="0.8" fill="${white}"/></g>`;
  o += `<path d="M110 2 q4 -3 8 0" stroke="${earDark}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  o += `<g id="km-dog-ball" data-km-part="dog-ball" transform="translate(128 27)"><circle r="7.5" fill="#D8E04A"/><path d="M-6 -3 q6 4 12 0 M-6 3 q6 -4 12 0" stroke="${white}" stroke-width="1.4" fill="none"/></g>`;
  o += `</g>`;
  o += `</g></g></g>`;
  return o;
}

function sleepingDog() {
  // After dark the dog is asleep in the door of its house: curled up, head on its paws, ears down, tail round its nose.
  const { ginger, earDark, white, shade } = DOG;
  let o = `<g class="km-breathe">`;
  o += `<ellipse cx="0" cy="2" rx="30" ry="14" fill="${white}"/><path d="M-26 6 C-10 14 14 14 26 8" stroke="${shade}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M-6 -6 c-4 -6 -13 -3 -11 4 c2 4 7 7 11 9 c3 -2 9 -5 11 -9 c2 -7 -7 -10 -11 -4 Z" fill="${ginger}" transform="scale(0.8) translate(-4 -4)"/>`;
  o += `<ellipse cx="-20" cy="0" rx="8" ry="7" fill="${ginger}"/>`;
  o += `<path d="M-28 8 C-30 16 -6 20 14 16" stroke="${white}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M8 17 C11 16 14 15 16 14" stroke="${ginger}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  o += `<ellipse cx="22" cy="14" rx="9" ry="4" fill="${white}"/><ellipse cx="32" cy="15" rx="8" ry="4" fill="${white}"/>`;
  o += `<path d="M14 4 L26 10 L18 14 Z" fill="#4E7F3A"/>`;
  o += `<ellipse cx="30" cy="4" rx="12" ry="10" fill="${ginger}"/>`;
  o += `<path d="M31 -6 C33 -6 34 0 34 4 L32 6 L30 4 C30 0 29 -6 31 -6 Z" fill="${white}"/>`;
  o += `<path d="M30 6 C36 5 44 7 48 9 C50 11 49 14 46 15 C40 16 34 14 30 12 Z" fill="${white}"/><ellipse cx="47" cy="10" rx="2.6" ry="2" fill="#1A2433"/>`;
  o += `<path d="M22 0 C16 4 14 10 16 14 C20 10 22 6 24 2 Z" fill="${earDark}"/><path d="M34 -4 C34 -12 38 -16 42 -15 C42 -10 40 -6 37 -3 Z" fill="${earDark}"/>`;
  o += `<path d="M33 2 q3 2 6 0" stroke="#1A2433" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;
  o += `</g>`;
  return o;
}

function dogs() {
  // By day the dog gallops through the shallows of the bay with the tennis ball; by night it sleeps in its house.
  const sy = 1404;
  let day = heroDog(2648, 1334);
  day += `<g class="km-bob"><path d="M2640 ${sy} q8 -12 14 -2 M2770 ${sy - 6} q8 -14 16 -2 M2790 ${sy - 12} q4 -8 10 -2" stroke="${C.mereLight}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  for (const [x, y, rr] of [[2636, sy - 14, 3], [2648, sy - 22, 2.4], [2780, sy - 22, 3], [2794, sy - 30, 2.2], [2762, sy - 28, 2]]) day += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${C.paper}"/>`;
  day += `<ellipse cx="2716" cy="${sy + 4}" rx="80" ry="7" fill="none" stroke="${C.mereLight}" stroke-width="2.5" opacity="0.7"/></g>`;
  const [kx, ky] = KENNEL;
  const door = [(kx + 30) * 2, (ky + 60) * 2]; // the middle of the door's sill, in the world
  const night = `<g transform="translate(${door[0] - 4} ${door[1] - 14})" filter="url(#layer-sm)">${sleepingDog()}</g>`;
  return g('id="km-dogs"', `<g class="km-day-only">${day}</g><g class="km-night-only">${night}</g>`);
}

/* ------------------------------------------------------------------ the night's own lights (not dimmed) */
function nightLights() {
  // Everything here glows: the live script fades this layer in after sunset. Fireflies over the meadows, the string
  // lights over the table, the lamp over the larder door, the lanterns on the water, and the sleepers' z's.
  let o = '';
  const ff = (x0, x1, y0, y1, n) => {
    let s = '';
    for (let i = 0; i < n; i += 1) {
      s += `<g transform="translate(${f(r(x0, x1))} ${f(r(y0, y1))})"><g class="km-ff" style="animation-delay:-${f(r(0, 10))}s;animation-duration:${f(r(8, 13))}s">` +
        `<circle r="9" fill="#E3F28A" opacity="0.22"/><circle r="2.6" fill="${C.firefly}" class="km-blink" style="animation-delay:-${f(r(0, 3))}s"/></g></g>`;
    }
    return s;
  };
  o += ff(120, 1150, 1000, 1190, 22) + ff(300, 1100, 800, 960, 10) + ff(1150, 1900, 1110, 1210, 9) + ff(2080, 3160, 1020, 1190, 22) + ff(1700, 2300, 880, 1060, 6);
  let land = '';
  // Warm light pooled on the grass under the string lights and round the dock lantern.
  land += `<ellipse cx="420" cy="560" rx="150" ry="40" fill="url(#km-pool-g)" class="km-screen"/><ellipse cx="290" cy="474" rx="40" ry="20" fill="url(#km-pool-g)" class="km-screen"/><ellipse cx="830" cy="${700 + DOCK_DY}" rx="90" ry="40" fill="url(#km-pool-g)" class="km-screen"/>`;
  for (let i = 1; i < STRING.n; i += 1) {
    const [bx, by] = stringPoint(i / STRING.n);
    land += `<circle cx="${f(bx)}" cy="${f(by + 4.6)}" r="6" fill="${C.bulbGlow}" opacity="0.4"/><circle cx="${f(bx)}" cy="${f(by + 4.4)}" r="2.2" fill="${C.bulb}"/>`;
  }
  land += `<circle cx="282" cy="452" r="12" fill="${C.bulbGlow}" opacity="0.35"/><circle cx="282" cy="452" r="3.6" fill="${C.bulb}"/>`;
  LANTERNS.forEach(([x, y, s], i) => { land += `<g transform="translate(${x} ${y + WATER_DY}) scale(${f(s * 0.6)})"><g class="km-bob" style="animation-delay:-${f(i * 0.9)}s"><circle cx="0" cy="-8" r="46" fill="${C.kindle}" opacity="0.28"/><circle cx="0" cy="-8" r="22" fill="#FFC08A" opacity="0.6"/></g></g>`; });
  land += `<g transform="translate(866 ${736 + DOCK_DY}) scale(0.38)"><circle cx="0" cy="-8" r="50" fill="${C.kindle}" opacity="0.3"/><circle cx="0" cy="-8" r="22" fill="#FFC08A" opacity="0.7"/></g>`;
  land += `<g transform="translate(800 ${760 + DOCK_DY}) scale(0.6)"><g class="km-bob"><circle cx="0" cy="-8" r="44" fill="${C.kindle}" opacity="0.3"/><circle cx="0" cy="-8" r="20" fill="#FFC08A" opacity="0.6"/></g></g>`;
  o += `<g transform="scale(2)">${land}</g>`;
  // The sleepers' z's: the avocado at the table, the ball and the dog by the house.
  o += `<g class="km-night-only">${zees(KEEPERS.nutrition.x + 40, KEEPERS.nutrition.y - 170, C.cream)}${zees(KEEPERS['dog-training'].x + 44, KEEPERS['dog-training'].y - 160, C.cream)}${zees((KENNEL[0] + 52) * 2, (KENNEL[1] + 30) * 2, C.cream)}</g>`;
  return `<g id="km-glow" opacity="0" pointer-events="none">${o}</g>`;
}

function glitter() {
  // The path of light on the water under the sun or the moon. The live script moves it under them and colours it.
  let o = '';
  for (let i = 0; i < 24; i += 1) {
    const y = 1420 + i * 15 + r(-3, 3);
    const w = 12 + i * 5 + r(-6, 6);
    o += `<path d="M${f(-w / 2 + r(-w * 0.2, w * 0.2))} ${f(y)} h${f(w)}" stroke-width="${f(2 + i * 0.14)}" stroke-linecap="round" opacity="${f(r(0.35, 0.9))}"${i % 3 ? '' : ' class="km-blink"'}/>`;
  }
  return `<g id="km-glitter" transform="translate(960 0)" stroke="#FFE7B0" opacity="0" class="km-screen" pointer-events="none">${o}</g>`;
}

/* ------------------------------------------------------------------ where the keepers stand (world units) */
const KEEPERS = {
  nutrition: { x: 600, y: 1166, make: avocadoKeeper, id: 'km-keeper-nutrition' },
  fitness: { x: 1236, y: 1176, make: stonesKeeper, id: 'km-keeper-fitness' },
  'dog-training': { x: 2470, y: 1184, make: ballKeeper, id: 'km-keeper-dog-training' },
};

/* ------------------------------------------------------------------ styles and defs */
const STYLE = `
  .km-night-only { display: none; }
  svg[data-km-night="1"] .km-night-only { display: inline; }
  svg[data-km-night="1"] .km-day-only { display: none; }
  .km-screen { mix-blend-mode: screen; }
  .km-grain { mix-blend-mode: multiply; }
  .km-bob { animation: km-bob 3.6s ease-in-out infinite alternate; }
  .km-drift { animation: km-drift 40s ease-in-out infinite alternate; }
  .km-turn { animation: km-turn 90s linear infinite; }
  .km-twinkle { animation: km-twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .km-fall { animation: km-fall 1.4s linear infinite; }
  .km-light { animation: km-light 7s linear infinite; }
  .km-steam { animation: km-steam 3s ease-in-out infinite; }
  .km-flag { animation: km-flag 2.4s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: left center; }
  .km-wag { animation: km-wag 0.6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: left bottom; }
  .km-gallop { animation: km-gallop 0.45s ease-in-out infinite alternate; }
  .km-sway { animation: km-sway 6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: bottom; }
  .km-buzz { animation: km-buzz 1.6s ease-in-out infinite alternate; }
  .km-fish { animation: km-fish 7s ease-in-out infinite; }
  .km-ff { animation: km-ff 10s ease-in-out infinite; }
  .km-blink { animation: km-blink 2.6s ease-in-out infinite; }
  .km-zz { animation: km-zz 3.2s ease-in-out infinite; }
  .km-breathe { animation: km-breathe 3.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center bottom; }
  .km-ear-l, .km-ear-r { transform-box: fill-box; transform-origin: bottom center; animation: km-ear 4s ease-in-out infinite; }
  .km-ear-r { animation-delay: -0.4s; }
  .km-treat, .km-card-wave { animation: km-lift 2.6s ease-in-out infinite alternate; }
  @keyframes km-bob { from { transform: translateY(0); } to { transform: translateY(-4px); } }
  @keyframes km-gallop { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-5px) rotate(-2deg); } }
  @keyframes km-drift { from { transform: translateX(0); } to { transform: translateX(36px); } }
  @keyframes km-turn { to { transform: rotate(360deg); } }
  @keyframes km-twinkle { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.8); } }
  @keyframes km-fall { to { stroke-dashoffset: -40; } }
  @keyframes km-light { to { stroke-dashoffset: -280; } }
  @keyframes km-steam { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-10px); } }
  @keyframes km-flag { from { transform: skewY(0deg); } to { transform: skewY(6deg); } }
  @keyframes km-wag { from { transform: rotate(-10deg); } to { transform: rotate(14deg); } }
  @keyframes km-sway { from { transform: rotate(-1.5deg); } to { transform: rotate(1.5deg); } }
  @keyframes km-buzz { from { transform: translate(0, 0); } to { transform: translate(3px, -2px); } }
  @keyframes km-fish { 0%, 70%, 100% { transform: translateY(30px); opacity: 0; } 78% { opacity: 1; } 85% { transform: translateY(-8px); opacity: 1; } 92% { transform: translateY(20px); opacity: 0; } }
  @keyframes km-ff { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(14px, -10px); } 50% { transform: translate(26px, 4px); } 75% { transform: translate(8px, 14px); } }
  @keyframes km-blink { 0%, 100% { opacity: 1; } 45% { opacity: 0.25; } 60% { opacity: 1; } }
  @keyframes km-zz { 0% { opacity: 0; transform: translate(0, 6px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(6px, -14px); } }
  @keyframes km-breathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.02, 1.05); } }
  @keyframes km-ear { 0%, 80%, 100% { transform: rotate(0deg); } 88% { transform: rotate(-6deg); } 94% { transform: rotate(3deg); } }
  @keyframes km-lift { from { transform: translateY(0); } to { transform: translateY(-3px); } }
  @media (prefers-reduced-motion: reduce) { svg * { animation: none !important; } }`;

function defs(view, ripples) {
  const [top, horizon] = view ? view.sky : [0, 900];
  return `<defs>
    <filter id="layer" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="5" stdDeviation="0" flood-color="${C.ink}" flood-opacity="0.18"/></filter>
    <filter id="layer-sm" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="0" flood-color="${C.ink}" flood-opacity="0.2"/></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.14  0 0 0 0 0.2  0 0 0 0.55 -0.12"/></filter>
    <filter id="km-light" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix id="km-light-m" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>
    <linearGradient id="km-sky-g" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${horizon}"><stop id="km-sky-0" offset="0" stop-color="#7FB8D8"/><stop id="km-sky-1" offset="0.6" stop-color="#B4D8E6"/><stop id="km-sky-2" offset="1" stop-color="#EAF3EC"/></linearGradient>
    <radialGradient id="km-glow-g"><stop offset="0" stop-color="#FFB46E" stop-opacity="0.9"/><stop offset="0.4" stop-color="#FFC98F" stop-opacity="0.4"/><stop offset="1" stop-color="#FFC98F" stop-opacity="0"/></radialGradient>
    <linearGradient id="km-fade-orchard-1" gradientUnits="userSpaceOnUse" x1="560" y1="0" x2="690" y2="0"><stop offset="0" stop-color="#525C12" stop-opacity="1"/><stop offset="1" stop-color="#525C12" stop-opacity="0"/></linearGradient>
    <linearGradient id="km-fade-orchard-2" gradientUnits="userSpaceOnUse" x1="560" y1="0" x2="690" y2="0"><stop offset="0" stop-color="#7D8A26" stop-opacity="1"/><stop offset="1" stop-color="#7D8A26" stop-opacity="0"/></linearGradient>
    <linearGradient id="km-fade-field-1" gradientUnits="userSpaceOnUse" x1="930" y1="0" x2="1060" y2="0"><stop offset="0" stop-color="#7E9A2E" stop-opacity="0"/><stop offset="1" stop-color="#7E9A2E" stop-opacity="1"/></linearGradient>
    <linearGradient id="km-fade-field-2" gradientUnits="userSpaceOnUse" x1="930" y1="0" x2="1060" y2="0"><stop offset="0" stop-color="#A9C24A" stop-opacity="0"/><stop offset="1" stop-color="#A9C24A" stop-opacity="1"/></linearGradient>
    <linearGradient id="km-ground-1" gradientUnits="userSpaceOnUse" x1="420" y1="0" x2="1220" y2="0"><stop offset="0" stop-color="#525C12"/><stop offset="0.34" stop-color="#525C12"/><stop offset="0.5" stop-color="#6A7E2A"/><stop offset="0.66" stop-color="#7E9A2E"/><stop offset="1" stop-color="#7E9A2E"/></linearGradient>
    <linearGradient id="km-ground-2" gradientUnits="userSpaceOnUse" x1="420" y1="0" x2="1220" y2="0"><stop offset="0" stop-color="#7D8A26"/><stop offset="0.34" stop-color="#7D8A26"/><stop offset="0.5" stop-color="#93A83E"/><stop offset="0.66" stop-color="#A9C24A"/><stop offset="1" stop-color="#A9C24A"/></linearGradient>
    <radialGradient id="km-pool-g"><stop offset="0" stop-color="#FFC37A" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC37A" stop-opacity="0"/></radialGradient>
    <clipPath id="km-moon-clip"><use href="#km-moon-lit"/></clipPath>
    ${ripples ? `<mask id="km-ripples"><rect y="724" width="1600" height="176" fill="#fff"/>${Array.from({ length: 16 }, (_, i) => `<rect y="${736 + i * 9}" width="1600" height="${3 + (i % 3)}" fill="#000"/>`).join('')}</mask>` : ''}
    <symbol id="star" viewBox="-10 -10 20 20"><path d="M0 -10 C1.2 -2.5 2.5 -1.2 10 0 C2.5 1.2 1.2 2.5 0 10 C-1.2 2.5 -2.5 1.2 -10 0 C-2.5 -1.2 -1.2 -2.5 0 -10 Z" fill="#FFFFFF"/></symbol>
  </defs>`;
}

/* ------------------------------------------------------------------ the whole scene */
const DESC = 'Kindlemere: one big park beside a still teal lake, drawn to scale, under one sky that follows the real time of day. ' +
  'On the left, the Orchard: a foresty picnic meadow on terraced ground, with a deep wood of round trees, poplars and pines behind it, stone walls, two avocado trees heavy with avocados, a straw beehive, ' +
  'a larder door dug into the hill with a lamp and jars, a ladder and a basket of avocados, a vegetable patch with a rabbit, a herb spiral, a watering can, a picnic blanket with a basket, and a long table with a gingham cloth, avocado toast, avocado halves, blueberries, honey and an apricot kettle under a string of paper lights. ' +
  'There the nutrition keeper, an avocado through and through, with pale flesh down her front, the round pit for a belly, avocado-leaf ears and a satchel of seed-packet cards, holds up a card. ' +
  'In the middle rises Stepping Hill, a big grassy hill with granite outcrops and pines, stone steps up its face, a switchback trail with stacked stones and flags, a quiet pool on its shoulder with a spring running down to the lake, and a lookout on the top with a spyglass. ' +
  'At its foot stands the fitness keeper, three stacked river stones in granite greys with a pebble sash and a paper star, beside a log bench, a coiled rope, a stone kettlebell, a water flask and a towel. ' +
  'On the right, Lakeside Field: open grass running down to a bay of the lake, a split-rail fence, a row of trees, the dog house, weave poles, a willow hoop, flags with paw prints and toys. ' +
  'There the dog keeper, a large herding ball with a handle on top, tooth marks and a treat pouch, waves on a lean white dog with a ginger head, a white blaze, one ear up and a green bandana, who gallops through the shallows with a tennis ball in its mouth while a paper duck looks on. ' +
  'From the signpost a dock runs out into the lake, with a basket of folded lanterns, a stool with a notebook and a lantern post; orange paper lanterns drift away across the water toward Louise, the librarian, and a paper boat brings a book back. ' +
  'After dark the sky fills with stars and the moon in its real phase, fireflies rise over the meadows, the string lights and lanterns glow, the keepers doze, and the dog sleeps curled in the door of its house.';

function build(view) {
  DETAIL = 0.5; DENS = 2.2;
  const land1 = far() + forest();
  DETAIL = 1 / 2.6; DENS = 2.4;
  const hillPart = hillBody();
  DETAIL = 0.5; DENS = 2.2;
  const land2 = hillFoot() + orchard() + field() + bank() + paths() + signpost() + lake() + shore() + lanterns();
  DETAIL = 1; DENS = 1;
  let keepers = '';
  for (const k of Object.values(KEEPERS)) keepers += placeKeeper(k.id, k.make('scene'), k.x, k.y);
  const body = sky(view) +
    `<g id="km-land" filter="url(#km-light)">` +
    `<g transform="scale(2)">${land1}</g>` +
    `<g transform="translate(1630 1112) scale(2.6) translate(-815 -556)">${hillPart}</g>` +
    `<g transform="scale(2)">${land2}</g>` +
    keepers + dogs() +
    `</g>` +
    glitter() + nightLights() +
    `<rect id="km-grain" class="km-grain" width="${W}" height="${H}" filter="url(#grain)" opacity="0.3" pointer-events="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.box}" role="img" aria-labelledby="km-title km-desc" data-km-view="${view.key}" data-km-sky="${view.sky.join(' ')}">
<title id="km-title">${view.title}</title>
<desc id="km-desc">${DESC}</desc>
<!-- Drawn by kit/art/make-kindlemere.js. Edit that file, not this one. Lit and timed by /kit/kindlemere.js. -->
<style>${STYLE}
</style>
${defs(view, true)}
${body}
</svg>
`;
}

/** One keeper on its own in one mood, for the agents' pages: kit/art/keepers/<agent>-<mood>.svg. */
function keeperFile(agent, mood) {
  const k = KEEPERS[agent].make(mood);
  const pad = 26;
  const x0 = -36 - pad;
  const y0 = k.top - 34 - pad;
  const w = k.w + 60 + pad * 2;
  const h = k.feet + 10 - y0 + pad / 2;
  const sh = mood === 'oh' ? `<g transform="translate(${k.cx} ${k.feet}) scale(0.8) translate(${-k.cx} ${-k.feet})">${shadow(k.cx, k.feet, f(k.w * 0.36), 6)}</g>` : shadow(k.cx, k.feet, f(k.w * 0.36), 6);
  const title = { nutrition: 'The nutrition keeper', fitness: 'The fitness keeper', 'dog-training': 'The dog-training keeper' }[agent];
  const feel = { happy: 'happy, with a big open smile', thinking: 'thinking, eyes up and to the side', oh: 'surprised, eyes wide and mouth round', worried: 'worried, brows up and mouth wobbling', sleepy: 'asleep, eyes closed and z\'s rising' }[mood];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}" role="img" aria-labelledby="km-title">
<title id="km-title">${title}, ${feel}</title>
<!-- Drawn by kit/art/make-kindlemere.js (keeper ${agent}, mood ${mood}). Edit that file, not this one. -->
<style>${STYLE}
</style>
${defs(null, false)}
<g filter="url(#layer-sm)">${sh}${pose(mood, k.cx, k.feet, k.body + moodMarks(mood, k.head[0], k.head[1]))}</g>
</svg>
`;
}

/*
 * One world, four cameras. The wide view is the map of the whole realm; each close view frames one keeper in its
 * place with sky above (owner, 2026-10-07, on the Orchard close-up: "this one"). `sky` is [top, horizon] in world
 * units: the live script runs the sun and the moon between them, across the view's width.
 */
const VIEWS = [
  { key: 'realm', file: 'kindlemere.svg', box: `0 0 ${W} ${H}`, sky: [60, 900], title: 'Kindlemere' },
  { key: 'orchard', file: 'kindlemere-orchard.svg', box: '260 700 1024 576', sky: [710, 900], title: 'Kindlemere: the Orchard' },
  { key: 'hill', file: 'kindlemere-hill.svg', box: '820 610 1088 612', sky: [620, 860], title: 'Kindlemere: Stepping Hill' },
  { key: 'field', file: 'kindlemere-field.svg', box: '2000 760 1200 675', sky: [772, 930], title: 'Kindlemere: Lakeside Field' },
];

if (require.main === module) {
  for (const view of VIEWS) {
    seed = 20261007; // the same random detail in every view
    const out = path.join(__dirname, view.file);
    fs.writeFileSync(out, build(view), 'utf8');
    process.stdout.write(`Drew ${path.relative(process.cwd(), out)} (${Math.round(fs.statSync(out).size / 1024)} KB)\n`);
  }
  const dir = path.join(__dirname, 'keepers');
  fs.mkdirSync(dir, { recursive: true });
  for (const agent of Object.keys(KEEPERS)) {
    for (const mood of MOODS) {
      seed = 20261007;
      fs.writeFileSync(path.join(dir, `${agent}-${mood}.svg`), keeperFile(agent, mood), 'utf8');
    }
  }
  process.stdout.write(`Drew ${Object.keys(KEEPERS).length * MOODS.length} keeper moods in ${path.relative(process.cwd(), dir)}\n`);
}

module.exports = { VIEWS, MOODS, KEEPERS };
