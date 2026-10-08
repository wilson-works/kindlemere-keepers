'use strict';

/**
 * agents/fitness/make-art.js: draws Steady, keeper of Stepping Hill, in the realm's one art style (the
 * Orchard close-up the owner picked: flat cut paper in layers, paper grain, big readable faces), in four moods.
 * Each mood changes the face (brows, eyes, mouth) and the pose, not only a caption.
 *
 *   node agents/fitness/make-art.js     writes art/steady-<mood>.svg, art.svg (happy) and mark.svg
 *
 * Node built-ins only. Colours are the fitness park slot (kit/design/tokens.css) plus the shared ink.
 */

const fs = require('fs');
const path = require('path');

const C = {
  ink: '#1A2433', inkSoft: '#4A5568', paper: '#FFFFFF',
  base: '#4B5D6E', baseShade: '#3A4856', baseLight: '#6E8294', baseSpeck: '#2F3B47',
  mid: '#A9B8C4', midShade: '#8A9BA9', midLight: '#C9D4DD', midSpeck: '#7C8D9B',
  top: '#7E909F', topShade: '#687A89', topLight: '#A3B3C0', topSpeck: '#5C6E7D',
  brow: '#3A4856', cheek: '#D8A58C', tongue: '#D98C7A',
  sand: '#D8C7A6', moss: '#7E9B6A', strap: '#E6EBEF', stitch: '#7E909F',
  grass: '#5E8E4A', grassDeep: '#4A7A3A', grassLight: '#79A85E',
  soil: '#8A5A3C', soilDeep: '#6E4630', root: '#C9A27E',
  granite: '#8E9DA9', graniteShade: '#6F7F8C', graniteLight: '#B3BFC8',
  water: '#3E8094', waterLight: '#CFE6EA', petal: '#FFFFFF', petal2: '#F2C46B', bud: '#E3B341',
  flag: '#6E8F5A', pole: '#8A6A4E', shadow: 'rgba(26,36,51,0.16)', contact: 'rgba(26,36,51,0.30)', sweat: '#9CCDE0',
};

const f = (n) => Number(n.toFixed(1));
const grainFilter = '<filter id="grain" x="0" y="0" width="100%" height="100%">'
  + '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>'
  + '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.14  0 0 0 0 0.2  0 0 0 0.16 0" result="s"/>'
  + '<feComposite in="s" in2="SourceGraphic" operator="in" result="g"/>'
  + '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="g"/></feMerge></filter>';

// Seeded speckles so every mood carries the same stone texture.
function specks(cx, cy, rx, ry, col, n, seed) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let o = '';
  for (let i = 0; i < n; i += 1) {
    const a = rnd() * Math.PI * 2; const k = Math.sqrt(rnd()) * 0.82;
    o += `<circle cx="${f(cx + Math.cos(a) * rx * k)}" cy="${f(cy + Math.sin(a) * ry * k)}" r="${f(1 + rnd() * 1.6)}" fill="${col}" opacity="0.6"/>`;
  }
  return o;
}

function ground() {
  let o = '';
  // the soil bank, roots and buried pebbles
  o += `<path d="M0 300 Q80 292 160 296 Q240 300 320 294 L320 340 L0 340 Z" fill="${C.soil}"/>`;
  o += `<path d="M0 318 Q90 312 170 316 Q250 320 320 314 L320 340 L0 340 Z" fill="${C.soilDeep}"/>`;
  o += `<g stroke="${C.root}" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M30 304 q6 10 -2 20 M34 314 q8 2 12 10"/><path d="M226 306 q-4 12 4 22 M228 318 q-8 4 -10 12"/><path d="M290 304 q6 8 2 18"/></g>`;
  o += `<g fill="#A9B1C2"><ellipse cx="96" cy="326" rx="6" ry="3.5"/><ellipse cx="186" cy="330" rx="5" ry="3"/><ellipse cx="270" cy="328" rx="4" ry="2.6"/></g>`;
  // the grass of Stepping Hill, running off both edges
  o += `<path d="M0 280 Q80 272 160 276 Q240 280 320 272 L320 304 Q240 308 160 304 Q80 300 0 308 Z" fill="${C.grass}"/>`;
  o += `<path d="M0 296 Q80 290 160 294 Q240 298 320 292 L320 304 Q240 308 160 304 Q80 300 0 308 Z" fill="${C.grassDeep}"/>`;
  let blades = '';
  [[18, 286], [52, 292], [104, 282], [140, 298], [214, 286], [252, 296], [300, 284]].forEach(([x, y]) => { blades += `<path d="M${x} ${y} l3 -10 l3 10 z M${x + 7} ${y + 1} l2 -7 l2 7 z"/>`; });
  o += `<g fill="${C.grassDeep}">${blades}</g>`;
  // little park flowers
  const flower = (x, y, p) => `<g><circle cx="${x - 3}" cy="${y}" r="3" fill="${p}"/><circle cx="${x + 3}" cy="${y}" r="3" fill="${p}"/><circle cx="${x}" cy="${y - 3}" r="3" fill="${p}"/><circle cx="${x}" cy="${y + 3}" r="3" fill="${p}"/><circle cx="${x}" cy="${y}" r="2" fill="${C.bud}"/></g>`;
  o += flower(36, 294, C.petal) + flower(122, 300, C.petal2) + flower(236, 298, C.petal) + flower(286, 290, C.petal2);
  return o;
}

function outcrop() {
  // a granite outcrop of the hill behind Steady's right side, with moss and the trail flag
  let o = '';
  o += `<path d="M206 284 Q212 236 246 226 Q282 220 300 244 Q314 266 306 284 Z" fill="${C.shadow}" transform="translate(0 4)"/>`;
  o += `<path d="M206 284 Q212 236 246 226 Q282 220 300 244 Q314 266 306 284 Z" fill="${C.granite}"/>`;
  o += `<path d="M216 262 Q232 240 258 236" stroke="${C.graniteLight}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  o += `<path d="M250 284 L262 256 L286 252 L300 270 L306 284 Z" fill="${C.graniteShade}"/>`;
  o += `<path d="M232 230 q10 -8 22 -6 q-4 6 -22 6 z" fill="${C.moss}"/><path d="M286 240 q8 -4 14 2 q-8 2 -14 -2 z" fill="${C.moss}"/>`;
  o += `<rect x="270" y="176" width="4" height="58" rx="2" fill="${C.pole}"/>`;
  o += `<path d="M274 180 L300 188 L274 198 Z" fill="${C.shadow}" transform="translate(0 3)"/><path d="M274 180 L300 188 L274 198 Z" fill="${C.flag}"/><circle cx="282" cy="189" r="2.4" fill="${C.paper}"/>`;
  return o;
}

function pool() {
  return `<path d="M14 292 Q12 278 38 276 L84 276 Q100 278 98 290 Q92 302 58 302 Q18 302 14 292 Z" fill="${C.granite}"/>`
    + `<path d="M20 290 Q22 282 42 281 L82 281 Q92 283 90 290 Q84 297 58 297 Q26 297 20 290 Z" fill="${C.water}"/>`
    + `<path d="M32 288 q8 -3 16 0 M58 291 q8 -3 16 0" stroke="${C.waterLight}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
}

// One face: brows, eyes (white, pupil, highlight), cheeks, mouth. cx/cy is the top stone's centre.
function face(m) {
  const ex = [-17, 17];
  let o = '';
  // cheeks
  o += `<ellipse cx="-27" cy="12" rx="8" ry="5" fill="${C.cheek}" opacity="0.9"/><ellipse cx="27" cy="12" rx="8" ry="5" fill="${C.cheek}" opacity="0.9"/>`;
  // eyes
  ex.forEach((x, i) => {
    const w = m.eyeW; const h = m.eyeH;
    if (m.eyes === 'crescent') {
      o += `<path d="M${x - 9} 2 q9 -11 18 0" stroke="${C.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      return;
    }
    o += `<ellipse cx="${x}" cy="0" rx="${w}" ry="${h}" fill="${C.paper}"/>`;
    o += `<circle cx="${f(x + m.look[0])}" cy="${f(m.look[1])}" r="${m.pupil}" fill="${C.ink}"/>`;
    o += `<circle cx="${f(x + m.look[0] + 2)}" cy="${f(m.look[1] - 2.4)}" r="${f(m.pupil * 0.38)}" fill="${C.paper}"/>`;
    // brows
    const b = m.brows[i];
    o += `<path d="${b}" stroke="${C.brow}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  });
  o += m.mouth;
  return o;
}

const MOODS = {
  happy: {
    title: 'happy', say: 'smiling, eyes bright, standing tall',
    lean: 0, hop: 0, tilt: -6, feetApart: 0,
    eyes: 'open', eyeW: 9, eyeH: 11, pupil: 5, look: [1, 1],
    brows: ['M-25 -16 q8 -6 16 -1', 'M9 -17 q8 -5 16 1'],
    mouth: `<path d="M-16 11 Q0 33 16 11 Q0 16 -16 11 Z" fill="${C.ink}"/><path d="M-8 22 Q0 29 8 22 Q0 19 -8 22 Z" fill="${C.tongue}"/>`,
    extra: '',
  },
  thinking: {
    title: 'thinking', say: 'head tilted, eyes up, a small hmm, little pebbles of thought',
    lean: 0, hop: 0, tilt: 9, feetApart: 0,
    eyes: 'open', eyeW: 9, eyeH: 11, pupil: 4.6, look: [3, -4],
    brows: ['M-25 -14 q8 -2 16 0', 'M9 -20 q8 -6 16 0'],
    mouth: `<path d="M-6 16 q6 -3 12 1" stroke="${C.ink}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
    extra: `<g fill="${C.midLight}"><circle cx="214" cy="66" r="5"/><circle cx="228" cy="52" r="7"/><circle cx="248" cy="36" r="10"/></g>`,
  },
  oh: {
    title: 'surprised', say: 'a little hop, eyes wide, mouth round in an oh',
    lean: 0, hop: -10, tilt: 0, feetApart: 8,
    eyes: 'open', eyeW: 10.5, eyeH: 13, pupil: 4, look: [0, 0],
    brows: ['M-26 -20 q8 -7 16 -2', 'M10 -22 q8 -5 16 2'],
    mouth: `<ellipse cx="0" cy="18" rx="6" ry="7.5" fill="${C.ink}"/><ellipse cx="0" cy="21" rx="3.4" ry="3" fill="${C.tongue}"/>`,
    extra: `<g stroke="${C.midShade}" stroke-width="3" stroke-linecap="round" fill="none"><path d="M118 300 q-8 4 -14 2"/><path d="M202 300 q8 4 14 2"/></g>`,
  },
  worried: {
    title: 'worried', say: 'leaning back, brows tipped up, a wobbly mouth, a bead of sweat',
    lean: -4, hop: 0, tilt: -3, feetApart: 0,
    eyes: 'open', eyeW: 9, eyeH: 11.5, pupil: 4.6, look: [-1, 2],
    brows: ['M-25 -12 q9 -2 15 -9', 'M10 -21 q6 7 15 9'],
    mouth: `<path d="M-9 18 q3 -4 6 0 q3 4 6 0 q3 -4 6 0" stroke="${C.ink}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
    extra: `<path d="M214 78 q6 9 0 13 q-6 -4 0 -13 z" fill="${C.sweat}"/>`,
  },
};

function steady(m) {
  let o = '';
  // feet and their contact shadows (the shadows stay on the ground when Steady hops)
  const fa = m.feetApart;
  o += `<ellipse cx="${124 - fa}" cy="292" rx="30" ry="6" fill="${C.contact}" opacity="${m.hop ? 0.55 : 1}"/><ellipse cx="${196 + fa}" cy="292" rx="30" ry="6" fill="${C.contact}" opacity="${m.hop ? 0.55 : 1}"/>`;
  let body = '';
  body += `<ellipse cx="${124 - fa}" cy="286" rx="25" ry="11" fill="${C.ink}"/><ellipse cx="${196 + fa}" cy="286" rx="25" ry="11" fill="${C.ink}"/>`;
  body += `<path d="M${112 - fa} 290 v-5 M${122 - fa} 292 v-6 M${132 - fa} 291 v-5 M${184 + fa} 291 v-5 M${194 + fa} 292 v-6 M${204 + fa} 290 v-5" stroke="${C.inkSoft}" stroke-width="2.4" stroke-linecap="round"/>`;
  // base stone
  body += `<ellipse cx="160" cy="236" rx="96" ry="54" fill="${C.shadow}" transform="translate(0 5)"/>`;
  body += `<ellipse cx="160" cy="236" rx="96" ry="54" fill="${C.base}"/>`;
  body += `<path d="M70 248 Q160 296 252 244 Q246 278 160 290 Q76 280 70 248 Z" fill="${C.baseShade}"/>`;
  body += `<path d="M86 214 Q110 190 152 186" stroke="${C.baseLight}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  body += `<g stroke="${C.midLight}" stroke-width="3.2" stroke-linecap="round"><path d="M188 212 l-2 18"/><path d="M196 212 l-2 18"/><path d="M204 212 l-2 18"/><path d="M212 212 l-2 18"/><path d="M182 226 l36 -10"/></g>`;
  body += specks(160, 240, 88, 46, C.baseSpeck, 22, 3);
  body += `<path d="M86 262 q6 -6 12 -2 q6 -6 12 0 q-2 8 -12 8 q-10 2 -12 -6 z" fill="${C.moss}"/>`;
  // middle stone
  body += `<ellipse cx="160" cy="156" rx="70" ry="40" fill="${C.shadow}" transform="translate(0 5)"/>`;
  body += `<ellipse cx="160" cy="156" rx="70" ry="40" fill="${C.mid}"/>`;
  body += `<path d="M94 166 Q160 206 228 164 Q220 192 160 196 Q100 192 94 166 Z" fill="${C.midShade}"/>`;
  body += `<path d="M108 136 Q130 122 162 120" stroke="${C.midLight}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  body += specks(160, 156, 62, 32, C.midSpeck, 14, 7);
  // the pebble sash, stitched with the realm's dotted thread
  body += `<path d="M92 146 Q160 192 230 144 L232 160 Q160 210 92 162 Z" fill="${C.shadow}" transform="translate(0 3)"/>`;
  body += `<path d="M92 146 Q160 192 230 144 L232 160 Q160 210 92 162 Z" fill="${C.strap}"/>`;
  body += `<path d="M96 154 Q160 198 228 152" fill="none" stroke="${C.stitch}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>`;
  [[106, 162, C.paper], [124, 174, C.sand], [143, 181, C.moss], [162, 183, C.paper], [181, 180, C.sand], [199, 173, C.moss], [216, 162, C.paper]]
    .forEach(([x, y, col]) => { body += `<ellipse cx="${x}" cy="${y + 3}" rx="8" ry="6.5" fill="${C.shadow}"/><ellipse cx="${x}" cy="${y}" rx="8" ry="6.5" fill="${col}"/>`; });
  body += `<path d="M92 148 q-14 6 -18 26 q10 -4 14 -12 q2 12 10 18 q-2 -16 2 -26 z" fill="${C.strap}"/><ellipse cx="94" cy="154" rx="7" ry="8" fill="${C.paper}"/>`;
  // a buttercup tucked into the sash
  body += `<path d="M228 156 q16 -16 22 -36" stroke="${C.grassDeep}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  body += `<g fill="${C.petal2}"><circle cx="252" cy="104" r="6.5"/><circle cx="263" cy="111" r="6.5"/><circle cx="260" cy="123" r="6.5"/><circle cx="247" cy="124" r="6.5"/><circle cx="243" cy="112" r="6.5"/></g><circle cx="253" cy="115" r="4.5" fill="${C.bud}"/>`;
  // the white paper star in the seam
  body += `<path d="M204 120 l4.5 9.5 9.5 4.5 -9.5 4.5 -4.5 9.5 -4.5 -9.5 -9.5 -4.5 9.5 -4.5z" fill="${C.paper}"/>`;
  // top stone and face
  let head = '';
  head += `<ellipse cx="0" cy="0" rx="50" ry="36" fill="${C.shadow}" transform="translate(0 5)"/>`;
  head += `<ellipse cx="0" cy="0" rx="50" ry="36" fill="${C.top}"/>`;
  head += `<path d="M-46 8 Q0 44 46 6 Q40 32 0 36 Q-40 32 -46 8 Z" fill="${C.topShade}"/>`;
  head += `<path d="M-36 -18 Q-20 -32 6 -34" stroke="${C.topLight}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  head += specks(0, 4, 42, 26, C.topSpeck, 8, 5);
  head += face(m);
  head += `<ellipse cx="8" cy="-36" rx="12" ry="8" fill="${C.shadow}" transform="translate(0 3)"/><ellipse cx="8" cy="-36" rx="12" ry="8" fill="${C.sand}"/>`;
  body += `<g transform="translate(160 90) rotate(${m.tilt})">${head}</g>`;
  o += `<g transform="translate(0 ${m.hop}) rotate(${m.lean} 160 290)">${body}</g>`;
  o += m.extra;
  return o;
}

function svg(m, opts) {
  const o = opts || {};
  const title = o.title || `Steady, keeper of Stepping Hill (${m.title})`;
  const desc = `An invented creature of cut paper on the grass of Stepping Hill: three stacked round stones, granite slate, `
    + `river stone and grey, with paper grain and speckles; big eyes with highlights, brows, cheeks and a mouth; a sash `
    + `of white, sand and moss pebbles with a buttercup; a small white paper star. Here: ${m.say}. Beside: a granite `
    + `outcrop with moss and a trail flag, the edge of a small pool, park flowers, and a cut bank of soil and roots.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 20 320 320" width="320" height="320" role="img" aria-labelledby="t d">\n`
    + `<title id="t">${title}</title>\n<desc id="d">${desc}</desc>\n`
    + `<defs>${grainFilter}</defs>\n`
    + `<g filter="url(#grain)">${ground()}${pool()}${outcrop()}${steady(m)}</g>\n</svg>\n`;
}

function mark() {
  // The mark: Steady's happy face and stones at icon size, on a round of grass.
  const m = MOODS.happy;
  const head = `<ellipse cx="0" cy="0" rx="50" ry="36" fill="${C.top}"/><path d="M-46 8 Q0 44 46 6 Q40 32 0 36 Q-40 32 -46 8 Z" fill="${C.topShade}"/>${face(m)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-labelledby="t">\n`
    + `<title id="t">Steady's mark: three stacked granite paper stones with a happy face and a pebble sash</title>\n`
    + `<ellipse cx="32" cy="58" rx="24" ry="4" fill="${C.contact}"/>`
    + `<ellipse cx="32" cy="47" rx="22" ry="11" fill="${C.base}"/><path d="M11 49 Q32 62 53 48 Q50 57 32 58 Q14 57 11 49 Z" fill="${C.baseShade}"/>`
    + `<ellipse cx="32" cy="32" rx="15.5" ry="8.5" fill="${C.mid}"/><path d="M17 31.5 Q32 41.5 47 31 L47.5 34.5 Q32 45.5 17 35 Z" fill="${C.strap}"/>`
    + `<circle cx="21.5" cy="35" r="2" fill="${C.paper}"/><circle cx="26.5" cy="37.8" r="2.1" fill="${C.sand}"/><circle cx="32" cy="38.8" r="2.1" fill="${C.moss}"/><circle cx="37.5" cy="37.8" r="2.1" fill="${C.sand}"/><circle cx="42.5" cy="35" r="2" fill="${C.paper}"/>`
    + `<path d="M45 22.5 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2z" fill="${C.paper}"/>`
    + `<g transform="translate(32 17) scale(0.3)">${head}</g>\n</svg>\n`;
}

const here = path.join(__dirname, "art");
const out = [];
for (const [key, m] of Object.entries(MOODS)) {
  const file = path.join(here, `steady-${key}.svg`);
  fs.writeFileSync(file, svg(m), 'utf8');
  out.push(path.relative(path.join(here, '..'), file));
}
fs.writeFileSync(path.join(here, '..', 'art.svg'), svg(MOODS.happy, { title: 'Steady, keeper of Stepping Hill' }), 'utf8');
fs.writeFileSync(path.join(here, '..', 'mark.svg'), mark(), 'utf8');
process.stdout.write(`Wrote ${out.join(', ')}, art.svg and mark.svg.\n`);
