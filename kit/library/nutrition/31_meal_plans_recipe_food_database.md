# Building a better MyFitnessPal: meal plans, recipe guides, and food data architecture

**The food database is the backbone of any nutrition tracking app, and MyFitnessPal's biggest weakness — inaccurate, duplicated, user-submitted entries — is our biggest opportunity.** This report covers everything needed to build a comprehensive meal planning, recipe, and food database system: which data sources to use and why, how to structure the database for accuracy and extensibility, how to handle branded/frozen/preprocessed foods, meal planning algorithms, recipe recommendation systems, and the UX patterns that make logging feel effortless rather than tedious.

The core thesis: **use verified, authoritative data sources as the foundation (USDA FoodData Central + Open Food Facts), layer curated recipes on top, and build smart meal planning that adapts to the user's goals, preferences, and what they already have in the pantry.**

---

## Part 1: Food database sources — what exists and what to use

### The landscape of food nutrition APIs and databases

There are six major food data sources worth evaluating. Each has distinct strengths and trade-offs:

| Source | Size | Data Quality | Cost | Best For |
|---|---|---|---|---|
| **USDA FoodData Central** | ~400K+ items (branded updated monthly) | Gold standard — lab-analyzed | Free (API key, 1K req/hr) | Foundation foods, raw ingredients, nutrient depth |
| **Open Food Facts** | 2.8M+ products, 150 countries | Crowdsourced but improving | Free (open-source, ODBL license) | International branded/packaged foods, barcode data |
| **FatSecret Platform** | 2.3M+ verified items, 56 countries | Verified, curated | Free tier (5K calls/day, US data, attribution required) | Large verified database, international coverage |
| **Edamam** | 900K+ foods, 2.3M recipes, 680K UPCs | NLP-powered, 150+ nutrients | Free tier → $799/mo | Recipe search, nutrition analysis from text |
| **Spoonacular** | 365K recipes, 86K food products | Curated | Free tier (limited points) → $149/mo | Recipe recommendations, meal planning features |
| **Nutritionix** | 1.9M+ items (991K grocery, 202K restaurant) | RD-verified, NLP input | $299/mo starter, $1,850/mo enterprise | Restaurant foods, natural language parsing |

### USDA FoodData Central: the authoritative foundation

USDA FDC is the single most important data source for any nutrition app. It provides five distinct dataset types:

**Foundation Foods** — The most analytically rigorous. Covers basic/unprocessed foods with extensive metadata: number of samples, sampling location, collection date, analytical methods. ~2,000 foods with up to 150 nutrients each. This is what Cronometer uses as their primary source and why they're considered the most accurate tracker.

**SR Legacy** — The classic USDA Standard Reference. Final release April 2018, no longer updated. ~8,000 foods. Still widely referenced but being superseded by Foundation Foods.

**USDA Global Branded Food Products Database (BFPD)** — Updated monthly via the Global Data Synchronization Network (GDSN). Contains nutrition label data voluntarily provided by food manufacturers. Covers hundreds of thousands of branded products including frozen foods, snacks, beverages, and processed items. This is where frozen pizza, Lean Cuisine, Amy's Kitchen, and other branded items live. **Key limitation:** Label Insight data stopped flowing after November 2023, so GDSN is now the sole pipeline.

**FNDDS** — Food and Nutrient Database for Dietary Studies. Designed for NHANES dietary recall analysis. Useful for "mixed dish" items like "beef burrito" or "chicken Caesar salad" where the user logs a composite food rather than individual ingredients.

**Experimental Foods** — Research-context food composition data. Less relevant for consumer apps.

**Why USDA is essential:**
- Free, no rate limiting beyond 1,000 req/hr (adequate for most apps)
- API key signup is instant at data.gov
- Bulk CSV downloads available every 6 months
- Branded foods updated monthly in API
- Up to 150 nutrients per food item (vs MyFitnessPal's ~15)
- No user-submitted garbage data — everything is either lab-analyzed or label-sourced
- Python client available: `pip install fooddatacentral`

**API structure:**
- Search endpoint: `/fdc/v1/foods/search` — full-text search with data type filters
- Detail endpoint: `/fdc/v1/food/{fdcId}` — full nutrient profile for one food
- List endpoint: `/fdc/v1/foods/list` — paginated browse
- Supports filtering by data type (Foundation, Branded, SR Legacy, FNDDS)

### Open Food Facts: the international branded food layer

Open Food Facts is a Wikipedia-style collaborative food database with 2.8M+ products from 150+ countries. Key characteristics:

- **Barcode-first:** every product has a UPC/EAN barcode as its primary identifier
- **Crowdsourced with structure:** contributors scan product labels and upload images; the platform uses OCR and AI to extract nutrition facts
- **Rich metadata beyond nutrition:** Nutri-Score (A-E health grade), NOVA group (ultra-processing classification), eco-score, allergens, additives, ingredients list, vegan/vegetarian status, palm oil presence
- **Completely free and open:** ODBL license, no API keys needed, full database dumps available on Hugging Face
- **API v2 (current) and v3 (in development):** REST API with product lookup by barcode, search by name/brand/category

**Why it complements USDA:**
- Much stronger international coverage (USDA is US-centric)
- Better for store-brand and private-label products that USDA BFPD may miss
- NOVA ultra-processing classification is unique and valuable for health-conscious users
- Ingredient list parsing provides allergen and dietary preference data automatically

**Limitations:**
- Crowdsourced = quality varies. Some entries have incomplete or incorrect data
- Nutrient coverage is typically 15-20 nutrients (label data) vs USDA's 150
- US coverage is weaker than European coverage

### The accuracy problem: why MyFitnessPal fails and how we avoid it

MyFitnessPal has 14M+ food entries but suffers from fundamental data quality issues:

**Root causes of inaccuracy:**
1. **Unverified user submissions** — anyone can create entries without validation. The green checkmark only means enough users upvoted it, not that a dietitian verified it
2. **Massive duplication** — the same food often has 10+ entries with different calorie counts. "Banana" returns hundreds of results, many wildly different
3. **Stale data** — entries from 2018 may not reflect 2026 reformulations. Companies frequently change recipes, serving sizes, and labels
4. **Restaurant entries are guesses** — user-submitted restaurant entries can be off by 20-40%
5. **Crowdsourcing without structure** — no canonical ingredient IDs, no version tracking, no automated label verification

**Measured impact:** A crowdsourced food database can have 15-30% variance in calorie counts for common foods. Over a full day, this translates to 300-500 calorie errors — enough to completely negate a carefully planned deficit or surplus.

**Our approach: verified-first with layered fallback:**

```
Tier 1: USDA Foundation Foods + SR Legacy (lab-analyzed, ~10K items)
   ↓ not found
Tier 2: USDA Branded Foods (label-sourced, ~400K+ items, monthly updates)
   ↓ not found
Tier 3: Open Food Facts (crowdsourced with structure, 2.8M items)
   ↓ not found
Tier 4: FatSecret (verified, 2.3M items — free tier with attribution)
   ↓ not found
Tier 5: User-created entries (moderated, flagged for review)
```

Each food item carries a **data confidence score** (inspired by Cronometer's approach):
- **A (Verified):** USDA Foundation/SR Legacy or NCCDB — lab-analyzed, 70+ nutrients
- **B (Label):** USDA Branded or manufacturer-provided label data — 15-20 nutrients
- **C (Crowdsourced-Verified):** Open Food Facts or FatSecret with community validation
- **D (User-Submitted):** user-created, pending verification
- **U (Unverified):** imported from external source, not yet validated

Users see this score when logging food. "Chicken breast, raw" with an A badge vs "Joe's Diner Chicken Wrap" with a D badge — transparency builds trust and helps users understand why some foods have richer nutrient data.

---

## Part 2: Building the food database — schema and data architecture

### Core data model

The database needs to handle five distinct entity types with clear relationships:

**1. Foods (the atomic unit)**

A food is a single ingredient or branded product with a complete nutrient profile.

```
foods
├── id (UUID, PK)
├── fdc_id (int, nullable — USDA FoodData Central ID)
├── off_barcode (varchar, nullable — Open Food Facts barcode)
├── name (varchar, indexed)
├── brand (varchar, nullable — for branded/packaged items)
├── category (varchar — "protein", "vegetable", "grain", "dairy", "fruit", "fat", "snack", "frozen", "beverage", "condiment", "other")
├── subcategory (varchar, nullable — "poultry", "leafy green", "whole grain", etc.)
├── data_source (enum — "usda_foundation", "usda_branded", "usda_sr_legacy", "usda_fndds", "open_food_facts", "fatsecret", "user_created")
├── confidence_score (enum — "A", "B", "C", "D", "U")
├── serving_size (decimal)
├── serving_unit (varchar — "g", "ml", "oz", "cup", "tbsp", "piece", "slice", etc.)
├── serving_description (varchar — "1 medium banana", "1 cup cooked", "1 slice")
├── household_serving (varchar, nullable — "1 medium", "1/2 cup")
├── calories (decimal)
├── protein_g (decimal)
├── carbs_g (decimal)
├── fat_g (decimal)
├── fiber_g (decimal, nullable)
├── sugar_g (decimal, nullable)
├── saturated_fat_g (decimal, nullable)
├── trans_fat_g (decimal, nullable)
├── cholesterol_mg (decimal, nullable)
├── sodium_mg (decimal, nullable)
├── potassium_mg (decimal, nullable)
├── calcium_mg (decimal, nullable)
├── iron_mg (decimal, nullable)
├── vitamin_a_mcg (decimal, nullable)
├── vitamin_c_mg (decimal, nullable)
├── vitamin_d_mcg (decimal, nullable)
├── vitamin_b12_mcg (decimal, nullable)
├── magnesium_mg (decimal, nullable)
├── zinc_mg (decimal, nullable)
├── omega3_mg (decimal, nullable)
├── omega6_mg (decimal, nullable)
├── is_verified (bool, default false)
├── is_common (bool — frequently logged items get priority in search)
├── nova_group (int, nullable — 1-4 ultra-processing classification)
├── allergens (JSON, nullable — ["gluten", "dairy", "nuts", "soy", "eggs", "fish", "shellfish"])
├── dietary_flags (JSON — ["vegan", "vegetarian", "gluten_free", "dairy_free", "keto_friendly", "paleo", "halal", "kosher"])
├── brand_owner (varchar, nullable)
├── upc_code (varchar, nullable, indexed)
├── image_url (varchar, nullable)
├── last_synced_at (timestamp, nullable — for API-sourced items)
├── created_by_user_id (UUID, nullable — for user-created foods)
├── created_at (timestamp)
├── updated_at (timestamp)
```

**2. Alternative servings (multiple ways to measure the same food)**

```
food_servings
├── id (UUID, PK)
├── food_id (UUID, FK → foods)
├── serving_description (varchar — "1 cup", "100g", "1 medium", "1 tbsp")
├── serving_size_g (decimal — normalized to grams for calculation)
├── calories (decimal — pre-calculated for this serving)
├── protein_g (decimal)
├── carbs_g (decimal)
├── fat_g (decimal)
├── is_default (bool)
```

This is critical UX. MyFitnessPal frustrates users by only showing grams for some items. We need "1 medium banana (118g)", "1 cup sliced (150g)", "100g" all as options for the same food, with pre-calculated macros for each.

**3. Recipes (compound foods with preparation instructions)**

```
recipes
├── id (UUID, PK)
├── name (varchar)
├── description (text)
├── instructions (JSON — array of step strings)
├── prep_time_min (int)
├── cook_time_min (int)
├── total_time_min (int, computed)
├── servings (int)
├── difficulty (enum — "easy", "medium", "hard")
├── cuisine (varchar, nullable — "american", "mexican", "italian", "asian", "mediterranean", etc.)
├── meal_type (JSON — ["breakfast", "lunch", "dinner", "snack"])
├── dietary_tags (JSON — ["high_protein", "low_carb", "vegetarian", "vegan", "gluten_free", "dairy_free", "keto", "paleo", "budget_friendly", "meal_prep", "quick_30min"])
├── season_tags (JSON — ["spring", "summer", "fall", "winter", "year_round"])
├── goal_tags (JSON — ["fat_loss", "muscle_gain", "maintenance", "performance"])
├── calories_per_serving (decimal, computed from ingredients)
├── protein_per_serving (decimal, computed)
├── carbs_per_serving (decimal, computed)
├── fat_per_serving (decimal, computed)
├── fiber_per_serving (decimal, computed)
├── cost_per_serving_usd (decimal, nullable — for budget-conscious users)
├── source (enum — "curated", "user_created", "community", "imported")
├── source_url (varchar, nullable)
├── image_url (varchar, nullable)
├── is_favorite (bool, default false)
├── is_public (bool, default true)
├── user_id (UUID, nullable — for user-created recipes)
├── times_cooked (int, default 0)
├── average_rating (decimal, nullable)
├── created_at (timestamp)
├── updated_at (timestamp)
```

**4. Recipe ingredients (the join table with quantities)**

```
recipe_ingredients
├── id (UUID, PK)
├── recipe_id (UUID, FK → recipes)
├── food_id (UUID, FK → foods)
├── quantity (decimal — amount in the specified unit)
├── unit (varchar — "g", "oz", "cup", "tbsp", "tsp", "piece", "clove", etc.)
├── preparation (varchar, nullable — "diced", "minced", "sliced", "cooked", "raw")
├── is_optional (bool, default false)
├── notes (varchar, nullable — "or substitute almond milk")
├── display_order (int)
├── group_name (varchar, nullable — "For the sauce", "For the marinade")
```

**5. Meal plans and meal log (the user-facing tracking layer)**

```
meal_plans
├── id (UUID, PK)
├── user_id (UUID, FK)
├── name (varchar — "Week 1 Fat Loss", "Muscle Gain Plan")
├── start_date (date)
├── end_date (date)
├── goal (enum — "fat_loss", "maintenance", "muscle_gain")
├── target_calories (int)
├── target_protein_g (int)
├── target_carbs_g (int)
├── target_fat_g (int)
├── is_active (bool)
├── created_at (timestamp)
├── updated_at (timestamp)

meal_plan_days
├── id (UUID, PK)
├── meal_plan_id (UUID, FK → meal_plans)
├── day_number (int — 1-7 for weekly plans)
├── day_type (enum — "training", "rest", "light_activity")
├── notes (varchar, nullable)

meal_plan_entries
├── id (UUID, PK)
├── meal_plan_day_id (UUID, FK → meal_plan_days)
├── meal_slot (enum — "breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack")
├── recipe_id (UUID, nullable, FK → recipes)
├── food_id (UUID, nullable, FK → foods — for single-food entries)
├── serving_quantity (decimal)
├── serving_unit (varchar)
├── display_order (int)

food_log
├── id (UUID, PK)
├── user_id (UUID, FK)
├── date (date, indexed)
├── meal_slot (enum — same as above)
├── food_id (UUID, nullable, FK → foods)
├── recipe_id (UUID, nullable, FK → recipes)
├── serving_quantity (decimal)
├── serving_unit (varchar)
├── calories (decimal — snapshot at time of logging)
├── protein_g (decimal)
├── carbs_g (decimal)
├── fat_g (decimal)
├── logged_at (timestamp)
├── notes (varchar, nullable)
├── from_meal_plan (bool, default false)
```

### Food category taxonomy

A well-structured category system is essential for search, filtering, pantry management, and shopping list generation:

```
Level 1 (Store Aisle)     Level 2 (Subcategory)           Examples
─────────────────────     ────────────────────────         ─────────
Protein                   Poultry                          chicken breast, turkey
                          Red Meat                         beef, pork, lamb
                          Seafood                          salmon, tuna, shrimp, cod
                          Plant Protein                    tofu, tempeh, seitan
                          Eggs                             whole eggs, egg whites
                          Deli                             deli turkey, ham

Dairy                     Milk                             whole, 2%, skim, oat, almond
                          Yogurt                           Greek, regular, skyr
                          Cheese                           cheddar, mozzarella, cottage
                          Butter/Cream                     butter, heavy cream, sour cream

Grains & Starches         Rice                             white, brown, jasmine, basmati
                          Pasta                            spaghetti, penne, whole wheat
                          Bread                            white, wheat, sourdough, wraps
                          Cereal/Oats                      oatmeal, granola, cereal
                          Other Starches                   quinoa, couscous, potato

Fruits                    Fresh Fruits                     banana, apple, berries
                          Dried Fruits                     raisins, dates, cranberries
                          Frozen Fruits                    frozen berries, mango

Vegetables                Leafy Greens                     spinach, kale, lettuce
                          Cruciferous                      broccoli, cauliflower
                          Root Vegetables                  carrot, sweet potato, beet
                          Alliums                          onion, garlic, leek
                          Other Fresh                      bell pepper, tomato, cucumber
                          Frozen Vegetables                frozen broccoli, mixed veg

Fats & Oils               Cooking Oils                     olive, coconut, avocado
                          Nuts                             almonds, walnuts, cashews
                          Seeds                            chia, flax, sunflower
                          Nut Butters                      peanut butter, almond butter
                          Other Fats                       avocado, olives

Canned & Jarred           Canned Protein                   canned tuna, canned chicken
                          Canned Beans                     black beans, chickpeas
                          Canned Vegetables                diced tomatoes, corn
                          Sauces & Pastes                  tomato sauce, salsa, pesto

Frozen Prepared            Frozen Meals                     Lean Cuisine, Amy's, Healthy Choice
                          Frozen Protein                   frozen chicken, fish fillets
                          Frozen Sides                     frozen rice, frozen fries
                          Frozen Snacks                    frozen burritos, pizza

Snacks                    Protein Bars                     Quest, RXBAR, Kind
                          Chips & Crackers                 tortilla chips, rice cakes
                          Popcorn                          microwave, air-popped
                          Trail Mix                        mixed nuts, granola bars

Beverages                 Protein Shakes                   whey protein, plant protein
                          Juice                            orange, apple, cranberry
                          Coffee/Tea                       coffee, green tea
                          Sports Drinks                    electrolyte mixes, Gatorade

Condiments & Spices       Sauces                           soy sauce, hot sauce, ketchup
                          Dressings                        ranch, vinaigrette, tahini
                          Spices                           cumin, paprika, garlic powder
                          Sweeteners                       honey, maple syrup, stevia

Supplements               Protein Powder                   whey, casein, plant blend
                          Creatine                         monohydrate
                          Collagen                         hydrolyzed, gelatin
```

---

## Part 3: Seeding the database — what food data to include

### Tier 1: Core whole foods (~500 items)

These are the unprocessed and lightly processed foods that form the backbone of any nutrition plan. Source from USDA Foundation Foods and SR Legacy for maximum nutrient depth (70+ nutrients per item).

**Proteins (80+ items):**
- Chicken: breast (raw, cooked), thigh (bone-in, boneless, skin-on, skinless), drumstick, ground chicken
- Turkey: breast, ground (93/7, 85/15), deli turkey
- Beef: ground (96/4, 93/7, 85/15, 80/20), sirloin, ribeye, flank, chuck roast, beef jerky
- Pork: tenderloin, chop, loin, ground pork, bacon, ham
- Fish: salmon (Atlantic, wild, canned), tuna (yellowfin, canned in water/oil), cod, tilapia, shrimp, sardines
- Eggs: whole, whites, hard-boiled
- Plant: tofu (firm, silken, extra-firm), tempeh, edamame, seitan
- Dairy protein: Greek yogurt (plain nonfat, 2%, full-fat), cottage cheese (1%, 2%, 4%), skyr

**Carbohydrates/Grains (60+ items):**
- Rice: white long-grain, brown, jasmine, basmati, wild (all cooked and dry)
- Oats: rolled, steel-cut, instant (dry)
- Pasta: regular, whole wheat, chickpea/lentil (dry and cooked)
- Bread: white, whole wheat, sourdough, rye, English muffin, bagel, tortilla (flour, corn)
- Potatoes: russet, sweet, red (baked, boiled)
- Other: quinoa, couscous, bulgur, farro, barley

**Fruits (40+ items):**
- Fresh: banana, apple, orange, strawberry, blueberry, raspberry, grape, watermelon, mango, pineapple, peach, pear, kiwi, avocado, lemon, lime
- Dried: raisins, dates, cranberries, apricots
- Frozen: mixed berries, mango chunks, banana slices

**Vegetables (50+ items):**
- Leafy: spinach, kale, romaine, arugula, mixed greens
- Cruciferous: broccoli, cauliflower, Brussels sprouts, cabbage
- Root: carrot, sweet potato, beet, turnip, radish
- Allium: onion (yellow, red, white), garlic, shallot, leek, green onion
- Other: bell pepper (red, green, yellow), tomato, cucumber, zucchini, mushroom, celery, asparagus, green beans, corn, peas

**Fats/Oils (30+ items):**
- Oils: olive (extra virgin), coconut, avocado, canola, sesame
- Nuts: almonds, walnuts, cashews, pecans, peanuts, macadamia, pistachios
- Seeds: chia, flax, sunflower, pumpkin, hemp
- Butters: peanut butter (natural), almond butter, tahini
- Other: avocado, olives (black, green), coconut (shredded, cream)

**Dairy (25+ items):**
- Milk: whole, 2%, skim, oat, almond, soy, coconut
- Cheese: cheddar, mozzarella, parmesan, cream cheese, feta, Swiss
- Other: butter, heavy cream, sour cream, half-and-half

**Legumes (15+ items):**
- Black beans, kidney beans, pinto beans, chickpeas, lentils (green, red), split peas, navy beans, white beans

### Tier 2: Common branded and packaged foods (~1,000+ items)

Source from USDA Branded Foods database. These are the items users search for most frequently.

**Frozen meals (100+ items):**
- Lean Cuisine: Herb Roasted Chicken, Sweet & Spicy Korean Beef, Chicken Tikka Masala, Fettuccini Alfredo
- Healthy Choice: Power Bowls (Chicken Feta, Cuban, Korean), Simply Steamers
- Amy's Kitchen: Cheese Enchilada, Pad Thai, Burrito, Margherita Pizza
- Birds Eye: Protein Blends, Steamfresh vegetables
- Stouffer's: Lasagna, Mac & Cheese, Fit Kitchen meals
- Evol: Burritos, bowls
- Trader Joe's: frozen meals, cauliflower gnocchi, mandarin orange chicken
- Smart Ones, Banquet, Marie Callender's

**Protein bars (50+ items):**
- Quest: all flavors (Birthday Cake, Chocolate Chip Cookie Dough, etc.)
- RXBAR: all flavors
- Kind: Protein bars
- ONE bars
- Clif Builder's
- Pure Protein
- Barebells
- Think Thin
- Perfect Bar
- Kirkland Signature protein bars

**Breakfast items (40+ items):**
- Cereal: Cheerios, Special K, Frosted Flakes, Raisin Bran, granola varieties
- Frozen waffles: Eggo, Kodiak Cakes
- Oatmeal packets: Quaker, Kodiak Cakes
- Breakfast bars, Pop-Tarts, Jimmy Dean breakfast sandwiches

**Snacks (60+ items):**
- Chips: Lay's, Doritos, Tostitos, Kettle Brand, SunChips
- Crackers: Goldfish, Wheat Thins, Triscuit, Ritz
- Popcorn: SkinnyPop, Smartfood, Boom Chicka Pop
- Rice cakes, pretzels, trail mix varieties

**Condiments and sauces (30+ items):**
- Ketchup, mustard, mayo, ranch dressing, soy sauce, sriracha, hot sauce, barbecue sauce, salsa, hummus, pesto, marinara

**Beverages (30+ items):**
- Protein shakes: Premier Protein, Fairlife, Muscle Milk
- Sports drinks: Gatorade, Liquid IV, LMNT
- Energy drinks: Monster, Red Bull, Celsius (with calorie/caffeine data)

**Supplements (20+ items):**
- Whey protein: Optimum Nutrition Gold Standard, Dymatize ISO100, MyProtein
- Plant protein: Orgain, Vega, Garden of Life
- Creatine: monohydrate (Creapure)
- Collagen: Vital Proteins, Great Lakes

### Tier 3: Restaurant and fast-food items (~200+ items)

These are the hardest to get right. Source from Nutritionix (if budget allows) or build manually from chain restaurant published nutrition PDFs.

**Major chains (top items per chain):**
- Chipotle: burrito bowl components (rice, beans, chicken, steak, guacamole, etc.)
- Chick-fil-A: chicken sandwich, nuggets, grilled chicken, waffle fries
- Subway: 6" and footlong subs, common combos
- McDonald's: Big Mac, McChicken, Quarter Pounder, fries, Egg McMuffin
- Starbucks: coffee drinks by size, food items (egg bites, sandwiches)
- Panera: soups, sandwiches, salads
- Wendy's, Taco Bell, Panda Express, Five Guys

**Strategy:** Many major chains publish complete nutrition PDFs on their websites. These can be scraped/parsed once and updated quarterly. Link to the official source URL for each entry so users can verify.

### Tier 4: The long tail — user-contributed with moderation

For foods not in Tiers 1-3, allow user creation with a moderation pipeline:

1. User submits food with name, serving size, and macros (minimum: calories, protein, carbs, fat)
2. Entry is tagged `confidence_score: "D"` and visible only to the creator initially
3. If 3+ users log the same food (fuzzy name match), it enters a review queue
4. A periodic audit (manual or AI-assisted) promotes verified entries to `confidence_score: "C"`
5. User-submitted entries with a linked UPC code get cross-referenced against Open Food Facts for validation

---

## Part 4: Curated recipe database — structure and content

### Recipe categories and coverage

The initial recipe database should cover the most common meal prep and daily cooking scenarios. Based on our research reports (07, 21, 26), the recipes should be:

- **Macro-calculated:** every recipe has per-serving macros computed from ingredient food data
- **Goal-tagged:** fat loss, maintenance, muscle gain — with appropriate macro distributions
- **Prep-complexity-rated:** easy (< 15 min), medium (15-30 min), hard (30+ min)
- **Budget-tagged:** cost per serving when applicable
- **Season-tagged:** seasonal ingredients highlighted
- **Dietary-tagged:** high-protein, low-carb, vegetarian, vegan, gluten-free, dairy-free, keto, paleo

### Target recipe count by category

| Category | Count | Examples |
|---|---|---|
| **Breakfast** | 25+ | Overnight oats (5 variations), protein pancakes, egg muffins (3 var), smoothie bowls, breakfast burritos, Greek yogurt parfait, protein French toast |
| **Lunch** | 30+ | Chicken meal prep bowls (5 var), turkey wraps, quinoa salad, soup (5 var), tuna salad, chicken salad, grain bowls, Buddha bowls |
| **Dinner** | 35+ | Salmon + roasted veg, chicken stir fry (3 var), lean beef tacos, turkey chili, sheet pan chicken, baked cod, pasta (3 var), chicken breast plates |
| **Snacks** | 15+ | Protein balls (3 var), Greek yogurt parfait, trail mix, hummus plate, protein shake (3 var), cottage cheese combos, hard-boiled eggs |
| **Meal Prep Batches** | 10+ | Sunday batch cook (from report 26), slow cooker shredded chicken, sheet pan chicken thighs, turkey chili, egg muffin cups, overnight oats prep |
| **Sauces & Dressings** | 10+ | Spicy peanut, teriyaki glaze, Greek yogurt ranch, lemon-herb tahini, chimichurri (from report 26) |
| **Total** | **125+** | |

### Recipe data for goal alignment

Each recipe should map to one or more goal templates from research report 21:

**Fat loss recipes** (~1,800 cal/day template):
- High protein density (30-35% of calories from protein)
- High volume from vegetables (half the plate)
- Moderate carbs, especially around training
- Example: 6 oz baked cod + medium sweet potato + 1 cup steamed broccoli + 1/4 avocado = 520 cal, 41g protein

**Maintenance recipes** (~2,500 cal/day template):
- Balanced macros (30P/40C/30F)
- Standard portions
- Example: 6 oz grilled chicken + 1 cup brown rice + roasted vegetables + 1 tbsp olive oil = 700 cal, 62g protein

**Muscle gain recipes** (~3,000 cal/day template):
- Higher carb density (40-55% of calories)
- Liberal use of calorie-dense whole foods
- Example: 3 eggs scrambled + 1 cup oatmeal + banana + 2 slices toast + 1 cup milk = 775 cal, 41g protein

### Integration with hand-portion system

Every recipe should also express its portions in hand-portion units (from research report 07):
- "2 palms protein + 1 fist vegetables + 2 cupped hands carbs + 1 thumb fat"
- This dual representation (grams + hand portions) supports both precision trackers and flexible eaters

---

## Part 5: Meal planning algorithms

### Approach 1: Template-based meal planning (MVP)

The simplest and most reliable approach for v1:

1. User sets goal (fat loss / maintenance / muscle gain)
2. System calculates daily macro targets using Mifflin-St Jeor (from report 21)
3. Training days get +200-300 kcal (primarily from carbs)
4. System presents pre-built daily templates with slot-by-slot meals
5. User can swap any meal for alternatives that match similar macros

**Template structure:**
```
Day Template = {
  goal: "fat_loss",
  day_type: "training" | "rest",
  slots: [
    { slot: "breakfast", target_cal: 350-450, target_protein: 30+ },
    { slot: "morning_snack", target_cal: 150-200, target_protein: 10+ },
    { slot: "lunch", target_cal: 400-550, target_protein: 35+ },
    { slot: "afternoon_snack", target_cal: 150-250, target_protein: 10+ },
    { slot: "dinner", target_cal: 450-600, target_protein: 35+ },
    { slot: "evening_snack", target_cal: 150-200, target_protein: 15+ }
  ]
}
```

### Approach 2: Constraint-based optimization (v2)

Uses a knapsack-style algorithm to compose meals that satisfy multiple constraints simultaneously:

**Hard constraints (must satisfy):**
- Total daily calories within ±5% of target
- Total daily protein within ±10% of target
- No allergens from user's allergy list
- Respects dietary preferences (vegetarian, etc.)

**Soft constraints (optimize for):**
- Variety — minimize ingredient repetition across days
- Budget — prefer lower-cost recipes when user enables budget mode
- Freshness — prioritize recipes using soon-to-expire pantry items
- Seasonal — prefer in-season ingredients
- Prep complexity — match user's cooking skill/time budget
- Training day alignment — higher carbs on workout days

**Algorithm:**
```python
def generate_meal_plan(user, days=7):
    targets = calculate_daily_targets(user)  # Mifflin-St Jeor

    for day in range(days):
        day_type = get_day_type(user, day)  # training or rest
        day_targets = adjust_for_day_type(targets, day_type)

        # Greedy slot-filling with backtracking
        plan = {}
        remaining = day_targets.copy()

        for slot in MEAL_SLOTS:
            candidates = query_recipes(
                meal_type=slot,
                max_calories=remaining.calories * SLOT_PROPORTION[slot],
                dietary_filters=user.dietary_preferences,
                exclude_allergens=user.allergies,
                exclude_recent=get_recent_recipes(user, days=3)
            )

            # Rank by macro fit + variety + freshness score
            ranked = rank_candidates(candidates, remaining, user.pantry)
            plan[slot] = ranked[0]
            remaining -= plan[slot].macros

        # Verify daily totals within constraints
        if not validate_day(plan, day_targets):
            plan = backtrack_and_reoptimize(plan, day_targets)
```

### Approach 3: LLM-augmented planning (v3)

For the most personalized experience, use an LLM to generate novel meal suggestions:

- User describes preferences in natural language: "I'm tired of chicken, give me fish-based meals this week"
- LLM generates recipe suggestions constrained by macro targets and available pantry items
- Each LLM-generated recipe is validated against the food database for accurate macros
- User can accept, modify, or regenerate

**Important:** LLM-generated recipes should always be nutrition-validated against the food database. Never trust LLM calorie estimates directly — always compute from the ingredient food data.

---

## Part 6: Smart food search and logging UX

### Search architecture

The search experience is the #1 daily interaction for nutrition tracking. It must be fast, accurate, and surface the right result in the top 3.

**Search ranking algorithm:**
```
score = (
    text_match_score * 0.3 +          # fuzzy text matching
    confidence_score_weight * 0.2 +    # prefer verified foods
    frequency_score * 0.25 +           # user's personal frequency
    global_popularity_score * 0.15 +   # how often all users log this
    recency_score * 0.1               # recently logged items
)
```

**Key UX patterns:**
1. **Recent foods** — show the user's last 20 logged foods before they even type (80% of daily logging is repeat foods)
2. **Frequent foods** — "Your top foods" section with one-tap logging
3. **Fuzzy matching** — "chkn brst" should find "Chicken Breast, boneless skinless"
4. **Category tabs** — All | My Foods | Branded | Recipes | Recent
5. **Quick-add** — for when users just want to log "400 cal, 30g protein" without finding a specific food
6. **Meal copy** — "Copy yesterday's breakfast" for habitual eaters

### Serving size UX

One of MFP's most frustrating patterns is requiring users to do mental math to convert portions. Our approach:

- Default to the most common household serving ("1 medium banana", not "100g")
- Show a slider or stepper to adjust quantity (0.5x, 1x, 1.5x, 2x)
- Always show a secondary display of the gram weight
- Pre-calculate and display macros in real-time as quantity changes
- Support custom serving sizes ("I ate 157g" — system calculates proportional macros)

### Frozen food and preprocessed food handling

Frozen and preprocessed foods need special treatment because:

1. **Serving sizes vary wildly** — a "serving" of frozen pizza might be 1/4 of the pizza, but most people eat 1/2 or a whole one
2. **Preparation changes nutrition** — microwaved vs oven-baked can differ slightly
3. **Multi-component meals** — a frozen dinner has protein, starch, and vegetables all in one entry
4. **Brand matters** — "frozen chicken breast" could be anywhere from 100-200 cal per serving depending on brand and preparation

**Solution:**
- Store frozen meals as single food items (not recipes) with the label nutrition
- Include brand in the display name: "Lean Cuisine Herb Roasted Chicken"
- Show the label serving size prominently: "Serving: 1 meal (227g)"
- Allow quantity adjustment: "I ate 1.5 servings"
- Include NOVA classification to help health-conscious users understand processing level

---

## Part 7: What makes us better than MyFitnessPal

### Our advantages (the competitive wedge)

| Feature | MyFitnessPal | Our App |
|---|---|---|
| **Data quality** | 14M entries, many wrong/duplicate | Tiered verification with confidence scores |
| **Nutrient depth** | ~15 nutrients | Up to 150 nutrients (USDA Foundation) |
| **Transparency** | Green checkmark is misleading | Clear A/B/C/D confidence badges |
| **Search UX** | Returns too many duplicates | Deduplicated, ranked by relevance + confidence |
| **Recipes** | Basic (paywalled) | 125+ curated, goal-aligned, macro-calculated |
| **Meal planning** | Manual only | Smart plans adapted to goals + training days |
| **Hand portions** | Not supported | Full Precision Nutrition hand-portion system |
| **Budget awareness** | Not supported | Cost-per-serving data, budget meal plans |
| **Training integration** | Separate from nutrition | Auto-adjusts macros on training vs rest days |
| **Pantry awareness** | Not supported | Suggests meals from available ingredients |
| **Frozen/packaged foods** | User-submitted, often wrong | USDA Branded + Open Food Facts with monthly updates |
| **ADHD-friendly** | Overwhelming interface | 3-4 items per screen, progressive disclosure |
| **Micronutrients** | Locked behind paywall | Visible for all verified foods |
| **Privacy** | Sold to private equity, data concerns | Self-hosted data, no third-party sharing |

### MyFitnessPal's specific pain points we solve

1. **"I searched for banana and got 47 results"** — We deduplicate and show "Banana, medium (118g)" as the #1 result with USDA verification badge. Other forms (large, small, sliced) are accessible but don't clutter the default view.

2. **"The calories for this frozen meal are wrong"** — Our USDA Branded Foods integration pulls directly from manufacturer label data, updated monthly. We don't rely on random users typing in numbers.

3. **"I can't tell which entry is correct"** — Confidence scores make it immediately clear: A = lab-analyzed gold standard, B = label data, C = community-verified, D = user-submitted.

4. **"Premium features keep getting moved behind the paywall"** — Macro targets, micronutrient tracking, meal plans, and recipes are all available in our app without a subscription wall.

5. **"The app doesn't know I worked out today"** — Our training day detection automatically adjusts macro targets (+200-300 kcal from carbs) when a workout is logged.

6. **"I don't know what to eat to hit my macros"** — Recipe suggestions filtered by remaining macros: "You need 40g more protein today. Here are dinner options that fit."

7. **"I'm overwhelmed by all the options"** — ADHD-optimized: 3-4 curated suggestions per screen, progressive disclosure, never infinite scroll.

---

## Part 8: Data pipeline and sync strategy

### Initial data seeding

```
Phase 1: USDA Foundation Foods (~2,000 items)
  → Download CSV from fdc.nal.usda.gov
  → Parse into foods table with full nutrient profiles
  → Set confidence_score = "A", data_source = "usda_foundation"

Phase 2: USDA SR Legacy (~8,000 items)
  → Download CSV
  → Parse, deduplicate against Foundation Foods
  → Set confidence_score = "A", data_source = "usda_sr_legacy"

Phase 3: USDA Branded Foods (~400K+ items)
  → Download CSV (6-month release cycle)
  → Parse branded items with UPC codes
  → Set confidence_score = "B", data_source = "usda_branded"
  → Prioritize: frozen meals, protein bars, snacks, supplements, beverages

Phase 4: Open Food Facts (selective import)
  → Download database dump from Hugging Face
  → Import items with: US country tag + complete nutrition data + quality score > threshold
  → Cross-reference against USDA to avoid duplicates (match on UPC)
  → Set confidence_score = "C", data_source = "open_food_facts"

Phase 5: Curated recipes (125+ hand-crafted)
  → Link recipe ingredients to foods table by food_id
  → Auto-calculate per-serving macros from ingredient data
  → Tag with dietary, seasonal, goal, and cuisine metadata
```

### Ongoing sync strategy

- **USDA Branded Foods:** Monthly API poll for updated items (check `fdcId` and `publishedDate`)
- **Open Food Facts:** Quarterly re-import of US products with quality threshold
- **User-submitted foods:** Weekly review queue for entries with 3+ users
- **Recipe macros:** Recompute whenever a linked food's nutrition data changes

### Offline-first architecture

Since this is a daily-use app, the food database should work offline:

- **Local SQLite cache** of the user's most-used foods (top 500) + all bookmarked recipes
- **Full-text search index** built locally using SQLite FTS5
- **Background sync** when online: pull updates for cached foods, push user logs
- **Graceful degradation:** can log meals and view recipes fully offline; sync when reconnected

---

## Part 9: Implementation priorities

### Phase 1 (MVP — Session 31 scope)
- Seed foods.json with 500+ core whole foods (USDA Foundation + SR Legacy)
- Recipe model + 30+ curated recipes with full macros
- Basic food search with recent/frequent shortcuts
- Daily food logging with macro tracking
- BMR/TDEE auto-calculation → macro targets
- Training day adjustment
- Hand-portion guide with visuals

### Phase 2 (Extended database — near-term)
- Import USDA Branded Foods (frozen meals, bars, snacks, supplements)
- Import Open Food Facts (US branded products)
- Food confidence score badges in UI
- Recipe database expansion to 125+
- Meal plan templates (fat loss, maintenance, muscle gain)
- Shopping list generation from meal plans

### Phase 3 (Smart features — future)
- Pantry inventory system (Session 41)
- Constraint-based meal plan optimization
- "What can I make?" from pantry ingredients
- Ingredient substitution suggestions
- Meal copy and recurring meals
- Community recipe sharing

### Phase 4 (Advanced — long-term)
- LLM-powered natural language food logging ("I had a turkey sandwich with cheese")
- Photo-based meal logging (computer vision)
- Restaurant menu integration
- Grocery delivery API integration (Instacart, Walmart)
- FatSecret or Edamam API integration for international coverage
- Recipe nutrition validation pipeline

---

## Part 10: API cost analysis and recommendations

### Recommended stack (cost-optimized)

| Component | Source | Cost | Notes |
|---|---|---|---|
| **Core food data** | USDA FoodData Central | Free | Bulk download + API, 1K req/hr |
| **Branded/packaged** | USDA Branded Foods + Open Food Facts | Free | Monthly updates, 2.8M+ products combined |
| **Supplemental search** | FatSecret Platform API | Free (Premier Free) | 5K calls/day, US data, attribution required |
| **Recipe data** | Self-curated + community | Free | Start with 125+ curated, grow with community |
| **Nutrition analysis** | Self-calculated from food data | Free | Compute macros from ingredient * quantity |
| **Natural language parsing** | Future: Edamam or Nutritionix | $49-299/mo | Only when NLP logging is implemented |

**Total initial cost: $0/month** — entirely achievable using free, authoritative data sources.

The key insight is that USDA FoodData Central + Open Food Facts together cover the vast majority of foods users will search for, and both are completely free. Paid APIs (Nutritionix, Edamam) only become necessary for advanced features like natural language parsing or real-time restaurant menu data.

---

## Sources

- [USDA FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide/)
- [USDA FoodData Central Data Documentation](https://fdc.nal.usda.gov/data-documentation/)
- [USDA FoodData Central Downloads](https://fdc.nal.usda.gov/download-datasets/)
- [USDA Global Branded Food Products Database Documentation](https://fdc.nal.usda.gov/GBFPD_Documentation/)
- [Open Food Facts API Documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/)
- [Open Food Facts Data & Downloads](https://world.openfoodfacts.org/data)
- [Open Food Facts Dataset on Hugging Face](https://huggingface.co/datasets/openfoodfacts/product-database)
- [FatSecret Platform API](https://platform.fatsecret.com/platform-api)
- [FatSecret API Pricing](https://platform.fatsecret.com/api-editions)
- [Edamam Food Database API](https://developer.edamam.com/food-database-api)
- [Spoonacular API Docs](https://spoonacular.com/api/docs/grocery-products-api)
- [Nutritionix API](https://www.nutritionix.com/api)
- [Chomp Food API](https://chompthis.com/api/)
- [Top Nutrition APIs for App Developers in 2026](https://www.spikeapi.com/blog/top-nutrition-apis-for-developers-2026)
- [FoodOn Ontology](https://foodon.org/)
- [FoodKG Knowledge Graph](https://foodkg.github.io/whattomake.html)
- [Cronometer Data Sources](https://support.cronometer.com/hc/en-us/articles/360018239472-Data-Sources)
- [Cronometer Accurate Databases](https://cronometer.com/features/accurate-databases.html)
- [Cronometer Data Confidence Scores](https://support.cronometer.com/hc/en-us/articles/360042550452-Data-Confidence-Scores)
- [MyFitnessPal Food Database Accuracy](https://blog.myfitnesspal.com/how-food-database-works/)
- [MyFitnessPal Community: Incorrect Nutritional Values](https://community.myfitnesspal.com/en/discussion/10862172/there-is-so-much-items-in-the-database-with-incorrect-nutritional-values)
- [MyFitnessPal Review 2026 (Garage Gym Reviews)](https://www.garagegymreviews.com/myfitnesspal-review)
- [Why Are Calories Wrong on MyFitnessPal](https://nutri.it.com/why-are-the-calories-wrong-on-myfitnesspal)
- [OpenNutriTracker (GitHub)](https://github.com/simonoppowa/OpenNutriTracker)
- [PANTS Nutrition Tracker (GitHub)](https://github.com/dylanleigh/PriceAndNutritionTrackingSystem)
- [AI Nutrition Recommendation System (Frontiers)](https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1546107/full)
- [Reinforcement Learning Meal Planning (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10857145/)
- [Personalized Weekly Meal Recommendations (MDPI)](https://www.mdpi.com/2073-431X/13/1/1)
- [Food Recipe Ingredient Substitution Ontology (MDPI)](https://www.mdpi.com/1424-8220/22/3/1095)
- [FoodOn Harmonized Food Ontology (Nature)](https://www.nature.com/articles/s41538-018-0032-6)
- [Nutrola: Most Accurate Calorie Counting App](https://www.nutrola.app/en/blog/what-is-the-most-accurate-calorie-counting-app)
- [fooddatacentral Python Package (PyPI)](https://pypi.org/project/fooddatacentral/)
