'use strict';

// One week from Avo's table, opened by its link. Everything on it was laid out by her meal-week tool when the
// week was planned (state/tools/meal-week on this computer). Meal ticks go back to her; shopping ticks stay in
// this browser only.
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const plain = (t) => String(t || '').replace(/\s*(\[\^\d+\]\s*)*@\S+/g, '').trim();
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const local = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d); };
  const short = (iso) => local(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const long = (iso) => local(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const SLOT = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Treat' };
  const KEEPER = { breakfast: 'Avo', lunch: 'Avo', snack: 'Summer', dinner: 'Spud' };
  const amount = (x) => [x.qty == null ? '' : String(x.qty), x.unit || ''].filter(Boolean).join(' ');
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { if (v) window.localStorage.setItem(k, v); else window.localStorage.removeItem(k); } catch (_) { /* this browser keeps nothing */ } },
  };
  let titles = {};
  let w = null;
  let checks = { done: {}, swapped: {} };

  function closed(text) {
    $('week-h').textContent = 'This link is closed';
    $('lead').textContent = text;
    $('letter').setAttribute('aria-busy', 'false');
  }

  /* ---------------------------------------------------------------- the week, with a tick for each meal */
  function days() {
    $('days').replaceChildren(...w.days.map((d) => {
      const li = el('li');
      li.append(el('h3', null, `${d.name}, ${short(d.date)}`));
      const meals = el('ul', 'meals');
      meals.append(...(d.slots.length ? d.slots.map((s) => meal(d, s)) : [el('li', 'quiet', 'Nothing planned.')]));
      li.append(meals);
      return li;
    }));
    $('flags').replaceChildren(...(w.flags || []).map((f) => el('li', null, f)));
  }

  function meal(d, s) {
    const k = `${d.key}.${s.slot}`;
    const now = checks.done[k] ? 'eaten' : checks.swapped[k] ? 'swapped' : '';
    const li = el('li', now || null);
    const what = el('div', 'meal-what');
    const slot = el('span', 'slot', SLOT[s.slot] || s.slot);
    if (KEEPER[s.slot]) slot.append(el('span', 'keeper', ` with ${KEEPER[s.slot]}`));
    what.append(slot);
    if (s.recipe) {
      const a = el('a', 'dish', s.name);
      a.href = `#r-${s.recipe}`;
      what.append(a);
    } else what.append(el('span', 'dish', s.name));
    if (s.kind === 'prep') what.append(el('span', 'kind', 'from prep day'));
    if (s.kind === 'quick') what.append(el('span', 'kind', 'quick cook'));
    const acts = el('div', 'acts');
    [['eaten', 'Ate it'], ['swapped', 'Swapped']].forEach(([m, label]) => {
      const b = el('button', 'tick', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(now === m));
      b.setAttribute('aria-label', `${label}: ${d.name} ${SLOT[s.slot] || s.slot}, ${s.name}`);
      b.addEventListener('click', async () => {
        try {
          await kit.api('/api/meal-check', { body: { week: w.id, day: d.key, slot: s.slot, mark: now === m ? 'clear' : m } });
          checks = (await kit.api(`/api/week?k=${encodeURIComponent(link)}`)).checks;
          days();
        } catch (e) { b.textContent = e.message; }
      });
      acts.append(b);
    });
    li.append(what, acts);
    return li;
  }

  /* ---------------------------------------------------------------- recipes */
  function recipe(r) {
    const art = el('article', 'recipe');
    art.id = `r-${r.id}`;
    art.append(el('h3', null, r.name));
    const meta = [];
    meta.push(`Serves ${r.serves}`);
    if (r.batches) meta.push(`make it ${plural(r.batches, 'time', 'times')} this week`);
    if (r.minutes) meta.push(`about ${r.minutes} minutes`);
    art.append(el('p', 'meta', meta.join(', ') + '.'));
    const src = r.source || {};
    if (src.cookbook) {
      // A cookbook recipe names the page it came from.
      const from = el('p', 'from', `From my cookbook: ${src.name || 'a recipe page'}, `);
      const a = el('a', null, 'the recipe page');
      a.href = src.url;
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
      from.append(a, document.createTextNode('.'));
      art.append(from);
    } else art.append(el('p', 'from', src.card ? `From my card "${titles[src.card] || src.card.replace(/\.md$/, '')}".` : 'From your own recipe box.'));
    if (r.prep) art.append(el('p', 'meta', `${r.prep.fridge_days ? `Keeps ${r.prep.fridge} in the fridge` : `${r.prep.fridge[0].toUpperCase()}${r.prep.fridge.slice(1)}`}. Freezer: ${r.prep.freezes ? r.prep.freezer : `no, ${r.prep.freezer}`}. ${r.prep.reheat}`));
    if (r.ingredients.length) {
      art.append(el('h4', null, 'For one batch'));
      const ul = el('ul', 'ingredients');
      ul.append(...r.ingredients.map((i) => {
        const li = el('li');
        li.append(el('span', null, [amount(i), i.item].filter(Boolean).join(' ')));
        if (i.store) li.append(el('span', 'where', i.store));
        return li;
      }));
      art.append(ul);
    }
    if (r.steps.length) {
      art.append(el('h4', null, 'Steps'));
      const ol = el('ol', 'steps');
      ol.append(...r.steps.map((s) => el('li', null, s)));
      art.append(ol);
    }
    return art;
  }

  function recipes() {
    const prep = w.recipes.filter((r) => r.kind === 'prep');
    const quick = w.recipes.filter((r) => r.kind !== 'prep');
    $('prep-days').textContent = prep.length ? `Prep day${w.prep_days.length > 1 ? 's' : ''}: ${w.prep_days.join(' and ')}. ${plain(w.safety && w.safety.keep)}` : '';
    // The batch-prep schedule: per prep day, what to cook (longest first), how many batches, eat by, and what to freeze.
    const plan = (w.prep_plan || []).map((p) => {
      const box = el('div', 'prep-plan');
      box.append(el('h3', null, `Prep ${p.day}: cook in this order`));
      const ol = el('ol', 'steps');
      ol.append(...p.cook.map((c) => el('li', null, `${c.name}: ${plural(c.batches, 'batch', 'batches')} (${plural(c.portions, 'portion', 'portions')}${c.minutes ? `, about ${c.minutes} minutes` : ''}). Eat from the fridge by ${c.use_by}${c.fridge.length ? ` (${c.fridge.join(', ')})` : ''}.${c.freeze.length ? ` Freeze for ${c.freeze.join(', ')}.` : ''}`)));
      box.append(ol);
      return box;
    });
    $('prep-list').replaceChildren(...plan, ...(prep.length ? prep.map(recipe) : [el('p', 'quiet', 'No meal prep this week.')]));
    $('quick-list').replaceChildren(...(quick.length ? quick.map(recipe) : [el('p', 'quiet', 'No quick cooks this week.')]));
  }

  /* ---------------------------------------------------------------- shopping, by store */
  function shopping() {
    $('stores').replaceChildren(...w.grocery.map((g) => {
      const sec = el('section', 'store');
      sec.append(el('h3', null, `${g.store} `), el('p', 'quiet small', plural(g.items.length, 'item', 'items')));
      const ul = el('ul', 'basket');
      let aisle = null;
      ul.append(...g.items.flatMap((x, i) => {
        const li = el('li');
        // Items come sorted by aisle; each new aisle gets its name above it.
        const head = x.aisle && x.aisle !== aisle ? [el('li', 'aisle', x.aisle[0].toUpperCase() + x.aisle.slice(1))] : [];
        if (x.aisle) aisle = x.aisle;
        const key = `avo-shop:${w.id}:${g.store}:${x.item}:${x.unit}`;
        const id = `buy-${g.store.replace(/\W+/g, '')}-${i}`;
        const box = el('input');
        box.type = 'checkbox';
        box.id = id;
        box.checked = store.get(key) === '1';
        box.addEventListener('change', () => store.set(key, box.checked ? '1' : ''));
        const label = el('label');
        label.htmlFor = id;
        label.append(el('span', 'item', [amount(x), x.item].filter(Boolean).join(' ')));
        if (x.for && x.for.length) label.append(el('span', 'for', `for ${x.for.join(', ')}`));
        li.append(box, label);
        return [...head, li];
      }));
      sec.append(ul);
      return sec;
    }));
  }

  /* ---------------------------------------------------------------- targets */
  function targets() {
    const t = w.targets || {};
    const box = $('target-body');
    if (t.refused) { box.replaceChildren(el('p', null, `I won't set targets for this week. ${plain(t.refused)}`)); return; }
    if (t.missing) { box.replaceChildren(el('p', null, t.missing)); return; }
    const table = (caption, rows) => {
      const tb = el('table', 'targets');
      tb.append(el('caption', null, caption));
      const head = el('tr');
      ['', 'Target', 'How I got it'].forEach((h) => head.append(el('th', null, h)));
      const thead = el('thead');
      thead.append(head);
      tb.append(thead);
      const body = el('tbody');
      body.append(...rows.map((l) => {
        const tr = el('tr');
        const th = el('th', null, l.what);
        th.scope = 'row';
        const how = el('td');
        how.append(el('span', null, plain(l.note)), el('span', 'card-name', `My card "${titles[l.card] || l.card.replace(/\.md$/, '')}"`));
        tr.append(th, el('td', 'val', l.value), how);
        return tr;
      }));
      tb.append(body);
      return tb;
    };
    box.replaceChildren(table('Each day', t.lines || []), table('Each meal', t.meal || []));
  }

  /* ---------------------------------------------------------------- where it comes from */
  function rests() {
    $('rests').replaceChildren(...(w.cards || []).map((c) => el('li', null, `My card "${titles[c] || c.replace(/\.md$/, '')}"`)),
      el('li', null, plain(w.shopping)));
    $('notes').replaceChildren(...(w.notes || []).map((n) => el('li', null, n)));
  }

  /* ---------------------------------------------------------------- the fridge calendar */
  // One US Letter page, landscape: the 7 days across, the meals down, a box to tick each. Printed on its own.
  function fridge() {
    const box = $('fridge');
    const head = el('div', 'cal-head');
    head.append(el('h2', null, `Avo's table: the week of ${long(w.id)}`));
    const meta = [`For ${plural(w.household, 'person', 'people')}`];
    if (w.prep_days.length && w.recipes.some((r) => r.kind === 'prep')) meta.push(`Prep: ${w.prep_days.join(' and ')}`);
    if (w.diet && w.diet.length) meta.push(w.diet.join(', '));
    if (w.avoid && w.avoid.length) meta.push(`Leaves out: ${w.avoid.join(', ')}`);
    head.append(el('p', null, meta.join('  ·  ')));
    const table = el('table', 'cal');
    const top = el('tr');
    top.append(el('th', 'corner', ''));
    for (const d of w.days) {
      const th = el('th');
      th.scope = 'col';
      th.append(el('span', 'cal-day', d.name), el('span', 'cal-date', short(d.date)));
      top.append(th);
    }
    const thead = el('thead');
    thead.append(top);
    const body = el('tbody');
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
      if (!w.days.some((d) => d.slots.some((s) => s.slot === slot))) continue;
      const tr = el('tr');
      const th = el('th');
      th.scope = 'row';
      th.append(el('span', 'cal-slot', SLOT[slot]), el('span', 'cal-who', KEEPER[slot]));
      tr.append(th);
      for (const d of w.days) {
        const s = d.slots.find((x) => x.slot === slot);
        const td = el('td');
        if (s) {
          td.append(el('span', 'cal-box', ''), el('span', 'cal-dish', s.name));
          if (s.kind === 'prep') td.append(el('span', 'cal-kind', 'from prep'));
          if (s.kind === 'quick') td.append(el('span', 'cal-kind', 'quick cook'));
        }
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(thead, body);
    const prep = w.recipes.filter((r) => r.kind === 'prep' && r.batches);
    const foot = el('p', 'cal-foot');
    if (prep.length) foot.append(el('strong', null, 'Prep day: '), document.createTextNode(prep.map((r) => `${r.name}, ${plural(r.batches, 'batch', 'batches')}`).join('; ') + '. '));
    foot.append(document.createTextNode('Recipes and shopping are on the full plan.'));
    box.replaceChildren(head, table, foot);
  }

  // Print just the fridge calendar, or everything. The page class picks what prints; it is cleared afterwards.
  function printOnly(fridgeOnly) {
    document.body.classList.toggle('print-fridge', fridgeOnly);
    window.print();
  }
  window.addEventListener('afterprint', () => { if (params.get('print') !== 'fridge') document.body.classList.remove('print-fridge'); });

  // Download the week as one file that opens anywhere, with nothing to fetch: the fridge calendar, recipes,
  // shopping and targets, copied from this page with its buttons left out.
  function download() {
    const parts = ['fridge', 'prep', 'quick', 'shop', 'targets'].map((id) => {
      const c = $(id).cloneNode(true);
      c.removeAttribute('hidden');
      c.querySelectorAll('.acts, img, .jump').forEach((x) => x.remove());
      c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      c.removeAttribute('id');
      return c.outerHTML;
    });
    const css = [
      '@page{size:letter;margin:.5in}@page cal{size:letter landscape;margin:.4in}',
      'body{font:14px/1.45 "Segoe UI",system-ui,sans-serif;color:#1A2433;max-width:960px;margin:24px auto;padding:0 16px}',
      'h1,h2,h3{font-family:Candara,"Gill Sans","Trebuchet MS",sans-serif;color:#525C12}',
      '.fridge{page:cal}.cal{width:100%;border-collapse:collapse;table-layout:fixed}',
      '.cal th,.cal td{border:1px solid #bbb;padding:6px;vertical-align:top;text-align:left;font-size:12px}',
      '.cal-day,.cal-slot{display:block;font-weight:700}.cal-date,.cal-who,.cal-kind{display:block;color:#555;font-size:11px}',
      '.cal-box{display:inline-block;width:10px;height:10px;border:1.5px solid #555;border-radius:2px;margin-right:4px}',
      '.km-card,.store,.recipe{border:1px solid #ddd;border-radius:12px;padding:12px 16px;margin:16px 0;break-inside:avoid}',
      'ul,ol{padding-left:20px}.basket,.ingredients,.ticks{list-style:none;padding-left:0}',
      '.where,.for,.card-name,.quiet,.small{color:#555;font-size:12px}.targets{width:100%;border-collapse:collapse}',
      '.targets th,.targets td{text-align:left;vertical-align:top;padding:4px 8px 4px 0;border-top:1px solid #ddd}',
      '.recipes,.stores{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}',
      '.fridge>.cal-head p{color:#555}.cal-foot{font-size:12px}',
    ].join('');
    const title = `Avo's table: the week of ${long(w.id)}`;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body><h1>${esc(title)}</h1>${parts.join('')}<p class="quiet">Planned with Avo at the Orchard. Every recipe came from a recipe card or your own recipe box; every target from one of her cards. No prices.</p></body></html>`;
    const a = el('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = `avo-week-${w.id}.html`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const params = new URLSearchParams(window.location.search);
  const link = params.get('k') || '';
  // A link ending in &print=fridge opens ready to print the fridge calendar alone.
  if (params.get('print') === 'fridge') document.body.classList.add('print-fridge');
  $('print-fridge').addEventListener('click', () => printOnly(true));
  $('print-all').addEventListener('click', () => printOnly(false));
  $('download').addEventListener('click', download);

  (async function open() {
    try {
      const [answer, shelf] = await Promise.all([
        kit.api(`/api/week?k=${encodeURIComponent(link)}`),
        kit.api('/api/shelf').catch(() => ({ cards: [] })),
      ]);
      titles = Object.fromEntries((shelf.cards || []).map((c) => [c.file, c.title]));
      if (answer.closed) {
        closed(`The link to the week of ${short(answer.week)} closed on ${short(answer.expires)}. I still have the week: open a new link from Kept weeks at my table, or ask me in a chat.`);
        return;
      }
      w = answer.week;
      checks = answer.checks;
      document.title = `Week of ${short(w.id)}, at Avo's table`;
      $('week-h').textContent = `The week of ${long(w.id)}`;
      const meals = w.days.reduce((n, d) => n + d.slots.length, 0);
      $('lead').textContent = `${plural(meals, 'meal', 'meals')} for ${plural(w.household, 'person', 'people')}, planned together at my table.`;
      $('facts-row').replaceChildren(
        el('li', 'km-chip', `${plural(w.recipes.filter((r) => r.kind === 'prep').length, 'prep recipe', 'prep recipes')}`),
        el('li', 'km-chip', `${plural(w.recipes.filter((r) => r.kind !== 'prep').length, 'quick cook', 'quick cooks')}`),
        el('li', 'km-chip', `${plural(w.grocery.length, 'store', 'stores')}`),
        el('li', 'km-chip', `Link open until ${short(answer.expires)}`),
      );
      if (w.diet && w.diet.length) $('facts-row').append(el('li', 'km-chip', `For: ${w.diet.join(', ')}`));
      if (w.avoid && w.avoid.length) $('facts-row').append(el('li', 'km-chip', `Leaves out: ${w.avoid.join(', ')}`));
      fridge();
      days();
      recipes();
      shopping();
      targets();
      rests();
      $('body').hidden = false;
      $('take').hidden = false;
      $('letter').setAttribute('aria-busy', 'false');
    } catch (e) {
      closed(e.status === 404 ? 'That link is not one of mine. Ask me for the week in a chat, or open it from Kept weeks at my table.' : e.message);
    }
  }());
}());
