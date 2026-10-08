'use strict';

/* Steady's page: the foot of Stepping Hill, getting ready to run. Reads the kit API (kit/CONTRACT.md, section 10) and
   Steady's two routes in dashboard/server.js. Every fact on the trail is read from a card, with its source.
   Memory is shown as counts, never contents. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const plain = (t) => String(t || '').replace(/\s*@\S+/g, '').replace(/\s*\[\^\d+\]/g, '').trim();
  const say = (id, n, one, many) => { $(id).textContent = n === 1 ? one : many; };
  const speak = (text) => { $('say').textContent = text; };
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  // Steady's mood shows in the face and the pose. The figures come from the kit (kit/art/keepers/fitness-<mood>.svg);
  // until the kit has exported them the page carries no figure (the owner: "do not ship a figure of your own"), so mood() does nothing.
  const MOODS = {
    happy: "Steady, smiling: three stacked granite stones with bright eyes and a pebble sash, on the grass of Stepping Hill",
    thinking: "Steady, thinking: head tilted, eyes up, little pebbles of thought rising",
    oh: "Steady, surprised: a little hop, eyes wide, mouth round in an oh",
    worried: "Steady, worried: leaning back, brows tipped up, a wobbly mouth",
  };
  function mood(name) {
    const img = $("figure");
    if (!img || !MOODS[name]) return;
    img.src = "/kit/art/keepers/fitness-" + name + ".svg";
    img.alt = MOODS[name];
  }
  const day = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA'); };

  /* ---------- the trail ---------- */

  let shelf = [];
  const notes = {}; // card file -> footnote number -> the source's title, read from the card itself
  async function loadNotes() {
    await Promise.all(shelf.map(async (c) => {
      const { body } = await kit.api(`/api/card/${encodeURIComponent(c.file)}`);
      const m = new Map();
      for (const line of String(body).split(/\r?\n/)) {
        const x = /^\[\^(\d+)\]:\s*\[(.*?)\]\(/.exec(line);
        if (x) m.set(x[1], x[2].trim());
      }
      notes[c.file] = m;
    }));
  }
  const chapter = (page) => {
    const n = String(page || '').replace(/^.*\//, '').replace(/\.md$/, '').replace(/^\d+-/, '').replace(/-/g, ' ');
    return n ? n[0].toUpperCase() + n.slice(1) : '';
  };
  // A fact as it is shown: its words, its card, its footnote numbers on that card, and its chapter of Louise's book.
  const shown = (file, f) => ({ text: plain(f.text), file, ids: [...String(f.text).matchAll(/\[\^(\d+)\]/g)].map((m) => m[1]),
    chapter: chapter((f.sources || [])[0] && f.sources[0].page) });
  // A fact from a card, found by words it contains. A card that no longer says it shows nothing, never a guess.
  function fact(file, needle) {
    const c = shelf.find((x) => x.file === file);
    const f = c && c.facts.find((x) => x.text.includes(needle));
    return f ? shown(file, f) : null;
  }
  // A fact a tool printed, found again on its card so it can carry its source.
  function factByText(file, text) {
    const c = shelf.find((x) => x.file === file);
    const f = c && c.facts.find((x) => plain(x.text).startsWith(text.slice(0, 40)));
    return f ? shown(file, f) : { text, file, ids: [], chapter: '' };
  }

  // Sources the way a book gives them: a small number after each fact, and the titles listed underneath.
  function cite(ul, items) {
    ul.textContent = '';
    const order = [];
    for (const it of items) {
      const li = el('li', null, it.text);
      const nums = [];
      for (const id of it.ids) {
        const title = notes[it.file] && notes[it.file].get(id);
        if (!title) continue;
        let k = order.findIndex((o) => o.title === title);
        if (k < 0) { order.push({ title, chapter: it.chapter }); k = order.length - 1; }
        if (!nums.includes(k + 1)) nums.push(k + 1);
      }
      if (nums.length) li.append(el('sup', 'ref', nums.sort((a, b) => a - b).join(', ')));
      ul.append(li);
    }
    let box = ul.nextElementSibling;
    if (!box || !box.classList.contains('sources')) { box = el('div', 'sources'); ul.after(box); }
    box.textContent = '';
    box.hidden = !order.length;
    if (!order.length) return;
    // One chapter for all of them is said once, in the heading.
    const one = order.every((o) => o.chapter === order[0].chapter) ? order[0].chapter : '';
    const h = el('p', 'sources-h', 'Sources');
    if (one) h.append(el('span', 'book', `, from Louise's book: ${one}`));
    box.append(h);
    const ol = el('ol');
    for (const o of order) {
      const li = el('li', null, o.title);
      if (o.chapter && !one) li.append(el('span', 'book', ` In Louise's book: ${o.chapter}.`));
      ol.append(li);
    }
    box.append(ol);
  }
  const ready = loadShelf().then(loadNotes);
  async function facts(id, picks) {
    await ready;
    cite($(id), picks.map(([file, needle]) => fact(file, needle)).filter(Boolean));
  }

  const FLAGS = ['Chest pain', 'Fainting or near-fainting', 'Unusual or severe shortness', 'Palpitations', 'Acute infection',
    'New or worsening joint pain', 'Suspected concussion'].map((n) => ['screening-red-flags.md', n]);
  const SORE = [['recovery.md', 'DOMS is local muscle tenderness'], ['recovery.md', 'Peak soreness falls at 24 to 72 h'],
    ['recovery.md', 'Soreness is not a measure of workout quality'], ['screening-red-flags.md', 'New or worsening joint pain']];
  const RUN = [['intensity.md', 'Talk test (CDC)'],
    ['running.md', 'Progression rule: lengthen run segments']];

  const ORDER = ['check', 'warm', 'run', 'cool'];
  const LINES = {
    check: "Before we go, a quick check in. Honest answers keep you steady.",
    warm: "Let's wake everything up. Easy first, then a little more.",
    run: "How long today? Easy enough to talk the whole way. I'll keep the time.",
    cool: "Welcome back. That's in your log. Now let's bring you down gently.",
  };
  let jokes = [];

  function go(step, focus = true) {
    for (const s of document.querySelectorAll('.step')) s.hidden = s.id !== `step-${step}`;
    const at = ORDER.indexOf(step);
    for (const li of document.querySelectorAll('.stones li')) {
      const i = ORDER.indexOf(li.dataset.for);
      li.classList.toggle('now', i === at);
      li.classList.toggle('done', at > -1 && i < at);
      if (i === at) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    }
    if (step === 'arrive') speak(jokes.length ? jokes[Math.floor(Math.random() * jokes.length)] : 'Come on up.');
    else speak(LINES[step]);
    if (step === 'check') { facts('flags', FLAGS).catch((err) => speak(err.message)); showFlags(true); $('check-more').hidden = true; }
    if (step === 'warm') loadSession('warmup', 'warm').catch((err) => speak(err.message));
    if (step === 'run') facts('run-facts', RUN).catch((err) => speak(err.message));
    const h = document.querySelector(`#step-${step} [tabindex="-1"]`);
    if (h && focus) h.focus();
  }

  $('sore').addEventListener('click', () => {
    speak("Sore from last time? Here's what my cards say, and the one kind of sore that isn't mine to judge.");
    facts('check-facts', SORE).catch((err) => speak(err.message));
    $('check-on').hidden = false;
    answered();
  });
  $('flag-yes').addEventListener('click', () => {
    speak("Then we don't run today. That one's for a clinician, not me. I'll be here when you're cleared.");
    facts('check-facts', [['screening-red-flags.md', 'The coach cannot do clinical screening']]).catch((err) => speak(err.message));
    $('check-on').hidden = true;
    answered();
  });
  function showFlags(on) {
    $('flags').hidden = !on;
    const box = $('flags').nextElementSibling;
    if (box && box.classList.contains('sources')) box.hidden = !on || !box.childElementCount;
  }
  function answered() {
    showFlags(false);
    $('check-more').hidden = false;
    $('check-more').scrollIntoView({ block: 'nearest' });
  }

  /* A session from Steady's calm-session tool, read into parts. Timed parts run on the clock; the rest are notes. */
  function parse(text) {
    const lines = text.split(/\r?\n/);
    const cut = lines.indexOf('It rests on these cards:');
    const body = cut < 0 ? lines : lines.slice(0, cut);
    const parts = body.map((l) => /^\d+\.\s+(.*)$/.exec(l)).filter(Boolean).map((m) => {
      const t = m[1];
      const min = /\((\d+) min\)|^For (\d+) minutes?/.exec(t);
      const sec = /about (\d+) seconds/.exec(t);
      const secs = min ? Number(min[1] || min[2]) * 60 : sec ? Number(sec[1]) : 0;
      const colon = t.indexOf(': ');
      return { label: colon > 0 && colon < 40 ? t.slice(0, colon).replace(/\s*\(\d+ min\)/, '') : '', text: colon > 0 && colon < 40 ? t.slice(colon + 2) : t, secs };
    });
    const rests = cut < 0 ? [] : lines.slice(cut + 1).map((l) => /^- (.*?)\s+\(([^;()]+);\s*([^()]+)\)$/.exec(l)).filter(Boolean)
      .map((m) => ({ text: m[1], file: m[2].trim() }));
    return { head: body[0] || '', parts, rests };
  }

  const timers = {};
  function render(prefix, s) {
    $(`${prefix}-head`).textContent = s.head;
    const ol = $(`${prefix}-phases`);
    ol.textContent = '';
    s.parts.forEach((p) => {
      const li = el('li', p.secs ? 'timed' : 'aside');
      if (p.label) li.append(el('strong', null, `${p.label}: `));
      li.append(document.createTextNode(p.text));
      ol.append(li);
    });
    cite($(`${prefix}-rests`), s.rests.map((r) => factByText(r.file, r.text)));
  }

  // Runs the timed parts one after another; Steady says each part as it starts.
  function runParts(prefix, s, done) {
    stop(prefix);
    const items = [...$(`${prefix}-phases`).children];
    const queue = s.parts.map((p, i) => ({ p, li: items[i] })).filter((x) => x.p.secs);
    if (!queue.length) { done(); return; }
    let k = -1;
    let left = 0;
    const next = () => {
      if (k >= 0) { queue[k].li.classList.remove('now'); queue[k].li.classList.add('done'); }
      k += 1;
      if (k >= queue.length) { stop(prefix); done(); return; }
      const { p, li } = queue[k];
      li.classList.add('now');
      left = p.secs;
      $(`${prefix}-now`).textContent = p.label || 'Now';
      $(`${prefix}-time`).textContent = clock(left);
      speak(p.label ? `${p.label}: ${p.text}` : p.text);
    };
    $(`${prefix}-clock`).hidden = false;
    $(`${prefix}-skip`).hidden = false;
    $(`${prefix}-skip`).onclick = next;
    next();
    timers[prefix] = setInterval(() => {
      left -= 1;
      $(`${prefix}-time`).textContent = clock(Math.max(left, 0));
      if (left <= 0) next();
    }, 1000);
  }
  function stop(prefix) {
    clearInterval(timers[prefix]);
    timers[prefix] = null;
    const skip = $(`${prefix}-skip`);
    if (skip) skip.hidden = true;
  }

  const sessions = {};
  async function loadSession(kind, prefix) {
    $(`${prefix}-head`).textContent = 'Getting your session from my tool.';
    await ready;
    const r = await kit.api('/api/session', { method: 'POST', body: { kind, minutes: kind === 'breathe' ? 3 : undefined } });
    if (!r.ok) { $(`${prefix}-head`).textContent = r.text; return null; }
    sessions[prefix] = parse(r.text);
    render(prefix, sessions[prefix]);
    return sessions[prefix];
  }

  $('warm-start').addEventListener('click', () => {
    if (!sessions.warm) return;
    $('warm-start').hidden = true;
    runParts('warm', sessions.warm, () => speak("That's you warm. Ready when you are."));
  });

  /* The run clock counts up. Steady logs the whole minutes with her progress-log tool. */
  let ran = 0;
  let runTimer = null;
  const tick = () => { ran += 1; $('run-time').textContent = clock(ran); };
  $('run-start').addEventListener('click', () => {
    ran = 0;
    $('run-time').textContent = clock(0);
    $('run-clock').hidden = false;
    $('run-start').hidden = true;
    $('run-pause').hidden = false;
    $('run-back').hidden = false;
    speak("Off you go. You can talk but not sing: that's the pace. I've got the time.");
    runTimer = setInterval(tick, 1000);
  });
  $('run-pause').addEventListener('click', () => {
    if (runTimer) { clearInterval(runTimer); runTimer = null; $('run-pause').textContent = 'Keep going'; speak("Paused. Catch your breath. I'll wait."); }
    else { runTimer = setInterval(tick, 1000); $('run-pause').textContent = 'Pause'; speak("Back at it. Easy enough to talk."); }
  });
  async function logRun(minutes) {
    clearInterval(runTimer);
    runTimer = null;
    const r = await kit.api('/api/log-run', { method: 'POST', body: { minutes } });
    if (!r.ok) { speak(r.text); return; }
    const s = parse(r.text);
    const cut = r.text.indexOf('It rests on these cards:');
    $('log-out').textContent = (cut < 0 ? r.text : r.text.slice(0, cut)).trim();
    cite($('log-rests'), s.rests.map((x) => factByText(x.file, x.text)));
    $('log-rests-box').hidden = !s.rests.length;
    for (const b of ['run-start', 'run-pause', 'run-back']) $(b).hidden = b !== 'run-start';
    $('run-pause').textContent = 'Pause';
    $('run-clock').hidden = true;
    go('cool');
    loadMemory().catch(() => {});
  }
  $('run-back').addEventListener('click', () => logRun(Math.max(1, Math.round(ran / 60))).catch((err) => speak(err.message)));
  $('log-hand').addEventListener('submit', (e) => {
    e.preventDefault();
    const n = Number($('run-min').value);
    if (!Number.isInteger(n) || n < 1 || n > 300) { speak('Tell me the whole minutes you ran, from 1 to 300.'); return; }
    logRun(n).catch((err) => speak(err.message));
  });

  for (const b of document.querySelectorAll('[data-session]')) {
    b.addEventListener('click', async () => {
      stop('cool');
      $('cool-clock').hidden = true;
      const s = await loadSession(b.dataset.session, 'cool').catch((err) => { speak(err.message); return null; });
      if (!s) return;
      $('cool-rests-box').hidden = false;
      runParts('cool', s, () => speak("That's the hill for today. Same steps next time, a little further."));
    });
  }

  for (const b of document.querySelectorAll('[data-next]')) {
    b.addEventListener('click', () => {
      stop('warm');
      stop('cool');
      if (b.dataset.next === 'arrive') {
        $('warm-start').hidden = false;
        for (const id of ['warm-clock', 'cool-clock', 'cool-rests-box']) $(id).hidden = true;
        $('cool-head').textContent = '';
        $('cool-phases').textContent = '';
      }
      go(b.dataset.next);
    });
  }

  /* ---------- her pack ---------- */

  function renderCards(cards, emptyText) {
    const box = $('cards');
    box.textContent = '';
    if (!cards.length) { $('know-note').textContent = emptyText; return; }
    $('know-note').textContent = '';
    for (const c of cards) {
      const d = el('details');
      const s = el('summary');
      s.append(el('span', 'card-title', c.title), el('span', 'card-n', `${c.facts.length} facts`));
      d.append(s);
      const ul = el('ul', 'facts');
      d.append(ul);
      cite(ul, c.facts.map((f) => shown(c.file, f)));
      box.append(d);
    }
  }

  async function loadShelf() {
    const { cards } = await kit.api('/api/shelf');
    shelf = cards;
    $('n-cards').textContent = cards.length;
    say('l-cards', cards.length, 'card on my shelf', 'cards on my shelf');
    $('n-facts').textContent = cards.reduce((n, c) => n + c.facts.length, 0);
  }

  async function find(q) {
    mood('thinking');
    if (!q) { renderCards(shelf, 'My shelf is empty.'); mood('happy'); return; }
    const { cards } = await kit.api(`/api/shelf?q=${encodeURIComponent(q)}`);
    renderCards(cards, "Nothing on my shelf about that yet. That's a question for Louise.");
    mood(cards.length ? 'happy' : 'oh');
  }

  async function loadMemory() {
    const m = await kit.api('/api/memory');
    $('m-facts').textContent = m.facts.length;
    $('m-worked').textContent = m.worked.length;
    $('m-lessons').textContent = m.lessons.length;
    say('lm-facts', m.facts.length, 'thing you told me', 'things you told me');
    say('lm-worked', m.worked.length, 'note on what worked', 'notes on what worked');
    say('lm-lessons', m.lessons.length, 'lesson I learned', 'lessons I learned');
    const all = m.facts.length + m.worked.length + m.lessons.length;
    say('l-remember', all, 'thing I remember about you', 'things I remember about you');
    $('n-remember').textContent = all;
  }

  async function loadTools() {
    const { tools } = await kit.api('/api/tools');
    const ul = $('tools');
    ul.textContent = '';
    if (!tools.length) { ul.append(el('li', null, 'No tools yet.')); return; }
    for (const t of tools) {
      const li = el('li');
      li.append(el('span', 'tool-name', t.name), el('span', 'km-chip', t.ok ? 'ready' : 'needs a check'));
      li.append(el('p', null, t.purpose));
      li.append(el('code', null, `node tools/${t.file}`));
      ul.append(li);
    }
  }

  async function loadLouise() {
    const { requests, gaps } = await kit.api('/api/louise');
    const waiting = requests.filter((r) => r.status === 'pending');
    const notAsked = gaps.filter((g) => !g.asked);
    $('n-louise').textContent = waiting.length + notAsked.length;
    say('l-louise', waiting.length + notAsked.length, 'question for Louise', 'questions for Louise');
    const list = (id, items, empty, when) => {
      const ul = $(id);
      ul.textContent = '';
      if (!items.length) { ul.append(el('li', 'note', empty)); return; }
      for (const it of items) {
        const li = el('li', 'km-lantern');
        const body = el('div');
        body.append(el('span', null, it.topic), el('span', 'when', when(it)));
        li.append(body);
        ul.append(li);
      }
    };
    list('pending', waiting, 'Nothing waiting on Louise right now.', (r) => `Asked ${day(r.asked)}`);
    list('gaps', notAsked, 'Every gap is already with Louise.', () => 'Not sent yet');
  }

  $('find').addEventListener('submit', (e) => {
    e.preventDefault();
    find($('q').value.trim()).catch((err) => { $('know-note').textContent = err.message; mood('worried'); });
  });
  $('pack-open').addEventListener('click', () => $('pack').showModal());
  $('pack-close').addEventListener('click', () => $('pack').close());

  kit.agent().then((a) => { jokes = Array.isArray(a.jokes) ? a.jokes : []; go('arrive', false); }).catch((err) => speak(err.message));
  Promise.all([ready.then(() => renderCards(shelf, 'My shelf is empty.')), loadMemory(), loadTools(), loadLouise()])
    .catch((err) => { speak(err.message); mood('worried'); });
}());
