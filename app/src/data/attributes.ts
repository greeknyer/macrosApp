// ── FOOD ATTRIBUTES: the data-driven "culinary knowledge" layer ──
//
// Meal compatibility is decided from food ATTRIBUTES, never hardcoded food
// names — so any user's foods slot into the right dishes with no code changes.
//
// Each food resolves to a `FoodAttributes` via `deriveAttributes()`:
//   1. explicit columns on the food row (set by the user in the Foods form), else
//   2. inference from category + name keywords (smart defaults for new foods).
//
// Example this fixes generically: "thin-sliced deli chicken" infers form=`deli`,
// temp=`cold`; the Grain Bowl dish only accepts hot-capable proteins, so deli
// chicken can never land on pasta — without naming either food in code.
import type { FoodRow, ServingRule } from '../types';

// Parse discrete portioning from a food's weight label — data-driven, so any
// food scales in real servings ("½ bagel", "1 tortilla") with no per-food code.
// Weight/volume units (g, oz, ml, tbsp, scoop, serving) scale continuously.
const HALF_UNITS = new Set(['bagel', 'slice', 'egg', 'cup', 'cake', 'bar', 'muffin', 'biscuit', 'waffle', 'pancake', 'link']);
const WHOLE_UNITS = new Set(['tortilla', 'wrap', 'patty', 'can', 'fillet', 'breast', 'bun', 'roll', 'piece', 'burger', 'ball', 'cookie']);

export function parseServing(label: string | null): ServingRule | null {
  if (!label) return null;
  const m = label.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (!m) return null;
  const per = parseFloat(m[1]);
  let unit = m[2].toLowerCase();
  if (unit.endsWith('s')) unit = unit.slice(0, -1); // singularize
  let step: number;
  if (HALF_UNITS.has(unit)) step = 0.5;
  else if (WHOLE_UNITS.has(unit)) step = 1;
  else return null; // grams/oz/ml/tbsp/scoop/serving → continuous
  return { step, max: unit === 'bagel' ? 1 : 2, unit, per };
}

export type FoodRole =
  | 'protein'
  | 'carb'
  | 'fat'
  | 'veg'
  | 'condiment'
  | 'dairy'
  | 'fruit'
  | 'other';

export type ProteinForm =
  | 'deli' // cold sliced lunch meat
  | 'grilled'
  | 'roast' // rotisserie / baked, served hot
  | 'canned_fish'
  | 'shellfish'
  | 'fatty_fish'
  | 'egg'
  | 'patty'
  | 'sausage'
  | 'powder'; // whey/protein powder — a shake ingredient, never a plate protein

export type CarbForm =
  | 'bread'
  | 'bagel'
  | 'wrap'
  | 'grain' // rice, quinoa, pasta
  | 'potato'
  | 'legume'
  | 'cereal' // oats, granola, pancakes
  | 'rice_cake';

export type FatType =
  | 'oil'
  | 'butter'
  | 'cheese_shredded' // melts — belongs on hot dishes
  | 'cheese_sliced' // deli slices — belongs on cold sandwiches
  | 'nut' // salad/bowl topping, not a dinner-plate fat
  | 'nut_butter'
  | 'sweet_spread'
  | 'mayo'
  | 'cream_cheese'
  | 'avocado'
  | 'dressing';
// Vegetables split by culinary role: a leafy SALAD base (plate side / salad) vs
// an AROMATIC (peppers, onions) that belongs cooked INTO a dish like fajitas —
// never standing in for a salad on a plate.
export type VegForm = 'salad' | 'aromatic';
export type Temp = 'cold' | 'hot' | 'any';
export type FoodForm = ProteinForm | CarbForm | VegForm;

// Which fats suit which dish STYLE (culinary accompaniment logic). A fat only
// appears in a dish whose style includes its type — e.g. cashews go on salads
// and bowls, never on a hot dinner plate; deli slices go on sandwiches, not
// fajitas; ketchup never touches a cold deli sandwich.
export const PLATE_FAT_TYPES = new Set<FatType>(['oil', 'butter', 'avocado', 'cheese_shredded']); // hot dinner
export const SALAD_FAT_TYPES = new Set<FatType>(['oil', 'dressing', 'avocado', 'nut', 'cheese_shredded', 'cheese_sliced']);
export const BOWL_FAT_TYPES = new Set<FatType>(['oil', 'avocado', 'cheese_shredded']); // nuts are a salad topping, not a hot-bowl fat
export const SANDWICH_FAT_TYPES = new Set<FatType>(['mayo', 'cheese_sliced', 'avocado']);
export const EGG_FAT_TYPES = new Set<FatType>(['oil', 'butter', 'cheese_shredded', 'avocado']);
export const ANY_CHEESE = new Set<FatType>(['cheese_shredded', 'cheese_sliced']);

export interface FoodAttributes {
  role: FoodRole;
  form: FoodForm | null;
  temp: Temp;
  seafood: boolean;
  fatType: FatType | null;
}

// Protein forms grouped by how they can be served.
export const SANDWICH_PROTEIN_FORMS = new Set<ProteinForm>([
  'deli',
  'canned_fish',
  'shellfish',
  'roast',
  'grilled',
]);
export const HOT_BOWL_PROTEIN_FORMS = new Set<ProteinForm>([
  'grilled',
  'roast',
  'shellfish',
  'fatty_fish',
  'patty',
]);

const has = (s: string, ...terms: string[]) => terms.some((t) => s.includes(t));

// Keyword inference — generic culinary defaults for any food.
function infer(food: FoodRow): FoodAttributes {
  const n = food.name.toLowerCase();
  const cat = food.category;

  // Fats / spreads / cheeses / oils (granular so savory vs sweet is distinct)
  if (has(n, 'olive oil') || (has(n, 'oil') && !has(n, 'boil'))) return fat('oil');
  if (has(n, 'butter') && !has(n, 'peanut', 'almond', 'nut butter')) return fat('butter');
  if (has(n, 'cream cheese')) return fat('cream_cheese');
  if (has(n, 'shredded', 'mozzarella', 'parmesan', 'grated'))
    return fat('cheese_shredded');
  if (has(n, 'ultra thin', 'thin cheese', 'sliced cheese', 'cheese slice', 'american', 'provolone', 'swiss') || (has(n, 'cheese') && has(n, 'slice', 'thin')))
    return fat('cheese_sliced');
  if (has(n, 'cheese', 'cheddar') && !has(n, 'cottage')) return fat('cheese_shredded');
  if (has(n, 'peanut butter', 'almond butter', 'nut butter')) return fat('nut_butter');
  if (has(n, 'nutella', 'hazelnut spread')) return fat('sweet_spread');
  if (has(n, 'mayo', 'mayonnaise')) return fat('mayo');
  if (has(n, 'cashew', 'almond', 'walnut', 'pecan') && !has(n, 'milk')) return fat('nut');
  if (has(n, 'avocado')) return fat('avocado');
  if (has(n, 'dressing', 'vinaigrette')) return fat('dressing');

  // Condiments
  if (has(n, 'ketchup', 'mustard', 'sriracha', 'hot sauce'))
    return attr('condiment', null, { temp: 'any' });

  // Proteins (before veg/fruit so "Pepper Chicken Burger" and "Apple Sausage"
  // classify as protein, not the pepper/apple in their names).
  if (cat === 'protein' || has(n, 'chicken', 'turkey', 'tuna', 'salmon', 'shrimp', 'beef', 'steak', 'egg', 'sausage', 'whey', 'burger')) {
    if (has(n, 'whey', 'isolate', 'protein powder', 'casein')) return protein('powder', 'any', false);
    if (has(n, 'sausage')) return protein('sausage', 'hot', false);
    if (has(n, 'egg')) return protein('egg', 'hot', false);
    if (has(n, 'burger', 'patty')) return protein('patty', 'hot', has(n, 'tuna', 'salmon', 'fish', 'crab'));
    if (has(n, 'shrimp', 'crab', 'lobster', 'scallop')) return protein('shellfish', 'any', true);
    if (has(n, 'salmon', 'mackerel', 'sardine')) return protein('fatty_fish', 'hot', true);
    if (has(n, 'tuna', 'albacore')) return protein('canned_fish', 'cold', true);
    if (has(n, 'sliced', 'deli', 'lunch meat')) return protein('deli', 'cold', false);
    if (has(n, 'grilled', 'mesquite')) return protein('grilled', 'hot', false);
    if (has(n, 'rotisserie', 'roast', 'baked')) return protein('roast', 'hot', false);
    return protein('grilled', 'hot', false); // default cooked protein
  }

  // Vegetables — aromatics (pepper/onion) are a cooking veg for fajita-style
  // bowls; everything else leafy is a salad base. Peppers checked first so
  // "Mini peppers" never fills a salad slot.
  if (has(n, 'pepper', 'onion', 'scallion', 'fajita')) return attr('veg', 'aromatic', { temp: 'any' });
  if (has(n, 'salad', 'cucumber', 'tomato', 'greens', 'spinach', 'lettuce', 'slaw', 'veggie', 'vegetable', 'broccoli', 'green bean', 'asparagus'))
    return attr('veg', 'salad', { temp: 'any' });

  // Fruit
  if (has(n, 'banana', 'blueberr', 'berry', 'apple', 'fruit'))
    return attr('fruit', null, { temp: 'cold' });

  // Dairy (non-cheese)
  if (has(n, 'yogurt', 'cottage cheese', 'milk')) return attr('dairy', null, { temp: 'cold' });

  // Carbs / starches / grains / breads
  if (has(n, 'bagel')) return carb('bagel');
  if (has(n, 'wrap', 'tortilla')) return carb('wrap');
  if (has(n, 'bread', 'toast', 'slice')) return carb('bread');
  if (has(n, 'rice cake')) return carb('rice_cake');
  if (has(n, 'rice')) return carb('grain');
  if (has(n, 'quinoa', 'pasta', 'noodle', 'couscous', 'angel hair')) return carb('grain');
  if (has(n, 'potato')) return carb('potato');
  if (has(n, 'bean', 'lentil', 'chickpea')) return carb('legume');
  if (has(n, 'oat', 'granola', 'cereal', 'pancake', 'cake')) return carb('cereal');

  // Category fallbacks
  if (cat === 'carb') return carb('grain');
  if (cat === 'fat') return fat('oil');
  return attr('other', null, { temp: 'any' });
}

// Small constructors keep the inference table terse.
function attr(role: FoodRole, form: FoodForm | null, opts: Partial<FoodAttributes> = {}): FoodAttributes {
  return { role, form, temp: 'any', seafood: false, fatType: null, ...opts };
}
function protein(form: ProteinForm, temp: Temp, seafood: boolean): FoodAttributes {
  return { role: 'protein', form, temp, seafood, fatType: null };
}
function carb(form: CarbForm): FoodAttributes {
  const temp: Temp = form === 'grain' || form === 'potato' || form === 'legume' ? 'hot' : 'any';
  return { role: 'carb', form, temp, seafood: false, fatType: null };
}
function fat(fatType: FatType): FoodAttributes {
  return { role: 'fat', form: null, temp: 'any', seafood: false, fatType };
}

// Resolve a food's attributes: explicit columns win, else inference.
export function deriveAttributes(food: FoodRow): FoodAttributes {
  const base = infer(food);
  return {
    role: (food.form_role as FoodRole) ?? base.role,
    form: (food.form as FoodForm) ?? base.form,
    temp: (food.temp as Temp) ?? base.temp,
    seafood: food.seafood ?? base.seafood,
    fatType: (food.fat_type as FatType) ?? base.fatType,
  };
}
