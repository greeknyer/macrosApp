import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme';
import { useFoods } from '../context/FoodsContext';
import { useSettings } from '../context/SettingsContext';
import { targetsForSchedule } from '../data/settings';
import { DAY_ORDER, SCHEDULE_META } from '../data/templates';
import { calcKcal, generateMealPlan } from '../solver/solver';
import MacroSummary from '../components/MacroSummary';
import MealCard from '../components/MealCard';
import type { DayKey, Macros, PlanResult } from '../types';

const TODAY_INDEX = () => {
  const js = new Date().getDay(); // 0 = Sun
  return js === 0 ? 6 : js - 1; // map to Mon-first DAY_ORDER
};

const macroLabel: Record<keyof Macros, string> = { p: 'Protein', c: 'Carbs', f: 'Fat' };

export default function PlanScreen() {
  const { foods, loading, error, reload } = useFoods();
  const { settings } = useSettings();
  const [day, setDay] = useState<DayKey>(DAY_ORDER[TODAY_INDEX()]);
  const [plan, setPlan] = useState<PlanResult | null>(null);

  // Rolling memory of recently-used proteins/carbs so successive randomizes
  // rotate through the roster instead of repeating.
  const recent = useRef<{ proteins: string[]; carbs: string[]; fats: string[] }>({
    proteins: [],
    carbs: [],
    fats: [],
  });
  const PROTEIN_WINDOW = 4;
  const CARB_WINDOW = 3;
  const FAT_WINDOW = 3;

  const build = () => {
    const schedType = settings.schedule[day];
    const targets = targetsForSchedule(schedType, settings.targets);
    const result = generateMealPlan(foods, day, targets, recent.current, settings.fixedMeals, schedType);
    recent.current = {
      proteins: [...result.usedProteins, ...recent.current.proteins].slice(0, PROTEIN_WINDOW),
      carbs: [...result.usedCarbs, ...recent.current.carbs].slice(0, CARB_WINDOW),
      fats: [...result.usedFats, ...recent.current.fats].slice(0, FAT_WINDOW),
    };
    setPlan(result);
  };

  // Regenerate when foods load, the day changes, or settings (targets/meals) change.
  useEffect(() => {
    if (foods.length) build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foods, day, settings]);

  const randomize = () => {
    if (foods.length) build();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accentBlue} size="large" />
        <Text style={styles.dim}>Loading foods…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn’t load foods</Text>
        <Text style={styles.dim}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={reload}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const offMacros = plan
    ? (['p', 'c', 'f'] as const).filter((m) => Math.abs(plan.deviation[m]) > 5)
    : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Daily Plan</Text>

      <View style={styles.dayRow}>
        {DAY_ORDER.map((d) => (
          <Pressable
            key={d}
            style={[styles.dayChip, d === day && styles.dayChipActive]}
            onPress={() => setDay(d)}
          >
            <Text style={[styles.dayChipText, d === day && styles.dayChipTextActive]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{SCHEDULE_META[settings.schedule[day]].desc}</Text>
      </View>

      {plan ? (
        <>
          <MacroSummary
            totals={plan.totals}
            targets={plan.targets}
            kcal={calcKcal(plan.totals)}
            kcalTarget={calcKcal(plan.targets)}
          />

          {plan.withinTolerance ? (
            <View style={[styles.toleranceBar, styles.onTarget]}>
              <Text style={styles.onTargetText}>✓ On target — all macros within ±5 g</Text>
            </View>
          ) : (
            <View style={[styles.toleranceBar, styles.offTarget]}>
              <Text style={styles.offTargetText}>
                Closest fit:{' '}
                {offMacros
                  .map(
                    (m) =>
                      `${macroLabel[m]} ${plan.deviation[m] >= 0 ? '+' : ''}${Math.round(
                        plan.deviation[m],
                      )}g`,
                  )
                  .join(', ')}{' '}
                — try Randomize again
              </Text>
            </View>
          )}
        </>
      ) : null}

      <Pressable style={styles.randomizeBtn} onPress={randomize}>
        <Text style={styles.randomizeText}>🎲 Randomize Meal Plan</Text>
      </Pressable>

      {plan?.meals.map((meal, i) => (
        <MealCard key={`${meal.title}-${i}`} meal={meal} />
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dim: { color: theme.textDim, marginTop: 10, textAlign: 'center' },
  errorTitle: { color: theme.red, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  h1: { color: theme.text, fontSize: 24, fontWeight: '800', marginBottom: 14 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayChip: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  dayChipActive: { backgroundColor: theme.blue, borderColor: theme.accentBlue },
  dayChipText: { color: theme.textDim, fontSize: 12, fontWeight: '700' },
  dayChipTextActive: { color: '#fff' },
  badge: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  badgeText: { color: theme.text, fontSize: 13, textAlign: 'center' },
  toleranceBar: { borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1 },
  onTarget: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: theme.green },
  onTargetText: { color: theme.green, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  offTarget: { backgroundColor: 'rgba(253,224,71,0.08)', borderColor: theme.yellow },
  offTargetText: { color: theme.yellow, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  randomizeBtn: {
    backgroundColor: theme.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  randomizeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: theme.blue,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
