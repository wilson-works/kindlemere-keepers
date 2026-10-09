'use strict';

/**
 * prep-list: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Makes the shopping order and a batch-cook schedule whose keep-times and temperatures come from my food-safety card.
 * Inputs: cook, recipes
 * Cards: meal-planning-and-shopping.md, food-safety.md, food-allergies.md, cookbook.md, meal-prep-batch-day.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/nutrition/tools/prep-list.js --cook <cook>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  // A shopping order and a batch-cook schedule. The keep-time and temperatures come from the food-safety card's own
  // words, so the schedule moves if the card does. Every printed line is a card fact, with the card named.
  const used = new Set();
  const say = (f, file) => { used.add(file); return `  - ${f.text.replace(/\s*(\[\^\d+\]\s*)*@\S+/g, '').trim()} (${file.replace(/\.md$/, '')})`; };
  const pick = (file, re) => ctx.card(file).facts.filter((f) => re.test(f.text));
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const cook = String(ctx.args.cook || 'sun').toLowerCase().split(/[\s,]+/).map((d) => DAYS.indexOf(d.slice(0, 3))).filter((i) => i >= 0);
  if (!cook.length) return 'Tell me which days you cook, for example --cook "sun,wed".';

  const keep = pick('food-safety.md', /Cooked meat or poultry leftovers keep/)[0];
  const m = keep && /(\d+)\s+to\s+(\d+)\s+days/.exec(keep.text);
  if (!m) return 'My food-safety card no longer says how long cooked leftovers keep, so I will not guess a schedule.';
  const lastDay = Number(m[2]);

  const out = ['Before you shop, in this order:', ...pick('meal-planning-and-shopping.md', /^[1-4]\. (Plan to use|Know how much|Make the list|Buy only)/).map((f) => say(f, 'meal-planning-and-shopping.md'))];
  out.push('', 'At the shop:', ...pick('meal-planning-and-shopping.md', /unit pricing|all forms of produce|in season or on sale|Watch sodium/).map((f) => say(f, 'meal-planning-and-shopping.md')));
  out.push('', `Batch cooking (cooked food keeps ${m[1]} to ${m[2]} days in the fridge):`);
  used.add('food-safety.md');
  const sorted = [...new Set(cook)].sort((a, b) => a - b);
  sorted.forEach((d, i) => {
    const next = sorted[(i + 1) % sorted.length];
    const gap = ((next - d + 7) % 7) || 7;
    const eatTo = (d + Math.min(gap, lastDay)) % 7;
    const freeze = gap > lastDay;
    out.push(`  - Cook ${NAMES[d]}. Eat it through ${NAMES[eatTo]}.${freeze ? ` Freeze what's left on ${NAMES[eatTo]}, since your next cook day is ${gap} days away.` : ''}`);
  });
  // With --recipes (ids from my cookbook): a batch-prep order for those dishes, longest cook first, each with its own
  // keep-time and freezer note from the storage chart the cookbook names.
  const ids = String(ctx.args.recipes && ctx.args.recipes !== true ? ctx.args.recipes : '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length) {
    const lib = ctx.data('cookbook/recipes.json');
    const book = lib && Array.isArray(lib.recipes) ? lib.recipes : [];
    const missing = ids.filter((id) => !book.some((r) => r.id === id));
    if (missing.length) return `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not in my cookbook. Find recipes with: cookbook.js find`;
    const mins = (r) => r.total_min || ((r.prep_min || 0) + (r.cook_min || 0)) || 0;
    const picked = ids.map((id) => book.find((r) => r.id === id)).sort((a, b) => mins(b) - mins(a));
    const first = sorted[0];
    out.push('', `Prep order for ${NAMES[first]}, from my cookbook (longest cook first):`);
    for (const p of pick('meal-prep-batch-day.md', /^Start whatever cooks longest first|^Portion into single meals/)) out.push(say(p, 'meal-prep-batch-day.md'));
    picked.forEach((r, k) => {
      const days = r.prep.fridge_days;
      const by = days ? NAMES[(first + days) % 7] : NAMES[first];
      out.push(`  ${k + 1}. ${r.title} (${mins(r) || '?'} min, serves ${r.servings}): ${r.prep.batch ? `keeps ${r.prep.fridge} in the fridge, so eat it by ${by}` : r.prep.fridge}. Freezer: ${r.prep.freezes ? r.prep.freezer : `no, ${r.prep.freezer}`}. ${r.prep.reheat} [${r.prep.basis.name}] ${r.source.url}`);
    });
    used.add('cookbook.md');
  }
  out.push('', 'Keep it safe while you prep:',
    ...pick('food-safety.md', /Poultry, all types|Ground beef|Whole cuts|Fish and shellfish|Reheated leftovers|Never leave perishable|Fridge at 40|Thaw in the fridge/).map((f) => say(f, 'food-safety.md')));
  const told = ctx.recall().facts.map((f) => `${f.about || ''} ${f.text}`.toLowerCase());
  if (told.some((t) => /allerg|celiac|coeliac|gluten/.test(t))) out.push('', 'Because of your allergy or gluten:', ...pick('food-allergies.md', /Control cross-contact|Re-check on every purchase/).map((f) => say(f, 'food-allergies.md')));
  out.push('', 'I keep no grocery prices. They change every month, and I have no current figure.');
  ctx.state.write('last-prep.json', { at: new Date().toISOString(), cook: sorted.map((d) => DAYS[d]), keepDays: lastDay });
  return [...out, '', `Rests on: ${[...used].join(', ')}`].join('\n');
});
