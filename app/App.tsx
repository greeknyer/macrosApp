import React, { useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { theme } from './src/theme';
import { FoodsProvider } from './src/context/FoodsContext';
import PlanScreen from './src/screens/PlanScreen';
import FoodsScreen from './src/screens/FoodsScreen';
import ScannerScreen from './src/screens/ScannerScreen';

type Tab = 'plan' | 'foods' | 'scan';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'plan', label: 'Plan', icon: '🍽️' },
  { key: 'foods', label: 'Foods', icon: '📋' },
  { key: 'scan', label: 'Scan', icon: '📷' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('plan');

  return (
    <FoodsProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        <View style={styles.body}>
          {tab === 'plan' && <PlanScreen />}
          {tab === 'foods' && <FoodsScreen />}
          {tab === 'scan' && <ScannerScreen />}
        </View>
        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabIcon, tab === t.key && styles.tabActive]}>{t.icon}</Text>
              <Text style={[styles.tabLabel, tab === t.key && styles.tabActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </FoodsProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.cardBgAlt,
    paddingBottom: 6,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabIcon: { fontSize: 20, opacity: 0.5 },
  tabLabel: { color: theme.textFaint, fontSize: 11, marginTop: 2, fontWeight: '600' },
  tabActive: { color: theme.accentBlue, opacity: 1 },
});
