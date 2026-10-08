'use strict';

/**
 * progress-log: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Logs lifts, runs and strength workouts and says what the next step can be, using the 2 to 10 percent load rule, the 110 percent single-run rule and the 2-days-a-week strength guideline.
 * Inputs: kind, exercise, load, reps, target, minutes, date, summary
 * Cards: progression.md, running.md, activity-dose.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/fitness/tools/progress-log.js --kind <kind> --exercise <exercise> --load <load> --reps <reps> --target <target> --minutes <minutes> --date <date>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  const rests = [];
  const lean = (file, needle) => {
    const f = ctx.card(file).facts.find((x) => x.text.includes(needle));
    if (!f) throw Object.assign(new Error(`My card ${file} no longer says "${needle}", so I stopped rather than guess.`), { status: 2 });
    rests.push({ card: file, fact: f.text.replace(/\s*\[\^\d+\]/g, '').replace(/\s*@\S+/g, '').trim(), sources: f.sources.map((s) => `${s.page}:${s.line}`) });
  };
  const a = ctx.args;
  const log = JSON.parse(ctx.state.read('log.json') || '{"entries":[]}');
  const day = (a.date && a.date !== true ? String(a.date) : new Date().toISOString().slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Object.assign(new Error('Give the date as YYYY-MM-DD.'), { status: 2 });
  const num = (v, what) => {
    const n = Number(v);
    if (v === undefined || v === true || !Number.isFinite(n) || n <= 0) throw Object.assign(new Error(`Tell me the ${what} as a number above 0.`), { status: 2 });
    return n;
  };
  const daysBetween = (x, y) => Math.round((Date.parse(y) - Date.parse(x)) / 86400000);
  const out = [];

  if (a.kind === 'lift') {
    const exercise = String(a.exercise || '').toLowerCase().trim();
    if (!exercise || exercise === 'true') throw Object.assign(new Error('Which exercise? Use --exercise squat, for example.'), { status: 2 });
    const entry = { day, kind: 'lift', exercise, load: num(a.load, 'load'), reps: num(a.reps, 'reps'), target: num(a.target, 'target reps') };
    log.entries.push(entry);
    lean('progression.md', 'increase load by 2 to 10%');
    const same = log.entries.filter((e) => e.kind === 'lift' && e.exercise === exercise).slice(-2);
    out.push(`Logged ${exercise}: ${entry.load} for ${entry.reps} reps (target ${entry.target}).`);
    const beat = same.length === 2 && same.every((e) => e.reps >= e.target + 1 && e.load === entry.load);
    if (beat) {
      const lo = Math.round(entry.load * 1.02 * 10) / 10;
      const hi = Math.round(entry.load * 1.10 * 10) / 10;
      out.push(`Two sessions in a row past your target. Next time you can add 2 to 10%: about ${lo} to ${hi}.`);
    } else {
      out.push('Stay at this load until you beat the target by a rep or two on two sessions in a row.');
    }
    const prev = log.entries.filter((e) => e.kind === 'lift' && e !== entry).map((e) => e.day).sort().pop();
    if (prev && daysBetween(prev, day) >= 7) {
      lean('progression.md', 'Detraining: maximal force does not drop measurably in under 7 days');
      const gap = daysBetween(prev, day);
      out.push(gap <= 21 ? `It's been ${gap} days since your last lift. Strength holds up well for about the first 3 weeks off.` : `It's been ${gap} days since your last lift. Past about 3 weeks off, the drop in strength becomes real.`);
    }
  } else if (a.kind === 'run') {
    const entry = { day, kind: 'run', minutes: num(a.minutes, 'minutes of your longest continuous run today') };
    lean('running.md', 'Overuse injury rose when a single session exceeded 110%');
    lean('running.md', 'keep any single run within about 10%');
    const month = log.entries.filter((e) => e.kind === 'run' && daysBetween(e.day, day) > 0 && daysBetween(e.day, day) <= 30);
    const longest = month.reduce((m, e) => Math.max(m, e.minutes), 0);
    log.entries.push(entry);
    out.push(`Logged a ${entry.minutes}-minute run.`);
    if (longest) {
      const line = Math.round(longest * 1.1);
      const cap = Math.round(Math.max(longest, entry.minutes) * 1.1);
      out.push(entry.minutes > line
        ? `That run was more than 110% of your longest in the 30 days before it (${longest} min). That's where injury risk rose in the study. From here, keep each run within about 10% of your longest: up to about ${cap} min.`
        : `That's inside the 110% line (your longest in the 30 days before was ${longest} min). Your next run can go up to about ${cap} min.`);
    } else {
      out.push('This is your first run in the log for the last 30 days. Build from here, about 10% at a time per run.');
    }
  } else if (a.kind === 'workout') {
    // A whole strength workout, counted against the guideline of muscle-strengthening on 2 or more days a week.
    lean('activity-dose.md', 'muscle-strengthening on at least 2 days a week');
    log.entries.push({ day, kind: 'workout' });
    const week = new Set(log.entries.filter((e) => e.kind === 'workout' && daysBetween(e.day, day) >= 0 && daysBetween(e.day, day) < 7).map((e) => e.day)).size;
    out.push(`Logged a strength workout. That's ${week} strength ${week === 1 ? 'day' : 'days'} in the last 7.`);
    out.push(week >= 2 ? 'That meets the guideline of strength work on 2 or more days a week.' : 'One more strength day this week meets the guideline of 2 or more.');
  } else if (a.summary) {
    // Counts for the page to notice progress. Numbers only, read from this tool's own log.
    const today = new Date().toISOString().slice(0, 10);
    const ago = (e) => daysBetween(e.day, today);
    const runs = log.entries.filter((e) => e.kind === 'run');
    const month = runs.filter((e) => ago(e) >= 0 && ago(e) <= 30);
    return {
      sessions7: new Set(log.entries.filter((e) => ago(e) >= 0 && ago(e) < 7).map((e) => `${e.day} ${e.kind}`)).size,
      workouts7: new Set(log.entries.filter((e) => e.kind === 'workout' && ago(e) >= 0 && ago(e) < 7).map((e) => e.day)).size,
      runs30: month.length,
      longestRun30: month.reduce((m, e) => Math.max(m, e.minutes), 0),
    };
  } else if (a.show) {
    if (!log.entries.length) return 'Nothing logged yet. Log a lift or a run first.';
    return ['Your log, newest last:', ...log.entries.slice().sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : 0)).slice(-20).map((e) => (e.kind === 'run' ? `${e.day}  run ${e.minutes} min` : e.kind === 'workout' ? `${e.day}  strength workout` : `${e.day}  ${e.exercise} ${e.load} x ${e.reps} (target ${e.target})`))].join('\n');
  } else {
    throw Object.assign(new Error('Use --kind lift (with --exercise, --load, --reps, --target), --kind run (with --minutes), --kind workout, --summary or --show.'), { status: 2 });
  }

  ctx.state.write('log.json', log);
  return [...out, '', 'It rests on these cards:', ...rests.map((r) => `- ${r.fact}  (${r.card}; ${r.sources.join(', ')})`)].join('\n');
});
