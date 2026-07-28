// Meal templates, schedules, and fixed-meal bundles (Sections 6–9 of the ref doc).
// Each meal template is a list of SLOTS. A slot either picks one food from a
// static `pick` list or draws a protein dynamically from the DB (`dynamic`).
// `scalable: true` slots become continuous variables in the LP solver; scalable
// slots are the "levers" it uses to hit the macro targets exactly. Food names
// must match the `name` column in the Supabase `foods` table.
import type { DayKey, ScheduleType } from '../types';

export const DEFAULT_TARGETS = { p: 158, c: 158, f: 93 };

// ±5 g per macro (Section 10 target).
export const TOLERANCE = 5;

// Scaling bounds applied to every scalable slot (multiples of one serving).
export const SCALE_MIN = 0.5;
export const SCALE_MAX = 5;

export type SlotRole = 'protein' | 'carb' | 'fat' | 'other';

export interface Slot {
  pick?: string[]; // choose one of these food names (quantity 1 before scaling)
  dynamic?: 'sandwichProtein' | 'anyProtein'; // pick a protein from the DB pool instead
  scalable: boolean;
  role: SlotRole;
  excludeSeafood?: boolean; // if true, this protein slot never draws a seafood item
  maxServings?: number; // per-slot cap overriding a discrete food's default max
}

export interface MealTemplate {
  name: string;
  slots: Slot[];
  weight?: number; // relative selection frequency (default 1)
}

// Scalable starchy carbs (Section 11) — shared by the starch lunch bowl and the
// protein+carb dinner so grains rotate across both meals.
export const STARCHY_CARBS = [
  'Brown Rice',
  'Little Duos fresh Potatoes',
  'Simply Nature QUINOA',
  'Barilla Protein Pasta Angel Hair',
  'Black Beans',
];

export const LUNCH_TEMPLATES: MealTemplate[] = [
  {
    // Grain bowl — puts potatoes/rice/quinoa/pasta at lunch; pairs with a light dinner.
    name: 'Power Bowl',
    weight: 2,
    slots: [
      { dynamic: 'anyProtein', scalable: true, role: 'protein' },
      { pick: STARCHY_CARBS, scalable: true, role: 'carb' },
      { pick: ['House Salad'], scalable: false, role: 'other' },
      { pick: ['Go Verden Avocado Cup', 'Olive Oil or Butter', 'Members Mark Unsalted Whole Cashews'], scalable: true, role: 'fat' },
    ],
  },
  {
    // Bagel/bread sandwich — seafood is kept out entirely (goes to salads/wraps).
    name: 'Sandwich',
    weight: 2,
    slots: [
      { pick: ['Sola Bagel', 'Sara Lee Delightful Wheat Bread'], scalable: true, role: 'carb', maxServings: 1 },
      { dynamic: 'sandwichProtein', scalable: true, role: 'protein', excludeSeafood: true },
      { pick: ['Great Value Par Skim Shredded Mozzarella', 'Sargento Ultra Thin Cheese'], scalable: true, role: 'fat' },
      { pick: ['Light Mayonnaise', 'Heinz No Sugar Tomato Ketchup'], scalable: false, role: 'other' },
    ],
  },
  {
    name: 'Wrap',
    weight: 1,
    slots: [
      { pick: ['XTREME Protein Plus Protein Fit Wraps'], scalable: true, role: 'carb', maxServings: 1 },
      { dynamic: 'sandwichProtein', scalable: true, role: 'protein' },
      { pick: ['Great Value Par Skim Shredded Mozzarella', 'Sargento Ultra Thin Cheese'], scalable: true, role: 'fat' },
      { pick: ['Go Verden Avocado Cup', 'Light Mayonnaise'], scalable: true, role: 'fat' },
    ],
  },
  {
    name: 'Salad Plate',
    weight: 2,
    slots: [
      { pick: ['House Salad'], scalable: false, role: 'other' },
      { dynamic: 'anyProtein', scalable: true, role: 'protein' },
      // Olive oil mixed into the salad (or cheese) — no avocado cup here.
      { pick: ['Olive Oil or Butter', 'Great Value Par Skim Shredded Mozzarella', 'Sargento Ultra Thin Cheese'], scalable: true, role: 'fat' },
    ],
  },
  {
    name: 'Egg Plate',
    weight: 2,
    slots: [
      { pick: ['Aidells Chicken & Apple Sausage'], scalable: false, role: 'other' },
      // Bagel, toast, or home-fry potatoes with the eggs.
      { pick: ['Sola Bagel', 'Sara Lee Delightful Wheat Bread', 'Little Duos fresh Potatoes'], scalable: true, role: 'carb', maxServings: 1 },
      { pick: ['Scrambled Eggs (2 Whole + 56g Whites)'], scalable: true, role: 'protein' },
      { pick: ['Go Verden Avocado Cup', 'Sargento Ultra Thin Cheese', 'Olive Oil or Butter'], scalable: true, role: 'fat' },
    ],
  },
];

export const DINNER_TEMPLATES: MealTemplate[] = [
  {
    name: 'Protein + Carb + Salad',
    weight: 2, // starch-based dinner
    slots: [
      { dynamic: 'anyProtein', scalable: true, role: 'protein' },
      { pick: STARCHY_CARBS, scalable: true, role: 'carb' },
      { pick: ['House Salad'], scalable: false, role: 'other' },
    ],
  },
  {
    // Light dinner — protein + salad + fats, no starch. Pairs with a carb-heavy
    // lunch (e.g. Power Bowl); the LP only picks it when the day's carbs are met.
    name: 'Protein & Salad',
    weight: 2,
    slots: [
      { dynamic: 'anyProtein', scalable: true, role: 'protein' },
      { pick: ['House Salad'], scalable: false, role: 'other' },
    ],
  },
  {
    // Burger bun: bagel, bread, or wrap — whichever fits the day's macros.
    name: 'Burger Plate',
    weight: 1,
    slots: [
      { pick: ['Members Mark Four Pepper Chicken Burger', 'Safe Catch Tuna Burgers'], scalable: true, role: 'protein' },
      { pick: ['Sola Bagel', 'Sara Lee Delightful Wheat Bread', 'XTREME Protein Plus Protein Fit Wraps'], scalable: true, role: 'carb', maxServings: 2 },
      { pick: ['House Salad'], scalable: false, role: 'other' },
    ],
  },
  {
    // Fajita-seasoned chicken + peppers served over rice/quinoa/pasta (not a wrap).
    name: 'Chicken Fajita Bowl',
    weight: 2,
    slots: [
      { pick: ['Grilled Chicken Breast', 'Great Value Rotisserie Seasoned Chicken Breast', "Member's Mark Mesquite Grilled Chicken Fillets", 'Great Value 99% Fat Free Thinly Sliced Rotisserie Chicken'], scalable: true, role: 'protein' },
      { pick: STARCHY_CARBS, scalable: true, role: 'carb' },
      { pick: ['Mini peppers'], scalable: false, role: 'other' },
    ],
  },
];

// Dinner always adds TWO distinct scalable fat sources from this pool so the
// solver can reliably reach the 93 g fat target (Section 10 known limitation).
export const DINNER_FAT_POOL: string[] = [
  'Olive Oil or Butter',
  'Go Verden Avocado Cup',
  'Sargento Ultra Thin Cheese',
  'Great Value Par Skim Shredded Mozzarella',
  'Members Mark Unsalted Whole Cashews',
  'G Hugues Dressing',
];
export const DINNER_FAT_COUNT = 2;

// Relative likelihood a fat source is chosen (default 1). Olive oil is preferred
// (drizzle the exact amount needed); the avocado cup is used sparingly.
export const FAT_WEIGHTS: Record<string, number> = {
  'Olive Oil or Butter': 3,
  'Go Verden Avocado Cup': 0.25,
};

// ── Meal-logic classifications ──
// Seafood proteins are never paired with cheese or ketchup, and never appear in
// the bagel/bread sandwich — only in salad plates or wraps (with mayo/avocado).
export const SEAFOOD_PROTEINS = new Set<string>([
  'Canned Tuna in Water',
  'Starkist Solid White Albacore Canned Tuna (Drained)',
  "Member's Mark Farm Raised Jumbo Cooked Shrimp",
  "Member's Mark Skinless and Boneless Atlantic Salmon",
  'Safe Catch Tuna Burgers',
]);

// Foods treated as "cheese" for pairing (excluded when the protein is seafood).
export const CHEESE_FOODS = new Set<string>([
  'Great Value Par Skim Shredded Mozzarella',
  'Sargento Ultra Thin Cheese',
  '1/3 Less Fat Fat Cream Cheese',
]);

// Ketchup — excluded when the protein is seafood.
export const KETCHUP_FOODS = new Set<string>(['Heinz No Sugar Tomato Ketchup']);

// Countable foods scale in discrete steps, not continuous multipliers — you
// don't weigh out 0.78 of a bagel or 3.12 tortillas. `step` is the serving
// granularity (of the DB serving), `max` the largest number of servings the
// solver may use, `unit`/`per` drive a realistic label ("2 slices", "1 bagel").
// Foods not listed here scale continuously by grams (chicken, rice, oil, etc.).
export interface DiscreteRule {
  step: number; // granularity as a fraction of one DB serving
  max: number; // most servings the solver may use
  unit: string; // display unit (singular)
  per: number; // units of `unit` in one DB serving
}
export const DISCRETE_FOODS: Record<string, DiscreteRule> = {
  'Sola Bagel': { step: 0.5, max: 1, unit: 'bagel', per: 1 }, // ½ or 1 bagel
  'Sara Lee Delightful Wheat Bread': { step: 0.5, max: 2, unit: 'slice', per: 2 }, // 1–4 slices
  'XTREME Protein Plus Protein Fit Wraps': { step: 1, max: 2, unit: 'tortilla', per: 1 },
  'Members Mark Four Pepper Chicken Burger': { step: 1, max: 2, unit: 'patty', per: 1 },
  'Safe Catch Tuna Burgers': { step: 1, max: 2, unit: 'patty', per: 1 },
  'Scrambled Eggs (2 Whole + 56g Whites)': { step: 0.5, max: 2, unit: 'egg', per: 2 },
  'Go Verden Avocado Cup': { step: 0.5, max: 2, unit: 'cup', per: 1 },
  'Sargento Ultra Thin Cheese': { step: 0.5, max: 2, unit: 'slice', per: 2 },
};

// Sandwich-friendly proteins (Section 12).
export const SANDWICH_PROTEINS: string[] = [
  'Great Value Thinly Sliced Turkey',
  'Great Value 99% Fat Free Thinly Sliced Rotisserie Chicken',
  'Great Value Rotisserie Seasoned Chicken Breast',
  'Canned Tuna in Water',
  'Starkist Solid White Albacore Canned Tuna (Drained)',
  "Member's Mark Farm Raised Jumbo Cooked Shrimp",
  "Member's Mark Mesquite Grilled Chicken Fillets",
];

// Fixed-meal bundles (Section 6) — never scaled, computed as constants.
export const OATMEAL_BUNDLE = [
  'Quaker 1-Minute Oats',
  'Silk Unsweetened Almond Milk',
  'Transparent Labs Whey Isolate',
  'Blueberries',
];
export const SNACK_YOGURT_PB = [
  'Dannon Oikos Triple Zero Yogurt',
  'Members Mark Creamy Peanut Butter',
];
export const SNACK_RICECAKE = [
  'Plain Rice Cake',
  'Members Mark Creamy Peanut Butter',
  'Nutella',
];
export const SNACK_PROTEIN_BALLS = ['simplyFUEL Chocolate Chip Cookie Dough Protein Balls'];
export const PREWO_BANANA = ['Medium Banana', 'Members Mark Creamy Peanut Butter'];

export interface ScheduleInfo {
  type: ScheduleType;
  desc: string;
}

export const SCHEDULES: Record<DayKey, ScheduleInfo> = {
  Mon: { type: 'pm', desc: '🏋️‍♂️ Training: 5:00 PM Trainer Session' },
  Tue: { type: 'pm', desc: '🏋️‍♂️ Training: 5:00 PM Trainer Session' },
  Wed: { type: 'am_early', desc: '⚡ Early Solo Workout: 4:30 AM' },
  Thu: { type: 'am_early', desc: '⚡ Early Solo Workout: 4:30 AM' },
  Fri: { type: 'am_early', desc: '⚡ Early Solo Workout: 4:30 AM' },
  Sat: { type: 'rest', desc: '😴 Rest Day: Steady Digestion Focus' },
  Sun: { type: 'am_late', desc: '🏋️‍♂️ Training: 9:30 AM Trainer Session' },
};

export const DAY_ORDER: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface SlotDef {
  title: string;
  time: string;
  isWorkout?: boolean;
  isHydrationOnly?: boolean;
}

export const SLOT_DEFS: Record<ScheduleType, SlotDef[]> = {
  pm: [
    { title: 'Meal 1: Breakfast', time: '6:30 AM' },
    { title: 'Meal 2: Mid-Morning Snack', time: '9:30 AM' },
    { title: 'Meal 3: Lunch', time: '12:30 PM' },
    { title: '⚡ Pre-Workout Fuel', time: '3:30 PM', isWorkout: true },
    { title: '🏋️ 5:00 PM Workout', time: '5:00 PM', isWorkout: true, isHydrationOnly: true },
    { title: 'Meal 5: Post-Workout Dinner', time: '6:30 PM', isWorkout: true },
    { title: 'Meal 6: Evening', time: '9:00 PM' },
  ],
  am_early: [
    { title: '⚡ Pre-Workout Fuel', time: '4:00 AM', isWorkout: true },
    { title: 'Meal 1: Post-Workout Breakfast', time: '6:30 AM' },
    { title: 'Meal 2: Mid-Morning Snack', time: '9:30 AM' },
    { title: 'Meal 3: Lunch', time: '12:30 PM' },
    { title: 'Meal 4: Afternoon Snack', time: '3:30 PM' },
    { title: 'Meal 5: Dinner', time: '6:30 PM' },
    { title: 'Meal 6: Evening', time: '9:00 PM' },
  ],
  am_late: [
    { title: 'Meal 1: Breakfast', time: '6:30 AM' },
    { title: 'Meal 2: Mid-Morning / Post-Workout', time: '9:30 AM' },
    { title: 'Meal 3: Lunch', time: '12:30 PM' },
    { title: 'Meal 4: Afternoon Snack', time: '3:30 PM' },
    { title: 'Meal 5: Dinner', time: '6:30 PM' },
    { title: 'Meal 6: Evening', time: '9:00 PM' },
  ],
  rest: [
    { title: 'Meal 1: Breakfast', time: '6:30 AM' },
    { title: 'Meal 2: Mid-Morning Snack', time: '9:30 AM' },
    { title: 'Meal 3: Lunch', time: '12:30 PM' },
    { title: 'Meal 4: Afternoon Snack', time: '3:30 PM' },
    { title: 'Meal 5: Dinner', time: '6:30 PM' },
    { title: 'Meal 6: Evening', time: '9:00 PM' },
  ],
};
