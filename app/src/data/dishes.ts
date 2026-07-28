// ── DISHES: meal templates defined by ATTRIBUTE requirements, not food names ──
//
// Each slot says what KIND of food it accepts (via a `match` predicate over a
// food's attributes). The solver fills each slot from whatever foods in the
// user's DB qualify. Fats/cheeses/condiments are constrained to what actually
// belongs on each dish style (no cashews on pasta, no deli slices on a hot
// fajita, no ketchup on a cold sandwich).
import type { FoodAttributes, ProteinForm } from './attributes';
import {
  BOWL_FAT_TYPES,
  EGG_FAT_TYPES,
  HOT_BOWL_PROTEIN_FORMS,
  PLATE_FAT_TYPES,
  SALAD_FAT_TYPES,
  SANDWICH_PROTEIN_FORMS,
} from './attributes';

export type SlotRole = 'protein' | 'carb' | 'fat' | 'veg' | 'condiment';

export interface DishSlot {
  role: SlotRole;
  match: (a: FoodAttributes) => boolean;
  scalable: boolean;
  optional?: boolean;
  maxServings?: number;
}

export interface Dish {
  name: string;
  weight?: number;
  slots: DishSlot[];
  addFats?: number; // dinner adds N distinct plate fats so 93 g fat is reachable
}

// ── attribute matchers ──
const pForm = (a: FoodAttributes) => a.form as ProteinForm;
const isProtein = (a: FoodAttributes) => a.role === 'protein';

const sandwichProtein = (a: FoodAttributes) =>
  isProtein(a) && !a.seafood && SANDWICH_PROTEIN_FORMS.has(pForm(a));
const wrapProtein = (a: FoodAttributes) => isProtein(a) && SANDWICH_PROTEIN_FORMS.has(pForm(a));
const hotProtein = (a: FoodAttributes) => isProtein(a) && HOT_BOWL_PROTEIN_FORMS.has(pForm(a));
const grillRoastProtein = (a: FoodAttributes) =>
  isProtein(a) && (a.form === 'grilled' || a.form === 'roast');
const pattyProtein = (a: FoodAttributes) => isProtein(a) && a.form === 'patty';
const eggProtein = (a: FoodAttributes) => isProtein(a) && a.form === 'egg';
const sausage = (a: FoodAttributes) => isProtein(a) && a.form === 'sausage';
const mealProtein = (a: FoodAttributes) => isProtein(a) && a.form != null && a.form !== 'powder';

const isCarb = (a: FoodAttributes) => a.role === 'carb';
const breadOrBagel = (a: FoodAttributes) => isCarb(a) && (a.form === 'bread' || a.form === 'bagel');
const wrapCarb = (a: FoodAttributes) => isCarb(a) && a.form === 'wrap';
const bun = (a: FoodAttributes) => isCarb(a) && ['bread', 'bagel', 'wrap'].includes(a.form ?? '');
const grainish = (a: FoodAttributes) => isCarb(a) && ['grain', 'potato', 'legume'].includes(a.form ?? '');
const breadOrPotato = (a: FoodAttributes) => isCarb(a) && ['bread', 'bagel', 'potato'].includes(a.form ?? '');

const veg = (a: FoodAttributes) => a.role === 'veg';

const isFat = (a: FoodAttributes) => a.role === 'fat';
const slicedCheese = (a: FoodAttributes) => isFat(a) && a.fatType === 'cheese_sliced';
const anyCheese = (a: FoodAttributes) => isFat(a) && (a.fatType === 'cheese_sliced' || a.fatType === 'cheese_shredded');
const spread = (a: FoodAttributes) => isFat(a) && (a.fatType === 'mayo' || a.fatType === 'avocado');
const saladFat = (a: FoodAttributes) => isFat(a) && SALAD_FAT_TYPES.has((a.fatType ?? 'oil') as never);
const bowlFat = (a: FoodAttributes) => isFat(a) && BOWL_FAT_TYPES.has((a.fatType ?? 'oil') as never);
const eggFat = (a: FoodAttributes) => isFat(a) && EGG_FAT_TYPES.has((a.fatType ?? 'oil') as never);
export const plateFat = (a: FoodAttributes) => isFat(a) && PLATE_FAT_TYPES.has((a.fatType ?? 'oil') as never);
// Ketchup/hot sauce, or mayo — for burgers and eggs (never a cold deli sandwich).
const condiment = (a: FoodAttributes) => a.role === 'condiment' || (isFat(a) && a.fatType === 'mayo');

export const LUNCH_DISHES: Dish[] = [
  {
    name: 'Sandwich', // cold — sliced cheese + mayo, no seafood, no ketchup
    weight: 2,
    slots: [
      { role: 'carb', match: breadOrBagel, scalable: true, maxServings: 1 },
      { role: 'protein', match: sandwichProtein, scalable: true },
      { role: 'fat', match: slicedCheese, scalable: true, optional: true },
      { role: 'fat', match: spread, scalable: true, optional: true },
    ],
  },
  {
    name: 'Wrap',
    weight: 1,
    slots: [
      { role: 'carb', match: wrapCarb, scalable: true, maxServings: 1 },
      { role: 'protein', match: wrapProtein, scalable: true },
      { role: 'fat', match: anyCheese, scalable: true, optional: true },
      { role: 'fat', match: spread, scalable: true, optional: true },
    ],
  },
  {
    name: 'Salad Plate',
    weight: 2,
    slots: [
      { role: 'veg', match: veg, scalable: false },
      { role: 'protein', match: mealProtein, scalable: true },
      { role: 'fat', match: saladFat, scalable: true, optional: true },
    ],
  },
  {
    name: 'Egg Plate',
    weight: 2,
    slots: [
      { role: 'protein', match: eggProtein, scalable: true },
      { role: 'protein', match: sausage, scalable: false, optional: true },
      { role: 'carb', match: breadOrPotato, scalable: true, maxServings: 1 },
      { role: 'fat', match: eggFat, scalable: true, optional: true },
      { role: 'condiment', match: condiment, scalable: false, optional: true },
    ],
  },
  {
    name: 'Power Bowl', // hot grain bowl — deli/cold proteins excluded
    weight: 2,
    slots: [
      { role: 'protein', match: hotProtein, scalable: true },
      { role: 'carb', match: grainish, scalable: true },
      { role: 'veg', match: veg, scalable: false },
      { role: 'fat', match: bowlFat, scalable: true, optional: true },
    ],
  },
];

export const DINNER_DISHES: Dish[] = [
  {
    name: 'Protein + Carb + Salad',
    weight: 2,
    addFats: 2,
    slots: [
      { role: 'protein', match: hotProtein, scalable: true },
      { role: 'carb', match: grainish, scalable: true },
      { role: 'veg', match: veg, scalable: false },
    ],
  },
  {
    name: 'Protein & Salad', // light dinner — pairs with a carb-heavy lunch
    weight: 2,
    addFats: 2,
    slots: [
      { role: 'protein', match: hotProtein, scalable: true },
      { role: 'veg', match: veg, scalable: false },
    ],
  },
  {
    name: 'Burger Plate',
    weight: 1,
    addFats: 2,
    slots: [
      { role: 'protein', match: pattyProtein, scalable: true },
      { role: 'carb', match: bun, scalable: true, maxServings: 2 },
      { role: 'veg', match: veg, scalable: false },
      { role: 'condiment', match: condiment, scalable: false, optional: true },
    ],
  },
  {
    name: 'Chicken Fajita Bowl', // over rice/quinoa, melted (shredded) cheese
    weight: 2,
    addFats: 2,
    slots: [
      { role: 'protein', match: grillRoastProtein, scalable: true },
      { role: 'carb', match: grainish, scalable: true },
      { role: 'veg', match: veg, scalable: false },
    ],
  },
];

// Fat sources preferred/avoided (olive oil favored; avocado sparingly).
export const FAT_TYPE_WEIGHTS: Partial<Record<string, number>> = {
  oil: 3,
  avocado: 0.25,
};
