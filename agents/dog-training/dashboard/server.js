'use strict';
const path = require('path');
const memory = require('../../../kit/engine/memory');

// One extra route: what the trainer remembers, as counts only. The page never needs a name to show this.
const remembered = () => {
  const es = memory.entries('dog-training');
  const dogs = new Set();
  for (const e of es) {
    const m = /^dog:([^:]+)/i.exec(e.about || '');
    if (m) dogs.add(m[1].toLowerCase());
  }
  const count = (kind) => es.filter((e) => e.kind === kind).length;
  return { dogs: dogs.size, facts: count('fact'), worked: count('worked'), lessons: count('lesson') };
};

require('../../../kit/dashboard/shell').start({
  agentDir: path.resolve(__dirname, '..'),
  routes: { 'GET /api/remembered': remembered },
});
