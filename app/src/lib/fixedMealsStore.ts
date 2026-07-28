// Persist the user's fixed meals in the per-user `fixed_meals` Supabase table
// (RLS scopes rows to the signed-in user). Falls back to the defaults when the
// account has no row yet.
import { supabase } from './supabase';
import { DEFAULT_FIXED_MEALS, type FixedMeals } from '../data/fixedMeals';

export async function loadFixedMeals(): Promise<FixedMeals> {
  const { data, error } = await supabase.from('fixed_meals').select('data').maybeSingle();
  if (error || !data?.data) return DEFAULT_FIXED_MEALS;
  const parsed = data.data as Partial<FixedMeals>;
  // Merge with defaults so a missing field never breaks the solver.
  return {
    breakfast: parsed.breakfast ?? DEFAULT_FIXED_MEALS.breakfast,
    snack1: parsed.snack1 ?? DEFAULT_FIXED_MEALS.snack1,
    preworkoutOptions: parsed.preworkoutOptions ?? DEFAULT_FIXED_MEALS.preworkoutOptions,
    snack2Options: parsed.snack2Options ?? DEFAULT_FIXED_MEALS.snack2Options,
  };
}

export async function saveFixedMeals(meals: FixedMeals): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return; // not signed in
  await supabase
    .from('fixed_meals')
    .upsert({ user_id: userId, data: meals, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}
