import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';
import { useFoods } from '../context/FoodsContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import FoodPickerModal from '../components/FoodPickerModal';
import { calcKcal } from '../solver/solver';
import { DAY_ORDER, SCHEDULE_META, SCHEDULE_TYPES } from '../data/templates';
import type { FixedMeals } from '../data/fixedMeals';
import type { FoodRow, Macros } from '../types';

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
  const { settings, updateFixedMeals, updateTargets, updateSchedule, resetFixedMeals } = useSettings();
  const { session, signOut } = useAuth();
  const [picker, setPicker] = useState<PickerTarget>(null);

  const fixedMeals = settings.fixedMeals;
  const set = (next: FixedMeals) => updateFixedMeals(next);
  const resetToDefault = resetFixedMeals;

  const setTarget = (profile: 'training' | 'rest', macro: keyof Macros, text: string) => {
    const n = parseFloat(text);
    updateTargets({
      ...settings.targets,
      [profile]: { ...settings.targets[profile], [macro]: isNaN(n) ? 0 : n },
    });
  };

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
      <Text style={styles.h1}>Setup</Text>
      <Text style={styles.subtitle}>
        Your daily macro targets and locked meals. Lunch and dinner are generated to hit the day’s targets around these.
      </Text>

      {/* Daily targets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Targets</Text>
        <Text style={styles.sectionHint}>Training days use one profile; the rest day uses another.</Text>
        {(['training', 'rest'] as const).map((profile) => {
          const t = settings.targets[profile];
          return (
            <View key={profile} style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionLabel}>{profile === 'training' ? '🏋️ Training days' : '😴 Rest day'}</Text>
                <Text style={styles.sectionMeta}>{calcKcal(t)} kcal</Text>
              </View>
              <View style={styles.targetRow}>
                {(['p', 'c', 'f'] as const).map((m) => (
                  <View key={m} style={styles.targetCol}>
                    <Text style={styles.targetLabel}>{m === 'p' ? 'Protein' : m === 'c' ? 'Carbs' : 'Fat'}</Text>
                    <View style={styles.targetInputWrap}>
                      <TextInput
                        style={styles.targetInput}
                        keyboardType="number-pad"
                        value={String(t[m])}
                        onChangeText={(txt) => setTarget(profile, m, txt)}
                        selectTextOnFocus
                      />
                      <Text style={styles.targetUnit}>g</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      {/* Weekly schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        <Text style={styles.sectionHint}>Set each day’s workout — it sets the meal timing and target profile.</Text>
        {DAY_ORDER.map((d) => (
          <View key={d} style={styles.schedRow}>
            <Text style={styles.schedDay}>{d}</Text>
            <View style={styles.schedChips}>
              {SCHEDULE_TYPES.map((st) => {
                const active = settings.schedule[d] === st;
                return (
                  <Pressable
                    key={st}
                    style={[styles.schedChip, active && styles.chipActive]}
                    onPress={() => updateSchedule({ ...settings.schedule, [d]: st })}
                  >
                    <Text style={[styles.schedChipText, active && styles.chipTextActive]}>
                      {SCHEDULE_META[st].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

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

      <View style={styles.account}>
        <Text style={styles.accountEmail}>{session?.user?.email ?? 'Signed in'}</Text>
        <Pressable
          onPress={() =>
            Alert.alert('Sign out', 'Sign out of your account?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
            ])
          }
        >
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
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
  account: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  accountEmail: { color: theme.textDim, fontSize: 13 },
  signOut: { color: theme.red, fontSize: 14, fontWeight: '700' },
  targetRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  targetCol: { flex: 1 },
  targetLabel: { color: theme.textDim, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  targetInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 8 },
  targetInput: { flex: 1, color: theme.text, paddingVertical: 8, fontSize: 15, fontWeight: '700' },
  targetUnit: { color: theme.textFaint, fontSize: 12 },
  schedRow: { marginTop: 10 },
  schedDay: { color: theme.textDim, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  schedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  schedChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: theme.cardBgAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  schedChipText: { color: theme.textDim, fontSize: 11, fontWeight: '600' },
  chipActive: { backgroundColor: theme.blue, borderColor: theme.accentBlue },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});


