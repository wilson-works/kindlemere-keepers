'use strict';

/**
 * calm-session: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Builds a short warm-up, stretching or slow-breathing session, with the safety lines its cards require.
 * Inputs: kind, minutes
 * Cards: flexibility-warmup.md, strength.md, meditation-breathwork.md, crisis-line.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/fitness/tools/calm-session.js --kind <kind> --minutes <minutes>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  const rests = [];
  const lean = (file, needle) => {
    const f = ctx.card(file).facts.find((x) => x.text.includes(needle));
    if (!f) throw Object.assign(new Error(`My card ${file} no longer says "${needle}", so I stopped rather than guess.`), { status: 2 });
    rests.push({ card: file, fact: f.text.replace(/\s*\[\^\d+\]/g, '').replace(/\s*@\S+/g, '').trim(), sources: f.sources.map((s) => `${s.page}:${s.line}`) });
    return f;
  };
  const kind = String(ctx.args.kind || '').toLowerCase();
  let minutes = Math.min(30, Math.max(3, Number(ctx.args.minutes) || 10));
  const said = ctx.recall().facts.map((f) => f.text.toLowerCase()).join(' | ');
  const steps = [];

  if (/suicid|self-harm|crisis|dissociat|trauma|flashback|panic/.test(said)) {
    lean('crisis-line.md', 'Trauma history surfacing');
    lean('crisis-line.md', 'call or text 988');
    return ['Before any practice: something you told me means a guided session from me is not the right next step.',
      'If you are in the US and things feel like too much, you can call or text 988 any time.', '',
      'What my cards say:', ...rests.map((r) => `- ${r.fact}  (${r.card}; ${r.sources.join(', ')})`)].join('\n');
  }

  if (kind === 'warmup') {
    lean('flexibility-warmup.md', 'Four phases: Raise, Activate, Mobilise, Potentiate');
    lean('flexibility-warmup.md', 'Activate and Mobilise: dynamic movement is favoured');
    lean('flexibility-warmup.md', 'Put short static stretches inside a warm-up');
    const q = Math.max(1, Math.round(minutes / 3));
    minutes = q * 3;
    steps.push(`Raise (${q} min): easy movement until you're warm and breathing a little faster.`);
    steps.push(`Activate and mobilise (${q} min): moving stretches through the joints you'll use, not long holds.`);
    steps.push(`Potentiate (${q} min): a few build-ups of the session's main move, each a little harder.`);
    steps.push('If you add a static stretch, keep it to 60 seconds or less per muscle.');
  } else if (kind === 'stretch') {
    lean('flexibility-warmup.md', 'ACSM 2011: stretches for each major muscle-tendon group');
    lean('flexibility-warmup.md', 'So prescribe total weekly time and consistency');
    lean('strength.md', "CDC's groups: legs, hips, back, abdomen, chest, shoulders and arms");
    lean('flexibility-warmup.md', 'holding over a minute per muscle right before a maximal effort reduces performance');
    const groups = ['legs', 'hips', 'back', 'abdomen', 'chest', 'shoulders', 'arms'];
    minutes = groups.length;
    groups.forEach((g) => steps.push(`${g[0].toUpperCase()}${g.slice(1)}: about 60 seconds in total, in one hold or a few shorter ones.`));
    steps.push('Any technique works about as well. Do it on 2 or more days a week, and away from a maximal effort.');
    steps.push("I have no named stretches on my shelf yet. It's a gap I've noted for Louise.");
  } else if (kind === 'breathe') {
    lean('meditation-breathwork.md', 'Slow paced breathing with a longer exhale');
    lean('meditation-breathwork.md', 'Negative effects are documented at roughly 8%');
    lean('meditation-breathwork.md', 'The most common are anxiety and depression');
    lean('meditation-breathwork.md', 'If practice keeps making you feel worse');
    lean('meditation-breathwork.md', 'never a reason to delay seeing a provider');
    lean('meditation-breathwork.md', 'High-intensity or hyperventilation protocols');
    steps.push('Before you start: about 8 in 100 people in one review felt worse from practices like this, most often anxious or low. That can happen to anyone.');
    steps.push(`For ${minutes} minutes: sit comfortably, breathe in gently through your nose, and let each breath out last longer than the breath in.`);
    steps.push('No forced or fast breathing. Keep it slow and easy.');
    steps.push('If it keeps making you feel worse, stop, and talk to a qualified teacher or a clinician.');
    steps.push('This sits alongside care. It is never a reason to put off seeing someone.');
  } else {
    throw Object.assign(new Error('Use --kind warmup, --kind stretch or --kind breathe, with --minutes if you like.'), { status: 2 });
  }

  ctx.state.write('last-session.json', { at: new Date().toISOString(), kind, minutes, steps });
  return [`A ${kind} session, about ${minutes} minutes.`, '', ...steps.map((s, i) => `${i + 1}. ${s}`), '',
    'It rests on these cards:', ...rests.map((r) => `- ${r.fact}  (${r.card}; ${r.sources.join(', ')})`)].join('\n');
});
