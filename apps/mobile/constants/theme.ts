/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * EcoWarn Semantic Design Tokens
 * Gudang token visual terpusat — menggantikan seluruh literal hex tersebar di komponen UI.
 */
export const EcoWarnColors = {
  // Brand Core
  primary: '#047857',        // Zamrud — Header Relawan, aksen utama
  primaryDark: '#065f46',    // Zamrud Gelap — Header Warga, banner
  primaryLight: '#10b981',   // Zamrud Terang — Tombol CTA, link, aksen aktif
  primarySurface: '#ecfdf5', // Zamrud Pucat — Card selected, badge relawan bg
  primaryMuted: '#d1fae5',   // Zamrud Bisu — Avatar relawan bg, subtitle banner
  primarySoftBg: '#f0fdf4',  // Zamrud Embun — Auth page background

  // Severity Palette (EWS Signal Colors)
  critical: '#ef4444',
  criticalDark: '#b91c1c',
  criticalSurface: '#fef2f2',
  warning: '#f97316',
  warningDark: '#c2410c',
  warningSurface: '#fff7ed',
  safe: '#34C759',
  safeDark: '#047857',
  safeSurface: '#d1fae5',

  // Neutral Surfaces
  surface: '#f8fafc',
  cardBg: '#ffffff',
  divider: '#f1f5f9',
  border: '#e2e8f0',
  borderInput: '#cbd5e1',

  // Text Hierarchy
  textPrimary: '#1e293b',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textPlaceholder: '#94a3b8',
  textOnPrimary: '#ffffff',
  textDisabled: '#94a3b8',

  // Role-specific accents (Warga)
  roleWargaBg: '#eef2ff',
  roleWargaBorder: '#818cf8',
  roleWargaText: '#4338ca',
  roleWargaSurface: '#e0e7ff',
  roleWargaAccent: '#6366f1',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 30,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  button: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
} as const;
