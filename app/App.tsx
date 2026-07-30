import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { theme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FoodsProvider } from './src/context/FoodsContext';
import { SettingsProvider } from './src/context/SettingsContext';
import AuthScreen from './src/screens/AuthScreen';
import PlanScreen from './src/screens/PlanScreen';
import GroceryScreen from './src/screens/GroceryScreen';
import FoodsScreen from './src/screens/FoodsScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SetupScreen from './src/screens/FixedMealsScreen';

type Tab = 'plan' | 'grocery' | 'foods' | 'setup' | 'scan';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'plan', label: 'Plan', icon: '🍽️' },
  { key: 'grocery', label: 'Grocery', icon: '🛒' },
  { key: 'foods', label: 'Foods', icon: '📋' },
  { key: 'setup', label: 'Setup', icon: '⚙️' },
  { key: 'scan', label: 'Add', icon: '➕' },
];

function MainApp() {
  const [tab, setTab] = useState<Tab>('plan');
  return (
    <FoodsProvider>
      <SettingsProvider>
        <View style={styles.body}>
          {tab === 'plan' && <PlanScreen />}
          {tab === 'grocery' && <GroceryScreen />}
          {tab === 'foods' && <FoodsScreen />}
          {tab === 'setup' && <SetupScreen />}
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
      </SettingsProvider>
    </FoodsProvider>
  );
}

// Chooses the auth screen or the app based on the session.
function Root() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={theme.accentBlue} size="large" />
      </View>
    );
  }
  return session ? <MainApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        <Root />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
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
