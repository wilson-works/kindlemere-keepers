'use strict';

/**
 * kit/dashboard/park.js — all of Kindlemere at once. Owner 2026-10-08: "when installing into my office, allow for any
 * of the 3 doors open up Kindlemere", and his pick: one park, three doors, where waking any door wakes all three
 * keepers. One node process opens every agent in bundle.json on its own port, exactly as that agent's own
 * dashboard/server.js would (same shell, same routes), so the office's Wake on any door wakes the whole park and Sleep
 * on any door puts it to sleep. Node built-ins only.
 *
 *   node kit/dashboard/park.js
 *
 * Keeps kit/dashboard/.pid while any room is open: the office's pid_file for all three doors. A room whose port is
 * taken is left out with a plain sentence and the others still open; when no room opens, exit 1.
 */

const fs = require('fs');
const path = require('path');
const common = require('../engine/common');
const { createShell, portOf } = require('./shell');

const ROOT = path.resolve(__dirname, '..', '..');
const PID = path.join(__dirname, '.pid');

const clearPid = () => {
  try { if (fs.readFileSync(PID, 'utf8').trim() === String(process.pid)) fs.rmSync(PID, { force: true }); } catch (_) { /* not ours, or gone */ }
};

const servers = [];
let waiting = 0;
const settled = () => {
  waiting -= 1;
  if (waiting > 0) return;
  if (!servers.length) { process.stderr.write('No room in Kindlemere could open.\n'); process.exit(1); }
  process.stdout.write(`Kindlemere is open: ${servers[0].url}kit/kindlemere.html\n`);
};

const bundle = common.readJson(path.join(ROOT, 'bundle.json'), {}) || {};
for (const b of bundle.agents || []) {
  const agentDir = path.join(ROOT, 'agents', String(b.key));
  let name = b.key;
  let server;
  let port;
  try {
    name = (common.readJson(path.join(agentDir, 'agent.json'), {}) || {}).name || b.key;
    port = portOf(agentDir);
    if (!port) { process.stderr.write(`${name} has no port: set probe.port in agent.json.\n`); continue; }
    const routesFile = path.join(agentDir, 'dashboard', 'routes.js');
    server = createShell({ agentDir, routes: fs.existsSync(routesFile) ? require(routesFile)(agentDir) : {} });
  } catch (e) {
    process.stderr.write(`${name}'s room did not open: ${e.message}\n`);
    continue;
  }
  waiting += 1;
  let done = false;
  server.on('error', (e) => {
    process.stderr.write(e.code === 'EADDRINUSE'
      ? `Port ${port} is already in use, so ${name}'s room did not open. Set "port" in agents/${b.key}/agent.config.json.\n`
      : `${name}: ${e.message}\n`);
    if (!done) { done = true; settled(); }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    servers.push({ server, url });
    if (servers.length === 1) fs.writeFileSync(PID, String(process.pid), 'utf8');
    process.stdout.write(`${name} is on ${url}\n`);
    if (!done) { done = true; settled(); }
  });
}
if (!waiting) { process.stderr.write('No room in Kindlemere could open.\n'); process.exit(1); }

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    clearPid();
    let left = servers.length;
    if (!left) process.exit(0);
    servers.forEach((r) => r.server.close(() => { left -= 1; if (!left) process.exit(0); }));
    setTimeout(() => process.exit(0), 1000).unref();
  });
}
process.on('exit', clearPid);
