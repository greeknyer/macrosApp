// Barcode lookup via the Open Food Facts API (mirrors food-scanner.html).
import type { FoodInput } from './foods';

export interface ScannedProduct {
  name: string;
  serving: string;
  protein: number;
  carbs: number;
  fat: number;
  found: boolean;
}

export async function lookupBarcode(code: string): Promise<ScannedProduct> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
  const data = await res.json();

  if (data.status !== 1 || !data.product) {
    return { name: `Product ${code}`, serving: '', protein: 0, carbs: 0, fat: 0, found: false };
  }

  const p = data.product;
  const n = p.nutriments || {};
  const num = (v: unknown) => {
    const x = typeof v === 'string' ? parseFloat(v) : (v as number);
    return isNaN(x as number) ? 0 : Math.round(((x as number) + Number.EPSILON) * 10) / 10;
  };

  return {
    name: p.product_name || p.product_name_en || 'Unknown Product',
    serving: p.serving_size || (p.serving_quantity ? `${p.serving_quantity}g` : '100g'),
    protein: num(n['proteins_serving'] ?? n['proteins_100g']),
    carbs: num(n['carbohydrates_serving'] ?? n['carbohydrates_100g']),
    fat: num(n['fat_serving'] ?? n['fat_100g']),
    found: true,
  };
}

export function scannedToFoodInput(s: ScannedProduct): FoodInput {
  return {
    name: s.name,
    weight_label: s.serving || '1 serving',
    category: 'mixed',
    protein: s.protein,
    carbs: s.carbs,
    fat: s.fat,
    meal_tags: [],
  };
}
