import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../theme';
import { useFoods } from '../context/FoodsContext';
import { deleteFood, insertFood, updateFood, type FoodInput } from '../lib/foods';
import { deriveAttributes } from '../data/attributes';
import type { FoodCategory, FoodRow, MealTag } from '../types';

const CATEGORIES: FoodCategory[] = ['protein', 'carb', 'fat', 'mixed'];
const MEAL_TAGS: MealTag[] = ['breakfast', 'snack', 'preworkout', 'lunch', 'dinner', 'evening'];

// Culinary attributes that drive meal pairing (see src/data/attributes.ts).
const ROLES = ['protein', 'carb', 'fat', 'veg', 'condiment', 'dairy', 'fruit', 'other'];
const PROTEIN_FORMS = ['deli', 'grilled', 'roast', 'canned_fish', 'shellfish', 'fatty_fish', 'egg', 'patty', 'sausage', 'powder'];
const CARB_FORMS = ['bread', 'bagel', 'wrap', 'grain', 'potato', 'legume', 'cereal', 'rice_cake'];
const TEMPS = ['cold', 'hot', 'any'];
const FAT_TYPES = ['oil', 'butter', 'cheese_shredded', 'cheese_sliced', 'nut', 'nut_butter', 'sweet_spread', 'mayo', 'cream_cheese', 'avocado', 'dressing'];

const emptyForm = (): FoodInput => ({
  name: '',
  weight_label: '',
  category: 'protein',
  protein: 0,
  carbs: 0,
  fat: 0,
  meal_tags: [],
  form_role: 'protein',
  form: null,
  temp: 'hot',
  seafood: false,
  fat_type: null,
});

export default function FoodsScreen() {
  const { foods, loading, error, reload } = useFoods();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FoodInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  }, [foods, query]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (f: FoodRow) => {
    setEditingId(f.id);
    // Pre-fill attributes with the resolved values (explicit, or auto-detected)
    // so the user sees what the app inferred and can override it.
    const a = deriveAttributes(f);
    setForm({
      name: f.name,
      weight_label: f.weight_label ?? '',
      category: f.category,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      meal_tags: f.meal_tags ?? [],
      form_role: a.role,
      form: a.form,
      temp: a.temp,
      seafood: a.seafood,
      fat_type: a.fatType,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Please enter a food name.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) await updateFood(editingId, form);
      else await insertFood(form);
      setModalOpen(false);
      await reload();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (f: FoodRow) => {
    Alert.alert('Delete food', `Remove "${f.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFood(f.id);
            await reload();
          } catch (e) {
            Alert.alert('Delete failed', e instanceof Error ? e.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  const toggleTag = (tag: MealTag) => {
    setForm((prev) => {
      const tags = prev.meal_tags ?? [];
      return {
        ...prev,
        meal_tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
      };
    });
  };

  const setNum = (key: 'protein' | 'carbs' | 'fat', text: string) => {
    const n = parseFloat(text);
    setForm((prev) => ({ ...prev, [key]: isNaN(n) ? 0 : n }));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accentBlue} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.h1}>Foods</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search foods…"
        placeholderTextColor={theme.textFaint}
        value={query}
        onChangeText={setQuery}
      />

      {error ? (
        <Pressable onPress={reload}>
          <Text style={styles.error}>{error} — tap to retry</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openEdit(item)} onLongPress={() => confirmDelete(item)}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {item.category}
                {item.weight_label ? ` · ${item.weight_label}` : ''}
              </Text>
            </View>
            <Text style={styles.rowMacros}>
              <Text style={{ color: theme.protein }}>{item.protein}p</Text>{'  '}
              <Text style={{ color: theme.carbs }}>{item.carbs}c</Text>{'  '}
              <Text style={{ color: theme.fat }}>{item.fat}f</Text>
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.dim}>No foods match.</Text>}
      />
      <Text style={styles.hint}>Tap to edit · long-press to delete</Text>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Food' : 'Add Food'}</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
              placeholder="e.g. Grilled Chicken Breast"
              placeholderTextColor={theme.textFaint}
            />

            <Text style={styles.label}>Serving label</Text>
            <TextInput
              style={styles.input}
              value={form.weight_label ?? ''}
              onChangeText={(t) => setForm((p) => ({ ...p, weight_label: t }))}
              placeholder="e.g. 170g or 1 cup"
              placeholderTextColor={theme.textFaint}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.chip, form.category === c && styles.chipActive]}
                  onPress={() => setForm((p) => ({ ...p, category: c }))}
                >
                  <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.macroRow}>
              {(['protein', 'carbs', 'fat'] as const).map((k) => (
                <View key={k} style={styles.macroCol}>
                  <Text style={styles.label}>{k[0].toUpperCase() + k.slice(1)}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={String(form[k])}
                    onChangeText={(t) => setNum(k, t)}
                  />
                </View>
              ))}
            </View>

            <View style={styles.attrHeader}>
              <Text style={styles.attrTitle}>Meal logic</Text>
              <Text style={styles.attrHint}>drives pairing · auto-detected, editable</Text>
            </View>

            <Text style={styles.label}>Role</Text>
            <View style={styles.chipRow}>
              {ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.chip, form.form_role === r && styles.chipActive]}
                  onPress={() => setForm((p) => ({ ...p, form_role: r }))}
                >
                  <Text style={[styles.chipText, form.form_role === r && styles.chipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            {(form.form_role === 'protein' || form.form_role === 'carb') && (
              <>
                <Text style={styles.label}>Form</Text>
                <View style={styles.chipRow}>
                  {(form.form_role === 'protein' ? PROTEIN_FORMS : CARB_FORMS).map((fm) => (
                    <Pressable
                      key={fm}
                      style={[styles.chip, form.form === fm && styles.chipActive]}
                      onPress={() => setForm((p) => ({ ...p, form: fm }))}
                    >
                      <Text style={[styles.chipText, form.form === fm && styles.chipTextActive]}>{fm}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {form.form_role === 'protein' && (
              <View style={styles.attrRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Served</Text>
                  <View style={styles.chipRow}>
                    {TEMPS.map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.chip, form.temp === t && styles.chipActive]}
                        onPress={() => setForm((p) => ({ ...p, temp: t }))}
                      >
                        <Text style={[styles.chipText, form.temp === t && styles.chipTextActive]}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Pressable
                  style={[styles.chip, styles.seafoodChip, form.seafood && styles.chipActive]}
                  onPress={() => setForm((p) => ({ ...p, seafood: !p.seafood }))}
                >
                  <Text style={[styles.chipText, form.seafood && styles.chipTextActive]}>🐟 seafood</Text>
                </Pressable>
              </View>
            )}

            {form.form_role === 'fat' && (
              <>
                <Text style={styles.label}>Fat type</Text>
                <View style={styles.chipRow}>
                  {FAT_TYPES.map((ft) => (
                    <Pressable
                      key={ft}
                      style={[styles.chip, form.fat_type === ft && styles.chipActive]}
                      onPress={() => setForm((p) => ({ ...p, fat_type: ft }))}
                    >
                      <Text style={[styles.chipText, form.fat_type === ft && styles.chipTextActive]}>{ft}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Meal tags</Text>
            <View style={styles.chipRow}>
              {MEAL_TAGS.map((tag) => {
                const active = (form.meal_tags ?? []).includes(tag);
                return (
                  <Pressable
                    key={tag}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalBtns}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={save} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  h1: { color: theme.text, fontSize: 24, fontWeight: '800' },
  addBtn: { backgroundColor: theme.blue, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  search: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
  },
  error: { color: theme.red, paddingHorizontal: 16, paddingBottom: 8 },
  dim: { color: theme.textDim, textAlign: 'center', marginTop: 30 },
  hint: { color: theme.textFaint, fontSize: 11, textAlign: 'center', paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  rowLeft: { flex: 1, paddingRight: 8 },
  rowName: { color: theme.text, fontSize: 14, fontWeight: '600' },
  rowMeta: { color: theme.textFaint, fontSize: 11, marginTop: 2 },
  rowMacros: { fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.cardBgAlt,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '92%',
  },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  label: { color: theme.textDim, fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.text,
  },
  attrHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16, marginBottom: 2, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  attrTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  attrHint: { color: theme.textFaint, fontSize: 10 },
  attrRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  seafoodChip: { marginBottom: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipActive: { backgroundColor: theme.blue, borderColor: theme.accentBlue },
  chipText: { color: theme.textDim, fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroCol: { flex: 1 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border },
  cancelText: { color: theme.textDim, fontWeight: '700' },
  saveBtn: { backgroundColor: theme.blue },
  saveText: { color: '#fff', fontWeight: '800' },
});
