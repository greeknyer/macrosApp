import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchFoods, seedStarterFoods } from '../lib/foods';
import type { FoodRow } from '../types';

interface FoodsState {
  foods: FoodRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const FoodsContext = createContext<FoodsState | undefined>(undefined);

export function FoodsProvider({ children }: { children: React.ReactNode }) {
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seededRef = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await fetchFoods();
      // First login: seed this account with its own copy of the starter foods.
      if (data.length === 0 && !seededRef.current) {
        seededRef.current = true;
        await seedStarterFoods();
        data = await fetchFoods();
      }
      setFoods(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load foods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ foods, loading, error, reload }),
    [foods, loading, error, reload],
  );

  return <FoodsContext.Provider value={value}>{children}</FoodsContext.Provider>;
}

export function useFoods(): FoodsState {
  const ctx = useContext(FoodsContext);
  if (!ctx) throw new Error('useFoods must be used within a FoodsProvider');
  return ctx;
}
