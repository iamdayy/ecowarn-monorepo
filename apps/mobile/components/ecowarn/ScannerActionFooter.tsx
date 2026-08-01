import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrashVolumeStatus } from '../../types/ecowarn';
import { EcoWarnColors, Spacing, BorderRadius } from '../../constants/theme';

interface ScannerActionFooterProps {
  severity: TrashVolumeStatus;
  isReporting: boolean;
  onSendReport: () => void;
}

/**
 * Panel aksi bawah layar Scanner AI.
 * Tombol kirim berwarna dinamis sesuai tingkat keparahan (severity)
 * dan kartu keterangan privasi Client-Side Inference.
 */
export const ScannerActionFooter: React.FC<ScannerActionFooterProps> = ({
  severity,
  isReporting,
  onSendReport,
}) => {
  const insets = useSafeAreaInsets();

  const getDynamicColor = (): string => {
    switch (severity) {
      case 'Kritis':
        return EcoWarnColors.critical;
      case 'Sedang':
        return EcoWarnColors.warning;
      case 'Ringan':
      default:
        return EcoWarnColors.safe;
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.md }]}>
      <TouchableOpacity
        style={[
          styles.reportButton,
          { backgroundColor: getDynamicColor() },
          isReporting && styles.reportButtonDisabled,
        ]}
        onPress={onSendReport}
        disabled={isReporting}
        activeOpacity={0.8}
      >
        <Text style={styles.reportButtonText}>
          {isReporting ? 'MENGIRIM PAYLOAD...' : `KIRIM PERINGATAN (${severity.toUpperCase()})`}
        </Text>
      </TouchableOpacity>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyText}>
          🛡️ <Text style={styles.privacyBold}>Client-Side Inference:</Text> Frame kamera diproses
          100% lokal. Hanya titik koordinat & status yang dikirim.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    zIndex: 10,
  },
  reportButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  reportButtonDisabled: {
    backgroundColor: EcoWarnColors.textDisabled,
  },
  reportButtonText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  privacyCard: {
    marginTop: Spacing.sm + 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.sm + 2,
  },
  privacyText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  privacyBold: {
    fontWeight: '700',
  },
});
