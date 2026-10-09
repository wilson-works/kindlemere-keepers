# The kit contract

Every command and file an agent may rely on. The agent lanes (`agents/nutrition`, `agents/fitness`,
`agents/dog-training`) call the kit only through what is written here. A change to this file after `REPO READY` is a
`CROSS-REQ` that names who it breaks.

Plain Node (18 or later), built-ins only, no install step. Every command runs from the repo root, or from anywhere with
the path to the script. `<agent>` is the agent's folder key: `nutrition`, `fitness` or `dog-training`. Exit codes: `0`
done, `1` nothing to do or not found, `2` refused or bad input (the message says why, in a plain sentence). Add
`--json` to any command for machine-readable output.

## 1. An agent's folder

```
agents/<agent>/
  agent.json              who the agent is, its door, its brand, its scope (section 2)
  CLAUDE.md               who it is and how it works; a Claude chat opened in this folder is the agent
  SCOPE.md                what it does, what it does not, and which sibling it hands to
  brand/VOICE.md          how it talks
  .claude/settings.json   copied from kit/claude/settings.agent.json, unchanged (section 9)
  knowledge/              its cards (section 3) and GAPS.md (section 6)
  tools/registry.json     its tools (section 8), written by the agent's lane, read only by the kit
  tools/<tool>.js         its tools, each made with the toolsmith
  dashboard/server.js     a thin file that starts the kit's dashboard shell (section 10)
  dashboard/public/       its page: index.html, and any css, js or svg it needs
  art/                    its own art (optional)
  memory/                 what it remembers (git-ignored, this computer only; the kit writes it)
  state/                  its working files (git-ignored, this computer only; the kit and its tools write it)
```

## 2. `agent.json`

Louise's fields, plus `scope`. The office reads the same fields, so a door can be added later in one step.

```json
{
  "key": "nutrition",
  "name": "<the character's name>",
  "title": "<what they are, in a few words>",
  "line": "<one sentence for an office plaque, 200 characters at most>",
  "status": "built",
  "door": { "local": "http://127.0.0.1:7571/", "phone": null },
  "probe": { "port": 7571, "path": "/health" },
  "start": "node dashboard/server.js",
  "autostart": false,
  "match": ["<words a person might use to call them>"],
  "brand": { "bg": "#…", "panel": "#…", "ink": "#…", "accent": "#…", "accent2": "#…", "font": "…", "mark": "mark.svg" },
  "art": "art.svg",
  "jokes": ["<door lines, 160 characters at most each>"],
  "scope": {
    "file": "SCOPE.md",
    "does": ["<short phrases>"],
    "does_not": ["<short phrases>"],
    "hands_to": [{ "what": "<a kind of question>", "to": "<agent key>" }]
  }
}
```

Ports: `nutrition` 7571, `fitness` 7572, `dog-training` 7573. `brand` colours come from the agent's palette slot in
`kit/design/tokens.css`. A machine-local `agent.config.json` beside it (git-ignored) may set `"port"` and `"phone"`.

## 3. A knowledge card

One Markdown file in `knowledge/`, one subject per card. Facts come from Louise's books, or (a card from the web,
section 7a) from web pages a keeper read, never from the builder's own head.

```markdown
---
title: Protein needs across life stages
sources: [2026-10-07-nutritionist-agent/01-overview.md, 2026-10-07-nutritionist-agent/03-life-stage-demographics.md]
louise_book: 2026-10-07-nutritionist-agent
copied: 2026-10-07
tags: [protein, older adults]
---
# Protein needs across life stages

- One fact, in a plain sentence. @2026-10-07-nutritionist-agent/01-overview.md:29
- Another fact, from another page. @2026-10-07-nutritionist-agent/03-life-stage-demographics.md:190
```

- `title`, `sources`, `louise_book` and `copied` (`YYYY-MM-DD`) are required. `tags` is optional.
- Every path is relative to Louise's library: `<YYYY-MM-DD>-<slug>/<page>.md`. `louise_book` is the book's folder.
- **A source beside every fact.** Each fact is a bullet (`- `), and each bullet ends with `@<page path>:<line>`, the
  line in Louise's page it came from. A bullet may run onto indented lines below it. A bullet with two sources carries
  two `@` tags. Headings and a one-line lead under a heading need no source; anything that states a fact goes in a
  bullet with one.
- `@research/<path>` (the form Louise's own summary cards use) is read as `@<path>`.
- Cards that `learn.js` copies from Louise carry `origin: louise-card` and keep her card's body exactly as she wrote it.
- A card is refused by the shelf when it has no `sources`, or no `@` source anywhere in its body. `shelf.js check
  --strict` also refuses any bullet with no `@` source, and any source page that does not open on Louise's shelves.
  Cards the agent's lane writes must pass `--strict`; Louise's own cards are checked without it.

## 4. The shelf: `kit/engine/shelf.js`

```
node kit/engine/shelf.js list  <agent>
node kit/engine/shelf.js find  <agent> "<words>"
node kit/engine/shelf.js show  <agent> <card file>
node kit/engine/shelf.js check <agent> [--strict]
```

- `list`: every card, one line each: `<file>  <title>  (<n> sources)`. Refused cards are listed after, with why.
- `find`: the cards that match the words, best first: `<file>  <title>`, then the matching fact lines with their
  sources. Exit `1` and `Nothing on my shelf about that.` when there is none. Refused cards are never returned.
- `show`: the card's title, sources and body.
- `check`: each card `ok` or `refused: <why>`. With `--strict`, also each unsourced bullet (`<file>:<line>`) and each
  source page that does not open on any of Louise's shelves (every root in her config), or has fewer lines than the
  `@` tag names. Exit `2` when anything is refused.

Example: `node kit/engine/shelf.js find nutrition "protein older adults"`

## 5. Memory: `kit/engine/memory.js`

What the agent learns about the person and from its own work. Kept in `agents/<agent>/memory/memory.jsonl`, on this
computer only.

```
node kit/engine/memory.js remember <agent> fact|worked|lesson "<text>" [--about "<subject>"]
node kit/engine/memory.js recall   <agent> [--limit <n>]
node kit/engine/memory.js lessons  <agent>
node kit/engine/memory.js forget   <agent> <id>
```

- `fact`: something the person told it (`--about "allergies"`). A newer fact about the same subject replaces the older
  one in `recall`; the older one is kept in the file.
- `worked`: something that helped, or did not. `lesson`: a rule the agent learned for itself.
- `remember` prints `Remembered <id>.` (`<id>` is `m-<number>`).
- `recall`: what a new session needs first: every lesson, the latest fact per subject, the most recent `worked` lines
  (`--limit`, default 20 each). Prints `Nothing remembered yet.` when empty.
- `lessons`: the lessons only. `forget`: removes one entry by id (the person asked), and says so.

Example: `node kit/engine/memory.js remember fitness fact "Knee feels sore after long runs" --about "knee"`

## 6. Louise's list: `kit/engine/louise.js`

```
node kit/engine/louise.js where
node kit/engine/louise.js ask        <agent> "<topic>" "<framing>"
node kit/engine/louise.js pending    <agent>
node kit/engine/louise.js gaps       <agent>
node kit/engine/louise.js send-gaps  <agent>
```

- **Where Louise is:** `LOUISE_DIR` when set; else the Hub root (`D:\Hub` then `C:\Hub`, the first with `CLAUDE.md`)
  with `20-Coding\Projects\louise` then `20-Coding\Active\louise`, the first holding `engine/requests.js`. None found:
  exit `2` with the paths it tried. `where` prints the folder.
- `ask` runs Louise's own `node engine/requests.js add "<topic>" "<framing>"` in her folder. The framing she gets starts
  `Asked by <name>, <title>, of the wellbeing agents (<agent>).` then the agent's framing. It records the request in
  `agents/<agent>/state/asked-louise.json` (`{ "requests": [{ "topic", "framing", "asked", "louise_dir", "status":
  "pending" }] }`) and prints her answer (`On Louise's list as number <n>.`). The same topic still pending is not asked
  twice: it prints `Already on Louise's list, asked <date>.`
- `pending`: the agent's requests still waiting for a book.
- **`knowledge/GAPS.md`** is where a lane writes what Louise's books did not cover, in her list's own shape:

  ```markdown
  # Gaps

  ## <topic, 200 characters at most>
  <framing: why the agent needs it, what would answer it>
  ```

  `gaps` lists them, each marked `asked` or `not asked`. `send-gaps` asks Louise each one not asked yet, once.
- Drills never write her real list: set `LOUISE_DIR` to a rig copy of her folder.

Example: `LOUISE_DIR=D:/tmp/rigs/cw1007-louise node kit/engine/louise.js ask dog-training "Recall training for herding breeds" "Our owner's dog ignores recall near sheep."`

## 7. Learning from Louise: `kit/engine/learn.js`

```
node kit/engine/learn.js <agent> [--dry]
node kit/engine/learn.js <agent> --topic "<pending topic>" --book <book id>
```

- For each pending request, runs Louise's `node engine/library.js find "<topic>" --json` in her folder and takes the
  best finished book shelved on or after the day it was asked. With `--topic` and `--book`, it takes that book for that
  request (the agent judged the match itself).
- It copies the book's summary card into `knowledge/louise-<slug>.md` with the card front matter (section 3,
  `origin: louise-card`), checks the copy, and marks the request `learned` with the book id and card file. Louise's
  shelves are never written: copy, never move.
- A book with no summary card yet is left for next time and named. `--dry` shows the matches and copies nothing.

Example: `node kit/engine/learn.js nutrition --topic "Protein needs in late pregnancy" --book 0-t-2026-10-09-protein-needs-in-late-pregnancy`

When a keeper's cards don't cover a question, it first looks for a book Louise already wrote, with no request on her
list:

```
node kit/engine/learn.js <agent> --find "<words>"
node kit/engine/learn.js <agent> --book <book id>
```

- `--find`: her finished books with at least half the words in their title or folder, best first:
  `<book id>  <title>  (<date>)`. Exit `1` with `Louise has no finished book on that yet.`, or with `Louise is not on
  this computer...` when she isn't.
- `--book` alone copies that finished book's summary card, as above, and touches no request.

## 7a. Keeping what it found on the web: `kit/engine/webcard.js`

```
node kit/engine/webcard.js save <agent> "<title>" "<fact> @<https://page>" ["<fact> @<https://page>" ...]
     [--question "<what was asked, with nothing about the person>"] [--tags "<a, b>"]
```

- The keeper read the pages itself (WebSearch, WebFetch); the script never fetches anything. Each fact is one plain
  line ending with `@` and the address of the page it came from (http or https, no login in it, a comma written
  `%2C`), at most 25 facts. A fact that names a page of Louise's book is refused.
- It writes `agents/<agent>/knowledge/web-<slug of the title>.md`, never over a card that is there, and reads it back
  through the shelf's reader: a card that would be refused is not kept.
- **A card from the web** carries `origin: web`, `fetched: YYYY-MM-DD` (and `copied`, the same day), the web addresses
  as its `sources`, and an optional `question`; it has no `louise_book`. Each fact ends with `@<https://the page>`.
  The shelf refuses one whose sources are not web addresses, that has no `@https://` source, or no `fetched` date;
  `shelf.js check --strict` also refuses a bullet with no web source, or one naming a page that is not in its
  `sources`. The kit never opens those pages.
- Then, only when Louise is on this computer, it asks her for a fuller book: `louise.js ask` with the title as the
  topic, and the card, the date and the question as the framing (never twice while it is pending). When she is not,
  it says so. It prints `Saved knowledge/<card>: <n> facts from <m> web pages, fetched <date>.` and that line.

Example: `node kit/engine/webcard.js save nutrition "Leftovers in the fridge" "<what the chart says, in one sentence> @https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts" --question "How long do leftovers keep?"`

## 8. The toolsmith: `kit/engine/toolsmith.js`

```
node kit/engine/toolsmith.js new   <agent> <tool> --purpose "<one sentence>" [--inputs "a,b"] [--cards "x.md,y.md"]
node kit/engine/toolsmith.js check <agent> <tool>
node kit/engine/toolsmith.js try   <agent> <tool> [args]
node kit/engine/toolsmith.js list  <agent>
```

- `<tool>` is lower-case words joined by `-`. `new` writes `agents/<agent>/tools/<tool>.js` from the kit template:
  its purpose, inputs and the cards it rests on, and a `run(__filename, (ctx) => ...)` body to fill in. It never
  overwrites a tool that is there.
- **What a tool may do.** It may `require` only `../../../kit/engine/tool-kit`. Everything else comes from `ctx`:

  | `ctx.` | What it is |
  |---|---|
  | `args` | `{ _: [positionals], <flag>: value }` from the command line |
  | `agent` | `{ key, name, dir }` |
  | `find(words)` | shelf matches: `[{ file, title, facts: [{ text, sources }] }]` |
  | `card(file)` | `{ title, sources, tags, body, facts }` |
  | `recall()` | the memory `recall` gives, as `{ lessons, facts, worked }` |
  | `state.read(name)` / `state.write(name, text or object)` | its own files under `state/tools/<tool>/` |

  The value the body returns is printed (JSON for an object).
- `check` refuses a tool that requires anything else (`http`, `https`, `net`, `dns`, `child_process`, `fs` included),
  that uses `fetch`, `process`, `module`, `exports` or `global` in its code, that calls `import()`, `eval` or
  `Function`, or that mentions `globalThis`, `constructor` or `__proto__` anywhere. Words inside strings and comments
  are prose ("play fetch", "processed food" are fine). Writes can only go through `ctx.state.write`, so nothing is
  written outside the agent's `state/`. Every card named on the tool's `Cards:` line must be on the shelf and not
  refused. The file must compile (`check` compiles it and never runs it). When it passes, `check` prints the
  registry entry for the lane to add. The check keeps an honest agent off the network; it is not a sandbox against a
  tool written to escape it.
- `sha256` is taken over the file with CRLF read as LF, so a checkout's line endings never stop a tool. The repo's
  root `.gitattributes` also checks every text file out with LF.
- **The registry**, `agents/<agent>/tools/registry.json`, written by the agent's lane only:

  ```json
  { "tools": [ { "name": "<tool>", "file": "<tool>.js", "purpose": "…", "inputs": ["…"], "cards": ["…"],
                 "sha256": "<from check>", "checked": "YYYY-MM-DD" } ] }
  ```

- A tool runs as `node agents/<agent>/tools/<tool>.js [args]`. It runs only when it passes `check` and its file
  matches the `sha256` in the registry; otherwise it stops and says why. `try` runs one that passes `check` but is not
  registered yet. `list` shows each registered tool and whether it still matches its entry.

Example: `node kit/engine/toolsmith.js new nutrition plate-check --purpose "Checks a meal against the plate guide" --inputs "meal" --cards "plate-guide.md"`

## 9. The fences: the web through two tools only

Owner, 2026-10-09: "allow them to search the internet for solutions when Louise is unavailable. They are useless
without accessing information and we cant rely on Louise for everything." Until then no keeper had the web at all.

- Every agent's `.claude/settings.json` (a copy of `kit/claude/settings.agent.json`) allows WebSearch and WebFetch,
  and denies every MCP tool and the shell's web commands (`curl`, `wget`, `iwr`, `irm`, `Invoke-WebRequest`,
  `Invoke-RestMethod`, in Bash and PowerShell). The root `.claude/settings.json` denies those too, and still denies
  the web as well: a chat at the repo root is not a keeper. When the kit's copy gains a rule, each agent copies it
  again: `fences.js check` requires every rule in the kit's copy.
- A room that talks (Avo's `dashboard/talk.js`, Tumble's `dashboard/routes.js`) exports `argv(agentDir, session)`,
  the Claude Code command line of one turn: `--restricted`, `--strict-mcp-config` with no MCP config, its own settings
  file, and the tools `Read, Grep, Glob, Bash, Task` (Avo also `Edit, Write` for her week draft), `WebSearch` and
  `WebFetch`, with Bash held to its own `node` commands.
- An agent's `CLAUDE.md` says the order it looks in when its cards don't cover a question: a book Louise already wrote
  (`learn.js --find`, then `--book`), the research library (`kit/library/<agent>/`), then the web straight away, with
  the page's address beside each fact, kept as a card (`webcard.js`, section 7a), which also puts the subject on
  Louise's list when she is on this computer. It names no fact without its source, searches for the topic and never
  the person, and keeps its emergency and referral lines first. It never reaches the web any other way: no connector,
  no MCP server, no shell command, script or tool that fetches anything.
- No tool the toolsmith passes can reach the network (section 8).
- `node kit/engine/fences.js check` checks all of it for every agent folder: exit `2` with what failed.

## 10. The dashboard shell: `kit/dashboard/shell.js`

An agent's `dashboard/server.js` is three lines:

```js
'use strict';
const path = require('path');
require('../../../kit/dashboard/shell').start({ agentDir: path.resolve(__dirname, '..') });
```

What the shell does:

- Listens on `127.0.0.1` only, on `port` from `agent.config.json`, else `probe.port` in `agent.json`. Writes
  `dashboard/.pid` while it runs and removes it on exit. A taken port: exit `1` with a plain sentence.
- `node kit/dashboard/park.js` opens every agent in `bundle.json` at once, in one process, each on its own port with
  its own routes, exactly as its own `server.js` would. It keeps `kit/dashboard/.pid` while any room is open. A taken
  port leaves that room out with a plain sentence; no room open: exit `1`.
- Answers only Host `127.0.0.1`, `localhost` or the `phone` host from `agent.config.json`. Any other Host: `403`.
- `GET /health` answers `{"ok":true}` with no token, always.
- A new token each start. The shell puts it in the page as `<meta name="kit-token" content="…">`. Every `/api/`
  request must send it as `X-Kit-Token` (`kit.js` does this), or gets `403`. A `POST` must be JSON, and from this
  page when the browser says where it came from (`Origin`, `Sec-Fetch-Site`).
- Pages: CSP `'self'` only (no inline scripts; inline styles allowed). Files served, never a dot-file:

  | URL | File |
  |---|---|
  | `/` | `agents/<agent>/dashboard/public/index.html` |
  | `/<file>` | `agents/<agent>/dashboard/public/<file>` |
  | `/art/<file>`, `/brand/<file>` | `agents/<agent>/art/`, `agents/<agent>/brand/` |
  | `/art.svg`, `/mark.svg` | the agent's figure and mark, from its folder |
  | `/kit/kit.js`, `/kit/kit.css`, `/kit/kindlemere.js`, `/kit/kindlemere-dog.js` | `kit/dashboard/public/` (the shared script, the page frame, the live scene, the dog's day and fetch) |
  | `/kit/kindlemere.html`, `/kit/kindlemere-page.js` | `kit/dashboard/public/`: the whole park, the page the office doors open; a click on a character steps into its keeper's room |
  | `/kit/design/<file>` | `kit/design/` (`tokens.css`) |
  | `/kit/art/<file>` | `kit/art/` |

- The API every agent gets (all `GET` except the last):

  | Route | Answer |
  |---|---|
  | `/api/agent` | `agent.json` as JSON |
  | `/api/shelf?q=<words>` | `{ cards: [{ file, title, sources, facts }] }`; every card when `q` is empty |
  | `/api/card/<file>` | `{ file, title, sources, tags, body }` |
  | `/api/memory` | `{ lessons, facts, worked }`, as `recall` |
  | `/api/louise` | `{ requests: [...] }` from `state/asked-louise.json`, and `{ gaps: [...] }` from `GAPS.md` |
  | `/api/tools` | `registry.json`, each tool with `ok` (it still matches its entry) |
  | `/api/realm` | `{ lat, lon }` from `kit/realm.config.json` (this computer's place, never committed), else `{}` |
  | `/api/park` | `{ rooms: [{ key, name, place, local, phone }] }`: each agent in `bundle.json` with its address here and, when its `agent.config.json` names one, its tailnet address |
  | `POST /api/ask-louise` `{ topic, framing }` | `louise.js ask`: `{ queued, message }` |
  | `/api/lanterns` | `kit/engine/lanterns.js list`: `{ louise, lanterns: [{ keeper, name, topic, asked, state, book, card }] }`, every keeper's question still out to Louise (state `waiting` on her list, or `researching` once a run has taken it) and any answered in the last 3 days, oldest first |
  | `POST /api/lantern` `{ keeper, question }` | `lanterns.js send`: a keeper from `bundle.json` and a question of 3 to 200 characters, through `louise.js ask`: `{ sent, already, louise: true, message }`; when Louise is not on this computer, `{ sent: false, louise: false, keeper, message }` and nothing is written |

- `kit.js` on the page: `kit.api(path, { method, body })` returns the parsed JSON; `kit.agent()` returns `/api/agent`;
  `kit.park()` returns the rooms from `/api/park` (fetched once, `[]` when it fails); `kit.address(place)` is a place's
  address from this page: `'realm'` is `/kit/kindlemere.html`, an agent's key is its room on this computer, or its
  tailnet address when the page came from there (`null` when it has none).
- The ways between places. On a page that shows the scene, `kit.js` puts a bar of places in the `.km-top` bar, before
  the room's own button: Kindlemere, Orchard, Hill, Field (`nav.km-nav`, `a.km-nav-way` with `data-place`, signs in
  each place's colour, the page's own place marked `aria-current="page"`). A plain click goes there by
  `kindlemere.go`; a place with no address is `aria-disabled`. Last on the bar, `button.km-nav-full` (shown once the
  scene is live) shows the scene full screen (`kindlemere.full()`).
- The live scene. When the page shows an `<img src="/kit/art/kindlemere*.svg">`, `kit.js` also loads
  `/kit/kindlemere-dog.js` and then `/kit/kindlemere.js`. That replaces the picture with a stack of depth layers (a
  `div` that keeps the image's class, id, alt, box, `object-fit: cover` and `object-position`) and runs it
  (`kit/REALM.md`, "Day and night", "Life", "The dog", "Between the places" and "Full screen"). The scene's own ids are prefixed per scene: find parts with
  `part()`, never by id. A picture whose address ends `#km-still` stays a still picture (`kindlemere.html`'s cards).
  A room that puts its own words and card over the scene marks them, so full screen takes them along: its stage (the
  element holding the scene, the words and the card) `data-km-stage`, its keeper's words `data-km-words`, and its card
  `data-km-card="<a short name for its button, Tumble's board>"`. Full screen then shows the stage: the words dock top
  left (their tail hidden, shown while the keeper is away), the card stands top right (on a narrow screen it opens as a
  sheet from a button with that name), and the room's own button in `.km-top` (its book) gets a button there too.

  | On `window` | What |
  |---|---|
  | `kindlemere:ready` `{ svg, scene, part }` | fired once per scene, after the page's own scripts have run. `svg` is the characters' layer, `scene` the stack, `part(name)` the element marked `data-km-part="<name>"`: `dog`, `dog-head`, `dog-pupils`, `dog-ball`, `telescope`, `sign-nutrition`, `sign-fitness`, `sign-dog-training`, `sign-louise`, `dog-house-<1..6>`, `dog-house-name-<1..6>` |
  | `kindlemere:character` `{ name, key, svg, scene }` | fired when a character is clicked, or pressed with Enter or Space: `name` is `Avo`, `Summer`, `Spud`, `Steady`, `Puff`, `Huff`, `Tumble`, `Barkley` or `Sizzle` (the dog is its own button: fetch). Cancelable: a room that answers calls `preventDefault()`, otherwise the kit shows the character's own line. In full screen it is fired when the room's stage came along (`data-km-stage`); with the scene alone (the Kindlemere page) the kit's own line answers in the scene. For Spud outside dinner, `up` is true while he is up out of the ground and `popped` is true on the click that brought him up (the kit pops him up itself; a room says his yawn) |
| `kindlemere:outside` `{ svg, scene }` | fired first (capture phase) when the open scene is clicked, not dragged, outside the room's card, a drawer and the scene's own buttons: a room closes its open chat or panel, and what was clicked (a character) still does its own thing after. Cancelable: with no room stopping it, the card's full-screen sheet closes too. A room's `<dialog>` drawer closes on a click on its backdrop (`kit.js`) |
| `kindlemere:spud` `{ up: false, svg, scene }` | fired when Spud, left alone, says goodbye and goes back into the ground. Cancelable: a room that answers calls `preventDefault()` and says his goodbye itself |
  | `kindlemere:dogs` `{ svg, names }` | fired by a page (Tumble's) when its dogs change: the kit shows one dog house per name (one at least, six at most) with the name on its board |
  | `kindlemere.hold(true \| false)` | a room busy with its own work (a run clock, a timer, a game) holds the keepers at home; `kit.js` defines it, so it is safe to call before the scene loads |
  | `kindlemere.go(url, place)` | go to another place: the camera glides toward `place` (`realm`, `nutrition`, `fitness`, `dog-training`) and the next page glides the rest of the way in (`#km-from=` on its address). Reduced motion: a plain page change |
  | `kindlemere.say(el, text)` | a line in the scene's paper bubble over `el` |
  | `kindlemere.full()`, `kindlemere.isFull()`, `kindlemere.toPlace(place)` | show the scene in view full screen (`REALM.md`, "Full screen"); whether a scene is; in full screen, glide the camera to a place (`realm`, `nutrition`, `fitness`, `dog-training`) without leaving the page |
  | `kindlemere.spud.up()`, `.stay()`, `.down()`, `.isUp()` | Spud out of the ground outside dinner (owner, 2026-10-09): pop him up, keep him up while a room talks with him (he goes back down by himself 20 seconds after the last stay or click), send him down now, and whether he is up. Reduced motion: no rise or sink, he just appears and goes |
| `kindlemere.line(key, own)` | a character's next line (`key` as in `data-km-actor`: `nutrition-summer`, `dog-training-sizzle`), from the room's own lines for it (`own`, an array) and the kit's dozen, never the line it said last |
  | `kindlemereDog.attach(svg, dogEl, { say, chatty })` | the dog's game on a scene's characters layer: its day, fetch and the commands. Returns `{ setPaused, state, show(cmd), beg, wake, asleep, visit(points), treat(spot, from), home, busy, where }`, or `null` without the dog's parts or the ground. `treat` runs it to `spot` ([x, y] in the world), sits it looking up at `from()` (a function giving the world point a biscuit is tossed from) and has it catch one (the kit's click on Sizzle). `chatty` says every line through `say`, not only the first hints |
  | `kindlemereDog.of(svg)`, `kindlemereDog.ground(svg)` | the game attached to a layer; the ground the art marks out (`inside`, `span`, `water`, `where`, `snap`) |
  | `kindlemereDogManual = true` | a room that brings its own dog sets this before the scene starts and attaches its dog itself on `kindlemere:ready` (Tumble's `fetch.js`) |

  The stack and every layer carry `data-km-night="1"` after dark and `data-km-evening="1"` from late afternoon
  through night. Every character is in a `[data-km-actor]` group with `data-km-name`. The characters' layer carries the
  ground from the art (`data-km-walk`, the outline the dog may walk; `data-km-shore`, the water's edge) and, from the
  live scene, the camera (`data-km-view`, the box shown in world units; `data-km-scale`, page pixels to a world unit).
- An agent may pass `routes` to `start`: `{ 'GET /api/<name>': (ctx) => object }`, where `ctx` is
  `{ agentDir, query, body }`. A route may not replace a kit route.

## 11. The realm

`kit/REALM.md` (the universe, its art style, each agent's place, the shared voice rules) and `kit/design/tokens.css`
(type, spacing, the shared ground, one palette slot per agent: `--nutrition-*`, `--fitness-*`, `--dog-training-*`).
An agent's page links `/kit/design/tokens.css` and `/kit/kit.css`, then its own css. The realm's art is in
`kit/art/` and drawn by `kit/art/make-kindlemere.js`: the scene and its close views, and every character in five
moods (`happy`, `thinking`, `oh`, `worried`, `sleepy`): the keepers as `kit/art/keepers/<agent>-<mood>.svg` and
their sidekicks as `kit/art/keepers/<agent>-<sidekick>-<mood>.svg` (`nutrition-summer`, `nutrition-spud`,
`fitness-puff`, `fitness-huff`, `dog-training-barkley`, `dog-training-sizzle`). The Field's dog, Barkley and Sizzle are
lane D's drawings, kept in the kit as `kit/art/parts/field-dog.svg` and `kit/art/parts/dog-sidekicks.js`.
