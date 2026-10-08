'use strict';

/**
 * Avo's own dashboard routes (kit/CONTRACT.md section 10: an agent may pass routes to the shell).
 * They read the weeks her meal-week tool keeps in state/tools/meal-week/ (this computer only) and write only the
 * meal ticks and new links there. Node built-ins only.
 *
 *   GET  /api/table                   today's meals, this week at a glance, and the weeks she has kept
 *   GET  /api/week?k=<link>           one week's full plan, while its link is open
 *   POST /api/meal-check {week, day, slot, mark}   mark is eaten, swapped or clear
 *   POST /api/week-link {week}        a new link for a kept week (open 7 days)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
const LINK_RE = /^[A-Za-z0-9]{22}$/;

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const bad = (message, status) => Object.assign(new Error(message), { status: status || 400 });

module.exports = function routes(agentDir) {
  const dir = path.join(agentDir, 'state', 'tools', 'meal-week');
  const read = (name, dflt) => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch (_) { return dflt; }
  };
  const write = (name, value) => {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(`${file}.tmp`, file);
  };
  const week = (id) => (WEEK_RE.test(String(id || '')) ? read(`week-${id}.json`, null) : null);
  const checks = (id) => {
    const c = read(`week-${id}.checks.json`, {});
    return { done: c.done || {}, swapped: c.swapped || {} };
  };
  const openLink = (links, id, today) => links.filter((l) => l.week === id && l.expires >= today).pop() || null;

  return {
    'GET /api/table': () => {
      const now = new Date();
      const today = iso(now);
      const thisId = iso(mondayOf(now));
      const nextId = iso(addDays(mondayOf(now), 7));
      const links = read('links.json', { links: [] }).links;
      const ids = [...new Set(links.map((l) => l.week))].sort().reverse();
      const current = week(thisId);
      const dayKey = DAYS[(now.getDay() + 6) % 7];
      const summary = (id) => {
        const w = week(id);
        if (!w) return null;
        const l = openLink(links, id, today);
        return {
          id, link: l ? l.k : null, expires: l ? l.expires : null,
          meals: w.days.reduce((n, d) => n + d.slots.length, 0),
          stores: (w.grocery || []).map((g) => ({ store: g.store, items: g.items.length })),
          days: w.days.map((d) => ({ key: d.key, name: d.name, date: d.date, slots: d.slots })),
        };
      };
      return {
        today, dayKey,
        todayMeals: current ? (current.days.find((d) => d.key === dayKey) || { slots: [] }).slots : [],
        checks: current ? checks(thisId) : { done: {}, swapped: {} },
        thisWeek: summary(thisId),
        nextWeek: summary(nextId),
        kept: ids.map((id) => {
          const l = openLink(links, id, today);
          const w = week(id);
          return { id, link: l ? l.k : null, expires: l ? l.expires : null, meals: w ? w.days.reduce((n, d) => n + d.slots.length, 0) : 0 };
        }),
      };
    },

    'GET /api/week': (ctx) => {
      const k = String(ctx.query.get('k') || '');
      if (!LINK_RE.test(k)) throw bad('That link is not one of mine.', 404);
      const today = iso(new Date());
      const link = read('links.json', { links: [] }).links.find((l) => l.k === k);
      if (!link) throw bad('That link is not one of mine.', 404);
      if (link.expires < today) return { closed: true, week: link.week, expires: link.expires };
      const w = week(link.week);
      if (!w) throw bad('I can not find that week any more.', 404);
      return { week: w, checks: checks(link.week), expires: link.expires };
    },

    'POST /api/meal-check': (ctx) => {
      const b = ctx.body || {};
      const id = String(b.week || '');
      if (!week(id)) throw bad('That week is not on my table.');
      if (!DAYS.includes(b.day) || !SLOTS.includes(b.slot)) throw bad('Tell me the day and the meal.');
      if (!['eaten', 'swapped', 'clear'].includes(b.mark)) throw bad('Mark a meal eaten, swapped or clear.');
      const c = checks(id);
      const key = `${b.day}.${b.slot}`;
      delete c.done[key];
      delete c.swapped[key];
      if (b.mark === 'eaten') c.done[key] = new Date().toISOString();
      if (b.mark === 'swapped') c.swapped[key] = new Date().toISOString();
      write(`week-${id}.checks.json`, c);
      return { ok: true, mark: b.mark };
    },

    'POST /api/week-link': (ctx) => {
      const id = String((ctx.body || {}).week || '');
      if (!week(id)) throw bad('That week is not on my table.');
      const data = read('links.json', { links: [] });
      const k = crypto.randomBytes(16).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 22).padEnd(22, 'x');
      const expires = iso(addDays(new Date(), 7));
      data.links.push({ k, week: id, created: new Date().toISOString(), expires });
      write('links.json', data);
      return { k, expires };
    },
  };
};
