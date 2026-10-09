'use strict';

/**
 * cookbook: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Finds, shows and checks the recipes in my cookbook (knowledge/cookbook/recipes.json): every recipe from a real recipe page, filtered by meal, keeper, diet and what someone leaves out.
 * Inputs: do, meal, keeper, diet, avoid, limit
 * Cards: cookbook.md, food-allergies.md, meal-prep-storage.md
 *
 * It reads only this agent's cards, memory and cookbook, through ctx, and writes only its own state files.
 * Run: node agents/nutrition/tools/cookbook.js find [words] --meal dinner --diet vegetarian --avoid peanuts
 *      node agents/nutrition/tools/cookbook.js show <recipe id>
 *      node agents/nutrition/tools/cookbook.js check
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  // Every recipe here came from a page someone opened; the tool never adds one, never prices one.
  const lib = ctx.data('cookbook/recipes.json');
  if (!lib || !Array.isArray(lib.recipes)) throw new Error('My cookbook is not on the shelf (knowledge/cookbook/recipes.json).');
  const R = lib.recipes;
  const list = (v) => (v && v !== true ? String(v).toLowerCase().split(',').map((s) => s.trim()).filter(Boolean) : []);
  const MEALS = ['breakfast', 'lunch', 'dinner', 'side', 'snack', 'treat'];
  const KEEPER = { avo: 'Avo', spud: 'Spud', summer: 'Summer' };
  // Words people use for the nine allergens, and for diets.
  const ALLERGEN = { milk: 'milk', dairy: 'milk', egg: 'egg', eggs: 'egg', fish: 'fish', shellfish: 'shellfish', shrimp: 'shellfish',
    'tree nuts': 'tree nuts', 'tree nut': 'tree nuts', nuts: 'tree nuts', peanut: 'peanuts', peanuts: 'peanuts', wheat: 'wheat',
    gluten: 'wheat', soy: 'soy', sesame: 'sesame' };
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mins = (r) => r.total_min || ((r.prep_min || 0) + (r.cook_min || 0)) || null;

  function fits(r, f) {
    if (f.meal.length && !f.meal.includes(r.meal)) return false;
    if (f.keeper.length && !f.keeper.includes(r.keeper)) return false;
    if (f.diet.some((d) => !r.diet.includes(d))) return false;
    for (const a of f.avoid) {
      const al = ALLERGEN[a];
      if (al && (r.allergens.includes(al) || r.optional_allergens.includes(al))) return false;
      if (a === 'nuts' && (r.allergens.includes('peanuts') || r.optional_allergens.includes('peanuts'))) return false;
      if (a === 'gluten' && !r.diet.includes('gluten-free')) return false;
      if (r.ingredients.some((i) => new RegExp(`\\b${esc(a)}(e?s)?\\b`, 'i').test(i.item))) return false;
    }
    if (f.words.length) {
      const hay = `${r.title} ${r.ingredients.map((i) => i.item).join(' ')}`.toLowerCase();
      if (!f.words.every((w) => hay.includes(w))) return false;
    }
    return true;
  }
  const line = (r) => `- ${r.id}: ${r.title} (${r.meal}, ${KEEPER[r.keeper]}; serves ${r.servings}${mins(r) ? `; ${mins(r)} min` : ''}) ${r.diet.join(', ')}${r.allergens.length ? ` | contains ${r.allergens.join(', ')}` : ''} | ${r.source.url}`;

  const cmd = String(ctx.args._[0] || ctx.args.do || 'find');
  const told = ctx.recall().facts.map((f) => `${f.about || ''} ${f.text}`.toLowerCase()).join(' ');

  if (cmd === 'find') {
    const f = {
      words: ctx.args._.slice(1).join(' ').toLowerCase().split(/\s+/).filter(Boolean),
      meal: list(ctx.args.meal), keeper: list(ctx.args.keeper), diet: list(ctx.args.diet), avoid: list(ctx.args.avoid),
    };
    const limit = Math.max(1, Math.min(60, Number(ctx.args.limit) || 12));
    const hits = R.filter((r) => fits(r, f));
    ctx.state.write('last-find.json', { at: new Date().toISOString(), filter: f, ids: hits.map((r) => r.id) });
    const out = [`${hits.length} of ${R.length} recipes in my cookbook fit${f.meal.length ? ` (${f.meal.join(', ')})` : ''}${f.diet.length ? `, ${f.diet.join(', ')}` : ''}${f.avoid.length ? `, without ${f.avoid.join(', ')}` : ''}.`];
    out.push(...hits.slice(0, limit).map(line));
    if (hits.length > limit) out.push(`...and ${hits.length - limit} more (--limit).`);
    if (!hits.length) out.push('Nothing in my cookbook fits that. I will not make one up: ask for their own recipe, or look one up and name its page.');
    if (/allerg|anaphyla/.test(told)) out.push('', 'You told me about an allergy: read every packaged label too (food-allergies card).');
    return [...out, '', 'Rests on: cookbook.md'].join('\n');
  }

  if (cmd === 'show') {
    const id = String(ctx.args._[1] || '');
    const r = R.find((x) => x.id === id);
    if (!r) throw new Error(`There is no recipe ${id || '(no id)'} in my cookbook. Find one with: cookbook.js find`);
    const qty = (i) => [i.qty_text || (i.qty == null ? '' : i.qty), i.unit].filter(Boolean).join(' ');
    return [
      `${r.title}: ${r.meal}, kept by ${KEEPER[r.keeper]}. Serves ${r.servings}${r.serving_size ? ` (${r.serving_size})` : ''}. Prep ${r.prep_min == null ? '?' : r.prep_min} min, cook ${r.cook_min == null ? '?' : r.cook_min} min.`,
      `From: ${r.source.name}, "${r.source.title}", ${r.source.url} (opened ${r.source.fetched}).`,
      `Diet: ${r.diet.join(', ') || 'none tagged'}. Contains: ${r.allergens.join(', ') || 'none of the nine'}${r.optional_allergens.length ? `; optional extras add ${r.optional_allergens.join(', ')}` : ''}.`,
      ...(r.check_labels.length ? [`Check labels: ${r.check_labels.join('; ')}.`] : []),
      '', 'Ingredients (by aisle):',
      ...[...r.ingredients].sort((a, b) => a.aisle.localeCompare(b.aisle)).map((i) => `  - ${qty(i)} ${i.item}${i.prep ? `, ${i.prep}` : ''}${i.optional ? ' (optional)' : ''} [${i.aisle}]`),
      '', 'Steps (in our words; the page has the original):', ...r.steps.map((s, k) => `  ${k + 1}. ${s}`),
      '', `Meal prep: ${r.prep.batch ? 'batch-friendly' : 'make it fresh'}. Fridge: ${r.prep.fridge}. Freezer: ${r.prep.freezes ? r.prep.freezer : `no (${r.prep.freezer})`}. ${r.prep.reheat}`,
      `  Keep-times from ${r.prep.basis.name}, ${r.prep.basis.url}.`,
      ...(r.prep.recipe_note ? [`  The recipe page says: ${r.prep.recipe_note}`] : []),
      '', 'Rests on: cookbook.md, meal-prep-storage.md',
    ].join('\n');
  }

  if (cmd === 'check') {
    const problems = [];
    const ids = new Set();
    const MEAT = /\b(chicken|turkey|beef|pork|ham|bacon|sausages?|lamb|veal|salmon|tuna|cod|tilapia|fish|shrimp)\b/i;
    for (const r of R) {
      const p = (why) => problems.push(`${r.id || '(no id)'}: ${why}`);
      if (!r.id || ids.has(r.id)) p('missing or repeated id'); ids.add(r.id);
      if (!MEALS.includes(r.meal)) p(`meal "${r.meal}" is not one of ${MEALS.join(', ')}`);
      if (!KEEPER[r.keeper]) p('no keeper');
      if (!(Number(r.servings) > 0)) p('no servings');
      if (!Array.isArray(r.ingredients) || !r.ingredients.length || r.ingredients.some((i) => !i.item || !i.aisle)) p('ingredients missing, or one without an item or aisle');
      if (!Array.isArray(r.steps) || !r.steps.length) p('no steps');
      if (!r.source || !/^https:\/\/\S+\.\S+/.test(r.source.url || '') || !r.source.name || !/^\d{4}-\d{2}-\d{2}$/.test(r.source.fetched || '')) p('no source name, https URL and fetched date');
      if (!r.prep || !r.prep.fridge || !r.prep.basis || !/^https:/.test(r.prep.basis.url || '')) p('no sourced meal-prep note');
      const req = (r.ingredients || []).filter((i) => !i.optional);
      if (r.diet.includes('vegetarian') && req.some((i) => MEAT.test(i.item) && !/\bor\b/i.test(i.item))) p('tagged vegetarian but lists meat or fish');
      if (r.diet.includes('vegan') && (r.allergens.includes('milk') || r.allergens.includes('egg'))) p('tagged vegan but contains milk or egg');
      if (r.diet.includes('gluten-free') && r.allergens.includes('wheat')) p('tagged gluten-free but contains wheat');
      if (r.diet.includes('nut-free') && (r.allergens.includes('peanuts') || r.allergens.includes('tree nuts'))) p('tagged nut-free but contains nuts');
      if (r.diet.includes('dairy-free') && r.allergens.includes('milk')) p('tagged dairy-free but contains milk');
      if (r.diet.includes('egg-free') && r.allergens.includes('egg')) p('tagged egg-free but contains egg');
      if (JSON.stringify(r).match(/\$\s?\d/)) p('mentions a price');
    }
    const tally = (key) => R.reduce((m, r) => { m[r[key]] = (m[r[key]] || 0) + 1; return m; }, {});
    const diets = {};
    for (const r of R) for (const d of r.diet) diets[d] = (diets[d] || 0) + 1;
    const fmt = (m) => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
    const hosts = {};
    for (const r of R) { const h = String(r.source && r.source.url).replace(/^https:\/\/([^/]+).*$/, '$1'); hosts[h] = (hosts[h] || 0) + 1; }
    const out = [
      `${R.length} recipes in my cookbook.`,
      `By meal: ${fmt(tally('meal'))}.`,
      `By keeper: ${fmt(tally('keeper'))}.`,
      `By diet: ${fmt(diets)}.`,
      `Sources: ${fmt(hosts)}.`,
      `Every recipe has a source URL, servings, ingredients and steps: ${problems.some((x) => /source|servings|ingredients|steps/.test(x)) ? 'NO' : 'yes'}.`,
    ];
    if (problems.length) throw new Error([...out, `${problems.length} problem(s):`, ...problems.map((x) => `- ${x}`)].join('\n'));
    return [...out, 'No problems.', '', 'Rests on: cookbook.md'].join('\n');
  }

  return 'Use: cookbook.js find [words] [--meal m] [--keeper avo|spud|summer] [--diet d,d] [--avoid a,a] | show <id> | check';
});
