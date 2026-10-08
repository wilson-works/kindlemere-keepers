'use strict';

// Avo's room: what she knows, what she remembers (counts only), her tools, and what waits on Louise.
// Everything comes from the kit's API. Nothing here states a fact of its own.
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
  const day = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  const fail = (box, e) => box.replaceChildren(el('li', 'quiet', e && e.message ? e.message : 'That did not load. Try again in a moment.'));
  const NEIGHBOURS = {
    fitness: ['The fitness coach', 'Stepping Hill'],
    'dog-training': ['Tumble', 'Lakeside Field'],
    louise: ['Louise', 'the Librarian\'s house'],
  };

  async function hello() {
    const a = await kit.agent();
    document.title = `${a.name}, the nutritionist`;
    $('name').textContent = a.name;
    $('title').textContent = a.title;
    $('line').textContent = a.line;
    const jokes = Array.isArray(a.jokes) ? a.jokes : [];
    if (jokes.length) $('greeting').textContent = jokes[Math.floor(Math.random() * jokes.length)];
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
      const lantern = (topic, state) => {
        const li = el('li', 'km-lantern');
        const body = el('div', 'ask-body');
        body.append(el('span', 'ask-topic', topic), el('span', 'ask-state', state));
        li.append(body);
        return li;
      };
      const items = [
        ...pending.map((r) => lantern(r.topic, `Sent ${day(r.asked)}. Waiting for her book.`)),
        ...learned.map((r) => { const li = el('li', 'later'); li.append(el('span', 'ask-topic', r.topic), el('span', 'ask-state', 'Her book came back. I learned it.')); return li; }),
        ...toAsk.map((g) => { const li = el('li', 'later'); li.append(el('span', 'ask-topic', g.topic), el('span', 'ask-state', 'Not sent yet. My book did not cover it.')); return li; }),
      ];
      box.replaceChildren(...(items.length ? items : [el('li', 'quiet', 'Nothing waiting on Louise.')]));
    } catch (e) { fail(box, e); }
  }

  // The hero is the kit's close view of the Orchard. Until it lands, the card stands on its words alone.
  const hero = $('hero-art');
  if (hero) {
    const drop = () => hero.closest('.hello').classList.add('no-art');
    hero.addEventListener('error', drop);
    if (hero.complete && !hero.naturalWidth) drop();
  }

  $('ask').addEventListener('submit', search);
  hello().catch(() => {});
  shelf();
  memory();
  tools();
  louise();
}());
