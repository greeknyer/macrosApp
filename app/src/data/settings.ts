// Per-user settings persisted in the `fixed_meals` table's jsonb column: the
// fixed meals plus per-day macro targets. One settings row per user.
import type { DayKey, Macros, ScheduleType } from '../types';
import { DEFAULT_FIXED_MEALS, type FixedMeals } from './fixedMeals';
import { DEFAULT_SCHEDULE } from './templates';

// The user's workout type for each day — drives meal-slot timing and which
// target profile (training vs rest) applies.
export type WeeklySchedule = Record<DayKey, ScheduleType>;

// Two target profiles: training days vs the rest day (higher carbs when lifting,
// lower on rest). Protein/fat held steady by default; all editable.
export interface DailyTargets {
  training: Macros;
  rest: Macros;
}

export const DEFAULT_DAILY_TARGETS: DailyTargets = {
  training: { p: 158, c: 158, f: 93 },
  // Lower carbs on rest day. ~130 g is the practical floor given the fixed meals
  // + salads, so 140 g is set as a reliably-hittable default; edit in Setup.
  rest: { p: 158, c: 140, f: 93 },
};

// Rest schedule uses the rest profile; all training schedules use training.
export function targetsForSchedule(type: ScheduleType, t: DailyTargets): Macros {
  return type === 'rest' ? t.rest : t.training;
}

export interface UserSettings {
  fixedMeals: FixedMeals;
  targets: DailyTargets;
  schedule: WeeklySchedule;
}

export const DEFAULT_SETTINGS: UserSettings = {
  fixedMeals: DEFAULT_FIXED_MEALS,
  targets: DEFAULT_DAILY_TARGETS,
  schedule: DEFAULT_SCHEDULE,
};
