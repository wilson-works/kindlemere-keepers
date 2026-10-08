'use strict';

/**
 * kit/engine/shelf.js — an agent's shelf of knowledge cards (kit/CONTRACT.md, sections 3 and 4). Node built-ins only.
 * It only reads: the agent's knowledge/ and, for `check --strict`, the pages its cards name in Louise's library.
 *
 *   all(key)                 every card, read (refused ones carry .refused)
 *   find(key, words)         [{ file, title, sources, score, facts: [matching facts] }], best first, refused left out
 *   show(key, file)          the card, or throws (status 1) when there is none
 *   check(key, { strict })   { ok: [file], refused: [{ file, why }], problems: [{ file, line, why }] }
 *
 * CLI: list <agent> | find <agent> "<words>" | show <agent> <file> | check <agent> [--strict]   [--json]
 */

const fs = require('fs');
const path = require('path');
const common = require('./common');
const cards = require('./cards');

const knowledgeDir = (key) => path.join(common.agentDir(key), 'knowledge');

function all(key) {
  const dir = knowledgeDir(key);
  return cards.cardsIn(dir).map((f) => cards.read(path.join(dir, f)));
}

function find(key, q) {
  const want = cards.words(q);
  if (!want.length) return [];
  const out = [];
  for (const c of all(key)) {
    if (c.refused) continue;
    const titleW = new Set(cards.words(`${c.title} ${c.file.replace(/\.md$/i, '')}`));
    const tagW = new Set(cards.words(c.tags.join(' ')));
    let score = 0;
    const hits = [];
    for (const f of c.facts) {
      const fw = new Set(cards.words(f.text));
      const n = want.filter((w) => fw.has(w)).length;
      if (n) { score += n; hits.push({ f, n }); }
    }
    for (const w of want) { if (titleW.has(w)) score += 3; if (tagW.has(w)) score += 3; }
    if (!score) continue;
    hits.sort((a, b) => b.n - a.n || a.f.line - b.f.line);
    out.push({ file: c.file, title: c.title, sources: c.sources, score, facts: hits.slice(0, 5).map((h) => h.f) });
  }
  return out.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
}

function show(key, file) {
  const name = path.basename(String(file || ''));
  if (!name || name !== file || !/\.md$/i.test(name)) throw common.refuse('Name a card file in the knowledge folder, like protein.md.');
  const f = path.join(knowledgeDir(key), name);
  if (!fs.existsSync(f)) throw common.refuse(`There is no card called ${name} on the shelf.`, 1);
  return cards.read(f);
}

/** Does Louise's page exist on one of her shelves, and (when a line is named) is it that long? */
function pageProblem(libraries, page, line) {
  if (!libraries || !libraries.length) return null;
  const parts = page.split('/');
  if (parts.some((p) => !p || p === '..' || p === '.')) return `${page} is not a plain page path.`;
  let text = null;
  for (const lib of libraries) {
    try { text = fs.readFileSync(path.join(lib, ...parts), 'utf8'); break; } catch (_) { /* try her next shelf */ }
  }
  if (text == null) return `${page} does not open in Louise's library.`;
  if (line != null) {
    const n = text.split('\n').length;
    if (line < 1 || line > n) return `${page} has ${n} lines, not ${line}.`;
  }
  return null;
}

function check(key, opts) {
  const strict = Boolean(opts && opts.strict);
  let library = [];
  let libraryNote = null;
  if (strict) {
    try { library = require('./louise').libraryDirs(); } catch (e) { libraryNote = e.message; }
    if (!library.length && !libraryNote) libraryNote = "Louise has no library set, so the source pages could not be opened.";
  }
  const res = { ok: [], refused: [], problems: [], library, libraryNote };
  for (const c of all(key)) {
    if (c.refused) { res.refused.push({ file: c.file, why: c.refused }); continue; }
    const problems = [];
    if (strict) {
      // Louise's own cards are copied exactly as she wrote them, so only their pages are checked, not every bullet.
      if (c.origin !== 'louise-card') {
        for (const f of c.facts) if (!f.sources.length) problems.push({ file: c.file, line: f.line, why: 'This bullet has no @ source.' });
      }
      const seen = new Set();
      const pages = c.sources.map((p) => ({ page: p, line: null, at: 'sources' }))
        .concat(...c.facts.map((f) => f.sources.map((s) => ({ page: s.page, line: s.line, at: f.line }))));
      for (const p of pages) {
        const id = `${p.page}:${p.line}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const why = pageProblem(library, p.page, p.line);
        if (why) problems.push({ file: c.file, line: p.at, why });
      }
    }
    if (problems.length) res.problems.push(...problems);
    else res.ok.push(c.file);
  }
  if (strict && libraryNote) res.problems.push({ file: '-', line: '-', why: libraryNote });
  return res;
}

module.exports = { all, find, show, check, knowledgeDir };

if (require.main === module) {
  common.cli((args) => {
    const [cmd, key, a] = args._;
    if (cmd === 'list') {
      const cs = all(key);
      const good = cs.filter((c) => !c.refused);
      const bad = cs.filter((c) => c.refused);
      const lines = good.map((c) => `${c.file}  ${c.title}  (${c.sources.length} source${c.sources.length === 1 ? '' : 's'})`);
      if (bad.length) lines.push('', 'Refused:', ...bad.map((c) => `${c.file}  ${c.refused}`));
      if (!cs.length) return { text: 'The shelf is empty.', data: [], code: 1 };
      return { text: lines.join('\n'), data: cs.map(({ body, ...rest }) => rest) };
    }
    if (cmd === 'find') {
      const r = find(key, a);
      if (!r.length) return { text: 'Nothing on my shelf about that.', data: [], code: 1 };
      const text = r.map((c) => [`${c.file}  ${c.title}`]
        .concat(c.facts.map((f) => `   ${f.text}`)).join('\n')).join('\n\n');
      return { text, data: r };
    }
    if (cmd === 'show') {
      const c = show(key, a);
      if (c.refused) return { text: `${c.file} is refused: ${c.refused}`, data: c, code: 2 };
      return { text: `${c.title}\nSources: ${c.sources.join(', ')}\n\n${c.body.trim()}`, data: c };
    }
    if (cmd === 'check') {
      const r = check(key, { strict: args.strict });
      const lines = r.ok.map((f) => `ok       ${f}`)
        .concat(r.refused.map((x) => `refused  ${x.file}: ${x.why}`))
        .concat(r.problems.map((p) => `problem  ${p.file}:${p.line}: ${p.why}`));
      const bad = r.refused.length + r.problems.length;
      lines.push(`${r.ok.length} ok, ${r.refused.length} refused, ${r.problems.length} problem${r.problems.length === 1 ? '' : 's'}${args.strict ? ' (strict)' : ''}.`);
      return { text: lines.join('\n'), data: r, code: bad ? 2 : 0 };
    }
    throw common.refuse('Use: shelf.js list <agent> | find <agent> "<words>" | show <agent> <file> | check <agent> [--strict]');
  });
}
