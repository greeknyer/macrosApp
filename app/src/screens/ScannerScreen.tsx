import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { lookupBarcode, searchByName, scannedToFoodInput, type ScannedProduct } from '../lib/openFoodFacts';
import { useFoods } from '../context/FoodsContext';
import type { FoodCategory } from '../types';

const CATEGORIES: FoodCategory[] = ['protein', 'carb', 'fat', 'mixed'];
type Mode = 'search' | 'barcode' | 'camera';

export default function ScannerScreen() {
  const { reload } = useFoods();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('search');

  const [query, setQuery] = useState('');
  const [manual, setManual] = useState('');
  const [results, setResults] = useState<ScannedProduct[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const [draft, setDraft] = useState<FoodInput | null>(null);
  const [saving, setSaving] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);

  // ── Actions ──
  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setStatus('Type at least 2 letters to search.');
      return;
    }
    searchAbort.current?.abort();
    const ctrl = new AbortController();
    searchAbort.current = ctrl;
    setBusy(true);
    setStatus(null);
    setResults([]);
    try {
      const found = await searchByName(q, ctrl.signal);
      setResults(found);
      setStatus(found.length ? null : `No products with nutrition info for “${q}”. Try a barcode.`);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setStatus('Search failed — check your connection.');
    } finally {
      setBusy(false);
    }
  };

  const runBarcode = async (code: string) => {
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    setStatus(null);
    setScanning(false);
    try {
      const product = await lookupBarcode(c);
      if (product.found) {
        setDraft(scannedToFoodInput(product));
      } else {
        setStatus(`No product for barcode ${c}. Add it manually below.`);
        setDraft(scannedToFoodInput(product)); // opens the form pre-filled with the barcode
      }
    } catch {
      setStatus('Lookup failed — check your connection or add it manually.');
      setScanning(true);
    } finally {
      setBusy(false);
    }
  };

  const pickResult = (p: ScannedProduct) => {
    setDraft(scannedToFoodInput(p));
    setResults([]);
    setStatus(null);
  };

  const save = async () => {
    if (!draft || !draft.name.trim()) {
      setStatus('Enter a name before saving.');
      return;
    }
    setSaving(true);
    try {
      await insertFood(draft);
      await reload();
      resetAll();
      setStatus(`Saved “${draft.name}” to your foods.`);
    } catch (e) {
      setStatus(`Save failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setDraft(null);
    setManual('');
    setScanning(true);
  };

  const setNum = (key: 'protein' | 'carbs' | 'fat', text: string) => {
    const n = parseFloat(text);
    setDraft((prev) => (prev ? { ...prev, [key]: isNaN(n) ? 0 : n } : prev));
  };

  const enableCamera = async () => {
    setMode('camera');
    setStatus(null);
    if (!permission?.granted) await requestPermission();
    setScanning(true);
  };

  // ── Review / edit draft ──
  if (draft) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Review Food</Text>
        <Text style={styles.dimLeft}>Check the details from Open Food Facts, then save.</Text>

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

        {status ? <Text style={styles.statusInfo}>{status}</Text> : null}

        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, styles.cancelBtn]} onPress={resetAll}>
            <Text style={styles.cancelText}>Back</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.primaryBtn]} onPress={save} disabled={saving}>
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save Food'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Add-food (search / barcode / camera) ──
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Add Food</Text>

      <View style={styles.modeRow}>
        {(['search', 'barcode', 'camera'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            style={[styles.modeTab, mode === m && styles.modeTabActive]}
            onPress={() => (m === 'camera' ? enableCamera() : (setMode(m), setStatus(null)))}
          >
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
              {m === 'search' ? '🔍 Search' : m === 'barcode' ? '#️⃣ Barcode' : '📷 Camera'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'search' && (
        <>
          <View style={styles.manualRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Search by food name…"
              placeholderTextColor={theme.textFaint}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <Pressable style={styles.lookupBtn} onPress={runSearch} disabled={busy}>
              <Text style={styles.primaryText}>Search</Text>
            </Pressable>
          </View>

          {busy ? <ActivityIndicator color={theme.accentBlue} style={{ marginTop: 20 }} /> : null}

          {results.map((p) => (
            <Pressable key={p.code + p.name} style={styles.resultCard} onPress={() => pickResult(p)}>
              <Text style={styles.resultName} numberOfLines={2}>
                {[p.brand, p.name].filter(Boolean).join(' — ')}
              </Text>
              <Text style={styles.resultMacros}>
                <Text style={{ color: theme.protein }}>{p.protein}p</Text>{'  '}
                <Text style={{ color: theme.carbs }}>{p.carbs}c</Text>{'  '}
                <Text style={{ color: theme.fat }}>{p.fat}f</Text>
                <Text style={styles.resultServing}>  · {p.serving}</Text>
              </Text>
            </Pressable>
          ))}
        </>
      )}

      {mode === 'barcode' && (
        <View style={styles.manualRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Type a barcode number…"
            placeholderTextColor={theme.textFaint}
            keyboardType="number-pad"
            value={manual}
            onChangeText={setManual}
            onSubmitEditing={() => runBarcode(manual)}
            returnKeyType="search"
          />
          <Pressable style={styles.lookupBtn} onPress={() => runBarcode(manual)} disabled={busy}>
            <Text style={styles.primaryText}>{busy ? '…' : 'Look up'}</Text>
          </Pressable>
        </View>
      )}

      {mode === 'camera' && (
        <>
          {permission?.granted ? (
            <View style={styles.cameraWrap}>
              {scanning ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  autofocus="on"
                  barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                  }}
                  onBarcodeScanned={({ data }) => (busy ? null : runBarcode(data))}
                />
              ) : (
                <View style={styles.center}>
                  {busy ? <ActivityIndicator color={theme.accentBlue} size="large" /> : null}
                </View>
              )}
              <View style={styles.reticle} pointerEvents="none" />
            </View>
          ) : (
            <Text style={styles.statusInfo}>Camera access is needed. Tap “📷 Camera” again to grant it.</Text>
          )}
          <Text style={styles.cameraNote}>
            Live scanning works best in the installed app. In a phone browser (especially iPhone/Safari) it
            often can’t read codes — use Search or Barcode instead.
          </Text>
        </>
      )}

      {status ? <Text style={styles.statusInfo}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  h1: { color: theme.text, fontSize: 24, fontWeight: '800', marginBottom: 12 },
  dimLeft: { color: theme.textDim, fontSize: 13, marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  modeTabActive: { backgroundColor: theme.blue, borderColor: theme.accentBlue },
  modeText: { color: theme.textDim, fontSize: 13, fontWeight: '700' },
  modeTextActive: { color: '#fff' },
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
  lookupBtn: { backgroundColor: theme.blue, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  resultCard: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  resultName: { color: theme.text, fontSize: 14, fontWeight: '600' },
  resultMacros: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  resultServing: { color: theme.textFaint, fontWeight: '500' },
  statusInfo: {
    color: theme.textDim,
    fontSize: 13,
    marginTop: 14,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 10,
  },
  cameraWrap: { height: 300, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  reticle: {
    position: 'absolute',
    top: '30%',
    left: '12%',
    right: '12%',
    height: '40%',
    borderWidth: 2,
    borderColor: theme.accentBlue,
    borderRadius: 12,
  },
  cameraNote: { color: theme.textFaint, fontSize: 12, marginTop: 10, lineHeight: 17 },
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
});
