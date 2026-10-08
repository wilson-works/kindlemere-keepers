# 03 — Nutrition Across Life Stage, Sex, Activity and Genotype

Retrieved 2026-10-07. This file holds the systematic shifts an agent must apply before giving any
number, plus an explicit treatment of what nutrigenomics does and does not support.

---

## 1. Why life stage must be a first-class branch, not a modifier

Every DRI table in `01-overview.md` is indexed by life stage first. The agent should treat
"who is asking" as a required slot before producing any nutrient target, because several values
move by 2× or more across the table — iron from 8 to 27 mg/day, folate from 400 to 600 µg DFE,
protein from 46 to 71 g/day. [^6] [^7] [^8]

Minimum slots the agent needs filled before giving numbers:

1. Age band (infant / child / adolescent / adult / 51+ / 71+). [^6]
2. Sex, and pregnancy or lactation status. [^6]
3. Activity load, which changes energy and sometimes protein and fluid. [^81]
4. Known medical conditions and medications (see `02-medical-diets-allergies.md`). [^23] [^47]

---

## 2. Infancy (0–12 months)

- AAP recommends **exclusive breastfeeding for about 6 months**, associated with lower rates of lower-respiratory infection, severe diarrhoea, ear infection, obesity and SIDS. [^55]
- All breastfed infants should receive at least **400 IU/day of vitamin D**, starting within the first few days of life. [^56]
- The minimum vitamin D intake for infants is 400 IU/day beginning soon after birth. [^53]
- **No honey in any form during the first year** — risk of infant botulism. [^54]
- **No cow's milk as a beverage before 12 months.** [^54]
- Do not add salt or sugar to homemade infant foods, and avoid canned foods that are high in both. [^54]
- Protein AI is 1.52 g/kg/day at 0–6 months and 1.2 g/kg/day at 7–12 months. [^6]
- Total water AI is 0.7 L/day at 0–6 months and 0.8 L/day at 7–12 months, essentially all from milk or formula at the younger age. [^6]
- Allergen introduction: begin peanut-containing foods around **4–6 months**, with pre-testing only for infants with moderate-to-severe eczema and/or egg allergy. [^45]
- FDA/EPA advise 2 servings of lower-mercury fish per week for children from age 1, with serving size 1 oz at ages 1–3. [^52]
- The Dietary Guidelines advise avoiding caffeinated drinks for children under 2. [^17]

**Automation boundary:** the agent may relay these published rules. It must not design a feeding
plan for an infant with faltering growth, reflux, suspected CMPA or prematurity — those route to
the paediatrician. [^55]

---

## 3. Childhood and adolescence

- Fat AMDR is wider in young children: **30–40% of energy at 1–3 years** and 25–35% at 4–18 years, versus 20–35% in adults. [^6]
- Protein AMDR is **5–20% at 1–3 years**, 10–30% at 4–18 years. [^6]
- Carbohydrate RDA is a flat 130 g/day from age 1 upward. [^6]
- Fiber AI climbs steeply through adolescence: 19 g (1–3 y), 25 g (4–8 y), 26–31 g (9–13 y), 38 g for males 14–18 y, 26 g for females 14–18 y. [^6]
- Protein RDA: 13 g (1–3 y), 19 g (4–8 y), 34 g (9–13 y), 52 g (males 14–18 y), 46 g (females 14–18 y). [^6]
- WHO sets fruit and vegetables at ≥250 g/day for ages 2–5 and ≥350 g/day for ages 6–9. [^11]
- WHO fiber targets for children are 15 g/day (2–5 y) and 21 g/day (6–9 y). [^11]
- FDA/EPA fish serving sizes scale with age: 1 oz (1–3 y), 2 oz (4–7 y), 3 oz (8–10 y), 4 oz (age 11). [^52]
- Excess caffeine in young people can cause tachycardia, palpitations, raised blood pressure, anxiety, sleep problems, digestive upset and dehydration; energy drinks are advised against for children and teens. [^17]
- The 2025–2030 DGA advises avoiding added sugars entirely, especially for children. [^2]

**Sex divergence begins here.** Iron requirements diverge at menarche and the male/female
adolescent protein and fiber values separate at 14 years. [^6] [^8]

---

## 4. Pregnancy

### 4.1 Gestational weight gain by pre-pregnancy BMI

| Pre-pregnancy BMI | Recommended total gain | Cite |
|---|---|---|
| Underweight, <18.5 | 28–40 lb [^49] | [^49] |
| Normal, 18.5–24.9 | 25–35 lb [^49] | [^49] |
| Overweight, 25.0–29.9 | 15–25 lb [^49] | [^49] |
| Obese, ≥30 | 11–20 lb [^49] | [^49] |

### 4.2 Energy and nutrients

- Energy: add roughly **350–450 kcal/day** above pre-pregnancy intake; pregnancy does not double requirements. [^49]
- Folate RDA rises to **600 µg DFE/day**; a prenatal with at least 400 µg folic acid plus folate-rich food is the usual route. [^7] [^50]
- Women with a prior neural-tube-defect pregnancy may need up to 4,000 µg/day of folic acid. [^49]
- Iron: **27 mg/day**, commonly supplied as 30 mg elemental iron in a prenatal. [^8] [^49]
- Calcium: 1,000 mg/day total, of which prenatals typically supply only 200–300 mg. [^49]
- Vitamin D: 600 IU/day, with prenatals supplying 200–600 IU. [^49] [^7]
- Iodine rises to **220 µg/day** in pregnancy and 290 µg/day in lactation. [^8]
- Protein RDA rises to **71 g/day** in both pregnancy and lactation. [^6]
- Carbohydrate RDA rises to 175 g/day (pregnancy) and 210 g/day (lactation). [^6]
- Total water AI is 3.0 L/day in pregnancy and 3.8 L/day in lactation. [^6]
- Omega-3: around 650 mg/day including 300 mg DHA is a commonly cited target, and prenatals supply 0–450 mg. [^49]
- NIH ODS maintains the health-professional fact sheet on supplements in pregnancy, which is the right source for supplement-specific questions. [^51]

### 4.3 Avoidances and limits

- Caffeine: limit to **200 mg/day**, about two small cups of coffee. [^49]
- Alcohol: complete avoidance, because of fetal alcohol spectrum disorders. [^49]
- Listeria risk: restrict unpasteurised foods, soft cheeses, deli meats, sprouts and raw fish. [^49]
- Mercury: avoid swordfish, shark, king mackerel, orange roughy, bigeye tuna, marlin and Gulf tilefish. [^52] [^49]
- Fish **should not be avoided** — FDA/EPA advise **8–12 oz/week** of lower-mercury seafood during pregnancy and breastfeeding. [^52]
- That is 2–3 servings/week from the "Best Choices" list (salmon, sardines, anchovies, catfish, tilapia, cod, flounder, shrimp, canned light tuna) or 1 serving from "Good Choices." [^52]
- Fish supplies omega-3s, iron, iodine and choline that support fetal brain development, which is why the advice is a floor as well as a ceiling. [^52]
- ACOG's patient-facing healthy-eating FAQ is the lay-language companion for all of the above. [^50]

**Automation boundary:** the agent may relay published pregnancy guidance. It must refuse to
set a weight-gain plan, manage gestational diabetes, or advise restriction in pregnancy, and
should route to the obstetric team. [^49] [^50]

---

## 5. Older adults (51+, and 71+)

### 5.1 DRI shifts

- Calcium rises to **1,200 mg/day** (women 51+, men 71+), and its UL drops to 2,000 mg/day at 51+. [^8]
- Vitamin D rises to **800 IU/day** above age 70. [^7]
- Vitamin B6 rises to 1.7 mg/day (men) and 1.5 mg/day (women) from age 51. [^7]
- Women's iron RDA falls from 18 to **8 mg/day** after menopause. [^8]
- Fiber AI falls with declining energy needs: 30 g/day for men 51+ and 21 g/day for women 51+. [^6]

### 5.2 Protein: the one place the RDA is widely considered too low

- The PROT-AGE Study Group and ESPEN recommend **at least 1.0–1.2 g protein/kg/day** for healthy older adults. [^57]
- Up to **1.2–1.5 g/kg/day** is indicated in older people with acute or chronic disease, and higher with severe illness or injury. [^57]
- Up to **2.0 g/kg/day** is cited for malnourished older adults. [^58]
- The ESPEN expert group convened on protein requirements in the elderly in Dubrovnik in 2013 and set the ≥1.0–1.2 g/kg/day figure. [^57]
- Adequate protein plus energy, combined with exercise, limits and treats age-related declines in muscle mass, strength and function. [^57]
- Shortfall is common: in community-dwelling UK adults aged 65–89, 36% failed to meet the UK RNI of 0.75 g/kg/day and 85% fell short of 1.2 g/kg/day. [^66]
- Per-meal dosing matters more with age: older adults may need up to **40 g** of protein per serving to maximise muscle protein synthesis, versus ~20 g in younger adults. [^83]

**Build rule:** for a healthy adult over 65, the agent should quote 1.0–1.2 g/kg/day and name
PROT-AGE/ESPEN, while flagging that kidney function must be known first — the CKD prescription
runs the opposite direction (0.55–0.60 g/kg/day). [^57] [^25]

---

## 6. Sex differences, beyond pregnancy

Recorded DRI differences for adults 19–50, which are the ones an agent will actually use:

| Nutrient | Men | Women | Cite |
|---|---|---|---|
| Iron | 8 mg | 18 mg (premenopausal) [^8] | [^8] |
| Zinc | 11 mg | 8 mg [^8] | [^8] |
| Vitamin C | 90 mg | 75 mg [^7] | [^7] |
| Vitamin A | 900 µg RAE | 700 µg RAE [^7] | [^7] |
| Vitamin K | 120 µg | 90 µg [^7] | [^7] |
| Thiamin | 1.2 mg | 1.1 mg [^7] | [^7] |
| Riboflavin | 1.3 mg | 1.1 mg [^7] | [^7] |
| Niacin | 16 mg NE | 14 mg NE [^7] | [^7] |
| Choline | 550 mg | 425 mg [^7] | [^7] |
| Magnesium | 400–420 mg | 310–320 mg [^90] | [^90] |
| Potassium | 3,400 mg | 2,600 mg [^8] | [^8] |
| Fiber | 38 g (19–50) | 25 g (19–50) [^6] | [^6] |
| Total water | 3.7 L | 2.7 L [^6] | [^6] |

The Mifflin-St Jeor equation differs by sex only in its constant: +5 for men, −161 for
women. [^9]

---

## 7. Activity level

This is covered in depth in `05-nutrition-exercise-interface.md`. The short version the agent
needs at the demographic branch point:

- Protein for exercising adults is **1.4–2.0 g/kg/day**, above both the 0.8 g/kg/day RDA and the DGA's 1.2–1.6 g/kg/day. [^83]
- Carbohydrate scales with training volume from about 5 to 12 g/kg/day. [^84]
- Energy availability, not just energy intake, becomes the governing variable in heavy training. [^87]
- Fluid needs rise with sweat rate; the DRI water AI assumes sedentary-to-moderate activity in temperate climates. [^6] [^85]

---

## 8. Vegetarian and vegan patterns

- The Academy of Nutrition and Dietetics' position "Vegetarian Dietary Patterns for Adults" was **approved January 2025 and runs to 31 December 2032**. [^59]
- It holds that appropriately planned vegetarian and vegan patterns can be nutritionally adequate and can improve several cardiometabolic health outcomes. [^59]
- Micronutrients of concern are **vitamin B12, iodine, iron, choline and vitamin D**, with **calcium** additionally a concern for vegans. [^60]
- Using methylmalonic acid as the marker, B12 deficiency prevalence among healthy non-pregnant adult vegetarians ranged **30–86%**, and among vegans **43–88%**. [^60]
- A systematic review found vegetarian and vegan patterns may be associated with lower circulating ferritin, with a high prevalence of iron deficiency in vegetarian premenopausal women. [^60]
- Zinc and omega-3 fats were flagged in earlier Academy reviews; the 2025 position foregrounds B12, iodine, iron, choline and vitamin D. [^60]

**Build rule:** for any plant-based user the agent should run a fixed five-nutrient checklist
(B12, iodine, iron, choline, vitamin D, plus calcium if vegan) rather than general reassurance,
and should treat B12 as supplement-or-fortified-food-mandatory. [^60]

---

## 9. Nutrigenomics: what the evidence supports, and where the marketing runs ahead

This section exists because it is the single easiest place for a nutrition agent to overclaim: a
scoping review found 104 companies selling 204 nutrition-gene panels on limited evidence. [^62]

### 9.1 The best direct test of genotype-based personalisation found no added benefit

- Food4Me was a web-based RCT across seven European countries with four arms over 6 months: conventional non-personalised advice; personalised advice from diet data alone; diet plus phenotype; diet plus phenotype plus genotype. [^61]
- The result: "no evidence that including phenotypic and phenotypic plus genotypic information enhanced the effectiveness of the personalised nutrition advice." [^61]
- Personalisation based on **diet alone** was as effective as the phenotype and genotype arms. [^61]
- Personalised advice did beat generic advice — the gain came from personalisation per se, not from DNA. [^61]

**This is the headline finding the agent should give when asked about DNA diets.** [^61]

### 9.2 What the direct-to-consumer market actually sells

- A scoping review identified **104 companies offering 204 nutrition-related testing panels**, a 43% increase since 2019. [^62]
- Average test cost was **$234 USD**, with 77.6% priced between $100 and $500. [^62]
- Panels collectively covered **3,309 unique genes**. [^62]
- The five most frequently tested were **FTO, HLA-DQ, MTHFR, PPARG and TCF7L2**. [^62]
- Most common categories were micronutrients (1,593 genes), cardiovascular health (1,446) and weight management (1,383). [^62]
- The authors concluded the evidence supporting nutrigenetic recommendations remains limited, noting GWAS associations "are far from causal relationships." [^62]
- FTO, PPARG and TCF7L2 links to weight management show only modest effects, with "no statistically significant effects demonstrated" in meta-analyses. [^62]
- Most polygenic disease recommendations lack randomised-trial validation, genes do not act in isolation, and company-unique panels typically have not undergone peer review. [^62]
- There is high variability between company panels and almost no resource for practitioners to judge which have clinical utility. [^62]

### 9.3 Where gene–diet relationships *are* real

The agent may affirm these, with the caveat attached:

- **Lactase persistence (MCM6 regulatory element controlling LCT).** A regulatory element in MCM6 controls LCT expression; variants there sustain lactase production for life. [^63]
- In European populations lactase persistence is mainly determined by the rs4988235-T variant, which increases LCT expression. [^63]
- Lactose intolerance in adulthood is caused by the normal, gradual decline of LCT expression after infancy in most humans. [^64]
- The persistence variants are autosomal dominant; one copy suffices, and people inheriting none are lactase non-persistent. [^64]
- Even so, the practical answer is dose-finding — many lactase-non-persistent people tolerate ~12 g lactose, about a cup of milk. [^46]
- **Phenylketonuria (PAH).** A monogenic, autosomal recessive enzyme deficiency where lifelong dietary phenylalanine restriction is the treatment, with a blood target of 120–360 µmol/L. [^65]
- **HLA-DQ and celiac disease.** HLA-DQ testing is among the better-established nutrigenetic applications, though carrying the genotype does not mean the disease is present. [^62]
- **MTHFR and folate metabolism.** The association with folate metabolism is real; the leap from that association to a personalised supplement protocol is not evidenced. [^62]

### 9.4 The rules the agent must follow on genetics

1. Never interpret a DTC nutrigenomic report as a basis for a nutrient prescription — the panels are largely unvalidated. [^62]
2. When asked whether DNA testing improves dietary outcomes, cite Food4Me's null result for the genotype arm. [^61]
3. Distinguish three tiers explicitly: **monogenic diet-responsive disease** (PKU — real, clinical), **single well-characterised variants with modest practical consequence** (lactase persistence — real, but managed by dose), and **polygenic trait panels** (FTO/PPARG/TCF7L2 — not actionable). [^65] [^63] [^62]
4. Say "genes do not act in isolation" rather than implying a variant determines a diet. [^62]
5. Route any genetic result with clinical implications to a clinician or genetic counsellor; HLA-DQ carriage is not a celiac diagnosis. [^62]

---

See `04-cooking-meal-prep-budget.md` for the next part of this report.
