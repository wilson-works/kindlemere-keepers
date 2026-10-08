'use strict';

/* Cairn's page. Reads the kit API only (kit/CONTRACT.md, section 10). Memory is shown as counts, never contents. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const plain = (t) => String(t || '').replace(/\s*@\S+/g, '').replace(/\s*\[\^\d+\]/g, '').trim();
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
    $('n-facts').textContent = cards.reduce((n, c) => n + c.facts.length, 0);
    renderCards(cards, 'My shelf is empty.');
  }

  async function find(q) {
    if (!q) return loadShelf();
    const { cards } = await kit.api(`/api/shelf?q=${encodeURIComponent(q)}`);
    renderCards(cards, "Nothing on my shelf about that yet. That's a question for Louise.");
  }

  async function loadMemory() {
    const m = await kit.api('/api/memory');
    $('m-facts').textContent = m.facts.length;
    $('m-worked').textContent = m.worked.length;
    $('m-lessons').textContent = m.lessons.length;
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

  $('find').addEventListener('submit', (e) => {
    e.preventDefault();
    find($('q').value.trim()).catch((err) => { $('know-note').textContent = err.message; });
  });

  Promise.all([greet(), loadShelf(), loadMemory(), loadTools(), loadLouise()])
    .catch((err) => { $('know-note').textContent = err.message; });
}());
