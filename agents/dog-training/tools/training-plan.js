'use strict';

/**
 * training-plan: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Builds a training plan for a remembered dog from its breed, age, temperament and level, citing the cards it rests on
 * Inputs: dog
 * Cards: life-stages.md, breed.md, high-drive-dogs.md, intake-and-base-rates.md, obedience-ladder.md, sessions-and-criteria.md, scope-and-referral.md, pain-first.md, reactivity.md, resource-guarding.md, separation-and-compulsion.md, scent-sport-enrichment.md, off-leash-and-recall.md, weight-and-treats.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/dog-training/tools/training-plan.js --dog <dog>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  // The dog comes from memory: facts remembered with --about "dog:<Name>:breed|age|temperament|level".
  const name = String(ctx.args._[0] || ctx.args.dog || '').trim();
  const mem = ctx.recall();
  const dogs = {};
  for (const f of mem.facts) {
    const m = /^dog:([^:]+):(breed|age|temperament|level)$/i.exec(f.about || '');
    if (!m) continue;
    const key = m[1].toLowerCase();
    dogs[key] = dogs[key] || { name: m[1] };
    dogs[key][m[2].toLowerCase()] = f.text;
  }
  if (!name) {
    const known = Object.values(dogs).map((d) => d.name);
    return known.length ? `Which dog? I remember ${known.join(', ')}.` : 'I do not remember any dogs yet. Tell me about one first.';
  }
  const dog = dogs[name.toLowerCase()];
  if (!dog) return `I do not remember a dog called ${name}. Tell me its breed, age, temperament and level first.`;

  const used = new Set();
  const cardCache = {};
  // One line from a card: the first fact on that card whose text has every given word. Each line keeps its source.
  const from = (file, ...words) => {
    const c = cardCache[file] || (cardCache[file] = ctx.card(file));
    const f = c.facts.find((x) => words.every((w) => x.text.toLowerCase().includes(w.toLowerCase())));
    if (!f) return null;
    used.add(file);
    return { says: f.text.replace(/\s*@\S+/g, '').trim(), card: file, sources: f.sources.map((s) => `${s.page}:${s.line}`) };
  };
  const plan = { dog: dog.name, known: { breed: dog.breed || null, age: dog.age || null, temperament: dog.temperament || null, level: dog.level || null } };
  const add = (section, line) => { if (line) (plan[section] = plan[section] || []).push(line); };

  // Stop first: things the handler said that are referrals, not plans.
  const t = String(dog.temperament || '').toLowerCase();
  if (/\bbit(e|es|ten)?\b|\bbiting\b/.test(t)) add('stop_and_refer', from('scope-and-referral.md', 'bite to a person'));
  if (/child|kid|baby/.test(t)) add('stop_and_refer', from('scope-and-referral.md', 'children'));
  if (/spin|fly-snap|light-chas|flank/.test(t)) add('stop_and_refer', from('scope-and-referral.md', 'compulsive behaviour: spinning'));
  if (/self-injur|hurts itself/.test(t)) add('stop_and_refer', from('scope-and-referral.md', 'self-injury'));
  if (/sudden|new |grumpy|limp|pain|stiff/.test(t)) add('stop_and_refer', from('pain-first.md', 'new, escalating'));
  if (plan.stop_and_refer) {
    // A referral is the whole answer. No training plan until the right professional has seen the dog.
    add('how_to_say_it', from('scope-and-referral.md', 'Name what I saw'));
    plan.plan = `No training plan for ${dog.name} until a vet, and the professional named above, have seen ${dog.name}.`;
    plan.cards = [...used].sort();
    return plan;
  }

  // Life stage from age.
  const a = /(\d+(?:\.\d+)?)\s*(week|wk|month|mo|year|yr)/i.exec(String(dog.age || ''));
  const months = a ? Number(a[1]) * (/^w/i.test(a[2]) ? 12 / 52 : /^y/i.test(a[2]) ? 12 : 1) : null;
  if (months === null) add('life_stage', { says: 'I do not know the age yet, so I cannot place the life stage.', card: null, sources: [] });
  else if (months < 0.75) add('life_stage', from('life-stages.md', 'Neonatal'));
  else if (months <= 3) {
    add('life_stage', from('life-stages.md', 'Socialisation.'));
    add('life_stage', from('life-stages.md', 'Puppy class can start'));
    add('life_stage', from('life-stages.md', 'Coach in this window'));
  } else if (months < 6) {
    add('life_stage', { says: `At about ${Math.round(months)} months, ${dog.name} is between the windows my book names: socialisation ends near 12 weeks and adolescence starts near 6 months.`, card: 'life-stages.md', sources: [] });
    used.add('life-stages.md');
  } else if (months <= 18) {
    add('life_stage', from('life-stages.md', 'Adolescence.'));
    add('life_stage', from('life-stages.md', 'documented and passing'));
    add('life_stage', from('life-stages.md', 'Do not escalate to corrections'));
  } else if (months < 96) {
    add('life_stage', from('life-stages.md', 'Adult.'));
  } else {
    add('life_stage', from('life-stages.md', 'Senior means the last 25%'));
    add('life_stage', from('life-stages.md', 'May: shorter sessions'));
    add('life_stage', from('life-stages.md', 'Must not diagnose CCD'));
  }

  // Breed: a hint, never a verdict.
  add('breed', from('breed.md', 'working hypothesis'));
  const b = String(dog.breed || '').toLowerCase();
  if (/border collie|collie|shepherd|heeler|kelpie|herding/.test(b)) {
    add('breed', from('breed.md', 'Herding'));
    add('breed', from('high-drive-dogs.md', 'trainable job'));
    add('breed', from('high-drive-dogs.md', 'concept-level'));
    add('breed', from('high-drive-dogs.md', 'compulsive repetition'));
  } else if (/retriever|spaniel|setter|pointer/.test(b)) add('breed', from('breed.md', 'Sporting'));
  else if (/terrier/.test(b)) add('breed', from('breed.md', 'Terrier'));
  else if (/hound|beagle/.test(b)) add('breed', from('breed.md', 'Hound'));
  if (/doodle|cockapoo|cavapoo|poo\b|mix|cross/.test(b)) {
    add('breed', from('breed.md', 'mixed dogs'));
    if (/doodle|cockapoo|cavapoo/.test(b)) add('breed', from('breed.md', 'All three showed more'));
  }

  // Temperament: screen the cluster.
  if (/noise|sound|thunder|firework/.test(t)) add('temperament', from('intake-and-base-rates.md', 'Noise sensitivity: the most common'));
  if (/fear|anxious|nervous|shy/.test(t)) add('temperament', from('intake-and-base-rates.md', 'Fear and non-social fear'));
  if (/reactiv|lunge|bark at/.test(t)) { add('temperament', from('reactivity.md', 'Distance first')); add('temperament', from('reactivity.md', 'honest ceiling')); }
  if (/guard/.test(t)) { add('temperament', from('resource-guarding.md', 'Teach "drop" and "trade"')); add('temperament', from('resource-guarding.md', 'Add food to the bowl')); }
  if (/alone|separation/.test(t)) add('temperament', from('separation-and-compulsion.md', 'Systematic desensitisation'));
  if (/bored|destruct|busy|high.?drive|energetic/.test(t)) add('temperament', from('scent-sport-enrichment.md', 'two hours of running'));
  add('temperament', from('intake-and-base-rates.md', 'Comorbidity changes the plan'));

  // Level: the next rung of the ladder.
  // A level names the test the dog has passed (has, passed) or is working on (toward, working, learning).
  const l = String(dog.level || '').toLowerCase();
  const passed = (test) => new RegExp(`(has|passed|holds|got)( the| its)? ${test}\\b`).test(l);
  if (passed('cgcu') || /off.?leash/.test(l)) {
    add('next_rung', from('off-leash-and-recall.md', 'Recall on a 20-foot line'));
    add('next_rung', from('off-leash-and-recall.md', 'Chase interruption'));
  } else if (passed('cgca') || /cgcu|urban/.test(l)) {
    for (const w of ['Doorways without pulling', 'Waiting at a corner', 'A 3-minute down-stay']) add('next_rung', from('obedience-ladder.md', w));
  } else if (passed('cgc') || /cgca|community/.test(l)) {
    for (const w of ['controlled wait', 'group sit-stay', '20-foot line while', 'generalisation ladder']) add('next_rung', from('obedience-ladder.md', w));
  } else if (/cgc|good citizen|basic|obedience/.test(l)) {
    for (const f of (cardCache['obedience-ladder.md'] || (cardCache['obedience-ladder.md'] = ctx.card('obedience-ladder.md'))).facts) {
      if (/^CGC item \d+:/.test(f.text)) add('next_rung', from('obedience-ladder.md', f.text.split(':')[0] + ':'));
    }
    add('next_rung', from('obedience-ladder.md', 'basic obedience course'));
  } else {
    add('next_rung', from('obedience-ladder.md', 'reinforcer hierarchy'));
    add('next_rung', from('obedience-ladder.md', 'look at me'));
    add('next_rung', from('obedience-ladder.md', 'marker'));
  }

  // How every session runs.
  add('every_session', from('sessions-and-criteria.md', 'The rule I give'));
  add('every_session', from('sessions-and-criteria.md', 'one thing at a time'));
  add('every_session', from('sessions-and-criteria.md', 'Never resolve a stall'));
  add('every_session', from('weight-and-treats.md', 'high-rate session is a meal'));

  plan.cards = [...used].sort();
  return plan;
});
