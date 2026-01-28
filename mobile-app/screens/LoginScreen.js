import React, { useMemo, useState } from 'react';
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

import { getCurrentUser, loginWithUsernamePassword } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ onLoggedIn }) {
  const { setUser } = useAuth();
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    return username.trim().length > 0 && password.length > 0 && !isSubmitting;
  }, [username, password, isSubmitting]);

  const onSubmit = async () => {
    if (!canSubmit) return;

    setError('');
    setIsSubmitting(true);
    try {
      await loginWithUsernamePassword({ username: username.trim(), password });
      const me = await getCurrentUser();
      setUser(me);
      if (typeof onLoggedIn === 'function') {
        onLoggedIn(me);
      }
    } catch (e) {
      const msg = e?.message || 'Login failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>Login with your username and password</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            inputMode="text"
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            editable={!isSubmitting}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            editable={!isSubmitting}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        </View>

        {!!error && <Text style={[styles.error, { color: colors.dangerText }]}>{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && canSubmit && styles.buttonPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </Pressable>

        <Text style={styles.hint}>
          Note: API endpoint is configurable in services/api.js
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1220',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#111a2e',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 12,
  },
  button: {
    marginTop: 4,
    backgroundColor: '#2d6cdf',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    marginTop: 12,
    fontSize: 12,
  },
});
