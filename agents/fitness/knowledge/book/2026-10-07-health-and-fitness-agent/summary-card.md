# A Health and Fitness Agent — Summary

For senior engineers about to write a backlog work order touching a health-and-fitness coaching
agent. The marathon is a cited knowledge base for training prescription, cardio/running, strength,
mobility/recovery, mind-body practice and safety/scope-of-practice — nutrition is explicitly out of
scope and owned by a sibling pack. The council that reviewed it afterward ruled the agent is content
only, shelved pending an owner decision, flagged this as the least-scrutinised marathon in its batch,
and found two sourcing weaknesses that must not be repeated at face value.

## Key Facts (the numbers and policies an engineer must know)

- **`asserted`, not measured**: the headline claim that ACSM's April 2026 resistance-training
  position stand (Currier et al., *Med Sci Sports Exerc* 2026;58(4):851–872) obsoletes the 2009 stand
  — ≥80% 1RM/2–3 sets for strength, ~10 sets/muscle/week for hypertrophy, 2×/week frequency, failure
  training optional, equipment largely irrelevant — could not be fetched directly; it is cited to
  ACSM's own announcement about a paywalled paper, not the paper itself —
  @research/2026-10-07-health-and-fitness-agent/03-strength-and-resistance.md:9-49. The council ruled
  this the one claim the agency would "sell on" and ordered it second-sourced or labelled before
  anyone quotes it to a client — @research/council/council-summary-2026-10-07T03-30.md:84,88.
- Physical-activity dose: **150–300 min/week moderate or 75–150 min/week vigorous** aerobic (adults),
  plus **muscle-strengthening ≥2 days/week** — the PAG 2nd edition (2018) and WHO 2020 converge on
  this number — @research/2026-10-07-health-and-fitness-agent/01-exercise-science-foundations.md:14-44.
- The 10% weekly-mileage rule is **not well supported**; the Garmin-RUNSAFE study (5,205 runners,
  588,071 sessions, *BJSM* 2025) found injury risk rises once a **single session exceeds 110% of the
  longest run in the prior 30 days** (HRR 1.64 small spike, 1.52 moderate, 2.28 large); week-to-week
  ratio showed no relationship — @research/2026-10-07-health-and-fitness-agent/02-cardio-and-running.md:119-136.
- Meditation/mindfulness adverse events: **~8% of participants** report a negative effect (2020
  review, 83 studies) — comparable to psychological therapies, not zero. Among studies that assessed
  harms, the commonest effects were **anxiety 33%, depression 27%, cognitive anomalies 25%, GI
  problems or suicidal ideation 11% each** (Farias et al. 2020, 6,742 studies screened, <1% measured
  adverse events at all) — @research/2026-10-07-health-and-fitness-agent/05-mind-body-mental-wellness.md:106-127.
- Scope-of-practice ceiling the agent must not exceed: **personal trainer is unregulated** (no state
  licensure, certification + CPR/AED expected); **exercise physiologist licensure exists only in
  Louisiana**; **physical therapist requires a license in all 50 states** (DPT, qualifying exam) —
  @research/2026-10-07-health-and-fitness-agent/06-special-populations-and-safety.md:12-31. The
  agent's design ceiling is the personal-trainer tier; anything needing a medical history, vitals
  monitoring, or treatment crosses into PT/exercise-physiologist territory and must be referred —
  same file, lines 28-31.
- Red flags / absolute contraindications requiring stop-and-refer: chest pain, syncope, severe
  dyspnoea, symptomatic dysrhythmia, acute febrile illness, resting BP >200/110 mmHg (relative),
  suspected concussion — @research/2026-10-07-health-and-fitness-agent/06-special-populations-and-safety.md:77-124.
  Pre-participation screening follows ACSM's 2015 algorithm, which *reduced* medical-clearance
  referrals for healthy asymptomatic adults (2.6% before vigorous exercise, 54.2% before any exercise
  under the old approach) — same file, lines 49-73.
- Myths the agent must retire with citations: the **post-workout anabolic window** (timing effect
  "all but disappears" once total daily protein is controlled for) —
  @research/2026-10-07-health-and-fitness-agent/07-nutrition-interface-boundary-note.md:38-53; the
  **fat-burning zone** conflates fuel mix with fat *loss* —
  @research/2026-10-07-health-and-fitness-agent/02-cardio-and-running.md:98-111; **DOMS from lactic
  acid** is "now considered obsolete" (real mechanism: microtrauma, inflammatory cascade, nociceptor
  sensitisation) — @research/2026-10-07-health-and-fitness-agent/04-mobility-flexibility-recovery.md:90-112;
  **stretching prevents injury** — a 2014 RCT meta-analysis found no significant benefit, while
  strength training cut injuries to under a third and overuse injuries by nearly half —
  @research/2026-10-07-health-and-fitness-agent/02-cardio-and-running.md:145-157.
- Zone 2 training is operationally fuzzy: six common lactate/HR/VO2 markers for the "same" zone
  disagreed with each other in 50 cyclists, coefficients of variation 6–29% —
  @research/2026-10-07-health-and-fitness-agent/02-cardio-and-running.md:32-48. Treat any HR% as an
  estimate, not a physiological fact for a given individual.
- Overtraining syndrome has **no diagnostic marker** and is an exclusion diagnosis — the agent must
  describe the pattern and refer, never label someone as overtrained —
  @research/2026-10-07-health-and-fitness-agent/01-exercise-science-foundations.md:136-154.

## Recommended Architecture / Decisions

- **Council ruling: content only, shelved.** No build authorized pending one owner question (shared
  with the nutritionist and dog-training packs): is any domain agent turned into a demo, or are all
  three shelved until a client asks? The council's own recommendation is to shelve all three and ship
  the unrelated Balnce.Pro MCP endpoint instead — @research/council/council-summary-2026-10-07T03-30.md:82-90,153-163.
- **One advisory agent, two knowledge packs — not two sibling agents.** The council ruled the
  nutrition/fitness split is an artifact of two separate research-queue rows, not a real
  specialization boundary; the specialization trigger in this research pipeline is tool count
  (15–20+) or genuinely conflicting behavioural modes, neither of which applies here — two agents
  sharing a prompt and toolset are one agent with two labels. The
  `07-nutrition-interface-boundary-note.md` seam (training vs. intake) becomes internal content
  routing inside one agent rather than a cross-agent handoff —
  @research/council/council-summary-2026-10-07T03-30.md:32,112.
- **What the agent owns**: training prescription (FITT-VP), intensity/volume/progression, recovery
  practice, sleep, mobility, mind-body teaching with disclosures, and pre-participation screening
  logic — @research/2026-10-07-health-and-fitness-agent/06-special-populations-and-safety.md:35-44.
- **What it refuses/escalates**: diagnosis, symptom interpretation, rehab prescription, labelling
  overtraining syndrome, Valsalva coaching for general users, trauma-focused meditation, and anything
  past an absolute contraindication — same file, lines 40-44, 340-367.
- **Mental-health escalation path is mandatory, not optional**: any suicidal ideation, self-harm
  intent, acute distress, psychotic/dissociative symptoms, trauma surfacing, or worsening
  anxiety/depression attributable to practice stops coaching and surfaces the **988 Suicide & Crisis
  Lifeline** (call/text 988, chat 988lifeline.org) —
  @research/2026-10-07-health-and-fitness-agent/05-mind-body-mental-wellness.md:245-290. This applies
  inside meditation/breathwork conversations specifically because suicidal ideation is a documented
  meditation adverse event, not only an exercise-content trigger.
- Pregnancy and chronic-disease prescriptions require mandatory clearance confirmation before
  programming — @research/2026-10-07-health-and-fitness-agent/06-special-populations-and-safety.md:225-229.

## Open Questions / [UNVERIFIED]

- **The ACSM 2026 sourcing chain is unresolved.** WebFetch could not reach the primary paper (behind a
  paywall); every headline 2026 number traces to ACSM's own announcement, not the study —
  @research/2026-10-07-health-and-fitness-agent/03-strength-and-resistance.md:9-20. Council action
  item F1: second-source each of the five numbers or label it `asserted` —
  @research/council/council-summary-2026-10-07T03-30.md:88.
- **Pregnancy contraindications rest on CSEP 2019 only.** ACOG (Committee Opinion 804) and BMJ could
  not be fetched; the absolute/relative contraindication lists in
  @research/2026-10-07-health-and-fitness-agent/06-special-populations-and-safety.md:177-230 are
  Canadian-guideline-sourced, with ACOG corroboration present only for the general "safe and
  desirable" framing and activities-to-avoid, not the full contraindication list. Council action item
  F2: get ACOG's list from an extractable source or mark the section CSEP-2019-only —
  @research/council/council-summary-2026-10-07T03-30.md:89.
- **Whether mind-body content belongs in a consumer-facing agent at all** is unresolved. The council
  states plainly: "that is the one place where 'lowest liability first' reasoning in this council was
  simply wrong," given ~8% meditation adverse-event incidence with suicidal ideation in 11% of
  harm-assessing studies — @research/council/council-summary-2026-10-07T03-30.md:86.
- **This is the least-scrutinised marathon in the batch** — all five peer reviewers independently
  flagged it (937 claims, the most in the pack, examined closely by only one of five advisors). Its
  highest-liability content — special populations, the Zone 2 marker disagreement, the ACSM cancer
  consensus, meditation adverse events — went unexamined by four of five reviewers. One reviewer's
  question stands unanswered: an agent that escalates on suicidal ideation does not obviously belong
  in anyone's "low-liability" tier — @research/council/council-summary-2026-10-07T03-30.md:41,84,86.
- **Geography is US-only and unaddressed.** 988, CDC, ACSM/NSCA and the PAG are all US instruments; no
  source in the pack considers a non-US user — @research/council/council-summary-2026-10-07T03-30.md:172.

## Action Items (consumable by /backlog)

1. Second-source each of the five ACSM April 2026 resistance-training numbers (or label each
   `asserted` in the knowledge file) before any client-facing claim cites them as current.
2. Repair the pregnancy section: fetch ACOG CO 804's contraindication list from an extractable source,
   or add an explicit note that the section is CSEP-2019-only and name what ACOG/BMJ coverage is
   missing.
3. Do not build or ship this agent (or the nutritionist pack) until the owner answers whether any
   domain-expert agent becomes a demo, per the council's single outstanding question.
4. If approved to build, implement as one advisory agent with two content packs (fitness + nutrition),
   not two agents, and keep the mandatory 988 escalation path wired into both mind-body and
   exercise-question flows.
5. Before any client-facing use, resolve whether mind-body/meditation content should ship at all given
   the undisclosed suicidal-ideation adverse-event rate — this is an owner/liability decision, not an
   engineering one.
6. Do not build on top of the 2009 ACSM resistance stand without noting in the same breath that the
   2026 stand supersedes it (pending item 1's second-sourcing).

## Source Map

- Scope brief → @research/2026-10-07-health-and-fitness-agent/00-brief.md
- FITT-VP, PAG/WHO dose, progression, periodization, overreaching/OTS, dose-response, intensity
  measurement → @research/2026-10-07-health-and-fitness-agent/01-exercise-science-foundations.md
- Aerobic zones, Zone 2 marker disagreement, HIIT/MICT, polarized training, fat-burning-zone myth,
  running injury/volume, couch-to-5k template → @research/2026-10-07-health-and-fitness-agent/02-cardio-and-running.md
- ACSM 2026 vs 2009 resistance stands, movement patterns, volume/frequency, older adults, youth,
  BP/depression outcomes → @research/2026-10-07-health-and-fitness-agent/03-strength-and-resistance.md
- Stretching evidence, warm-up (RAMP), DOMS mechanism, recovery-modality ranking, cold-water
  immersion caveat, sleep, deloads, detraining → @research/2026-10-07-health-and-fitness-agent/04-mobility-flexibility-recovery.md
- Exercise-for-depression network meta-analysis, meditation/mindfulness evidence and adverse events,
  breathwork, yoga, tai chi/qigong, mandatory 988 escalation →
  @research/2026-10-07-health-and-fitness-agent/05-mind-body-mental-wellness.md
- Scope-of-practice table, screening algorithm, red flags/contraindications, cardiac-risk perspective,
  older adults, pregnancy, chronic conditions, concussion, refusal checklist →
  @research/2026-10-07-health-and-fitness-agent/06-special-populations-and-safety.md
- Nutrition/fitness division of labour, anabolic-window myth, shared escalation rules →
  @research/2026-10-07-health-and-fitness-agent/07-nutrition-interface-boundary-note.md
- Full bibliography → @research/2026-10-07-health-and-fitness-agent/sources.md
- Council ruling, build-ready card, peer-review blind spots →
  @research/council/council-summary-2026-10-07T03-30.md
