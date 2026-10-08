'use strict';

/**
 * quick-workout: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Builds a whole-body strength workout for right now from the six-pattern template, with any equipment, warm-up and cool-down included.
 * Inputs: equipment
 * Cards: strength.md, flexibility-warmup.md, refusal-checklist.md, crisis-line.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/fitness/tools/quick-workout.js --equipment <equipment>
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
  const said = ctx.recall().facts.map((f) => `${f.about || ''}: ${f.text}`.toLowerCase()).join(' | ');
  const flag = (re) => re.test(said);

  // 1. The same stops as the week plan: what the person told Steady can rule out a workout from her.
  const stops = [];
  if (flag(/suicid|self-harm|hurt myself|harm (myself|someone)|crisis|dissociat/)) stops.push(['crisis-line.md', 'Any mention of suicidal ideation']);
  if (flag(/chest pain|chest pressure|faint|passed out|palpitation|irregular heart|short(ness)? of breath|fever/)) stops.push(['refusal-checklist.md', 'chest pain, fainting']);
  if (flag(/concussion|head injur|hit (my|his|her) head/)) stops.push(['refusal-checklist.md', 'suspected concussion']);
  if (flag(/pregnan/) && !flag(/(provider|midwife|obstetric|doctor|ob)[^|]*(cleared|okay|approved|discussed|said yes|go-ahead)/)) stops.push(['refusal-checklist.md', 'The person is pregnant']);
  if (flag(/(sprain|swollen|swelling|can.t bear weight|cannot bear weight|new pain|torn|acute injur)/)) stops.push(['refusal-checklist.md', 'An undiagnosed or acute muscle']);
  const age = Number(((said.match(/age[^|]*?(\d{1,3})/) || [])[1])) || null;
  if (age && age < 18) stops.push(['refusal-checklist.md', 'A minor wants strength programming']);
  if (stops.length) {
    stops.forEach(([file, needle]) => lean(file, needle));
    const crisis = stops.some(([file]) => file === 'crisis-line.md');
    if (crisis) lean('crisis-line.md', 'call or text 988');
    return [
      crisis
        ? "I'm not building a workout right now. What you told me matters more. In the US you can call or text 988 any time."
        : "I won't build a workout yet. Something you told me needs a clinician's eyes first.",
      '',
      'It rests on these cards:',
      ...rests.map((r) => `- ${r.fact}  (${r.card}; ${r.sources.join(', ')})`),
    ].join('\n');
  }

  // 2. The workout: the six-pattern template at the 2026 default dose, with whatever equipment the person has.
  lean('flexibility-warmup.md', 'Four phases: Raise, Activate, Mobilise, Potentiate');
  lean('strength.md', 'A six-pattern template covers that list');
  lean('strength.md', 'Default for a general adult: all major muscle groups');
  lean('strength.md', 'Novice and intermediate strength: 70 to 85% 1RM, 8 to 12 reps');
  lean('strength.md', 'Beginners do not need a different system');
  lean('strength.md', 'The same pattern template runs with bands, bodyweight, dumbbells or machines');
  lean('flexibility-warmup.md', 'ACSM 2011: stretches for each major muscle-tendon group');
  const kit = String(ctx.args.equipment || '').toLowerCase();
  const gear = /band/.test(kit) ? 'bands' : /dumbbell|weight|kettlebell/.test(kit) ? 'dumbbells' : /machine|gym/.test(kit) ? 'machines' : 'bodyweight';
  const dose = '2 to 3 sets of 8 to 12, stopping with a rep or two left';

  return [
    `A whole-body workout with ${gear}. Same plan for beginners and regulars: pick a load that feels hard by the last reps.`,
    '',
    '1. Warm up (2 min): raise. Easy movement until you are warm and breathing a little faster.',
    '2. Warm up (2 min): activate and mobilise. Moving stretches through the hips, shoulders and back.',
    '3. Warm up (2 min): potentiate. A few easy goes at the first move, each a little harder.',
    `4. Squat: ${dose}.`,
    `5. Hinge (bend at the hips, back long): ${dose}.`,
    `6. Push away from you: ${dose}.`,
    `7. Pull toward you: ${dose}.`,
    `8. Press overhead or pull down: ${dose}.`,
    '9. Core (hold your middle still, no arching): 2 to 3 sets.',
    '10. Cool down: stretch what you worked, about 60 seconds for each muscle group.',
    "11. I have no named exercises on my shelf yet, so I give you the move, not its name. It's a gap I've noted for Louise.",
    '',
    'It rests on these cards:',
    ...rests.map((r) => `- ${r.fact}  (${r.card}; ${r.sources.join(', ')})`),
  ].join('\n');
});
