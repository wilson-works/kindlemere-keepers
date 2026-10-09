'use strict';

/**
 * kit/engine/tool-kit.js — the one module a tool may require (kit/CONTRACT.md, section 8). Node built-ins only.
 *
 *   run(file, body)   checks the tool, builds ctx, calls body(ctx) and prints what it returns
 *
 * A tool runs only when it passes the toolsmith's check and its file matches its sha256 in tools/registry.json.
 * `toolsmith.js try` sets KIT_TRY to the tool's name, which lets an unregistered tool that passes the check run.
 *
 * ctx: { args, agent: { key, name, dir }, find(words), card(file), recall(), data(name),
 *        state: { read(name), write(name, value) } }
 * State files live in agents/<key>/state/tools/<tool>/, named with letters, digits, dot, dash and underscore.
 */

const fs = require('fs');
const path = require('path');
const common = require('./common');

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const DATA_RE = /^(?:[a-z0-9][a-z0-9_-]{0,40}\/)?[a-z0-9][a-z0-9_-]{0,60}\.json$/;
const STATE_MAX = 1024 * 1024;

function stop(message) {
  process.stdout.write(`${message}\n`);
  process.exit(2);
}

function makeCtx(key, tool) {
  const shelf = require('./shelf');
  const memory = require('./memory');
  const info = common.agentInfo(key);
  const stateDir = path.join(info.dir, 'state', 'tools', tool);
  const stateFile = (name) => {
    if (typeof name !== 'string' || !NAME_RE.test(name) || name.includes('..')) throw common.refuse(`"${name}" is not a state file name.`);
    return path.join(stateDir, name);
  };
  return {
    args: common.parseArgs(process.argv.slice(2)),
    agent: { key, name: info.name, dir: info.dir },
    find: (words) => shelf.find(key, words),
    card: (file) => {
      const c = shelf.show(key, file);
      if (c.refused) throw common.refuse(`${c.file} is refused by the shelf: ${c.refused}`);
      return { title: c.title, sources: c.sources, tags: c.tags, body: c.body, facts: c.facts };
    },
    recall: () => memory.recall(key),
    // A JSON file the agent keeps beside its cards (knowledge/<name>.json or knowledge/<folder>/<name>.json), read
    // only; null when there is none. Avo's cookbook is one: ctx.data('cookbook/recipes.json').
    data: (name) => {
      if (typeof name !== 'string' || !DATA_RE.test(name)) throw common.refuse(`"${name}" is not a data file in the knowledge folder.`);
      return common.readJson(path.join(info.dir, 'knowledge', ...name.split('/')), null);
    },
    state: {
      read(name) {
        try { return fs.readFileSync(stateFile(name), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
      },
      write(name, value) {
        const text = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`;
        if (Buffer.byteLength(text) > STATE_MAX) throw common.refuse('That is more than a tool may keep in one file (1 MB).');
        fs.mkdirSync(stateDir, { recursive: true });
        fs.writeFileSync(stateFile(name), text, 'utf8');
        return name;
      },
    },
  };
}

function run(file, body) {
  const toolsmith = require('./toolsmith');
  const dir = path.dirname(path.resolve(file));
  const agentDir = path.dirname(dir);
  const key = path.basename(agentDir);
  const tool = path.basename(file, '.js');
  if (path.basename(dir) !== 'tools' || path.resolve(common.REPO, 'agents', key) !== agentDir) stop(`${file} is not in an agent's tools folder.`);
  let problems;
  try { problems = toolsmith.check(key, tool).problems; } catch (e) { stop(e.message); }
  if (problems.length) stop(`${tool} does not pass the toolsmith's check, so it did not run: line ${problems[0].line}: ${problems[0].why}`);
  if (process.env.KIT_TRY !== tool) {
    const entry = toolsmith.registry(key).tools.find((t) => t.name === tool);
    if (!entry) stop(`${tool} is not in agents/${key}/tools/registry.json yet, so it did not run. Try it with toolsmith.js try.`);
    if (entry.sha256 !== toolsmith.sha256(path.resolve(file))) stop(`${tool} changed since it was checked, so it did not run. Check it again and update its registry entry.`);
  }
  Promise.resolve()
    .then(() => body(makeCtx(key, tool)))
    .then((out) => {
      if (out === undefined) return;
      process.stdout.write(typeof out === 'string' ? `${out}\n` : `${JSON.stringify(out, null, 2)}\n`);
    })
    .catch((e) => { process.stdout.write(`${e.message}\n`); process.exitCode = e.status == null ? 2 : e.status; });
}

module.exports = { run };
