# The wellbeing agents

Three agents who share one world and one kit: a nutritionist, a fitness coach and a dog trainer. Each keeps to its
own ground and hands everything else to the right sibling. Each answers only from its own knowledge cards, where
every fact names the page of Louise's book it came from, and from what it remembers on this computer. None of them
ever uses the web. When one of them does not know something, it asks Louise, the research librarian, to look it up,
and learns from her book when it comes back.

They live in Kindlemere, a park beside a lake under the real sky: the sun and the moon rise and set at the true hours
for this computer's place, and at night the fireflies come out and the dog sleeps in its house. Each keeper has
helpers for parts of its work: Summer and Spud with Avo, Puff and Huff with Steady, Barkley and Sizzle with Tumble.
Click any of them. Leave the page alone for a while and they visit each other; at night, click the telescope on the
hill to see tonight's moon (`kit/REALM.md`).

## The three

| Agent | Who | Where | What it covers | Its room |
|---|---|---|---|---|
| `agents/nutrition` | Avo, an avocado | the Orchard, a foresty picnic meadow | nutrient needs by age and life stage, week plans and shopping, recipe and allergy swaps, food safety, food for training | http://127.0.0.1:7571/ |
| `agents/fitness` | Steady, three stacked river stones | Stepping Hill | activity targets, training plans, running and strength, stretching and recovery, sleep and rest, breathwork and yoga | http://127.0.0.1:7572/ |
| `agents/dog-training` | Tumble, a large herding ball | Lakeside Field | training and obedience up to the good-citizen tests, trust and handling, everyday behaviour problems, each dog remembered | http://127.0.0.1:7573/ |

Each agent's `SCOPE.md` says exactly what it does, what it does not do, and who it hands over to. Food goes to the
nutritionist, movement to the fitness coach, dogs to the dog trainer. Pain, illness and injury go to a doctor, and a
sick dog to a vet. `bundle.json` lists the three with their ports and the kit's version.

## Opening an agent

- **Its room** (the dashboard): run `node agents/<agent>/dashboard/server.js` from this folder, then open the address
  it prints. The room is a step into the keeper's place, made for doing: Avo plans meals with you, Steady takes you
  through a run, a workout or a stretch, Tumble trains with you and your dog. What the keeper knows, what it
  remembers, its tools and what it is waiting on from Louise are in a drawer. It answers only on this computer
  (127.0.0.1).
- **Talking with it:** open a Claude chat in the agent's own folder (`agents/nutrition`, `agents/fitness` or
  `agents/dog-training`). The folder's `CLAUDE.md` makes that chat the agent, and its `.claude/settings.json` turns
  the web off.

## How a gap reaches Louise

1. You ask something the agent's cards do not cover. It says "I don't know yet" rather than guess.
2. It puts the question on Louise's list with `kit/engine/louise.js ask`: a lantern sent across the lake. You can see
   it in the room under "Waiting on Louise".
3. When you tell Louise to research her list, she writes a book on it with a source for every fact.
4. The agent takes the book in (`kit/engine/learn.js`): it copies the answering page as a new card, with its sources,
   and answers from it from then on.

Gaps each agent already knows about are in its `knowledge/GAPS.md`; `kit/engine/louise.js send-gaps <agent>` puts
them on her list, once each.

## What is in the kit

`kit/CONTRACT.md` lists every command an agent may rely on, with an example of each. In short:

- `kit/engine/`: the shelf of cards, memory, Louise's list, learning from her books, the toolsmith (each agent builds
  its own small tools, checked and registered), and the no-web check.
- `kit/dashboard/`: the room every agent shares (local only, a new key each start).
- `kit/design/` and `kit/art/`: the realm's colours and type, the scene, and each keeper in five moods.

## What is not built yet

These wait for your word:

- The three are not in the office, and have no phone doors.
- Louise has not researched their questions. The build used a test copy of her list. At the close of the build run,
  each agent's gaps (`knowledge/GAPS.md`) go on her real list once; she researches them when you tell her to.
- The package is private, installed only on HQ, and deployed nowhere.
- No agent may use the web or a connector.

## Install on HQ

The repo is at `D:\Hub\20-Coding\Projects\wellbeing-agents`. It needs Node and nothing else: no `npm install`.

1. Bring it up to date: `git pull` on `main`.
2. Docker holds port 7571 on HQ. Give the nutritionist another port in a file that stays on this computer:
   `agents/nutrition/agent.config.json` with `{ "port": 7574 }`.
3. Optional, for the sky: `kit/realm.config.json` with your town's latitude and longitude, one decimal place, for
   example `{ "lat": 35.5, "lon": -97.5 }`. Without it the sky follows the middle of this computer's time zone.
4. Check each agent: `node kit/engine/noweb.js check`, then for each agent
   `node kit/engine/shelf.js check <agent> --strict` and `node kit/engine/toolsmith.js list <agent>`.
5. Start a room: `node agents/<agent>/dashboard/server.js`, and open the address it prints.

What an agent learns about you stays on this computer: `agents/*/memory/`, `agents/*/state/` and every
`*.config.json` are never committed.
