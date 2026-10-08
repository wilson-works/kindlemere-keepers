# 01 — Core Nutrition Science: The Agent's Baseline Reasoning Layer

Retrieved 2026-10-07. This file is the foundation layer for a nutritionist agent: the reference
frameworks, the actual numbers, and the scope-of-practice line the agent must never cross.

---

## 1. Which guidance documents anchor the agent

A nutrition agent needs a **named, dated** authority for every baseline number, because the two
big US frameworks move on different clocks and currently disagree with each other.

- The **Dietary Reference Intakes (DRIs)** are the nutrient-requirement framework from the National Academies, used for individual nutrient adequacy; they are revised nutrient-by-nutrient over decades, not on a fixed cycle. [^6]
- The **Dietary Guidelines for Americans (DGA)** are the US federal *food pattern* policy, revised every 5 years by USDA and HHS. [^1]
- The current edition is the **10th Edition, _Dietary Guidelines for Americans, 2025–2030_, published January 2026**, whose headline message is "Eat Real Food." [^1]
- The full 2025–2030 text and scientific report live at RealFood.gov rather than the legacy dietaryguidelines.gov landing page. [^2]
- **WHO** maintains a separate, globally scoped set of numeric diet targets that the agent should carry as a cross-check. [^11]

**Build rule:** hard-code the edition and date in the agent's system prompt, and have the agent
state the edition when it quotes a DGA number. The DGA cycle means any cached figure has a
shelf life. [^1]

### 1.1 The 2025–2030 DGA is unusually contested — the agent must not present it as settled

This matters more than usual for this edition. Multiple independent reviews flagged internal
contradictions, so an agent that recites the 2025–2030 DGA uncritically will give advice that
peer reviewers consider incoherent.

- The 2025–2030 DGA promotes **1.2–1.6 g protein/kg body weight/day**, which is 50–100% above the long-standing RDA of 0.8 g/kg/d. [^2]
- The protein AMDR (10–35% of calories for adults) was **not** changed in this edition. [^6]
- The edition retains limits of **<10% of calories from saturated fat**, **<10% of calories from added sugars**, and **<2,300 mg/day sodium**. [^5]
- Stanford's nutrition group holds that the protein target plus the promotion of red meat, full-fat dairy, butter and beef tallow makes the saturated-fat ceiling difficult or impossible to hit. [^3]
- A published critical analysis calls this "a dietary paradox that undermines the practical applicability" of the guidance. [^4]
- Stanford also flagged factual errors: olive oil, butter and beef tallow are listed as examples of "healthy fats" despite containing negligible essential fatty acids, and xylitol is miscategorised as a non-nutritive sweetener rather than a sugar alcohol. [^3]
- The same review notes fiber — a nutrient Americans under-consume — is under-emphasised in this edition. [^3]
- Stanford raises an equity objection to the dairy emphasis, since roughly 75% of the world's population is lactose intolerant. [^3]
- For diabetes specifically, the DGA protein target of 1.2–1.6 g/kg/d conflicts with ADA's ~0.8 g/kg/d, and fewer than 15% of people with CKD know they have it — so a blanket high-protein message is risky. [^5]

**Build rule:** when the agent cites a DGA figure that is contested, it says so in one clause and
names the disagreement, as the published critiques do. [^3] [^4]
Do not let the agent arbitrate between USDA and specialty societies. [^5]

### 1.2 WHO cross-check numbers

| Target | WHO value | Cite |
|---|---|---|
| Fruit + vegetables, adults 10+ | ≥400 g/day [^11] | [^11] |
| Fruit + vegetables, children 6–9 / 2–5 | ≥350 g/day / ≥250 g/day [^11] | [^11] |
| Naturally occurring fiber, adults | ≥25 g/day [^11] | [^11] |
| Free sugars | <10% of energy; <5% for added benefit [^11] | [^11] |
| Total fat | ≤30% of energy [^11] | [^11] |
| Saturated fat | ≤10% of energy [^11] | [^11] |
| Trans fat | ≤1% of energy [^11] | [^11] |
| Salt | <5 g/day (≈2 g sodium) [^11] | [^11] |
| Potassium | ≥90 mmol/day (3,510 mg/day) [^11] | [^11] |

WHO also sets protein at 10–15% of energy and carbohydrate at roughly 45–75% of energy. [^11]
Exclusive breastfeeding for the first 6 months, continuing to 2 years and beyond, is WHO's
infant-feeding baseline. [^11]

---

## 2. Macronutrients: the numbers the agent should hold

### 2.1 AMDR — Acceptable Macronutrient Distribution Ranges (% of total energy)

| Age | Carbohydrate | Protein | Fat | Linoleic acid | α-linolenic acid |
|---|---|---|---|---|---|
| 1–3 y | 45–65% | 5–20% | 30–40% | 5–10% | 0.6–1.2% [^6] |
| 4–18 y | 45–65% | 10–30% | 25–35% | 5–10% | 0.6–1.2% [^6] |
| 19+ y | 45–65% | 10–35% | 20–35% | 5–10% | 0.6–1.2% [^6] |

### 2.2 RDA / AI for macronutrients and water

Values are g/day unless noted; water is total water (all beverages plus food). [^6]

| Life stage | Carb | Protein | Fiber | Linoleic | α-linolenic | Total water |
|---|---|---|---|---|---|---|
| 0–6 mo | 60 | 1.52 g/kg | ND | 4.4 | 0.5 | 0.7 L [^6] |
| 7–12 mo | 95 | 1.2 g/kg | ND | 4.6 | 0.5 | 0.8 L [^6] |
| 1–3 y | 130 | 13 | 19 | 7 | 0.7 | 1.3 L [^6] |
| 4–8 y | 130 | 19 | 25 | 10 | 0.9 | 1.7 L [^6] |
| 9–13 y | 130 | 34 | 26–31 | 10–12 | 1.0–1.2 | 2.1–2.4 L [^6] |
| Males 14–18 y | 130 | 52 | 38 | 16 | 1.6 | 3.3 L [^6] |
| Males 19+ y | 130 | 56 | 30–38 | 14–17 | 1.6 | 3.7 L [^6] |
| Females 14–18 y | 130 | 46 | 26 | 11 | 1.1 | 2.3 L [^6] |
| Females 19–50 y | 130 | 46 | 25 | 12 | 1.1 | 2.7 L [^6] |
| Females 51+ y | 130 | 46 | 21 | 11 | 1.1 | 2.7 L [^6] |
| Pregnancy | 175 | 71 | 28 | 13 | 1.4 | 3.0 L [^6] |
| Lactation | 210 | 71 | 29 | 13 | 1.3 | 3.8 L [^6] |

Notes the agent must carry with these numbers:

- The protein RDA for adults is 0.8 g/kg/day; the 56 g and 46 g figures are reference-body-weight conversions of it. [^6]
- There is **no RDA or AI for total fat in anyone over 12 months** — only the AMDR. [^6]
- The carbohydrate RDA of 130 g/day is set to supply the brain's glucose need, not to cap intake. [^6]
- An alternative fiber target in wide clinical use is **≥14 g per 1,000 kcal**, which is what ADA applies. [^5]
- The Nutrition Facts label Daily Value for fiber is 28 g, for added sugars 50 g, for saturated fat 20 g and for sodium 2,300 mg. [^10]

### 2.3 Protein: the single most contested macronutrient in 2026

- Baseline RDA: 0.8 g/kg/day for adults. [^6]
- 2025–2030 DGA: 1.2–1.6 g/kg/day for the general population. [^2]
- ADA for people with diabetes: approximately 0.8 g/kg/day, with no evidence that sustained higher intake adds cardiometabolic benefit. [^5]
- Exercising adults: 1.4–2.0 g/kg/day (see `05-nutrition-exercise-interface.md`). [^83]
- Healthy older adults: at least 1.0–1.2 g/kg/day (see `03-life-stage-demographics.md`). [^57]
- CKD stages 3–5 not on dialysis: 0.55–0.60 g/kg/day (see `02-medical-diets-allergies.md`). [^25]

**Build rule:** the agent should never give a single protein number. It should branch on
(a) kidney function known/unknown, (b) age, (c) training load, and state which branch it took.
Kidney function is the branch that creates real harm if skipped. [^5]

---

## 3. Micronutrients: RDA/AI and Tolerable Upper Intake Levels

### 3.1 Vitamins, adults (RDA or AI; UL in parentheses)

| Vitamin | Men 19–50 | Women 19–50 | Pregnancy | Lactation |
|---|---|---|---|---|
| Vitamin A (µg RAE) | 900 (3,000) | 700 (3,000) | 770 | 1,300 [^7] |
| Vitamin D (IU) | 600 (4,000) | 600 (4,000) | 600 | 600 [^7] |
| Vitamin E (mg) | 15 (1,000) | 15 (1,000) | 15 | 19 [^7] |
| Vitamin K (µg) | 120 (ND) | 90 (ND) | 90 | 90 [^7] |
| Vitamin C (mg) | 90 (2,000) | 75 (2,000) | 85 | 120 [^7] |
| Thiamin (mg) | 1.2 | 1.1 | 1.4 | 1.4 [^7] |
| Riboflavin (mg) | 1.3 | 1.1 | 1.4 | 1.6 [^7] |
| Niacin (mg NE) | 16 (35) | 14 (35) | 18 | 17 [^7] |
| Vitamin B6 (mg) | 1.3 (100) | 1.3 (100) | 1.9 | 2.0 [^7] |
| Folate (µg DFE) | 400 (1,000) | 400 (1,000) | 600 | 500 [^7] |
| Vitamin B12 (µg) | 2.4 (ND) | 2.4 (ND) | 2.6 | 2.8 [^7] |
| Pantothenic acid (mg) | 5 | 5 | 6 | 7 [^7] |
| Biotin (µg) | 30 | 30 | 30 | 35 [^7] |
| Choline (mg) | 550 (3,500) | 425 (3,500) | 450 | 550 [^7] |

Age shifts the agent must apply: vitamin D rises to **800 IU** above age 70, and vitamin B6
rises to **1.7 mg (men) / 1.5 mg (women)** from age 51. [^7]
The folate UL of 1,000 µg applies to **synthetic folic acid** from fortified food and supplements,
which is why it sits below the pregnancy RDA band in some tables. [^7]

### 3.2 Minerals, adults (RDA or AI; UL in parentheses)

| Mineral | Men 19–50 | Women 19–50 | Pregnancy | Lactation |
|---|---|---|---|---|
| Calcium (mg) | 1,000 (2,500) | 1,000 (2,500) | 1,000 | 1,000 [^8] |
| Iron (mg) | 8 (45) | 18 (45) | 27 | 9–10 [^8] |
| Magnesium (mg) | 400 (350 suppl.) | 310 (350 suppl.) | — | — [^8] |
| Zinc (mg) | 11 (40) | 8 (40) | 11 | 12 [^8] |
| Iodine (µg) | 150 (1,100) | 150 (1,100) | 220 | 290 [^8] |
| Selenium (µg) | 55 (400) | 55 (400) | 60 | 70 [^8] |
| Potassium (mg) | 3,400 (ND) | 2,600 (ND) | — | — [^8] |
| Sodium (mg) | limit <2,300 | limit <2,300 | — | — [^5] [^10] |
| Copper (µg) | 900 (10,000) | 900 (10,000) | — | — [^8] |
| Phosphorus (mg) | 700 (4,000) | 700 (4,000) | — | — [^8] |

Age shifts: calcium rises to **1,200 mg/day** from age 51 in women and age 71 in men, and the
calcium UL drops to 2,000 mg/day at 51+; women's iron falls to 8 mg/day after menopause. [^8]

**Magnesium is the classic trap for an agent.** The UL of 350 mg/day is *lower* than the RDA
because the UL counts only supplements and medications, not magnesium naturally present in
food and beverages; food magnesium does not need limiting in healthy people. [^90]
The full-source RDA is 400–420 mg/day for men and 310–320 mg/day for women. [^90]

**Build rule:** the agent must distinguish "UL applies to supplemental forms only" (magnesium,
folic acid, niacin, vitamin E) from "UL applies to total intake." Getting this backwards
produces either false alarms or false reassurance. [^90] [^7]

### 3.3 Reading a label

- On the Nutrition Facts label, **5% DV or less is low and 20% DV or more is high** for a nutrient per serving. [^10]
- "Nutrients to get less of" are saturated fat, sodium and added sugars. [^10]
- "Nutrients to get more of" are dietary fiber, vitamin D, calcium, iron and potassium. [^10]
- Serving size is a description of typical consumption, **not** a recommendation. [^10]

---

## 4. Energy balance: what the agent may compute

### 4.1 The sanctioned estimating equation

The Academy of Nutrition and Dietetics' Adult Weight Management guideline gives a **Strong
(Conditional)** recommendation: measure RMR by indirect calorimetry if possible; if not, use
Mifflin-St Jeor with actual body weight. [^9]

- Men: RMR = (9.99 × weight kg) + (6.25 × height cm) − (4.92 × age y) + 5 [^9]
- Women: RMR = (9.99 × weight kg) + (6.25 × height cm) − (4.92 × age y) − 161 [^9]

Accuracy the agent must disclose, not hide:

- The equation lands within 10% of measured RMR in roughly 70% of people with obesity, with overestimates up to 9% and underestimates up to 21%. [^9]
- Accuracy is lower in obese than non-obese adults regardless of which equation is used (≈75% vs ≈87% for Mifflin-St Jeor in one analysis). [^9]
- Mifflin-St Jeor was not validated in racial groups other than White participants, so results may be less accurate elsewhere. [^9]

**Build rule:** present estimated energy needs as a range with the error band the guideline
itself reports — up to 9% over and 21% under measured RMR. [^9]
Never give a single calorie number; the false precision is the harm. [^9]

### 4.2 Food matrix beats macro arithmetic — the strongest single piece of evidence

- In a 4-week inpatient randomised crossover trial (n=20), diets matched for presented calories, sugar, fat, sodium, fiber and macronutrients still diverged: energy intake was **508 ± 106 kcal/day higher** on the ultra-processed diet. [^15]
- Participants gained 0.9 ± 0.3 kg on the ultra-processed diet and lost 0.9 ± 0.3 kg on the unprocessed diet. [^15]
- The excess came from carbohydrate (280 ± 54 kcal/d) and fat (230 ± 53 kcal/d), not protein. [^15]
- Weight change correlated with the energy-intake difference at r = 0.8. [^15]
- NIH describes this as the first randomised controlled trial directly comparing calorie intake and weight change on ultra-processed versus unprocessed diets. [^16]

**Build rule:** when a user asks "do calories matter or does food quality matter," the agent
should answer with this trial: degree of processing changed spontaneous intake by ~500 kcal/day
at matched macros. [^15]

---

## 5. Dietary patterns with the strongest outcome evidence

### 5.1 AHA's ten features of a cardioprotective pattern

The AHA's 2021 scientific statement supersedes its 2006 diet and lifestyle statement. [^12]
It lists ten features: adjust energy intake to maintain healthy weight; eat plenty and a variety of
fruits and vegetables; choose whole grains; choose healthy protein sources (mostly plants,
regular fish and seafood, low-fat or fat-free dairy, lean unprocessed meat if desired); use
liquid plant oils rather than tropical oils and partially hydrogenated fats; choose minimally
processed over ultra-processed foods; minimise added-sugar beverages and foods; prepare foods
with little or no salt; do not start drinking alcohol and limit it if you do; and apply the
guidance wherever food is prepared or eaten. [^12]

### 5.2 DASH

Daily servings at 2,000 kcal: grains 6–8; vegetables 4–5; fruit 4–5; meat/poultry/fish 6 or
fewer; low-fat or fat-free dairy 2–3; fats and oils 2–3. [^13]
Weekly: 4–5 servings of nuts, seeds, beans and peas, and 5 or fewer servings of sweets. [^13]
DASH limits sodium to 2,300 mg/day, and NHLBI notes 1,500 mg/day lowers blood pressure
further. [^13]

The DASH-Sodium trial is the quantitative anchor:

- 412 adults with untreated systolic BP 120–160 mm Hg and diastolic 80–95 mm Hg, three 30-day feeding periods at varying sodium. [^14]
- DASH plus low sodium produced mean systolic BP **11.5 mm Hg lower** than control diet plus high sodium in participants with hypertension. [^14]
- On the control diet, cutting sodium from high to intermediate lowered systolic BP 2.1 mm Hg, and intermediate to low a further 4.6 mm Hg. [^14]
- On DASH the same sodium steps gave 1.3 mm Hg and 1.7 mm Hg — i.e. the two interventions overlap rather than fully stack. [^14]

### 5.3 Caffeine and alcohol

- FDA cites **400 mg/day** of caffeine as an amount not generally associated with negative effects in healthy adults. [^17]
- FDA estimates toxic effects such as seizures from rapid consumption of around **1,200 mg** of caffeine. [^17]
- Pure and highly concentrated caffeine products have caused deaths and warrant explicit caution. [^17]
- The Dietary Guidelines advise avoiding caffeinated drinks for children under 2, and medical experts advise against energy drinks for children and teens. [^17]
- AHA's position on alcohol is: if you do not drink, do not start; if you do, limit intake. [^12]

---

## 6. Scope of practice: the hard line this agent runs on

This is the part a build team most often gets wrong, and it is a legal question, not a style
question: state licensing boards define what may be done and by whom. [^18] [^20]

### 6.1 "Nutritionist" and "registered dietitian" are not interchangeable in the US

- Registered Dietitian Nutritionists are credentialed against competencies set by the Commission on Dietetic Registration and are the practitioners recognised to deliver medical nutrition therapy. [^21]
- US states regulate nutrition practice unevenly — some by licensure, some by certification only, some by title protection only, and a few with no statute at all. [^20]
- The Academy maintains the state-by-state statute map, which is the only reliable way to answer "is this legal where the user lives." [^19]
- In a licensure state such as North Carolina, a licence is required specifically to provide **medical nutrition therapy**, defined as "the provision of nutrition care services for the purpose of managing or treating a medical condition." [^18]
- Licensed nutrition care services there include assessing nutritional needs, ordering related laboratory tests, setting nutritional goals, nutrition counselling for health and disease, and ordering therapeutic diets. [^18]
- Enteral and parenteral nutrition therapy may be ordered only by licensed practitioners who are RDNs, Certified Nutrition Support Clinicians, or who meet board-specified requirements. [^18]
- Retail sale of food products or vitamins is explicitly outside that scope. [^18]

**Build rule:** the agent is a *nutrition education* tool. It must not describe itself as a
dietitian, must not claim to provide medical nutrition therapy, and should surface the
licensure-map link when a user asks who may legally advise them. [^19] [^18]

### 6.2 The education / therapy boundary, operationalised

The agent **may**:

- Explain DRIs, AMDRs, label reading and food composition, with the source named. [^6] [^10]
- Describe what a named therapeutic diet involves in general terms, as published by the relevant society. [^23] [^25]
- Build general meal plans and shopping strategies for people without a diagnosed condition requiring therapy. [^72]
- Estimate energy needs with Mifflin-St Jeor plus a stated error band. [^9]

The agent **must not**:

- Prescribe nutrient targets for a diagnosed disease (diabetes, CKD, CVD, celiac) as an individualised therapy plan — ADA explicitly routes this to an RDN, preferably one experienced in diabetes care. [^23]
- Set protein or electrolyte prescriptions for anyone with known or suspected kidney disease. [^25]
- Run or supervise an elimination diet unsupervised; the ACG notes the low-FODMAP diet's complexity and deficiency risk require a trained GI dietitian. [^35]
- Interpret lab results, order tests, adjust medication, or diagnose — ordering nutrition-related laboratory tests is itself a licensed act. [^18]

### 6.3 Mandatory escalation triggers

The agent should hand off, name the reason, and stop advising when it sees:

- Signs of an eating disorder. The 5-item SCOFF has pooled sensitivity 0.86 (95% CI 0.78–0.91) and specificity 0.83 (95% CI 0.77–0.88); ≥2 positive answers warrants referral for diagnostic assessment. [^22]
- Any request to restrict intake in pregnancy, infancy or childhood beyond published guidance. [^49] [^53]
- Known or suspected CKD, dialysis, or a request for a low-protein prescription. [^25]
- Celiac disease management questions that go past label reading into diagnosis or monitoring. [^34]
- Suspected anaphylactic food allergy, or any plan to reintroduce a known allergen. [^41] [^44]
- Supplement doses at or above a UL, or any supplement taken alongside warfarin, MAOIs, immunosuppressants, statins or thyroid medication. [^47] [^48]
- Pure or concentrated caffeine products, or stimulant stacking. [^17]

**Build rule:** encode these as refusal-with-referral, not refusal. Name the professional type
and the reason — an RDN for medical nutrition therapy, an allergist before allergen
reintroduction, an eating-disorder service on a positive SCOFF. [^23] [^45] [^22]

---

## 7. Evidence-strength vocabulary the agent should use

The agent should label every claim with one of four strengths and never flatten them:

- **Strong / high-quality:** fed-trial or large RCT evidence, e.g. DASH-Sodium's BP reductions. [^14]
- **Moderate:** guideline recommendations graded moderate, e.g. ACG's strong recommendation for weight loss in GERD on moderate-quality evidence. [^38]
- **Low / conditional:** e.g. ACG's conditional, very-low-quality recommendation for a low-FODMAP trial in IBS. [^35]
- **Contested / in flux:** e.g. the 2025–2030 DGA protein target versus the RDA and specialty-society positions. [^2] [^3] [^5]

Where the number itself is disputed rather than the direction, say so. The REDs energy-availability
threshold is a worked example of a widely quoted cutoff whose own field has moved away from it —
see `05-nutrition-exercise-interface.md`. [^89]

---

See `02-medical-diets-allergies.md` for the next part of this report.
