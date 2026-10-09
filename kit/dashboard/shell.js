'use strict';

/**
 * kit/dashboard/shell.js — the dashboard every agent shares (kit/CONTRACT.md, section 10). Node built-ins only.
 *
 *   createShell({ agentDir, routes, phoneHost, token })   the server, not yet listening (drills use it)
 *   start({ agentDir, routes })                           reads the port, listens on 127.0.0.1, keeps dashboard/.pid
 *
 * Who it answers, and what it may touch:
 *   - 127.0.0.1 only. Host must be 127.0.0.1, localhost, or the agent's "phone" host from agent.config.json: else 403.
 *   - GET /health is {"ok":true}, no token, ever.
 *   - A new token every start, put in the page as <meta name="kit-token">. Every /api/ request sends it as
 *     X-Kit-Token, or gets 403. A POST must be JSON, and from this page when the browser says where it came from.
 *   - Files only from the agent's dashboard/public, art and brand folders and the kit's dashboard/public, design and
 *     art folders, never a dot-file, at most 4 MB. Pages get a Content-Security-Policy of 'self' only.
 *   - Reads the agent's cards, memory, Louise requests (every keeper's, for the lanterns on the lake) and tool registry
 *     through the kit engine. Writes only what `louise.js ask` writes, when the page asks Louise for something.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const common = require('../engine/common');

const KIT = path.resolve(__dirname, '..');
const BODY_MAX = 16 * 1024;
const STATIC_MAX = 4 * 1024 * 1024;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
};
const PAGE_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
  "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; sandbox";

function send(res, status, body, headers) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, Object.assign({
    'Content-Length': buf.length, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
  }, headers));
  res.end(res.req.method === 'HEAD' ? undefined : buf);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });

/** Where this computer is, for the realm's live sky: kit/realm.config.json, { "lat": 35.5, "lon": -97.5 }, or {}. */
function realmPlace() {
  let p = {};
  try { p = common.readJson(path.join(KIT, 'realm.config.json'), null) || {}; } catch (_) { return {}; }
  const lat = Number(p.lat);
  const lon = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return {};
  return { lat, lon };
}
const fail = (res, status, message) => json(res, status, { error: message });

const inside = (base, file) => { const r = path.relative(base, file); return r && !r.startsWith('..') && !path.isAbsolute(r); };

/** A file under `base` named by URL path parts, or null when the parts are not a plain path inside it. */
function within(base, parts) {
  if (!parts.length || parts.some((p) => !p || p.startsWith('.') || /[\\/:\0]/.test(p))) return null;
  const file = path.join(base, ...parts);
  let st;
  try { st = fs.lstatSync(file); } catch (_) { return null; }
  if (!st.isFile() || st.size > STATIC_MAX || !inside(base, file)) return null;
  try { if (!inside(fs.realpathSync(base), fs.realpathSync(file))) return null; } catch (_) { return null; }
  return file;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > BODY_MAX) { done = true; reject(Object.assign(new Error('That is more than I can take in one go.'), { status: 413 })); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks).toString('utf8')); } });
    req.on('error', (e) => { if (!done) { done = true; reject(e); } });
  });
}

function localConfig(agentDir) {
  return common.readJson(path.join(agentDir, 'agent.config.json'), {}) || {};
}

/** The agent's port: `port` in agent.config.json, else probe.port in agent.json; null when neither is a usable port. */
function portOf(agentDir) {
  const manifest = common.readJson(path.join(agentDir, 'agent.json'), {}) || {};
  const port = Number(localConfig(agentDir).port || (manifest.probe && manifest.probe.port));
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : null;
}

/**
 * The park's three rooms, for the Kindlemere page's ways in (owner 2026-10-08: one park, three doors): each agent in
 * bundle.json with its name, its place, its address on this computer and, when agent.config.json names one, its
 * tailnet address. An agent whose files can't be read is left out.
 */
function parkRooms() {
  const root = path.join(KIT, '..');
  const bundle = common.readJson(path.join(root, 'bundle.json'), {}) || {};
  const rooms = [];
  for (const b of bundle.agents || []) {
    if (!b || !/^[a-z][a-z-]{0,30}$/.test(String(b.key || ''))) continue;
    const dir = path.join(root, 'agents', b.key);
    try {
      const m = common.readJson(path.join(dir, 'agent.json'), {}) || {};
      const port = portOf(dir);
      let phone = null;
      try {
        const u = new URL(String(localConfig(dir).phone || ''));
        if (u.protocol === 'https:' || u.protocol === 'http:') phone = `${u.origin}/`;
      } catch (_) { /* no phone address */ }
      rooms.push({ key: b.key, name: m.name || b.key, place: b.place || null, local: port ? `http://127.0.0.1:${port}/` : null, phone });
    } catch (_) { /* unreadable: left out */ }
  }
  return rooms;
}

function createShell(opts) {
  const o = opts || {};
  const agentDir = path.resolve(o.agentDir);
  const key = path.basename(agentDir);
  common.agentDir(key);
  const engine = {
    shelf: require('../engine/shelf'), memory: require('../engine/memory'),
    louise: require('../engine/louise'), toolsmith: require('../engine/toolsmith'), lanterns: require('../engine/lanterns'),
  };
  const token = o.token || crypto.randomBytes(24).toString('hex');
  const hosts = new Set(['127.0.0.1', 'localhost']);
  const phone = o.phoneHost || localConfig(agentDir).phone;
  if (phone) { try { hosts.add(new URL(phone).hostname.toLowerCase()); } catch (_) { hosts.add(String(phone).toLowerCase()); } }
  const dirs = {
    public: path.join(agentDir, 'dashboard', 'public'), art: path.join(agentDir, 'art'), brand: path.join(agentDir, 'brand'),
    kit: path.join(KIT, 'dashboard', 'public'), design: path.join(KIT, 'design'), kitArt: path.join(KIT, 'art'),
  };
  const manifest = () => common.readJson(path.join(agentDir, 'agent.json'), {}) || {};

  const kitRoutes = {
    'GET /api/agent': () => manifest(),
    'GET /api/shelf': (ctx) => {
      const q = String(ctx.query.get('q') || '').trim();
      const cards = q ? engine.shelf.find(key, q)
        : engine.shelf.all(key).filter((c) => !c.refused).map((c) => ({ file: c.file, title: c.title, sources: c.sources, facts: c.facts }));
      return { cards };
    },
    'GET /api/memory': () => engine.memory.recall(key),
    'GET /api/louise': () => ({ requests: engine.louise.requests(key), gaps: engine.louise.gaps(key) }),
    'GET /api/realm': () => realmPlace(),
    // The lanterns on the lake: every keeper's questions out to Louise, and a new one sent from the lake.
    'GET /api/lanterns': () => engine.lanterns.list(),
    'POST /api/lantern': (ctx) => engine.lanterns.send(ctx.body.keeper, ctx.body.question),
    'GET /api/park': () => ({ rooms: parkRooms() }),
    'GET /api/tools': () => {
      const status = new Map(engine.toolsmith.list(key).map((t) => [t.name, t]));
      return { tools: engine.toolsmith.registry(key).tools.map((t) => Object.assign({}, t, { ok: Boolean(status.get(t.name) && status.get(t.name).ok) })) };
    },
    'POST /api/ask-louise': (ctx) => {
      const r = engine.louise.ask(key, ctx.body.topic, ctx.body.framing);
      return { queued: r.queued, message: r.message };
    },
  };
  const extra = o.routes || {};
  for (const k of Object.keys(extra)) {
    if (kitRoutes[k] || /^GET \/api\/card\//.test(k)) throw new Error(`The route ${k} is the kit's own and cannot be replaced.`);
    if (!/^(GET|POST) \/api\/[a-z0-9-]+$/.test(k)) throw new Error(`The route ${k} must look like "GET /api/<name>".`);
  }
  const routes = Object.assign({}, extra, kitRoutes);

  function postRefused(req) {
    if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return 'Send this as JSON (Content-Type: application/json).';
    const site = String(req.headers['sec-fetch-site'] || '');
    if (site && site !== 'same-origin' && site !== 'none') return 'Only my own page can ask me for that.';
    const origin = req.headers.origin;
    if (origin === 'null') return 'Only my own page can ask me for that.';
    if (origin) {
      let h = null;
      try { h = new URL(origin).hostname.toLowerCase(); } catch (_) { /* unreadable: refused below */ }
      if (!h || !hosts.has(h)) return 'Only my own page can ask me for that.';
    }
    return null;
  }

  async function api(req, res, url) {
    const given = String(req.headers['x-kit-token'] || '');
    if (given.length !== token.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
      return fail(res, 403, 'Open me from my own page to ask me that.');
    }
    const cm = /^\/api\/card\/([^/]{1,120})$/.exec(url.pathname);
    if (cm && req.method === 'GET') {
      let name;
      try { name = decodeURIComponent(cm[1]); } catch (_) { return fail(res, 400, 'That card name is not readable.'); }
      const c = engine.shelf.show(key, name);
      if (c.refused) return fail(res, 404, `That card is set aside: ${c.refused}`);
      return json(res, 200, { file: c.file, title: c.title, sources: c.sources, tags: c.tags, body: c.body });
    }
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) {
      const known = Object.keys(routes).some((k) => k.endsWith(` ${url.pathname}`));
      return known ? fail(res, 405, 'That address does not take that kind of request.') : fail(res, 404, 'Not found.');
    }
    let body = {};
    if (req.method === 'POST') {
      const refused = postRefused(req);
      if (refused) return fail(res, 403, refused);
      try { body = JSON.parse(await readBody(req) || '{}'); } catch (e) {
        if (e.status) throw e;
        return fail(res, 400, 'That was not readable JSON.');
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(res, 400, 'Send one JSON object.');
    }
    return json(res, 200, await handler({ agentDir, query: url.searchParams, body }));
  }

  function servePage(res, file) {
    const html = fs.readFileSync(file, 'utf8');
    const meta = `<meta name="kit-token" content="${token}">`;
    const page = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${meta}\n</head>`) : `${meta}\n${html}`;
    send(res, 200, page, { 'Content-Type': TYPES['.html'], 'Content-Security-Policy': PAGE_CSP });
  }

  function serveFile(res, file) {
    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext];
    if (!type) return fail(res, 404, 'Not found.');
    if (ext === '.html') return servePage(res, file);
    // Files are checked, not re-sent: a page that loads the realm's scene twice (the img, then the live script) gets
    // the second one as a 304.
    const st = fs.statSync(file);
    const etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache', ETag: etag };
    if (ext === '.svg') headers['Content-Security-Policy'] = SVG_CSP;
    if (res.req.headers['if-none-match'] === etag) {
      res.writeHead(304, Object.assign({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }, headers));
      return res.end();
    }
    return send(res, 200, fs.readFileSync(file), headers);
  }

  function statics(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'That address does not take that kind of request.');
    let parts;
    try { parts = url.pathname.split('/').slice(1).map(decodeURIComponent); } catch (_) { return fail(res, 400, 'That address is not readable.'); }
    if (url.pathname === '/') {
      const index = within(dirs.public, ['index.html']);
      if (index) return servePage(res, index);
      const m = manifest();
      return send(res, 200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${String(m.name || key).replace(/[<>&"]/g, '')}</title></head><body><p>My page is not here yet.</p></body></html>`,
        { 'Content-Type': TYPES['.html'], 'Content-Security-Policy': PAGE_CSP });
    }
    if (url.pathname === '/art.svg' || url.pathname === '/mark.svg') {
      const f = within(agentDir, [url.pathname.slice(1)]);
      return f ? serveFile(res, f) : fail(res, 404, 'Not found.');
    }
    const [first, second, ...rest] = parts;
    let file = null;
    if (first === 'kit') {
      if (second === 'design') file = within(dirs.design, rest);
      else if (second === 'art') file = within(dirs.kitArt, rest);
      else file = within(dirs.kit, [second, ...rest].filter((x) => x !== undefined));
    } else if (first === 'art') file = within(dirs.art, parts.slice(1));
    else if (first === 'brand') file = within(dirs.brand, parts.slice(1));
    else file = within(dirs.public, parts);
    return file ? serveFile(res, file) : fail(res, 404, 'Not found.');
  }

  const server = http.createServer((req, res) => {
    const host = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
    if (!hosts.has(host)) { send(res, 403, 'unknown host', { 'Content-Type': 'text/plain; charset=utf-8' }); return; }
    let url;
    try { url = new URL(req.url, 'http://127.0.0.1'); } catch (_) { fail(res, 400, 'That address is not readable.'); return; }
    if (url.pathname === '/health') { json(res, 200, { ok: true }); return; }
    const handle = url.pathname.startsWith('/api/') ? api(req, res, url) : Promise.resolve(statics(req, res, url));
    handle.catch((e) => {
      if (res.headersSent) { res.destroy(); return; }
      if (e && e.status) { fail(res, e.status === 2 ? 400 : e.status === 1 ? 404 : e.status, e.message); return; }
      process.stderr.write(`${new Date().toISOString()} ${req.method} ${url.pathname}: ${(e && e.stack) || e}\n`);
      fail(res, 500, 'Something went wrong on my end. Try again in a moment.');
    });
  });
  server.token = token;
  return server;
}

function start(opts) {
  const o = opts || {};
  const agentDir = path.resolve(o.agentDir);
  const manifest = common.readJson(path.join(agentDir, 'agent.json'), {}) || {};
  const port = portOf(agentDir);
  const name = manifest.name || path.basename(agentDir);
  if (!port) {
    process.stderr.write(`${name} has no port: set probe.port in agent.json.\n`);
    process.exit(2);
  }
  const server = createShell(o);
  const pidFile = path.join(agentDir, 'dashboard', '.pid');
  const clearPid = () => {
    try { if (fs.readFileSync(pidFile, 'utf8').trim() === String(process.pid)) fs.rmSync(pidFile, { force: true }); } catch (_) { /* not ours, or gone */ }
  };
  server.on('error', (e) => {
    process.stderr.write(e.code === 'EADDRINUSE'
      ? `Port ${port} is already in use, so ${name}'s dashboard did not start. Set "port" in agent.config.json.\n`
      : `${e.message}\n`);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    fs.writeFileSync(pidFile, String(process.pid), 'utf8');
    process.stdout.write(`${name} is on http://127.0.0.1:${port}/\n`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { clearPid(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1000).unref(); });
  process.on('exit', clearPid);
  return server;
}

module.exports = { createShell, start, portOf };
