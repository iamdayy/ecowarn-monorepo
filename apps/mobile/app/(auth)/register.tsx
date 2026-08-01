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
import { RoleRadioButton } from '../../components/ecowarn/RoleRadioButton';
import { UserRole } from '../../types/auth';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('Warga');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'Mohon lengkapi seluruh kolom pendataan: Nama, Email, Nomor Handphone, dan Kata Sandi.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Peringatan', 'Kata sandi minimal harus terdiri dari 6 karakter.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        role,
      });
      Alert.alert(
        'Registrasi Sukses!',
        `Akun Anda berhasil didaftarkan sebagai ${role}. Selamat datang di EcoWarn!`
      );
      router.replace('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Registrasi Gagal', errorMessage);
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
          <Text style={styles.title}>Bergabung Bersama EcoWarn 🌿</Text>
          <Text style={styles.subtitle}>
            Daftarkan identitas Anda dan wujudkan kewaspadaan bencana berkolaborasi AI.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama lengkap Anda"
              placeholderTextColor={EcoWarnColors.textPlaceholder}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alamat Email</Text>
            <TextInput
              style={styles.input}
              placeholder="contoh@domain.com"
              placeholderTextColor={EcoWarnColors.textPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nomor Handphone (Wajib)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 081234567890"
              placeholderTextColor={EcoWarnColors.textPlaceholder}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimal 6 karakter"
              placeholderTextColor={EcoWarnColors.textPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <RoleRadioButton selectedRole={role} onSelectRole={setRole} />

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={EcoWarnColors.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Daftarkan Akun ({role})</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Sudah terdaftar sebelumnya? </Text>
          <Link href={"/(auth)/login" as any} asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Masuk di Sini</Text>
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
    padding: Spacing.lg - 4,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: EcoWarnColors.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: EcoWarnColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md - 4,
  },
  formCard: {
    backgroundColor: EcoWarnColors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg - 2,
    shadowColor: EcoWarnColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: Spacing.lg - 4,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
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
    marginTop: Spacing.md - 4,
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
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: EcoWarnColors.primaryLight,
  },
});
