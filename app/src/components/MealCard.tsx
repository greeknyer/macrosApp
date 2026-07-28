import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { calcKcal, sumMacros } from '../solver/solver';
import type { Meal } from '../types';

export default function MealCard({ meal }: { meal: Meal }) {
  const totals = sumMacros(meal.items);
  const kcal = calcKcal(totals);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{meal.title}</Text>
          {meal.sub ? <Text style={styles.sub}>{meal.sub}</Text> : null}
        </View>
        <Text style={styles.time}>{meal.time}</Text>
      </View>

      {meal.items.length === 0 ? (
        <Text style={styles.empty}>Optional — fill this slot manually</Text>
      ) : (
        meal.items.map((item, i) => {
          const scaled = item.multiplier != null && item.multiplier !== 1;
          // Gram foods show a "×" badge; countable foods already show a count.
          const showMult = scaled && !item.discrete && item.baseGrams != null;
          return (
            <View key={`${item.name}-${i}`} style={[styles.item, scaled && styles.itemScaled]}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.weight ? (
                  <Text style={styles.itemWeight}>
                    {item.weight}
                    {showMult ? ` · ${item.multiplier}×` : ''}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.itemMacros}>
                <Text style={{ color: theme.protein }}>{Math.round(item.p)}p</Text>{'  '}
                <Text style={{ color: theme.carbs }}>{Math.round(item.c)}c</Text>{'  '}
                <Text style={{ color: theme.fat }}>{Math.round(item.f)}f</Text>
              </Text>
            </View>
          );
        })
      )}

      {meal.items.length > 0 && !meal.isHydrationOnly ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {Math.round(totals.p)}P · {Math.round(totals.c)}C · {Math.round(totals.f)}F
          </Text>
          <Text style={styles.footerKcal}>{kcal} kcal</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerLeft: { flex: 1, paddingRight: 8 },
  title: { color: theme.text, fontSize: 15, fontWeight: '700' },
  sub: { color: theme.accentBlue, fontSize: 12, marginTop: 2 },
  time: { color: theme.textDim, fontSize: 12, fontWeight: '600' },
  empty: { color: theme.textFaint, fontStyle: 'italic', fontSize: 13, paddingVertical: 4 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemScaled: { backgroundColor: theme.scaledBg, borderRadius: 6, paddingHorizontal: 6 },
  itemLeft: { flex: 1, paddingRight: 8 },
  itemName: { color: theme.text, fontSize: 13 },
  itemWeight: { color: theme.textFaint, fontSize: 11, marginTop: 1 },
  itemMacros: { fontSize: 12, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 8,
    paddingTop: 8,
  },
  footerText: { color: theme.textDim, fontSize: 12, fontWeight: '600' },
  footerKcal: { color: theme.kcal, fontSize: 12, fontWeight: '700' },
});
