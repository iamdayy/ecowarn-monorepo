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
import { TrashVolumeStatus } from '../../types/ecowarn';
import { EcoWarnColors, Spacing, BorderRadius } from '../../constants/theme';

interface ScannerActionFooterProps {
  severity: TrashVolumeStatus;
  isReporting: boolean;
  onSendReport: () => void;
}

/**
 * Panel aksi bawah layar Scanner AI — desain premium.
 * Fitur: animated bounce saat severity berubah, haptic feedback,
 * loading spinner, glassmorphism panel, dan React.memo.
 */
const ScannerActionFooterInner: React.FC<ScannerActionFooterProps> = ({
  severity,
  isReporting,
  onSendReport,
}) => {
  const insets = useSafeAreaInsets();
  const buttonScale = useSharedValue(1);

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
    <View style={styles.container}>
      <View style={[styles.contentArea, { paddingBottom: insets.bottom + Spacing.md }]}>
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
                <Text style={styles.reportButtonText}>MENGIRIM...</Text>
              </View>
            ) : (
              <Text style={styles.reportButtonText}>
                {`KIRIM PERINGATAN · ${severity.toUpperCase()}`}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyText}>
            🛡️ <Text style={styles.privacyBold}>Client-Side Inference:</Text> Frame kamera
            diproses 100% lokal. Hanya koordinat &amp; status yang dikirim.
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
    bottom: 0,
    width: '100%',
    zIndex: 10,
  },
  contentArea: {
    backgroundColor: 'rgba(10, 10, 10, 0.75)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
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
    marginTop: Spacing.md - 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  privacyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  privacyBold: {
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
