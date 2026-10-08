---
council: 2026-10-07T03-30
date: 2026-10-07
run: research-2026-10-07T00-43
marathons: [2026-10-07-nutritionist-agent, 2026-10-07-health-and-fitness-agent, 2026-10-07-dog-training-coach-agent, 2026-10-07-mcp-connectors-for-web-apps, 2026-10-07-live-multi-agent-team-collaboration]
reviewed: 5 marathons · 7,543 lines · 342 sources · 3,808 claims checked
---

# Marathon-Research Council — verdict, 2026-10-07 03:30 CDT

Five advisors, five anonymous peer reviewers, one chairman. The transcript is in
`council-transcript-2026-10-07T03-30.md`.

## Where the council agrees

- **One stateless `/mcp` route, revision 2026-07-28, in the product's own repo, read-only by default, writes as a separate scope.** All five advisors landed here and I endorse it — not on the convergence but because the marathon itself ships a numbered 10-step build order with each step tied to a MUST (`2026-10-07-mcp-connectors-for-web-apps`, `02-producing-mcp-servers.md:470–500`). Verified: `server/discover` is a MUST, `destructiveHint` defaults to `true` so silence advertises destruction, audience validation is the MUST NOT that kills token passthrough. This is the only marathon in the pack whose output a machine can grade.
- **The approval gate is built as documented, as configuration plus a sweep — not as a service.** `always_ask` on exactly the irreversible tools, indefinite unbilled wait, `session.status_idle` with `stop_reason.type: requires_action`, `user.tool_confirmation` carrying `tool_use_id` and a `deny_message`, fetch-the-session rather than trust the payload, idempotent pre-gate side effects, plus a reconciliation sweep because webhooks drop after three attempts (`2026-10-07-live-multi-agent-team-collaboration`, `03-human-in-the-loop-and-deliberation.md:17,35,62–99,142`). I verified this is a Managed Agents platform feature resolved by one event type — a day of work, not a component.
- **Phases 2–6 of the fleet build do not start until Phase 0 has a number** (`live-multi-agent-team-collaboration`, `05-mapped-to-workflow.md:221`). The research defines Phase 0 as "the baseline every later phase must beat"; building Phase 2 first destroys the only evidence that would justify it.
- **MCP Apps waits.** Per-host extension, sell as enhancement, never as the integration (`mcp-connectors-for-web-apps`, `02-producing-mcp-servers.md:481`).
- **LIMA as a declared default with the disagreement disclosed in one sentence; breed is a motivational prior, never a behavioural prediction** (Morrill 2022, n=18,385, breed ≈9% of between-individual variation) (`dog-training-coach-agent`). I take the Contrarian's refinement over the pack's framing: 19 dogs with a published methodological critique attached is not a counterweight to a four-body consensus position, and presenting it as one reads as hedging for the shock-collar market.
- **The DGA 10th edition is contested content the agent names as contested; anything built on the ACSM 2009 stand is dead** (`nutritionist-agent`, `health-and-fitness-agent`). These are content facts, not build decisions, and they are the only things those two marathons settle.

**Two agreements moved to the clash section as artifacts:** "all five marathons specify one gate" (false — see below), and "build the dog coach first" (all five said it; none named a buyer).

## Where the council clashes

- **One gate, or three layers?** The Expansionist ("six independent specifications of one object… build it once as a service"), the Executor (WO-4) and the First Principles Thinker ("build the escalation table as deterministic code outside the model") versus Reviewers 4 and 5. **Ruling for Reviewers 4 and 5, and the margin is not close.** Checked: across `nutritionist-agent` and `dog-training-coach-agent`, the strings `tool call`, `tool_use`, `endpoint`, `function call`, `deterministic` and `outside the model` appear **zero times in either marathon**. Those agents have no tools. Their "irreversible action" is emitting a sentence, so there is nothing for an interceptor to intercept. Meanwhile `always_ask` is a host-platform permission policy resolved by a session event (`live-multi-agent-team-collaboration`, `03`:35, 72–73), and MCP's confirmation gate is server-side with a 24-hour-expiring token whose annotations the same marathon says clients **MUST** treat as untrusted (`mcp-connectors-for-web-apps`, `02-producing-mcp-servers.md:199–201`; `05-positioning.md:112`). A single gate object spanning all three either demands human approval of ordinary prose or silently approves every clinical escalation. **Ruling: three layers, named separately. What they share is a vocabulary — a typed reason code and a deny message — not a runtime.**
- **Tony's live-money guard as a "waiting consumer."** The Expansionist counts it as one of six consumers of the unified gate. Reviewers 4 and 5 call that a HELD-class change to a shipped, owner-ruled fence. **Ruling for Reviewers 4 and 5.** The guard and `qbo_match` are shipped and ruled; folding them into a new service needs its own ruling and buys nothing. They stay untouched and are not cited as leverage.
- **Three parallel first builds and a new "agent-readiness pipeline" product line** (the Expansionist) versus one build at a time (the Executor, the First Principles Thinker; Reviewers 4 and 5). **Ruling against the Expansionist.** Three parallel builds is three times the capacity that exists, and a sellable pipeline is a new product line in a one-owner shop. The Expansionist's cross-marathon *observation* is the sharpest in the pack; its *prescriptions* are for a company with departments.
- **A legal and insurance pass before nutrition/fitness ship** (the Contrarian) versus one owner decision (the Executor, the First Principles Thinker; Reviewers 2 and 3). **Ruling against the Contrarian on the prescription, for the Contrarian on the finding.** There is no counsel function, so the hold has no owner and no finish line, and nothing has shipped — liability attaches at release, not at research. But the Contrarian's sourcing audit is the single most valuable response in this pack and it is adopted below.
- **Who gets built first after MCP: the dog coach (all five advisors) or nobody (the chairman).** **Ruling against all five, on Reviewer 3's reasoning.** Reviewer 3 caught that the dog marathon "carries the largest decision on the thinnest scrutiny" — four advisors faulted other marathons for naming no buyer and then selected dog training, unrelated to web apps or bookkeeping, without asking who pays for it. The only argument offered for it is *lowest liability*, which is an argument for which one to build **if** one is built. Under "deliver; don't add," no domain agent is sequenced. All three packs are shelved content pending the one owner question.
- **Nutrition and fitness: one agent or two?** The Executor and the First Principles Thinker say the split is an artifact of two queue rows, and cite `live-multi-agent-team-collaboration`'s own specialization trigger — 15–20+ tools or conflicting behavioural modes, not job title; two agents sharing a prompt and toolset are one agent with two labels. **Ruling: they are one advisory agent with two knowledge packs, recorded now as a content decision.** It costs nothing while both are shelved, and the `07-nutrition-interface-boundary-note.md` seam stops being load-bearing.
- **Is the convergence itself evidence?** Reviewers 1, 3 and 4 warned it is an artifact: three near-identical briefs through one skill is n=1 on the tooling, and this council is the unprotocolled debate the research says collapses into modal adoption. **Ruling: discount the convergence, and there is one hard instance of the mechanism.** The First Principles Thinker asserted it grepped all 36 sources and five chapters of the MCP marathon and found "zero mentions of Balnce.Pro, grindquest, Bar-Key, or any actual product." That is false — `WilsonWorks` appears three times, including an entire section headed "Recommendation — what WilsonWorks should build first" (`02-producing-mcp-servers.md:3,465`) and a reading that generalises the data-exclusion pattern "directly to the bookkeeping and tax work" (`05-positioning.md:127`). Reviewer 5 then wrote "I verified E's grep." **A reviewer confirmed a check that fails on the first run.** Only the convergent conclusions re-derived from the files directly are kept, and the First Principles Thinker's Balnce.Pro pick survives on the house rule that names Tony's missing direct calls, not on its own evidence.
- **Phase 0's missing metric: research gap or design decision?** The First Principles Thinker calls `live-multi-agent-team-collaboration` structurally incomplete. **Ruling: design decision. No new marathon.** Checked `04-observability-failure-cost.md:122–125`: it supplies the metric method — LLM-as-judge against a rubric of factual accuracy, citation accuracy, completeness, source quality and tool efficiency scored 0.0–1.0; end-state rather than turn-by-turn evaluation; ~20 test cases for rapid iteration; human testing retained — plus an MAST-mode trace judge at 94% accuracy and Cohen's kappa 0.77, and per-thread token/cost via `list_cost`. What is absent is *the agency's own twenty fixtures*, which no amount of web research can produce because they are drawn from the agency's own work orders. That is a half-day of fixture authoring, chunked below.

## Blind spots the peer review caught

- **The pack is the unmeasured multi-agent evidence.** Reviewers 1, 3 and 4 independently: the pipeline that produced these five marathons *is* an orchestrator-worker system with a cheap scope-checker, isolated contexts, an LLM-judge validator, a five-advisor council and anonymous peer review — 342 sources overnight at exactly the dependency density Anthropic's write-up excludes (`live-multi-agent-team-collaboration`). Every advisor demanded a Phase 0 baseline before Phase 2 while holding unmeasured Phase 2+ output in their hands. Nobody has compared one Opus agent with web search against marathon + validator + council + distill.
- **Direction (a) of the MCP brief — consuming — got zero coverage from all five advisors** (Reviewer 2). The fleet already consumes third-party servers under Rule #3, so `mcp-connectors-for-web-apps`'s measured hazards are an audit of a running system: MCPTox 36.5% average / 72.8% peak tool-poisoning success, `mcp-client-2026-09-15` tool-list pinning as the only published defence against a mid-conversation tool-surface change, Anthropic vetting nothing, and the Claude API connector being tool-calls-only and not ZDR-eligible. This is the cheapest safety win in the pack and no advisor mentioned it.
- **The distribution rail and the coded escalation cancel each other** (Reviewers 2 and 5). If a domain agent ships as an MCP server into Claude or ChatGPT, the host's model does the refusing and the crisis-line referral; the escalation table arrives as a tool annotation, which the same marathon says MUST be treated as untrusted. The Expansionist's rail and the First Principles Thinker's coded gate are mutually exclusive and neither noticed.
- **`health-and-fitness-agent` carries the most claims (937) and the least scrutiny** — all five reviewers said so independently, which is reviewer agreement across five different responses rather than advisor agreement on one brief, and it is weighted accordingly. Only the Contrarian examined it on its own terms. Its highest-liability content went unexamined by four of five: special populations, pregnancy contraindications resting on CSEP 2019 because ACOG and BMJ blocked fetching, the ACSM cancer consensus, the Zone 2 marker disagreement (CV 6–29%), and ~8% meditation adverse events with suicidal ideation in 11% of studies assessing harms. Reviewer 5's question stands unanswered: an agent that escalates on suicidal ideation does not belong in anyone's "low-liability" tier.
- **The 0-flagged validator is MAST's own failure mode observed in production** (Reviewers 1 and 3). Incorrect verification 9.1% and no/incomplete verification 8.2% are the two highest-prevalence quality modes after step repetition, and they describe the validator and this council — the two steps whose output becomes work orders, neither carrying a verification standard. The validator proved 3,808 URLs resolve. It distinguished nothing between Morrill's 2,155 sequenced genomes and a press release about a paywalled paper.
- **WebFetch failed on primary PDFs in three of five marathons** (the Expansionist) — ACSM 2009 and 2026, the DGA, ACOG, BMJ. One shared acquisition gap that taxes every future marathon.

## Per-marathon build-ready cards

### `2026-10-07-mcp-connectors-for-web-apps`

- **Decision:** Build one stateless read-only `/mcp` endpoint at revision 2026-07-28 on Balnce.Pro, inside the Balnce.Pro repo, scoped to the lookups Tony currently guesses at. Separately, audit the servers the fleet already consumes. Do not buy the positioning deck.
- **Stack pick:** `mcp-handler` v2 as a single route handler; revision `2026-07-28` pinned in docs and the `MCP-Protocol-Version` header; Intercom/OpenAI `search` + `fetch` names; Stripe's `search`→`details`→`read`/`write` triad as the shape writes will later take; Linear's separate read-only URL; HubSpot's declared field exclusion; RFC 9728 Protected Resource Metadata. Not: DCR, Sampling, Roots, Logging, sessions, resumable SSE, own authorization server, own registry.
- **Open questions:** Does a Balnce.Pro MCP surface already exist for Tony as a local/stdio server? Chunk M1 begins by answering that; if it does, M1 is "bring it to an HTTP route at rev 2026-07-28," not "write one." Which IdP fronts it. Whether the first write tool is scoped at all in v1 (recommend: no writes in v1 — Rule #3).
- **Build chunks:**
  - **M1 — the route.** Stateless `/mcp` via `mcp-handler` v2 in the Balnce.Pro repo; `server/discover`; exactly two tools, `search` and `fetch`, both `readOnlyHint: true`; deterministic tool order; `ttlMs` on list results; responses budgeted under 25,000 tokens / 50,000 characters. *Accept:* Claude Code connects to the deployed URL; `server/discover` responds; `tools/list` returns exactly two tools both carrying `readOnlyHint: true`; `search` returns ≥1 hit for a known client code; `fetch` returns that record; the response echoes `MCP-Protocol-Version: 2026-07-28`.
  - **M2 — authorization.** Static PRM document plus a `401` challenge carrying `scope`; audience validation rejecting any token not issued for the canonical resource URI; `scopes_supported` containing the read scope only. *Accept:* unauthenticated request returns `401` with `WWW-Authenticate` naming the scope and the PRM URL; a token minted for a different audience is rejected; the correct token succeeds. This test is the executable form of the token-passthrough MUST NOT.
  - **M3 — tenancy.** Every state handle bound server-side as `<user_id>:<handle>` from the verified token. *Accept:* a handle issued under user A, replayed with user B's token, errors and returns none of A's data.
  - **M4 — the declared exclusion.** One documented list of fields that never cross the MCP boundary, enforced by a filter. *Accept:* a record containing an excluded field returns without it; a test asserts the code filter list and the published docs list are identical; no client name, amount or memo appears in any tool output.
  - **M5 — the consuming audit** (Reviewer 2's catch). Enable `mcp-client-2026-09-15` tool-list pinning on every third-party MCP server the fleet consumes, and write the one-page inventory: server, scopes granted, whether Rule #3's read-only default was deliberately lifted and why. *Accept:* the inventory exists and every write scope on it carries a written reason or has been removed; pinning is configured and the pinned surface recorded.
- **Depends on:** nothing. This is the root of the graph.

### `2026-10-07-live-multi-agent-team-collaboration`

- **Decision:** Build Phase 1 (the gate) and measure Phase 0. Do not build the ten-step fleet, the deliberation trailhead, or parallel engineering instances. The six-agent premise is dead and the research killed it: 3–10× tokens, Anthropic's write-up explicitly excluding real-time coordination and dense inter-agent dependency, only steps 4 and 5 of ten passing the parallelization test.
- **Stack pick:** Managed Agents `always_ask` permission policy; `user.tool_confirmation`; wake on `session.status_idled` plus `session.thread_idled`; a reconciliation sweep over `requires_action`; OpenTelemetry GenAI span names (`invoke_agent`, `execute_tool`) with the caveat that the conventions are marked Development; the LLM-judge rubric from `04-observability-failure-cost.md:122`. Deliberation is a checklist the engineering lead runs, never an agent.
- **Open questions:** which exact tools are "irreversible" in the current engineering-lead config — that list is the whole gate and it is an engineering decision, not an owner one. What the sweep interval is.
- **Build chunks:**
  - **L1 — the gate.** `always_ask` on exactly the enumerated irreversible tools; never `auto`. *Accept:* a run calling one pauses with `stop_reason.type: requires_action` and blocking IDs in `stop_reason.event_ids`; `user.tool_confirmation` with `allow` resumes; `deny` with a `deny_message` reaches the model; a confirmation sent for an event whose `evaluated_permission` is not `ask` returns 400.
  - **L2 — the sweep.** A periodic list of sessions in `requires_action`, reconciled against the approval queue. *Accept:* with the webhook endpoint deliberately unreachable, the pending approval appears in the queue within one sweep interval and still resolves; nothing auto-approves.
  - **L3 — idempotency.** Every pre-gate side effect keyed and replay-safe, because code before the interrupt runs again on resume. *Accept:* a pre-gate write replayed twice leaves exactly one row; duplicate event ids dedupe; state is read from a fetch, not from event order.
  - **L4a — the fixtures.** Twenty cases drawn from real completed work orders, each with an end state a judge can score. *Accept:* 20 cases committed, each with an explicit pass condition; no case requires a human to read a transcript.
  - **L4b — the Phase 0 number.** One engineering-lead agent, full toolset, no delegation, scored end-state against the five-dimension rubric (factual accuracy, citation accuracy, completeness, source quality, tool efficiency, 0.0–1.0), with per-thread token and cost recorded. *Accept:* a single aggregate number plus a cost figure, written where Phase 2 will be compared to it; the run repeated once and the variance recorded. Phase 2 is not authorized until this file exists.
- **Depends on:** L1–L3 depend on nothing. L4b depends on L4a. Nothing in Phases 2–6 may start before L4b.

### `2026-10-07-nutritionist-agent`

- **Decision:** Content only. Shelved pending the one owner question. One correction ships now, because the pack currently contradicts itself in a way its own validator cannot see and anyone building on it would inherit the contradiction.
- **Stack pick:** none — content only.
- **Open questions:** who buys it (the owner question). What the agent may remember about a user's health — retention, minors, HIPAA-adjacency appear in no source in the pack. Whether it serves anyone outside the US, given DGA, USDA and the SCOFF/988 referral chain are all US instruments. None of these are researchable; all three are decisions, and none is needed while the pack is shelved.
- **Build chunks:**
  - **N1 — reconcile the protein guidance.** The Contrarian's finding, verified: `01-overview.md:37` states that a blanket high-protein message is risky because fewer than 15% of people with CKD know they have it, and `05-nutrition-exercise-interface.md:38–39` then hands over 2.3–3.1 g/kg/day and ">3.0 may promote additional fat-mass reduction," with the healthy-population scope sitting in prose two lines below the table. Fix: every protein row above 2.0 g/kg/day carries its healthy-population scope and the CKD prescription (0.55–0.60 g/kg/day) in the same row. *Accept:* a grep for `g/kg` across the pack returns no value above 2.0 whose own row lacks both the scope and the counter-number.
- **Depends on:** the owner question. Merged with `health-and-fitness-agent` as one advisory agent's two content packs.

### `2026-10-07-health-and-fitness-agent`

- **Decision:** Content only. Shelved with the nutrition pack as the second knowledge pack of one advisory agent, not a sibling agent. Its sourcing is repaired before anyone quotes it to a client, because the one claim the agency would sell on — "we are current, competitors are on the 2009 stand" — rests on a press release about a paper nobody read. Four of five reviewers flagged that this marathon got the least scrutiny in the pack; that is treated as the finding it is.
- **Stack pick:** none — content only.
- **Open questions:** whether this pack's mind-body content belongs in a consumer-facing agent at all, given ~8% meditation adverse-event incidence with suicidal ideation in 11% of studies assessing harms. That is the one place where "lowest liability first" reasoning in this council was simply wrong.
- **Build chunks:**
  - **F1 — second-source the headline.** Each of the five ACSM April 2026 numbers (≥80% 1RM × 2–3 sets, ~10 sets/muscle/week, 2×/week, failure optional, equipment irrelevant) gets either the Currier et al. paper itself or a second independently extractable source; anything that cannot get one is labelled `asserted` in the file. *Accept:* no ACSM 2026 number in the pack is sourced solely to an ACSM announcement without an `asserted` label on the same line.
  - **F2 — repair the pregnancy section.** Contraindications currently rest on the 2019 CSEP guideline because ACOG and BMJ blocked fetching. *Accept:* ACOG CO 804's contraindication list is present from an extractable source, or the section carries an explicit note that it is CSEP-2019-only and names what is missing.
- **Depends on:** the owner question. N1 and F1/F2 are independent and either can run first.

### `2026-10-07-dog-training-coach-agent`

- **Decision:** Content only, shelved — overruling all five advisors, who made it the pilot. It has the cleanest evidence in the pack and no buyer anywhere in the agency's business. Two cheap edits ship: the methodology stance gets recorded as the one-paragraph policy pick it is, and the pack's best transferable artifact — the evidence-strength label vocabulary — moves into the research report template, which is the one place in the house with a real consumer for it today.
- **Stack pick:** none — content only.
- **Open questions:** who pays for it. Reviewer 3's question, asked of no advisor's answer.
- **Build chunks:**
  - **D1 — record the stance.** One sentence stating reward-based/LIMA as the declared default, one sentence disclosing the professional disagreement, and the Johnson & Wynne 2024 entry carrying its n (19 dogs) and its published methodological critique on the same line as the claim. *Accept:* the methodology file states the default and the disagreement in two sentences; no contested-area entry presents a single small trial as a peer of a multi-body consensus position without its n beside it.
  - **D2 — lift the labels** (lowest priority; the Contrarian's catch, validated by Reviewers 1 and 3). The five evidence-strength labels this pack invented — professional consensus position / replicated experimental / large observational / single small trial / practice convention with weak direct evidence — plus a second axis of *measured / asserted / inferred*, go into the research report template. One line in a template, not a process. *Accept:* a fresh `quick-research` run emits both labels on every load-bearing claim.
- **Depends on:** nothing. D2 improves the pipeline that produced this pack.

## Cross-marathon dependency graph

```
mcp-connectors (M1 route) ──┬─> M2 authz ──> M3 tenancy ──> M4 declared exclusion
                            └─> (independent) M5 consuming audit  [Reviewer 2's catch]

live-multi-agent L1 gate ──> L2 sweep ──> L3 idempotency        [independent of MCP]
live-multi-agent L4a fixtures ──> L4b Phase 0 number ──X──> Phases 2–6 BLOCKED until L4b exists

nutritionist N1 ─┐
fitness F1,F2  ─┼─> [one advisory agent, two content packs] ──> BLOCKED on the owner question
dog D1         ─┘
dog D2 ──> research report template  (serves the pipeline, not a product)

Negative edge, ruled: mcp-connectors ──X── domain packs.
  Shipping a tool-less advisory agent as a public MCP server hands its only safety
  control to a host the agency cannot audit, because annotations are untrusted hints.
  The rail and the escalation table cancel. ADR-3.

Negative edge, ruled: unified-gate service ──X── Tony's live-money guard / qbo_match.
  Shipped, owner-ruled fence. HELD-class. Not touched, not cited as leverage.
```

## The first PR

**`feat(balnce): read-only MCP endpoint at /mcp, revision 2026-07-28`** — chunk M1, in the Balnce.Pro
repo, one route handler via `mcp-handler` v2, no new infrastructure, no auth work (that is M2), no
writes.

Step zero of the PR: establish whether a Balnce.Pro MCP surface already exists for Tony. If it does,
this PR brings it to an HTTP route at rev 2026-07-28 rather than writing a second one.

Acceptance test, all five in CI or a recorded manual run:

1. Claude Code connects to the deployed URL and lists tools.
2. `server/discover` responds; the response carries `MCP-Protocol-Version: 2026-07-28`.
3. `tools/list` returns exactly two tools, named `search` and `fetch`, both with `readOnlyHint: true` set explicitly.
4. `search` with a known client code returns ≥1 hit; `fetch` on that hit returns the record.
5. No tool output contains a client name, an amount or a memo — only client codes. (Standing fence, `.claude/rules`.)

Why this one: it is the only chunk in the pack with a perishable spec, an existing repo, a named
in-house consumer, and a read-only default that already matches Rule #3 — and it is the only
acceptance test in this verdict that a machine grades without a human reading prose.

## What still needs an ADR

- **ADR-1 — MCP revision pin and the re-check cadence.** Pin `2026-07-28` and record *who re-reads the spec and when*. The Contrarian's point survives: a revision that deleted `initialize`, sessions and resumability in one pass will do it again, so "built against 2026-07-28" is a dated badge, not a moat. Three of five marathons' headline is "the authoritative document just changed" (DGA January 2026, ACSM April 2026, MCP 2026-07-28) and the pack sets no re-check cadence anywhere. The ADR sets one.
- **ADR-2 — the three gate layers.** Name them, say which refusal each owns, and state in writing that they are not merged and that Tony's live-money guard and `qbo_match` are out of scope. This ADR exists specifically so the next reader does not re-derive "six specifications of one object."
- **ADR-3 — domain agents do not ship as public MCP servers** while their only safety control is prose the host's model may ignore. Sourced to `mcp-connectors-for-web-apps` on untrusted annotations and on Anthropic vetting nothing.
- **ADR-4 — the validator's verification standard.** The 0-flagged number means URLs resolve, nothing more. The ADR states what the validator does and does not certify, so no deck ever cites it as "the research is sound."

## The one question for the owner

**We have three finished, fully-cited expert knowledge packs — nutrition, fitness and dog training —
and no named buyer for any of them. Do you want one of them turned into a demo agent we can show
clients, or all three shelved until a client asks for one?**

Recommended answer: **shelve all three.** Ship the Balnce.Pro MCP endpoint and the approval gate
instead — both serve work that already earns money, both are a day each, and both are testable by a
machine. The three packs lose nothing by waiting; they are cited content and they do not rot for a
few months, except for the two sourcing repairs above, which are cheap and happen regardless. If you
want a demo anyway, the dog pack is the one to use: no licensure, no crisis line, no health data.

## Things we feel but cannot show

- **That domain-expert agents are a sellable line.** No marathon in the pack prices anything, names a buyer, or scopes acquisition. The Outsider reports that `05-positioning.md` contains a single `$` and it is a footnote; that grep was not re-run, but the positioning chapter's own framing argues capability, not purchase.
- **That the advisor convergence is sycophancy rather than correctness.** Three reviewers warned it, and exactly one instance of the mechanism can be shown — a false grep claim that a reviewer then "verified." One instance is evidence that the mechanism operates here. It is not a rate. And the Contrarian's objection cuts the other way too: the 85.5% modal-adoption figure comes from 7–8B models (Qwen2.5-7B, Llama-3.1-8B, Ministral-3-8B) and the paper itself says so, so the warning is not sourced for an Opus council either.
- **The liability exposure of shipping any of the three health or pet agents.** Zero sources on liability, insurance, FTC health-claim rules or product terms across 270 sources and ~4,100 lines. Two advisors grepped for it independently. We cannot size what we cannot cite, which is precisely why it is one owner question and not a research row.
- **That one correctly-built MCP server actually reaches five hosts.** The claim was derived by reading the MCP spec and OpenAI's requirements side by side. Nobody in the bibliography has shipped it, and the client support matrix backing it is community-maintained. M1–M4 will make it a measurement rather than an inference the first time the endpoint is pointed at a second host.
- **What the health agents may remember about a user, and what happens to a stored SCOFF result or a bite history.** Retention, minors and HIPAA-adjacency appear in no source in any of the three domain marathons. The Outsider is right that the hole is *between* marathons, which is why all five passed their own scope checks.
- **Anything outside the United States.** DGA, USDA, BLS, AAFCO, AKC's CGC ladder and 988 are all US instruments, and no marathon addresses geography.
- **Whether the research pipeline beats a single Opus agent with web search.** Never measured, and the pack is the only run of it. Every advisor demanded a Phase 0 number for a fleet that does not exist while holding unmeasured output from a fleet that does.
