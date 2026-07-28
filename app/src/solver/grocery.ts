// Weekly grocery list — aggregates a full week of generated plans into a
// shopping list. For each day we solve a plan (threading anti-repeat memory so
// the week has realistic variety), then tally every food by its natural unit:
// gram foods sum grams, countable foods sum servings ("slices", "bagels", …).
import type { FoodCategory, FoodRow, PlanItem } from '../types';
import { targetsForSchedule, type UserSettings } from '../data/settings';
import { DAY_ORDER } from '../data/templates';
import { generateMealPlan, type AvoidMemory } from './solver';

export type GroceryCategory = FoodCategory | 'other';

export interface GroceryEntry {
  name: string;
  category: GroceryCategory;
  grams: number; // accumulated grams (0 when the food is counted in units)
  units: number; // accumulated servings/units (0 when the food is weighed)
  unit: string | null; // display unit for `units` ("slice", "bagel", …)
  occurrences: number; // how many meals across the week include it
}

export interface GroceryList {
  entries: GroceryEntry[]; // flat list, sorted by category then name
  byCategory: { category: GroceryCategory; items: GroceryEntry[] }[];
  dayCount: number;
  itemCount: number;
}

const HYDRATION_NAME = 'Water / Electrolytes';

// Anti-repeat windows mirror PlanScreen so the week rotates through the roster.
const PROTEIN_WINDOW = 4;
const CARB_WINDOW = 3;
const FAT_WINDOW = 3;

const CATEGORY_ORDER: GroceryCategory[] = ['protein', 'carb', 'mixed', 'fat', 'other'];

function accumulate(map: Map<string, GroceryEntry>, item: PlanItem): void {
  if (!item.name || item.name === HYDRATION_NAME) return;
  const category = (item.category ?? 'other') as GroceryCategory;
  let e = map.get(item.name);
  if (!e) {
    e = { name: item.name, category, grams: 0, units: 0, unit: null, occurrences: 0 };
    map.set(item.name, e);
  }
  e.occurrences += 1;
  const mult = item.multiplier ?? 1;
  if (item.serving) {
    // Countable food (bagel, slice, patty, egg…) — tally in serving units.
    e.units += item.serving.per * mult;
    e.unit = item.serving.unit;
  } else if (item.baseGrams) {
    e.grams += item.baseGrams * mult;
  } else {
    // No weight and no unit (e.g. a pre-mixed side) — count servings.
    e.units += mult;
    e.unit = e.unit ?? 'serving';
  }
}

export function buildGroceryList(foods: FoodRow[], settings: UserSettings): GroceryList {
  const map = new Map<string, GroceryEntry>();
  const recent: AvoidMemory = { proteins: [], carbs: [], fats: [] };

  for (const day of DAY_ORDER) {
    const schedType = settings.schedule[day];
    const targets = targetsForSchedule(schedType, settings.targets);
    const plan = generateMealPlan(foods, day, targets, recent, settings.fixedMeals, schedType);
    recent.proteins = [...plan.usedProteins, ...recent.proteins].slice(0, PROTEIN_WINDOW);
    recent.carbs = [...plan.usedCarbs, ...recent.carbs].slice(0, CARB_WINDOW);
    recent.fats = [...plan.usedFats, ...recent.fats].slice(0, FAT_WINDOW);

    for (const meal of plan.meals) {
      if (meal.isHydrationOnly) continue;
      for (const item of meal.items) accumulate(map, item);
    }
  }

  const entries = [...map.values()].sort((a, b) => {
    const ci = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return ci !== 0 ? ci : a.name.localeCompare(b.name);
  });

  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: entries.filter((e) => e.category === category),
  })).filter((g) => g.items.length > 0);

  return { entries, byCategory, dayCount: DAY_ORDER.length, itemCount: entries.length };
}

// ── Display helpers ──
function fracStr(n: number): string {
  const whole = Math.floor(n + 1e-6);
  const isHalf = Math.abs(n - whole - 0.5) < 0.01;
  if (isHalf) return whole > 0 ? `${whole}½` : '½';
  return String(Math.round(n));
}
function pluralize(unit: string, n: number): string {
  if (n <= 1.0001) return unit;
  if (unit === 'patty') return 'patties';
  return unit.endsWith('s') ? unit : unit + 's';
}

// Round grams up to the nearest 10 g so the shopping quantity is buy-friendly.
export function formatQty(e: GroceryEntry): string {
  if (e.units > 0 && e.grams === 0) {
    const rounded = Math.round(e.units * 2) / 2; // nearest half-serving
    return `${fracStr(rounded)} ${pluralize(e.unit ?? 'serving', rounded)}`;
  }
  if (e.grams > 0) {
    const g = Math.ceil(e.grams / 10) * 10;
    return g >= 1000 ? `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1)} kg` : `${g} g`;
  }
  return `×${e.occurrences}`;
}
