import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'Wajib mengisi Email / Nomor Handphone dan Kata Sandi.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ identifier: identifier.trim(), password });
      // Navigasi dilakukan otomatis oleh sistem gerbang (gatekeeper) di root atau re-render context
      router.replace('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Login Gagal', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logoText}>🌿 EcoWarn</Text>
          <Text style={styles.title}>Selamat Datang Kembali</Text>
          <Text style={styles.subtitle}>
            Masuk untuk memantau peringatan dini dan menjaga kualitas lingkungan ekologi.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email / Nomor Handphone</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: user@eco.org atau 08123456789"
              placeholderTextColor={EcoWarnColors.textPlaceholder}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan kata sandi Anda"
              placeholderTextColor={EcoWarnColors.textPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={EcoWarnColors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Masuk ke Sistem</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Belum memiliki akun EcoWarn? </Text>
          <Link href={"/(auth)/register" as any} asChild>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Daftar di Sini</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EcoWarnColors.primarySoftBg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: EcoWarnColors.primaryLight,
    marginBottom: Spacing.md - 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: EcoWarnColors.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: EcoWarnColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: Spacing.md,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: EcoWarnColors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: EcoWarnColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: EcoWarnColors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: EcoWarnColors.surface,
    borderWidth: 1,
    borderColor: EcoWarnColors.borderInput,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: EcoWarnColors.textPrimary,
  },
  button: {
    backgroundColor: EcoWarnColors.primaryLight,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.button,
  },
  buttonDisabled: {
    backgroundColor: EcoWarnColors.textDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: EcoWarnColors.textMuted,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: EcoWarnColors.primaryLight,
  },
});
