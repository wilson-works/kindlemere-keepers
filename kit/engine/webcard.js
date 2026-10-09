'use strict';

/**
 * kit/engine/webcard.js — a keeper keeps what it found on the web as a card (kit/CONTRACT.md, section 7a). Node
 * built-ins only. It never fetches anything itself: the keeper searched and read the pages with WebSearch and
 * WebFetch, and hands this script the facts it took from them, each with the address it came from.
 *
 * Owner, 2026-10-09: "allow them to search the internet for solutions when Louise is unavailable. They are useless
 * without accessing information and we cant rely on Louise for everything." So the next answer comes from the card,
 * not from another search, and when Louise is on this computer the question also goes on her list once, for a fuller
 * book.
 *
 *   save(key, title, facts, { question, tags })
 *       writes agents/<key>/knowledge/web-<slug>.md in the card format (section 3: origin web, fetched today, the web
 *       addresses as its sources, one @<address> after each fact), reads it back through the shelf's own reader, and
 *       then, only when Louise is on this computer, puts the title on her list (louise.js ask; never twice while it is
 *       pending). Returns { card, facts, sources, fetched, louise: { installed, message } }.
 *
 * CLI: webcard.js save <agent> "<title>" "<fact> @<https://...>" ["<fact> @<https://...>" ...]
 *        [--question "<what was asked, with nothing about the person>"] [--tags "<a, b>"]   [--json]
 */

const fs = require('fs');
const path = require('path');
const common = require('./common');
const cards = require('./cards');
const louise = require('./louise');

const TITLE_MAX = 120;
const FACT_MAX = 600;
const FACTS_MAX = 25;
const URL_MAX = 500;
const QUESTION_MAX = 300;

const clean = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

function checkAddress(u) {
  if (u.length > URL_MAX) return `${u.slice(0, 60)}... is longer than ${URL_MAX} characters.`;
  let url;
  try { url = new URL(u); } catch (_) { return `${u} is not a web address.`; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return `${u} is not an http or https address.`;
  if (url.username || url.password) return `${u} carries a login in it. Give the page's plain address.`;
  if (/[,[\]]/.test(u)) return `${u} has a comma or a square bracket in it. Write a comma as %2C.`;
  return null;
}

function save(key, titleIn, factsIn, opts) {
  const o = opts || {};
  const info = common.agentInfo(key);
  const title = clean(titleIn).replace(/^#+\s*/, '');
  if (title.length < 3) throw common.refuse('Give the card a title: what it is about, in a few words.');
  if (title.length > TITLE_MAX) throw common.refuse(`Keep the title to ${TITLE_MAX} characters.`);
  const list = (Array.isArray(factsIn) ? factsIn : []).map((f) => clean(f).replace(/^[-*+]\s+/, '')).filter(Boolean);
  if (!list.length) throw common.refuse('Give at least one fact, each ending with @ and the web address it came from.');
  if (list.length > FACTS_MAX) throw common.refuse(`Keep a card to ${FACTS_MAX} facts. Split a bigger subject into two cards.`);
  const sources = [];
  list.forEach((f, i) => {
    if (f.length > FACT_MAX) throw common.refuse(`Fact ${i + 1} is longer than ${FACT_MAX} characters. Split it in two.`);
    if (cards.sourcesIn(f).length) throw common.refuse(`Fact ${i + 1} names a page of Louise's book. A card from the web names only web pages.`);
    const urls = cards.webIn(f);
    if (!urls.length) throw common.refuse(`Fact ${i + 1} does not say where it came from. End it with @ and the page's address, like @https://www.cdc.gov/...`);
    for (const u of urls) {
      const why = checkAddress(u);
      if (why) throw common.refuse(`Fact ${i + 1}: ${why}`);
      if (!sources.includes(u)) sources.push(u);
    }
  });
  const question = clean(o.question).slice(0, QUESTION_MAX);
  const tags = clean(o.tags).split(',').map((t) => clean(t).toLowerCase().replace(/[^a-z0-9 -]/g, '')).filter(Boolean).slice(0, 8);

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  if (!slug) throw common.refuse('Give the card a title with some letters or numbers in it.');
  const name = `web-${slug}.md`;
  const file = path.join(info.dir, 'knowledge', name);
  if (fs.existsSync(file)) {
    throw common.refuse(`knowledge/${name} is already on the shelf. Read it (shelf.js show ${key} ${name}), or give this one a different title.`);
  }
  const fetched = common.today();
  const head = ['---', `title: ${title}`, `sources: [${sources.join(', ')}]`, 'origin: web', `fetched: ${fetched}`, `copied: ${fetched}`];
  if (tags.length) head.push(`tags: [${tags.join(', ')}]`);
  if (question) head.push(`question: ${question}`);
  head.push('---', '');
  const body = [`# ${title}`, '', `Found on the web on ${fetched}, when ${info.name}'s cards and Louise's books did not cover it. Each fact names the page it came from.`, '',
    ...list.map((f) => `- ${f}`), ''].join('\n');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, head.join('\n') + body, { encoding: 'utf8', flag: 'wx' });
  const card = cards.read(file);
  if (card.refused) {
    fs.rmSync(file, { force: true });
    throw common.refuse(`The card did not read back, so it was not kept: ${card.refused}`);
  }

  // Louise, only when she is on this computer. When she is not, nothing pretends she is.
  let installed = true;
  try { louise.louiseDir(); } catch (_) { installed = false; }
  let message = "Louise is not on this computer, so it is not on her list. The card is what there is for now.";
  if (installed) {
    const framing = `Found on the web first and kept as the card knowledge/${name} (${list.length} fact${list.length === 1 ? '' : 's'} from ${sources.length} page${sources.length === 1 ? '' : 's'}, fetched ${fetched}). A fuller book, with a source for every fact, would replace it.${question ? ` The question: ${question}` : ''}`;
    try { message = louise.ask(key, title, framing).message; } catch (e) { message = e.message; }
  }
  return { card: name, facts: list.length, sources, fetched, louise: { installed, message } };
}

module.exports = { save };

if (require.main === module) {
  common.cli((args) => {
    const [cmd, key, title, ...facts] = args._;
    if (cmd !== 'save' || !key) {
      throw common.refuse('Use: webcard.js save <agent> "<title>" "<fact> @<https://...>" ["<fact> @<https://...>" ...] [--question "<what was asked>"] [--tags "<a, b>"]');
    }
    const r = save(key, title, facts, { question: args.question === true ? '' : args.question, tags: args.tags === true ? '' : args.tags });
    const text = `Saved knowledge/${r.card}: ${r.facts} fact${r.facts === 1 ? '' : 's'} from ${r.sources.length} web page${r.sources.length === 1 ? '' : 's'}, fetched ${r.fetched}.\n${r.louise.message}`;
    return { text, data: r };
  });
}
