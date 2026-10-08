'use strict';

/**
 * kit/engine/learn.js — an agent takes in a book Louise shelved for one of its requests (kit/CONTRACT.md, section 7).
 * Node built-ins only. Louise's shelves are only read, through her own `engine/library.js find`; her summary card is
 * copied into the agent's knowledge/, never moved.
 *
 *   candidates(key, topic, askedDay)   her finished books for the topic, shelved on or after askedDay, best first
 *   learn(key, { dry, topic, book })   [{ topic, status: learned | waiting | no-card | dry, book, card, why }]
 *
 * A book counts for a request (automatic mode) when it is a finished topic, shelved on or after the day it was asked,
 * and at least half the request's words are in its title or folder name. With --topic and --book the agent has judged
 * the match itself, and only "finished" and "has a summary card" are checked.
 *
 * CLI: learn.js <agent> [--dry] | learn.js <agent> --topic "<pending topic>" --book <book id>   [--json]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const common = require('./common');
const cards = require('./cards');
const louise = require('./louise');

function findBooks(dir, topic) {
  let out;
  try {
    out = execFileSync(process.execPath, ['engine/library.js', 'find', topic, '--json'],
      { cwd: dir, encoding: 'utf8', windowsHide: true, timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = e.stdout || '';
    if (!out.trim()) return [];
  }
  try { const r = JSON.parse(out); return Array.isArray(r) ? r : []; } catch (_) { return []; }
}

/** One book by its id: her `list` names it, and her `find` on its title gives the root it sits in. */
function findById(dir, id, topic) {
  const quick = findBooks(dir, topic).find((b) => b.id === id);
  if (quick) return quick;
  let all;
  try {
    all = JSON.parse(execFileSync(process.execPath, ['engine/library.js', 'list', '--json'],
      { cwd: dir, encoding: 'utf8', windowsHide: true, timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (_) { return null; }
  const listed = (all.books || []).find((b) => b.id === id);
  return listed ? findBooks(dir, listed.title).find((b) => b.id === id) || null : null;
}

const cardPage = (book) => (book.pages || []).find((p) => p.kind === 'card') || null;
const bookFolder = (book) => {
  const p = (book.pages || []).find((x) => x.kind === 'report' || x.kind === 'brief');
  return p ? p.file.split('/')[0] : String(book.id || '').replace(/^\d+-[a-z]-/, '');
};

function candidates(dir, topic, askedDay) {
  const want = [...new Set(cards.words(topic))];
  return findBooks(dir, topic)
    .filter((b) => b.kind === 'topic' && b.status === 'finished' && String(b.date || '') >= askedDay)
    .map((b) => {
      const have = new Set(cards.words(`${b.title} ${bookFolder(b)}`));
      const overlap = want.length ? want.filter((w) => have.has(w)).length / want.length : 0;
      return { book: b, overlap };
    })
    .filter((c) => c.overlap >= 0.5);
}

function copyCard(key, book) {
  const page = cardPage(book);
  if (!page) return { status: 'no-card', why: 'The book has no summary card yet.' };
  const from = path.join(book.root, ...page.file.split('/'));
  const theirs = fs.readFileSync(from, 'utf8').replace(/^﻿/, '');
  const body = cards.parse(theirs).body;
  const name = `louise-${path.basename(page.file, '.md')}.md`;
  const to = path.join(common.agentDir(key), 'knowledge', name);
  if (fs.existsSync(to)) return { status: 'learned', card: name, why: 'Already on the shelf from this book.' };
  const folder = bookFolder(book);
  const sources = (book.pages || []).filter((p) => p.kind === 'report' || p.kind === 'sources').map((p) => p.file);
  const head = ['---', `title: ${String(book.title).replace(/[\r\n]+/g, ' ')}`, `sources: [${sources.concat(page.file).join(', ')}]`,
    `louise_book: ${folder}`, `copied: ${common.today()}`, 'origin: louise-card', `book_id: ${book.id}`, '---', ''].join('\n');
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, head + body, 'utf8');
  if (cards.parse(fs.readFileSync(to, 'utf8')).body !== body) {
    throw common.refuse(`The copy at ${to} does not match Louise's card, so it was not counted as learned. Her card is untouched.`);
  }
  return { status: 'learned', card: name };
}

function learn(key, opts) {
  const o = opts || {};
  common.agentDir(key);
  const dir = louise.louiseDir();
  const list = louise.requests(key);
  const out = [];
  const pending = list.filter((r) => r.status === 'pending');
  const targets = o.topic ? pending.filter((r) => r.topic.toLowerCase() === String(o.topic).trim().toLowerCase()) : pending;
  if (o.topic && !targets.length) throw common.refuse(`"${o.topic}" is not one of this agent's pending requests.`, 1);
  for (const r of targets) {
    let book = null;
    if (o.book) {
      book = findById(dir, o.book, r.topic);
      if (!book) { out.push({ topic: r.topic, status: 'waiting', why: `Louise's shelves have no book ${o.book} for this.` }); continue; }
      if (book.status !== 'finished') { out.push({ topic: r.topic, status: 'waiting', book: book.id, why: `That book is ${book.status}, not finished.` }); continue; }
    } else {
      // Louise's books are dated by this computer's calendar, so the day it was asked is too (not UTC's).
      const c = candidates(dir, r.topic, r.asked ? common.today(r.asked) : '')[0];
      if (!c) { out.push({ topic: r.topic, status: 'waiting', why: 'No finished book for it on her shelves yet.' }); continue; }
      book = c.book;
    }
    if (o.dry) { out.push({ topic: r.topic, status: 'dry', book: book.id, why: `Would copy the card from "${book.title}".` }); continue; }
    const res = copyCard(key, book);
    if (res.status === 'learned') {
      Object.assign(r, { status: 'learned', book: book.id, card: res.card, learned: new Date().toISOString() });
    }
    out.push(Object.assign({ topic: r.topic, book: book.id }, res));
  }
  if (!o.dry) louise.saveRequests(key, list);
  return out;
}

module.exports = { learn, candidates };

if (require.main === module) {
  common.cli((args) => {
    const key = args._[0];
    if (!key) throw common.refuse('Use: learn.js <agent> [--dry] | learn.js <agent> --topic "<pending topic>" --book <book id>');
    if ((args.topic && !args.book) || (args.book && !args.topic)) throw common.refuse('Give --topic and --book together.');
    const r = learn(key, { dry: args.dry, topic: args.topic, book: args.book });
    if (!r.length) return { text: 'Nothing waiting on Louise, so nothing to learn.', data: r, code: 1 };
    const text = r.map((x) => `${x.status.padEnd(8)} ${x.topic}${x.card ? ` -> knowledge/${x.card}` : ''}${x.why ? `  (${x.why})` : ''}`).join('\n');
    return { text, data: r, code: r.some((x) => x.status === 'learned' || x.status === 'dry') ? 0 : 1 };
  });
}
