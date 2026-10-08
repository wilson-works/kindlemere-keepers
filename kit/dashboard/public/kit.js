'use strict';

/**
 * /kit/kit.js — the shared page script (kit/CONTRACT.md, section 10). Load it before the agent's own script.
 *
 *   kit.api(path, { method, body })   the parsed JSON answer; throws an Error with .status and the server's sentence
 *   kit.agent()                       /api/agent, fetched once
 */
(function () {
  const meta = document.querySelector('meta[name="kit-token"]');
  const token = meta ? meta.getAttribute('content') : '';
  let agentPromise = null;

  async function api(path, opts) {
    const o = opts || {};
    const init = { method: o.method || 'GET', headers: { 'X-Kit-Token': token }, credentials: 'same-origin' };
    if (o.body !== undefined) {
      init.method = o.method || 'POST';
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(o.body);
    }
    const res = await fetch(path, init);
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    if (!res.ok) {
      const err = new Error((data && data.error) || `That did not work (${res.status}).`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function agent() {
    if (!agentPromise) agentPromise = api('/api/agent');
    return agentPromise;
  }

  window.kit = Object.freeze({ api, agent });

  // A page that shows the realm's scene gets its live sky (/kit/kindlemere.js).
  if (document.querySelector('img[src^="/kit/art/kindlemere"]')) {
    const s = document.createElement('script');
    s.src = '/kit/kindlemere.js';
    document.head.appendChild(s);
  }
}());
