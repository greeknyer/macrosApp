import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, type DailyTargets, type UserSettings, type WeeklySchedule } from '../data/settings';
import { DEFAULT_FIXED_MEALS, type FixedMeals } from '../data/fixedMeals';
import { loadSettings, saveSettings } from '../lib/settingsStore';

interface SettingsState {
  settings: UserSettings;
  loading: boolean;
  updateFixedMeals: (next: FixedMeals) => void;
  updateTargets: (next: DailyTargets) => void;
  updateSchedule: (next: WeeklySchedule) => void;
  resetFixedMeals: () => void;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((next: UserSettings) => {
    setSettings(next);
    void saveSettings(next);
  }, []);

  const updateFixedMeals = useCallback(
    (next: FixedMeals) => persist({ ...settings, fixedMeals: next }),
    [persist, settings],
  );
  const updateTargets = useCallback(
    (next: DailyTargets) => persist({ ...settings, targets: next }),
    [persist, settings],
  );
  const updateSchedule = useCallback(
    (next: WeeklySchedule) => persist({ ...settings, schedule: next }),
    [persist, settings],
  );
  const resetFixedMeals = useCallback(
    () => persist({ ...settings, fixedMeals: DEFAULT_FIXED_MEALS }),
    [persist, settings],
  );

  const value = useMemo(
    () => ({ settings, loading, updateFixedMeals, updateTargets, updateSchedule, resetFixedMeals }),
    [settings, loading, updateFixedMeals, updateTargets, updateSchedule, resetFixedMeals],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
