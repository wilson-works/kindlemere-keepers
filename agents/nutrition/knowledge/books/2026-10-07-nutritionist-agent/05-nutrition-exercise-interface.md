# 05 — The Nutrition/Exercise Interface: What This Agent Owns and What It Hands Over

Retrieved 2026-10-07. Exercise programming, periodisation and biomechanics belong to the sibling
fitness-coach agent. What belongs **here** is the set of places where activity level changes a
*nutritional requirement* — carbohydrate and protein targets, fuelling, hydration and energy
availability, as set out in the joint ACSM/AND/DC position stand. [^81] [^82]

---

## 1. The ownership split, stated once

**This agent owns:**

- Energy and macronutrient requirements as a function of training load. [^81] [^84]
- Protein amount, per-meal dose and distribution. [^83]
- Carbohydrate availability, intra-exercise fuelling and post-exercise refuelling. [^84]
- Fluid and electrolyte replacement arithmetic. [^85] [^86]
- Energy availability and the nutritional side of REDs screening and referral. [^87]
- Caffeine as a dietary compound, including its safe ceiling. [^17]

**The fitness-coach agent owns:** set and rep schemes, session design, periodisation, progression,
technique, injury and return-to-play. Nothing in this file prescribes training; the nutrition
guidance here takes training volume as an input. [^81]

**Handover rule:** when a user's question requires changing the *training* to fix a nutrition
problem (e.g. energy availability is low because volume is too high), this agent states the
nutritional finding and hands the training decision across. [^87]

---

## 2. Protein when training

### 2.1 Total daily intake

| Population | Target | Cite |
|---|---|---|
| Sedentary adult RDA | 0.8 g/kg/day [^6] | [^6] |
| Athletes, joint ACSM/AND/DC position | 1.2–2.0 g/kg/day [^81] | [^81] |
| Building/maintaining muscle, ISSN | 1.4–2.0 g/kg/day [^83] | [^83] |
| Energy restriction with resistance training, ISSN | 2.3–3.1 g/kg/day to preserve lean mass [^83] | [^83] |
| Resistance-trained, aggressive fat loss | >3.0 g/kg/day may promote additional fat-mass reduction [^83] | [^83] |
| Healthy older adults (PROT-AGE/ESPEN) | ≥1.0–1.2 g/kg/day [^57] | [^57] |

- The ISSN position stand reports no adverse effects from higher protein intakes in healthy, exercising populations at the recommended levels. [^83]
- That safety statement is scoped to **healthy** populations and does not transfer to anyone with kidney disease, where the prescription runs to 0.55–0.60 g/kg/day. [^83] [^25]

### 2.2 Per-meal dose and distribution

- Optimal per-serving dose is **0.25 g of high-quality protein per kg body weight, or an absolute 20–40 g**. [^83]
- Older adults may need up to **40 g** per serving to maximise muscle protein synthesis. [^83]
- Each serving should contain **700–3,000 mg of leucine** plus a balanced array of essential amino acids. [^83]
- Distribute doses **every 3–4 hours** across the day. [^83]
- In the early recovery phase (0–2 hours post-exercise) the joint position stand gives **0.25–0.3 g/kg, or 15–25 g** across typical athlete body sizes. [^81]
- **30–40 g of casein** about 30 minutes before sleep increased overnight muscle protein synthesis and raised morning metabolic rate without suppressing nighttime fat oxidation. [^84]

### 2.3 The "anabolic window" — correct the myth, don't repeat it

- Muscles remain sensitised to protein ingestion for **at least 24 hours** after a resistance training bout. [^84]
- Pre-exercise and post-exercise protein both stimulate muscle protein synthesis meaningfully, so timing is flexible rather than a narrow critical window. [^84]
- The anabolic window extends at least 24 hours with diminishing returns over time. [^83]

**Build rule:** when asked about a 30-minute post-workout window, the agent should answer that
total daily intake and 3–4 hourly distribution dominate, and that the sensitised period runs ~24
hours. [^83] [^84]

---

## 3. Carbohydrate

### 3.1 Daily intake by training load

| Training load | Carbohydrate | Cite |
|---|---|---|
| Moderate exercise, ~1 h/day | 5–7 g/kg/day [^81] | [^81] |
| Moderate-to-high intensity, 1–3 h/day | 6–10 g/kg/day [^81] | [^81] |
| General athlete range, ISSN | 5–12 g/kg/day [^84] | [^84] |
| Moderate-to-high intensity training, upper band | 8–10 g/kg/day [^84] | [^84] |
| Substantial weekly volume, to maximise glycogen | ~8–12 g/kg/day [^84] | [^84] |

### 3.2 During exercise

- For endurance activity longer than **60–90 minutes**: ~**30–60 g carbohydrate per hour** in a 6–8% carbohydrate-electrolyte solution, taken as 6–12 fl oz every 10–15 minutes. [^84]
- Carbohydrate ingestion through resistance exercise supports glycogen maintenance and training adaptation. [^84]

### 3.3 After exercise

- Rapid restoration when the next session is **under 4 hours away**: **1.2 g/kg/hour**. [^84]
- Alternative: **0.6–1.0 g/kg within the first 30 minutes**, then repeat doses every 2 hours for 4–6 hours. [^84]
- When carbohydrate intake falls below 1.2 g/kg/h, adding **0.2–0.4 g/kg/h protein** enhances glycogen recovery. [^84]
- Caffeine at **3–8 mg/kg** may support rapid glycogen restoration when combined with carbohydrate refeeding. [^84]

**Cross-check:** 8 mg/kg for an 80 kg athlete is 640 mg, above the FDA's 400 mg/day figure for
healthy adults. The agent must surface that conflict rather than quote the sports dose alone. [^84] [^17]

---

## 4. Fluid and electrolytes

### 4.1 Baseline (non-exercise) water

- Total water AI is **3.7 L/day for adult men and 2.7 L/day for adult women**, counting all beverages and the water in food. [^6]
- Pregnancy is 3.0 L/day and lactation 3.8 L/day. [^6]
- These AIs assume sedentary-to-moderate activity in temperate conditions, which is why training requires a separate calculation. [^6] [^85]

### 4.2 During exercise

- The governing principle is to replace water lost in sweat **at a rate equal to the sweat rate**, to minimise thermal injury. [^85]
- ACSM considers **0.4–0.8 L/hour** optimal during intense endurance activity. [^85]
- Include **sodium at 0.5–0.7 g per litre** of rehydration fluid for exercise lasting longer than 1 hour: it improves palatability, promotes fluid retention and may help prevent hyponatraemia in people who drink excessive volumes. [^85]
- Supply sodium when sweat rate is **very high (>1.2 L/hour)** and the activity lasts more than 2 hours. [^85]
- The NATA position statement on fluid replacement for athletes is the companion practitioner document. [^86]

### 4.3 The two-sided risk

- Hyponatraemia arises from drinking **excessive** fluid, not from insufficient fluid, which is why "drink as much as you can" is unsafe advice. [^85]
- The safe framing is: match intake to sweat loss, cap at roughly 0.8 L/h in intense endurance work, and add sodium past the 1-hour mark. [^85]

**Build rule:** the agent should ask for exercise duration, intensity and environment before
giving a fluid number, and should never give a single daily litre figure to an athlete. [^85] [^6]

---

## 5. Energy availability and REDs

### 5.1 What REDs is

- The IOC published its 2023 consensus statement on Relative Energy Deficiency in Sport in the *British Journal of Sports Medicine*. [^87]
- REDs is a syndrome affecting health and performance caused by a mismatch between calories eaten and calories burned in exercise. [^88]
- The 2014 statement "Beyond the Female Athlete Triad" expanded the Triad's three conditions — low bone mineral density, functional hypothalamic amenorrhoea and low energy availability — into REDs; it was updated in 2018 and again in 2023. [^87]
- **REDs is common in both male and female athletes across many sports**, so the agent must not screen only female users. [^88]

### 5.2 The 30 kcal/kg FFM threshold — quote it with its caveats or not at all

This is the clearest worked example in the whole knowledge base of a number that is widely
repeated after its own field moved on.

- The threshold came from studies exposing habitually sedentary women who exercised to energy availability of **10, 20, 30 and 45 kcal/kg fat-free mass/day for 5 days**. [^89]
- At or below 30 kcal/kg FFM/day, hormonal and metabolic markers were altered. [^89]
- The original research lasted only **5 days**, and most observational studies in the field are under 7 days. [^89]
- **The use of cut-off values was abandoned in the last IOC consensus paper**, yet practitioners continue to use the 30 kcal/kg figure. [^89]
- A fixed cut-off does not account for inter-individual variation in response to low energy availability. [^89]
- Whether reliable field estimates of low energy availability are even obtainable is itself questioned. [^89]

**Build rule:** the agent may use 30 kcal/kg FFM/day as a *conversation trigger* — a reason to ask
more questions and consider referral — and must not present it as a diagnostic cut-off. [^89] [^87]

### 5.3 Escalation

REDs sits on the boundary with disordered eating, so the agent should run the eating-disorder
screen (SCOFF, sensitivity 0.86, specificity 0.83, ≥2 positives → referral) whenever energy
availability looks low, and route to a sports physician and sports dietitian. [^22] [^87]
Suppressed intake plus amenorrhoea, stress fracture history or performance decline is a referral,
not a meal-plan problem. [^87]

---

## 6. The quick-reference decision table the agent should carry

| Input | Nutritional consequence this agent owns | Cite |
|---|---|---|
| Sedentary | Protein 0.8 g/kg/d; DRI water AI; no intra-exercise fuelling [^6] | [^6] |
| ~1 h/day moderate | Carb 5–7 g/kg/d; protein 1.2–2.0 g/kg/d [^81] | [^81] |
| 1–3 h/day moderate-to-high | Carb 6–10 g/kg/d; protein toward 1.6–2.0 g/kg/d [^81] [^83] | [^81] |
| High weekly volume | Carb 8–12 g/kg/d [^84] | [^84] |
| Session >60–90 min | 30–60 g carb/h, 6–8% solution, 6–12 fl oz every 10–15 min [^84] | [^84] |
| Session >1 h | Add sodium 0.5–0.7 g/L fluid [^85] | [^85] |
| Sweat rate >1.2 L/h and >2 h | Sodium replacement required [^85] | [^85] |
| Two sessions <4 h apart | Carb 1.2 g/kg/h in recovery [^84] | [^84] |
| Cutting weight while lifting | Protein 2.3–3.1 g/kg/d [^83] | [^83] |
| Athlete 65+ | Per-meal protein up to 40 g; daily ≥1.0–1.2 g/kg/d floor [^83] [^57] | [^57] |
| Any athlete, low energy availability suspected | Screen, do not prescribe; refer [^89] [^22] | [^89] |
| Any athlete with CKD | Sports protein ranges do not apply; clinician-set [^25] | [^25] |

---

## 7. Where the joint position stand itself sits

- The 2016 position is a **joint statement of the Academy of Nutrition and Dietetics, Dietitians of Canada and the American College of Sports Medicine**, published in 2016. [^81]
- It is the single document a build team should load in full for sports-nutrition depth beyond this file. [^82]
- The ISSN position stands on protein and on nutrient timing are the open-access companions and carry the more granular dosing numbers reproduced above. [^83] [^84]
- ACSM's exercise-and-fluid-replacement position stand is the source for the hydration arithmetic. [^85]

---

## 8. What this agent must *not* do with exercise

- Prescribe training volume, intensity or progression — that is the sibling agent's domain. [^87]
- Use the 30 kcal/kg FFM cut-off as a diagnosis. [^89]
- Give a sports caffeine dose (3–8 mg/kg) without reconciling it against the FDA's 400 mg/day figure for healthy adults, or at all to anyone under 18. [^84] [^17]
- Apply athlete protein ranges to anyone with known or suspected kidney disease. [^25] [^5]
- Recommend intra-exercise carbohydrate or electrolyte protocols to a person with diabetes without clinician involvement, since ADA assigns carbohydrate-versus-medication decisions to an RDN. [^23]
- Screen only women for REDs. [^88]

---

Full bibliography for all five parts is in `sources.md`.
