# 04 — Meal Planning, Meal Prep, Budget Shopping, Recipe Adaptation and Food Safety

Retrieved 2026-10-07. This is the practical half of the agent's job and the half most likely to
be asked about daily. Food-safety numbers here are given exactly and sourced to the federal
charts, because this is the one area where an error causes acute harm. [^67] [^68]

---

## 1. Food safety: the non-negotiable numbers

### 1.1 Safe minimum internal cooking temperatures

| Food | Safe minimum internal temperature | Cite |
|---|---|---|
| Poultry, all types | 165°F [^68] | [^68] |
| Ground meats (beef, pork, veal, lamb) | 160°F [^68] | [^68] |
| Whole cuts of beef, pork, veal, lamb | 145°F with a 3-minute rest [^68] | [^68] |
| Fish and shellfish | 145°F, or until flesh is opaque [^67] | [^67] |
| Leftovers (reheating) | 165°F [^68] | [^68] |

- CDC states the same values and specifies beef, veal, lamb and pork at "145°F (then allow the meat to rest for 3 minutes)." [^67]
- During the rest time the temperature holds or keeps rising, which is what destroys the remaining pathogens. [^68]
- A food thermometer is the only way to verify these; colour and texture are not reliable indicators. [^68]

### 1.2 The danger zone and the two-hour rule

- The **Danger Zone is 40°F–140°F**, the range in which bacteria multiply rapidly. [^69]
- Never leave perishable food out for more than **2 hours**, or **1 hour if the ambient temperature is above 90°F**. [^67]
- Refrigerator: **40°F or below**. Freezer: **0°F or below**. [^67]
- Refrigerators should be kept at 40°F (4°C) or below. [^71]
- Safe thawing is in the refrigerator, in cold water, or in the microwave — never on the counter, where bacteria multiply rapidly. [^67]
- Handwashing is at least **20 seconds** with soap and warm or cold water. [^67]

### 1.3 Storage times

- Cooked meat or poultry leftovers keep **3 to 4 days** refrigerated at 40°F. [^71]
- Chicken nuggets or patties and pizza also keep 3 to 4 days refrigerated. [^71]
- FSIS maintains the dedicated leftovers guidance for cooling, reheating and freezing decisions. [^70]
- FoodSafety.gov's Cold Food Storage Chart is the lookup table for everything else; the agent should link it rather than guess a shelf life. [^71]
- FSIS publishes separate reference pages for freezing and for refrigeration, which are where quality-versus-safety questions belong. [^79] [^80]

### 1.4 CDC's four steps, which the agent should use as its framing

Clean, Separate, Cook, Chill. [^67]

- **Clean** — wash hands 20 seconds and wash surfaces. [^67]
- **Separate** — keep raw foods apart from ready-to-eat foods. [^67]
- **Cook** — to the temperatures in §1.1. [^67]
- **Chill** — refrigerate promptly, inside the 2-hour window. [^67]

**Build rule:** these are the one set of numbers the agent should state flatly, without hedging
and without a "consult a professional" wrapper. Hedging on 165°F for poultry is worse than
useless. [^68] [^67]

---

## 2. Meal planning methodology

Nutrition.gov is the federal clearinghouse and defines the workflow the agent should implement:
**plan before shopping**, to save both time and money. [^72]

The concrete tooling the agent should reproduce or reference:

- A sample **7-day meal plan** built on a Mediterranean pattern, as a worked example rather than a prescription. [^72]
- A **weekly meal planner with recipes and grocery list**, plus a blank customisable version. [^72]
- A **weekly menu planner** for organising meals and generating the shopping list from them. [^72]
- A **seasonal produce guide** for choosing affordable in-season fruits and vegetables. [^72]
- A **"Shop Smart" virtual grocery store tour** giving aisle-by-aisle choices. [^72]
- **"Shop with Meals in Mind"**, which uses tracking lists to minimise food waste. [^72]
- A **farmers market directory** for local access. [^72]
- A **meal prep guide for college students**, the closest federal analogue to batch-cooking guidance. [^72]

The SNAP-Ed sequence, which is the better-validated behavioural order for someone on a tight
budget: [^73]

1. Plan to use the food you already have at home first. [^73]
2. Know how much money you have to spend on food. [^73]
3. Make the shopping list from that budget and from what the planned meals need. [^73]
4. Buy only the amount you can use before it spoils. [^73]

SNAP-Ed classifies this whole skill set as **Food Resource Management**, which is the framework
label to use if the agent needs to categorise its own advice. [^74]

**Build rule:** the agent should generate the shopping list *from* the meal plan, never
independently of it. The federal guidance treats the list as a derived artefact of the plan and
the budget, which is also what prevents waste. [^73] [^72]

---

## 3. Budget shopping

### 3.1 The reference budgets the agent can anchor to

- USDA publishes **four food plans at rising cost levels — Thrifty, Low-Cost, Moderate-Cost and Liberal** — each specifying quantities of foods and beverages that make healthy meals and snacks at home. [^76]
- Each plan's cost is based on average prices of its foods at publication, then adjusted **every month** using the Consumer Price Index for All Urban Consumers (CPI-U). [^76]
- The monthly Cost of Food reports break costs down by age and sex group, give weekly and monthly totals per plan, and include separate data for Alaska and Hawaii. [^76]
- A historical archive of monthly plan costs is published as Excel files alongside each new report. [^76]

**Build rule:** the agent must **fetch the current month's figure rather than hard-code a dollar
amount**, because the plans are re-indexed monthly to CPI-U. A cached grocery budget goes stale
within weeks. [^76]

### 3.2 Actual food prices, for concrete advice

- USDA ERS priced **155 fresh and processed fruits and vegetables** in cup equivalents using national average retail prices paid in 2022. [^77]
- Meeting the fruit and vegetable recommendations was possible for about **$2.50 to $3.00 per day** in 2022. [^77]
- One worked basket — grapefruit juice, apple, tomato, potato and pinto beans — cost **$2.60** in 2022. [^77]
- Vegetable prices ranged from **22 cents to $2.62 per cup equivalent** in 2022. [^78]
- Of 93 vegetables, **19 cost under 50 cents per cup equivalent**, including baked white potato (27 cents), iceberg lettuce (32 cents) and onions (43 cents). [^78]
- The least expensive items overall were fresh watermelon at **$0.24** and **dried pinto beans at $0.22** per cup equivalent. [^78]

This gives the agent a defensible answer to "healthy food is too expensive": the recommended
produce intake was reachable for under $3/day in 2022 prices, and dried legumes are the cheapest
cup-equivalent in the dataset. [^77] [^78]

### 3.3 Shopping tactics with federal backing

- Use **unit pricing** to compare products for the best deal, alongside the Nutrition Facts label to get the best product for the money. [^75]
- On the label, 5% DV or less is low and 20% DV or more is high for a given nutrient. [^10]
- Use **all forms of produce — fresh, frozen and canned** — to find the best nutritional and monetary value. [^73]
- Buy what is **in season or on sale**; fresh fruit in season generally costs less. [^73]
- Frozen and canned fruits are available year-round, can save money, and have **similar nutrition values to fresh**. [^73]
- Cooking Matters, the SNAP-Ed intervention, teaches exactly this trio: shop smarter, use nutrition information, and cook affordable meals, with lessons on meal preparation, grocery shopping, food budgeting and nutrition. [^75]
- For canned goods, watch sodium: canned foods can carry large amounts of salt and sugar, which is why they are excluded from homemade infant food. [^54]

---

## 4. Recipe adaptation

### 4.1 Adapting for nutrition targets

Nutrition.gov publishes guidance on modifying recipes to **reduce fat, calories, sodium and sugar
while increasing fiber** — this is the sanctioned framing for recipe modification. [^72]
It also publishes heart-healthy grocery shopping guidance organised around foods that affect
cardiovascular health. [^72]

The targets to modify toward, from `01-overview.md`:

- Saturated fat <10% of calories; added sugars <10% of calories; sodium <2,300 mg/day. [^5]
- Fiber ≥14 g per 1,000 kcal, or the 28 g label Daily Value. [^5] [^10]
- Liquid plant oils in place of tropical oils and partially hydrogenated fats. [^12]
- Prepare foods with little or no salt — AHA states this as one of its ten features. [^12]

### 4.2 Adapting for allergies and intolerances — the rules, restated as a procedure

These follow from `02-medical-diets-allergies.md` and are the ones the agent needs at the stove:

1. Identify whether the target is an **allergy** (strict avoidance of the protein plus cross-contact control) or an **intolerance** (dose management). [^41] [^46]
2. For each of the nine major allergens, check the three mandatory declaration sites: the ingredient list by common name, a "Contains" statement, or parentheses after the ingredient. [^41]
3. Re-check on every purchase; precautionary "may contain" statements are outside the mandatory-declaration rule and are not a substitute for it. [^41]
4. For gluten, use products labelled gluten-free, which legally means **<20 ppm**; buy oats specifically labelled gluten-free because of supply-chain contamination. [^28] [^30]
5. "Wheat-free" is not "gluten-free" — it does not cover barley or rye. [^30]
6. Control cross-contact with separate equipment as the default; measured studies (shared toasters, shared fryers) can refine that default but not replace it. [^31] [^32] [^33]
7. For lactose, substitute toward lower-lactose dairy (yogurt, hard cheeses such as cheddar and Swiss) or use lactase products, rather than full elimination. [^46]
8. When dairy is removed, replace the calcium: fish with soft bones, leafy greens, broccoli, oranges, almonds and fortified products. [^46]
9. Scan for hidden lactose terms — milk, whey, curds, dry milk solids — in bread, baked goods, cereals, processed meats and coffee creamers. [^46]

### 4.3 Adapting for therapeutic patterns

- **DASH:** rebuild the week to 6–8 grain, 4–5 vegetable, 4–5 fruit, ≤6 meat/poultry/fish, 2–3 dairy and 2–3 fat servings per day at 2,000 kcal, plus 4–5 weekly servings of nuts/seeds/legumes and ≤5 weekly sweets. [^13]
- **Diabetes:** shift toward non-starchy vegetables, whole fruits, legumes, lean protein, whole grains, nuts, seeds and low-fat dairy, away from red meat, sugar-sweetened beverages, sweets, refined grains and ultra-processed foods. [^23]
- **Low-FODMAP:** adapt only inside a dietitian-supervised 2–6 week phase 1, then reintroduce over ~6–8 weeks; do not write permanent low-FODMAP recipes. [^36] [^35]
- **Renal:** do not adapt. Protein, potassium, phosphorus and sodium prescriptions in CKD are clinician-set. [^25]
- **Vegan:** adapt freely on macros, but carry the B12/iodine/iron/choline/vitamin D/calcium checklist forward into the plan. [^60]

---

## 5. Minimising processing, not just counting macros

The strongest practical argument for home cooking is the NIH inpatient trial: at matched
presented calories, sugar, fat, sodium, fiber and macronutrients, the ultra-processed arm ate
**508 ± 106 kcal/day more** and gained 0.9 kg in two weeks, while the unprocessed arm lost
0.9 kg. [^15]
NIH describes it as the first randomised controlled trial directly comparing calorie intake and
weight change between ultra-processed and unprocessed diets. [^16]
AHA independently lists "choose minimally processed foods instead of ultra-processed foods" as one
of its ten cardioprotective features. [^12]
The 2025–2030 DGA's core message is to build the diet on whole, nutrient-dense foods and reduce
highly processed foods. [^1]

Caveat the agent should voice: Stanford's review notes the 2025–2030 DGA is **vague about what
counts as a problematic processed food**, which leaves policymakers and schools without workable
guidance. [^3]
So the agent should describe processing concretely — packaged, ready-to-eat, multi-ingredient,
industrially formulated — rather than leaning on the phrase "ultra-processed" as if it were
self-defining. [^3]

---

## 6. A practical weekly workflow the agent can run

Assembled from the federal guidance above; each step traces to a cited source.

1. **Inventory first.** Plan to prepare and eat what is already at home. [^73]
2. **Set the budget.** Know the amount available; benchmark against the current USDA food plan cost for the household's age/sex composition. [^73] [^76]
3. **Choose the pattern.** Default to a DASH- or Mediterranean-shaped week unless a condition dictates otherwise. [^13] [^5]
4. **Build the menu**, using a weekly menu planner, then derive the grocery list from it. [^72]
5. **Price the produce.** Prefer in-season, on-sale, and frozen or canned where cheaper; expect produce targets to be reachable near $2.50–$3.00/day per person at 2022 prices. [^73] [^77]
6. **Lean on legumes.** Dried pinto beans were the cheapest cup equivalent in the ERS dataset at $0.22. [^78]
7. **Shop with unit pricing plus the Nutrition Facts label**, using the 5%/20% DV rule. [^75] [^10]
8. **Batch cook, then chill fast.** Perishables out of the Danger Zone (40–140°F) within 2 hours, or 1 hour above 90°F. [^69] [^67]
9. **Cook to temperature**, verified with a thermometer: 165°F poultry, 160°F ground, 145°F + 3 min whole cuts, 145°F fish. [^68] [^67]
10. **Label and date leftovers.** 3–4 days refrigerated for cooked meat and poultry; reheat to 165°F. [^71] [^68]
11. **Freeze the overflow** at 0°F or below rather than letting it reach day five. [^67] [^70]
12. **Close the loop.** Use tracking lists to cut waste in the next cycle. [^72]

---

See `05-nutrition-exercise-interface.md` for the next part of this report.
