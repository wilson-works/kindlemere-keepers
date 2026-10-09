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
 * Evening-only parts carry class km-evening-only (the script sets data-km-evening="1" from late afternoon through night).
 * The dog is lane D's drawing (kit/art/parts/field-dog.svg), marked data-km-part dog, dog-head, dog-pupils, dog-ball.
 * The sidekicks (owner, 2026-10-08): Summer the peach and Spud the potato with Avo, Puff and Huff the clouds with Steady.
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
  dSky: '#DDEBA6', dLand: '#6E3A12', dGlow: '#E5B07A', dGrass: '#9CB54A', dGrassDeep: '#78963A', dGrassDark: '#5E7A2A', dPlume: '#9DB83A', dSeed: '#C3D66B', dRusset: '#8E5126', dTan: '#A8622E', dDark: '#4F2A0D',
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
/* Things that move on the land, gathered while the land is drawn (land units), and drawn in the life layer. */
let LIFE = '';

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

/** Send a moving part to the life layer; the land draws nothing in its place. */
const live = (s) => { LIFE += s; return ''; };

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

function lanternBody(paper) {
  return `<rect x="-6" y="-46" width="12" height="9" rx="3" fill="${C.ink}"/><path d="M0 -46 V-54" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M-16 -36 H16 C21 -24 21 6 14 16 H-14 C-21 6 -21 -24 -16 -36 Z" fill="${C.kindle}"${paper ? ` class="km-lp"` : ""}/>` +
    `<path d="M-16 -36 H-2 C-6 -24 -6 6 -3 16 H-14 C-21 6 -21 -24 -16 -36 Z" fill="${C.kindleDeep}" opacity="0.35"/>` +
    `<path d="M-14 -24 H14 M-16 -10 H16 M-15 4 H15" stroke="${C.kindleDeep}" stroke-width="1.6" opacity="0.55"/>` +
    `<path d="M6 -30 C9 -18 9 0 6 10" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.75"/>` +
    `<rect x="-10" y="15" width="20" height="7" rx="3.5" fill="${C.ink}"/>`;
}

const LANTERNS = [[900, 790, 0.86], [1040, 800, 0.8], [1180, 808, 0.74], [1320, 814, 0.68], [1460, 820, 0.62], [1580, 826, 0.56]];
// Each lantern on the water is one keeper's question on Louise's list (/kit/kindlemere-lanterns.js lights as many as
// there are, and data-km-lantern="off" leaves the rest as dark paper on their posts).
function lantern(x, y, s, delay, i) {
  return `<g data-km-part="lantern-${i}" pointer-events="visiblePainted"><g transform="translate(${x} ${y}) scale(${s})"><g class="km-bob" style="animation-delay:-${delay}s">` +
    `<ellipse cx="0" cy="34" rx="34" ry="6" fill="none" stroke="${C.mereLight}" stroke-width="2" opacity="0.5"/>` +
    `<ellipse cx="0" cy="34" rx="22" ry="4" fill="none" stroke="${C.mereLight}" stroke-width="2" opacity="0.7"/>` +
    `<rect x="-5" y="34" width="10" height="34" rx="5" fill="${C.kindle}" opacity="0.28" class="km-ll"/>` +
    `<g class="km-ll"><circle cx="0" cy="-4" r="34" fill="${C.kindle}" opacity="0.14"/><circle cx="0" cy="-4" r="24" fill="${C.kindle}" opacity="0.18"/></g>` +
    lanternBody(true) + `</g></g></g>`;
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
    if (i % 9 === 0) s += `<use href="#star" x="${f(x - 8)}" y="${f(y - 8)}" width="16" height="16" class="km-star" style="animation-delay:-${f(r(0, 3))}s"/>`;
    else s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r(1.1, 3))}" fill="${C.paper}" opacity="${f(r(0.45, 1))}"${i % 4 === 0 ? ` class="km-star" style="animation-delay:-${f(r(0, 3))}s"` : ''}/>`;
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
  // The farmland and hedgerows beyond the Field's fence (farmland(), with the Field), from a seed of their own; the park's
  // random sequence then moves on by the draws the old farmland took, so everything after it stays as it was.
  o += ownSeed(FARM_SEED, farmland);
  for (let i = 0; i < FARM_DRAWS; i += 1) rnd();
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

/*
 * Stepping Hill is drawn in hill units: scale 2.6 in the world, world = (1630 + (x - 815) * 2.6, 1112 + (y - 556) * 2.6).
 * Owner, 2026-10-08: "the hill needs more detail (nothing is living up to the orchards standards still ... run some
 * polish passes on them, upgrade the animations and movement". So the hill is built the way the Orchard is: meadow
 * patches in several greens wrapped round the slope, drifts of wildflowers, granite outcrops in layers with moss and
 * lichen, pines, birches and shrubs, the stone steps on their worn trail with a rope rail and a board at their foot,
 * the switchback with timber steps, a rail, stacked stones, flags and turn markers, a bench, a stretching bar and a
 * balance log, a dry-stone wall and a trough for the sheep and their lambs, rabbits and birds, the lookout with real
 * railings, and the pool set into the shoulder, its stream falling over granite ledges, behind the dog house and down
 * to the lake.
 * What moves on the hill (flags, grazing sheep, butterflies, swaying grass, the running water) is drawn in the life
 * layer, so the hill layer holds still like the land (1412e6e). The hill takes its random detail from its own seed and
 * then moves the park's seed on by the HILL_DRAWS draws the old hill took, so every blade outside the hill stays put.
 */
const HILL_DRAWS = 2782;
const HILL_SEED = 20261008;
// Owner, 2026-10-09: "allow the hill to more natural roll down at closer to this angle on each side", drawn as a line
// rising about 12 degrees from the Orchard's string lights to the hill's shoulder, and falling about 19 degrees from the
// big pine to the Field's agility fence. The top stays as it was (the lookout, the steps and the trails on it); below
// the shoulders the flanks bend out of the old cone and run down at those angles, easing into the Orchard on the left
// and the Field on the right. The old cone sits wholly inside, so everything on the hill stays where it was.
const HILL_LEFT = [['L', [188, 556], [188, 526]], ['C', [188, 526], [260, 515], [360, 494], [452, 469]], ['C', [452, 469], [560, 440], [640, 400], [678.4, 360.1]],
  ['C', [678.4, 360.1], [720.8, 319.5], [768, 286.8], [820, 278]]];
const HILL_RIGHT = [['C', [820, 278], [872, 286.8], [919.2, 319.3], [961, 360.6]], ['C', [961, 360.6], [1000, 400], [1060, 446], [1130, 474]],
  ['C', [1130, 474], [1200, 500], [1270, 530], [1340, 556]]];
const hillPath = (segs) => segs.map(([k, ...p]) => (k === 'L' ? `L${p[1].join(' ')}` : `C${p.slice(1).map((q) => q.join(' ')).join(' ')}`)).join(' ');
const HILL_UP = `M188 556 ${hillPath(HILL_LEFT)}`;
const HILL_SIL = `${HILL_UP} ${hillPath(HILL_RIGHT)} Z`;
const HILL_TO_LAND = 'translate(815 556) scale(1.3) translate(-815 -556)'; // hill units inside the land's units
let HILL_LIFE = '';
const hillLive = (s) => { HILL_LIFE += s; return ''; };

// Owner, 2026-10-09: "tree scale. If they are too big at real scale, then use bushes instead." The small pines up the
// hill (by the steps, by marker 2, by marker 4) stood taller than a keeper there would; they are bushes now, on seeds
// of their own. The birches and the big pines at the hill's edges read at scale and stay.
const PINE_SEED = 20261012;
/** Draw with a seed of its own, leaving the park's random sequence where it was. */
function ownSeed(s, draw) { const keep = seed; seed = s; const out = draw(); seed = keep; return out; }

const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
const HILL_EDGE = (() => {
  const L = []; const R = [];
  // each side as [y, x], the left from the foot up, the right from the top down
  const side = (segs, out) => segs.forEach(([k, a, b, c, d]) => {
    if (k === 'L') { for (let i = 0; i <= 20; i += 1) out.push([a[1] + ((b[1] - a[1]) * i) / 20, a[0] + ((b[0] - a[0]) * i) / 20]); return; }
    for (let i = 0; i <= 120; i += 1) { const s = i / 120; out.push([bez(a[1], b[1], c[1], d[1], s), bez(a[0], b[0], c[0], d[0], s)]); }
  });
  side(HILL_LEFT, L); side(HILL_RIGHT, R);
  return { L, R };
})();
/** The hill's left and right edges at height y. */
function hillEdge(y) {
  const at = (pts) => { for (let i = 1; i < pts.length; i += 1) { const [y0, x0] = pts[i - 1]; const [y1, x1] = pts[i]; if ((y - y0) * (y - y1) <= 0 && y0 !== y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0); } return 820; };
  return [at(HILL_EDGE.L), at(HILL_EDGE.R)];
}
const onHill = (x, y, m) => { if (y >= 556 || y <= 280) return false; const [l, rr] = hillEdge(y); return x > l + m && x < rr - m; };

/** Points along a smooth line through `pts` (each [x, y, ...more]), every `step` units; extra values ride along. */
function sample(pts, step) {
  const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  const out = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < n; j += 1) out.push(p1.map((_, k) => cr(p0[k], p1[k], p2[k], p3[k], j / n)));
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
const line = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
/** Offset a sampled line sideways by `k` of its half width (third value) plus `e`. */
function offset(pts, k, e) {
  return pts.map((p, i) => {
    const q = pts[Math.max(0, i - 1)]; const s = pts[Math.min(pts.length - 1, i + 1)];
    const dx = s[0] - q[0]; const dy = s[1] - q[1]; const len = Math.hypot(dx, dy) || 1;
    const d = (p[2] || 0) * k + (typeof e === 'function' ? e(i) : e || 0);
    return [p[0] - (dy / len) * d, p[1] + (dx / len) * d];
  });
}
/** A band along a sampled line between offsets a and b (in half widths), its edges wavering by `wob`. */
function strip(pts, a, b, wob) {
  const ph = [r(0, 6), r(0, 6), r(0, 6), r(0, 6)];
  const wav = (s) => (i) => (wob ? wob * Math.sin(i * 0.45 + ph[s]) * Math.sin(i * 0.17 + ph[s + 2]) : 0);
  return poly(offset(pts, a, wav(0)).concat(offset(pts, b, wav(1)).reverse()));
}
const near = (pts, x, y, d) => pts.some((p) => Math.abs(p[0] - x) < d + (p[2] || 0) && Math.abs(p[1] - y) < d + (p[2] || 0) && Math.hypot(p[0] - x, p[1] - y) < d + (p[2] || 0));

/* The stream: out of the pool's lip, over two granite ledges, behind the dog house (hill units, [x, y, half width]). */
const STREAM_HILL = [[956, 440, 2.4], [966, 443.5, 2.6], [975, 447, 2.8], [983, 450, 2.8], [985.5, 456, 2.4], [987.5, 463, 2.6], [991, 467, 4.2], [999, 470.5, 3], [1009, 474.5, 3], [1019, 478.5, 3.1], [1027, 482, 3.1], [1029.5, 488, 2.7], [1031.5, 495, 2.9], [1035, 499, 4.6], [1042, 503, 3.3], [1048, 509, 3.4], [1053, 518, 3.5], [1058, 528, 3.5], [1063, 541, 3.6]];
/* ... and from behind the dog house's right wall, past its bowl, under the bridge and through the bank (land units). */
const STREAM_LAND = [[1112, 506, 4.2], [1124, 518, 4.4], [1133, 532, 4.6], [1137, 546, 4.7], [1137.5, 559, 4.8], [1135.5, 572, 5.2], [1132.5, 584, 5.6], [1130.5, 596, 5.8], [1128.5, 610, 6], [1131, 626, 6.2], [1133, 644, 6.3], [1130, 662, 6.4], [1131, 676, 6], [1132, 692, 5.6], [1133, 708, 6], [1134, 724, 7.4]];
const WATER = { bed: '#55702A', wet: '#3D4A2C', body: C.mere, shine: C.mereShine, deep: C.mereDeep, line: C.mereLight, foam: '#F4FAFB' };

/* Lanes of light on the water: across-stream place, dashes (each set sums to 30, the km-flow loop), seconds, width, opacity. */
const FLOW_LANES = [[-0.4, '3.5 26.5', 3.3, 0.55, 0.75], [0.05, '5 25', 2.7, 0.6, 0.8], [0.45, '1.5 28.5', 3.9, 0.5, 0.7]];

/** Lighter flow lines that slide downstream (life layer): `pts` sampled, lanes across the stream, times and widths scaled. */
function flowLines(pts, lanes, time, width) {
  let o = '';
  lanes.forEach(([k, dash, dur, w, op], i) => {
    o += `<path d="${line(offset(pts, k, 0))}" stroke="${WATER.line}" stroke-width="${f(w * (width || 1))}" stroke-linecap="round" stroke-dasharray="${dash}" fill="none" opacity="${op}" class="km-flow" style="animation-duration:${f(dur * (time || 1))}s;animation-delay:-${f(i * 0.9)}s"/>`;
  });
  return o;
}

/** A granite ledge the stream falls over: the wet dark face behind the water, a lip stone, a block either side. */
function ledge(x, y, w, h) {
  let o = contact(x + 1, y + h + 1.4, w * 0.6, 2.2, 0.2);
  o += `<path d="${poly([[x - w * 0.26, y - 0.4], [x - w * 0.08, y - 1.2], [x + w * 0.14, y - 0.8], [x + w * 0.27, y + 0.2], [x + w * 0.3, y + h * 0.6], [x + w * 0.24, y + h + 0.6], [x - w * 0.02, y + h + 1.2], [x - w * 0.27, y + h + 0.4], [x - w * 0.3, y + h * 0.5]])}" fill="${C.fLightShade}"/>`;
  o += `<path d="${poly([[x - w * 0.24, y + 1], [x - w * 0.1, y + h * 0.3], [x - w * 0.16, y + h * 0.75], [x - w * 0.26, y + h * 0.6]])}" fill="${C.fDeep}" opacity="0.5"/>`;
  o += granite(x - w * 0.36, y + h + 0.6, w * 0.5, h + 1.4, true) + granite(x + w * 0.37, y + h, w * 0.44, h + 0.4, false);
  o += `<path d="${poly([[x - w * 0.3, y + 0.6], [x - w * 0.24, y - 1.6], [x + w * 0.05, y - 2], [x + w * 0.28, y - 1.2], [x + w * 0.32, y + 0.8], [x + w * 0.04, y + 1.4]])}" fill="${C.fGlow}"/>`;
  o += `<path d="${poly([[x - w * 0.25, y - 1.2], [x + w * 0.05, y - 1.9], [x + w * 0.26, y - 1], [x + w * 0.04, y - 0.4]])}" fill="${C.fPale}"/>`;
  return o;
}

/** The stream down the hill's face, in the hill layer (static), and its moving water in the life layer. */
function streamHill() {
  const pts = sample(STREAM_HILL, 2);
  let o = '';
  // The lush bed it has cut through the meadow, the wet dark edge, then the ledges it falls over.
  o += `<path d="${strip(sample(STREAM_HILL.map(([x, y, w]) => [x, y, w + 3.4]), 2), -1, 1, 1.4)}" fill="${WATER.bed}"/>`;
  o += `<path d="${strip(sample(STREAM_HILL.map(([x, y, w]) => [x, y, w + 1.5]), 2), -1, 1, 0.5)}" fill="${WATER.wet}"/>`;
  o += ledge(985, 450.6, 30, 14) + ledge(1029, 482.6, 30, 13.6);
  // The water: teal, a lighter run along its sunny edge, flow lines, a darker shade under the far bank.
  o += `<path d="${strip(pts, -1, 1, 0.25)}" fill="${WATER.body}"/>`;
  o += `<path d="${strip(pts, -1, -0.35, 0.2)}" fill="${WATER.shine}"/>`;
  o += `<path d="${strip(pts, 0.55, 1, 0.15)}" fill="${WATER.deep}" opacity="0.55"/>`;
  // The falls: the water sheet goes white as it pours over each ledge, and settles in foam at the foot.
  [[3, 6], [10, 13]].forEach(([a, b]) => {
    const fall = sample(STREAM_HILL.slice(a, b + 1), 1.2);
    o += `<path d="${strip(fall, -0.75, 0.75, 0)}" fill="${WATER.line}" opacity="0.6"/>`;
    [-0.35, 0.3].forEach((k) => { o += `<path d="${line(offset(fall.slice(1, -2), k, 0))}" stroke="${WATER.foam}" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.75"/>`; });
  });
  [[991, 467, 4.2], [1035, 499, 4.6]].forEach(([x, y, w]) => {
    const foam = [];
    for (let i = 0; i < 8; i += 1) foam.push([x + r(-w * 0.85, w * 0.85), y + r(-1.6, 1.2), r(0.5, 1.2)]);
    o += blobs(WATER.foam, foam, 'opacity="0.9"');
  });
  // Stones in the water and on its banks, wet dark below, lit above.
  [[970, 446.2, 1.4], [997, 472.4, 1.2], [1012, 473.6, 1], [1020, 481, 1.3], [1040, 504.5, 1.1], [1005, 470.4, 0.9], [988, 470.6, 1.6], [1033, 502.4, 1.5]].forEach(([x, y, s]) => {
    o += `<ellipse cx="${f(x)}" cy="${f(y + 0.5 * s)}" rx="${f(1.9 * s)}" ry="${f(1.1 * s)}" fill="${WATER.deep}"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(1.7 * s)}" ry="${f(1 * s)}" fill="${C.fLight}"/><ellipse cx="${f(x - 0.4 * s)}" cy="${f(y - 0.35 * s)}" rx="${f(1 * s)}" ry="${f(0.5 * s)}" fill="${C.fPale}"/><path d="M${f(x - 2.2 * s)} ${f(y - 0.2)} q-1.2 -0.4 -2 0" stroke="${WATER.foam}" stroke-width="0.4" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  });
  // The moving water, in the life layer: flow lines on the runs, the falls pouring, foam breathing at their feet.
  let life = '';
  [[1, 3], [6, 10], [13, 15]].forEach(([a, b]) => { life += flowLines(sample(STREAM_HILL.slice(a, b + 1), 1.5).filter(([x, y]) => y < 507), FLOW_LANES, 1); });
  [[3, 6], [10, 13]].forEach(([a, b]) => {
    const fall = sample(STREAM_HILL.slice(a, b + 1), 1.2).slice(1, -1);
    [[-0.4, '2.2 3.8'], [0.05, '3 3'], [0.45, '1.6 4.4']].forEach(([k, dash], i) => { life += `<path d="${line(offset(fall, k, 0))}" stroke="${WATER.foam}" stroke-width="0.6" stroke-linecap="round" stroke-dasharray="${dash}" fill="none" class="km-cascade" style="animation-delay:-${f(i * 0.23)}s"/>`; });
  });
  [[991, 467.4, 4.2], [1035, 499.4, 4.6]].forEach(([x, y, w], j) => {
    for (let i = 0; i < 4; i += 1) life += `<ellipse cx="${f(x + (i - 1.5) * w * 0.45)}" cy="${f(y + r(-0.6, 0.8))}" rx="${f(r(1, 1.5))}" ry="${f(r(0.7, 1))}" fill="${WATER.foam}" class="km-foam" style="animation-delay:-${f(i * 0.4 + j * 0.3)}s"/>`;
  });
  hillLive(`<g>${life}</g>`);
  return o;
}

/** Circles of one colour in one path (one node instead of many). */
const blobs = (fill, list, extra) => `<path fill="${fill}" d="${list.map(([cx, cy, rr]) => `M${f(cx - rr)} ${f(cy)}a${f(rr)} ${f(rr)} 0 1 0 ${f(2 * rr)} 0a${f(rr)} ${f(rr)} 0 1 0 ${f(-2 * rr)} 0`).join('')}"${extra ? ` ${extra}` : ''}/>`;
const contact = (x, y, rx, ry, op) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${C.ink}" opacity="${op || 0.18}"/>`;

/** The quiet pool set into the hill's shoulder: the bank cut behind it, the water, lilies, and a lip of stones. */
function poolBack() {
  let o = '';
  o += `<path d="M883 439 C886 430 905 424.4 930 424 C955 424.4 974 430 977 439 Z" fill="#86A044"/>`;
  o += `<path d="M886.6 439 C890 432.4 908 427.4 930 427 C952 427.4 970 432.4 973.4 439 Z" fill="#4E5E2A"/>`;
  o += `<path d="M890.6 439 C895 434.6 910 431 930 430.8 C950 431 965 434.6 969.4 439 Z" fill="#3D4A2C"/>`;
  [[901, 431.4, 1.3], [915.6, 428.2, 1], [946.6, 428.2, 1.2], [961, 431.2, 1], [931, 427.4, 0.8]].forEach(([x, y, s]) => {
    o += `<ellipse cx="${x}" cy="${f(y + 0.4)}" rx="${f(2 * s)}" ry="${f(1.1 * s)}" fill="${C.fLightShade}"/><ellipse cx="${f(x - 0.3)}" cy="${y}" rx="${f(1.7 * s)}" ry="${f(0.8 * s)}" fill="${C.fGlow}"/>`;
  });
  o += `<path d="M905 426.8 q3 -1.6 6 -0.4 q-3 0.4 -6 0.4 Z M938 426 q4 -1.8 8 -0.2 q-4 0.4 -8 0.2 Z" fill="${C.moss}"/>`;
  return o;
}

function poolFront() {
  let o = '';
  // The water: teal in its scoop, darker under the bank it reflects, a lighter sheen, lily pads and a water lily.
  o += `<ellipse cx="930" cy="436.8" rx="38.4" ry="7.6" fill="${C.mere}"/>`;
  o += `<path d="M892.6 435.6 C900 430 915 428.2 930 428 C945 428.2 960 430 967.4 435.6 C958 433 944 432 930 432 C916 432 902 433 892.6 435.6 Z" fill="${C.mereDeep}" opacity="0.85"/>`;
  o += `<path d="M902 439.6 C914 437.6 944 437.6 960 439.8 C944 439.2 914 439.2 902 439.6 Z" fill="${C.mereShine}"/><path d="M908 442 h12 M926 441.6 h9 M940 442.4 h7" stroke="${C.mereLight}" stroke-width="0.5" stroke-linecap="round" opacity="0.6"/>`;
  [[911, 437.4, 1.3], [922, 440.6, 1], [946, 438.2, 1.1], [903, 440.4, 0.8]].forEach(([x, y, s]) => {
    o += `<path d="M${x} ${y} m${f(-2.6 * s)} 0 a${f(2.6 * s)} ${f(1.2 * s)} 0 1 0 ${f(5.2 * s)} 0 a${f(2.6 * s)} ${f(1.2 * s)} 0 0 0 ${f(-2.2 * s)} ${f(-1.1 * s)} l${f(-0.4 * s)} ${f(1.1 * s)} Z" fill="#4E7F3A"/><path d="M${f(x - 1.6 * s)} ${f(y + 0.3 * s)} a${f(1.7 * s)} ${f(0.6 * s)} 0 0 0 ${f(3.2 * s)} 0" stroke="#6E9A4E" stroke-width="0.35" fill="none"/>`;
  });
  o += `<g transform="translate(911 436.4)">${[-70, -35, 0, 35, 70, 180].map((a) => `<ellipse cx="0" cy="-1.1" rx="0.55" ry="1.3" fill="${a === 180 ? '#E9E4D4' : C.paper}" transform="rotate(${a})"/>`).join('')}<circle r="0.6" fill="#E9C24A"/></g>`;
  // The lip: rounded granite stones along the front edge, wet dark where they meet the water, a gap at the outlet.
  const lipY = (x) => 436.8 + 7.6 * Math.sqrt(Math.max(0, 1 - ((x - 930) / 38.4) ** 2));
  let shade = ''; let body = ''; let lit = ''; let wet = '';
  for (let x = 895; x < 953; x += r(5.2, 7)) {
    const s = r(0.85, 1.2); const y = lipY(x) + 0.9;
    wet += `M${f(x - 2.8 * s)} ${f(y - 0.6)}h${f(5.6 * s)}`;
    shade += `M${f(x - 3 * s)} ${f(y + 0.4)}a${f(3 * s)} ${f(1.8 * s)} 0 1 0 ${f(6 * s)} 0a${f(3 * s)} ${f(1.8 * s)} 0 1 0 ${f(-6 * s)} 0`;
    body += `M${f(x - 2.7 * s)} ${f(y)}a${f(2.7 * s)} ${f(1.5 * s)} 0 1 0 ${f(5.4 * s)} 0a${f(2.7 * s)} ${f(1.5 * s)} 0 1 0 ${f(-5.4 * s)} 0`;
    lit += `M${f(x - 1.9 * s)} ${f(y - 0.5)}a${f(1.6 * s)} ${f(0.7 * s)} 0 1 0 ${f(3.2 * s)} 0a${f(1.6 * s)} ${f(0.7 * s)} 0 1 0 ${f(-3.2 * s)} 0`;
  }
  [[966.5, 438.4, 1.3], [970.6, 441.8, 0.9]].forEach(([x, y, s]) => {
    shade += `M${f(x - 3 * s)} ${f(y + 0.4)}a${f(3 * s)} ${f(1.8 * s)} 0 1 0 ${f(6 * s)} 0a${f(3 * s)} ${f(1.8 * s)} 0 1 0 ${f(-6 * s)} 0`;
    body += `M${f(x - 2.7 * s)} ${f(y)}a${f(2.7 * s)} ${f(1.5 * s)} 0 1 0 ${f(5.4 * s)} 0a${f(2.7 * s)} ${f(1.5 * s)} 0 1 0 ${f(-5.4 * s)} 0`;
    lit += `M${f(x - 1.9 * s)} ${f(y - 0.5)}a${f(1.6 * s)} ${f(0.7 * s)} 0 1 0 ${f(3.2 * s)} 0a${f(1.6 * s)} ${f(0.7 * s)} 0 1 0 ${f(-3.2 * s)} 0`;
  });
  o += `<path d="M893 445.4 C910 450 948 450 960 446.6 C948 452.6 910 452.6 893 445.4 Z" fill="${C.ink}" opacity="0.16"/>`;
  o += `<path d="${wet}" stroke="${C.mereDeep}" stroke-width="1" stroke-linecap="round"/><path d="${shade}" fill="${C.fLightShade}"/><path d="${body}" fill="${C.fGlow}"/><path d="${lit}" fill="${C.fPale}"/>`;
  o += `<path d="M897 442.6 q2 -1.4 4 -0.2 q-2 0.2 -4 0.2 Z M937 445.4 q2.4 -1.6 4.6 -0.2 q-2.2 0.3 -4.6 0.2 Z M963.6 437 q2.4 -1.6 4.8 -0.4 q-2.4 0.4 -4.8 0.4 Z" fill="${C.moss}"/>`;
  // Cattails and rushes at its back corner, a fern over the bank, and the bell on its post by the trail.
  for (let i = 0; i < 7; i += 1) {
    const x = 966 + i * 1.3 + r(-0.4, 0.4); const h = r(9, 15);
    o += `<path d="M${f(x)} 434 q${f(r(-1, 1))} ${f(-h / 2)} ${f(r(-1.6, 1.6))} ${f(-h)}" stroke="${pick(['#5E7A2A', '#6E8A42', '#4F6E3A'])}" stroke-width="0.55" stroke-linecap="round" fill="none"/>`;
    if (i % 2) o += `<rect x="${f(x - 0.55)}" y="${f(434 - h * 0.86)}" width="1.1" height="3.4" rx="0.55" fill="${C.clay4}"/>`;
  }
  o += `<g transform="translate(888.6 434)">${[-3, -2, -1, 0, 1, 2].map((j) => `<path d="M0 0 q${j * 1.2} -3.2 ${j * 2.6} ${f(-5 + Math.abs(j) * 0.7)}" stroke="${j < 0 ? '#6E8A42' : '#5E7A2A'}" stroke-width="0.6" stroke-linecap="round" fill="none"/>`).join('')}</g>`;
  o += `<g transform="translate(878 432)">${contact(1.2, 0.3, 3.2, 0.7)}<rect x="-0.6" y="-14" width="1.4" height="14" rx="0.6" fill="${C.bark}"/><path d="M0.1 -13.4 h5.6" stroke="${C.bark}" stroke-width="1" stroke-linecap="round"/><path d="M5.2 -13 v1" stroke="${C.ink}" stroke-width="0.35"/><path d="M3.4 -9.4 a1.9 2.4 0 0 1 3.8 0 l0.4 0.8 h-4.6 Z" fill="${C.dGlow}"/><path d="M5.3 -11.8 a1.9 2.4 0 0 1 1.9 2.4 l0.4 0.8 h-1.6 Z" fill="${C.nGlowDeep}" opacity="0.6"/><circle cx="5.3" cy="-8.3" r="0.45" fill="${C.clay4}"/></g>`;
  return o;
}

/** A granite outcrop: a dark foot, a body with a lit face and a shaded flank, a pale top, cracks, moss and lichen. */
function granite(x, y, w, h, moss) {
  const l = x - w / 2; const rr = x + w / 2; const t = y - h;
  const j = () => r(-0.5, 0.5);
  let o = contact(x + w * 0.06, y + 0.5, w * 0.56, Math.max(1.3, h * 0.14), 0.2);
  o += `<path d="${poly([[l, y], [l + w * 0.03 + j(), y - h * 0.48], [l + w * 0.16 + j(), t + h * 0.1], [x - w * 0.1 + j(), t + j()], [x + w * 0.2 + j(), t + h * 0.08], [rr - w * 0.08 + j(), y - h * 0.52], [rr, y]])}" fill="${C.fLight}"/>`;
  o += `<path d="${poly([[l + 0.7, y - 0.3], [l + w * 0.06, y - h * 0.47], [l + w * 0.18, t + h * 0.16], [x - w * 0.08, t + h * 0.08], [x + w * 0.06, y - h * 0.34], [x - w * 0.02, y - 0.3]])}" fill="${C.fGlow}"/>`;
  o += `<path d="${poly([[l + w * 0.17, t + h * 0.14], [x - w * 0.1, t + 0.5], [x + w * 0.19, t + h * 0.1], [x + w * 0.06, t + h * 0.3], [l + w * 0.24, t + h * 0.3]])}" fill="${C.fPale}"/>`;
  o += `<path d="M${f(l)} ${f(y)} Q${f(x)} ${f(y + 1.3)} ${f(rr)} ${f(y)} Q${f(x)} ${f(y - 1.5)} ${f(l)} ${f(y)} Z" fill="${C.fLightShade}"/>`;
  o += `<path d="M${f(x + w * 0.08)} ${f(t + h * 0.28)} l${f(w * 0.04)} ${f(h * 0.26)} l${f(-w * 0.03)} ${f(h * 0.22)} M${f(l + w * 0.3)} ${f(y - h * 0.3)} l${f(w * 0.06)} ${f(h * 0.12)}" stroke="${C.fDeep}" stroke-width="${f(Math.max(0.4, w * 0.012))}" stroke-linecap="round" fill="none" opacity="0.65"/>`;
  if (moss) o += `<path d="M${f(l + w * 0.12)} ${f(t + h * 0.2)} q${f(w * 0.12)} ${f(-h * 0.24)} ${f(w * 0.3)} ${f(-h * 0.1)} q${f(-w * 0.1)} ${f(h * 0.12)} ${f(-w * 0.3)} ${f(h * 0.1)} Z M${f(rr - w * 0.2)} ${f(y - h * 0.48)} q${f(w * 0.08)} ${f(-h * 0.14)} ${f(w * 0.16)} ${f(0)} q${f(-w * 0.08)} ${f(h * 0.04)} ${f(-w * 0.16)} 0 Z" fill="${C.moss}"/>`;
  const lich = [];
  for (let i = 0; i < Math.max(2, Math.round(w / 6)); i += 1) lich.push([l + w * r(0.15, 0.85), y - h * r(0.15, 0.75), r(0.3, Math.min(0.9, w * 0.025))]);
  o += blobs('#D9D3A8', lich.slice(0, Math.ceil(lich.length / 2))) + blobs(C.creamDeep, lich.slice(Math.ceil(lich.length / 2)));
  return o;
}

/** A pine: a trunk and four tiers of boughs, lit on the left and shaded on the right. */
function pine(x, base, h) {
  const w = h * 0.4;
  let o = contact(x + 1, base + 0.3, w * 0.62, h * 0.04, 0.2);
  o += `<path d="M${f(x - h * 0.035)} ${base} L${f(x - h * 0.016)} ${f(base - h * 0.55)} H${f(x + h * 0.016)} L${f(x + h * 0.035)} ${base} Z" fill="${C.bark}"/>`;
  let dark = ''; let mid = ''; let lit = '';
  for (let i = 0; i < 4; i += 1) {
    const t = i / 4;
    const by = base - h * 0.14 - h * 0.66 * t; const tw = w * (1 - t * 0.66); const th = h * 0.36 * (1 - t * 0.25);
    const top = by - th;
    dark += `M${f(x)} ${f(top)}L${f(x - tw)} ${f(by)}Q${f(x - tw * 0.5)} ${f(by + th * 0.1)} ${f(x)} ${f(by - th * 0.06)}Q${f(x + tw * 0.5)} ${f(by + th * 0.1)} ${f(x + tw)} ${f(by)}Z`;
    mid += `M${f(x)} ${f(top)}L${f(x - tw)} ${f(by)}Q${f(x - tw * 0.5)} ${f(by + th * 0.1)} ${f(x + tw * 0.06)} ${f(by - th * 0.06)}Z`;
    lit += `M${f(x - tw * 0.1)} ${f(top + th * 0.22)}L${f(x - tw * 0.82)} ${f(by - th * 0.04)}Q${f(x - tw * 0.6)} ${f(by - th * 0.02)} ${f(x - tw * 0.44)} ${f(by - th * 0.12)}Z`;
  }
  return o + `<path d="${dark}" fill="${C.pine}"/><path d="${mid}" fill="${C.pineMid}"/><path d="${lit}" fill="${C.pineLight}"/>`;
}

/** A silver birch: a white trunk with dark marks, thin branches and an airy crown of small leaf clusters. */
function birch(x, base, h, lean) {
  const tx = x + lean;
  let o = contact(x + 1, base + 0.3, h * 0.16, h * 0.035, 0.18);
  o += `<path d="M${f(tx - h * 0.04)} ${f(base - h * 0.45)} q${f(-h * 0.08)} ${f(-h * 0.1)} ${f(-h * 0.16)} ${f(-h * 0.14)} M${f(tx + h * 0.02)} ${f(base - h * 0.58)} q${f(h * 0.08)} ${f(-h * 0.08)} ${f(h * 0.15)} ${f(-h * 0.1)} M${f(tx)} ${f(base - h * 0.72)} q${f(-h * 0.05)} ${f(-h * 0.08)} ${f(-h * 0.1)} ${f(-h * 0.12)}" stroke="#8A7F70" stroke-width="${f(h * 0.012)}" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M${f(x - h * 0.032)} ${base} L${f(tx - h * 0.012)} ${f(base - h * 0.86)} H${f(tx + h * 0.012)} L${f(x + h * 0.034)} ${base} Z" fill="#F4F1E8"/>`;
  o += `<path d="M${f(x + h * 0.008)} ${base} L${f(tx + h * 0.002)} ${f(base - h * 0.86)} H${f(tx + h * 0.012)} L${f(x + h * 0.034)} ${base} Z" fill="#D8D1BC"/>`;
  let marks = '';
  for (let i = 0; i < 7; i += 1) { const k = r(0.05, 0.8); const mx = x + (tx - x) * k; const half = h * 0.032 * (1 - k * 0.6); marks += `M${f(mx - half * r(0.1, 1))} ${f(base - h * k)}h${f(half * r(0.6, 1.4))}`; }
  o += `<path d="${marks}" stroke="#3A3A3A" stroke-width="${f(h * 0.012)}" stroke-linecap="round" opacity="0.8"/>`;
  const leaves = [['#8CA040', []], ['#A3B852', []], ['#BFCC6E', []]];
  for (let i = 0; i < 22; i += 1) {
    const a = r(-Math.PI, 0.25); const d = r(0.15, 1);
    const cx = tx + Math.cos(a) * h * 0.27 * d + r(-1, 1); const cy = base - h * 0.72 + Math.sin(a) * h * 0.24 * d + r(0, h * 0.1);
    const rr = h * r(0.06, 0.095);
    leaves[0][1].push([cx + rr * 0.15, cy + rr * 0.2, rr]);
    leaves[1][1].push([cx, cy, rr * 0.8]);
    if (i % 2 === 0) leaves[2][1].push([cx - rr * 0.3, cy - rr * 0.3, rr * 0.38]);
  }
  return o + leaves.map(([c, l]) => blobs(c, l)).join('');
}

/** A shrub on the hill: gorse with yellow flowers, a juniper, or a plain bush with berries. */
function shrub(x, y, s, kind) {
  const cols = { gorse: ['#4F6A2E', '#62803A', '#7A9844'], juniper: ['#3F5E4C', '#4E705A', '#6A8A70'], bush: ['#55732F', '#6B8A3A', '#86A246'] }[kind];
  let o = contact(x + 0.6 * s, y + 0.3, 7.5 * s, 1.3 * s, 0.18);
  o += blobs(cols[0], [[x - 3.6 * s, y - 2.4 * s, 3.2 * s], [x + 3.2 * s, y - 2.2 * s, 3.4 * s], [x, y - 4 * s, 4 * s]]);
  o += blobs(cols[1], [[x - 3.4 * s, y - 3 * s, 2.5 * s], [x + 0.2 * s, y - 4.8 * s, 3.1 * s], [x + 3 * s, y - 3.1 * s, 2.5 * s]]);
  o += blobs(cols[2], [[x - 1.6 * s, y - 6 * s, 1.5 * s], [x - 4.2 * s, y - 4 * s, 1 * s]]);
  const spots = [];
  for (let i = 0; i < 7; i += 1) spots.push([x + r(-5, 5) * s, y - r(1.6, 7) * s, 0.45 * s]);
  if (kind === 'gorse') o += blobs('#F2D27A', spots);
  if (kind === 'bush') o += blobs('#C8433A', spots.slice(0, 3));
  return o;
}

// The hill's flock is drawn big enough to read from across the park (owner, 2026-10-08: "the sheep on the hill need to be
// bigger").
const FLOCK = 1.9;

/** A sheep: wool in three papers, dark legs and face; `pose` graze (head down), look (head up) or lie. */
function sheep(x, y, s, flip, pose, lamb) {
  const k = lamb ? 1.25 : 1; // a lamb's head is big for its body
  let o = contact(0.4, 0.3, 8, 1.3, 0.2);
  if (pose !== 'lie') o += `<path d="M-4.6 -3.6 v3.4 M3.8 -3.6 v3.4" stroke="#4A433C" stroke-width="1.2" stroke-linecap="round"/><path d="M-3 -3.4 v3.6 M5.4 -3.4 v3.6" stroke="#2F2A26" stroke-width="1.2" stroke-linecap="round"/>`;
  const dy = pose === 'lie' ? 3 : 0;
  const wool = [[-4.4, -6 + dy, 3.2], [-1, -7.4 + dy, 3.6], [2.8, -6.8 + dy, 3.4], [5, -5.2 + dy, 2.8], [-2, -4.4 + dy, 3.2], [2.4, -4.2 + dy, 3.2], [-6.2, -4.6 + dy, 1.8]];
  o += blobs('#D9D2C0', wool.map(([a, b, c]) => [a + 0.4, b + 0.6, c]));
  o += blobs('#F4F1E8', wool.map(([a, b, c]) => [a, b, c * 0.9]));
  o += blobs(C.paper, [[-2.4, -9 + dy, 1.4], [0.8, -9.6 + dy, 1.2], [-5, -7.4 + dy, 0.9]]);
  const head = pose === 'graze'
    ? `<g class="km-graze"><ellipse cx="8" cy="-3.6" rx="${f(1.8 * k)}" ry="${f(2.6 * k)}" fill="#2F2A26" transform="rotate(-28 8 -3.6)"/><ellipse cx="6.6" cy="-5.6" rx="1.6" ry="0.7" fill="#2F2A26" transform="rotate(-40 6.6 -5.6)"/><circle cx="8.3" cy="-4.4" r="0.35" fill="${C.paper}"/></g>`
    : `<ellipse cx="7.8" cy="${f(-8.6 + dy)}" rx="${f(1.9 * k)}" ry="${f(2.5 * k)}" fill="#2F2A26" transform="rotate(18 7.8 ${f(-8.6 + dy)})"/><ellipse cx="6" cy="${f(-9.8 + dy)}" rx="1.6" ry="0.7" fill="#2F2A26" transform="rotate(-20 6 ${f(-9.8 + dy)})"/><circle cx="8.4" cy="${f(-9.2 + dy)}" r="0.38" fill="${C.paper}"/>`;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s)} ${f(s)})">${o}${head}</g>`;
}

/** A rabbit sitting up in the grass, ears high. */
function rabbit(x, y, s, flip) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s)} ${f(s)})">${contact(0, 0.2, 4, 0.8, 0.18)}` +
    `<ellipse cx="0" cy="-2.6" rx="3.2" ry="2.6" fill="#A8957A"/><ellipse cx="-1.2" cy="-1.8" rx="2.2" ry="1.9" fill="#97846A"/><ellipse cx="1" cy="-1.6" rx="1.6" ry="1.2" fill="#E9E4D4"/>` +
    `<ellipse cx="2.2" cy="-8.6" rx="0.65" ry="2.3" fill="#A8957A" transform="rotate(-10 2.2 -8.6)"/><ellipse cx="3.3" cy="-8.4" rx="0.65" ry="2.3" fill="#97846A" transform="rotate(14 3.3 -8.4)"/><ellipse cx="2.25" cy="-8.4" rx="0.25" ry="1.5" fill="${C.dGlow}" transform="rotate(-10 2.2 -8.6)"/>` +
    `<circle cx="2.6" cy="-5.4" r="1.9" fill="#A8957A"/><circle cx="3.2" cy="-5.8" r="0.4" fill="${C.ink}"/><circle cx="4.4" cy="-5" r="0.3" fill="#C98A5A"/><circle cx="-3.3" cy="-2.4" r="0.95" fill="${C.paper}"/></g>`;
}

/** A small brown bird perched, its breast warm tan. */
function bird(x, y, s, flip) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s)} ${f(s)})"><path d="M-1.6 -1.4 l-1.8 0.8 l1.6 0.4 Z" fill="#5A4A3C"/><ellipse cx="0" cy="-1.6" rx="1.7" ry="1.2" fill="#6B5A4A"/><path d="M0.2 -1.2 a1.4 1 0 0 0 1.4 -0.6 a1.4 1.4 0 0 1 -1.4 1.6 Z" fill="${C.dGlow}"/><circle cx="1.2" cy="-2.8" r="0.9" fill="#6B5A4A"/><path d="M2 -2.9 l0.8 0.2 l-0.8 0.3 Z" fill="${C.clay3}"/><circle cx="1.4" cy="-3" r="0.22" fill="${C.ink}"/><path d="M-0.3 -0.5 v0.6 M0.5 -0.5 v0.6" stroke="#4A3A2A" stroke-width="0.25"/></g>`;
}

/** A fern on the stream bank, and (with `reeds`) a few rushes with brown heads behind it. */
function fern(x, y, s, reeds) {
  let o = '';
  if (reeds) for (let i = 0; i < 4; i += 1) { const rx = x + (i - 1.5) * 1.1 * s; const h = r(8, 11) * s; o += `<path d="M${f(rx)} ${f(y)} q${f(r(-0.6, 0.6))} ${f(-h / 2)} ${f(r(-1, 1))} ${f(-h)}" stroke="${pick(['#5E7A2A', '#4F6E3A'])}" stroke-width="${f(0.5 * s)}" stroke-linecap="round" fill="none"/>${i % 2 ? `<rect x="${f(rx - 0.45 * s)}" y="${f(y - h * 0.86)}" width="${f(0.9 * s)}" height="${f(2.6 * s)}" rx="${f(0.45 * s)}" fill="${C.clay4}"/>` : ''}`; }
  for (let j = -2; j <= 2; j += 1) o += `<path d="M${f(x)} ${f(y)} q${f(j * 1.2 * s)} ${f(-3 * s)} ${f(j * 2.6 * s)} ${f((-5.4 + Math.abs(j) * 1.2) * s)}" stroke="${pick(['#4F6E3A', '#5E7A2A', '#6E8A42'])}" stroke-width="${f(0.7 * s)}" stroke-linecap="round" fill="none"/>`;
  return o;
}

/** Little stacked stones by the trail. */
function stack(x, y, s) {
  let o = contact(x + 0.4, y + 0.3, 4.2 * s, 0.9 * s, 0.2);
  [[0, 0, 3.8, 1.5, C.fLight, C.fGlow], [0.2, -2.4, 3, 1.25, C.fGlow, C.fPale], [-0.2, -4.4, 2.2, 1, C.fLight, C.fGlow], [0.1, -6, 1.4, 0.8, C.fGlow, C.fStone]].forEach(([dx, dy, rx, ry, a, b]) => {
    o += `<ellipse cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" rx="${f(rx * s)}" ry="${f(ry * s)}" fill="${a}"/><ellipse cx="${f(x + (dx - 0.3) * s)}" cy="${f(y + (dy - 0.35) * s)}" rx="${f(rx * 0.7 * s)}" ry="${f(ry * 0.55 * s)}" fill="${b}"/>`;
  });
  return o;
}

/** A turn marker: a short post with a slate plate and its number. */
function marker(x, y, n, s) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${s || 1})">${contact(0.5, 0.3, 2.4, 0.6)}<rect x="-0.9" y="-9" width="1.9" height="9" rx="0.5" fill="${C.clay3}"/><rect x="-0.9" y="-9" width="0.7" height="9" fill="${C.clay2}"/>` +
    `<rect x="-2.8" y="-11.6" width="5.6" height="4.4" rx="1" fill="${C.fDeep}" transform="translate(0.4 0.5)"/><rect x="-2.8" y="-11.6" width="5.6" height="4.4" rx="1" fill="${C.fLand}"/>` +
    `<text x="0" y="-8.2" text-anchor="middle" font-family="Candara, 'Gill Sans', 'Trebuchet MS', sans-serif" font-size="3.6" font-weight="700" fill="${C.paper}">${n}</text></g>`;
}

/** A flag on a pole that flaps (life layer). */
function flag(x, y, h, col, delay, s) {
  const k = s || 1;
  return `<g transform="translate(${f(x)} ${f(y)})">${contact(0.4, 0.2, 1.8 * k, 0.5 * k, 0.16)}<path d="M0 0 V${-h}" stroke="${C.bark}" stroke-width="${f(0.9 * k)}" stroke-linecap="round"/><circle cx="0" cy="${f(-h - 0.4 * k)}" r="${f(0.7 * k)}" fill="${C.fGlow}"/>` +
    `<path d="M${f(0.3 * k)} ${f(-h + 0.2 * k)} h${f(6.6 * k)} l${f(-1.6 * k)} ${f(2.3 * k)} l${f(1.6 * k)} ${f(2.3 * k)} h${f(-6.6 * k)} Z" fill="${col}" class="km-flag" style="animation-delay:-${delay}s"/></g>`;
}

/** The bench part way up the steps. */
function bench(x, y) {
  return `<g transform="translate(${x} ${y})">${contact(0.6, 0.4, 14, 1.4)}<rect x="-11" y="-7" width="2.2" height="7" rx="0.6" fill="${C.clay4}"/><rect x="9" y="-7" width="2.2" height="7" rx="0.6" fill="${C.clay4}"/>` +
    `<rect x="-10" y="-15" width="1.8" height="8" fill="${C.clay4}"/><rect x="8.4" y="-15" width="1.8" height="8" fill="${C.clay4}"/>` +
    `<rect x="-12.5" y="-15.6" width="25" height="2.6" rx="1.2" fill="${C.clay3}"/><rect x="-12.5" y="-15.6" width="25" height="1" rx="0.5" fill="${C.clay2}"/><rect x="-12.5" y="-11.8" width="25" height="2.2" rx="1" fill="${C.clay3}"/>` +
    `<rect x="-13" y="-8.2" width="26" height="2.2" rx="1" fill="${C.clay2}"/><rect x="-13" y="-6.4" width="26" height="1.4" rx="0.6" fill="${C.clay3}"/><path d="M-6 -7.2 h4 M3 -7.4 h5" stroke="${C.clay1}" stroke-width="0.4" stroke-linecap="round"/>` +
    `<rect x="4" y="-10.6" width="3" height="2.4" rx="0.8" fill="${C.paper}"/><rect x="4" y="-9.8" width="3" height="0.6" fill="${C.fGlow}"/></g>`;
}

/** The stretching bar: two posts and a bar, with a mat in the grass before it. */
function stretchBar(x, y) {
  return `<g transform="translate(${x} ${y})">${contact(13, 0.6, 18, 1.6)}<path d="M2 1.6 L26 1.6 L29 4.6 L-1 4.6 Z" fill="${C.sand}"/><path d="M2.8 2.8 H26.6" stroke="${C.fGlow}" stroke-width="0.6"/>` +
    `<rect x="0" y="-20" width="2.4" height="21" rx="0.8" fill="${C.clay4}"/><rect x="24" y="-20" width="2.4" height="21" rx="0.8" fill="${C.clay4}"/><rect x="0" y="-20" width="0.9" height="21" fill="${C.clay3}"/><rect x="24" y="-20" width="0.9" height="21" fill="${C.clay3}"/>` +
    `<rect x="-0.6" y="-17.4" width="27.6" height="1.6" rx="0.8" fill="${C.fLand}"/><rect x="-0.6" y="-17.4" width="27.6" height="0.6" rx="0.3" fill="${C.fLight}"/>` +
    `<path d="M6 -16 v5 l1.4 1.2 l1.4 -1.2 v-5 Z" fill="${C.paper}"/><path d="M6 -14 h2.8" stroke="${C.fGlow}" stroke-width="0.5"/></g>`;
}

/** The lookout on the top: a railed platform on posts and braces with a ladder, and the spyglass at the horizon. */
function lookout() {
  let o = `<g transform="translate(820 252)" filter="url(#layer-sm)">`;
  o += `<rect x="-16" y="4" width="3" height="28" fill="${C.clay3}"/><rect x="13" y="4" width="3" height="28" fill="${C.clay3}"/><path d="M-14 12 H14" stroke="${C.clay3}" stroke-width="1.6"/>`;
  o += `<path d="M-19 9 L19 30 M19 9 L-19 30" stroke="${C.clay4}" stroke-width="2.2" stroke-linecap="round"/>`;
  o += `<rect x="-23" y="3" width="4" height="33" rx="1" fill="${C.clay4}"/><rect x="19" y="3" width="4" height="33" rx="1" fill="${C.clay4}"/><rect x="-23" y="3" width="1.4" height="33" fill="${C.clay3}"/><rect x="19" y="3" width="1.4" height="33" fill="${C.clay3}"/>`;
  o += `<path d="M-13 4 L-12 37 M-7 4 L-6 37" stroke="${C.clay2}" stroke-width="1.3" stroke-linecap="round"/><path d="${[9, 15, 21, 27, 33].map((y) => `M-12.6 ${y} H-6.6`).join(' ')}" stroke="${C.clay3}" stroke-width="1.1" stroke-linecap="round"/>`;
  o += `<rect x="-30" y="-1.4" width="60" height="3.4" rx="1.2" fill="${C.clay2}"/><rect x="-30" y="1.8" width="60" height="3.6" fill="${C.clay3}"/><path d="M-24 3.6 h7 M-10 3.6 h8 M6 3.6 h7 M18 3.6 h6" stroke="${C.clay4}" stroke-width="0.5"/><rect x="-28" y="5.2" width="56" height="1.4" fill="${C.clay4}" opacity="0.7"/>`;
  let bal = '';
  for (let x = -25; x <= 25; x += 3.5) if (Math.abs(x + 10) > 1.6 && Math.abs(x - 10) > 1.6) bal += `M${f(x)} -17.6 V-1.4 `;
  o += `<path d="${bal}" stroke="${C.clay4}" stroke-width="0.7" opacity="0.85"/>`;
  [-28.6, -10.8, 9.2, 26.4].forEach((x) => { o += `<rect x="${x}" y="-19" width="2.4" height="18" rx="0.6" fill="${C.clay3}"/><rect x="${x}" y="-19" width="0.9" height="18" fill="${C.clay2}"/>`; });
  o += `<rect x="-30" y="-20.6" width="60" height="2.6" rx="1.2" fill="${C.clay3}"/><rect x="-30" y="-20.6" width="60" height="0.9" rx="0.45" fill="${C.clay1}"/><rect x="-29" y="-10.6" width="58" height="1.4" rx="0.6" fill="${C.clay3}"/>`;
  o += bird(18, -20.4, 1.1, true);
  o += `<path d="M8 0 L14 -14 L20 0" stroke="${C.ink}" stroke-width="2" fill="none"/><g transform="rotate(-16 14 -16)" data-km-part="telescope" pointer-events="visiblePainted"><rect x="-4" y="-34" width="52" height="34" fill="transparent"/><rect x="4" y="-21" width="30" height="9" rx="4.5" fill="${C.clay2}"/><rect x="28" y="-23" width="9" height="13" rx="3" fill="${C.clay4}"/><rect x="0" y="-19" width="6" height="5" rx="2" fill="${C.clay4}"/></g>`;
  return o + `</g>`;
}

/* The stone steps: sixteen slabs up the hill's face, narrowing as they climb (the course is fixed). */
const STEP_AT = (i) => { const k = i / 15; return [652 + 140 * k - 18 * Math.sin(k * Math.PI), 546 - 250 * k + 20 * Math.sin(k * Math.PI), 32 - i]; };
/* The switchback: from the hill's foot past the pool to the lookout, in four turns. */
const SWITCHBACK = [[900, 552], [918, 541], [944, 526], [966, 511], [981, 501], [985, 495], [978, 489.5], [958, 484], [925, 474.5], [893, 465], [872, 458], [864, 452], [865, 444], [870, 434], [876, 423], [886, 412], [904, 404], [930, 398], [955, 393], [967, 389], [969, 383], [960, 378], [935, 368], [905, 356], [878, 345], [863, 337], [859, 330], [863, 322], [860, 312], [852, 303], [843, 295]];

/** The worn trail the steps are set in, and the steps on it. */
function stepsTrail() {
  const pts = [];
  for (let i = 0; i <= 44; i += 1) { const t = i / 44; pts.push([bez(668, 700, 740, 800, t), bez(552, 470, 380, 290, t), 15.6 - 6.4 * t]); }
  let o = `<path d="${strip(pts.map(([x, y, w]) => [x + 1.2, y + 1.6, w + 0.6]), -1, 1, 0.9)}" fill="#A8865A"/>`;
  o += `<path d="${strip(pts, -1, 1, 1)}" fill="#C9A77A"/>`;
  o += `<path d="${strip(pts, -0.6, 0.45, 0.7)}" fill="#D6BC90"/>`;
  // Pebbles kicked to its edges, and grass growing in over them.
  const peb = [];
  let tufts = '';
  [-1.05, 1.05].forEach((k) => {
    offset(pts, k, 0).forEach(([x, y], i) => {
      if (i % 2 === 0 && rnd() < 0.7) peb.push([x + r(-0.8, 0.8), y + r(-0.6, 0.6), r(0.5, 1.1)]);
      if (i % 2 === 1) tufts += `<use href="#kmt-${pick(['a', 'b', 'c'])}" x="${f(x + k * r(0.5, 2))}" y="${f(y + r(0, 1.5))}"/>`;
    });
  });
  o += blobs(C.fLight, peb.filter((_, i) => i % 3 === 0)) + blobs(C.fGlow, peb.filter((_, i) => i % 3 === 1)) + blobs('#B8A27C', peb.filter((_, i) => i % 3 === 2));
  return o + tufts;
}

function steps() {
  let riser = ''; let foot = ''; let tread = ''; let lip = ''; let moss = '';
  for (let i = 15; i >= 0; i -= 1) {
    const [x, y, w] = STEP_AT(i);
    riser += `M${f(x)} ${f(y + 1.4)}H${f(x + w)}L${f(x + w - 0.5)} ${f(y + 6.4)}Q${f(x + w / 2)} ${f(y + 7.4)} ${f(x + 0.5)} ${f(y + 6.4)}Z`;
    foot += `M${f(x + 0.4)} ${f(y + 5)}Q${f(x + w / 2)} ${f(y + 6)} ${f(x + w - 0.4)} ${f(y + 5)}L${f(x + w - 0.5)} ${f(y + 6.4)}Q${f(x + w / 2)} ${f(y + 7.4)} ${f(x + 0.5)} ${f(y + 6.4)}Z`;
    tread += `M${f(x - 0.8)} ${f(y + 0.6)}L${f(x + 0.2)} ${f(y - 1.4)}H${f(x + w - 0.2)}L${f(x + w + 0.8)} ${f(y + 0.6)}L${f(x + w + 0.2)} ${f(y + 2)}H${f(x - 0.2)}Z`;
    lip += `M${f(x + 0.4)} ${f(y + 1.6)}h${f(w - 0.8)}`;
    moss += `M${f(x - 1.2)} ${f(y + 1.4)}q${f(1.4)} -2.6 ${f(3.4)} -1.2q-1.6 0.6 -3.4 1.2Z`;
    if (i % 3 === 1) moss += `M${f(x + w + 1)} ${f(y + 1.8)}q-1.2 -2 -3 -1q1.4 0.4 3 1Z`;
  }
  return `<g filter="url(#layer-sm)"><path d="${riser}" fill="${C.fGlow}"/><path d="${foot}" fill="${C.fLight}"/><path d="${tread}" fill="${C.fPale}"/><path d="${lip}" stroke="${C.fStone}" stroke-width="0.7" stroke-linecap="round"/><path d="${moss}" fill="${C.moss}"/></g>`;
}

/** The switchback worn into the turf: a shaded edge, the earth, a lighter worn middle, timber steps where it is steep.
 * Owner, 2026-10-09: "the hills 2nd numbered trail needs more correct scaling": it is drawn at the stone steps' scale,
 * about twice its first width, with its steps, rail, posts, cairns and flags to match. */
function switchback() {
  const d = line(sample(SWITCHBACK, 2));
  const parts = [[0, 11, 11], [10, 20, 9.5], [19, 31, 8]];
  let o = '';
  parts.forEach(([a, b, w]) => { o += `<path d="${line(sample(SWITCHBACK.slice(a, b), 2))}" stroke="#A8865A" stroke-width="${w + 1.2}" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(0.8 1.4)"/>`; });
  parts.forEach(([a, b, w]) => { o += `<path d="${line(sample(SWITCHBACK.slice(a, b), 2))}" stroke="#C9A77A" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`; });
  o += `<path d="${d}" stroke="#D2B88C" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="30 7 18 12" fill="none" opacity="0.9"/>`;
  // Timber steps and a rail on the steep climb past the pool.
  const steep = sample(SWITCHBACK.slice(11, 16), 1);
  let rungs = ''; let posts = '';
  for (let i = 2; i < steep.length - 2; i += 4) {
    const [p, q] = [steep[i - 1], steep[i + 1]];
    const dx = q[0] - p[0]; const dy = q[1] - p[1]; const len = Math.hypot(dx, dy) || 1; const nx = -dy / len; const ny = dx / len;
    rungs += `M${f(steep[i][0] - nx * 5)} ${f(steep[i][1] - ny * 5)}L${f(steep[i][0] + nx * 5)} ${f(steep[i][1] + ny * 5)}`;
  }
  o += `<path d="${rungs}" stroke="${C.clay4}" stroke-width="2.2" stroke-linecap="round" transform="translate(0 0.9)"/><path d="${rungs}" stroke="${C.clay2}" stroke-width="1.5" stroke-linecap="round"/>`;
  const railPts = offset(steep, 0, -7.4).filter((_, i) => i % 6 === 0);
  railPts.forEach(([x, y]) => { posts += `M${f(x)} ${f(y)}v-8.4`; });
  o += `<path d="${posts}" stroke="${C.clay4}" stroke-width="1.7" stroke-linecap="round"/><path d="${line(railPts.map(([x, y]) => [x, y - 7.8]))}" stroke="${C.clay3}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;
  return o;
}

/** A meadow patch wrapped round the hill: between the contour at y0 and the one `th` below it, across angles a0..a1. */
function patch(y0, th, a0, a1, fill) {
  const top = []; const bot = [];
  const [l0, r0] = hillEdge(y0); const [l1, r1] = hillEdge(y0 + th);
  for (let i = 0; i <= 14; i += 1) {
    const a = a0 + ((a1 - a0) * i) / 14;
    top.push([(l0 + r0) / 2 - ((r0 - l0) / 2) * Math.cos(a), y0 + 0.07 * ((r0 - l0) / 2) * Math.sin(a) + r(-1, 1)]);
    bot.push([(l1 + r1) / 2 - ((r1 - l1) / 2) * Math.cos(a), y0 + th + 0.07 * ((r1 - l1) / 2) * Math.sin(a) + r(-1, 1)]);
  }
  const pts = top.concat(bot.reverse());
  let dd = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i <= pts.length; i += 1) { const p = pts[i % pts.length]; const q = pts[i - 1]; dd += `Q${f(q[0])} ${f(q[1])} ${f((q[0] + p[0]) / 2)} ${f((q[1] + p[1]) / 2)}`; }
  return `<path d="${dd}Z" fill="${fill}"/>`;
}

/** Grass on the hill: tufts (shared pieces) and single blades, the lit side lighter. */
function hillGrass(avoid) {
  let uses = '';
  const blades = { '#5E7A2A': [], '#6F8A34': [], '#7E9A3A': [], '#8BA348': [], '#9DB458': [] };
  for (let i = 0; i < N(150); i += 1) {
    const y = r(290, 554); const [l, rr] = hillEdge(y); const x = r(l + 3, rr - 3);
    if (!onHill(x, y, 3) || avoid(x, y)) continue;
    const lit = x + r(-50, 50) < 790 + (y - 300) * 0.05;
    uses +=`<use href="#kmt-${lit ? pick(['a', 'b', 'c']) : pick(['d', 'e', 'a'])}" x="${f(x)}" y="${f(y)}"/>`;
  }
  for (let i = 0; i < N(150); i += 1) {
    const y = r(300, 554); const [l, rr] = hillEdge(y); const x = r(l + 2, rr - 2);
    if (avoid(x, y)) continue;
    const h = r(2.2, 4.6) * (0.75 + (y - 300) / 520); const lean = r(-1.6, 1.6);
    const lit = x + r(-50, 50) < 790 + (y - 300) * 0.05;
    blades[lit ? pick(['#7E9A3A', '#8BA348', '#9DB458']) : pick(['#5E7A2A', '#6F8A34', '#7E9A3A'])].push(`M${f(x - 0.7)} ${f(y)}q${f(lean * 0.4 + 0.7)} ${f(-h * 0.6)} ${f(lean + 0.7)} ${f(-h)}q${f(-lean * 0.5 + 0.3)} ${f(h * 0.5)} ${f(0.7)} ${f(h)}Z`);
  }
  return uses + Object.entries(blades).map(([c, ds]) => (ds.length ? `<path d="${ds.join('')}" fill="${c}"/>` : '')).join('');
}

/** Drifts of wildflowers along the slope: daisies, buttercups, clover, harebells. */
function hillFlowers(avoid) {
  const drifts = [[700, 420, 30, 7, 'wwy'], [640, 486, 24, 6, 'yyw'], [760, 352, 22, 5, 'wcw'], [866, 486, 34, 6, 'ycw'], [952, 412, 18, 4, 'bwb'], [820, 392, 20, 5, 'wwt'], [740, 512, 22, 5, 'ywc'], [905, 525, 26, 5, 'wyb'], [790, 312, 18, 4, 'cwy'], [882, 370, 20, 4, 'wtw'], [1010, 446, 14, 4, 'ybw'], [626, 452, 14, 4, 'wcy'], [960, 500, 16, 4, 'yww'], [812, 498, 18, 4, 'twb'],
    [772, 474, 16, 4, 'wyw'], [834, 432, 20, 5, 'ycw'], [884, 404, 14, 4, 'wtw'], [802, 378, 18, 4, 'wcy'], [856, 516, 16, 4, 'ywb'], [722, 398, 12, 3, 'yyw'], [612, 470, 10, 4, 'wwc'], [780, 420, 12, 3, 'bwy']];
  let o = '';
  drifts.forEach(([cx, cy, rx, ry, mix]) => {
    for (let i = 0; i < N(11); i += 1) {
      const a = r(0, Math.PI * 2); const d = Math.sqrt(rnd());
      const x = cx + Math.cos(a) * rx * d; const y = cy + Math.sin(a) * ry * d;
      if (!onHill(x, y, 3) || avoid(x, y)) continue;
      o += `<use href="#kmf-${pick(mix.split(''))}" x="${f(x)}" y="${f(y)}"/>`;
    }
  });
  for (let i = 0; i < N(40); i += 1) {
    const y = r(300, 550); const [l, rr] = hillEdge(y); const x = r(l + 4, rr - 4);
    if (avoid(x, y)) continue;
    o += `<use href="#kmf-${pick(['w', 'w', 'y', 'c', 't', 'b'])}" x="${f(x)}" y="${f(y)}"/>`;
  }
  return o;
}

/** The pieces the hill repeats (hill units): wildflowers on short stems and tufts of grass. Scene files only. */
function hillDefs() {
  const flower = (id, petal, centre, n, rr, pr, cr) => {
    let s = '';
    for (let i = 0; i < n; i += 1) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; s += `<circle cx="${f(Math.cos(a) * rr)}" cy="${f(Math.sin(a) * rr - 2.4)}" r="${pr}"/>`; }
    return `<g id="kmf-${id}"><path d="M0 0 q0.3 -1.2 0 -2.4" stroke="#5E7A2A" stroke-width="0.35" fill="none"/><g fill="${petal}">${s}</g><circle cy="-2.4" r="${cr}" fill="${centre}"/></g>`;
  };
  const tuft = (id, back, front, tall) => `<g id="kmt-${id}"><path d="M-1.8 0q-0.6 ${f(-1.8 * tall)} -1.9 ${f(-3.2 * tall)}q1.1 ${f(1.2 * tall)} 2.6 ${f(3.2 * tall)}ZM1 0q0.8 ${f(-2 * tall)} 2.2 ${f(-3 * tall)}q-0.9 ${f(1.3 * tall)} -1.4 ${f(3 * tall)}Z" fill="${back}"/>` +
    `<path d="M-0.9 0q-0.3 ${f(-2.4 * tall)} -0.7 ${f(-4.4 * tall)}q1.1 ${f(1.9 * tall)} 1.6 ${f(4.4 * tall)}ZM0.3 0q0.5 ${f(-2.6 * tall)} 1.3 ${f(-4 * tall)}q-0.3 ${f(1.9 * tall)} -0.1 ${f(4 * tall)}ZM-0.3 0q0 ${f(-1.6 * tall)} -0.3 ${f(-2.8 * tall)}q0.7 ${f(1.1 * tall)} 0.9 ${f(2.8 * tall)}Z" fill="${front}"/></g>`;
  return flower('w', C.paper, '#E9C24A', 5, 0.75, 0.55, 0.42) + flower('y', '#F2D27A', '#C9A43A', 5, 0.68, 0.52, 0.36) + flower('c', C.cream, C.creamDeep, 3, 0.5, 0.6, 0.45) +
    flower('t', C.dGlow, C.clay2, 4, 0.66, 0.5, 0.35) + flower('b', '#C4DCE2', '#8FB8C2', 5, 0.62, 0.48, 0.3) +
    tuft('a', '#6F8A34', '#8BA348', 1) + tuft('b', '#7E9A3A', '#9DB458', 0.9) + tuft('c', '#6F8A34', '#97AE52', 1.15) + tuft('d', '#55702A', '#6F8A34', 1) + tuft('e', '#5E7A2A', '#7E9A3A', 0.85);
}

/** A butterfly that flits about (life layer, by day). */
function butterfly(x, y, col, delay) {
  return `<g transform="translate(${x} ${y}) scale(1.5)" class="km-day-only"><g class="km-flit" style="animation-delay:-${delay}s"><g class="km-wing" style="animation-delay:-${f(delay / 7)}s">` +
    `<path d="M0 -0.3 C-1 -2.8 -3.8 -3.4 -3.6 -1.2 C-3.4 -0.2 -1.4 0 0 -0.3 Z M0 -0.3 C1 -2.8 3.8 -3.4 3.6 -1.2 C3.4 -0.2 1.4 0 0 -0.3 Z" fill="${col}"/>` +
    `<path d="M0 0.1 C-1.6 0.3 -2.8 1.1 -2.2 2.3 C-1.4 2.7 -0.4 1.5 0 0.1 Z M0 0.1 C1.6 0.3 2.8 1.1 2.2 2.3 C1.4 2.7 0.4 1.5 0 0.1 Z" fill="${col}" opacity="0.8"/></g><ellipse rx="0.32" ry="1.3" fill="${C.inkSoft}"/></g></g>`;
}

/** Ovals of one colour in one path. */
const ovals = (fill, list) => `<path fill="${fill}" d="${list.map(([cx, cy, rx, ry]) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0`).join('')}"/>`;

/** A dry-stone wall for the sheep along the slope, two courses and a row of upright capstones, open where the trail passes. */
function stoneWall(pts, gap) {
  const line0 = sample(pts.map(([x, y]) => [x, y, 0]), 1);
  const dark = []; const mid = []; const lite = []; const caps = []; let base = '';
  let next = 0;
  line0.forEach(([x, y], i) => {
    if (x > gap[0] && x < gap[1] || i < next) return;
    next = i + Math.round(r(3, 5));
    const w = r(1.7, 2.6);
    (rnd() < 0.5 ? dark : mid).push([x, y - 1.2, w, r(1.1, 1.5)]);
    (rnd() < 0.6 ? mid : dark).push([x + w * 0.9, y - 3.6, r(1.6, 2.3), r(1, 1.3)]);
    if (rnd() < 0.5) lite.push([x - w * 0.3, y - 1.9, w * 0.5, 0.45]);
    caps.push([x + r(-0.6, 0.6), y - 5.6 - r(0, 0.6), r(1.1, 1.7), r(0.9, 1.3)]);
    if (rnd() < 0.6) lite.push([x - 0.3, y - 6.3, 0.8, 0.35]);
  });
  line0.forEach(([x, y], i) => { if (i && !(x > gap[0] && x < gap[1]) && !(line0[i - 1][0] > gap[0] && line0[i - 1][0] < gap[1])) base += `M${f(line0[i - 1][0])} ${f(line0[i - 1][1] + 0.4)}L${f(x)} ${f(y + 0.4)}`; });
  let o = `<path d="${base}" stroke="${C.ink}" stroke-width="2.2" opacity="0.16" stroke-linecap="round"/>`;
  o += ovals(C.fLightShade, dark) + ovals(C.fLight, mid) + ovals(C.fGlow, caps) + ovals(C.fPale, lite);
  // Upright gateposts either side of the gap.
  [gap[0], gap[1]].forEach((gx) => { const p = line0.reduce((a, b) => (Math.abs(b[0] - gx) < Math.abs(a[0] - gx) ? b : a)); o += `<path d="${poly([[p[0] - 1.6, p[1]], [p[0] - 1.4, p[1] - 8.6], [p[0] + 0.2, p[1] - 9.4], [p[0] + 1.6, p[1] - 8.4], [p[0] + 1.7, p[1]]])}" fill="${C.fLight}"/><path d="${poly([[p[0] - 1.4, p[1] - 8.6], [p[0] + 0.2, p[1] - 9.4], [p[0] + 1.5, p[1] - 8.4], [p[0] + 0.1, p[1] - 7.6]])}" fill="${C.fPale}"/>`; });
  return o;
}

/** A stone water trough for the sheep. */
function trough(x, y) {
  return `<g transform="translate(${x} ${y})">${contact(0.5, 0.4, 9.6, 1.3)}<path d="M-8.4 0 L-9 -5 H9 L8.4 0 Z" fill="${C.fLight}"/><path d="M-8.4 0 L-9 -5 H-3 L-3.4 0 Z" fill="${C.fGlow}"/><path d="M-9.4 -5.6 H9.4 L9 -4.2 H-9 Z" fill="${C.fPale}"/>` +
    `<path d="M-8 -5 H8 L7.6 -4.2 H-7.6 Z" fill="${C.mere}"/><path d="M-6 -4.6 h5" stroke="${C.mereLight}" stroke-width="0.35" stroke-linecap="round"/><path d="M5 -1.6 q1 -2 2.6 -1.6" stroke="${C.moss}" stroke-width="0.8" stroke-linecap="round" fill="none"/></g>`;
}

/** The board at the foot of the steps: the hill carved on it, its trail dotted up to a flag on the top. */
function trailBoard(x, y) {
  return `<g transform="translate(${x} ${y})">${contact(0, 0.4, 13, 1.2)}<rect x="-10" y="-13" width="1.8" height="13" fill="${C.clay4}"/><rect x="8.2" y="-13" width="1.8" height="13" fill="${C.clay4}"/><rect x="-10" y="-13" width="0.7" height="13" fill="${C.clay3}"/>` +
    `<rect x="-12" y="-25" width="24" height="13.4" rx="1.4" fill="${C.clay3}"/><rect x="-11" y="-24" width="22" height="11.4" rx="1" fill="${C.clay2}"/>` +
    `<path d="M-9 -13.6 C-6 -16 -3 -21 -0.6 -21.4 C2 -21 5 -16 8 -13.6 Z" fill="#8BA348"/><path d="M-0.6 -21.4 C2 -21 5 -16 8 -13.6 H2.4 C1.6 -17 0.6 -20 -0.6 -21.4 Z" fill="#6F8A34"/>` +
    `<path d="M-6.4 -14 L-3 -15.6 L0.4 -15 L-2.4 -17.4 L-0.6 -20.2" stroke="${C.paper}" stroke-width="0.55" stroke-dasharray="0.7 0.8" fill="none"/><path d="M-0.6 -21.4 v-2 h1.8 l-0.5 0.5 l0.5 0.5 h-1.8" fill="${C.fGlow}"/><circle cx="3.4" cy="-16.4" r="0.8" fill="${C.mere}"/>` +
    `<rect x="-13" y="-26.4" width="26" height="2" rx="1" fill="${C.clay4}"/></g>`;
}

/** A log laid on two stumps to balance along, its bark ridged and one end showing its rings. */
function balanceLog(x, y) {
  return `<g transform="translate(${x} ${y})">${contact(18, 0.6, 21, 1.6)}<rect x="3" y="-4" width="4" height="4.4" rx="0.8" fill="${C.bark}"/><rect x="29" y="-4" width="4" height="4.4" rx="0.8" fill="${C.bark}"/>` +
    `<rect x="0" y="-8.4" width="36" height="5" rx="2.5" fill="${C.clay3}"/><rect x="0" y="-8.4" width="36" height="1.6" rx="0.8" fill="${C.clay2}"/><path d="M5 -6 h7 M15 -5.2 h9 M27 -6.2 h6" stroke="${C.clay4}" stroke-width="0.5" stroke-linecap="round"/>` +
    `<ellipse cx="35.6" cy="-5.9" rx="1.7" ry="2.5" fill="${C.clay1}"/><ellipse cx="35.6" cy="-5.9" rx="0.9" ry="1.4" fill="none" stroke="${C.clay2}" stroke-width="0.35"/></g>`;
}

/** A rope handrail on short posts up the right side of the steep top steps. */
function ropeRail() {
  const posts = [7, 9, 11, 13, 14].map((i) => { const [x, y, w] = STEP_AT(i); return [x + w + 3, y + 3]; });
  let o = ''; let rope = '';
  posts.forEach(([x, y], i) => {
    o += contact(x + 0.3, y + 0.2, 1.4, 0.4, 0.18) + `<rect x="${f(x - 0.6)}" y="${f(y - 7)}" width="1.3" height="7" rx="0.4" fill="${C.clay4}"/><rect x="${f(x - 0.6)}" y="${f(y - 7)}" width="0.5" height="7" fill="${C.clay3}"/>`;
    if (i) { const [px, py] = posts[i - 1]; rope += `M${f(px)} ${f(py - 6.2)}Q${f((px + x) / 2)} ${f((py + y) / 2 - 3.4)} ${f(x)} ${f(y - 6.2)}`; }
  });
  return o + `<path d="${rope}" stroke="${C.sand}" stroke-width="0.7" fill="none" stroke-linecap="round"/><path d="${rope}" stroke="${C.clay1}" stroke-width="0.7" stroke-dasharray="0.8 1.2" fill="none"/>`;
}

/** Tall grass with seed heads that sways in the wind (life layer). */
function swayGrass(x, y, delay) {
  let o = '';
  for (let i = 0; i < 4; i += 1) { const lean = (i - 1.5) * 1.1; const h = 7 + r(0, 3); o += `<path d="M${f(x + i * 0.6 - 0.9)} ${y} q${f(lean * 0.4)} ${f(-h * 0.6)} ${f(lean)} ${f(-h)}" stroke="${pick(['#7E9A3A', '#97AE52', '#6F8A34'])}" stroke-width="0.5" stroke-linecap="round" fill="none"/>`; if (i % 2 === 0) o += `<ellipse cx="${f(x + i * 0.6 - 0.9 + lean)}" cy="${f(y - h - 0.8)}" rx="0.45" ry="1.3" fill="${C.sand}" transform="rotate(${f(lean * 8)} ${f(x + i * 0.6 - 0.9 + lean)} ${f(y - h - 0.8)})"/>`; }
  return `<g class="km-sway" style="animation-delay:-${delay}s">${o}</g>`;
}

function hillBody() {
  // Stepping Hill: one big grassy hill (owner, 2026-10-07: "the stones can still be like a large hill, but proportions
  // matter"), the biggest thing in the park, built to the Orchard's level of detail. Hill units, scale 2.6.
  HILL_LIFE = '';
  const out = ownSeed(HILL_SEED, () => {
    const streamPts = sample(STREAM_HILL, 2);
    const swPts = sample(SWITCHBACK, 2);
    const stepPts = []; for (let i = 0; i <= 15; i += 1) { const [x, y, w] = STEP_AT(i); stepPts.push([x + w / 2, y + 2, w / 2 + 1]); }
    const avoid = (x, y) => near(streamPts, x, y, 3.2) || near(stepPts, x, y, 1.5) || near(swPts, x, y, 3.6) || ((x - 930) / 44) ** 2 + ((y - 432) / 16) ** 2 < 1 || (x > 788 && x < 852 && y < 302);
    let o = `<clipPath id="km-hill-clip"><path d="${HILL_SIL}"/></clipPath>`;
    // The hill in four papers, lightest on the side the morning sun is on, meeting at the top.
    const tone = (p1, p2, p3, amp, ph, fill) => {
      const pts = [];
      for (let i = 1; i <= 48; i += 1) { const t = i / 48; pts.push([bez(820, p1[0], p2[0], p3[0], t) + amp * Math.sin(t * 11 + ph) * Math.sin(t * Math.PI), bez(278, p1[1], p2[1], p3[1], t)]); }
      return `<path d="${HILL_UP} L${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' ')} Z" fill="${fill}"/>`;
    };
    o += `<g filter="url(#layer)"><path d="${HILL_SIL}" fill="#6F8A34"/>${tone([856, 380], [834, 480], [824, 556], 5, 1, '#7A9538')}`;
    o += `${tone([836, 380], [800, 480], [772, 556], 6, 2.6, '#859E44')}${tone([780, 330], [712, 436], [680, 556], 5, 4, '#8FA74B')}</g>`;
    o += `<g clip-path="url(#km-hill-clip)">`;
    // Meadow patches in several greens wrapped round the slope, each a paper on a short shadow.
    let mead = '';
    [[296, 12, 0.3, 1.25, '#9DB55A'], [318, 12, 1.75, 2.6, '#6A8532'], [340, 15, 0.12, 0.95, '#A5BC62'], [350, 10, 1.05, 1.5, '#86A044'], [370, 13, 2, 2.95, '#62802E'],
      [394, 16, 0.06, 0.7, '#9DB55A'], [404, 12, 0.85, 1.42, '#93AC4E'], [418, 14, 1.85, 2.55, '#6D8834'], [444, 15, 0.2, 0.95, '#A0B85D'], [452, 12, 1.2, 1.62, '#7C9840'],
      [466, 14, 2.35, 3.05, '#5F7A2C'], [486, 17, 0.05, 0.58, '#96AF52'], [492, 13, 0.7, 1.28, '#9AB257'], [506, 15, 1.9, 2.55, '#678231'], [522, 13, 0.32, 1.08, '#A5BC62'], [530, 13, 1.38, 2.2, '#72903A']].forEach(([y0, th, a0, a1, c]) => { mead += patch(y0, th, a0, a1, c); });
    o += `<g filter="url(#km-layer-xs)">${mead}</g>`;
    // The foot of the sunny side in two darker papers, stepping down toward the Orchard's olive ground in front of it.
    o += `<path d="M520 556 C548 524 590 512 640 514 C688 516 730 526 790 530 C810 532 822 540 826 556 Z" fill="#7F9B3F"/><path d="M520 556 C556 534 600 526 650 530 C700 534 740 538 790 542 C806 544 814 550 816 556 Z" fill="#738E37"/>`;
    // A darker skirt where the hill meets the meadow at its foot, so the grass runs on without a seam.
    o += `<path d="M188 556 C400 540 600 530 820 530 C1040 528 1200 540 1340 556 Z" fill="#6E8A33" opacity="0.55"/>`;
    o += stepsTrail() + switchback();
    o += hillGrass(avoid) + hillFlowers(avoid);
    const peb = [[], [], []];
    for (let i = 0; i < N(30); i += 1) { const y = r(300, 550); const [l, rr] = hillEdge(y); const x = r(l + 3, rr - 3); if (!avoid(x, y)) peb[i % 3].push([x, y, r(0.6, 1.5)]); }
    o += blobs(C.fGlow, peb[0]) + blobs(C.fLight, peb[1]) + blobs(C.fStone, peb[2]);
    o += `</g>`;
    // The pool in its scoop on the shoulder, and the stream out of it, over two ledges and down behind the dog house.
    o += poolBack() + streamHill() + poolFront();
    o += steps();
    // Everything that stands on the hill, the far things first.
    const things = [
      [300, granite(820, 300, 104, 22, true) + granite(776, 302, 26, 9, true) + granite(864, 301, 22, 8, false)],
      [302, shrub(760, 302, 0.6, 'gorse')], [300, shrub(880, 301, 0.55, 'juniper')],
      [322, ownSeed(PINE_SEED, () => shrub(900, 322, 0.62, 'juniper'))], [330, granite(744, 330, 22, 10, true)], [336, sheep(800, 336, 0.85 * FLOCK, false, 'lie')],
      [346, ownSeed(PINE_SEED + 1, () => shrub(735, 346, 0.6, 'juniper'))], [352, ownSeed(PINE_SEED + 2, () => shrub(748, 352, 0.5, 'gorse'))], [354, granite(836, 354, 28, 12, false)],
      [362, sheep(708, 362, 0.8 * FLOCK, false, 'look')], [366, shrub(724, 366, 0.6, 'gorse')], [382, granite(915, 382, 18, 8, true)],
      [392, granite(700, 392, 30, 13, true)], [394, shrub(856, 394, 0.7, 'bush')], [404, shrub(690, 404, 0.7, 'gorse')],
      [412, birch(676, 412, 44, -2)], [420, shrub(802, 420, 0.8, 'gorse')], [434, ownSeed(PINE_SEED + 3, () => shrub(818, 434, 0.85, 'juniper'))],
      [437, birch(988, 437, 50, 2)], [444, birch(1001, 444, 38, -1.5)], [452, granite(796, 452, 34, 15, true)],
      [455, bench(664, 455) + bird(668, 439.6, 1, false)], [455.5, rabbit(686, 455, 0.9, false)], [454, rabbit(903, 454, 0.85, true)],
      [458, shrub(1014, 458, 0.7, 'bush')], [459, sheep(938, 459, 0.85 * FLOCK, true, 'lie')], [462, sheep(951, 463, 0.55 * FLOCK, true, 'lie', true)],
      [466, pine(1042, 466, 36)], [472, shrub(816, 474, 0.9, 'juniper')], [474, stoneWall([[826, 467], [862, 470.6], [900, 473], [940, 474.2], [972, 474]], [904, 919]) + bird(868, 463.4, 1, true)], [486, trough(884, 487)],
      [480, pine(630, 480, 46)], [502, shrub(918, 502, 0.8, 'gorse')], [504, pine(612, 504, 34)], [512, sheep(920, 512, 0.55 * FLOCK, false, 'look', true)],
      [514, shrub(606, 514, 0.9, 'juniper')], [524, granite(598, 530, 22, 9, true)], [527, trailBoard(620, 528)], [528, stretchBar(770, 528)], [529, balanceLog(806, 530)], [453, ropeRail()],
      [466, fern(1004, 466, 1, true)], [476, fern(999, 477, 0.9)], [471, fern(1021, 471.5, 0.8)], [483, fern(1013, 484, 0.85, true)], [500, fern(1047, 499.5, 0.8, true)], [508, fern(1035, 508.5, 0.9)], [445, fern(975, 445.4, 0.7)],
      [391, stack(981, 391, 1.5) + marker(975, 401, 3, 1.6)], [453, stack(850, 453, 1.5) + marker(853, 466, 2, 1.6)], [499, stack(998, 499, 1.6) + marker(992, 512, 1, 1.6)], [332, stack(846, 332, 1.35) + marker(850, 344, 4, 1.45)],
    ];
    things.sort((a, b) => a[0] - b[0]);
    o += `<g filter="url(#layer-sm)">${things.map((t) => t[1]).join('')}</g>`;
    o += lookout();
    // What moves on the hill, drawn in the life layer: flags at the turns and on the top, grazing sheep, butterflies,
    // grass in the wind and a dragonfly over the pool.
    let life = flag(786, 288, 66, C.fGlow, 0, 2) + flag(987, 393, 22, C.paper, 0.8, 1.45) + flag(844, 453, 22, C.sand, 1.6, 1.45) + flag(1005, 500, 24, C.paper, 0.4, 1.5) + flag(840, 333, 20, C.sand, 1.2, 1.35);
    life += sheep(850, 497, 0.9 * FLOCK, true, 'graze') + sheep(906, 507, 0.85 * FLOCK, false, 'graze') + sheep(776, 406, 0.8 * FLOCK, true, 'graze');
    life += swayGrass(862, 520, 0) + swayGrass(792, 476, 1.4) + swayGrass(1002, 461, 2.2) + swayGrass(706, 432, 3) + swayGrass(948, 486, 0.7) + swayGrass(732, 380, 2.6);
    life += butterfly(742, 428, C.paper, 0) + butterfly(872, 532, '#F2D27A', 3) + butterfly(690, 384, C.cream, 6);
    life += `<g transform="translate(916 424) scale(1.3)" class="km-day-only"><g class="km-flit" style="animation-duration:6s;animation-delay:-2s"><g class="km-wing"><path d="M-1.6 -0.4 q-1 -3 0.4 -3.2 q0.6 1.6 -0.4 3.2 Z M0.4 -0.4 q0.4 -3.2 1.8 -3 q-0.4 1.8 -1.8 3 Z" fill="${C.paper}" opacity="0.85"/></g><path d="M-3 0 H5" stroke="${C.mereShine}" stroke-width="0.7" stroke-linecap="round"/><circle cx="-3.4" cy="-0.1" r="0.75" fill="${C.mere}"/></g></g>`;
    hillLive(life);
    return o;
  });
  for (let i = 0; i < HILL_DRAWS; i += 1) rnd(); // the park's random sequence moves on as it did when the hill drew from it
  LIFE += `<g transform="${HILL_TO_LAND}">${HILL_LIFE}</g>`;
  return g('id="km-hill"', out);
}

/**
 * The stream on the land (land units): it comes out from behind the dog house's right wall (the house hides where
 * it leaves the hill, so the two halves never show a seam), slips past the dog's bowl, runs under the bridge on the
 * Field path and cuts a little gully through the bank into the lake.
 */
function streamLand() {
  return ownSeed(HILL_SEED + 1, () => {
    const pts = sample(STREAM_LAND, 2);
    const wide = (k) => sample(STREAM_LAND.map(([x, y, w]) => [x, y, w + k]), 2);
    let o = `<clipPath id="km-behind-house"><path d="M1000 470 H1260 V760 H1000 Z M1076 557 V527 H1068 L1065.4 523 L1067 518 L1103 491.6 L1106 490.6 L1109 491.6 L1145 518 L1146.6 523 L1144 527 H1136.2 V557 Z" clip-rule="evenodd"/></clipPath>`;
    o += `<g clip-path="url(#km-behind-house)">`;
    o += `<path d="${strip(wide(3), -1, 1, 1.6)}" fill="${WATER.bed}"/>`;
    // The cut it has worn down the face of the bank: wet earth either side of the water, darker in the shade.
    o += `<path d="M1115.6 671.4 C1119.6 684 1119 700 1116.6 721.4 H1152 C1149 700 1146.4 684 1148.4 671.4 C1140 668.4 1124 668.4 1115.6 671.4 Z" fill="#4A3A24"/>`;
    o += `<path d="M1117.8 672.6 C1121 685 1120.8 701 1119 721.4 H1124.4 C1124.4 701 1124.6 686 1123.8 672.6 Z" fill="${C.clay3}"/><path d="M1119.6 683 h3.4 M1119.4 697 h3.8 M1118.8 711 h4.6" stroke="${C.clay2}" stroke-width="0.9" stroke-linecap="round"/>`;
    o += `<path d="M1146.6 683 c1.6 3 0.4 6 2 9 M1145.6 700 c1.2 2.4 0.2 5 1.6 7.4" stroke="${C.dDark}" stroke-width="0.8" stroke-linecap="round" fill="none"/>`;
    o += `<path d="M1112 673.6 C1116 670 1120 670 1123 674.4 C1121 679 1118.6 680.6 1116.6 683 C1116.4 678.6 1115 676 1112 673.6 Z M1152 673.6 C1148 670 1144 670 1141.4 674.4 C1143.4 679 1145.8 680.6 1147.8 683 C1148 678.6 1149.2 676 1152 673.6 Z" fill="#5E7A2A"/>`;
    o += `<path d="${strip(wide(1.4), -1, 1, 0.6)}" fill="${WATER.wet}"/>`;
    o += `<path d="${strip(pts, -1, 1, 0.35)}" fill="${WATER.body}"/>`;
    o += `<path d="${strip(pts, -1, -0.35, 0.25)}" fill="${WATER.shine}"/>`;
    o += `<path d="${strip(pts, 0.55, 1, 0.2)}" fill="${WATER.deep}" opacity="0.55"/>`;
    [[1139.6, 566, 1.5], [1131, 578, 1.2], [1127, 616, 1.4], [1134.6, 634, 1.1], [1126.6, 652, 1.3], [1135.4, 668, 1.2], [1129, 690, 1.6], [1137.6, 704, 1.4], [1127.4, 712, 1.2]].forEach(([x, y, s]) => {
      o += `<ellipse cx="${x}" cy="${f(y + 0.6 * s)}" rx="${f(2.2 * s)}" ry="${f(1.3 * s)}" fill="${WATER.deep}"/><ellipse cx="${x}" cy="${y}" rx="${f(2 * s)}" ry="${f(1.2 * s)}" fill="${C.fLight}"/><ellipse cx="${f(x - 0.5 * s)}" cy="${f(y - 0.4 * s)}" rx="${f(1.2 * s)}" ry="${f(0.6 * s)}" fill="${C.fPale}"/><path d="M${f(x - 1.6 * s)} ${f(y - 2 * s)} q1.6 -1 3.2 0" stroke="${WATER.foam}" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.85"/>`;
    });
    // Grass leaning in over both banks, down to where the bank drops to the lake.
    let fringe = '';
    [-1, 1].forEach((k) => {
      offset(sample(STREAM_LAND.slice(3, 13), 2), k, (i) => k * (1.6 + Math.sin(i * 0.7) * 0.8)).forEach(([x, y], i) => {
        if (i % 2 === 0 && y > 548 && y < 672) fringe += `<use href="#kmt-${pick(['a', 'd', 'e', 'b'])}" x="${f(x)}" y="${f(y + r(0, 1.2))}"/>`;
      });
    });
    o += fringe + `</g>`;
    // The house's shadow carries on across the water beside it.
    o += `<ellipse cx="1137.4" cy="558" rx="6.4" ry="2.6" fill="${C.ink}" opacity="0.16"/>`;
    // Ferns, rushes and kingcups along its banks.
    let plants = '';
    [[1124.6, 566, 1], [1144.4, 579, -1], [1121.6, 606, 1], [1140.4, 620, -1], [1121.4, 640, 1], [1141, 656, -1], [1122.6, 664, 1]].forEach(([x, y, side]) => {
      for (let j = -2; j <= 2; j += 1) plants += `<path d="M${x} ${y} q${f(j * 1.4 - side)} ${f(-3.4)} ${f(j * 2.6 - side * 1.6)} ${f(-5.6 + Math.abs(j) * 0.9)}" stroke="${pick(['#4F6E3A', '#5E7A2A', '#6E8A42'])}" stroke-width="0.9" stroke-linecap="round" fill="none"/>`;
      if (rnd() > 0.4) plants += `<circle cx="${f(x + side * 2.4)}" cy="${f(y - 1.4)}" r="1.1" fill="#F2D27A"/><circle cx="${f(x + side * 2.4)}" cy="${f(y - 1.4)}" r="0.45" fill="#C9A43A"/>`;
    });
    for (let i = 0; i < 6; i += 1) { const x = 1143 + i * 1.4; const h = r(10, 16); plants += `<path d="M${f(x)} 642 q${f(r(-1, 1))} ${f(-h / 2)} ${f(r(-2, 2))} ${f(-h)}" stroke="${pick(['#5E7A2A', '#4F6E3A'])}" stroke-width="0.8" stroke-linecap="round" fill="none"/>`; if (i % 2) plants += `<rect x="${f(x - 0.7)}" y="${f(642 - h * 0.88)}" width="1.4" height="4" rx="0.7" fill="${C.clay4}"/>`; }
    o += plants;
    // The bridge on the Field path, in its old place: granite footings, a planked arch, posts and a rail. At the scale of
    // who crosses it (owner, 2026-10-09: "bridge scale"): a keeper and the dog fit across, landing on dry bank.
    o += `<g transform="translate(1131 597) scale(1.3)" filter="url(#layer-sm)">` +
      `<path d="M-31 10 L-29 0 L-18 -1.4 L-16 10 Z" fill="${C.fLight}"/><path d="M-29.4 1.2 L-18.6 0 L-18.2 3.4 L-29 4.6 Z" fill="${C.fGlow}"/><path d="M16 10 L18 -1.4 L29 0 L31 10 Z" fill="${C.fLight}"/><path d="M18.6 0 L29.4 1.2 L29 4.6 L18.2 3.4 Z" fill="${C.fGlow}"/>` +
      `<path d="M-16 9 C-8 5 8 5 16 9 C8 11.4 -8 11.4 -16 9 Z" fill="${C.mereDeep}" opacity="0.7"/>` +
      `<path d="M-27 4 C-15 -9.4 15 -9.4 27 4 L27 8.6 C15 -3.4 -15 -3.4 -27 8.6 Z" fill="${C.clay3}"/><path d="M-27 4 C-15 -9.4 15 -9.4 27 4 L25.6 1.6 C14 -10.8 -14 -10.8 -25.6 1.6 Z" fill="${C.clay2}"/>` +
      `<path d="M-20 -0.6 l0.6 3.4 M-12 -4.4 l0.4 3.4 M-4 -6 v3.4 M4 -6 v3.4 M12 -4.4 l-0.4 3.4 M20 -0.6 l-0.6 3.4" stroke="${C.clay4}" stroke-width="0.8" stroke-linecap="round"/>` +
      `<path d="M-22 2 V-9.4 M-8 -5.4 V-16 M8 -5.4 V-16 M22 2 V-9.4" stroke="${C.clay4}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M-23 -9.4 C-11 -19.4 11 -19.4 23 -9.4" stroke="${C.clay3}" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M-23 -10.2 C-11 -20.2 11 -20.2 23 -10.2" stroke="${C.clay1}" stroke-width="0.8" stroke-linecap="round" fill="none"/></g>`;
    // The moving water, in the life layer: flow lines above the bridge, below it, and quicker down the gully.
    // (A land unit is 2 in the world and a hill unit 2.6, so 0.77 of the time keeps the water at one speed.)
    let life = flowLines(sample(STREAM_LAND.slice(4, 7), 1.5).slice(1), FLOW_LANES, 0.77, 1.3);
    life += flowLines(sample(STREAM_LAND.slice(8, 13), 1.5).slice(1), FLOW_LANES, 0.77, 1.3);
    life += flowLines(sample(STREAM_LAND.slice(12, 16), 1.5).slice(1, -2), FLOW_LANES, 0.46, 1.3);
    live(`<g class="km-stream-life">${life}</g>`);
    return o;
  });
}

/** The worn trail from the foot of the stone steps to the start of the path to the signpost (land units). */
// The same, as one of the dirt shapes laid down with the paths (dirtGround): its end runs into the path to the
// signpost as one piece of ground, no seam (owner, 2026-10-09: "polishing up the end points").
function stepsFootShape() {
  const d = 'M603 532.6 Q628 533 657 540.2 C661 552 677 564 701 571 L692 579 C656 576 612 562 603 532.6 Z';
  const moved = d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${f(Number(x) + 1)} ${f(Number(y) + 1.4)}`);
  const spine = [[612, 535, 10], [632, 538, 13], [652, 546, 11], [666, 557, 9], [680, 566, 7], [694, 574, 5]];
  return {
    edge: moved, earth: d, worn: 'M614 534.6 Q631 535 646 539.4 C652 551 670 563 694 573.4 C664 570 626 558 614 534.6 Z',
    extra: `<path d="M609 538 h3 M650 543 h2.6 M624 549 h2 M660 561 h2.4 M676 569 h2" stroke="${C.fLight}" stroke-width="1.4" stroke-linecap="round"/>`,
    peb: [], tufts: [[604, 538, 'a'], [608, 549, 'd'], [619, 558, 'b'], [636, 566, 'e'], [655, 572, 'a'], [673, 577, 'd'], [659, 546, 'b'], [664, 554, 'e'], [676, 561, 'a'], [688, 566, 'b']],
    on: (x, y, m) => near(spine, x, y, m),
  };
}

/** Where the stream meets the lake: its lighter water fanning out, a bar of sand either side, rings spreading. */
function streamMouth() {
  return ownSeed(HILL_SEED + 2, () => {
    let o = `<path d="M1124 719 C1121 728 1108 739 1094 745 C1116 750 1152 750 1172 744 C1158 738 1146 728 1143 719 Z" fill="${C.mereShine}" opacity="0.7"/>`;
    o += `<path d="M1127 719 C1126 726 1121 733 1114 738 C1128 741.6 1143 741.6 1155 737 C1148 732 1143 726 1141 719 Z" fill="#3E8090" opacity="0.55"/>`;
    o += `<path d="M1106 719.4 C1110 717.6 1120 717.4 1125 719 C1122 722.6 1112 724.4 1104 722.6 Z" fill="${C.sand}"/><path d="M1104 722.6 C1112 724.4 1122 722.6 1125 719 L1124.6 721 C1121 724.4 1112 726 1105 724 Z" fill="#C2AF8A"/>`;
    o += `<path d="M1143 719 C1148 717.4 1158 717.6 1164 719.6 C1158 722.8 1148 723.4 1142.4 721.6 Z" fill="${C.sand}"/><path d="M1142.4 721.6 C1148 723.4 1158 722.8 1164 719.6 L1163.2 721.6 C1158 724.6 1148 725 1142.6 723.4 Z" fill="#C2AF8A"/>`;
    o += blobs(C.fGlow, [[1110, 720.6, 1], [1117, 721.6, 0.8], [1150, 720.6, 0.9], [1157, 720.4, 1.1]]) + blobs(C.fLight, [[1113.6, 721.2, 0.7], [1153.6, 721.4, 0.7]]);
    o += `<path d="M1118 732 q16 4 32 0 M1110 740 q24 5 48 0" stroke="${C.mereLight}" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.45"/>`;
    let life = '';
    for (let i = 0; i < 3; i += 1) life += `<ellipse cx="1134" cy="731" rx="${18 + i * 4}" ry="${f(4.2 + i)}" fill="none" stroke="${C.mereLight}" stroke-width="1.2" opacity="0.5" class="km-ripple" style="animation-delay:-${f(i * 1.4)}s"/>`;
    live(`<g class="km-mouth-life">${life}</g>`);
    return o;
  });
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
  LIFE += `<g transform="translate(960 566)"><path d="M0 0 V-46" stroke="${C.bark}" stroke-width="3.5" stroke-linecap="round"/><circle cx="0" cy="-48" r="3.5" fill="${C.fGlow}"/><path d="M0 -44 c10 4 16 12 24 10 c-6 -4 -8 -8 -12 -12" fill="${C.fGlow}" class="km-flag"/><path d="M0 -38 c8 6 12 14 20 14 c-6 -4 -6 -10 -10 -14" fill="${C.paper}" class="km-flag" style="animation-delay:-1s"/></g>`;
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

/* Owner, 2026-10-09: "trees detail". One builder for every orchard tree, each on a seed of its own: its shadow on the
   grass, a trunk with bark and a root flare, limbs reaching into an uneven, leafy crown in four greens lit from the
   morning side (the hour's light tints it at night like everything else), and avocados that hang on stems from twigs
   under the crown, fewer and where fruit grows. kind 'young' is the sapling on its stake. */
const TREE_SEED = 20261014;
function orchardTree(x, base, h, rad, kind) {
  const young = kind === 'young';
  const cy = base - h - rad * 0.35;
  const tw = Math.max(2.6, rad * 0.1);
  const lit = (bx, by) => ((bx - x) * -0.62 + (by - cy) * -0.78) / rad;   // the morning sun is up and to the left
  let o = `<ellipse cx="${f(x + rad * 0.3)}" cy="${f(base + 1.5)}" rx="${f(rad * 0.95)}" ry="${f(rad * 0.15)}" fill="${C.ink}" opacity="0.16"/>`;
  // roots, the trunk, its sunny side and its bark
  for (const s of [-1, 1]) o += `<path d="M${f(x + s * tw * 0.5)} ${f(base - tw * 1.6)} C${f(x + s * tw * 1.1)} ${f(base - tw * 0.4)} ${f(x + s * tw * 2)} ${f(base)} ${f(x + s * tw * 2.8)} ${f(base + 0.8)}" stroke="${C.bark}" stroke-width="${f(tw * 0.75)}" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M${f(x - tw * 1.4)} ${base} C${f(x - tw * 0.8)} ${f(base - h * 0.3)} ${f(x - tw * 0.7)} ${f(base - h * 0.7)} ${f(x - tw * 0.45)} ${f(base - h)} H${f(x + tw * 0.45)} C${f(x + tw * 0.75)} ${f(base - h * 0.7)} ${f(x + tw * 0.85)} ${f(base - h * 0.3)} ${f(x + tw * 1.4)} ${base} Z" fill="${C.bark}"/>`;
  o += `<path d="M${f(x - tw * 1.1)} ${base} C${f(x - tw * 0.6)} ${f(base - h * 0.3)} ${f(x - tw * 0.5)} ${f(base - h * 0.7)} ${f(x - tw * 0.3)} ${f(base - h)} L${f(x - tw * 0.05)} ${f(base - h)} C${f(x - tw * 0.2)} ${f(base - h * 0.6)} ${f(x - tw * 0.3)} ${f(base - h * 0.3)} ${f(x - tw * 0.3)} ${base} Z" fill="#8A6440" opacity="0.55"/>`;
  for (let i = 0; i < (young ? 2 : 5); i += 1) {
    const bx = x + r(-tw * 0.6, tw * 0.6); const by = base - r(h * 0.08, h * 0.7);
    o += `<path d="M${f(bx)} ${f(by)} q${f(r(-1.5, 1.5))} ${f(-h * 0.06)} ${f(r(-0.5, 0.5))} ${f(-h * 0.12)}" stroke="#4A2F18" stroke-width="${f(Math.max(0.6, tw * 0.18))}" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  }
  // limbs into the crown
  const fork = [x, base - h * 0.82];
  const limbs = young ? [[-0.6, -0.7], [0.55, -0.75]] : [[-0.95, -0.45], [-0.5, -0.85], [0.08, -1], [0.55, -0.82], [0.92, -0.42]];
  for (const [dx, dy] of limbs) {
    const ex = x + dx * rad * 0.78; const ey = cy + dy * rad * 0.55;
    o += `<path d="M${f(fork[0])} ${f(fork[1])} Q${f(x + dx * rad * 0.3)} ${f(fork[1] - rad * 0.1)} ${f(ex)} ${f(ey)}" stroke="${C.bark}" stroke-width="${f(tw * 0.8)}" stroke-linecap="round" fill="none"/>`;
  }
  // the crown: overlapping clumps, darkest behind, lighter toward the sun
  const clumps = [];
  for (let i = 0; i < (young ? 12 : 26); i += 1) { const a = r(0, Math.PI * 2); const d = Math.sqrt(rnd()) * rad * 0.78; clumps.push([x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.82, r(rad * 0.22, rad * 0.36)]); }
  clumps.sort((a, b) => a[1] - b[1]);
  o += blobs('#2F3A10', clumps.map(([bx, by, br]) => [bx, by + br * 0.12, br * 1.08]));
  o += blobs('#3E4A14', clumps.map(([bx, by, br]) => [bx, by, br]));
  o += blobs(C.nLand, clumps.filter(([bx, by]) => lit(bx, by) > -0.35).map(([bx, by, br]) => [bx - br * 0.12, by - br * 0.14, br * 0.84]));
  o += blobs(C.nLeaf, clumps.filter(([bx, by]) => lit(bx, by) > 0.05).map(([bx, by, br]) => [bx - br * 0.2, by - br * 0.24, br * 0.6]));
  o += blobs('#8E9C34', clumps.filter(([bx, by]) => lit(bx, by) > 0.42).map(([bx, by, br]) => [bx - br * 0.28, by - br * 0.32, br * 0.32]));
  // a leafy edge: single leaves standing out round the crown
  for (let i = 0; i < (young ? 18 : 44); i += 1) {
    const a = (i / (young ? 18 : 44)) * Math.PI * 2 + r(-0.07, 0.07);
    const d = rad * r(0.8, 0.94);
    const lx = x + Math.cos(a) * d; const ly = cy + Math.sin(a) * d * 0.82;
    const k = lit(lx, ly);
    o += `<path d="M0 0 C3 -3 9 -3.6 13 -2 C9 1 4 1.6 0 0 Z" fill="${k > 0.3 ? C.nLeaf : k > -0.3 ? C.nLand : '#3E4A14'}" transform="translate(${f(lx)} ${f(ly)}) rotate(${f((a * 180) / Math.PI + r(-25, 25))}) scale(${f(rad / 110 + 0.15)})"/>`;
  }
  // twigs showing through underneath, and the avocados hanging from them
  const fruit = young ? 2 : 7;
  for (let i = 0; i < fruit; i += 1) {
    const a = Math.PI * (0.18 + (0.64 * (i + r(0.2, 0.8))) / fruit);
    const tx = x + Math.cos(a) * rad * r(0.4, 0.78); const ty = cy + Math.sin(a) * rad * r(0.42, 0.66);
    const k = Math.max(0.55, rad / 70);
    o += `<path d="M${f(tx - 6 * k)} ${f(ty - 5 * k)} Q${f(tx - 2 * k)} ${f(ty - 7 * k)} ${f(tx)} ${f(ty - 4 * k)}" stroke="${C.bark}" stroke-width="${f(1.2 * k)}" stroke-linecap="round" fill="none"/>`;
    o += `<g transform="translate(${f(tx)} ${f(ty + 6 * k)}) scale(${f(k * 0.8)})"><path d="M0 -12 v5" stroke="${C.bark}" stroke-width="1.3"/>` +
      `<path d="M0 -8 c4 0 4 5 3 7 c5 3 6 10 0 11 c-2 0.7 -4 0.7 -6 0 c-6 -1 -5 -8 0 -11 c-1 -2 -1 -7 3 -7 Z" fill="#4B5A16" stroke="#26300C" stroke-width="0.8"/>` +
      `<path d="M-3.4 2 c-1.4 2.4 -1 5.6 1 6.6" stroke="#A3B152" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.85"/><ellipse cx="-1.2" cy="-5" rx="0.9" ry="1.6" fill="#A3B152" opacity="0.7"/></g>`;
  }
  return o;
}

const STRING = { x0: 150, y0: 404, cx: 330, cy: 476, x1: 505, y1: 444, n: 15 };
function stringPoint(t) {
  const { x0, y0, cx, cy, x1, y1 } = STRING;
  return [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
}

/*
 * The Orchard's detail, to the Hill's and the Field's standard (owner, 2026-10-09: "we did so much good detailed work
 * on the hill and the field that now the orchard is looking like the slacker in design detail"). Land units. The
 * ground first (under everything on it): meadow patches in the orchard's greens, dappled light under the two trees,
 * tufts and drifts of wildflowers in the hill's own pieces (kmt-*, kmf-*), fallen leaves and windfall avocados. Then
 * what stands in it: a crate of the harvest, a mossy log, ferns and shrubs at its edges, a ring of mushrooms, stepping
 * stones down from the larder. Each on a seed of its own, so nothing else in the park moves.
 */
const ORCHARD_SEED = 20261011;
// Where the orchard's ground is open (not under the table, the blanket, the beds, the larder, the ladder or the path).
function orchardOpen(x, y) {
  const ground = (y >= 590 && y <= 690 && x <= 600) || (y >= 532 && y < 590 && x <= 560) || (y >= 486 && y <= 528 && x <= 356) || (y >= 436 && y <= 468 && x <= 246);
  if (!ground) return false;
  return !((x > 340 && x < 505 && y > 512 && y < 586) || (x > 180 && x < 286 && y > 582 && y < 620) || (x > 18 && x < 162 && y > 554 && y < 598)
    || (x > 174 && x < 220 && y > 564 && y < 588) || (x > 452 && x < 540 && y > 440 && y < 560) || (x > 252 && x < 360 && y > 440 && y < 512)
    || (y > 568 && y < 618 && x > 488));
}
function orchardGround() {
  let o = '';
  const wobble = (cx, cy, rx, ry) => {
    const pts = [];
    for (let i = 0; i < 16; i += 1) { const a = (i / 16) * Math.PI * 2; const k = r(0.82, 1.12); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${f((pts[15][0] + pts[0][0]) / 2)} ${f((pts[15][1] + pts[0][1]) / 2)}`;
    pts.forEach((p, i) => { const q = pts[(i + 1) % 16]; d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`; });
    return `${d}Z`;
  };
  // Meadow patches: lighter where the sun reaches, deeper in the long grass, as the hill's are.
  [[96, 644, 76, 15, '#97A63C', 0.8], [300, 664, 96, 17, '#76862A', 0.7], [526, 652, 70, 13, '#A2B04A', 0.75], [150, 498, 64, 8, '#97A63C', 0.75],
    [70, 450, 44, 6, '#A2B04A', 0.75], [418, 626, 58, 9, '#76862A', 0.65], [262, 548, 54, 8, '#97A63C', 0.7], [40, 612, 34, 8, '#76862A', 0.7],
    [560, 600, 36, 7, '#A2B04A', 0.65], [190, 676, 60, 9, '#A2B04A', 0.65]].forEach(([cx, cy, rx, ry, col, op]) => { o += `<path d="${wobble(cx, cy, rx, ry)}" fill="${col}" opacity="${op}"/>`; });
  // Dappled light under the two avocado trees by day; under the string lights the night's own glow does it.
  [[120, 470, 58, 7], [100, 476, 22, 3], [520, 548, 70, 8], [548, 556, 26, 3]].forEach(([cx, cy, rx, ry], i) => {
    o += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${i % 2 ? '#F6F0B8' : '#2F3A10'}" opacity="${i % 2 ? 0.28 : 0.16}" class="${i % 2 ? 'km-day-only' : ''}"/>`;
  });
  // Fallen leaves and windfall avocados under the trees.
  const leaf = (x, y, a, col) => `<path d="M0 0 C3 -4 10 -5 15 -3 C11 1 4 2 0 0 Z" fill="${col}" transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(0.55)"/>`;
  for (let i = 0; i < 18; i += 1) { const t = i < 9; const x = t ? r(70, 176) : r(462, 580); const y = t ? r(462, 474) : r(540, 560); if (orchardOpen(x, y) || !t) o += leaf(x, y, r(-60, 60), pick([C.nLand, '#5F6C18', '#8A7A2A', C.nLeaf])); }
  [[96, 470], [152, 466], [556, 552], [584, 548]].forEach(([x, y], i) => { o += `${contact(x + 0.6, y + 2.6, 4, 1, 0.2)}<ellipse cx="${x}" cy="${y}" rx="3.4" ry="4.4" fill="${i % 2 ? '#3E4A14' : '#525C12'}" transform="rotate(${i % 2 ? 60 : -70} ${x} ${y})"/><ellipse cx="${x - 0.8}" cy="${y - 1.2}" rx="1" ry="1.6" fill="#7D8A26" transform="rotate(${i % 2 ? 60 : -70} ${x} ${y})"/>`; });
  // Tufts of grass and blades all over, as on the hill.
  let uses = '';
  for (let i = 0; i < N(260); i += 1) {
    const x = r(0, 600); const y = r(436, 690);
    if (!orchardOpen(x, y)) continue;
    uses += `<use href="#kmt-${y > 600 ? pick(['d', 'e', 'a', 'c']) : pick(['a', 'b', 'c', 'e'])}" x="${f(x)}" y="${f(y)}"/>`;
  }
  // Drifts of wildflowers and clover: daisies, buttercups, clover, harebells and the orchard's apricot blossom.
  const drifts = [[60, 630, 30, 7, 'wwy'], [150, 672, 34, 8, 'ycw'], [330, 640, 28, 6, 'wwc'], [420, 676, 30, 7, 'wyt'], [540, 668, 34, 7, 'ywb'],
    [92, 520, 24, 5, 'wcw'], [210, 510, 22, 5, 'yyw'], [40, 452, 18, 4, 'wtw'], [180, 452, 18, 4, 'ywc'], [300, 560, 18, 4, 'cww'], [590, 640, 14, 5, 'wyw']];
  drifts.forEach(([cx, cy, rx, ry, mix]) => {
    for (let i = 0; i < N(14); i += 1) {
      const a = r(0, Math.PI * 2); const d = Math.sqrt(rnd());
      const x = cx + Math.cos(a) * rx * d; const y = cy + Math.sin(a) * ry * d;
      if (orchardOpen(x, y)) uses += `<use href="#kmf-${pick(mix.split(''))}" x="${f(x)}" y="${f(y)}"/>`;
    }
  });
  return o + uses;
}
function orchardProps() {
  let o = '';
  // A crate of the harvest by the table's end, avocados heaped in it.
  o += `<g filter="url(#layer-sm)" transform="translate(226 540)">${contact(1, 9.6, 15, 2.2)}<rect x="-13" y="-4" width="26" height="13" rx="1.5" fill="${C.clay2}"/><path d="M-13 1 h26 M-13 5.4 h26" stroke="${C.clay3}" stroke-width="1.2"/><path d="M-11 -4 v13 M11 -4 v13" stroke="${C.clay3}" stroke-width="1.6"/>`;
  [[-8, -5], [-3, -6.4], [2.6, -5.6], [8, -5], [-5.4, -9], [0.4, -9.6], [5.6, -8.8]].forEach(([x, y], i) => { o += `<ellipse cx="${x}" cy="${y}" rx="3" ry="3.8" fill="${i % 3 ? '#3E4A14' : '#525C12'}" transform="rotate(${(i % 2 ? 1 : -1) * 18} ${x} ${y})"/>`; });
  o += `</g>`;
  // A mossy log at the meadow's front, with a fern at its end.
  o += `<g filter="url(#layer-sm)" transform="translate(560 676)">${contact(0, 4.4, 24, 2.4)}<rect x="-22" y="-6" width="44" height="10" rx="5" fill="${C.bark}"/><rect x="-22" y="-6" width="44" height="3.6" rx="1.8" fill="${C.clay2}" opacity="0.6"/>` +
    `<ellipse cx="22" cy="-1" rx="3.2" ry="5" fill="${C.clay3}"/><ellipse cx="22" cy="-1" rx="1.8" ry="3" fill="#E9C08A"/><path d="M-18 -6 c6 -3 14 -3 20 0 c-6 1 -14 1 -20 0 Z M6 -6 c4 -2 8 -2 10 0 c-3 1 -7 1 -10 0 Z" fill="${C.moss}"/></g>`;
  o += fern(530, 682, 1.3) + fern(8, 604, 1.2, true) + fern(232, 470, 1.1);
  // Shrubs at the orchard's edges, and one by the larder.
  o += shrub(16, 676, 1.4, 'bush') + shrub(590, 616, 1.2, 'bush') + shrub(244, 512, 1.1, 'juniper') + shrub(8, 520, 1.2, 'bush');
  // A ring of mushrooms in the shade of the big tree.
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2; const x = 176 + Math.cos(a) * 14; const y = 462 + Math.sin(a) * 3.6;
    o += `<path d="M${f(x - 0.6)} ${f(y)} v-2.6 h1.2 v2.6 Z" fill="${C.cream}"/><path d="M${f(x - 2.4)} ${f(y - 2.4)} a2.4 1.8 0 0 1 4.8 0 Z" fill="${i % 2 ? '#C24E1C' : '#B5643A'}"/><circle cx="${f(x - 0.8)}" cy="${f(y - 3.2)}" r="0.4" fill="${C.paper}"/>`;
  }
  // Stepping stones from the larder door down to the long table.
  [[292, 516, 5], [306, 524, 4.6], [320, 532, 4.4], [334, 540, 4]].forEach(([x, y, w]) => { o += `${contact(x + 0.5, y + 1.2, w + 0.6, 1.4, 0.16)}<ellipse cx="${x}" cy="${y + 0.5}" rx="${w}" ry="${f(w * 0.34)}" fill="#8F8A78"/><ellipse cx="${x}" cy="${y}" rx="${w}" ry="${f(w * 0.32)}" fill="#B9B2A0"/><ellipse cx="${x - 0.8}" cy="${y - 0.3}" rx="${f(w * 0.5)}" ry="${f(w * 0.14)}" fill="#CFC8B4"/>`; });
  return o;
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
  o += `<path d="M0 470 C80 466 180 470 250 478" stroke="${C.nLand}" stroke-width="10" stroke-linecap="round" fill="none"/>${stones(0, 250, 474, 5, [C.cream, C.creamDeep, '#D8D1BC'])}`;
  o += `<path d="M0 470 C80 466 180 470 250 478 Q259 483 248 488 C180 482 80 478 0 482 Z" fill="${C.nLeaf}"/>`;
  o += `<path d="M0 512 C120 508 260 512 360 520" stroke="${C.nLand}" stroke-width="10" stroke-linecap="round" fill="none"/>${stones(0, 360, 516, 5.5, [C.cream, C.creamDeep, '#D8D1BC'])}`;
  o += `<path d="M0 512 C120 508 260 512 360 520 Q369 525 358 530 C260 524 120 520 0 524 Z" fill="${C.nLeaf}"/>`;
  o += ownSeed(ORCHARD_SEED, orchardGround);
  // Top terrace: the big avocado tree, a young avocado on a stake, the straw beehive with bees.
  // (each old tree() still runs for its draws, discarded, so everything drawn after keeps its detail)
  tree(120, 462, 66, 58, ['#3E4A14', C.nLand, C.nLeaf, '#5F6C18'], C.nGlow, 'avocado');
  o += `<g filter="url(#layer-sm)">${ownSeed(TREE_SEED, () => orchardTree(120, 462, 66, 58))}</g>`;
  tree(44, 466, 30, 22, [C.nLand, C.nLeaf, C.nLeafLight], C.nGlow, 'avocado');
  o += `<g filter="url(#layer-sm)"><rect x="34" y="420" width="4" height="46" rx="2" fill="${C.clay3}"/>${ownSeed(TREE_SEED + 1, () => orchardTree(44, 466, 30, 22, 'young'))}<path d="M36 446 l8 2" stroke="${C.cream}" stroke-width="2"/></g>`;
  // The skep (owner, 2026-10-09: "polish this background scene up"): coils of straw, each stitched, its shady side
  // darker, on a grained stand.
  o += `<g filter="url(#layer-sm)" transform="translate(212 452)">${shadow(0, 18, 18, 3)}<path d="M-16 18 C-18 0 -8 -14 0 -14 C8 -14 18 0 16 18 Z" fill="${C.dGlow}"/>`;
  for (let i = 0; i < 6; i += 1) {
    const y = 16 - i * 5; const w = Math.sqrt(Math.max(0, 1 - ((14 - y) / 30) ** 2)) * 16 - i * 0.6;
    o += `<path d="M${f(-w)} ${f(y)} Q0 ${f(y + 2.2)} ${f(w)} ${f(y)}" stroke="${C.nGlowDeep}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    for (let k = -2; k <= 2; k += 1) o += `<path d="M${f(k * w * 0.36 - 0.8)} ${f(y - 1.6)} l1.6 2.4" stroke="#C9822B" stroke-width="0.7" stroke-linecap="round"/>`;
  }
  o += `<path d="M2 -14 C10 -12 18 0 16 18 H4 C8 6 7 -6 2 -14 Z" fill="#7A4A1C" opacity="0.22"/>`;
  o += `<path d="M-4 18 a4 5 0 0 1 8 0" fill="${C.clay4}"/><rect x="-20" y="18" width="40" height="5" rx="2.5" fill="${C.clay3}"/><path d="M-17 20 h12 M2 21.4 h14" stroke="${C.clay4}" stroke-width="0.6" opacity="0.8"/></g>`;
  [[236, 424], [248, 436], [226, 414]].forEach(([x, y], i) => { LIFE += `<g class="km-buzz km-day-only" style="animation-delay:-${i}s"><path d="M${x - 3} ${y + 0.6} c-4 2 -8 -3 -12 0 s-6 5 -10 2" stroke="${C.paper}" stroke-width="0.7" fill="none" stroke-linecap="round" opacity="0.6"/><ellipse cx="${x}" cy="${y}" rx="2.4" ry="1.8" fill="#E9C24A"/><path d="M${x - 0.6} ${y - 1.8} v3.6 M${x + 0.9} ${y - 1.8} v3.6" stroke="${C.ink}" stroke-width="0.8"/><ellipse cx="${x}" cy="${y - 2.4}" rx="1.8" ry="1.2" fill="${C.paper}" opacity="0.85"/></g>`; });
  // Middle terrace: the larder door dug into the hill, with a lamp over it and jars on a shelf beside it.
  // The larder door set into the bank: a dark recess cut into the earth, a ring of dressed stones round it standing on
  // the ground at both feet, and the plank door inside with its frame, strap hinges and knob; the lamp over it.
  o += `<g filter="url(#layer-sm)"><path d="M255 509 V478 a27 27 0 0 1 54 0 V509 Z" fill="#5E4A2E"/><path d="M258 509 V478 a24 24 0 0 1 48 0 V509 Z" fill="#2E2316"/>`;
  for (let i = 0; i < 11; i += 1) {
    const a0 = Math.PI + (Math.PI * i) / 11 + 0.02; const a1 = Math.PI + (Math.PI * (i + 1)) / 11 - 0.02;
    const p = (a, rr) => `${f(282 + Math.cos(a) * rr)} ${f(478 + Math.sin(a) * rr)}`;
    o += `<path d="M${p(a0, 23)} L${p(a0, 30)} A30 30 0 0 1 ${p(a1, 30)} L${p(a1, 23)} A23 23 0 0 0 ${p(a0, 23)} Z" fill="${['#CFC8B4', '#B9B2A0', '#DDD6C2'][i % 3]}" stroke="#8F8A78" stroke-width="0.6"/>`;
  }
  for (const [x, y, w, h, c] of [[251, 478, 8, 11, '#B9B2A0'], [251.6, 489.4, 7.4, 10, '#DDD6C2'], [250, 499.8, 9.4, 9.6, '#CFC8B4'], [305, 478, 8, 11, '#DDD6C2'], [305, 489.4, 7.4, 10, '#CFC8B4'], [304.6, 499.8, 9.4, 9.6, '#B9B2A0']]) {
    o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.2" fill="${c}" stroke="#8F8A78" stroke-width="0.6"/>`;
  }
  o += `${contact(255, 510, 7, 1.4, 0.2)}${contact(309, 510, 7, 1.4, 0.2)}`;
  o += `<path d="M262 509 V479 a20 20 0 0 1 40 0 V509 Z" fill="${C.clay3}" stroke="${C.bark}" stroke-width="1.6"/><path d="M272 509 V463 M282 509 V459 M292 509 V463" stroke="${C.clay4}" stroke-width="1.4"/>`;
  o += `<path d="M262.8 479 a19.2 19.2 0 0 1 10 -16.6 V509 H262.8 Z" fill="#2E2316" opacity="0.28"/>`;
  // (the old arch's stones still run for their draws, discarded, so everything drawn after keeps its detail)
  stones(258, 308, 508, 3.5, [C.cream, C.creamDeep]);
  for (const y of [470, 497]) o += `<path d="M263 ${y} h17" stroke="#2A2420" stroke-width="2.6" stroke-linecap="round"/><circle cx="266" cy="${y}" r="0.7" fill="#8F8A78"/><circle cx="275" cy="${y}" r="0.7" fill="#8F8A78"/>`;
  o += `<circle cx="295" cy="488" r="2.4" fill="#C9A24A" stroke="#6E4A1C" stroke-width="0.7"/><circle cx="294.3" cy="487.3" r="0.8" fill="#FFF1C4"/>`;
  o += `<path d="M282 444 v-6 h-6" stroke="${C.ink}" stroke-width="1.2" fill="none"/><circle cx="282" cy="448" r="4" fill="#FFE9B0" stroke="${C.clay4}" stroke-width="1.2"/>`;
  // the shelf, grained, on two brackets, and three jars of honey: glass with a shine, a lid, a label
  o += `<rect x="312" y="490" width="40" height="4" rx="1.2" fill="${C.clay3}"/><path d="M314 491.4 h14 M332 492.6 h17" stroke="${C.clay4}" stroke-width="0.6"/>`;
  o += `<path d="M316 494 v7 l6 -7 Z M348 494 v7 l-6 -7 Z" fill="${C.clay4}"/>`;
  [[318, '#E2A43A'], [330, '#D98E2B'], [342, '#EAB64E']].forEach(([x, col]) => {
    o += `<rect x="${x - 4}" y="478.6" width="9" height="11.4" rx="2.6" fill="${col}" opacity="0.92"/><rect x="${x - 3.6}" y="476" width="8.2" height="3" rx="1" fill="#8A5A30"/>` +
      `<rect x="${x - 2.6}" y="482.4" width="6.2" height="4" rx="0.6" fill="${C.cream}"/><path d="M${x - 1.6} 484.4 h4.2" stroke="${C.clay4}" stroke-width="0.5"/>` +
      `<path d="M${x - 2.6} 480 v8.4" stroke="#FFF6D8" stroke-width="0.9" stroke-linecap="round" opacity="0.8"/>`;
  });
  // a cluster of flowers on stems and a tuft at each foot of the arch
  for (const [x, y, c] of [[247, 508, '#F3E6C4'], [244, 506, '#E7B9C8'], [249.6, 505, '#F3E6C4'], [313, 508, '#E7B9C8'], [316.4, 506.4, '#F3E6C4']]) {
    o += `<path d="M${x} ${y + 3} q0.6 -3 0 -5" stroke="${C.nLeaf}" stroke-width="0.8" fill="none"/><circle cx="${x}" cy="${y - 2.4}" r="1.6" fill="${c}"/><circle cx="${x}" cy="${y - 2.4}" r="0.6" fill="#E9C24A"/>`;
  }
  o += `<use href="#kmt-a" x="250" y="510"/><use href="#kmt-c" x="312" y="510"/>`;
  o += `</g>`;
  // The second avocado tree and its ladder, with a basket of avocados at the foot.
  tree(520, 528, 86, 50, ['#3E4A14', '#5F6C18', C.nLand, C.nLeaf], '#3E4A14', 'avocado');
  o += `<g filter="url(#layer-sm)">${ownSeed(TREE_SEED + 2, () => orchardTree(520, 528, 86, 50))}</g>`;
  o += `<g filter="url(#layer-sm)"><path d="M482 540 L516 446 M496 544 L530 450" stroke="${C.clay2}" stroke-width="4" stroke-linecap="round"/>`;
  for (let i = 0; i < 7; i += 1) { const t = 0.1 + i * 0.13; o += `<path d="M${f(482 + 34 * t)} ${f(540 - 94 * t)} L${f(496 + 34 * t)} ${f(544 - 94 * t)}" stroke="${C.clay3}" stroke-width="3" stroke-linecap="round"/>`; }
  o += `<path d="M520 462 Q514 452 500 444" stroke="${C.bark}" stroke-width="4.4" stroke-linecap="round" fill="none"/>` +
    blobs('#3E4A14', [[512, 446, 7], [526, 444, 8], [536, 452, 6]]) + blobs(C.nLand, [[510, 443, 5], [524, 441, 5.6]]) + blobs(C.nLeaf, [[508, 441, 2.8], [521, 439, 3]]);
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
  LIFE += `<g class="km-steam"><path d="M352 524 c-4 -5 4 -8 0 -13 c-4 -5 4 -8 0 -13" stroke="${C.paper}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M357 521 c-3 -4 3 -6 0 -10" stroke="${C.paper}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/></g>`;
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
  o += ownSeed(ORCHARD_SEED + 1, orchardProps);
  return g('id="km-orchard"', o);
}

/* ------------------------------------------------------------------ Lakeside Field (dog-training), to the right */
const KENNEL = [1076, 496]; // land units; the door is at local 18..42 x 44..60

/*
 * Lakeside Field, built to the Orchard's standard (owner, 2026-10-08: the Field to match the presentation of the other
 * scenes). Land units, scale 2. Open grass in the hill's greens with a mown training lane and longer grass round it,
 * drifts of wildflowers and clover, a split-rail fence with the course along it (a bar jump, weave poles on their base,
 * the woven willow hoop), a weeping willow by the bay with a bench, a toy basket and a trough, toys and paw prints in
 * the grass, a little beach of sand and pebbles where the Field runs down into the bay, and beyond the fence the
 * farmland: fields in strips, hedgerows with trees in them, a barn, hay bales, a track through a gate, and sheep.
 * Everything solid stands behind the back of the ground the dog may walk (world y 1104, land 552), so it never runs
 * through a drawn thing; only flat things (grass, flowers, toys, paw prints) lie on the open grass.
 * The Field and the farmland take their random detail from seeds of their own and then move the park's seed on by the
 * draws the old ones took (FIELD_DRAWS, FARM_DRAWS), so everything outside them stays as it was.
 */
const FIELD_DRAWS = 3093;
const FIELD_SEED = 20261009;
const FARM_DRAWS = 251;
const FARM_SEED = 20261010;
const FIELD_BACK = 551.5; // the back of the walkable Field (world 1104 is land 552): solid things stand behind it

/** y along a gentle line through [[x, y], ...], eased between its points (as the shore is). */
function along(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) { const k = (x - x0) / (x1 - x0); return y0 + (y1 - y0) * k * k * (3 - 2 * k); }
  }
  return pts[pts.length - 1][1];
}

/** A soft paper patch: an oval with a wavering edge, smoothed. */
function softPatch(cx, cy, rx, ry, fill, wob) {
  const pts = [];
  const n = 16;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + r(-1, 1) * (wob || 0.12);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M${f((pts[0][0] + pts[n - 1][0]) / 2)} ${f((pts[0][1] + pts[n - 1][1]) / 2)}`;
  for (let i = 0; i < n; i += 1) { const p = pts[i]; const q = pts[(i + 1) % n]; d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`; }
  return `<path d="${d}Z" fill="${fill}"/>`;
}

/* ---- the farmland beyond the fence (far layer) */
const FARM_LINES = [
  [[1040, 457], [1180, 449], [1340, 454], [1480, 445], [1600, 449]],
  [[1040, 468], [1180, 461], [1340, 466], [1480, 457], [1600, 461]],
  [[1040, 483], [1180, 476], [1340, 481], [1480, 472], [1600, 476]],
  [[1040, 503], [1180, 496], [1340, 500], [1480, 492], [1600, 496]],
];

/** A hedgerow along a list of points: a dark foot, a lit top, a few sprays of light leaves (one path per colour). */
function hedgerow(pts, s, cols, extra) {
  const d = []; const m = []; const l = []; const dots = [];
  pts.forEach(([x, y]) => {
    d.push([x, y - s * 0.7, s * r(0.85, 1.15)]);
    m.push([x - s * 0.25, y - s * 1.05, s * r(0.55, 0.85)]);
    if (rnd() < 0.45) l.push([x - s * 0.45, y - s * 1.4, s * r(0.28, 0.45)]);
    if (extra && rnd() < 0.3) dots.push([x + r(-s, s) * 0.6, y - s * r(0.6, 1.5), s * 0.13]);
  });
  return blobs(cols[0], d) + blobs(cols[1], m) + blobs(cols[2], l) + (extra ? blobs(extra, dots) : '');
}
/** A far hedgerow as strokes: a dark body, bumps of round dots along its top, a lit spray (one path per paper). */
function hedgeLine(segs, s, cols) {
  const at = (k, dx) => segs.map((pts) => line(pts.map(([x, y]) => [x + dx, y - s * k]))).join('');
  const dots = (a, b) => `0 ${f(a)} 0 ${f(b)} 0 ${f((a + b) / 2)} 0 ${f(b * 1.25)}`;
  return `<path d="${at(0.55, 0)}" stroke="${cols[0]}" stroke-width="${f(s * 1.5)}" stroke-linejoin="round" fill="none"/>` +
    `<path d="${at(0.95, 0)}" stroke="${cols[0]}" stroke-width="${f(s * 1.9)}" stroke-linecap="round" stroke-dasharray="${dots(s * 0.85, s * 1.2)}" fill="none"/>` +
    `<path d="${at(1.2, -s * 0.3)}" stroke="${cols[1]}" stroke-width="${f(s * 1.3)}" stroke-linecap="round" stroke-dasharray="${dots(s * 1.1, s * 1.6)}" fill="none"/>` +
    `<path d="${at(1.5, -s * 0.5)}" stroke="${cols[2]}" stroke-width="${f(s * 0.65)}" stroke-linecap="round" stroke-dasharray="${dots(s * 2.4, s * 3.2)}" fill="none"/>`;
}
/** Points along a farm line every ~10 units, split where there are gaps (a gate). */
const segsAlong = (line0, x0, x1, gaps) => {
  const out = [[]];
  for (let x = x0; x <= x1; x += 10) {
    if ((gaps || []).some(([a, b]) => x > a && x < b)) { if (out[out.length - 1].length) out.push([]); continue; }
    out[out.length - 1].push([x, along(line0, x)]);
  }
  return out.filter((p) => p.length > 1);
};
const stepAlong = (line0, x0, x1, step, gaps) => {
  const out = [];
  for (let x = x0; x < x1; x += step * r(0.8, 1.25)) if (!(gaps || []).some(([a, b]) => x > a && x < b)) out.push([x, along(line0, x)]);
  return out;
};

/** A tree standing in a hedgerow: a short trunk and a round crown in three papers. */
function hedgeTree(x, y, s, cols) {
  return `<path d="M${f(x - 0.8 * s)} ${f(y)} L${f(x - 0.4 * s)} ${f(y - 5 * s)} H${f(x + 0.4 * s)} L${f(x + 0.8 * s)} ${f(y)} Z" fill="#5E4E3A"/>` +
    blobs(cols[0], [[x, y - 7 * s, 3.8 * s], [x - 2.8 * s, y - 5.4 * s, 2.7 * s], [x + 3 * s, y - 5.6 * s, 2.9 * s]]) +
    blobs(cols[1], [[x - 0.9 * s, y - 8 * s, 2.7 * s], [x - 3 * s, y - 6.2 * s, 1.7 * s], [x + 1.8 * s, y - 6.6 * s, 1.6 * s]]) +
    blobs(cols[2], [[x - 1.8 * s, y - 9 * s, 1.3 * s], [x - 3.4 * s, y - 7 * s, 0.8 * s]]);
}

/** A barn: its gable end toward us, the long side going back, a roof in two papers and a cross-braced door. */
function barn(x, y, s) {
  const w = 16 * s; const h = 9 * s; const sw = 11 * s; const pk = 6.4 * s; const rise = 2.2 * s;
  let o = `<ellipse cx="${f(x + w * 0.9)}" cy="${f(y + 0.3)}" rx="${f(w * 1.1)}" ry="${f(1.1 * s)}" fill="${C.ink}" opacity="0.16"/>`;
  o += `<path d="${poly([[x + w, y], [x + w + sw, y - rise], [x + w + sw, y - h - rise], [x + w, y - h]])}" fill="#8A4E2C"/>`;
  o += `<path d="${poly([[x, y], [x + w, y], [x + w, y - h], [x + w / 2, y - h - pk], [x, y - h]])}" fill="#A9633A"/>`;
  o += `<path d="${poly([[x + w / 2, y - h - pk], [x + w / 2 + sw, y - h - pk - rise], [x + w + sw + 0.8 * s, y - h - rise + 0.6 * s], [x + w + 0.8 * s, y - h + 0.6 * s]])}" fill="#6B3D22"/>`;
  o += `<path d="M${f(x - 0.6 * s)} ${f(y - h + 0.5 * s)} L${f(x + w / 2)} ${f(y - h - pk)} L${f(x + w + 0.8 * s)} ${f(y - h + 0.6 * s)}" stroke="#EDE6D4" stroke-width="${f(0.7 * s)}" stroke-linejoin="round" fill="none"/>`;
  o += `<path d="M${f(x + w / 2 + 0.4 * s)} ${f(y - h - pk - 0.2 * s)} L${f(x + w / 2 + sw)} ${f(y - h - pk - rise)}" stroke="#8C5634" stroke-width="${f(0.6 * s)}" stroke-linecap="round"/>`;
  o += `<rect x="${f(x + w * 0.3)}" y="${f(y - h * 0.72)}" width="${f(w * 0.4)}" height="${f(h * 0.72)}" fill="#6E3F22"/><path d="M${f(x + w * 0.3)} ${f(y - h * 0.72)} l${f(w * 0.4)} ${f(h * 0.72)} m0 ${f(-h * 0.72)} l${f(-w * 0.4)} ${f(h * 0.72)}" stroke="#EDE6D4" stroke-width="${f(0.45 * s)}"/>`;
  o += `<rect x="${f(x + w / 2 - 1.2 * s)}" y="${f(y - h - pk * 0.55)}" width="${f(2.4 * s)}" height="${f(2 * s)}" fill="#EDE6D4"/>`;
  o += `<path d="M${f(x + w + 2 * s)} ${f(y - h * 0.55 - 0.4 * s)} h${f(2.6 * s)} M${f(x + w + 6.4 * s)} ${f(y - h * 0.55 - 1.2 * s)} h${f(2.6 * s)}" stroke="#6E3F22" stroke-width="${f(1.6 * s)}"/>`;
  return o;
}

/** A round hay bale lying on its side: its rolled face toward us, its body going back. */
const bale = (x, y, s) => `<ellipse cx="${f(x + 1.4 * s)}" cy="${f(y + 0.2)}" rx="${f(3.4 * s)}" ry="${f(0.7 * s)}" fill="${C.ink}" opacity="0.14"/>` +
  `<path d="M${f(x)} ${f(y - 4 * s)} h${f(2.6 * s)} a${f(1.4 * s)} ${f(2 * s)} 0 0 1 0 ${f(4 * s)} h${f(-2.6 * s)} Z" fill="#BFA062"/>` +
  `<circle cx="${f(x)}" cy="${f(y - 2 * s)}" r="${f(2 * s)}" fill="#DCC688"/><path d="M${f(x - 0.9 * s)} ${f(y - 2 * s)} a${f(0.9 * s)} ${f(0.9 * s)} 0 1 1 ${f(0.9 * s)} ${f(0.9 * s)} a${f(0.5 * s)} ${f(0.5 * s)} 0 1 1 ${f(-0.3 * s)} ${f(-0.9 * s)}" stroke="#B4955A" stroke-width="${f(0.35 * s)}" fill="none"/>`;

function farmland() {
  // The farmland beyond the Field's fence, in the far layer so it keeps its distance as the layers shift and stands
  // behind the hill: strips of pasture, young crops, wheat and ploughed earth running back to the hills, hedgerows with
  // trees in them, a barn, hay bales, a track through a gate, and sheep at grass.
  const L = FARM_LINES;
  const VX = 1330; const VY = 330; // where the field edges run back to
  const backX = (x, yb, yt) => VX + ((x - VX) * (yt - VY)) / (yb - VY);
  const edge = (pts, x0, x1) => { const out = []; const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / 14)); for (let i = 0; i <= n; i += 1) { const x = x0 + ((x1 - x0) * i) / n; out.push([x, along(pts, x)]); } return out; };
  let o = '';
  // The ground the fields lie on, from the far hedge down behind the Field.
  o += `<path d="${poly([...edge(L[0], 1040, 1600), [1600, 560], [1040, 560]])}" fill="#A6C287"/>`;
  const PAL = [
    ['#AFC995', '#BCD09C', '#CFCB9C', '#BBAA8A', '#A4C08E', '#C4D3A0'],
    ['#A2C084', '#B2CB8C', '#D5C78F', '#B49D79', '#97B676', '#C3D08E'],
    ['#98B874', '#AAC67F', '#D8C889', '#AE956F', '#8DAF69', '#C6D489'],
  ];
  const WIDE = [[46, 74], [58, 96], [74, 120]];
  const kinds = { 2: 'wheat', 3: 'plough' };
  const dividers = [[], [], []];
  let tex = '';
  for (let b = 0; b < 3; b += 1) {
    const top = L[b]; const bot = L[b + 1];
    let x = 1060 + r(-20, 10); let last = -1;
    while (x < 1600) {
      const w = r(WIDE[b][0], WIDE[b][1]);
      const x1 = Math.min(1640, x + w);
      let c = Math.floor(rnd() * PAL[b].length); if (c === last) c = (c + 1) % PAL[b].length; last = c;
      const t0 = backX(x, along(bot, x), along(top, x)); const t1 = backX(x1, along(bot, x1), along(top, x1));
      o += `<path d="${poly([...edge(bot, x, x1), ...edge(top, t1, t0)])}" fill="${PAL[b][c]}"/>`;
      const kind = kinds[c];
      const lerp = (k, u) => { const xb = x + (x1 - x) * u; const xt = t0 + (t1 - t0) * u; return [xb + (xt - xb) * k, along(bot, xb) + (along(top, xt) - along(bot, xb)) * k]; };
      if (kind === 'plough') {
        let fur = '';
        const n = 5 + b * 2;
        for (let j = 1; j < n; j += 1) { const u = j / n; const [ax, ay] = lerp(0.04, u); const [bx, by] = lerp(0.96, u); fur += `M${f(ax)} ${f(ay)}L${f(bx)} ${f(by)}`; }
        tex += `<path d="${fur}" stroke="#97805E" stroke-width="${f(0.35 + b * 0.18)}" stroke-linecap="round" fill="none"/>`;
      } else if (kind === 'wheat') {
        let st = '';
        [0.3, 0.62].forEach((k) => { const pts = []; for (let u = 0.04; u <= 0.97; u += 0.093) pts.push(lerp(k, u)); st += line(pts); });
        tex += `<path d="${st}" stroke="#E6DBA8" stroke-width="${f(0.5 + b * 0.35)}" stroke-linecap="round" fill="none"/>`;
      }
      dividers[b].push(x1);
      x = x1;
    }
  }
  o += tex;
  // The far side: a thin hedge with little trees, where the fields meet the hills.
  o += hedgeLine(segsAlong(L[0], 1050, 1600), 1.3, ['#6F9468', '#7FA172', '#93B385']);
  for (let x = 1090 + r(0, 30); x < 1600; x += r(50, 90)) o += hedgeTree(x, along(L[0], x) + 0.4, 0.5, ['#6C9064', '#7C9E70', '#90B082']);
  // Hedgerows between the strips, a few running back between the fields, a gate where the track goes through.
  const GATE = [1294, 1307];
  const divs = [[], [], []];
  dividers.forEach((xs, b) => {
    xs.forEach((xb) => {
      if (rnd() < 0.35 || xb > 1600) return;
      const yb = along(L[b + 1], xb); const xt = backX(xb, yb, along(L[b], xb)); const yt = along(L[b], xt);
      divs[b].push([[xt, yt], [xb, yb]]);
    });
  });
  divs.forEach((segs, b) => { if (segs.length) o += hedgeLine(segs, 0.9 + b * 0.5, ['#5F8858', '#709A63', '#86AC76']); });
  o += hedgeLine(segsAlong(L[1], 1050, 1600), 1.7, ['#5C8655', '#6D9761', '#82A973']);
  for (let x = 1110 + r(0, 30); x < 1600; x += r(56, 96)) o += hedgeTree(x, along(L[1], x) + 0.6, 0.75, ['#5A8452', '#6A9460', '#7FA672']);
  // The barn and its tree, in the strip behind the gate's hedge, and the track coming down to the gate.
  o += hedgeTree(1494, along(L[2], 1494) - 1.6, 1.1, ['#557F4D', '#65905A', '#7AA26C']);
  o += barn(1448, along(L[2], 1460) - 1.8, 1);
  o += `<path d="${strip(sample([[1268, 504, 3.6], [1286, 492, 2.4], [1300, 482, 1.8], [1336, 476.6, 1.4], [1392, 473, 1.1], [1440, 471.4, 0.9]], 2), -1, 1, 0.15)}" fill="#D9C9A8"/>`;
  o += hedgeLine(segsAlong(L[2], 1050, 1600, [GATE]), 2.3, ['#55804D', '#66915A', '#7CA46C']);
  for (let x = 1124 + r(0, 30); x < 1600; x += r(60, 100)) if (x < 1440 || x > 1520) o += hedgeTree(x, along(L[2], x) + 0.8, 1.05, ['#527C4A', '#628E58', '#78A06A']);
  // The gate: two posts and five bars with a brace, open country through it.
  const gy = along(L[2], 1300);
  o += `<path d="M1294.6 ${f(gy + 0.6)} v-5.6 M1306.4 ${f(gy + 0.4)} v-5.6" stroke="#8E7A5E" stroke-width="1.1" stroke-linecap="round"/>`;
  o += `<path d="${[0, 1, 2, 3, 4].map((i) => `M1295 ${f(gy - 0.8 - i * 1.05)} H1306`).join(' ')} M1295 ${f(gy - 0.8)} L1306 ${f(gy - 5)}" stroke="#E9E4D4" stroke-width="0.5" stroke-linecap="round"/>`;
  // Round hay bales in the near hay field, and sheep at grass in the pasture behind it.
  [[1356, 497.6, 1], [1368, 499, 1.05], [1384, 496.4, 0.95], [1402, 498.4, 1.05], [1418, 495.2, 0.9], [1376, 491.2, 0.82], [1396, 490.4, 0.8]].forEach(([x, y, s]) => { o += bale(x, y, s); });
  let flock = '';
  [[1196, 470.4], [1204, 471.4], [1216, 470.2], [1228, 471.8], [1222, 468.8], [1550, 466.6], [1560, 467.6], [1572, 466.2]].forEach(([x, y]) => {
    flock += `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="0.95" fill="#F4F1E8"/><circle cx="${f(x + 1.5)}" cy="${f(y - 0.3)}" r="0.5" fill="#3A3530"/>`;
  });
  o += flock;
  // The near hedge, at the Field's back beyond the fence: hawthorn, blossom and berries, oaks standing in it.
  [[1196, 2.1], [1386, 2.3], [1300, 1.5]].forEach(([x, s]) => { o += hedgeTree(x, along(L[3], x) + 1, s, ['#476F3C', '#577F46', '#6E9654']); });
  o += hedgerow(stepAlong(L[3], 1120, 1600, 4.6), 3.8, ['#4A743E', '#5B8548', '#739C56'], '#F4F1E8');
  o += blobs('#B8433A', stepAlong(L[3], 1062, 1600, 26).map(([x, y]) => [x + r(-3, 3), y - r(2, 5), 0.55]));
  return `<g class="km-farm">${o}</g>`;
}

/* ---- the Field's own pieces (land units) */

/** A split-rail fence: rough posts with a lit face, two hewn rails between each pair, a shadow under each rail. */
function fence() {
  const base = (x) => 535.4 - (x - 1056) * 0.012;
  const xs = [];
  for (let x = 1062; x < 1612; x += 54 + r(-3, 3)) xs.push(x);
  let shade = ''; let posts = ''; let lit = ''; let caps = ''; let rails = ''; let tops = ''; let under = '';
  xs.forEach((x, i) => {
    const b = base(x); const h = 35 + r(-1.5, 1.5);
    shade += `M${f(x - 2.6)} ${f(b)}L${f(x - 2.3)} ${f(b - h)}L${f(x + 2.5)} ${f(b - h - 0.8)}L${f(x + 2.8)} ${f(b)}Z`;
    lit += `M${f(x - 2.6)} ${f(b)}L${f(x - 2.3)} ${f(b - h)}L${f(x - 0.4)} ${f(b - h - 0.4)}L${f(x - 0.6)} ${f(b)}Z`;
    caps += `M${f(x - 2.4)} ${f(b - h)}L${f(x + 2.6)} ${f(b - h - 0.9)}L${f(x + 2.4)} ${f(b - h + 1.2)}L${f(x - 2.3)} ${f(b - h + 1.8)}Z`;
    under += `M${f(x - 3)} ${f(b + 0.4)}h${f(7.4)}`;
    if (i) {
      const p = xs[i - 1]; const pb = base(p);
      [[27, 2.1], [13.5, 1.9]].forEach(([up, th], k) => {
        const y0 = pb - up + r(-0.6, 0.6); const y1 = b - up + r(-0.6, 0.6); const sag = r(0.2, 1);
        rails += `M${f(p - 1)} ${f(y0 - th)}Q${f((p + x) / 2)} ${f((y0 + y1) / 2 - th + sag)} ${f(x + 1)} ${f(y1 - th)}L${f(x + 1)} ${f(y1 + th)}Q${f((p + x) / 2)} ${f((y0 + y1) / 2 + th + sag)} ${f(p - 1)} ${f(y0 + th)}Z`;
        tops += `M${f(p + 1)} ${f(y0 - th + 0.5)}Q${f((p + x) / 2)} ${f((y0 + y1) / 2 - th + sag + 0.5)} ${f(x - 1)} ${f(y1 - th + 0.5)}`;
        under += `M${f(p + 2)} ${f(y0 + th + 1.6)}Q${f((p + x) / 2)} ${f((y0 + y1) / 2 + th + sag + 1.6)} ${f(x - 2)} ${f(y1 + th + 1.6)}`;
        if (k === 0 && rnd() < 0.5) tops += `M${f(p + 8 + r(0, 20))} ${f((y0 + y1) / 2 - th + 1.4)}h${f(r(3, 7))}`;
      });
    }
  });
  return `<path d="${under}" stroke="${C.ink}" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.13"/><path d="${shade}" fill="${C.dDark}"/><path d="${lit}" fill="${C.dRusset}"/><path d="${caps}" fill="${C.dTan}"/>` +
    `<path d="${rails}" fill="${C.dTan}"/><path d="${tops}" stroke="${C.dGlow}" stroke-width="0.9" stroke-linecap="round" fill="none"/>`;
}

/** The bar jump: two white uprights on crossed feet, cups, a striped bar and a lower bar, little lattice wings. */
function barJump(x, y) {
  const up = (ux) => `<path d="M${ux - 4.2} ${y} h8.4" stroke="${C.dRusset}" stroke-width="1.5" stroke-linecap="round"/><rect x="${ux - 1.3}" y="${y - 25}" width="2.6" height="25" rx="0.7" fill="${C.paper}"/><rect x="${ux + 0.5}" y="${y - 25}" width="0.8" height="25" fill="${C.fPale}"/><rect x="${ux - 1.7}" y="${y - 26.6}" width="3.4" height="2.2" rx="1.1" fill="${C.dLand}"/>`;
  const wing = (wx, dir) => `<path d="M${wx} ${y} V${y - 17} M${wx + dir * 7} ${y} V${y - 12} M${wx} ${y - 16} L${wx + dir * 7} ${y - 11} M${wx} ${y - 9} L${wx + dir * 7} ${y - 5} M${wx} ${y - 3} L${wx + dir * 7} ${y - 11}" stroke="${C.dTan}" stroke-width="1.1" stroke-linecap="round"/>`;
  return `<g>${contact(x + 15, y + 0.6, 22, 1.6)}${wing(x - 1.4, -1)}${wing(x + 31.4, 1)}${up(x)}${up(x + 30)}` +
    `<path d="M${x + 1} ${y - 15.4} H${x + 29}" stroke="${C.paper}" stroke-width="2.2"/><path d="M${x + 1} ${y - 15.4} H${x + 29}" stroke="${C.dLand}" stroke-width="2.2" stroke-dasharray="3.5 3.5"/><path d="M${x + 1} ${y - 14.6} H${x + 29}" stroke="${C.ink}" stroke-width="0.5" opacity="0.18"/>` +
    `<path d="M${x + 1} ${y - 6.4} H${x + 29}" stroke="${C.dGlow}" stroke-width="1.6"/><path d="M${x - 1.6} ${y - 17.4} h3.4 v2.2 M${x + 28.2} ${y - 17.4} h3.4 v2.2" stroke="${C.inkSoft}" stroke-width="0.6" fill="none"/></g>`;
}

/** Weave poles: a low wooden base with feet, and poles striped in the Field's russet. */
function weavePoles(x, y, n, gap) {
  const w = (n - 1) * gap;
  let poles = ''; let caps = '';
  for (let i = 0; i < n; i += 1) { const px = x + i * gap; poles += `M${px} ${y - 2.4}V${y - 33}`; caps += `M${f(px - 1.3)} ${y - 33}a1.3 1.3 0 0 1 2.6 0Z`; }
  return `<g>${contact(x + w / 2, y + 0.6, w / 2 + 8, 1.6)}<path d="M${x - 5} ${y} h4 M${x + w + 1} ${y} h4" stroke="${C.clay4}" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="${x - 4}" y="${y - 3}" width="${w + 8}" height="3" rx="1" fill="${C.clay3}"/><rect x="${x - 4}" y="${y - 3}" width="${w + 8}" height="1" rx="0.5" fill="${C.clay2}"/>` +
    `<path d="${poles}" stroke="${C.paper}" stroke-width="2.4"/><path d="${poles}" stroke="${C.dLand}" stroke-width="2.4" stroke-dasharray="4 4"/><path d="${poles}" stroke="${C.ink}" stroke-width="0.6" opacity="0.12" transform="translate(0.9 0)"/><path d="${caps}" fill="${C.dTan}"/></g>`;
}

/** The willow hoop: a ring woven of willow withies, a few leaves still on it, on a frame with feet. */
function willowHoop(x, y) {
  const cy = y - 21; const R = 13;
  let leaves = '';
  [[-0.5, 1], [0.9, -1], [2.2, 1], [3.6, -1], [4.9, 1]].forEach(([a, s]) => {
    const lx = x + Math.cos(a) * (R + 0.6); const ly = cy + Math.sin(a) * (R + 0.6);
    leaves += `<path d="M0 0 C1.4 -1.8 4 -2.2 6 -1.4 C4.4 0 1.8 0.6 0 0 Z" transform="translate(${f(lx)} ${f(ly)}) rotate(${f((a * 180) / Math.PI + 90 * s)})"/>`;
  });
  return `<g>${contact(x, y + 0.6, 22, 1.6)}<path d="M${x - 21} ${y} h8 M${x + 13} ${y} h8" stroke="${C.clay4}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M${x - 17} ${y} V${cy - 6} M${x + 17} ${y} V${cy - 6}" stroke="${C.clay3}" stroke-width="2.4" stroke-linecap="round"/><path d="M${x - 17.6} ${y} V${cy - 6}" stroke="${C.clay2}" stroke-width="0.8"/>` +
    `<path d="M${x - 17} ${cy - 5} L${x - R * 0.72} ${cy - R * 0.68} M${x + 17} ${cy - 5} L${x + R * 0.72} ${cy - R * 0.68} M${x - 17} ${cy + 7} L${x - R * 0.8} ${cy + R * 0.55} M${x + 17} ${cy + 7} L${x + R * 0.8} ${cy + R * 0.55}" stroke="${C.sand}" stroke-width="0.8"/>` +
    `<circle cx="${x}" cy="${cy}" r="${R}" fill="none" stroke="${C.clay3}" stroke-width="4.2"/><circle cx="${x}" cy="${cy}" r="${R}" fill="none" stroke="${C.clay2}" stroke-width="4.2" stroke-dasharray="5 3.2"/>` +
    `<circle cx="${x}" cy="${cy}" r="${R + 1.2}" fill="none" stroke="${C.clay1}" stroke-width="0.9" stroke-dasharray="3 5.2"/><circle cx="${x}" cy="${cy}" r="${R - 1.5}" fill="none" stroke="${C.clay4}" stroke-width="0.7" stroke-dasharray="2.4 4.4"/>` +
    `<g fill="${C.nLeafLight}">${leaves}</g></g>`;
}

/** A weeping willow: a stout trunk forking into limbs, a low dome of crown, and curtains of long fronds cut deep, parted round the trunk. */
function willow(x, base, h) {
  const t = h * 0.046;
  const cx = x - h * 0.03; const W = h * 0.5; const top = base - h; const H = h * 0.42;
  const dome = (xx) => { const u = Math.max(-1, Math.min(1, (xx - cx) / W)); return top + H * (1 - Math.sqrt(1 - u * u)); };
  let o = contact(x + 4, base + 1, W * 0.9, h * 0.035, 0.18);
  // a curtain: its top along the dome (dropped by dy), long fronds cut deep, their tips ending near `bot`
  const curtain = (x0, x1, dy, bot, n, cut, fill) => {
    let d = '';
    for (let i = 0; i <= 14; i += 1) { const xx = x0 + ((x1 - x0) * i) / 14; d += `${i ? 'L' : 'M'}${f(xx)} ${f(dome(xx) + dy)}`; }
    const w = (x1 - x0) / n;
    for (let i = n; i >= 0; i -= 1) {
      const xx = x0 + w * i; const y0 = dome(xx) + dy; const tip = bot - r(0, (bot - y0) * 0.22);
      d += `L${f(xx + w * 0.3)} ${f(y0 + (tip - y0) * 0.8)}L${f(xx + r(-0.4, 0.4))} ${f(tip)}L${f(xx - w * 0.3)} ${f(y0 + (tip - y0) * 0.78)}`;
      if (i) d += `L${f(xx - w * 0.5)} ${f(y0 + (tip - y0) * r(cut * 0.6, cut))}`;
    }
    return `<path d="${d}Z" fill="${fill}"/>`;
  };
  o += curtain(cx - W, cx + W, h * 0.05, base - h * 0.04, 30, 0.42, '#556F2A');
  // the trunk, forking into limbs that rise into the crown, lit on the left
  o += `<path d="M${f(x - t)} ${base} C${f(x - t * 0.7)} ${f(base - h * 0.2)} ${f(x - t * 0.8)} ${f(base - h * 0.34)} ${f(x - t * 3.4)} ${f(base - h * 0.62)} L${f(x - t * 2.4)} ${f(base - h * 0.66)} C${f(x - t * 0.6)} ${f(base - h * 0.46)} ${f(x)} ${f(base - h * 0.5)} ${f(x + t * 0.6)} ${f(base - h * 0.7)} L${f(x + t * 1.5)} ${f(base - h * 0.69)} C${f(x + t * 1)} ${f(base - h * 0.52)} ${f(x + t * 1.6)} ${f(base - h * 0.48)} ${f(x + t * 3.4)} ${f(base - h * 0.62)} L${f(x + t * 3.9)} ${f(base - h * 0.57)} C${f(x + t * 1.6)} ${f(base - h * 0.4)} ${f(x + t * 0.9)} ${f(base - h * 0.22)} ${f(x + t * 1.2)} ${base} Z" fill="${C.bark}"/>`;
  o += `<path d="M${f(x + t * 0.3)} ${base} C${f(x + t * 0.4)} ${f(base - h * 0.2)} ${f(x + t * 0.8)} ${f(base - h * 0.4)} ${f(x + t * 3.1)} ${f(base - h * 0.6)} L${f(x + t * 3.9)} ${f(base - h * 0.57)} C${f(x + t * 1.6)} ${f(base - h * 0.4)} ${f(x + t * 0.9)} ${f(base - h * 0.22)} ${f(x + t * 1.2)} ${base} Z" fill="#57391F"/>`;
  o += `<path d="M${f(x - t * 0.4)} ${f(base - 3)} q-1 -8 0.4 -15 M${f(x + t * 0.1)} ${f(base - h * 0.24)} q-0.8 -6 0.6 -11 M${f(x - t * 1.6)} ${f(base - h * 0.44)} q-1 -4 -2.4 -7" stroke="${C.clay4}" stroke-width="0.8" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M${f(x - t * 1.4)} ${base} q${f(-t * 0.6)} -1 ${f(-t * 1.4)} 0.6 M${f(x + t * 1.1)} ${base} q${f(t * 0.7)} -1.2 ${f(t * 1.6)} 0.4" stroke="${C.bark}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  // the dome: a band of crown over the limbs, its top in soft bumps, lit on the left
  const bumps = [[], [], []];
  for (let xx = cx - W * 0.96; xx <= cx + W * 0.96; xx += W * r(0.1, 0.2)) {
    const y = dome(xx) + h * r(0.04, 0.07); const rr = h * r(0.05, 0.1);
    bumps[0].push([xx, y + rr * 0.3, rr]);
    if (rnd() < 0.6) bumps[0].push([xx + rr * r(0.4, 0.9), y + rr * r(0.5, 1.1), rr * r(0.6, 0.85)]);
    if (xx < cx + W * 0.5) bumps[1].push([xx - rr * 0.25, y - rr * 0.02, rr * r(0.6, 0.8)]);
    if (xx < cx - W * 0.1 && rnd() < 0.75) bumps[2].push([xx - rr * 0.35, y - rr * 0.3, rr * r(0.3, 0.45)]);
  }
  const band = []; for (let i = 0; i <= 16; i += 1) { const xx = cx - W * 0.97 + (W * 1.94 * i) / 16; band.push([xx, dome(xx) + h * 0.06]); }
  for (let i = 16; i >= 0; i -= 1) { const xx = cx - W * 0.97 + (W * 1.94 * i) / 16; band.push([xx, dome(xx) + h * (0.2 + 0.05 * Math.sin(i * 1.7))]); }
  o += `<path d="${poly(band)}" fill="#6E8A36"/>` + blobs('#6E8A36', bumps[0]) + blobs('#86A244', bumps[1]) + blobs('#A3BC5C', bumps[2]);
  // the curtains in front, parted where the trunk shows, the lit side longer
  o += curtain(cx - W * 0.98, x - t * 2.4, h * 0.14, base - h * 0.08, 14, 0.36, '#7E9A3A') + curtain(x + t * 2.8, cx + W * 0.98, h * 0.14, base - h * 0.1, 12, 0.36, '#738F36');
  o += curtain(cx - W * 0.9, x - t * 4, h * 0.17, base - h * 0.2, 10, 0.32, '#9DB55A') + curtain(x + t * 4.6, cx + W * 0.62, h * 0.18, base - h * 0.3, 6, 0.3, '#8BA348');
  let strands = '';
  for (let i = 0; i < 10; i += 1) { const sx = cx + r(-W * 0.92, W * 0.6); if (Math.abs(sx - x) < t * 3) continue; const sy = dome(sx) + h * 0.16; const len = r(0.35, 0.6) * (base - sy); strands += `M${f(sx)} ${f(sy)}q${f(r(-1.5, 1.5))} ${f(len * 0.5)} ${f(r(-2.4, 2.4))} ${f(len)}`; }
  return o + `<path d="${strands}" stroke="#B5CB72" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3.4 1.4" fill="none"/>`;
}

/** A wicker basket of the dog's toys: a ball, a rope tug and a bone looking out over the rim. */
function toyBasket(x, y) {
  return `<g transform="translate(${x} ${y})">${contact(0.6, 0.4, 10, 1.4)}` +
    `<path d="M1.6 -8.6 l4.4 -8" stroke="${C.dGlow}" stroke-width="2.6" stroke-linecap="round"/><path d="M1.6 -8.6 l4.4 -8" stroke="${C.dLand}" stroke-width="2.6" stroke-dasharray="1.2 1.4"/><circle cx="6.4" cy="-17.2" r="1.7" fill="${C.dLand}"/>` +
    `<path d="M-6.4 -11.4 a1.3 1.3 0 1 1 1.6 -1.6 l3.2 2.4 a1.3 1.3 0 1 1 1.4 1.8 a1.3 1.3 0 1 1 -1.6 1.6 l-3.2 -2.4 a1.3 1.3 0 1 1 -1.4 -1.8 Z" fill="${C.cream}"/>` +
    `<circle cx="-1.4" cy="-9.4" r="3" fill="#D8E04A"/><path d="M-3.8 -10.2 q2.4 1.6 4.8 0" stroke="${C.paper}" stroke-width="0.6" fill="none"/>` +
    `<path d="M-8 -8.4 h16 l-1.8 8.4 h-12.4 Z" fill="${C.clay2}"/><path d="M-7.4 -5.6 h14.8 M-6.8 -2.8 h13.6" stroke="${C.clay3}" stroke-width="0.9"/><path d="M-5 -8.4 l0.6 8.4 M-1.6 -8.4 l0.2 8.4 M1.8 -8.4 l-0.2 8.4 M5.2 -8.4 l-0.6 8.4" stroke="${C.clay1}" stroke-width="0.6"/>` +
    `<rect x="-8.6" y="-9.6" width="17.2" height="2.2" rx="1.1" fill="${C.clay3}"/><path d="M-8.4 -8.6 h17" stroke="${C.clay1}" stroke-width="0.5"/></g>`;
}

/** The toys about the grass (flat things, safe anywhere): ball, rope tug, frisbee, squeaky bone. */
function fieldToys() {
  const ball = (x, y, k) => `${contact(x + 0.6, y + 2.6 * k, 3.4 * k, 0.8 * k, 0.2)}<circle cx="${x}" cy="${y}" r="${f(3.2 * k)}" fill="#D8E04A"/><path d="M${f(x - 2.6 * k)} ${f(y - 1)} q${f(2.6 * k)} ${f(2 * k)} ${f(5.2 * k)} 0" stroke="${C.paper}" stroke-width="${f(0.7 * k)}" fill="none"/><circle cx="${f(x - 1 * k)}" cy="${f(y - 1.4 * k)}" r="${f(0.8 * k)}" fill="${C.paper}" opacity="0.6"/>`;
  let o = ball(1376, 566, 1);
  // the rope tug, knotted at both ends with frayed tassels
  o += `<g transform="translate(1426 603)">${contact(0, 1.6, 16, 1, 0.16)}<path d="M-12 0 c5 -3.4 10 2.4 15 -0.6 c4 -2.2 7 0.6 9 -0.2" stroke="${C.dGlow}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M-12 0 c5 -3.4 10 2.4 15 -0.6 c4 -2.2 7 0.6 9 -0.2" stroke="${C.dLand}" stroke-width="3" stroke-dasharray="1.6 2.4" fill="none"/>` +
    `<circle cx="-13" cy="0.4" r="2.6" fill="${C.dLand}"/><circle cx="13.4" cy="-0.6" r="2.6" fill="${C.dLand}"/><path d="M-15.4 0.6 l-3 1.6 M-15.4 1.2 l-2.4 2.6 M15.8 -0.4 l3 1.4 M15.6 0.4 l2.2 2.4" stroke="${C.dGlow}" stroke-width="1" stroke-linecap="round"/></g>`;
  // the frisbee, lying on the grass, its rim catching the light
  o += `<g transform="translate(1270 627)">${contact(0.6, 1.4, 9.6, 2.2, 0.16)}<ellipse cx="0" cy="0" rx="9" ry="3.4" fill="${C.mereShine}"/><ellipse cx="0" cy="-0.4" rx="6.6" ry="2.2" fill="${C.mere}"/><path d="M-8.4 -1 a9 3.4 0 0 1 12 -2.2" stroke="${C.mereLight}" stroke-width="0.8" fill="none"/></g>`;
  // a squeaky bone in the long grass
  o += `<g transform="translate(1186 640) rotate(-12)">${contact(0, 2, 7, 1, 0.16)}<path d="M-6 -1.6 a1.8 1.8 0 1 1 2.2 -2 h7.6 a1.8 1.8 0 1 1 2.2 2 a1.8 1.8 0 1 1 -2.2 2 h-7.6 a1.8 1.8 0 1 1 -2.2 -2 Z" fill="${C.cream}"/><path d="M-3.6 -0.6 h7.2" stroke="${C.creamDeep}" stroke-width="0.9"/></g>`;
  return o;
}

/** Paw prints along a list of points, alternating left and right of the line (the paw is a shared piece). */
function pawTrail(pts, fill, k) {
  let o = '';
  pts.forEach(([x, y], i) => {
    const side = i % 2 ? 1 : -1;
    o += `<use href="#kmp-paw" x="${f(x + side * 1.6 * (k || 1))}" y="${f(y)}"/>`;
  });
  return `<g fill="${fill}">${o}</g>`;
}

function fieldMeadow() {
  // The grass in the hill's greens: patches in several papers, the mown training lane in front of the course with its
  // stripes, and a rougher strip of longer grass along the fence.
  let o = '';
  let p = '';
  [[1214, 548, 64, 5, '#86A044'], [1352, 546, 74, 5.6, '#93AC4E'], [1520, 540, 90, 6, '#86A044'], [1190, 612, 52, 12, '#A0B85D'], [1300, 618, 80, 10, '#93AC4E'],
    [1446, 612, 70, 9, '#A0B85D'], [1560, 604, 56, 10, '#8FA74B'], [1236, 646, 70, 10, '#8FA74B'], [1370, 640, 60, 8, '#A5BC62'], [1500, 628, 70, 8, '#93AC4E'],
    [1160, 584, 24, 9, '#93AC4E'], [1588, 572, 40, 9, '#A0B85D'], [1420, 652, 46, 6, '#7C9840'], [1214, 668, 40, 6, '#86A044'], [1536, 640, 30, 5, '#7C9840'], [1080, 630, 44, 10, '#93AC4E']].forEach(([cx, cy, rx, ry, c]) => { p += softPatch(cx, cy, rx, ry, c, 0.14); });
  o += `<g filter="url(#km-layer-xs)">${p}</g>`;
  // The mown lane: in front of the course, from the bridge's path to the bay, mown in stripes along its length.
  const top = [[1166, 572], [1200, 560], [1300, 556.4], [1440, 555.4], [1610, 554]];
  const bot = [[1166, 584], [1200, 596], [1300, 600], [1440, 596], [1610, 592]];
  const at = (k) => (x) => along(top, x) + (along(bot, x) - along(top, x)) * k;
  const band = (k0, k1, x0, fill) => {
    const pts = []; for (let x = x0; x <= 1610; x += 10) pts.push([x, at(k0)(x)]);
    const back = []; for (let x = 1610; x >= x0; x -= 10) back.push([x, at(k1)(x)]);
    return `<path d="${poly(pts.concat(back))}" fill="${fill}"/>`;
  };
  o += `<g filter="url(#km-layer-xs)">${band(0, 1, 1170, '#A9C066')}${band(0.25, 0.5, 1186, '#B5CA72')}${band(0.75, 0.97, 1196, '#B5CA72')}</g>`;
  o += `<path d="M1172 571 Q1162 578 1172 585" stroke="#A9C066" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  return o;
}

function fieldGrass() {
  // Grass, flowers and clover on the open Field: tufts and blades thick in the rough by the fence and round the lane,
  // short on the lane, longer toward the bank; drifts of daisies, buttercups and clover; bigger in front.
  const lip = (x) => shoreY(x) - 5;
  const laneTop = [[1166, 572], [1200, 560], [1300, 556.4], [1440, 555.4], [1610, 554]];
  const laneBot = [[1166, 584], [1200, 596], [1300, 600], [1440, 596], [1610, 592]];
  const onLane = (x, y) => x > 1176 && y > along(laneTop, x) + 1 && y < along(laneBot, x) - 1;
  let uses = '';
  const blades = { '#5E7A2A': [], '#6F8A34': [], '#7E9A3A': [], '#8BA348': [], '#97AE52': [] };
  const blade = (x, y, h, cols) => { const lean = r(-1.8, 1.8); blades[pick(cols)].push(`M${f(x - 0.8)} ${f(y)}q${f(lean * 0.4 + 0.8)} ${f(-h * 0.6)} ${f(lean + 0.8)} ${f(-h)}q${f(-lean * 0.5 + 0.3)} ${f(h * 0.5)} ${f(0.8)} ${f(h)}Z`); };
  // the rough along the fence and round the course
  for (let i = 0; i < 150; i += 1) { const x = r(1146, 1600); const y = r(536, 556); uses += `<use href="#kmt-${pick(['a', 'b', 'c', 'd', 'e'])}" x="${f(x)}" y="${f(y)}"/>`; blade(x + r(-4, 4), y + r(0, 3), r(4, 8), ['#5E7A2A', '#6F8A34', '#7E9A3A']); }
  // the open meadow, the lane mown short
  for (let i = 0; i < 600; i += 1) {
    const x = r(1030, 1600); const y = r(556, lip(x));
    if (onLane(x, y) && rnd() < 0.85) continue;
    const near = (y - 556) / 100;
    if (i % 3 === 0) uses += `<use href="#kmt-${pick(['a', 'b', 'c', 'd', 'e'])}" x="${f(x)}" y="${f(y)}"/>`;
    else blade(x, y, r(3.4, 7) * (0.8 + near * 0.6), near > 0.5 ? ['#6F8A34', '#7E9A3A', '#8BA348', '#97AE52'] : ['#5E7A2A', '#6F8A34', '#7E9A3A', '#8BA348']);
  }
  // the lane's edges, where the mower stops
  for (let x = 1180; x < 1600; x += r(3, 6)) { blade(x, along(laneTop, x) + r(-0.5, 1), r(3, 6), ['#6F8A34', '#7E9A3A']); blade(x + r(-2, 2), along(laneBot, x) + r(0, 1.5), r(4, 7), ['#6F8A34', '#7E9A3A', '#8BA348']); }
  // longer grass along the top of the bank, with seed heads
  let seeds = '';
  for (let x = 1034; x < 1600; x += r(4, 9)) { const y = lip(x) + r(-1, 3); const h = r(7, 12); blade(x, y, h, ['#7E9A3A', '#8BA348', '#97AE52']); if (rnd() < 0.4) seeds += `M${f(x + 0.6)} ${f(y - h - 1.6)}v2.6`; }
  let o = uses + Object.entries(blades).map(([c, ds]) => (ds.length ? `<path d="${ds.join('')}" fill="${c}"/>` : '')).join('');
  o += `<path d="${seeds}" stroke="${C.sand}" stroke-width="1.1" stroke-linecap="round"/>`;
  // drifts of wildflowers and clover (shared pieces), in clusters; mown out of the lane
  let fl = '';
  const drift = (cx, cy, rx, ry, n, mix) => {
    for (let i = 0; i < n; i += 1) {
      const a = r(0, Math.PI * 2); const d = Math.sqrt(rnd());
      const x = cx + Math.cos(a) * rx * d; const y = cy + Math.sin(a) * ry * d;
      if (onLane(x, y) || y > lip(x) - 1 || y < 538) continue;
      fl += `<use href="#kmf-${pick(mix.split(''))}" x="${f(x)}" y="${f(y)}"/>`;
    }
  };
  [[1196, 548, 40, 4, 22, 'wwyc'], [1330, 546, 34, 4, 18, 'wcy'], [1470, 544, 30, 4, 14, 'ywt'], [1560, 548, 30, 4, 12, 'wwb'],
    [1214, 618, 34, 10, 34, 'wwcy'], [1330, 626, 40, 10, 36, 'ywwt'], [1452, 614, 40, 10, 34, 'cwwy'], [1560, 608, 32, 9, 26, 'wbwy'],
    [1170, 652, 24, 8, 18, 'ywc'], [1290, 650, 30, 6, 20, 'wwt'], [1410, 640, 28, 6, 18, 'cwb'], [1064, 600, 26, 14, 26, 'wywc'], [1090, 652, 30, 10, 22, 'wwyt']].forEach(([a, b, c, d, n, m]) => drift(a, b, c, d, n, m));
  // clover: leaves in low patches and white heads among them
  let leaves = '';
  [[1240, 630, 18, 5], [1392, 624, 16, 4], [1520, 618, 14, 4], [1310, 572, 10, 3]].forEach(([cx, cy, rx, ry]) => {
    for (let i = 0; i < 18; i += 1) { const a = r(0, Math.PI * 2); const d = Math.sqrt(rnd()); const x = cx + Math.cos(a) * rx * d; const y = cy + Math.sin(a) * ry * d; leaves += `<use href="#kmc-leaf" x="${f(x)}" y="${f(y)}"/>`; if (i % 3 === 0) fl += `<use href="#kmf-c" x="${f(x + 0.6)}" y="${f(y - 0.4)}"/>`; }
  });
  o += `<g fill="#6F8F38">${leaves}</g>` + fl;
  // the nearest flowers, bigger toward the front
  let big = '';
  for (let i = 0; i < 56; i += 1) { const x = r(1034, 1596); const y = r(lip(x) - 26, lip(x) - 3); if (onLane(x, y)) continue; big += `<use href="#kmf-${pick(['w', 'w', 'y', 'c', 't'])}" x="${f(x / 1.35)}" y="${f(y / 1.35)}"/>`; }
  o += `<g transform="scale(1.35)">${big}</g>`;
  return o;
}

/** A berry bush along the fence, like the Orchard's (berries in the bush's own red). */
function berryBush(x, y, s) {
  return `${contact(x + 1, y + 0.6, 15 * s, 1.8 * s, 0.18)}` + blobs('#55732F', [[x, y - 9 * s, 10 * s], [x - 9 * s, y - 5 * s, 7 * s], [x + 9 * s, y - 5 * s, 7.5 * s]]) +
    blobs('#6B8A3A', [[x - 1.6 * s, y - 11 * s, 7 * s], [x - 9.4 * s, y - 6.4 * s, 4.6 * s], [x + 7.6 * s, y - 7 * s, 5 * s]]) + blobs('#86A246', [[x - 3.4 * s, y - 14 * s, 3 * s], [x - 10.6 * s, y - 8 * s, 1.8 * s]]) +
    blobs('#C8433A', [[x - 3 * s, y - 12 * s, 1.4 * s], [x + 4 * s, y - 8 * s, 1.4 * s], [x + 1 * s, y - 14.6 * s, 1.2 * s], [x - 7 * s, y - 6 * s, 1.2 * s], [x + 8 * s, y - 4.4 * s, 1.2 * s]]);
}

function field() {
  // Lakeside Field: open grass running down to the lake bay, a split-rail fence, the dog house, the course, the willow,
  // toys, and paw prints running into the water (see FIELD_DRAWS above).
  const out = ownSeed(FIELD_SEED, () => {
    let o = '';
    o += `<g filter="url(#layer)">`;
    o += ridge([[920, 552], [1020, 540], [1140, 524], [1280, 530], [1440, 512], [1600, 520]], 760, 'url(#km-fade-field-1)');
    o += ridge([[920, 558], [1020, 546], [1140, 532], [1280, 536], [1440, 520], [1600, 528]], 760, 'url(#km-fade-field-2)');
    o += `</g>`;
    o += fieldMeadow();
    [[1176, 470], [1236, 466], [1296, 470], [1356, 464], [1416, 468]].forEach(([x, y], i) => {
      const n = i + 2;
      o += `<g data-km-part="dog-house-${n}" display="none" filter="url(#layer-sm)" transform="translate(${x} ${y}) scale(0.62)">${shadow(30, 62, 44, 4)}<path d="M0 60 V24 L30 4 L60 24 V60 Z" fill="${C.dSky}"/><path d="M4 40 h52 M4 50 h52" stroke="#C8D98C" stroke-width="1.4"/><path d="M-6 26 L30 0 L66 26" stroke="${C.dLand}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M18 60 V46 a12 12 0 0 1 24 0 V60 Z" fill="${C.dDark}"/>${`<rect x="12" y="26" width="36" height="8" rx="2" fill="${C.paper}"/><text data-km-part="dog-house-name-${n}" x="30" y="32.2" text-anchor="middle" font-family="Candara, 'Gill Sans', 'Trebuchet MS', sans-serif" font-size="5.8" font-weight="700" fill="${C.dLand}"></text>`}</g>`;
    });
    o += `<g filter="url(#layer-sm)">${fence()}</g>`;
    // The dog house: a pitched roof of shingles, a name board, a round door, a water bowl.
    o += `<g data-km-part="dog-house-1" filter="url(#layer-sm)" transform="translate(${KENNEL[0]} ${KENNEL[1]})">${shadow(30, 62, 44, 4)}<path d="M0 60 V24 L30 4 L60 24 V60 Z" fill="${C.dSky}"/><path d="M4 30 h52 M4 40 h52 M4 50 h52" stroke="#C8D98C" stroke-width="1.4"/><path d="M-6 26 L30 0 L66 26" stroke="${C.dLand}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    for (let i = 0; i < 4; i += 1) o += `<path d="M${4 + i * 8} ${20 - i * 5} l8 6 M${56 - i * 8} ${20 - i * 5} l-8 6" stroke="${C.dRusset}" stroke-width="2"/>`;
    o += `<path d="M18 60 V44 a12 12 0 0 1 24 0 V60 Z" fill="${C.dDark}"/><rect x="12" y="26" width="36" height="8" rx="2" fill="${C.paper}"/><text data-km-part="dog-house-name-1" x="30" y="32.2" text-anchor="middle" font-family="Candara, 'Gill Sans', 'Trebuchet MS', sans-serif" font-size="5.8" font-weight="700" fill="${C.dLand}">Asher</text>`;
    o += `<ellipse cx="76" cy="60" rx="8" ry="3.2" fill="${C.fGlow}"/><ellipse cx="76" cy="58.6" rx="5.6" ry="2" fill="${C.mereLight}"/><path d="M-4 60 h8 l-1 -3 h-6 Z" fill="${C.dTan}"/></g>`;
    // Along the fence, behind the open grass, back to front: the willow by the bay, berry bushes, the course (a bar
    // jump, the weave poles, the willow hoop), a trough, the toy basket and a bench under the willow.
    const things = [
      [541, willow(1584, 541, 126)],
      [546, berryBush(1158, 546, 0.8)], [547, berryBush(1318, 547, 0.62)],
      [549, barJump(1340, 549)], [550, weavePoles(1394, 550, 6, 11)], [551, willowHoop(1480, 551)],
      [551.4, toyBasket(1571, 551.4)],
      [551.2, `<g transform="translate(1546 551.2) scale(1.3)">${bench(0, 0)}</g>`],
    ];
    things.sort((a, b) => a[0] - b[0]);
    o += `<g filter="url(#layer-sm)">${things.map((t) => t[1]).join('')}</g>`;
    o += fieldGrass();
    // Paw prints over the grass from the lane, and on down the beach into the water (see fieldBeach).
    const trail = [];
    for (let i = 0; i < 12; i += 1) { const t = i / 11; trail.push([1252 + t * 46 + Math.sin(t * 5) * 6, 606 + t * 46]); }
    o += pawTrail(trail.filter(([x, y]) => y < shoreY(x) - 6), C.dGrassDark, 1);
    let spots = '';
    [[1352, 572], [1384, 576], [1416, 574], [1448, 577], [1480, 573], [1512, 576]].forEach(([x, y], i) => { spots += `<ellipse cx="${x}" cy="${y + 0.6}" rx="5" ry="1.7" fill="${C.ink}" opacity="0.14"/><ellipse cx="${x}" cy="${y}" rx="4.6" ry="1.6" fill="${i % 2 ? C.paper : C.dGlow}"/><ellipse cx="${x - 0.6}" cy="${y - 0.3}" rx="2.4" ry="0.7" fill="${i % 2 ? C.fPale : C.sand}"/>`; });
    let clocks = '';
    [[1112, 646], [1146, 660], [1248, 652], [1396, 636], [1472, 630], [1574, 618], [1060, 618]].forEach(([x, y]) => { const h = r(9, 13); clocks += `<path d="M${x} ${y} q${f(r(-1, 1))} ${f(-h / 2)} ${f(r(-1.4, 1.4))} ${f(-h)}" stroke="#7E9A3A" stroke-width="0.7" fill="none"/><circle cx="${f(x + r(-1, 1))}" cy="${f(y - h - 2)}" r="2.6" fill="${C.paper}" opacity="0.92"/><circle cx="${x}" cy="${f(y - h - 2.2)}" r="0.7" fill="${C.creamDeep}"/>`; });
    o += spots + clocks;
    o += `<g filter="url(#layer-sm)">${fieldToys()}</g>`;
    // Flags with paw prints at the start and the end of the course, and one by the bridge where the path comes in.
    let flags = '';
    [[1100, 612, C.paper], [1380, 551, C.dGlow], [1503, 551, C.paper]].forEach(([x, y, col], i) => {
      flags += `<path d="M${x} ${y} v-20" stroke="${C.dLand}" stroke-width="1.6"/><path d="M${x} ${y - 20} h12 a4.5 4.5 0 0 1 0 9 h-12 Z" fill="${col}" class="km-flag" style="animation-delay:-${i * 0.6}s"/>`;
      flags += `<g fill="${C.dLand}"><ellipse cx="${x + 6}" cy="${y - 14.6}" rx="1.6" ry="1.3"/><circle cx="${x + 4.2}" cy="${y - 17.2}" r="0.8"/><circle cx="${x + 6}" cy="${y - 17.8}" r="0.8"/><circle cx="${x + 7.8}" cy="${y - 17.2}" r="0.8"/></g>`;
    });
    // A butterfly over the clover (by day).
    flags += butterfly(1352, 600, C.paper, 2);
    live(`<g class="km-field-life">${flags}</g>`);
    return o;
  });
  for (let i = 0; i < FIELD_DRAWS; i += 1) rnd(); // the park's random sequence moves on as it did when the old field drew from it
  return g('id="km-field"', out);
}

/** The pieces the Field repeats (scene files only): a paw print, a clover leaf. */
function fieldDefs() {
  return `<g id="kmp-paw"><ellipse cx="0" cy="0" rx="1.5" ry="1.2"/><circle cx="-1.6" cy="-1.7" r="0.62"/><circle cx="-0.55" cy="-2.35" r="0.62"/><circle cx="0.6" cy="-2.35" r="0.62"/><circle cx="1.65" cy="-1.7" r="0.62"/></g>` +
    `<g id="kmc-leaf"><circle cx="-0.9" cy="-0.3" r="0.95"/><circle cx="0.9" cy="-0.3" r="0.95"/><circle cx="0" cy="-1.5" r="0.95"/></g>`;
}

/**
 * Owner, 2026-10-09: "add another lake beach section on this side." Below the Orchard the cut bank eases down into a
 * second little beach like the Field's (land units, drawn over the bank): the sand comes up the bank and goes back
 * into it in a curve at both ends, pebbles gather where the water reaches, the lake laps at a wet edge, and there is
 * a piece of driftwood and a clump of reeds. As tall as the Field's beach, at the scale of the dog and the keepers.
 */
const BEACH_O = [150, 600];
function orchardBeach() {
  const [X0, X1] = BEACH_O;
  const ease = (k) => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };
  const reach = (x) => 39 * Math.min(ease((x - X0) / 130), ease((X1 - x) / 130));
  const water = (x) => shoreY(x) + 40;
  const cols = [];
  for (let x = X0; x <= X1; x += 6) cols.push(x);
  const lineAt = (k, wob) => cols.map((x) => [x, water(x) - reach(x) * k + (wob ? r(-wob, wob) : 0)]);
  const fill = (k0, k1, c, wob) => `<path d="${poly(lineAt(k0, wob).concat(lineAt(k1, 0).reverse()))}" fill="${c}"/>`;
  let o = fill(1, 0, C.sand, 0.4) + fill(0.55, 0, '#CDB991', 0.5) + fill(0.24, 0, '#B9A47C', 0.4) + fill(0.08, 0, '#A08A66', 0);
  o += `<path d="${poly(lineAt(1, 0).concat(lineAt(0.92, 0).reverse()))}" fill="${C.ink}" opacity="0.14"/>`;
  let rip = '';
  for (let i = 0; i < 22; i += 1) { const x = r(X0 + 60, X1 - 60); const k = r(0.35, 0.9); if (reach(x) < 14) continue; const y = water(x) - reach(x) * k; rip += `M${f(x)} ${f(y)}q2.4 -1 4.8 0`; }
  o += `<path d="${rip}" stroke="#C2AF8A" stroke-width="0.8" stroke-linecap="round" fill="none"/>`;
  // the wet edge, and the lake lapping at it
  o += `<path d="${poly(lineAt(0.1, 0).concat(lineAt(0, 0).reverse()))}" fill="#8E7A5E" opacity="0.5"/>`;
  let lap = '';
  for (let x = X0 + 60; x < X1 - 60; x += r(46, 90)) { const y = water(x) - reach(x) * 0.05; const w = r(22, 36); lap += `M${f(x)} ${f(y)}c${f(w * 0.3)} -1.6 ${f(w * 0.6)} 0.8 ${f(w)} -0.4`; }
  o += `<path d="${lap}" stroke="${C.mereLight}" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  // driftwood, bleached, with a snapped branch
  const dx = 360;
  o += `<g transform="translate(${dx} ${f(water(dx) - 20)}) rotate(5)">${contact(0, 2.6, 22, 1.6, 0.18)}<path d="M-20 0 C-10 -3 10 -3 20 -1 C21.4 1 20.4 3 18 3.2 C8 2.2 -10 3.2 -20 3.2 C-22.4 2.2 -22.4 1 -20 0 Z" fill="#B8A88C"/>` +
    `<path d="M-16 0.6 C-6 -1 8 -1 16 0" stroke="#DCD1BA" stroke-width="0.9" fill="none"/><path d="M-12 2.2 h10 M4 1.8 h9" stroke="#8E7E62" stroke-width="0.6"/><path d="M6 -1.6 l5 -5.4" stroke="#B8A88C" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="-20.4" cy="1.6" rx="1.4" ry="1.7" fill="#8E7E62"/></g>`;
  // a clump of reeds where the sand gives way to the bank
  let reeds = '';
  for (let i = 0; i < 9; i += 1) {
    const x = 520 + i * 2.8; const h = r(18, 30); const y = water(x) - reach(x) * 0.15 + 1;
    reeds += `<path d="M${f(x)} ${f(y)} q${f(r(-2, 2))} ${f(-h / 2)} ${f(r(-3, 3))} ${f(-h)}" stroke="${i % 3 ? '#4F6E3A' : '#5E7A2A'}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
    if (i % 3 === 0) reeds += `<rect x="${f(x - 1.2)}" y="${f(y - h * 0.86)}" width="2.4" height="6" rx="1.2" fill="${C.clay4}"/>`;
  }
  o += `<g class="km-sway">${reeds}</g>`;
  const peb = [[], [], [], []];
  for (let i = 0; i < 80; i += 1) {
    const x = r(X0 + 4, X1 - 4); if (reach(x) < 4) continue;
    const k = rnd() < 0.65 ? r(0, 0.28) : r(0.3, 0.95);
    const y = water(x) - reach(x) * k; const s = r(0.8, 2.2);
    peb[0].push([x + 0.3, y + 0.5, s * 1.1, s * 0.62]);
    peb[1 + (i % 3)].push([x, y, s, s * 0.58]);
  }
  o += ovals('#8E7A5E', peb[0]) + ovals(C.fGlow, peb[1]) + ovals(C.fLight, peb[2]) + ovals('#C9BFA6', peb[3]);
  let tufts = '';
  for (let x = X0 + 20; x < X1 - 20; x += r(5, 10)) { if (reach(x) < 6) continue; const y = water(x) - reach(x) + r(0.5, 3); tufts += `<use href="#kmt-${pick(['a', 'b', 'c', 'e'])}" x="${f(x)}" y="${f(y)}"/>`; }
  return `<g class="km-beach">${o}${tufts}</g>`;
}

/**
 * The bay's edge below the Field (land units, drawn over the bank): the bank's cut face sinks into a little beach of
 * sand and pebbles from the stream's mouth eastward, until the grass runs straight down to the sand. A wrack line, a
 * stick, grass tufts at the top, and the dog's paw prints down to the water.
 */
const BEACH = [1188, 1600];
function fieldBeach() {
  const [X0, X1] = BEACH;
  const reach = (x) => { const k = Math.max(0, Math.min(1, (x - X0) / 230)); return 39 * k * k * (3 - 2 * k); }; // how far up the bank the sand comes
  const water = (x) => shoreY(x) + 40;
  const cols = [];
  for (let x = X0; x <= X1; x += 6) cols.push(x);
  const lineAt = (k, wob) => cols.map((x) => [x, water(x) - reach(x) * k + (wob ? r(-wob, wob) : 0)]);
  const fill = (k0, k1, c, wob) => `<path d="${poly(lineAt(k0, wob).concat(lineAt(k1, 0).reverse()))}" fill="${c}"/>`;
  let o = '';
  // where the bank still stands above the sand, its overhang throws a short shadow
  o += fill(1, 0, C.sand, 0.4) + fill(0.55, 0, '#CDB991', 0.5) + fill(0.24, 0, '#B9A47C', 0.4) + fill(0.08, 0, '#A08A66', 0);
  o += `<path d="${poly(lineAt(1, 0).concat(lineAt(0.92, 0).reverse()))}" fill="${C.ink}" opacity="0.14"/>`;
  // ripples of sand, a wrack line of dried weed and twigs, a stick
  let rip = '';
  for (let i = 0; i < 26; i += 1) { const x = r(X0 + 70, X1 - 6); const k = r(0.35, 0.9); if (reach(x) < 14) continue; const y = water(x) - reach(x) * k; rip += `M${f(x)} ${f(y)}q${f(2.4)} -1 ${f(4.8)} 0`; }
  o += `<path d="${rip}" stroke="#C2AF8A" stroke-width="0.8" stroke-linecap="round" fill="none"/>`;
  let wrack = '';
  for (let x = X0 + 60; x < X1; x += r(5, 12)) { const y = water(x) - reach(x) * 0.3 + r(-1, 1); wrack += `M${f(x)} ${f(y)}q${f(r(1, 3))} ${f(r(-1.2, 1.2))} ${f(r(3, 6))} ${f(r(-0.6, 0.6))}`; }
  o += `<path d="${wrack}" stroke="#6B5A3A" stroke-width="0.7" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  o += `<g transform="translate(1444 ${f(water(1444) - 22)}) rotate(-8)">${contact(0, 1.4, 11, 1, 0.16)}<path d="M-10 0 L9 -0.8" stroke="${C.clay3}" stroke-width="2.2" stroke-linecap="round"/><path d="M2 -0.6 l4 -3.4 M-4 -0.2 l-3 -2.6" stroke="${C.clay3}" stroke-width="1.2" stroke-linecap="round"/><path d="M-9.4 -0.6 L8 -1.2" stroke="${C.clay1}" stroke-width="0.6" stroke-linecap="round"/></g>`;
  // pebbles: a few on the dry sand, many where the water reaches, lit above, wet and dark below
  const peb = [[], [], [], []];
  for (let i = 0; i < 96; i += 1) {
    const x = r(X0 + 4, X1 - 2); if (reach(x) < 4) continue;
    const k = rnd() < 0.65 ? r(0, 0.28) : r(0.3, 0.95);
    const y = water(x) - reach(x) * k;
    const s = r(0.8, 2.2);
    peb[0].push([x + 0.3, y + 0.5, s * 1.1, s * 0.62]);
    peb[1 + (i % 3)].push([x, y, s, s * 0.58]);
  }
  o += ovals('#8E7A5E', peb[0]) + ovals(C.fGlow, peb[1]) + ovals(C.fLight, peb[2]) + ovals('#C9BFA6', peb[3]);
  o += ovals(C.fPale, peb[1].filter((_, i) => i % 2).map(([x, y, a, b]) => [x - a * 0.25, y - b * 0.35, a * 0.45, b * 0.3]));
  // grass tufts where the meadow meets the sand
  let tufts = '';
  for (let x = X0 + 30; x < X1; x += r(5, 10)) { const y = water(x) - reach(x) + r(0.5, 3); tufts += `<use href="#kmt-${pick(['a', 'b', 'c', 'e'])}" x="${f(x)}" y="${f(y)}"/>`; }
  o += tufts;
  // the dog's paw prints, pressed into the sand down to the water, where the dog is splashing
  const trail = [];
  for (let i = 0; i < 7; i += 1) { const t = i / 6; const x = 1300 + t * 18; trail.push([x, water(x) - reach(x) * (1 - t * 0.9) + 1.5]); }
  o += pawTrail(trail, '#A89470', 1);
  return `<g class="km-beach">${o}</g>`;
}

/**
 * The bay below the Field (land units, over the water): the shallows paler over the sand, the wash at the water's edge,
 * reeds and cattails, lily pads, a heron fishing, and in the life layer the ducklings after their mother, a clump of
 * reeds in the wind and a dragonfly over the shallows.
 */
function bay() {
  const [X0, X1] = BEACH;
  const water = (x) => shoreY(x) + 40;
  const cols = []; for (let x = X0 + 20; x <= X1; x += 8) cols.push(x);
  const fade = (x) => Math.max(0, Math.min(1, (x - X0 - 20) / 140));
  let o = '';
  o += `<path d="${poly(cols.map((x) => [x, water(x) - 0.4]).concat(cols.slice().reverse().map((x) => [x, water(x) + 2 + 9 * fade(x)])))}" fill="${C.mereShine}"/>`;
  o += `<path d="${poly(cols.map((x) => [x, water(x) - 0.4]).concat(cols.slice().reverse().map((x) => [x, water(x) + 1 + 4 * fade(x)])))}" fill="#3E8090"/>`;
  let wash = '';
  for (let x = X0 + 24; x < X1; x += r(6, 14)) wash += `M${f(x)} ${f(water(x) + 0.3)}q${f(r(2, 4))} ${f(r(0.6, 1.4))} ${f(r(5, 9))} 0`;
  o += `<path d="${wash}" stroke="${WATER.foam}" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.85"/>`;
  // reeds and cattails standing in the water at the bay's edge
  const reedClump = (x0, n, h0) => {
    let s = ''; let heads = '';
    for (let i = 0; i < n; i += 1) {
      const x = x0 + i * r(1.4, 2.4); const y = water(x) + r(2, 6); const h = h0 + r(-5, 6);
      s += `M${f(x)} ${f(y)}q${f(r(-1, 1))} ${f(-h / 2)} ${f(r(-2, 2))} ${f(-h)}`;
      if (rnd() < 0.45) heads += `<rect x="${f(x - 0.8)}" y="${f(y - h * 0.9)}" width="1.6" height="4.4" rx="0.8"/>`;
    }
    return `<path d="${s}" stroke="${C.dGrassDark}" stroke-width="0.9" stroke-linecap="round" fill="none"/><g fill="${C.clay4}">${heads}</g>`;
  };
  o += reedClump(1452, 8, 16) + reedClump(1396, 5, 12);
  // lily pads on the open water
  [[1468, 714, 0.32], [1586, 704, 0.36], [1380, 716, 0.28]].forEach(([x, y, s]) => {
    o += `<path d="M${x} ${y} m${f(-22 * s)} 0 a${f(22 * s)} ${f(9 * s)} 0 1 0 ${f(44 * s)} 0 a${f(22 * s)} ${f(9 * s)} 0 0 0 ${f(-18 * s)} ${f(-8 * s)} l${f(-4 * s)} ${f(8 * s)} Z" fill="#4E7F3A"/>`;
  });
  // a grey heron fishing in the shallows by the reeds, still as a post (owner, 2026-10-09: "and also the fish needs
  // redesign", with the lake's other life): long yellow legs, a slim grey body with the wings folded and their dark
  // flight feathers, an S-bent white neck streaked black, a black crest and a dagger bill, about knee-high to a keeper
  o += `<g transform="translate(1528 ${f(water(1528) + 30)}) scale(0.62)">` +
    `<ellipse cx="0" cy="0.8" rx="11" ry="1.8" fill="none" stroke="${C.mereLight}" stroke-width="0.9" opacity="0.7"/><ellipse cx="0" cy="0.8" rx="6" ry="1" fill="none" stroke="${C.mereLight}" stroke-width="0.7" opacity="0.6"/>` +
    `<path d="M-2 0.4 L-1.2 -17 M2.2 0.4 L1.4 -17" stroke="#C9B46A" stroke-width="1.3" stroke-linecap="round"/><path d="M-1.2 -9 l-0.6 0.6 M1.6 -9 l0.6 0.6" stroke="#A8954E" stroke-width="1.4"/>` +
    `<path d="M-15 -20 C-10 -21 -2 -27 6 -26 C11 -25.6 12 -21 9 -18.4 C4 -15 -6 -15.4 -15 -20 Z" fill="#A9B4BE"/>` +
    `<path d="M-15 -20 C-8 -19 0 -19.6 6 -21.4 C3 -18 -6 -16.6 -15 -20 Z" fill="#7F8E9B"/><path d="M-17 -20.6 L-11 -21.6 L-10 -18.8 Z" fill="#4A5662"/><path d="M-6 -22.6 C-2 -24 3 -24.6 7 -23.6" stroke="#C9D2DA" stroke-width="0.8" fill="none"/>` +
    `<path d="M6 -25 C10 -29 6 -33 9 -37.6 C10.6 -40 12.4 -41 12.6 -43" stroke="#E8ECEF" stroke-width="3.4" stroke-linecap="round" fill="none"/>` +
    `<path d="M8.6 -27.6 C9.6 -30.4 7.6 -33.4 9.6 -36.6" stroke="#3A4048" stroke-width="0.6" fill="none" opacity="0.8"/>` +
    `<ellipse cx="13" cy="-44.4" rx="3" ry="2.2" fill="#F2F4F6"/><path d="M11 -45.8 q2.6 -1.2 4.8 -0.2 l-5.8 -1.6 Z" fill="#22272C"/><path d="M10.4 -45.4 l-6 -1.4 l5.6 0.4 Z" fill="#22272C"/>` +
    `<path d="M15.6 -44.8 L24 -43.6 L15.6 -43.4 Z" fill="#E2B04A"/><circle cx="13.8" cy="-44.8" r="0.5" fill="#C9A13A"/><circle cx="13.8" cy="-44.8" r="0.24" fill="#111"/></g>`;
  // what moves: ducklings after the duck (a brown duck, her blue wing patch showing), reeds in the wind, a dragonfly over the shallows
  let life = '';
  const wake = (x, y, w) => `<path d="M${f(x + 3)} ${f(y + 1.4)} l${f(w)} ${f(-0.8)} M${f(x + 3)} ${f(y + 1.9)} l${f(w)} ${f(0.8)}" stroke="${C.mereLight}" stroke-width="0.6" stroke-linecap="round" opacity="0.7"/>`;
  life += `<g class="km-bob" style="animation-delay:-0.7s">${motherDuck()}${wake(1517, 721.6, 6) + wake(1530, 723, 4) + wake(1543, 725.6, 3.6) + wake(1556, 727.4, 3.2)}${[[1530, 721, 0.38], [1543, 723.6, 0.34], [1556, 725.4, 0.32]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 8 c-6 0 -8 -8 -2 -10 c4 -1 6 2 10 2 c6 0 10 -2 12 0 c0 6 -6 9 -14 9 Z" fill="#E9C24A"/><circle cx="-1" cy="-4" r="5" fill="#E9C24A"/><path d="M-6 -4 l-4 1 l4 2 Z" fill="${C.clay2}"/><circle cx="-2" cy="-5" r="1.2" fill="${C.ink}"/></g>`).join('')}</g>`;
  life += `<g class="km-sway" style="animation-delay:-1.3s">${reedClump(1500, 6, 20)}</g>`;
  life += `<g transform="translate(1416 ${f(water(1416) + 4)}) scale(1.4)" class="km-day-only"><g class="km-flit" style="animation-duration:7s;animation-delay:-4s"><g class="km-wing"><path d="M-1.6 -0.4 q-1 -3 0.4 -3.2 q0.6 1.6 -0.4 3.2 Z M0.4 -0.4 q0.4 -3.2 1.8 -3 q-0.4 1.8 -1.8 3 Z" fill="${C.paper}" opacity="0.85"/></g><path d="M-3 0 H5" stroke="${C.mereShine}" stroke-width="0.7" stroke-linecap="round"/><circle cx="-3.4" cy="-0.1" r="0.75" fill="${C.mere}"/></g></g>`;
  live(`<g class="km-bay-life">${life}</g>`);
  return `<g class="km-bay">${o}</g>`;
}

/** The ducklings' mother on the bay (owner, 2026-10-09: "the ducklings: with a duck, on the water"). */
const motherDuck = () => `<g transform="translate(1515 718.4) scale(0.5)"><path d="M12 10 l16 -2 M12 11.4 l16 2" stroke="${C.mereLight}" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>` +
    `<path d="M-4 8 C-8 4 -6 -1 0 -1 C6 -1 12 -2 18 -5 C20 1 18 9 8 10 C4 10.6 -1 10.4 -4 8 Z" fill="#8A6A44"/><path d="M2 2 C7 1.6 12 0.4 15 -1.6 C14 3 10 5.6 4 5.4 Z" fill="#6E5233"/><path d="M8 2.2 l5 -0.8 l-0.6 2 l-4.6 0.4 Z" fill="#3A63B8"/>` +
    `<path d="M1 8 C6 9.4 12 9.2 16 7" stroke="#A88A62" stroke-width="0.8" fill="none"/><path d="M-1 0 C-3 -3 -3 -7 0 -9 C3 -10.6 6 -8.4 5 -5 C4.4 -3 2 -1 -1 0 Z" fill="#8A6A44"/>` +
    `<path d="M-1.6 -6.4 h5" stroke="#5A4128" stroke-width="0.8"/><path d="M-1.4 -8 L-7.6 -6.6 L-6.8 -5.2 L-1 -5.6 Z" fill="#E08A2E"/><circle cx="1.2" cy="-6.8" r="0.9" fill="${C.ink}"/></g>`;

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
  // Below the Field the bank sinks into a little beach on the bay (fieldBeach(), its own seed).
  o += ownSeed(FIELD_SEED + 1, fieldBeach);
  // Below the Orchard it sinks into a second (orchardBeach(), its own seed).
  o += ownSeed(ORCHARD_SEED + 2, orchardBeach);
  return g('id="km-bank"', o);
}

/*
 * The ground people walk on between the places: dirt worn into the meadow, drawn the way the Hill's trail is
 * (stepsTrail): a shaded edge, the earth, a lighter worn middle, a few pebbles at its edges and grass growing up to it.
 * Owner, 2026-10-09: "the paths with the dots should be replaced by natural dirt paths like on the hill", "that trail
 * from the dock is not the right size" (a footpath about as wide as a keeper's body, narrower going up and away) and
 * "the wayfinding circle dirt doesnt match with the paths". So the paths and the landing under the signpost come from
 * one dirt style (DIRT) and are laid down together, every edge, then every earth, then every worn middle, so a path
 * runs into its landing as one piece of ground. Each shape has a seed of its own, so nothing else in the park moves.
 */
const DIRT = { edge: '#A8865A', earth: '#C9A77A', worn: '#D6BC90', pebbles: ['#B8A27C', '#9C8A68', '#D8CCAA'] };
const PATH_SEED = 20261009;
const smoothShape = (pts) => {
  const n = pts.length;
  let d = `M${f((pts[n - 1][0] + pts[0][0]) / 2)} ${f((pts[n - 1][1] + pts[0][1]) / 2)}`;
  pts.forEach((p, i) => { const q = pts[(i + 1) % n]; d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`; });
  return `${d}Z`;
};
// Pebbles at a dirt edge and grass beyond it, never on it: a tuft below the edge stands far enough off that its blades,
// growing up, stop short of it. Each edge point is [x, y, nx, ny]: where it is and the way out of the dirt.
function dirtEdge(edge, shape) {
  edge.forEach(([x, y, sx, sy], i) => {
    if (i % 2 === 0 && rnd() < 0.3) shape.peb.push([x + r(-0.8, 0.8), y + r(-0.5, 0.5), r(0.5, 1.1)]);
    if (i % 2 === 1 && rnd() < 0.45) {
      const d = (sy > 0.15 ? Math.min(14, 5 / sy) : 2.6) + r(0, 1.4);
      shape.tufts.push([x + sx * d, y + sy * d, pick(['a', 'b', 'c', 'd', 'e'])]);
    }
  });
}
/** A path along a cubic (c: its control points, start to end), its half width a function of t along it. A path that
 * starts out in the meadow (open) rounds off there; every worn middle fades out at its ends, so no end shows a cut. */
function dirtPath(c, width, n, open) {
  return ownSeed(PATH_SEED + n, () => {
    const pts = [];
    for (let i = 0; i <= 48; i += 1) { const t = i / 48; pts.push([bez(c[0], c[2], c[4], c[6], t), bez(c[1], c[3], c[5], c[7], t), width(t)]); }
    const round = pts.map(([x, y, w], i) => [x, y, open && i < 6 ? w * Math.max(0.12, Math.sqrt(1 - ((6 - i) / 6) ** 2)) : w]);
    const shape = {
      edge: strip(round.map(([x, y, w]) => [x + 0.8, y + 1.2, w + 0.6]), -1, 1, 1.1),
      earth: strip(round, -1, 1, 1.2),
      worn: strip(pts.map(([x, y, w], i) => [x, y, w * Math.min(1, i / 8, (pts.length - 1 - i) / 8)]), -0.55, 0.4, 0.9),
      peb: [], tufts: [], on: (x, y, m) => near(pts, x, y, m),
    };
    const edge = [];
    [-1, 1].forEach((k) => {
      pts.forEach(([x, y, w], i) => {
        const q = pts[Math.max(0, i - 1)]; const s = pts[Math.min(pts.length - 1, i + 1)];
        const dx = s[0] - q[0]; const dy = s[1] - q[1]; const len = Math.hypot(dx, dy) || 1;
        const sx = (-dy / len) * k; const sy = (dx / len) * k;
        edge.push([x + sx * w * 1.02, y + sy * w * 1.02, sx, sy]);
      });
    });
    dirtEdge(edge, shape);
    return shape;
  });
}
/** A worn round of dirt where paths meet (the landing under the signpost). */
function dirtPatch(cx, cy, rx, ry, n) {
  return ownSeed(PATH_SEED + n, () => {
    const ring = [];
    for (let i = 0; i < 28; i += 1) { const a = (i / 28) * Math.PI * 2; ring.push([a, r(0.93, 1.05)]); }
    const at = (k, dx, dy, grow) => ring.map(([a, w]) => [cx + dx + Math.cos(a) * (rx + grow) * w * k, cy + dy + Math.sin(a) * (ry + grow * 0.3) * w * k]);
    const shape = { edge: smoothShape(at(1, 0.8, 1.2, 0.6)), earth: smoothShape(at(1, 0, 0, 0)), worn: smoothShape(at(0.62, -2, -1, 0)), peb: [], tufts: [],
      on: (x, y, m) => ((x - cx) / (rx * 1.05 + m)) ** 2 + ((y - cy) / (ry * 1.05 + m)) ** 2 < 1 };
    const edge = ring.map(([a, w]) => {
      const x = cx + Math.cos(a) * rx * w; const y = cy + Math.sin(a) * ry * w;
      const nx = Math.cos(a) / rx; const ny = Math.sin(a) / ry; const len = Math.hypot(nx, ny) || 1;
      return [x, y, nx / len, ny / len];
    });
    dirtEdge(edge, shape);
    return shape;
  });
}
/** Dirt shapes laid down as one ground: every edge, then every earth, then every worn middle, pebbles, grass. */
function dirtGround(shapes) {
  const all = (k) => shapes.map((s) => s[k] || '').join('');
  // Nothing of one path's edge lands on another's dirt where they meet: no pebble on it, no tuft on it or just below it.
  const onDirt = (x, y, m, own) => shapes.some((s) => s !== own && s.on(x, y, m));
  const peb = shapes.flatMap((s) => s.peb.filter(([x, y]) => !onDirt(x, y, 0.5, s)));
  const tufts = shapes.flatMap((s) => s.tufts.filter(([x, y]) => !shapes.some((o) => o.on(x, y, 2.4) || o.on(x, y - 4.6, 1.2))))
    .map(([x, y, id]) => `<use href="#kmt-${id}" x="${f(x)}" y="${f(y)}"/>`).join('');
  return `<path d="${all('edge')}" fill="${DIRT.edge}"/><path d="${all('earth')}" fill="${DIRT.earth}"/><path d="${all('worn')}" fill="${DIRT.worn}"/>${all('extra')}` +
    DIRT.pebbles.map((col, j) => blobs(col, peb.filter((_, i) => i % 3 === j))).join('') + tufts;
}
// A little wider where a path meets the landing or the boardwalk.
const flare = (t, end) => 3 * Math.exp(-(end ? 1 - t : t) / 0.07);

function paths() {
  // From each place to the landing under the signpost, and from the landing down to the boardwalk on the shore.
  let o = '';
  o += dirtGround([
    stepsFootShape(),
    dirtPath([500, 582, 600, 590, 700, 602, 798, 613], (t) => 10.5 + 1.5 * t + flare(t, true), 1, true),
    dirtPath([684, 567, 716, 586, 760, 602, 796, 611], (t) => 8.5 + 1.5 * t + flare(t, true), 2),
    dirtPath([1180, 590, 1060, 598, 920, 606, 804, 613], (t) => 11 + t + flare(t, true), 3, true),
    // down to the boardwalk: about as wide as a keeper there, narrower going up and away, a gentle bend; both ends tuck in
    dirtPath([800, 618, 814, 642, 786, 668, 800, 700], (t) => 15 + 6 * t + 4 * Math.exp(-t / 0.07) + flare(t, true), 4),
    dirtPatch(800, 614, 54, 20, 5),
  ]);
  // The stream from the hill's pool runs down to the lake, under a little bridge on the Field path.
  o += streamLand();
  return g('id="km-paths"', o);
}

function signpost() {
  // The signpost at the crossroads: an arrow to each place, and one across the water to Louise.
  const arm = (y, dir, w, fill, text, tcol) => {
    const tip = dir > 0 ? `M0 ${y} h${w} l10 9 l-10 9 h-${w} Z` : `M0 ${y} h-${w} l-10 9 l10 9 h${w} Z`;
    const tx = dir > 0 ? w / 2 + 2 : -w / 2 - 2;
    return `<path d="${tip}" fill="${fill}"/><text x="${tx}" y="${y + 12.5}" text-anchor="middle" font-family="Candara, 'Gill Sans', 'Trebuchet MS', sans-serif" font-size="11" font-weight="700" fill="${tcol}">${text}</text>`;
  };
  // its landing is dirt, laid with the paths (dirtPatch in paths())
  let o = `<g transform="translate(800 540) scale(0.7)" filter="url(#layer-sm)">${shadow(0, 108, 18, 4)}`;
  o += `<rect x="-4" y="0" width="8" height="108" rx="4" fill="${C.clay3}"/><rect x="-6" y="-6" width="12" height="8" rx="4" fill="${C.clay4}"/>`;
  // Each arm is a way to its place: the live script makes it a link (owner, 2026-10-08: "navigate between the 3 scenes").
  const way = (rot, key, body) => `<g transform="rotate(${rot})" data-km-part="sign-${key}" pointer-events="visiblePainted">${body}</g>`;
  o += way(-3, 'nutrition', arm(6, -1, 62, C.nLand, 'Orchard', C.paper));
  o += way(-8, 'fitness', arm(26, -1, 52, C.fLand, 'Hill', C.paper));
  o += way(-2, 'dog-training', arm(46, 1, 60, C.dLand, 'Field', C.paper));
  o += way(3, 'louise', arm(66, 1, 58, C.mere, 'Louise', C.paper));
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
  o += `<g transform="translate(1046 870) scale(0.55)" class="km-day-only"><ellipse cx="0.6" cy="4.6" rx="11" ry="2.2" fill="#3E6A2A" opacity="0.5"/>` +
    `<path d="M-11 3 C-13 -1 -10 -3 -7 -1.6 C-9 1 -8 3 -5 3.6 Z M11 3 C13 -1 10 -3 7 -1.6 C9 1 8 3 5 3.6 Z" fill="#4E7A30"/>` +
    `<path d="M-8 2.6 C-9 -4 -5 -8 0 -8 C5 -8 9 -4 8 2.6 C5 4.4 -5 4.4 -8 2.6 Z" fill="#6A9A3E"/><path d="M-5 1.8 C-4 -1 4 -1 5 1.8 C3 3.2 -3 3.2 -5 1.8 Z" fill="#D6E3A0"/>` +
    `<path d="M-4.6 3.4 l-1.6 1.6 h2.6 M4.6 3.4 l1.6 1.6 h-2.6" stroke="#4E7A30" stroke-width="1.2" stroke-linecap="round" fill="none"/>` +
    `<circle cx="-4.4" cy="-7.6" r="2.8" fill="#6A9A3E"/><circle cx="4.4" cy="-7.6" r="2.8" fill="#6A9A3E"/><circle cx="-4.4" cy="-8" r="1.7" fill="#E9C24A"/><circle cx="4.4" cy="-8" r="1.7" fill="#E9C24A"/>` +
    `<rect x="-5.4" y="-8.5" width="2" height="1" rx="0.5" fill="${C.ink}"/><rect x="3.4" y="-8.5" width="2" height="1" rx="0.5" fill="${C.ink}"/><path d="M-3.4 -3.4 q3.4 1.6 6.8 0" stroke="#2E4A1A" stroke-width="0.7" fill="none"/>` +
    `<circle cx="-2" cy="-5" r="0.6" fill="#8DBA5A"/><circle cx="2.6" cy="-4.6" r="0.5" fill="#8DBA5A"/></g>`;
  for (let i = 0; i < 12; i += 1) { const x = 1556 + i * 3.6; const y = shoreY(x) + 44; const h = r(18, 32); o += `<path d="M${f(x)} ${f(y)} q${f(r(-2, 2))} ${f(-h / 2)} ${f(r(-3, 3))} ${f(-h)}" stroke="${C.dGrassDark}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`; if (i % 2) o += `<rect x="${f(x - 1.6)}" y="${f(y - h - 1)}" width="3.2" height="8" rx="1.6" fill="${C.dLand}"/>`; }
  // a koi rising out of the lake and dropping back (reduced motion: it stays under, and only its rings show)
  LIFE += `<g class="km-fish"><g transform="translate(1190 836) rotate(-12)"><path d="M-12 0 C-8 -5.4 4 -6 10 -1.4 C4 4.4 -8 4.6 -12 0 Z" fill="#F07A2E"/>` +
    `<path d="M-4 -4.4 C-1 -2 3 -2 6 -3.6 C5 -1 0 0.4 -4 -1 Z M-9 1.4 C-6 0.4 -3 1.6 -2 3.4 C-5 3.6 -8 3 -9 1.4 Z" fill="#FFF4E6"/><path d="M-1 -5 C1 -8.4 5 -8 7 -4.6 Z" fill="#E0662A"/>` +
    `<path d="M10 -1.4 C13 -5 16 -6 17 -4.4 C15.6 -2 15.6 0 17 2.4 C16 4 13 3 10 -1.4 Z" fill="#E0662A"/><path d="M-2 2.6 l-2.6 3.4 l3.6 -1.6 Z" fill="#E0662A"/>` +
    `<circle cx="-8.4" cy="-1.4" r="1" fill="${C.ink}"/><path d="M-12 0.6 q-1.6 0.8 -2.4 2" stroke="#C9541E" stroke-width="0.5" fill="none"/><path d="M-6 -3.6 C-2 -4.8 3 -4.6 6 -3" stroke="#FFFFFF" stroke-width="0.6" fill="none" opacity="0.6"/></g></g>`;
  o += `<path d="M1176 854 a14 3.5 0 0 0 28 0" stroke="${C.mereLight}" stroke-width="1.5" fill="none" opacity="0.6"/><path d="M1170 853 a20 5 0 0 0 40 0" stroke="${C.mereLight}" stroke-width="0.9" fill="none" opacity="0.35"/>`;
  o += streamMouth();
  o += ownSeed(FIELD_SEED + 2, bay); // the bay below the Field
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
  o += '</g>';
  // The lantern ready to go at the dock is the way to send one (/kit/kindlemere-lanterns.js).
  LIFE += `<g transform="translate(0 ${DOCK_DY})" data-km-part="lantern-send" pointer-events="visiblePainted"><g transform="translate(800 760) scale(0.6)"><g class="km-bob">${lanternBody()}<circle cx="0" cy="-4" r="30" fill="${C.kindle}" opacity="0.15"/></g></g></g>`;
  const reeds = (x0, n, h0) => { let s = ''; for (let i = 0; i < n; i += 1) { const x = x0 + i * r(4, 7); const h = h0 + r(-16, 20); s += `<path d="M${f(x)} 900 q${f(r(-4, 4))} ${f(-h / 2)} ${f(r(-7, 7))} ${f(-h)}" stroke="${pick([C.mereDeep, '#12333E', '#245868'])}" stroke-width="${f(r(2, 3.2))}" stroke-linecap="round" fill="none"/>`; if (rnd() > 0.55) s += `<rect x="${f(x - 2)}" y="${f(900 - h * 0.92)}" width="4.4" height="14" rx="2.2" fill="${C.clay4}"/>`; } return s; };
  LIFE += `<g class="km-sway">${reeds(0, 16, 90)}</g><g class="km-sway" style="animation-delay:-2s">${reeds(1500, 14, 80)}</g>`;
  return g('id="km-shore"', o);
}

function lanterns() {
  let o = `<g transform="translate(0 ${WATER_DY})">`;
  LANTERNS.forEach(([x, y, s], i) => { o += lantern(x, y, f(s * 0.6), f(i * 0.9), i); });
  // the lanterns are strung on a rope from the dock's post out across the water, sagging between them
  const knots = [[856, 798]].concat(LANTERNS.map(([x, y, s]) => [x, y + 34 * s * 0.6 - 2]));
  let rope = '';
  for (let i = 1; i < knots.length; i += 1) { const [x0, y0] = knots[i - 1]; const [x1, y1] = knots[i]; rope += `M${x0} ${f(y0)} Q${f((x0 + x1) / 2)} ${f((y0 + y1) / 2 + 7)} ${x1} ${f(y1)}`; }
  o += `<path d="${rope}" stroke="#6B4E30" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="${rope}" stroke="#A8865A" stroke-width="0.5" stroke-linecap="round" fill="none" transform="translate(0 -0.4)"/>`;
  // The paper boat bringing a book back from Louise, with its wake.
  o += `<g transform="translate(580 800) scale(0.6)"><g class="km-bob" style="animation-delay:-1.5s"><path d="M70 30 h30 M76 36 h22" stroke="${C.mereLight}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`;
  o += `<path d="M0 18 H64 C58 30 48 34 32 34 C16 34 6 30 0 18 Z" fill="${C.paper}"/><path d="M0 18 H64 L60 24 H4 Z" fill="${C.creamDeep}"/><path d="M30 -14 V18 H8 Z" fill="${C.creamDeep}"/><path d="M30 -14 V18 H44 Z" fill="${C.paper}"/>`;
  o += `<rect x="34" y="6" width="22" height="12" rx="2" fill="${C.nLand}"/><rect x="34" y="6" width="22" height="3" fill="${C.cream}"/><rect x="38" y="11" width="14" height="2" rx="1" fill="${C.nGlow}"/></g></g></g>`;
  LIFE += g('id="km-lanterns"', o);
  return '';
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
  return `<g class="km-day-only"><g class="km-face-happy">${face(p, 'happy')}</g><g class="km-face-thinking">${face(p, 'thinking')}</g><g class="km-face-oh">${face(p, 'oh')}</g></g><g class="km-night-only">${face(p, night.mood, night.lookUp)}</g>`;
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
  // At night she sleeps in a wooden bowl.
  if (mood === 'scene') o += `<g class="km-night-only"><path d="M-8 88 C-4 132 124 132 128 88 C112 99 8 99 -8 88 Z" fill="${C.clay2}"/><path d="M-8 88 C8 99 112 99 128 88" stroke="${C.clay1}" stroke-width="3" fill="none"/><path d="M6 100 C30 116 90 116 114 100 M14 112 C40 124 80 124 106 112" stroke="${C.clay3}" stroke-width="1.6" fill="none" opacity="0.7"/><ellipse cx="60" cy="124" rx="26" ry="5" fill="${C.clay3}"/><path d="M30 96 C40 86 54 86 60 94 C66 86 82 86 92 96" fill="${C.nLeaf}" opacity="0.9"/></g>`;
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

/* ------------------------------------------------------------------ the sidekicks (owner, 2026-10-08) */
function summerSidekick(mood) {
  // Summer, Avo's sidekick for healthy treats and sweets: a peach about half Avo's size, with a stem, one leaf, the
  // peach's crease, and a little berry tart in her hand.
  let o = `<path d="M32 7 C32 2 33 -2 35 -5" stroke="${C.bark}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M34 -3 C40 -10 50 -10 54 -6 C48 0 40 1 34 -3 Z" fill="${C.nLeafLight}"/><path d="M36 -3.4 C42 -5.6 48 -6.4 52 -6" stroke="${C.nLand}" stroke-width="1" fill="none"/>`;
  o += `<path d="M32 6 C50 4 62 18 62 34 C62 50 48 60 32 60 C16 60 2 50 2 34 C2 18 14 4 32 6 Z" fill="#FFB06A"/>`;
  o += `<path d="M48 12 C60 22 62 42 50 54 C42 60 30 61 22 58 C40 56 52 44 52 30 C52 22 50 16 48 12 Z" fill="#F2954E"/>`;
  o += `<path d="M31 8 C25 20 25 36 29 50" stroke="#E5844A" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  o += `<ellipse cx="15" cy="22" rx="5" ry="3.2" fill="#FFD8A8" transform="rotate(-30 15 22)"/>`;
  o += faces({ x1: 22, x2: 40, y: 30, rx: 4.4, ry: 5, dx: 1, dy: -1, mx: 31, my: 40, k: 0.7, mouth: '#7A3A1A', tongue: '#D96A4A', cheek: '#E8704A', cheekY: 39, cheekDx: 7, brow: '#C9662E' }, mood, { mood: 'sleepy' });
  o += `<ellipse cx="4" cy="44" rx="5" ry="4.4" fill="#F2954E"/>`;
  const tart = `<ellipse cx="66" cy="38" rx="5" ry="4.4" fill="#F2954E"/><g transform="translate(68 30)"><path d="M-9 0 h18 l-2 6 h-14 Z" fill="${C.clay1}"/><ellipse cx="0" cy="0" rx="9" ry="2.6" fill="${C.cream}"/><circle cx="-4" cy="-1" r="2" fill="#C8433A"/><circle cx="1" cy="-1.6" r="2" fill="#4A5FA0"/><circle cx="5" cy="-0.6" r="1.8" fill="#C8433A"/></g>`;
  const rest = `<ellipse cx="60" cy="46" rx="5" ry="4.4" fill="#F2954E"/>`;
  if (mood === 'scene') o += `<g class="km-day-only">${tart}</g><g class="km-night-only">${rest}</g>`;
  else o += (mood === 'worried' || mood === 'sleepy') ? rest : tart;
  o += `<ellipse cx="24" cy="61" rx="6" ry="3.4" fill="#C9662E"/><ellipse cx="40" cy="61" rx="6" ry="3.4" fill="#C9662E"/>`;
  // At night she sleeps in a little woven basket under a checked napkin.
  if (mood === 'scene') {
    let weave = '';
    for (let i = 0; i < 9; i += 1) weave += `<path d="M${-2 + i * 8} 48 l4 20" stroke="#A8824C" stroke-width="1.4"/>`;
    o += `<g class="km-night-only"><path d="M-6 46 C-4 74 68 74 70 46 Z" fill="#C9A066"/>${weave}<path d="M-4 54 C20 62 44 62 68 54 M-2 62 C20 69 44 69 66 62" stroke="#A8824C" stroke-width="1.6" fill="none"/><ellipse cx="32" cy="46" rx="38" ry="6" fill="#B38A52"/>` +
      `<path d="M-2 46 C12 40 52 40 66 46 L70 56 C48 62 16 62 -6 56 Z" fill="url(#km-gingham)"/><path d="M-6 56 l-3 6 l6 -2 Z M70 56 l3 6 l-6 -2 Z" fill="${C.nGlow}"/></g>`;
  }
  return { body: o, cx: 32, feet: 63, head: [56, 0], w: 70, top: -12 };
}

function spudSidekick(mood) {
  // Spud, who comes round in the evenings for dinner: a potato with its eyes and a sprout, a cook's apron, and a pot of
  // something hot.
  let o = `<path d="M46 9 C44 0 48 -6 52 -10" stroke="#7D9A3A" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M50 -6 c4 -4 9 -4 11 -2 c-3 3 -7 4 -11 2 Z M48 -2 c-4 -3 -8 -2 -10 0 c3 2 7 2 10 0 Z" fill="#8FAE3A"/>`;
  o += `<path d="M46 8 C70 6 86 22 86 46 C88 70 74 92 48 92 C22 92 6 76 6 52 C4 28 22 10 46 8 Z" fill="#C49A64"/>`;
  o += `<path d="M72 16 C86 30 90 58 78 78 C70 90 56 94 42 92 C64 88 78 72 80 52 C82 38 78 26 72 16 Z" fill="#A9804E"/>`;
  o += `<path d="M20 30 C24 20 34 14 44 13" stroke="#D9B680" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  [[18, 58], [74, 38], [62, 84], [26, 80], [54, 20], [14, 42]].forEach(([x, y]) => { o += `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.4" fill="#8A6438"/><path d="M${x - 2} ${y - 1.6} q2 -1.2 4 0" stroke="#D9B680" stroke-width="0.9" fill="none"/>`; });
  o += `<path d="M28 66 h38 l-3 22 c-10 4 -22 4 -32 0 Z" fill="${C.cream}"/><path d="M28 66 C30 60 36 58 40 60 M66 66 C64 60 58 58 54 60" stroke="${C.cream}" stroke-width="2" fill="none"/><rect x="40" y="74" width="14" height="8" rx="2" fill="none" stroke="${C.stitch}" stroke-width="1.2"/>`;
  o += faces({ x1: 36, x2: 58, y: 42, rx: 5.4, ry: 6.2, dx: 1.4, dy: -1.2, mx: 47, my: 54, k: 0.95, mouth: '#4A2A12', tongue: '#D96A4A', cheek: C.nGlowDeep, cheekY: 54, cheekDx: 9, brow: '#7A5530' }, mood, { mood: 'sleepy' });
  o += `<ellipse cx="88" cy="62" rx="7" ry="6" fill="#C49A64"/>`;
  // The pot of dinner held out in front, lid on, steam rising (resting on the ground when he is worried or asleep).
  const pot = (dx, dy) => `<g transform="translate(${dx} ${dy})"><rect x="-18" y="0" width="36" height="22" rx="7" fill="${C.fLand}"/><rect x="-21" y="2" width="6" height="4" rx="2" fill="${C.fDeep}"/><rect x="15" y="2" width="6" height="4" rx="2" fill="${C.fDeep}"/><path d="M-19 0 a19 6 0 0 1 38 0 Z" fill="${C.fLight}"/><circle cx="0" cy="-6" r="2.6" fill="${C.fDeep}"/><path d="M-12 8 h24" stroke="${C.fLight}" stroke-width="1.6" opacity="0.7"/></g>`;
  const steam = `<g class="km-steam"><path d="M-2 52 c-4 -5 4 -8 0 -13 c-4 -5 4 -8 0 -13" stroke="${C.paper}" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M6 50 c-3 -4 3 -6 0 -10" stroke="${C.paper}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8"/></g>`;
  const held = `<ellipse cx="6" cy="66" rx="7" ry="6" fill="#C49A64"/>${pot(-4, 58)}${steam}`;
  const down = `<ellipse cx="10" cy="72" rx="7" ry="6" fill="#C49A64"/>${pot(-22, 74)}`;
  if (mood === 'scene') o += `<g class="km-day-only">${held}</g><g class="km-night-only">${down}</g>`;
  else o += (mood === 'worried' || mood === 'sleepy') ? down : held;
  o += `<ellipse cx="34" cy="93" rx="9" ry="5" fill="#7A5530"/><ellipse cx="60" cy="93" rx="9" ry="5" fill="#7A5530"/>`;
  if (mood === 'scene') {
    const mound = `<path d="M46 64 C44 56 48 50 52 46" stroke="#7D9A3A" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M50 50 c4 -4 9 -4 11 -2 c-3 3 -7 4 -11 2 Z M48 54 c-4 -3 -8 -2 -10 0 c3 2 7 2 10 0 Z" fill="#8FAE3A"/>` +
      `<path d="M24 84 C26 66 68 66 70 84 Z" fill="#C49A64"/><path d="M36 76 q4 2.4 8 0 M50 76 q4 2.4 8 0" stroke="#4A2A12" stroke-width="2" stroke-linecap="round" fill="none"/>` +
      `<path d="M-4 96 C8 78 86 76 98 96 Z" fill="#7A5530"/><path d="M4 92 C20 84 74 84 90 92" stroke="#8A6438" stroke-width="3" fill="none"/><circle cx="18" cy="90" r="2.4" fill="#A9804E"/><circle cx="74" cy="88" r="2" fill="#A9804E"/><path d="M6 94 l-2 -6 M12 93 l0 -7 M84 93 l2 -6 M90 94 l3 -5" stroke="#7D9A3A" stroke-width="1.8" stroke-linecap="round"/>`;
    o = `<g class="km-dinner-only">${o}</g><g class="km-mound">${mound}</g>`;
  }
  return { body: o, cx: 47, feet: 96, head: [80, 6], w: 110, top: -14 };
}

const CLOUDS = {
  puff: { base: C.paper, shade: '#DCE5EC', deep: '#C3D0DA', mouth: C.fDeeper, brow: C.fLight },
  huff: { base: '#D9C9A8', shade: '#C2AF8A', deep: '#A8946E', mouth: '#5A4A30', brow: '#8A7550' },
};

function cloudSidekick(kind) {
  // Puff and Huff, Steady's sidekicks: the same little cloud, Puff white and Huff a cloud of sandy dust (owner,
  // 2026-10-08: "Both clouds will look exactly the same execpt for the color and the name"). They hover low.
  const c = CLOUDS[kind];
  return (mood) => {
    const shape = 'M14 50 C2 50 -2 34 10 28 C6 14 22 4 34 12 C40 0 62 -2 68 12 C82 8 92 22 84 32 C94 38 90 54 76 52 Z';
    let o = `<path d="${shape}" fill="${c.deep}" transform="translate(0 4)"/><path d="${shape}" fill="${c.base}"/>`;
    o += `<path d="M14 50 C4 48 2 38 10 32 C14 44 40 48 76 48 C82 46 86 42 88 38 C90 50 84 54 76 52 Z" fill="${c.shade}"/>`;
    o += `<path d="M18 26 C20 18 28 14 34 16 M44 10 C50 6 60 6 64 12" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.8"/>`;
    o += faces({ x1: 36, x2: 54, y: 30, rx: 4.6, ry: 5.4, dx: 1, dy: -1, mx: 45, my: 40, k: 0.7, mouth: c.mouth, tongue: '#D96A4A', cheek: C.nGlow, cheekY: 39, cheekDx: 7, brow: c.brow }, mood, { mood: 'sleepy' });
    o += `<ellipse cx="2" cy="40" rx="6" ry="5" fill="${c.base}"/><ellipse cx="90" cy="40" rx="6" ry="5" fill="${c.base}"/>`;
    return { body: o, cx: 45, feet: 56, head: [84, 6], w: 96, top: -4, hovers: true };
  };
}

/** Barkley and Sizzle, drawn by lane D (agents/dog-training/art/sidekicks.js @ 9c4bda3) on the owner's word: "Both Stick
 * and Bacon need to be taller than tumble, matching scale with Avo and Steady. And both need enhancements to match the
 * same standard being set by Avos team". Kept in the kit like the dog. */
const DOG_SIDEKICKS = require('./parts/dog-sidekicks.js')({ C, f, faces });

function placeSidekick(id, k, x, groundY, lift, cls, sc) {
  // A sidekick on the ground beside its keeper, or (a cloud) hovering `lift` above it with its shadow on the grass.
  const s = KS * (sc || 1);
  const y = groundY - lift;
  return `<g class="${cls || ''}"><ellipse cx="${x}" cy="${groundY}" rx="${f(k.w * 0.3 * s)}" ry="${f(5 * s)}" fill="${C.ink}" opacity="${lift ? 0.08 : 0.16}"/>` +
    `<g id="${id}" transform="translate(${f(x - k.cx * s)} ${f(y - k.feet * s)}) scale(${s})" filter="url(#layer-sm)"><g${lift ? ' class="km-bob"' : ''}><g class="km-pose">${k.body}</g>${talkBubble(k)}</g></g></g>`;
}

/** The Field's dog, drawn by lane D (agents/dog-training/art/field-dog.svg @ faae296), kept in the kit as the one dog. */
const FIELD_DOG = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'parts', 'field-dog.svg'), 'utf8');
  const defsBody = /<defs>([\s\S]*?)<\/defs>/.exec(src)[1];
  const style = /<style>([\s\S]*?)<\/style>/.exec(defsBody)[1].split('#dt-dog').join('.dt-dog');
  const defs = defsBody.replace(/<style>[\s\S]*?<\/style>/, '');
  const start = src.indexOf('<g id="dt-dog"');
  const group = src.slice(start, src.lastIndexOf('</svg>')).trim()
    .replace('<g class="dt-look"', '<g class="dt-look" data-km-part="dog-head"')
    .replace('<g class="dt-pupil">', '<g class="dt-pupil" data-km-part="dog-pupils">')
    .replace('<g class="dt-held dt-if-held">', '<g class="dt-held dt-if-held" data-km-part="dog-ball">');
  return { defs, style, group };
})();

function fieldDog(x, y) {
  return FIELD_DOG.group.replace(/<g id="dt-dog"[^>]*>/, `<g id="km-dog" class="dt-dog" data-km-part="dog" transform="translate(${x} ${y})">`);
}

/** The paper speech bubble over a head while the keepers talk (shown by data-km-talk="1" on the actor). */
function talkBubble(k) {
  return `<g class="km-talk" transform="translate(${k.head[0]} ${k.head[1]})"><path d="M-12 -30 h24 a8 8 0 0 1 8 8 v6 a8 8 0 0 1 -8 8 h-14 l-9 7 l2 -7 h-3 a8 8 0 0 1 -8 -8 v-6 a8 8 0 0 1 8 -8 Z" fill="${C.paper}"/><g class="km-dots" fill="${C.inkSoft}"><circle cx="-8" cy="-19" r="2.6"/><circle cx="0" cy="-19" r="2.6"/><circle cx="8" cy="-19" r="2.6"/></g></g>`;
}

function placeKeeper(id, k, x, feetY, sc) {
  // In the world: feet on the ground at (x, feetY), at the keepers' size (smaller further off).
  const s = KS * (sc || 1);
  return `<g id="${id}" transform="translate(${f(x - k.cx * s)} ${f(feetY - k.feet * s)}) scale(${s})" filter="url(#layer-sm)">${shadow(k.cx, k.feet, f(k.w * 0.36), 6)}<g class="km-pose">${k.body}</g>${talkBubble(k)}</g>`;
}

/* ------------------------------------------------------------------ the dog */
const DOG = { ginger: '#C97C3D', gingerLight: '#E3A86A', earDark: '#8A5A3A', white: '#FFFFFF', shade: '#E9E4D4' };

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

const DOG_AT = [2648, 1334]; // where lane D's dog gallops through the shallows by day (its frame: paws at y 64)

function sleepingDogAtHome() {
  // By night Asher sleeps curled in the door of his house.
  const [kx, ky] = KENNEL;
  const door = [(kx + 30) * 2, (ky + 60) * 2]; // the middle of the door's sill, in the world
  return `<g class="km-night-only" transform="translate(${door[0] - 4} ${door[1] - 14})" filter="url(#layer-sm)">${sleepingDog()}</g>`;
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
    // each bulb glows softly out into the dusk, then brighter at its heart
    land += `<circle cx="${f(bx)}" cy="${f(by + 4.6)}" r="12" fill="${C.bulbGlow}" opacity="0.14"/><circle cx="${f(bx)}" cy="${f(by + 4.6)}" r="6" fill="${C.bulbGlow}" opacity="0.4"/><circle cx="${f(bx)}" cy="${f(by + 4.4)}" r="2.2" fill="${C.bulb}"/>`;
  }
  land += `<circle cx="282" cy="452" r="12" fill="${C.bulbGlow}" opacity="0.35"/><circle cx="282" cy="452" r="3.6" fill="${C.bulb}"/>`;
  LANTERNS.forEach(([x, y, s], i) => { land += `<g data-km-glow="lantern-${i}" transform="translate(${x} ${y + WATER_DY}) scale(${f(s * 0.6)})"><g class="km-bob" style="animation-delay:-${f(i * 0.9)}s"><circle cx="0" cy="-8" r="46" fill="${C.kindle}" opacity="0.28"/><circle cx="0" cy="-8" r="22" fill="#FFC08A" opacity="0.6"/></g></g>`; });
  land += `<g transform="translate(866 ${736 + DOCK_DY}) scale(0.38)"><circle cx="0" cy="-8" r="50" fill="${C.kindle}" opacity="0.3"/><circle cx="0" cy="-8" r="22" fill="#FFC08A" opacity="0.7"/></g>`;
  land += `<g transform="translate(800 ${760 + DOCK_DY}) scale(0.6)"><g class="km-bob"><circle cx="0" cy="-8" r="44" fill="${C.kindle}" opacity="0.3"/><circle cx="0" cy="-8" r="20" fill="#FFC08A" opacity="0.6"/></g></g>`;
  o += `<g transform="scale(2)">${land}</g>`;
  // The sleepers' z's: the avocado at the table, the ball and the dog by the house.
  const sk = SIDEKICKS;
  o += `<g class="km-night-only">${zees(sk['nutrition-summer'].x + 22, sk['nutrition-summer'].y - 86, C.cream)}${zees(sk['nutrition-spud'].x + 24, sk['nutrition-spud'].y - 46, C.cream)}${zees(sk['fitness-puff'].x + 44, sk['fitness-puff'].y - 136, C.cream)}${zees(sk['fitness-huff'].x + 44, sk['fitness-huff'].y - 158, C.cream)}${zees(sk['dog-training-barkley'].x + 34, sk['dog-training-barkley'].y - 196, C.cream)}${zees(sk['dog-training-sizzle'].x + 30, sk['dog-training-sizzle'].y - 200, C.cream)}</g>`;
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

/* ------------------------------------------------------------------ the ground the live scene walks on (world units) */
/*
 * For the live script (kit/dashboard/public/kindlemere-dog.js and the cast in kindlemere.js): where a character or the
 * dog may stand, as one outline, and the water's edge. The top edge is the back of the walkable land: the Orchard's
 * lower terrace, in front of the long table and the basket under the second tree, Stepping Hill's face up to its
 * skyline (from clear of that tree's canopy), in front of the dog house, and the Field in front of its fence, weave
 * poles and hoop. The bottom edge runs 40 units into the water, the shallows the dog splashes through. Owner,
 * 2026-10-08: "I could throw it up the hill or to the orchard and the dog would go fetch it".
 */
function ground() {
  const hill = (hx, hy) => [1630 + 2.6 * (hx - 815), 1112 + 2.6 * (hy - 556)];
  const bez = (p, t) => {
    const u = 1 - t;
    return [0, 1].map((i) => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]);
  };
  // The hill's skyline, the same two curves hillBody() draws, sampled and taken into the world.
  const sky = [];
  for (const curve of [[[520, 556], [590, 470], [690, 300], [820, 278]], [[820, 278], [950, 300], [1050, 470], [1110, 556]]]) {
    for (let i = 0; i <= 24; i += 1) sky.push(hill(...bez(curve, i / 24)));
  }
  const skyY = (x) => {
    for (let i = 1; i < sky.length; i += 1) {
      const [x0, y0] = sky[i - 1];
      const [x1, y1] = sky[i];
      if (x >= x0 && x <= x1) return y0 + (y1 - y0) * ((x - x0) / Math.max(1e-6, x1 - x0));
    }
    return 1112;
  };
  const top = [[0, 1064], [690, 1076], [700, 1174], [1000, 1174], [1000, 1062], [1140, 1062]];
  for (const [x, y] of sky) if (x > 1140 && x < 2140) top.push([x, Math.min(y, 1112)]);
  top.push([2140, skyY(2140)], [2140, 1130], [2290, 1130], [2290, skyY(2290)]);
  for (const [x, y] of sky) if (x > 2290 && x < 2397) top.push([x, y]);
  top.push([2397, 1104], [3200, 1104]);
  const water = (x) => 2 * (shoreY(x / 2) + 40);
  const bottom = [];
  for (let x = 3200; x >= 0; x -= 40) bottom.push([x, water(x) + 40]);
  const shore = [];
  for (let x = 0; x <= 3200; x += 40) shore.push([x, water(x)]);
  const pts = (list) => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  return `data-km-walk="${pts(top.concat(bottom))}" data-km-shore="${pts(shore)}"`;
}

/* ------------------------------------------------------------------ where the keepers stand (world units) */
const KEEPERS = {
  nutrition: { x: 600, y: 1166, make: avocadoKeeper, id: 'km-keeper-nutrition', name: 'Avo' },
  fitness: { x: 1330, y: 1004, sc: 0.8, make: stonesKeeper, id: 'km-keeper-fitness', name: 'Steady' },
  'dog-training': { x: 2470, y: 1184, make: ballKeeper, id: 'km-keeper-dog-training', name: 'Tumble' },
};

const SIDEKICKS = {
  'nutrition-summer': { x: 486, y: 1172, make: summerSidekick, id: 'km-sidekick-summer', name: 'Summer', title: 'Summer the peach, Avo\'s sidekick for treats and sweets' },
  'nutrition-spud': { x: 936, y: 1198, make: spudSidekick, id: 'km-sidekick-spud', name: 'Spud', title: 'Spud the potato, who brings dinner in the evenings' },
  'fitness-puff': { x: 1232, y: 1012, lift: 50, sc: 0.8, make: cloudSidekick('puff'), id: 'km-sidekick-puff', name: 'Puff', title: 'Puff the white cloud, Steady\'s sidekick for home workouts and running in the weather' },
  'fitness-huff': { x: 1430, y: 998, lift: 66, sc: 0.8, make: cloudSidekick('huff'), id: 'km-sidekick-huff', name: 'Huff', title: 'Huff the dust cloud, Steady\'s sidekick for gym workouts and running in the heat' },
};
SIDEKICKS['dog-training-barkley'] = { x: 2340, y: 1210, make: DOG_SIDEKICKS.barkley, id: 'km-sidekick-barkley', name: 'Barkley', title: 'Barkley the stick, Tumble\'s sidekick for outdoor play and dogs in the woods' };
SIDEKICKS['dog-training-sizzle'] = { x: 2604, y: 1198, make: DOG_SIDEKICKS.sizzle, id: 'km-sidekick-sizzle', name: 'Sizzle', title: 'Sizzle the bacon strip, Tumble\'s sidekick for food and treats' };
const FIGURES = Object.assign({}, KEEPERS, SIDEKICKS);

/* ------------------------------------------------------------------ styles and defs */
const STYLE = `
  .km-night-only, .km-evening-only, .km-dinner-only { display: none; }
  svg[data-km-evening="1"]:not([data-km-night="1"]) .km-dinner-only { display: inline; }
  svg[data-km-evening="1"]:not([data-km-night="1"]) .km-mound { display: none; }
  svg[data-km-evening="1"] .km-evening-only { display: inline; }
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
  .km-face-thinking, .km-face-oh, .km-talk { display: none; }
  [data-km-mood="thinking"] .km-face-happy, [data-km-mood="oh"] .km-face-happy { display: none; }
  [data-km-mood="thinking"] .km-face-thinking, [data-km-mood="oh"] .km-face-oh, [data-km-talk="1"] .km-talk { display: inline; }
  .km-dots circle { animation: km-dots 1.2s ease-in-out infinite; }
  .km-dots circle:nth-child(2) { animation-delay: -0.8s; }
  .km-dots circle:nth-child(3) { animation-delay: -0.4s; }
  .km-ashore .dt-splash { display: none; }
  svg[data-km-night="1"] [data-km-awake="1"] .km-day-only { display: inline; }
  svg[data-km-night="1"] [data-km-awake="1"] .km-night-only { display: none; }
  [data-km-part="telescope"] { cursor: pointer; }
  .km-pose { transform-box: fill-box; transform-origin: 50% 100%; transition: transform 0.35s ease; }
  [data-km-mood="oh"] .km-pose { transform: translateY(-8px) scale(1.04, 0.97); }
  [data-km-mood="thinking"] .km-pose { transform: rotate(-5deg); }
  [data-km-talk="1"]:not([data-km-mood="oh"]) .km-pose { animation: km-chat 0.9s ease-in-out infinite alternate; }
  @keyframes km-chat { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-3px) rotate(1.5deg); } }
  svg:not([data-km-night="1"]) :is(.km-twinkle, .km-ff, .km-blink, .km-zz, .km-breathe) { animation: none; }
  @keyframes km-dots { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
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

/* The running water and the hill's life (scene files only); STYLE's reduced-motion rule stops it too. The sky's stars
   (owner, 2026-10-09: "those stars need to not be moving that way in the night sky") twinkle by brightness alone and
   never move: no scale, no shift. */
const HILL_STYLE = `
  /* the koi only leaps when things may move; held still, it stays under and its rings show */
  @media (prefers-reduced-motion: reduce) { .km-fish { opacity: 0; } }
  /* a lantern with no question on it: dark paper on its post (/kit/kindlemere-lanterns.js) */
  [data-km-lantern="off"] .km-ll, [data-km-glow][data-km-lantern="off"] { display: none; }
  [data-km-lantern="off"] .km-lp { fill: #8C7B6A; }
  .km-star { animation: km-star 3.2s ease-in-out infinite; }
  svg:not([data-km-night="1"]) .km-star { animation: none; }
  @keyframes km-star { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .km-flow { animation: km-flow 3s linear infinite; }
  .km-cascade { animation: km-cascade 0.8s linear infinite; }
  .km-foam { animation: km-foam 1.5s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
  .km-ripple { animation: km-ripple 4.2s ease-out infinite; transform-box: fill-box; transform-origin: center; }
  .km-graze { animation: km-graze 5.2s ease-in-out infinite; transform-box: fill-box; transform-origin: 15% 10%; }
  .km-flit { animation: km-flit 9s ease-in-out infinite; }
  .km-wing { animation: km-wing 0.3s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
  svg[data-km-night="1"] :is(.km-graze, .km-flit, .km-wing) { animation: none; }
  @keyframes km-flow { to { stroke-dashoffset: -30; } }
  @keyframes km-cascade { to { stroke-dashoffset: -12; } }
  @keyframes km-foam { from { transform: scale(0.8); opacity: 0.7; } to { transform: scale(1.15); opacity: 1; } }
  @keyframes km-ripple { 0% { transform: scale(0.3); opacity: 0; } 20% { opacity: 0.7; } 100% { transform: scale(1.35); opacity: 0; } }
  @keyframes km-graze { 0%, 46%, 100% { transform: rotate(0deg); } 54%, 70% { transform: rotate(-24deg); } 78% { transform: rotate(-3deg); } 86% { transform: rotate(-8deg); } }
  @keyframes km-flit { 0%, 100% { transform: translate(0, 0); } 20% { transform: translate(6px, -5px); } 40% { transform: translate(13px, -1px); } 60% { transform: translate(8px, 5px); } 80% { transform: translate(-3px, -3px); } }
  @keyframes km-wing { from { transform: scaleX(1); } to { transform: scaleX(0.25); } }`;

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
    <linearGradient id="km-fade-field-1" gradientUnits="userSpaceOnUse" x1="930" y1="0" x2="1060" y2="0"><stop offset="0" stop-color="#78963A" stop-opacity="0"/><stop offset="1" stop-color="#78963A" stop-opacity="1"/></linearGradient>
    <linearGradient id="km-fade-field-2" gradientUnits="userSpaceOnUse" x1="930" y1="0" x2="1060" y2="0"><stop offset="0" stop-color="#9CB54A" stop-opacity="0"/><stop offset="1" stop-color="#9CB54A" stop-opacity="1"/></linearGradient>
    <linearGradient id="km-ground-1" gradientUnits="userSpaceOnUse" x1="420" y1="0" x2="1220" y2="0"><stop offset="0" stop-color="#525C12"/><stop offset="0.34" stop-color="#525C12"/><stop offset="0.5" stop-color="#6A7E2A"/><stop offset="0.66" stop-color="#78963A"/><stop offset="1" stop-color="#78963A"/></linearGradient>
    <linearGradient id="km-ground-2" gradientUnits="userSpaceOnUse" x1="420" y1="0" x2="1220" y2="0"><stop offset="0" stop-color="#7D8A26"/><stop offset="0.34" stop-color="#7D8A26"/><stop offset="0.5" stop-color="#93A83E"/><stop offset="0.66" stop-color="#9CB54A"/><stop offset="1" stop-color="#9CB54A"/></linearGradient>
    <radialGradient id="km-pool-g"><stop offset="0" stop-color="#FFC37A" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC37A" stop-opacity="0"/></radialGradient>
    <pattern id="km-gingham" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#FFFFFF"/><rect width="4" height="8" fill="#FFE1C2"/><rect width="8" height="4" fill="#FFB36B" opacity="0.4"/></pattern>
    <clipPath id="km-moon-clip"><use href="#km-moon-lit"/></clipPath>${view ? `
    <filter id="km-layer-xs" x="-5%" y="-5%" width="110%" height="120%"><feDropShadow dx="0" dy="1.2" stdDeviation="0" flood-color="${C.ink}" flood-opacity="0.12"/></filter>${hillDefs()}${fieldDefs()}` : ''}
    ${ripples ? `<mask id="km-ripples"><rect y="724" width="1600" height="176" fill="#fff"/>${Array.from({ length: 16 }, (_, i) => `<rect y="${736 + i * 9}" width="1600" height="${3 + (i % 3)}" fill="#000"/>`).join('')}</mask>` : ''}
    <symbol id="star" viewBox="-10 -10 20 20"><path d="M0 -10 C1.2 -2.5 2.5 -1.2 10 0 C2.5 1.2 1.2 2.5 0 10 C-1.2 2.5 -2.5 1.2 -10 0 C-2.5 -1.2 -1.2 -2.5 0 -10 Z" fill="#FFFFFF"/></symbol>
  </defs>`;
}

/* ------------------------------------------------------------------ the whole scene */
const DESC = 'Kindlemere: one big park beside a still teal lake, drawn to scale, under one sky that follows the real time of day. ' +
  'On the left, the Orchard: a foresty picnic meadow on terraced ground, with a deep wood of round trees, poplars and pines behind it, stone walls, two avocado trees heavy with avocados, a straw beehive, ' +
  'a larder door dug into the hill with a lamp and jars, a ladder and a basket of avocados, a vegetable patch with a rabbit, a herb spiral, a watering can, a picnic blanket with a basket, and a long table with a gingham cloth, avocado toast, avocado halves, blueberries, honey and an apricot kettle under a string of paper lights. ' +
  'There the nutrition keeper, an avocado through and through, with pale flesh down her front, the round pit for a belly, avocado-leaf ears and a satchel of seed-packet cards, holds up a card, with Summer, a little peach holding a berry tart, beside her. In the evenings Spud, a potato in an apron, brings a pot of dinner to the table. ' +
  'In the middle rises Stepping Hill, a big grassy hill of meadow patches and wildflowers with granite outcrops, pines, birches and gorse, stone steps up its face on a worn trail with a rope rail, a switchback trail with timber steps, turn markers, stacked stones and flags, a dry-stone wall and a trough where sheep and lambs graze, rabbits, a stretching bar and a balance log, a quiet pool set into its shoulder whose stream falls over two granite ledges, runs behind the dog house and under a little bridge into the lake, and a railed lookout on the top with a spyglass. ' +
  'At its foot stands the fitness keeper, three stacked river stones in granite greys with a pebble sash and a paper star, beside a log bench, a coiled rope, a stone kettlebell, a water flask and a towel, with two little clouds hovering low either side, Puff in white and Huff in sandy dust, a little way up the hill, where a bench waits part way up the steps and a few sheep graze. ' +
  'On the right, Lakeside Field: open grass in the hill\'s greens running down to a little beach of sand and pebbles on a bay of the lake, with a mown training lane, drifts of wildflowers and clover, and toys and paw prints in the grass. Along its split-rail fence stand the dog house, a bar jump, weave poles, a woven willow hoop and flags with paw prints, and a weeping willow shades a bench and a basket of toys. ' +
  'Beyond the fence lies farmland: fields of pasture, wheat and ploughed earth between hedgerows with trees in them, a barn, round hay bales, a gate and a few sheep. In the bay a heron fishes among the reeds and cattails and two ducklings follow the duck. ' +
  'There the dog keeper, a large herding ball with a handle on top, tooth marks and a treat pouch, waves on Asher the Dasher, the park\'s dog: a lean white dog with a ginger head, a white blaze, one ear up and a green bandana, who gallops through the shallows with a tennis ball in its mouth while a paper duck looks on, with Barkley, a big stick off a tree, and Sizzle, an oversized strip of bacon, either side. ' +
  'From the signpost a dock runs out into the lake, with a basket of folded lanterns, a stool with a notebook and a lantern post. Orange paper lanterns drift away across the water toward Louise, the librarian, and a paper boat brings a book back. ' +
  'After dark the sky fills with stars and the moon in its real phase, fireflies rise over the meadows, the string lights and lanterns glow, the keepers doze, and the dog sleeps curled in the door of its house.';

function build(view) {
  DETAIL = 0.5; DENS = 2.2;
  const land1 = far() + forest();
  DETAIL = 1 / 2.6; DENS = 2.4;
  LIFE = '';
  const hillPart = hillBody();
  DETAIL = 0.5; DENS = 2.2;
  const land2 = hillFoot() + orchard() + field() + bank() + paths() + signpost() + lake() + shore() + lanterns();
  DETAIL = 1; DENS = 1;
  const actor = (key, x, y, inner, name) => `<g data-km-actor="${key}" data-km-name="${name}" data-km-home="${x} ${y}" pointer-events="visiblePainted"><g filter="url(#km-light)">${inner}</g></g>`;
  let actors = '';
  for (const [key, k] of Object.entries(KEEPERS)) actors += actor(key, k.x, k.y, placeKeeper(k.id, k.make('scene'), k.x, k.y, k.sc), k.name);
  for (const [key, k] of Object.entries(SIDEKICKS)) actors += actor(key, k.x, k.y, placeSidekick(k.id, k.make('scene'), k.x, k.y, k.lift || 0, k.cls, k.sc), k.name);
  actors += actor('dog', DOG_AT[0] + 60, DOG_AT[1] + 64, `<g class="km-day-only">${fieldDog(DOG_AT[0], DOG_AT[1])}</g>`, 'dog');
  const body =
    `<g data-km-layer="sky">${sky(view)}</g>` +
    `<g data-km-layer="far" filter="url(#km-light)"><g transform="scale(2)">${land1}</g></g>` +
    `<g data-km-layer="hill" filter="url(#km-light)"><g transform="translate(1630 1112) scale(2.6) translate(-815 -556)">${hillPart}</g></g>` +
    `<g data-km-layer="land" filter="url(#km-light)"><g transform="scale(2)">${land2}</g></g>` +
    `<g data-km-layer="life" filter="url(#km-light)"><g transform="scale(2)">${LIFE}</g>${sleepingDogAtHome()}</g>` +
    // the night's own lights, never in the hour's light: a layer of their own, so the live scene lights the land as one
    // layer (kindlemere.js) and never redraws it under the filter when a light twinkles
    `<g data-km-layer="lights">${glitter()}${nightLights()}</g>` +
    `<g data-km-layer="actors" ${ground()}>${actors}</g>` +
    `<g data-km-layer="grain"><rect id="km-grain" class="km-grain" width="${W}" height="${H}" filter="url(#grain)" opacity="0.3" pointer-events="none"/></g>`;
  // id km-still: shown as a picture at <view>.svg#km-still it holds still (the Kindlemere page's cards); the rule
  // :root:target stops its animations, which would otherwise redraw the whole picture every frame.
  return `<svg xmlns="http://www.w3.org/2000/svg" id="km-still" viewBox="${view.box}" role="img" aria-labelledby="km-title km-desc" data-km-view="${view.key}" data-km-sky="${view.sky.join(' ')}">
<title id="km-title">${view.title}</title>
<desc id="km-desc">${DESC}</desc>
<!-- Drawn by kit/art/make-kindlemere.js. Edit that file, not this one. Lit and timed by /kit/kindlemere.js. -->
<style>${STYLE}${HILL_STYLE}${FIELD_DOG.style}
  :root:target * { animation: none !important; }
</style>
${defs(view, true).replace('</defs>', `${FIELD_DOG.defs}</defs>`)}
${body}
</svg>
`;
}

/** One keeper on its own in one mood, for the agents' pages: kit/art/keepers/<agent>-<mood>.svg. */
function keeperFile(agent, mood) {
  const k = FIGURES[agent].make(mood);
  const pad = 26;
  const x0 = -36 - pad;
  const y0 = k.top - 34 - pad;
  const w = k.w + 60 + pad * 2;
  const h = k.feet + 10 - y0 + pad / 2;
  const sh = mood === 'oh' ? `<g transform="translate(${k.cx} ${k.feet}) scale(0.8) translate(${-k.cx} ${-k.feet})">${shadow(k.cx, k.feet, f(k.w * 0.36), 6)}</g>` : shadow(k.cx, k.feet, f(k.w * 0.36), 6);
  const title = { nutrition: 'The nutrition keeper', fitness: 'The fitness keeper', 'dog-training': 'The dog-training keeper' }[agent] || FIGURES[agent].title;
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
 * The pack's own door (the repo's root agent.json, Kindlemere installed as one agent): the three keepers side by side,
 * happy, drawn from their own figures, as `art.svg` (the figure in the open doorway) and `mark.svg` (the sign on the
 * door: the same three on a round of the lake's colour). Never the lantern orange.
 */
function packFigures() {
  let x = 0;
  let o = '';
  for (const key of ['nutrition', 'fitness', 'dog-training']) {
    const k = FIGURES[key].make('happy');
    o += `<g transform="translate(${x - k.cx} ${-k.feet})" filter="url(#layer-sm)">${shadow(k.cx, k.feet, f(k.w * 0.36), 6)}${pose('happy', k.cx, k.feet, k.body)}</g>`;
    x += 160;
  }
  return o;   // feet on y 0; the keepers stand at x 0, 160 and 320
}
function packFile(kind) {
  const head = (box, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-labelledby="km-title">
<title id="km-title">${title}</title>
<!-- Drawn by kit/art/make-kindlemere.js (the pack's ${kind}). Edit that file, not this one. -->
<style>${STYLE}
</style>
${defs(null, false)}
`;
  if (kind === 'art') return `${head('-100 -170 520 192', 'Kindlemere: Avo the avocado, Steady the stacked stones and Tumble the herding ball, side by side and happy')}${packFigures()}
</svg>
`;
  return `${head('-130 -130 260 260', 'Kindlemere: Avo, Steady and Tumble')}<circle r="124" fill="${C.mere}"/><circle r="124" fill="none" stroke="${C.paper}" stroke-width="8"/>
<g transform="scale(0.5) translate(-160 80)">${packFigures()}</g>
</svg>
`;
}

/*
 * One world, four cameras. The wide view is the map of the whole realm; each close view frames one keeper in its
 * place with sky above (owner, 2026-10-07, on the Orchard close-up: "this one"). `sky` is [top, horizon] in world
 * units: the live script runs the sun and the moon between them, across the view's width.
 */
const VIEWS = [
  { key: 'realm', file: 'kindlemere.svg', box: '48 27 3104 1746', sky: [80, 900], title: 'Kindlemere' },
  { key: 'orchard', file: 'kindlemere-orchard.svg', box: '260 700 1024 576', sky: [710, 900], title: 'Kindlemere: the Orchard' },
  { key: 'hill', file: 'kindlemere-hill.svg', box: '820 610 1088 612', sky: [620, 860], title: 'Kindlemere: Stepping Hill' },
  { key: 'field', file: 'kindlemere-field.svg', box: '1976 760 1200 675', sky: [772, 930], title: 'Kindlemere: Lakeside Field' },
];

/* ------------------------------------------------------------------ the pages' own edges */
/* Owner, 2026-10-09: "fix the non fullscreen branding and headlines and footers ... they dont live to the same standard
   and detailed design." Two strips the kit's pages tile along their edges (kit/dashboard/public/kit.css), drawn from the
   park's own pieces: the treeline under every page's bar (pines, round trees and a grass edge, over the far hills) and
   the shore over every page's foot (sand, pebbles, reeds and a lantern post standing in the lake). Each tiles end to
   end: what leaves one edge comes in at the other. */
function treelineFile() {
  const W = 960; const H = 48;
  const wave = (y0, amp, n) => { let d = `M0 ${H}`; for (let x = 0; x <= W; x += 12) d += ` L${x} ${f(y0 - amp * Math.sin((x / W) * Math.PI * 2 * n))}`; return `${d} L${W} ${H} Z`; };
  let o = `<path d="${wave(30, 4, 3)}" fill="#A9BF8A"/><path d="${wave(36, 3, 5)}" fill="#8EA86A"/>`;
  const round = (x, y, rr) => contact(x + 1, y + 0.4, rr * 0.8, 1.2, 0.18) + `<rect x="${f(x - 1.1)}" y="${f(y - rr * 0.9)}" width="2.2" height="${f(rr * 0.9)}" fill="${C.bark}"/>` +
    blobs('#56752F', [[x - rr * 0.45, y - rr * 1.1, rr * 0.7], [x + rr * 0.45, y - rr * 1.05, rr * 0.72], [x, y - rr * 1.55, rr * 0.8]]) +
    blobs('#6E8F3A', [[x - rr * 0.3, y - rr * 1.6, rr * 0.45], [x - rr * 0.6, y - rr * 1.2, rr * 0.35]]);
  // a seeded run of pines, round trees and gaps, so the edge never shows its repeat at a glance
  o += ownSeed(CHROME_SEED, () => {
    let s = ''; let x = 14;
    while (x < W - 14) {
      const k = rnd();
      if (k < 0.5) s += pine(x, 44 + r(0, 1), r(18, 40));
      else if (k < 0.85) s += round(x, 44 + r(0, 1), r(7, 12));
      x += k > 0.92 ? r(38, 60) : r(14, 30);
    }
    return s;
  });
  o += `<path d="M0 ${H} V44 C120 42 240 45 360 43.5 S600 42 720 44 840 45 ${W} 44 V${H} Z" fill="#6F8A34"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${o}</svg>
`;
}
function shoreFile() {
  const W = 960; const H = 64;
  let o = `<path d="M0 ${H} V30 C120 27 210 33 330 30 S570 26 690 30 870 32 ${W} 30 V${H} Z" fill="#E3CFA2"/>`;
  o += `<path d="M0 ${H} V38 C150 36 270 40 450 38 S780 36 ${W} 38 V${H} Z" fill="#CDB283"/>`;
  o += ownSeed(CHROME_SEED + 1, () => {
    let s = '';
    for (let i = 0; i < 16; i += 1) {
      const x = r(10, W - 10); const y = r(32.5, 36.5); const rr = r(1.2, 2.4);
      s += `<ellipse cx="${f(x)}" cy="${f(y + rr * 0.5)}" rx="${f(rr * 1.1)}" ry="0.6" fill="${C.ink}" opacity="0.18"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr * 1.2)}" ry="${f(rr)}" fill="${pick(['#9C8A68', '#B8A27C', '#A8946E'])}"/>`;
    }
    return s;
  });
  // the lake from here down is the foot's own colour (--km-mere), so the strip runs into it with no seam
  o += `<path d="M0 ${H} V44 C90 42 180 46 300 44 S510 42 630 44.5 840 46 ${W} 44 V${H} Z" fill="#1F5C6E"/>`;
  o += `<path d="M14 47 h22 M170 49 h16 M328 47.5 h26 M536 48 h20 M712 47 h14 M880 48.5 h24" stroke="#CFE6EA" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>`;
  const reeds = (x0, n) => { let s = ''; for (let i = 0; i < n; i += 1) { const x = x0 + i * 3.2; const h = 16 + ((i * 7) % 9); s += `<path d="M${f(x)} 45 q${f(i % 2 ? 1.5 : -1.5)} ${f(-h / 2)} ${f(i % 2 ? 2.5 : -2)} ${-h}" stroke="${i % 3 ? '#4F6E3A' : '#5E7A2A'}" stroke-width="1.4" stroke-linecap="round" fill="none"/>`; if (i % 2 === 0) s += `<rect x="${f(x - 1)}" y="${f(45 - h * 0.9)}" width="2.2" height="6" rx="1.1" fill="${C.clay4}"/>`; } return s; };
  o += reeds(44, 6) + reeds(402, 4) + reeds(610, 7) + reeds(888, 5);
  // two lantern posts standing in the shallows, lit, like the ones on the lake
  for (const x of [250, 742]) {
    o += `<rect x="${x - 1.5}" y="18" width="3" height="30" rx="1.5" fill="${C.clay4}"/><circle cx="${x}" cy="13" r="9" fill="${C.kindle}" opacity="0.22"/>`;
    o += `<g transform="translate(${x} 16) scale(0.28)">${lanternBody()}</g><path d="M${x - 8} 48.5 h16" stroke="#CFE6EA" stroke-width="1" stroke-linecap="round" opacity="0.7"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${o}</svg>
`;
}
const CHROME_SEED = 20261013;

if (require.main === module) {
  for (const [file, draw] of [['kindlemere-treeline.svg', treelineFile], ['kindlemere-shore.svg', shoreFile]]) {
    const out = path.join(__dirname, file);
    fs.writeFileSync(out, draw(), 'utf8');
    process.stdout.write(`Drew ${path.relative(process.cwd(), out)}, a page edge\n`);
  }
  for (const view of VIEWS) {
    seed = 20261007; // the same random detail in every view
    const out = path.join(__dirname, view.file);
    fs.writeFileSync(out, build(view), 'utf8');
    process.stdout.write(`Drew ${path.relative(process.cwd(), out)} (${Math.round(fs.statSync(out).size / 1024)} KB)\n`);
  }
  const dir = path.join(__dirname, 'keepers');
  fs.mkdirSync(dir, { recursive: true });
  for (const agent of Object.keys(FIGURES)) {
    for (const mood of MOODS) {
      seed = 20261007;
      fs.writeFileSync(path.join(dir, `${agent}-${mood}.svg`), keeperFile(agent, mood), 'utf8');
    }
  }
  process.stdout.write(`Drew ${Object.keys(FIGURES).length * MOODS.length} keeper and sidekick moods in ${path.relative(process.cwd(), dir)}\n`);
  for (const kind of ['art', 'mark']) {
    seed = 20261007;
    const out = path.join(__dirname, '..', '..', `${kind}.svg`);
    fs.writeFileSync(out, packFile(kind), 'utf8');
    process.stdout.write(`Drew ${path.relative(process.cwd(), out)}, the pack's ${kind === 'art' ? 'door figure' : 'door sign'}\n`);
  }
}

module.exports = { VIEWS, MOODS, KEEPERS };
