import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    const err = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (mode === 'signup') {
      // If email confirmation is enabled, there's no session yet.
      setNotice('Account created. If sign-in doesn’t start automatically, check your email to confirm, then sign in.');
      setMode('signin');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>🍽️ Macro Planner</Text>
        <Text style={styles.subtitle}>
          {mode === 'signin' ? 'Sign in to your meal plan' : 'Create your account'}
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={theme.textFaint}
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setError(null);
            setNotice(null);
          }}
        >
          <Text style={styles.switchText}>
            {mode === 'signin'
              ? "New here? Create an account"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
  },
  brand: { color: theme.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: theme.textDim, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  label: { color: theme.textDim, fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: theme.cardBgAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 15,
  },
  error: { color: theme.red, fontSize: 13, marginTop: 12 },
  notice: { color: theme.green, fontSize: 13, marginTop: 12, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: theme.blue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  switchText: { color: theme.accentBlue, fontSize: 14, textAlign: 'center', marginTop: 18, fontWeight: '600' },
});
