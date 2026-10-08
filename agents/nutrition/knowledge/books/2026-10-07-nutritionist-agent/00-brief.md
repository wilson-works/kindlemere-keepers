# Scope brief — Building a nutritionist agent

- **Asked as:** "I need to research everything we need to build a nutrionist specialized agent."
- **Requested:** 2026-10-07 00:33 CDT
- **Run:** research-2026-10-07T00-43, wave 1 of 5
- **Scope verdict:** clear

## Framing given

The agent will need to be heavily researched in all things diet, nutrition, accommodations to
different allergies, diseases, and other common medical diets. They also need to be heavily
researched into nutrition based on age, gender, activity level and genetic differences. Finally
they need to also have research on exercise, body training, and other elements of healthy
lifestyles. It will work alongside a fitness coach agent later on. This one needs to be heavily
researched on recipes, meal prep, budget shopping, and other various elements of cooking, storing,
eating, and anything else.

## The brief

```
restated_topic: Build a cited, build-ready nutrition knowledge base for a nutritionist-specialized
AI agent, covering core nutrition science, medical/therapeutic diet accommodations, nutrition needs
across age/gender/activity/genetic variation, and the practical cooking/meal-prep/budget-shopping
domain — with exercise/training physiology excluded except where it directly changes nutritional
requirements (that depth belongs to the sibling fitness-coach agent).

sub_questions:
  - What are the current evidence-based frameworks for macronutrient/micronutrient needs, energy
    balance, and dietary patterns (e.g., USDA Dietary Guidelines, DRIs) that should anchor the
    agent's baseline nutrition reasoning?
  - What are the standard clinical/therapeutic diets and accommodation protocols for common
    diseases and conditions (diabetes, CKD/renal, cardiovascular disease, celiac/gluten-free,
    IBS/low-FODMAP, GERD, PCOS, etc.) and for the major food allergies/intolerances, including
    safe-substitution and cross-contamination guidance?
  - How do nutrition needs and recommendations shift systematically by life stage (pediatric,
    adolescent, adult, older adult, pregnancy/lactation), by sex, by activity level, and what does
    current nutrigenomics research support (vs. overclaim) about genetic variation in nutrient
    metabolism?
  - What does authoritative guidance say on meal planning and meal prep methodology,
    budget-conscious grocery shopping, recipe adaptation for diets/allergies, and food
    storage/safety practices a nutrition agent would need to advise on correctly?
  - Where does exercise/activity level intersect with nutrition specifically (e.g., pre/post-workout
    fueling, protein timing, hydration, athlete-specific macro ranges) such that it must be covered
    here rather than deferred entirely to the fitness-coach agent?

suggested_sources:
  - USDA Dietary Guidelines for Americans (dietaryguidelines.gov) and USDA FoodData Central
  - Academy of Nutrition and Dietetics (eatright.org)
  - Harvard T.H. Chan School of Public Health — The Nutrition Source
  - NIH Office of Dietary Supplements and NIH MedlinePlus
  - American Diabetes Association, American Heart Association, National Kidney Foundation
  - Celiac Disease Foundation / NIAID, FARE (Food Allergy Research & Education)
  - Mayo Clinic and Cleveland Clinic patient-education nutrition pages
  - World Health Organization nutrition guidance
  - FDA food safety and labeling guidance (foodsafety.gov)
  - PubMed/NCBI for nutrigenomics and life-stage nutrition primary literature

expected_structure:
  - 01-overview.md: core nutrition science — macronutrients, micronutrients, energy balance,
    Dietary Guidelines/DRI framework, how the agent should reason about baseline nutrition
  - 02-medical-diets-allergies.md: therapeutic diets by disease/condition, major food allergies and
    intolerances, elimination diets, safe substitutions, cross-contamination
  - 03-life-stage-demographics.md: nutrition variation by age, sex, pregnancy/lactation, activity
    level, and current (non-overclaimed) nutrigenomics findings
  - 04-cooking-meal-prep-budget.md: meal planning/meal prep methodology, budget shopping
    strategies, recipe adaptation for diets, food storage and safety
  - 05-nutrition-exercise-interface.md: the narrow slice of exercise-related nutrition (fueling
    timing, protein needs, hydration) that this agent must own versus defer to the fitness-coach
    agent

estimated_source_count: 35

notes: This topic is broad but not ambiguous — the framing explicitly resolves the one real
boundary question (exercise/training belongs to a sibling agent) by scoping this agent to nutrition
and only the nutrition-relevant edge of exercise. Prioritize breadth-with-citation over
depth-per-condition: for the medical-diets section, cover the handful of highest-prevalence
conditions (diabetes, celiac/gluten sensitivity, top food allergens, renal, cardiovascular) rather
than attempting exhaustive disease coverage, and flag any condition-specific claim that should be
deferred to a licensed dietitian rather than automated. For the genetics sub-question, be explicit
about the gap between popular "nutrigenomics" marketing claims and what peer-reviewed evidence
actually supports — this is a common area for a nutrition agent to overclaim. Deliberately
excluded: exercise programming, training periodization, and injury/biomechanics content (sibling
agent's domain); recipe content itself is covered at the methodology/sourcing level, not as a
recipe database.
```
