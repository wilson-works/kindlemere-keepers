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
    $('print').hidden = true;
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
    art.append(el('p', 'from', src.card ? `From my card "${titles[src.card] || src.card.replace(/\.md$/, '')}".` : 'From your own recipe box.'));
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
    $('prep-list').replaceChildren(...(prep.length ? prep.map(recipe) : [el('p', 'quiet', 'No meal prep this week.')]));
    $('quick-list').replaceChildren(...(quick.length ? quick.map(recipe) : [el('p', 'quiet', 'No quick cooks this week.')]));
  }

  /* ---------------------------------------------------------------- shopping, by store */
  function shopping() {
    $('stores').replaceChildren(...w.grocery.map((g) => {
      const sec = el('section', 'store');
      sec.append(el('h3', null, `${g.store} `), el('p', 'quiet small', plural(g.items.length, 'item', 'items')));
      const ul = el('ul', 'basket');
      ul.append(...g.items.map((x, i) => {
        const li = el('li');
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
        return li;
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

  const link = new URLSearchParams(window.location.search).get('k') || '';
  $('print').addEventListener('click', () => window.print());

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
      days();
      recipes();
      shopping();
      targets();
      rests();
      $('body').hidden = false;
      $('letter').setAttribute('aria-busy', 'false');
    } catch (e) {
      closed(e.status === 404 ? 'That link is not one of mine. Ask me for the week in a chat, or open it from Kept weeks at my table.' : e.message);
    }
  }());
}());
