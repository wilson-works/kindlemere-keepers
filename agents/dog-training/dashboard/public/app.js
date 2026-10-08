'use strict';

/* Tumble's page: a step into Lakeside Field. The kit's live Field view is the page; the person's own dogs are the dogs
   in it; Tumble (and Barkley and Sizzle) speak in the bubble; the six actions open under the scene; the books, memory
   counts, tools and Louise's lanterns sit in a drawer. Every line Tumble says here comes from a card or from what the
   person told it; everything is drawn with textContent, never as HTML. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const put = (id, text) => { const n = $(id); if (n) n.textContent = text; };
  const api = (path, body) => window.kit.api(path, body ? { method: 'POST', body } : undefined);
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (_) { /* a private window: fine */ } },
  };

  /* ---------- who is speaking ---------- */
  const MOODS = ['happy', 'thinking', 'oh', 'worried', 'sleepy'];
  function say(text, who, mood) {
    const speaker = who || 'Tumble';
    put('who', speaker === 'Tumble' ? 'Tumble' : `${speaker}:`);
    put('say', text);
    const img = $('mood');
    // Barkley and Sizzle are not drawn yet; until the kit draws them, their name says who is talking.
    img.hidden = speaker !== 'Tumble';
    const m = MOODS.includes(mood) ? mood : 'happy';
    if (speaker === 'Tumble' && !img.src.endsWith(`dog-training-${m}.svg`)) img.src = `/kit/art/keepers/dog-training-${m}.svg`;
    $('bubble').dataset.who = speaker.toLowerCase();
  }

  /* ---------- the cards, and sources the way a book gives them ---------- */
  let shelf = [];
  const plain = (t) => String(t).replace(/\s*@\S+/g, '').trim();
  const chapter = (page) => {
    const base = String(page || '').replace(/^.*\//, '').replace(/\.md$/, '');
    const m = /^(\d+)-(.*)$/.exec(base);
    if (!m) return '';
    const words = m[2].replace(/-/g, ' ');
    return `chapter ${Number(m[1])}, ${words[0].toUpperCase()}${words.slice(1)}`;
  };
  const shown = (f) => ({ text: plain(f.text), chapter: chapter(f.sources && f.sources[0] && f.sources[0].page) });
  // The first fact on a card with every given word. A card that no longer says it shows nothing, never a guess.
  function fact(file, ...words) {
    const c = shelf.find((x) => x.file === file);
    const f = c && c.facts.find((x) => words.every((w) => x.text.toLowerCase().includes(w.toLowerCase())));
    return f ? shown(f) : null;
  }
  function cite(ul, items) {
    ul.textContent = '';
    const order = [];
    for (const it of items.filter(Boolean)) {
      const li = el('li', null, it.text);
      if (it.chapter) {
        let k = order.indexOf(it.chapter);
        if (k < 0) { order.push(it.chapter); k = order.length - 1; }
        li.append(el('sup', 'tm-ref', k + 1));
      }
      ul.append(li);
    }
    let box = ul.nextElementSibling;
    if (!box || !box.classList.contains('tm-sources')) { box = el('div', 'tm-sources'); ul.after(box); }
    box.textContent = '';
    box.hidden = !order.length;
    if (!order.length) return;
    box.append(el('p', 'tm-sources-h', 'Sources, from Louise\'s book on dog training'));
    const ol = el('ol');
    for (const c of order) ol.append(el('li', null, `${c[0].toUpperCase()}${c.slice(1)}.`));
    box.append(ol);
  }
  // A tool's answer. The tools answer in JSON: lists of card lines ({says, card, sources}) under named parts, which
  // read here as short headed lists with numbered sources. A plain sentence (a question back, a refusal) shows as is.
  const PARTS = {
    stop_and_refer: 'First, the right professional', how_to_say_it: 'How I say it', life_stage: 'Where they are in life',
    breed: 'What the breed hints at', temperament: 'Their temperament', next_rung: 'The next rung', every_session: 'Every session',
    notes: 'What my books say about this pattern',
  };
  function toolOut(box, text) {
    box.hidden = false;
    box.textContent = '';
    let o = null;
    try { o = JSON.parse(text); } catch (_) { o = null; }
    if (!o || typeof o !== 'object') { box.append(el('p', null, String(text))); return; }
    if (typeof o.plan === 'string') box.append(el('p', 'tm-big', o.plan));
    if (Array.isArray(o.skills) && o.skills.length) {
      box.append(el('h4', 'tm-h4', `${plural(o.sessions_logged || 0, 'session', 'sessions')} logged, ${o.sessions_in_the_last_7_days || 0} this week`));
      const ul = el('ul', 'tm-list');
      for (const s of o.skills) ul.append(el('li', null, `${s.skill}: ${plural(s.sessions, 'session', 'sessions')}, last ${s.last}${s.earlier_average ? `, earlier ${s.earlier_average}` : ''}`));
      box.append(ul);
    }
    for (const [key, label] of Object.entries(PARTS)) {
      const lines = Array.isArray(o[key]) ? o[key].filter((x) => x && x.says) : [];
      if (!lines.length) continue;
      box.append(el('h4', 'tm-h4', label));
      const ul = el('ul', 'tm-facts');
      box.append(ul);
      cite(ul, lines.map((x) => ({ text: x.says, chapter: chapter(String((x.sources || [])[0] || '').replace(/:\d+$/, '')) })));
    }
  }

  /* ---------- the person's dogs ---------- */
  let dogs = [];
  let actions = [];
  let lookChoices = {};
  let current = store.get('tm-dog') || '';
  const dogNow = () => dogs.find((d) => d.name === current) || null;
  const pronounOf = (d) => (d && /^(she|he|they)$/i.test(d.pronoun || '') ? d.pronoun.toLowerCase() : 'they');

  async function loadDogs() {
    try {
      const r = await api('/api/dogs');
      dogs = r.dogs || [];
      actions = r.actions || [];
      lookChoices = r.look || {};
    } catch (e) {
      say(`I couldn't read my memory just now: ${e.message}`, 'Tumble', 'worried');
    }
    if (!dogNow()) current = dogs.length ? dogs[0].name : '';
    if (!$('look-coat')) drawLookPickers();
    drawDogBar();
    fillDogForms();
    paintScene();
  }

  function drawDogBar() {
    const bar = $('dogs');
    bar.textContent = '';
    for (const d of dogs) {
      const b = el('button', 'km-chip tm-dog-chip', d.name);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(d.name === current));
      b.addEventListener('click', () => { current = d.name; store.set('tm-dog', current); drawDogBar(); fillDogForms(); paintScene(); refreshPanels(); say(`${d.name}'s turn.`); });
      bar.append(b);
    }
    const add = el('button', 'km-btn-quiet tm-dog-add', dogs.length ? 'Add another dog' : 'Add your dog');
    add.type = 'button';
    add.addEventListener('click', () => { current = ''; drawDogBar(); fillDogForms(); openPanel('dog'); $('dog-name').focus(); });
    bar.append(add);
  }

  /* ---------- the scene ---------- */
  let svg = null, game = null, extras = [];
  const PLACES = [[-150, -34], [-290, -22]];   // where a second and third dog sit, from the first dog's spot
  function paintScene() {
    if (!svg) return;
    const main = svg.querySelector('#dt-dog');
    const d = dogNow();
    window.tmFetch.paint(main, d && d.look);
    const others = dogs.filter((x) => x !== d).slice(0, extras.length);
    extras.forEach((x, i) => {
      x.style.display = others[i] ? '' : 'none';
      if (others[i]) { window.tmFetch.paint(x, others[i].look); x.setAttribute('aria-label', others[i].name); }
    });
    if (main) main.setAttribute('aria-label', d ? `Play fetch with ${d.name}` : 'Play fetch with the dog');
  }

  async function svgAt(path) {
    const res = await fetch(path, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
    if (doc.querySelector('parsererror') || !doc.documentElement || doc.documentElement.nodeName !== 'svg') return null;
    return document.importNode(doc.documentElement, true);
  }

  // The kit draws the live Field and says when it is ready; this lane's dog takes the scene dog's place.
  async function stage(scene) {
    if (svg || !scene || !window.tmFetch) return;
    const theirs = scene.querySelector('[data-km-part="dog"]');
    const art = await svgAt('/art/field-dog.svg');
    const ours = art && art.querySelector('#dt-dog');
    const defs = art && art.querySelector('defs');
    const at = theirs && /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/.exec(theirs.getAttribute('transform') || '');
    if (!ours || !defs || !at) return;
    scene.insertBefore(defs, scene.firstChild);
    ours.setAttribute('data-home', `${at[1]} ${at[2]}`);
    const day = theirs.parentNode;
    theirs.replaceWith(ours);
    // the scene dog's own splash and dust go with it; this dog brings its own
    for (const c of [...day.children]) if (c !== ours) c.setAttribute('display', 'none');
    // after dark the scene puts its dogs to bed; a woken dog shows over the sleeping one (tumble.css)
    day.classList.add('tm-day-dogs');
    const sleeping = day.nextElementSibling;
    if (sleeping && sleeping.classList.contains('km-night-only')) sleeping.classList.add('tm-night-dogs');
    // a second and third dog of the person's sit nearby, each in its own colours
    extras = PLACES.map(([dx, dy], i) => {
      const x = ours.cloneNode(true);
      x.id = `dt-dog-${i + 2}`;
      x.classList.add('dt-sit', 'dt-empty', 'tm-extra');   // one ball in the field: the others pant and watch
      x.setAttribute('transform', `translate(${+at[1] + dx} ${+at[2] + dy})`);
      const body = x.querySelector('.dt-body');
      body.setAttribute('transform', `${body.getAttribute('transform')} translate(0 30) rotate(-32 30 21)`);
      x.querySelectorAll('.dt-splash').forEach((n) => n.remove());
      x.setAttribute('role', 'img');
      x.style.display = 'none';
      ours.before(x);
      x.addEventListener('click', () => {
        const name = x.getAttribute('aria-label');
        if (!dogs.some((d) => d.name === name)) return;
        current = name; store.set('tm-dog', current); drawDogBar(); fillDogForms(); paintScene(); refreshPanels();
        say(`${name}'s turn.`);
      });
      return x;
    });
    svg = scene;
    game = window.tmFetch.init(svg, (t) => say(t), ours);
    paintScene();
    if (!game) return;
    const pause = $('pause');
    pause.hidden = false;
    pause.addEventListener('click', () => {
      const on = pause.getAttribute('aria-pressed') !== 'true';
      pause.setAttribute('aria-pressed', String(on));
      pause.textContent = on ? 'Play Lakeside Field' : 'Pause Lakeside Field';
      svg.classList.toggle('is-paused', on);
      game.setPaused(on);
    });
    if (game.asleep()) say('It\'s night in Lakeside Field. The dog\'s asleep in its house. Show it a command to wake it for a game.', 'Tumble', 'sleepy');
    else say(dogNow() ? `Come in. ${dogNow().name} is out in the field. Tap ${pronounOf(dogNow()) === 'they' ? 'them' : pronounOf(dogNow()) === 'she' ? 'her' : 'him'} to play fetch.` : 'Come in. Tap the dog to play fetch, or tell me about your own dog under My dog.');
  }
  window.addEventListener('kindlemere:ready', (e) => { stage(e.detail && e.detail.svg).catch(() => { /* the plain picture stays */ }); });

  /* ---------- panels ---------- */
  function openPanel(name) {
    for (const b of document.querySelectorAll('.tm-act')) {
      const on = b.dataset.panel === name && b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      $(`panel-${b.dataset.panel}`).hidden = !on;
    }
    if (name === 'play') say('Sniff first, walk second. Pick what you\'d like to play.', 'Barkley');
    if (name === 'treats') say('Treats are training money. Spend them well.', 'Sizzle');
  }
  for (const b of document.querySelectorAll('.tm-act')) b.addEventListener('click', () => openPanel(b.dataset.panel));

  // Show me: the dog does it in the field, with the person's own word for it.
  const COMMANDS = [
    ['sit', 'Sit'], ['down', 'Down'], ['stay', 'Stay'], ['come', 'Come'],
    ['spin', 'Spin'], ['paw', 'Paw'], ['drop it', 'Drop it'], ['fetch', 'Fetch'],
  ];
  const SHOW_FACTS = {
    sit: ['obedience-ladder.md', 'CGC item 6'], down: ['obedience-ladder.md', 'CGC item 6'],
    stay: ['obedience-ladder.md', 'down-stay'], come: ['obedience-ladder.md', 'CGC item 7'],
  };
  function drawShow() {
    const grid = $('show-grid');
    grid.textContent = '';
    for (const [cmd, label] of COMMANDS) {
      const b = el('button', 'km-btn-quiet tm-cmd', label);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (!game) { say('The field is still loading.'); return; }
        const d = dogNow();
        const woke = game.asleep();
        const ok = game.show(cmd);
        if (!ok) { say('Hang on, it\'s busy with the ball. Try again when it\'s home.'); return; }
        const cue = d && d.cues && d.cues[cmd];
        const who = d ? d.name : 'The dog';
        const line = cue ? `"${cue}". That's your word for ${label.toLowerCase()}, and ${who} knows it.` : `${label}. Tell me your own word for it under My dog and I'll use it.`;
        say(woke ? `Up it gets, still a bit sleepy. ${line}` : line);
        const f = SHOW_FACTS[cmd];
        cite($('show-facts'), f ? [fact(f[0], f[1])] : []);
      });
      grid.append(b);
    }
  }

  // Train: a plan from the training-plan tool, and a session logged by the session-log tool.
  const SKILLS = ['sit', 'down', 'stay', 'come', 'heel', 'wait', 'leave it', 'drop it', 'place', 'paw', 'spin', 'off', 'loose-lead walking'];
  const sess = { on: false, reps: 0, hits: 0, start: 0, tick: 0 };
  function refreshPanels() {
    const d = dogNow();
    put('train-who', d ? `For ${d.name}. Tell me more about ${d.name} under My dog and the plan gets sharper.` : 'Add your dog under My dog first, and I\'ll plan around them.');
    $('plan-go').disabled = !d;
    $('sess-start').disabled = !d;
    $('play-save').disabled = !d;
    const list = d && d.playlist && d.playlist.length ? d.playlist.map((id) => (PLAY.find((p) => p.id === id) || {}).label).filter(Boolean) : [];
    put('play-list-now', d ? (list.length ? `${d.name}'s play list: ${list.join('; ')}.` : `No play list for ${d.name} yet. Tick a few and keep them.`) : 'Add your dog under My dog to keep a play list.');
    for (const box of document.querySelectorAll('#play-picks input')) box.checked = Boolean(d && d.playlist && d.playlist.includes(box.value));
  }
  $('plan-go').addEventListener('click', async () => {
    const d = dogNow();
    if (!d) return;
    say(`Thinking about ${d.name}…`, 'Tumble', 'thinking');
    try {
      const r = await api('/api/plan', { dog: d.name });
      toolOut($('plan-out'), r.text);
      say(r.ok ? `Here's a plan for ${d.name}, every step from my books.` : r.text, 'Tumble', r.ok ? 'happy' : 'oh');
    } catch (e) { say(`That didn't work: ${e.message}`, 'Tumble', 'worried'); }
  });
  function sessTick() {
    if (!sess.on) return;
    const s = Math.floor((Date.now() - sess.start) / 1000);
    put('sess-time', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  }
  $('sess-start').addEventListener('click', () => {
    Object.assign(sess, { on: true, reps: 0, hits: 0, start: Date.now() });
    put('sess-hits', 0); put('sess-reps', 0);
    $('sess').hidden = false;
    $('sess-out').hidden = true;
    clearInterval(sess.tick);
    sess.tick = setInterval(sessTick, 1000);
    sessTick();
    const short = fact('sessions-and-criteria.md', 'Keep sessions short');
    say(`${$('sess-skill').value}, then. ${short ? short.text : ''} Tap Got it or Not yet after each try.`);
  });
  const mark = (hit) => { if (!sess.on) return; sess.reps += 1; if (hit) sess.hits += 1; put('sess-hits', sess.hits); put('sess-reps', sess.reps); };
  $('sess-hit').addEventListener('click', () => mark(true));
  $('sess-miss').addEventListener('click', () => mark(false));
  $('sess-end').addEventListener('click', async () => {
    const d = dogNow();
    if (!sess.on || !d) return;
    sess.on = false;
    clearInterval(sess.tick);
    $('sess').hidden = true;
    if (!sess.reps) { say('No tries, so nothing to log. Next time.'); return; }
    try {
      const r = await api('/api/log', { dog: d.name, skill: $('sess-skill').value, reps: sess.reps, hits: sess.hits, minutes: Math.max(1, Math.round((Date.now() - sess.start) / 60000)) });
      toolOut($('sess-out'), r.text);
      say(`Logged: ${sess.hits} right of ${sess.reps}. Good work, both of you.`);
    } catch (e) { say(`I couldn't log that: ${e.message}`, 'Tumble', 'worried'); }
  });

  // Play, with Barkley: games from the cards, kept as a dog's play list.
  const PLAY = [
    { id: 'scent', label: 'Scent and foraging games, every day', file: 'scent-sport-enrichment.md', words: ['Daily scent or foraging'] },
    { id: 'food-toy', label: 'A food-stuffed toy, with a short reward session', file: 'scent-sport-enrichment.md', words: ['food-stuffed'] },
    { id: 'chew', label: 'Something good to chew', file: 'scent-sport-enrichment.md', words: ['A chewing outlet'] },
    { id: 'job', label: 'A job with a start and a finish', file: 'scent-sport-enrichment.md', words: ['A trainable job'] },
    { id: 'names', label: 'Names for toys, and new ones to learn', file: 'high-drive-dogs.md', words: ['1,022'] },
    { id: 'agility', label: 'Agility, from 15 months', file: 'scent-sport-enrichment.md', words: ['15 months'] },
    { id: 'fetch', label: 'Fetch, here in the field', file: null, words: [] },
  ];
  function drawPlay() {
    const ul = $('play-picks');
    ul.textContent = '';
    for (const p of PLAY) {
      const f = p.file ? fact(p.file, ...p.words) : null;
      if (p.file && !f) continue;   // a card that no longer says it: the game is not offered
      const li = el('li');
      const lab = el('label', 'tm-pick');
      const box = el('input');
      box.type = 'checkbox';
      box.value = p.id;
      lab.append(box, el('span', 'tm-pick-name', p.label));
      li.append(lab);
      if (f) { const why = el('ul', 'tm-facts tm-why'); li.append(why); cite(why, [f]); }
      ul.append(li);
    }
  }
  $('play-save').addEventListener('click', async () => {
    const d = dogNow();
    if (!d) return;
    const items = [...document.querySelectorAll('#play-picks input:checked')].map((b) => b.value);
    try {
      const r = await api('/api/dog-playlist', { name: d.name, items });
      dogs = dogs.map((x) => (x.name === d.name ? r.dog : x));
      refreshPanels();
      say(items.length ? `That's ${d.name}'s play list now. Out we go.` : `${d.name}'s play list is empty again.`, 'Barkley');
    } catch (e) { say(`I couldn't keep that: ${e.message}`, 'Barkley'); }
  });

  // Treats, with Sizzle: the 10% budget and the resting-energy formula, both from the card, with the working shown.
  function drawTreats() {
    cite($('treat-facts'), [
      fact('weight-and-treats.md', 'On a 1,000 kcal day'),
      fact('weight-and-treats.md', 'The 10% is calories'),
      fact('weight-and-treats.md', 'Treats are part of the day'),
      fact('weight-and-treats.md', 'a high-rate session is a meal'),
      fact('weight-and-treats.md', 'part of the measured daily ration'),
      fact('weight-and-treats.md', 'Resting energy requirement'),
      fact('weight-and-treats.md', 'Maintenance need is RER'),
    ]);
  }
  $('kcal').addEventListener('input', () => {
    const k = Number($('kcal').value);
    const ok = Number.isFinite(k) && k >= 50 && k <= 6000;
    put('kcal-out', ok ? `Up to ${Math.round(k * 0.1)} kcal of treats a day (10% of ${Math.round(k)}), and the meal shrinks to ${Math.round(k * 0.9)} kcal to match.` : '');
    if (ok) say('Ten percent, in calories. Count the training treats too.', 'Sizzle');
  });
  $('kg').addEventListener('input', () => {
    const kg = Number($('kg').value);
    const ok = Number.isFinite(kg) && kg >= 1 && kg <= 100;
    put('kg-out', ok ? `Resting energy: 70 × ${kg}^0.75 = about ${Math.round(70 * kg ** 0.75)} kcal a day. A day's need is this times a life-stage and activity factor (the card's line below).` : '');
  });

  // Health and safety: the emergency line first, the cards' answers, and Louise for what they don't hold.
  function drawHealth() {
    cite($('health-facts'), [
      fact('preventive-care.md', 'Young adults'),
      fact('preventive-care.md', 'Mature adults and seniors'),
      fact('sessions-and-criteria.md', 'falls apart'),
      fact('weight-and-treats.md', 'nine-point scale'),
    ]);
  }
  $('ask-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('ask-q').value.trim();
    const out = $('ask-out');
    out.textContent = '';
    if (!q) return;
    try {
      const r = await api(`/api/shelf?q=${encodeURIComponent(q)}`);
      const cards = (r.cards || []).slice(0, 2);
      if (!cards.length) {
        say('That isn\'t in my books yet.', 'Tumble', 'oh');
        const b = el('button', 'km-btn-quiet', 'Ask Louise to look it up');
        b.type = 'button';
        b.addEventListener('click', async () => {
          try {
            const a = await api('/api/ask-louise', { topic: q, framing: 'Asked on Tumble\'s page: a dog owner\'s health or safety question the cards do not cover.' });
            say(a.message || 'It\'s on Louise\'s list.', 'Tumble', 'thinking');
            b.remove();
          } catch (err) { say(`I couldn't send that: ${err.message}`, 'Tumble', 'worried'); }
        });
        out.append(el('p', 'tm-note', 'Nothing on my cards answers that. I can send it to Louise, and I\'ll know when her book comes back.'), b);
        return;
      }
      for (const c of cards) {
        out.append(el('p', 'tm-card-title', c.title));
        const ul = el('ul', 'tm-facts');
        out.append(ul);
        cite(ul, c.facts.slice(0, 4).map(shown));
      }
      say('Here\'s what my books say. A vet question first if your dog is unwell.');
    } catch (err) { say(`I couldn't look just now: ${err.message}`, 'Tumble', 'worried'); }
  });

  // My dog: who they are, what they look like (painted into the field as you pick), and how you train them.
  const LOOK_LABELS = { coat: 'Coat', head: 'Head and patches', face: 'Blaze and muzzle', ears: 'Ears', marks: 'Markings', band: 'Bandana' };
  const OPTION_LABELS = { 'one-up': 'one up, one flopped', 'both-up': 'both up', 'both-down': 'both flopped', heart: 'a heart on the back', hip: 'a patch on the hip', plain: 'no patches', none: 'none' };
  const DEFAULT_LOOK = { coat: 'white', head: 'ginger', face: 'white', ears: 'one-up', marks: 'heart', band: 'green' };
  function lookNow() {
    const out = {};
    for (const k of Object.keys(LOOK_LABELS)) { const s = $(`look-${k}`); if (s) out[k] = s.value; }
    return out;
  }
  function drawLookPickers() {
    const fs = $('dog-look');
    for (const n of [...fs.querySelectorAll('label')]) n.remove();
    for (const [k, label] of Object.entries(LOOK_LABELS)) {
      const lab = el('label', 'tm-field', label);
      const s = el('select');
      s.id = `look-${k}`;
      for (const v of lookChoices[k] || []) {
        const o = el('option', null, OPTION_LABELS[v] || v);
        o.value = v;
        s.append(o);
      }
      s.addEventListener('change', () => { if (svg) window.tmFetch.paint(svg.querySelector('#dt-dog'), lookNow()); });
      lab.append(s);
      fs.append(lab);
    }
  }
  function fillDogForms() {
    const d = dogNow();
    put('dog-h', d ? d.name : 'Add your dog');
    for (const f of ['name', 'breed', 'age', 'temperament', 'level']) $(`dog-${f}`).value = d ? (d[f] || '') : '';
    const look = (d && d.look) || DEFAULT_LOOK;
    for (const k of Object.keys(LOOK_LABELS)) { const s = $(`look-${k}`); if (s) s.value = look[k]; }
    $('dog-save').textContent = d ? `Keep ${d.name}` : 'Keep this dog';
    $('ways-form').hidden = !d;
    if (d) put('ways-h', `How you train ${d.name}`);
    const cues = $('cues');
    cues.textContent = '';
    for (const a of actions) {
      const lab = el('label', 'tm-field tm-cue', a);
      const i = el('input');
      i.maxLength = 32;
      i.dataset.action = a;
      i.name = `cue-${a.replace(/ /g, '-')}`;
      i.placeholder = a;
      i.value = d && d.cues[a] ? d.cues[a] : '';
      lab.append(i);
      cues.append(lab);
    }
    $('trouble').value = d && d.trouble && d.trouble !== 'none noted' ? d.trouble : '';
    $('opportunity').value = d && d.opportunity && d.opportunity !== 'none noted' ? d.opportunity : '';
    const skill = $('sess-skill');
    if (!skill.options.length) for (const s of SKILLS) { const o = el('option', null, s); o.value = s; skill.append(o); }
    refreshPanels();
  }
  $('dog-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = dogNow();
    const body = { name: $('dog-name').value.trim(), look: lookNow() };
    if (d && d.name !== body.name) body.was = d.name;
    for (const f of ['breed', 'age', 'temperament', 'level']) body[f] = $(`dog-${f}`).value.trim();
    try {
      const r = await api('/api/dog', body);
      current = r.dog.name;
      store.set('tm-dog', current);
      await loadDogs();
      say(d ? `Got it. I've kept that for ${current}.` : `Hello, ${current}! I'll remember you, on this computer.`);
    } catch (err) { say(err.message, 'Tumble', 'oh'); }
  });
  $('ways-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = dogNow();
    if (!d) return;
    const cues = {};
    for (const i of document.querySelectorAll('#cues input')) if (i.value.trim()) cues[i.dataset.action] = i.value.trim();
    try {
      await api('/api/dog-ways', { name: d.name, cues, trouble: $('trouble').value, opportunity: $('opportunity').value });
      await loadDogs();
      say(`Kept. I'll use your words with ${d.name}.`);
    } catch (err) { say(err.message, 'Tumble', 'oh'); }
  });
  $('dog-forget').addEventListener('click', async () => {
    const d = dogNow();
    if (!d || !window.confirm(`Forget everything I know about ${d.name}?`)) return;
    try {
      const r = await api('/api/dog-forget', { name: d.name });
      current = '';
      await loadDogs();
      say(`Forgotten: ${plural(r.forgot, 'thing', 'things')} about ${d.name}, gone from this computer.`);
    } catch (err) { say(err.message, 'Tumble', 'worried'); }
  });

  /* ---------- the drawer: Tumble's books ---------- */
  $('books-open').addEventListener('click', () => { const dlg = $('books'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
  $('books-close').addEventListener('click', () => { const dlg = $('books'); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); });
  async function load(path, fallback) {
    try { return await window.kit.api(path); } catch (e) { return Object.assign({ error: e.message }, fallback); }
  }
  async function fillBooks(tools, louise, mem) {
    const cards = shelf.filter((c) => !/^louise-/.test(c.file));
    const learned = shelf.filter((c) => /^louise-/.test(c.file));
    const facts = cards.reduce((n, c) => n + (c.facts ? c.facts.length : 0), 0);
    put('know-count', plural(shelf.length, 'card', 'cards'));
    put('know-facts', `${plural(facts, 'fact', 'facts')}, each with its chapter of Louise's book.`);
    const list = $('know-list');
    for (const c of shelf.slice().sort((a, b) => a.title.localeCompare(b.title))) {
      const li = el('li', 'card');
      li.append(el('span', 'card-title', c.title), el('span', 'card-meta', plural(c.facts ? c.facts.length : 0, 'fact', 'facts')));
      list.append(li);
    }
    if (learned.length) put('know-learned', `${plural(learned.length, 'card', 'cards')} learned from Louise since I opened.`);
    if (mem.error) put('mem-dogs', 'I could not read my memory just now.');
    else {
      put('mem-dogs', mem.dogs ? `${plural(mem.dogs, 'dog', 'dogs')} I know by name.` : 'No dogs yet. Tell me about yours.');
      put('mem-facts-n', mem.facts || 0); put('mem-facts', `${mem.facts === 1 ? 'thing' : 'things'} I've been told`);
      put('mem-worked-n', mem.worked || 0); put('mem-worked', `${mem.worked === 1 ? 'note' : 'notes'} on what helped`);
      put('mem-lessons-n', mem.lessons || 0); put('mem-lessons', `${mem.lessons === 1 ? 'lesson' : 'lessons'} I've learned`);
    }
    const tl = $('tools-list');
    for (const t of tools.tools || []) {
      const li = el('li', `tool ${t.ok ? 'is-ok' : 'is-stale'}`);
      li.append(el('span', 'tool-name', t.name), el('span', 'tool-purpose', t.purpose), el('span', 'tool-state', t.ok ? 'Ready' : 'Needs a fresh check'));
      tl.append(li);
    }
    put('tools-count', plural((tools.tools || []).length, 'tool', 'tools'));
    const pending = (louise.requests || []).filter((r) => r.status === 'pending');
    const notAsked = (louise.gaps || []).filter((g) => !g.asked);
    put('louise-count', pending.length ? `${plural(pending.length, 'lantern', 'lanterns')} on the water to Louise.` : 'No lanterns out. Nothing on Louise\'s list from me right now.');
    const ll = $('louise-list');
    for (const r of pending) {
      const li = el('li');
      const lantern = el('div', 'km-lantern');
      const b = el('div');
      lantern.append(b);
      li.append(lantern);
      b.append(el('span', 'ask-topic', r.topic));
      const when = r.asked ? new Date(r.asked) : null;
      b.append(el('span', 'ask-when', when && !isNaN(when) ? `Asked ${when.toLocaleDateString('en-CA')}. I'll know when her book comes back.` : 'I\'ll know when her book comes back.'));
      ll.append(li);
    }
    put('gaps-count', notAsked.length ? `${plural(notAsked.length, 'gap', 'gaps')} in my books, not sent yet.` : 'Every gap in my books has gone to Louise.');
    const gl = $('gaps-list');
    for (const g of notAsked) gl.append(el('li', 'gap', g.topic));
  }

  async function main() {
    const [agent, sh, tools, louise, mem] = await Promise.all([
      load('/api/agent', {}), load('/api/shelf', { cards: [] }), load('/api/tools', { tools: [] }),
      load('/api/louise', { requests: [], gaps: [] }), load('/api/remembered', {}),
    ]);
    shelf = sh.cards || [];
    if (agent.name) {
      document.title = `${agent.name}, ${agent.title}`;
      put('name', agent.name);
    }
    drawShow();
    drawPlay();
    drawTreats();
    drawHealth();
    cite($('sess-rules'), [
      fact('sessions-and-criteria.md', 'Keep sessions short'),
      fact('sessions-and-criteria.md', 'Change one thing at a time'),
      fact('sessions-and-criteria.md', 'Never resolve a stall'),
      fact('sessions-and-criteria.md', 'adolescent dip'),
      fact('sessions-and-criteria.md', 'falls apart'),
    ]);
    await loadDogs();
    await fillBooks(tools, louise, mem);
  }
  main().catch((e) => say(`Something went wrong drawing this page: ${e.message}`, 'Tumble', 'worried'));
}());
