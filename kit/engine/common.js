'use strict';

/**
 * kit/engine/common.js — what every kit command shares: where the repo and an agent's folder are, the command-line
 * reader, and plain-sentence errors. Node built-ins only.
 *
 *   REPO                     the repo root (two folders above this file)
 *   agentDir(key)            agents/<key>, or throws (status 2) when the key is not an agent folder here
 *   agentInfo(key)           { key, dir, name, title } (name and title from agent.json, else the key)
 *   parseArgs(argv)          { _: [positionals], <flag>: value | true }
 *   readJson(file, dflt)     parsed JSON, or dflt when the file is missing
 *   writeJson(file, obj)     writes it (making the folder), through a temporary file
 *   today()                  YYYY-MM-DD on this computer's clock
 *   refuse(message)          an Error with status 2
 *   cli(fn)                  runs fn(args) and prints what it returns; errors print their message and exit with
 *                            their status (2 by default)
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const KEY_RE = /^[a-z_][a-z0-9-]{0,40}$/;

function refuse(message, status) {
  return Object.assign(new Error(message), { status: status == null ? 2 : status });
}

function agentDir(key) {
  if (typeof key !== 'string' || !KEY_RE.test(key)) throw refuse(`"${key || ''}" is not an agent's folder name. Use nutrition, fitness or dog-training.`);
  const dir = path.join(REPO, 'agents', key);
  let st;
  try { st = fs.statSync(dir); } catch (_) { st = null; }
  if (!st || !st.isDirectory()) throw refuse(`There is no agent folder at agents/${key}.`);
  return dir;
}

function readJson(file, dflt) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') return dflt;
    throw e;
  }
  try { return JSON.parse(text.replace(/^﻿/, '')); } catch (e) {
    throw refuse(`${path.relative(REPO, file)} is not readable JSON: ${e.message}`);
  }
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

function agentInfo(key) {
  const dir = agentDir(key);
  const manifest = readJson(path.join(dir, 'agent.json'), {}) || {};
  return { key, dir, name: manifest.name || key, title: manifest.title || '', manifest };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const m = /^--([a-z][a-z0-9-]*)(?:=(.*))?$/.exec(a);
    if (!m) { out._.push(a); continue; }
    if (m[2] !== undefined) out[m[1]] = m[2];
    else if (i + 1 < argv.length && !/^--[a-z]/.test(argv[i + 1])) { out[m[1]] = argv[i + 1]; i += 1; } else out[m[1]] = true;
  }
  return out;
}

function today(d) {
  const t = d ? new Date(d) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

/** Flags that take no value: a value that landed in one belongs to the positionals. */
function flagsOnly(args, names) {
  for (const n of names) {
    if (args[n] !== undefined && args[n] !== true) { args._.push(args[n]); args[n] = true; }
  }
  return args;
}

function cli(fn) {
  const args = flagsOnly(parseArgs(process.argv.slice(2)), ['json', 'dry', 'strict']);
  Promise.resolve()
    .then(() => fn(args))
    .then((r) => {
      if (r == null) return;
      const { text, data, code } = r;
      if (args.json && data !== undefined) process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
      else if (text) process.stdout.write(`${text}\n`);
      if (code) process.exitCode = code;
    })
    .catch((e) => {
      process.stdout.write(`${e.message}\n`);
      process.exitCode = e.status == null ? 2 : e.status;
      if (e.status == null && process.env.KIT_DEBUG) process.stderr.write(`${e.stack}\n`);
    });
}

module.exports = { REPO, KEY_RE, agentDir, agentInfo, parseArgs, readJson, writeJson, today, refuse, cli, flagsOnly };
