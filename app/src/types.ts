// Mirrors the Supabase `foods` table (Section 4 of the reference doc).
export type FoodCategory = 'protein' | 'carb' | 'fat' | 'mixed';

export type MealTag =
  | 'breakfast'
  | 'snack'
  | 'preworkout'
  | 'lunch'
  | 'dinner'
  | 'evening';

export interface FoodRow {
  id: string;
  name: string;
  weight_label: string | null;
  category: FoodCategory;
  protein: number;
  carbs: number;
  fat: number;
  meal_tags: string[] | null;
  created_at?: string;
  // Optional culinary attributes (added by the food-attributes migration).
  // When absent, deriveAttributes() infers them from category + name.
  form_role?: string | null; // overrides inferred role
  form?: string | null; // deli, grilled, grain, bread, wrap, potato, …
  temp?: string | null; // cold | hot | any
  seafood?: boolean | null;
  fat_type?: string | null; // oil | cheese | nut | spread | avocado | dressing
}

// A food normalized for the solver: macros as p/c/f, with scaling metadata.
export interface PlanItem {
  id?: string;
  name: string;
  weight: string | null;
  p: number;
  c: number;
  f: number;
  category?: FoodCategory;
  baseGrams: number | null;
  multiplier: number;
  baseWeight?: string | null;
  discrete?: boolean; // scales in whole/half servings, not by grams
  serving?: ServingRule | null; // parsed portioning from the label
  maxServingsOverride?: number; // per-slot cap on servings for this instance
}

export interface Macros {
  p: number;
  c: number;
  f: number;
}

// Discrete serving granularity parsed from a food's weight label (e.g. "2 slices"
// → countable in half-servings). Null when the food scales continuously by grams.
export interface ServingRule {
  step: number; // multiplier granularity (0.5 = half servings, 1 = whole)
  max: number; // default max servings (dish slots can override)
  unit: string; // singular display unit ("slice", "bagel", "patty")
  per: number; // units of `unit` in one serving
}

export interface Meal {
  title: string;
  time: string;
  items: PlanItem[];
  sub?: string | null;
  isWorkout?: boolean;
  isHydrationOnly?: boolean;
}

export type ScheduleType = 'pm' | 'am_early' | 'am_late' | 'rest';
export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

// Result of a full LP solve: the assembled day plus how close it landed.
export interface PlanResult {
  meals: Meal[];
  totals: Macros;
  targets: Macros;
  deviation: Macros; // signed: achieved − target, per macro
  withinTolerance: boolean; // all three macros within ±tolerance
  attempts: number; // template combos the solver tried
  usedProteins: string[]; // proteins in this plan (for anti-repeat memory)
  usedCarbs: string[]; // scalable carbs in this plan (for anti-repeat memory)
  usedFats: string[]; // fat sources in this plan (for anti-repeat memory)
}
