// ── FIXED MEALS: the user's locked, non-randomized meals ──
//
// Breakfast, the two snacks, and pre-workout are personal LOCKED recipes, not
// compatibility logic — so they're deliberately named food choices, unlike the
// attribute-driven lunch/dinner dishes. This object is the per-user seam: a
// multi-tenant build loads a user's saved FixedMeals from the DB instead of the
// default below (see solver `generateMealPlan`, which takes an optional config).
export interface FixedMeals {
  breakfast: string[]; // always eaten
  snack1: string[]; // mid-morning, always
  // Options are coin-flipped each plan. `riceCakeMarker`, if present in an
  // option, means it uses the rice-cake combo (can't appear in both pre-workout
  // and snack 2 on the same day).
  preworkoutOptions: string[][];
  snack2Options: string[][];
}

export const RICE_CAKE_MARKER = 'Plain Rice Cake';

export const DEFAULT_FIXED_MEALS: FixedMeals = {
  breakfast: [
    'Quaker 1-Minute Oats',
    'Silk Unsweetened Almond Milk',
    'Transparent Labs Whey Isolate',
    'Blueberries',
  ],
  snack1: ['Dannon Oikos Triple Zero Yogurt', 'Members Mark Creamy Peanut Butter'],
  preworkoutOptions: [
    ['Medium Banana', 'Members Mark Creamy Peanut Butter'],
    ['Plain Rice Cake', 'Members Mark Creamy Peanut Butter', 'Nutella'],
  ],
  snack2Options: [
    ['Dannon Oikos Triple Zero Yogurt', 'Members Mark Creamy Peanut Butter'],
    ['simplyFUEL Chocolate Chip Cookie Dough Protein Balls'],
    ['Plain Rice Cake', 'Members Mark Creamy Peanut Butter', 'Nutella'],
  ],
};
