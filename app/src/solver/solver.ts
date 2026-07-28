// Macro meal-plan solver — attribute-driven dishes + mixed-integer LP.
//
// Meal composition is DATA-DRIVEN: dishes (src/data/dishes.ts) declare what
// ATTRIBUTES each slot accepts, and the solver fills them from whatever foods in
// the user's DB qualify (attributes resolved by src/data/attributes.ts). No food
// names are hardcoded in the meal logic, so it generalizes to any user's foods.
//
// Pipeline: subtract fixed meals → pick dishes for lunch/dinner (variety +
// anti-repeat + pairing rules) → MILP scales each slot to hit remaining macros
// (gram foods continuous, countable foods in whole/half servings) → retry a few
// dish combos, keep the best within ±5 g. Runs on javascript-lp-solver (pure JS,
// Hermes-safe).
import solver from 'javascript-lp-solver';
import type { DayKey, FoodRow, Macros, Meal, PlanItem, PlanResult, ScheduleType } from '../types';
import { deriveAttributes, parseServing, type FoodAttributes } from '../data/attributes';
import {
  DINNER_DISHES,
  FAT_TYPE_WEIGHTS,
  LUNCH_DISHES,
  plateFat,
  type Dish,
  type DishSlot,
} from '../data/dishes';
import { SCALE_MAX, SCALE_MIN, SCHEDULES, SLOT_DEFS, TOLERANCE } from '../data/templates';
import { DEFAULT_FIXED_MEALS, RICE_CAKE_MARKER, type FixedMeals } from '../data/fixedMeals';

const MAX_ATTEMPTS = 40;
const DINNER_FAT_COUNT = 2;

export interface AvoidMemory {
  proteins: string[];
  carbs: string[];
  fats: string[];
}

// ── UTILS ──
const r1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function getRandom<T>(arr: T[]): T | null {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sumMacros(items: { p?: number; c?: number; f?: number }[]): Macros {
  return items.reduce<Macros>(
    (a, i) => ({ p: a.p + (+i.p! || 0), c: a.c + (+i.c! || 0), f: a.f + (+i.f! || 0) }),
    { p: 0, c: 0, f: 0 },
  );
}
export function calcKcal(m: Macros): number {
  return Math.round(m.p * 4 + m.c * 4 + m.f * 9);
}
function extractGrams(label: string | null): number | null {
  const m = (label || '').match(/(\d+(?:\.\d+)?)\s*g/);
  return m ? parseFloat(m[1]) : null;
}
function fracStr(n: number): string {
  const whole = Math.floor(n + 1e-6);
  const isHalf = Math.abs(n - whole - 0.5) < 0.01;
  if (isHalf) return whole > 0 ? `${whole}½` : '½';
  return String(Math.round(n));
}
const pluralize = (unit: string, n: number): string => {
  if (n <= 1.0001) return unit;
  if (unit === 'patty') return 'patties';
  return unit.endsWith('s') ? unit : unit + 's';
};

// Weighted random pick from items using a per-item weight function.
function weightedPick<T>(items: T[], weight: (t: T) => number): T | null {
  if (!items.length) return null;
  const total = items.reduce((s, it) => s + weight(it), 0);
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= weight(it);
    if (roll < 0) return it;
  }
  return items[items.length - 1];
}
function weightedPickDistinct<T>(items: T[], n: number, weight: (t: T) => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const pick = weightedPick(pool, weight);
    if (pick == null) break;
    out.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}
function pickDish(dishes: Dish[]): Dish {
  const total = dishes.reduce((s, d) => s + (d.weight ?? 1), 0);
  let roll = Math.random() * total;
  for (const d of dishes) {
    roll -= d.weight ?? 1;
    if (roll < 0) return d;
  }
  return dishes[dishes.length - 1];
}

// ── FOOD HELPERS (scoped to a food DB, attributes cached) ──
function makeHelpers(foodDB: FoodRow[], avoid: AvoidMemory) {
  const attrCache = new Map<FoodRow, FoodAttributes>();
  const attrOf = (f: FoodRow): FoodAttributes => {
    let a = attrCache.get(f);
    if (!a) {
      a = deriveAttributes(f);
      attrCache.set(f, a);
    }
    return a;
  };

  const toItem = (f: FoodRow): PlanItem => ({
    id: f.id,
    name: f.name,
    weight: f.weight_label,
    p: +f.protein,
    c: +f.carbs,
    f: +f.fat,
    category: f.category,
    baseGrams: extractGrams(f.weight_label),
    multiplier: 1,
    serving: parseServing(f.weight_label),
    discrete: !!parseServing(f.weight_label),
  });

  const getFood = (name: string): PlanItem | null => {
    const f = foodDB.find((x) => x.name === name);
    return f ? toItem(f) : null;
  };
  const getFoods = (names: string[]): PlanItem[] =>
    names.map(getFood).filter((x): x is PlanItem => x !== null);

  const poolFor = (match: (a: FoodAttributes) => boolean): FoodRow[] =>
    foodDB.filter((f) => match(attrOf(f)));

  const fatWeight = (f: FoodRow) => FAT_TYPE_WEIGHTS[attrOf(f).fatType ?? 'oil'] ?? 1;

  return { attrOf, toItem, getFood, getFoods, poolFor, fatWeight };
}
type Helpers = ReturnType<typeof makeHelpers>;

interface Entry {
  item: PlanItem;
  scalable: boolean;
  role: DishSlot['role'];
  maxServings?: number;
}
interface BuiltMeal {
  name: string;
  entries: Entry[];
  proteinName: string | null;
  carbName: string | null;
  fatNames: string[];
}

// Build a dish by filling each slot from attribute-matched foods. The primary
// protein is resolved first so pairing rules (seafood → no cheese/ketchup) can
// filter the remaining slots. Returns null if a required slot has no candidate.
function buildDish(
  h: Helpers,
  dish: Dish,
  avoid: AvoidMemory,
  excludeProteins: string[],
): BuiltMeal | null {
  const protIdx = dish.slots.findIndex((s) => s.role === 'protein');
  const used = new Set<string>();

  const softFilter = (rows: FoodRow[], avoidNames: string[]) => {
    const kept = rows.filter((f) => !avoidNames.includes(f.name) && !used.has(f.name));
    const fresh = kept.filter((f) => !avoidNames.includes(f.name));
    return fresh.length ? fresh : kept.length ? kept : rows.filter((f) => !used.has(f.name));
  };

  // 1. Primary protein (captures seafood flag for pairing rules).
  let proteinItem: PlanItem | null = null;
  let seafood = false;
  if (protIdx >= 0) {
    const pool = softFilter(h.poolFor(dish.slots[protIdx].match), [...excludeProteins, ...avoid.proteins]);
    const raw = getRandom(shuffle(pool));
    if (!raw) return null; // required protein unavailable → dish infeasible
    proteinItem = h.toItem(raw);
    seafood = h.attrOf(raw).seafood;
    used.add(raw.name);
  }

  // 2. Remaining slots.
  const entries: Entry[] = [];
  for (let i = 0; i < dish.slots.length; i++) {
    const slot = dish.slots[i];
    let item: PlanItem | null = null;
    if (i === protIdx) {
      item = proteinItem;
    } else {
      let pool = h.poolFor(slot.match);
      // Pairing rules: seafood forbids cheese fats and ketchup condiments.
      if (seafood) {
        pool = pool.filter((f) => {
          const a = h.attrOf(f);
          if (a.fatType === 'cheese_shredded' || a.fatType === 'cheese_sliced') return false;
          if (a.role === 'condiment') return false; // ketchup out; mayo is fatType mayo
          return true;
        });
      }
      if (slot.role === 'carb') pool = softFilter(pool, avoid.carbs);
      else if (slot.role === 'fat') pool = softFilter(pool, avoid.fats);
      else pool = pool.filter((f) => !used.has(f.name));

      const raw = slot.role === 'fat' ? weightedPick(pool, h.fatWeight) : getRandom(pool);
      item = raw ? h.toItem(raw) : null;
      if (item) used.add(item.name);
    }
    if (!item) {
      if (slot.optional) continue;
      return null; // required slot empty → infeasible
    }
    if (slot.maxServings != null) item.maxServingsOverride = slot.maxServings;
    entries.push({ item, scalable: slot.scalable, role: slot.role, maxServings: slot.maxServings });
  }

  // 3. Dinner adds N distinct savory fats so 93 g fat is reachable.
  if (dish.addFats) {
    let fatPool = h.poolFor(plateFat).filter((f) => !used.has(f.name));
    if (seafood)
      fatPool = fatPool.filter((f) => {
        const ft = h.attrOf(f).fatType;
        return ft !== 'cheese_shredded' && ft !== 'cheese_sliced';
      });
    const fresh = fatPool.filter((f) => !avoid.fats.includes(f.name));
    if (fresh.length >= dish.addFats) fatPool = fresh;
    for (const raw of weightedPickDistinct(fatPool, dish.addFats, h.fatWeight)) {
      entries.push({ item: h.toItem(raw), scalable: true, role: 'fat' });
      used.add(raw.name);
    }
  }

  return {
    name: dish.name,
    entries,
    proteinName: proteinItem?.name ?? null,
    carbName: entries.find((e) => e.role === 'carb')?.item.name ?? null,
    fatNames: entries.filter((e) => e.role === 'fat').map((e) => e.item.name),
  };
}

// ── SCALING ──
function scaleItem(item: PlanItem, mult: number): PlanItem {
  const rule = item.serving;
  let weight = item.weight;
  if (rule) {
    const servings = rule.per * mult;
    weight = `${fracStr(servings)} ${pluralize(rule.unit, servings)}`;
  } else if (item.baseGrams) {
    weight = `${Math.round(item.baseGrams * mult)}g`;
  }
  return {
    ...item,
    p: r1(item.p * mult),
    c: r1(item.c * mult),
    f: r1(item.f * mult),
    weight,
    multiplier: round2(mult),
    baseWeight: item.weight,
  };
}

// MILP: fixedConst + Σ mult_i·base_i ≈ R, minimizing weighted deviation.
function solveLP(scalable: PlanItem[], fixedConst: Macros, R: Macros): number[] {
  const W: Macros = { p: 1000, c: 100, f: 30 }; // priority protein > carbs > fat
  const PORT = 0.02;
  const constraints: Record<string, { min?: number; max?: number; equal?: number }> = {
    macro_p: { equal: round2(R.p - fixedConst.p) },
    macro_c: { equal: round2(R.c - fixedConst.c) },
    macro_f: { equal: round2(R.f - fixedConst.f) },
  };
  const variables: Record<string, Record<string, number>> = {};
  const ints: Record<string, number> = {};
  const steps: number[] = [];

  scalable.forEach((it, i) => {
    const rule = it.serving;
    const step = rule?.step ?? 0;
    steps.push(step);
    const key = 'x' + i;
    if (step > 0) {
      const maxServings = it.maxServingsOverride ?? rule?.max ?? SCALE_MAX;
      const minC = Math.max(1, Math.round(SCALE_MIN / step));
      const maxC = Math.max(minC, Math.round(maxServings / step));
      variables[key] = { macro_p: it.p * step, macro_c: it.c * step, macro_f: it.f * step, ['b' + i]: 1, cost: PORT * step };
      constraints['b' + i] = { min: minC, max: maxC };
      ints[key] = 1;
    } else {
      variables[key] = { macro_p: it.p, macro_c: it.c, macro_f: it.f, ['b' + i]: 1, cost: PORT };
      constraints['b' + i] = { min: SCALE_MIN, max: SCALE_MAX };
    }
  });
  (['p', 'c', 'f'] as const).forEach((m) => {
    variables['o_' + m] = { ['macro_' + m]: -1, cost: W[m] };
    variables['u_' + m] = { ['macro_' + m]: 1, cost: W[m] };
  });

  const sol = solver.Solve({ optimize: 'cost', opType: 'min' as const, constraints, variables, ints });
  return scalable.map((_, i) => {
    const v = sol['x' + i];
    const raw = typeof v === 'number' && v > 0 ? v : steps[i] > 0 ? Math.round(SCALE_MIN / steps[i]) : SCALE_MIN;
    return steps[i] > 0 ? raw * steps[i] : raw;
  });
}

// ── MAIN ──
export function generateMealPlan(
  foodDB: FoodRow[],
  dayKey: DayKey,
  targets: Macros,
  avoid: AvoidMemory = { proteins: [], carbs: [], fats: [] },
  fixed: FixedMeals = DEFAULT_FIXED_MEALS,
  scheduleType?: ScheduleType,
): PlanResult {
  const h = makeHelpers(foodDB, avoid);
  const schedType: ScheduleType = scheduleType ?? SCHEDULES[dayKey].type;
  const slots = SLOT_DEFS[schedType];

  // Fixed meals from the user's config. Rice cake can't be in both pre-workout
  // and snack 2 on the same day (Section 6).
  const oatmealItems = h.getFoods(fixed.breakfast);
  const snack1Items = h.getFoods(fixed.snack1);
  const preWo = getRandom(fixed.preworkoutOptions) ?? [];
  const preWoItems = h.getFoods(preWo);
  const preHasRiceCake = preWo.includes(RICE_CAKE_MARKER);
  const snack2Pool = fixed.snack2Options.filter((opt) => !(preHasRiceCake && opt.includes(RICE_CAKE_MARKER)));
  const snack2Items = h.getFoods(getRandom(snack2Pool.length ? snack2Pool : fixed.snack2Options)!);

  const fixedM = sumMacros([...oatmealItems, ...snack1Items, ...snack2Items, ...preWoItems]);
  const R: Macros = {
    p: Math.max(0, targets.p - fixedM.p),
    c: Math.max(0, targets.c - fixedM.c),
    f: Math.max(0, targets.f - fixedM.f),
  };

  interface Best {
    lunchName: string;
    dinnerName: string;
    lunchItems: PlanItem[];
    dinnerItems: PlanItem[];
    total: Macros;
    dev: Macros;
    absDev: number;
    usedProteins: string[];
    usedCarbs: string[];
    usedFats: string[];
  }
  let best: Best | null = null;
  let attempts = 0;

  for (let k = 0; k < MAX_ATTEMPTS; k++) {
    attempts++;
    const lunch = buildDish(h, pickDish(LUNCH_DISHES), avoid, []);
    if (!lunch) continue;
    const dinner = buildDish(h, pickDish(DINNER_DISHES), avoid, lunch.proteinName ? [lunch.proteinName] : []);
    if (!dinner) continue;

    const allEntries = [...lunch.entries, ...dinner.entries];
    const scalable = allEntries.filter((e) => e.scalable).map((e) => e.item);
    const fixedConst = sumMacros(allEntries.filter((e) => !e.scalable).map((e) => e.item));
    const mult = solveLP(scalable, fixedConst, R);

    let idx = 0;
    const apply = (entries: Entry[]) => entries.map((e) => (e.scalable ? scaleItem(e.item, mult[idx++]) : e.item));
    const lunchItems = apply(lunch.entries);
    const dinnerItems = apply(dinner.entries);

    const total = sumMacros([...oatmealItems, ...snack1Items, ...snack2Items, ...preWoItems, ...lunchItems, ...dinnerItems]);
    const dev: Macros = { p: total.p - targets.p, c: total.c - targets.c, f: total.f - targets.f };
    const absDev = Math.abs(dev.p) + Math.abs(dev.c) + Math.abs(dev.f);

    if (!best || absDev < best.absDev) {
      best = {
        lunchName: lunch.name,
        dinnerName: dinner.name,
        lunchItems,
        dinnerItems,
        total,
        dev,
        absDev,
        usedProteins: [lunch.proteinName, dinner.proteinName].filter((x): x is string => !!x),
        usedCarbs: [lunch.carbName, dinner.carbName].filter((x): x is string => !!x),
        usedFats: Array.from(new Set([...lunch.fatNames, ...dinner.fatNames])),
      };
    }
    if (Math.abs(dev.p) <= TOLERANCE && Math.abs(dev.c) <= TOLERANCE && Math.abs(dev.f) <= TOLERANCE) break;
  }

  // Fallback: if no dish combo was feasible (tiny/odd DB), return fixed meals only.
  if (!best) {
    const meals = assembleMeals(slots, { oatmealItems, snack1Items, snack2Items, preWoItems }, {
      lunchName: '—', dinnerName: '—', lunchItems: [], dinnerItems: [],
    });
    return { meals, totals: fixedM, targets, deviation: { p: r1(fixedM.p - targets.p), c: r1(fixedM.c - targets.c), f: r1(fixedM.f - targets.f) }, withinTolerance: false, attempts, usedProteins: [], usedCarbs: [], usedFats: [] };
  }

  const meals = assembleMeals(slots, { oatmealItems, snack1Items, snack2Items, preWoItems }, best);
  const withinTolerance =
    Math.abs(best.dev.p) <= TOLERANCE && Math.abs(best.dev.c) <= TOLERANCE && Math.abs(best.dev.f) <= TOLERANCE;

  return {
    meals,
    totals: best.total,
    targets,
    deviation: { p: r1(best.dev.p), c: r1(best.dev.c), f: r1(best.dev.f) },
    withinTolerance,
    attempts,
    usedProteins: best.usedProteins,
    usedCarbs: best.usedCarbs,
    usedFats: best.usedFats,
  };
}

function assembleMeals(
  slots: (typeof SLOT_DEFS)[ScheduleType],
  fixed: { oatmealItems: PlanItem[]; snack1Items: PlanItem[]; snack2Items: PlanItem[]; preWoItems: PlanItem[] },
  chosen: { lunchName: string; dinnerName: string; lunchItems: PlanItem[]; dinnerItems: PlanItem[] },
): Meal[] {
  const nonHydro = slots.filter((s) => !s.isHydrationOnly);
  const slotTitles = nonHydro.map((s) => s.title);
  const findIdx = (keywords: string[]) => slotTitles.findIndex((t) => keywords.some((k) => t.toLowerCase().includes(k)));

  const bfIdx = findIdx(['breakfast', 'post-workout breakfast']);
  const snack1Idx = findIdx(['mid-morning']);
  const lunchIdx = findIdx(['lunch']);
  const preWoIdx = findIdx(['pre-workout fuel']);
  const dinnerIdx = findIdx(['dinner']);
  const snack2Idx = findIdx(['afternoon snack']);
  const eveningIdx = findIdx(['evening']);

  const assignments: PlanItem[][] = nonHydro.map(() => []);
  if (bfIdx >= 0) assignments[bfIdx] = fixed.oatmealItems;
  if (snack1Idx >= 0) assignments[snack1Idx] = fixed.snack1Items;
  if (lunchIdx >= 0) assignments[lunchIdx] = chosen.lunchItems;
  if (preWoIdx >= 0) assignments[preWoIdx] = fixed.preWoItems;
  if (snack2Idx >= 0) assignments[snack2Idx] = fixed.snack2Items;
  if (dinnerIdx >= 0) assignments[dinnerIdx] = chosen.dinnerItems;
  if (eveningIdx >= 0) assignments[eveningIdx] = [];

  const meals: Meal[] = [];
  let ai = 0;
  for (const slot of slots) {
    if (slot.isHydrationOnly) {
      meals.push({ ...slot, items: [{ name: 'Water / Electrolytes', weight: '700ml+', p: 0, c: 0, f: 0, baseGrams: null, multiplier: 1 }] });
      continue;
    }
    meals.push({
      ...slot,
      items: assignments[ai] || [],
      sub: ai === lunchIdx ? chosen.lunchName : ai === dinnerIdx ? chosen.dinnerName : null,
    });
    ai++;
  }
  return meals;
}
