# Scope brief — A health and fitness agent

- **Asked as:** "I need to research everything for a health and fitness agent"
- **Requested:** 2026-10-07 00:34 CDT
- **Run:** research-2026-10-07T00-43, wave 2 of 5
- **Scope verdict:** clear

## Framing given

Working alongside the nutritionist, this agent will researched on every exercise, physical
activity, cardio, running, stretching, meditation, etc. Everything about the body and mind within a
healthy lifestyle.

## The brief

```
restated_topic: Build a cited research knowledge base covering exercise science, physical training
modalities, recovery, and mind-body/mental practices for a health-and-fitness AI agent, explicitly
excluding nutrition/diet topics (owned by the sibling nutritionist agent) but including the
training-side half of the exercise-nutrition interface.

sub_questions:
  - What are the foundational exercise science frameworks (FITT principle, progressive overload,
    periodization, specificity, recovery/adaptation cycles) that should structure the agent's
    training guidance, per ACSM and NSCA guidelines?
  - What do current physical activity guidelines (WHO, CDC/HHS Physical Activity Guidelines for
    Americans) recommend by age, population, and goal (general health, weight management, athletic
    performance), and how do cardio, resistance training, flexibility, and balance work fit
    together in a weekly program?
  - What are the major cardio/aerobic training modalities and methods (steady-state, interval/HIIT,
    Zone 2, tempo, fartlek) and their evidence-based benefits, risks, and programming guidance,
    including running-specific training (base building, speed work, injury prevention, couch-to-5k
    style progressions)?
  - What are the core resistance/strength training principles (movement patterns, exercise
    selection, volume/intensity/frequency, progression schemes) for beginner through intermediate
    populations, and what do major bodies (NSCA, ACSM) say about safe form and injury prevention?
  - What does the evidence say about mobility, flexibility, and stretching (static vs. dynamic,
    when to use each, stretching myths) and about recovery practices (sleep, rest days, active
    recovery, DOMS, overtraining syndrome, deload weeks)?
  - What mind-body and mental-wellness practices (meditation, mindfulness, breathwork, yoga, stress
    management) have credible evidence for supporting a healthy lifestyle, and what do major
    research bodies (NIH/NCCIH, APA) say about their benefits and limits?
  - Where exactly does training-side guidance need to interface with the nutritionist agent's
    existing scope, and what is the cleanest line to avoid duplication?
  - What special-population and safety considerations (older adults, pregnancy/postpartum, chronic
    conditions like cardiovascular disease or arthritis, injury return-to-activity) govern exercise
    prescription, per ACSM/CDC guidance?

suggested_sources:
  - acsm.org (American College of Sports Medicine) — exercise prescription guidelines, position stands
  - nsca.com (National Strength and Conditioning Association) — resistance training standards
  - cdc.gov/physicalactivity and health.gov (Physical Activity Guidelines for Americans)
  - who.int (WHO guidelines on physical activity and sedentary behaviour)
  - ncbi.nlm.nih.gov/pmc (peer-reviewed sports medicine / exercise physiology journals)
  - nccih.nih.gov (NIH National Center for Complementary and Integrative Health)
  - apa.org (American Psychological Association) — stress, exercise and mental health
  - sports-medicine bodies for injury prevention / rehab basics

expected_structure:
  - 01-exercise-science-foundations.md
  - 02-cardio-and-running.md
  - 03-strength-and-resistance.md
  - 04-mobility-flexibility-recovery.md
  - 05-mind-body-mental-wellness.md
  - 06-special-populations-and-safety.md
  - 07-nutrition-interface-boundary-note.md

estimated_source_count: 25

notes: This topic is broad but the boundary is clear and explicitly given by the framing and project
context — nutrition, macro/micronutrient science, therapeutic diets, meal prep, and food safety are
entirely out of scope and owned by the sibling nutritionist agent; the only nutrition-adjacent
material in bounds is the training/recovery side of workout timing (e.g., "hydrate before a long
run," "allow recovery time before next session") without venturing into macro or meal-planning
specifics, which should be flagged as a deliberate interface note rather than researched in depth.
Given the breadth (cardio, strength, flexibility, recovery, mind-body), the deep researcher should
organize output into distinct modules rather than one monolithic report, prioritizing consensus
guidance from major sporting/medical bodies (ACSM, NSCA, WHO, CDC, NIH) over single-study claims,
and noting where evidence is preliminary (e.g., some mind-body practices) versus well-established
(e.g., FITT/progressive overload).
```
