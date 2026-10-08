'use strict';

/* The dog trainer's room: what it knows, what it remembers (counts only), its tools, and what waits on Louise.
   Everything is drawn with textContent, never as HTML. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const say = (id, text) => { const n = $(id); if (n) n.textContent = text; };

  async function load(path, fallback) {
    try { return await window.kit.api(path); } catch (e) { return Object.assign({ error: e.message }, fallback); }
  }

  async function main() {
    const [agent, shelf, mem, tools, louise] = await Promise.all([
      load('/api/agent', {}), load('/api/shelf', { cards: [] }), load('/api/remembered', {}),
      load('/api/tools', { tools: [] }), load('/api/louise', { requests: [], gaps: [] }),
    ]);

    if (agent.name) {
      document.title = `${agent.name}, ${agent.title}`;
      say('name', agent.name);
      say('title', agent.title);
      say('line', agent.line);
      const jokes = Array.isArray(agent.jokes) ? agent.jokes : [];
      if (jokes.length) say('greeting', jokes[Math.floor(Math.random() * jokes.length)]);
    }

    // What it knows.
    const cards = (shelf.cards || []).filter((c) => !/^louise-/.test(c.file));
    const learned = (shelf.cards || []).filter((c) => /^louise-/.test(c.file));
    const facts = cards.reduce((n, c) => n + (c.facts ? c.facts.length : 0), 0);
    say('know-count', plural(cards.length + learned.length, 'card', 'cards'));
    say('know-facts', `${plural(facts, 'fact', 'facts')}, each with its page in Louise's book beside it.`);
    const list = $('know-list');
    for (const c of (shelf.cards || []).slice().sort((a, b) => a.title.localeCompare(b.title))) {
      const li = el('li', 'card');
      li.appendChild(el('span', 'card-title', c.title));
      li.appendChild(el('span', 'card-meta', plural(c.facts ? c.facts.length : 0, 'fact', 'facts')));
      list.appendChild(li);
    }
    if (learned.length) say('know-learned', `${plural(learned.length, 'card', 'cards')} learned from Louise since I opened.`);

    // What it remembers, counts only.
    if (mem.error) say('mem-dogs', 'I could not read my memory just now.');
    else {
      say('mem-dogs', mem.dogs ? `${plural(mem.dogs, 'dog', 'dogs')} I know by name.` : 'No dogs yet. Tell me about yours.');
      say('mem-facts-n', mem.facts || 0);
      say('mem-facts', (mem.facts === 1 ? 'thing' : 'things') + ' I\'ve been told');
      say('mem-worked-n', mem.worked || 0);
      say('mem-worked', (mem.worked === 1 ? 'note' : 'notes') + ' on what helped');
      say('mem-lessons-n', mem.lessons || 0);
      say('mem-lessons', (mem.lessons === 1 ? 'lesson' : 'lessons') + ' I\'ve learned');
    }

    // Its tools.
    const tl = $('tools-list');
    for (const t of tools.tools || []) {
      const li = el('li', `tool ${t.ok ? 'is-ok' : 'is-stale'}`);
      li.appendChild(el('span', 'tool-name', t.name));
      li.appendChild(el('span', 'tool-purpose', t.purpose));
      li.appendChild(el('span', 'tool-state', t.ok ? 'Ready' : 'Needs a fresh check'));
      tl.appendChild(li);
    }
    say('tools-count', plural((tools.tools || []).length, 'tool', 'tools'));

    // What waits on Louise.
    const pending = (louise.requests || []).filter((r) => r.status === 'pending');
    const notAsked = (louise.gaps || []).filter((g) => !g.asked);
    say('louise-count', pending.length
      ? `${plural(pending.length, 'lantern', 'lanterns')} on the water to Louise.`
      : 'No lanterns out. Nothing on Louise\'s list from me right now.');
    const ll = $('louise-list');
    for (const r of pending) {
      const li = el('li');
      const lantern = el('div', 'km-lantern');
      const body = el('div');
      lantern.appendChild(body);
      li.appendChild(lantern);
      body.appendChild(el('span', 'ask-topic', r.topic));
      const when = r.asked ? new Date(r.asked) : null;
      body.appendChild(el('span', 'ask-when', when && !isNaN(when) ? `Asked ${when.toLocaleDateString('en-CA')}. I'll know when her book comes back.` : 'I\'ll know when her book comes back.'));
      ll.appendChild(li);
    }
    say('gaps-count', notAsked.length
      ? `${plural(notAsked.length, 'gap', 'gaps')} in my books, not sent yet.`
      : 'Every gap in my books has gone to Louise.');
    const gl = $('gaps-list');
    for (const g of notAsked) gl.appendChild(el('li', 'gap', g.topic));
  }

  main().catch((e) => say('greeting', `Something went wrong drawing this page: ${e.message}`));
}());
