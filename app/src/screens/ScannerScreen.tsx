import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '../theme';
import { insertFood, type FoodInput } from '../lib/foods';
import { lookupBarcode, scannedToFoodInput } from '../lib/openFoodFacts';
import { useFoods } from '../context/FoodsContext';
import type { FoodCategory } from '../types';

const CATEGORIES: FoodCategory[] = ['protein', 'carb', 'fat', 'mixed'];

export default function ScannerScreen() {
  const { reload } = useFoods();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [looking, setLooking] = useState(false);
  const [manual, setManual] = useState('');
  const [draft, setDraft] = useState<FoodInput | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCode = async (code: string) => {
    if (!code || looking) return;
    setScanning(false);
    setLooking(true);
    try {
      const product = await lookupBarcode(code);
      setDraft(scannedToFoodInput(product));
      if (!product.found) {
        Alert.alert('Not found', `No product for barcode ${code}. You can fill it in manually.`);
      }
    } catch (e) {
      Alert.alert('Lookup failed', e instanceof Error ? e.message : 'Network error');
      setScanning(true);
    } finally {
      setLooking(false);
    }
  };

  const save = async () => {
    if (!draft || !draft.name.trim()) {
      Alert.alert('Name required', 'Enter a name before saving.');
      return;
    }
    setSaving(true);
    try {
      await insertFood(draft);
      await reload();
      Alert.alert('Saved', `"${draft.name}" added to your foods.`);
      resetScan();
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const resetScan = () => {
    setDraft(null);
    setManual('');
    setScanning(true);
  };

  const setNum = (key: 'protein' | 'carbs' | 'fat', text: string) => {
    const n = parseFloat(text);
    setDraft((prev) => (prev ? { ...prev, [key]: isNaN(n) ? 0 : n } : prev));
  };

  // ── Permission gate ──
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accentBlue} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.h1}>Scan Food</Text>
        <Text style={styles.dim}>Camera access is needed to scan barcodes.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryText}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  // ── Review / edit draft ──
  if (draft) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Review Food</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(t) => setDraft((p) => (p ? { ...p, name: t } : p))}
          placeholderTextColor={theme.textFaint}
        />

        <Text style={styles.label}>Serving label</Text>
        <TextInput
          style={styles.input}
          value={draft.weight_label ?? ''}
          onChangeText={(t) => setDraft((p) => (p ? { ...p, weight_label: t } : p))}
          placeholderTextColor={theme.textFaint}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, draft.category === c && styles.chipActive]}
              onPress={() => setDraft((p) => (p ? { ...p, category: c } : p))}
            >
              <Text style={[styles.chipText, draft.category === c && styles.chipTextActive]}>{c}</Text>
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
                value={String(draft[k])}
                onChangeText={(t) => setNum(k, t)}
              />
            </View>
          ))}
        </View>

        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, styles.cancelBtn]} onPress={resetScan}>
            <Text style={styles.cancelText}>Scan Again</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.primaryBtn]} onPress={save} disabled={saving}>
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save Food'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Camera + manual entry ──
  return (
    <View style={styles.screen}>
      <View style={styles.cameraWrap}>
        {scanning ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
            }}
            onBarcodeScanned={({ data }) => handleCode(data)}
          />
        ) : (
          <View style={styles.center}>
            {looking ? <ActivityIndicator color={theme.accentBlue} size="large" /> : null}
          </View>
        )}
        <View style={styles.reticle} pointerEvents="none" />
      </View>

      <View style={styles.bottom}>
        <Text style={styles.hint}>Point the camera at a barcode</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Or type a barcode…"
            placeholderTextColor={theme.textFaint}
            keyboardType="number-pad"
            value={manual}
            onChangeText={setManual}
          />
          <Pressable style={styles.lookupBtn} onPress={() => handleCode(manual.trim())}>
            <Text style={styles.primaryText}>Look up</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16 },
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  h1: { color: theme.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  dim: { color: theme.textDim, textAlign: 'center', marginBottom: 16 },
  cameraWrap: { flex: 1, backgroundColor: '#000', position: 'relative' },
  reticle: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    right: '15%',
    height: '30%',
    borderWidth: 2,
    borderColor: theme.accentBlue,
    borderRadius: 12,
  },
  bottom: { padding: 16, backgroundColor: theme.bg },
  hint: { color: theme.textDim, textAlign: 'center', marginBottom: 10 },
  manualRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  label: { color: theme.textDim, fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: theme.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  primaryBtn: { backgroundColor: theme.blue },
  primaryText: { color: '#fff', fontWeight: '800' },
  cancelBtn: { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border },
  cancelText: { color: theme.textDim, fontWeight: '700' },
  lookupBtn: { backgroundColor: theme.blue, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
});
