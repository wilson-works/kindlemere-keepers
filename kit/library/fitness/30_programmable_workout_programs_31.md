# Programmable workout programs for a gym tracker app

**Thirty-one structured programs from credentialed coaches and sports scientists are documented below, spanning seven training categories, with complete sets/reps/progression data and app-integration notes.** The programs range from freely implementable community-created routines (BWF RR, GZCLP, nSuns, Reddit PPL) to commercially protected systems requiring licensing agreements (Jeff Nippard, John Meadows, RP templates). For app development, the critical legal principle is that **workout structures and mathematical progression systems are generally not copyrightable under US law** — only the written expression, brand names, and specific creative content are protected. The safest approach is implementing the progression logic with clear "not affiliated with [creator]" disclaimers and original coaching text.

---

## Category 1: Linear progression programs

These are the most app-friendly programs — simple rules, binary pass/fail logic, and per-session weight increases.

### Starting Strength (Mark Rippetoe)

**Creator credentials:** BS Geology; NSCA CSCS (1985 inaugural class, relinquished 2009); USAW Senior Coach; competitive powerlifter 1979–1988; author of *Starting Strength: Basic Barbell Training* (3 editions). **Target:** Complete beginners. **Split:** 3 days/week, full body A/B alternation (Mon/Wed/Fri).

**Program structure (4 phases):**
- Phase 1: Workout A — Squat 3×5, Press 3×5, Deadlift 1×5. Workout B — Squat 3×5, Bench 3×5, Deadlift 1×5.
- Phase 2: Power Clean 5×3 replaces Deadlift on B days.
- Phase 3: Chin-ups and back extensions added on B days.
- Phase 4: Light squat Wednesday at 80% of Monday's weight; Deadlift/Power Clean alternate.

**Progression:** Pure linear, every session. Squat +5 lb/session (initially +10 lb). Deadlift +10 lb (initially +15–20 lb). Bench/Press +5 lb, eventually +2.5 lb with microplates. **Rest:** 2–5 min early, up to 10 min late-program. **Deload:** Fail same weight 2–3 consecutive sessions → reset 10%, rebuild. After 2–3 resets → transition to intermediate (Texas Method). **Duration:** 3–9 months. **Substitutions:** Extremely strict — Rippetoe forbids modifications. **Licensing:** "Starting Strength" is trademarked with an official app; high risk using the name. **Source:** https://startingstrength.com/get-started/programs

### StrongLifts 5×5 (Mehdi Hadim)

**Creator credentials:** Self-taught coach, no formal certifications. Created 2007 based on Bill Starr/Reg Park 5×5 methodology. **Target:** Complete beginners. **Split:** 3 days/week, A/B alternation.

Workout A: Squat 5×5, Bench 5×5, Barbell Row 5×5. Workout B: Squat 5×5, OHP 5×5, Deadlift 1×5. Starting weights: empty bar for Squat/Bench/OHP; **95 lb** for Row/Deadlift.

**Progression:** +5 lb per successful workout (all lifts); Deadlift can start at +10 lb. **Rest:** 1–2 min warmups, 3 min work sets, up to 5 min if struggling. **Deload (multi-tier):** Fail 5×5 three times → deload 10%. After 2 deloads → switch to 3×5. After 2 more deloads → switch to 1×5. Still stalling → Madcow 5×5. **Duration:** 3–6 months. **Substitutions:** None defined. **Licensing:** "StrongLifts" is trademarked with a proprietary app; the 5×5 concept itself is historical and unprotectable. **Source:** https://stronglifts.com/stronglifts-5x5/

### GZCLP (Cody Lefever)

**Creator credentials:** Competitive powerlifter; author of the GZCL method blog. Community-developed methodology. **Target:** Late beginners (3–9 months experience). **Split:** 3–4 days/week, 4 unique rotating workouts.

| | Day 1 | Day 2 | Day 3 | Day 4 |
|---|---|---|---|---|
| T1 (heavy) | Squat | OHP | Bench | Deadlift |
| T2 (moderate) | Bench | Deadlift | Squat | OHP |
| T3 (accessories) | Lat Pulldown | DB Row | Lat Pulldown | DB Row |

**Sets/reps by tier:** T1 Stage 1: 5×3+ (AMRAP last set), rest 3–5 min. T2 Stage 1: 3×10, rest 2–3 min. T3: 3×15+ (AMRAP last set), rest 60–90 sec.

**Progression:** Linear with staged fallback. T1/T2: +5 lb upper, +10 lb lower per successful workout. **T1 failure cascade:** Can't hit 15 total reps at 5×3 → Stage 2 (6×2+) at same weight → Stage 3 (10×1+) → test new 5RM, restart. **T2 failure cascade:** 3×10 → 3×8 → 3×6 → restart at last 3×10 weight + 15–20 lb. T3 advances when AMRAP reaches **25+ reps**. **Duration:** 3–6 months. **Substitutions:** T3 fully interchangeable; T1/T2 should be big-4 compounds but variations acceptable. **Licensing:** Freely shared, no trademark restrictions — **lowest licensing risk**. **Source:** https://thefitness.wiki/routines/gzclp/

### Greyskull LP / Phrak's Variant (John Sheaffer; "Phrakture")

**Creator credentials:** Sheaffer — former U.S. Army paratrooper, strength coach, author of *Greyskull LP: Second Edition*. Phrak's variant created by experienced r/Fitness moderator; recommended as the primary beginner program on the r/Fitness wiki. **Target:** Beginners (0–6 months).

**Phrak's variant:** Workout A: OHP 2×5 + 1×5+, Chin-up 2×5 + 1×5+, Squat 2×5 + 1×5+. Workout B: Bench 2×5 + 1×5+, Barbell Row 2×5 + 1×5+, Deadlift 1×5+. Week 1: A/B/A; Week 2: B/A/B.

**Progression:** Upper +2.5 lb/session; Lower +5 lb/session. **Accelerated rule:** AMRAP >10 reps → double the weight increase. **Deload:** AMRAP falls below 5 reps → reset that lift 10%. **Duration:** 2–4 months. **Substitutions:** Chin-ups → lat pulldowns or band-assisted; optional accessories (curls, face pulls). **Licensing:** Community-created, freely shared — **no licensing issues, best candidate for app implementation**. **Source:** https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/

---

## Category 2: PPL programs with clear periodization

### Reddit PPL / Metallicadpa's PPL

**Creator:** Reddit user u/metallicadpa (community member). **Target:** Beginners to early intermediates. **Split:** 6 days/week — Push A / Pull A / Legs / Push B / Pull B / Legs / Rest.

Push A: Bench 4×5 + 1×5+ (AMRAP), OHP 3×8–12, Incline DB Press 3×8–12, Tricep Pushdown 3×8–12 SS Lateral Raise, OH Tricep Extension 3×8–12 SS Lateral Raise. Push B: OHP 4×5 + 1×5+, Bench 3×8–12, same accessories. Pull A: Deadlift 1×5+, Lat Pulldown 3×8–12, Seated Row 3×8–12, Face Pull 5×15–20, Hammer Curl 4×8–12, DB Curl 4×8–12. Pull B: Bent Over Row 4×5 + 1×5+, same accessories. Legs: Squat 2×5 + 1×5+, RDL 3×8–12, Leg Press 3×8–12, Leg Curl 3×8–12, Calf Raise 5×8–12.

**Progression:** Linear on compounds (+5 lb upper/+10 lb lower per session). Accessories use **double progression** (add reps within 8–12 range, then +5 lb reset to 8). **Deload:** Fail 3 consecutive sessions → deload 10%. **Substitutions:** Explicitly defined (Lat Pulldown→Pull-up, Seated Row→DB Row, Leg Press→Front Squat). **Licensing:** Free/open source; already on Boostcamp and Liftosaur. **Source:** https://liftvault.com/programs/strength/metallicadpa-ppl-template/

### Coolcicada PPL

**Creator:** Anonymous BodyBuilding.com forum user. **Target:** Intermediates (6+ months). **Split:** 6 days/week PPL.

Push: Bench 3×5, OHP 3×5, Incline Bench 3×5, Lateral Raise 3×10–12, Tricep work 6×10–12. Pull: Row 3×5, Deadlift 1×5 (optional), Lat Pulldown 3×8–10, Seated Row 3×8–10, Face Pull 3×10–12, Curls 7×10–12. Legs: Squat 4×5–6, Leg Press 3×8–10, Extensions/Curls 6×10–12, Calf Raise 5×10–12.

**Progression:** Compounds +5 lb/week. Isolation double progression. **Deload:** None formally defined — community recommends every 6 weeks at 50% volume. **Licensing:** Free, forum post. **Source:** https://liftvault.com/programs/strength/coolcicada-ppl-spreadsheet/

### Jeff Nippard's Ultimate Push Pull Legs

**Creator credentials:** BSc Biochemistry, natural pro bodybuilder (WNBF), competitive powerlifter, ~5M YouTube subscribers. **Target:** Intermediate to advanced. **Split:** 10-day cycle (not 7-day): Push(Chest)/Pull(Lats)/Legs(Posterior)/Push(Shoulders)/Pull(Upper Back)/Legs(Quads)/Weak Point+Arms/Rest/Rest/Rest.

**Duration:** 12 weeks across 3 phases. Phase 1 (6 weeks): higher reps, volume base. Phase 2 (4 weeks): moderate reps, increased intensity. Phase 3 (2 weeks): lower reps, peak intensity. **Progression:** Block periodization with %1RM-based compound work and RPE-based accessories. Deadlift percentages progress weekly (72.5% → 82.5%). **Deload:** Semi-deload after Phase 1, full deload after Phase 3. **Substitutions:** Two substitution options per powerlift explicitly listed. **Licensing:** ⚠️ **PAID ($40), copyrighted by STRCNG Incorporated. Cannot be reproduced without licensing.** App needs special 10-day cycle logic. **Source:** https://jeffnippard.com/products/the-ultimate-push-pull-legs-system

---

## Category 3: Upper/lower splits from credentialed coaches

### PHUL — Power Hypertrophy Upper Lower (Brandon Campbell)

**Creator credentials:** Personal trainer, powerlifter, YouTuber (200K+ subscribers). **Target:** Intermediates (1–3 years). **Split:** 4 days/week — Mon Upper Power, Tue Lower Power, Thu Upper Hypertrophy, Fri Lower Hypertrophy.

**Power days:** Compounds at 3–4×3–5, rest 3–5 min; assistance at 3–4×6–10. **Hypertrophy days:** All work at 3–4×8–12, rest 60–90 sec. **Progression:** Double progression — hit top of range on all sets → add weight. **Deload:** Every 6–8 weeks, reduce weights 40–50%. **Duration:** 12–16 weeks. **Substitutions:** Compounds fixed; accessories freely swappable by movement pattern. **Licensing:** Free on muscleandstrength.com; officially on Boostcamp. **Source:** https://www.muscleandstrength.com/workouts/phul-workout

### Lyle McDonald's Generic Bulking Routine

**Creator credentials:** BS Physiology/Kinesiology; author of 7+ books (*The Ketogenic Diet*, *The Protein Book*). Decades of evidence-based coaching. **Target:** Intermediates during bulking phases. **Split:** 4 days/week — Mon Lower, Tue Upper, Thu Lower, Fri Upper.

Lower: Squat 3–4×6–8, SLDL 3–4×6–8, Leg Press 2–3×10–12, Leg Curl 2–3×10–12, Calf work 5–7 sets. Upper: Bench 3–4×6–8, Row 3–4×6–8, DB Shoulder Press 2–3×10–12, Chin-up 2–3×10–12, Skullcrusher 1–2×12–15, Curl 1–2×12–15.

**Progression:** Double progression within 8-week blocks. Weeks 1–2 submaximal run-up (85–95% working weights), Weeks 3–8 full progressive overload. **Deload:** After every 6–8 week cycle, reduce volume 40–50% for 1 week. **Substitutions:** Explicitly defined by Lyle — Thu Lower can swap Squat→Front Squat, Fri Upper swaps Bench→Incline. **Licensing:** Free (public forums/articles). **Source:** https://liftvault.com/programs/bodybuilding/lyle-mcdonald-bulking-workout-routine-spreadsheet/

### 5/3/1 Boring But Big (Jim Wendler)

**Creator credentials:** Elite powerlifter (1000 lb squat, 2375 lb total at 275); trained at Westside Barbell; high school football S&C coach; author of the 5/3/1 book series. **Target:** Intermediates with solid compound technique. **Split:** 4 days/week — OHP / Deadlift / Bench / Squat.

**Main 5/3/1 work (% of Training Max = 90% of 1RM):** Week 1: 5@65%, 5@75%, 5+@85%. Week 2: 3@70%, 3@80%, 3+@90%. Week 3: 5@75%, 3@85%, 1+@95%. Week 4 (deload): all at 40–60%. **BBB supplemental:** 5×10 @ 50% TM after main work, rest 60–120 sec. Three-month challenge variant: 50% → 60% → 70%. **Assistance:** 1 pull + 1 core/arm exercise, each 5×10.

**Progression:** After each 3-week working cycle: upper TM +5 lb, lower TM +10 lb. **Deload:** Every 4th week, mandatory. **Substitutions:** BBB sets can use "opposite lift" (Bench 5/3/1 → OHP 5×10); assistance freely swappable within push/pull/core categories. **Licensing:** Basic BBB template published free on Wendler's blog. Full system in paid books ($40). Multiple apps implement 5/3/1 freely with disclaimers — **Wendler has not been known to issue takedowns**. **Source:** https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big

### Candito Linear Program (Jonnie Candito)

**Creator credentials:** Competitive powerlifter; former American deadlift record holder (650 lb @ 165 BW); IPF World Championship medalist. **Target:** Advanced novice to early intermediate. **Split:** 4 days/week — Heavy Lower / Heavy Upper / Control Lower / Control Upper.

Heavy days: Main lifts 3×6 (lower) or 3×6 (upper), rest 3–10 min. Control variant: Pause variations 6×4 @ ~70%. Hypertrophy variant: Front Squat 5×8, Incline Press 5×8. **Progression:** Linear, 0–10 lb/week (autoregulated by feel). **Stall protocol:** Miss weight → drop 15 lb next week. Three variants from same base (Strength/Control, Strength/Power, Strength/Hypertrophy). **Substitutions:** Explicit lists for every slot (10–25+ options). **Licensing:** Free PDF distributed by Candito. **Source:** https://liftvault.com/programs/strength/jonnie-candito-linear-program-spreadsheet/

### nSuns 5/3/1 LP

**Creator:** Reddit user u/nSuns. Combines Wendler's 5/3/1 with Sheiko-style volume. **Target:** Late novice to intermediate. **Variants:** 3, 4, 5, or 6-day options.

**T1 main lift:** 9 sets with varying reps/percentages ramping from ~50% to ~85% of 1RM + 1 AMRAP set. **T2 secondary lift:** 8 sets at lower percentages. Weekly volume: ~17 sets squat, ~17 sets deadlift, **~26 sets pressing**. Very high volume.

**Progression (AMRAP-driven):** 0–1 reps on 1+ set: no increase. 2–3 reps: +5 lb TM. 4–5 reps: +5–10 lb. 6+ reps: +10–15 lb. **Deload:** Every 4–6 weeks, reduce by 30–50%. **Accessories:** User-selected, 2–4 sets × 8–12 reps. **Licensing:** Free, open source. Already on Boostcamp (creator collaborated). **Source:** https://liftvault.com/programs/powerlifting/n-suns-lifting-spreadsheets/

---

## Category 4: Full body programs for 2–3 day/week trainees

### 5/3/1 for Beginners

**Split:** 3 days/week, full body. Day 1: Squat + Bench (5/3/1 + FSL 5×5). Day 2: Deadlift + OHP. Day 3: Bench + Squat. **Assistance every session:** 50–100 total reps each of a push, pull, and single-leg/core exercise (trainee's choice). Percentage engine required for TM calculations. Monthly TM increases: +10 lb lower, +5 lb upper. **Source:** https://thefitness.wiki/routines/5-3-1-for-beginners/

### Strong Curves — Bootyful Beginnings (Bret Contreras)

**Creator credentials:** PhD Sports Science (AUT University); CSCS; extensive glute EMG research. **Target:** Female beginners. **Split:** 3–4 days/week, 12 weeks across 3 four-week phases with harder exercise variations each phase.

Each session uses **superset pairs** (A1/A2 3 sets alternating, B1/B2 3 sets, straight set C 3 sets, circuit D 1 set each). **Progression:** Double progression within rep ranges (e.g., 8–12 or 10–20); hit top of range → add 5 lb. Phase changes introduce harder exercise variations. **Rest:** 30–90 sec between superset pairs. **Licensing:** Book-based, copyrighted. Available on Boostcamp (free, unaffiliated). **Source:** https://liftvault.com/programs/strength/strong-curves-program-spreadsheet/

---

## Category 5: Bodyweight and calisthenics progressions

### r/bodyweightfitness Recommended Routine (RR)

**Creator:** Community-created by r/bodyweightfitness (2M+ members). **Target:** Beginners to intermediates. **Split:** Full body 3×/week, ~1 hour per session.

**Structure:** Exercises done in paired supersets + one core triplet. **All strength work:** 3×5–8 reps. When you hit 3×8 with good form → advance to next progression, restart at 3×5. Static holds: advance when holding 30 sec for all 3 sets. **Rest:** 90 sec between exercises in a pair (effectively 3 min between same-exercise sets). Core triplet: 60 sec.

**Exercise progression chains:**
- **Pull-up:** Scapular Pulls → Arch Hangs → Negative Pull-ups → Pull-ups → Weighted Pull-ups
- **Squat:** Assisted Squat → Squat → Bulgarian Split Squat → Beginner Shrimp → Intermediate Shrimp → Advanced Shrimp
- **Dip:** Support hold → Negative dips → Dips → Weighted Dips
- **Hinge:** Romanian Deadlift → Single Leg DL → Banded Nordic Negatives → Banded Nordic Curl → Nordic Curl
- **Push-up:** Wall → Incline → Full → Diamond → (advanced progressions)
- **Row:** Incline rows → Horizontal rows → Weighted rows → Tuck front lever

**Substitutions:** Barbell squats allowed for squat progression; barbell deadlifts for hinge. Multiple alternate progression paths exist. **Licensing:** **Free/open source** — community-created, hosted on GitHub Pages. Best candidate for bodyweight app implementation. **Source:** https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/

### Convict Conditioning (Paul Wade)

**Creator credentials:** Pseudonymous author, claimed prison training background (legitimacy debated). Published by Dragon Door, 2009. **Target:** All levels. **Split:** Multiple options — "New Blood" 2×/week full body; "Veterano" 6 days/week one exercise/day.

**The "Big Six" with 10-step progressions** — each exercise has Beginner/Intermediate/Advanced standards:

- **Push-ups:** Wall → Incline → Kneeling → Half → Full → Close → Uneven → Half One-Arm → Lever → **One-Arm Push-up** (master)
- **Squats:** Shoulderstand → Jackknife → Supported → Half → Full → Close → Uneven → Half One-Leg → Assisted Pistol → **Pistol Squat**
- **Pull-ups:** Vertical Pulls → Horizontal → Jackknife → Half → Full → Close → Uneven → Half One-Arm → Assisted One-Arm → **One-Arm Pull-up**
- **Leg Raises:** Knee Tucks → Flat Knee Raises → Flat Bent Leg → Flat Frog → Flat Straight → Hanging Knee → Hanging Bent → Hanging Frog → Partial Straight → **Hanging Straight Leg Raise**
- **Bridges:** Short → Straight → Angled → Head → Half → Full → Wall Walking Down → Wall Walking Up → Closing → **Stand-to-Stand**
- **HSPUs:** Wall Headstand → Crow Stand → Wall Handstand → Half HSPU → Full HSPU → Close → Uneven → Half One-Arm → Lever → **One-Arm HSPU**

**Tempo:** 2s down, 1s pause, 2s up. **Rest:** 3–5 min (strength), 30–45 sec (hypertrophy). Advance to next step when hitting Advanced Standard (e.g., Full Push-ups: 2×20, Full Pull-ups: 2×10). **Licensing:** Copyrighted, Dragon Door Publications. Cannot reproduce verbatim without licensing. **Source:** https://www.allthingsgym.com/convict-conditioning-summary-cheat-sheet/

### Overcoming Gravity (Steven Low)

**Creator credentials:** Doctor of Physical Therapy (UMD Baltimore), BS Biochemistry, former competitive gymnast, PCC Senior Trainer. **Target:** All levels; gymnastics/calisthenics athletes.

This is a **framework for building your own routine**, not a fixed program. Exercises ranked on FIG-inspired difficulty charts across 4 categories: vertical push, horizontal/vertical pull, horizontal push, and combined skills. **Guidelines:** Strength: 3–5 sets × 3–8 reps, 3–5 min rest. Hypertrophy: 3–4 sets × 6–12 reps, 1–3 min rest. Isometric holds use adapted Prilepin's tables. Full body 3×/week for beginners. Structural balance required (vertical pull, horizontal pull, vertical push, horizontal push, legs, core). **Licensing:** Copyrighted, self-published (~$40). Boostcamp has licensed templates. **Source:** https://stevenlow.org/overcoming-gravity/

### Hybrid Calisthenics (Hampton Liu)

**Creator credentials:** Certified fitness trainer, 3.5M+ YouTube subscribers. Inspired by Convict Conditioning. **Target:** Absolute beginners. **Core exercises:** Push-ups, Pull-ups, Squats, Leg Raises, Bridges, Twists — each with multi-step progressions and defined standards.

**Tempo:** 2s down, 1s pause, 2s up, 1s pause. **Rest:** 60 sec between sets, 5 min between exercises. Generally 3 sets per exercise. When standard met → advance to next variation. **Licensing:** Routine freely shared online; has own official app. Content is Hampton's IP but routine information is openly published. **Source:** https://www.hybridcalisthenics.com/routine

### GMB Elements

**Creator credentials:** Ryan Hurst (10 years competitive gymnastics, 30+ years training), Jarlo Ilano (MPT, OCS, licensed Physical Therapist), Andy Fossett (6th-degree black belt, curriculum designer). **Target:** All levels.

**Not a traditional reps/sets program** — movement-based with four animal patterns: Bear, Monkey, Frogger, Crab. Sessions follow 5Ps: Prep → Practice → Play → Push (5 rounds × 1 min, 1 min rest) → Ponder. 3–5 sessions/week, 15–45 min. **Not ideal for a rep-counting tracker app** — requires timer-based and movement-quality tracking. **Licensing:** Commercial/paid ($95). Cannot reproduce without licensing. **Source:** https://gmb.io/e/

---

## Category 6: Hypertrophy-focused programs

### PHAT — Power Hypertrophy Adaptive Training (Layne Norton)

**Creator credentials:** PhD Nutritional Sciences, professional natural bodybuilder, 2× IPF World Championship medalist, 5× national powerlifting champion. **Target:** Intermediate to advanced. **Split:** 5 days/week — Upper Power / Lower Power / Rest / Back & Shoulders Hypertrophy / Lower Hypertrophy / Chest & Arms Hypertrophy / Rest.

**Power days:** Main lifts 3–5×3–5 @ 70–80% 1RM, rest 3–6 min. Assistance 2–3×6–10. **Hypertrophy days:** Speed work (6×3 @ 65–70% of power weight), then 3×8–12 and 2–3×12–15 work. Rest 1–2 min. Each muscle hit 2×/week (once power, once hypertrophy). **Progression:** Daily undulating periodization (DUP). Double progression on hypertrophy; linear on power compounds. Rotate power movements every 2–3 weeks. **Deload:** Every 4–6 weeks. **Volume:** ~15–25+ sets/muscle/week. **Licensing:** **Free** — published openly by Norton. Available on Boostcamp. **Source:** https://simplyshredded.com/mega-feature-layne-norton-training-series-full-powerhypertrophy-routine-updated-2011.html

### Renaissance Periodization hypertrophy framework (Mike Israetel)

**Creator credentials:** PhD Sport Physiology, former Temple University professor, competitive bodybuilder. Co-founder of RP with Dr. James Hoffmann (PhD). **Target:** All levels (scales from beginner to advanced).

This is a **framework**, not a single program. The volume landmarks system defines weekly sets per muscle group:

| Muscle Group | MV (maintenance) | MEV (minimum effective) | MAV (maximum adaptive) | MRV (max recoverable) |
|---|---|---|---|---|
| Chest | ~6 | 8–10 | 12–20 | 22+ |
| Back | ~6 | 8–10 | 14–22 | 25+ |
| Quads | ~6 | 6–8 | 12–18 | 20+ |
| Side/Rear Delts | ~6 | 8 | 16–22 | 26+ |
| Biceps | ~4 | 6–8 | 14–20 | 26+ |
| Triceps | 0–4 | 4–6 | 10–14 | 18+ |

**Mesocycle structure:** 4–6 week accumulation + 1 week deload. Start at MEV, add 1–3 sets/week, approach MRV by end. **RIR progression:** Start 3–4 RIR week 1, progress to 0–1 RIR final week. Keep reps stable, add weight to maintain target RIR. **Deload:** Drop to MV for 1 week. **Licensing:** Volume landmark concepts and articles are **free** (rpstrength.com/blogs). The RP Hypertrophy App algorithm and specific templates are **proprietary** (~$15/month subscription). You can implement the general framework concepts without replicating RP's specific algorithm. **Source:** https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth

### GZCL Jacked & Tan 2.0 (Cody Lefever)

**Creator credentials:** Competitive powerlifter, GZCL method creator. **Target:** Intermediates (1+ year training). **Split:** 4 days/week. **Duration:** 12 weeks (two 6-week blocks).

**T1 progression across weeks:** Week 1: Find 10RM + 3×6 drop sets @ 70% TM. Week 2: Find 8RM + 3×5 @ 72.5%. Weeks progress through 6RM, 4RM, 2RM, until Week 6: test 1RM. Block 2 repeats with different percentages. **T2:** Sets of 8–10 (Block 1) progressing to 4–6 (Block 2). **T3 (Max Rep Sets):** Pick weight, do 3 sets aiming for 15–20 reps; when target met, increase weight. **Rest:** T1: 3–5 min; T2: 2–4 min; T3: 30–90 sec. **Licensing:** **Free** — published on blog and available on Boostcamp. **Source:** http://swoleateveryheight.blogspot.com/2016/07/jacked-tan-20.html

### German Volume Training (Charles Poliquin)

**Creator credentials:** Canadian strength coach; trained Olympic medalists; PICP certification founder. Credited method to Rolf Feser (German national weightlifting coach, 1970s). **Target:** Intermediates. **Split:** 5-day rotation — Chest & Back / Legs & Abs / Rest / Arms & Shoulders / Rest.

**Main exercises:** 10×10 @ 60% 1RM. **Tempo:** 4-0-2-0 (4 sec eccentric). **Rest:** 60–90 sec. **Accessories:** 3×10–12. **Progression:** Complete all 10×10 with prescribed tempo → increase weight 2.5–5%. **Phase 2 (after 4 weeks):** 10×6 @ 70–80%. **Duration:** 4–6 weeks only (do not run longer). 1–2× per year max. **Licensing:** **Free** — public domain methodology. **Source:** https://liftvault.com/programs/bodybuilding/german-volume-training-routine-spreadsheet-gvt/

### John Meadows programs (Gamma Bomb, Creeping Death 2)

**Creator credentials:** IFBB Pro bodybuilder (deceased 2021), CSCS. "Mountain Dog" methodology. Coached numerous IFBB pros. **Target:** Intermediate to advanced bodybuilders.

Gamma Bomb: 5 days/week body-part split, 12 weeks with progressive volume increases. Creeping Death 2: 6 days/week PPL×2 with heavy use of intensifiers (drop sets, iso holds, partials). Every exercise has assigned RPE (8–12 scale). **Licensing:** ⚠️ **All paid ($99–149 per program). Cannot reproduce without licensing from Team Meadows.** **Source:** https://mountaindogdiet.com/programs/

---

## Category 7: Athletic and functional programs

### Westside Barbell Conjugate Method (Louie Simmons)

**Creator credentials:** Louie Simmons (1947–2022), elite powerlifter, 140+ all-time world records at his gym, NFL S&C consultant. **Target:** Powerlifters, athletes. **Split:** 4 days/week.

Day 1 (Sun): Max Effort Lower — work to 1–3RM on squat/DL variation. Day 2 (Mon): Max Effort Upper — work to 1–3RM on bench variation. Day 3 (Wed): Dynamic Effort Lower — **10–12×2 box squats @ 50–60% + bands/chains**, 45–60 sec rest. Day 4 (Fri): Dynamic Effort Upper — **9×3 speed bench @ 50–60%**, 60 sec rest. Each day: 3–5 accessories at 3–5×8–20. **Key rule:** ME exercises rotate every 1–3 weeks. DE uses 3-week pendulum waves (50%, 55%, 60%). **Licensing:** "Westside Barbell" is trademarked. The underlying ME/DE/RE methodology is based on Soviet systems and is **not proprietary**. **Source:** https://www.westside-barbell.com/pages/conjugate-method

### WS4SB — Westside for Skinny Bastards (Joe DeFranco)

**Creator credentials:** Owner of DeFranco's Gym; trained hundreds of NFL players and draft picks; one of the most recognized athletic performance coaches in the US. **Target:** Athletes (especially football), hardgainers.

WS4SB3 (4 days): Mon ME Upper (bench variant to 3–5RM), Tue DE Lower (box squats 8×2 @ 50–60% or jumps), Thu RE Upper (DB bench for max reps or 3×20–30), Fri ME Lower (squat/DL variant to 3–5RM). Each day includes unilateral work, hip extension, and upper back. **Substitutions:** Extensive — DeFranco provides **10–25+ exercise options per slot**. This flexibility is a defining feature. **Licensing:** **Freely available** — published on T-Nation and DeFranco's website. **Source:** https://www.defrancostraining.com/westside-for-skinny-bastards-part1/

### Juggernaut Method (Chad Wesley Smith)

**Creator credentials:** Top-10 all-time powerlifting total, 2× national champion shot put, Pro Card Strongman. Sent 8 athletes to NFL. **Target:** Athletes, powerlifters.

**16-week cycle, 4 waves × 4 weeks:** 10s Wave (Weeks 1–4): hypertrophy, sets of 10+ @ ~60%. 8s Wave: bridge phase. 5s Wave: strength, sets of 5+. 3s Wave: peak strength. Each wave: Accumulation → Intensification → Realization (AMRAP test) → Deload. Weight adjustments based on AMRAP performance. **Duration:** 16 weeks, repeatable. **Deload:** Every 4th week within each wave. **Licensing:** Ebook ~$20; spreadsheets on Lift Vault. Not aggressively enforced. **Source:** https://www.jtsstrength.com/

### Triphasic Training (Cal Dietz)

**Creator credentials:** Head Olympic S&C Coach, University of Minnesota. 540+ All-Americans, 11 NCAA National Team Champions. **Target:** Collegiate/pro athletes.

Three phases (~2–3 weeks each): **Eccentric** (5–6 sec lowering, 3×3–5 @ 80–85%), **Isometric** (3–6 sec holds, 3×2–4 @ 80–90%), **Concentric/Reactive** (explosive, lower %, speed emphasis). Book includes 5 complete 24-week programs for 2–6 day training schedules. **Substitutions:** Over two dozen tables showing exercise modifications. **Licensing:** Book $25–45; Dietz shares current programs freely at triphasictraining.com. **Source:** https://triphasictraining.com/

### Dan John's programs

**Creator credentials:** Legendary S&C coach, All-American discus thrower, Highland Games competitor, prolific author.

**Easy Strength** (with Pavel Tsatsouline): 5 days/week, 40 workouts. 5 lifts daily (press, pull, hinge, squat, loaded carry). Max 10 reps per movement. Rep rotation: 2×5, 5/3/2, 6 singles, 1×10, etc. across 2-week blocks. Autoregulated — "when weights feel light, add more." Never below 60% or above 80%. Duration: 40 sessions (~8 weeks). **10,000 Kettlebell Swing Workout:** 500 KB swings/session, 4–5 days/week. Strength ladders (1-2-3) of press/goblet squat/dip/chin-up between swing sets of 10-15-25-50. **Licensing:** Easy Strength principles freely shared online. 10K Swing published free on T-Nation. Mass Made Simple is a commercial book. **Source:** https://danjohnuniversity.com/essays/even-easier-strength

---

## App integration master comparison

| Program | Category | Days/wk | Progression Type | Deload | Substitutions | Free? | Complexity |
|---|---|---|---|---|---|---|---|
| Phrak's GSLP | Linear | 3 | Linear + AMRAP | ✅ 10% reset | Limited | ✅ | Low |
| GZCLP | Linear | 3–4 | Linear + stages | ✅ Stage system | ✅ T3 flexible | ✅ | Medium |
| Starting Strength | Linear | 3 | Linear/session | ✅ 10% reset | ❌ None | ⚠️ TM risk | Low |
| StrongLifts 5×5 | Linear | 3 | Linear/session | ✅ Multi-tier | ❌ None | ⚠️ TM risk | Low |
| Reddit PPL | PPL | 6 | Linear + double | ✅ 10% after 3 fails | ✅ Explicit | ✅ | Medium |
| Coolcicada PPL | PPL | 6 | Linear + double | ⚠️ Not defined | ✅ Flexible | ✅ | Low |
| Nippard PPL | PPL | 6 (10-day) | Block (%1RM + RPE) | ✅ Built-in | ✅ 2 per lift | ❌ Paid | High |
| PHUL | Upper/Lower | 4 | Double progression | ✅ Every 6–8 wk | ✅ Pattern-based | ✅ | Low |
| Lyle McDonald GBR | Upper/Lower | 4 | Double (8-wk cycles) | ✅ After cycle | ✅ Explicit | ✅ | Low |
| 5/3/1 BBB | Upper/Lower | 4 | %-based monthly | ✅ Every 4th week | ✅ Push/pull/core | ✅ (basic) | Medium |
| Candito Linear | Upper/Lower | 4 | Linear (0–10 lb/wk) | ⚠️ Switch program | ✅ Lists provided | ✅ | Medium |
| nSuns 5/3/1 | Upper/Lower | 4–6 | Weekly LP (AMRAP) | ✅ Every 4–6 wk | ✅ Accessories | ✅ | Medium |
| 5/3/1 Beginners | Full body | 3 | %-based monthly | ✅ TM test week | ✅ Assistance | ✅ (basic) | Medium |
| Strong Curves | Full body | 3–4 | Double + phases | ⚠️ Implicit | ✅ Pattern-based | ⚠️ Book | Medium |
| BWF RR | Bodyweight | 3 | 3×8 → next level | ⚠️ Not formal | ✅ Multiple paths | ✅ | Medium |
| Convict Conditioning | Bodyweight | 2–6 | Standard → next step | ⚠️ Not formal | ❌ Rigid | ❌ Paid | Medium |
| Hybrid Calisthenics | Bodyweight | 3–5 | Standard → next step | ⚠️ Not formal | ✅ Flexible | ✅ | Low |
| PHAT | Hypertrophy | 5 | DUP + double | ✅ Every 4–6 wk | ✅ Flexible | ✅ | High |
| RP Framework | Hypertrophy | 3–6 | Volume + RIR | ✅ Drop to MV | ✅ Full alternatives | ⚠️ Mixed | Very High |
| JT 2.0 | Hypertrophy | 4 | Block + RM tests | ⚠️ Week 6 = 1RM test | ✅ T2/T3 flexible | ✅ | High |
| GVT | Hypertrophy | 5 (rotation) | 10×10 completion | ❌ Too short | ✅ Basic | ✅ | Low |
| WS4SB | Athletic | 3–4 | Autoregulated | ⚠️ Seasonal | ✅ 10–25 options/slot | ✅ | Medium |
| Juggernaut | Athletic | 4 | Wave + AMRAP | ✅ Every 4th week | ✅ Per category | ⚠️ Ebook | High |
| Conjugate | Athletic | 4 | Concurrent | ⚠️ Rotation-based | ✅ Must rotate | ⚠️ TM risk | High |
| Dan John Easy Str | Athletic | 5 | Autoregulated | ⚠️ Not formal | ✅ By pattern | ✅ | Low |

## Licensing risk and legal framework for app developers

**The core legal principle:** Under US copyright law (Section 102(b)), copyright does not extend to ideas, procedures, processes, systems, or methods of operation. A set/rep/percentage scheme is a mathematical system, not creative expression. **Brand names are the primary risk** — "CrossFit" ($3,000/year affiliate fee, active enforcement), "Starting Strength" (trademarked with official app), and "StrongLifts" (trademarked with proprietary app) carry the highest risk.

**Lowest risk (implement freely with attribution):** GZCLP, Phrak's GSLP, nSuns, Reddit PPL, BWF RR, WS4SB, PHAT, PHUL, Lyle McDonald GBR, GVT, Dan John's Easy Strength principles, Jacked & Tan 2.0. All are community-created or explicitly published free by their creators.

**Moderate risk (use with clear disclaimers):** 5/3/1 percentage calculations (widely implemented in apps — Boostcamp uses "not affiliated with Jim Wendler" disclaimer), Juggernaut Method wave structure, Convict Conditioning progression chains, Conjugate ME/DE template structure.

**High risk (seek license or avoid):** Using "CrossFit" anywhere in your app. Reproducing Jeff Nippard programs (STRCNG Inc. IP, ~$30–50 per program). Reproducing John Meadows programs ($99–149 each, copyrighted by estate). Replicating the RP Hypertrophy App's autoregulation algorithm. Reproducing Alex Viada's *Hybrid Athlete* templates verbatim.

The industry-standard approach, exemplified by **Boostcamp** (50+ programs including 5/3/1, GZCLP, nSuns, PHAT), is: implement the mathematical progression system, use the program's commonly-known name under nominative fair use, include a clear "not affiliated with [creator]" disclaimer, write original coaching text, and avoid using logos or brand assets. No known cases exist of program creators suing app developers for implementing their set/rep schemes.