'use strict';

/**
 * Talking with Avo at her table. Each message the person types on her page runs one turn of Claude Code in her folder,
 * headless, so it is Avo herself answering: her CLAUDE.md, her cards, her memory, her tools, Summer and Spud. The
 * conversation carries on from turn to turn (--resume) until the person starts afresh.
 *
 * Her law holds here, and nothing of the computer's own Claude setup leaks in: --restricted (no user, project or local
 * settings files, no hooks, file tools confined, code-running tools only as --tools names them), her own deny list
 * loaded with --settings, no MCP server or connector (--strict-mcp-config with none given), and only the tools and
 * commands listed below. Since the owner's word of 2026-10-09 that includes WebSearch and WebFetch: when her cards and
 * Louise's books don't cover a question she looks it up on the web and keeps what she found as a card (webcard.js).
 * She may write only her week draft (state/tools/meal-week/).
 * Her law (CLAUDE.md) goes in as the system prompt's addition, and Summer and Spud from their own files with --agents.
 * The person's words go in on stdin, never on the command line. The shape lane D's Tumble uses (D7).
 * The conversation is kept on this computer only, in state/dashboard/talk.json. Node built-ins only. One turn at a time.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const KIT = '../../kit/engine';
const TALK_TOOLS = 'Read,Grep,Glob,Bash,Task,Edit,Write,WebSearch,WebFetch';
const TOOLS = [
  'Task', 'Read', 'Grep', 'Glob',
  `Bash(node ${KIT}/shelf.js:*)`, `Bash(node ${KIT}/memory.js:*)`, `Bash(node ${KIT}/louise.js:*)`,
  `Bash(node ${KIT}/learn.js:*)`, `Bash(node ${KIT}/webcard.js:*)`, 'WebSearch', 'WebFetch',
  'Bash(node tools/meal-week.js:*)', 'Bash(node tools/week-plan.js:*)', 'Bash(node tools/swap-finder.js:*)',
  'Bash(node tools/prep-list.js:*)',
  'Edit(./state/tools/meal-week/**)', 'Write(./state/tools/meal-week/**)',
].join(',');
const AT_THE_TABLE = [
  'You are talking with the person at your table, on your own page in the Orchard. They type to you there and your',
  'reply is shown there, so write it as you would speak at the table: short, warm, plain text with simple lists.',
  'Never tell them to open a Claude chat; they are already talking with you. When you publish a week with',
  'meal-week.js, the page shows its link by itself: say the week is on the table and they can open it there.',
].join(' ');
const SESSION_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LONGEST_TURN_MS = 10 * 60 * 1000;
const MAX_TEXT = 2000;

const isFile = (f) => { try { return fs.statSync(f).isFile(); } catch (_) { return false; } };

// Claude Code on this computer: the newest the VS Code extension carries (an npm install on the PATH can lag far
// behind it), else claude on the PATH, else ~/.local/bin. The same order Bryn uses. Null when there is none.
function findClaude() {
  const exe = process.platform === 'win32' ? 'claude.exe' : 'claude';
  const base = path.join(os.homedir(), '.vscode', 'extensions');
  let dirs = [];
  try { dirs = fs.readdirSync(base).filter((d) => /^anthropic\.claude-code-\d/.test(d)); } catch (_) { dirs = []; }
  const ver = (d) => (/-(\d+(?:\.\d+)*)/.exec(d) || [0, '0'])[1].split('.').map(Number);
  dirs.sort((a, b) => { const x = ver(a); const y = ver(b); for (let i = 0; i < Math.max(x.length, y.length); i += 1) if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0); return 0; });
  for (const d of dirs) { const f = path.join(base, d, 'resources', 'native-binary', exe); if (isFile(f)) return f; }
  const paths = String(process.env.PATH || process.env.Path || '').split(path.delimiter).filter(Boolean);
  paths.push(path.join(os.homedir(), '.local', 'bin'));
  for (const p of paths) { const f = path.join(p.replace(/^"|"$/g, ''), exe); if (isFile(f)) return f; }
  return null;
}

// What she is doing, in her words, from the tool she just reached for.
function activity(tool) {
  const name = tool.name || '';
  const input = tool.input || {};
  const cmd = String(input.command || '');
  if (name === 'Agent' || name === 'Task') {
    const who = String(input.subagent_type || '').toLowerCase();
    if (who === 'summer') return 'Asking Summer';
    if (who === 'spud') return 'Asking Spud';
    return 'Thinking it through';
  }
  if (name === 'WebSearch') return 'Looking it up on the web';
  if (name === 'WebFetch') return 'Reading a page on the web';
  if (/webcard\.js/.test(cmd)) return 'Writing a new card';
  if (/learn\.js .*--find/.test(cmd)) return 'Looking on Louise\'s shelves';
  if (/meal-week\.js publish/.test(cmd)) return 'Putting the week on the table';
  if (/meal-week\.js/.test(cmd)) return 'Looking at the week';
  if (/shelf\.js/.test(cmd)) return 'Looking at my cards';
  if (/memory\.js remember/.test(cmd)) return 'Remembering that';
  if (/memory\.js/.test(cmd)) return 'Checking what you told me';
  if (/louise\.js ask/.test(cmd)) return 'Writing a lantern for Louise';
  if (/louise\.js/.test(cmd)) return 'Checking on Louise';
  if (/swap-finder|week-plan|prep-list/.test(cmd)) return 'Using one of my tools';
  if (name === 'Write' || name === 'Edit') return 'Writing the week down';
  if (name === 'Read' || name === 'Grep' || name === 'Glob') return 'Reading a card';
  return 'Thinking';
}

// Summer and Spud, from their own files, for --agents (restricted mode reads no .claude folder by itself).
function helpersOf(agentDir) {
  const helpers = {};
  for (const f of ['summer.md', 'spud.md']) {
    let src = '';
    try { src = fs.readFileSync(path.join(agentDir, '.claude', 'agents', f), 'utf8'); } catch (_) { continue; }
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(src);
    if (!m) continue;
    const field = (k) => { const x = new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(m[1]); return x ? x[1].trim() : ''; };
    if (!field('name') || !field('description')) continue;
    helpers[field('name')] = { description: field('description'), prompt: m[2].trim(), tools: field('tools').split(/\s*,\s*/).filter(Boolean) };
  }
  return helpers;
}

// The Claude Code command line for one turn (the person's words go on stdin). Nothing runs here, so
// kit/engine/fences.js and a dry call can read it as it is.
function argv(agentDir, session) {
  const helpers = helpersOf(agentDir);
  const args = ['-p', '--restricted', '--strict-mcp-config',
    '--settings', path.join(agentDir, '.claude', 'settings.json'), '--add-dir', path.join(agentDir, '..', '..', 'kit'),
    '--append-system-prompt-file', path.join(agentDir, 'state', 'dashboard', 'at-the-table.md'),
    '--tools', TALK_TOOLS, '--allowedTools', TOOLS,
    '--output-format', 'stream-json', '--verbose'];
  if (Object.keys(helpers).length) args.push('--agents', JSON.stringify(helpers));
  if (SESSION_RE.test(String(session || ''))) args.push('--resume', session);
  return args;
}

module.exports = function talk(agentDir) {
  const dir = path.join(agentDir, 'state', 'dashboard');
  const file = path.join(dir, 'talk.json');
  const linksFile = path.join(agentDir, 'state', 'tools', 'meal-week', 'links.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return { session: null, messages: [] }; } };
  const save = (v) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(v, null, 2)}\n`, 'utf8');
    fs.renameSync(`${file}.tmp`, file);
  };
  const links = () => { try { return JSON.parse(fs.readFileSync(linksFile, 'utf8')).links || []; } catch (_) { return []; } };
  // Her law plus where she is talking, as one file for --append-system-prompt-file.
  const systemFile = path.join(dir, 'at-the-table.md');
  const writeSystem = () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(systemFile, `${fs.readFileSync(path.join(agentDir, 'CLAUDE.md'), 'utf8')}\n\n## Right now\n\n${AT_THE_TABLE}\n`, 'utf8');
  };
  let turn = null;
  process.on('exit', () => { if (turn && turn.child && !turn.done) turn.child.kill(); });

  function start(text, fresh) {
    const t = String(text || '').trim();
    if (!t) throw Object.assign(new Error('Tell me something first.'), { status: 400 });
    if (t.length > MAX_TEXT) throw Object.assign(new Error(`That is a lot for one go. Keep it under ${MAX_TEXT} letters.`), { status: 400 });
    if (turn && !turn.done) throw Object.assign(new Error('I am still answering. Give me a moment.'), { status: 409 });
    const claude = findClaude();
    if (!claude) throw Object.assign(new Error('I can not find Claude Code on this computer, so I can not talk here yet. Open a Claude chat in my folder, agents/nutrition, instead.'), { status: 503 });
    const log = fresh ? { session: null, messages: [] } : read();
    log.messages.push({ who: 'you', text: t, at: new Date().toISOString() });
    save(log);
    writeSystem();
    const args = argv(agentDir, log.session);
    const before = new Set(links().map((l) => l.k));
    const child = spawn(claude, args, { cwd: agentDir, windowsHide: true, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.on('error', () => {});
    child.stdin.end(t);
    turn = { id: Date.now(), started: Date.now(), activity: 'Thinking', text: '', done: false, error: null, link: null, child };
    const cur = turn;
    let buf = '';
    let session = log.session;
    let result = null;
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        let m;
        try { m = JSON.parse(line); } catch (_) { continue; }
        if (m.session_id) session = m.session_id;
        if (m.type === 'assistant' && !m.parent_tool_use_id && m.message && Array.isArray(m.message.content)) {
          for (const c of m.message.content) {
            if (c.type === 'text' && c.text) cur.text = c.text;
            if (c.type === 'tool_use') cur.activity = activity(c);
          }
        }
        if (m.type === 'result') result = m;
      }
    });
    let err = '';
    child.stderr.on('data', (c) => { err = (err + c.toString('utf8')).slice(-2000); });
    const timer = setTimeout(() => { cur.error = 'That took too long, so I stopped. Try asking again, a bit at a time.'; child.kill(); }, LONGEST_TURN_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      const answer = result && typeof result.result === 'string' && result.result.trim() ? result.result.trim() : cur.text.trim();
      if (!cur.error && (code !== 0 || (result && result.is_error) || !answer)) {
        cur.error = 'Something went wrong on my side, and I did not finish that. Try again in a moment.';
        if (err) process.stderr.write(`talk: ${err}\n`);
      }
      const after = links().filter((l) => !before.has(l.k)).pop();
      if (after) cur.link = { k: after.k, week: after.week, expires: after.expires };
      const out = read();
      if (session) out.session = session;
      out.messages.push({ who: 'avo', text: cur.error || answer, at: new Date().toISOString(), link: cur.link || undefined });
      save(out);
      cur.text = cur.error || answer;
      cur.done = true;
      cur.child = null;
    });
    child.on('error', () => { cur.error = 'I could not start just now. Try again in a moment.'; });
    return { ok: true };
  }

  function status() {
    const log = read();
    return {
      busy: Boolean(turn && !turn.done),
      activity: turn && !turn.done ? turn.activity : null,
      partial: turn && !turn.done ? turn.text : null,
      seconds: turn && !turn.done ? Math.round((Date.now() - turn.started) / 1000) : null,
      messages: log.messages.slice(-40),
    };
  }

  function stop() {
    if (turn && !turn.done && turn.child) { turn.error = 'Stopped.'; turn.child.kill(); }
    return { ok: true };
  }

  return { start, status, stop };
};
module.exports.argv = argv;
