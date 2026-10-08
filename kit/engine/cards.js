'use strict';

/**
 * kit/engine/cards.js — reading knowledge cards (kit/CONTRACT.md, section 3). Node built-ins only.
 *
 *   parse(text)              { data, body, bodyStart } — the front matter as { key: value | [list] } and the body
 *   facts(body, bodyStart)   [{ text, line, sources: [{ page, line }] }] — each bullet with its @ sources; line is the
 *                            card file's line the bullet starts on
 *   read(file)               { file, title, sources, tags, louise_book, copied, origin, body, facts, refused }
 *                            refused is null, or a plain sentence saying why the shelf will not use it
 *   cardsIn(dir)             every card file name in a knowledge folder (not GAPS.md or README.md), sorted
 *   words(text)              the words worth matching on, lower case, without the small ones
 */

const fs = require('fs');
const path = require('path');

const BULLET_RE = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/;
const SOURCE_RE = /@(?:research\/)?([A-Za-z0-9][\w.\/-]*?\.md)(?::(\d+))?(?![\w.\/-])/g;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NOT_CARDS = new Set(['gaps.md', 'readme.md']);
const STOP = new Set(['a', 'an', 'and', 'the', 'of', 'on', 'for', 'to', 'in', 'is', 'are', 'it', 'its', 'with', 'what',
  'how', 'can', 'do', 'does', 'my', 'me', 'i', 'you', 'your', 'at', 'by', 'or', 'be', 'about', 'should', 'when', 'from',
  'that', 'this', 'as', 'we', 'our', 'any', 'much', 'many']);

function parse(text) {
  const t = String(text).replace(/^﻿/, '');
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(t);
  if (!m) return { data: {}, body: t, bodyStart: 1 };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    else v = v.replace(/^["']|["']$/g, '');
    data[kv[1].toLowerCase()] = v;
  }
  return { data, body: t.slice(m[0].length), bodyStart: m[0].split('\n').length - (m[0].endsWith('\n') ? 0 : 1) };
}

function sourcesIn(text) {
  const out = [];
  SOURCE_RE.lastIndex = 0;
  let m;
  while ((m = SOURCE_RE.exec(text))) out.push({ page: m[1], line: m[2] ? Number(m[2]) : null });
  return out;
}

function facts(body, bodyStart) {
  const lines = String(body).split(/\r?\n/);
  const out = [];
  let cur = null;
  lines.forEach((l, i) => {
    const b = BULLET_RE.exec(l);
    if (b) {
      cur = { parts: [b[2]], line: (bodyStart || 1) + i, indent: b[1].length };
      out.push(cur);
    } else if (cur && /^\s+\S/.test(l)) {
      cur.parts.push(l.trim());
    } else {
      cur = null;
    }
  });
  return out.map((f) => {
    const text = f.parts.join(' ');
    return { text, line: f.line, sources: sourcesIn(text) };
  });
}

const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function read(file) {
  const text = fs.readFileSync(file, 'utf8');
  const { data, body, bodyStart } = parse(text);
  const card = {
    file: path.basename(file),
    title: typeof data.title === 'string' ? data.title : '',
    sources: asList(data.sources).map((s) => s.replace(/^research\//, '')),
    tags: asList(data.tags),
    louise_book: typeof data.louise_book === 'string' ? data.louise_book : '',
    copied: typeof data.copied === 'string' ? data.copied : '',
    origin: typeof data.origin === 'string' ? data.origin : '',
    body,
    facts: facts(body, bodyStart),
    refused: null,
  };
  const missing = ['title', 'louise_book', 'copied'].filter((k) => !card[k]);
  if (!card.sources.length) card.refused = 'It has no sources in its front matter.';
  else if (!sourcesIn(body).length) card.refused = 'Nothing in it says where a fact came from (no @ source).';
  else if (missing.length) card.refused = `Its front matter is missing ${missing.join(', ')}.`;
  else if (!DATE_RE.test(card.copied)) card.refused = 'Its copied date is not YYYY-MM-DD.';
  return card;
}

function cardsIn(dir) {
  let names;
  try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return []; }
  return names.filter((e) => e.isFile() && /\.md$/i.test(e.name) && !NOT_CARDS.has(e.name.toLowerCase()))
    .map((e) => e.name).sort();
}

function words(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

module.exports = { parse, facts, read, cardsIn, words, sourcesIn };
