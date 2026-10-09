'use strict';

/**
 * week-plan: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Builds a week of eating shaped on DASH and on what the person has told me, every line a card fact with its card named.
 * Inputs: days, diet, avoid
 * Cards: eating-patterns.md, labels-and-energy.md, protein.md, diabetes.md, food-allergies.md, celiac-and-gluten.md, plant-based-and-genes.md, pregnancy.md, training-fuel.md, kidney-disease.md, scope-and-escalation.md, medicines-and-pku.md, cookbook.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/nutrition/tools/week-plan.js --days <days>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  // Every line it prints is a fact from a card, with the card named. The tool chooses facts; it never states one.
  const used = new Set();
  const say = (f, file) => { used.add(file); return `  - ${f.text.replace(/\s*(\[\^\d+\]\s*)*@\S+/g, '').trim()} (${file.replace(/\.md$/, '')})`; };
  const pick = (file, re) => ctx.card(file).facts.filter((f) => re.test(f.text));
  const days = Math.min(14, Math.max(1, Number(ctx.args.days) || 7));
  const mem = ctx.recall();
  const told = mem.facts.map((f) => `${f.about || ''} ${f.text}`.toLowerCase());
  const has = (re) => told.some((t) => re.test(t));
  const out = [`A ${days}-day eating plan, shaped on DASH.`, ''];

  // Hand-offs first: a plan is not built where a card says the agent must stop.
  const stops = [];
  if (has(/kidney|ckd|dialysis|renal/)) stops.push(...pick('kidney-disease.md', /Must refuse to set|explain the guideline ranges/).map((f) => say(f, 'kidney-disease.md')));
  if (has(/eating disorder|scoff|binge|purg/)) stops.push(...pick('scope-and-escalation.md', /SCOFF/).map((f) => say(f, 'scope-and-escalation.md')));
  if (has(/\bpku\b|phenylketon/)) stops.push(...pick('medicines-and-pku.md', /Total refusal/).map((f) => say(f, 'medicines-and-pku.md')));
  if (stops.length) {
    out.push('I will not build this plan. What you told me needs a specialist first:', ...stops, '');
    ctx.state.write('last-plan.json', { at: new Date().toISOString(), days, built: false });
    out.push(`Rests on: ${[...used].join(', ')}`);
    return out.join('\n');
  }

  out.push('Every day:', ...pick('eating-patterns.md', /Daily servings at 2,000 kcal/).map((f) => say(f, 'eating-patterns.md')));
  out.push('Across the week:', ...pick('eating-patterns.md', /^Weekly:/).map((f) => say(f, 'eating-patterns.md')));
  out.push('Calories differ by person. Ask me for your range rather than read 2,000 as yours:',
    ...pick('labels-and-energy.md', /Give a range with the error band/).map((f) => say(f, 'labels-and-energy.md')));

  const shaped = [];
  if (has(/diabet|prediabet|blood sugar/)) shaped.push(['Because you have diabetes or prediabetes:', 'diabetes.md', /Emphasise non-starchy|Minimise red meat|Must refuse insulin/]);
  if (has(/allerg|anaphyla/)) shaped.push(['Because you told me about an allergy:', 'food-allergies.md', /First decide: allergy|check all three declaration|Re-check on every purchase/]);
  if (has(/lactose/)) shaped.push(['Because of lactose:', 'food-allergies.md', /12 g lactose|lower-lactose dairy|replace the calcium/]);
  if (has(/gluten|celiac|coeliac/)) shaped.push(['Because of gluten:', 'celiac-and-gluten.md', /use products labelled|Oats are easily|"Wheat-free" is not/]);
  if (has(/vegan|vegetarian|plant.based/)) shaped.push(['Because you eat plant-based:', 'plant-based-and-genes.md', /Run the fixed checklist|carry that checklist/]);
  if (has(/pregnan|breastfeed|lactat/)) shaped.push(['Because you are pregnant or breastfeeding:', 'pregnancy.md', /Caffeine: at most|Alcohol: none|Listeria|Do not avoid fish/]);
  if (has(/train|run|lift|athlet|marathon|gym/)) {
    shaped.push(['Because you train:', 'training-fuel.md', /Carbohydrate for moderate exercise|Carbohydrate for moderate-to-high/]);
    shaped.push(['And protein, because you train (kidney function known first):', 'protein.md', /ISSN, building or keeping muscle|Spread doses every/]);
  }
  if (has(/blood pressure|hypertens|heart/)) shaped.push(['Because of your heart or blood pressure:', 'eating-patterns.md', /DASH plus low sodium|Sodium capped|Never manage someone/]);
  for (const [why, file, re] of shaped) out.push('', why, ...pick(file, re).map((f) => say(f, file)));
  if (!shaped.length) out.push('', 'You have not told me about allergies, conditions or training yet. Tell me and I will shape this plan around them.');

  // Meals from my cookbook that fit: Avo's breakfasts and lunches, Spud's dinners, Summer's treats.
  const lib = ctx.data('cookbook/recipes.json');
  const book = lib && Array.isArray(lib.recipes) ? lib.recipes : [];
  const words = (v) => String(v && v !== true ? v : '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  const diet = words(ctx.args.diet);
  if (has(/\bvegan\b/) && !diet.includes('vegan')) diet.push('vegan');
  else if (has(/vegetarian/) && !diet.includes('vegetarian') && !diet.includes('vegan')) diet.push('vegetarian');
  if (has(/gluten|celiac|coeliac/) && !diet.includes('gluten-free')) diet.push('gluten-free');
  const avoid = words(ctx.args.avoid);
  const AL = { milk: 'milk', dairy: 'milk', egg: 'egg', eggs: 'egg', fish: 'fish', shellfish: 'shellfish', nuts: 'tree nuts', 'tree nuts': 'tree nuts',
    peanut: 'peanuts', peanuts: 'peanuts', wheat: 'wheat', gluten: 'wheat', soy: 'soy', sesame: 'sesame' };
  const fit = (r) => diet.every((x) => r.diet.includes(x))
    && avoid.every((a) => !AL[a] || !r.allergens.concat(r.optional_allergens).includes(AL[a]));
  if (book.length) {
    used.add('cookbook.md');
    out.push('', `From my cookbook${diet.length ? ` (${diet.join(', ')})` : ''}${avoid.length ? `, without ${avoid.join(', ')}` : ''}, every recipe from a real recipe page:`);
    for (const [label, meals] of [['Avo, breakfast', ['breakfast']], ['Avo, lunch', ['lunch']], ['Spud, dinner', ['dinner']], ['Summer, treats', ['treat', 'snack']]]) {
      const xs = book.filter((r) => meals.includes(r.meal) && fit(r));
      out.push(`  - ${label}: ${xs.length} fit${xs.length ? `, such as ${xs.slice(0, 3).map((r) => r.title).join('; ')}` : ''}.`);
    }
    out.push(`To put a week of them on the table: node tools/meal-week.js plan${diet.length ? ` --diet ${diet.join(',')}` : ''}${avoid.length ? ` --avoid ${avoid.join(',')}` : ''}`);
  } else out.push('', 'My cookbook is not on the shelf, so I have no recipes to offer. I never make one up.');
  out.push('Your shopping list comes from this plan: run prep-list next.');
  out.push('', `Rests on: ${[...used].join(', ')}`);
  ctx.state.write('last-plan.json', { at: new Date().toISOString(), days, built: true, shaped: shaped.map((s) => s[0]), cards: [...used] });
  return out.join('\n');
});
