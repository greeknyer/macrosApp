import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';
import { useFoods } from '../context/FoodsContext';

interface Props {
  visible: boolean;
  title?: string;
  onPick: (name: string) => void;
  onClose: () => void;
}

export default function FoodPickerModal({ visible, title = 'Add food', onPick, onClose }: Props) {
  const { foods } = useFoods();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
    return list;
  }, [foods, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            placeholder="Search foods…"
            placeholderTextColor={theme.textFaint}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(f) => f.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onPick(item.name);
                  setQuery('');
                }}
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMacros}>
                  <Text style={{ color: theme.protein }}>{item.protein}p</Text>{'  '}
                  <Text style={{ color: theme.carbs }}>{item.carbs}c</Text>{'  '}
                  <Text style={{ color: theme.fat }}>{item.fat}f</Text>
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No foods match.</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: theme.cardBgAlt,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    height: '80%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: theme.text, fontSize: 18, fontWeight: '800' },
  close: { color: theme.accentBlue, fontSize: 15, fontWeight: '700' },
  search: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rowName: { color: theme.text, fontSize: 14, flex: 1, paddingRight: 8 },
  rowMacros: { fontSize: 12, fontWeight: '600' },
  empty: { color: theme.textDim, textAlign: 'center', marginTop: 30 },
});
