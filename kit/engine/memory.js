'use strict';

/**
 * kit/engine/memory.js — what an agent remembers, on this computer only (kit/CONTRACT.md, section 5).
 * One line of JSON per entry in agents/<agent>/memory/memory.jsonl (git-ignored). Node built-ins only.
 *
 *   remember(key, kind, text, about)   { id }   kind: fact | worked | lesson
 *   recall(key, limit)                 { lessons, facts, worked } — every lesson, the latest fact per subject, the most
 *                                      recent worked lines; each list newest first, at most `limit` (default 20)
 *   lessons(key)                       the lessons, newest first
 *   forget(key, id)                    true when it was there and is gone
 *
 * CLI: remember <agent> <kind> "<text>" [--about "<subject>"] | recall <agent> [--limit n] | lessons <agent>
 *      | forget <agent> <id>   [--json]
 */

const fs = require('fs');
const path = require('path');
const common = require('./common');

const KINDS = ['fact', 'worked', 'lesson'];
const TEXT_MAX = 1000;

const memoryFile = (key) => path.join(common.agentDir(key), 'memory', 'memory.jsonl');

function entries(key) {
  let text = '';
  try { text = fs.readFileSync(memoryFile(key), 'utf8'); } catch (_) { return []; }
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (_) { /* a torn line is skipped, never fatal */ }
  }
  return out;
}

function remember(key, kind, textIn, aboutIn) {
  if (!KINDS.includes(kind)) throw common.refuse(`Remember a fact, worked or lesson, not "${kind || ''}".`);
  const text = String(textIn || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  if (!text) throw common.refuse('Say what to remember.');
  if (text.length > TEXT_MAX) throw common.refuse(`Keep it to ${TEXT_MAX} characters.`);
  const about = aboutIn && aboutIn !== true ? String(aboutIn).replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  const have = entries(key);
  const next = have.reduce((n, e) => Math.max(n, Number(String(e.id || '').replace(/^m-/, '')) || 0), 0) + 1;
  const entry = { id: `m-${next}`, kind, text, about, at: new Date().toISOString() };
  const file = memoryFile(key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8');
  return { id: entry.id };
}

function recall(key, limitIn) {
  const limit = Math.max(1, Number(limitIn) || 20);
  const es = entries(key).slice().reverse();
  const lessons = es.filter((e) => e.kind === 'lesson');
  const seen = new Set();
  const facts = [];
  for (const e of es) {
    if (e.kind !== 'fact') continue;
    const subject = (e.about || '').toLowerCase();
    if (subject && seen.has(subject)) continue;
    if (subject) seen.add(subject);
    facts.push(e);
  }
  const worked = es.filter((e) => e.kind === 'worked');
  return { lessons: lessons.slice(0, limit), facts: facts.slice(0, limit), worked: worked.slice(0, limit) };
}

const lessons = (key) => entries(key).filter((e) => e.kind === 'lesson').reverse();

function forget(key, id) {
  const es = entries(key);
  const keep = es.filter((e) => e.id !== id);
  if (keep.length === es.length) return false;
  const file = memoryFile(key);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, keep.map((e) => `${JSON.stringify(e)}\n`).join(''), 'utf8');
  fs.renameSync(tmp, file);
  return true;
}

module.exports = { remember, recall, lessons, forget, entries, memoryFile };

if (require.main === module) {
  const line = (e) => `${e.id}  ${e.about ? `[${e.about}] ` : ''}${e.text}`;
  common.cli((args) => {
    const [cmd, key, a, b] = args._;
    if (cmd === 'remember') {
      const r = remember(key, a, b, args.about);
      return { text: `Remembered ${r.id}.`, data: r };
    }
    if (cmd === 'recall') {
      const r = recall(key, args.limit);
      if (!r.lessons.length && !r.facts.length && !r.worked.length) return { text: 'Nothing remembered yet.', data: r, code: 1 };
      const part = (h, xs) => (xs.length ? [`${h}:`, ...xs.map((e) => `  ${line(e)}`)] : []);
      return { text: [...part('Lessons', r.lessons), ...part('What they told me', r.facts), ...part('What worked', r.worked)].join('\n'), data: r };
    }
    if (cmd === 'lessons') {
      const ls = lessons(key);
      if (!ls.length) return { text: 'No lessons yet.', data: ls, code: 1 };
      return { text: ls.map(line).join('\n'), data: ls };
    }
    if (cmd === 'forget') {
      const gone = forget(key, a);
      return gone ? { text: `Forgotten ${a}.`, data: { forgotten: a } } : { text: `There is nothing remembered as ${a}.`, data: { forgotten: null }, code: 1 };
    }
    throw common.refuse('Use: memory.js remember <agent> fact|worked|lesson "<text>" [--about "<subject>"] | recall <agent> | lessons <agent> | forget <agent> <id>');
  });
}
