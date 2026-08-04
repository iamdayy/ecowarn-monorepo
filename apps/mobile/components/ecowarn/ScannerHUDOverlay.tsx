import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  isLocked?: boolean;
  onToggleLock?: () => void;
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
  isLocked = false,
  onToggleLock,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  // Referensi timer untuk Anti-Flicker Hysteresis
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Buka gembok timer penghapus box jika objek kembali terdeteksi
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

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
      const rawLeft = offsetX + boundingBox.x * renderWidth;
      const rawTop = offsetY + boundingBox.y * renderHeight;
      const rawWidth = boundingBox.width * renderWidth;
      const rawHeight = boundingBox.height * renderHeight;

      // Batasi koordinat agar tidak pernah melimpah ke luar bingkai layar HP (Viewport Clamping)
      const targetLeft = Math.max(0, Math.min(containerSize.width - 20, rawLeft));
      const targetTop = Math.max(0, Math.min(containerSize.height - 20, rawTop));
      const targetWidth = Math.min(containerSize.width - targetLeft, Math.max(20, rawWidth));
      const targetHeight = Math.min(containerSize.height - targetTop, Math.max(20, rawHeight));

      // =====================================================================
      // REAL-TIME FLUID SPRING TRACKING:
      // Karena koordinat AI telah dihaluskan (EMA Filter) langsung pada Worklet Thread,
      // animasi UI memanfaaatkan fisika pegas (withSpring) dari Reanimated
      // agar boks mengikuti laju pergerakan sampah di layar dengan responsif & mulus!
      // =====================================================================
      if (boxOpacity.value === 0) {
        boxLeft.value = targetLeft;
        boxTop.value = targetTop;
        boxWidth.value = targetWidth;
        boxHeight.value = targetHeight;
        boxOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
      } else {
        const springConfig = { damping: 20, stiffness: 160, mass: 0.8 };
        boxLeft.value = withSpring(targetLeft, springConfig);
        boxTop.value = withSpring(targetTop, springConfig);
        boxWidth.value = withSpring(targetWidth, springConfig);
        boxHeight.value = withSpring(targetHeight, springConfig);
      }
    } else {
      // =====================================================================
      // ANTI-FLICKER HYSTERESIS PERSISTENCE:
      // Tahan boks selama 400ms (2 frame inferensi) saat skor AI berkedut sementara
      // di bawah threshold, mencegah boks berkedip hilang-muncul cepat (blinker).
      // =====================================================================
      if (!hideTimerRef.current && boxOpacity.value > 0) {
        hideTimerRef.current = setTimeout(() => {
          boxOpacity.value = withTiming(0, { duration: 250 });
          hideTimerRef.current = null;
        }, 400);
      }
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
        pointerEvents="box-none"
      >
        {/* Aksen sudut Bounding Box bergaya futuristik */}
        <View style={[styles.boxCorner, styles.boxCornerTL, { borderColor: boxColor }]} />
        <View style={[styles.boxCorner, styles.boxCornerTR, { borderColor: boxColor }]} />
        <View style={[styles.boxCorner, styles.boxCornerBL, { borderColor: boxColor }]} />
        <View style={[styles.boxCorner, styles.boxCornerBR, { borderColor: boxColor }]} />

        {/* Label Indikator AI (Tingkat Keparahan & % Area) */}
        <View style={[styles.boxLabel, { backgroundColor: boxColor }]}>
          <Text style={styles.boxLabelText}>
            {isLocked
              ? `TERKUNCI · ${severity.toUpperCase()} · ${(ratio * 100).toFixed(0)}% AREA`
              : `${severity.toUpperCase()} · ${(ratio * 100).toFixed(0)}% AREA`}
          </Text>
        </View>
      </Animated.View>

      {/* === Header Atas: Navigasi Kembali & Chip Status AI yang Ringkas dalam 1 Baris === */}
      <View style={[styles.topSection, { paddingTop: Math.max(insets.top, 12) + Spacing.xs }]}>
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.navigate('/(relawan)');
            }}
            activeOpacity={0.8}
            accessibilityLabel="Kembali ke Peta"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerChipsRow}>
            <View style={styles.aiChipCompact}>
              <Animated.View
                style={[
                  styles.pulseDot,
                  isModelLoaded ? { backgroundColor: EcoWarnColors.safe } : { backgroundColor: EcoWarnColors.textDisabled },
                  isModelLoaded && pulseStyle,
                ]}
              />
              <Text style={styles.aiChipTextCompact}>
                {isModelLoaded ? 'AI AKTIF' : 'MEMUAT...'}
              </Text>
            </View>
            <SeverityStatusBadge severity={severity} ratio={ratio} />
          </View>
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
          {/* Tampilkan tombol buka kunci di atas hanya apabila kondisi frame sedang terkunci */}
          {onToggleLock && isLocked && (
            <TouchableOpacity
              style={[styles.controlPill, styles.controlPillLocked]}
              onPress={onToggleLock}
              activeOpacity={0.75}
            >
              <Text style={styles.controlPillText}>🔓 BUKA KUNCI FRAME</Text>
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

      {/* === Floating Lock Button Ergonomis & Aman dari Potongan Layar === */}
      {/* Muncul secara BEBARENGAN saat Bounding Box terdeteksi atau sewaktu status frame beku/terkunci */}
      {onToggleLock && (boundingBox || isLocked) && (
        <View style={[styles.floatingLockWrapper, { bottom: Math.max(insets.bottom, 14) + 180 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.floatingLockPill, isLocked && styles.floatingLockPillActive]}
            onPress={onToggleLock}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingLockText}>
              {isLocked ? '🔓 LEPAS KUNCI (FRAME BEKU)' : '🔒 KUNCI DETEKSI & FRAME INI'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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

  // === Top Section (Compact 1-Row Header) ===
  topSection: {
    paddingHorizontal: Spacing.md,
    zIndex: 15, // Selalu berada di atas Bounding Box agar badge tidak tertutup
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiChipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  aiChipTextCompact: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
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
  controlPillLocked: {
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  controlPillText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // === Floating Lock Button (Aman dari potongan layar & ergonomik di atas footer) ===
  floatingLockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  floatingLockPill: {
    backgroundColor: '#10B981', // Emerald green yang kontras & mencolok
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 10,
  },
  floatingLockPillActive: {
    backgroundColor: '#F59E0B', // Amber/Emas berkilau penanda status frame terkunci
    borderColor: '#FFFFFF',
  },
  floatingLockText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
