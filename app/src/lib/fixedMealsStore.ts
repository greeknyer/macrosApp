// Persist the user's fixed meals on-device (AsyncStorage). This is the per-user
// seam: when auth lands, swap these two functions for a Supabase table keyed by
// user id — nothing else in the app changes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_FIXED_MEALS, type FixedMeals } from '../data/fixedMeals';

const KEY = 'fixed_meals_v1';

export async function loadFixedMeals(): Promise<FixedMeals> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_FIXED_MEALS;
    const parsed = JSON.parse(raw) as Partial<FixedMeals>;
    // Merge with defaults so a missing field never breaks the solver.
    return {
      breakfast: parsed.breakfast ?? DEFAULT_FIXED_MEALS.breakfast,
      snack1: parsed.snack1 ?? DEFAULT_FIXED_MEALS.snack1,
      preworkoutOptions: parsed.preworkoutOptions ?? DEFAULT_FIXED_MEALS.preworkoutOptions,
      snack2Options: parsed.snack2Options ?? DEFAULT_FIXED_MEALS.snack2Options,
    };
  } catch {
    return DEFAULT_FIXED_MEALS;
  }
}

export async function saveFixedMeals(meals: FixedMeals): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(meals));
}
