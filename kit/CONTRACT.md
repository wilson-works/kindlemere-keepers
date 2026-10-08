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

One Markdown file in `knowledge/`, one subject per card. Facts come from Louise's books, never from the builder's own
head or a web search.

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

## 9. No web

- The root `.claude/settings.json` and every agent's `.claude/settings.json` (a copy of
  `kit/claude/settings.agent.json`) deny web search, web fetch, every MCP tool, and the shell's web commands (`curl`,
  `wget`, `iwr`, `irm`, `Invoke-WebRequest`, `Invoke-RestMethod`, in Bash and PowerShell). When the kit's copy gains
  a rule, each agent copies it again: `noweb.js check` requires every rule in the kit's copy.
- An agent's `CLAUDE.md` says it answers only from its cards and its memory, says so when it cannot, and asks Louise.
  It also says the agent never reaches the web any other way: no shell command, script or tool that fetches anything.
- No tool the toolsmith passes can reach the network (section 8).
- `node kit/engine/noweb.js check` checks all three for every agent folder: exit `2` with what failed.

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
  | `/kit/kit.js`, `/kit/kit.css`, `/kit/kindlemere.js` | `kit/dashboard/public/` (the shared script, the page frame, the live sky) |
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

- `kit.js` on the page: `kit.api(path, { method, body })` returns the parsed JSON; `kit.agent()` returns `/api/agent`.
- The live scene. When the page shows an `<img src="/kit/art/kindlemere*.svg">`, `kit.js` also loads
  `/kit/kindlemere.js`. That replaces the picture with a stack of depth layers (a `div` that keeps the image's class,
  id, alt, box, `object-fit: cover` and `object-position`) and runs it (`kit/REALM.md`, "Day and night" and "At
  rest"). The scene's own ids are prefixed per scene: find parts with `part()`, never by id.

  | On `window` | What |
  |---|---|
  | `kindlemere:ready` `{ svg, scene, part }` | fired once per scene. `svg` is the characters' layer, `scene` the stack, `part(name)` the element marked `data-km-part="<name>"`: `dog`, `dog-head`, `dog-pupils`, `dog-ball`, `telescope`, `dog-house-<1..6>`, `dog-house-name-<1..6>` |
  | `kindlemere:character` `{ name, key, svg, scene }` | fired when a character is clicked, or pressed with Enter or Space: `name` is `Avo`, `Summer`, `Spud`, `Steady`, `Puff`, `Huff`, `Tumble`, `Barkley`, `Sizzle` or `dog`. Cancelable: a room that answers calls `preventDefault()`, otherwise the kit shows the character's own line |
  | `kindlemere:dogs` `{ svg, names }` | fired by a page (Tumble's) when its dogs change: the kit shows one dog house per name (one at least, six at most) with the name on its board |
  | `kindlemere.hold(true \| false)` | a room busy with its own work (a run clock, a timer, a game) holds the keepers at home; `kit.js` defines it, so it is safe to call before the scene loads |

  The stack and every layer carry `data-km-night="1"` after dark and `data-km-evening="1"` from late afternoon
  through night. Every character is in a `[data-km-actor]` group with `data-km-name`.
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
