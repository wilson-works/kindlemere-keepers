'use strict';

/**
 * /kit/kit.js — the shared page script (kit/CONTRACT.md, section 10). Load it before the agent's own script.
 *
 *   kit.api(path, { method, body })   the parsed JSON answer; throws an Error with .status and the server's sentence
 *   kit.agent()                       /api/agent, fetched once
 *   kit.park()                        the park's rooms, /api/park, fetched once
 *   kit.address(place)                a place's address from here: 'realm' (the Kindlemere page), or an agent's key
 *                                     (its room on this computer, or its tailnet address when this page came from there)
 */
(function () {
  const meta = document.querySelector('meta[name="kit-token"]');
  const token = meta ? meta.getAttribute('content') : '';
  let agentPromise = null;
  let parkPromise = null;

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

  function park() {
    if (!parkPromise) parkPromise = (token ? api('/api/park') : Promise.resolve({})).then((p) => (p && Array.isArray(p.rooms) ? p.rooms : [])).catch(() => []);
    return parkPromise;
  }

  const local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  async function address(place) {
    if (place === 'realm') return '/kit/kindlemere.html';
    const room = (await park()).find((r) => r.key === place);
    return room ? (local ? room.local : room.phone) || null : null;
  }

  window.kit = Object.freeze({ api, agent, park, address });

  // A busy room keeps the realm's keepers at home: window.kindlemere.hold(true) while its work runs, then hold(false).
  window.kindlemere = { held: false, hold(on) { this.held = Boolean(on); window.dispatchEvent(new Event('kindlemere:hold')); } };

  // A room's drawer (a <dialog>: Avo's cookbook, Tumble's books, Steady's pack) closes on a click outside it, on its
  // backdrop, as it does with Escape (owner, 2026-10-09: "clicking out into kindlemere should escape from it").
  document.addEventListener('click', (e) => {
    const d = e.target;
    if (!(d instanceof HTMLDialogElement) || !d.open || (!e.clientX && !e.clientY)) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  });

  // Arriving from another place (window.kindlemere.go): the picture waits under its veil until it is live.
  if (/km-from=/.test(location.hash)) {
    document.documentElement.classList.add('km-arriving');
    setTimeout(() => document.documentElement.classList.remove('km-arriving'), 2500);
  }

  // A page that shows the realm's scene gets its live sky, its people and its dog: the dog's script first, so the
  // scene can hand it the dog (/kit/kindlemere-dog.js, then /kit/kindlemere.js), and the lanterns on the lake
  // (/kit/kindlemere-lanterns.js).
  if (document.querySelector('img[src^="/kit/art/kindlemere"]')) {
    for (const src of ['/kit/kindlemere-dog.js', '/kit/kindlemere-lanterns.js', '/kit/kindlemere.js']) {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      document.head.appendChild(s);
    }
  }

  // The ways between the places, on every page's bar (owner, 2026-10-08: "Need to be able to navigate between the 3
  // scenes or return to the main full view screen while inside a scene"): the whole park, and the three places.
  const PLACES = [['realm', 'Kindlemere'], ['nutrition', 'Orchard'], ['fitness', 'Hill'], ['dog-training', 'Field']];
  async function ways() {
    const top = document.querySelector('.km-top');
    // pages with the scene: the rooms and the Kindlemere page (not a printed week of meals)
    if (!top || !token || top.querySelector('.km-nav') || !document.querySelector('img[src^="/kit/art/kindlemere"], .km-live')) return;
    const here = (document.body && document.body.getAttribute('data-agent')) || 'realm';
    const nav = document.createElement('nav');
    nav.className = 'km-nav';
    nav.setAttribute('aria-label', 'Places in Kindlemere');
    // Each way is a sign like the signpost's arms, in its place's colour (owner, 2026-10-08: "wayfinding buttons to
    // switch like the signs to each scene"); the page you are on wears a "you are here" pin.
    const links = PLACES.map(([key, label]) => {
      const a = document.createElement('a');
      a.className = 'km-nav-way';
      a.dataset.place = key;
      a.textContent = label;
      if (key === here) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
      return a;
    });
    // Full screen: the scene and nothing else, with zoom and the signpost (kindlemere.js). It shows once the scene is live.
    const full = document.createElement('button');
    full.type = 'button';
    full.className = 'km-nav-full';
    full.title = 'Full screen';
    full.setAttribute('aria-label', 'Full screen');
    const NS = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(NS, 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    const corners = document.createElementNS(NS, 'path');
    corners.setAttribute('d', 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5');
    icon.appendChild(corners);
    full.appendChild(icon);
    full.hidden = !document.querySelector('.km-live');
    full.addEventListener('click', () => { if (window.kindlemere && typeof window.kindlemere.full === 'function') window.kindlemere.full(); });
    window.addEventListener('kindlemere:ready', () => { full.hidden = false; });
    nav.appendChild(full);
    // after the agent's name, before the room's own button
    const own = [...top.children].find((c) => c.matches('button, a.km-btn, a.km-btn-quiet, .km-btn, .km-btn-quiet'));
    if (own) top.insertBefore(nav, own); else top.appendChild(nav);
    for (const a of links) {
      const key = a.dataset.place;
      if (key === here) { a.href = location.pathname; a.addEventListener('click', (e) => e.preventDefault()); continue; }
      const to = await address(key);
      if (!to) { a.setAttribute('aria-disabled', 'true'); a.title = 'Not open from here'; continue; }
      a.href = to;
      a.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (window.kindlemere && typeof window.kindlemere.go === 'function') { e.preventDefault(); window.kindlemere.go(to, key); }
      });
    }
    // The foot, on the shore, carries the places again by their keepers' names, and who made the park.
    const foot = document.querySelector('.km-foot');
    if (!foot || foot.querySelector('.km-foot-nav')) return;
    const NAMES = { realm: 'The whole park', nutrition: "Avo's Orchard", fitness: "Steady's Hill", 'dog-training': "Tumble's Field" };
    const fnav = document.createElement('nav');
    fnav.className = 'km-foot-nav';
    fnav.setAttribute('aria-label', 'Places in Kindlemere, from the shore');
    for (const a of links) {
      if (!a.getAttribute('href')) continue;
      const c = document.createElement('a');
      c.href = a.getAttribute('href');
      c.textContent = NAMES[a.dataset.place];
      if (a.hasAttribute('aria-current')) c.setAttribute('aria-current', 'page');
      fnav.appendChild(c);
    }
    const made = document.createElement('p');
    made.className = 'km-foot-made';
    const ww = document.createElement('a');
    ww.href = 'https://wilsonworks.studio/ai-consulting/agents';
    ww.textContent = 'WilsonWorks';
    made.append('Kindlemere is drawn and built by ', ww, '.');
    foot.append(fnav, made);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ways); else ways();
}());
