'use strict';

/**
 * meal-week: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Publishes a planned week at the table: the 7-day plan, prep and quick-cook recipes, a grocery list by store and macro targets from my cards; keeps every week and answers what's for today and am I on track.
 * Inputs: do, week
 * Cards: labels-and-energy.md, protein.md, macronutrients.md, training-fuel.md, food-safety.md, meal-planning-and-shopping.md, kidney-disease.md, pregnancy.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/nutrition/tools/meal-week.js --do <do> --week <week>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  // The table: plan a week, publish it at a temporary link, keep it, and answer "what's for today" and "am I on track".
  // Every number in the targets is read from a card's own words. Recipes come only from a recipe card or the person's
  // own recipe box. Nothing here is a price.
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
  const STORES = ['Walmart', "Sam's Club", 'Sprouts'];
  const used = new Set();
  const clean = (t) => String(t).replace(/\s*(\[\^\d+\]\s*)*@\S+/g, '').trim();
  const fact = (file, re) => {
    const f = ctx.card(file).facts.find((x) => re.test(clean(x.text)));
    if (f) used.add(file);
    return f ? clean(f.text) : null;
  };
  const need = (file, re, what) => {
    const t = fact(file, re);
    if (!t) throw new Error(`My ${file.replace(/\.md$/, '')} card no longer says ${what}, so I will not guess it.`);
    return t;
  };
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDay = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
  const readJson = (name, dflt) => {
    const t = ctx.state.read(name);
    if (t == null) return dflt;
    try { return JSON.parse(t); } catch (_) { throw new Error(`${name} at my table is not readable JSON.`); }
  };
  const weekFile = (id) => `week-${id}.json`;
  const checksFile = (id) => `week-${id}.checks.json`;
  const round10 = (n) => Math.round(n / 10) * 10;
  const r1 = (n) => Math.round(n * 10) / 10;
  const rests = () => (used.size ? `Rests on: ${[...used].join(', ')}` : '');
  const cmd = String(ctx.args._[0] || ctx.args.do || 'today');

  // Macro targets, every number from a card.
  function targets(p) {
    if (!p) return { missing: 'Tell me your age, sex, height and weight (and how much you train) so I can set targets.' };
    const kg = p.weight_kg != null ? Number(p.weight_kg) : p.weight_lb != null ? Number(p.weight_lb) * 0.45359237 : NaN;
    const cm = p.height_cm != null ? Number(p.height_cm) : p.height_in != null ? Number(p.height_in) * 2.54 : NaN;
    const age = Number(p.age);
    const sex = /^(m|male|man)$/i.test(String(p.sex || '')) ? 'male' : /^(f|female|woman)$/i.test(String(p.sex || '')) ? 'female' : '';
    if (!(kg > 0) || !(cm > 0) || !(age > 0) || !sex) {
      return { missing: 'I need age, sex, height and weight before I set any target.' };
    }
    if (age < 19) return { missing: 'I set targets for adults only. For a child or teen, ask me for the needs by age on my life-stages card.' };
    const kidney = String(p.kidney || 'unknown').toLowerCase();
    if (/ckd|kidney disease|dialysis/.test(kidney)) {
      return { refused: need('kidney-disease.md', /^Must refuse to set a protein/, 'the kidney rule') };
    }
    const lines = [];
    const add = (what, value, note, card) => lines.push({ what, value, note, card });

    // Resting energy: Mifflin-St Jeor, with the error band the guideline itself reports.
    const eq = need('labels-and-energy.md', sex === 'male' ? /^Men: RMR =/ : /^Women: RMR =/, 'the Mifflin-St Jeor equation');
    const m = /\(([\d.]+) × weight kg\) \+ \(([\d.]+) × height cm\) [−-] \(([\d.]+) × age\) ([+−-]) (\d+)/.exec(eq);
    if (!m) throw new Error('My labels-and-energy card no longer reads as an equation, so I will not guess it.');
    const rmr = Number(m[1]) * kg + Number(m[2]) * cm - Number(m[3]) * age + (m[4] === '+' ? 1 : -1) * Number(m[5]);
    const bandText = need('labels-and-energy.md', /^Give a range with the error band/, 'its error band');
    const b = /up to (\d+)% over, (\d+)% under/.exec(bandText);
    if (!b) throw new Error('My labels-and-energy card no longer gives the error band, so I will not guess it.');
    const lo = round10(rmr * (1 - Number(b[1]) / 100));
    const hi = round10(rmr * (1 + Number(b[2]) / 100));
    add('Resting energy', `${lo}-${hi} kcal a day`, 'Mifflin-St Jeor with its own error band, never one number. Your daily total adds activity, and the activity multipliers are not on my shelf yet.', 'labels-and-energy.md');

    // Protein: a branch, never one number. Kidney first.
    const pregnant = Boolean(p.pregnant) || Boolean(p.breastfeeding);
    const training = String(p.training || 'none').toLowerCase();
    let pLo; let pHi; let branch;
    if (pregnant) {
      const row = need('macronutrients.md', p.breastfeeding ? /^Lactation: carb/ : /^Pregnancy: carb/, 'the pregnancy row');
      const pm = /protein (\d+)/.exec(row);
      pLo = Number(pm[1]); pHi = pLo; branch = p.breastfeeding ? 'breastfeeding' : 'pregnancy';
      add('Protein', `${pLo} g a day`, `The ${branch} RDA.`, 'macronutrients.md');
    } else {
      const rda = need('protein.md', /^Baseline RDA for adults: ([\d.]+) g\/kg\/day/, 'the protein RDA');
      const base = Number(/([\d.]+) g\/kg/.exec(rda)[1]);
      let range = [base, base]; branch = 'the adult RDA';
      if (kidney === 'healthy') {
        if (age >= 65) {
          const o = need('protein.md', /^Healthy older adults: at least ([\d.]+)-([\d.]+) g\/kg\/day/, 'the older-adult range');
          const om = /([\d.]+)-([\d.]+) g\/kg/.exec(o); range = [Number(om[1]), Number(om[2])]; branch = 'healthy adults over 65';
        } else if (/moderate|high|train|run|lift/.test(training) && training !== 'none') {
          const e = need('protein.md', /^Exercising adults: ([\d.]+)-([\d.]+) g\/kg\/day/, 'the exercising range');
          const em = /([\d.]+)-([\d.]+) g\/kg/.exec(e); range = [Number(em[1]), Number(em[2])]; branch = 'exercising adults';
        }
      }
      pLo = Math.round(range[0] * kg); pHi = Math.round(range[1] * kg);
      const note = kidney === 'healthy'
        ? `Branch: ${branch} (${range[0]}${range[1] !== range[0] ? `-${range[1]}` : ''} g per kg).`
        : `Branch: ${branch}. ${need('protein.md', /^Proactively flag high-protein advice/, 'the kidney flag')}`;
      add('Protein', pLo === pHi ? `${pLo} g a day` : `${pLo}-${pHi} g a day`, note, 'protein.md');
    }

    // Carbohydrate: by training load, else the RDA floor and the AMDR.
    const amdr = need('macronutrients.md', /^Ages 19\+: carbohydrate/, 'the adult AMDR');
    const am = /carbohydrate (\d+)-(\d+)%, protein (\d+)-(\d+)%, fat (\d+)-(\d+)%/.exec(amdr);
    let cLo = null; let cHi = null;
    if (/high/.test(training)) {
      const t = need('training-fuel.md', /^Carbohydrate for moderate-to-high intensity, 1-3 hours a day: (\d+)-(\d+) g\/kg\/day/, 'the training carbohydrate range');
      const tm = /(\d+)-(\d+) g\/kg/.exec(t); cLo = Math.round(Number(tm[1]) * kg); cHi = Math.round(Number(tm[2]) * kg);
      add('Carbohydrate', `${cLo}-${cHi} g a day`, `Training 1-3 hours a day (${tm[1]}-${tm[2]} g per kg).`, 'training-fuel.md');
    } else if (/moderate|train|run|lift/.test(training) && training !== 'none') {
      const t = need('training-fuel.md', /^Carbohydrate for moderate exercise, about 1 hour a day: (\d+)-(\d+) g\/kg\/day/, 'the training carbohydrate range');
      const tm = /(\d+)-(\d+) g\/kg/.exec(t); cLo = Math.round(Number(tm[1]) * kg); cHi = Math.round(Number(tm[2]) * kg);
      add('Carbohydrate', `${cLo}-${cHi} g a day`, `Training about 1 hour a day (${tm[1]}-${tm[2]} g per kg).`, 'training-fuel.md');
    } else {
      const row = need('macronutrients.md', pregnant ? (p.breastfeeding ? /^Lactation: carb/ : /^Pregnancy: carb/) : (sex === 'male' ? /^Males 19\+: carb/ : (age >= 51 ? /^Females 51\+: carb/ : /^Females 19-50: carb/)), 'the carbohydrate RDA');
      const floor = Number(/carb (\d+)/.exec(row)[1]);
      add('Carbohydrate', `${am[1]}-${am[2]}% of calories, at least ${floor} g a day`, 'The AMDR, with the RDA as a floor (the brain\'s need, not a cap).', 'macronutrients.md');
    }
    add('Fat', `${am[5]}-${am[6]}% of calories`, 'The adult AMDR. There is no gram RDA for fat.', 'macronutrients.md');

    // Fiber.
    const fRow = need('macronutrients.md', sex === 'male' ? /^Males 19\+: carb/ : (age >= 51 ? /^Females 51\+: carb/ : /^Females 19-50: carb/), 'the fiber AI');
    const fiber = /fiber ([\d-]+)/.exec(fRow)[1];
    const per1000 = need('macronutrients.md', /at least 14 g per 1,000 kcal/, 'the per-1,000-kcal fiber target');
    add('Fiber', `${fiber} g a day`, `Or ${/at least ([\d]+ g per 1,000 kcal)/.exec(per1000)[1]}.`, 'macronutrients.md');

    // Per meal.
    const perMeal = need('protein.md', /^About ([\d.]+) g of high-quality protein per kg body weight per serving/, 'the per-meal protein dose');
    const pm = /About ([\d.]+) g .* or (\d+)-(\d+) g absolute/.exec(perMeal);
    const meal = [{ what: 'Protein per meal', value: `about ${Math.round(Number(pm[1]) * kg)} g (${pm[2]}-${pm[3]} g)`, note: `${pm[1]} g per kg per serving, every 3-4 hours.`, card: 'protein.md' }];
    if (cLo != null) meal.push({ what: 'Carbohydrate per main meal', value: `${Math.round(cLo / 3)}-${Math.round(cHi / 3)} g`, note: 'The daily range over 3 main meals.', card: 'training-fuel.md' });
    return { lines, meal, person: { age, sex, kg: r1(kg), cm: Math.round(cm), training, kidney, pregnant } };
  }

  function linkId() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 22; i += 1) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  }

  function publish() {
    const d = readJson('draft.json', null);
    if (!d) throw new Error('There is no draft on the table yet. Write the week to state/tools/meal-week/draft.json first.');
    const monday = parseDay(d.week);
    if (!monday || monday.getDay() !== 1) throw new Error('The week must start on a Monday, written YYYY-MM-DD.');
    const id = iso(monday);
    const household = Math.max(1, Math.round(Number(d.household) || 1));
    const stores = Array.isArray(d.stores) && d.stores.length ? d.stores.map(String) : STORES;
    const problems = [];
    const recipes = {};
    // Any diet: the person's own words for how they eat, and the foods they leave out (allergies, intolerances, dislikes).
    // Every ingredient, staple and plain meal is checked against what they leave out; a match stops the week.
    const diet = (Array.isArray(d.diet) ? d.diet : []).map((x) => String(x).trim()).filter(Boolean);
    const avoid = (Array.isArray(d.avoid) ? d.avoid : []).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const leftOut = (text) => avoid.find((a) => new RegExp(`\\b${esc(a)}(e?s)?\\b`, 'i').test(String(text)));
    for (const r of Array.isArray(d.recipes) ? d.recipes : []) {
      if (!r || !r.id || !r.name) { problems.push('A recipe has no id or name.'); continue; }
      const src = r.source || {};
      let source;
      if (src.card) {
        try { ctx.card(src.card); used.add(src.card); source = { card: src.card }; } catch (_) { problems.push(`${r.name}: its card ${src.card} is not on my shelf.`); }
      } else if (src.person) {
        source = { person: String(src.person) };
      } else {
        problems.push(`${r.name}: a recipe must come from a recipe card or from your own recipe box. I don't make recipes up.`);
      }
      const ingredients = [];
      for (const i of Array.isArray(r.ingredients) ? r.ingredients : []) {
        if (!i || !i.item) { problems.push(`${r.name}: an ingredient has no name.`); continue; }
        if (i.store && !stores.includes(i.store)) problems.push(`${r.name}: ${i.item} is set to ${i.store}, which is not one of your stores (${stores.join(', ')}).`);
        const out = leftOut(i.item);
        if (out) problems.push(`${r.name}: ${i.item} has ${out} in it, and you leave ${out} out.`);
        ingredients.push({ item: String(i.item), qty: i.qty == null ? null : Number(i.qty), unit: i.unit ? String(i.unit) : '', store: i.store || '' });
      }
      recipes[r.id] = {
        id: String(r.id), name: String(r.name), kind: r.kind === 'prep' ? 'prep' : 'quick',
        serves: Math.max(1, Number(r.serves) || 1), source, ingredients,
        steps: (Array.isArray(r.steps) ? r.steps : []).map(String), minutes: r.minutes ? Number(r.minutes) : null,
      };
    }
    const uses = {};
    const days = DAYS.map((key, i) => {
      const date = addDays(monday, i);
      const dm = (d.meals || {})[key] || {};
      const slots = [];
      for (const s of SLOTS) {
        const v = dm[s];
        if (v == null || v === '') continue;
        const rid = typeof v === 'string' ? v : v.recipe;
        if (rid && recipes[rid]) {
          uses[rid] = (uses[rid] || 0) + 1;
          slots.push({ slot: s, recipe: rid, name: recipes[rid].name, kind: recipes[rid].kind });
        } else if (typeof v === 'string') {
          const out = leftOut(v);
          if (out) problems.push(`${DAY_NAMES[key]} ${s}: ${v} has ${out} in it, and you leave ${out} out.`);
          slots.push({ slot: s, name: v, kind: 'simple' });
        } else {
          problems.push(`${DAY_NAMES[key]} ${s}: ${JSON.stringify(v)} is not a recipe on this plan.`);
        }
      }
      return { key, date: iso(date), name: DAY_NAMES[key], slots };
    });
    for (const x of Array.isArray(d.extras) ? d.extras : []) {
      const out = x && x.item && leftOut(x.item);
      if (out) problems.push(`Staples: ${x.item} has ${out} in it, and you leave ${out} out.`);
    }
    if (problems.length) throw new Error(`I did not put this week on the table yet:\n- ${problems.join('\n- ')}`);

    // Grocery list, by store, made from the plan (never separately).
    const lists = {};
    const addItem = (store, item, qty, unit, why) => {
      const s = store || 'Not set to a store yet';
      lists[s] = lists[s] || {};
      const k = `${item.toLowerCase()}|${unit.toLowerCase()}`;
      const cur = lists[s][k] || { item, qty: 0, unit, for: [], unsized: false };
      if (qty == null || Number.isNaN(qty)) cur.unsized = true; else cur.qty += qty;
      if (why && !cur.for.includes(why)) cur.for.push(why);
      lists[s][k] = cur;
    };
    for (const [rid, n] of Object.entries(uses)) {
      const r = recipes[rid];
      const batches = Math.ceil((n * household) / r.serves);
      r.batches = batches;
      for (const i of r.ingredients) addItem(i.store, i.item, i.qty == null ? null : i.qty * batches, i.unit, r.name);
    }
    for (const x of Array.isArray(d.extras) ? d.extras : []) if (x && x.item) addItem(x.store, String(x.item), x.qty == null ? null : Number(x.qty), x.unit ? String(x.unit) : '', 'staples');
    const order = [...stores, 'Not set to a store yet'];
    const grocery = order.filter((s) => lists[s]).map((s) => ({
      store: s,
      items: Object.values(lists[s]).map((x) => ({ item: x.item, qty: x.unsized && !x.qty ? null : r1(x.qty), unit: x.unit, for: x.for })).sort((a, b) => a.item.localeCompare(b.item)),
    }));
    const shopping = need('meal-planning-and-shopping.md', /^The shopping list is made from the meal plan/, 'how the list is made');

    // Prep safety: cooked food keeps a set number of days in the fridge (food-safety card). Beyond that, freeze it.
    const keep = need('food-safety.md', /^Cooked meat or poultry leftovers keep (\d+) to (\d+) days/, 'how long cooked food keeps');
    const keepMax = Number(/keep (\d+) to (\d+) days/.exec(keep)[2]);
    const freeze = need('meal-planning-and-shopping.md', /Freeze the overflow/, 'the freezing step');
    const prepDays = (Array.isArray(d.prep_days) && d.prep_days.length ? d.prep_days : ['sun']).map((k) => String(k).slice(0, 3).toLowerCase());
    const prepIdx = prepDays.map((k) => (k === 'sun' ? -1 : DAYS.indexOf(k))).filter((i) => i >= -1).sort((a, b) => a - b);
    const flags = [];
    days.forEach((day, i) => {
      for (const s of day.slots) {
        if (s.kind !== 'prep') continue;
        const cooked = prepIdx.filter((p) => p <= i).pop();
        if (cooked == null) { flags.push(`${day.name} ${s.slot}: ${s.name} is a prep meal, but no prep day comes before it.`); continue; }
        if (i - cooked > keepMax) flags.push(`${day.name} ${s.slot}: freeze the ${s.name} portion on prep day. It would be ${i - cooked} days old. My food-safety card keeps cooked leftovers ${keepMax} days at most in the fridge, and I hold every prepped meal to that.`);
      }
    });

    const t = targets(d.person);
    const record = {
      id, week_of: id, created: new Date().toISOString(), household, stores, diet, avoid,
      prep_days: prepDays.map((k) => (k === 'sun' ? 'Sunday before' : DAY_NAMES[k])),
      days, recipes: Object.values(recipes).filter((r) => uses[r.id]), grocery,
      targets: t, flags, notes: (Array.isArray(d.notes) ? d.notes : []).map(String),
      safety: { keep, freeze }, shopping, cards: [...used],
    };
    ctx.state.write(weekFile(id), record);
    const links = readJson('links.json', { links: [] });
    const k = linkId();
    const expires = iso(addDays(monday, 13));
    links.links.push({ k, week: id, created: record.created, expires });
    ctx.state.write('links.json', links);
    const meals = days.reduce((n, x) => n + x.slots.length, 0);
    return [
      `This week (from Monday ${id}) is on the table: week.html?k=${k}`,
      `The link stays open until the end of ${expires}. I keep the week after that, and I can open a new link when you ask.`,
      '',
      `${meals} meals over 7 days for ${household}. Recipes: ${record.recipes.filter((r) => r.kind === 'prep').length} for meal prep, ${record.recipes.filter((r) => r.kind === 'quick').length} quick-cook.`,
      `Shopping: ${grocery.map((g) => `${g.store} (${g.items.length})`).join(', ') || 'nothing to buy'}. No prices: I keep none.`,
      ...(diet.length ? [`For: ${diet.join(', ')}.`] : []),
      ...(avoid.length ? [`Leaves out: ${avoid.join(', ')}. I checked every ingredient, staple and meal against it.`] : []),
      t.lines ? `Targets: ${t.lines.map((l) => `${l.what} ${l.value}`).join('; ')}.` : (t.refused ? `Targets: none. ${t.refused}` : `Targets: none yet. ${t.missing}`),
      ...flags.map((f) => `Keep it safe: ${f}`),
      '',
      rests(),
    ].join('\n');
  }

  function weekFor(dateArg) {
    const day = dateArg ? parseDay(dateArg) : new Date();
    if (!day) throw new Error('Give the day as YYYY-MM-DD.');
    const id = iso(mondayOf(day));
    return { id, day, rec: readJson(weekFile(id), null) };
  }

  function today() {
    const { id, day, rec } = weekFor(ctx.args.week || ctx.args._[1]);
    if (!rec) return `There is no week on the table for ${iso(day)} yet. Shall we sit down and plan one?`;
    const key = DAYS[(day.getDay() + 6) % 7];
    const d = rec.days.find((x) => x.key === key);
    const checks = readJson(checksFile(id), { done: {} });
    const lines = d.slots.map((s) => `- ${s.slot}: ${s.name}${s.kind === 'prep' ? ' (from prep day)' : s.kind === 'quick' ? ' (quick cook)' : ''}${checks.done[`${key}.${s.slot}`] ? ' . eaten' : ''}`);
    return [`${d.name} ${d.date}, from the week of ${id}:`, ...(lines.length ? lines : ['- nothing planned today'])].join('\n');
  }

  function track() {
    const { id, day, rec } = weekFor(ctx.args.week || ctx.args._[1]);
    if (!rec) return `There is no week on the table for ${iso(day)} yet, so there is nothing to track.`;
    const checks = readJson(checksFile(id), { done: {}, swapped: {} });
    const upto = (day.getDay() + 6) % 7;
    let planned = 0; let eaten = 0; let swapped = 0;
    const per = rec.days.slice(0, upto + 1).map((d) => {
      const n = d.slots.length;
      const e = d.slots.filter((s) => checks.done[`${d.key}.${s.slot}`]).length;
      const w = d.slots.filter((s) => (checks.swapped || {})[`${d.key}.${s.slot}`]).length;
      planned += n; eaten += e; swapped += w;
      return `- ${d.name}: ${e} of ${n} planned meals eaten${w ? `, ${w} swapped` : ''}`;
    });
    return [`The week of ${id}, through ${rec.days[upto].name}:`, ...per, `So far: ${eaten} of ${planned} planned meals, ${swapped} swapped.`].join('\n');
  }

  function weeks() {
    const links = readJson('links.json', { links: [] });
    const now = iso(new Date());
    const ids = [...new Set(links.links.map((l) => l.week))].sort().reverse();
    if (!ids.length) return 'No weeks on the table yet.';
    return ids.map((w) => {
      const open = links.links.filter((l) => l.week === w && l.expires >= now).pop();
      return `- week of ${w}: ${open ? `open at week.html?k=${open.k} until ${open.expires}` : 'kept; its link has closed (I can open a new one)'}`;
    }).join('\n');
  }

  // What worked: every recipe from the kept weeks, how often it was planned, eaten and swapped (the person's own
  // ticks), and whether to keep it or change it. The recipes themselves sit in each week's file, ready to reuse.
  function worked() {
    const links = readJson('links.json', { links: [] });
    const ids = [...new Set(links.links.map((l) => l.week))].sort().reverse();
    const per = {};
    const used = [];
    for (const id of ids) {
      const rec = readJson(weekFile(id), null);
      if (!rec) continue;
      used.push(id);
      const checks = readJson(checksFile(id), { done: {}, swapped: {} });
      for (const d of rec.days) {
        for (const s of d.slots) {
          if (!s.recipe) continue;
          const r = rec.recipes.find((x) => x.id === s.recipe) || {};
          const k = s.name.toLowerCase();
          const row = per[k] || (per[k] = { name: s.name, kind: r.kind, from: r.source && r.source.card ? 'a recipe card' : 'your recipe box', week: id, planned: 0, eaten: 0, swapped: 0 });
          row.planned += 1;
          if (checks.done[`${d.key}.${s.slot}`]) row.eaten += 1;
          if ((checks.swapped || {})[`${d.key}.${s.slot}`]) row.swapped += 1;
        }
      }
    }
    if (!used.length) return 'No weeks kept yet, so nothing to learn from. We start fresh.';
    const rows = Object.values(per).sort((a, b) => (b.eaten - b.swapped) - (a.eaten - a.swapped));
    const say = (r) => {
      const verdict = !r.eaten && !r.swapped ? 'not ticked yet' : r.swapped > r.eaten ? 'change it' : 'keep it';
      return `- ${r.name} (${r.from}, ${r.kind === 'prep' ? 'meal prep' : 'quick cook'}): planned ${r.planned}, eaten ${r.eaten}, swapped ${r.swapped}. ${verdict}.`;
    };
    return [
      `What worked, from ${used.length} kept ${used.length === 1 ? 'week' : 'weeks'} (latest first: ${used.join(', ')}). Only recipes are counted; plain meals are not.`,
      ...rows.map(say),
      '',
      `To reuse a recipe, copy it from its week file (state/tools/meal-week/week-<monday>.json, "recipes") into the draft.`,
    ].join('\n');
  }

  function showTargets() {
    const d = readJson('draft.json', null);
    const t = targets(d && d.person);
    if (t.missing) return t.missing;
    if (t.refused) return `I won't set targets here. ${t.refused}`;
    return [...t.lines, ...t.meal].map((l) => `- ${l.what}: ${l.value}. ${l.note} (${l.card.replace(/\.md$/, '')})`).concat(['', rests()]).join('\n');
  }

  if (cmd === 'publish') return publish();
  if (cmd === 'today') return today();
  if (cmd === 'track') return track();
  if (cmd === 'weeks') return weeks();
  if (cmd === 'targets') return showTargets();
  if (cmd === 'worked') return worked();
  return 'Use: meal-week.js publish | today [YYYY-MM-DD] | track | weeks | worked | targets';
});
