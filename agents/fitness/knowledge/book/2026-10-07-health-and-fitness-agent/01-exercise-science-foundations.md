# Exercise Science Foundations

> Scope note: this file covers the frameworks a health-and-fitness agent reasons with — activity
> guidelines, the FITT-VP prescription model, overload/progression/specificity, periodization,
> recovery-adaptation, and the population-level dose-response numbers. Nutrition is out of scope and
> belongs to the sibling nutritionist agent (see `07-nutrition-interface-boundary-note.md`).

---

## 1. The two consensus guideline documents the agent should anchor to

The agent's baseline numbers should come from two documents, both still current as of October 2026.

- The **Physical Activity Guidelines for Americans, 2nd edition (2018)** is the US federal
  document; it is the edition in force and replaced the 2008 first edition.[^1]
- Adults need **150–300 minutes/week of moderate-intensity aerobic activity** for the most health
  benefit, plus **muscle-strengthening activity on at least 2 days/week**.[^1]
- Youth ages 6–17 need **at least 60 minutes of moderate-to-vigorous activity daily**, including
  muscle- and bone-strengthening activity.[^1]
- Preschoolers ages 3–5 should be active throughout the day, with caregivers aiming for **about 3
  hours/day** of active play.[^1]
- The 2nd edition **removed the 10-minute minimum bout** requirement that the 2008 edition carried;
  any length of activity now counts toward the weekly total.[^1]
- Its bottom-line framing is "sit less, move more," and it states that some activity is better than
  none.[^1]

The **WHO 2020 guidelines on physical activity and sedentary behaviour** updated WHO's 2010
recommendations and are the international counterpart.[^2]

- Adults 18–64: **150–300 min/week moderate** OR **75–150 min/week vigorous** aerobic activity, or an
  equivalent combination; muscle strengthening on **≥2 days/week** at moderate or greater intensity.
  Rated a *strong* recommendation on *moderate* certainty evidence.[^2]
- Going **above 300 min moderate or 150 min vigorous** for additional benefit is a *conditional*
  recommendation, not a strong one.[^2]
- Older adults 65+: the adult recommendation **plus multicomponent activity emphasising balance and
  strength on ≥3 days/week**. Strong recommendation, moderate-to-high certainty.[^2]
- Children/adolescents 5–17: **an average of 60 min/day** of moderate-to-vigorous aerobic activity
  across the week, plus muscle- and bone-strengthening on **≥3 days/week**.[^2]
- Pregnant and postpartum women: **≥150 min/week moderate** aerobic activity, including muscle
  strengthening. Strong recommendation, high-to-moderate certainty.[^2]
- Sedentary behaviour: limit it and replace it with activity of any intensity — but WHO explicitly
  **could not quantify a sedentary threshold** because the evidence was insufficient.[^2]
- Adults with chronic conditions (hypertension, type 2 diabetes, cancer, HIV) and people with
  disability are given the same targets, adjusted to individual ability.[^2]

**Agent design implication.** Both documents converge on the same core numbers, so the agent can
quote "150–300 minutes a week plus two strength days" without having to pick a side. Where they
differ is granularity: WHO carries explicit certainty ratings, which is the better basis for hedged
language.[^2]

---

## 2. FITT-VP — the prescription skeleton

ACSM's exercise prescription framework is **FITT-VP**: Frequency, Intensity, Time, Type, Volume,
Progression.[^3]

| Letter | Question it answers | Typical units |
|---|---|---|
| F — Frequency | How many days per week?[^3] | days/week |
| I — Intensity | How hard?[^3] | %HRmax, %HRR, METs, RPE, %1RM |
| T — Time | How long per session?[^3] | minutes, or sets × reps |
| T — Type | What mode?[^3] | aerobic, resistance, flexibility, neuromotor |
| V — Volume | Total amount?[^3] | MET-min/week, weekly sets per muscle group |
| P — Progression | How does it advance?[^3] | % load increase, added minutes/sets |

- FITT-VP is applied **separately to each of the four training components** — aerobic, resistance,
  flexibility, and neuromotor — rather than once to "exercise" in general.[^3]
- A prescription is individualised against health status, physical ability, age, training response
  and the person's own goals.[^3]
- Intensity anchors from the same source: **moderate = 3–5.9 METs, 64–76% HRmax, 45–63% VO2max**;
  **vigorous = ≥6.0 METs, 77–93% HRmax, 64–91% VO2max**.[^3]

### The 2011 ACSM position stand numbers (still the FITT backbone)

ACSM's 2011 position stand *Quantity and Quality of Exercise for Developing and Maintaining
Cardiorespiratory, Musculoskeletal, and Neuromotor Fitness in Apparently Healthy Adults* (Garber et
al., *Med Sci Sports Exerc*) is the source of the four-component weekly template.[^4]

- Aerobic: **≥30 min/day on ≥5 days/week at moderate intensity (≥150 min/week)**, or **≥20 min/day
  on ≥3 days/week vigorous (≥75 min/week)**, or a combination.[^4]
- Resistance: exercises for **each major muscle group on 2–3 days/week**.[^4]
- Neuromotor (balance, agility, coordination): **2–3 days/week**.[^4]
- Flexibility: a series of stretches for each major muscle-tendon group totalling **60 seconds per
  exercise**, on **≥2 days/week**.[^4]
- Note the date: this stand predates the 2026 resistance-training position stand, so where the two
  disagree on resistance specifics, the 2026 document wins.[^4][^6]

---

## 3. Progressive overload, specificity, reversibility

- **Overload**: adaptation requires a stimulus greater than what the body is accustomed to; the
  programme must advance so the body keeps adapting to the stress applied.[^3]
- **Progression must be gradual** — advancing too quickly is named as the main avoidable risk in
  exercise prescription.[^3]
- **The concrete progression rule** from ACSM's 2009 resistance-training position stand: increase
  load by **2–10%** once the person can complete **1–2 repetitions beyond the target** on **two
  consecutive sessions**.[^5] This is the single most useful operational rule the agent can carry.
- **Specificity**: adaptations are specific to the mode, muscle groups, velocity and energy systems
  trained — which is why the four FITT-VP components are prescribed separately rather than assumed to
  transfer.[^3][^4]
- **Reversibility / detraining**: maximal force does not decline measurably with training cessation
  of under 7 days, and the decrease only becomes statistically significant after about the **third
  week** of cessation.[^46] That number matters for reassuring people about holidays and illness.

---

## 4. Periodization — real but smaller than the industry implies

- A meta-analysis of **81 effects from 18 studies (1988–2015)** found periodized resistance training
  produced greater 1RM gains than non-periodized training, **effect size 0.43, p < 0.001**.[^10]
- The same analysis found **evidence of publication bias**; removing the outsized studies roughly
  **halved** the effect, though it stayed significant.[^10]
- Greater improvements were seen in **untrained** participants, and with **higher frequency** and
  **longer study duration** — i.e. the periodization advantage is partly a proxy for training more
  and for longer.[^10]
- **Linear periodization (LP)**: starts high-volume/low-intensity and moves toward
  low-volume/high-intensity over months. The term is a misnomer since the training is cyclical.[^11]
- **Undulating periodization (UP)**: loading zones vary daily, weekly or bi-weekly.[^11]
- LP vs UP for **strength**: one meta-analysis found no significant difference; later analyses
  suggested UP produced significantly greater maximal-strength gains.[^11]
- LP vs UP for **hypertrophy**: two meta-analyses found **no advantage to either model**.[^11]
- Whether periodized training beats non-periodized training for **hypertrophy specifically remains
  unclear**.[^11]
- Most periodization studies are short and rarely include the taper or unloading phases the theory
  calls for, which limits what can be concluded.[^11]

**Agent design implication.** For general-population clients the agent should treat periodization as
an optional organising device, not a requirement — and should not imply a beginner needs a
mesocycle chart. ACSM's 2026 position stand reaches the same place from the other direction: complex
programming is not what drives results in healthy adults.[^8][^9]

---

## 5. Recovery and adaptation: overreaching vs overtraining

The ECSS/ACSM joint consensus statement (Meeusen et al., *Med Sci Sports Exerc* 2013, 45(1):186–205)
is the reference framework.[^12]

- **Functional overreaching (FOR)**: a short-term performance decrement with no severe or lasting
  psychological symptoms, which **leads to improved performance after recovery**. This is normal
  training.[^12]
- **Non-functional overreaching (NFOR)**: occurs when training and recovery are not balanced;
  performance stays depressed for longer.[^12]
- **Overtraining syndrome (OTS)**: distinguished from NFOR by clinical outcome and by **exclusion
  diagnosis** — there is no confirmatory test.[^12]
- No single marker qualifies: hormones, performance tests, psychological tests, biochemical and
  immune markers have all been examined and **none meets all criteria for general acceptance**.[^12]

**Agent design implication.** Because OTS is an exclusion diagnosis, the agent must not diagnose it.
It can describe the pattern (persistent performance decline, mood disturbance, disturbed sleep
despite reduced load) and route the person to a physician — especially since the differential
includes anaemia, thyroid disease, depression and infection.[^12]

---

## 6. Dose-response numbers worth having at hand

These are the population-level associations that let the agent answer "is this enough?" questions:

- **Muscle-strengthening and mortality**: 30–60 min/week of muscle-strengthening activity is
  associated with a **10–20% lower risk** of all-cause mortality and of death from cardiovascular
  disease, diabetes and cancer, independent of aerobic activity (Momma et al., *BJSM* 2022, 16
  studies).[^13]
- The same analysis found a **J-shaped curve** — no conclusive additional benefit beyond about an
  hour a week of muscle strengthening.[^13]
- **Steps and mortality**: in a meta-analysis of 15 cohorts (47,471 adults), mortality risk levelled
  off at about **6,000–8,000 steps/day for adults 60+** and about **8,000–10,000 steps/day for
  adults under 60** (Paluch et al., *Lancet Public Health* 2022).[^14]
- Adults in the highest step quartile had a **40–53% lower mortality risk** than those in the
  lowest.[^14]
- The widely quoted 10,000-step target is therefore **higher than necessary** for older adults to
  get the mortality benefit.[^14]

---

## 7. Measuring intensity in practice

The agent will be asked "how hard should this feel?" constantly. These are the defensible answers.

- **Talk test (CDC)**: at moderate intensity you **can talk but not sing**; at vigorous intensity you
  **cannot say more than a few words without pausing for breath**.[^15]
- **Moderate examples (CDC)**: brisk walking at 3 mph or faster (not race-walking), water aerobics,
  cycling slower than 10 mph on flat terrain, doubles tennis, ballroom dancing, general
  gardening.[^15]
- **Vigorous examples (CDC)**: race walking, jogging or running, swimming laps, singles tennis,
  aerobic dancing, cycling 10 mph or faster or with hills, jumping rope, continuous digging or
  hoeing, hiking uphill or with a heavy pack.[^15]
- **Estimated maximum heart rate**: `220 − age`. A 25-year-old's estimate is 195 bpm.[^16]
- **Heart-rate zones against that estimate**: light **< 64% HRmax**, moderate **64–76% HRmax**,
  vigorous **77–93% HRmax**.[^16]
- Worked example: a 25-year-old targeting moderate intensity aims for roughly **125–148 bpm**.[^16]
- Consumer 5-zone watches: zones 2–3 usually correspond to moderate intensity and zone 4 to
  vigorous, and the zones can be reset to match the CDC bands.[^16]
- **Caveat to carry**: `220 − age` is a population estimate, not a measurement, so RPE and the talk
  test are often the more honest instruction for an untested beginner.[^3][^15]

---

## 8. Sedentary behaviour and the "exercise snack" idea

- WHO recommends limiting sedentary time and replacing it with activity of any intensity, while
  conceding **no threshold can be quantified** from current evidence.[^2]
- WHO also makes a *strong* recommendation that adults aim **above** the minimum MVPA target to help
  offset the harms of high sedentary time.[^2]
- Interrupting prolonged sitting **every 30 minutes with 1 minute of repeated chair stands** was as
  effective as 2-minute treadmill walks for lowering post-meal insulin in healthy adults.[^17]
- In older adults, breaking sitting with light walking produced lower glucose (**~0.3 mmol/L**) and
  lower blood pressure (**~4 mmHg**) versus prolonged sitting, with no difference between South Asian
  and White European participants.[^18]
- A meta-analysis comparing interruption frequencies found **breaks at ≤30-minute intervals** gave
  greater acute glucose lowering than less frequent protocols, but differences for insulin,
  triglycerides and blood pressure were not statistically significant and **certainty was low**.[^19]

**Agent design implication.** "Stand or walk for a minute or two every half hour" is supportable as a
low-risk habit with a modest, acute, well-characterised benefit — and should be stated that way, not
as a metabolic cure.[^17][^18][^19]

---

## 9. What this means for the agent's reasoning order

A defensible internal order of operations for any training question:

1. **Screen first** — see `06-special-populations-and-safety.md` before any prescription.[^64]
2. **Set the weekly target** from the PAG 2nd edition / WHO numbers for that person's age and
   state.[^1][^2]
3. **Fill the four components** with FITT-VP, separately for aerobic, resistance, flexibility and
   neuromotor.[^3][^4]
4. **Choose a progression rule** before choosing exercises — the 2–10% / two-consecutive-sessions
   rule for load, and conservative single-session jumps for running volume.[^5][^24]
5. **Build recovery in by default** rather than adding it after symptoms appear.[^12]
6. **Prefer adherence over optimisation** — the 2026 ACSM position stand's own headline is that the
   largest gain is from doing none to doing some.[^8][^9]

See `02-cardio-and-running.md` for aerobic modalities.
See `03-strength-and-resistance.md` for the 2026 resistance numbers.
See `04-mobility-flexibility-recovery.md` for recovery practice.
See `05-mind-body-mental-wellness.md` for mind-body work.
See `06-special-populations-and-safety.md` for screening, red flags and scope of practice.

Full bibliography in `sources.md`.
