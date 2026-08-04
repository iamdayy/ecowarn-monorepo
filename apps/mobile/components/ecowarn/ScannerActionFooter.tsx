import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TrashVolumeStatus, SpatialCoordinates } from '../../types/ecowarn';
import { EcoWarnColors, Spacing, BorderRadius } from '../../constants/theme';
import { useCoordinateAddress } from '../../services/geocodingService';

interface ScannerActionFooterProps {
  severity: TrashVolumeStatus;
  isReporting: boolean;
  onSendReport: () => void;
  currentLocation?: SpatialCoordinates;
}

/**
 * Panel aksi bawah layar Scanner AI — desain premium.
 * Fitur: animated bounce saat severity berubah, haptic feedback,
 * loading spinner, glassmorphism panel, telemetri satelit GPS, dan React.memo.
 */
const ScannerActionFooterInner: React.FC<ScannerActionFooterProps> = ({
  severity,
  isReporting,
  onSendReport,
  currentLocation,
}) => {
  const insets = useSafeAreaInsets();
  const buttonScale = useSharedValue(1);
  const { address } = useCoordinateAddress(currentLocation?.latitude, currentLocation?.longitude, 'short');

  // Bounce animation saat severity berubah — memberikan feedback visual
  useEffect(() => {
    buttonScale.value = withSequence(
      withTiming(1.04, { duration: 120, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) })
    );
  }, [severity]);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Haptic feedback saat tombol ditekan
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSendReport();
  }, [onSendReport]);

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
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 14) + 10 }]}>
      <View style={styles.contentArea}>
        {/* === GPS Telemetry & Accuracy Chip (Kolaborasi Alamat Kawasan & Koordinat Angka) === */}
        {currentLocation && (
          <View style={styles.gpsChipContainer}>
            <Text style={styles.gpsChipText} numberOfLines={2}>
              {currentLocation.accuracy != null && currentLocation.accuracy <= 15
                ? `GPS AKURAT (±${Math.round(currentLocation.accuracy)}m)`
                : currentLocation.accuracy != null && currentLocation.accuracy <= 35
                  ? `GPS MENENGAH (±${Math.round(currentLocation.accuracy)}m)`
                  : currentLocation.accuracy != null
                    ? `SINYAL LEMAH (±${Math.round(currentLocation.accuracy)}m)`
                    : `MENCARI SINYAL SATELIT...`}
              {` · ${address} (${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)})`}
            </Text>
          </View>
        )}

        <Animated.View style={buttonAnimStyle}>
          <TouchableOpacity
            style={[
              styles.reportButton,
              { backgroundColor: getDynamicColor() },
              isReporting && styles.reportButtonDisabled,
            ]}
            onPress={handlePress}
            disabled={isReporting}
            activeOpacity={0.8}
          >
            {isReporting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={EcoWarnColors.textOnPrimary} />
                <Text style={styles.reportButtonText}>MEMPROSES SCAN BUKTI...</Text>
              </View>
            ) : (
              <Text style={styles.reportButtonText}>
                {`Kirim · ${severity.toUpperCase()}`}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyText}>
            <Text style={styles.privacyBold}>Verifikasi Otentik:</Text> Foto &amp; koord. spasial tersematkan.
          </Text>
        </View>
      </View>
    </View>
  );
};

export const ScannerActionFooter = React.memo(ScannerActionFooterInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  contentArea: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  reportButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  reportButtonDisabled: {
    backgroundColor: EcoWarnColors.textDisabled,
    opacity: 0.7,
  },
  reportButtonText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privacyCard: {
    marginTop: Spacing.sm + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  privacyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  privacyBold: {
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  gpsChipContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    marginBottom: Spacing.sm + 2,
  },
  gpsChipText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
