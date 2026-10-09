'use strict';
/**
 * kit/engine/export.js — everything the keepers know, as one plain file another app can read without AI.
 * Node built-ins only.
 *
 * Owner, 2026-10-09: "ensure the align repo will have access to any new research as well since that is an all in one
 * health and fitness app designed to run without AI". Align (wilson-works/align) reads exports/kindlemere-library.json
 * with its own sync script (backend/scripts/sync_kindlemere.py); the shape is the contract both sides keep,
 * format "kindlemere-library/1" (Align's docs/kindlemere-library.md).
 *
 *   node kit/engine/export.js            write exports/kindlemere-library.json and print the counts
 *   node kit/engine/export.js --check    build it in memory and print the counts, writing nothing
 *
 * What goes in: every recipe in an agent's knowledge/cookbook/recipes.json, and every knowledge card the shelf would use
 * (front matter, body as written, and the sources it names, with the web addresses those source pages cite). What stays
 * out: GAPS.md and READMEs, cards the shelf refuses, and the research library in kit/library (it came from Align).
 * Nothing is invented: a field the keepers do not have is null.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cards = require('./cards');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'exports', 'kindlemere-library.json');
const URL_RE = /https?:\/\/[^\s)>\]"'`]+/g;
const MAX_URLS = 12;

/** Now as an ISO time in Central time (the owner's clock), e.g. 2026-10-09T02:10:00-05:00. */
function centralIso(d) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'shortOffset',
  }).formatToParts(d).map((p) => [p.type, p.value]));
  const off = /GMT([+-]\d+)/.exec(parts.timeZoneName || '');
  const h = off ? Number(off[1]) : -6;
  const sign = h < 0 ? '-' : '+';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${sign}${String(Math.abs(h)).padStart(2, '0')}:00`;
}

function sha() {
  try { return execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (_) { return null; }
}

function agentsOf() {
  const dir = path.join(ROOT, 'agents');
  return fs.readdirSync(dir).filter((a) => fs.existsSync(path.join(dir, a, 'knowledge'))).sort();
}

/** The page a card names (<book>/<page>.md), wherever this agent keeps its books; null when it is not here. */
function pageFile(agent, ref) {
  const k = path.join(ROOT, 'agents', agent, 'knowledge');
  const rel = String(ref).replace(/^research\//, '');
  for (const base of [path.join(k, 'books'), path.join(k, 'book'), path.join(k, 'book', 'pages')]) {
    const f = path.join(base, rel);
    if (fs.existsSync(f)) return f;
    const flat = path.join(base, path.basename(rel));
    if (fs.existsSync(flat)) return flat;
  }
  return null;
}

/**
 * The web addresses a source page cites, in order, without repeats: the ones written in the page, and the ones its
 * footnotes ([^n]) point to in the book's shared sources.md ("[^n]: [title](url) ...").
 */
function urlsIn(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const seen = new Set();
    const add = (u) => { const clean = u.replace(/[.,;:]+$/, ''); if (seen.size < MAX_URLS) seen.add(clean); };
    for (const u of text.match(URL_RE) || []) add(u);
    const notes = new Set((text.match(/\[\^(\d+)\]/g) || []).map((m) => m.slice(2, -1)));
    const bib = path.join(path.dirname(file), 'sources.md');
    if (notes.size && fs.existsSync(bib) && path.basename(file) !== 'sources.md') {
      for (const line of fs.readFileSync(bib, 'utf8').split(/\r?\n/)) {
        const m = /^\[\^(\d+)\]:.*?(https?:\/\/[^\s)>\]"'`]+)/.exec(line);
        if (m && notes.has(m[1])) add(m[2]);
      }
    }
    return [...seen];
  } catch (_) { return []; }
}

function originOf(c) {
  const o = String(c.origin || '').toLowerCase();
  if (o.includes('web')) return 'web';
  if (o.includes('library')) return 'library';
  if (c.louise_book || o.includes('louise')) return 'louise';
  return 'card';
}

function cardsOf(agent) {
  const k = path.join(ROOT, 'agents', agent, 'knowledge');
  const out = [];
  for (const name of cards.cardsIn(k)) {
    const c = cards.read(path.join(k, name));
    if (!c || c.refused) continue;
    const origin = originOf(c);
    if (origin === 'library') continue;
    const sources = [];
    const named = Array.isArray(c.sources) ? c.sources : c.sources ? [c.sources] : [];
    for (const ref of named) {
      if (/^https?:\/\//.test(ref)) { sources.push({ title: ref, url: ref }); continue; }
      const f = pageFile(agent, ref);
      const urls = f ? urlsIn(f) : [];
      if (!urls.length) sources.push({ title: ref, url: null });
      for (const u of urls) sources.push({ title: ref, url: u });
    }
    if (!sources.length) continue; // the contract: every card carries a source
    out.push({
      agent, id: name.replace(/\.md$/i, ''), title: c.title || name.replace(/\.md$/i, ''),
      topic: Array.isArray(c.tags) && c.tags.length ? c.tags[0] : null,
      body: String(c.body || '').trim(), sources, origin,
      updated: typeof c.copied === 'string' ? c.copied : null,
    });
  }
  return out;
}

function recipesOf(agent) {
  const f = path.join(ROOT, 'agents', agent, 'knowledge', 'cookbook', 'recipes.json');
  if (!fs.existsSync(f)) return [];
  const lib = JSON.parse(fs.readFileSync(f, 'utf8'));
  const monthsOf = (s) => { const m = /(\d+)(?:\s*(?:to|-)\s*(\d+))?\s*month/i.exec(String(s || '')); return m ? Number(m[2] || m[1]) : null; };
  return (lib.recipes || []).filter((r) => r && r.source && r.source.url).map((r) => ({
    id: r.id, title: r.title, meal: r.meal || null, keeper: r.keeper || null,
    servings: r.servings ?? null, prep_min: r.prep_min ?? null, cook_min: r.cook_min ?? null,
    ingredients: (r.ingredients || []).map((i) => ({
      qty: i.qty_text || (i.qty != null ? String(i.qty) : null), unit: i.unit || null,
      item: i.prep ? `${i.item}, ${i.prep}` : i.item, aisle: i.aisle || null, optional: !!i.optional,
    })),
    steps: r.steps || [], diet_tags: r.diet || [], allergens: r.allergens || [], equipment: r.equipment || [],
    prep: r.prep ? {
      batch: r.prep.batch ?? null, fridge_days: r.prep.fridge_days ?? null, freezes: r.prep.freezes ?? null,
      freezer_months: r.prep.freezes ? monthsOf(r.prep.freezer) : null, reheat: r.prep.reheat || null,
    } : null,
    nutrition: r.nutrition || null,
    source: { name: r.source.name || null, url: r.source.url, fetched: r.source.fetched || null },
  }));
}

function build() {
  const agents = agentsOf();
  return {
    format: 'kindlemere-library/1',
    generated_at: centralIso(new Date()),
    source: { repo: 'wilson-works/kindlemere-keepers', sha: sha() },
    recipes: agents.flatMap(recipesOf),
    cards: agents.flatMap(cardsOf),
  };
}

function counts(lib) {
  const by = (xs, k) => xs.reduce((m, x) => { m[x[k]] = (m[x[k]] || 0) + 1; return m; }, {});
  return { recipes: lib.recipes.length, by_meal: by(lib.recipes, 'meal'), cards: lib.cards.length, by_agent: by(lib.cards, 'agent'), by_origin: by(lib.cards, 'origin') };
}

if (require.main === module) {
  const lib = build();
  if (!process.argv.includes('--check')) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const tmp = `${OUT}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(lib, null, 1)}\n`, 'utf8');
    fs.renameSync(tmp, OUT);
    process.stdout.write(`wrote ${path.relative(ROOT, OUT)}\n`);
  }
  process.stdout.write(`${JSON.stringify(counts(lib))}\n`);
}

module.exports = { build, counts, OUT };
