import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EcoWarnColors, Shadows } from '@/constants/theme';

export default function RelawanLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: EcoWarnColors.primaryLight,
        tabBarInactiveTintColor: EcoWarnColors.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: EcoWarnColors.cardBg,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          ...Shadows.tabBar,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Peta Spasial',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Pemindai AI',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat Laporan',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil Relawan',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="shield.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
