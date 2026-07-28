import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_FIXED_MEALS, type FixedMeals } from '../data/fixedMeals';
import { loadFixedMeals, saveFixedMeals } from '../lib/fixedMealsStore';

interface FixedMealsState {
  fixedMeals: FixedMeals;
  loading: boolean;
  update: (next: FixedMeals) => void; // persists and updates state
  resetToDefault: () => void;
}

const FixedMealsContext = createContext<FixedMealsState | undefined>(undefined);

export function FixedMealsProvider({ children }: { children: React.ReactNode }) {
  const [fixedMeals, setFixedMeals] = useState<FixedMeals>(DEFAULT_FIXED_MEALS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFixedMeals()
      .then(setFixedMeals)
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback((next: FixedMeals) => {
    setFixedMeals(next);
    void saveFixedMeals(next);
  }, []);

  const resetToDefault = useCallback(() => update(DEFAULT_FIXED_MEALS), [update]);

  const value = useMemo(
    () => ({ fixedMeals, loading, update, resetToDefault }),
    [fixedMeals, loading, update, resetToDefault],
  );

  return <FixedMealsContext.Provider value={value}>{children}</FixedMealsContext.Provider>;
}

export function useFixedMeals(): FixedMealsState {
  const ctx = useContext(FixedMealsContext);
  if (!ctx) throw new Error('useFixedMeals must be used within a FixedMealsProvider');
  return ctx;
}
