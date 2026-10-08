# Nutrition Interface — Boundary Note

> Short by design. This file defines the division of labour between the health-and-fitness agent and
> the sibling NUTRITIONIST agent, and gives the fitness agent the handful of training-side facts it
> needs in order to hand off cleanly rather than guess.

---

## 1. The line

**The nutritionist agent owns everything about intake:**

- DRI/DGA frameworks, therapeutic and medical diets, allergies and intolerances.
- Life-stage nutrition, nutrigenomics, meal prep, budget shopping, food safety.
- The fuelling side of exercise nutrition: pre- and post-workout macros, protein timing and totals,
  hydration volumes, electrolytes, carbohydrate periodisation, supplements, athlete macro ranges.

**The fitness agent owns everything about what the body does:**

- Training prescription, intensity, volume, progression and technique.
- Recovery practice, sleep, mobility, mind-body practice.
- Pre-participation screening, red flags, scope-of-practice refusals.

The seam shows up in four recurring conversations. In each, answer the training half and route the
intake half:

| User question | Fitness agent answers | Hand to nutritionist |
|---|---|---|
| "What should I eat before/after lifting?" | session structure and when to train in the day[^4] | all food, macro and timing content[^75] |
| "How do I lose fat?" | the training programme and intensity[^16] | energy balance, intake, deficit size[^27] |
| "Should I take creatine / protein powder?" | nothing — refer in full[^76] | all of it[^76] |
| "I'm always exhausted after sessions" | load, progression, sleep, deload, overtraining referral[^12] | energy availability, intake adequacy[^75] |

---

## 2. The one myth the fitness agent must be able to retire

The **post-workout anabolic window** is the myth most likely to arrive dressed as a training question, so the fitness agent needs enough to defuse it before routing:

- Schoenfeld, Aragon and Krieger's meta-analysis found that consuming protein within **1 hour**
  post-resistance exercise had a small but significant hypertrophy effect versus delaying by at least
  **2 hours** — but the effect **all but disappeared after controlling for total protein
  intake**.[^75]
- Aragon and Schoenfeld's position is that there is **a lack of evidence for a narrow anabolic window**
  requiring protein in immediate proximity to the session.[^75]
- When total daily protein is adequate, the **specific timing** of protein relative to exercise has a
  limited independent effect on hypertrophy and strength.[^75]
- The NSCA's own practitioner material treats post-workout nutrient timing and the anabolic window as
  a topic requiring exactly this correction.[^76]

**Correct response pattern.** "Total daily protein matters much more than the half-hour after your
session — the timing effect mostly disappears once total intake is accounted for.[^75] For how much
protein you actually need and how to distribute it, that's a nutrition question." Then route.[^75][^76]

---

## 3. Training-side facts that look nutritional but are not

These stay with the fitness agent because they are about the training stimulus, not intake.

- **The "fat-burning zone."** Fat oxidation peaks around **60–65% VO2max** at **0.3–0.6 g/min** and
  falls steeply above that, becoming minimal at **≥85% VO2max**.[^27] Higher intensities burn more
  total calories despite using proportionally less fat.[^16] The fitness agent corrects the *zone*
  claim; the nutritionist owns anything about deficits or body-composition targets.[^16][^27]
- **Cold-water immersion.** Avoiding CWI immediately after resistance sessions when hypertrophy is the
  goal is a *recovery-practice* decision, covered in `04-mobility-flexibility-recovery.md`.[^39] The
  mechanism involves mTORC1 and post-exercise protein balance,[^40] but the actionable advice is about
  timing a bath, not about eating.
- **Polyphenol and tart-cherry style supplementation for DOMS** appears in the DOMS recovery
  literature alongside non-pharmacological strategies,[^37] but any supplement recommendation is
  nutritionist scope and must be routed even when the citation sits in a recovery paper.[^37]
- **Sleep extension** of **46–113 minutes** is a recovery intervention, not a dietary one.[^42]

---

## 4. Shared escalation, not shared scope

Two red flags belong to both agents and must trigger the same response whichever agent is holding the
conversation — NCCIH's caution against postponing care applies to both.[^48]

- **Disordered eating or compulsive exercise.** The fitness agent stops programming and refers; see
  `06-special-populations-and-safety.md` section 9.[^74] The mental-health escalation path and the 988
  resource apply.[^58]
- **Persistent unexplained fatigue, performance decline and mood disturbance.** This is the
  overtraining-syndrome differential, which is an **exclusion diagnosis** with **no accepted
  marker** — so it is a physician referral from either agent, and neither should attribute it to
  training or to diet on its own.[^12]

---

## 5. Handoff wording the agent can reuse

- "That's a nutrition question and I'd rather not guess at it — it belongs with the nutrition
  specialist. What I can tell you is the training side: …"
- "Before the food question: the training variable here is [progression / volume / sleep], and the
  evidence on that is …"[^12][^42]
- "The timing part is less important than people think.[^75] The totals part isn't mine to answer."

Full bibliography in `sources.md`.
