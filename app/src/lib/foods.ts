// CRUD helpers for the Supabase `foods` table.
import { supabase } from './supabase';
import { STARTER_FOODS } from '../data/starterFoods';
import type { FoodRow } from '../types';

// Seed a new account with its own copy of the starter foods (user_id defaults to
// auth.uid() on insert). Called on first login when the account has no foods.
export async function seedStarterFoods(): Promise<void> {
  const { error } = await supabase.from('foods').insert(STARTER_FOODS);
  if (error) throw error;
}

export async function fetchFoods(): Promise<FoodRow[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FoodRow[];
}

export type FoodInput = Omit<FoodRow, 'id' | 'created_at'>;

// Attribute columns added by the food_attributes migration. If the migration
// hasn't been run yet, these columns don't exist — strip them and retry so basic
// food CRUD keeps working (attributes fall back to inference at runtime).
const ATTR_KEYS = ['form_role', 'form', 'temp', 'seafood', 'fat_type'] as const;

function stripAttrs<T extends object>(obj: T): T {
  const copy = { ...obj } as Record<string, unknown>;
  for (const k of ATTR_KEYS) delete copy[k];
  return copy as T;
}

function isMissingColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const m = (error.message || '').toLowerCase();
  return error.code === 'PGRST204' || m.includes('column') || m.includes('schema cache');
}

export async function insertFood(food: FoodInput): Promise<FoodRow> {
  let res = await supabase.from('foods').insert(food).select().single();
  if (res.error && isMissingColumn(res.error)) {
    res = await supabase.from('foods').insert(stripAttrs(food)).select().single();
  }
  if (res.error) throw res.error;
  return res.data as FoodRow;
}

export async function updateFood(id: string, patch: Partial<FoodInput>): Promise<FoodRow> {
  let res = await supabase.from('foods').update(patch).eq('id', id).select().single();
  if (res.error && isMissingColumn(res.error)) {
    res = await supabase.from('foods').update(stripAttrs(patch)).eq('id', id).select().single();
  }
  if (res.error) throw res.error;
  return res.data as FoodRow;
}

export async function deleteFood(id: string): Promise<void> {
  const { error } = await supabase.from('foods').delete().eq('id', id);
  if (error) throw error;
}
