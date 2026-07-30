// Open Food Facts lookups: by barcode and by name. Powers the Add-Food screen.
import type { FoodInput } from './foods';

export interface ScannedProduct {
  code: string;
  name: string;
  brand: string;
  serving: string;
  protein: number;
  carbs: number;
  fat: number;
  found: boolean;
}

const num = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return isNaN(x as number) ? 0 : Math.round(((x as number) + Number.EPSILON) * 10) / 10;
};

// Prefer per-serving nutriments, fall back to per-100g.
function mapProduct(p: any, code = ''): ScannedProduct {
  const n = p?.nutriments || {};
  return {
    code: p?.code || code,
    name: p?.product_name || p?.product_name_en || '',
    brand: (p?.brands || '').split(',')[0]?.trim() || '',
    serving: p?.serving_size || (p?.serving_quantity ? `${p.serving_quantity}g` : '100g'),
    protein: num(n['proteins_serving'] ?? n['proteins_100g']),
    carbs: num(n['carbohydrates_serving'] ?? n['carbohydrates_100g']),
    fat: num(n['fat_serving'] ?? n['fat_100g']),
    found: true,
  };
}

export async function lookupBarcode(code: string): Promise<ScannedProduct> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    return { code, name: '', brand: '', serving: '', protein: 0, carbs: 0, fat: 0, found: false };
  }
  return mapProduct(data.product, code);
}

// Free-text product search. Returns the best-matched products that actually have
// nutrition data, so the user can pick one instead of typing a barcode.
export async function searchByName(query: string, signal?: AbortSignal): Promise<ScannedProduct[]> {
  const fields = 'code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments';
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=25&fields=${fields}`;
  const res = await fetch(url, { signal });
  const data = await res.json();
  const products: any[] = Array.isArray(data?.products) ? data.products : [];
  return products
    .map((p) => mapProduct(p))
    .filter((p) => p.name && (p.protein > 0 || p.carbs > 0 || p.fat > 0));
}

export function scannedToFoodInput(s: ScannedProduct): FoodInput {
  const name = [s.brand, s.name].filter(Boolean).join(' ').trim() || s.name || `Product ${s.code}`;
  return {
    name,
    weight_label: s.serving || '1 serving',
    category: 'mixed',
    protein: s.protein,
    carbs: s.carbs,
    fat: s.fat,
    meal_tags: [],
  };
}
