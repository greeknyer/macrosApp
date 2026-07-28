import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import type { Macros } from '../types';

interface Props {
  label?: string;
  totals: Macros;
  targets: Macros;
  kcal: number;
  kcalTarget?: number;
}

function Stat({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}) {
  const off = value - target;
  const near = Math.abs(off) <= 5;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>
        {Math.round(value)}
        <Text style={styles.statUnit}>{unit}</Text>
      </Text>
      <Text style={[styles.statTarget, near && { color: theme.green }]}>
        {off >= 0 ? '+' : ''}
        {Math.round(off)} vs {target}
      </Text>
    </View>
  );
}

export default function MacroSummary({ label, totals, targets, kcal, kcalTarget = 2100 }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.heading}>{label}</Text> : null}
      <View style={styles.row}>
        <Stat label="Protein" value={totals.p} target={targets.p} unit="g" color={theme.protein} />
        <Stat label="Carbs" value={totals.c} target={targets.c} unit="g" color={theme.carbs} />
        <Stat label="Fat" value={totals.f} target={targets.f} unit="g" color={theme.fat} />
        <Stat label="Calories" value={kcal} target={kcalTarget} unit="" color={theme.kcal} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.cardBgAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 16,
  },
  heading: { color: theme.textDim, fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: theme.textFaint, fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statUnit: { fontSize: 12, fontWeight: '600' },
  statTarget: { color: theme.textFaint, fontSize: 10, marginTop: 2 },
});
