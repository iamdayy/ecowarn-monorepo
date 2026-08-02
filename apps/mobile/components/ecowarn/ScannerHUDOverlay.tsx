import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrashVolumeStatus, BoundingBox } from '../../types/ecowarn';
import { SeverityStatusBadge } from './SeverityStatusBadge';
import { EcoWarnColors, Spacing } from '../../constants/theme';

interface ScannerHUDOverlayProps {
  severity: TrashVolumeStatus;
  ratio: number;
  isModelLoaded: boolean;
  boundingBox?: BoundingBox;
  isTorchOn?: boolean;
  onToggleTorch?: () => void;
  zoomLevel?: number;
  onCycleZoom?: () => void;
  isHapticMuted?: boolean;
  onToggleHapticMute?: () => void;
}

const RETICLE_SIZE = 260;
const CORNER_LENGTH = 40;
const CORNER_THICKNESS = 3;

/**
 * Head-Up Display overlay untuk layar Scanner AI.
 * Fitur: Dynamic Bounding Box dari hasil Client-Side Inference AI (TFLite),
 * animated pulse dot, scan-line vertikal, dan reticle interaktif, serta floating action controls.
 */
const ScannerHUDOverlayInner: React.FC<ScannerHUDOverlayProps> = ({
  severity,
  ratio,
  isModelLoaded,
  boundingBox,
  isTorchOn = false,
  onToggleTorch,
  zoomLevel = 1,
  onCycleZoom,
  isHapticMuted = false,
  onToggleHapticMute,
}) => {
  const insets = useSafeAreaInsets();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // === Animasi Pulse Dot (berkedip saat model aktif) ===
  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  // === Animasi Scan-Line ===
  const scanLineY = useSharedValue(0);

  // === Shared Values untuk Bounding Box Tracking Mulus ===
  const boxLeft = useSharedValue(0);
  const boxTop = useSharedValue(0);
  const boxWidth = useSharedValue(0);
  const boxHeight = useSharedValue(0);
  const boxOpacity = useSharedValue(0);

  useEffect(() => {
    if (isModelLoaded) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      scanLineY.value = withRepeat(
        withTiming(RETICLE_SIZE - 4, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    }
  }, [isModelLoaded]);

  // =====================================================================
  // KALIBRASI PRESISI KOORDINAT HUD (ASPECT-RATIO COVER MAPPING):
  // Menyesuaikan koordinat normalisasi AI (dari sensor kamera standar 9:16)
  // ke kontainer layar HP Android yang bervariasi (misal 20:9 atau 19.5:9)
  // yang di-render dalam mode 'cover', mencegah pergeseran/miss-alignment!
  // =====================================================================
  useEffect(() => {
    if (boundingBox && containerSize.width > 0 && containerSize.height > 0) {
      // Rasio layar saat ini vs Rasio standar sensor kamera Android (Portrait 9:16 = 0.5625)
      const containerRatio = containerSize.width / containerSize.height;
      const sensorRatio = 9 / 16;

      let renderWidth = containerSize.width;
      let renderHeight = containerSize.height;
      let offsetX = 0;
      let offsetY = 0;

      if (containerRatio < sensorRatio) {
        // Layar lebih tinggi/panjang dari rasio sensor (Mode Cover memotong tepi kiri & kanan)
        renderHeight = containerSize.height;
        renderWidth = containerSize.height * sensorRatio;
        offsetX = (containerSize.width - renderWidth) / 2;
      } else {
        // Layar lebih lebar dari rasio sensor (Mode Cover memotong tepi atas & bawah)
        renderWidth = containerSize.width;
        renderHeight = containerSize.width / sensorRatio;
        offsetY = (containerSize.height - renderHeight) / 2;
      }

      // Kalkulasi koordinat presisi absolut pada layar UI
      const targetLeft = offsetX + boundingBox.x * renderWidth;
      const targetTop = offsetY + boundingBox.y * renderHeight;
      const targetWidth = boundingBox.width * renderWidth;
      const targetHeight = boundingBox.height * renderHeight;

      // Jika box baru muncul dari hidden (opacity 0), posisikan seketika lalu fade in
      if (boxOpacity.value === 0) {
        boxLeft.value = targetLeft;
        boxTop.value = targetTop;
        boxWidth.value = targetWidth;
        boxHeight.value = targetHeight;
        boxOpacity.value = withTiming(1, { duration: 150 });
      } else {
        // Transisi halus tersinkronisasi dengan 5 FPS Inference (200ms Anti-Jitter Tracking)
        const duration = 200;
        const easing = Easing.out(Easing.cubic);
        boxLeft.value = withTiming(targetLeft, { duration, easing });
        boxTop.value = withTiming(targetTop, { duration, easing });
        boxWidth.value = withTiming(targetWidth, { duration, easing });
        boxHeight.value = withTiming(targetHeight, { duration, easing });
      }
    } else {
      // Fade out begitu objek hilang / di bawah confidence threshold
      boxOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [boundingBox, containerSize]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const animatedBoxStyle = useAnimatedStyle(() => ({
    left: boxLeft.value,
    top: boxTop.value,
    width: boxWidth.value,
    height: boxHeight.value,
    opacity: boxOpacity.value,
  }));

  // Reticle meredup otomatis saat objek sampah terdeteksi dan diapit Bounding Box
  const reticleStyle = useAnimatedStyle(() => ({
    opacity: withTiming(boundingBox ? 0.15 : 1, { duration: 250 }),
  }));

  // Warna aksen berubah dinamis sesuai tingkat keparahan (severity)
  const reticleColor = useMemo(() => {
    switch (severity) {
      case 'Kritis': return EcoWarnColors.critical;
      case 'Sedang': return EcoWarnColors.warning;
      default: return 'rgba(255, 255, 255, 0.85)';
    }
  }, [severity]);

  const boxColor = useMemo(() => {
    switch (severity) {
      case 'Kritis': return EcoWarnColors.critical;
      case 'Sedang': return EcoWarnColors.warning;
      default: return EcoWarnColors.safe;
    }
  }, [severity]);

  const boxBgColor = useMemo(() => {
    switch (severity) {
      case 'Kritis': return 'rgba(239, 68, 68, 0.18)';
      case 'Sedang': return 'rgba(249, 115, 22, 0.18)';
      default: return 'rgba(52, 199, 89, 0.18)';
    }
  }, [severity]);

  const scanLineColor = useMemo(() => {
    switch (severity) {
      case 'Kritis': return 'rgba(239, 68, 68, 0.45)';
      case 'Sedang': return 'rgba(249, 115, 22, 0.4)';
      default: return 'rgba(255, 255, 255, 0.3)';
    }
  }, [severity]);

  return (
    <View style={styles.container} onLayout={handleLayout} pointerEvents="box-none">
      {/* === Dynamic AI Bounding Box Overlay === */}
      <Animated.View
        style={[
          styles.boundingBoxContainer,
          animatedBoxStyle,
          { borderColor: boxColor, backgroundColor: boxBgColor },
        ]}
        pointerEvents="none"
      >
        {/* Aksen sudut Bounding Box bergaya futuristik */}
        <View style={[styles.boxCorner, styles.boxCornerTL, { borderColor: boxColor }]} />
        <View style={[styles.boxCorner, styles.boxCornerTR, { borderColor: boxColor }]} />
        <View style={[styles.boxCorner, styles.boxCornerBL, { borderColor: boxColor }]} />
        <View style={[styles.boxCorner, styles.boxCornerBR, { borderColor: boxColor }]} />

        {/* Label Indikator AI (Tingkat Keparahan & % Area) */}
        <View style={[styles.boxLabel, { backgroundColor: boxColor }]}>
          <Text style={styles.boxLabelText}>
            {`🗑️ ${severity.toUpperCase()} · ${(ratio * 100).toFixed(0)}% AREA`}
          </Text>
        </View>
      </Animated.View>

      {/* === Header: AI Status Chip + Severity Badge === */}
      <View style={[styles.topSection, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.aiChip}>
          <Animated.View
            style={[
              styles.pulseDot,
              isModelLoaded
                ? { backgroundColor: EcoWarnColors.safe }
                : { backgroundColor: EcoWarnColors.textDisabled },
              isModelLoaded && pulseStyle,
            ]}
          />
          <Text style={styles.aiChipText}>
            {isModelLoaded ? 'ECOWARN AI AKTIF' : 'MEMUAT MODEL...'}
          </Text>
        </View>
        <View style={styles.badgeWrapper}>
          <SeverityStatusBadge severity={severity} ratio={ratio} />
        </View>

        {/* === Horizontal Action Toolbar (Torch, Zoom, Mute/Haptic Toggle) === */}
        <View style={styles.controlToolbar}>
          {onToggleTorch && (
            <TouchableOpacity
              style={[styles.controlPill, isTorchOn && styles.controlPillActive]}
              onPress={onToggleTorch}
              activeOpacity={0.75}
            >
              <Text style={styles.controlPillText}>{isTorchOn ? '⚡ FLASH ON' : '🔦 FLASH OFF'}</Text>
            </TouchableOpacity>
          )}
          {onCycleZoom && (
            <TouchableOpacity
              style={styles.controlPill}
              onPress={onCycleZoom}
              activeOpacity={0.75}
            >
              <Text style={styles.controlPillText}>{`🔍 ZOOM ${zoomLevel}x`}</Text>
            </TouchableOpacity>
          )}
          {onToggleHapticMute && (
            <TouchableOpacity
              style={[styles.controlPill, isHapticMuted && styles.controlPillMuted]}
              onPress={onToggleHapticMute}
              activeOpacity={0.75}
            >
              <Text style={styles.controlPillText}>{isHapticMuted ? '🔕 SILENT' : '🔔 ALERT ON'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* === Center: Viewfinder Reticle + Animated Scan Line === */}
      <Animated.View style={[styles.reticleContainer, reticleStyle]} pointerEvents="none">
        <View style={styles.reticleFrame}>
          <View style={[styles.corner, styles.cornerTL, { borderTopColor: reticleColor, borderLeftColor: reticleColor }]} />
          <View style={[styles.corner, styles.cornerTR, { borderTopColor: reticleColor, borderRightColor: reticleColor }]} />
          <View style={[styles.corner, styles.cornerBL, { borderBottomColor: reticleColor, borderLeftColor: reticleColor }]} />
          <View style={[styles.corner, styles.cornerBR, { borderBottomColor: reticleColor, borderRightColor: reticleColor }]} />

          {isModelLoaded && (
            <Animated.View
              style={[
                styles.scanLine,
                scanLineStyle,
                { backgroundColor: scanLineColor },
              ]}
            />
          )}
        </View>
        <Text style={styles.guideText}>Arahkan kamera ke area sampah / sumbatan air</Text>
      </Animated.View>
    </View>
  );
};

export const ScannerHUDOverlay = React.memo(ScannerHUDOverlayInner);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },

  // === Dynamic AI Bounding Box ===
  boundingBoxContainer: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 10,
    zIndex: 5,
  },
  boxCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
  },
  boxCornerTL: {
    top: -3,
    left: -3,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  boxCornerTR: {
    top: -3,
    right: -3,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  boxCornerBL: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  boxCornerBR: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  boxLabel: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  boxLabelText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // === Top Section ===
  topSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    zIndex: 15, // Selalu berada di atas Bounding Box agar badge tidak tertembus
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: Spacing.sm,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  aiChipText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
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
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: CORNER_LENGTH / 2,
    right: CORNER_LENGTH / 2,
    height: 2,
    borderRadius: 1,
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.md + 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },

  // === Horizontal Action Toolbar ===
  controlToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.sm + 4,
    flexWrap: 'wrap',
  },
  controlPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlPillActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  controlPillMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  controlPillText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
