# Building a Nutritionist Agent — Summary

For senior engineers scoping a backlog work order that touches a nutrition-advice agent. This
card distills a five-file marathon plus a five-advisor council review of it. The council's
ruling supersedes the marathon wherever the two disagree, and the marathon has one internal
contradiction (protein dosing) that must not be inherited into any spec written from this card.
Read the marathon files for depth; this card is the entry point, not a replacement.

## Key Facts

- Two US frameworks anchor baseline numbers and move on different clocks: the **DRIs** (National
  Academies, revised nutrient-by-nutrient, no fixed cycle) and the **DGA** (USDA/HHS, revised
  every 5 years). The current edition is the **10th, 2025–2030, published January 2026**.
  @research/2026-10-07-nutritionist-agent/01-overview.md:13
- That edition is **contested, not settled**: it promotes 1.2–1.6 g protein/kg/day (50–100%
  above the 0.8 g/kg/day RDA) while leaving the protein AMDR and the <10% saturated-fat cap
  unchanged, which outside reviewers call a "dietary paradox" given its parallel promotion of red
  meat, full-fat dairy, butter and beef tallow. @research/2026-10-07-nutritionist-agent/01-overview.md:29
- "Nutritionist" and "registered dietitian" are **not interchangeable** in US law. Medical
  nutrition therapy is a licensed act in licensure states; ordering nutrition-related lab tests is
  itself a licensed act. This agent is nutrition *education*, never MNT.
  @research/2026-10-07-nutritionist-agent/01-overview.md:255
- Mandatory escalation triggers (refuse-with-referral, not blank refusal): a positive SCOFF
  eating-disorder screen (pooled sensitivity 0.86, specificity 0.83, ≥2 positive answers →
  referral); known/suspected CKD or a low-protein-prescription request; celiac diagnosis
  questions past label-reading; anaphylactic allergy or allergen-reintroduction plans; a
  supplement at/above its UL or combined with warfarin, MAOIs, immunosuppressants, statins or
  thyroid medication; pure/concentrated caffeine products.
  @research/2026-10-07-nutritionist-agent/01-overview.md:285
- Nutrigenomics: the **Food4Me RCT** (4 arms, 7 European countries, 6 months) found personalized
  advice beat generic advice, but adding phenotype and genotype data added **no measurable
  benefit** over personalization from diet data alone — the gain is from personalizing, not from
  DNA. @research/2026-10-07-nutritionist-agent/03-life-stage-demographics.md:190
- The agent must apply a **three-tier actionability rule** on genetics: monogenic diet-responsive
  disease (PKU — real, clinical), a single well-characterized variant with modest practical
  consequence (lactase persistence — managed by dose, not avoidance), and polygenic trait panels
  (FTO/PPARG/TCF7L2 — not actionable; "genes do not act in isolation").
  @research/2026-10-07-nutritionist-agent/03-life-stage-demographics.md:226
- Three popular interventions are rated **weak by their own source guidelines**, and the agent
  must say so rather than recite them as settled: low-FODMAP for IBS (ACG — conditional
  recommendation, very-low-quality evidence)
  @research/2026-10-07-nutritionist-agent/02-medical-diets-allergies.md:127; GERD trigger-food
  elimination (low-quality evidence, conditional recommendation)
  @research/2026-10-07-nutritionist-agent/02-medical-diets-allergies.md:155; and PCOS diet
  composition (2023 international guideline: no evidence any one diet composition outperforms
  another). @research/2026-10-07-nutritionist-agent/02-medical-diets-allergies.md:166

## Recommended Architecture / Decisions

- **Council ruling: content only.** This is a knowledge base and refusal/escalation logic, not a
  product with tools. It is **shelved pending an owner decision on who buys it** — no marathon in
  the research pack names a buyer. @research/council/council-summary-2026-10-07T03-30.md:75
- **Council ruling: one advisory agent, two knowledge packs.** Nutrition and the sibling
  fitness/health content are not two agents — the split is an artifact of two separate queue
  rows. They share a prompt and toolset and should be recorded as one agent with a
  nutrition pack and a fitness pack. @research/council/council-summary-2026-10-07T03-30.md:32
- **Do not expose this as a public MCP server** while its only safety control is prose the host
  model may ignore — tool annotations are untrusted hints, so a rail (MCP) and a prose escalation
  table cancel each other (ADR-3). @research/council/council-summary-2026-10-07T03-30.md:116
- **What it owns:** explaining DRIs/AMDRs and label reading with sources named; describing a named
  therapeutic diet in general terms; building general meal plans/shopping strategies for people
  without a diagnosed condition; estimating energy needs via Mifflin-St Jeor with the guideline's
  own error band stated, never a bare number.
  @research/2026-10-07-nutritionist-agent/01-overview.md:272
- **What it refuses:** individualized nutrient prescriptions for diagnosed disease (diabetes, CKD,
  CVD, celiac); any CKD/dialysis protein or electrolyte number; unsupervised elimination-diet
  design; lab interpretation, diagnosis or medication adjustment.
  @research/2026-10-07-nutritionist-agent/01-overview.md:278
- **The exercise-nutrition seam:** this agent owns the nutritional *consequence* of training load
  (protein/carb/fluid/energy-availability targets as a function of volume); it never prescribes
  training itself — that boundary note becomes informational once nutrition and fitness are one
  agent, not load-bearing. @research/2026-10-07-nutritionist-agent/05-nutrition-exercise-interface.md:12

## Open Questions / [UNVERIFIED]

- **The protein contradiction (council-flagged, must not be inherited).** `01-overview.md:37`
  says a blanket high-protein message is risky because fewer than 15% of people with CKD know
  they have it, while `05-nutrition-exercise-interface.md:38–41` hands over 2.3–3.1 g/kg/day (and
  ">3.0 may promote additional fat-mass reduction") with the healthy-population scope sitting in
  prose below the table, not in the row. These are both true in context but not reconciled in the
  pack as shipped. @research/council/council-summary-2026-10-07T03-30.md:79
- **[UNVERIFIED] Retention, minors, HIPAA-adjacency.** No source in the marathon addresses what
  the agent may remember about a user's health data, how long, or whether minors change anything.
  This is a gap between marathons, not a researched answer.
  @research/council/council-summary-2026-10-07T03-30.md:171
- **US-only scope.** The DGA, USDA food-plan data, and the SCOFF/988 escalation chain are all US
  instruments; no source in the pack addresses non-US users.
  @research/council/council-summary-2026-10-07T03-30.md:172
- **Who buys it.** No marathon in the research pack prices this agent or names a buyer; the
  council's recommendation is to shelve nutrition, fitness and the dog-training pack alike until
  an owner decision or a client ask. @research/council/council-summary-2026-10-07T03-30.md:153

## Action Items (consumable by /backlog)

1. Reconcile the protein guidance: every protein row above 2.0 g/kg/day must carry its
   healthy-population scope and the CKD counter-number (0.55–0.60 g/kg/day) in the same row;
   accept-criterion is a grep for `g/kg` across the pack returning none that lacks both.
   @research/council/council-summary-2026-10-07T03-30.md:79
2. Get an owner ruling on who buys this agent (fleet-office question) before any build work
   starts; council recommendation is to shelve. @research/council/council-summary-2026-10-07T03-30.md:159
3. Merge the nutrition and fitness backlog rows into one agent spec with two content packs instead
   of two sibling agents. @research/council/council-summary-2026-10-07T03-30.md:32
4. Do not plan a public MCP-server distribution path for this agent until its escalation logic has
   a non-prose enforcement point (ADR-3). @research/council/council-summary-2026-10-07T03-30.md:150
5. Decide retention/minors/HIPAA-adjacency policy before any build; no existing source answers it.
   @research/council/council-summary-2026-10-07T03-30.md:171
6. Decide US-only vs. international scope before building any locale handling.
   @research/council/council-summary-2026-10-07T03-30.md:172
7. Hard-code the DGA edition and date in the system prompt and set a re-check cadence tied to the
   5-year DGA cycle. @research/2026-10-07-nutritionist-agent/01-overview.md:19

## Source Map

- Scope brief: @research/2026-10-07-nutritionist-agent/00-brief.md
- Core nutrition science, DRI/DGA framework, scope of practice, escalation triggers: @research/2026-10-07-nutritionist-agent/01-overview.md
- Therapeutic diets, allergies, drug-nutrient interactions: @research/2026-10-07-nutritionist-agent/02-medical-diets-allergies.md
- Life stage, sex, activity, nutrigenomics: @research/2026-10-07-nutritionist-agent/03-life-stage-demographics.md
- Meal planning, budget shopping, food safety: @research/2026-10-07-nutritionist-agent/04-cooking-meal-prep-budget.md
- Nutrition/exercise interface and ownership split: @research/2026-10-07-nutritionist-agent/05-nutrition-exercise-interface.md
- Full bibliography: @research/2026-10-07-nutritionist-agent/sources.md
- Council verdict, build-ready card, and the protein-contradiction finding: @research/council/council-summary-2026-10-07T03-30.md
