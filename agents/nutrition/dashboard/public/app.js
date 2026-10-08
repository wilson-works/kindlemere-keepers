'use strict';

// Avo's table in the Orchard: today's meals, this week, planning with her, and the weeks she has kept.
// The weeks come from her meal-week tool through /api/table; her cookbook (shelf, memory, tools, Louise) from the kit.
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
  const SLOT = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Treat' };
  // Who keeps each meal (owner, 2026-10-08): Avo breakfast and lunch, Summer the peach the treats, Spud the potato dinner.
  const KEEPER = { breakfast: 'Avo', lunch: 'Avo', snack: 'Summer', dinner: 'Spud' };
  const KIND = { prep: 'from prep day', quick: 'quick cook', simple: '' };
  const NEIGHBOURS = {
    fitness: ['Steady', 'Stepping Hill'],
    'dog-training': ['Tumble', 'Lakeside Field'],
    louise: ['Louise', 'the Librarian\'s house'],
  };
  // Avo's face beside her words, in the mood the kit drew (kit/art/keepers/nutrition-<mood>.svg). Summer and Spud
  // speak in words only until the kit draws them.
  const MOODS = { happy: 'Avo, smiling', thinking: 'Avo, thinking', oh: 'Avo, surprised', worried: 'Avo, worried', sleepy: 'Avo, sleepy' };
  const face = $('face');
  face.addEventListener('error', () => { face.hidden = true; face.dataset.broken = '1'; });
  face.addEventListener('load', () => { if (!face.dataset.who) face.hidden = false; });
  function mood(name, who) {
    face.dataset.who = who && who !== 'Avo' ? who : '';
    if (face.dataset.who || face.dataset.broken || !MOODS[name]) { face.hidden = true; return; }
    const src = `/kit/art/keepers/nutrition-${name}.svg`;
    if (!face.src.endsWith(src)) face.src = src;
    face.alt = MOODS[name];
    face.hidden = !face.complete || !face.naturalWidth;
  }
  // Whoever is talking is named in the bubble; Avo's own lines carry no name.
  const say = (text, who, feel) => {
    const box = $('say');
    box.replaceChildren();
    if (who && who !== 'Avo') box.append(el('span', 'speaker', who));
    box.append(document.createTextNode(text));
    mood(feel || 'happy', who);
  };
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
    const items = table.prep ? [prepDay(table.prep)] : [];
    if (!table.todayMeals.length) items.push(el('li', 'quiet', 'Nothing planned for today. A free day.'));
    else items.push(...table.todayMeals.map((s) => plate(s)));
    box.replaceChildren(...items);
  }

  // How to make a dish: its ingredients for one batch and its steps, folded until asked for.
  function howTo(r, label) {
    const d = el('details', 'how');
    d.append(el('summary', null, label || 'How to make it'));
    if (r.serves) {
      const meta = [`Serves ${r.serves}`];
      if (r.minutes) meta.push(`about ${r.minutes} minutes`);
      d.append(el('p', 'quiet small', `${meta.join(', ')}. ${r.source && r.source.card ? 'From one of my recipe cards.' : 'From your own recipe box.'}`));
    }
    if (r.ingredients && r.ingredients.length) {
      const ul = el('ul', 'ingredients');
      ul.append(...r.ingredients.map((i) => el('li', null, [i.qty == null ? '' : i.qty, i.unit, i.item].filter((x) => x !== '' && x != null).join(' '))));
      d.append(ul);
    }
    if (r.steps && r.steps.length) {
      const ol = el('ol', 'steps');
      ol.append(...r.steps.map((s) => el('li', null, s)));
      d.append(ol);
    }
    return d;
  }

  // A prep day: what to batch-cook now for the days ahead, and how long it keeps.
  function prepDay(p) {
    const li = el('li', 'prep-day');
    li.append(el('h3', null, 'Prep day'));
    li.append(el('p', null, `Cook these today for the meals through ${p.through}.`));
    const ul = el('ul', 'cook');
    ul.append(...p.cook.map((c) => {
      const row = el('li');
      row.append(el('span', 'dish', c.name), el('span', 'kind', `${c.portions} portions: ${c.batches} ${c.batches === 1 ? 'batch' : 'batches'}`));
      row.append(howTo({ ingredients: c.ingredients, steps: c.steps }, 'One batch, step by step'));
      return row;
    }));
    li.append(ul);
    if (p.keep) li.append(el('p', 'quiet small', plain(p.keep)));
    return li;
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
    const slot = el('span', 'slot', SLOT[s.slot] || s.slot);
    if (KEEPER[s.slot]) slot.append(el('span', 'keeper', ` with ${KEEPER[s.slot]}`));
    what.append(slot, el('span', 'dish', s.name));
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
    const r = s.recipe && table.todayRecipes && table.todayRecipes[s.recipe];
    if (r) li.append(howTo(r));
    return li;
  }

  async function check(s, m) {
    try {
      await kit.api('/api/meal-check', { body: { week: table.thisWeek.id, day: table.dayKey, slot: s.slot, mark: m } });
      await load();
      if (m === 'eaten') nextUp('Good. ');
      else if (m === 'swapped') say('Swapped is fine. I\'ll count it as a swap when you ask how the week is going.');
    } catch (e) { say(e.message, null, 'worried'); }
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
      } catch (e) { say(e.message, null, 'worried'); }
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
    if (!table || !table.thisWeek) { say(`${joke} Nothing's planned this week yet. Shall we plan one?`, null, 'thinking'); return; }
    if (!table.todayMeals.length) say(`${joke} Nothing's planned for today.`);
    else nextUp(`${longDay(table.today)}. `);
  }

  // The next meal, said by whoever keeps it. Spud comes round in the evening, so before then Avo says he's coming.
  function nextUp(lead) {
    const left = table.todayMeals.filter((s) => !mark(s));
    if (!left.length) { say('That\'s everything for today. Nicely done.'); return; }
    const evening = new Date().getHours() >= 17;
    const dinner = left.find((s) => s.slot === 'dinner');
    const s = evening && dinner ? dinner : left[0];
    const who = KEEPER[s.slot] || 'Avo';
    if (who === 'Spud' && evening) say(`Evening! Dinner tonight is ${s.name}.`, 'Spud');
    else if (who === 'Spud') say(`${lead}Spud comes round this evening with dinner: ${s.name}.`);
    else if (who === 'Summer') say(`Treat time: ${s.name}.`, 'Summer');
    else say(`${lead}Next up, ${SLOT[s.slot].toLowerCase()}: ${s.name}.`);
  }

  /* ---------------------------------------------------------------- the cookbook */
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
    // Sources the way a book gives them: a small number after each fact, the titles listed underneath, and the
    // chapter of Louise's book said once.
    const body = el('div', 'card-body');
    const facts = el('ul', 'facts');
    const order = [];
    const chapters = new Set();
    facts.append(...(c.facts || []).map((f) => {
      const li = el('li', null, plain(f.text));
      const page = ((f.sources || [])[0] || {}).page || '';
      const book = page.split('/')[0];
      if (page) chapters.add(chapter(page));
      const nums = [];
      for (const [, id] of String(f.text).matchAll(/\[\^(\d+)\]/g)) {
        const title = books[book] && books[book][id];
        if (!title) continue;
        let k = order.indexOf(title);
        if (k < 0) { order.push(title); k = order.length - 1; }
        if (!nums.includes(k + 1)) nums.push(k + 1);
      }
      if (nums.length) li.append(el('sup', 'ref', nums.sort((a, b) => a - b).join(', ')));
      return li;
    }));
    body.append(facts);
    if (order.length) {
      const src = el('div', 'sources');
      const ch = [...chapters].filter(Boolean);
      const h = el('p', 'sources-h', 'Sources');
      if (ch.length) h.append(el('span', 'book', `, from Louise's book: ${ch.join('; ')}`));
      const ol = el('ol');
      ol.append(...order.map((t) => el('li', null, t)));
      src.append(h, ol);
      body.append(src);
    }
    body.hidden = !open;
    head.addEventListener('click', () => {
      const now = head.getAttribute('aria-expanded') !== 'true';
      head.setAttribute('aria-expanded', String(now));
      body.hidden = !now;
    });
    item.append(head, body);
    return item;
  }

  let books = {};
  const chapter = (page) => {
    const n = String(page).replace(/^.*\//, '').replace(/\.md$/, '').replace(/^\d+-/, '').replace(/-/g, ' ');
    return n ? n[0].toUpperCase() + n.slice(1) : '';
  };

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

  const cookbook = $('cookbook');
  let cookbookLoaded = false;
  $('cookbook-open').addEventListener('click', () => {
    cookbook.showModal();
    if (cookbookLoaded) return;
    cookbookLoaded = true;
    kit.api('/api/sources').then((s) => { books = s.books || {}; }).catch(() => {}).then(shelf);
    memory();
    tools();
    louise();
  });
  $('cookbook-close').addEventListener('click', () => cookbook.close());
  $('ask').addEventListener('submit', search);

  // Until the kit's close view loads, the table stands on its own.
  const scene = $('scene');
  const drop = () => $('stage').classList.add('no-art');
  scene.addEventListener('error', drop);
  if (scene.complete && !scene.naturalWidth) drop();

  hello().catch(() => {}).then(() => load()).then(greet).catch((e) => {
    say('My table did not load. Try again in a moment.', null, 'worried');
    fail($('plates'), e);
  });
}());
