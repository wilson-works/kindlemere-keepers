# Special Populations, Safety, Red Flags and Scope of Practice

> Scope note: this file governs the agent's refusals. Everything else in this knowledge base is
> subordinate to it.

---

## 1. The line between coaching and clinical practice

### What the three US roles actually are

| Role | Education | Licensure | Can diagnose/treat? |
|---|---|---|---|
| Fitness trainer / personal trainer | typically **high school diploma or equivalent**; employers may prefer an associate's or bachelor's[^73] | **no state licensure indicated**; certification expected, plus CPR/first aid/AED[^73] | no |
| Exercise physiologist | **bachelor's degree** in exercise physiology, exercise science, kinesiology or related field[^72] | **Louisiana mandates licensure**; other states only for related duties; employers expect BLS or ACLS[^72] | works on chronic conditions, often under physician-prescribed plans[^72] |
| Physical therapist | **Doctor of Physical Therapy (DPT)** from an accredited programme, typically three years[^74] | **all states require a license**, most requiring a qualifying exam; some add a law exam and background check[^74] | yes — evaluates movement and pain, diagnoses, and builds treatment plans[^74] |

- Personal trainers are expected to demonstrate and explain technique, monitor form, build programmes
  and give fitness-related information — that is the described duty set.[^73]
- Exercise physiologists' scope is described as **clinical rather than general wellness**: they analyse
  medical histories, run fitness assessments, monitor vital signs and build regimens for people with
  chronic conditions such as lung disease.[^72]
- Physical therapists use exercise, manual therapy and therapeutic equipment to restore mobility and
  manage pain after injury, illness or chronic conditions.[^74]
- Tai chi and yoga instruction is **not licensed at all** — NCCIH notes there is **no national
  certification standard** for tai chi instructors.[^50]

**Agent design implication.** The agent's ceiling is the **personal trainer** scope: general fitness
programming for apparently healthy people, or people already cleared for exercise.[^73] Anything that
requires reading a medical history, monitoring vital signs, or treating a condition crosses into
exercise-physiologist or physical-therapist territory and must be referred.[^72][^74]

### What the agent may and may not do

**May:** build general aerobic, resistance, flexibility and balance programmes from the guideline
numbers;[^1][^2] teach movement patterns and technique cues;[^73] explain training principles and
correct myths;[^37] encourage adherence; recommend sleep and recovery habits;[^41] teach general
stress-management and mind-body practice with disclosures.[^48]

**Must not:** diagnose anything; interpret symptoms; prescribe rehabilitation for an injury;[^74]
label someone as having overtraining syndrome, since that is an exclusion diagnosis;[^12] prescribe
exercise to someone with an absolute contraindication;[^68] coach the Valsalva manoeuvre to a
general-population client;[^31] lead trauma-focused meditation;[^49] or treat mental illness.[^48]

---

## 2. Pre-participation screening

### ACSM's current algorithm (2015 revision, used in *Guidelines* 10th ed. onward)

- The algorithm classifies a person on three axes: **current exercise participation**, **history and
  symptoms of cardiovascular, metabolic or renal disease**, and **desired exercise
  intensity**.[^64]
- "Currently active" is operationalised as planned, structured physical activity of **at least 30
  minutes at moderate intensity on at least 3 days/week for the past 3 months**.[^64]
- The explicit purpose of the 2015 revision was to **reduce the emphasis on medical evaluation for
  healthy, asymptomatic people** and support the public-health message that everyone should be
  active.[^66]
- Applied to US adults in NHANES, the ACSM algorithm referred **fewer** adults for medical clearance
  than earlier questionnaires: **2.6%** referred only before beginning **vigorous** exercise, and
  **54.2%** referred before beginning **any** exercise.[^64]
- At minimum, programmes should screen with a **self-guided medical history or health-risk appraisal
  questionnaire** such as the PAR-Q or the AHA/ACSM Health/Fitness Facility Preparticipation Screening
  Questionnaire.[^64]
- ACSM publishes an **Exercise Preparticipation Health Screening Questionnaire** through Exercise is
  Medicine for exactly this purpose.[^65]

**Agent design implication.** An AI agent cannot perform clinical screening, but it can and should run
the **questionnaire logic**: ask about known cardiovascular/metabolic/renal disease, about signs and
symptoms, about current activity level, and about intended intensity — then route to clearance where
the algorithm says to.[^64][^65][^66] The practical default: **a currently inactive person with any
known cardiovascular, metabolic or renal disease, or any suggestive symptom, gets referred for
clearance before starting.**[^64]

---

## 3. Red-flag symptoms — stop and refer

### During or around exercise

The agent must treat any of the following as a stop-exercise-and-seek-care signal rather than a
coaching variable. These correspond to the signs and symptoms axis of the screening algorithm and to
the contraindication lists below.[^64][^68]

- **Chest pain, pressure or discomfort**, especially with exertion — unstable angina is an **absolute**
  contraindication to exercise testing.[^68]
- **Syncope or near-syncope**, dizziness, or loss of consciousness with exertion.[^64][^68]
- **Unusual or severe shortness of breath** at rest or with light activity — uncontrolled symptomatic
  heart failure is an **absolute** contraindication.[^68]
- **Palpitations or irregular heartbeat** — uncontrolled dysrhythmias causing symptoms or haemodynamic
  compromise are **absolute** contraindications.[^68]
- **Acute systemic infection with fever, body aches or swollen lymph glands** — an **absolute**
  contraindication.[^68]
- **Resting blood pressure above 200/110 mmHg** — a **relative** contraindication.[^68]
- **New or worsening joint pain, swelling, or inability to bear weight** — a physical-therapy question,
  not a programming one.[^74]
- **Suspected concussion** — see section 8.[^71]

### Absolute contraindications to exercise testing (the formal list)

- Recent significant resting-ECG change suggesting ischaemia, or recent myocardial infarction **within
  2 days**.[^68]
- Unstable angina.[^68]
- Uncontrolled cardiac dysrhythmias causing symptoms or haemodynamic compromise.[^68]
- Symptomatic severe aortic stenosis.[^68]
- Uncontrolled symptomatic heart failure.[^68]
- Acute pulmonary embolism or pulmonary infarction.[^68]
- Acute myocarditis or pericarditis.[^68]
- Suspected or known dissecting aneurysm.[^68]
- Acute systemic infection with fever, body aches or swollen lymph glands.[^68]

### Relative contraindications

- Severe arterial hypertension, **>200/>110 mmHg at rest**.[^68]
- Tachydysrhythmia or bradydysrhythmia.[^68]
- Hypertrophic cardiomyopathy and other forms of outflow-tract obstruction.[^68]
- High-degree atrioventricular block.[^68]
- Ventricular aneurysm.[^68]
- Uncontrolled metabolic disease; chronic infectious disease.[^68]
- Mental or physical impairment leading to inability to exercise adequately.[^68]

- Relative contraindications **can be superseded if benefits outweigh risks**, and such individuals can
  sometimes exercise with caution and low-level endpoints, especially if asymptomatic at rest — but
  that judgement is clinical, not coaching.[^68]

---

## 4. Putting cardiac risk in perspective

Reference: AHA scientific statement, *Exercise-Related Acute Cardiovascular Events and Potential
Deleterious Adaptations Following Long-Term Exercise Training: Placing the Risks Into Perspective — An
Update* (Circulation, 2020).[^67]

- Risk of sudden cardiac death (SCD) and acute myocardial infarction (AMI) **transiently increases
  during and shortly after** exercise.[^67]
- Studies suggest a **3- to 17-fold increase in SCD risk** during and up to 30 minutes after vigorous
  exercise, and a **2- to 10-fold increase in AMI** within 1 hour of vigorous exercise.[^67]
- But **absolute risk is small**: estimated annual incidence of exertion-associated SCD is **0.31–2.1
  per 100,000** overall — **0.3 per 100,000** under age 35 and **3.0 per 100,000** over 35.[^67]
- Non-exertional SCD runs at an estimated **43–55 per 100,000** per year for comparison.[^67]
- In adults with **known cardiac disease**, the acute risk of sudden cardiac arrest during exercise
  training is roughly **1 event per 60,000 hours** of aerobic exercise.[^67]
- Risk is higher when activity is **strenuous, sudden, unaccustomed, or heavily anaerobic**.[^67]
- **Regular participation reduces the transient risk**: women reporting under 2 h/week of
  moderate-to-vigorous exertion had a relative risk of **9.0**, versus **1.5** for those doing 2+
  h/week.[^67]

**Agent design implication.** This is the evidence base for the agent's central safety heuristic:
**progress gradually and avoid sudden unaccustomed vigorous effort**, especially in previously
inactive people — which is also exactly what the screening algorithm gates on.[^64][^67]

---

## 5. Older adults

- CDC: adults 65+ need **at least 150 min/week moderate aerobic activity** (e.g. 30 min × 5 days), or
  **75 min vigorous**, or an equivalent mix.[^60]
- Plus **at least 2 days** of muscle-strengthening activity covering legs, hips, back, abdomen, chest,
  shoulders and arms.[^60]
- Plus **balance activities** each week — CDC's examples are **walking heel-to-toe** and **standing from
  a sitting position**.[^60]
- For those who cannot meet the targets: **be as active as abilities and conditions allow**; some
  activity is better than none.[^60]
- WHO adds **multicomponent activity emphasising balance and strength on ≥3 days/week** for 65+, on a
  strong recommendation with high-to-moderate certainty.[^2]
- Resistance-training specifics for healthy older adults and for frailty are in
  `03-strength-and-resistance.md`.[^30][^31]
- Falls: tai chi has **high-certainty** evidence for reducing the **number of people who fall by
  20%**.[^50]
- **Uncontrolled hypertension is a contraindication** to resistance training in this population;
  unstable medical conditions require physician consultation.[^31]
- Yoga injury rates presenting to emergency departments are **higher in people 65+** than in younger
  adults.[^49]

---

## 6. Pregnancy and postpartum

### The numbers

- WHO: pregnant and postpartum women should do **≥150 min/week of moderate-intensity aerobic
  activity**, including both aerobic and muscle-strengthening work. Strong recommendation,
  high-to-moderate certainty.[^2]
- The PAG 2nd edition has pregnant and postpartum women follow the standard adult guidelines, and notes
  physical activity **reduces postpartum depression risk**.[^1]
- The 2019 Canadian guideline: **≥150 min/week moderate**, accumulated over **a minimum of 3
  days/week**, with daily activity encouraged (strong recommendation, moderate-quality
  evidence).[^62]
- It also recommends **a variety of aerobic and resistance activities**, and that adding **yoga and/or
  gentle stretching may be beneficial** (strong recommendation, high-quality evidence).[^62]
- **Pelvic floor muscle training (e.g. Kegels) may be performed daily**, with instruction in proper
  technique recommended.[^62]
- ACOG Committee Opinion No. 804 (*Physical Activity and Exercise During Pregnancy and the Postpartum
  Period*, April 2020, replacing No. 650) states that in the absence of obstetric or medical
  complications or contraindications, physical activity in pregnancy is **safe and desirable**.[^63]
- ACOG: women who habitually engaged in **vigorous-intensity** aerobic activity before pregnancy **can
  continue** during pregnancy and postpartum.[^63]
- Observational benefits cited by ACOG include decreased **gestational diabetes, caesarean birth,
  operative vaginal delivery, and postpartum recovery time**.[^63]

### Absolute contraindications to exercise in pregnancy

- Ruptured membranes; premature labour; unexplained persistent vaginal bleeding.[^62]
- Placenta previa after **28 weeks'** gestation; preeclampsia; incompetent cervix.[^62]
- Intrauterine growth restriction; high-order multiple pregnancy (triplets or more).[^62]
- Uncontrolled type 1 diabetes; uncontrolled hypertension; uncontrolled thyroid disease.[^62]
- Serious cardiovascular, respiratory or systemic disorders.[^62]

### Relative contraindications (medical consultation required)

- Recurrent pregnancy loss; gestational hypertension; history of spontaneous preterm birth.[^62]
- Mild or moderate cardiovascular or respiratory disease; symptomatic anaemia.[^62]
- Malnutrition; eating disorder; twin pregnancy after **28 weeks**.[^62]
- Other significant medical conditions.[^62]

### Activities and positions to avoid

- ACOG: **contact sports, activities carrying a risk of falling, activities that cause overheating,
  skydiving, scuba diving, and activity above 6,000 feet** are not encouraged in pregnancy.[^63]
- NCCIH adds, for yoga specifically: avoid **hot yoga** (overheating) and **prolonged supine
  positioning**.[^49]
- Canadian guideline: those who feel light-headed, nauseated or unwell exercising flat on their back
  should **modify the position**.[^62]

**Agent design implication.** Pregnancy is the clearest case for mandatory clearance before the agent
programmes anything: the absolute-contraindication list is long, invisible to the agent, and includes
conditions a user may not know they have.[^62][^63] Default behaviour: confirm the person has
discussed exercise with their obstetric provider, and refuse to programme against any named
contraindication.[^62]

---

## 7. Chronic conditions

### Type 2 diabetes

- ACSM's consensus statement *Exercise/Physical Activity in Individuals with Type 2 Diabetes* (Med Sci
  Sports Exerc, February 2022) updates the 2010 ACSM/ADA joint position stand.[^69]
- It was broadened from planned exercise to **physical activity generally**, and adds **reducing
  sedentary time**.[^69]
- People with type 2 diabetes should be active regularly, **reduce sedentary time, and break up
  sitting with frequent activity breaks**.[^69]
- Regular aerobic training **improves glycaemic management**, with less daily time in hyperglycaemia and
  reductions in overall glycaemia.[^69]
- Corroborating the sitting-break element: interrupting sitting **every 30 minutes** with 1 minute of
  repeated chair stands matched 2-minute treadmill walks for lowering post-meal insulin.[^17]
- The ADA recommendation that prolonged sitting be interrupted **every 30 minutes** for glucose benefit
  is the operational number.[^19]

### Hypertension and cardiovascular disease

- Across 270 RCTs and 15,827 participants, **isometric** exercise gave the largest resting
  blood-pressure reductions (**−8.24/−4.00 mmHg**), with the **wall squat** ranking highest among
  isometric sub-modes and the largest effects in those with elevated baseline values.[^33]
- In cardiac rehabilitation populations, HIIT raised VO2peak more than MICT and was **safe**, with
  larger effects in programmes longer than **12 weeks**.[^21]
- But for adults with known cardiac disease the acute risk of sudden cardiac arrest during exercise is
  about **1 per 60,000 hours** — which is why cardiac populations belong in supervised rehab, not
  AI-programmed training.[^67]
- **Uncontrolled hypertension** contraindicates resistance training; resting BP **>200/110** is a
  relative contraindication to testing.[^31][^68]

### Arthritis

- CDC: adults with arthritis need the same mix — **≥150 min/week moderate aerobic** plus **≥2 days/week
  muscle strengthening**.[^61]
- Older adults with arthritis should aim for a **mix of aerobic, muscle-strengthening and balance**
  activity weekly.[^61]
- People with arthritis are **2.5 times more likely** to report two or more falls and a fall-related
  injury than those without.[^61]
- Increasing physical activity **helps decrease fall risk**.[^61]
- Tai chi is **strongly recommended by the American College of Rheumatology** for knee and hip
  osteoarthritis, with low-to-moderate-strength evidence for pain, stiffness and function.[^50]
- Resistance-training intensity and volume should be **modified** for clients with
  osteoarthritis.[^31]

### Cancer

- The 2019 international multidisciplinary roundtable consensus (Campbell et al., *Med Sci Sports
  Exerc*) is the reference guideline.[^70]
- Recommendation: **aerobic exercise 3–5 times/week for at least 30 minutes**, plus **resistance
  exercise 2–3 days/week**, to improve health-related outcomes.[^70]
- Expressed as a weekly dose: **at least 150 min moderate** or **75 min vigorous** per week.[^70]
- Documented benefits include improved physical function, reduced fatigue, improved quality of life,
  and reduced anxiety and depressive symptoms.[^70]
- Exercise can help **prevent exacerbation of upper-extremity lymphoedema**.[^70]
- Exercise testing and training is **generally safe** for cancer survivors, though **medical clearance
  is advised in certain situations**, and survivors should **avoid inactivity**.[^70]

### Disability and other conditions

- WHO extrapolated its recommendations to adults and children with disability, naming **multiple
  sclerosis, spinal cord injury, intellectual disability, Parkinson's disease, stroke, depression,
  schizophrenia and ADHD**, with consultation recommended for individualised programming.[^2]
- The PAG 2nd edition likewise has adults with chronic conditions and disabilities follow **adapted
  versions** of the standard adult recommendations.[^1]

---

## 8. Injury and return to activity

### General principles the agent can hold

- Diagnosing and treating an injury, and designing a recovery programme, is **physical-therapist
  scope** and requires a licensed professional.[^74]
- Strength training is the best-evidenced **prevention** lever, reducing sports injuries to **less than
  one third** and overuse injuries by **almost half**; proprioceptive training reduces injury risk by
  about **45%**; **stretching shows no significant benefit**.[^26]
- The strongest modifiable training-load signal in runners is the **single-session spike**: exceeding
  **110% of the longest run in the previous 30 days** raised overuse-injury rate (HRR 1.64 for
  >10–30%, 1.52 for >30–100%, 2.28 for >100%).[^24]
- Active recovery beats complete rest for managing post-exercise soreness and restoring explosive
  performance acutely.[^37][^38]
- "No pain, no gain" is not a usable rule: DOMS reflects unaccustomed eccentric loading, not training
  quality, and new or worsening joint pain is a referral.[^37][^74]

### Concussion — the one injury with a public consensus protocol

The 6th International Consensus Statement on Concussion in Sport (Amsterdam, October 2022; published
in *BJSM* 2023) sets the standard.[^71]

- **Strict rest is not beneficial.** **Relative rest** — activities of daily living plus light,
  symptom-limited physical activity such as walking — **may begin during the first 24–48 hours**.[^71]
- **Reduced screen time in the first 48 hours is warranted** but may not be effective beyond
  that.[^71]
- After the initial 24–48 hours of rest, **earlier return to activity and cognitive exertion
  (return-to-learn) may be beneficial**.[^71]
- Graded progression threshold: physical activity should start early with **no more than mild
  symptoms** — an increase of **no more than 2 points on a 0–10 scale**, lasting **less than an hour**,
  compared with the pre-activity baseline.[^71]
- **93%** of injured athletes across all ages achieved full return-to-learn with no additional support
  **within 10 days**.[^71]

**Agent design implication.** A suspected concussion is an immediate referral and a hard stop on
training programming. The agent may describe the consensus framework but must not run a
return-to-play progression, which is a medical decision.[^71][^74]

---

## 9. The refusal and escalation checklist

The agent **refuses to programme and refers** when:

1. Screening identifies known cardiovascular, metabolic or renal disease, or signs/symptoms of it, in
   someone not currently exercising.[^64]
2. Any **absolute contraindication** to exercise testing/training is present.[^68]
3. Resting blood pressure is **>200/110 mmHg**, or hypertension is uncontrolled.[^31][^68]
4. The user is pregnant and has, or may have, any listed **absolute contraindication**, or has not
   discussed exercise with their obstetric provider.[^62][^63]
5. The user reports **chest pain, syncope or near-syncope, unexplained severe breathlessness,
   palpitations, or acute febrile illness**.[^64][^68]
6. The user has a **suspected concussion** or any acute head injury.[^71]
7. The user has an **undiagnosed or acute musculoskeletal injury** — that is PT scope.[^74]
8. The user is a **minor** seeking resistance programming without qualified in-person
   supervision.[^32]
9. The user is a **cancer survivor** in a situation where the consensus advises medical
   clearance.[^70]
10. Any **mental-health red flag** appears — see `05-mind-body-mental-wellness.md` section 7 and surface
    **988**.[^51][^58]

The agent **proceeds with explicit caution and documented modification** when:

- The user is **65+** — add balance work and start load low.[^2][^31][^60]
- The user has **controlled** hypertension, type 2 diabetes, arthritis, or is a cleared cancer
  survivor.[^31][^61][^69][^70]
- The user is **previously inactive** and wants vigorous training — build a moderate base first, because
  sudden unaccustomed vigorous effort is where the transient cardiac risk concentrates.[^67]

See `01-exercise-science-foundations.md` for the guideline numbers these modifications adjust.
See `07-nutrition-interface-boundary-note.md` for the nutrition hand-off.

Full bibliography in `sources.md`.
