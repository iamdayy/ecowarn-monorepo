import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { EcoWarnColors, BorderRadius } from '../../constants/theme';

/**
 * Komponen FloatingTabBar kustom bermodel kapsul melayang (pill-shaped floating bar).
 * Didesain minimalis dan ergonomis dengan indikator aktif berupa latar belakang kapsul.
 */
export const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottomMargin = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.outerContainer, { bottom: bottomMargin }]} pointerEvents="box-none">
      <View style={styles.pillBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? String(options.tabBarLabel)
              : options.title !== undefined
              ? options.title
              : route.name;

          const activeColor = EcoWarnColors.primary;
          const inactiveColor = '#64748B';
          const color = isFocused ? activeColor : inactiveColor;
          const capsuleBg = isFocused ? EcoWarnColors.primarySurface : 'transparent';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={(options as any).tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
              style={[styles.tabItem, { backgroundColor: capsuleBg }]}
            >
              <View style={styles.iconContainer}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color,
                  size: 22,
                })}
              </View>
              <Text
                style={[
                  styles.tabText,
                  { color, fontWeight: isFocused ? '700' : '500' },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  pillBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginHorizontal: 16,
    maxWidth: width - 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    marginHorizontal: 2,
    minWidth: 68,
  },
  iconContainer: {
    marginBottom: 2,
  },
  tabText: {
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});
