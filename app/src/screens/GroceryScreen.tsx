import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { useFoods } from '../context/FoodsContext';
import { useSettings } from '../context/SettingsContext';
import { buildGroceryList, formatQty, type GroceryCategory } from '../solver/grocery';

const CATEGORY_META: Record<GroceryCategory, { label: string; icon: string; color: string }> = {
  protein: { label: 'Proteins', icon: '🥩', color: theme.protein },
  carb: { label: 'Carbs', icon: '🍞', color: theme.carbs },
  mixed: { label: 'Mixed', icon: '🥗', color: theme.green },
  fat: { label: 'Fats', icon: '🥑', color: theme.fat },
  other: { label: 'Other', icon: '🧂', color: theme.textDim },
};

export default function GroceryScreen() {
  const { foods, loading, error, reload } = useFoods();
  const { settings } = useSettings();
  const [seed, setSeed] = useState(0); // bump to regenerate the week
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Regenerate when foods, settings, or the manual refresh seed change.
  const grocery = useMemo(
    () => (foods.length ? buildGroceryList(foods, settings) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [foods, settings, seed],
  );

  const toggle = (name: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const regenerate = () => {
    setChecked(new Set());
    setSeed((s) => s + 1);
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

  const remaining = grocery ? grocery.itemCount - checked.size : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Grocery List</Text>
      <Text style={styles.subtitle}>
        Everything to shop for a full {grocery?.dayCount ?? 7}-day week of plans.
      </Text>

      {grocery ? (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {grocery.itemCount} items · {remaining} left
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.regenBtn} onPress={regenerate}>
        <Text style={styles.regenText}>🔄 Regenerate Week</Text>
      </Pressable>

      {grocery?.byCategory.map((group) => {
        const meta = CATEGORY_META[group.category];
        return (
          <View key={group.category} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: meta.color }]}>
                {meta.icon} {meta.label}
              </Text>
              <Text style={styles.cardCount}>{group.items.length}</Text>
            </View>
            {group.items.map((e) => {
              const isChecked = checked.has(e.name);
              return (
                <Pressable key={e.name} style={styles.row} onPress={() => toggle(e.name)}>
                  <View style={[styles.checkbox, isChecked && styles.checkboxOn]}>
                    {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.rowName, isChecked && styles.rowNameChecked]} numberOfLines={2}>
                    {e.name}
                  </Text>
                  <Text style={[styles.rowQty, isChecked && styles.rowQtyChecked]}>{formatQty(e)}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      {grocery && grocery.itemCount === 0 ? (
        <Text style={styles.dim}>No items — add foods or check your fixed meals in Setup.</Text>
      ) : null}

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
  h1: { color: theme.text, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: theme.textDim, fontSize: 13, marginBottom: 14 },
  statsBar: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  statsText: { color: theme.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  regenBtn: {
    backgroundColor: theme.blue,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 18,
  },
  regenText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardCount: { color: theme.textFaint, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxOn: { backgroundColor: theme.green, borderColor: theme.green },
  checkmark: { color: '#052e16', fontSize: 14, fontWeight: '900' },
  rowName: { flex: 1, color: theme.text, fontSize: 13, paddingRight: 8 },
  rowNameChecked: { color: theme.textFaint, textDecorationLine: 'line-through' },
  rowQty: { color: theme.accentBlue, fontSize: 13, fontWeight: '700' },
  rowQtyChecked: { color: theme.textFaint },
  retryBtn: { marginTop: 16, backgroundColor: theme.blue, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
