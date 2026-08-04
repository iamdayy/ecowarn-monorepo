import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { ScreenHeaderBanner } from './ScreenHeaderBanner';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export const ProfileScreenView: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin keluar dari akun Anda?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Data pengguna tidak tersedia. Silakan login kembali.</Text>
      </View>
    );
  }

  const isRelawan = user.role === 'Relawan';

  return (
    <View style={styles.container}>
      <ScreenHeaderBanner
        title="Profil Pengguna 👤"
        subtitle={isRelawan ? 'Kontributor Aktif & Relawan Pemantau AI' : 'Warga Terotentikasi & Penerima Peringatan Dini'}
        accentColor={EcoWarnColors.primary}
      />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={[styles.avatarCircle, isRelawan ? styles.avatarRelawan : styles.avatarWarga]}>
            <Text style={styles.avatarIcon}>{isRelawan ? '🛡️' : '👤'}</Text>
          </View>
          <Text style={styles.nameText}>{user.name}</Text>
          <View style={[styles.roleBadge, isRelawan ? styles.badgeRelawan : styles.badgeWarga]}>
            <Text style={[styles.roleText, isRelawan ? styles.roleRelawan : styles.roleWarga]}>
              {user.role}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informasi Akun</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nomor Handphone</Text>
            <Text style={styles.infoValue}>{user.phoneNumber}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status Otorisasi</Text>
            <Text style={styles.infoValue}>
              {isRelawan ? 'Akses Pemindai AI & Riwayat' : 'Pemantauan & Peringatan Dini'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>🚪 Keluar dari Akun (Logout)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EcoWarnColors.surface,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg - 4,
    paddingBottom: Spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: 15,
    color: EcoWarnColors.critical,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarRelawan: {
    backgroundColor: EcoWarnColors.primaryMuted,
    borderWidth: 3,
    borderColor: EcoWarnColors.primaryLight,
  },
  avatarWarga: {
    backgroundColor: EcoWarnColors.roleWargaSurface,
    borderWidth: 3,
    borderColor: EcoWarnColors.roleWargaAccent,
  },
  avatarIcon: {
    fontSize: 42,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: EcoWarnColors.textPrimary,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  badgeRelawan: {
    backgroundColor: EcoWarnColors.primarySurface,
    borderWidth: 1,
    borderColor: EcoWarnColors.primaryLight,
  },
  badgeWarga: {
    backgroundColor: EcoWarnColors.roleWargaBg,
    borderWidth: 1,
    borderColor: EcoWarnColors.roleWargaBorder,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  roleRelawan: {
    color: EcoWarnColors.primary,
  },
  roleWarga: {
    color: EcoWarnColors.roleWargaText,
  },
  infoCard: {
    backgroundColor: EcoWarnColors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg - 4,
    ...Shadows.card,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: EcoWarnColors.textSecondary,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: EcoWarnColors.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: EcoWarnColors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: EcoWarnColors.divider,
  },
  logoutButton: {
    backgroundColor: EcoWarnColors.criticalSurface,
    borderWidth: 1,
    borderColor: EcoWarnColors.critical,
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: EcoWarnColors.critical,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: EcoWarnColors.criticalDark,
  },
});
