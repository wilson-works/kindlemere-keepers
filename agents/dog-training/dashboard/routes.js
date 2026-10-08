'use strict';

/**
 * Tumble's own dashboard routes (kit/CONTRACT.md section 10: an agent may pass routes to the shell). Node built-ins and
 * the kit's memory only. Everything a person tells the page about their dog goes into Tumble's memory on this computer,
 * as the same facts Tumble keeps in a chat (CLAUDE.md, Remembering a dog), and nowhere else.
 *
 *   GET  /api/remembered                       counts only: dogs, facts, worked, lessons
 *   GET  /api/dogs                             the person's dogs: name, the facts Tumble keeps, their look, their cues,
 *                                              trouble spots, opportunities and play list
 *   POST /api/dog {name, was?, breed?, age?, temperament?, level?, look?}   remember a dog, or rename one (was)
 *   POST /api/dog-ways {name, cues?, trouble?, opportunity?}               how the person trains this dog
 *   POST /api/dog-playlist {name, items}                                   this dog's play list (ids from the page)
 *   POST /api/dog-forget {name}                forget everything about this dog
 *   POST /api/plan {dog}                       the training-plan tool, for a remembered dog
 *   POST /api/log {dog, skill, reps, hits, minutes}   the session-log tool
 *   GET  /api/faces                            which of the kit's faces exist for Tumble, Barkley and Sizzle (file names)
 *   POST /api/talk {text, session?}            a turn of conversation with Tumble: Claude Code, headless, in this folder,
 *                                              under Tumble's law (CLAUDE.md), restricted, no web, no MCP, the kit's
 *                                              node commands and Tumble's registered tools only; the words go on stdin
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const memory = require('../../../kit/engine/memory');

const KEY = 'dog-training';
const NAME_RE = /^[A-Za-z][A-Za-z '-]{0,23}$/;
const FACTS = ['breed', 'age', 'temperament', 'level'];
const ACTIONS = ['sit', 'down', 'stay', 'come', 'heel', 'wait', 'leave it', 'drop it', 'place', 'paw', 'spin', 'off'];
const SKILLS = [...ACTIONS, 'loose-lead walking'];   // what a session can be about: the page's own list, nothing typed
const COLOURS = ['white', 'cream', 'tan', 'ginger', 'brown', 'black', 'grey'];
const LOOK = {
  coat: COLOURS, head: COLOURS, face: COLOURS,
  ears: ['one-up', 'both-up', 'both-down'], marks: ['heart', 'hip', 'plain'], band: ['green', 'red', 'blue', 'yellow', 'none'],
};
const PLAY_ID = /^[a-z0-9-]{1,40}$/;

const bad = (message) => Object.assign(new Error(message), { status: 400 });

// Talking with Tumble. The CLI is found where npm puts it on Windows, or on the PATH; TUMBLE_CLAUDE names another.
// TUMBLE_CHAT_MODEL picks the model when the installed CLI's default cannot run.
const CLAUDE = process.env.TUMBLE_CLAUDE
  || (process.platform === 'win32' && process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe') : 'claude');
const TALK_TOOLS = ['Read', 'Grep', 'Glob', 'Bash', 'Task'];
const TALK_ALLOWED = ['Read', 'Grep', 'Glob', 'Task',
  'Bash(node ../../kit/engine/shelf.js:*)', 'Bash(node ../../kit/engine/memory.js:*)', 'Bash(node ../../kit/engine/louise.js:*)',
  'Bash(node ../../kit/engine/learn.js:*)', 'Bash(node tools/training-plan.js:*)', 'Bash(node tools/session-log.js:*)',
  'Bash(node tools/trust-ladder.js:*)'];
const SESSION_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let talking = false;
const clean = (v, max) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const nameOf = (v) => {
  const n = clean(v, 24);
  if (!NAME_RE.test(n)) throw bad('A dog\'s name is letters, spaces, hyphens or apostrophes, up to 24, starting with a letter.');
  return n;
};

// Every dog in memory, from the newest fact on each subject (memory keeps a history; the newest one counts).
function dogs() {
  const latest = new Map();
  for (const e of memory.entries(KEY)) if (e.kind === 'fact' && /^dog:/i.test(e.about || '')) latest.set(e.about.toLowerCase(), e);
  const byKey = new Map();
  const dog = (name) => {
    const k = name.toLowerCase();
    if (!byKey.has(k)) byKey.set(k, { name, cues: {}, look: null, trouble: '', opportunity: '', playlist: [] });
    return byKey.get(k);
  };
  for (const e of latest.values()) {
    const m = /^dog:([^:]+):(.+)$/i.exec(e.about);
    if (!m) continue;
    const d = dog(m[1]);
    const field = m[2].toLowerCase();
    if (FACTS.includes(field) || field === 'pronoun') d[field] = e.text;
    else if (field === 'trouble' || field === 'opportunity') d[field] = e.text;
    else if (field.startsWith('cue:') && ACTIONS.includes(field.slice(4))) d.cues[field.slice(4)] = e.text;
    else if (field === 'look' || field === 'playlist') {
      try { d[field] = JSON.parse(e.text); } catch (_) { /* an unreadable entry is skipped, never guessed */ }
    }
  }
  return [...byKey.values()].filter((d) => d.name).sort((a, b) => a.name.localeCompare(b.name));
}
const find = (name) => dogs().find((d) => d.name.toLowerCase() === String(name || '').toLowerCase()) || null;

// Remember a fact only when it says something new.
function keep(name, field, text) {
  const about = `dog:${name}:${field}`;
  const now = dogs().find((d) => d.name.toLowerCase() === name.toLowerCase());
  const was = !now ? undefined
    : field.startsWith('cue:') ? now.cues[field.slice(4)]
      : (field === 'look' || field === 'playlist') ? JSON.stringify(now[field]) : now[field];
  if (was === text) return false;
  memory.remember(KEY, 'fact', text, about);
  return true;
}

function look(v) {
  if (!v || typeof v !== 'object') return null;
  const out = {};
  for (const [k, allowed] of Object.entries(LOOK)) {
    if (!allowed.includes(v[k])) throw bad(`Pick the ${k} from the list.`);
    out[k] = v[k];
  }
  return out;
}

module.exports = function routes(agentDir) {
  function tool(name, args) {
    const r = spawnSync(process.execPath, [path.join(agentDir, 'tools', `${name}.js`), ...args],
      { cwd: agentDir, encoding: 'utf8', timeout: 15000, windowsHide: true });
    return { ok: r.status === 0, text: String(r.stdout || '').trim() || 'The tool said nothing.' };
  }
  // One turn: the person's words on stdin (never in the command line), the answer read from the CLI's JSON.
  // Restricted mode reads no project files on its own, so Tumble's law (CLAUDE.md) goes in as the system prompt's
  // addition and Barkley and Sizzle go in from their own files in .claude/agents.
  const sidekicks = {};
  for (const f of ['barkley.md', 'sizzle.md']) {
    let src = '';
    try { src = fs.readFileSync(path.join(agentDir, '.claude', 'agents', f), 'utf8'); } catch (_) { continue; }
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(src);
    if (!m) continue;
    const field = (k) => { const x = new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(m[1]); return x ? x[1].trim() : ''; };
    if (!field('name') || !field('description')) continue;
    sidekicks[field('name')] = { description: field('description'), prompt: m[2].trim(), tools: field('tools').split(/\s*,\s*/).filter(Boolean) };
  }
  function converse(text, session) {
    const args = ['-p', '--restricted', '--strict-mcp-config',
      '--settings', path.join(agentDir, '.claude', 'settings.json'), '--add-dir', path.join(agentDir, '..', '..', 'kit'),
      '--append-system-prompt-file', path.join(agentDir, 'CLAUDE.md'),
      '--tools', TALK_TOOLS.join(','), '--allowedTools', ...TALK_ALLOWED, '--disallowedTools', 'WebSearch', 'WebFetch',
      '--output-format', 'json'];
    if (Object.keys(sidekicks).length) args.push('--agents', JSON.stringify(sidekicks));
    if (process.env.TUMBLE_CHAT_MODEL) args.push('--model', process.env.TUMBLE_CHAT_MODEL);
    if (session) args.push('--resume', session);
    return new Promise((resolve) => {
      let out = '';
      let child;
      try { child = spawn(CLAUDE, args, { cwd: agentDir, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] }); } catch (_) {
        resolve({ ok: false, text: 'I can\'t start a conversation on this computer. Open a Claude chat in my folder instead.' });
        return;
      }
      const timer = setTimeout(() => child.kill(), 180000);
      child.on('error', () => { clearTimeout(timer); resolve({ ok: false, text: 'I can\'t start a conversation on this computer. Open a Claude chat in my folder instead.' }); });
      child.stdout.on('data', (d) => { out += d; });
      child.on('close', () => {
        clearTimeout(timer);
        let r = null;
        try { r = JSON.parse(out); } catch (_) { r = null; }
        if (!r || typeof r.result !== 'string' || r.is_error) resolve({ ok: false, text: 'I lost my words just then. Try me again.' });
        else resolve({ ok: true, text: r.result.trim(), session: SESSION_RE.test(String(r.session_id || '')) ? r.session_id : null });
      });
      child.stdin.end(text);
    });
  }

  const known = (v) => {
    const d = find(nameOf(v));
    if (!d) throw bad('I don\'t remember that dog yet. Add it under My dog first.');
    return d;
  };

  return {
    'GET /api/remembered': () => {
      const es = memory.entries(KEY);
      const count = (kind) => es.filter((e) => e.kind === kind).length;
      return { dogs: dogs().length, facts: count('fact'), worked: count('worked'), lessons: count('lesson') };
    },
    'GET /api/dogs': () => ({ dogs: dogs(), actions: ACTIONS, skills: SKILLS, look: LOOK }),
    'GET /api/faces': () => {
      let names = [];
      try { names = fs.readdirSync(path.join(agentDir, '..', '..', 'kit', 'art', 'keepers')); } catch (_) { names = []; }
      return { faces: names.filter((n) => /^dog-training(-[a-z]+)?-[a-z]+\.svg$/.test(n)) };
    },

    'POST /api/dog': ({ body }) => {
      const name = nameOf(body.name);
      const was = body.was ? nameOf(body.was) : null;
      if (was && was.toLowerCase() !== name.toLowerCase()) {
        if (find(name)) throw bad(`I already know a dog called ${name}.`);
        const old = find(was);
        if (!old) throw bad('I don\'t remember that dog.');
        // A new name carries everything over; the old name's facts are forgotten.
        for (const f of FACTS) if (old[f]) keep(name, f, old[f]);
        if (old.look) keep(name, 'look', JSON.stringify(old.look));
        for (const [a, c] of Object.entries(old.cues)) keep(name, `cue:${a}`, c);
        if (old.trouble) keep(name, 'trouble', old.trouble);
        if (old.opportunity) keep(name, 'opportunity', old.opportunity);
        if (old.playlist && old.playlist.length) keep(name, 'playlist', JSON.stringify(old.playlist));
        for (const e of memory.entries(KEY)) if ((e.about || '').toLowerCase().startsWith(`dog:${was.toLowerCase()}:`)) memory.forget(KEY, e.id);
      }
      for (const f of FACTS) {
        if (body[f] === undefined) continue;
        const t = clean(body[f], 80);
        if (t) keep(name, f, t);
      }
      const l = look(body.look);
      if (l) keep(name, 'look', JSON.stringify(l));
      return { dog: find(name) };
    },

    'POST /api/dog-ways': ({ body }) => {
      const d = known(body.name);
      const cues = body.cues && typeof body.cues === 'object' ? body.cues : {};
      for (const [a, c] of Object.entries(cues)) {
        if (!ACTIONS.includes(a)) throw bad(`I keep cues for ${ACTIONS.join(', ')}.`);
        const t = clean(c, 32);
        if (t) keep(d.name, `cue:${a}`, t);
      }
      for (const f of ['trouble', 'opportunity']) {
        if (body[f] === undefined) continue;
        keep(d.name, f, clean(body[f], 300) || 'none noted');
      }
      return { dog: find(d.name) };
    },

    'POST /api/dog-playlist': ({ body }) => {
      const d = known(body.name);
      const items = Array.isArray(body.items) ? body.items.map(String) : [];
      if (items.length > 8 || !items.every((i) => PLAY_ID.test(i))) throw bad('A play list is up to 8 games from the list.');
      keep(d.name, 'playlist', JSON.stringify(items));
      return { dog: find(d.name) };
    },

    'POST /api/dog-forget': ({ body }) => {
      const d = known(body.name);
      let n = 0;
      for (const e of memory.entries(KEY)) {
        if ((e.about || '').toLowerCase().startsWith(`dog:${d.name.toLowerCase()}:`) && memory.forget(KEY, e.id)) n += 1;
      }
      return { forgot: n };
    },

    'POST /api/talk': async ({ body }) => {
      const text = String(body.text || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, ' ').trim().slice(0, 1200);
      if (!text) throw bad('Say something to me first.');
      const session = body.session ? String(body.session) : null;
      if (session && !SESSION_RE.test(session)) throw bad('That conversation is not one I know.');
      if (talking) throw Object.assign(new Error('I\'m still answering the last one. One moment.'), { status: 429 });
      talking = true;
      try { return await converse(text, session); } finally { talking = false; }
    },

    'POST /api/plan': ({ body }) => tool('training-plan', ['--dog', known(body.dog).name]),

    'POST /api/log': ({ body }) => {
      const d = known(body.dog);
      const whole = (v, max) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= max ? String(n) : null; };
      const reps = whole(body.reps, 200);
      const hits = whole(body.hits, 200);
      const minutes = whole(body.minutes, 120);
      const skill = String(body.skill || '');
      if (!SKILLS.includes(skill)) throw bad(`Pick the skill from the list: ${SKILLS.join(', ')}.`);
      if (!reps || !hits || Number(hits) > Number(reps)) throw bad('A session needs the reps and wins, with no more wins than reps.');
      return tool('session-log', ['--dog', d.name, '--skill', skill, '--reps', reps, '--hits', hits, ...(minutes ? ['--minutes', minutes] : [])]);
    },
  };
};
