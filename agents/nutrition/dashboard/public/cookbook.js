'use strict';

// "My cookbook" drawer, the recipes: search, filter by meal and diet, open one (ingredients by aisle, steps, meal-prep
// notes, the page it came from) and add it to this week. Every recipe comes from /api/cookbook (her cookbook file);
// adding runs her meal-week tool on the server, so the week, its prep schedule and its shopping list follow.
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const MEALS = [['', 'All'], ['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['side', 'Sides'], ['snack', 'Snacks'], ['treat', 'Treats']];
  const DIETS = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'egg-free', 'nut-free', 'low-sodium', 'diabetes-friendly', 'high-protein', 'kid-friendly'];
  const KEEPER = { avo: 'Avo', spud: 'Spud', summer: 'Summer' };
  const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
  const SLOT_OF = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', side: 'dinner', snack: 'snack', treat: 'snack' };
  const SLOTS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Treat']];
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const state = { meal: '', diets: new Set(), q: '' };
  let all = [];
  let loaded = false;

  function toggles(box, items, pressed, onPress) {
    box.replaceChildren(...items.map(([value, label]) => {
      const b = el('button', 'rchip', label);
      b.type = 'button';
      b.dataset.value = value;
      b.setAttribute('aria-pressed', String(pressed(value)));
      b.addEventListener('click', () => { onPress(value); [...box.children].forEach((c) => c.setAttribute('aria-pressed', String(pressed(c.dataset.value)))); draw(); });
      return b;
    }));
  }

  function fits(r) {
    if (state.meal && r.meal !== state.meal) return false;
    for (const d of state.diets) if (!r.diet.includes(d)) return false;
    if (state.q) {
      const hay = `${r.title.toLowerCase()} ${r.words}`;
      if (!state.q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }

  function draw() {
    const list = all.filter(fits);
    $('recipes-count').textContent = `${list.length} of ${all.length}`;
    const ul = $('rlist');
    if (!list.length) {
      ul.replaceChildren(el('li', 'quiet', 'Nothing in my cookbook fits all of that. I never make a recipe up: try fewer filters, or ask me and I will look one up and name its page.'));
      return;
    }
    ul.replaceChildren(...list.map((r) => {
      const li = el('li');
      const b = el('button', 'rrow');
      b.type = 'button';
      b.append(el('span', 'rtitle', r.title));
      b.append(el('span', 'rmeta', [cap(r.meal), `${KEEPER[r.keeper]}'s`, `serves ${r.servings}`, r.minutes ? `${r.minutes} min` : '', r.batch ? 'batch-friendly' : ''].filter(Boolean).join(' · ')));
      b.addEventListener('click', () => open(r.id));
      li.append(b);
      return li;
    }));
  }

  function amount(i) {
    const q = i.qty_text || (i.qty == null ? '' : String(i.qty));
    return [q, i.unit].filter(Boolean).join(' ');
  }

  async function open(id) {
    const box = $('rrecipe');
    box.hidden = false;
    box.replaceChildren(el('p', 'quiet', 'Taking it down from the shelf.'));
    let r;
    try { r = await kit.api(`/api/recipe?id=${encodeURIComponent(id)}`); } catch (e) { box.replaceChildren(el('p', 'quiet', e.message)); return; }
    const back = el('button', 'km-btn km-btn-quiet rback', 'Back to the list');
    back.type = 'button';
    back.addEventListener('click', () => { box.hidden = true; $('rlist').hidden = false; $('rfilters').hidden = false; });
    const head = el('div', 'rhead');
    head.append(el('h4', null, r.title), back);
    const meta = el('p', 'rmeta', [cap(r.meal), `kept by ${KEEPER[r.keeper]}`, `serves ${r.servings}${r.serving_size ? ` (${r.serving_size})` : ''}`,
      r.prep_min != null ? `prep ${r.prep_min} min` : '', r.cook_min != null ? `cook ${r.cook_min} min` : ''].filter(Boolean).join(' · '));
    const tags = el('ul', 'rtags');
    tags.append(...r.diet.map((d) => el('li', 'km-chip', d)));
    const contains = el('p', 'rcontains');
    contains.append(el('span', 'dot', ''), document.createTextNode(r.allergens.length ? `Contains ${r.allergens.join(', ')}` : 'None of the nine major allergens in its ingredients'));
    if (r.optional_allergens.length) contains.append(document.createTextNode(`; the optional extras add ${r.optional_allergens.join(', ')}`));
    contains.append(document.createTextNode('.'));
    const parts = [head, meta, tags, contains];
    if (r.check_labels.length) parts.push(el('p', 'quiet small', `Check the label on: ${r.check_labels.join('; ')}.`));

    const ing = el('div', 'ring');
    ing.append(el('h5', null, 'Ingredients, by aisle'));
    const byAisle = {};
    for (const i of r.ingredients) (byAisle[i.aisle] = byAisle[i.aisle] || []).push(i);
    for (const a of Object.keys(byAisle).sort()) {
      if (a !== 'none') ing.append(el('p', 'raisle', cap(a)));
      const ul = el('ul', 'ringredients');
      ul.append(...byAisle[a].map((i) => el('li', null, `${[amount(i), i.item].filter(Boolean).join(' ')}${i.prep ? `, ${i.prep}` : ''}${i.optional ? ' (optional)' : ''}`)));
      ing.append(ul);
    }
    const steps = el('div', 'rsteps');
    steps.append(el('h5', null, 'Steps, in short'));
    const ol = el('ol');
    ol.append(...r.steps.map((s) => el('li', null, s)));
    steps.append(ol);
    const prep = el('div', 'rprep');
    prep.append(el('h5', null, 'For meal prep'));
    prep.append(el('p', null, `${r.prep.batch ? 'Good to batch-cook.' : 'Best made when you eat it.'} Fridge: ${r.prep.fridge}. Freezer: ${r.prep.freezes ? r.prep.freezer : `no, ${r.prep.freezer}`}. ${r.prep.reheat}`));
    const basis = el('p', 'quiet small', 'Keep-times from ');
    const ba = el('a', null, r.prep.basis.name);
    ba.href = r.prep.basis.url; ba.target = '_blank'; ba.rel = 'noopener noreferrer';
    basis.append(ba, document.createTextNode('.'));
    prep.append(basis);
    if (r.prep.recipe_note) prep.append(el('p', 'quiet small', `The recipe page says: ${r.prep.recipe_note}`));
    const src = el('p', 'rsource', `From ${r.source.name}: `);
    const sa = el('a', null, r.source.title);
    sa.href = r.source.url; sa.target = '_blank'; sa.rel = 'noopener noreferrer';
    src.append(sa, document.createTextNode(` (opened ${r.source.fetched}). Amounts, servings and times are the page's; the steps are ours, in short.`));

    // Add to this week: a day and a meal, then her meal-week tool puts the week back on the table.
    const form = el('form', 'radd');
    const today = DAYS[(new Date().getDay() + 6) % 7][0];
    const day = el('select', 'km-field');
    day.id = 'radd-day';
    day.append(...DAYS.map(([k, n]) => { const o = el('option', null, n); o.value = k; o.selected = k === today; return o; }));
    const slot = el('select', 'km-field');
    slot.id = 'radd-slot';
    slot.append(...SLOTS.map(([k, n]) => { const o = el('option', null, n); o.value = k; o.selected = k === SLOT_OF[r.meal]; return o; }));
    const dl = el('label', 'sr', 'Day'); dl.htmlFor = 'radd-day';
    const sl = el('label', 'sr', 'Meal'); sl.htmlFor = 'radd-slot';
    const go = el('button', 'km-btn', 'Add to this week');
    go.type = 'submit';
    const said = el('p', 'radd-said');
    said.setAttribute('aria-live', 'polite');
    form.append(dl, day, sl, slot, go);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      go.disabled = true;
      said.replaceChildren(document.createTextNode('Putting it on the week.'));
      try {
        const res = await kit.api('/api/cookbook-add', { method: 'POST', body: { id: r.id, day: day.value, slot: slot.value } });
        said.replaceChildren(document.createTextNode(`${res.message} `));
        if (res.link) {
          const a = el('a', null, 'Open the week: plan, prep and shopping');
          a.href = `/week.html?k=${res.link}`;
          said.append(a);
        }
        window.dispatchEvent(new CustomEvent('avo:week-changed'));
      } catch (err) {
        said.replaceChildren(document.createTextNode(err.message || 'That did not go on the week. Try again in a moment.'));
      } finally { go.disabled = false; }
    });
    parts.push(form, said, ing, steps, prep, src);
    box.replaceChildren(...parts);
    $('rlist').hidden = true;
    $('rfilters').hidden = true;
    box.scrollIntoView({ block: 'nearest' });
  }

  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const lib = await kit.api('/api/cookbook');
      all = lib.recipes || [];
    } catch (e) {
      $('rlist').replaceChildren(el('li', 'quiet', e.message || 'My cookbook did not open. Try again in a moment.'));
      loaded = false;
      return;
    }
    toggles($('rmeals'), MEALS, (v) => state.meal === v, (v) => { state.meal = v; });
    toggles($('rdiets'), DIETS.map((d) => [d, d]), (v) => state.diets.has(v), (v) => { if (state.diets.has(v)) state.diets.delete(v); else state.diets.add(v); });
    draw();
  }

  $('rq').addEventListener('input', () => { state.q = $('rq').value.trim().toLowerCase(); draw(); });
  $('rfind').addEventListener('submit', (e) => e.preventDefault());
  $('cookbook-open').addEventListener('click', load);
}());
