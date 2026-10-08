'use strict';

/**
 * week-plan: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Builds one week of training from what the person told the coach (level, goal, days, age), after the screening checks.
 * Inputs: days, goal, level, age
 * Cards: refusal-checklist.md, crisis-line.md, activity-dose.md, fitt-vp.md, strength.md, flexibility-warmup.md, running.md, special-populations.md, exercise-for-mood.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/fitness/tools/week-plan.js --days <days> --goal <goal> --level <level> --age <age>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  const rests = [];
  // Every rule below is a fact on a card. When the card no longer says it, the tool stops instead of guessing.
  const lean = (file, needle) => {
    const f = ctx.card(file).facts.find((x) => x.text.includes(needle));
    if (!f) throw Object.assign(new Error(`My card ${file} no longer says "${needle}", so I stopped rather than guess.`), { status: 2 });
    rests.push({ card: file, fact: f.text.replace(/\s*\[\^\d+\]/g, '').replace(/\s*@\S+/g, '').trim(), sources: f.sources.map((s) => `${s.page}:${s.line}`) });
    return f;
  };

  const mem = ctx.recall();
  const told = mem.facts.map((f) => `${f.about || ''}: ${f.text}`.toLowerCase());
  const said = told.join(' | ');
  const pick = (flag, about) => {
    if (ctx.args[flag] && ctx.args[flag] !== true) return String(ctx.args[flag]).toLowerCase();
    const f = mem.facts.find((x) => (x.about || '').toLowerCase().includes(about));
    return f ? f.text.toLowerCase() : '';
  };

  // 1. Screening first (fitt-vp.md: screen before any prescription).
  lean('fitt-vp.md', 'Screen first');
  const stops = [];
  const flag = (re) => re.test(said);
  if (flag(/suicid|self-harm|hurt myself|harm (myself|someone)|crisis|dissociat/)) stops.push(['crisis-line.md', 'Any mention of suicidal ideation']);
  if (flag(/chest pain|chest pressure|faint|passed out|palpitation|irregular heart|short(ness)? of breath|fever/)) stops.push(['refusal-checklist.md', 'chest pain, fainting']);
  if (flag(/concussion|head injur|hit (my|his|her) head/)) stops.push(['refusal-checklist.md', 'suspected concussion']);
  if (flag(/pregnan/) && !flag(/(provider|midwife|obstetric|doctor|ob)[^|]*(cleared|okay|approved|discussed|said yes|go-ahead)/)) stops.push(['refusal-checklist.md', 'The person is pregnant']);
  if (flag(/uncontrolled (blood pressure|hypertension)|blood pressure[^|]*(200|very high|not controlled)/)) stops.push(['refusal-checklist.md', 'Resting blood pressure is over 200/110']);
  if (flag(/(sprain|swollen|swelling|can.t bear weight|cannot bear weight|new pain|torn|acute injur)/)) stops.push(['refusal-checklist.md', 'An undiagnosed or acute muscle']);
  const level = pick('level', 'level') || pick('level', 'activity');
  const inactive = /inactive|beginner|new|sedentary|not active|none|never/.test(level) || !level;
  if (inactive && flag(/heart (disease|condition|attack)|diabetes|kidney|renal/) && !flag(/cleared|clearance/)) stops.push(['refusal-checklist.md', 'Screening finds known cardiovascular']);
  const ageText = pick('age', 'age');
  const age = Number((ageText.match(/\d{1,3}/) || [])[0]) || null;
  if (age && age < 18) stops.push(['refusal-checklist.md', 'A minor wants strength programming']);

  if (stops.length) {
    stops.forEach(([file, needle]) => lean(file, needle));
    const crisis = stops.some(([file]) => file === 'crisis-line.md');
    if (crisis) lean('crisis-line.md', 'call or text 988');
    ctx.state.write('last-plan.json', { at: new Date().toISOString(), withheld: true, why: stops.map((s) => s[1]) });
    return [
      crisis
        ? `I'm stopping the plan here. What you told me matters more than a workout. In the US you can call or text 988 any time.`
        : `I won't build this week's plan yet. Something you told me needs a clinician's eyes first.`,
      '',
      'What my cards say:',
      ...rests.map((r) => `- ${r.fact}  (${r.card}; ${r.sources.join(', ')})`),
    ].join('\n');
  }

  // 2. The weekly target (activity-dose.md, special-populations.md for 65+).
  lean('activity-dose.md', 'Adults: 150 to 300 minutes');
  const older = age && age >= 65;
  if (older) { lean('special-populations.md', 'Plus balance activities each week'); lean('refusal-checklist.md', 'The person is 65+'); }
  const daysIn = Number(pick('days', 'days').match(/\d/) ? pick('days', 'days').match(/\d/)[0] : 3);
  const days = Math.min(6, Math.max(2, daysIn || 3));
  const goal = pick('goal', 'goal') || 'health';

  // 3. Fill the four components (fitt-vp.md), and keep it moderate for someone inactive (refusal-checklist.md).
  lean('fitt-vp.md', 'applied separately to each of four components');
  if (inactive) lean('refusal-checklist.md', 'was inactive and wants vigorous training');
  lean('strength.md', 'Default for a general adult');
  lean('strength.md', 'A six-pattern template');
  lean('flexibility-warmup.md', 'ACSM 2011: stretches for each major muscle-tendon group');
  lean('flexibility-warmup.md', 'Four phases: Raise, Activate, Mobilise, Potentiate');
  const run5k = /run|5k|jog/.test(goal);
  const muscle = /muscle|size|hypertroph|bigger/.test(goal);
  const calm = /calm|stress|mood|mind/.test(goal);
  if (run5k) { lean('running.md', 'Weeks 1 to 3, frequency first'); lean('running.md', 'no single session exceeds about 110%'); lean('running.md', 'Strength from week 1'); }
  if (muscle) lean('strength.md', 'Hypertrophy volume: about 10 sets');
  if (calm) lean('exercise-for-mood.md', 'Agree a five-minute version');

  const names = { 2: ['Mon', 'Thu'], 3: ['Mon', 'Wed', 'Fri'], 4: ['Mon', 'Tue', 'Thu', 'Fri'], 5: ['Mon', 'Tue', 'Wed', 'Fri', 'Sat'], 6: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }[days];
  const strengthDays = days >= 4 ? [names[0], names[2]] : [names[0], names[names.length - 1]];
  const aerobicMin = Math.ceil(150 / days / 5) * 5;
  const plan = names.map((d) => {
    const parts = ['Warm-up: raise, activate, mobilise, potentiate (5 to 10 min)'];
    if (run5k) parts.push(`Walk/run intervals, ${Math.max(20, Math.min(30, aerobicMin))} min, run parts at talk-but-not-sing effort`);
    else parts.push(`${aerobicMin} min moderate cardio (you can talk but not sing)${inactive ? '' : ', or half as long at vigorous effort'}`);
    if (strengthDays.includes(d)) parts.push(`Strength: squat, hinge, push, pull, an overhead or vertical move, and a core hold; ${muscle ? '3 sets each, building toward about 10 hard sets per muscle a week' : '2 to 3 sets each'}, stop with a rep or two left${older ? ", and start with light loads" : ""}`);
    if (older) parts.push('Balance: heel-to-toe walking and standing up from a chair');
    if (!strengthDays.includes(d) || days === 2) parts.push('Stretch each major muscle group, about 60 seconds each');
    if (calm) parts.push('If the week gets heavy: the five-minute version still counts');
    return { day: d, parts };
  });

  const weekly = run5k ? days * Math.max(20, Math.min(30, aerobicMin)) : days * aerobicMin;
  const note = weekly >= 150
    ? `That's about ${weekly} minutes of moderate cardio this week, which meets the 150-minute target.`
    : `That's about ${weekly} minutes of cardio this week, under the 150-minute target. The running template builds toward 150 by weeks 4 to 8.`;
  if (weekly < 150 && run5k) lean('running.md', 'Weeks 4 to 8, consolidate');
  ctx.state.write('last-plan.json', { at: new Date().toISOString(), days, goal, level: level || 'not told', age, weekly, plan });
  return [
    `A week for ${days} days, goal: ${goal}${inactive ? ', starting gently' : ''}. This is a template, not a prescription.`,
    '',
    ...plan.map((p) => `${p.day}: ${p.parts.join('. ')}.`),
    '',
    note,
    '',
    'It rests on these cards:',
    ...rests.map((r) => `- ${r.fact}  (${r.card}; ${r.sources.join(', ')})`),
  ].join('\n');
});
