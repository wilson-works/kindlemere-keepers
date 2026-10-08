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
  // Who is speaking, with their face in the bubble from the kit's figures (kit/art/keepers/<figure>-<mood>.svg):
  // Steady in her mood, or one of her clouds. The tail points at whoever is talking: the kit puts Puff on her left
  // and Huff on her right in the hill view.
  const FIGURES = { Steady: 'fitness', Puff: 'fitness-puff', Huff: 'fitness-huff' };
  const MOODS = ['happy', 'thinking', 'oh', 'worried', 'sleepy'];
  let feeling = 'happy';
  const speak = (text, who = 'Steady', how = 'happy') => {
    const steady = who === 'Steady';
    $('who').textContent = who;
    $('say').textContent = text;
    $('face').classList.toggle('cloud', !steady);
    $('bubble').classList.toggle('puff', who === 'Puff');
    $('bubble').classList.toggle('huff', who === 'Huff');
    $('face-img').src = `/kit/art/keepers/${FIGURES[who]}-${steady ? feeling : how}.svg`;
  };
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  // Steady's mood shows in her face whenever she is the one speaking.
  function mood(name) {
    if (!MOODS.includes(name)) return;
    feeling = name;
    if ($('who').textContent === 'Steady') $('face-img').src = `/kit/art/keepers/fitness-${name}.svg`;
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

  // What the person came to do today, and the steps up the hill for each.
  const PATHS = {
    run: [['check', 'Check in'], ['warm', 'Warm up'], ['run', 'Run'], ['cool', 'Cool down']],
    workout: [['check', 'Check in'], ['workout', 'Workout'], ['cool', 'Cool down']],
    calm: [['cool', 'Stretch or breathe']],
    plan: [['plan', 'Plan my week']],
  };
  const LINES = {
    check: "Before we go, a quick check in. Honest answers keep you steady.",
    warm: "Let's wake everything up. Easy first, then a little more.",
    run: "How long today? Easy enough to talk the whole way. I'll keep the time.",
    workout: "Strength today. Tell me what you've got and I'll set it out move by move.",
    plan: "Let's plan your week. Four answers and I'll lay it out day by day.",
  };
  const COOL = {
    run: ["Welcome back. That's in your log. Now let's bring you down gently.", 'Cool down'],
    workout: ["Nice work. Now let's bring you down gently.", 'Cool down'],
    calm: ["Stretch or breathe. Pick one and I'll keep the time.", 'Stretch or breathe'],
  };
  let jokes = [];
  let path = 'run';
  let current = 'arrive';
  const ids = () => PATHS[path].map((x) => x[0]);
  const after = (step) => ids()[ids().indexOf(step) + 1] || 'arrive';

  function go(step, focus = true) {
    current = step;
    for (const s of document.querySelectorAll('.step')) s.hidden = s.id !== `step-${step}`;
    const ol = $('stones');
    ol.textContent = '';
    ol.hidden = step === 'arrive' || PATHS[path].length < 2;
    const at = ids().indexOf(step);
    PATHS[path].forEach(([id, name], i) => {
      const li = el('li', null, name);
      if (i === at) { li.className = 'now'; li.setAttribute('aria-current', 'step'); } else if (i < at) li.className = 'done';
      ol.append(li);
    });
    $('start-over').hidden = step === 'arrive';
    mood('happy');
    if (step === 'arrive') speak(jokes.length ? jokes[Math.floor(Math.random() * jokes.length)] : 'Come on up.');
    else if (step === 'cool') { speak(COOL[path][0]); $('cool-h').textContent = COOL[path][1]; }
    else speak(LINES[step]);
    if (step === 'check') { facts('flags', FLAGS).catch((err) => speak(err.message)); showFlags(true); $('check-more').hidden = true; }
    if (step === 'warm') loadSession('warmup', 'warm').catch((err) => speak(err.message));
    if (step === 'run') {
      facts('run-facts', RUN).catch((err) => speak(err.message));
      $('sky-note').textContent = '';
      for (const x of $('sky').querySelectorAll('[data-sky]')) x.setAttribute('aria-pressed', 'false');
    }
    const h = document.querySelector(`#step-${step} [tabindex="-1"]`);
    if (h && focus) h.focus();
  }

  for (const b of document.querySelectorAll('[data-path]')) {
    b.addEventListener('click', () => { path = b.dataset.path; go(ids()[0]); });
  }

  $('sore').addEventListener('click', () => {
    mood('thinking');
    speak("Sore from last time? Here's what my cards say, and the one kind of sore that isn't mine to judge.");
    facts('check-facts', SORE).catch((err) => speak(err.message));
    $('check-on').hidden = false;
    answered();
  });
  $('flag-yes').addEventListener('click', () => {
    mood('worried');
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
    const cut = lines.findIndex((l) => /^(It rests on these cards|What my cards say):$/.test(l));
    const body = cut < 0 ? lines : lines.slice(0, cut);
    const parts = body.map((l) => /^\d+\.\s+(.*)$/.exec(l)).filter(Boolean).map((m) => {
      const t = m[1];
      const min = /\((\d+) min\)|^For (\d+) minutes?/.exec(t);
      const sec = /about (\d+) seconds/.exec(t);
      const secs = min ? Number(min[1] || min[2]) * 60 : sec ? Number(sec[1]) : 0;
      const colon = t.indexOf(': ');
      const named = colon > 0 && colon < 50;
      return { label: named ? t.slice(0, colon).replace(/\s*\(\d+ min\)/, '') : '', text: named ? t.slice(colon + 2) : t, secs };
    });
    const rests = cut < 0 ? [] : lines.slice(cut + 1).map((l) => /^- (.*?)\s+\(([^;()]+);\s*([^()]+)\)$/.exec(l)).filter(Boolean)
      .map((m) => ({ text: m[1], file: m[2].trim() }));
    return { head: body[0] || '', lines: body, parts, rests };
  }

  const timers = {};
  // While a clock runs (a warm-up, a workout, a run), Steady stays home: the kit's mingling waits
  // (window.kindlemere.hold, kit/kindlemere.js).
  let running = false;
  function busy() {
    const on = running || Object.values(timers).some(Boolean);
    if (window.kindlemere && typeof window.kindlemere.hold === 'function') window.kindlemere.hold(on);
  }
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
  function runParts(prefix, s, done, who = 'Steady') {
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
      speak(p.label ? `${p.label}: ${p.text}` : p.text, who);
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
    busy();
  }
  function stop(prefix) {
    clearInterval(timers[prefix]);
    timers[prefix] = null;
    busy();
    const skip = $(`${prefix}-skip`);
    if (skip) skip.hidden = true;
  }

  const sessions = {};
  async function loadSession(kind, prefix) {
    $(`${prefix}-head`).textContent = 'Getting your session from my tool.';
    mood('thinking');
    await ready;
    const r = await kit.api('/api/session', { method: 'POST', body: { kind, minutes: kind === 'breathe' ? 3 : undefined } });
    if (!r.ok) { $(`${prefix}-head`).textContent = r.text; return null; }
    sessions[prefix] = parse(r.text);
    render(prefix, sessions[prefix]);
    mood('happy');
    return sessions[prefix];
  }

  $('warm-start').addEventListener('click', () => {
    if (!sessions.warm) return;
    $('warm-start').hidden = true;
    runParts('warm', sessions.warm, () => speak("That's you warm. Ready when you are."));
  });

  /* What it's like out. Running in the heat is Huff's and running in the weather is Puff's. The shelf has nothing on
     either yet: it is a gap for Louise, so the cloud says so and the run goes on the talk test. */
  $('sky').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-sky]');
    if (!b) return;
    for (const x of $('sky').querySelectorAll('[data-sky]')) x.setAttribute('aria-pressed', String(x === b));
    if (b.dataset.sky === 'fine') { $('sky-note').textContent = ''; speak("Good day for it. Easy enough to talk, and I'll keep the time."); return; }
    const hot = b.dataset.sky === 'hot';
    const { gaps } = await kit.api('/api/louise').catch(() => ({ gaps: [] }));
    const gap = gaps.find((g) => /heat|cold|wind/i.test(g.topic));
    $('sky-note').textContent = gap ? `On Steady's list for Louise: ${gap.topic}.` : '';
    if (hot) speak("Heat's my patch, but our shelf has nothing on it yet. Louise has the question.", 'Huff', 'thinking');
    else speak("Weather's my patch, but our shelf has nothing on it yet. Louise has the question.", 'Puff', 'thinking');
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
    running = true;
    busy();
  });
  $('run-pause').addEventListener('click', () => {
    if (runTimer) { clearInterval(runTimer); runTimer = null; $('run-pause').textContent = 'Keep going'; speak("Paused. Catch your breath. I'll wait."); }
    else { runTimer = setInterval(tick, 1000); $('run-pause').textContent = 'Pause'; speak("Back at it. Easy enough to talk."); }
  });
  async function logRun(minutes) {
    clearInterval(runTimer);
    runTimer = null;
    running = false;
    busy();
    const r = await kit.api('/api/log-run', { method: 'POST', body: { minutes } });
    if (!r.ok) { speak(r.text); return; }
    const s = parse(r.text);
    $('log-out').textContent = s.lines.join('\n').trim();
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

  /* A quick workout from her quick-workout tool: the warm-up runs on the clock, each move is ticked off.
     Home workouts are Puff's and gym workouts are Huff's, so the cloud talks you through it. */
  let gearCloud = 'Puff';
  function renderWorkout(s) {
    $('workout-head').textContent = s.head;
    const ol = $('workout-phases');
    ol.textContent = '';
    for (const p of s.parts) {
      const li = el('li', p.secs ? 'timed' : p.label && !/^cool down/i.test(p.label) ? 'move' : 'aside');
      if (li.className === 'move') {
        const lab = el('label');
        const box = el('input');
        box.type = 'checkbox';
        const words = el('span');
        words.append(el('strong', null, `${p.label}: `), document.createTextNode(p.text));
        lab.append(box, words);
        li.append(lab);
      } else {
        if (p.label) li.append(el('strong', null, `${p.label}: `));
        li.append(document.createTextNode(p.text));
      }
      ol.append(li);
    }
    cite($('workout-rests'), s.rests.map((r) => factByText(r.file, r.text)));
    $('workout-rests-box').hidden = !s.rests.length;
    $('workout-go').hidden = !s.parts.length;
    $('workout-start').hidden = !s.parts.some((p) => p.secs);
    const cloud = gearCloud;
    if (!s.parts.length) speak(s.head);
    else if (cloud === 'Puff') speak("Home workout? That's me. Warm up with me, then tick each move off.", 'Puff');
    else speak("Gym day? That's me. Warm up with me, then tick each move off.", 'Huff');
  }
  $('gear').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-gear]');
    if (!b) return;
    for (const x of $('gear').querySelectorAll('[data-gear]')) x.setAttribute('aria-pressed', String(x === b));
    gearCloud = ['bodyweight', 'bands'].includes(b.dataset.gear) ? 'Puff' : 'Huff';
    stop('workout');
    $('workout-clock').hidden = true;
    $('workout-head').textContent = 'Getting your workout from my tool.';
    try {
      await ready;
      const r = await kit.api('/api/workout', { method: 'POST', body: { equipment: b.dataset.gear } });
      if (!r.ok) { $('workout-head').textContent = r.text; return; }
      sessions.workout = parse(r.text);
      // Only the warm-up runs on the clock here. The cool-down comes after the moves, on its own step.
      for (const p of sessions.workout.parts) if (!/^warm up/i.test(p.label)) p.secs = 0;
      renderWorkout(sessions.workout);
    } catch (err) { speak(err.message); }
  });
  $('workout-start').addEventListener('click', () => {
    if (!sessions.workout) return;
    $('workout-start').hidden = true;
    runParts('workout', sessions.workout, () => speak("You're warm. Now the moves, one at a time. Tick each one off.", gearCloud), gearCloud);
  });
  $('workout-phases').addEventListener('change', () => {
    const boxes = [...$('workout-phases').querySelectorAll('input[type=checkbox]')];
    if (boxes.length && boxes.every((x) => x.checked)) speak("That's every move. Ready to cool down?", gearCloud);
  });

  /* Plan my week: her week-plan tool, laid out day by day. */
  $('plan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const age = $('p-age').value.trim();
    const body = { days: Number($('p-days').value), goal: $('p-goal').value, level: $('p-level').value, age: age ? Number(age) : null };
    speak('Laying out your week.');
    try {
      await ready;
      const r = await kit.api('/api/plan', { method: 'POST', body });
      if (!r.ok) { speak(r.text); return; }
      const s = parse(r.text);
      const out = $('plan-out');
      out.textContent = '';
      const days = el('ul', 'days');
      for (const line of s.lines.slice(1)) {
        const d = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun): (.*)$/.exec(line);
        if (d) {
          const li = el('li');
          li.append(el('strong', 'day', d[1]));
          const ul = el('ul');
          for (const bit of d[2].split(/(?<=\.)\s+(?=[A-Z0-9])/)) ul.append(el('li', null, bit));
          li.append(ul);
          days.append(li);
        } else if (line.trim()) out.append(el('p', 'plan-note', line.trim()));
      }
      out.prepend(el('p', 'plan-head', s.head));
      if (days.childElementCount) out.insertBefore(days, out.children[1] || null);
      cite($('plan-rests'), s.rests.map((x) => factByText(x.file, x.text)));
      $('plan-rests-box').hidden = !s.rests.length;
      speak(days.childElementCount ? "Here's your week, day by day. Change an answer and I'll lay it out again." : s.head);
      out.scrollIntoView({ block: 'nearest' });
    } catch (err) { speak(err.message); }
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
      stop('workout');
      if (b.dataset.next === 'arrive') {
        clearInterval(runTimer);
        runTimer = null;
        running = false;
        busy();
        for (const id of ['run-start', 'warm-start']) $(id).hidden = false;
        for (const id of ['run-pause', 'run-back', 'run-clock', 'warm-clock', 'cool-clock', 'cool-rests-box', 'log-rests-box',
          'workout-clock', 'workout-go', 'workout-rests-box', 'plan-rests-box']) $(id).hidden = true;
        for (const id of ['cool-head', 'cool-phases', 'log-out', 'workout-head', 'workout-phases', 'plan-out']) $(id).textContent = '';
        for (const x of $('gear').querySelectorAll('[data-gear]')) x.setAttribute('aria-pressed', 'false');
      }
      go(b.dataset.next === 'next' ? after(current) : b.dataset.next);
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
