'use strict';

/**
 * kit/engine/louise.js — an agent's way onto Louise's list, through her own script (kit/CONTRACT.md, section 6).
 * Node built-ins only. Louise's folder is only ever read, except through her own `engine/requests.js add`.
 *
 *   louiseDir()                      her folder: LOUISE_DIR, else <Hub>\20-Coding\{Projects,Active}\louise, where
 *                                    <Hub> is D:\Hub then C:\Hub (the first holding CLAUDE.md). Throws when none
 *   libraryDir()                     her library (her own `node engine/config.js where`), or null
 *   ask(key, topic, framing)         { queued, message, already }
 *   requests(key)                    the agent's state/asked-louise.json requests
 *   pending(key)                     those still pending
 *   gaps(key)                        [{ topic, framing, asked }] from knowledge/GAPS.md
 *   sendGaps(key)                    asks each gap not asked yet: [{ topic, message }]
 *   saveRequests(key, list)          writes state/asked-louise.json (learn.js uses it)
 *
 * CLI: where | ask <agent> "<topic>" "<framing>" | pending <agent> | gaps <agent> | send-gaps <agent>   [--json]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const common = require('./common');

const TOPIC_MAX = 200;
const FRAMING_MAX = 2000;

const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch (_) { return false; } };

function louiseDir() {
  const env = process.env.LOUISE_DIR;
  if (env) {
    const dir = path.resolve(env);
    if (!isFile(path.join(dir, 'engine', 'requests.js'))) throw common.refuse(`LOUISE_DIR is ${dir}, but Louise's engine/requests.js is not there.`);
    return dir;
  }
  const tried = [];
  for (const hub of ['D:\\Hub', 'C:\\Hub']) {
    // String concatenation, not path.join on a drive that may not exist: a missing drive is a miss, not an error.
    if (!isFile(`${hub}\\CLAUDE.md`)) { tried.push(`${hub} (no Hub here)`); continue; }
    for (const zone of ['Projects', 'Active']) {
      const dir = `${hub}\\20-Coding\\${zone}\\louise`;
      if (isFile(`${dir}\\engine\\requests.js`)) return dir;
      tried.push(dir);
    }
    break;
  }
  throw common.refuse(`I could not find Louise's folder. I looked in: ${tried.join('; ')}. Set LOUISE_DIR to her folder.`);
}

function node(dir, args) {
  return execFileSync(process.execPath, args, { cwd: dir, encoding: 'utf8', windowsHide: true, timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
}

function libraryDir() {
  const dir = louiseDir();
  let out = '';
  try { out = node(dir, ['engine/config.js', 'where']).trim(); } catch (_) { return null; }
  return out || null;
}

const stateFile = (key) => path.join(common.agentDir(key), 'state', 'asked-louise.json');

function requests(key) {
  const data = common.readJson(stateFile(key), { requests: [] }) || {};
  return Array.isArray(data.requests) ? data.requests : [];
}

function saveRequests(key, list) {
  common.writeJson(stateFile(key), { requests: list });
}

const pending = (key) => requests(key).filter((r) => r.status === 'pending');

const clean = (s) => String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').replace(/^#+\s*/, '').trim();
const sameTopic = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

function ask(key, topicIn, framingIn) {
  const info = common.agentInfo(key);
  const topic = clean(topicIn);
  if (topic.length < 3) throw common.refuse('Say what Louise should look up, in a few words at least.');
  if (topic.length > TOPIC_MAX) throw common.refuse(`Keep the topic to ${TOPIC_MAX} characters. Put the rest in the framing.`);
  const list = requests(key);
  const open = list.find((r) => r.status === 'pending' && sameTopic(r.topic, topic));
  if (open) return { already: true, queued: null, message: `Already on Louise's list, asked ${String(open.asked).slice(0, 10)}.` };

  const who = `Asked by ${info.name}${info.title ? `, ${info.title},` : ','} of the wellbeing agents (${key}).`;
  const framing = `${who}\n${String(framingIn || '').trim()}`.trim().slice(0, FRAMING_MAX);
  const dir = louiseDir();
  let said;
  try { said = node(dir, ['engine/requests.js', 'add', topic, framing]).trim(); } catch (e) {
    const msg = String((e.stdout || '') + (e.stderr || '')).trim() || e.message;
    throw common.refuse(`Louise's list did not take it: ${msg}`);
  }
  const n = /number (\d+)/.exec(said);
  list.push({ topic, framing, asked: new Date().toISOString(), louise_dir: dir, status: 'pending' });
  saveRequests(key, list);
  return { already: false, queued: n ? Number(n[1]) : null, message: said };
}

/** knowledge/GAPS.md, in Louise's list shape: "## <topic>" then its framing. */
function gaps(key) {
  let text = '';
  try { text = fs.readFileSync(path.join(common.agentDir(key), 'knowledge', 'GAPS.md'), 'utf8').replace(/^\uFEFF/, ''); } catch (_) { return []; }
  const out = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) { cur = { topic: clean(h[1]), body: [] }; out.push(cur); continue; }
    if (cur) cur.body.push(line);
  }
  const asked = requests(key);
  return out.map((g) => ({ topic: g.topic, framing: g.body.join('\n').trim(), asked: asked.some((r) => sameTopic(r.topic, g.topic)) }));
}

function sendGaps(key) {
  const sent = [];
  for (const g of gaps(key)) {
    if (g.asked) continue;
    const r = ask(key, g.topic, g.framing);
    sent.push({ topic: g.topic, message: r.message });
  }
  return sent;
}

module.exports = { louiseDir, libraryDir, ask, requests, pending, gaps, sendGaps, saveRequests };

if (require.main === module) {
  common.cli((args) => {
    const [cmd, key, a, b] = args._;
    if (cmd === 'where') {
      const dir = louiseDir();
      return { text: dir, data: { louise: dir, library: libraryDir() } };
    }
    if (cmd === 'ask') {
      const r = ask(key, a, b);
      return { text: r.message, data: r };
    }
    if (cmd === 'pending') {
      const p = pending(key);
      if (!p.length) return { text: 'Nothing waiting on Louise.', data: p, code: 1 };
      return { text: p.map((r, i) => `${i + 1}. ${r.topic}  (asked ${String(r.asked).slice(0, 10)})`).join('\n'), data: p };
    }
    if (cmd === 'gaps') {
      const g = gaps(key);
      if (!g.length) return { text: 'No gaps written down.', data: g, code: 1 };
      return { text: g.map((x, i) => `${i + 1}. ${x.topic}  (${x.asked ? 'asked' : 'not asked'})`).join('\n'), data: g };
    }
    if (cmd === 'send-gaps') {
      const s = sendGaps(key);
      if (!s.length) return { text: 'Every gap is already on Louise\'s list.', data: s, code: 1 };
      return { text: s.map((x) => `${x.topic}: ${x.message}`).join('\n'), data: s };
    }
    throw common.refuse('Use: louise.js where | ask <agent> "<topic>" "<framing>" | pending <agent> | gaps <agent> | send-gaps <agent>');
  });
}
