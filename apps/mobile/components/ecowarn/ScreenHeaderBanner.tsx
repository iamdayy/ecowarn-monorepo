import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EcoWarnColors, BorderRadius, Shadows, Spacing } from '../../constants/theme';

interface ScreenHeaderBannerProps {
  title: string;
  subtitle?: string;
  /** Warna latar banner — default: EcoWarnColors.primary */
  accentColor?: string;
  /** Elemen kustom di sisi kanan banner (opsional) */
  rightElement?: React.ReactNode;
  /** Menghilangkan lengkungan radius pojok bawah banner agar rata saat bertemu elemen kanvas seperti Peta */
  flatBottom?: boolean;
}

/**
 * Banner header responsif yang otomatis menyesuaikan padding-top
 * berdasarkan Safe Area (Notch/Island/Status Bar) perangkat.
 * Menggantikan seluruh blok `headerBanner` duplikat di berbagai layar.
 */
export const ScreenHeaderBanner: React.FC<ScreenHeaderBannerProps> = ({
  title,
  subtitle,
  accentColor = EcoWarnColors.primary,
  rightElement,
  flatBottom = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: accentColor,
          paddingTop: insets.top + Spacing.md,
          shadowColor: accentColor,
          ...(flatBottom && {
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }),
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightElement && <View style={styles.rightSlot}>{rightElement}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: Spacing.lg - 2, // 22px sesuai original
    paddingBottom: Spacing.lg - 2,
    borderBottomLeftRadius: BorderRadius.xl + 4, // 24px sesuai original
    borderBottomRightRadius: BorderRadius.xl + 4,
    ...Shadows.elevated,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: EcoWarnColors.textOnPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: EcoWarnColors.primaryMuted,
    lineHeight: 18,
  },
  rightSlot: {
    marginLeft: Spacing.md,
  },
});
