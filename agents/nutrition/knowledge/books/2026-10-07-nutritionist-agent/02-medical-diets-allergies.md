# 02 — Therapeutic Diets, Food Allergies and Intolerances

Retrieved 2026-10-07. Coverage is deliberately breadth-first across the highest-prevalence
conditions. Every condition section ends with the automation boundary: what the agent may say
and what must route to a credentialed clinician.

---

## 1. Diabetes and prediabetes

### 1.1 What ADA actually recommends

- ADA's Standards of Care route individualised medical nutrition therapy to a registered dietitian nutritionist, preferably one with comprehensive diabetes experience (Recommendation 5.10). [^23]
- ADA **does not endorse any single meal plan or any specified macronutrient percentages**; it recommends individualising to treatment goals, physiological parameters and medications. [^23]
- Eating patterns should emphasise non-starchy vegetables, whole fruits, legumes, lean proteins, whole grains, nuts and seeds, and low-fat dairy or non-dairy alternatives. [^23]
- They should minimise red meat, sugar-sweetened beverages, sweets, refined grains, and processed and ultra-processed foods. [^23]
- The 2026 Standards suggest considering reduced carbohydrate intake for some adults with diabetes to improve glycaemia, with limiting processed foods as an effective route. [^23]
- Fiber target in ADA practice is **at least 14 g per 1,000 kcal**. [^5]
- Protein for general diabetes management: approximately **0.8 g/kg/day**. [^5]
- Saturated fat: **<10% of total daily calories**, roughly 22 g on a 2,000-kcal diet. [^5]
- Sodium: **<2,300 mg/day**. [^5]
- ADA prioritises Mediterranean-style and DASH-like patterns emphasising vegetables, fruits, whole grains, legumes, nuts, fish and unsaturated plant oils. [^5]
- Red meat intake is associated with higher type 2 diabetes risk in a dose-dependent manner, which favours plant protein sources. [^5]
- Changes each year are summarised in ADA's published Summary of Revisions, which the agent's knowledge base should re-check annually. [^24]

### 1.2 The conflict the agent must handle

The 2025–2030 DGA protein target of 1.2–1.6 g/kg/day is substantially above ADA's ~0.8 g/kg/day,
and is potentially harmful for people with undiagnosed kidney disease — fewer than 15% of people
with CKD recognise their diagnosis. [^5]
The DGA also highlights full-fat dairy at 3 servings/day and butter as acceptable while keeping a
<10% saturated-fat cap, which creates a practical conflict in diabetes management. [^5]

### 1.3 Automation boundary

- **Agent may:** explain carbohydrate counting mechanics, glycaemic concepts, fiber targets, label reading, and the general shape of Mediterranean/DASH patterns. [^5] [^13]
- **Agent must refuse:** setting insulin-to-carbohydrate ratios, titrating carbohydrate against medication, or prescribing a carbohydrate gram target for a specific person — ADA assigns this to an RDN. [^23]

---

## 2. Chronic kidney disease and dialysis

The KDOQI 2020 nutrition-in-CKD guideline is the reference. [^26]

| Population | Protein prescription | Cite |
|---|---|---|
| CKD 3–5, metabolically stable, not on dialysis | 0.55–0.60 g/kg/day (low-protein diet) [^25] | [^25] |
| CKD 3–5, very-low-protein route | 0.28–0.43 g/kg/day plus keto-acid/amino-acid analogues to reach 0.55–0.60 g/kg/day equivalent [^25] | [^25] |
| CKD 3–5 with diabetes | 0.6–0.8 g/kg/day per KDOQI; KDIGO states 0.8 g/kg/day [^27] | [^27] |
| CKD 5D on maintenance haemodialysis or peritoneal dialysis, metabolically stable | 1.0–1.2 g/kg/day [^25] | [^25] |

Sodium and other specifics:

- KDIGO recommends **<2 g sodium/day** (<90 mmol/day sodium, <5 g sodium chloride/day) for diabetes and CKD. [^27]
- KDOQI's parallel nutrition guideline uses the slightly higher 2.3 g/day and the groups judged the difference not clinically meaningful. [^27]
- KDOQI recommends emphasising vegetable-based protein sources, but the supporting evidence is observational rather than from controlled trials. [^27]

Evidence strength, stated honestly:

- A 2009 Cochrane review found protein restriction "may slow progression to kidney failure, but to a nonsignificant degree." [^27]
- More recent meta-analyses showed greater benefit in type 1 than type 2 diabetes. [^27]
- Day-to-day dietary variation is large enough that the 0.6–0.8 vs 0.8 g/kg/day gap between guidelines was judged clinically unimportant. [^27]

### 2.1 Automation boundary — the hardest refusal in this knowledge base

- **Agent must refuse** to set a protein, potassium, phosphorus or sodium prescription for anyone with CKD or on dialysis. A low-protein diet in CKD is managed as a medication-grade intervention and requires a renal dietitian. [^25]
- **Agent may** explain what the guideline ranges are and why they differ by dialysis status, and recommend a renal RDN referral. [^25] [^26]
- **Agent must proactively flag** high-protein advice as unsafe when kidney function is unknown, because most CKD is undiagnosed. [^5]

---

## 3. Cardiovascular disease and hypertension

The AHA ten-feature pattern in `01-overview.md` is the backbone. [^12]
DASH plus sodium reduction is the quantified intervention: **11.5 mm Hg** lower systolic BP in
hypertensive participants on DASH + low sodium versus control + high sodium. [^14]
NHLBI's DASH plan caps sodium at 2,300 mg/day and notes 1,500 mg/day lowers BP further. [^13]
DASH serving targets at 2,000 kcal are in `01-overview.md` §5.2. [^13]

- AHA directs people to liquid plant oils rather than tropical oils and partially hydrogenated fats. [^12]
- AHA directs people to choose minimally processed over ultra-processed foods — consistent with the 508 kcal/day effect in the NIH inpatient trial. [^12] [^15]
- WHO caps trans fat at ≤1% of energy and saturated fat at ≤10%. [^11]

**Automation boundary:** the agent may teach the pattern and the sodium arithmetic; it must not
manage a patient on diuretics, potassium-sparing agents or warfarin without clinician
involvement (see §8). [^47]

---

## 4. Celiac disease and gluten

### 4.1 The regulatory threshold

- FDA's final rule, issued **2 August 2013**, lets a food be labelled "gluten-free" if it contains **less than 20 ppm gluten** and meets the other requirements. [^28]
- FDA chose 20 ppm because analytical methods validated to reliably detect gluten below that level were not available. [^28]
- Research indicates about **10 mg of gluten per day** is a safe level for the vast majority of people with celiac disease. [^29]
- For scale, 10 mg/day is roughly one-eighth of a teaspoon of flour, or 18 slices of bread each at 20 ppm. [^29]
- Celiac disease affects about 1 in 100 people worldwide. [^29]

### 4.2 Sources of gluten and cross-contact

- Gluten comes from wheat, barley and rye, and appears in many non-obvious products, so label reading is the core skill. [^30]
- Oats are easily contaminated in the supply chain; people with celiac disease should buy oats specifically labelled gluten-free. [^30]
- Cross-contact occurs when a gluten-free food is exposed to a gluten-containing ingredient or food, making it unsafe for someone with celiac disease. [^31]
- Separate equipment for gluten-free preparation is the conventional recommendation, and experts have long advised a dedicated toaster. [^31]

### 4.3 Where the evidence has moved — the agent should not over-restrict

- A preliminary Children's National Hospital study found **no significant gluten transfer** from a shared toaster: gluten stayed under 20 ppm when gluten-free bread was toasted alongside regular bread, across repeat tests and with gluten-containing crumbs present. [^32]
- A pilot study of gluten-free foods cooked in **shared fryers** with wheat-containing items specifically assessed gluten cross-contact and is the right citation for restaurant fryer questions. [^33]
- NIDDK's patient guidance covers the practical gluten-free diet, including hidden sources, and recommends dietitian involvement. [^34]

**Build rule:** the agent should separate *regulatory* thresholds (20 ppm label rule) from
*physiological* thresholds (≈10 mg/day) from *kitchen-practice* evidence (measured transfer in
specific activities). Conflating them produces either fear or false safety. [^28] [^29] [^32]

**Automation boundary:** the agent may teach label reading and kitchen separation. Diagnosis
requires serology and biopsy before gluten removal — the agent must not advise starting a
gluten-free diet before testing, and should route to a gastroenterologist. [^34]

---

## 5. IBS and the low-FODMAP diet

### 5.1 What the guideline says, and how weak the evidence is

- ACG's 2021 IBS guideline recommends a **limited trial** of a low-FODMAP diet to improve global symptoms. [^35]
- That is a **conditional recommendation based on very low quality of evidence**. [^35]
- ACG notes the diet's complexity, the potential for nutritional deficiencies, and the time and resources for counselling require "the services of a properly trained gastrointestinal dietician." [^35]
- Despite the low evidence grade, low-FODMAP remains the most evidence-based dietary intervention for IBS. [^35]
- AGA's clinical practice update on diet in IBS is the companion document for implementation detail. [^37]

### 5.2 The three phases and their durations

| Step | What happens | Duration | Cite |
|---|---|---|---|
| 1. Low FODMAP (elimination) | Restrict high-FODMAP foods under dietitian supervision | 2–6 weeks [^36] | [^36] |
| 2. Reintroduction | Systematically retest FODMAP subgroups against a low-FODMAP baseline | ~6–8 weeks for most people [^36] | [^36] |
| 3. Personalisation | Long-term diet restricting only the subgroups the person reacts to | ongoing [^36] | [^36] |

Monash is explicit that the elimination phase is **not a diet for life** — the restriction exists
to generate information, then is relaxed. [^36]

**Automation boundary:** the agent may explain the three phases, their purpose and their
durations, and may say plainly that phase 1 should not be run indefinitely. It must not design
or supervise an elimination protocol, because the ACG assigns that to a trained GI
dietitian. [^35]

---

## 6. GERD

- Weight loss in overweight and obese patients is recommended for GERD symptom improvement: **moderate quality of evidence, strong recommendation**. [^38]
- Avoiding meals within **2–3 hours of bedtime**: low quality of evidence, conditional recommendation. [^38]
- Avoiding individual "trigger foods" for symptom control: low quality of evidence, conditional recommendation. [^38]

**Build rule:** this is the cleanest example in the knowledge base of a popular intervention
(trigger-food elimination) that guidelines rate as weak. The agent should say the evidence is
low-quality and conditional rather than reciting a standard "avoid coffee, chocolate, tomatoes"
list as fact. [^38]

---

## 7. PCOS

- The 2023 International Evidence-based Guideline finds **no evidence supporting any one diet composition over another** for anthropometric, metabolic, hormonal, reproductive or psychological outcomes in PCOS. [^39]
- No single regimen has benefits over others despite many individual diet and activity regimens showing benefit. [^39]
- Lifestyle intervention — exercise alone, or multicomponent diet plus exercise plus behavioural strategies — should be recommended for all women with PCOS to improve metabolic health including central adiposity and lipid profile. [^39]
- Healthy eating and/or physical activity should be recommended to all women with PCOS for general health, quality of life, body composition and weight management. [^40]
- There are benefits to a healthy lifestyle **even in the absence of weight loss**. [^40]

**Build rule:** PCOS is the highest-risk area for a nutrition agent to parrot internet claims
(keto, "insulin-resistance diets", inositol protocols) as established. The guideline's finding is
that composition does not matter more than adherence. [^39]

---

## 8. Food allergies and intolerances

### 8.1 The nine major US allergens and the labelling law

- The nine federally recognised major food allergens are milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans and sesame. [^41]
- Sesame became the ninth via the FASTER Act and **must be labelled as of 1 January 2023**. [^41]
- Manufacturers must declare it in the ingredient list by common name, in a "Contains" statement after the ingredient list, or in parentheses after the ingredient name. [^41]
- Those three declaration formats are the only mandatory ones — precautionary "may contain" statements are not covered by the mandatory-declaration rule. [^41]

### 8.2 Prevalence

- Estimated convincing food-allergy prevalence among US adults is **10.8% (95% CI 10.4–11.1%)**. [^42]
- Childhood food-allergy prevalence was estimated at **8.0% (95% CI 7.6–8.3%)**. [^43]
- The most common adult allergies reported were shellfish 2.9%, milk 1.9%, peanut 1.8%, tree nut 1.2%. [^42]
- Roughly 1.6 million Americans have sesame allergy, the figure that drove the FASTER Act. [^41]

### 8.3 Prevention: early introduction, not avoidance

- NIAID published Addendum Guidelines for peanut-allergy prevention in **January 2017**, following the LEAP trial. [^44]
- LEAP enrolled **640 infants aged 4–11 months** with severe eczema, egg allergy, or both. [^45]
- Infants who began and continued peanut consumption to age 5 had an **81% reduced risk** of peanut allergy. [^45]
- The guidelines recommend introducing peanut-containing foods to all infants before age 1, beginning around **4 to 6 months**, once the infant can developmentally tolerate solids. [^45]
- Infants with moderate-to-severe eczema and/or existing egg allergy are highest risk and should be **tested before** peanut introduction; all other infants should have peanut introduced without testing. [^45]

**Automation boundary:** the agent may explain the guideline and the risk stratification. It must
**refuse** to direct an at-home introduction for a high-risk infant and must route to an
allergist for pre-introduction testing. [^45] [^44]

### 8.4 Lactose intolerance — an intolerance, not an allergy

- Most people with lactose intolerance tolerate some lactose: many can have **12 g of lactose, the amount in about 1 cup of milk**, without significant symptoms. [^46]
- Practical strategies: small portions with meals, gradual reintroduction to find tolerance, and choosing yogurt and hard cheeses (cheddar, Swiss) which are lower in lactose. [^46]
- Lactase enzyme products help digest lactose and widen tolerance. [^46]
- Hidden lactose appears in bread and baked goods, processed foods, breakfast cereals, processed meats and coffee creamers; label terms to scan for include milk, whey, curds and dry milk solids. [^46]
- If dairy is avoided, non-dairy calcium sources include fish with soft bones, leafy greens, broccoli, oranges, almonds and fortified products. [^46]

**Build rule:** the agent should default to *dose-finding*, not elimination, for lactose
intolerance, and should explicitly contrast this with milk allergy, where strict avoidance
applies. [^46] [^41]

### 8.5 Safe substitution and cross-contact: the agent's general rules

Drawn from the celiac and allergen material above, these generalise:

- Substitution for an **allergy** means strict avoidance of the protein plus avoidance of cross-contact; substitution for an **intolerance** means dose management. [^41] [^46]
- Check the three mandatory declaration locations on every package, every purchase — formulations change. [^41]
- Dedicated preparation equipment is the conservative default; where measured studies exist (toasters, shared fryers) they can refine, not replace, the default. [^31] [^32] [^33]
- For wheat/gluten, "gluten-free" is a legal claim at <20 ppm; "wheat-free" is not the same claim and does not cover barley or rye. [^28] [^30]

---

## 9. Phenylketonuria — the one genuinely diet-dependent monogenic condition the agent will meet

- PKU is an autosomal recessive disorder of phenylalanine hydroxylase activity, detected by newborn screening. [^65]
- A phenylalanine-restricted diet is the cornerstone of therapy, started within **10–14 days of birth** and continued lifelong. [^65]
- Treatment combines restriction of natural protein, a phenylalanine-free amino-acid mixture, and low-protein foods. [^65]
- Target blood phenylalanine is **120–360 µmol/L** lifelong, requiring dietitian supervision and regular monitoring. [^65]

**Automation boundary:** total refusal. PKU management is metabolic medicine; the agent explains
what it is and routes to the metabolic clinic. [^65]

---

## 10. Drug–nutrient interactions the agent must screen for

These are the highest-yield interactions for a general nutrition agent.

- **Warfarin and vitamin K.** Green leafy vegetables supply vitamin K, which reduces warfarin efficacy; the rule is *consistency*, not avoidance — patients pick a weekly number of vitamin-K-food servings and hold it steady. [^47]
- Changes in vitamin K consumption cause INR fluctuations; cranberry juice conversely increases INR. [^47]
- **MAOIs and tyramine.** Tyramine-rich foods such as aged cheese and red wine with MAOIs can cause severe hypertension, arrhythmia, hyperthermia and cerebral haemorrhage; linezolid and isoniazid share MAOI properties. [^47]
- **Grapefruit and CYP3A4.** Grapefruit juice blocks intestinal CYP3A4 so more drug enters the blood, and also inhibits drug transporters, which can reduce absorption of others such as fexofenadine. [^48]
- Affected classes include statins, some calcium-channel blockers, transplant anti-rejection drugs, anti-anxiety drugs, corticosteroids, antiarrhythmics and antihistamines. [^48]
- Severity varies by individual depending on how much intestinal CYP3A4 the person has. [^48]
- Felodipine shows AUC increases as high as 200% with grapefruit. [^47]
- **Calcium/dairy and antibiotics.** Fluoroquinolones need separation of at least 2 hours before or 6 hours after calcium; tetracyclines chelate with dairy. [^47]
- **Potassium and ACE inhibitors / potassium-sparing diuretics.** These drugs already raise potassium, so excessive potassium intake should be avoided. [^47]

**Automation boundary:** the agent screens and flags; it does not adjust. Any flagged
interaction routes to a pharmacist or prescriber. [^48] [^47]

---

## 11. Conditions to defer rather than cover

For an agent with a general nutrition remit, the following should be *named and deferred*, not
automated, because the prescription is individualised and the harm from error is high:

- CKD and dialysis electrolyte and protein prescriptions. [^25]
- PKU and other inborn errors of metabolism. [^65]
- Enteral and parenteral nutrition, which in licensure states may only be ordered by an RDN, a Certified Nutrition Support Clinician, or an equivalently qualified licensee. [^18]
- Eating disorders, where the agent screens and refers rather than advises. [^22]
- Diagnosis of celiac disease or food allergy. [^34] [^45]

---

See `03-life-stage-demographics.md` for the next part of this report.
