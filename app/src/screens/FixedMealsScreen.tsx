import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { useFoods } from '../context/FoodsContext';
import { useFixedMeals } from '../context/FixedMealsContext';
import FoodPickerModal from '../components/FoodPickerModal';
import type { FixedMeals } from '../data/fixedMeals';
import type { FoodRow } from '../types';

type ListKey = 'breakfast' | 'snack1';
type OptionKey = 'preworkoutOptions' | 'snack2Options';
type PickerTarget =
  | { kind: 'list'; key: ListKey }
  | { kind: 'option'; key: OptionKey; index: number }
  | null;

const macroLine = (names: string[], foods: FoodRow[]) => {
  const t = names.reduce(
    (a, n) => {
      const f = foods.find((x) => x.name === n);
      return f ? { p: a.p + +f.protein, c: a.c + +f.carbs, f: a.f + +f.fat } : a;
    },
    { p: 0, c: 0, f: 0 },
  );
  return `${Math.round(t.p)}P · ${Math.round(t.c)}C · ${Math.round(t.f)}F · ${Math.round(t.p * 4 + t.c * 4 + t.f * 9)} kcal`;
};

export default function FixedMealsScreen() {
  const { foods } = useFoods();
  const { fixedMeals, update, resetToDefault } = useFixedMeals();
  const [picker, setPicker] = useState<PickerTarget>(null);

  const set = (next: FixedMeals) => update(next);

  const addToList = (key: ListKey, name: string) =>
    set({ ...fixedMeals, [key]: [...fixedMeals[key], name] });
  const removeFromList = (key: ListKey, i: number) =>
    set({ ...fixedMeals, [key]: fixedMeals[key].filter((_, idx) => idx !== i) });

  const addToOption = (key: OptionKey, index: number, name: string) =>
    set({ ...fixedMeals, [key]: fixedMeals[key].map((opt, i) => (i === index ? [...opt, name] : opt)) });
  const removeFromOption = (key: OptionKey, index: number, foodIdx: number) =>
    set({ ...fixedMeals, [key]: fixedMeals[key].map((opt, i) => (i === index ? opt.filter((_, j) => j !== foodIdx) : opt)) });
  const addOption = (key: OptionKey) => set({ ...fixedMeals, [key]: [...fixedMeals[key], []] });
  const removeOption = (key: OptionKey, index: number) =>
    set({ ...fixedMeals, [key]: fixedMeals[key].filter((_, i) => i !== index) });

  const onPick = (name: string) => {
    if (!picker) return;
    if (picker.kind === 'list') addToList(picker.key, name);
    else addToOption(picker.key, picker.index, name);
    setPicker(null);
  };

  const FoodChips = ({ names, onRemove }: { names: string[]; onRemove: (i: number) => void }) => (
    <View style={styles.chipWrap}>
      {names.length === 0 ? <Text style={styles.emptyText}>No foods yet</Text> : null}
      {names.map((n, i) => (
        <Pressable key={`${n}-${i}`} style={styles.foodChip} onLongPress={() => onRemove(i)} onPress={() => onRemove(i)}>
          <Text style={styles.foodChipText}>{n}</Text>
          <Text style={styles.foodChipX}>  ✕</Text>
        </Pressable>
      ))}
    </View>
  );

  const AddBtn = ({ onPress, label = '+ Add food' }: { onPress: () => void; label?: string }) => (
    <Pressable style={styles.addBtn} onPress={onPress}>
      <Text style={styles.addBtnText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Fixed Meals</Text>
      <Text style={styles.subtitle}>
        Your locked breakfast, snacks & pre-workout. Lunch and dinner are generated to hit your macros around these.
      </Text>

      {/* Breakfast */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Breakfast</Text>
        <Text style={styles.sectionMeta}>{macroLine(fixedMeals.breakfast, foods)}</Text>
        <FoodChips names={fixedMeals.breakfast} onRemove={(i) => removeFromList('breakfast', i)} />
        <AddBtn onPress={() => setPicker({ kind: 'list', key: 'breakfast' })} />
      </View>

      {/* Snack 1 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mid-Morning Snack</Text>
        <Text style={styles.sectionMeta}>{macroLine(fixedMeals.snack1, foods)}</Text>
        <FoodChips names={fixedMeals.snack1} onRemove={(i) => removeFromList('snack1', i)} />
        <AddBtn onPress={() => setPicker({ kind: 'list', key: 'snack1' })} />
      </View>

      {/* Pre-workout options */}
      <OptionSection
        title="Pre-Workout"
        hint="One option is picked at random each day"
        options={fixedMeals.preworkoutOptions}
        foods={foods}
        onAddFood={(i) => setPicker({ kind: 'option', key: 'preworkoutOptions', index: i })}
        onRemoveFood={(i, j) => removeFromOption('preworkoutOptions', i, j)}
        onAddOption={() => addOption('preworkoutOptions')}
        onRemoveOption={(i) => removeOption('preworkoutOptions', i)}
      />

      {/* Snack 2 options */}
      <OptionSection
        title="Afternoon Snack"
        hint="One option is picked at random each day"
        options={fixedMeals.snack2Options}
        foods={foods}
        onAddFood={(i) => setPicker({ kind: 'option', key: 'snack2Options', index: i })}
        onRemoveFood={(i, j) => removeFromOption('snack2Options', i, j)}
        onAddOption={() => addOption('snack2Options')}
        onRemoveOption={(i) => removeOption('snack2Options', i)}
      />

      <Pressable
        style={styles.resetBtn}
        onPress={() =>
          Alert.alert('Reset fixed meals', 'Restore the default breakfast, snacks and pre-workout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: resetToDefault },
          ])
        }
      >
        <Text style={styles.resetText}>Reset to defaults</Text>
      </Pressable>
      <Text style={styles.hint}>Tap a food chip to remove it · changes save automatically</Text>
      <View style={{ height: 24 }} />

      <FoodPickerModal visible={picker !== null} onPick={onPick} onClose={() => setPicker(null)} />
    </ScrollView>
  );
}

function OptionSection({
  title,
  hint,
  options,
  foods,
  onAddFood,
  onRemoveFood,
  onAddOption,
  onRemoveOption,
}: {
  title: string;
  hint: string;
  options: string[][];
  foods: FoodRow[];
  onAddFood: (optIndex: number) => void;
  onRemoveFood: (optIndex: number, foodIndex: number) => void;
  onAddOption: () => void;
  onRemoveOption: (optIndex: number) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>
      {options.map((opt, i) => (
        <View key={i} style={styles.optionCard}>
          <View style={styles.optionHeader}>
            <Text style={styles.optionLabel}>Option {i + 1}</Text>
            <Pressable onPress={() => onRemoveOption(i)} hitSlop={8}>
              <Text style={styles.optionRemove}>remove</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionMeta}>{macroLine(opt, foods)}</Text>
          <View style={styles.chipWrap}>
            {opt.length === 0 ? <Text style={styles.emptyText}>No foods yet</Text> : null}
            {opt.map((n, j) => (
              <Pressable key={`${n}-${j}`} style={styles.foodChip} onPress={() => onRemoveFood(i, j)}>
                <Text style={styles.foodChipText}>{n}</Text>
                <Text style={styles.foodChipX}>  ✕</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.addBtnSmall} onPress={() => onAddFood(i)}>
            <Text style={styles.addBtnText}>+ Add food</Text>
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.addOptionBtn} onPress={onAddOption}>
        <Text style={styles.addOptionText}>+ Add option</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16 },
  h1: { color: theme.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: theme.textDim, fontSize: 13, marginTop: 6, marginBottom: 16, lineHeight: 18 },
  section: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  sectionHint: { color: theme.textFaint, fontSize: 11, marginTop: 2 },
  sectionMeta: { color: theme.accentBlue, fontSize: 11, marginTop: 4, marginBottom: 8, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emptyText: { color: theme.textFaint, fontStyle: 'italic', fontSize: 12 },
  foodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardBgAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  foodChipText: { color: theme.text, fontSize: 12 },
  foodChipX: { color: theme.textFaint, fontSize: 12 },
  addBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: theme.blue, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnSmall: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: theme.cardBgAlt, borderWidth: 1, borderColor: theme.accentBlue, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  optionCard: {
    backgroundColor: theme.cardBgAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionLabel: { color: theme.textDim, fontSize: 12, fontWeight: '700' },
  optionRemove: { color: theme.red, fontSize: 12, fontWeight: '600' },
  addOptionBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed' },
  addOptionText: { color: theme.accentBlue, fontWeight: '700' },
  resetBtn: { marginTop: 6, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  resetText: { color: theme.textDim, fontWeight: '600' },
  hint: { color: theme.textFaint, fontSize: 11, textAlign: 'center', marginTop: 4 },
});
