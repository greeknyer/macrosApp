# Macro Bulking App — Claude Code Reference Document

**Version:** v14 prototype (HTML + Supabase)  
**Purpose:** Reference document for rebuilding this app as a commercial React Native mobile app using Claude Code.

---

## 1. Project Overview

A personal macro-tracking meal randomizer built for bulking. The app generates a full daily meal plan that hits exact macro targets (158g P / 158g C / 93g F / ~2,100 kcal). It randomizes lunch and dinner using meal templates while keeping snacks and breakfast fixed. The goal is to commercialize this as a mobile app.

---

## 2. Current Prototype Stack

| Layer | Current (Prototype) | Target (Commercial) |
|---|---|---|
| Frontend | Single HTML file | React Native + Expo |
| Backend/Solver | Client-side JavaScript | Node.js + Supabase Edge Functions + LP solver (glpk.js) |
| Database | Supabase (PostgreSQL) | Supabase (keep as-is) |
| Auth | Hardcoded admin password | Supabase Auth |
| Hosting | GitHub Pages (greeknyer/macrosApp) | Expo Go → App Store / Google Play |
| Code Repo | GitHub (greeknyer/macrosApp) | GitHub (same repo, new structure) |

---

## 3. Supabase Configuration

- **Supabase URL:** `https://epajylwwiulivycpppja.supabase.co`
- **RLS:** Enabled with public read/write policies on all tables
- **Anon key:** Currently stored in HTML — move to env variables in commercial version

---

## 4. Database Schema

### Table: `foods`

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Food name |
| weight_label | text | Serving size e.g. "170g" or "1 cup" |
| category | text | `protein` \| `carb` \| `fat` \| `mixed` |
| protein | numeric | Grams per serving |
| carbs | numeric | Grams per serving |
| fat | numeric | Grams per serving |
| meal_tags | text[] | Array: `breakfast`, `snack`, `preworkout`, `lunch`, `dinner`, `evening` |
| created_at | timestamptz | Auto-generated |

### Table: `meal_templates`
Exists in DB but no longer used by the app. Can be removed.

---

## 5. Daily Macro Targets

| Macro | Target | Priority |
|---|---|---|
| Protein | 158g | 1st |
| Carbs | 158g | 2nd |
| Fat | 93g | 3rd |
| Calories | ~2,100 kcal | Derived |

---

## 6. Daily Meal Structure

### Fixed Meals (never randomized)

| Meal | Foods | Notes |
|---|---|---|
| Breakfast | Quaker 1-Min Oats + Silk Almond Milk + Whey Isolate + Blueberries | Always locked |
| Snack 1 | Dannon Oikos Triple Zero Yogurt + PB | Always locked |
| Snack 2 | Yogurt + PB OR Rice Cake + PB + Nutella | Coin flip; never rice cake if pre-workout used it |
| Pre-Workout | Banana + PB OR Rice Cake + PB + Nutella | Coin flip |
| Evening | Empty slot | Optional — user fills manually |

### Randomized Meals (solver fills these)

| Meal | Built By |
|---|---|
| Lunch | Lunch template (random pick from 4 options) |
| Dinner | Dinner template (random pick from 3 options) |

---

## 7. Workout Schedules

| Day | Type | Workout Time |
|---|---|---|
| Monday | PM Trainer | 5:00 PM |
| Tuesday | PM Trainer | 5:00 PM |
| Wednesday | AM Early Solo | 4:30 AM |
| Thursday | AM Early Solo | 4:30 AM |
| Friday | AM Early Solo | 4:30 AM |
| Saturday | Rest Day | — |
| Sunday | AM Late Trainer | 9:30 AM |

Each schedule type reorders the meal slots — pre-workout meal moves to 4:00 AM on early days, 3:30 PM on PM days, etc.

---

## 8. Lunch Templates

### Template 1 — Sandwich
- **Bread:** Sola Bagel OR Sara Lee Delightful Wheat Bread
- **Protein:** sandwich-friendly only (see Section 12)
- **Cheese:** Great Value Par Skim Shredded Mozzarella OR Sargento Ultra Thin Cheese
- **Condiment:** Light Mayonnaise OR Heinz No Sugar Tomato Ketchup

### Template 2 — Wrap
- **Wrap:** XTREME Protein Plus Protein Fit Wraps
- **Protein:** sandwich-friendly only (see Section 12)
- **Cheese:** Great Value Par Skim Shredded Mozzarella OR Sargento Ultra Thin Cheese
- **Side:** Go Verden Avocado Cup OR Light Mayonnaise

### Template 3 — Salad Plate
- **Fixed:** House Salad
- **Protein:** any protein from DB
- **Side:** Great Value Par Skim Shredded Mozzarella OR Sargento Ultra Thin Cheese OR Go Verden Avocado Cup

### Template 4 — Egg Plate
- **Fixed protein:** Scrambled Eggs (2 Whole + 56g Whites)
- **Fixed:** Aidells Chicken & Apple Sausage
- **Bread (optional):** Sola Bagel OR Sara Lee Delightful Wheat Bread
- **Side:** Go Verden Avocado Cup

---

## 9. Dinner Templates

### Template 1 — Protein + Carb + Salad
- **Protein:** any protein from DB (scaled to hit protein target)
- **Starchy carb:** Brown Rice OR Little Duos Fresh Potatoes OR Simply Nature Quinoa OR Barilla Protein Pasta Angel Hair OR Black Beans (scaled to hit carb target)
- **Fixed:** House Salad
- **Fat:** Olive Oil or Butter OR Go Verden Avocado Cup (random pick)

### Template 2 — Burger Plate
- **Protein:** Members Mark Four Pepper Chicken Burger OR Safe Catch Tuna Burgers
- **Bread:** Sola Bagel OR Sara Lee Delightful Wheat Bread OR XTREME Protein Fit Wraps
- **Fixed:** House Salad
- **Fat:** Go Verden Avocado Cup OR Sargento Ultra Thin Cheese OR Great Value Par Skim Shredded Mozzarella

### Template 3 — Chicken Fajitas
- **Protein:** Grilled Chicken Breast OR Great Value Rotisserie Seasoned Chicken Breast OR Member's Mark Mesquite Grilled Chicken Fillets OR Great Value 99% Fat Free Thinly Sliced Rotisserie Chicken
- **Fixed:** XTREME Protein Plus Protein Fit Wraps + Mini Peppers
- **Fat:** Sargento Ultra Thin Cheese OR Great Value Par Skim Shredded Mozzarella

---

## 10. Solver Logic

### Current Approach (Prototype)
1. Sum all fixed meal macros (oatmeal + snack1 + snack2 + pre-workout)
2. Calculate remaining P/C/F needed for lunch + dinner
3. Build lunch — pick random template, add all fixed template items first, then scale protein to cover ~45% of remaining protein need
4. After lunch is built, calculate exactly what's left for dinner (remaining = total need minus what lunch provided)
5. Build dinner — add all fixed template items first, scale protein to cover remaining protein, scale starchy carb to cover remaining carbs
6. Assign meals to correct slots by matching slot title keywords

### Known Limitations
- Fat is consistently under by 10-20g — fixed snacks + templates don't provide enough fat sources
- User supplements fat gap with cashews and protein balls
- Requires multiple randomizes to occasionally hit all 3 macros simultaneously
- Protein and carb scaling capped at 0.5x–4x of base serving size

### Target Approach (Commercial)
- Linear programming solver (glpk.js or Google OR-Tools) running server-side in Supabase Edge Functions
- Solver receives all foods + targets and finds the optimal combination in one pass
- Meal templates enforced as hard constraints (not post-processing)
- Fat sources added as additional solver constraints to reliably hit 93g target
- Should hit all 3 macros within ±5g on every single randomize

---

## 11. Scalable Foods

These foods can be scaled — prototype uses 0.5x/1x/1.5x/2x, commercial version should use exact gram ratios:

| Category | Foods |
|---|---|
| All proteins | Any food with `category = 'protein'` |
| Starchy carbs | Brown Rice, Little Duos Fresh Potatoes, Simply Nature Quinoa, Barilla Protein Pasta Angel Hair, Black Beans |
| Bread/Wraps | Sola Bagel, Sara Lee Delightful Wheat Bread, XTREME Protein Plus Protein Fit Wraps |

---

## 12. Sandwich-Only Proteins

These proteins only appear when the lunch template includes bread or a wrap:

- Great Value Thinly Sliced Turkey
- Great Value 99% Fat Free Thinly Sliced Rotisserie Chicken
- Great Value Rotisserie Seasoned Chicken Breast
- Canned Tuna in Water
- Starkist Solid White Albacore Canned Tuna (Drained)
- Member's Mark Farm Raised Jumbo Cooked Shrimp
- Member's Mark Mesquite Grilled Chicken Fillets

---

## 13. Key Foods in DB (~45+ items)

- **Proteins:** Salmon, Grilled Chicken, Rotisserie Chicken, Mesquite Chicken Fillets, Turkey (sliced), Canned Tuna, Tuna Burgers, Four Pepper Chicken Burger, Shrimp, Scrambled Eggs, Aidells Chicken & Apple Sausage, Transparent Labs Whey Isolate, Cottage Cheese, Protein Balls
- **Starchy Carbs:** Brown Rice, Little Duos Fresh Potatoes, Simply Nature Quinoa, Barilla Protein Pasta Angel Hair, Black Beans, Power Cakes/Kodiak Pancakes, Sola Bagel, Sara Lee Delightful Wheat Bread, XTREME Protein Fit Wraps, Plain Rice Cake, Quaker 1-Minute Oats, Nature Valley Protein Granola
- **Fats:** Go Verden Avocado Cup, Olive Oil or Butter, Members Mark Creamy Peanut Butter, Nutella, Cashews, Great Value Par Skim Shredded Mozzarella, Sargento Ultra Thin Cheese, 1/3 Less Fat Cream Cheese, Light Mayonnaise
- **Mixed/Other:** Dannon Oikos Triple Zero Yogurt, Silk Unsweetened Almond Milk, Blueberries, Medium Banana, House Salad, Mini Peppers, Mini Cucumbers, Angel Sweet Mini Tomatoes, Heinz No Sugar Tomato Ketchup, G Hughes Dressing

---

## 14. Food Scanner

- **File:** `food-scanner.html` (deployed alongside `index.html` on GitHub Pages)
- Uses device camera + barcode scanning library
- Looks up food by barcode via Open Food Facts API
- Allows user to add scanned food directly to Supabase `foods` table
- Stable — no changes needed beyond wrapping in React Native for commercial version

---

## 15. Commercial App Build Priorities

1. React Native + Expo frontend
2. Supabase Auth (replace hardcoded admin password)
3. Supabase Edge Functions running a proper LP solver (glpk.js)
4. LP solver that reliably hits all 3 macros simultaneously on every randomize
5. Per-day macro targets (higher carbs on training days, lower on rest days)
6. Barcode scanner integrated into main app (not a separate page)
7. User onboarding — enter own macro targets, foods, and weekly schedule
8. Multi-user support (multi-tenant architecture)
9. Grocery list generation from weekly meal plan
10. Leftover planning (use dinner leftovers for next day lunch)
