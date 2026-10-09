'use strict';

/**
 * /kit/kindlemere-lanterns.js: the lanterns on Kindlemere's lake (owner, 2026-10-09: "allow the lanterns to be clicked
 * to read of any research going out to Louise, or let the user add one here"). /kit/kit.js loads it before
 * /kit/kindlemere.js on a page with the scene; without the page's kit token it does nothing and the lanterns stay drawn.
 *
 * Each lit lantern is one question a keeper has out to Louise (GET /api/lanterns, the oldest nearest the dock); the
 * other posts stand dark. Every lantern is a button. Its card, over the water, says the question, which keeper sent it,
 * when (Central time), and where it is: on Louise's list, being researched, or answered (her book, and the card the
 * keeper learned from it). More questions than posts: each card lists the rest as "+N more". The lantern waiting at the
 * dock sends a new one (POST /api/lantern): the question and which keeper it is for, then the new lantern floats out to
 * its post. When Louise is not on this computer the card says so and offers the keeper's room, where the keeper looks
 * it up on the web. Escape, a click outside the card or Close shuts it. Reduced motion: the lantern just appears.
 */
(function () {
  if (!window.kit || !document.querySelector('meta[name="kit-token"]')) return;
  const POSTS = 6;
  const MORE_SHOWN = 10;
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STATE = { waiting: ["On Louise's list", '#C9822B'], researching: ['Being researched', '#1F5C6E'], answered: ['Answered', '#6F8A34'] };
  const CARD = 'position:absolute;z-index:5;width:min(300px,calc(100% - 24px));margin:0;padding:14px 16px;border:1px solid rgba(26,36,51,0.18);' +
    'border-radius:16px;background:#FFFFFF;color:#1A2433;box-shadow:0 6px 18px rgba(26,36,51,0.22);font:400 14px/1.4 system-ui,sans-serif;text-align:left';
  const BTN = 'min-height:36px;padding:0 14px;border-radius:999px;border:1px solid rgba(26,36,51,0.25);background:#F4EFE3;color:#1A2433;' +
    'font:700 13px/1.2 ui-rounded,Candara,"Gill Sans","Segoe UI",sans-serif;cursor:pointer';
  const FIELD = 'display:block;box-sizing:border-box;width:100%;margin:4px 0 10px;padding:8px;border:1px solid rgba(26,36,51,0.3);border-radius:10px;font:inherit;color:inherit;background:#FFFFFF';
  const scenes = [];
  let data = { louise: false, lanterns: [] };
  let open = null;

  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'text') e.textContent = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v);
    }
    (kids || []).forEach((c) => { if (c) e.appendChild(c); });
    return e;
  }
  const button = (text, fn, type) => { const b = el('button', { type: type || 'button', style: BTN, text }); if (fn) b.addEventListener('click', fn); return b; };

  /** Every time a person reads is Central: "Oct 9, 02:10 CDT". */
  function when(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.valueOf())) return '';
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).formatToParts(d);
    const v = (t) => (p.find((x) => x.type === t) || {}).value || '';
    return `${v('month')} ${v('day')}, ${v('hour')}:${v('minute')} ${v('timeZoneName')}`;
  }

  function close() {
    if (!open) return;
    const { card, back } = open;
    open = null;
    if (card.open) card.close();
    card.remove();
    if (back && back.focus && document.contains(back) && !back.hasAttribute('data-km-off')) back.focus({ preventScroll: true });
  }

  /** The card over the water, above what was pressed (below it when there is no room above). */
  function show(root, at, card, back, focus) {
    close();
    card.style.cssText = CARD;
    card.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
    root.appendChild(card);
    card.show();
    const r = root.getBoundingClientRect();
    const b = at.getBoundingClientRect();
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const left = Math.min(Math.max(b.left + b.width / 2 - r.left - w / 2, 8), Math.max(8, r.width - w - 8));
    const above = b.top - r.top - h - 8;
    card.style.left = `${left}px`;
    card.style.top = `${above >= 8 ? above : Math.min(b.bottom - r.top + 8, Math.max(8, r.height - h - 8))}px`;
    open = { card, back };
    (focus || card.querySelector('button')).focus({ preventScroll: true });
  }

  function more(skip) {
    const rest = data.lanterns.slice(POSTS);
    if (!rest.length) return null;
    const ul = el('ul', { style: 'margin:4px 0 10px;padding-left:18px;max-height:120px;overflow:auto' });
    rest.slice(0, MORE_SHOWN).forEach((l) => { if (l !== skip) ul.appendChild(el('li', { text: `${l.name}: ${l.topic}` })); });
    const left = rest.length - MORE_SHOWN;
    return el('div', {}, [el('p', { style: 'margin:8px 0 0;font-weight:700', text: `+${rest.length} more out to Louise` }), ul,
      left > 0 ? el('p', { style: 'margin:0 0 10px;color:#4A5563', text: `and ${left} more on her list.` }) : null]);
  }

  function lanternCard(root, i, back) {
    const l = data.lanterns[i];
    const card = el('dialog', { class: 'km-lantern-card', 'aria-label': l ? `A question out to Louise, from ${l.name}` : 'A lantern with no question on it' });
    if (l) {
      const [label, dot] = STATE[l.state] || STATE.waiting;
      const note = l.state === 'answered'
        ? `Back from Louise${l.book ? `, in her book ${l.book}` : ''}. ${l.name} learned it as the card ${l.card || 'from her book'}.`
        : l.state === 'researching' ? 'A research run of hers has it now.'
          : data.louise ? 'It waits on her list for her next research run.' : "Louise isn't on this computer, so it waits until she is.";
      card.append(
        el('p', { style: 'margin:0 0 6px;font:700 16px/1.3 ui-rounded,Candara,"Gill Sans","Segoe UI",sans-serif', text: `"${l.topic}"` }),
        el('p', { style: 'margin:0 0 6px;color:#4A5563', text: `From ${l.name}${l.asked ? `, sent ${when(l.asked)}` : ''}` }),
        el('p', { style: 'margin:0 0 6px;font:600 12px/1.3 ui-monospace,Consolas,monospace;letter-spacing:0.04em;text-transform:uppercase' }, [
          el('span', { 'aria-hidden': 'true', style: `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${dot}` }),
          el('span', { text: label })]),
        el('p', { style: 'margin:0 0 10px', text: note }));
    } else {
      card.append(el('p', { style: 'margin:0 0 10px', text: 'No question on this lantern. Every lit lantern on the water is a question a keeper has out to Louise.' }));
    }
    card.append(more(l) || '', el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      button('Send a lantern', () => sendForm(root, root.querySelector('[data-km-part="lantern-send"]') || back, back)), button('Close', close)]));
    show(root, back, card, back);
  }

  async function sendForm(root, at, back) {
    const rooms = (await window.kit.park()).filter((r) => r && r.key);
    const here = document.body && document.body.getAttribute('data-agent');
    const card = el('dialog', { class: 'km-lantern-card', 'aria-label': 'Send a lantern to Louise' });
    const q = el('textarea', { id: 'km-lantern-q', maxlength: '200', rows: '3', required: '', style: FIELD });
    const who = el('select', { id: 'km-lantern-who', required: '', style: FIELD });
    rooms.forEach((r) => { const o = el('option', { value: r.key, text: r.name }); if (r.key === here) o.selected = true; who.appendChild(o); });
    const said = el('p', { role: 'status', style: 'margin:0 0 10px;min-height:1em' });
    const go = button('Send the lantern', null, 'submit');
    const form = el('form', {}, [
      el('p', { style: 'margin:0 0 8px;font:700 16px/1.3 ui-rounded,Candara,"Gill Sans","Segoe UI",sans-serif', text: 'A lantern for Louise' }),
      el('label', { for: 'km-lantern-q', text: 'Your question for her' }), q,
      el('label', { for: 'km-lantern-who', text: 'Which keeper it is for' }), who, said,
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [go, button('Not now', close)])]);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      go.disabled = true;
      said.textContent = 'Sending...';
      try {
        const r = await window.kit.api('/api/lantern', { body: { keeper: who.value, question: q.value } });
        if (!r.louise) {
          said.textContent = r.message;
          const to = await window.kit.address(r.keeper).catch(() => null);
          const name = who.options[who.selectedIndex] ? who.options[who.selectedIndex].text : 'the keeper';
          if (to) {
            const web = button(`Ask ${name} on the web`, () => (window.kindlemere && window.kindlemere.go ? window.kindlemere.go(to, r.keeper) : location.assign(to)));
            go.replaceWith(web);
            web.focus();
          }
          return;
        }
        said.textContent = r.message;
        await refresh();
        const i = data.lanterns.length - 1;
        close();
        if (i < POSTS) {
          await float(root, i);
          lanternCard(root, i, root.querySelector(`[data-km-part="lantern-${i}"]`));
        } else lanternCard(root, POSTS - 1, root.querySelector(`[data-km-part="lantern-${POSTS - 1}"]`));
      } catch (err) {
        said.textContent = err.message;
        go.disabled = false;
      }
    });
    card.append(form);
    show(root, at, card, back, q);
  }

  /** The new lantern drifts from the dock out to its post. */
  function float(root, i) {
    const to = root.querySelector(`[data-km-part="lantern-${i}"]`);
    const from = root.querySelector('[data-km-part="lantern-send"]');
    const m = to && to.parentNode && to.parentNode.getScreenCTM && to.parentNode.getScreenCTM();
    if (still || !from || !m || !to.animate) return Promise.resolve();
    const inv = m.inverse();
    const at = (n) => { const b = n.getBoundingClientRect(); return new DOMPoint(b.left + b.width / 2, b.top + b.height / 2).matrixTransform(inv); };
    const a = at(from);
    const z = at(to);
    return to.animate([{ transform: `translate(${a.x - z.x}px, ${a.y - z.y}px)`, opacity: 0.7 }, { transform: 'translate(0px, 0px)', opacity: 1 }],
      { duration: 2600, easing: 'cubic-bezier(.3,.1,.3,1)' }).finished.catch(() => {});
  }

  function light(root) {
    const n = Math.min(POSTS, data.lanterns.length);
    for (let i = 0; i < POSTS; i += 1) {
      root.querySelectorAll(`[data-km-part="lantern-${i}"], [data-km-glow="lantern-${i}"]`).forEach((e) => e.setAttribute('data-km-lantern', i < n ? 'on' : 'off'));
      const b = root.querySelector(`[data-km-part="lantern-${i}"]`);
      if (b) b.setAttribute('aria-label', i < n ? `Lantern: ${data.lanterns[i].name} asks Louise "${data.lanterns[i].topic}"` : 'A lantern with no question on it');
    }
  }

  async function refresh() {
    try { data = await window.kit.api('/api/lanterns'); } catch (_) { return; }
    if (!data || !Array.isArray(data.lanterns)) data = { louise: false, lanterns: [] };
    scenes.forEach(light);
  }

  document.addEventListener('pointerdown', (e) => { if (open && !(e.target instanceof Node && open.card.contains(e.target))) close(); }, true);
  window.addEventListener('kindlemere:ready', (e) => {
    const root = e.detail && e.detail.scene;
    if (!root || !root.querySelector('[data-km-part^="lantern-"]')) return;
    scenes.push(root);
    const rr = root.getBoundingClientRect();
    root.querySelectorAll('[data-km-part^="lantern-"]').forEach((b) => {
      // the lanterns' layer is drawn for the eye only; the lanterns in it are buttons
      const layer = b.closest('svg');
      if (layer && layer.getAttribute('aria-hidden') === 'true') {
        layer.removeAttribute('aria-hidden');
        layer.querySelectorAll('text').forEach((t) => { if (!t.closest('[role]')) t.setAttribute('aria-hidden', 'true'); });
      }
      const key = b.getAttribute('data-km-part').slice(8);
      b.setAttribute('role', 'button');
      if (key === 'send') b.setAttribute('aria-label', 'Send a lantern to Louise');
      b.style.cursor = 'pointer';
      const bb = b.getBoundingClientRect();
      if (bb.right > rr.left && bb.left < rr.right && bb.bottom > rr.top && bb.top < rr.bottom) b.setAttribute('tabindex', '0');
      else { b.setAttribute('data-km-off', ''); b.setAttribute('aria-hidden', 'true'); b.setAttribute('tabindex', '-1'); }
      const use = () => (key === 'send' ? sendForm(root, b, b) : lanternCard(root, Number(key), b));
      b.addEventListener('click', use);
      b.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); use(); } });
    });
    if (scenes.length === 1) {
      refresh();
      setInterval(refresh, 120000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    } else light(root);
  });
}());
