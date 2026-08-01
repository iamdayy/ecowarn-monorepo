import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EcoWarnColors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface UnauthorizedCameraViewProps {
  onRequestPermission: () => void;
}

/**
 * Tampilan fallback ketika izin kamera belum diberikan atau perangkat kamera tidak ditemukan.
 * Menampilkan ikon visual, deskripsi informatif, dan tombol CTA untuk meminta izin.
 */
export const UnauthorizedCameraView: React.FC<UnauthorizedCameraViewProps> = ({
  onRequestPermission,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.cameraIcon}>📷</Text>
      </View>

      <Text style={styles.title}>Akses Kamera Diperlukan</Text>
      <Text style={styles.description}>
        Izinkan EcoWarn mengakses kamera untuk memindai dan menganalisis volume sampah secara
        real-time menggunakan AI lokal (Client-Side Inference).
      </Text>

      <TouchableOpacity
        style={styles.permissionButton}
        onPress={onRequestPermission}
        activeOpacity={0.8}
      >
        <Text style={styles.permissionButtonText}>🔓 Beri Izin Kamera</Text>
      </TouchableOpacity>

      <View style={styles.privacyNote}>
        <Text style={styles.privacyText}>
          🛡️ Pemrosesan gambar dilakukan 100% di perangkat Anda. Tidak ada data visual yang
          dikirim ke peladen.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cameraIcon: {
    fontSize: 48,
  },
  title: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  permissionButton: {
    backgroundColor: EcoWarnColors.primaryLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.pill,
    ...Shadows.button,
  },
  permissionButtonText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  privacyNote: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm + 2,
  },
  privacyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
