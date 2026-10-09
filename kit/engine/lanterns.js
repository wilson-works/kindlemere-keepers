'use strict';

/**
 * kit/engine/lanterns.js — the lanterns on Kindlemere's lake: what the keepers have asked Louise (owner, 2026-10-09:
 * "allow the lanterns to be clicked to read of any research going out to Louise, or let the user add one here").
 * Node built-ins only. Reads each keeper's state/asked-louise.json and Louise's own list (requests/queue.md, and
 * requests/taken/ for what a research run has taken); writes only through louise.ask, which runs her own
 * `engine/requests.js add` with its arguments as an array.
 *
 *   list()                    { louise, lanterns: [{ keeper, name, topic, asked, state, book, card }] }, oldest first:
 *                             every request still out, and one answered in the last ANSWERED_DAYS days.
 *                             state: waiting (on her list) | researching (taken for a run) | answered (a card came back)
 *   send(keeper, question)    { sent, already, louise: true, message }, or, when Louise is not on this computer,
 *                             { sent: false, louise: false, keeper, message } and nothing is written anywhere
 */

const fs = require('fs');
const path = require('path');
const common = require('./common');
const louise = require('./louise');

const ROOT = path.resolve(__dirname, '..', '..');
const ANSWERED_DAYS = 3;
const QUESTION_MAX = 200;

function keepers() {
  const bundle = common.readJson(path.join(ROOT, 'bundle.json'), {}) || {};
  return (bundle.agents || []).filter((b) => b && /^[a-z][a-z-]{0,30}$/.test(String(b.key || ''))).map((b) => {
    let name = b.key;
    try { name = (common.readJson(path.join(ROOT, 'agents', b.key, 'agent.json'), {}) || {}).name || b.key; } catch (_) { /* its key */ }
    return { key: b.key, name };
  });
}

function here() {
  try { return louise.louiseDir(); } catch (_) { return null; }
}

/** The topics on her list now, and the ones a research run has taken (her newest 50 taken lists). */
function herList(dir) {
  const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (_) { return ''; } };
  const topics = (text) => (text.match(/^##\s+.+$/gm) || []).map((h) => h.replace(/^##\s+/, '').trim().toLowerCase());
  const waiting = new Set(topics(read(path.join(dir, 'requests', 'queue.md'))));
  const taken = new Set();
  let files = [];
  try { files = fs.readdirSync(path.join(dir, 'requests', 'taken')).filter((f) => f.endsWith('.md')).sort().slice(-50); } catch (_) { /* none taken */ }
  for (const f of files) topics(read(path.join(dir, 'requests', 'taken', f))).forEach((x) => taken.add(x));
  return { waiting, taken };
}

function list() {
  const dir = here();
  const hers = dir ? herList(dir) : null;
  const since = Date.now() - ANSWERED_DAYS * 86400000;
  const out = [];
  for (const k of keepers()) {
    for (const r of louise.requests(k.key)) {
      const topic = String(r.topic || '');
      let state = null;
      if (r.status === 'learned') {
        if (Date.parse(r.learned || r.asked) >= since) state = 'answered';
      } else if (r.status === 'pending') {
        state = hers && !hers.waiting.has(topic.toLowerCase()) && hers.taken.has(topic.toLowerCase()) ? 'researching' : 'waiting';
      }
      if (!state) continue;
      out.push({ keeper: k.key, name: k.name, topic, asked: r.asked || null, state, book: r.book || null, card: r.card || null });
    }
  }
  out.sort((a, b) => String(a.asked).localeCompare(String(b.asked)));
  return { louise: Boolean(dir), lanterns: out };
}

function send(keeperIn, questionIn) {
  const k = keepers().find((x) => x.key === String(keeperIn || ''));
  if (!k) throw common.refuse('Pick which keeper this lantern is for.');
  const q = String(questionIn || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (q.length < 3) throw common.refuse('Write the question first, in a few words at least.');
  if (q.length > QUESTION_MAX) throw common.refuse(`Keep the question to ${QUESTION_MAX} characters.`);
  if (!here()) {
    return {
      sent: false, louise: false, keeper: k.key,
      message: `Louise isn't on this computer, so there's no list to send it to. Ask ${k.name} instead: ${k.name} looks it up on the web and keeps what turns up as a card.`,
    };
  }
  const r = louise.ask(k.key, q, 'Sent as a lantern from the lake in Kindlemere.');
  return { sent: !r.already, already: Boolean(r.already), louise: true, keeper: k.key, message: r.message };
}

module.exports = { list, send, QUESTION_MAX };
