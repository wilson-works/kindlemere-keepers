'use strict';

/**
 * agents/dog-training/art/sidekicks.js: Tumble's two sidekicks, drawn for the kit's scene builder
 * (kit/art/make-kindlemere.js), handed over the way lane D's dog is (kit/art/parts/field-dog.svg).
 *
 * Owner, 2026-10-08 00:4x CDT: "Both Stick and Bacon need to be taller than tumble, matching scale with Avo and
 * Steady. And both need enhancements to match the same standard being set by Avos team".
 * So both stand about 164 units from feet to top (Avo 158, Steady 134, Tumble 126) and carry what Avo's team carries:
 * a shade side and a highlight, texture, a thing for their job held up by day and set down at night, and faces the
 * size of Spud's.
 *
 * Use, in make-kindlemere.js: const SK = require('./parts/dog-sidekicks.js')({ C, f, faces });
 * then make: SK.barkley and make: SK.sizzle. Each returns { body, cx, feet, head, w, top } in its own units with the
 * feet at (cx, feet), like every keeper. No randomness, so the seeded scene around them draws the same.
 */
module.exports = function dogSidekicks({ C, f, faces }) {
  const leaf = (x, y, rot, col) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 C2 -4 5 -4 6 -5 C8 -7 10 -6 11 -7 C13 -9 16 -8 18 -6 C15 -2 12 0 9 0 C6 1 3 1 0 0 Z" fill="${col}"/><path d="M1 -0.6 C6 -2.4 11 -3.6 16 -5.4" stroke="${C.nLand}" stroke-width="0.9" fill="none" stroke-linecap="round"/></g>`;
  const acorn = (x, y) => `<path d="M${x} ${y - 3} v-3" stroke="#5E4028" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="${x}" cy="${y + 3.6}" rx="3.4" ry="4.2" fill="#C98A5A"/><ellipse cx="${x - 1.2}" cy="${y + 3}" rx="0.9" ry="1.6" fill="#F0C89A"/><path d="M${x - 4.4} ${y + 0.6} a4.4 3.6 0 0 1 8.8 0 Z" fill="#6B4A2A"/><path d="M${x - 3} ${y - 0.6} h6" stroke="#8A6A44" stroke-width="0.8"/>`;
  const bone = (x, y, rot, col) => `<g transform="translate(${x} ${y}) rotate(${rot})" fill="${col}"><rect x="-5" y="-1.6" width="10" height="3.2"/><circle cx="-5" cy="-1.6" r="2"/><circle cx="-5" cy="1.6" r="2"/><circle cx="5" cy="-1.6" r="2"/><circle cx="5" cy="1.6" r="2"/></g>`;
  const paw = (x, y, col) => `<g fill="${col}"><ellipse cx="${x}" cy="${y + 1.2}" rx="2.2" ry="1.8"/><circle cx="${x - 2.4}" cy="${y - 1.4}" r="0.9"/><circle cx="${x}" cy="${y - 2.4}" r="0.9"/><circle cx="${x + 2.4}" cy="${y - 1.4}" r="0.9"/></g>`;

  function barkley(mood) {
    // Barkley, for outdoor play and dogs in the woods: a big stick off a tree standing on end. Snapped at the top, so
    // the pale wood splinters up like a tuft; grooved bark with a shade side and a highlight, two knots, moss on one
    // shoulder, a side twig in leaf with an acorn, root feet. A dog's long line is slung across him and coiled at his
    // hip, and by day he holds up a trail map.
    const bark = '#7E5A3A';
    const dark = '#5E4028';
    const deep = '#46301E';
    const light = '#A27A52';
    const wood = '#EBD2A4';
    const ring = '#C49A62';
    const rope = '#E86A35';
    const ropeDeep = '#B8481C';
    let o = `<path d="M53 40 C62 34 68 26 71 16" stroke="${dark}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    o += `<g class="km-sway">${leaf(70, 16, -70, C.nLeafLight)}${leaf(71, 17, -20, C.dPlume)}${leaf(69, 18, -125, C.nLeaf)}${acorn(77, 25)}</g>`;
    // The stick itself, drawn narrow and widened a little so his face has room (the face and arms are not widened).
    o += `<g transform="translate(40 0) scale(1.14 1) translate(-40 0)">`;
    o += `<path d="M22 160 C20 132 20 102 22 78 C23 56 25 32 26 17 L28 7 L31 13 L34 3 L37 11 L41 1 L44 10 L48 4 L50 12 L53 16 C54 32 56 56 57 78 C59 102 60 132 58 160 Z" fill="${bark}"/>`;
    // The snapped end: pale wood in the splinters, the grain running down into them, the bark rim below.
    o += `<path d="M26 17 L28 7 L31 13 L34 3 L37 11 L41 1 L44 10 L48 4 L50 12 L53 16 C45 20 34 20 26 17 Z" fill="${wood}"/>`;
    o += `<path d="M31 13 l1 5 M34 3 l0.6 6 M37 11 l0 7 M41 1 l-0.4 6 M44 10 l-0.6 8 M48 4 l-0.6 6 M50 12 l-0.6 6" stroke="${ring}" stroke-width="1.1" stroke-linecap="round"/>`;
    o += `<path d="M26 17 C34 21 45 21 53 16" stroke="${dark}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    // The shade side and the highlight.
    o += `<path d="M47 20 C50 42 52 72 52 102 C52 128 52 146 51 160 L58 160 C60 132 59 102 57 78 C56 56 54 32 53 16 Z" fill="${dark}"/>`;
    o += `<path d="M27.5 28 C26.5 58 25.5 100 26.5 146" stroke="${light}" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0.85"/>`;
    // Grooved bark and two knots (clear of the face).
    o += `<path d="M33 86 q-2 9 0 18 q2 8 0 16 M43 92 q2 10 0 20 M37 124 q-2 10 0 22 M47 128 q1.6 8 0 16 M30 134 q-1 7 0 14 M54 104 q1.2 10 0 18 M30 24 q-1 4 0 8" stroke="${deep}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
    o += `<path d="M28 112 h5 M45 118 h5 M35 150 h4" stroke="${deep}" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>`;
    o += `<ellipse cx="40" cy="138" rx="4.2" ry="3.2" fill="${deep}"/><ellipse cx="40" cy="137.4" rx="2.4" ry="1.6" fill="${light}"/><ellipse cx="40" cy="137.6" rx="1" ry="0.7" fill="${deep}"/>`;
    o += `<ellipse cx="31" cy="98" rx="2.4" ry="3.4" fill="${deep}"/><ellipse cx="31.3" cy="97.4" rx="1.1" ry="1.7" fill="#2E1E12"/>`;
    // Moss over his left shoulder, and a broken twig stub on his right.
    o += `<path d="M24 36 C22 29 27 23 32 25 C35 21 41 23 40 28 C43 30 41 35 36 35 C33 38 26 39 24 36 Z" fill="${C.moss}"/>`;
    o += `<g fill="#B3C76A"><circle cx="28" cy="30" r="1.3"/><circle cx="33" cy="28" r="1"/><circle cx="36" cy="32" r="1.2"/><circle cx="30" cy="34" r="0.9"/></g>`;
    o += `<path d="M57 136 l7 -5" stroke="${bark}" stroke-width="4.4" stroke-linecap="round"/><ellipse cx="65" cy="130.4" rx="2.2" ry="1.8" fill="${wood}" transform="rotate(-35 65 130.4)"/>`;
    // Root feet.
    o += `<path d="M23 150 C19 156 11 160 4 163 C13 165 25 165 33 163 C31 159 29 155 29 150 Z" fill="${dark}"/>`;
    o += `<path d="M57 150 C61 156 69 160 76 163 C67 165 55 165 47 163 C49 159 51 155 51 150 Z" fill="${dark}"/>`;
    o += `<path d="M8 162 c4 -1 8 -1 12 0 M60 162 c4 -1 8 -1 12 0" stroke="${deep}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>`;
    o += '</g>';
    o += faces({ x1: 32.5, x2: 48.5, y: 50, rx: 5.6, ry: 6.4, dx: 1.3, dy: -1.3, mx: 40.5, my: 64, k: 0.95, mouth: '#3A2410', tongue: '#D96A4A', cheek: C.nGlow, cheekY: 63, cheekDx: 4.5, brow: deep }, mood, { mood: 'sleepy' });
    // The long line: slung across him, coiled at his hip, the clip hanging.
    o += `<path d="M58 80 C46 94 34 106 22 120" stroke="${rope}" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="M58 80 C46 94 34 106 22 120" stroke="${ropeDeep}" stroke-width="1" stroke-dasharray="2 3" fill="none" opacity="0.7"/>`;
    const loop = (cx, cy) => `<ellipse cx="${cx}" cy="${cy}" rx="12" ry="8.5" stroke="${rope}" stroke-width="3.2" fill="none"/>`;
    o += `<g transform="rotate(-12 18 128)">${loop(18, 126)}${loop(16, 129)}${loop(19, 132)}<ellipse cx="17" cy="129" rx="12" ry="8.5" stroke="${ropeDeep}" stroke-width="0.9" stroke-dasharray="2 3" fill="none" opacity="0.6"/></g>`;
    o += `<path d="M10 134 C7 142 9 148 13 152" stroke="${rope}" stroke-width="3" stroke-linecap="round" fill="none"/><rect x="10.5" y="151" width="5" height="8" rx="2.4" fill="${C.fLight}" stroke="${C.fDeep}" stroke-width="1"/>`;
    // Twig arms: one resting on the coil, one holding up the trail map (resting when he is worried or asleep).
    o += `<path d="M23 96 C16 100 12 106 11 113" stroke="${bark}" stroke-width="5.4" stroke-linecap="round" fill="none"/><path d="M11 113 l-3 4 M11 113 l1 5" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/>`;
    const map = `<g transform="rotate(-8 86 54)"><path d="M72 44 l9 2 l9 -2 l9 2 v20 l-9 -2 l-9 2 l-9 -2 Z" fill="${C.paper}"/><path d="M81 46 v20 M90 44 v20" stroke="${C.stitch}" stroke-width="1"/><path d="M75 60 C80 54 84 58 88 52 C92 48 95 52 97 48" stroke="${C.kindle}" stroke-width="1.4" stroke-dasharray="1.6 2" fill="none" stroke-linecap="round"/><path d="M76 51 l2.4 -4.4 l2.4 4.4 Z M91 61 l2 -3.6 l2 3.6 Z" fill="${C.pine}"/><path d="M95.5 46.5 l3 3 M98.5 46.5 l-3 3" stroke="${C.kindleDeep}" stroke-width="1.2" stroke-linecap="round"/></g>`;
    const mapArm = `<g class="km-card-wave"><path d="M59 94 C67 90 74 80 77 68" stroke="${bark}" stroke-width="5.4" stroke-linecap="round" fill="none"/>${map}<path d="M77 68 l-3 -3 M77 68 l3 -2" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/></g>`;
    const restArm = `<path d="M59 96 C65 102 67 110 67 118" stroke="${bark}" stroke-width="5.4" stroke-linecap="round" fill="none"/><path d="M67 118 l-2 4 M67 118 l2.4 3.4" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/>`;
    if (mood === 'scene') o += `<g class="km-day-only">${mapArm}</g><g class="km-night-only">${restArm}</g>`;
    else o += (mood === 'worried' || mood === 'sleepy') ? restArm : mapArm;
    return { body: o, cx: 40, feet: 164, head: [66, -2], w: 100, top: -4 };
  }

  function sizzle(mood) {
    // Sizzle, for the dog's food and treats: an oversized strip of bacon standing on end, rippled the way a strip
    // cooks. Lengthwise bands of fat and meat, marbling, a crisp dark edge with browned spots, a glossy shine on the
    // fat, the curl of a crisp end on top, and sizzle rising off him by day. He holds up a jar of bone biscuits (the
    // treats budget is his) and sets it down beside him at night.
    const meat = '#B5482E';
    const crisp = '#8E3420';
    const char = '#6E2414';
    const fat = '#F4DDBC';
    const fatShade = '#E2BF96';
    const L = [[10, 160], [2, 138], [12, 116], [3, 94], [9, 72], [4, 50], [9, 28], [5, 10]];
    const WIDE = 46;
    const curve = (pts) => { let d = ''; for (let i = 1; i < pts.length; i += 1) { const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const ym = f((y0 + y1) / 2); d += ` C${x0} ${ym} ${x1} ${ym} ${x1} ${y1}`; } return d; };
    const shift = (dx) => L.map(([x, y]) => [x + dx, y]);
    const along = (dx) => { const p = shift(dx); p[0] = [p[0][0], 154]; p[p.length - 1] = [p[p.length - 1][0], 16]; return `M${p[0][0]} ${p[0][1]}${curve(p)}`; };
    const edgeX = (y) => { for (let i = 1; i < L.length; i += 1) { const [x0, y0] = L[i - 1]; const [x1, y1] = L[i]; if (y <= y0 && y >= y1) return x0 + (x1 - x0) * (y0 - y) / (y0 - y1); } return L[0][0]; };
    const R = shift(WIDE);
    const strip = `M${L[0][0]} ${L[0][1]}${curve(L)} C12 2 20 12 28 5 C34 0 44 8 ${R[R.length - 1][0]} ${R[R.length - 1][1]}${curve(R.slice().reverse())} C44 163 22 163 ${L[0][0]} ${L[0][1]} Z`;
    let o = '';
    // Sizzle rising off him, by day only.
    const sizzleMarks = `<g class="km-steam"><path d="M58 4 c-3 -4 3 -6 0 -10 c-3 -4 3 -6 0 -10" stroke="${C.paper}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M66 14 c-2.4 -3 2.4 -5 0 -8 c-2.4 -3 2.4 -5 0 -8" stroke="${C.paper}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85"/><path d="M-4 22 c-2.4 -3 2.4 -5 0 -8 c-2.4 -3 2.4 -5 0 -8" stroke="${C.paper}" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85"/></g>` +
      `<use href="#star" x="60" y="22" width="7" height="7" opacity="0.9"/><use href="#star" x="-12" y="36" width="6" height="6" opacity="0.8"/>`;
    if (mood === 'scene') o += `<g class="km-day-only">${sizzleMarks}</g>`;
    else if (mood !== 'sleepy') o += sizzleMarks;
    o += `<path d="${strip}" fill="${meat}"/>`;
    // Lengthwise: fat, meat (where his face is), a thin fat band, then the crisp shade side.
    o += `<path d="${along(7)}" stroke="${fat}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="${along(9.8)}" stroke="${fatShade}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    o += `<path d="${along(6)}" stroke="${C.paper}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="10 14" opacity="0.7"/>`;
    o += `<path d="${along(37)}" stroke="${fat}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="${along(38.8)}" stroke="${fatShade}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    o += `<path d="${along(43)}" stroke="${crisp}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    // Marbling in the meat (clear of the face) and browned spots at the crisp edges.
    [[16, 96], [26, 106], [20, 126], [29, 142], [14, 112], [24, 86], [18, 22], [28, 30], [31, 120]].forEach(([dx, y]) => { o += `<ellipse cx="${f(edgeX(y) + dx)}" cy="${y}" rx="1.7" ry="0.9" fill="${fat}" opacity="0.85"/>`; });
    [[1.6, 120], [2, 84], [44, 40], [44, 104], [43, 136], [2, 150], [44, 20], [1.8, 60]].forEach(([dx, y]) => { o += `<ellipse cx="${f(edgeX(y) + dx)}" cy="${y}" rx="1.8" ry="2.6" fill="${char}" opacity="0.85"/>`; });
    o += `<path d="${strip}" fill="none" stroke="${crisp}" stroke-width="1.8" stroke-linejoin="round"/>`;
    o += `<path d="M10 9 C14 4 20 9 26 6" stroke="${char}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.8"/>`;
    o += faces({ x1: 19.5, x2: 33, y: 50, rx: 5, ry: 5.8, dx: 1.1, dy: -1.1, mx: 27, my: 63, k: 0.85, mouth: '#4A1A10', tongue: '#E07A5F', cheek: C.nGlow, cheekY: 61, cheekDx: 4, brow: char }, mood, { mood: 'sleepy' });
    // Arms: little curls of bacon. One at his side; one holds up the jar of bone biscuits (or rests, jar on the
    // ground, when he is worried or asleep).
    const arm = (d) => `<path d="${d}" stroke="${crisp}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${meat}" stroke-width="6.4" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${fat}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.9"/>`;
    o += arm('M6 90 C-2 89 -9 94 -12 102');
    const jar = (x, y) => `<g transform="translate(${x} ${y})">` +
      `<rect x="-12" y="-32" width="24" height="32" rx="6" fill="${C.mereLight}" opacity="0.94"/>` +
      bone(-5, -18, 20, '#D49A68') + bone(4, -22, -25, '#C98A5A') + bone(-2, -26, -8, '#E3B07A') + bone(5, -14, 30, '#D49A68') + bone(-4, -12, -12, '#C98A5A') +
      `<rect x="-12" y="-32" width="24" height="32" rx="6" fill="none" stroke="#9FC4CC" stroke-width="1.4"/>` +
      `<path d="M-8.4 -26 v16" stroke="${C.paper}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>` +
      `<rect x="-13.5" y="-38" width="27" height="7" rx="2.6" fill="${C.kindle}"/><path d="M-11 -34.4 h22" stroke="${C.kindleDeep}" stroke-width="1" opacity="0.7"/>` +
      `<rect x="-7" y="-10" width="14" height="8" rx="1.6" fill="${C.paper}"/>${paw(0, -6, C.dLand)}</g>`;
    const held = `<g class="km-treat">${arm('M48 92 C56 90 62 84 63 76')}${jar(73, 76)}<ellipse cx="63" cy="75" rx="4" ry="3.4" fill="${meat}" stroke="${crisp}" stroke-width="1.2"/></g>`;
    const down = `${arm('M50 94 C56 98 58 106 58 114')}${jar(76, 166)}`;
    if (mood === 'scene') o += `<g class="km-day-only">${held}</g><g class="km-night-only">${down}</g>`;
    else o += (mood === 'worried' || mood === 'sleepy') ? down : held;
    o += `<ellipse cx="18" cy="163" rx="8" ry="4.4" fill="${char}"/><ellipse cx="42" cy="163" rx="8" ry="4.4" fill="${char}"/>`;
    return { body: o, cx: 30, feet: 166, head: [58, -6], w: 96, top: -22 };
  }

  return { barkley, sizzle };
};
