'use strict';

/**
 * kit/engine/noweb.js — checks that no agent can reach the web (kit/CONTRACT.md, section 9). Node built-ins only.
 *
 *   check(keys)   [{ where, why }]: every problem found; none means every named agent (default: all) is closed
 *
 * For the repo root and each agent folder: .claude/settings.json denies WebSearch, WebFetch and every MCP tool
 * (mcp__*), and allows none of them. For each agent: CLAUDE.md names kit/engine/louise.js (its way to ask), and every
 * tools/*.js passes the toolsmith's check.
 *
 * CLI: noweb.js check [<agent> ...]   [--json]   exit 2 when anything failed
 */

const fs = require('fs');
const path = require('path');
const common = require('./common');
const toolsmith = require('./toolsmith');

// Every deny rule in the kit's own settings copy must be in each checked settings file.
const MUST_DENY = common.readJson(path.join(common.REPO, 'kit', 'claude', 'settings.agent.json'), {}).permissions.deny;
const isWeb = (rule) => /^(WebSearch|WebFetch)\b|^mcp__/.test(String(rule));

function settingsProblems(dir, where) {
  const file = path.join(dir, '.claude', 'settings.json');
  let s;
  try { s = common.readJson(file, null); } catch (e) { return [{ where, why: e.message }]; }
  if (!s) return [{ where, why: 'It has no .claude/settings.json.' }];
  const p = s.permissions || {};
  const deny = Array.isArray(p.deny) ? p.deny : [];
  const out = MUST_DENY.filter((r) => !deny.includes(r)).map((r) => ({ where, why: `.claude/settings.json does not deny ${r}.` }));
  for (const list of ['allow', 'ask']) {
    for (const r of Array.isArray(p[list]) ? p[list] : []) if (isWeb(r)) out.push({ where, why: `.claude/settings.json ${list}s ${r}.` });
  }
  if (s.enableAllProjectMcpServers === true) out.push({ where, why: '.claude/settings.json turns on every project MCP server.' });
  if (Array.isArray(s.enabledMcpjsonServers) && s.enabledMcpjsonServers.length) out.push({ where, why: '.claude/settings.json turns on MCP servers.' });
  if (fs.existsSync(path.join(dir, '.mcp.json'))) out.push({ where, why: 'It has a .mcp.json (an MCP server list).' });
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
  const out = settingsProblems(common.REPO, 'repo root');
  for (const key of keys) {
    const dir = common.agentDir(key);
    const where = `agents/${key}`;
    out.push(...settingsProblems(dir, where));
    let claude = '';
    try { claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'); } catch (_) { out.push({ where, why: 'It has no CLAUDE.md.' }); }
    if (claude && !claude.includes('kit/engine/louise.js')) out.push({ where, why: 'Its CLAUDE.md does not name kit/engine/louise.js, its way to ask Louise.' });
    let tools = [];
    try { tools = fs.readdirSync(path.join(dir, 'tools')).filter((f) => /\.js$/.test(f)); } catch (_) { /* no tools yet */ }
    for (const f of tools) {
      const problems = toolsmith.checkSource(fs.readFileSync(path.join(dir, 'tools', f), 'utf8'));
      for (const p of problems) out.push({ where: `${where}/tools/${f}:${p.line}`, why: p.why });
    }
  }
  return { agents: keys, problems: out };
}

module.exports = { check };

if (require.main === module) {
  common.cli((args) => {
    const [cmd, ...keys] = args._;
    if (cmd !== 'check') throw common.refuse('Use: noweb.js check [<agent> ...]');
    const r = check(keys);
    if (!r.problems.length) return { text: `No way to the web: the repo root and ${r.agents.length} agent${r.agents.length === 1 ? '' : 's'} (${r.agents.join(', ') || 'none yet'}).`, data: r };
    return { text: r.problems.map((p) => `${p.where}: ${p.why}`).join('\n'), data: r, code: 2 };
  });
}
