'use strict';

/**
 * kit/engine/fences.js — checks what each agent can reach (kit/CONTRACT.md, section 9). Node built-ins only.
 *
 * The law since the owner's word of 2026-10-09 ("allow them to search the internet for solutions when Louise is
 * unavailable"): a keeper may reach the web, and only through Claude Code's own WebSearch and WebFetch. It never reaches
 * a connector or an MCP server, and never fetches through the shell (curl, wget, Invoke-WebRequest and the like).
 *
 *   check(keys)   { agents, problems: [{ where, why }] }: every problem found; none means every named agent (default:
 *                 all) and the repo root are inside the fences
 *
 * For the repo root and each agent folder: .claude/settings.json denies every rule in the kit's copy
 * (kit/claude/settings.agent.json), and the kit's copy denies at least every MCP tool and every shell fetcher (FLOOR);
 * nothing allows or asks for an MCP tool or a shell fetcher; no MCP server is turned on and there is no .mcp.json. For
 * each agent: its settings do not deny WebSearch or WebFetch (the keeper looks a gap up on the web); its CLAUDE.md names
 * kit/engine/louise.js (its way to ask Louise) and kit/engine/webcard.js (its way to keep what it found on the web);
 * every tools/*.js passes the toolsmith's check (a tool never reaches the network); and when its room talks
 * (dashboard/talk.js or dashboard/routes.js exporting argv), the Claude Code command it builds is --restricted, with
 * --strict-mcp-config and no MCP config, its own settings file, and no tool beyond the files, its node commands,
 * WebSearch and WebFetch.
 *
 * CLI: fences.js check [<agent> ...]   [--json]   exit 2 when anything failed
 */

const fs = require('fs');
const path = require('path');
const common = require('./common');
const toolsmith = require('./toolsmith');

// What the kit's own copy must always deny, whatever else it says: every MCP tool and every way to fetch from the shell.
const FLOOR = ['mcp__*', 'Bash(curl:*)', 'Bash(wget:*)', 'Bash(Invoke-WebRequest:*)', 'Bash(Invoke-RestMethod:*)',
  'PowerShell(curl:*)', 'PowerShell(wget:*)', 'PowerShell(iwr:*)', 'PowerShell(irm:*)', 'PowerShell(Invoke-WebRequest:*)',
  'PowerShell(Invoke-RestMethod:*)'];
const KIT_SETTINGS = path.join(common.REPO, 'kit', 'claude', 'settings.agent.json');
const WEB_TOOLS = ['WebSearch', 'WebFetch'];
// A rule that reaches out some other way: an MCP tool, or a shell command that fetches.
const isOutside = (rule) => /^mcp__/.test(String(rule))
  || /^(Bash|PowerShell)\(\s*(curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod|Start-BitsTransfer|certutil|bitsadmin)\b/i.test(String(rule));
// The tools a page talk may name in --tools: the file tools, Bash (held to its allowed node commands), its helpers, the web.
const TALK_TOOLS = new Set(['Read', 'Grep', 'Glob', 'Bash', 'Task', 'Agent', 'Edit', 'Write', ...WEB_TOOLS]);

function kitDeny() {
  let s;
  try { s = common.readJson(KIT_SETTINGS, null); } catch (e) { return { deny: FLOOR, problems: [{ where: 'kit', why: e.message }] }; }
  const deny = s && s.permissions && Array.isArray(s.permissions.deny) ? s.permissions.deny : [];
  const problems = FLOOR.filter((r) => !deny.includes(r)).map((r) => ({ where: 'kit/claude/settings.agent.json', why: `It does not deny ${r}.` }));
  return { deny: [...new Set([...FLOOR, ...deny])], problems };
}

function settingsProblems(dir, where, mustDeny, keeper) {
  const file = path.join(dir, '.claude', 'settings.json');
  let s;
  try { s = common.readJson(file, null); } catch (e) { return [{ where, why: e.message }]; }
  if (!s) return [{ where, why: 'It has no .claude/settings.json.' }];
  const p = s.permissions || {};
  const deny = Array.isArray(p.deny) ? p.deny : [];
  const out = mustDeny.filter((r) => !deny.includes(r)).map((r) => ({ where, why: `.claude/settings.json does not deny ${r}.` }));
  for (const list of ['allow', 'ask']) {
    for (const r of Array.isArray(p[list]) ? p[list] : []) if (isOutside(r)) out.push({ where, why: `.claude/settings.json ${list}s ${r}.` });
  }
  if (keeper) {
    for (const t of WEB_TOOLS) {
      if (deny.some((r) => r === t || String(r).startsWith(`${t}(`))) out.push({ where, why: `.claude/settings.json denies ${t}, so the keeper cannot look a gap up on the web (owner, 2026-10-09).` });
    }
  }
  if (s.enableAllProjectMcpServers === true) out.push({ where, why: '.claude/settings.json turns on every project MCP server.' });
  if (Array.isArray(s.enabledMcpjsonServers) && s.enabledMcpjsonServers.length) out.push({ where, why: '.claude/settings.json turns on MCP servers.' });
  if (fs.existsSync(path.join(dir, '.mcp.json'))) out.push({ where, why: 'It has a .mcp.json (an MCP server list).' });
  return out;
}

/** The values after each --flag in a claude command line (a flag may take several, as --allowedTools does). */
function flags(argv) {
  const out = {};
  let cur = null;
  for (const a of argv) {
    if (/^--[a-zA-Z]/.test(a)) { cur = a; out[cur] = out[cur] || []; continue; }
    if (cur) out[cur].push(a);
  }
  return out;
}

/** The Claude Code command a room's page talk builds, when the room talks: checked against the fences. */
function talkProblems(dir, where) {
  let argv = null;
  let from = '';
  for (const f of ['talk.js', 'routes.js']) {
    const file = path.join(dir, 'dashboard', f);
    if (!fs.existsSync(file)) continue;
    let mod;
    try { mod = require(file); } catch (e) { return [{ where: `${where}/dashboard/${f}`, why: `It does not load: ${e.message}` }]; }
    if (typeof mod.argv === 'function') { argv = mod.argv(dir, null); from = `${where}/dashboard/${f}`; break; }
  }
  if (!argv) return [];
  const out = [];
  const bad = (why) => out.push({ where: from, why });
  const fl = flags(argv);
  if (!fl['--restricted']) bad('Its claude command is not --restricted.');
  if (!fl['--strict-mcp-config']) bad('Its claude command has no --strict-mcp-config.');
  if (fl['--mcp-config']) bad('Its claude command names an MCP config.');
  if (fl['--dangerously-skip-permissions'] || (fl['--permission-mode'] || []).includes('bypassPermissions')) bad('Its claude command skips the permission checks.');
  const settings = (fl['--settings'] || [])[0];
  if (!settings || path.resolve(settings) !== path.join(dir, '.claude', 'settings.json')) bad('Its claude command does not load its own .claude/settings.json.');
  const list = (name) => (fl[name] || []).flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean);
  for (const t of list('--tools')) if (!TALK_TOOLS.has(t)) bad(`Its claude command gives it the tool ${t}.`);
  for (const r of list('--allowedTools')) {
    if (isOutside(r)) bad(`Its claude command allows ${r}.`);
    else if (/^(Bash|PowerShell)\(/.test(r) && !/^Bash\(node /.test(r)) bad(`Its claude command allows ${r}: only its node commands may run.`);
  }
  for (const t of WEB_TOOLS) {
    if (!list('--tools').includes(t)) bad(`Its claude command does not give it ${t} (owner, 2026-10-09: the keepers look a gap up on the web).`);
    if (list('--disallowedTools').includes(t)) bad(`Its claude command refuses ${t}.`);
  }
  return out;
}

function agentKeys() {
  try {
    return fs.readdirSync(path.join(common.REPO, 'agents'), { withFileTypes: true })
      .filter((e) => e.isDirectory() && common.KEY_RE.test(e.name) && !e.name.startsWith('_')).map((e) => e.name).sort();
  } catch (_) { return []; }
}

function check(keysIn) {
  const keys = keysIn && keysIn.length ? keysIn : agentKeys();
  const kit = kitDeny();
  const out = kit.problems.concat(settingsProblems(common.REPO, 'repo root', kit.deny, false));
  for (const key of keys) {
    const dir = common.agentDir(key);
    const where = `agents/${key}`;
    out.push(...settingsProblems(dir, where, kit.deny, true));
    let claude = '';
    try { claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'); } catch (_) { out.push({ where, why: 'It has no CLAUDE.md.' }); }
    if (claude && !claude.includes('kit/engine/louise.js')) out.push({ where, why: 'Its CLAUDE.md does not name kit/engine/louise.js, its way to ask Louise.' });
    if (claude && !claude.includes('kit/engine/webcard.js')) out.push({ where, why: 'Its CLAUDE.md does not name kit/engine/webcard.js, its way to keep what it found on the web.' });
    let tools = [];
    try { tools = fs.readdirSync(path.join(dir, 'tools')).filter((f) => /\.js$/.test(f)); } catch (_) { /* no tools yet */ }
    for (const f of tools) {
      const problems = toolsmith.checkSource(fs.readFileSync(path.join(dir, 'tools', f), 'utf8'));
      for (const p of problems) out.push({ where: `${where}/tools/${f}:${p.line}`, why: p.why });
    }
    out.push(...talkProblems(dir, where));
  }
  return { agents: keys, problems: out };
}

module.exports = { check, FLOOR };

if (require.main === module) {
  common.cli((args) => {
    const [cmd, ...keys] = args._;
    if (cmd !== 'check') throw common.refuse('Use: fences.js check [<agent> ...]');
    const r = check(keys);
    if (!r.problems.length) {
      const n = r.agents.length;
      return { text: `Inside the fences: the repo root and ${n} agent${n === 1 ? '' : 's'} (${r.agents.join(', ') || 'none yet'}). No connector, no MCP server, no fetching from the shell or a tool; each keeper reaches the web only through WebSearch and WebFetch.`, data: r };
    }
    return { text: r.problems.map((p) => `${p.where}: ${p.why}`).join('\n'), data: r, code: 2 };
  });
}
