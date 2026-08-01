import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrashVolumeStatus } from '../../types/ecowarn';
import { SeverityStatusBadge } from './SeverityStatusBadge';
import { EcoWarnColors, Spacing } from '../../constants/theme';

interface ScannerHUDOverlayProps {
  severity: TrashVolumeStatus;
  ratio: number;
  isModelLoaded: boolean;
}

/**
 * Head-Up Display overlay untuk layar Scanner AI.
 * Menampilkan: indikator status AI, badge severity, dan reticle viewfinder.
 * Responsif terhadap Safe Area (Notch/Island).
 */
export const ScannerHUDOverlay: React.FC<ScannerHUDOverlayProps> = ({
  severity,
  ratio,
  isModelLoaded,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* === Header Area: AI Status + Severity Badge === */}
      <View style={[styles.topSection, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.aiChip}>
          <View style={[styles.pulseDot, !isModelLoaded && styles.pulseDotInactive]} />
          <Text style={styles.aiChipText}>
            {isModelLoaded ? 'TFLITE ACTIVE' : 'MODEL LOADING...'}
          </Text>
        </View>
        <View style={styles.badgeWrapper}>
          <SeverityStatusBadge severity={severity} ratio={ratio} />
        </View>
      </View>

      {/* === Center Area: Viewfinder Reticle === */}
      <View style={styles.reticleContainer} pointerEvents="none">
        <View style={styles.reticleFrame}>
          {/* 4 Sudut Aksen Tebal */}
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
        <Text style={styles.guideText}>Arahkan ke pusat sumbatan air / sampah</Text>
      </View>
    </View>
  );
};

const RETICLE_SIZE = 240;
const CORNER_LENGTH = 36;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // === Top Section ===
  topSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: Spacing.md - 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 14,
    marginBottom: Spacing.sm,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: EcoWarnColors.safe,
    marginRight: Spacing.sm,
  },
  pulseDotInactive: {
    backgroundColor: EcoWarnColors.textDisabled,
  },
  aiChipText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  badgeWrapper: {
    marginTop: Spacing.xs,
  },

  // === Center Reticle ===
  reticleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleFrame: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopColor: EcoWarnColors.textOnPrimary,
    borderLeftColor: EcoWarnColors.textOnPrimary,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopColor: EcoWarnColors.textOnPrimary,
    borderRightColor: EcoWarnColors.textOnPrimary,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomColor: EcoWarnColors.textOnPrimary,
    borderLeftColor: EcoWarnColors.textOnPrimary,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomColor: EcoWarnColors.textOnPrimary,
    borderRightColor: EcoWarnColors.textOnPrimary,
    borderBottomRightRadius: 6,
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
