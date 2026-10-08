'use strict';

/**
 * kit/art/make-kindlemere.js: draws the ONE scene of the realm (kit/REALM.md): kit/art/kindlemere.svg (the whole
 * realm) and three close views of it, kindlemere-orchard.svg, kindlemere-peaks.svg and kindlemere-meadow.svg.
 *   node kit/art/make-kindlemere.js
 * Plain Node. Cut paper at first light: flat paper shapes in several layers, each on a short hard shadow, paper grain
 * over all of it, and a few slow loops (lanterns bob, the waterfall falls, light runs along the paths).
 * The realm is GROUNDED (owner, 2026-10-07): three places on one land around the lake, rooted, joined by paths that
 * meet at a signpost, with a lookout for seeing far. Repeated detail (grass, straw, stones, waves) comes from a seeded
 * random, so every run draws the same scene.
 *
 * Parts (ids): km-sky, km-far, km-forest, km-hill, km-orchard, km-field, km-bank, km-paths, km-signpost, km-lake,
 * km-shore, km-lanterns, km-keeper-nutrition, km-coach, km-keeper-dog-training, km-dogs, km-grain.
 */

const fs = require('fs');
const path = require('path');


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
  for (let i = 0; i < count; i += 1) {
    const x = r(x0, x1);
    const y = r(y0, y1);
    const h = r(hMin, hMax) * (0.7 + ((y - y0) / Math.max(1, y1 - y0)) * 0.6);
    const lean = r(-5, 5);
    out += `<path d="M${f(x - 2.4)} ${f(y)} Q${f(x + lean * 0.5)} ${f(y - h * 0.6)} ${f(x + lean)} ${f(y - h)} Q${f(x + lean * 0.3 + 1)} ${f(y - h * 0.5)} ${f(x + 2.4)} ${f(y)} Z" fill="${pick(cols)}"/>`;
  }
  return out;
}

function flower(x, y, petal, centre, s) {
  const k = s || 1;
  let p = '';
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    p += `<circle cx="${f(x + Math.cos(a) * 3.2 * k)}" cy="${f(y + Math.sin(a) * 3.2 * k)}" r="${f(2.4 * k)}" fill="${petal}"/>`;
  }
  return `${p}<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.8 * k)}" fill="${centre}"/>`;
}

function eyes(x1, x2, y, rx, ry, dx, dy) {
  const one = (x) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.paper}"/>` +
    `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(rx * 0.58)}" fill="${C.ink}"/>` +
    `<circle cx="${f(x + dx + rx * 0.25)}" cy="${f(y + dy - ry * 0.3)}" r="${f(rx * 0.22)}" fill="${C.paper}"/>`;
  return one(x1) + one(x2);
}

/* The lake's edge, left to right: level along the Orchard and the Hill, then rising into a bay beside the Field. */
const SHORE = [[0, 628], [560, 628], [1040, 630], [1180, 620], [1320, 602], [1460, 588], [1600, 580]];
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

function stones(x0, x1, y, h, cols) {
  let o = '';
  for (let x = x0; x < x1; x += r(12, 18)) o += `<ellipse cx="${f(x)}" cy="${f(y + r(-1, 1))}" rx="${f(r(7, 10))}" ry="${f(h)}" fill="${pick(cols)}"/>`;
  return o;
}

function lanternBody() {
  return `<rect x="-6" y="-46" width="12" height="9" rx="3" fill="${C.ink}"/><path d="M0 -46 V-54" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M-16 -36 H16 C21 -24 21 6 14 16 H-14 C-21 6 -21 -24 -16 -36 Z" fill="${C.kindle}"/>` +
    `<path d="M-16 -36 H-2 C-6 -24 -6 6 -3 16 H-14 C-21 6 -21 -24 -16 -36 Z" fill="${C.kindleDeep}" opacity="0.35"/>` +
    `<path d="M-14 -24 H14 M-16 -10 H16 M-15 4 H15" stroke="${C.kindleDeep}" stroke-width="1.6" opacity="0.55"/>` +
    `<path d="M6 -30 C9 -18 9 0 6 10" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.75"/>` +
    `<rect x="-10" y="15" width="20" height="7" rx="3.5" fill="${C.ink}"/>`;
}

function lantern(x, y, s, delay) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="km-bob" style="animation-delay:-${delay}s">` +
    `<ellipse cx="0" cy="34" rx="34" ry="6" fill="none" stroke="${C.mereLight}" stroke-width="2" opacity="0.5"/>` +
    `<ellipse cx="0" cy="34" rx="22" ry="4" fill="none" stroke="${C.mereLight}" stroke-width="2" opacity="0.7"/>` +
    `<rect x="-5" y="34" width="10" height="34" rx="5" fill="${C.kindle}" opacity="0.28"/>` +
    `<circle cx="0" cy="-4" r="34" fill="${C.kindle}" opacity="0.14"/><circle cx="0" cy="-4" r="24" fill="${C.kindle}" opacity="0.18"/>` +
    lanternBody() + `</g></g>`;
}

/* ------------------------------------------------------------------ the sky: three hours on one sky */
function sky() {
  let out = `<rect width="1600" height="900" fill="${C.fSky}"/>`;
  out += `<path d="M0 0 H560 C640 110 590 260 640 380 C670 450 640 520 630 560 H0 Z" fill="${C.nSky}"/>`;
  out += `<path d="M0 0 H420 C490 120 430 250 480 360 C510 430 480 500 470 560 H0 Z" fill="#FFEBD6" opacity="0.7"/>`;
  out += `<path d="M1600 0 H1060 C980 130 1040 280 980 390 C950 460 975 520 990 560 H1600 Z" fill="${C.dSky}"/>`;
  out += `<path d="M1600 0 H1200 C1140 140 1190 270 1140 380 C1115 450 1130 510 1140 560 H1600 Z" fill="#E8F1C2" opacity="0.7"/>`;
  // Morning sun with paper rays.
  let rays = '';
  for (let i = 0; i < 14; i += 1) rays += `<rect x="-5" y="-112" width="10" height="${i % 2 ? 30 : 40}" rx="5" fill="#FFC98F" transform="rotate(${f((i / 14) * 360)})"/>`;
  out += `<g transform="translate(150 170)"><g class="km-turn">${rays}</g><circle r="74" fill="#FFD1A0"/><circle r="60" fill="${C.nGlow}" filter="url(#layer)"/><circle cx="-18" cy="-18" r="16" fill="#FFC98F"/></g>`;
  // Noon sun over the Peaks.
  out += `<circle cx="1000" cy="80" r="74" fill="${C.paper}" opacity="0.25"/><circle cx="1000" cy="80" r="58" fill="${C.paper}" opacity="0.4"/><circle cx="1000" cy="80" r="42" fill="${C.paper}" filter="url(#layer)"/>`;
  // Afternoon sun, low and warm.
  out += `<circle cx="1480" cy="250" r="72" fill="#EFD3A8" opacity="0.6"/><circle cx="1480" cy="250" r="50" fill="${C.dGlow}" filter="url(#layer)"/><path d="M1440 258 h80 M1450 274 h60" stroke="#EFD3A8" stroke-width="5" stroke-linecap="round"/>`;
  const cloud = (x, y, s, under) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="km-drift" style="animation-delay:-${f(r(0, 30))}s">` +
    `<path d="M-6 30 a26 26 0 0 1 30 -30 a36 36 0 0 1 66 -6 a30 30 0 0 1 52 14 a22 22 0 0 1 14 34 Z" fill="${under}" transform="translate(4 8)"/>` +
    `<path d="M-6 30 a26 26 0 0 1 30 -30 a36 36 0 0 1 66 -6 a30 30 0 0 1 52 14 a22 22 0 0 1 14 34 Z" fill="${C.paper}"/>` +
    `<path d="M10 30 a14 14 0 0 1 22 -12 a20 20 0 0 1 36 2" stroke="${under}" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>`;
  out += cloud(300, 90, 1.1, '#F5D9BE') + cloud(1150, 110, 1.0, '#D3DEB0') + cloud(520, 230, 0.55, '#F0D3B6') + cloud(1340, 190, 0.55, '#CED9A6') + cloud(660, 70, 0.6, '#C8D2F2');
  const bird = (x, y, s) => `<path d="M${x} ${y} q${6 * s} ${-7 * s} ${12 * s} 0 q${6 * s} ${-7 * s} ${12 * s} 0" stroke="${C.inkSoft}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.55"/>`;
  out += bird(420, 70, 1) + bird(452, 84, 0.8) + bird(1250, 70, 0.9) + bird(1280, 60, 0.7) + bird(560, 150, 0.7);
  [[600, 40, 20], [880, 200, 12], [1250, 30, 24], [380, 250, 12], [1390, 150, 13], [740, 30, 10], [1540, 80, 16], [60, 50, 12]].forEach(([x, y, s], i) => {
    out += `<use href="#star" x="${x}" y="${y}" width="${s}" height="${s}" class="${i % 3 === 0 ? 'km-twinkle' : ''}" style="animation-delay:-${i * 0.7}s"/>`;
  });
  return g('id="km-sky"', out);
}

/* ------------------------------------------------------------------ the far country: ranges toward the horizon */
function far() {
  let o = '';
  o += ridge([[0, 410], [140, 380], [300, 404], [460, 370], [600, 396]], 560, '#F2C9A2');
  o += ridge([[560, 360], [700, 300], [820, 340], [960, 290], [1080, 350]], 560, '#BFCAD3');
  o += ridge([[1000, 380], [1160, 350], [1300, 372], [1460, 340], [1600, 366]], 560, '#CBDB92');
  o += ridge([[0, 450], [180, 424], [360, 446], [540, 420], [700, 440]], 560, '#E9B88E');
  o += ridge([[900, 440], [1080, 418], [1260, 436], [1440, 414], [1600, 430]], 560, '#B7CB7C');
  // Little trees on the far ridges.
  for (let i = 0; i < 22; i += 1) {
    const x = r(10, 1590);
    const left = x < 640;
    const right = x > 980;
    if (!left && !right) continue;
    const y = left ? 440 + r(-6, 8) : 430 + r(-6, 8);
    const col = left ? '#D9A47A' : '#A3BA68';
    out(x, y, col);
  }
  function out(x, y, col) { o += `<rect x="${f(x - 1.5)}" y="${f(y - 12)}" width="3" height="12" fill="${col}"/><circle cx="${f(x)}" cy="${f(y - 14)}" r="${f(r(5, 8))}" fill="${col}"/>`; }
  return g('id="km-far"', o);
}

/* ------------------------------------------------------------------ the forest edge behind the Orchard */
function forest() {
  // A wood along the top of the Orchard's hill: round trees, tall poplars and pines, in three depths of green.
  let o = '';
  const row = (y0, n, cols, s) => {
    let out = '';
    for (let i = 0; i < n; i += 1) {
      const x = 10 + i * (560 / n) + r(-10, 10);
      const y = y0 + r(-6, 6) + Math.max(0, (x - 260) * 0.12);
      const kind = pick(['round', 'round', 'poplar', 'pine']);
      const col = pick(cols);
      if (kind === 'round') out += `<rect x="${f(x - 2.5 * s)}" y="${f(y - 22 * s)}" width="${f(5 * s)}" height="${f(22 * s)}" fill="${C.bark}"/><circle cx="${f(x)}" cy="${f(y - 34 * s)}" r="${f(20 * s)}" fill="${col}"/><circle cx="${f(x - 9 * s)}" cy="${f(y - 26 * s)}" r="${f(12 * s)}" fill="${col}"/><circle cx="${f(x + 10 * s)}" cy="${f(y - 28 * s)}" r="${f(13 * s)}" fill="${col}"/>`;
      else if (kind === 'poplar') out += `<rect x="${f(x - 2 * s)}" y="${f(y - 16 * s)}" width="${f(4 * s)}" height="${f(16 * s)}" fill="${C.bark}"/><ellipse cx="${f(x)}" cy="${f(y - 46 * s)}" rx="${f(11 * s)}" ry="${f(34 * s)}" fill="${col}"/>`;
      else out += roundTree(x, y, 1.3 * s, [C.pine, C.pineMid, C.pineLight]);
    }
    return out;
  };
  o += row(436, 16, ['#8FA05A', '#9AAE64', '#86985A'], 0.8);
  o += row(452, 13, ['#6E8A42', '#5F7A3A', '#748F48'], 1.0);
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

function hill() {
  // Stepping Hill: one big grassy hill in proportion with the Orchard and the Field (owner, 2026-10-07), granite
  // outcrops, stone steps up its face, a switchback trail, a quiet pool on its shoulder with a spring running down to
  // the lake, and a lookout on the top with a spyglass pointed at the horizon.
  const base = 556;
  let o = '';
  o += `<g filter="url(#layer)"><path d="M520 ${base} C590 470 690 300 820 278 C950 300 1050 470 1110 ${base} Z" fill="#6F8A34"/>`;
  o += `<path d="M520 ${base} C590 470 690 300 820 278 C836 380 800 480 772 ${base} Z" fill="#8BA348"/></g>`;
  o += `<path d="M690 330 C730 300 770 286 810 282" stroke="#A3B95E" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  o += grassBlades(560, 1080, 470, 552, 70, ['#6F8A34', '#5E7A2A', '#7E9A3A'], 5, 10);
  for (let i = 0; i < 16; i += 1) o += flower(r(600, 1040), r(440, 548), pick([C.paper, C.sand, C.dGlow]), C.fLand, 0.6);
  // Granite outcrops.
  o += `<g filter="url(#layer-sm)">${boulder(704, 452, 64, 36)}${boulder(744, 466, 40, 24)}${boulder(932, 428, 72, 40)}${boulder(876, 340, 46, 26)}${boulder(990, 506, 54, 28)}${boulder(640, 518, 42, 22)}</g>`;
  // Pines on its sides.
  o += `<g filter="url(#layer-sm)">${roundTree(600, 548, 1.2, [C.pine, C.pineMid, C.pineLight])}${roundTree(628, 552, 0.85, [C.pineMid, C.pine, C.pineLight])}${roundTree(1048, 548, 1.1, [C.pine, C.pineMid, C.pineLight])}${roundTree(1076, 554, 0.8, [C.pineMid, C.pineLight])}${roundTree(770, 392, 0.6, [C.pine, C.pineMid])}${roundTree(968, 352, 0.55, [C.pineMid, C.pine])}${roundTree(898, 470, 0.65, [C.pine, C.pineLight])}</g>`;
  // Stone steps up the hill's face on a worn dirt trail, each a granite slab on its riser, with pebbles beside.
  o += `<path d="M668 552 C700 470 740 380 800 290" stroke="#C9A77A" stroke-width="30" stroke-linecap="round" fill="none" opacity="0.85"/><path d="M668 552 C700 470 740 380 800 290" stroke="#B8925F" stroke-width="30" stroke-dasharray="2 18" fill="none" opacity="0.5"/>`;
  for (let i = 0; i < 12; i += 1) {
    const k = i / 11;
    const x = 652 + 140 * k - 18 * Math.sin(k * Math.PI);
    const y = 546 - 250 * k + 20 * Math.sin(k * Math.PI);
    const w = 34 - i * 1.2;
    o += `<rect x="${f(x)}" y="${f(y + 4)}" width="${f(w)}" height="6" rx="2" fill="${C.fLand}"/><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="6" rx="3" fill="${C.fStone}"/><circle cx="${f(x - 4)}" cy="${f(y + 6)}" r="2.2" fill="${C.fGlow}"/><circle cx="${f(x + w + 4)}" cy="${f(y + 7)}" r="2" fill="${C.fLight}"/>`;
  }
  // The switchback trail with its little stacked stones and flags.
  o += `<path d="M900 552 C960 530 1000 506 960 486 C920 468 860 470 872 440 C884 410 950 400 940 372 C930 346 870 344 856 316 C848 300 836 290 826 284" fill="none" stroke="${C.paper}" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="0.1 11"/>`;
  [[960, 482], [872, 436], [938, 368]].forEach(([x, y]) => { o += `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.4" fill="${C.fStone}"/><ellipse cx="${x}" cy="${y - 4}" rx="4.4" ry="2.6" fill="${C.fGlow}"/><ellipse cx="${x}" cy="${y - 7.4}" rx="2.8" ry="2" fill="${C.fStone}"/>`; });
  [[970, 470], [862, 424], [946, 356]].forEach(([x, y], i) => { o += `<path d="M${x} ${y} v-16" stroke="${C.bark}" stroke-width="2"/><path d="M${x} ${y - 16} h11 a4 4 0 0 1 0 8 h-11 Z" fill="${i % 2 ? C.paper : C.sand}" class="km-flag"/>`; });
  // The quiet pool on the shoulder: a lotus, a mat, a bell on a curved post; the spring runs from it.
  o += `<g filter="url(#layer-sm)"><ellipse cx="1000" cy="402" rx="42" ry="9" fill="${C.fLand}"/><ellipse cx="998" cy="398" rx="36" ry="7" fill="${C.mereLight}"/></g><path d="M980 398 h18 M1004 400 h10" stroke="${C.paper}" stroke-width="2" stroke-linecap="round"/>`;
  o += `<path d="M990 396 c-3 -6 0 -9 3 -10 c3 1 6 4 3 10 Z M984 397 c-5 -3 -6 -7 -4 -9 c4 0 6 3 6 8 Z M1002 397 c5 -3 6 -7 4 -9 c-4 0 -6 3 -6 8 Z" fill="${C.paper}"/>`;
  o += `<rect x="950" y="398" width="22" height="6" rx="3" fill="${C.sand}"/>`;
  o += `<path d="M1034 402 V376 q0 -9 9 -9 h7" stroke="${C.bark}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M1044 378 a5.5 6 0 0 1 11 0 Z" fill="${C.dGlow}"/>`;
  o += `<path d="M1030 404 C1040 430 1030 460 1046 488 C1056 506 1052 530 1058 552" stroke="${C.mereLight}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M1030 404 C1040 430 1030 460 1046 488 C1056 506 1052 530 1058 552" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" stroke-dasharray="10 14" fill="none" class="km-fall"/>`;
  // The lookout on the top: a railed platform on a granite ledge, a flag, and a spyglass at the horizon.
  o += `<g filter="url(#layer-sm)">${boulder(820, 288, 92, 24)}</g>`;
  o += `<g transform="translate(820 252)" filter="url(#layer-sm)">`;
  o += `<rect x="-26" y="0" width="52" height="7" rx="3.5" fill="${C.clay3}"/><rect x="-22" y="7" width="5" height="22" fill="${C.clay4}"/><rect x="17" y="7" width="5" height="22" fill="${C.clay4}"/><path d="M-22 20 L22 10" stroke="${C.clay4}" stroke-width="3"/>`;
  o += `<path d="M-24 0 V-16 H24 V0" stroke="${C.clay3}" stroke-width="3" fill="none"/><path d="M-12 -16 V0 M0 -16 V0 M12 -16 V0" stroke="${C.clay3}" stroke-width="2"/>`;
  o += `<path d="M-24 -16 V-56" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/><path d="M-24 -56 h22 l-6 7 l6 7 h-22 Z" fill="${C.fGlow}" class="km-flag"/>`;
  o += `<path d="M8 0 L14 -14 L20 0" stroke="${C.ink}" stroke-width="2" fill="none"/><g transform="rotate(-16 14 -16)"><rect x="4" y="-21" width="30" height="9" rx="4.5" fill="${C.clay2}"/><rect x="28" y="-23" width="9" height="13" rx="3" fill="${C.clay4}"/><rect x="0" y="-19" width="6" height="5" rx="2" fill="${C.clay4}"/></g>`;
  o += `</g>`;
  o += `<path d="M858 230 c60 -18 140 -26 230 -24" stroke="${C.paper}" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round" fill="none" opacity="0.7"/>`;
  // The foot of the hill: grass, flowers, a running track, a sundial, a stretching post, and the keeper's kit:
  // a stone kettlebell with a rope handle, a water flask and a folded towel.
  o += ridge([[520, 556], [640, 540], [760, 548], [880, 536], [1000, 546], [1110, 556]], 640, '#6F8A34');
  o += ridge([[520, 562], [660, 548], [800, 556], [940, 546], [1110, 562]], 640, '#8BA348');
  o += grassBlades(560, 1040, 566, 626, 90, ['#6F8A34', '#5E7A2A', C.nLeafLight], 6, 14);
  for (let i = 0; i < 14; i += 1) o += flower(r(570, 1030), r(570, 624), pick([C.paper, C.sand, C.fPale]), C.fLand, 0.7);
  o += `<ellipse cx="840" cy="566" rx="110" ry="11" fill="none" stroke="${C.paper}" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.75"/>`;
  o += `<g transform="translate(900 572)" filter="url(#layer-sm)"><rect x="-8" y="-6" width="16" height="10" rx="2" fill="${C.fStone}"/><ellipse cx="0" cy="-8" rx="15" ry="5" fill="${C.paper}"/><path d="M0 -8 l9 -10 v10 Z" fill="${C.fDeep}"/><path d="M-12 -8 h4 M8 -8 h4" stroke="${C.inkSoft}" stroke-width="1.4"/></g>`;
  o += `<g transform="translate(960 566)"><path d="M0 0 V-46" stroke="${C.bark}" stroke-width="3.5" stroke-linecap="round"/><circle cx="0" cy="-48" r="3.5" fill="${C.fGlow}"/><path d="M0 -44 c10 4 16 12 24 10 c-6 -4 -8 -8 -12 -12" fill="${C.fGlow}" class="km-flag"/><path d="M0 -38 c8 6 12 14 20 14 c-6 -4 -6 -10 -10 -14" fill="${C.paper}" class="km-flag" style="animation-delay:-1s"/></g>`;
  o += `<g filter="url(#layer-sm)">${shadow(790, 536, 34, 3)}<rect x="758" y="516" width="64" height="9" rx="4.5" fill="${C.clay2}"/><path d="M762 520 h56" stroke="${C.clay3}" stroke-width="1.5"/><circle cx="760" cy="520.5" r="3.5" fill="${C.clay1}"/><circle cx="820" cy="520.5" r="3.5" fill="${C.clay1}"/><rect x="764" y="524" width="8" height="12" rx="3" fill="${C.clay3}"/><rect x="808" y="524" width="8" height="12" rx="3" fill="${C.clay3}"/>` +
    `<ellipse cx="782" cy="512" rx="9" ry="4" fill="none" stroke="${C.sand}" stroke-width="3"/><ellipse cx="782" cy="510" rx="5" ry="2.4" fill="none" stroke="${C.sand}" stroke-width="2.5"/><path d="M791 512 c6 0 8 4 4 8" stroke="${C.sand}" stroke-width="2.5" fill="none"/>` +
    `<path d="M832 534 h22 l-3 -14 h-16 Z" fill="${C.clay2}"/><path d="M834 528 h18" stroke="${C.clay3}" stroke-width="1.5"/><ellipse cx="838" cy="518" rx="5" ry="3.6" fill="${C.fGlow}"/><ellipse cx="847" cy="517" rx="5" ry="3.6" fill="${C.fLight}"/><ellipse cx="842" cy="514" rx="4" ry="3" fill="${C.fStone}"/></g>`;
  o += `<g filter="url(#layer-sm)">${shadow(734, 552, 16, 3)}<path d="M726 534 a8 8 0 0 1 16 0" stroke="${C.sand}" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="734" cy="544" rx="13" ry="10" fill="${C.fLand}"/><path d="M724 540 c4 -5 12 -6 18 -3" stroke="${C.fLight}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  o += `${shadow(866, 538, 8, 2)}<rect x="860" y="516" width="12" height="22" rx="5" fill="${C.fGlow}"/><rect x="862" y="510" width="8" height="7" rx="2" fill="${C.clay2}"/><rect x="860" y="524" width="12" height="4" fill="${C.paper}"/>`;
  o += `<path d="M786 516 h22 l-2 -5 h-18 Z" fill="${C.paper}"/><path d="M788 513 h18" stroke="${C.fGlow}" stroke-width="2"/></g>`;
  return g('id="km-hill"', o);
}

/* ------------------------------------------------------------------ the Orchard (nutrition), on the hill to the left */
function tree(x, base, h, rad, leaves, fruit, fruitShape) {
  let o = shadow(x, base + 2, f(rad * 0.7), 5);
  o += `<path d="M${x - 8} ${base} c3 -2 4 -6 2 -10 M${x + 8} ${base} c-3 -2 -4 -6 -2 -10" stroke="${C.bark}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M${x - 6} ${base} C${x - 5} ${base - h * 0.5} ${x - 3} ${base - h * 0.8} ${x - 1} ${base - h} H${x + 2} C${x + 4} ${base - h * 0.8} ${x + 6} ${base - h * 0.5} ${x + 7} ${base} Z" fill="${C.bark}"/>`;
  o += `<path d="M${x} ${base - h * 0.55} c-10 -8 -18 -10 -24 -20 M${x + 1} ${base - h * 0.7} c10 -6 16 -10 22 -18" stroke="${C.bark}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  const cy = base - h - rad * 0.4;
  const blobs = [];
  for (let i = 0; i < 9; i += 1) blobs.push([x + r(-rad * 0.75, rad * 0.75), cy + r(-rad * 0.6, rad * 0.5), r(rad * 0.38, rad * 0.6)]);
  blobs.sort((a, b) => a[1] - b[1]);
  o += `<circle cx="${x}" cy="${f(cy + 6)}" r="${f(rad * 0.95)}" fill="${leaves[0]}"/>`;
  blobs.forEach(([bx, by, br], i) => { o += `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(br)}" fill="${leaves[1 + (i % (leaves.length - 1))]}"/>`; });
  for (let i = 0; i < 4; i += 1) o += `<path d="M${f(x + r(-rad * 0.6, rad * 0.6))} ${f(cy + r(-rad * 0.5, rad * 0.3))} q4 -6 9 -2" stroke="${leaves[0]}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 12; i += 1) {
    const fx = x + r(-rad * 0.8, rad * 0.8);
    const fy = cy + r(-rad * 0.55, rad * 0.65);
    if (fruitShape === 'avocado') o += `<path d="M${f(fx)} ${f(fy - 12)} v5" stroke="${C.bark}" stroke-width="1.4"/><path d="M${f(fx)} ${f(fy - 8)} c4 0 4 5 3 7 c5 3 6 10 0 11 c-2 0.7 -4 0.7 -6 0 c-6 -1 -5 -8 0 -11 c-1 -2 -1 -7 3 -7 Z" fill="#3E4A14"/><path d="M${f(fx - 3)} ${f(fy - 1)} c-2 3 -2 6 0 8" stroke="${C.nLeafLight}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    else if (fruitShape === 'pear') o += `<path d="M${f(fx)} ${f(fy - 7)} c3 0 3 4 2 6 c4 2 5 8 0 9 c-2 0.6 -4 0.6 -6 0 c-5 -1 -4 -7 0 -9 c-1 -2 -1 -6 2 -6 Z" fill="${fruit}"/><path d="M${f(fx)} ${f(fy - 7)} v-3" stroke="${C.bark}" stroke-width="1.5"/>`;
    else o += `<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(r(5, 7))}" fill="${fruit}"/><circle cx="${f(fx - 2)}" cy="${f(fy - 2)}" r="1.8" fill="${C.paper}" opacity="0.7"/>`;
  }
  for (let i = 0; i < 10; i += 1) { const lx = x + r(-rad * 0.95, rad * 0.95); const ly = cy + r(-rad * 0.8, rad * 0.6); const a = r(-60, 60); o += `<path d="M0 0 C4 -6 14 -8 22 -6 C16 0 6 2 0 0 Z" fill="${pick(leaves)}" transform="translate(${f(lx)} ${f(ly)}) rotate(${f(a)})"/>`; }
  if (fruitShape !== 'avocado') for (let i = 0; i < 5; i += 1) o += flower(x + r(-rad * 0.7, rad * 0.7), cy + r(-rad * 0.6, rad * 0.2), C.paper, C.nGlow, 0.7);
  return o;
}

function orchard() {
  let o = '';
  // The hill: three terraces held by stone walls, rising to the left.
  o += `<g filter="url(#layer)">`;
  o += ridge([[0, 420], [120, 404], [240, 430], [330, 470], [460, 506], [600, 530]], 640, C.nLand);
  o += ridge([[0, 430], [120, 416], [230, 440], [330, 478], [460, 512], [600, 536]], 640, C.nLeafLight);
  o += `</g>`;
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
  [[236, 424], [248, 436], [226, 414]].forEach(([x, y], i) => { o += `<g class="km-buzz" style="animation-delay:-${i}s"><ellipse cx="${x}" cy="${y}" rx="4" ry="3" fill="#E9C24A"/><path d="M${x - 1} ${y - 3} v6 M${x + 1.5} ${y - 3} v6" stroke="${C.ink}" stroke-width="1.2"/><ellipse cx="${x}" cy="${y - 4}" rx="3" ry="2" fill="${C.paper}" opacity="0.85"/></g>`; });
  // Middle terrace: the larder door dug into the hill, with jars on a shelf beside it.
  o += `<g filter="url(#layer-sm)"><path d="M262 506 V478 a20 20 0 0 1 40 0 V506 Z" fill="${C.clay3}"/><path d="M272 506 V474 M282 506 V460 M292 506 V474" stroke="${C.clay4}" stroke-width="2"/>`;
  o += `<path d="M264 484 h16 M264 498 h16" stroke="${C.bark}" stroke-width="3" stroke-linecap="round"/><circle cx="294" cy="492" r="2.6" fill="${C.nGlow}"/><circle cx="282" cy="472" r="5" fill="#FFE9B0" stroke="${C.clay4}" stroke-width="1.5"/>`;
  o += `<path d="M258 508 a26 30 0 0 1 48 0" stroke="${C.cream}" stroke-width="6" fill="none"/>${stones(258, 308, 508, 3.5, [C.cream, C.creamDeep])}`;
  o += `<rect x="312" y="490" width="40" height="4" rx="2" fill="${C.clay4}"/>`;
  [[318, '#D9CF62'], [330, C.nGlow], [342, '#B7C46A']].forEach(([x, col]) => { o += `<rect x="${x - 4}" y="478" width="9" height="12" rx="2.5" fill="${col}"/><rect x="${x - 4}" y="476" width="9" height="3" rx="1.5" fill="${C.cream}"/>`; });
  o += `</g>`;
  // The second avocado tree and its ladder, with a basket of avocados at the foot.
  o += `<g filter="url(#layer-sm)">${tree(520, 528, 86, 50, ['#3E4A14', '#5F6C18', C.nLand, C.nLeaf], '#3E4A14', 'avocado')}</g>`;
  o += `<g filter="url(#layer-sm)"><path d="M482 540 L516 446 M496 544 L530 450" stroke="${C.clay2}" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i += 1) { const t = 0.12 + i * 0.15; o += `<path d="M${f(482 + 34 * t)} ${f(540 - 94 * t)} L${f(496 + 34 * t)} ${f(544 - 94 * t)}" stroke="${C.clay3}" stroke-width="4" stroke-linecap="round"/>`; }
  o += `${shadow(474, 556, 22, 3)}<path d="M456 534 h36 l-4 20 h-28 Z" fill="${C.clay2}"/><path d="M458 540 h32 M460 546 h28" stroke="${C.clay3}" stroke-width="2"/><path d="M460 534 a14 12 0 0 1 28 0" stroke="${C.clay3}" stroke-width="3" fill="none"/>`;
  o += `<ellipse cx="466" cy="530" rx="5" ry="7" fill="#3E4A14" transform="rotate(-20 466 530)"/><ellipse cx="477" cy="528" rx="5" ry="7" fill="#3E4A14"/><ellipse cx="486" cy="531" rx="5" ry="7" fill="#525C12" transform="rotate(20 486 531)"/></g>`;
  // Front: the vegetable patch and the herb spiral.
  for (let i = 0; i < 5; i += 1) { const x = 40 + i * 22; o += `<circle cx="${x}" cy="566" r="8" fill="#8FAF4A"/><circle cx="${x}" cy="566" r="5" fill="#B5CC6A"/><circle cx="${x}" cy="566" r="2" fill="#D6E39A"/>`; }
  for (let i = 0; i < 6; i += 1) { const x = 46 + i * 18; o += `<path d="M${x} 584 l-5 -10 M${x} 584 l0 -12 M${x} 584 l5 -10" stroke="${C.nLeaf}" stroke-width="2.4" stroke-linecap="round"/><path d="M${x - 3} 586 h6 l-3 5 Z" fill="${C.nGlowDeep}"/>`; }
  o += `<path d="M30 592 h120" stroke="${C.clay3}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`;
  for (let i = 0; i < 16; i += 1) { const a = i * 0.7; const rr = 3 + i * 1.3; o += `<ellipse cx="${f(196 + Math.cos(a) * rr)}" cy="${f(578 + Math.sin(a) * rr * 0.4)}" rx="3.6" ry="2.6" fill="${C.cream}"/>`; }
  for (let i = 0; i < 9; i += 1) { const a = i * 1.3; const rr = 4 + i * 2; o += `<path d="M${f(196 + Math.cos(a) * rr)} ${f(576 + Math.sin(a) * rr * 0.4)} v-7 m0 3 l-3 -3 m3 1 l3 -3" stroke="${pick([C.nLand, C.nLeaf, '#8FAF4A'])}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`; }
  o += `<g transform="translate(150 548)">${shadow(8, 18, 14, 2.5)}<path d="M0 6 h18 v12 h-18 Z" fill="${C.mere}"/><path d="M18 9 l12 -8" stroke="${C.mere}" stroke-width="3" stroke-linecap="round"/><path d="M2 6 a7 7 0 0 1 14 0" stroke="${C.mere}" stroke-width="2.5" fill="none"/></g>`;
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
  o += `<g transform="translate(364 506)" filter="url(#layer-sm)"><path d="M-16 28 C-26 26 -30 18 -26 12 C-24 18 -20 22 -12 22 Z" fill="${C.nGlow}"/><ellipse cx="4" cy="28" rx="20" ry="16" fill="${C.nGlow}"/><path d="M-10 36 a20 10 0 0 0 28 0" fill="${C.nGlowDeep}" opacity="0.45"/><rect x="-4" y="9" width="16" height="6" rx="3" fill="${C.nGlowDeep}"/><circle cx="4" cy="8" r="3.5" fill="${C.nGlowDeep}"/><path d="M22 20 C32 20 32 36 22 36" stroke="${C.nGlowDeep}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="-4" cy="22" r="3" fill="${C.paper}" opacity="0.6"/></g>`;
  o += `<g class="km-steam"><path d="M342 520 c-6 -8 6 -12 0 -20 c-6 -8 6 -12 0 -20" stroke="${C.paper}" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M350 516 c-5 -7 5 -10 0 -17" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.8"/></g>`;
  o += grassBlades(0, 560, 596, 630, 60, [C.nLand, C.nLeaf, '#5F6C18'], 6, 12);
  o += grassBlades(0, 240, 482, 500, 24, [C.nLand, C.nLeaf], 5, 9);
  for (let i = 0; i < 10; i += 1) o += flower(r(20, 540), r(596, 624), pick([C.paper, C.nGlow]), C.nGlowDeep, 0.7);
  return g('id="km-orchard"', o);
}

/* ------------------------------------------------------------------ Whistle Meadow (dog-training), to the right */
function field() {
  // Lakeside Field: open grass running down to the lake bay, a split-rail fence, a kennel, weave poles, a willow hoop,
  // flags with paw prints, and paw prints running into the water.
  let o = '';
  o += `<g filter="url(#layer)">`;
  o += ridge([[1020, 540], [1140, 524], [1280, 530], [1440, 512], [1600, 520]], 660, C.dGrassDeep);
  o += ridge([[1020, 546], [1140, 532], [1280, 536], [1440, 520], [1600, 528]], 660, C.dGrass);
  o += `</g>`;
  for (let i = 0; i < 9; i += 1) o += `<rect x="${1060 + i * 60}" y="${f(500 - (i % 3) * 3)}" width="6" height="34" rx="3" fill="${C.dRusset}"/>`;
  o += `<path d="M1058 508 C1200 500 1360 492 1590 498 M1058 520 C1200 512 1360 504 1590 510" stroke="${C.dTan}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<g filter="url(#layer-sm)" transform="translate(1076 496)">${shadow(30, 62, 44, 4)}<path d="M0 60 V24 L30 4 L60 24 V60 Z" fill="${C.dSky}"/><path d="M-6 26 L30 0 L66 26" stroke="${C.dLand}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  for (let i = 0; i < 4; i += 1) o += `<path d="M${4 + i * 8} ${20 - i * 5} l8 6 M${56 - i * 8} ${20 - i * 5} l-8 6" stroke="${C.dRusset}" stroke-width="2"/>`;
  o += `<path d="M18 60 V44 a12 12 0 0 1 24 0 V60 Z" fill="${C.dDark}"/><rect x="22" y="28" width="16" height="6" rx="3" fill="${C.paper}"/><path d="M26 31 h8" stroke="${C.dTan}" stroke-width="1.5"/>`;
  o += `<ellipse cx="76" cy="60" rx="10" ry="4" fill="${C.fGlow}"/><ellipse cx="76" cy="58" rx="7" ry="2.4" fill="${C.mereLight}"/></g>`;
  for (let i = 0; i < 6; i += 1) {
    const x = 1392 + i * 14;
    o += `<g filter="url(#layer-sm)"><rect x="${x}" y="${500 + (i % 2) * 2}" width="5" height="46" rx="2.5" fill="${C.paper}"/>`;
    for (let k = 0; k < 3; k += 1) o += `<rect x="${x}" y="${506 + k * 13 + (i % 2) * 2}" width="5" height="5" fill="${C.dLand}"/>`;
    o += `</g>`;
  }
  o += `${shadow(1516, 552, 36, 3)}<path d="M1484 550 V516 a32 32 0 0 1 64 0 V550" stroke="${C.dRusset}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M1484 550 V516 a32 32 0 0 1 64 0 V550" stroke="${C.dGlow}" stroke-width="9" stroke-dasharray="4 7" fill="none"/>`;
  [[1100, 612, C.paper], [1160, 610, C.dGlow], [1230, 606, C.paper]].forEach(([x, y, col], i) => {
    o += `<path d="M${x} ${y} v-20" stroke="${C.dLand}" stroke-width="2"/><path d="M${x} ${y - 20} h14 a5 5 0 0 1 0 10 h-14 Z" fill="${col}" class="km-flag" style="animation-delay:-${i * 0.6}s"/>`;
    o += `<g fill="${C.dLand}"><ellipse cx="${x + 7}" cy="${y - 14}" rx="1.8" ry="1.5"/><circle cx="${x + 5}" cy="${y - 17}" r="0.9"/><circle cx="${x + 7}" cy="${y - 17.6}" r="0.9"/><circle cx="${x + 9}" cy="${y - 17}" r="0.9"/></g>`;
  });
  for (let i = 0; i < 7; i += 1) { const x = 1250 + i * 16; const y = shoreY(x) - 6 - (i % 2) * 4; o += `<g fill="${C.dGrassDark}" opacity="0.75"><ellipse cx="${f(x)}" cy="${f(y)}" rx="2.6" ry="2"/><circle cx="${f(x - 2.6)}" cy="${f(y - 3)}" r="1.1"/><circle cx="${f(x)}" cy="${f(y - 3.8)}" r="1.1"/><circle cx="${f(x + 2.6)}" cy="${f(y - 3)}" r="1.1"/></g>`; }
  o += `<g filter="url(#layer-sm)"><ellipse cx="1316" cy="578" rx="14" ry="5" fill="${C.fGlow}"/><ellipse cx="1316" cy="577" rx="9" ry="3" fill="none" stroke="${C.paper}" stroke-width="1.5"/>` +
    `<path d="M1150 588 c10 -6 20 4 30 -2 c8 -4 14 2 18 0" stroke="${C.dGlow}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M1150 588 c10 -6 20 4 30 -2 c8 -4 14 2 18 0" stroke="${C.dLand}" stroke-width="5" stroke-dasharray="3 5" fill="none"/><circle cx="1146" cy="589" r="5" fill="${C.dLand}"/><circle cx="1202" cy="586" r="5" fill="${C.dLand}"/>` +
    `<circle cx="1370" cy="566" r="5.5" fill="#D8E04A"/><path d="M1366 564 q4 3 8 0" stroke="${C.paper}" stroke-width="1.2" fill="none"/></g>`;
  o += grassBlades(1030, 1600, 540, 600, 130, [C.dGrassDeep, C.dGrassDark, '#8FAE3A'], 8, 18);
  for (let i = 0; i < 26; i += 1) o += flower(r(1040, 1590), r(540, 596), pick([C.paper, C.dGlow, C.paper, '#F2D27A']), pick([C.dGlow, C.dLand]), r(0.6, 0.9));
  return g('id="km-field"', o);
}

/* ------------------------------------------------------------------ the bank, the paths and the signpost */
function bank() {
  // The land's edge, cut like a slice of earth that follows the shore: a grass lip, soil in layers, roots, stones.
  let o = '';
  o += shoreBand(-4, 680, '#5E7A2A', 2);
  o += shoreBand(4, 680, '#7E6A3A');
  o += shoreBand(14, 680, C.clay3, 1.5);
  o += shoreBand(26, 680, C.clay4, 1.5);
  o += shoreBand(36, 680, C.bark, 1);
  for (let i = 0; i < 40; i += 1) { const x = r(0, 1600); o += `<ellipse cx="${f(x)}" cy="${f(shoreY(x) + r(12, 38))}" rx="${f(r(4, 9))}" ry="${f(r(2.5, 4))}" fill="${pick([C.creamDeep, '#D8D1BC', C.clay1])}" opacity="0.9"/>`; }
  for (let i = 0; i < 30; i += 1) { const x = r(0, 1600); const y = shoreY(x) + 6; const len = r(10, 26); o += `<path d="M${f(x)} ${f(y)} c${f(r(-4, 4))} ${f(len * 0.4)} ${f(r(-8, 8))} ${f(len * 0.7)} ${f(r(-4, 4))} ${f(len)}" stroke="${C.dDark}" stroke-width="${f(r(1.2, 2.4))}" stroke-linecap="round" fill="none" opacity="0.8"/>`; }
  return g('id="km-bank"', o);
}

function paths() {
  // Paths of light stitched into the ground: from each place to the signpost, and from the signpost down to the shore.
  const stitch = (d, delay) => `<path d="${d}" stroke="#E8D7B4" stroke-width="16" stroke-linecap="round" fill="none" opacity="0.9"/>` +
    `<path d="${d}" stroke="${C.paper}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0.1 14" fill="none"/>` +
    `<path d="${d}" stroke="#FFF7D6" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 140" fill="none" class="km-light" style="animation-delay:-${delay}s"/>`;
  let o = '';
  o += stitch('M500 582 C600 590 700 600 782 608', 0);
  o += stitch('M690 562 C720 582 760 598 790 606', 1.5);
  o += stitch('M1180 588 C1060 596 920 604 818 608', 3);
  o += stitch('M800 612 C800 620 798 628 796 640', 4.5);
  // The spring from the hill's pool runs down to the lake, under a little bridge on the Field path.
  o += `<path d="M1058 552 C1062 572 1052 588 1056 604 C1060 618 1056 632 1060 646" stroke="${C.mere}" stroke-width="14" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M1058 552 C1062 572 1052 588 1056 604 C1060 618 1056 632 1060 646" stroke="${C.mereLight}" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 12" fill="none" class="km-fall"/>`;
  o += `<g transform="translate(1056 600)" filter="url(#layer-sm)"><path d="M-26 6 C-14 -8 14 -8 26 6" stroke="${C.clay3}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M-22 4 V-8 M-8 -2 V-14 M8 -2 V-14 M22 4 V-8" stroke="${C.clay4}" stroke-width="3" stroke-linecap="round"/><path d="M-22 -8 C-10 -18 10 -18 22 -8" stroke="${C.clay4}" stroke-width="3" fill="none"/></g>`;
  return g('id="km-paths"', o);
}

function signpost() {
  // The signpost at the crossroads: an arrow to each place, and one across the water to Louise.
  const arm = (y, dir, w, fill, text, tcol) => {
    const tip = dir > 0 ? `M0 ${y} h${w} l10 9 l-10 9 h-${w} Z` : `M0 ${y} h-${w} l-10 9 l10 9 h${w} Z`;
    const tx = dir > 0 ? w / 2 + 2 : -w / 2 - 2;
    return `<path d="${tip}" fill="${fill}"/><text x="${tx}" y="${y + 12.5}" text-anchor="middle" font-family="Candara, 'Gill Sans', 'Trebuchet MS', sans-serif" font-size="11" font-weight="700" fill="${tcol}">${text}</text>`;
  };
  let o = `<ellipse cx="800" cy="614" rx="56" ry="12" fill="#E8D7B4"/>` + stones(752, 850, 616, 2.5, [C.creamDeep, '#D8D1BC', C.cream]) + `<g transform="translate(800 504)" filter="url(#layer-sm)">${shadow(0, 108, 18, 4)}`;
  o += `<rect x="-4" y="0" width="8" height="108" rx="4" fill="${C.clay3}"/><rect x="-6" y="-6" width="12" height="8" rx="4" fill="${C.clay4}"/>`;
  o += `<g transform="rotate(-3)">${arm(6, -1, 62, C.nLand, 'Orchard', C.paper)}</g>`;
  o += `<g transform="rotate(-8)">${arm(26, -1, 52, C.fLand, 'Hill', C.paper)}</g>`;
  o += `<g transform="rotate(-2)">${arm(46, 1, 60, C.dLand, 'Field', C.paper)}</g>`;
  o += `<g transform="rotate(3)">${arm(66, 1, 58, C.mere, 'Louise', C.paper)}</g>`;
  o += `<path d="M-14 108 c4 -8 10 -8 14 0 c4 -8 10 -8 14 0" fill="${C.dGrassDeep}"/>`;
  o += `</g>`;
  return g('id="km-signpost"', o);
}

/* ------------------------------------------------------------------ the lake, Louise's house, the shore */
function lake() {
  let o = shoreBand(40, 900, C.mere);
  o += `<path d="M640 672 C700 740 780 860 820 900 C860 860 940 740 1000 672 Z" fill="#6F8A34" opacity="0.2" mask="url(#km-ripples)"/>`;
  o += `<path d="M0 672 C120 700 260 690 560 672 Z" fill="${C.nLand}" opacity="0.2" mask="url(#km-ripples)"/>`;
  o += band(0, 1600, 724, 6, 80, 900, C.mereMid);
  o += band(0, 1600, 786, 7, 90, 900, '#19495A');
  o += band(0, 1600, 848, 8, 100, 900, C.mereDeep);
  for (let i = 0; i < 56; i += 1) {
    const x = r(0, 1560);
    const y = r(shoreY(x) + 50, 892);
    const w = r(14, 60) * (0.5 + (y - 640) / 260);
    o += `<path d="M${f(x)} ${f(y)} h${f(w)}" stroke="${C.mereLight}" stroke-width="${f(r(2, 3.5))}" stroke-linecap="round" opacity="${f(r(0.25, 0.6))}"/>`;
  }
  [[220, 846, 1], [270, 872, 0.8], [1040, 862, 0.9], [1096, 886, 0.7], [560, 882, 0.8], [1540, 660, 0.7]].forEach(([x, y, s]) => {
    o += `<path d="M${x} ${y} m${-22 * s} 0 a${22 * s} ${9 * s} 0 1 0 ${44 * s} 0 a${22 * s} ${9 * s} 0 0 0 ${-18 * s} ${-8 * s} l${-4 * s} ${8 * s} Z" fill="#4E7F3A"/>`;
    o += `<path d="M${x - 14 * s} ${y + 2 * s} a${14 * s} ${5 * s} 0 0 0 ${26 * s} 0" stroke="#6E9A4E" stroke-width="2" fill="none"/>`;
  });
  o += flower(252, 840, C.paper, C.nGlow, 1.6) + flower(1066, 856, C.paper, C.dGlow, 1.4);
  // Reeds and cattails where the Field meets the bay, and a paper duck keeping an eye on the dog.
  for (let i = 0; i < 9; i += 1) { const x = 1560 + i * 5; const y = shoreY(x) + 44; const h = r(26, 44); o += `<path d="M${x} ${f(y)} q${f(r(-3, 3))} ${f(-h / 2)} ${f(r(-4, 4))} ${f(-h)}" stroke="${C.dGrassDark}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`; if (i % 2) o += `<rect x="${x - 2.5}" y="${f(y - h - 2)}" width="5" height="11" rx="2.5" fill="${C.dLand}"/>`; }
  o += `<g transform="translate(1500 650)" class="km-bob" style="animation-delay:-2s"><path d="M0 8 c-6 0 -8 -8 -2 -10 c4 -1 6 2 10 2 c6 0 10 -2 12 0 c0 6 -6 9 -14 9 Z" fill="${C.paper}"/><circle cx="-1" cy="-4" r="5" fill="${C.paper}"/><path d="M-6 -4 l-5 1 l5 2 Z" fill="${C.dGlow}"/><circle cx="-2" cy="-5" r="1.2" fill="${C.ink}"/><path d="M-10 12 a14 3 0 0 0 26 0" stroke="${C.mereLight}" stroke-width="2" fill="none" opacity="0.7"/></g>`;
  o += `<g class="km-fish"><path d="M1180 800 c10 -10 26 -10 34 0 c-8 10 -24 10 -34 0 Z M1214 800 l10 -8 v16 Z" fill="${C.nGlow}"/><circle cx="1190" cy="798" r="1.8" fill="${C.ink}"/></g>`;
  o += `<path d="M1172 824 a20 5 0 0 0 40 0" stroke="${C.mereLight}" stroke-width="2" fill="none" opacity="0.6"/>`;
  o += `<ellipse cx="1060" cy="${f(shoreY(1060) + 50)}" rx="26" ry="5" fill="none" stroke="${C.mereLight}" stroke-width="2" opacity="0.6"/>`;
  return g('id="km-lake"', o);
}

function shore() {
  // The Lantern Shore: a dock from the crossroads out into the lake, a basket of folded lanterns, a stool with a
  // notebook and pen where questions are written, and one lantern ready to go.
  let o = '';
  o += `<g filter="url(#layer)">`;
  for (let i = 0; i < 3; i += 1) o += `<rect x="${720 + i * 66}" y="680" width="12" height="230" rx="5" fill="${C.clay4}"/><path d="M${722 + i * 66} 700 h8 M${722 + i * 66} 706 h8" stroke="${C.dGlow}" stroke-width="3"/>`;
  o += `<path d="M752 640 H848 L878 790 H722 Z" fill="${C.clay3}"/>`;
  for (let i = 0; i < 9; i += 1) {
    const y0 = 640 + i * 16.6;
    const t0 = i / 9;
    const t1 = (i + 1) / 9;
    const xl0 = 752 - 30 * t0; const xr0 = 848 + 30 * t0; const xl1 = 752 - 30 * t1; const xr1 = 848 + 30 * t1;
    o += `<path d="M${f(xl0)} ${f(y0)} H${f(xr0)} L${f(xr1)} ${f(y0 + 15.6)} H${f(xl1)} Z" fill="${i % 2 ? C.clay2 : '#B97A4C'}"/>`;
    o += `<path d="M${f(xl0 + 10)} ${f(y0 + 6)} q30 3 60 0 M${f(xl0 + 40)} ${f(y0 + 11)} q20 -2 40 0" stroke="${C.clay4}" stroke-width="1.3" fill="none" opacity="0.7"/>`;
    o += `<circle cx="${f(xl0 + 6)}" cy="${f(y0 + 4)}" r="1.4" fill="${C.ink}" opacity="0.5"/><circle cx="${f(xr0 - 6)}" cy="${f(y0 + 4)}" r="1.4" fill="${C.ink}" opacity="0.5"/>`;
  }
  o += `<path d="M722 790 H878 V798 H722 Z" fill="${C.clay4}"/>`;
  o += `</g>`;
  o += `<g filter="url(#layer-sm)">${shadow(760, 712, 22, 3)}<path d="M738 712 h40 l-4 -26 h-32 Z" fill="${C.dGlow}"/><path d="M740 704 h36 M742 694 h32" stroke="${C.nGlowDeep}" stroke-width="2"/>`;
  for (let i = 0; i < 3; i += 1) o += `<path d="M${746 + i * 10} 686 c-2 -10 8 -10 6 0 Z" fill="${C.paper}"/><path d="M${747 + i * 10} 682 h4" stroke="${C.stitch}" stroke-width="1"/>`;
  o += `${shadow(830, 728, 24, 3)}<rect x="808" y="700" width="44" height="7" rx="3.5" fill="${C.clay2}"/><rect x="814" y="705" width="5" height="22" fill="${C.clay4}"/><rect x="841" y="705" width="5" height="22" fill="${C.clay4}"/>`;
  o += `<path d="M812 698 l18 -6 l18 6 l-18 3 Z" fill="${C.paper}"/><path d="M830 692 v9" stroke="${C.stitch}" stroke-width="1.2"/><path d="M816 696 l10 -3 M834 694 l10 3" stroke="${C.stitch}" stroke-width="1"/>`;
  o += `<path d="M852 688 l-14 12" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/><rect x="852" y="690" width="7" height="8" rx="2" fill="${C.ink}"/></g>`;
  o += `<g transform="translate(800 770) scale(0.9)"><g class="km-bob">${lanternBody()}<circle cx="0" cy="-4" r="30" fill="${C.kindle}" opacity="0.15"/></g></g>`;
  // Reeds and cattails in the corners.
  const reeds = (x0, n, h0) => { let s = ''; for (let i = 0; i < n; i += 1) { const x = x0 + i * r(6, 10); const h = h0 + r(-20, 30); s += `<path d="M${f(x)} 900 q${f(r(-6, 6))} ${f(-h / 2)} ${f(r(-10, 10))} ${f(-h)}" stroke="${pick([C.mereDeep, '#12333E', '#245868'])}" stroke-width="${f(r(3, 5))}" stroke-linecap="round" fill="none"/>`; if (rnd() > 0.55) s += `<rect x="${f(x - 3)}" y="${f(900 - h * 0.92)}" width="7" height="22" rx="3.5" fill="${C.clay4}"/>`; } return s; };
  o += `<g class="km-sway">${reeds(0, 12, 130)}</g><g class="km-sway" style="animation-delay:-2s">${reeds(1290, 10, 110)}</g>`;
  return g('id="km-shore"', o);
}

function lanterns() {
  let o = '';
  [[900, 790, 0.86], [1040, 800, 0.8], [1180, 808, 0.74], [1320, 814, 0.68], [1460, 820, 0.62], [1580, 826, 0.56]].forEach(([x, y, s], i) => { o += lantern(x, y, s, f(i * 0.9)); });
  o += `<path d="M860 806 C1060 812 1300 822 1600 832" stroke="${C.mereLight}" stroke-width="2" stroke-dasharray="2 12" stroke-linecap="round" fill="none" opacity="0.5"/>`;
  // The paper boat bringing a book back from Louise, with its wake.
  o += `<g transform="translate(560 790)"><g class="km-bob" style="animation-delay:-1.5s"><path d="M70 30 h30 M76 36 h22" stroke="${C.mereLight}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`;
  o += `<path d="M0 18 H64 C58 30 48 34 32 34 C16 34 6 30 0 18 Z" fill="${C.paper}"/><path d="M0 18 H64 L60 24 H4 Z" fill="${C.creamDeep}"/><path d="M30 -14 V18 H8 Z" fill="${C.creamDeep}"/><path d="M30 -14 V18 H44 Z" fill="${C.paper}"/>`;
  o += `<rect x="34" y="6" width="22" height="12" rx="2" fill="${C.nLand}"/><rect x="34" y="6" width="22" height="3" fill="${C.cream}"/><rect x="38" y="11" width="14" height="2" rx="1" fill="${C.nGlow}"/></g></g>`;
  return g('id="km-lanterns"', o);
}

/* ------------------------------------------------------------------ the keepers */
function avocadoKeeper() {
  // The nutrition keeper (name from lane B), an avocado through and through (owner, 2026-10-07): dark pebbled skin,
  // pale flesh down the front going green at the edge and yellow at the middle, the round pit for a belly, a stem and
  // one leaf on top, two long avocado-leaf ears, a satchel of seed-packet cards on a strap; she holds one card up.
  const skin = '#3E4A14';
  const skinLight = C.nLand;
  const fleshEdge = '#B9CC5A';
  const flesh = '#D7E08A';
  const fleshMid = '#ECEFB2';
  const body = 'M60 18 C82 18 88 38 84 54 C106 66 114 90 106 108 C98 124 22 124 14 108 C6 90 14 66 36 54 C32 38 38 18 60 18 Z';
  const inset = (k, fill) => `<path d="${body}" fill="${fill}" transform="translate(60 76) scale(${k} ${k * 1.02}) translate(-60 -74)"/>`;
  let o = shadow(60, 126, 46, 6);
  o += `<path d="M58 20 C58 10 60 4 63 -4" stroke="${C.bark}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M62 0 C72 -12 90 -12 98 -6 C88 4 74 6 62 0 Z" fill="${C.nLeafLight}"/><path d="M64 -1 C74 -5 86 -7 96 -6 M74 -4 l4 -4 M84 -5 l4 -4" stroke="${C.nLand}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  const leafEar = (d, rib, veins) => `<path d="${d}" fill="${C.nLeaf}"/><path d="${rib}" stroke="${C.nLand}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="${veins}" stroke="${C.nLand}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  o += `<g class="km-ear-l">${leafEar('M42 32 C24 16 22 -10 30 -28 C46 -14 52 10 50 32 Z', 'M46 30 C40 12 36 -6 31 -24', 'M41 12 l-7 -2 M43 20 l-7 0 M38 2 l-6 -3 M36 -8 l-5 -4')}</g>`;
  o += `<g class="km-ear-r">${leafEar('M72 32 C78 8 94 -8 110 -12 C108 10 96 26 80 36 Z', 'M76 32 C86 14 98 0 108 -9', 'M86 20 l2 -8 M93 12 l3 -7 M81 27 l1 -8')}</g>`;
  o += `<path d="${body}" fill="${skin}"/>`;
  o += `<path d="M40 30 C34 44 34 54 30 62 C18 72 12 88 16 104" stroke="${skinLight}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  for (let i = 0; i < 26; i += 1) {
    const a = r(0, Math.PI * 2);
    const y = r(24, 116);
    const half = y < 56 ? 22 : 44;
    const x = 60 + Math.cos(a) * half * r(0.8, 1);
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r(0.9, 1.7))}" fill="#2B340C" opacity="0.7"/>`;
  }
  o += inset(0.84, fleshEdge) + inset(0.76, flesh) + inset(0.56, fleshMid);
  o += `<circle cx="60" cy="92" r="20" fill="${C.clay4}"/><path d="M44 86 C46 76 56 72 64 73" stroke="${C.clay3}" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="52" cy="82" rx="4" ry="2.6" fill="#FFFFFF" opacity="0.55" transform="rotate(-30 52 82)"/>`;
  o += `<path d="M48 104 C54 110 68 110 74 102" stroke="#6E4222" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  o += eyes(50, 70, 50, 6, 7, 1.6, -1.4);
  // An open, happy smile with a little tongue (owner, 2026-10-07: every keeper has a mouth).
  o += `<path d="M52 61 Q60 72 68 61 Q60 64 52 61 Z" fill="#3A2A12"/><path d="M56 66 q4 3 8 0 q-4 -2 -8 0 Z" fill="${C.nGlowDeep}"/>`;
  o += `<ellipse cx="40" cy="62" rx="5.6" ry="3.4" fill="${C.nGlow}" opacity="0.75"/><ellipse cx="80" cy="62" rx="5.6" ry="3.4" fill="${C.nGlow}" opacity="0.75"/>`;
  o += `<path d="M45 42 q5 -4 10 -1 M65 41 q5 -3 10 1" stroke="${C.nLand}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  // The satchel of seed-packet cards on a strap across her.
  o += `<path d="M88 62 C70 80 40 96 20 104" stroke="${C.clay2}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<rect x="4" y="96" width="26" height="20" rx="5" fill="${C.clay3}"/><path d="M4 102 h26" stroke="${C.clay4}" stroke-width="2"/><rect x="4" y="96" width="26" height="9" rx="4" fill="${C.clay2}"/>`;
  o += `<rect x="8" y="88" width="7" height="12" rx="1.5" fill="${C.paper}" stroke="${C.stitch}"/><path d="M11.5 91 c-2 2 -2 5 0 6 c2 -1 2 -4 0 -6 Z" fill="${C.nLeaf}"/>`;
  o += `<rect x="17" y="86" width="7" height="13" rx="1.5" fill="${C.paper}" stroke="${C.stitch}"/><circle cx="20.5" cy="91" r="2" fill="${C.nGlow}"/>`;
  o += `<circle cx="17" cy="110" r="2" fill="${C.nGlow}"/>`;
  // Arms: one at her side, one holding a card up ("Let me find the card").
  o += `<ellipse cx="14" cy="80" rx="8" ry="7" fill="${skin}"/>`;
  o += `<g class="km-card-wave"><ellipse cx="108" cy="72" rx="8" ry="10" fill="${skin}" transform="rotate(-30 108 72)"/>`;
  o += `<g transform="rotate(8 120 52)"><rect x="106" y="34" width="30" height="22" rx="3" fill="${C.paper}"/><path d="M110 40 h20 M110 45 h22 M110 50 h14" stroke="${C.stitch}" stroke-width="1.6" stroke-linecap="round"/><circle cx="131" cy="50" r="2" fill="${C.nGlowDeep}"/></g></g>`;
  o += `<ellipse cx="42" cy="122" rx="10" ry="6" fill="#2B340C"/><ellipse cx="78" cy="122" rx="10" ry="6" fill="#2B340C"/>`;
  return g('id="km-keeper-nutrition" transform="translate(236 452) scale(1.05)" filter="url(#layer-sm)"', o);
}

function coach() {
  // The fitness keeper (name from lane C): three stacked stones, a pebble sash, a white paper star in the seam, no arms.
  let o = shadow(64, 132, 50, 6);
  const speck = (cx, cy, rx, ry, col, n) => { let s = ''; for (let i = 0; i < n; i += 1) { const a = r(0, Math.PI * 2); const k = Math.sqrt(rnd()) * 0.8; s += `<circle cx="${f(cx + Math.cos(a) * rx * k)}" cy="${f(cy + Math.sin(a) * ry * k)}" r="${f(r(0.9, 1.8))}" fill="${col}" opacity="0.55"/>`; } return s; };
  o += `<ellipse cx="44" cy="130" rx="11" ry="6" fill="${C.fDeep}"/><ellipse cx="84" cy="130" rx="11" ry="6" fill="${C.fDeep}"/>`;
  o += `<ellipse cx="64" cy="102" rx="48" ry="30" fill="${C.fLand}"/><path d="M24 92 C34 78 60 72 84 76" stroke="${C.fLight}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M28 116 C44 130 86 130 104 114" stroke="${C.fShade}" stroke-width="6" stroke-linecap="round" fill="none"/>${speck(64, 104, 44, 26, C.fDeeper, 18)}`;
  o += `<ellipse cx="64" cy="62" rx="38" ry="23" fill="${C.fGlow}"/><path d="M34 54 C44 44 70 42 88 46" stroke="#C4D0DA" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M34 72 C48 82 82 82 96 70" stroke="${C.fGlowDeep}" stroke-width="5" stroke-linecap="round" fill="none"/>${speck(64, 62, 34, 20, '#6E808F', 12)}`;
  o += `<path d="M28 52 C46 70 80 74 100 62" stroke="${C.paper}" stroke-width="2" fill="none" opacity="0.7"/>`;
  [[34, 56, C.paper], [45, 63, C.sand], [57, 67, C.moss], [70, 68, C.paper], [82, 66, C.sand], [93, 61, C.moss]].forEach(([x, y, col]) => { o += `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="4.6" fill="${col}"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="1.2" fill="${C.paper}" opacity="0.8"/>`; });
  o += `<ellipse cx="64" cy="24" rx="28" ry="20" fill="${C.fLight}"/><path d="M42 18 C48 8 66 4 78 8" stroke="${C.fPale}" stroke-width="5" stroke-linecap="round" fill="none"/>${speck(64, 28, 24, 14, C.fDeeper, 7)}`;
  o += eyes(54, 74, 22, 5.5, 6.5, 1.8, -1.6);
  o += `<path d="M58 31 Q64 39 70 31 Q64 33 58 31 Z" fill="${C.fDeeper}"/>`;
  o += `<ellipse cx="46" cy="33" rx="5" ry="3" fill="${C.dGlow}" opacity="0.7"/><ellipse cx="82" cy="33" rx="5" ry="3" fill="${C.dGlow}" opacity="0.7"/>`;
  o += `<use href="#star" x="94" y="36" width="15" height="15" class="km-twinkle"/>`;
  return g('id="km-coach" transform="translate(560 452) scale(1.05)" filter="url(#layer-sm)"', o);
}

function herdingBall() {
  // The dog-training keeper (name from lane D): a large herding ball, the kind dogs push and herd, with a moulded handle
  // on top, seams, a highlight, tooth marks and grass stains, a treat pouch clipped to its side, and a stub arm waving
  // the dog on. No whistle (owner, 2026-10-07).
  const ball = C.dTan;
  let o = shadow(58, 114, 54, 7);
  o += `<path d="M36 22 C36 -12 80 -12 80 22" stroke="${C.dLand}" stroke-width="12" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M40 20 C40 -6 76 -6 76 20" stroke="${C.dRusset}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<circle cx="58" cy="64" r="50" fill="${ball}"/>`;
  o += `<path d="M14 84 C26 112 92 116 106 82 C100 104 80 116 58 116 C36 116 18 102 14 84 Z" fill="${C.dRusset}"/>`;
  o += `<path d="M10 62 C26 74 90 74 106 62" stroke="${C.dLand}" stroke-width="3" fill="none" opacity="0.8"/>`;
  o += `<path d="M58 14 C50 40 50 90 58 114" stroke="${C.dLand}" stroke-width="2.4" fill="none" opacity="0.55"/>`;
  o += `<path d="M26 34 C34 22 48 16 60 16" stroke="#C98A5A" stroke-width="9" stroke-linecap="round" fill="none"/>`;
  o += `<ellipse cx="34" cy="34" rx="5" ry="3" fill="${C.paper}" opacity="0.6" transform="rotate(-35 34 34)"/>`;
  o += `<path d="M88 96 l4 -3 M93 92 l4 -3 M84 100 l3 -2" stroke="${C.dLand}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
  o += `<path d="M24 98 c4 2 8 2 12 0 M76 104 c3 1 6 1 9 -1" stroke="${C.dGrassDeep}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`;
  o += eyes(46, 70, 50, 6.4, 7.4, -1.8, 1);
  o += `<path d="M47 62 Q58 78 69 62 Q58 66 47 62 Z" fill="#3A1A08"/><path d="M53 69 q5 4 10 0 q-5 -3 -10 0 Z" fill="#E07A5F"/>`;
  o += `<path d="M40 42 q5 -4 10 -1 M64 41 q5 -3 10 1" stroke="${C.dLand}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  o += `<ellipse cx="36" cy="64" rx="6" ry="3.5" fill="${C.dGlow}" opacity="0.8"/><ellipse cx="80" cy="64" rx="6" ry="3.5" fill="${C.dGlow}" opacity="0.8"/>`;
  // The treat pouch clipped to its side.
  o += `<path d="M92 72 h16 a4 4 0 0 1 4 4 v12 a6 6 0 0 1 -6 6 h-10 a6 6 0 0 1 -6 -6 v-12 a4 4 0 0 1 2 -4 Z" fill="${C.dSky}"/><path d="M90 76 h22 l-4 8 h-14 Z" fill="${C.dPlume}"/><circle cx="101" cy="82" r="2" fill="${C.dLand}"/><path d="M98 72 v-4 h6 v4" stroke="${C.inkSoft}" stroke-width="1.6" fill="none"/>`;
  // Stub arms; one waves the dog on.
  o += `<ellipse cx="110" cy="94" rx="8" ry="7" fill="${ball}"/>`;
  o += `<g class="km-treat"><path d="M12 86 C0 84 -10 76 -14 66" stroke="${ball}" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="-15" cy="62" r="8" fill="${ball}"/><path d="M-28 52 q-4 -6 0 -12 M-34 60 q-6 -4 -6 -10" stroke="${C.paper}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.9"/></g>`;
  return g('id="km-keeper-dog-training" transform="translate(1196 472) scale(1.05)" filter="url(#layer-sm)"', o);
}

function heroDog(x, y) {
  // The meadow's own dog, drawn from the owner's dog: lean and long-legged, white, a ginger head with a white blaze down
  // to a white muzzle, one ear up with its tip folded and one ear down, soft brown eyes, a ginger heart on the back, a
  // curled white tail, a green bandana and a bone-shaped tag. Active in its own state (owner, 2026-10-07): a full gallop
  // across the meadow, ears flying, the tennis ball in its mouth.
  const ginger = '#C97C3D';
  const gingerLight = '#E3A86A';
  const earDark = '#8A5A3A';
  const white = '#FFFFFF';
  const shade = '#E9E4D4';
  let o = `<g transform="translate(${x} ${y})"><g class="km-gallop">`;
  // Speed strips and a puff of dust behind.
  o += `<path d="M-30 26 h22 M-36 36 h26 M-26 46 h16" stroke="${white}" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>`;
  o += `<circle cx="-6" cy="62" r="6" fill="${C.creamDeep}" opacity="0.9"/><circle cx="4" cy="66" r="4" fill="${C.creamDeep}" opacity="0.8"/><circle cx="-14" cy="66" r="3.5" fill="${C.creamDeep}" opacity="0.7"/>`;
  o += `<g filter="url(#layer-sm)">`;
  // Tail up, curled.
  o += `<g class="km-wag"><path d="M18 28 C8 22 4 10 12 4 C18 0 22 8 16 12" stroke="${white}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M18 28 C14 26 11 22 10 18" stroke="${ginger}" stroke-width="8" stroke-linecap="round" fill="none"/></g>`;
  // Hind legs stretched back, front legs reaching forward.
  o += `<path d="M30 40 C20 48 8 52 -2 50" stroke="${shade}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M36 42 C28 54 18 60 6 62" stroke="${white}" stroke-width="9" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M84 40 C96 46 106 46 118 42" stroke="${shade}" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M80 42 C90 52 100 56 114 58" stroke="${white}" stroke-width="9" stroke-linecap="round" fill="none"/>`;
  o += `<ellipse cx="-3" cy="50" rx="5" ry="3.5" fill="${shade}"/><ellipse cx="5" cy="62" rx="6" ry="4" fill="${white}"/><ellipse cx="119" cy="42" rx="5" ry="3.5" fill="${shade}"/><ellipse cx="115" cy="58" rx="6" ry="4" fill="${white}"/>`;
  // The long body with the ginger heart and the hip patch.
  o += `<path d="M18 30 C28 16 78 14 94 24 C102 32 98 44 86 46 C68 50 40 50 24 46 C12 42 10 36 18 30 Z" fill="${white}"/>`;
  o += `<path d="M30 42 C44 46 70 46 86 42" stroke="${shade}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  o += `<path d="M52 22 c-5 -7 -16 -4 -13 5 c2 5 8 9 13 12 c4 -3 11 -7 13 -12 c3 -9 -8 -12 -13 -5 Z" fill="${ginger}"/>`;
  o += `<ellipse cx="24" cy="34" rx="9" ry="8" fill="${ginger}"/>`;
  // The bandana, flying back, with its dots, and the bone-shaped tag.
  o += `<path d="M84 18 C90 24 96 28 100 30 L82 40 C78 32 74 28 68 26 Z" fill="#4E7F3A"/><path d="M84 18 C76 24 70 26 64 24 L68 30 Z" fill="#3B6230"/>`;
  for (const [cx, cy] of [[80, 28], [86, 32], [76, 32], [90, 28]]) o += `<circle cx="${cx}" cy="${cy}" r="1.2" fill="${white}" opacity="0.9"/>`;
  o += `<path d="M86 40 a2 2 0 1 1 2 -2 h4 a2 2 0 1 1 2 2 a2 2 0 1 1 -2 2 h-4 a2 2 0 1 1 -2 -2 Z" fill="#E5B07A"/>`;
  // Head forward, ears flying, the tennis ball in its mouth.
  o += `<g transform="rotate(8 104 14)">`;
  o += `<path d="M96 6 C86 -2 74 -4 66 2 C76 4 86 8 94 12 Z" fill="${earDark}"/>`;
  o += `<path d="M104 2 C100 -10 104 -20 112 -22 C116 -16 114 -8 110 0 Z" fill="${earDark}"/><path d="M112 -22 C116 -24 120 -20 118 -16 C116 -18 114 -20 112 -22 Z" fill="${ginger}"/>`;
  o += `<ellipse cx="106" cy="12" rx="15" ry="14" fill="${ginger}"/>`;
  o += `<path d="M108 -1 C111 -1 112 6 113 12 L110 14 L107 12 C107 6 106 -1 108 -1 Z" fill="${white}"/>`;
  o += `<path d="M106 14 C112 12 122 14 130 16 C134 18 134 24 130 26 C122 28 112 26 106 22 Z" fill="${white}"/>`;
  o += `<ellipse cx="98" cy="16" rx="5" ry="3.4" fill="${gingerLight}" opacity="0.8"/>`;
  o += `<ellipse cx="131" cy="17" rx="3.8" ry="3" fill="#1A2433"/><circle cx="132" cy="16.2" r="1" fill="${white}" opacity="0.8"/>`;
  o += `<ellipse cx="114" cy="8" rx="3.6" ry="4" fill="#5A3A22"/><circle cx="115" cy="7" r="2" fill="#1A2433"/><circle cx="115.8" cy="6.2" r="0.8" fill="${white}"/>`;
  o += `<path d="M110 2 q4 -3 8 0" stroke="${earDark}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  o += `<circle cx="128" cy="27" r="7.5" fill="#D8E04A"/><path d="M122 24 q6 4 12 0 M122 30 q6 -4 12 0" stroke="${white}" stroke-width="1.4" fill="none"/>`;
  o += `</g>`;
  o += `</g></g></g>`;
  return o;
}

function dogs() {
  // The owner's dog, active in its own state: galloping through the shallows of the bay with the tennis ball.
  let o = heroDog(1352, 588);
  const sy = shoreY(1420) + 52;
  o += `<g class="km-bob"><path d="M1340 ${f(sy)} q8 -12 14 -2 M1452 ${f(sy - 4)} q8 -14 16 -2 M1470 ${f(sy - 10)} q4 -8 10 -2" stroke="${C.mereLight}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  for (const [x, y, rr] of [[1336, sy - 14, 3], [1348, sy - 22, 2.4], [1462, sy - 20, 3], [1476, sy - 28, 2.2], [1444, sy - 26, 2]]) o += `<circle cx="${x}" cy="${f(y)}" r="${rr}" fill="${C.paper}"/>`;
  o += `<ellipse cx="1410" cy="${f(sy + 4)}" rx="80" ry="7" fill="none" stroke="${C.mereLight}" stroke-width="2.5" opacity="0.7"/></g>`;
  return g('id="km-dogs"', o);
}

/* ------------------------------------------------------------------ the whole scene */
function build(view) {
  const style = `
  .km-bob { animation: km-bob 3.6s ease-in-out infinite alternate; }
  .km-drift { animation: km-drift 40s ease-in-out infinite alternate; }
  .km-turn { animation: km-turn 90s linear infinite; }
  .km-twinkle { animation: km-twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .km-fall { animation: km-fall 1.4s linear infinite; }
  .km-light { animation: km-light 7s linear infinite; }
  .km-steam { animation: km-steam 3s ease-in-out infinite; }
  .km-flag { animation: km-flag 2.4s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: left center; }
  .km-wag { animation: km-wag 0.6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: left bottom; }
  .km-leap { animation: km-leap 2.4s ease-in-out infinite alternate; }
  .km-trot { animation: km-trot 0.5s ease-in-out infinite alternate; }
  .km-gallop { animation: km-gallop 0.45s ease-in-out infinite alternate; }
  .km-sway { animation: km-sway 6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: bottom; }
  .km-buzz { animation: km-buzz 1.6s ease-in-out infinite alternate; }
  .km-fish { animation: km-fish 7s ease-in-out infinite; }
  .km-ear-l, .km-ear-r { transform-box: fill-box; transform-origin: bottom center; animation: km-ear 4s ease-in-out infinite; }
  .km-ear-r { animation-delay: -0.4s; }
  .km-treat, .km-card-wave { animation: km-lift 2.6s ease-in-out infinite alternate; }
  @keyframes km-bob { from { transform: translateY(0); } to { transform: translateY(-4px); } }
  @keyframes km-trot { from { transform: translateY(0); } to { transform: translateY(-2px); } }
  @keyframes km-gallop { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-5px) rotate(-2deg); } }
  @keyframes km-drift { from { transform: translateX(0); } to { transform: translateX(36px); } }
  @keyframes km-turn { to { transform: rotate(360deg); } }
  @keyframes km-twinkle { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.8); } }
  @keyframes km-fall { to { stroke-dashoffset: -40; } }
  @keyframes km-light { to { stroke-dashoffset: -280; } }
  @keyframes km-steam { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-10px); } }
  @keyframes km-flag { from { transform: skewY(0deg); } to { transform: skewY(6deg); } }
  @keyframes km-wag { from { transform: rotate(-10deg); } to { transform: rotate(14deg); } }
  @keyframes km-leap { from { transform: translateY(4px); } to { transform: translateY(-10px); } }
  @keyframes km-sway { from { transform: rotate(-1.5deg); } to { transform: rotate(1.5deg); } }
  @keyframes km-buzz { from { transform: translate(0, 0); } to { transform: translate(4px, -3px); } }
  @keyframes km-fish { 0%, 70%, 100% { transform: translateY(30px); opacity: 0; } 78% { opacity: 1; } 85% { transform: translateY(-8px); opacity: 1; } 92% { transform: translateY(20px); opacity: 0; } }
  @keyframes km-ear { 0%, 80%, 100% { transform: rotate(0deg); } 88% { transform: rotate(-6deg); } 94% { transform: rotate(3deg); } }
  @keyframes km-lift { from { transform: translateY(0); } to { transform: translateY(-3px); } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`;

  const defs = `<defs>
    <filter id="layer" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="5" stdDeviation="0" flood-color="${C.ink}" flood-opacity="0.18"/></filter>
    <filter id="layer-sm" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="0" flood-color="${C.ink}" flood-opacity="0.2"/></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.14  0 0 0 0 0.2  0 0 0 0.55 -0.12"/></filter>
    <mask id="km-ripples"><rect y="668" width="1600" height="232" fill="#fff"/>${Array.from({ length: 16 }, (_, i) => `<rect y="${680 + i * 9}" width="1600" height="${3 + (i % 3)}" fill="#000"/>`).join('')}</mask>
    <symbol id="star" viewBox="-10 -10 20 20"><path d="M0 -10 C1.2 -2.5 2.5 -1.2 10 0 C2.5 1.2 1.2 2.5 0 10 C-1.2 2.5 -2.5 1.2 -10 0 C-2.5 -1.2 -1.2 -2.5 0 -10 Z" fill="#FFFFFF"/></symbol>
  </defs>`;

  const desc = 'Kindlemere: three places on one land beside a still teal lake, each at its own hour of the day, joined by stitched paths that meet at a signpost. ' +
    'On the left, the Orchard: a foresty picnic meadow on a terraced hill at mid-morning, with a wood of round trees, poplars and pines behind it, stone walls, avocado trees heavy with avocados, a straw beehive with bees, ' +
    'a larder door dug into the hill with jars beside it, a ladder and a basket of avocados, a vegetable patch, a herb spiral, a watering can, and a long picnic table with a gingham cloth, avocado toast, avocado halves, blueberries, honey and an apricot kettle. ' +
    'There the nutrition keeper, an avocado through and through, with pale flesh down her front, the round pit for a belly, avocado-leaf ears and a satchel of seed-packet cards, holds up a card. ' +
    'In the centre, Stepping Hill at high noon: one big grassy hill with granite outcrops and pines, stone steps up its face, a switchback trail with little stacked stones and flags, a quiet pool on its shoulder with a lotus, a mat and a bell, ' +
    'a spring running down to the lake, and a lookout on the top with a flag and a spyglass pointed at the horizon. At its foot stands the fitness keeper, three stacked river stones in granite greys with a pebble sash and a paper star, beside a stone kettlebell, a water flask and a towel. ' +
    'On the right, Lakeside Field in the late afternoon: open grass running down to a bay of the lake, a split-rail fence, a kennel, weave poles, a willow hoop, and flags with paw prints. ' +
    'There the dog keeper, a large herding ball with a handle on top, tooth marks and a treat pouch, waves on a lean white dog with a ginger head, a white blaze, one ear up and a green bandana, who gallops through the shallows of the bay with a tennis ball in its mouth while a paper duck looks on. ' +
    'The front of the land is cut like a slice of earth, with roots and stones. From the signpost a dock runs out into the lake: a basket of folded lanterns, a stool with a notebook and pen, a lantern ready to go. ' +
    'Orange paper lanterns drift away across the water toward Louise, the librarian, past the right edge, and a paper boat brings a book back.';

  const body = sky() + far() + forest() + hill() + orchard() + field() + bank() + paths() + signpost() + lake() + shore() + lanterns() +
    avocadoKeeper() + coach() + dogs() + herdingBall() +
    `<rect id="km-grain" width="1600" height="900" filter="url(#grain)" opacity="0.32" style="mix-blend-mode:multiply" pointer-events="none"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.box}" role="img" aria-labelledby="km-title km-desc">
<title id="km-title">${view.title}</title>
<desc id="km-desc">${desc}</desc>
<!-- Drawn by kit/art/make-kindlemere.js. Edit that file, not this one. Parts: km-sky, km-far, km-forest, km-hill, km-orchard,
     km-field, km-bank, km-paths, km-signpost, km-lake, km-shore, km-lanterns, km-keeper-nutrition, km-coach, km-dogs,
     km-keeper-dog-training, km-grain. -->
<style>${style}
</style>
${defs}
${body}
</svg>
`;
}

/*
 * One world, four cameras. The close views are the realm's art direction (owner, 2026-10-07, on the Orchard close-up:
 * "this one"): the keeper big in the frame, every detail readable. The wide view is the map of the whole realm.
 * Every close view is 420 x 236 world units (16:9), framed on its keeper.
 */
const VIEWS = [
  { file: 'kindlemere.svg', box: '0 0 1600 900', title: 'Kindlemere' },
  { file: 'kindlemere-orchard.svg', box: '180 400 420 236', title: 'Kindlemere: the Orchard' },
  { file: 'kindlemere-hill.svg', box: '470 392 420 236', title: 'Kindlemere: Stepping Hill' },
  { file: 'kindlemere-field.svg', box: '1140 438 420 236', title: 'Kindlemere: Lakeside Field' },
];
for (const view of VIEWS) {
  seed = 20261007; // the same random detail in every view
  const out = path.join(__dirname, view.file);
  fs.writeFileSync(out, build(view), 'utf8');
  process.stdout.write(`Drew ${path.relative(process.cwd(), out)} (${Math.round(fs.statSync(out).size / 1024)} KB)\n`);
}
