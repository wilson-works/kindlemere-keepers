'use strict';

/* Steady's page. Reads the kit API only (kit/CONTRACT.md, section 10). Memory is shown as counts, never contents. */
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
  // Steady's mood shows in the face and the pose. The figures come from the kit (kit/art/keepers/fitness-<mood>.svg);
  // until the kit has exported them, the figure stays hidden and the hero shows the hill alone.
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
      for (const f of c.facts) {
        const li = el('li', null, plain(f.text));
        const where = (f.sources || []).map((x) => `${x.page}${x.line ? `:${x.line}` : ''}`).join('  ');
        if (where) li.append(el('span', 'km-source', where));
        ul.append(li);
      }
      d.append(ul);
      box.append(d);
    }
  }

  async function loadShelf() {
    const { cards } = await kit.api('/api/shelf');
    $('n-cards').textContent = cards.length;
    say('l-cards', cards.length, 'card on my shelf', 'cards on my shelf');
    $('n-facts').textContent = cards.reduce((n, c) => n + c.facts.length, 0);
    renderCards(cards, 'My shelf is empty.');
  }

  async function find(q) {
    mood('thinking');
    if (!q) { await loadShelf(); mood('happy'); return; }
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
    $('n-remember').textContent = m.facts.length + m.worked.length + m.lessons.length;
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

  async function greet() {
    const a = await kit.agent();
    const jokes = Array.isArray(a.jokes) ? a.jokes : [];
    if (jokes.length) $('greeting').textContent = jokes[Math.floor(Math.random() * jokes.length)];
  }

  const fig = $("figure");
  fig.addEventListener("load", () => { fig.hidden = false; });
  fig.addEventListener("error", () => { fig.hidden = true; });
  if (fig.complete && fig.naturalWidth > 0) fig.hidden = false;
  $('find').addEventListener('submit', (e) => {
    e.preventDefault();
    find($('q').value.trim()).catch((err) => { $('know-note').textContent = err.message; mood('worried'); });
  });

  Promise.all([greet(), loadShelf(), loadMemory(), loadTools(), loadLouise()])
    .catch((err) => { $('know-note').textContent = err.message; mood('worried'); });
}());
