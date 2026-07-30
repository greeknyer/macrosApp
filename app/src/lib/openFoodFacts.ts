// Open Food Facts lookups: by barcode and by name. OFF is a global (EU-born)
// database, so the same endpoints cover the US and Greece — a `region` just
// biases name-search toward local products and their localized names.
import type { FoodInput } from './foods';

export type Region = 'global' | 'greece' | 'us';

export const REGIONS: Record<Region, { label: string; flag: string; tag: string | null; lang: string | null }> = {
  global: { label: 'Global', flag: '🌍', tag: null, lang: null },
  greece: { label: 'Greece', flag: '🇬🇷', tag: 'greece', lang: 'el' },
  us: { label: 'US', flag: '🇺🇸', tag: 'united-states', lang: 'en' },
};

export interface ScannedProduct {
  code: string;
  name: string;
  brand: string;
  serving: string;
  protein: number;
  carbs: number;
  fat: number;
  countries: string[]; // e.g. ['en:greece', 'en:france']
  found: boolean;
}

const num = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return isNaN(x as number) ? 0 : Math.round(((x as number) + Number.EPSILON) * 10) / 10;
};

// Prefer the region's localized name, then the generic/English name.
function nameOf(p: any, region: Region): string {
  const lang = REGIONS[region].lang;
  const localized = lang ? p?.[`product_name_${lang}`] : null;
  return (localized || p?.product_name || p?.product_name_en || '').trim();
}

function mapProduct(p: any, region: Region, code = ''): ScannedProduct {
  const n = p?.nutriments || {};
  return {
    code: p?.code || code,
    name: nameOf(p, region),
    brand: (p?.brands || '').split(',')[0]?.trim() || '',
    serving: p?.serving_size || (p?.serving_quantity ? `${p.serving_quantity}g` : '100g'),
    protein: num(n['proteins_serving'] ?? n['proteins_100g']),
    carbs: num(n['carbohydrates_serving'] ?? n['carbohydrates_100g']),
    fat: num(n['fat_serving'] ?? n['fat_100g']),
    countries: Array.isArray(p?.countries_tags) ? p.countries_tags : [],
    found: true,
  };
}

export function inRegion(p: ScannedProduct, region: Region): boolean {
  const tag = REGIONS[region].tag;
  return tag ? p.countries.includes(`en:${tag}`) : false;
}

export async function lookupBarcode(code: string, region: Region = 'global'): Promise<ScannedProduct> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    return { code, name: '', brand: '', serving: '', protein: 0, carbs: 0, fat: 0, countries: [], found: false };
  }
  return mapProduct(data.product, region, code);
}

const SEARCH_FIELDS =
  'code,product_name,product_name_en,product_name_el,brands,serving_size,serving_quantity,nutriments,countries_tags';

// Robust JSON fetch — OFF sometimes returns an HTML error page under load; treat
// that as an empty result instead of throwing a parse error.
async function fetchJson(url: string, signal?: AbortSignal): Promise<any | null> {
  const res = await fetch(url, { signal });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Free-text product search, biased toward the chosen region. Tries a
// country-filtered query first (best-effort), always falls back to a global
// query, then boosts region-local products to the top client-side.
export async function searchByName(
  query: string,
  opts: { signal?: AbortSignal; region?: Region } = {},
): Promise<ScannedProduct[]> {
  const region = opts.region ?? 'global';
  const tag = REGIONS[region].tag;
  const base =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=30&fields=${SEARCH_FIELDS}`;

  let data: any | null = null;
  if (tag) {
    data = await fetchJson(
      `${base}&tagtype_0=countries&tag_contains_0=contains&tag_0=${tag}`,
      opts.signal,
    );
  }
  // Fall back to an unfiltered search if the filtered one failed or was empty.
  if (!data || !Array.isArray(data.products) || data.products.length === 0) {
    data = await fetchJson(base, opts.signal);
  }
  const products: any[] = Array.isArray(data?.products) ? data.products : [];

  const mapped = products
    .map((p) => mapProduct(p, region))
    .filter((p) => p.name && (p.protein > 0 || p.carbs > 0 || p.fat > 0));

  // Boost region-local products to the top (stable) so Greek items lead in Greece.
  if (tag) {
    mapped.sort((a, b) => Number(inRegion(b, region)) - Number(inRegion(a, region)));
  }
  return mapped;
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
