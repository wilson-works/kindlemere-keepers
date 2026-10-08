'use strict';

/**
 * kit/engine/toolsmith.js — an agent makes its own small tools (kit/CONTRACT.md, section 8). Node built-ins only.
 *
 *   newTool(key, tool, { purpose, inputs, cards })   writes agents/<key>/tools/<tool>.js from the template
 *   checkSource(text)                                [problems]: what in the source a tool may not do
 *   check(key, tool)                                 { ok, problems, entry }: entry is the registry line to add
 *   registry(key)                                    the agent's tools/registry.json ({ tools: [] } when none)
 *   list(key)                                        [{ name, file, purpose, ok, why }]: does each still match
 *   sha256(file)
 *
 * The kit reads tools/registry.json and never writes it: the agent's lane adds the entry `check` prints.
 *
 * CLI: new <agent> <tool> --purpose "…" [--inputs "a,b"] [--cards "x.md,y.md"] | check <agent> <tool>
 *      | try <agent> <tool> [args] | list <agent>   [--json]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { spawnSync } = require('child_process');
const common = require('./common');

const TOOL_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+){0,6}$/;
const ALLOWED = '../../../kit/engine/tool-kit';
const TEMPLATE = path.join(__dirname, 'templates', 'tool.js.txt');

function toolName(tool) {
  if (typeof tool !== 'string' || !TOOL_RE.test(tool)) throw common.refuse(`"${tool || ''}" is not a tool name. Use lower-case words joined by -, like plate-check.`);
  return tool;
}
const toolsDir = (key) => path.join(common.agentDir(key), 'tools');
const toolFile = (key, tool) => path.join(toolsDir(key), `${toolName(tool)}.js`);
// Line endings do not count: a tool checked out with CRLF hashes the same as the LF file that was checked.
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const listOf = (v) => (v && v !== true ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

function newTool(key, tool, opts) {
  const o = opts || {};
  const purpose = String(o.purpose && o.purpose !== true ? o.purpose : '').replace(/\s+/g, ' ').trim();
  if (!purpose) throw common.refuse('Say what the tool is for: --purpose "<one sentence>".');
  if (/\*\//.test(purpose)) throw common.refuse('The purpose cannot contain */.');
  const file = toolFile(key, tool);
  if (fs.existsSync(file)) throw common.refuse(`agents/${key}/tools/${tool}.js is already there. The toolsmith never overwrites a tool.`);
  const inputs = listOf(o.inputs);
  const cardsList = listOf(o.cards);
  const text = fs.readFileSync(TEMPLATE, 'utf8')
    .replace(/\{\{tool\}\}/g, tool).replace(/\{\{agent\}\}/g, key).replace(/\{\{purpose\}\}/g, purpose)
    .replace(/\{\{inputs\}\}/g, inputs.join(', ') || 'none').replace(/\{\{cards\}\}/g, cardsList.join(', ') || 'none')
    .replace(/\{\{usage\}\}/g, inputs.map((i) => `--${i} <${i}>`).join(' ') || '<words>');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { encoding: 'utf8', flag: 'wx' });
  return { file: path.relative(common.REPO, file).replace(/\\/g, '/') };
}

/**
 * The code with every comment and every string's contents blanked to spaces (so prose such as "fetch the ball" or
 * "processed food" is never mistaken for code). Template literals' ${…} parts stay code.
 */
function codeOnly(src) {
  const s = String(src);
  let out = '';
  let i = 0;
  const stack = []; // open template literals, each with its ${ depth
  let mode = 'code';
  let quote = '';
  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && n === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (c === '\'' || c === '"') { mode = 'str'; quote = c; out += c; i += 1; continue; }
      if (c === '`') { mode = 'tpl'; stack.push(0); out += c; i += 1; continue; }
      if (stack.length && c === '{') stack[stack.length - 1] += 1;
      if (stack.length && c === '}') {
        if (stack[stack.length - 1] === 0) { mode = 'tpl'; out += c; i += 1; continue; }
        stack[stack.length - 1] -= 1;
      }
      out += c; i += 1; continue;
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += c; } else out += ' '; i += 1; continue; }
    if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; out += '  '; i += 2; continue; }
      out += c === '\n' ? c : ' '; i += 1; continue;
    }
    if (mode === 'str') {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === quote) { mode = 'code'; out += c; i += 1; continue; }
      out += c === '\n' ? c : ' '; i += 1; continue;
    }
    if (mode === 'tpl') {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === '`') { stack.pop(); mode = 'code'; out += c; i += 1; continue; }
      if (c === '$' && n === '{') { mode = 'code'; out += '${'; i += 2; continue; }
      out += c === '\n' ? c : ' '; i += 1; continue;
    }
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function checkSource(src) {
  const text = String(src);
  const code = codeOnly(text);
  const problems = [];
  const at = (re, from, why) => {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    let m;
    while ((m = r.exec(from))) problems.push({ line: lineOf(from, m.index), why: typeof why === 'function' ? why(m) : why });
  };
  // Every require must be the one allowed, spelled out.
  const req = /\brequire\s*\(\s*(['"])([^'"]*)\1\s*\)/g;
  let m;
  const allowedAt = new Set();
  while ((m = req.exec(text))) {
    if (m[2] === ALLOWED) allowedAt.add(lineOf(text, m.index));
    else problems.push({ line: lineOf(text, m.index), why: `It requires "${m[2]}". A tool may require only ${ALLOWED}.` });
  }
  const anyReq = /\brequire\b/g;
  while ((m = anyReq.exec(code))) {
    const line = lineOf(code, m.index);
    if (!allowedAt.has(line) && !problems.some((p) => p.line === line)) problems.push({ line, why: 'It uses require in a way the toolsmith cannot read. Require only the tool kit, by its plain path.' });
  }
  // Never in a tool, even inside a string.
  at(/\b(globalThis|__proto__|constructor|child_process|process\.binding|process\.dlopen)\b/, text, (x) => `It mentions ${x[1]}, which a tool may not touch.`);
  at(/\b(eval|Function)\s*\(/, text, (x) => `It calls ${x[1]}, which can run code the toolsmith cannot check.`);
  at(/\bimport\s*\(|^\s*import\s[^(]/m, text, 'It imports a module. A tool may require only the tool kit.');
  // Never in a tool's code (prose inside strings and comments is fine).
  at(/\bfetch\b/, code, 'It calls fetch. A tool never reaches the network.');
  at(/\b(XMLHttpRequest|WebSocket|EventSource)\b/, code, (x) => `It uses ${x[1]}. A tool never reaches the network.`);
  at(/\b(process|module|exports|global)\b/, code, (x) => `It uses ${x[1]}. A tool gets what it needs from ctx.`);
  const seen = new Set();
  return problems.filter((p) => { const k = `${p.line}:${p.why}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.line - b.line);
}

/** Purpose, Inputs and Cards from the tool's header comment. */
function header(text) {
  const get = (k) => { const x = new RegExp(`^\\s*\\*\\s*${k}:\\s*(.*)$`, 'm').exec(text); return x ? x[1].trim() : ''; };
  const list = (v) => (v && v !== 'none' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
  return { purpose: get('Purpose'), inputs: list(get('Inputs')), cards: list(get('Cards')) };
}

function check(key, tool) {
  const file = toolFile(key, tool);
  if (!fs.existsSync(file)) throw common.refuse(`There is no tool at agents/${key}/tools/${tool}.js. Make it with toolsmith.js new.`, 1);
  const text = fs.readFileSync(file, 'utf8');
  const problems = checkSource(text);
  // Compiled, never run: a tool with a syntax error is refused here, not when someone tries to use it.
  try { new vm.Script(text, { filename: file }); } catch (e) {
    const at = /:(\d+)\s*$/m.exec(String(e.stack).split('\n')[0]);
    problems.push({ line: at ? Number(at[1]) : 1, why: `It does not parse: ${e.message}` });
  }
  const h = header(text);
  if (!h.purpose) problems.push({ line: 1, why: 'Its header has no "Purpose:" line.' });
  const shelf = require('./shelf');
  const onShelf = new Map(shelf.all(key).map((c) => [c.file, c]));
  for (const c of h.cards) {
    const card = onShelf.get(c);
    if (!card) problems.push({ line: 1, why: `It rests on ${c}, which is not on the shelf.` });
    else if (card.refused) problems.push({ line: 1, why: `It rests on ${c}, which the shelf refuses: ${card.refused}` });
  }
  const entry = { name: tool, file: `${tool}.js`, purpose: h.purpose, inputs: h.inputs, cards: h.cards, sha256: sha256(file), checked: common.today() };
  return { ok: !problems.length, problems, entry };
}

function registry(key) {
  const r = common.readJson(path.join(toolsDir(key), 'registry.json'), { tools: [] }) || {};
  return { tools: Array.isArray(r.tools) ? r.tools : [] };
}

function list(key) {
  return registry(key).tools.map((t) => {
    const out = { name: t.name, file: t.file, purpose: t.purpose, ok: false, why: '' };
    try {
      if (t.file !== `${toolName(t.name)}.js`) { out.why = 'Its file name does not match its name.'; return out; }
      const file = toolFile(key, t.name);
      if (!fs.existsSync(file)) { out.why = 'Its file is not there.'; return out; }
      if (sha256(file) !== t.sha256) { out.why = 'It changed since it was checked. Check it again and update its entry.'; return out; }
      const problems = checkSource(fs.readFileSync(file, 'utf8'));
      if (problems.length) { out.why = problems[0].why; return out; }
      out.ok = true;
    } catch (e) { out.why = e.message; }
    return out;
  });
}

module.exports = { newTool, checkSource, check, registry, list, sha256, toolFile, toolName, ALLOWED };

if (require.main === module) {
  common.cli((args) => {
    const [cmd, key, tool, ...rest] = args._;
    if (cmd === 'new') {
      const r = newTool(key, tool, { purpose: args.purpose, inputs: args.inputs, cards: args.cards });
      return { text: `Made ${r.file}. Fill in its body, then run toolsmith.js check ${key} ${tool}.`, data: r };
    }
    if (cmd === 'check') {
      const r = check(key, tool);
      if (!r.ok) return { text: [`refused  ${tool}`, ...r.problems.map((p) => `  line ${p.line}: ${p.why}`)].join('\n'), data: r, code: 2 };
      return { text: `ok  ${tool}\nAdd this entry to agents/${key}/tools/registry.json under "tools":\n${JSON.stringify(r.entry, null, 2)}`, data: r };
    }
    if (cmd === 'try') {
      const r = check(key, tool);
      if (!r.ok) return { text: [`refused  ${tool}`, ...r.problems.map((p) => `  line ${p.line}: ${p.why}`)].join('\n'), data: r, code: 2 };
      // Arguments after the tool name go to it as they were typed, flags included.
      const i = process.argv.indexOf(tool);
      const pass = i >= 0 ? process.argv.slice(i + 1).filter((a) => a !== '--json') : rest;
      const run = spawnSync(process.execPath, [toolFile(key, tool), ...pass], { stdio: 'inherit', env: Object.assign({}, process.env, { KIT_TRY: tool }), windowsHide: true });
      process.exitCode = run.status == null ? 2 : run.status;
      return null;
    }
    if (cmd === 'list') {
      const ts = list(key);
      if (!ts.length) return { text: 'No tools registered yet.', data: ts, code: 1 };
      return { text: ts.map((t) => `${t.ok ? 'ok     ' : 'stopped'}  ${t.name}  ${t.ok ? t.purpose : t.why}`).join('\n'), data: ts };
    }
    throw common.refuse('Use: toolsmith.js new <agent> <tool> --purpose "…" [--inputs "a,b"] [--cards "x.md,y.md"] | check <agent> <tool> | try <agent> <tool> [args] | list <agent>');
  });
}
