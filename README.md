# The wellbeing agents

Three agents who share one world and one kit: a nutritionist, a fitness coach and a dog trainer. Each keeps to its
own ground and hands everything else to the right sibling. Each answers first from its own knowledge cards, where
every fact names its source, and from what it remembers on this computer. When its cards don't cover a question, it
looks in a book Louise the research librarian already wrote, then in the research library (`kit/library/`), then on
the web, straight away, with the address of the page beside each fact, and keeps what it found as a new card so the
next answer comes from the card (owner, 2026-10-09: "we cant rely on Louise for everything"). When Louise is on this
computer, the question also goes on her list for a fuller book.

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

- **All of Kindlemere** (owner, 2026-10-08: one park, three doors): run `node kit/dashboard/park.js` from this folder.
  One process opens all three rooms, each on its own port, and prints the park's address,
  `/kit/kindlemere.html` on any of them. That page is the whole realm, live. Click Avo, Steady or Tumble to step into
  their room, or take the signpost; each place also has its own card under the realm. The bar at the top of every
  page goes between Kindlemere, the Orchard, the Hill and the Field, and the camera glides from one to the next. Click
  the dog to play fetch anywhere in the park: drag the ball and flick it up the hill, into the Orchard or out on the
  lake. The office's three doors all start the park this way and open this page, so any door wakes the whole park and
  Sleep on any door puts it to sleep.
- **Its room** (the dashboard): run `node agents/<agent>/dashboard/server.js` from this folder, then open the address
  it prints. The room is a step into the keeper's place, made for doing: Avo plans meals with you, Steady takes you
  through a run, a workout or a stretch, Tumble trains with you and your dog. What the keeper knows, what it
  remembers, its tools and what it is waiting on from Louise are in a drawer. It answers only on this computer
  (127.0.0.1).
- **Talking with it:** Avo and Tumble talk with you in their rooms. Each message runs one Claude Code turn on this
  computer, in the agent's own folder and under its own rules, with the web only through Claude Code's WebSearch and
  WebFetch and no connectors, so Claude Code must be installed. Steady's room is guided steps instead. You can also
  open a Claude chat in any agent's own folder (`agents/nutrition`, `agents/fitness` or `agents/dog-training`). The
  folder's `CLAUDE.md` makes that chat the agent, and its `.claude/settings.json` allows those two web tools and
  turns off every connector, MCP server and shell command that fetches.

## When a keeper doesn't know

You ask something its cards do not cover. It never guesses. It looks, in this order:

1. **A book Louise already wrote**, when she is on this computer (`kit/engine/learn.js <agent> --find`, then
   `--book`): it copies that book's summary card onto its shelf and answers from it.
2. **The research library**, `kit/library/<agent>/`: deep research reports from the Align project, each citing its own
   studies. It names the report and the study.
3. **The web, straight away**, with Claude Code's WebSearch and WebFetch only. It prefers government health agencies,
   professional bodies and peer-reviewed reviews, gives the page's address beside each fact, and searches for the
   topic, never for you. It keeps what it found as a card, `knowledge/web-<subject>.md`, with each page's address and
   the day it read it (`kit/engine/webcard.js`), so next time the answer comes from the card.
4. **Louise's list**, only when she is on this computer: the card's subject goes on her list once, for a fuller book.
   When she is not, the keeper says nothing about her. When you tell Louise to research her list, she writes a book
   with a source for every fact, and the keeper takes it in (`kit/engine/learn.js`).

If none of them has an answer it can trust, it says "I don't know yet". Emergencies and the people to see (a doctor,
a vet) always come first, whatever a page says. Gaps each agent already knows about are in its `knowledge/GAPS.md`;
`kit/engine/louise.js send-gaps <agent>` puts them on her list, once each.

## What is in the kit

`kit/CONTRACT.md` lists every command an agent may rely on, with an example of each. In short:

- `kit/engine/`: the shelf of cards, memory, Louise's list, learning from her books, keeping a web find as a card
  (`webcard.js`), the toolsmith (each agent builds its own small tools, checked and registered), and the fences check
  (`fences.js`: the web only through WebSearch and WebFetch, never a connector, an MCP server or a shell fetcher).
- `kit/library/`: the research library, one folder per keeper (its `README.md` says what is there and where it came
  from).
- `kit/dashboard/`: the room every agent shares (local only, a new key each start).
- `kit/design/` and `kit/art/`: the realm's colours and type, the scene, and each keeper in five moods.

## What is not built yet

These wait for your word:

- Louise has not researched their questions. The build used a test copy of her list. At the close of the build run,
  each agent's gaps (`knowledge/GAPS.md`) go on her real list once; she researches them when you tell her to.
- The package is private and deployed nowhere. Kindlemere is not in the WilsonWorks Workspace's agent catalog yet:
  adding it is a change to that repo.
- The keepers use the web only through WebSearch and WebFetch (owner, 2026-10-09). No agent may use a connector or an
  MCP server.
- A card from the web shows on the keeper's shelf like any other, but the rooms' card drawers don't yet show its
  pages' addresses the way they show Louise's footnotes.

## Install

Kindlemere needs Node 18 or later and nothing else: no `npm install`, no account, no database. To talk with Avo and
Tumble in their rooms (and for the keepers to look things up on the web) it also needs Claude Code on the same
computer. Louise, the research librarian, is optional: without her the keepers use their cards, the research library
and the web.

**On its own.** Get the folder (clone it, or unzip it), then from inside it:

```
node kit/dashboard/park.js
```

It prints the park's address, `http://127.0.0.1:7572/kit/kindlemere.html` with the usual ports. Open it in a
browser on the same computer. The rooms use ports 7571, 7572 and 7573. If one is taken, give that keeper another port
in a file that stays on your computer, for example `agents/nutrition/agent.config.json` with `{ "port": 7574 }`, and
start the park again. Optional, for the sky over your own town: `kit/realm.config.json` with your latitude and
longitude, one decimal place, for example `{ "lat": 51.5, "lon": -0.1 }`.

**In a WilsonWorks Workspace.** Kindlemere installs as one agent (its `agent.json` at the top of this folder, key
`kindlemere`): from the Workspace folder,

```
node agents/bin/install-agent.js kindlemere
```

once it is in the Workspace's catalog, or with this folder's path or git address in place of `kindlemere` before
then. Its door in the office opens the park, and Wake starts it.

**Check it** (optional): `node kit/engine/fences.js check` says what each keeper can reach. With Louise on the computer,
`node kit/engine/shelf.js check <agent> --strict` also checks every card's sources against her library.

## Make your own version

Everything a keeper knows and how it looks lives in plain files you can change:

- **What it knows:** its cards, `agents/<keeper>/knowledge/*.md`. Each card is one subject, and each fact ends with
  where it came from (the card format is in `kit/CONTRACT.md`, section 3). Add a card, edit one, or delete one; the
  keeper answers from what is there. Its research shelf is `kit/library/<keeper>/`.
- **Who it is:** its name, title and lines are in `agents/<keeper>/agent.json`; how it talks and what it will and won't
  do are in `agents/<keeper>/CLAUDE.md` and `SCOPE.md`.
- **How it looks:** every figure and the park itself are drawn by `kit/art/make-kindlemere.js`. Change the drawing
  there and run `node kit/art/make-kindlemere.js` to redraw them all. The colours are in `kit/design/tokens.css`.

WilsonWorks builds personalized versions: your own keepers, your own field, your own research shelf. See
https://wilsonworks.studio/ai-consulting/agents.

## Install on HQ

The repo is at `D:\Hub\20-Coding\Projects\wellbeing-agents`. It needs Node and nothing else: no `npm install`.

1. Bring it up to date: `git pull` on `main`.
2. Docker holds port 7571 on HQ. Give the nutritionist another port in a file that stays on this computer:
   `agents/nutrition/agent.config.json` with `{ "port": 7574 }`.
3. Optional, for the sky: `kit/realm.config.json` with your town's latitude and longitude, one decimal place, for
   example `{ "lat": 35.5, "lon": -97.5 }`. Without it the sky follows the middle of this computer's time zone.
4. Check each agent: `node kit/engine/fences.js check`, then for each agent
   `node kit/engine/shelf.js check <agent> --strict` and `node kit/engine/toolsmith.js list <agent>`.
5. Start the park, `node kit/dashboard/park.js`, or one room, `node agents/<agent>/dashboard/server.js`, and open
   the address it prints.
6. Optional, for the phone: publish each room on the tailnet (`tailscale serve --bg --https=<port>
   http://127.0.0.1:<room port>`) and name that address in the room's `agent.config.json`, for example
   `{ "port": 7574, "phone": "https://<machine>.<tailnet>.ts.net:8448" }`. The room then answers that host too, and the
   Kindlemere page opened from the phone links to the rooms' phone addresses.

What an agent learns about you stays on this computer: `agents/*/memory/`, `agents/*/state/` and every
`*.config.json` are never committed.
