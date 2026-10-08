'use strict';
const path = require('path');
const { spawnSync } = require('child_process');

// Steady's own routes (kit/CONTRACT.md, section 10): the trail on her page runs her registered tools.
// Inputs are checked here and passed as flags; the tool itself still checks its registry entry and its cards.
const agentDir = path.resolve(__dirname, '..');
function tool(name, args) {
  const r = spawnSync(process.execPath, [path.join(agentDir, 'tools', `${name}.js`), ...args],
    { cwd: agentDir, encoding: 'utf8', timeout: 15000, windowsHide: true });
  return { ok: r.status === 0, text: String(r.stdout || '').trim() || 'The tool said nothing.' };
}
const minutes = (v, max) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= max ? String(n) : null; };

require('../../../kit/dashboard/shell').start({
  agentDir,
  routes: {
    'POST /api/session': ({ body }) => {
      if (!['warmup', 'stretch', 'breathe'].includes(body.kind)) return { ok: false, text: 'Pick a warm-up, a stretch or a breathing session.' };
      const m = minutes(body.minutes, 60);
      return tool('calm-session', ['--kind', body.kind, ...(m ? ['--minutes', m] : [])]);
    },
    'POST /api/log-run': ({ body }) => {
      const m = minutes(body.minutes, 300);
      if (!m) return { ok: false, text: 'Tell me how many whole minutes you ran, from 1 to 300.' };
      return tool('progress-log', ['--kind', 'run', '--minutes', m]);
    },
    'POST /api/workout': ({ body }) => {
      if (!['bodyweight', 'bands', 'dumbbells', 'machines'].includes(body.equipment)) return { ok: false, text: 'Tell me what you have: just you, bands, dumbbells or machines.' };
      return tool('quick-workout', ['--equipment', body.equipment]);
    },
    'POST /api/plan': ({ body }) => {
      const days = minutes(body.days, 6);
      if (!days || Number(days) < 2) return { ok: false, text: 'Pick 2 to 6 days a week.' };
      if (!['general fitness', 'run a 5k', 'build muscle', 'calmer mind'].includes(body.goal)) return { ok: false, text: 'Pick what the week is for.' };
      if (!['new or coming back', 'already active'].includes(body.level)) return { ok: false, text: 'Tell me where you are starting from.' };
      const age = body.age == null || body.age === '' ? null : minutes(body.age, 120);
      if (body.age != null && body.age !== '' && !age) return { ok: false, text: 'Your age as a whole number, or leave it empty.' };
      return tool('week-plan', ['--days', days, '--goal', body.goal, '--level', body.level, ...(age ? ['--age', age] : [])]);
    },
  },
});
