'use strict';

/**
 * session-log: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Logs a training session for a remembered dog and says what the cards say about its pattern
 * Inputs: dog, skill, reps, hits, minutes, changed, note
 * Cards: sessions-and-criteria.md, pain-first.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/dog-training/tools/session-log.js --dog <dog> --skill <skill> --reps <reps> --hits <hits> --minutes <minutes> --changed <changed> --note <note>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  // Log a training session for a remembered dog, or show its log. Kept in this tool's own state, one file per dog.
  const name = String(ctx.args._[0] || ctx.args.dog || '').trim();
  if (!name) return 'Which dog? Give its name first: session-log <dog> --skill "<skill>" --reps <n> --hits <n>.';
  const file = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dog'}.json`;
  const log = JSON.parse(ctx.state.read(file) || '{"sessions":[]}');

  const cardCache = {};
  const used = new Set();
  const from = (card, ...words) => {
    const c = cardCache[card] || (cardCache[card] = ctx.card(card));
    const f = c.facts.find((x) => words.every((w) => x.text.toLowerCase().includes(w.toLowerCase())));
    if (!f) return null;
    used.add(card);
    return { says: f.text.replace(/\s*@\S+/g, '').trim(), card, sources: f.sources.map((s) => `${s.page}:${s.line}`) };
  };

  const a = ctx.args;
  let logged = null;
  if (a.skill) {
    const reps = Number(a.reps);
    const hits = Number(a.hits);
    if (!(reps > 0) || !(hits >= 0) || hits > reps) return 'Give --reps (how many tries) and --hits (how many went right), with hits no more than reps.';
    logged = {
      at: new Date().toISOString(),
      skill: String(a.skill).trim().toLowerCase(),
      reps,
      hits,
      minutes: Number(a.minutes) > 0 ? Number(a.minutes) : null,
      changed: a.changed && a.changed !== true ? String(a.changed).split(',').map((s) => s.trim()).filter(Boolean) : [],
      note: a.note && a.note !== true ? String(a.note) : null,
    };
    log.sessions.push(logged);
    ctx.state.write(file, log);
  }

  const s = log.sessions;
  if (!s.length) return `No sessions logged for ${name} yet.`;
  // The day on this computer's clock (Central on HQ), not the UTC date.
  const day = (x) => { const d = new Date(x.at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const now = Date.now();
  const lastWeek = s.filter((x) => now - Date.parse(x.at) < 7 * 864e5);
  const bySkill = {};
  for (const x of s) (bySkill[x.skill] = bySkill[x.skill] || []).push(x);
  const skills = Object.entries(bySkill).map(([skill, xs]) => {
    const rates = xs.map((x) => Math.round((100 * x.hits) / x.reps));
    return { skill, sessions: xs.length, last: `${rates[rates.length - 1]}%`, earlier_average: xs.length > 1 ? `${Math.round(rates.slice(0, -1).reduce((p, q) => p + q, 0) / (xs.length - 1))}%` : null };
  });

  // What the cards say about what the log shows.
  const notes = [];
  const today = s.filter((x) => day(x) === day(s[s.length - 1]));
  if (today.length >= 3) notes.push(from('sessions-and-criteria.md', 'Three back-to-back'));
  notes.push(from('sessions-and-criteria.md', 'The rule I give'));
  if (logged && logged.changed.length > 1) notes.push(from('sessions-and-criteria.md', 'one thing at a time'));
  const fall = skills.find((k) => k.earlier_average && parseInt(k.last, 10) * 2 <= parseInt(k.earlier_average, 10));
  if (fall) {
    notes.push({ says: `${fall.skill} fell to ${fall.last} from an average of ${fall.earlier_average}.`, card: null, sources: [] });
    // An adolescent dog's dip is expected and passing; an adult's sudden fall is a vet question first.
    const ageFact = ctx.recall().facts.find((f) => (f.about || '').toLowerCase() === `dog:${name.toLowerCase()}:age`);
    const a = /(\d+(?:\.\d+)?)\s*(week|wk|month|mo|year|yr)/i.exec(ageFact ? ageFact.text : '');
    const months = a ? Number(a[1]) * (/^w/i.test(a[2]) ? 12 / 52 : /^y/i.test(a[2]) ? 12 : 1) : null;
    if (months !== null && months >= 6 && months <= 18) notes.push(from('sessions-and-criteria.md', 'adolescent dip'));
    notes.push(from('sessions-and-criteria.md', 'suddenly falls apart'));
    notes.push(from('pain-first.md', 'new, escalating'));
  }

  return {
    dog: name,
    logged: logged ? `${logged.skill}: ${logged.hits} of ${logged.reps}` : null,
    sessions_logged: s.length,
    sessions_in_the_last_7_days: lastWeek.length,
    skills,
    notes: notes.filter(Boolean),
    cards: [...used].sort(),
  };
});
