'use strict';

// Avo's table in the Orchard: today's meals, this week, planning with her, and the weeks she has kept.
// The weeks come from her meal-week tool through /api/table; her larder (shelf, memory, tools, Louise) from the kit.
// Nothing here states a fact of its own.
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const plain = (t) => String(t).replace(/\s*(\[\^\d+\]\s*)*@\S+/g, '').trim();
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const local = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d); };
  const short = (iso) => local(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const longDay = (iso) => local(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const day = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  const fail = (box, e) => box.replaceChildren(el('li', 'quiet', e && e.message ? e.message : 'That did not load. Try again in a moment.'));
  const SLOT = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
  const KIND = { prep: 'from prep day', quick: 'quick cook', simple: '' };
  const NEIGHBOURS = {
    fitness: ['Steady', 'Stepping Hill'],
    'dog-training': ['Tumble', 'Lakeside Field'],
    louise: ['Louise', 'the Librarian\'s house'],
  };
  const say = (text) => { $('say').textContent = text; };
  let jokes = [];
  let table = null;

  /* ---------------------------------------------------------------- the place cards on the table */
  const tabs = [...document.querySelectorAll('.places [role="tab"]')];
  function show(tab) {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    }
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', (ev) => {
      const step = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      ev.preventDefault();
      const next = tabs[(i + step + tabs.length) % tabs.length];
      show(next);
      next.focus();
    });
  });

  /* ---------------------------------------------------------------- today */
  function plates() {
    const box = $('plates');
    $('today-name').textContent = local(table.today).toLocaleDateString(undefined, { weekday: 'long' });
    $('today-date').textContent = short(table.today);
    if (!table.thisWeek) {
      const li = el('li', 'empty');
      li.append(el('p', null, 'Nothing is planned for this week yet.'));
      const go = el('button', 'km-btn', 'Plan a week with me');
      go.type = 'button';
      go.addEventListener('click', () => { show($('tab-plan')); $('tab-plan').focus(); });
      li.append(go);
      box.replaceChildren(li);
      return;
    }
    if (!table.todayMeals.length) { box.replaceChildren(el('li', 'quiet', 'Nothing planned for today. A free day.')); return; }
    box.replaceChildren(...table.todayMeals.map((s) => plate(s)));
  }

  function mark(s) {
    const k = `${table.dayKey}.${s.slot}`;
    return table.checks.done[k] ? 'eaten' : table.checks.swapped[k] ? 'swapped' : '';
  }

  function plate(s) {
    const li = el('li', 'plate');
    const now = mark(s);
    if (now) li.classList.add(now);
    const what = el('div', 'plate-what');
    what.append(el('span', 'slot', SLOT[s.slot] || s.slot), el('span', 'dish', s.name));
    if (KIND[s.kind]) what.append(el('span', 'kind', KIND[s.kind]));
    const acts = el('div', 'plate-acts');
    [['eaten', 'Ate it'], ['swapped', 'Swapped it']].forEach(([m, label]) => {
      const b = el('button', 'tick', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(now === m));
      b.setAttribute('aria-label', `${label}: ${SLOT[s.slot] || s.slot}, ${s.name}`);
      b.addEventListener('click', () => check(s, now === m ? 'clear' : m));
      acts.append(b);
    });
    li.append(what, acts);
    return li;
  }

  async function check(s, m) {
    try {
      await kit.api('/api/meal-check', { body: { week: table.thisWeek.id, day: table.dayKey, slot: s.slot, mark: m } });
      await load();
      const left = table.todayMeals.filter((x) => !mark(x));
      if (m === 'eaten') say(left.length ? `Good. Next up, ${SLOT[left[0].slot].toLowerCase()}: ${left[0].name}.` : 'That\'s everything for today. Nicely done.');
      else if (m === 'swapped') say('Swapped is fine. I\'ll count it as a swap when you ask how the week is going.');
    } catch (e) { say(e.message); }
  }

  /* ---------------------------------------------------------------- this week */
  function week() {
    const box = $('days');
    const links = $('week-links');
    const w = table.thisWeek;
    if (!w) {
      box.replaceChildren(el('li', 'quiet', 'No week on the table yet.'));
      links.replaceChildren();
    } else {
      const c = table.checks;
      box.replaceChildren(...w.days.map((d) => {
        const li = el('li', d.key === table.dayKey ? 'today' : null);
        const head = el('div', 'day-head');
        head.append(el('span', 'day-name', d.name), el('span', 'when', short(d.date)));
        const meals = el('ul', 'day-meals');
        meals.append(...(d.slots.length ? d.slots.map((s) => {
          const k = `${d.key}.${s.slot}`;
          const m = el('li', c.done[k] ? 'eaten' : c.swapped[k] ? 'swapped' : null);
          m.append(el('span', 'slot', SLOT[s.slot] || s.slot), el('span', null, s.name));
          return m;
        }) : [el('li', 'quiet', 'Nothing planned.')]));
        li.append(head, meals);
        return li;
      }));
      links.replaceChildren(linkFor(w, 'Open this week\'s plan'));
    }
    const n = table.nextWeek;
    $('next-week').textContent = n ? `Next week (from ${short(n.id)}) is already planned. It's under Kept weeks.` : '';
  }

  // An open link opens the week; a closed one gets a fresh link from the server first.
  function linkFor(w, label) {
    if (w.link) {
      const a = el('a', 'km-btn', label);
      a.href = `/week.html?k=${encodeURIComponent(w.link)}`;
      a.target = '_blank';
      a.rel = 'noopener';
      return a;
    }
    const b = el('button', 'km-btn', 'Open a new link');
    b.type = 'button';
    b.addEventListener('click', async () => {
      try {
        const { k } = await kit.api('/api/week-link', { body: { week: w.id } });
        window.open(`/week.html?k=${encodeURIComponent(k)}`, '_blank', 'noopener');
        await load();
      } catch (e) { say(e.message); }
    });
    return b;
  }

  /* ---------------------------------------------------------------- kept weeks */
  function kept() {
    const box = $('weeks');
    if (!table.kept.length) { box.replaceChildren(el('li', 'quiet', 'No weeks kept yet. The first one we plan goes in here.')); return; }
    box.replaceChildren(...table.kept.map((w) => {
      const li = el('li');
      const what = el('div', 'kept-what');
      what.append(el('span', 'kept-name', `Week of ${short(w.id)}`),
        el('span', 'when', w.link ? `${plural(w.meals, 'meal', 'meals')}. Link open until ${short(w.expires)}.` : `${plural(w.meals, 'meal', 'meals')}. Link closed.`));
      li.append(what, linkFor(w, 'Open'));
      return li;
    }));
  }

  async function load() {
    table = await kit.api('/api/table');
    plates();
    week();
    kept();
  }

  /* ---------------------------------------------------------------- what Avo says first */
  function greet() {
    const joke = jokes.length ? jokes[Math.floor(Math.random() * jokes.length)] : 'Pull up a stool at the long table.';
    if (!table || !table.thisWeek) { say(`${joke} Nothing's planned this week yet. Shall we plan one?`); return; }
    const left = table.todayMeals.filter((s) => !mark(s));
    if (!table.todayMeals.length) say(`${joke} Nothing's planned for today.`);
    else if (!left.length) say('That\'s everything for today. Nicely done.');
    else say(`${longDay(table.today)}. Next up, ${SLOT[left[0].slot].toLowerCase()}: ${left[0].name}.`);
  }

  /* ---------------------------------------------------------------- the larder */
  async function hello() {
    const a = await kit.agent();
    $('name').textContent = a.name;
    $('title').textContent = a.title;
    jokes = Array.isArray(a.jokes) ? a.jokes : [];
    const scope = a.scope || {};
    $('scope-does').replaceChildren(...(scope.does || []).map((s) => el('li', null, s)));
    $('scope-not').replaceChildren(...(scope.does_not || []).map((s) => el('li', null, s)));
    $('weave').replaceChildren(...(scope.hands_to || []).map((h) => {
      const [who, where] = NEIGHBOURS[h.to] || [h.to, ''];
      const li = el('li');
      li.append(el('strong', null, where ? `${who}, ${where}` : who), el('span', null, h.what));
      return li;
    }));
  }

  function shelfCard(c, open) {
    const item = el('li');
    const head = el('button', 'card-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(Boolean(open)));
    head.append(el('span', 'card-title', c.title), el('span', 'card-meta', plural((c.facts || []).length, 'fact', 'facts')));
    const facts = el('ul', 'facts');
    facts.append(...(c.facts || []).map((f) => {
      const li = el('li', null, plain(f.text));
      const where = (f.sources || []).map((s) => `${s.page}${s.line ? `:${s.line}` : ''}`).join(', ');
      if (where) li.append(el('span', 'km-source', `Louise's page ${where}`));
      return li;
    }));
    facts.hidden = !open;
    head.addEventListener('click', () => {
      const now = head.getAttribute('aria-expanded') !== 'true';
      head.setAttribute('aria-expanded', String(now));
      facts.hidden = !now;
    });
    item.append(head, facts);
    return item;
  }

  async function shelf() {
    const box = $('shelf');
    try {
      const { cards } = await kit.api('/api/shelf');
      $('shelf-count').textContent = plural(cards.length, 'card', 'cards');
      box.replaceChildren(...cards.map((c) => shelfCard(c, false)));
    } catch (e) { fail(box, e); }
  }

  async function search(ev) {
    ev.preventDefault();
    const q = $('q').value.trim();
    const box = $('found');
    if (!q) { box.replaceChildren(); return; }
    try {
      const { cards } = await kit.api(`/api/shelf?q=${encodeURIComponent(q)}`);
      if (!cards.length) {
        box.replaceChildren(el('p', 'quiet', `Nothing on my shelf about "${q}" yet. Ask me in a chat and I'll send a lantern to Louise.`));
        return;
      }
      const list = el('ul', 'cards');
      list.append(...cards.slice(0, 4).map((c, i) => shelfCard(c, i === 0)));
      box.replaceChildren(list);
    } catch (e) { box.replaceChildren(el('p', 'quiet', e.message)); }
  }

  async function memory() {
    const box = $('memory');
    try {
      const m = await kit.api('/api/memory');
      const rows = [
        [m.facts.length, 'thing you told me', 'things you told me'],
        [m.worked.length, 'note on what worked', 'notes on what worked'],
        [m.lessons.length, 'lesson I keep', 'lessons I keep'],
      ];
      box.replaceChildren(...rows.map(([n, one, many]) => {
        const li = el('li');
        li.append(el('strong', null, String(n)), el('span', null, n === 1 ? one : many));
        return li;
      }));
    } catch (e) { fail(box, e); }
  }

  async function tools() {
    const box = $('tools');
    try {
      const list = (await kit.api('/api/tools')).tools || [];
      if (!list.length) { box.replaceChildren(el('li', 'quiet', 'No tools yet.')); return; }
      box.replaceChildren(...list.map((t) => {
        const li = el('li');
        li.append(el('span', 'tool-name', t.name), el('span', 'tool-purpose', t.purpose));
        if (t.ok === false) li.append(el('span', 'tool-off', 'Changed since it was checked, so it will not run yet.'));
        return li;
      }));
    } catch (e) { fail(box, e); }
  }

  async function louise() {
    const box = $('louise');
    try {
      const { requests = [], gaps = [] } = await kit.api('/api/louise');
      const pending = requests.filter((r) => r.status === 'pending');
      const learned = requests.filter((r) => r.status === 'learned');
      const toAsk = gaps.filter((g) => !g.asked);
      $('louise-count').textContent = `${plural(pending.length, 'lantern', 'lanterns')} out`;
      const row = (cls, topic, state) => {
        const li = el('li', cls);
        const body = el('div', 'ask-body');
        body.append(el('span', 'ask-topic', topic), el('span', 'ask-state', state));
        li.append(body);
        return li;
      };
      const items = [
        ...pending.map((r) => row('km-lantern', r.topic, `Sent ${day(r.asked)}. Waiting for her book.`)),
        ...learned.map((r) => row('later', r.topic, 'Her book came back. I learned it.')),
        ...toAsk.map((g) => row('later', g.topic, 'Not sent yet. My book did not cover it.')),
      ];
      box.replaceChildren(...(items.length ? items : [el('li', 'quiet', 'Nothing waiting on Louise.')]));
    } catch (e) { fail(box, e); }
  }

  const larder = $('larder');
  let larderLoaded = false;
  $('larder-open').addEventListener('click', () => {
    larder.showModal();
    if (larderLoaded) return;
    larderLoaded = true;
    shelf();
    memory();
    tools();
    louise();
  });
  $('larder-close').addEventListener('click', () => larder.close());
  $('ask').addEventListener('submit', search);

  // Until the kit's close view loads, the table stands on its own.
  const scene = $('scene');
  const drop = () => $('stage').classList.add('no-art');
  scene.addEventListener('error', drop);
  if (scene.complete && !scene.naturalWidth) drop();

  hello().catch(() => {}).then(() => load()).then(greet).catch((e) => {
    say('My table did not load. Try again in a moment.');
    fail($('plates'), e);
  });
}());
