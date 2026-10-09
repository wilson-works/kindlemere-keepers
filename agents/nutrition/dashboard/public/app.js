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
  // The speaker's face beside the words, in the mood the kit drew (kit/art/keepers/<figure>-<mood>.svg): Avo, Summer
  // or Spud. A drawing the kit doesn't have yet leaves the words on their own.
  const FIGURE = { Avo: 'nutrition', Summer: 'nutrition-summer', Spud: 'nutrition-spud' };
  const MOODS = { happy: 'smiling', thinking: 'thinking', oh: 'surprised', worried: 'worried', sleepy: 'sleepy' };
  const face = $('face');
  const missing = new Set();
  face.addEventListener('error', () => { missing.add(face.getAttribute('src')); face.hidden = true; });
  face.addEventListener('load', () => { face.hidden = false; });
  function mood(name, who) {
    const speaker = who || 'Avo';
    const src = FIGURE[speaker] && MOODS[name] ? `/kit/art/keepers/${FIGURE[speaker]}-${name}.svg` : '';
    if (!src || missing.has(src)) { face.hidden = true; return; }
    face.alt = `${speaker}, ${MOODS[name]}`;
    if (face.getAttribute('src') !== src) { face.hidden = true; face.src = src; return; }
    face.hidden = !face.complete || !face.naturalWidth;
  }
  // Whoever is talking is named in the bubble; Avo's own lines carry no name.
  const say = (text, who, feel) => {
    const box = $('say');
    box.parentElement.dataset.who = who || 'Avo';
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
    const done = el('button', 'tick prep-done', p.done ? 'Prep done' : 'I\'ve done the prep');
    done.type = 'button';
    done.setAttribute('aria-pressed', String(p.done));
    done.addEventListener('click', () => prepDone(p, !p.done));
    li.append(done);
    if (p.done) li.classList.add('done');
    return li;
  }

  // Finishing a prep day is the week's big job done: Avo says so, and Summer chimes in a moment later.
  async function prepDone(p, on) {
    try {
      await kit.api('/api/meal-check', { body: { week: p.week, day: p.day, slot: 'prep', mark: on ? 'eaten' : 'clear' } });
      await load();
      if (!on) { say('No rush. The prep will keep until you get to it.', null, 'thinking'); return; }
      say(`That's the cooking done through ${p.through}. Why did we ever do this by hand?`, null, 'happy');
      setTimeout(() => say('Treat earned! Tell me what you fancy and I\'ll find one.', 'Summer', 'happy'), 3500);
    } catch (e) { say(e.message, null, 'worried'); }
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
      react(s, m);
    } catch (e) { say(e.message, null, 'worried'); }
  }

  // Whoever keeps the meal answers the tick, in their own voice and mood.
  function react(s, m) {
    const who = KEEPER[s.slot] || 'Avo';
    if (m === 'clear') { say('Unticked. No harm done.', who === 'Avo' ? null : who, 'oh'); return; }
    if (m === 'swapped') {
      if (who === 'Spud') say('No harm. I\'ll remember that one when we plan the next dinners.', 'Spud', 'thinking');
      else if (who === 'Summer') say('Swapped your treat? I\'ll find you a better one next week.', 'Summer', 'thinking');
      else say('Swapped is fine. I\'ll remember, and we can change it next week.', null, 'thinking');
      return;
    }
    const left = table.todayMeals.filter((x) => !mark(x));
    if (who === 'Spud') say(left.length ? 'Glad that hit the spot. Dinner done.' : 'Dinner done, and that\'s the whole day ticked. Nicely done.', 'Spud', 'happy');
    else if (who === 'Summer') say('Sweet! That\'s the treat ticked.', 'Summer', 'happy');
    else nextUp('Good. ');
  }

  /* ---------------------------------------------------------------- clicking a character in the scene */
  // The kit makes every character a button and fires 'kindlemere:character'; the Orchard's three answer here.
  function openTalk(prefill) {
    show($('tab-plan'));
    const box = $('talk-text');
    if (prefill != null && !box.value) box.value = prefill;
    box.focus();
  }
  // When the scene is at rest Avo walks off to visit; the kit moves her by giving her figure's button a transform and
  // takes it away when she is home. Her bubble steps aside while she is out, so it never points at an empty spot.
  function watchAvo() {
    const avo = document.querySelector('[role="button"][aria-label="Avo"]');
    if (!avo || avo.dataset.watched) return;
    avo.dataset.watched = '1';
    const bubble = $('say').parentElement;
    new MutationObserver(() => bubble.classList.toggle('away', avo.hasAttribute('transform')))
      .observe(avo, { attributes: true, attributeFilter: ['transform'] });
  }
  window.addEventListener('kindlemere:ready', watchAvo);
  watchAvo();

  // Spud woken in the ground (owner, 2026-10-09): the kit pops him up out of the soil; he yawns, and clicked again he
  // talks dinner here, through the page talk (Avo asks him). He stays up while that talk goes on and hops back down by
  // himself once he is left alone (window.kindlemere.spud).
  const spud = () => (window.kindlemere && window.kindlemere.spud) || null;
  const stayUp = () => { if (spud() && spud().isUp()) spud().stay(); };
  const tonight = () => {
    const dinner = table && table.todayMeals.find((s) => s.slot === 'dinner');
    return dinner ? `Tonight it's ${dinner.name}.` : 'No dinner planned tonight yet.';
  };
  function spudTalk() {
    say(`Let's talk dinner. ${tonight()} Ask away, and Avo will fetch me.`, 'Spud', 'happy');
    openTalk('Spud, what should we have for dinner tonight?');
    stayUp();
  }
  $('talk-text').addEventListener('input', stayUp);
  window.addEventListener('kindlemere:spud', (ev) => {
    ev.preventDefault();
    say('Right, back into the ground for a nap. Wake me at dinner.', 'Spud', 'sleepy');
  });
  // From the park's "Talk dinner with Spud": he pops up here too, and the talk opens on dinner.
  if (new URLSearchParams(location.search).get('talk') === 'spud') {
    window.addEventListener('kindlemere:ready', () => setTimeout(() => {
      if (spud()) spud().up();
      spudTalk();
    }, 1200), { once: true });
  }

  // Out of the chat (owner, 2026-10-09: "clicking out into kindlemere should escape from it"): a click on the open
  // scene, or Escape inside it, closes "Plan with me" back to Today. The conversation is kept; the tab brings it back.
  function leaveTalk(focusTab) {
    if ($('tab-plan').getAttribute('aria-selected') !== 'true') return false;
    show($('tab-today'));
    if (focusTab) $('tab-today').focus();
    return true;
  }
  window.addEventListener('kindlemere:outside', () => leaveTalk(false));
  $($('tab-plan').getAttribute('aria-controls')).addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && leaveTalk(true)) ev.preventDefault();
  });

  window.addEventListener('kindlemere:character', (ev) => {
    const who = ev.detail && ev.detail.name;
    if (!['Avo', 'Summer', 'Spud'].includes(who)) return;
    ev.preventDefault();
    const dinner = table && table.todayMeals.find((s) => s.slot === 'dinner');
    const treat = table && table.todayMeals.find((s) => s.slot === 'snack');
    if (who === 'Spud' && ev.detail.up) {
      if (ev.detail.popped) say(`Yaaawn. Oh, hello. I was napping in the soil. ${tonight()} Click me again to talk dinner.`, 'Spud', 'oh');
      else spudTalk();
      return;
    }
    if (asleep()) {
      if (who === 'Avo') sleepy();
      else say(`${who} is fast asleep. Let's not wake ${who === 'Spud' ? 'him' : 'her'}.`, null, 'sleepy');
      return;
    }
    // their own lines (today's treat, tonight's dinner, Avo's jokes) and the kit's, never the same twice running
    const next = (key, own) => (window.kindlemere && window.kindlemere.line ? window.kindlemere.line(key, own) : own[0]);
    if (who === 'Avo') { say(next('nutrition', ['What can I help with? Ask me anything, or let\'s plan a week.', ...jokes]), null, 'happy'); openTalk(); return; }
    if (who === 'Summer') {
      say(next('nutrition-summer', [treat ? `Today's treat is ${treat.name}. Fancy something else? Ask me.` : 'Something sweet? Ask me and I\'ll find a treat that fits.']), 'Summer', 'happy');
      openTalk('I want something sweet. Any ideas?');
      return;
    }
    const evening = new Date().getHours() >= 17;
    if (evening) say(next('nutrition-spud', [dinner ? `Evening. Dinner tonight is ${dinner.name}.` : 'Evening. No dinner planned tonight. Want to plan one?']), 'Spud', 'happy');
    else say(`Spud's still snoozing till dinner time. ${dinner ? `Tonight it's ${dinner.name}.` : 'No dinner planned tonight yet.'}`, null, 'happy');
  });

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
    if (asleep()) { sleepy(); return; }
    if (!table.todayMeals.length) say(`${joke} Nothing's planned for today.`);
    else nextUp(`${longDay(table.today)}. `);
  }

  // After dark the Orchard sleeps (the kit's live sky marks the scene); Avo answers drowsily, with tomorrow's breakfast.
  const asleep = () => {
    const marked = document.querySelector('[data-km-night]');
    if (marked) return marked.getAttribute('data-km-night') === '1';
    const h = new Date().getHours();
    return h >= 22 || h < 5;
  };
  function sleepy() {
    const breakfast = table && table.todayMeals.find((s) => s.slot === 'breakfast');
    say(breakfast && new Date().getHours() < 5
      ? `Mm, it's late. Breakfast is ${breakfast.name}. Wake me if you need me.`
      : 'Mm, it\'s late, the Orchard is asleep. Wake me if you need me.', null, 'sleepy');
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

  /* ---------------------------------------------------------------- talking at the table */
  // Her reply as she writes it: paragraphs, lists and **bold**, built from text nodes (never as HTML).
  function prose(text) {
    const box = el('div', 'said');
    const inline = (node, line) => {
      String(line).split(/(\*\*[^*]+\*\*)/).forEach((part) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) node.append(el('strong', null, part.slice(2, -2)));
        else if (part) node.append(document.createTextNode(part.replace(/`/g, '')));
      });
    };
    let list = null;
    for (const raw of String(text).split(/\r?\n/)) {
      const line = raw.trim();
      const bullet = /^[-*] /.test(line);
      const numbered = /^\d+\. /.test(line);
      if (!line || /^-{3,}$/.test(line)) { list = null; continue; }
      if (bullet || numbered) {
        const kind = numbered ? 'OL' : 'UL';
        if (!list || list.tagName !== kind) { list = el(kind.toLowerCase()); box.append(list); }
        const li = el('li');
        inline(li, line.replace(/^([-*]|\d+\.) /, ''));
        list.append(li);
      } else {
        list = null;
        const p = el('p');
        inline(p, line.replace(/^#+\s*/, ''));
        box.append(p);
      }
    }
    return box;
  }
  const firstLine = (text) => {
    const t = String(text).replace(/\*\*/g, '').replace(/^#+\s*/gm, '').split(/\r?\n/).map((x) => x.trim()).find(Boolean) || '';
    const m = /^(.{20,160}?[.!?])(\s|$)/.exec(t);
    return m ? m[1] : t.slice(0, 160);
  };

  let talking = false;
  let freshNext = false;
  let shown = -1;
  function renderTalk(st) {
    const log = $('talk-log');
    const messages = freshNext ? [] : st.messages;
    if (messages.length !== shown) {
      shown = messages.length;
      log.replaceChildren(...messages.map((m) => {
        const li = el('li', m.who === 'you' ? 'you' : 'avo');
        li.append(el('span', 'who', m.who === 'you' ? 'You' : 'Avo'));
        li.append(m.who === 'you' ? el('p', null, m.text) : prose(m.text));
        if (m.link) {
          const a = el('a', 'km-btn', 'Open the week');
          a.href = `/week.html?k=${encodeURIComponent(m.link.k)}`;
          a.target = '_blank';
          a.rel = 'noopener';
          li.append(a);
        }
        return li;
      }));
      if (log.lastElementChild) log.lastElementChild.scrollIntoView({ block: 'nearest' });
    }
    $('starters').hidden = messages.length > 0 || st.busy;
    $('talk-fresh').hidden = !messages.length || st.busy;
    $('talk-send').disabled = st.busy;
    $('talk-stop').hidden = !st.busy;
    const now = $('talk-now');
    now.hidden = !st.busy;
    if (st.busy) {
      stayUp();   // Spud stays up while the talk he is part of goes on
      now.textContent = `${st.activity || 'Thinking'}...`;
      const who = st.activity === 'Asking Summer' ? 'Summer' : st.activity === 'Asking Spud' ? 'Spud' : null;
      say(who ? `${who} is helping me with this.` : `${st.activity || 'Thinking'}...`, null, 'thinking');
    }
  }

  async function poll() {
    try {
      const st = await kit.api('/api/talk');
      renderTalk(st);
      if (st.busy) { talking = true; setTimeout(poll, 1500); return; }
      if (talking) {
        talking = false;
        const last = st.messages[st.messages.length - 1];
        if (last && last.who === 'avo') say(firstLine(last.text), null, 'happy');
        load().catch(() => {}); // a week she just published shows on the table
      }
    } catch (e) { say(e.message, null, 'worried'); }
  }

  async function send(text) {
    const t = String(text || '').trim();
    if (!t) return;
    try {
      await kit.api('/api/talk', { body: { text: t, fresh: freshNext } });
      freshNext = false;
      $('talk-text').value = '';
      talking = true;
      shown = -1;
      poll();
    } catch (e) { say(e.message, null, 'worried'); }
  }

  $('talk-form').addEventListener('submit', (ev) => { ev.preventDefault(); send($('talk-text').value); });
  $('talk-text').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); send($('talk-text').value); }
  });
  document.querySelectorAll('.starter').forEach((b) => b.addEventListener('click', () => send(b.textContent)));
  $('talk-stop').addEventListener('click', () => kit.api('/api/talk-stop', { body: {} }).catch(() => {}));
  $('talk-fresh').addEventListener('click', () => {
    freshNext = true;
    shown = -1;
    renderTalk({ busy: false, messages: [] });
    $('talk-text').focus();
  });

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

  poll();
  hello().catch(() => {}).then(() => load()).then(greet).catch((e) => {
    say('My table did not load. Try again in a moment.', null, 'worried');
    fail($('plates'), e);
  });
}());
