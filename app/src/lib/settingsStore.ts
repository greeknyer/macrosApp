// Load/save the per-user settings (fixed meals + daily targets) in the
// `fixed_meals` table's jsonb `data` column, RLS-scoped to the signed-in user.
import { supabase } from './supabase';
import { DEFAULT_SETTINGS, type UserSettings } from '../data/settings';
import { DEFAULT_FIXED_MEALS } from '../data/fixedMeals';
import { DEFAULT_DAILY_TARGETS } from '../data/settings';

export async function loadSettings(): Promise<UserSettings> {
  const { data, error } = await supabase.from('fixed_meals').select('data').maybeSingle();
  if (error || !data?.data) return DEFAULT_SETTINGS;
  const parsed = data.data as Partial<UserSettings> & { breakfast?: unknown };
  // Back-compat: an older row stored FixedMeals directly as `data`.
  const fixedMeals =
    parsed.fixedMeals ?? (parsed.breakfast ? (parsed as unknown as UserSettings['fixedMeals']) : DEFAULT_FIXED_MEALS);
  const targets = parsed.targets ?? DEFAULT_DAILY_TARGETS;
  return {
    fixedMeals: {
      breakfast: fixedMeals.breakfast ?? DEFAULT_FIXED_MEALS.breakfast,
      snack1: fixedMeals.snack1 ?? DEFAULT_FIXED_MEALS.snack1,
      preworkoutOptions: fixedMeals.preworkoutOptions ?? DEFAULT_FIXED_MEALS.preworkoutOptions,
      snack2Options: fixedMeals.snack2Options ?? DEFAULT_FIXED_MEALS.snack2Options,
    },
    targets: {
      training: targets.training ?? DEFAULT_DAILY_TARGETS.training,
      rest: targets.rest ?? DEFAULT_DAILY_TARGETS.rest,
    },
  };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return;
  await supabase
    .from('fixed_meals')
    .upsert({ user_id: userId, data: settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}
