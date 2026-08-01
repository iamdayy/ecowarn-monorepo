import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { TrashVolumeStatus } from '../../types/ecowarn';
import { EcoWarnColors } from '../../constants/theme';

interface SeverityStatusBadgeProps {
  severity: TrashVolumeStatus;
  ratio?: number;
}

/** Mapping severity → emoji ikon + indeks warna untuk interpolasi animasi */
const SEVERITY_MAP: Record<TrashVolumeStatus, { icon: string; colorIndex: number }> = {
  Ringan: { icon: '✅', colorIndex: 0 },
  Sedang: { icon: '⚠️', colorIndex: 1 },
  Kritis: { icon: '🚨', colorIndex: 2 },
};

const COLOR_PALETTE = [EcoWarnColors.safe, EcoWarnColors.warning, EcoWarnColors.critical];

/**
 * Badge status severity dengan transisi warna animasi halus (Reanimated interpolateColor).
 * Menampilkan ikon per level, label severity, dan pill persentase ratio area.
 */
const SeverityStatusBadgeInner: React.FC<SeverityStatusBadgeProps> = ({ severity, ratio }) => {
  const colorProgress = useSharedValue(SEVERITY_MAP[severity].colorIndex);

  useEffect(() => {
    colorProgress.value = withTiming(SEVERITY_MAP[severity].colorIndex, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [severity]);

  const animatedBgStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      colorProgress.value,
      [0, 1, 2],
      COLOR_PALETTE
    );
    return { backgroundColor: bgColor };
  });

  const config = SEVERITY_MAP[severity];

  return (
    <Animated.View style={[styles.badgeContainer, animatedBgStyle]}>
      <Text style={styles.iconText}>{config.icon}</Text>
      <Text style={styles.badgeText}>{severity.toUpperCase()}</Text>
      {ratio !== undefined && ratio > 0 && (
        <View style={styles.ratioPill}>
          <Text style={styles.ratioText}>{(ratio * 100).toFixed(1)}%</Text>
        </View>
      )}
    </Animated.View>
  );
};

export const SeverityStatusBadge = React.memo(SeverityStatusBadgeInner);

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  iconText: {
    fontSize: 14,
    marginRight: 6,
  },
  badgeText: {
    color: EcoWarnColors.textOnPrimary,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  ratioPill: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ratioText: {
    color: EcoWarnColors.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
});
