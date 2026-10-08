'use strict';

/**
 * swap-finder: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Finds the safe swap for a food someone must avoid, telling an allergy from an intolerance, from my allergy and gluten cards.
 * Inputs: food, allergy, intolerance
 * Cards: food-allergies.md, celiac-and-gluten.md, scope-and-escalation.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/nutrition/tools/swap-finder.js --food <food> --allergy <allergy> --intolerance <intolerance>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  // Finds the safe swap for a food someone must avoid. Every line is a card fact, with the card named.
  const used = new Set();
  const say = (f, file) => { used.add(file); return `  - ${f.text.replace(/\s*(\[\^\d+\]\s*)*@\S+/g, '').trim()} (${file.replace(/\.md$/, '')})`; };
  const pick = (file, re) => ctx.card(file).facts.filter((f) => re.test(f.text));
  const what = ctx.args._.join(' ').trim().toLowerCase();
  if (!what) return 'Tell me what to swap out: for example milk, lactose, gluten, wheat, peanut, egg or sesame.';
  const told = ctx.recall().facts.map((f) => `${f.about || ''} ${f.text}`.toLowerCase());
  const out = [`Swapping out ${what}.`, ''];

  // A plan to bring an allergen back is never a swap question.
  if (/reintroduc|bring back|try again/.test(what) || ctx.args.reintroduce) {
    out[0] = 'Bringing a food back after an allergy.';
    out.push('I will not plan that. It needs an allergist:',
      ...pick('scope-and-escalation.md', /plan to reintroduce/).map((f) => say(f, 'scope-and-escalation.md')));
    return [...out, '', `Rests on: ${[...used].join(', ')}`].join('\n');
  }

  const isLactose = /lactose/.test(what) || (/milk|dairy/.test(what) && (ctx.args.intolerance || told.some((t) => /lactose/.test(t))));
  const isGluten = /gluten|wheat|celiac|coeliac|barley|rye|oat/.test(what);
  const allergyTold = told.some((t) => /allerg|anaphyla/.test(t) && t.includes(what.split(' ')[0]));

  out.push('First, which is it:', ...pick('food-allergies.md', /First decide: allergy/).map((f) => say(f, 'food-allergies.md')));
  if (isLactose && !ctx.args.allergy) {
    out.push('', 'Lactose is an intolerance, so find your dose rather than cut it all:',
      ...pick('food-allergies.md', /12 g lactose|Small portions|Lactase enzyme|Hidden lactose|Non-dairy calcium/).map((f) => say(f, 'food-allergies.md')));
  } else if (isGluten) {
    out.push('', 'Gluten:', ...pick('celiac-and-gluten.md', /comes from wheat|Oats are easily|"Wheat-free" is not|Separate equipment stays|Never advise starting/).map((f) => say(f, 'celiac-and-gluten.md')));
  } else {
    out.push('', allergyTold ? 'You told me this is an allergy, so it is strict avoidance:' : 'If this is an allergy, it is strict avoidance:',
      ...pick('food-allergies.md', /The nine:|check all three declaration|Re-check on every purchase|"May contain"|Control cross-contact/).map((f) => say(f, 'food-allergies.md')));
    if (/milk|dairy/.test(what)) out.push('', 'With milk out, replace the calcium:', ...pick('food-allergies.md', /Non-dairy calcium/).map((f) => say(f, 'food-allergies.md')));
    if (/peanut/.test(what)) out.push('', 'For a baby and peanut, see an allergist first if there is eczema or egg allergy:', ...pick('food-allergies.md', /highest risk|must refuse to direct/).map((f) => say(f, 'food-allergies.md')));
  }
  const found = ctx.find(what).filter((c) => !used.has(c.file)).slice(0, 2);
  for (const c of found) out.push('', `Also on my shelf about ${what}:`, ...c.facts.slice(0, 3).map((f) => say(f, c.file)));
  if (/anaphyla|epipen|epi-pen/.test(told.join(' '))) out.push('', ...pick('scope-and-escalation.md', /anaphylactic/).map((f) => say(f, 'scope-and-escalation.md')));
  ctx.state.write('last-swap.json', { at: new Date().toISOString(), what, cards: [...used] });
  return [...out, '', `Rests on: ${[...used].join(', ')}`].join('\n');
});
