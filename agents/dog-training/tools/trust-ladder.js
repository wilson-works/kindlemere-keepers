'use strict';

/**
 * trust-ladder: made with the kit's toolsmith (kit/CONTRACT.md, section 8).
 * Purpose: Walks a dog through the day-one trust protocol step by step and keeps its progress
 * Inputs: dog, done, undo
 * Cards: cooperative-care-and-trust.md
 *
 * It reads only this agent's cards and memory, through ctx, and writes only its own state files.
 * Run: node agents/dog-training/tools/trust-ladder.js --dog <dog> --done <done> --undo <undo>
 */

const { run } = require('../../../kit/engine/tool-kit');

run(__filename, (ctx) => {
  // The day-one trust protocol and the cooperative-care curriculum as one ladder, with a dog's progress kept here.
  const name = String(ctx.args._[0] || ctx.args.dog || '').trim();
  if (!name) return 'Which dog? trust-ladder <dog> [--done <step number>] [--undo <step number>].';
  const card = 'cooperative-care-and-trust.md';
  const c = ctx.card(card);
  // Steps: the book's day-one trust protocol (page 07, lines 168 to 177), then the two cooperative-care steps that
  // protocol does not already hold: handling against the start button (137) and scoring on a fear scale (139).
  const steps = c.facts
    .filter((f) => f.sources.some((s) => /07-trust-and-relationship\.md$/.test(s.page) && ((s.line >= 168 && s.line <= 177) || s.line === 137 || s.line === 139)))
    .map((f) => ({ says: f.text.replace(/\s*@\S+/g, '').trim(), sources: f.sources.map((s) => `${s.page}:${s.line}`) }));
  const handling = (s) => (/:13\d$/.test(s.sources[0]) ? 1 : 0);
  steps.sort((p, q) => handling(p) - handling(q));
  if (!steps.length) return `The ${card} card has no steps I can read.`;

  const file = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dog'}.json`;
  const state = JSON.parse(ctx.state.read(file) || '{"done":{}}');
  const mark = (v, on) => {
    const n = Number(v);
    if (!(n >= 1 && n <= steps.length)) return `There is no step ${v}. The ladder has ${steps.length} steps.`;
    const d = new Date();
    if (on) state.done[n] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    else delete state.done[n];
    ctx.state.write(file, state);
    return null;
  };
  const err = (ctx.args.done && mark(ctx.args.done, true)) || (ctx.args.undo && mark(ctx.args.undo, false));
  if (err) return err;

  const next = steps.findIndex((_, i) => !state.done[i + 1]);
  return {
    dog: name,
    done: `${Object.keys(state.done).length} of ${steps.length}`,
    next: next === -1 ? 'Every step is done. Keep honouring the start button and keep the emotional record.' : `Step ${next + 1}: ${steps[next].says}`,
    ladder: steps.map((s, i) => `${state.done[i + 1] ? `[done ${state.done[i + 1]}]` : '[ ]'} ${i + 1}. ${s.says} (${s.sources.join(', ')})`),
    cards: [card],
  };
});
