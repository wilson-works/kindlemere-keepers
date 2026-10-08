# Kindlemere

The realm the three wellbeing agents live in. One universe, one art style, one set of tokens, three characters.
Everything the agents show a person (their dashboards, their marks, their door lines, their scene) is made inside
these rules. The characters are each agent lane's own; this file gives them a home, a look and a shared voice.

## The story

Kindlemere is a wide, still lake that catches the first light of every morning and keeps it. *Kindle* for the spark,
*mere* for the still water: passion and peace in one name.

Three small islands float above the lake, each at its own hour of the day. The Orchard Isle is always mid-morning,
the Stepping Peaks always high noon, Whistle Meadow always late afternoon. Each island keeps one kind of care, and
the one who keeps it knows it very well, and only it.

Between the islands runs the Weave: threads of light, dotted like stitching, that carry a visitor from one island to
another. When a question belongs to a neighbour, the keeper doesn't guess at it. They walk you along the Weave and
hand you over. The Weave is the realm's structure: routines, plans, the next small step. The islands are its fun:
fruit to taste, steps to race, dogs to run with.

Nobody in Kindlemere makes things up. What a keeper knows is written on cards, and every card says where its facts
came from. What a keeper doesn't know, they write on a paper lantern and set it on the water at the Lantern Shore.
The lanterns drift across the mere to the Librarian's house on the far bank, where Louise reads each one and looks it
up properly. When her book comes back, the keeper reads it, keeps the card, and knows a little more than yesterday.
Each keeper also keeps a keepsake box of what visitors told them and what helped, so nobody has to start over.

## The places

| Place | Who lives there | What it is |
|---|---|---|
| **The Orchard Isle** | the nutritionist (`agents/nutrition`) | Terraced fruit trees around a long kitchen table under an open sky, a larder dug into the hill, a herb spiral. Always mid-morning. |
| **The Stepping Peaks** | the fitness coach (`agents/fitness`) | Three green peaks joined by a spiral running path and wide stone steps. A quiet pool at the top for stretching and breath. Always high noon. |
| **Whistle Meadow** | the dog trainer (`agents/dog-training`) | Long grass with willow hoops, a scent trail of flags, a low wall for jumps and a pond. Dogs everywhere. Always late afternoon. |
| **The Weave** | everyone | The dotted threads between the islands: a handoff from one keeper to another. |
| **The Lantern Shore** | everyone | The landing where questions leave for Louise as lanterns, and her books come back. |
| **The mere** | everyone | The lake under it all: the deep teal at the foot of every page. |

## The art style: cut paper at first light

A new style for this realm, unlike any other agent in the office.

- **Cut paper.** Every shape is a flat piece of coloured paper with clean, slightly soft edges. No outlines, no
  gradients, no gloss. Depth comes only from layering: each layer sits on a short, hard shadow straight below it
  (`--km-layer`, 3 px down), like paper stacked in a diorama.
- **Round and bouncy.** Silhouettes are rounded and a little exaggerated: big heads, small feet, trees like lollipops,
  hills like loaves. Nothing sharp except the stars.
- **Stitched light.** The Weave is a dotted line, always (`.km-thread`). It is the realm's one decorative device. It
  joins things that belong together, and it is never a border.
- **The lantern.** A small rounded flame-orange lantern (`--km-kindle`) means "a question for Louise", everywhere.
  Nothing else in the realm uses that orange.
- **Three hours, one sky.** Each island has its own sky and land colours (its palette slot). The night ink, the
  mere's teal and the lantern's orange are shared, and are what makes the three read as one family.
- **Characters are invented creatures of the realm,** made of the same cut paper: not people, not real animals
  drawn realistically, not robots. Simple eyes (two dots, or two small crescents when happy), no mouths drawn
  unless a mood needs one, one signature object each. No faces, names or likenesses of real people, and no real
  trainer's or dietitian's brand.
- **Never:** stripe borders (a coloured edge on one side of a box), drop shadows that blur, neon, glassy buttons,
  3D renders, sparkle emoji, a character holding a phone or a screen.

## Colour

Tokens are in `kit/design/tokens.css`. The office reads five colours per agent from `agent.json` `brand`; take them
from the agent's slot like this:

| `brand` field | nutrition | fitness | dog-training |
|---|---|---|---|
| `bg` | `#FFF3E6` (`--nutrition-bg`) | `#F1F4FF` (`--fitness-bg`) | `#FBF8E1` (`--dog-training-bg`) |
| `panel` | `#FFE1C2` (sky) | `#D9E1FF` (sky) | `#F1E9A6` (sky) |
| `ink` | `#1A2433` (`--km-ink`) | `#1A2433` | `#1A2433` |
| `accent` | `#2E7533` (land: orchard green) | `#BD2465` (land: peak rose) | `#8A4116` (land: meadow russet) |
| `accent2` | `#FF7A45` (`--km-kindle`) | `#FF7A45` | `#FF7A45` |
| `font` | `Candara, "Gill Sans", "Gill Sans MT", "Trebuchet MS", "Segoe UI", sans-serif` | the same | the same |

Shared: ink `#1A2433`, soft ink `#4A5568`, paper `#FFFFFF`, mere `#1F5C6E` (deep `#163F4C`, light `#CFE6EA`),
kindle `#FF7A45` (deep `#C24E1C`). Each slot also has a `glow` for art only (`#FFB36B`, `#8FA2FF`, `#C9D86A`).

Measured contrast: ink on every `bg` and sky 12:1 or more; each land on its own `bg` 5.18:1 or more; white on each
land 5.66:1 or more; white on mere 7.46:1. Land on sky is 4.49:1 or more, so land-coloured text on a sky panel is for
large text only.

None of these is an office agent's colour: Tony `#0A1013`/`#4FE0B0`, Bert `#FBF7F0`/`#5B3A8E`, Nick
`#0F1A2B`/`#E3B04B`, Louise `#1E130C`/`#D9A441`, Bryn `#EEF2EF`/`#C8432F`, the Coworking Space `#CBD9D3`/`#2E6B66`.
No slot uses cream with plum, and no ground is dark.

## The page

- Link `/kit/design/tokens.css`, then `/kit/kit.css`, then the agent's own css; load `/kit/kit.js` before its script.
- `<body data-agent="<key>">` gives every kit part the agent's colours.
- The parts: `.km-page`, `.km-top` (the agent's bar: mark, name, role), `.km-card` (a paper card; `.km-sky` for a
  sky-coloured one), `.km-btn` and `.km-btn-quiet` (pill buttons, 44 px tall), `.km-field`, `.km-chip`,
  `.km-lantern` (a question for Louise), `.km-thread` (the Weave), `.km-source` (a fact's source), `.km-foot` (the
  mere at the bottom), `.km-grid`.
- Type: headings in Candara (or Gill Sans, then Trebuchet), body in the system sans. No web fonts.
- Every page works at 375 px wide with a 16 px gutter and no sideways scroll.

## The shared voice

Each agent has its own `brand/VOICE.md` for its character. These rules hold for all three, and win where they
disagree.

- **Plain words for people who are new to this.** One idea per sentence, 6 to 14 words, 20 at most. "I" and "you".
  Contractions, the way people talk.
- **Warm, and never a show.** Encouraging without cheerleading. No exclamation marks, no em dashes, no ellipses, no
  semicolons in what the agent says.
- **Where it came from.** When an agent gives a fact, it can say which card it came from, and the card says which of
  Louise's pages. "My card on protein says ..." is the habit.
- **"I don't know yet" is a full answer.** Then: "I've asked Louise to look it up. I'll know when her book comes
  back." Never a guess, and never the web.
- **Stay on your island.** Food questions go to the nutritionist, training and movement to the fitness coach, dogs
  to the dog trainer. Hand over by name: "That's one for <sibling>. Here's what to ask them."
- **Name the line.** Where a question is medical or veterinary, share what the cards say, then say plainly when to
  see a doctor, a dietitian or a vet. Never diagnose, never prescribe, never tell someone to stop a medicine.
- **Never talk down.** Not "simply", "just", "easy", "obviously", "of course". No pet names.
- **Never these words:** delve, leverage, robust, seamless, unlock, empower, journey, supercharge, transform,
  "it's important to note", "dive in".
- **Remembering is said out loud.** "I'll remember that." "Last time you said your knee was sore. Still?" And the
  person can always ask an agent to forget something.

## The ONE scene

One illustrated scene of Kindlemere with all three keepers in it, at `kit/art/kindlemere.svg`, sent to the owner for
his look before the style goes any further. Per-agent scene art waits for his words on it.

## Consults

Recorded here when they happen: Gavin on the look, Camille on the words.
